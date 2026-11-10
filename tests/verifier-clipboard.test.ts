import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// The machine's clipboard is the person's: a verifier run keeps its own in memory
// (native/clipboard.rs, `VerifierInputIsolation`), and nothing a verifier does may reach `DisplayServer`'s. This reads the
// demo's sources so a new section that calls it directly fails here, not on a person's pasteboard.

const DEMO = join(__dirname, '..', 'demo', 'src');
const SYSTEM_CLIPBOARD = /DisplayServer\s*\.\s*clipboard(Get|Set|Has|GetImage|HasImage|GetPrimary|SetPrimary)\w*\s*\(/u;

test('no verifier or owner of a verifier run touches DisplayServer\'s clipboard', () => {
  const offenders: string[] = [];
  for (const name of readdirSync(DEMO).filter(file => /\.tsx?$/u.test(file))) {
    const lines = readFileSync(join(DEMO, name), 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (SYSTEM_CLIPBOARD.test(line)) offenders.push(`demo/src/${name}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], 'use verifierClipboard (demo/src/verifier-input.ts)');
});

test('the isolation switches the clipboard to memory before any verifier runs', () => {
  const source = readFileSync(join(DEMO, 'verifier-input.ts'), 'utf8');
  assert.match(source, /ReactUiRoot\.isolateClipboard\(true\)/u);
  // It happens in the constructor every owner goes through, with the window flags and the device filter.
  const constructor = source.slice(source.indexOf('private constructor'), source.indexOf('static begin'));
  assert.match(constructor, /isolateClipboard\(true\)/u);
});
