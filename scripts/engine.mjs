import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Engine profiles (docs/tracks/stock-engine.md).
 *
 * `breaka` is the default: Breaka's custom Godot 4.8 with its GodotJS. `stock` is an unmodified Godot 4.7.2 with
 * upstream GodotJS. A profile decides which Godot binary runs the demo, which API dump the Rust extension is bound
 * against, where cargo keeps that profile's build cache, where a run's evidence goes and how the Web build is made.
 *
 * Select one the same way for every script: `--engine=stock` on the command line (`pnpm verify --engine=stock`) or
 * `GODOT_REACT_ENGINE=stock` in the environment. The flag wins over the variable. A script that resolves a profile
 * from the flag exports it as `GODOT_REACT_ENGINE` so the scripts it starts agree. `GODOT` still overrides the
 * profile's Godot binary; the binary's version is checked against the profile before anything runs.
 */
// `import.meta.url`, not `import.meta.dirname`: the unit tests load this file through tsx's CommonJS bridge.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stockRoot = '/Users/ben/Development/godot-stock';
const libraryName = process.platform === 'darwin' ? 'libgodot_react_ui.dylib'
  : process.platform === 'linux' ? 'libgodot_react_ui.so' : 'godot_react_ui.dll';
const installDirectory = resolve(root, 'demo/addons/godot-react-ui/bin');

export const ENGINE_VARIABLE = 'GODOT_REACT_ENGINE';
export const ENGINE_FLAG = '--engine=';
export const DEFAULT_ENGINE = 'breaka';

/** The Godot version a binary must report for each profile (`godot --version`). */
const profiles = {
  breaka: {
    name: 'breaka',
    description: "Breaka's custom Godot 4.8 with its GodotJS",
    godot: '/Applications/Godot48.app/Contents/MacOS/Godot',
    versionPrefix: '4.8.',
    // `.cargo/config.toml` selects these two files; the default profile leaves cargo's own environment alone.
    apiDirectory: undefined,
    artifacts: resolve(root, 'artifacts'),
    targets: {
      native: resolve(root, 'target'), nativeProbe: resolve(root, 'target/probe'),
      web: resolve(root, 'target/web'), webProbe: resolve(root, 'target/web-probe'),
    },
    web: {
      presetName: 'Web',
      emscripten: '/Users/ben/Development/emsdk-breaka-6.0.12-20261027',
      // Breaka's templates carry a lazy function-table ABI that the extension's final link must match.
      lazyFunctionTable: true,
      nightly: 'nightly-2026-05-15',
      // `DisplayServerWeb::_touch_callback` marks a `touchcancel` as `InputEventScreenTouch.canceled`
      // (platform/web/display_server_web.cpp:772, library_godot_input.js:602 in /Users/ben/Development/godot).
      reportsCancelledTouch: true,
    },
  },
  stock: {
    name: 'stock',
    description: 'Stock Godot 4.7.2 with upstream GodotJS',
    godot: `${stockRoot}/bin/godot-stock`,
    versionPrefix: '4.7.',
    apiDirectory: resolve(root, 'native/api/stock-4.7.2'),
    artifacts: resolve(root, 'artifacts/stock'),
    targets: {
      native: resolve(root, 'target/stock'), nativeProbe: resolve(root, 'target/stock-probe'),
      web: resolve(root, 'target/stock-web'), webProbe: resolve(root, 'target/stock-web-probe'),
    },
    web: {
      presetName: 'Web (stock)',
      emscripten: `${stockRoot}/emsdk`,
      lazyFunctionTable: false,
      nightly: 'nightly-2026-05-15',
      // Stock 4.7.2 gives `touchend` and `touchcancel` the same callback type (library_godot_input.js:601-602), so a
      // cancelled touch reaches the engine as an ordinary release and never as a cancel (S11).
      reportsCancelledTouch: false,
    },
  },
};

const nativeStamp = resolve(installDirectory, 'react_ui.build.json');
const webLibrary = resolve(installDirectory, 'godot_react_ui.web.wasm');
const webStamp = resolve(installDirectory, 'react_ui.web.build.json');

function recordBuild(library, stamp, engine, probe) {
  writeFileSync(stamp, `${JSON.stringify({ engine, probe, library: basename(library), sha256: sha256(library) }, null, 2)}\n`);
}

function requireBuild(library, stamp, engine, probe, fix) {
  if (!existsSync(stamp) || !existsSync(library)) throw new Error(`No ${engine} build of ${basename(library)} is installed in ${installDirectory}. Run \`${fix}\` first.`);
  const recorded = JSON.parse(readFileSync(stamp, 'utf8'));
  if (recorded.engine !== engine || recorded.probe !== probe) {
    throw new Error(`The installed ${basename(library)} is the ${recorded.engine} profile's${recorded.probe ? ' probe build' : ''}, not the ${engine} profile's${probe ? ' probe build' : ''}. Run \`${fix}\` first.`);
  }
  if (recorded.sha256 !== sha256(library)) throw new Error(`The installed ${basename(library)} differs from the one its build recorded for ${engine}. Run \`${fix}\` first.`);
}

/** Remove every `--engine=` flag from an argument list, for scripts that reject arguments they do not know. */
export function argsWithoutEngine(argv) {
  return argv.filter(argument => !argument.startsWith(ENGINE_FLAG));
}

/** Pure selection: the flag wins over the variable, the default is `breaka`, anything else is an error. */
export function selectEngineName(argv, env) {
  const flags = argv.filter(argument => argument.startsWith(ENGINE_FLAG)).map(argument => argument.slice(ENGINE_FLAG.length));
  if (new Set(flags).size > 1) throw new Error(`Conflicting ${ENGINE_FLAG}<name> flags: ${flags.join(', ')}`);
  const name = flags[0] ?? (env[ENGINE_VARIABLE] === undefined || env[ENGINE_VARIABLE] === '' ? DEFAULT_ENGINE : env[ENGINE_VARIABLE]);
  if (!Object.hasOwn(profiles, name)) {
    throw new Error(`Unknown engine profile "${name}" (from ${flags.length > 0 ? ENGINE_FLAG : ENGINE_VARIABLE}); use ${Object.keys(profiles).join(' or ')}.`);
  }
  return name;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Resolve the engine profile for this process. `argv` is the script's own arguments; the resolved name is exported
 * as `GODOT_REACT_ENGINE` so a script that starts other scripts (`pnpm build`, an editor import) keeps them in step.
 */
export function selectEngine(argv = process.argv.slice(2), env = process.env) {
  const profile = profiles[selectEngineName(argv, env)];
  env[ENGINE_VARIABLE] = profile.name;
  const godot = env.GODOT === undefined || env.GODOT === '' ? profile.godot : env.GODOT;
  return {
    ...profile,
    godot,
    root,
    libraryName,
    installDirectory,
    installedLibrary: resolve(installDirectory, libraryName),
    /** The Web export mode the arguments ask for: `release` if they say `--release`, else `debug`. */
    webMode(argv = process.argv.slice(2)) {
      return argv.includes('--release') ? 'release' : 'debug';
    },
    /** An evidence directory below this profile's artifacts root (`artifacts/<name>` or `artifacts/stock/<name>`). */
    artifactPath: (...names) => resolve(profile.artifacts, ...names),
    /** The API dump pair cargo binds against, as environment variables; empty for the default profile. */
    bindingEnvironment: () => profile.apiDirectory === undefined ? {} : {
      GDRUST_GODOT_API_JSON: resolve(profile.apiDirectory, 'extension_api.json'),
      GDRUST_GODOT_INTERFACE_JSON: resolve(profile.apiDirectory, 'gdextension_interface.json'),
    },
    /** The `godot --version` line of the selected binary. Throws if it is not the profile's engine. */
    verifiedVersion() {
      const result = spawnSync(godot, ['--version'], { encoding: 'utf8', timeout: 30_000 });
      if (result.error) throw new Error(`Cannot run ${godot} --version: ${result.error.message}`);
      const version = result.stdout.trim().split('\n').at(-1) ?? '';
      if (!version.startsWith(profile.versionPrefix)) {
        throw new Error(`Engine profile "${profile.name}" expects Godot ${profile.versionPrefix}x, but ${godot} reports "${version}". Select the profile that matches the binary (${ENGINE_FLAG}<name> or ${ENGINE_VARIABLE}), or point GODOT at the right one.`);
      }
      return version;
    },
    /** Record which profile built the native library that now sits where the `.gdextension` expects it. */
    recordInstalledLibrary: probe => recordBuild(resolve(installDirectory, libraryName), nativeStamp, profile.name, probe),
    /**
     * Fail unless the installed native library is this profile's build, so a run never exercises a library bound to
     * the other engine. `probe` says whether the Phase F0/text-layout probe build is wanted (it never ships).
     */
    requireInstalledLibrary: ({ probe = false } = {}) => requireBuild(
      resolve(installDirectory, libraryName), nativeStamp, profile.name, probe, `pnpm build:native${probe ? ' --probe' : ''} ${ENGINE_FLAG}${profile.name}`),
    /**
     * Everything a native run needs to be sure of before it starts: the binary is the profile's engine and the
     * installed library is the profile's build. Logs which engine the evidence will come from.
     */
    prepareNative({ probe = false } = {}) {
      const version = this.verifiedVersion();
      this.requireInstalledLibrary({ probe });
      console.log(`Engine profile ${profile.name} (${profile.description}): ${godot}, Godot ${version}`);
      return version;
    },
    /** The same two, for the Web side module `build:web` installs. */
    recordInstalledWasm: probe => recordBuild(webLibrary, webStamp, profile.name, probe),
    requireInstalledWasm: ({ probe = false } = {}) => requireBuild(
      webLibrary, webStamp, profile.name, probe, `pnpm build:web --wasm-only${probe ? ' --probe' : ''} ${ENGINE_FLAG}${profile.name}`),
  };
}
