import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { installFile } from './freshness.mjs';
import { beginNativeBuild, CARGO_PACKAGE, NATIVE_BINDING_API, NATIVE_INSTALL_DIRECTORY, NATIVE_LIBRARY_NAME, nativeBindingEnvironment, nativeVariant } from './native-binding.mjs';

// There is one native library, bound to Godot API 4.7.2 (`NATIVE_BINDING_API`, scripts/native-binding.mjs) and loaded by both engine profiles, so this
// script has no engine profile: `--engine=` is refused. It builds in `target/` and installs over the one path where the `.gdextension` expects it, and
// records the API it is bound to: a run refuses a library bound to another API (docs/tracks/single-build.md).
rejectUnknownArguments(process.argv.slice(2), { flags: ['--probe', '--faults'], engine: false });
const root = resolve(import.meta.dirname, '..');
const cargo = process.env.CARGO ?? resolve(homedir(), '.cargo/bin/cargo');
// `--probe` builds the Phase F0 evidence probe (cargo feature `probe`) into its own target directory,
// leaving the default build's cache alone, and installs it over the default library. Run a default
// `pnpm build:native` afterwards: the probe must never ship.
// `--faults` does the same for the filters negative controls (cargo feature `filter-faults`, native/filter_faults.rs).
// Each is a feature set of its own with its own target directory and its own stamp: a build with both would land in the probe's
// directory with both features, and every run would then refuse that library (the freshness guard knows one set at a time).
const probe = process.argv.includes('--probe');
const faults = process.argv.includes('--faults');
if (probe && faults) throw new Error('--probe and --faults are separate builds: run one, then the other (and a default build afterwards).');
const variant = nativeVariant({ probe, faults });
console.log(`Native library bound to Godot API ${NATIVE_BINDING_API.version}; target ${variant.target}`);
// Cargo's `[env]` (.cargo/config.toml) does not override a variable already set, so the binding is set here, from the same record the stamp uses.
const env = { ...process.env, ...nativeBindingEnvironment(), CARGO_TARGET_DIR: variant.target, PATH: `${resolve(homedir(), '.cargo/bin')}:${process.env.PATH}` };

function runCargo(cargoArgs) {
  const result = spawnSync(cargo, cargoArgs, { cwd: root, stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Cargo rebuilds from file modification times, so a source restored to old content with its old mtime keeps the
// artifact built from the other content (docs/tracks/freshness.md). `beginNativeBuild` hashes the inputs and, unless the
// target's own stamp says its artifact is a build of exactly these, cleans this crate (not its dependencies) first.
const build = beginNativeBuild({ probe, faults, clean: () => runCargo(['clean', '--locked', '-p', CARGO_PACKAGE, '--release']) });
runCargo(['build', '--locked', '--release', ...(variant.features.length > 0 ? ['--features', variant.features.join(',')] : [])]);
build.compiled();
// Staged and renamed, never copied over the installed library: a running Godot has it mapped (scripts/freshness.mjs `installFile`).
installFile(variant.built, resolve(NATIVE_INSTALL_DIRECTORY, NATIVE_LIBRARY_NAME));
build.installed();
const kind = probe ? ', PROBE BUILD, replace with a default build' : faults ? ', FAULTS BUILD, replace with a default build' : '';
console.log(`Installed native extension (bound to Godot API ${NATIVE_BINDING_API.version}${kind}): ${NATIVE_INSTALL_DIRECTORY}/${NATIVE_LIBRARY_NAME}`);
