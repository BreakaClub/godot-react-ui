import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { CLI_FIX, CLI_VARIABLE, godotTscCli } from '../scripts/godot-tsc.mjs';

// The tests that compile with Bun's checker drive `godot-tsc-cli`, which the npm package does not ship: a checkout of godot-tsc builds it, and
// `GODOT_TSC_CLI` names it. Without the variable those tests skip, which is how CI runs them; with a variable that names no file they must not skip,
// or a mistyped path would read as a pass.

test('no variable, or an empty one, is no process: the tests that need it skip', () => {
  assert.equal(godotTscCli({}), undefined);
  assert.equal(godotTscCli({ [CLI_VARIABLE]: '' }), undefined);
  assert.ok(CLI_FIX.includes(CLI_VARIABLE), 'the skip message names the variable');
});

test('a variable that names a file is that file, and one that names none throws', t => {
  const directory = mkdtempSync(join(tmpdir(), 'godot-tsc-cli-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const cli = join(directory, 'godot-tsc-cli');
  writeFileSync(cli, '');
  assert.equal(godotTscCli({ [CLI_VARIABLE]: cli }), cli);
  const missing = join(directory, 'missing', 'godot-tsc-cli');
  assert.throws(() => godotTscCli({ [CLI_VARIABLE]: missing }), new RegExp(`^Error: ${CLI_VARIABLE} names .*missing/godot-tsc-cli, which does not exist\\.$`, 'u'));
});
