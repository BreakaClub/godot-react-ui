// Builds the live-compile extension as a Web side module (wasm32-unknown-emscripten) for an engine profile and installs it beside the native library:
//
//   node scripts/build-live-compile-web.mjs [--engine=stock]
//
//   demo/addons/live-compile/bin/live_compile.web.wasm          the `breaka` profile's module (Emscripten 6.0.12, Breaka's lazy function-table ABI)
//   demo/addons/live-compile/bin/live_compile.web.stock.wasm    the `stock` profile's module (Emscripten 4.0.11, an ordinary side module)
//   demo/addons/live-compile/live_compile.web[.stock].build.json   the stamp: the profile it was linked for, the sources and Web dumps it was built from
//
// The Web is per profile: a side module must be linked with the Emscripten of the engine that loads it, and a module of the other profile's kills the page at
// load. Nothing here touches the extension's manifest: the Web export of a profile lists exactly this profile's module, or none (scripts/build-web.mjs).
//
// The recipe is the UI extension's (scripts/build-web.mjs, docs/WEB.md): the profile's Emscripten SDK, a rebuilt standard library with atomics and pthreads, a
// side module (`SIDE_MODULE=2`) with hidden symbols and, for `breaka`, its lazy function-table link flags and Binaryen. Keep the constants below in step with
// that script. What differs is the compiler: Bun's crates need a newer nightly than the UI extension's (`core::alloc::AllocatorClone`), and
// `-Z emscripten-wasm-eh=false`, the switch the UI extension's recipe sets, does not exist on it. The module is built with `panic=abort` (the `wasm` cargo
// profile), which leaves it no landing pads for either kind of exception handling.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, relative, resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';
import { beginBuild, installFile } from './freshness.mjs';
import { INSTALL_DIRECTORY, liveCompileWebInputs, webLibraryNameOf, webLibraryOf, webStampOf, webTargetDirectoryOf, WEB_FIX } from './live-compile-build.mjs';

rejectUnknownArguments(process.argv.slice(2));
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
const lazyTable = engine.web.lazyFunctionTable;
const sdk = process.env.EMSDK_ROOT ?? engine.web.emscripten;
const binaryen = process.env.BINARYEN_ROOT ?? '/Users/ben/Development/godot-4.8-restoration-20261027/artifacts/binaryen133-sdk6-7d48204';
const helper = process.env.GODOT_EMSCRIPTEN_HELPER ?? '/Users/ben/Development/godot-4.8-restoration-20261027/source/platform/web/emscripten_helpers.py';
const manifestHash = process.env.BINARYEN_MANIFEST_SHA256 ?? '895bb89edd5e5c0f3966810f3962e8c960b5534bf8527301abfbb6f8e89f0bc8';
const python = process.env.SCONS_PYTHON ?? '/opt/homebrew/Cellar/scons/4.9.1/libexec/bin/python';
const cargo = process.env.CARGO ?? resolve(homedir(), '.cargo/bin/cargo');
const workspace = resolve(root, 'live-compile');
const targetDirectory = webTargetDirectoryOf(engine);
const WORKSPACE_CRATES = ['live_compile_core', 'live_compile_ext'];
const BUILD_TIMEOUT_MS = 30 * 60 * 1000;

const env = {
  ...process.env,
  ...engine.webBindingEnvironment(),
  PATH: [dirname(cargo), join(sdk, 'upstream', 'emscripten'), join(sdk, 'node', '24.19.0_64bit', 'bin'), process.env.PATH ?? ''].join(delimiter),
  EM_CONFIG: join(sdk, '.emscripten'),
  CARGO_TARGET_DIR: targetDirectory,
};
// Another SDK's Binaryen must not leak into a build that has none of its own to override.
if (!lazyTable) delete env.EM_BINARYEN_ROOT;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: workspace, env, stdio: 'inherit', timeout: BUILD_TIMEOUT_MS, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message ?? `exit ${result.status}`}`);
  return result.stdout;
}

/** The module's `breaka.lazy-table` custom section count: Breaka's lazy function-table ABI is recorded per module, and a stock module has none. */
function lazyTableSections(bytes) {
  return WebAssembly.Module.customSections(new WebAssembly.Module(bytes), 'breaka.lazy-table').length;
}

const flags = [
  '-C', 'link-args=-pthread', '-C', 'target-feature=+atomics', '-C', 'link-args=-sSIDE_MODULE=2',
  '-C', 'llvm-args=-enable-emscripten-cxx-exceptions=0', '-Z', 'default-visibility=hidden', '-Z', 'link-native-libraries=no',
  // Bun's crates are built as they come, with their lints reported and not enforced (live-compile/.cargo/config.toml).
  '--cap-lints=warn',
];
if (lazyTable) {
  // Breaka's lazy function-table ABI: the engine's own validator gives the link flags and the Binaryen to link with.
  const validate = `import importlib.util,json,os,sys
spec=importlib.util.spec_from_file_location('godot_web_build_helpers',sys.argv[1])
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class Environment(dict):
    def Append(self, **items):
        for key, values in items.items(): self.setdefault(key, []).extend(values)
env=Environment(platform='web',ENV=dict(os.environ))
module.configure_binaryen_toolchain(env,sys.argv[2],sys.argv[3],role='side')
print(json.dumps({'binaryen':env['ENV']['EM_BINARYEN_ROOT'],'linkFlags':env['LINKFLAGS']}))
`;
  const validation = JSON.parse(run(python, ['-c', validate, helper, binaryen, manifestHash], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' }));
  env.EM_BINARYEN_ROOT = validation.binaryen;
  flags.push(...validation.linkFlags.flatMap(flag => ['-C', `link-args=${flag}`]));
}
env.CARGO_ENCODED_RUSTFLAGS = flags.join('\x1f');
delete env.RUSTFLAGS;
console.log(`live-compile Web side module, ${engine.name} profile: Emscripten ${sdk}, target ${targetDirectory}`);
const built = join(targetDirectory, 'wasm32-unknown-emscripten', 'wasm', 'live_compile.wasm');
// Cargo decides what to rebuild from file modification times: hash the inputs and, unless the target's own stamp says the module
// cargo left is a build of exactly these, clean the workspace's crates so cargo compiles them. The stamp records the profile the module is linked for.
const build = beginBuild({
  identity: { engine: engine.name }, probe: false, collect: () => liveCompileWebInputs(engine),
  built, targetStamp: join(targetDirectory, 'live_compile.web.build.json'), installed: webLibraryOf(engine), installedStamp: webStampOf(engine),
  subject: `${webLibraryNameOf(engine)} built in ${relative(root, targetDirectory)}`, compiler: 'cargo', fix: WEB_FIX(engine), crate: WORKSPACE_CRATES.join(' and '),
  clean: () => run(cargo, ['clean', '--locked', ...WORKSPACE_CRATES.flatMap(crate => ['-p', crate]), '--profile', 'wasm', '--target', 'wasm32-unknown-emscripten']),
});
run(cargo, ['build', '--locked', '--profile', 'wasm', '-p', 'live_compile_ext', '--features', 'web', '-Zbuild-std=std,panic_abort', '--target', 'wasm32-unknown-emscripten']);
build.compiled();
const bytes = readFileSync(built);
// The ABI the module was linked with must be the profile's: a lazy-table module in a stock page, or a plain one in Breaka's, fails at load.
if ((lazyTableSections(bytes) > 0) !== lazyTable) {
  throw new Error(`The module has ${lazyTableSections(bytes)} breaka.lazy-table section(s), but the ${engine.name} profile's templates ${lazyTable ? 'need' : 'do not take'} Breaka's lazy function-table ABI; it was not installed.`);
}
mkdirSync(join(INSTALL_DIRECTORY, 'bin'), { recursive: true });
// Staged and renamed: a running Godot may have the old module open. The manifest is not touched: the Web export lists the module (scripts/build-web.mjs).
installFile(built, webLibraryOf(engine));
build.installed();
console.log(`Installed ${webLibraryNameOf(engine)} (${engine.name} profile): ${bytes.length} bytes`);
