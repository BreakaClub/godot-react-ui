import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorSelection } from '@codemirror/state';
import { ParseScheduler, SYNTAX_COLORS, PLAIN_TEXT_COLOR } from '../demo/src/editor/highlight';
import { LineLayout } from '../demo/src/editor/line-layout';
import { THEME } from '../demo/src/editor/theme';
import type { EditorDiagnostic } from '../demo/src/editor/diagnostics';
import { EditorController } from '../demo/src/editor/controller';
import { MemoryClipboard } from '../demo/src/editor/clipboard';
import { TEST_METRICS, openEditor } from './editor-helpers';

// What a line shows (demo/src/editor/lines.ts, line-layout.ts, highlight.ts): its segments, the map between offsets and columns, the
// colours Lezer gives, and that a line which did not change keeps the identity of its spec.

const CODE = 'const answer = 42; // done\nfunction f(a: string) {\n  return `x${a}`;\n}\n';

function lineOf(editor: ReturnType<typeof openEditor>, number: number) {
  const spec = editor.editor.lines(number, number)[0];
  assert.ok(spec, `line ${number} exists`);
  return spec;
}

test('a line without pieces maps offsets to the same columns', () => {
  const layout = new LineLayout('abc', []);
  assert.deepEqual([0, 1, 2, 3].map(offset => layout.columnOf(offset)), [0, 1, 2, 3]);
  assert.deepEqual([0, 1, 2, 3, 9].map(column => layout.offsetAt(column)), [0, 1, 2, 3, 3]);
});

test('an inlay shifts the text after it, and a click on it puts the caret in front of it', () => {
  const layout = new LineLayout('const sizes = [];', [{ offset: 11, text: ': readonly string[]', kind: 'inlay' }]);
  assert.equal(layout.columnOf(11), 11, 'the caret before the hint');
  assert.equal(layout.columnOf(12), 12 + ': readonly string[]'.length, 'text after it is shifted');
  assert.equal(layout.displayLength, 'const sizes = [];'.length + ': readonly string[]'.length);
  assert.equal(layout.offsetAt(11), 11);
  assert.equal(layout.offsetAt(20), 11, 'a column inside the hint is the offset it stands at');
  assert.equal(layout.offsetAt(12 + ': readonly string[]'.length), 12);
});

test('the preedit goes in front of an inlay at the same offset and the caret after it', () => {
  const layout = new LineLayout('ab', [{ offset: 1, text: ':T', kind: 'inlay' }, { offset: 1, text: 'xyz', kind: 'preedit' }]);
  assert.deepEqual(layout.insertions.map(piece => piece.kind), ['preedit', 'inlay']);
  assert.equal(layout.columnOf(1), 1);
  assert.equal(layout.columnOf(1, 'after-preedit'), 4);
  assert.equal(layout.columnOf(2), 1 + 3 + 2 + 1);
});

test('keywords, numbers, comments and templates are coloured by the parse', () => {
  const editor = openEditor(CODE);
  const first = lineOf(editor, 1);
  const colour = (text: string) => first.segments.find(segment => segment.text === text)?.color;
  assert.equal(colour('const'), SYNTAX_COLORS.keyword);
  assert.equal(colour('42'), SYNTAX_COLORS.number);
  assert.equal(colour('// done'), SYNTAX_COLORS.comment);
  assert.equal(first.segments.map(segment => segment.text).join(''), first.text, 'the segments are the line');
  assert.equal(first.segments[0]?.column, 0);
  const third = lineOf(editor, 3);
  assert.ok(third.segments.some(segment => segment.color === SYNTAX_COLORS.string), 'the template literal is a string');
  assert.ok(third.segments.some(segment => segment.color === PLAIN_TEXT_COLOR));
});

test('a selection splits the segments and gives the part it covers a background; the colour follows the focus', () => {
  const editor = openEditor('const a<nswer = 4>2;');
  const spec = lineOf(editor, 1);
  const selected = spec.segments.filter(segment => segment.background === THEME.selectionInactive);
  assert.equal(selected.map(segment => segment.text).join(''), 'nswer = 4', 'the editor has no focus yet');
  editor.editor.setFocused(true);
  const focused = lineOf(editor, 1).segments.filter(segment => segment.background === THEME.selection);
  assert.equal(focused.map(segment => segment.text).join(''), 'nswer = 4');
  assert.equal(focused[0]?.column, 7);
});

test('a selection that goes on past the end of a line is marked on that line', () => {
  const editor = openEditor('one <two\nthree> four');
  assert.equal(lineOf(editor, 1).breakSelected, true);
  assert.equal(lineOf(editor, 2).breakSelected, false);
});

test('a diagnostic underlines its range, wavy and in the colour of its severity, and marks the gutter', () => {
  const editor = openEditor('const a = bad;\nconst b = 1;');
  const error: EditorDiagnostic = { from: 10, to: 13, severity: 'error', message: 'Cannot find name', code: 2304, source: 'checker' };
  const warning: EditorDiagnostic = { from: 21, to: 22, severity: 'warning', message: 'unused', code: undefined, source: 'checker' };
  const hint: EditorDiagnostic = { from: 0, to: 5, severity: 'suggestion', message: 'a hint', code: undefined, source: 'checker' };
  assert.equal(editor.editor.setDiagnostics(editor.editor.model.version, [error, warning, hint]), 'applied');
  const first = lineOf(editor, 1);
  const underlined = first.segments.filter(segment => segment.underline !== undefined);
  assert.deepEqual(underlined.map(segment => [segment.text, segment.underline?.color, segment.underline?.style]), [['bad', THEME.error, 'wavy']]);
  assert.equal(first.severity, 'error');
  const second = lineOf(editor, 2);
  assert.equal(second.severity, 'warning');
  assert.equal(second.segments.find(segment => segment.underline !== undefined)?.underline?.color, THEME.warning);
});

test('an inlay is a segment of its own at the right column, and the text after it is shifted', () => {
  const editor = openEditor('const sizes = [];');
  assert.equal(editor.editor.setInlays(0, [{ at: 11, kind: 'type', label: ': string[]' }]), 'applied');
  const spec = lineOf(editor, 1);
  const inlay = spec.segments.find(segment => segment.kind === 'inlay');
  assert.deepEqual([inlay?.text, inlay?.column, inlay?.color], [': string[]', 11, THEME.inlayText]);
  const after = spec.segments.filter(segment => segment.kind === 'text' && segment.column > 11);
  assert.equal(after[0]?.column, 11 + ': string[]'.length);
  assert.equal(after.map(segment => segment.text).join(''), ' = [];');
});

test('the preedit of a composition is a segment at the caret with a solid underline', () => {
  const editor = openEditor('ab|c');
  editor.editor.compositionStart();
  editor.editor.compositionUpdate('に');
  const spec = lineOf(editor, 1);
  const preedit = spec.segments.find(segment => segment.kind === 'preedit');
  assert.deepEqual([preedit?.text, preedit?.column, preedit?.underline?.style], ['に', 2, 'solid']);
  assert.equal(spec.segments.find(segment => segment.text === 'c')?.column, 3);
});

test('a line that did not change keeps its spec, whatever happened to the others', () => {
  const editor = openEditor(CODE);
  const before = editor.editor.lines(1, 4);
  editor.editor.setSelection(EditorSelection.single(30));
  const afterMove = editor.editor.lines(1, 4);
  assert.equal(afterMove[0], before[0], 'line 1 is the same object after the caret moved to line 2');
  editor.editor.setSelection(EditorSelection.single(CODE.indexOf('answer') + 2));
  editor.type('X');
  const afterType = editor.editor.lines(1, 4);
  assert.notEqual(afterType[0], before[0], 'the line that was typed in is new');
  assert.equal(afterType[1], afterMove[1], 'line 2 is the same object after a character was typed in line 1');
  assert.equal(afterType[3], afterMove[3]);
});

test('typing asks the parse for the part in view only, and a line past it is coloured once the parse has caught up', async () => {
  const lines = Array.from({ length: 3000 }, (_, index) => `const value${index} = ${index}; // ${'x'.repeat(index % 40)}`);
  const editor = new EditorController({ doc: lines.join('\n'), platform: 'mac', clipboard: new MemoryClipboard(), metrics: TEST_METRICS });
  const progress: number[] = [];
  const scheduler = new ParseScheduler(() => progress.push(Date.now()), 0);
  const { state } = editor.model;
  const end = state.doc.line(2900).to;
  const partial = scheduler.treeFor(state, end);
  assert.ok(partial.length < end, 'a budget of nothing leaves the parse unfinished');
  assert.equal(progress.length, 0);
  const deadline = Date.now() + 5000;
  while (progress.length === 0 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(progress.length, 1, 'the timer steps carried the parse to the line asked for and said so once');
  const again = scheduler.treeFor(state, end);
  assert.ok(again.length >= end, 'and the tree now covers it');
  scheduler.cancel();
  editor.dispose();
});

test('a view window of lines far into a file parses nothing past it', () => {
  const lines = Array.from({ length: 2000 }, (_, index) => `const value${index} = ${index};`);
  const editor = new EditorController({ doc: lines.join('\n'), platform: 'mac', clipboard: new MemoryClipboard(), metrics: TEST_METRICS });
  const top = editor.lines(1, 40);
  assert.equal(top.length, 40);
  assert.ok(top[0]?.segments.some(segment => segment.color === SYNTAX_COLORS.keyword));
  editor.dispose();
});
