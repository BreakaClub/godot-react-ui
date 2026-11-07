import { Color, Engine, Image, InputEventMouseButton, InputEventMouseMotion, MouseButton, Node, Vector2, Window } from 'godot';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import { DUAL_ROW_PX, GLASS_BLOB_IDS } from './glass-lab';
import { grab, settleFrames, type FaultControl } from './verify-filters';
import { assertionTally, parseVerifierEvent } from './verifier-input';
import { pressAction, typeText, waitForCaretOn } from './verify-text-input';

/**
 * The `glass` section of the interaction verifier: the showcase lab (`glass-lab.tsx`) captured in its states at device pixel
 * ratios one and two, with the few things a designer would look at read from the pixels: text is readable on the glass, the
 * glass blurs what is under it, its corners are clean, and a hover and a scrim change what they should. It does not repeat
 * the accuracy and stacking proofs of the `filters` section.
 */
export interface GlassInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showLab(name: 'glass'): void;
  scrollTo(testID: string, top: number): void;
}

/** `overflowing`: test ids of nodes that reach past the window by design. */
export type GlassCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

const FRAME_POLL_MS = 10;
const SETTLE_FRAMES = 6;
/** WCAG 2.x contrast ratios: normal text (AA), and large text, which a card title and the brand are. */
const NORMAL_TEXT_CONTRAST = 4.5;
const LARGE_TEXT_CONTRAST = 3;
/** The sRGB to linear transfer and the relative luminance weights of WCAG 2.x. */
const SRGB_KNEE = 0.04045;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_OFFSET = 0.055;
const SRGB_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const LUMA_RED = 0.2126;
const LUMA_GREEN = 0.7152;
const LUMA_BLUE = 0.0722;
const CONTRAST_FLARE = 0.05;
/** The widest step between neighbouring pixels (in 8-bit levels) a blur of 24 px leaves, and the narrowest a crisp tile edge has. */
const BLURRED_STEP_LEVELS = 6;
const CRISP_STEP_LEVELS = 30;
/**
 * `backdrop-blur-sm` (4 px) turns the steepest step of an edge into 1 / (4 sqrt(2 pi)), a tenth of it; this asks for a quarter. The
 * edge must have been at least `SCRIM_MIN_STEP_LEVELS` to start with, or there would be nothing to soften.
 */
const SCRIM_SOFTENING = 4;
const SCRIM_MIN_STEP_LEVELS = 15;
/** Where the first tile's bottom edge is read: this far in from its left side, and this far above and below the edge, in logical pixels. */
const EDGE_COLUMN_INSET_PX = 14;
const EDGE_REACH_PX = 6;
/**
 * Outside a rounded corner the pixel is the page's, so it is near the page's pixel a few pixels away and far from the glass's:
 * a corner that leaked the glass's tint would put it as far from the page as the glass is. The page changes a little over those
 * pixels (a blob's slope, a scrim's blur over a card's edge), so the test is relative, and the glass must be clearly tinted.
 */
const CLEAN_CORNER_SHARE = 3;
const TINTED_LEVELS = 12;
/** A hover that goes from `bg-white/20` to `bg-white/40` lightens the button by at least this. */
const HOVER_LIGHTENS_LEVELS = 8;
/** `bg-black/30` darkens what it covers to 0.7 of it; the blur keeps the mean. */
const SCRIM_DARKENING = 0.7;
const SCRIM_DARKENING_TOLERANCE = 0.08;
const LEVELS = 255;
/** Corner probes: the page's pixel this far outside a corner (diagonally), the pixel just inside the box's corner, and the glass's at half the radius in. */
const PAGE_PROBE_PX = 3;
const CORNER_PROBE_PX = 1;
/** The scrim's darkening is read from a square this big in the window's bottom left corner, this far in from the edges. */
const SCRIM_PROBE_INSET_PX = 4;
const SCRIM_PROBE_SIZE_PX = 24;
/** Where the bar is read for a blur: this far from the brand's and the next thing's edges, to keep the text out. */
const TEXT_FREE_MARGIN_PX = 8;
/** Logged values are rounded to a tenth, or to a hundredth for ratios. */
const TENTH = 10;
const HALF = 0.5;
const HUNDREDTH = 100;

function round(value: number, scale: number): number {
  return Math.round(value * scale) / scale;
}

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function node(api: GlassInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

function centreOf(api: GlassInspection, testID: string): Vector2 {
  const { rect } = node(api, testID);
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

/**
 * The window's content scale: input is placed in window pixels, and the snapshot's rectangles are in logical ones, so a
 * point is scaled by this on its way in (the lab is shown at one and at two).
 */
let contentScale = 1;

function windowPoint(at: Vector2): Vector2 {
  return new Vector2(at.x * contentScale, at.y * contentScale);
}

function move(at: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = windowPoint(at);
  event.globalPosition = event.position;
  parseVerifierEvent(event);
}

function button(at: Vector2, pressed: boolean): void {
  const event = new InputEventMouseButton();
  event.position = windowPoint(at);
  event.globalPosition = event.position;
  event.buttonIndex = MouseButton.MouseButtonLeft;
  event.pressed = pressed;
  parseVerifierEvent(event);
}

async function click(api: GlassInspection, testID: string): Promise<void> {
  const at = centreOf(api, testID);
  move(at);
  await frames(3);
  button(at, true);
  await frames(2);
  button(at, false);
  await frames(SETTLE_FRAMES);
}

/** Clear space kept between the bar or the window's edge and what is scrolled into view. */
const VIEW_MARGIN_PX = 16;

/** Scroll to the top, then, if `testID` is not fully in the window there, scroll it to just under the bar. */
async function lookAt(api: GlassInspection, testID: string): Promise<void> {
  api.scrollTo('glass-scroll', 0);
  await frames(SETTLE_FRAMES);
  const { rect } = node(api, testID);
  if (rect.y + rect.height <= api.snapshot().height - VIEW_MARGIN_PX) return;
  const bar = node(api, 'glass-bar').rect;
  api.scrollTo('glass-scroll', Math.round(rect.y - (bar.y + bar.height) - VIEW_MARGIN_PX));
  await frames(SETTLE_FRAMES);
}

// ---- Reading pixels ------------------------------------------------------------------------------------------------------

function linear(channel: number): number {
  return channel <= SRGB_KNEE ? channel / SRGB_LINEAR_SLOPE : ((channel + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA;
}

function luminance(colour: Color): number {
  return LUMA_RED * linear(colour.r) + LUMA_GREEN * linear(colour.g) + LUMA_BLUE * linear(colour.b);
}

/** Physical pixels per logical pixel of the render. */
function pixelRatio(image: Image, api: GlassInspection): number {
  return image.getWidth() / api.snapshot().width;
}

interface PixelBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function boxOf(rect: NativeSnapshotNode['rect'], ratio: number): PixelBox {
  return { x0: Math.round(rect.x * ratio), y0: Math.round(rect.y * ratio), x1: Math.round((rect.x + rect.width) * ratio), y1: Math.round((rect.y + rect.height) * ratio) };
}

/** WCAG contrast of the text drawn in `box` against what is behind it: the brightest pixel against the median one. */
function contrastIn(image: Image, box: PixelBox): number {
  const lights: number[] = [];
  for (let y = box.y0; y < box.y1; y += 1) {
    for (let x = box.x0; x < box.x1; x += 1) lights.push(luminance(image.getPixel(x, y)));
  }
  lights.sort((a, b) => a - b);
  const text = lights[lights.length - 1] ?? 0;
  const behind = lights[Math.floor(lights.length / 2)] ?? 0;
  return (text + CONTRAST_FLARE) / (behind + CONTRAST_FLARE);
}

/** The widest step, in 8-bit levels of the mean of the three channels, between neighbouring pixels along a row. */
function widestStep(image: Image, y: number, x0: number, x1: number): number {
  let widest = 0;
  let before = image.getPixel(x0, y);
  for (let x = x0 + 1; x < x1; x += 1) {
    const here = image.getPixel(x, y);
    widest = Math.max(widest, Math.abs((here.r + here.g + here.b - before.r - before.g - before.b) / 3 * LEVELS));
    before = here;
  }
  return widest;
}

/** The widest step, in 8-bit levels of the mean of the three channels, between neighbouring pixels down a column. */
function widestStepDown(image: Image, x: number, y0: number, y1: number): number {
  let widest = 0;
  let before = image.getPixel(x, y0);
  for (let y = y0 + 1; y < y1; y += 1) {
    const here = image.getPixel(x, y);
    widest = Math.max(widest, Math.abs((here.r + here.g + here.b - before.r - before.g - before.b) / 3 * LEVELS));
    before = here;
  }
  return widest;
}

/** The largest difference of one channel between two pixels, in 8-bit levels. */
function levelsApart(a: Color, b: Color): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b)) * LEVELS;
}

function brightness(colour: Color): number {
  return (colour.r + colour.g + colour.b) / 3 * LEVELS;
}

/** The mean of each channel, in 8-bit levels, over a square of pixels. */
function meanChannels(image: Image, x: number, y: number, size: number): [number, number, number] {
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let dy = 0; dy < size; dy += 1) {
    for (let dx = 0; dx < size; dx += 1) {
      const pixel = image.getPixel(x + dx, y + dy);
      red += pixel.r;
      green += pixel.g;
      blue += pixel.b;
    }
  }
  const count = size * size;
  return [red / count * LEVELS, green / count * LEVELS, blue / count * LEVELS];
}

/** The mean brightness of a square of pixels. */
function meanBrightness(image: Image, x: number, y: number, size: number): number {
  let sum = 0;
  for (let dy = 0; dy < size; dy += 1) for (let dx = 0; dx < size; dx += 1) sum += brightness(image.getPixel(x + dx, y + dy));
  return sum / (size * size);
}

// ---- The checks ----------------------------------------------------------------------------------------------------------

/** The card with a filter and a backdrop-filter: the backdrop-blurred circles behind it have no step this large between two pixels. */
const SOFT_STEP_LEVELS = 12;

/**
 * A card that has both `backdrop-blur-xl` and `drop-shadow-lg`: its items hang with the backdrop outside the group (so the
 * glass shows its blurred backdrop, not a white slab), and the circles behind it are softened along a row across two edges.
 */
async function checkDual(owner: Node, api: GlassInspection, capture: GlassCapture, label: string): Promise<void> {
  await lookAt(api, 'glass-dual-card');
  const image = grab(owner);
  const ratio = pixelRatio(image, api);
  const card = node(api, 'glass-dual-card');
  assert(card.effects?.layout === 'both' && card.effects.backdrop?.plan && card.effects.filter,
    `${label}: the card with backdrop-blur-xl and drop-shadow-lg draws both: ${JSON.stringify(card.effects)}`);
  const box = boxOf(card.rect, ratio);
  const y = Math.round((node(api, 'glass-dual').rect.y + DUAL_ROW_PX) * ratio);
  let widest = 0;
  for (let x = box.x0 + Math.round(CARD_RADIUS * ratio); x < box.x1 - Math.round(CARD_RADIUS * ratio); x += 1) {
    widest = Math.max(widest, levelsApart(image.getPixel(x, y), image.getPixel(x + 1, y)));
  }
  console.log('GODOT_REACT_GLASS_DUAL', JSON.stringify({ label, widest: round(widest, TENTH) }));
  assert(widest <= SOFT_STEP_LEVELS, `${label}: the circles behind the dual card are blurred: ${widest.toFixed(1)} levels between two neighbours (limit ${SOFT_STEP_LEVELS})`);
  await capture(`${label}-dual`, GLASS_BLOB_IDS);
}

/** What each text's contrast must reach: large text (the brand, a card's title) 3:1, the rest 4.5:1. */
const TEXTS: ReadonlyArray<{ testID: string; need: number }> = [
  { testID: 'glass-brand', need: LARGE_TEXT_CONTRAST },
  { testID: 'glass-card-title-0', need: LARGE_TEXT_CONTRAST },
  { testID: 'glass-card-body-0', need: NORMAL_TEXT_CONTRAST },
  { testID: 'glass-stack-title', need: LARGE_TEXT_CONTRAST },
  { testID: 'glass-dual-title', need: LARGE_TEXT_CONTRAST },
];

async function checkContrast(owner: Node, api: GlassInspection, texts: ReadonlyArray<{ testID: string; need: number }>, label: string): Promise<void> {
  const measured: Record<string, number> = {};
  const short: string[] = [];
  for (const { testID, need } of texts) {
    await lookAt(api, testID);
    const image = grab(owner);
    const contrast = contrastIn(image, boxOf(node(api, testID).rect, pixelRatio(image, api)));
    measured[testID] = round(contrast, HUNDREDTH);
    if (contrast < need) short.push(`${testID} has ${contrast.toFixed(2)}, ${need} is needed`);
  }
  console.log('GODOT_REACT_GLASS_CONTRAST', JSON.stringify({ label, measured }));
  assert(short.length === 0, `${label}: text is not readable on the glass behind it: ${short.join('; ')}`);
}

/**
 * A rounded corner is clean when the pixel just inside the bounding box but outside the arc is the page's (no square tint
 * leaking out of the corner) and the pixel inside the arc is the glass's. All four corners are read and the cleanest one is
 * judged: a square tint leaks at every corner, and what is under a corner is the page's own business (a sheet's corner over the
 * blurred heading differs from the page beside it by 11 levels with no leak at all). `verify-filters.ts` holds the shape exactly,
 * over stripes it knows.
 */
async function checkCorner(owner: Node, api: GlassInspection, testID: string, radius: number, label: string): Promise<void> {
  await lookAt(api, testID);
  const image = grab(owner);
  const ratio = pixelRatio(image, api);
  const box = boxOf(node(api, testID).rect, ratio);
  const arcInset = Math.round(radius * ratio * HALF);
  const corners = ([[box.x0, 1], [box.x1 - 1, -1]] as const).flatMap(([x, inwardX]) => ([[box.y0, 1], [box.y1 - 1, -1]] as const).map(([y, inwardY]) => {
    const page = image.getPixel(x - inwardX * PAGE_PROBE_PX, y - inwardY * PAGE_PROBE_PX);
    return {
      leaked: levelsApart(image.getPixel(x + inwardX * CORNER_PROBE_PX, y + inwardY * CORNER_PROBE_PX), page),
      tint: levelsApart(image.getPixel(x + inwardX * arcInset, y + inwardY * arcInset), page),
    };
  }));
  const cleanest = corners.reduce((best, corner) => (corner.leaked * best.tint < best.leaked * corner.tint ? corner : best));
  const { leaked, tint } = cleanest;
  assert(tint >= TINTED_LEVELS, `${label}: inside ${testID}'s corner the glass is only ${tint.toFixed(1)} levels from the page`);
  assert(leaked * CLEAN_CORNER_SHARE <= tint, `${label}: outside ${testID}'s rounded corner the page is changed by ${leaked.toFixed(1)} levels, the glass inside by ${tint.toFixed(1)}`);
  console.log('GODOT_REACT_GLASS_CORNER', JSON.stringify({ label, testID, leaked: round(leaked, TENTH), tint: round(tint, TENTH) }));
}

/**
 * The 1 px border of a rounded glass box is an unbroken line: all round the top left corner's arc (from the left side to the
 * top) the brightest pixel within a pixel of where the border runs stands this far above the glass just inside it. One
 * `StyleBoxFlat` call drew it dotted at a device pixel ratio of one, because its ring's inner antialiasing adds a translucent
 * fill twice (`native/render_tree.rs` `record_box`): its dimmest point was 11 levels above the glass, against 26 or more drawn as
 * a ring over a fill of its own.
 */
const BORDER_LIFT_LEVELS = 18;
const ARC_STEPS = 18;
const QUARTER_TURN = Math.PI / 2;
/** Where the glass is read for comparison, in logical pixels inside the border. */
const BORDER_INSIDE_PX = 4;

function arcLift(image: Image, box: PixelBox, radius: number, ratio: number, step: number): number {
  const turn = Math.PI + QUARTER_TURN * step / ARC_STEPS;
  const arc = radius * ratio;
  const centre = { x: box.x0 + arc, y: box.y0 + arc };
  const at = (distance: number): { x: number; y: number } => ({ x: Math.round(centre.x + distance * Math.cos(turn)), y: Math.round(centre.y + distance * Math.sin(turn)) });
  const ring = at(arc - ratio / 2);
  let peak = 0;
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) peak = Math.max(peak, brightness(image.getPixel(ring.x + dx, ring.y + dy)));
  const inside = at(arc - BORDER_INSIDE_PX * ratio);
  return peak - brightness(image.getPixel(inside.x, inside.y));
}

async function checkBorder(owner: Node, api: GlassInspection, testID: string, radius: number, label: string): Promise<void> {
  await lookAt(api, testID);
  const image = grab(owner);
  const ratio = pixelRatio(image, api);
  const box = boxOf(node(api, testID).rect, ratio);
  let dimmest = Number.POSITIVE_INFINITY;
  for (let step = 0; step <= ARC_STEPS; step += 1) dimmest = Math.min(dimmest, arcLift(image, box, radius, ratio, step));
  console.log('GODOT_REACT_GLASS_BORDER', JSON.stringify({ label, testID, dimmest: round(dimmest, TENTH) }));
  assert(dimmest >= BORDER_LIFT_LEVELS, `${label}: ${testID}'s border is broken along its corner: its dimmest point is ${dimmest.toFixed(1)} levels above the glass, at least ${BORDER_LIFT_LEVELS} are expected`);
}

/** Scroll the tile row under the bar, then compare the widest step across the row inside the bar with the one just below it. */
async function checkBarBlurs(owner: Node, api: GlassInspection, capture: GlassCapture, label: string): Promise<void> {
  api.scrollTo('glass-scroll', 0);
  await frames(SETTLE_FRAMES);
  const tile = node(api, 'glass-tile-0').rect;
  const bar = node(api, 'glass-bar').rect;
  // The row of tiles is centred on the bar, so it is behind all of it and a half tile reaches below.
  api.scrollTo('glass-scroll', Math.round(tile.y + tile.height / 2 - (bar.y + bar.height / 2)));
  await frames(SETTLE_FRAMES);
  await capture(`${label}-scrolled`, GLASS_BLOB_IDS);
  const image = grab(owner);
  const ratio = pixelRatio(image, api);
  const brand = boxOf(node(api, 'glass-brand').rect, ratio);
  const barBox = boxOf(node(api, 'glass-bar').rect, ratio);
  const signIn = boxOf(node(api, 'glass-signin').rect, ratio);
  // A stretch of the bar with no text in it, from the brand to the next thing on the bar (the links, or the button).
  const links = api.find('glass-links');
  const from = brand.x1 + Math.round(TEXT_FREE_MARGIN_PX * ratio);
  const to = (links === undefined ? signIn.x0 : boxOf(links.rect, ratio).x0) - Math.round(TEXT_FREE_MARGIN_PX * ratio);
  const inside = widestStep(image, Math.round((barBox.y0 + barBox.y1) / 2), from, to);
  const below = widestStep(image, barBox.y1 + Math.round(TEXT_FREE_MARGIN_PX * ratio), from, to);
  console.log('GODOT_REACT_GLASS_BLUR', JSON.stringify({ label, inside: round(inside, TENTH), below: round(below, TENTH) }));
  assert(below >= CRISP_STEP_LEVELS, `${label}: the tiles just below the bar have crisp edges (${below.toFixed(1)} levels) for the bar to blur`);
  assert(inside <= BLURRED_STEP_LEVELS, `${label}: the tiles behind the bar are blurred (widest step ${inside.toFixed(1)} levels, at most ${BLURRED_STEP_LEVELS})`);
  api.scrollTo('glass-scroll', 0);
  await frames(SETTLE_FRAMES);
}

/**
 * Content moving under the glass is stable from frame to frame: a tile's edge carried across the bar a pixel at a time changes
 * the glass's mean colour over a stretch with no text in it steadily, in one direction, with no step more than two levels
 * off the trend (the channel that changes most is followed). A blur that shimmered (a mip level's texels sliding past the kernel) would flicker back and forth by several levels
 * a step; two levels of 255 are below what an eye sees.
 */
const SCROLL_STEPS = 24;
/** The most a step may go against the direction of the whole run, and the most the change of one step may differ from the next's. */
const BACKWARD_LEVELS = 0.1;
const TREND_LEVELS = 2;
/** The tiles' bottom edge is carried across the bar's middle during the steps, so the colour followed changes by at least this over the run. */
const MOVING_EDGE_MIN_TOTAL_LEVELS = 8;

async function checkScrollStable(owner: Node, api: GlassInspection, label: string): Promise<void> {
  api.scrollTo('glass-scroll', 0);
  await frames(SETTLE_FRAMES);
  const tile = node(api, 'glass-tile-0').rect;
  const bar = node(api, 'glass-bar').rect;
  // The tiles' bottom edge starts half the steps below the bar's middle and ends half of them above it.
  const base = Math.round(tile.y + tile.height - (bar.y + bar.height / 2 + SCROLL_STEPS / 2));
  const samples: Array<[number, number, number]> = [];
  for (let step = 0; step < SCROLL_STEPS; step += 1) {
    api.scrollTo('glass-scroll', base + step);
    await frames(2);
    const image = grab(owner);
    const ratio = pixelRatio(image, api);
    const brand = boxOf(node(api, 'glass-brand').rect, ratio);
    const barBox = boxOf(node(api, 'glass-bar').rect, ratio);
    const links = api.find('glass-links');
    const signIn = boxOf(node(api, 'glass-signin').rect, ratio);
    const from = brand.x1 + Math.round(TEXT_FREE_MARGIN_PX * ratio);
    const to = (links === undefined ? signIn.x0 : boxOf(links.rect, ratio).x0) - Math.round(TEXT_FREE_MARGIN_PX * ratio);
    const patch = Math.round(SCRIM_PROBE_SIZE_PX * ratio);
    samples.push(meanChannels(image, Math.round((from + to) / 2) - Math.round(patch / 2), Math.round((barBox.y0 + barBox.y1) / 2) - Math.round(patch / 2), patch));
  }
  // The channel that changes most over the run is the one to follow: the tiles differ in colour, not always in brightness.
  const changes = [0, 1, 2].map(channel => Math.abs((samples[samples.length - 1]?.[channel] ?? 0) - (samples[0]?.[channel] ?? 0)));
  const followed = changes.indexOf(Math.max(...changes));
  const levels = samples.map(sample => sample[followed] ?? 0);
  const direction = Math.sign((levels[levels.length - 1] ?? 0) - (levels[0] ?? 0));
  let slowest = Number.POSITIVE_INFINITY;
  let backward = 0;
  let worstTurn = 0;
  for (let index = 1; index < levels.length; index += 1) {
    const change = ((levels[index] ?? 0) - (levels[index - 1] ?? 0)) * direction;
    slowest = Math.min(slowest, change);
    backward = Math.max(backward, -change);
    if (index > 1) worstTurn = Math.max(worstTurn, Math.abs((levels[index] ?? 0) - 2 * (levels[index - 1] ?? 0) + (levels[index - 2] ?? 0)));
  }
  console.log('GODOT_REACT_GLASS_STABLE', JSON.stringify({ label, steps: SCROLL_STEPS, from: round(levels[0] ?? 0, TENTH), to: round(levels[levels.length - 1] ?? 0, TENTH), backward: round(backward, HUNDREDTH), worstTurn: round(worstTurn, HUNDREDTH) }));
  assert(direction !== 0 && Math.abs((levels[levels.length - 1] ?? 0) - (levels[0] ?? 0)) >= MOVING_EDGE_MIN_TOTAL_LEVELS, `${label}: the tiles' edge moving under the bar changes the glass's colour`);
  assert(backward <= BACKWARD_LEVELS && worstTurn <= TREND_LEVELS, `${label}: the glass flickers as the page moves under it: a step goes back by ${backward.toFixed(2)} levels and one differs from the next by ${worstTurn.toFixed(2)}`);
  api.scrollTo('glass-scroll', 0);
  await frames(SETTLE_FRAMES);
}

/** What is typed into the glass card's field. */
const TYPED_TEXT = 'Night drive';
/** Where the field's text starts: `px-4` and the border, in logical pixels. */
const INPUT_TEXT_INSET_PX = 17;
/** The caret is a thin line: read it with this much of its surroundings, in logical pixels, to find the glass behind it. */
const CARET_SURROUND_PX = 4;

/** The median of each channel over a box of pixels: the colour behind text that covers a minority of it. */
function medianColour(image: Image, box: PixelBox): Color {
  const channels: number[][] = [[], [], []];
  for (let y = box.y0; y < box.y1; y += 1) {
    for (let x = box.x0; x < box.x1; x += 1) {
      const colour = image.getPixel(x, y);
      channels[0]?.push(colour.r);
      channels[1]?.push(colour.g);
      channels[2]?.push(colour.b);
    }
  }
  const [red = 0, green = 0, blue = 0] = channels.map(values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0);
  return new Color(red, green, blue, 1);
}

/**
 * A text input on a glass card (`TextInput`): its placeholder, its caret and its selection read on the glass. The caret is a
 * line against the field behind it, so it needs the contrast of a UI component (3:1); the text drawn over the selection's
 * highlight must keep its contrast, and the highlight must be told from the field around it.
 */
async function checkInput(owner: Node, api: GlassInspection, capture: GlassCapture, label: string): Promise<void> {
  const field = (): NativeSnapshotNode => node(api, 'glass-search');
  const state = (): NonNullable<NativeSnapshotNode['textInput']> => {
    const found = field().textInput;
    assert(found, 'The glass search field is a text input');
    return found;
  };
  await lookAt(api, 'glass-search');
  assert(state().showingPlaceholder, `${label}: the field starts empty, showing its placeholder`);
  await checkContrast(owner, api, [{ testID: 'glass-search', need: NORMAL_TEXT_CONTRAST }], `${label} placeholder`);

  await click(api, 'glass-search');
  assert(api.snapshot().focused === field().id, `${label}: pressing the field focuses it`);
  await typeText(TYPED_TEXT);
  assert(state().value === TYPED_TEXT, `${label}: the field holds what was typed: ${state().value}`);
  await waitForCaretOn(api, 'glass-search');
  await capture(`${label}-input`, GLASS_BLOB_IDS);
  let image = grab(owner);
  let ratio = pixelRatio(image, api);
  const caret = state().caret;
  assert(caret !== null, `${label}: the focused field has a caret`);
  const line = boxOf(caret, ratio);
  const surround = Math.round(CARET_SURROUND_PX * ratio);
  // The line and the glass either side of it: the line is the brightest pixel, the glass the median.
  const caretContrast = contrastIn(image, { x0: line.x0 - surround, y0: line.y0, x1: line.x1 + surround, y1: line.y1 });
  console.log('GODOT_REACT_GLASS_INPUT', JSON.stringify({ label, caret: round(caretContrast, HUNDREDTH) }));
  assert(caretContrast >= LARGE_TEXT_CONTRAST, `${label}: the caret reads against the glass behind it: ${caretContrast.toFixed(2)}, ${LARGE_TEXT_CONTRAST} is needed`);

  await pressAction('ui_text_select_all');
  await waitForCaretOn(api, 'glass-search');
  await capture(`${label}-input-selected`, GLASS_BLOB_IDS);
  assert(state().selectionStart === 0 && state().selectionEnd === TYPED_TEXT.length, `${label}: select all selects the text`);
  image = grab(owner);
  ratio = pixelRatio(image, api);
  const end = boxOf(state().caret ?? caret, ratio);
  const text: PixelBox = { x0: boxOf(field().rect, ratio).x0 + Math.round(INPUT_TEXT_INSET_PX * ratio), y0: end.y0, x1: end.x0, y1: end.y1 };
  const selectedContrast = contrastIn(image, text);
  const highlighted = medianColour(image, text);
  const around = image.getPixel(end.x1 + Math.round(INPUT_TEXT_INSET_PX * ratio), Math.round((end.y0 + end.y1) / 2));
  const apart = levelsApart(highlighted, around);
  console.log('GODOT_REACT_GLASS_INPUT', JSON.stringify({ label, selectedText: round(selectedContrast, HUNDREDTH), highlightApart: round(apart, TENTH) }));
  assert(selectedContrast >= LARGE_TEXT_CONTRAST, `${label}: the text over the selection keeps its contrast: ${selectedContrast.toFixed(2)}, ${LARGE_TEXT_CONTRAST} is needed`);
  assert(apart >= TINTED_LEVELS, `${label}: the selection's highlight is told from the field around it: ${apart.toFixed(1)} levels`);

  // Leave the field empty and unfocused, as the next pass finds it.
  await pressAction('ui_text_backspace');
  move(new Vector2(1, 1));
  button(new Vector2(1, 1), true);
  button(new Vector2(1, 1), false);
  await frames(SETTLE_FRAMES);
  assert(state().showingPlaceholder, `${label}: the field is empty again`);
}

/** How far past the press a drag starts, in logical pixels (the drag threshold is smaller). */
const DRAG_START_PX = 12;
/** The ghost's tile edges must stay at least this crisp for it to be called unblurred. */
const GHOST_CRISP_LEVELS = 15;

/**
 * Dragging a glass card (`draggable`): the ghost is a copy of what the card's items recorded, a translucent box and its text
 * at 60 %, and the card's `backdrop-filter` is not recorded, so the ghost carries no glass: over the tile row its edges stay
 * crisp where the card at rest blurs them. This is the behaviour, not a wish: it checks that the ghost is drawn, is the card's
 * size, and is unblurred, so a change to either side shows.
 */
async function checkDragGhost(owner: Node, api: GlassInspection, capture: GlassCapture, label: string): Promise<void> {
  api.scrollTo('glass-scroll', 0);
  await frames(SETTLE_FRAMES);
  const card = node(api, 'glass-card-0').rect;
  const tile = node(api, 'glass-tile-0').rect;
  if (card.y + card.height > api.snapshot().height) {
    console.log('GODOT_REACT_GLASS_SKIPPED', JSON.stringify({ label, check: 'drag ghost', reason: 'the card is below the fold' }));
    return;
  }
  const pressAt = new Vector2(card.x + card.width / 2, card.y + DRAG_START_PX * 2);
  const drop = new Vector2(pressAt.x, tile.y + DRAG_START_PX + (pressAt.y - card.y));
  move(pressAt);
  await frames(SETTLE_FRAMES);
  button(pressAt, true);
  await frames(SETTLE_FRAMES);
  move(new Vector2(pressAt.x + DRAG_START_PX, pressAt.y + DRAG_START_PX));
  await frames(SETTLE_FRAMES);
  move(drop);
  await frames(SETTLE_FRAMES);
  const ghost = api.snapshot().drag.ghost;
  assert(ghost !== null, `${label}: dragging a glass card draws a ghost`);
  assert(Math.abs(ghost.width - card.width) <= 1 && Math.abs(ghost.height - card.height) <= 1, `${label}: the ghost is the card's size: ${JSON.stringify(ghost)}`);
  await capture(`${label}-drag`, GLASS_BLOB_IDS);
  const image = grab(owner);
  const ratio = pixelRatio(image, api);
  const row = Math.round((tile.y + tile.height / 2) * ratio);
  const inset = Math.round(INPUT_TEXT_INSET_PX * ratio);
  const step = widestStep(image, row, Math.round(ghost.x * ratio) + inset, Math.round((ghost.x + ghost.width) * ratio) - inset);
  console.log('GODOT_REACT_GLASS_GHOST', JSON.stringify({ label, tileEdgeStep: round(step, TENTH) }));
  assert(step >= GHOST_CRISP_LEVELS, `${label}: the ghost carries no blur: the tiles' edges through it are crisp (${step.toFixed(1)} levels)`);
  button(drop, false);
  await frames(SETTLE_FRAMES);
  assert(api.snapshot().drag.ghost === null, `${label}: the ghost is gone when the drag ends`);
}

/** Hover over a card's button: the pill lightens, and moving off it puts it back. */
async function checkHover(owner: Node, api: GlassInspection, capture: GlassCapture, label: string): Promise<void> {
  await lookAt(api, 'glass-card-button-0');
  const target = node(api, 'glass-card-button-0').rect;
  const probe = (): number => {
    const image = grab(owner);
    const ratio = pixelRatio(image, api);
    // Left of the label, inside the pill's cap.
    return brightness(image.getPixel(Math.round((target.x + target.height / 2) * ratio), Math.round((target.y + target.height / 2) * ratio)));
  };
  move(new Vector2(2, 2));
  await frames(SETTLE_FRAMES);
  const rest = probe();
  move(centreOf(api, 'glass-card-button-0'));
  await frames(SETTLE_FRAMES);
  const hovered = probe();
  await capture(`${label}-hover`, GLASS_BLOB_IDS);
  assert(hovered - rest >= HOVER_LIGHTENS_LEVELS, `${label}: hovering the card's button lightens it by ${(hovered - rest).toFixed(1)} levels, at least ${HOVER_LIGHTENS_LEVELS} are expected`);
  move(new Vector2(2, 2));
  await frames(SETTLE_FRAMES);
}

/** Open the sheet from the bar's button: the scrim darkens and blurs the page, the sheet's text reads, and Cancel closes it. */
async function checkSheet(owner: Node, api: GlassInspection, capture: GlassCapture, label: string): Promise<void> {
  api.scrollTo('glass-scroll', 0);
  await frames(SETTLE_FRAMES);
  const before = grab(owner);
  const ratio = pixelRatio(before, api);
  // The bottom edge of the first tile, down a column beside the sheet (which is centred, and covers the middle of the tile row).
  const tile = boxOf(node(api, 'glass-tile-0').rect, ratio);
  const column = tile.x0 + Math.round(EDGE_COLUMN_INSET_PX * ratio);
  const edge = { from: tile.y1 - Math.round(EDGE_REACH_PX * ratio), to: tile.y1 + Math.round(EDGE_REACH_PX * ratio) };
  const sharp = widestStepDown(before, column, edge.from, edge.to);
  const probe = Math.round(SCRIM_PROBE_SIZE_PX * ratio);
  const corner = { x: Math.round(SCRIM_PROBE_INSET_PX * ratio), y: before.getHeight() - Math.round(SCRIM_PROBE_INSET_PX * ratio) - probe };
  const brightBefore = meanBrightness(before, corner.x, corner.y, probe);
  await click(api, 'glass-signin');
  await capture(`${label}-sheet`, GLASS_BLOB_IDS);
  const after = grab(owner);
  const dimmed = meanBrightness(after, corner.x, corner.y, probe) / brightBefore;
  assert(Math.abs(dimmed - SCRIM_DARKENING) <= SCRIM_DARKENING_TOLERANCE, `${label}: the scrim leaves ${dimmed.toFixed(2)} of the page's brightness, ${SCRIM_DARKENING} is expected`);
  const sheet = node(api, 'glass-sheet').rect;
  if (column / ratio >= sheet.x && column / ratio <= sheet.x + sheet.width) {
    // A window this narrow has the sheet across the tile's side: there is no tile edge beside it to read.
    console.log('GODOT_REACT_GLASS_SKIPPED', JSON.stringify({ label, check: 'scrim blur', reason: 'the sheet covers the tile column' }));
  } else {
    const softened = widestStepDown(after, column, edge.from, edge.to);
    console.log('GODOT_REACT_GLASS_SCRIM', JSON.stringify({ label, sharp: round(sharp, TENTH), softened: round(softened, TENTH), dimmed: round(dimmed, HUNDREDTH) }));
    assert(sharp >= SCRIM_MIN_STEP_LEVELS && softened * SCRIM_SOFTENING <= sharp, `${label}: the scrim's blur softens the tiles' edges from ${sharp.toFixed(1)} to ${softened.toFixed(1)} levels`);
  }
  await checkContrast(owner, api, [{ testID: 'glass-sheet-title', need: LARGE_TEXT_CONTRAST }], `${label} sheet`);
  await checkCorner(owner, api, 'glass-sheet', SHEET_RADIUS, `${label} sheet`);
  await click(api, 'glass-sheet-cancel');
  assert(api.find('glass-sheet') === undefined, `${label}: Cancel closes the sheet`);
}

/** The corner radii of the lab's classes: `rounded-2xl` and `rounded-3xl` in logical pixels. */
const BAR_RADIUS = 16;
const CARD_RADIUS = 24;
const SHEET_RADIUS = 24;

async function verifyStates(owner: Node, api: GlassInspection, capture: GlassCapture, label: string): Promise<void> {
  api.scrollTo('glass-scroll', 0);
  await frames(SETTLE_FRAMES);
  await capture(`${label}-page`, GLASS_BLOB_IDS);
  await checkContrast(owner, api, TEXTS, `${label} page`);
  await checkCorner(owner, api, 'glass-card-0', CARD_RADIUS, `${label} page`);
  await checkCorner(owner, api, 'glass-bar', BAR_RADIUS, `${label} page`);
  await checkBorder(owner, api, 'glass-card-0', CARD_RADIUS, `${label} page`);
  await checkBorder(owner, api, 'glass-bar', BAR_RADIUS, `${label} page`);
  await checkBarBlurs(owner, api, capture, label);
  await checkDual(owner, api, capture, label);
  await checkScrollStable(owner, api, label);
  await checkHover(owner, api, capture, label);
  await checkInput(owner, api, capture, label);
  await checkDragGhost(owner, api, capture, label);
  await checkSheet(owner, api, capture, label);
}

function window(owner: Node): Window {
  const found = owner.getWindow();
  assert(found, 'The demo has its window');
  return found;
}

export async function verifyGlass(owner: Node, api: GlassInspection, capture: GlassCapture): Promise<void> {
  api.showLab('glass');
  await settleFrames();
  await verifyStates(owner, api, capture, 'glass');
  // Device pixel ratio two: the window's content scale, as a retina display has it (the logical window is half as wide).
  const win = window(owner);
  win.contentScaleFactor = 2;
  contentScale = 2;
  await frames(SETTLE_FRAMES);
  try {
    await verifyStates(owner, api, capture, 'glass-dpr2');
  } finally {
    win.contentScaleFactor = 1;
    contentScale = 1;
    await frames(SETTLE_FRAMES);
  }
}

/** The negative control for the border fix (`filters-faults`): the check above must fail with the single-draw fault on. */
export const GLASS_FAULT_CONTROLS: readonly FaultControl[] = [
  {
    fault: 'single-border-draw', guards: 'a translucent border is an unbroken line (the ring drawn over a fill of its own)',
    run: async (owner, api) => {
      api.showLab('glass');
      await settleFrames();
      await checkBorder(owner, api, 'glass-card-0', CARD_RADIUS, 'fault control');
    },
    overflowing: GLASS_BLOB_IDS,
    fails: /border is broken along its corner/u,
  },
  {
    fault: 'backdrop-in-wrapper', guards: 'a glass card with backdrop-blur-xl and drop-shadow-lg draws its backdrop outside its own group',
    run: async (owner, api, capture) => {
      api.showLab('glass');
      await settleFrames();
      await checkDual(owner, api, capture, 'fault control');
    },
    overflowing: GLASS_BLOB_IDS,
    fails: /draws both/u,
  },
];
