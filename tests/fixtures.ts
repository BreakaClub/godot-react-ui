import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FIXTURE_DIRECTORY = resolve(__dirname, 'fixtures');

/**
 * The JavaScript half of a cross-language contract. A JSON fixture holds what the TypeScript side
 * produces for the native side (compiled styles, commit payloads); the Rust tests parse and
 * validate the same file with the real `deny_unknown_fields` types. If the TypeScript output
 * changes, this fails until the fixture is regenerated with `UPDATE_FIXTURES=1 pnpm test`, and the
 * Rust tests then judge the new shape.
 */
export function checkFixture(name: string, value: unknown): void {
  const path = resolve(FIXTURE_DIRECTORY, name);
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (process.env.UPDATE_FIXTURES === '1') {
    writeFileSync(path, text);
    return;
  }
  assert.equal(text, readFileSync(path, 'utf8'), `${name} is stale: run UPDATE_FIXTURES=1 pnpm test and re-run cargo test`);
}
