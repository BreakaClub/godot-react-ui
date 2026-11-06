import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { MAX_DISTURBED_RERUNS, runNativeVerifier } from '../scripts/native-run.mjs';

// The retry policy of the native verify scripts (plan D22), exercised with a stand-in for Godot that prints a
// scripted log per launch, so no window opens and no input is involved.

const PASSED = 'GODOT_REACT_VERIFY_PASSED';
const FAILED = 'GODOT_REACT_VERIFY_FAILED Error: Entering a child hovers its parent';
const DISTURBED = 'GODOT_REACT_RUN_DISTURBED {"kind":"foreign-input","detail":"InputEventMouseMotion device=32"}';

function fakeGodot(directory: string, logs: readonly string[]): string {
  const path = join(directory, 'fake-godot.mjs');
  writeFileSync(join(directory, 'plan.json'), JSON.stringify(logs));
  writeFileSync(path, `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
const directory = ${JSON.stringify(directory)};
const logs = JSON.parse(readFileSync(directory + '/plan.json', 'utf8'));
const launches = existsSync(directory + '/launches') ? readFileSync(directory + '/launches', 'utf8').length : 0;
appendFileSync(directory + '/launches', 'x');
console.log(logs[Math.min(launches, logs.length - 1)]);
`);
  chmodSync(path, 0o755);
  return path;
}

async function run(logs: readonly string[]): Promise<{ error: Error | undefined; launches: number; outputs: string[] }> {
  const directory = mkdtempSync(join(tmpdir(), 'native-run-'));
  const output = join(directory, 'out');
  let error: Error | undefined;
  try {
    await runNativeVerifier({
      godot: fakeGodot(directory, logs), project: directory, output, name: 'landscape', resolution: '1x1',
      scriptArgs: ['--verify'], successMarker: PASSED, errorPattern: /ERROR:|Uncaught|\[panic /u, deadlineMs: 30_000,
    });
  } catch (caught) {
    assert.ok(caught instanceof Error);
    error = caught;
  }
  let launches = 0;
  try {
    launches = readFileSync(join(directory, 'launches'), 'utf8').length;
  } catch {
    launches = 0;
  }
  return { error, launches, outputs: readdirSync(output) };
}

test('a run that passes is run once, disturbed or not', async () => {
  const quiet = await run([PASSED]);
  assert.equal(quiet.error, undefined);
  assert.equal(quiet.launches, 1);
  const disturbed = await run([`${DISTURBED}\n${PASSED}`]);
  assert.equal(disturbed.error, undefined);
  assert.equal(disturbed.launches, 1, 'a disturbed pass is a pass');
  assert.ok(disturbed.outputs.includes('run-attempt-1.log'), 'and the disturbance stays in the log');
});

test('a run that fails without interference is a real failure and is never run again', async () => {
  const result = await run([FAILED]);
  assert.equal(result.launches, 1);
  assert.match(result.error?.message ?? '', /Entering a child hovers its parent/);
  assert.match(result.error?.message ?? '', /no interference was detected/);
  assert.deepEqual(result.outputs, ['run.log']);
});

test('a run that fails with interference is run again, and a later pass passes', async () => {
  const result = await run([`${DISTURBED}\n${FAILED}`, PASSED]);
  assert.equal(result.error, undefined);
  assert.equal(result.launches, 2);
  assert.deepEqual([...result.outputs].sort(), ['run-attempt-1.log', 'run-attempt-2.log', 'run.log']);
});

test('a run that fails with interference every time is run at most twice more, then fails with it recorded', async () => {
  const result = await run([`${DISTURBED}\n${FAILED}`]);
  assert.equal(result.launches, 1 + MAX_DISTURBED_RERUNS);
  assert.match(result.error?.message ?? '', /disturbed by something outside the verifier/);
  assert.match(result.error?.message ?? '', /run-attempt-/);
});

test('a failure that follows a disturbed one but is clean is real and ends the re-runs', async () => {
  const result = await run([`${DISTURBED}\n${FAILED}`, FAILED]);
  assert.equal(result.launches, 2, 'the second failure had no interference');
  assert.match(result.error?.message ?? '', /no interference was detected/);
});

test('an error line before the success marker fails a run like a failed assertion', async () => {
  const result = await run([`ERROR: something broke\n${PASSED}`]);
  assert.equal(result.launches, 1);
  assert.match(result.error?.message ?? '', /emitted a runtime error before completion/);
});
