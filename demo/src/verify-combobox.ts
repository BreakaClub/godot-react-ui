import {
  Engine, InputEventKey, InputEventMouseButton, InputEventMouseMotion, Key, MouseButton, MouseButtonMask, Node, Vector2, Window,
} from 'godot';
import type { LayoutRect, NativeSnapshotNode } from '../../src/native';
import type { InteractionInspection } from './verify-interaction';
import { assertionTally, parseVerifierEvent } from './verifier-input';
import { typeText } from './verify-text-input';

/**
 * The combobox kit part (`docs/tracks/combobox.md`) in a window, with Godot's own input events (`Input.parseInputEvent`,
 * marked as the verifier's): a mouse that moves, presses and wheels, and keys with the characters they type. The lab is
 * `combobox-lab.tsx`: a single combobox beside a button its list does not cover, a multiple one whose chips wrap, a
 * disabled one, and one fixed to the bottom of the window with a long list. Every claim of the unit tests that depends on
 * native (focus moving, a press that is or is not prevented, layout, the list's placement, the accessibility props that reach
 * native) is checked here against the snapshot, and the states are captured.
 */

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
/** Frames between the events of one click. */
const CLICK_PAUSE_FRAMES = 2;
const FAR_CORNER = new Vector2(1, 1);
/** `DEFAULT_SIDE_OFFSET` of the kit: the gap between a control and its list. */
const LIST_GAP = 4;
const GEOMETRY_TOLERANCE = 1.5;
/** A point this far inside a list's left edge is on its border and padding, where no option is. */
const LIST_EDGE_INSET = 2;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function settle(): Promise<void> {
  const startFrame = Engine.getProcessFrames();
  await new Promise(resolve => setTimeout(resolve, SETTLE_MS));
  while (Engine.getProcessFrames() - startFrame < MIN_SETTLE_FRAMES) {
    await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
  }
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

type Api = Pick<InteractionInspection, 'find' | 'snapshot' | 'showLab' | 'resizeSurface' | 'restoreDemo' | 'grabSurfaceFocus' | 'scrollTo'>;

function node(api: Api, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

function centreOf(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function near(actual: number, expected: number, message: string): void {
  assert(Math.abs(actual - expected) <= GEOMETRY_TOLERANCE, `${message}: ${actual} against ${expected}`);
}

// ---------------------------------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------------------------------

/**
 * Injected positions are window pixels, which the window divides by its content scale: at scale 2 a logical point is
 * twice as far (docs/tracks/hidpi.md). 1 except while the states are captured at device pixel ratio 2.
 */
let inputScale = 1;

function windowPixels(position: Vector2): Vector2 {
  return new Vector2(position.x * inputScale, position.y * inputScale);
}

function move(position: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = windowPixels(position);
  event.globalPosition = event.position;
  parseVerifierEvent(event);
}

function button(position: Vector2, pressed: boolean): void {
  const event = new InputEventMouseButton();
  event.position = windowPixels(position);
  event.globalPosition = event.position;
  event.buttonIndex = MouseButton.MouseButtonLeft;
  event.pressed = pressed;
  event.buttonMask = pressed ? MouseButtonMask.MouseButtonMaskLeft : 0;
  parseVerifierEvent(event);
}

/** A press and release at one place: the pointer arrives, goes down and comes up a few frames apart, as a hand does. */
async function press(position: Vector2): Promise<void> {
  move(position);
  await frames(CLICK_PAUSE_FRAMES);
  button(position, true);
  await frames(CLICK_PAUSE_FRAMES);
  button(position, false);
  await settle();
}

async function hover(position: Vector2): Promise<void> {
  move(position);
  await settle();
}

/** One wheel tick at `position` with the pointer where it is: a press and a release of the wheel button, at once. */
async function wheelTick(position: Vector2, wheelButton: MouseButton): Promise<void> {
  for (const pressed of [true, false]) {
    const event = new InputEventMouseButton();
    event.position = windowPixels(position);
    event.globalPosition = event.position;
    event.buttonIndex = wheelButton;
    event.pressed = pressed;
    parseVerifierEvent(event);
  }
  await settle();
}

/** The pointer arrives at `position`, and a wheel tick follows. */
async function wheel(position: Vector2, wheelButton: MouseButton): Promise<void> {
  move(position);
  await settle();
  await wheelTick(position, wheelButton);
}

interface KeySpec {
  keycode: Key;
  alt?: boolean;
  shift?: boolean;
}

function keyEvent(spec: KeySpec, pressed: boolean): void {
  const event = new InputEventKey();
  event.keycode = spec.keycode;
  event.physicalKeycode = spec.keycode;
  event.keyLabel = spec.keycode;
  event.pressed = pressed;
  event.altPressed = spec.alt === true;
  event.shiftPressed = spec.shift === true;
  parseVerifierEvent(event);
}

async function tap(spec: KeySpec): Promise<void> {
  keyEvent(spec, true);
  await frames(CLICK_PAUSE_FRAMES);
  keyEvent(spec, false);
  await settle();
}

const DOWN: KeySpec = { keycode: Key.KeyDown };
const UP: KeySpec = { keycode: Key.KeyUp };
const LEFT: KeySpec = { keycode: Key.KeyLeft };
const ENTER: KeySpec = { keycode: Key.KeyEnter };
const ESCAPE: KeySpec = { keycode: Key.KeyEscape };
const BACKSPACE: KeySpec = { keycode: Key.KeyBackspace };
const DELETE: KeySpec = { keycode: Key.KeyDelete };
const HOME: KeySpec = { keycode: Key.KeyHome };
const END: KeySpec = { keycode: Key.KeyEnd };
const TAB: KeySpec = { keycode: Key.KeyTab };
const ALT_DOWN: KeySpec = { keycode: Key.KeyDown, alt: true };
const ALT_UP: KeySpec = { keycode: Key.KeyUp, alt: true };

// ---------------------------------------------------------------------------------------------------
// Reading the page
// ---------------------------------------------------------------------------------------------------

interface Readout {
  fruit: string | null;
  tags: string[];
  bottom: string | null;
}

function readout(api: Api): Readout {
  return JSON.parse(node(api, 'cb-json').text) as Readout;
}

/** The text native holds in the input `id` of the lab (`cb-<id>-input`). */
function textIn(api: Api, id: string): string {
  const state = node(api, `cb-${id}-input`).textInput;
  assert(state, `cb-${id}-input is not a text input`);
  return state.value;
}

function isOpen(api: Api, id: string): boolean {
  return api.find(`cb-${id}-list`) !== undefined;
}

/** A prop as native holds it: the snapshot reports a prop that was never set as `null`. */
function prop(candidate: NativeSnapshotNode, key: string): unknown {
  return candidate.props[key] ?? undefined;
}

function testIDOf(candidate: NativeSnapshotNode | undefined): string | undefined {
  const testID = candidate?.props.testID;
  return typeof testID === 'string' ? testID : undefined;
}

function focusedTestID(api: Api): string | undefined {
  const snapshot = api.snapshot();
  return testIDOf(snapshot.nodes.find(candidate => candidate.id === snapshot.focused));
}

/** The values of the options the list `id` shows, in the order it shows them. */
function listed(api: Api, id: string): string[] {
  const prefix = `cb-${id}-item-`;
  return api.snapshot().nodes
    .filter(candidate => (testIDOf(candidate) ?? '').startsWith(prefix))
    .sort((left, right) => left.documentIndex - right.documentIndex)
    .map(candidate => (testIDOf(candidate) ?? '').slice(prefix.length));
}

/** The option the input `id` says it is on, through `aria-activedescendant`, or `undefined`. */
function activeOption(api: Api, id: string): string | undefined {
  const tag = prop(node(api, `cb-${id}-input`), 'ariaActiveDescendant');
  if (tag === undefined) return undefined;
  assert(typeof tag === 'number', `aria-activedescendant is a tag: ${String(tag)}`);
  const target = api.snapshot().nodes.find(candidate => candidate.id === tag);
  assert(target, `aria-activedescendant names ${tag}, which is not mounted`);
  const prefix = `cb-${id}-item-`;
  const testID = testIDOf(target) ?? '';
  assert(testID.startsWith(prefix), `aria-activedescendant names ${testID}, not an option of ${id}`);
  return testID.slice(prefix.length);
}

/** The chips of the multiple combobox `id`, in order. */
function chipValues(api: Api, id: string): string[] {
  const prefix = `cb-${id}-chip-`;
  return api.snapshot().nodes
    .filter(candidate => (testIDOf(candidate) ?? '').startsWith(prefix))
    .sort((left, right) => left.documentIndex - right.documentIndex)
    .map(candidate => (testIDOf(candidate) ?? '').slice(prefix.length));
}

function optionPoint(api: Api, id: string, value: string): Vector2 {
  return centreOf(node(api, `cb-${id}-item-${value}`).rect);
}


function chipRects(api: Api, id: string): LayoutRect[] {
  return chipValues(api, id).map(value => node(api, `cb-${id}-chip-${value}`).rect);
}

/** The window the section may scale to draw at device pixel ratio 2. */
function requireWindow(owner: Node): Window {
  const window = owner.getWindow();
  assert(window, 'The combobox section requires its window');
  return window;
}

/** How many chips the multiple combobox is given before it wraps, at the lab's 320 px. */
const CHIPS_TO_WRAP = ['blueberry', 'date', 'fig'];

// ---------------------------------------------------------------------------------------------------
// The section
// ---------------------------------------------------------------------------------------------------

type Capture = (name: string, overflowing?: readonly string[]) => Promise<void>;

export async function verifyCombobox(owner: Node, api: Api, capture: Capture): Promise<void> {
  api.showLab('hud');
  await settle();
  api.showLab('combobox');
  await settle();
  move(FAR_CORNER);
  await settle();

  await verifySingle(api);
  await verifyTags(api);
  await verifyBottom(api);
  await verifyDisabled(api);
  await captureStates(owner, api, capture, 1);
  await captureStates(owner, api, capture, 2);

  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

/** Press on the lab's title, which is bare page: nothing there takes focus, so the press clears it. */
async function pressAway(api: Api): Promise<void> {
  await press(centreOf(node(api, 'cb-title').rect));
}

async function verifySingle(api: Api): Promise<void> {
  const control = () => node(api, 'cb-fruit').rect;
  const input = () => node(api, 'cb-fruit-input');
  const list = () => node(api, 'cb-fruit-list');
  assert(readout(api).fruit === null && !isOpen(api, 'fruit'), 'The single combobox starts empty and closed');
  assert(prop(input(), 'role') === 'combobox' && prop(input(), 'ariaExpanded') === false, `The input is a combobox that is not expanded: ${JSON.stringify(input().props)}`);

  // A press in the input focuses it and opens the list under the control.
  await press(centreOf(input().rect));
  assert(focusedTestID(api) === 'cb-fruit-input', `A press in the input focuses it: ${focusedTestID(api)}`);
  assert(isOpen(api, 'fruit'), 'A press in the input opens the list');
  near(list().rect.x, control().x, 'The list is left-aligned with the control');
  near(list().rect.y, control().y + control().height + LIST_GAP, 'The list is a gap under the control');
  assert(list().rect.width >= control().width - GEOMETRY_TOLERANCE, `The list is at least as wide as the control: ${list().rect.width} against ${control().width}`);
  assert(list().layer === 1, 'The list is in the overlay layer');
  assert(prop(input(), 'ariaExpanded') === true && prop(input(), 'ariaControls') === list().id, 'The input says it is expanded and names the list');
  assert(activeOption(api, 'fruit') === undefined, 'No option is active until a key or the pointer chooses one');
  assert(listed(api, 'fruit').length === 12, `Every option is listed: ${listed(api, 'fruit').join()}`);

  // Typing filters, and the focus stays in the input.
  await typeText('b');
  assert(listed(api, 'fruit').join() === 'banana,blueberry', `Typing "b" lists the options that contain it: ${listed(api, 'fruit').join()}`);
  assert(focusedTestID(api) === 'cb-fruit-input', 'Typing leaves the focus in the input');

  // The arrow keys move the active option, announced and not focused, and they go round.
  await tap(DOWN);
  assert(activeOption(api, 'fruit') === 'banana', `ArrowDown makes the first match active: ${activeOption(api, 'fruit')}`);
  assert(focusedTestID(api) === 'cb-fruit-input', 'The focus stays in the input while an option is active');
  await tap(DOWN);
  assert(activeOption(api, 'fruit') === 'blueberry', 'ArrowDown goes on');
  await tap(DOWN);
  assert(activeOption(api, 'fruit') === 'banana', 'and goes round past the last');
  await tap(UP);
  assert(activeOption(api, 'fruit') === 'blueberry', 'ArrowUp goes round before the first');
  const activeFill = node(api, 'cb-fruit-item-blueberry').presentation.backgroundColor;
  assert(activeFill.toLowerCase().startsWith('#eef2ff'), `The active option is painted: ${activeFill}`);

  // Home and End are the text's.
  await tap(HOME);
  assert(input().textInput?.selectionStart === 0 && activeOption(api, 'fruit') === 'blueberry', `Home moves the caret and not the active option: ${input().textInput?.selectionStart}`);
  await tap(END);
  assert(input().textInput?.selectionStart === 1, `and End moves it back: ${input().textInput?.selectionStart}`);

  // Enter chooses the active option; the list closes and the text is the option's.
  await tap(ENTER);
  assert(readout(api).fruit === 'blueberry', `Enter chooses the active option: ${JSON.stringify(readout(api))}`);
  assert(textIn(api, 'fruit') === 'Blueberry' && !isOpen(api, 'fruit'), `The input shows the choice and the list closed: ${textIn(api, 'fruit')}`);
  assert(focusedTestID(api) === 'cb-fruit-input', 'Choosing leaves the focus in the input');
  assert(prop(input(), 'ariaExpanded') === false && prop(input(), 'ariaActiveDescendant') === undefined, 'The input is collapsed and names no option');

  // Escape on a closed list clears the text and the choice.
  await tap(ESCAPE);
  assert(readout(api).fruit === null && textIn(api, 'fruit') === '', `Escape on a closed list clears the choice and the text: ${JSON.stringify(readout(api))}`);

  // Alt+ArrowDown opens without choosing an option, Alt+ArrowUp closes.
  await tap(ALT_DOWN);
  assert(isOpen(api, 'fruit') && activeOption(api, 'fruit') === undefined, 'Alt+ArrowDown opens the list with no option active');
  await tap(ALT_UP);
  assert(!isOpen(api, 'fruit') && focusedTestID(api) === 'cb-fruit-input', 'Alt+ArrowUp closes it and the input keeps focus');

  // The pointer moving over an option makes it active; a click on it chooses it and the input keeps focus.
  await tap(ALT_DOWN);
  await hover(optionPoint(api, 'fruit', 'date'));
  assert(activeOption(api, 'fruit') === 'date', `Moving the pointer over an option makes it active: ${activeOption(api, 'fruit')}`);
  await hover(optionPoint(api, 'fruit', 'fig'));
  assert(activeOption(api, 'fruit') === 'fig', 'and over the next one');
  await hover(optionPoint(api, 'fruit', 'cherry'));
  assert(activeOption(api, 'fruit') === 'fig', 'A disabled option is not made active');
  await press(optionPoint(api, 'fruit', 'fig'));
  assert(readout(api).fruit === 'fig' && textIn(api, 'fruit') === 'Fig', `A click on an option chooses it: ${JSON.stringify(readout(api))}`);
  assert(focusedTestID(api) === 'cb-fruit-input' && !isOpen(api, 'fruit'), `and the input keeps the focus: ${focusedTestID(api)}`);

  // A disabled option chooses nothing and the list stays open.
  await tap(ALT_DOWN);
  await press(optionPoint(api, 'fruit', 'cherry'));
  assert(readout(api).fruit === 'fig' && isOpen(api, 'fruit') && focusedTestID(api) === 'cb-fruit-input', 'A press on a disabled option does nothing');
  await press(new Vector2(list().rect.x + LIST_EDGE_INSET, centreOf(list().rect).y));
  assert(isOpen(api, 'fruit') && focusedTestID(api) === 'cb-fruit-input', 'A press on the list\'s padding keeps the focus in the input');

  // Typing text nobody matches shows the empty message; leaving by a press elsewhere closes the list and puts the choice's text back.
  await typeText('zz');
  assert(listed(api, 'fruit').length === 0 && api.find('cb-fruit-empty') !== undefined, 'Text that matches nothing shows the empty message');
  await pressAway(api);
  assert(!isOpen(api, 'fruit') && focusedTestID(api) === undefined, 'A press elsewhere closes the list and takes the focus');
  assert(textIn(api, 'fruit') === 'Fig' && readout(api).fruit === 'fig', `and the input is the choice again: ${textIn(api, 'fruit')}`);

  // A press on a button beside the combobox reaches it, with the list open: there is no backdrop.
  await press(centreOf(input().rect));
  assert(isOpen(api, 'fruit'), 'The list is open again');
  await press(centreOf(node(api, 'cb-next').rect));
  assert(node(api, 'cb-next').children.length > 0 && api.snapshot().nodes.some(candidate => candidate.text === 'Next 1'), 'A press outside the list reaches the button under it');
  assert(!isOpen(api, 'fruit') && focusedTestID(api) === 'cb-next', `and closes the list: focus is on ${focusedTestID(api)}`);

  // Tab moves on to the next tab stop, closes the list and chooses nothing.
  await press(centreOf(input().rect));
  await typeText('a');
  assert(isOpen(api, 'fruit'), 'Typing opens the list');
  await tap(DOWN);
  await tap(TAB);
  assert(!isOpen(api, 'fruit') && focusedTestID(api) === 'cb-next', `Tab leaves for the next tab stop: ${focusedTestID(api)}`);
  assert(readout(api).fruit === 'fig' && textIn(api, 'fruit') === 'Fig', 'and chooses nothing, even with an option active');

  // A wheel over the page closes the list: the page scrolls from under it. The input keeps its focus.
  await press(centreOf(input().rect));
  assert(isOpen(api, 'fruit'), 'Open for the wheel');
  await wheel(centreOf(node(api, 'cb-title').rect), MouseButton.MouseButtonWheelDown);
  assert(!isOpen(api, 'fruit') && focusedTestID(api) === 'cb-fruit-input', `A wheel over the page closes the list, not the focus: ${focusedTestID(api)}`);
  api.scrollTo('combobox-page', 0);
  await settle();

  // The buttons: Clear empties the choice and keeps focus in the input, the trigger opens and closes the list the same way.
  await press(centreOf(node(api, 'cb-fruit-clear').rect));
  assert(readout(api).fruit === null && textIn(api, 'fruit') === '' && focusedTestID(api) === 'cb-fruit-input', `Clear empties the choice and the focus stays in the input: ${focusedTestID(api)}`);
  assert(api.find('cb-fruit-clear') === undefined, 'and the clear button goes with it');
  await press(centreOf(node(api, 'cb-fruit-trigger').rect));
  assert(isOpen(api, 'fruit') && focusedTestID(api) === 'cb-fruit-input', 'The trigger opens the list and the focus is in the input');
  await press(centreOf(node(api, 'cb-fruit-trigger').rect));
  assert(!isOpen(api, 'fruit') && focusedTestID(api) === 'cb-fruit-input', 'and closes it');
  await pressAway(api);
}

async function verifyTags(api: Api): Promise<void> {
  const control = () => node(api, 'cb-tags').rect;
  const input = () => node(api, 'cb-tags-input');
  const list = () => node(api, 'cb-tags-list');
  assert(chipValues(api, 'tags').join() === 'apple,banana' && readout(api).tags.join() === 'apple,banana', `The chips are the value: ${chipValues(api, 'tags').join()}`);
  const oneLine = control().height;
  const first = chipRects(api, 'tags')[0];
  assert(first, 'There is a first chip');
  const layout = JSON.stringify({ control: control(), chips: chipRects(api, 'tags'), input: input().rect });
  assert(chipRects(api, 'tags').every(rect => Math.abs(rect.y - first.y) < GEOMETRY_TOLERANCE), `Two chips fit on one line: ${layout}`);
  const lastRight = Math.max(...chipRects(api, 'tags').map(rect => rect.x + rect.width));
  assert(input().rect.x > lastRight - GEOMETRY_TOLERANCE && Math.abs(input().rect.y + input().rect.height / 2 - (first.y + first.height / 2)) < first.height, `The input follows the chips on their line: ${layout}`);
  const removeApple = node(api, 'cb-tags-remove-apple');
  assert(removeApple.kind === 'button' && prop(removeApple, 'ariaLabel') === 'Remove Apple', `A chip's remove button is a button named for the chip: ${String(prop(removeApple, 'ariaLabel'))}`);
  assert(prop(node(api, 'cb-tags-chip-banana'), 'ariaLabel') === 'Banana' && prop(node(api, 'cb-tags-chip-banana'), 'role') === 'group', 'and the chip is a group named for its label');

  // Choosing adds chips and keeps the list open; the control wraps and the list follows its growth.
  await press(centreOf(input().rect));
  assert(isOpen(api, 'tags') && focusedTestID(api) === 'cb-tags-input', 'A press in the input opens the list');
  for (const value of CHIPS_TO_WRAP) {
    await press(optionPoint(api, 'tags', value));
    assert(readout(api).tags.includes(value) && isOpen(api, 'tags'), `Choosing ${value} adds a chip and keeps the list open: ${readout(api).tags.join()}`);
    assert(focusedTestID(api) === 'cb-tags-input' && textIn(api, 'tags') === '', 'The input keeps the focus and is empty');
    near(list().rect.y, control().y + control().height + LIST_GAP, `The list follows the control after ${value}`);
  }
  assert(readout(api).tags.join() === `apple,banana,${CHIPS_TO_WRAP.join()}`, `The chips are in the order they were chosen: ${readout(api).tags.join()}`);
  assert(control().height > oneLine + GEOMETRY_TOLERANCE, `The chips wrapped and the control grew: ${control().height} against ${oneLine}`);
  const rows = new Set(chipRects(api, 'tags').map(rect => Math.round(rect.y)));
  assert(rows.size >= 2, `The chips are on more than one line: ${[...rows].join()}`);
  const lastChip = chipRects(api, 'tags').at(-1);
  assert(lastChip && input().rect.y + input().rect.height <= control().y + control().height + GEOMETRY_TOLERANCE, 'The input is still inside the control');
  assert(input().rect.width >= 80, `The input keeps a usable width on its line: ${input().rect.width}`);
  await press(optionPoint(api, 'tags', 'date'));
  assert(!readout(api).tags.includes('date'), 'Choosing a chosen option removes its chip');
  await press(optionPoint(api, 'tags', 'date'));

  // Backspace in the empty input moves onto the last chip; a second removes it and the focus goes back to the input.
  await tap(ALT_UP);
  assert(!isOpen(api, 'tags'), 'Closed for the chips');
  const chipsBefore = chipValues(api, 'tags');
  await tap(BACKSPACE);
  assert(focusedTestID(api) === `cb-tags-chip-${chipsBefore.at(-1)}`, `Backspace in an empty input focuses the last chip: ${focusedTestID(api)}`);
  assert(chipValues(api, 'tags').join() === chipsBefore.join(), 'and removes nothing');
  await tap(BACKSPACE);
  assert(chipValues(api, 'tags').join() === chipsBefore.slice(0, -1).join() && focusedTestID(api) === 'cb-tags-input', `A second Backspace removes it and returns to the input: ${chipValues(api, 'tags').join()}`);

  // The arrows walk the chips; Delete removes the focused one.
  await tap(LEFT);
  const walked = chipValues(api, 'tags');
  assert(focusedTestID(api) === `cb-tags-chip-${walked.at(-1)}`, `ArrowLeft at the start of the text focuses the last chip: ${focusedTestID(api)}`);
  await tap(LEFT);
  assert(focusedTestID(api) === `cb-tags-chip-${walked.at(-2)}`, 'ArrowLeft goes to the one before');
  await tap(DELETE);
  assert(chipValues(api, 'tags').join() === walked.filter((_, index) => index !== walked.length - 2).join() && focusedTestID(api) === 'cb-tags-input', `Delete removes the focused chip: ${chipValues(api, 'tags').join()}`);

  // A press on a chip's remove button removes it and leaves the focus in the input.
  const target = chipValues(api, 'tags')[0];
  assert(target, 'A chip to remove');
  await press(centreOf(node(api, `cb-tags-remove-${target}`).rect));
  assert(!chipValues(api, 'tags').includes(target) && !readout(api).tags.includes(target) && focusedTestID(api) === 'cb-tags-input', `The remove button removes its chip and the focus stays in the input: ${focusedTestID(api)}`);

  // A custom value: typed text and a comma, or Enter with nothing active.
  const count = chipValues(api, 'tags').length;
  await typeText('kiwi,');
  assert(chipValues(api, 'tags').length === count + 1 && readout(api).tags.at(-1) === 'kiwi' && textIn(api, 'tags') === '', `A comma adds the typed text as a chip and is not typed: ${readout(api).tags.join()}`);
  await typeText('plum');
  await tap(ENTER);
  assert(readout(api).tags.at(-1) === 'plum' && textIn(api, 'tags') === '', `Enter with no active option adds the typed text: ${readout(api).tags.join()}`);

  // Leaving drops text that was not entered, and keeps the chips.
  await typeText('mel');
  await pressAway(api);
  assert(textIn(api, 'tags') === '' && !isOpen(api, 'tags') && readout(api).tags.at(-1) === 'plum', `Leaving drops text that was not entered: ${textIn(api, 'tags')}`);
}

async function verifyBottom(api: Api): Promise<void> {
  const control = () => node(api, 'cb-bottom').rect;
  const list = () => node(api, 'cb-bottom-list');
  // One press moves from an open combobox to another: the first closes and the second opens.
  await press(centreOf(node(api, 'cb-tags-input').rect));
  assert(isOpen(api, 'tags'), 'A press opens the chips combobox');
  await press(centreOf(node(api, 'cb-bottom-input').rect));
  assert(!isOpen(api, 'tags'), 'A press on another combobox closes the open one');
  assert(isOpen(api, 'bottom'), 'The bottom combobox opens');
  assert(list().rect.y + list().rect.height <= control().y + GEOMETRY_TOLERANCE, `Too low for its list, the list opens above the control: list ${JSON.stringify(list().rect)}, control ${JSON.stringify(control())}`);
  near(list().rect.y + list().rect.height, control().y - LIST_GAP, 'The flipped list is a gap above the control');
  const scroll = list().scroll;
  assert(scroll && scroll.scrollHeight > scroll.clientHeight && scroll.scrollTop === 0, `Sixty options are more than the room above: the list is capped and scrolls: ${JSON.stringify(scroll)}`);
  assert(list().rect.height < scroll.scrollHeight, 'The list is shorter than its options');

  // ArrowUp from the top walks to the last option, and the list scrolls to show it.
  await tap(UP);
  assert(activeOption(api, 'bottom') === 'option-60', `ArrowUp starts at the last option: ${activeOption(api, 'bottom')}`);
  const afterUp = list().scroll;
  assert(afterUp && afterUp.scrollTop > 0, `The active option is scrolled into view: ${JSON.stringify(afterUp)}`);
  const active = node(api, 'cb-bottom-item-option-60').rect;
  assert(active.y >= list().rect.y - GEOMETRY_TOLERANCE && active.y + active.height <= list().rect.y + list().rect.height + GEOMETRY_TOLERANCE, `and it is inside the list: ${JSON.stringify(active)} in ${JSON.stringify(list().rect)}`);

  // The pointer comes to rest over the list and the keys choose another option; a wheel tick then scrolls the list under the
  // resting pointer, and the active option is the keys', not the one that is now under the pointer. Real movement takes it.
  const centre = centreOf(list().rect);
  await hover(centre);
  const under = activeOption(api, 'bottom');
  assert(under !== undefined && under !== 'option-60', `A move of the pointer over an option makes it active: ${under}`);
  const underRect = node(api, `cb-bottom-item-${under}`).rect;
  assert(centre.y >= underRect.y - GEOMETRY_TOLERANCE && centre.y <= underRect.y + underRect.height + GEOMETRY_TOLERANCE, 'and it is the one under the pointer');
  await tap(UP);
  const chosenByKey = activeOption(api, 'bottom');
  assert(chosenByKey !== undefined && chosenByKey !== under, `ArrowUp moves the active option on from there: ${chosenByKey}`);
  const pageTop = node(api, 'combobox-page').scroll?.scrollTop ?? 0;
  const beforeWheel = list().scroll?.scrollTop ?? 0;
  await wheelTick(centre, MouseButton.MouseButtonWheelUp);
  const afterWheel = list().scroll?.scrollTop ?? 0;
  assert(afterWheel < beforeWheel, `The wheel scrolls the list: ${beforeWheel} -> ${afterWheel}`);
  assert(isOpen(api, 'bottom') && focusedTestID(api) === 'cb-bottom-input', 'A wheel over the list leaves it open');
  assert(activeOption(api, 'bottom') === chosenByKey, `and a pointer resting while the list moves under it does not change the active option: ${activeOption(api, 'bottom')} against ${chosenByKey}`);
  assert((node(api, 'combobox-page').scroll?.scrollTop ?? 0) === pageTop, 'The page did not scroll');
  await hover(new Vector2(centre.x + 3, centre.y));
  const moved = activeOption(api, 'bottom');
  assert(moved !== chosenByKey, `A move of the pointer takes it: ${moved}`);

  // Resizing the root while the list is open places it again against the new size.
  const snapshot = api.snapshot();
  const original = new Vector2(snapshot.width, snapshot.height);
  api.resizeSurface(original.x, original.y - 200);
  await settle();
  assert(isOpen(api, 'bottom') && focusedTestID(api) === 'cb-bottom-input', 'A resize leaves the list open and the input focused');
  near(list().rect.y + list().rect.height, control().y - LIST_GAP, 'and the list is placed against the control where it is now');
  api.resizeSurface(original.x, original.y);
  await settle();
  near(list().rect.y + list().rect.height, control().y - LIST_GAP, 'and again when the root grows back');
  await tap(ESCAPE);
  assert(!isOpen(api, 'bottom'), 'Escape closes it');
  await pressAway(api);
}

async function verifyDisabled(api: Api): Promise<void> {
  assert(chipValues(api, 'locked').join() === 'fig,grape', 'The disabled combobox shows its chips');
  assert(api.find('cb-locked-remove-fig') === undefined, 'and has no way to remove them');
  const locked = node(api, 'cb-locked-input');
  await press(centreOf(locked.rect));
  assert(focusedTestID(api) !== 'cb-locked-input' && !isOpen(api, 'locked'), 'A press on a disabled combobox neither focuses it nor opens it');
  await press(centreOf(node(api, 'cb-locked-trigger').rect));
  assert(!isOpen(api, 'locked'), 'nor does its trigger');
  assert(chipValues(api, 'locked').join() === 'fig,grape', 'and nothing was removed');
  await pressAway(api);
}

/** One state of the lab to capture, set up from rest: the key is the file's name. */
interface State {
  name: string;
  setup: () => Promise<void>;
}

/**
 * The states of the lab at one device pixel ratio, each in a raster of the viewport texture. At ratio 2 the window's
 * content scale is 2 (its logical size halves, its raster is the same pixels), and injected positions are scaled.
 */
async function captureStates(owner: Node, api: Api, capture: Capture, ratio: number): Promise<void> {
  const window = requireWindow(owner);
  window.contentScaleFactor = ratio;
  inputScale = ratio;
  await settle();
  api.showLab('hud');
  await settle();
  api.showLab('combobox');
  await settle();
  const suffix = `dpr${ratio}`;
  const states: State[] = [
    { name: 'rest', setup: async () => { await pressAway(api); } },
    { name: 'open', setup: async () => { await press(centreOf(node(api, 'cb-fruit-input').rect)); } },
    { name: 'filtered', setup: async () => { await typeText('b'); await tap(DOWN); } },
    { name: 'empty', setup: async () => { await typeText('zz'); } },
    {
      name: 'single-selected',
      setup: async () => {
        await tap(ESCAPE);
        await tap(ESCAPE);
        await typeText('man');
        await tap(DOWN);
        await tap(ENTER);
        await pressAway(api);
      },
    },
    {
      name: 'chips-wrapped',
      setup: async () => {
        await press(centreOf(node(api, 'cb-tags-input').rect));
        for (const value of CHIPS_TO_WRAP) await press(optionPoint(api, 'tags', value));
      },
    },
    { name: 'chip-focused', setup: async () => { await tap(ALT_UP); await tap(BACKSPACE); } },
    {
      name: 'flipped',
      setup: async () => {
        await pressAway(api);
        await press(centreOf(node(api, 'cb-bottom-input').rect));
        await tap(DOWN);
        await tap(DOWN);
      },
    },
  ];
  for (const state of states) {
    await state.setup();
    await capture(`combobox-${state.name}-${suffix}`);
  }
  // The disabled combobox is in the rest raster too; one of its own shows the whole look.
  await pressAway(api);
  await capture(`combobox-disabled-${suffix}`);
  window.contentScaleFactor = 1;
  inputScale = 1;
  await settle();
  move(FAR_CORNER);
  await settle();
}

