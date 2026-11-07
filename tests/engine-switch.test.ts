import assert from 'node:assert/strict';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { assessInstall, collectInputs, installBuilt, installFile, installRefusal, readStamp, stampFor, switchBuild, writeStamp, type BuildCheck } from '../scripts/freshness.mjs';
import {
  liveCompileInputs, liveCompileLayout, liveCompileRefusal, liveCompileSourceFiles, requireLiveCompile, switchLiveCompile, writeGdextension, LIBRARY_NAME, WEB_LIBRARY_NAME,
  type LiveCompileEngine, type LiveCompileLayout,
} from '../scripts/live-compile-build.mjs';

// The engine switch (scripts/freshness.mjs `assessInstall` and `switchBuild`, scripts/live-compile-build.mjs, docs/tracks/engine-switch.md): a demo run loads
// the one installed UI library and live-compile extension whichever engine it starts, so a run is refused unless they are its profile's build of the current
// sources, and the refusal names the cheapest fix: an install from the profile's own target directory when that holds a current build, a compile when not.
// These tests build a small repository in a temporary directory, so no cargo, Godot or window is involved.

const BREAKA_BYTES = 'liblive_compile built for breaka';
const STOCK_BYTES = 'liblive_compile built for stock';
const OTHER_STOCK_BYTES = 'liblive_compile built for stock, rebuilt';
const STOCK_FIX = 'node scripts/build-live-compile.mjs --engine=stock';
const STOCK_INSTALL = 'pnpm switch:engine --engine=stock';
const BREAKA_INSTALL = 'pnpm switch:engine --engine=breaka';

interface Repo {
  base: string;
  breaka: LiveCompileEngine;
  stock: LiveCompileEngine;
  write(path: string, content: string): string;
}

function write(base: string, path: string, content: string): string {
  const file = join(base, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

/** An engine profile as live-compile's build sees it: a name, and the API dump pair its bindings are made from (different for each profile). */
function engineAt(base: string, name: string): LiveCompileEngine {
  const api = `native/api/${name}`;
  write(base, `${api}/extension_api.json`, `{"profile":"${name}","file":1}`);
  write(base, `${api}/gdextension_interface.json`, `{"profile":"${name}","file":2}`);
  return {
    name,
    bindingEnvironment: () => ({ GDRUST_GODOT_API_JSON: join(base, api, 'extension_api.json'), GDRUST_GODOT_INTERFACE_JSON: join(base, api, 'gdextension_interface.json') }),
  };
}

/** The files live-compile is built from, in the layout of the real repository. */
function makeRepo(): Repo {
  const base = mkdtempSync(join(tmpdir(), 'engine-switch-'));
  for (const path of [
    'live-compile/core/lib.rs', 'live-compile/ext/lib.rs', 'live-compile/patches/bun.patch', 'live-compile/stubs/io.rs',
    'live-compile/Cargo.toml', 'live-compile/Cargo.lock', 'live-compile/rust-toolchain.toml', 'live-compile/.cargo/config.toml', 'live-compile/scripts/vendor-bun.py',
  ]) write(base, path, `contents of ${path}\n`);
  return { base, breaka: engineAt(base, 'breaka'), stock: engineAt(base, 'stock'), write: (path, content) => write(base, path, content) };
}

/** A build cargo left in the profile's target directory, stamped as `scripts/build-live-compile.mjs` stamps it. */
function buildInTarget(repo: Repo, engine: LiveCompileEngine, bytes: string): void {
  const layout = liveCompileLayout(engine, repo.base);
  write(repo.base, relativeTo(repo, layout.built), bytes);
  writeStamp(layout.builtStamp, stampFor({ library: layout.built, engine: engine.name, probe: false, inputs: liveCompileInputs(engine, repo.base) }));
}

/** An installation as `scripts/build-live-compile.mjs` leaves it: the library, its stamp and the manifest. */
function installedAs(repo: Repo, engine: LiveCompileEngine, bytes: string): void {
  const layout = liveCompileLayout(engine, repo.base);
  write(repo.base, relativeTo(repo, layout.library), bytes);
  writeStamp(layout.stamp, stampFor({ library: layout.library, engine: engine.name, probe: false, inputs: liveCompileInputs(engine, repo.base) }));
  writeGdextension({ installDirectory: layout.installDirectory });
}

function relativeTo(repo: Repo, path: string): string {
  assert.ok(path.startsWith(`${repo.base}/`), `${path} is below the repository`);
  return path.slice(repo.base.length + 1);
}

function layoutOf(repo: Repo, engine: LiveCompileEngine): LiveCompileLayout {
  return liveCompileLayout(engine, repo.base);
}

function installedBytes(repo: Repo, engine: LiveCompileEngine): string {
  return readFileSync(layoutOf(repo, engine).library, 'utf8');
}

function installedStampEngine(repo: Repo, engine: LiveCompileEngine): unknown {
  return readStamp(layoutOf(repo, engine).stamp)?.engine;
}

// ---- The decision table, for the extension every demo run loads ---------------------------------------------------------------------------------------------

test('right profile, current sources: the run goes ahead and there is nothing to switch', () => {
  const repo = makeRepo();
  installedAs(repo, repo.stock, STOCK_BYTES);
  buildInTarget(repo, repo.stock, STOCK_BYTES);
  assert.equal(liveCompileRefusal(repo.stock, { base: repo.base }), undefined);
  assert.equal(liveCompileRefusal(repo.stock, { base: repo.base, required: true }), undefined);
  requireLiveCompile(repo.stock, { base: repo.base });
  assert.equal(switchLiveCompile(repo.stock, { base: repo.base }).outcome, 'current');
  assert.equal(installedBytes(repo, repo.stock), STOCK_BYTES, 'a current install is left alone');
});

test('wrong profile, the profile\'s own target build is current: refused with the install command, and the install is a copy that makes the run possible', () => {
  const repo = makeRepo();
  installedAs(repo, repo.breaka, BREAKA_BYTES);
  buildInTarget(repo, repo.breaka, BREAKA_BYTES);
  buildInTarget(repo, repo.stock, STOCK_BYTES);

  const refusal = liveCompileRefusal(repo.stock, { base: repo.base });
  assert.match(refusal ?? '', /is the breaka profile's, not the stock profile's/u);
  assert.match(refusal ?? '', new RegExp(`run \`${STOCK_INSTALL}\``, 'u'), 'it names the install, a copy of a build that exists');
  assert.doesNotMatch(refusal ?? '', /build-live-compile/u, 'it does not send the user to a compile');
  assert.match(refusal ?? '', /live-compile\/target-stock is current/u);

  const result = switchLiveCompile(repo.stock, { base: repo.base });
  assert.equal(result.outcome, 'installed');
  assert.equal(installedBytes(repo, repo.stock), STOCK_BYTES, 'the installed library is the stock target\'s');
  assert.equal(installedStampEngine(repo, repo.stock), 'stock');
  assert.equal(liveCompileRefusal(repo.stock, { base: repo.base, required: true }), undefined, 'the run that was refused is now accepted');
  assert.match(liveCompileRefusal(repo.breaka, { base: repo.base }) ?? '', new RegExp(`run \`${BREAKA_INSTALL}\``, 'u'), 'and the way back is the same one-line install');
  assert.equal(switchLiveCompile(repo.breaka, { base: repo.base }).outcome, 'installed');
  assert.equal(installedBytes(repo, repo.breaka), BREAKA_BYTES);
  assert.equal(liveCompileRefusal(repo.breaka, { base: repo.base }), undefined);
});

test('wrong profile, no build in the profile\'s target directory: refused with the compile command, and nothing is installed', () => {
  const repo = makeRepo();
  installedAs(repo, repo.breaka, BREAKA_BYTES);
  buildInTarget(repo, repo.breaka, BREAKA_BYTES);

  const refusal = liveCompileRefusal(repo.stock, { base: repo.base });
  assert.match(refusal ?? '', /is the breaka profile's, not the stock profile's/u);
  assert.match(refusal ?? '', new RegExp(`Run \`${STOCK_FIX}\` first`, 'u'));
  assert.doesNotMatch(refusal ?? '', /switch:engine/u, 'an install of a build that does not exist is no fix');

  const result = switchLiveCompile(repo.stock, { base: repo.base });
  assert.equal(result.outcome, 'needs-build');
  assert.equal(result.fix, STOCK_FIX);
  assert.equal(result.absent, false);
  assert.equal(installedBytes(repo, repo.breaka), BREAKA_BYTES, 'the breaka build stays installed, whole');
  assert.equal(installedStampEngine(repo, repo.breaka), 'breaka');
});

test('stale sources: the installed build and the target\'s are both refused, and only a target built from the new sources is installed', () => {
  const repo = makeRepo();
  installedAs(repo, repo.stock, STOCK_BYTES);
  buildInTarget(repo, repo.stock, STOCK_BYTES);
  repo.write('live-compile/core/lib.rs', 'a change to the checker\n');

  const stale = liveCompileRefusal(repo.stock, { base: repo.base });
  assert.match(stale ?? '', /stale: it was built from different sources[^]*changed: live-compile\/core\/lib\.rs/u, 'it names the file that moved');
  assert.match(stale ?? '', new RegExp(`Run \`${STOCK_FIX}\` first`, 'u'), 'a target built from the old sources is no better');
  assert.equal(switchLiveCompile(repo.stock, { base: repo.base }).outcome, 'needs-build');
  assert.equal(installedBytes(repo, repo.stock), STOCK_BYTES, 'the stale build is not touched by a switch that cannot improve it');

  // A target built from the new sources while the installed build is still the old one: that one can be installed.
  buildInTarget(repo, repo.stock, OTHER_STOCK_BYTES);
  assert.match(liveCompileRefusal(repo.stock, { base: repo.base }) ?? '', new RegExp(`run \`${STOCK_INSTALL}\``, 'u'));
  assert.equal(switchLiveCompile(repo.stock, { base: repo.base }).outcome, 'installed');
  assert.equal(installedBytes(repo, repo.stock), OTHER_STOCK_BYTES);
  assert.equal(liveCompileRefusal(repo.stock, { base: repo.base }), undefined);
});

test('the other profile\'s API dump is an input of its own build only', () => {
  const repo = makeRepo();
  installedAs(repo, repo.stock, STOCK_BYTES);
  repo.write('native/api/breaka/extension_api.json', '{"profile":"breaka","file":1,"edited":true}');
  assert.equal(liveCompileRefusal(repo.stock, { base: repo.base }), undefined, 'the stock build does not go stale with the breaka dump');
  repo.write('native/api/stock/extension_api.json', '{"profile":"stock","file":1,"edited":true}');
  assert.match(liveCompileRefusal(repo.stock, { base: repo.base }) ?? '', /changed: native\/api\/stock\/extension_api\.json/u);
});

test('extension absent: a run that does not use it goes ahead, the section that does is refused, and a switch installs it only if the profile has a build', () => {
  const repo = makeRepo();
  assert.equal(liveCompileRefusal(repo.stock, { base: repo.base }), undefined, 'nothing is installed, so nothing is loaded and nothing is wrong');
  assert.match(liveCompileRefusal(repo.stock, { base: repo.base, required: true }) ?? '', new RegExp(`No stock build of ${LIBRARY_NAME} is available[^]*Run \`${STOCK_FIX}\` first`, 'u'));
  assert.throws(() => requireLiveCompile(repo.stock, { base: repo.base }), new RegExp(`Run \`${STOCK_FIX}\` first`, 'u'));

  const nothing = switchLiveCompile(repo.stock, { base: repo.base });
  assert.deepEqual([nothing.outcome, nothing.absent], ['needs-build', true], 'never built here: there is nothing to switch, which is not a failure');
  assert.equal(existsSync(layoutOf(repo, repo.stock).installDirectory), false, 'and nothing was created');

  buildInTarget(repo, repo.stock, STOCK_BYTES);
  assert.match(liveCompileRefusal(repo.stock, { base: repo.base, required: true }) ?? '', new RegExp(`run \`${STOCK_INSTALL}\``, 'u'), 'required and installable: the install command');
  assert.equal(liveCompileRefusal(repo.stock, { base: repo.base }), undefined, 'still optional for a run that does not use it');
  assert.equal(switchLiveCompile(repo.stock, { base: repo.base }).outcome, 'installed');
  const layout = layoutOf(repo, repo.stock);
  assert.equal(installedBytes(repo, repo.stock), STOCK_BYTES);
  assert.match(readFileSync(layout.manifest, 'utf8'), new RegExp(`macos\\.release\\.arm64 = "res://addons/live-compile/bin/${LIBRARY_NAME}"`, 'u'), 'Godot is given the manifest it loads the library through');
  assert.equal(liveCompileRefusal(repo.stock, { base: repo.base, required: true }), undefined);
});

test('a manifest without its library is an installation Godot would fail to load, not an absent extension', () => {
  const repo = makeRepo();
  const layout = layoutOf(repo, repo.stock);
  mkdirSync(layout.installDirectory, { recursive: true });
  writeGdextension({ installDirectory: layout.installDirectory });
  assert.match(liveCompileRefusal(repo.stock, { base: repo.base }) ?? '', new RegExp(`No stock build of ${LIBRARY_NAME} is available`, 'u'));
});

test('a build replaced after it was stamped is neither run nor installed', () => {
  const repo = makeRepo();
  installedAs(repo, repo.breaka, BREAKA_BYTES);
  buildInTarget(repo, repo.stock, STOCK_BYTES);
  write(repo.base, relativeTo(repo, layoutOf(repo, repo.stock).built), 'a different library under the stamp of the stock build');
  const result = switchLiveCompile(repo.stock, { base: repo.base });
  assert.equal(result.outcome, 'needs-build', 'the target\'s library no longer matches its stamp');
  assert.equal(installedBytes(repo, repo.breaka), BREAKA_BYTES);
  write(repo.base, relativeTo(repo, layoutOf(repo, repo.breaka).library), 'tampered');
  assert.match(liveCompileRefusal(repo.breaka, { base: repo.base }) ?? '', /differs from the one its build recorded for breaka: it was replaced after it was built/u);
});

// ---- The same decisions for the native library's shape (cargo features, a probe build) ---------------------------------------------------------------------

function nativeRepo(): { root: string; apiFiles: string[] } {
  const root = mkdtempSync(join(tmpdir(), 'engine-switch-native-'));
  for (const [path, content] of Object.entries({ 'Cargo.toml': 'a\n', 'Cargo.lock': 'b\n', 'native/lib.rs': 'fn main() {}\n', 'native/api/extension_api.json': '{}', 'native/api/gdextension_interface.json': '{}' })) write(root, path, content);
  return { root, apiFiles: ['extension_api.json', 'gdextension_interface.json'].map(name => join(root, 'native/api', name)) };
}

function nativeCheck(root: string, apiFiles: string[], where: string, bytes: string, features: string[], options: { engine?: string; probe?: boolean } = {}): BuildCheck {
  const library = write(root, `${where}/libgodot_react_ui.dylib`, bytes);
  const inputs = collectInputs({ root, apiFiles, features });
  const engine = options.engine ?? 'breaka';
  const probe = options.probe ?? false;
  return { library, stamp: stampFor({ library, engine, probe, inputs }), engine, probe, current: inputs, subject: where };
}

test('a probe build installed with the default build current in the target directory: refused, the install is a copy, and it leaves the default installed', () => {
  const { root, apiFiles } = nativeRepo();
  const wanted = (check: BuildCheck): BuildCheck => ({ ...check, engine: 'breaka', probe: false, current: collectInputs({ root, apiFiles, features: [] }) });
  const installed = nativeCheck(root, apiFiles, 'install', 'probe build', ['probe'], { probe: true });
  const built = nativeCheck(root, apiFiles, 'target', 'default build', []);
  const assessment = assessInstall({ installed: wanted(installed), built: wanted(built) });
  assert.equal(assessment.action, 'install');
  assert.match(assessment.problem ?? '', /is the breaka profile's probe build, not the breaka profile's/u);
  assert.equal(assessment.builtProblem, undefined);
  const commands = { buildFix: 'pnpm build:native', installFix: 'pnpm switch:engine', builtSubject: 'The breaka library built in target' };
  assert.match(installRefusal(assessment, commands) ?? '', /run `pnpm switch:engine` first/u);
  const stampPath = join(root, 'install/react_ui.build.json');
  const result = switchBuild({ installed: wanted(installed), built: wanted(built), destination: installed.library, stampPath, fix: 'pnpm build:native' });
  assert.equal(result.outcome, 'installed');
  assert.equal(readFileSync(installed.library, 'utf8'), 'default build');
  assert.deepEqual([readStamp(stampPath)?.engine, readStamp(stampPath)?.probe, readStamp(stampPath)?.features], ['breaka', false, []]);
});

test('an installed build that is current needs no switch; an assessment that finds nothing to install says to compile', () => {
  const { root, apiFiles } = nativeRepo();
  const installed = nativeCheck(root, apiFiles, 'install', 'default build', []);
  const missing: BuildCheck = { ...installed, library: join(root, 'target/libgodot_react_ui.dylib'), stamp: undefined, subject: 'target' };
  assert.equal(assessInstall({ installed, built: missing }).action, 'ready');
  // Installed for the stock profile, wanted by the breaka profile, with nothing in the breaka target directory.
  const otherProfile: BuildCheck = { ...nativeCheck(root, apiFiles, 'install', 'default build', [], { engine: 'stock' }), engine: 'breaka' };
  const assessment = assessInstall({ installed: otherProfile, built: missing });
  assert.equal(assessment.action, 'build');
  assert.match(installRefusal(assessment, { buildFix: 'pnpm build:native', installFix: 'pnpm switch:engine', builtSubject: 'The target' }) ?? '', /Run `pnpm build:native` first\.$/u);
  assert.throws(() => installBuilt({ built: missing, destination: otherProfile.library, stampPath: join(root, 'stamp.json'), fix: 'pnpm build:native' }), /Run `pnpm build:native` first/u);
  assert.equal(existsSync(join(root, 'stamp.json')), false, 'no stamp is written for a build that was not installed');
});

// ---- The install itself ------------------------------------------------------------------------------------------------------------------------------------

test('an install replaces the file by a rename: a process that has the old library open keeps reading the old library', () => {
  const root = mkdtempSync(join(tmpdir(), 'engine-switch-install-'));
  const destination = write(root, 'install/lib.dylib', 'old library, mapped by a running Godot');
  const source = write(root, 'target/lib.dylib', 'new library');
  const mapped = openSync(destination, 'r');
  try {
    const before = statSync(destination).ino;
    installFile(source, destination);
    assert.equal(readFileSync(destination, 'utf8'), 'new library');
    assert.notEqual(statSync(destination).ino, before, 'the directory entry now names another file');
    assert.equal(readFileSync(mapped, 'utf8'), 'old library, mapped by a running Godot', 'the open file is untouched (copyFileSync over it would have rewritten it in place)');
  } finally {
    closeSync(mapped);
  }
  assert.deepEqual(readdirSync(join(root, 'install')), ['lib.dylib'], 'no staged file is left behind');
});

test('an install of a file that is not the one its stamp describes installs nothing', () => {
  const root = mkdtempSync(join(tmpdir(), 'engine-switch-install-'));
  const destination = write(root, 'install/lib.dylib', 'old');
  const source = write(root, 'target/lib.dylib', 'new, but another build finished under the stamp');
  assert.throws(() => installFile(source, destination, { sha256: '0'.repeat(64) }), /not the file its stamp describes/u);
  assert.equal(readFileSync(destination, 'utf8'), 'old');
  assert.deepEqual(readdirSync(join(root, 'install')), ['lib.dylib']);
  installFile(source, join(root, 'made/for/it/lib.dylib'));
  assert.equal(readFileSync(join(root, 'made/for/it/lib.dylib'), 'utf8'), 'new, but another build finished under the stamp');
});

test('the manifest is rewritten only when it differs, and by a rename a reader never sees half of', () => {
  const root = mkdtempSync(join(tmpdir(), 'engine-switch-manifest-'));
  const manifest = join(root, 'live_compile.gdextension');
  writeGdextension({ installDirectory: root });
  const first = statSync(manifest).ino;
  const original = readFileSync(manifest, 'utf8');
  assert.doesNotMatch(original, /web\./u);
  writeGdextension({ installDirectory: root });
  assert.equal(statSync(manifest).ino, first, 'the same manifest is not rewritten');
  write(root, `bin/${WEB_LIBRARY_NAME}`, 'web side module');
  writeGdextension({ installDirectory: root });
  assert.notEqual(statSync(manifest).ino, first);
  assert.match(readFileSync(manifest, 'utf8'), new RegExp(`web\\.release\\.threads\\.wasm32 = "res://addons/live-compile/bin/${WEB_LIBRARY_NAME}"`, 'u'));
  assert.deepEqual(readdirSync(root).filter(name => name.endsWith('.tmp')), []);
});

test('the sources the extension is made from include every directory the build reads', () => {
  const repo = makeRepo();
  assert.deepEqual(liveCompileSourceFiles(repo.base).filter(path => path.includes('/core/') || path.includes('/ext/') || path.includes('/patches/') || path.includes('/stubs/')), [
    'live-compile/core/lib.rs', 'live-compile/ext/lib.rs', 'live-compile/patches/bun.patch', 'live-compile/stubs/io.rs',
  ]);
});
