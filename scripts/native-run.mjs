import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The line the demo logs (demo/src/verifier-input.ts) the first time a run sees something its verifier did
 * not cause: input from a real device, the window losing OS focus, the cursor crossing the window.
 */
const DISTURBED_MARKER = 'GODOT_REACT_RUN_DISTURBED';
/** A run that failed with a disturbance in its log is run again at most this many times (plan D22). */
export const MAX_DISTURBED_RERUNS = 2;

/**
 * Run one native verifier window to completion and judge its log.
 *
 * - A run that passes is a pass, disturbed or not (a disturbance is reported, never absorbed silently).
 * - A run that fails without a disturbance in its log failed for real: it is never run again.
 * - A run that fails with one is run again, at most `MAX_DISTURBED_RERUNS` times, then fails with the
 *   disturbances recorded. This is the only retry a verify script makes.
 *
 * `leading` are Godot arguments before the `--` that separates the scripts' own (a scene path);
 * `scriptArgs` follow it. `errorPattern` matches log lines that fail a run even if it passed its assertions.
 */
export async function runNativeVerifier({
  godot, project, output, name, resolution, leading = [], scriptArgs, successMarker, artifacts, errorPattern, deadlineMs,
}) {
  mkdirSync(output, { recursive: true });
  const failures = [];
  for (let attempt = 1; ; attempt += 1) {
    const { log, code } = await launch({ godot, project, resolution, leading, scriptArgs, artifacts: artifacts ?? output, deadlineMs });
    // `run.log` is always the last attempt's log; every attempt keeps its own.
    writeFileSync(resolve(output, 'run.log'), log);
    if (attempt > 1 || log.includes(DISTURBED_MARKER)) writeFileSync(resolve(output, `run-attempt-${attempt}.log`), log);
    const disturbed = log.includes(DISTURBED_MARKER);
    const failure = judge(log, successMarker, errorPattern, name, code, output);
    if (failure === undefined) {
      if (disturbed) console.warn(`${name} passed although its window was disturbed; see ${output}/run.log (${DISTURBED_MARKER}).`);
      if (code !== 0) console.warn(`Runtime assertions passed; teardown exited ${code}. Evidence retained.`);
      return;
    }
    if (!disturbed) throw new Error(`${failure} (no interference was detected, so this is a real failure and is not re-run)`);
    failures.push(failure);
    if (attempt > MAX_DISTURBED_RERUNS) {
      throw new Error(`${name} failed in each of its ${attempt} attempts and every one was disturbed by something outside the verifier (${DISTURBED_MARKER} in ${output}/run-attempt-*.log): ${failures.join(' | ')}`);
    }
    console.warn(`${name} failed while its window was disturbed (${DISTURBED_MARKER}); running it again (attempt ${attempt + 1} of ${MAX_DISTURBED_RERUNS + 1}). Failure: ${failure}`);
  }
}

function judge(log, successMarker, errorPattern, name, code, output) {
  if (!log.includes(successMarker) || log.includes('GODOT_REACT_VERIFY_FAILED')) {
    const reason = log.split('\n').find(line => line.includes('GODOT_REACT_VERIFY_FAILED'));
    return `${name} runtime verification failed (exit ${code})${reason === undefined ? '' : `: ${reason.trim()}`}; see ${output}/run.log`;
  }
  const duringWorkflow = log.split(successMarker)[0];
  if (errorPattern.test(duringWorkflow)) return `${name} emitted a runtime error before completion; see ${output}/run.log`;
  return undefined;
}

async function launch({ godot, project, resolution, leading, scriptArgs, artifacts, deadlineMs }) {
  const child = spawn(godot, ['--audio-driver', 'Dummy', '--path', project, '--resolution', resolution, ...leading, '--', ...scriptArgs], {
    env: { ...process.env, GODOT_REACT_ARTIFACTS: artifacts }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  const collect = data => { const value = data.toString(); log += value; process.stdout.write(value); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  const timer = setTimeout(() => child.kill('SIGTERM'), deadlineMs);
  const code = await new Promise((resolvePromise, reject) => { child.on('error', reject); child.on('exit', resolvePromise); });
  clearTimeout(timer);
  return { log, code };
}
