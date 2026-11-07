// Windows of automated runs that cannot take focus (docs/tracks/quiet-windows.md). `scripts/quiet-window/quiet_window.m` does the
// work inside the Godot process; this file builds it and says how to start a process with it.
//
//   node scripts/quiet-window.mjs <godot> [arguments]     run any Godot command this way (for an experiment's own scene)
//   node scripts/quiet-window.mjs --print-library         build it and print the library's path
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { directLaunchOf } from './engine.mjs';

// `import.meta.url`, not `import.meta.dirname`: the unit tests load this file through tsx's CommonJS bridge.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'scripts/quiet-window/quiet_window.m');
const HASH_DIGITS = 16;

/** Printed by every process the library is loaded into. A run with no such line took focus: see {@link quietWindowProblem}. */
export const LOADED_MARKER = 'QUIET_WINDOW_LOADED';
const FAILURE_MARKERS = ['QUIET_WINDOW_MISSING', 'QUIET_WINDOW_ACTIVATED'];

/** The library, built if this source has not been built yet. The name holds the source's hash, so a change cannot use a stale one. */
export function quietWindowLibrary() {
  const hash = createHash('sha256').update(readFileSync(source)).digest('hex').slice(0, HASH_DIGITS);
  const library = join(root, `artifacts/quiet-window/libquiet-window-${hash}.dylib`);
  if (existsSync(library)) return library;
  mkdirSync(dirname(library), { recursive: true });
  const result = spawnSync('clang', ['-dynamiclib', '-fobjc-arc', '-framework', 'AppKit', '-framework', 'Foundation', '-Wall', '-Werror', '-o', library, source], { encoding: 'utf8' });
  if (result.error) throw new Error(`Cannot run clang for the quiet window: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`The quiet window did not build:\n${result.stderr}`);
  return library;
}

/**
 * What to spawn so `godot` cannot take focus. On macOS the library goes in through `DYLD_INSERT_LIBRARIES`, which the system strips
 * on the way into `/bin/sh`, so a launcher script cannot pass it on: a profile whose binary is such a script names the binary and
 * what the script would have set (`directLaunchOf`). Other platforms have no such step here.
 */
export function quietLaunch(godot, env, { platform = process.platform, library = quietWindowLibrary } = {}) {
  if (platform !== 'darwin') return { command: godot, env };
  const direct = directLaunchOf(godot);
  for (const directory of direct?.directories ?? []) mkdirSync(directory, { recursive: true });
  return { command: direct?.command ?? godot, env: { ...env, ...direct?.env, DYLD_INSERT_LIBRARIES: library() } };
}

/** Why this run's log says it was not quiet, or `undefined`. A launcher that dropped the library shows as the marker missing. */
export function quietWindowProblem(log, platform = process.platform) {
  if (platform !== 'darwin') return undefined;
  const failure = FAILURE_MARKERS.find(marker => log.includes(marker));
  if (failure !== undefined) {
    const line = log.split('\n').find(text => text.includes(failure));
    return `the window was not kept from taking focus: ${line}`;
  }
  if (!log.includes(LOADED_MARKER)) return 'the window was started without the quiet-window library, so it took focus; use scripts/quiet-window.mjs';
  return undefined;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [first, ...rest] = process.argv.slice(2);
  if (first === undefined) throw new Error('Usage: node scripts/quiet-window.mjs <godot> [arguments], or --print-library');
  if (first === '--print-library') {
    console.log(quietWindowLibrary());
  } else {
    const { command, env } = quietLaunch(first, process.env);
    const child = spawn(command, rest, { env, stdio: 'inherit' });
    child.on('error', error => { console.error(error.message); process.exitCode = 1; });
    child.on('exit', code => { process.exitCode = code ?? 1; });
  }
}
