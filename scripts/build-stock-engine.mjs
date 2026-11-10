import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rejectUnknownArguments } from './arguments.mjs';

// Builds the stock engine profile's Godot from source for Linux, where CI exports the demo (.github/workflows/deploy-demo.yml): Godot 4.7.2 with
// upstream GodotJS and the patches in engine/stock/patches/godotjs (upstream PR #196 for Godot 4.7, and the compile fixes 4.7.2 needs). Upstream
// GodotJS builds and releases only for Godot 4.6.1, so there is nothing to download.
//
//   node scripts/build-stock-engine.mjs --part=editor --out=<directory>
//       the editor that exports, at <out>/bin/godot.linuxbsd.editor.x86_64, self-contained (`_sc_` beside it, editor/file_system/editor_paths.cpp)
//   node scripts/build-stock-engine.mjs --part=web-template --out=<directory>
//       the threaded Web release template with extensions, where that editor looks for it:
//       <out>/bin/editor_data/export_templates/4.7.2.stable/web_dlink_release.zip
//
// Both parts can go into one <out>. `--work=<directory>` is where the sources are checked out and built (default: <out>/../stock-engine-work). The
// Web template needs Emscripten 4.0.11 on PATH (`emcc`): the version Godot 4.7.2's own Web CI pins. The build is what this repository's stock profile
// was qualified with on macOS (scripts/engine.mjs `stock`); only the editor's platform differs, and the editor is only the exporter.
//
// CI caches the result keyed by this file and the patches, so a change to either rebuilds it.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
rejectUnknownArguments(argv, { prefixes: ['--part=', '--out=', '--work='], engine: false });
const valueOf = prefix => argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length);

const GODOT = { repository: 'https://github.com/godotengine/godot.git', tag: '4.7.2-stable', commit: 'ed1daf0bf001b61586d9930840f2f1394092c079' };
const GODOTJS = { repository: 'https://github.com/godotjs/GodotJS.git', commit: 'b1d8b3f4d4688d216657364ddc53db0813444411' };
// GodotJS's own package manager (its package.json `packageManager`): it builds the runtime scripts the module compiles in, and the Web bridge.
const GODOTJS_PNPM = 'pnpm@10.11.0';
// GODOT_VERSION_FULL_CONFIG of this build (core/version.h): the directory Godot looks for its installed export templates in.
const TEMPLATE_VERSION = '4.7.2.stable';
// The flags GodotJS's own CI builds with (.github/workflows/build_linux.yml, build_web.yml in GodotJS), V8 for the editor and the browser's engine
// for the Web. The exporting editor needs no screen reader driver, so no AccessKit SDK.
const EDITOR_FLAGS = ['platform=linuxbsd', 'target=editor', 'arch=x86_64', 'module_text_server_fb_enabled=yes', 'skip_js_runtime=yes', 'accesskit=no'];
// Threads and extensions (`dlink_enabled`): the demo's "Web (stock)" preset exports with both, so its template is `web_dlink_release.zip`.
const WEB_TEMPLATE_FLAGS = ['platform=web', 'target=template_release', 'threads=yes', 'dlink_enabled=yes', 'use_closure_compiler=yes', 'debug_symbols=no', 'skip_js_runtime=yes'];

const part = valueOf('--part=');
if (part !== 'editor' && part !== 'web-template') throw new Error('--part= must be editor or web-template.');
const outArgument = valueOf('--out=');
if (!outArgument) throw new Error('--out=<directory> is required.');
const out = resolve(outArgument);
const work = resolve(valueOf('--work=') ?? join(out, '..', 'stock-engine-work'));
if (part === 'editor' && process.platform !== 'linux') throw new Error('The editor part builds the Linux editor CI exports with; run it on Linux.');

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.slice(0, 2).join(' ')} failed (exit ${result.status})`);
}

function output(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status}): ${result.stderr}`);
  return result.stdout.trim();
}

/** Godot at its release tag, with GodotJS at its pinned commit in modules/GodotJS and the patches applied. A checkout made earlier is used again. */
function checkout() {
  const godot = join(work, 'godot');
  const godotJs = join(godot, 'modules', 'GodotJS');
  const marker = join(work, 'checked-out');
  if (existsSync(marker)) return godot;
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  run('git', ['clone', '--depth', '1', '--branch', GODOT.tag, GODOT.repository, godot]);
  const head = output('git', ['rev-parse', 'HEAD'], { cwd: godot });
  if (head !== GODOT.commit) throw new Error(`Godot ${GODOT.tag} is ${head}, not ${GODOT.commit}: the tag moved.`);
  mkdirSync(godotJs, { recursive: true });
  run('git', ['init', '--quiet'], { cwd: godotJs });
  run('git', ['fetch', '--quiet', '--depth', '1', GODOTJS.repository, GODOTJS.commit], { cwd: godotJs });
  run('git', ['checkout', '--quiet', 'FETCH_HEAD'], { cwd: godotJs });
  const patches = join(root, 'engine', 'stock', 'patches', 'godotjs');
  for (const patch of readdirSync(patches).filter(name => name.endsWith('.patch')).sort()) run('git', ['apply', join(patches, patch)], { cwd: godotJs });
  // The runtime scripts (scripts/out) and the Web bridge (impl/web/js) the module compiles in.
  run('npx', ['--yes', GODOTJS_PNPM, 'install', '--frozen-lockfile'], { cwd: godotJs });
  run('npx', ['--yes', GODOTJS_PNPM, 'build'], { cwd: godotJs });
  writeFileSync(marker, `${GODOT.commit} ${GODOTJS.commit}\n`);
  return godot;
}

const godot = checkout();
const jobs = `-j${availableParallelism()}`;
const bin = join(out, 'bin');
mkdirSync(bin, { recursive: true });
if (part === 'editor') {
  run('scons', [...EDITOR_FLAGS, jobs], { cwd: godot });
  const editor = join(bin, 'godot.linuxbsd.editor.x86_64');
  copyFileSync(join(godot, 'bin', 'godot.linuxbsd.editor.x86_64'), editor);
  run('chmod', ['+x', editor]);
  writeFileSync(join(bin, '_sc_'), '');
  console.log(`Stock editor: ${editor} (${output(editor, ['--headless', '--version'])})`);
} else {
  run('scons', [...WEB_TEMPLATE_FLAGS, jobs], { cwd: godot });
  const templates = join(bin, 'editor_data', 'export_templates', TEMPLATE_VERSION);
  mkdirSync(templates, { recursive: true });
  copyFileSync(join(godot, 'bin', 'godot.web.template_release.wasm32.dlink.zip'), join(templates, 'web_dlink_release.zip'));
  console.log(`Stock Web release template: ${join(templates, 'web_dlink_release.zip')}`);
}
