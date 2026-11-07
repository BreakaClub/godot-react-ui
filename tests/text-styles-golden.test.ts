import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PAGES, allClassNames, allSamples, textClassName } from '../demo/src/text-styles-data';
import { GOLDEN_TEXTS } from '../demo/src/text-styles-golden';

const root = resolve(__dirname, '..');

test('every text of the lab has numbers from Chrome, and the two copies of them agree', () => {
  const json: unknown = JSON.parse(readFileSync(resolve(root, 'scripts/text-styles-golden.json'), 'utf8'));
  assert.deepEqual(json, JSON.parse(JSON.stringify(GOLDEN_TEXTS)), 'scripts/text-styles-golden.json and demo/src/text-styles-golden.ts are written together');
  const ids = allSamples().map(sample => sample.id);
  assert.equal(new Set(ids).size, ids.length, 'sample ids are unique');
  assert.deepEqual(Object.keys(GOLDEN_TEXTS).sort(), [...ids].sort(), 'the golden numbers are for exactly the lab\'s texts: regenerate with scripts/text-styles-reference.mjs --golden');
  for (const page of PAGES) {
    for (const sample of page.samples) {
      const golden = GOLDEN_TEXTS[sample.id];
      assert.ok(golden !== undefined, sample.id);
      assert.equal(golden.page, page.id);
      assert.ok(golden.box.width > 0 && golden.box.height > 0, `${sample.id} has a box`);
      assert.ok(golden.lines.length > 0, `${sample.id} has lines`);
      assert.equal(golden.chars !== undefined, sample.selection === true, `${sample.id}: Chrome records the characters of exactly the selection texts`);
    }
  }
});

test('the reference CSS has a rule for every class of the lab', () => {
  const css = readFileSync(resolve(root, 'scripts/text-styles-reference.css'), 'utf8');
  // Tailwind escapes the characters of a class name that CSS reads as syntax: \[, \], \/, \.
  const escaped = (name: string): string => name.replace(/[[\]/.]/gu, character => `\\${character}`);
  const missing = allClassNames().filter(name => !css.includes(`.${escaped(name)}`));
  assert.deepEqual(missing, [], 'regenerate the CSS: scripts/text-styles-reference.css lists the command');
});

test('a sample takes the sans family unless it names another or uses the theme font', () => {
  const sample = (className: string, themeFont = false) => ({ id: 'x', note: '', className, text: '', ...(themeFont ? { themeFont } : {}) });
  assert.equal(textClassName(sample('text-base')), 'font-sans text-base');
  assert.equal(textClassName(sample('font-mono text-base')), 'font-mono text-base');
  assert.equal(textClassName(sample('text-base', true)), 'text-base');
});
