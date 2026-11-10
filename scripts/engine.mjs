import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beginBuild, collectInputs, readStamp, requireBuild, requireExport } from './freshness.mjs';
import { godotTscRefusal, godotTscWebExportProblem } from './godot-tsc.mjs';
import { CARGO_PACKAGE, NATIVE_BINDING_API, NATIVE_INSTALL_DIRECTORY, nativeRefusal, requireBuiltNative } from './native-binding.mjs';
import { webContentInputs } from './web-content.mjs';

/**
 * Engine profiles.
 *
 * `breaka` is the default: Breaka's custom Godot 4.8 with its GodotJS. `stock` is an unmodified Godot 4.7.2 with
 * upstream GodotJS. A profile decides which Godot binary runs the demo, where a run's evidence goes, which GodotJS typings the
 * project is checked against and how the **Web** build is made.
 *
 * What a profile does not decide is the native build. There is one native UI library and one native godot-tsc library (the code editor's
 * checker and transpiler, a package: scripts/godot-tsc.mjs) per platform, bound to the oldest Godot API either profile runs (`NATIVE_BINDING_API`, scripts/native-binding.mjs) and loaded by both
 * engines: a GDExtension loads in the Godot it was bound to or a newer one. The Web is per profile: a Web side module must be linked with
 * the Emscripten of the engine that loads it (4.0.11 for `stock`, 6.0.12 for `breaka`, and Breaka's lazy function-table ABI), so each
 * profile has its own Web target directories, receipts and dump binding (`apiDirectory`).
 *
 * Select one the same way for every script: `--engine=stock` on the command line (`pnpm verify --engine=stock`) or
 * `GODOT_REACT_ENGINE=stock` in the environment. The flag wins over the variable. A script that resolves a profile
 * from the flag exports it as `GODOT_REACT_ENGINE` so the scripts it starts agree. `GODOT` still overrides the
 * profile's Godot binary; the binary's version is checked against the profile before anything runs.
 *
 * The freshness guard (scripts/freshness.mjs): the build scripts record what each installed build was made from,
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
    // `webNothreads` is the side module for a Web export without threads, which the package ships beside the threaded one. Breaka's profile
    // has none: its Web templates are threaded.
    targets: { web: resolve(root, 'target/stock-web'), webProbe: resolve(root, 'target/stock-web-probe'), webNothreads: resolve(root, 'target/stock-web-nothreads') },
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

/**
 * The Web side module's file in the addon for each threading of a Web export, as `react_ui.gdextension` names it (`web.*.threads.wasm32`,
 * `web.*.nothreads.wasm32`). A module imports the engine's memory, shared or not, so neither loads in the other kind of export.
 */
export const WEB_LIBRARY_NAMES = Object.freeze({ threads: 'godot_react_ui.web.wasm', nothreads: 'godot_react_ui.web.nothreads.wasm' });
const WEB_STAMP_NAMES = Object.freeze({ threads: 'react_ui.web.build.json', nothreads: 'react_ui.web.nothreads.build.json' });
const webStamp = resolve(installDirectory, WEB_STAMP_NAMES.threads);

/**
 * What one Web build of a profile is made of: the cargo features, its cargo target directory, where cargo leaves the artifact, where it is
 * installed (the `.gdextension` names that path) and the stamp beside each. `fix` is the command that rebuilds it. `threads: false` is the
 * side module for an export without threads (cargo feature `web-nothreads`), a build of its own beside the threaded one.
 */
function webKind(profile, { probe = false, threads = true } = {}) {
  if (!threads && probe) throw new Error('--probe and --nothreads are separate builds: the probe is a threaded build.');
  if (!threads && profile.targets.webNothreads === undefined) {
    throw new Error(`The ${profile.name} profile has no Web build without threads: its Web templates are threaded.`);
  }
  const threading = threads ? 'threads' : 'nothreads';
  const target = !threads ? profile.targets.webNothreads : probe ? profile.targets.webProbe : profile.targets.web;
  return {
    features: !threads ? ['web-nothreads'] : probe ? ['web', 'probe'] : ['web'],
    target,
    built: resolve(target, 'wasm32-unknown-emscripten/release/godot_react_ui.wasm'),
    targetStamp: resolve(target, WEB_STAMP_NAMES.threads),
    installed: resolve(installDirectory, WEB_LIBRARY_NAMES[threading]),
    installedStamp: resolve(installDirectory, WEB_STAMP_NAMES[threading]),
    fix: `pnpm build:web --wasm-only${probe ? ' --probe' : ''}${threads ? '' : ' --nothreads'} ${ENGINE_FLAG}${profile.name}`,
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
  const webSourceInputs = web => collectInputs({ root, apiFiles: apiFiles(profile), features: web.features });
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
     * Fail unless every native build a demo run loads may be loaded: the UI library, and the godot-tsc addon if one is installed (it is loaded
     * by every run of the demo, not only by the sections that use it). Each must be bound to `NATIVE_BINDING_API`. The UI library must be the variant
     * asked for (`probe` is the evidence/text-layout probe build, `faults` the filters negative-controls build; neither ships) and built from the
     * current sources; the addon must be the package's current build (scripts/godot-tsc.mjs). The profile does not enter into it. Both are checked,
     * and a refusal names each one's fix. `godotTsc: false` is for a run that takes the addon out of the project while Godot runs (`gen:types`).
     */
    requireInstalledBuilds({ probe = false, faults = false, godotTsc = true } = {}) {
      const refusals = [nativeRefusal({ probe, faults }), godotTsc ? godotTscRefusal() : undefined].filter(refusal => refusal !== undefined);
      if (refusals.length > 0) throw new Error(refusals.join('\n'));
    },
    /**
     * Everything a native run needs to be sure of before it starts: the binary is the profile's engine, at least as new as the API the native
     * builds are bound to, and the installed native builds are bound to that API and built from the current sources. Logs which engine the
     * evidence will come from.
     */
    prepareNative({ probe = false, faults = false, godotTsc = true } = {}) {
      const version = this.verifiedVersion();
      this.requireInstalledBuilds({ probe, faults, godotTsc });
      console.log(`Engine profile ${profile.name} (${profile.description}): ${godot}, Godot ${version}; native builds bound to Godot API ${NATIVE_BINDING_API.version}`);
      return version;
    },
    /** The Web side module `build:web` installs for this profile: refuse it unless it is this profile's build of the current sources. */
    requireInstalledWasm({ probe = false, threads = true } = {}) {
      const web = webKind(profile, { probe, threads });
      requireBuild({
        library: web.installed, stamp: readStamp(web.installedStamp), engine: profile.name, probe,
        current: webSourceInputs(web), subject: `installed ${basename(web.installed)}`, fix: web.fix,
      });
    },
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
        directory, receiptName: WEB_RECEIPT, libraryName: WEB_LIBRARY_NAMES.threads, engine: profile.name, probe,
        current: webSourceInputs(webKind(profile, { probe })),
        content: webContentInputs({ root, presetName: profile.web.presetName, mode }),
        subject: `Web export ${relative(root, directory)}`,
        fix: `pnpm build:web${mode === 'release' ? ' --release' : ''}${probe ? ' --probe' : ''} ${ENGINE_FLAG}${profile.name}`,
      });
      // The godot-tsc Web side module is per profile as well: the export carries this profile's or none, never another's (the page loads whatever
      // the pack's manifest lists, and another profile's Emscripten kills it at load).
      const receipt = JSON.parse(readFileSync(join(directory, WEB_RECEIPT), 'utf8'));
      const moduleProblem = godotTscWebExportProblem(this, directory, receipt.godotTsc);
      if (moduleProblem !== undefined) {
        throw new Error(`${moduleProblem} Run \`pnpm build:web --export-only${mode === 'release' ? ' --release' : ''} ${ENGINE_FLAG}${profile.name}\` first (it says what to install if the installed addon is not the package's).`);
      }
    },
    /** The inputs of the pack, shell and engine template of the Web export in `mode` (scripts/web-content.mjs); the receipt records them. */
    webContentInputs: mode => webContentInputs({ root, presetName: profile.web.presetName, mode }),
    /** The cargo features a Web build enables; `build:web` passes exactly these. */
    webFeatures: ({ probe = false, threads = true } = {}) => webKind(profile, { probe, threads }).features,
    /** The content hashes a Web build is made from (scripts/freshness.mjs). */
    webSourceInputs: ({ probe = false, threads = true } = {}) => webSourceInputs(webKind(profile, { probe, threads })),
    /** Where a Web build is compiled, where cargo leaves its module and where the module is installed. */
    webBuildPaths({ probe = false, threads = true } = {}) {
      const { target, built, installed } = webKind(profile, { probe, threads });
      return { target, built, installed };
    },
    /**
     * Start a Web build: hash its inputs and, if the artifact cargo left from the last build is not provably a build of them, have `clean` remove
     * this crate's artifacts so cargo cannot keep it. Returns the steps that record the build: `compiled()` once cargo has succeeded (stamps
     * cargo's output; throws if the sources changed while it ran) and `installed()` once the side module is in place.
     */
    beginWebBuild({ probe = false, threads = true, clean }) {
      const web = webKind(profile, { probe, threads });
      return beginBuild({
        identity: { engine: profile.name }, probe, collect: () => webSourceInputs(web),
        built: web.built, targetStamp: web.targetStamp, installed: web.installed, installedStamp: web.installedStamp,
        subject: `${profile.name} side module built in ${relative(root, web.target)}`, compiler: 'the Web build', fix: web.fix, crate: CARGO_PACKAGE, clean,
      });
    },
  };
}
