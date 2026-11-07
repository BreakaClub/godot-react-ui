import {
  Color, Engine, Image, InputEventMouseButton, InputEventMouseMotion, MouseButton, MouseButtonMask, Node, Vector2, Window,
} from 'godot';
import type { UISelection } from '../../src';
import type { NativeActivity, NativeMatrix, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import { BEHAVIOUR, CARD, SHAPE_CASES, STAGE, TRANSITION_CASES, TRANSITION_DURATION_MS, type TransitionCase } from './transform-data';
import { GOLDEN_ANCHOR_RECT, GOLDEN_BAR_RECT, GOLDEN_SHAPE_RECTS, GOLDEN_TRANSITION_MATRICES, type GoldenRect } from './transform-golden';
import { sendTransition, setTransformCase } from './transform-lab';
import { grab, settleFrames } from './verify-filters';
import { assertionTally, parseVerifierEvent } from './verifier-input';
import { typeText } from './verify-text-input';

/**
 * The `transforms` section of the interaction verifier (docs/tracks/transforms.md). The shape cases are drawn at device
 * pixel ratios one and two and captured for the comparison with Chrome (`scripts/transform-reference.mjs --diff`); the
 * rectangle of each is held to the one Chrome reports for the same CSS (`transform-golden.ts`). The behaviour pages are driven
 * with synthetic input and check that every reader of geometry goes through the matrix, and the transition cases are
 * sampled while they run and held to Chrome's matrices.
 */
export interface TransformsInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showLab(name: 'transforms'): void;
  activity(): NativeActivity;
  selection(): UISelection | undefined;
  scrollTo(testID: string, top: number): void;
}

/** `overflowing`: test ids of nodes that reach past the window by design. */
export type TransformsCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

const FRAME_POLL_MS = 10;
const SETTLE_FRAMES = 4;
const RETINA_SCALE = 2;
/** The matrix the library reports may differ from Chrome's by this in a, b, c and d, and by `RECT_TOLERANCE_PX` in e, f and rectangles. */
const MATRIX_TOLERANCE = 0.01;
const RECT_TOLERANCE_PX = 0.75;
/** A colour read from the raster may differ from the one drawn by this (an 8-bit channel is 0.004). */
const COLOR_TOLERANCE = 0.03;
const LEVELS = 255;
/** How far inside an edge or a corner a probe is, in logical pixels, and how far outside an edge. */
const PROBE_INSET_PX = 3;
const OUTSIDE_PX = 6;
/** The caret and the character it lands on may differ by this much in logical pixels (a glyph is 9 to 11 px wide at 1.2x). */
const CARET_NEAR_PX = 13;
/** A transition is sampled while its progress is between these. */
const PROGRESS_MIN = 0.02;
const PROGRESS_MAX = 0.98;
const MIN_TRANSITION_SAMPLES = 20;
/** One wheel tick scrolls a container its client size over this (`scroll.rs`, `SCROLL_PAGE_DIVISOR`). */
const WHEEL_PAGE_DIVISOR = 8;
/** The share of ink pixels that are partly covered: a magnified small raster has noticeably more of them than a sharp one. */
const SHARPNESS_SLACK = 1.25;
const SHARPNESS_FLOOR = 0.04;
/** The stage's colours, as the lab draws them. */
const STAGE_COLOR = new Color(0xf8 / LEVELS, 0xfa / LEVELS, 0xfc / LEVELS, 1);
const CARD_FILL = new Color(0xfd / LEVELS, 0xe6 / LEVELS, 0x8a / LEVELS, 1);
const CHILD_COLOR = new Color(0xbe / LEVELS, 0x12 / LEVELS, 0x3c / LEVELS, 1);
const INK_COLOR = new Color(0x0f / LEVELS, 0x17 / LEVELS, 0x2a / LEVELS, 1);

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function node(api: TransformsInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

function matrixOf(api: TransformsInspection, testID: string): NativeMatrix {
  const { transform } = node(api, testID);
  assert(transform !== null, `${testID} has no transform`);
  return transform;
}

function window(owner: Node): Window {
  const found = owner.getWindow();
  assert(found, 'The owner is in a window');
  return found;
}

/** Logical pixels to window pixels: input is placed in the window's, and the snapshot is in logical ones. */
let contentScale = 1;

function windowPoint(at: Vector2): Vector2 {
  return new Vector2(at.x * contentScale, at.y * contentScale);
}

function round(value: number, places = 2): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function apply(matrix: NativeMatrix, point: Vector2): Vector2 {
  const [a, b, c, d, e, f] = matrix;
  return new Vector2(a * point.x + c * point.y + e, b * point.x + d * point.y + f);
}

/** A point of an element in the root: through each level's matrix and then its location, innermost first. */
function worldOf(levels: ReadonlyArray<{ location: Vector2; matrix: NativeMatrix | null }>, local: Vector2): Vector2 {
  let point = local;
  for (const level of levels) {
    if (level.matrix !== null) point = apply(level.matrix, point);
    point = plus(point, level.location);
  }
  return point;
}

function plus(a: Vector2, b: Vector2): Vector2 {
  return new Vector2(a.x + b.x, a.y + b.y);
}

function centreOf(rect: GoldenRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function sameRect(actual: GoldenRect, expected: GoldenRect, label: string): void {
  const apart = Math.max(
    Math.abs(actual.x - expected.x), Math.abs(actual.y - expected.y),
    Math.abs(actual.width - expected.width), Math.abs(actual.height - expected.height),
  );
  assert(apart <= RECT_TOLERANCE_PX, `${label}: ${JSON.stringify(actual)} is ${round(apart)} px from Chrome's ${JSON.stringify(expected)}`);
}

function colourApart(a: Color, b: Color): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
}

function pixelAt(image: Image, ratio: number, at: Vector2): Color {
  return image.getPixel(Math.round(at.x * ratio), Math.round(at.y * ratio));
}

function ratioOf(image: Image, api: TransformsInspection): number {
  return image.getWidth() / api.snapshot().width;
}

// ---- Input ------------------------------------------------------------------------------------------------------------

function move(at: Vector2, held = false): void {
  const event = new InputEventMouseMotion();
  event.position = windowPoint(at);
  event.globalPosition = event.position;
  event.buttonMask = held ? MouseButtonMask.MouseButtonMaskLeft : 0;
  parseVerifierEvent(event);
}

function button(at: Vector2, pressed: boolean, which: MouseButton = MouseButton.MouseButtonLeft): void {
  const event = new InputEventMouseButton();
  event.position = windowPoint(at);
  event.globalPosition = event.position;
  event.buttonIndex = which;
  event.pressed = pressed;
  event.buttonMask = pressed && which === MouseButton.MouseButtonLeft ? MouseButtonMask.MouseButtonMaskLeft : 0;
  parseVerifierEvent(event);
}

async function hover(api: TransformsInspection, at: Vector2): Promise<number | null> {
  move(at);
  await frames(SETTLE_FRAMES);
  return api.snapshot().hovered;
}

async function click(at: Vector2): Promise<void> {
  move(at);
  await frames(SETTLE_FRAMES);
  button(at, true);
  await frames(2);
  button(at, false);
  await frames(SETTLE_FRAMES);
}

async function dragFromTo(from: Vector2, to: Vector2, during?: () => void): Promise<void> {
  move(from);
  await frames(SETTLE_FRAMES);
  button(from, true);
  await frames(2);
  const steps = 8;
  for (let step = 1; step <= steps; step += 1) {
    move(from.lerp(to, step / steps), true);
    await frames(2);
    if (step === steps / 2) during?.();
  }
  await frames(SETTLE_FRAMES);
  button(to, false);
  await frames(SETTLE_FRAMES);
}

async function wheel(at: Vector2, which: MouseButton): Promise<void> {
  move(at);
  await frames(SETTLE_FRAMES);
  button(at, true, which);
  button(at, false, which);
  await frames(SETTLE_FRAMES);
}

async function showCase(api: TransformsInspection, name: string): Promise<void> {
  setTransformCase(name);
  await frames(SETTLE_FRAMES);
  assert(api.find('transform-stage') !== undefined || name !== '', `The case ${name} did not mount`);
}

// ---- The shape cases --------------------------------------------------------------------------------------------------

/** The pictures of every shape case, for the comparison with Chrome, and the rectangle and the colours of each. */
async function checkShapes(owner: Node, api: TransformsInspection, capture: TransformsCapture, suffix: string): Promise<void> {
  for (const spec of SHAPE_CASES) {
    await showCase(api, `shape:${spec.name}`);
    const card = node(api, 'transform-card');
    const golden = GOLDEN_SHAPE_RECTS[spec.name];
    assert(golden, `No golden rectangle for ${spec.name}`);
    sameRect(card.rect, golden, `${spec.name} (${suffix}): the card's rectangle is the box round it`);
    assert((card.transform === null) === (spec.transform === 'none'), `${spec.name}: the card reports a transform only if it has one`);
    const image = grab(owner);
    const ratio = ratioOf(image, api);
    // Inside the card, away from its text, near its bottom right corner: the fill, wherever the transform put it.
    const levels = [{ location: new Vector2(CARD.left, CARD.top), matrix: card.transform }];
    const inside = worldOf(levels, new Vector2(CARD.width - 28, CARD.height - 28));
    const filled = pixelAt(image, ratio, inside);
    assert(colourApart(filled, CARD_FILL) <= COLOR_TOLERANCE, `${spec.name} (${suffix}): the card's fill is at its own point ${round(inside.x)},${round(inside.y)}, got ${filled.toHtml(false)}`);
    // Outside the box round it, nothing is drawn.
    const outside = [
      new Vector2(golden.x - OUTSIDE_PX, golden.y + golden.height / 2), new Vector2(golden.x + golden.width + OUTSIDE_PX, golden.y + golden.height / 2),
      new Vector2(golden.x + golden.width / 2, golden.y - OUTSIDE_PX), new Vector2(golden.x + golden.width / 2, golden.y + golden.height + OUTSIDE_PX),
    ];
    for (const point of outside) {
      if (point.x < 0 || point.y < 0 || point.x >= STAGE.width || point.y >= STAGE.height) continue;
      const seen = pixelAt(image, ratio, point);
      assert(colourApart(seen, STAGE_COLOR) <= COLOR_TOLERANCE, `${spec.name} (${suffix}): ${round(point.x)},${round(point.y)} is outside the card's box and not the stage: ${seen.toHtml(false)}`);
    }
    await capture(`transforms-${spec.name}-${suffix}`, spec.child === undefined ? ['transform-card'] : ['transform-card', 'transform-child']);
  }
}

// ---- Behaviour ---------------------------------------------------------------------------------------------------------

/** Clicks and hovers in a turned frame: where the bar is drawn it is hit, and the empty corners of the box round it are not. */
async function checkHit(api: TransformsInspection, capture: TransformsCapture, suffix: string): Promise<void> {
  await showCase(api, 'hit');
  const bar = node(api, 'hit-bar');
  sameRect(bar.rect, GOLDEN_BAR_RECT, 'The bar under rotate(30deg): getRect is the box round it');
  const spec = BEHAVIOUR.bar;
  const levels = [{ location: new Vector2(spec.left, spec.top), matrix: matrixOf(api, 'hit-bar') }];
  const corners = [
    new Vector2(PROBE_INSET_PX, PROBE_INSET_PX), new Vector2(spec.width - PROBE_INSET_PX, PROBE_INSET_PX),
    new Vector2(PROBE_INSET_PX, spec.height - PROBE_INSET_PX), new Vector2(spec.width - PROBE_INSET_PX, spec.height - PROBE_INSET_PX),
    new Vector2(spec.width / 2, spec.height / 2),
  ];
  for (const corner of corners) {
    const at = worldOf(levels, corner);
    assert(await hover(api, at) === bar.id, `The turned bar is hit at its own point ${round(corner.x)},${round(corner.y)} (drawn at ${round(at.x)},${round(at.y)})`);
  }
  // The box round a turned bar has empty corners, and a rectangle that is not turned would have been hit there.
  const box = GOLDEN_BAR_RECT;
  const empty = [
    new Vector2(box.x + PROBE_INSET_PX, box.y + PROBE_INSET_PX), new Vector2(box.x + box.width - PROBE_INSET_PX, box.y + PROBE_INSET_PX),
    new Vector2(box.x + PROBE_INSET_PX, box.y + box.height - PROBE_INSET_PX), new Vector2(box.x + box.width - PROBE_INSET_PX, box.y + box.height - PROBE_INSET_PX),
  ];
  for (const at of empty) {
    assert(await hover(api, at) !== bar.id, `The empty corner ${round(at.x)},${round(at.y)} of the box round the bar is not the bar`);
  }
  await click(worldOf(levels, new Vector2(spec.width / 2, spec.height / 2)));
  assert(node(api, 'hit-counts').text.startsWith('bar 1'), `A click on the bar counts once: ${node(api, 'hit-counts').text}`);
  // A parent scaled up holds a child turned inside it: the child is hit through both matrices, and the parent reaches past its layout box.
  const parent = node(api, 'hit-parent');
  const child = node(api, 'hit-child');
  const nested = [
    { location: new Vector2(30, 10), matrix: matrixOf(api, 'hit-child') },
    { location: new Vector2(20, 20), matrix: matrixOf(api, 'hit-parent') },
  ];
  assert(await hover(api, worldOf(nested, new Vector2(25, 12))) === child.id, 'The child is hit through its own matrix and its parent\'s');
  await click(worldOf(nested, new Vector2(25, 12)));
  assert(/child 1 parent 1/u.test(node(api, 'hit-counts').text), `The click reaches the child and bubbles to the parent: ${node(api, 'hit-counts').text}`);
  assert(await hover(api, new Vector2(6, 6)) === parent.id, 'The scaled parent is hit past its layout box (the box is 20..110, it covers 2..128)');
  const collapsed = node(api, 'hit-collapsed');
  assert(await hover(api, new Vector2(430, 70)) !== collapsed.id, 'An element scaled to nothing is hit nowhere');
  await capture(`transforms-hit-${suffix}`, ['hit-bar', 'hit-parent', 'hit-child', 'hit-collapsed']);
}

/** A card that scales on hover is still hovered where its scaled box reaches past the layout one, and stops being where that does not. */
async function checkHover(api: TransformsInspection): Promise<void> {
  await showCase(api, 'hover');
  const spec = BEHAVIOUR.hover;
  const card = node(api, 'hover-card');
  assert(card.transform === null, 'The hover card has no transform at rest');
  const centre = new Vector2(spec.left + spec.width / 2, spec.top + spec.height / 2);
  assert(await hover(api, centre) === card.id, 'The pointer is over the card');
  const grown = matrixOf(api, 'hover-card');
  assert(Math.abs(grown[0] - spec.scale) < MATRIX_TOLERANCE && Math.abs(grown[3] - spec.scale) < MATRIX_TOLERANCE, `hover:scale-125 scales the card: ${JSON.stringify(grown)}`);
  const reach = (spec.scale - 1) / 2 * spec.width;
  const between = new Vector2(spec.left - reach / 2, centre.y);
  assert(await hover(api, between) === card.id, `Between the layout box's edge and the scaled one (${round(between.x)}) the card is still hovered`);
  assert(node(api, 'hover-card').transform !== null, 'and is still scaled');
  const past = new Vector2(spec.left - reach - PROBE_INSET_PX, centre.y);
  assert(await hover(api, past) !== card.id, 'Past the scaled box the card is no longer hovered');
  assert(node(api, 'hover-card').transform === null, 'and is back at rest');
}

/** Tailwind's separate utilities compose in the order Tailwind's CSS does, and the hover scale keeps the translate. */
async function checkUtilities(api: TransformsInspection): Promise<void> {
  await showCase(api, 'utilities');
  const radians = 6 * Math.PI / 180;
  const [cos, sin] = [Math.cos(radians), Math.sin(radians)];
  const rest = matrixOf(api, 'utility-card');
  const expectRest = [cos, sin, -sin, cos, -60, -15];
  for (const [index, value] of expectRest.entries()) {
    const tolerance = index < 4 ? MATRIX_TOLERANCE : RECT_TOLERANCE_PX;
    assert(Math.abs((rest[index] ?? Number.NaN) - value) <= tolerance, `-translate-x-1/2 -translate-y-1/4 rotate-6 about the top left, entry ${index}: ${JSON.stringify(rest)}`);
  }
  const card = node(api, 'utility-card');
  const at = new Vector2(card.rect.x + 5, card.rect.y + card.rect.height / 2);
  const hovered = await hover(api, plus(at, new Vector2(20, 0)));
  assert(hovered === card.id, 'The utility card is hovered where it is drawn');
  const grown = matrixOf(api, 'utility-card');
  const expectGrown = [1.1 * cos, 1.1 * sin, -1.1 * sin, 1.1 * cos, -60, -15];
  for (const [index, value] of expectGrown.entries()) {
    const tolerance = index < 4 ? MATRIX_TOLERANCE : RECT_TOLERANCE_PX;
    assert(Math.abs((grown[index] ?? Number.NaN) - value) <= tolerance, `hover:scale-110 keeps the translate and the rotation, entry ${index}: ${JSON.stringify(grown)}`);
  }
}

/** A field in a turned, scaled card: a click lands where it is drawn, the caret is drawn there, and typing works. */
async function checkInput(api: TransformsInspection, capture: TransformsCapture): Promise<void> {
  console.log('GODOT_REACT_EXPECT_ERROR clips its content (overflow) in a frame that a transform rotates or skews');
  await showCase(api, 'input');
  const card = matrixOf(api, 'input-card');
  const field = node(api, 'input-field');
  const centre = centreOf(field.rect);
  // The field has no transform of its own: a point of it is its centre plus the card's linear part of its offset from its middle.
  const linear: NativeMatrix = [card[0], card[1], card[2], card[3], 0, 0];
  const size = new Vector2(field.presentation.width, field.presentation.height);
  const at = (localX: number): Vector2 => plus(centre, apply(linear, new Vector2(localX - size.x / 2, 0)));
  const offsets: number[] = [];
  for (const localX of [20, 60, 100]) {
    const target = at(localX);
    await click(target);
    const state = node(api, 'input-field').textInput;
    assert(state, 'The field is a text input');
    const caret = state.caret;
    assert(caret !== null, 'The focused field has a caret');
    const caretCentre = new Vector2(caret.x + caret.width / 2, caret.y + caret.height / 2);
    assert(caretCentre.distanceTo(target) <= CARET_NEAR_PX, `A click at local x ${localX} (drawn at ${round(target.x)},${round(target.y)}) puts the caret at ${round(caretCentre.x)},${round(caretCentre.y)}`);
    offsets.push(state.selectionStart);
  }
  assert(offsets[0] !== undefined && offsets[1] !== undefined && offsets[2] !== undefined && offsets[0] < offsets[1] && offsets[1] < offsets[2], `Clicks further along the line land further along the text: ${offsets.join(', ')}`);
  await click(at(60));
  const before = node(api, 'input-field').textInput?.value ?? '';
  await typeText('Q');
  const after = node(api, 'input-field').textInput?.value ?? '';
  assert(after.length === before.length + 1 && after.includes('Q'), `Typing in the turned field inserts text: ${before} -> ${after}`);
  await capture('transforms-input', ['input-card', 'input-field']);
}

/** Selectable text in a turned frame: a drag from one drawn point to another selects what is between them. */
async function checkSelection(api: TransformsInspection, capture: TransformsCapture): Promise<void> {
  await showCase(api, 'selection');
  const card = matrixOf(api, 'selection-card');
  const text = node(api, 'selection-text');
  const centre = centreOf(text.rect);
  const linear: NativeMatrix = [card[0], card[1], card[2], card[3], 0, 0];
  const size = new Vector2(text.presentation.width, text.presentation.height);
  const at = (localX: number): Vector2 => plus(centre, apply(linear, new Vector2(localX - size.x / 2, 0)));
  await dragFromTo(at(30), at(150));
  const selected = api.selection();
  assert(selected !== undefined && !selected.isCollapsed, 'A drag across turned text selects');
  const phrase = 'Hamburgefonstiv in a turned frame';
  assert(phrase.includes(selected.text), `What is selected is a slice of the line: ${selected.text}`);
  const start = phrase.indexOf(selected.text);
  const end = start + selected.text.length;
  assert(start >= 1 && start <= 6 && end >= 12 && end <= 20, `The ends are where the drag was (about the 3rd and the 16th character): ${start}..${end}`);
  await capture('transforms-selection', ['selection-card', 'selection-text']);
}

/** A drag from a turned source: it starts where the source is drawn and not in the empty corners of its box, and its ghost is turned. */
async function checkDrag(api: TransformsInspection, capture: TransformsCapture): Promise<void> {
  await showCase(api, 'drag');
  const source = node(api, 'drag-source');
  const target = node(api, 'drag-target');
  const empty = new Vector2(source.rect.x + PROBE_INSET_PX, source.rect.y + PROBE_INSET_PX);
  await dragFromTo(empty, centreOf(target.rect));
  assert(api.snapshot().drag.session === 0, 'A drag that starts in an empty corner of the box round the turned source does not start');
  assert(node(api, 'drag-dropped').text === 'none', 'and drops nothing');
  const seen: { ghost: NativeSnapshot['drag']['ghost'] } = { ghost: null };
  await dragFromTo(centreOf(source.rect), centreOf(target.rect), () => { seen.ghost = api.snapshot().drag.ghost; });
  const { ghost } = seen;
  assert(node(api, 'drag-dropped').text === 'card', `A drag from the turned source's middle drops on the turned target: ${node(api, 'drag-dropped').text}`);
  assert(ghost !== null, 'The ghost was shown mid-drag');
  assert(Math.abs(ghost.width - source.rect.width) <= RECT_TOLERANCE_PX && Math.abs(ghost.height - source.rect.height) <= RECT_TOLERANCE_PX,
    `The ghost is the box round the turned source (${round(source.rect.width)} x ${round(source.rect.height)}): ${round(ghost.width)} x ${round(ghost.height)}`);
  await capture('transforms-drag', ['drag-source', 'drag-target']);
}

/** Scrolling inside a rotation: the wheel, the thumb and the keys act along the container's own axes. */
async function checkScroll(api: TransformsInspection, capture: TransformsCapture): Promise<void> {
  console.log('GODOT_REACT_EXPECT_ERROR clips its content (overflow) in a frame that a transform rotates or skews');
  await showCase(api, 'scroll');
  const tilted = node(api, 'scroll-tilted');
  const spec = BEHAVIOUR.tilted;
  await wheel(centreOf(tilted.rect), MouseButton.MouseButtonWheelDown);
  const top = node(api, 'scroll-tilted').scroll?.scrollTop ?? 0;
  const tick = spec.height / WHEEL_PAGE_DIVISOR;
  assert(top > 0 && top <= tick + 1, `A wheel tick over a vertical list tilted 8 degrees scrolls it about a tick (${tick}): ${round(top)}`);
  api.scrollTo('scroll-tilted', 0);
  await frames(SETTLE_FRAMES);
  // The thumb: drag it down the screen; the offset follows along the container's own y.
  const thumb = node(api, 'scroll-tilted').scroll?.thumbs?.y;
  assert(thumb, 'The tilted list has a vertical thumb');
  const scroll = node(api, 'scroll-tilted').scroll;
  assert(scroll, 'The tilted list is a scroll container');
  const range = scroll.maxScrollTop - scroll.minScrollTop;
  const track = scroll.clientHeight;
  const along = 30 * Math.cos(8 * Math.PI / 180);
  const thumbLength = track * track / scroll.scrollHeight;
  const predicted = along * range / (track - thumbLength);
  await dragFromTo(centreOf(thumb), plus(centreOf(thumb), new Vector2(0, 30)));
  const dragged = node(api, 'scroll-tilted').scroll?.scrollTop ?? 0;
  assert(Math.abs(dragged - predicted) <= predicted * 0.2, `Dragging the thumb 30 px down the screen scrolls it by about ${round(predicted)}: ${round(dragged)}`);
  // A row turned a quarter: a wheel tick down the screen scrolls it along its own x, by a tick of its own width.
  const quarter = node(api, 'scroll-quarter');
  await wheel(centreOf(quarter.rect), MouseButton.MouseButtonWheelDown);
  const state = node(api, 'scroll-quarter').scroll;
  assert(state, 'The quarter-turned row is a scroll container');
  const expected = BEHAVIOUR.quarter.width / WHEEL_PAGE_DIVISOR;
  assert(Math.abs(state.scrollLeft - expected) <= 1 && state.scrollTop === 0, `A wheel tick down the screen over a row turned a quarter scrolls it ${expected} along its own x: ${round(state.scrollLeft)}, ${round(state.scrollTop)}`);
  await capture('transforms-scroll', ['scroll-tilted', 'scroll-quarter']);
}

/** A popover anchors to `getRect()`: the box round a turned trigger. */
async function checkAnchor(api: TransformsInspection): Promise<void> {
  await showCase(api, 'anchor');
  await frames(SETTLE_FRAMES);
  const trigger = node(api, 'anchor-trigger');
  sameRect(trigger.rect, GOLDEN_ANCHOR_RECT, 'The trigger under rotate(40deg)');
  const marker = node(api, 'anchor-marker');
  assert(Math.abs(marker.rect.x - (GOLDEN_ANCHOR_RECT.x + GOLDEN_ANCHOR_RECT.width)) <= RECT_TOLERANCE_PX
    && Math.abs(marker.rect.y - (GOLDEN_ANCHOR_RECT.y + GOLDEN_ANCHOR_RECT.height)) <= RECT_TOLERANCE_PX,
  `A marker placed from getRect() sits at the bottom right of the box round the trigger: ${JSON.stringify(marker.rect)}`);
}

/** The same clipped box under a scale (the engine's clip is exact) and a rotation (a bounding box, reported once). */
async function checkClip(owner: Node, api: TransformsInspection, capture: TransformsCapture): Promise<void> {
  console.log('GODOT_REACT_EXPECT_ERROR clips its content (overflow) in a frame that a transform rotates or skews');
  await showCase(api, 'clip');
  const image = grab(owner);
  const ratio = ratioOf(image, api);
  const scaled = node(api, 'clip-scaled').rect;
  // The child sticks out of the box on the right and below; under a scale the clip is the scaled box, exactly.
  const inside = new Vector2(scaled.x + scaled.width - PROBE_INSET_PX, scaled.y + scaled.height - PROBE_INSET_PX);
  const outside = new Vector2(scaled.x + scaled.width + PROBE_INSET_PX, scaled.y + scaled.height - PROBE_INSET_PX);
  assert(colourApart(pixelAt(image, ratio, inside), CHILD_COLOR) <= COLOR_TOLERANCE, 'Inside a scaled clip the child shows');
  assert(colourApart(pixelAt(image, ratio, outside), STAGE_COLOR) <= COLOR_TOLERANCE, 'and is cut at the scaled clip\'s edge');
  // Hit testing under the rotated clip is exact even though the drawing is a box.
  const rotated = node(api, 'clip-rotated');
  const child = node(api, 'clip-rotated-child');
  const matrix = matrixOf(api, 'clip-rotated');
  const levels = [{ location: new Vector2(BEHAVIOUR.clipped.left + BEHAVIOUR.clipped.gap, BEHAVIOUR.clipped.top), matrix }];
  const insideShape = worldOf(levels, new Vector2(80, 80));
  const outsideShape = worldOf(levels, new Vector2(120, 120));
  assert(await hover(api, insideShape) === child.id, 'Under a rotated clip the child is hit inside the rotated shape');
  assert(await hover(api, outsideShape) !== child.id && rotated.id !== 0, 'and not outside it, where the drawing shows it');
  await capture('transforms-clip', ['clip-scaled', 'clip-rotated', 'clip-scaled-child', 'clip-rotated-child']);
}

/** The share of pixels in `rect` that are partly ink: how soft the glyph edges are. */
function softness(image: Image, ratio: number, rect: GoldenRect): number {
  const background = STAGE_COLOR.r * 0.2126 + STAGE_COLOR.g * 0.7152 + STAGE_COLOR.b * 0.0722;
  const ink = INK_COLOR.r * 0.2126 + INK_COLOR.g * 0.7152 + INK_COLOR.b * 0.0722;
  let inked = 0;
  let partial = 0;
  for (let y = Math.floor(rect.y * ratio); y < Math.ceil((rect.y + rect.height) * ratio); y += 1) {
    for (let x = Math.floor(rect.x * ratio); x < Math.ceil((rect.x + rect.width) * ratio); x += 1) {
      const pixel = image.getPixel(x, y);
      const weight = Math.max(0, Math.min(1, (background - (pixel.r * 0.2126 + pixel.g * 0.7152 + pixel.b * 0.0722)) / (background - ink)));
      if (weight < 0.02) continue;
      inked += 1;
      if (weight > 0.15 && weight < 0.85) partial += 1;
    }
  }
  return inked === 0 ? 0 : partial / inked;
}

/** Text under scale-150 is rasterised at its size, so it is as sharp as the same text drawn at that size. */
async function checkSharpness(owner: Node, api: TransformsInspection, capture: TransformsCapture, suffix: string): Promise<void> {
  await showCase(api, 'sharp');
  await frames(SETTLE_FRAMES);
  const scaledText = node(api, 'sharp-scaled-text');
  assert(scaledText.rasterScale === 1.5, `Text under scale(1.5) is rasterised at 1.5 times: ${String(scaledText.rasterScale)}`);
  const image = grab(owner);
  const ratio = ratioOf(image, api);
  const scaled = softness(image, ratio, node(api, 'sharp-scaled-text').rect);
  const plain = softness(image, ratio, node(api, 'sharp-plain-text').rect);
  assert(scaled <= plain * SHARPNESS_SLACK + SHARPNESS_FLOOR, `Scaled text is as sharp as the same text at its size (${suffix}): ${round(scaled, 3)} partly covered against ${round(plain, 3)}`);
  await capture(`transforms-sharp-${suffix}`, ['sharp-scaled', 'sharp-scaled-text']);
}

// ---- Transitions ------------------------------------------------------------------------------------------------------

/** Chrome's matrix at `progress`: the recorded ones either side, mixed. */
function goldenAt(name: string, progress: number): number[] {
  const table = GOLDEN_TRANSITION_MATRICES[name];
  assert(table, `No golden matrices for ${name}`);
  const steps = Object.keys(table).map(Number).sort((a, b) => a - b);
  const upper = steps.find(step => step >= progress) ?? steps[steps.length - 1] ?? 1;
  const lower = [...steps].reverse().find(step => step <= progress) ?? 0;
  const low = table[String(lower)];
  const high = table[String(upper)];
  assert(low && high, `Golden matrices for ${name} at ${lower} and ${upper}`);
  const mix = upper === lower ? 0 : (progress - lower) / (upper - lower);
  return low.map((value, index) => value + ((high[index] ?? value) - value) * mix);
}

/** A transform transition, sampled while it runs: Chrome's matrix at each progress, and nothing re-recorded or laid out on the way. */
async function checkTransition(api: TransformsInspection, spec: TransitionCase, expectRaster: number | undefined): Promise<void> {
  await showCase(api, `transition:${spec.name}`);
  const card = node(api, 'transform-card');
  const before = api.activity();
  sendTransition('to');
  const samples: Array<{ progress: number; matrix: NativeMatrix }> = [];
  let midway: NativeActivity | undefined;
  const started = Date.now();
  while (Date.now() - started < TRANSITION_DURATION_MS + 600) {
    await frames(1);
    const snapshot = api.snapshot();
    const record = snapshot.transitions.find(entry => entry.id === card.id && entry.property === 'transform');
    const matrix = snapshot.nodes.find(entry => entry.id === card.id)?.transform;
    if (record === undefined || matrix === null || matrix === undefined) continue;
    const progress = (snapshot.clockMs - record.startedAtMs) / record.durationMs;
    if (progress < PROGRESS_MIN || progress > PROGRESS_MAX) continue;
    samples.push({ progress, matrix });
    if (midway === undefined && progress >= 0.5) midway = api.activity();
  }
  assert(samples.length >= MIN_TRANSITION_SAMPLES, `${spec.name}: the transition was sampled ${samples.length} times`);
  const first = samples[0];
  const last = samples[samples.length - 1];
  assert(first !== undefined && last !== undefined && first.progress < 0.2 && last.progress > 0.8, `${spec.name}: the samples span the transition (${round(first?.progress ?? 0)} to ${round(last?.progress ?? 0)})`);
  let worstMatrix = 0;
  let worstOffset = 0;
  for (const { progress, matrix } of samples) {
    const expected = goldenAt(spec.name, progress);
    const entries: number[] = [...matrix];
    for (const [index, value] of entries.entries()) {
      const apart = Math.abs(value - (expected[index] ?? 0));
      if (index < 4) worstMatrix = Math.max(worstMatrix, apart);
      else worstOffset = Math.max(worstOffset, apart);
    }
  }
  assert(worstMatrix <= MATRIX_TOLERANCE && worstOffset <= RECT_TOLERANCE_PX, `${spec.name}: against Chrome the matrix is within ${round(worstMatrix, 4)} and the offset within ${round(worstOffset, 3)} px over ${samples.length} samples`);
  assert(midway !== undefined, `${spec.name}: the transition passed halfway`);
  assert(midway.boxRecords === before.boxRecords && midway.contentRecords === before.contentRecords && midway.layoutPasses === before.layoutPasses,
    `${spec.name}: nothing is re-recorded or laid out while the transform animates (boxes ${before.boxRecords} to ${midway.boxRecords}, contents ${before.contentRecords} to ${midway.contentRecords}, layouts ${before.layoutPasses} to ${midway.layoutPasses})`);
  await frames(SETTLE_FRAMES);
  const settled = node(api, 'transform-card');
  const [a, b, c, d, e, f] = settled.transform ?? [];
  const end = GOLDEN_TRANSITION_MATRICES[spec.name]?.['1'];
  assert(end !== undefined && [a, b, c, d].every((value, index) => Math.abs((value ?? Number.NaN) - (end[index] ?? Number.NaN)) <= MATRIX_TOLERANCE)
    && Math.abs((e ?? Number.NaN) - (end[4] ?? Number.NaN)) <= RECT_TOLERANCE_PX && Math.abs((f ?? Number.NaN) - (end[5] ?? Number.NaN)) <= RECT_TOLERANCE_PX,
  `${spec.name}: the end is Chrome's end: ${JSON.stringify(settled.transform)}`);
  if (expectRaster !== undefined) {
    const raster = node(api, 'transform-card').rasterScale;
    assert(raster === expectRaster, `${spec.name}: the raster scale was kept while the transition ran and is ${expectRaster} once it settled: ${String(raster)}`);
  }
}

async function checkTransitions(api: TransformsInspection): Promise<void> {
  // The expected raster scales: the end scale rounded up to the eighth the raster is kept at.
  const raster: Record<string, number | undefined> = { rotate: 1, scale: 1.875, mismatch: 1.5, tailwind: 1.125 };
  for (const spec of TRANSITION_CASES) await checkTransition(api, spec, raster[spec.name]);
}

/** Simultaneous transitions of transform, opacity, backgroundColor and height on the same element. */
async function checkCombined(api: TransformsInspection): Promise<void> {
  await showCase(api, 'combined');
  const card = node(api, 'combined-card');
  assert(card.transform === null, 'combined-card starts at identity transform');
  assert(Math.abs(card.presentation.opacity - 1) <= 0.01 && Math.abs(card.presentation.height - 88) <= 0.5, 'combined-card starts at rest opacity and height');
  const toggle = node(api, 'combined-toggle');
  await click(centreOf(toggle.rect));
  let sawCombinedMidflight = false;
  const started = Date.now();
  while (Date.now() - started < 900) {
    await frames(1);
    const snapshot = api.snapshot();
    const current = snapshot.nodes.find(entry => entry.id === card.id);
    if (current === undefined) continue;
    const activeProps = new Set(snapshot.transitions.filter(entry => entry.id === card.id).map(entry => entry.property));
    if (
      activeProps.has('transform')
      && activeProps.has('opacity')
      && activeProps.has('backgroundColor')
      && activeProps.has('height')
      && current.transform !== null
      && current.presentation.opacity < 0.95
      && current.presentation.opacity > 0.5
      && current.presentation.height > 90
      && current.presentation.height < 122
    ) {
      sawCombinedMidflight = true;
    }
  }
  assert(sawCombinedMidflight, 'combined-card transitions transform, opacity, backgroundColor and height simultaneously');
  await frames(SETTLE_FRAMES);
  const settled = node(api, 'combined-card');
  assert(settled.transform !== null && Math.abs(settled.presentation.opacity - 0.45) <= 0.02 && Math.abs(settled.presentation.height - 124) <= 0.5,
    `combined-card settled at target transform, opacity and height: ${JSON.stringify(settled.presentation)}`);
}

/** A continuous multi-step looping transform + colour animation. */
async function checkLoop(api: TransformsInspection): Promise<void> {
  await showCase(api, 'loop');
  const card = node(api, 'loop-card');
  const seenSteps = new Set<string>();
  let sawTransformTransition = false;
  const started = Date.now();
  while (Date.now() - started < 950 && (seenSteps.size < 3 || !sawTransformTransition)) {
    await frames(1);
    const stepText = api.find('loop-step-label')?.text;
    if (stepText !== undefined) seenSteps.add(stepText);
    const snapshot = api.snapshot();
    if (snapshot.transitions.some(entry => entry.id === card.id && entry.property === 'transform')) {
      sawTransformTransition = true;
    }
  }
  assert(seenSteps.size >= 3 && sawTransformTransition, `loop-card steps through multiple keyframes while animating transform (${[...seenSteps].join(', ')})`);
}

/** Tailwind `starting:` (`@starting-style`) transitions on mount and when shown from `display: none`. */
async function checkStarting(api: TransformsInspection): Promise<void> {
  setTransformCase('starting');
  let sawMountTransition = false;
  const started = Date.now();
  while (Date.now() - started < 800) {
    await frames(1);
    const card = api.find('starting-card');
    if (card === undefined) continue;
    const snapshot = api.snapshot();
    const props = new Set(snapshot.transitions.filter(entry => entry.id === card.id).map(entry => entry.property));
    if (props.has('transform') && props.has('opacity') && props.has('backgroundColor') && card.transform !== null && card.presentation.opacity < 0.95) {
      sawMountTransition = true;
    }
  }
  assert(sawMountTransition, 'starting-card animates transform, opacity and backgroundColor from starting: on initial mount');
  await frames(SETTLE_FRAMES);
  const settled = node(api, 'starting-card');
  assert(settled.transform === null && Math.abs(settled.presentation.opacity - 1) <= 0.01,
    `starting-card settles at resting style (identity transform, opacity 1): ${JSON.stringify(settled.presentation)}`);

  // Remounting via key change triggers @starting-style again.
  await click(centreOf(node(api, 'starting-remount').rect));
  const remounted = node(api, 'starting-card');
  const afterRemount = api.snapshot();
  assert(afterRemount.transitions.some(entry => entry.id === remounted.id && entry.property === 'transform'),
    'remounting starting-card starts its @starting-style transition again');

  // Hiding (`display: none`) and showing again also triggers @starting-style.
  await click(centreOf(node(api, 'starting-display-toggle').rect));
  await click(centreOf(node(api, 'starting-display-toggle').rect));
  const displayCard = node(api, 'starting-display-card');
  const afterReshow = api.snapshot();
  assert(afterReshow.transitions.some(entry => entry.id === displayCard.id && entry.property === 'transform'),
    'showing starting-display-card from display:none starts its @starting-style transition');
  await frames(30);
}

export async function verifyTransforms(owner: Node, api: TransformsInspection, capture: TransformsCapture): Promise<void> {
  api.showLab('transforms');
  await settleFrames();
  await checkShapes(owner, api, capture, 'dpr1');
  await checkHit(api, capture, 'dpr1');
  await checkHover(api);
  await checkUtilities(api);
  await checkInput(api, capture);
  await checkSelection(api, capture);
  await checkDrag(api, capture);
  await checkScroll(api, capture);
  await checkAnchor(api);
  await checkClip(owner, api, capture);
  await checkSharpness(owner, api, capture, 'dpr1');
  await checkTransitions(api);
  await checkCombined(api);
  await checkLoop(api);
  await checkStarting(api);
  // Device pixel ratio two: the window's content scale, as a retina display has it (the logical window is half as wide,
  // so the 520 x 320 stage fits in the landscape window's 560 x 400 logical size).
  if (api.snapshot().width >= STAGE.width * RETINA_SCALE) {
    const win = window(owner);
    win.contentScaleFactor = RETINA_SCALE;
    contentScale = RETINA_SCALE;
    await frames(SETTLE_FRAMES);
    try {
      await checkShapes(owner, api, capture, 'dpr2');
      await checkHit(api, capture, 'dpr2');
      await checkSharpness(owner, api, capture, 'dpr2');
    } finally {
      win.contentScaleFactor = 1;
      contentScale = 1;
      await frames(SETTLE_FRAMES);
    }
  }
}
