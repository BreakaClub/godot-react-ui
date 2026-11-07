// Types into the code panel of the demo, in a real (quiet) window, with a client of GodotJS's V8 inspector attached, and keeps a V8 CPU profile of
// the keystrokes (docs/tracks/keystroke-profile.md). Only the Profiler domain is used: the Debugger domain deoptimises.
//
//   node scripts/profile-keystrokes.mjs [--site=attribute|function] [--warmup=200] [--bursts=25] [--inserts=8]
//                                       [--cpu=25|off|enabled] [--coverage] [--standalone] [--no-inspector] [--bench] [--out=<directory>] [--engine=stock]
//
// - `--standalone` attaches no client at all: the demo runs the steps itself and prints the keystrokes (the run the profiler's cost is measured against).
// - `--no-inspector` also turns the inspector off in the demo (debugger port 0).
// - `--bench` runs the editor's data work without React or native (demo/src/editor/keystroke-bench.ts) inside the demo's V8, for the typing site and
//   the window of lines the panel mounted, and writes `bench-godot.json`; nothing is profiled.
// - `--cpu=<n>` samples every n microseconds (a CPU profile for each burst); `enabled` enables the Profiler domain and starts nothing;
//   `off` attaches no profiler (the inspector is still connected). The demo itself can run with no inspector client at all:
//   `--profile-keystrokes=standalone` (demo/src/profile-keystrokes.ts).
// - `--coverage` takes precise coverage with call counts for each burst instead of a CPU profile (how many times each function ran).
// - Everything is event driven: a burst is one `Runtime.evaluate` that resolves when it is done. The only timers are the hang guards.
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { loadavg } from 'node:os';
import { resolve } from 'node:path';
import { argsWithoutEngine, selectEngine } from './engine.mjs';
import { importDemo } from './import-demo.mjs';
import { quietLaunch, quietWindowProblem } from './quiet-window.mjs';

const root = resolve(import.meta.dirname, '..');
const READY_MARKER = 'GODOT_REACT_KEYSTROKE_PROFILE_READY';
const RESULT_MARKER = 'GODOT_REACT_KEYSTROKE_PROFILE_RESULT';
const SESSION_DEADLINE_MS = 240_000;
const KILL_GRACE_MS = 5_000;
const CALL_DEADLINE_MS = 60_000;
const DEFAULT_WARMUP = 200;
const DEFAULT_BURSTS = 25;
const DEFAULT_INSERTS = 8;
const DEFAULT_SAMPLING_US = 25;

function option(name, fallback) {
  const found = process.argv.find(argument => argument.startsWith(`--${name}=`));
  return found === undefined ? fallback : found.slice(name.length + 3);
}

for (const argument of argsWithoutEngine(process.argv.slice(2))) {
  if (!['--site=', '--warmup=', '--bursts=', '--inserts=', '--cpu=', '--keystrokes=', '--bench-warmup=', '--renderer-profile=', '--coverage', '--standalone', '--no-inspector', '--bench', '--out='].some(prefix => argument.startsWith(prefix))) {
    throw new Error(`Unknown argument: ${argument}`);
  }
}
const site = option('site', 'attribute');
const warmup = Number(option('warmup', DEFAULT_WARMUP));
const bursts = Number(option('bursts', DEFAULT_BURSTS));
const inserts = Number(option('inserts', DEFAULT_INSERTS));
const cpu = option('cpu', String(DEFAULT_SAMPLING_US));
const coverage = process.argv.includes('--coverage');
const standalone = process.argv.includes('--standalone');
const rendererProfile = option('renderer-profile', 'on') !== 'off';
const inspectorOff = process.argv.includes('--no-inspector');
const output = resolve(root, option('out', `artifacts/keystroke-profile/${site}-${standalone ? 'standalone' : cpu}${coverage ? '-coverage' : ''}`));
mkdirSync(output, { recursive: true });

/**
 * A port nothing listens on. The inspector's default (9229) is shared by every GodotJS runtime on the machine, and another session's runs hold it:
 * a client that connected there would be driving somebody else's game.
 */
function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

const engine = selectEngine();
engine.prepareNative();
importDemo(engine.godot);
const inspectorPort = await freePort();
// The project's settings are overridden by `override.cfg` beside `project.godot`; this run's copy is removed when it ends.
const overrideFile = resolve(root, 'demo/override.cfg');
writeFileSync(overrideFile, `[GodotJS]\n\nruntime/debugger/debugger_port=${inspectorOff ? 0 : inspectorPort}\n`);
process.on('exit', () => rmSync(overrideFile, { force: true }));
const { command, env } = quietLaunch(engine.godot, { ...process.env, GODOT_REACT_ARTIFACTS: output });
const child = spawn(command, ['--audio-driver', 'Dummy', '--path', resolve(root, 'demo'), '--resolution', '1120x800', '--', ...(standalone ? ['--profile-keystrokes=standalone', `--site=${site}`, `--warmup=${warmup}`, `--bursts=${bursts}`, `--inserts=${inserts}`, `--renderer-profile=${rendererProfile ? 'on' : 'off'}`] : ['--profile-keystrokes'])], {
  env, stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
let announce;
const ready = new Promise(resolveReady => { announce = resolveReady; });
const collect = data => {
  const value = data.toString();
  log += value;
  // The standalone run's numbers are one long line; the rest of the log is shown.
  process.stdout.write(value.includes(RESULT_MARKER) ? value.replace(/GODOT_REACT_KEYSTROKE_PROFILE_RESULT .*/u, `${RESULT_MARKER} (kept in records.json)`) : value);
  if (log.includes(READY_MARKER)) announce();
};
child.stdout.on('data', collect);
child.stderr.on('data', collect);
const exited = new Promise(resolveExit => child.on('exit', resolveExit));
let escalation;
const stop = signal => {
  child.kill(signal);
  escalation ??= setTimeout(() => child.kill('SIGKILL'), KILL_GRACE_MS);
};
const deadline = setTimeout(() => { console.error('The session deadline passed'); stop('SIGTERM'); process.exitCode = 1; }, SESSION_DEADLINE_MS);
process.on('exit', () => child.kill('SIGKILL'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));

/** A minimal Chrome DevTools Protocol client over the global WebSocket. */
class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.next = 1;
    this.pending = new Map();
    this.contexts = [];
    socket.addEventListener('message', message => {
      const data = JSON.parse(String(message.data));
      // GodotJS registers its context without the default flag, so `Runtime.evaluate` needs the id that `Runtime.enable` announces.
      if (data.method === 'Runtime.executionContextCreated') this.contexts.push(data.params.context.id);
      const waiting = this.pending.get(data.id);
      if (waiting === undefined) return;
      this.pending.delete(data.id);
      if (data.error) waiting.reject(new Error(`${waiting.method}: ${JSON.stringify(data.error)}`));
      else waiting.resolve(data.result);
    });
    socket.addEventListener('close', () => {
      for (const waiting of this.pending.values()) waiting.reject(new Error(`${waiting.method}: the inspector closed`));
      this.pending.clear();
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolveOpen, reject) => {
      socket.addEventListener('open', resolveOpen, { once: true });
      socket.addEventListener('error', () => reject(new Error(`Cannot connect to ${url}`)), { once: true });
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = this.next;
    this.next += 1;
    return new Promise((resolveCall, reject) => {
      const guard = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} took more than ${CALL_DEADLINE_MS} ms`)); }, CALL_DEADLINE_MS);
      this.pending.set(id, { method, resolve: value => { clearTimeout(guard); resolveCall(value); }, reject: error => { clearTimeout(guard); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  /** Evaluate `expression` in the page and return its value; a promise is awaited. */
  async evaluate(expression) {
    const [contextId] = this.contexts;
    if (contextId === undefined) throw new Error('Runtime.enable announced no execution context');
    const result = await this.send('Runtime.evaluate', { expression, contextId, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`${expression}: ${JSON.stringify(result.exceptionDetails)}`);
    return result.result.value;
  }
}

if (standalone) {
  // No client: the demo runs the whole sequence and quits.
  await exited;
  clearTimeout(deadline);
  clearTimeout(escalation);
  writeFileSync(resolve(output, 'run.log'), log);
  const line = log.split('\n').find(text => text.includes(RESULT_MARKER));
  if (line === undefined) throw new Error('The standalone run printed no result');
  const records = JSON.parse(line.slice(line.indexOf(RESULT_MARKER) + RESULT_MARKER.length + 1));
  writeFileSync(resolve(output, 'records.json'), JSON.stringify(records));
  writeFileSync(resolve(output, 'meta.json'), JSON.stringify({ site, standalone: true, inspectorOff, rendererProfile, warmup, bursts, inserts, loadAverage: loadavg(), engine: engine.name }));
  console.log(`wrote ${records.length} keystrokes to ${output}`);
  process.exit(quietWindowProblem(log) === undefined ? 0 : 1);
}
try {
  await Promise.race([ready, exited.then(() => { throw new Error(`Godot exited before it was ready:\n${log}`); })]);
  if (!log.includes(`ws=127.0.0.1:${inspectorPort}/`)) throw new Error(`The inspector did not start on port ${inspectorPort}:\n${log}`);
  const targets = await (await fetch(`http://127.0.0.1:${inspectorPort}/json/list`)).json();
  const url = targets[0]?.webSocketDebuggerUrl;
  if (url === undefined) throw new Error(`The inspector on port ${inspectorPort} lists no target: ${JSON.stringify(targets)}`);
  console.log(`inspector: ${url}`);
  const cdp = await Cdp.connect(url);
  await cdp.send('Runtime.enable');
  const identity = await cdp.evaluate('typeof globalThis.godotReactKeystrokeProfile');
  if (identity !== 'object') throw new Error(`The inspector on port ${inspectorPort} is not this run's demo (typeof godotReactKeystrokeProfile is ${identity})`);
  const sampling = cpu === 'off' || cpu === 'enabled' ? undefined : Number(cpu);
  if (cpu !== 'off') await cdp.send('Profiler.enable');
  if (sampling !== undefined && !coverage) await cdp.send('Profiler.setSamplingInterval', { interval: sampling });
  console.log('environment:', await cdp.evaluate('godotReactKeystrokeProfile.environment()'));
  const prepared = await cdp.evaluate(`godotReactKeystrokeProfile.prepare(${JSON.stringify(site)})`);
  console.log('prepared:', JSON.stringify(prepared));
  if (process.argv.includes('--bench')) {
    const keystrokes = Number(option('keystrokes', 1000));
    const benchWarmup = Number(option('bench-warmup', 400));
    const summary = JSON.parse(await cdp.evaluate(`godotReactKeystrokeProfile.bench(${JSON.stringify(site)}, ${prepared.window.first}, ${prepared.window.last}, ${keystrokes}, ${benchWarmup})`));
    const nativeCalls = JSON.parse(await cdp.evaluate('godotReactKeystrokeProfile.nativeCallCost(200000)'));
    writeFileSync(resolve(output, 'bench-godot.json'), JSON.stringify({ prepared, keystrokes, benchWarmup, summary, nativeCalls, loadAverage: loadavg() }, null, 2));
    console.log(JSON.stringify(nativeCalls));
    console.log(JSON.stringify(summary));
    await cdp.evaluate('godotReactKeystrokeProfile.finish()').catch(() => undefined);
    await exited;
    clearTimeout(deadline);
    clearTimeout(escalation);
    writeFileSync(resolve(output, 'run.log'), log);
    process.exit(0);
  }
  const warmed = await cdp.evaluate(`godotReactKeystrokeProfile.warmup(${warmup})`);
  console.log(`warm-up: ${warmed} keystrokes`);
  const records = [];
  const call = `godotReactKeystrokeProfile.burst({ inserts: ${inserts}, rendererProfile: ${rendererProfile} }).then(records => JSON.stringify(records))`;
  for (let index = 0; index < bursts; index += 1) {
    if (sampling !== undefined && !coverage) await cdp.send('Profiler.start');
    if (coverage) {
      await cdp.send('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
      await cdp.send('Profiler.takePreciseCoverage');
    }
    records.push(...JSON.parse(await cdp.evaluate(call)));
    const name = String(index).padStart(2, '0');
    if (sampling !== undefined && !coverage) {
      const { profile } = await cdp.send('Profiler.stop');
      writeFileSync(resolve(output, `profile-${name}.cpuprofile`), JSON.stringify(profile));
    }
    if (coverage) {
      const taken = await cdp.send('Profiler.takePreciseCoverage');
      writeFileSync(resolve(output, `coverage-${name}.json`), JSON.stringify(taken));
      await cdp.send('Profiler.stopPreciseCoverage');
    }
    await cdp.evaluate('godotReactKeystrokeProfile.settle()');
  }
  writeFileSync(resolve(output, 'records.json'), JSON.stringify(records));
  writeFileSync(resolve(output, 'meta.json'), JSON.stringify({ site, warmup, bursts, inserts, cpu, rendererProfile, coverage, prepared, engine: engine.name, loadAverage: loadavg(), inspectorPort }));
  console.log(`wrote ${records.length} keystrokes to ${output}`);
  await cdp.evaluate('godotReactKeystrokeProfile.finish()').catch(() => undefined);
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
  stop('SIGTERM');
}
await exited;
clearTimeout(deadline);
clearTimeout(escalation);
writeFileSync(resolve(output, 'run.log'), log);
const problem = quietWindowProblem(log);
if (problem !== undefined) {
  console.error(problem);
  process.exitCode = 1;
}
