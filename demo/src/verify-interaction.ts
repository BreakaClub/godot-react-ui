import {
  DirAccess, Engine, FileAccess, GError, Input, InputEventMouseButton, InputEventMouseMotion,
  MouseButton, Node, OS, RenderingServer, Vector2,
} from 'godot';
import type { RendererProfile } from '../../src';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import type { DemoInspection } from './verify';

export interface InteractionInspection extends DemoInspection {
  /** Detach/reattach the same native Control, preserving the React root and state. */
  surfaceAttached(attached: boolean): void;
  profile(enabled: boolean): void;
  takeProfile(): { js: RendererProfile };
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

function move(position: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = position;
  event.globalPosition = event.position;
  Input.parseInputEvent(event);
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

  console.log('GODOT_REACT_INTERACTION_VERIFY_PASSED', JSON.stringify({captures, dispatchTiming: timing}));
}
