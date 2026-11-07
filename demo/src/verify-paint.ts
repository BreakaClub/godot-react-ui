import { Engine, Image, InputEventKey, InputEventMouseMotion, Key, Node, Vector2, Window } from 'godot';
import type { NativeActivity, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import type { LabName } from './labs';
import { PAINT_PAGES, PAINT_STAGE, type PaintCell } from './paint-data';
import { PAINT_STATES_PAGE, STATES_LAYOUT } from './paint-lab';
import { assertionTally, parseVerifierEvent } from './verifier-input';
import { grab, settleFrames } from './verify-filters';

/**
 * The `paint` section of the interaction verifier: the paint lab (`paint-lab.tsx`), one page at a time, captured at device
 * pixel ratios one and two, with what can be read from the pixels asserted. `scripts/paint-reference.mjs --compare` holds the
 * captures against the same pages in Chrome; these assertions are what has to hold whatever Chrome draws, and each has a control
 * (docs/tracks/utilities-paint.md) that makes it fail.
 */
export interface PaintInspection {
  showLab(name: LabName): void;
  showPaintPage(page: string): void;
  find(testID: string): NativeSnapshotNode | undefined;
  activity(): NativeActivity;
  snapshot(): NativeSnapshot;
  /** Give the root Godot's key focus, which a Tab that left the last element handed on. */
  grabSurfaceFocus(): void;
}

export type PaintCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

const FRAME_POLL_MS = 10;
const SETTLE_FRAMES = 6;
const LEVELS = 255;
/** The window's content scale for the second pass: a retina display. */
const RETINA_SCALE = 2;
/** How far two readings of a colour may differ (8-bit levels) and still be the same colour: rounding and the blend of a 1/255 mask. */
const SAME_LEVELS = 2;
/** A looser match, for a colour made of several blended layers. */
const NEAR_LEVELS = 6;
/** The page colours the pages' own backdrops use (`paint-data.ts`). */
type Rgb = readonly [number, number, number];
const SLATE_50: Rgb = [248, 250, 252];
const SLATE_100: Rgb = [241, 245, 249];
const SLATE_200: Rgb = [226, 232, 240];
const WHITE: Rgb = [255, 255, 255];
const INDIGO_500: Rgb = [99, 102, 241];
const BLUE_500: Rgb = [59, 130, 246];
const PINK_500: Rgb = [236, 72, 153];
const SKY_500: Rgb = [14, 165, 233];
const RED_500: Rgb = [239, 68, 68];
const GREEN_500: Rgb = [34, 197, 94];
const YELLOW_500: Rgb = [234, 179, 8];
/** The native focus ring's colour (`FOCUS_RING_COLOR` in `native/lib.rs`). */
const FOCUS_RING: Rgb = [125, 168, 255];
/**
 * What Chrome draws at these probes: the same pages as HTML (`scripts/paint-reference.mjs`), or for the focus ring the same classes on a
 * button focused with the keyboard in headless Chrome, read from its raster. A probe with a value here is asserted against Chrome's pixel,
 * not against a bound of my own, at each device pixel ratio.
 */
const CHROME_HAIRLINE: Readonly<Record<number, Rgb>> = { 1: [225, 229, 233], 2: [224, 228, 232] };
const CHROME_BELOW_RING: Readonly<Record<number, Rgb>> = { 1: [230, 233, 237], 2: [226, 230, 234] };
const CHROME_CULLED_REACH: Readonly<Record<number, Rgb>> = { 1: [221, 227, 235], 2: [221, 227, 235] };
const CHROME_FOCUSED_SHADOW_4: Readonly<Record<number, Rgb>> = { 1: [224, 228, 232], 2: [224, 228, 231] };
const CHROME_FOCUSED_SHADOW_8: Readonly<Record<number, Rgb>> = { 1: [231, 235, 239], 2: [231, 235, 238] };
/**
 * A pixel on the inner arc of `ring-8` on an opaque box, on the top row `dx` device pixels from the corner. Chrome paints the ring whole
 * and the fill over it (it cuts a box out of its shadow only when the background lets something through), so a pixel the fill covers
 * partly is the ring and the fill in the proportion of the fill's coverage: a cut ring is 40 to 60 levels lighter here.
 */
const CHROME_RING_ARC: Readonly<Record<number, { dx: number; colour: Rgb }>> = { 1: { dx: 5, colour: [158, 227, 204] }, 2: { dx: 12, colour: [162, 228, 206] } };
/** The stripe a translucent box with no fill shows through itself, which is the stripe's own colour. */
const BLUE_STRIPE: Rgb = [59, 130, 246];
/** How far from Chrome's pixel a blended edge or shadow pixel may be: one level of rounding in each of the two renderers' 8-bit paths, and one of the mask. */
const CHROME_LEVELS = 3;
/**
 * How far from Chrome's pixel a pixel on an antialiased arc may be. Our arcs are exact coverage; Skia's are its own analytic estimate, and the two
 * differ by up to 7 levels on the lab's shapes page (`shadows-shapes`: a pill, a circle, rounded boxes; the maximum at both device pixel ratios,
 * `scripts/paint-reference.mjs --compare`). The pixel this bound guards differs by 4 (154, 226, 202 against Chrome's 158, 227, 204); a ring cut out of
 * an opaque box differs by 55 there.
 */
const CHROME_ARC_LEVELS = 8;
const HOVER_DWELL_FRAMES = 6;
/** The shadow transition of the states page lasts this long (`paint-lab.tsx`); the reading in the middle is taken a little before half of it. */
const TRANSITION_MS = 400;
const MILLISECONDS_PER_SECOND = 1000;
const NOMINAL_FRAME_MS = 1000 / 60;

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

// ---- Reading pixels ------------------------------------------------------------------------------------------------------

/** What the verifier reads a render with: the grabbed image and how many device pixels a logical one is. */
interface Shot {
  image: Image;
  ratio: number;
}

function shoot(owner: Node, ratio: number): Shot {
  return { image: grab(owner), ratio };
}

function rgb(shot: Shot, x: number, y: number): Rgb {
  const colour = shot.image.getPixel(Math.round(x), Math.round(y));
  return [Math.round(colour.r * LEVELS), Math.round(colour.g * LEVELS), Math.round(colour.b * LEVELS)];
}

function apart(a: Rgb, b: Rgb): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function describe(colour: Rgb): string {
  return `rgb(${colour.join(', ')})`;
}

/** A box on a page in device pixels. */
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function boxOf(cell: { left: number; top: number; width: number; height: number }, ratio: number): Box {
  return {
    x0: Math.round(cell.left * ratio),
    y0: Math.round(cell.top * ratio),
    x1: Math.round((cell.left + cell.width) * ratio),
    y1: Math.round((cell.top + cell.height) * ratio),
  };
}

function cellOf(page: string, index: number): PaintCell {
  const found = PAINT_PAGES.find(candidate => candidate.name === page)?.cells[index];
  assert(found, `Page ${page} has a cell ${index}`);
  return found;
}

function expectColour(shot: Shot, x: number, y: number, expected: Rgb, tolerance: number, what: string): void {
  const got = rgb(shot, x, y);
  assert(apart(got, expected) <= tolerance, `${what}: ${describe(got)} at (${Math.round(x)}, ${Math.round(y)}), expected ${describe(expected)} within ${tolerance}`);
}

function expectDifferent(shot: Shot, x: number, y: number, other: Rgb, atLeast: number, what: string): void {
  const got = rgb(shot, x, y);
  assert(apart(got, other) >= atLeast, `${what}: ${describe(got)} at (${Math.round(x)}, ${Math.round(y)}) is within ${atLeast} of ${describe(other)}`);
}

function brightness(colour: Rgb): number {
  return (colour[0] + colour[1] + colour[2]) / 3;
}

const middle = (box: Box): [number, number] => [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];

// ---- The pages ------------------------------------------------------------------------------------------------------------

function checkShadows(shot: Shot): void {
  const { ratio } = shot;
  const lg = boxOf(cellOf('shadows', 3), ratio);
  const [cx, cy] = middle(lg);
  expectColour(shot, cx, cy, WHITE, SAME_LEVELS, 'shadow-lg: the box is its own fill');
  const below = rgb(shot, cx, lg.y1 + 3 * ratio);
  const above = rgb(shot, cx, lg.y0 - 3 * ratio);
  assert(brightness(SLATE_100) - brightness(below) >= 4, `shadow-lg darkens the page below the box: ${describe(below)}`);
  assert(brightness(above) > brightness(below) + 2, `shadow-lg falls lower than higher (offset 10px, spread -3px): above ${describe(above)}, below ${describe(below)}`);
  const none = boxOf(cellOf('shadows', 7), ratio);
  expectColour(shot, (none.x0 + none.x1) / 2, none.y1 + 3 * ratio, SLATE_100, SAME_LEVELS, 'shadow-none: nothing below the box');
  const inner = boxOf(cellOf('shadows', 6), ratio);
  const [ix, iy] = middle(inner);
  const rim = rgb(shot, ix, inner.y0 + 2 * ratio);
  assert(brightness(WHITE) - brightness(rim) >= 2 && apart(rgb(shot, ix, iy), WHITE) <= SAME_LEVELS, `shadow-inner shades the inside of the top edge (${describe(rim)}) and leaves the middle white`);
  const coloured = boxOf(cellOf('shadows', 8), ratio);
  const glow = rgb(shot, (coloured.x0 + coloured.x1) / 2, coloured.y1 + 4 * ratio);
  assert(glow[2] > glow[0] + 8, `shadow-indigo-500/50 tints its shadow blue: ${describe(glow)}`);
}

function checkTranslucent(shot: Shot): void {
  const { ratio } = shot;
  const plain = boxOf(cellOf('shadows-translucent', 0), ratio);
  const shadowed = boxOf(cellOf('shadows-translucent', 1), ratio);
  // The two boxes have the same classes but for the shadow, and the stripes are the same under both: inside, the shadow must not show.
  for (const [dx, dy] of [[0.2, 0.25], [0.5, 0.5], [0.8, 0.75], [0.5, 0.15]] as const) {
    const at = (box: Box): [number, number] => [box.x0 + (box.x1 - box.x0) * dx, box.y0 + (box.y1 - box.y0) * dy];
    const [px, py] = at(plain);
    const [sx, sy] = at(shadowed);
    const a = rgb(shot, px, py);
    const b = rgb(shot, sx, sy);
    assert(apart(a, b) <= 1, `A translucent box shows no shadow through itself: ${describe(b)} with shadow-xl, ${describe(a)} without, at ${dx}, ${dy}`);
  }
  // Outside it, the shadow is there.
  const [cx] = middle(shadowed);
  const stripeBelow = rgb(shot, cx - 40 * ratio, shadowed.y1 + 6 * ratio);
  const shadowBelow = rgb(shot, cx, shadowed.y1 + 6 * ratio);
  assert(apart(stripeBelow, shadowBelow) >= 6, `shadow-xl darkens the stripes below the box: ${describe(shadowBelow)} against ${describe(stripeBelow)}`);
  // A box with no fill at all.
  const clear = boxOf(cellOf('shadows-translucent', 3), ratio);
  const [clearX, clearY] = middle(clear);
  expectColour(shot, clearX, clearY, BLUE_STRIPE, 1, 'A box with no fill and shadow-lg shows only the stripe inside, as Chrome draws it');
  // A hard offset shadow of a clear box is an L round two sides, and the box is a hole in it.
  const hard = boxOf(cellOf('shadows-translucent', 11), ratio);
  const [hardX, hardY] = middle(hard);
  expectColour(shot, hard.x1 + 2 * ratio, hardY + 2 * ratio, [0, 0, 0], SAME_LEVELS, 'The hard shadow shows right of the box');
  expectColour(shot, hardX, hardY, rgb(shot, hard.x0 - 4 * ratio, hardY), 1, 'The hard shadow is cut out of the clear box');
}

function checkRings(shot: Shot): void {
  const { ratio } = shot;
  const ring = boxOf(cellOf('rings', 2), ratio);
  const [, ry] = middle(ring);
  expectColour(shot, ring.x0 - 1, ry, INDIGO_500, SAME_LEVELS, 'ring-2 ring-indigo-500: the ring touches the box');
  expectColour(shot, ring.x0 - 2 * ratio, ry, INDIGO_500, SAME_LEVELS, 'the ring is 2 logical pixels wide');
  expectColour(shot, ring.x0 - 2 * ratio - 1, ry, SLATE_50, SAME_LEVELS, 'and ends there');
  expectColour(shot, ring.x0 + 1, ry, WHITE, SAME_LEVELS, 'and is not drawn inside the box');
  const inset = boxOf(cellOf('rings', 6), ratio);
  expectColour(shot, inset.x0 + 1, middle(inset)[1], INDIGO_500, SAME_LEVELS, 'ring-inset: the ring is inside the box');
  expectColour(shot, inset.x0 + 2 * ratio + 1, middle(inset)[1], WHITE, SAME_LEVELS, 'ring-inset: and 2 logical pixels wide');
  expectColour(shot, inset.x0 - 1, middle(inset)[1], SLATE_50, SAME_LEVELS, 'ring-inset: nothing outside');
  const offset = boxOf(cellOf('rings', 8), ratio);
  const [, oy] = middle(offset);
  expectColour(shot, offset.x0 - 1, oy, WHITE, SAME_LEVELS, 'ring-offset-2: the offset is white, as Tailwind makes it');
  expectColour(shot, offset.x0 - 2 * ratio - 1, oy, INDIGO_500, SAME_LEVELS, 'ring-offset-2: the ring starts after it');
  expectColour(shot, offset.x0 - 4 * ratio - 1, oy, SLATE_50, SAME_LEVELS, 'ring-offset-2 ring-2: and is 2 wide');
  const thick = boxOf(cellOf('rings', 4), ratio);
  const arc = CHROME_RING_ARC[ratio];
  assert(arc !== undefined, `Chrome's ring arc is known at ratio ${ratio}`);
  expectColour(shot, thick.x0 + arc.dx, thick.y0, arc.colour, CHROME_ARC_LEVELS, 'ring-8 on an opaque box: the ring runs under the fill\'s antialiased edge, as in Chrome');
  const dark = boxOf(cellOf('rings', 10), ratio);
  expectColour(shot, dark.x0 - 1, middle(dark)[1], [15, 23, 42], SAME_LEVELS, 'ring-offset-slate-900: the offset takes the colour');
}

function checkRingsAndShadows(shot: Shot): void {
  const { ratio } = shot;
  // The card pattern: shadow-sm ring-1 ring-black/5. The ring is a hairline of black at 5 %: a pixel off the page's colour, under the shadow's.
  const card = boxOf(cellOf('rings-shadows', 0), ratio);
  const [, cy] = middle(card);
  expectColour(shot, card.x0 - 1, cy, CHROME_HAIRLINE[ratio] ?? SLATE_100, SAME_LEVELS, 'shadow-sm ring-1 ring-black/5 draws the hairline Chrome draws');
  // shadow-lg ring-2 ring-indigo-500: both are there.
  const both = boxOf(cellOf('rings-shadows', 2), ratio);
  expectColour(shot, both.x0 - 1, middle(both)[1], INDIGO_500, SAME_LEVELS, 'shadow-md ring-2: the ring');
  expectColour(shot, (both.x0 + both.x1) / 2, both.y1 + 2 * ratio + 1, CHROME_BELOW_RING[ratio] ?? SLATE_100, CHROME_LEVELS, 'shadow-md ring-2: and the shadow just below the ring, as Chrome draws it');
}

function checkOutlines(shot: Shot): void {
  const { ratio } = shot;
  const offset = boxOf(cellOf('outlines', 1), ratio);
  const [, oy] = middle(offset);
  expectColour(shot, offset.x0 - 1, oy, SLATE_50, SAME_LEVELS, 'outline-offset-2: a gap of the page');
  expectColour(shot, offset.x0 - 2 * ratio - 1, oy, BLUE_500, SAME_LEVELS, 'outline-2 outline-blue-500 sits 2 logical pixels off the box');
  expectColour(shot, offset.x0 - 4 * ratio - 1, oy, SLATE_50, SAME_LEVELS, 'and is 2 wide');
  const inside = boxOf(cellOf('outlines', 2), ratio);
  expectColour(shot, inside.x0 + 1, middle(inside)[1], BLUE_500, SAME_LEVELS, '-outline-offset-2: the outline is inside the box');
  expectColour(shot, inside.x0 + 2 * ratio + 1, middle(inside)[1], WHITE, SAME_LEVELS, '-outline-offset-2: and 2 wide');
  const none = boxOf(cellOf('outlines', 10), ratio);
  expectColour(shot, none.x0 - 1, middle(none)[1], SLATE_50, SAME_LEVELS, 'outline-none draws nothing');
  const zero = boxOf(cellOf('outlines', 9), ratio);
  expectColour(shot, zero.x0 - 1, middle(zero)[1], SLATE_50, SAME_LEVELS, 'outline-0 draws nothing');
}

function checkBorders(shot: Shot): void {
  const { ratio } = shot;
  const accent = boxOf(cellOf('borders', 0), ratio);
  const [ax, ay] = middle(accent);
  expectColour(shot, ax, accent.y0 + 1, INDIGO_500, SAME_LEVELS, 'border-t-4 border-indigo-500: the top border');
  expectColour(shot, ax, accent.y0 + 4 * ratio - 1, INDIGO_500, SAME_LEVELS, 'is 4 logical pixels thick');
  expectColour(shot, ax, accent.y0 + 4 * ratio + 1, WHITE, SAME_LEVELS, 'and then the fill');
  expectColour(shot, accent.x0 + 1, ay, WHITE, SAME_LEVELS, 'no border on the left');
  expectColour(shot, ax, accent.y1 - 1, WHITE, SAME_LEVELS, 'no border at the bottom');
  const rounded = boxOf(cellOf('borders', 6), ratio);
  expectColour(shot, (rounded.x0 + rounded.x1) / 2, rounded.y0 + 1, INDIGO_500, SAME_LEVELS, 'rounded-lg border-t-4: the top border follows the box');
  expectDifferent(shot, rounded.x0, rounded.y0, INDIGO_500, 20, 'rounded-lg border-t-4: the corner is cut');
}

function checkMixed(shot: Shot): void {
  const { ratio } = shot;
  const square = boxOf(cellOf('borders-mixed', 0), ratio);
  const [mx, my] = middle(square);
  const width = 4 * ratio;
  expectColour(shot, mx, square.y0 + 1, RED_500, SAME_LEVELS, 'the top border is red');
  expectColour(shot, square.x1 - 1, my, [59, 130, 246], SAME_LEVELS, 'the right border is blue');
  expectColour(shot, mx, square.y1 - 1, GREEN_500, SAME_LEVELS, 'the bottom border is green');
  expectColour(shot, square.x0 + 1, my, YELLOW_500, SAME_LEVELS, 'the left border is yellow');
  // The mitre of the top left corner is the diagonal from the corner of the box to the corner of the padding box: above it is the top's, below it the left's.
  expectColour(shot, square.x0 + width - 2, square.y0 + 1, RED_500, SAME_LEVELS, 'above the mitre: the top border');
  expectColour(shot, square.x0 + 1, square.y0 + width - 2, YELLOW_500, SAME_LEVELS, 'below the mitre: the left border');
  expectColour(shot, square.x1 - 2, square.y1 - 1, GREEN_500, SAME_LEVELS, 'bottom right, below the mitre: the bottom border');
  expectColour(shot, square.x1 - 1, square.y1 - 2, [59, 130, 246], SAME_LEVELS, 'bottom right, above the mitre: the right border');
}

function checkRadii(shot: Shot): void {
  const { ratio } = shot;
  const top = boxOf(cellOf('radii', 0), ratio);
  expectColour(shot, top.x0, top.y0, SLATE_100, SAME_LEVELS, 'rounded-t-xl: the top left corner is cut');
  expectColour(shot, top.x1 - 1, top.y0, SLATE_100, SAME_LEVELS, 'rounded-t-xl: the top right corner is cut');
  expectColour(shot, top.x0, top.y1 - 1, SKY_500, SAME_LEVELS, 'rounded-t-xl: the bottom left corner is square');
  expectColour(shot, top.x1 - 1, top.y1 - 1, SKY_500, SAME_LEVELS, 'rounded-t-xl: the bottom right corner is square');
  const diagonal = boxOf(cellOf('radii', 8), ratio);
  expectColour(shot, diagonal.x0, diagonal.y0, SLATE_100, SAME_LEVELS, 'rounded-tl-3xl: cut');
  expectColour(shot, diagonal.x1 - 1, diagonal.y1 - 1, SLATE_100, SAME_LEVELS, 'rounded-br-3xl: cut');
  expectDifferent(shot, diagonal.x1 - 1, diagonal.y0, SLATE_100, 20, 'the top right corner is square');
  expectDifferent(shot, diagonal.x0, diagonal.y1 - 1, SLATE_100, 20, 'the bottom left corner is square');
}

function checkGradients(shot: Shot): void {
  const { ratio } = shot;
  const toRight = boxOf(cellOf('gradients', 2), ratio);
  const [, gy] = middle(toRight);
  expectColour(shot, toRight.x0 + 1, gy, INDIGO_500, NEAR_LEVELS, 'bg-gradient-to-r: starts on from-indigo-500');
  expectColour(shot, toRight.x1 - 2, gy, PINK_500, NEAR_LEVELS, 'and ends on to-pink-500');
  expectColour(shot, (toRight.x0 + toRight.x1) / 2, gy, [(99 + 236) / 2, (102 + 72) / 2, (241 + 153) / 2], NEAR_LEVELS, 'and is the average halfway');
  const corner = boxOf(cellOf('gradients', 3), ratio);
  const topRight = rgb(shot, corner.x1 - 2, corner.y0 + 1);
  const bottomLeft = rgb(shot, corner.x0 + 1, corner.y1 - 2);
  assert(apart(topRight, bottomLeft) <= 6 + 6 * ratio, `to-br: the two corners it does not head for are on the same colour line (the 50 % line): ${describe(topRight)} against ${describe(bottomLeft)}`);
  expectColour(shot, corner.x0 + 1, corner.y0 + 1, INDIGO_500, 12, 'to-br: the top left corner is the start');
  expectColour(shot, corner.x1 - 2, corner.y1 - 2, PINK_500, 12, 'to-br: the bottom right corner is the end');
  const up = boxOf(cellOf('gradients', 0), ratio);
  expectColour(shot, (up.x0 + up.x1) / 2, up.y1 - 2, INDIGO_500, NEAR_LEVELS, 'to-t: starts at the bottom');
  expectColour(shot, (up.x0 + up.x1) / 2, up.y0 + 1, PINK_500, NEAR_LEVELS, 'to-t: and ends at the top');
}

function checkGradientsRounded(shot: Shot): void {
  const { ratio } = shot;
  const pill = boxOf(cellOf('gradients-rounded', 1), ratio);
  expectColour(shot, pill.x0, pill.y0, SLATE_200, SAME_LEVELS, 'rounded-full gradient: the corner is the page');
  const framed = boxOf(cellOf('gradients-rounded', 2), ratio);
  expectColour(shot, framed.x0 + 1, middle(framed)[1], [15, 23, 42], SAME_LEVELS, 'border-4 on a gradient: the border is over it');
  expectDifferent(shot, framed.x0 + 4 * ratio + 2, middle(framed)[1], [15, 23, 42], 30, 'and the gradient is inside the border');
  // The fade: from-red-500 to-transparent on white. Premultiplied, the middle is red at half opacity over white; straight it would be a dark red.
  const fade = boxOf(cellOf('gradients-rounded', 12), ratio);
  const [fx, fy] = middle(fade);
  expectColour(shot, fx, fy, [(239 + 255) / 2, (68 + 255) / 2, (68 + 255) / 2], NEAR_LEVELS, 'from-red-500 to-transparent: halfway is red at half opacity, not a darker red');
}

function checkGlass(shot: Shot): void {
  const { ratio } = shot;
  // The glass boxes have shadows; their middles are the glass, which a shadow must not darken: compare with a pixel of the same glass.
  const card = boxOf(cellOf('glass', 0), ratio);
  const [gx, gy] = middle(card);
  const centre = rgb(shot, gx, gy);
  const nearEdge = rgb(shot, gx, card.y0 + 6 * ratio);
  assert(brightness(centre) > 20, `Glass is not black: ${describe(centre)}`);
  assert(apart(centre, nearEdge) < 60, `The glass is smooth across its box, with no shadow edge in it: ${describe(centre)} and ${describe(nearEdge)}`);
}

const PAGE_CHECKS: Readonly<Record<string, (shot: Shot) => void>> = {
  shadows: checkShadows,
  'shadows-translucent': checkTranslucent,
  rings: checkRings,
  'rings-shadows': checkRingsAndShadows,
  outlines: checkOutlines,
  borders: checkBorders,
  'borders-mixed': checkMixed,
  radii: checkRadii,
  gradients: checkGradients,
  'gradients-rounded': checkGradientsRounded,
  glass: checkGlass,
};

/** A box far off the stage's left edge whose shadow alone reaches into the window: the engine culls an item by its rectangle. */
function checkCulling(shot: Shot): void {
  const { ratio } = shot;
  const edge = cellOf('shadows-shapes', 12);
  assert(edge.left + edge.width < 0, 'The edge box is wholly off the stage, with a gap (the engine counts touching rectangles as intersecting)');
  // shadow-2xl falls 25px: read level with the middle of the shadow, 14px from its right edge.
  const y = Math.round((edge.top + edge.height / 2 + 25) * ratio);
  expectColour(shot, 2 * ratio, y, CHROME_CULLED_REACH[ratio] ?? SLATE_200, CHROME_LEVELS, 'The shadow of a box wholly off the window still reaches in, as Chrome draws it');
}

// ---- Capturing --------------------------------------------------------------------------------------------------------------

async function showPage(api: PaintInspection, name: string): Promise<void> {
  api.showPaintPage(name);
  await settleFrames();
}

async function capturePages(owner: Node, api: PaintInspection, capture: PaintCapture, prefix: string, ratio: number): Promise<void> {
  for (const page of PAINT_PAGES) {
    await showPage(api, page.name);
    const stage = api.find('paint-stage');
    assert(stage !== undefined, `Page ${page.name} has its stage`);
    assert(stage.rect.width === PAINT_STAGE.width && stage.rect.height === PAINT_STAGE.height, `Page ${page.name}'s stage is ${PAINT_STAGE.width} x ${PAINT_STAGE.height}`);
    // A box off the stage by design (the culling check) is not an escape.
    const past = (box: { left: number; top: number; width: number; height: number }): boolean =>
      box.left < 0 || box.top < 0 || box.left + box.width > PAINT_STAGE.width || box.top + box.height > PAINT_STAGE.height;
    const offStage = [
      ...page.cells.filter(past).map(cell => cell.id),
      ...(page.shapes ?? []).flatMap((shape, index) => (past(shape) ? [`paint-shape-${index}`] : [])),
    ];
    await capture(`${prefix}-${page.name}`, offStage);
    const shot = shoot(owner, ratio);
    PAGE_CHECKS[page.name]?.(shot);
    if (page.name === 'shadows-shapes') checkCulling(shot);
  }
}

// ---- The states page: what changes with the pointer and the keyboard, what must not draw ------------------------------------------

let contentScale = 1;

function windowPoint(at: Vector2): Vector2 {
  return new Vector2(at.x * contentScale, at.y * contentScale);
}

async function moveTo(at: Vector2): Promise<void> {
  const event = new InputEventMouseMotion();
  event.position = windowPoint(at);
  event.globalPosition = event.position;
  parseVerifierEvent(event);
  await frames(HOVER_DWELL_FRAMES);
}

function centreOf(box: { left: number; top: number; width: number; height: number }): Vector2 {
  return new Vector2(box.left + box.width / 2, box.top + box.height / 2);
}

async function press(keycode: Key): Promise<void> {
  for (const pressed of [true, false]) {
    const event = new InputEventKey();
    event.keycode = keycode;
    event.pressed = pressed;
    parseVerifierEvent(event);
    await frames(SETTLE_FRAMES);
  }
}

async function checkHover(owner: Node, api: PaintInspection, ratio: number): Promise<void> {
  const card = boxOf(STATES_LAYOUT.hover, ratio);
  const probe = (shot: Shot): Rgb => rgb(shot, (card.x0 + card.x1) / 2, card.y1 + 4 * ratio);
  await moveTo(new Vector2(PAINT_STAGE.width - 4, PAINT_STAGE.height - 4));
  const rest = probe(shoot(owner, ratio));
  const ringAtRest = rgb(shoot(owner, ratio), card.x0 - 1, (card.y0 + card.y1) / 2);
  const before = api.activity();
  await moveTo(centreOf(STATES_LAYOUT.hover));
  const after = api.activity();
  const hovered = shoot(owner, ratio);
  assert(after.batches === before.batches, `A hover that changes a shadow and a ring makes no React commit: ${before.batches} -> ${after.batches}`);
  assert(after.boxRecords === before.boxRecords + 1, `and re-records one box: ${before.boxRecords} -> ${after.boxRecords}`);
  assert(brightness(rest) - brightness(probe(hovered)) >= 6, `hover:shadow-xl darkens the page below the card: ${describe(rest)} -> ${describe(probe(hovered))}`);
  expectColour(hovered, card.x0 - 1, (card.y0 + card.y1) / 2, INDIGO_500, NEAR_LEVELS + 6, 'hover:ring-2 hover:ring-indigo-500 draws the ring (over the shadow)');
  assert(apart(ringAtRest, INDIGO_500) > 30, `and it was not there at rest: ${describe(ringAtRest)}`);
  await moveTo(new Vector2(PAINT_STAGE.width - 4, PAINT_STAGE.height - 4));
  expectColour(shoot(owner, ratio), (card.x0 + card.x1) / 2, card.y1 + 4 * ratio, rest, 1, 'and the pointer leaving puts it all back');
}

async function checkTransition(owner: Node, ratio: number): Promise<void> {
  const card = boxOf(STATES_LAYOUT.transition, ratio);
  const probe = (shot: Shot): Rgb => rgb(shot, (card.x0 + card.x1) / 2, card.y1 + 6 * ratio);
  await moveTo(new Vector2(PAINT_STAGE.width - 4, PAINT_STAGE.height - 4));
  await frames(Math.ceil(TRANSITION_MS / NOMINAL_FRAME_MS) + SETTLE_FRAMES);
  const rest = probe(shoot(owner, ratio));
  await moveTo(centreOf(STATES_LAYOUT.transition));
  await frames(Math.ceil(TRANSITION_MS / NOMINAL_FRAME_MS) + SETTLE_FRAMES);
  const settled = probe(shoot(owner, ratio));
  assert(brightness(rest) - brightness(settled) >= 6, `shadow-sm to shadow-xl: the settled shadow is darker (${describe(rest)} -> ${describe(settled)})`);
  // Back, and read in the middle of the way.
  await moveTo(new Vector2(PAINT_STAGE.width - 4, PAINT_STAGE.height - 4));
  const started = Date.now();
  let midway: Rgb | undefined;
  while (Date.now() - started < TRANSITION_MS * 2) {
    await frames(1);
    const elapsed = Date.now() - started;
    if (elapsed > TRANSITION_MS * 0.35 && elapsed < TRANSITION_MS * 0.65) {
      midway = probe(shoot(owner, ratio));
      break;
    }
  }
  assert(midway !== undefined, 'A reading was taken in the middle of the transition');
  const lighter = Math.min(brightness(rest), brightness(settled));
  const darker = Math.max(brightness(rest), brightness(settled));
  assert(brightness(midway) > lighter + 1 && brightness(midway) < darker - 1,
    `In the middle of a shadow transition the shadow is between its two ends: rest ${describe(rest)}, settled ${describe(settled)}, midway ${describe(midway)}`);
}

/** Press Tab until `testID` has the focus (a window that already had a focused element, or a wrapped list, may need several), at most `limit` times. */
async function tabTo(api: PaintInspection, testID: string): Promise<void> {
  const target = api.find(testID);
  assert(target !== undefined, `${testID} is on the page`);
  const TAB_LIMIT = 8;
  for (let presses = 0; presses < TAB_LIMIT; presses += 1) {
    await press(Key.KeyTab);
    if (api.snapshot().focused === target.id) return;
  }
  assert(false, `Tab reaches ${testID} within ${TAB_LIMIT} presses`);
}

async function checkFocus(owner: Node, api: PaintInspection, ratio: number): Promise<void> {
  await moveTo(new Vector2(PAINT_STAGE.width - 4, PAINT_STAGE.height - 4));
  api.grabSurfaceFocus();
  await frames(SETTLE_FRAMES);
  const look = (box: { left: number; top: number; width: number; height: number }, gap: number): Rgb => {
    const area = boxOf(box, ratio);
    return rgb(shoot(owner, ratio), area.x0 - gap, (area.y0 + area.y1) / 2);
  };
  // Nothing is focused: no ring, no outline anywhere.
  for (const box of [STATES_LAYOUT.plain, STATES_LAYOUT.none, STATES_LAYOUT.authored]) {
    assert(apart(look(box, 1), SLATE_100) <= 3 && apart(look(box, 2 * ratio + 1), SLATE_100) <= 3, 'No button shows a ring before a key focuses one');
  }
  await tabTo(api, 'paint-focus-plain');
  // The plain button has the native ring (an inset stroke), which is what a browser's default outline is.
  const plain = boxOf(STATES_LAYOUT.plain, ratio);
  expectColour(shoot(owner, ratio), plain.x0 + 1, (plain.y0 + plain.y1) / 2, FOCUS_RING, 8, 'A focused button with no outline of its own has the native focus ring');
  await tabTo(api, 'paint-focus-none');
  // outline-none takes the native ring away.
  const none = boxOf(STATES_LAYOUT.none, ratio);
  const shot = shoot(owner, ratio);
  expectColour(shot, none.x0 + 1, (none.y0 + none.y1) / 2, WHITE, 3, 'outline-none: the focused button has no native ring');
  expectColour(shot, none.x0 - 1, (none.y0 + none.y1) / 2, SLATE_100, 3, 'outline-none: and no outline round it');
  await tabTo(api, 'paint-focus-authored');
  // focus-visible:outline-2 draws the author's own instead, 2 logical pixels off the box.
  const authored = boxOf(STATES_LAYOUT.authored, ratio);
  const drawn = shoot(owner, ratio);
  const authoredY = (authored.y0 + authored.y1) / 2;
  expectColour(drawn, authored.x0 + 1, authoredY, WHITE, 3, 'focus-visible:outline-2 replaces the native ring: none inside the box');
  expectColour(drawn, authored.x0 - 2 * ratio - 1, authoredY, INDIGO_500, SAME_LEVELS, 'and draws the outline 2 logical pixels off the box');
  expectColour(drawn, authored.x0 - 1, authoredY, SLATE_100, 3, 'with a gap of the page');
  // A ring that grows on focus keeps the shadow under it, with no React commit.
  const composed = boxOf(STATES_LAYOUT.composed, ratio);
  assert(apart(look(STATES_LAYOUT.composed, 1), INDIGO_500) > 60, 'Before it is focused the element has only the ring-1 hairline');
  const before = api.activity();
  await tabTo(api, 'paint-focus-ring');
  const focused = shoot(owner, ratio);
  const [, cy] = middle(composed);
  expectColour(focused, composed.x0 - 1, cy, INDIGO_500, SAME_LEVELS, 'focus:ring-2 focus:ring-indigo-500 draws the focused ring');
  expectColour(focused, composed.x0 - 2 * ratio, cy, INDIGO_500, SAME_LEVELS, 'two logical pixels wide, where ring-1 was one');
  // The shadow-lg of the same element survives the ring's change: the pixels below the ring are Chrome's, which are the unfocused ones.
  const mid = (composed.x0 + composed.x1) / 2;
  expectColour(focused, mid, composed.y1 + 4 * ratio, CHROME_FOCUSED_SHADOW_4[ratio] ?? SLATE_100, CHROME_LEVELS, 'and the shadow-lg of the same element is still there, as in Chrome (near)');
  expectColour(focused, mid, composed.y1 + 8 * ratio, CHROME_FOCUSED_SHADOW_8[ratio] ?? SLATE_100, CHROME_LEVELS, 'and further down');
  assert(api.activity().batches === before.batches, 'The focus ring changed with no React commit');
}

function checkClip(owner: Node, ratio: number): void {
  const clip = boxOf(STATES_LAYOUT.clip, ratio);
  const shot = shoot(owner, ratio);
  const row = (clip.y0 + clip.y1) / 2 - 10 * ratio;
  // The child's red ring reaches 16 logical pixels past it, and its box is 10 from the container's left edge: the ring is cut at the container's edge.
  expectColour(shot, clip.x0 + 2, STATES_LAYOUT.clip.top * ratio + (STATES_LAYOUT.clipChild.top + 10) * ratio, RED_500 as Rgb, 40, 'A shadow inside an overflow-hidden box is drawn');
  expectColour(shot, clip.x0 - 3, row, SLATE_100, 3, 'and is clipped at the box, as CSS clips it');
  expectColour(shot, clip.x0 - 8, STATES_LAYOUT.clip.top * ratio + (STATES_LAYOUT.clipChild.top + 10) * ratio, SLATE_100, 3, 'not drawn outside it');
}

function checkGroup(owner: Node, ratio: number): void {
  const group = boxOf(STATES_LAYOUT.group, ratio);
  const shot = shoot(owner, ratio);
  const [, gy] = middle(group);
  const ring = rgb(shot, group.x0 - 5 * ratio, gy);
  assert(ring[2] > 180 && ring[0] < 90, `A filter group covers the shadow of what is inside it: the ring 5 logical pixels outside the group is blue, ${describe(ring)}`);
}

async function checkStates(owner: Node, api: PaintInspection, ratio: number): Promise<void> {
  await showPage(api, 'states');
  await checkHover(owner, api, ratio);
  await checkTransition(owner, ratio);
  await checkClip(owner, ratio);
  await checkGroup(owner, ratio);
  await checkFocus(owner, api, ratio);
}

/** A tree that has no shadow, ring, outline or gradient holds none of what they need. */
async function checkCost(api: PaintInspection): Promise<void> {
  api.showLab('hud');
  await settleFrames();
  assert(api.activity().paintTextures === 0, `A page with nothing to paint holds no texture: ${api.activity().paintTextures}`);
  await showPage(api, 'shadows');
  const held = api.activity().paintTextures;
  assert(held > 0 && held < 24, `A page of twelve shadows holds a few shared textures, not one a box: ${held}`);
  api.showLab('hud');
  await settleFrames();
  assert(api.activity().paintTextures === 0, `and gives them back when it goes: ${api.activity().paintTextures}`);
}

async function runAt(owner: Node, api: PaintInspection, capture: PaintCapture, prefix: string, ratio: number): Promise<void> {
  contentScale = ratio;
  await capturePages(owner, api, capture, prefix, ratio);
  await checkStates(owner, api, ratio);
}

export async function verifyPaint(owner: Node, api: PaintInspection, capture: PaintCapture): Promise<void> {
  await checkCost(api);
  await runAt(owner, api, capture, 'paint', 1);
  // Device pixel ratio two: the window's content scale, as a retina display has it (the logical window is half as wide).
  const win = window(owner);
  win.contentScaleFactor = RETINA_SCALE;
  await frames(SETTLE_FRAMES);
  try {
    await runAt(owner, api, capture, 'paint-dpr2', RETINA_SCALE);
  } finally {
    win.contentScaleFactor = 1;
    contentScale = 1;
    await frames(SETTLE_FRAMES);
  }
  api.showLab('hud');
  assert(PAINT_STATES_PAGE === 'states', 'The states page is named');
}
