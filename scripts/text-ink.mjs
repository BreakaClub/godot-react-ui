// What a picture of black text on white holds, measured the way the text styles verifiers hold the library to Chrome:
// the ink of one character's cell, and the right edge of the ink of one line. Chrome's numbers (`scripts/text-styles-reference.mjs --golden`) and the
// Web verifier's (`scripts/verify-text-styles-web.mjs`) are read with these functions; the native verifier has the same two in
// `demo/src/text-ink.ts`, and `tests/text-ink.test.ts` holds the two copies to the same answers.
//
// An image is `{ width, height, channels, pixels }`: 8-bit RGB or RGBA rows (what `decodePng` gives). A rectangle is in logical pixels
// (`{ left, right, top, bottom }`); `scale` is the picture's device pixels per logical pixel.

/** A pixel with at least this much ink (0 is white, 1 is black) is part of a stroke when the edge of a line's ink is looked for. */
export const EDGE_INK = 0.25;

const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const LEVELS = 255;

/** How dark the pixel at device pixel (`x`, `y`) is: 0 for white, 1 for black. */
export function inkAt(image, x, y) {
  const offset = (y * image.width + x) * image.channels;
  const { pixels } = image;
  return 1 - (RED_WEIGHT * pixels[offset] + GREEN_WEIGHT * pixels[offset + 1] + BLUE_WEIGHT * pixels[offset + 2]) / LEVELS;
}

/** The device pixels a logical rectangle covers: its edges rounded outwards, and kept in the picture. */
function deviceWindow(image, scale, rect) {
  return {
    x0: Math.max(0, Math.floor(rect.left * scale)),
    x1: Math.min(image.width, Math.ceil(rect.right * scale)),
    y0: Math.max(0, Math.floor(rect.top * scale)),
    y1: Math.min(image.height, Math.ceil(rect.bottom * scale)),
  };
}

/** The ink in a rectangle, in logical pixels squared: every pixel's ink added up and divided by `scale` squared, so the number does not depend on the ratio. */
export function inkMass(image, scale, rect) {
  const { x0, x1, y0, y1 } = deviceWindow(image, scale, rect);
  let mass = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) mass += inkAt(image, x, y);
  }
  return mass / (scale * scale);
}

/** The right edge of the ink in a rectangle, in logical pixels: the right side of the rightmost pixel column with a pixel of at least `EDGE_INK`; `undefined` for none. */
export function inkRightEdge(image, scale, rect) {
  const { x0, x1, y0, y1 } = deviceWindow(image, scale, rect);
  for (let x = x1 - 1; x >= x0; x -= 1) {
    for (let y = y0; y < y1; y += 1) {
      if (inkAt(image, x, y) >= EDGE_INK) return (x + 1) / scale;
    }
  }
  return undefined;
}

/** How far past a text's box, in logical pixels, the right edge of a line's ink is looked for: the fringe of an antialiased stroke at the box's edge. */
export const EDGE_REACH_PX = 1;

/** Where the ink of one line is looked for: the text's box widened by `EDGE_REACH_PX`, over the line's height. */
export function lineWindow(box, line) {
  return { left: box.x - EDGE_REACH_PX, right: box.x + box.width + EDGE_REACH_PX, top: line.top, bottom: line.bottom };
}

/** Where the ink of one character is looked for: its cell (`[index, left, right, line]`) over the height of its line. */
export function cellWindow(cell, line) {
  return { left: cell[1], right: cell[2], top: line.top, bottom: line.bottom };
}

/**
 * The ink of a text in `image`: the right edge of each of its lines (`null` for a line with no ink in the window) and, if Chrome gave it
 * the cells of its characters, the ink of each. `text` is `{ box, lines, cells? }` as the golden numbers have them.
 */
export function measureTextInk(image, scale, text) {
  const edges = text.lines.map(line => inkRightEdge(image, scale, lineWindow(text.box, line)) ?? null);
  if (text.cells === undefined) return { edges };
  const glyphs = text.cells.map(cell => {
    const line = text.lines[cell[3]];
    if (line === undefined) throw new Error(`character ${cell[0]} is on line ${cell[3]}, which the text does not have`);
    return inkMass(image, scale, cellWindow(cell, line));
  });
  return { edges, glyphs };
}

/** A line's ink ends within this many logical pixels of where Chrome's ends. */
export const INK_EDGE_TOLERANCE_PX = 1;
/** A character puts down at least this share of the ink Chrome's puts down (a glyph that is not drawn puts down none)... */
export const GLYPH_INK_MIN_SHARE = 0.6;
/** ...and at most this share. */
export const GLYPH_INK_MAX_SHARE = 1.6;
/** A character with less ink than this (logical px squared) in Chrome is a dot or a hairline: a share of it says nothing. */
export const GLYPH_INK_FLOOR = 0.3;

/**
 * The ink of one text that is further from Chrome's than allowed: a line's ink ends further than `INK_EDGE_TOLERANCE_PX` from where Chrome's
 * ends, or a character puts down less than `GLYPH_INK_MIN_SHARE` (a glyph that is not drawn puts down none) or more than
 * `GLYPH_INK_MAX_SHARE` of the ink Chrome's puts down. `characters` names the characters of the text by their index; `null` is a line with no ink in its window.
 */
export function inkDeviations(ours, chrome, cells, characters) {
  const found = [];
  chrome.edges.forEach((edge, index) => {
    const mine = ours.edges[index] ?? null;
    if (mine === null || edge === null) {
      if (mine !== edge) found.push({ what: `line ${index} ink edge`, ours: mine, chrome: edge });
    } else if (Math.abs(mine - edge) > INK_EDGE_TOLERANCE_PX) {
      found.push({ what: `line ${index} ink edge`, ours: mine, chrome: edge });
    }
  });
  (chrome.glyphs ?? []).forEach((reference, index) => {
    const mine = ours.glyphs?.[index];
    const cell = cells?.[index];
    if (mine === undefined || cell === undefined) throw new Error(`the ink of character ${index} was not measured`);
    if (reference < GLYPH_INK_FLOOR) return;
    const share = mine / reference;
    if (share < GLYPH_INK_MIN_SHARE || share > GLYPH_INK_MAX_SHARE) {
      found.push({ what: `character ${cell[0]} (${JSON.stringify(characters[cell[0]] ?? '')}) ink`, ours: mine, chrome: reference });
    }
  });
  return found;
}
