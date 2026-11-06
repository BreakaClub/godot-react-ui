import {
  Color, DirAccess, Engine, FileAccess, GError, Image, InputEventKey, InputEventMouseButton,
  InputEventMouseMotion, InputEventScreenDrag, InputEventScreenTouch, Key, MeshInstance3D, MouseButton, MouseButtonMask,
  Node, OS, RenderingServer, SubViewport, Vector2, Vector3,
} from 'godot';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src';
import { parseVerifierEvent } from './verifier-input';
import type { Point2, WorldCounts } from './world-main';

/** What the world owner exposes (`godotReactWorld`); the verifier and the Web verifier use the same surface. */
export interface WorldInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  mount(): void;
  unmount(): void;
  counts(): WorldCounts;
  resetCounts(): void;
  /** Deliver the notification the window system sends when the cursor leaves the window. */
  simulateWindowMouseExit(): void;
  panelPixelAt(x: number, y: number): (Point2 & { inside: boolean }) | undefined;
  screenPointOf(x: number, y: number): Point2;
  panelSize(): Point2;
  viewportSize(): Point2;
  surfaceHasFocus(): boolean;
  grabSurfaceFocus(): void;
  panelImage(): Image;
}

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
/** A point no part of the quad covers, in the main viewport: the corner of the window. */
const OFF_QUAD = new Vector2(8, 8);
/** The quad's see-through margin: a panel pixel inside the quad that the card does not cover. */
const MARGIN_PIXEL = new Vector2(12, 12);
/** `pick` then `screenPointOf` must return to the same pixel; the bound covers float32 in the engine's transforms. */
const ROUND_TRIP_TOLERANCE_PX = 0.05;
/** A raster pixel may differ from the colour the style says by this much per channel (8-bit rounding). */
const COLOR_TOLERANCE = 2 / 255;
/** The finger moves this far in a drag that stays on the panel. */
const SHORT_DRAG_PX = 20;
/** Colours of the panel's styles, as the native snapshot reports them: indigo-600/-700/-800 and slate-300. */
const PRIMARY_REST = '#4f46e5';
const PRIMARY_HOVER = '#4338ca';
const PRIMARY_ACTIVE = '#3730a3';
const SECONDARY_HOVER = '#f1f5f9';
const BACKDROP = new Color(0.796, 0.835, 0.882, 1);
const CARD_WHITE = new Color(1, 1, 1, 1);

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

function get(api: WorldInspection, id: string): NativeSnapshotNode {
  const node = api.find(id);
  assert(node, `Missing test target ${id}`);
  return node;
}

function text(api: WorldInspection, id: string): string {
  const snapshot = api.snapshot();
  const collect = (node: NativeSnapshotNode): string => node.text + node.children.map(childID => {
    const child = snapshot.nodes.find(candidate => candidate.id === childID);
    assert(child, `Missing native child ${childID}`);
    return collect(child);
  }).join('');
  return collect(get(api, id));
}

function background(api: WorldInspection, id: string): unknown {
  return get(api, id).style.backgroundColor;
}

/** Whether `node` is the element `id` or inside it: hover reports the deepest element, a button's label. */
function isWithin(api: WorldInspection, node: number | null, id: string): boolean {
  if (node === null) return false;
  const snapshot = api.snapshot();
  const root = get(api, id).id;
  for (let current: number | null = node; current !== null;) {
    if (current === root) return true;
    const entry = snapshot.nodes.find(candidate => candidate.id === current);
    assert(entry, `Missing native node ${current}`);
    current = entry.parent;
  }
  return false;
}

/** The centre of an element in the panel's own pixels. */
function panelCenter(api: WorldInspection, id: string): Vector2 {
  const { rect } = get(api, id);
  assert(rect.width > 0 && rect.height > 0, `Target ${id} is hidden`);
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

/**
 * A point inside an element's border box, clear of its label, in the panel's pixels: its top-left corner
 * moved in by this much (a label is centred in `Reset`, so the centre of that button is on glyphs).
 */
const BOX_INSET_PX = 8;
function panelInset(api: WorldInspection, id: string): Vector2 {
  const { rect } = get(api, id);
  return new Vector2(rect.x + BOX_INSET_PX, rect.y + BOX_INSET_PX);
}

/** Where an element's centre is drawn in the main viewport: the point a user would click. */
function screenCenter(api: WorldInspection, id: string): Vector2 {
  const center = panelCenter(api, id);
  const screen = api.screenPointOf(center.x, center.y);
  return new Vector2(screen.x, screen.y);
}

function mouseButton(position: Vector2, pressed: boolean, button = MouseButton.MouseButtonLeft): void {
  const event = new InputEventMouseButton();
  event.position = position;
  event.globalPosition = position;
  event.buttonIndex = button;
  event.pressed = pressed;
  event.buttonMask = pressed && button === MouseButton.MouseButtonLeft ? MouseButtonMask.MouseButtonMaskLeft : 0;
  parseVerifierEvent(event);
}

function move(position: Vector2, held = false): void {
  const event = new InputEventMouseMotion();
  event.position = position;
  event.globalPosition = position;
  event.buttonMask = held ? MouseButtonMask.MouseButtonMaskLeft : 0;
  parseVerifierEvent(event);
}

/** A real touch (device 0): Godot also translates it to an emulated mouse event, which the owner must ignore. */
function touch(index: number, position: Vector2, pressed: boolean): void {
  const event = new InputEventScreenTouch();
  event.index = index;
  event.position = position;
  event.pressed = pressed;
  parseVerifierEvent(event);
}

function touchDrag(index: number, position: Vector2, relative: Vector2): void {
  const event = new InputEventScreenDrag();
  event.index = index;
  event.position = position;
  event.relative = relative;
  parseVerifierEvent(event);
}

async function click(position: Vector2): Promise<void> {
  move(position);
  await settle();
  mouseButton(position, true);
  await settle();
  mouseButton(position, false);
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

function near(a: Color, b: Color): boolean {
  return Math.abs(a.r - b.r) <= COLOR_TOLERANCE && Math.abs(a.g - b.g) <= COLOR_TOLERANCE && Math.abs(a.b - b.b) <= COLOR_TOLERANCE;
}

function hex(color: Color): string {
  return `#${color.toHtml(false)}`;
}

function viewportPixel(owner: Node, at: Vector2): Color {
  RenderingServer.forceDraw();
  const image = owner.getViewport()?.getTexture()?.getImage();
  assert(image, 'World verification requires a rendered viewport');
  return image.getPixel(Math.round(at.x), Math.round(at.y));
}

function style(hexColor: string): Color {
  return Color.fromString(hexColor, new Color(0, 0, 0, 0));
}

/**
 * Plan I11: a React root in a `SubViewport` shown on a 3D quad, driven by the camera ray. Every input here
 * enters through `Input.parseInputEvent` in the main viewport, at the screen point where the element is
 * drawn, so what is exercised is the whole route: ray, plane, pixel, copy, `pushInput`.
 */
export async function runWorldVerification(owner: Node, api: WorldInspection): Promise<void> {
  const directory = OS.getEnvironment('GODOT_REACT_ARTIFACTS') || 'user://react-ui-verification';
  assert(DirAccess.makeDirRecursiveAbsolute(directory) === GError.Ok, 'Cannot create evidence directory');
  const captures: string[] = [];

  async function capture(name: string): Promise<void> {
    await settle();
    RenderingServer.forceDraw();
    const image = owner.getViewport()?.getTexture()?.getImage();
    assert(image, 'World verification requires a rendered viewport');
    const path = `${directory}/${name}.png`;
    assert(image.savePng(path) === GError.Ok, `Could not save ${path}`);
    captures.push(path);
    const file = FileAccess.open(`${directory}/${name}.json`, FileAccess.ModeFlags.Write);
    assert(file, 'Cannot write snapshot evidence');
    file.storeString(JSON.stringify(api.snapshot()));
    file.close();
  }

  const count = () => text(api, 'world-count');
  const counts = (): WorldCounts => api.counts();
  const increment = () => get(api, 'world-increment').id;
  const incrementAt = () => screenCenter(api, 'world-increment');
  const resetAt = () => screenCenter(api, 'world-reset');

  await settle();
  await settle();
  assert(count() === '0', `Initial React state: ${count()}`);
  await capture('01-world');
  const panelTexture = api.panelImage();
  assert(panelTexture.savePng(`${directory}/01-panel-texture.png`) === GError.Ok, 'Could not save the panel texture');

  // ---- Geometry: the owner's ray mapping and the verifier's projection are inverses -------------------
  const size = api.panelSize();
  for (const target of ['world-card', 'world-increment', 'world-reset', 'world-count']) {
    const pixel = panelCenter(api, target);
    const screen = api.screenPointOf(pixel.x, pixel.y);
    const back = api.panelPixelAt(screen.x, screen.y);
    assert(back?.inside === true, `${target} projects onto the quad: ${JSON.stringify(back)}`);
    assert(Math.abs(back.x - pixel.x) <= ROUND_TRIP_TOLERANCE_PX && Math.abs(back.y - pixel.y) <= ROUND_TRIP_TOLERANCE_PX,
      `${target} round-trips: panel ${pixel.x},${pixel.y} -> screen ${screen.x},${screen.y} -> panel ${back.x},${back.y}`);
  }
  const topLeft = api.screenPointOf(0.5, 0.5);
  const bottomRight = api.screenPointOf(size.x - 0.5, size.y - 0.5);
  assert(api.panelPixelAt(topLeft.x, topLeft.y)?.inside === true, 'The quad covers its own top-left pixel');
  assert(api.panelPixelAt(bottomRight.x, bottomRight.y)?.inside === true, 'The quad covers its own bottom-right pixel');
  assert(api.panelPixelAt(OFF_QUAD.x, OFF_QUAD.y)?.inside !== true, 'The window corner is not on the quad');
  const viewportSize = api.viewportSize();
  for (const corner of [topLeft, bottomRight]) {
    assert(corner.x >= 0 && corner.y >= 0 && corner.x < viewportSize.x && corner.y < viewportSize.y,
      `The quad is on screen: ${corner.x},${corner.y} in ${viewportSize.x}x${viewportSize.y}`);
  }

  // ---- Raster: what is drawn at the projected points is the panel (orientation, mapping, alpha) -------
  const marginScreen = api.screenPointOf(MARGIN_PIXEL.x, MARGIN_PIXEL.y);
  assert(near(viewportPixel(owner, new Vector2(marginScreen.x, marginScreen.y)), BACKDROP),
    `The panel's transparent margin shows the backdrop behind the quad, not the panel: ${hex(viewportPixel(owner, new Vector2(marginScreen.x, marginScreen.y)))}`);
  assert(near(viewportPixel(owner, incrementAt()), style(PRIMARY_REST)),
    `The projected centre of Add is drawn in its rest colour: ${hex(viewportPixel(owner, incrementAt()))}`);
  const resetInset = panelInset(api, 'world-reset');
  const resetInsetScreen = api.screenPointOf(resetInset.x, resetInset.y);
  assert(near(viewportPixel(owner, new Vector2(resetInsetScreen.x, resetInsetScreen.y)), CARD_WHITE),
    `Inside the Reset button the quad is drawn white: ${hex(viewportPixel(owner, new Vector2(resetInsetScreen.x, resetInsetScreen.y)))}`);
  assert(background(api, 'world-increment') === PRIMARY_REST, `Add rests in indigo-600: ${String(background(api, 'world-increment'))}`);

  // ---- Hover: a motion onto the projected button hovers it, and the 3D raster shows it -----------------
  move(incrementAt());
  await settle();
  assert(isWithin(api, api.snapshot().hovered, 'world-increment'), `Moving onto the projected Add button hovers it: ${api.snapshot().hovered}`);
  assert(background(api, 'world-increment') === PRIMARY_HOVER, `Add takes its hover style: ${String(background(api, 'world-increment'))}`);
  assert(counts().pointerInside, 'The owner told the panel viewport the pointer entered');
  assert(near(viewportPixel(owner, incrementAt()), style(PRIMARY_HOVER)),
    `The quad shows the hover colour: ${hex(viewportPixel(owner, incrementAt()))}`);
  await capture('02-hover');

  // ---- Leaving the quad clears hover (and so does the window losing the pointer) ----------------------
  move(OFF_QUAD);
  await settle();
  assert(api.snapshot().hovered === null, `Moving off the quad clears hover: ${api.snapshot().hovered}`);
  assert(background(api, 'world-increment') === PRIMARY_REST, 'Add is back to its rest style');
  assert(!counts().pointerInside, 'The owner told the panel viewport the pointer left');
  move(incrementAt());
  await settle();
  assert(isWithin(api, api.snapshot().hovered, 'world-increment'), 'The panel can be hovered again after leaving');
  api.simulateWindowMouseExit();
  await settle();
  assert(api.snapshot().hovered === null, 'The window losing the pointer clears hover');
  assert(!counts().pointerInside, 'The window losing the pointer leaves the quad');
  // Moving across the quad's see-through margin hovers nothing.
  move(new Vector2(marginScreen.x, marginScreen.y));
  await settle();
  assert(api.snapshot().hovered === null, 'The margin hovers nothing');
  move(OFF_QUAD);
  await settle();

  // ---- Click: press shows the active style, release increments ---------------------------------------
  api.resetCounts();
  move(incrementAt());
  await settle();
  mouseButton(incrementAt(), true);
  await settle();
  assert(isWithin(api, api.snapshot().pressed, 'world-increment'), `Pressing Add presses it: ${api.snapshot().pressed}`);
  assert(background(api, 'world-increment') === PRIMARY_ACTIVE, `Add takes its active style: ${String(background(api, 'world-increment'))}`);
  assert(near(viewportPixel(owner, incrementAt()), style(PRIMARY_ACTIVE)), 'The quad shows the active colour');
  await capture('03-pressed');
  mouseButton(incrementAt(), false);
  await settle();
  assert(count() === '1', `Clicking the projected Add button increments the counter: ${count()}`);
  assert(counts().gamePresses === 0, 'A click the panel consumed never reaches the game');
  await click(incrementAt());
  await click(incrementAt());
  assert(count() === '3', `Three clicks: ${count()}`);
  await capture('04-incremented');
  await click(resetAt());
  assert(count() === '0', `Clicking the projected Reset button resets the counter: ${count()}`);
  assert(background(api, 'world-reset') === SECONDARY_HOVER, `Reset shows its hover style under the pointer: ${String(background(api, 'world-reset'))}`);
  await capture('05-reset');
  move(OFF_QUAD);
  await settle();

  // ---- A click that is not on the panel reaches the game and not the panel ---------------------------
  api.resetCounts();
  await click(OFF_QUAD);
  assert(counts().gamePresses === 1, `A click off the quad reaches _unhandledInput: ${JSON.stringify(counts())}`);
  assert(counts().panelPointerEvents === 0, `...and nothing reaches the panel: ${JSON.stringify(counts())}`);
  assert(count() === '0', 'The counter is untouched');
  await click(new Vector2(marginScreen.x, marginScreen.y));
  assert(counts().gamePresses === 2, `A click on the quad's transparent margin falls through to the game: ${JSON.stringify(counts())}`);
  assert(counts().panelPointerEvents === 0, `...and the margin sends the panel nothing: ${JSON.stringify(counts())}`);

  // ---- The back of the quad is invisible, so it takes no input --------------------------------------
  const quad = owner.getNodeOrNull('PanelQuad');
  assert(quad instanceof MeshInstance3D, 'The world has a PanelQuad');
  const rest = quad.rotationDegrees;
  const restDegrees = new Vector3(rest.x, rest.y, rest.z);
  const addScreen = incrementAt();
  quad.rotationDegrees = new Vector3(restDegrees.x, restDegrees.y + 180, restDegrees.z);
  await settle();
  api.resetCounts();
  assert(api.panelPixelAt(addScreen.x, addScreen.y) === undefined, 'A ray that meets the back of the quad is not a hit');
  await click(addScreen);
  assert(count() === '0' && counts().panelPointerEvents === 0 && counts().gamePresses === 1,
    `Clicking where the back of the quad is does nothing to the panel: ${count()} ${JSON.stringify(counts())}`);
  quad.rotationDegrees = restDegrees;
  await settle();
  move(OFF_QUAD);
  await settle();

  // ---- A press that began on the panel is routed to the end, wherever the pointer goes ---------------
  api.resetCounts();
  move(incrementAt());
  await settle();
  mouseButton(incrementAt(), true);
  await settle();
  move(OFF_QUAD, true);
  await settle();
  assert(api.snapshot().hovered === null, 'Dragging off the quad clears hover');
  assert(isWithin(api, api.snapshot().pressed, 'world-increment'), 'The press is still held after the pointer left the quad');
  // The motion off the quad is routed, at the pixel where the ray meets the quad's plane beside it.
  const beside = api.panelPixelAt(OFF_QUAD.x, OFF_QUAD.y);
  assert(beside !== undefined && !beside.inside, `The window corner meets the quad's plane beside the quad: ${JSON.stringify(beside)}`);
  const held = api.snapshot().pointers.find(pointer => pointer.type === 'mouse');
  assert(held?.down === true && Math.abs(held.x - beside.x) <= ROUND_TRIP_TOLERANCE_PX && Math.abs(held.y - beside.y) <= ROUND_TRIP_TOLERANCE_PX,
    `A held button keeps being routed beyond the quad, at ${beside.x},${beside.y}: ${JSON.stringify(held)}`);
  mouseButton(OFF_QUAD, false);
  await settle();
  assert(api.snapshot().pressed === null, `Releasing off the quad ends the press: ${api.snapshot().pressed}`);
  assert(count() === '0', `A release off the button does not click: ${count()}`);
  assert(counts().gamePresses === 0, 'A drag that began on the panel never reaches the game');
  const eventsBefore = counts().panelPointerEvents;
  move(new Vector2(OFF_QUAD.x + 1, OFF_QUAD.y + 1));
  await settle();
  assert(counts().panelPointerEvents === eventsBefore, 'Once the press ended, motion off the quad is not routed any more');
  await click(incrementAt());
  assert(count() === '1', `The panel still works after an interrupted press: ${count()}`);
  move(OFF_QUAD);
  await settle();

  // ---- Wheel: a tick over the card reaches the panel once; over the margin it falls through ----------
  api.resetCounts();
  for (const pressed of [true, false]) mouseButton(incrementAt(), pressed, MouseButton.MouseButtonWheelDown);
  await settle();
  assert(counts().panelPointerEvents === 1, `One wheel tick over the card is one event for the panel: ${JSON.stringify(counts())}`);
  for (const pressed of [true, false]) mouseButton(new Vector2(marginScreen.x, marginScreen.y), pressed, MouseButton.MouseButtonWheelDown);
  await settle();
  assert(counts().panelPointerEvents === 1, 'A wheel tick over the margin does not reach the panel');
  move(OFF_QUAD);
  await settle();

  // ---- Keys follow the panel's focus ---------------------------------------------------------------
  api.resetCounts();
  await click(incrementAt());
  assert(count() === '2', `Counter at ${count()} before the keyboard test`);
  assert(api.surfaceHasFocus() && api.snapshot().focused === increment(), 'Clicking Add focuses it and gives the root key focus');
  await key(Key.KeyEnter);
  assert(count() === '3', `Enter on the focused button, sent to the main viewport, activates it in the SubViewport: ${count()}`);
  assert(counts().gameKeys === 0, 'A key the panel consumed never reaches the game');
  await capture('06-keyboard-focus');
  await key(Key.KeyTab);
  assert(api.snapshot().focused === get(api, 'world-reset').id, `Tab moves focus to Reset: ${api.snapshot().focused}`);
  await key(Key.KeyEnter);
  assert(count() === '0', `Enter on Reset: ${count()}`);
  // Pressing something that cannot take focus hands key focus back, and keys go to the game again.
  await click(screenCenter(api, 'world-title'));
  assert(!api.surfaceHasFocus() && api.snapshot().focused === null, 'Clicking the title releases focus');
  api.resetCounts();
  await key(Key.KeyEnter);
  assert(count() === '0' && counts().gameKeys === 1, `Without focus the key is the game's, not the panel's: ${count()} ${JSON.stringify(counts())}`);
  move(OFF_QUAD);
  await settle();

  // ---- Touch: one tap is one click, hover is never set, drags are routed like a held mouse -----------
  api.resetCounts();
  const touchPoint = incrementAt();
  touch(0, touchPoint, true);
  await settle();
  assert(api.snapshot().pointers.some(pointer => pointer.type === 'touch' && pointer.down), 'The touch is a touch pointer in the panel');
  touch(0, touchPoint, false);
  await settle();
  assert(count() === '1', `A tap on the projected Add button clicks it once (the emulated mouse is ignored): ${count()}`);
  assert(api.snapshot().hovered === null, 'A touch never hovers');
  assert(api.snapshot().pointers.every(pointer => pointer.type === 'mouse'), 'A finished touch leaves no pointer behind');
  assert(counts().gamePresses === 0, 'A touch the panel consumed never reaches the game');
  touch(0, touchPoint, true);
  await settle();
  touchDrag(0, new Vector2(touchPoint.x + SHORT_DRAG_PX, touchPoint.y), new Vector2(SHORT_DRAG_PX, 0));
  await settle();
  touchDrag(0, OFF_QUAD, new Vector2(OFF_QUAD.x - touchPoint.x, OFF_QUAD.y - touchPoint.y));
  await settle();
  touch(0, OFF_QUAD, false);
  await settle();
  assert(count() === '1', `A finger that leaves the quad before lifting does not click: ${count()}`);
  assert(api.snapshot().pointers.every(pointer => pointer.type === 'mouse'), 'A drag that left the quad ends cleanly');
  assert(api.snapshot().pressed === null, 'Nothing is left pressed');
  api.resetCounts();
  touch(0, OFF_QUAD, true);
  await settle();
  touch(0, OFF_QUAD, false);
  await settle();
  assert(counts().gamePresses === 1 && counts().panelPointerEvents === 0, `A touch off the quad is the game's: ${JSON.stringify(counts())}`);
  await capture('07-touch');

  // ---- Unmount before free, and mount again --------------------------------------------------------
  const viewport = owner.getNodeOrNull('PanelViewport');
  assert(viewport instanceof SubViewport, 'The world has a PanelViewport');
  move(incrementAt());
  await settle();
  assert(isWithin(api, api.snapshot().hovered, 'world-increment'), 'Hovering before unmount');
  api.unmount();
  await settle();
  assert(viewport.getChildCount() === 0, `Unmount frees the root: ${viewport.getChildCount()} children left`);
  await settle();
  api.mount();
  await settle();
  assert(viewport.getChildCount() === 1, 'Mount adds exactly one root');
  assert(count() === '0', `A fresh root starts from fresh state: ${count()}`);
  move(OFF_QUAD);
  await settle();
  await click(incrementAt());
  assert(count() === '1', `The remounted panel takes input: ${count()}`);
  await capture('08-remounted');

  console.log('GODOT_REACT_WORLD_VERIFY_PASSED', JSON.stringify({ captures, counts: counts(), stats: api.snapshot().stats }));
}
