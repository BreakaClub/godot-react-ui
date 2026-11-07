// CodeMirror's DOM-free layers turned into what a renderer without inline text needs: per line, a list of coloured runs.
// Imports only @codemirror/state, @codemirror/language, @codemirror/lang-javascript and @lezer/highlight (no @codemirror/view),
// so it runs in plain Node and, bundled, inside GodotJS.
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { highlightTree, classHighlighter } from '@lezer/highlight';

export interface Run {
  readonly text: string;
  /** `#rrggbb`, from the palette below; the unstyled default for text no tag styles. */
  readonly color: string;
}

/** A dark-theme palette keyed by the class names `classHighlighter` gives each tag. */
const PALETTE: Readonly<Record<string, string>> = {
  'tok-keyword': '#c678dd', 'tok-string': '#98c379', 'tok-comment': '#7d8799', 'tok-number': '#d19a66', 'tok-bool': '#d19a66',
  'tok-typeName': '#e5c07b', 'tok-className': '#e5c07b', 'tok-propertyName': '#61afef', 'tok-variableName': '#e06c75',
  'tok-operator': '#56b6c2', 'tok-punctuation': '#abb2bf', 'tok-name': '#e06c75', 'tok-attributeName': '#d19a66',
  'tok-tagName': '#e06c75', 'tok-definition': '#61afef', 'tok-labelName': '#e06c75', 'tok-meta': '#abb2bf',
};
export const DEFAULT_COLOR = '#d4d4d4';

function colorOf(classes: string): string {
  for (const name of classes.split(' ')) {
    const color = PALETTE[name];
    if (color !== undefined) return color;
  }
  return DEFAULT_COLOR;
}

export function createState(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [javascript({ jsx: true, typescript: true })] });
}

/** The tree for the whole document. `syntaxTree(state)` is only as far as the last background step, which a headless caller has none of. */
export function parse(state: EditorState) {
  const tree = ensureSyntaxTree(state, state.doc.length, 10_000);
  if (tree === null) throw new Error('the parse did not finish inside its budget');
  return tree;
}

/** Coloured runs for lines `firstLine..lastLine` (1-based, inclusive), with equal neighbouring colours merged. */
export function runsForLines(state: EditorState, firstLine: number, lastLine: number): Run[][] {
  const tree = parse(state);
  const doc = state.doc;
  const from = doc.line(firstLine).from;
  const to = doc.line(lastLine).to;
  const colors: Array<[number, number, string]> = [];
  highlightTree(tree, classHighlighter, (spanFrom, spanTo, classes) => { colors.push([spanFrom, spanTo, colorOf(classes)]); }, from, to);
  const result: Run[][] = [];
  let cursor = 0;
  for (let number = firstLine; number <= lastLine; number += 1) {
    const line = doc.line(number);
    const pieces: Array<[number, number, string]> = [];
    let at = line.from;
    while (cursor < colors.length && (colors[cursor]?.[1] ?? 0) <= line.from) cursor += 1;
    for (let index = cursor; index < colors.length; index += 1) {
      const span = colors[index];
      if (span === undefined || span[0] >= line.to) break;
      const start = Math.max(span[0], line.from);
      const end = Math.min(span[1], line.to);
      if (start > at) pieces.push([at, start, DEFAULT_COLOR]);
      if (end > start) pieces.push([start, end, span[2]]);
      at = Math.max(at, end);
    }
    if (at < line.to) pieces.push([at, line.to, DEFAULT_COLOR]);
    const runs: Run[] = [];
    for (const [pieceFrom, pieceTo, color] of pieces) {
      const text = doc.sliceString(pieceFrom, pieceTo);
      const last = runs[runs.length - 1];
      if (last !== undefined && last.color === color) runs[runs.length - 1] = { text: last.text + text, color };
      else runs.push({ text, color });
    }
    result.push(runs);
  }
  return result;
}
