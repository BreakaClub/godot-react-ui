import { EditorSelection, type EditorState, type SelectionRange } from '@codemirror/state';

/**
 * Selecting with a pointer: a click puts the caret, a drag selects, a double click selects a word and dragging on grows it by
 * words, a triple click selects a line and dragging on grows it by lines, Shift extends the selection that is there, and Alt adds
 * a selection to the others.
 */

export type Granularity = 'character' | 'word' | 'line';

export interface PointerDown {
  /** The document offset under the pointer. */
  readonly offset: number;
  /** 1 for a click, 2 for the second click of a double click, 3 for the third. */
  readonly clicks: number;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

/** A run of characters of one kind around `offset`: a word, a run of spaces, a run of punctuation. */
export function groupAt(state: EditorState, offset: number): SelectionRange {
  const line = state.doc.lineAt(offset);
  if (line.length === 0) return EditorSelection.cursor(offset);
  const categorize = state.charCategorizer(offset);
  const column = offset - line.from;
  // The character the pointer is over is the one after the offset; at the end of the line, the one before it.
  const at = column < line.length ? column : column - 1;
  const category = categorize(line.text.charAt(at));
  let from = at;
  let to = at + 1;
  while (from > 0 && categorize(line.text.charAt(from - 1)) === category) from -= 1;
  while (to < line.length && categorize(line.text.charAt(to)) === category) to += 1;
  return EditorSelection.range(line.from + from, line.from + to);
}

export function lineAt(state: EditorState, offset: number): SelectionRange {
  const line = state.doc.lineAt(offset);
  // The line break is part of the line, as it is in an editor's triple click, except for the last line.
  return EditorSelection.range(line.from, Math.min(line.to + 1, state.doc.length));
}

function rangeFor(state: EditorState, granularity: Granularity, offset: number): SelectionRange {
  switch (granularity) {
    case 'character': return EditorSelection.cursor(offset);
    case 'word': return groupAt(state, offset);
    case 'line': return lineAt(state, offset);
  }
}

export function granularityOf(clicks: number): Granularity {
  if (clicks <= 1) return 'character';
  return clicks === 2 ? 'word' : 'line';
}

/** One gesture, from the press to the release: the range it began with and the selections it leaves alone. */
export class PointerSelection {
  private readonly granularity: Granularity;
  /** The range the gesture grows from: the caret, the word or the line that was pressed. */
  private readonly origin: SelectionRange;
  private readonly others: readonly SelectionRange[];

  constructor(state: EditorState, down: PointerDown) {
    this.granularity = granularityOf(down.clicks);
    const { main } = state.selection;
    if (down.shiftKey && this.granularity === 'character') {
      // Shift extends the selection that is there: its anchor stays.
      this.origin = EditorSelection.cursor(main.anchor);
      this.others = state.selection.ranges.filter(range => range !== main);
    } else {
      this.origin = rangeFor(state, this.granularity, down.offset);
      this.others = down.altKey ? state.selection.ranges : [];
    }
  }

  /** The selection when the pointer is over `offset`. */
  selectionAt(state: EditorState, offset: number): EditorSelection {
    const range = this.rangeAt(state, offset);
    return EditorSelection.create([...this.others, range], this.others.length);
  }

  private rangeAt(state: EditorState, offset: number): SelectionRange {
    if (this.granularity === 'character') return EditorSelection.range(this.origin.anchor, offset);
    // Over the pressed word or line itself, it is the selection.
    if (offset >= this.origin.from && offset <= this.origin.to) return this.origin;
    const grown = rangeFor(state, this.granularity, offset);
    // Growing by words or lines keeps the pressed word or line selected whichever way the pointer goes.
    return offset > this.origin.to
      ? EditorSelection.range(this.origin.from, grown.to)
      : EditorSelection.range(this.origin.to, grown.from);
  }
}
