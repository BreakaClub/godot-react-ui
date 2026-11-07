import { spawnSync } from 'node:child_process';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beginBuild, collectInputs, readStamp, requireBuild, requireExport } from './freshness.mjs';
import { liveCompileRefusal } from './live-compile-build.mjs';
import { CARGO_PACKAGE, NATIVE_BINDING_API, NATIVE_INSTALL_DIRECTORY, nativeRefusal, requireBuiltNative } from './native-binding.mjs';
import { webContentInputs } from './web-content.mjs';

/**
 * Engine profiles (docs/tracks/stock-engine.md; the native split is docs/tracks/single-build.md).
 *
 * `breaka` is the default: Breaka's custom Godot 4.8 with its GodotJS. `stock` is an unmodified Godot 4.7.2 with
 * upstream GodotJS. A profile decides which Godot binary runs the demo, where a run's evidence goes, which GodotJS typings the
 * project is checked against and how the **Web** build is made.
 *
 * What a profile does not decide is the native build. There is one native UI library and one native live-compile extension per
 * platform, bound to the oldest Godot API either profile runs (`NATIVE_BINDING_API`, scripts/native-binding.mjs) and loaded by both
 * engines: a GDExtension loads in the Godot it was bound to or a newer one. The Web is per profile: a Web side module must be linked with
 * the Emscripten of the engine that loads it (4.0.11 for `stock`, 6.0.12 for `breaka`, and Breaka's lazy function-table ABI), so each
 * profile has its own Web target directories, receipts and dump binding (`apiDirectory`).
 *
 * Select one the same way for every script: `--engine=stock` on the command line (`pnpm verify --engine=stock`) or
 * `GODOT_REACT_ENGINE=stock` in the environment. The flag wins over the variable. A script that resolves a profile
 * from the flag exports it as `GODOT_REACT_ENGINE` so the scripts it starts agree. `GODOT` still overrides the
 * profile's Godot binary; the binary's version is checked against the profile before anything runs.
 *
 * The freshness guard (docs/tracks/freshness.md, scripts/freshness.mjs): the build scripts record what each installed build was made from,
 * and every script that runs one refuses it when the sources have moved on or it is bound to another API.
 */
// `import.meta.url`, not `import.meta.dirname`: the unit tests load this file through tsx's CommonJS bridge.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stockRoot = '/Users/ben/Development/godot-stock';
// The Web side module is installed beside the native library, where the one `react_ui.gdextension` names both.
const installDirectory = NATIVE_INSTALL_DIRECTORY;

export const ENGINE_VARIABLE = 'GODOT_REACT_ENGINE';
export const ENGINE_FLAG = '--engine=';
export const DEFAULT_ENGINE = 'breaka';
/** The Cargo package both the native and the Web build compile, and the one a stale target has cleaned. */
export { CARGO_PACKAGE };
const API_DUMPS = ['extension_api.json', 'gdextension_interface.json'];
const WEB_RECEIPT = 'build-receipt.json';

/**
 * The Godot a binary must report for each profile (`godot --version`), and everything else that is per profile. The `web` block is why the Web
 * stays per profile: a Web side module is linked with the Emscripten SDK of the engine whose templates load it (4.0.11 stock, 6.0.12 Breaka's with the
 * lazy function-table ABI), and the two cannot load each other's. The native libraries have no such coupling and are not here (scripts/native-binding.mjs).
 */
const profiles = {
  breaka: {
    name: 'breaka',
    description: "Breaka's custom Godot 4.8 with its GodotJS",
    godot: '/Applications/Godot48.app/Contents/MacOS/Godot',
    versionPrefix: '4.8.',
    // The dump pair the Web side module of this profile is bound to: Breaka's 4.8, which `native/api` holds. (The native builds are bound
    // to the 4.7.2 dumps, for every profile: NATIVE_BINDING_API.)
    apiDirectory: resolve(root, 'native/api'),
    artifacts: resolve(root, 'artifacts'),
    targets: { web: resolve(root, 'target/web'), webProbe: resolve(root, 'target/web-probe') },
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
    // What the launcher script above does. A window that must not take focus starts the binary itself (scripts/quiet-window.mjs).
    directLaunch: {
      command: `${stockRoot}/bin/godot.macos.editor.arm64`,
      env: { HOME: `${stockRoot}/home` },
      directories: [`${stockRoot}/home/Library/Application Support`, `${stockRoot}/home/Library/Caches`],
    },
    versionPrefix: '4.7.',
    apiDirectory: resolve(root, 'native/api/stock-4.7.2'),
    artifacts: resolve(root, 'artifacts/stock'),
    targets: { web: resolve(root, 'target/stock-web'), webProbe: resolve(root, 'target/stock-web-probe') },
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

const webLibrary = resolve(installDirectory, 'godot_react_ui.web.wasm');
const webStamp = resolve(installDirectory, 'react_ui.web.build.json');

/**
 * What the Web build of a profile is made of: the cargo features, its cargo target directory, where cargo leaves the artifact, where it is
 * installed (the `.gdextension` names that path) and the stamp beside each. `fix` is the command that rebuilds it.
 */
function webKind(profile) {
  return {
    features: probe => probe ? ['web', 'probe'] : ['web'],
    target: probe => probe ? profile.targets.webProbe : profile.targets.web,
    built: target => resolve(target, 'wasm32-unknown-emscripten/release/godot_react_ui.wasm'),
    targetStamp: target => resolve(target, 'react_ui.web.build.json'),
    installed: webLibrary, installedStamp: webStamp,
    fix: probe => `pnpm build:web --wasm-only${probe ? ' --probe' : ''} ${ENGINE_FLAG}${profile.name}`,
  };
}

/** The API dump pair a profile's Web build binds against. */
function apiFiles(profile) {
  return API_DUMPS.map(name => resolve(profile.apiDirectory, name));
}

/** The first three numbers of a `godot --version` line (`4.8.beta.custom_build.1225394ce` is 4.8.0, `4.7.2.stable...` is 4.7.2). */
function versionNumbers(version) {
  const found = /^(\d+)\.(\d+)(?:\.(\d+))?/u.exec(version);
  return found === null ? [0, 0, 0] : [Number(found[1]), Number(found[2]), Number(found[3] ?? 0)];
}

/** Whether version `a` is the same as `b` or newer (both as `versionNumbers`). */
function atLeast(a, b) {
  for (let index = 0; index < b.length; index += 1) {
    if (a[index] !== b[index]) return (a[index] ?? 0) > (b[index] ?? 0);
  }
  return true;
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

/** How to start `godot` without its launcher script, if it is a profile's script; `undefined` when `godot` is the binary. */
export function directLaunchOf(godot) {
  return Object.values(profiles).find(profile => profile.godot === godot)?.directLaunch;
}

/**
 * Resolve the engine profile for this process. `argv` is the script's own arguments; the resolved name is exported
 * as `GODOT_REACT_ENGINE` so a script that starts other scripts (`pnpm build`, an editor import) keeps them in step.
 */
export function selectEngine(argv = process.argv.slice(2), env = process.env) {
  const profile = profiles[selectEngineName(argv, env)];
  env[ENGINE_VARIABLE] = profile.name;
  const godot = env.GODOT === undefined || env.GODOT === '' ? profile.godot : env.GODOT;
  const web = webKind(profile);
  const webSourceInputs = probe => collectInputs({ root, apiFiles: apiFiles(profile), features: web.features(probe) });
  return {
    ...profile,
    godot,
    root,
    /** The Web export mode the arguments ask for: `release` if they say `--release`, else `debug`. */
    webMode(argv = process.argv.slice(2)) {
      return argv.includes('--release') ? 'release' : 'debug';
    },
    /** An evidence directory below this profile's artifacts root (`artifacts/<name>` or `artifacts/stock/<name>`). */
    artifactPath: (...names) => resolve(profile.artifacts, ...names),
    /**
     * The API dump pair the profile's Web build binds against, as environment variables. Cargo's `[env]` does not override a variable that is already set,
     * so a Web build sets both itself; the stamp's inputs are the same files. (The native builds bind to `NATIVE_BINDING_API`, for every profile.)
     */
    webBindingEnvironment: () => {
      const [api, bindings] = apiFiles(profile);
      return { GDRUST_GODOT_API_JSON: api, GDRUST_GODOT_INTERFACE_JSON: bindings };
    },
    /**
     * The `godot --version` line of the selected binary. Throws if it is not the profile's engine, or older than the Godot API the native builds are
     * bound to (an extension does not load in an older Godot than it was bound to).
     */
    verifiedVersion() {
      const result = spawnSync(godot, ['--version'], { encoding: 'utf8', timeout: 30_000 });
      if (result.error) throw new Error(`Cannot run ${godot} --version: ${result.error.message}`);
      const version = result.stdout.trim().split('\n').at(-1) ?? '';
      if (!version.startsWith(profile.versionPrefix)) {
        throw new Error(`Engine profile "${profile.name}" expects Godot ${profile.versionPrefix}x, but ${godot} reports "${version}". Select the profile that matches the binary (${ENGINE_FLAG}<name> or ${ENGINE_VARIABLE}), or point GODOT at the right one.`);
      }
      if (!atLeast(versionNumbers(version), versionNumbers(NATIVE_BINDING_API.version))) {
        throw new Error(`${godot} reports Godot "${version}", older than ${NATIVE_BINDING_API.version}, the API the native builds are bound to: a GDExtension loads in the Godot it was bound to or a newer one.`);
      }
      return version;
    },
    /**
     * Fail unless every native build a demo run loads may be loaded: the UI library, and the live-compile extension if one is installed (it is
     * loaded by every run of the demo, not only by the sections that use it). Each must be bound to `NATIVE_BINDING_API`, be the variant asked for
     * (`probe` is the Phase F0/text-layout probe build, `faults` the filters negative-controls build; neither ships) and be built from the current
     * sources. The profile does not enter into it. Both are checked, and a refusal names each one's fix. `liveCompile: false` is for a run that takes
     * the extension out of the project while Godot runs (`gen:types`).
     */
    requireInstalledBuilds({ probe = false, faults = false, liveCompile = true } = {}) {
      const refusals = [nativeRefusal({ probe, faults }), liveCompile ? liveCompileRefusal() : undefined].filter(refusal => refusal !== undefined);
      if (refusals.length > 0) throw new Error(refusals.join('\n'));
    },
    /**
     * Everything a native run needs to be sure of before it starts: the binary is the profile's engine, at least as new as the API the native
     * builds are bound to, and the installed native builds are bound to that API and built from the current sources. Logs which engine the
     * evidence will come from.
     */
    prepareNative({ probe = false, faults = false, liveCompile = true } = {}) {
      const version = this.verifiedVersion();
      this.requireInstalledBuilds({ probe, faults, liveCompile });
      console.log(`Engine profile ${profile.name} (${profile.description}): ${godot}, Godot ${version}; native builds bound to Godot API ${NATIVE_BINDING_API.version}`);
      return version;
    },
    /** The Web side module `build:web` installs for this profile: refuse it unless it is this profile's build of the current sources. */
    requireInstalledWasm: ({ probe = false } = {}) => requireBuild({
      library: web.installed, stamp: readStamp(web.installedStamp), engine: profile.name, probe,
      current: webSourceInputs(probe), subject: `installed ${basename(web.installed)}`, fix: web.fix(probe),
    }),
    /** The stamp of the installed Web side module, for the receipt of an export made from it. */
    installedWasmStamp: () => readStamp(webStamp),
    /**
     * Fail unless the library cargo left in the native target directory is a build of the current sources bound to the native API. The stock
     * typings are generated from it, not from whatever is installed.
     */
    requireBuiltLibrary: requireBuiltNative,
    /**
     * Fail unless the Web export a verifier or the server is about to use carries the profile's side module built
     * from the current sources (the export's receipt records the side module's stamp).
     */
    requireFreshWebExport({ probe = false } = {}) {
      const mode = this.webMode();
      const directory = this.artifactPath(`web-${mode}`);
      requireExport({
        directory, receiptName: WEB_RECEIPT, libraryName: 'godot_react_ui.web.wasm', engine: profile.name, probe, current: webSourceInputs(probe),
        content: webContentInputs({ root, presetName: profile.web.presetName, mode }),
        subject: `Web export ${relative(root, directory)}`,
        fix: `pnpm build:web${mode === 'release' ? ' --release' : ''}${probe ? ' --probe' : ''} ${ENGINE_FLAG}${profile.name}`,
      });
    },
    /** The inputs of the pack, shell and engine template of the Web export in `mode` (scripts/web-content.mjs); the receipt records them. */
    webContentInputs: mode => webContentInputs({ root, presetName: profile.web.presetName, mode }),
    /** The cargo features a Web build enables; `build:web` passes exactly these. */
    webFeatures: ({ probe = false } = {}) => web.features(probe),
    /** The content hashes a Web build is made from (scripts/freshness.mjs). */
    webSourceInputs: ({ probe = false } = {}) => webSourceInputs(probe),
    /**
     * Start a Web build: hash its inputs and, if the artifact cargo left from the last build is not provably a build of them, have `clean` remove
     * this crate's artifacts so cargo cannot keep it. Returns the steps that record the build: `compiled()` once cargo has succeeded (stamps
     * cargo's output; throws if the sources changed while it ran) and `installed()` once the side module is in place.
     */
    beginWebBuild({ probe = false, clean }) {
      const target = web.target(probe);
      return beginBuild({
        identity: { engine: profile.name }, probe, collect: () => webSourceInputs(probe),
        built: web.built(target), targetStamp: web.targetStamp(target), installed: web.installed, installedStamp: web.installedStamp,
        subject: `${profile.name} side module built in ${relative(root, target)}`, compiler: 'the Web build', fix: web.fix(probe), crate: CARGO_PACKAGE, clean,
      });
    },
  };
}
