import { Engine, Image, Node, Window } from 'godot';
import type { NativeSnapshotNode } from '../../src/native';
import {
  BLUE, CURRENT_COLOR_OUTLINE_PX, INK, RED, SAMPLE_PADDING_PX, STROKE_OUTLINE_PX, WHITE, YELLOW,
} from './text-stroke-lab';
import { assertionTally } from './verifier-input';
import { grab, settleFrames } from './verify-filters';

/**
 * The `text-stroke` section of the interaction verifier: the text stroke lab (`text-stroke-lab.tsx`), one case at a time, at device
 * pixel ratios one and two, with what can be read from the pixels asserted.
 *
 * Every stroked text has a twin without the stroke, on the same backdrop, and is held to it:
 * - the layout is the twin's (a stroke is painted, not measured, as in CSS);
 * - the fill is the twin's, pixel for pixel in how many there are: a stroke drawn over the glyphs would take some of them away;
 * - the stroke is outside the fill, `STROKE_OUTLINE_PX` past it on every side (Godot's outline takes half of CSS's width);
 * - with no stroke colour the stroke is the colour of the text, of each run of it.
 * `whole-line-small` is the control that the comparison of the fill is not a shrug: a smaller word has a fill that fails it.
 */
export interface TextStrokeInspection {
  showTextStroke(strokeCase: string): void;
  find(testID: string): NativeSnapshotNode | undefined;
}

export type TextStrokeCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

type Rgb = readonly [number, number, number];

const RETINA_SCALE = 2;
const RETINA_SETTLE_FRAMES = 6;
const FRAME_POLL_MS = 10;
const RGBA_CHANNELS = 4;
/**
 * How far a channel of a pixel may be from a colour for the pixel to be that colour: a pixel on the edge of a glyph is its colour
 * blended with what is behind it, which is another colour with a stroke than without, so the fill is counted by its solid pixels.
 */
const SOLID_LEVELS = 8;
/** The looser reading, for a stroke: its edge may be a little blended with the backdrop and still be its colour. */
const STROKE_LEVELS = 40;
/** Where a text is looked at: its box and this much round it, inside the padding of its backdrop so that nothing else is in view. */
const SCAN_MARGIN_PX = SAMPLE_PADDING_PX - 4;
/**
 * The share by which a text's fill may differ from its twin's. The twin of a white stroke is on white (`text-stroke-lab.tsx`), so the
 * glyphs' edge pixels blend with the same colour and the counts of solid pixels are the same: they are equal in every case the lab has.
 * A stroke over the glyphs would take the core of every stem, most of the fill.
 */
const FILL_SHARE_TOLERANCE = 0.01;
/** A text with a fill this much bigger than its twin's has a stroke of its own colour round it. */
const HEAVIER_SHARE = 1.25;
/** How far, in device pixels, the stroke's reach may be from the outline size: the outermost pixels of a round edge are partly covered. */
const REACH_SHORT_PX = 2;
const REACH_LONG_PX = 1;
/** A text drawn without a stroke has next to none of the stroke's colour: the fringe of an antialiased edge is not it. */
const STRAY_PIXELS = 4;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function windowOf(owner: Node): Window {
  const found = owner.getWindow();
  assert(found, 'The demo has its window');
  return found;
}

// ---- Reading pixels ------------------------------------------------------------------------------------------------------

/** The picture as bytes: RGBA, row after row. */
interface Raster {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

function rasterOf(image: Image): Raster {
  if (image.getFormat() !== Image.Format.FormatRgba8) image.convert(Image.Format.FormatRgba8);
  return { width: image.getWidth(), height: image.getHeight(), pixels: new Uint8Array(image.getData().toArrayBuffer()) };
}

/** A rectangle of device pixels, `x1` and `y1` inclusive. */
interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** How many pixels of a colour there are in a region, and the smallest box that holds them. */
interface Census {
  readonly count: number;
  readonly box: Box | undefined;
}

function census(raster: Raster, region: Box, colour: Rgb, levels: number): Census {
  let count = 0;
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (let y = region.y0; y <= region.y1; y += 1) {
    for (let x = region.x0; x <= region.x1; x += 1) {
      const at = (y * raster.width + x) * RGBA_CHANNELS;
      const red = raster.pixels[at];
      const green = raster.pixels[at + 1];
      const blue = raster.pixels[at + 2];
      if (red === undefined || green === undefined || blue === undefined) continue;
      if (Math.max(Math.abs(red - colour[0]), Math.abs(green - colour[1]), Math.abs(blue - colour[2])) > levels) continue;
      count += 1;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  return { count, box: count === 0 ? undefined : { x0, y0, x1, y1 } };
}

/** One sample as it is drawn: its layout, and what its region of the picture holds. */
interface Reading {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  /** The pixels of `colour`, within `levels` of each channel: the solid ones by default. */
  readonly of: (colour: Rgb, levels?: number) => Census;
}

function read(api: TextStrokeInspection, raster: Raster, id: string, ratio: number): Reading {
  const found = api.find(id);
  assert(found, `Missing test target ${id}`);
  const { rect } = found;
  const region: Box = {
    x0: Math.max(0, Math.floor((rect.x - SCAN_MARGIN_PX) * ratio)),
    y0: Math.max(0, Math.floor((rect.y - SCAN_MARGIN_PX) * ratio)),
    x1: Math.min(raster.width - 1, Math.ceil((rect.x + rect.width + SCAN_MARGIN_PX) * ratio)),
    y1: Math.min(raster.height - 1, Math.ceil((rect.y + rect.height + SCAN_MARGIN_PX) * ratio)),
  };
  assert(region.x1 > region.x0 && region.y1 > region.y0, `${id} is in the picture: ${JSON.stringify(rect)} at ratio ${ratio}`);
  return { id, width: rect.width, height: rect.height, of: (colour, levels = SOLID_LEVELS) => census(raster, region, colour, levels) };
}

function boxOf(found: Census, what: string): Box {
  assert(found.box, `${what}: there are no such pixels`);
  return found.box;
}

function measure(name: string, value: unknown): void {
  console.log('GODOT_REACT_TEXT_STROKE_MEASURE', JSON.stringify({ name, value }));
}

// ---- What is held to what ------------------------------------------------------------------------------------------------

/** A text and its twin have the same room: a stroke is painted, not laid out. */
function sameLayout(plain: Reading, stroked: Reading): void {
  assert(plain.width === stroked.width && plain.height === stroked.height,
    `${stroked.id} is ${stroked.width} x ${stroked.height}, its twin ${plain.id} ${plain.width} x ${plain.height}: a stroke must not change the layout`);
}

/** The fill is the twin's: a stroke under the glyphs leaves every pixel of them, one over them takes some. */
function sameFill(plain: Reading, stroked: Reading, ink: Rgb, what: string): void {
  const before = plain.of(ink).count;
  const after = stroked.of(ink).count;
  assert(before > 0, `${plain.id} has ${what} to compare with`);
  const share = Math.abs(after - before) / before;
  measure(`${stroked.id} ${what}`, { plain: before, stroked: after, share });
  assert(share <= FILL_SHARE_TOLERANCE,
    `${stroked.id} has ${after} pixels of ${what}, its twin ${plain.id} ${before}: the stroke must go under the glyphs and leave them as they are`);
}

/** The stroke is `outline` px past the fill on every side. */
function reachesOutside(stroked: Reading, fill: Rgb, stroke: Rgb, outline: number, ratio: number): void {
  const inside = boxOf(stroked.of(fill), `${stroked.id} fill`);
  const outside = boxOf(stroked.of(stroke, STROKE_LEVELS), `${stroked.id} stroke`);
  const reach = {
    left: inside.x0 - outside.x0, right: outside.x1 - inside.x1, top: inside.y0 - outside.y0, bottom: outside.y1 - inside.y1,
  };
  const expected = outline * ratio;
  measure(`${stroked.id} reach`, { expected, ...reach });
  for (const [side, px] of Object.entries(reach)) {
    assert(px >= expected - REACH_SHORT_PX * ratio && px <= expected + REACH_LONG_PX * ratio,
      `${stroked.id}: the stroke reaches ${px} device px past the fill at its ${side}, expected about ${expected} (half the stroke width, at ratio ${ratio})`);
  }
}

function noStrokeColour(plain: Reading, stroke: Rgb): void {
  assert(plain.of(stroke, STROKE_LEVELS).count <= STRAY_PIXELS, `${plain.id} has no stroke and ${plain.of(stroke, STROKE_LEVELS).count} pixels of its colour`);
}

// ---- The cases -------------------------------------------------------------------------------------------------------------

async function show(owner: Node, api: TextStrokeInspection, capture: TextStrokeCapture, strokeCase: string, ratio: number): Promise<Raster> {
  api.showTextStroke(strokeCase);
  await settleFrames();
  const raster = rasterOf(grab(owner));
  await capture(`text-stroke-${strokeCase}${ratio === 1 ? '' : `-dpr${ratio}`}`);
  return raster;
}

/** Black words with a white stroke: a whole line, a tracked line (one glyph at a time) and four lines that overlap. */
async function checkWhiteStrokes(owner: Node, api: TextStrokeInspection, capture: TextStrokeCapture, ratio: number): Promise<void> {
  for (const [strokeCase, plain, stroked] of [
    ['whole-line', 'whole-line-plain', 'whole-line-stroked'],
    ['tracked', 'tracked-plain', 'tracked-stroked'],
    ['wrapped', 'wrapped-plain', 'wrapped-stroked'],
  ] as const) {
    const raster = await show(owner, api, capture, strokeCase, ratio);
    const before = read(api, raster, plain, ratio);
    const after = read(api, raster, stroked, ratio);
    sameLayout(before, after);
    sameFill(before, after, INK, 'black');
    assert(after.of(WHITE, STROKE_LEVELS).count > 0, `${after.id} is drawn with a white stroke`);
    reachesOutside(after, INK, WHITE, STROKE_OUTLINE_PX, ratio);
  }
}

/** The control for the fill comparison: the same word a size smaller has fewer black pixels, more than the tolerance allows. */
async function checkFillControl(owner: Node, api: TextStrokeInspection, capture: TextStrokeCapture, ratio: number): Promise<void> {
  const raster = await show(owner, api, capture, 'whole-line', ratio);
  const big = read(api, raster, 'whole-line-plain', ratio).of(INK).count;
  const small = read(api, raster, 'whole-line-small', ratio).of(INK).count;
  measure('control: big and small', { big, small });
  assert(Math.abs(small - big) / big > FILL_SHARE_TOLERANCE,
    `The comparison of fills must tell a smaller word from the bigger one: ${small} pixels against ${big}`);
}

/** No stroke colour: the stroke is the colour of the text, and it makes the letters heavier by the outline on every side. */
async function checkCurrentColor(owner: Node, api: TextStrokeInspection, capture: TextStrokeCapture, ratio: number): Promise<void> {
  const raster = await show(owner, api, capture, 'current-color', ratio);
  const before = read(api, raster, 'current-plain', ratio);
  const after = read(api, raster, 'current-stroked', ratio);
  sameLayout(before, after);
  const plainCount = before.of(YELLOW).count;
  const strokedCount = after.of(YELLOW).count;
  measure('current-color yellow', { plain: plainCount, stroked: strokedCount });
  assert(strokedCount > plainCount * HEAVIER_SHARE, `A stroke in the text's own colour thickens it: ${strokedCount} pixels against ${plainCount}`);
  // The two texts are side by side, so their boxes are compared by size: the stroke adds its reach on each side of both axes.
  const was = boxOf(before.of(YELLOW), 'current-plain');
  const is = boxOf(after.of(YELLOW), 'current-stroked');
  const expected = 2 * CURRENT_COLOR_OUTLINE_PX * ratio;
  const growth = { width: (is.x1 - is.x0) - (was.x1 - was.x0), height: (is.y1 - is.y0) - (was.y1 - was.y0) };
  measure('current-color growth', { expected, ...growth });
  for (const [axis, px] of Object.entries(growth)) {
    assert(px >= expected - 2 * REACH_SHORT_PX * ratio && px <= expected + 2 * REACH_LONG_PX * ratio,
      `The stroke in the text's colour makes the text ${px} device px ${axis === 'width' ? 'wider' : 'taller'}, expected about ${expected} (its reach on both sides)`);
  }
}

/** Runs with colours of their own, in a white stroke, then with none: each run is edged in its own colour. */
async function checkRuns(owner: Node, api: TextStrokeInspection, capture: TextStrokeCapture, ratio: number): Promise<void> {
  const raster = await show(owner, api, capture, 'rich', ratio);
  const plain = read(api, raster, 'rich-plain', ratio);
  const white = read(api, raster, 'rich-white', ratio);
  const own = read(api, raster, 'rich-current', ratio);
  sameLayout(plain, white);
  sameLayout(plain, own);
  for (const [colour, name] of [[INK, 'black'], [RED, 'red'], [BLUE, 'blue']] as const) {
    sameFill(plain, white, colour, `${name} runs`);
  }
  assert(white.of(WHITE, STROKE_LEVELS).count > 0, 'The runs have a white stroke');
  noStrokeColour(own, WHITE);
  for (const [colour, name] of [[RED, 'red'], [BLUE, 'blue']] as const) {
    const before = plain.of(colour).count;
    const after = own.of(colour).count;
    measure(`rich-current ${name}`, { plain: before, stroked: after });
    assert(after > before * HEAVIER_SHARE, `The ${name} run is edged in ${name} when the stroke has no colour: ${after} pixels against ${before}`);
  }
}

async function runAt(owner: Node, api: TextStrokeInspection, capture: TextStrokeCapture, ratio: number): Promise<void> {
  await checkWhiteStrokes(owner, api, capture, ratio);
  await checkFillControl(owner, api, capture, ratio);
  await checkCurrentColor(owner, api, capture, ratio);
  await checkRuns(owner, api, capture, ratio);
}

export async function verifyTextStroke(owner: Node, api: TextStrokeInspection, capture: TextStrokeCapture): Promise<void> {
  await runAt(owner, api, capture, 1);
  // Device pixel ratio two: the window's content scale, as a retina display has it (the logical window is half as wide).
  const win = windowOf(owner);
  win.contentScaleFactor = RETINA_SCALE;
  await frames(RETINA_SETTLE_FRAMES);
  try {
    await runAt(owner, api, capture, RETINA_SCALE);
  } finally {
    win.contentScaleFactor = 1;
    await frames(RETINA_SETTLE_FRAMES);
  }
}
