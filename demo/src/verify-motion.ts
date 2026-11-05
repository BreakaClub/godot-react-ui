import {
  DirAccess, Engine, FileAccess, GError, Input, InputEventMouseButton, InputEventMouseMotion,
  MouseButton, Node, OS, RenderingServer, Vector2,
} from 'godot';
import type { LayoutRect, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import type { DemoInspection } from './verify';
import { MOTION_BASE_FONT_SIZE, MOTION_DURATION_MS, MOTION_LARGE_FONT_SIZE } from './motion-lab';

export interface MotionInspection extends DemoInspection {
  /** Detach/reattach the same native Control, preserving the React root and state. */
  surfaceAttached(attached: boolean): void;
  activity(): {
    animating: boolean;
    trackedTransitions: number;
    animationFrames: number;
    layoutPasses: number;
    clockMs: number;
  };
}

interface TransitionSample {
  id: number;
  property: string;
  current: number | string;
  target: number | string;
  startedAtMs: number;
  durationMs: number;
}

interface Observation {
  phase: string;
  clockMs: number;
  height: number;
  contentHeight: number;
  siblingY: number;
  transitions: TransitionSample[];
}

const POLL_MS = 20;
const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const STAGE_DEADLINE_MS = 15_000;
const RUN_DEADLINE_MS = 120_000;
const FLOW_GAP = 12;
const GEOMETRY_TOLERANCE = 2;
const MINIMUM_INTERMEDIATE_SAMPLES = 3;
const RETARGET_PROGRESS = 0.15;
const MIDPOINT_PROGRESS = 0.4;
const OWNERSHIP_HANDOFF_PROGRESS = 0.7;
const OPENING_CAPTURE_MIN_RATIO = 0.5;
const OPENING_CAPTURE_MAX_RATIO = 0.85;
const CLOSING_CAPTURE_MIN_RATIO = 0.35;
const CLOSING_CAPTURE_MAX_RATIO = 0.7;
const CLIP_STRIP_INSET = 8;
const PIXEL_CHANNEL_TOLERANCE = 0.02;
const PAINT_OPACITY_TARGET = 0.45;
const PAINT_CAPTURE_MAX_OPACITY = 0.8;
const OPACITY_TOLERANCE = 0.01;
const COLOR_CHANNEL_MAX = 255;
// The shared App's bg-slate-50 sRGB color, against which clip leakage is visible.
const CANVAS_BACKGROUND = { r: 248 / COLOR_CHANNEL_MAX, g: 250 / COLOR_CHANNEL_MAX, b: 252 / COLOR_CHANNEL_MAX };
// The unchanged indigo swatch is opaque before the separate paint-only scenario.
const RESTORED_SWATCH_COLOR = { r: 79 / COLOR_CHANNEL_MAX, g: 70 / COLOR_CHANNEL_MAX, b: 229 / COLOR_CHANNEL_MAX };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown, label: string): number {
  assert(typeof value === 'number' && Number.isFinite(value), `Missing finite motion diagnostic ${label}`);
  return value;
}

function transitions(snapshot: NativeSnapshot): TransitionSample[] {
  const entries: unknown = Reflect.get(snapshot, 'transitions');
  assert(Array.isArray(entries), 'Native snapshot must expose transitions');
  return entries.map((value: unknown) => {
    assert(isRecord(value), 'Transition diagnostic must be an object');
    const { current, target, property } = value;
    assert(typeof property === 'string', 'Transition diagnostic must name its property');
    assert(typeof current === 'number' || typeof current === 'string', 'Invalid current transition value');
    assert(typeof target === 'number' || typeof target === 'string', 'Invalid target transition value');
    return {
      id: finite(value.id, 'transition.id'), property, current, target,
      startedAtMs: finite(value.startedAtMs, 'transition.startedAtMs'),
      durationMs: finite(value.durationMs, 'transition.durationMs'),
    };
  });
}

function clock(snapshot: NativeSnapshot): number {
  return finite(Reflect.get(snapshot, 'clockMs'), 'clockMs');
}

function clipRect(node: NativeSnapshotNode): LayoutRect | null {
  const value: unknown = Reflect.get(node, 'clipRect');
  if (value === null) return null;
  assert(isRecord(value), `Node ${node.id} must expose clipRect`);
  return {
    x: finite(value.x, 'clipRect.x'), y: finite(value.y, 'clipRect.y'),
    width: finite(value.width, 'clipRect.width'), height: finite(value.height, 'clipRect.height'),
  };
}

function presentationNumber(node: NativeSnapshotNode, property: string): number {
  const value: unknown = Reflect.get(node, 'presentation');
  assert(isRecord(value), `Node ${node.id} must expose presentation values`);
  return finite(value[property], `presentation.${property}`);
}

function get(api: DemoInspection, id: string): NativeSnapshotNode {
  const node = api.find(id);
  assert(node, `Missing motion test target ${id}`);
  return node;
}

function contentText(api: DemoInspection, id: string): string {
  const snapshot = api.snapshot();
  function collect(node: NativeSnapshotNode): string {
    return node.text + node.children.map(childID => {
      const child = snapshot.nodes.find(candidate => candidate.id === childID);
      assert(child, `Missing native child ${childID}`);
      return collect(child);
    }).join('');
  }
  return collect(get(api, id));
}

function pointer(position: Vector2, pressed: boolean): void {
  const event = new InputEventMouseButton();
  event.position = position;
  event.globalPosition = position;
  event.buttonIndex = MouseButton.MouseButtonLeft;
  event.pressed = pressed;
  Input.parseInputEvent(event);
}

function move(position: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = position;
  event.globalPosition = position;
  Input.parseInputEvent(event);
}

function center(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function sameRect(a: LayoutRect, b: LayoutRect): boolean {
  return Math.abs(a.x - b.x) <= GEOMETRY_TOLERANCE && Math.abs(a.y - b.y) <= GEOMETRY_TOLERANCE &&
    Math.abs(a.width - b.width) <= GEOMETRY_TOLERANCE && Math.abs(a.height - b.height) <= GEOMETRY_TOLERANCE;
}

/** Real Godot input and frame progression; no direct mutation of React/native state. */
export async function runMotionVerification(owner: Node, api: MotionInspection): Promise<void> {
  const runDeadline = Date.now() + RUN_DEADLINE_MS;
  const directory = OS.getEnvironment('GODOT_REACT_ARTIFACTS') || 'user://react-ui-motion-verification';
  assert(DirAccess.makeDirRecursiveAbsolute(directory) === GError.Ok, 'Cannot create motion evidence directory');
  const captures: string[] = [];
  const observations: Observation[] = [];

  function checkDeadline(): void {
    assert(Date.now() < runDeadline, 'Motion verification exceeded its overall deadline');
    assert(owner.isInsideTree(), 'Motion verification owner left the tree');
  }

  async function tick(): Promise<void> {
    checkDeadline();
    await new Promise<void>(resolve => setTimeout(resolve, POLL_MS));
    checkDeadline();
  }

  async function until(label: string, predicate: () => boolean): Promise<void> {
    const deadline = Math.min(runDeadline, Date.now() + STAGE_DEADLINE_MS);
    while (!predicate()) {
      assert(Date.now() < deadline, `Timed out waiting for ${label}`);
      await tick();
    }
  }

  async function clickAt(position: Vector2): Promise<void> {
    move(position);
    pointer(position, true);
    await tick();
    pointer(position, false);
  }

  async function click(id: string): Promise<void> {
    const node = get(api, id);
    assert(node.rect.width > 0 && node.rect.height > 0, `Cannot click hidden control ${id}`);
    await clickAt(center(node.rect));
  }

  function activeHeight(): TransitionSample | undefined {
    if (!api.activity().animating) return undefined;
    const panel = api.find('motion-clip');
    if (!panel) return undefined;
    return transitions(api.snapshot()).find(transition => transition.id === panel.id && transition.property === 'height');
  }

  function flow(phase: string): Observation {
    const panel = get(api, 'motion-clip');
    const content = get(api, 'motion-content');
    const sibling = get(api, 'motion-following-sibling');
    const snapshot = api.snapshot();
    assert(Math.abs(sibling.rect.y - (panel.rect.y + panel.rect.height + FLOW_GAP)) <= GEOMETRY_TOLERANCE,
      `${phase}: following sibling does not track the animated height`);
    const inheritedClip = clipRect(content);
    assert(inheritedClip, `${phase}: intrinsic content lost its inherited overflow clip`);
    assert(inheritedClip.y + inheritedClip.height <= panel.rect.y + panel.rect.height + GEOMETRY_TOLERANCE,
      `${phase}: child clip exceeds animated shell`);
    assert(inheritedClip.x >= panel.rect.x - GEOMETRY_TOLERANCE &&
      inheritedClip.x + inheritedClip.width <= panel.rect.x + panel.rect.width + GEOMETRY_TOLERANCE,
      `${phase}: child clip exceeds shell width`);
    assert(sibling.rect.y + sibling.rect.height <= snapshot.height - GEOMETRY_TOLERANCE,
      `${phase}: flowing sibling escapes viewport`);
    const observation = {
      phase, clockMs: clock(snapshot), height: panel.rect.height,
      contentHeight: content.rect.height, siblingY: sibling.rect.y, transitions: transitions(snapshot),
    };
    observations.push(observation);
    return observation;
  }

  function saveJson(name: string, value: unknown): void {
    const file = FileAccess.open(`${directory}/${name}.json`, FileAccess.ModeFlags.Write);
    assert(file, `Cannot write ${name} evidence`);
    file.storeString(JSON.stringify(value));
    file.close();
  }

  /** No settle delay: the snapshot and raster intentionally describe this frame. */
  function capture(name: string, verifyClipStrip = false, verifyRestoredCanvas = false): void {
    checkDeadline();
    const snapshot = api.snapshot();
    RenderingServer.forceDraw();
    const image = owner.getViewport()?.getTexture()?.getImage();
    assert(image, 'Motion verification requires a genuine rendered viewport');
    if (verifyRestoredCanvas) {
      const swatch = get(api, 'motion-paint-swatch').rect;
      const pixelScale = image.getWidth() / snapshot.width;
      const pixel = image.getPixel(Math.floor((swatch.x + swatch.width / 2) * pixelScale),
        Math.floor((swatch.y + swatch.height / 2) * pixelScale));
      assert(Math.abs(pixel.r - RESTORED_SWATCH_COLOR.r) <= PIXEL_CHANNEL_TOLERANCE &&
        Math.abs(pixel.g - RESTORED_SWATCH_COLOR.g) <= PIXEL_CHANNEL_TOLERANCE &&
        Math.abs(pixel.b - RESTORED_SWATCH_COLOR.b) <= PIXEL_CHANNEL_TOLERANCE,
        `${name}: reattached canvas did not restore its rendered swatch`);
    }
    if (verifyClipStrip) {
      const panel = get(api, 'motion-clip').rect;
      const pixelScale = image.getWidth() / snapshot.width;
      assert(Math.abs(image.getHeight() / snapshot.height - pixelScale) < OPACITY_TOLERANCE, 'Nonuniform capture scale');
      const y = Math.floor((panel.y + panel.height + FLOW_GAP / 2) * pixelScale);
      const start = Math.ceil((panel.x + CLIP_STRIP_INSET) * pixelScale);
      const end = Math.floor((panel.x + panel.width - CLIP_STRIP_INSET) * pixelScale);
      for (let x = start; x < end; x++) {
        const color = image.getPixel(x, y);
        assert(Math.abs(color.r - CANVAS_BACKGROUND.r) <= PIXEL_CHANNEL_TOLERANCE &&
          Math.abs(color.g - CANVAS_BACKGROUND.g) <= PIXEL_CHANNEL_TOLERANCE &&
          Math.abs(color.b - CANVAS_BACKGROUND.b) <= PIXEL_CHANNEL_TOLERANCE,
          `${name}: intrinsic content painted outside its animated overflow clip at ${x},${y}`);
      }
    }
    const path = `${directory}/${name}.png`;
    assert(image.savePng(path) === GError.Ok, `Could not save ${path}`);
    captures.push(path);
    saveJson(name, snapshot);
  }

  async function settled(label: string): Promise<void> {
    await until(label, () => !api.activity().animating);
    await tick();
    assert(!api.activity().animating, `${label}: native motion restarted after settlement`);
  }

  async function waitHeight(label: string, target: 'open' | 'closed'): Promise<TransitionSample> {
    await until(label, () => {
      const animation = activeHeight();
      return animation !== undefined && typeof animation.target === 'number' &&
        (target === 'open' ? animation.target > 0 : animation.target === 0);
    });
    const animation = activeHeight();
    assert(animation, `${label}: height transition vanished before observation`);
    return animation;
  }

  async function waitProgress(fraction: number): Promise<void> {
    await until('in-flight progress', () => {
      const snapshot = api.snapshot();
      const animation = activeHeight();
      assert(animation, 'Height transition finished before its in-flight mutation');
      return clock(snapshot) - animation.startedAtMs >= animation.durationMs * fraction;
    });
  }

  async function observeHeight(phase: string, captureName: string): Promise<void> {
    const intermediateHeights = new Set<number>();
    let captured = false;
    const deadline = Math.min(runDeadline, Date.now() + STAGE_DEADLINE_MS);
    while (api.activity().animating) {
      assert(Date.now() < deadline, `${phase}: height animation did not settle`);
      const observation = flow(phase);
      const animation = observation.transitions.find(transition => transition.id === get(api, 'motion-clip').id && transition.property === 'height');
      if (animation && typeof animation.current === 'number' && typeof animation.target === 'number' &&
          observation.height > GEOMETRY_TOLERANCE &&
          Math.abs(observation.height - animation.target) > GEOMETRY_TOLERANCE) {
        intermediateHeights.add(observation.height);
        const minRatio = animation.target > 0 ? OPENING_CAPTURE_MIN_RATIO : CLOSING_CAPTURE_MIN_RATIO;
        const maxRatio = animation.target > 0 ? OPENING_CAPTURE_MAX_RATIO : CLOSING_CAPTURE_MAX_RATIO;
        const inVisualMidband = observation.height >= observation.contentHeight * minRatio &&
          observation.height <= observation.contentHeight * maxRatio;
        if (!captured && intermediateHeights.size >= MINIMUM_INTERMEDIATE_SAMPLES && inVisualMidband) {
          capture(captureName, true);
          captured = true;
        }
      }
      await tick();
    }
    assert(intermediateHeights.size >= MINIMUM_INTERMEDIATE_SAMPLES,
      `${phase}: expected at least ${MINIMUM_INTERMEDIATE_SAMPLES} distinct intermediate height frames, got ${intermediateHeights.size}`);
    assert(captured, `${phase}: no intermediate native raster`);
    flow(`${phase}-settled`);
  }

  await until('initial app', () => api.find('tab-motion') !== undefined);
  // The window system activates and deactivates a fresh window around its first frames. A press that
  // straddles that focus change loses its release (Godot drops mouse focus on window focus-out and
  // its synthetic release skips `_gui_input`), so the first input waits for the window to settle,
  // as the other verifiers do. Measured: focus-out arrived 33 ms after the first press.
  const startFrame = Engine.getProcessFrames();
  await new Promise<void>(resolve => setTimeout(resolve, SETTLE_MS));
  while (Engine.getProcessFrames() - startFrame < MIN_SETTLE_FRAMES) await tick();
  await click('tab-motion');
  await until('motion lab', () => api.find('motion-clip') !== undefined);
  await settled('initial motion state');
  assert(get(api, 'motion-clip').rect.height === 0, 'Accordion must start at height zero');
  flow('initial-closed');
  capture('01-closed', true);

  await click('motion-toggle');
  await waitHeight('opening transition', 'open');
  await observeHeight('open', '02-opening');
  assert(Math.abs(get(api, 'motion-clip').rect.height - get(api, 'motion-content').rect.height) <= GEOMETRY_TOLERANCE,
    'Open auto height does not fit intrinsic content');
  const shortHeight = get(api, 'motion-clip').rect.height;
  capture('03-open');

  await click('motion-inside-action');
  await until('visible action activation', () => contentText(api, 'motion-inside-count') === 'Activated 1 time');
  await click('motion-toggle');
  await waitHeight('closing transition', 'closed');
  await observeHeight('close', '04-closing');
  assert(get(api, 'motion-clip').rect.height === 0, 'Closed accordion retained height');
  const clippedButton = get(api, 'motion-inside-action');
  const clippedInputPoint = center(clippedButton.rect);
  const inputClip = clipRect(clippedButton);
  assert(inputClip && inputClip.height === 0, 'Closed child action must have an empty input clip');
  await clickAt(clippedInputPoint);
  await tick();
  await tick();
  assert(contentText(api, 'motion-inside-count') === 'Activated 1 time', 'Clipped child action received a click');
  capture('05-closed-input', true);

  const unchangedCopy = contentText(api, 'motion-body');
  await click('motion-toggle');
  await waitHeight('per-property ownership opening', 'open');
  await waitProgress(OWNERSHIP_HANDOFF_PROGRESS);
  assert(!get(api, 'motion-clip').presentation.heightIsAuto,
    'Ownership test must start while native motion still owns the height');
  await click('motion-paint-toggle');
  await until('overlapping paint transition', () => api.activity().animating &&
    presentationNumber(get(api, 'motion-paint-swatch'), 'opacity') < 1 &&
    presentationNumber(get(api, 'motion-paint-swatch'), 'opacity') > PAINT_OPACITY_TARGET);
  await until('height ownership released before paint completes', () => {
    assert(api.activity().animating, 'Paint completed before independent height ownership could be observed');
    return get(api, 'motion-clip').presentation.heightIsAuto;
  });
  const ongoingPaintOpacity = presentationNumber(get(api, 'motion-paint-swatch'), 'opacity');
  assert(ongoingPaintOpacity > PAINT_OPACITY_TARGET && ongoingPaintOpacity < 1,
    'Height was restored to auto only after the unrelated paint transition ended');
  flow('height-auto-paint-ongoing');
  saveJson('05j-ownership-before-font', api.snapshot());

  await click('motion-font-toggle');
  await until('font mutation after independent height settlement', () =>
    get(api, 'motion-body').style.fontSize === MOTION_LARGE_FONT_SIZE);
  assert(api.activity().animating, 'Font mutation missed the still-active paint transition');
  const paintOpacityAfterFont = presentationNumber(get(api, 'motion-paint-swatch'), 'opacity');
  assert(paintOpacityAfterFont > PAINT_OPACITY_TARGET && paintOpacityAfterFont < 1,
    'Paint was no longer intermediate when the auto layout was mutated');
  assert(get(api, 'motion-clip').presentation.heightIsAuto,
    'Changing intrinsic content reacquired a fixed presentation height while unrelated paint was active');
  assert(get(api, 'motion-clip').rect.height > shortHeight + GEOMETRY_TOLERANCE &&
    Math.abs(get(api, 'motion-clip').rect.height - get(api, 'motion-content').rect.height) <= GEOMETRY_TOLERANCE,
    'Settled auto height did not immediately follow new native font metrics during the paint transition');
  assert(contentText(api, 'motion-body') === unchangedCopy, 'Ownership regression must change only font metrics');
  flow('settled-auto-updates-during-paint');
  capture('05j-auto-while-painting');
  await settled('overlapping paint settlement');

  await click('motion-font-toggle');
  await until('ownership fixture font restoration', () => get(api, 'motion-body').style.fontSize === MOTION_BASE_FONT_SIZE);
  assert(get(api, 'motion-clip').presentation.heightIsAuto &&
    Math.abs(get(api, 'motion-clip').rect.height - shortHeight) <= GEOMETRY_TOLERANCE,
    'Ownership fixture did not restore its canonical auto height');
  await click('motion-paint-toggle');
  await until('ownership fixture paint restoration starts', () => api.activity().animating);
  await settled('ownership fixture paint restoration');
  assert(Math.abs(presentationNumber(get(api, 'motion-paint-swatch'), 'opacity') - 1) < OPACITY_TOLERANCE,
    'Ownership fixture did not restore the opaque baseline for the later paint-only test');
  capture('05k-ownership-restored');
  await click('motion-toggle');
  await waitHeight('ownership fixture closing', 'closed');
  await observeHeight('ownership-fixture-close', '05l-ownership-closing');

  await click('motion-toggle');
  await waitHeight('font-only opening', 'open');
  await waitProgress(RETARGET_PROGRESS);
  await click('motion-font-toggle');
  await until('font-only intrinsic retarget', () => {
    const animation = activeHeight();
    return animation !== undefined && typeof animation.target === 'number' && animation.target > shortHeight + GEOMETRY_TOLERANCE;
  });
  assert(contentText(api, 'motion-body') === unchangedCopy, 'Font-only update changed the body copy');
  assert(get(api, 'motion-body').style.fontSize === MOTION_LARGE_FONT_SIZE, 'Font toggle did not set the larger font');
  await observeHeight('font-grow-retarget', '05a-font-growing');
  const largeFontHeight = get(api, 'motion-clip').rect.height;
  assert(largeFontHeight > shortHeight + GEOMETRY_TOLERANCE, 'Larger native font metrics did not increase intrinsic height');
  assert(Math.abs(largeFontHeight - get(api, 'motion-content').rect.height) <= GEOMETRY_TOLERANCE,
    'Larger-font endpoint does not fit native intrinsic content');
  capture('05b-font-large');

  await click('motion-toggle');
  await waitHeight('larger-font closing', 'closed');
  await observeHeight('font-close', '05c-font-closing');
  await click('motion-toggle');
  await waitHeight('font-restore opening', 'open');
  await waitProgress(RETARGET_PROGRESS);
  await click('motion-font-toggle');
  await until('smaller-font intrinsic retarget', () => {
    const animation = activeHeight();
    return animation !== undefined && typeof animation.target === 'number' &&
      Math.abs(animation.target - shortHeight) <= GEOMETRY_TOLERANCE;
  });
  assert(contentText(api, 'motion-body') === unchangedCopy, 'Restoring font metrics changed the body copy');
  assert(get(api, 'motion-body').style.fontSize === MOTION_BASE_FONT_SIZE, 'Font restore did not restore the base font');
  assert(get(api, 'motion-clip').rect.height > 0 && get(api, 'motion-clip').rect.height < shortHeight - GEOMETRY_TOLERANCE,
    'Font restoration snapped to an endpoint instead of retargeting in flight');
  await observeHeight('font-restore-retarget', '05d-font-restoring');
  assert(Math.abs(get(api, 'motion-clip').rect.height - shortHeight) <= GEOMETRY_TOLERANCE &&
    Math.abs(get(api, 'motion-clip').rect.height - get(api, 'motion-content').rect.height) <= GEOMETRY_TOLERANCE,
    'Restored-font endpoint does not match its original native intrinsic height');
  capture('05e-font-restored');

  await click('motion-toggle');
  await waitHeight('tree-reentry preparation close', 'closed');
  await observeHeight('tree-reentry-preparation', '05f-tree-preparation');
  await click('motion-toggle');
  await waitHeight('same-Control tree reentry opening', 'open');
  await waitProgress(RETARGET_PROGRESS);
  const reentryID = get(api, 'motion-clip').id;
  const reentryHeight = get(api, 'motion-clip').rect.height;
  const reentryCount = contentText(api, 'motion-inside-count');
  const childCountBeforeDetach = owner.getChildCount();
  api.surfaceAttached(false);
  assert(owner.getChildCount() === childCountBeforeDetach - 1, 'Surface detach did not remove the existing Control from its owner');
  const detachedClock = api.activity().clockMs;
  const detachedFrames = api.activity().animationFrames;
  const detachedAt = Date.now();
  while (Date.now() - detachedAt <= MOTION_DURATION_MS) await tick();
  assert(api.activity().clockMs === detachedClock, 'Native animation clock advanced while its Control was outside the tree');
  assert(api.activity().animationFrames === detachedFrames, 'Detached Control continued animating');
  assert(get(api, 'motion-clip').id === reentryID &&
    Math.abs(get(api, 'motion-clip').rect.height - reentryHeight) <= GEOMETRY_TOLERANCE,
    'Detaching the existing Control replaced its native state or advanced its presentation');
  api.surfaceAttached(true);
  assert(owner.getChildCount() === childCountBeforeDetach, 'Reattaching the existing Control duplicated its owner child');
  assert(get(api, 'motion-clip').id === reentryID && contentText(api, 'motion-inside-count') === reentryCount,
    'Same-Control tree reentry replaced the React/native owner state');
  assert(Math.abs(get(api, 'motion-clip').rect.height - reentryHeight) <= GEOMETRY_TOLERANCE,
    'Reattaching the existing Control jumped its presentation');
  await waitHeight('same-Control resumed transition', 'open');
  await observeHeight('same-control-tree-reentry', '05g-tree-resumed');
  assert(api.activity().clockMs > detachedClock, 'Reattached native animation clock did not resume');
  assert(Math.abs(get(api, 'motion-clip').rect.height - shortHeight) <= GEOMETRY_TOLERANCE &&
    Math.abs(get(api, 'motion-clip').rect.height - get(api, 'motion-content').rect.height) <= GEOMETRY_TOLERANCE,
    'Tree-reentry endpoint does not fit native intrinsic content');
  capture('05h-tree-restored', false, true);
  await click('motion-inside-action');
  await until('reattached action activation', () => contentText(api, 'motion-inside-count') === 'Activated 2 times');
  await click('motion-toggle');
  await waitHeight('tree-reentry closing', 'closed');
  await observeHeight('tree-reentry-close', '05i-tree-closing');

  await click('motion-toggle');
  await waitHeight('retarget opening', 'open');
  await waitProgress(RETARGET_PROGRESS);
  await click('motion-copy-toggle');
  await until('intrinsic text retarget', () => {
    const animation = activeHeight();
    return animation !== undefined && typeof animation.target === 'number' && animation.target > shortHeight + GEOMETRY_TOLERANCE;
  });
  const longAnimation = activeHeight();
  assert(longAnimation && typeof longAnimation.target === 'number', 'Missing long-content target');
  const longTarget = longAnimation.target;
  flow('content-retargeted');
  await click('motion-width-toggle');
  await until('parent-width retarget', () => {
    const animation = activeHeight();
    return animation !== undefined && typeof animation.target === 'number' && animation.target > longTarget + GEOMETRY_TOLERANCE;
  });
  assert(activeHeight(), 'Width change happened after animation settlement');
  await observeHeight('content-width-retarget', '06-retargeting');
  assert(get(api, 'motion-clip').rect.height > shortHeight, 'Long, narrow content did not grow');
  assert(Math.abs(get(api, 'motion-clip').rect.height - get(api, 'motion-content').rect.height) <= GEOMETRY_TOLERANCE,
    'Retargeted auto height does not fit current intrinsic content');
  capture('07-long-narrow');

  await click('motion-toggle');
  await waitHeight('reversal closing', 'closed');
  await waitProgress(MIDPOINT_PROGRESS);
  const reversalHeight = get(api, 'motion-clip').rect.height;
  assert(reversalHeight > 0, 'Reversal was attempted after collapse completed');
  await click('motion-toggle');
  await waitHeight('reversed opening', 'open');
  assert(get(api, 'motion-clip').rect.height > 0, 'Reversal snapped to the closed endpoint');
  await observeHeight('reverse', '08-reversed');
  capture('09-reversal-settled');

  await click('motion-toggle');
  await waitHeight('removal in flight', 'closed');
  const removedID = get(api, 'motion-clip').id;
  await click('motion-mount-toggle');
  await until('panel removal', () => api.find('motion-clip') === undefined);
  assert(!api.snapshot().nodes.some(node => node.id === removedID), 'Removed panel retained native layout state');
  assert(!api.activity().animating, 'Removing the panel retained native transitions');
  const framesAfterRemoval = api.activity().animationFrames;
  const removedAt = Date.now();
  while (Date.now() - removedAt <= MOTION_DURATION_MS) await tick();
  assert(api.activity().animationFrames === framesAfterRemoval, 'Removed panel kept advancing native animation frames');
  capture('10-removed');
  await click('motion-mount-toggle');
  await until('fresh panel remount', () => api.find('motion-clip') !== undefined);
  assert(get(api, 'motion-clip').id !== removedID, 'Remount reused the removed native handle');
  assert(get(api, 'motion-clip').rect.height === 0, 'Remounted closed panel has the wrong height');
  assert(contentText(api, 'motion-inside-count') === 'Activated 0 times', 'Unmount did not reset child React state');
  capture('11-remounted', true);

  await settled('paint baseline');
  const beforePaint = api.snapshot();
  const paintRect = get(api, 'motion-paint-swatch').rect;
  const paintID = get(api, 'motion-paint-swatch').id;
  await click('motion-paint-toggle');
  await until('paint transitions', () => api.activity().animating &&
    transitions(api.snapshot()).filter(animation => animation.id === paintID).length === 2);
  const opacitySamples = new Set<number>();
  const colorSamples = new Set<string>();
  let paintCaptured = false;
  const paintDeadline = Math.min(runDeadline, Date.now() + STAGE_DEADLINE_MS);
  while (api.activity().animating) {
    assert(Date.now() < paintDeadline, 'Paint-only animation did not settle');
    const snapshot = api.snapshot();
    assert(snapshot.stats.layoutPasses === beforePaint.stats.layoutPasses, 'Paint-only animation recomputed layout');
    assert(sameRect(get(api, 'motion-paint-swatch').rect, paintRect), 'Paint-only animation changed geometry');
    for (const animation of transitions(snapshot).filter(value => value.id === paintID)) {
      if (animation.property === 'opacity' && typeof animation.current === 'number' &&
          animation.current > PAINT_OPACITY_TARGET && animation.current < 1) opacitySamples.add(animation.current);
      if (animation.property === 'backgroundColor' && typeof animation.current === 'string') colorSamples.add(animation.current);
    }
    const currentOpacity = presentationNumber(get(api, 'motion-paint-swatch'), 'opacity');
    if (!paintCaptured && opacitySamples.size >= MINIMUM_INTERMEDIATE_SAMPLES &&
        colorSamples.size >= MINIMUM_INTERMEDIATE_SAMPLES && currentOpacity <= PAINT_CAPTURE_MAX_OPACITY) {
      capture('12-paint-intermediate');
      paintCaptured = true;
    }
    await tick();
  }
  assert(opacitySamples.size >= MINIMUM_INTERMEDIATE_SAMPLES && colorSamples.size >= MINIMUM_INTERMEDIATE_SAMPLES,
    'Paint-only transition did not expose multiple intermediate opacity/color values');
  assert(api.snapshot().stats.layoutPasses === beforePaint.stats.layoutPasses, 'Paint settlement recomputed layout');
  assert(Math.abs(presentationNumber(get(api, 'motion-paint-swatch'), 'opacity') - PAINT_OPACITY_TARGET) < OPACITY_TOLERANCE,
    'Paint opacity did not reach the requested endpoint');
  capture('13-paint-settled');

  await click('motion-toggle');
  await waitHeight('owner teardown in flight', 'open');
  api.unmount();
  await until('surface destruction', () => owner.getChildCount() === 0);
  api.mount();
  await until('owner remount', () => api.find('tab-motion') !== undefined);
  await click('tab-motion');
  await until('fresh motion lab', () => api.find('motion-clip') !== undefined);
  await settled('fresh owner state');
  assert(get(api, 'motion-clip').rect.height === 0, 'Owner remount retained old animation state');
  assert(owner.getChildCount() === 1, 'Owner remount retained an old native surface');
  capture('14-owner-remounted', true);

  saveJson('motion-report', { captures, observations, activity: api.activity(), stats: api.snapshot().stats });
  console.log('GODOT_REACT_MOTION_VERIFY_PASSED', JSON.stringify({ captures, samples: observations.length, activity: api.activity() }));
}
