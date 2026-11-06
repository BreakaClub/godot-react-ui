import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  DISTURBANCE_RELEVANCE_MS, MAX_DISTURBED_RERUNS, parseRunReport, relevantDisturbances, runNativeVerifier,
  type NativeVerifierResult,
} from '../scripts/native-run.mjs';

// The retry policy of the native verify scripts (plan D22 and docs/tracks/verifier-integrity.md), exercised with a
// stand-in for Godot that prints a scripted log per launch, so no window opens and no input is involved.

const PASSED = 'GODOT_REACT_VERIFY_PASSED';
const FAILED = 'GODOT_REACT_VERIFY_FAILED Error: Entering a child hovers its parent';
const FAILURE_AT_MS = 41_000;

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
      deadlineMs: options.deadlineMs ?? 30_000, retry: options.retry, beforeLaunch: options.beforeLaunch, killGraceMs: options.killGraceMs,
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
  const hung = await run([{ log: REACHING_MOUSE(100), hang: true }, PASSED], { deadlineMs: 2000, killGraceMs: 300 });
  assert.equal(hung.launches, 1);
  assert.match(hung.error?.message ?? '', /killed at its 2000 ms deadline/);
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
