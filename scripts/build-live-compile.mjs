// Builds the live-compile extension (Bun's TypeScript checker and compiler, live-compile/) and installs it where the demo loads it:
//
//   node scripts/build-live-compile.mjs [--engine=stock] [--cli]
//
//   demo/addons/live-compile/bin/liblive_compile.dylib   the library
//   demo/addons/live-compile/live_compile.gdextension    its manifest (generated: a demo without the extension has no such file)
//   demo/addons/live-compile/live_compile.build.json     the stamp (profile, library hash, inputs) that the verifier's guard reads
//   demo/live-compile/project.json                       the project the editor opens (scripts/live-compile-project.mjs)
//
// `--cli` also builds `live-compile-cli`, the native process that speaks the same requests on stdin and stdout, which
// `scripts/live-compile-agreement.mjs` drives. The Bun sources are extracted from the checkout at the pinned revision into
// live-compile/vendor (generated, ignored) when they are not there; the toolchain is Bun's nightly (live-compile/rust-toolchain.toml).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';
import { stampFor, writeStamp } from './freshness.mjs';
import { BUN_CHECKOUT, INSTALLED_LIBRARY, INSTALLED_STAMP, INSTALL_DIRECTORY, LIBRARY_NAME, liveCompileInputs, targetDirectoryOf, writeGdextension } from './live-compile-build.mjs';

rejectUnknownArguments(process.argv.slice(2), { flags: ['--cli'] });
const root = resolve(import.meta.dirname, '..');
const workspace = resolve(root, 'live-compile');
const engine = selectEngine();
const cargo = process.env.CARGO ?? resolve(homedir(), '.cargo/bin/cargo');
const targetDirectory = targetDirectoryOf(engine);
const env = {
  ...process.env, ...engine.bindingEnvironment(), CARGO_TARGET_DIR: targetDirectory,
  PATH: `${resolve(homedir(), '.cargo/bin')}:${process.env.PATH}`,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: workspace, stdio: 'inherit', env, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Engine profile ${engine.name}: ${engine.description}; target ${targetDirectory}`);
if (!existsSync(resolve(workspace, 'vendor/bun/Cargo.toml'))) run('python3', ['scripts/vendor-bun.py', BUN_CHECKOUT]);
const packages = ['-p', 'live_compile_ext', ...(process.argv.includes('--cli') ? ['-p', 'live_compile_core', '--bin', 'live-compile-cli'] : [])];
run(cargo, ['build', '--locked', '--release', ...packages]);

mkdirSync(resolve(INSTALL_DIRECTORY, 'bin'), { recursive: true });
// A rename swaps the directory entry: a running Godot that has the old library mapped keeps its inode.
const staged = `${INSTALLED_LIBRARY}.${process.pid}.tmp`;
copyFileSync(resolve(targetDirectory, 'release', LIBRARY_NAME), staged);
renameSync(staged, INSTALLED_LIBRARY);
writeGdextension();
writeStamp(INSTALLED_STAMP, stampFor({ library: INSTALLED_LIBRARY, engine: engine.name, probe: false, inputs: liveCompileInputs(engine) }));
run('node', [resolve(root, 'scripts/live-compile-project.mjs')], { cwd: root, env: { ...process.env } });
console.log(`Installed live-compile (${engine.name} profile): ${INSTALLED_LIBRARY}`);
