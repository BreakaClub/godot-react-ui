import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { argsWithoutEngine, CARGO_PACKAGE, selectEngine } from './engine.mjs';

const root = resolve(import.meta.dirname, '..');
const cargo = process.env.CARGO ?? resolve(homedir(), '.cargo/bin/cargo');
// Which engine the library is bound to: `--engine=stock` / `GODOT_REACT_ENGINE=stock` (scripts/engine.mjs). The
// default profile builds in `target/` against native/api as before; `stock` builds in `target/stock` against
// native/api/stock-4.7.2, so the two never invalidate each other's cache. Either profile installs over the
// same path, where the `.gdextension` expects it, and records whose build it is: the verifiers refuse the other's.
const engine = selectEngine();
const supportedArgs = new Set(['--probe', '--faults']);
for (const arg of argsWithoutEngine(process.argv.slice(2))) if (!supportedArgs.has(arg)) throw new Error(`Unknown argument: ${arg}`);
// `--probe` builds the Phase F0 evidence probe (cargo feature `probe`) into its own target directory,
// leaving the default build's cache alone, and installs it over the default library. Run a default
// `pnpm build:native` afterwards: the probe must never ship.
// `--faults` does the same for the filters negative controls (cargo feature `filter-faults`, native/filter_faults.rs).
const probe = process.argv.includes('--probe');
const faults = process.argv.includes('--faults');
const targetDirectory = probe ? engine.targets.nativeProbe : faults ? engine.targets.nativeFaults : engine.targets.native;
const features = engine.features('native', { probe, faults });
console.log(`Engine profile ${engine.name}: ${engine.description}; target ${targetDirectory}`);
const env = { ...process.env, ...engine.bindingEnvironment(), CARGO_TARGET_DIR: targetDirectory, PATH: `${resolve(homedir(), '.cargo/bin')}:${process.env.PATH}` };

function runCargo(cargoArgs) {
  const result = spawnSync(cargo, cargoArgs, { cwd: root, stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Cargo rebuilds from file modification times, so a source restored to old content with its old mtime keeps the
// artifact built from the other content (docs/tracks/freshness.md). `beginBuild` hashes the inputs and, unless the
// target's own stamp says its artifact is a build of exactly these, cleans this crate (not its dependencies) first.
const build = engine.beginBuild('native', { probe, faults, clean: () => runCargo(['clean', '--locked', '-p', CARGO_PACKAGE, '--release']) });
runCargo(['build', '--locked', '--release', ...(features.length > 0 ? ['--features', features.join(',')] : [])]);
build.compiled();
const library = engine.libraryName;
const destination = engine.installDirectory;
mkdirSync(destination, {recursive: true});
// copyFileSync truncates and rewrites an existing destination in place, which corrupts the
// library for any running Godot that has it mapped. Write a sibling file and rename it over
// the old one: the rename swaps the directory entry, and running processes keep their inode.
const staged = resolve(destination, `${library}.${process.pid}.tmp`);
copyFileSync(resolve(targetDirectory, 'release', library), staged);
renameSync(staged, resolve(destination, library));
build.installed();
const kind = probe ? ', PROBE BUILD, replace with a default build' : faults ? ', FAULTS BUILD, replace with a default build' : '';
console.log(`Installed native extension (${engine.name} profile${kind}): ${destination}/${library}`);
