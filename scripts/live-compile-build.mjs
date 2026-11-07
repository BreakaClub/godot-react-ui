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

/**
 * The extension's manifest, generated beside the library: a demo without the extension has no such file, so a checkout that never built it
 * loads nothing and logs nothing. The Web entries are there once a Web side module has been installed. A run in the same checkout may be
 * reading the manifest, so a different one is staged and renamed over it, and the same one is left alone.
 */
export function writeGdextension({ installDirectory = INSTALL_DIRECTORY } = {}) {
  const web = existsSync(resolve(installDirectory, 'bin', WEB_LIBRARY_NAME))
    ? `web.debug.threads.wasm32 = "res://addons/live-compile/bin/${WEB_LIBRARY_NAME}"\nweb.release.threads.wasm32 = "res://addons/live-compile/bin/${WEB_LIBRARY_NAME}"\n`
    : '';
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
