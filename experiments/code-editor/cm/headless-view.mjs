// The part of an EditorView that @codemirror/commands calls, rebuilt for a monospace, non-wrapping, left-to-right editor with no
// DOM. The members come from `grep -o "\b(view|target)\.\w+" node_modules/@codemirror/commands/dist/index.js`: state, dispatch,
// moveByChar, moveByGroup, moveToLineBoundary, moveVertically, lineBlockAt, defaultLineHeight, scrollDOM (page moves),
// textDirectionAt, coordsAtPos, lineWrapping, dom, documentTop, setTabFocusMode.
// This is an evaluation sketch: the real adapter would live in the editor package, take its char width and line height from
// the font, and compute columns with the inlays' widths.
import { EditorSelection, CharCategory, findClusterBreak, Transaction } from '@codemirror/state';
import { Direction } from '@codemirror/view';

export class MonospaceCommandTarget {
  constructor(state, dispatch, { charWidth = 8, lineHeight = 20, viewportHeight = 400 } = {}) {
    this.state = state;
    // EditorView.dispatch takes a Transaction or any number of TransactionSpecs, and commands use both forms.
    this.dispatch = (...specs) => dispatch(specs.length === 1 && specs[0] instanceof Transaction ? specs[0] : state.update(...specs));
    this.charWidth = charWidth;
    this.defaultLineHeight = lineHeight;
    // `scrollHeight > clientHeight` makes pageInfo() take its self-scrolling branch; the rect is the scroller's.
    this.scrollDOM = {
      clientHeight: viewportHeight, scrollTop: 0, scrollHeight: state.doc.lines * lineHeight + viewportHeight,
      getBoundingClientRect: () => ({ left: 0, right: 10_000, top: 0, bottom: viewportHeight }),
    };
    this.lineWrapping = false;
    this.documentTop = 0;
    this.dom = { getBoundingClientRect: () => ({ left: 0, right: 10_000, top: 0, bottom: 10_000 }) };
  }

  textDirectionAt() { return Direction.LTR; }

  /** One grapheme cluster, across a line break when at a line edge; `by` extends the move as EditorView.moveByChar does. */
  moveByChar(start, forward, by) {
    const doc = this.state.doc;
    let head = start.head;
    let check = null;
    for (;;) {
      const line = doc.lineAt(head);
      let next;
      let char;
      if (forward ? head === line.to : head === line.from) {
        if (line.number === (forward ? doc.lines : 1)) break;
        next = forward ? doc.line(line.number + 1).from : doc.line(line.number - 1).to;
        char = '\n';
      } else {
        const offset = findClusterBreak(line.text, head - line.from, forward);
        next = line.from + offset;
        char = line.text.slice(Math.min(offset, head - line.from), Math.max(offset, head - line.from));
      }
      if (check === null) {
        if (by === undefined) return EditorSelection.cursor(next);
        check = by(char);
      } else if (!check(char)) {
        break;
      }
      head = next;
    }
    return EditorSelection.cursor(head);
  }

  moveByGroup(start, forward) {
    const categorize = this.state.charCategorizer(start.head);
    return this.moveByChar(start, forward, (initial) => {
      let category = categorize(initial);
      return (next) => {
        const nextCategory = categorize(next);
        if (category === CharCategory.Space) category = nextCategory;
        return category === nextCategory;
      };
    });
  }

  moveToLineBoundary(start, forward) {
    const line = this.state.doc.lineAt(start.head);
    return EditorSelection.cursor(forward ? line.to : line.from, forward ? 1 : -1);
  }

  /** The column is a pixel x (charWidth per code unit); a tab or an inlay would change the width of a column, not this shape. */
  moveVertically(start, forward, distance) {
    const doc = this.state.doc;
    const line = doc.lineAt(start.head);
    const goal = start.goalColumn ?? (start.head - line.from) * this.charWidth;
    const lines = distance === undefined ? 1 : Math.max(1, Math.round(distance / this.defaultLineHeight));
    const target = Math.min(doc.lines, Math.max(1, line.number + (forward ? lines : -lines)));
    if (target === line.number) return EditorSelection.cursor(forward ? doc.length : 0, undefined, undefined, goal);
    const destination = doc.line(target);
    const column = Math.min(destination.length, Math.round(goal / this.charWidth));
    return EditorSelection.cursor(destination.from + column, undefined, undefined, goal);
  }

  lineBlockAt(pos) {
    const line = this.state.doc.lineAt(pos);
    const top = (line.number - 1) * this.defaultLineHeight;
    return { from: line.from, to: line.to, top, bottom: top + this.defaultLineHeight, height: this.defaultLineHeight, length: line.length, type: 0 };
  }

  coordsAtPos(pos) {
    const line = this.state.doc.lineAt(pos);
    const top = (line.number - 1) * this.defaultLineHeight;
    const left = (pos - line.from) * this.charWidth;
    return { left, right: left, top, bottom: top + this.defaultLineHeight };
  }

  setTabFocusMode() {}
}
