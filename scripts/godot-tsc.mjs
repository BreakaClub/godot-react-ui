// The code editor's TypeScript checker and transpiler is the godot-tsc package, a dev dependency from npm.
// `godot-tsc setup --project-dir demo` installs its addon at `demo/addons/godot-tsc/`, replacing the directory whole, and every demo run loads
// it from there. This file is what the scripts know of that install: whether a native run may load it (`engine.prepareNative` for every run,
// `scripts/verify.mjs` for the `live-compile` section, which needs it), and what a profile's Web export carries of it (`scripts/build-web.mjs`).
//
// The package says what each of its binaries is in `addon/godot-tsc/build.json`: the SHA-256 of every binary, the Godot API dumps the native library
// is bound to and, for each Web side module, the engine profile it is linked for and the dumps it is bound to. So an install is checked against that
// record, not against sources: its build.json must be the package's, each binary must hash as recorded, and the bindings must be the ones this
// repository builds against (`NATIVE_BINDING_API` natively, each profile's own dumps on the Web). Like the UI library, the native library is one
// build loaded by both engine profiles; a Web side module is per profile.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NATIVE_BINDING_API } from './native-binding.mjs';

// `import.meta.url`, not `import.meta.dirname`: engine.mjs imports this file, and the unit tests load that through tsx's CommonJS bridge.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ADDON_NAME = 'godot-tsc';
const RECORD_NAME = 'build.json';
const MANIFEST_NAME = 'godot_tsc.gdextension';
export const PACKAGE_DIRECTORY = resolve(root, 'node_modules', ADDON_NAME);
/** The addon as the package ships it, which `godot-tsc setup` copies. */
export const PACKAGED_ADDON = resolve(PACKAGE_DIRECTORY, 'addon', ADDON_NAME);
export const INSTALL_DIRECTORY = resolve(root, 'demo/addons', ADDON_NAME);
export const INSTALLED_RECORD = resolve(INSTALL_DIRECTORY, RECORD_NAME);
export const GDEXTENSION_FILE = resolve(INSTALL_DIRECTORY, MANIFEST_NAME);
/** The command that installs the package's addon into the demo, or replaces an install that is not the package's current one. */
export const FIX = `pnpm exec ${ADDON_NAME} setup --project-dir demo --force`;
/** The environment variable that names a built `godot-tsc-cli`. */
export const CLI_VARIABLE = 'GODOT_TSC_CLI';
/** What to do to give the tests and `scripts/live-compile-agreement.mjs` the process. */
export const CLI_FIX = `set ${CLI_VARIABLE} to a \`godot-tsc-cli\` built in a checkout of godot-tsc at the dependency's version (\`pnpm build:native --cli\` there writes target/release/godot-tsc-cli)`;

/**
 * The package's native test process, which speaks the extension's requests on stdin and stdout (the tests and `scripts/live-compile-agreement.mjs`
 * drive it). The npm package does not ship it: a checkout of godot-tsc builds it, and `GODOT_TSC_CLI` names the file. Undefined when the variable is
 * not set. A variable that names no file throws: a mistyped path must not read as "not given" and skip the tests that need it.
 */
export function godotTscCli(env = process.env) {
  const given = env[CLI_VARIABLE];
  if (given === undefined || given === '') return undefined;
  const path = resolve(given);
  if (!existsSync(path)) throw new Error(`${CLI_VARIABLE} names ${path}, which does not exist.`);
  return path;
}
/** Every file name a Web side module of the extension has been exported under: godot-tsc's per profile, and the in-repo extension's before it. */
const WEB_MODULE_PATTERN = /^(?:godot_tsc\.web\.[a-z]+|live_compile\.web(?:\.[a-z]+)?)\.wasm$/u;
const WEB_LIBRARY_LINE = /^web\.[a-z]+\.threads\.wasm32 = .*\n/gmu;

/** Bun's bundle of TypeScript's lib files, which the package ships (`scripts/live-compile-project.mjs` reads it). */
export function typescriptLibBundle() {
  return createRequire(import.meta.url).resolve(`${ADDON_NAME}/typescript_libs.bin`);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBinding(value) {
  return isRecord(value) && typeof value.extensionApiSha256 === 'string' && typeof value.gdextensionInterfaceSha256 === 'string';
}

/**
 * The package's build record, checked for the shape this file reads: `version`, `nativeApi` (`version` and the binding), `webModules` (each file's
 * `profile` and `binding`) and `binaries` (each file's SHA-256, every Web module among them). Anything else is not a godot-tsc build record, and throws.
 */
export function parseBuildRecord(text, source) {
  const record = JSON.parse(text);
  const malformed = what => new Error(`${source} is not a godot-tsc build record: ${what}`);
  if (!isRecord(record) || typeof record.version !== 'string') throw malformed('it has no version');
  if (!isRecord(record.nativeApi) || typeof record.nativeApi.version !== 'string' || !isBinding(record.nativeApi)) throw malformed('its nativeApi has no version and binding');
  if (!isRecord(record.binaries) || !Object.values(record.binaries).every(hash => typeof hash === 'string')) throw malformed('its binaries are not file hashes');
  if (!isRecord(record.webModules)) throw malformed('it has no webModules');
  const webModules = {};
  for (const [name, module] of Object.entries(record.webModules)) {
    if (!isRecord(module) || typeof module.profile !== 'string' || !isBinding(module.binding)) throw malformed(`its ${name} has no profile and binding`);
    if (record.binaries[name] === undefined) throw malformed(`its binaries do not list the Web module ${name}`);
    webModules[name] = { profile: module.profile, binding: module.binding };
  }
  return { version: record.version, nativeApi: record.nativeApi, webModules, binaries: record.binaries };
}

/** The Godot dump pair's hashes, in the build record's terms. */
function bindingOf(extensionApi, gdextensionInterface) {
  return { extensionApiSha256: sha256(extensionApi), gdextensionInterfaceSha256: sha256(gdextensionInterface) };
}

function bindingDifference(recorded, expected) {
  if (recorded.extensionApiSha256 !== expected.extensionApiSha256) return `extension_api.json ${recorded.extensionApiSha256.slice(0, 12)}, not ${expected.extensionApiSha256.slice(0, 12)}`;
  if (recorded.gdextensionInterfaceSha256 !== expected.gdextensionInterfaceSha256) {
    return `gdextension_interface.json ${recorded.gdextensionInterfaceSha256.slice(0, 12)}, not ${expected.gdextensionInterfaceSha256.slice(0, 12)}`;
  }
  return undefined;
}

/** Whether anything of the addon is installed: Godot loads whatever the manifest names, so a manifest alone is an installation too. */
export function isInstalled() {
  return existsSync(GDEXTENSION_FILE) || existsSync(INSTALLED_RECORD);
}

/**
 * Why the installed addon is not the package's current build bound to the API this repository's native builds are bound to, or undefined when it is.
 * The installed build record must be the package's, byte for byte (so a package rebuilt or updated since the install is caught), every binary it lists
 * must hash as listed (so a binary replaced after the install is), and the native library must be bound to `NATIVE_BINDING_API`: godot-rust fails late
 * (`compiled against newer Godot version`) on a build bound to a newer API than the engine's.
 */
function installProblem() {
  const packagedRecord = resolve(PACKAGED_ADDON, RECORD_NAME);
  if (!existsSync(packagedRecord)) {
    return `The godot-tsc package has no built addon (${relative(root, packagedRecord)} is missing): run \`pnpm install\`.`;
  }
  if (!existsSync(INSTALLED_RECORD)) return `${relative(root, INSTALL_DIRECTORY)} has no ${RECORD_NAME}, so it is not an install of the godot-tsc package. Run \`${FIX}\` first.`;
  // A run that hides the manifest (`withoutGodotTscManifest`) and was killed leaves it as `.hidden`; the next such run puts it back.
  if (!existsSync(GDEXTENSION_FILE)) return `The installed godot-tsc addon has no ${MANIFEST_NAME}, so Godot does not load it. Run \`${FIX}\` first.`;
  const installedText = readFileSync(INSTALLED_RECORD, 'utf8');
  if (installedText !== readFileSync(packagedRecord, 'utf8')) {
    return `The installed godot-tsc addon is not the package's current build: ${relative(root, INSTALLED_RECORD)} differs from ${relative(root, packagedRecord)}. Run \`${FIX}\` first.`;
  }
  const record = parseBuildRecord(installedText, relative(root, INSTALLED_RECORD));
  for (const [name, expected] of Object.entries(record.binaries)) {
    const file = resolve(INSTALL_DIRECTORY, 'bin', name);
    if (!existsSync(file)) return `The installed godot-tsc addon has no bin/${name}, which its build record lists. Run \`${FIX}\` first.`;
    if (sha256(file) !== expected) return `The installed godot-tsc bin/${name} is not the file its build record lists. Run \`${FIX}\` first.`;
  }
  if (!Object.keys(record.binaries).some(name => record.webModules[name] === undefined)) return `The godot-tsc package (${record.version}) ships no native library.`;
  if (record.nativeApi.version !== NATIVE_BINDING_API.version) {
    return `The installed godot-tsc library is bound to Godot API ${record.nativeApi.version}, not ${NATIVE_BINDING_API.version}, the API this repository's native builds are bound to (scripts/native-binding.mjs).`;
  }
  const difference = bindingDifference(record.nativeApi, bindingOf(NATIVE_BINDING_API.dumps.extensionApi, NATIVE_BINDING_API.dumps.gdextensionInterface));
  if (difference !== undefined) return `The installed godot-tsc library is bound to other Godot ${record.nativeApi.version} dumps than ${relative(root, dirname(NATIVE_BINDING_API.dumps.extensionApi))}: ${difference}.`;
  return undefined;
}

/** The installed build record, once `installProblem` has passed it. */
function installedRecord() {
  return parseBuildRecord(readFileSync(INSTALLED_RECORD, 'utf8'), relative(root, INSTALLED_RECORD));
}

/**
 * Why a native run must not load the installed addon, or undefined when it may. A demo run loads the addon whenever its manifest is installed,
 * whether or not the section uses it, so an installed one must be the package's current build. The profile does not enter into it. With `required`
 * it must be installed too (the `live-compile` section); without, none installed is fine: nothing loads, and the code editor shows its read-only panel.
 */
export function godotTscRefusal({ required = false } = {}) {
  if (!required && !isInstalled()) return undefined;
  if (required && !isInstalled()) return `The godot-tsc addon is not installed in the demo. Run \`${FIX}\` first.`;
  return installProblem();
}

/** Throws unless the package's current addon is installed in the demo and bound to `NATIVE_BINDING_API`; the message says what fixes it. */
export function requireGodotTsc() {
  const refusal = godotTscRefusal({ required: true });
  if (refusal !== undefined) throw new Error(refusal);
}

// ---- The Web side module: per profile ------------------------------------------------------------------------------------------------------------------
//
// A side module is linked with the Emscripten SDK of the engine whose templates load it (6.0.12 and Breaka's lazy function-table ABI for `breaka`, 4.0.11
// for `stock`), and the two cannot load each other's: the stock page cannot read a Breaka module's `dylink.0` section ("unknown dylink.0 subsection: 6",
// then `__breaka_lazy_register` of undefined). The package's build record says which profile each of its modules is linked for
// (`godot_tsc.web.<profile>.wasm`), and its manifest names the stock one. So the export of a profile lists that profile's module, or none, and contains
// exactly that file. The published package ships the stock module only: Breaka's Web export has none, and its code editor is read-only.

/** The file name of a profile's Web side module in the package. */
export const webModuleNameOf = engine => `godot_tsc.web.${engine.name}.wasm`;
/** The installed module of a profile. */
export const webModuleOf = engine => resolve(INSTALL_DIRECTORY, 'bin', webModuleNameOf(engine));

/** The profiles the package in node_modules ships a Web side module for, as its build record lists them; undefined when it has no build record. */
function packagedWebProfiles() {
  const packagedRecord = resolve(PACKAGED_ADDON, RECORD_NAME);
  if (!existsSync(packagedRecord)) return undefined;
  return Object.values(parseBuildRecord(readFileSync(packagedRecord, 'utf8'), relative(root, packagedRecord)).webModules).map(module => module.profile);
}

/**
 * Throws unless the export in `directory` carries the profile's godot-tsc Web side module. The `live-compile` section needs the extension, which a Web
 * export has only when the installed package had a module for its profile when it was made; without one the code editor is read-only and there is nothing
 * for that section to run. The message says whether the package has a module for the profile to install, or ships none for it.
 */
export function requireGodotTscWebModule(engine, directory, mode) {
  if (existsSync(resolve(directory, webModuleNameOf(engine)))) return;
  const nothingToRun = `The ${engine.name} Web export has no godot-tsc side module (its code editor is read-only), so there is nothing for this section to run.`;
  const profiles = packagedWebProfiles();
  if (profiles === undefined) throw new Error(`${nothingToRun} The godot-tsc package has no built addon: run \`pnpm install\`.`);
  if (!profiles.includes(engine.name)) {
    throw new Error(`${nothingToRun} The godot-tsc package ships no Web side module for the ${engine.name} profile (${profiles.length === 0 ? 'it ships none' : `only for ${profiles.join(', ')}`}).`);
  }
  throw new Error(`${nothingToRun} Install the package's addon (\`${FIX}\`), then run \`pnpm build:web --export-only${mode === 'release' ? ' --release' : ''} --engine=${engine.name}\`.`);
}

/** Remove every godot-tsc (or older live-compile) Web side module from an export's output directory: Godot copies files into it and never deletes the ones an earlier export left. */
export function removeGodotTscWebModules(directory) {
  if (!existsSync(directory)) return;
  for (const name of readdirSync(directory)) if (WEB_MODULE_PATTERN.test(name)) rmSync(resolve(directory, name));
}

/**
 * What the Web export of `engine` does with the extension, decided before the export is made. Godot copies the Web library the manifest lists, so the
 * manifest is what decides.
 * - No addon installed, or one whose package has no module for the profile: `{ include: false }`. The export has no module and no manifest; the code
 *   editor shows its read-only panel.
 * - The package's current addon installed, with a module for this profile bound to the profile's dumps: `{ include: true, name, sha256 }`.
 * - An installed addon that is not that (another build, a replaced binary, a module bound to other dumps): throws, saying what fixes it. It is never
 *   left out silently: the default profile's export must not lose its code editor without saying so.
 */
export function godotTscWebPlan(engine) {
  if (!isInstalled()) return { include: false };
  const problem = installProblem();
  if (problem !== undefined) throw new Error(problem);
  const record = installedRecord();
  const name = webModuleNameOf(engine);
  const module = record.webModules[name];
  if (module === undefined) return { include: false };
  if (module.profile !== engine.name) throw new Error(`The godot-tsc build record says ${name} is linked for the ${module.profile} profile, not ${engine.name}.`);
  const environment = engine.webBindingEnvironment();
  const difference = bindingDifference(module.binding, bindingOf(environment.GDRUST_GODOT_API_JSON, environment.GDRUST_GODOT_INTERFACE_JSON));
  if (difference !== undefined) {
    throw new Error(`The installed ${name} is bound to other Godot dumps than the ${engine.name} profile's (${relative(root, dirname(environment.GDRUST_GODOT_API_JSON))}): ${difference}.`);
  }
  return { include: true, name, sha256: record.binaries[name] };
}

/**
 * Why the files of the export in `directory` do not carry exactly the godot-tsc Web side module the profile's export would, or undefined if they do.
 * `recorded` is what the export's receipt says about it: `null` for none, or `{ name, sha256 }`. A module in the directory that the receipt does not
 * record, one that is not the recorded file, a recorded one that is missing, and one that is no longer the installed package's are all refused. The page
 * loads whatever the manifest in the pack lists, so a module of another profile's Emscripten kills the page at load.
 */
export function godotTscWebExportProblem(engine, directory, recorded) {
  const present = readdirSync(directory).filter(name => WEB_MODULE_PATTERN.test(name));
  const where = `The Web export ${relative(root, directory)}`;
  if (recorded === null) {
    return present.length === 0 ? undefined : `${where} contains ${present.join(', ')}, which its receipt does not record: a godot-tsc Web side module must be the ${engine.name} profile's.`;
  }
  if (!isRecord(recorded) || typeof recorded.name !== 'string' || typeof recorded.sha256 !== 'string') {
    return present.length === 0 ? undefined : `${where} was made before its receipt recorded the godot-tsc Web side module, and contains ${present.join(', ')}.`;
  }
  if (recorded.name !== webModuleNameOf(engine)) {
    return `${where}'s receipt records the godot-tsc Web side module ${recorded.name}, which is not the ${engine.name} profile's (${webModuleNameOf(engine)}).`;
  }
  if (present.length !== 1 || present[0] !== recorded.name) {
    return `${where} should contain the godot-tsc Web side module ${recorded.name} and no other; it contains ${present.length === 0 ? 'none' : present.join(', ')}.`;
  }
  if (sha256(resolve(directory, recorded.name)) !== recorded.sha256) return `${where}'s ${recorded.name} is not the file its receipt records.`;
  const installed = isInstalled() && installProblem() === undefined ? installedRecord().binaries[recorded.name] : undefined;
  if (installed !== recorded.sha256) return `${where}'s ${recorded.name} is not the installed godot-tsc package's module: the package was rebuilt, reinstalled or removed since the export.`;
  return undefined;
}

/** Write `content` over `file` by staging it beside and renaming: a run in the same checkout may be reading it. The same content is left alone. */
function replaceFile(file, content) {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return;
  const staged = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(staged, content);
    renameSync(staged, file);
  } finally {
    rmSync(staged, { force: true });
  }
}

/** The package's manifest with its Web library lines naming `webLibrary`, a file in `bin/`. Its native lines are kept as the package wrote them. */
export function manifestNaming(packagedManifest, webLibrary) {
  const native = packagedManifest.replace(WEB_LIBRARY_LINE, '');
  if (!native.includes('[libraries]\n')) throw new Error(`The godot-tsc manifest has no [libraries] section: ${JSON.stringify(packagedManifest.slice(0, 200))}`);
  const path = `res://addons/${ADDON_NAME}/bin/${webLibrary}`;
  return `${native.replace(/\n*$/u, '\n')}web.debug.threads.wasm32 = "${path}"\nweb.release.threads.wasm32 = "${path}"\n`;
}

/**
 * Run `action`, a profile's Web export, with the installed manifest saying what `plan` (`godotTscWebPlan`) decided, and put the package's manifest back
 * afterwards whatever `action` does.
 * - `include`: its Web library lines name the profile's module (the package's manifest names the stock one, and lists one module for `web.*`).
 * - Otherwise the manifest is out of the project: one that names no library for the platform that loads it is still packed, still listed and still
 *   loaded, and the engine logs an error for it (the stock page: "No GDExtension library found for current OS and architecture (web.wasm32)").
 *   `gen:types` hides it the same way (`withoutGodotTscManifest`), so that the tracked typings do not describe a class a checkout without the addon lacks.
 */
export function withGodotTscWebManifest(plan, action) {
  if (!plan.include) return withoutGodotTscManifest(action);
  const packaged = readFileSync(resolve(PACKAGED_ADDON, MANIFEST_NAME), 'utf8');
  replaceFile(GDEXTENSION_FILE, manifestNaming(packaged, plan.name));
  try {
    return action();
  } finally {
    replaceFile(GDEXTENSION_FILE, packaged);
  }
}

/** Run `action` with the addon's manifest out of the project, and put it back afterwards whatever `action` does. A manifest left hidden by a run that was killed is put back first. */
export function withoutGodotTscManifest(action, manifest = GDEXTENSION_FILE) {
  const hidden = `${manifest}.hidden`;
  if (existsSync(hidden)) {
    if (existsSync(manifest)) rmSync(hidden);
    else renameSync(hidden, manifest);
  }
  const hide = existsSync(manifest);
  if (hide) renameSync(manifest, hidden);
  try {
    return action();
  } finally {
    if (hide) renameSync(hidden, manifest);
  }
}
