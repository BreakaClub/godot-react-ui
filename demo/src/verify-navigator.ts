import {
  Engine, InputEventKey, InputEventMouseButton, InputEventMouseMotion, Key, MouseButton, Node, OS, Vector2, Window,
} from 'godot';
import type { LayoutRect, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import { GLASS_BLOB_IDS } from './glass-lab';
import { LABS, labsInOrder, type InlineLab, type Lab } from './labs';
import type { NavigatorOptions } from './main';
import { setTransformCase } from './transform-lab';
import { assertionTally, parseVerifierEvent } from './verifier-input';
import { typeText } from './verify-text-input';

/** The case the transforms lab opens on, put back after the anchor check, and how close the marker must stand to its corner. */
const FIRST_TRANSFORM_CASE = 'shape:identity';
const ANCHOR_SETTLE_FRAMES = 4;
const ANCHOR_TOLERANCE_PX = 1;

/**
 * The `navigator` section of the interaction verifier: the lab navigator (`navigator.tsx`) in a real window, driven by injected
 * input. At the window's size it checks the shell's geometry (sidebar and content area when wide, top bar and content area when
 * narrow), then opens every lab by pointer, checks that it renders without tripping its error boundary, that it fits its content
 * area, and that leaving it puts the node count back and lets the process go idle. Then the filter, the keyboard, the start on
 * a given lab, and a lab that throws. Every lab is captured from the viewport texture. It runs again at a content scale of two.
 *
 * A window at least 1024 logical pixels wide has the sidebar and anything narrower the top bar and its `Select`, so the landscape
 * window (1120 x 800) exercises the sidebar and the portrait window (600 x 900) the menu, and a content scale of two (which halves
 * the logical size) exercises the narrow layout in both.
 */
export interface NavigatorInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  /** The navigator in place of what is shown, with `extraLabs` listed after the demo's own. */
  showNavigator(options?: NavigatorOptions): void;
  restoreDemo(): void;
  scrollTo(testID: string, top: number): void;
  surfaceProcessing(): boolean;
  grabSurfaceFocus(): void;
  passthrough(): { backdropPresses: number };
  resetPassthrough(): void;
}

/** `overflowing`: test ids of nodes that reach past the window by design. */
export type NavigatorCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

/** `w-64` and the one pixel rule beside it. */
const SIDEBAR_WIDTH_PX = 257;
/** `lg:` (README: Styles): from here the sidebar replaces the top bar. */
const SIDEBAR_BREAKPOINT_PX = 1024;
const BASELINE_LAB = 'counter';
const GEOMETRY_TOLERANCE_PX = 2;
const SETTLE_FRAMES = 6;
const FRAME_POLL_MS = 10;
const IDLE_DEADLINE_MS = 4000;
const APPEARS_DEADLINE_MS = 2000;
/** The owner puts the root back 600 ms after a lab took it (`Main.recoverRoot`). */
const RECOVERY_DEADLINE_MS = 5000;
/** How far from the top of a list an item is scrolled when it has to be brought into view. */
const SCROLL_MARGIN_PX = 40;
/** The point the pointer is parked at between clicks, over nothing that reacts to a hover. */
const PARKED = new Vector2(1, 1);
/**
 * The labs the content-scale-two pass opens: the one written for a window 300 logical pixels wide (the portrait window at a scale
 * of two), and the window lab. The other pages were written for the larger windows and do not fit 300.
 */
const SCALED_LABS: readonly string[] = ['hidpi', 'glass'];
/** A lab that throws while it renders, for the error boundary. Its message is announced to the runner as an expected error. */
const THROW_MESSAGE = 'navigator verifier: this lab throws on purpose';
const EXPECT_ERROR = 'GODOT_REACT_EXPECT_ERROR';

/** Takes no hook: the verifier's bundle has its own React, and this component is rendered by the owner's. */
function ThrowingPage(): never {
  throw new Error(THROW_MESSAGE);
}

const THROWING_LAB: InlineLab = {
  id: 'verifier-throws', kind: 'inline', group: 'Foundations', title: 'Throws on purpose', description: 'A lab the navigator verifier adds.',
  sources: ['res://src/labs.tsx'], component: ThrowingPage,
};

let scale = 1;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

async function waitFor(what: string, ready: () => boolean, deadlineMs: number): Promise<void> {
  const started = Date.now();
  while (!ready()) {
    assert(Date.now() - started < deadlineMs, `Timed out after ${deadlineMs} ms waiting for ${what}`);
    await frames(1);
  }
}

function node(api: NavigatorInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

/** Whether the element is laid out at all: `hidden` and `lg:hidden` leave it with no rectangle. */
function isShown(api: NavigatorInspection, testID: string): boolean {
  const found = api.find(testID);
  return found !== undefined && found.rect.width > 0 && found.rect.height > 0;
}

function textOf(api: NavigatorInspection, testID: string): string {
  const snapshot = api.snapshot();
  const collect = (entry: NativeSnapshotNode): string => entry.text + entry.children.map(id => {
    const child = snapshot.nodes.find(candidate => candidate.id === id);
    assert(child, `Missing native child ${id}`);
    return collect(child);
  }).join('');
  return collect(node(api, testID));
}

function centreOf(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function near(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= GEOMETRY_TOLERANCE_PX;
}

function rectText(rect: LayoutRect): string {
  return `${rect.x},${rect.y} ${rect.width}x${rect.height}`;
}

/** A position in the window's pixels: the snapshot's are logical, and the window is at a content scale of `scale`. */
function windowPoint(at: Vector2): Vector2 {
  return new Vector2(at.x * scale, at.y * scale);
}

function pointerMove(at: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = windowPoint(at);
  event.globalPosition = event.position;
  parseVerifierEvent(event);
}

function pointerButton(at: Vector2, pressed: boolean): void {
  const event = new InputEventMouseButton();
  event.position = windowPoint(at);
  event.globalPosition = event.position;
  event.buttonIndex = MouseButton.MouseButtonLeft;
  event.pressed = pressed;
  parseVerifierEvent(event);
}

async function clickAt(at: Vector2): Promise<void> {
  pointerMove(at);
  await frames(3);
  pointerButton(at, true);
  await frames(2);
  pointerButton(at, false);
  await frames(SETTLE_FRAMES);
}

async function click(api: NavigatorInspection, testID: string): Promise<void> {
  await clickAt(centreOf(node(api, testID).rect));
}

interface Chord {
  keycode: Key;
  alt?: boolean;
}

async function keyTap(chord: Chord): Promise<void> {
  for (const pressed of [true, false]) {
    const event = new InputEventKey();
    event.keycode = chord.keycode;
    event.physicalKeycode = chord.keycode;
    event.keyLabel = chord.keycode;
    event.pressed = pressed;
    event.altPressed = chord.alt === true;
    parseVerifierEvent(event);
    await frames(2);
  }
  await frames(SETTLE_FRAMES);
}

function focusedTestID(api: NavigatorInspection): string | undefined {
  const snapshot = api.snapshot();
  const focused = snapshot.nodes.find(entry => entry.id === snapshot.focused);
  const id = focused?.props.testID;
  return typeof id === 'string' ? id : undefined;
}

function nodeCount(api: NavigatorInspection): number {
  return api.snapshot().nodes.length;
}

// ---- Choosing a lab, the way a person does ----------------------------------------------------------------------------------

/** Scroll `list` (found by its test id) so that `item` is in view, if it is not. */
async function bringIntoView(api: NavigatorInspection, listID: string, itemID: string): Promise<void> {
  const list = node(api, listID);
  const item = node(api, itemID).rect;
  const state = list.scroll;
  assert(state, `${listID} is not a scroll container`);
  if (item.y >= list.rect.y && item.y + item.height <= list.rect.y + list.rect.height) return;
  api.scrollTo(listID, Math.max(0, state.scrollTop + item.y - list.rect.y - SCROLL_MARGIN_PX));
  await frames(SETTLE_FRAMES);
}

/** Open `lab`: from the sidebar's list when the window is wide, from the top bar's `Select` when it is not. */
async function choose(api: NavigatorInspection, lab: Lab): Promise<void> {
  if (isShown(api, 'navigator-sidebar')) {
    await bringIntoView(api, 'lab-sidebar-scroll', `lab-item-${lab.id}`);
    await click(api, `lab-item-${lab.id}`);
  } else {
    await click(api, 'lab-menu');
    await waitFor('the lab menu to open', () => api.find('lab-menu-list') !== undefined, APPEARS_DEADLINE_MS);
    await frames(SETTLE_FRAMES);
    await bringIntoView(api, 'lab-menu-list', `lab-menu-item-${lab.id}`);
    await click(api, `lab-menu-item-${lab.id}`);
    await waitFor('the lab menu to close', () => api.find('lab-menu-list') === undefined, APPEARS_DEADLINE_MS);
  }
  pointerMove(PARKED);
  await frames(SETTLE_FRAMES);
}

// ---- What the shell looks like ----------------------------------------------------------------------------------------------

function checkShellGeometry(api: NavigatorInspection): boolean {
  const { width, height } = api.snapshot();
  const wide = width >= SIDEBAR_BREAKPOINT_PX;
  const header = node(api, 'lab-header').rect;
  const stage = node(api, 'lab-stage').rect;
  assert(near(stage.y + stage.height, height) && near(stage.x + stage.width, width), `The content area ends at the window's corner: ${rectText(stage)} in ${width}x${height}`);
  assert(near(header.y + header.height, stage.y) && near(header.x, stage.x) && near(header.width, stage.width), `The header sits on the content area: ${rectText(header)}, ${rectText(stage)}`);
  if (wide) {
    const sidebar = node(api, 'navigator-sidebar').rect;
    assert(!isShown(api, 'navigator-bar'), 'The top bar is hidden when the window is wide');
    assert(near(sidebar.x, 0) && near(sidebar.y, 0) && near(sidebar.width, SIDEBAR_WIDTH_PX) && near(sidebar.height, height), `The sidebar is ${SIDEBAR_WIDTH_PX} wide and as tall as the window: ${rectText(sidebar)}`);
    assert(near(stage.x, SIDEBAR_WIDTH_PX) && near(stage.width, width - SIDEBAR_WIDTH_PX), `The content area is what the sidebar leaves: ${rectText(stage)}`);
    assert(near(header.y, 0), `The header is at the top of the content: ${rectText(header)}`);
  } else {
    const bar = node(api, 'navigator-bar').rect;
    assert(!isShown(api, 'navigator-sidebar'), 'The sidebar is hidden when the window is narrow');
    assert(near(bar.x, 0) && near(bar.y, 0) && near(bar.width, width), `The top bar spans the window: ${rectText(bar)}`);
    assert(near(header.y, bar.height) && near(stage.x, 0) && near(stage.width, width), `The header is under the top bar and the content area spans the window: ${rectText(header)}, ${rectText(stage)}`);
    const menu = node(api, 'lab-menu').rect;
    assert(menu.width > 0 && menu.x >= 0 && menu.x + menu.width <= width, `The lab menu is on screen: ${rectText(menu)}`);
  }
  return wide;
}

/** What a lab in the content area has to satisfy: it fills the area, and it needs no sideways scrolling. */
function checkContentFit(api: NavigatorInspection, lab: Lab): void {
  const stage = node(api, 'lab-stage').rect;
  if (lab.kind !== 'inline' || lab.surface === 'game') return;
  const scroller = node(api, 'lab-scroll');
  assert(near(scroller.rect.x, stage.x) && near(scroller.rect.y, stage.y) && near(scroller.rect.width, stage.width) && near(scroller.rect.height, stage.height),
    `${lab.id}: the scroll area is the content area: ${rectText(scroller.rect)} against ${rectText(stage)}`);
  const state = scroller.scroll;
  assert(state, `${lab.id}: the content area scrolls`);
  assert(state.scrollWidth <= state.clientWidth + GEOMETRY_TOLERANCE_PX, `${lab.id} is ${state.scrollWidth} wide in a content area ${state.clientWidth} wide`);
}

/** The labs in the order the sidebar lists them, from this bundle's copy of the registry (the ids and titles are data). */
function labsToWalk(): readonly Lab[] {
  return labsInOrder(LABS);
}

function assertOpen(api: NavigatorInspection, lab: Lab): void {
  assert(textOf(api, 'lab-title') === lab.title, `The header names ${lab.id}: "${textOf(api, 'lab-title')}"`);
  assert(api.find('lab-error') === undefined, `${lab.id} tripped its error boundary: ${api.find('lab-error-message') === undefined ? '' : textOf(api, 'lab-error-message')}`);
  assert(api.find('lab-missing') === undefined, `${lab.id} is shown, not an error`);
  if (isShown(api, 'navigator-sidebar')) {
    assert(node(api, `lab-item-${lab.id}`).props.ariaSelected === true, `${lab.id} is marked as the selected option`);
    assert(node(api, `lab-item-${lab.id}`).props.role === 'option', `${lab.id} is an option of the listbox`);
  } else {
    assert(textOf(api, 'lab-menu-value') === lab.title, `The lab menu shows ${lab.id}: "${textOf(api, 'lab-menu-value')}"`);
  }
}

// ---- One lab, in the shell --------------------------------------------------------------------------------------------------

async function openWindowLab(api: NavigatorInspection, lab: Lab, capture: NavigatorCapture): Promise<void> {
  await bringIntoView(api, 'lab-scroll', 'lab-launch-open');
  await click(api, 'lab-launch-open');
  await frames(SETTLE_FRAMES);
  assert(api.find('lab-list') === undefined && api.find('lab-menu') === undefined, `${lab.id} has the whole window: nothing of the shell is behind it`);
  const bar = node(api, 'window-bar');
  assert(bar.layer === 1, 'The way back is in the overlay layer');
  const { width, height } = api.snapshot();
  assert(bar.rect.x >= 0 && bar.rect.y >= 0 && bar.rect.x + bar.rect.width <= width && bar.rect.y + bar.rect.height <= height, `The way back is on screen: ${rectText(bar.rect)}`);
  await capture(`navigator-${lab.id}-window`, GLASS_BLOB_IDS);
  await keyTap({ keycode: Key.KeyEscape });
  assert(api.find('lab-launch') !== undefined && api.find('window-bar') === undefined, 'Escape gives the window back to the navigator');
  await bringIntoView(api, 'lab-scroll', 'lab-launch-open');
  await click(api, 'lab-launch-open');
  await frames(SETTLE_FRAMES);
  await click(api, 'window-back');
  assert(api.find('lab-launch') !== undefined && api.find('window-bar') === undefined, 'The Labs button gives the window back to the navigator');
}

async function openSceneLab(api: NavigatorInspection, lab: Lab, opened: string[]): Promise<void> {
  assert(lab.kind === 'scene', `${lab.id} is a scene lab`);
  const before = opened.length;
  await bringIntoView(api, 'lab-scroll', 'lab-launch-open');
  await click(api, 'lab-launch-open');
  assert(opened.length === before + 1 && opened[opened.length - 1] === lab.scene, `The button asks the owner to open ${lab.scene}: ${JSON.stringify(opened)}`);
}

/** The HUD sits over the Godot scene: a press on its empty area reaches the backdrop behind the root, and one on its button does not. */
async function checkPassthrough(api: NavigatorInspection): Promise<void> {
  const stage = node(api, 'lab-stage').rect;
  api.resetPassthrough();
  await clickAt(new Vector2(stage.x + SCROLL_MARGIN_PX / 4, stage.y + stage.height / 2));
  assert(api.passthrough().backdropPresses === 1, `A press on the HUD's empty area reaches the Godot scene behind it: ${JSON.stringify(api.passthrough())}`);
  await click(api, 'hud-inventory');
  assert(api.passthrough().backdropPresses === 1, 'A press on a HUD control stays with the HUD');
  assert(textOf(api, 'hud-status').startsWith('inventory 1'), `The HUD control works in the shell: ${textOf(api, 'hud-status')}`);
}

/**
 * A lab that anchors to `getRect()` must hold in the shell: the rectangle is root-local, and the shell moves the lab off the root's corner,
 * which a run of the lab alone in the window cannot see. Ben saw this one: the marker stood off by the sidebar's width and the header's height.
 */
async function checkAnchorInShell(api: NavigatorInspection): Promise<void> {
  setTransformCase('anchor');
  await frames(ANCHOR_SETTLE_FRAMES);
  const trigger = node(api, 'anchor-trigger').rect;
  const marker = node(api, 'anchor-marker').rect;
  const off = { x: marker.x - (trigger.x + trigger.width), y: marker.y - (trigger.y + trigger.height) };
  assert(Math.abs(off.x) <= ANCHOR_TOLERANCE_PX && Math.abs(off.y) <= ANCHOR_TOLERANCE_PX,
    `The transforms lab's marker sits at the bottom right of the box round its trigger in the shell, not off by ${JSON.stringify(off)}`);
  setTransformCase(FIRST_TRANSFORM_CASE);
  await frames(ANCHOR_SETTLE_FRAMES);
}

async function walkLabs(api: NavigatorInspection, capture: NavigatorCapture, opened: string[], baselineNodes: number): Promise<void> {
  const baseline = labsToWalk().find(lab => lab.id === BASELINE_LAB);
  assert(baseline, `The registry has the baseline lab ${BASELINE_LAB}`);
  for (const lab of labsToWalk()) {
    await choose(api, lab);
    assertOpen(api, lab);
    assert(api.find('lab-launch') !== undefined === (lab.kind !== 'inline'), `${lab.id}: a launch card is shown if and only if the lab is a window or scene lab`);
    checkShellGeometry(api);
    checkContentFit(api, lab);
    await capture(`navigator-${lab.id}`);
    if (lab.id === 'hud') await checkPassthrough(api);
    if (lab.id === 'transforms') await checkAnchorInShell(api);
    if (lab.kind === 'window') await openWindowLab(api, lab, capture);
    if (lab.kind === 'scene') await openSceneLab(api, lab, opened);
    // Leaving it: back to the baseline lab, with the nodes it had and nothing still asking for frames.
    await choose(api, baseline);
    assertOpen(api, baseline);
    await waitFor(`the process to go idle after ${lab.id}`, () => !api.surfaceProcessing(), IDLE_DEADLINE_MS);
    assert(nodeCount(api) === baselineNodes, `Leaving ${lab.id} left ${nodeCount(api)} nodes where the baseline is ${baselineNodes}`);
  }
}

// ---- The filter, the keyboard, the start, the boundary -----------------------------------------------------------------------

function listedLabs(api: NavigatorInspection, wide: boolean): string[] {
  const prefix = wide ? 'lab-item-' : 'lab-menu-item-';
  return [...api.snapshot().nodes]
    .sort((a, b) => a.documentIndex - b.documentIndex)
    .map(entry => entry.props.testID)
    .filter((id): id is string => typeof id === 'string' && id.startsWith(prefix))
    .map(id => id.slice(prefix.length));
}

/**
 * The labs the filter leaves, as a person sees them: the sidebar's list when the window is wide, and, when it is narrow, the lab menu,
 * which has to be opened to show its items (and is closed again).
 */
async function shownLabs(api: NavigatorInspection, wide: boolean): Promise<string[]> {
  if (wide) return listedLabs(api, true);
  await click(api, 'lab-menu');
  await waitFor('the lab menu to open', () => api.find('lab-menu-list') !== undefined, APPEARS_DEADLINE_MS);
  await frames(SETTLE_FRAMES);
  const items = listedLabs(api, false);
  await keyTap({ keycode: Key.KeyEscape });
  await waitFor('the lab menu to close', () => api.find('lab-menu-list') === undefined, APPEARS_DEADLINE_MS);
  return items;
}

async function checkFilter(api: NavigatorInspection, capture: NavigatorCapture, wide: boolean): Promise<void> {
  const field = wide ? 'lab-filter-input' : 'lab-menu-filter-input';
  const all = labsToWalk().map(lab => lab.id);
  await click(api, field);
  await typeText('glass');
  await frames(SETTLE_FRAMES);
  if (wide) {
    assert(JSON.stringify(listedLabs(api, true)) === JSON.stringify(['glass']), `Typing "glass" leaves the one lab: ${JSON.stringify(listedLabs(api, true))}`);
    await capture('navigator-filter');
  } else {
    // The menu holds the matches and, so that it can name it, the current lab.
    const items = await shownLabs(api, false);
    assert(JSON.stringify(items) === JSON.stringify(['counter', 'glass']), `The menu holds the matches and the current lab: ${JSON.stringify(items)}`);
    await click(api, 'lab-menu');
    await waitFor('the lab menu to open', () => api.find('lab-menu-list') !== undefined, APPEARS_DEADLINE_MS);
    await frames(SETTLE_FRAMES);
    await capture('navigator-filter');
    await keyTap({ keycode: Key.KeyEscape });
    await waitFor('the lab menu to close', () => api.find('lab-menu-list') === undefined, APPEARS_DEADLINE_MS);
    await click(api, field);
  }
  assert(textOf(api, 'lab-title') === 'Counter', 'Filtering opens nothing');
  await keyTap({ keycode: Key.KeyEscape });
  const cleared = await shownLabs(api, wide);
  assert(JSON.stringify(cleared) === JSON.stringify(all), `Escape in the filter clears it: ${JSON.stringify(cleared)}`);
  if (!wide) await click(api, field);
  await typeText('zzzz');
  await frames(SETTLE_FRAMES);
  if (wide) {
    assert(api.find('lab-list-empty') !== undefined, 'A filter that matches nothing says so');
    await capture('navigator-filter-empty');
  } else {
    const none = await shownLabs(api, false);
    assert(JSON.stringify(none) === JSON.stringify(['counter']), `The menu of a filter that matches nothing still names the current lab: ${JSON.stringify(none)}`);
    await click(api, field);
  }
  await keyTap({ keycode: Key.KeyEscape });
  const clearedAgain = await shownLabs(api, wide);
  assert(JSON.stringify(clearedAgain) === JSON.stringify(all), 'Escape clears the filter again');
  pointerMove(PARKED);
}

async function checkKeyboard(api: NavigatorInspection, capture: NavigatorCapture): Promise<void> {
  const ordered = labsToWalk();
  const at = (index: number): Lab => {
    const lab = ordered[index];
    assert(lab, `The registry has ${index + 1} labs`);
    return lab;
  };
  const title = (lab: Lab): string => lab.title;
  await choose(api, at(0));
  await click(api, 'lab-filter-input');
  await keyTap({ keycode: Key.KeyTab });
  assert(focusedTestID(api) === `lab-item-${at(0).id}`, `Tab goes from the filter to the list's one tab stop, the current lab: ${focusedTestID(api)}`);
  await keyTap({ keycode: Key.KeyDown });
  await keyTap({ keycode: Key.KeyDown });
  assert(focusedTestID(api) === `lab-item-${at(2).id}`, `Down twice moves focus two labs on: ${focusedTestID(api)}`);
  assert(textOf(api, 'lab-title') === title(at(0)), 'Moving focus opens nothing');
  await capture('navigator-keyboard-focus');
  await keyTap({ keycode: Key.KeyEnter });
  assert(textOf(api, 'lab-title') === title(at(2)), `Enter opens the focused lab: ${textOf(api, 'lab-title')}`);
  await keyTap({ keycode: Key.KeyDown, alt: true });
  assert(textOf(api, 'lab-title') === title(at(3)), `Alt+Down opens the next lab: ${textOf(api, 'lab-title')}`);
  await keyTap({ keycode: Key.KeyUp, alt: true });
  await keyTap({ keycode: Key.KeyUp, alt: true });
  assert(textOf(api, 'lab-title') === title(at(1)), `Alt+Up twice goes two labs back: ${textOf(api, 'lab-title')}`);
  const last = at(ordered.length - 1);
  await click(api, `lab-item-${at(1).id}`);
  await keyTap({ keycode: Key.KeyEnd });
  assert(focusedTestID(api) === `lab-item-${last.id}`, `End moves focus to the last lab: ${focusedTestID(api)}`);
  await keyTap({ keycode: Key.KeyEnter });
  assert(textOf(api, 'lab-title') === title(last), `Enter opens it: ${textOf(api, 'lab-title')}`);
  await keyTap({ keycode: Key.KeyDown, alt: true });
  assert(textOf(api, 'lab-title') === title(at(0)), 'Alt+Down from the last lab wraps to the first');
  await click(api, 'lab-next');
  assert(textOf(api, 'lab-title') === title(at(1)), 'The Next button opens the next lab');
  await click(api, 'lab-previous');
  assert(textOf(api, 'lab-title') === title(at(0)), 'The Previous button opens the previous lab');
  pointerMove(PARKED);
}

async function checkStart(api: NavigatorInspection, capture: NavigatorCapture): Promise<void> {
  const drag = labsToWalk().find(lab => lab.id === 'drag');
  assert(drag, 'The registry has the drag lab');
  api.showNavigator({ initialLab: 'drag' });
  await frames(SETTLE_FRAMES);
  assertOpen(api, drag);
  api.showNavigator({ initialLab: 'no-such-lab' });
  await frames(SETTLE_FRAMES);
  assert(api.find('lab-missing') !== undefined, 'An unknown lab id is shown as an error');
  assert(textOf(api, 'lab-missing-message').includes('no-such-lab'), `The error names the id: ${textOf(api, 'lab-missing-message')}`);
  assert(textOf(api, 'lab-missing-ids').split(', ').length === LABS.length, 'The error lists the ids that work');
  assert(api.find('drag-lab') === undefined && api.find('counter-lab') === undefined, 'No other lab was opened in its place');
  await capture('navigator-missing');
}

async function checkBoundary(api: NavigatorInspection, capture: NavigatorCapture, opened: string[]): Promise<void> {
  api.showNavigator({ extraLabs: [THROWING_LAB], onOpenScene: lab => opened.push(lab.scene) });
  await frames(SETTLE_FRAMES);
  // This navigator lists one more lab than the others, so it has a baseline of its own.
  await waitFor('the process to go idle', () => !api.surfaceProcessing(), IDLE_DEADLINE_MS);
  const baselineNodes = nodeCount(api);
  const baseline = labsToWalk().find(lab => lab.id === BASELINE_LAB);
  assert(baseline, `The registry has the baseline lab ${BASELINE_LAB}`);
  console.log(`${EXPECT_ERROR} ${THROW_MESSAGE}`);
  await choose(api, THROWING_LAB);
  assert(api.find('lab-error') !== undefined, 'A lab that throws shows its error');
  assert(textOf(api, 'lab-error-message').includes(THROW_MESSAGE), `The error is the lab's: ${textOf(api, 'lab-error-message')}`);
  assert(textOf(api, 'lab-title') === THROWING_LAB.title, 'The header still names the lab');
  await capture('navigator-error');
  console.log(`${EXPECT_ERROR} ${THROW_MESSAGE}`);
  await click(api, 'lab-error-retry');
  assert(api.find('lab-error') !== undefined, 'Try again mounts the lab again, and it throws again');
  await choose(api, baseline);
  assertOpen(api, baseline);
  await waitFor('the process to go idle after the failed lab', () => !api.surfaceProcessing(), IDLE_DEADLINE_MS);
  assert(nodeCount(api) === baselineNodes, `The failed lab left ${nodeCount(api)} nodes where the baseline is ${baselineNodes}`);
  const next = labsToWalk().find(lab => lab.id === 'pointers');
  assert(next, 'The registry has the pointers lab');
  await choose(api, next);
  assertOpen(api, next);
}

// ---- The section -----------------------------------------------------------------------------------------------------------

async function verifyAtScale(api: NavigatorInspection, capture: NavigatorCapture, prefix: string): Promise<void> {
  const opened: string[] = [];
  api.showNavigator({ onOpenScene: lab => opened.push(lab.scene) });
  await frames(SETTLE_FRAMES);
  api.grabSurfaceFocus();
  const wide = checkShellGeometry(api);
  const first = labsToWalk()[0];
  assert(first && first.id === BASELINE_LAB, 'The navigator opens on the first lab');
  assertOpen(api, first);
  await waitFor('the process to go idle', () => !api.surfaceProcessing(), IDLE_DEADLINE_MS);
  const baselineNodes = nodeCount(api);
  await capture(`${prefix}shell`);
  await walkLabs(api, capture, opened, baselineNodes);
  await checkFilter(api, capture, wide);
  if (wide) await checkKeyboard(api, capture);
  await checkStart(api, capture);
  await checkBoundary(api, capture, opened);
}

function window(owner: Node): Window {
  const found = owner.getWindow();
  assert(found, 'The demo has its window');
  return found;
}

async function verifyScaled(owner: Node, api: NavigatorInspection, capture: NavigatorCapture): Promise<void> {
  const win = window(owner);
  win.contentScaleFactor = 2;
  scale = 2;
  await frames(SETTLE_FRAMES);
  try {
    api.showNavigator();
    await frames(SETTLE_FRAMES);
    api.grabSurfaceFocus();
    assert(!checkShellGeometry(api), 'A window at a content scale of two is narrow: its logical size is half');
    assert(api.snapshot().oversampling === 2, 'The root draws at a device pixel ratio of two');
    await capture('navigator-dpr2-shell');
    for (const id of SCALED_LABS) {
      const lab = labsToWalk().find(candidate => candidate.id === id);
      assert(lab, `The registry has ${id}`);
      await choose(api, lab);
      assertOpen(api, lab);
      checkShellGeometry(api);
      checkContentFit(api, lab);
      await capture(`navigator-dpr2-${id}`);
      if (lab.kind === 'window') await openWindowLab(api, lab, capture);
    }
  } finally {
    win.contentScaleFactor = 1;
    scale = 1;
    await frames(SETTLE_FRAMES);
  }
}

/** Whether the navigator is mounted and shows `lab`: false while the root is gone (the inspection API throws for a root that is not mounted). */
function navigatorShows(api: NavigatorInspection, lab: Lab): boolean {
  try {
    return api.find('navigator') !== undefined && textOf(api, 'lab-title') === lab.title;
  } catch {
    return false;
  }
}

/**
 * The Events lab's two danger buttons take the demo's root away mid-press (a verifier mounts it again itself). A run that started on the
 * navigator puts it back, on the same lab, after a pause.
 */
async function checkRootRecovery(api: NavigatorInspection, lab: Lab): Promise<void> {
  for (const button of ['danger-unmount', 'danger-detach']) {
    await click(api, button);
    await waitFor(`the navigator to come back on ${lab.id} after ${button}`, () => navigatorShows(api, lab), RECOVERY_DEADLINE_MS);
    assertOpen(api, lab);
    api.grabSurfaceFocus();
    await frames(SETTLE_FRAMES);
  }
}

/** A run started with `--lab=<id>`: the navigator is already open on that lab, because the arguments said so. */
async function verifyDeepLink(api: NavigatorInspection, capture: NavigatorCapture): Promise<void> {
  const args = OS.getCmdlineUserArgs();
  const requested = Array.from({ length: args.size() }, (_, index) => args.get(index)).find(argument => argument.startsWith('--lab='))?.slice('--lab='.length);
  assert(requested, 'The run was started with --lab=<id>');
  const lab = labsToWalk().find(candidate => candidate.id === requested);
  if (lab === undefined) {
    assert(api.find('lab-missing') !== undefined && textOf(api, 'lab-missing-message').includes(requested), 'An unknown --lab= id is shown as an error');
    await capture('navigator-deeplink-missing');
    return;
  }
  assertOpen(api, lab);
  checkShellGeometry(api);
  await capture(`navigator-deeplink-${lab.id}`);
  if (lab.id === 'interaction') await checkRootRecovery(api, lab);
}

export async function verifyNavigator(owner: Node, api: NavigatorInspection, capture: NavigatorCapture): Promise<void> {
  if (api.find('navigator') !== undefined) {
    // Started on a lab (`--lab=<id>`): that is the thing to check, and the rest of the section would start from a different page.
    await verifyDeepLink(api, capture);
    return;
  }
  await verifyAtScale(api, capture, 'navigator-');
  await verifyScaled(owner, api, capture);
  api.restoreDemo();
  await frames(SETTLE_FRAMES);
  api.grabSurfaceFocus();
}
