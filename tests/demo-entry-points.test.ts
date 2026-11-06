import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { DEMO_ENTRY_POINTS } from '../scripts/demo-entry-points.mjs';

// The demo's bundles (scripts/demo-entry-points.mjs): `pnpm build` makes them all and `pnpm dev` keeps them all up to date.

const root = resolve(__dirname, '..');

test('every demo TypeScript script is an entry point: the Web export fails on a script with no module of its own', () => {
  const scripts = readdirSync(resolve(root, 'demo/src')).filter((name) => name.endsWith('.ts')).map((name) => `demo/src/${name}`);
  const missing = scripts.filter((script) => !DEMO_ENTRY_POINTS.includes(script));
  assert.deepEqual(missing, []);
});

test('every entry point is a file, listed once', () => {
  for (const entry of DEMO_ENTRY_POINTS) assert.ok(existsSync(resolve(root, entry)), `${entry} does not exist`);
  assert.equal(new Set(DEMO_ENTRY_POINTS).size, DEMO_ENTRY_POINTS.length);
});

test('the build and the watcher take the list from the module and keep none of their own', () => {
  for (const script of ['build', 'dev']) {
    const text = readFileSync(resolve(root, 'scripts', `${script}.mjs`), 'utf8');
    assert.match(text, /\.\.\.DEMO_ENTRY_POINTS/, `${script}.mjs does not use the shared list`);
    assert.doesNotMatch(text, /demo\/src\/[\w-]+\.tsx?'/, `${script}.mjs names a demo entry point itself`);
  }
});
