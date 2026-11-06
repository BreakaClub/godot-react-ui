import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argsWithoutEngine, selectEngine } from './engine.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The engine profile (`--engine=stock` / `GODOT_REACT_ENGINE=stock`; scripts/engine.mjs) decides the Emscripten SDK, the
// engine templates, the Godot editor that exports, whether the lazy function-table pass applies and where the
// output goes. `breaka` is the default.
const engine = selectEngine();
const web = engine.web;
const args = new Set(argsWithoutEngine(process.argv.slice(2)));
const supportedArgs = new Set(['--wasm-only', '--export-only', '--release', '--probe']);
for (const arg of args) if (!supportedArgs.has(arg)) throw new Error(`Unknown argument: ${arg}`);
if (args.has('--wasm-only') && args.has('--export-only')) throw new Error('Choose one partial build mode.');

// `breaka`: the SDK, compiler pass and engine templates of Breaka's current threaded Web build. A plain eager side
// module cannot call a lazy engine. `stock`: Emscripten 4.0.11 from the stock tree, whose own Binaryen links an
// ordinary side module for the stock dlink templates; none of the lazy-table machinery below applies.
const lazyTable = web.lazyFunctionTable;
const sdk = process.env.EMSDK_ROOT ?? web.emscripten;
const binaryen = process.env.BINARYEN_ROOT ?? '/Users/ben/Development/godot-4.8-restoration-20261027/artifacts/binaryen133-sdk6-7d48204';
const helper = process.env.GODOT_EMSCRIPTEN_HELPER ?? '/Users/ben/Development/godot-4.8-restoration-20261027/source/platform/web/emscripten_helpers.py';
const manifestHash = process.env.BINARYEN_MANIFEST_SHA256 ?? '895bb89edd5e5c0f3966810f3962e8c960b5534bf8527301abfbb6f8e89f0bc8';
const cargo = process.env.CARGO ?? '/Users/ben/.cargo/bin/cargo';
const python = process.env.SCONS_PYTHON ?? '/opt/homebrew/Cellar/scons/4.9.1/libexec/bin/python';
// Rust 1.98 removed the JS-EH switch required by gdext 0.5.5's Web ABI.
// Pin the last compatible generation rather than changing panic semantics.
const toolchain = process.env.WEB_RUST_TOOLCHAIN ?? web.nightly;
const godot = engine.godot;
// `--probe` builds the Phase F0 evidence probe (cargo feature `probe`) into its own target directory and
// installs it over the default side module. Rebuild without it afterwards: the probe must never ship.
const probe = args.has('--probe');
const targetDirectory = probe ? engine.targets.webProbe : engine.targets.web;
const wasmPath = join(root, 'demo', 'addons', 'godot-react-ui', 'bin', 'godot_react_ui.web.wasm');
const buildTimeoutMs = 15 * 60 * 1000;
const env = {
  ...process.env,
  ...engine.bindingEnvironment(),
  PATH: [dirname(cargo), join(sdk, 'upstream', 'emscripten'), join(sdk, 'node', '24.19.0_64bit', 'bin'), process.env.PATH ?? ''].join(delimiter),
  EM_CONFIG: join(sdk, '.emscripten'),
  CARGO_TARGET_DIR: targetDirectory,
};
// Another SDK's Binaryen must not leak into a build that has none of its own to override.
if (!lazyTable) delete env.EM_BINARYEN_ROOT;

/**
 * The `custom_template/<mode>` path of the export preset named `presetName` in `export_presets.cfg`. A preset's
 * options are the `[preset.N.options]` section that follows its `[preset.N]` section.
 */
function presetTemplate(presets, presetName, mode) {
  const sections = presets.split(/^\[(preset\.\d+(?:\.options)?)\]$/mu);
  for (let index = 1; index < sections.length; index += 2) {
    if (sections[index].endsWith('.options') || sections[index + 1].match(/^name="([^"]*)"$/mu)?.[1] !== presetName) continue;
    const options = sections[sections.indexOf(`${sections[index]}.options`) + 1] ?? '';
    return options.match(new RegExp(`^custom_template/${mode}="([^"]+)"$`, 'mu'))?.[1];
  }
  throw new Error(`No export preset named "${presetName}" in export_presets.cfg`);
}

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
  ];
  if (lazyTable) {
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
    flags.push(...validation.linkFlags.flatMap(flag => ['-C', `link-args=${flag}`]));
  }
  env.CARGO_ENCODED_RUSTFLAGS = flags.join('\x1f');
  delete env.RUSTFLAGS;
  console.log(`Engine profile ${engine.name}: ${engine.description}; Emscripten ${sdk}, ${toolchain}, target ${targetDirectory}`);
  run(cargo, [`+${toolchain}`, 'build', '--locked', '--release', '--lib', '--features', probe ? 'web,probe' : 'web', '-Zbuild-std', '--target', 'wasm32-unknown-emscripten']);
  const compiled = join(targetDirectory, 'wasm32-unknown-emscripten', 'release', 'godot_react_ui.wasm');
  const wasm = readFileSync(compiled);
  if (lazyTable) tableMetadata(wasm, 'React UI extension');
  mkdirSync(dirname(wasmPath), { recursive: true });
  copyFileSync(compiled, wasmPath);
  engine.recordInstalledWasm(probe);
  console.log(`Web extension (${engine.name} profile${probe ? ', PROBE BUILD, replace with a default build' : ''}): ${wasm.length} bytes, SHA-256 ${hash(wasm)}`);
}

if (!args.has('--wasm-only')) {
  // The export must not package the other engine's side module, nor a probe build as the shipping one.
  engine.requireInstalledWasm({ probe });
  const exporterVersion = engine.verifiedVersion();
  // The authoritative typecheck is part of build; export never trusts a watcher.
  run('pnpm', ['build']);
  const mode = args.has('--release') ? 'release' : 'debug';
  const template = presetTemplate(readFileSync(join(root, 'demo', 'export_presets.cfg'), 'utf8'), web.presetName, mode);
  if (!template) throw new Error(`Missing ${mode} template in the "${web.presetName}" export preset`);
  const modules = ['godot.wasm', 'godot.side.wasm'].map(name => {
    const bytes = run('unzip', ['-p', template, name], { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 128 * 1024 * 1024 });
    // Breaka's lazy function-table ABI is recorded per module; stock modules have none, and say so by omission.
    return { name, sha256: hash(bytes), ...(lazyTable ? { metadata: tableMetadata(bytes, name) } : {}) };
  });
  const extensionBytes = readFileSync(wasmPath);
  modules.push({ name: 'godot_react_ui.web.wasm', sha256: hash(extensionBytes), ...(lazyTable ? { metadata: tableMetadata(extensionBytes, 'React UI extension') } : {}) });
  const output = engine.artifactPath(`web-${mode}`);
  mkdirSync(output, { recursive: true });
  run(godot, ['--headless', '--audio-driver', 'Dummy', '--path', join(root, 'demo'), `--export-${mode}`, web.presetName, join(output, 'index.html')]);
  const copiedExtension = join(output, 'godot_react_ui.web.wasm');
  if (!existsSync(copiedExtension) || hash(readFileSync(copiedExtension)) !== hash(extensionBytes)) {
    throw new Error('The exported extension differs from the qualified build.');
  }
  writeFileSync(join(output, 'build-receipt.json'), JSON.stringify({
    engine: engine.name, exporter: { godot, version: exporterVersion },
    template, templateSha256: hash(readFileSync(template)), mode, toolchain, sdk,
    emscripten: readFileSync(join(sdk, 'upstream', 'emscripten', 'emscripten-version.txt'), 'utf8').trim().replaceAll('"', ''),
    ...(lazyTable ? { binaryenManifestSha256: manifestHash } : {}), modules,
    api: ['extension_api.json', 'gdextension_interface.json'].map(name => {
      const path = join(engine.apiDirectory ?? join(root, 'native', 'api'), name);
      return { name, path, sha256: hash(readFileSync(path)) };
    }),
    files: readdirSync(output).filter(name => name !== 'build-receipt.json' && statSync(join(output, name)).isFile()).map(name => ({
      name, bytes: statSync(join(output, name)).size, sha256: hash(readFileSync(join(output, name))),
    })),
  }, null, 2) + '\n');
  console.log(`Exported ${output}. Serve with ${engine.name === 'breaka' ? 'node scripts/serve-web.mjs' : `node scripts/serve-web.mjs --engine=${engine.name}`}${mode === 'release' ? ' --release' : ''}.`);
}
