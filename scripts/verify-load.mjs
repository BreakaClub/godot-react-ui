// Loads this machine's release library in a Godot that has no GodotJS and has it lay out a commit (tests/stock/main.gd):
//
//   GODOT=<a Godot 4.7.2 or newer> node scripts/verify-load.mjs [--arch=<arch>]
//
// It is the check that a platform's library loads and runs where it is meant to: release and CI builds run it on each desktop system with the
// official 4.7.2 editor (.github/workflows/build.yml). The addon it installs into tests/stock is the checked-in manifest and the library
// scripts/build-binary.mjs left in out/bin, laid out as the package's addon is.
// `--arch` runs the engine as another architecture of a universal macOS build (`arch -<arch>`: x86_64 under Rosetta), to load that slice.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { BINARY_TARGETS, hostBinaryTarget, NATIVE_LIBRARY_NAME, OUT_BIN } from './native-binding.mjs';

const ARCH_OPTION = '--arch=';
const argv = process.argv.slice(2);
rejectUnknownArguments(argv, { prefixes: [ARCH_OPTION], engine: false });

const root = resolve(import.meta.dirname, '..');
const godot = process.env.GODOT ?? 'godot';
const project = join(root, 'tests/stock');
const ADDON = 'addons/godot-react-ui';
const MANIFEST = 'react_ui.gdextension';
/** The project's own deadline is 20 s (tests/stock/main.gd). */
const RUN_TIMEOUT_MS = 60_000;
/** Under Rosetta the engine is translated before it starts, and it prints nothing until that is done: tens of seconds on a GitHub runner. */
const TRANSLATED_RUN_TIMEOUT_MS = 300_000;
const VERIFIED = 'godot-react-ui loaded:';
const arch = argv.findLast(argument => argument.startsWith(ARCH_OPTION))?.slice(ARCH_OPTION.length);

const library = join(OUT_BIN, NATIVE_LIBRARY_NAME);
if (!existsSync(library)) {
  const target = hostBinaryTarget();
  // A Mac's release library is the universal one; any other machine's is its own target's.
  const build = target !== undefined && BINARY_TARGETS[target].platform === 'macos' ? 'macos.universal' : target;
  throw new Error(`No ${library}: build it first (node scripts/build-binary.mjs --target=${build}).`);
}

// The addon as a project has it: the manifest, its uid and the library under bin/. Rebuilt each run, with the engine's cache of the last.
rmSync(join(project, 'addons'), { recursive: true, force: true });
rmSync(join(project, '.godot'), { recursive: true, force: true });
mkdirSync(join(project, ADDON, 'bin'), { recursive: true });
for (const file of [MANIFEST, `${MANIFEST}.uid`]) copyFileSync(join(root, 'demo', ADDON, file), join(project, ADDON, file));
copyFileSync(library, join(project, ADDON, 'bin', NATIVE_LIBRARY_NAME));
// What an editor's first scan records, and what makes a run load the extension. Written here, not by `--import`: a headless import that
// finds a new extension queues the editor's generation of its documentation, which Godot 4.7.2 crashes in on the way out.
mkdirSync(join(project, '.godot'), { recursive: true });
writeFileSync(join(project, '.godot/extension_list.cfg'), `res://${ADDON}/${MANIFEST}\n`);

const [command, ...commandArgs] = [...(arch === undefined ? [] : ['arch', `-${arch}`]), godot, '--headless', '--audio-driver', 'Dummy', '--path', project, '--script', 'res://main.gd'];
const run = spawnSync(command, commandArgs, { cwd: root, encoding: 'utf8', timeout: arch === undefined ? RUN_TIMEOUT_MS : TRANSLATED_RUN_TIMEOUT_MS });
if (run.error) throw run.error;
process.stdout.write(run.stdout);
process.stderr.write(run.stderr);
const verified = run.stdout.split('\n').find(line => line.includes(VERIFIED));
if (run.status !== 0 || verified === undefined) {
  console.error(`The extension did not load and lay out a commit in ${godot}${arch === undefined ? '' : ` as ${arch}`} (exit ${run.status ?? run.signal})`);
  process.exit(1);
}
console.log(`\n${verified.slice(verified.indexOf(VERIFIED)).trim()}`);
