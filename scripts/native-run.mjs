import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { quietLaunch, quietWindowProblem } from './quiet-window.mjs';

/**
 * What the demo logs (demo/src/verifier-input.ts) when a run sees something its verifier did not cause: input from a
 * real device, the window losing OS focus, the cursor crossing the window. One JSON record per line, with the
 * verifier's own clock (`sinceReadyMs`) and whether the disturbance can reach the system under test (`reachesRoot`).
 */
const DISTURBED_MARKER = 'GODOT_REACT_RUN_DISTURBED';
/** Printed once when a verifier run ends, passed or failed: the verifier's clock at that moment, so a failure has a time. */
const ENDED_MARKER = 'GODOT_REACT_RUN_ENDED';
const FAILED_MARKER = 'GODOT_REACT_VERIFY_FAILED';
/** Printed when a verifier run's input isolation starts (demo/src/verifier-input.ts). */
const ISOLATED_MARKER = 'GODOT_REACT_INPUT_ISOLATED';
/** A run that failed with a relevant disturbance in its log is run again at most this many times (plan D22). */
export const MAX_DISTURBED_RERUNS = 2;
/**
 * How long before a failure a disturbance can still be the cause of it. The verifier re-asserts what it has just injected
 * within a settle (about 100 ms), and a disturbance acts at once (a press is cancelled, the hover moves); the longest wait
 * inside one step is a few seconds (transitions, momentum), so a disturbance older than this had its effect undone by the
 * verifier's own next input long before the assertion that failed.
 */
export const DISTURBANCE_RELEVANCE_MS = 5_000;
/** How long a child gets to leave after SIGTERM before it is killed. */
export const KILL_GRACE_MS = 5_000;
const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];

/** Every JSON record the log carries after `marker`, one per line; an unreadable one is `undefined`. */
function records(log, marker) {
  const found = [];
  for (const line of log.split('\n')) {
    const at = line.indexOf(`${marker} `);
    if (at < 0) continue;
    try {
      found.push(JSON.parse(line.slice(at + marker.length + 1)));
    } catch {
      found.push(undefined);
    }
  }
  return found;
}

function isDisturbance(value) {
  return typeof value === 'object' && value !== null && typeof value.kind === 'string'
    && Number.isFinite(value.sinceReadyMs) && typeof value.reachesRoot === 'boolean';
}

/**
 * What a run's log says about interference: every well-formed disturbance, how many records were unreadable, and when
 * the run ended on the verifier's clock (undefined if it never reported: killed at its deadline, or crashed).
 */
export function parseRunReport(log) {
  const logged = records(log, DISTURBED_MARKER);
  const ends = records(log, ENDED_MARKER).filter(value => typeof value === 'object' && value !== null && Number.isFinite(value.sinceReadyMs));
  const disturbances = logged.filter(isDisturbance);
  const endedAtMs = ends.at(-1)?.sinceReadyMs;
  return {
    disturbances,
    unreadable: logged.length - disturbances.length,
    endedAtMs,
    // Whether the window tracks interference at all: a window that takes no input (the text layout probe) has no isolation.
    tracked: log.includes(ISOLATED_MARKER) || logged.length > 0 || endedAtMs !== undefined,
  };
}

/**
 * The disturbances that can explain a failure: they reach the system under test, and they came before the run ended within
 * `DISTURBANCE_RELEVANCE_MS` (the failure is the end of a failed run). A run with no end report has no failure time, so it
 * has none.
 */
export function relevantDisturbances(report) {
  const { endedAtMs } = report;
  if (endedAtMs === undefined) return [];
  return report.disturbances.filter(disturbance => disturbance.reachesRoot
    && disturbance.sinceReadyMs <= endedAtMs && endedAtMs - disturbance.sinceReadyMs <= DISTURBANCE_RELEVANCE_MS);
}

function describeDisturbance(disturbance, endedAtMs) {
  const inFlight = Array.isArray(disturbance.inFlight) && disturbance.inFlight.length > 0 ? `, ${disturbance.inFlight.join(' ')} held` : '';
  return `${disturbance.kind} (${disturbance.detail ?? 'no detail'}) ${endedAtMs - disturbance.sinceReadyMs} ms before the end${inFlight}`;
}

/** Why a failure is a real one, in words: nothing was logged, or what was logged could not have caused it. */
function whyReal(report) {
  if (!report.tracked) return 'this window takes no input, so no interference is tracked for it';
  if (report.endedAtMs === undefined) {
    return 'the run ended without reporting (killed at its deadline, or crashed), so no disturbance can be shown to precede the failure';
  }
  if (report.disturbances.length === 0 && report.unreadable === 0) return 'no interference was detected';
  const parts = [];
  if (report.disturbances.length > 0) {
    parts.push(`${report.disturbances.length} disturbance(s) were logged but none reached the system under test within ${DISTURBANCE_RELEVANCE_MS} ms before the failure`
      + ` (${report.disturbances.map(disturbance => `${disturbance.kind}${disturbance.reachesRoot ? '' : ' with nothing to act on'}`).join(', ')})`);
  }
  if (report.unreadable > 0) parts.push(`${report.unreadable} disturbance record(s) were unreadable`);
  return parts.join('; ');
}

/** The payload of the success marker line, and whether it says the run was partial. */
export function describePass(log, successMarker) {
  const [payload] = records(log, successMarker);
  const skipped = Array.isArray(payload?.skipped) ? payload.skipped.map(String) : [];
  const gaps = Array.isArray(payload?.gaps) ? payload.gaps.map(String) : [];
  return { partial: payload?.partial === true, skipped, gaps, payload };
}

/**
 * Run one native verifier window to completion and judge its log.
 *
 * - A run that passes is a pass, disturbed or not. One that passed only after disturbed failures says so, with the
 *   first failure's text, and keeps that attempt's log and captures.
 * - A run that fails is run again only if a disturbance that reaches the system under test (a mouse event, a focus loss
 *   with a press in flight, a window crossing) came shortly before it failed. Anything else is a real failure and is
 *   never run again, and neither is a run that ended without reporting.
 * - At most `MAX_DISTURBED_RERUNS` re-runs; `retry: false` (`--no-retry`) allows none, for negative controls.
 * - This is the only retry a verify script makes.
 *
 * `leading` are Godot arguments before the `--` that separates the scripts' own (a scene path); `scriptArgs` follow it.
 * `errorPattern` matches log lines that fail a run even if it passed its assertions. `beforeLaunch(attempt)` runs before
 * every launch, a re-run included, and throws to refuse it (the freshness check).
 */
export async function runNativeVerifier({
  godot, project, output, name, resolution, leading = [], scriptArgs, successMarker, artifacts, errorPattern, deadlineMs,
  retry = true, beforeLaunch, killGraceMs = KILL_GRACE_MS, quiet = true,
}) {
  mkdirSync(output, { recursive: true });
  clearStaleEvidence(output);
  const disturbedFailures = [];
  for (let attempt = 1; ; attempt += 1) {
    beforeLaunch?.(attempt);
    const launched = await launch({ godot, project, resolution, leading, scriptArgs, artifacts: artifacts ?? output, deadlineMs, killGraceMs, quiet });
    const { log, code } = launched;
    // `run.log` is always the last attempt's log; every attempt keeps its own.
    writeFileSync(resolve(output, 'run.log'), log);
    const report = parseRunReport(log);
    if (attempt > 1 || report.disturbances.length > 0 || report.unreadable > 0) writeFileSync(resolve(output, `run-attempt-${attempt}.log`), log);
    if (launched.interrupted !== undefined) {
      throw new Error(`${name} was interrupted by ${launched.interrupted}; its Godot window was closed (see ${output}/run.log)`);
    }
    const noisy = quiet ? quietWindowProblem(log) : undefined;
    const failure = noisy === undefined ? judge(log, successMarker, errorPattern, name, code, output, launched.timedOut ? deadlineMs : undefined) : `${name}: ${noisy}; see ${output}/run.log`;
    if (failure === undefined) {
      if (code !== 0) console.warn(`Runtime assertions passed; teardown exited ${code === null ? 'by signal' : code}. Evidence retained.`);
      return passed({ name, attempt, report, log, successMarker, disturbedFailures, output });
    }
    const relevant = relevantDisturbances(report);
    if (relevant.length === 0) throw new Error(`${failure} (${whyReal(report)}, so this is a real failure and is not re-run)`);
    if (!retry) {
      throw new Error(`${failure} (a disturbance reached the system under test before it: ${relevant.map(item => describeDisturbance(item, report.endedAtMs)).join('; ')}; not re-run because retries are off)`);
    }
    disturbedFailures.push({ attempt, failure, disturbances: relevant.map(item => describeDisturbance(item, report.endedAtMs)), evidence: `${output}-failed-attempt-${attempt}` });
    // The re-run overwrites the captures: keep this attempt's.
    rmSync(`${output}-failed-attempt-${attempt}`, { recursive: true, force: true });
    cpSync(artifacts ?? output, `${output}-failed-attempt-${attempt}`, { recursive: true });
    if (attempt > MAX_DISTURBED_RERUNS) {
      throw new Error(`${name} failed in each of its ${attempt} attempts and every one was disturbed by something outside the verifier (${DISTURBED_MARKER} in ${output}/run-attempt-*.log): ${disturbedFailures.map(item => item.failure).join(' | ')}`);
    }
    console.warn(`${name} failed while its window was disturbed (${relevant.map(item => describeDisturbance(item, report.endedAtMs)).join('; ')}); running it again (attempt ${attempt + 1} of ${MAX_DISTURBED_RERUNS + 1}). Failure: ${failure}`);
  }
}

/** The result of a run that passed, printed as the runner's own summary line and returned for the script's. */
function passed({ name, attempt, report, log, successMarker, disturbedFailures, output }) {
  const { partial, skipped, gaps } = describePass(log, successMarker);
  const result = {
    name, passed: true, attempts: attempt, partial, skipped, gaps,
    disturbedFailures, passedDisturbed: report.disturbances.some(disturbance => disturbance.reachesRoot), output,
  };
  result.summary = summarizeRun(result);
  console.log(result.summary);
  return result;
}

/** One line for a passed run: plain, partial, or only after disturbed failures (naming the first one). */
export function summarizeRun(result) {
  const parts = [`${result.name}: PASSED`];
  if (result.partial) parts.push(`(PARTIAL: ${result.skipped.length > 0 ? `not run: ${result.skipped.join(', ')}` : 'some checks did not run'})`);
  if (result.gaps.length > 0) parts.push(`(${result.gaps.length} recorded engine gap(s), not failures: ${result.gaps.join('; ')})`);
  if (result.disturbedFailures.length > 0) {
    const [first] = result.disturbedFailures;
    parts.push(`after ${result.disturbedFailures.length} disturbed failure(s). First failure: ${first.failure}. Disturbance: ${first.disturbances.join('; ')}. Its log and captures: ${result.output}/run-attempt-${first.attempt}.log, ${first.evidence}`);
  } else if (result.passedDisturbed) {
    parts.push('(a disturbance reached its window, but it passed)');
  }
  return parts.join(' ');
}

/** The summary of several runs (the windows of one script), as one block the script prints last. */
export function summarizeRuns(results) {
  return results.map(result => `  ${result.summary}`).join('\n');
}

/** Remove what an earlier invocation left beside this one's evidence, so nothing old reads as this run's. */
function clearStaleEvidence(output) {
  for (const entry of readdirSync(output)) {
    if (entry === 'run.log' || /^run-attempt-\d+\.log$/u.test(entry)) rmSync(resolve(output, entry), { force: true });
  }
  const parent = dirname(output);
  for (const entry of readdirSync(parent)) {
    if (entry.startsWith(`${basename(output)}-failed-attempt-`)) rmSync(resolve(parent, entry), { recursive: true, force: true });
  }
}

/**
 * A verifier that makes the product report an error on purpose prints `GODOT_REACT_EXPECT_ERROR <text>` just before; the
 * next `ERROR:` line that contains the text is then expected, once per announcement. It is removed from what `errorPattern`
 * judges, and an announced error that never appears is a failure of its own: the error is what the verifier checks for.
 */
export const EXPECT_ERROR_MARKER = 'GODOT_REACT_EXPECT_ERROR ';

export function withoutExpectedErrors(log) {
  const lines = log.split('\n');
  const unmet = [];
  for (let index = 0; index < lines.length; index += 1) {
    const marker = lines[index].indexOf(EXPECT_ERROR_MARKER);
    if (marker < 0) continue;
    const text = lines[index].slice(marker + EXPECT_ERROR_MARKER.length).trim();
    const found = lines.findIndex((line, at) => at > index && line.includes('ERROR:') && line.includes(text));
    if (found < 0) unmet.push(text);
    else lines.splice(found, 1);
  }
  return { log: lines.join('\n'), unmet };
}

function judge(log, successMarker, errorPattern, name, code, output, killedAtDeadlineMs) {
  if (!log.includes(successMarker) || log.includes(FAILED_MARKER)) {
    const reason = log.split('\n').find(line => line.includes(FAILED_MARKER));
    const how = killedAtDeadlineMs === undefined ? `exit ${code}` : `killed at its ${killedAtDeadlineMs} ms deadline`;
    return `${name} runtime verification failed (${how})${reason === undefined ? '' : `: ${reason.trim()}`}; see ${output}/run.log`;
  }
  const { log: duringWorkflow, unmet } = withoutExpectedErrors(log.split(successMarker)[0]);
  if (unmet.length > 0) return `${name} announced an error that never appeared (${unmet.join(' | ')}); see ${output}/run.log`;
  if (errorPattern.test(duringWorkflow)) return `${name} emitted a runtime error before completion; see ${output}/run.log`;
  return undefined;
}

/**
 * Start Godot and wait for it, with every way out closing it: its deadline (SIGTERM, then SIGKILL after a grace), a
 * signal sent to this script (forwarded, then SIGKILL after the same grace), and this script exiting for any reason.
 * Nothing is left running, and no timer outlives the child.
 */
async function launch({ godot, project, resolution, leading, scriptArgs, artifacts, deadlineMs, killGraceMs, quiet }) {
  const environment = { ...process.env, GODOT_REACT_ARTIFACTS: artifacts };
  // An automated window never takes focus (scripts/quiet-window.mjs, docs/tracks/quiet-windows.md).
  const { command, env } = quiet ? quietLaunch(godot, environment) : { command: godot, env: environment };
  const child = spawn(command, ['--audio-driver', 'Dummy', '--path', project, '--resolution', resolution, ...leading, '--', ...scriptArgs], {
    env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  const collect = data => { const value = data.toString(); log += value; process.stdout.write(value); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  let timedOut = false;
  let interrupted;
  let escalation;
  const stop = signal => {
    child.kill(signal);
    escalation ??= setTimeout(() => child.kill('SIGKILL'), killGraceMs);
  };
  const deadline = setTimeout(() => { timedOut = true; stop('SIGTERM'); }, deadlineMs);
  const forwarders = FORWARDED_SIGNALS.map(signal => [signal, () => { interrupted = signal; stop(signal); }]);
  for (const [signal, handler] of forwarders) process.on(signal, handler);
  const abandon = () => child.kill('SIGKILL');
  process.on('exit', abandon);
  try {
    const code = await new Promise((resolvePromise, reject) => { child.on('error', reject); child.on('exit', resolvePromise); });
    return { log, code, timedOut, interrupted };
  } finally {
    clearTimeout(deadline);
    clearTimeout(escalation);
    for (const [signal, handler] of forwarders) process.off(signal, handler);
    process.off('exit', abandon);
  }
}
