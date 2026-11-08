import assert from 'node:assert/strict';
import test from 'node:test';
import { FONT_SAMPLES } from '../demo/src/font-slices-data';
import { SAMPLE_NOTES } from '../demo/src/font-slices-lab';
import { PAGES as RICH_PAGES } from '../demo/src/rich-text-data';
import { PAGE_NOTES as RICH_NOTES } from '../demo/src/rich-text-lab';
import { PAGES as STYLE_PAGES } from '../demo/src/text-styles-data';
import { PAGE_NOTES as STYLE_NOTES } from '../demo/src/text-styles-lab';

// The text labs explain each of their pages and samples in the lab itself (docs/tracks/lab-clarity.md): a page added to a lab's data must be
// explained, and an explanation must belong to a page, so the two cannot drift apart. The lab throws when it meets a page with no note, but only
// for the page it shows, so this checks them all.

/** The words a limit's text starts after: the lab prints "Known limit: " in front of it. */
const LIMIT_PREFIX = /^known limit/iu;

function checkNotes(name: string, ids: readonly string[], notes: readonly { id: string; caption?: string; note?: string; limit?: string }[]): void {
  assert.deepEqual([...notes.map((note) => note.id)].sort(), [...ids].sort(), `${name}: every page has exactly one note, and every note has a page`);
  for (const entry of notes) {
    const text = entry.caption ?? entry.note ?? '';
    assert.ok(text.trim() !== '' && text.endsWith('.'), `${name} ${entry.id}: the note is a sentence`);
    assert.ok(!text.includes('!'), `${name} ${entry.id}: no exclamation marks`);
    if (entry.limit !== undefined) {
      assert.ok(entry.limit.endsWith('.') && !LIMIT_PREFIX.test(entry.limit), `${name} ${entry.id}: the limit is a sentence that does not say "Known limit" itself`);
    }
  }
}

test('every text styles page has its note', () => {
  checkNotes('text styles', STYLE_PAGES.map((page) => page.id), STYLE_NOTES);
});

test('every rich text page has its note', () => {
  checkNotes('rich text', RICH_PAGES.map((page) => page.id), RICH_NOTES);
});

test('every font fallback sample has its note', () => {
  checkNotes('font fallback', FONT_SAMPLES.map((sample) => sample.id), SAMPLE_NOTES);
});
