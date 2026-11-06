import {
  Color, DirAccess, Engine, FileAccess, GError, Image, InputEventKey, InputEventMouseButton,
  InputEventMouseMotion, InputEventScreenDrag, InputEventScreenTouch, Key, MeshInstance3D, MouseButton, MouseButtonMask,
  Node, OS, RenderingServer, SubViewport, Vector2, Vector3,
} from 'godot';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src';
import { parseVerifierEvent } from './verifier-input';
import { measureStems } from './verify-hidpi';
import { LABEL_COLOR, LABEL_GAP, LABEL_HEIGHT, LABEL_WIDTH } from './world-label';
import type { OrbiterReading, Point2, Point3, WorldCounts } from './world-main';

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
  /** Texture pixels the panel renders at per panel pixel now, and a way to choose it (`null`: follow the window). */
  panelPixelScale(): number;
  setPanelPixelScale(scale: number | null): void;
  viewportSize(): Point2;
  surfaceHasFocus(): boolean;
  grabSurfaceFocus(): void;
  panelImage(): Image;
  /** The main viewport's screen-space root that holds the anchored label (a second root). */
  labelSnapshot(): NativeSnapshot;
  findInLabel(testID: string): NativeSnapshotNode | undefined;
  placeOrbiter(x: number, y: number, height: number): void;
  placeOrbiterInWorld(x: number, y: number, z: number): void;
  resumeOrbit(): void;
  orbiterScreen(): OrbiterReading;
  cameraPosition(): Point3;
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
/**
 * Where the orbiter waits while the panel is verified: in front of the camera but far off to one side, so that neither
 * it nor its label is drawn over the quad (the rest of this verifier reads pixels there).
 */
const ORBITER_PARKING = { x: 6, y: -3, z: 0.5 };
/** The label is laid out in whole pixels, so it is at the projected point to within this much. */
const LABEL_TOLERANCE_PX = 1;
/** The orbiter's sphere (`ORBITER_COLOR`), unshaded, so a raster pixel at its centre is this. */
const ORBITER_HEX = '#33b2e5';
/** Panel pixels from the quad's top-left corner that the label's probe reads: inside its left cap. */
const LABEL_PROBE_INSET_PX = 10;
/** Where the orbiter is put to show the label above the card, in panel pixels, and how far it floats off the quad. */
const SHOWCASE_PIXEL = new Vector2(300, 30);
const SHOWCASE_HEIGHT = 0.2;
/** The orbit runs this long between the two samples that must differ, in settles (100 ms and two frames each). */
const ORBIT_SAMPLE_SETTLES = 2;
/** The orbit moves the label at least this far in the time between the two samples (it covers about 20 px per 100 ms). */
const ORBIT_MIN_MOVE_PX = 3;

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
/** A point this far inside the name field's left edge is on its border and padding, before the first glyph. */
const FIELD_TEXT_INSET_PX = 4;
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

/** The keycode a typed character has on a US keyboard (letters and digits are their capitals' codes). */
function keycodeOf(character: string): Key {
  const code = character.toUpperCase().codePointAt(0) ?? 0;
  const letterOrDigit = (code >= 0x30 && code <= 0x39) || (code >= 0x41 && code <= 0x5a);
  return letterOrDigit || code === 0x20 ? code : Key.KeyNone;
}

/** Type `text` a character at a time into the main viewport, as a keyboard does: the key down with its character, and up. */
async function typeText(text: string): Promise<void> {
  for (const character of text) {
    for (const pressed of [true, false]) {
      const event = new InputEventKey();
      event.keycode = keycodeOf(character);
      event.physicalKeycode = event.keycode;
      event.unicode = character.codePointAt(0) ?? 0;
      event.shiftPressed = character !== character.toLowerCase();
      event.pressed = pressed;
      parseVerifierEvent(event);
    }
  }
  await settle();
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
 * Plan I11, the anchored label: a second root in the main viewport (the screen-space root) holds one label that is
 * placed every frame with `Camera3D.unprojectPosition()` of a moving 3D node, centred over it and above it, hidden
 * when the node is behind the camera, and see-through to input.
 */
async function verifyAnchoredLabel(owner: Node, api: WorldInspection, capture: (name: string) => Promise<void>): Promise<void> {
  const labelNode = (testID: string): NativeSnapshotNode => {
    const node = api.findInLabel(testID);
    assert(node, `The label root has no ${testID}`);
    return node;
  };
  const labelRect = () => labelNode('anchor-label').rect;
  const count = () => text(api, 'world-count');
  const counts = (): WorldCounts => api.counts();
  const viewportSize = api.viewportSize();
  const label = api.labelSnapshot();
  assert(label.width === viewportSize.x && label.height === viewportSize.y,
    `The label root fills the window: ${label.width}x${label.height} in ${viewportSize.x}x${viewportSize.y}`);
  assert(api.find('anchor-label') === undefined, 'The label is not in the panel\'s root: it is in the main viewport\'s own');
  assert(labelNode('anchor-title').text === 'Orbiter', 'The label says what it follows');
  const expectLabelAt = (screen: Point2, what: string) => {
    const rect = labelRect();
    assert(rect.width === LABEL_WIDTH && rect.height === LABEL_HEIGHT, `${what}: the label has its own size: ${JSON.stringify(rect)}`);
    const centre = rect.x + rect.width / 2;
    const bottom = rect.y + rect.height + LABEL_GAP;
    assert(Math.abs(centre - screen.x) <= LABEL_TOLERANCE_PX && Math.abs(bottom - screen.y) <= LABEL_TOLERANCE_PX,
      `${what}: the label is centred over the projected point ${screen.x.toFixed(2)},${screen.y.toFixed(2)} and ${LABEL_GAP} px above it, `
      + `not at ${centre},${bottom} (rect ${JSON.stringify(rect)})`);
  };

  // ---- On the quad's plane the projection is the inverse mapping of the panel pixel the owner already verified ----
  const add = panelCenter(api, 'world-increment');
  api.placeOrbiter(add.x, add.y, 0);
  await settle();
  const onPlane = api.screenPointOf(add.x, add.y);
  const read = api.orbiterScreen();
  assert(!read.behind, 'The orbiter is in front of the camera');
  assert(Math.abs(read.screen.x - onPlane.x) <= ROUND_TRIP_TOLERANCE_PX && Math.abs(read.screen.y - onPlane.y) <= ROUND_TRIP_TOLERANCE_PX,
    `A node on the quad's plane projects to where the panel pixel does (screenPointOf ${onPlane.x},${onPlane.y}): ${read.screen.x},${read.screen.y}`);
  expectLabelAt(read.screen, 'On the plane');

  // ---- Off the plane, at several places: the label follows the camera's own projection ---------------------------------
  const places: Array<[number, number, number]> = [[60, 30, 0.2], [420, 40, 0.3], [240, 280, 0.1], [240, 160, 0.5]];
  let previous: Point2 | undefined;
  for (const [x, y, height] of places) {
    api.placeOrbiter(x, y, height);
    await settle();
    const reading = api.orbiterScreen();
    assert(!reading.behind, `${x},${y},${height} is in front of the camera`);
    expectLabelAt(reading.screen, `At panel pixel ${x},${y} lifted ${height}`);
    if (previous !== undefined) {
      assert(Math.hypot(reading.screen.x - previous.x, reading.screen.y - previous.y) > LABEL_TOLERANCE_PX, 'The places are not the same point on the screen');
    }
    previous = reading.screen;
  }
  // The lift moves the node towards the camera along the quad's normal: it projects somewhere else than the plane does.
  api.placeOrbiter(240, 160, 0);
  const flat = api.orbiterScreen().screen;
  api.placeOrbiter(240, 160, 0.5);
  const lifted = api.orbiterScreen().screen;
  assert(Math.hypot(flat.x - lifted.x, flat.y - lifted.y) > LABEL_TOLERANCE_PX, 'A node lifted off the plane projects to a different point');
  await settle();

  // ---- The picture: the sphere is where the projection says, the label is drawn above it -------------------------------
  api.placeOrbiter(SHOWCASE_PIXEL.x, SHOWCASE_PIXEL.y, SHOWCASE_HEIGHT);
  await settle();
  const showcase = api.orbiterScreen();
  expectLabelAt(showcase.screen, 'Showcase');
  assert(near(viewportPixel(owner, new Vector2(showcase.screen.x, showcase.screen.y)), style(ORBITER_HEX)),
    `The orbiter's sphere is drawn at the projected point: ${hex(viewportPixel(owner, new Vector2(showcase.screen.x, showcase.screen.y)))}`);
  const rect = labelRect();
  const probe = new Vector2(rect.x + LABEL_PROBE_INSET_PX, rect.y + rect.height / 2);
  assert(near(viewportPixel(owner, probe), style(LABEL_COLOR)), `The label is drawn over the 3D view in its colour: ${hex(viewportPixel(owner, probe))}`);
  await capture('09-anchored-label');

  // ---- The label is a 2D element over the 3D view that takes no input: a click through it reaches the panel ------------
  const addScreen = screenCenter(api, 'world-increment');
  const below = api.screenPointOf(add.x, add.y + 10);
  const pixelsPerPanelPixel = (below.y - addScreen.y) / 10;
  const labelCentreOffset = LABEL_GAP + LABEL_HEIGHT / 2;
  api.placeOrbiter(add.x, add.y + labelCentreOffset / pixelsPerPanelPixel, 0);
  await settle();
  const over = labelRect();
  assert(addScreen.x >= over.x && addScreen.x < over.x + over.width && addScreen.y >= over.y && addScreen.y < over.y + over.height,
    `The label covers the Add button's centre ${addScreen.x},${addScreen.y}: ${JSON.stringify(over)}`);
  assert(near(viewportPixel(owner, new Vector2(over.x + LABEL_PROBE_INSET_PX, over.y + over.height / 2)), style(LABEL_COLOR)), 'and is drawn over it');
  await capture('10-anchored-label-over-button');
  api.resetCounts();
  const countBefore = Number(count());
  await click(addScreen);
  assert(Number(count()) === countBefore + 1, `A click on the button under the label reaches the button: ${count()} from ${countBefore}`);
  assert(counts().gamePresses === 0, 'and is not the game\'s: the label root took nothing');
  move(OFF_QUAD);
  await settle();
  await click(screenCenter(api, 'world-reset'));
  assert(count() === '0', `Reset brings the counter back: ${count()}`);
  move(OFF_QUAD);
  await settle();

  // ---- Behind the camera the label is hidden (unprojectPosition would put it at a mirrored point) -------------------------
  const camera = api.cameraPosition();
  api.placeOrbiterInWorld(camera.x, camera.y, camera.z + 1);
  await settle();
  assert(api.orbiterScreen().behind, 'The node is behind the camera');
  assert(labelRect().width === 0 && labelRect().height === 0, `A label for a node behind the camera is not shown: ${JSON.stringify(labelRect())}`);
  assert(labelNode('anchor-label').style.display === 'none', `It is display: none, not moved: ${String(labelNode('anchor-label').style.display)}`);
  await capture('11-anchored-label-behind-camera');
  api.placeOrbiter(SHOWCASE_PIXEL.x, SHOWCASE_PIXEL.y, SHOWCASE_HEIGHT);
  await settle();
  expectLabelAt(api.orbiterScreen().screen, 'Back in front of the camera');

  // ---- The orbit: every frame places the label at the node's current projection -----------------------------------------
  api.resumeOrbit();
  await settle();
  const sampleA = { reading: api.orbiterScreen(), rect: labelRect() };
  for (let step = 0; step < ORBIT_SAMPLE_SETTLES; step++) await settle();
  const sampleB = { reading: api.orbiterScreen(), rect: labelRect() };
  const moved = Math.hypot(sampleB.rect.x - sampleA.rect.x, sampleB.rect.y - sampleA.rect.y);
  assert(moved >= ORBIT_MIN_MOVE_PX, `While the node orbits the label moves with it: ${moved.toFixed(1)} px in ${ORBIT_SAMPLE_SETTLES} settles`);
  // The node and the label are updated in the same frame, so whenever the verifier looks they agree.
  expectLabelAt(sampleB.reading.screen, 'During the orbit');
  assert(!sampleB.reading.behind, 'The orbit stays in front of the camera');
  api.placeOrbiterInWorld(ORBITER_PARKING.x, ORBITER_PARKING.y, ORBITER_PARKING.z);
  await settle();
}

/**
 * Plan I11: a React root in a `SubViewport` shown on a 3D quad, driven by the camera ray. Every input here
 * enters through `Input.parseInputEvent` in the main viewport, at the screen point where the element is
 * drawn, so what is exercised is the whole route: ray, plane, pixel, copy, `pushInput`.
 */
/** How much a panel pixel may differ, in luma, between two renders that should be the same. */
const SAME_RASTER_TOLERANCE = 1e-6;
/** The two-texel panel renders at twice the panel's pixels. */
const PANEL_SCALE_TWO = 2;
/** The upscaled one-texel raster must be this much softer than a raster made at the scale; the crisp one must be this close to one-texel crispness. */
const UPSCALE_SOFTER_THAN = 0.7;
const CRISP_AT_LEAST = 0.8;
const CARET_COLOR = style('#4f46e5');
const PANEL_CARET_WAIT_FRAMES = 400;

function lumaOf(color: Color): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

/** The mean absolute luma difference between two images over the same region (texels). */
function meanLumaDifference(a: Image, b: Image, region: { x: number; y: number; width: number; height: number }): number {
  let total = 0;
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) total += Math.abs(lumaOf(a.getPixel(x, y)) - lumaOf(b.getPixel(x, y)));
  }
  return total / (region.width * region.height);
}

/**
 * The panel's texture at twice the panel's pixels (docs/tracks/hidpi.md, W9): the `SubViewport` is stretched to its 2D
 * override, its oversampling is 2, and native draws the root's text at it; a root in an unstretched `SubViewport` does
 * not follow the content scale of the window around it; and the input still maps through the quad.
 */
async function verifyPanelResolution(owner: Node, api: WorldInspection, capture: (name: string) => Promise<void>, directory: string): Promise<void> {
  const window = owner.getWindow();
  assert(window, 'The HiDPI checks require the owning Window');
  const panel = api.panelSize();
  const count = get(api, 'world-count').rect;
  const region = { x: Math.floor(count.x), y: Math.floor(count.y), width: Math.ceil(count.width), height: Math.ceil(count.height) };
  const scaled = (factor: number) => ({ x: region.x * factor, y: region.y * factor, width: region.width * factor, height: region.height * factor });

  // At one texel per panel pixel, the window at content scale 1 and then 2: the panel does not know about the window.
  api.setPanelPixelScale(1);
  await settle();
  const atOne = api.panelImage();
  assert(atOne.getWidth() === panel.x && atOne.getHeight() === panel.y, `The panel renders ${panel.x}x${panel.y} texels at scale 1: ${atOne.getWidth()}x${atOne.getHeight()}`);
  assert(api.snapshot().oversampling === 1, `A root in a SubViewport at scale 1 draws at 1: ${api.snapshot().oversampling}`);
  window.contentScaleFactor = PANEL_SCALE_TWO;
  await settle();
  assert(api.snapshot().oversampling === 1,
    `A root in a SubViewport that is not stretched does not follow the window's content scale: it draws at ${api.snapshot().oversampling}`);
  const underScaledWindow = api.panelImage();
  const difference = meanLumaDifference(atOne, underScaledWindow, region);
  assert(difference <= SAME_RASTER_TOLERANCE, `The panel's raster is the same under a window at content scale 2 (mean luma difference ${difference})`);
  window.contentScaleFactor = 1;
  await settle();

  // Twice the texels: the viewport changes scale with no commit, and the text is redrawn at it.
  api.setPanelPixelScale(PANEL_SCALE_TWO);
  await settle();
  const atTwo = api.panelImage();
  assert(atTwo.getWidth() === panel.x * PANEL_SCALE_TWO && atTwo.getHeight() === panel.y * PANEL_SCALE_TWO,
    `The panel renders at twice the texels: ${atTwo.getWidth()}x${atTwo.getHeight()}`);
  assert(api.snapshot().oversampling === PANEL_SCALE_TWO, `A root in a SubViewport at twice its 2D override draws at 2: ${api.snapshot().oversampling}`);
  const crisp = measureStems(atTwo, scaled(PANEL_SCALE_TWO));
  const reference = measureStems(atOne, region);
  const soft = new Image();
  soft.copyFrom(atOne);
  soft.resize(atTwo.getWidth(), atTwo.getHeight(), Image.Interpolation.InterpolateBilinear);
  const upscaled = measureStems(soft, scaled(PANEL_SCALE_TWO));
  console.log('GODOT_REACT_HIDPI_MEASURE', JSON.stringify({ name: 'panel-count-digit', value: { oneTexel: reference, twoTexels: crisp, oneTexelUpscaled: upscaled } }));
  assert(crisp.peakStep >= reference.peakStep * CRISP_AT_LEAST,
    `The panel's text at twice the texels is as crisp per texel as at one: peak step ${crisp.peakStep.toFixed(3)} against ${reference.peakStep.toFixed(3)}`);
  assert(upscaled.peakStep <= reference.peakStep * UPSCALE_SOFTER_THAN,
    `...and a raster made at one texel and upscaled is not (peak step ${upscaled.peakStep.toFixed(3)}), so the check can tell`);
  assert(atTwo.savePng(`${directory}/12-panel-texture-2x.png`) === GError.Ok, 'Could not save the 2x panel texture');
  await capture('12-panel-2x');

  // Input maps as before: the quad's pixels are still panel pixels.
  const incrementTarget = screenCenter(api, 'world-increment');
  const before = text(api, 'world-count');
  await click(incrementTarget);
  assert(text(api, 'world-count') === String(Number(before) + 1), `A click on the projected Add button works at twice the texels: ${before} -> ${text(api, 'world-count')}`);

  // The world's text input at twice the texels: a caret one panel pixel wide, which is two texels.
  await click(screenCenter(api, 'world-input'));
  assert(api.surfaceHasFocus(), 'A press on the projected field focuses it at twice the texels');
  for (let frame = 0; frame < PANEL_CARET_WAIT_FRAMES && get(api, 'world-input').textInput?.caretVisible !== true; frame += 1) await settle();
  const field = get(api, 'world-input').textInput;
  assert(field !== null && field.caretVisible && field.caret !== null, 'The focused field shows its caret');
  const image = api.panelImage();
  const row = Math.round((field.caret.y + field.caret.height / 2) * PANEL_SCALE_TWO);
  let start = -1;
  let end = -1;
  for (let x = Math.floor((field.caret.x - 2) * PANEL_SCALE_TWO); x <= Math.ceil((field.caret.x + 3) * PANEL_SCALE_TWO); x += 1) {
    if (near(image.getPixel(x, row), CARET_COLOR)) {
      if (start < 0) start = x;
      end = x;
    }
  }
  assert(start >= 0 && end - start + 1 === PANEL_SCALE_TWO, `The caret is two texels wide at twice the texels: columns ${start} to ${end}`);
  assert(Math.abs(start - field.caret.x * PANEL_SCALE_TWO) <= 1, `...and where native puts it: column ${start} for ${field.caret.x * PANEL_SCALE_TWO}`);
  await click(screenCenter(api, 'world-title'));
  api.setPanelPixelScale(null);
  await settle();
}

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

  // The orbit and its label are verified last; until then the orbiter waits off to one side of the window.
  api.placeOrbiterInWorld(ORBITER_PARKING.x, ORBITER_PARKING.y, ORBITER_PARKING.z);
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

  // ---- Typing: a text input on the quad takes a projected press, then the keys the main viewport gets -------------
  const field = (): { value: string; selection: [number, number]; caretVisible: boolean } => {
    const state = get(api, 'world-input').textInput;
    assert(state, 'The name field is a text input');
    return { value: state.value, selection: [state.selectionStart, state.selectionEnd], caretVisible: state.caretVisible };
  };
  assert(field().value === '' && text(api, 'world-echo') === 'Nobody yet', 'The name field starts empty');
  api.resetCounts();
  await click(screenCenter(api, 'world-input'));
  assert(api.surfaceHasFocus() && api.snapshot().focused === get(api, 'world-input').id, 'A press on the projected field focuses it and gives the root key focus');
  await typeText('Hi there');
  assert(field().value === 'Hi there', `Keys sent to the main viewport type into the field in the SubViewport: ${field().value}`);
  assert(text(api, 'world-echo') === 'Hello, Hi there', `and React followed: ${text(api, 'world-echo')}`);
  assert(counts().gameKeys === 0, `A key the field consumed never reaches the game: ${JSON.stringify(counts())}`);
  await key(Key.KeyBackspace);
  assert(field().value === 'Hi ther', `Backspace deletes: ${field().value}`);
  await capture('06a-typing');
  // A press on the projected text places the caret where it lands, through the quad's mapping.
  const fieldRect = get(api, 'world-input').rect;
  const nearTheStart = api.screenPointOf(fieldRect.x + FIELD_TEXT_INSET_PX, fieldRect.y + fieldRect.height / 2);
  await click(new Vector2(nearTheStart.x, nearTheStart.y));
  assert(field().selection.join() === '0,0', `A press at the start of the projected text puts the caret there: ${field().selection}`);
  await typeText('>');
  assert(field().value === '>Hi ther', `and typing goes in at the caret: ${field().value}`);
  // Pressing something that cannot take focus hands key focus back, and typing goes to the game again.
  await click(screenCenter(api, 'world-title'));
  assert(!api.surfaceHasFocus(), 'Clicking the title releases key focus from the field');
  api.resetCounts();
  await typeText('x');
  assert(field().value === '>Hi ther' && counts().gameKeys === 1, `Without focus the key is the game's: ${field().value} ${JSON.stringify(counts())}`);
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

  // ---- A label in the main viewport that follows a moving 3D node ------------------------------------------------
  await verifyAnchoredLabel(owner, api, capture);

  // ---- The panel's resolution: texels per panel pixel, and what draws at them ------------------------------------
  await verifyPanelResolution(owner, api, capture, directory);

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
