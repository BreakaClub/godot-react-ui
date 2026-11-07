import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import { highlightTree, tagHighlighter, tags as t } from '@lezer/highlight';

/**
 * Syntax colour for the editor's lines. Lezer's parse of the TypeScript and JSX is the source; a `tagHighlighter` turns the tags of
 * each token into a palette name, so nothing here is CSS.
 *
 * The parse never holds a frame. Every edit asks `ensureSyntaxTree` for the part of the file in view with a small budget; if the
 * budget is not enough the lines show with the colours of the tree so far, and a timer carries the parse on in budget-sized steps and
 * reports when it has more to show. CodeMirror itself does up to 20 ms of incremental parse work inside each transaction
 * (`LanguageState.apply`), which for a typed character is under a millisecond (docs/tracks/code-editor-evaluation.md, section 3.1).
 */

export type SyntaxTree = ReturnType<typeof syntaxTree>;
export type HexColor = `#${string}`;

/** The most time one `ensureSyntaxTree` call may take for the lines in view. */
export const PARSE_BUDGET_MS = 8;

export const PLAIN_TEXT_COLOR: HexColor = '#e2e8f0';

/** The palette: One Dark's colours, on the code panel's slate background. */
export const SYNTAX_COLORS = {
  keyword: '#c678dd',
  string: '#98c379',
  comment: '#64748b',
  number: '#d19a66',
  type: '#e5c07b',
  function: '#61afef',
  tag: '#e06c75',
  attribute: '#d19a66',
  property: '#9ec5ee',
  variable: PLAIN_TEXT_COLOR,
  operator: '#56b6c2',
  punctuation: '#94a3b8',
  regexp: '#56b6c2',
  invalid: '#f87171',
} as const satisfies Record<string, HexColor>;

export type SyntaxClass = keyof typeof SYNTAX_COLORS;

const HIGHLIGHTER = tagHighlighter([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier, t.self], class: 'keyword' },
  { tag: [t.string, t.special(t.string), t.character, t.docString], class: 'string' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], class: 'comment' },
  { tag: [t.number, t.integer, t.float, t.bool, t.null, t.atom], class: 'number' },
  { tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName), t.definition(t.typeName)], class: 'type' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName)), t.macroName], class: 'function' },
  { tag: [t.tagName], class: 'tag' },
  { tag: [t.attributeName], class: 'attribute' },
  { tag: [t.propertyName, t.special(t.propertyName), t.definition(t.propertyName)], class: 'property' },
  { tag: [t.variableName, t.definition(t.variableName), t.labelName, t.local(t.variableName), t.special(t.variableName)], class: 'variable' },
  { tag: [t.operator, t.compareOperator, t.arithmeticOperator, t.logicOperator, t.bitwiseOperator, t.updateOperator, t.definitionOperator, t.derefOperator, t.controlOperator], class: 'operator' },
  { tag: [t.punctuation, t.bracket, t.angleBracket, t.squareBracket, t.paren, t.brace, t.separator], class: 'punctuation' },
  { tag: [t.regexp, t.escape], class: 'regexp' },
  { tag: [t.invalid], class: 'invalid' },
]);

/** A coloured stretch of a line, in offsets from the start of the line. */
export interface ColorSpan {
  readonly from: number;
  readonly to: number;
  readonly color: HexColor;
}

function isSyntaxClass(name: string): name is SyntaxClass {
  return name in SYNTAX_COLORS;
}

/** The colour of each token in `[from, to)` of the document, as spans in document offsets; text with no colour has no span. */
export function colorSpans(tree: SyntaxTree, from: number, to: number): ColorSpan[] {
  const spans: ColorSpan[] = [];
  highlightTree(tree, HIGHLIGHTER, (spanFrom, spanTo, classes) => {
    const [name] = classes.split(' ');
    if (name === undefined || !isSyntaxClass(name)) {
      throw new Error(`The highlighter produced "${classes}", which is not in the palette`);
    }
    spans.push({ from: spanFrom, to: spanTo, color: SYNTAX_COLORS[name] });
  }, from, to);
  return spans;
}

function sameSpans(a: readonly ColorSpan[], b: readonly ColorSpan[]): boolean {
  return a.length === b.length && a.every((span, index) => span.from === b[index]?.from && span.to === b[index].to && span.color === b[index].color);
}

interface CachedLine {
  readonly tree: SyntaxTree;
  readonly text: string;
  readonly spans: readonly ColorSpan[];
}

/**
 * The colours of a line, remembered by the line's text and the tree they were read from. When an edit makes a new tree, the
 * line's spans are read again (about a tenth of a millisecond for a screenful) and the old array is kept when they come out the
 * same, so a line that did not change gives its component the same props and costs no native commit.
 */
export class HighlightCache {
  private readonly lines = new Map<number, CachedLine>();

  /** Spans of line `number` (document offsets `from` to `from + text.length`), in offsets from the start of the line. */
  spans(tree: SyntaxTree, number: number, from: number, text: string): readonly ColorSpan[] {
    const cached = this.lines.get(number);
    if (cached !== undefined && cached.tree === tree && cached.text === text) return cached.spans;
    const read = colorSpans(tree, from, from + text.length).map(span => ({ from: span.from - from, to: span.to - from, color: span.color }));
    const spans = cached !== undefined && cached.text === text && sameSpans(cached.spans, read) ? cached.spans : read;
    this.lines.set(number, { tree, text, spans });
    return spans;
  }

  /** Forgets the lines outside `[first, last]`, so the cache holds a window of lines and not the file. */
  keepOnly(first: number, last: number): void {
    for (const number of this.lines.keys()) {
      if (number < first || number > last) this.lines.delete(number);
    }
  }
}

interface PendingParse {
  readonly state: EditorState;
  readonly target: number;
}

/** Carries a parse on in budget-sized steps and says when it has more to show. */
export class ParseScheduler {
  private best: SyntaxTree | undefined;
  private pending: PendingParse | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly onProgress: () => void;
  private readonly budgetMs: number;

  constructor(onProgress: () => void, budgetMs: number = PARSE_BUDGET_MS) {
    this.onProgress = onProgress;
    this.budgetMs = budgetMs;
  }

  /**
   * The tree to colour `state` with, parsed up to `upto` if the budget allows, else as far as it got: the parse then goes on in
   * timer steps and `onProgress` is called when it reaches `upto`.
   */
  treeFor(state: EditorState, upto: number): SyntaxTree {
    const target = Math.min(upto, state.doc.length);
    if (this.pending !== undefined && this.pending.state === state && this.pending.target >= target && this.best !== undefined) return this.best;
    this.cancel();
    const done = ensureSyntaxTree(state, target, this.budgetMs);
    if (done !== null) {
      this.best = done;
      return done;
    }
    this.best = syntaxTree(state);
    this.pending = { state, target };
    this.step();
    return this.best;
  }

  cancel(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = undefined;
  }

  private step(): void {
    this.timer = setTimeout(() => {
      this.timer = undefined;
      const { pending } = this;
      if (pending === undefined) return;
      const done = ensureSyntaxTree(pending.state, pending.target, this.budgetMs);
      if (done === null) {
        this.step();
        return;
      }
      this.best = done;
      this.pending = undefined;
      this.onProgress();
    }, 0);
  }
}
