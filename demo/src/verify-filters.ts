import { DisplayServer, Engine, Image, Rid, InputEventMouseButton, InputEventMouseMotion, MouseButton, Node, OS, RenderingServer, Time, Vector2, Window } from 'godot';
import type { NativeActivity, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import {
  COLOUR_CELL, MOVING_SIZE, MOVING_TOP, PANEL_HEIGHT, PANEL_INSET, PANEL_TOP, SCROLL_ROW, SHAPE_RADIUS, STRIPE_PX,
  SWATCH_COLOURS, type FiltersLabProps,
} from './filters-lab';
import type { GlassInspection } from './verify-glass';
import { assertionTally, parseVerifierEvent } from './verifier-input';

/**
 * The `filters` section of the interaction verifier (plan Phase V1). Every claim is read from the rendered pixels of a
 * fixture made of hard edges and flat colours, never from native's own bookkeeping alone.
 */
export interface FiltersInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showFilters(props: FiltersLabProps): void;
  godotContent(kind: 'none' | '2d' | '3d'): void;
  activity(): NativeActivity;
  offsetSurface(x: number, y: number): void;
  scaleSurface(factor: number): void;
  scrollTo(testID: string, top: number): void;
}

/** `overflowing`: test ids of nodes that reach past the window by design (the glass lab's blobs). */
export type FiltersCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

const FRAME_POLL_MS = 10;
/** A render settles in two frames: native paints inside the commit, the engine draws it the next frame. */
const SETTLE_FRAMES = 3;
/** 10 to 90 percent width of a unit Gaussian's edge, in standard deviations (2 * 1.28155). */
const WIDTH_10_90_SIGMAS = 2.563103;
/** The radii the plan names: Tailwind's scale from `blur-sm` to `blur-3xl`, and 2 px for the smallest. */
const ACCURACY_RADII = [2, 4, 8, 12, 16, 24, 40, 64] as const;
/**
 * The measured 10 to 90 width may differ from a true Gaussian's by this fraction or `WIDTH_TOLERANCE_PX`, whichever is
 * larger. The model of the kernel is within 1.7 % of a Gaussian at every radius (`native/blur.rs` tests); the rest is the
 * 8-bit quantisation of the raster (about 0.3 px on a 5 px edge) and the interpolation of the crossings.
 */
const WIDTH_TOLERANCE = 0.04;
const WIDTH_TOLERANCE_PX = 0.6;
/**
 * The largest difference between the rendered edge profile and a Gaussian's cumulative distribution. A staircase of
 * facets (the back buffer's mipmaps magnified) is 0.05 to 0.2; the kernel measures 0.006 (under two 8-bit steps).
 */
const PROFILE_TOLERANCE = 0.02;
/**
 * Where the blurred edge crosses one half may differ from where the sharp edge is by this. A blur is symmetric, so the
 * crossing does not move; what moves it is a copy region whose texel grid is off the target's (up to half a texel, 1 to 16 px
 * at the radii here) or a level read at the wrong place (a fraction of a pixel to a texel). The model is within 0.1 px.
 */
const EDGE_POSITION_TOLERANCE_PX = 0.8;
/** How far each side of an edge a profile is read, in blur radii, and the room the moving panel keeps at its own sides. */
const PROFILE_REACH_RADII = 1.6;
const MOVING_MARGIN = 10;
/** A second radius for the moving panel: a texel of 16 px (level four) puts the region's edges off the grid at most positions. */
const MOVING_LARGE_RADIUS = 16;
/** A radius sweep step may differ from the ideal step by this (two and a half 8-bit steps). */
const SWEEP_STEP_TOLERANCE = 0.012;
const SWEEP_FROM = 3;
const SWEEP_TO = 70;
const SWEEP_FACTOR = 1.02;
/** The probe of the sweep, in CSS pixels from the edge. */
const SWEEP_PROBE_PX = 12;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

export async function settleFrames(): Promise<void> {
  await frames(SETTLE_FRAMES);
}

export function grab(owner: Node): Image {
  RenderingServer.forceDraw();
  const image = owner.getViewport()?.getTexture()?.getImage();
  assert(image, 'Native verification requires a rendered viewport');
  return image;
}

function node(api: FiltersInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

/** Physical pixels per CSS pixel of the current render. */
function pixelRatio(image: Image, api: FiltersInspection): number {
  return image.getWidth() / api.snapshot().width;
}

/** The red channel of a row of pixels, from `x0` up to `x1`. */
function row(image: Image, y: number, x0: number, x1: number): number[] {
  const out: number[] = [];
  for (let x = x0; x < x1; x += 1) out.push(image.getPixel(x, y).r);
  return out;
}

function width1090(profile: readonly number[]): number {
  const crossing = (level: number): number => {
    for (let index = 1; index < profile.length; index += 1) {
      const before = profile[index - 1] ?? 0;
      const after = profile[index] ?? 0;
      if (before < level && after >= level) return index - 1 + (level - before) / (after - before);
    }
    throw new Error(`The profile never crosses ${level}`);
  };
  return crossing(0.9) - crossing(0.1);
}

/** The cumulative distribution of a unit Gaussian (Abramowitz and Stegun 7.1.26, error under 1.5e-7). */
function normalCdf(z: number): number {
  const x = z / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = (1 - poly * Math.exp(-x * x)) * Math.sign(x);
  return 0.5 * (1 + erf);
}

interface EdgeMeasurement {
  /** What native said it did, for the failure message. */
  detail: string;
  /** Standard deviation the plan says it drew, in physical pixels. */
  achievedPx: number;
  clamped: boolean;
  width: number;
  worst: number;
  /** Where the profile crosses one half, minus where the sharp edge is, in physical pixels. */
  shift: number;
}

/** Render the edge scene and measure the edge through the panel's middle against a Gaussian of the plan's radius. */
async function measureEdge(owner: Node, api: FiltersInspection, props: FiltersLabProps): Promise<EdgeMeasurement | undefined> {
  api.showFilters(props);
  await settleFrames();
  const image = grab(owner);
  const ratio = pixelRatio(image, api);
  const panel = node(api, 'panel');
  const effects = panel.effects;
  assert(effects, `The panel has a filter that is drawn: ${JSON.stringify(props)}`);
  const plan = (props.target === 'filter' ? effects.filter : effects.backdrop)?.plan;
  assert(plan, `The panel's blur has a plan: ${JSON.stringify(props)}`);
  const centre = Math.round(api.snapshot().width / 2 * ratio);
  const y = Math.floor((PANEL_TOP + PANEL_HEIGHT / 2) * ratio);
  // How far from the middle the profile is read: not into the panel's own sides, and for a filtered panel not within three
  // radii of its outer edge, where its blurred content fades into the page.
  const inset = props.target === 'filter' ? 0 : PANEL_INSET;
  const half = (api.snapshot().width / 2 - inset) * ratio;
  const span = Math.min(Math.ceil(4 * plan.achievedPx + 40), Math.floor(half - 6), props.target === 'filter' ? Math.floor(half - 3 * plan.achievedPx) : Infinity);
  // A 10 to 90 width needs the profile to reach a standard deviation and a quarter on each side.
  if (span < 1.5 * plan.achievedPx) return undefined;
  let profile = row(image, y, centre - span, centre + span);
  if (props.target === 'filter') {
    // The panel's own top and bottom fade its blurred content into the page by a constant fraction along this row, which is
    // a gain and an offset on the edge: the two plateaus at the ends give them back.
    const low = profile[0] ?? 0;
    const high = profile[profile.length - 1] ?? 1;
    profile = normalise(profile, low, high);
  }
  let worst = 0;
  let worstAt = 0;
  profile.forEach((value, index) => {
    const error = Math.abs(value - normalCdf((index - span + 0.5) / plan.achievedPx));
    if (error > worst) {
      worst = error;
      worstAt = index - span;
    }
  });
  return {
    detail: JSON.stringify({ plan, region: effects.backdrop?.region, target: [image.getWidth(), image.getHeight()], ratio, worstAt, span, ends: [profile[0], profile[profile.length - 1]] }),
    achievedPx: plan.achievedPx, clamped: plan.clamped, width: width1090(profile), worst,
    shift: halfCrossing(profile) - span,
  };
}

function checkEdge(label: string, requestedPx: number, measured: EdgeMeasurement): void {
  const ideal = WIDTH_10_90_SIGMAS * measured.achievedPx;
  const error = Math.abs(measured.width - ideal);
  assert(error <= Math.max(WIDTH_TOLERANCE * ideal, WIDTH_TOLERANCE_PX),
    `${label}: 10 to 90 width ${measured.width.toFixed(2)} px, a Gaussian of ${measured.achievedPx.toFixed(2)} px has ${ideal.toFixed(2)} (requested ${requestedPx.toFixed(2)} px) ${measured.detail}`);
  assert(measured.worst <= PROFILE_TOLERANCE,
    `${label}: the edge departs from a Gaussian by ${measured.worst.toFixed(4)} (limit ${PROFILE_TOLERANCE}): facets, not a smooth blur ${measured.detail}`);
  assert(Math.abs(measured.shift) <= EDGE_POSITION_TOLERANCE_PX,
    `${label}: the blurred edge is ${measured.shift.toFixed(2)} px from where the sharp edge is (limit ${EDGE_POSITION_TOLERANCE_PX}) ${measured.detail}`);
}

/** Blur accuracy at the plan's radii, for the backdrop behind a panel and for a panel's own content. */
async function verifyBlurAccuracy(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  const requested = (radius: number): number => radius * pixelRatio(grab(owner), api);
  for (const target of ['backdrop', 'filter'] as const) {
    for (const radius of ACCURACY_RADII) {
      const measured = await measureEdge(owner, api, { scene: 'edge', target, radius });
      const asked = requested(radius);
      assert(measured, `The panel is wide enough to measure ${target} ${radius}px`);
      // A target with too few mip levels for the radius says so and draws what it can; every other radius is exact.
      if (measured.clamped) {
        assert(measured.achievedPx < asked, `A clamped plan draws less than was asked: ${measured.achievedPx} of ${asked}`);
        console.log('GODOT_REACT_FILTERS_CLAMPED', JSON.stringify({ target, radius, achievedPx: measured.achievedPx }));
      } else {
        assert(Math.abs(measured.achievedPx - asked) < 0.01, `${target} ${radius}: the plan draws the radius asked: ${measured.achievedPx} of ${asked}`);
      }
      checkEdge(`${target} blur ${radius}px`, asked, measured);
    }
    await capture(`filters-edge-${target}`);
  }
}

/** A step of the radius changes the picture by about what a Gaussian's change would: no pop, no staircase. */
async function verifyRadiusSweep(owner: Node, api: FiltersInspection): Promise<void> {
  let previous: { sigma: number; value: number } | undefined;
  let worst = 0;
  let worstAt = 0;
  let steps = 0;
  for (let radius = SWEEP_FROM; radius <= SWEEP_TO; radius *= SWEEP_FACTOR) {
    api.showFilters({ scene: 'edge', target: 'backdrop', radius });
    await frames(2);
    const image = grab(owner);
    const ratio = pixelRatio(image, api);
    const plan = node(api, 'panel').effects?.backdrop?.plan;
    assert(plan, 'The sweep has a plan at every radius');
    const centre = Math.round(api.snapshot().width / 2 * ratio);
    const y = Math.floor((PANEL_TOP + PANEL_HEIGHT / 2) * ratio);
    const probe = SWEEP_PROBE_PX * ratio;
    const value = image.getPixel(centre + Math.round(probe), y).r;
    if (previous !== undefined) {
      const ideal = normalCdf((probe + 0.5) / plan.achievedPx) - normalCdf((probe + 0.5) / previous.sigma);
      const jump = Math.abs(value - previous.value - ideal);
      if (jump > worst) {
        worst = jump;
        worstAt = radius;
      }
    }
    previous = { sigma: plan.achievedPx, value };
    steps += 1;
  }
  assert(worst <= SWEEP_STEP_TOLERANCE, `The radius sweep pops: a ${(SWEEP_FACTOR - 1) * 100}% step differs from the ideal by ${worst.toFixed(4)} at ${worstAt.toFixed(1)} px (limit ${SWEEP_STEP_TOLERANCE})`);
  console.log('GODOT_REACT_FILTERS_SWEEP', JSON.stringify({ steps, worst, worstAt }));
}

/** A tree without a filter has no filter items, materials or shaders; a zero radius makes none either. */
async function verifyNothingWhenUnused(api: FiltersInspection): Promise<void> {
  const before = api.activity().effects;
  api.showFilters({ scene: 'edge', target: 'backdrop', radius: 0 });
  await settleFrames();
  const after = api.activity().effects;
  assert(after.backdrops === 0 && after.groups === 0 && after.copiesEnabled === 0,
    `A radius of zero draws no backdrop: ${JSON.stringify(after)}`);
  assert(after.itemsCreated === before.itemsCreated && after.materialsCreated === before.materialsCreated,
    `A radius of zero creates no item or material: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  assert(node(api, 'panel').effects === null, 'The panel reports no effects');
}

// ---- Helpers for the rest ---------------------------------------------------------------------------------------------

type Channel = 'r' | 'g' | 'b';

function channelAt(image: Image, x: number, y: number, channel: Channel = 'r'): number {
  return image.getPixel(Math.floor(x), Math.floor(y))[channel];
}

function rowProfile(image: Image, y: number, x0: number, x1: number, channel: Channel = 'r'): number[] {
  const out: number[] = [];
  for (let x = Math.floor(x0); x < Math.floor(x1); x += 1) out.push(channelAt(image, x, y, channel));
  return out;
}

function columnProfile(image: Image, x: number, y0: number, y1: number, channel: Channel = 'r'): number[] {
  const out: number[] = [];
  for (let y = Math.floor(y0); y < Math.floor(y1); y += 1) out.push(channelAt(image, x, y, channel));
  return out;
}

/** Where a rising profile crosses one half, in profile coordinates (pixel centres at +0.5 added by the caller). */
function halfCrossing(profile: readonly number[]): number {
  for (let index = 1; index < profile.length; index += 1) {
    const before = profile[index - 1] ?? 0;
    const after = profile[index] ?? 0;
    if (before < 0.5 && after >= 0.5) return index - 1 + (0.5 - before) / (after - before) + 0.5;
  }
  throw new Error('The profile never crosses one half');
}

function normalise(profile: readonly number[], low: number, high: number): number[] {
  return profile.map(value => (value - low) / (high - low));
}

function near(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

/** The z at which a unit Gaussian's cumulative distribution is `probability` (bisection; the tails are not needed). */
function normalInverse(probability: number): number {
  let low = -8;
  let high = 8;
  for (let step = 0; step < 60; step += 1) {
    const middle = (low + high) / 2;
    if (normalCdf(middle) < probability) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

/**
 * The 10 to 90 width, in standard deviations, of a Gaussian edge multiplied by `gain` and clamped to one, as a brightness above 1
 * does: the ramp reaches 0.9 where the blur has only reached 0.9 / gain.
 */
function gainedWidthSigmas(gain: number): number {
  return normalInverse(0.9 / gain) - normalInverse(0.1 / gain);
}

function widthOk(measured: number, sigmaPx: number, gain = 1): boolean {
  const ideal = (gain === 1 ? WIDTH_10_90_SIGMAS : gainedWidthSigmas(gain)) * sigmaPx;
  return Math.abs(measured - ideal) <= Math.max(WIDTH_TOLERANCE * ideal, WIDTH_TOLERANCE_PX);
}

async function wait(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function hoverAt(at: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = at;
  event.globalPosition = at;
  parseVerifierEvent(event);
}

function centreOf(api: FiltersInspection, testID: string): Vector2 {
  const { rect } = node(api, testID);
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function stripe(x: number): number {
  return Math.floor(x / STRIPE_PX) % 2 === 0 ? 0 : 1;
}

function window(owner: Node): Window {
  const found = owner.getWindow();
  assert(found, 'The demo has its window');
  return found;
}

// ---- Shape: rounded corners, translucent fill and border over the blur ---------------------------------------------------

async function verifyShape(owner: Node, api: FiltersInspection, capture: FiltersCapture, label = 'filters-shape'): Promise<void> {
  api.showFilters({ scene: 'edge', target: 'backdrop', radius: 8, shape: true });
  await settleFrames();
  const image = grab(owner);
  const ratio = pixelRatio(image, api);
  const { rect } = node(api, 'panel');
  const left = rect.x;
  const top = rect.y;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  /** The red channel at a point given in CSS pixels. */
  const at = (x: number, y: number): number => channelAt(image, x * ratio, y * ratio);
  // Just outside each rounded corner, inside its bounding box: the stripes, untouched. A point one CSS pixel in from the corner
  // along the diagonal is twelve pixels beyond a 32 px arc.
  for (const [x, y] of [[left + 1, top + 1], [right - 2, top + 1], [left + 1, bottom - 2], [right - 2, bottom - 2]] as const) {
    assert(near(at(x, y), stripe(x), 0.02), `Pixel (${x},${y}) is outside the rounded corner, so it is the stripe ${stripe(x)}: ${at(x, y)}`);
  }
  // Inside the arc, and everywhere in the body: the stripes are blurred to grey and the translucent white (20 %) is over it.
  for (const [x, y] of [[left + SHAPE_RADIUS + 4, top + SHAPE_RADIUS + 4], [rect.x + rect.width / 2, rect.y + rect.height / 2], [right - SHAPE_RADIUS - 5, bottom - SHAPE_RADIUS - 5]] as const) {
    assert(near(at(x, y), 0.6, 0.05), `Pixel (${x},${y}) is the blurred stripes (0.5) under 20% white (0.6): ${at(x, y)}`);
  }
  const body = columnProfile(image, (left + 100) * ratio, (top + 40) * ratio, (top + 40 + 4 * STRIPE_PX * 2) * ratio)
    .concat(rowProfile(image, (top + 100) * ratio, (left + 100) * ratio, (left + 100 + 4 * STRIPE_PX * 2) * ratio));
  assert(Math.max(...body) - Math.min(...body) < 0.03, 'The stripes do not show through the panel: they are blurred away');
  // The border is drawn over the blur.
  const border = image.getPixel(Math.floor((left + 0.5) * ratio), Math.floor((top + 90) * ratio));
  assert(border.r > 0.8 && border.g < 0.25 && border.b < 0.25, `The 2 px border is red over the panel: ${border.toHtml(false)}`);
  // Along a straight side: the stripe above the panel is pure, the pixel just inside is blurred.
  assert(near(at(left + 100, top - 1), stripe(left + 100), 0.02), 'The pixel above the top side is untouched');
  assert(near(at(left + 100, top + 3), 0.6, 0.05), 'The pixel just inside the top side is blurred');
  await capture(label);
}

// ---- Stacked panels: the second sees the first, blurred, not stale levels ------------------------------------------------

async function verifyStacking(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  const radius = 8;
  api.showFilters({ scene: 'stack', radius });
  await settleFrames();
  const image = grab(owner);
  const ratio = pixelRatio(image, api);
  const sigma = radius * ratio;
  const centre = Math.round(api.snapshot().width / 2 * ratio);
  const a = node(api, 'panel-a').rect;
  const b = node(api, 'panel-b').rect;
  const half = (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) / 2 * ratio;
  const measure = (y: number, expectedSigma: number): number => {
    const span = Math.min(Math.round(4 * expectedSigma + 8), Math.floor(half) - 8);
    const profile = rowProfile(image, y, centre - span, centre + span);
    return width1090(profile);
  };
  const single = measure((a.y + 40) * ratio, sigma);
  assert(widthOk(single, sigma), `Panel A alone blurs the edge by ${radius}px: ${single.toFixed(2)} wide`);
  const both = measure((b.y + 40) * ratio, sigma * Math.SQRT2);
  assert(widthOk(both, sigma * Math.SQRT2),
    `Where B is over A it blurs A's blur, so the variances add (${(sigma * Math.SQRT2).toFixed(1)} px): ${both.toFixed(2)} wide, a single blur would be ${(WIDTH_10_90_SIGMAS * sigma).toFixed(2)}`);
  const only = measure((b.y + b.height - 40) * ratio, sigma);
  assert(widthOk(only, sigma), `Panel B alone blurs the edge by ${radius}px: ${only.toFixed(2)} wide`);
  await capture('filters-stacked');
}

// ---- A Portal scrim over the main layer, and Godot content behind the root ----------------------------------------------

async function verifyUnderneath(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  api.showFilters({ scene: 'portal', radius: 4 });
  await settleFrames();
  let image = grab(owner);
  let ratio = pixelRatio(image, api);
  const centre = Math.round(api.snapshot().width / 2 * ratio);
  const y = Math.round(100 * ratio);
  const portal = widthOk(width1090(rowProfile(image, y, centre - 30, centre + 30)), 4 * ratio);
  assert(portal, 'A fixed inset-0 backdrop-blur-sm scrim in a Portal blurs the main layer under it by 4px');
  await capture('filters-portal-scrim');

  // Godot content behind the root: two flat colours of a Control, then a box in the window's own 3D world.
  api.godotContent('2d');
  api.showFilters({ scene: 'godot', radius: 12 });
  await settleFrames();
  image = grab(owner);
  ratio = pixelRatio(image, api);
  const panel = node(api, 'panel').rect;
  const mid = Math.round((panel.y + panel.height / 2) * ratio);
  // The green channel goes 0.1 to 0.9 across the edge.
  const profile = normalise(rowProfile(image, mid, centre - 80, centre + 80, 'g'), 0.1, 0.9);
  assert(widthOk(width1090(profile), 12 * ratio), `A frosted panel blurs what a Godot Control draws behind the root (12px): ${width1090(profile).toFixed(2)} wide`);
  const above = Math.round((panel.y - 20) * ratio);
  assert(near(channelAt(image, centre - 3, above, 'g'), 0.1, 0.02) && near(channelAt(image, centre + 3, above, 'g'), 0.9, 0.02),
    'Above the panel the Godot content is untouched and sharp');
  await capture('filters-godot-2d');

  api.godotContent('3d');
  api.showFilters({ scene: 'godot', radius: 0 });
  await frames(5);
  const sharp = grab(owner);
  api.showFilters({ scene: 'godot', radius: 12 });
  await frames(5);
  const frosted = grab(owner);
  const sharpRow = rowProfile(sharp, mid, 0, sharp.getWidth());
  const frostedRow = rowProfile(frosted, mid, 0, frosted.getWidth());
  // The box's edges are where the sharp row jumps; the frosted row has no jump there and the same outer colours.
  const jump = sharpRow.findIndex((value, index) => index > 0 && Math.abs(value - (sharpRow[index - 1] ?? value)) > 0.3);
  assert(jump > 0, 'The 3D box is in the picture');
  const frostedJump = Math.abs((frostedRow[jump] ?? 0) - (frostedRow[jump - 1] ?? 0));
  assert(frostedJump < 0.05, `The frosted panel blurs the 3D scene behind the root: the edge step is ${frostedJump.toFixed(3)} instead of ${Math.abs((sharpRow[jump] ?? 0) - (sharpRow[jump - 1] ?? 0)).toFixed(3)}`);
  await capture('filters-godot-3d');
  api.godotContent('none');
}

// ---- Live updates ------------------------------------------------------------------------------------------------------

/** Content rows alternate black and white every SCROLL_ROW; a boundary k is at 100 k and the blur of the square wave at y. */
function rowsValue(yContent: number, sigma: number): number {
  let value = 0;
  for (let boundary = 1; boundary <= 12; boundary += 1) {
    value += (boundary % 2 === 1 ? 1 : -1) * normalCdf((yContent - SCROLL_ROW * boundary) / sigma);
  }
  return value;
}

async function verifyLiveUpdates(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  const radius = 8;
  // A fixed frosted header over a list: scrolling the content under it changes the blur the next frame.
  api.showFilters({ scene: 'scroll', variant: 'header', radius });
  await settleFrames();
  const scroller = node(api, 'scroller').rect;
  const header = node(api, 'header').rect;
  const x = Math.round(scroller.x + scroller.width / 2);
  const before = api.snapshot().stats;
  const effectsBefore = api.activity().effects;
  // The probe stays three radii clear of the header's top and bottom, where the page beyond the list would be blurred in.
  const clear = 3 * radius + 6;
  for (const top of [0, 30, 40, 10, 0]) {
    api.scrollTo('scroller', top);
    await frames(2);
    const image = grab(owner);
    const ratio = pixelRatio(image, api);
    const edgeY = SCROLL_ROW - top + scroller.y;
    const from = header.y + clear;
    const to = header.y + header.height - clear;
    assert(edgeY - 3 * radius >= from && edgeY + 3 * radius <= to, `The row edge at ${edgeY} is inside the probe zone ${from}..${to}`);
    const column = columnProfile(image, x * ratio, from * ratio, to * ratio);
    const crossing = from * ratio + halfCrossing(column);
    assert(near(crossing, edgeY * ratio, 0.8), `Scrolled by ${top}, the row edge under the header is at ${edgeY}: found ${(crossing / ratio).toFixed(2)}`);
    assert(widthOk(width1090(column), radius * ratio), `and it is blurred by ${radius}px: ${width1090(column).toFixed(2)} wide`);
  }
  const after = api.snapshot().stats;
  const effectsAfter = api.activity().effects;
  for (const counter of ['batches', 'nodesUpdated', 'boxRecords', 'contentRecords'] as const) {
    assert(after[counter] === before[counter], `Scrolling under the header changes no ${counter}: ${before[counter]} -> ${after[counter]}`);
  }
  assert(effectsAfter.materialUpdates === effectsBefore.materialUpdates && effectsAfter.itemsCreated === effectsBefore.itemsCreated,
    `and writes no material parameter and creates no item: ${JSON.stringify(effectsBefore)} -> ${JSON.stringify(effectsAfter)}`);
  assert(effectsAfter.copyRectUpdates === effectsBefore.copyRectUpdates, 'The header did not move, so its copy rectangle is not rewritten');
  api.scrollTo('scroller', 60);
  await settleFrames();
  await capture('filters-scroll-header');

  // A frosted panel inside the list scrolls with it: its copy rectangle follows, and its edges are right.
  api.showFilters({ scene: 'scroll', variant: 'inside', radius });
  await settleFrames();
  const inner = node(api, 'inner-panel');
  assert(inner.effects?.backdrop?.region, 'The panel in the list has a copy rectangle');
  for (const top of [0, 37, 111, 5]) {
    const updatesBefore = api.activity().effects.copyRectUpdates;
    api.scrollTo('scroller', top);
    await frames(2);
    const image = grab(owner);
    const ratio = pixelRatio(image, api);
    const rect = node(api, 'inner-panel').rect;
    const innerX = Math.round((rect.x + rect.width / 2) * ratio);
    // Every row inside the panel, from just under its top to just above its bottom, matches the blurred square wave.
    let worst = 0;
    for (let y = rect.y + 4; y < rect.y + rect.height - 4; y += 7) {
      const yContent = y - scroller.y + top;
      worst = Math.max(worst, Math.abs(channelAt(image, innerX, y * ratio) - rowsValue(yContent, radius)));
    }
    assert(worst < 0.04, `With the list scrolled by ${top} the panel inside it shows the blurred rows (worst error ${worst.toFixed(3)})`);
    if (top !== 0) assert(api.activity().effects.copyRectUpdates > updatesBefore, `Scrolling by ${top} moved the panel's copy rectangle`);
  }
  await capture('filters-scroll-inside');

  await verifyMovingPanel(owner, api, capture, radius);
  await verifyMovingPanel(owner, api, capture, MOVING_LARGE_RADIUS);
}

/**
 * A panel whose `left` is stepped: the rectangle follows every position, the blur is where it should be wherever the
 * rectangle's edges fall on the level's texel grid, and nothing outside the panel is blurred.
 */
async function verifyMovingPanel(owner: Node, api: FiltersInspection, capture: FiltersCapture, radius: number): Promise<void> {
  const edge = api.snapshot().width / 2;
  // The profile reaches 1.6 radii each side of the edge: a 10 to 90 width needs 1.3, and the panel must still cover it.
  const reach = Math.min(Math.round(PROFILE_REACH_RADII * radius), MOVING_SIZE / 2 - MOVING_MARGIN);
  for (const delta of [-60, -20, 0, 25, 60]) {
    api.showFilters({ scene: 'scroll', variant: 'moving', radius, offset: edge - MOVING_SIZE / 2 + delta });
    await settleFrames();
    const image = grab(owner);
    const ratio = pixelRatio(image, api);
    const centre = Math.round(edge * ratio);
    const mid = Math.round((MOVING_TOP + MOVING_SIZE / 2) * ratio);
    const from = centre - Math.round(reach * ratio);
    const profile = rowProfile(image, mid, from, centre + Math.round(reach * ratio));
    assert(widthOk(width1090(profile), radius * ratio), `The panel moved by ${delta} blurs the edge by ${radius}px: ${width1090(profile).toFixed(2)} wide`);
    assert(near(from + halfCrossing(profile), centre, EDGE_POSITION_TOLERANCE_PX),
      `The panel moved by ${delta} keeps the edge where it is: found ${(from + halfCrossing(profile) - centre).toFixed(2)} px away`);
    assert(near(channelAt(image, centre - 3, (MOVING_TOP - 5) * ratio), 0, 0.02) && near(channelAt(image, centre + 3, (MOVING_TOP - 5) * ratio), 1, 0.02),
      'Above the panel the edge is still sharp');
  }
  await capture(`filters-moving-${radius}`);
}

/** The root itself moving, scaling, and the window's own content scale (device pixel ratio two). */
async function verifyRootTransforms(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  const radius = 8;
  const measureAt = async (label: string, expectSigma: (ratio: number) => number, centreFor: (ratio: number, width: number) => number, rowFor: (ratio: number) => number): Promise<void> => {
    api.showFilters({ scene: 'edge', target: 'backdrop', radius });
    await settleFrames();
    const image = grab(owner);
    const ratio = pixelRatio(image, api);
    const sigma = expectSigma(ratio);
    const centre = Math.round(centreFor(ratio, api.snapshot().width));
    const profile = rowProfile(image, rowFor(ratio), centre - 40, centre + 40);
    assert(widthOk(width1090(profile), sigma), `${label}: the blur is ${sigma.toFixed(1)} px: ${width1090(profile).toFixed(2)} wide`);
    assert(near(centre + halfCrossing(profile) - 40, centre, 0.8), `${label}: the edge is where it should be`);
  };
  const mid = (PANEL_TOP + PANEL_HEIGHT / 2);
  api.offsetSurface(50, 30);
  await measureAt('Root moved by (50, 30)', () => radius, (ratio, width) => 50 + width / 2 * ratio, ratio => (30 + mid) * ratio);
  api.offsetSurface(0, 0);
  api.scaleSurface(1.5);
  await measureAt('Root scaled by 1.5', () => radius * 1.5, (_ratio, width) => width / 2 * 1.5, () => mid * 1.5);
  api.scaleSurface(1);
  await settleFrames();
  const win = window(owner);
  win.contentScaleFactor = 2;
  await frames(4);
  await measureAt('Window content scale 2', ratio => radius * ratio, (ratio, width) => width / 2 * ratio, ratio => mid * ratio);
  const dpr2 = grab(owner);
  assert(dpr2.getWidth() / api.snapshot().width === 2, 'The render is at device pixel ratio two');
  for (const target of ['backdrop', 'filter'] as const) {
    for (const asked of [2, 4, 8, 12, 16, 24, 40]) {
      const measured = await measureEdge(owner, api, { scene: 'edge', target, radius: asked });
      if (measured === undefined) {
        // The window is 300 logical pixels wide here: a 40 px blur at twice the scale has no room for an edge profile.
        console.log('GODOT_REACT_FILTERS_SKIPPED', JSON.stringify({ target, radius: asked, scale: 2, reason: 'panel too narrow' }));
        continue;
      }
      checkEdge(`${target} blur ${asked}px at device pixel ratio two`, asked * 2, measured);
    }
    await measureEdge(owner, api, { scene: 'edge', target, radius: 12 });
    await capture(`filters-dpr2-edge-${target}`);
  }
  await verifyShape(owner, api, capture, 'filters-dpr2-shape');
  win.contentScaleFactor = 1;
  await frames(4);
}

// ---- Native state and transitions --------------------------------------------------------------------------------------

async function verifyNativeState(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  api.showFilters({ scene: 'native' });
  await settleFrames();
  const panel = node(api, 'hover-panel').rect;
  const card = node(api, 'filter-card').rect;
  const measure = (): { backdrop: number; card: number; swatch: number } => {
    const image = grab(owner);
    const centre = Math.round(api.snapshot().width / 2);
    const row = Math.round(panel.y + panel.height / 2);
    // The card's halves are black and #3b82f6 (g 0.51); the transition between them is blurred by `blur-sm`.
    const cardCentre = Math.round(card.x + card.width / 2);
    const cardRow = Math.round(card.y + card.height / 2);
    const swatch = channelAt(image, card.x + card.width * 0.75, cardRow, 'g');
    return {
      backdrop: width1090(rowProfile(image, row, centre - 60, centre + 60)),
      card: width1090(normalise(rowProfile(image, cardRow, cardCentre - 30, cardCentre + 30, 'g'), 0, swatch)),
      swatch,
    };
  };
  const rest = measure();
  assert(widthOk(rest.backdrop, 4), `At rest the panel's backdrop-blur-sm blurs by 4px: ${rest.backdrop.toFixed(2)} wide`);
  assert(widthOk(rest.card, 4), `and the card's blur-sm by 4px: ${rest.card.toFixed(2)} wide`);
  assert(near(rest.swatch, 0x82 / 255, 0.02), `The card's right half is #3b82f6: green ${rest.swatch.toFixed(3)}`);
  const statsBefore = api.snapshot().stats;
  const effectsBefore = api.activity().effects;

  hoverAt(centreOf(api, 'hover-panel'));
  await frames(4);
  const panelHover = measure();
  // hover:backdrop-brightness-110 multiplies the blurred ramp by 1.1 before it is clamped, which narrows its 10 to 90 width.
  assert(widthOk(panelHover.backdrop, 16, 1.1),
    `Hovering the panel makes it hover:backdrop-blur-lg (16px) with hover:backdrop-brightness-110: ${panelHover.backdrop.toFixed(2)} wide, expected ${(gainedWidthSigmas(1.1) * 16).toFixed(2)}`);
  hoverAt(centreOf(api, 'filter-card'));
  await frames(4);
  const cardHover = measure();
  assert(widthOk(cardHover.card, 4), `Hovering the card keeps its blur-sm (4px) and adds hover:brightness-110: ${cardHover.card.toFixed(2)} wide`);
  assert(near(cardHover.swatch, 0x82 / 255 * 1.1, 0.02), `and brightens its right half by 10%: green ${cardHover.swatch.toFixed(3)}`);
  hoverAt(new Vector2(2, 2));
  await frames(4);
  const restAgain = measure();
  assert(widthOk(restAgain.backdrop, 4) && near(restAgain.swatch, rest.swatch, 0.01), 'Leaving both puts them back');

  const statsAfter = api.snapshot().stats;
  const effectsAfter = api.activity().effects;
  assert(statsAfter.batches === statsBefore.batches && statsAfter.nodesUpdated === statsBefore.nodesUpdated,
    `Hover caused no React commit: ${statsBefore.batches} -> ${statsAfter.batches} commits`);
  assert(statsAfter.boxRecords === statsBefore.boxRecords, `and no box was re-recorded: ${statsBefore.boxRecords} -> ${statsAfter.boxRecords}`);
  assert(effectsAfter.itemsCreated === effectsBefore.itemsCreated && effectsAfter.materialsCreated === effectsBefore.materialsCreated,
    `and created no item or material: ${JSON.stringify(effectsBefore)} -> ${JSON.stringify(effectsAfter)}`);
  assert(effectsAfter.materialUpdates > effectsBefore.materialUpdates, 'It only wrote material parameters');
  await capture('filters-native-state');
}

async function verifyTransitions(owner: Node, api: FiltersInspection): Promise<void> {
  api.showFilters({ scene: 'native', variant: 'transition' });
  await settleFrames();
  const before = api.snapshot().stats;
  hoverAt(centreOf(api, 'hover-panel'));
  const sigmas: number[] = [];
  const brightness: number[] = [];
  const texts: string[] = [];
  hoverAt(centreOf(api, 'hover-panel'));
  // Sample while the 400 ms transition runs (and a little after).
  for (let step = 0; step < 16; step += 1) {
    await wait(40);
    const snapshot = api.snapshot();
    const plan = snapshot.nodes.find(candidate => candidate.id === node(api, 'hover-panel').id)?.effects?.backdrop?.plan;
    sigmas.push(plan?.achievedPx ?? 0);
    void owner;
    texts.push(snapshot.transitions.map(transition => `${transition.property}:${String(transition.current)}`).join(' '));
  }
  void brightness;
  const target = 24 * pixelRatio(grab(owner), api);
  assert(sigmas.every((value, index) => index === 0 || value >= (sigmas[index - 1] ?? 0) - 1e-3), `The blur grows monotonically: ${sigmas.map(v => v.toFixed(1)).join(', ')}`);
  assert(sigmas.some(value => value > 1 && value < target - 1), `Some samples are strictly between none and blur-xl: ${sigmas.map(v => v.toFixed(1)).join(', ')}`);
  assert(near(sigmas[sigmas.length - 1] ?? 0, target, 0.01), `and it ends exactly at blur-xl (${target}px): ${sigmas[sigmas.length - 1]}`);
  const after = api.snapshot().stats;
  assert(after.batches === before.batches && after.nodesUpdated === before.nodesUpdated, `The transition caused no React commit: ${before.batches} -> ${after.batches}`);
  void texts;

  // Per-function interpolation: the card's blur stays while its brightness goes from 1 to 1.1.
  hoverAt(new Vector2(2, 2));
  await wait(600);
  hoverAt(centreOf(api, 'filter-card'));
  const seen: string[] = [];
  for (let step = 0; step < 14; step += 1) {
    await wait(40);
    for (const transition of api.snapshot().transitions) {
      if (transition.property === 'filter') seen.push(String(transition.current));
    }
  }
  const middle = seen.find(text => /^blur\(4px\) brightness\(1\.0\d+\)$/u.test(text));
  assert(middle, `Mid-transition the filter is blur(4px) with a brightness between 1 and 1.1: ${seen.join(' | ')}`);
  await wait(500);
  hoverAt(new Vector2(2, 2));
  await wait(600);
}

// ---- A filter on a subtree ---------------------------------------------------------------------------------------------

const PAGE_GREY = [0x64 / 255, 0x74 / 255, 0x8b / 255] as const;

/** The CSS Filter Effects functions, written out from the specification, independent of the native matrices. */
function cssFunction(name: string, amount: number, colour: readonly [number, number, number]): [number, number, number] {
  const [r, g, b] = colour;
  const clamp = (value: number): number => Math.min(1, Math.max(0, value));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const mix = (from: number, to: number, weight: number): number => from + (to - from) * weight;
  switch (name) {
    case 'brightness': return [clamp(r * amount), clamp(g * amount), clamp(b * amount)];
    case 'contrast': return [clamp((r - 0.5) * amount + 0.5), clamp((g - 0.5) * amount + 0.5), clamp((b - 0.5) * amount + 0.5)];
    case 'invert': return [clamp(amount + (1 - 2 * amount) * r), clamp(amount + (1 - 2 * amount) * g), clamp(amount + (1 - 2 * amount) * b)];
    case 'grayscale': return [clamp(mix(r, luminance, amount)), clamp(mix(g, luminance, amount)), clamp(mix(b, luminance, amount))];
    case 'saturate': {
      const grey = 0.213 * r + 0.715 * g + 0.072 * b;
      return [clamp(grey + amount * (r - grey)), clamp(grey + amount * (g - grey)), clamp(grey + amount * (b - grey))];
    }
    case 'sepia': {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      return [clamp(mix(r, sr, amount)), clamp(mix(g, sg, amount)), clamp(mix(b, sb, amount))];
    }
    case 'hue-rotate': {
      const angle = amount * Math.PI / 180;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return [
        clamp((0.213 + c * 0.787 - s * 0.213) * r + (0.715 - c * 0.715 - s * 0.715) * g + (0.072 - c * 0.072 + s * 0.928) * b),
        clamp((0.213 - c * 0.213 + s * 0.143) * r + (0.715 + c * 0.285 + s * 0.140) * g + (0.072 - c * 0.072 - s * 0.283) * b),
        clamp((0.213 - c * 0.213 - s * 0.787) * r + (0.715 - c * 0.715 + s * 0.715) * g + (0.072 + c * 0.928 + s * 0.072) * b),
      ];
    }
    default: throw new Error(`No reference for ${name}`);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
}

/** A list of CSS functions applied in order to a colour, each result clamped, as a browser does. */
function cssList(list: string, colour: readonly [number, number, number]): { rgb: [number, number, number]; alpha: number } {
  let rgb: [number, number, number] = [colour[0], colour[1], colour[2]];
  let alpha = 1;
  for (const match of list.matchAll(/([a-z-]+)\(([^)]*)\)/gu)) {
    const name = match[1];
    const argument = match[2];
    if (name === undefined || argument === undefined) continue;
    if (name === 'opacity') {
      alpha *= Number(argument);
      continue;
    }
    rgb = cssFunction(name, Number(argument.replace('deg', '')), rgb);
  }
  return { rgb, alpha };
}

const COLOUR_LISTS = [
  'none', 'brightness(0.6)', 'brightness(1.2)', 'contrast(0.6)', 'contrast(1.4)', 'grayscale(1)', 'grayscale(0.4)', 'hue-rotate(60deg)',
  'hue-rotate(180deg)', 'invert(1)', 'invert(0.3)', 'opacity(0.5)', 'saturate(0.5)', 'saturate(1.8)', 'sepia(1)', 'sepia(0.5)',
  'brightness(0.8) saturate(1.3)', 'invert(0.2) sepia(0.3)',
] as const;
/** A colour channel may differ from the reference by this much (five 8-bit steps): the matrix is exact, the raster is 8-bit. */
const COLOUR_TOLERANCE = 0.02;

async function verifyColourFunctions(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  for (const target of ['filter', 'backdrop'] as const) {
    api.showFilters({ scene: 'colour', target, values: COLOUR_LISTS });
    await settleFrames();
    const image = grab(owner);
    const ratio = pixelRatio(image, api);
    for (const [index, list] of COLOUR_LISTS.entries()) {
      const { rect } = node(api, `colour-${index}`);
      assert(rect.width === COLOUR_CELL, `Cell ${index} is laid out`);
      for (const [swatch, hex] of SWATCH_COLOURS.entries()) {
        const x = (rect.x + (swatch % 2 === 0 ? COLOUR_CELL / 4 : COLOUR_CELL * 3 / 4)) * ratio;
        const y = (rect.y + (swatch < 2 ? COLOUR_CELL / 4 : COLOUR_CELL * 3 / 4)) * ratio;
        const painted = image.getPixel(Math.floor(x), Math.floor(y));
        const { rgb, alpha } = cssList(list, hexToRgb(hex));
        // A `filter` composites its result, with the opacity() factor, over the page; a backdrop-filter replaces what is behind
        // the element by the filtered picture and blends by alpha over the unfiltered backdrop (so opacity() leaves it).
        const under = target === 'filter' ? PAGE_GREY : hexToRgb(hex);
        const expected = rgb.map((channel, i) => channel * alpha + (under[i] ?? 0) * (1 - alpha));
        const actual = [painted.r, painted.g, painted.b];
        const worst = Math.max(...expected.map((value, i) => Math.abs(value - (actual[i] ?? 0))));
        assert(worst <= COLOUR_TOLERANCE,
          `${target} ${list} on ${hex}: expected ${expected.map(v => v.toFixed(3)).join(',')} got ${actual.map(v => v.toFixed(3)).join(',')}`);
      }
    }
    await capture(`filters-colour-${target}`);
  }
}

async function verifySubtree(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  // Blur reaches outside the box.
  api.showFilters({ scene: 'edge', target: 'filter', radius: 16 });
  await settleFrames();
  let image = grab(owner);
  let ratio = pixelRatio(image, api);
  const panel = node(api, 'panel').rect;
  const blackX = (panel.x + panel.width * 0.25) * ratio;
  const halo = channelAt(image, blackX, (panel.y - 4) * ratio);
  assert(halo < PAGE_GREY[0] - 0.05, `The panel's blurred black half reaches above its box, darkening the page by ${(PAGE_GREY[0] - halo).toFixed(3)}`);
  assert(near(channelAt(image, blackX, (panel.y - 70) * ratio), PAGE_GREY[0], 0.01), 'and far above it (beyond three radii) the page is untouched');

  // An ancestor that clips still clips the blur.
  api.showFilters({ scene: 'clip', radius: 16 });
  await settleFrames();
  image = grab(owner);
  ratio = pixelRatio(image, api);
  const clipper = node(api, 'clipper').rect;
  const clipped = node(api, 'clipped').rect;
  const midRow = (clipped.y + clipped.height / 2) * ratio;
  const insideHalo = channelAt(image, (clipper.x + clipper.width - 2) * ratio, midRow);
  assert(insideHalo < PAGE_GREY[0] - 0.04, `The blur reaches the clipping ancestor's edge from inside: ${insideHalo.toFixed(3)} against the page's ${PAGE_GREY[0].toFixed(3)}`);
  await capture('filters-clip');
  const beyond = channelAt(image, (clipper.x + clipper.width + 3) * ratio, midRow);
  assert(near(beyond, PAGE_GREY[0], 0.01), `and the ancestor clips it: beyond the edge the page is untouched: ${beyond.toFixed(3)} against ${PAGE_GREY[0].toFixed(3)}, clipper ${JSON.stringify(clipper)}`);

  // Opacity applies once: under an ancestor at 50 % the blurred white box is as bright as a plain one.
  api.showFilters({ scene: 'opacity', radius: 4 });
  await settleFrames();
  image = grab(owner);
  ratio = pixelRatio(image, api);
  const blurred = channelAt(image, centreOf(api, 'blurred').x * ratio, centreOf(api, 'blurred').y * ratio);
  const plain = channelAt(image, (node(api, 'plain').rect.x + 130) * ratio, (node(api, 'plain').rect.y + 150) * ratio);
  assert(near(plain, 0.5, 0.01), `The plain white box under opacity 0.5 over black is 0.5: ${plain}`);
  assert(near(blurred, plain, 0.01), `The blurred one is the same, the opacity applied once (twice would be 0.25): ${blurred}`);
  await capture('filters-opacity');
}

async function verifyDropShadow(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  // The hard shadow's cell is last, so nothing's halo is in the way of its probes.
  const values = ['drop-shadow(0px 0px 8px #000000)', 'blur(2px) drop-shadow(6px 0px 4px #ff0000) invert(0)', 'drop-shadow(6px 6px 0px #000000)'];
  api.showFilters({ scene: 'colour', target: 'filter', values });
  await settleFrames();
  const image = grab(owner);
  const ratio = pixelRatio(image, api);
  await capture('filters-drop-shadow');
  const hard = node(api, 'colour-2').rect;
  const rightOfCard = channelAt(image, (hard.x + hard.width + 3) * ratio, (hard.y + 20) * ratio);
  assert(near(rightOfCard, 0, 0.02), `A hard drop-shadow(6px 6px) is black 3px right of the card: ${rightOfCard.toFixed(3)}`);
  const past = channelAt(image, (hard.x + hard.width + 9) * ratio, (hard.y + 20) * ratio);
  assert(near(past, PAGE_GREY[0], 0.01), `and ends 6px from it: ${past.toFixed(3)} against ${PAGE_GREY[0].toFixed(3)} at ${hard.x + hard.width + 9},${hard.y + 20}`);
  assert(near(channelAt(image, (hard.x + 20) * ratio, (hard.y + hard.height + 3) * ratio), 0, 0.02), 'Below the card too');
  assert(near(channelAt(image, (hard.x + 20) * ratio, (hard.y - 3) * ratio), PAGE_GREY[0], 0.01), 'and not above it');
  const soft = node(api, 'colour-0').rect;
  const soft3 = channelAt(image, (soft.x - 3) * ratio, (soft.y + 28) * ratio);
  assert(soft3 < PAGE_GREY[0] - 0.1 && soft3 > 0.02, `A blurred shadow is a soft dark halo around the card: ${soft3.toFixed(3)}`);
  const red = node(api, 'colour-1').rect;
  const redShadow = image.getPixel(Math.floor((red.x + red.width + 5) * ratio), Math.floor((red.y + 28) * ratio));
  assert(redShadow.r > PAGE_GREY[0] + 0.05 && redShadow.g < PAGE_GREY[1] - 0.02, `A red shadow after a blur reddens the page beside the card: ${redShadow.toHtml(false)}`);
}

// ---- A filter inside a filter, and a backdrop inside one, cannot be drawn: one error each -------------------------------

async function verifyNesting(api: FiltersInspection, announceError = true): Promise<void> {
  for (const variant of ['filter-in-filter', 'backdrop-in-filter'] as const) {
    api.showFilters({ scene: 'edge', radius: 0 });
    await settleFrames();
    if (announceError) console.log('GODOT_REACT_EXPECT_ERROR which has a filter');
    api.showFilters({ scene: 'nested', variant });
    await frames(6);
    const inner = node(api, 'inner');
    const outer = node(api, 'outer');
    assert(outer.effects?.filter, 'The outer filter is drawn');
    assert(inner.effects === null, `The ${variant === 'filter-in-filter' ? 'inner filter' : 'backdrop-filter'} inside it is not drawn`);
  }
  api.showFilters({ scene: 'edge', radius: 0 });
  await settleFrames();
}

// ---- Selected text stays readable over the blur -------------------------------------------------------------------------

async function verifyTextOverBlur(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  api.showFilters({ scene: 'text', radius: 12 });
  await settleFrames();
  const text = node(api, 'panel-text').rect;
  const y = text.y + 20;
  const press = (at: Vector2, pressed: boolean): void => {
    const event = new InputEventMouseButton();
    event.position = at;
    event.globalPosition = at;
    event.buttonIndex = MouseButton.MouseButtonLeft;
    event.pressed = pressed;
    parseVerifierEvent(event);
  };
  const tinted = (): number => {
    const image = grab(owner);
    let count = 0;
    for (let x = Math.floor(text.x + 16); x < Math.floor(text.x + 300); x += 2) {
      const pixel = image.getPixel(x, Math.floor(y));
      if (pixel.b - pixel.r > 0.08) count += 1;
    }
    return count;
  };
  const before = tinted();
  hoverAt(new Vector2(text.x + 16, y));
  press(new Vector2(text.x + 16, y), true);
  hoverAt(new Vector2(text.x + 300, y));
  press(new Vector2(text.x + 300, y), false);
  await frames(4);
  const after = tinted();
  assert(after > before + 20, `The selection highlight is drawn over the frosted panel: ${before} -> ${after} tinted pixels on the text line`);
  await capture('filters-text-selection');
  hoverAt(new Vector2(2, 2));
}

export async function verifyFilters(owner: Node, api: FiltersInspection, capture: FiltersCapture): Promise<void> {
  // The section's fixtures are read at rest: the pointer an earlier section left (the portrait window put it over the native-state card) is moved off them.
  hoverAt(new Vector2(2, 2));
  await settleFrames();
  const fresh = api.activity().effects;
  assert(fresh.itemsCreated === 0 && fresh.materialsCreated === 0 && fresh.shadersCreated === 0 && !fresh.primer,
    `A tree that has used no filter has made no item, material or shader: ${JSON.stringify(fresh)}`);
  await verifyNothingWhenUnused(api);
  await verifyBlurAccuracy(owner, api, capture);
  await verifyRadiusSweep(owner, api);
  await verifyShape(owner, api, capture);
  await verifyStacking(owner, api, capture);
  await verifyUnderneath(owner, api, capture);
  await verifyLiveUpdates(owner, api, capture);
  await verifyRootTransforms(owner, api, capture);
  await verifyNativeState(owner, api, capture);
  await verifyTransitions(owner, api);
  await verifySubtree(owner, api, capture);
  await verifyColourFunctions(owner, api, capture);
  await verifyDropShadow(owner, api, capture);
  await verifyNesting(api);
  await verifyTextOverBlur(owner, api, capture);
}

// ---- Cost (opt-in: `--only=filters-cost`) -------------------------------------------------------------------------------

/** Frames drawn per sample, and samples per cell (the median is reported: a frame's time wanders by about a millisecond). */
const COST_FRAMES = 20;
const COST_SAMPLES = 5;
/** Panel sizes in CSS pixels, and radii. */
const COST_SIZES: readonly (readonly [number, number])[] = [[200, 150], [400, 300], [800, 600], [1100, 780]];
const COST_RADII = [4, 16, 64] as const;
const MICROSECONDS_PER_MILLISECOND = 1000;

/** Milliseconds per frame, the median of `COST_SAMPLES` runs of `COST_FRAMES` forced draws that each end in a read-back (which waits for the GPU). */
function frameMilliseconds(owner: Node): number {
  const samples: number[] = [];
  for (let sample = 0; sample < COST_SAMPLES; sample += 1) {
    const started = Time.getTicksUsec();
    for (let index = 0; index < COST_FRAMES; index += 1) RenderingServer.forceDraw();
    grab(owner).getWidth();
    samples.push((Time.getTicksUsec() - started) / MICROSECONDS_PER_MILLISECOND / COST_FRAMES);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] ?? 0;
}

/** The viewport's own GPU time in milliseconds (zero where the renderer does not report it): the median of several frames. */
function gpuMilliseconds(owner: Node, rid: Rid): number {
  const samples: number[] = [];
  for (let index = 0; index < COST_SAMPLES * 2; index += 1) {
    RenderingServer.forceDraw();
    samples.push(RenderingServer.viewportGetMeasuredRenderTimeGpu(rid));
  }
  void owner;
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] ?? 0;
}

/**
 * What a frosted panel and a blurred element cost per frame, by size and radius: the extra milliseconds per frame over the same
 * scene without the effect, measured as wall time over forced draws that end in a read-back (so the GPU's time is in it), and, where
 * the renderer reports it (RenderingDevice), the viewport's own GPU time. The first use of each shader is timed separately: it is the
 * hitch a player sees when the first frosted panel opens.
 */
export async function measureFilterCost(owner: Node, api: FiltersInspection): Promise<void> {
  const viewport = owner.getViewport();
  assert(viewport, 'The demo has its viewport');
  const rid = viewport.getViewportRid();
  RenderingServer.viewportSetMeasureRenderTime(rid, true);
  // With vsync a frame takes a display refresh whatever it costs (8.3 ms at 120 Hz), which hides everything cheaper.
  const vsync = DisplayServer.windowGetVsyncMode();
  DisplayServer.windowSetVsyncMode(DisplayServer.VSyncMode.VsyncDisabled);
  const ratio = (): number => pixelRatio(grab(owner), api);
  const results: unknown[] = [];
  const first: Record<string, { warmUpMs: number; firstPanelAfterMs: number }> = {};
  for (const target of ['backdrop', 'filter'] as const) {
    // A 1 x 1 element of the kind compiles its shader and pipeline, as an app could while it loads; the first real panel after
    // it shows what is left.
    const warmStarted = Time.getTicksUsec();
    api.showFilters({ scene: 'cost', panels: 1, width: 1, height: 1, radius: 8, target });
    await frames(1);
    RenderingServer.forceDraw();
    grab(owner).getWidth();
    const warmUpMs = (Time.getTicksUsec() - warmStarted) / MICROSECONDS_PER_MILLISECOND;
    for (const [width, height] of COST_SIZES) {
      for (const radius of COST_RADII) {
        api.showFilters({ scene: 'cost', panels: 0, width, height, radius, target });
        await frames(3);
        const baseline = frameMilliseconds(owner);
        const gpuBaseline = gpuMilliseconds(owner, rid);
        const started = Time.getTicksUsec();
        api.showFilters({ scene: 'cost', panels: 1, width, height, radius, target });
        await frames(1);
        RenderingServer.forceDraw();
        grab(owner).getWidth();
        const firstFrame = (Time.getTicksUsec() - started) / MICROSECONDS_PER_MILLISECOND;
        if (first[target] === undefined) first[target] = { warmUpMs: Number(warmUpMs.toFixed(1)), firstPanelAfterMs: Number(firstFrame.toFixed(1)) };
        await frames(3);
        const withPanel = frameMilliseconds(owner);
        const gpu = gpuMilliseconds(owner, rid);
        const plan = (target === 'backdrop' ? node(api, 'cost-0').effects?.backdrop : node(api, 'cost-0').effects?.filter)?.plan;
        results.push({
          target, width, height, radius, pixelRatio: ratio(), extraMs: Number((withPanel - baseline).toFixed(3)),
          baselineMs: Number(baseline.toFixed(3)), gpuMs: Number(gpu.toFixed(3)), gpuExtraMs: Number((gpu - gpuBaseline).toFixed(3)),
          level: plan?.level, pairs: plan?.pairs,
        });
      }
    }
  }
  // How panels add: four of the middle size at the middle radius.
  for (const target of ['backdrop', 'filter'] as const) {
    api.showFilters({ scene: 'cost', panels: 0, width: 400, height: 300, radius: 16, target });
    await frames(3);
    const baseline = frameMilliseconds(owner);
    api.showFilters({ scene: 'cost', panels: 4, width: 400, height: 300, radius: 16, target });
    await frames(4);
    results.push({ target, panels: 4, width: 400, height: 300, radius: 16, extraMs: Number((frameMilliseconds(owner) - baseline).toFixed(3)) });
  }
  assert(results.length > 0, 'The cost cells were measured');
  console.log('GODOT_REACT_FILTERS_COST', JSON.stringify({ renderer: RenderingServer.getCurrentRenderingMethod(), firstUseMs: first, results }));
  DisplayServer.windowSetVsyncMode(vsync);
  api.showFilters({ scene: 'edge', radius: 0 });
}

// ---- Negative controls (opt-in: `--only=filters-faults`, needs `pnpm build:native --faults`) ------------------------------

/** The environment variable native/filter_faults.rs reads. */
const FAULT_ENV = 'GODOT_REACT_FILTER_FAULT';
/** The blur levels a Compatibility target of this size has (`native/blur.rs` `max_level`) bound the largest texel, 2^4. */
const LARGEST_TEXEL_PX = 16;

/**
 * One regression guard: `run` is the check that guards a fix, `fault` names the fault that takes the fix out
 * (native/filter_faults.rs) and `fails` matches the assertion that must then fail (not some other one).
 */
export interface FaultControl {
  fault: string;
  guards: string;
  /** `faultOn` is for a check that provokes an error on purpose: with the fault on, the error is not raised. */
  run(owner: Node, api: FiltersInspection & GlassInspection, capture: FiltersCapture, faultOn: boolean): Promise<void>;
  fails: RegExp;
  /** Nodes the control's page lets reach past the window, for the capture of its broken picture. */
  overflowing?: readonly string[];
  /** Why the fault cannot show on this window or renderer, when it cannot. */
  notApplicable?(owner: Node, api: FiltersInspection & GlassInspection): string | undefined;
}

const FAULT_CONTROLS: readonly FaultControl[] = [
  {
    fault: 'merged-copy', guards: 'a panel over another blurs the other\'s blur (D40 b: separate copy item)',
    run: verifyStacking, fails: /Where B is over A it blurs A's blur/u,
  },
  {
    fault: 'no-primer', guards: 'a filter group can read its mip levels on Compatibility (primer)',
    run: verifyBlurAccuracy, fails: /filter blur \d+px/u,
    notApplicable: () => RenderingServer.getCurrentRenderingMethod() === 'gl_compatibility' ? undefined : 'the primer is for the Compatibility renderer only',
  },
  {
    fault: 'stale-rects', guards: 'copy and group rectangles follow a moving or scrolling element',
    run: verifyLiveUpdates, fails: /shows the blurred rows|copy rectangle|The panel moved by/u,
  },
  {
    fault: 'fit-empty-group', guards: 'an ancestor\'s clip still cuts a filter group\'s composite',
    run: verifySubtree, fails: /the ancestor clips it/u,
  },
  {
    fault: 'textbook-chain', guards: 'texels are placed by the engine\'s own region halving (targets that are not a power of two)',
    run: verifyBlurAccuracy, fails: /backdrop blur \d+px/u,
    notApplicable: (_owner, api) => {
      const { width, height } = api.snapshot();
      return width % LARGEST_TEXEL_PX === 0 && height % LARGEST_TEXEL_PX === 0
        ? `a ${width} x ${height} target halves exactly at every level it keeps; run the section on a portrait window` : undefined;
    },
  },
  {
    fault: 'no-nesting-check', guards: 'a filter inside a filter is reported and not drawn',
    run: (_owner, api, _capture, faultOn) => verifyNesting(api, !faultOn), fails: /is not drawn/u,
  },
  {
    fault: 'double-modulate', guards: 'an ancestor\'s opacity applies once to a filtered element',
    run: verifySubtree, fails: /the opacity applied once/u,
  },
  {
    fault: 'shadow-box-only', guards: 'a drop-shadow is drawn beyond the element\'s box',
    run: verifyDropShadow, fails: /A hard drop-shadow\(6px 6px\)/u,
  },
];

/** Positions of the moving panel the alignment residual is read at: every 3 px, so every phase of a 16 px texel is met. */
const RESIDUAL_FIRST_DELTA = -60;
const RESIDUAL_DELTA_STEP = 3;
const RESIDUAL_POSITIONS = 41;
const RESIDUAL_RADII = [16, 24] as const;
/** The residual shift an unaligned copy region may leave: the model's own accuracy is 0.1 px, the measured worst 0.125 px. */
const ALIGNMENT_RESIDUAL_PX = 0.25;

interface AlignmentResidual {
  /** The largest distance of the blurred edge's half crossing from the sharp edge, in physical pixels. */
  shift: number;
  /** The largest relative error of the 10 to 90 width against a Gaussian of the radius. */
  widthError: number;
}

async function measureAlignmentResidual(owner: Node, api: FiltersInspection): Promise<AlignmentResidual> {
  const worst: AlignmentResidual = { shift: 0, widthError: 0 };
  for (const radius of RESIDUAL_RADII) {
    for (let index = 0; index < RESIDUAL_POSITIONS; index += 1) {
      const delta = RESIDUAL_FIRST_DELTA + index * RESIDUAL_DELTA_STEP;
      api.showFilters({ scene: 'scroll', variant: 'moving', radius, offset: api.snapshot().width / 2 - MOVING_SIZE / 2 + delta });
      await settleFrames();
      const image = grab(owner);
      const ratio = pixelRatio(image, api);
      const centre = Math.round(api.snapshot().width / 2 * ratio);
      const reach = Math.round(Math.min(PROFILE_REACH_RADII * radius, MOVING_SIZE / 2 - MOVING_MARGIN) * ratio);
      const profile = rowProfile(image, Math.round((MOVING_TOP + MOVING_SIZE / 2) * ratio), centre - reach, centre + reach);
      worst.shift = Math.max(worst.shift, Math.abs(centre - reach + halfCrossing(profile) - centre));
      worst.widthError = Math.max(worst.widthError, Math.abs(width1090(profile) / (WIDTH_10_90_SIGMAS * radius * ratio) - 1));
    }
  }
  return worst;
}

/**
 * Not a regression guard: since the shader places the level's texels by the region's own origin (`chain_map`), aligning
 * the copy region to the texel grid is no longer what keeps the blur in place. The fault shows what is left without it: a
 * residual inside the tolerances, and the aligned region's own residual for comparison.
 */
async function verifyUnalignedRegionIsTolerated(owner: Node, api: FiltersInspection): Promise<void> {
  OS.unsetEnvironment(FAULT_ENV);
  const aligned = await measureAlignmentResidual(owner, api);
  OS.setEnvironment(FAULT_ENV, 'unaligned-region');
  api.showFilters({ scene: 'edge', radius: 0 });
  await settleFrames();
  const unaligned = await measureAlignmentResidual(owner, api);
  OS.unsetEnvironment(FAULT_ENV);
  console.log('GODOT_REACT_FILTERS_ALIGNMENT', JSON.stringify({ aligned, unaligned }));
  assert(unaligned.shift <= ALIGNMENT_RESIDUAL_PX && unaligned.widthError <= WIDTH_TOLERANCE,
    `Without aligning the copy region the blur is still in place: shift ${unaligned.shift.toFixed(3)} px (limit ${ALIGNMENT_RESIDUAL_PX}), width error ${unaligned.widthError.toFixed(4)} (limit ${WIDTH_TOLERANCE})`);
}

/**
 * Every control twice in one process: once with its fault off, which must pass (the check is sound here), then with it
 * on, which must fail with the control's own message. The faults are switched with `OS.setEnvironment`; effects are
 * cleared between runs (a radius of zero makes none) so each starts with fresh items, materials and shaders.
 */
export async function verifyFilterFaults(owner: Node, api: FiltersInspection & GlassInspection, capture: FiltersCapture, more: readonly FaultControl[] = []): Promise<void> {
  const silent: FiltersCapture = async () => {};
  const reset = async (): Promise<void> => {
    api.showFilters({ scene: 'edge', radius: 0 });
    await settleFrames();
  };
  // Every control is run and every one that does not behave is listed, so one window says which are missing.
  const problems: string[] = [];
  let controlled = 0;
  try {
    for (const control of [...FAULT_CONTROLS, ...more]) {
      const reason = control.notApplicable?.(owner, api);
      if (reason !== undefined) {
        console.log('GODOT_REACT_FILTERS_FAULT_SKIPPED', JSON.stringify({ fault: control.fault, reason }));
        continue;
      }
      OS.unsetEnvironment(FAULT_ENV);
      await reset();
      try {
        await control.run(owner, api, silent, false);
      } catch (error) {
        problems.push(`Without the fault, the check for "${control.guards}" fails: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      OS.setEnvironment(FAULT_ENV, control.fault);
      await reset();
      let failure: unknown;
      try {
        await control.run(owner, api, silent, true);
      } catch (error) {
        failure = error;
      }
      await capture(`filters-fault-${control.fault}`, control.overflowing);
      OS.unsetEnvironment(FAULT_ENV);
      if (failure === undefined) {
        problems.push(`With the fault "${control.fault}" on, the check for "${control.guards}" still passes (is the installed library a --faults build?)`);
        continue;
      }
      const message = failure instanceof Error ? failure.message : String(failure);
      if (!control.fails.test(message)) {
        problems.push(`With the fault "${control.fault}" on, the check for "${control.guards}" fails for another reason: ${message}`);
        continue;
      }
      console.log('GODOT_REACT_FILTERS_FAULT', JSON.stringify({ fault: control.fault, guards: control.guards, failure: message.slice(0, 240) }));
      controlled += 1;
    }
  } finally {
    OS.unsetEnvironment(FAULT_ENV);
  }
  await verifyUnalignedRegionIsTolerated(owner, api);
  await reset();
  assert(problems.length === 0, `${problems.length} negative control(s) did not hold:\n${problems.join('\n')}`);
  assert(controlled > 0, 'At least one fault was exercised');
}
