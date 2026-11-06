import { spawnSync } from 'node:child_process';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectInputs, prepareTarget, readStamp, requireBuild, requireExport, stampFor, writeStamp } from './freshness.mjs';

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
 *
 * The profile also owns the freshness guard (docs/tracks/freshness.md, scripts/freshness.mjs): the build scripts record
 * what each installed build was made from, and every script that runs one refuses it when the sources have moved on.
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
/** The Cargo package both builds compile, and the one a stale target has cleaned. */
export const CARGO_PACKAGE = 'godot-react-ui';
const API_DUMPS = ['extension_api.json', 'gdextension_interface.json'];
const WEB_RECEIPT = 'build-receipt.json';

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

/**
 * The two artifacts a build makes, by kind: the cargo features that build uses, its cargo target directory, where
 * cargo leaves the artifact, where it is installed (the `.gdextension` names that path) and the stamp beside each.
 * `fix` is the command that rebuilds it.
 */
function buildKinds(profile) {
  const flag = `${ENGINE_FLAG}${profile.name}`;
  return {
    native: {
      features: probe => probe ? ['probe'] : [],
      target: probe => probe ? profile.targets.nativeProbe : profile.targets.native,
      built: target => resolve(target, 'release', libraryName),
      targetStamp: target => resolve(target, 'react_ui.build.json'),
      installed: resolve(installDirectory, libraryName), installedStamp: nativeStamp,
      fix: probe => `pnpm build:native${probe ? ' --probe' : ''} ${flag}`,
    },
    web: {
      features: probe => probe ? ['web', 'probe'] : ['web'],
      target: probe => probe ? profile.targets.webProbe : profile.targets.web,
      built: target => resolve(target, 'wasm32-unknown-emscripten/release/godot_react_ui.wasm'),
      targetStamp: target => resolve(target, 'react_ui.web.build.json'),
      installed: webLibrary, installedStamp: webStamp,
      fix: probe => `pnpm build:web --wasm-only${probe ? ' --probe' : ''} ${flag}`,
    },
  };
}

/** The API dump pair a profile's cargo build binds against (the default profile's is the one `.cargo/config.toml` names). */
function apiFiles(profile) {
  return API_DUMPS.map(name => resolve(profile.apiDirectory ?? resolve(root, 'native/api'), name));
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

/**
 * Resolve the engine profile for this process. `argv` is the script's own arguments; the resolved name is exported
 * as `GODOT_REACT_ENGINE` so a script that starts other scripts (`pnpm build`, an editor import) keeps them in step.
 */
export function selectEngine(argv = process.argv.slice(2), env = process.env) {
  const profile = profiles[selectEngineName(argv, env)];
  env[ENGINE_VARIABLE] = profile.name;
  const godot = env.GODOT === undefined || env.GODOT === '' ? profile.godot : env.GODOT;
  const kinds = buildKinds(profile);
  const sourceInputs = (kind, probe) => collectInputs({ root, apiFiles: apiFiles(profile), features: kinds[kind].features(probe) });
  const requireInstalled = (kind, { probe }) => requireBuild({
    library: kinds[kind].installed, stamp: readStamp(kinds[kind].installedStamp), engine: profile.name, probe,
    current: sourceInputs(kind, probe), subject: `installed ${basename(kinds[kind].installed)}`, fix: kinds[kind].fix(probe),
  });
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
    /**
     * Fail unless the installed native library is this profile's build of the current sources, so a run never
     * exercises a library bound to the other engine or older than the code. `probe` says whether the Phase
     * F0/text-layout probe build is wanted (it never ships).
     */
    requireInstalledLibrary: ({ probe = false } = {}) => requireInstalled('native', { probe }),
    /**
     * Everything a native run needs to be sure of before it starts: the binary is the profile's engine and the
     * installed library is the profile's build of the current sources. Logs which engine the evidence will come from.
     */
    prepareNative({ probe = false } = {}) {
      const version = this.verifiedVersion();
      this.requireInstalledLibrary({ probe });
      console.log(`Engine profile ${profile.name} (${profile.description}): ${godot}, Godot ${version}`);
      return version;
    },
    /** The same two, for the Web side module `build:web` installs. */
    requireInstalledWasm: ({ probe = false } = {}) => requireInstalled('web', { probe }),
    /** The stamp of the installed Web side module, for the receipt of an export made from it. */
    installedWasmStamp: () => readStamp(webStamp),
    /**
     * Fail unless the library cargo left in this profile's native target directory is the profile's build of the
     * current sources. The stock typings are generated from it, not from whatever is installed.
     */
    requireBuiltLibrary() {
      const kind = kinds.native;
      const target = kind.target(false);
      requireBuild({
        library: kind.built(target), stamp: readStamp(kind.targetStamp(target)), engine: profile.name, probe: false,
        current: sourceInputs('native', false), subject: `${profile.name} library built in ${relative(root, target)}`, fix: kind.fix(false),
      });
    },
    /**
     * Fail unless the Web export a verifier or the server is about to use carries the profile's side module built
     * from the current sources (the export's receipt records the side module's stamp).
     */
    requireFreshWebExport({ probe = false } = {}) {
      const mode = this.webMode();
      const directory = this.artifactPath(`web-${mode}`);
      requireExport({
        directory, receiptName: WEB_RECEIPT, libraryName: 'godot_react_ui.web.wasm', engine: profile.name, probe, current: sourceInputs('web', probe),
        subject: `Web export ${relative(root, directory)}`,
        fix: `pnpm build:web${mode === 'release' ? ' --release' : ''}${probe ? ' --probe' : ''} ${ENGINE_FLAG}${profile.name}`,
      });
    },
    /** The cargo features a build of `kind` (`native` or `web`) enables; the build scripts pass exactly these. */
    features: (kind, { probe = false } = {}) => kinds[kind].features(probe),
    /** The content hashes a build of `kind` is made from (scripts/freshness.mjs). */
    sourceInputs: (kind, { probe = false } = {}) => sourceInputs(kind, probe),
    /**
     * Start a build of `kind` (`native` or `web`): hash its inputs and, if the artifact cargo left from the last build
     * is not provably a build of them, have `clean` remove this crate's artifacts so cargo cannot keep it. Returns the
     * steps that record the build: `compiled()` once cargo has succeeded (stamps cargo's output; throws if the sources
     * changed while it ran) and `installed()` once the artifact is in place.
     */
    beginBuild(kind, { probe = false, clean }) {
      const spec = kinds[kind];
      const target = spec.target(probe);
      const built = spec.built(target);
      const subject = `${profile.name} ${kind === 'native' ? 'library' : 'side module'} built in ${relative(root, target)}`;
      const inputs = sourceInputs(kind, probe);
      prepareTarget({
        stampPath: spec.targetStamp(target), library: built, engine: profile.name, probe, current: inputs, subject,
        clean: reason => {
          console.log(`${reason} Cleaning ${CARGO_PACKAGE} so cargo rebuilds it from the current sources (its dependencies stay cached).`);
          clean();
        },
      });
      return {
        compiled() {
          if (sourceInputs(kind, probe).digest !== inputs.digest) {
            throw new Error(`The sources changed while ${kind === 'native' ? 'cargo' : 'the Web build'} was compiling them, so the result cannot be stamped. Run \`${spec.fix(probe)}\` again.`);
          }
          writeStamp(spec.targetStamp(target), stampFor({ library: built, engine: profile.name, probe, inputs }));
        },
        installed: () => writeStamp(spec.installedStamp, stampFor({ library: spec.installed, engine: profile.name, probe, inputs })),
      };
    },
  };
}
