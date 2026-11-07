import {
  Engine, Image, InputEventKey, Key, Node, OS, Vector2, Window,
} from 'godot';
import type { UISelection } from '../../src';
import type { LayoutRect, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import { GOLDEN_TEXTS, type GoldenLine, type GoldenText } from './text-styles-golden';
import { PAGES, type TextSample } from './text-styles-data';
import { click, drag } from './verify-text-input';
import { grab, settleFrames } from './verify-filters';
import { assertionTally, parseVerifierEvent, verifierClipboard } from './verifier-input';

/**
 * The `text-styles` section of the interaction verifier (docs/tracks/utilities-text.md). Every page of the text styles lab is
 * shown at device pixel ratios one and two and held to the numbers headless Chrome reports for the same classes
 * (`text-styles-golden.ts`, written by `scripts/text-styles-reference.mjs --golden`): the box of each text, and for each of its
 * lines the left and right ends of the glyphs and the baseline, all within a pixel. The pictures are captured for the per
 * channel comparison (`scripts/text-styles-reference.mjs --diff`). The texts the lab marks for selection are selected with the
 * pointer, where Chrome's characters are, and copied. Controls show that each comparison fails for a text of another style.
 */
export interface TextStylesInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showTextStyles(page: string): void;
  textLines(testID: string): unknown;
  selection(): UISelection | undefined;
}

/** `overflowing`: test ids of nodes that reach past the window by design. */
export type TextStylesCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

/** The tolerance of the comparison with Chrome, in logical pixels: "within a pixel". */
const TOLERANCE_PX = 1;
const RETINA_SCALE = 2;
const FRAME_POLL_MS = 10;
const SETTLE_FRAMES = 4;
const LEVELS = 255;
/** The highlight (`#3b82f659`) over white is this much bluer than red; ink is as red as it is blue. */
const HIGHLIGHT_BLUENESS = 30;
/** A pointer lands this far (a share of the character's width) inside a character's left edge: the boundary before it. */
const INSIDE_LEFT_SHARE = 0.25;
/** The pointer presses inside the line, this far (logical px) above its baseline: the middle of the x-height. */
const ABOVE_BASELINE_PX = 4;
/** The selection tests press on every this many characters of a text. */
const CHARACTER_STRIDE = 7;
/** Leave this much of the line's top out when reading a highlight's edges: the first row can be antialiased. */
const HIGHLIGHT_ROW_INSET_PX = 1;
/** A right edge this far from Chrome's is listed in the log, though it passes. */
const LARGE_SPREAD_PX = 0.25;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}


/** What `ReactUiRoot.getTextLines` reports for a text. */
interface OurLine {
  readonly start: number;
  readonly end: number;
  readonly x: number;
  readonly baseline: number;
  readonly ascent: number;
  readonly width: number;
}

interface OurText {
  readonly text: string;
  readonly lines: readonly OurLine[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function numberField(record: Record<string, unknown>, name: string): number {
  const value = record[name];
  assert(typeof value === 'number' && Number.isFinite(value), `getTextLines: ${name} is not a number`);
  return value;
}

/** Check what the native lines reply holds and give it a type. */
function readOurText(reply: unknown): OurText {
  assert(isRecord(reply) && typeof reply.text === 'string' && Array.isArray(reply.lines), 'getTextLines: not {text, lines}');
  const lines = reply.lines.map((entry: unknown): OurLine => {
    assert(isRecord(entry), 'getTextLines: a line is not an object');
    return {
      start: numberField(entry, 'start'), end: numberField(entry, 'end'), x: numberField(entry, 'x'), baseline: numberField(entry, 'baseline'), ascent: numberField(entry, 'ascent'),
      width: numberField(entry, 'width'),
    };
  });
  return { text: reply.text, lines };
}

/**
 * How a text's lines are held to Chrome's: `full` every line; `first` only the lines the text shows (a line clamp lays out and
 * hides the rest in Chrome too); `box` the box only (an ellipsis cuts a line, Chrome keeps every character's rectangle).
 */
type Comparison = 'full' | 'first' | 'box';

const COMPARISON: Readonly<Record<string, Comparison>> = {
  truncate: 'box', ellipsis: 'box', clip: 'box', 'clamp-1': 'first', 'clamp-2': 'first', 'clamp-3': 'first',
  // The text server counts the space after a word when it decides whether the word fits, Chrome lets it hang.
  'tracking-wrap-edge': 'box',
};

/** One number that is further from Chrome's than the tolerance allows. */
export interface Deviation {
  readonly what: string;
  readonly ours: number;
  readonly chrome: number;
}

/** The boxes and lines of `ours` further than `TOLERANCE_PX` from `golden`'s. */
export function deviations(box: LayoutRect, ours: OurText, golden: GoldenText, comparison: Comparison): Deviation[] {
  const found: Deviation[] = [];
  const near = (what: string, a: number, b: number): void => {
    if (Math.abs(a - b) > TOLERANCE_PX) found.push({ what, ours: a, chrome: b });
  };
  near('box x', box.x, golden.box.x);
  near('box y', box.y, golden.box.y);
  near('box width', box.width, golden.box.width);
  near('box height', box.height, golden.box.height);
  if (comparison === 'box') return found;
  const lines = comparison === 'first' ? golden.lines.slice(0, ours.lines.length) : golden.lines;
  if (ours.lines.length !== lines.length) {
    found.push({ what: 'line count', ours: ours.lines.length, chrome: lines.length });
    return found;
  }
  lines.forEach((chrome: GoldenLine, index) => {
    const line = ours.lines[index];
    assert(line !== undefined, 'a line has gone');
    near(`line ${index} baseline`, line.baseline, chrome.baseline);
    // A line that starts with white space (`pre`) begins at the first glyph in Chrome and at the white space here; the right
    // edge is the same.
    const blank = /\s/u.test([...ours.text].slice(line.start, line.start + 1).join(''));
    if (!blank) near(`line ${index} left`, line.x, chrome.x);
    near(`line ${index} right`, line.x + line.width, chrome.x + chrome.width);
  });
  return found;
}

function node(api: TextStylesInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

function golden(id: string): GoldenText {
  const found = GOLDEN_TEXTS[id];
  assert(found, `Chrome has no numbers for ${id}; run scripts/text-styles-reference.mjs --golden`);
  return found;
}

function ours(api: TextStylesInspection, id: string): OurText {
  return readOurText(api.textLines(id));
}

function describe(found: readonly Deviation[]): string {
  return found.map(each => `${each.what}: ${each.ours.toFixed(2)} against Chrome's ${each.chrome.toFixed(2)}`).join('; ');
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

// ---- The numbers ----------------------------------------------------------------------------------------------------

/** Every text further from Chrome's numbers than the tolerance, over all the pages and both ratios; reported at the end. */
const differing: string[] = [];

/** How far from Chrome's numbers the texts of a page are, signed (ours minus Chrome's), for the report. */
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

/** Hold every text of `page` to Chrome's numbers; returns how many were compared. */
function verifyNumbers(api: TextStylesInspection, pageId: string, label: string): number {
  const page = PAGES.find(candidate => candidate.id === pageId);
  assert(page, `No page ${pageId}`);
  const baselines: Spread = { count: 0, sum: 0, worst: 0 };
  const rights: Spread = { count: 0, sum: 0, worst: 0 };
  const heights: Spread = { count: 0, sum: 0, worst: 0 };
  for (const sample of page.samples) {
    const text = ours(api, sample.id);
    const chrome = golden(sample.id);
    const comparison = COMPARISON[sample.id] ?? 'full';
    if (comparison === 'full' && text.lines.length === chrome.lines.length) {
      text.lines.forEach((line, index) => {
        const reference = chrome.lines[index];
        if (reference === undefined) return;
        addTo(baselines, line.baseline - reference.baseline);
        const right = line.x + line.width - (reference.x + reference.width);
        addTo(rights, right);
        if (Math.abs(right) > LARGE_SPREAD_PX) console.log(`GODOT_REACT_TEXT_STYLES_WIDE ${sample.id} line ${index}: right edge ${right.toFixed(3)} from Chrome's`);
      });
      addTo(heights, node(api, sample.id).rect.height - chrome.box.height);
    }
    const found = deviations(node(api, sample.id).rect, text, chrome, comparison);
    assertionTally.count += 1;
    if (found.length > 0) {
      differing.push(`${label}: ${sample.id} (${sample.note}): ${describe(found)}`);
      console.log(`GODOT_REACT_TEXT_STYLES_DIFF ${differing.at(-1)}`);
    }
  }
  console.log(`GODOT_REACT_TEXT_STYLES_SPREAD ${label}: ${showSpread('baseline', baselines)}; ${showSpread('right', rights)}; ${showSpread('height', heights)}`);
  return page.samples.length;
}

// ---- Selection, hit testing and copy -------------------------------------------------------------------------------

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

/** The characters (code points) of a selection text, as Chrome indexes the DOM text: the same unless a transform changes the length. */
function codePoints(text: string): string[] {
  return [...text];
}

/** The pointer lands on character `index` of a text as Chrome has it, just inside its left edge, on the line it is on. */
function pressPoint(chrome: GoldenText, index: number): Vector2 {
  const entry = chrome.chars?.[index];
  assert(entry !== undefined, `Chrome has no character ${index}`);
  const [left, right, lineIndex] = entry;
  const line = chrome.lines[lineIndex];
  assert(line !== undefined, `Chrome has no line ${lineIndex}`);
  return new Vector2(left + (right - left) * INSIDE_LEFT_SHARE, line.baseline - ABOVE_BASELINE_PX);
}

/** Select from before character `from` to before character `to` with a drag, and give the selection. */
async function selectBetween(api: TextStylesInspection, chrome: GoldenText, from: number, to: number): Promise<UISelection | undefined> {
  await drag(windowPoint(pressPoint(chrome, from)), windowPoint(pressPoint(chrome, to)));
  return api.selection();
}

/**
 * Where a drag from character `a` to character `b` lands: the text it selects must be exactly the characters from `a` up to
 * (not including) `b`, which only holds if the pointer's x is mapped to the character Chrome draws there.
 */
async function verifyHitTesting(api: TextStylesInspection, sample: TextSample): Promise<number> {
  const chrome = golden(sample.id);
  const count = codePoints(sample.text).length;
  const shown = ours(api, sample.id).text;
  assert(codePoints(shown).length === count, `${sample.id}: hit testing by Chrome's characters needs a text a transform does not lengthen`);
  const stops: number[] = [];
  for (let index = 0; index < count; index += CHARACTER_STRIDE) stops.push(index);
  let checked = 0;
  for (const [position, from] of stops.entries()) {
    const to = stops[position + 1];
    if (to === undefined) break;
    const selection = await selectBetween(api, chrome, from, to);
    const expected = codePoints(shown).slice(from, to).join('');
    if (selection === undefined) console.log(`GODOT_REACT_TEXT_STYLES_DRAG ${JSON.stringify({ id: sample.id, from, to, press: pressPoint(chrome, from), snapshotHovered: api.snapshot().hovered, node: node(api, sample.id).id })}`);
    // A selection that ends on a soft wrap keeps the space that was there: Chrome's characters include it.
    assert(selection !== undefined && selection.text === expected,
      `${sample.id}: a drag from character ${from} to ${to} selected ${JSON.stringify(selection?.text)}, not ${JSON.stringify(expected)}`);
    checked += 1;
  }
  return checked;
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

/** The highlight of a selection covers the characters Chrome puts there, to a pixel. */
async function verifyHighlight(owner: Node, api: TextStylesInspection, sample: TextSample): Promise<void> {
  const chrome = golden(sample.id);
  const entries = chrome.chars ?? [];
  const from = 3;
  const to = Math.min(entries.length - 1, 12);
  const first = entries[from];
  const last = entries[to - 1];
  assert(first !== undefined && last !== undefined && first[2] === last[2], `${sample.id}: the highlight check needs a span on one line`);
  const selection = await selectBetween(api, chrome, from, to);
  assert(selection !== undefined && !selection.isCollapsed, `${sample.id}: the drag selected nothing`);
  const line = chrome.lines[first[2]];
  assert(line !== undefined, 'no line');
  const image = grab(owner);
  const ourLine = ours(api, sample.id).lines[first[2]];
  assert(ourLine !== undefined, 'no line of ours');
  // The highlight is a rectangle of the line's height: read it in a row near the top of the line, where ink rarely reaches.
  const row = ourLine.baseline - ourLine.ascent + HIGHLIGHT_ROW_INSET_PX;
  // The picture is the window's pixels: as many per logical pixel as the picture is wider than the root.
  const ratio = image.getWidth() / api.snapshot().width;
  const span = highlightedSpan(image, ratio, row, chrome.box.x - TOLERANCE_PX, chrome.box.x + chrome.box.width + TOLERANCE_PX);
  if (span === undefined) {
    const directory = OS.getEnvironment('GODOT_REACT_ARTIFACTS') || 'user://react-ui-verification';
    image.savePng(`${directory}/text-styles-highlight-failure-dpr${contentScale}.png`);
    const probe = image.getPixel(Math.round((first[0] + 4) * ratio), Math.round(row * ratio));
    console.log(`GODOT_REACT_TEXT_STYLES_HIGHLIGHT ${JSON.stringify({ row, scale: contentScale, size: [image.getWidth(), image.getHeight()], first, last, probe: [probe.r, probe.g, probe.b], selection: selection.text })}`);
  }
  assert(span !== undefined, `${sample.id}: no highlight in the picture`);
  assert(Math.abs(span[0] - first[0]) <= TOLERANCE_PX && Math.abs(span[1] - last[1]) <= TOLERANCE_PX,
    `${sample.id}: the highlight spans ${span[0]} to ${span[1]}, Chrome's characters ${first[0].toFixed(2)} to ${last[1].toFixed(2)}`);
}

/** Select the whole text with a triple click and copy it: the clipboard holds what copying the same text in Chrome gives. */
async function verifyCopy(api: TextStylesInspection, sample: TextSample): Promise<void> {
  const chrome = golden(sample.id);
  const line = chrome.lines[0];
  assert(line !== undefined, 'no line');
  await click(windowPoint(new Vector2(line.x + 2, line.baseline - ABOVE_BASELINE_PX)), 3);
  verifierClipboard.set('before the copy');
  await copyChord();
  assert(verifierClipboard.get() === chrome.copy, `${sample.id}: copying put ${JSON.stringify(verifierClipboard.get())} on the clipboard; Chrome copies ${JSON.stringify(chrome.copy)}`);
  assert(api.selection()?.text === chrome.copy, `${sample.id}: the selection's text is ${JSON.stringify(api.selection()?.text)}; Chrome's is ${JSON.stringify(chrome.copy)}`);
}

// ---- Controls --------------------------------------------------------------------------------------------------------

/**
 * Each comparison must fail where it should. A text is held to Chrome's numbers for the neighbouring style (one step of
 * leading, of tracking, of weight, of size): the comparison must find it wrong, or the tolerance is too wide to tell the
 * styles apart. Pairs are `[the text shown, the text whose Chrome numbers it is held to, what differs]`, by page.
 */
const CONTROLS: Readonly<Record<string, readonly (readonly [string, string, string])[]>> = {
  leading: [['leading-relaxed', 'leading-loose', 'one step of leading'], ['leading-tight', 'leading-snug', 'one step of leading, tight']],
  tracking: [['tracking-widest-base', 'tracking-wider-base', 'one step of tracking'], ['tracking-wide-sm', 'tracking-normal-sm', 'tracking against none, at 14 px']],
  'weights-sans': [['weight-sans-bold', 'weight-sans-semibold', 'one step of weight'], ['weight-sans-normal', 'weight-sans-light', 'one step of weight, light']],
  sizes: [['size-base', 'size-lg', 'one size']],
};

function verifyControls(api: TextStylesInspection, pageId: string): number {
  const pairs = CONTROLS[pageId] ?? [];
  for (const [id, other, what] of pairs) {
    const wrong = deviations(node(api, id).rect, ours(api, id), golden(other), 'full');
    assert(wrong.length > 0, `Control: ${id} is held to Chrome's numbers for ${other} (${what}) and passes; the tolerance cannot tell them apart`);
  }
  return pairs.length;
}

/** A drag that is placed by the wrong text's characters selects the wrong text. */
async function verifyHitControl(api: TextStylesInspection): Promise<void> {
  const wrongChars = golden('tracking-normal-base');
  const sample = PAGES.flatMap(page => page.samples).find(candidate => candidate.id === 'tracking-widest-base');
  assert(sample, 'no sample');
  const shown = ours(api, sample.id).text;
  const from = CHARACTER_STRIDE;
  const to = CHARACTER_STRIDE * 2;
  // The characters' positions in the same text without tracking: the widest-tracked text is much wider, so a pointer placed by them lands earlier.
  const swapped: GoldenText = { ...golden(sample.id), chars: wrongChars.chars };
  const selection = await selectBetween(api, swapped, from, to);
  assert(selection?.text !== codePoints(shown).slice(from, to).join(''), 'Control: a drag placed by another text\'s characters selects the same text; the hit test cannot be telling tracking apart');
}

// ---- The section ------------------------------------------------------------------------------------------------------

async function showPage(api: TextStylesInspection, page: string): Promise<void> {
  api.showTextStyles(page);
  await settleFrames();
  await frames(SETTLE_FRAMES);
}

/** The width of a page; the window at ratio two must have at least this many logical pixels. */
const PAGE_WIDTH_PX = 540;

/** Selection, hit testing and copy: the pointer is placed in window pixels, so the scale is in every point. */
async function verifySelecting(owner: Node, api: TextStylesInspection): Promise<number> {
  const samples = PAGES.flatMap(page => page.samples.filter(sample => sample.selection === true).map(sample => ({ page: page.id, sample })));
  for (const { page, sample } of samples) {
    await showPage(api, page);
    if (!['case-upper', 'case-capitalize'].includes(sample.id)) await verifyHitTesting(api, sample);
    if (sample.id === 'weight-sans-bold' || sample.id === 'tracking-widest-base') await verifyHighlight(owner, api, sample);
    await verifyCopy(api, sample);
  }
  await showPage(api, 'tracking');
  await verifyHitControl(api);
  return samples.length;
}

async function verifyScale(owner: Node, api: TextStylesInspection, capture: TextStylesCapture, scale: number): Promise<{ compared: number; selecting: number }> {
  const win = window(owner);
  win.contentScaleFactor = scale;
  contentScale = scale;
  await frames(SETTLE_FRAMES);
  let compared = 0;
  let controls = 0;
  for (const page of PAGES) {
    await showPage(api, page.id);
    compared += verifyNumbers(api, page.id, `${page.id} at ratio ${scale}`);
    controls += verifyControls(api, page.id);
    await capture(`text-styles-${page.id}-dpr${scale}`);
  }
  const selecting = await verifySelecting(owner, api);
  console.log(`GODOT_REACT_TEXT_STYLES_SCALE ${JSON.stringify({ scale, texts: compared, controls, selectionTexts: selecting })}`);
  return { compared, selecting };
}

export async function verifyTextStyles(owner: Node, api: TextStylesInspection, capture: TextStylesCapture): Promise<void> {
  let compared = 0;
  try {
    compared += (await verifyScale(owner, api, capture, 1)).compared;
    // Device pixel ratio two is the window's content scale, as a retina display has it: the logical window is half as wide, so
    // the lab's pages only fit the landscape window.
    if (api.snapshot().width >= PAGE_WIDTH_PX * RETINA_SCALE) compared += (await verifyScale(owner, api, capture, RETINA_SCALE)).compared;
  } finally {
    window(owner).contentScaleFactor = 1;
    contentScale = 1;
    await frames(SETTLE_FRAMES);
  }
  console.log(`GODOT_REACT_TEXT_STYLES ${JSON.stringify({ compared, differing: differing.length })}`);
  assert(differing.length === 0, `${differing.length} texts differ from Chrome by more than ${TOLERANCE_PX} px:\n${differing.join('\n')}`);
}
