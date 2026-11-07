import type { EditorState } from '@codemirror/state';
import { matchBrackets } from '@codemirror/language';
import { LineLayout, type Insertion, type InsertionKind } from './line-layout';
import { PLAIN_TEXT_COLOR, type ColorSpan, type HexColor } from './highlight';
import { isProblem, worse, type EditorDiagnostic, type EditorInlay, type Severity } from './diagnostics';
import { THEME } from './theme';

/**
 * What one line of the editor shows, as plain data: the line cut into segments, each with its text, colour, background and
 * underline. The view turns the segments of a line into the spans of one native `Text` (`view/code-line.tsx`): the text segments
 * are spans over the line's own text, and the others (an inlay hint, the preedit of a composition, the selected line break) are
 * generated text, which the `Text` shows but does not count in its offsets.
 */

export type UnderlineStyle = 'solid' | 'wavy';

export interface Underline {
  readonly color: HexColor;
  readonly style: UnderlineStyle;
}

/** `break` is one space of generated text after the last character, drawn in the selection's colour where the selection goes on over the line break. */
export type SegmentKind = 'text' | InsertionKind | 'break';

export interface Segment {
  readonly kind: SegmentKind;
  /** The text as it is drawn. */
  readonly text: string;
  readonly color: HexColor;
  readonly background: HexColor | undefined;
  readonly underline: Underline | undefined;
}

export interface LineSpec {
  readonly number: number;
  readonly text: string;
  readonly segments: readonly Segment[];
  readonly layout: LineLayout;
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
  /** The colour spans of line `number`, in offsets from the start of the line. */
  readonly spans: (number: number) => readonly ColorSpan[];
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
  return a.kind === b.kind && a.text === b.text && a.color === b.color && a.background === b.background && sameUnderline(a.underline, b.underline);
}

export function sameLineSpec(a: LineSpec, b: LineSpec): boolean {
  return a.number === b.number && a.text === b.text && a.severity === b.severity
    && a.segments.length === b.segments.length && a.segments.every((segment, index) => {
      const other = b.segments[index];
      return other !== undefined && sameSegment(segment, other);
    });
}

/**
 * The pieces a line shows that its text does not have: the inlay hints that stand in it and the preedit of a composition at the caret.
 * While a composition is shown, the hint that stands where it does is not: the caret is after the preedit, and a text has one place
 * for a caret after generated text (`TextSide`), which is after all of it.
 */
export function insertionsFor(
  lineFrom: number, lineTo: number, inlays: readonly EditorInlay[], composition: Composition | undefined,
): Insertion[] {
  const preeditAt = composition !== undefined && composition.text !== '' && composition.at >= lineFrom && composition.at <= lineTo
    ? composition.at : undefined;
  const insertions: Insertion[] = inlays
    .filter(inlay => inlay.at >= lineFrom && inlay.at <= lineTo && inlay.at !== preeditAt)
    .map(inlay => ({ offset: inlay.at - lineFrom, text: inlay.label, kind: 'inlay' as const }));
  if (composition !== undefined && preeditAt !== undefined) {
    insertions.push({ offset: composition.at - lineFrom, text: composition.text, kind: 'preedit' });
  }
  return insertions;
}

/**
 * Everything a line is built from, before it is built: the line's text, its colours, and the selection, problems, brackets and pieces
 * that fall in it, in offsets from its start. A line made of the same parts as the one before is that line, so a keystroke builds the
 * line it changed and compares the others (`LineBuilder`).
 */
export interface LineParts {
  readonly text: string;
  readonly spans: readonly ColorSpan[];
  readonly selected: readonly Covered[];
  readonly diagnostics: readonly (EditorDiagnostic & Covered)[];
  readonly brackets: readonly Covered[];
  readonly insertions: readonly Insertion[];
  readonly selectionColor: HexColor;
  /** The selection goes on over the line break. */
  readonly breakSelected: boolean;
  readonly severity: Severity | undefined;
}

export function lineParts(inputs: LineInputs, number: number): LineParts {
  const { state, composition, focused } = inputs;
  const line = state.doc.line(number);
  const ranges = state.selection.ranges;
  let severity: Severity | undefined;
  for (const diagnostic of inputs.diagnostics) {
    if (isProblem(diagnostic) && diagnostic.from <= line.to && diagnostic.to > line.from) {
      severity = severity === undefined ? diagnostic.severity : worse(severity, diagnostic.severity);
    }
  }
  return {
    text: line.text,
    spans: inputs.spans(number),
    selected: inLine(ranges.filter(range => !range.empty), line.from, line.to),
    diagnostics: inLine(inputs.diagnostics, line.from, line.to),
    brackets: inLine(inputs.brackets, line.from, line.to),
    insertions: insertionsFor(line.from, line.to, inputs.inlays, composition),
    selectionColor: focused ? THEME.selection : THEME.selectionInactive,
    breakSelected: ranges.some(range => !range.empty && range.from <= line.to && range.to > line.to),
    severity,
  };
}

function sameRanges(a: readonly Covered[], b: readonly Covered[]): boolean {
  return a.length === b.length && a.every((range, index) => range.from === b[index]?.from && range.to === b[index].to);
}

function sameDiagnostics(a: readonly (EditorDiagnostic & Covered)[], b: readonly (EditorDiagnostic & Covered)[]): boolean {
  return sameRanges(a, b) && a.every((diagnostic, index) => diagnostic.severity === b[index]?.severity);
}

function sameInsertions(a: readonly Insertion[], b: readonly Insertion[]): boolean {
  return a.length === b.length && a.every((insertion, index) => {
    const other = b[index];
    return other !== undefined && insertion.offset === other.offset && insertion.text === other.text && insertion.kind === other.kind;
  });
}

/** Whether two sets of parts build the same line. `spans` are compared by identity: the colours of an unchanged line are the same array (`HighlightCache`). */
export function sameLineParts(a: LineParts, b: LineParts): boolean {
  return a.text === b.text && a.spans === b.spans && a.selectionColor === b.selectionColor && a.breakSelected === b.breakSelected
    && a.severity === b.severity && sameRanges(a.selected, b.selected) && sameDiagnostics(a.diagnostics, b.diagnostics)
    && sameRanges(a.brackets, b.brackets) && sameInsertions(a.insertions, b.insertions);
}

/** The line built from its parts: the text cut into segments at every edge of a colour, selection, problem, bracket or piece. */
export function assembleLine(number: number, parts: LineParts): LineSpec {
  const { text, spans, selected, diagnostics, brackets, insertions, selectionColor } = parts;
  const layout = new LineLayout(text, insertions);

  const edges = new Set<number>([0, text.length]);
  for (const span of spans) { edges.add(span.from); edges.add(span.to); }
  for (const range of [...selected, ...diagnostics, ...brackets]) { edges.add(range.from); edges.add(range.to); }
  for (const insertion of insertions) edges.add(insertion.offset);
  const boundaries = [...edges].filter(edge => edge >= 0 && edge <= text.length).sort((a, b) => a - b);

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
        kind: insertion.kind, text: insertion.text,
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
      kind: 'text', text: text.slice(from, to),
      color: colorAt(spans, from, to),
      background: selected.some(range => covers(range, from, to)) ? selectionColor : brackets.some(range => covers(range, from, to)) ? THEME.bracketMatch : undefined,
      underline: underlineAt(diagnostics, from, to),
    });
  }
  if (parts.breakSelected) segments.push({ kind: 'break', text: ' ', color: PLAIN_TEXT_COLOR, background: selectionColor, underline: undefined });
  return { number, text, segments, layout, severity: parts.severity };
}

export function buildLine(inputs: LineInputs, number: number): LineSpec {
  return assembleLine(number, lineParts(inputs, number));
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

/**
 * The specs of the lines in view. A keystroke changes one line of them, so the others are not built again: each line's parts (its text,
 * colours, selection, problems, brackets and pieces) are read, which is cheap, and compared with those the line was last built from.
 * A line that is built again and comes out equal keeps its previous `LineSpec`, so an unchanged line gives its component the same props
 * and costs no native commit.
 */
export class LineBuilder {
  private readonly lines = new Map<number, { readonly parts: LineParts; readonly spec: LineSpec }>();
  private assembled = 0;

  /** How many lines have been built from their parts since this was made: a keystroke builds the one it changed. */
  get built(): number {
    return this.assembled;
  }

  /** The specs of lines `first` to `last`. */
  build(inputs: LineInputs, first: number, last: number): LineSpec[] {
    const specs: LineSpec[] = [];
    for (let number = first; number <= last; number += 1) {
      const parts = lineParts(inputs, number);
      const known = this.lines.get(number);
      if (known !== undefined && sameLineParts(known.parts, parts)) {
        specs.push(known.spec);
        continue;
      }
      this.assembled += 1;
      const built = assembleLine(number, parts);
      const spec = known !== undefined && sameLineSpec(known.spec, built) ? known.spec : built;
      this.lines.set(number, { parts, spec });
      specs.push(spec);
    }
    return specs;
  }

  /** Forgets the lines outside `[first, last]`, so the builder holds a window of lines and not the file. */
  keepOnly(first: number, last: number): void {
    for (const number of this.lines.keys()) {
      if (number < first || number > last) this.lines.delete(number);
    }
  }
}
