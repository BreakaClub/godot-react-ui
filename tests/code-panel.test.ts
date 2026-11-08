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
import { installMonospaceGeometry } from './monospace-text-geometry';
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
/** The advance of the demo's mono font at 12 px, as the text measures it (a 26.6 fixed point number). */
const ADVANCE = 7.203125;
const LINE_HEIGHT = 16;
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
  /** How many times React committed the panel (a `Profiler` round it): a render that bails out does not commit. */
  readonly renders: { count: number };
  readonly host: TextInputHost;
  readonly uiRoot: ReturnType<typeof createTestRoot>['root'];
  readonly code: LabCode;
  readonly clipboard: MemoryClipboard;
  readonly control: Control;
}

function mount(): Scenario {
  const host = new TextInputHost();
  host.rectsByTestID.set('editor-grid-probe', { x: 0, y: 0, width: 400 * ADVANCE, height: LINE_HEIGHT });
  installMonospaceGeometry(host, {
    advance: ADVANCE,
    lineHeight: LINE_HEIGHT,
    origin: (target) => {
      const node = host.nodes.get(target);
      const id = node?.props.testID;
      if (id === 'editor-grid-probe') return { x: 0, y: 0 };
      if (typeof id !== 'string' || !/^code-line-\d+$/u.test(id)) return undefined;
      const style = mergedStyle(node?.props.style);
      return { x: CONTENT.x + Number(style.left), y: CONTENT.y + Number(style.top) };
    },
  });
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
  const renders = { count: 0 };
  const panel = React.createElement(CodeEditor, { lab: lab(), code });
  uiRoot.render(React.createElement(
    View, null, React.createElement(View, { testID: 'stage' }, stage),
    React.createElement(React.Profiler, { id: 'code-panel', onRender: () => { renders.count += 1; } }, panel),
  ));
  const scroller = host.findByTestId('code-scroll');
  const state = host.scrollStatesByTestID.get('code-scroll');
  assert.ok(scroller > 0 && state !== undefined, 'the scroll container is mounted');
  host.scrollStates.set(scroller, state);
  return { renders, host, uiRoot, code, clipboard, control };
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

/** The longhands of a compiled style (its layers merged in order), or none for a node that has no style. */
function mergedStyle(style: unknown): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  if (typeof style !== 'object' || style === null || !('layers' in style) || !Array.isArray(style.layers)) return merged;
  for (const layer of style.layers) {
    if (typeof layer === 'object' && layer !== null && 'style' in layer && typeof layer.style === 'object' && layer.style !== null) Object.assign(merged, layer.style);
  }
  return merged;
}

function styleOf(s: Scenario, testID: string): Record<string, unknown> {
  const style = propsOf(s, testID).style;
  assert.ok(typeof style === 'object' && style !== null && 'layers' in style && Array.isArray(style.layers), `${testID} has a compiled style`);
  return mergedStyle(style);
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

panelTest('a typed character renders the panel once: no state is set to the value it already holds', (s) => {
  const type = (text: string): number => {
    const before = s.renders.count;
    s.host.type(s.uiRoot, text);
    return s.renders.count - before;
  };
  // The first keys settle what a mount leaves (the grid measured, the scroll read); after them a key is one render.
  type('a');
  type('b');
  assert.equal(type('c'), 1, 'a character is one render of the panel');
  assert.equal(type('d'), 1);
  const before = s.renders.count;
  const down = s.host.keyDown(s.uiRoot, 'Backspace');
  assert.equal(down.prevented, true, 'the editor handles Backspace on the key');
  assert.equal(s.renders.count - before, 1, 'and a Backspace is one render of the panel');
});

const KEYS_BEYOND_REACTS_NESTED_UPDATE_LIMIT = 120;

panelTest('a long burst of keys is rendered key by key: no key leaves an update pending for the scheduler, which cannot run inside a burst', (s) => {
  // React counts the commits in a row that leave a sync or default lane pending and throws at 50 (error 185). The verifier's `pressKey` sends a
  // key's presses with no frame between, so nothing but the burst's own commits runs: a state set to the value it holds, in an effect of every
  // key, left a default lane pending after each one.
  const sink = tag(s, 'editor-input-sink');
  const caretBefore = workspace(s).active.controller.model.state.selection.main.head;
  for (let key = 0; key < KEYS_BEYOND_REACTS_NESTED_UPDATE_LIMIT; key += 1) {
    s.host.events.push(s.host.keyEvent(sink, 'keydown', { key: 'ArrowRight', code: 'ArrowRight' }));
    s.host.events.push(s.host.keyEvent(sink, 'keyup', { key: 'ArrowRight', code: 'ArrowRight' }));
  }
  s.uiRoot.dispatchEvents();
  assert.equal(workspace(s).active.controller.model.state.selection.main.head, caretBefore + KEYS_BEYOND_REACTS_NESTED_UPDATE_LIMIT);
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

/** The `scrollTo` requests the editor has made of its scroll container since `since`. */
function scrollRequestsSince(s: Scenario, since: number): Array<{ x?: number; y?: number }> {
  const scroller = tag(s, 'code-scroll');
  return s.host.scrollRequests.slice(since).filter(request => request.method === 'scrollTo' && request.tag === scroller);
}

panelTest('a press gives the keyboard to the input only once it stands at the new caret: a focused input is scrolled into view, so one at the old caret would scroll the editor', (s) => {
  const sink = tag(s, 'editor-input-sink');
  const focused: Array<{ top: unknown; left: unknown }> = [];
  const focus = s.host.focusNode.bind(s.host);
  s.host.focusNode = (target, visible) => {
    if (target === sink) focused.push({ top: styleOf(s, 'editor-input-sink').top, left: styleOf(s, 'editor-input-sink').left });
    return focus(target, visible);
  };
  const line = 12;
  click(s, pointAt(s, line, 9));
  assert.equal(textOf(s, 'code-status-position'), `Ln ${line}, Col 10`);
  assert.ok(focused.length > 0, 'the press took the keyboard');
  const caret = styleOf(s, 'code-caret');
  for (const stood of focused) assert.deepEqual(stood, { top: caret.top, left: styleOf(s, 'editor-input-sink').left }, 'the input stood at the new caret when it was focused');
  assert.equal(caret.top, (line - 1) * LINE_HEIGHT);
  // The same press on the caret that is there, and a tap (a touch has no press: the click is what places the caret).
  const before = focused.length;
  click(s, pointAt(s, line, 9));
  assert.ok(focused.length > before, 'a press on the caret that is there takes the keyboard again');
});

panelTest('a press scrolls only to show a line that is partly in view, and only until it is whole: the lines near the edge of the view stay where they are', (s) => {
  const state = s.host.scrollStatesByTestID.get('code-scroll');
  assert.ok(state !== undefined);
  const visibleLines = state.clientHeight / LINE_HEIGHT;
  assert.equal(visibleLines, Math.floor(visibleLines), 'the test viewport holds whole lines');
  const since = s.host.scrollRequests.length;
  // The second line from the bottom used to scroll: the reveal kept two lines clear of the edge.
  for (const line of [3, 12, visibleLines - 2, visibleLines - 1, visibleLines]) {
    click(s, pointAt(s, line, 4));
    assert.equal(textOf(s, 'code-status-position').startsWith(`Ln ${line}, `), true, `the caret is on line ${line}`);
  }
  assert.deepEqual(scrollRequestsSince(s, since), [], 'a press on a line that is whole in view scrolls nothing, the second from the bottom and the last included');
  // The last line only partly in view is scrolled up by the part that is out, and no further.
  const PART_HIDDEN_PX = 8;
  s.host.scrollStatesByTestID.set('code-scroll', { ...state, clientHeight: state.clientHeight - PART_HIDDEN_PX });
  click(s, pointAt(s, visibleLines, 6));
  const requests = scrollRequestsSince(s, since);
  assert.equal(requests.length, 1, 'a press on a line that is cut off scrolls once');
  assert.equal(requests[0]?.y, PART_HIDDEN_PX, 'by the part of the line that was out of view');
});

panelTest('a key that moves the caret keeps two lines of context, as it did', (s) => {
  const state = s.host.scrollStatesByTestID.get('code-scroll');
  assert.ok(state !== undefined);
  const visibleLines = state.clientHeight / LINE_HEIGHT;
  const CONTEXT_LINES = 2;
  const since = s.host.scrollRequests.length;
  const down = (): void => { s.host.keyDown(s.uiRoot, 'ArrowDown'); };
  for (let line = 2; line <= visibleLines - CONTEXT_LINES; line += 1) down();
  assert.deepEqual(scrollRequestsSince(s, since), [], `down to line ${visibleLines - CONTEXT_LINES}, which keeps two lines below it`);
  down();
  const requests = scrollRequestsSince(s, since);
  assert.equal(requests.length, 1, 'the next line is within two of the edge, and scrolls');
  assert.equal(requests[0]?.y, (visibleLines - CONTEXT_LINES + 1) * LINE_HEIGHT + CONTEXT_LINES * LINE_HEIGHT - state.clientHeight);
});

panelTest('a drag over the lines at the edge of the view selects them and scrolls nothing: only a pointer beyond the edge scrolls', (s) => {
  const state = s.host.scrollStatesByTestID.get('code-scroll');
  assert.ok(state !== undefined);
  const visibleLines = state.clientHeight / LINE_HEIGHT;
  const content = tag(s, 'code-content');
  const since = s.host.scrollRequests.length;
  const from = pointAt(s, 5, 3);
  const down = s.host.pointerEvent(content, 'pointerdown', { ...from, viewportX: from.x, viewportY: from.y, cancelable: true, buttons: 1 });
  s.host.pointersDown.add(down.pointerId);
  s.host.events.push(down);
  s.uiRoot.dispatchEvents();
  for (const line of [10, visibleLines - 3, visibleLines - 1, visibleLines]) {
    const over = pointAt(s, line, 6);
    s.host.events.push(s.host.pointerEvent(content, 'pointermove', { ...over, viewportX: over.x, viewportY: over.y, buttons: 1 }));
    s.uiRoot.dispatchEvents();
  }
  s.host.events.push(s.host.pointerEvent(content, 'pointerup', { ...pointAt(s, visibleLines, 6) }));
  s.host.pointersDown.delete(down.pointerId);
  s.uiRoot.dispatchEvents();
  const { main } = workspace(s).active.controller.model.state.selection;
  const doc = workspace(s).active.controller.model.doc;
  assert.equal(doc.lineAt(main.head).number, visibleLines, 'the selection reached the last line');
  assert.equal(doc.lineAt(main.anchor).number, 5, 'from where the press was');
  assert.deepEqual(scrollRequestsSince(s, since), [], 'and nothing scrolled');
});

/** The number of the first blank line of the source, which a test types a line into. */
function blankLine(s: Scenario): number {
  const { doc } = workspace(s).active.controller.model;
  for (let number = 1; number <= doc.lines; number += 1) if (doc.line(number).length === 0) return number;
  throw new Error('the source has no blank line');
}

panelTest('a press on a line on the grid asks the text nothing: the grid is exact there', (s) => {
  const queries = s.host.textQueries.length;
  const at = pointAt(s, 4, 9);
  click(s, at);
  assert.equal(textOf(s, 'code-status-position'), 'Ln 4, Col 10');
  assert.equal(s.host.textQueries.slice(queries).filter(query => query.method === 'getOffsetAtPoint').length, 0, 'no hit test of the text');
  assert.equal(s.host.textQueries.slice(queries).filter(query => query.method === 'getCaretRect' && query.tag === tag(s, 'code-line-4')).length, 0, 'no caret query of the line');
});

panelTest('a line with wide characters is placed by its text: the caret, the press and the word under the pointer are where the text says', async (s) => {
  const { controller } = workspace(s).active;
  const number = blankLine(s);
  const lineStart = controller.model.doc.line(number).from;
  const WIDE_LINE = '// \u65e5\u672c\u8a9e \u{1F600} ok';
  controller.model.dispatch({ changes: { from: lineStart, insert: WIDE_LINE }, selection: { anchor: lineStart + WIDE_LINE.length } });
  assert.equal(controller.layoutOf(number).onGrid, false);
  await pause(0);
  const gutter = gutterWidthFor(controller.lineCount, ADVANCE);
  // The text's columns: `// ` is 3, each of the three CJK characters 2, so the offset after the first two (5) is at column 7.
  const wideEnd = '// \u65e5\u672c'.length;
  const columnsBeforeWide = 3 + 2 * 2;
  click(s, { x: CONTENT.x + gutter + columnsBeforeWide * ADVANCE, y: CONTENT.y + (number - 1) * LINE_HEIGHT + LINE_HEIGHT / 2 });
  assert.equal(controller.model.state.selection.main.head, lineStart + wideEnd, 'a press between the second and third characters lands there');
  assert.equal(textOf(s, 'code-status-position'), `Ln ${number}, Col ${wideEnd + 1}`);
  const caret = styleOf(s, 'code-caret');
  assert.ok(Math.abs(Number(caret.left) - (gutter + columnsBeforeWide * ADVANCE)) <= 0.01, `the caret is where the text puts offset ${wideEnd}: ${String(caret.left)}, not at column ${wideEnd}`);
  assert.ok(Math.abs(Number(caret.left) - (gutter + wideEnd * ADVANCE)) > ADVANCE, 'which is not the grid\'s');
  const sink = styleOf(s, 'editor-input-sink');
  assert.equal(sink.left, caret.left, 'and the input is there too, for the IME');
  // The end of the line: the emoji is two code units and two columns, and a caret is never between them.
  controller.model.dispatch({ selection: { anchor: lineStart + WIDE_LINE.length } });
  await pause(0);
  const end = styleOf(s, 'code-caret');
  const endColumns = 3 + 3 * 2 + 1 + 2 + ' ok'.length;
  assert.ok(Math.abs(Number(end.left) - (gutter + endColumns * ADVANCE)) <= 0.01, `the caret at the end of the line is after ${endColumns} columns: ${String(end.left)}`);
  // The word under the pointer comes from the text too: over the CJK characters, not at the column the grid would say.
  const over = { x: CONTENT.x + gutter + (3 + 2 + 1) * ADVANCE, y: CONTENT.y + (number - 1) * LINE_HEIGHT + LINE_HEIGHT / 2 };
  s.control.hovers = [{ start: lineStart + 3, end: lineStart + 6, name: 'wide', type: 'string' }];
  s.host.events.push(s.host.pointerEvent(tag(s, 'code-content'), 'pointermove', over));
  s.uiRoot.dispatchEvents();
  await pause(HOVER_DELAY_MS + 100);
  assert.equal(textOf(s, 'code-hover-type'), 'wide: string', 'the hover is of the word the pointer is over');
});

panelTest('a double click selects a word and the selection is drawn on the line', (s) => {
  const first = workspace(s).active.controller.model.doc.line(1).text;
  const start = first.indexOf('import') + 1;
  click(s, pointAt(s, 1, start + 2), { count: 2 });
  const { main } = workspace(s).active.controller.model.state.selection;
  assert.equal(workspace(s).active.controller.model.state.sliceDoc(main.from, main.to), 'import');
  const selected = spansOf(s, 1).filter(span => String(span.style.backgroundColor).startsWith(THEME.selection.slice(0, 7)));
  assert.deepEqual(selected.map(span => span.text), ['import'], 'the word is a span of the line with the selection colour behind it');
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

/** A span of a line: the text it covers (empty for an inlay), the text it shows if it is an inlay, and its style longhands. */
interface SpanOfLine {
  readonly text: string;
  readonly inlay: string | undefined;
  readonly style: Record<string, unknown>;
}

/** The spans of the one `Text` that is line `number`: the line is a single node, and its text is the document's line without any hint. */
function spansOf(s: Scenario, number: number): SpanOfLine[] {
  const row = s.host.nodes.get(tag(s, `code-line-${number}`));
  assert.ok(row && row.kind === 'text', `line ${number} is one Text`);
  assert.deepEqual(row.children, [], 'with no node in it: what it is made of is spans');
  const { spans } = row.props;
  assert.ok(Array.isArray(spans), `line ${number} has spans`);
  return spans.map((span: unknown) => {
    assert.ok(typeof span === 'object' && span !== null && 'start' in span && 'end' in span && typeof span.start === 'number' && typeof span.end === 'number');
    const inlay = 'inlay' in span && typeof span.inlay === 'string' ? span.inlay : undefined;
    const style = 'style' in span && typeof span.style === 'object' && span.style !== null ? { ...span.style } : {};
    return { text: row.text.slice(span.start, span.end), inlay, style };
  });
}

/** The style of the span of line `number` that covers `text`, or undefined. */
function runStyle(s: Scenario, number: number, text: string): Record<string, unknown> | undefined {
  return spansOf(s, number).find(span => span.inlay === undefined && span.text === text)?.style;
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
  const underlined = spansOf(s, line.number).filter(span => span.style.textDecorationLine === 'underline');
  assert.ok(underlined.length > 0, 'a span of the line is underlined');
  assert.ok(underlined.every(span => span.style.textDecorationStyle === 'wavy'), 'wavy, as a compiler\'s mark is');
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
  assert.ok(
    style !== undefined && style.textDecorationLine === 'underline' && style.textDecorationStyle === 'wavy' && style.textDecorationColor === THEME.error,
    `underlined wavy in the error colour: ${JSON.stringify(style)}`,
  );
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
  const hint = spansOf(s, at.number).find(span => span.inlay === ': string');
  assert.ok(hint !== undefined, 'the hint is an inlay span of the line');
  assert.equal(hint.style.color, THEME.inlayText);
  assert.equal(hint.text, '', 'it is not part of the line\'s text');
  assert.equal(textOf(s, `code-line-${at.number}`), controller.model.doc.line(at.number).text, 'which is the document\'s line');
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
