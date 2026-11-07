import assert from 'node:assert/strict';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mock, test } from 'node:test';
import type { Engine } from '../scripts/engine.mjs';
import { installFile, readStamp, stampFor, writeStamp } from '../scripts/freshness.mjs';
import type * as LiveCompileBuild from '../scripts/live-compile-build.mjs';

// The decision table of docs/tracks/engine-switch.md at the level the scripts use it: `engine.prepareNative` (which every native run calls), the
// `pnpm switch:engine` command and the build that stamps the target directories. The scripts that decide are copied into a temporary repository,
// and a stub stands in for the Godot binary's `--version`, so the real wiring runs with no cargo, no Godot and no window.

const SCRIPTS = join(__dirname, '..', 'scripts');
const COPIED_SCRIPTS = ['engine', 'freshness', 'live-compile-build', 'web-content', 'arguments', 'switch-engine'];
const BREAKA_VERSION = '4.8.0.stable.custom_build';
const STOCK_VERSION = '4.7.2.stable.custom_build';
const STOCK_SWITCH = 'pnpm switch:engine --engine=stock';
const BREAKA_SWITCH = 'pnpm switch:engine --engine=breaka';
const STOCK_NATIVE_BUILD = 'pnpm build:native --engine=stock';
const STOCK_LIVE_COMPILE_BUILD = 'node scripts/build-live-compile.mjs --engine=stock';

type ProfileName = 'breaka' | 'stock';
type LiveCompile = typeof LiveCompileBuild;

interface Skeleton {
  root: string;
  engine(name: ProfileName): Engine;
  liveCompile: LiveCompile;
  /** A native compile that left `bytes` in the profile's target directory, recorded as the build script records it; `install` also installs it. */
  buildNative(name: ProfileName, bytes: string, options?: { install?: boolean }): void;
  /** The same for the live-compile extension (`scripts/build-live-compile.mjs`). */
  buildLiveCompile(name: ProfileName, bytes: string, options?: { install?: boolean }): void;
  write(path: string, content: string): void;
  runSwitch(name: ProfileName): { status: number | null; stdout: string; stderr: string };
}

function write(root: string, path: string, content: string): string {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

/** A Godot stand-in that answers `--version` the way the profile's binary does. */
function stubGodot(root: string, name: ProfileName, version: string): string {
  const stub = write(root, `bin/godot-${name}`, `#!/bin/sh\necho '${version}'\n`);
  chmodSync(stub, 0o755);
  return stub;
}

async function makeSkeleton(): Promise<Skeleton> {
  // The real path: the scripts find their root from where they are, and the temporary directory is a symbolic link on macOS.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'engine-switch-wiring-')));
  for (const name of COPIED_SCRIPTS) {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    copyFileSync(join(SCRIPTS, `${name}.mjs`), join(root, 'scripts', `${name}.mjs`));
  }
  for (const path of [
    'Cargo.toml', 'Cargo.lock', 'native/lib.rs',
    'live-compile/core/lib.rs', 'live-compile/ext/lib.rs', 'live-compile/patches/bun.patch', 'live-compile/stubs/io.rs',
    'live-compile/Cargo.toml', 'live-compile/Cargo.lock', 'live-compile/rust-toolchain.toml', 'live-compile/.cargo/config.toml', 'live-compile/scripts/vendor-bun.py',
  ]) write(root, path, `contents of ${path}\n`);
  for (const [directory, profile] of [['native/api', 'breaka'], ['native/api/stock-4.7.2', 'stock']]) {
    write(root, `${directory}/extension_api.json`, `{"profile":"${profile}","file":1}`);
    write(root, `${directory}/gdextension_interface.json`, `{"profile":"${profile}","file":2}`);
  }
  const godots = { breaka: stubGodot(root, 'breaka', BREAKA_VERSION), stock: stubGodot(root, 'stock', STOCK_VERSION) };
  const engineModule: typeof import('../scripts/engine.mjs') = await import(pathToFileURL(join(root, 'scripts/engine.mjs')).href);
  const liveCompile: LiveCompile = await import(pathToFileURL(join(root, 'scripts/live-compile-build.mjs')).href);
  const engine = (name: ProfileName): Engine => engineModule.selectEngine([`--engine=${name}`], { GODOT: godots[name] });
  return {
    root, engine, liveCompile,
    write: (path, content) => { write(root, path, content); },
    buildNative(name, bytes, { install = false } = {}) {
      const profile = engine(name);
      const built = write(profile.targets.native, `release/${profile.libraryName}`, bytes);
      // The build script's own steps: `beginBuild` hashes the inputs, `compiled` stamps cargo's output, `installed` stamps the installed copy.
      const record = mock.method(console, 'log', () => undefined);
      try {
        const build = profile.beginBuild('native', { clean: () => undefined });
        build.compiled();
        if (install) {
          installFile(built, profile.installedLibrary);
          build.installed();
        }
      } finally {
        record.mock.restore();
      }
    },
    buildLiveCompile(name, bytes, { install = false } = {}) {
      const profile = engine(name);
      const layout = liveCompile.liveCompileLayout(profile);
      const inputs = liveCompile.liveCompileInputs(profile);
      write(root, layout.built.slice(root.length + 1), bytes);
      writeStamp(layout.builtStamp, stampFor({ library: layout.built, engine: name, probe: false, inputs }));
      if (install) {
        installFile(layout.built, layout.library);
        writeStamp(layout.stamp, stampFor({ library: layout.library, engine: name, probe: false, inputs }));
        liveCompile.writeGdextension({ installDirectory: layout.installDirectory });
      }
    },
    runSwitch(name) {
      const result = spawnSync('node', [join(root, 'scripts/switch-engine.mjs'), `--engine=${name}`], { encoding: 'utf8', timeout: 30_000, env: { ...process.env, GODOT: godots[name] } });
      return { status: result.status, stdout: result.stdout, stderr: result.stderr };
    },
  };
}

/** What `prepareNative` throws for the profile, or undefined when the run may go ahead. It runs silent: the engine line is not the test's. */
function refusalOf(skeleton: Skeleton, name: ProfileName, options: Parameters<Engine['prepareNative']>[0] = {}): string | undefined {
  const log = mock.method(console, 'log', () => undefined);
  try {
    skeleton.engine(name).prepareNative(options);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  } finally {
    log.mock.restore();
  }
}

function installedBytes(skeleton: Skeleton): { native: string; liveCompile: string | undefined } {
  const layout = skeleton.liveCompile.liveCompileLayout(skeleton.engine('breaka'));
  return {
    native: readFileSync(skeleton.engine('breaka').installedLibrary, 'utf8'),
    liveCompile: existsSync(layout.library) ? readFileSync(layout.library, 'utf8') : undefined,
  };
}

/** The checkout every table row starts from: both profiles built in their own target directories and the breaka builds installed. */
async function bothBuiltBreakaInstalled(): Promise<Skeleton> {
  const skeleton = await makeSkeleton();
  skeleton.buildNative('breaka', 'native for breaka', { install: true });
  skeleton.buildLiveCompile('breaka', 'live-compile for breaka', { install: true });
  skeleton.buildNative('stock', 'native for stock');
  skeleton.buildLiveCompile('stock', 'live-compile for stock');
  return skeleton;
}

test('right profile, both installs current: the run goes ahead and names its engine', async () => {
  const skeleton = await bothBuiltBreakaInstalled();
  const log = mock.method(console, 'log', () => undefined);
  try {
    assert.equal(skeleton.engine('breaka').prepareNative(), BREAKA_VERSION);
    assert.equal(log.mock.calls.length, 1);
    assert.match(String(log.mock.calls[0]?.arguments[0]), /^Engine profile breaka .*Godot 4\.8\.0/u);
  } finally {
    log.mock.restore();
  }
});

test('wrong profile with a current target build: both installs are refused at once, each with the install command, before the engine line is printed', async () => {
  const skeleton = await bothBuiltBreakaInstalled();
  const log = mock.method(console, 'log', () => undefined);
  let refusal = '';
  try {
    assert.throws(() => skeleton.engine('stock').prepareNative(), (error: unknown) => {
      refusal = error instanceof Error ? error.message : '';
      return true;
    });
    assert.equal(log.mock.calls.length, 0, 'a refused run printed no engine line');
  } finally {
    log.mock.restore();
  }
  const lines = refusal.split('\n');
  assert.equal(lines.length, 2, refusal);
  assert.match(lines[0] ?? '', /^The installed libgodot_react_ui\.dylib is the breaka profile's, not the stock profile's\./u);
  assert.match(lines[0] ?? '', new RegExp(`The stock library built in target/stock is current[^]*run \`${STOCK_SWITCH}\` first`, 'u'));
  assert.match(lines[1] ?? '', /^The installed liblive_compile\.dylib is the breaka profile's, not the stock profile's\./u);
  assert.match(lines[1] ?? '', new RegExp(`The stock build in live-compile/target-stock is current[^]*run \`${STOCK_SWITCH}\` first`, 'u'));
  assert.doesNotMatch(refusal, /build:native|build-live-compile/u, 'neither is sent to a compile');
});

test('the switch command installs both from the target directories, and the run that was refused passes; the way back is the same command', async () => {
  const skeleton = await bothBuiltBreakaInstalled();
  const toStock = skeleton.runSwitch('stock');
  assert.equal(toStock.status, 0, toStock.stderr + toStock.stdout);
  assert.match(toStock.stdout, /^native library: installed the stock build from target\/stock in [\d.]+ s\. Before: The installed libgodot_react_ui\.dylib is the breaka profile's/mu);
  assert.match(toStock.stdout, /^live-compile: installed the stock build from live-compile\/target-stock in [\d.]+ s\./mu);
  assert.deepEqual(installedBytes(skeleton), { native: 'native for stock', liveCompile: 'live-compile for stock' });
  assert.equal(refusalOf(skeleton, 'stock'), undefined);
  assert.match(refusalOf(skeleton, 'breaka') ?? '', /is the stock profile's, not the breaka profile's/u, 'now it is the breaka run that is refused');

  const again = skeleton.runSwitch('stock');
  assert.equal(again.status, 0);
  assert.match(again.stdout, /^native library: already the stock profile's build of the current sources/mu);
  assert.match(again.stdout, /^live-compile: already the stock profile's build of the current sources/mu);

  const toBreaka = skeleton.runSwitch('breaka');
  assert.equal(toBreaka.status, 0, toBreaka.stderr + toBreaka.stdout);
  assert.deepEqual(installedBytes(skeleton), { native: 'native for breaka', liveCompile: 'live-compile for breaka' });
  assert.equal(refusalOf(skeleton, 'breaka'), undefined);
  assert.match(refusalOf(skeleton, 'stock') ?? '', new RegExp(`run \`${STOCK_SWITCH}\``, 'u'));
});

test('wrong profile with no build in the target directory: the run is refused with the compile command, and the switch installs what it can and exits 1', async () => {
  const skeleton = await makeSkeleton();
  skeleton.buildNative('breaka', 'native for breaka', { install: true });
  skeleton.buildLiveCompile('breaka', 'live-compile for breaka', { install: true });
  skeleton.buildNative('stock', 'native for stock');
  // The stock live-compile has never been built: live-compile/target-stock does not exist.
  assert.equal(existsSync(join(skeleton.root, 'live-compile/target-stock')), false);

  const refusal = refusalOf(skeleton, 'stock') ?? '';
  assert.match(refusal, new RegExp(`run \`${STOCK_SWITCH}\` first`, 'u'), 'the native library can be installed');
  assert.match(refusal, new RegExp(`liblive_compile\\.dylib is the breaka profile's[^\\n]*Run \`${STOCK_LIVE_COMPILE_BUILD}\` first`, 'u'), 'the extension needs a compile');

  const result = skeleton.runSwitch('stock');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^native library: installed the stock build from target\/stock/mu);
  assert.match(result.stdout, new RegExp(`^live-compile: The installed liblive_compile\\.dylib is the breaka profile's[^\\n]*No stock build of liblive_compile\\.dylib is available: the stock liblive_compile\\.dylib built in live-compile/target-stock or its build stamp is missing\\. Run \`${STOCK_LIVE_COMPILE_BUILD}\` first`, 'mu'));
  assert.deepEqual(installedBytes(skeleton), { native: 'native for stock', liveCompile: 'live-compile for breaka' }, 'the breaka extension stays whole where nothing better exists');
  const afterwards = refusalOf(skeleton, 'stock') ?? '';
  assert.doesNotMatch(afterwards, /libgodot_react_ui/u, 'only the extension is left to fix');
  assert.match(afterwards, new RegExp(`Run \`${STOCK_LIVE_COMPILE_BUILD}\` first`, 'u'));
});

test('no build in either target directory: both runs are told to compile', async () => {
  const skeleton = await makeSkeleton();
  skeleton.buildNative('breaka', 'native for breaka', { install: true });
  skeleton.buildLiveCompile('breaka', 'live-compile for breaka', { install: true });
  const refusal = refusalOf(skeleton, 'stock') ?? '';
  assert.match(refusal, new RegExp(`Run \`${STOCK_NATIVE_BUILD}\` first`, 'u'));
  assert.match(refusal, new RegExp(`Run \`${STOCK_LIVE_COMPILE_BUILD}\` first`, 'u'));
  assert.doesNotMatch(refusal, /switch:engine/u);
  const result = skeleton.runSwitch('stock');
  assert.equal(result.status, 1);
  assert.deepEqual(installedBytes(skeleton), { native: 'native for breaka', liveCompile: 'live-compile for breaka' }, 'nothing was replaced');
});

test('stale sources: a changed native file refuses the run and the target build alike, and only a rebuild clears it', async () => {
  const skeleton = await bothBuiltBreakaInstalled();
  skeleton.write('native/lib.rs', 'a change to the library\n');
  const refusal = refusalOf(skeleton, 'breaka') ?? '';
  assert.match(refusal, /libgodot_react_ui\.dylib is stale: it was built from different sources[^]*changed: native\/lib\.rs[^\n]*Run `pnpm build:native --engine=breaka` first/u);
  assert.doesNotMatch(refusal, /liblive_compile/u, 'the extension does not read native/, so it is still current');
  skeleton.buildNative('breaka', 'native for breaka, rebuilt', { install: true });
  assert.equal(refusalOf(skeleton, 'breaka'), undefined);

  skeleton.write('live-compile/core/lib.rs', 'a change to the checker\n');
  const stale = refusalOf(skeleton, 'breaka') ?? '';
  assert.match(stale, /liblive_compile\.dylib is stale[^]*changed: live-compile\/core\/lib\.rs[^\n]*Run `node scripts\/build-live-compile\.mjs --engine=breaka` first/u);
  const result = skeleton.runSwitch('breaka');
  assert.equal(result.status, 1, 'a switch cannot make a stale build current');
  assert.match(result.stdout, /^native library: already the breaka profile's build/mu);
  assert.match(result.stdout, /^live-compile: [^\n]*stale/mu);
});

test('extension absent: the run goes ahead on the library alone, and a switch that finds nothing to install for it is not a failure', async () => {
  const skeleton = await makeSkeleton();
  skeleton.buildNative('breaka', 'native for breaka', { install: true });
  skeleton.buildNative('stock', 'native for stock');
  assert.equal(refusalOf(skeleton, 'breaka'), undefined, 'nothing is installed, so nothing is loaded');
  assert.match(refusalOf(skeleton, 'stock') ?? '', new RegExp(`run \`${STOCK_SWITCH}\` first`, 'u'));
  const result = skeleton.runSwitch('stock');
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /^live-compile: not installed here and no stock build in live-compile\/target-stock, so nothing to switch/mu);
  assert.equal(refusalOf(skeleton, 'stock'), undefined);
  assert.equal(existsSync(join(skeleton.root, 'demo/addons/live-compile')), false, 'and no extension was invented');
});

test('the section that needs the extension is refused when it is absent, with the compile command', async () => {
  const skeleton = await makeSkeleton();
  skeleton.buildNative('breaka', 'native for breaka', { install: true });
  const breaka = skeleton.engine('breaka');
  assert.throws(() => skeleton.liveCompile.requireLiveCompile(breaka), /No breaka build of liblive_compile\.dylib is available[^]*Run `node scripts\/build-live-compile\.mjs --engine=breaka` first/u);
  skeleton.buildLiveCompile('breaka', 'live-compile for breaka');
  assert.throws(() => skeleton.liveCompile.requireLiveCompile(breaka), /run `pnpm switch:engine --engine=breaka` first/u, 'built but not installed: the install is the fix');
  skeleton.runSwitch('breaka');
  skeleton.liveCompile.requireLiveCompile(breaka);
});

test('a run that takes the extension out of the project is not refused for it', async () => {
  const skeleton = await bothBuiltBreakaInstalled();
  skeleton.buildNative('stock', 'native for stock', { install: true });
  assert.match(refusalOf(skeleton, 'stock') ?? '', /liblive_compile\.dylib is the breaka profile's/u);
  assert.equal(refusalOf(skeleton, 'stock', { liveCompile: false }), undefined, '`gen:types` hides the manifest while Godot runs');
});

test('a probe or faults build is its own native target and the switch names it', async () => {
  const skeleton = await makeSkeleton();
  skeleton.buildNative('breaka', 'native for breaka', { install: true });
  const refusal = (() => {
    try {
      skeleton.engine('breaka').requireInstalledBuilds({ probe: true });
      return undefined;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  })();
  assert.match(refusal ?? '', /is the breaka profile's, not the breaka profile's probe build|not the breaka profile's probe build/u);
  assert.match(refusal ?? '', /Run `pnpm build:native --probe --engine=breaka` first/u, 'no probe build exists, so a compile is the fix');
});

test('the stamps the build records are the ones the switch installs: a library the target stamp does not describe is not installed', async () => {
  const skeleton = await bothBuiltBreakaInstalled();
  const stock = skeleton.engine('stock');
  write(skeleton.root, `${stock.targets.native.slice(skeleton.root.length + 1)}/release/${stock.libraryName}`, 'replaced after the build was stamped');
  const result = skeleton.runSwitch('stock');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^native library: The installed libgodot_react_ui\.dylib is the breaka profile's[^\n]*The stock library built in target\/stock differs from the one its build recorded for stock: it was replaced after it was built\. Run `pnpm build:native --engine=stock` first/mu);
  assert.equal(installedBytes(skeleton).native, 'native for breaka');
  assert.deepEqual(readdirSync(stock.installDirectory).filter(name => name.endsWith('.tmp')), [], 'no staged copy is left behind');
  assert.equal(readStamp(join(stock.installDirectory, 'react_ui.build.json'))?.engine, 'breaka');
});

// ---- Every window of every verifier checks the same things --------------------------------------------------------------------------------------------------

test('every script that launches a window checks the installed builds, not the library alone, before each launch', () => {
  const launching = readdirSync(SCRIPTS).filter(name => name.endsWith('.mjs') && readFileSync(join(SCRIPTS, name), 'utf8').includes('beforeLaunch:'));
  assert.deepEqual(launching.sort(), ['verify-a11y.mjs', 'verify-text-layout.mjs', 'verify-world.mjs', 'verify.mjs'], 'a new launcher must be listed here with the check it makes');
  for (const name of launching) {
    const source = readFileSync(join(SCRIPTS, name), 'utf8');
    assert.match(source, /beforeLaunch: \(\) => engine\.requireInstalledBuilds\(/u, `${name} checks the extension as well as the library before every window`);
    assert.doesNotMatch(source, /requireInstalledLibrary\(/u, `${name} has no library-only check left`);
  }
});

test('every launcher that starts the editor or a window of the demo calls prepareNative', () => {
  for (const name of ['dev.mjs', 'run.mjs', 'verify.mjs', 'verify-a11y.mjs', 'verify-world.mjs', 'verify-text-layout.mjs', 'generate-types.mjs']) {
    assert.match(readFileSync(join(SCRIPTS, name), 'utf8'), /prepareNative\(/u, `${name} calls prepareNative`);
  }
  const engineSource = readFileSync(join(SCRIPTS, 'engine.mjs'), 'utf8');
  const prepareNative = engineSource.slice(engineSource.indexOf('prepareNative({'), engineSource.indexOf('requireInstalledWasm'));
  assert.match(prepareNative, /this\.requireInstalledBuilds\(/u, 'prepareNative checks the installed builds');
});
