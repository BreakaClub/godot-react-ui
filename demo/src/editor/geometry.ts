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
