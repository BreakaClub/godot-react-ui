import { Engine, Image, InputEventKey, Key, Node, OS, Vector2, Window } from 'godot';
import type { NativeActivity, NativeProfile, RendererProfile, UIHandle, UISelection } from '../../src';
import type { LayoutRect, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import { GOLDEN_TEXTS, type GoldenInlay, type GoldenText } from './rich-text-golden';
import { PAGES, displayText, inlaysOf, sourceText, type RichPage, type RichSample } from './rich-text-data';
import type { RichTextLabProps } from './rich-text-lab';
import { richTextHandles } from './rich-text-lab';
import { readOurText, type OurText } from './verify-text-styles';
import { click, drag } from './verify-text-input';
import { grab, settleFrames } from './verify-filters';
import { assertionTally, parseVerifierEvent, verifierClipboard } from './verifier-input';

/**
 * The `rich-text` section of the interaction verifier (docs/tracks/rich-text.md). Every page of the rich text lab, nested `Text` with
 * coloured, weighted and decorated spans and inlays, is shown at device pixel ratios one and two and held to the numbers headless
 * Chrome reports for the same tree as nested `<span>`s (`rich-text-golden.ts`, written by `scripts/rich-text-reference.mjs --golden`):
 * the box of each text, each line, and where each character is; the pictures are captured for the per channel comparison
 * (`scripts/rich-text-reference.mjs --diff`). The geometry queries are held to the same characters (a caret at each, a click on each
 * half of each, a monospace column N at N times the advance), clicks and drags around an inlay and across spans select what they
 * should and copy it, a change of a span's colour is a small commit that shapes nothing again, and the queries are right under a scale
 * and a rotation. Controls show that the comparisons fail for what they should.
 */
export interface RichTextInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showRichText(props: RichTextLabProps): void;
  textLines(testID: string): unknown;
  selection(): UISelection | undefined;
  activity(): NativeActivity;
  profile(enabled: boolean): void;
  takeProfile(): { js: RendererProfile; native: NativeProfile };
}

/** `overflowing`: test ids of nodes that reach past the window by design. */
export type RichTextCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

/** The tolerance of a line's box, edges and baseline against Chrome's, in logical pixels: "within a pixel", as the text styles are held. */
const TOLERANCE_PX = 1;
/**
 * The tolerance of one character's edges against Chrome's. Chrome and the library both place glyphs at quarter pixels, so an edge is
 * as near as a quarter pixel and a half; the worst difference found is in the log (`GODOT_REACT_RICH_TEXT_CHARS`).
 */
const CHARACTER_TOLERANCE_PX = 0.5;
/** How far a monospace caret may be from its column: the column is the line's own advance times N, on one shaped paragraph. */
const COLUMN_TOLERANCE_PX = 0.01;
/** How far the line's advance may be from Chrome's. */
const ADVANCE_TOLERANCE_PX = 0.05;
const RETINA_SCALE = 2;
const FRAME_POLL_MS = 10;
const SETTLE_FRAMES = 4;
const LEVELS = 255;
/** The highlight (`#3b82f659`) over white is this much bluer than red; ink is as red as it is blue. */
const HIGHLIGHT_BLUENESS = 30;
/** A point is placed this far (a share of a character's width) inside the character's edge. */
const INSIDE_SHARE = 0.25;
/** A pointer presses inside the line, this far (logical px) above its baseline: the middle of the x-height. */
const ABOVE_BASELINE_PX = 4;
/** Hit tests and caret rectangles are checked at every this many characters of a long text. */
const CHARACTER_STRIDE = 2;
/** The width of a page; the window at ratio two must have at least this many logical pixels. */
const PAGE_WIDTH_PX = 540;
/** The most a space that a line wraps at may hang past the end of the line's text: one of Open Sans at 16 px is 4.3 px. */
const MAX_HANGING_SPACE_PX = 6;
/** A caret has no width; its height is the line's, as a range rectangle's is. */
const CARET_EPSILON_PX = 0.01;
/** A commit that changes one span's colour carries at most this many characters of JSON (the `spans` of one short line). */
const RECOLOUR_COMMIT_CHARS = 400;
/** Dominance of blue over red (of 255) that makes a pixel the new tone's, and red over blue the old one's. */
const TONE_LEVELS = 80;
/** What `scale-150` scales by. */
const SCALE_CLASS_FACTOR = 1.5;
/** The lines of the file whose cost is measured. */
const FILE_LINES = 1000;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function window(owner: Node): Window {
  const found = owner.getWindow();
  assert(found, 'The demo has its window');
  return found;
}

/** The window's content scale: input is placed in window pixels, and the lab's numbers are logical. */
let contentScale = 1;

function windowPoint(at: Vector2): Vector2 {
  return new Vector2(at.x * contentScale, at.y * contentScale);
}

function node(api: RichTextInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

function handle(id: string): UIHandle {
  const found = richTextHandles.get(id);
  assert(found, `The lab has no handle for ${id}`);
  return found;
}

function golden(id: string): GoldenText {
  const found = GOLDEN_TEXTS[id];
  assert(found, `Chrome has no numbers for ${id}; run scripts/rich-text-reference.mjs --golden`);
  return found;
}

function samplesOf(page: RichPage): readonly RichSample[] {
  return page.samples;
}

const ALL_SAMPLES: readonly RichSample[] = PAGES.flatMap(samplesOf);

function sampleOf(id: string): RichSample {
  const found = ALL_SAMPLES.find(candidate => candidate.id === id);
  assert(found, `No sample ${id}`);
  return found;
}

/** A check that must fail: the control for a comparison that has to be able to tell what it compares. */
async function expectFailure(what: string, run: () => void | Promise<void>): Promise<void> {
  let failed = false;
  try {
    await run();
  } catch {
    failed = true;
  }
  assertionTally.count += 1;
  if (!failed) throw new Error(`Control: ${what} passed, so the check cannot tell it apart`);
}

// ---- The numbers ---------------------------------------------------------------------------------------------------------

/** One number that is further from Chrome's than the tolerance allows. */
interface Deviation {
  readonly what: string;
  readonly ours: number;
  readonly chrome: number;
}

/** The boxes and lines of `ours` further than `TOLERANCE_PX` from `reference`'s. */
function deviations(box: LayoutRect, ours: OurText, reference: GoldenText): Deviation[] {
  const found: Deviation[] = [];
  const near = (what: string, a: number, b: number): void => {
    if (Math.abs(a - b) > TOLERANCE_PX) found.push({ what, ours: a, chrome: b });
  };
  near('box x', box.x, reference.box.x);
  near('box y', box.y, reference.box.y);
  near('box width', box.width, reference.box.width);
  near('box height', box.height, reference.box.height);
  if (ours.lines.length !== reference.lines.length) {
    found.push({ what: 'line count', ours: ours.lines.length, chrome: reference.lines.length });
    return found;
  }
  reference.lines.forEach((chrome, index) => {
    const line = ours.lines[index];
    assert(line !== undefined, 'a line has gone');
    near(`line ${index} baseline`, line.baseline, chrome.baseline);
    near(`line ${index} left`, line.x, chrome.x);
    near(`line ${index} right`, line.x + line.width, chrome.x + chrome.width);
  });
  return found;
}

function describe(found: readonly Deviation[]): string {
  return found.map(each => `${each.what}: ${each.ours.toFixed(2)} against Chrome's ${each.chrome.toFixed(2)}`).join('; ');
}

/** How far from Chrome's numbers the characters of the texts are, for the report. */
interface Spread {
  count: number;
  sum: number;
  worst: number;
}

function addTo(spread: Spread, delta: number): void {
  spread.count += 1;
  spread.sum += delta;
  spread.worst = Math.max(spread.worst, Math.abs(delta));
}

function showSpread(label: string, spread: Spread): string {
  return `${label} n=${spread.count} mean=${(spread.sum / Math.max(1, spread.count)).toFixed(3)} worst=${spread.worst.toFixed(3)}`;
}

/** The UTF-16 length of the source character that starts at `entry` of `reference`'s characters. */
function characterLength(sample: RichSample, reference: GoldenText, index: number): number {
  const start = reference.chars[index]?.[0];
  assert(start !== undefined, `${sample.id}: no character ${index}`);
  const next = reference.chars[index + 1]?.[0] ?? sourceText(sample.runs).length;
  return next - start;
}

/** The first rectangle of `start..end` of a text: where its first line's part of the range is. */
function firstRect(id: string, start: number, end: number): LayoutRect {
  const rects = handle(id).getRangeRects(start, end);
  assert(rects !== undefined && rects[0] !== undefined, `${id}: getRangeRects(${start}, ${end}) is empty`);
  return rects[0];
}

/** Every character of a text in the library's rectangles against Chrome's, to a quarter pixel and a half. */
function charactersAgainstChrome(sample: RichSample, spreads: { left: Spread; right: Spread }, label: string): string[] {
  const reference = golden(sample.id);
  const failures: string[] = [];
  reference.chars.forEach(([start, left, right], index) => {
    if (right - left <= 0) return;
    const rect = firstRect(sample.id, start, start + characterLength(sample, reference, index));
    addTo(spreads.left, rect.x - left);
    addTo(spreads.right, rect.x + rect.width - right);
    if (Math.abs(rect.x - left) > CHARACTER_TOLERANCE_PX || Math.abs(rect.x + rect.width - right) > CHARACTER_TOLERANCE_PX) {
      failures.push(`${label}: ${sample.id} character at ${start}: ${rect.x.toFixed(2)} to ${(rect.x + rect.width).toFixed(2)} against Chrome's ${left.toFixed(2)} to ${right.toFixed(2)}`);
    }
  });
  return failures;
}

/** Every inlay's left and right edge (the caret on each side of it) against Chrome's, one group of inlays at an offset at a time. */
function inlaysAgainstChrome(sample: RichSample, label: string): string[] {
  const reference = golden(sample.id);
  const failures: string[] = [];
  for (const group of inlayGroups(reference.inlays)) {
    const before = handle(sample.id).getCaretRect(group.at, 'before');
    const after = handle(sample.id).getCaretRect(group.at, 'after');
    assert(before !== undefined && after !== undefined, `${sample.id}: no caret at ${group.at}`);
    if (Math.abs(before.x - group.left) > CHARACTER_TOLERANCE_PX || Math.abs(after.x - group.right) > CHARACTER_TOLERANCE_PX) {
      failures.push(`${label}: ${sample.id} inlays at ${group.at}: ${before.x.toFixed(2)} to ${after.x.toFixed(2)} against Chrome's ${group.left.toFixed(2)} to ${group.right.toFixed(2)}`);
    }
  }
  return failures;
}

interface InlayGroup {
  readonly at: number;
  readonly left: number;
  readonly right: number;
  readonly line: number;
}

/** The inlays Chrome reports, those at one source offset as one group. */
function inlayGroups(inlays: readonly GoldenInlay[]): InlayGroup[] {
  const groups: InlayGroup[] = [];
  for (const entry of inlays) {
    const last = groups.at(-1);
    if (last !== undefined && last.at === entry.at && last.line === entry.line) groups[groups.length - 1] = { ...last, right: entry.right };
    else groups.push({ at: entry.at, left: entry.left, right: entry.right, line: entry.line });
  }
  return groups;
}

/** Every text of `page` held to Chrome's numbers; returns how many were compared. */
function verifyNumbers(api: RichTextInspection, page: RichPage, label: string, differing: string[], spreads: { left: Spread; right: Spread }): number {
  for (const sample of page.samples) {
    const reference = golden(sample.id);
    const found = deviations(node(api, sample.id).rect, readOurText(api.textLines(sample.id)), reference);
    assertionTally.count += 1;
    if (found.length > 0) differing.push(`${label}: ${sample.id} (${sample.note}): ${describe(found)}`);
    differing.push(...charactersAgainstChrome(sample, spreads, label), ...inlaysAgainstChrome(sample, label));
    // The text the node holds, which its accessible name and its snapshot are made from, is the source text: no inlay in it.
    assert(node(api, sample.id).text === sourceText(sample.runs), `${sample.id}: the node's text is ${JSON.stringify(node(api, sample.id).text)}, not the source ${JSON.stringify(sourceText(sample.runs))}`);
    assertionTally.count += 2;
  }
  return page.samples.length;
}

// ---- The geometry queries --------------------------------------------------------------------------------------------------

/** What the queries must answer at a point: the offset, and which side of an inlay it is on. */
interface Place {
  readonly offset: number;
  readonly side: 'before' | 'after';
}

/** The source offsets at which Chrome has an inlay in `sample`. */
function inlayOffsets(sample: RichSample): Set<number> {
  return new Set(inlaysOf(sample.runs).map(entry => entry.at));
}

/** The source text of an inlay-free count: how many characters of generated text lie before source offset `offset`. */
function inlayCharactersBefore(sample: RichSample, offset: number): number {
  return inlaysOf(sample.runs).filter(entry => entry.at < offset).reduce((total, entry) => total + [...entry.text].length, 0);
}

/**
 * Click each half of each character: the left quarter is the boundary before it and the right quarter the one after, on the side an
 * inlay at that boundary leaves. `countInlays` expects the offsets of the display text instead, which the control uses.
 */
function verifyHitTesting(sample: RichSample, countInlays = false): number {
  const reference = golden(sample.id);
  const inlays = inlayOffsets(sample);
  const text = handle(sample.id);
  let checked = 0;
  reference.chars.forEach(([start, left, right, lineIndex], index) => {
    if (index % CHARACTER_STRIDE !== 0 || right - left <= 0) return;
    const line = reference.lines[lineIndex];
    assert(line !== undefined, `${sample.id}: no line ${lineIndex}`);
    const y = line.baseline - ABOVE_BASELINE_PX;
    const end = start + characterLength(sample, reference, index);
    const shift = (offset: number): number => (countInlays ? inlayCharactersBefore(sample, offset) : 0);
    const expectations: [number, Place][] = [
      [left + (right - left) * INSIDE_SHARE, { offset: start + shift(start), side: 'after' }],
      [right - (right - left) * INSIDE_SHARE, { offset: end + shift(end), side: inlays.has(end) ? 'before' : 'after' }],
    ];
    for (const [x, expected] of expectations) {
      const found = text.getOffsetAtPoint(x, y);
      assert(found !== undefined && found.offset === expected.offset && found.side === expected.side,
        `${sample.id}: a click at ${x.toFixed(2)}, ${y.toFixed(2)} (character ${start}) is ${JSON.stringify(found)}, not ${JSON.stringify(expected)}`);
      checked += 1;
    }
  });
  return checked;
}

/** A click inside an inlay is on the nearer side of it. */
function verifyInlayClicks(sample: RichSample): number {
  const reference = golden(sample.id);
  let checked = 0;
  for (const group of inlayGroups(reference.inlays)) {
    const line = reference.lines[group.line];
    assert(line !== undefined, `${sample.id}: no line ${group.line}`);
    const y = line.baseline - ABOVE_BASELINE_PX;
    const width = group.right - group.left;
    for (const [x, side] of [[group.left + width * INSIDE_SHARE, 'before'], [group.right - width * INSIDE_SHARE, 'after']] as const) {
      const found = handle(sample.id).getOffsetAtPoint(x, y);
      assert(found !== undefined && found.offset === group.at && found.side === side,
        `${sample.id}: a click inside the inlay at ${group.at} (${x.toFixed(2)}) is ${JSON.stringify(found)}, not ${group.at} ${side}`);
      checked += 1;
    }
  }
  return checked;
}

/** A caret at each character, on each side, has no width and the height of the line, as a range rectangle does. */
function verifyCarets(sample: RichSample): number {
  const reference = golden(sample.id);
  let checked = 0;
  reference.chars.forEach(([start, left, right], index) => {
    if (index % CHARACTER_STRIDE !== 0 || right - left <= 0) return;
    const rect = firstRect(sample.id, start, start + characterLength(sample, reference, index));
    const caret = handle(sample.id).getCaretRect(start, 'after');
    assert(caret !== undefined, `${sample.id}: no caret at ${start}`);
    assert(Math.abs(caret.x - rect.x) <= CARET_EPSILON_PX && caret.width === 0, `${sample.id}: the caret at ${start} is at ${caret.x}, the character at ${rect.x}`);
    assert(Math.abs(caret.y - rect.y) <= CARET_EPSILON_PX && Math.abs(caret.height - rect.height) <= CARET_EPSILON_PX, `${sample.id}: the caret at ${start} is not as tall as its line`);
    checked += 1;
  });
  return checked;
}

/** A monospace column N is at N times the advance: every caret of the line is on its column. */
function verifyColumns(sampleId: string): { advance: number; worst: number } {
  const sample = sampleOf(sampleId);
  const length = sourceText(sample.runs).length;
  const first = handle(sampleId).getCaretRect(0, 'after');
  const last = handle(sampleId).getCaretRect(length, 'after');
  assert(first !== undefined && last !== undefined, `${sampleId}: no carets`);
  const advance = (last.x - first.x) / length;
  const reference = golden(sampleId);
  const chromeFirst = reference.chars[0];
  const chromeLast = reference.chars.at(-1);
  assert(chromeFirst !== undefined && chromeLast !== undefined, `${sampleId}: Chrome has no characters`);
  const chromeAdvance = (chromeLast[2] - chromeFirst[1]) / length;
  assert(Math.abs(advance - chromeAdvance) <= ADVANCE_TOLERANCE_PX, `${sampleId}: the advance is ${advance.toFixed(4)}, Chrome's ${chromeAdvance.toFixed(4)}`);
  let worst = 0;
  for (let column = 0; column <= length; column += 1) {
    const caret = handle(sampleId).getCaretRect(column, 'after');
    assert(caret !== undefined, `${sampleId}: no caret at ${column}`);
    worst = Math.max(worst, Math.abs(caret.x - (first.x + column * advance)));
  }
  assert(worst <= COLUMN_TOLERANCE_PX, `${sampleId}: a caret is ${worst.toFixed(4)} px from its column (the advance is ${advance.toFixed(4)})`);
  return { advance, worst };
}

/**
 * At a soft wrap an offset has two positions: the end of the line above (`before`) and the start of the line below (`after`), and a click
 * past the end of the line above is on the line above.
 */
function verifyWraps(sampleId: string): number {
  const reference = golden(sampleId);
  let checked = 0;
  for (let line = 1; line < reference.lines.length; line += 1) {
    const next = reference.chars.findIndex(entry => entry[3] === line);
    const first = reference.chars[next];
    const last = reference.chars[next - 1];
    assert(first !== undefined && last !== undefined, `${sampleId}: no characters at the wrap of line ${line}`);
    const [offset, left] = first;
    const after = handle(sampleId).getCaretRect(offset, 'after');
    const before = handle(sampleId).getCaretRect(offset, 'before');
    assert(after !== undefined && before !== undefined, `${sampleId}: no carets at the wrap ${offset}`);
    assert(Math.abs(after.x - left) <= CHARACTER_TOLERANCE_PX, `${sampleId}: the caret after the wrap at ${offset} is at ${after.x.toFixed(2)}, Chrome's character at ${left.toFixed(2)}`);
    // The end of the line above is after the space the line wraps at, which hangs past Chrome's end of that line's text.
    assert(before.x >= last[2] - CHARACTER_TOLERANCE_PX && before.x - last[2] <= MAX_HANGING_SPACE_PX,
      `${sampleId}: the caret before the wrap at ${offset} is at ${before.x.toFixed(2)}, the end of the line above is at ${last[2].toFixed(2)} (and a space)`);
    assert(before.y < after.y && Math.abs(after.y - before.y - (reference.lines[line]?.top ?? 0) + (reference.lines[line - 1]?.top ?? 0)) <= TOLERANCE_PX,
      `${sampleId}: the carets either side of the wrap at ${offset} are not a line apart (${before.y.toFixed(2)}, ${after.y.toFixed(2)})`);
    // A click below the first character of the next line and one past the end of the line above, on the line above.
    const row = reference.lines[line - 1];
    assert(row !== undefined, `${sampleId}: no line ${line - 1}`);
    const past = handle(sampleId).getOffsetAtPoint(row.x + row.width + 40, row.baseline - ABOVE_BASELINE_PX);
    assert(past !== undefined && past.offset < offset, `${sampleId}: a click past the end of line ${line - 1} is at ${JSON.stringify(past)}, which is not on that line (it ends before ${offset})`);
    checked += 4;
  }
  return checked;
}

/** The queries are refused for what they must refuse: past the end, inside a surrogate pair. */
function verifyRefusals(): void {
  const text = handle('code-line');
  const length = sourceText(sampleOf('code-line').runs).length;
  for (const run of [() => text.getCaretRect(length + 1), () => text.getRangeRects(0, length + 1), () => text.getRangeRects(3, 2), () => text.getCaretRect(-1)]) {
    let refused: unknown;
    try {
      run();
    } catch (error) {
      refused = error;
    }
    assert(refused instanceof RangeError, `A query past the text's end or backwards threw ${String(refused)}, not a RangeError`);
  }
  assert(text.getCaretRect(length) !== undefined, 'The end of the text is a position');
  assert(text.getRangeRects(2, 2)?.length === 0, 'An empty range has no rectangles');
}

// ---- Selection ---------------------------------------------------------------------------------------------------------------

function keyEvent(keycode: Key, pressed: boolean, ctrl: boolean, meta: boolean): void {
  const event = new InputEventKey();
  event.keycode = keycode;
  event.physicalKeycode = keycode;
  event.keyLabel = keycode;
  event.pressed = pressed;
  event.ctrlPressed = ctrl;
  event.metaPressed = meta;
  parseVerifierEvent(event);
}

/** The key chord that copies: Command on macOS, Control elsewhere. */
async function copyChord(): Promise<void> {
  const meta = OS.getName() === 'macOS';
  for (const pressed of [true, false]) {
    keyEvent(Key.KeyC, pressed, !meta, meta);
    await settleFrames();
  }
}

/** The point inside source character `index` of a text, in logical pixels, as Chrome has it. */
function pointInCharacter(sample: RichSample, index: number, share = INSIDE_SHARE): Vector2 {
  const reference = golden(sample.id);
  const entry = reference.chars[index];
  assert(entry !== undefined, `${sample.id}: Chrome has no character ${index}`);
  const [, left, right, lineIndex] = entry;
  const line = reference.lines[lineIndex];
  assert(line !== undefined, `${sample.id}: Chrome has no line ${lineIndex}`);
  return new Vector2(left + (right - left) * share, line.baseline - ABOVE_BASELINE_PX);
}

/** Drag from just inside the left of character `from` to just inside the left of `to`, which selects from before `from` to before `to`. */
async function selectBetween(api: RichTextInspection, sample: RichSample, from: number, to: number): Promise<UISelection | undefined> {
  await drag(windowPoint(pointInCharacter(sample, from)), windowPoint(pointInCharacter(sample, to)));
  return api.selection();
}

/** The first and last x (logical) of a row of the picture that has the selection highlight's blue tint, or `undefined` for none. */
function highlightedSpan(image: Image, ratio: number, y: number, from: number, to: number): [number, number] | undefined {
  const row = Math.round(y * ratio);
  let first: number | undefined;
  let last = 0;
  for (let x = Math.floor(from * ratio); x < Math.ceil(to * ratio); x += 1) {
    const color = image.getPixel(x, row);
    if ((color.b - color.r) * LEVELS >= HIGHLIGHT_BLUENESS) {
      first ??= x;
      last = x + 1;
    }
  }
  return first === undefined ? undefined : [first / ratio, last / ratio];
}

async function verifySelecting(owner: Node, api: RichTextInspection): Promise<number> {
  let checked = 0;
  // Across spans: a drag over the first four spans of a line selects exactly that part of the source, and copies it.
  api.showRichText({ page: 'colours' });
  await settleFrames();
  const code = sampleOf('code-line');
  const codeSource = sourceText(code.runs);
  let selection = await selectBetween(api, code, 2, 20);
  assert(selection !== undefined && selection.text === codeSource.slice(2, 20), `code-line: a drag across spans selected ${JSON.stringify(selection?.text)}, not ${JSON.stringify(codeSource.slice(2, 20))}`);
  assert(selection.anchor.offset === 2 && selection.focus.offset === 20 && selection.anchor.node.id === handle('code-line').id, 'code-line: the ends of the selection are not at the offsets dragged');
  verifierClipboard.set('before the copy');
  await copyChord();
  assert(verifierClipboard.get() === codeSource.slice(2, 20), `code-line: copying put ${JSON.stringify(verifierClipboard.get())} on the clipboard`);
  checked += 3;
  // A double click on a word of a paragraph with a span boundary inside a word selects the whole word.
  api.showRichText({ page: 'columns' });
  await settleFrames();
  const spans = sampleOf('columns-spans');
  const digits = sourceText(spans.runs);
  await click(windowPoint(pointInCharacter(spans, 5)), 2);
  selection = api.selection();
  assert(selection !== undefined && selection.text === digits, `columns-spans: a double click inside the red span selected ${JSON.stringify(selection?.text)}, not the whole word ${digits}`);
  checked += 1;
  // Across an inlay: the selection and the copy leave it out, the highlight runs through it.
  api.showRichText({ page: 'inlays' });
  await settleFrames();
  const hint = sampleOf('inlay-hint');
  const hintSource = sourceText(hint.runs);
  selection = await selectBetween(api, hint, 5, 11);
  assert(selection !== undefined && selection.text === hintSource.slice(5, 11), `inlay-hint: a drag across the inlay selected ${JSON.stringify(selection?.text)}, not ${JSON.stringify(hintSource.slice(5, 11))}`);
  verifierClipboard.set('before the copy');
  await copyChord();
  assert(verifierClipboard.get() === hintSource.slice(5, 11), `inlay-hint: copying across the inlay put ${JSON.stringify(verifierClipboard.get())} on the clipboard`);
  const reference = golden('inlay-hint');
  const rects = handle('inlay-hint').getRangeRects(5, 11);
  assert(rects !== undefined && rects.length === 1, 'inlay-hint: the range across the inlay is one rectangle');
  const first = reference.chars[5];
  const last = reference.chars[11];
  assert(first !== undefined && last !== undefined, 'Chrome has no characters 5 and 11');
  const rect = rects[0];
  assert(rect !== undefined && Math.abs(rect.x - first[1]) <= CHARACTER_TOLERANCE_PX && Math.abs(rect.x + rect.width - last[1]) <= CHARACTER_TOLERANCE_PX,
    `inlay-hint: the range rectangle is ${JSON.stringify(rect)}, Chrome's characters span ${first[1].toFixed(2)} to ${last[1].toFixed(2)}`);
  const image = grab(owner);
  const ratio = image.getWidth() / api.snapshot().width;
  const line = reference.lines[0];
  assert(line !== undefined, 'no line');
  const span = highlightedSpan(image, ratio, line.baseline - ABOVE_BASELINE_PX - 6, reference.box.x - TOLERANCE_PX, reference.box.x + reference.box.width + TOLERANCE_PX);
  assert(span !== undefined && Math.abs(span[0] - first[1]) <= TOLERANCE_PX && Math.abs(span[1] - last[1]) <= TOLERANCE_PX,
    `inlay-hint: the highlight spans ${JSON.stringify(span)}, it should run from ${first[1].toFixed(2)} through the inlay to ${last[1].toFixed(2)}`);
  checked += 4;
  // Controls: a selection that counted the inlay's text would be longer; the check that it is not must be able to fail.
  const dragged = selection;
  await expectFailure('a drag across an inlay selecting the generated text too', () => {
    assert(dragged?.text === 'ount: number =', 'the control expects the inlay in the selection');
  });
  // A word that has an inlay inside it spans the inlay and copies without it.
  const glue = sampleOf('inlay-glue');
  await click(windowPoint(pointInCharacter(glue, 1)), 2);
  selection = api.selection();
  assert(selection !== undefined && selection.text === 'abcghi', `inlay-glue: a double click on a word with an inlay in it selected ${JSON.stringify(selection?.text)}, not abcghi`);
  await click(windowPoint(pointInCharacter(glue, 8)), 2);
  selection = api.selection();
  assert(selection !== undefined && selection.text === 'jkl', `inlay-glue: a double click on the next word selected ${JSON.stringify(selection?.text)}`);
  checked += 3;
  // A triple click selects the whole text of the node, which holds no inlay.
  await click(windowPoint(pointInCharacter(sampleOf('inlay-group'), 2)), 3);
  selection = api.selection();
  assert(selection?.text === sourceText(sampleOf('inlay-group').runs), `inlay-group: a triple click selected ${JSON.stringify(selection?.text)}`);
  checked += 1;
  return checked;
}

// ---- Changes -----------------------------------------------------------------------------------------------------------------

/** The flush samples of a JS profile: each commit's JSON length. */
function commitChars(profile: RendererProfile): number[] {
  return profile.samples.flatMap(sample => (sample.kind === 'flush' && sample.commandCount > 0 ? [sample.jsonChars] : []));
}

/** Count the pixels of the picture inside `rect` that are bluer than red by `TONE_LEVELS` (the new tone's), and redder than blue (the old one's). */
function tonePixels(owner: Node, api: RichTextInspection, rect: LayoutRect): { blue: number; red: number } {
  const image = grab(owner);
  const ratio = image.getWidth() / api.snapshot().width;
  let blue = 0;
  let red = 0;
  for (let y = Math.floor(rect.y * ratio); y < Math.ceil((rect.y + rect.height) * ratio); y += 1) {
    for (let x = Math.floor(rect.x * ratio); x < Math.ceil((rect.x + rect.width) * ratio); x += 1) {
      const color = image.getPixel(x, y);
      if ((color.b - color.r) * LEVELS >= TONE_LEVELS) blue += 1;
      if ((color.r - color.b) * LEVELS >= TONE_LEVELS) red += 1;
    }
  }
  return { blue, red };
}

/**
 * A span's colour is painted without shaping the paragraph again, in a commit of a few hundred characters; its text is shaped again.
 * The counters are the native ones: `paragraphBuilds` and `paragraphRepaints`.
 */
async function verifyChanges(owner: Node, api: RichTextInspection): Promise<{ recolourChars: number; retextChars: number }> {
  api.showRichText({ page: 'changes', tone: 0, word: 0 });
  await settleFrames();
  const letter = firstRect('recolour', 4, 5);
  const start = tonePixels(owner, api, letter);
  assert(start.red > 0 && start.blue === 0, `The span starts red: ${JSON.stringify(start)}`);
  api.profile(true);
  api.takeProfile();
  const before = api.activity();
  api.showRichText({ page: 'changes', tone: 1, word: 0 });
  await settleFrames();
  const recoloured = api.takeProfile();
  const after = api.activity();
  const chars = commitChars(recoloured.js);
  assert(chars.length === 1, `A change of a colour is one commit, not ${chars.length}`);
  const recolourChars = chars[0] ?? 0;
  assert(recolourChars <= RECOLOUR_COMMIT_CHARS, `A change of one span's colour is a commit of ${recolourChars} characters; it should be one short line's spans`);
  assert(after.paragraphBuilds === before.paragraphBuilds, `A change of a span's colour shaped ${after.paragraphBuilds - before.paragraphBuilds} paragraph(s) again`);
  assert(after.paragraphRepaints === before.paragraphRepaints + 1, `A change of a span's colour repainted ${after.paragraphRepaints - before.paragraphRepaints} paragraphs, not one`);
  assert(after.contentRecords > before.contentRecords, 'The new colour was recorded');
  const now = tonePixels(owner, api, letter);
  assert(now.blue > 0 && now.red === 0, `The span is the new tone in the picture: ${JSON.stringify(now)}`);
  // The control: a change of the text is shaped again, so the counter can tell the two apart.
  const beforeText = api.activity();
  api.takeProfile();
  api.showRichText({ page: 'changes', tone: 1, word: 1 });
  await settleFrames();
  const retexted = api.takeProfile();
  const afterText = api.activity();
  assert(afterText.paragraphBuilds === beforeText.paragraphBuilds + 1, `A change of a span's text shaped ${afterText.paragraphBuilds - beforeText.paragraphBuilds} paragraphs, not one`);
  const retextChars = commitChars(retexted.js)[0] ?? 0;
  assert(retextChars > 0, 'The new text was committed');
  // The text and its spans are both in the commit, so it is longer than the colour's.
  assert(retextChars > recolourChars, `A change of text (${retextChars} characters) is no larger than a change of colour (${recolourChars})`);
  api.profile(false);
  console.log(`GODOT_REACT_RICH_TEXT_CHANGES ${JSON.stringify({ recolourChars, retextChars, builds: afterText.paragraphBuilds - before.paragraphBuilds, repaints: afterText.paragraphRepaints - before.paragraphRepaints })}`);
  return { recolourChars, retextChars };
}

// ---- Transforms --------------------------------------------------------------------------------------------------------------

/** Where the caret between character `index - 1` and `index` of a transformed text is, in the root's space, and the click that must find it. */
function verifyTransformed(api: RichTextInspection, id: string): number {
  const sample = sampleOf(id);
  const source = sourceText(sample.runs);
  const text = handle(id);
  const box = text.getRect();
  assert(box !== undefined, `${id}: no rect`);
  let checked = 0;
  // Every caret, drawn where the text is, finds itself: a point a quarter of a character along the baseline's direction from the caret, in
  // either direction, is on that character and so lands on the boundary beside it.
  const ranges = (offset: number): LayoutRect => {
    const rect = text.getRangeRects(offset, offset + 1)?.[0];
    assert(rect !== undefined, `${id}: no range at ${offset}`);
    return rect;
  };
  const rotated = id === 'rotated';
  for (let offset = 0; offset < source.length; offset += 1) {
    const rect = ranges(offset);
    // A character's rectangle is the bounding box of what is drawn: its middle is its middle whatever the matrix.
    const middle = new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const found = text.getOffsetAtPoint(middle.x, middle.y);
    assert(found !== undefined && (found.offset === offset || found.offset === offset + 1),
      `${id}: the middle of character ${offset} (${middle.x.toFixed(2)}, ${middle.y.toFixed(2)}) is ${JSON.stringify(found)}`);
    // The caret and the range agree: the caret before the character is at its edge, which for a quarter turn is its top.
    const caret = text.getCaretRect(offset, 'after');
    assert(caret !== undefined, `${id}: no caret at ${offset}`);
    const inside = rotated
      ? caret.y >= rect.y - CHARACTER_TOLERANCE_PX && caret.y <= rect.y + rect.height + CHARACTER_TOLERANCE_PX
      : caret.x >= rect.x - CHARACTER_TOLERANCE_PX && caret.x <= rect.x + rect.width + CHARACTER_TOLERANCE_PX;
    assert(inside, `${id}: the caret at ${offset} (${JSON.stringify(caret)}) is not at the edge of its character (${JSON.stringify(rect)})`);
    checked += 2;
  }
  // The whole text is inside the box `getRect()` reports.
  const all = text.getRangeRects(0, source.length);
  assert(all !== undefined && all.length > 0, `${id}: no rectangles for the whole text`);
  for (const rect of all) {
    assert(rect.x >= box.x - 1 && rect.y >= box.y - 1 && rect.x + rect.width <= box.x + box.width + 1 && rect.y + rect.height <= box.y + box.height + 1,
      `${id}: a range rectangle ${JSON.stringify(rect)} is outside the box ${JSON.stringify(box)}`);
    checked += 1;
  }
  api.snapshot();
  return checked;
}

/** An empty text has one position: the start of its empty line, as tall as the line its font gives. */
function verifyEmpty(): number {
  const text = handle('empty');
  const caret = text.getCaretRect(0, 'after');
  const box = text.getRect();
  assert(caret !== undefined && box !== undefined, 'empty: no caret or no rect');
  assert(caret.width === 0 && caret.height > 0, `empty: the caret is ${JSON.stringify(caret)}`);
  assert(Math.abs(caret.x - box.x) <= CARET_EPSILON_PX && caret.y >= box.y - CARET_EPSILON_PX, `empty: the caret ${JSON.stringify(caret)} is not at the start of the text ${JSON.stringify(box)}`);
  assert(text.getRangeRects(0, 0)?.length === 0, 'empty: an empty range has no rectangles');
  const found = text.getOffsetAtPoint(caret.x + 40, caret.y + 2);
  assert(found?.offset === 0 && found.side === 'after', `empty: a click is ${JSON.stringify(found)}, not offset 0`);
  let refused: unknown;
  try {
    text.getCaretRect(1);
  } catch (error) {
    refused = error;
  }
  assert(refused instanceof RangeError, 'empty: offset 1 is past the end');
  return 5;
}

/** The scale is one and a half and the quarter turn swaps the axes: the queries are right in the space the text is drawn in. */
function verifyTransforms(api: RichTextInspection): number {
  // A scaled text is one and a half times as wide as the same line is untransformed: the advance is the colours page's, from Chrome.
  const sample = sampleOf('scaled');
  const start = handle('scaled').getCaretRect(0, 'after');
  const end = handle('scaled').getCaretRect(sourceText(sample.runs).length, 'after');
  assert(start !== undefined && end !== undefined, 'scaled: no carets');
  const first = golden('code-line').chars[0];
  const second = golden('code-line').chars[1];
  assert(first !== undefined && second !== undefined, 'Chrome has no characters');
  const expected = (second[1] - first[1]) * [...displayText(sample.runs)].length * SCALE_CLASS_FACTOR;
  assert(Math.abs(end.x - start.x - expected) <= CHARACTER_TOLERANCE_PX * SCALE_CLASS_FACTOR * [...displayText(sample.runs)].length,
    `scaled: the text spans ${(end.x - start.x).toFixed(2)}, one and a half times its untransformed width is ${expected.toFixed(2)}`);
  let checked = 1 + verifyEmpty();
  for (const id of ['scaled', 'rotated']) checked += verifyTransformed(api, id);
  return checked;
}

// ---- The cost of a file -------------------------------------------------------------------------------------------------------

/** What mounting `lines` lines of a file costs, from the profiles of the commit that did it. */
async function mountFile(api: RichTextInspection, plain: boolean): Promise<Record<string, unknown>> {
  api.showRichText({ page: 'colours' });
  await settleFrames();
  api.profile(true);
  api.takeProfile();
  const before = api.activity();
  api.showRichText({ file: FILE_LINES, plain });
  await settleFrames();
  const profile = api.takeProfile();
  const after = api.activity();
  const chars = commitChars(profile.js).reduce((total, each) => total + each, 0);
  const nodes = after.nodeCount - before.nodeCount;
  const flush = profile.js.samples.find(sample => sample.kind === 'flush');
  assert(flush !== undefined && flush.kind === 'flush', 'The file was committed');
  const batch = profile.native.samples.find(sample => sample.kind === 'batch');
  api.profile(false);
  // One node a line (and the file's own): the evaluation's `View` of `Text` runs was about nine.
  assert(nodes <= FILE_LINES + 3, `The file is ${nodes} nodes for ${FILE_LINES} lines; one a line was the point`);
  return {
    plain, lines: FILE_LINES, nodes, nodesPerLine: nodes / FILE_LINES, jsonChars: chars, charsPerLine: chars / FILE_LINES,
    jsFlushMs: flush.fullFlushMs, nativeBatch: batch ?? null, paragraphBuilds: after.paragraphBuilds - before.paragraphBuilds,
    contentRecords: after.contentRecords - before.contentRecords,
  };
}

/** The cost of a highlighted file in one `Text` a line, and of the same lines as plain strings, against the evaluation's numbers (docs/tracks/rich-text.md). */
async function measureFile(api: RichTextInspection): Promise<void> {
  const plain = await mountFile(api, true);
  const spans = await mountFile(api, false);
  console.log(`GODOT_REACT_RICH_TEXT_FILE ${JSON.stringify({ plain, spans })}`);
}

// ---- The section ------------------------------------------------------------------------------------------------------------

async function showPage(api: RichTextInspection, page: string): Promise<void> {
  api.showRichText({ page });
  await settleFrames();
  await frames(SETTLE_FRAMES);
}

/** Controls for the numbers: a text held to the numbers of another is further than the tolerance, so the tolerance tells texts apart. */
function verifyNumberControl(api: RichTextInspection, shown: string, other: string): void {
  const wrong = deviations(node(api, shown).rect, readOurText(api.textLines(shown)), golden(other));
  assert(wrong.length > 0, `Control: ${shown} is held to Chrome's numbers for ${other} and passes`);
}

async function verifyScale(owner: Node, api: RichTextInspection, capture: RichTextCapture, scale: number, differing: string[]): Promise<number> {
  const win = window(owner);
  win.contentScaleFactor = scale;
  contentScale = scale;
  await frames(SETTLE_FRAMES);
  const spreads = { left: { count: 0, sum: 0, worst: 0 }, right: { count: 0, sum: 0, worst: 0 } };
  let compared = 0;
  let queried = 0;
  for (const page of PAGES) {
    await showPage(api, page.id);
    if (page.chrome !== false) {
      compared += verifyNumbers(api, page, `${page.id} at ratio ${scale}`, differing, spreads);
      for (const sample of page.samples) {
        queried += verifyCarets(sample);
        if (sample.interact === true) {
          queried += verifyHitTesting(sample);
          queried += verifyInlayClicks(sample);
        }
      }
      await capture(`rich-text-${page.id}-dpr${scale}`);
    } else {
      queried += verifyTransforms(api);
    }
  }
  await showPage(api, 'columns');
  const columns = ['columns-plain', 'columns-spans', 'columns-single', 'columns-code'].map(id => ({ id, ...verifyColumns(id) }));
  verifyNumberControl(api, 'columns-spans', 'columns-code');
  await showPage(api, 'inlays');
  verifyNumberControl(api, 'inlay-hint', 'inlay-group');
  await expectFailure('hit tests expecting the display text\'s offsets (the inlay counted as source)', () => { verifyHitTesting(sampleOf('inlay-hint'), true); });
  await showPage(api, 'colours');
  queried += verifyWraps('prose');
  verifyRefusals();
  console.log(`GODOT_REACT_RICH_TEXT_CHARS ${JSON.stringify({
    scale, texts: compared, queries: queried, left: showSpread('left', spreads.left), right: showSpread('right', spreads.right), columns,
  })}`);
  return compared;
}

export async function verifyRichText(owner: Node, api: RichTextInspection, capture: RichTextCapture): Promise<void> {
  const differing: string[] = [];
  let compared = 0;
  try {
    compared += await verifyScale(owner, api, capture, 1, differing);
    if (api.snapshot().width >= PAGE_WIDTH_PX * RETINA_SCALE) {
      compared += await verifyScale(owner, api, capture, RETINA_SCALE, differing);
      window(owner).contentScaleFactor = 1;
      contentScale = 1;
    }
    contentScale = 1;
    await frames(SETTLE_FRAMES);
    const selecting = await verifySelecting(owner, api);
    const changes = await verifyChanges(owner, api);
    await measureFile(api);
    console.log(`GODOT_REACT_RICH_TEXT ${JSON.stringify({ compared, selecting, changes, differing: differing.length })}`);
  } finally {
    window(owner).contentScaleFactor = 1;
    contentScale = 1;
    await frames(SETTLE_FRAMES);
  }
  assert(differing.length === 0, `${differing.length} numbers differ from Chrome:\n${differing.join('\n')}`);
}
