// Runs the bench in Godot `--headless` with the null audio driver (no window, no sound, no input from the machine). Needs
// `pnpm build:native` to have installed the library in demo/addons and `pnpm build` for dist; this project links the addon.
// It reads this process' resident size when the bench asks (a line `GODOT_REACT_EDITOR_RSS_MARK <label>`), because the engine's own
// counters miss V8 and the text server, and it records the machine's load average at the start and the end: every number is a wall
// clock on a machine other work shares, so a starved machine shows as spread between the trials.
// usage: node experiments/code-editor/native/run.mjs
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const here = import.meta.dirname;
const root = resolve(here, '../../..');
const GODOT = '/Applications/Godot48.app/Contents/MacOS/Godot';
const DEADLINE_MS = 300_000;
const IMPORT_DEADLINE_MS = 180_000;
const KILL_GRACE_MS = 5_000;
const BENCH_MARKER = 'GODOT_REACT_EDITOR_BENCH';
const RSS_MARKER = 'GODOT_REACT_EDITOR_RSS_MARK';

function load() {
  return execFileSync('uptime', { encoding: 'utf8' }).trim().replace(/^.*load averages?: /, '');
}

if (!existsSync(resolve(here, 'addons'))) {
  mkdirSync(resolve(here, 'addons'));
  symlinkSync(resolve(root, 'demo/addons/godot-react-ui'), resolve(here, 'addons/godot-react-ui'));
}
const built = spawnSync(process.execPath, [resolve(here, 'build.mjs')], { stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status ?? 1);
// A fresh project must be imported once (it registers the script and the extension); a no-op afterwards.
const importRun = spawnSync(GODOT, ['--headless', '--audio-driver', 'Dummy', '--editor', '--import', '--path', here], { stdio: 'ignore', timeout: IMPORT_DEADLINE_MS });
if (importRun.status !== 0) { console.error(`import failed: ${importRun.status} ${importRun.signal}`); process.exit(1); }

const lines = [`load at start: ${load()}`];
const child = spawn(GODOT, ['--headless', '--audio-driver', 'Dummy', '--path', here], { stdio: ['ignore', 'pipe', 'pipe'] });
const deadline = setTimeout(() => { lines.push('DEADLINE: killing the bench'); child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), KILL_GRACE_MS); }, DEADLINE_MS);
const handle = (line) => {
  if (line.includes(RSS_MARKER)) {
    const label = line.slice(line.indexOf(RSS_MARKER) + RSS_MARKER.length + 1).trim();
    const kib = Number.parseInt(execFileSync('ps', ['-o', 'rss=', '-p', String(child.pid)], { encoding: 'utf8' }).trim(), 10);
    lines.push(`RSS ${label} ${kib}`);
  } else if (line.includes(BENCH_MARKER) || /ERROR|SCRIPT ERROR|Uncaught/.test(line)) {
    lines.push(line);
  }
};
for (const stream of [child.stdout, child.stderr]) createInterface({ input: stream }).on('line', handle);
const status = await new Promise((done) => child.on('exit', (code, signal) => done(`exit ${code} signal ${signal}`)));
clearTimeout(deadline);
lines.push(`load at end: ${load()}`, status);
mkdirSync(resolve(root, 'artifacts/logs'), { recursive: true });
writeFileSync(resolve(root, 'artifacts/logs/code-editor-bench.log'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
process.exit(status.startsWith('exit 0') ? 0 : 1);
