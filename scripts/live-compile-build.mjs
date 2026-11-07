// What the live-compile extension is made from and where it is installed, shared by the build (`scripts/build-live-compile.mjs`) and every run
// that loads it (`engine.prepareNative` for all of them, `scripts/verify.mjs` for the `live-compile` section, which needs it). Its freshness is the
// one the UI library has (scripts/freshness.mjs, docs/tracks/freshness.md): a stamp of the Godot API it is bound to and of the content of its
// inputs, compared before a run. Like the UI library it is one native build per platform, bound to `NATIVE_BINDING_API` (scripts/native-binding.mjs)
// and loaded by both engine profiles (docs/tracks/single-build.md).
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectContentInputs, findProblem, readStamp } from './freshness.mjs';
import { nativeBinding, nativeDumpFiles } from './native-binding.mjs';

// `import.meta.url`, not `import.meta.dirname`: engine.mjs imports this file, and the unit tests load that through tsx's CommonJS bridge.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL_PATH = 'demo/addons/live-compile';
const TARGET_PATH = 'live-compile/target';
const STAMP_NAME = 'live_compile.build.json';
export const INSTALL_DIRECTORY = resolve(root, INSTALL_PATH);
export const LIBRARY_NAME = process.platform === 'darwin' ? 'liblive_compile.dylib' : process.platform === 'linux' ? 'liblive_compile.so' : 'live_compile.dll';
export const INSTALLED_LIBRARY = resolve(INSTALL_DIRECTORY, 'bin', LIBRARY_NAME);
export const INSTALLED_STAMP = resolve(INSTALL_DIRECTORY, STAMP_NAME);
export const GDEXTENSION_FILE = resolve(INSTALL_DIRECTORY, 'live_compile.gdextension');
export const BUN_CHECKOUT = '/Users/ben/Development/bun';
/** The one cargo target directory of the native extension. The Web side module builds below it, in `web/`, for the Breaka profile (scripts/build-live-compile-web.mjs). */
export const TARGET_DIRECTORY = resolve(root, TARGET_PATH);
/** The command that builds and installs the extension. */
export const FIX = 'node scripts/build-live-compile.mjs';

const SOURCE_DIRECTORIES = ['live-compile/core', 'live-compile/ext', 'live-compile/patches', 'live-compile/stubs'];
const SOURCE_FILES = ['live-compile/Cargo.toml', 'live-compile/Cargo.lock', 'live-compile/rust-toolchain.toml', 'live-compile/.cargo/config.toml', 'live-compile/scripts/vendor-bun.py'];

function filesUnder(directory) {
  const found = [];
  for (const entry of readdirSync(resolve(root, directory), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) found.push(...filesUnder(path));
    else if (entry.isFile() && entry.name !== '.DS_Store') found.push(path);
  }
  return found;
}

/** The repository-relative paths of the files the extension is built from. */
export function liveCompileSourceFiles() {
  return [...SOURCE_DIRECTORIES.flatMap(filesUnder), ...SOURCE_FILES];
}

/** Everything the extension is built from, as the freshness guard hashes it: the sources, the patches, the toolchain and the API dumps it is bound to. */
export function liveCompileInputs() {
  const apiFiles = nativeDumpFiles().map(file => relative(root, file));
  return collectContentInputs({ root, paths: [...liveCompileSourceFiles(), ...apiFiles], features: [] });
}

/**
 * Where the extension is built, stamped and installed: the cargo target directory (the library cargo leaves there and the stamp beside it, which
 * says what it was bound to and built from, so that cargo's output can be trusted) and the one install every demo run loads.
 */
export function liveCompileLayout() {
  return {
    targetDirectory: TARGET_DIRECTORY, built: resolve(TARGET_DIRECTORY, 'release', LIBRARY_NAME), builtStamp: resolve(TARGET_DIRECTORY, STAMP_NAME),
    installDirectory: INSTALL_DIRECTORY, library: INSTALLED_LIBRARY, stamp: INSTALLED_STAMP, manifest: GDEXTENSION_FILE,
  };
}

/** Whether anything of the extension is installed: Godot loads whatever the manifest names, so a manifest alone is an installation too. */
function isInstalled() {
  return [GDEXTENSION_FILE, INSTALLED_LIBRARY, INSTALLED_STAMP].some(existsSync);
}

/**
 * Why a native run must not load the installed extension, or undefined when it may. A demo run loads the extension whenever its manifest is
 * installed, whether or not the section uses it, and godot-rust fails late (`compiled against newer Godot version`) on a build bound to a newer API
 * than the engine's. So an installed extension must be bound to `NATIVE_BINDING_API` and built from the sources as they are now. The profile does
 * not enter into it. With `required` it must be installed too (the `live-compile` section); without, none installed is fine: nothing loads, and
 * the code editor shows its read-only panel. The message ends with the command that fixes it.
 */
export function liveCompileRefusal({ required = false } = {}) {
  if (!required && !isInstalled()) return undefined;
  const problem = findProblem({
    library: INSTALLED_LIBRARY, stamp: readStamp(INSTALLED_STAMP), binding: nativeBinding(), probe: false,
    current: liveCompileInputs(), subject: `installed ${basename(INSTALLED_LIBRARY)}`,
  });
  return problem === undefined ? undefined : `${problem} Run \`${FIX}\` first.`;
}

/** Throws unless the installed extension is bound to `NATIVE_BINDING_API` and built from the current sources; the message ends with the command that fixes it. */
export function requireLiveCompile() {
  const refusal = liveCompileRefusal({ required: true });
  if (refusal !== undefined) throw new Error(refusal);
}

export const WEB_LIBRARY_NAME = 'live_compile.web.wasm';

// ---- The Web side module: per profile ------------------------------------------------------------------------------------------------------------------
//
// Unlike the native extension, the Web side module is per engine profile. A side module is linked with the Emscripten SDK of the engine whose templates load
// it (6.0.12 and Breaka's lazy function-table ABI for `breaka`, 4.0.11 for `stock`), and the two cannot load each other's: the stock page cannot read a
// Breaka module's `dylink.0` section ("unknown dylink.0 subsection: 6", then `__breaka_lazy_register` of undefined). So each profile has its own file, stamp and
// cargo target directory, the stamp records the profile (like the UI library's Web stamp), and an export contains exactly the module stamped for its own
// profile, or none (docs/tracks/stock-web.md).

/** The file name of a profile's Web side module. Breaka's keeps the name it always had. */
export const webLibraryNameOf = engine => engine.name === 'breaka' ? WEB_LIBRARY_NAME : `live_compile.web.${engine.name}.wasm`;
/** The installed module and the stamp beside the extension's other files. */
export const webLibraryOf = engine => resolve(INSTALL_DIRECTORY, 'bin', webLibraryNameOf(engine));
export const webStampOf = engine => resolve(INSTALL_DIRECTORY, engine.name === 'breaka' ? 'live_compile.web.build.json' : `live_compile.web.${engine.name}.build.json`);
/** The profile's cargo target directory for the Web side module (below the native one, as `web/` always was). */
export const webTargetDirectoryOf = engine => resolve(TARGET_DIRECTORY, engine.name === 'breaka' ? 'web' : `web-${engine.name}`);
/** The command that builds the profile's Web side module. */
export const WEB_FIX = engine => `node scripts/build-live-compile-web.mjs --engine=${engine.name}`;
/** Every file name a live-compile Web side module is exported under, for any profile. */
const WEB_MODULE_PATTERN = /^live_compile\.web(\.[a-z]+)?\.wasm$/u;

/**
 * Throws unless the export in `directory` carries the profile's live-compile Web side module. The `live-compile` section needs the extension, which a Web export has only
 * when a module stamped for its profile existed when it was made; without one the code editor is read-only and there is nothing for that section to run.
 */
export function requireLiveCompileWebModule(engine, directory, mode) {
  if (existsSync(resolve(directory, webLibraryNameOf(engine)))) return;
  throw new Error(`The ${engine.name} Web export has no live-compile side module (its code editor is read-only), so there is nothing for this section to run. Run \`${WEB_FIX(engine)}\`, then \`pnpm build:web --export-only${mode === 'release' ? ' --release' : ''} --engine=${engine.name}\`.`);
}

/** Remove every live-compile Web side module from an export's output directory: Godot copies files into it and never deletes the ones an earlier export left. */
export function removeLiveCompileWebModules(directory) {
  if (!existsSync(directory)) return;
  for (const name of readdirSync(directory)) if (WEB_MODULE_PATTERN.test(name)) rmSync(resolve(directory, name));
}

/** What the profile's Web side module is made from: the extension's sources and the profile's own Web dump pair, with the `web` feature. */
export function liveCompileWebInputs(engine) {
  const apiFiles = Object.values(engine.webBindingEnvironment()).map(file => relative(root, file));
  return collectContentInputs({ root, paths: [...liveCompileSourceFiles(), ...apiFiles], features: ['web'] });
}

/**
 * What the Web export of `engine` does with the extension, decided before the export is made. The export lists a Web library in the extension's
 * manifest, and Godot copies whatever the manifest lists, so the manifest is what decides.
 * - No module installed for the profile: `{ include: false }`. The export has no module and no manifest entry; the code editor shows its read-only panel.
 * - A module installed and stamped for this profile from the current sources: `{ include: true, name, stamp }`.
 * - A module installed that is not that (no stamp, another profile's stamp, older sources, replaced after it was built): throws, naming the build command.
 *   It is never left out silently: the default profile's export must not lose its code editor without saying so.
 */
export function liveCompileWebPlan(engine) {
  const library = webLibraryOf(engine);
  const stamp = readStamp(webStampOf(engine));
  if (!existsSync(library) && stamp === undefined) return { include: false };
  const problem = findProblem({ library, stamp, engine: engine.name, probe: false, current: liveCompileWebInputs(engine), subject: `installed ${webLibraryNameOf(engine)}` });
  if (problem !== undefined) throw new Error(`${problem} Run \`${WEB_FIX(engine)}\` first.`);
  return { include: true, name: webLibraryNameOf(engine), stamp };
}

/**
 * Why the files of the export in `directory` do not carry exactly the live-compile Web side module the profile's export would, or undefined if they do. `recorded` is
 * what the export's receipt says about it: `null` for none, or `{ name, stamp }`. A module in the directory that the receipt does not record, one built for another
 * profile or from older sources, one that is not the recorded file, and a recorded one that is missing are all refused. The page loads whatever the manifest in the pack
 * lists, so a module of another profile's Emscripten kills the page at load.
 */
export function liveCompileWebExportProblem(engine, directory, recorded) {
  const present = readdirSync(directory).filter(name => WEB_MODULE_PATTERN.test(name));
  if (recorded === null) {
    return present.length === 0 ? undefined : `The Web export ${relative(root, directory)} contains ${present.join(', ')}, which its receipt does not record: a live-compile Web side module must be the one stamped for the ${engine.name} profile.`;
  }
  if (recorded === undefined || typeof recorded !== 'object' || typeof recorded.name !== 'string') {
    return present.length === 0 ? undefined : `The Web export ${relative(root, directory)} was made before the live-compile Web side module was stamped per profile, and contains ${present.join(', ')}.`;
  }
  if (present.length !== 1 || present[0] !== recorded.name) {
    return `The Web export ${relative(root, directory)} should contain the live-compile Web side module ${recorded.name} and no other; it contains ${present.length === 0 ? 'none' : present.join(', ')}.`;
  }
  return findProblem({
    library: resolve(directory, recorded.name), stamp: recorded.stamp, engine: engine.name, probe: false, current: liveCompileWebInputs(engine), subject: `exported ${recorded.name}`,
  });
}

/**
 * Run `action` with the extension's manifest out of the project, and put it back afterwards whatever `action` does. A manifest that names no library for the platform that
 * loads it is still packed, still listed and still loaded, and the engine logs an error for it (the stock page: "No GDExtension library found for current OS and
 * architecture (web.wasm32)"), so a Web export with no module for its profile leaves the extension out altogether, and `gen:types` hides it the same way so that the tracked
 * typings do not describe a class a checkout without the extension lacks. A manifest left hidden by a run that was killed is put back first.
 */
export function withoutLiveCompileManifest(action, manifest = GDEXTENSION_FILE) {
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

/**
 * The extension's manifest, generated beside the library: a demo without the extension has no such file, so a checkout that never built it
 * loads nothing and logs nothing. It lists the native library, and a Web library only when the caller names one (`webLibrary`, a file name in `bin/`):
 * the Web export of a profile writes it just before the export, from `liveCompileWebPlan`, and nothing else does. A run in the same checkout may be
 * reading the manifest, so a different one is staged and renamed over it, and the same one is left alone.
 */
export function writeGdextension({ installDirectory = INSTALL_DIRECTORY, webLibrary } = {}) {
  const web = webLibrary === undefined
    ? ''
    : `web.debug.threads.wasm32 = "res://addons/live-compile/bin/${webLibrary}"\nweb.release.threads.wasm32 = "res://addons/live-compile/bin/${webLibrary}"\n`;
  const manifest = resolve(installDirectory, 'live_compile.gdextension');
  const content = `[configuration]
entry_symbol = "gdext_rust_init"
compatibility_minimum = "4.7"
reloadable = false

[libraries]
macos.debug.arm64 = "res://addons/live-compile/bin/${LIBRARY_NAME}"
macos.release.arm64 = "res://addons/live-compile/bin/${LIBRARY_NAME}"
${web}`;
  if (existsSync(manifest) && readFileSync(manifest, 'utf8') === content) return;
  const staged = `${manifest}.${process.pid}.tmp`;
  try {
    writeFileSync(staged, content);
    renameSync(staged, manifest);
  } finally {
    rmSync(staged, { force: true });
  }
}
