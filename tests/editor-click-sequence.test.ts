import assert from 'node:assert/strict';
import test from 'node:test';
import { CLICK_INTERVAL_MS, CLICK_SLOP_PX, ClickSequence } from '../demo/src/editor/view/click-sequence';

// The count a press has in a row (demo/src/editor/view/click-sequence.ts), by the rule native counts clicks by.

test('presses in quick succession at one place count up', () => {
  const sequence = new ClickSequence();
  assert.equal(sequence.press(10, 10, 0), 1);
  assert.equal(sequence.press(10, 10, 100), 2);
  assert.equal(sequence.press(11, 10, 200), 3);
  assert.equal(sequence.press(10, 10, 300), 4);
});

test('a slow press or a distant one starts again', () => {
  const sequence = new ClickSequence();
  sequence.press(0, 0, 0);
  assert.equal(sequence.press(0, 0, CLICK_INTERVAL_MS + 1), 1);
  assert.equal(sequence.press(0, 0, CLICK_INTERVAL_MS + 100), 2);
  assert.equal(sequence.press(CLICK_SLOP_PX + 1, 0, CLICK_INTERVAL_MS + 200), 1);
});

test('the slop is from where the sequence began, so a pointer that drifts ends it', () => {
  const sequence = new ClickSequence();
  assert.equal(sequence.press(0, 0, 0), 1);
  assert.equal(sequence.press(3, 0, 100), 2);
  assert.equal(sequence.press(6, 0, 200), 1);
});
