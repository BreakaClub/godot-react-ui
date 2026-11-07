// Builds the live-compile extension as a Web side module (wasm32-unknown-emscripten) and installs it beside the native library:
//
//   node scripts/build-live-compile-web.mjs
//
//   demo/addons/live-compile/bin/live_compile.web.wasm
//
// The recipe is the UI extension's (scripts/build-web.mjs, docs/WEB.md): Breaka's Emscripten SDK and Binaryen, a rebuilt standard library
// with atomics and pthreads, a side module (`SIDE_MODULE=2`) with hidden symbols and Breaka's lazy function-table link flags. Keep the
// constants below in step with that script. What differs is the compiler: Bun's crates need a newer nightly than the UI extension's
// (`core::alloc::AllocatorClone`), and `-Z emscripten-wasm-eh=false`, the switch the UI extension's recipe sets, does not exist on it.
// The module is built with `panic=abort` (the `wasm` cargo profile), which leaves it no landing pads for either kind of exception handling.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';
import { INSTALL_DIRECTORY, targetDirectoryOf, writeGdextension } from './live-compile-build.mjs';

rejectUnknownArguments(process.argv.slice(2));
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
if (engine.name !== 'breaka') throw new Error('The Web side module of live-compile is built for the breaka profile only; the stock profile has not been tried.');
const sdk = process.env.EMSDK_ROOT ?? engine.web.emscripten;
const binaryen = process.env.BINARYEN_ROOT ?? '/Users/ben/Development/godot-4.8-restoration-20261027/artifacts/binaryen133-sdk6-7d48204';
const helper = process.env.GODOT_EMSCRIPTEN_HELPER ?? '/Users/ben/Development/godot-4.8-restoration-20261027/source/platform/web/emscripten_helpers.py';
const manifestHash = process.env.BINARYEN_MANIFEST_SHA256 ?? '895bb89edd5e5c0f3966810f3962e8c960b5534bf8527301abfbb6f8e89f0bc8';
const python = process.env.SCONS_PYTHON ?? '/opt/homebrew/Cellar/scons/4.9.1/libexec/bin/python';
const cargo = process.env.CARGO ?? resolve(homedir(), '.cargo/bin/cargo');
const workspace = resolve(root, 'live-compile');
const targetDirectory = join(targetDirectoryOf(engine), 'web');
const WASM_NAME = 'live_compile.web.wasm';
const BUILD_TIMEOUT_MS = 30 * 60 * 1000;

const env = {
  ...process.env,
  ...engine.bindingEnvironment(),
  PATH: [dirname(cargo), join(sdk, 'upstream', 'emscripten'), join(sdk, 'node', '24.19.0_64bit', 'bin'), process.env.PATH ?? ''].join(delimiter),
  EM_CONFIG: join(sdk, '.emscripten'),
  CARGO_TARGET_DIR: targetDirectory,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: workspace, env, stdio: 'inherit', timeout: BUILD_TIMEOUT_MS, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message ?? `exit ${result.status}`}`);
  return result.stdout;
}

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
const flags = [
  '-C', 'link-args=-pthread', '-C', 'target-feature=+atomics', '-C', 'link-args=-sSIDE_MODULE=2',
  '-C', 'llvm-args=-enable-emscripten-cxx-exceptions=0', '-Z', 'default-visibility=hidden', '-Z', 'link-native-libraries=no',
  // Bun's crates are built as they come, with their lints reported and not enforced (live-compile/.cargo/config.toml).
  '--cap-lints=warn',
  ...validation.linkFlags.flatMap(flag => ['-C', `link-args=${flag}`]),
];
env.CARGO_ENCODED_RUSTFLAGS = flags.join('\x1f');
delete env.RUSTFLAGS;
console.log(`live-compile Web side module: Emscripten ${sdk}, target ${targetDirectory}`);
run(cargo, ['build', '--locked', '--profile', 'wasm', '-p', 'live_compile_ext', '--features', 'web', '-Zbuild-std=std,panic_abort', '--target', 'wasm32-unknown-emscripten']);
const built = join(targetDirectory, 'wasm32-unknown-emscripten', 'wasm', 'live_compile.wasm');
const bytes = readFileSync(built);
mkdirSync(join(INSTALL_DIRECTORY, 'bin'), { recursive: true });
const staged = join(INSTALL_DIRECTORY, 'bin', `${WASM_NAME}.${process.pid}.tmp`);
copyFileSync(built, staged);
renameSync(staged, join(INSTALL_DIRECTORY, 'bin', WASM_NAME));
writeGdextension();
console.log(`Installed ${WASM_NAME}: ${bytes.length} bytes`);
