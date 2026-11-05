import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, delimiter } from 'node:path';
import { createHash } from 'node:crypto';

const root = import.meta.dirname;
const sdk = '/Users/ben/Development/emsdk-breaka-6.0.12-20261027';
const binaryen = '/Users/ben/Development/godot-4.8-restoration-20261027/artifacts/binaryen133-sdk6-7d48204';
const helper = '/Users/ben/Development/godot-4.8-restoration-20261027/source/platform/web/emscripten_helpers.py';
const manifestHash = '895bb89edd5e5c0f3966810f3962e8c960b5534bf8527301abfbb6f8e89f0bc8';
const cargo = '/Users/ben/.cargo/bin/cargo';
const python = '/opt/homebrew/Cellar/scons/4.9.1/libexec/bin/python';
const toolchain = 'nightly-2026-05-15';
const smokeOnly = process.argv.includes('--smoke-only');
const env = {
  ...process.env,
  PATH: [dirname(cargo), resolve(root, '.venv/bin'), resolve(sdk, 'upstream/emscripten'), resolve(sdk, 'node/24.19.0_64bit/bin'), process.env.PATH ?? ''].join(delimiter),
  EM_CONFIG: resolve(sdk, '.emscripten'),
  CARGO_TARGET_DIR: resolve(root, 'target/web'),
};
const BUILD_TIMEOUT_MS = 10 * 60 * 1000;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd:root, env, stdio:'inherit', timeout:BUILD_TIMEOUT_MS, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error?.message ?? result.status}`);
  return result.stdout;
}

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
const validated = JSON.parse(run(python, ['-c', validate, helper, binaryen, manifestHash], {
  stdio:['ignore','pipe','inherit'], encoding:'utf8',
}));
env.EM_BINARYEN_ROOT = validated.binaryen;
env.CARGO_ENCODED_RUSTFLAGS = [
  '-C', 'link-args=-pthread', '-C', 'target-feature=+atomics',
  '-C', 'link-args=-sSIDE_MODULE=2',
  '-C', 'llvm-args=-enable-emscripten-cxx-exceptions=0',
  '-Z', 'default-visibility=hidden', '-Z', 'link-native-libraries=no',
  '-Z', 'emscripten-wasm-eh=false',
  ...validated.linkFlags.flatMap(flag => ['-C', `link-args=${flag}`]),
].join('\x1f');
delete env.RUSTFLAGS;
if (!smokeOnly) run(cargo, [`+${toolchain}`, 'build', '--release', '--locked', '--lib', '-Zbuild-std', '--target', 'wasm32-unknown-emscripten']);
const output = resolve(root, 'target/web/wasm32-unknown-emscripten/release/blitz_transition_probe.wasm');
const bytes = readFileSync(output);
const module = new WebAssembly.Module(bytes);
const metadata = WebAssembly.Module.customSections(module, 'breaka.lazy-table');
if (metadata.length !== 1) throw new Error('Expected one lazy-table metadata section');
const abi = JSON.parse(new TextDecoder().decode(metadata[0]));
if (abi.version !== 2 || abi.role !== 'side') throw new Error('Expected engine-compatible lazy-table ABI v2 side module');
const report = { output, bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex'), abi,
  exports:WebAssembly.Module.exports(module), imports:WebAssembly.Module.imports(module) };
mkdirSync(resolve(root, 'artifacts'), {recursive:true});
writeFileSync(resolve(root, 'artifacts/web-build.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({output, bytes:bytes.length, sha256:report.sha256}));

// A separate minimal Emscripten host exercises side-module loading. This is a
// linker/runtime smoke, not a claim of Godot integration or rendered UI parity.
const mainValidation = JSON.parse(run(python, ['-c', validate.replace("role='side'", "role='main'"), helper, binaryen, manifestHash], {
  stdio:['ignore','pipe','inherit'], encoding:'utf8',
}));
const INITIAL_MEMORY_BYTES = 64 * 1024 * 1024;
run(resolve(sdk, 'upstream/emscripten/emcc'), [
  'harness.c', '-o', 'artifacts/harness.js', '-O2', '-pthread',
  '-sMAIN_MODULE=1', '-sALLOW_MEMORY_GROWTH=1', `-sINITIAL_MEMORY=${INITIAL_MEMORY_BYTES}`,
  '-sALLOW_TABLE_GROWTH=1',
  '-sENVIRONMENT=node,web,worker', '-sEXIT_RUNTIME=1', '-sASSERTIONS=2',
  '--js-library', resolve(dirname(helper), 'js/libs/library_godot_lazy_table.js'),
  resolve(dirname(helper), 'lazy_function_table.cpp'),
  '--preload-file', `${output}@/blitz_transition_probe.wasm`,
  ...mainValidation.linkFlags,
], {
  // The dlopen target is only known at runtime. Emscripten's documented remedy
  // supplies its standard-library imports, including Rust's C++ EH type-info.
  env: { ...env, EMCC_FORCE_STDLIBS: '1' },
});
