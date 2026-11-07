/**
 * A line as it is drawn: its text with the pieces that are shown but are not in the document spliced in (an inlay hint after a
 * name, the preedit of an IME composition at the caret), and the map between the document's offsets in the line and the columns
 * of what is drawn.
 *
 * The map is a grid: one column per UTF-16 code unit, every column `advance` wide. A monospace font makes that exact for the
 * characters it has one column for, which is printable ASCII; the line is then `onGrid`, and the editor places its carets and
 * answers its presses from the grid without asking the text. A line with any other character (CJK and emoji are wider, combining
 * marks are no width, a tab is as far as the next tab stop) is not on the grid: its carets, hits and ranges come from the line's
 * own `Text` (`getCaretRect`, `getOffsetAtPoint`, `getRangeRects`), and this map is not used for it.
 */

/** The characters a monospace font has exactly one column for: printable ASCII. */
const ONE_COLUMN_CHARACTERS = /^[\u0020-\u007e]*$/u;

export type InsertionKind = 'inlay' | 'preedit';

export interface Insertion {
  /** The offset in the line's text the piece stands at. */
  readonly offset: number;
  readonly text: string;
  readonly kind: InsertionKind;
}

/** Which side of the pieces at an offset a position is on: `TextSide` of the library's `Text`, the group of them being one. */
export type Side = 'before' | 'after';

export class LineLayout {
  readonly source: string;
  readonly insertions: readonly Insertion[];
  readonly displayLength: number;
  /** Every character of the line and of what is drawn in it is one column wide: the map below is exact. */
  readonly onGrid: boolean;
  /** `columnBefore[i]` is the column of the offset `i`, before any piece that stands there. */
  private readonly columnBefore: readonly number[];

  constructor(source: string, insertions: readonly Insertion[]) {
    this.source = source;
    // At one offset the preedit comes first: typing goes in front of an inlay that stood there.
    this.insertions = [...insertions].sort((a, b) => a.offset - b.offset || rank(a) - rank(b));
    const columns: number[] = [];
    let shift = 0;
    let next = 0;
    for (let offset = 0; offset <= source.length; offset += 1) {
      columns.push(offset + shift);
      while (next < this.insertions.length && (this.insertions[next]?.offset ?? Infinity) <= offset) {
        shift += this.insertions[next]?.text.length ?? 0;
        next += 1;
      }
    }
    this.columnBefore = columns;
    this.displayLength = source.length + shift;
    this.onGrid = ONE_COLUMN_CHARACTERS.test(source) && this.insertions.every(insertion => ONE_COLUMN_CHARACTERS.test(insertion.text));
  }

  /** The column the caret is in at `offset`: before the pieces at the offset, or after all of them (the preedit, while composing). */
  columnOf(offset: number, side: Side = 'before'): number {
    const base = this.columnBefore[this.clamp(offset)];
    if (base === undefined) throw new Error(`Offset ${offset} is outside the line of ${this.source.length} characters`);
    if (side === 'before') return base;
    return base + this.insertions.filter(insertion => insertion.offset === offset).reduce((width, insertion) => width + insertion.text.length, 0);
  }

  /**
   * The offset in the line's text for the caret boundary at `column` of what is drawn. A column inside a piece (an inlay, the
   * preedit) is the offset the piece stands at, so a click on a hint puts the caret in front of it.
   */
  offsetAt(column: number): number {
    let found = 0;
    for (let offset = 0; offset <= this.source.length; offset += 1) {
      if ((this.columnBefore[offset] ?? Infinity) > column) break;
      found = offset;
    }
    return found;
  }

  private clamp(offset: number): number {
    return Math.min(Math.max(offset, 0), this.source.length);
  }
}

function rank(insertion: Insertion): number {
  return insertion.kind === 'preedit' ? 0 : 1;
}
