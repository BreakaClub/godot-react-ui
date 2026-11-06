import {
  Color, Control, Engine, Image, InputEventKey, InputEventMouseButton, InputEventMouseMotion, InputMap, Key,
  MouseButton, MouseButtonMask, Node, RenderingServer, Vector2,
} from 'godot';
import type { LayoutRect, NativeSnapshotNode, NativeTextInputSnapshot } from '../../src/native';
import type { InteractionInspection } from './verify-interaction';
import { assertionTally, parseVerifierEvent, verifierClipboard } from './verifier-input';

/**
 * Phase I7: `TextInput` in a window (docs/tracks/text-input.md). Real Godot input only (`Input.parseInputEvent`, marked
 * as the verifier's), and the keys are the project's own `InputMap` actions, so the section holds on any platform.
 * Typing, selecting by key and by mouse, word jumps, deleting over an emoji sequence, `maxLength`, a transforming
 * controlled field, read-only, a password, undo and redo, the caret in the raster, horizontal scrolling that follows
 * the caret, and a text area that wraps and scrolls.
 */

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
/** Frames between the events of one click; the presses of a sequence must come within the click interval (500 ms). */
const CLICK_PAUSE_FRAMES = 3;
const FAR_CORNER = new Vector2(1, 1);
/** The default selection colour (`DEFAULT_SELECTION_COLOR` in native, blue-500 at 35 %) and the form's page and field fills. */
const PAGE_FILL = '#f8fafc';
const FIELD_FILL = '#ffffff';
const CARET_COLOR = '#4f46e5';
const COLOR_TOLERANCE = 0.03;
/** The code field's `maxLength`. */
const CODE_MAX_LENGTH = 6;
/** A family emoji: three people joined by zero-width joiners. One grapheme, eight UTF-16 units. */
const FAMILY = '👩‍👩‍👧';
const FAMILY_UTF16_LENGTH = 8;
/** How far the verifier drags a text area's scrollbar thumb. */
const THUMB_DRAG_PX = 8;
const THUMB_DRAG_STEPS = 4;
/** Far more steps than any section takes: a loop that reaches this is a bug. */
const MAX_STEPS = 80;

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

function node(api: Pick<InteractionInspection, 'find'>, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

function input(api: Pick<InteractionInspection, 'find'>, testID: string): NativeTextInputSnapshot {
  const state = node(api, testID).textInput;
  assert(state, `${testID} is not a text input`);
  return state;
}

function centerOf(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

export function move(position: Vector2, held = false): void {
  const event = new InputEventMouseMotion();
  event.position = position;
  event.globalPosition = position;
  event.buttonMask = held ? MouseButtonMask.MouseButtonMaskLeft : 0;
  parseVerifierEvent(event);
}

function button(position: Vector2, pressed: boolean, modifiers: { shift?: boolean } = {}): void {
  const event = new InputEventMouseButton();
  event.position = position;
  event.globalPosition = position;
  event.buttonIndex = MouseButton.MouseButtonLeft;
  event.pressed = pressed;
  event.buttonMask = pressed ? MouseButtonMask.MouseButtonMaskLeft : 0;
  event.shiftPressed = modifiers.shift === true;
  parseVerifierEvent(event);
}

/** Longer than the click-count interval (plan Appendix A, 500 ms): the next click begins a new sequence. */
const CLICK_SEQUENCE_PAUSE_MS = 650;

/** `count` quick clicks at one place: a double click selects a word, a triple click everything. */
export async function click(position: Vector2, count = 1, modifiers: { shift?: boolean } = {}): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
  move(position);
  await frames(CLICK_PAUSE_FRAMES);
  for (let index = 0; index < count; index++) {
    button(position, true, modifiers);
    await frames(CLICK_PAUSE_FRAMES);
    button(position, false, modifiers);
    await frames(CLICK_PAUSE_FRAMES);
  }
  await settle();
}

/** One wheel tick at `position`. */
async function wheel(position: Vector2, button: MouseButton): Promise<void> {
  move(position);
  await settle();
  for (const pressed of [true, false]) {
    const event = new InputEventMouseButton();
    event.position = position;
    event.globalPosition = position;
    event.buttonIndex = button;
    event.pressed = pressed;
    parseVerifierEvent(event);
  }
  await settle();
}

/** Press at `from`, move to `to` in a few steps with the button down, release. */
export async function drag(from: Vector2, to: Vector2): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
  move(from);
  await frames(CLICK_PAUSE_FRAMES);
  button(from, true);
  await frames(CLICK_PAUSE_FRAMES);
  const steps = 6;
  for (let step = 1; step <= steps; step++) {
    move(from.lerp(to, step / steps), true);
    await frames(1);
  }
  await settle();
  button(to, false);
  await settle();
}

interface KeyChord {
  keycode: Key;
  unicode?: number;
  shift?: boolean;
}

function keyEvent(chord: KeyChord, pressed: boolean): void {
  const event = new InputEventKey();
  event.keycode = chord.keycode;
  event.physicalKeycode = chord.keycode;
  event.keyLabel = chord.keycode;
  event.unicode = chord.unicode ?? 0;
  event.pressed = pressed;
  event.shiftPressed = chord.shift === true;
  parseVerifierEvent(event);
}

/** The keycode a typed character has on a US keyboard (the letters and digits are their capitals' codes). */
function keycodeOf(character: string): Key {
  const code = character.toUpperCase().codePointAt(0) ?? 0;
  const letterOrDigit = (code >= 0x30 && code <= 0x39) || (code >= 0x41 && code <= 0x5a);
  return letterOrDigit || code === 0x20 ? code : Key.KeyNone;
}

/** Type `text` a character at a time, as a keyboard does: the key goes down with the character it types, and up. */
export async function typeText(text: string): Promise<void> {
  for (const character of text) {
    const chord: KeyChord = {
      keycode: keycodeOf(character), unicode: character.codePointAt(0),
      shift: character !== character.toLowerCase() && character === character.toUpperCase(),
    };
    keyEvent(chord, true);
    keyEvent(chord, false);
  }
  await settle();
}

/** The first key the project's `InputMap` binds to `action`, as a fresh event that can be injected. */
function actionKey(action: string): InputEventKey {
  const events = InputMap.actionGetEvents(action);
  for (let index = 0; index < events.size(); index++) {
    const event = events.get(index);
    if (event instanceof InputEventKey) {
      const copy = event.duplicate();
      assert(copy instanceof InputEventKey, `${action}'s event did not duplicate as a key`);
      return copy;
    }
  }
  throw new Error(`The InputMap has no key for ${action}`);
}

/** Press and release the key bound to `action`; `shift` adds Shift, which selects while moving. */
export async function pressAction(action: string, shift = false, times = 1): Promise<void> {
  for (let count = 0; count < times; count++) {
    for (const pressed of [true, false]) {
      const event = actionKey(action);
      event.pressed = pressed;
      if (shift) event.shiftPressed = true;
      parseVerifierEvent(event);
    }
  }
  await settle();
}

/**
 * Wait until the focused input's caret has just come on again. The caret blinks (650 ms on, 650 off) and a capture takes a
 * good part of a period, so a capture is taken right after the caret turned on, with most of its period left. Waiting only
 * reads the snapshot; it makes the input do nothing.
 */
export async function waitForCaretOn(api: Pick<InteractionInspection, 'find'>, testID: string): Promise<void> {
  const MAX_FRAMES = 400;
  // The caret is drawn only while the OS window has focus, and a window the OS takes focus from while the run is
  // under way (a disturbance, which the run reports) hears of its loss and never of its return, as the verifier's
  // window cannot become the key window. A tap of Shift, a key that types nothing and moves nothing, tells the root
  // the window is the one receiving input.
  keyEvent({ keycode: Key.KeyShift }, true);
  keyEvent({ keycode: Key.KeyShift }, false);
  await settle();
  let seenOff = false;
  for (let step = 0; step < MAX_FRAMES; step++) {
    const visible = input(api, testID).caretVisible;
    if (!visible) seenOff = true;
    else if (seenOff) return;
    await frames(1);
  }
  throw new Error(`The caret of ${testID} did not blink on within ${MAX_FRAMES} frames`);
}

function frameImage(owner: Node): Image {
  RenderingServer.forceDraw();
  const image = owner.getViewport()?.getTexture()?.getImage();
  assert(image, 'Native verification requires a rendered viewport');
  return image;
}

function pixel(image: Image, at: Vector2): Color {
  return image.getPixel(Math.floor(at.x), Math.floor(at.y));
}

function near(color: Color, hex: string, tolerance = COLOR_TOLERANCE): boolean {
  const expected = Color.fromString(hex, new Color(0, 0, 0, 0));
  return Math.abs(color.r - expected.r) <= tolerance && Math.abs(color.g - expected.g) <= tolerance
    && Math.abs(color.b - expected.b) <= tolerance;
}

function describe(color: Color): string {
  return `#${color.toHtml(false)}`;
}

/** Whether any pixel of `rect` (root-local) is not `background`: something is drawn there. */
function hasInk(image: Image, rect: LayoutRect, background: string): boolean {
  const right = Math.floor(rect.x + rect.width);
  const bottom = Math.floor(rect.y + rect.height);
  for (let y = Math.floor(rect.y); y < bottom; y++) {
    for (let x = Math.floor(rect.x); x < right; x++) {
      if (!near(pixel(image, new Vector2(x, y)), background)) return true;
    }
  }
  return false;
}

interface FormReadout {
  name: string;
  password: string;
  code: string;
  shout: string;
  notes: string;
  submitted: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readForm(api: InteractionInspection): FormReadout {
  const parsed: unknown = JSON.parse(readText(api, 'form-json'));
  assert(isRecord(parsed), 'The form readout is JSON of an object');
  const { name, password, code, shout, notes, submitted } = parsed;
  assert(
    typeof name === 'string' && typeof password === 'string' && typeof code === 'string' && typeof shout === 'string'
    && typeof notes === 'string' && typeof submitted === 'number',
    `The form readout has the fields of the form: ${JSON.stringify(parsed)}`,
  );
  return { name, password, code, shout, notes, submitted };
}

function readText(api: InteractionInspection, testID: string): string {
  const snapshot = api.snapshot();
  const collect = (entry: NativeSnapshotNode): string => entry.text + entry.children.map(childID => {
    const child = snapshot.nodes.find(candidate => candidate.id === childID);
    assert(child, `Missing native child ${childID}`);
    return collect(child);
  }).join('');
  return collect(node(api, testID));
}

type Capture = (name: string, overflowing?: readonly string[]) => Promise<void>;

export async function verifyTextInput(owner: Node, api: InteractionInspection, capture: Capture): Promise<void> {
  api.showLab('hud');
  await settle();
  api.showLab('forms');
  await settle();
  move(FAR_CORNER);
  await settle();

  // The actions text inputs use are the engine's own; record which this project has (the plan asks for it).
  const wanted = [
    'ui_copy', 'ui_cut', 'ui_paste', 'ui_undo', 'ui_redo', 'ui_text_select_all', 'ui_text_submit', 'ui_text_newline',
    'ui_text_backspace', 'ui_text_backspace_word', 'ui_text_backspace_all_to_left', 'ui_text_delete', 'ui_text_delete_word',
    'ui_text_delete_all_to_right', 'ui_text_caret_left', 'ui_text_caret_right', 'ui_text_caret_word_left',
    'ui_text_caret_word_right', 'ui_text_caret_up', 'ui_text_caret_down', 'ui_text_caret_line_start',
    'ui_text_caret_line_end', 'ui_text_caret_page_up', 'ui_text_caret_page_down', 'ui_text_caret_document_start',
    'ui_text_caret_document_end', 'ui_swap_input_direction',
  ];
  const present = wanted.filter(action => InputMap.hasAction(action));
  console.log('GODOT_REACT_TEXT_ACTIONS', JSON.stringify({ present, missing: wanted.filter(action => !present.includes(action)) }));
  assert(present.length === wanted.length, `The InputMap lacks text actions: ${wanted.filter(action => !present.includes(action)).join(', ')}`);

  const focusedTestID = (): string => {
    const id = api.snapshot().focused;
    const testID = api.snapshot().nodes.find(entry => entry.id === id)?.props.testID;
    return typeof testID === 'string' ? testID : 'none';
  };
  const focusField = async (testID: string): Promise<void> => {
    await click(centerOf(node(api, testID).rect));
    assert(focusedTestID() === testID, `Pressing ${testID} focuses it: ${focusedTestID()}`);
  };
  const selection = (testID: string): [number, number] => {
    const state = input(api, testID);
    return [state.selectionStart, state.selectionEnd];
  };

  // The clipboard of a verifier run is the process's own (`verifierClipboard`): the machine's is the person's, and is never touched.
  await verifyTyping(owner, api, capture, { focusField, focusedTestID, selection });
  await verifySelecting(owner, api, capture, { focusField, selection });
  await verifyEditing(owner, api, capture, { focusField, selection });
  await verifyModes(owner, api, capture, { focusField, selection });
  await verifyClipboard(owner, api, capture, { focusField, selection });
  await verifyMultiline(owner, api, capture, { focusField, selection });
  await verifyTrailingBreak(owner, api, capture, { focusField, selection });
  await verifyFixes(owner, api, capture, { focusField, focusedTestID, selection });
}

interface Helpers {
  focusField(testID: string): Promise<void>;
  selection(testID: string): [number, number];
}

/** Typing, the caret and placeholder in a raster, the field's size not depending on its text, Tab, and submit. */
async function verifyTyping(
  owner: Node, api: InteractionInspection, capture: Capture,
  helpers: Helpers & { focusedTestID(): string },
): Promise<void> {
  const { focusField, selection } = helpers;
  const before = input(api, 'form-name');
  assert(before.value === '' && before.showingPlaceholder, `An empty field shows its placeholder: ${JSON.stringify(before)}`);
  assert(helpers.focusedTestID() === 'none', 'Nothing is focused before the first press');
  const size = node(api, 'form-name').rect;

  await focusField('form-name');
  assert(api.snapshot().focusVisible === false, 'A press focuses the field without the keyboard ring');
  let state = input(api, 'form-name');
  assert(state.caretVisible, 'The caret is on after a press');
  assert(state.caret !== null && state.caret.height > 0, `The caret has a rectangle: ${JSON.stringify(state.caret)}`);
  await waitForCaretOn(api, 'form-name');
  await capture('forms-01-placeholder-and-caret');
  let image = frameImage(owner);
  state = input(api, 'form-name');
  assert(state.caretVisible, 'The caret was on when the raster was read');
  const caret = state.caret;
  assert(caret !== null, 'The caret is laid out');
  const caretPixel = new Vector2(caret.x + caret.width / 2, caret.y + caret.height / 2);
  assert(near(pixel(image, caretPixel), CARET_COLOR), `The caret is drawn in its colour at ${caretPixel.x},${caretPixel.y}: ${describe(pixel(image, caretPixel))}`);
  // The placeholder is drawn: ink in the field's content box, before anything was typed.
  const content: LayoutRect = { x: size.x + 12, y: size.y + 10, width: 80, height: size.height - 20 };
  assert(hasInk(image, content, FIELD_FILL), 'The placeholder is drawn');
  // The caret of a field with no text is only a caret: no marker over its top (that is how a position inside a
  // ligature is drawn), which would be a serif a few pixels either side of it.
  const serif = new Vector2(caret.x - 2 + 0.5, caret.y + 0.5);
  assert(near(pixel(image, serif), FIELD_FILL), `An empty field's caret has no marker: ${describe(pixel(image, serif))} at ${serif.x},${serif.y}`);
  assert(api.cursorShapeAt(size.x + 40, size.y + size.height / 2) === Control.CursorShape.CursorIbeam, 'The pointer over a text field is the text cursor');

  await typeText('Ada');
  state = input(api, 'form-name');
  assert(state.value === 'Ada', `Typing puts the characters in the field: ${state.value}`);
  assert(selection('form-name').join() === '3,3', `The caret follows the text: ${selection('form-name')}`);
  assert(!state.showingPlaceholder, 'The placeholder gives way to the text');
  assert(readForm(api).name === 'Ada', `React saw each edit (onChange): ${JSON.stringify(readForm(api))}`);
  const grown = node(api, 'form-name').rect;
  assert(grown.width === size.width && grown.height === size.height, 'What is typed does not change the field\'s size');

  await typeText(' Lovelace and a very long surname that does not fit in the field at all');
  state = input(api, 'form-name');
  const longRect = node(api, 'form-name').rect;
  assert(longRect.width === size.width && longRect.height === size.height, 'Text wider than the field does not widen it');
  assert(state.scrollLeft > 0, `The text scrolls to keep the caret in view: scrollLeft ${state.scrollLeft}`);
  const longCaret = state.caret;
  assert(longCaret !== null && longCaret.x >= longRect.x && longCaret.x + longCaret.width <= longRect.x + longRect.width,
    `The caret stays inside the field: ${JSON.stringify(longCaret)} in ${JSON.stringify(longRect)}`);
  await capture('forms-02-scrolled-to-the-caret');
  image = frameImage(owner);
  assert(near(pixel(image, new Vector2(longCaret.x + longCaret.width / 2, longCaret.y + longCaret.height / 2)), CARET_COLOR),
    'The caret is still drawn after the text scrolled');
  // The text that scrolled into view is drawn (a paragraph clips its lines to its width, which cut a long line off).
  const beforeCaret: LayoutRect = { x: longRect.x + 6, y: longRect.y + 10, width: longCaret.x - longRect.x - 14, height: longRect.height - 20 };
  assert(hasInk(image, beforeCaret, FIELD_FILL), `The text before the caret is drawn after it scrolled: ${JSON.stringify(beforeCaret)}`);

  await pressAction('ui_text_caret_line_start');
  state = input(api, 'form-name');
  assert(selection('form-name').join() === '0,0' && state.scrollLeft === 0, `Home puts the caret at the start and scrolls back: selection ${selection('form-name')}, scrollLeft ${state.scrollLeft}`);
  await pressAction('ui_text_caret_line_end');
  assert(input(api, 'form-name').scrollLeft > 0, 'End scrolls to the end again');
  await capture('forms-03-end');

  // Tab moves on to the next field, shows the keyboard ring, and leaves the caret off the field it left.
  keyEvent({ keycode: Key.KeyTab }, true);
  keyEvent({ keycode: Key.KeyTab }, false);
  await settle();
  assert(helpers.focusedTestID() === 'form-password', `Tab moves to the next field: ${helpers.focusedTestID()}`);
  assert(api.snapshot().focusVisible, 'Tab focus is a keyboard focus');
  await capture('forms-04-tab-to-password');

  // Enter in a single-line field is a submit, and does not change its text.
  await focusField('form-name');
  const submitsBefore = readForm(api).submitted;
  const valueBefore = input(api, 'form-name').value;
  await pressAction('ui_text_submit');
  assert(readForm(api).submitted === submitsBefore + 1, `Enter submits: ${readForm(api).submitted}`);
  assert(input(api, 'form-name').value === valueBefore, 'A submit changes nothing');
}

/** Shift+arrows, word jumps and mouse selection. */
async function verifySelecting(owner: Node, api: InteractionInspection, capture: Capture, helpers: Helpers): Promise<void> {
  const { focusField, selection } = helpers;
  await focusField('form-name');
  // Replace the text, then work on a known sentence.
  await pressAction('ui_text_select_all');
  assert(selection('form-name').join() === `0,${input(api, 'form-name').value.length}`, 'Select all selects everything');
  await typeText('one two three');
  assert(input(api, 'form-name').value === 'one two three', 'Typing over a selection replaces it');
  assert(readForm(api).name === 'one two three', 'React saw the replacement');

  await pressAction('ui_text_caret_left', true, 2);
  assert(selection('form-name').join() === '11,13', `Shift+Left twice selects the last two characters: ${selection('form-name')}`);
  assert(input(api, 'form-name').selectionDirection === 'backward', 'The caret is at the start of a backward selection');
  await capture('forms-05-shift-selection');
  const image = frameImage(owner);
  const rect = node(api, 'form-name').rect;
  assert(input(api, 'form-name').caret !== null, 'A selection has a caret');
  // The selection highlight is blue-ish over the white field: sample inside the field near its right text end.
  const selected = hasSelectionPaint(image, rect);
  assert(selected, 'The selection is painted');
  await pressAction('ui_text_caret_right');
  assert(selection('form-name').join() === '13,13', `Right collapses a selection to its end: ${selection('form-name')}`);

  await pressAction('ui_text_caret_word_left');
  assert(selection('form-name').join() === '8,8', `Word left jumps to the start of "three": ${selection('form-name')}`);
  await pressAction('ui_text_caret_word_left');
  assert(selection('form-name').join() === '4,4', `Word left again: ${selection('form-name')}`);
  await pressAction('ui_text_caret_word_right');
  assert(selection('form-name').join() === '7,7', `Word right lands after "two": ${selection('form-name')}`);
  await pressAction('ui_text_caret_word_right', true);
  assert(selection('form-name').join() === '7,13', `Shift+word right selects to the end of "three": ${selection('form-name')}`);
  await pressAction('ui_text_caret_line_start', true);
  assert(selection('form-name').join() === '0,7', `Shift+Home extends the other way from the anchor: ${selection('form-name')}`);

  // Mouse: a double click selects a word, a triple click all, a drag a range, Shift+click extends.
  const field = node(api, 'form-readonly');
  const text = input(api, 'form-readonly').value;
  assert(text === 'Copy me, you cannot edit me', 'The read-only field holds its default');
  await focusField('form-readonly');
  const firstWord = new Vector2(field.rect.x + 12 + 10, field.rect.y + field.rect.height / 2);
  await click(firstWord, 2);
  assert(selection('form-readonly').join() === '0,4', `A double click selects "Copy": ${selection('form-readonly')}`);
  await click(firstWord, 3);
  assert(selection('form-readonly').join() === `0,${text.length}`, `A triple click selects everything: ${selection('form-readonly')}`);
  await click(firstWord);
  const caret = selection('form-readonly');
  assert(caret[0] === caret[1] && caret[0] <= 1, `A click places the caret in the word: ${caret}`);
  const inkRect = input(api, 'form-readonly').caret;
  assert(inkRect !== null, 'The clicked caret is laid out');
  const from = new Vector2(field.rect.x + 12, field.rect.y + field.rect.height / 2);
  const to = new Vector2(field.rect.x + 12 + 70, field.rect.y + field.rect.height / 2);
  await drag(from, to);
  const dragged = selection('form-readonly');
  assert(dragged[0] === 0 && dragged[1] > 3 && dragged[1] < 12, `Dragging across the first words selects them: ${dragged}`);
  await capture('forms-06-drag-selection');
  const later = new Vector2(field.rect.x + 12 + 120, field.rect.y + field.rect.height / 2);
  await click(later, 1, { shift: true });
  const extended = selection('form-readonly');
  assert(extended[0] === 0 && extended[1] > dragged[1], `Shift+click extends the selection from its anchor: ${extended}`);

  // The selection of a field that is not focused is kept but not drawn.
  await focusField('form-name');
  assert(input(api, 'form-readonly').selectionEnd > input(api, 'form-readonly').selectionStart, 'The read-only field keeps its selection');
  await settle();
  assert(!hasSelectionPaint(frameImage(owner), node(api, 'form-readonly').rect), 'An unfocused field does not paint its selection');
  // selectTextOnFocus: Tab onto the field selects everything, and so does the press that focuses it, which its release does not collapse.
  await focusField('form-readonly');
  await pressAction('ui_text_caret_line_start');
  await click(centerOf(node(api, 'form-select').rect));
  const selectValue = input(api, 'form-select').value;
  assert(selection('form-select').join() === `0,${selectValue.length}`, `A press that focuses a selectTextOnFocus field selects all of it: ${selection('form-select')}`);
  await click(centerOf(node(api, 'form-select').rect));
  const placed = selection('form-select');
  assert(placed[0] === placed[1], `A press in a field that already has focus places the caret: ${placed}`);
}

/** Whether the field's text area holds a pixel of the selection's blue over white. */
function hasSelectionPaint(image: Image, rect: LayoutRect): boolean {
  const selectionOverWhite = new Color(1 - 0.35 * (1 - 0x3b / 255), 1 - 0.35 * (1 - 0x82 / 255), 1 - 0.35 * (1 - 0xf6 / 255), 1);
  for (let y = Math.floor(rect.y) + 4; y < rect.y + rect.height - 4; y++) {
    for (let x = Math.floor(rect.x) + 4; x < rect.x + rect.width - 4; x++) {
      const color = pixel(image, new Vector2(x, y));
      if (Math.abs(color.r - selectionOverWhite.r) < 0.04 && Math.abs(color.g - selectionOverWhite.g) < 0.04
        && Math.abs(color.b - selectionOverWhite.b) < 0.04) return true;
    }
  }
  return false;
}

/** Deleting over a grapheme cluster, undo and redo. */
async function verifyEditing(owner: Node, api: InteractionInspection, capture: Capture, helpers: Helpers): Promise<void> {
  const { focusField, selection } = helpers;
  await focusField('form-name');
  await pressAction('ui_text_select_all');
  await typeText('a');
  await typeText(FAMILY);
  await typeText('b');
  assert(input(api, 'form-name').value === `a${FAMILY}b`, `Emoji type like any character: ${input(api, 'form-name').value}`);
  assert(selection('form-name').join() === `${FAMILY_UTF16_LENGTH + 2},${FAMILY_UTF16_LENGTH + 2}`, `The caret counts UTF-16 units: ${selection('form-name')}`);
  await capture('forms-07-emoji');

  await pressAction('ui_text_caret_left');
  assert(selection('form-name').join() === `${FAMILY_UTF16_LENGTH + 1},${FAMILY_UTF16_LENGTH + 1}`, `Left moves over the b: ${selection('form-name')}`);
  await pressAction('ui_text_backspace');
  assert(input(api, 'form-name').value === 'ab', `Backspace deletes the whole ZWJ sequence: ${input(api, 'form-name').value}`);
  assert(readForm(api).name === 'ab', 'React saw the deletion');

  await pressAction('ui_undo');
  assert(input(api, 'form-name').value === `a${FAMILY}b`, `Undo puts the sequence back: ${input(api, 'form-name').value}`);
  await pressAction('ui_redo');
  assert(input(api, 'form-name').value === 'ab', `Redo deletes it again: ${input(api, 'form-name').value}`);
  await pressAction('ui_undo');

  await pressAction('ui_text_caret_line_end');
  await pressAction('ui_text_caret_left', false, 2);
  assert(selection('form-name').join() === '1,1', `Two lefts (over b, then the whole emoji) stand after the a: ${selection('form-name')}`);
  await pressAction('ui_text_delete');
  assert(input(api, 'form-name').value === 'ab', `Delete removes the whole ZWJ sequence ahead: ${input(api, 'form-name').value}`);
  assert(input(api, 'form-name').eventCount > 0, 'The edits counted');

  // Undo steps: words coalesce, white space starts an entry.
  await pressAction('ui_text_select_all');
  await typeText('hello world');
  await pressAction('ui_undo');
  assert(input(api, 'form-name').value === 'hello ', `Undo takes back the last word: ${input(api, 'form-name').value}`);
  await pressAction('ui_undo');
  assert(input(api, 'form-name').value === 'hello', `Then the space: ${input(api, 'form-name').value}`);
  await pressAction('ui_undo');
  assert(input(api, 'form-name').value === 'ab', `Then the word, back to what the typing replaced: ${input(api, 'form-name').value}`);
  await pressAction('ui_redo', false, 2);
  assert(input(api, 'form-name').value === 'hello ', `Redo steps forward: ${input(api, 'form-name').value}`);
  assert(readForm(api).name === 'hello ', 'React followed undo and redo');
}

/** Copy, cut and paste through the system clipboard, and what a paste meets: a selection, `maxLength`, a transform. */
async function verifyClipboard(owner: Node, api: InteractionInspection, capture: Capture, helpers: Helpers): Promise<void> {
  const { focusField, selection } = helpers;
  const valueOf = (testID: string): string => input(api, testID).value;
  const log = (): string => readText(api, 'form-log');

  await focusField('form-name');
  await pressAction('ui_text_select_all');
  await typeText('copy me please');

  // Copy writes the selected text and changes nothing else; with nothing selected it writes nothing.
  verifierClipboard.set('sentinel');
  const counted = input(api, 'form-name').eventCount;
  await pressAction('ui_text_select_all');
  await pressAction('ui_copy');
  assert(verifierClipboard.get() === 'copy me please', `Copy puts the selected text on the clipboard: ${verifierClipboard.get()}`);
  assert(valueOf('form-name') === 'copy me please' && input(api, 'form-name').eventCount === counted, 'Copy edits nothing and makes no input event');
  await pressAction('ui_text_caret_line_end');
  verifierClipboard.set('sentinel');
  await pressAction('ui_copy');
  assert(verifierClipboard.get() === 'sentinel', `Copy with nothing selected leaves the clipboard alone: ${verifierClipboard.get()}`);

  // Cut writes it and removes it, as one deleteByCut input that React sees.
  await pressAction('ui_text_caret_word_left', true);
  assert(selection('form-name').join() === '8,14', `Shift+word-left selects the last word: ${selection('form-name')}`);
  await pressAction('ui_cut');
  assert(verifierClipboard.get() === 'please', `Cut puts the selection on the clipboard: ${verifierClipboard.get()}`);
  assert(valueOf('form-name') === 'copy me ', `Cut removes it: ${valueOf('form-name')}`);
  assert(log().endsWith('input:deleteByCut'), `Cut is a deleteByCut input: ${log()}`);
  assert(readForm(api).name === 'copy me ', 'React saw the cut');

  // Paste inserts the clipboard at the caret, as an insertFromPaste input, and undo takes it back.
  verifierClipboard.set('pasted text');
  await pressAction('ui_paste');
  assert(valueOf('form-name') === 'copy me pasted text', `Paste inserts the clipboard at the caret: ${valueOf('form-name')}`);
  assert(selection('form-name').join() === '19,19', `The caret follows the pasted text: ${selection('form-name')}`);
  assert(log().endsWith('input:insertFromPaste'), `Paste is an insertFromPaste input: ${log()}`);
  assert(readForm(api).name === 'copy me pasted text', 'React saw the paste');
  await pressAction('ui_undo');
  assert(valueOf('form-name') === 'copy me ', `Undo takes the whole paste back: ${valueOf('form-name')}`);
  await pressAction('ui_redo');
  assert(valueOf('form-name') === 'copy me pasted text', `Redo pastes again: ${valueOf('form-name')}`);

  // A paste replaces the selection; line breaks cannot be in a single-line input; an empty clipboard pastes nothing.
  await pressAction('ui_text_select_all');
  verifierClipboard.set('one\r\ntwo\nthree');
  await pressAction('ui_paste');
  assert(valueOf('form-name') === 'onetwothree', `A paste replaces the selection and drops the line breaks: ${valueOf('form-name')}`);
  const pasted = input(api, 'form-name').eventCount;
  verifierClipboard.set('');
  await pressAction('ui_paste');
  assert(input(api, 'form-name').eventCount === pasted && valueOf('form-name') === 'onetwothree', 'An empty clipboard pastes nothing');
  // Nothing on the clipboard is not a paste of nothing over the selection, which would delete it: a clipboard that holds
  // an image reads as empty, and so does one of line breaks only, which a single-line input drops.
  await pressAction('ui_text_select_all');
  const selectedAll = `0,${valueOf('form-name').length}`;
  for (const clipboard of ['', '\n', '\r\n']) {
    verifierClipboard.set(clipboard);
    await pressAction('ui_paste');
    assert(
      valueOf('form-name') === 'onetwothree' && input(api, 'form-name').eventCount === pasted && selection('form-name').join() === selectedAll,
      `Pasting ${JSON.stringify(clipboard)} over a selection leaves the text, the selection and the count alone: ${valueOf('form-name')}, ${selection('form-name')}`,
    );
  }
  await capture('forms-11-paste');

  // maxLength cuts what does not fit; a paste that fits nothing is refused.
  await focusField('form-code');
  await pressAction('ui_text_select_all');
  verifierClipboard.set('abcdefghij');
  await pressAction('ui_paste');
  assert(valueOf('form-code') === 'abcdef', `A paste is cut to maxLength: ${valueOf('form-code')}`);
  assert(readForm(api).code === 'abcdef', 'React never saw the part that did not fit');
  const full = input(api, 'form-code').eventCount;
  await pressAction('ui_paste');
  assert(input(api, 'form-code').eventCount === full && valueOf('form-code') === 'abcdef', 'A paste with no room makes no input event');

  // A controlled field that transforms stores the pasted text transformed.
  await focusField('form-shout');
  await pressAction('ui_text_select_all');
  verifierClipboard.set('quiet');
  await pressAction('ui_paste');
  assert(valueOf('form-shout') === 'QUIET', `A pasted text is transformed like a typed one: ${valueOf('form-shout')}`);
  assert(readForm(api).shout === 'QUIET', 'React holds the capitals');
}

/** The root-local rectangle of a node's content box: where a text area's text is drawn. */
function boxOf(api: InteractionInspection, testID: string): LayoutRect {
  return node(api, testID).rect;
}

/** The scroll state of a node that scrolls (a text area scrolls its own text; the lab scrolls the page). */
function scrollOf(api: InteractionInspection, testID: string): NonNullable<NativeSnapshotNode['scroll']> {
  const state = node(api, testID).scroll;
  assert(state, `${testID} has a scroll state`);
  return state;
}

/** A text area: line breaks, wrapping, vertical movement that remembers its column, its own scrolling and its chain to the page. */
async function verifyMultiline(owner: Node, api: InteractionInspection, capture: Capture, helpers: Helpers): Promise<void> {
  const { focusField, selection } = helpers;
  const notes = 'form-notes';
  const valueOf = (): string => input(api, notes).value;
  const caretOf = (): LayoutRect => {
    const caret = input(api, notes).caret;
    assert(caret, 'The focused text area has a caret rectangle');
    return caret;
  };
  const submitted = readForm(api).submitted;
  /** Type `lines` with Enter between them. */
  const typeLines = async (lines: readonly string[]): Promise<void> => {
    for (const [index, line] of lines.entries()) {
      await typeText(line);
      if (index < lines.length - 1) await pressAction('ui_text_newline');
    }
  };

  // Enter is a line break here and submits nothing; every line break is one character.
  await focusField(notes);
  const lines = ['first', 'second', 'third', 'fourth', 'fifth'];
  await typeLines(lines);
  assert(valueOf() === lines.join('\n'), `Enter makes a line break in a text area: ${JSON.stringify(valueOf())}`);
  assert(readForm(api).submitted === submitted, 'Enter in a text area submits nothing');
  assert(readForm(api).notes === lines.join('\n'), 'React saw the line breaks');
  const lineHeight = caretOf().height;

  // Five lines do not fit three rows: the text scrolls, and it scrolled to the caret as the lines were typed.
  const typed = scrollOf(api, notes);
  assert(typed.scrollHeight > typed.clientHeight, `The text is taller than the box: ${JSON.stringify(typed)}`);
  assert(typed.scrollTop > 0, `Typing scrolled the text to the caret: ${typed.scrollTop}`);
  const inBox = (rect: LayoutRect): boolean => rect.y >= boxOf(api, notes).y && rect.y + rect.height <= boxOf(api, notes).y + boxOf(api, notes).height;
  assert(inBox(caretOf()), `The caret is inside the box: ${JSON.stringify(caretOf())} in ${JSON.stringify(boxOf(api, notes))}`);
  await capture('forms-12-text-area-scrolled');

  // Wrapping: one long paragraph has no line breaks and fills several lines.
  await pressAction('ui_text_select_all');
  const sentence = 'The quick brown fox jumps over the lazy dog and then the quick brown fox does it again';
  await typeText(sentence);
  assert(valueOf() === sentence, 'Wrapping adds no characters');
  await pressAction('ui_text_caret_document_start');
  const firstLine = caretOf();
  await pressAction('ui_text_caret_document_end');
  const lastLine = caretOf();
  const wrapped = Math.round((lastLine.y - firstLine.y) / lineHeight);
  assert(wrapped >= 2, `The paragraph wraps onto at least three lines: ${wrapped + 1}`);
  await pressAction('ui_text_caret_document_start');
  await pressAction('ui_text_caret_line_end');
  const [edge] = selection(notes);
  assert(edge > 0 && edge < sentence.length, `End goes to the end of the wrapped line, not the paragraph: ${edge}`);

  // Vertical movement keeps its column through a short line.
  const wide = 'c'.repeat(14);
  await pressAction('ui_text_select_all');
  await typeLines(['aaaa aaaa', 'bb', wide]);
  const end = `aaaa aaaa\nbb\n${wide}`.length;
  assert(selection(notes).join() === `${end},${end}`, `The caret is at the end of the last line: ${selection(notes)}`);
  await pressAction('ui_text_caret_up');
  assert(selection(notes).join() === '12,12', `Up goes to the end of the short line above: ${selection(notes)}`);
  await pressAction('ui_text_caret_up');
  assert(selection(notes).join() === '9,9', `And up again returns to the column it began in, which the short line could not hold: ${selection(notes)}`);
  await pressAction('ui_text_caret_down', false, 2);
  assert(selection(notes).join() === `${end},${end}`, `Down twice stands at the same column again: ${selection(notes)}`);
  await pressAction('ui_text_caret_up', true);
  assert(selection(notes).join() === `12,${end}`, `Shift+Up selects back to the line above: ${selection(notes)}`);
  await pressAction('ui_text_caret_document_start');
  await pressAction('ui_text_caret_down');
  await pressAction('ui_text_caret_line_end');
  assert(selection(notes).join() === '12,12', `Down then End stands at the end of line two: ${selection(notes)}`);
  await pressAction('ui_text_caret_line_start');
  assert(selection(notes).join() === '10,10', `Home stands at its start: ${selection(notes)}`);
  await pressAction('ui_text_caret_document_end');
  await pressAction('ui_text_caret_page_up');
  assert(selection(notes)[0] < 13, `Page up leaves the last line: ${selection(notes)}`);
  await pressAction('ui_text_caret_page_down');
  assert(selection(notes)[0] > 12, `Page down returns to it: ${selection(notes)}`);

  // A press places the caret on the line it lands on, at the column it lands on; right of a short line is its end.
  await pressAction('ui_text_caret_document_start');
  await pressAction('ui_text_caret_down');
  await pressAction('ui_text_caret_line_end');
  const shortLine = caretOf();
  await pressAction('ui_text_caret_document_end');
  await click(new Vector2(shortLine.x + 40, shortLine.y + shortLine.height / 2));
  assert(selection(notes).join() === '12,12', `A press right of a short line puts the caret at its end: ${selection(notes)}`);
  await pressAction('ui_text_caret_document_start');
  const from = caretOf();
  const lastY = shortLine.y + shortLine.height * 1.5;
  await drag(new Vector2(from.x + 2, from.y + from.height / 2), new Vector2(from.x + 40, lastY));
  const [anchor, focus] = selection(notes);
  assert(anchor === 0 && focus > 12, `A drag down selects across the lines: ${selection(notes)}`);

  // The wheel scrolls the text first and the page after it.
  await pressAction('ui_text_select_all');
  await typeLines(lines);
  await pressAction('ui_text_caret_document_start');
  const lab = 'forms-lab';
  assert(scrollOf(api, notes).scrollTop === 0 && scrollOf(api, lab).scrollTop === 0, 'Both are at the top');
  const centre = centerOf(boxOf(api, notes));
  await wheel(centre, MouseButton.MouseButtonWheelDown);
  assert(scrollOf(api, notes).scrollTop > 0 && scrollOf(api, lab).scrollTop === 0, `The first tick scrolls the text, not the page: ${scrollOf(api, notes).scrollTop} and ${scrollOf(api, lab).scrollTop}`);
  // The page does not move while the text can still scroll. (The tick that reaches the end of the text may spill what is left
  // of it over to the page: chaining passes on the remainder, which is deliberate, plan 3.12.)
  let atEnd = false;
  for (let step = 0; step < MAX_STEPS && !atEnd; step++) {
    await wheel(centre, MouseButton.MouseButtonWheelDown);
    const state = scrollOf(api, notes);
    atEnd = state.scrollTop >= state.scrollHeight - state.clientHeight - 1;
    if (!atEnd) assert(scrollOf(api, lab).scrollTop === 0, `The page stays while the text can scroll: ${JSON.stringify(state)}`);
  }
  assert(atEnd, 'The wheel reached the end of the text');
  await wheel(centre, MouseButton.MouseButtonWheelDown);
  assert(scrollOf(api, lab).scrollTop > 0, `At the end of the text a tick scrolls the page: ${scrollOf(api, lab).scrollTop}`);
  const text = scrollOf(api, notes);
  assert(text.scrollTop >= text.scrollHeight - text.clientHeight - 1, 'And the text stays at its end');
  await capture('forms-13-page-scrolled');

  // A scrollbar thumb wins the press (plan 3.12 puts it before a drag and before a selection): dragging the text area's thumb
  // scrolls its text and neither moves the caret nor selects anything.
  await pressAction('ui_text_caret_document_start');
  await wheel(centerOf(boxOf(api, notes)), MouseButton.MouseButtonWheelDown);
  const grip = scrollOf(api, notes).thumbs?.y;
  assert(grip, 'The text area shows its scrollbar thumb after it scrolled');
  const caretBefore = selection(notes).join();
  const scrolledBefore = scrollOf(api, notes).scrollTop;
  // At once, with the pointer put over the thumb first: an overlay thumb fades out some time after the text scrolled.
  const gripStart = centerOf(grip);
  move(gripStart);
  await settle();
  const gripNow = scrollOf(api, notes).thumbs?.y;
  assert(gripNow, 'The thumb is still shown with the pointer over it');
  const gripAt = centerOf(gripNow);
  button(gripAt, true);
  await frames(CLICK_PAUSE_FRAMES);
  const gripEnd = new Vector2(gripAt.x, gripAt.y + THUMB_DRAG_PX);
  for (let step = 1; step <= THUMB_DRAG_STEPS; step++) {
    move(gripAt.lerp(gripEnd, step / THUMB_DRAG_STEPS), true);
    await frames(1);
  }
  await settle();
  button(gripEnd, false);
  await settle();
  assert(scrollOf(api, notes).scrollTop > scrolledBefore, `Dragging the thumb scrolls the text: ${scrolledBefore} to ${scrollOf(api, notes).scrollTop}`);
  assert(selection(notes).join() === caretBefore, `and leaves the caret where it was: ${caretBefore} to ${selection(notes)}`);
}

/**
 * A text area whose text ends in a line break has one more line for the caret, which the paragraph does not shape. It is
 * part of the text's height: the caret scrolls into view when Enter makes it, and the wheel reaches it.
 */
async function verifyTrailingBreak(owner: Node, api: InteractionInspection, capture: Capture, helpers: Helpers): Promise<void> {
  const { focusField } = helpers;
  // A fresh page and an empty text area.
  api.showLab('hud');
  await settle();
  api.showLab('forms');
  await settle();
  move(FAR_CORNER);
  await settle();
  const notes = 'form-notes';
  await focusField(notes);
  await typeText('aa');
  await pressAction('ui_text_newline');
  await typeText('bb');
  await pressAction('ui_text_newline');
  await typeText('cc');
  const inBox = (rect: LayoutRect): boolean => rect.y >= boxOf(api, notes).y && rect.y + rect.height <= boxOf(api, notes).y + boxOf(api, notes).height;
  const lineHeight = input(api, notes).caret?.height ?? 0;
  assert(lineHeight > 0, 'The text area has a caret rectangle');
  const full = scrollOf(api, notes);
  assert(full.scrollTop === 0 && full.scrollHeight - full.clientHeight < lineHeight / 2, `Three lines fill its three rows and no more: ${JSON.stringify(full)}`);
  await pressAction('ui_text_newline');
  assert(input(api, notes).value === 'aa\nbb\ncc\n', `Enter at the end of the text adds a line break: ${JSON.stringify(input(api, notes).value)}`);
  const grown = scrollOf(api, notes);
  assert(
    grown.scrollHeight - full.scrollHeight >= lineHeight - 1,
    `The empty line after the break is part of the text's height: ${full.scrollHeight} to ${grown.scrollHeight}`,
  );
  assert(grown.scrollTop > 0, `The text scrolled to the caret on its new line: ${grown.scrollTop}`);
  const caret = input(api, notes).caret;
  assert(caret !== null && inBox(caret), `The caret is inside the box: ${JSON.stringify(caret)} in ${JSON.stringify(boxOf(api, notes))}`);
  await capture('forms-14-after-a-final-break');

  // The wheel reaches that line too: back to the top, then down to the end of the text.
  await pressAction('ui_text_caret_document_start');
  assert(scrollOf(api, notes).scrollTop === 0, 'The caret at the start scrolls the text back to the top');
  const centre = centerOf(boxOf(api, notes));
  let atEnd = false;
  for (let step = 0; step < MAX_STEPS && !atEnd; step++) {
    await wheel(centre, MouseButton.MouseButtonWheelDown);
    const state = scrollOf(api, notes);
    atEnd = state.scrollTop >= state.scrollHeight - state.clientHeight - 1;
  }
  assert(atEnd, 'The wheel reached the end of the text');
  assert(
    Math.abs(scrollOf(api, notes).scrollTop - grown.scrollTop) <= 1,
    `and the end is where the caret on the last line put it: ${scrollOf(api, notes).scrollTop} and ${grown.scrollTop}`,
  );
}

/**
 * The fixes of docs/tracks/text-input-fixes.md that need a page of their own (`forms-extra`): a kit field whose label
 * focuses it, and a field whose box changes while it has the focus.
 */
async function verifyFixes(
  owner: Node, api: InteractionInspection, capture: Capture,
  helpers: Helpers & { focusedTestID(): string },
): Promise<void> {
  const { focusField, selection } = helpers;
  api.showLab('forms-extra');
  await settle();
  move(FAR_CORNER);
  await settle();

  // A press on the kit label focuses a selectTextOnFocus field from a click handler, with the pointer up. The next press in
  // the field is an ordinary press in a focused field and places the caret: it used to be taken for the press that had
  // focused the field, and ignored.
  await click(centerOf(node(api, 'extra-kit-label').rect));
  assert(helpers.focusedTestID() === 'extra-kit-input', `A press on the label focuses the field: ${helpers.focusedTestID()}`);
  const kitText = input(api, 'extra-kit-input').value;
  assert(selection('extra-kit-input').join() === `0,${kitText.length}`, `and the field selects all of its text: ${selection('extra-kit-input')}`);
  await click(centerOf(node(api, 'extra-kit-input').rect));
  const placed = selection('extra-kit-input');
  assert(placed[0] === placed[1], `A press in the focused field places the caret: ${placed}`);
  // And a press that does focus it still selects all of it, and its release leaves the selection alone.
  await focusField('extra-chat');
  await click(centerOf(node(api, 'extra-kit-input').rect));
  assert(selection('extra-kit-input').join() === `0,${kitText.length}`, `A press that focuses the field selects all of it: ${selection('extra-kit-input')}`);

  // A box that changes under a focused field takes its caret with it: F6 narrows the field while its caret is at the end of
  // a text that did not fit even the wide box.
  await focusField('extra-resize');
  await typeText('a text that is much too long for either width of the field');
  const wide = input(api, 'extra-resize');
  assert(wide.scrollLeft > 0, `The text scrolled to the caret: ${wide.scrollLeft}`);
  const insideBox = (): boolean => {
    const caret = input(api, 'extra-resize').caret;
    const box = node(api, 'extra-resize').rect;
    return caret !== null && caret.x >= box.x && caret.x + caret.width <= box.x + box.width;
  };
  assert(insideBox(), 'The caret is inside the wide box');
  const wideWidth = node(api, 'extra-resize').rect.width;
  keyEvent({ keycode: Key.KeyF6 }, true);
  keyEvent({ keycode: Key.KeyF6 }, false);
  await settle();
  assert(node(api, 'extra-resize').rect.width < wideWidth, `F6 narrows the field: ${node(api, 'extra-resize').rect.width} from ${wideWidth}`);
  assert(insideBox(), `The caret is inside the narrow box: ${JSON.stringify(input(api, 'extra-resize').caret)} in ${JSON.stringify(node(api, 'extra-resize').rect)}`);
  await capture('forms-15-narrowed-under-the-caret');
  keyEvent({ keycode: Key.KeyF6 }, true);
  keyEvent({ keycode: Key.KeyF6 }, false);
  await settle();
  assert(node(api, 'extra-resize').rect.width === wideWidth && insideBox(), 'and again when the box is wide again');
}

/** maxLength, a transforming controlled field, read-only, a password and blocked copy. */
async function verifyModes(owner: Node, api: InteractionInspection, capture: Capture, helpers: Helpers): Promise<void> {
  const { focusField, selection } = helpers;

  // maxLength: counted in UTF-16 units, an insertion that does not fit is cut, one that fits nothing is refused.
  await focusField('form-code');
  await typeText('abcdefgh');
  assert(input(api, 'form-code').value === 'abcdef', `maxLength stops the text at ${CODE_MAX_LENGTH}: ${input(api, 'form-code').value}`);
  assert(readForm(api).code === 'abcdef', 'React never saw the characters that did not fit');
  const counted = input(api, 'form-code').eventCount;
  await typeText('z');
  assert(input(api, 'form-code').eventCount === counted, 'A refused insertion makes no input event');
  await pressAction('ui_text_backspace', false, 2);
  await typeText('😀');
  assert(input(api, 'form-code').value === 'abcd😀', `An emoji takes two units of the six: ${input(api, 'form-code').value}`);
  await typeText('q');
  assert(input(api, 'form-code').value === 'abcd😀', 'No room is left for another character');
  await capture('forms-08-max-length');

  // A controlled field that stores capitals: native holds the capitals, and the caret stays where it was.
  await focusField('form-shout');
  await typeText('abc');
  assert(input(api, 'form-shout').value === 'ABC', `The transformed text is native's text: ${input(api, 'form-shout').value}`);
  assert(selection('form-shout').join() === '3,3', 'The caret stays after a transform');
  await pressAction('ui_text_caret_left');
  await typeText('x');
  assert(input(api, 'form-shout').value === 'ABXC', `Typing in the middle is transformed too: ${input(api, 'form-shout').value}`);
  assert(selection('form-shout').join() === '3,3', `And the caret stays after the new character: ${selection('form-shout')}`);
  assert(readForm(api).shout === 'ABXC', 'React holds the capitals');

  // Read-only: focusable, the caret moves, nothing edits, copy still works.
  await focusField('form-readonly');
  const frozen = input(api, 'form-readonly').value;
  await pressAction('ui_text_select_all');
  assert(selection('form-readonly').join() === `0,${frozen.length}`, 'A read-only field can be selected');
  const countBefore = input(api, 'form-readonly').eventCount;
  await typeText('x');
  await pressAction('ui_text_backspace');
  await pressAction('ui_cut');
  await pressAction('ui_paste');
  assert(input(api, 'form-readonly').value === frozen && input(api, 'form-readonly').eventCount === countBefore, 'Nothing edits a read-only field');
  verifierClipboard.set('sentinel');
  await pressAction('ui_copy');
  assert(verifierClipboard.get() === frozen, `Copy works in a read-only field: ${verifierClipboard.get()}`);
  await capture('forms-09-read-only');

  // A password: bullets on screen, the real text to React, nothing to the clipboard.
  await focusField('form-password');
  await typeText('s3cret pass');
  assert(input(api, 'form-password').value === 's3cret pass', 'A password holds what was typed');
  assert(readForm(api).password === 's3cret pass', 'React gets the real text');
  assert(input(api, 'form-password').displayText === '•'.repeat(11), `The input draws bullets: ${input(api, 'form-password').displayText}`);
  await capture('forms-10-password');
  verifierClipboard.set('sentinel');
  await pressAction('ui_text_select_all');
  await pressAction('ui_copy');
  await pressAction('ui_cut');
  assert(verifierClipboard.get() === 'sentinel', `Copy and cut of a password write nothing: ${verifierClipboard.get()}`);
  assert(input(api, 'form-password').value === 's3cret pass', 'Cut of a password deletes nothing');
  await pressAction('ui_text_caret_word_left');
  assert(selection('form-password').join() === '0,0', `A password has no words to jump between: ${selection('form-password')}`);
}
