import type { EditorState } from '@codemirror/state';
import { matchBrackets } from '@codemirror/language';
import { LineLayout, type Insertion, type InsertionKind } from './line-layout';
import { PLAIN_TEXT_COLOR, type ColorSpan, type HexColor, type HighlightCache, type SyntaxTree } from './highlight';
import { isProblem, worse, type EditorDiagnostic, type EditorInlay, type Severity } from './diagnostics';
import { THEME } from './theme';

/**
 * What one line of the editor shows, as plain data: the line cut into segments, each with its text, colour, background and
 * underline. The view turns segments into elements; it is the only part that changes when the line becomes one native `Text` with
 * spans (docs/tracks/code-editor-evaluation.md, section 6.2).
 */

export type UnderlineStyle = 'solid' | 'wavy';

export interface Underline {
  readonly color: HexColor;
  readonly style: UnderlineStyle;
}

export interface Segment {
  readonly kind: 'text' | InsertionKind;
  /** The text as it is drawn. */
  readonly text: string;
  /** The display column it starts at. */
  readonly column: number;
  readonly color: HexColor;
  readonly background: HexColor | undefined;
  readonly underline: Underline | undefined;
}

export interface LineSpec {
  readonly number: number;
  readonly text: string;
  readonly segments: readonly Segment[];
  readonly layout: LineLayout;
  /** The selection goes on past the end of this line, over the line break. */
  readonly breakSelected: boolean;
  /** The gravest problem on the line, for the gutter. */
  readonly severity: Severity | undefined;
}

/** An IME composition in progress: the preedit is shown at `at`, a document offset. */
export interface Composition {
  readonly at: number;
  readonly text: string;
}

export interface LineInputs {
  readonly state: EditorState;
  readonly tree: SyntaxTree;
  readonly highlight: HighlightCache;
  readonly diagnostics: readonly EditorDiagnostic[];
  readonly inlays: readonly EditorInlay[];
  readonly composition: Composition | undefined;
  readonly focused: boolean;
  /** The two brackets of a matched pair next to the caret, as document ranges. */
  readonly brackets: readonly { readonly from: number; readonly to: number }[];
}

const UNDERLINE_COLORS: Readonly<Partial<Record<Severity, HexColor>>> = { error: THEME.error, warning: THEME.warning };

interface Covered {
  readonly from: number;
  readonly to: number;
}

function covers(range: Covered, from: number, to: number): boolean {
  return range.from <= from && range.to >= to;
}

/** Line-relative ranges of `ranges` (document offsets) that fall in the line. */
function inLine<T extends Covered>(ranges: readonly T[], lineFrom: number, lineTo: number): (T & Covered)[] {
  const found: (T & Covered)[] = [];
  for (const range of ranges) {
    const from = Math.max(range.from, lineFrom);
    const to = Math.min(range.to, lineTo);
    if (to > from) found.push({ ...range, from: from - lineFrom, to: to - lineFrom });
  }
  return found;
}

function underlineAt(diagnostics: readonly (EditorDiagnostic & Covered)[], from: number, to: number): Underline | undefined {
  let severity: Severity | undefined;
  for (const diagnostic of diagnostics) {
    if (covers(diagnostic, from, to) && isProblem(diagnostic)) severity = severity === undefined ? diagnostic.severity : worse(severity, diagnostic.severity);
  }
  const color = severity === undefined ? undefined : UNDERLINE_COLORS[severity];
  return color === undefined ? undefined : { color, style: 'wavy' };
}

function sameUnderline(a: Underline | undefined, b: Underline | undefined): boolean {
  return a === b || (a !== undefined && b !== undefined && a.color === b.color && a.style === b.style);
}

function sameSegment(a: Segment, b: Segment): boolean {
  return a.kind === b.kind && a.text === b.text && a.column === b.column && a.color === b.color && a.background === b.background && sameUnderline(a.underline, b.underline);
}

export function sameLineSpec(a: LineSpec, b: LineSpec): boolean {
  return a.number === b.number && a.text === b.text && a.breakSelected === b.breakSelected && a.severity === b.severity
    && a.segments.length === b.segments.length && a.segments.every((segment, index) => {
      const other = b.segments[index];
      return other !== undefined && sameSegment(segment, other);
    });
}

export function buildLine(inputs: LineInputs, number: number): LineSpec {
  const { state, tree, highlight, composition, focused } = inputs;
  const line = state.doc.line(number);
  const text = line.text;
  const spans = highlight.spans(tree, number, line.from, text);
  const selected = inLine(state.selection.ranges.filter(range => !range.empty), line.from, line.to);
  const breakSelected = state.selection.ranges.some(range => !range.empty && range.from <= line.to && range.to > line.to);
  const diagnostics = inLine(inputs.diagnostics, line.from, line.to);
  const bracketRanges = inLine(inputs.brackets, line.from, line.to);
  const insertions: Insertion[] = inputs.inlays
    .filter(inlay => inlay.at >= line.from && inlay.at <= line.to)
    .map(inlay => ({ offset: inlay.at - line.from, text: inlay.label, kind: 'inlay' as const }));
  if (composition !== undefined && composition.at >= line.from && composition.at <= line.to && composition.text !== '') {
    insertions.push({ offset: composition.at - line.from, text: composition.text, kind: 'preedit' });
  }
  const layout = new LineLayout(text, insertions);

  const edges = new Set<number>([0, text.length]);
  for (const span of spans) { edges.add(span.from); edges.add(span.to); }
  for (const range of [...selected, ...diagnostics, ...bracketRanges]) { edges.add(range.from); edges.add(range.to); }
  for (const insertion of insertions) edges.add(insertion.offset);
  const boundaries = [...edges].filter(edge => edge >= 0 && edge <= text.length).sort((a, b) => a - b);

  const selectionColor = focused ? THEME.selection : THEME.selectionInactive;
  const segments: Segment[] = [];
  const push = (segment: Segment): void => {
    const last = segments[segments.length - 1];
    if (last !== undefined && last.kind === 'text' && segment.kind === 'text' && last.color === segment.color && last.background === segment.background
      && sameUnderline(last.underline, segment.underline)) {
      segments[segments.length - 1] = { ...last, text: last.text + segment.text };
      return;
    }
    segments.push(segment);
  };
  const emitInsertions = (offset: number): void => {
    for (const insertion of layout.insertions) {
      if (insertion.offset !== offset) continue;
      push({
        kind: insertion.kind, text: insertion.text, column: layout.columnOf(offset) + precedingWidth(layout, insertion),
        color: insertion.kind === 'inlay' ? THEME.inlayText : PLAIN_TEXT_COLOR,
        background: insertion.kind === 'inlay' ? THEME.inlayBackground : undefined,
        underline: insertion.kind === 'preedit' ? { color: THEME.preeditUnderline, style: 'solid' } : undefined,
      });
    }
  };
  for (let index = 0; index < boundaries.length; index += 1) {
    const from = boundaries[index];
    if (from === undefined) continue;
    emitInsertions(from);
    const to = boundaries[index + 1];
    if (to === undefined || to <= from) continue;
    push({
      kind: 'text', text: text.slice(from, to), column: layout.columnOf(from) + widthAt(layout, from),
      color: colorAt(spans, from, to),
      background: selected.some(range => covers(range, from, to)) ? selectionColor : bracketRanges.some(range => covers(range, from, to)) ? THEME.bracketMatch : undefined,
      underline: underlineAt(diagnostics, from, to),
    });
  }
  const severity = inLine(inputs.diagnostics.filter(isProblem), line.from, line.to + 1)
    .reduce<Severity | undefined>((worst, diagnostic) => (worst === undefined ? diagnostic.severity : worse(worst, diagnostic.severity)), undefined);
  return { number, text, segments, layout, breakSelected, severity };
}

/** The width of the pieces that stand at `offset`: the source text there starts after them. */
function widthAt(layout: LineLayout, offset: number): number {
  return layout.insertions.filter(insertion => insertion.offset === offset).reduce((total, insertion) => total + insertion.text.length, 0);
}

/** The width of the pieces at the same offset that are drawn before `insertion`. */
function precedingWidth(layout: LineLayout, insertion: Insertion): number {
  let width = 0;
  for (const other of layout.insertions) {
    if (other === insertion) break;
    if (other.offset === insertion.offset) width += other.text.length;
  }
  return width;
}

function colorAt(spans: readonly ColorSpan[], from: number, to: number): HexColor {
  const span = spans.find(candidate => covers(candidate, from, to));
  return span === undefined ? PLAIN_TEXT_COLOR : span.color;
}

/** The brackets of the pair next to the caret (before it, else after it), when it has a match. */
export function matchedBrackets(state: EditorState): { readonly from: number; readonly to: number }[] {
  const { main } = state.selection;
  if (!main.empty) return [];
  for (const direction of [-1, 1] as const) {
    const match = matchBrackets(state, main.head, direction);
    if (match?.matched === true && match.end !== undefined) return [match.start, match.end];
  }
  return [];
}

/** Keeps the previous `LineSpec` of a line when the new one is equal, so an unchanged line gives its component the same props. */
export class LineSpecCache {
  private readonly lines = new Map<number, LineSpec>();

  stable(spec: LineSpec): LineSpec {
    const previous = this.lines.get(spec.number);
    if (previous !== undefined && sameLineSpec(previous, spec)) return previous;
    this.lines.set(spec.number, spec);
    return spec;
  }

  keepOnly(first: number, last: number): void {
    for (const number of this.lines.keys()) {
      if (number < first || number > last) this.lines.delete(number);
    }
  }
}
