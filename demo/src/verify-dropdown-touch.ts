import { Engine, InputEventScreenDrag, InputEventScreenTouch, Node, Vector2 } from 'godot';
import type { LayoutRect, NativeScrollState, NativeSnapshotNode } from '../../src/native';
import type { InteractionInspection } from './verify-interaction';
import { assertionTally, parseVerifierEvent } from './verifier-input';

/**
 * The dropdown lists of the kit under a finger (`docs/tracks/dropdown-touch.md`), natively, with the screen-touch and screen-drag
 * events a phone sends (Godot 4.8 buttons ignore the mouse a touch is emulated as, so a finger is always a real touch here). The lab is
 * `dropdown-touch-lab.tsx`: a `Select`, a `Combobox` and a `Combobox` with chips, each with forty options in a page that scrolls. For
 * each, with the page at rest and with the page already scrolled: a tap opens the list, a slow pan moves the list by about the finger's
 * travel and neither the page nor the selection, an option that began out of view is now in view and a tap on it chooses it, a pan too
 * short to move far chooses nothing, and a flick keeps the list moving after the finger lifts.
 */

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
/**
 * How long the finger rests before it lifts, so the release velocity is zero and nothing coasts: longer than the 0.1 s after which the
 * tracker samples a still finger (`MOMENTUM_SAMPLE_INTERVAL_S` in `native/scroll.rs`), and some frames after that.
 */
const REST_MS = 300;
const REST_FRAMES = 6;
/** Frames between the events of one touch. */
const TOUCH_PAUSE_FRAMES = 2;
const FIRST_TOUCH = 0;
/** `TOUCH_SLOP_PX` in `native/scroll.rs`: a touch that moves farther than this is no longer a tap. */
const TOUCH_SLOP_PX = 8;
/** The slow pan: this many steps of this many pixels, up the screen, so the list moves the other way. */
const PAN_STEPS = 6;
const PAN_STEP_PX = 20;
/** The pan follows the finger from where the slop was crossed, which is the first step. */
const PAN_FOLLOWED_PX = (PAN_STEPS - 1) * PAN_STEP_PX;
/** An offset is a float and a frame may land half a step apart: this much slack either way. */
const SCROLL_TOLERANCE_PX = 1.5;
/** The short pan crosses the slop with its first move and goes a little farther with its second. */
const SHORT_PAN_FIRST_PX = TOUCH_SLOP_PX + 2;
const SHORT_PAN_SECOND_PX = 6;
/** The flick: faster and longer steps, and the finger lifts while it is still moving. */
const FLICK_STEPS = 6;
const FLICK_STEP_PX = 24;
const FLICK_MIN_COAST_PX = 30;
const COAST_POLL_MS = 100;
const COAST_DEADLINE_MS = 5000;
/** How far the page is scrolled for the scrolled-page cases. */
const SCROLLED_PAGE_PX = 80;
const PAGE = 'dropdown-touch-page';

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

async function rest(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, REST_MS));
  await frames(REST_FRAMES);
}

type Api = Pick<InteractionInspection, 'find' | 'snapshot' | 'showLab' | 'scrollTo'>;

function node(api: Api, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

function scrollOf(api: Api, testID: string): NativeScrollState {
  const { scroll } = node(api, testID);
  assert(scroll, `${testID} is a scroll container`);
  return scroll;
}

function centreOf(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

/** Whether `rect` lies wholly inside `outer`. */
function within(rect: LayoutRect, outer: LayoutRect): boolean {
  return rect.y >= outer.y && rect.y + rect.height <= outer.y + outer.height;
}

// ---------------------------------------------------------------------------------------------------
// A finger
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

async function tap(position: Vector2): Promise<void> {
  touch(position, true);
  await frames(TOUCH_PAUSE_FRAMES);
  touch(position, false);
  await settle();
}

/** The finger goes down at `from` and moves `steps` times by `step` (negative is up the screen), a few frames apart; it returns where it is. */
async function drag(from: Vector2, steps: number, step: number): Promise<Vector2> {
  touch(from, true);
  await frames(TOUCH_PAUSE_FRAMES);
  let finger = from;
  for (let index = 1; index <= steps; index++) {
    finger = new Vector2(from.x, from.y + index * step);
    touchDrag(finger, new Vector2(0, step));
    await frames(TOUCH_PAUSE_FRAMES);
  }
  return finger;
}

// ---------------------------------------------------------------------------------------------------
// The dropdowns
// ---------------------------------------------------------------------------------------------------

interface Readout {
  select: string | null;
  combobox: string | null;
  chips: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function readout(api: Api): Readout {
  const parsed: unknown = JSON.parse(node(api, 'dd-json').text);
  assert(isRecord(parsed), `The readout is an object: ${node(api, 'dd-json').text}`);
  const { select, combobox, chips } = parsed;
  assert(isNullableString(select) && isNullableString(combobox) && Array.isArray(chips) && chips.every(item => typeof item === 'string'),
    `The readout has the lab's fields: ${node(api, 'dd-json').text}`);
  return { select, combobox, chips };
}

interface Dropdown {
  name: string;
  /** What a tap on opens the list. */
  opener: string;
  list: string;
  /** The start of an option's testID; the option's number follows. */
  optionPrefix: string;
  /** What the dropdown has chosen, or `null`. */
  chosen: (api: Api) => string | null;
  /** The value the option at `index` gives. */
  valueOf: (index: number) => string;
  /** Whether choosing leaves the list open (a multiple combobox keeps listing). */
  staysOpen: boolean;
}

const SELECT: Dropdown = {
  name: 'Select', opener: 'dd-select', list: 'dd-select-list', optionPrefix: 'dd-select-item-option-',
  chosen: api => readout(api).select, valueOf: index => `option-${index}`, staysOpen: false,
};
const COMBOBOX: Dropdown = {
  name: 'Combobox', opener: 'dd-combobox-input', list: 'dd-combobox-list', optionPrefix: 'dd-combobox-item-option-',
  chosen: api => readout(api).combobox, valueOf: index => `option-${index}`, staysOpen: false,
};
const CHIPS: Dropdown = {
  name: 'Combobox with chips', opener: 'dd-chips-input', list: 'dd-chips-list', optionPrefix: 'dd-chips-item-option-',
  chosen: api => readout(api).chips.join(',') || null, valueOf: index => `option-${index}`, staysOpen: true,
};
const DROPDOWNS: readonly Dropdown[] = [SELECT, COMBOBOX, CHIPS];

/** The options now mounted in the list, by number, with where each lies. */
function options(api: Api, dropdown: Dropdown): Map<number, LayoutRect> {
  const found = new Map<number, LayoutRect>();
  for (const candidate of api.snapshot().nodes) {
    const testID = candidate.props.testID;
    if (typeof testID === 'string' && testID.startsWith(dropdown.optionPrefix)) {
      found.set(Number(testID.slice(dropdown.optionPrefix.length)), candidate.rect);
    }
  }
  return found;
}

/** A page with the page scrolled to `pageTop` and `dropdown`'s list open. */
async function openList(api: Api, dropdown: Dropdown, pageTop: number): Promise<void> {
  api.showLab('hud');
  await settle();
  api.showLab('dropdown-touch');
  await settle();
  if (pageTop > 0) {
    api.scrollTo(PAGE, pageTop);
    await settle();
  }
  assert(scrollOf(api, PAGE).scrollTop === pageTop, `${dropdown.name}: the page is at ${pageTop}: ${scrollOf(api, PAGE).scrollTop}`);
  await tap(centreOf(node(api, dropdown.opener).rect));
  assert(api.find(dropdown.list), `${dropdown.name}: a tap on ${dropdown.opener} opens the list`);
  assert(dropdown.chosen(api) === null, `${dropdown.name}: nothing is chosen yet: ${JSON.stringify(readout(api))}`);
}

async function verifyDropdown(api: Api, dropdown: Dropdown, pageTop: number): Promise<void> {
  const where = `${dropdown.name}, page at ${pageTop}`;
  await openList(api, dropdown, pageTop);

  const list = node(api, dropdown.list).rect;
  const before = scrollOf(api, dropdown.list).scrollTop;
  const unseen = [...options(api, dropdown)].filter(([, rect]) => rect.y >= list.y + list.height).map(([index]) => index);
  assert(unseen.length > 0, `${where}: the list has options below what it shows`);
  assert(scrollOf(api, dropdown.list).maxScrollTop > PAN_FOLLOWED_PX, `${where}: and room to pan them into view: ${scrollOf(api, dropdown.list).maxScrollTop}`);

  // A slow pan up the screen: the list follows the finger from where the slop was crossed. The finger comes to rest before it
  // lifts, so nothing coasts. The page stays where it was and nothing is chosen.
  const finger = await drag(centreOf(list), PAN_STEPS, -PAN_STEP_PX);
  await rest();
  touch(finger, false);
  await settle();
  const moved = scrollOf(api, dropdown.list).scrollTop - before;
  assert(Math.abs(moved - PAN_FOLLOWED_PX) <= SCROLL_TOLERANCE_PX, `${where}: a pan moves the list by the finger's travel from the slop (${PAN_FOLLOWED_PX} px): ${moved}`);
  assert(scrollOf(api, PAGE).scrollTop === pageTop, `${where}: and the page stays at ${pageTop}: ${scrollOf(api, PAGE).scrollTop}`);
  assert(api.find(dropdown.list) !== undefined && dropdown.chosen(api) === null, `${where}: the list is still open and nothing was chosen: ${JSON.stringify(readout(api))}`);

  // An option that began out of view is in view now, and a tap on it chooses it.
  const nowList = node(api, dropdown.list).rect;
  const target = unseen.sort((left, right) => left - right).find(index => {
    const rect = options(api, dropdown).get(index);
    return rect !== undefined && within(rect, nowList);
  });
  assert(target !== undefined, `${where}: an option that began out of view is in view after the pan`);
  const targetRect = options(api, dropdown).get(target);
  assert(targetRect, `${where}: option ${target} is mounted`);
  await tap(centreOf(targetRect));
  assert(dropdown.chosen(api) === dropdown.valueOf(target),
    `${where}: a tap on option ${target}, scrolled into view, chooses it: ${JSON.stringify(readout(api))}`);
  assert((api.find(dropdown.list) !== undefined) === dropdown.staysOpen,
    `${where}: and the list is ${dropdown.staysOpen ? 'still open' : 'closed'}`);
  assert(scrollOf(api, PAGE).scrollTop === pageTop, `${where}: and the page is still at ${pageTop}`);
}

/** A pan that goes only a little beyond the slop moves the list a little and chooses nothing, though it began and ended on an option. */
async function verifyShortPan(api: Api, dropdown: Dropdown): Promise<void> {
  const where = `${dropdown.name}, a short pan`;
  await openList(api, dropdown, 0);
  const list = node(api, dropdown.list).rect;
  const before = scrollOf(api, dropdown.list).scrollTop;
  const visible = [...options(api, dropdown)].find(([, rect]) => within(rect, list));
  assert(visible, `${where}: an option is in view`);
  const start = centreOf(visible[1]);
  touch(start, true);
  await frames(TOUCH_PAUSE_FRAMES);
  const first = new Vector2(start.x, start.y - SHORT_PAN_FIRST_PX);
  touchDrag(first, new Vector2(0, -SHORT_PAN_FIRST_PX));
  await frames(TOUCH_PAUSE_FRAMES);
  const second = new Vector2(start.x, first.y - SHORT_PAN_SECOND_PX);
  touchDrag(second, new Vector2(0, -SHORT_PAN_SECOND_PX));
  await rest();
  touch(second, false);
  await settle();
  const moved = scrollOf(api, dropdown.list).scrollTop - before;
  assert(Math.abs(moved - SHORT_PAN_SECOND_PX) <= SCROLL_TOLERANCE_PX, `${where}: the list moved only by the second step (${SHORT_PAN_SECOND_PX} px): ${moved}`);
  assert(api.find(dropdown.list) !== undefined && dropdown.chosen(api) === null,
    `${where}: nothing was chosen and the list is open: ${JSON.stringify(readout(api))}`);
}

/** A flick lifts while the finger still moves: the list coasts, comes to rest by itself, and chooses nothing. */
async function verifyFlick(api: Api, dropdown: Dropdown): Promise<void> {
  const where = `${dropdown.name}, a flick`;
  await openList(api, dropdown, 0);
  const list = node(api, dropdown.list).rect;
  const finger = await drag(centreOf(list), FLICK_STEPS, -FLICK_STEP_PX);
  touch(finger, false);
  await frames(1);
  const released = scrollOf(api, dropdown.list).scrollTop;
  const deadline = Date.now() + COAST_DEADLINE_MS;
  let last = Number.NaN;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, COAST_POLL_MS));
    const now = scrollOf(api, dropdown.list).scrollTop;
    if (now === last) break;
    last = now;
  }
  assert(last > released + FLICK_MIN_COAST_PX, `${where}: the list keeps going after the finger lifts: ${released} -> ${last}`);
  assert(scrollOf(api, dropdown.list).scrollTop === last, `${where}: and comes to rest on its own`);
  assert(scrollOf(api, PAGE).scrollTop === 0, `${where}: the page did not move: ${scrollOf(api, PAGE).scrollTop}`);
  assert(api.find(dropdown.list) !== undefined && dropdown.chosen(api) === null, `${where}: nothing was chosen: ${JSON.stringify(readout(api))}`);
}

export async function verifyDropdownTouch(owner: Node, api: Api, capture: (name: string) => Promise<void>): Promise<void> {
  void owner;
  for (const dropdown of DROPDOWNS) {
    await verifyDropdown(api, dropdown, 0);
    await verifyDropdown(api, dropdown, SCROLLED_PAGE_PX);
    await verifyShortPan(api, dropdown);
    await verifyFlick(api, dropdown);
  }

  // A raster of a list that was panned, to look at: the first option the pan brought into view is at the top of the list.
  await openList(api, SELECT, SCROLLED_PAGE_PX);
  const finger = await drag(centreOf(node(api, SELECT.list).rect), PAN_STEPS, -PAN_STEP_PX);
  await rest();
  await capture('dropdown-touch-select-panned');
  touch(finger, false);
  await settle();
  api.showLab('hud');
  await settle();
}
