import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { build } from 'esbuild';
import { rejectUnknownArguments } from './arguments.mjs';
import { scrubOpenScripts } from './editor-session.mjs';
import { selectEngine } from './engine.mjs';
import { NATIVE_INSTALL_DIRECTORY, NATIVE_INSTALLED_LIBRARY } from './native-binding.mjs';
import { describePass, runNativeVerifier, summarizeRuns } from './native-run.mjs';
import { withoutInvalidExportDeclaration } from './typings.mjs';

// The package in a project of either naming.
//
// GodotJS gives Godot's methods the names Godot has for them, or camel-cased ones in a project with camel-case bindings
// (`runtime/core/camel_case_bindings_enabled`). The demo has them on, so every other verifier runs the library with camel-cased names only. This one
// runs the package as it is published (`dist`) in a project that is not the demo: `casing-probe/`, written against `godot.lib.api`, bundled once, and
// run with the setting off and then on. It mounts, clicks, registers a texture, a material and a font face, reads the diagnostics and unmounts, and
// times a root's methods called directly, as the renderer calls them, and through `godot.lib.api`'s proxy.
//
// It is also the type check of that project: `casing-probe/probe.ts` is checked against the package's declarations and the declarations the editor
// writes for a project without camel-case bindings.
//
// Headless, with no window: the probe sends its own input events and reads no pixels.
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
rejectUnknownArguments(process.argv.slice(2));

const RUN_DEADLINE_MS = 120_000;
const GENERATE_TIMEOUT_MS = 120_000;
const RESOLUTION = '800x600';
const SUCCESS_MARKER = 'GODOT_REACT_CASING_VERIFY_PASSED';
const SOURCE = resolve(root, 'casing-probe');
const WORK = resolve(root, 'target/casing');
const STAGE = resolve(WORK, 'project');
const TYPINGS = resolve(WORK, 'typings');
const TYPINGS_RECORD = resolve(WORK, 'typings.json');
const EXTENSION = 'addons/godot-react-ui/react_ui.gdextension';

/** The staged project's settings: the smallest project the library runs in, with the one setting this verifier is about. */
function projectSettings(camelCase) {
  return [
    'config_version=5',
    '',
    '[application]',
    '',
    'config/name="godot-react-ui casing probe"',
    'run/main_scene="res://main.tscn"',
    'config/features=PackedStringArray("4.7", "GL Compatibility")',
    '',
    '[rendering]',
    '',
    'renderer/rendering_method="gl_compatibility"',
    'renderer/rendering_method.mobile="gl_compatibility"',
    '',
    '[GodotJS]',
    '',
    `runtime/core/camel_case_bindings_enabled=${camelCase}`,
    '',
  ].join('\n');
}

/**
 * The project the probe runs in, outside the tracked tree. The library is not copied: the stage's `bin` is a link to the installed one, so the
 * library a run loads is the one the freshness check looked at.
 */
function stageProject() {
  mkdirSync(resolve(STAGE, '.godot'), { recursive: true });
  mkdirSync(resolve(STAGE, 'addons/godot-react-ui'), { recursive: true });
  for (const name of ['main.tscn', 'probe.ts']) cpSync(resolve(SOURCE, name), resolve(STAGE, name));
  cpSync(resolve(root, 'demo/fonts/OpenSans-Variable.ttf'), resolve(STAGE, 'OpenSans-Variable.ttf'));
  cpSync(resolve(root, 'demo', EXTENSION), resolve(STAGE, EXTENSION));
  const bin = resolve(STAGE, 'addons/godot-react-ui/bin');
  const existing = lstatSync(bin, { throwIfNoEntry: false });
  if (existing !== undefined) {
    if (!existing.isSymbolicLink()) throw new Error(`${bin} is not the link this script makes; remove ${relative(root, WORK)} and run again`);
    // The link itself: nothing is removed through it.
    unlinkSync(bin);
  }
  symlinkSync(NATIVE_INSTALL_DIRECTORY, bin, 'dir');
  // What the editor writes when it finds an extension; a project that was never opened in one has to be told.
  writeFileSync(resolve(STAGE, '.godot/extension_list.cfg'), `res://${EXTENSION}\n`);
}

/** What the declarations of the camel-case-off project depend on: the editor that writes them and the library whose classes they list. */
function typingsSource(godotVersion) {
  return { engine: engine.name, godotVersion, librarySha256: createHash('sha256').update(readFileSync(NATIVE_INSTALLED_LIBRARY)).digest('hex') };
}

/** Have the editor write the declarations of the staged project with camel-case bindings off, unless the ones kept came from this editor and library. */
function ensureGodotNamedTypings(godotVersion) {
  const current = typingsSource(godotVersion);
  if (existsSync(TYPINGS_RECORD) && existsSync(TYPINGS)) {
    const recorded = JSON.parse(readFileSync(TYPINGS_RECORD, 'utf8'));
    if (Object.keys(current).every(key => recorded[key] === current[key])) return;
  }
  writeFileSync(resolve(STAGE, 'project.godot'), projectSettings(false));
  rmSync(resolve(STAGE, 'typings'), { recursive: true, force: true });
  // The stage keeps the layout an earlier editor pass saved, and Godot's script editor rewrites a TypeScript file it has open.
  scrubOpenScripts(STAGE);
  const result = spawnSync(engine.godot, ['--headless', '--audio-driver', 'Dummy', '--editor', '--generate-types', '--path', STAGE], {
    cwd: root, stdio: 'inherit', timeout: GENERATE_TIMEOUT_MS,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`The editor failed generating types for ${relative(root, STAGE)} (exit ${result.status})`);
  const generated = resolve(STAGE, 'typings');
  if (!existsSync(generated)) throw new Error(`The editor wrote no typings in ${generated}`);
  rmSync(TYPINGS, { recursive: true, force: true });
  cpSync(generated, TYPINGS, { recursive: true });
  // The stock editor's declarations need the one repair the stock typecheck makes (scripts/typings.mjs); Breaka's are left as they are.
  const annotations = resolve(TYPINGS, 'jsb.runtime.bundle.d.ts');
  writeFileSync(annotations, withoutInvalidExportDeclaration(readFileSync(annotations, 'utf8')));
  writeFileSync(TYPINGS_RECORD, `${JSON.stringify(current, null, 2)}\n`);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// The staged project has the UI library and nothing else, so the live-compile extension the demo loads is not this run's to check.
const godotVersion = engine.prepareNative({ liveCompile: false });
// The package the probe consumes: `dist` and its declarations.
run('pnpm', ['build']);
stageProject();
ensureGodotNamedTypings(godotVersion);
run(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', resolve(SOURCE, 'tsconfig.json')]);
// One bundle for both runs, with the options the demo's bundles are built with (`shared` in scripts/build.mjs): `godot` and `godot.lib.api` stay
// the project's own modules, and `godot-react-ui` is the published file, not the sources.
await build({
  absWorkingDir: root,
  bundle: true,
  platform: 'neutral',
  target: 'es2022',
  format: 'cjs',
  external: ['godot', 'godot.lib.api', 'godot.annotations', 'godot-jsb'],
  conditions: ['browser'],
  mainFields: ['module', 'main'],
  define: { 'process.env.NODE_ENV': '"production"', 'self': 'globalThis' },
  alias: { 'godot-react-ui': resolve(root, 'dist/index.js') },
  entryPoints: [resolve(SOURCE, 'probe.ts')],
  // Where GodotJS looks for the compiled `res://probe.ts`.
  outfile: resolve(STAGE, '.godot/GodotJS/probe.js'),
});

const results = [];
const timings = [];
for (const camelCase of [false, true]) {
  const naming = camelCase ? 'camel-case bindings' : 'Godot\'s names';
  const output = engine.artifactPath('native-casing', camelCase ? 'camel-case' : 'godot-names');
  writeFileSync(resolve(STAGE, 'project.godot'), projectSettings(camelCase));
  results.push(await runNativeVerifier({
    godot: engine.godot, project: STAGE, output, name: `casing (${naming})`, resolution: RESOLUTION,
    leading: ['--headless'], scriptArgs: [], successMarker: SUCCESS_MARKER, deadlineMs: RUN_DEADLINE_MS, retry: false,
    beforeLaunch: () => engine.requireInstalledBuilds({ liveCompile: false }),
    errorPattern: /ERROR:|Uncaught|\[panic /u,
  }));
  const { payload } = describePass(readFileSync(resolve(output, 'run.log'), 'utf8'), SUCCESS_MARKER);
  // A run that passed in the other naming would say nothing about this one: the root the engine made has to have the names the setting asks for,
  // and the renderer has to call that root itself exactly where its names are the camel-cased ones.
  if (payload?.rootHasCamelCasedNames !== camelCase) {
    throw new Error(`casing (${naming}): the project was set to camelCase=${camelCase}, but its root says rootHasCamelCasedNames=${payload?.rootHasCamelCasedNames}; see ${output}/run.log`);
  }
  if (payload.rendererCallsTheRootItself !== camelCase) {
    throw new Error(`casing (${naming}): rendererCallsTheRootItself=${payload.rendererCallsTheRootItself}, expected ${camelCase}; see ${output}/run.log`);
  }
  timings.push(`  ${naming}: ${payload.checks} checks; ns per call: ${Object.entries(payload.nanosecondsPerCall ?? {}).map(([what, ns]) => `${what} ${ns}`).join(', ')}`);
}
// Reported, not asserted: the numbers are one machine's, and say what the proxy costs where a caller chooses it.
console.log(`verify-casing timings:\n${timings.join('\n')}`);
console.log(`verify-casing summary:\n${summarizeRuns(results)}`);
