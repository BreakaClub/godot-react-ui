import {
  Engine, InputEventMouseButton, InputEventScreenDrag, InputEventScreenTouch, MouseButton, MouseButtonMask, Node, RenderingServer, Vector2,
} from 'godot';
import type { UISelection } from '../../src';
import type { LayoutRect, NativeTouchHandle, NativeTouchMenuAction, NativeTouchSelection } from '../../src/native';
import type { InteractionInspection } from './verify-interaction';
import { assertionTally, parseVerifierEvent, verifierClipboard } from './verifier-input';

/**
 * Touch text selection (`docs/tracks/touch-selection.md`), natively, with the screen-touch and screen-drag events a phone sends: a long
 * press selects the word under the finger, the handles move its ends, the menu copies and selects all, a tap clears, a swipe scrolls and
 * selects nothing, and the same in a text input and its text area. The lab is `touch-selection-lab.tsx`.
 */

type Api = InteractionInspection;

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
/** Frames between the events of one touch. */
const TOUCH_PAUSE_FRAMES = 2;
const FIRST_TOUCH = 0;
/** `TOUCH_SELECT_HOLD_MS` in `native/touch_selection.rs`. */
const HOLD_MS = 500;
/** A touch that has been down this long has not been held long enough. */
const EARLY_MS = 250;
/** The real time a finger is held for the hold to have elapsed on the engine's clock, with slack for frames. */
const HELD_MS = HOLD_MS + 350;
/** How long a finger rests at a container's edge for it to autoscroll a good way. */
const AUTOSCROLL_REST_MS = 900;
/** An offset is a float and a frame may land half a step apart: this much slack either way. */
const SCROLL_TOLERANCE_PX = 1.5;
/** Where a caret or a stem is against where the text puts it. */
const POSITION_TOLERANCE_PX = 1.5;
/** The pan: this many steps of this many pixels. The content follows from where the slop was crossed, which is the first step. */
const PAN_STEPS = 6;
const PAN_STEP_PX = 20;
const PAN_FOLLOWED_PX = (PAN_STEPS - 1) * PAN_STEP_PX;
/** Steps a finger takes between two places, and the margin it keeps from a container's edge when it rests there. */
const DRAG_STEPS = 5;
const EDGE_REST_PX = 6;
/** The channel difference a raster pixel may have from its colour. */
const PIXEL_TOLERANCE = 0.06;
/** The handles' default colour (`DEFAULT_SELECTION_COLOR` without its alpha: blue-500), and the menu's (slate-900). */
const HANDLE_RGB: readonly [number, number, number] = [0x3b / 255, 0x82 / 255, 0xf6 / 255];
const MENU_RGB: readonly [number, number, number] = [0x0f / 255, 0x17 / 255, 0x2a / 255];
const PAGE = 'touch-selection-page';
/** The lab's texts, whose offsets the checks name. */
const P1 = 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.';
const INPUT_VALUE = 'alpha beta gamma delta epsilon zeta eta theta';
const AREA_VALUE = 'one two three\nfour five six\nseven eight nine\nten eleven twelve\nthirteen fourteen fifteen';

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await sleep(FRAME_POLL_MS);
}

async function settle(): Promise<void> {
  const startFrame = Engine.getProcessFrames();
  await sleep(SETTLE_MS);
  while (Engine.getProcessFrames() - startFrame < MIN_SETTLE_FRAMES) await sleep(FRAME_POLL_MS);
}

function node(api: Api, testID: string): NonNullable<ReturnType<Api['find']>> {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

/** The text of the element with `testID` and everything in it, as a reader sees it (a button's label is a child). */
function textOf(api: Api, testID: string): string {
  const snapshot = api.snapshot();
  const byId = new Map(snapshot.nodes.map(candidate => [candidate.id, candidate]));
  const collect = (id: number): string => {
    const found = byId.get(id);
    assert(found, `The snapshot has node ${id}`);
    return found.text + found.children.map(collect).join('');
  };
  return collect(node(api, testID).id);
}

function centreOf(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

// ---------------------------------------------------------------------------------------------------
// A finger and a mouse
// ---------------------------------------------------------------------------------------------------

function touch(position: Vector2, pressed: boolean): void {
  const event = new InputEventScreenTouch();
  event.index = FIRST_TOUCH;
  event.position = position;
  event.pressed = pressed;
  parseVerifierEvent(event);
}

function touchDrag(position: Vector2, relative: Vector2): void {
  const event = new InputEventScreenDrag();
  event.index = FIRST_TOUCH;
  event.position = position;
  event.relative = relative;
  parseVerifierEvent(event);
}

function mouseClick(position: Vector2): void {
  for (const pressed of [true, false]) {
    const event = new InputEventMouseButton();
    event.position = position;
    event.globalPosition = position;
    event.buttonIndex = MouseButton.MouseButtonLeft;
    event.pressed = pressed;
    event.buttonMask = pressed ? MouseButtonMask.MouseButtonMaskLeft : 0;
    parseVerifierEvent(event);
  }
}

async function tap(position: Vector2): Promise<void> {
  touch(position, true);
  await frames(TOUCH_PAUSE_FRAMES);
  touch(position, false);
  await settle();
}

/** The finger goes down at `position` and stays there until the hold has elapsed; it is still down. */
async function holdDown(position: Vector2): Promise<void> {
  touch(position, true);
  await frames(TOUCH_PAUSE_FRAMES);
  await sleep(HELD_MS);
  await frames(TOUCH_PAUSE_FRAMES);
}

/** A long press at `position`, lifted: the selection it made stays, with its menu. */
async function holdThenLift(position: Vector2): Promise<void> {
  await holdDown(position);
  touch(position, false);
  await settle();
}

/** A finger down at `from` moves to `to` in `steps` steps, a few frames apart; it is still down. */
async function glide(from: Vector2, to: Vector2, steps = DRAG_STEPS): Promise<void> {
  let last = from;
  for (let step = 1; step <= steps; step++) {
    const next = new Vector2(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps);
    touchDrag(next, new Vector2(next.x - last.x, next.y - last.y));
    last = next;
    await frames(TOUCH_PAUSE_FRAMES);
  }
}

// ---------------------------------------------------------------------------------------------------
// What the lab holds
// ---------------------------------------------------------------------------------------------------

/** The rectangle of the characters `start..end` of the text with `testID`, the first line's if the range wraps. */
function rangeRect(api: Api, testID: string, start: number, end: number): LayoutRect {
  const rects = api.textRanges(testID, start, end);
  assert(rects !== null && rects[0] !== undefined, `${testID} has a range ${start}..${end}`);
  return rects[0];
}

/** Where the word `start..end` of the text with `testID` is, at its middle. */
function wordPoint(api: Api, testID: string, start: number, end: number): Vector2 {
  return centreOf(rangeRect(api, testID, start, end));
}

function caretX(api: Api, testID: string, offset: number, side: 'before' | 'after'): number {
  const caret = api.textCaret(testID, offset, side);
  assert(caret !== null, `${testID} has a caret at ${offset}`);
  return caret.x;
}

function selectionOf(api: Api): UISelection {
  const selection = api.selection();
  assert(selection !== undefined, 'Something is selected');
  return selection;
}

function chromeOf(api: Api): NativeTouchSelection {
  const chrome = api.touchSelection();
  assert(chrome !== undefined, 'The selection shows handles and a menu');
  return chrome;
}

function handleOf(api: Api, end: 'start' | 'end'): NativeTouchHandle {
  const handle = chromeOf(api).handles.find(candidate => candidate.end === end);
  assert(handle !== undefined, `The ${end} handle is shown`);
  return handle;
}

function menuActions(api: Api): NativeTouchMenuAction[] {
  return chromeOf(api).menu?.items.map(item => item.action) ?? [];
}

function menuItemPoint(api: Api, action: NativeTouchMenuAction): Vector2 {
  const item = chromeOf(api).menu?.items.find(candidate => candidate.action === action);
  assert(item !== undefined, `The menu offers ${action}: ${JSON.stringify(menuActions(api))}`);
  return centreOf(item.rect);
}

/** The middle of a handle's stem. */
function stemMiddle(handle: NativeTouchHandle): Vector2 {
  return new Vector2(handle.stem.x + handle.stem.width / 2, handle.stem.y + handle.stem.height / 2);
}

function ballOf(handle: NativeTouchHandle): Vector2 {
  return new Vector2(handle.ball.x, handle.ball.y);
}

function inputState(api: Api, testID: string): { value: string; start: number; end: number } {
  const state = node(api, testID).textInput;
  assert(state, `${testID} is a text input`);
  return { value: state.value, start: state.selectionStart, end: state.selectionEnd };
}

function near(actual: number, expected: number, tolerance = POSITION_TOLERANCE_PX): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function scrollTop(api: Api, testID: string): number {
  const { scroll } = node(api, testID);
  assert(scroll, `${testID} is a scroll container`);
  return scroll.scrollTop;
}

/** The pixel at a logical point of the root, from the viewport's raster (which is as many pixels as the window has). */
function pixelAt(owner: Node, api: Api, point: Vector2): [number, number, number] {
  RenderingServer.forceDraw();
  const image = owner.getViewport()?.getTexture()?.getImage();
  assert(image, 'Native verification requires a rendered viewport');
  const scale = image.getWidth() / api.snapshot().width;
  const color = image.getPixel(Math.floor(point.x * scale), Math.floor(point.y * scale));
  return [color.r, color.g, color.b];
}

function closeTo(pixel: readonly number[], expected: readonly number[]): boolean {
  return pixel.every((channel, index) => Math.abs(channel - (expected[index] ?? 0)) <= PIXEL_TOLERANCE);
}

// ---------------------------------------------------------------------------------------------------
// The section
// ---------------------------------------------------------------------------------------------------

async function openLab(api: Api): Promise<void> {
  api.showLab('hud');
  await settle();
  api.showLab('touch-selection');
  await settle();
  api.scrollTo(PAGE, 0);
  await settle();
  api.resetSelectionChanges();
  api.resetPointerCancels();
}

/** A long press on the word `start..end` of the text with `testID`, lifted: the word is selected and the menu shows. */
async function selectWord(api: Api, testID: string, start: number, end: number): Promise<Vector2> {
  const at = wordPoint(api, testID, start, end);
  await holdThenLift(at);
  return at;
}

/** A finger on the handle `end` drags it to `target` (the place on screen the stem's middle should reach); it lifts there. */
async function dragHandle(api: Api, end: 'start' | 'end', target: Vector2, rest = 0): Promise<void> {
  const handle = handleOf(api, end);
  const from = ballOf(handle);
  const middle = stemMiddle(handle);
  const grab = new Vector2(middle.x - from.x, middle.y - from.y);
  const finger = new Vector2(target.x - grab.x, target.y - grab.y);
  touch(from, true);
  await frames(TOUCH_PAUSE_FRAMES);
  assert(chromeOf(api).gesture === 'handle', `A finger on the ${end} handle drags it: ${chromeOf(api).gesture}`);
  await glide(from, finger);
  if (rest > 0) await sleep(rest);
  touch(finger, false);
  await settle();
}

async function verifyDocumentText(owner: Node, api: Api, capture: (name: string) => Promise<void>): Promise<void> {
  const brown = { start: P1.indexOf('brown'), end: P1.indexOf('brown') + 'brown'.length };
  assert(brown.start === 10 && brown.end === 15, 'The lab text is what the offsets below name');

  // A touch is not a selection until it has been held: nothing at first, then the word under the finger, exactly.
  const at = wordPoint(api, 'ts-p1', brown.start, brown.end);
  touch(at, true);
  await frames(TOUCH_PAUSE_FRAMES);
  await sleep(EARLY_MS);
  assert(api.selection() === undefined, 'Before the hold has elapsed nothing is selected');
  await sleep(HELD_MS - EARLY_MS);
  await frames(TOUCH_PAUSE_FRAMES);
  const word = selectionOf(api);
  assert(word.text === 'brown' && word.anchor.node.testID === 'ts-p1' && word.anchor.offset === brown.start && word.focus.offset === brown.end,
    `A long press selects the word under the finger, offsets 10 to 15: ${JSON.stringify(word.text)} ${word.anchor.offset}..${word.focus.offset}`);
  assert(api.selectionChanges() >= 1, 'and tells the root with a selectionchange');
  assert(api.pointerCancels() === 1, `The long press ended the finger's pointer events with a pointercancel: ${api.pointerCancels()}`);
  const held = chromeOf(api);
  assert(held.owner?.kind === 'document' && held.handles.length === 2 && held.gesture === 'extending',
    `Its handles show while the finger is still down: ${JSON.stringify(held.handles.map(handle => handle.end))} ${held.gesture}`);
  assert(held.menu === null, 'and the menu waits for the finger to lift');
  touch(at, false);
  await settle();
  assert(selectionOf(api).text === 'brown', 'Lifting the finger keeps the selection');
  assert(chromeOf(api).gesture === 'idle' && menuActions(api).join() === 'copy,selectAll', `and shows the menu, Copy and Select All: ${menuActions(api)}`);
  assert(api.pointerCancels() === 1, 'and the lift is no pointer event: the cancel is the only one');

  // The handles are on the edges of the word, exactly where the text puts them.
  const start = handleOf(api, 'start');
  const end = handleOf(api, 'end');
  const startCaret = api.textCaret('ts-p1', brown.start, 'after');
  const endCaret = api.textCaret('ts-p1', brown.end, 'before');
  assert(startCaret !== null && endCaret !== null, 'The ends have carets');
  assert(near(stemMiddle(start).x, startCaret.x) && near(start.stem.y, startCaret.y) && near(start.stem.height, startCaret.height),
    `The start handle stands on the word's start: ${stemMiddle(start).x} against ${startCaret.x}`);
  assert(near(stemMiddle(end).x, endCaret.x) && near(end.stem.y, endCaret.y),
    `The end handle stands on the word's end: ${stemMiddle(end).x} against ${endCaret.x}`);
  assert(start.ball.y < start.stem.y && end.ball.y > end.stem.y + end.stem.height,
    'The start handle hangs above its line and the end handle below it');
  assert(start.target.width >= 44 && start.target.height >= 44, `A handle is grabbed by a 44 px square: ${start.target.width}`);
  const menu = chromeOf(api).menu;
  assert(menu !== null && menu.area.y + menu.area.height <= start.stem.y, 'The menu sits above the selection');

  // Pixels: the ball is the selection's colour, the menu is dark, its label is light.
  const ball = pixelAt(owner, api, ballOf(start));
  assert(closeTo(ball, HANDLE_RGB), `A handle is drawn in the selection's colour: ${ball}`);
  const label = menu?.items[0]?.rect;
  assert(menu && label, 'The menu has a first item');
  const body = pixelAt(owner, api, new Vector2(label.x + 3, label.y + label.height / 2));
  assert(closeTo(body, MENU_RGB), `The menu is drawn dark: ${body}`);
  let lightest = 0;
  for (let step = 0; step < 40; step++) {
    const probe = pixelAt(owner, api, new Vector2(label.x + 14 + step * (label.width - 28) / 40, label.y + label.height / 2));
    lightest = Math.max(lightest, probe[0], probe[1], probe[2]);
  }
  assert(lightest > 0.85, `The menu's label is light on it: ${lightest}`);
  await capture('touch-selection-01-word');

  // Dragging the end handle moves the end, by characters, and the start stays.
  const fox = P1.indexOf('fox') + 'fox'.length;
  await dragHandle(api, 'end', new Vector2(caretX(api, 'ts-p1', fox, 'before'), stemMiddle(end).y));
  let moved = selectionOf(api);
  assert(moved.text === 'brown fox' && moved.anchor.offset === 10 && moved.focus.offset === fox,
    `Dragging the end handle right extends the selection to 19: ${JSON.stringify(moved.text)} ${moved.anchor.offset}..${moved.focus.offset}`);
  assert(near(stemMiddle(handleOf(api, 'end')).x, caretX(api, 'ts-p1', fox, 'before')), 'and the handle stands on the new end');
  await capture('touch-selection-02-end-dragged');
  const bro = 13;
  await dragHandle(api, 'end', new Vector2(caretX(api, 'ts-p1', bro, 'before'), stemMiddle(handleOf(api, 'end')).y));
  moved = selectionOf(api);
  assert(moved.text === 'bro' && moved.anchor.offset === 10 && moved.focus.offset === bro,
    `and left shrinks it: ${JSON.stringify(moved.text)} ${moved.anchor.offset}..${moved.focus.offset}`);
  // The start handle moves the start, and the end stays.
  const quick = P1.indexOf('quick');
  await dragHandle(api, 'start', new Vector2(caretX(api, 'ts-p1', quick, 'after'), stemMiddle(handleOf(api, 'start')).y));
  moved = selectionOf(api);
  assert(moved.text === 'quick bro' && moved.focus.offset === quick && moved.anchor.offset === bro,
    `The start handle moves the start to 4: ${JSON.stringify(moved.text)}`);
  // A handle that goes past the other end swaps with it.
  const past = P1.indexOf('jumps');
  await dragHandle(api, 'start', new Vector2(caretX(api, 'ts-p1', past, 'after'), stemMiddle(handleOf(api, 'start')).y));
  moved = selectionOf(api);
  assert(moved.text === P1.slice(bro, past) && moved.anchor.offset === bro && moved.focus.offset === past,
    `A start handle dragged past the end flips the selection: ${JSON.stringify(moved.text)}`);
  assert(chromeOf(api).handles.length === 2, 'and both handles are still there');
  // A handle never collapses the selection: dragged onto the other end, it leaves what it had.
  const wn = bro + 1;
  await dragHandle(api, 'end', new Vector2(caretX(api, 'ts-p1', wn, 'before'), stemMiddle(handleOf(api, 'end')).y));
  assert(selectionOf(api).text === P1.slice(bro, wn), `An end handle dragged near the start keeps one character: ${JSON.stringify(selectionOf(api).text)}`);
  await dragHandle(api, 'end', new Vector2(caretX(api, 'ts-p1', bro, 'before'), stemMiddle(handleOf(api, 'end')).y));
  assert(selectionOf(api).text === P1.slice(bro, wn), `and onto the start does nothing: ${JSON.stringify(selectionOf(api).text)}`);

  // The menu's Copy puts the selected text on the clipboard and leaves the selection, and its menu, done.
  verifierClipboard.set('sentinel');
  const before = selectionOf(api).text;
  await tap(menuItemPoint(api, 'copy'));
  assert(verifierClipboard.get() === before, `Copy puts the selection on the clipboard: ${JSON.stringify(verifierClipboard.get())}`);
  assert(api.selection()?.text === before && chromeOf(api).handles.length === 2 && chromeOf(api).menu === null,
    'and keeps the selection and its handles, with the menu gone');

  // Select All selects every selectable text, and the menu, with nothing left to select, offers Copy only.
  await tap(new Vector2(0, 0));
  assert(api.selection() === undefined && api.touchSelection() === undefined, 'A tap elsewhere clears the selection and the handles');
  await selectWord(api, 'ts-p1', brown.start, brown.end);
  await tap(menuItemPoint(api, 'selectAll'));
  const all = selectionOf(api);
  assert(all.text.startsWith('The quick brown fox') && all.text.includes('Scrolling row 13') && all.text.endsWith('it does not select.'),
    `Select All selects all the selectable text: ${JSON.stringify(all.text.slice(0, 40))}...`);
  assert(menuActions(api).join() === 'copy', `and the menu then offers Copy only: ${menuActions(api)}`);
  await capture('touch-selection-03-all');

  // A tap on something that is not selectable clears it, and the root hears.
  const changes = api.selectionChanges();
  await tap(centreOf(node(api, 'ts-readout').rect));
  assert(api.selection() === undefined && api.touchSelection() === undefined, 'A tap on plain text clears the selection and hides the handles and menu');
  assert(api.selectionChanges() > changes, 'and tells the root with a selectionchange');
}

async function verifyArbitration(api: Api): Promise<void> {
  // A swipe still scrolls, and selects nothing, whatever it began on and however long it rests after it has moved.
  const page = node(api, PAGE);
  assert(page.scroll !== null && page.scroll.maxScrollTop > PAN_FOLLOWED_PX, `The lab page scrolls: ${page.scroll?.maxScrollTop}`);
  const onText = centreOf(node(api, 'ts-p2').rect);
  touch(onText, true);
  await frames(TOUCH_PAUSE_FRAMES);
  await glide(onText, new Vector2(onText.x, onText.y - PAN_STEPS * PAN_STEP_PX), PAN_STEPS);
  await sleep(HELD_MS);
  await frames(TOUCH_PAUSE_FRAMES);
  assert(api.selection() === undefined && api.touchSelection() === undefined, 'A swipe that began on selectable text selects nothing, though the finger rests past the hold');
  touch(new Vector2(onText.x, onText.y - PAN_STEPS * PAN_STEP_PX), false);
  await settle();
  const scrolled = scrollTop(api, PAGE);
  assert(near(scrolled, PAN_FOLLOWED_PX, SCROLL_TOLERANCE_PX), `and scrolls the page by the finger's travel from the slop: ${scrolled}`);
  api.scrollTo(PAGE, 0);
  await settle();

  // A touch that moved before the hold elapsed is a pan or a tap, not a selection, even if it is back where it began.
  const p2 = centreOf(node(api, 'ts-p2').rect);
  touch(p2, true);
  await frames(TOUCH_PAUSE_FRAMES);
  await glide(p2, new Vector2(p2.x + 30, p2.y), 2);
  await glide(new Vector2(p2.x + 30, p2.y), p2, 2);
  await sleep(HELD_MS);
  touch(p2, false);
  await settle();
  assert(api.selection() === undefined, 'A finger that left the slop and came back selects nothing');

  // A tap is still a tap: nothing selects, and a button under it is pressed.
  const label = textOf(api, 'ts-toggle-readonly');
  await tap(centreOf(node(api, 'ts-toggle-readonly').rect));
  assert(textOf(api, 'ts-toggle-readonly') !== label, `A tap on a button still clicks it: ${label}`);
  await tap(centreOf(node(api, 'ts-toggle-readonly').rect));
  assert(textOf(api, 'ts-toggle-readonly') === label && api.selection() === undefined, 'and a tap on text selects nothing');

  // Whitespace: the space between two words and the room beside a line's end are not words.
  const space = P1.indexOf(' ', 'The quick'.length);
  for (const [name, point] of [
    ['the space between two words', wordPoint(api, 'ts-p1', space, space + 1)],
    ['the empty room beside the last line', new Vector2(rangeRect(api, 'ts-p1', P1.length - 1, P1.length).x + 90, rangeRect(api, 'ts-p1', P1.length - 1, P1.length).y + 6)],
  ] as const) {
    await holdDown(point);
    assert(api.selection() === undefined && api.touchSelection() === undefined, `A long press on ${name} selects nothing`);
    touch(point, false);
    await settle();
  }

  // A swipe scrolls and keeps a selection: the handles stay on the text and the menu comes back when the scrolling stops.
  await selectWord(api, 'ts-p1', 10, 15);
  const endBefore = handleOf(api, 'end').stem.y;
  const swipeFrom = centreOf(node(api, 'ts-readout').rect);
  touch(swipeFrom, true);
  await frames(TOUCH_PAUSE_FRAMES);
  const swipeTo = new Vector2(swipeFrom.x, swipeFrom.y - PAN_STEPS * PAN_STEP_PX);
  await glide(swipeFrom, swipeTo, PAN_STEPS);
  assert(api.selection()?.text === 'brown', 'A swipe keeps the selection');
  assert(chromeOf(api).menu === null, 'and the menu steps aside while the page scrolls');
  await sleep(HELD_MS);
  touch(swipeTo, false);
  await settle();
  await sleep(SETTLE_MS * 4);
  assert(near(endBefore - handleOf(api, 'end').stem.y, scrollTop(api, PAGE)), `The handles stay on the text as the page scrolls under them: ${endBefore - handleOf(api, 'end').stem.y} for ${scrollTop(api, PAGE)}`);
  assert(menuActions(api).join() === 'copy,selectAll', `and the menu is back once it has stopped: ${menuActions(api)}`);
  api.scrollTo(PAGE, 0);
  await settle();
  await tap(centreOf(node(api, 'ts-readout').rect));

  // A mouse press ends a touch selection: the mouse makes its own, or none.
  await selectWord(api, 'ts-p1', 10, 15);
  mouseClick(centreOf(node(api, 'ts-readout').rect));
  await settle();
  assert(api.touchSelection() === undefined && api.selection() === undefined, 'A mouse press ends a touch selection and hides its handles');
}

async function verifyDraggable(api: Api): Promise<void> {
  // The hold on a draggable element is the drag's: the text in it is not selected.
  const at = centreOf(node(api, 'ts-drag-text').rect);
  await holdDown(at);
  assert(api.selection() === undefined && api.touchSelection() === undefined, 'A long press inside a draggable element selects nothing');
  assert(api.snapshot().drag.state === 'dragging', `It starts the drag: ${api.snapshot().drag.state}`);
  touch(at, false);
  await settle();
}

async function verifyList(api: Api, capture: (name: string) => Promise<void>): Promise<void> {
  // A handle dragged to the edge of a scroll container scrolls it, and the selection follows the finger down the list.
  const list = node(api, 'ts-scroll').rect;
  assert(scrollTop(api, 'ts-scroll') === 0, 'The list starts at the top');
  await selectWord(api, 'ts-row-1', 'Scrolling '.length, 'Scrolling row'.length);
  assert(selectionOf(api).text === 'row', `A long press selects a word of a row of the list: ${selectionOf(api).text}`);
  const end = handleOf(api, 'end');
  const from = ballOf(end);
  const rest = new Vector2(list.x + list.width / 2, list.y + list.height - EDGE_REST_PX);
  touch(from, true);
  await frames(TOUCH_PAUSE_FRAMES);
  await glide(from, rest);
  await sleep(AUTOSCROLL_REST_MS);
  await frames(TOUCH_PAUSE_FRAMES);
  const scrolled = scrollTop(api, 'ts-scroll');
  assert(scrolled > list.height, `A handle held at the bottom edge of the list scrolls it: ${scrolled}`);
  const reached = selectionOf(api);
  const row = Number(/^ts-row-(\d+)$/.exec(reached.focus.node.testID ?? '')?.[1]);
  assert(Number.isInteger(row) && row >= 10 && reached.text.includes('row 9'), `and the selection reaches down the list: ${reached.focus.node.testID} ${JSON.stringify(reached.text.slice(-20))}`);
  assert(reached.anchor.node.testID === 'ts-row-1' && reached.anchor.offset === 'Scrolling row'.length - 3, 'while its start stays where it began');
  touch(rest, false);
  await settle();
  assert(chromeOf(api).handles.map(handle => handle.end).join() === 'end', `The handle of an end that scrolled out of view is not shown: ${chromeOf(api).handles.map(handle => handle.end)}`);
  await capture('touch-selection-04-list-autoscrolled');
  api.scrollTo('ts-scroll', 0);
  await settle();
  assert(chromeOf(api).handles.length === 2 || chromeOf(api).handles.length === 1, 'Scrolling back brings the other handle with the text');
  await tap(centreOf(node(api, 'ts-readout').rect));
}

async function verifyInputs(api: Api, capture: (name: string) => Promise<void>): Promise<void> {
  // The words' places are measured first: the caret stands at each offset in turn, which is where a press at the offset's edge lands.
  const field = node(api, 'ts-input').rect;
  const wordAt = (word: string) => ({ start: INPUT_VALUE.indexOf(word), end: INPUT_VALUE.indexOf(word) + word.length });
  const [alpha, beta, delta] = [wordAt('alpha'), wordAt('beta'), wordAt('delta')];
  const gammaEnd = INPUT_VALUE.indexOf('gamma') + 'gamma'.length;
  const xs = new Map<number, number>();
  for (const offset of [alpha.start, alpha.end, beta.start, beta.end, gammaEnd, delta.start, delta.end]) {
    const caret = api.inputCaretAt('ts-input', offset);
    assert(caret !== null, `The caret of the field is laid out at ${offset}`);
    xs.set(offset, caret.x);
  }
  const x = (offset: number): number => xs.get(offset) ?? Number.NaN;
  const y = field.y + field.height / 2;
  const middle = (word: { start: number; end: number }) => new Vector2((x(word.start) + x(word.end)) / 2, y);

  // A long press in a text input selects the word under the finger, in the input's own selection.
  const at = middle(beta);
  await holdDown(at);
  let state = inputState(api, 'ts-input');
  assert(state.start === beta.start && state.end === beta.end, `A long press in a text input selects the word under the finger, 6 to 10: ${state.start}..${state.end}`);
  assert(chromeOf(api).owner?.kind === 'input' && chromeOf(api).handles.length === 2, 'and shows handles for it');
  assert(api.selection() === undefined, 'It is the input\'s selection, not the document\'s');
  assert(api.pointerCancels() >= 1, 'and cancels the finger\'s pointer events');
  touch(at, false);
  await settle();
  assert(menuActions(api).join() === 'cut,copy,paste,selectAll', `The menu of an editable field offers Cut, Copy, Paste and Select All: ${menuActions(api)}`);
  assert(near(stemMiddle(handleOf(api, 'start')).x, x(beta.start)), `The start handle stands on the word's start: ${stemMiddle(handleOf(api, 'start')).x} against ${x(beta.start)}`);
  await capture('touch-selection-05-input');

  // The end handle moves the end of the field's selection.
  await dragHandle(api, 'end', new Vector2(x(gammaEnd), y));
  state = inputState(api, 'ts-input');
  assert(state.start === beta.start && state.end === gammaEnd, `Dragging the end handle extends the field's selection to 16: ${state.start}..${state.end}`);
  verifierClipboard.set('sentinel');
  await tap(menuItemPoint(api, 'copy'));
  assert(verifierClipboard.get() === 'beta gamma', `Copy in a field copies its selection: ${JSON.stringify(verifierClipboard.get())}`);
  assert(inputState(api, 'ts-input').end === gammaEnd && api.touchSelection()?.menu === null, 'and keeps it');

  // A tap in the field puts the caret there and ends the selection: the handles and the menu go.
  const delta2 = middle(delta);
  await tap(delta2);
  state = inputState(api, 'ts-input');
  assert(state.start === state.end && state.start >= delta.start && state.start <= delta.end, `A tap in the field places the caret: ${state.start}..${state.end}`);
  assert(api.touchSelection() === undefined, 'and hides the handles and the menu');

  // Paste replaces the selected word with the clipboard's text, and the selection with it.
  await holdThenLift(middle(delta));
  assert(inputState(api, 'ts-input').start === delta.start && inputState(api, 'ts-input').end === delta.end, 'A long press selects "delta"');
  await tap(menuItemPoint(api, 'paste'));
  assert(inputState(api, 'ts-input').value === INPUT_VALUE.replace('delta', 'beta gamma'), `Paste puts the clipboard's text in place of the selection: ${inputState(api, 'ts-input').value}`);
  assert(api.touchSelection() === undefined, 'and the handles and the menu go with the selection');
  // Cut takes the word out and puts it on the clipboard.
  await holdThenLift(middle(alpha));
  assert(inputState(api, 'ts-input').start === alpha.start && inputState(api, 'ts-input').end === alpha.end, 'A long press selects "alpha"');
  await tap(menuItemPoint(api, 'cut'));
  assert(verifierClipboard.get() === 'alpha' && inputState(api, 'ts-input').value === INPUT_VALUE.replace('delta', 'beta gamma').slice('alpha'.length),
    `Cut takes the word out of the field and onto the clipboard: ${JSON.stringify(inputState(api, 'ts-input').value)} ${JSON.stringify(verifierClipboard.get())}`);

  // A read-only field has nothing to cut or paste into.
  await tap(centreOf(node(api, 'ts-toggle-readonly').rect));
  await holdThenLift(new Vector2(x(beta.start) + 4, y));
  assert(menuActions(api).join() === 'copy,selectAll', `The menu of a read-only field offers Copy and Select All: ${menuActions(api)}`);
  await tap(menuItemPoint(api, 'selectAll'));
  const everything = inputState(api, 'ts-input');
  assert(everything.start === 0 && everything.end === everything.value.length, `Select All selects the whole field: ${everything.start}..${everything.end}`);
  assert(menuActions(api).join() === 'copy', `and then only Copy is left: ${menuActions(api)}`);
  await tap(centreOf(node(api, 'ts-readout').rect));
  await tap(centreOf(node(api, 'ts-toggle-readonly').rect));
  assert(api.touchSelection() === undefined, 'A tap away from the field hides its handles');
}

async function verifyArea(api: Api, capture: (name: string) => Promise<void>): Promise<void> {
  // A text area: a word on its second line, the handles on that line, and a handle at its bottom edge scrolls the text.
  const five = { start: AREA_VALUE.indexOf('five'), end: AREA_VALUE.indexOf('five') + 4 };
  const startCaret = api.inputCaretAt('ts-area', five.start);
  const endCaret = api.inputCaretAt('ts-area', five.end);
  assert(startCaret !== null && endCaret !== null, 'The carets of the text area are laid out');
  const at = new Vector2((startCaret.x + endCaret.x) / 2, startCaret.y + startCaret.height / 2);
  await holdThenLift(at);
  const state = inputState(api, 'ts-area');
  assert(state.start === five.start && state.end === five.end, `A long press selects a word on a line of a text area: ${state.start}..${state.end}`);
  const lineMiddle = startCaret.y + startCaret.height / 2;
  const endStem = handleOf(api, 'end').stem;
  const startStem = handleOf(api, 'start').stem;
  assert(endStem.y <= lineMiddle && lineMiddle <= endStem.y + endStem.height && startStem.y <= lineMiddle && lineMiddle <= startStem.y + startStem.height,
    `and the handles are on that line: ${lineMiddle} in ${startStem.y}..${startStem.y + startStem.height}, ${endStem.y}..${endStem.y + endStem.height}`);
  const area = node(api, 'ts-area').rect;
  const handle = handleOf(api, 'end');
  const rest = new Vector2(area.x + area.width / 2, area.y + area.height - EDGE_REST_PX);
  touch(ballOf(handle), true);
  await frames(TOUCH_PAUSE_FRAMES);
  await glide(ballOf(handle), rest);
  await sleep(AUTOSCROLL_REST_MS);
  await frames(TOUCH_PAUSE_FRAMES);
  assert(scrollTop(api, 'ts-area') > 0, `A handle held at the bottom edge of a text area scrolls its text: ${scrollTop(api, 'ts-area')}`);
  assert(inputState(api, 'ts-area').end > five.end + 10, `and the selection follows down the text: ${inputState(api, 'ts-area').end}`);
  touch(rest, false);
  await settle();
  await capture('touch-selection-06-area-autoscrolled');
  await tap(centreOf(node(api, 'ts-readout').rect));
}

export async function verifyTouchSelection(owner: Node, api: Api, capture: (name: string) => Promise<void>): Promise<void> {
  await openLab(api);
  await verifyDocumentText(owner, api, capture);
  await verifyArbitration(api);
  await verifyDraggable(api);
  await verifyList(api, capture);
  await verifyInputs(api, capture);
  await verifyArea(api, capture);
  api.showLab('hud');
  await settle();
}
