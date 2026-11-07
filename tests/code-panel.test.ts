import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as library from '../src';
import { View } from '../src';
import { CodeEditor } from '../demo/src/code-editor';
import { MemoryClipboard } from '../demo/src/editor/clipboard';
import { SINK_TEXT } from '../demo/src/editor/sink';
import { gutterWidthFor } from '../demo/src/editor/geometry';
import { openLabCode, releaseLabCode, type CodeSupport, type LabCode } from '../demo/src/editor/lab-code';
import { HOVER_DELAY_MS } from '../demo/src/editor/view/hover';
import { THEME } from '../demo/src/editor/theme';
import type { LiveCompileHost } from '../demo/src/live-compile-host';
import { installRefreshHook, performRefresh, refreshHooks } from '../demo/src/live-compile-refresh';
import { parseCompileResult, parseProject, type CheckOutcome, type Hover, type InlayHint } from '../demo/src/live-compile-protocol';
import { LiveSession } from '../demo/src/live-compile-session';
import { findLab, type InlineLab } from '../demo/src/labs';
import { createTestRoot } from './recording-host';
import { TextInputHost } from './text-input-host';

// The code panel against the fake host, with the real compiler and the real session: a click puts the caret at a column, typing
// reaches the page, a syntax error is shown and the last good page stays, a type error is underlined where the checker said.
// What this does not have is the font, the layout and the pixels (the `code-editor` section of the interaction verifier has those).
// Needs `node scripts/build-live-compile.mjs --cli` and the project file `node scripts/live-compile-project.mjs` writes.

const root = resolve(__dirname, '..');
const CLI = resolve(root, 'live-compile/target/release/live-compile-cli');
const PROJECT = resolve(root, 'demo/live-compile/project.json');
const NEEDS: string | false = !existsSync(CLI) ? 'live-compile-cli is not built: run `node scripts/build-live-compile.mjs --cli`'
  : !existsSync(PROJECT) ? 'demo/live-compile/project.json is missing: run `node scripts/live-compile-project.mjs`' : false;
const FRAME_HEADER_BYTES = 4;
const ADVANCE = 7.25;
const LINE_HEIGHT = 20;
const CONTENT = { x: 300, y: 200 };
const VIEWPORT = { width: 640, height: 400 };
const FIRST_LINE_TEXT_ID = 'code-line-1';

function lab(): InlineLab {
  const found = findLab('inputs');
  assert.ok(found !== undefined && found.kind === 'inline');
  return found;
}

/** What the fake checker answers next: the test changes these while the panel runs. */
interface Control {
  hovers: Hover[];
  hints: InlayHint[];
  nextCheck: () => CheckOutcome;
}

interface Scenario {
  readonly host: TextInputHost;
  readonly uiRoot: ReturnType<typeof createTestRoot>['root'];
  readonly code: LabCode;
  readonly clipboard: MemoryClipboard;
  readonly control: Control;
}

function mount(): Scenario {
  const host = new TextInputHost();
  host.rectsByTestID.set('editor-grid-probe', { x: 0, y: 0, width: 400 * ADVANCE, height: LINE_HEIGHT });
  host.rectsByTestID.set('code-content', { ...CONTENT, width: VIEWPORT.width, height: 4000 });
  host.rectsByTestID.set('code-scroll', { x: CONTENT.x, y: CONTENT.y, ...VIEWPORT });
  host.scrollStatesByTestID.set('code-scroll', {
    scrollLeft: 0, scrollTop: 0, scrollWidth: VIEWPORT.width, scrollHeight: 4000, clientWidth: VIEWPORT.width, clientHeight: VIEWPORT.height,
    minScrollLeft: 0, maxScrollLeft: 0, minScrollTop: 0, maxScrollTop: 3600, thumbs: null, tracks: null,
  });
  const { root: uiRoot } = createTestRoot(host);
  const project = parseProject(readFileSync(PROJECT, 'utf8'));
  const control: Control = {
    hovers: [], hints: [],
    nextCheck: () => ({ kind: 'checked', serviceMs: 1, report: { diagnostics: [], filesLoaded: 1, incomplete: [], deepestStack: 0 } }),
  };
  const clipboard = new MemoryClipboard();
  const compiler: LiveCompileHost = {
    compile(path, source, refresh) {
      const body = Buffer.from(JSON.stringify({ op: 'transpile', path, source, refresh }));
      const header = Buffer.alloc(FRAME_HEADER_BYTES);
      header.writeUInt32LE(body.length);
      const reply = spawnSync(CLI, [], { input: Buffer.concat([header, body]), maxBuffer: 64 * 1024 * 1024 });
      assert.equal(reply.status, 0, `the compiler exited ${reply.status}`);
      return parseCompileResult(reply.stdout.subarray(FRAME_HEADER_BYTES, FRAME_HEADER_BYTES + reply.stdout.readUInt32LE(0)).toString('utf8'));
    },
    setFile() {},
    setFiles() {},
    requestCheck: () => Promise.resolve(control.nextCheck()),
    hover: () => Promise.resolve(control.hovers[0] ?? null),
    inlayHints: () => Promise.resolve(control.hints),
    close() {},
  };
  installRefreshHook();
  const support: CodeSupport = {
    openSession: target => new LiveSession({
      host: compiler, project, labId: target.id, exportName: target.component.name, root: uiRoot, embedded: true,
      externals: { react: React, 'react/jsx-runtime': jsxRuntime, 'godot-react-ui': library },
      aliases: { '../../src': 'godot-react-ui' }, refresh: refreshHooks, performRefresh, now: () => Date.now(),
    }),
    readSource: () => '',
    platform: 'mac',
    clipboard,
    now: () => Date.now(),
  };
  const code = openLabCode(lab(), support);
  assert.equal(code.kind, 'live', code.kind === 'read-only' ? code.reason : '');
  const stage = code.kind === 'live' ? React.createElement(code.session.Lab) : null;
  uiRoot.render(React.createElement(View, null, React.createElement(View, { testID: 'stage' }, stage), React.createElement(CodeEditor, { lab: lab(), code })));
  const scroller = host.findByTestId('code-scroll');
  const state = host.scrollStatesByTestID.get('code-scroll');
  assert.ok(scroller > 0 && state !== undefined, 'the scroll container is mounted');
  host.scrollStates.set(scroller, state);
  return { host, uiRoot, code, clipboard, control };
}

/** Native focuses the input when the panel opens (`autoFocus`) and tells JS: the fake host is told to do the same. */
function focusSink(s: Scenario): void {
  const sink = tag(s, 'editor-input-sink');
  s.host.focusNode(sink, 1);
  s.host.events.push(s.host.focusEvent(sink, 'focus'));
  s.uiRoot.dispatchEvents();
}

function tag(s: Scenario, testID: string): number {
  const found = s.host.findByTestId(testID);
  assert.ok(found > 0, `${testID} is on the page`);
  return found;
}

function has(s: Scenario, testID: string): boolean {
  return s.host.findByTestId(testID) > 0;
}

function textOf(s: Scenario, testID: string): string {
  const collect = (id: number): string => {
    const entry = s.host.nodes.get(id);
    return (entry?.text ?? '') + (entry?.children ?? []).map(collect).join('');
  };
  return collect(tag(s, testID));
}

function propsOf(s: Scenario, testID: string): Record<string, unknown> {
  const entry = s.host.nodes.get(tag(s, testID));
  assert.ok(entry);
  return entry.props;
}

function styleOf(s: Scenario, testID: string): Record<string, unknown> {
  const style = propsOf(s, testID).style;
  assert.ok(typeof style === 'object' && style !== null && 'layers' in style && Array.isArray(style.layers), `${testID} has a compiled style`);
  const merged: Record<string, unknown> = {};
  for (const layer of style.layers) {
    if (typeof layer === 'object' && layer !== null && 'style' in layer && typeof layer.style === 'object' && layer.style !== null) Object.assign(merged, layer.style);
  }
  return merged;
}

function workspace(s: Scenario) {
  return s.code.workspace;
}

/** The root-local point of the caret boundary at (`line`, `column`) in the content. */
function pointAt(s: Scenario, line: number, column: number): { x: number; y: number } {
  const gutter = gutterWidthFor(workspace(s).active.controller.lineCount, ADVANCE);
  return { x: CONTENT.x + gutter + column * ADVANCE, y: CONTENT.y + (line - 1) * LINE_HEIGHT + LINE_HEIGHT / 2 };
}

/** `count` quick presses at one place: the editor counts them itself, because a `pointerdown` carries no click count. */
function click(s: Scenario, at: { x: number; y: number }, init: { count?: number; shiftKey?: boolean; altKey?: boolean } = {}): void {
  const content = tag(s, 'code-content');
  for (let press = 0; press < (init.count ?? 1); press += 1) {
    const down = s.host.pointerEvent(content, 'pointerdown', { ...at, viewportX: at.x, viewportY: at.y, cancelable: true, buttons: 1, shiftKey: init.shiftKey ?? false, altKey: init.altKey ?? false });
    s.host.pointersDown.add(down.pointerId);
    s.host.events.push(down);
    s.uiRoot.dispatchEvents();
    s.host.events.push(s.host.pointerEvent(content, 'pointerup', { ...at, viewportX: at.x, viewportY: at.y }));
    s.host.pointersDown.delete(down.pointerId);
    s.host.captures.delete(down.pointerId);
    s.uiRoot.dispatchEvents();
  }
}

const pause = (ms: number): Promise<void> => new Promise(done => setTimeout(done, ms));

/** A test of the panel with the editor mounted and focused, torn down after: a focused editor has a blink timer. */
function panelTest(name: string, body: (s: Scenario) => void | Promise<void>): void {
  test(name, { skip: NEEDS }, async () => {
    const s = mount();
    focusSink(s);
    try {
      await body(s);
    } finally {
      s.uiRoot.unmount();
      releaseLabCode(s.code);
    }
  });
}
const COLUMN_TOLERANCE = 1;
const SETTLE_MS = 400;
/** A line typed above everything, so that what the checker says is for a text that is not the one the person started with. */
const EDIT_HEADER = '// edit\n';

panelTest('the panel shows the lab\'s source, and the lab on the stage is the live session\'s', (s) => {
  const source = workspace(s).active.controller.model.text.split('\n');
  assert.equal(textOf(s, FIRST_LINE_TEXT_ID), source[0]);
  assert.equal(textOf(s, 'code-line-2'), source[1]);
  assert.ok(has(s, 'inputs-lab'), 'the page is on the stage');
  assert.equal(propsOf(s, 'editor-input-sink').multiline, true);
  assert.equal(s.host.focused, tag(s, 'editor-input-sink'), 'the input is focused');
  assert.ok(has(s, 'code-caret'), 'and the caret is drawn');
  assert.equal(textOf(s, 'code-status-position'), 'Ln 1, Col 1');
  assert.match(textOf(s, 'code-status-run'), /^Live\./u);
});

panelTest('a press puts the caret at the column under the pointer, within a pixel', (s) => {
  for (const [line, column] of [[3, 0], [3, 5], [4, 12], [6, 31]] as const) {
    const at = pointAt(s, line, column);
    // Over the left half of a character, or the right: the nearest boundary.
    click(s, { x: at.x + (column === 5 ? ADVANCE * 0.3 : -ADVANCE * 0.3), y: at.y });
    const wanted = Math.min(column, workspace(s).active.controller.model.doc.line(line).length);
    assert.equal(textOf(s, 'code-status-position'), `Ln ${line}, Col ${wanted + 1}`);
    const caret = styleOf(s, 'code-caret');
    const gutter = gutterWidthFor(workspace(s).active.controller.lineCount, ADVANCE);
    assert.ok(Math.abs(Number(caret.left) - (gutter + wanted * ADVANCE)) <= 1, `the caret is at column ${wanted}: ${String(caret.left)}`);
    assert.equal(caret.top, (line - 1) * LINE_HEIGHT);
    const sink = styleOf(s, 'editor-input-sink');
    assert.ok(Math.abs(Number(sink.left) - Number(caret.left)) <= COLUMN_TOLERANCE && sink.top === caret.top, `The input stands at the caret, so the IME and the keyboard follow it: ${String(sink.left)} against ${String(caret.left)}`);
  }
});

panelTest('a double click selects a word and the selection is drawn on the line', (s) => {
  const first = workspace(s).active.controller.model.doc.line(1).text;
  const start = first.indexOf('import') + 1;
  click(s, pointAt(s, 1, start + 2), { count: 2 });
  const { main } = workspace(s).active.controller.model.state.selection;
  assert.equal(workspace(s).active.controller.model.state.sliceDoc(main.from, main.to), 'import');
  const row = s.host.nodes.get(tag(s, FIRST_LINE_TEXT_ID));
  assert.ok(row);
  const selected = row.children.map(child => s.host.nodes.get(child)).filter(entry => entry?.props.style !== undefined)
    .filter(entry => JSON.stringify(entry?.props.style).includes(THEME.selection.slice(0, 7)));
  assert.ok(selected.length > 0, 'a run of the line has the selection colour');
});

panelTest('typing is on the page after the pause, the counter keeps its count, and the status says what happened', async (s) => {
  const press = (): void => {
    s.host.events.push(s.host.pointerEvent(tag(s, 'inputs-next'), 'click', { pointerId: 0, pointerType: '' }));
    s.uiRoot.dispatchEvents();
  };
  press();
  press();
  assert.equal(textOf(s, 'inputs-next'), 'Next 2');
  const { controller } = workspace(s).active;
  const text = controller.model.text;
  const at = text.indexOf('bg-slate-50');
  click(s, pointAt(s, controller.model.doc.lineAt(at).number, at - controller.model.doc.lineAt(at).from));
  controller.model.dispatch({ selection: { anchor: at + 3, head: at + 11 } });
  s.host.type(s.uiRoot, 'emerald-100');
  assert.equal(controller.model.text.includes('bg-emerald-100'), true, 'the text is the editor\'s at once');
  assert.equal(workspace(s).run.kind, 'pending');
  await pause(SETTLE_MS);
  assert.equal(workspace(s).run.kind, 'swapped', workspace(s).run.message);
  assert.match(textOf(s, 'code-status-run'), /^Swapped in /u);
  assert.equal(textOf(s, 'inputs-next'), 'Next 2', 'state kept');
  assert.equal(s.host.textInputs.get(tag(s, 'editor-input-sink'))?.value, SINK_TEXT, 'the input\'s own buffer is never edited');
});

/** The style of the run of line `number` that holds `text`, or undefined. */
function runStyle(s: Scenario, number: number, text: string): Record<string, unknown> | undefined {
  const row = s.host.nodes.get(tag(s, `code-line-${number}`));
  assert.ok(row);
  for (const child of row.children) {
    const entry = s.host.nodes.get(child);
    if (entry?.text === text && entry.props.style !== undefined) {
      const merged: Record<string, unknown> = {};
      const style: unknown = entry.props.style;
      if (typeof style === 'object' && style !== null && 'layers' in style && Array.isArray(style.layers)) {
        for (const layer of style.layers) {
          if (typeof layer === 'object' && layer !== null && 'style' in layer && typeof layer.style === 'object' && layer.style !== null) Object.assign(merged, layer.style);
        }
      }
      return merged;
    }
  }
  return undefined;
}

function lineOf(s: Scenario, needle: string): { readonly number: number; readonly column: number; readonly offset: number } {
  const { doc } = workspace(s).active.controller.model;
  const offset = doc.toString().indexOf(needle);
  assert.ok(offset >= 0, `"${needle}" is in the source`);
  const line = doc.lineAt(offset);
  return { number: line.number, column: offset - line.from, offset };
}

panelTest('a syntax error keeps the last good page, is said in the status bar, and is underlined where it is', async (s) => {
  const { controller } = workspace(s).active;
  const press = (): void => {
    s.host.events.push(s.host.pointerEvent(tag(s, 'inputs-next'), 'click', { pointerId: 0, pointerType: '' }));
    s.uiRoot.dispatchEvents();
  };
  press();
  const page = textOf(s, 'inputs-lab');
  controller.model.dispatch({ selection: { anchor: controller.model.doc.line(1).to } });
  s.host.type(s.uiRoot, ' = = ;');
  workspace(s).flush();
  assert.equal(workspace(s).run.kind, 'compile-failed', workspace(s).run.message);
  const immediate = controller.diagnostics.find(item => item.severity === 'error');
  assert.ok(immediate, 'the compiler\'s error is drawn at once, without waiting for the checker');
  assert.equal(immediate.source, 'compiler');
  await pause(50);
  assert.match(textOf(s, 'code-status-run'), /Not applied, the last good page is showing\. Syntax error at \d+:\d+/u);
  assert.equal(textOf(s, 'inputs-lab'), page, 'the page is as it was');
  assert.equal(textOf(s, 'inputs-next'), 'Next 1');
  const line = controller.model.doc.lineAt(immediate.from);
  // The checker, which has the same error, answers for the same text and replaces the compiler's mark.
  s.control.nextCheck = () => ({ kind: 'checked', serviceMs: 1, report: { diagnostics: [], filesLoaded: 1, incomplete: [], deepestStack: 0 } });
  controller.setDiagnostics(controller.model.version, [immediate]);
  await pause(20);
  assert.ok(has(s, `code-marker-${line.number}`), 'and the gutter marks its line');
  const underlined = s.host.nodes.get(tag(s, `code-line-${line.number}`))?.children
    .map(child => s.host.nodes.get(child)).filter(entry => JSON.stringify(entry?.props.style).includes('textDecorationLine'));
  assert.ok((underlined?.length ?? 0) > 0, 'a run of the line is underlined');
});

panelTest('a type error is underlined at the checker\'s range, marked in the gutter, counted, listed, and pressing it goes there', async (s) => {
  const { controller } = workspace(s).active;
  const at = lineOf(s, 'NICKNAME_MIN_LENGTH');
  s.control.nextCheck = () => ({
    kind: 'checked', serviceMs: 2,
    report: {
      diagnostics: [{ fileName: workspace(s).active.path, pos: at.offset + EDIT_HEADER.length, end: at.offset + EDIT_HEADER.length + 'NICKNAME_MIN_LENGTH'.length, code: 2322, category: 1, messageText: 'Type error here' }],
      filesLoaded: 1, incomplete: [], deepestStack: 0,
    },
  });
  controller.model.dispatch({ changes: { from: 0, insert: EDIT_HEADER } });
  await pause(SETTLE_MS);
  const shifted = lineOf(s, 'NICKNAME_MIN_LENGTH');
  const [diagnostic] = controller.diagnostics;
  assert.ok(diagnostic);
  assert.equal(controller.model.text.slice(diagnostic.from, diagnostic.to), 'NICKNAME_MIN_LENGTH', 'mapped onto the text it meant, one line down');
  assert.equal(diagnostic.from, shifted.offset);
  const style = runStyle(s, shifted.number, 'NICKNAME_MIN_LENGTH');
  assert.ok(style !== undefined && style.textDecorationLine === 'underline' && style.textDecorationColor === THEME.error, `underlined in the error colour: ${JSON.stringify(style)}`);
  assert.ok(has(s, `code-marker-${shifted.number}`));
  assert.equal(textOf(s, 'code-status-check'), '1 error');
  s.host.events.push(s.host.pointerEvent(tag(s, 'code-status-check'), 'click', {}));
  s.uiRoot.dispatchEvents();
  assert.match(textOf(s, 'code-problem-0'), new RegExp(`${shifted.number}:${shifted.column + 1}.*Type error here \\(TS2322\\)`, 'u'));
  s.host.events.push(s.host.pointerEvent(tag(s, 'code-problem-0'), 'click', {}));
  s.uiRoot.dispatchEvents();
  assert.equal(textOf(s, 'code-status-position'), `Ln ${shifted.number}, Col ${shifted.column + 1}`);
});

panelTest('an inlay hint is in the line, shifts the text after it, and a hover over a word says its type', async (s) => {
  const { controller } = workspace(s).active;
  const at = lineOf(s, 'Button');
  const nameEnd = at.offset + 'Button'.length;
  s.control.hints = [{ position: nameEnd, kind: 'type', label: ': string' }];
  s.control.hovers = [{ start: at.offset, end: nameEnd, name: 'Button', type: 'string' }];
  controller.model.dispatch({ changes: { from: controller.model.doc.length, insert: ' ' } });
  await pause(SETTLE_MS);
  const hint = runStyle(s, at.number, ': string');
  assert.ok(hint !== undefined, 'the hint is a run of the line');
  assert.equal(hint.color, THEME.inlayText);
  assert.equal(hint.width, Math.ceil(': string'.length * ADVANCE), 'a whole number of pixels, as wide as the hint is painted');
  // Hovering the name asks the checker, and shows the answer next to it.
  const over = pointAt(s, at.number, at.column + 2);
  s.host.events.push(s.host.pointerEvent(tag(s, 'code-content'), 'pointermove', { x: over.x + ADVANCE / 2, y: over.y }));
  s.uiRoot.dispatchEvents();
  assert.equal(has(s, 'code-hover'), false, 'nothing until the pointer has rested');
  await pause(HOVER_DELAY_MS + 100);
  assert.equal(textOf(s, 'code-hover-type'), 'Button: string');
  // The pointer leaving the code hides it.
  s.host.events.push(s.host.pointerEvent(tag(s, 'code-content'), 'pointerleave', { x: 1, y: 1 }));
  s.uiRoot.dispatchEvents();
  assert.equal(has(s, 'code-hover'), false, 'the tooltip goes when the pointer leaves');
  s.host.events.push(s.host.pointerEvent(tag(s, 'code-content'), 'pointermove', { x: over.x + ADVANCE / 2, y: over.y }));
  s.uiRoot.dispatchEvents();
  await pause(HOVER_DELAY_MS + 100);
  assert.ok(has(s, 'code-hover'), 'and it comes back when the pointer rests on a word again');
  // Typing hides it.
  s.host.type(s.uiRoot, 'x');
  assert.equal(has(s, 'code-hover'), false);
});

panelTest('undo, copy, cut and paste work from the keyboard, and the keys the editor handles are prevented', (s) => {
  const { controller } = workspace(s).active;
  controller.model.dispatch({ selection: { anchor: 0 } });
  s.host.type(s.uiRoot, 'XY');
  assert.equal(controller.model.text.startsWith('XY'), true);
  assert.equal(s.host.keyDown(s.uiRoot, 'z', { metaKey: true }).prevented, true);
  assert.equal(controller.model.text.startsWith('XY'), false, 'undo took the typing back');
  assert.equal(s.host.keyDown(s.uiRoot, 'z', { metaKey: true, shiftKey: true }).prevented, true);
  assert.equal(controller.model.text.startsWith('XY'), true, 'and redo put it back');
  controller.model.dispatch({ selection: { anchor: 0, head: 2 } });
  assert.equal(s.host.keyDown(s.uiRoot, 'c', { metaKey: true }).prevented, true);
  assert.equal(s.clipboard.text, 'XY', 'copy went to the clipboard port');
  assert.equal(s.host.keyDown(s.uiRoot, 'x', { metaKey: true }).prevented, true);
  assert.equal(controller.model.text.startsWith('XY'), false, 'cut removed it');
  assert.equal(s.clipboard.text, 'XY');
  assert.equal(s.host.keyDown(s.uiRoot, 'v', { metaKey: true }).prevented, false, 'paste is native\'s: the clipboard arrives as a beforeinput');
  s.host.edit(s.uiRoot, 'insertFromPaste', 'XY');
  assert.equal(controller.model.text.startsWith('XY'), true, 'and the paste went into the document');
  assert.equal(s.host.keyDown(s.uiRoot, 'ArrowRight').prevented, true);
  assert.equal(s.host.keyDown(s.uiRoot, 'a').prevented, false, 'a letter is for beforeinput');
  assert.equal(s.host.textInputs.get(tag(s, 'editor-input-sink'))?.value, SINK_TEXT, 'the input\'s buffer is still the one character');
  const rejected = s.host.beforeInputs.filter(entry => !entry.prevented);
  assert.deepEqual(rejected, [], 'every beforeinput was answered by preventing it');
});

panelTest('the caret is drawn only while the editor has the focus', (s) => {
  assert.ok(has(s, 'code-caret'));
  const sink = tag(s, 'editor-input-sink');
  s.host.events.push(s.host.focusEvent(sink, 'blur'));
  s.uiRoot.dispatchEvents();
  assert.equal(has(s, 'code-caret'), false);
  s.host.events.push(s.host.focusEvent(sink, 'focus'));
  s.uiRoot.dispatchEvents();
  assert.ok(has(s, 'code-caret'));
});

panelTest('only the lines near the viewport are elements, and scrolling moves the window', (s) => {
  const total = workspace(s).active.controller.lineCount;
  const first = s.host.findByTestId('code-line-1');
  assert.ok(first > 0);
  assert.equal(has(s, `code-line-${total}`), false, `line ${total} is far below the viewport`);
  const count = [...s.host.nodes.values()].filter(entry => entry.props.testID?.toString().startsWith('code-line-')).length;
  assert.ok(count <= Math.ceil(VIEWPORT.height / LINE_HEIGHT) + 14, `${count} lines are elements`);
  const state = s.host.scrollStatesByTestID.get('code-scroll');
  assert.ok(state);
  const scrolled = { ...state, scrollTop: (total - 10) * LINE_HEIGHT };
  s.host.scrollStatesByTestID.set('code-scroll', scrolled);
  s.host.events.push(s.host.scrollEvent(tag(s, 'code-scroll'), {
    scrollLeft: 0, scrollTop: scrolled.scrollTop, scrollWidth: scrolled.scrollWidth, scrollHeight: scrolled.scrollHeight,
    clientWidth: scrolled.clientWidth, clientHeight: scrolled.clientHeight,
  }));
  s.uiRoot.dispatchEvents();
  assert.ok(has(s, `code-line-${total}`), 'the last line is drawn once the window has moved');
  assert.equal(has(s, 'code-line-1'), false, 'and the first is not');
});

panelTest('a tap with a finger places the caret where it lifts and a finger going down does not select; the mouse press does', (s) => {
  const content = tag(s, 'code-content');
  const at = pointAt(s, 4, 6);
  const touch = { pointerType: 'touch' as const, pointerId: 7, x: at.x, y: at.y, viewportX: at.x, viewportY: at.y };
  s.host.pointersDown.add(7);
  s.host.events.push(s.host.pointerEvent(content, 'pointerdown', { ...touch, cancelable: true }));
  s.uiRoot.dispatchEvents();
  assert.equal(textOf(s, 'code-status-position'), 'Ln 1, Col 1', 'a finger going down moves nothing: it may be the start of a pan');
  s.host.events.push(s.host.pointerEvent(content, 'pointerup', touch));
  s.host.events.push(s.host.pointerEvent(content, 'click', { ...touch, detail: 1 }));
  s.host.pointersDown.delete(7);
  s.uiRoot.dispatchEvents();
  assert.equal(textOf(s, 'code-status-position'), 'Ln 4, Col 7', 'the tap that follows puts the caret at the column');
  assert.equal(s.host.focused, tag(s, 'editor-input-sink'), 'and the input has the focus, which brings the soft keyboard up');
});
