import {
  Color, DisplayServer, Engine, Image, Label, Node, Panel, RenderingServer, StyleBoxFlat, SubViewport, TextServerManager, Time, Vector2, Vector2I, Window,
} from 'godot';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import { HIDPI_STEM_TEXT } from './hidpi-lab';
import type { InteractionInspection } from './verify-interaction';
import { click, move, pressAction, waitForCaretOn } from './verify-text-input';

/**
 * Phase H1 (docs/tracks/hidpi.md): HiDPI text and box rendering, checked in the raster of a window that runs at a content
 * scale of two, and the engine facts the rule for the text oversampling rests on.
 *
 * Every check is recorded and the section fails at its end with all of the failures, so one run says everything that is
 * wrong. The numbers it measures are logged as `GODOT_REACT_HIDPI_MEASURE` lines.
 */

const FRAME_POLL_MS = 10;
const SETTLE_FRAMES = 4;
/** Rec. 709 luma weights, to read a grey level from a colour. */
const LUMA_RED = 0.2126;
const LUMA_GREEN = 0.7152;
const LUMA_BLUE = 0.0722;
/** A pixel darker than this (luma) is ink. */
const INK_LUMA = 0.5;
/** A pixel is partly covered when its coverage lies strictly between these. */
const PARTIAL_COVERAGE_MIN = 0.1;
const PARTIAL_COVERAGE_MAX = 0.9;
/** Rows around the middle of a line of stems that are averaged (the stems are vertical, so they are all alike). */
const PROFILE_HALF_ROWS = 1;
/** How far each side of a box edge, in device pixels, the edge profile reads. */
const EDGE_PROFILE_REACH_PX = 4;
/** The strip the reference controls are placed in: the Label's left, and the Panel this far from it (logical pixels). */
const REFERENCE_PANEL_OFFSET = 130;
const REFERENCE_PANEL_SIZE = new Vector2(80, 40);
const REFERENCE_FONT_SIZE = 24;
const REFERENCE_RADIUS = 8;
const BOX_COLOR = new Color(0x4f / 255, 0x46 / 255, 0xe5 / 255, 1);
const BLACK = new Color(0, 0, 0, 1);
/** The text field's caret colour (`caret-indigo-600`) and its selection (the default, blue-500 at 35 % over white). */
const CARET_COLOR = BOX_COLOR;
const SELECTION_TINT = new Color(0.65 + 0.35 * 0.231, 0.65 + 0.35 * 0.51, 0.65 + 0.35 * 0.965, 1);
/** How far a pixel may be from a colour and still be that colour (an 8-bit channel is 0.004). */
const COLOR_TOLERANCE = 0.03;
/** The caret is one logical pixel wide (`CARET_WIDTH_PX` in native/text_input_godot.rs). */
const CARET_WIDTH_LOGICAL_PX = 1;
/** How many characters the selection test selects, from the start of the field. */
const SELECTED_STEMS = 5;
/** A selection edge may lie this far, in device pixels, from the glyph edge it is meant to meet (a side bearing). */
const SELECTION_FIT_PX = 6;
/** The focus ring's colour and width (`FOCUS_RING_COLOR` and `FOCUS_RING_WIDTH` in native/lib.rs). */
const FOCUS_RING_COLOR = new Color(0.49, 0.66, 1.0, 1);
const FOCUS_RING_WIDTH_LOGICAL_PX = 2;
/** A scale between two whole ones, as some displays have. */
const FRACTIONAL_SCALE = 1.5;
/** Half a device pixel at content scale 2, in logical pixels. */
const HALF_DEVICE_PIXEL_LOGICAL = 0.25;
/** A device pixel of slack when comparing a rectangle's edge with where native says it is. */
const EDGE_SLACK_PX = 1;
/** Scale of the window for the DPR 2 sections. */
const RETINA_SCALE = 2;
/** The same text drawn by the same code at the same scale must look alike; a Godot `Label` is the measure. */
const SHARPNESS_OF_REFERENCE_MIN = 0.9;
/** The oversampling override of the scale-change test, a level the window does not otherwise have, and how long idle is. */
const OVERRIDE_SCALE = 3;
const IDLE_FRAMES = 6;
/** The full-repaint scenario: this many cells, repainted this many times. */
const REPAINT_CELLS = 2000;
const REPAINT_ROUNDS = 30;
/** Percentiles of the repaint samples. */
const MEDIAN = 0.5;
const P95 = 0.95;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class Findings {
  private readonly failures: string[] = [];

  check(condition: boolean, message: string): void {
    if (!condition) this.failures.push(message);
  }

  conclude(): void {
    if (this.failures.length > 0) throw new Error(`${this.failures.length} HiDPI check(s) failed:\n- ${this.failures.join('\n- ')}`);
  }
}

/** `items[index]`, which the compiler cannot know is in range. */
function element<T>(items: readonly T[], index: number): T {
  const found = items[index];
  assert(found !== undefined, `No element ${index} of ${items.length}`);
  return found;
}

function measure(name: string, value: unknown): void {
  console.log('GODOT_REACT_HIDPI_MEASURE', JSON.stringify({ name, value }));
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function grab(owner: Node): Image {
  RenderingServer.forceDraw();
  const image = owner.getViewport()?.getTexture()?.getImage();
  assert(image, 'Native verification requires a rendered viewport');
  return image;
}

function luma(color: Color): number {
  return LUMA_RED * color.r + LUMA_GREEN * color.g + LUMA_BLUE * color.b;
}

function node(api: InteractionInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

export interface PixelRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

function physical(rect: PixelRegion, ratio: number): PixelRegion {
  return { x: Math.floor(rect.x * ratio), y: Math.floor(rect.y * ratio), width: Math.ceil(rect.width * ratio), height: Math.ceil(rect.height * ratio) };
}

/** How crisply a line of vertical stems is drawn. */
export interface StemMeasure {
  /** The largest step between neighbouring pixels along the row, as a share of the stem's full darkness (1 is a hard edge). */
  peakStep: number;
  /** Partly covered pixels per edge: 0 for a hard edge, about 2 or more for an edge a bilinear upscale has blurred. */
  partialPerEdge: number;
  edges: number;
  /** The same step down the middle of the first stem: the end of a stem is hard when the baseline lies on a device pixel. */
  verticalPeakStep: number;
}

/** The ink in `region`, read along the middle row of its ink. */
export function measureStems(image: Image, region: PixelRegion): StemMeasure {
  const inkRows: number[] = [];
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      if (luma(image.getPixel(x, y)) < INK_LUMA) {
        inkRows.push(y);
        break;
      }
    }
  }
  assert(inkRows.length > 0, `No ink in ${JSON.stringify(region)}`);
  const middle = element(inkRows, Math.floor(inkRows.length / 2));
  const profile: number[] = [];
  for (let x = region.x; x < region.x + region.width; x += 1) {
    let darkness = 0;
    for (let y = middle - PROFILE_HALF_ROWS; y <= middle + PROFILE_HALF_ROWS; y += 1) darkness += 1 - luma(image.getPixel(x, y));
    profile.push(darkness / (2 * PROFILE_HALF_ROWS + 1));
  }
  const top = Math.max(...profile);
  let peak = 0;
  let partial = 0;
  let edges = 0;
  for (let index = 0; index < profile.length; index += 1) {
    const coverage = element(profile, index) / top;
    if (coverage > PARTIAL_COVERAGE_MIN && coverage < PARTIAL_COVERAGE_MAX) partial += 1;
    if (index + 1 < profile.length) {
      const following = element(profile, index + 1);
      peak = Math.max(peak, Math.abs(following - element(profile, index)) / top);
      const next = following / top;
      if ((coverage < 0.5) !== (next < 0.5)) edges += 1;
    }
  }
  // The first stem's core column, read down the region.
  const core = profile.findIndex(darkness => darkness / top >= PARTIAL_COVERAGE_MAX);
  assert(core >= 0, `No stem core in ${JSON.stringify(region)}`);
  const column: number[] = [];
  for (let y = region.y; y < region.y + region.height; y += 1) column.push(1 - luma(image.getPixel(region.x + core, y)));
  let vertical = 0;
  for (let index = 0; index + 1 < column.length; index += 1) vertical = Math.max(vertical, Math.abs(element(column, index + 1) - element(column, index)) / top);
  return { peakStep: peak, partialPerEdge: edges === 0 ? Number.POSITIVE_INFINITY : partial / edges, edges, verticalPeakStep: vertical };
}

/** How wide the antialiased ramp of a vertical box edge is. */
export interface EdgeMeasure {
  /** The pixels of the ramp, outside to inside, as the share of the box colour (0 outside, 1 inside). */
  coverage: number[];
  /** Pixels that are neither outside nor inside. */
  partial: number;
}

/** The left edge of a box that is `boxLuma` dark inside and white outside, read along `row`, around device column `edge`. */
export function measureLeftEdge(image: Image, edge: number, row: number, boxLuma: number): EdgeMeasure {
  const coverage: number[] = [];
  for (let x = edge - EDGE_PROFILE_REACH_PX; x <= edge + EDGE_PROFILE_REACH_PX; x += 1) {
    coverage.push((1 - luma(image.getPixel(x, row))) / (1 - boxLuma));
  }
  return { coverage, partial: coverage.filter(value => value > PARTIAL_COVERAGE_MIN && value < PARTIAL_COVERAGE_MAX).length };
}

interface ScaleFacts {
  /** `Viewport.get_oversampling()`: what the engine's own controls draw text at. */
  viewportOversampling: number;
  /** `Window.content_scale_factor`. */
  contentScaleFactor: number;
  logicalWidth: number;
  logicalHeight: number;
}

function scaleFacts(window: Window): ScaleFacts {
  const size = window.getVisibleRect().size;
  return { viewportOversampling: window.getOversampling(), contentScaleFactor: window.contentScaleFactor, logicalWidth: size.x, logicalHeight: size.y };
}

function requireWindow(owner: Node): Window {
  const window = owner.getWindow();
  assert(window, 'The HiDPI section requires its owning Window');
  return window;
}

/** What the engine says about oversampling, for each way a window or a viewport can be scaled. */
async function verifyEngineFacts(owner: Node, findings: Findings): Promise<void> {
  const window = requireWindow(owner);
  const pixelSize = window.size;
  const initial = scaleFacts(window);
  measure('initial', { ...initial, screenScale: DisplayServer.screenGetScale(), screenMaxScale: DisplayServer.screenGetMaxScale(), windowPixels: [pixelSize.x, pixelSize.y] });
  findings.check(initial.viewportOversampling === 1 && initial.contentScaleFactor === 1, 'A window with no stretch settings has oversampling 1 and content scale 1');

  window.contentScaleFactor = RETINA_SCALE;
  await frames(SETTLE_FRAMES);
  const scaled = scaleFacts(window);
  measure('content-scale-2', scaled);
  findings.check(scaled.viewportOversampling === RETINA_SCALE, `A window's viewport carries its content scale factor: oversampling ${scaled.viewportOversampling}`);

  window.contentScaleFactor = 1;
  window.contentScaleMode = Window.ContentScaleMode.ContentScaleModeCanvasItems;
  window.contentScaleSize = new Vector2I(Math.round(pixelSize.x / RETINA_SCALE), Math.round(pixelSize.y / RETINA_SCALE));
  await frames(SETTLE_FRAMES);
  const stretched = scaleFacts(window);
  measure('canvas-items-stretch', stretched);
  findings.check(stretched.viewportOversampling === RETINA_SCALE && stretched.contentScaleFactor === 1,
    `The canvas_items stretch mode doubles the oversampling and leaves the content scale factor at 1: ${JSON.stringify(stretched)}`);

  window.contentScaleMode = Window.ContentScaleMode.ContentScaleModeViewport;
  window.contentScaleFactor = RETINA_SCALE;
  await frames(SETTLE_FRAMES);
  const pixelMode = scaleFacts(window);
  measure('viewport-mode-content-scale-2', pixelMode);
  findings.check(pixelMode.viewportOversampling === 1 && pixelMode.contentScaleFactor === RETINA_SCALE,
    `The viewport stretch mode renders small and upscales, so it has oversampling 1 whatever the content scale factor: ${JSON.stringify(pixelMode)}`);

  window.contentScaleMode = Window.ContentScaleMode.ContentScaleModeDisabled;
  window.contentScaleSize = new Vector2I(0, 0);
  window.oversampling = false;
  await frames(SETTLE_FRAMES);
  const disabled = scaleFacts(window);
  measure('oversampling-off-content-scale-2', disabled);
  findings.check(disabled.viewportOversampling === 1 && disabled.contentScaleFactor === RETINA_SCALE,
    `A window with font oversampling switched off has oversampling 1 at content scale 2: ${JSON.stringify(disabled)}`);

  window.oversampling = true;
  window.contentScaleFactor = 1;
  window.oversamplingOverride = 3;
  await frames(SETTLE_FRAMES);
  const overridden = scaleFacts(window);
  measure('oversampling-override-3', overridden);
  findings.check(overridden.viewportOversampling === 3 && overridden.contentScaleFactor === 1, `The oversampling override sets the oversampling: ${JSON.stringify(overridden)}`);
  window.oversamplingOverride = 0;
  await frames(SETTLE_FRAMES);

  await verifySubViewportFacts(owner, window, findings);
}

async function verifySubViewportFacts(owner: Node, window: Window, findings: Findings): Promise<void> {
  window.contentScaleFactor = RETINA_SCALE;
  const panel = new SubViewport();
  panel.size = new Vector2I(480, 320);
  const child = new Node();
  panel.addChild(child);
  owner.addChild(panel);
  await frames(SETTLE_FRAMES);
  const windowOfChild = child.getWindow();
  measure('sub-viewport-in-content-scale-2', {
    subViewportOversampling: panel.getOversampling(), windowOfChildIsMainWindow: windowOfChild?.getInstanceId() === window.getInstanceId(),
    mainWindowContentScale: window.contentScaleFactor,
  });
  findings.check(windowOfChild?.getInstanceId() === window.getInstanceId(), 'A node in a SubViewport answers get_window() with the main window');
  findings.check(panel.getOversampling() === 1, `A SubViewport has oversampling 1 whatever the window's content scale: ${panel.getOversampling()}`);

  panel.size = new Vector2I(960, 640);
  panel.size2DOverride = new Vector2I(480, 320);
  panel.size2DOverrideStretch = true;
  await frames(SETTLE_FRAMES);
  measure('sub-viewport-2d-override-stretch', { subViewportOversampling: panel.getOversampling() });
  findings.check(panel.getOversampling() === RETINA_SCALE, `A SubViewport at twice its 2D override size has oversampling 2: ${panel.getOversampling()}`);

  owner.removeChild(panel);
  panel.free();
  window.contentScaleFactor = 1;
  await frames(SETTLE_FRAMES);
}

/** A Godot `Label` and a `Panel` drawn by the engine's own controls, in the lab's reference strip. */
interface References {
  label: Label;
  panel: Panel;
}

function addReferences(owner: Node, strip: PixelRegion): References {
  const label = new Label();
  label.text = HIDPI_STEM_TEXT;
  label.addThemeFontSizeOverride('font_size', REFERENCE_FONT_SIZE);
  label.addThemeColorOverride('font_color', BLACK);
  label.position = new Vector2(strip.x, strip.y);
  owner.addChild(label);
  const style = new StyleBoxFlat();
  style.bgColor = BOX_COLOR;
  style.setCornerRadiusAll(REFERENCE_RADIUS);
  const panel = new Panel();
  panel.addThemeStyleboxOverride('panel', style);
  panel.position = new Vector2(strip.x + REFERENCE_PANEL_OFFSET, strip.y);
  panel.size = REFERENCE_PANEL_SIZE;
  owner.addChild(panel);
  return { label, panel };
}

function removeReferences(owner: Node, references: References): void {
  for (const control of [references.label, references.panel]) {
    owner.removeChild(control);
    control.free();
  }
}

/** The glyph caches the default font holds, as `TextServer.font_get_size_cache_info` lists them: size in 26.6 pixels, oversampling, texture bytes. */
function glyphCaches(owner: Node): Array<{ size: number; oversampling: number; glyphs: number; bytes: number }> {
  const server = TextServerManager.getPrimaryInterface();
  assert(server, 'There is a text server');
  const font = owner.getWindow()?.getThemeDefaultFont();
  assert(font, 'The window has a default theme font');
  const caches: Array<{ size: number; oversampling: number; glyphs: number; bytes: number }> = [];
  const rids = font.getRids();
  for (let rid = 0; rid < rids.size(); rid += 1) {
    const info = server.fontGetSizeCacheInfo(rids.get(rid));
    for (let index = 0; index < info.size(); index += 1) {
      const entry = info.get(index);
      const size = entry.get('size_px');
      caches.push({ size: size.x, oversampling: Number(entry.get('viewport_oversampling') ?? 0), glyphs: Number(entry.get('glyphs')), bytes: Number(entry.get('textures_size')) });
    }
  }
  return caches;
}

/** Text and a rounded box in the raster, against the same drawn by a Godot `Label` and `Panel`. */
function compareWithReferences(image: Image, api: InteractionInspection, findings: Findings, strip: PixelRegion, ratio: number, scale: string): void {
  // Text: the React line of stems against the same stems drawn by a Godot Label.
  const stems = node(api, 'hidpi-stems').rect;
  const reactStems = measureStems(image, physical(stems, ratio));
  const labelStems = measureStems(image, physical({ x: strip.x, y: strip.y, width: REFERENCE_PANEL_OFFSET, height: strip.height }, ratio));
  measure(`stems at ${scale}`, { react: reactStems, label: labelStems });
  findings.check(reactStems.peakStep >= labelStems.peakStep * SHARPNESS_OF_REFERENCE_MIN,
    `React text is as crisp as a Godot Label's at ${scale}: peak step ${reactStems.peakStep.toFixed(3)} against ${labelStems.peakStep.toFixed(3)}`);
  findings.check(reactStems.partialPerEdge <= labelStems.partialPerEdge + 0.5,
    `React text edges are as narrow as a Godot Label's at ${scale}: ${reactStems.partialPerEdge.toFixed(2)} partial pixels per edge against ${labelStems.partialPerEdge.toFixed(2)}`);
  findings.check(reactStems.verticalPeakStep >= labelStems.verticalPeakStep * SHARPNESS_OF_REFERENCE_MIN,
    `React text ends on a pixel row as a Godot Label's does at ${scale}: vertical step ${reactStems.verticalPeakStep.toFixed(3)} against ${labelStems.verticalPeakStep.toFixed(3)}`);

  // Boxes: the antialiased edge of a rounded box against the same box as a Godot Panel.
  const boxLuma = luma(BOX_COLOR);
  const box = node(api, 'hidpi-box').rect;
  const reactEdge = measureLeftEdge(image, Math.round(box.x * ratio), Math.round((box.y + box.height / 2) * ratio), boxLuma);
  const panelEdge = measureLeftEdge(image, Math.round((strip.x + REFERENCE_PANEL_OFFSET) * ratio), Math.round((strip.y + REFERENCE_PANEL_SIZE.y / 2) * ratio), boxLuma);
  measure(`rounded box left edge at ${scale}`, { react: reactEdge, panel: panelEdge });
  findings.check(reactEdge.partial <= panelEdge.partial,
    `A rounded box's edge is as narrow as a Godot Panel's at ${scale}: ${reactEdge.partial} partial pixels against ${panelEdge.partial}`);

  const square = node(api, 'hidpi-square-border').rect;
  measure(`square border left edge at ${scale}`, measureLeftEdge(image, Math.round(square.x * ratio), Math.round((square.y + square.height / 2) * ratio), luma(BLACK)));
}

/** A scale the display may have that is not a whole number: the same comparison with the engine's own controls. */
async function verifyFractionalScale(owner: Node, api: InteractionInspection, findings: Findings): Promise<void> {
  const window = requireWindow(owner);
  window.contentScaleFactor = FRACTIONAL_SCALE;
  api.showLab('hidpi');
  await frames(SETTLE_FRAMES);
  const strip = node(api, 'hidpi-reference').rect;
  const references = addReferences(owner, strip);
  await frames(SETTLE_FRAMES);
  const image = grab(owner);
  const ratio = image.getWidth() / api.snapshot().width;
  findings.check(Math.abs(ratio - FRACTIONAL_SCALE) < 0.01 && api.snapshot().oversampling === FRACTIONAL_SCALE,
    `At a content scale of ${FRACTIONAL_SCALE} the root draws at ${FRACTIONAL_SCALE}: raster ratio ${ratio}, oversampling ${api.snapshot().oversampling}`);
  compareWithReferences(image, api, findings, strip, ratio, `content scale ${FRACTIONAL_SCALE}`);
  removeReferences(owner, references);
  window.contentScaleFactor = 1;
  await frames(SETTLE_FRAMES);
  api.restoreDemo();
  await frames(SETTLE_FRAMES);
}

/** Text and boxes in the raster of a window at content scale 2, against the engine's own controls. */
async function verifyRaster(owner: Node, api: InteractionInspection, findings: Findings, capture: (name: string) => Promise<void>): Promise<void> {
  const window = requireWindow(owner);
  window.contentScaleFactor = RETINA_SCALE;
  api.showLab('hidpi');
  await frames(SETTLE_FRAMES);
  const strip = node(api, 'hidpi-reference').rect;
  const references = addReferences(owner, strip);
  await frames(SETTLE_FRAMES);
  await capture('hidpi-dpr2-lab');

  const image = grab(owner);
  const snapshot = api.snapshot();
  const ratio = image.getWidth() / snapshot.width;
  measure('glyph-caches-at-scale-2', glyphCaches(owner));
  findings.check(ratio === RETINA_SCALE, `The raster is twice the logical size: ${ratio}`);
  findings.check(snapshot.oversampling === RETINA_SCALE, `The root draws at the window's oversampling: ${snapshot.oversampling}`);

  compareWithReferences(image, api, findings, strip, ratio, 'content scale 2');

  removeReferences(owner, references);
  window.contentScaleFactor = 1;
  await frames(SETTLE_FRAMES);
  measure('glyph-caches-after-returning-to-scale-1', glyphCaches(owner));
  window.contentScaleFactor = RETINA_SCALE;
  await frames(SETTLE_FRAMES);
  await verifyScaleChanges(window, api, findings);
  await verifyFractionalPlacement(owner, api, findings);
  await verifyTextField(owner, api, findings, capture);
  window.contentScaleFactor = 1;
  await frames(SETTLE_FRAMES);
  api.restoreDemo();
  await frames(SETTLE_FRAMES);
}

function near(color: Color, expected: Color): boolean {
  return Math.abs(color.r - expected.r) <= COLOR_TOLERANCE && Math.abs(color.g - expected.g) <= COLOR_TOLERANCE
    && Math.abs(color.b - expected.b) <= COLOR_TOLERANCE;
}

/** The runs of consecutive columns along `row` between `from` and `to` (device pixels) whose pixel satisfies `test`. */
function runs(image: Image, row: number, from: number, to: number, test: (color: Color) => boolean): Array<{ start: number; end: number }> {
  const found: Array<{ start: number; end: number }> = [];
  let start = -1;
  for (let x = from; x <= to; x += 1) {
    const hit = x < to && test(image.getPixel(x, row));
    if (hit && start < 0) start = x;
    if (!hit && start >= 0) {
      found.push({ start, end: x - 1 });
      start = -1;
    }
  }
  return found;
}

/**
 * Whether a root, or anything inside it, that lies on a half device pixel is drawn blurred. A scroll container translates its
 * content by its scroll offset, which is fractional; this moves the whole root by a quarter of a logical pixel (half a device
 * pixel at scale 2) and by a half (a whole device pixel) and reads the same stems each time.
 */
async function verifyFractionalPlacement(owner: Node, api: InteractionInspection, findings: Findings): Promise<void> {
  const stemsRegion = (): PixelRegion => node(api, 'hidpi-stems').rect;
  const read = async (x: number): Promise<StemMeasure> => {
    api.offsetSurface(x, 0);
    await frames(SETTLE_FRAMES);
    const image = grab(owner);
    return measureStems(image, physical({ ...stemsRegion(), x: stemsRegion().x + x }, RETINA_SCALE));
  };
  const aligned = await read(0);
  const half = await read(HALF_DEVICE_PIXEL_LOGICAL);
  const whole = await read(2 * HALF_DEVICE_PIXEL_LOGICAL);
  api.offsetSurface(0, 0);
  await frames(SETTLE_FRAMES);
  measure('fractional-root-offset', { aligned, half, whole });
  findings.check(half.peakStep >= aligned.peakStep * SHARPNESS_OF_REFERENCE_MIN && half.partialPerEdge <= aligned.partialPerEdge + 0.5,
    `A root on a half device pixel draws text as crisp as on a whole one: peak step ${half.peakStep.toFixed(3)} against ${aligned.peakStep.toFixed(3)}, ${half.partialPerEdge.toFixed(2)} partial pixels per edge against ${aligned.partialPerEdge.toFixed(2)}`);
}

/**
 * The text input at content scale 2: its text drawn at the scale, scrolled horizontally by a caret at the end, the caret's
 * width and place, and a selection against the glyphs it covers. (An IME preedit cannot be injected natively; the Web
 * verifier reads it.)
 */
async function verifyTextField(owner: Node, api: InteractionInspection, findings: Findings, capture: (name: string) => Promise<void>): Promise<void> {
  const field = node(api, 'hidpi-field');
  const inner = (): PixelRegion => {
    const box = node(api, 'hidpi-field').rect;
    return { x: box.x + 4, y: box.y + 3, width: box.width - 8, height: box.height - 6 };
  };
  // Not focused: the text at its start, for what its stems look like.
  const unscrolled = measureStems(grab(owner), physical(inner(), RETINA_SCALE));

  // `Input.parseInputEvent` takes window pixels, which the window divides by its content scale: a point in the root is
  // given as its logical position times the scale.
  await click(new Vector2((field.rect.x + field.rect.width / 2) * RETINA_SCALE, (field.rect.y + field.rect.height / 2) * RETINA_SCALE));
  await pressAction('ui_text_caret_line_end');
  await waitForCaretOn(api, 'hidpi-field');
  await capture('hidpi-dpr2-field-scrolled');
  const image = grab(owner);
  const state = node(api, 'hidpi-field').textInput;
  assert(state !== null && state.caret !== null, 'The field has a caret to look at');
  const ratio = image.getWidth() / api.snapshot().width;

  // Horizontal scrolling: the offset is fractional (a half device pixel here) and the stems stay as crisp as at rest.
  const scrolled = measureStems(image, physical(inner(), ratio));
  measure('field-scrolled', { scrollLeft: state.scrollLeft, scrollLeftDevicePx: state.scrollLeft * ratio, unscrolled, scrolled });
  findings.check(state.scrollLeft > 0, `The caret at the end scrolls the field: ${state.scrollLeft}`);
  findings.check(scrolled.peakStep >= unscrolled.peakStep * SHARPNESS_OF_REFERENCE_MIN,
    `Scrolled text is as crisp as text at rest: peak step ${scrolled.peakStep.toFixed(3)} against ${unscrolled.peakStep.toFixed(3)}`);

  // The caret: exactly one logical pixel wide, hard edged, where native says it is.
  const caret = state.caret;
  const caretRow = Math.round((caret.y + caret.height / 2) * ratio);
  const caretRuns = runs(image, caretRow, Math.floor((caret.x - 3) * ratio), Math.ceil((caret.x + 4) * ratio), color => near(color, CARET_COLOR));
  measure('caret', { rect: caret, deviceRuns: caretRuns });
  findings.check(caretRuns.length === 1 && caretRuns[0] !== undefined && caretRuns[0].end - caretRuns[0].start + 1 === CARET_WIDTH_LOGICAL_PX * ratio,
    `The caret is ${CARET_WIDTH_LOGICAL_PX * ratio} device pixels wide in one run: ${JSON.stringify(caretRuns)}`);
  const caretRun = caretRuns[0];
  if (caretRun !== undefined) {
    findings.check(Math.abs(caretRun.start - caret.x * ratio) <= EDGE_SLACK_PX, `The caret is drawn where native puts it: column ${caretRun.start} for ${caret.x * ratio}`);
    findings.check(near(image.getPixel(caretRun.start - 1, caretRow), new Color(1, 1, 1, 1)) && near(image.getPixel(caretRun.end + 1, caretRow), new Color(1, 1, 1, 1)),
      'The caret has no antialiased fringe');
  }

  // A selection of the first stems against those stems.
  await pressAction('ui_text_caret_line_start');
  await pressAction('ui_text_caret_right', true, SELECTED_STEMS);
  await frames(SETTLE_FRAMES);
  await capture('hidpi-dpr2-field-selection');
  const selected = grab(owner);
  const selectedState = node(api, 'hidpi-field').textInput;
  assert(selectedState !== null && selectedState.caret !== null, 'The field still has a caret');
  const box = inner();
  const from = Math.floor(box.x * ratio);
  const to = Math.ceil((box.x + box.width) * ratio);
  const probe = physical(box, ratio);
  const inkRow = Math.round(probe.y + probe.height / 2);
  const stems = runs(selected, inkRow, from, to, color => luma(color) < INK_LUMA);
  const tint = runs(selected, inkRow, from, to, color => near(color, SELECTION_TINT));
  const first = tint[0];
  const last = tint[tint.length - 1];
  measure('selection', { stems: stems.slice(0, SELECTED_STEMS + 1), tint: first === undefined || last === undefined ? null : { left: first.start, right: last.end }, caret: selectedState.caret });
  const fifth = stems[SELECTED_STEMS - 1];
  const sixth = stems[SELECTED_STEMS];
  const firstStem = stems[0];
  findings.check(first !== undefined && last !== undefined && fifth !== undefined && sixth !== undefined && firstStem !== undefined, 'The selection and the stems are in the raster');
  if (first !== undefined && last !== undefined && fifth !== undefined && sixth !== undefined && firstStem !== undefined) {
    findings.check(first.start <= firstStem.start && firstStem.start - first.start <= SELECTION_FIT_PX, `The selection starts at the first selected glyph: column ${first.start}, glyph at ${firstStem.start}`);
    findings.check(last.end >= fifth.end && last.end < sixth.start && last.end - fifth.end <= SELECTION_FIT_PX, `The selection ends with the last selected glyph and before the next: column ${last.end}, glyphs end at ${fifth.end}, next starts at ${sixth.start}`);
    findings.check(Math.abs(last.end + 1 - selectedState.caret.x * ratio) <= SELECTION_FIT_PX, `The selection ends where the caret is: column ${last.end + 1} against ${selectedState.caret.x * ratio}`);
  }
  await pressAction('ui_text_caret_line_start');

  // The focus ring of the button after the field, which Tab focuses: a two logical pixel inset stroke with rounded corners.
  await pressAction('ui_focus_next');
  await frames(SETTLE_FRAMES);
  await capture('hidpi-dpr2-focus-ring');
  const ringImage = grab(owner);
  const button = node(api, 'hidpi-button').rect;
  const ringRow = Math.round((button.y + button.height / 2) * ratio);
  const ringRuns = runs(ringImage, ringRow, Math.floor((button.x - 2) * ratio), Math.ceil((button.x + 6) * ratio), color => near(color, FOCUS_RING_COLOR));
  measure('focus-ring', { button, deviceRuns: ringRuns });
  findings.check(api.snapshot().focusVisible && ringRuns.length === 1 && ringRuns[0] !== undefined && ringRuns[0].end - ringRuns[0].start + 1 === FOCUS_RING_WIDTH_LOGICAL_PX * ratio,
    `The focus ring is ${FOCUS_RING_WIDTH_LOGICAL_PX * ratio} device pixels wide in one run: ${JSON.stringify(ringRuns)}`);
  move(new Vector2(1, 1));
  await frames(SETTLE_FRAMES);
}

/** How many nodes of the page draw text (a text input does), and how many have rounded boxes: what a change of scale must paint again. */
function scaleDependentNodes(snapshot: NativeSnapshot): { text: number; rounded: number } {
  return {
    text: snapshot.nodes.filter(entry => entry.kind === 'text' || entry.kind === 'textinput').length,
    rounded: snapshot.nodes.filter(entry => entry.kind !== 'text' && Number(entry.style.borderRadius ?? 0) > 0).length,
  };
}

/**
 * The scale changes under a root that is not told: no commit, no layout, no restyle. The engine only redraws its
 * own canvas items, and the root's text and rounded edges are retained items it must record again itself. Checked
 * through the level the root reports it last drew at, and through the records it made.
 */
async function verifyScaleChanges(window: Window, api: InteractionInspection, findings: Findings): Promise<void> {
  const before = api.snapshot();
  const { text, rounded } = scaleDependentNodes(before);
  findings.check(text > 0 && rounded > 0, `The lab has text and rounded boxes: ${text}, ${rounded}`);

  window.oversamplingOverride = OVERRIDE_SCALE;
  await frames(SETTLE_FRAMES);
  const raised = api.snapshot();
  measure('override-3-records', { oversampling: raised.oversampling, content: raised.stats.contentRecords - before.stats.contentRecords, box: raised.stats.boxRecords - before.stats.boxRecords, text, rounded });
  findings.check(raised.oversampling === OVERRIDE_SCALE, `A change of oversampling with no commit reaches the root: it draws at ${raised.oversampling}, not ${OVERRIDE_SCALE}`);
  findings.check(raised.stats.contentRecords - before.stats.contentRecords === text && raised.stats.boxRecords - before.stats.boxRecords === rounded,
    `It draws again exactly what depends on the scale: ${raised.stats.contentRecords - before.stats.contentRecords} texts of ${text}, ${raised.stats.boxRecords - before.stats.boxRecords} rounded boxes of ${rounded}`);

  await frames(IDLE_FRAMES);
  const idle = api.snapshot();
  findings.check(idle.stats.contentRecords === raised.stats.contentRecords && idle.stats.boxRecords === raised.stats.boxRecords && idle.stats.paintPasses === raised.stats.paintPasses,
    `Idle frames at the new scale record nothing: ${JSON.stringify({ content: idle.stats.contentRecords - raised.stats.contentRecords, box: idle.stats.boxRecords - raised.stats.boxRecords, passes: idle.stats.paintPasses - raised.stats.paintPasses })}`);

  window.oversamplingOverride = 0;
  await frames(SETTLE_FRAMES);
  findings.check(api.snapshot().oversampling === RETINA_SCALE, `Clearing the override returns the root to the window's scale: ${api.snapshot().oversampling}`);

  window.oversampling = false;
  await frames(SETTLE_FRAMES);
  findings.check(api.snapshot().oversampling === 1, `A window with font oversampling switched off is drawn at 1, as the engine's controls are: ${api.snapshot().oversampling}`);
  window.oversampling = true;
  await frames(SETTLE_FRAMES);

  const size = window.size;
  window.contentScaleFactor = 1;
  window.contentScaleMode = Window.ContentScaleMode.ContentScaleModeCanvasItems;
  window.contentScaleSize = new Vector2I(Math.round(size.x / RETINA_SCALE), Math.round(size.y / RETINA_SCALE));
  await frames(SETTLE_FRAMES);
  findings.check(api.snapshot().oversampling === RETINA_SCALE, `A canvas_items stretch that doubles the viewport is drawn at 2 with the content scale factor at 1: ${api.snapshot().oversampling}`);
  window.contentScaleMode = Window.ContentScaleMode.ContentScaleModeDisabled;
  window.contentScaleSize = new Vector2I(0, 0);
  window.contentScaleFactor = RETINA_SCALE;
  await frames(SETTLE_FRAMES);
}

function percentile(sorted: readonly number[], share: number): number {
  return element(sorted, Math.min(sorted.length - 1, Math.floor(sorted.length * share)));
}

/** What a repaint of every node costs, from the native draw samples (plan F4's scenario b). */
async function measureFullRepaint(api: InteractionInspection): Promise<void> {
  api.profile(true);
  const started = Time.getTicksMsec();
  for (let phase = 0; phase < REPAINT_ROUNDS; phase += 1) api.benchmark({ count: REPAINT_CELLS, text: false, phase, mode: 'paint' });
  const elapsed = Time.getTicksMsec() - started;
  const taken = api.takeProfile().native;
  api.profile(false);
  const draws = taken.samples.filter(sample => sample.kind === 'draw').map(sample => Number(sample.cpuMicros)).sort((a, b) => a - b);
  measure('full-repaint-draw-micros', {
    cells: REPAINT_CELLS, rounds: REPAINT_ROUNDS, samples: draws.length, p50: percentile(draws, MEDIAN), p95: percentile(draws, P95), wallMs: elapsed,
  });
  api.restoreDemo();
  await frames(SETTLE_FRAMES);
}

export async function verifyHidpi(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  const findings = new Findings();
  await verifyEngineFacts(owner, findings);
  await verifyRaster(owner, api, findings, capture);
  await verifyFractionalScale(owner, api, findings);
  await measureFullRepaint(api);
  findings.conclude();
}
