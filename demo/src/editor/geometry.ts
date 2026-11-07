/**
 * Where lines and columns are in the scrolling content, for a monospace editor: one number for the advance of a column and one
 * for the height of a line, both measured from the real text (`view/grid-probe.tsx`), never a constant of the font.
 */

export interface Grid {
  /** Logical pixels from one column to the next. */
  readonly advance: number;
  readonly lineHeight: number;
  /** The width of the line number column at the left of the content. */
  readonly gutterWidth: number;
}

/** How many lines are drawn above and below the ones in view, so a scroll shows text at once. */
export const OVERSCAN_LINES = 6;
/** Columns of room kept right of the longest line, so the caret at its end is not against the edge. */
export const TRAILING_COLUMNS = 4;
/** Digits the line number column is always wide enough for. */
export const MIN_GUTTER_DIGITS = 3;
/** Space either side of the line numbers, in columns. */
export const GUTTER_PADDING_COLUMNS = 1.5;

export function gutterWidthFor(lineCount: number, advance: number): number {
  const digits = Math.max(MIN_GUTTER_DIGITS, String(lineCount).length);
  return Math.ceil((digits + 2 * GUTTER_PADDING_COLUMNS) * advance);
}

export function xOfColumn(column: number, grid: Grid): number {
  return grid.gutterWidth + column * grid.advance;
}

export function yOfLine(line: number, grid: Grid): number {
  return (line - 1) * grid.lineHeight;
}

/** Printable ASCII: what a monospace font has exactly one column for. */
const ONE_COLUMN = /^[\u0020-\u007e]*$/u;
/**
 * The characters a monospace font draws two columns wide: East Asian wide and fullwidth forms, and the emoji planes. Ranges, not Unicode
 * property escapes (`\p{...}`): the engine's JavaScript is built without them.
 */
const TWO_COLUMNS = /[\u1100-\u115f\u2600-\u27bf\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6\u{1f000}-\u{1faff}\u{20000}-\u{3fffd}]/u;
const WIDE_COLUMNS = 2;
/** Characters that take no column: combining marks, variation selectors, zero width space, joiners and marks. */
const NO_COLUMN = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u200b-\u200f\u20d0-\u20ff\ufe00-\ufe0f\ufe20-\ufe2f]/u;
/** `tab-size` of the editor's text: the most columns a tab takes. */
const TAB_COLUMNS = 8;

/**
 * About how many columns the text takes: a column for each character, two for a wide one, none for a combining mark, a tab stop for a tab.
 * An estimate, for the width of the scrolling content; where a caret stands or a press lands is the `Text`'s to say (`LineLayout.onGrid`).
 */
export function displayColumns(text: string): number {
  if (ONE_COLUMN.test(text)) return text.length;
  let columns = 0;
  for (const character of text) {
    if (character === '\t') columns += TAB_COLUMNS;
    else if (!NO_COLUMN.test(character)) columns += TWO_COLUMNS.test(character) ? WIDE_COLUMNS : 1;
  }
  return columns;
}

/** The line (from 1) under content row `y`, held to the lines there are. */
export function lineAtY(y: number, grid: Grid, lineCount: number): number {
  return Math.min(lineCount, Math.max(1, Math.floor(y / grid.lineHeight) + 1));
}

/**
 * The column whose left edge is nearest to `x`: where the caret goes for a press at `x`, so a press on the left half of a character is
 * in front of it and on the right half after it. Never left of the first column.
 */
export function columnAtX(x: number, grid: Grid): number {
  return Math.max(0, Math.round((x - grid.gutterWidth) / grid.advance));
}

export interface LineWindow {
  readonly first: number;
  readonly last: number;
}

/** The lines to draw for a viewport that starts at `scrollTop` and is `viewportHeight` tall. */
export function visibleLines(scrollTop: number, viewportHeight: number, grid: Grid, lineCount: number): LineWindow {
  const first = Math.max(1, Math.floor(scrollTop / grid.lineHeight) + 1 - OVERSCAN_LINES);
  const last = Math.min(lineCount, Math.ceil((scrollTop + viewportHeight) / grid.lineHeight) + OVERSCAN_LINES);
  return { first, last };
}

/** The scroll offset that brings `[start, end]` into `[offset, offset + size]` by the least movement, keeping `margin` clear at the edge it moves to. */
export function scrollToReveal(offset: number, size: number, start: number, end: number, margin: number): number {
  const slack = Math.min(margin, Math.max(0, (size - (end - start)) / 2));
  if (start - slack < offset) return Math.max(0, start - slack);
  if (end + slack > offset + size) return end + slack - size;
  return offset;
}
