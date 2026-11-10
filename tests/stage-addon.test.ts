import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

// A release stages with `--require-all-platforms` (.github/workflows/ci.yml and release.yml): a package that lacks a platform's library
// loads on the others and fails on that one, so the staging refuses it instead of packing it. These run the refusals only: a staging that
// succeeds writes the repository's own `addon/`, which the workflows' package jobs do for real.

const root = resolve(__dirname, '..');
const script = join(root, 'scripts', 'stage-addon.mjs');
const manifest = join(root, 'demo', 'addons', 'godot-react-ui', 'react_ui.gdextension');
const FLAG = '--require-all-platforms';

function stage(source: string): { status: number | null; stdout: string; stderr: string } {
  return spawnSync('node', [script, FLAG, `--source=${source}`], { encoding: 'utf8', timeout: 30_000, cwd: root });
}

test('a source without one of the manifest\'s libraries is refused, naming it, before anything is staged', t => {
  const source = mkdtempSync(join(tmpdir(), 'stage-addon-'));
  t.after(() => rmSync(source, { recursive: true, force: true }));
  copyFileSync(manifest, join(source, 'react_ui.gdextension'));
  mkdirSync(join(source, 'bin'));
  for (const name of ['libgodot_react_ui.dylib', 'libgodot_react_ui.so', 'godot_react_ui.dll']) writeFileSync(join(source, 'bin', name), '');
  const result = stage(source);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--require-all-platforms: .* lacks godot_react_ui\.web\.wasm \(react_ui\.gdextension names libgodot_react_ui\.dylib, libgodot_react_ui\.so, godot_react_ui\.dll, godot_react_ui\.web\.wasm\)\. Nothing was staged\./u);
  assert.equal(result.stdout, '', 'nothing was staged or printed before the refusal');
});

test('a source that is not there is an error for a release, not the warning a checkout gets', t => {
  const parent = mkdtempSync(join(tmpdir(), 'stage-addon-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const result = stage(join(parent, 'missing'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--require-all-platforms: source directory not found: .*missing/u);
  assert.equal(result.stdout, '');
});
