/**
 * A line as it is drawn: its text with the pieces that are shown but are not in the document spliced in (an inlay hint after a
 * name, the preedit of an IME composition at the caret), and the map between the document's offsets in the line and the columns
 * of what is drawn. This is the "display text with an offset map" of docs/tracks/code-editor-evaluation.md, section 6.2; it is
 * what a native `Text` with generated spans will do itself, and the one place that changes when it does.
 *
 * A column is a UTF-16 code unit. Characters that are wider than one column or are made of several code units (CJK, emoji,
 * combining marks) are laid out on that grid until the text handles answer `getCaretRect` and `getOffsetAtPoint`.
 */

export type InsertionKind = 'inlay' | 'preedit';

export interface Insertion {
  /** The offset in the line's text the piece stands at. */
  readonly offset: number;
  readonly text: string;
  readonly kind: InsertionKind;
}

/** Which side of the pieces at an offset a position is on. */
export type Side = 'before' | 'after-preedit';

export class LineLayout {
  readonly source: string;
  readonly insertions: readonly Insertion[];
  readonly displayLength: number;
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
  }

  /** The column the caret is in at `offset`: before the pieces at the offset, or, while composing, after the preedit. */
  columnOf(offset: number, side: Side = 'before'): number {
    const base = this.columnBefore[this.clamp(offset)];
    if (base === undefined) throw new Error(`Offset ${offset} is outside the line of ${this.source.length} characters`);
    if (side === 'before') return base;
    const preedit = this.insertions.find(insertion => insertion.kind === 'preedit' && insertion.offset === offset);
    return preedit === undefined ? base : base + preedit.text.length;
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
