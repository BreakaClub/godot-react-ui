import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryClipboard } from '../demo/src/editor/clipboard';
import { EditorWorkspace, INLAY_MAX_CHARACTERS, visibleRange, type LiveBackend } from '../demo/src/editor/workspace';
import type { CheckDiagnostic, CheckOutcome, CompileDiagnostic, Hover, InlayHint } from '../demo/src/live-compile-protocol';
import type { UpdateOutcome, UpdateReport } from '../demo/src/live-compile-session';
import { TEST_METRICS } from './editor-helpers';

// The loop between the editor and the live session (demo/src/editor/workspace.ts): debouncing, what a result for an older version of
// the text becomes, and that a result is never drawn where its text is not. The session is a fake whose answers the test holds.

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

const LAB = '/project/lab/lab.tsx';
const OTHER = '/project/lab/other.tsx';

class FakeBackend implements LiveBackend {
  readonly sources = [LAB, OTHER];
  readonly updates: { readonly path: string; readonly text: string }[] = [];
  readonly checks: Deferred<CheckOutcome>[] = [];
  readonly hints: Deferred<InlayHint[]>[] = [];
  readonly hovers: Deferred<Hover | null>[] = [];
  next: { outcome: UpdateOutcome; diagnostics?: CompileDiagnostic[]; error?: string } = { outcome: 'swapped' };
  readonly texts = new Map<string, string>([[LAB, 'const a = 1;\nconst b = 2;\n'], [OTHER, 'export const other = 0;\n']]);

  sourceOf(path: string): string {
    const text = this.texts.get(path);
    assert.ok(text !== undefined);
    return text;
  }

  update(path: string, text: string): UpdateReport {
    this.updates.push({ path, text });
    const check = deferred<CheckOutcome>();
    this.checks.push(check);
    return {
      path, outcome: this.next.outcome, diagnostics: this.next.diagnostics ?? [], error: this.next.error, evaluated: [path], rolledBack: false,
      timings: { compileMs: 1.5, swapMs: 2.5, totalMs: 4 }, check: check.promise,
    };
  }

  readonly checkedTexts: { readonly path: string; readonly text: string }[] = [];

  checkText(path: string, text: string): Promise<CheckOutcome> {
    this.checkedTexts.push({ path, text });
    const check = deferred<CheckOutcome>();
    this.checks.push(check);
    return check.promise;
  }

  hover(): Promise<Hover | null> {
    const pending = deferred<Hover | null>();
    this.hovers.push(pending);
    return pending.promise;
  }

  inlayHints(): Promise<InlayHint[]> {
    const pending = deferred<InlayHint[]>();
    this.hints.push(pending);
    return pending.promise;
  }
}

function open(options: { debounceMs?: number; maxWaitMs?: number } = {}) {
  const backend = new FakeBackend();
  let time = 0;
  const workspace = new EditorWorkspace({
    backend, platform: 'mac', clipboard: new MemoryClipboard(), metrics: TEST_METRICS, now: () => time,
    debounceMs: options.debounceMs ?? 10, maxWaitMs: options.maxWaitMs ?? 50,
  });
  return { backend, workspace, advance: (ms: number) => { time += ms; } };
}

const pause = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const checkedWith = (diagnostics: CheckDiagnostic[]): CheckOutcome => ({
  kind: 'checked', serviceMs: 3.2, report: { diagnostics, filesLoaded: 1, incomplete: [], deepestStack: 0 },
});

const error = (fileName: string, pos: number, end: number, messageText = 'Type error', code = 2322): CheckDiagnostic => ({ fileName, pos, end, code, category: 1, messageText });

test('typing is sent once, after a pause, with the whole text', async () => {
  const { backend, workspace } = open();
  const { model } = workspace.active.controller;
  model.dispatch({ changes: { from: 0, insert: 'x' } });
  model.dispatch({ changes: { from: 1, insert: 'y' } });
  model.dispatch({ changes: { from: 2, insert: 'z' } });
  assert.equal(backend.updates.length, 0, 'nothing is sent while the typing goes on');
  assert.equal(workspace.run.kind, 'pending');
  await pause(40);
  assert.deepEqual(backend.updates.map(update => update.text), ['xyzconst a = 1;\nconst b = 2;\n']);
  assert.equal(backend.updates[0]?.path, LAB);
  assert.equal(workspace.run.kind, 'swapped');
  assert.match(workspace.run.message, /Swapped in 4\.0 ms \(compile 1\.5, run 2\.5\)/u);
  workspace.dispose();
});

test('typing that never pauses is sent anyway, at the longest wait', async () => {
  const { backend, workspace, advance } = open({ debounceMs: 30, maxWaitMs: 60 });
  const { model } = workspace.active.controller;
  for (let index = 0; index < 5; index += 1) {
    model.dispatch({ changes: { from: 0, insert: 'a' } });
    advance(25);
    await pause(20);
  }
  assert.ok(backend.updates.length >= 1, `the page was updated during the typing: ${backend.updates.length}`);
  workspace.dispose();
});

test('a file that did not change is not sent, and an edit of the other file is sent with its path', async () => {
  const { backend, workspace } = open();
  workspace.setActive(OTHER);
  workspace.active.controller.model.dispatch({ changes: { from: 0, insert: '// hi\n' } });
  await pause(40);
  assert.deepEqual(backend.updates.map(update => update.path), [OTHER]);
  workspace.dispose();
});

test('a syntax error is shown at once, in the status bar and as an underline, and says the last good page is kept', async () => {
  const { backend, workspace } = open();
  backend.next = { outcome: 'compile-failed', diagnostics: [{ start: 10, end: 11, line: 0, character: 10, severity: 'error', message: 'Expected ";"' }] };
  workspace.active.controller.model.dispatch({ changes: { from: 12, insert: ' = ' } });
  workspace.flush();
  assert.equal(workspace.run.kind, 'compile-failed');
  assert.match(workspace.run.message, /Not applied, the last good page is showing\. Syntax error at 1:11: Expected ";"/u);
  assert.equal(workspace.run.offset, 10);
  const [shown] = workspace.active.controller.diagnostics;
  assert.deepEqual([shown?.from, shown?.to, shown?.severity, shown?.source], [10, 11, 'error', 'compiler']);
  workspace.dispose();
});

test('a class the library has no utility for is not sent to the page, is underlined, and is named; the text is still checked', async () => {
  const { backend, workspace } = open();
  backend.texts.set(LAB, 'const a = <View className="p-4 bg-e" />;\n');
  const file = new EditorWorkspace({ backend, platform: 'mac', clipboard: new MemoryClipboard(), metrics: TEST_METRICS, now: () => 0, debounceMs: 10, maxWaitMs: 50 });
  const { controller } = file.active;
  controller.model.dispatch({ changes: { from: controller.model.doc.length - 1, insert: ' ' } });
  file.flush();
  assert.equal(backend.updates.length, 0, 'the page was not asked to render it');
  assert.equal(backend.checkedTexts.length, 1, 'but the checker has the text');
  assert.equal(file.run.kind, 'class-error');
  assert.match(file.run.message, /Not applied, the last good page is showing\. No utility called "bg-e" at 1:32\./u);
  const [shown] = controller.diagnostics;
  assert.deepEqual([shown?.source, shown?.severity, controller.model.text.slice(shown?.from, shown?.to)], ['classes', 'error', 'bg-e']);
  // The class is finished: the text goes to the page, and the mark goes.
  controller.model.dispatch({ changes: { from: controller.model.text.indexOf('bg-e'), to: controller.model.text.indexOf('bg-e') + 'bg-e'.length, insert: 'bg-emerald-100' } });
  file.flush();
  assert.equal(backend.updates.length, 1);
  assert.equal(file.run.kind, 'swapped');
  assert.equal(controller.diagnostics.length, 0);
  file.dispose();
  workspace.dispose();
});

test('a module that throws and a render that throws are told apart', async () => {
  const { backend, workspace } = open();
  backend.next = { outcome: 'evaluation-failed', error: 'boom' };
  workspace.active.controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  workspace.flush();
  assert.match(workspace.run.message, /Not applied.*The module threw: boom/u);
  backend.next = { outcome: 'render-failed', error: 'bang' };
  workspace.active.controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  workspace.flush();
  assert.match(workspace.run.message, /Rolled back.*threw while it rendered: bang/u);
  assert.equal(workspace.run.kind, 'render-failed');
  workspace.dispose();
});

test('the type check of a text that has been typed into since is drawn mapped, on the same characters', async () => {
  const { backend, workspace } = open();
  const { controller } = workspace.active;
  controller.model.dispatch({ changes: { from: 0, insert: '' } });
  controller.model.dispatch({ changes: { from: 6, insert: 'A' } });
  workspace.flush();
  const sent = controller.model.text;
  const at = sent.indexOf('1');
  controller.model.dispatch({ changes: { from: 0, insert: '// new first line\n' } });
  backend.checks[0]?.resolve(checkedWith([error(LAB, at, at + 1)]));
  await pause(0);
  const [placed] = controller.diagnostics;
  assert.ok(placed);
  assert.equal(controller.model.text.slice(placed.from, placed.to), '1', 'the underline is on the character the checker meant');
  assert.equal(workspace.check.kind, 'checked');
  assert.equal(workspace.check.errors, 1);
  workspace.dispose();
});

test('diagnostics of other files are not drawn, and a superseded check changes nothing', async () => {
  const { backend, workspace } = open();
  workspace.active.controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  workspace.flush();
  workspace.active.controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  workspace.flush();
  backend.checks[0]?.resolve({ kind: 'superseded', by: 2 });
  await pause(0);
  assert.equal(workspace.active.controller.diagnostics.length, 0);
  backend.checks[1]?.resolve(checkedWith([error(OTHER, 0, 3), error(LAB, 2, 5)]));
  await pause(0);
  assert.deepEqual(workspace.active.controller.diagnostics.map(item => [item.from, item.to]), [[2, 5]]);
  workspace.dispose();
});

test('a result for an older version than the one already drawn is dropped', async () => {
  const { backend, workspace } = open();
  const { controller } = workspace.active;
  controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  workspace.flush();
  controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  workspace.flush();
  backend.checks[1]?.resolve(checkedWith([error(LAB, 4, 5, 'newer')]));
  await pause(0);
  backend.checks[0]?.resolve(checkedWith([error(LAB, 0, 1, 'older')]));
  await pause(0);
  assert.deepEqual(controller.diagnostics.map(item => item.message), ['newer']);
  workspace.dispose();
});

test('a check that cannot be placed is said so and draws nothing', async () => {
  const { backend, workspace } = open();
  const { controller } = workspace.active;
  controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  workspace.flush();
  for (let index = 0; index < 1100; index += 1) controller.model.dispatch({ changes: { from: 0, insert: 'x' } });
  backend.checks[0]?.resolve(checkedWith([error(LAB, 2, 3)]));
  await pause(0);
  assert.equal(controller.diagnostics.length, 0);
  assert.match(workspace.check.message ?? '', /changed too much/u);
  workspace.dispose();
});

test('inlay hints follow a check, and are placed for the text that was sent', async () => {
  const { backend, workspace } = open();
  const { controller } = workspace.active;
  controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  workspace.flush();
  backend.checks[0]?.resolve(checkedWith([]));
  await pause(0);
  assert.equal(backend.hints.length, 1);
  const sent = controller.model.text;
  const afterA = sent.indexOf('a') + 1;
  controller.model.dispatch({ changes: { from: 0, insert: '//\n' } });
  backend.hints[0]?.resolve([{ position: afterA, kind: 'type', label: ': number' }, { position: sent.indexOf('2'), kind: 'parameter', label: 'value:' }]);
  await pause(0);
  const hints = controller.inlays.items;
  assert.deepEqual(hints.map(hint => [hint.at, hint.label]), [[afterA + 3, ': number'], [sent.indexOf('2') + 3, 'value: ']]);
  const [typeHint] = hints;
  assert.ok(typeHint);
  assert.equal(controller.model.text.slice(typeHint.at - 1, typeHint.at), 'a', 'the type hint is right after the name');
  workspace.dispose();
});

test('a hover sends what is waiting first and is refused when the text has changed by the time it arrives', async () => {
  const { backend, workspace } = open();
  const { controller } = workspace.active;
  controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  const asked = workspace.hoverAt(7);
  assert.equal(backend.updates.length, 1, 'the pending text went first, so the hover is of the text the person sees');
  backend.hovers[0]?.resolve({ start: 6, end: 7, name: 'a', type: 'number' });
  const answer = await asked;
  assert.deepEqual(answer?.hover.type, 'number');
  const second = workspace.hoverAt(7);
  controller.model.dispatch({ changes: { from: 0, insert: 'x' } });
  backend.hovers[1]?.resolve({ start: 6, end: 7, name: 'a', type: 'number' });
  assert.equal(await second, undefined, 'the text changed while the hover was on its way');
  workspace.dispose();
});

test('reset puts every file back to its source and sends it', async () => {
  const { backend, workspace } = open();
  workspace.active.controller.model.dispatch({ changes: { from: 0, insert: 'broken' } });
  workspace.flush();
  workspace.reset();
  assert.equal(workspace.active.controller.model.text, backend.texts.get(LAB));
  assert.equal(backend.updates.at(-1)?.text, backend.texts.get(LAB));
  workspace.dispose();
});

test('a diagnostic that TypeScript puts at one position is made one character wide', () => {
  assert.deepEqual(visibleRange('abc;', 1, 1), [1, 2]);
  assert.deepEqual(visibleRange('abc', 3, 3), [2, 3], 'at the end of the text, on the last character');
  assert.deepEqual(visibleRange('abc\ndef', 3, 3), [2, 3], 'at the end of a line, on its last character');
  assert.deepEqual(visibleRange('abc;', 1, 3), [1, 3]);
  assert.deepEqual(visibleRange('', 0, 0), [0, 0]);
});

test('a hint longer than the limit is cut and ends in an ellipsis', async () => {
  const { backend, workspace } = open();
  const { controller } = workspace.active;
  controller.model.dispatch({ changes: { from: 0, insert: ' ' } });
  workspace.flush();
  backend.checks[0]?.resolve(checkedWith([]));
  await pause(0);
  backend.hints[0]?.resolve([{ position: 7, kind: 'type', label: `: (${'argument: SomeVeryLongTypeName, '.repeat(3)}) => void` }]);
  await pause(0);
  const [hint] = controller.inlays.items;
  assert.equal(hint?.label.length, INLAY_MAX_CHARACTERS);
  assert.ok(hint?.label.endsWith('…'));
  workspace.dispose();
});
