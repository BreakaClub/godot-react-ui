import {
  Control, DirAccess, DisplayServer, Engine, FileAccess, GError, Input, InputEventKey, InputEventMouseButton,
  InputEventMouseMotion, InputEventPanGesture, InputEventScreenDrag, InputEventScreenTouch, Key, MouseButton,
  MouseButtonMask, Node, OS, ProjectSettings, RenderingServer, Vector2,
} from 'godot';
import type { RendererProfile } from '../../src';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import type { LabName } from './labs';
import type { PassthroughCounts } from './main';
import type { DemoInspection } from './verify';

export interface InteractionInspection extends DemoInspection {
  /** Detach/reattach the same native Control, preserving the React root and state. */
  surfaceAttached(attached: boolean): void;
  profile(enabled: boolean): void;
  takeProfile(): { js: RendererProfile };
  /** Render a page in place of the app: the pass-through HUD, the pointer lab. */
  showLab(name: LabName): void;
  pointerCancels(): number;
  resetPointerCancels(): void;
  restoreDemo(): void;
  passthrough(): PassthroughCounts;
  resetPassthrough(): void;
  cursorShapeAt(x: number, y: number): Control.CursorShape;
  surfaceHasFocus(): boolean;
  grabSurfaceFocus(): void;
  bareSurfaceHasFocus(): boolean;
  offsetSurface(x: number, y: number): void;
}

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
const GEOMETRY_TOLERANCE = 2;
const DISPATCH_SAMPLES = 40;
// Hover paint of the crossing panel's parent: slate-100 at rest, slate-200 while hovered.
const CHAIN_PARENT_REST = '#f1f5f9';
const CHAIN_PARENT_HOVER = '#e2e8f0';
const FAR_CORNER = new Vector2(1, 1);
/** Inside a button's border box but outside its label. */
const POINTER_PADDING_INSET = 4;
/** Longer than the click-count interval (plan Appendix A, 500 ms), so the next click starts a sequence. */
const CLICK_SEQUENCE_PAUSE_MS = 650;
/** More than the click-count slop (4 px), so a second click there is not part of the same sequence. */
const CLICK_SLOP_BREAKER_PX = 10;
/** How far outside the window the knob test drags: beyond the root and the window itself. */
const OUTSIDE_THE_ROOT_PX = 300;
/** The pad's paint at rest: indigo-50 (`hover:` is indigo-100). */
const PAD_REST_COLOR = '#eef2ff';
/** The touch indices of the multi-touch test and the pointer ids they get (plan: base 2). */
const FIRST_TOUCH = 0;
const SECOND_TOUCH = 1;
const FIRST_TOUCH_ID = 2;
const SECOND_TOUCH_ID = 3;
/** The grid step when looking for a point no HUD control covers. */
const EMPTY_POINT_SEARCH_STEP = 24;
/** Where the root is moved inside the window to tell root-local from viewport coordinates. */
const SURFACE_OFFSET = new Vector2(50, 30);
/** A trackpad pan in wheel ticks, to check a gesture reaches JS with its own deltas. */
const PAN_DELTA = new Vector2(0.5, -2);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function settle(): Promise<void> {
  const startFrame = Engine.getProcessFrames();
  await new Promise(resolve => setTimeout(resolve, SETTLE_MS));
  while (Engine.getProcessFrames() - startFrame < MIN_SETTLE_FRAMES) {
    await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
  }
}

function get(api: DemoInspection, id: string): NativeSnapshotNode {
  const node = api.find(id);
  assert(node, `Missing test target ${id}`);
  return node;
}

function text(api: DemoInspection, id: string): string {
  const snapshot = api.snapshot();
  const collect = (node: NativeSnapshotNode): string => node.text + node.children.map(childID => {
    const child = snapshot.nodes.find(candidate => candidate.id === childID);
    assert(child, `Missing native child ${childID}`);
    return collect(child);
  }).join('');
  return collect(get(api, id));
}

function point(api: DemoInspection, id: string): Vector2 {
  const {rect} = get(api, id);
  assert(rect.width > 0 && rect.height > 0, `Target ${id} is hidden`);
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function pointer(position: Vector2, pressed: boolean): void {
  const event = new InputEventMouseButton();
  event.position = position;
  event.globalPosition = position;
  event.buttonIndex = MouseButton.MouseButtonLeft;
  event.pressed = pressed;
  Input.parseInputEvent(event);
}

const BUTTON_MASKS: Readonly<Partial<Record<MouseButton, number>>> = {
  [MouseButton.MouseButtonLeft]: MouseButtonMask.MouseButtonMaskLeft,
  [MouseButton.MouseButtonRight]: MouseButtonMask.MouseButtonMaskRight,
  [MouseButton.MouseButtonMiddle]: MouseButtonMask.MouseButtonMaskMiddle,
};

/** A press or release of any button, with the button mask a real device reports. */
function mouseButton(position: Vector2, button: MouseButton, pressed: boolean): void {
  const event = new InputEventMouseButton();
  event.position = position;
  event.globalPosition = position;
  event.buttonIndex = button;
  event.pressed = pressed;
  event.buttonMask = pressed ? BUTTON_MASKS[button] ?? 0 : 0;
  Input.parseInputEvent(event);
}

/** A real touch (device 0), which Godot also translates to an emulated mouse event. */
function touch(index: number, position: Vector2, pressed: boolean, canceled = false): void {
  const event = new InputEventScreenTouch();
  event.index = index;
  event.position = position;
  event.pressed = pressed;
  event.canceled = canceled;
  Input.parseInputEvent(event);
}

function touchDrag(index: number, position: Vector2, relative: Vector2): void {
  const event = new InputEventScreenDrag();
  event.index = index;
  event.position = position;
  event.relative = relative;
  Input.parseInputEvent(event);
}

function move(position: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = position;
  event.globalPosition = event.position;
  Input.parseInputEvent(event);
}

async function wheel(position: Vector2, button: MouseButton): Promise<void> {
  move(position);
  await settle();
  // A real wheel tick is a press followed at once by a release.
  for (const pressed of [true, false]) {
    const event = new InputEventMouseButton();
    event.position = position;
    event.globalPosition = position;
    event.buttonIndex = button;
    event.pressed = pressed;
    Input.parseInputEvent(event);
  }
  await settle();
}

async function pan(position: Vector2, delta: Vector2): Promise<void> {
  move(position);
  await settle();
  const event = new InputEventPanGesture();
  event.position = position;
  event.delta = delta;
  Input.parseInputEvent(event);
  await settle();
}

async function keyPress(keycode: Key, shift = false): Promise<void> {
  for (const pressed of [true, false]) {
    const event = new InputEventKey();
    event.keycode = keycode;
    event.pressed = pressed;
    event.shiftPressed = shift;
    Input.parseInputEvent(event);
    await settle();
  }
}

async function hover(api: DemoInspection, id: string): Promise<void> {
  move(point(api, id));
  await settle();
}

async function click(api: DemoInspection, id: string): Promise<void> {
  await hover(api, id);
  const position = point(api, id);
  pointer(position, true);
  await settle();
  pointer(position, false);
  await settle();
}

/** Measures actual Taffy output, including sibling separation and viewport clipping. */
function geometry(snapshot: NativeSnapshot): void {
  for (const node of snapshot.nodes) {
    const r = node.rect;
    if (r.width === 0 || r.height === 0) continue;
    assert(r.x >= -GEOMETRY_TOLERANCE && r.y >= -GEOMETRY_TOLERANCE, `Node ${node.id} escapes top/left`);
    assert(r.x + r.width <= snapshot.width + GEOMETRY_TOLERANCE, `Node ${node.id} escapes right: ${JSON.stringify(r)}`);
    assert(r.y + r.height <= snapshot.height + GEOMETRY_TOLERANCE, `Node ${node.id} escapes bottom: ${JSON.stringify(r)}`);
    const children = node.children.map(id => snapshot.nodes.find(candidate => candidate.id === id));
    for (let i = 0; i < children.length; i++) {
      const first = children[i];
      if (!first || first.rect.width === 0 || first.rect.height === 0) continue;
      const a = first.rect;
      assert(a.x >= r.x - GEOMETRY_TOLERANCE && a.y >= r.y - GEOMETRY_TOLERANCE &&
        a.x + a.width <= r.x + r.width + GEOMETRY_TOLERANCE &&
        a.y + a.height <= r.y + r.height + GEOMETRY_TOLERANCE, `Child ${first.id} escapes parent ${node.id}`);
      for (let j = i + 1; j < children.length; j++) {
        const second = children[j];
        if (!second || second.rect.width === 0 || second.rect.height === 0) continue;
        const b = second.rect;
        const overlapX = Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);
        const overlapY = Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
        assert(overlapX <= GEOMETRY_TOLERANCE || overlapY <= GEOMETRY_TOLERANCE,
          `Siblings ${first.id}/${second.id} overlap`);
      }
    }
  }
}

function probeValue(label: string, line: string): { frame: number; focused: number | null } {
  const match = /^(?:down|focus) frame=(\d+) focused=(\d+|none)$/.exec(line);
  assert(match, `${label} probe text is malformed: ${line}`);
  const [, frame = '', focused = ''] = match;
  return { frame: Number(frame), focused: focused === 'none' ? null : Number(focused) };
}

interface TimingSummary {
  samples: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  meanMs: number;
}

function summarize(durations: number[]): TimingSummary {
  assert(durations.length > 0, 'No dispatch timing samples were recorded');
  const sorted = [...durations].sort((a, b) => a - b);
  const at = (fraction: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    samples: sorted.length, minMs: sorted[0] ?? 0, p50Ms: at(0.5), p95Ms: at(0.95),
    maxMs: sorted[sorted.length - 1] ?? 0, meanMs: mean,
  };
}

/**
 * Press `id` `DISPATCH_SAMPLES` times and record how long the JS side spent in the one synchronous
 * dispatch each press causes: the first `events` sample after the press is the cancelable
 * `pointerdown` that native waits on.
 */
async function measureSynchronousDispatch(api: InteractionInspection, id: string): Promise<TimingSummary> {
  const position = point(api, id);
  move(position);
  await settle();
  api.takeProfile();
  const durations: number[] = [];
  for (let sample = 0; sample < DISPATCH_SAMPLES; sample++) {
    pointer(position, true);
    await settle();
    const first = api.takeProfile().js.samples.find(entry => entry.kind === 'events');
    assert(first && first.kind === 'events', `Press ${sample} on ${id} recorded no dispatch sample`);
    durations.push(first.durationMs);
    pointer(position, false);
    await settle();
    api.takeProfile();
  }
  return summarize(durations);
}

interface PadTally {
  downs: { mouse: number; touch: number };
  ids: number[];
  clicks: number[];
  doubleClicks: number;
  auxClicks: number;
  contextMenus: number;
  cancels: number;
}

function padTally(api: DemoInspection): PadTally {
  const match = /^down mouse (\d+) touch (\d+), ids ([\d,]+|none), clicks ([\d,]+|none), dbl (\d+), aux (\d+), ctx (\d+), cancel (\d+)$/.exec(text(api, 'pad-tally'));
  assert(match, `Malformed pad tally: ${text(api, 'pad-tally')}`);
  const list = (value: string | undefined) => value === undefined || value === 'none' ? [] : value.split(',').map(Number);
  return {
    downs: { mouse: Number(match[1]), touch: Number(match[2]) }, ids: list(match[3]), clicks: list(match[4]),
    doubleClicks: Number(match[5]), auxClicks: Number(match[6]), contextMenus: Number(match[7]), cancels: Number(match[8]),
  };
}

const HUD_TARGETS = [
  'hud-inventory', 'hud-map', 'hud-help', 'hud-lock', 'hud-panel', 'hud-wheel-consume', 'hud-wheel-pass',
] as const;

/** A point inside the window that none of the HUD's pointer targets covers. */
function emptyPoint(api: DemoInspection): Vector2 {
  const snapshot = api.snapshot();
  const rects = HUD_TARGETS.map(id => get(api, id).rect);
  for (let y = EMPTY_POINT_SEARCH_STEP; y < snapshot.height; y += EMPTY_POINT_SEARCH_STEP) {
    for (let x = EMPTY_POINT_SEARCH_STEP; x < snapshot.width; x += EMPTY_POINT_SEARCH_STEP) {
      if (!rects.some(r => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height)) return new Vector2(x, y);
    }
  }
  throw new Error('The HUD covers the whole window; there is no pass-through point to test');
}

function counts(api: InteractionInspection): PassthroughCounts {
  return api.passthrough();
}

/**
 * Plan I1: the root cooperates with Godot. Empty space and `pointer-events: none` regions belong to
 * the Controls underneath; keys, Tab and wheel ticks belong to the game unless React used them.
 */
async function verifyGodotCooperation(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  // The root takes no key focus when it enters the tree: only its owner or a focused element does.
  assert(!api.bareSurfaceHasFocus(), 'A root that has just entered the tree must not steal key focus');

  api.showLab('hud');
  await settle();
  api.resetPassthrough();
  api.grabSurfaceFocus();
  await settle();
  assert(api.surfaceHasFocus(), 'The owner can give the root key focus');
  await capture('09-passthrough-hud');
  const status = () => text(api, 'hud-status');
  const baseline = status();
  const empty = emptyPoint(api);

  // A press where only `pointer-events: none` elements lie goes to the Control behind the root, and
  // on to the game; React sees nothing.
  move(empty);
  await settle();
  assert(api.snapshot().hovered === null, `Nothing is hovered over a pass-through region: ${api.snapshot().hovered}`);
  pointer(empty, true);
  await settle();
  pointer(empty, false);
  await settle();
  let seen = counts(api);
  assert(seen.backdropPresses === 1, `The Control behind the root saw the press: ${JSON.stringify(seen)}`);
  assert(seen.unhandledPresses === 1, `The game's _unhandled_input saw the press: ${JSON.stringify(seen)}`);
  assert(status() === baseline, `No React handler ran for a pass-through press: ${status()}`);
  assert(api.cursorShapeAt(empty.x, empty.y) === Control.CursorShape.CursorArrow, 'Over nothing the cursor is the arrow');

  // The button inside the pass-through region takes pointers, and keeps them from the game.
  await hover(api, 'hud-map');
  const hoveredId = api.snapshot().hovered;
  assert(hoveredId !== null && (hoveredId === get(api, 'hud-map').id || get(api, 'hud-map').children.includes(hoveredId)),
    `Hover reaches an auto element inside a none region: ${hoveredId}`);
  await click(api, 'hud-inventory');
  seen = counts(api);
  assert(seen.backdropPresses === 1 && seen.unhandledPresses === 1, `A button press stays in React: ${JSON.stringify(seen)}`);
  assert(status().startsWith('inventory 1,'), `The button handled its click: ${status()}`);

  // An element with pointer-events none inside an auto one is never the target; the auto one is.
  await click(api, 'hud-panel-label');
  assert(status().includes('panel 1, label 0'), `The panel, not its none label, is the target: ${status()}`);
  assert(text(api, 'hud-pointer').startsWith('last panel press '), 'The panel saw the press');
  // Pressing something that cannot take focus clears element focus and hands key focus back: the
  // press itself still clicked, so the release did not cancel it.
  assert(api.snapshot().focused === null, 'A press on a non-focusable element clears element focus');
  assert(!api.surfaceHasFocus(), 'A press that leaves no element focused releases the root\'s key focus');

  // With no element focused and the root unfocused, every key belongs to the game.
  await keyPress(Key.KeyW);
  await keyPress(Key.KeyTab);
  seen = counts(api);
  assert(seen.unhandledKeys[Key.KeyW] === 1, `W reaches _unhandled_input: ${JSON.stringify(seen.unhandledKeys)}`);
  assert(seen.unhandledKeys[Key.KeyTab] === 1 && api.snapshot().focused === null,
    `Tab belongs to the game while the root has no key focus: ${JSON.stringify(seen.unhandledKeys)}`);

  // The owner gives the root key focus with no element focused: W still reaches the game, Tab does
  // not because it moved focus.
  api.grabSurfaceFocus();
  await settle();
  await keyPress(Key.KeyW);
  assert(counts(api).unhandledKeys[Key.KeyW] === 2, 'W reaches the game while the root has focus and no element is focused');
  await keyPress(Key.KeyTab);
  assert(api.snapshot().focused === get(api, 'hud-inventory').id, `Tab focuses the first button: ${api.snapshot().focused}`);
  assert(counts(api).unhandledKeys[Key.KeyTab] === 1, 'A Tab that moved focus is consumed');
  await keyPress(Key.KeyW);
  assert(counts(api).unhandledKeys[Key.KeyW] === 3, 'W still reaches the game after a React button took focus');
  await keyPress(Key.KeyTab);
  assert(api.snapshot().focused === get(api, 'hud-map').id, 'Tab moves to the next button');
  assert(counts(api).unhandledKeys[Key.KeyTab] === 1, 'Tab with an element focused is consumed too');
  await keyPress(Key.KeyEnter);
  assert(status().includes('map 1,'), `Enter activates the focused button: ${status()}`);
  assert(counts(api).unhandledKeys[Key.KeyEnter] === undefined, 'An activating Enter is consumed');
  await keyPress(Key.KeyTab, true);
  assert(api.snapshot().focused === get(api, 'hud-inventory').id, 'Shift+Tab moves back');
  await capture('10-hud-focus');

  // Nothing tabbable: Tab changes nothing, so it goes to the game.
  await click(api, 'hud-lock');
  assert(status().endsWith('locked true'), `The lock handled its click: ${status()}`);
  assert(api.snapshot().focused === null, 'Disabling the focused button removes focus');
  api.grabSurfaceFocus();
  await settle();
  await keyPress(Key.KeyTab);
  assert(api.snapshot().focused === null, 'A disabled button is not tabbable');
  assert(counts(api).unhandledKeys[Key.KeyTab] === 2, 'A Tab that moved nothing is not consumed');
  await click(api, 'hud-lock');
  assert(status().endsWith('locked false'), 'The buttons unlock');

  // Wheel: over empty space and over an element nobody handles it reaches the game; JS decides.
  const unhandledWheels = () => counts(api).unhandledWheels;
  const readout = () => text(api, 'hud-wheel-status');
  await wheel(empty, MouseButton.MouseButtonWheelDown);
  assert(unhandledWheels() === 1, 'A wheel tick over empty space reaches the game, once (the release is not a tick)');
  assert(readout().startsWith('consumed ticks 0, passed ticks 0'), `No React handler saw it: ${readout()}`);
  await wheel(point(api, 'hud-panel'), MouseButton.MouseButtonWheelUp);
  assert(unhandledWheels() === 2, 'A wheel tick over an element with no onWheel reaches the game');
  await wheel(point(api, 'hud-wheel-pass'), MouseButton.MouseButtonWheelRight);
  assert(unhandledWheels() === 3, 'A wheel tick a handler did not prevent reaches the game');
  assert(readout() === 'consumed ticks 0, passed ticks 1, last delta 1,0', `Wheel right is +x: ${readout()}`);
  await wheel(point(api, 'hud-wheel-consume'), MouseButton.MouseButtonWheelLeft);
  assert(unhandledWheels() === 3, 'A wheel tick whose handler called preventDefault is consumed');
  assert(readout() === 'consumed ticks 1, passed ticks 1, last delta -1,0', `Wheel left is -x: ${readout()}`);
  await wheel(point(api, 'hud-wheel-consume'), MouseButton.MouseButtonWheelUp);
  assert(readout().endsWith('last delta 0,-1'), `Wheel up is -y: ${readout()}`);
  await wheel(point(api, 'hud-wheel-consume'), MouseButton.MouseButtonWheelDown);
  assert(readout().endsWith('last delta 0,1'), `Wheel down is +y: ${readout()}`);
  // A trackpad pan reaches JS as a wheel with its own deltas. Godot's Input dispatches each gesture
  // twice (`Input::_parse_input_event_impl` sends gestures once explicitly and again with every
  // event), so a parsed pan is seen more than once by everything; what must hold is that JS and the
  // game see the same number of them, and that a prevented pan never reaches the game.
  const ticks = () => {
    const match = /consumed ticks (\d+), passed ticks (\d+)/.exec(readout());
    assert(match, `Malformed wheel readout: ${readout()}`);
    return { consumed: Number(match[1]), passed: Number(match[2]) };
  };
  const pansBefore = counts(api).unhandledPans;
  await pan(empty, PAN_DELTA);
  assert(counts(api).unhandledPans > pansBefore, 'A pan over empty space reaches the game');
  let before = { ...ticks(), pans: counts(api).unhandledPans };
  await pan(point(api, 'hud-wheel-consume'), PAN_DELTA);
  assert(readout().endsWith(`last delta ${PAN_DELTA.x},${PAN_DELTA.y}`), `A trackpad pan reaches JS as a wheel: ${readout()}`);
  assert(ticks().consumed > before.consumed, 'The consuming element saw the pan');
  assert(counts(api).unhandledPans === before.pans, 'A prevented pan is consumed');
  before = { ...ticks(), pans: counts(api).unhandledPans };
  await pan(point(api, 'hud-wheel-pass'), PAN_DELTA);
  const seenByJs = ticks().passed - before.passed;
  assert(seenByJs > 0, `An unprevented pan reaches the element's handler: ${readout()}`);
  assert(counts(api).unhandledPans - before.pans === seenByJs, 'Every pan JS declined reaches the game');

  // The cursor follows the element under the pointer, and inherits from its parent.
  const shapeAt = (id: string) => {
    const at = point(api, id);
    return api.cursorShapeAt(at.x, at.y);
  };
  assert(shapeAt('hud-map') === Control.CursorShape.CursorPointingHand, 'cursor-pointer shows the pointing hand');
  const mapRect = get(api, 'hud-map').rect;
  const padding = api.cursorShapeAt(mapRect.x + POINTER_PADDING_INSET, mapRect.y + POINTER_PADDING_INSET);
  assert(padding === Control.CursorShape.CursorPointingHand, 'The padding of a cursor-pointer button shows it too');
  const labelId = get(api, 'hud-map').children[0];
  assert(labelId !== undefined, 'The button has a label child');
  const label = api.snapshot().nodes.find(candidate => candidate.id === labelId);
  assert(label, `Missing the button's label node ${labelId}`);
  const labelCenter = new Vector2(label.rect.x + label.rect.width / 2, label.rect.y + label.rect.height / 2);
  assert(api.cursorShapeAt(labelCenter.x, labelCenter.y) === Control.CursorShape.CursorPointingHand,
    'The button\'s label inherits the cursor');
  assert(shapeAt('hud-help') === Control.CursorShape.CursorHelp, 'cursor-help shows the help cursor');
  assert(shapeAt('hud-panel') === Control.CursorShape.CursorMove, 'cursor-move shows the move cursor');
  assert(shapeAt('hud-inventory') === Control.CursorShape.CursorArrow, 'A button with no cursor shows the arrow');
  const panelLabel = point(api, 'hud-panel-label');
  assert(api.cursorShapeAt(panelLabel.x, panelLabel.y) === Control.CursorShape.CursorMove,
    'Over a pointer-events-none label the cursor is the panel\'s');

  // End to end: Godot asks the root for its cursor as the pointer moves and applies it to the window.
  await hover(api, 'hud-map');
  assert(DisplayServer.cursorGetShape() === DisplayServer.CursorShape.CursorPointingHand,
    `Moving over a cursor-pointer button sets the window cursor: ${DisplayServer.cursorGetShape()}`);
  await hover(api, 'hud-help');
  assert(DisplayServer.cursorGetShape() === DisplayServer.CursorShape.CursorHelp, 'Moving to cursor-help changes it');
  move(empty);
  await settle();
  assert(DisplayServer.cursorGetShape() === DisplayServer.CursorShape.CursorArrow, 'Leaving the HUD for the game restores the arrow');

  // viewportX/viewportY are canvas coordinates; x/y stay root-local.
  api.offsetSurface(SURFACE_OFFSET.x, SURFACE_OFFSET.y);
  await settle();
  const panelPoint = point(api, 'hud-panel');
  const inViewport = new Vector2(panelPoint.x + SURFACE_OFFSET.x, panelPoint.y + SURFACE_OFFSET.y);
  move(inViewport);
  await settle();
  pointer(inViewport, true);
  await settle();
  pointer(inViewport, false);
  await settle();
  const expected = `last panel press ${panelPoint.x},${panelPoint.y} viewport ${inViewport.x},${inViewport.y}`;
  assert(text(api, 'hud-pointer') === expected, `Pointer events carry root-local and canvas coordinates: ${text(api, 'hud-pointer')} != ${expected}`);
  api.offsetSurface(0, 0);
  await settle();

  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

/**
 * Plan I2: the pointer model. Every mouse button, click counting, touch pointers with the engine's
 * emulation left on, multi-touch, cancel, capture, and the root leaving the tree mid-press.
 */
async function verifyPointers(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  assert(ProjectSettings.getSetting('input_devices/pointing/emulate_mouse_from_touch') === true,
    'The pointer lab only proves the emulation is ignored while the engine emulates mouse events from touch');
  const reset = async () => {
    // A fresh lab: the pad's log and counters start empty.
    api.showLab('hud');
    await settle();
    api.showLab('pointers');
    await settle();
  };
  await reset();
  const lines = () => text(api, 'pad-log').split('\n').filter(line => line !== '');
  const pad = point(api, 'pad');
  const snapshotPointer = (id: number) => api.snapshot().pointers.find(entry => entry.id === id);
  await capture('11-pointers');

  // Right and middle buttons: pointerdown, then contextmenu on the right press, pointerup, auxclick;
  // never a click.
  move(pad);
  await settle();
  mouseButton(pad, MouseButton.MouseButtonRight, true);
  await settle();
  mouseButton(pad, MouseButton.MouseButtonRight, false);
  await settle();
  assert(lines().join('|') === 'pointerenter mouse#1 b-1 bs0 d0|pointerdown mouse#1 b2 bs2 d0|contextmenu mouse#1 b2 bs2 d0|pointerup mouse#1 b2 bs0 d0|auxclick mouse#1 b2 bs0 d1',
    `A right click is pointerdown, contextmenu, pointerup, auxclick: ${lines().join('|')}`);
  let seen = padTally(api);
  assert(seen.contextMenus === 1 && seen.auxClicks === 1 && seen.clicks.length === 0, `No click follows a right click: ${text(api, 'pad-tally')}`);
  mouseButton(pad, MouseButton.MouseButtonMiddle, true);
  mouseButton(pad, MouseButton.MouseButtonMiddle, false);
  await settle();
  assert(lines().slice(-3).join('|') === 'pointerdown mouse#1 b1 bs4 d0|pointerup mouse#1 b1 bs0 d0|auxclick mouse#1 b1 bs0 d1',
    `A middle click is an auxclick of button 1: ${lines().join('|')}`);
  seen = padTally(api);
  assert(seen.contextMenus === 1 && seen.auxClicks === 2 && seen.clicks.length === 0, 'A middle click is not a click and opens no menu');

  // Click counting: three quick presses count 1, 2, 3 with one dblclick, after the second.
  for (let press = 0; press < 3; press++) {
    mouseButton(pad, MouseButton.MouseButtonLeft, true);
    mouseButton(pad, MouseButton.MouseButtonLeft, false);
  }
  await settle();
  seen = padTally(api);
  assert(seen.clicks.join(',') === '1,2,3' && seen.doubleClicks === 1, `A triple click counts 1, 2, 3 with one dblclick: ${text(api, 'pad-tally')}`);
  assert(lines().filter(line => line.startsWith('dblclick')).join('|') === 'dblclick mouse#1 b0 bs0 d2', 'The dblclick carries detail 2');
  await capture('12-pointer-clicks');
  // A press after the interval starts a new sequence; so does one that is farther than the slop.
  await new Promise(resolve => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
  mouseButton(pad, MouseButton.MouseButtonLeft, true);
  mouseButton(pad, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(padTally(api).clicks.join(',') === '1,2,3,1', `A click after the interval counts 1 again: ${text(api, 'pad-tally')}`);
  const nearby = new Vector2(pad.x + CLICK_SLOP_BREAKER_PX, pad.y);
  mouseButton(nearby, MouseButton.MouseButtonLeft, true);
  mouseButton(nearby, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(padTally(api).clicks.join(',') === '1,2,3,1,1', `A click beyond the slop starts a sequence: ${text(api, 'pad-tally')}`);

  // Capture: the knob follows a drag wherever it goes, outside itself and the root and the window.
  const track = get(api, 'knob-track');
  const middle = (value: number) => new Vector2(track.rect.x + value * track.rect.width, track.rect.y + track.rect.height / 2);
  const readout = () => text(api, 'knob-readout');
  move(middle(0.05));
  await settle();
  mouseButton(middle(0.05), MouseButton.MouseButtonLeft, true);
  await settle();
  assert(readout().includes('captured true'), `Pressing the knob captures the pointer: ${readout()}`);
  const mouse = snapshotPointer(1);
  assert(mouse?.down === true && mouse.capture?.target === track.id && !mouse.capture.implicit,
    `Native records the explicit capture: ${JSON.stringify(mouse)}`);
  const valueOf = () => Number(/value (\d+)/.exec(readout())?.[1]);
  move(middle(0.5));
  await settle();
  assert(Math.abs(valueOf() - 50) <= 10, `Dragging inside the track moves the knob: ${readout()}`);
  const beyondRight = new Vector2(api.snapshot().width + OUTSIDE_THE_ROOT_PX, track.rect.y - OUTSIDE_THE_ROOT_PX);
  move(beyondRight);
  await settle();
  assert(valueOf() === 100, `Outside the root, to the right, the knob is at its end: ${readout()}`);
  const beyondLeft = new Vector2(-OUTSIDE_THE_ROOT_PX, track.rect.y + OUTSIDE_THE_ROOT_PX);
  move(beyondLeft);
  await settle();
  assert(valueOf() === 0, `Outside the root, to the left, the knob is at its start: ${readout()}`);
  move(middle(0.75));
  await capture('13-knob-captured');
  assert(Math.abs(valueOf() - 75) <= 10, `And back inside it follows again: ${readout()}`);
  mouseButton(beyondRight, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(readout().includes('captured false'), `The knob saw the pointerup outside the root: ${readout()}`);
  assert(snapshotPointer(1)?.capture === null && snapshotPointer(1)?.down === false, 'The capture ended with the press');
  const movesAfter = readout();
  move(middle(0.2));
  await settle();
  assert(readout() === movesAfter, 'Without a press the knob ignores the pointer');

  // An idle pointer cannot be captured, and the error says why.
  await click(api, 'capture-bad');
  assert(text(api, 'capture-status').startsWith('setPointerCapture failed: pointer 1 is not active'),
    `Capturing a pointer that is up is an error: ${text(api, 'capture-status')}`);

  // Touch, with the engine translating it to mouse events as well: one pointer, never a mouse press.
  await reset();
  // The mouse is parked away from the pad, so any hover left on it afterwards would come from the touch.
  move(FAR_CORNER);
  await settle();
  assert(get(api, 'pad').style.backgroundColor === PAD_REST_COLOR, 'The pad is unhovered before the touch');
  const before = padTally(api);
  touch(FIRST_TOUCH, pad, true);
  await settle();
  touch(FIRST_TOUCH, pad, false);
  await settle();
  seen = padTally(api);
  assert(seen.downs.touch === before.downs.touch + 1 && seen.downs.mouse === before.downs.mouse,
    `A touch is one touch pointerdown and no mouse press: ${text(api, 'pad-tally')}`);
  assert(lines().join('|') === `pointerenter touch#${FIRST_TOUCH_ID} b-1 bs0 d0|pointerdown touch#${FIRST_TOUCH_ID} b0 bs1 d0|pointerup touch#${FIRST_TOUCH_ID} b0 bs0 d0|pointerleave touch#${FIRST_TOUCH_ID} b-1 bs0 d0|click touch#${FIRST_TOUCH_ID} b0 bs0 d1`,
    `A tap is enter, down, up, leave, click: ${lines().join('|')}`);
  assert(seen.ids.join(',') === String(FIRST_TOUCH_ID), `The first touch is pointer ${FIRST_TOUCH_ID}: ${text(api, 'pad-tally')}`);
  const afterTap = api.snapshot();
  const padNode = get(api, 'pad');
  assert(afterTap.hovered !== padNode.id && !padNode.children.includes(afterTap.hovered ?? -1), `A touch never hovers: ${afterTap.hovered}`);
  assert(padNode.style.backgroundColor === PAD_REST_COLOR, `No hover paint is left after a tap: ${padNode.style.backgroundColor}`);
  assert(afterTap.pointers.every(entry => entry.type === 'mouse'), 'A finished touch leaves no pointer record');
  await capture('14-pointer-touch-tap');

  // Two fingers: two pointers, each captured to where it went down, independent of one another.
  const knobPoint = middle(0.1);
  touch(FIRST_TOUCH, pad, true);
  touch(SECOND_TOUCH, knobPoint, true);
  await settle();
  const both = api.snapshot().pointers.filter(entry => entry.type === 'touch');
  assert(both.map(entry => entry.id).join(',') === `${FIRST_TOUCH_ID},${SECOND_TOUCH_ID}` && both.every(entry => entry.down),
    `Two touches are two pointers, both down: ${JSON.stringify(both)}`);
  const padNodes = [get(api, 'pad').id, ...get(api, 'pad').children];
  assert(both[0]?.capture?.implicit === true && padNodes.includes(both[0].capture.target),
    `A touch is captured, without asking, to the element it went down on (here the pad's label): ${JSON.stringify(both[0])}`);
  assert(both[1]?.capture?.implicit === false && both[1].capture.target === get(api, 'knob-track').id,
    `The knob's own capture replaces the implicit one: ${JSON.stringify(both[1])}`);
  assert(padTally(api).ids.join(',') === `${FIRST_TOUCH_ID}`, 'The pad only saw the finger that went down on it');
  touchDrag(SECOND_TOUCH, new Vector2(api.snapshot().width + OUTSIDE_THE_ROOT_PX, 0), new Vector2(OUTSIDE_THE_ROOT_PX, 0));
  await settle();
  assert(valueOf() === 100, `A finger moving the knob far outside the root is still captured by it: ${readout()}`);
  touch(SECOND_TOUCH, knobPoint, false);
  touch(FIRST_TOUCH, pad, false);
  await settle();
  assert(api.snapshot().pointers.every(entry => !entry.down), 'Both fingers are up');

  // A cancelled touch ends with pointercancel: no pointerup and no click.
  const beforeCancel = padTally(api);
  touch(FIRST_TOUCH, pad, true);
  await settle();
  touch(FIRST_TOUCH, pad, false, true);
  await settle();
  seen = padTally(api);
  assert(seen.cancels === beforeCancel.cancels + 1 && seen.clicks.length === beforeCancel.clicks.length,
    `A cancelled touch is a pointercancel and no click: ${text(api, 'pad-tally')}`);
  assert(!lines().slice(-4).some(line => line.startsWith('pointerup') || line.startsWith('click')),
    `Nothing but the cancel and the leave follows: ${lines().join('|')}`);

  // The root leaving the scene tree mid-press cancels the pointer.
  api.resetPointerCancels();
  move(pad);
  await settle();
  mouseButton(pad, MouseButton.MouseButtonLeft, true);
  await settle();
  api.surfaceAttached(false);
  await settle();
  assert(api.pointerCancels() === 1, `Leaving the tree while a button is down cancels the pointer: ${api.pointerCancels()}`);
  api.surfaceAttached(true);
  await settle();
  mouseButton(pad, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(!api.snapshot().pointers.some(entry => entry.down), 'No pointer is left down');
  assert(padTally(api).cancels >= 1, 'The pad saw the cancel too');

  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

export async function runInteractionVerification(owner: Node, api: InteractionInspection): Promise<void> {
  const directory = OS.getEnvironment('GODOT_REACT_ARTIFACTS') || 'user://react-ui-verification';
  assert(DirAccess.makeDirRecursiveAbsolute(directory) === GError.Ok, 'Cannot create evidence directory');
  const captures: string[] = [];
  async function capture(name: string): Promise<void> {
    await settle();
    const snapshot = api.snapshot();
    geometry(snapshot);
    RenderingServer.forceDraw();
    const image = owner.getViewport()?.getTexture()?.getImage();
    assert(image, 'Native verification requires a rendered viewport');
    const path = `${directory}/${name}.png`;
    assert(image.savePng(path) === GError.Ok, `Could not save ${path}`);
    captures.push(path);
    const file = FileAccess.open(`${directory}/${name}.json`, FileAccess.ModeFlags.Write);
    assert(file, 'Cannot write geometry evidence');
    file.storeString(JSON.stringify(snapshot));
    file.close();
  }
  const focused = () => api.snapshot().focused;

  await settle();
  await click(api, 'tab-interaction');
  assert(api.find('interaction-lab'), 'The Interaction tab mounts its lab');
  await capture('01-interaction');

  // Capture runs from the outermost ancestor to the target, bubble back out.
  await click(api, 'event-inner');
  assert(text(api, 'event-log') === 'outer:capture middle:capture inner:capture inner:bubble middle:bubble outer:bubble',
    `Capture then bubble order: ${text(api, 'event-log')}`);
  await capture('02-capture-bubble');

  // stopPropagation in a capture handler prevents the rest of capture and all of bubble.
  await click(api, 'event-clear');
  await click(api, 'stop-toggle');
  assert(text(api, 'stop-toggle') === 'Stop in capture: on', 'Stop toggle reads on');
  await click(api, 'event-inner');
  assert(text(api, 'event-log') === 'outer:capture middle:capture', `Stopping in capture prevents bubble: ${text(api, 'event-log')}`);
  await capture('03-stop-in-capture');
  await click(api, 'stop-toggle');
  await click(api, 'event-clear');

  // preventDefault() on pointerdown stops native's focus default action; click still fires.
  await click(api, 'focus-normal');
  const normal = get(api, 'focus-normal').id;
  assert(focused() === normal, 'An unprevented press focuses its button');
  await click(api, 'focus-prevented');
  assert(focused() === normal, `A prevented press must not take focus: focused ${focused()}`);
  assert(text(api, 'focus-status') === 'Clicks: normal 1, no-focus 1', `Click follows a prevented pointerdown: ${text(api, 'focus-status')}`);
  await capture('04-prevent-default');

  // Dispatch is synchronous: the pointerdown handler runs before native's focus change, and the
  // resulting focus event is delivered inside the same input callback (the same process frame).
  await click(api, 'sync-probe');
  const probe = get(api, 'sync-probe').id;
  const down = probeValue('pointerdown', text(api, 'probe-down'));
  const focusEvent = probeValue('focus', text(api, 'probe-focus'));
  assert(down.focused === normal, `pointerdown handler runs before the default action: focus was ${down.focused}, expected ${normal}`);
  assert(focusEvent.focused === probe, `focus handler sees the new focus: ${focusEvent.focused}`);
  assert(down.frame === focusEvent.frame, `pointerdown and focus dispatch in one input callback: frames ${down.frame}/${focusEvent.frame}`);
  assert(focused() === probe, 'The unprevented press focused the probe button');

  // Enter and leave reach only the crossed elements (DOM semantics).
  const chainBackground = () => get(api, 'chain-parent').style.backgroundColor;
  await click(api, 'chain-clear');
  assert(chainBackground() === CHAIN_PARENT_REST, 'Crossing parent starts unhovered');
  await hover(api, 'chain-a');
  assert(chainBackground() === CHAIN_PARENT_HOVER, 'Entering a child hovers its parent');
  await hover(api, 'chain-b');
  assert(chainBackground() === CHAIN_PARENT_HOVER, 'Moving between siblings keeps the parent hovered');
  await capture('05-enter-leave');
  await hover(api, 'chain-clear');
  assert(chainBackground() === CHAIN_PARENT_REST, 'Leaving the group unhovers its parent');
  assert(text(api, 'chain-log') === 'parent:enter a:enter a:leave b:enter b:leave parent:leave',
    `Enter and leave chains: ${text(api, 'chain-log')}`);

  // Rule 3: a handler removes its own target while native is inside the press.
  await click(api, 'focus-normal');
  assert(focused() === normal, 'Focus starts on the normal button');
  const removeButton = point(api, 'self-remove');
  move(removeButton);
  await settle();
  pointer(removeButton, true);
  await settle();
  assert(!api.find('self-remove'), 'The handler removed its target');
  assert(focused() === normal, `The default action is skipped for a removed target: focused ${focused()}`);
  assert(api.snapshot().pressed === null, 'A removed pressed element is no longer pressed');
  pointer(removeButton, false);
  await settle();
  assert(text(api, 'reentrancy-status') === 'Button removed, clicks on it: 0', `No click reaches a removed target: ${text(api, 'reentrancy-status')}`);
  await capture('06-self-removed');
  await click(api, 'self-restore');
  assert(api.find('self-remove'), 'The removed button can be restored');

  // Rule 4: a handler takes the root out of the scene tree while native is inside the press.
  await click(api, 'focus-normal');
  const detachButton = point(api, 'danger-detach');
  move(detachButton);
  await settle();
  pointer(detachButton, true);
  await settle();
  pointer(detachButton, false);
  await settle();
  assert(owner.getChildCount() === 0, 'The handler detached the native root');
  const detached = api.snapshot();
  assert(detached.focused === null && detached.pressed === null && detached.hovered === null,
    `No default action ran on a detached root: ${JSON.stringify({focused: detached.focused, pressed: detached.pressed, hovered: detached.hovered})}`);
  api.surfaceAttached(true);
  await settle();
  await click(api, 'focus-normal');
  assert(focused() === normal, 'The same root works after re-entering the tree');
  await capture('07-reattached');

  // Rule 4, harder: the handler unmounts the React root and frees the surface.
  const unmountButton = point(api, 'danger-unmount');
  move(unmountButton);
  await settle();
  pointer(unmountButton, true);
  await settle();
  pointer(unmountButton, false);
  await settle();
  assert(owner.getChildCount() === 0, 'The unmounted surface was freed');
  let mounted = true;
  try {
    api.snapshot();
  } catch (error) {
    mounted = !(error instanceof Error && error.message.includes('not mounted'));
  }
  assert(!mounted, 'The handler unmounted the root');
  api.mount();
  await settle();
  assert(owner.getChildCount() === 1, 'A fresh surface mounts after the unmount');
  await click(api, 'tab-interaction');
  await click(api, 'focus-normal');
  assert(focused() === get(api, 'focus-normal').id, 'A fresh root dispatches normally');
  await capture('08-remounted');

  // What synchronous dispatch costs: JS time inside the one dispatch a press waits for.
  await click(api, 'event-clear');
  api.profile(true);
  const cheap = await measureSynchronousDispatch(api, 'focus-prevented');
  const stateful = await measureSynchronousDispatch(api, 'event-inner');
  api.profile(false);
  const timing = {cheapHandler: cheap, stateUpdatingHandler: stateful};
  const timingFile = FileAccess.open(`${directory}/dispatch-timing.json`, FileAccess.ModeFlags.Write);
  assert(timingFile, 'Cannot write dispatch timing evidence');
  timingFile.storeString(JSON.stringify(timing, null, 2));
  timingFile.close();
  console.log('GODOT_REACT_DISPATCH_TIMING', JSON.stringify(timing));
  move(FAR_CORNER);
  await settle();

  await verifyGodotCooperation(owner, api, capture);
  await verifyPointers(owner, api, capture);

  console.log('GODOT_REACT_INTERACTION_VERIFY_PASSED', JSON.stringify({captures, dispatchTiming: timing}));
}
