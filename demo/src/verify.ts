import {
  Color, DirAccess, Engine, FileAccess, GError, Input, InputEventKey, InputEventMouseButton,
  InputEventMouseMotion, Key, MouseButton, Node, OS, RenderingServer, Vector2,
} from 'godot';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import { getDemoLifecycle } from './app';
import { parseVerifierEvent } from './verifier-input';

export interface DemoInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  mount(): void;
  unmount(): void;
}

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
const GEOMETRY_TOLERANCE = 2;
const MAX_INPUT_TARGETS = 100;
const POINTER_PADDING_INSET = 4;
const FAILURE_TAIL_SAMPLES = 6;
/** The native focus ring colour (`FOCUS_RING_COLOR` in native/lib.rs) and how far a raster may stray. */
const FOCUS_RING_COLOR = new Color(0.49, 0.66, 1.0);
const FOCUS_RING_TOLERANCE = 0.02;
/** The ring is a 2px inset stroke, so one pixel inside an element's left edge is on it. */
const FOCUS_RING_PROBE_INSET = 1;

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

function viewportPixel(owner: Node, x: number, y: number): Color {
  RenderingServer.forceDraw();
  const image = owner.getViewport()?.getTexture()?.getImage();
  assert(image, 'Native verification requires a rendered viewport');
  return image.getPixel(Math.floor(x), Math.floor(y));
}

function isFocusRingColor(color: Color): boolean {
  return Math.abs(color.r - FOCUS_RING_COLOR.r) <= FOCUS_RING_TOLERANCE &&
    Math.abs(color.g - FOCUS_RING_COLOR.g) <= FOCUS_RING_TOLERANCE &&
    Math.abs(color.b - FOCUS_RING_COLOR.b) <= FOCUS_RING_TOLERANCE;
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
  parseVerifierEvent(event);
}

function move(position: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = position;
  event.globalPosition = event.position;
  parseVerifierEvent(event);
}

async function hover(api: DemoInspection, id: string): Promise<void> {
  move(point(api, id));
  await settle();
}

async function pressAndRelease(from: Vector2, to: Vector2): Promise<void> {
  move(from);
  pointer(from, true);
  await settle();
  move(to);
  pointer(to, false);
  await settle();
}

function inputFailureState(owner: Node, api: DemoInspection): string {
  const snapshot = api.snapshot();
  return JSON.stringify({counter: text(api, 'counter-value'), step: text(api, 'step-toggle'),
    rawMousePressed: Input.isMouseButtonPressed(MouseButton.MouseButtonLeft),
    rawMouseMask: Input.getMouseButtonMask(), accumulated: Input.useAccumulatedInput,
    processFrame: Engine.getProcessFrames(), windowFocused: owner.getWindow()?.hasFocus(),
    hovered: snapshot.hovered, focused: snapshot.focused, pressed: snapshot.pressed,
    stats: snapshot.stats});
}

/** Observe a failed assertion without resending input or converting it to success. */
export async function observeInputFailure(owner: Node, api: DemoInspection): Promise<void> {
  for (let sample = 0; sample < FAILURE_TAIL_SAMPLES; sample += 1) {
    console.log('GODOT_REACT_INPUT_FAILURE_TAIL', sample, inputFailureState(owner, api));
    await settle();
  }
}

async function click(api: DemoInspection, id: string): Promise<void> {
  await hover(api, id);
  const position = point(api, id);
  pointer(position, true);
  await settle();
  pointer(position, false);
  await settle();
}

async function key(keycode: Key): Promise<void> {
  for (const pressed of [true, false]) {
    const event = new InputEventKey();
    event.keycode = keycode;
    event.pressed = pressed;
    parseVerifierEvent(event);
    await settle();
  }
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

export async function runVerification(owner: Node, api: DemoInspection): Promise<void> {
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

  await settle();
  assert(text(api, 'counter-value') === '0', 'Initial React state');
  assert(getDemoLifecycle().appMounts === 1, 'App effect ran');
  await capture('01-counter');
  const passesBeforeHover = api.snapshot().stats.layoutPasses;
  await hover(api, 'increment');
  assert(api.snapshot().stats.layoutPasses === passesBeforeHover, 'Paint-only hover caused layout');
  await capture('02-hover');
  pointer(point(api, 'increment'), true);
  await capture('03-pressed');
  const pressed = get(api, 'increment').rect;
  // The ring marks a keyboard focus (plan 3.13, D17): pressing a button focuses it without the ring.
  // The regression this assertion used to guard (a focus change that restyles nothing must still
  // paint the ring) is covered with keyboard focus by the Keyboard lab in verify:interaction.
  assert(!isFocusRingColor(viewportPixel(owner, pressed.x + FOCUS_RING_PROBE_INSET, pressed.y + pressed.height / 2)),
    'A mouse press focuses the pressed button without painting the focus ring');
  pointer(point(api, 'increment'), false);
  await settle();
  if (text(api, 'counter-value') !== '1') throw new Error(`Native click updates useState: ${inputFailureState(owner, api)}`);
  assert(text(api, 'counter-derived').endsWith('2'), 'useMemo updates');
  await capture('04-incremented');
  await click(api, 'step-toggle');
  await click(api, 'increment');
  if (text(api, 'counter-value') !== '6') throw new Error(`Event closure uses new step: ${inputFailureState(owner, api)}`);
  await click(api, 'reset');
  await click(api, 'reset');
  assert(text(api, 'counter-value') === '0', 'Disabled reset does not change state');

  const button = get(api, 'increment').rect;
  const padding = new Vector2(button.x + button.width / 2, button.y + POINTER_PADDING_INSET);
  await pressAndRelease(padding, point(api, 'increment'));
  assert(text(api, 'counter-value') === '5', 'Padding-to-label release activates the same button');
  await click(api, 'reset');
  await pressAndRelease(point(api, 'increment'), padding);
  assert(text(api, 'counter-value') === '5', 'Label-to-padding release activates the same button');
  await click(api, 'reset');
  await pressAndRelease(point(api, 'increment'), new Vector2(0, 0));
  assert(text(api, 'counter-value') === '0', 'Releasing outside the button cancels activation');

  const increment = get(api, 'increment').id;
  // The release above left `increment` focused by the mouse. At least one Tab is pressed so the
  // focus that is captured is a keyboard focus (plan 3.13, D17), which is the one that paints the ring.
  let tabs = 0;
  do {
    await key(Key.KeyTab);
    tabs++;
  } while (api.snapshot().focused !== increment && tabs < MAX_INPUT_TARGETS);
  assert(api.snapshot().focused === increment, 'Tab reaches increment');
  await capture('05-keyboard-focus');
  const tabbed = get(api, 'increment').rect;
  assert(isFocusRingColor(viewportPixel(owner, tabbed.x + FOCUS_RING_PROBE_INSET, tabbed.y + tabbed.height / 2)),
    'A Tab focus paints the focus ring on the button even when its style has no focus rule');
  await key(Key.KeyEnter);
  assert(text(api, 'counter-value') === '5', 'Keyboard activates native target');
  await click(api, 'accent-toggle');
  await capture('06-context-accent');

  await click(api, 'tab-inventory');
  assert(getDemoLifecycle().counterCleanups === 1, 'Tab switch cleans effect');
  await capture('07-inventory');
  await click(api, 'item-carrot');
  const carrot = get(api, 'item-carrot');
  await click(api, 'reverse-items');
  assert(get(api, 'item-carrot').id === carrot.id, 'Keyed move preserves native node');
  const movedCarrot = get(api, 'item-carrot').rect;
  assert(movedCarrot.x !== carrot.rect.x || movedCarrot.y !== carrot.rect.y,
    'Keyed move lays the moved native node out at its new position');
  assert(text(api, 'item-state-carrot') === 'Selected 1 time', 'Keyed move preserves component state');
  await capture('08-reordered');
  await click(api, 'add-item');
  await click(api, 'add-item');
  assert(text(api, 'inventory-count') === '6 of 6 items', 'Insert native grid items');
  await capture('09-full-grid');
  await click(api, 'filter-tools');
  assert(text(api, 'inventory-count') === '3 of 6 items', 'Filter removes native branches');
  await capture('10-filtered');
  await click(api, 'filter-all');
  for (let i = 0; i < 6; i++) await click(api, 'remove-item');
  assert(api.find('inventory-empty'), 'Empty state mounted');
  await capture('11-empty');
  await click(api, 'add-item');
  assert(text(api, 'inventory-count') === '1 of 1 items', 'Reinsert after empty');
  await click(api, 'tab-counter');
  assert(text(api, 'counter-value') === '0', 'Tab re-entry mounts fresh state');
  await capture('12-reentry');
  const mountedNodeCount = api.snapshot().stats.nodeCount;
  for (let i = 0; i < 3; i++) {
    api.unmount();
    await settle();
    api.mount();
    await settle();
    assert(api.snapshot().stats.nodeCount === mountedNodeCount, 'Mount/unmount retained native nodes');
    assert(owner.getChildCount() === 1, 'Mount/unmount retained a Godot surface');
  }
  assert(getDemoLifecycle().appMounts - getDemoLifecycle().appCleanups === 1, 'Exactly one app effect remains');
  await capture('13-remounted');
  console.log('GODOT_REACT_VERIFY_PASSED', JSON.stringify({captures, lifecycle:getDemoLifecycle(), stats:api.snapshot().stats}));
}
