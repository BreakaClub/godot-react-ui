import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { mock, test } from 'node:test';
import type { Engine } from '../scripts/engine.mjs';
import * as NativeBinding from '../scripts/native-binding.mjs';
import { BREAKA_VERSION, DUMP_HEADER, GODOT_TSC_LIBRARY, GODOT_TSC_SETUP, makeSkeleton, OTHER_API, SCRIPTS, STOCK_VERSION, write, type Skeleton } from './skeleton';

/** The names the library has in the addon, as the patterns below write them before they know this machine's. */
const ANY_LIBRARY_NAME = String.raw`(?:lib)?godot_react_ui\.(?:dylib|so|dll)`;
/** The same pattern for this machine's library, whose name carries its platform and architecture where there are two to tell apart. */
const withHostLibrary = (pattern: RegExp): RegExp => new RegExp(pattern.source.replaceAll(ANY_LIBRARY_NAME, NativeBinding.NATIVE_LIBRARY_NAME.replaceAll('.', String.raw`\.`)), pattern.flags);

// The native guard: one native UI library and one native godot-tsc library (the code editor's checker, a package) per
// platform, bound to Godot API 4.7.2 and accepted by both engine profiles. `engine.prepareNative` is what every native run calls; the scripts that decide are copied into a temporary
// repository (tests/skeleton.ts) and a stub stands in for `godot --version`, so the real wiring runs with no cargo, no Godot and no window.

/** What `prepareNative` throws for the profile, or undefined when the run may go ahead. It runs silent: the engine line is not the test's. */
function refusalOf(engine: Engine, options: Parameters<Engine['prepareNative']>[0] = {}): string | undefined {
  const log = mock.method(console, 'log', () => undefined);
  try {
    engine.prepareNative(options);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  } finally {
    log.mock.restore();
  }
}

/** Both profiles' refusal for the same state: the profile does not enter into the native guard, so they must agree. */
function refusals(skeleton: Skeleton, options: Parameters<Engine['prepareNative']>[0] = {}): string | undefined {
  const breaka = refusalOf(skeleton.engine('breaka'), options);
  const stock = refusalOf(skeleton.engine('stock'), options);
  assert.equal(breaka, stock, 'the same installed builds are accepted or refused alike under both profiles');
  return breaka;
}

/** The state every row starts from: the native library built from the current sources and installed, and the godot-tsc package's addon installed. */
async function installedBoth(): Promise<Skeleton> {
  const skeleton = await makeSkeleton();
  skeleton.buildNative('native library bound to 4.7.2', { install: true });
  skeleton.packageGodotTsc();
  skeleton.installGodotTsc();
  return skeleton;
}

/** The setup command every godot-tsc refusal ends with, as a pattern. */
const SETUP = GODOT_TSC_SETUP.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

// ---- The guard table ---------------------------------------------------------------------------------------------------------------------------------------------

test('right API, current sources: one install is accepted by both profiles, and the run names the API', async () => {
  const skeleton = await installedBoth();
  assert.equal(refusals(skeleton), undefined);
  const log = mock.method(console, 'log', () => undefined);
  try {
    assert.equal(skeleton.engine('breaka').prepareNative(), BREAKA_VERSION);
    assert.equal(skeleton.engine('stock').prepareNative(), STOCK_VERSION);
    assert.match(String(log.mock.calls[0]?.arguments[0]), /^Engine profile breaka .*Godot 4\.8\.beta.*; native builds bound to Godot API 4\.7\.2$/u);
    assert.match(String(log.mock.calls[1]?.arguments[0]), /^Engine profile stock .*Godot 4\.7\.2.*; native builds bound to Godot API 4\.7\.2$/u);
  } finally {
    log.mock.restore();
  }
});

test('the stamps a build records name the API it is bound to and the hash of its dump pair, and no profile', async () => {
  const skeleton = await installedBoth();
  for (const path of [skeleton.native.NATIVE_INSTALLED_STAMP, skeleton.native.nativeVariant().targetStamp]) {
    const stamp = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    assert.deepEqual(stamp.binding, skeleton.native.nativeBinding(), path);
    assert.equal((stamp.binding as { api: string }).api, '4.7.2');
    assert.match((stamp.binding as { dump: string }).dump, /^[0-9a-f]{64}$/u);
    assert.equal(Object.hasOwn(stamp, 'engine'), false, `${path} does not name a profile`);
  }
});

test('a library bound to another API is refused under both profiles, up front, naming the one fix', async () => {
  const skeleton = await installedBoth();
  skeleton.restampNative(stamp => { stamp.binding = OTHER_API; });
  const refusal = refusals(skeleton) ?? '';
  assert.match(refusal, withHostLibrary(/^The installed (?:lib)?godot_react_ui\.(?:dylib|so|dll) is bound to Godot API 4\.8\.0 \(dump abababababab\), not bound to Godot API 4\.7\.2 \(dump [0-9a-f]{12}\)\. Run `pnpm build:native` first\.$/u));
  assert.doesNotMatch(refusal, /--engine|switch:engine/u, 'the fix is not per engine');
  skeleton.restampNative(stamp => { stamp.binding = skeleton.native.nativeBinding(); });
  assert.equal(refusals(skeleton), undefined, 'restamped for the right API it is accepted again');
});

test('the same API version with another dump is another binding', async () => {
  const skeleton = await installedBoth();
  skeleton.write('native/api/stock-4.7.2/gdextension_interface.json', '{"interface":"4.7.2, regenerated"}');
  const refusal = refusals(skeleton) ?? '';
  assert.match(refusal, /is bound to Godot API 4\.7\.2 \(dump ([0-9a-f]{12})\), not bound to Godot API 4\.7\.2 \(dump (?!\1)[0-9a-f]{12}\)/u);
});

test('a build stamped by profile, from before native builds were bound to one API, is refused once and cannot be shown to match', async () => {
  const skeleton = await installedBoth();
  for (const profile of ['breaka', 'stock']) {
    skeleton.restampNative(stamp => { delete stamp.binding; stamp.engine = profile; });
    const refusal = refusals(skeleton) ?? '';
    assert.match(refusal, new RegExp(`is the ${profile} profile's build, made before native builds were bound to one Godot API, not bound to Godot API 4\\.7\\.2`, 'u'));
    assert.match(refusal, /Run `pnpm build:native` first\.$/u);
  }
});

test('stale sources: a changed native file refuses the library and names the file, and a rebuild clears it', async () => {
  const skeleton = await installedBoth();
  skeleton.write('native/lib.rs', 'a change to the library\n');
  const refusal = refusals(skeleton) ?? '';
  assert.match(refusal, withHostLibrary(/(?:lib)?godot_react_ui\.(?:dylib|so|dll) is stale: it was built from different sources[^]*changed: native\/lib\.rs[^\n]*Run `pnpm build:native` first\./u));
  assert.doesNotMatch(refusal, /godot-tsc/u, 'the godot-tsc addon is the package\'s and does not read native/, so it is still current');
  skeleton.buildNative('native library, rebuilt', { install: true });
  assert.equal(refusals(skeleton), undefined);
});

test('the library is not installed, or its stamp is gone: refused with the build command', async () => {
  const skeleton = await makeSkeleton();
  assert.match(refusals(skeleton) ?? '', withHostLibrary(/^No build of (?:lib)?godot_react_ui\.(?:dylib|so|dll) bound to Godot API 4\.7\.2 \(dump [0-9a-f]{12}\) is available: the installed (?:lib)?godot_react_ui\.(?:dylib|so|dll) or its build stamp is missing\. Run `pnpm build:native` first\.$/u));
});

test('the library replaced after it was stamped is refused', async () => {
  const skeleton = await installedBoth();
  skeleton.write(skeleton.native.NATIVE_INSTALLED_LIBRARY.slice(skeleton.root.length + 1), 'some other library under the stamp');
  assert.match(refusals(skeleton) ?? '', /differs from the one its build recorded: it was replaced after it was built\. Run `pnpm build:native` first/u);
});

test('probe and faults are variants of the build, one each and not one per profile', async () => {
  const skeleton = await installedBoth();
  assert.match(refusals(skeleton, { probe: true }) ?? '', /is a default build, not a probe build\. Run `pnpm build:native --probe` first\.$/u);
  assert.match(refusals(skeleton, { faults: true }) ?? '', /cargo features differ: built with \[\], wanted \[filter-faults\][^\n]*Run `pnpm build:native --faults` first\.$/u);
  skeleton.buildNative('probe build', { probe: true, install: true });
  assert.equal(refusals(skeleton, { probe: true }), undefined, 'a probe build is accepted for a probe run under either profile');
  assert.match(refusals(skeleton) ?? '', /is a probe build, not a default build\. Run `pnpm build:native` first\.$/u, 'and refused for a default run');
  skeleton.buildNative('faults build', { faults: true, install: true });
  assert.equal(refusals(skeleton, { faults: true }), undefined);
  assert.match(refusals(skeleton) ?? '', /cargo features differ: built with \[filter-faults\], wanted \[\]/u);
  assert.deepEqual(readdirSync(join(skeleton.root, 'target')).sort(), ['faults', 'probe', 'react_ui.build.json', 'release'], 'three target directories in all, no profile among them');
});

// ---- The godot-tsc addon ------------------------------------------------------------------------------------------------------------------------------

test('addon absent: a run that does not use it goes ahead, and the section that does is refused with the setup command', async () => {
  const skeleton = await makeSkeleton();
  skeleton.buildNative('native library', { install: true });
  skeleton.packageGodotTsc();
  assert.equal(refusals(skeleton), undefined, 'nothing is installed, so nothing is loaded and nothing is wrong');
  assert.match(skeleton.godotTsc.godotTscRefusal({ required: true }) ?? '', new RegExp(`^The godot-tsc addon is not installed in the demo\\. Run \`${SETUP}\` first\\.$`, 'u'));
  assert.throws(() => skeleton.godotTsc.requireGodotTsc(), new RegExp(`Run \`${SETUP}\` first`, 'u'));
  assert.equal(skeleton.godotTsc.godotTscRefusal(), undefined);
  skeleton.installGodotTsc();
  assert.equal(skeleton.godotTsc.godotTscRefusal({ required: true }), undefined, 'the setup installs it');
});

test('addon present: not the package\'s current build, a replaced binary, another API, other dumps or half installed are all refused under both profiles', async () => {
  // The package was rebuilt (or updated) since the install.
  const rebuilt = await installedBoth();
  rebuilt.packageGodotTsc({ native: 'godot-tsc library, rebuilt' });
  assert.match(refusals(rebuilt) ?? '', new RegExp(`^The installed godot-tsc addon is not the package's current build: demo/addons/godot-tsc/build\\.json differs from node_modules/godot-tsc/addon/godot-tsc/build\\.json\\. Run \`${SETUP}\` first\\.$`, 'u'));
  assert.doesNotMatch(refusals(rebuilt) ?? '', /godot_react_ui/u, 'the library is fine');
  rebuilt.installGodotTsc();
  assert.equal(refusals(rebuilt), undefined);

  // A binary replaced after the install.
  const replaced = await installedBoth();
  write(replaced.godotTsc.INSTALL_DIRECTORY, `bin/${GODOT_TSC_LIBRARY}`, 'a library of some other build');
  assert.match(refusals(replaced) ?? '', new RegExp(`^The installed godot-tsc bin/${GODOT_TSC_LIBRARY.replaceAll('.', '\\.')} is not the file its build record lists\\. Run \`${SETUP}\` first\\.$`, 'u'));
  rmSync(join(replaced.godotTsc.INSTALL_DIRECTORY, 'bin', GODOT_TSC_LIBRARY));
  assert.match(refusals(replaced) ?? '', /has no bin\/libgodot_tsc\.dylib, which its build record lists/u);

  // Bound to another API, or to other dumps of 4.7.2.
  const newer = await makeSkeleton();
  newer.buildNative('native library', { install: true });
  newer.packageGodotTsc({ nativeApi: { version: '4.8.0', extensionApiSha256: 'ab'.repeat(32), gdextensionInterfaceSha256: 'cd'.repeat(32) } });
  newer.installGodotTsc();
  assert.match(refusals(newer) ?? '', /^The installed godot-tsc library is bound to Godot API 4\.8\.0, not 4\.7\.2, the API this repository's native builds are bound to/u);
  const otherDumps = await makeSkeleton();
  otherDumps.buildNative('native library', { install: true });
  otherDumps.packageGodotTsc({ nativeApi: { version: '4.7.2', extensionApiSha256: 'ab'.repeat(32), gdextensionInterfaceSha256: 'cd'.repeat(32) } });
  otherDumps.installGodotTsc();
  assert.match(refusals(otherDumps) ?? '', /^The installed godot-tsc library is bound to other Godot 4\.7\.2 dumps than native\/api\/stock-4\.7\.2: extension_api\.json abababababab, not [0-9a-f]{12}\./u);
  // A change to the repository's dump is a change of binding: the installed library is not bound to it.
  const regenerated = await installedBoth();
  regenerated.write('native/api/stock-4.7.2/gdextension_interface.json', '{"interface":"4.7.2","regenerated":true}');
  assert.match(refusals(regenerated) ?? '', /bound to other Godot 4\.7\.2 dumps than native\/api\/stock-4\.7\.2: gdextension_interface\.json/u);

  // Half installed: a manifest without its build record, a record without its manifest.
  const half = await makeSkeleton();
  half.buildNative('native library', { install: true });
  half.packageGodotTsc();
  write(half.godotTsc.INSTALL_DIRECTORY, 'godot_tsc.gdextension', '[configuration]\n');
  assert.match(refusals(half) ?? '', new RegExp(`^demo/addons/godot-tsc has no build\\.json, so it is not an install of the godot-tsc package\\. Run \`${SETUP}\` first\\.$`, 'u'), 'a manifest alone is an installation Godot would load');
  const unlisted = await installedBoth();
  rmSync(unlisted.godotTsc.GDEXTENSION_FILE);
  assert.match(refusals(unlisted) ?? '', /^The installed godot-tsc addon has no godot_tsc\.gdextension, so Godot does not load it/u);

  // Installed, and the package gone from node_modules.
  const orphan = await installedBoth();
  rmSync(orphan.godotTsc.PACKAGE_DIRECTORY, { recursive: true });
  assert.match(refusals(orphan) ?? '', /^The godot-tsc package has no built addon \(node_modules\/godot-tsc\/addon\/godot-tsc\/build\.json is missing\)/u);
});

test('a build record that is not one is an error, not an install', async () => {
  const skeleton = await installedBoth();
  const { godotTsc } = skeleton;
  assert.throws(() => godotTsc.parseBuildRecord('{"version":"7.0.0"}', 'build.json'), /^Error: build\.json is not a godot-tsc build record: its nativeApi has no version and binding$/u);
  const record = JSON.parse(readFileSync(godotTsc.INSTALLED_RECORD, 'utf8')) as Record<string, unknown>;
  assert.throws(() => godotTsc.parseBuildRecord(JSON.stringify({ ...record, webModules: { 'godot_tsc.web.stock.wasm': { profile: 'stock', binding: record.nativeApi } } }), 'build.json'), /its binaries do not list the Web module godot_tsc\.web\.stock\.wasm/u);
  assert.equal(godotTsc.parseBuildRecord(readFileSync(godotTsc.INSTALLED_RECORD, 'utf8'), 'build.json').version, '7.0.0');
});

test('both refusals come at once, each with its own fix, before the engine line is printed', async () => {
  const skeleton = await installedBoth();
  skeleton.restampNative(stamp => { stamp.binding = OTHER_API; });
  skeleton.packageGodotTsc({ native: 'godot-tsc library, rebuilt' });
  const log = mock.method(console, 'log', () => undefined);
  try {
    assert.throws(() => skeleton.engine('stock').prepareNative(), (error: unknown) => {
      const lines = (error instanceof Error ? error.message : '').split('\n');
      assert.equal(lines.length, 2);
      assert.match(lines[0] ?? '', withHostLibrary(/(?:lib)?godot_react_ui\.(?:dylib|so|dll) is bound to Godot API 4\.8\.0[^\n]*Run `pnpm build:native` first\.$/u));
      assert.match(lines[1] ?? '', new RegExp(`^The installed godot-tsc addon is not the package's current build[^\\n]*Run \`${SETUP}\` first\\.$`, 'u'));
      return true;
    });
    assert.equal(log.mock.calls.length, 0);
  } finally {
    log.mock.restore();
  }
});

test('a run that takes the addon out of the project is not refused for it', async () => {
  const skeleton = await installedBoth();
  skeleton.packageGodotTsc({ native: 'godot-tsc library, rebuilt' });
  assert.match(refusals(skeleton) ?? '', /godot-tsc addon is not the package's current build/u);
  assert.equal(refusals(skeleton, { godotTsc: false }), undefined, '`gen:types` hides the manifest while Godot runs');
});

// ---- The engine under test --------------------------------------------------------------------------------------------------------------------------------

test('an engine older than the API the native builds are bound to is refused, whatever profile it stands in for', async () => {
  const skeleton = await installedBoth();
  assert.throws(() => skeleton.engine('stock', '4.7.1.stable.custom_build').verifiedVersion(), /older than 4\.7\.2, the API the native builds are bound to/u);
  assert.equal(skeleton.engine('stock', '4.7.2.stable.custom_build').verifiedVersion(), '4.7.2.stable.custom_build');
  assert.equal(skeleton.engine('stock', '4.7.9.stable.custom_build').verifiedVersion(), '4.7.9.stable.custom_build');
  assert.equal(skeleton.engine('breaka', '4.8.beta.custom_build').verifiedVersion(), '4.8.beta.custom_build', 'a newer engine loads an older binding');
  assert.throws(() => skeleton.engine('breaka', '4.7.2.stable.custom_build').verifiedVersion(), /expects Godot 4\.8\.x/u);
});

test('the record names the dump it is bound to, and refuses a dump of another version', async () => {
  const skeleton = await makeSkeleton();
  assert.equal(skeleton.native.dumpVersion(skeleton.native.NATIVE_BINDING_API.dumps.extensionApi), '4.7.2');
  assert.equal(skeleton.native.nativeBinding().api, skeleton.native.NATIVE_BINDING_API.version);
  skeleton.write('native/api/stock-4.7.2/extension_api.json', DUMP_HEADER('4.8.0'));
  assert.throws(() => skeleton.native.nativeBinding(), /NATIVE_BINDING_API names Godot 4\.7\.2, but native\/api\/stock-4\.7\.2\/extension_api\.json is a dump of Godot 4\.8\.0/u);
  skeleton.write('native/api/stock-4.7.2/extension_api.json', 'not a dump');
  assert.throws(() => skeleton.native.nativeBinding(), /not a Godot extension_api\.json dump/u);
});

// ---- The Web stays per profile, the native build has no profile ------------------------------------------------------------------------------------

test('a Web side module is still the profile\'s: another profile\'s is refused', async () => {
  const skeleton = await makeSkeleton();
  const stock = skeleton.engine('stock');
  const breaka = skeleton.engine('breaka');
  const web = join(skeleton.native.NATIVE_INSTALL_DIRECTORY, 'godot_react_ui.web.wasm');
  skeleton.write(web.slice(skeleton.root.length + 1), 'web side module');
  const record = mock.method(console, 'log', () => undefined);
  try {
    const build = breaka.beginWebBuild({ clean: () => undefined });
    mkdirSync(join(breaka.targets.web, 'wasm32-unknown-emscripten/release'), { recursive: true });
    copyFileSync(web, join(breaka.targets.web, 'wasm32-unknown-emscripten/release/godot_react_ui.wasm'));
    build.compiled();
    build.installed();
  } finally {
    record.mock.restore();
  }
  assert.doesNotThrow(() => breaka.requireInstalledWasm());
  assert.throws(() => stock.requireInstalledWasm(), /is the breaka profile's, not the stock profile's\. Run `pnpm build:web --wasm-only --engine=stock` first/u);
  const stamp = JSON.parse(readFileSync(join(skeleton.native.NATIVE_INSTALL_DIRECTORY, 'react_ui.web.build.json'), 'utf8')) as Record<string, unknown>;
  assert.equal(stamp.engine, 'breaka');
  assert.equal(Object.hasOwn(stamp, 'binding'), false);
});

test('the native builds refuse --engine=, because they have no profile', () => {
  for (const script of ['build-native.mjs']) {
    const result = spawnSync('node', [join(SCRIPTS, script), '--engine=stock'], { encoding: 'utf8', timeout: 30_000 });
    assert.notEqual(result.status, 0, script);
    assert.match(result.stderr, /Unknown argument: --engine=stock \(this script has no engine profile: the native builds are one build for every profile/u, script);
    assert.equal(result.stdout, '', `${script} did nothing before refusing`);
  }
});

// ---- The wiring of the real scripts ------------------------------------------------------------------------------------------------------------------------

test('.cargo/config.toml binds a plain cargo run to the same dump pair the scripts and the stamp name', () => {
  const config = readFileSync(join(SCRIPTS, '..', '.cargo/config.toml'), 'utf8');
  const named = (variable: string): string | undefined => new RegExp(`${variable} = \\{ value = "([^"]+)", relative = true \\}`, 'u').exec(config)?.[1];
  const root = join(SCRIPTS, '..');
  assert.equal(join(root, named('GDRUST_GODOT_API_JSON') ?? 'missing'), NativeBinding.NATIVE_BINDING_API.dumps.extensionApi);
  assert.equal(join(root, named('GDRUST_GODOT_INTERFACE_JSON') ?? 'missing'), NativeBinding.NATIVE_BINDING_API.dumps.gdextensionInterface);
  assert.deepEqual(NativeBinding.nativeBindingEnvironment(), { GDRUST_GODOT_API_JSON: NativeBinding.NATIVE_BINDING_API.dumps.extensionApi, GDRUST_GODOT_INTERFACE_JSON: NativeBinding.NATIVE_BINDING_API.dumps.gdextensionInterface });
});

test('the repository\'s own dump is a dump of the version the record names', () => {
  assert.equal(NativeBinding.dumpVersion(NativeBinding.NATIVE_BINDING_API.dumps.extensionApi), NativeBinding.NATIVE_BINDING_API.version);
  assert.equal(NativeBinding.nativeBinding().api, '4.7.2');
});

// The native builds have no engine profile, so the list of scripts that select one (freshness.test.ts) does not hold them. Each must record what the
// build is bound to and made from, and install by rename.
const NATIVE_BUILD_SCRIPTS: Record<string, readonly string[]> = {
  'build-native.mjs': ['beginNativeBuild(', 'build.compiled()', 'installFile(', 'build.installed()', 'engine: false'],
};

test('the native build scripts stamp the target and the install with the binding, and install by rename', () => {
  for (const [name, calls] of Object.entries(NATIVE_BUILD_SCRIPTS)) {
    const source = readFileSync(join(SCRIPTS, name), 'utf8');
    for (const call of calls) assert.ok(source.includes(call), `${name} must contain ${call}`);
    assert.ok(!source.includes('selectEngine('), `${name} has no engine profile`);
  }
});

test('every script that launches a window checks the installed builds, not the library alone, before each launch', () => {
  const launching = readdirSync(SCRIPTS).filter(name => name.endsWith('.mjs') && readFileSync(join(SCRIPTS, name), 'utf8').includes('beforeLaunch:'));
  assert.deepEqual(launching.sort(), ['verify-a11y.mjs', 'verify-casing.mjs', 'verify-text-layout.mjs', 'verify-world.mjs', 'verify.mjs'], 'a new launcher must be listed here with the check it makes');
  for (const name of launching) {
    const source = readFileSync(join(SCRIPTS, name), 'utf8');
    assert.match(source, /beforeLaunch: \(\) => engine\.requireInstalledBuilds\(/u, `${name} checks the extension as well as the library before every window`);
  }
});

test('every launcher that starts the editor or a window of the demo calls prepareNative, and prepareNative checks the installed builds', () => {
  for (const name of ['dev.mjs', 'run.mjs', 'verify.mjs', 'verify-a11y.mjs', 'verify-world.mjs', 'verify-text-layout.mjs', 'generate-types.mjs']) {
    assert.match(readFileSync(join(SCRIPTS, name), 'utf8'), /prepareNative\(/u, `${name} calls prepareNative`);
  }
  const engineSource = readFileSync(join(SCRIPTS, 'engine.mjs'), 'utf8');
  const prepareNative = engineSource.slice(engineSource.indexOf('prepareNative({'), engineSource.indexOf('requireInstalledWasm'));
  assert.match(prepareNative, /this\.requireInstalledBuilds\(/u);
});

test('the skeleton is the real scripts: it has no switch command and no per-profile native target', () => {
  assert.equal(existsSync(join(SCRIPTS, 'switch-engine.mjs')), false);
  const source = readFileSync(join(SCRIPTS, 'engine.mjs'), 'utf8');
  assert.doesNotMatch(source, /nativeProbe|nativeFaults|target\/stock['"]|switchLibrary/u);
});
