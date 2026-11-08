import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as shared from '../scripts/text-ink.mjs';
import * as native from '../demo/src/text-ink';

/**
 * The two copies of the ink measures (`scripts/text-ink.mjs` for Chrome's numbers and the Web verifier, `demo/src/text-ink.ts` for the
 * native verifier) must answer alike, and the comparison must tell a glyph that is not drawn from one that is.
 */

const WIDTH = 40;
const HEIGHT = 12;
const CHANNELS = 4;
const WHITE = 255;
/** White is not exactly no ink: the three weights of a pixel's brightness add up to one with a little rounding. */
const ROUNDING = 1e-9;

function close(actual: number, expected: number, message?: string): void {
  assert.ok(Math.abs(actual - expected) < ROUNDING, `${message ?? ''} ${actual} is not ${expected}`.trim());
}

interface Picture {
  readonly width: number;
  readonly height: number;
  readonly channels: number;
  readonly pixels: Uint8Array;
}

/** A white picture `scale` times the size of the logical one, with black rectangles (logical pixels) drawn in it. */
function picture(scale: number, strokes: readonly { x: number; y: number; width: number; height: number; level?: number }[]): Picture {
  const width = WIDTH * scale;
  const height = HEIGHT * scale;
  const pixels = new Uint8Array(width * height * CHANNELS).fill(WHITE);
  for (const stroke of strokes) {
    for (let y = Math.round(stroke.y * scale); y < Math.round((stroke.y + stroke.height) * scale); y += 1) {
      for (let x = Math.round(stroke.x * scale); x < Math.round((stroke.x + stroke.width) * scale); x += 1) {
        const offset = (y * width + x) * CHANNELS;
        pixels.fill(stroke.level ?? 0, offset, offset + CHANNELS - 1);
      }
    }
  }
  return { width, height, channels: CHANNELS, pixels };
}

const LETTERS = [
  { x: 4, y: 2, width: 3, height: 8 },
  { x: 12, y: 2, width: 3, height: 8 },
  { x: 30, y: 2, width: 3, height: 8 },
];

test('the ink of a window is the black in it, in logical pixels squared, at any ratio', () => {
  for (const scale of [1, 2, 3]) {
    const image = picture(scale, LETTERS);
    const window = { left: 3, right: 8, top: 0, bottom: HEIGHT };
    close(shared.inkMass(image, scale, window), 24, `ratio ${scale}`);
    close(native.inkMass(image, scale, window), 24, `ratio ${scale}`);
    const nothing = { left: 16, right: 28, top: 0, bottom: HEIGHT };
    close(shared.inkMass(image, scale, nothing), 0);
    close(native.inkMass(image, scale, nothing), 0);
  }
});

test('the right edge of a line is the right side of its rightmost stroke, or nothing', () => {
  for (const scale of [1, 2, 3]) {
    const image = picture(scale, LETTERS);
    const whole = { left: 0, right: WIDTH, top: 0, bottom: HEIGHT };
    assert.equal(shared.inkRightEdge(image, scale, whole), 33, `ratio ${scale}`);
    assert.equal(native.inkRightEdge(image, scale, whole), 33, `ratio ${scale}`);
    const short = { left: 0, right: 20, top: 0, bottom: HEIGHT };
    assert.equal(shared.inkRightEdge(image, scale, short), 15);
    assert.equal(native.inkRightEdge(image, scale, short), 15);
    const empty = { left: 17, right: 28, top: 0, bottom: HEIGHT };
    assert.equal(shared.inkRightEdge(image, scale, empty), undefined);
    assert.equal(native.inkRightEdge(image, scale, empty), undefined);
  }
});

test('a faint fringe is not the end of a line', () => {
  const fringe = picture(1, [...LETTERS, { x: 33, y: 2, width: 1, height: 8, level: 230 }]);
  const whole = { left: 0, right: WIDTH, top: 0, bottom: HEIGHT };
  assert.equal(shared.inkRightEdge(fringe, 1, whole), 33);
  assert.equal(native.inkRightEdge(fringe, 1, whole), 33);
});

test('a text is measured in the windows its lines and cells give, in both copies alike', () => {
  const text = {
    box: { x: 2, width: 34 },
    lines: [{ top: 1, bottom: 11 }],
    cells: [[0, 3, 8, 0], [1, 11, 16, 0], [2, 29, 34, 0]] as const,
  };
  for (const scale of [1, 2]) {
    const image = picture(scale, LETTERS);
    for (const measure of [shared.measureTextInk, native.measureTextInk]) {
      const ink = measure(image, scale, text);
      assert.deepEqual(ink.edges, [33], `ratio ${scale}`);
      assert.equal(ink.glyphs?.length, 3);
      ink.glyphs?.forEach(glyph => close(glyph, 24, `ratio ${scale}`));
    }
  }
});

test('a cell on a line the text does not have is refused, in both copies', () => {
  const text = { box: { x: 0, width: WIDTH }, lines: [{ top: 0, bottom: HEIGHT }], cells: [[0, 3, 8, 1]] as const };
  const image = picture(1, LETTERS);
  assert.throws(() => shared.measureTextInk(image, 1, text), /line 1/u);
  assert.throws(() => native.measureTextInk(image, 1, text), /line 1/u);
});

const CELLS = [[0, 3, 8, 0], [1, 11, 16, 0], [2, 29, 34, 0]] as const;
const CHROME_INK = { edges: [33, 33], glyphs: [24, 24, 24] } as const;
const CHARACTERS = ['a', 'b', 'c'];

for (const [name, compare] of [['shared', shared.inkDeviations], ['native', native.inkDeviations]] as const) {
  test(`${name}: a text drawn as Chrome draws it has no deviation`, () => {
    const ours = { edges: [32.5, 33.5], glyphs: [22, 27, 25] };
    assert.deepEqual(compare(ours, CHROME_INK, CELLS, CHARACTERS), []);
  });

  test(`${name}: a glyph that is not drawn is found, and so is a line that ends early`, () => {
    const undrawn = { edges: [30, 33], glyphs: [24, 24, 0] };
    const found = compare(undrawn, CHROME_INK, CELLS, CHARACTERS);
    assert.deepEqual(found.map(each => each.what), ['line 0 ink edge', 'character 2 ("c") ink']);
    assert.equal(compare({ edges: [33, 33], glyphs: [24, 24, 0] }, CHROME_INK, CELLS, CHARACTERS).length, 1);
  });

  test(`${name}: too much ink is found, a hairline's share is not looked at, and a line with no ink where Chrome has some is found`, () => {
    assert.equal(compare({ edges: [33, 33], glyphs: [24, 24, 24 * 2] }, CHROME_INK, CELLS, CHARACTERS).length, 1);
    const dot = { edges: [33, 33], glyphs: [24, 24, 0.1] };
    assert.deepEqual(compare({ edges: [33, 33], glyphs: [24, 24, 0] }, dot, CELLS, CHARACTERS), []);
    assert.equal(compare({ edges: [33, null], glyphs: [24, 24, 24] }, CHROME_INK, CELLS, CHARACTERS).length, 1);
    assert.deepEqual(compare({ edges: [33, null], glyphs: [24, 24, 24] }, { edges: [33, null], glyphs: [24, 24, 24] }, CELLS, CHARACTERS), []);
  });

  test(`${name}: a character that was not measured is refused`, () => {
    assert.throws(() => compare({ edges: [33, 33], glyphs: [24, 24] }, CHROME_INK, CELLS, CHARACTERS), /character 2/u);
  });
}

test('both copies have the same tolerances', () => {
  assert.equal(shared.EDGE_INK, native.EDGE_INK);
  assert.equal(shared.EDGE_REACH_PX, native.EDGE_REACH_PX);
  assert.equal(shared.INK_EDGE_TOLERANCE_PX, native.INK_EDGE_TOLERANCE_PX);
  assert.equal(shared.GLYPH_INK_MIN_SHARE, native.GLYPH_INK_MIN_SHARE);
  assert.equal(shared.GLYPH_INK_MAX_SHARE, native.GLYPH_INK_MAX_SHARE);
  assert.equal(shared.GLYPH_INK_FLOOR, native.GLYPH_INK_FLOOR);
});
