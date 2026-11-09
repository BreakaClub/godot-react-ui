import { EditorSelection, EditorState } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { MemoryClipboard } from './clipboard';
import { EditorController } from './controller';
import { EditorModel } from './model';
import { HighlightCache, ParseScheduler, colorSpans } from './highlight';
import { LineBuilder, matchedBrackets } from './lines';

/**
 * The editor's per-keystroke work without a window (docs/tracks/keystroke-profile.md): the CodeMirror transaction and the parse, and the
 * data the view asks of the controller for the lines it draws, timed piece by piece. The same code runs in Node, in headless Chrome
 * (`scripts/keystroke-bench.mjs`) and inside the Godot V8 (`demo/src/profile-keystrokes.ts`), so the three can be set side by side: what
 * CodeMirror and lezer cost in a browser, and what the same code costs in the engine's JavaScript.
 *
 * Nothing here is React, native or Godot. A keystroke is an insert and then a Backspace at the same place, so the text never drifts.
 */
export interface BenchOptions {
  readonly source: string;
  /** The text of the line the keystrokes are typed on (the first place it occurs), and how far into the needle the caret is. */
  readonly needle: string;
  readonly offset: number;
  /** The lines the view draws: its window of the file. */
  readonly firstLine: number;
  readonly lastLine: number;
  readonly keystrokes: number;
  readonly warmup: number;
  /** Milliseconds with sub-millisecond resolution. */
  readonly now: () => number;
}

/** Milliseconds per keystroke, one value per keystroke, for each piece. */
export interface BenchSamples {
  /** `EditorController.beforeInput`: the transaction through the editor's model (history, indent, the language's parse, the listeners). */
  readonly controllerTransaction: number[];
  /** `EditorController.lines(first, last)`: all the view's data for the window after an edit. */
  readonly controllerLines: number[];
  /** The same, in pieces, on a model with the editor's own extensions. */
  readonly modelDispatch: number[];
  readonly tree: number[];
  readonly brackets: number[];
  /** The window's colours (one walk of the tree) and the lines built from them: the changed line only. */
  readonly buildLines: number[];
  /** Only the colour spans of the window, line by line as `HighlightCache` reads them after an edit. */
  readonly spansPerLine: number[];
  /** Colour spans of the changed line alone. */
  readonly spansChangedLine: number[];
  /** The library alone: `EditorState.update` with the JavaScript+JSX+TypeScript language and nothing else, then the tree to the end of the window. */
  readonly bareUpdate: number[];
  readonly bareTree: number[];
}

/** Where the caret is put: the line holding `needle`, `offset` characters into the needle. */
export interface TypingSite {
  readonly name: string;
  readonly needle: string;
  readonly offset: number;
}

/** Inside the string of a JSX attribute, after `bg-slate-50`, and inside a function body, before the `;` of a statement (demo/src/inputs-lab.tsx). */
export const TYPING_SITES: readonly TypingSite[] = [
  { name: 'attribute', needle: 'className="relative w-full h-full bg-slate-50"', offset: 'className="relative w-full h-full bg-slate-50'.length },
  { name: 'function', needle: 'const sizes = reversed ? [...SIZES].reverse() : SIZES;', offset: 'const sizes = reversed ? [...SIZES].reverse() : SIZES'.length },
];

const TYPED = 'abcdefghijklmnopqrstuvwxyz';
const TREE_BUDGET_MS = 1_000;
/** Nothing in the data depends on the grid; these are the numbers the editor's tests use for a window about the size of the panel. */
const BENCH_METRICS = { advance: 8, lineHeight: 20, viewportHeight: 600 };
const MEDIAN = 0.5;
const PERCENTILE_95 = 0.95;

function positionOf(source: string, needle: string, offset: number): number {
  const at = source.indexOf(needle);
  if (at < 0) throw new Error(`The source has no ${needle}`);
  return at + offset;
}

function keystrokeCharacter(index: number): string {
  return TYPED.charAt(Math.floor(index / 2) % TYPED.length);
}

/** Even keystrokes insert a character, odd ones take it out again. */
function isInsert(index: number): boolean {
  return index % 2 === 0;
}

function empty(): BenchSamples {
  return {
    controllerTransaction: [], controllerLines: [], modelDispatch: [], tree: [], brackets: [], buildLines: [], spansPerLine: [], spansChangedLine: [],
    bareUpdate: [], bareTree: [],
  };
}

export function runKeystrokeBench(options: BenchOptions): BenchSamples {
  const { now } = options;
  const at = positionOf(options.source, options.needle, options.offset);
  const samples = empty();

  // ---- The controller: what the view calls ---------------------------------------------------------------------------------------
  const controller = new EditorController({
    doc: options.source, platform: 'mac', clipboard: new MemoryClipboard(), metrics: BENCH_METRICS,
  });
  controller.setSelection(EditorSelection.single(at));
  const lastLine = Math.min(options.lastLine, controller.lineCount);
  controller.lines(options.firstLine, lastLine);
  for (let index = 0; index < options.warmup + options.keystrokes; index += 1) {
    const recording = index >= options.warmup;
    const started = now();
    if (isInsert(index)) controller.beforeInput('insertText', keystrokeCharacter(index)); else controller.beforeInput('deleteContentBackward', null);
    const transacted = now();
    controller.lines(options.firstLine, lastLine);
    const drawn = now();
    if (recording) {
      samples.controllerTransaction.push(transacted - started);
      samples.controllerLines.push(drawn - transacted);
    }
  }

  // ---- The same, in pieces ------------------------------------------------------------------------------------------------------
  const model = new EditorModel(options.source);
  model.dispatch({ selection: { anchor: at } });
  const highlight = new HighlightCache();
  const lineBuilder = new LineBuilder();
  const scheduler = new ParseScheduler(() => undefined);
  for (let index = 0; index < options.warmup + options.keystrokes; index += 1) {
    const recording = index >= options.warmup;
    const started = now();
    if (isInsert(index)) {
      const { state } = model;
      model.dispatch({ ...state.replaceSelection(keystrokeCharacter(index)), scrollIntoView: true, userEvent: 'input.type' });
    } else {
      const { head } = model.state.selection.main;
      model.dispatch({ changes: { from: head - 1, to: head }, selection: { anchor: head - 1 }, scrollIntoView: true, userEvent: 'delete.backward' });
    }
    const dispatched = now();
    const { state } = model;
    const last = Math.min(options.lastLine, state.doc.lines);
    const tree = scheduler.treeFor(state, state.doc.line(last).to);
    const treed = now();
    const brackets = matchedBrackets(state);
    const bracketed = now();
    highlight.keepOnly(options.firstLine, last);
    lineBuilder.keepOnly(options.firstLine, last);
    const colors = highlight.window(tree, state.doc, options.firstLine, last);
    const inputs = { state, spans: (number: number) => colors[number - options.firstLine] ?? [], diagnostics: [], inlays: [], composition: undefined, focused: true, brackets };
    lineBuilder.build(inputs, options.firstLine, last);
    const built = now();
    // The colour spans alone, read from the same tree the way a cache miss reads them.
    for (let number = options.firstLine; number <= last; number += 1) {
      const line = state.doc.line(number);
      colorSpans(tree, line.from, line.to);
    }
    const spanned = now();
    const changed = state.doc.lineAt(state.selection.main.head);
    colorSpans(tree, changed.from, changed.to);
    const spannedChanged = now();
    if (recording) {
      samples.modelDispatch.push(dispatched - started);
      samples.tree.push(treed - dispatched);
      samples.brackets.push(bracketed - treed);
      samples.buildLines.push(built - bracketed);
      samples.spansPerLine.push(spanned - built);
      samples.spansChangedLine.push(spannedChanged - spanned);
    }
  }

  // ---- The library alone -------------------------------------------------------------------------------------------------------
  let bare = EditorState.create({ doc: options.source, extensions: [javascript({ jsx: true, typescript: true })] });
  bare = bare.update({ selection: { anchor: at } }).state;
  for (let index = 0; index < options.warmup + options.keystrokes; index += 1) {
    const recording = index >= options.warmup;
    const started = now();
    const { head } = bare.selection.main;
    bare = (isInsert(index)
      ? bare.update({ changes: { from: head, insert: keystrokeCharacter(index) }, selection: { anchor: head + 1 }, userEvent: 'input.type' })
      : bare.update({ changes: { from: head - 1, to: head }, selection: { anchor: head - 1 }, userEvent: 'delete.backward' })).state;
    const updated = now();
    ensureSyntaxTree(bare, bare.doc.line(Math.min(options.lastLine, bare.doc.lines)).to, TREE_BUDGET_MS);
    const treed = now();
    if (recording) {
      samples.bareUpdate.push(updated - started);
      samples.bareTree.push(treed - updated);
    }
  }
  return samples;
}

export interface Summary {
  readonly n: number;
  readonly median: number;
  readonly mean: number;
  readonly p95: number;
  readonly min: number;
}

export function summarize(values: readonly number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (share: number): number => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0;
  const mean = sorted.reduce((total, value) => total + value, 0) / Math.max(1, sorted.length);
  return { n: sorted.length, median: at(MEDIAN), mean, p95: at(PERCENTILE_95), min: sorted[0] ?? 0 };
}

export type BenchSummary = { readonly [Piece in keyof BenchSamples]: Summary };

export function summarizeAll(samples: BenchSamples): BenchSummary {
  return {
    controllerTransaction: summarize(samples.controllerTransaction),
    controllerLines: summarize(samples.controllerLines),
    modelDispatch: summarize(samples.modelDispatch),
    tree: summarize(samples.tree),
    brackets: summarize(samples.brackets),
    buildLines: summarize(samples.buildLines),
    spansPerLine: summarize(samples.spansPerLine),
    spansChangedLine: summarize(samples.spansChangedLine),
    bareUpdate: summarize(samples.bareUpdate),
    bareTree: summarize(samples.bareTree),
  };
}
