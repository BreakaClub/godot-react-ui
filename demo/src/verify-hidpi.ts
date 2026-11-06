import {
  Color, DisplayServer, Engine, Image, Label, Node, Panel, RenderingServer, StyleBoxFlat, SubViewport, Time, Vector2, Vector2I, Window,
} from 'godot';
import type { NativeSnapshotNode } from '../../src/native';
import { HIDPI_STEM_TEXT } from './hidpi-lab';
import type { InteractionInspection } from './verify-interaction';

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
/** Scale of the window for the DPR 2 sections. */
const RETINA_SCALE = 2;
/** The same text drawn by the same code at the same scale must look alike; a Godot `Label` is the measure. */
const SHARPNESS_OF_REFERENCE_MIN = 0.9;
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

interface PixelRegion {
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
  return { peakStep: peak, partialPerEdge: edges === 0 ? Number.POSITIVE_INFINITY : partial / edges, edges };
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
  findings.check(ratio === RETINA_SCALE, `The raster is twice the logical size: ${ratio}`);

  // Text: the React line of stems against the same stems drawn by a Godot Label.
  const stems = node(api, 'hidpi-stems').rect;
  const reactStems = measureStems(image, physical(stems, ratio));
  const labelStems = measureStems(image, physical({ x: strip.x, y: strip.y, width: REFERENCE_PANEL_OFFSET, height: strip.height }, ratio));
  measure('stems', { react: reactStems, label: labelStems });
  findings.check(reactStems.peakStep >= labelStems.peakStep * SHARPNESS_OF_REFERENCE_MIN,
    `React text is as crisp as a Godot Label's at content scale 2: peak step ${reactStems.peakStep.toFixed(3)} against ${labelStems.peakStep.toFixed(3)}`);
  findings.check(reactStems.partialPerEdge <= labelStems.partialPerEdge + 0.5,
    `React text edges are as narrow as a Godot Label's: ${reactStems.partialPerEdge.toFixed(2)} partial pixels per edge against ${labelStems.partialPerEdge.toFixed(2)}`);

  // Boxes: the antialiased edge of a rounded box against the same box as a Godot Panel, and against a square one.
  const boxLuma = luma(BOX_COLOR);
  const box = node(api, 'hidpi-box').rect;
  const reactEdge = measureLeftEdge(image, Math.round(box.x * ratio), Math.round((box.y + box.height / 2) * ratio), boxLuma);
  const panelEdge = measureLeftEdge(image, Math.round((strip.x + REFERENCE_PANEL_OFFSET) * ratio), Math.round((strip.y + REFERENCE_PANEL_SIZE.y / 2) * ratio), boxLuma);
  measure('rounded-box-left-edge', { react: reactEdge, panel: panelEdge });
  findings.check(reactEdge.partial <= panelEdge.partial,
    `A rounded box's edge is as narrow as a Godot Panel's at content scale 2: ${reactEdge.partial} partial pixels against ${panelEdge.partial}`);

  const square = node(api, 'hidpi-square-border').rect;
  const squareEdge = measureLeftEdge(image, Math.round(square.x * ratio), Math.round((square.y + square.height / 2) * ratio), luma(BLACK));
  measure('square-border-left-edge', squareEdge);

  removeReferences(owner, references);
  window.contentScaleFactor = 1;
  await frames(SETTLE_FRAMES);
  api.restoreDemo();
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
  await measureFullRepaint(api);
  findings.conclude();
}
