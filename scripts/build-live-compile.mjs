// Builds the live-compile extension (Bun's TypeScript checker and compiler, live-compile/) and installs it where the demo loads it:
//
//   node scripts/build-live-compile.mjs [--cli]
//
//   demo/addons/live-compile/bin/liblive_compile.dylib   the library
//   demo/addons/live-compile/live_compile.gdextension    its manifest (generated: a demo without the extension has no such file)
//   demo/addons/live-compile/live_compile.build.json     the stamp (the Godot API it is bound to, library hash, inputs) that the verifier's guard reads
//   live-compile/target/live_compile.build.json          the same stamp beside cargo's output: it says whether cargo's artifact can be trusted
//   demo/live-compile/project.json                       the project the editor opens (scripts/live-compile-project.mjs)
//
// One build serves both engine profiles: it is bound to the Godot API `NATIVE_BINDING_API` names (scripts/native-binding.mjs), 4.7.2, which Breaka's 4.8
// loads as well as the stock 4.7.2 does. So there is no `--engine=` here.
//
// `--cli` also builds `live-compile-cli`, the native process that speaks the same requests on stdin and stdout, which
// `scripts/live-compile-agreement.mjs` drives (and which is built again whenever it was there, so that a clean does not lose it). The Bun sources are extracted from the checkout at the pinned revision into
// live-compile/vendor (generated, ignored) when they are not there; the toolchain is Bun's nightly (live-compile/rust-toolchain.toml).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { relative, resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { beginBuild, installFile } from './freshness.mjs';
import { BUN_CHECKOUT, FIX, INSTALLED_LIBRARY, INSTALLED_STAMP, LIBRARY_NAME, liveCompileInputs, liveCompileLayout, writeGdextension } from './live-compile-build.mjs';
import { NATIVE_BINDING_API, nativeBinding, nativeBindingEnvironment } from './native-binding.mjs';

rejectUnknownArguments(process.argv.slice(2), { flags: ['--cli'], engine: false });
const root = resolve(import.meta.dirname, '..');
const workspace = resolve(root, 'live-compile');
const cargo = process.env.CARGO ?? resolve(homedir(), '.cargo/bin/cargo');
const layout = liveCompileLayout();
const targetDirectory = layout.targetDirectory;
// The workspace's own crates; the Bun crates and every other dependency stay cached.
const WORKSPACE_CRATES = ['live_compile_core', 'live_compile_ext'];
// Cleaning `live_compile_core` removes `live-compile-cli` with it, and the tests that drive the CLI skip without it (tests/live-compile-session.test.ts).
// So a checkout that had built it keeps it: it is built again after a clean as well as when `--cli` asks for it.
const CLI_BINARY = resolve(targetDirectory, 'release', 'live-compile-cli');
const withCli = process.argv.includes('--cli') || existsSync(CLI_BINARY);
// Cargo's `[env]` does not override a variable already set, so the binding is set here, from the same record the stamp uses.
const env = {
  ...process.env, ...nativeBindingEnvironment(), CARGO_TARGET_DIR: targetDirectory,
  PATH: `${resolve(homedir(), '.cargo/bin')}:${process.env.PATH}`,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: workspace, stdio: 'inherit', env, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`live-compile bound to Godot API ${NATIVE_BINDING_API.version}; target ${targetDirectory}`);
if (!existsSync(resolve(workspace, 'vendor/bun/Cargo.toml'))) run('python3', ['scripts/vendor-bun.py', BUN_CHECKOUT]);
// Cargo decides what to rebuild from file modification times, which a restored file can defeat. Hash the inputs,
// and unless the target's own stamp says the library cargo left is a build of exactly these, clean the workspace's crates so cargo compiles them.
const build = beginBuild({
  identity: { binding: nativeBinding() }, probe: false, collect: liveCompileInputs,
  built: layout.built, targetStamp: layout.builtStamp, installed: INSTALLED_LIBRARY, installedStamp: INSTALLED_STAMP,
  subject: `${LIBRARY_NAME} built in ${relative(root, targetDirectory)}`, compiler: 'cargo', fix: FIX, crate: WORKSPACE_CRATES.join(' and '),
  clean: () => run(cargo, ['clean', '--locked', ...WORKSPACE_CRATES.flatMap(crate => ['-p', crate]), '--release']),
});
// Two builds, not one with both packages: `--bin live-compile-cli` selects the targets of every package named, and then the extension
// (a library) is not built at all while the old one is installed under a new stamp.
run(cargo, ['build', '--locked', '--release', '-p', 'live_compile_ext']);
if (withCli) run(cargo, ['build', '--locked', '--release', '-p', 'live_compile_core', '--bin', 'live-compile-cli']);
build.compiled();
// Staged and renamed: a running Godot that has the old library mapped keeps its inode (scripts/freshness.mjs `installFile`).
installFile(layout.built, INSTALLED_LIBRARY);
writeGdextension();
build.installed();
run('node', [resolve(root, 'scripts/live-compile-project.mjs')], { cwd: root, env: { ...process.env } });
console.log(`Installed live-compile (bound to Godot API ${NATIVE_BINDING_API.version}): ${INSTALLED_LIBRARY}`);
