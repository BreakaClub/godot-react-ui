import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorModel } from '../demo/src/editor/model';
import { AnnotationSet, remapPoint, remapRange } from '../demo/src/editor/annotations';
import type { EditorDiagnostic, EditorInlay } from '../demo/src/editor/diagnostics';
import { openEditor } from './editor-helpers';

// Results of the asynchronous services arrive for the version of the text that was sent: mapped through the edits since, or refused.

function insert(model: EditorModel, at: number, text: string): void {
  model.dispatch({ changes: { from: at, insert: text } });
}

test('the version grows with each edit of the text and not with a selection move', () => {
  const model = new EditorModel('abc');
  assert.equal(model.version, 0);
  model.dispatch({ selection: { anchor: 2 } });
  assert.equal(model.version, 0);
  insert(model, 0, 'x');
  insert(model, 0, 'y');
  assert.equal(model.version, 2);
});

test('the edits since a version compose, and a position in the old text is mapped through them', () => {
  const model = new EditorModel('0123456789');
  insert(model, 0, 'AB');
  model.dispatch({ changes: { from: 6, to: 8 } });
  assert.equal(model.text, 'AB01236789');
  assert.deepEqual(model.mapPosition(2, 0), { kind: 'at', pos: 4 }, 'after the insertion');
  assert.deepEqual(model.mapPosition(8, 0), { kind: 'at', pos: 8 }, 'after the insertion and the deletion');
  assert.deepEqual(model.mapPosition(5, 0, -1), { kind: 'at', pos: 6 }, 'inside the deleted text it goes to where the deletion was');
  assert.deepEqual(model.mapPosition(0, 2), { kind: 'at', pos: 0 }, 'no edits since the current version');
  assert.deepEqual(model.mapPosition(0, 3), { kind: 'unknown' }, 'a version the model has not had');
});

test('a version older than the log is not mapped', () => {
  const model = new EditorModel('');
  for (let index = 0; index < 1005; index += 1) insert(model, model.doc.length, 'x');
  assert.equal(model.changesSince(0), undefined);
  assert.ok(model.changesSince(model.version - 10));
});

test('a transaction made from an older state is refused', () => {
  const model = new EditorModel('abc');
  const stale = model.state.update({ changes: { from: 0, insert: 'x' } });
  insert(model, 0, 'y');
  assert.throws(() => model.dispatch(stale), /older state/u);
});

const diagnostic = (from: number, to: number): EditorDiagnostic => ({ from, to, severity: 'error', message: 'm', code: 2322, source: 'checker' });

test('diagnostics computed for the text sent are mapped through what was typed since', () => {
  const model = new EditorModel('const a: string = 1;');
  const set = new AnnotationSet<EditorDiagnostic>(remapRange);
  model.subscribe(update => { if (update.docChanged) set.follow(update.transaction.changes); });
  const sent = model.version;
  const one = model.text.indexOf('1');
  insert(model, 0, '// header\n');
  assert.equal(set.replace(model, sent, [diagnostic(one, one + 1)]), 'mapped');
  assert.deepEqual(set.items.map(item => [item.from, item.to]), [[one + 10, one + 11]]);
  assert.equal(model.text.slice(one + 10, one + 11), '1', 'and it is on the same text');
  insert(model, 0, 'xx');
  assert.deepEqual(set.items.map(item => [item.from, item.to]), [[one + 12, one + 13]], 'every later edit keeps it in step');
});

test('a diagnostic for the current text is taken as it is and a result for an unknown version is refused', () => {
  const model = new EditorModel('abc');
  const set = new AnnotationSet<EditorDiagnostic>(remapRange);
  assert.equal(set.replace(model, 0, [diagnostic(0, 1)]), 'applied');
  assert.equal(set.replace(model, 7, [diagnostic(1, 2)]), 'refused');
  assert.deepEqual(set.items.map(item => [item.from, item.to]), [[0, 1]], 'a refused result leaves the set as it was');
});

test('a diagnostic whose text is deleted goes, and one that is typed into grows', () => {
  const model = new EditorModel('abcdef');
  const set = new AnnotationSet<EditorDiagnostic>(remapRange);
  model.subscribe(update => { if (update.docChanged) set.follow(update.transaction.changes); });
  set.replace(model, 0, [diagnostic(1, 3), diagnostic(4, 6)]);
  model.dispatch({ changes: { from: 1, to: 3 } });
  assert.deepEqual(set.items.map(item => [item.from, item.to]), [[2, 4]], 'the first one went with its text');
  model.dispatch({ changes: { from: 3, insert: 'ZZ' } });
  assert.deepEqual(set.items.map(item => [item.from, item.to]), [[2, 6]], 'text typed inside the second one is underlined too');
  model.dispatch({ changes: { from: 6, insert: 'Q' } });
  assert.deepEqual(set.items.map(item => [item.from, item.to]), [[2, 6]], 'text typed at its end is not');
});

test('an inlay stays after the text it was after', () => {
  const model = new EditorModel('const sizes = [];');
  const set = new AnnotationSet<EditorInlay>(remapPoint);
  const hint: EditorInlay = { at: 11, kind: 'type', label: ': string[]' };
  insert(model, 0, '// c\n');
  assert.equal(set.replace(model, 0, [hint]), 'mapped');
  assert.equal(set.items[0]?.at, 16);
  assert.equal(model.text.slice(11, 16), 'sizes', 'the hint is after "sizes"');
});

test('a hint after a name stays after it when the name is cut and typed back', () => {
  const model = new EditorModel('const sizes = [];');
  const set = new AnnotationSet<EditorInlay>(remapPoint);
  model.subscribe(update => { if (update.docChanged) set.follow(update.transaction.changes); });
  set.replace(model, 0, [{ at: 11, kind: 'type', label: ': string[]' }]);
  model.dispatch({ changes: { from: 6, to: 11 } });
  assert.equal(set.items[0]?.at, 6);
  model.dispatch({ changes: { from: 6, insert: 'sizes' } });
  assert.equal(set.items[0]?.at, 11, 'after the name again');
  model.dispatch({ changes: { from: 11, insert: 'X' } });
  assert.equal(set.items[0]?.at, 12, 'and after what was typed onto the name');
});

test('text typed at the start of a diagnostic is not underlined, and text typed at its end is not either', () => {
  const model = new EditorModel('abcdef');
  const set = new AnnotationSet<EditorDiagnostic>(remapRange);
  model.subscribe(update => { if (update.docChanged) set.follow(update.transaction.changes); });
  set.replace(model, 0, [diagnostic(2, 4)]);
  model.dispatch({ changes: { from: 2, insert: 'XY' } });
  assert.deepEqual(set.items.map(item => [item.from, item.to]), [[4, 6]], 'the underline moved over what was typed in front of it');
  assert.equal(model.text.slice(4, 6), 'cd');
});
