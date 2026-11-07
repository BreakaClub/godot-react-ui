// What the live-compile extension is made from and where it is installed, shared by the build (`scripts/build-live-compile.mjs`) and
// every run that needs it (`scripts/verify.mjs` for the `live-compile` section). Its freshness is the one the UI library has
// (scripts/freshness.mjs, docs/tracks/freshness.md): a stamp of the profile and of the content of the inputs, compared before a run.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { collectContentInputs, readStamp, requireBuild } from './freshness.mjs';

const root = resolve(import.meta.dirname, '..');
export const INSTALL_DIRECTORY = resolve(root, 'demo/addons/live-compile');
export const LIBRARY_NAME = process.platform === 'darwin' ? 'liblive_compile.dylib' : process.platform === 'linux' ? 'liblive_compile.so' : 'live_compile.dll';
export const INSTALLED_LIBRARY = resolve(INSTALL_DIRECTORY, 'bin', LIBRARY_NAME);
export const INSTALLED_STAMP = resolve(INSTALL_DIRECTORY, 'live_compile.build.json');
export const GDEXTENSION_FILE = resolve(INSTALL_DIRECTORY, 'live_compile.gdextension');
export const BUN_CHECKOUT = '/Users/ben/Development/bun';
/** The cargo target directory of a profile: its own, so that the two engines' bindings never invalidate each other. */
export const targetDirectoryOf = engine => resolve(root, engine.name === 'breaka' ? 'live-compile/target' : 'live-compile/target-stock');
export const FIX = engine => `node scripts/build-live-compile.mjs --engine=${engine.name}`;

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

/** Everything the extension is built from, as the freshness guard hashes it: the sources, the patches, the toolchain and the profile's API dumps. */
export function liveCompileInputs(engine) {
  const paths = liveCompileSourceFiles();
  const apiFiles = Object.values(engine.bindingEnvironment()).map(file => relative(root, file));
  return collectContentInputs({ root, paths: [...paths, ...apiFiles], features: [] });
}

/** Throws unless the installed extension is the profile's build of the current sources; the message ends with the command that fixes it. */
export function requireLiveCompile(engine) {
  requireBuild({
    library: INSTALLED_LIBRARY, stamp: readStamp(INSTALLED_STAMP), engine: engine.name, probe: false, current: liveCompileInputs(engine),
    subject: `installed ${basename(INSTALLED_LIBRARY)}`, fix: FIX(engine),
  });
}

export const WEB_LIBRARY_NAME = 'live_compile.web.wasm';

/**
 * The extension's manifest, generated beside the library: a demo without the extension has no such file, so a checkout that never built it
 * loads nothing and logs nothing. The Web entries are there once a Web side module has been installed.
 */
export function writeGdextension() {
  const web = existsSync(resolve(INSTALL_DIRECTORY, 'bin', WEB_LIBRARY_NAME))
    ? `web.debug.threads.wasm32 = "res://addons/live-compile/bin/${WEB_LIBRARY_NAME}"\nweb.release.threads.wasm32 = "res://addons/live-compile/bin/${WEB_LIBRARY_NAME}"\n`
    : '';
  writeFileSync(GDEXTENSION_FILE, `[configuration]
entry_symbol = "gdext_rust_init"
compatibility_minimum = "4.7"
reloadable = false

[libraries]
macos.debug.arm64 = "res://addons/live-compile/bin/${LIBRARY_NAME}"
macos.release.arm64 = "res://addons/live-compile/bin/${LIBRARY_NAME}"
${web}`);
}
