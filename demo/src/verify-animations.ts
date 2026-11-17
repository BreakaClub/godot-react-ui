import { DisplayServer, Engine, Image as GodotImage, RenderingServer, Time, Vector2, type Node, type Rid, type Window } from 'godot';
import type { NativeActivity, NativeProfile, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import { GLIMMER, GLIMMER_TURN_MS, clipStripePresses, setAnimationsPlaying, type AnimationCostProps } from './animation-lab';
import type { LabName } from './labs';
import { assertionTally } from './verifier-input';
import { grab } from './verify-filters';
import { click } from './verify-text-input';

/**
 * The `animations` section of the interaction verifier: the keyframe animations lab (`animation-lab.tsx`). What it holds the library to:
 *
 * - a keyframe animation runs on the native clock (a spin turns by the clock's own milliseconds, a steps() animation holds its quarter
 *   turns), repeats, and a paused one holds still;
 * - animations of transform and opacity run with no commit, no layout pass, no restyle and no re-record; with every animation paused or
 *   removed nothing asks for frames;
 * - the root leaving the scene tree stops the clock, and coming back resumes it where it was;
 * - a rounded `overflow-hidden` clips its children to the rounded padding box, in the pixels and for the pointer, drawn as a mask, and the
 *   glimmer composition shows its light only in the ring.
 *
 * The same code runs natively and in the Web page (`godotReactVerifyAnimations`); Chrome's own values for the keyframes are held by the
 * native unit tests (`native/style_engine.rs`, `scripts/animation-golden.json`).
 */
export interface AnimationsInspection {
  showLab(name: LabName): void;
  find(testID: string): NativeSnapshotNode | undefined;
  snapshot(): NativeSnapshot;
  activity(): NativeActivity;
  surfaceAttached(attached: boolean): void;
}

export type AnimationsCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

/** What leaves its parent's box by design: the light is a square larger than the button that clips it, and a ping grows to twice its size. */
const OVERFLOWING = ['glimmer-light', 'anim-ping', 'anim-spin', 'anim-steps', 'anim-bounce', 'anim-glow'];

const FRAME_POLL_MS = 10;
const SETTLE_FRAMES = 6;
/** Frames the cost reading spans, and the frames a paused or detached root is watched for. */
const COST_FRAMES = 30;
const IDLE_FRAMES = 12;
/** Wall time the root is kept out of the tree. */
const DETACHED_MS = 400;
const LEVELS = 255;
const DEGREES_PER_TURN = 360;
const SPIN_TURN_MS = 1000;
const STEPS_PER_TURN = 4;
/** Degrees a sampled rotation may be from the clock's: the matrix's six floats and one f32 clock step. */
const ANGLE_TOLERANCE = 0.5;
/** A frame as long as a starved host makes one (the verifiers' windows run at the display's rate otherwise). */
const LONGEST_FRAME_MS = 100;
/** How far a probe may be from a flat colour: the render target's rounding and the edge's antialiasing kept away from. */
const SAME_LEVELS = 4;

type Rgb = readonly [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const SLATE_800: Rgb = [30, 41, 59];
const ORANGE_500: Rgb = [249, 115, 22];

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

async function wallTime(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function windowOf(owner: Node): Window {
  const found = owner.getWindow();
  assert(found, 'The demo has its window');
  return found;
}

interface Shot {
  readonly image: GodotImage;
  readonly ratio: number;
}

function shoot(owner: Node): Shot {
  return { image: grab(owner), ratio: windowOf(owner).contentScaleFactor };
}

function pixel(shot: Shot, x: number, y: number): Rgb {
  const colour = shot.image.getPixel(Math.floor(x * shot.ratio), Math.floor(y * shot.ratio));
  return [Math.round(colour.r * LEVELS), Math.round(colour.g * LEVELS), Math.round(colour.b * LEVELS)];
}

function apart(a: Rgb, b: Rgb): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function name(colour: Rgb): string {
  return `rgb(${colour.join(', ')})`;
}

/** The rotation of a node's matrix, in degrees from 0 to 360 (0 for none: a turn that is an identity has no transform). */
function rotationOf(node: NativeSnapshotNode): number {
  if (node.transform === null) return 0;
  const [a, b] = node.transform;
  return ((Math.atan2(b, a) * 180) / Math.PI + DEGREES_PER_TURN) % DEGREES_PER_TURN;
}

/** The difference of two angles, from -180 to 180. */
function turnBetween(from: number, to: number): number {
  return ((to - from + DEGREES_PER_TURN * 1.5) % DEGREES_PER_TURN) - DEGREES_PER_TURN / 2;
}

export async function verifyAnimations(owner: Node, api: AnimationsInspection, capture: AnimationsCapture): Promise<Record<string, unknown>> {
  const facts: Record<string, unknown> = {};
  const node = (testID: string): NativeSnapshotNode => {
    const found = api.find(testID);
    assert(found, `The animations lab has ${testID}`);
    return found;
  };
  setAnimationsPlaying(true);
  api.showLab('animations');
  await frames(SETTLE_FRAMES);
  const root = api.snapshot();
  for (const testID of ['glimmer', 'clip-card', 'anim-spin', 'anim-steps']) {
    const rect = node(testID).rect;
    assert(rect.y + rect.height <= root.height && rect.x + rect.width <= root.width, `${testID} is in the window: ${JSON.stringify(rect)} in ${root.width} x ${root.height}`);
  }
  const running = api.activity();
  assert(running.animating, 'A page with running keyframe animations animates');
  assert(running.keyframes >= 1, `and its keyframes are registered natively: ${running.keyframes}`);
  facts.keyframes = running.keyframes;

  // A linear spin turns by the clock: 360 degrees a second of the native clock, whatever the frame rate.
  const spinAt = (): { angle: number; clockMs: number } => ({ angle: rotationOf(node('anim-spin')), clockMs: api.activity().clockMs });
  const first = spinAt();
  await frames(3);
  const second = spinAt();
  const expected = (((second.clockMs - first.clockMs) / SPIN_TURN_MS) * DEGREES_PER_TURN) % DEGREES_PER_TURN;
  const turned = (turnBetween(first.angle, second.angle) + DEGREES_PER_TURN) % DEGREES_PER_TURN;
  assert(second.clockMs > first.clockMs, `The native clock runs: ${first.clockMs} -> ${second.clockMs}`);
  assert(Math.abs(turnBetween(expected, turned)) <= ANGLE_TOLERANCE,
    `animate-spin turns by the clock: ${turned.toFixed(3)} degrees in ${(second.clockMs - first.clockMs).toFixed(2)} ms, expected ${expected.toFixed(3)}`);
  // steps(4): always a whole quarter turn.
  const steps = rotationOf(node('anim-steps'));
  assert(Math.abs(turnBetween(Math.round(steps / (DEGREES_PER_TURN / STEPS_PER_TURN)) * (DEGREES_PER_TURN / STEPS_PER_TURN), steps)) <= ANGLE_TOLERANCE,
    `steps(4) holds a quarter turn: ${steps.toFixed(3)} degrees`);
  await capture('animations-running', OVERFLOWING);

  // The rounded clips are masks, and the glimmer's light shows only in the ring.
  assert(node('glimmer').roundedClip === 'mask', `The glimmer's rounded clip is drawn as a mask: ${String(node('glimmer').roundedClip)}`);
  assert(node('clip-card').roundedClip === 'mask', `and the clipping card's: ${String(node('clip-card').roundedClip)}`);
  assert(node('glimmer-panel').roundedClip === null, 'A rounded box that clips nothing has no clip');
  setAnimationsPlaying(false);
  await frames(SETTLE_FRAMES);
  const shot = shoot(owner);
  const card = node('clip-card').rect;
  const background = pixel(shot, card.x - 6, card.y + card.height / 2);
  assert(apart(background, WHITE) <= SAME_LEVELS, `The clipping card sits on white: ${name(background)}`);
  // rounded-3xl (24) and border-4: (9, 9) from the corner is inside the padding box's rectangle and outside its curve (radius 20 about (24, 24)),
  // so it is the border: a rectangular clip would show the stripe there.
  const corner = pixel(shot, card.x + 9, card.y + 9);
  assert(apart(corner, SLATE_800) <= SAME_LEVELS, `A rounded clip keeps the stripes out of its corner: ${name(corner)} at (9, 9), the border is ${name(SLATE_800)}`);
  const inside = pixel(shot, card.x + 20, card.y + card.height / 2);
  assert(apart(inside, ORANGE_500) <= SAME_LEVELS, `and shows them inside: ${name(inside)}`);
  const outerCorner = pixel(shot, card.x + 1, card.y + 1);
  assert(apart(outerCorner, WHITE) <= SAME_LEVELS, `and the corner of the card itself is round: ${name(outerCorner)}`);
  facts.clipProbes = { corner, inside, outerCorner };
  // The pointer: a press in the corner reaches the card, not the stripes; a press inside reaches the stripes.
  const presses = clipStripePresses();
  await click(new Vector2((card.x + 9) * shot.ratio, (card.y + 9) * shot.ratio));
  assert(clipStripePresses() === presses, `A press in the corner, outside the curve, does not reach the stripes: ${presses} -> ${clipStripePresses()}`);
  await click(new Vector2((card.x + 30) * shot.ratio, (card.y + card.height / 2) * shot.ratio));
  assert(clipStripePresses() === presses + 1, `and one inside it does: ${presses} -> ${clipStripePresses()}`);

  // The glimmer, paused: the corner of the button shows the card behind it, the ring shows the button or its light, the panel covers the rest.
  const glimmer = node('glimmer').rect;
  const glimmerShot = shoot(owner);
  const page = pixel(glimmerShot, glimmer.x - 4, glimmer.y + glimmer.height / 2);
  const glimmerCorner = pixel(glimmerShot, glimmer.x + 1, glimmer.y + 1);
  assert(apart(glimmerCorner, page) <= SAME_LEVELS, `The light does not show past the button's rounded corner: ${name(glimmerCorner)} against the page's ${name(page)}`);
  const panel = pixel(glimmerShot, glimmer.x + glimmer.width / 2, glimmer.y + glimmer.height / 2 + GLIMMER.height / 4);
  const ringTop = pixel(glimmerShot, glimmer.x + glimmer.width / 2, glimmer.y + 1);
  assert(apart(panel, ringTop) > SAME_LEVELS, `The ring is not the panel: ring ${name(ringTop)}, panel ${name(panel)}`);
  await capture('animations-glimmer', OVERFLOWING);

  // Paused: the glimmer holds still.
  const lightPaused = rotationOf(node('glimmer-light'));
  await frames(IDLE_FRAMES);
  assert(Math.abs(turnBetween(lightPaused, rotationOf(node('glimmer-light')))) <= ANGLE_TOLERANCE,
    `A paused animation holds still: ${lightPaused} -> ${rotationOf(node('glimmer-light'))}`);

  // Transform and opacity animations (the Tailwind ones, which keep running) cost no commit, layout, restyle or re-record.
  const before = api.activity();
  await frames(COST_FRAMES);
  const after = api.activity();
  facts.cost = {
    frames: after.animationFrames - before.animationFrames,
    batches: after.batches - before.batches,
    layoutPasses: after.layoutPasses - before.layoutPasses,
    nodesRestyled: after.nodesRestyled - before.nodesRestyled,
    boxRecords: after.boxRecords - before.boxRecords,
    contentRecords: after.contentRecords - before.contentRecords,
    maskRecords: after.maskRecords - before.maskRecords,
  };
  assert(after.animationFrames - before.animationFrames >= COST_FRAMES / 2, `The running animations tick: ${JSON.stringify(facts.cost)}`);
  assert(after.batches === before.batches && after.mutations === before.mutations, `with no commit: ${JSON.stringify(facts.cost)}`);
  assert(after.layoutPasses === before.layoutPasses, `no layout pass: ${JSON.stringify(facts.cost)}`);
  assert(after.nodesRestyled === before.nodesRestyled, `no restyle: ${JSON.stringify(facts.cost)}`);
  assert(after.boxRecords === before.boxRecords && after.contentRecords === before.contentRecords, `and no re-record: ${JSON.stringify(facts.cost)}`);
  assert(after.maskRecords === before.maskRecords, `and no rounded clip drawn again: ${JSON.stringify(facts.cost)}`);

  // Running again: the glimmer goes on from where it stopped, at a turn every GLIMMER_TURN_MS (one frame more at most: the frame the
  // resumed style is published in).
  const resumeClock = api.activity().clockMs;
  setAnimationsPlaying(true);
  await frames(SETTLE_FRAMES);
  const resumed = { angle: rotationOf(node('glimmer-light')), clockMs: api.activity().clockMs };
  const resumedTurn = turnBetween(lightPaused, resumed.angle);
  const allowed = ((resumed.clockMs - resumeClock + LONGEST_FRAME_MS) / GLIMMER_TURN_MS) * DEGREES_PER_TURN + ANGLE_TOLERANCE;
  assert(resumedTurn >= -ANGLE_TOLERANCE && resumedTurn <= allowed,
    `A resumed animation goes on from where it was: ${lightPaused.toFixed(2)} -> ${resumed.angle.toFixed(2)}, at most ${allowed.toFixed(2)} degrees on`);

  // Out of the tree: the clock stops, and goes on when the root is back.
  api.surfaceAttached(false);
  const detachedAt = api.activity().clockMs;
  await wallTime(DETACHED_MS);
  const whileOut = api.activity().clockMs;
  api.surfaceAttached(true);
  assert(whileOut === detachedAt, `The native clock stops while the root is outside the scene tree: ${detachedAt} -> ${whileOut}`);
  await frames(SETTLE_FRAMES);
  assert(api.activity().clockMs > whileOut, 'and runs again when it is back');

  // Every animation paused or removed: nothing animates and no frame is asked for.
  setAnimationsPlaying(false);
  await click(new Vector2((node('animation-mount-toggle').rect.x + 8) * shot.ratio, (node('animation-mount-toggle').rect.y + 8) * shot.ratio));
  await frames(SETTLE_FRAMES);
  assert(api.find('anim-spin') === undefined, 'The Tailwind cards are removed');
  const idle = api.activity();
  assert(!idle.animating, 'With every animation paused or removed nothing animates');
  await frames(IDLE_FRAMES);
  const later = api.activity();
  assert(later.animationFrames === idle.animationFrames && later.clockMs === idle.clockMs,
    `and the root asks for no frames: ${idle.animationFrames} -> ${later.animationFrames} frames, ${idle.clockMs} -> ${later.clockMs} ms`);
  assert(later.drawSerial === idle.drawSerial, `and draws nothing: ${idle.drawSerial} -> ${later.drawSerial}`);
  setAnimationsPlaying(true);
  facts.ratio = shot.ratio;
  facts.probes = assertionTally.count;
  return facts;
}

// ---- Cost (opt-in: `--only=animations-cost`) --------------------------------------------------------------------------------

export interface AnimationCostInspection {
  showAnimationCost(props: AnimationCostProps): void;
  activity(): NativeActivity;
  profile(enabled: boolean): void;
  takeProfile(): { native: NativeProfile };
}

/** Frames drawn per sample and samples per cell (the median is reported). */
const COST_DRAWS = 20;
const COST_SAMPLES = 5;
const COST_COUNTS = [1, 10, 50] as const;
/** Animation frames a profile spans. */
const PROFILE_FRAMES = 120;
const MICROSECONDS_PER_MILLISECOND = 1000;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Milliseconds per frame over forced draws that each set of ends in a read-back, which waits for the GPU (as `filters-cost` measures). */
function frameMilliseconds(owner: Node): number {
  const samples: number[] = [];
  for (let sample = 0; sample < COST_SAMPLES; sample += 1) {
    const started = Time.getTicksUsec();
    for (let index = 0; index < COST_DRAWS; index += 1) RenderingServer.forceDraw();
    grab(owner).getWidth();
    samples.push((Time.getTicksUsec() - started) / MICROSECONDS_PER_MILLISECOND / COST_DRAWS);
  }
  return median(samples);
}

function gpuMilliseconds(rid: Rid): number {
  const samples: number[] = [];
  for (let index = 0; index < COST_SAMPLES * 2; index += 1) {
    RenderingServer.forceDraw();
    samples.push(RenderingServer.viewportGetMeasuredRenderTimeGpu(rid));
  }
  return median(samples);
}

/**
 * What animations and rounded clips cost: the native CPU time of an animation tick with 1, 10 and 50 spinning squares (the
 * profile's `frame` samples), what an idle page asks for, and the extra time a frame takes with 1, 10 and 50 rounded clips over the same
 * cards clipped square (wall time over forced draws ending in a read-back, and the viewport's GPU time where the renderer reports it).
 * Printed as `GODOT_REACT_ANIMATIONS_COST`.
 */
export async function measureAnimationCost(owner: Node, api: AnimationCostInspection): Promise<void> {
  const viewport = owner.getViewport();
  assert(viewport, 'The demo has its viewport');
  const rid = viewport.getViewportRid();
  RenderingServer.viewportSetMeasureRenderTime(rid, true);
  const vsync = DisplayServer.windowGetVsyncMode();
  DisplayServer.windowSetVsyncMode(DisplayServer.VSyncMode.VsyncDisabled);
  const results: Record<string, unknown> = {};

  // Idle: cards that clip round, nothing animating.
  api.showAnimationCost({ count: COST_COUNTS[2], rounded: true, spinning: false });
  await frames(SETTLE_FRAMES);
  const idleBefore = api.activity();
  await frames(PROFILE_FRAMES);
  const idleAfter = api.activity();
  results.idle = {
    frames: PROFILE_FRAMES, animationFrames: idleAfter.animationFrames - idleBefore.animationFrames,
    paintPasses: idleAfter.paintPasses - idleBefore.paintPasses, animating: idleAfter.animating,
  };
  assert(idleAfter.animationFrames === idleBefore.animationFrames, `An idle page asks for no animation frames: ${JSON.stringify(results.idle)}`);

  // A tick of N spinning squares, natively.
  const ticks: unknown[] = [];
  for (const count of COST_COUNTS) {
    api.showAnimationCost({ count, rounded: false, spinning: true });
    await frames(SETTLE_FRAMES);
    api.profile(true);
    api.takeProfile();
    const before = api.activity();
    await frames(PROFILE_FRAMES);
    const after = api.activity();
    const profile = api.takeProfile().native.samples;
    api.profile(false);
    const samples = profile.filter(sample => sample.kind === 'frame');
    const draws = profile.filter(sample => sample.kind === 'draw');
    ticks.push({
      spinning: count,
      tickMicrosMedian: median(samples.map(sample => Number(sample.animationMicros ?? 0))),
      drawMicrosMedian: median(draws.map(sample => Number(sample.cpuMicros ?? 0))),
      samples: samples.length,
      draws: draws.length,
      boxRecords: after.boxRecords - before.boxRecords,
      layoutPasses: after.layoutPasses - before.layoutPasses,
      batches: after.batches - before.batches,
    });
  }
  results.ticks = ticks;

  // Rounded clips against square ones, nothing animating.
  const clips: unknown[] = [];
  for (const count of COST_COUNTS) {
    api.showAnimationCost({ count, rounded: false, spinning: false });
    await frames(SETTLE_FRAMES);
    const square = frameMilliseconds(owner);
    const squareGpu = gpuMilliseconds(rid);
    const recordsBefore = api.activity().maskRecords;
    const started = Time.getTicksUsec();
    api.showAnimationCost({ count, rounded: true, spinning: false });
    await frames(1);
    const commitAndFirstFrameMs = (Time.getTicksUsec() - started) / MICROSECONDS_PER_MILLISECOND;
    await frames(SETTLE_FRAMES);
    const rounded = frameMilliseconds(owner);
    const roundedGpu = gpuMilliseconds(rid);
    const activity = api.activity();
    assert(activity.roundedClips === count, `Every card's clip is a mask: ${activity.roundedClips} of ${count}`);
    clips.push({
      clips: count, squareMs: Number(square.toFixed(3)), roundedMs: Number(rounded.toFixed(3)), extraMs: Number((rounded - square).toFixed(3)),
      squareGpuMs: Number(squareGpu.toFixed(3)), roundedGpuMs: Number(roundedGpu.toFixed(3)), maskRecords: activity.maskRecords - recordsBefore,
      commitAndFirstFrameMs: Number(commitAndFirstFrameMs.toFixed(2)),
    });
  }
  results.clips = clips;
  console.log('GODOT_REACT_ANIMATIONS_COST', JSON.stringify({ renderer: RenderingServer.getCurrentRenderingMethod(), ...results }));
  DisplayServer.windowSetVsyncMode(vsync);
}
