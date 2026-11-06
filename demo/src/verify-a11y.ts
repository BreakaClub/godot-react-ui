import { Callable, DirAccess, Engine, FileAccess, GArray, InputEventKey, Key, OS, ReactUiRoot, Vector2 } from 'godot';
import type { LayoutRect, NativeScrollState, NativeSnapshot, NativeSnapshotNode } from '../../src';
import { checkElements, checkFocus, type Reading } from '../../scripts/a11y-expectations.mjs';
import { findByLabel, flatten, type FlatNode } from '../../scripts/ax-tree.mjs';
import { A11Y_INITIAL_SIZE, A11Y_SLIDER_MAX, A11Y_SLIDER_START } from './a11y-panel';
import { parseVerifierEvent } from './verifier-input';

/** What the owner exposes (`godotReactA11y`) to the verifier. */
export interface A11yInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  surface(): ReactUiRoot;
  engine(): { screenReaderFeature: boolean; screenReaderActive: number; enabled: boolean; supported: boolean };
}

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 3;
const FRAME_POLL_MS = 10;
const FILE_POLL_MS = 25;
/** The platform adapter builds its tree on the first request; the elements may take a few frames after it. */
const TREE_DEADLINE_MS = 30_000;
const TREE_POLL_MS = 500;
/** One run of the dump tool reads a few hundred nodes; it takes a fraction of a second. */
const DUMP_DEADLINE_MS = 20_000;
const ARTIFACTS_VARIABLE = 'GODOT_REACT_ARTIFACTS';
/** The compiled `scripts/ax-dump.swift`, which `scripts/verify-a11y.mjs` builds and names here. */
const AX_DUMP_VARIABLE = 'GODOT_REACT_AX_DUMP';

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
const ACTION_SCROLL_UP = 6;
const ACTION_SCROLL_DOWN = 7;
const ACTION_SCROLL_LEFT = 8;
const ACTION_SCROLL_RIGHT = 9;
const ACTION_SET_SCROLL_OFFSET = 10;
const ACTION_SCROLL_INTO_VIEW = 11;

/** `AccessibilityServer.AccessibilityScrollUnit`, which the platform adapter sends with a scroll action. */
const SCROLL_UNIT_ITEM = 0;
const SCROLL_UNIT_PAGE = 1;
/** A scroll step is the client size divided by this (`SCROLL_PAGE_DIVISOR` in native/scroll.rs). */
const SCROLL_PAGE_DIVISOR = 8;
/** Where a set-scroll-offset request puts the scroll view, and a request far past its end. */
const REQUESTED_SCROLL_TOP = 40;
const SCROLL_PAST_END = 100_000;
/** Offsets are floats; this is how far a reading may differ from the step it should be. */
const SCROLL_TOLERANCE = 0.01;
/** The scroll view's border (`border`): its client area starts this far inside its rectangle. */
const SCROLLER_BORDER_PX = 1;

/** What a run that could not read the platform tree logs, so `scripts/verify-a11y.mjs` can tell it from a failure. */
export const UNSUPPORTED_MARKER = 'GODOT_REACT_A11Y_UNSUPPORTED';
export const NOT_TRUSTED_MARKER = 'GODOT_REACT_A11Y_NOT_TRUSTED';

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
    parseVerifierEvent(event);
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

async function sleep(milliseconds: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

/** The native geometry of the elements the platform tree is compared with, as `checkElements` reads it. */
function geometry(api: A11yInspection): Record<string, { rect: { x: number; y: number; width: number; height: number } }> {
  const nodes: Record<string, { rect: { x: number; y: number; width: number; height: number } }> = {};
  for (const node of api.snapshot().nodes) {
    const testID = node.props.testID;
    if (typeof testID === 'string') nodes[testID] = { rect: node.rect };
  }
  return nodes;
}

/**
 * One reading of this process's accessibility tree through `scripts/ax-dump.swift`, started with
 * `OS.createProcess` and not `OS.execute`: the tool asks this process's main thread for its tree, so waiting
 * for it on that thread would never end. The tool writes its result to `file` in one step; this polls for it
 * while the main loop keeps running. Reads again until `satisfied` holds or the deadline passes.
 */
async function readTree(directory: string, name: string, satisfied: (nodes: FlatNode[]) => boolean): Promise<Reading | undefined> {
  const axDump = OS.getEnvironment(AX_DUMP_VARIABLE);
  assert(axDump !== '', `${AX_DUMP_VARIABLE} must name the compiled scripts/ax-dump.swift`);
  const file = `${directory}/${name}`;
  const deadline = Date.now() + TREE_DEADLINE_MS;
  let last: Reading | undefined;
  for (;;) {
    if (FileAccess.fileExists(file)) DirAccess.removeAbsolute(file);
    const child = OS.createProcess(axDump, [String(OS.getProcessId()), '--output', file]);
    assert(child > 0, `Cannot start ${axDump}`);
    const started = Date.now();
    while (!FileAccess.fileExists(file)) {
      assert(Date.now() - started < DUMP_DEADLINE_MS, `${axDump} wrote nothing to ${file}`);
      await sleep(FILE_POLL_MS);
    }
    const parsed: unknown = JSON.parse(FileAccess.getFileAsString(file));
    assert(typeof parsed === 'object' && parsed !== null, `${file} is not a JSON object`);
    if ('error' in parsed) {
      const { error, detail } = parsed as { error: string; detail: string };
      if (error === 'not-trusted') throw new Error(`${NOT_TRUSTED_MARKER}: ${detail}`);
      assert(error === 'no-application', `ax-dump failed (${error}): ${detail}`);
    } else {
      last = parsed as Reading;
      if (satisfied(flatten(last.tree))) return last;
    }
    if (Date.now() > deadline) return last;
    await sleep(TREE_POLL_MS);
  }
}

/**
 * Phase I10 (native): the lab in a real window, read three ways. Godot's own input and the assistive actions
 * the platform adapter would deliver change its state, the native snapshot says what native knows, and, when the
 * engine has an accessibility driver, `scripts/ax-dump.swift` reads the tree the platform exposes before and after
 * the changes and `scripts/a11y-expectations.mjs` judges it. Without a driver (an engine built without AccessKit)
 * there is no tree to read: the Godot-side checks still run, and the run then fails with `UNSUPPORTED_MARKER` so it
 * is never mistaken for a pass.
 */
export async function runA11yVerification(api: A11yInspection): Promise<void> {
  const directory = OS.getEnvironment(ARTIFACTS_VARIABLE);
  assert(directory !== '', `${ARTIFACTS_VARIABLE} must name the evidence directory`);
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

  // ---- The dump tool reaches this process whatever the engine exposes: the window is always there ----------
  const outline = await readTree(directory, 'ax-window.json', nodes => nodes.some(node => node.role === 'AXWindow'));
  assert(outline !== undefined && flatten(outline.tree).some(node => node.role === 'AXWindow'),
    'ax-dump could not read this process\'s window through the Accessibility API');

  // ---- The platform's view of the initial state ---------------------------------------------------------
  const platformTree = engine.enabled;
  const failures: string[] = [];
  if (platformTree) {
    const before = await readTree(directory, 'ax-before.json', nodes => findByLabel(nodes, 'Save', ['AXButton']).length > 0);
    assert(before !== undefined, 'The platform never exposed an accessibility tree for the lab');
    failures.push(...checkElements(before, 0, geometry(api)).map(failure => `before: ${failure}`));
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
  // ---- Scroll actions on a scroll container, as the platform adapter would deliver them ---------------------------
  const scrollOf = (): NativeScrollState => {
    const scroll = get(api, 'a11y-scroller').scroll;
    assert(scroll, 'The scroll view is a scroll container');
    return scroll;
  };
  const clientRect = (): LayoutRect => {
    const { rect } = get(api, 'a11y-scroller');
    return { x: rect.x + SCROLLER_BORDER_PX, y: rect.y + SCROLLER_BORDER_PX, width: scrollOf().clientWidth, height: scrollOf().clientHeight };
  };
  const inView = (testID: string): boolean => {
    const client = clientRect();
    const { rect } = get(api, testID);
    return rect.y >= client.y - SCROLL_TOLERANCE && rect.y + rect.height <= client.y + client.height + SCROLL_TOLERANCE;
  };
  const step = scrollOf().clientHeight / SCROLL_PAGE_DIVISOR;
  const focusBefore = api.snapshot().focused;
  assert(scrollOf().scrollTop === 0 && scrollOf().maxScrollTop > 0 && scrollOf().maxScrollLeft === 0,
    `The scroll view starts at the top with room to scroll down only: ${JSON.stringify(scrollOf())}`);
  assert(!inView('a11y-scroll-end'), 'The last item starts out of view');
  const near = (actual: number, expected: number): boolean => Math.abs(actual - expected) <= SCROLL_TOLERANCE;
  await assistiveAction(api, 'a11y-scroller', ACTION_SCROLL_DOWN, SCROLL_UNIT_ITEM);
  assert(near(scrollOf().scrollTop, step), `A scroll-down action by an item scrolls a step: ${scrollOf().scrollTop} for ${step}`);
  await assistiveAction(api, 'a11y-scroller', ACTION_SCROLL_DOWN, SCROLL_UNIT_PAGE);
  assert(near(scrollOf().scrollTop, step + scrollOf().clientHeight), `and by a page scrolls the client height: ${scrollOf().scrollTop}`);
  await assistiveAction(api, 'a11y-scroller', ACTION_SCROLL_UP, SCROLL_UNIT_PAGE);
  assert(near(scrollOf().scrollTop, step), `A scroll-up action by a page goes back: ${scrollOf().scrollTop}`);
  await assistiveAction(api, 'a11y-scroller', ACTION_SCROLL_UP);
  assert(near(scrollOf().scrollTop, 0), `A scroll-up action with no unit scrolls an item, as the engine reads it: ${scrollOf().scrollTop}`);
  await assistiveAction(api, 'a11y-scroller', ACTION_SCROLL_UP, SCROLL_UNIT_PAGE);
  assert(scrollOf().scrollTop === 0, 'Scrolling up at the top stays there');
  await assistiveAction(api, 'a11y-scroller', ACTION_SCROLL_RIGHT, SCROLL_UNIT_PAGE);
  await assistiveAction(api, 'a11y-scroller', ACTION_SCROLL_LEFT, SCROLL_UNIT_PAGE);
  assert(scrollOf().scrollLeft === 0 && scrollOf().scrollTop === 0, 'Sideways actions leave a vertical-only view where it was');
  await assistiveAction(api, 'a11y-scroller', ACTION_SET_SCROLL_OFFSET, new Vector2(0, REQUESTED_SCROLL_TOP));
  assert(near(scrollOf().scrollTop, REQUESTED_SCROLL_TOP), `A set-scroll-offset action scrolls to the offset: ${scrollOf().scrollTop}`);
  await assistiveAction(api, 'a11y-scroller', ACTION_SET_SCROLL_OFFSET, new Vector2(0, SCROLL_PAST_END));
  assert(scrollOf().scrollTop === scrollOf().maxScrollTop, `and clamps a request past the end to the end: ${scrollOf().scrollTop}`);
  assert(inView('a11y-scroll-end'), 'which shows the last item');
  await assistiveAction(api, 'a11y-scroller', ACTION_SET_SCROLL_OFFSET, new Vector2(0, 0));
  assert(scrollOf().scrollTop === 0 && !inView('a11y-scroll-end'), 'A set-scroll-offset action to zero goes back to the top');
  await assistiveAction(api, 'a11y-scroll-end', ACTION_SCROLL_INTO_VIEW);
  assert(inView('a11y-scroll-end') && scrollOf().scrollTop > 0, `A scroll-into-view action on the last item scrolls it into view: ${scrollOf().scrollTop}`);
  await assistiveAction(api, 'a11y-message-1', ACTION_SCROLL_INTO_VIEW);
  assert(inView('a11y-message-1'), 'and one on the first row scrolls back to it');
  assert(api.snapshot().focused === focusBefore, 'Scrolling moved no focus');
  // End with focus on the slider, so the platform's focused element is the slider's thumb.
  await assistiveAction(api, 'a11y-volume-thumb', ACTION_FOCUS);
  assert(api.snapshot().focused === get(api, 'a11y-volume-thumb').id, 'A focus action focuses the slider thumb');
  assert(surface.hasFocus(), 'The root holds Godot key focus while an element is focused');

  await settle();
  console.log('GODOT_REACT_A11Y_NATIVE_PASSED');

  if (!platformTree) {
    throw new Error(`${UNSUPPORTED_MARKER}: the engine has no accessibility driver (it was built without AccessKit), so the platform tree was not read`);
  }
  // ---- The platform's view of the changed state ---------------------------------------------------------
  const after = await readTree(directory, 'ax-after.json', nodes => findByLabel(nodes, 'Volume', ['AXSlider'])
    .some(node => Number(node.value) === SET_VALUE_REQUEST));
  assert(after !== undefined, 'The platform stopped exposing the accessibility tree');
  failures.push(...checkElements(after, 1, geometry(api)).map(failure => `after: ${failure}`));
  const platformFocus = checkFocus(after);
  failures.push(...platformFocus.failures.map(failure => `after: ${failure}`));
  if (platformFocus.note !== undefined) console.log(`GODOT_REACT_A11Y_NOTE ${platformFocus.note}`);
  write(directory, 'snapshot-geometry.json', geometry(api));
  assert(failures.length === 0, `The platform's accessibility tree is wrong:\n - ${failures.join('\n - ')}`);
  console.log('GODOT_REACT_A11Y_VERIFY_PASSED');
}
