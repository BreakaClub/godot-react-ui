import assert from 'node:assert/strict';
import test from 'node:test';
import { columnAtX, gutterWidthFor, lineAtY, scrollToReveal, visibleLines, xOfColumn, yOfLine, OVERSCAN_LINES, type Grid } from '../demo/src/editor/geometry';

// Where lines and columns are in the content (demo/src/editor/geometry.ts). The grid is whatever the view measured.

const GRID: Grid = { advance: 7.25, lineHeight: 20, gutterWidth: 40 };

test('a press at an x is the column whose edge is nearest, so either half of a character picks a side of it', () => {
  assert.equal(columnAtX(40, GRID), 0);
  assert.equal(columnAtX(40 + 7.25 * 0.49, GRID), 0);
  assert.equal(columnAtX(40 + 7.25 * 0.51, GRID), 1);
  assert.equal(columnAtX(40 + 7.25 * 10, GRID), 10);
  assert.equal(columnAtX(0, GRID), 0, 'in the gutter it is the first column');
  assert.equal(columnAtX(1000, GRID), Math.round((1000 - 40) / 7.25));
});

test('columns and lines map to pixels and back', () => {
  for (const column of [0, 1, 7, 80]) assert.equal(columnAtX(xOfColumn(column, GRID), GRID), column);
  for (const line of [1, 2, 50]) assert.equal(lineAtY(yOfLine(line, GRID) + 3, GRID, 100), line);
  assert.equal(lineAtY(-50, GRID, 100), 1);
  assert.equal(lineAtY(99999, GRID, 100), 100);
});

test('the gutter is wide enough for the line count and never narrower than three digits', () => {
  assert.equal(gutterWidthFor(5, 8), Math.ceil((3 + 3) * 8));
  assert.ok(gutterWidthFor(12345, 8) > gutterWidthFor(999, 8));
});

test('the lines drawn are the ones in view and a margin, held to the file', () => {
  assert.deepEqual(visibleLines(0, 200, GRID, 1000), { first: 1, last: 10 + OVERSCAN_LINES });
  assert.deepEqual(visibleLines(2000, 200, GRID, 1000), { first: 101 - OVERSCAN_LINES, last: 110 + OVERSCAN_LINES });
  assert.deepEqual(visibleLines(0, 200, GRID, 4), { first: 1, last: 4 });
});

test('scrolling to reveal moves by the least, with a margin on the side it moves to', () => {
  assert.equal(scrollToReveal(100, 200, 150, 170, 20), 100, 'already in view');
  assert.equal(scrollToReveal(100, 200, 310, 330, 20), 150, 'below: the bottom edge plus the margin');
  assert.equal(scrollToReveal(100, 200, 90, 110, 20), 70, 'above: the top edge less the margin');
  assert.equal(scrollToReveal(100, 200, 0, 20, 20), 0, 'never before the start');
  assert.equal(scrollToReveal(0, 30, 100, 120, 20), 95, 'a margin larger than the room is reduced to what is left');
});
