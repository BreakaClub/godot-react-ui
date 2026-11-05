import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const supportedArgs = new Set(['--wasm-only', '--export-only', '--release']);
for (const arg of args) if (!supportedArgs.has(arg)) throw new Error(`Unknown argument: ${arg}`);
if (args.has('--wasm-only') && args.has('--export-only')) throw new Error('Choose one partial build mode.');

// These are the same SDK, compiler pass and engine templates used by Breaka's
// current threaded Web build. A plain eager side module cannot call a lazy engine.
const sdk = process.env.EMSDK_ROOT ?? '/Users/ben/Development/emsdk-breaka-6.0.12-20261027';
const binaryen = process.env.BINARYEN_ROOT ?? '/Users/ben/Development/godot-4.8-restoration-20261027/artifacts/binaryen133-sdk6-7d48204';
const helper = process.env.GODOT_EMSCRIPTEN_HELPER ?? '/Users/ben/Development/godot-4.8-restoration-20261027/source/platform/web/emscripten_helpers.py';
const manifestHash = process.env.BINARYEN_MANIFEST_SHA256 ?? '895bb89edd5e5c0f3966810f3962e8c960b5534bf8527301abfbb6f8e89f0bc8';
const cargo = process.env.CARGO ?? '/Users/ben/.cargo/bin/cargo';
const python = process.env.SCONS_PYTHON ?? '/opt/homebrew/Cellar/scons/4.9.1/libexec/bin/python';
// Rust 1.98 removed the JS-EH switch required by gdext 0.5.5's Web ABI.
// Pin the last compatible generation rather than changing panic semantics.
const toolchain = process.env.WEB_RUST_TOOLCHAIN ?? 'nightly-2026-05-15';
const godot = process.env.GODOT ?? '/Applications/Godot48.app/Contents/MacOS/Godot';
const targetDirectory = join(root, 'target', 'web');
const wasmPath = join(root, 'demo', 'addons', 'godot-react-ui', 'bin', 'godot_react_ui.web.wasm');
const buildTimeoutMs = 15 * 60 * 1000;
const env = {
  ...process.env,
  PATH: [dirname(cargo), join(sdk, 'upstream', 'emscripten'), join(sdk, 'node', '24.19.0_64bit', 'bin'), process.env.PATH ?? ''].join(delimiter),
  EM_CONFIG: join(sdk, '.emscripten'),
  CARGO_TARGET_DIR: targetDirectory,
};

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { cwd: root, env, stdio: 'inherit', timeout: buildTimeoutMs, ...options });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message ?? `exit ${result.status}`}`);
  }
  return result.stdout;
}

function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

function tableMetadata(bytes, label) {
  const module = new WebAssembly.Module(bytes);
  const sections = WebAssembly.Module.customSections(module, 'breaka.lazy-table');
  if (sections.length !== 1) throw new Error(`${label} must have exactly one lazy-table metadata section.`);
  const metadata = JSON.parse(new TextDecoder().decode(sections[0]));
  if (metadata.version !== 2 || !['main', 'side'].includes(metadata.role)) {
    throw new Error(`${label} must use Breaka lazy-table ABI v2.`);
  }
  return metadata;
}

if (!args.has('--export-only')) {
  // Reuse the engine's authoritative capability and source-hash checks. This
  // adapts its small SCons environment interface; it does not transform binaries.
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
  // godot-rust's upstream Web contract requires these nightly flags and a rebuilt
  // standard library. Hidden symbols prevent cross-extension static collisions.
  const flags = [
    '-C', 'link-args=-pthread',
    '-C', 'target-feature=+atomics',
    '-C', 'link-args=-sSIDE_MODULE=2',
    '-C', 'llvm-args=-enable-emscripten-cxx-exceptions=0',
    '-Z', 'default-visibility=hidden',
    '-Z', 'link-native-libraries=no',
    '-Z', 'emscripten-wasm-eh=false',
    ...validation.linkFlags.flatMap(flag => ['-C', `link-args=${flag}`]),
  ];
  env.CARGO_ENCODED_RUSTFLAGS = flags.join('\x1f');
  delete env.RUSTFLAGS;
  run(cargo, [`+${toolchain}`, 'build', '--locked', '--release', '--lib', '--features', 'web', '-Zbuild-std', '--target', 'wasm32-unknown-emscripten']);
  const compiled = join(targetDirectory, 'wasm32-unknown-emscripten', 'release', 'godot_react_ui.wasm');
  const wasm = readFileSync(compiled);
  tableMetadata(wasm, 'React UI extension');
  mkdirSync(dirname(wasmPath), { recursive: true });
  copyFileSync(compiled, wasmPath);
  console.log(`Web extension: ${wasm.length} bytes, SHA-256 ${hash(wasm)}`);
}

if (!args.has('--wasm-only')) {
  if (!existsSync(wasmPath)) throw new Error('Build the Web extension first.');
  // The authoritative typecheck is part of build; export never trusts a watcher.
  run('pnpm', ['build']);
  const mode = args.has('--release') ? 'release' : 'debug';
  const preset = readFileSync(join(root, 'demo', 'export_presets.cfg'), 'utf8');
  const template = preset.match(new RegExp(`custom_template/${mode}="([^"]+)"`))?.[1];
  if (!template) throw new Error(`Missing ${mode} template in export_presets.cfg`);
  const modules = ['godot.wasm', 'godot.side.wasm'].map(name => {
    const bytes = run('unzip', ['-p', template, name], { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 128 * 1024 * 1024 });
    const metadata = tableMetadata(bytes, name);
    return { name, sha256: hash(bytes), metadata };
  });
  const extensionBytes = readFileSync(wasmPath);
  modules.push({ name: 'godot_react_ui.web.wasm', sha256: hash(extensionBytes), metadata: tableMetadata(extensionBytes, 'React UI extension') });
  const output = join(root, 'artifacts', `web-${mode}`);
  mkdirSync(output, { recursive: true });
  run(godot, ['--headless', '--audio-driver', 'Dummy', '--path', join(root, 'demo'), `--export-${mode}`, 'Web', join(output, 'index.html')]);
  const copiedExtension = join(output, 'godot_react_ui.web.wasm');
  if (!existsSync(copiedExtension) || hash(readFileSync(copiedExtension)) !== hash(extensionBytes)) {
    throw new Error('The exported extension differs from the qualified build.');
  }
  writeFileSync(join(output, 'build-receipt.json'), JSON.stringify({
    template, templateSha256: hash(readFileSync(template)), mode, toolchain, sdk,
    binaryenManifestSha256: manifestHash, modules,
    api: ['extension_api.json', 'gdextension_interface.json'].map(name => ({
      name, sha256: hash(readFileSync(join(root, 'native', 'api', name))),
    })),
    files: readdirSync(output).filter(name => name !== 'build-receipt.json' && statSync(join(output, name)).isFile()).map(name => ({
      name, bytes: statSync(join(output, name)).size, sha256: hash(readFileSync(join(output, name))),
    })),
  }, null, 2) + '\n');
  console.log(`Exported ${output}. Serve with node scripts/serve-web.mjs --${mode}.`);
}
