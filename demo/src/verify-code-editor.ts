import {
  Color, Engine, FileAccess, Image, InputEventKey, InputEventMouseButton, InputEventScreenDrag, InputEventScreenTouch, Key, MouseButton, MouseButtonMask, Node, OS,
  Time, Vector2,
} from 'godot';
import type { LayoutRect, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import type { RendererProfile } from '../../src/profile';
import type { NativeProfile } from '../../src/native';
import { TYPE_ERROR, anchorOffset, applyEdits } from '../../scripts/live-compile-edits.mjs';
import type { NavigatorOptions } from './main';
import { THEME } from './editor/theme';
import { assertionTally, CLICK_SEQUENCE_PAUSE_MS, parseVerifierEvent, verifierClipboard, waitForNewClickSequence } from './verifier-input';
import { grab, settleFrames } from './verify-filters';
import { fontsOfText } from './demo-fonts';
import { click, drag, move, typeText } from './verify-text-input';

/**
 * The `code-editor` section of the interaction verifier: the lab navigator's code panel in a real window,
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
 * Needs the godot-tsc addon (`pnpm exec godot-tsc setup --project-dir demo --force`): the driver refuses one that is not the package's before it opens a window.
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
  /** Where the text with test id `testID` has its caret (`getCaretRect`), and what a press at a point lands on (`getOffsetAtPoint`) and a range covers (`getRangeRects`). */
  textCaret(testID: string, offset: number, side: 'before' | 'after'): LayoutRect | null;
  textOffsetAt(testID: string, x: number, y: number): { readonly offset: number; readonly side: 'before' | 'after' } | null;
  textRanges(testID: string, start: number, end: number): LayoutRect[] | null;
}

export type CodeEditorCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

/**
 * What a capture does not hold to the window: the Controls lab's slider thumb, drawn past its track by design, and the grid probe, an
 * invisible line of 400 columns that the editor measures its font with.
 */
const OVERFLOWING = ['inputs-slider-thumb', 'editor-grid-probe'];
/** Typed at the end of a statement: not a statement. (A stray `}` in JSX text is not a syntax error to Bun's parser: it compiles and throws when the page renders.) */
const SYNTAX_JUNK = ' = = ;';
/** A comment typed into the source's first blank line (`blankLine`): an edit that changes no behaviour. */
const NOTE = '// note';
const LAB_ID = 'inputs';
const LAB_SOURCE = 'res://src/inputs-lab.tsx';
/** `md:` (README: Styles): from here the Code button is offered. */
const PHONE_BREAKPOINT_PX = 768;
const FRAME_POLL_MS = 1;
/** Where a handle's stem is against where the grid puts the column, in pixels. */
const TOUCH_TOLERANCE_PX = 1.5;
const DEADLINE_MS = 6_000;
/** How far a caret may stray from the pixel of its column. */
const COLUMN_TOLERANCE_PX = 1;
/** How far the caret of a column on the grid may be from where the grid says: the paragraph's own advance is exact to a small fraction of a pixel. */
const GRID_EXACT_PX = 0.05;
/** A strip of pixels this far to this far from an edge of a drawn band, so antialiasing at the fractional edge does not decide a pixel. */
const EDGE_NEAR_PX = 1.5;
const EDGE_FAR_PX = 3;
/** A selection far along a long line: from this column to this one. */
const FAR_COLUMN_FROM = 100;
const FAR_COLUMN_TO = 106;
/** A line of text this long has the columns above. */
const LONG_LINE_COLUMNS = 110;
/**
 * A comment with three emoji (two code units and about two columns each), two CJK characters (the demo's fonts have none: they come from
 * the system font the faces fall back to, or are hex boxes where the platform has none, as on the Web) and ASCII on both sides.
 */
const WIDE_COMMENT = '// \u{1F600}\u{1F680}\u{1F3B2} \u65e5\u672c ok';
/** Offsets in `WIDE_COMMENT`: the first emoji starts and ends (an emoji is two code units), and the three end. */
const EMOJI_CODE_UNITS = 2;
const EMOJI_COUNT = 3;
const WIDE_FIRST_START = 3;
const WIDE_FIRST_END = WIDE_FIRST_START + EMOJI_CODE_UNITS;
const WIDE_RUN_END = WIDE_FIRST_START + EMOJI_COUNT * EMOJI_CODE_UNITS;
/** The two CJK characters follow the emoji and a space. */
const CJK_START = WIDE_RUN_END + 1;
const CJK_END = CJK_START + 2;
/** Ink in the raster is a pixel with a channel above this level: every background the editor has (the page, the current line) is darker, a comment is not. */
const INK_MIN_LEVEL = 0x60;
/** Low surrogates: the second code unit of an emoji, where no caret can be. */
const LOW_SURROGATE_START = 0xdc00;
const LOW_SURROGATE_END = 0xdfff;
/** The wide line has a caret at least this many columns from where the grid would put it. */
const WIDE_OFF_GRID_COLUMNS = 0.5;
/** The rows of a span's background, from here to here below the top of the line's box (above and below it is the line's gap). */
const BAND_FIRST_ROW_PX = 2;
const BAND_LAST_ROW_PX = 13;
/** A span's background is the font's own height (a little less than the line's): a pixel row this far below the top of the line's box is in the middle of it. */
const SPAN_BAND_PROBE_PX = 8;
/** Past an edge of a selection that has the caret at it: further than the caret is wide. */
const PAST_CARET_PX = 4;
/** The error colour in the raster of a wave is blended at its edges: a pixel within this many levels counts. */
const WAVE_COLOUR_TOLERANCE_LEVELS = 40;
/** A wave is on at least this many rows of pixels; a solid underline is on one. */
const WAVE_MIN_ROWS = 2;
/** Where in the span between two carets a press lands on the left one (under half) and on the right one (over half). */
const BELOW_HALF = 0.3;
const ABOVE_HALF = 0.7;
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
/** Pointer and scroll: the characters a drag covers, and the line a press or a drag is made on has at least this many. */
const POINTER_DRAG_COLUMNS = 6;
const POINTER_LINE_MIN_CHARACTERS = 30;
/** The keyboard checks start on the first line from this one that begins with a word (past the imports). */
const WORD_LINE_FROM = 5;
/** How many characters Shift+Right selects at the start of the next line, and Copy must give. */
const SELECTED_PREFIX = 3;
/** The column a press lands on. */
const POINTER_COLUMN = 10;
/** The least number of whole lines the code must show for these checks to mean anything: the edge lines and the middle ones are different lines. */
const POINTER_MIN_VISIBLE_LINES = 8;
/** Wheel ticks that carry the code a page and more: a caret on the first lines is out of view after them. */
const POINTER_WHEEL_TICKS = 12;
/** Fewer ticks than that, back up. */
const POINTER_WHEEL_BACK_TICKS = 5;
/** A pointer that moves this far between a press and its release (a real mouse does, a little). */
const NUDGE_PX = 1;
/** The part of a half-hidden line that shows, beyond the scrollbar drawn over the foot of the code: a press this far inside its edge is on it. */
const HIDDEN_LINE_INSET_PX = 1;
const VISIBLE_PART_BEYOND_TRACK_PX = 4;
/** Scroll offsets are fractions of a pixel: they agree to this much. */
const SCROLL_TOLERANCE_PX = 0.5;
/** A held drag this far below the code scrolls it; it has scrolled once it has moved this far. */
const AUTOSCROLL_OVERSHOOT_PX = 40;
const AUTOSCROLL_MIN_PX = 40;
const AUTOSCROLL_HOLD_FRAMES = 12;
/** Lines in view are about a dozen; a selection past this line has been carried by the scrolling. */
const AUTOSCROLL_PAST_LINE = 14;
const CLICK_PAUSE_FRAMES = 3;
/** The probe sits this far inside the page's top left corner, where only its background is (the page pads its content by 24). */
const PAGE_PROBE_INSET_PX = 6;
const PAGE_BACKGROUND_ORIGINAL = '#f8fafc';
/** The selection colour without its alpha (`editor/theme.ts`). */
const SELECTION_BOX_PREFIX = '#2563eb';
/** The theme's caret (`editor/theme.ts`). */
const CARET_COLOUR = '#60a5fa';
const EMERALD_100 = '#d1fae5';
const LEVELS = 255;
const COLOUR_TOLERANCE_LEVELS = 4;
const MILLISECONDS_PER_MICROSECOND = 1000;
const TENTH = 10;
const HUNDRED = 100;
const MEDIAN = 0.5;
const PERCENTILE_95 = 0.95;
/** A hover is asked for after this long (view/hover.ts); the section waits this and a little more. */
const HOVER_WAIT_MS = 700;
/** Updates are sent after a pause of this long (editor/workspace.ts); the section waits for them. */
const UPDATE_DEADLINE_MS = 4_000;
const WHEEL_TICKS = 6;
const IDLE_SAMPLES = 8;
const IDLE_SAMPLE_MS = 250;
/** Budgets. They are generous for a starved machine has what was measured. */
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
  // The advance the paragraph lays its glyphs out at: the distance between a caret at the start of the probe's line and one at its end, over its columns.
  const start = api.textCaret('editor-grid-probe', 0, 'after');
  const end = api.textCaret('editor-grid-probe', PROBE_COLUMNS, 'after');
  assert(start !== null && end !== null, 'The probe is a text with carets');
  return { advance: (end.x - start.x) / PROBE_COLUMNS, lineHeight: node(api, 'editor-grid-probe').rect.height, gutterWidth: node(api, 'code-gutter').rect.width };
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

/** One span of a line: its range of the line's text, what it shows if it is an inlay, and its style. */
interface LineSpan {
  readonly start: number;
  readonly end: number;
  readonly inlay: string | undefined;
  readonly style: Readonly<Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The spans of the `Text` that is line `line`: the line is one node, and what it is coloured by is these. */
function spansOf(api: CodeEditorInspection, line: number): LineSpan[] {
  const row = node(api, `code-line-${line}`);
  assert(row.kind === 'text' && row.children.length === 0, `Line ${line} is one Text with no node in it`);
  const { spans } = row.props;
  // A blank line has no children, so it has no spans.
  if (spans === undefined || spans === null) {
    assert(row.text === '', `Line ${line} has spans`);
    return [];
  }
  assert(Array.isArray(spans), `Line ${line} has spans`);
  return spans.map((span: unknown) => {
    assert(isRecord(span) && typeof span.start === 'number' && typeof span.end === 'number', `A span of line ${line} has a range`);
    return { start: span.start, end: span.end, inlay: typeof span.inlay === 'string' ? span.inlay : undefined, style: isRecord(span.style) ? span.style : {} };
  });
}

/** The spans of a line that are the source's own text (not an inlay). */
function textSpansOf(api: CodeEditorInspection, line: number): LineSpan[] {
  return spansOf(api, line).filter(span => span.inlay === undefined);
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

/** One grab of the window, to read many pixels from (`pixelAt` grabs each time). */
interface Raster {
  colourAt(x: number, y: number): [number, number, number];
}

function rasterOf(owner: Node, api: CodeEditorInspection): Raster {
  const image: Image = grab(owner);
  const ratio = image.getWidth() / api.snapshot().width;
  return { colourAt: (x, y) => levels(image.getPixel(Math.round(x * ratio), Math.round(y * ratio))) };
}

/** Whether some pixel of the strip from `xFrom` to `xTo` and `yFrom` to `yTo` (root-local, a pixel apart) is `colour`. */
function stripHas(raster: Raster, xFrom: number, xTo: number, yFrom: number, yTo: number, colour: readonly number[]): boolean {
  for (let y = yFrom; y <= yTo; y += 1) {
    for (let x = xFrom; x <= xTo; x += 1) if (near(raster.colourAt(x, y), colour)) return true;
  }
  return false;
}

/**
 * That a span's background (`bandColour`) starts and ends where `left` and `right` say, in the raster: the colour is in a strip just inside each
 * edge (some row of it: a glyph there covers some rows, not all) and in none just outside (a caret at the right edge is wider than the strip is
 * far from it, so that one is taken beyond the caret).
 */
function bandEdgesAre(raster: Raster, lineTop: number, left: number, right: number, bandColour: readonly number[]): string | undefined {
  const top = lineTop + BAND_FIRST_ROW_PX;
  const bottom = lineTop + BAND_LAST_ROW_PX;
  if (!stripHas(raster, left + EDGE_NEAR_PX, left + EDGE_FAR_PX, top, bottom, bandColour)) return `the colour is not just inside the left edge ${left}`;
  if (stripHas(raster, left - EDGE_FAR_PX, left - EDGE_NEAR_PX, top, bottom, bandColour)) return `the colour is just outside the left edge ${left}`;
  if (!stripHas(raster, right - EDGE_FAR_PX, right - EDGE_NEAR_PX, top, bottom, bandColour)) return `the colour is not just inside the right edge ${right}`;
  if (stripHas(raster, right + PAST_CARET_PX, right + PAST_CARET_PX + (EDGE_FAR_PX - EDGE_NEAR_PX), top, bottom, bandColour)) return `the colour is just outside the right edge ${right}`;
  return undefined;
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

// ---- Touch: a long press selects, handles move the ends, a menu acts, a swipe scrolls --------------------------------------------------------------------

/** How long a finger is held for the editor's long press (`TOUCH_SELECT_HOLD_MS`, 500 ms) to have elapsed, with slack for frames. */
const TOUCH_HELD_MS = 900;
const TOUCH_EARLY_MS = 250;
const TOUCH_STEPS = 6;
const TOUCH_STEP_PX = 20;

function touchEvent(position: Vector2, pressed: boolean): void {
  const event = new InputEventScreenTouch();
  event.index = 0;
  event.position = position;
  event.pressed = pressed;
  parseVerifierEvent(event);
}

function touchDragEvent(position: Vector2, relative: Vector2): void {
  const event = new InputEventScreenDrag();
  event.index = 0;
  event.position = position;
  event.relative = relative;
  parseVerifierEvent(event);
}

async function touchTap(position: Vector2): Promise<void> {
  touchEvent(position, true);
  await frames(2);
  touchEvent(position, false);
  await settleFrames();
}

/** The finger at `from` moves to `to` in steps, a few frames apart; it is still down. */
async function touchGlide(from: Vector2, to: Vector2, steps = TOUCH_STEPS): Promise<void> {
  let last = from;
  for (let step = 1; step <= steps; step += 1) {
    const next = new Vector2(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps);
    touchDragEvent(next, new Vector2(next.x - last.x, next.y - last.y));
    last = next;
    await frames(2);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyTouchSelection(api: CodeEditorInspection, source: string, capture: CodeEditorCapture): Promise<void> {
  await toTop(api);
  const lines = source.split('\n');
  const word = positionOf(source, 'useState');
  const text = lines[word.line - 1] ?? '';
  const grid = gridOf(api);
  const stemX = (testID: string): number => node(api, testID).rect.x + node(api, testID).rect.width / 2;
  const inside = boundaryAt(api, word.line, word.column + 3);
  verifierClipboard.set('before');

  // A hold that is not long enough selects nothing; a long one selects the word under the finger, and shows its handles and the menu.
  touchEvent(inside, true);
  await frames(2);
  await sleep(TOUCH_EARLY_MS);
  assert(!hasNode(api, 'code-handle-start'), 'Before the hold has elapsed nothing is selected');
  await sleep(TOUCH_HELD_MS - TOUCH_EARLY_MS);
  await frames(2);
  assert(hasNode(api, 'code-handle-start') && hasNode(api, 'code-handle-end'), 'A long press selects the word under the finger and shows its handles');
  assert(!hasNode(api, 'code-touch-menu'), 'The menu waits for the finger to lift');
  touchEvent(inside, false);
  await settleFrames();
  assert(Math.abs(stemX('code-handle-start-stem') - boundaryAt(api, word.line, word.column).x) <= TOUCH_TOLERANCE_PX, `The start handle stands on the word's start: ${stemX('code-handle-start-stem')}`);
  assert(Math.abs(stemX('code-handle-end-stem') - boundaryAt(api, word.line, word.column + 'useState'.length).x) <= TOUCH_TOLERANCE_PX, `and the end handle on its end: ${stemX('code-handle-end-stem')}`);
  assert(node(api, 'code-handle-start-ball').rect.y < node(api, 'code-handle-start-stem').rect.y && node(api, 'code-handle-end-ball').rect.y > node(api, 'code-handle-end-stem').rect.y,
    'The start handle hangs above its line and the end handle below it');
  assert(hasNode(api, 'code-touch-menu-cut') && hasNode(api, 'code-touch-menu-copy') && hasNode(api, 'code-touch-menu-selectAll'), 'The menu offers Cut, Copy and Select All');
  await capture('code-editor-touch-01-word', OVERFLOWING);
  await touchTap(centerOf(node(api, 'code-touch-menu-copy').rect));
  assert(verifierClipboard.get() === 'useState', `Copy in the menu puts the selected word on the clipboard: ${JSON.stringify(verifierClipboard.get())}`);
  assert(hasNode(api, 'code-handle-end') && !hasNode(api, 'code-touch-menu'), 'and leaves the selection and its handles, the menu gone');

  // The end handle moves the end of the selection by columns.
  const ball = centerOf(node(api, 'code-handle-end-ball').rect);
  const extra = 5;
  touchEvent(ball, true);
  await frames(2);
  await touchGlide(ball, new Vector2(ball.x + extra * grid.advance, ball.y));
  touchEvent(new Vector2(ball.x + extra * grid.advance, ball.y), false);
  await settleFrames();
  await touchTap(centerOf(node(api, 'code-touch-menu-copy').rect));
  assert(verifierClipboard.get() === text.slice(word.column, word.column + 'useState'.length + extra), `Dragging the end handle extends the selection by five columns: ${JSON.stringify(verifierClipboard.get())}`);

  // A tap elsewhere puts the caret there and takes the handles away.
  await touchTap(boundaryAt(api, word.line + 1, 4));
  assert(!hasNode(api, 'code-handle-start') && !hasNode(api, 'code-touch-menu'), 'A tap elsewhere hides the handles and the menu');

  // White space is not a word; a swipe scrolls and selects nothing.
  const space = text.indexOf(' ');
  assert(space >= 0, 'The line has a space');
  const onSpace = new Vector2(boundaryAt(api, word.line, space).x + grid.advance / 2, boundaryAt(api, word.line, space).y);
  touchEvent(onSpace, true);
  await frames(2);
  await sleep(TOUCH_HELD_MS);
  assert(!hasNode(api, 'code-handle-start'), 'A long press on white space selects nothing');
  touchEvent(onSpace, false);
  await settleFrames();
  const swipeFrom = boundaryAt(api, word.line, word.column + 3);
  touchEvent(swipeFrom, true);
  await frames(2);
  await touchGlide(swipeFrom, new Vector2(swipeFrom.x, swipeFrom.y - TOUCH_STEPS * TOUCH_STEP_PX));
  await sleep(TOUCH_HELD_MS);
  assert(!hasNode(api, 'code-handle-start'), 'A swipe that began on a word selects nothing, though the finger rests past the hold');
  touchEvent(new Vector2(swipeFrom.x, swipeFrom.y - TOUCH_STEPS * TOUCH_STEP_PX), false);
  await settleFrames();
  assert(scrollTopOf(api) > 0, `and scrolls the code: ${scrollTopOf(api)}`);
  await toTop(api);

  // A finger that selected by holding goes on selecting as it moves, by words, and does not pan the editor. It moves up, which would scroll the
  // code down (a finger moving down at the top of the code scrolls nothing): without JS's capture of the finger the root would pan.
  const lower = positionOf(source, 'volume');
  const lowerText = lines[lower.line - 1] ?? '';
  assert(lower.line >= word.line + 4 && lower.line <= 12 && lowerText.includes('volume'), `The lab source has a word in a visible line a few lines down: ${lower.line}`);
  const held = boundaryAt(api, lower.line, lower.column + 3);
  touchEvent(held, true);
  await frames(2);
  await sleep(TOUCH_HELD_MS);
  assert(hasNode(api, 'code-handle-start'), 'A long press selects again');
  const up = new Vector2(held.x, held.y - 3 * grid.lineHeight);
  await touchGlide(held, up);
  touchEvent(up, false);
  await settleFrames();
  assert(scrollTopOf(api) === 0, `The finger that selected does not pan the editor: ${scrollTopOf(api)}`);
  await touchTap(centerOf(node(api, 'code-touch-menu-copy').rect));
  assert(verifierClipboard.get().endsWith('volume') && verifierClipboard.get().split('\n').length >= 3, `and extends the selection up the lines: ${JSON.stringify(verifierClipboard.get().slice(-40))}`);
  await capture('code-editor-touch-02-extended', OVERFLOWING);
  await touchTap(boundaryAt(api, word.line + 1, 4));
  assert(!hasNode(api, 'code-handle-start'), 'A tap ends it');
  await toTop(api);
}

// ---- Pointer and scroll: the reported sequences --------------------------------------------------------------------------------

interface SelectionOnScreen {
  readonly characters: number;
  readonly from: Position | undefined;
  readonly to: Position | undefined;
}

/** The characters of the lines that are elements that the selection's colour is behind, and where they begin and end. */
function selectionOnScreen(api: CodeEditorInspection): SelectionOnScreen {
  let characters = 0;
  let from: Position | undefined;
  let to: Position | undefined;
  for (const number of [...drawnLines(api).keys()].sort((a, b) => a - b)) {
    for (const span of textSpansOf(api, number)) {
      if (String(span.style.backgroundColor).slice(0, SELECTION_BOX_PREFIX.length).toLowerCase() !== SELECTION_BOX_PREFIX) continue;
      characters += span.end - span.start;
      from ??= { line: number, column: span.start };
      to = { line: number, column: span.end };
    }
  }
  return { characters, from, to };
}

/**
 * What was reported in the browser: a click mid-file highlighted a slab of text, the next click scrolled, a drag selected a slab and scrolled, and the
 * first click after a scroll scrolled again. They have one cause: the editor took the keyboard for its input *before* the input stood at the new
 * caret, and focusing an input brings it into view (as `focus()` does in a browser), so a caret scrolled out of view by the wheel pulled the
 * editor back to it from under the press, and the pointer's next move was then over other text. Each sequence is made with the pointer and the
 * wheel, after the caret has been left where the wheel takes it out of view.
 */
async function verifyPointerAndScroll(api: CodeEditorInspection, sourceLines: readonly string[], command: Modifiers): Promise<void> {
  await toTop(api);
  const grid = gridOf(api);
  const lineHeight = grid.lineHeight;
  const view = () => node(api, 'code-scroll');
  const clientHeight = view().scroll?.clientHeight ?? 0;
  const wholeLines = Math.floor(clientHeight / lineHeight);
  assert(wholeLines >= POINTER_MIN_VISIBLE_LINES, `The code shows at least ${POINTER_MIN_VISIBLE_LINES} whole lines: ${wholeLines}`);
  /** The first line at or after `from` that has text enough to press and drag on. */
  /** The first line that is whole in view, and the last. */
  const firstWhole = (): number => Math.ceil((view().scroll?.scrollTop ?? 0) / lineHeight) + 1;
  const lastWhole = (): number => Math.floor(((view().scroll?.scrollTop ?? 0) + clientHeight) / lineHeight);
  const middleOfView = (): number => firstWhole() + Math.floor(wholeLines / 2);
  /**
   * The lines whole in view that have text enough to press and drag on, in order. They are taken from the view, not from the source after a line:
   * which lines have text depends on the lab's source, and the first one after the middle may be below the view (a run of short lines, a comment).
   */
  const linesWithTextInView = (): number[] => {
    const lines: number[] = [];
    for (let line = firstWhole(); line <= lastWhole(); line += 1) {
      if ((sourceLines[line - 1] ?? '').length >= POINTER_LINE_MIN_CHARACTERS) lines.push(line);
    }
    assert(lines.length >= 2, `At least two lines in view (${firstWhole()} to ${lastWhole()}) have ${POINTER_LINE_MIN_CHARACTERS} characters: ${lines.join(', ')}`);
    return lines;
  };
  const nearerTheMiddle = (a: number, b: number): number => (Math.abs(b - middleOfView()) < Math.abs(a - middleOfView()) ? b : a);
  /** The line with text nearest the middle of the view, after it has scrolled. */
  const lineInTheMiddle = (): number => linesWithTextInView().reduce(nearerTheMiddle);
  /** A line with text near the middle of the view and the next line with text after it, both in view: where a click and the next click go. */
  const pairInTheMiddle = (): readonly [number, number] => {
    const lines = linesWithTextInView();
    const first = lines.slice(0, -1).reduce(nearerTheMiddle);
    const next = lines[lines.indexOf(first) + 1];
    assert(next !== undefined, `A line with text follows line ${first} in view`);
    return [first, next];
  };
  const track = view().scroll?.tracks?.x;
  /** The foot of the code is under a scrollbar when the content is wider than the view: a press there is the scrollbar's. */
  const pressableBottom = (): number => (track === null || track === undefined ? view().rect.y + clientHeight : track.y);
  const bottomMost = (): number => {
    const contentTop = node(api, 'code-content').rect.y;
    let line = lastWhole();
    while (line > 1 && contentTop + line * lineHeight > pressableBottom()) line -= 1;
    return line;
  };
  const noSelection = (what: string): void => {
    const selected = selectionOnScreen(api);
    assert(selected.characters === 0, `${what} leaves a caret and no selection: ${selected.characters} characters from ${JSON.stringify(selected.from)} to ${JSON.stringify(selected.to)}`);
  };
  const pressedAt = async (line: number, column: number, what: string): Promise<void> => {
    const scrolled = scrollTopOf(api);
    await click(boundaryAt(api, line, column));
    const wanted = Math.min(column, (sourceLines[line - 1] ?? '').length);
    assert(statusPosition(api).line === line && statusPosition(api).column === wanted, `${what}: the caret is under the pointer, at ${line}:${wanted}, not ${textOf(api, 'code-status-position')}`);
    assert(Math.abs(scrollTopOf(api) - scrolled) <= SCROLL_TOLERANCE_PX, `${what} does not scroll the code: ${scrolled} then ${scrollTopOf(api)}`);
    noSelection(what);
  };

  // A click mid-file, and the next, scroll nothing. The caret has to be somewhere else first: the first line.
  const [middle, next] = pairInTheMiddle();
  await pressedAt(middle, POINTER_COLUMN, `A click on line ${middle}`);
  await pressedAt(next, POINTER_COLUMN, `The next click, on line ${next}`);

  // The lines at the edges: a line that is whole in view is not scrolled, the second from the bottom included (it used to be: a reveal kept two lines clear).
  for (const [line, what] of [
    [bottomMost() - 1, 'the second line from the bottom'], [bottomMost(), 'the last line that shows whole'],
    [firstWhole() + 1, 'the second line from the top'], [firstWhole(), 'the first line that shows whole'],
  ] as const) await pressedAt(line, POINTER_COLUMN, `A click on ${what} (line ${line})`);

  // A line that is cut off at an edge is scrolled by the part that is out, no further: the top one, then the bottom one.
  const CUT_LINES = 3;
  api.scrollTo('code-scroll', CUT_LINES * lineHeight + lineHeight / 2);
  await settleFrames();
  const cutTop = CUT_LINES + 1;
  const cutTopPress = boundaryAt(api, cutTop, POINTER_COLUMN);
  await click(new Vector2(cutTopPress.x, view().rect.y + HIDDEN_LINE_INSET_PX));
  assert(statusPosition(api).line === cutTop, `A click on the visible part of the half-hidden top line is on line ${cutTop}: ${textOf(api, 'code-status-position')}`);
  assert(Math.abs(scrollTopOf(api) - CUT_LINES * lineHeight) <= SCROLL_TOLERANCE_PX, `and scrolls it by the half that was out, no more: ${scrollTopOf(api)}`);
  const trackHeight = track === null || track === undefined ? 0 : track.height;
  const shown = trackHeight + VISIBLE_PART_BEYOND_TRACK_PX;
  assert(shown < lineHeight, `The part of a cut-off line that shows (${shown}) is less than a line (${lineHeight})`);
  const bottomEdgeLines = wholeLines + CUT_LINES + 1;
  const cutBottomAt = bottomEdgeLines * lineHeight + shown - clientHeight;
  api.scrollTo('code-scroll', cutBottomAt);
  await settleFrames();
  const cutBottom = bottomEdgeLines + 1;
  const cutBottomPress = boundaryAt(api, cutBottom, POINTER_COLUMN);
  await click(new Vector2(cutBottomPress.x, view().rect.y + clientHeight - shown + HIDDEN_LINE_INSET_PX));
  assert(statusPosition(api).line === cutBottom, `A click on the visible part of the cut-off bottom line is on line ${cutBottom}: ${textOf(api, 'code-status-position')}`);
  assert(Math.abs(scrollTopOf(api) - (cutBottomAt + lineHeight - shown)) <= SCROLL_TOLERANCE_PX, `and scrolls it by the part that was out, no more: ${cutBottomAt} then ${scrollTopOf(api)}`);

  // The first click after the wheel is a click like any other: the caret is on the first lines, the wheel takes it far out of view, and the click is mid-view.
  await toTop(api);
  await click(boundaryAt(api, 2, 0));
  const scroller = centerOf(view().rect);
  await wheel(scroller, true, POINTER_WHEEL_TICKS);
  assert(scrollTopOf(api) > clientHeight, `The wheel took the caret out of view: scrolled ${scrollTopOf(api)} of a view ${clientHeight} high`);
  const afterWheel = lineInTheMiddle();
  await pressedAt(afterWheel, POINTER_COLUMN, `The first click after the wheel, on line ${afterWheel}`);

  // A drag selects from the press to the pointer, and nothing else, after a scroll as at any time.
  await wheel(scroller, false, POINTER_WHEEL_BACK_TICKS);
  const dragLine = lineInTheMiddle();
  const scrolledBeforeDrag = scrollTopOf(api);
  await drag(boundaryAt(api, dragLine, POINTER_COLUMN), boundaryAt(api, dragLine, POINTER_COLUMN + POINTER_DRAG_COLUMNS));
  const dragged = selectionOnScreen(api);
  assert(dragged.characters === POINTER_DRAG_COLUMNS && dragged.from?.line === dragLine && dragged.from.column === POINTER_COLUMN, `A drag over ${POINTER_DRAG_COLUMNS} characters after the wheel selects them: ${dragged.characters} characters from ${JSON.stringify(dragged.from)}`);
  assert(Math.abs(scrollTopOf(api) - scrolledBeforeDrag) <= SCROLL_TOLERANCE_PX, `and does not scroll: ${scrolledBeforeDrag} then ${scrollTopOf(api)}`);
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get() === (sourceLines[dragLine - 1] ?? '').slice(POINTER_COLUMN, POINTER_COLUMN + POINTER_DRAG_COLUMNS), `and Copy has exactly those characters: ${JSON.stringify(verifierClipboard.get())}`);

  // A real mouse moves a little between the press and the release. The caret is far out of view again.
  await toTop(api);
  await click(boundaryAt(api, 2, 0));
  await wheel(scroller, true, POINTER_WHEEL_TICKS);
  const nudgeLine = lineInTheMiddle();
  const scrolledBeforeNudge = scrollTopOf(api);
  const pressPoint = boundaryAt(api, nudgeLine, POINTER_COLUMN);
  await new Promise(resolve => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
  move(pressPoint);
  await frames(CLICK_PAUSE_FRAMES);
  leftButton(pressPoint, true);
  await frames(CLICK_PAUSE_FRAMES);
  for (const nudge of [NUDGE_PX, NUDGE_PX * 2]) {
    move(new Vector2(pressPoint.x + nudge, pressPoint.y), true);
    await frames(1);
  }
  leftButton(new Vector2(pressPoint.x + NUDGE_PX * 2, pressPoint.y), false);
  await settleFrames();
  const nudged = selectionOnScreen(api);
  assert(nudged.characters <= 1, `A press that moves ${NUDGE_PX * 2} px before it is released selects at most the character it moved over: ${nudged.characters} from ${JSON.stringify(nudged.from)} to ${JSON.stringify(nudged.to)}`);
  assert(Math.abs(scrollTopOf(api) - scrolledBeforeNudge) <= SCROLL_TOLERANCE_PX, `and the code stayed where it was: ${scrolledBeforeNudge} then ${scrollTopOf(api)}`);
  assert(statusPosition(api).line === nudgeLine, `and the caret is on the line that was pressed: ${textOf(api, 'code-status-position')}`);

  await toTop(api);
}

export async function verifyCodeEditor(owner: Node, api: CodeEditorInspection, capture: CodeEditorCapture): Promise<void> {
  const facts: Record<string, unknown> = {};
  const mac = OS.hasFeature('macos');
  const command: Modifiers = mac ? { meta: true } : { ctrl: true };
  const wordJump: Modifiers = mac ? { alt: true } : { ctrl: true };
  const source = FileAccess.getFileAsString(LAB_SOURCE);
  assert(source.length > 0, `The source ${LAB_SOURCE} is in the build`);
  const sourceLines = source.split('\n');
  /** The first blank line of the source, which the paste and typing checks write a comment into: an edit that changes no behaviour. */
  const blankLine = sourceLines.indexOf('') + 1;
  assert(blankLine > 0, 'The source has a blank line');

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
  // The panel is there, editable, while the lab is compiled; the page is the bundled lab until the compiled one is ready.
  assert(textOf(api, 'code-status-run').startsWith('Compiling') || textOf(api, 'code-status-run').startsWith('Live.'), `The status bar says the lab is compiling, or already live: ${textOf(api, 'code-status-run')}`);
  await waitUntil('the lab to be compiled and live', () => textOf(api, 'code-status-run').startsWith('Live.'), UPDATE_DEADLINE_MS, () => `The status bar says: ${textOf(api, 'code-status-run')}`);
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
  let checkedCarets = 0;
  for (let line = 1; line <= 12; line += 1) {
    const text = sourceLines[line - 1] ?? '';
    const ranges = textSpansOf(api, line);
    assert(lineText(api, line) === text, `Line ${line} reads as the source: ${lineText(api, line)}`);
    assert(ranges.every((span, index) => span.start < span.end && span.end <= text.length && (index === 0 || (ranges[index - 1]?.end ?? 0) <= span.start)), `Line ${line}'s spans lie in the line, in order and apart`);
    // A line is one paragraph, laid out at the advance the grid has: the caret of each column is where the grid says (this is the grid being exact).
    for (let column = 0; column <= text.length; column += 1) {
      const caret = api.textCaret(`code-line-${line}`, column, 'after');
      const wanted = content.x + grid.gutterWidth + column * grid.advance;
      assert(caret !== null && Math.abs(caret.x - wanted) <= GRID_EXACT_PX, `Line ${line} column ${column} has its caret at ${caret?.x}, the grid says ${wanted}`);
      checkedCarets += 1;
    }
  }
  facts.checkedCarets = checkedCarets;

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
  // The selection of a line is the background of its spans, drawn by the paragraph where its glyphs are, and over the line break as one space of generated text.
  const middle = spansOf(api, 5);
  assert(middle.length > 1 && middle.every(span => String(span.style.backgroundColor).slice(0, SELECTION_BOX_PREFIX.length).toLowerCase() === SELECTION_BOX_PREFIX), 'Every span of a line in the middle of the selection has the selection behind it, the line break too');
  assert(middle.at(-1)?.inlay === ' ', 'and the selection goes on over the line break');
  const bandStart = api.textRanges('code-line-5', 0, 1)?.[0];
  assert(bandStart !== undefined, 'The first character of the line has a range');
  assert(near(pixelAt(owner, api, bandStart.x + 1, bandStart.y + SPAN_BAND_PROBE_PX), selectionColour), `The selection is in the raster: ${pixelAt(owner, api, bandStart.x + 1, bandStart.y + SPAN_BAND_PROBE_PX).join(',')} against ${selectionColour.join(',')}`);
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

  await verifyTouchSelection(api, source, capture);
  await click(boundaryAt(api, 6, 2));

  // Far along a long line the paint is still on the grid: a selection from one column to another has its edges, in the raster, where the grid says.
  const longLine = sourceLines.findIndex(text => text.length >= LONG_LINE_COLUMNS) + 1;
  assert(longLine > 0 && longLine <= 12, 'The first lines of the source include a long one');
  await click(boundaryAt(api, longLine, FAR_COLUMN_FROM));
  await click(boundaryAt(api, longLine, FAR_COLUMN_TO), 1, { shift: true });
  const farFrom = boundaryAt(api, longLine, FAR_COLUMN_FROM);
  const farTo = boundaryAt(api, longLine, FAR_COLUMN_TO);
  const farProblem = bandEdgesAre(rasterOf(owner, api), farFrom.y - grid.lineHeight / 2, farFrom.x, farTo.x, blend('#2563eb', 0x77 / LEVELS, THEME.background));
  assert(farProblem === undefined, `A selection from column ${FAR_COLUMN_FROM} to ${FAR_COLUMN_TO} of a long line has its edges on the grid: ${farProblem}`);

  // ---- A drag past the edge of the code scrolls it, and the selection goes on growing ----------------------------------------------------------------------
  const viewEdge = node(api, 'code-scroll').rect;
  const dragStart = boundaryAt(api, 4, 2);
  await waitForNewClickSequence();
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
  await verifyPointerAndScroll(api, sourceLines, command);

  // ---- The keyboard moves the caret ----------------------------------------------------------------------------------------------------------------------
  // On a line that starts with a word, a word jump from its start goes to the word's end. Which line that is depends on the lab's source: the first
  // such line from the fifth on (a line that starts with punctuation, a comment, is a group of its own for a word jump).
  const jumpIndex = sourceLines.findIndex((line, index) => index >= WORD_LINE_FROM - 1 && /^\w+/u.test(line) && (sourceLines[index + 1] ?? '').length >= SELECTED_PREFIX);
  assert(jumpIndex >= 0, `The source has a line that starts with a word from line ${WORD_LINE_FROM} on, and a line after it`);
  const jumpLine = jumpIndex + 1;
  const nextText = sourceLines[jumpIndex + 1] ?? '';
  await click(boundaryAt(api, jumpLine, 0));
  const beforeJump = textOf(api, 'code-status-position');
  await pressKey(Key.KeyRight, wordJump);
  const jumped = statusPosition(api);
  const word = /^\w+/u.exec(sourceLines[jumpIndex] ?? '');
  assert(jumped.line === jumpLine && word !== null && jumped.column === word[0].length, `A word jump moves over a word: from ${beforeJump} to column ${jumped.column} of ${JSON.stringify(sourceLines[jumpIndex])}, expected ${word?.[0].length}`);
  await pressKey(Key.KeyDown);
  assert(statusPosition(api).line === jumpLine + 1, 'Down moves a line');
  await pressKey(Key.KeyEnd);
  assert(statusPosition(api).column === nextText.length, 'End goes to the end of the line');
  await pressKey(Key.KeyHome, {}, 2);
  assert(statusPosition(api).column === 0, 'Home twice goes to the start of the line');
  await pressKey(Key.KeyRight, { shift: true }, SELECTED_PREFIX);
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get() === nextText.slice(0, SELECTED_PREFIX), `Shift with a movement selects: ${JSON.stringify(verifierClipboard.get())}`);

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
  assert((lineText(api, classAt.line) ?? '').includes('testID="inputs-lab" className="relative w-full h-full bg-"'), `Backspace removed the shade: ${lineText(api, classAt.line)}`);
  // Keystroke to ink, and the commit a keystroke costs.
  api.takeProfile();
  const typed = 'emerald-100';
  const keyToInk: number[] = [];
  const commitChars: number[] = [];
  const jsMs: number[] = [];
  const nativeCallMs: number[] = [];
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
    // The key's handling as one span of time (the controller, the render, the commit: the longest `events` sample holds the rest), and the share of it that is the native commit call.
    jsMs.push(Math.max(...sample.samples.map(entry => (entry.kind === 'events' ? entry.durationMs : 0))));
    nativeCallMs.push(sample.samples.reduce((total, entry) => total + (entry.kind === 'flush' ? entry.nativeCallMs : 0), 0));
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
  facts.keystrokeJs = { handlingMedianMs: round(percentile(jsMs, MEDIAN), HUNDRED), nativeCommitCallMedianMs: round(percentile(nativeCallMs, MEDIAN), HUNDRED) };
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
  const underlined = textSpansOf(api, brokenLine).filter(span => span.style.textDecorationLine === 'underline');
  assert(underlined.length > 0 && underlined.every(span => span.style.textDecorationStyle === 'wavy'), 'A span of the line is underlined, wavy');
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
  const errorText = lineText(api, typeAnchor.line) ?? '';
  const underlinedSpans = textSpansOf(api, typeAnchor.line).filter(span => span.style.textDecorationLine === 'underline');
  assert(underlinedSpans.length === 1 && errorText.slice(underlinedSpans[0]?.start, underlinedSpans[0]?.end) === 'label', `The span "label" is underlined, and nothing else on the line: ${underlinedSpans.map(span => errorText.slice(span.start, span.end)).join('|')}`);
  const errorSpan = underlinedSpans[0];
  assert(errorSpan !== undefined, 'There is an underlined span');
  assert(errorSpan.style.textDecorationStyle === 'wavy', `The underline is wavy: ${String(errorSpan.style.textDecorationStyle)}`);
  assert(String(errorSpan.style.textDecorationColor).slice(0, THEME.error.length).toLowerCase() === THEME.error, `in the error colour: ${String(errorSpan.style.textDecorationColor)}`);
  const labelRange = api.textRanges(`code-line-${typeAnchor.line}`, errorSpan.start, errorSpan.end)?.[0];
  assert(labelRange !== undefined, 'The underlined range is on the page');
  const labelColumnX = node(api, 'code-content').rect.x + gridOf(api).gutterWidth + typeAnchor.column * gridOf(api).advance;
  assert(Math.abs(labelRange.x - labelColumnX) <= GRID_EXACT_PX, 'at the column tsc reports (scripts/live-compile-agreement.mjs): the name being declared');
  // The wave is in the raster: red pixels under the text on more than one row of pixels (a solid line is one).
  const waveImage = grab(owner);
  const waveRatio = waveImage.getWidth() / api.snapshot().width;
  const waveRows = new Set<number>();
  const errorLevels = hexLevels(THEME.error);
  for (let y = Math.floor((labelRange.y + labelRange.height / 2) * waveRatio); y < Math.ceil((labelRange.y + labelRange.height) * waveRatio); y += 1) {
    for (let x = Math.floor(labelRange.x * waveRatio); x < Math.ceil((labelRange.x + labelRange.width) * waveRatio); x += 1) {
      if (near(levels(waveImage.getPixel(x, y)), errorLevels, WAVE_COLOUR_TOLERANCE_LEVELS)) waveRows.add(y);
    }
  }
  assert(waveRows.size >= WAVE_MIN_ROWS, `The underline in the raster is a wave: red on ${waveRows.size} rows of pixels under "label"`);
  facts.waveRows = waveRows.size;
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
  await waitUntil('an inlay hint on the line of "sizes"', () => spansOf(api, sizesAt.line).some(span => span.inlay?.startsWith(': ') === true), UPDATE_DEADLINE_MS);
  const hint = spansOf(api, sizesAt.line).find(span => span.inlay?.startsWith(': ') === true);
  assert(hint?.inlay !== undefined, 'There is an inlay hint');
  const hintOffset = sizesAt.column + 'const sizes'.length;
  assert(hint.start === hintOffset && hint.end === hintOffset, 'right after the name it describes, at an offset of the line\'s own text');
  assert(!(lineText(api, sizesAt.line) ?? '').includes(hint.inlay), 'and not in the text of the line: the line is the document\'s');
  // A caret can stand on either side of it, a hint's width apart: the grid said so, and so does the paragraph.
  const beforeHint = api.textCaret(`code-line-${sizesAt.line}`, hintOffset, 'before');
  const afterHint = api.textCaret(`code-line-${sizesAt.line}`, hintOffset, 'after');
  assert(beforeHint !== null && afterHint !== null && Math.abs(afterHint.x - beforeHint.x - hint.inlay.length * gridOf(api).advance) <= GRID_EXACT_PX, `The carets either side of the hint are its width apart: ${beforeHint?.x} and ${afterHint?.x}`);
  facts.inlayHint = hint.inlay;
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

  // ---- A line with wide characters is placed by its text, not by the grid ----------------------------------------------------------------------------------------
  await toTop(api);
  await click(boundaryAt(api, blankLine, 0));
  verifierClipboard.set(WIDE_COMMENT);
  await pressKey(Key.KeyV, command);
  assert(lineText(api, blankLine) === WIDE_COMMENT, `Paste put the comment in the blank line ${blankLine}: ${lineText(api, blankLine)}`);
  assert(statusPosition(api).line === blankLine && statusPosition(api).column === WIDE_COMMENT.length, `The caret is after the pasted text: ${textOf(api, 'code-status-position')}`);
  const wideLine = `code-line-${blankLine}`;
  const wideCaret = (offset: number): LayoutRect => {
    const rect = api.textCaret(wideLine, offset, 'after');
    assert(rect !== null, `The wide line has a caret at ${offset}`);
    return rect;
  };
  // How far from the grid the text's own carets are: the largest distance, in columns, between a caret and the column of its offset (an offset inside an emoji has no caret).
  let offGrid = 0;
  for (let offset = 0; offset <= WIDE_COMMENT.length; offset += 1) {
    const unit = WIDE_COMMENT.charCodeAt(offset);
    if (offset > 0 && offset < WIDE_COMMENT.length && unit >= LOW_SURROGATE_START && unit <= LOW_SURROGATE_END) continue;
    offGrid = Math.max(offGrid, Math.abs((wideCaret(offset).x - wideCaret(0).x) / gridOf(api).advance - offset));
  }
  facts.wideLine = { codeUnits: WIDE_COMMENT.length, mostColumnsOffTheGrid: round(offGrid, HUNDRED) };
  assert(offGrid >= WIDE_OFF_GRID_COLUMNS, `The carets of the line are not where the grid would put them (at most ${round(offGrid, HUNDRED)} columns off): this case needs wide characters`);
  assert(Math.abs(caretRect(api).x - wideCaret(WIDE_COMMENT.length).x) <= COLUMN_TOLERANCE_PX, `The caret at the end of the line is where the text puts it: ${caretRect(api).x} against ${wideCaret(WIDE_COMMENT.length).x}`);
  const wideY = node(api, wideLine).rect.y + gridOf(api).lineHeight / 2;
  const between = (from: number, to: number, share: number): Vector2 => new Vector2(wideCaret(from).x + share * (wideCaret(to).x - wideCaret(from).x), wideY);
  for (const [share, landed] of [[BELOW_HALF, WIDE_FIRST_START], [ABOVE_HALF, WIDE_FIRST_END]] as const) {
    await click(between(WIDE_FIRST_START, WIDE_FIRST_END, share));
    assert(statusPosition(api).line === blankLine && statusPosition(api).column === landed, `A press ${share * HUNDRED} percent across an emoji lands on offset ${landed}: ${textOf(api, 'code-status-position')}`);
    assert(Math.abs(caretRect(api).x - wideCaret(landed).x) <= COLUMN_TOLERANCE_PX, `and the caret is drawn there: ${caretRect(api).x} against ${wideCaret(landed).x}`);
  }
  // Right moves over a whole emoji, and the caret is never between its two code units.
  await click(between(WIDE_FIRST_START, WIDE_FIRST_END, BELOW_HALF));
  await pressKey(Key.KeyRight);
  assert(statusPosition(api).column === WIDE_FIRST_END, `Right moves over the emoji, both its code units: ${textOf(api, 'code-status-position')}`);
  assert(Math.abs(caretRect(api).x - wideCaret(WIDE_FIRST_END).x) <= COLUMN_TOLERANCE_PX, 'and the caret is after it');
  // A selection over the three emoji: its band is under exactly them in the raster, however wide they are.
  await click(between(WIDE_FIRST_START, WIDE_FIRST_END, BELOW_HALF));
  await pressKey(Key.KeyRight, { shift: true }, EMOJI_COUNT);
  await pressKey(Key.KeyC, command);
  assert(verifierClipboard.get() === WIDE_COMMENT.slice(WIDE_FIRST_START, WIDE_RUN_END), `The three emoji are selected: ${JSON.stringify(verifierClipboard.get())}`);
  const wideBand = api.textRanges(wideLine, WIDE_FIRST_START, WIDE_RUN_END)?.[0];
  assert(wideBand !== undefined, 'The selected range is on the page');
  const wideProblem = bandEdgesAre(rasterOf(owner, api), wideBand.y, wideBand.x, wideBand.x + wideBand.width, blend('#2563eb', 0x77 / LEVELS, THEME.background));
  assert(wideProblem === undefined, `The selection band is under the three emoji and no more: ${wideProblem}`);
  // The picture first: a check that fails leaves what it saw.
  await capture('code-editor-08-wide', OVERFLOWING);
  // The two CJK characters have ink under them: glyphs of a system font where the platform has one (the text server resolves them to it), a hex box each where it has none.
  const cjkFonts = fontsOfText('mono', WIDE_COMMENT.slice(CJK_START, CJK_END));
  if (OS.getName() === 'macOS') assert(cjkFonts.length === 2 && cjkFonts.every(font => font !== undefined), `macOS has a system font with CJK characters, and the editor's font falls back to it: ${JSON.stringify(cjkFonts)}`);
  const cjkBand = api.textRanges(wideLine, CJK_START, CJK_END)?.[0];
  assert(cjkBand !== undefined, 'The CJK characters are on the page');
  const cjkRaster = rasterOf(owner, api);
  let cjkInk = 0;
  for (let y = Math.floor(cjkBand.y); y < Math.ceil(cjkBand.y + cjkBand.height); y += 1) {
    for (let x = Math.floor(cjkBand.x); x < Math.ceil(cjkBand.x + cjkBand.width); x += 1) {
      if (Math.max(...cjkRaster.colourAt(x, y)) > INK_MIN_LEVEL) cjkInk += 1;
    }
  }
  facts.cjk = { fonts: cjkFonts, inkPixels: cjkInk };
  assert(cjkInk > 0, `There is ink under the CJK characters (${JSON.stringify(cjkFonts)}): nothing is drawn for them`);

  // ---- Reset: back to the source, and the page with it ---------------------------------------------------------------------------------------------------
  await click(centerOf(node(api, 'code-reset').rect));
  await waitUntil('the source again', () => [...drawnLines(api).keys()].every(number => lineText(api, number) === sourceLines[number - 1]), UPDATE_DEADLINE_MS);
  await waitUntil('the page to be as it was', () => near(pageBackground(owner, api), hexLevels(PAGE_BACKGROUND_ORIGINAL)), UPDATE_DEADLINE_MS);
  await waitUntil('the type check to find nothing', () => textOf(api, 'code-status-check') === 'No problems', UPDATE_DEADLINE_MS);
  assert(textOf(api, 'inputs-next') === 'Next 3', `The counter is still 3 after the reset: a reset is an edit like any other: ${textOf(api, 'inputs-next')}`);

  // ---- The panel hidden and shown again keeps what was typed; the lab on the stage keeps its state -------------------------------------------------------------
  await toTop(api);
  assert(sourceLines[blankLine - 1] === '', `Line ${blankLine} of the source is blank`);
  await click(boundaryAt(api, blankLine, 0));
  await typeText(NOTE);
  assert(lineText(api, blankLine) === NOTE, `The comment is in line ${blankLine}: ${lineText(api, blankLine)}`);
  const counterBefore = textOf(api, 'inputs-next');
  await waitUntil('the comment to reach the page', () => textOf(api, 'code-status-run').startsWith('Swapped in'), UPDATE_DEADLINE_MS);
  await click(centerOf(node(api, 'toggle-code').rect));
  assert(!hasNode(api, 'code-editor'), 'Hide Code closes the panel');
  assert(textOf(api, 'inputs-next') === counterBefore, `and the lab on the stage keeps its state: ${textOf(api, 'inputs-next')} against ${counterBefore}`);
  await click(centerOf(node(api, 'toggle-code').rect));
  await waitUntil('the panel again', () => hasNode(api, `code-line-${blankLine}`));
  assert(lineText(api, blankLine) === NOTE, 'Show Code brings the edited text back');
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
