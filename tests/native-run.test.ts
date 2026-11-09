import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  DISTURBANCE_RELEVANCE_MS, EXPECT_ERROR_MARKER, MAX_DISTURBED_RERUNS, lineWriter, parseRunReport, relevantDisturbances, runNativeVerifier, runNativeVerifiers,
  type NativeVerifierResult, withoutExpectedErrors,
} from '../scripts/native-run.mjs';

// The retry policy of the native verify scripts (plan D22 and docs/tracks/verifier-integrity.md), exercised with a
// stand-in for Godot that prints a scripted log per launch, so no window opens and no input is involved.

const PASSED = 'GODOT_REACT_VERIFY_PASSED';
const FAILED = 'GODOT_REACT_VERIFY_FAILED Error: Entering a child hovers its parent';
const FAILURE_AT_MS = 41_000;
/**
 * The deadline of the stand-in that hangs. It must outlast the stand-in's own start (a Node process) on a loaded machine: with every test file
 * running at once, a 2 s deadline killed it before it had counted its launch.
 */
const HUNG_DEADLINE_MS = 8_000;

/** A disturbance record as the demo logs it (demo/src/verifier-input.ts). */
function disturbed(kind: string, sinceReadyMs: number, reachesRoot: boolean, inFlight: string[] = []): string {
  return `GODOT_REACT_RUN_DISTURBED ${JSON.stringify({ kind, detail: `${kind} detail`, sinceReadyMs, frame: 1, reachesRoot, inFlight })}`;
}

function ended(sinceReadyMs: number): string {
  return `GODOT_REACT_RUN_ENDED ${JSON.stringify({ sinceReadyMs, disturbances: {} })}`;
}

/** A failed run: the failure line, the end report at `at`, and the disturbance lines before it. */
function failedRun(at: number, ...disturbances: string[]): string {
  return [...disturbances, FAILED, ended(at)].join('\n');
}

/** A mouse event from a real device, which the window system delivers to the hover before the verifier can drop it. */
const REACHING_MOUSE = (sinceReadyMs: number): string => disturbed('foreign-input', sinceReadyMs, true);
/** The window losing OS focus with nothing pressed: the once-per-run event of an unfocusable window. */
const IDLE_FOCUS_LOSS = (sinceReadyMs: number): string => disturbed('window-focus-loss', sinceReadyMs, false);

type Launch = string | { log: string; ignoreTerm?: boolean; hang?: boolean };

function fakeGodot(directory: string, launches: readonly Launch[]): string {
  const path = join(directory, 'fake-godot.mjs');
  writeFileSync(join(directory, 'plan.json'), JSON.stringify(launches));
  writeFileSync(path, `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
const directory = ${JSON.stringify(directory)};
const plan = JSON.parse(readFileSync(directory + '/plan.json', 'utf8'));
const launches = existsSync(directory + '/launches') ? readFileSync(directory + '/launches', 'utf8').length : 0;
appendFileSync(directory + '/launches', 'x');
const entry = plan[Math.min(launches, plan.length - 1)];
const launch = typeof entry === 'string' ? { log: entry } : entry;
writeFileSync(directory + '/pid', String(process.pid));
console.log(launch.log);
if (launch.ignoreTerm) process.on('SIGTERM', () => {});
if (launch.hang) setInterval(() => {}, 1000);
`);
  chmodSync(path, 0o755);
  return path;
}

interface Outcome {
  result: NativeVerifierResult | undefined;
  error: Error | undefined;
  launches: number;
  outputs: string[];
  directory: string;
}

async function run(
  launches: readonly Launch[],
  options: { retry?: boolean; beforeLaunch?: (attempt: number) => void; deadlineMs?: number; killGraceMs?: number; scriptMarker?: string } = {},
): Promise<Outcome> {
  const directory = mkdtempSync(join(tmpdir(), 'native-run-'));
  const output = join(directory, 'out');
  let result: NativeVerifierResult | undefined;
  let error: Error | undefined;
  try {
    result = await runNativeVerifier({
      godot: fakeGodot(directory, launches), project: directory, output, name: 'landscape', resolution: '1x1',
      scriptArgs: ['--verify'], successMarker: options.scriptMarker ?? PASSED, errorPattern: /ERROR:|Uncaught|\[panic /u,
      deadlineMs: options.deadlineMs ?? 30_000, retry: options.retry, beforeLaunch: options.beforeLaunch, killGraceMs: options.killGraceMs, quiet: false,
    });
  } catch (caught) {
    assert.ok(caught instanceof Error);
    error = caught;
  }
  const launched = existsSync(join(directory, 'launches')) ? readFileSync(join(directory, 'launches'), 'utf8').length : 0;
  return { result, error, launches: launched, outputs: readdirSync(output).sort(), directory };
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function until(condition: () => boolean, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
  }
  return condition();
}

test('a run that passes is run once, disturbed or not, and says so', async () => {
  const quiet = await run([PASSED]);
  assert.equal(quiet.error, undefined);
  assert.equal(quiet.launches, 1);
  assert.equal(quiet.result?.summary, 'landscape: PASSED');
  const disturbedPass = await run([`${REACHING_MOUSE(900)}\n${PASSED}\n${ended(1000)}`]);
  assert.equal(disturbedPass.error, undefined);
  assert.equal(disturbedPass.launches, 1, 'a disturbed pass is a pass');
  assert.ok(disturbedPass.outputs.includes('run-attempt-1.log'), 'and the disturbance stays in the log');
  assert.match(disturbedPass.result?.summary ?? '', /a disturbance reached its window, but it passed/);
  // The routine one, a focus loss with nothing pressed, does not change what a pass says.
  const routine = await run([`${IDLE_FOCUS_LOSS(900)}\n${PASSED}\n${ended(1000)}`]);
  assert.equal(routine.result?.summary, 'landscape: PASSED');
});

test('a run that fails without interference is a real failure and is never run again', async () => {
  const result = await run([`${FAILED}\n${ended(FAILURE_AT_MS)}`]);
  assert.equal(result.launches, 1);
  assert.match(result.error?.message ?? '', /Entering a child hovers its parent/);
  assert.match(result.error?.message ?? '', /no interference was detected/);
  assert.deepEqual(result.outputs, ['run.log']);
});

test('a failure with a disturbance that reaches the window just before it is run again, and a later pass says what happened', async () => {
  const result = await run([failedRun(FAILURE_AT_MS, REACHING_MOUSE(FAILURE_AT_MS - 300)), PASSED]);
  assert.equal(result.error, undefined);
  assert.equal(result.launches, 2);
  assert.deepEqual(result.outputs, ['run-attempt-1.log', 'run-attempt-2.log', 'run.log']);
  const passed = result.result;
  assert.ok(passed);
  assert.equal(passed.attempts, 2);
  assert.equal(passed.disturbedFailures.length, 1);
  assert.match(passed.summary, /^landscape: PASSED after 1 disturbed failure\(s\)\. First failure: .*Entering a child hovers its parent/);
  assert.match(passed.summary, /foreign-input .* 300 ms before the end/);
  assert.match(passed.summary, /run-attempt-1\.log/);
  // The first failure's log and captures survive the re-run.
  assert.match(readFileSync(join(result.directory, 'out', 'run-attempt-1.log'), 'utf8'), /Entering a child hovers its parent/);
  assert.ok(existsSync(`${join(result.directory, 'out')}-failed-attempt-1`), 'the first failure keeps its own evidence directory');
});

test('a run that fails with a reaching disturbance every time is run at most twice more, then fails with it recorded', async () => {
  const result = await run([failedRun(FAILURE_AT_MS, REACHING_MOUSE(FAILURE_AT_MS - 10))]);
  assert.equal(result.launches, 1 + MAX_DISTURBED_RERUNS);
  assert.match(result.error?.message ?? '', /disturbed by something outside the verifier/);
  assert.match(result.error?.message ?? '', /run-attempt-/);
});

test('a failure that follows a disturbed one but is clean is real and ends the re-runs', async () => {
  const result = await run([failedRun(FAILURE_AT_MS, REACHING_MOUSE(FAILURE_AT_MS - 10)), `${FAILED}\n${ended(FAILURE_AT_MS)}`]);
  assert.equal(result.launches, 2, 'the second failure had no interference');
  assert.match(result.error?.message ?? '', /no interference was detected/);
});

test('an error line before the success marker fails a run like a failed assertion', async () => {
  const result = await run([`ERROR: something broke\n${PASSED}`]);
  assert.equal(result.launches, 1);
  assert.match(result.error?.message ?? '', /emitted a runtime error before completion/);
});

// The scripted case of the review (docs/tracks/verifier-integrity.md, finding 1): a real, flaky assertion failure whose
// log happens to carry a focus loss. The old rule re-ran it on the focus loss and a lucky second run passed.
test('a real failure is not laundered by a focus loss that cannot have caused it', async () => {
  // The routine one: the window loses focus once, with nothing pressed, long before the failing assertion.
  const early = await run([failedRun(FAILURE_AT_MS, IDLE_FOCUS_LOSS(781)), PASSED]);
  assert.equal(early.launches, 1, 'one launch: the failure is real');
  assert.match(early.error?.message ?? '', /Entering a child hovers its parent/);
  assert.match(early.error?.message ?? '', /none reached the system under test/);
  // Close to the failure but with nothing in flight: a focus loss acts on a press, and there was none.
  const idle = await run([failedRun(FAILURE_AT_MS, IDLE_FOCUS_LOSS(FAILURE_AT_MS - 50)), PASSED]);
  assert.equal(idle.launches, 1);
  // A reaching disturbance that is old: the verifier's next input undid it long before the failing assertion.
  const stale = await run([failedRun(FAILURE_AT_MS, REACHING_MOUSE(FAILURE_AT_MS - DISTURBANCE_RELEVANCE_MS - 1)), PASSED]);
  assert.equal(stale.launches, 1);
  // One logged after the run ended (the window closing at teardown) cannot have caused the failure either.
  const teardown = await run([failedRun(FAILURE_AT_MS, REACHING_MOUSE(FAILURE_AT_MS + 873)), PASSED]);
  assert.equal(teardown.launches, 1);
  // A focus loss with a press in flight cancels the press: that one counts.
  const pressed = await run([failedRun(FAILURE_AT_MS, disturbed('window-focus-loss', FAILURE_AT_MS - 200, true, ['mouse:1'])), PASSED]);
  assert.equal(pressed.launches, 2);
  assert.match(pressed.result?.summary ?? '', /window-focus-loss .* 200 ms before the end, mouse:1 held/);
});

test('a run that ended without reporting is a real failure, and a killed one says it was killed', async () => {
  const crashed = await run([`${REACHING_MOUSE(100)}\n${FAILED}`, PASSED]);
  assert.equal(crashed.launches, 1);
  assert.match(crashed.error?.message ?? '', /ended without reporting/);
  const hung = await run([{ log: REACHING_MOUSE(100), hang: true }, PASSED], { deadlineMs: HUNG_DEADLINE_MS, killGraceMs: 300 });
  assert.equal(hung.launches, 1);
  assert.match(hung.error?.message ?? '', new RegExp(`killed at its ${HUNG_DEADLINE_MS} ms deadline`, 'u'));
});

test('a window that takes no input says so, instead of claiming that interference was ruled out', async () => {
  const result = await run([FAILED]);
  assert.equal(result.launches, 1);
  assert.match(result.error?.message ?? '', /takes no input, so no interference is tracked/);
});

test('retries off (--no-retry) reports the disturbance and runs once', async () => {
  const result = await run([failedRun(FAILURE_AT_MS, REACHING_MOUSE(FAILURE_AT_MS - 100)), PASSED], { retry: false });
  assert.equal(result.launches, 1);
  assert.match(result.error?.message ?? '', /Entering a child hovers its parent/);
  assert.match(result.error?.message ?? '', /retries are off/);
});

test('the freshness check runs before every launch, a re-run included, and a refusal stops the run', async () => {
  const attempts: number[] = [];
  const rerun = await run([failedRun(FAILURE_AT_MS, REACHING_MOUSE(FAILURE_AT_MS - 100)), PASSED], { beforeLaunch: attempt => { attempts.push(attempt); } });
  assert.equal(rerun.error, undefined);
  assert.deepEqual(attempts, [1, 2]);
  const refused = await run([PASSED], { beforeLaunch: () => { throw new Error('the installed library is stale'); } });
  assert.equal(refused.launches, 0, 'nothing launched');
  assert.match(refused.error?.message ?? '', /stale/);
  const lateRefusal = await run([failedRun(FAILURE_AT_MS, REACHING_MOUSE(FAILURE_AT_MS - 100)), PASSED], {
    beforeLaunch: attempt => { if (attempt > 1) throw new Error('the library changed after the first window'); },
  });
  assert.equal(lateRefusal.launches, 1, 'the second window is not launched against a library that changed');
  assert.match(lateRefusal.error?.message ?? '', /changed after the first window/);
});

test('a partial run says so in its summary', async () => {
  const result = await run([`GODOT_REACT_VERIFY_PASSED ${JSON.stringify({ partial: true, skipped: ['pointers', 'drag'] })}`]);
  assert.equal(result.result?.partial, true);
  assert.deepEqual(result.result?.skipped, ['pointers', 'drag']);
  assert.equal(result.result?.summary, 'landscape: PASSED (PARTIAL: not run: pointers, drag)');
});

test('the run report reads the verifier clock, ignores unreadable records and needs an end report', () => {
  const report = parseRunReport([REACHING_MOUSE(100), 'GODOT_REACT_RUN_DISTURBED {broken', IDLE_FOCUS_LOSS(200), ended(500)].join('\n'));
  assert.equal(report.disturbances.length, 2);
  assert.equal(report.unreadable, 1);
  assert.equal(report.endedAtMs, 500);
  assert.deepEqual(relevantDisturbances(report).map(item => item.kind), ['foreign-input']);
  assert.deepEqual(relevantDisturbances(parseRunReport(REACHING_MOUSE(100))), [], 'no end report, no failure time');
});

test('a child that ignores SIGTERM is killed at its deadline plus the grace, and no timer is left behind', async () => {
  const started = Date.now();
  const result = await run([{ log: 'started', ignoreTerm: true, hang: true }], { deadlineMs: 2000, killGraceMs: 300 });
  assert.match(result.error?.message ?? '', /killed at its 2000 ms deadline/);
  const pid = Number(readFileSync(join(result.directory, 'pid'), 'utf8'));
  assert.equal(alive(pid), false, 'the child is gone');
  assert.ok(Date.now() - started < 10_000, 'and the run did not wait for it');
});

test('a signal sent to the script closes the Godot window it started', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'native-run-signal-'));
  const godot = fakeGodot(directory, [{ log: 'started', hang: true }]);
  const script = join(directory, 'runner.mjs');
  writeFileSync(script, `import { runNativeVerifier } from ${JSON.stringify(pathToFileURL(resolve(__dirname, '../scripts/native-run.mjs')).href)};
await runNativeVerifier({ godot: ${JSON.stringify(godot)}, project: ${JSON.stringify(directory)}, output: ${JSON.stringify(join(directory, 'out'))},
  name: 'landscape', resolution: '1x1', scriptArgs: ['--verify'], successMarker: ${JSON.stringify(PASSED)}, errorPattern: /ERROR:/u, deadlineMs: 60000 });
`);
  const runner = spawn(process.execPath, [script], { stdio: 'ignore' });
  assert.ok(await until(() => existsSync(join(directory, 'pid')), 10_000), 'the fake Godot started');
  const pid = Number(readFileSync(join(directory, 'pid'), 'utf8'));
  assert.equal(alive(pid), true);
  runner.kill('SIGTERM');
  const exited = await new Promise<number | null>(resolvePromise => { runner.on('exit', code => resolvePromise(code)); });
  assert.notEqual(exited, 0, 'the script reports the interruption');
  assert.ok(await until(() => !alive(pid), 10_000), 'the child did not outlive it');
});

test('an error the verifier announced is expected once; an unannounced one, or a missing announced one, fails the run', async () => {
  const error = 'ERROR: ReactUiRoot: node 7 has a filter inside node 3, which has a filter.';
  const announced = `${EXPECT_ERROR_MARKER}node 7 has a filter\n${error}\n   at: (native/filter_render.rs:1)`;
  const ok = await run([`${announced}\n${PASSED}`]);
  assert.equal(ok.error, undefined, 'the announced error does not fail the run');
  const twice = await run([`${announced}\n${error}\n${PASSED}`]);
  assert.match(twice.error?.message ?? '', /emitted a runtime error/u, 'a second, unannounced one does');
  const missing = await run([`${EXPECT_ERROR_MARKER}node 7 has a filter\n${PASSED}`]);
  assert.match(missing.error?.message ?? '', /announced an error that never appeared/u);
  const other = await run([`${EXPECT_ERROR_MARKER}node 7 has a filter\nERROR: something else\n${PASSED}`]);
  assert.match(other.error?.message ?? '', /announced an error that never appeared/u, 'the announcement is for a text, not any error');
  assert.deepEqual(withoutExpectedErrors(`${announced}\nok`).unmet, []);
});

// ---- Windows that run at the same time ----------------------------------------------------------------------------------------

/**
 * A stand-in for Godot that tells the windows of one workflow apart by their `--resolution`. Each launch records `start <resolution>` and,
 * with `barrier`, does not go on until that many windows have started: a barrier no serial run can pass, so passing it proves the windows
 * overlapped. Then it prints the log scripted for its resolution and records `end <resolution>`.
 */
function windowsGodot(directory: string, logs: Readonly<Record<string, string>>, barrier: number): string {
  const path = join(directory, 'fake-windows-godot.mjs');
  writeFileSync(path, `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
const directory = ${JSON.stringify(directory)};
const logs = ${JSON.stringify(logs)};
const barrier = ${barrier};
const resolution = process.argv[process.argv.indexOf('--resolution') + 1];
const events = directory + '/events';
appendFileSync(events, 'start ' + resolution + '\\n');
const started = () => (existsSync(events) ? readFileSync(events, 'utf8').split('\\n').filter(line => line.startsWith('start ')).length : 0);
const waitedFrom = Date.now();
while (started() < barrier && Date.now() - waitedFrom < 15000) await new Promise(resolve => setTimeout(resolve, 10));
console.log(started() < barrier ? 'GODOT_REACT_VERIFY_FAILED the other window never started' : logs[resolution]);
appendFileSync(events, 'end ' + resolution + '\\n');
`);
  chmodSync(path, 0o755);
  return path;
}

const WINDOW_NAMES = [['landscape', '1x1'], ['portrait', '2x2']] as const;

async function runWindows(
  logs: Readonly<Record<string, string>>,
  { barrier, serial = false }: { barrier: number; serial?: boolean },
): Promise<{ results: NativeVerifierResult[] | undefined; error: Error | undefined; events: string[]; directory: string }> {
  const directory = mkdtempSync(join(tmpdir(), 'native-run-windows-'));
  let results: NativeVerifierResult[] | undefined;
  let error: Error | undefined;
  try {
    results = await runNativeVerifiers({
      godot: windowsGodot(directory, logs, barrier), project: directory, scriptArgs: ['--verify'], successMarker: PASSED,
      errorPattern: /ERROR:|Uncaught|\[panic /u, deadlineMs: 30_000, quiet: false,
    }, WINDOW_NAMES.map(([name, resolution]) => ({ name, resolution, output: join(directory, name) })), { serial });
  } catch (caught) {
    assert.ok(caught instanceof Error);
    error = caught;
  }
  const events = existsSync(join(directory, 'events')) ? readFileSync(join(directory, 'events'), 'utf8').split('\n').filter(line => line !== '') : [];
  return { results, error, events, directory };
}

test('the windows of a workflow run at the same time: neither ends before both have started', async () => {
  const outcome = await runWindows({ '1x1': PASSED, '2x2': PASSED }, { barrier: 2 });
  assert.equal(outcome.error, undefined);
  assert.deepEqual(outcome.results?.map(result => result.summary), ['landscape: PASSED', 'portrait: PASSED'], 'in the order the windows were given');
  assert.deepEqual(outcome.events.slice(0, 2).sort(), ['start 1x1', 'start 2x2'], 'both started before any ended');
  assert.equal(outcome.events.length, 4);
});

test('serial runs the windows one after another, as every workflow did before', async () => {
  const outcome = await runWindows({ '1x1': PASSED, '2x2': PASSED }, { barrier: 0, serial: true });
  assert.equal(outcome.error, undefined);
  assert.deepEqual(outcome.events, ['start 1x1', 'end 1x1', 'start 2x2', 'end 2x2']);
});

test('serial stops at the first window that fails, and does not launch the next', async () => {
  const outcome = await runWindows({ '1x1': FAILED, '2x2': PASSED }, { barrier: 0, serial: true });
  assert.match(outcome.error?.message ?? '', /^landscape runtime verification failed/);
  assert.deepEqual(outcome.events, ['start 1x1', 'end 1x1']);
});

test('a window that fails fails the run with its own message, and the other window still runs to its end and keeps its evidence', async () => {
  const outcome = await runWindows({ '1x1': PASSED, '2x2': `${FAILED}\n${ended(FAILURE_AT_MS)}` }, { barrier: 2 });
  assert.equal(outcome.results, undefined);
  assert.match(outcome.error?.message ?? '', /^portrait runtime verification failed .*Entering a child hovers its parent/, 'the message is the one a single window gives');
  assert.doesNotMatch(outcome.error?.message ?? '', /windows failed/);
  assert.equal(outcome.events.filter(line => line.startsWith('end ')).length, 2, 'the window that passed ran to its end');
  assert.match(readFileSync(join(outcome.directory, 'landscape', 'run.log'), 'utf8'), new RegExp(PASSED), 'and kept its log');
  assert.match(readFileSync(join(outcome.directory, 'portrait', 'run.log'), 'utf8'), /Entering a child hovers its parent/);
});

test('when every window fails, one error names each of them', async () => {
  const outcome = await runWindows({ '1x1': `${FAILED}\n${ended(FAILURE_AT_MS)}`, '2x2': `${FAILED}\n${ended(FAILURE_AT_MS)}` }, { barrier: 2 });
  assert.ok(outcome.error instanceof AggregateError);
  assert.match(outcome.error.message, /^2 of 2 windows failed:\n {2}landscape: landscape runtime verification failed.*\n {2}portrait: portrait runtime verification failed/s);
  assert.equal(outcome.error.errors.length, 2);
});

test('a window disturbed on its own is run again on its own, and the other window is not run again', async () => {
  const outcome = await runWindows({
    '1x1': PASSED,
    '2x2': failedRun(FAILURE_AT_MS, REACHING_MOUSE(FAILURE_AT_MS - 100)),
  }, { barrier: 2 });
  // The stand-in repeats the portrait window's script on its re-runs, so it fails every attempt; what matters is who was launched how often.
  assert.match(outcome.error?.message ?? '', /portrait failed in each of its 3 attempts/);
  assert.equal(outcome.events.filter(line => line === 'start 1x1').length, 1, 'the landscape window ran once');
  assert.equal(outcome.events.filter(line => line === 'start 2x2').length, 1 + MAX_DISTURBED_RERUNS, 'the portrait window ran its attempts');
});

test('lineWriter labels whole lines however the text is cut, and flush writes a last line that has no newline', () => {
  const written: string[] = [];
  const writer = lineWriter('[portrait] ', text => { written.push(text); });
  writer.push('first line\nsecond ');
  assert.deepEqual(written, ['[portrait] first line\n'], 'a partial line waits for the rest of it');
  writer.push('half\n\nthird');
  assert.deepEqual(written, ['[portrait] first line\n', '[portrait] second half\n', '[portrait] \n']);
  writer.flush();
  assert.equal(written.at(-1), '[portrait] third\n');
  writer.flush();
  assert.equal(written.length, 4, 'nothing is written twice');
});

test('windows that run together label what they print; a single window prints as it always did', async () => {
  const lines: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  const capture = (chunk: string | Uint8Array, ...rest: unknown[]): boolean => {
    const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
    if (text.includes('GODOT_REACT_VERIFY_PASSED') || text.includes('QUIET')) {
      lines.push(text);
      return true;
    }
    return Reflect.apply(original, process.stdout, [chunk, ...rest]);
  };
  process.stdout.write = capture as typeof process.stdout.write;
  try {
    const together = await runWindows({ '1x1': PASSED, '2x2': PASSED }, { barrier: 2 });
    assert.equal(together.error, undefined);
    assert.deepEqual(lines.filter(line => line.startsWith('[landscape] ')), [`[landscape] ${PASSED}\n`]);
    assert.deepEqual(lines.filter(line => line.startsWith('[portrait] ')), [`[portrait] ${PASSED}\n`]);
    lines.length = 0;
    const alone = await runWindows({ '1x1': PASSED, '2x2': PASSED }, { barrier: 0, serial: true });
    assert.equal(alone.error, undefined);
    assert.deepEqual(lines, [`${PASSED}\n`, `${PASSED}\n`], 'unlabelled, as before');
  } finally {
    process.stdout.write = original;
  }
});
