// What CodeMirror 6 does with NO DOM and NO EditorView: state, transactions, undo, the Lezer syntax tree, highlight ranges,
// decorations as RangeSets, bracket matching, folding, commands, linting state and completion sources.
// Run (cwd must be this directory so the packages resolve):
//   cd experiments/code-editor/cm && node --require ../frameworks/trap-globals.cjs probe-headless.mjs
// `trap-globals.cjs` replaces every browser global by an accessor that returns undefined and records who read it, which is what
// a GodotJS context looks like to a library; the last line prints what the imports touched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EditorState, EditorSelection, Transaction, Prec, RangeSet, StateField, StateEffect } from '@codemirror/state';
import { Decoration, WidgetType, EditorView } from '@codemirror/view';
import { MonospaceCommandTarget } from './headless-view.mjs';
import {
  syntaxTree, ensureSyntaxTree, syntaxParserRunning, bracketMatching, matchBrackets, foldable, foldService, indentOnInput, indentUnit,
  HighlightStyle, highlightingFor, defaultHighlightStyle, syntaxHighlighting, getIndentation, language as languageFacet,
} from '@codemirror/language';
import {
  history, undo, redo, historyField, insertNewlineAndIndent, indentMore, indentLess, toggleComment, deleteCharBackward, selectAll,
  moveLineUp, copyLineDown, selectLine, insertTab, deleteLine, cursorDocEnd, cursorCharRight, cursorLineDown, cursorCharLeft, cursorLineUp, cursorGroupRight, selectLineEnd, selectLineStart, cursorPageDown, selectGroupLeft, deleteGroupBackward, addCursorBelow, standardKeymap, defaultKeymap,
} from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { highlightTree, classHighlighter, tagHighlighter, tags as t } from '@lezer/highlight';
import { setDiagnostics, forEachDiagnostic, diagnosticCount, linter } from '@codemirror/lint';
import { CompletionContext, autocompletion, completeFromList, completionStatus, currentCompletions } from '@codemirror/autocomplete';
import { SearchCursor } from '@codemirror/search';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..', '..');
const text = ['demo/src/filters-lab.tsx', 'src/kit/select.tsx'].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
console.log(`sample: ${text.split('\n').length} lines, ${text.length} chars`);

const ms = (from) => Math.round((performance.now() - from) * 100) / 100;
function timed(label, fn, runs = 1) {
  const started = performance.now();
  let result;
  for (let i = 0; i < runs; i += 1) result = fn();
  console.log(`${label}: ${ms(started) / runs} ms${runs > 1 ? ` (mean of ${runs})` : ''}`);
  return result;
}

// ---- state, language, parse -------------------------------------------------------------------------------------------
const lang = javascript({ jsx: true, typescript: true });
let state = timed('EditorState.create (1,000 lines)', () => EditorState.create({
  doc: text,
  extensions: [
    lang, history(), EditorState.allowMultipleSelections.of(true), indentUnit.of('  '), bracketMatching(), indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle),
  ],
}));
const tree = timed('ensureSyntaxTree, full parse', () => ensureSyntaxTree(state, state.doc.length, 10_000));
let nodes = 0;
let errors = 0;
tree.iterate({ enter: (node) => { nodes += 1; if (node.type.isError) errors += 1; } });
console.log(`syntax tree: ${nodes} nodes, ${errors} error nodes, top node ${tree.type.name}, language ${state.facet(languageFacet)?.name}`);

// ---- highlight ranges (the display colours) --------------------------------------------------------------------------
// `syntaxTree(state)` is the tree as of the last transaction or background step; with no view there is no background step, so a
// headless caller asks `ensureSyntaxTree` for the tree it wants (it parses up to the position within a time budget and returns it).
const fullTree = () => ensureSyntaxTree(state, state.doc.length, 10_000);
function highlightSpans(from, to, highlighter = classHighlighter) {
  const spans = [];
  highlightTree(fullTree(), highlighter, (spanFrom, spanTo, classes) => { spans.push([spanFrom, spanTo, classes]); }, from, to);
  return spans;
}
const all = timed('highlightTree, whole document', () => highlightSpans(0, state.doc.length), 5);
console.log(`  ${all.length} styled spans; sample ${JSON.stringify(all.slice(0, 3))}`);
const viewportFrom = state.doc.line(500).from;
const viewportTo = state.doc.line(540).to;
const viewport = timed('highlightTree, 40 lines (500..540)', () => highlightSpans(viewportFrom, viewportTo), 50);
console.log(`  ${viewport.length} styled spans`);
// The colour table our own view would supply instead of CSS classes: a HighlightStyle already carries its specs.
const oneDark = HighlightStyle.define([
  { tag: t.keyword, color: '#c678dd' }, { tag: [t.string, t.special(t.brace)], color: '#98c379' }, { tag: t.comment, color: '#7d8799', fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.null], color: '#d19a66' }, { tag: t.variableName, color: '#e06c75' }, { tag: t.definition(t.variableName), color: '#61afef' },
  { tag: t.typeName, color: '#e5c07b' }, { tag: t.tagName, color: '#e06c75' }, { tag: t.attributeName, color: '#d19a66' },
]);
console.log(`HighlightStyle.define: specs=${oneDark.specs.length}, module is ${oneDark.module?.constructor?.name}, style(tags)=${JSON.stringify(oneDark.style([t.keyword]))}`);
const coloured = (() => {
  const result = [];
  highlightTree(fullTree(), oneDark, (from, to, classes) => { result.push([from, to, classes]); }, viewportFrom, viewportTo);
  return result;
})();
console.log(`  HighlightStyle as highlighter: ${coloured.length} spans, first ${JSON.stringify(coloured[0])}`);
// A tagHighlighter gives a class per tag; the table maps it to a colour without any CSS (what a native renderer needs).
const tagTable = tagHighlighter([{ tag: t.keyword, class: 'kw' }, { tag: t.string, class: 'str' }, { tag: t.comment, class: 'cm' }]);
console.log(`  tagHighlighter spans in viewport: ${highlightSpans(viewportFrom, viewportTo, tagTable).length}`);

// ---- edits and incremental re-parse ---------------------------------------------------------------------------------------
function edit(lineNumber, insert) {
  const at = state.doc.line(lineNumber).to;
  const transaction = state.update({ changes: { from: at, insert }, userEvent: 'input.type' });
  state = transaction.state;
  return transaction;
}
for (const lineNumber of [1, 500, 1000]) {
  const before = performance.now();
  const transaction = edit(lineNumber, ' ');
  const dispatch = ms(before);
  const reparseStarted = performance.now();
  const reparsed = ensureSyntaxTree(state, state.doc.length, 10_000);
  console.log(`edit at line ${lineNumber}: state.update ${dispatch} ms, incremental re-parse ${ms(reparseStarted)} ms, tree reused ${reparsed !== null}, doc ${state.doc.lines} lines`);
  void transaction;
}
const highlightedAfterEdit = timed('highlightTree, 40 lines after an edit', () => highlightSpans(viewportFrom, viewportTo), 50);
void highlightedAfterEdit;

// ---- undo / redo without a view -----------------------------------------------------------------------------------------
const run = (command) => {
  let next = state;
  const handled = command({ state, dispatch: (transaction) => { next = transaction.state; } });
  state = next;
  return handled;
};
const lengthBeforeUndo = state.doc.length;
console.log(`undo handled=${run(undo)}, length ${lengthBeforeUndo} -> ${state.doc.length}; redo handled=${run(redo)}, length ${state.doc.length}`);

// ---- commands with only { state, dispatch } -----------------------------------------------------------------------------
state = state.update({ selection: { anchor: state.doc.line(10).to } }).state;
const results = {};
for (const [name, command] of Object.entries({ insertNewlineAndIndent, indentMore, indentLess, toggleComment, deleteCharBackward, selectAll, moveLineUp, copyLineDown, selectLine, insertTab, deleteLine, cursorDocEnd, cursorCharRight, cursorLineDown })) {
  const snapshot = state;
  try { results[name] = run(command) ? 'handled' : 'not handled'; } catch (error) { results[name] = `THROWS ${String(error.message).split('\n')[0]}`; }
  state = snapshot;
}
console.log('commands with a bare {state, dispatch} target:', JSON.stringify(results));

// The same commands (and the cursor movement ones) against the monospace stand-in for EditorView.
const targetResults = {};
for (const [name, command] of Object.entries({ cursorCharRight, cursorLineDown, deleteLine, cursorCharLeft, cursorLineUp, cursorGroupRight, selectLineEnd, selectLineStart, cursorPageDown, selectGroupLeft, deleteGroupBackward, addCursorBelow })) {
  const snapshot = state;
  let next = state;
  const target = new MonospaceCommandTarget(state, (transaction) => { next = transaction.state; });
  try {
    const handled = command(target);
    targetResults[name] = handled ? `handled, head ${snapshot.selection.main.head} -> ${next.selection.main.head}, ranges ${next.selection.ranges.length}` : 'not handled';
  } catch (error) { targetResults[name] = `THROWS ${String(error.message).split('\n')[0]}`; }
  state = snapshot;
}
console.log('commands against MonospaceCommandTarget:', JSON.stringify(targetResults, null, 1));

// ---- decorations (marks, widgets) as plain range sets --------------------------------------------------------------------------
class InlayWidget extends WidgetType {
  constructor(label) { super(); this.label = label; }
  eq(other) { return other.label === this.label; }
  toDOM() { throw new Error('toDOM must not be called by a native view'); }
}
const line20 = state.doc.line(20);
const underline = Decoration.mark({ class: 'wavy-error', attributes: { 'data-severity': 'error' } });
const inlay = Decoration.widget({ widget: new InlayWidget(': string'), side: 1 });
const decorations = Decoration.set([underline.range(line20.from + 2, line20.from + 6), inlay.range(line20.from + 10)], true);
const collected = [];
decorations.between(line20.from, line20.to, (from, to, value) => { collected.push([from, to, value.spec.class ?? value.spec.widget?.label]); });
console.log(`decoration RangeSet between(line 20): ${JSON.stringify(collected)}`);
const insertTransaction = state.update({ changes: { from: 0, insert: 'XY' } });
const mapped = decorations.map(insertTransaction.changes);
const mappedRanges = [];
mapped.between(0, state.doc.length + 2, (from, to) => { mappedRanges.push([from, to]); });
console.log(`  mapped through a 2-char insert at 0: ${JSON.stringify(mappedRanges)}`);
// Decorations that live in state (the way lint and search put theirs there) are readable from the state alone.
const fieldDecorations = StateField.define({ create: () => decorations, update: (value, tr) => value.map(tr.changes), provide: (field) => EditorView.decorations.from(field) });
const withField = EditorState.create({ doc: text, extensions: [fieldDecorations] });
const sources = withField.facet(EditorView.decorations);
console.log(`  EditorView.decorations facet from a StateField: ${sources.length} source(s), RangeSet instance=${sources[0] instanceof RangeSet}`);

// ---- bracket matching, folding, indentation --------------------------------------------------------------------------------
const bracketAt = state.doc.toString().indexOf('{');
console.log(`matchBrackets at first '{': ${JSON.stringify(matchBrackets(state, bracketAt + 1, -1) ?? matchBrackets(state, bracketAt, 1))}`);
let foldCount = 0;
for (let n = 1; n <= state.doc.lines; n += 1) { const l = state.doc.line(n); if (foldable(state, l.from, l.to)) foldCount += 1; }
console.log(`foldable lines: ${foldCount}; indentation for line 30: ${getIndentation(state, state.doc.line(30).from)}`);

// ---- lint: diagnostics live in state ------------------------------------------------------------------------------------------
const linted = EditorState.create({ doc: text, extensions: [lang, linter(() => [])] });
const diagnostics = [
  { from: 10, to: 14, severity: 'error', message: "Property 'x' does not exist on type 'Foo'.", source: 'ts', actions: [] },
  { from: 30, to: 40, severity: 'warning', message: 'unused' },
];
const afterLint = linted.update(setDiagnostics(linted, diagnostics)).state;
const seen = [];
forEachDiagnostic(afterLint, (diagnostic, from, to) => { seen.push([from, to, diagnostic.severity]); });
console.log(`lint: diagnosticCount=${diagnosticCount(afterLint)}, forEachDiagnostic ${JSON.stringify(seen)}`);
const movedLint = afterLint.update({ changes: { from: 0, insert: 'ABCD' } }).state;
const movedSeen = [];
forEachDiagnostic(movedLint, (diagnostic, from, to) => { movedSeen.push([from, to]); });
console.log(`  after a 4-char insert at 0 the diagnostics are at ${JSON.stringify(movedSeen)} (mapped through the change)`);

// ---- completion: a source is a function of (state, pos) ------------------------------------------------------------------------
const completionState = EditorState.create({ doc: 'const view = View; vi', extensions: [lang, autocompletion({ override: [completeFromList(['View', 'Text', 'Button', 'TextInput'])] })] });
const context = new CompletionContext(completionState, completionState.doc.length, true);
const sourceResult = await completeFromList(['View', 'Text', 'Button', 'TextInput'])(context);
console.log(`CompletionContext + completeFromList: ${JSON.stringify(sourceResult?.options?.map((o) => o.label))} from ${sourceResult?.from}`);
const languageCompletions = lang.language.data.of ? lang.support : null;
void languageCompletions;
const jsContext = new CompletionContext(EditorState.create({ doc: 'const abc = 1; const abd = 2; ab', extensions: [lang] }), 'const abc = 1; const abd = 2; ab'.length, true);
const localSources = jsContext.state.languageDataAt('autocomplete', jsContext.pos);
const local = await Promise.all(localSources.map((source) => (typeof source === 'function' ? source(jsContext) : null)));
console.log(`  javascript() language data completion sources: ${localSources.length}, results ${JSON.stringify(local.map((r) => r?.options?.map((o) => o.label)))}`);
console.log(`  completionStatus(state) without a view: ${completionStatus(completionState)}, currentCompletions: ${currentCompletions(completionState).length}`);

// ---- search ---------------------------------------------------------------------------------------------------------------------
const cursor = new SearchCursor(state.doc, 'useState');
let hits = 0;
timed('SearchCursor over the 1,000 lines', () => { while (!cursor.next().done) hits += 1; });
console.log(`  'useState' found ${hits} times`);

// ---- multiple selections ---------------------------------------------------------------------------------------------------------
const multi = state.update({ selection: EditorSelection.create([EditorSelection.cursor(5), EditorSelection.cursor(20), EditorSelection.range(30, 40)], 1) }).state;
const multiTypes = multi.update(multi.replaceSelection('Q')).state;
console.log(`multiple selections: ${multi.selection.ranges.length} ranges; replaceSelection('Q') leaves ${multiTypes.selection.ranges.length} ranges at ${JSON.stringify(multiTypes.selection.ranges.map((r) => [r.from, r.to]))}`);

console.log('globals the imports touched:', JSON.stringify(globalThis.__touchedGlobals?.() ?? {}));
