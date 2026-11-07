import {
  Color, Engine, FileAccess, Image, InputEventKey, InputEventMouseButton, Key, MouseButton, MouseButtonMask, Node, OS, Time, Vector2,
} from 'godot';
import type { LayoutRect, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import type { RendererProfile } from '../../src/profile';
import type { NativeProfile } from '../../src/native';
import { TYPE_ERROR, anchorOffset, applyEdits } from '../../scripts/live-compile-edits.mjs';
import { GLYPH_POSITION_STEP_PX } from './editor/font-grid';
import type { NavigatorOptions } from './main';
import { assertionTally, parseVerifierEvent, verifierClipboard } from './verifier-input';
import { grab, settleFrames } from './verify-filters';
import { click, drag, move, typeText } from './verify-text-input';

/**
 * The `code-editor` section of the interaction verifier (docs/tracks/code-editor.md): the lab navigator's code panel in a real window,
 * driven by injected pointer and key events, reading the page back from the snapshot and the pixels.
 *
 * - The grid is measured, not assumed: every run of a line stands at its column times the advance the probe measured.
 * - A press puts the caret at the column under the pointer, within a pixel; a drag selects (the selection is in the raster), a double
 *   click selects a word, a triple click a line; Shift extends; the wheel and Page Down scroll the window of lines.
 * - Typing edits the text, and the lab on the stage changes with it: a new background class reaches the pixels and a counter keeps its
 *   count. A syntax error leaves the last good page and says so; a type error is underlined where `tsc` puts it, listed and counted;
 *   an inlay hint and a hover come from the type checker.
 * - Undo, copy, cut and paste work through the clipboard (the verifier's, in memory).
 * - Budgets: a window of lines mounts quickly, a keystroke is one small commit, and an editor with the panel open and unfocused asks
 *   for no frames.
 *
 * Needs the live-compile extension (`node scripts/build-live-compile.mjs`): the driver refuses a stale one before it opens a window.
 * In a window narrower than the `md` breakpoint (the portrait window) the Code button is not offered, and the section checks that.
 */
export interface CodeEditorInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showNavigator(options?: NavigatorOptions): void;
  restoreDemo(): void;
  surfaceProcessing(): boolean;
  /** Scroll a scroll container to `top` through the programmatic path. */
  scrollTo(testID: string, top: number): void;
  profile(enabled: boolean): void;
  takeProfile(): { js: RendererProfile; native: NativeProfile };
}

export type CodeEditorCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

/**
 * What a capture does not hold to the window: the Controls lab's slider thumb, drawn past its track by design, and the grid probe, an
 * invisible line of 400 columns that the editor measures its font with.
 */
const OVERFLOWING = ['inputs-slider-thumb', 'editor-grid-probe'];
/** Typed at the end of a statement: not a statement. (A stray `}` in JSX text is not a syntax error to Bun's parser: it compiles and throws when the page renders.) */
const SYNTAX_JUNK = ' = = ;';
/** A run's style that sets an underline (a run that sets none has the key with `none`, or not at all). */
const UNDERLINED = /"textDecorationLine":\s*"underline"/u;
/** A comment typed into the blank third line of the source: an edit that changes no behaviour. */
const NOTE = '// note';
const LAB_ID = 'inputs';
const LAB_SOURCE = 'res://src/inputs-lab.tsx';
/** `md:` (README: Styles): from here the Code button is offered. */
const PHONE_BREAKPOINT_PX = 768;
const FRAME_POLL_MS = 1;
const DEADLINE_MS = 6_000;
/** How far a caret may stray from the pixel of its column. */
const COLUMN_TOLERANCE_PX = 1;
/** The probe's width in columns (`view/grid-probe.tsx`). */
const PROBE_COLUMNS = 400;
/** Character codes of the keys `injectCharacter` gives a keycode: the digits and the capital letters. */
const DIGIT_ZERO = 0x30;
const DIGIT_NINE = 0x39;
const LETTER_A = 0x41;
const LETTER_Z = 0x5a;
/** A line shorter than this is a short line, and a press this many columns in is far past its end and still inside the panel. */
const SHORT_LINE_COLUMNS = 30;
const PAST_THE_END_COLUMN = 60;
/** A held drag this far below the code scrolls it; it has scrolled once it has moved this far. */
const AUTOSCROLL_OVERSHOOT_PX = 40;
const AUTOSCROLL_MIN_PX = 40;
const AUTOSCROLL_HOLD_FRAMES = 12;
/** Lines in view are about a dozen; a selection past this line has been carried by the scrolling. */
const AUTOSCROLL_PAST_LINE = 14;
/** Longer than the click-count interval (500 ms): the next press begins a new sequence. */
const CLICK_SEQUENCE_PAUSE_MS = 650;
const CLICK_PAUSE_FRAMES = 3;
/** The probe sits this far inside the page's top left corner, where only its background is (the page pads its content by 24). */
const PAGE_PROBE_INSET_PX = 6;
const PAGE_BACKGROUND_ORIGINAL = '#f8fafc';
/** The colour of an inlay hint's text (`editor/theme.ts`). */
const INLAY_COLOUR = '#8aa0bd';
/** The selection colour without its alpha (`editor/theme.ts`). */
const SELECTION_BOX_PREFIX = '#2563eb';
/** The theme's caret (`editor/theme.ts`). */
const CARET_COLOUR = '#60a5fa';
const EMERALD_100 = '#d1fae5';
const LEVELS = 255;
const COLOUR_TOLERANCE_LEVELS = 4;
const MILLISECONDS_PER_MICROSECOND = 1000;
const TENTH = 10;
const MEDIAN = 0.5;
const PERCENTILE_95 = 0.95;
/** A hover is asked for after this long (view/hover.ts); the section waits this and a little more. */
const HOVER_WAIT_MS = 700;
/** Updates are sent after a pause of this long (editor/workspace.ts); the section waits for them. */
const UPDATE_DEADLINE_MS = 4_000;
const WHEEL_TICKS = 6;
const IDLE_SAMPLES = 8;
const IDLE_SAMPLE_MS = 250;
/** Budgets. They are generous for a starved machine; `docs/tracks/code-editor.md` has what was measured. */
const MOUNT_BUDGET_MS = 1_500;
const COMMIT_CHARS_PER_KEYSTROKE_BUDGET = 3_000;
const WINDOW_NODE_BUDGET = 900;
const KEY_TO_INK_P95_BUDGET_MS = 300;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

function nowMs(): number {
  return Time.getTicksUsec() / MILLISECONDS_PER_MICROSECOND;
}

function round(value: number, scale: number): number {
  return Math.round(value * scale) / scale;
}

function percentile(values: readonly number[], share: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const found = sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1))];
  assert(found !== undefined, 'There are no samples');
  return found;
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function node(api: CodeEditorInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

function centerOf(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

/** The text of an element: its own, or its descendants' in order. */
function textOf(api: CodeEditorInspection, testID: string): string {
  const snapshot = api.snapshot();
  const byId = new Map(snapshot.nodes.map(entry => [entry.id, entry]));
  const collect = (entry: NativeSnapshotNode): string => (entry.text !== '' ? entry.text : entry.children.map(id => byId.get(id)).map(child => (child === undefined ? '' : collect(child))).join(''));
  return collect(node(api, testID));
}

function hasNode(api: CodeEditorInspection, testID: string): boolean {
  return api.find(testID) !== undefined;
}

async function waitUntil(what: string, predicate: () => boolean, deadlineMs = DEADLINE_MS, describe: () => string = () => ''): Promise<number> {
  const started = nowMs();
  while (!predicate()) {
    assert(nowMs() - started < deadlineMs, `Timed out after ${deadlineMs} ms waiting for ${what}. ${describe()}`);
    await frames(1);
  }
  return nowMs() - started;
}

// ---- Input -----------------------------------------------------------------------------------------------------------------------

interface Modifiers {
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly ctrl?: boolean;
  readonly meta?: boolean;
}

/** The key of a character that is typed, pressed and released in one go, as `typeText` does it but without waiting for a frame afterwards. */
function injectCharacter(character: string): void {
  const code = character.toUpperCase().codePointAt(0) ?? 0;
  const letterOrDigit = (code >= DIGIT_ZERO && code <= DIGIT_NINE) || (code >= LETTER_A && code <= LETTER_Z);
  for (const pressed of [true, false]) {
    const event = new InputEventKey();
    event.keycode = letterOrDigit ? code : Key.KeyNone;
    event.physicalKeycode = event.keycode;
    event.unicode = character.codePointAt(0) ?? 0;
    event.pressed = pressed;
    parseVerifierEvent(event);
  }
}

function leftButton(position: Vector2, pressed: boolean): void {
  const event = new InputEventMouseButton();
  event.position = position;
  event.globalPosition = position;
  event.buttonIndex = MouseButton.MouseButtonLeft;
  event.pressed = pressed;
  event.buttonMask = pressed ? MouseButtonMask.MouseButtonMaskLeft : 0;
  parseVerifierEvent(event);
}

function keyEvent(keycode: Key, pressed: boolean, modifiers: Modifiers): void {
  const event = new InputEventKey();
  event.keycode = keycode;
  event.physicalKeycode = keycode;
  event.keyLabel = keycode;
  event.pressed = pressed;
  event.shiftPressed = modifiers.shift === true;
  event.altPressed = modifiers.alt === true;
  event.ctrlPressed = modifiers.ctrl === true;
  event.metaPressed = modifiers.meta === true;
  parseVerifierEvent(event);
}

/** Press and release a key with modifiers, `times` times. */
/** Scrolls the code to the top through the programmatic path, so that positions given as lines count from the first. */
async function toTop(api: CodeEditorInspection): Promise<void> {
  api.scrollTo('code-scroll', 0);
  await settleFrames();
  assert(scrollTopOf(api) === 0, 'The code is at the top');
}

async function pressKey(keycode: Key, modifiers: Modifiers = {}, times = 1): Promise<void> {
  for (let count = 0; count < times; count += 1) {
    keyEvent(keycode, true, modifiers);
    keyEvent(keycode, false, modifiers);
  }
  await settleFrames();
}

/** One wheel tick at `position`, `ticks` times. */
async function wheel(position: Vector2, down: boolean, ticks: number): Promise<void> {
  move(position);
  await settleFrames();
  for (let tick = 0; tick < ticks; tick += 1) {
    for (const pressed of [true, false]) {
      const event = new InputEventMouseButton();
      event.position = position;
      event.globalPosition = position;
      event.buttonIndex = down ? MouseButton.MouseButtonWheelDown : MouseButton.MouseButtonWheelUp;
      event.pressed = pressed;
      parseVerifierEvent(event);
    }
  }
  await settleFrames();
}

// ---- Reading the editor back -------------------------------------------------------------------------------------------------------

interface Grid {
  readonly advance: number;
  readonly lineHeight: number;
  readonly gutterWidth: number;
}

function gridOf(api: CodeEditorInspection): Grid {
  const probe = node(api, 'editor-grid-probe').rect;
  // The editor takes the measured advance to the step glyphs are placed at (view/grid-probe.tsx); the grid it draws on is that one.
  return { advance: Math.round(probe.width / PROBE_COLUMNS / GLYPH_POSITION_STEP_PX) * GLYPH_POSITION_STEP_PX, lineHeight: probe.height, gutterWidth: node(api, 'code-gutter').rect.width };
}

/** The root-local point of the caret boundary at (`line`, `column`): the content's origin moves when the editor scrolls, and is read now. */
function boundaryAt(api: CodeEditorInspection, line: number, column: number): Vector2 {
  const grid = gridOf(api);
  const content = node(api, 'code-content').rect;
  return new Vector2(content.x + grid.gutterWidth + column * grid.advance, content.y + (line - 1) * grid.lineHeight + grid.lineHeight / 2);
}

function rowOf(api: CodeEditorInspection, line: number): NativeSnapshotNode | undefined {
  return api.find(`code-line-${line}`);
}

/** The text of line `line` as the editor draws it, or undefined when the line is not among the elements. */
function lineText(api: CodeEditorInspection, line: number): string | undefined {
  return hasNode(api, `code-line-${line}`) ? textOf(api, `code-line-${line}`) : undefined;
}

/** The text of the line without its inlay hints, which are drawn in the line but are not in the source. */
function sourceTextOfDrawnLine(api: CodeEditorInspection, line: number): string {
  const row = rowOf(api, line);
  assert(row !== undefined, `Line ${line} is drawn`);
  return childrenOf(api, row).filter(run => run.presentation.color.slice(0, INLAY_COLOUR.length).toLowerCase() !== INLAY_COLOUR).map(run => run.text).join('');
}

function childrenOf(api: CodeEditorInspection, entry: NativeSnapshotNode): NativeSnapshotNode[] {
  const byId = new Map(api.snapshot().nodes.map(candidate => [candidate.id, candidate]));
  return entry.children.map(id => byId.get(id)).filter((child): child is NativeSnapshotNode => child !== undefined);
}

interface Position {
  readonly line: number;
  readonly column: number;
}

function positionOf(text: string, needle: string, occurrence = 0): Position {
  let offset = -1;
  for (let count = 0; count <= occurrence; count += 1) {
    offset = text.indexOf(needle, offset + 1);
    assert(offset >= 0, `The source has no ${JSON.stringify(needle)} (occurrence ${occurrence})`);
  }
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  return { line, column: offset - (before.lastIndexOf('\n') + 1) };
}

function statusPosition(api: CodeEditorInspection): Position {
  const match = /^Ln (\d+), Col (\d+)/u.exec(textOf(api, 'code-status-position'));
  assert(match, `The status bar has a position: ${textOf(api, 'code-status-position')}`);
  return { line: Number(match[1]), column: Number(match[2]) - 1 };
}

function scrollTopOf(api: CodeEditorInspection): number {
  return node(api, 'code-scroll').scroll?.scrollTop ?? 0;
}

function caretRect(api: CodeEditorInspection): LayoutRect {
  return node(api, 'code-caret').rect;
}

/** The lines of the editor that are elements now, with their text. */
function drawnLines(api: CodeEditorInspection): Map<number, string> {
  const found = new Map<number, string>();
  for (const entry of api.snapshot().nodes) {
    const match = /^code-line-(\d+)$/u.exec(String(entry.props.testID ?? ''));
    if (match === null) continue;
    found.set(Number(match[1]), textOf(api, String(entry.props.testID)));
  }
  return found;
}

// ---- Pixels ---------------------------------------------------------------------------------------------------------------------------

function levels(color: Color): [number, number, number] {
  return [Math.round(color.r * LEVELS), Math.round(color.g * LEVELS), Math.round(color.b * LEVELS)];
}

function hexLevels(hex: string): [number, number, number] {
  return [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];
}

function near(painted: readonly number[], wanted: readonly number[], tolerance = COLOUR_TOLERANCE_LEVELS): boolean {
  return painted.every((level, index) => Math.abs(level - (wanted[index] ?? 0)) <= tolerance);
}

function pixelAt(owner: Node, api: CodeEditorInspection, x: number, y: number): [number, number, number] {
  const image: Image = grab(owner);
  const ratio = image.getWidth() / api.snapshot().width;
  return levels(image.getPixel(Math.round(x * ratio), Math.round(y * ratio)));
}

/** `colour` laid over `background` with `alpha`, in 8-bit levels. */
function blend(colour: string, alpha: number, background: string): [number, number, number] {
  const over = hexLevels(colour);
  const under = hexLevels(background);
  return [0, 1, 2].map(index => Math.round((under[index] ?? 0) + ((over[index] ?? 0) - (under[index] ?? 0)) * alpha)) as [number, number, number];
}

/** The page's own paint, in its top left corner: the stage's scrollbar is at the right edge, and the page pads its content. */
function pageBackground(owner: Node, api: CodeEditorInspection): [number, number, number] {
  const page = node(api, 'inputs-lab').rect;
  return pixelAt(owner, api, page.x + PAGE_PROBE_INSET_PX, page.y + PAGE_PROBE_INSET_PX);
}

// ---- The section ---------------------------------------------------------------------------------------------------------------------------

/**
 * What a build without the compiler shows: the code, read-only, and the reason in words in two places. It can be selected and copied
 * and nothing typed changes it; the page on the stage is the lab as the bundle has it.
 */
async function verifyReadOnly(api: CodeEditorInspection, source: string, command: Modifiers): Promise<void> {
  const sourceLines = source.split('\n');
  const banner = textOf(api, 'code-read-only');
  assert(/^Read-only\. /u.test(banner) && banner.length > 'Read-only. '.length, `The panel says plainly why it is read-only: ${banner}`);
  assert(/^Read-only\. Live compile is not available: /u.test(textOf(api, 'code-status-run')), `and so does the status bar: ${textOf(api, 'code-status-run')}`);
  assert(!hasNode(api, 'code-reset'), 'There is no Reset: nothing was changed');
  assert(lineText(api, 1) === sourceLines[0], 'The code is shown');
  assert(hasNode(api, 'inputs-lab'), 'and the lab on the stage is the bundle\'s');
  await click(centerOf(node(api, 'code-line-1').rect));
  await typeText('zzz');
  assert(lineText(api, 1) === sourceLines[0], `Typing changes nothing: ${lineText(api, 1)}`);
  await click(centerOf(node(api, 'code-line-1').rect), 2);
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get().length > 0 && sourceLines[0]?.includes(verifierClipboard.get()) === true, `A word can be copied: ${JSON.stringify(verifierClipboard.get())}`);
  console.log('GODOT_REACT_CODE_EDITOR', JSON.stringify({ readOnly: true, banner }));
  api.restoreDemo();
  await settleFrames();
}

export async function verifyCodeEditor(owner: Node, api: CodeEditorInspection, capture: CodeEditorCapture): Promise<void> {
  const facts: Record<string, unknown> = {};
  const mac = OS.hasFeature('macos');
  const command: Modifiers = mac ? { meta: true } : { ctrl: true };
  const wordJump: Modifiers = mac ? { alt: true } : { ctrl: true };
  const source = FileAccess.getFileAsString(LAB_SOURCE);
  assert(source.length > 0, `The source ${LAB_SOURCE} is in the build`);
  const sourceLines = source.split('\n');

  // ---- The Code button, and where it is not offered -------------------------------------------------------------------------------
  api.showNavigator({ initialLab: LAB_ID });
  await settleFrames();
  if (api.snapshot().width < PHONE_BREAKPOINT_PX) {
    // The button is in the tree with `display: none` below `md` (`hidden md:flex`), so it has no size.
    const hidden = api.find('toggle-code');
    assert(hidden === undefined || (hidden.rect.width === 0 && hidden.rect.height === 0), 'A window narrower than 768 logical pixels has no room for the page and its code together, so it shows no Code button');
    api.restoreDemo();
    await settleFrames();
    console.log('GODOT_REACT_CODE_EDITOR', JSON.stringify({ phoneWindow: true }));
    return;
  }
  assert((api.find('toggle-code')?.rect.width ?? 0) > 0 && !hasNode(api, 'code-editor'), 'The Code button is in the header and the panel is closed');
  const pageBefore = textOf(api, 'inputs-lab');
  const stageBefore = node(api, 'lab-stage').rect;

  // ---- Opening the panel: the page becomes the live one and the window of lines mounts -------------------------------------------------
  api.profile(true);
  api.takeProfile();
  const toggle = centerOf(node(api, 'toggle-code').rect);
  move(toggle);
  await settleFrames();
  const openedAt = nowMs();
  leftButton(toggle, true);
  leftButton(toggle, false);
  await waitUntil('the first line of code', () => hasNode(api, 'code-line-1'));
  if (hasNode(api, 'code-read-only')) {
    await verifyReadOnly(api, source, command);
    return;
  }
  await waitUntil('the caret', () => hasNode(api, 'code-caret'));
  const mountMs = nowMs() - openedAt;
  facts.mountMs = round(mountMs, TENTH);
  assert(mountMs <= MOUNT_BUDGET_MS, `The panel mounts within ${MOUNT_BUDGET_MS} ms: ${round(mountMs, TENTH)}`);
  await settleFrames();
  const mountProfile = api.takeProfile().js;
  const mountedNodes = api.snapshot().nodes.filter(entry => String(entry.props.testID ?? '').startsWith('code-')).length;
  facts.mountCommits = mountProfile.counters;
  facts.panelNodes = api.snapshot().nodes.length;
  assert(api.snapshot().nodes.length < WINDOW_NODE_BUDGET, `The whole page with its code panel is under ${WINDOW_NODE_BUDGET} nodes: ${api.snapshot().nodes.length}`);
  assert(mountedNodes > 0, 'The panel has nodes');
  assert(textOf(api, 'inputs-lab') === pageBefore, 'The lab on the stage is the live session\'s and reads as the bundled lab did');
  assert(node(api, 'code-editor').rect.width > 0 && node(api, 'code-editor').rect.y > node(api, 'lab-stage').rect.y, 'The panel sits beside the stage');
  assert(node(api, 'lab-stage').rect.height < stageBefore.height, `The stage gave room to the panel: ${stageBefore.height} to ${node(api, 'lab-stage').rect.height}`);
  assert(textOf(api, 'code-status-run').startsWith('Live.'), `The status bar says the page is live, not just "Ready": ${textOf(api, 'code-status-run')}`);
  assert(api.snapshot().focused === node(api, 'editor-input-sink').id, 'The input has the focus, so typing works at once');
  assert(lineText(api, 1) === sourceLines[0], `The first line is the source's: ${lineText(api, 1)}`);
  await capture('code-editor-01-open', OVERFLOWING);

  // ---- The grid is measured, and every run stands at its column ------------------------------------------------------------------------------
  const grid = gridOf(api);
  facts.grid = { advance: round(grid.advance, 1000), lineHeight: grid.lineHeight, gutterWidth: grid.gutterWidth };
  assert(grid.advance > 4 && grid.advance < 16, `The advance is a monospace advance: ${grid.advance}`);
  const content = node(api, 'code-content').rect;
  const row1 = node(api, 'code-line-1').rect;
  const row2 = node(api, 'code-line-2').rect;
  assert(Math.abs(row2.y - row1.y - grid.lineHeight) <= COLUMN_TOLERANCE_PX, `Lines stand a line height apart: ${row2.y - row1.y} against ${grid.lineHeight}`);
  assert(Math.abs(row1.x - (content.x + grid.gutterWidth)) <= COLUMN_TOLERANCE_PX, 'A line starts where the gutter ends');
  let checkedRuns = 0;
  for (let line = 1; line <= 12; line += 1) {
    const row = rowOf(api, line);
    assert(row !== undefined, `Line ${line} is drawn`);
    let column = 0;
    for (const run of childrenOf(api, row)) {
      if (run.text === '') continue;
      const wanted = content.x + grid.gutterWidth + column * grid.advance;
      assert(Math.abs(run.rect.x - wanted) <= COLUMN_TOLERANCE_PX, `Line ${line} column ${column} ("${run.text}") is at ${run.rect.x}, the grid says ${wanted}`);
      column += run.text.length;
      checkedRuns += 1;
    }
    assert(column === (sourceLines[line - 1] ?? '').length, `Line ${line}'s runs add up to the line: ${column}`);
  }
  facts.checkedRuns = checkedRuns;

  // ---- A press puts the caret at the column, within a pixel ------------------------------------------------------------------------------------------
  const caretChecks: { line: number; column: number; caretX: number; wantedX: number }[] = [];
  // A line much shorter than the panel is wide, pressed on far to the right of its end: the caret goes to its end.
  const shortLine = sourceLines.findIndex((text, index) => index >= 2 && index < 20 && text.length > 5 && text.length < SHORT_LINE_COLUMNS) + 1;
  assert(shortLine > 0, 'The first lines of the source include a short one');
  for (const [line, column] of [[3, 0], [3, 1], [4, 7], [5, 20], [7, 33], [shortLine, PAST_THE_END_COLUMN]] as const) {
    const lineLength = (sourceLines[line - 1] ?? '').length;
    const landed = Math.min(column, lineLength);
    const at = boundaryAt(api, line, column);
    // A press a little to the left of the boundary lands on it, as does one a little to the right: the nearest boundary.
    await click(new Vector2(at.x + (column % 2 === 0 ? 1 : -1) * grid.advance * 0.3, at.y));
    assert(statusPosition(api).line === line && statusPosition(api).column === landed, `A press at (${line}, ${column}) puts the caret at column ${landed}: ${textOf(api, 'code-status-position')}`);
    const wantedX = content.x + grid.gutterWidth + landed * grid.advance;
    const caret = caretRect(api);
    assert(Math.abs(caret.x - wantedX) <= COLUMN_TOLERANCE_PX, `The caret is at the pixel of its column: ${caret.x} against ${wantedX}`);
    assert(Math.abs(caret.y - (node(api, `code-line-${line}`).rect.y)) <= COLUMN_TOLERANCE_PX, 'and on its line');
    caretChecks.push({ line, column: landed, caretX: round(caret.x, TENTH), wantedX: round(wantedX, TENTH) });
  }
  facts.caretChecks = caretChecks;
  // The caret in the raster: in the blue of the theme while it is on (it blinks, and a press has just restarted it).
  await waitUntil('the caret to be on', () => node(api, 'code-caret').presentation.opacity === 1);
  const caret = caretRect(api);
  const caretPixel = pixelAt(owner, api, caret.x + caret.width / 2, caret.y + caret.height / 2);
  assert(near(caretPixel, hexLevels(CARET_COLOUR)), `The caret is drawn in the theme's colour: ${caretPixel.join(',')}`);

  // ---- A drag selects, the selection is in the raster, and the clipboard has it -------------------------------------------------------------------
  const from = boundaryAt(api, 4, 2);
  const to = boundaryAt(api, 6, 10);
  await drag(from, to);
  const dragged = sourceLines.slice(3, 6);
  const expectedDrag = `${(dragged[0] ?? '').slice(2)}\n${dragged[1] ?? ''}\n${(dragged[2] ?? '').slice(0, 10)}`;
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get() === expectedDrag, `The dragged text is the clipboard's after Copy: ${JSON.stringify(verifierClipboard.get())} against ${JSON.stringify(expectedDrag)}`);
  const selectionColour = blend('#2563eb', 0x77 / LEVELS, '#0f172a');
  const middle = node(api, 'code-line-5');
  // The selection of a line is a box of its own under the text, as wide as the columns it covers.
  const middleRun = childrenOf(api, middle).find(box => box.text === '' && box.presentation.backgroundColor.slice(0, SELECTION_BOX_PREFIX.length).toLowerCase() === SELECTION_BOX_PREFIX);
  assert(middleRun !== undefined, 'A line in the middle of the selection has a selection box');
  assert(near(pixelAt(owner, api, middleRun.rect.x + 1, middleRun.rect.y + 1), selectionColour), `The selection is in the raster: ${pixelAt(owner, api, middleRun.rect.x + 1, middleRun.rect.y + 1).join(',')} against ${selectionColour.join(',')}`);
  assert(statusPosition(api).line === 6 && statusPosition(api).column === 10, 'The caret is at the end of the drag');
  await capture('code-editor-02-selection', OVERFLOWING);

  // ---- Double click selects a word, triple click a line, Shift+click extends -------------------------------------------------------------------------------
  const wordAt = positionOf(source, 'useState');
  await click(boundaryAt(api, wordAt.line, wordAt.column + 3), 2);
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get() === 'useState', `A double click selects the word: ${JSON.stringify(verifierClipboard.get())}`);
  await click(boundaryAt(api, wordAt.line, wordAt.column + 3), 3);
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get() === `${sourceLines[wordAt.line - 1]}\n`, `A triple click selects the line: ${JSON.stringify(verifierClipboard.get())}`);
  const shiftLine = 6;
  assert((sourceLines[shiftLine - 1] ?? '').length > 12, 'The line the Shift+click is on has text');
  await click(boundaryAt(api, shiftLine, 2));
  await click(boundaryAt(api, shiftLine, 9), 1, { shift: true });
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get() === (sourceLines[shiftLine - 1] ?? '').slice(2, 9), `Shift+click extends from the caret: ${JSON.stringify(verifierClipboard.get())}`);

  // ---- A drag past the edge of the code scrolls it, and the selection goes on growing ----------------------------------------------------------------------
  const viewEdge = node(api, 'code-scroll').rect;
  const dragStart = boundaryAt(api, 4, 2);
  await new Promise(resolve => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
  move(dragStart);
  await frames(CLICK_PAUSE_FRAMES);
  leftButton(dragStart, true);
  await frames(CLICK_PAUSE_FRAMES);
  const beyond = new Vector2(dragStart.x + 40, viewEdge.y + viewEdge.height + AUTOSCROLL_OVERSHOOT_PX);
  move(beyond, true);
  const scrolledAfterMs = await waitUntil('the code to scroll under the held drag', () => scrollTopOf(api) > AUTOSCROLL_MIN_PX, DEADLINE_MS);
  facts.autoscrollStartMs = round(scrolledAfterMs, TENTH);
  const heldAt = scrollTopOf(api);
  await frames(AUTOSCROLL_HOLD_FRAMES);
  assert(scrollTopOf(api) > heldAt, `It goes on scrolling while the button is held beyond the edge: ${heldAt} then ${scrollTopOf(api)}`);
  assert(statusPosition(api).line > AUTOSCROLL_PAST_LINE, `The selection grew past the lines that were in view: line ${statusPosition(api).line}`);
  leftButton(beyond, false);
  await settleFrames();
  const stoppedAt = scrollTopOf(api);
  await frames(AUTOSCROLL_HOLD_FRAMES);
  assert(scrollTopOf(api) === stoppedAt, 'and it stops when the button goes up');
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get().startsWith((sourceLines[3] ?? '').slice(2)) && verifierClipboard.get().split('\n').length > AUTOSCROLL_PAST_LINE - 4, `The selection reaches back to where the drag began: ${verifierClipboard.get().split('\n').length} lines`);
  await toTop(api);
  assert(lineText(api, 1) === sourceLines[0], 'The code is back at the top');

  // ---- The keyboard moves the caret ----------------------------------------------------------------------------------------------------------------------
  await click(boundaryAt(api, 5, 0));
  const beforeJump = textOf(api, 'code-status-position');
  await pressKey(Key.KeyRight, wordJump);
  const jumped = statusPosition(api);
  const word = /^\W*\w+/u.exec(sourceLines[4] ?? '');
  assert(jumped.line === 5 && word !== null && jumped.column === word[0].length, `A word jump moves over a word: from ${beforeJump} to column ${jumped.column} of ${JSON.stringify(sourceLines[4])}, expected ${word?.[0].length}`);
  await pressKey(Key.KeyDown);
  assert(statusPosition(api).line === 6, 'Down moves a line');
  await pressKey(Key.KeyEnd);
  assert(statusPosition(api).column === (sourceLines[5] ?? '').length, 'End goes to the end of the line');
  await pressKey(Key.KeyHome, {}, 2);
  assert(statusPosition(api).column === 0, 'Home twice goes to the start of the line');
  await pressKey(Key.KeyRight, { shift: true }, 3);
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get() === (sourceLines[5] ?? '').slice(0, 3), `Shift with a movement selects: ${JSON.stringify(verifierClipboard.get())}`);

  // ---- Scrolling: the wheel moves the window of lines, and Page Down follows the caret ---------------------------------------------------------------
  const nodesBeforeScroll = api.snapshot().nodes.length;
  const scrollerRect = node(api, 'code-scroll').rect;
  await wheel(centerOf(scrollerRect), true, WHEEL_TICKS);
  const drawnAfterWheel = drawnLines(api);
  assert(!drawnAfterWheel.has(1), 'After the wheel the first line is not an element');
  const scrolledTo = Math.min(...drawnAfterWheel.keys());
  assert(scrolledTo > 1, `The window moved to line ${scrolledTo}`);
  assert(Math.abs(api.snapshot().nodes.length - nodesBeforeScroll) < 80, `The window keeps its size while it moves: ${nodesBeforeScroll} nodes, then ${api.snapshot().nodes.length}`);
  for (const [number, text] of drawnAfterWheel) assert(text === sourceLines[number - 1], `Line ${number} reads as the source after the scroll`);
  await wheel(centerOf(scrollerRect), false, WHEEL_TICKS * 2);
  assert(drawnLines(api).has(1), 'Scrolling back brings the first line again');
  await click(boundaryAt(api, 2, 0));
  const topLineBefore = Math.min(...drawnLines(api).keys());
  await pressKey(Key.KeyPagedown, {}, 4);
  assert(statusPosition(api).line > 20, `Page Down moves the caret down by pages: line ${statusPosition(api).line}`);
  const caretRow = node(api, 'code-caret').rect;
  assert(caretRow.y >= scrollerRect.y - 1 && caretRow.y + caretRow.height <= scrollerRect.y + scrollerRect.height + 1, 'and the caret is in view, so the editor followed it');
  assert(Math.min(...drawnLines(api).keys()) > topLineBefore, 'The window followed');

  // ---- Edit the lab: a new background class reaches the pixels, the counter keeps its count -----------------------------------------------------------------
  // Scroll to the top, press the page's counter three times, then edit the class by typing.
  api.scrollTo('code-scroll', 0);
  await settleFrames();
  const counter = node(api, 'inputs-next').rect;
  for (let presses = 0; presses < 3; presses += 1) await click(centerOf(counter));
  assert(textOf(api, 'inputs-next') === 'Next 3', `The counter counts: ${textOf(api, 'inputs-next')}`);
  assert(near(pageBackground(owner, api), hexLevels(PAGE_BACKGROUND_ORIGINAL)), `The page starts with its own background: ${pageBackground(owner, api).join(',')}`);
  const classAt = positionOf(source, 'bg-slate-50');
  // Scroll to the line by moving the caret there: click on line 1, then Down until it is the line, then End/Home to the column.
  await click(boundaryAt(api, 1, 0));
  await pressKey(Key.KeyDown, {}, classAt.line - 1);
  await pressKey(Key.KeyHome, {}, 2);
  await pressKey(Key.KeyRight, {}, classAt.column + 'bg-'.length + 'slate-50'.length);
  assert(statusPosition(api).line === classAt.line && statusPosition(api).column === classAt.column + 'bg-slate-50'.length, `The caret is after "slate-50": ${textOf(api, 'code-status-position')}`);
  await pressKey(Key.KeyBackspace, {}, 'slate-50'.length);
  assert((lineText(api, classAt.line) ?? '').includes('className="w-full h-full bg- p-6 gap-3"'), `Backspace removed the shade: ${lineText(api, classAt.line)}`);
  // Keystroke to ink, and the commit a keystroke costs.
  api.takeProfile();
  const typed = 'emerald-100';
  const keyToInk: number[] = [];
  const commitChars: number[] = [];
  for (const character of typed) {
    const caretBefore = caretRect(api);
    const before = grab(owner);
    const ratio = before.getWidth() / api.snapshot().width;
    const cell = new Vector2(Math.round(caretBefore.x * ratio) + 1, Math.round((caretBefore.y + caretBefore.height / 2) * ratio));
    const backgroundColour = before.getPixel(cell.x, cell.y);
    api.takeProfile();
    const started = nowMs();
    // The key goes in and is handled before the call returns, with no frame and no timer in between: what the profile holds then is what
    // the keystroke itself committed, and not the lab's swap, which comes after the pause in typing.
    injectCharacter(character);
    const sample = api.takeProfile().js;
    commitChars.push(sample.samples.reduce((total, entry) => total + (entry.kind === 'flush' ? entry.jsonChars : 0), 0));
    // The character is in the next draw: some pixel of its cell differs from the background.
    let ink = false;
    const deadline = started + DEADLINE_MS;
    while (!ink && nowMs() < deadline) {
      await frames(1);
      const after = grab(owner);
      for (let dy = -6; dy <= 6 && !ink; dy += 1) {
        for (let dx = 0; dx < Math.floor(grid.advance * ratio) && !ink; dx += 1) {
          const pixel = after.getPixel(cell.x + dx, cell.y + dy);
          if (Math.abs(pixel.r - backgroundColour.r) + Math.abs(pixel.g - backgroundColour.g) + Math.abs(pixel.b - backgroundColour.b) > 0.3) ink = true;
        }
      }
    }
    assert(ink, `The typed character "${character}" is in the raster`);
    keyToInk.push(nowMs() - started);
  }
  assert(lineText(api, classAt.line)?.includes('bg-emerald-100') === true, `The line reads bg-emerald-100: ${lineText(api, classAt.line)}`);
  facts.keystrokeToInk = { medianMs: round(percentile(keyToInk, MEDIAN), TENTH), p95Ms: round(percentile(keyToInk, PERCENTILE_95), TENTH) };
  facts.commitCharsPerKeystroke = { median: percentile(commitChars, MEDIAN), worst: Math.max(...commitChars) };
  assert(percentile(keyToInk, PERCENTILE_95) <= KEY_TO_INK_P95_BUDGET_MS, `A keystroke is in the raster within ${KEY_TO_INK_P95_BUDGET_MS} ms (p95): ${percentile(keyToInk, PERCENTILE_95)}`);
  assert(Math.max(...commitChars) <= COMMIT_CHARS_PER_KEYSTROKE_BUDGET, `A keystroke is one small commit: ${Math.max(...commitChars)} characters of payload`);
  // The page follows, after the pause in typing.
  const swapMs = await waitUntil('the page to take the new class', () => near(pageBackground(owner, api), hexLevels(EMERALD_100)), UPDATE_DEADLINE_MS);
  facts.lastKeyToPageMs = round(swapMs, TENTH);
  assert(textOf(api, 'inputs-next') === 'Next 3', `The counter kept its count through the edit: ${textOf(api, 'inputs-next')}`);
  assert(/^Swapped in /u.test(textOf(api, 'code-status-run')), `The status bar says what happened: ${textOf(api, 'code-status-run')}`);
  await capture('code-editor-03-edited', OVERFLOWING);

  // ---- A syntax error keeps the last good page, and is shown -------------------------------------------------------------------------------------------------
  const brokenLine = positionOf(source, 'const [reversed, setReversed]').line;
  await pressKey(Key.KeyUp, {}, classAt.line - brokenLine);
  await pressKey(Key.KeyEnd);
  await typeText(SYNTAX_JUNK);
  await waitUntil('the compiler\'s verdict', () => textOf(api, 'code-status-run').startsWith('Not applied'), UPDATE_DEADLINE_MS, () => `The status bar says: ${textOf(api, 'code-status-run')}; the line reads: ${lineText(api, brokenLine)}`);
  assert(/Syntax error at \d+:\d+/u.test(textOf(api, 'code-status-run')), `The status names the place: ${textOf(api, 'code-status-run')}`);
  assert(textOf(api, 'inputs-next') === 'Next 3' && near(pageBackground(owner, api), hexLevels(EMERALD_100)), 'The last good page stays, with its state');
  assert(hasNode(api, `code-marker-${brokenLine}`), 'The gutter marks the line with the error');
  const underlined = childrenOf(api, node(api, `code-line-${brokenLine}`)).filter(run => String(run.props.style ?? '').length > 0 && UNDERLINED.test(JSON.stringify(run.props.style)));
  assert(underlined.length > 0, 'A run of the line is underlined');
  await capture('code-editor-04-syntax-error', OVERFLOWING);
  await pressKey(Key.KeyBackspace, {}, SYNTAX_JUNK.length);
  await waitUntil('the page to run again', () => textOf(api, 'code-status-run').startsWith('Swapped in'), UPDATE_DEADLINE_MS);

  // ---- Undo, and a type error underlined where tsc puts it -------------------------------------------------------------------------------------------------------
  await toTop(api);
  await click(boundaryAt(api, 2, 0));
  await typeText('Q');
  assert(lineText(api, 2) === `Q${sourceLines[1]}`, `Typing put a character at the start of line 2: ${lineText(api, 2)}`);
  await pressKey(Key.KeyZ, command);
  assert(lineText(api, 2) === sourceLines[1], `Undo took it back: ${lineText(api, 2)}`);
  const typedSource = applyEdits(source, [TYPE_ERROR]);
  const labelAt = positionOf(source, 'const label = ');
  await toTop(api);
  await click(boundaryAt(api, 1, 0));
  await pressKey(Key.KeyDown, {}, labelAt.line - 1);
  await pressKey(Key.KeyHome, {}, 2);
  await pressKey(Key.KeyRight, {}, 'const label'.length);
  await typeText(': number');
  const typeAnchor = positionOf(typedSource, TYPE_ERROR.anchor);
  assert(typeAnchor.line === labelAt.line, 'The type error is on the line that was edited');
  // Declaring `label` a number makes every use of it as a class an error too (the section's edit is the shared TYPE_ERROR): the first is the declaration.
  await waitUntil('the checker to find the errors', () => /^\d+ errors?$/u.test(textOf(api, 'code-status-check')), UPDATE_DEADLINE_MS, () => `The checker's summary reads "${textOf(api, 'code-status-check')}", the run "${textOf(api, 'code-status-run')}", the line "${lineText(api, labelAt.line)}"`);
  const errorLine = node(api, `code-line-${typeAnchor.line}`);
  const underlinedRuns = childrenOf(api, errorLine).filter(run => UNDERLINED.test(JSON.stringify(run.props.style)));
  assert(underlinedRuns.length === 1 && underlinedRuns[0]?.text === 'label', `The run "label" is underlined, and nothing else on the line: ${underlinedRuns.map(run => run.text).join('|')}`);
  const errorRun = underlinedRuns[0];
  assert(errorRun !== undefined, 'There is an underlined run');
  const labelColumnX = node(api, 'code-content').rect.x + gridOf(api).gutterWidth + typeAnchor.column * gridOf(api).advance;
  assert(Math.abs(errorRun.rect.x - labelColumnX) <= COLUMN_TOLERANCE_PX, 'at the column tsc reports (scripts/live-compile-agreement.mjs): the name being declared');
  assert(anchorOffset(typedSource, TYPE_ERROR.anchor) === typedSource.indexOf(TYPE_ERROR.anchor), 'against the offset of the shared edit');
  assert(hasNode(api, `code-marker-${typeAnchor.line}`), 'The gutter marks the line');
  await capture('code-editor-05-type-error', OVERFLOWING);
  const problemsButton = centerOf(node(api, 'code-status-check').rect);
  await click(problemsButton);
  assert(hasNode(api, 'code-problem-0') && /TS2322/u.test(textOf(api, 'code-problem-0')), `The problems list has it: ${hasNode(api, 'code-problem-0') ? textOf(api, 'code-problem-0') : 'nothing'}`);
  await click(centerOf(node(api, 'code-problem-0').rect));
  assert(statusPosition(api).line === typeAnchor.line && statusPosition(api).column === typeAnchor.column, 'Pressing a problem puts the caret on it');
  await click(problemsButton);
  assert(!hasNode(api, 'code-problems'), 'and the list closes');

  // ---- A hover says the type, and an inlay hint stands in the line ----------------------------------------------------------------------------------------------------
  move(boundaryAt(api, typeAnchor.line, typeAnchor.column + 2));
  await new Promise(resolve => setTimeout(resolve, HOVER_WAIT_MS));
  await waitUntil('the hover', () => hasNode(api, 'code-hover'), UPDATE_DEADLINE_MS);
  assert(/label: number/u.test(textOf(api, 'code-hover')) || /label/u.test(textOf(api, 'code-hover')), `The tooltip names what is under the pointer: ${textOf(api, 'code-hover')}`);
  assert(hasNode(api, 'code-hover-error'), 'and the problem there');
  const tooltip = node(api, 'code-hover').rect;
  assert(tooltip.x >= 0 && tooltip.y >= 0 && tooltip.x + tooltip.width <= api.snapshot().width && tooltip.y + tooltip.height <= api.snapshot().height, 'The tooltip is inside the window');
  await capture('code-editor-06-hover', [...OVERFLOWING, 'code-hover']);
  move(new Vector2(1, 1));
  await settleFrames();
  assert(!hasNode(api, 'code-hover'), 'The tooltip goes when the pointer leaves');
  const sizesAt = positionOf(source, 'const sizes = ');
  await click(boundaryAt(api, typeAnchor.line, 0));
  await pressKey(Key.KeyDown, {}, sizesAt.line - typeAnchor.line);
  await waitUntil('an inlay hint on the line of "sizes"', () => childrenOf(api, node(api, `code-line-${sizesAt.line}`)).some(run => run.text.startsWith(': ')), UPDATE_DEADLINE_MS);
  const hint = childrenOf(api, node(api, `code-line-${sizesAt.line}`)).find(run => run.text.startsWith(': '));
  assert(hint !== undefined, 'There is an inlay hint');
  const hintColumn = sizesAt.column + 'const sizes'.length;
  assert(Math.abs(hint.rect.x - (node(api, 'code-content').rect.x + gridOf(api).gutterWidth + hintColumn * gridOf(api).advance)) <= COLUMN_TOLERANCE_PX, 'right after the name it describes');
  facts.inlayHint = hint.text;
  await capture('code-editor-07-inlay', OVERFLOWING);

  // ---- Copy, cut, paste -------------------------------------------------------------------------------------------------------------------------------
  await click(boundaryAt(api, sizesAt.line, sizesAt.column + 6), 2);
  await pressKey(Key.KeyC, command);
  const copied = verifierClipboard.get();
  assert(copied === 'sizes', `Copy: ${JSON.stringify(copied)}`);
  await pressKey(Key.KeyX, command);
  assert(!(lineText(api, sizesAt.line) ?? '').includes('const sizes'), `Cut took the word out: ${lineText(api, sizesAt.line)}`);
  await pressKey(Key.KeyV, command);
  // The line as drawn has the hint after the name (the check has not answered for the new text yet, so the hint is where the edits moved it).
  assert(/^\s*const sizes(: [^=]*)? = reversed/u.test(lineText(api, sizesAt.line) ?? ''), `Paste put it back, and the hint is still after the name: ${lineText(api, sizesAt.line)}`);

  // ---- Reset: back to the source, and the page with it ---------------------------------------------------------------------------------------------------
  await click(centerOf(node(api, 'code-reset').rect));
  await waitUntil('the source again', () => [...drawnLines(api).keys()].every(number => sourceTextOfDrawnLine(api, number) === sourceLines[number - 1]), UPDATE_DEADLINE_MS);
  await waitUntil('the page to be as it was', () => near(pageBackground(owner, api), hexLevels(PAGE_BACKGROUND_ORIGINAL)), UPDATE_DEADLINE_MS);
  await waitUntil('the type check to find nothing', () => textOf(api, 'code-status-check') === 'No problems', UPDATE_DEADLINE_MS);
  assert(textOf(api, 'inputs-next') === 'Next 3', `The counter is still 3 after the reset: a reset is an edit like any other: ${textOf(api, 'inputs-next')}`);

  // ---- The panel hidden and shown again keeps what was typed; the lab on the stage keeps its state -------------------------------------------------------------
  await toTop(api);
  assert(sourceLines[2] === '', 'Line 3 of the source is blank');
  await click(boundaryAt(api, 3, 0));
  await typeText(NOTE);
  assert(lineText(api, 3) === NOTE, `The comment is in the third line: ${lineText(api, 3)}`);
  const counterBefore = textOf(api, 'inputs-next');
  await waitUntil('the comment to reach the page', () => textOf(api, 'code-status-run').startsWith('Swapped in'), UPDATE_DEADLINE_MS);
  await click(centerOf(node(api, 'toggle-code').rect));
  assert(!hasNode(api, 'code-editor'), 'Hide Code closes the panel');
  assert(textOf(api, 'inputs-next') === counterBefore, `and the lab on the stage keeps its state: ${textOf(api, 'inputs-next')} against ${counterBefore}`);
  await click(centerOf(node(api, 'toggle-code').rect));
  await waitUntil('the panel again', () => hasNode(api, 'code-line-3'));
  assert(lineText(api, 3) === NOTE, 'Show Code brings the edited text back');
  assert(textOf(api, 'inputs-next') === counterBefore, 'and the lab still has its state');

  // ---- Idle: the panel open and not focused asks for no frames ------------------------------------------------------------------------------------------------
  await click(centerOf(node(api, 'lab-title').rect));
  await frames(10);
  assert(!hasNode(api, 'code-caret'), 'An editor that has lost the focus draws no caret');
  let busy = 0;
  for (let sample = 0; sample < IDLE_SAMPLES; sample += 1) {
    await new Promise(resolve => setTimeout(resolve, IDLE_SAMPLE_MS));
    if (api.surfaceProcessing()) busy += 1;
  }
  assert(busy === 0, `With the panel open and unfocused the root asks for no frames: ${busy} of ${IDLE_SAMPLES} samples were busy`);
  facts.idleBusySamples = busy;

  // ---- Close, and the stage is the bundled lab's ---------------------------------------------------------------------------------------------------------------
  api.restoreDemo();
  await settleFrames();
  api.profile(false);
  console.log('GODOT_REACT_CODE_EDITOR', JSON.stringify(facts));
}
