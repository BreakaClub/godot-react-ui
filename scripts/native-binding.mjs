// The native builds: the Godot API they are bound to, where they are built and installed, and the guard every native run uses on them.
// docs/tracks/single-build.md has the decision; this file is the one place that names the API.
//
// There is one native UI library and one native live-compile extension per platform, and both engine profiles load them. A GDExtension
// loads in the Godot it was bound to or a newer one, never an older one (godot-rust: "compiled against newer Godot version"), so a build bound to
// the oldest engine that is run serves them all. That engine is Godot 4.7.2, the `stock` profile's. A build records the API it is bound to
// and the hash of its dump pair (`binding`), never a profile; a run accepts it under either profile, and refuses one bound to another API.
//
// What stays per profile is the Web (scripts/engine.mjs): a Web side module must be linked with the Emscripten of the engine that loads it.
import { createHash } from 'node:crypto';
import { closeSync, openSync, readFileSync, readSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beginBuild, collectInputs, readStamp, findProblem } from './freshness.mjs';

// `import.meta.url`, not `import.meta.dirname`: the unit tests load this file through tsx's CommonJS bridge.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DUMP_DIRECTORY = 'native/api/stock-4.7.2';
/** The first bytes of a dump hold its `header` (version_major, version_minor, version_patch). */
const DUMP_HEADER_BYTES = 1024;

/** The Cargo package the native build compiles, and the one a stale target has cleaned. */
export const CARGO_PACKAGE = 'godot-react-ui';
export const NATIVE_LIBRARY_NAME = process.platform === 'darwin' ? 'libgodot_react_ui.dylib'
  : process.platform === 'linux' ? 'libgodot_react_ui.so' : 'godot_react_ui.dll';
/** Where the `.gdextension` expects the library, and the stamp that says what it was built from. */
export const NATIVE_INSTALL_DIRECTORY = resolve(root, 'demo/addons/godot-react-ui/bin');
export const NATIVE_INSTALLED_LIBRARY = resolve(NATIVE_INSTALL_DIRECTORY, NATIVE_LIBRARY_NAME);
export const NATIVE_INSTALLED_STAMP = resolve(NATIVE_INSTALL_DIRECTORY, 'react_ui.build.json');
/** One cargo target directory per variant of the build, none per profile. `probe` and `faults` never ship (below). */
export const NATIVE_TARGETS = Object.freeze({ default: resolve(root, 'target'), probe: resolve(root, 'target/probe'), faults: resolve(root, 'target/faults') });

/**
 * The Godot API the native UI library and the native live-compile extension are compiled against: `version`, and the two dumps godot-rust
 * generates its bindings from (`GDRUST_GODOT_API_JSON`, `GDRUST_GODOT_INTERFACE_JSON`; `.cargo/config.toml` names the same files for a plain
 * `cargo` run, and a test holds the two together). The dumps are of stock Godot 4.7.2 and are not an engine profile: Breaka's 4.8 loads builds
 * bound to them (docs/tracks/stock-engine.md S4 found no 4.8-only API in `native/**\/*.rs`; the manifests say `compatibility_minimum = "4.7"`).
 */
export const NATIVE_BINDING_API = Object.freeze({
  version: '4.7.2',
  dumps: Object.freeze({
    extensionApi: resolve(root, DUMP_DIRECTORY, 'extension_api.json'),
    gdextensionInterface: resolve(root, DUMP_DIRECTORY, 'gdextension_interface.json'),
  }),
});

/** The API dump pair as godot-rust's environment variables. Cargo's `[env]` does not override one already set, so builds set these explicitly. */
export function nativeBindingEnvironment() {
  return { GDRUST_GODOT_API_JSON: NATIVE_BINDING_API.dumps.extensionApi, GDRUST_GODOT_INTERFACE_JSON: NATIVE_BINDING_API.dumps.gdextensionInterface };
}

/** The dump pair, as the `apiFiles` of a build's inputs (scripts/freshness.mjs `collectInputs`). */
export function nativeDumpFiles() {
  return [NATIVE_BINDING_API.dumps.extensionApi, NATIVE_BINDING_API.dumps.gdextensionInterface];
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** The Godot version a dump was generated from, read from its header: `4.7.2`. */
export function dumpVersion(path) {
  const buffer = Buffer.alloc(DUMP_HEADER_BYTES);
  const descriptor = openSync(path, 'r');
  let length;
  try {
    length = readSync(descriptor, buffer, 0, DUMP_HEADER_BYTES, 0);
  } finally {
    closeSync(descriptor);
  }
  const version = /"version_major":\s*(\d+),\s*"version_minor":\s*(\d+),\s*"version_patch":\s*(\d+)/u.exec(buffer.toString('utf8', 0, length));
  if (version === null) throw new Error(`${path} has no version header: it is not a Godot extension_api.json dump.`);
  return `${version[1]}.${version[2]}.${version[3]}`;
}

/**
 * What a native build must be bound to, as a stamp records it: `{ api, dump }`, the API version and the hash of the dump pair. Throws if the dump
 * is not a dump of the version `NATIVE_BINDING_API` names, so the record and the files cannot drift apart.
 */
export function nativeBinding() {
  const dumped = dumpVersion(NATIVE_BINDING_API.dumps.extensionApi);
  if (dumped !== NATIVE_BINDING_API.version) {
    throw new Error(`NATIVE_BINDING_API names Godot ${NATIVE_BINDING_API.version}, but ${relative(root, NATIVE_BINDING_API.dumps.extensionApi)} is a dump of Godot ${dumped}: change them together (docs/tracks/single-build.md).`);
  }
  const dump = createHash('sha256');
  for (const file of nativeDumpFiles()) dump.update(sha256(file));
  return { api: NATIVE_BINDING_API.version, dump: dump.digest('hex') };
}

/**
 * The three variants of the native build, each with its own cargo target directory and stamp: the default build, the Phase F0/text-layout
 * `probe` build (cargo feature `probe`) and the filters negative-controls `faults` build (feature `filter-faults`, native/filter_faults.rs).
 * Neither of the last two ships, and a run refuses a variant it did not ask for because the stamp's features differ.
 */
export function nativeVariant({ probe = false, faults = false } = {}) {
  if (probe && faults) throw new Error('--probe and --faults are separate builds: one feature set at a time.');
  const target = probe ? NATIVE_TARGETS.probe : faults ? NATIVE_TARGETS.faults : NATIVE_TARGETS.default;
  return {
    probe, faults, target,
    features: [...probe ? ['probe'] : [], ...faults ? ['filter-faults'] : []],
    built: resolve(target, 'release', NATIVE_LIBRARY_NAME),
    targetStamp: resolve(target, 'react_ui.build.json'),
    fix: `pnpm build:native${probe ? ' --probe' : ''}${faults ? ' --faults' : ''}`,
  };
}

/** What a build of the variant is made from, as content hashes (scripts/freshness.mjs): `native/`, the manifests, the cargo config, the dump pair and the features. */
export function nativeSourceInputs(options = {}) {
  return collectInputs({ root, apiFiles: nativeDumpFiles(), features: nativeVariant(options).features });
}

/**
 * Why a native run must not load the installed library, or undefined when it may: it must be bound to `NATIVE_BINDING_API`, be the variant the
 * run asked for and be built from the sources as they are now. Under either engine profile: the profile does not enter into it. The message ends
 * with the command that fixes it.
 */
export function nativeRefusal(options = {}) {
  const variant = nativeVariant(options);
  const problem = findProblem({
    library: NATIVE_INSTALLED_LIBRARY, stamp: readStamp(NATIVE_INSTALLED_STAMP), binding: nativeBinding(), probe: variant.probe,
    current: nativeSourceInputs(options), subject: `installed ${basename(NATIVE_INSTALLED_LIBRARY)}`,
  });
  return problem === undefined ? undefined : `${problem} Run \`${variant.fix}\` first.`;
}

/** Throws the refusal `nativeRefusal` gives, if there is one. */
export function requireInstalledNative(options = {}) {
  const refusal = nativeRefusal(options);
  if (refusal !== undefined) throw new Error(refusal);
}

/**
 * Throws unless the library cargo left in the default target directory is a build of the current sources bound to `NATIVE_BINDING_API`. The stock
 * typings are generated from it, not from whatever is installed (scripts/typings.mjs).
 */
export function requireBuiltNative() {
  const variant = nativeVariant();
  const problem = findProblem({
    library: variant.built, stamp: readStamp(variant.targetStamp), binding: nativeBinding(), probe: false,
    current: nativeSourceInputs(), subject: `native library built in ${relative(root, variant.target)}`,
  });
  if (problem !== undefined) throw new Error(`${problem} Run \`${variant.fix}\` first.`);
}

/**
 * Start a native build: hash its inputs and, if the artifact cargo left from the last build is not provably a build of them, have `clean` remove
 * this crate's artifacts so cargo cannot keep it. Returns the steps that record the build (scripts/freshness.mjs `beginBuild`).
 */
export function beginNativeBuild({ probe = false, faults = false, clean }) {
  const variant = nativeVariant({ probe, faults });
  const binding = nativeBinding();
  return beginBuild({
    identity: { binding }, probe, collect: () => nativeSourceInputs({ probe, faults }),
    built: variant.built, targetStamp: variant.targetStamp, installed: NATIVE_INSTALLED_LIBRARY, installedStamp: NATIVE_INSTALLED_STAMP,
    subject: `native library built in ${relative(root, variant.target)}`, compiler: 'cargo', fix: variant.fix, crate: CARGO_PACKAGE, clean,
  });
}
