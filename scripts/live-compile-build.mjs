// What the live-compile extension is made from and where it is installed, shared by the build (`scripts/build-live-compile.mjs`), the
// engine switch (`scripts/switch-engine.mjs`) and every run that loads it (`engine.prepareNative` for all of them, `scripts/verify.mjs`
// for the `live-compile` section, which needs it). Its freshness is the one the UI library has (scripts/freshness.mjs,
// docs/tracks/freshness.md): a stamp of the profile and of the content of the inputs, compared before a run. Which profile's build is
// installed, and how a switch of profile installs the other one without compiling, is docs/tracks/engine-switch.md.
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessInstall, collectContentInputs, installRefusal, readStamp, switchBuild } from './freshness.mjs';

// `import.meta.url`, not `import.meta.dirname`: engine.mjs imports this file, and the unit tests load that through tsx's CommonJS bridge.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL_PATH = 'demo/addons/live-compile';
const STAMP_NAME = 'live_compile.build.json';
export const INSTALL_DIRECTORY = resolve(root, INSTALL_PATH);
export const LIBRARY_NAME = process.platform === 'darwin' ? 'liblive_compile.dylib' : process.platform === 'linux' ? 'liblive_compile.so' : 'live_compile.dll';
export const INSTALLED_LIBRARY = resolve(INSTALL_DIRECTORY, 'bin', LIBRARY_NAME);
export const INSTALLED_STAMP = resolve(INSTALL_DIRECTORY, STAMP_NAME);
export const GDEXTENSION_FILE = resolve(INSTALL_DIRECTORY, 'live_compile.gdextension');
export const BUN_CHECKOUT = '/Users/ben/Development/bun';
/** The cargo target directory of a profile: its own, so that the two engines' bindings never invalidate each other. */
export const targetDirectoryOf = engine => resolve(root, targetPath(engine));
export const FIX = engine => `node scripts/build-live-compile.mjs --engine=${engine.name}`;
/** The command that installs the profile's build from its target directory (scripts/switch-engine.mjs): a copy, no compile. */
export const INSTALL_FIX = engine => `pnpm switch:engine --engine=${engine.name}`;

function targetPath(engine) {
  return engine.name === 'breaka' ? 'live-compile/target' : 'live-compile/target-stock';
}

const SOURCE_DIRECTORIES = ['live-compile/core', 'live-compile/ext', 'live-compile/patches', 'live-compile/stubs'];
const SOURCE_FILES = ['live-compile/Cargo.toml', 'live-compile/Cargo.lock', 'live-compile/rust-toolchain.toml', 'live-compile/.cargo/config.toml', 'live-compile/scripts/vendor-bun.py'];

function filesUnder(base, directory) {
  const found = [];
  for (const entry of readdirSync(resolve(base, directory), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) found.push(...filesUnder(base, path));
    else if (entry.isFile() && entry.name !== '.DS_Store') found.push(path);
  }
  return found;
}

/** The repository-relative paths of the files the extension is built from. */
export function liveCompileSourceFiles(base = root) {
  return [...SOURCE_DIRECTORIES.flatMap(directory => filesUnder(base, directory)), ...SOURCE_FILES];
}

/**
 * Everything the extension is built from, as the freshness guard hashes it: the sources, the patches, the toolchain and the profile's API
 * dumps. `base` is the repository; it is a parameter so that the decision table can be tested in a temporary one.
 */
export function liveCompileInputs(engine, base = root) {
  const paths = liveCompileSourceFiles(base);
  const apiFiles = Object.values(engine.bindingEnvironment()).map(file => relative(base, file));
  return collectContentInputs({ root: base, paths: [...paths, ...apiFiles], features: [] });
}

/**
 * Where the profile's extension is built, stamped and installed below the repository at `base`: the profile's cargo target directory (the
 * library cargo leaves there and the stamp beside it, which says whose build of which sources it is) and the one install every demo run loads.
 */
export function liveCompileLayout(engine, base = root) {
  const installDirectory = resolve(base, INSTALL_PATH);
  const targetDirectory = resolve(base, targetPath(engine));
  return {
    targetDirectory, built: resolve(targetDirectory, 'release', LIBRARY_NAME), builtStamp: resolve(targetDirectory, STAMP_NAME),
    installDirectory, library: resolve(installDirectory, 'bin', LIBRARY_NAME), stamp: resolve(installDirectory, STAMP_NAME),
    manifest: resolve(installDirectory, 'live_compile.gdextension'),
  };
}

/** Whether anything of the extension is installed: Godot loads whatever the manifest names, so a manifest alone is an installation too. */
function isInstalled(layout) {
  return [layout.manifest, layout.library, layout.stamp].some(existsSync);
}

/** The installed build and the profile's target build as freshness checks, both against the sources as they are now. */
function checksOf(engine, layout, base) {
  const current = liveCompileInputs(engine, base);
  const check = (library, stamp, subject) => ({ library, stamp: readStamp(stamp), engine: engine.name, probe: false, current, subject });
  return {
    installed: check(layout.library, layout.stamp, `installed ${basename(layout.library)}`),
    built: check(layout.built, layout.builtStamp, `${engine.name} ${basename(layout.built)} built in ${relative(base, layout.targetDirectory)}`),
  };
}

/**
 * Why a run of `engine` must not load the installed extension, or undefined when it may. A demo run loads the extension whenever its
 * manifest is installed, whether or not the section uses it, and Godot-rust then fails late (`compiled against newer Godot version`) on
 * the other profile's. So an installed extension must be the profile's build of the current sources. With `required` it must be installed
 * too (the `live-compile` section); without, none installed is fine: nothing loads, and the code editor shows its read-only panel.
 * The message ends with the command that fixes it: an install when the profile's target directory holds a current build, a build when not.
 */
export function liveCompileRefusal(engine, { required = false, base = root } = {}) {
  const layout = liveCompileLayout(engine, base);
  if (!required && !isInstalled(layout)) return undefined;
  return installRefusal(assessInstall(checksOf(engine, layout, base)), {
    buildFix: FIX(engine), installFix: INSTALL_FIX(engine), builtSubject: `The ${engine.name} build in ${relative(base, layout.targetDirectory)}`,
  });
}

/** Throws unless the installed extension is the profile's build of the current sources; the message ends with the command that fixes it. */
export function requireLiveCompile(engine, options = {}) {
  const refusal = liveCompileRefusal(engine, { ...options, required: true });
  if (refusal !== undefined) throw new Error(refusal);
}

/**
 * Make the installed extension the profile's, as far as its target directory allows (scripts/freshness.mjs `switchBuild`): `current`, `installed`
 * (a staged copy and a stamp), or `needs-build`, with `absent` when nothing was installed (an optional extension that was never built).
 */
export function switchLiveCompile(engine, { base = root } = {}) {
  const layout = liveCompileLayout(engine, base);
  const absent = !isInstalled(layout);
  const result = switchBuild({ ...checksOf(engine, layout, base), destination: layout.library, stampPath: layout.stamp, fix: FIX(engine), absent });
  if (result.outcome === 'installed') writeGdextension({ installDirectory: layout.installDirectory });
  return result;
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
