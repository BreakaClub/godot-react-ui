import { CharCategory, EditorSelection, Transaction, findClusterBreak, type EditorState, type SelectionRange, type TransactionSpec } from '@codemirror/state';
import type { EditorModel } from './model';

/**
 * The part of an `EditorView` that CodeMirror's commands (`@codemirror/commands`) use, for an editor with no DOM: monospace,
 * left to right, no wrapping. `cursorLeft`, `deleteGroupBackward`, `moveLineUp`, `cursorPageDown` and the other movement commands
 * ask their view where a position is on screen; this answers from the grid. The members are exactly the ones the commands call
 * (`grep -o "view\.[a-zA-Z]*" node_modules/@codemirror/commands/dist/index.js`), and `tests/editor-commands.test.ts` runs every
 * command the keymap binds against it, so a command that starts asking for another member fails there.
 */

/** What the grid is made of, measured by the view: never a constant of the font. */
export interface ViewMetrics {
  /** The width of one column in logical pixels. */
  readonly advance: number;
  readonly lineHeight: number;
  /** The visible height of the lines, for Page Up and Page Down. */
  readonly viewportHeight: number;
}

export interface LineBlock {
  readonly from: number;
  readonly to: number;
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
  readonly length: number;
}

interface Rectangle {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** A command's `by` argument: told the first character moved over, it answers for each next one whether the move goes on. */
type MoveRule = (initial: string) => (next: string) => boolean;

const NEWLINE = '\n';
/** The scroll range the commands compare the viewport with, to decide whether the editor scrolls itself. */
const FAR_BELOW_PX = 1e9;

export class CommandTarget {
  readonly state: EditorState;
  readonly lineWrapping = false;
  readonly documentTop = 0;
  readonly defaultLineHeight: number;
  readonly scrollDOM: { readonly clientHeight: number; readonly scrollHeight: number; getBoundingClientRect(): Rectangle };
  readonly dom: { readonly ownerDocument: { readonly defaultView: { readonly innerHeight: number } } };
  private readonly metrics: ViewMetrics;
  private readonly sink: (transaction: Transaction) => void;

  constructor(state: EditorState, metrics: ViewMetrics, sink: (transaction: Transaction) => void) {
    this.state = state;
    this.metrics = metrics;
    this.sink = sink;
    this.defaultLineHeight = metrics.lineHeight;
    const viewport: Rectangle = { left: 0, right: FAR_BELOW_PX, top: 0, bottom: metrics.viewportHeight };
    // A viewport shorter than the text scrolls itself (page moves are a viewport tall); the commands read it from here.
    this.scrollDOM = {
      clientHeight: metrics.viewportHeight,
      scrollHeight: Math.max(metrics.viewportHeight + 1, state.doc.lines * metrics.lineHeight),
      getBoundingClientRect: () => viewport,
    };
    this.dom = { ownerDocument: { defaultView: { innerHeight: metrics.viewportHeight } } };
  }

  /**
   * A transaction is applied as it is; anything else is a list of specs for `state.update`, as `EditorView.dispatch` takes. A
   * property and not a method: the commands take `dispatch` out of the view and call it on its own, as `EditorView` allows.
   */
  readonly dispatch = (...changes: readonly (Transaction | TransactionSpec)[]): void => {
    const [first] = changes;
    if (first instanceof Transaction) {
      this.sink(first);
      return;
    }
    const specs = changes.filter((change): change is TransactionSpec => !(change instanceof Transaction));
    this.sink(this.state.update(...specs));
  };

  textDirectionAt(): number {
    return 0;
  }

  /** The tab key leaves the editor unless the editor says otherwise; there is no browser focus order to leave. */
  setTabFocusMode(): void {}

  /** Moves over characters (grapheme clusters), or over as many as `by` allows: `deleteGroup` and `cursorSyntax` use the latter. */
  moveByChar(start: SelectionRange, forward: boolean, by?: MoveRule): SelectionRange {
    const { doc } = this.state;
    let head = start.head;
    let allowed: ((next: string) => boolean) | undefined;
    for (;;) {
      const line = doc.lineAt(head);
      let next: number;
      let moved: string;
      if (forward ? head === line.to : head === line.from) {
        if (line.number === (forward ? doc.lines : 1)) break;
        next = forward ? doc.line(line.number + 1).from : doc.line(line.number - 1).to;
        moved = NEWLINE;
      } else {
        const boundary = findClusterBreak(line.text, head - line.from, forward);
        next = line.from + boundary;
        moved = line.text.slice(Math.min(boundary, head - line.from), Math.max(boundary, head - line.from));
      }
      if (allowed === undefined) {
        if (by === undefined) return EditorSelection.cursor(next);
        allowed = by(moved);
      } else if (!allowed(moved)) {
        break;
      }
      head = next;
    }
    return EditorSelection.cursor(head);
  }

  /** A word: a run of characters of one category, after the spaces in front of it. */
  moveByGroup(start: SelectionRange, forward: boolean): SelectionRange {
    const categorize = this.state.charCategorizer(start.head);
    return this.moveByChar(start, forward, initial => {
      let category = categorize(initial);
      return next => {
        const nextCategory = categorize(next);
        if (category === CharCategory.Space) category = nextCategory;
        return category === nextCategory;
      };
    });
  }

  moveToLineBoundary(start: SelectionRange, forward: boolean): SelectionRange {
    const line = this.state.doc.lineAt(start.head);
    return EditorSelection.cursor(forward ? line.to : line.from, forward ? -1 : 1);
  }

  /** The column the movement started at is kept as `goalColumn` in pixels, so a short line in between does not lose it. */
  moveVertically(start: SelectionRange, forward: boolean, distance?: number): SelectionRange {
    const { doc } = this.state;
    const line = doc.lineAt(start.head);
    const goal = start.goalColumn ?? (start.head - line.from) * this.metrics.advance;
    const lines = distance === undefined ? 1 : Math.max(1, Math.round(distance / this.metrics.lineHeight));
    const target = Math.min(doc.lines, Math.max(1, line.number + (forward ? lines : -lines)));
    if (target === line.number) {
      return EditorSelection.cursor(forward ? line.to : line.from, undefined, undefined, goal);
    }
    const destination = doc.line(target);
    const column = Math.min(destination.length, Math.round(goal / this.metrics.advance));
    return EditorSelection.cursor(destination.from + column, undefined, undefined, goal);
  }

  lineBlockAt(pos: number): LineBlock {
    const line = this.state.doc.lineAt(pos);
    const top = (line.number - 1) * this.metrics.lineHeight;
    return { from: line.from, to: line.to, top, bottom: top + this.metrics.lineHeight, height: this.metrics.lineHeight, length: line.length };
  }

  coordsAtPos(pos: number): Rectangle {
    const line = this.state.doc.lineAt(pos);
    const top = (line.number - 1) * this.metrics.lineHeight;
    const left = (pos - line.from) * this.metrics.advance;
    return { left, right: left, top, bottom: top + this.metrics.lineHeight };
  }
}

/** Builds the view a command runs against: the model's state now, its transactions applied to the model. */
export function commandTargetFor(model: EditorModel, metrics: ViewMetrics): CommandTarget {
  return new CommandTarget(model.state, metrics, transaction => { model.dispatch(transaction); });
}
