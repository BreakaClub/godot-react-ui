import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorSelection } from '@codemirror/state';
import { ParseScheduler, SYNTAX_COLORS, PLAIN_TEXT_COLOR } from '../demo/src/editor/highlight';
import { LineLayout } from '../demo/src/editor/line-layout';
import { insertionsFor } from '../demo/src/editor/lines';
import { displayColumns } from '../demo/src/editor/geometry';
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

test('the preedit goes in front of an inlay at the same offset, and a caret after is after both', () => {
  const layout = new LineLayout('ab', [{ offset: 1, text: ':T', kind: 'inlay' }, { offset: 1, text: 'xyz', kind: 'preedit' }]);
  assert.deepEqual(layout.insertions.map(piece => piece.kind), ['preedit', 'inlay']);
  assert.equal(layout.columnOf(1), 1);
  assert.equal(layout.columnOf(1, 'after'), 1 + 3 + 2, 'after the group of generated text at the offset, as a `Text` has it');
  assert.equal(layout.columnOf(2), 1 + 3 + 2 + 1);
});

test('a hint where the composition is shown is not shown while it is: the caret after the preedit is after all that stands there', () => {
  const inlays = [{ at: 1, kind: 'type' as const, label: ': T' }, { at: 4, kind: 'type' as const, label: ': U' }];
  assert.deepEqual(insertionsFor(0, 6, inlays, undefined).map(piece => [piece.offset, piece.text]), [[1, ': T'], [4, ': U']]);
  assert.deepEqual(insertionsFor(0, 6, inlays, { at: 1, text: 'x' }).map(piece => [piece.offset, piece.text, piece.kind]), [[4, ': U', 'inlay'], [1, 'x', 'preedit']]);
  assert.deepEqual(insertionsFor(0, 6, inlays, { at: 1, text: '' }).map(piece => piece.text), [': T', ': U'], 'a composition with nothing to show yet hides nothing');
});

test('a line is on the grid when every character is one column wide: printable ASCII, hint and preedit included', () => {
  assert.equal(new LineLayout('const a = "b";', []).onGrid, true);
  assert.equal(new LineLayout('', []).onGrid, true);
  for (const wide of ['// \u65e5\u672c\u8a9e', '// \u{1F600}', 'e\u0301', '\tindent', 'caf\u00e9']) {
    assert.equal(new LineLayout(wide, []).onGrid, false, `${JSON.stringify(wide)} is not on the grid`);
  }
  assert.equal(new LineLayout('ab', [{ offset: 1, text: ': T', kind: 'inlay' }]).onGrid, true);
  assert.equal(new LineLayout('ab', [{ offset: 1, text: '\u2026', kind: 'inlay' }]).onGrid, false, 'a hint with a character of its own is not');
  assert.equal(new LineLayout('ab', [{ offset: 1, text: '\u306b', kind: 'preedit' }]).onGrid, false, 'nor a preedit');
});

test('the width of a line for the scrolling content: a column a character, two for a wide one, none for a mark, a tab stop for a tab', () => {
  assert.equal(displayColumns('abc'), 3);
  assert.equal(displayColumns('\u65e5\u672c\u8a9e'), 6);
  assert.equal(displayColumns('\u{1F600}'), 2, 'an emoji is two code units and two columns');
  assert.equal(displayColumns('e\u0301'), 1, 'a mark adds none');
  assert.equal(displayColumns('\tx'), 9);
});

test('keywords, numbers, comments and templates are coloured by the parse', () => {
  const editor = openEditor(CODE);
  const first = lineOf(editor, 1);
  const colour = (text: string) => first.segments.find(segment => segment.text === text)?.color;
  assert.equal(colour('const'), SYNTAX_COLORS.keyword);
  assert.equal(colour('42'), SYNTAX_COLORS.number);
  assert.equal(colour('// done'), SYNTAX_COLORS.comment);
  assert.equal(first.segments.map(segment => segment.text).join(''), first.text, 'the segments are the line');
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
  const segments = lineOf(editor, 1).segments;
  const focused = segments.filter(segment => segment.background === THEME.selection);
  assert.equal(focused.map(segment => segment.text).join(''), 'nswer = 4');
  const first = segments.findIndex(segment => segment.background === THEME.selection);
  assert.equal(segments.slice(0, first).map(segment => segment.text).join(''), 'const a', 'it starts where the selection does');
});

test('a selection that goes on past the end of a line is marked on that line, as one space of generated text after it', () => {
  const editor = openEditor('one <two\nthree> four');
  editor.editor.setFocused(true);
  const first = lineOf(editor, 1);
  const last = first.segments.at(-1);
  assert.deepEqual([last?.kind, last?.text, last?.background], ['break', ' ', THEME.selection]);
  assert.equal(first.segments.filter(segment => segment.kind !== 'break').map(segment => segment.text).join(''), first.text, 'the line\'s own text is whole');
  assert.equal(lineOf(editor, 2).segments.some(segment => segment.kind === 'break'), false);
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

test('an inlay is a segment of its own between the text before it and the text after it', () => {
  const editor = openEditor('const sizes = [];');
  assert.equal(editor.editor.setInlays(0, [{ at: 11, kind: 'type', label: ': string[]' }]), 'applied');
  const spec = lineOf(editor, 1);
  const index = spec.segments.findIndex(segment => segment.kind === 'inlay');
  const inlay = spec.segments[index];
  assert.deepEqual([inlay?.text, inlay?.color, inlay?.background], [': string[]', THEME.inlayText, THEME.inlayBackground]);
  assert.equal(spec.segments.slice(0, index).map(segment => segment.text).join(''), 'const sizes');
  assert.equal(spec.segments.slice(index + 1).map(segment => segment.text).join(''), ' = [];');
  assert.equal(spec.segments.filter(segment => segment.kind === 'text').map(segment => segment.text).join(''), spec.text, 'the text segments are the document\'s line');
});

test('the preedit of a composition is a segment at the caret with a solid underline', () => {
  const editor = openEditor('ab|c');
  editor.editor.compositionStart();
  editor.editor.compositionUpdate('に');
  const spec = lineOf(editor, 1);
  const index = spec.segments.findIndex(segment => segment.kind === 'preedit');
  const preedit = spec.segments[index];
  assert.deepEqual([preedit?.text, preedit?.underline?.style], ['に', 'solid']);
  assert.deepEqual([spec.segments.slice(0, index), spec.segments.slice(index + 1)].map(side => side.map(segment => segment.text).join('')), ['ab', 'c']);
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

test('two neighbouring pieces of text in one style are one segment, so a line has as few elements as it needs', () => {
  const editor = openEditor('f(a);\n()()');
  for (const number of [1, 2]) {
    const { segments } = lineOf(editor, number);
    for (let index = 1; index < segments.length; index += 1) {
      const [before, after] = [segments[index - 1], segments[index]];
      assert.ok(before !== undefined && after !== undefined);
      const same = before.kind === 'text' && after.kind === 'text' && before.color === after.color && before.background === after.background;
      assert.equal(same, false, `segments ${index - 1} and ${index} of line ${number} have one style: ${JSON.stringify([before.text, after.text])}`);
    }
  }
  assert.equal(lineOf(editor, 2).segments.length, 1, 'four brackets in the punctuation colour are one run');
});

test('a caret says its offset, its side of the generated text there and whether its line is on the grid', () => {
  const editor = openEditor('ab|c\n// 日本|\n');
  const [first, second] = editor.editor.caretPlacements();
  assert.deepEqual(first && [first.line, first.offset, first.side, first.onGrid, first.column], [1, 2, 'before', true, 2]);
  assert.deepEqual(second && [second.line, second.offset, second.side, second.onGrid], [2, 5, 'before', false], 'a line with wide characters is not on the grid');
  const composing = openEditor('ab|c');
  composing.editor.compositionStart();
  assert.equal(composing.editor.caretPlacements()[0]?.side, 'before', 'a composition with nothing to show yet leaves the caret where it was');
  composing.editor.compositionUpdate('xy');
  const [caret] = composing.editor.caretPlacements();
  assert.deepEqual(caret && [caret.offset, caret.side, caret.column], [2, 'after', 4], 'after the preedit');
});
