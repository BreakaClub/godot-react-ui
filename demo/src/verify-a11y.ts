import { Callable, DirAccess, DisplayServer, Engine, FileAccess, GArray, Input, InputEventKey, Key, OS, ReactUiRoot } from 'godot';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src';
import type { A11yInterference } from './a11y-main';
import { A11Y_INITIAL_SIZE, A11Y_SLIDER_MAX, A11Y_SLIDER_START } from './a11y-panel';

/** What the owner exposes (`godotReactA11y`) to the verifier. */
export interface A11yInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  surface(): ReactUiRoot;
  interference(): A11yInterference;
  engine(): { screenReaderFeature: boolean; screenReaderActive: number; enabled: boolean; supported: boolean };
}

/**
 * The device id of every event this verifier injects. The owner swallows events from any other device
 * while verifying, so a person using a real mouse or keyboard over the window cannot interleave with it.
 */
export const VERIFIER_DEVICE_ID = 1 << 30;
const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 3;
const FRAME_POLL_MS = 10;
const FILE_POLL_MS = 25;
/** The Node wrapper reads the accessibility tree in between; it gives up well before the run's own deadline. */
const WRAPPER_DEADLINE_MS = 90_000;
const DIRECTORY_VARIABLE = 'GODOT_REACT_A11Y_DIR';

/** Press the slider's arrow this many times; the value an assistive technology reads moves by that many steps. */
const ARROW_PRESSES = 5;
/** What a screen reader asks a slider to become with its set-value action. */
const SET_VALUE_REQUEST = 80;

/** The `AccessibilityAction` codes `native/accessibility_model.rs` binds into each action's callable. */
const ACTION_CLICK = 0;
const ACTION_FOCUS = 1;
const ACTION_BLUR = 2;
const ACTION_INCREMENT = 3;
const ACTION_DECREMENT = 4;
const ACTION_SET_VALUE = 5;

/** The test ids the Node wrapper looks for in the platform's tree, with the geometry native laid them out at. */
const REPORTED = [
  'a11y-root', 'a11y-title', 'a11y-caption', 'a11y-actions', 'a11y-save', 'a11y-delete', 'a11y-saves',
  'a11y-subscribe', 'a11y-select-all', 'a11y-sound', 'a11y-size', 'a11y-size-small', 'a11y-size-medium',
  'a11y-size-large', 'a11y-volume-thumb', 'a11y-hidden', 'a11y-hidden-text', 'a11y-hidden-button',
] as const;

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

function get(api: A11yInspection, testID: string): NativeSnapshotNode {
  const node = api.find(testID);
  assert(node, `Missing test target ${testID}`);
  return node;
}

/** Native serializes a prop nobody set as `null`. */
function isAbsent(value: unknown): boolean {
  return value === null || value === undefined;
}

function propsOf(api: A11yInspection, testID: string): Record<string, unknown> {
  return get(api, testID).props;
}

async function pressKey(keycode: Key): Promise<void> {
  for (const pressed of [true, false]) {
    const event = new InputEventKey();
    event.keycode = keycode;
    event.pressed = pressed;
    event.device = VERIFIER_DEVICE_ID;
    Input.parseInputEvent(event);
    await settle();
  }
}

function focus(api: A11yInspection, testID: string): void {
  const error = api.surface().focusNode(get(api, testID).id, 1);
  assert(error === '', `focus ${testID}: ${error}`);
}

/**
 * An assistive technology's action on `testID`, delivered the way the platform adapter delivers it: the
 * element's callable (`ReactUiRoot._on_accessibility_action`, bound with the tag and the action's code) called
 * with the request's data, which Godot passes first and the bound arguments follow.
 */
async function assistiveAction(api: A11yInspection, testID: string, code: number, data: unknown = null): Promise<void> {
  const callable = new Callable(api.surface(), '_on_accessibility_action').bindv(GArray.create([get(api, testID).id, code]));
  callable.call(data);
  await settle();
}

function write(directory: string, name: string, value: unknown): void {
  const file = FileAccess.open(`${directory}/${name}`, FileAccess.ModeFlags.Write);
  assert(file, `Cannot write ${directory}/${name}`);
  file.storeString(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  file.close();
}

async function waitForFile(path: string): Promise<void> {
  const started = Date.now();
  while (!FileAccess.fileExists(path)) {
    assert(Date.now() - started < WRAPPER_DEADLINE_MS, `The wrapper never wrote ${path}`);
    await new Promise(resolve => setTimeout(resolve, FILE_POLL_MS));
  }
}

/** Everything the wrapper compares the platform tree with. */
function report(api: A11yInspection): unknown {
  const nodes: Record<string, unknown> = {};
  for (const testID of REPORTED) {
    const node = get(api, testID);
    nodes[testID] = { id: node.id, kind: node.kind, text: node.text, rect: node.rect, props: node.props };
  }
  const snapshot = api.snapshot();
  const screen = DisplayServer.windowGetSize();
  const position = DisplayServer.windowGetPosition();
  return {
    processId: OS.getProcessId(),
    viewport: { width: snapshot.width, height: snapshot.height },
    window: {
      x: position.x, y: position.y, width: screen.x, height: screen.y,
      scale: DisplayServer.screenGetScale(), contentScaleFactor: api.surface().getWindow()?.contentScaleFactor ?? 1,
    },
    focused: snapshot.focused,
    engine: api.engine(),
    interference: api.interference(),
    nodes,
  };
}

/**
 * Phase I10 (native): drive the lab with Godot's own input, and with the assistive actions the platform adapter
 * would deliver, and leave the platform's accessibility tree to `scripts/verify-a11y.mjs`, which reads it from
 * outside the process before and after the changes below (it writes `go-mutate` and `go-finish` into the shared
 * directory). When the engine has no accessibility driver (`engine.enabled` is false: an engine built without
 * AccessKit), there is no tree to read: the checks of this file still run, `GODOT_REACT_A11Y_UNSUPPORTED` is
 * printed, and the wrapper reports that the platform half could not be verified.
 */
export async function runA11yVerification(api: A11yInspection): Promise<void> {
  const directory = OS.getEnvironment(DIRECTORY_VARIABLE);
  assert(directory !== '', `${DIRECTORY_VARIABLE} must name the directory shared with scripts/verify-a11y.mjs`);
  DirAccess.makeDirRecursiveAbsolute(directory);
  const engine = api.engine();
  console.log(`GODOT_REACT_A11Y_ENGINE ${JSON.stringify(engine)}`);
  await settle();

  const surface = api.surface();
  assert(propsOf(api, 'a11y-subscribe').ariaChecked === true, 'Subscribe starts checked');
  assert(propsOf(api, 'a11y-select-all').ariaChecked === 'mixed', 'Select all starts mixed');
  assert(propsOf(api, 'a11y-sound').ariaChecked === false, 'Sound starts off');
  assert(propsOf(api, 'a11y-size-medium').ariaChecked === true, `${A11Y_INITIAL_SIZE} starts selected`);
  assert(propsOf(api, 'a11y-volume-thumb').ariaValueNow === A11Y_SLIDER_START, 'Volume starts at its default');
  assert(propsOf(api, 'a11y-volume-thumb').role === 'slider' && isAbsent(propsOf(api, 'a11y-volume').role),
    'The slider thumb, not its root, carries the role');
  assert(propsOf(api, 'a11y-hidden').ariaHidden === true, 'The hidden subtree is marked aria-hidden');
  assert(get(api, 'a11y-delete').props.disabled === true, 'Delete is disabled');
  assert(api.snapshot().nodes.every(node => node.kind !== 'text' || isAbsent(node.props.role)), 'Text has no explicit role');

  const platformTree = engine.enabled;
  if (platformTree) {
    write(directory, 'ready.json', report(api));
    write(directory, 'ready.marker', 'ready');
    console.log('GODOT_REACT_A11Y_WAITING_FOR_FIRST_READ');
    await waitForFile(`${directory}/go-mutate`);
  }

  // ---- Godot's own input changes state; the platform tree must follow --------------------------------
  focus(api, 'a11y-subscribe');
  await pressKey(Key.KeySpace);
  assert(propsOf(api, 'a11y-subscribe').ariaChecked === false, 'Space unchecks Subscribe');
  focus(api, 'a11y-sound');
  await pressKey(Key.KeySpace);
  assert(propsOf(api, 'a11y-sound').ariaChecked === true, 'Space turns Sound on');
  focus(api, 'a11y-size-large');
  await pressKey(Key.KeySpace);
  assert(propsOf(api, 'a11y-size-large').ariaChecked === true && propsOf(api, 'a11y-size-medium').ariaChecked === false,
    'Space selects Large and deselects Medium');
  focus(api, 'a11y-volume-thumb');
  for (let press = 0; press < ARROW_PRESSES; press += 1) await pressKey(Key.KeyRight);
  const arrowed = A11Y_SLIDER_START + ARROW_PRESSES;
  assert(propsOf(api, 'a11y-volume-thumb').ariaValueNow === arrowed, `The arrow key moves Volume to ${arrowed}`);

  // ---- Assistive actions, as the platform adapter would deliver them -------------------------------------
  await assistiveAction(api, 'a11y-save', ACTION_CLICK);
  assert(get(api, 'a11y-saves').text === 'Saved 1 times', `A click action presses Save: ${get(api, 'a11y-saves').text}`);
  await assistiveAction(api, 'a11y-sound', ACTION_FOCUS);
  assert(api.snapshot().focused === get(api, 'a11y-sound').id, 'A focus action focuses Sound');
  await assistiveAction(api, 'a11y-sound', ACTION_BLUR);
  assert(api.snapshot().focused === null, 'A blur action takes focus away');
  await assistiveAction(api, 'a11y-volume-thumb', ACTION_INCREMENT);
  assert(propsOf(api, 'a11y-volume-thumb').ariaValueNow === arrowed + 1, 'An increment action steps Volume up');
  await assistiveAction(api, 'a11y-volume-thumb', ACTION_DECREMENT);
  await assistiveAction(api, 'a11y-volume-thumb', ACTION_DECREMENT);
  assert(propsOf(api, 'a11y-volume-thumb').ariaValueNow === arrowed - 1, 'Two decrement actions step it down twice');
  await assistiveAction(api, 'a11y-volume-thumb', ACTION_SET_VALUE, A11Y_SLIDER_MAX * 3);
  assert(propsOf(api, 'a11y-volume-thumb').ariaValueNow === A11Y_SLIDER_MAX, 'A set-value past the end stops at the end');
  await assistiveAction(api, 'a11y-volume-thumb', ACTION_SET_VALUE, SET_VALUE_REQUEST);
  assert(propsOf(api, 'a11y-volume-thumb').ariaValueNow === SET_VALUE_REQUEST, 'A set-value action sets Volume');
  // A disabled button takes no click action even when asked.
  const savesBefore = get(api, 'a11y-saves').text;
  await assistiveAction(api, 'a11y-delete', ACTION_CLICK);
  assert(get(api, 'a11y-saves').text === savesBefore, 'A click action on a disabled button does nothing');
  // End with focus on the slider, so the platform's focused element is the slider's thumb.
  await assistiveAction(api, 'a11y-volume-thumb', ACTION_FOCUS);
  assert(api.snapshot().focused === get(api, 'a11y-volume-thumb').id, 'A focus action focuses the slider thumb');
  assert(surface.hasFocus(), 'The root holds Godot key focus while an element is focused');
  await settle();
  console.log('GODOT_REACT_A11Y_NATIVE_PASSED');

  if (!platformTree) {
    write(directory, 'unsupported.json', { engine });
    write(directory, 'unsupported.marker', 'unsupported');
    console.log('GODOT_REACT_A11Y_UNSUPPORTED the engine has no accessibility driver; the platform tree was not read');
    return;
  }
  write(directory, 'mutated.json', report(api));
  write(directory, 'mutated.marker', 'mutated');
  console.log('GODOT_REACT_A11Y_WAITING_FOR_SECOND_READ');
  await waitForFile(`${directory}/go-finish`);
  console.log('GODOT_REACT_A11Y_VERIFY_PASSED');
}
