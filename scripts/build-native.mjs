import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cargo = process.env.CARGO ?? resolve(homedir(), '.cargo/bin/cargo');
// `--probe` builds the Phase F0 evidence probe (cargo feature `probe`) into its own target directory,
// leaving the default build's cache alone, and installs it over the default library. Run a default
// `pnpm build:native` afterwards: the probe must never ship.
const probe = process.argv.includes('--probe');
const targetDirectory = probe ? resolve(root, 'target/probe') : resolve(root, 'target');
const result = spawnSync(cargo, ['build', '--locked', '--release', ...(probe ? ['--features', 'probe'] : [])], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, CARGO_TARGET_DIR: targetDirectory, PATH: `${resolve(homedir(), '.cargo/bin')}:${process.env.PATH}` },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const library = process.platform === 'darwin' ? 'libgodot_react_ui.dylib'
  : process.platform === 'linux' ? 'libgodot_react_ui.so' : 'godot_react_ui.dll';
const destination = resolve(root, 'demo/addons/godot-react-ui/bin');
mkdirSync(destination, {recursive: true});
// copyFileSync truncates and rewrites an existing destination in place, which corrupts the
// library for any running Godot that has it mapped. Write a sibling file and rename it over
// the old one: the rename swaps the directory entry, and running processes keep their inode.
const staged = resolve(destination, `${library}.${process.pid}.tmp`);
copyFileSync(resolve(targetDirectory, 'release', library), staged);
renameSync(staged, resolve(destination, library));
console.log(`Installed native extension${probe ? ' (PROBE BUILD, replace with a default build)' : ''}: ${destination}/${library}`);
