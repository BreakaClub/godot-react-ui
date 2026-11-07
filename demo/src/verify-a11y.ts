import { Callable, DirAccess, Engine, FileAccess, GArray, GDictionary, InputEventKey, Key, OS, ReactUiRoot, Vector2 } from 'godot';
import type { LayoutRect, NativeScrollState, NativeSnapshot, NativeSnapshotNode } from '../../src';
import { checkElements, checkFocus, type Reading } from '../../scripts/a11y-expectations.mjs';
import { findByLabel, flatten, type FlatNode } from '../../scripts/ax-tree.mjs';
import {
  A11Y_INITIAL_SIZE, A11Y_LOG_START, A11Y_NAME_START, A11Y_NOTES_START, A11Y_READONLY_TEXT, A11Y_SLIDER_MAX, A11Y_SLIDER_START,
} from './a11y-panel';
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
const TREE_DEADLINE_MS = 60_000;
const TREE_POLL_MS = 500;
/** One run of the dump tool reads a few hundred nodes; it takes a fraction of a second. */
const DUMP_DEADLINE_MS = 45_000;
const ARTIFACTS_VARIABLE = 'GODOT_REACT_ARTIFACTS';
/** The engine profile (scripts/engine.mjs), which the verify script exports and the runner passes on. */
const ENGINE_VARIABLE = 'GODOT_REACT_ENGINE';
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
const ACTION_SET_TEXT_SELECTION = 12;
const ACTION_REPLACE_SELECTED_TEXT = 13;
/** The codes `native/accessibility_model/scroll_bars.rs` binds into a scroll bar's callable: its axis, then its action. */
const SCROLL_BAR_AXIS_X = 0;
const SCROLL_BAR_AXIS_Y = 1;
const SCROLL_BAR_INCREMENT = 0;
const SCROLL_BAR_DECREMENT = 1;
/** Text that fits the log's two rows: its text area has nothing to scroll while it holds this. */
const LOG_SHORT_TEXT = 'short';
/** What the text actions put in the name field, in the order the verifier applies them. */
const SELECTED_FROM = 1;
const SELECTED_TO = 3;
const REPLACEMENT = 'XY';
const NEW_VALUE = 'Ada Lovelace';
/** Where "Lovelace" starts in it. */
const LOVELACE_FROM = 4;

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
/** The scroll child whose platform frame tells that the tree has followed a scroll, and the last child that only a scroll to the end shows. */
const SCROLL_PROBE_LABEL = 'Message 2';
const SCROLL_END_LABEL = 'Mark all read';
/** A scroll by `REQUESTED_SCROLL_TOP` pixels moves a child by more than this many points (half the scroll, on a retina display), whatever the display's scale. */
const SCROLL_FOLLOWED_POINTS = 5;
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

/**
 * An assistive technology's action on a scroll bar of `testID`'s scroll container, delivered the way the platform adapter
 * delivers it: the bar's callable (`ReactUiRoot._on_accessibility_scroll_bar_action`, bound with the container's tag, the
 * bar's axis and the action) called with the request's data, which an increment and a decrement do not have.
 */
async function scrollBarAction(api: A11yInspection, testID: string, axis: number, action: number): Promise<void> {
  const callable = new Callable(api.surface(), '_on_accessibility_scroll_bar_action').bindv(GArray.create([get(api, testID).id, axis, action]));
  callable.call(null);
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

/** What native knows of an element the platform tree is compared with: its rectangle, and for a scroll container its scroll state. */
interface ElementGeometry {
  rect: { x: number; y: number; width: number; height: number };
  scroll?: NativeScrollState;
}

/** The native geometry of the elements the platform tree is compared with, as `checkElements` reads it. */
function geometry(api: A11yInspection): Record<string, ElementGeometry> {
  const nodes: Record<string, ElementGeometry> = {};
  for (const node of api.snapshot().nodes) {
    const testID = node.props.testID;
    if (typeof testID !== 'string') continue;
    nodes[testID] = node.scroll ? { rect: node.rect, scroll: node.scroll } : { rect: node.rect };
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
  assert(get(api, 'a11y-name').kind === 'textinput' && get(api, 'a11y-name').textInput?.value === A11Y_NAME_START && propsOf(api, 'a11y-name').ariaLabel === 'Name',
    'The name field is a text input with its text and its label');
  assert(propsOf(api, 'a11y-notes').multiline === true && get(api, 'a11y-notes').textInput?.value === A11Y_NOTES_START, 'The notes field is a text area');
  assert(propsOf(api, 'a11y-readonly').readOnly === true, 'The reference field is read-only');
  assert(get(api, 'a11y-search').textInput?.showingPlaceholder === true && isAbsent(propsOf(api, 'a11y-search').ariaLabel),
    'The search field is empty, shows its placeholder and has no label of its own');

  // The combobox: a text input that says it is expanded, names its list and the option the arrows are on (tags, as native has no ids).
  const fruitInput = propsOf(api, 'a11y-fruit-input');
  assert(get(api, 'a11y-fruit-input').kind === 'textinput' && fruitInput.role === 'combobox' && fruitInput.ariaExpanded === true,
    `The fruit input is a text input with the combobox role, expanded: ${JSON.stringify({ role: fruitInput.role, expanded: fruitInput.ariaExpanded })}`);
  assert(fruitInput.ariaControls === get(api, 'a11y-fruit-list').id && fruitInput.ariaActiveDescendant === get(api, 'a11y-fruit-item-apple').id,
    `It names its list and its active option by tag: ${JSON.stringify({ controls: fruitInput.ariaControls, active: fruitInput.ariaActiveDescendant })}`);
  assert(propsOf(api, 'a11y-fruit-list').role === 'listbox' && propsOf(api, 'a11y-fruit-item-apple').role === 'option',
    'The list is a listbox of options');

  // ---- The dump tool reaches this process whatever the engine exposes: the window is always there ----------
  const outline = await readTree(directory, 'ax-window.json', nodes => nodes.some(node => node.role === 'AXWindow'));
  assert(outline !== undefined && flatten(outline.tree).some(node => node.role === 'AXWindow'),
    'ax-dump could not read this process\'s window through the Accessibility API');

  // ---- The platform's view of the initial state ---------------------------------------------------------
  const platformTree = engine.enabled;
  // The mixed checkbox reads as unchecked on the stock engine, where that was recorded; any other engine must convey it.
  const mixedGap = OS.getEnvironment(ENGINE_VARIABLE) === 'stock';
  const failures: string[] = [];
  // What the engine cannot convey (scripts/a11y-expectations.mjs): the same each time it is read, logged once.
  const gaps: string[] = [];
  /** Where the platform tree had the first scroll child before any scroll: a later reading moves from it once it follows one. */
  let baselineMessageY: number | undefined;
  if (platformTree) {
    const before = await readTree(directory, 'ax-before.json', nodes => findByLabel(nodes, 'Save', ['AXButton']).length > 0);
    assert(before !== undefined, 'The platform never exposed an accessibility tree for the lab');
    failures.push(...checkElements(before, 0, geometry(api), gaps, { mixedGap }).map(failure => `before: ${failure}`));
    baselineMessageY = findByLabel(flatten(before.tree), SCROLL_PROBE_LABEL, ['AXStaticText'])[0]?.frame?.y;
    assert(baselineMessageY !== undefined, `The platform tree has no "${SCROLL_PROBE_LABEL}" before any scroll`);
  }
  /**
   * The platform's view of the lab at a scroll position (plan D38: the accessibility update each scroll requests keeps a
   * live tree current). Read after the Godot-side scroll has settled, and judged in full like the others: every frame
   * must agree with where native has the element now, so a tree that did not follow the scroll fails. `satisfied` is
   * only the wait for the update to arrive; the judgement is the same whenever it does.
   */
  const readScrolled = async (name: string, satisfied: (nodes: FlatNode[]) => boolean): Promise<void> => {
    if (!platformTree) return;
    const reading = await readTree(directory, name, satisfied);
    assert(reading !== undefined, `The platform never exposed the scrolled tree for ${name}`);
    failures.push(...checkElements(reading, 1, geometry(api), gaps, { mixedGap }).map(failure => `${name}: ${failure}`));
  };

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
  // ---- Text field actions: the platform reads the text and its selection and changes them -------------------------
  const textOf = (testID: string): { value: string; selection: [number, number]; eventCount: number } => {
    const state = get(api, testID).textInput;
    assert(state, `${testID} is a text input`);
    return { value: state.value, selection: [state.selectionStart, state.selectionEnd], eventCount: state.eventCount };
  };
  await assistiveAction(api, 'a11y-name', ACTION_FOCUS);
  assert(api.snapshot().focused === get(api, 'a11y-name').id, 'A focus action focuses a text field');
  await assistiveAction(api, 'a11y-name', ACTION_SET_TEXT_SELECTION, GDictionary.create({ start_char: SELECTED_FROM, end_char: SELECTED_TO }));
  assert(textOf('a11y-name').selection.join() === `${SELECTED_FROM},${SELECTED_TO}`, `A set-text-selection action selects: ${textOf('a11y-name').selection}`);
  assert(textOf('a11y-name').value === A11Y_NAME_START, 'and changes no text');
  await assistiveAction(api, 'a11y-name', ACTION_REPLACE_SELECTED_TEXT, REPLACEMENT);
  assert(textOf('a11y-name').value === `${A11Y_NAME_START[0]}${REPLACEMENT}`, `A replace-selected-text action replaces the selection: ${textOf('a11y-name').value}`);
  assert(textOf('a11y-name').selection.join() === '3,3', `and leaves the caret after it: ${textOf('a11y-name').selection}`);
  await assistiveAction(api, 'a11y-name', ACTION_SET_VALUE, NEW_VALUE);
  assert(textOf('a11y-name').value === NEW_VALUE, `A set-value action sets the text: ${textOf('a11y-name').value}`);
  assert(textOf('a11y-name').selection.join() === `${NEW_VALUE.length},${NEW_VALUE.length}`, `with the caret after it: ${textOf('a11y-name').selection}`);
  // An assistive technology deletes a selection by replacing it with nothing.
  await assistiveAction(api, 'a11y-name', ACTION_SET_TEXT_SELECTION, GDictionary.create({ start_char: LOVELACE_FROM, end_char: NEW_VALUE.length }));
  await assistiveAction(api, 'a11y-name', ACTION_REPLACE_SELECTED_TEXT, '');
  assert(textOf('a11y-name').value === NEW_VALUE.slice(0, LOVELACE_FROM), `A replace-selected-text action with no text deletes the selection: ${JSON.stringify(textOf('a11y-name').value)}`);
  assert(textOf('a11y-name').selection.join() === `${LOVELACE_FROM},${LOVELACE_FROM}`, `and leaves the caret where it was: ${textOf('a11y-name').selection}`);
  const deletions = textOf('a11y-name').eventCount;
  await assistiveAction(api, 'a11y-name', ACTION_REPLACE_SELECTED_TEXT, '');
  assert(textOf('a11y-name').eventCount === deletions, 'and with nothing selected it deletes nothing');
  await assistiveAction(api, 'a11y-name', ACTION_SET_VALUE, NEW_VALUE);
  assert(textOf('a11y-name').value === NEW_VALUE, 'A set-value action puts the name back');
  const readOnlyCount = textOf('a11y-readonly').eventCount;
  // A set-value that is refused leaves the caret where it was, not after the text it did not set.
  await assistiveAction(api, 'a11y-readonly', ACTION_SET_TEXT_SELECTION, GDictionary.create({ start_char: 0, end_char: 2 }));
  await assistiveAction(api, 'a11y-readonly', ACTION_SET_VALUE, 'changed');
  assert(textOf('a11y-readonly').selection.join() === '0,2', `A refused set-value moves nothing: ${textOf('a11y-readonly').selection}`);
  await assistiveAction(api, 'a11y-readonly', ACTION_REPLACE_SELECTED_TEXT, 'changed');
  assert(textOf('a11y-readonly').value === A11Y_READONLY_TEXT && textOf('a11y-readonly').eventCount === readOnlyCount, 'The edit actions change a read-only field not at all');
  await assistiveAction(api, 'a11y-readonly', ACTION_SET_TEXT_SELECTION, GDictionary.create({ start_char: 0, end_char: A11Y_READONLY_TEXT.length }));
  assert(textOf('a11y-readonly').selection.join() === `0,${A11Y_READONLY_TEXT.length}`, 'but its text can be selected');
  // A text area's selection names the row (its element) each end is on and a character in that row's hard line, as the
  // platform adapter does (AccessibilityServerAccessKit, SetTextSelection). Rows exist once the platform has read the tree.
  if (platformTree) {
    const notesTag = get(api, 'a11y-notes').id;
    const rows = api.surface().getTextLineElements(notesTag);
    assert(rows.size() === 2, `The two-line text area has a row element for each line: ${rows.size()}`);
    const firstLineLength = A11Y_NOTES_START.indexOf('\n') + 1;
    await assistiveAction(api, 'a11y-notes', ACTION_SET_TEXT_SELECTION, GDictionary.create({
      start_element: rows.get(1), start_char: 0, end_element: rows.get(1), end_char: 3,
    }));
    assert(textOf('a11y-notes').selection.join() === `${firstLineLength},${firstLineLength + 3}`,
      `A selection on the second line counts from the start of that line: ${textOf('a11y-notes').selection}`);
    await assistiveAction(api, 'a11y-notes', ACTION_SET_TEXT_SELECTION, GDictionary.create({
      start_element: rows.get(0), start_char: 2, end_element: rows.get(1), end_char: 4,
    }));
    assert(textOf('a11y-notes').selection.join() === `2,${firstLineLength + 4}`,
      `and one across both lines runs from a character of the first to a character of the second: ${textOf('a11y-notes').selection}`);
  }
  await assistiveAction(api, 'a11y-notes', ACTION_SET_VALUE, 'one\ntwo\nthree');
  assert(textOf('a11y-notes').value === 'one\ntwo\nthree', 'A set-value action gives a text area its line breaks');
  await assistiveAction(api, 'a11y-notes', ACTION_SET_VALUE, A11Y_NOTES_START);
  assert(textOf('a11y-notes').value === A11Y_NOTES_START, 'and puts them back');
  // The platform reads this selection ("Lovelace") when it reads the tree again.
  await assistiveAction(api, 'a11y-name', ACTION_SET_TEXT_SELECTION, GDictionary.create({ start_char: LOVELACE_FROM, end_char: NEW_VALUE.length }));
  assert(textOf('a11y-name').selection.join() === `${LOVELACE_FROM},${NEW_VALUE.length}`, `A set-text-selection action selects a name: ${textOf('a11y-name').selection}`);
  await assistiveAction(api, 'a11y-name', ACTION_BLUR);
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
  await readScrolled('ax-scrolled.json', nodes => {
    const moved = findByLabel(nodes, SCROLL_PROBE_LABEL, ['AXStaticText'])[0]?.frame?.y;
    return moved !== undefined && baselineMessageY !== undefined && Math.abs(moved - baselineMessageY) > SCROLL_FOLLOWED_POINTS;
  });
  await assistiveAction(api, 'a11y-scroller', ACTION_SET_SCROLL_OFFSET, new Vector2(0, SCROLL_PAST_END));
  assert(scrollOf().scrollTop === scrollOf().maxScrollTop, `and clamps a request past the end to the end: ${scrollOf().scrollTop}`);
  assert(inView('a11y-scroll-end'), 'which shows the last item');
  await readScrolled('ax-scrolled-end.json', nodes => findByLabel(nodes, SCROLL_END_LABEL, ['AXButton']).length > 0);
  await assistiveAction(api, 'a11y-scroller', ACTION_SET_SCROLL_OFFSET, new Vector2(0, 0));
  assert(scrollOf().scrollTop === 0 && !inView('a11y-scroll-end'), 'A set-scroll-offset action to zero goes back to the top');
  await assistiveAction(api, 'a11y-scroll-end', ACTION_SCROLL_INTO_VIEW);
  assert(inView('a11y-scroll-end') && scrollOf().scrollTop > 0, `A scroll-into-view action on the last item scrolls it into view: ${scrollOf().scrollTop}`);
  await assistiveAction(api, 'a11y-message-1', ACTION_SCROLL_INTO_VIEW);
  assert(inView('a11y-message-1'), 'and one on the first row scrolls back to it');
  assert(api.snapshot().focused === focusBefore, 'Scrolling moved no focus');
  // ---- Scroll bar actions: each axis that can scroll has a bar whose increment and decrement scroll a step ---------
  const scrollStateOf = (testID: string): NativeScrollState => {
    const scroll = get(api, testID).scroll;
    assert(scroll, `${testID} is a scroll container`);
    return scroll;
  };
  const messages = scrollStateOf('a11y-scroller');
  assert(messages.tracks?.x === null && messages.tracks?.y !== null, `The messages view has a track for its vertical axis only: ${JSON.stringify(messages.tracks)}`);
  assert(scrollStateOf('a11y-gallery').tracks?.x !== null && scrollStateOf('a11y-gallery').tracks?.y !== null, 'The gallery has a track for each axis');
  assert(scrollStateOf('a11y-notes').tracks?.x === null && scrollStateOf('a11y-notes').tracks?.y === null, 'A text area that fits its text has no track');
  assert(scrollStateOf('a11y-log').tracks?.y !== null && scrollStateOf('a11y-log').maxScrollTop > 0, 'A text area that overflows has a vertical track');
  await assistiveAction(api, 'a11y-scroller', ACTION_SET_SCROLL_OFFSET, new Vector2(0, 0));
  // The arrow key is the step an assistive technology's increment must match.
  focus(api, 'a11y-scroller');
  await pressKey(Key.KeyDown);
  const arrowStep = scrollOf().scrollTop;
  assert(near(arrowStep, step), `The Down key scrolls a step, an eighth of the client height: ${arrowStep} for ${step}`);
  await scrollBarAction(api, 'a11y-scroller', SCROLL_BAR_AXIS_Y, SCROLL_BAR_INCREMENT);
  assert(near(scrollOf().scrollTop, 2 * arrowStep), `An increment action on the vertical bar scrolls the same step as the Down key: ${scrollOf().scrollTop}`);
  await scrollBarAction(api, 'a11y-scroller', SCROLL_BAR_AXIS_Y, SCROLL_BAR_DECREMENT);
  assert(near(scrollOf().scrollTop, arrowStep), `and a decrement action steps back: ${scrollOf().scrollTop}`);
  await pressKey(Key.KeyUp);
  assert(near(scrollOf().scrollTop, 0), `which is where the Up key goes too: ${scrollOf().scrollTop}`);
  await scrollBarAction(api, 'a11y-scroller', SCROLL_BAR_AXIS_Y, SCROLL_BAR_DECREMENT);
  assert(scrollOf().scrollTop === 0, 'A decrement at the start stays there');
  await scrollBarAction(api, 'a11y-scroller', SCROLL_BAR_AXIS_X, SCROLL_BAR_INCREMENT);
  assert(scrollOf().scrollLeft === 0 && scrollOf().scrollTop === 0, 'The sideways axis of a vertical-only view has no bar, so its action moves nothing');
  await assistiveAction(api, 'a11y-scroller', ACTION_SET_SCROLL_OFFSET, new Vector2(0, SCROLL_PAST_END));
  await scrollBarAction(api, 'a11y-scroller', SCROLL_BAR_AXIS_Y, SCROLL_BAR_INCREMENT);
  assert(scrollOf().scrollTop === scrollOf().maxScrollTop, 'An increment at the end stays there');
  // Both axes: the horizontal bar steps a width, the vertical one a height, and neither moves the other axis.
  const galleryStateOf = (): NativeScrollState => scrollStateOf('a11y-gallery');
  assert(galleryStateOf().maxScrollLeft > 0 && galleryStateOf().maxScrollTop > 0, `The gallery overflows on both axes: ${JSON.stringify(galleryStateOf())}`);
  const galleryStep = { x: galleryStateOf().clientWidth / SCROLL_PAGE_DIVISOR, y: galleryStateOf().clientHeight / SCROLL_PAGE_DIVISOR };
  focus(api, 'a11y-gallery');
  await pressKey(Key.KeyRight);
  assert(near(galleryStateOf().scrollLeft, galleryStep.x) && galleryStateOf().scrollTop === 0, `The Right key scrolls the gallery a step sideways: ${galleryStateOf().scrollLeft}`);
  await scrollBarAction(api, 'a11y-gallery', SCROLL_BAR_AXIS_X, SCROLL_BAR_INCREMENT);
  assert(near(galleryStateOf().scrollLeft, 2 * galleryStep.x) && galleryStateOf().scrollTop === 0,
    `An increment on the horizontal bar scrolls the same step as the Right key, along its axis only: ${galleryStateOf().scrollLeft},${galleryStateOf().scrollTop}`);
  await scrollBarAction(api, 'a11y-gallery', SCROLL_BAR_AXIS_X, SCROLL_BAR_DECREMENT);
  assert(near(galleryStateOf().scrollLeft, galleryStep.x), `A decrement on the horizontal bar steps back: ${galleryStateOf().scrollLeft}`);
  await scrollBarAction(api, 'a11y-gallery', SCROLL_BAR_AXIS_Y, SCROLL_BAR_INCREMENT);
  assert(near(galleryStateOf().scrollTop, galleryStep.y) && near(galleryStateOf().scrollLeft, galleryStep.x),
    `and one on the vertical bar scrolls a height step down without moving the other axis: ${galleryStateOf().scrollLeft},${galleryStateOf().scrollTop}`);
  // A text area is a scroll container: its vertical bar scrolls its text. The platform's last reading finds the gallery and the log scrolled.
  const logStep = scrollStateOf('a11y-log').clientHeight / SCROLL_PAGE_DIVISOR;
  assert(scrollStateOf('a11y-log').scrollTop === 0, 'The log shows its first lines');
  await scrollBarAction(api, 'a11y-log', SCROLL_BAR_AXIS_Y, SCROLL_BAR_INCREMENT);
  assert(near(scrollStateOf('a11y-log').scrollTop, logStep), `An increment on a text area's bar scrolls its text a step: ${scrollStateOf('a11y-log').scrollTop} for ${logStep}`);
  await scrollBarAction(api, 'a11y-log', SCROLL_BAR_AXIS_X, SCROLL_BAR_INCREMENT);
  assert(scrollStateOf('a11y-log').scrollLeft === 0, 'and the text area has no sideways bar');
  // A bar goes when its axis stops scrolling and comes back when it scrolls again: the text area's text shrinks to fit, then grows.
  await assistiveAction(api, 'a11y-log', ACTION_SET_VALUE, LOG_SHORT_TEXT);
  assert(scrollStateOf('a11y-log').maxScrollTop === 0 && scrollStateOf('a11y-log').tracks?.y === null && scrollStateOf('a11y-log').scrollTop === 0,
    `A text area whose text fits has nothing to scroll and no track: ${JSON.stringify(scrollStateOf('a11y-log'))}`);
  if (platformTree) {
    const hasBar = (nodes: FlatNode[]): boolean => findByLabel(nodes, 'Log', ['AXTextArea']).some(node => (node.children ?? []).some(child => child.role === 'AXScrollBar'));
    const fits = await readTree(directory, 'ax-log-fits.json', nodes => !hasBar(nodes));
    if (fits === undefined || findByLabel(flatten(fits.tree), 'Log', ['AXTextArea']).length !== 1) failures.push('fits: the platform tree has no Log text area');
    else if (hasBar(flatten(fits.tree))) failures.push('fits: the Log text area kept its scroll bar after its text stopped overflowing');
  }
  await assistiveAction(api, 'a11y-log', ACTION_SET_VALUE, A11Y_LOG_START);
  assert(scrollStateOf('a11y-log').maxScrollTop > 0 && scrollStateOf('a11y-log').tracks?.y !== null, 'and it has a track again when its text overflows');
  // A set-value leaves the caret after the text, and the text area scrolls to show it: it rests at the end of its range.
  const restored = scrollStateOf('a11y-log');
  assert(restored.scrollTop === restored.maxScrollTop, `The caret after the restored text is in view, at the end of the range: ${restored.scrollTop} of ${restored.maxScrollTop}`);
  await scrollBarAction(api, 'a11y-log', SCROLL_BAR_AXIS_Y, SCROLL_BAR_DECREMENT);
  assert(near(scrollStateOf('a11y-log').scrollTop, restored.maxScrollTop - logStep), `whose new bar steps its text back: ${scrollStateOf('a11y-log').scrollTop}`);
  // An action on a scroll container with nothing to scroll, or a malformed one, moves nothing.
  await scrollBarAction(api, 'a11y-notes', SCROLL_BAR_AXIS_Y, SCROLL_BAR_INCREMENT);
  assert(scrollStateOf('a11y-notes').scrollTop === 0, 'A text area that fits its text has no bar to increment');
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
  failures.push(...checkElements(after, 1, geometry(api), gaps, { mixedGap }).map(failure => `after: ${failure}`));
  const platformFocus = checkFocus(after);
  failures.push(...platformFocus.failures.map(failure => `after: ${failure}`));
  if (platformFocus.note !== undefined) console.log(`GODOT_REACT_A11Y_NOTE ${platformFocus.note}`);
  for (const gap of new Set(gaps)) console.log(`GODOT_REACT_A11Y_GAP ${gap}`);
  write(directory, 'snapshot-geometry.json', geometry(api));
  assert(failures.length === 0, `The platform's accessibility tree is wrong:\n - ${failures.join('\n - ')}`);
  // What this run did not judge, and what the engine cannot convey, in the line the script reads: a pass that skipped the
  // platform's focus says so, and so does one that accepted a recorded gap.
  const skipped = platformFocus.note === undefined ? [] : ['platform focus (the window is not the key window)'];
  const recordedGaps = [...new Set([...gaps].map(gap => gap.slice(0, gap.indexOf(':'))))];
  console.log('GODOT_REACT_A11Y_VERIFY_PASSED', JSON.stringify({ partial: skipped.length > 0, skipped, gaps: recordedGaps }));
}
