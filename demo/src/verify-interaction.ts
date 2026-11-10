import {
  Color, Control, DirAccess, DisplayServer, Engine, FileAccess, GError, HorizontalAlignment, Image, InputEventKey,
  InputEventMouseButton, InputEventMouseMotion, InputEventPanGesture, InputEventScreenDrag, InputEventScreenTouch, Key,
  MouseButton, MouseButtonMask, Node, OS, ProjectSettings, RenderingServer, ThemeDB, Time, Vector2,
} from 'godot';
import type { NativeActivity, NativeProfile, RendererProfile, UISelection } from '../../src';
import type { LayoutRect, NativeScrollState, NativeSnapshot, NativeSnapshotNode, NativeTouchSelection } from '../../src/native';
import type { BenchmarkProps } from './benchmark';
import type { FiltersLabProps } from './filters-lab';
import type { LabName } from './labs';
import type { NavigatorOptions, PassthroughCounts } from './main';
import { verifyCombobox } from './verify-combobox';
import { verifyDropdownTouch } from './verify-dropdown-touch';
import { verifyTouchSelection } from './verify-touch-selection';
import { verifyHidpi } from './verify-hidpi';
import { CLICK_SEQUENCE_PAUSE_MS, assertionTally, parseVerifierEvent, verifierClipboard, waitEngineTime, waitForNewClickSequence } from './verifier-input';
import { measureFilterCost, verifyFilterFaults, verifyFilterSizes, verifyFilters } from './verify-filters';
import { GLASS_FAULT_CONTROLS, verifyGlass } from './verify-glass';
import { verifyLiveCompile } from './verify-live-compile';
import { verifyCodeEditor } from './verify-code-editor';
import { verifyKeyPassthrough } from './verify-key-passthrough';
import { verifyFontFallback } from './verify-font-fallback';
import type { FontSlicesLabProps } from './font-slices-lab';
import { verifyNavigator } from './verify-navigator';
import { verifyRichText } from './verify-rich-text';
import { verifyTextStyles } from './verify-text-styles';
import { verifyTransformFaults, verifyTransforms } from './verify-transforms';
import type { LayoutUtilitiesPage } from './layout-utilities-lab';
import type { RichTextLabProps } from './rich-text-lab';
import { verifyLayoutUtilities } from './verify-layout-utilities';
import { verifyPaint } from './verify-paint';
import { verifyTextInput } from './verify-text-input';
import type { DemoInspection } from './verify';
import type { ExtensionHost } from './live-compile-service';
import type { LiveSession } from './live-compile-session';
import {
  NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, describeSections, requestedSections, type SectionCoverage,
} from '../../scripts/verifier-sections.mjs';

export interface InteractionInspection extends DemoInspection {
  /** Detach/reattach the same native Control, preserving the React root and state. */
  surfaceAttached(attached: boolean): void;
  profile(enabled: boolean): void;
  takeProfile(): { js: RendererProfile; native: NativeProfile };
  /** Render the F4 benchmark fixture in place of the app. */
  benchmark(props: BenchmarkProps): void;
  /** Render a page in place of the app: the pass-through HUD, the pointer lab. */
  showLab(name: LabName): void;
  /** One page of the layout utilities lab, bare at the root's corner so that its rectangles are the page's own (`verify-layout-utilities.ts`). */
  showLayoutUtilities(page: LayoutUtilitiesPage): void;
  /** A lab compiled from its source, mounted and kept up to date as the source changes (the `live-compile` section). */
  openLiveSession(labId: string, exportName: string): LiveSession;
  /** The page's live-compile service and the hooks that try it (`verify-live-compile.ts`, docs/tracks/live-compile-async.md). */
  liveCompile(): ExtensionHost;
  restartLiveCompile(): void;
  holdLiveCompileThreads(count: number): number;
  releaseLiveCompileThreads(): void;
  /** The labs in the navigator's order. */
  labs(): readonly { readonly id: string; readonly title: string; readonly kind: string }[];
  showPaintPage(page: string): void;
  /** The filters lab, rendered again with new props (plan Phase V1). */
  showFilters(props: FiltersLabProps): void;
  /** One page of the text styles lab, and the lines of a text as the native layout has them (`ReactUiRoot.getTextLines`). */
  showTextStyles(page: string): void;
  textLines(testID: string): unknown;
  /** One page of the rich text lab, or a file of highlighted lines (`verify-rich-text.ts`). */
  showRichText(props: RichTextLabProps): void;
  /** The font fallback lab, with one of its samples (`verify-font-fallback.ts`). */
  showFontSlices(props: FontSlicesLabProps): void;
  /** The lab navigator in place of the app, with `extraLabs` listed after the demo's own. */
  showNavigator(options?: NavigatorOptions): void;
  /** The geometry queries of the text with a test id: where its caret is at an offset, what a point lands on, what a range covers (`verify-code-editor.ts`). */
  textCaret(testID: string, offset: number, side: 'before' | 'after'): LayoutRect | null;
  textOffsetAt(testID: string, x: number, y: number): { readonly offset: number; readonly side: 'before' | 'after' } | null;
  textRanges(testID: string, start: number, end: number): LayoutRect[] | null;
  /** What Godot draws behind the root: two flat colours, a lit box in 3D, or nothing. */
  godotContent(kind: 'none' | '2d' | '3d'): void;
  /** Scale the root's Control. */
  scaleSurface(factor: number): void;
  mirrorSurface(on: boolean): void;
  shiftCanvas(x: number, y: number): void;
  /** Scroll a scroll container to `top` through the programmatic path. */
  scrollTo(testID: string, top: number): void;
  pointerCancels(): number;
  /** How many `wheel` events (ticks and pans) JS has been shown. */
  wheelEvents(): number;
  rootKeys(): string[];
  resetRootKeys(): void;
  resetPointerCancels(): void;
  restoreDemo(): void;
  passthrough(): PassthroughCounts;
  resetPassthrough(): void;
  /** Whether the engine's `Input` has this key (a `Key` value) down. */
  keyPressed(keycode: number): boolean;
  /** Whether key chords that nothing in the root claims go to the browser (Web only; nothing happens elsewhere). */
  setKeyPassthrough(enabled: boolean): void;
  /** The tags of the focused element and its ancestors, the element first; empty when nothing is focused. */
  focusedPath(): number[];
  /** Whether native would act on this DOM key if it were pressed now: `code`, `key` and the shift, ctrl, alt and meta keys. */
  claimsKeyChord(code: string, key: string, shift: boolean, ctrl: boolean, alt: boolean, meta: boolean): boolean;
  cursorShapeAt(x: number, y: number): Control.CursorShape;
  surfaceHasFocus(): boolean;
  /** The rectangle the root handle's `getRect()` reports: a native query for node 0, the root. */
  rootRect(): LayoutRect | undefined;
  /** Whether the root asks for `process()` frames and for `_input` (native's one decision, `update_process`). */
  surfaceProcessing(): boolean;
  surfaceProcessingInput(): boolean;
  grabSurfaceFocus(): void;
  bareSurfaceHasFocus(): boolean;
  offsetSurface(x: number, y: number): void;
  /** Resize the root's Control, as the owner does when the window changes size. */
  resizeSurface(width: number, height: number): void;
  activity(): NativeActivity;
  /** Deliver the notification the window system sends when the window loses OS focus. */
  simulateWindowFocusLoss(): void;
  /** The document's text selection, as `root.getSelection()` answers it. */
  selection(): UISelection | undefined;
  /** The handles and edit menu of the selection a touch made, as `root.getTouchSelection()` answers it. */
  touchSelection(): NativeTouchSelection | undefined;
  /** Where the caret of text input `testID` is with the caret at `offset`; it puts the caret there (a measurement). */
  inputCaretAt(testID: string, offset: number): LayoutRect | null;
  /** `selectionchange` events the root's own listener saw since the last reset. */
  selectionChanges(): number;
  resetSelectionChanges(): void;
  /** The selection lab's commits: change the text of its live line, and remove its tail paragraph. */
  changeSelectionLiveText(): void;
  removeSelectionTail(): void;
  insertSelectionLine(): void;
  /** Make the lab's counter shorter, "1000" to "999". */
  shrinkSelectionCounter(): void;
}

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
const GEOMETRY_TOLERANCE = 2;
const DISPATCH_SAMPLES = 40;
// Hover paint of the crossing panel's parent: slate-100 at rest, slate-200 while hovered.
const CHAIN_PARENT_REST = '#f1f5f9';
const CHAIN_PARENT_HOVER = '#e2e8f0';
const FAR_CORNER = new Vector2(1, 1);
/** Inside a button's border box but outside its label. */
const POINTER_PADDING_INSET = 4;
/** More than the click-count slop (4 px), so a second click there is not part of the same sequence. */
const CLICK_SLOP_BREAKER_PX = 10;
/** How far outside the window the knob test drags: beyond the root and the window itself. */
const OUTSIDE_THE_ROOT_PX = 300;
/** How far inside and outside the pad's label edge a click's press and release are, and the page corner that is bare. */
const CLICK_EDGE_PX = 2;
const BARE_CORNER_PX = 4;
/** The focus ring's colour (`FOCUS_RING_COLOR` in native/lib.rs) and how far a raster may stray. */
const FOCUS_RING_COLOR = new Color(0.49, 0.66, 1.0);
const FOCUS_RING_TOLERANCE = 0.02;
/** The ring is a 2px inset stroke, so one pixel inside an element's left edge is on it. */
const FOCUS_RING_PROBE_INSET = 1;
/** The Activate button's paint while a key holds it (`active:bg-indigo-800`) and at rest (`bg-indigo-600`). */
const ACTIVATE_ACTIVE_COLOR = '#3730a3';
const ACTIVATE_REST_COLOR = '#4f46e5';
/** The card's paint when its focus is a keyboard focus (`focus-visible:bg-amber-100`) and at rest. */
const CARD_FOCUS_VISIBLE_COLOR = '#fef3c7';
const CARD_REST_COLOR = '#ffffff';
/** Far more than the lab has tab stops: a loop that reaches this is a bug, not slow input. */
const MAX_TAB_STEPS = 40;
/** The pad's paint at rest: indigo-50 (`hover:` is indigo-100). */
const PAD_REST_COLOR = '#eef2ff';
/** The touch indices of the multi-touch test and the pointer ids they get (plan: base 2). */
const FIRST_TOUCH = 0;
const SECOND_TOUCH = 1;
const FIRST_TOUCH_ID = 2;
const SECOND_TOUCH_ID = 3;
/** The grid step when looking for a point no HUD control covers. */
const EMPTY_POINT_SEARCH_STEP = 24;
/** Where the root is moved inside the window to tell root-local from viewport coordinates. */
const SURFACE_OFFSET = new Vector2(50, 30);
/** The positioning lab's paint (Tailwind colours of its classes) and how far a raster pixel may stray from them. */
const STACK_A = '#6366f1';
const STACK_B = '#10b981';
const STACK_C = '#f59e0b';
const CLIP_CHILD = '#f43f5e';
const FIXED_BOX = '#4338ca';
const POPOVER_FILL = '#fffbeb';
const LATER_FILL = '#4f46e5';
const PAGE_FILL = '#f8fafc';
const PAINT_TOLERANCE = 0.02;
/**
 * Points in a 128 x 64 cell of the lab, relative to its top-left corner, that the red box (100 px right and 40 px
 * down, 64 x 48) covers: inside the cell, past its right edge but still left of the next cell, and below its bottom edge
 * (and above the next section).
 */
const CELL_CHILD_INSIDE = new Vector2(110, 50);
const CELL_CHILD_BEYOND_RIGHT = new Vector2(140, 50);
const CELL_CHILD_BEYOND_BOTTOM = new Vector2(110, 70);
/** A probe this far inside a popover's left edge is on its padding, where it paints its own fill. */
const POPOVER_PADDING_PROBE_PX = 3;
/** The gap between the lab's menu button and the popover, and how far the popover must reach below the card to prove it is not clipped. */
const POPOVER_GAP_PX = 4;
const POPOVER_OVERHANG_PX = 40;
/** The fixed box sits 8 px from the viewport's right and bottom edges and is 64 x 32. */
const FIXED_BOX_INSET = 8;
const FIXED_BOX_SIZE = new Vector2(64, 32);
/** A trackpad pan in wheel ticks, to check a gesture reaches JS with its own deltas. */
const PAN_DELTA = new Vector2(0.5, -2);

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

function get(api: DemoInspection, id: string): NativeSnapshotNode {
  const node = api.find(id);
  assert(node, `Missing test target ${id}`);
  return node;
}

function text(api: DemoInspection, id: string): string {
  const snapshot = api.snapshot();
  const collect = (node: NativeSnapshotNode): string => node.text + node.children.map(childID => {
    const child = snapshot.nodes.find(candidate => candidate.id === childID);
    assert(child, `Missing native child ${childID}`);
    return collect(child);
  }).join('');
  return collect(get(api, id));
}

function point(api: DemoInspection, id: string): Vector2 {
  const {rect} = get(api, id);
  assert(rect.width > 0 && rect.height > 0, `Target ${id} is hidden`);
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function pointer(position: Vector2, pressed: boolean): void {
  const event = new InputEventMouseButton();
  event.position = position;
  event.globalPosition = position;
  event.buttonIndex = MouseButton.MouseButtonLeft;
  event.pressed = pressed;
  parseVerifierEvent(event);
}

const BUTTON_MASKS: Readonly<Partial<Record<MouseButton, number>>> = {
  [MouseButton.MouseButtonLeft]: MouseButtonMask.MouseButtonMaskLeft,
  [MouseButton.MouseButtonRight]: MouseButtonMask.MouseButtonMaskRight,
  [MouseButton.MouseButtonMiddle]: MouseButtonMask.MouseButtonMaskMiddle,
};

/** A press or release of any button, with the button mask a real device reports. */
function mouseButton(position: Vector2, button: MouseButton, pressed: boolean, modifiers: { shift?: boolean } = {}): void {
  const event = new InputEventMouseButton();
  event.position = position;
  event.globalPosition = position;
  event.buttonIndex = button;
  event.pressed = pressed;
  event.shiftPressed = modifiers.shift === true;
  event.buttonMask = pressed ? BUTTON_MASKS[button] ?? 0 : 0;
  parseVerifierEvent(event);
}

/** A touch, injected from the verifier's own device like every verifier event, which Godot also translates to an emulated mouse event. */
function touch(index: number, position: Vector2, pressed: boolean, canceled = false): void {
  const event = new InputEventScreenTouch();
  event.index = index;
  event.position = position;
  event.pressed = pressed;
  event.canceled = canceled;
  parseVerifierEvent(event);
}

function touchDrag(index: number, position: Vector2, relative: Vector2): void {
  const event = new InputEventScreenDrag();
  event.index = index;
  event.position = position;
  event.relative = relative;
  parseVerifierEvent(event);
}

interface KeySpec {
  keycode: Key;
  /** The character the key types, if any (a real device reports it; the helper has to say). */
  unicode?: number;
  shift?: boolean;
  ctrl?: boolean;
  /** The Command key on macOS. */
  meta?: boolean;
  echo?: boolean;
}

function keyEvent(spec: KeySpec, pressed: boolean): void {
  const event = new InputEventKey();
  event.keycode = spec.keycode;
  event.physicalKeycode = spec.keycode;
  event.keyLabel = spec.keycode;
  event.unicode = spec.unicode ?? 0;
  event.pressed = pressed;
  event.echo = spec.echo === true;
  event.shiftPressed = spec.shift === true;
  event.ctrlPressed = spec.ctrl === true;
  event.metaPressed = spec.meta === true;
  parseVerifierEvent(event);
}

/** Press and release a key (with the character it types, so DOM `key` has it). */
async function tap(spec: KeySpec): Promise<void> {
  keyEvent(spec, true);
  await settle();
  keyEvent(spec, false);
  await settle();
}

function move(position: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = position;
  event.globalPosition = event.position;
  parseVerifierEvent(event);
}

async function wheel(position: Vector2, button: MouseButton, modifiers: { shift?: boolean; ctrl?: boolean } = {}): Promise<void> {
  move(position);
  await settle();
  // A real wheel tick is a press followed at once by a release.
  for (const pressed of [true, false]) {
    const event = new InputEventMouseButton();
    event.position = position;
    event.globalPosition = position;
    event.buttonIndex = button;
    event.pressed = pressed;
    event.shiftPressed = modifiers.shift === true;
    event.ctrlPressed = modifiers.ctrl === true;
    parseVerifierEvent(event);
  }
  await settle();
}

async function pan(position: Vector2, delta: Vector2): Promise<void> {
  move(position);
  await settle();
  const event = new InputEventPanGesture();
  event.position = position;
  event.delta = delta;
  parseVerifierEvent(event);
  await settle();
}

async function keyPress(keycode: Key, shift = false): Promise<void> {
  for (const pressed of [true, false]) {
    const event = new InputEventKey();
    event.keycode = keycode;
    event.pressed = pressed;
    event.shiftPressed = shift;
    parseVerifierEvent(event);
    await settle();
  }
}

async function hover(api: DemoInspection, id: string): Promise<void> {
  move(point(api, id));
  await settle();
}

async function click(api: DemoInspection, id: string): Promise<void> {
  await hover(api, id);
  const position = point(api, id);
  pointer(position, true);
  await settle();
  pointer(position, false);
  await settle();
}

/** An absolute or fixed element is taken out of its parent's flow: it may overlap its siblings and leave its parent. */
function isOutOfFlow(node: NativeSnapshotNode): boolean {
  return node.style.position === 'absolute' || node.style.position === 'fixed';
}

/** The ids of every node below a scroll container: its content reaches past it and the window by design. */
function scrolledContent(snapshot: NativeSnapshot): Set<number> {
  const content = new Set<number>();
  const collect = (id: number): void => {
    for (const child of snapshot.nodes.find(candidate => candidate.id === id)?.children ?? []) {
      content.add(child);
      collect(child);
    }
  };
  for (const node of snapshot.nodes) if (node.scroll !== null) collect(node.id);
  return content;
}

/**
 * Measures actual Taffy output, including sibling separation and viewport clipping. `overflowing` are elements
 * that are meant to extend beyond their parent (a slider's thumb is taller than its track).
 */
function geometry(snapshot: NativeSnapshot, overflowing: ReadonlySet<number> = new Set()): void {
  const content = scrolledContent(snapshot);
  for (const node of snapshot.nodes) {
    const r = node.rect;
    if (r.width === 0 || r.height === 0 || content.has(node.id) || overflowing.has(node.id)) continue;
    assert(r.x >= -GEOMETRY_TOLERANCE && r.y >= -GEOMETRY_TOLERANCE, `Node ${node.id} escapes top/left`);
    assert(r.x + r.width <= snapshot.width + GEOMETRY_TOLERANCE, `Node ${node.id} escapes right: ${JSON.stringify(r)}`);
    assert(r.y + r.height <= snapshot.height + GEOMETRY_TOLERANCE, `Node ${node.id} escapes bottom: ${JSON.stringify(r)}`);
    // What a scroll container holds may reach past it; that is what scrolling is for.
    if (node.scroll !== null) continue;
    const children = node.children.map(id => snapshot.nodes.find(candidate => candidate.id === id));
    for (let i = 0; i < children.length; i++) {
      const first = children[i];
      if (!first || first.rect.width === 0 || first.rect.height === 0 || isOutOfFlow(first)) continue;
      const a = first.rect;
      assert(overflowing.has(first.id) || (a.x >= r.x - GEOMETRY_TOLERANCE && a.y >= r.y - GEOMETRY_TOLERANCE &&
        a.x + a.width <= r.x + r.width + GEOMETRY_TOLERANCE &&
        a.y + a.height <= r.y + r.height + GEOMETRY_TOLERANCE),
      `Child ${first.id} (${String(first.props.testID ?? first.kind)}) escapes parent ${node.id} (${String(node.props.testID ?? node.kind)}): ${JSON.stringify(a)} in ${JSON.stringify(r)}`);
      for (let j = i + 1; j < children.length; j++) {
        const second = children[j];
        if (!second || second.rect.width === 0 || second.rect.height === 0 || isOutOfFlow(second)) continue;
        const b = second.rect;
        const overlapX = Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);
        const overlapY = Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
        assert(overlapX <= GEOMETRY_TOLERANCE || overlapY <= GEOMETRY_TOLERANCE,
          `Siblings ${first.id}/${second.id} overlap`);
      }
    }
  }
}

function probeValue(label: string, line: string): { frame: number; focused: number | null } {
  const match = /^(?:down|focus) frame=(\d+) focused=(\d+|none)$/.exec(line);
  assert(match, `${label} probe text is malformed: ${line}`);
  const [, frame = '', focused = ''] = match;
  return { frame: Number(frame), focused: focused === 'none' ? null : Number(focused) };
}

interface TimingSummary {
  samples: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  meanMs: number;
}

function summarize(durations: number[]): TimingSummary {
  assert(durations.length > 0, 'No dispatch timing samples were recorded');
  const sorted = [...durations].sort((a, b) => a - b);
  const at = (fraction: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    samples: sorted.length, minMs: sorted[0] ?? 0, p50Ms: at(0.5), p95Ms: at(0.95),
    maxMs: sorted[sorted.length - 1] ?? 0, meanMs: mean,
  };
}

/**
 * Press `id` `DISPATCH_SAMPLES` times and record how long the JS side spent in the one synchronous
 * dispatch each press causes: the first `events` sample after the press is the cancelable
 * `pointerdown` that native waits on.
 */
async function measureSynchronousDispatch(api: InteractionInspection, id: string): Promise<TimingSummary> {
  const position = point(api, id);
  move(position);
  await settle();
  api.takeProfile();
  const durations: number[] = [];
  for (let sample = 0; sample < DISPATCH_SAMPLES; sample++) {
    pointer(position, true);
    await settle();
    const first = api.takeProfile().js.samples.find(entry => entry.kind === 'events');
    assert(first && first.kind === 'events', `Press ${sample} on ${id} recorded no dispatch sample`);
    durations.push(first.durationMs);
    pointer(position, false);
    await settle();
    api.takeProfile();
  }
  return summarize(durations);
}

interface PadTally {
  downs: { mouse: number; touch: number };
  ids: number[];
  clicks: number[];
  doubleClicks: number;
  auxClicks: number;
  contextMenus: number;
  cancels: number;
}

function padTally(api: DemoInspection): PadTally {
  const match = /^down mouse (\d+) touch (\d+), ids ([\d,]+|none), clicks ([\d,]+|none), dbl (\d+), aux (\d+), ctx (\d+), cancel (\d+)$/.exec(text(api, 'pad-tally'));
  assert(match, `Malformed pad tally: ${text(api, 'pad-tally')}`);
  const list = (value: string | undefined) => value === undefined || value === 'none' ? [] : value.split(',').map(Number);
  return {
    downs: { mouse: Number(match[1]), touch: Number(match[2]) }, ids: list(match[3]), clicks: list(match[4]),
    doubleClicks: Number(match[5]), auxClicks: Number(match[6]), contextMenus: Number(match[7]), cancels: Number(match[8]),
  };
}

/** Every `kb-` element in document order that Tab stops on: enabled buttons and `tabIndex={0}` elements. */
function expectedTabOrder(api: DemoInspection): string[] {
  const snapshot = api.snapshot();
  const byId = new Map(snapshot.nodes.map(node => [node.id, node]));
  const order: string[] = [];
  const visit = (id: number): void => {
    const node = byId.get(id);
    assert(node, `Missing native node ${id}`);
    const testID = node.props.testID;
    const tabIndex = node.props.tabIndex;
    const tabbable = (node.kind === 'button' && node.props.disabled !== true && tabIndex !== -1) || tabIndex === 0;
    if (typeof testID === 'string' && testID.startsWith('kb-') && tabbable) order.push(testID);
    node.children.forEach(visit);
  };
  byId.get(0)?.children.forEach(visit);
  return order;
}

const HUD_TARGETS = [
  'hud-inventory', 'hud-map', 'hud-help', 'hud-lock', 'hud-panel', 'hud-wheel-consume', 'hud-wheel-pass',
] as const;

/** A point inside the window that none of the HUD's pointer targets covers. */
function emptyPoint(api: DemoInspection): Vector2 {
  const snapshot = api.snapshot();
  const rects = HUD_TARGETS.map(id => get(api, id).rect);
  for (let y = EMPTY_POINT_SEARCH_STEP; y < snapshot.height; y += EMPTY_POINT_SEARCH_STEP) {
    for (let x = EMPTY_POINT_SEARCH_STEP; x < snapshot.width; x += EMPTY_POINT_SEARCH_STEP) {
      if (!rects.some(r => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height)) return new Vector2(x, y);
    }
  }
  throw new Error('The HUD covers the whole window; there is no pass-through point to test');
}

function counts(api: InteractionInspection): PassthroughCounts {
  return api.passthrough();
}

/**
 * Plan I1: the root cooperates with Godot. Empty space and `pointer-events: none` regions belong to
 * the Controls underneath; keys, Tab and wheel ticks belong to the game unless React used them.
 */
async function verifyGodotCooperation(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  // The root takes no key focus when it enters the tree: only its owner or a focused element does.
  assert(!api.bareSurfaceHasFocus(), 'A root that has just entered the tree must not steal key focus');

  api.showLab('hud');
  await settle();
  api.resetPassthrough();
  api.grabSurfaceFocus();
  await settle();
  assert(api.surfaceHasFocus(), 'The owner can give the root key focus');
  await capture('09-passthrough-hud');
  const status = () => text(api, 'hud-status');
  const baseline = status();
  const empty = emptyPoint(api);

  // A press where only `pointer-events: none` elements lie goes to the Control behind the root, and
  // on to the game; React sees nothing.
  move(empty);
  await settle();
  assert(api.snapshot().hovered === null, `Nothing is hovered over a pass-through region: ${api.snapshot().hovered}`);
  pointer(empty, true);
  await settle();
  pointer(empty, false);
  await settle();
  let seen = counts(api);
  assert(seen.backdropPresses === 1, `The Control behind the root saw the press: ${JSON.stringify(seen)}`);
  assert(seen.unhandledPresses === 1, `The game's _unhandled_input saw the press: ${JSON.stringify(seen)}`);
  assert(status() === baseline, `No React handler ran for a pass-through press: ${status()}`);
  assert(api.cursorShapeAt(empty.x, empty.y) === Control.CursorShape.CursorArrow, 'Over nothing the cursor is the arrow');

  // The button inside the pass-through region takes pointers, and keeps them from the game.
  await hover(api, 'hud-map');
  const hoveredId = api.snapshot().hovered;
  assert(hoveredId !== null && (hoveredId === get(api, 'hud-map').id || get(api, 'hud-map').children.includes(hoveredId)),
    `Hover reaches an auto element inside a none region: ${hoveredId}`);
  await click(api, 'hud-inventory');
  seen = counts(api);
  assert(seen.backdropPresses === 1 && seen.unhandledPresses === 1, `A button press stays in React: ${JSON.stringify(seen)}`);
  assert(status().startsWith('inventory 1,'), `The button handled its click: ${status()}`);

  // An element with pointer-events none inside an auto one is never the target; the auto one is.
  await click(api, 'hud-panel-label');
  assert(status().includes('panel 1, label 0'), `The panel, not its none label, is the target: ${status()}`);
  assert(text(api, 'hud-pointer').startsWith('last panel press '), 'The panel saw the press');
  // Pressing something that cannot take focus clears element focus and hands key focus back: the
  // press itself still clicked, so the release did not cancel it.
  assert(api.snapshot().focused === null, 'A press on a non-focusable element clears element focus');
  assert(!api.surfaceHasFocus(), 'A press that leaves no element focused releases the root\'s key focus');

  // With no element focused and the root unfocused, every key belongs to the game.
  await keyPress(Key.KeyW);
  await keyPress(Key.KeyTab);
  seen = counts(api);
  assert(seen.unhandledKeys[Key.KeyW] === 1, `W reaches _unhandled_input: ${JSON.stringify(seen.unhandledKeys)}`);
  assert(seen.unhandledKeys[Key.KeyTab] === 1 && api.snapshot().focused === null,
    `Tab belongs to the game while the root has no key focus: ${JSON.stringify(seen.unhandledKeys)}`);

  // The owner gives the root key focus with no element focused: W still reaches the game, Tab does
  // not because it moved focus.
  api.grabSurfaceFocus();
  await settle();
  api.resetRootKeys();
  await tap({ keycode: Key.KeyW, unicode: 'w'.charCodeAt(0) });
  assert(counts(api).unhandledKeys[Key.KeyW] === 2, 'W reaches the game while the root has focus and no element is focused');
  assert(api.rootKeys().join(',') === 'w', `With no element focused a key goes to root listeners, as target 0: ${api.rootKeys().join(',')}`);
  await keyPress(Key.KeyTab);
  assert(api.snapshot().focused === get(api, 'hud-inventory').id, `Tab focuses the first button: ${api.snapshot().focused}`);
  assert(counts(api).unhandledKeys[Key.KeyTab] === 1, 'A Tab that moved focus is consumed');
  await keyPress(Key.KeyW);
  assert(counts(api).unhandledKeys[Key.KeyW] === 3, 'W still reaches the game after a React button took focus');
  await keyPress(Key.KeyTab);
  assert(api.snapshot().focused === get(api, 'hud-map').id, 'Tab moves to the next button');
  assert(counts(api).unhandledKeys[Key.KeyTab] === 1, 'Tab with an element focused is consumed too');
  await keyPress(Key.KeyEnter);
  assert(status().includes('map 1,'), `Enter activates the focused button: ${status()}`);
  assert(counts(api).unhandledKeys[Key.KeyEnter] === undefined, 'An activating Enter is consumed');
  await keyPress(Key.KeyTab, true);
  assert(api.snapshot().focused === get(api, 'hud-inventory').id, 'Shift+Tab moves back');
  await capture('10-hud-focus');

  // Nothing tabbable: Tab changes nothing, so it goes to the game.
  await click(api, 'hud-lock');
  assert(status().endsWith('locked true'), `The lock handled its click: ${status()}`);
  assert(api.snapshot().focused === null, 'Disabling the focused button removes focus');
  api.grabSurfaceFocus();
  await settle();
  await keyPress(Key.KeyTab);
  assert(api.snapshot().focused === null, 'A disabled button is not tabbable');
  assert(counts(api).unhandledKeys[Key.KeyTab] === 2, 'A Tab that moved nothing is not consumed');
  await click(api, 'hud-lock');
  assert(status().endsWith('locked false'), 'The buttons unlock');

  // Wheel: over empty space and over an element nobody handles it reaches the game; JS decides.
  const unhandledWheels = () => counts(api).unhandledWheels;
  const readout = () => text(api, 'hud-wheel-status');
  await wheel(empty, MouseButton.MouseButtonWheelDown);
  assert(unhandledWheels() === 1, 'A wheel tick over empty space reaches the game, once (the release is not a tick)');
  assert(readout().startsWith('consumed ticks 0, passed ticks 0'), `No React handler saw it: ${readout()}`);
  await wheel(point(api, 'hud-panel'), MouseButton.MouseButtonWheelUp);
  assert(unhandledWheels() === 2, 'A wheel tick over an element with no onWheel reaches the game');
  await wheel(point(api, 'hud-wheel-pass'), MouseButton.MouseButtonWheelRight);
  assert(unhandledWheels() === 3, 'A wheel tick a handler did not prevent reaches the game');
  assert(readout() === 'consumed ticks 0, passed ticks 1, last delta 1,0', `Wheel right is +x: ${readout()}`);
  await wheel(point(api, 'hud-wheel-consume'), MouseButton.MouseButtonWheelLeft);
  assert(unhandledWheels() === 3, 'A wheel tick whose handler called preventDefault is consumed');
  assert(readout() === 'consumed ticks 1, passed ticks 1, last delta -1,0', `Wheel left is -x: ${readout()}`);
  await wheel(point(api, 'hud-wheel-consume'), MouseButton.MouseButtonWheelUp);
  assert(readout().endsWith('last delta 0,-1'), `Wheel up is -y: ${readout()}`);
  await wheel(point(api, 'hud-wheel-consume'), MouseButton.MouseButtonWheelDown);
  assert(readout().endsWith('last delta 0,1'), `Wheel down is +y: ${readout()}`);
  // A trackpad pan reaches JS as a wheel with its own deltas. Godot's Input dispatches each gesture
  // twice (`Input::_parse_input_event_impl` sends gestures once explicitly and again with every
  // event), so a parsed pan is seen more than once by everything; what must hold is that JS and the
  // game see the same number of them, and that a prevented pan never reaches the game.
  const ticks = () => {
    const match = /consumed ticks (\d+), passed ticks (\d+)/.exec(readout());
    assert(match, `Malformed wheel readout: ${readout()}`);
    return { consumed: Number(match[1]), passed: Number(match[2]) };
  };
  const pansBefore = counts(api).unhandledPans;
  await pan(empty, PAN_DELTA);
  assert(counts(api).unhandledPans > pansBefore, 'A pan over empty space reaches the game');
  let before = { ...ticks(), pans: counts(api).unhandledPans };
  await pan(point(api, 'hud-wheel-consume'), PAN_DELTA);
  assert(readout().endsWith(`last delta ${PAN_DELTA.x},${PAN_DELTA.y}`), `A trackpad pan reaches JS as a wheel: ${readout()}`);
  assert(ticks().consumed > before.consumed, 'The consuming element saw the pan');
  assert(counts(api).unhandledPans === before.pans, 'A prevented pan is consumed');
  before = { ...ticks(), pans: counts(api).unhandledPans };
  await pan(point(api, 'hud-wheel-pass'), PAN_DELTA);
  const seenByJs = ticks().passed - before.passed;
  assert(seenByJs > 0, `An unprevented pan reaches the element's handler: ${readout()}`);
  assert(counts(api).unhandledPans - before.pans === seenByJs, 'Every pan JS declined reaches the game');

  // The cursor follows the element under the pointer, and inherits from its parent.
  const shapeAt = (id: string) => {
    const at = point(api, id);
    return api.cursorShapeAt(at.x, at.y);
  };
  assert(shapeAt('hud-map') === Control.CursorShape.CursorPointingHand, 'cursor-pointer shows the pointing hand');
  const mapRect = get(api, 'hud-map').rect;
  const padding = api.cursorShapeAt(mapRect.x + POINTER_PADDING_INSET, mapRect.y + POINTER_PADDING_INSET);
  assert(padding === Control.CursorShape.CursorPointingHand, 'The padding of a cursor-pointer button shows it too');
  const labelId = get(api, 'hud-map').children[0];
  assert(labelId !== undefined, 'The button has a label child');
  const label = api.snapshot().nodes.find(candidate => candidate.id === labelId);
  assert(label, `Missing the button's label node ${labelId}`);
  const labelCenter = new Vector2(label.rect.x + label.rect.width / 2, label.rect.y + label.rect.height / 2);
  assert(api.cursorShapeAt(labelCenter.x, labelCenter.y) === Control.CursorShape.CursorPointingHand,
    'The button\'s label inherits the cursor');
  assert(shapeAt('hud-help') === Control.CursorShape.CursorHelp, 'cursor-help shows the help cursor');
  assert(shapeAt('hud-panel') === Control.CursorShape.CursorMove, 'cursor-move shows the move cursor');
  assert(shapeAt('hud-inventory') === Control.CursorShape.CursorArrow, 'A button with no cursor shows the arrow');
  const panelLabel = point(api, 'hud-panel-label');
  assert(api.cursorShapeAt(panelLabel.x, panelLabel.y) === Control.CursorShape.CursorMove,
    'Over a pointer-events-none label the cursor is the panel\'s');

  // End to end: Godot asks the root for its cursor as the pointer moves and applies it to the window.
  await hover(api, 'hud-map');
  assert(DisplayServer.cursorGetShape() === DisplayServer.CursorShape.CursorPointingHand,
    `Moving over a cursor-pointer button sets the window cursor: ${DisplayServer.cursorGetShape()}`);
  await hover(api, 'hud-help');
  assert(DisplayServer.cursorGetShape() === DisplayServer.CursorShape.CursorHelp, 'Moving to cursor-help changes it');
  move(empty);
  await settle();
  assert(DisplayServer.cursorGetShape() === DisplayServer.CursorShape.CursorArrow, 'Leaving the HUD for the game restores the arrow');

  // viewportX/viewportY are canvas coordinates; x/y stay root-local.
  api.offsetSurface(SURFACE_OFFSET.x, SURFACE_OFFSET.y);
  await settle();
  const panelPoint = point(api, 'hud-panel');
  const inViewport = new Vector2(panelPoint.x + SURFACE_OFFSET.x, panelPoint.y + SURFACE_OFFSET.y);
  move(inViewport);
  await settle();
  pointer(inViewport, true);
  await settle();
  pointer(inViewport, false);
  await settle();
  const expected = `last panel press ${panelPoint.x},${panelPoint.y} viewport ${inViewport.x},${inViewport.y}`;
  assert(text(api, 'hud-pointer') === expected, `Pointer events carry root-local and canvas coordinates: ${text(api, 'hud-pointer')} != ${expected}`);
  api.offsetSurface(0, 0);
  await settle();

  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

/**
 * Plan I2: the pointer model. Every mouse button, click counting, touch pointers with the engine's
 * emulation left on, multi-touch, cancel, capture, and the root leaving the tree mid-press.
 */
async function verifyPointers(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  assert(ProjectSettings.getSetting('input_devices/pointing/emulate_mouse_from_touch') === true,
    'The pointer lab only proves the emulation is ignored while the engine emulates mouse events from touch');
  const reset = async () => {
    // A fresh lab: the pad's log and counters start empty.
    api.showLab('hud');
    await settle();
    api.showLab('pointers');
    await settle();
  };
  await reset();
  const lines = () => text(api, 'pad-log').split('\n').filter(line => line !== '');
  const pad = point(api, 'pad');
  const snapshotPointer = (id: number) => api.snapshot().pointers.find(entry => entry.id === id);
  await capture('11-pointers');

  // Right and middle buttons: pointerdown, then contextmenu on the right press, pointerup, auxclick;
  // never a click.
  move(pad);
  await settle();
  mouseButton(pad, MouseButton.MouseButtonRight, true);
  await settle();
  mouseButton(pad, MouseButton.MouseButtonRight, false);
  await settle();
  assert(lines().join('|') === 'pointerenter mouse#1 b-1 bs0 d0|pointerdown mouse#1 b2 bs2 d0|contextmenu mouse#1 b2 bs2 d0|pointerup mouse#1 b2 bs0 d0|auxclick mouse#1 b2 bs0 d1',
    `A right click is pointerdown, contextmenu, pointerup, auxclick: ${lines().join('|')}`);
  let seen = padTally(api);
  assert(seen.contextMenus === 1 && seen.auxClicks === 1 && seen.clicks.length === 0, `No click follows a right click: ${text(api, 'pad-tally')}`);
  mouseButton(pad, MouseButton.MouseButtonMiddle, true);
  mouseButton(pad, MouseButton.MouseButtonMiddle, false);
  await settle();
  assert(lines().slice(-3).join('|') === 'pointerdown mouse#1 b1 bs4 d0|pointerup mouse#1 b1 bs0 d0|auxclick mouse#1 b1 bs0 d1',
    `A middle click is an auxclick of button 1: ${lines().join('|')}`);
  seen = padTally(api);
  assert(seen.contextMenus === 1 && seen.auxClicks === 2 && seen.clicks.length === 0, 'A middle click is not a click and opens no menu');

  // Click counting: three quick presses count 1, 2, 3 with one dblclick, after the second.
  for (let press = 0; press < 3; press++) {
    mouseButton(pad, MouseButton.MouseButtonLeft, true);
    mouseButton(pad, MouseButton.MouseButtonLeft, false);
  }
  await settle();
  seen = padTally(api);
  assert(seen.clicks.join(',') === '1,2,3' && seen.doubleClicks === 1, `A triple click counts 1, 2, 3 with one dblclick: ${text(api, 'pad-tally')}`);
  assert(lines().filter(line => line.startsWith('dblclick')).join('|') === 'dblclick mouse#1 b0 bs0 d2', 'The dblclick carries detail 2');
  await capture('12-pointer-clicks');
  // A press after the interval starts a new sequence; so does one that is farther than the slop.
  await waitForNewClickSequence();
  mouseButton(pad, MouseButton.MouseButtonLeft, true);
  mouseButton(pad, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(padTally(api).clicks.join(',') === '1,2,3,1', `A click after the interval counts 1 again: ${text(api, 'pad-tally')}`);
  const nearby = new Vector2(pad.x + CLICK_SLOP_BREAKER_PX, pad.y);
  mouseButton(nearby, MouseButton.MouseButtonLeft, true);
  mouseButton(nearby, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(padTally(api).clicks.join(',') === '1,2,3,1,1', `A click beyond the slop starts a sequence: ${text(api, 'pad-tally')}`);

  // The click goes to the nearest common ancestor of the press and the release (UI Events): a press on the pad's label
  // that lifts on the pad itself clicks the pad, which a press and release on two different elements used to miss.
  const padLabel = api.snapshot().nodes.find(node => node.id === get(api, 'pad').children[0]);
  assert(padLabel && padLabel.rect.width > 0, 'The pad has a label of its own');
  const inLabel = new Vector2(padLabel.rect.x + CLICK_EDGE_PX, padLabel.rect.y + padLabel.rect.height / 2);
  const besideLabel = new Vector2(padLabel.rect.x - CLICK_EDGE_PX, inLabel.y);
  const padClicks = () => padTally(api).clicks.length;
  const clicksBeforeLabel = padClicks();
  mouseButton(inLabel, MouseButton.MouseButtonLeft, true);
  mouseButton(besideLabel, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(padClicks() === clicksBeforeLabel + 1, `A press on the label lifted on the pad clicks the pad: ${text(api, 'pad-tally')}`);
  mouseButton(besideLabel, MouseButton.MouseButtonLeft, true);
  mouseButton(inLabel, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(padClicks() === clicksBeforeLabel + 2, `and so does a press on the pad lifted on the label: ${text(api, 'pad-tally')}`);
  const bareCorner = new Vector2(BARE_CORNER_PX, BARE_CORNER_PX);
  mouseButton(inLabel, MouseButton.MouseButtonLeft, true);
  mouseButton(bareCorner, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(padClicks() === clicksBeforeLabel + 2, `Lifted over the lab's bare page, the common ancestor is the page, not the pad: ${text(api, 'pad-tally')}`);
  mouseButton(inLabel, MouseButton.MouseButtonLeft, true);
  mouseButton(new Vector2(api.snapshot().width + OUTSIDE_THE_ROOT_PX, inLabel.y), MouseButton.MouseButtonLeft, false);
  await settle();
  assert(padClicks() === clicksBeforeLabel + 2, `Lifted beyond the root, nothing is clicked: ${text(api, 'pad-tally')}`);

  // Capture: the knob follows a drag wherever it goes, outside itself and the root and the window.
  const track = get(api, 'knob-track');
  const middle = (value: number) => new Vector2(track.rect.x + value * track.rect.width, track.rect.y + track.rect.height / 2);
  const readout = () => text(api, 'knob-readout');
  move(middle(0.05));
  await settle();
  mouseButton(middle(0.05), MouseButton.MouseButtonLeft, true);
  await settle();
  assert(readout().includes('captured true'), `Pressing the knob captures the pointer: ${readout()}`);
  const mouse = snapshotPointer(1);
  assert(mouse?.down === true && mouse.capture?.target === track.id && !mouse.capture.implicit,
    `Native records the explicit capture: ${JSON.stringify(mouse)}`);
  const valueOf = () => Number(/value (\d+)/.exec(readout())?.[1]);
  move(middle(0.5));
  await settle();
  assert(Math.abs(valueOf() - 50) <= 10, `Dragging inside the track moves the knob: ${readout()}`);
  const beyondRight = new Vector2(api.snapshot().width + OUTSIDE_THE_ROOT_PX, track.rect.y - OUTSIDE_THE_ROOT_PX);
  move(beyondRight);
  await settle();
  assert(valueOf() === 100, `Outside the root, to the right, the knob is at its end: ${readout()}`);
  const beyondLeft = new Vector2(-OUTSIDE_THE_ROOT_PX, track.rect.y + OUTSIDE_THE_ROOT_PX);
  move(beyondLeft);
  await settle();
  assert(valueOf() === 0, `Outside the root, to the left, the knob is at its start: ${readout()}`);
  move(middle(0.75));
  await capture('13-knob-captured');
  assert(Math.abs(valueOf() - 75) <= 10, `And back inside it follows again: ${readout()}`);
  mouseButton(beyondRight, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(readout().includes('captured false'), `The knob saw the pointerup outside the root: ${readout()}`);
  assert(snapshotPointer(1)?.capture === null && snapshotPointer(1)?.down === false, 'The capture ended with the press');
  const movesAfter = readout();
  move(middle(0.2));
  await settle();
  assert(readout() === movesAfter, 'Without a press the knob ignores the pointer');

  // An idle pointer cannot be captured, and the error says why.
  await click(api, 'capture-bad');
  assert(text(api, 'capture-status').startsWith('setPointerCapture failed: pointer 1 is not active'),
    `Capturing a pointer that is up is an error: ${text(api, 'capture-status')}`);

  // Touch, with the engine translating it to mouse events as well: one pointer, never a mouse press.
  await reset();
  // The mouse is parked away from the pad, so any hover left on it afterwards would come from the touch.
  move(FAR_CORNER);
  await settle();
  assert(get(api, 'pad').style.backgroundColor === PAD_REST_COLOR, 'The pad is unhovered before the touch');
  const before = padTally(api);
  touch(FIRST_TOUCH, pad, true);
  await settle();
  touch(FIRST_TOUCH, pad, false);
  await settle();
  seen = padTally(api);
  assert(seen.downs.touch === before.downs.touch + 1 && seen.downs.mouse === before.downs.mouse,
    `A touch is one touch pointerdown and no mouse press: ${text(api, 'pad-tally')}`);
  assert(lines().join('|') === `pointerenter touch#${FIRST_TOUCH_ID} b-1 bs0 d0|pointerdown touch#${FIRST_TOUCH_ID} b0 bs1 d0|pointerup touch#${FIRST_TOUCH_ID} b0 bs0 d0|pointerleave touch#${FIRST_TOUCH_ID} b-1 bs0 d0|click touch#${FIRST_TOUCH_ID} b0 bs0 d1`,
    `A tap is enter, down, up, leave, click: ${lines().join('|')}`);
  assert(seen.ids.join(',') === String(FIRST_TOUCH_ID), `The first touch is pointer ${FIRST_TOUCH_ID}: ${text(api, 'pad-tally')}`);
  const afterTap = api.snapshot();
  const padNode = get(api, 'pad');
  assert(afterTap.hovered !== padNode.id && !padNode.children.includes(afterTap.hovered ?? -1), `A touch never hovers: ${afterTap.hovered}`);
  assert(padNode.style.backgroundColor === PAD_REST_COLOR, `No hover paint is left after a tap: ${padNode.style.backgroundColor}`);
  assert(afterTap.pointers.every(entry => entry.type === 'mouse'), 'A finished touch leaves no pointer record');
  await capture('14-pointer-touch-tap');
  // A finger that drifts from the label onto the pad within the slop taps the pad, as the mouse does.
  const clicksBeforeDrift = padClicks();
  touch(FIRST_TOUCH, inLabel, true);
  await settle();
  touchDrag(FIRST_TOUCH, besideLabel, new Vector2(-2 * CLICK_EDGE_PX, 0));
  await settle();
  touch(FIRST_TOUCH, besideLabel, false);
  await settle();
  assert(padClicks() === clicksBeforeDrift + 1, `A tap whose finger drifted from the label onto the pad clicks the pad: ${text(api, 'pad-tally')}`);

  // Two fingers: two pointers, each captured to where it went down, independent of one another.
  const knobPoint = middle(0.1);
  touch(FIRST_TOUCH, pad, true);
  touch(SECOND_TOUCH, knobPoint, true);
  await settle();
  const both = api.snapshot().pointers.filter(entry => entry.type === 'touch');
  assert(both.map(entry => entry.id).join(',') === `${FIRST_TOUCH_ID},${SECOND_TOUCH_ID}` && both.every(entry => entry.down),
    `Two touches are two pointers, both down: ${JSON.stringify(both)}`);
  const padNodes = [get(api, 'pad').id, ...get(api, 'pad').children];
  assert(both[0]?.capture?.implicit === true && padNodes.includes(both[0].capture.target),
    `A touch is captured, without asking, to the element it went down on (here the pad's label): ${JSON.stringify(both[0])}`);
  assert(both[1]?.capture?.implicit === false && both[1].capture.target === get(api, 'knob-track').id,
    `The knob's own capture replaces the implicit one: ${JSON.stringify(both[1])}`);
  assert(padTally(api).ids.join(',') === `${FIRST_TOUCH_ID}`, 'The pad only saw the finger that went down on it');
  touchDrag(SECOND_TOUCH, new Vector2(api.snapshot().width + OUTSIDE_THE_ROOT_PX, 0), new Vector2(OUTSIDE_THE_ROOT_PX, 0));
  await settle();
  assert(valueOf() === 100, `A finger moving the knob far outside the root is still captured by it: ${readout()}`);
  touch(SECOND_TOUCH, knobPoint, false);
  touch(FIRST_TOUCH, pad, false);
  await settle();
  assert(api.snapshot().pointers.every(entry => !entry.down), 'Both fingers are up');

  // A cancelled touch ends with pointercancel: no pointerup and no click.
  const beforeCancel = padTally(api);
  touch(FIRST_TOUCH, pad, true);
  await settle();
  touch(FIRST_TOUCH, pad, false, true);
  await settle();
  seen = padTally(api);
  assert(seen.cancels === beforeCancel.cancels + 1 && seen.clicks.length === beforeCancel.clicks.length,
    `A cancelled touch is a pointercancel and no click: ${text(api, 'pad-tally')}`);
  assert(!lines().slice(-4).some(line => line.startsWith('pointerup') || line.startsWith('click')),
    `Nothing but the cancel and the leave follows: ${lines().join('|')}`);

  // The root leaving the scene tree mid-press cancels the pointer.
  api.resetPointerCancels();
  move(pad);
  await settle();
  mouseButton(pad, MouseButton.MouseButtonLeft, true);
  await settle();
  api.surfaceAttached(false);
  await settle();
  assert(api.pointerCancels() === 1, `Leaving the tree while a button is down cancels the pointer: ${api.pointerCancels()}`);
  api.surfaceAttached(true);
  await settle();
  mouseButton(pad, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(!api.snapshot().pointers.some(entry => entry.down), 'No pointer is left down');
  assert(padTally(api).cancels >= 1, 'The pad saw the cancel too');

  // Plan D6: the window losing OS focus cancels a press in flight. A verifier window is isolated from the
  // window system (it cannot lose focus it never had), so the notification the engine would send is delivered
  // directly: the press ends with a pointercancel, and the release that follows clicks nothing.
  await reset();
  api.resetPointerCancels();
  const clicksBeforeFocusLoss = padTally(api).clicks.length;
  move(pad);
  await settle();
  mouseButton(pad, MouseButton.MouseButtonLeft, true);
  await settle();
  assert(api.snapshot().pressed !== null && snapshotPointer(1)?.down === true, 'The pad is pressed before the window loses focus');
  api.simulateWindowFocusLoss();
  await settle();
  assert(api.snapshot().pressed === null, `Focus loss clears the pressed element: ${api.snapshot().pressed}`);
  assert(api.pointerCancels() === 1, `Focus loss cancels the pointer for JS: ${api.pointerCancels()}`);
  assert(!api.snapshot().pointers.some(entry => entry.down), 'Focus loss leaves no pointer down');
  mouseButton(pad, MouseButton.MouseButtonLeft, false);
  await settle();
  assert(padTally(api).clicks.length === clicksBeforeFocusLoss, `The release after a focus loss clicks nothing: ${text(api, 'pad-tally')}`);

  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

/**
 * Plan I3: focus and keyboard. Tab follows document order, the ring and `:focus-visible` mark keyboard
 * focus only, key events carry DOM `key`/`code`/`repeat`, Enter and Space activate a button without
 * pointer events, a JS focus trap holds, and `focus()` follows (or forces) the input modality.
 */
async function verifyKeyboard(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  api.showLab('keyboard');
  await settle();
  api.grabSurfaceFocus();
  await settle();
  const testIDOf = (id: number | null): string => {
    if (id === null) return 'none';
    const node = api.snapshot().nodes.find(candidate => candidate.id === id);
    const testID = node?.props.testID;
    return typeof testID === 'string' ? testID : `#${id}`;
  };
  const focusedTestID = () => testIDOf(api.snapshot().focused);
  const ringOn = (testID: string): boolean => {
    const { rect } = get(api, testID);
    RenderingServer.forceDraw();
    const image = owner.getViewport()?.getTexture()?.getImage();
    assert(image, 'Native verification requires a rendered viewport');
    const color = image.getPixel(Math.floor(rect.x + FOCUS_RING_PROBE_INSET), Math.floor(rect.y + rect.height / 2));
    return Math.abs(color.r - FOCUS_RING_COLOR.r) <= FOCUS_RING_TOLERANCE &&
      Math.abs(color.g - FOCUS_RING_COLOR.g) <= FOCUS_RING_TOLERANCE && Math.abs(color.b - FOCUS_RING_COLOR.b) <= FOCUS_RING_TOLERANCE;
  };
  const tab = (shift = false) => tap({ keycode: Key.KeyTab, shift });
  /** Tab (or Shift+Tab) until `testID` has focus; a bound, not a retry: the order is known. */
  const tabTo = async (testID: string, shift = false): Promise<void> => {
    for (let step = 0; step <= MAX_TAB_STEPS && focusedTestID() !== testID; step++) await tab(shift);
    assert(focusedTestID() === testID, `Tab reaches ${testID}: ${focusedTestID()}`);
  };
  const keyLines = () => text(api, 'kb-log').split('\n').filter(line => line !== '');
  const focusLines = () => text(api, 'kb-focus-log').split('\n').filter(line => line !== '');

  // Tab stops on every enabled button and tabIndex 0 element, in document order, and wraps; not on a
  // disabled button, a tabIndex -1 element or a plain view. Shift+Tab walks it backwards.
  const stops = expectedTabOrder(api);
  assert(stops.length >= 6 && !stops.includes('kb-disabled') && !stops.includes('kb-skip') && stops.includes('kb-card'),
    `The lab has the tab stops the test needs: ${stops.join(',')}`);
  const forward: string[] = [];
  for (let step = 0; step < stops.length + 1; step++) {
    await tab();
    forward.push(focusedTestID());
  }
  assert(forward.join(',') === [...stops, stops[0]].join(','), `Tab visits the stops in document order and wraps: ${forward.join(',')} != ${stops.join(',')}`);
  const backward: string[] = [];
  for (let step = 0; step < stops.length; step++) {
    await tab(true);
    backward.push(focusedTestID());
  }
  assert(backward.join(',') === [...stops].reverse().join(','), `Shift+Tab walks it backwards from the first stop, wrapping to the last: ${backward.join(',')}`);

  // Tab follows the document, not creation order: two keyed buttons trade places and so does Tab.
  const stopsBefore = expectedTabOrder(api);
  await click(api, 'kb-swap');
  const stopsAfter = expectedTabOrder(api);
  assert(stopsAfter.join(',') !== stopsBefore.join(',') && stopsAfter.indexOf('kb-swap-b') < stopsAfter.indexOf('kb-swap-a'),
    `The swap changed the document order: ${stopsAfter.join(',')}`);
  api.grabSurfaceFocus();
  await tabTo(stopsAfter[0] ?? 'none');
  const swapped: string[] = [focusedTestID()];
  for (let step = 1; step < stopsAfter.length; step++) {
    await tab();
    swapped.push(focusedTestID());
  }
  assert(swapped.join(',') === stopsAfter.join(','), `After a reorder Tab follows the new document order: ${swapped.join(',')} != ${stopsAfter.join(',')}`);

  // Keyboard focus shows the ring and matches focus-visible, with no `focus:` style needed.
  api.grabSurfaceFocus();
  await tabTo('kb-plain');
  assert(api.snapshot().focusVisible && api.snapshot().modality === 'keyboard', 'Tab focus is a keyboard focus');
  assert(ringOn('kb-plain'), 'Tab onto a button with no focus rule paints the ring (a focus change that restyles nothing still paints)');
  const order = expectedTabOrder(api);
  await tab();
  assert(focusedTestID() === order[order.indexOf('kb-plain') + 1], `Tab continues in document order: ${focusedTestID()}`);
  await tabTo('kb-card');
  assert(ringOn('kb-card') && get(api, 'kb-card').style.backgroundColor === CARD_FOCUS_VISIBLE_COLOR,
    'Keyboard focus draws the ring and matches focus-visible:');
  const before = order[order.indexOf('kb-card') - 1];
  assert(focusLines().slice(-1).join('') === `focus related=${before} visible=true`,
    `focus names the element focus came from and that it is a keyboard focus: ${focusLines().join('|')}`);
  await capture('15-keyboard-ring');

  // A press focuses without the ring and without focus-visible; `focus:` still applies.
  await click(api, 'kb-skip');
  assert(focusedTestID() === 'kb-skip', `A press focuses an element with tabIndex -1: ${focusedTestID()}`);
  assert(focusLines().slice(-1).join('') === 'blur related=kb-skip visible=true', `blur names the element focus went to and keeps its own visibility: ${focusLines().join('|')}`);
  assert(!api.snapshot().focusVisible && api.snapshot().modality === 'pointer', 'Pointer focus is not a keyboard focus');
  assert(!ringOn('kb-skip'), 'A press paints no ring');
  await click(api, 'kb-card');
  assert(focusedTestID() === 'kb-card' && !ringOn('kb-card'), 'Pressing the card focuses it without the ring');
  const pressed = get(api, 'kb-card').style;
  assert(pressed.backgroundColor === CARD_REST_COLOR && pressed.borderColor === '#6366f1',
    `focus: applies to pointer focus, focus-visible: does not: ${JSON.stringify(pressed)}`);
  assert(focusLines().slice(-1).join('') === 'focus related=kb-skip visible=false', `A pointer focus says so: ${focusLines().join('|')}`);
  await capture('16-mouse-focus-no-ring');

  // Tab from a tabIndex -1 element continues from its place; keyboard use brings the ring back.
  await click(api, 'kb-skip');
  await tab();
  assert(focusedTestID() === 'kb-open', `Tab from a skipped element continues after it in document order: ${focusedTestID()}`);
  assert(api.snapshot().focusVisible && ringOn('kb-open'), 'and the ring is back');

  // Key events: DOM key and code, shift, and the repeats of a held key.
  await tabTo('kb-card', true);
  await tap({ keycode: Key.KeyA, unicode: 97 });
  keyEvent({ keycode: Key.KeyA, unicode: 65, shift: true }, true);
  await settle();
  keyEvent({ keycode: Key.KeyA, unicode: 65, shift: true, echo: true }, true);
  await settle();
  keyEvent({ keycode: Key.KeyA, unicode: 65, shift: true }, false);
  await settle();
  await tap({ keycode: Key.KeyLeft });
  await tap({ keycode: Key.KeyC, ctrl: true });
  assert(keyLines().join('|') === [
    'keydown key=a code=KeyA repeat=false', 'keyup key=a code=KeyA repeat=false',
    'keydown key=A code=KeyA repeat=false', 'keydown key=A code=KeyA repeat=true', 'keyup key=A code=KeyA repeat=false',
    'keydown key=ArrowLeft code=ArrowLeft repeat=false', 'keyup key=ArrowLeft code=ArrowLeft repeat=false',
    'keydown key=c code=KeyC repeat=false', 'keyup key=c code=KeyC repeat=false',
  ].slice(-6).join('|'), `Key events carry DOM key, code and repeat: ${keyLines().join('|')}`);

  // Enter clicks a button once and no pointer events are made up; Space holds the active style until
  // its release, and a held key's repeats do nothing more.
  await tabTo('kb-activate');
  const activate = () => text(api, 'kb-activate-status');
  assert(activate() === 'clicks 0, pointerdowns 0, last click none', `The button starts untouched: ${activate()}`);
  await tap({ keycode: Key.KeyEnter });
  assert(activate() === 'clicks 1, pointerdowns 0, last click type "" id 0 d0',
    `Enter is one keyboard click: pointer 0, no pointer type, no pointerdown: ${activate()}`);
  keyEvent({ keycode: Key.KeySpace, unicode: 32 }, true);
  await settle();
  assert(get(api, 'kb-activate').style.backgroundColor === ACTIVATE_ACTIVE_COLOR, `active: applies while Space is held: ${get(api, 'kb-activate').style.backgroundColor}`);
  assert(activate().startsWith('clicks 1,'), 'Nothing clicks until the key is released');
  keyEvent({ keycode: Key.KeySpace, unicode: 32, echo: true }, true);
  keyEvent({ keycode: Key.KeySpace, unicode: 32, echo: true }, true);
  await settle();
  assert(activate().startsWith('clicks 1,') && get(api, 'kb-activate').style.backgroundColor === ACTIVATE_ACTIVE_COLOR, 'A held key\'s repeats neither click nor release');
  keyEvent({ keycode: Key.KeySpace, unicode: 32 }, false);
  await settle();
  assert(activate() === 'clicks 2, pointerdowns 0, last click type "" id 0 d0', `Releasing Space clicks once: ${activate()}`);
  assert(get(api, 'kb-activate').style.backgroundColor === ACTIVATE_REST_COLOR, 'and the style returns to rest');

  // A parent prevents the keyup: the key is up all the same, so the press ends (the style returns to rest, nothing is
  // left pressed) though the click is withheld, as in browsers.
  await tabTo('kb-vetoed');
  keyEvent({ keycode: Key.KeySpace, unicode: 32 }, true);
  await settle();
  assert(get(api, 'kb-vetoed').style.backgroundColor === ACTIVATE_ACTIVE_COLOR && api.snapshot().pressed === get(api, 'kb-vetoed').id,
    `Space presses the button: ${get(api, 'kb-vetoed').style.backgroundColor}`);
  keyEvent({ keycode: Key.KeySpace, unicode: 32 }, false);
  await settle();
  assert(text(api, 'kb-veto-status') === 'clicks 0', `A prevented keyup withholds the click: ${text(api, 'kb-veto-status')}`);
  assert(get(api, 'kb-vetoed').style.backgroundColor === ACTIVATE_REST_COLOR && api.snapshot().pressed === null,
    `but the press is over: ${get(api, 'kb-vetoed').style.backgroundColor}, pressed ${api.snapshot().pressed}`);

  // A focus trap in JS: Tab wraps inside the dialog, Escape closes it and gives focus back.
  await click(api, 'kb-open');
  assert(focusedTestID() === 'dlg-ok', `autoFocus focuses the dialog's first button when it mounts: ${focusedTestID()}`);
  await tab();
  assert(focusedTestID() === 'dlg-cancel', 'Tab moves inside the dialog');
  await tab();
  assert(focusedTestID() === 'dlg-more', 'to its last button');
  await tab();
  assert(focusedTestID() === 'dlg-ok', `Tab at the last button wraps to the first (the trap): ${focusedTestID()}`);
  await tab(true);
  assert(focusedTestID() === 'dlg-more', `Shift+Tab at the first wraps to the last: ${focusedTestID()}`);
  await capture('17-focus-trap');
  await tap({ keycode: Key.KeyEscape });
  assert(!api.find('kb-dialog') && focusedTestID() === 'kb-open', `Escape closes the dialog and focus returns to its opener: ${focusedTestID()}`);

  // `focus()` from JS follows the input modality (a click is pointer input) unless it says otherwise,
  // and refuses an element that cannot take focus.
  await click(api, 'kb-focus-card');
  assert(focusedTestID() === 'kb-card' && !api.snapshot().focusVisible && !ringOn('kb-card'), 'focus() after a press is not a keyboard focus');
  await click(api, 'kb-focus-card-visible');
  assert(focusedTestID() === 'kb-card' && api.snapshot().focusVisible && ringOn('kb-card'), 'focus({ focusVisible: true }) shows the ring');
  await click(api, 'kb-focus-bad');
  assert(/focus failed: node \d+ cannot take focus: it is not a button or text input and has no tabIndex/.test(text(api, 'kb-focus-status')),
    `focus() on an element that cannot take focus throws: ${text(api, 'kb-focus-status')}`);

  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

/**
 * Phase 1 to F4: capture and bubble, preventDefault, synchronous dispatch, enter and leave chains, and the
 * re-entrancy rules (a handler removes its own target, detaches the root, unmounts it), then what dispatch costs.
 */
async function verifyEvents(
  api: InteractionInspection, owner: Node, directory: string, capture: (name: string) => Promise<void>,
): Promise<{ cheapHandler: TimingSummary; stateUpdatingHandler: TimingSummary }> {
  const focused = () => api.snapshot().focused;

  await settle();
  // The root is node 0, not a mounted element; its handle's `getRect()` (a native query) reports the rectangle the snapshot gives it.
  const rootRect = api.rootRect();
  const snapshotRoot = api.snapshot().nodes.find(node => node.id === 0)?.rect;
  assert(rootRect !== undefined && snapshotRoot !== undefined && rootRect.x === snapshotRoot.x && rootRect.y === snapshotRoot.y
    && rootRect.width === snapshotRoot.width && rootRect.height === snapshotRoot.height && rootRect.width > 0 && rootRect.height > 0,
  `The root handle's getRect() is the root's rectangle: ${JSON.stringify(rootRect)} against ${JSON.stringify(snapshotRoot)}`);
  await click(api, 'tab-interaction');
  assert(api.find('interaction-lab'), 'The Interaction tab mounts its lab');
  await capture('01-interaction');

  // Capture runs from the outermost ancestor to the target, bubble back out.
  await click(api, 'event-inner');
  assert(text(api, 'event-log') === 'outer:capture middle:capture inner:capture inner:bubble middle:bubble outer:bubble',
    `Capture then bubble order: ${text(api, 'event-log')}`);
  await capture('02-capture-bubble');

  // stopPropagation in a capture handler prevents the rest of capture and all of bubble.
  await click(api, 'event-clear');
  await click(api, 'stop-toggle');
  assert(text(api, 'stop-toggle') === 'Stop in capture: on', 'Stop toggle reads on');
  await click(api, 'event-inner');
  assert(text(api, 'event-log') === 'outer:capture middle:capture', `Stopping in capture prevents bubble: ${text(api, 'event-log')}`);
  await capture('03-stop-in-capture');
  await click(api, 'stop-toggle');
  await click(api, 'event-clear');

  // preventDefault() on pointerdown stops native's focus default action; click still fires.
  await click(api, 'focus-normal');
  const normal = get(api, 'focus-normal').id;
  assert(focused() === normal, 'An unprevented press focuses its button');
  await click(api, 'focus-prevented');
  assert(focused() === normal, `A prevented press must not take focus: focused ${focused()}`);
  assert(text(api, 'focus-status') === 'Clicks: normal 1, no-focus 1', `Click follows a prevented pointerdown: ${text(api, 'focus-status')}`);
  await capture('04-prevent-default');

  // Dispatch is synchronous: the pointerdown handler runs before native's focus change, and the
  // resulting focus event is delivered inside the same input callback (the same process frame).
  await click(api, 'sync-probe');
  const probe = get(api, 'sync-probe').id;
  const down = probeValue('pointerdown', text(api, 'probe-down'));
  const focusEvent = probeValue('focus', text(api, 'probe-focus'));
  assert(down.focused === normal, `pointerdown handler runs before the default action: focus was ${down.focused}, expected ${normal}`);
  assert(focusEvent.focused === probe, `focus handler sees the new focus: ${focusEvent.focused}`);
  assert(down.frame === focusEvent.frame, `pointerdown and focus dispatch in one input callback: frames ${down.frame}/${focusEvent.frame}`);
  assert(focused() === probe, 'The unprevented press focused the probe button');

  // Enter and leave reach only the crossed elements (DOM semantics).
  const chainBackground = () => get(api, 'chain-parent').style.backgroundColor;
  await click(api, 'chain-clear');
  assert(chainBackground() === CHAIN_PARENT_REST, 'Crossing parent starts unhovered');
  await hover(api, 'chain-a');
  assert(chainBackground() === CHAIN_PARENT_HOVER, 'Entering a child hovers its parent');
  await hover(api, 'chain-b');
  assert(chainBackground() === CHAIN_PARENT_HOVER, 'Moving between siblings keeps the parent hovered');
  await capture('05-enter-leave');
  await hover(api, 'chain-clear');
  assert(chainBackground() === CHAIN_PARENT_REST, 'Leaving the group unhovers its parent');
  assert(text(api, 'chain-log') === 'parent:enter a:enter a:leave b:enter b:leave parent:leave',
    `Enter and leave chains: ${text(api, 'chain-log')}`);

  // Rule 3: a handler removes its own target while native is inside the press.
  await click(api, 'focus-normal');
  assert(focused() === normal, 'Focus starts on the normal button');
  const removeButton = point(api, 'self-remove');
  move(removeButton);
  await settle();
  pointer(removeButton, true);
  await settle();
  assert(!api.find('self-remove'), 'The handler removed its target');
  assert(focused() === normal, `The default action is skipped for a removed target: focused ${focused()}`);
  assert(api.snapshot().pressed === null, 'A removed pressed element is no longer pressed');
  pointer(removeButton, false);
  await settle();
  assert(text(api, 'reentrancy-status') === 'Button removed, clicks on it: 0', `No click reaches a removed target: ${text(api, 'reentrancy-status')}`);
  await capture('06-self-removed');
  await click(api, 'self-restore');
  assert(api.find('self-remove'), 'The removed button can be restored');

  // A commit that removes the element focus is on, from inside its own click, leaves nothing focused and the root
  // gives Godot key focus back (plan 3.11, D11): the dialog that closes from its button is the usual case.
  await click(api, 'click-remove');
  assert(!api.find('click-remove'), 'The click handler removed the button it had focused');
  assert(focused() === null, `Nothing is focused: ${focused()}`);
  assert(!api.surfaceHasFocus(), 'and the root gave Godot key focus back, which a removed element cannot ask for');
  await click(api, 'click-restore');
  assert(api.find('click-remove'), 'The removed button can be brought back');

  // Rule 4: a handler takes the root out of the scene tree while native is inside the press.
  await click(api, 'focus-normal');
  const detachButton = point(api, 'danger-detach');
  move(detachButton);
  await settle();
  pointer(detachButton, true);
  await settle();
  pointer(detachButton, false);
  await settle();
  assert(owner.getChildCount() === 0, 'The handler detached the native root');
  const detached = api.snapshot();
  assert(detached.focused === null && detached.pressed === null && detached.hovered === null,
    `No default action ran on a detached root: ${JSON.stringify({focused: detached.focused, pressed: detached.pressed, hovered: detached.hovered})}`);
  api.surfaceAttached(true);
  await settle();
  await click(api, 'focus-normal');
  assert(focused() === normal, 'The same root works after re-entering the tree');
  await capture('07-reattached');

  // Rule 4, harder: the handler unmounts the React root and frees the surface.
  const unmountButton = point(api, 'danger-unmount');
  move(unmountButton);
  await settle();
  pointer(unmountButton, true);
  await settle();
  pointer(unmountButton, false);
  await settle();
  assert(owner.getChildCount() === 0, 'The unmounted surface was freed');
  let mounted = true;
  try {
    api.snapshot();
  } catch (error) {
    mounted = !(error instanceof Error && error.message.includes('not mounted'));
  }
  assert(!mounted, 'The handler unmounted the root');
  api.mount();
  await settle();
  assert(owner.getChildCount() === 1, 'A fresh surface mounts after the unmount');
  await click(api, 'tab-interaction');
  await click(api, 'focus-normal');
  assert(focused() === get(api, 'focus-normal').id, 'A fresh root dispatches normally');
  await capture('08-remounted');

  // What synchronous dispatch costs: JS time inside the one dispatch a press waits for.
  await click(api, 'event-clear');
  api.profile(true);
  const cheap = await measureSynchronousDispatch(api, 'focus-prevented');
  const stateful = await measureSynchronousDispatch(api, 'event-inner');
  api.profile(false);
  const timing = {cheapHandler: cheap, stateUpdatingHandler: stateful};
  const timingFile = FileAccess.open(`${directory}/dispatch-timing.json`, FileAccess.ModeFlags.Write);
  assert(timingFile, 'Cannot write dispatch timing evidence');
  timingFile.storeString(JSON.stringify(timing, null, 2));
  timingFile.close();
  console.log('GODOT_REACT_DISPATCH_TIMING', JSON.stringify(timing));
  move(FAR_CORNER);
  await settle();
  return timing;
}


/** One frame of the window, for reading pixels. */
function frameImage(owner: Node): Image {
  RenderingServer.forceDraw();
  const image = owner.getViewport()?.getTexture()?.getImage();
  assert(image, 'Native verification requires a rendered viewport');
  return image;
}

function paintIs(image: Image, at: Vector2, hex: string): boolean {
  const color = image.getPixel(Math.floor(at.x), Math.floor(at.y));
  const expected = Color.fromString(hex, new Color(0, 0, 0, 0));
  return Math.abs(color.r - expected.r) <= PAINT_TOLERANCE && Math.abs(color.g - expected.g) <= PAINT_TOLERANCE
    && Math.abs(color.b - expected.b) <= PAINT_TOLERANCE;
}

function describePaint(image: Image, at: Vector2): string {
  return `#${image.getPixel(Math.floor(at.x), Math.floor(at.y)).toHtml(false)} at ${at.x},${at.y}`;
}

function centerOf(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

/** The rectangle both `a` and `b` cover, or `undefined`. */
function intersection(a: LayoutRect, b: LayoutRect): LayoutRect | undefined {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : undefined;
}

/** Tab stops whose test id starts with `prefix`, in document order, across both layers. */
function tabStops(api: DemoInspection, prefix: string): string[] {
  return api.snapshot().nodes
    .filter(node => {
      const testID = node.props.testID;
      const tabIndex = node.props.tabIndex;
      const tabbable = ((node.kind === 'button' || node.kind === 'textinput') && node.props.disabled !== true && tabIndex !== -1) || tabIndex === 0;
      return tabbable && typeof testID === 'string' && testID.startsWith(prefix);
    })
    .sort((left, right) => left.documentIndex - right.documentIndex)
    .map(node => String(node.props.testID));
}

/**
 * Plan I4: `position`, insets and `zIndex`, and the overlay layer. Paint order follows document order and then
 * `zIndex` among what one parent paints; an absolute box is painted and clipped by its containing block, not its
 * parent; a fixed one by nothing but the window; a popover in a `Portal` covers and takes clicks from the content
 * below it and is not clipped by the card it was opened from.
 */
async function verifyPositioning(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  api.showLab('hud');
  await settle();
  api.showLab('positioning');
  await settle();
  move(FAR_CORNER);
  await settle();
  const nodeOf = (testID: string): NativeSnapshotNode => get(api, testID);
  const rectOf = (testID: string): LayoutRect => nodeOf(testID).rect;
  const hoveredAt = async (at: Vector2): Promise<number | null> => {
    move(at);
    await settle();
    return api.snapshot().hovered;
  };
  const status = () => text(api, 'pos-status');

  // ---- Stacking: document order, then zIndex, among what one parent paints -------------------------------------
  const a = rectOf('pos-z-a');
  const b = rectOf('pos-z-b');
  const c = rectOf('pos-z-c');
  const overlapAB = intersection(a, b);
  const overlapBC = intersection(b, c);
  assert(overlapAB && overlapBC, 'The stacking boxes overlap as the lab intends');
  const pointAB = centerOf(overlapAB);
  const pointBC = centerOf(overlapBC);
  const pointC = new Vector2(c.x + c.width - POPOVER_GAP_PX - 2, c.y + c.height / 2);
  assert(!intersection(b, { x: pointC.x, y: pointC.y, width: 1, height: 1 }), 'The point only C covers is outside B');
  let image = frameImage(owner);
  assert(paintIs(image, pointAB, STACK_B), `B is above A, which comes first in the document: ${describePaint(image, pointAB)}`);
  assert(paintIs(image, pointBC, STACK_B), `C, though last in the document, is behind B for z-index -10: ${describePaint(image, pointBC)}`);
  assert(paintIs(image, pointC, STACK_C), `C shows where nothing covers it: ${describePaint(image, pointC)}`);
  assert(await hoveredAt(pointAB) === nodeOf('pos-z-b').id, 'A pointer over A and B reaches the topmost, B');
  assert(await hoveredAt(pointBC) === nodeOf('pos-z-b').id, 'A pointer over B and C reaches B, not the later C');
  assert(await hoveredAt(pointC) === nodeOf('pos-z-c').id, 'And reaches C where only C is');
  const paintIndex = (testID: string) => nodeOf(testID).paintIndex;
  assert(paintIndex('pos-z-c') < paintIndex('pos-z-a') && paintIndex('pos-z-a') < paintIndex('pos-z-b'),
    `The stack paints C, A, B back to front: ${paintIndex('pos-z-c')}, ${paintIndex('pos-z-a')}, ${paintIndex('pos-z-b')}`);
  assert(nodeOf('pos-z-a').paintParent === nodeOf('pos-stack').id, 'An absolute box is painted by its relative parent');
  await capture('18-positioning-stacking');

  // A style change that raises A re-sorts what its parent paints, in the picture and under the pointer.
  await click(api, 'pos-z-toggle');
  assert(text(api, 'pos-z-toggle') === 'Lower A', `The toggle raised A: ${text(api, 'pos-z-toggle')}`);
  image = frameImage(owner);
  assert(paintIs(image, pointAB, STACK_A), `With z-index 10 A is above B: ${describePaint(image, pointAB)}`);
  assert(paintIs(image, pointBC, STACK_B), `B still covers C: ${describePaint(image, pointBC)}`);
  assert(await hoveredAt(pointAB) === nodeOf('pos-z-a').id, 'The raised A takes the pointer');
  assert(paintIndex('pos-z-c') < paintIndex('pos-z-b') && paintIndex('pos-z-b') < paintIndex('pos-z-a'),
    'The stack now paints C, B, A back to front');
  await capture('19-positioning-raised');
  await click(api, 'pos-z-toggle');
  image = frameImage(owner);
  assert(paintIs(image, pointAB, STACK_B), `Lowering A restores the order: ${describePaint(image, pointAB)}`);

  // Taking the container's position away moves the boxes' containing block to an ancestor, and giving it back moves it back: each
  // time they are painted, hit and listed by the new one. (Moved by an ancestor's change, not their own, the boxes once kept their
  // drawing but fell out of the new painter's list, so nothing hit them and the snapshot lost them.)
  await click(api, 'pos-contain-toggle');
  assert(nodeOf('pos-z-b').paintParent !== nodeOf('pos-stack').id, 'A static container does not paint its absolute boxes');
  const loose = nodeOf('pos-z-b').rect;
  assert(await hoveredAt(centerOf(loose)) === nodeOf('pos-z-b').id, 'A pointer reaches B where its new containing block places it');
  await click(api, 'pos-contain-toggle');
  assert(nodeOf('pos-z-a').paintParent === nodeOf('pos-stack').id && nodeOf('pos-z-b').paintParent === nodeOf('pos-stack').id,
    'A container made relative again paints its absolute boxes');
  assert(await hoveredAt(pointAB) === nodeOf('pos-z-b').id, 'A pointer over A and B reaches B again');
  assert(await hoveredAt(pointC) === nodeOf('pos-z-c').id, 'And C where only C is');
  assert(paintIndex('pos-z-c') < paintIndex('pos-z-a') && paintIndex('pos-z-a') < paintIndex('pos-z-b'),
    'The stack paints C, A, B back to front again');
  image = frameImage(owner);
  assert(paintIs(image, pointAB, STACK_B), `And draws B over A: ${describePaint(image, pointAB)}`);

  // ---- Clipping: the containing block clips an absolute box; an ancestor in between does not; fixed is free -------
  const cell1 = rectOf('pos-clip-1');
  const wrap = rectOf('pos-clip-wrap');
  const inside = (cell: LayoutRect) => new Vector2(cell.x + CELL_CHILD_INSIDE.x, cell.y + CELL_CHILD_INSIDE.y);
  const beyondRight = (cell: LayoutRect) => new Vector2(cell.x + CELL_CHILD_BEYOND_RIGHT.x, cell.y + CELL_CHILD_BEYOND_RIGHT.y);
  const beyondBottom = (cell: LayoutRect) => new Vector2(cell.x + CELL_CHILD_BEYOND_BOTTOM.x, cell.y + CELL_CHILD_BEYOND_BOTTOM.y);
  image = frameImage(owner);
  assert(paintIs(image, inside(cell1), CLIP_CHILD), `The part of the box inside its relative overflow-hidden parent shows: ${describePaint(image, inside(cell1))}`);
  assert(paintIs(image, beyondRight(cell1), PAGE_FILL), `The part beyond the parent's right edge is clipped: ${describePaint(image, beyondRight(cell1))}`);
  assert(paintIs(image, beyondBottom(cell1), PAGE_FILL), `The part beyond the parent's bottom edge is clipped: ${describePaint(image, beyondBottom(cell1))}`);
  assert(paintIs(image, inside(wrap), CLIP_CHILD), `The second box shows inside the cell: ${describePaint(image, inside(wrap))}`);
  assert(paintIs(image, beyondRight(wrap), CLIP_CHILD), `A box whose containing block is outside its overflow-hidden parent is not clipped by it: ${describePaint(image, beyondRight(wrap))}`);
  assert(paintIs(image, beyondBottom(wrap), CLIP_CHILD), `Nor below it: ${describePaint(image, beyondBottom(wrap))}`);
  assert(await hoveredAt(inside(cell1)) === nodeOf('pos-clip-child-1').id, 'A pointer inside the parent reaches the box');
  assert(await hoveredAt(beyondRight(cell1)) !== nodeOf('pos-clip-child-1').id, 'A pointer over the clipped part does not');
  assert(await hoveredAt(beyondRight(wrap)) === nodeOf('pos-clip-child-2').id, 'A pointer over the part that escaped reaches the box');
  const viewport = api.snapshot();
  const fixedRect = rectOf('pos-fixed');
  const near = (actual: number, expected: number) => Math.abs(actual - expected) <= GEOMETRY_TOLERANCE;
  assert(near(fixedRect.x, viewport.width - FIXED_BOX_INSET - FIXED_BOX_SIZE.x) && near(fixedRect.y, viewport.height - FIXED_BOX_INSET - FIXED_BOX_SIZE.y)
    && near(fixedRect.width, FIXED_BOX_SIZE.x) && near(fixedRect.height, FIXED_BOX_SIZE.y),
  `A fixed box sits against the window's right and bottom edges, though its parent is elsewhere: ${JSON.stringify(fixedRect)}`);
  image = frameImage(owner);
  assert(paintIs(image, centerOf(fixedRect), FIXED_BOX), `A fixed box inside an overflow-hidden parent is not clipped: ${describePaint(image, centerOf(fixedRect))}`);
  assert(await hoveredAt(centerOf(fixedRect)) === nodeOf('pos-fixed').id, 'A pointer over the fixed box reaches it');
  assert(nodeOf('pos-fixed').paintParent === 0 && nodeOf('pos-fixed').parent === nodeOf('pos-clip-3').id,
    'A fixed box is painted by the layer root and still a child of its parent in the tree');
  assert(nodeOf('pos-clip-child-2').paintParent === nodeOf('pos-clip-wrap').id && nodeOf('pos-clip-child-2').parent === nodeOf('pos-clip-2').id,
    'An absolute box is painted by its nearest positioned ancestor, past the static parent it is a child of');
  const fixedClip = nodeOf('pos-fixed').clipRect;
  assert(fixedClip && fixedClip.x === 0 && fixedClip.y === 0 && fixedClip.width === viewport.width && fixedClip.height === viewport.height,
    `Only the window clips a fixed box: ${JSON.stringify(fixedClip)}`);
  await capture('20-positioning-clipping');
  move(FAR_CORNER);
  await settle();

  // ---- Popover: the overlay layer, anchored with getRect(), above later content, not clipped by its card -------------
  const cardRect = rectOf('pos-card');
  const menuRect = rectOf('pos-menu');
  const laterRect = rectOf('pos-later');
  const closedStops = tabStops(api, 'pos-');
  assert(closedStops.join(',') === 'pos-z-toggle,pos-contain-toggle,pos-menu,pos-later', `The lab's tab stops while closed: ${closedStops.join(',')}`);
  assert(!api.find('pos-popover') && status().startsWith('open false'), `The popover starts closed: ${status()}`);
  await click(api, 'pos-menu');
  assert(status().startsWith('open true'), `The Menu button opens it: ${status()}`);
  const cardClicksAfterOpen = Number(/card clicks (\d+)/.exec(status())?.[1]);
  assert(cardClicksAfterOpen === 1, `The Menu button, inside the card, bubbled its click to the card: ${status()}`);
  const popover = nodeOf('pos-popover');
  const backdrop = nodeOf('pos-backdrop');
  assert(popover.layer === 1 && backdrop.layer === 1 && nodeOf('pos-item-delete').layer === 1, 'The popover and its backdrop are in the overlay layer');
  assert(Math.abs(popover.rect.x - menuRect.x) <= GEOMETRY_TOLERANCE
    && Math.abs(popover.rect.y - (menuRect.y + menuRect.height + POPOVER_GAP_PX)) <= GEOMETRY_TOLERANCE,
  `The popover is anchored under the button with getRect(): ${JSON.stringify(popover.rect)} under ${JSON.stringify(menuRect)}`);
  assert(backdrop.rect.x === 0 && backdrop.rect.y === 0 && backdrop.rect.width === viewport.width && backdrop.rect.height === viewport.height,
    `The backdrop covers the window: ${JSON.stringify(backdrop.rect)}`);
  const cardBottom = cardRect.y + cardRect.height;
  assert(popover.rect.y + popover.rect.height >= cardBottom + POPOVER_OVERHANG_PX, 'The popover reaches well below the card that clips its content');
  const covered = intersection(popover.rect, laterRect);
  assert(covered, 'The popover covers part of the content below the card');
  move(FAR_CORNER);
  await settle();
  image = frameImage(owner);
  const belowCard = new Vector2(popover.rect.x + POPOVER_PADDING_PROBE_PX, cardBottom + POPOVER_OVERHANG_PX / 2);
  assert(paintIs(image, belowCard, POPOVER_FILL), `The popover is not clipped by the overflow-hidden card: ${describePaint(image, belowCard)}`);
  const overLater = new Vector2(popover.rect.x + POPOVER_PADDING_PROBE_PX, covered.y + covered.height / 2);
  assert(paintIs(image, overLater, POPOVER_FILL) && !paintIs(image, overLater, LATER_FILL),
    `Where the popover covers the later button it is the popover that shows: ${describePaint(image, overLater)}`);
  assert(await hoveredAt(overLater) === popover.id, 'And a pointer there reaches the popover');
  assert(await hoveredAt(centerOf(rectOf('pos-z-toggle'))) === backdrop.id, 'The backdrop takes the pointer from the main layer under it');
  const openStops = tabStops(api, 'pos-');
  assert(openStops.join(',') === 'pos-z-toggle,pos-contain-toggle,pos-menu,pos-later,pos-item-rename,pos-item-duplicate,pos-item-delete',
    `Overlay stops come after every main stop, in document order: ${openStops.join(',')}`);
  await capture('21-positioning-popover');

  // Tab from the Menu button visits the main stops that follow it, then the popover's, then wraps to the first.
  const focusedTestID = (): string => {
    const id = api.snapshot().focused;
    const testID = api.snapshot().nodes.find(node => node.id === id)?.props.testID;
    return typeof testID === 'string' ? testID : 'none';
  };
  assert(focusedTestID() === 'pos-menu', `The Menu button has focus: ${focusedTestID()}`);
  const visited: string[] = [];
  for (let step = 0; step < openStops.length - 1; step++) {
    await tap({ keycode: Key.KeyTab });
    visited.push(focusedTestID());
  }
  assert(visited.join(',') === 'pos-later,pos-item-rename,pos-item-duplicate,pos-item-delete,pos-z-toggle,pos-contain-toggle',
    `Tab walks the main stops, then the popover's, then wraps: ${visited.join(',')}`);

  // A click where a popover item lies over the later button is the item's, not the later button's; the
  // click bubbles through the overlay tree, not through the card the popover was opened from.
  const items = ['pos-item-rename', 'pos-item-duplicate', 'pos-item-delete'];
  const overlapping = items.map(item => ({ item, area: intersection(rectOf(item), laterRect) })).find(entry => entry.area !== undefined);
  assert(overlapping?.area, 'One of the popover items lies over the later button');
  await hoveredAt(centerOf(overlapping.area));
  pointer(centerOf(overlapping.area), true);
  await settle();
  pointer(centerOf(overlapping.area), false);
  await settle();
  const pickedName = overlapping.item.replace('pos-item-', '');
  assert(status().toLowerCase().includes(`item ${pickedName}`) && status().startsWith('open false'),
    `The click chose the item and closed the popover: ${status()}`);
  assert(status().includes('later clicks 0'), `The click did not reach the later button under the item: ${status()}`);
  assert(status().includes(`card clicks ${cardClicksAfterOpen},`), `A click in the popover does not bubble to the card: ${status()}`);
  assert(!api.find('pos-popover') && !api.find('pos-backdrop'), 'The popover and its backdrop unmounted');

  // The backdrop closes the popover and takes the click away from the content under it.
  await click(api, 'pos-menu');
  assert(status().startsWith('open true'), 'The Menu button opens it again');
  const reopened = rectOf('pos-popover');
  const justLeft = new Vector2(laterRect.x + POPOVER_PADDING_PROBE_PX, laterRect.y + laterRect.height / 2);
  assert(justLeft.x < reopened.x, 'A point on the later button lies left of the popover');
  await hoveredAt(justLeft);
  pointer(justLeft, true);
  await settle();
  pointer(justLeft, false);
  await settle();
  assert(status().startsWith('open false') && status().includes('backdrop closes 1') && status().includes('later clicks 0'),
    `A click on the backdrop over the later button closes the popover and does not click the button: ${status()}`);

  // With the popover gone, the same point clicks the button, and Tab visits the main stops as it did.
  await click(api, 'pos-later');
  assert(status().includes('later clicks 1'), `The later button works with the popover closed: ${status()}`);
  assert(tabStops(api, 'pos-').join(',') === closedStops.join(','), 'The tab stops are what they were before the popover');
  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

// ---- Phase I8: the input kit, rendered by Godot (the Inputs lab) ---------------------------------------------------

/** What the Inputs lab prints: the one state object all its controls edit. */
interface InputsReadout {
  subscribe: boolean;
  notifications: boolean;
  size: string | null;
  volume: number;
  fruit: string | null;
  shipping: string | null;
  nickname: string;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readInputs(api: DemoInspection): InputsReadout {
  const parsed: unknown = JSON.parse(text(api, 'inputs-json'));
  assert(isRecord(parsed), `The readout is an object: ${text(api, 'inputs-json')}`);
  const { subscribe, notifications, size, volume, fruit, shipping, nickname } = parsed;
  assert(typeof subscribe === 'boolean' && typeof notifications === 'boolean' && typeof volume === 'number'
    && isNullableString(size) && isNullableString(fruit) && isNullableString(shipping) && typeof nickname === 'string',
  `The readout has the lab's fields: ${text(api, 'inputs-json')}`);
  return { subscribe, notifications, size, volume, fruit, shipping, nickname };
}

/** The lab's starting state (`INITIAL_STATE` in inputs-lab.tsx). */
const INPUTS_INITIAL: InputsReadout = { subscribe: false, notifications: false, size: 'medium', volume: 40, fruit: null, shipping: null, nickname: '' };
/** A switch's thumb travels `trackWidth - thumbSize - 2 * thumbInset` = 44 - 20 - 4 and starts `thumbInset` in. */
const SWITCH_TRAVEL_PX = 20;
const SWITCH_INSET_PX = 2;
/** A slider thumb is `w-5 h-5` and its track `h-1.5` (6 px): the thumb is 14 px taller and sticks out 7 px each side. */
const SLIDER_THUMB_PX = 20;
const SLIDER_TRACK_PX = 6;
/** The slider's range: min 0, max 100, step 1; a Page key moves ten steps, a drag the thumb's travel. */
const SLIDER_PAGE_STEPS = 10;
const SLIDER_DRAG_PX = 60;
/** Where on the track a press jumps the thumb to, as a fraction of its travel. */
const SLIDER_JUMP_FRACTION = 0.25;
/** The select's gap to its trigger (`DEFAULT_SIDE_OFFSET`) and the margin it keeps to the root's edges. */
const SELECT_GAP_PX = 4;
const SELECT_MARGIN_PX = 8;
/** Where the long select's trigger is scrolled to before its list opens: this fraction of the window down, so most of the room is under it. */
const LONG_TRIGGER_TOP_FRACTION = 0.25;
/** A probe this far inside the list's left edge is on its border and padding, where no item is. */
const SELECT_PADDING_PROBE_PX = 2;
/** The long list's length (`LONG_LIST_LENGTH` in inputs-lab.tsx). */
const LONG_LIST_COUNT = 40;
/** How close a revealed item's edge is to the edge of the list it was scrolled to, in pixels. */
const SCROLL_TOLERANCE_PX = 0.5;
/** The list's border (`border`), which its client area, the part that scrolls, starts inside. */
const SELECT_BORDER_PX = 1;
/** A disabled subtree is drawn at half opacity (`disabled:opacity-50`). */
const DISABLED_OPACITY = 0.5;
const INDIGO_600 = '#4f46e5';
const SLATE_50 = '#f8fafc';
const OPACITY_TOLERANCE = 0.05;
/** Transitions end within 150 ms; this many settles (100 ms and two frames each) is far more than needed. */
const MAX_TRANSITION_SETTLES = 30;
/** How much shorter than the lab the root is made to see the open list place itself again. */
const ROOT_SHRINK_PX = 200;
const SPACE_KEY: KeySpec = { keycode: Key.KeySpace, unicode: 32 };

/** The enabled `tap` for each key the section uses. */
const KEY_DOWN: KeySpec = { keycode: Key.KeyDown };
const KEY_UP: KeySpec = { keycode: Key.KeyUp };

async function waitForTransitions(api: DemoInspection): Promise<void> {
  for (let step = 0; step < MAX_TRANSITION_SETTLES; step++) {
    if (api.snapshot().transitions.length === 0) return;
    await settle();
  }
  throw new Error(`Transitions were still running after ${MAX_TRANSITION_SETTLES} settles: ${JSON.stringify(api.snapshot().transitions)}`);
}

/** The colour of `hex` blended with `background` at `opacity`, as a Color. */
function blend(hex: string, background: string, opacity: number): Color {
  const front = Color.fromString(hex, new Color(0, 0, 0, 0));
  const back = Color.fromString(background, new Color(0, 0, 0, 0));
  return new Color(
    front.r * opacity + back.r * (1 - opacity), front.g * opacity + back.g * (1 - opacity),
    front.b * opacity + back.b * (1 - opacity), 1,
  );
}

function paintNear(image: Image, at: Vector2, expected: Color, tolerance: number): boolean {
  const color = image.getPixel(Math.floor(at.x), Math.floor(at.y));
  return Math.abs(color.r - expected.r) <= tolerance && Math.abs(color.g - expected.g) <= tolerance
    && Math.abs(color.b - expected.b) <= tolerance;
}

/**
 * Plan I8: the kit's inputs in a window. Checkbox, Switch, RadioGroup, Slider and Select edit one state object by
 * mouse and keyboard; what the kit notes could only reason about is checked here: the slider thumb sticking out of its
 * track (centred, and hit where it sticks out), the switch's `0 <-> 20` px spacer transition being accepted, the
 * `disabled` opacity reaching the subtree, a radio group that mounts over two commits and follows a reordered list,
 * and the select opening, moving, choosing, closing, flipping and placing itself again when the root is resized.
 */
async function verifyInputs(owner: Node, api: InteractionInspection, capture: (name: string, overflowing?: readonly string[]) => Promise<void>): Promise<void> {
  api.showLab('hud');
  await settle();
  api.showLab('inputs');
  await settle();
  move(FAR_CORNER);
  await settle();
  const nodeOf = (testID: string): NativeSnapshotNode => get(api, testID);
  const rectOf = (testID: string): LayoutRect => nodeOf(testID).rect;
  const state = (): InputsReadout => readInputs(api);
  const focusedTestID = (): string => {
    const id = api.snapshot().focused;
    const testID = api.snapshot().nodes.find(node => node.id === id)?.props.testID;
    return typeof testID === 'string' ? testID : 'none';
  };
  const hoveredAt = async (at: Vector2): Promise<number | null> => {
    move(at);
    await settle();
    return api.snapshot().hovered;
  };
  const childOf = (testID: string, ...path: number[]): NativeSnapshotNode => {
    const snapshot = api.snapshot();
    let node = get(api, testID);
    for (const index of path) {
      const next = snapshot.nodes.find(candidate => candidate.id === node.children[index]);
      assert(next, `${testID} has no child at ${path.join('/')}`);
      node = next;
    }
    return node;
  };
  const overflowing = ['inputs-slider-thumb'];

  // A fact the kit's choice of dependencies rested on (docs/tracks/select-anchor.md): react-stately's slider and select
  // state use Intl.NumberFormat and Intl.ListFormat. Recorded, not asserted: the kit does not use them.
  const intl: unknown = Reflect.get(globalThis, 'Intl');
  const intlMember = (name: string): string => (isRecord(intl) ? typeof intl[name] : 'no Intl');
  console.log('GODOT_REACT_RUNTIME_FACTS', JSON.stringify({
    intl: typeof intl, numberFormat: intlMember('NumberFormat'), listFormat: intlMember('ListFormat'), segmenter: intlMember('Segmenter'),
  }));

  // ---- Rest: the state, the tab stops (the radio group has mounted over two commits) ------------------------------
  assert(JSON.stringify(state()) === JSON.stringify(INPUTS_INITIAL), `The lab starts from its initial state: ${text(api, 'inputs-json')}`);
  const stops = tabStops(api, 'inputs-');
  assert(stops.join(',') === 'inputs-checkbox,inputs-switch,inputs-radio-medium,inputs-radio-reverse,inputs-slider-thumb,inputs-fruit,inputs-next,inputs-long,inputs-nickname-input,inputs-shipping',
    `One radio item is a tab stop (the selected one), locked controls and the disabled item are none: ${stops.join(',')}`);
  for (const size of ['small', 'large']) {
    assert(nodeOf(`inputs-radio-${size}`).props.tabIndex === -1, `The unselected ${size} item is not a tab stop`);
  }
  assert(nodeOf('inputs-radio-huge').props.disabled === true, 'The disabled radio item is disabled natively');
  assert(nodeOf('inputs-checkbox-locked').props.disabled === true && nodeOf('inputs-switch-locked').props.disabled === true,
    'The locked controls are disabled natively');
  await capture('22-inputs-rest', overflowing);

  // ---- Checkbox: press and Space toggle it, Enter does not, a locked one is dimmed through its whole subtree -------
  await click(api, 'inputs-checkbox');
  assert(state().subscribe, `A press checks the checkbox: ${text(api, 'inputs-json')}`);
  assert(focusedTestID() === 'inputs-checkbox', `A press focuses it: ${focusedTestID()}`);
  await tap(SPACE_KEY);
  assert(!state().subscribe, 'Space on the focused checkbox unchecks it');
  await tap({ keycode: Key.KeyEnter });
  assert(!state().subscribe, 'Enter does not toggle a checkbox');
  await tap(SPACE_KEY);
  assert(state().subscribe, 'Space checks it again');
  const enabledMark = childOf('inputs-checkbox', 0, 0);
  const lockedMark = childOf('inputs-checkbox-locked', 0, 0);
  assert(enabledMark.rect.width > 0 && lockedMark.rect.width > 0, 'Both checked checkboxes draw their mark');
  assert(nodeOf('inputs-checkbox-locked').presentation.opacity === DISABLED_OPACITY && nodeOf('inputs-checkbox').presentation.opacity === 1,
    `The locked checkbox is at half opacity: ${nodeOf('inputs-checkbox-locked').presentation.opacity}`);
  move(FAR_CORNER);
  await settle();
  let image = frameImage(owner);
  assert(paintIs(image, centerOf(enabledMark.rect), INDIGO_600), `The enabled mark is indigo: ${describePaint(image, centerOf(enabledMark.rect))}`);
  const dimmed = blend(INDIGO_600, SLATE_50, DISABLED_OPACITY);
  assert(paintNear(image, centerOf(lockedMark.rect), dimmed, OPACITY_TOLERANCE),
    `The locked mark, a grandchild of the disabled button, is drawn at half opacity (about #${dimmed.toHtml(false)}): ${describePaint(image, centerOf(lockedMark.rect))}`);
  const before = state();
  await click(api, 'inputs-checkbox-locked');
  assert(JSON.stringify(state()) === JSON.stringify(before), 'A press on the locked checkbox changes nothing');
  assert(focusedTestID() !== 'inputs-checkbox-locked', 'and it takes no focus');

  // ---- Switch: the spacer's 0 <-> 20 px width transition is accepted and moves the thumb -------------------------
  const switchTrack = childOf('inputs-switch', 0);
  const spacer = (): NativeSnapshotNode => childOf('inputs-switch', 0, 0);
  const thumbX = (): number => childOf('inputs-switch', 0, 1).rect.x - switchTrack.rect.x;
  assert(spacer().rect.width === 0 && Math.abs(thumbX() - SWITCH_INSET_PX) <= GEOMETRY_TOLERANCE, `An off switch has its thumb at the inset: ${thumbX()}`);
  const framesBefore = api.activity().animationFrames;
  await click(api, 'inputs-switch');
  await waitForTransitions(api);
  assert(state().notifications, 'A press turns the switch on');
  assert(api.activity().animationFrames > framesBefore, 'The spacer animated: native ran animation frames');
  assert(Math.abs(spacer().rect.width - SWITCH_TRAVEL_PX) <= GEOMETRY_TOLERANCE,
    `The spacer grew to the thumb's travel, so native accepted the 0 -> 20 px transition: ${spacer().rect.width}`);
  assert(Math.abs(thumbX() - (SWITCH_INSET_PX + SWITCH_TRAVEL_PX)) <= GEOMETRY_TOLERANCE, `The thumb moved by the travel: ${thumbX()}`);
  await tap({ keycode: Key.KeyEnter });
  await waitForTransitions(api);
  assert(!state().notifications && spacer().rect.width === 0, `Enter turns it off and the spacer shrinks back, 20 -> 0 px: ${spacer().rect.width}`);
  await tap(SPACE_KEY);
  await waitForTransitions(api);
  assert(state().notifications, 'Space turns it on again');
  const lockedThumb = childOf('inputs-switch-locked', 0, 1).rect.x - childOf('inputs-switch-locked', 0).rect.x;
  assert(Math.abs(lockedThumb - (SWITCH_INSET_PX + SWITCH_TRAVEL_PX)) <= GEOMETRY_TOLERANCE, `The locked, checked switch shows its thumb on: ${lockedThumb}`);

  // ---- RadioGroup: arrows move focus and selection, wrap and skip the disabled item; a reorder is followed ---------
  await click(api, 'inputs-radio-medium');
  assert(state().size === 'medium' && focusedTestID() === 'inputs-radio-medium', 'A press selects and focuses the radio item');
  await tap({ keycode: Key.KeyRight });
  assert(state().size === 'large' && focusedTestID() === 'inputs-radio-large', `ArrowRight moves to the next item: ${state().size}`);
  await tap({ keycode: Key.KeyRight });
  assert(state().size === 'small' && focusedTestID() === 'inputs-radio-small', `The disabled item is skipped and the end wraps: ${state().size}`);
  await tap({ keycode: Key.KeyLeft });
  assert(state().size === 'large', `ArrowLeft wraps back, past the disabled item: ${state().size}`);
  assert(stops.join(',') !== tabStops(api, 'inputs-').join(',') && tabStops(api, 'inputs-').includes('inputs-radio-large'),
    'The tab stop followed the selection');
  const xOf = (size: string): number => rectOf(`inputs-radio-${size}`).x;
  assert(xOf('small') < xOf('medium') && xOf('medium') < xOf('large') && xOf('large') < xOf('huge'), 'The items are shown small to huge');
  await click(api, 'inputs-radio-reverse');
  assert(xOf('huge') < xOf('large') && xOf('large') < xOf('medium') && xOf('medium') < xOf('small'), 'Reverse shows them huge to small');
  const order = ['small', 'medium', 'large', 'huge'].map(size => nodeOf(`inputs-radio-${size}`).documentIndex);
  assert(order[0] !== undefined && order[1] !== undefined && order[2] !== undefined && order[3] !== undefined
    && order[3] < order[2] && order[2] < order[1] && order[1] < order[0], `Native's document order is the reversed one: ${order.join(',')}`);
  await click(api, 'inputs-radio-small');
  assert(state().size === 'small', 'Pressing small selects it');
  await tap({ keycode: Key.KeyRight });
  assert(state().size === 'large' && focusedTestID() === 'inputs-radio-large',
    `ArrowRight follows the reordered items (small is last, then huge is skipped): ${state().size}`);
  await click(api, 'inputs-radio-reverse');
  assert(tabStops(api, 'inputs-').includes('inputs-radio-large'), 'The selected item is still the one radio tab stop after the order changed back');

  // ---- Slider: the thumb sticks out of the track, is centred, is hit where it sticks out, and drags ----------------
  const trackRect = (): LayoutRect => rectOf('inputs-slider-track');
  const thumbRect = (): LayoutRect => rectOf('inputs-slider-thumb');
  assert(Math.abs(trackRect().height - SLIDER_TRACK_PX) <= 1 && Math.abs(thumbRect().height - SLIDER_THUMB_PX) <= 1,
    `The track is ${SLIDER_TRACK_PX} px high and the thumb ${SLIDER_THUMB_PX}: ${trackRect().height}, ${thumbRect().height}`);
  assert(thumbRect().y < trackRect().y && thumbRect().y + thumbRect().height > trackRect().y + trackRect().height, 'The thumb sticks out above and below the track');
  assert(Math.abs(centerOf(thumbRect()).y - centerOf(trackRect()).y) <= 1,
    `The overflowing thumb is centred on the track: thumb ${centerOf(thumbRect()).y}, track ${centerOf(trackRect()).y}`);
  const travel = (): number => trackRect().width - thumbRect().width;
  const thumbAtValue = (value: number): number => trackRect().x + thumbRect().width / 2 + travel() * value / 100;
  assert(Math.abs(centerOf(thumbRect()).x - thumbAtValue(state().volume)) <= 1, `At 40 the thumb sits 40% along its travel: ${centerOf(thumbRect()).x}`);
  const aboveTrack = new Vector2(centerOf(thumbRect()).x, thumbRect().y + 2);
  assert(aboveTrack.y < trackRect().y, 'The probe point is above the track');
  assert(await hoveredAt(aboveTrack) === nodeOf('inputs-slider-thumb').id, 'A pointer where the thumb sticks out of the track hits the thumb');
  await capture('23-inputs-slider-rest', overflowing);
  // Grab the thumb and drag it right: the thumb keeps its offset, so the value follows the pointer's travel.
  const grab = centerOf(thumbRect());
  const startValue = state().volume;
  pointer(grab, true);
  await settle();
  assert(state().volume === startValue, 'Pressing the thumb does not move it');
  assert(focusedTestID() === 'inputs-slider-thumb', 'and focuses it');
  const dragged = new Vector2(grab.x + SLIDER_DRAG_PX, grab.y + SLIDER_THUMB_PX);
  move(dragged);
  await settle();
  const expected = startValue + SLIDER_DRAG_PX / travel() * 100;
  const dragValue = state().volume;
  assert(Math.abs(dragValue - expected) <= 1, `Dragging ${SLIDER_DRAG_PX} px right (and off the track vertically) sets about ${expected}: ${dragValue}`);
  assert(Math.abs(centerOf(thumbRect()).x - thumbAtValue(dragValue)) <= 1, 'The thumb follows the value');
  pointer(dragged, false);
  await settle();
  assert(state().volume === dragValue, 'Releasing keeps the value');
  await tap({ keycode: Key.KeyRight });
  assert(state().volume === dragValue + 1, `ArrowRight adds a step: ${state().volume}`);
  await tap({ keycode: Key.KeyPageup });
  assert(state().volume === dragValue + 1 + SLIDER_PAGE_STEPS, `PageUp adds ten steps: ${state().volume}`);
  await tap({ keycode: Key.KeyHome });
  assert(state().volume === 0, `Home goes to the minimum: ${state().volume}`);
  await tap({ keycode: Key.KeyEnd });
  assert(state().volume === 100, `End goes to the maximum: ${state().volume}`);
  const jump = new Vector2(trackRect().x + thumbRect().width / 2 + travel() * SLIDER_JUMP_FRACTION, centerOf(trackRect()).y);
  await click(api, 'inputs-slider-track');
  const jumped = state().volume;
  assert(jumped === 50, `A press at the middle of the track jumps there (clicked at ${centerOf(trackRect()).x}): ${jumped}`);
  move(jump);
  await settle();
  pointer(jump, true);
  await settle();
  pointer(jump, false);
  await settle();
  assert(state().volume === 25, `A press a quarter along the travel jumps to 25: ${state().volume}`);
  move(FAR_CORNER);
  await settle();

  // ---- Select, opened with the pointer ---------------------------------------------------------------------------
  assert(text(api, 'inputs-fruit-value') === 'Pick a fruit', `Nothing selected shows the placeholder: ${text(api, 'inputs-fruit-value')}`);
  assert(!api.find('inputs-fruit-list') && !api.find('inputs-fruit-item-apple'), 'A closed select has no list and no items');
  const triggerRect = rectOf('inputs-fruit');
  await click(api, 'inputs-fruit');
  const list = nodeOf('inputs-fruit-list');
  const backdrop = nodeOf('inputs-fruit-list-backdrop');
  const viewport = api.snapshot();
  assert(list.layer === 1 && backdrop.layer === 1 && nodeOf('inputs-fruit-item-apple').layer === 1, 'The list, its backdrop and the items are in the overlay layer');
  assert(Math.abs(list.rect.x - triggerRect.x) <= GEOMETRY_TOLERANCE
    && Math.abs(list.rect.y - (triggerRect.y + triggerRect.height + SELECT_GAP_PX)) <= GEOMETRY_TOLERANCE,
  `The list opens under the trigger: ${JSON.stringify(list.rect)} under ${JSON.stringify(triggerRect)}`);
  assert(list.rect.width >= triggerRect.width - GEOMETRY_TOLERANCE, `and is at least as wide as the trigger: ${list.rect.width} against ${triggerRect.width}`);
  assert(backdrop.rect.width === viewport.width && backdrop.rect.height === viewport.height, 'The backdrop covers the window');
  assert(focusedTestID() === 'inputs-fruit-item-apple', `Focus moves to the first enabled item when nothing is selected: ${focusedTestID()}`);
  assert(!viewport.focusVisible, 'A pointer opened it, so the focus shows no ring');
  assert(nodeOf('inputs-fruit').props.disabled !== true, 'The trigger of an enabled select is enabled');
  const optionRect = (value: string): LayoutRect => rectOf(`inputs-fruit-item-${value}`);
  assert(optionRect('apple').y < optionRect('banana').y && optionRect('banana').y < optionRect('blueberry').y, 'The items are listed in order');
  image = frameImage(owner);
  assert(paintIs(image, new Vector2(optionRect('apple').x + POPOVER_PADDING_PROBE_PX, centerOf(optionRect('apple')).y), '#eef2ff'),
    `The focused item is highlighted: ${describePaint(image, new Vector2(optionRect('apple').x + POPOVER_PADDING_PROBE_PX, centerOf(optionRect('apple')).y))}`);
  await capture('24-inputs-select-open', overflowing);

  // A pointer over an item moves the one highlight (focus); a disabled item takes none.
  await hoveredAt(centerOf(optionRect('blueberry')));
  assert(focusedTestID() === 'inputs-fruit-item-blueberry', `A pointer over an item focuses it: ${focusedTestID()}`);
  await hoveredAt(centerOf(optionRect('cherry')));
  assert(focusedTestID() === 'inputs-fruit-item-blueberry', `A pointer over the disabled item moves nothing: ${focusedTestID()}`);
  await click(api, 'inputs-fruit-item-cherry');
  assert(api.find('inputs-fruit-list') !== undefined && state().fruit === null, 'The disabled item cannot be chosen: the list stays open');
  assert(focusedTestID() === 'inputs-fruit-item-blueberry',
    `Pressing the disabled item leaves focus in the list (native sends no press for a disabled element, so it is not one natively): ${focusedTestID()}`);
  // A press on the list's own padding does not take focus out of it either.
  const listPadding = new Vector2(list.rect.x + SELECT_PADDING_PROBE_PX, list.rect.y + list.rect.height / 2);
  await hoveredAt(listPadding);
  pointer(listPadding, true);
  await settle();
  pointer(listPadding, false);
  await settle();
  assert(api.find('inputs-fruit-list') !== undefined && focusedTestID() === 'inputs-fruit-item-blueberry',
    `Pressing the list's padding keeps focus in the list: ${focusedTestID()}`);

  // Keys: arrows, Home and End, type-ahead, Enter.
  await tap(KEY_DOWN);
  assert(focusedTestID() === 'inputs-fruit-item-date', `ArrowDown skips the disabled cherry: ${focusedTestID()}`);
  await tap(KEY_DOWN);
  assert(focusedTestID() === 'inputs-fruit-item-date', 'and stops at the last item');
  await tap({ keycode: Key.KeyHome });
  assert(focusedTestID() === 'inputs-fruit-item-apple', 'Home goes to the first item');
  await tap({ keycode: Key.KeyEnd });
  assert(focusedTestID() === 'inputs-fruit-item-date', 'End goes to the last');
  api.resetPassthrough();
  await tap({ keycode: Key.KeyB, unicode: 'b'.charCodeAt(0) });
  assert(focusedTestID() === 'inputs-fruit-item-banana', `Typing b goes to the first item starting with b: ${focusedTestID()}`);
  await tap({ keycode: Key.KeyB, unicode: 'b'.charCodeAt(0) });
  assert(focusedTestID() === 'inputs-fruit-item-blueberry', `Typing b again goes on to the next: ${focusedTestID()}`);
  assert((counts(api).unhandledKeys[Key.KeyB] ?? 0) === 0, 'Letters typed into the list are the list\'s: the game saw none');
  await tap({ keycode: Key.KeyEnter });
  assert(state().fruit === 'blueberry' && !api.find('inputs-fruit-list'), `Enter chooses the focused item and closes the list: ${text(api, 'inputs-json')}`);
  assert(focusedTestID() === 'inputs-fruit', `Focus is back on the trigger: ${focusedTestID()}`);
  assert(text(api, 'inputs-fruit-value') === 'Blueberry', `The trigger shows the choice: ${text(api, 'inputs-fruit-value')}`);

  // Opened from the keyboard: the chosen item is focused and shows the ring; Escape changes nothing.
  await tap(KEY_DOWN);
  assert(api.find('inputs-fruit-list') !== undefined, 'ArrowDown on the focused trigger opens the list');
  assert(focusedTestID() === 'inputs-fruit-item-blueberry' && api.snapshot().focusVisible, `Opening focuses the chosen item, with the keyboard ring: ${focusedTestID()}`);
  await capture('25-inputs-select-keyboard', overflowing);
  await tap(KEY_UP);
  assert(focusedTestID() === 'inputs-fruit-item-banana', 'ArrowUp moves up');
  await tap({ keycode: Key.KeyEscape });
  assert(!api.find('inputs-fruit-list') && state().fruit === 'blueberry', `Escape closes without choosing: ${text(api, 'inputs-json')}`);
  assert(focusedTestID() === 'inputs-fruit', 'and gives the trigger focus back');
  await tap({ keycode: Key.KeyEnter });
  assert(api.find('inputs-fruit-list') !== undefined && focusedTestID() === 'inputs-fruit-item-blueberry', 'Enter on the trigger opens it too');
  await tap({ keycode: Key.KeyEscape });
  await tap(SPACE_KEY);
  assert(api.find('inputs-fruit-list') !== undefined, 'and so does Space');

  // Tab chooses the focused item, closes the list and moves on from the trigger to the next control.
  await tap(KEY_UP);
  assert(focusedTestID() === 'inputs-fruit-item-banana', 'Moved to banana');
  await tap({ keycode: Key.KeyTab });
  assert(!api.find('inputs-fruit-list') && state().fruit === 'banana', `Tab chooses the focused item and closes: ${text(api, 'inputs-json')}`);
  assert(focusedTestID() === 'inputs-next', `and native moves on from the trigger to the next tab stop: ${focusedTestID()}`);

  // A press outside the list closes it, and the control under the press does not receive it.
  await click(api, 'inputs-fruit');
  assert(api.find('inputs-fruit-list') !== undefined, 'The trigger opens the list again');
  const nextBefore = text(api, 'inputs-next');
  await click(api, 'inputs-next');
  assert(!api.find('inputs-fruit-list'), 'A press outside the list closes it');
  assert(text(api, 'inputs-next') === nextBefore, `and the press did not reach the button under the backdrop: ${text(api, 'inputs-next')}`);
  assert(state().fruit === 'banana', 'Closing from outside chooses nothing');
  assert(focusedTestID() === 'inputs-fruit', `and puts focus on the trigger: ${focusedTestID()}`);
  await click(api, 'inputs-fruit');
  await click(api, 'inputs-fruit-item-date');
  assert(state().fruit === 'date' && !api.find('inputs-fruit-list') && focusedTestID() === 'inputs-fruit',
    `Pressing an item chooses it, closes the list and refocuses the trigger: ${text(api, 'inputs-json')}`);

  // ---- A list too long for the room: capped to it, and scrolled by the keys, the wheel and its thumb ----------------
  // The case is a trigger with more room under it than over it, whose list is taller than either. The lab's notes put its selects low in the
  // window, and the page scrolls, so the page is scrolled until the trigger is in the window's top quarter, as a person would scroll to it. (A list
  // with less room under its trigger opens over it: the pinned select's case, below.)
  const rootHeight = api.snapshot().height;
  const page = nodeOf('inputs-page');
  const pageScroll = page.scroll;
  assert(pageScroll, 'The Controls page is a scroll container');
  api.scrollTo('inputs-page', Math.min(pageScroll.maxScrollTop, pageScroll.scrollTop + rectOf('inputs-long').y - page.rect.y - rootHeight * LONG_TRIGGER_TOP_FRACTION));
  await settle();
  const longTrigger = rectOf('inputs-long');
  assert(rootHeight - (longTrigger.y + longTrigger.height) > longTrigger.y,
    `The long select has more room under it than over it, which is the case this checks: ${JSON.stringify(longTrigger)} in a window ${rootHeight} tall`);
  await click(api, 'inputs-long');
  const longList = (): NativeSnapshotNode => nodeOf('inputs-long-list');
  const longState = (): NativeScrollState => {
    const scroll = longList().scroll;
    assert(scroll, 'The open list is a scroll container');
    return scroll;
  };
  const clientTop = (): number => longList().rect.y + SELECT_BORDER_PX;
  const clientBottom = (): number => clientTop() + longState().clientHeight;
  const itemId = (position: number): string => `inputs-long-item-option-${position}`;
  const room = rootHeight - (longTrigger.y + longTrigger.height) - SELECT_GAP_PX - SELECT_MARGIN_PX;
  assert(near(longList().rect.height, room, GEOMETRY_TOLERANCE),
    `A list taller than the room under its trigger is capped to that room: ${longList().rect.height} for ${room}`);
  assert(near(longList().rect.y, longTrigger.y + longTrigger.height + SELECT_GAP_PX, GEOMETRY_TOLERANCE),
    `and still opens under the trigger: ${JSON.stringify(longList().rect)} under ${JSON.stringify(longTrigger)}`);
  assert(longState().scrollTop === 0 && longState().maxScrollTop > 0 && longState().thumbs?.y !== null,
    `The rest of the items are scrolled out of view, with a scrollbar for them: ${JSON.stringify(longState())}`);
  assert(focusedTestID() === itemId(1), `Opening focuses the first item: ${focusedTestID()}`);

  // Arrow keys move focus down the list, and focus brings the item into view by the least scrolling that shows it.
  const itemHeight = rectOf(itemId(1)).height;
  const itemStep = rectOf(itemId(2)).y - rectOf(itemId(1)).y;
  const shown = Math.floor((clientBottom() - rectOf(itemId(1)).y - itemHeight) / itemStep) + 1;
  for (let press = 0; press < shown; press++) await tap(KEY_DOWN);
  assert(focusedTestID() === itemId(shown + 1), `${shown} ArrowDowns reach the first item that was out of view: ${focusedTestID()}`);
  assert(longState().scrollTop > 0 && near(rectOf(itemId(shown + 1)).y + itemHeight, clientBottom(), SCROLL_TOLERANCE_PX),
    `The list scrolled just far enough to show it, flush with the bottom edge: ${JSON.stringify(rectOf(itemId(shown + 1)))} in ${clientBottom()}`);
  await tap({ keycode: Key.KeyEnd });
  assert(focusedTestID() === itemId(LONG_LIST_COUNT), `End goes to the last item: ${focusedTestID()}`);
  assert(near(rectOf(itemId(LONG_LIST_COUNT)).y + itemHeight, clientBottom(), SCROLL_TOLERANCE_PX),
    `and the list scrolls it into view: ${JSON.stringify(rectOf(itemId(LONG_LIST_COUNT)))} in ${clientBottom()}`);

  // The wheel scrolls the list a step, and a wheel at its end stays in it instead of reaching the game.
  const listCentre = (): Vector2 => centerOf(longList().rect);
  const longTick = longState().clientHeight / SCROLL_PAGE_DIVISOR;
  let longTop = longState().scrollTop;
  await wheel(listCentre(), MouseButton.MouseButtonWheelUp);
  assert(near(longState().scrollTop, longTop - longTick), `One tick of the wheel scrolls it a step: ${longTop} -> ${longState().scrollTop}`);
  await wheel(listCentre(), MouseButton.MouseButtonWheelDown);
  await wheel(listCentre(), MouseButton.MouseButtonWheelDown);
  assert(near(longState().scrollTop, longState().maxScrollTop), `and it can go on down to the end: ${longState().scrollTop} of ${longState().maxScrollTop}`);
  const gameWheels = counts(api).unhandledWheels;
  await wheel(listCentre(), MouseButton.MouseButtonWheelDown);
  assert(counts(api).unhandledWheels === gameWheels, 'A tick at the end of the list is contained: the game does not get it');
  assert(api.find('inputs-long-list') !== undefined, 'and the wheel leaves the list open');

  // Back at the top, the thumb drags the content, and letting go of it chooses nothing.
  await tap({ keycode: Key.KeyHome });
  assert(focusedTestID() === itemId(1) && near(rectOf(itemId(1)).y, clientTop(), SCROLL_TOLERANCE_PX),
    `Home goes to the first item and shows it at the top edge: ${focusedTestID()} ${JSON.stringify(rectOf(itemId(1)))} in ${clientTop()}`);
  const startTop = longState().scrollTop;
  const longGrip = longState().thumbs?.y;
  assert(longGrip, 'The list has a thumb to grab');
  const longTravel = (longState().clientHeight - 2 * SCROLLBAR_MARGIN) - longGrip.height;
  const grabLong = centerOf(longGrip);
  move(grabLong);
  await settle();
  pointer(grabLong, true);
  await settle();
  move(new Vector2(grabLong.x, grabLong.y + THUMB_DRAG_PX));
  await settle();
  assert(near(longState().scrollTop - startTop, THUMB_DRAG_PX / longTravel * longState().maxScrollTop, 0.5),
    `Dragging the list's thumb moves the content with it: ${startTop} -> ${longState().scrollTop}`);
  pointer(new Vector2(grabLong.x, grabLong.y + THUMB_DRAG_PX), false);
  await settle();
  assert(api.find('inputs-long-list') !== undefined && text(api, 'inputs-long-value') === 'Pick an option',
    `Letting go of the thumb neither closes the list nor chooses an item: ${text(api, 'inputs-long-value')}`);
  await capture('27-inputs-select-long', overflowing);

  // A press on an item that was scrolled into view chooses it.
  const visibleItem = api.snapshot().nodes.find(node => /^inputs-long-item-option-\d+$/.test(String(node.props.testID))
    && node.rect.y >= clientTop() && node.rect.y + node.rect.height <= clientBottom());
  assert(visibleItem, 'An item is in view after the scroll');
  const chosenId = String(visibleItem.props.testID);
  await click(api, chosenId);
  assert(!api.find('inputs-long-list') && text(api, 'inputs-long-value') === `Option ${chosenId.slice(chosenId.lastIndexOf('-') + 1)}`,
    `Pressing a scrolled item chooses that item and closes the list: ${text(api, 'inputs-long-value')} for ${chosenId}`);
  assert(focusedTestID() === 'inputs-long', `and focuses the trigger: ${focusedTestID()}`);

  // ---- Select near the bottom of the window: the list flips above its trigger ---------------------------------------
  const shippingRect = rectOf('inputs-shipping');
  await click(api, 'inputs-shipping');
  const above = nodeOf('inputs-shipping-list');
  assert(above.rect.y + above.rect.height <= shippingRect.y - SELECT_GAP_PX + GEOMETRY_TOLERANCE,
    `With no room below the trigger the list opens above it: ${JSON.stringify(above.rect)} over ${JSON.stringify(shippingRect)}`);
  assert(above.rect.y >= SELECT_MARGIN_PX - GEOMETRY_TOLERANCE, `and stays inside the root: ${JSON.stringify(above.rect)}`);
  assert(Math.abs(above.rect.y + above.rect.height - (shippingRect.y - SELECT_GAP_PX)) <= GEOMETRY_TOLERANCE, 'flush with the gap above the trigger');
  await capture('26-inputs-select-flipped', overflowing);

  // The root shrinks while the list is open: useRootSize() reads the Control's new size (native `Control.size`, found
  // when the owner calls dispatchEvents) and the list, placed for the old size, closes and hands focus back.
  const full = api.snapshot();
  api.resizeSurface(full.width, full.height - ROOT_SHRINK_PX);
  await settle();
  const smaller = api.snapshot();
  assert(smaller.height === full.height - ROOT_SHRINK_PX, `The root is smaller: ${smaller.height}`);
  assert(!api.find('inputs-shipping-list') && !api.find('inputs-shipping-list-backdrop'), 'Resizing the root closes the open list');
  assert(focusedTestID() === 'inputs-shipping', `and the trigger has focus: ${focusedTestID()}`);
  assert(state().shipping === null, 'without choosing anything');
  assert(rectOf('inputs-shipping').y < shippingRect.y, `The page re-laid out with the trigger higher: ${rectOf('inputs-shipping').y} from ${shippingRect.y}`);
  api.resizeSurface(full.width, full.height);
  await settle();
  assert(!api.find('inputs-shipping-list'), 'A root that grows again does not reopen it');
  // Closed, a select keeps no watch on the root, and it opens against the size the root has now.
  api.resizeSurface(full.width, full.height - ROOT_SHRINK_PX);
  await settle();
  const smallTrigger = rectOf('inputs-shipping');
  await click(api, 'inputs-shipping');
  const smallList = nodeOf('inputs-shipping-list');
  assert(smallList.rect.y + smallList.rect.height <= smallTrigger.y - SELECT_GAP_PX + GEOMETRY_TOLERANCE && smallList.rect.y >= SELECT_MARGIN_PX - GEOMETRY_TOLERANCE,
    `A list opened in the smaller root is placed against the smaller root: ${JSON.stringify(smallList.rect)} over ${JSON.stringify(smallTrigger)}`);
  await tap({ keycode: Key.KeyEscape });
  assert(!api.find('inputs-shipping-list') && focusedTestID() === 'inputs-shipping', 'Escape closes it and refocuses the trigger');
  api.resizeSurface(full.width, full.height);
  await settle();

  // ---- TextField: a label that focuses the input, a helper that gives way to an error, and the value in the readout ----
  const nickname = 'inputs-nickname';
  assert(api.find(`${nickname}-label`) && api.find(`${nickname}-input`) && api.find(`${nickname}-message`), 'The field has its label, input and message');
  assert(text(api, `${nickname}-message`) === 'At least 3 characters', `The helper is showing: ${text(api, `${nickname}-message`)}`);
  assert(nodeOf(`${nickname}-input`).props.ariaLabel === 'Nickname' && nodeOf(`${nickname}-input`).props.ariaDescription === 'At least 3 characters',
    `The input is named by its label and described by its helper: ${JSON.stringify([nodeOf(`${nickname}-input`).props.ariaLabel, nodeOf(`${nickname}-input`).props.ariaDescription])}`);
  await click(api, `${nickname}-label`);
  assert(focusedTestID() === `${nickname}-input`, `A press on the label focuses the input: ${focusedTestID()}`);
  const typeCharacter = async (character: string): Promise<void> => {
    await tap({ keycode: character.toUpperCase().charCodeAt(0), unicode: character.charCodeAt(0) });
  };
  await typeCharacter('a');
  await typeCharacter('b');
  assert(text(api, `${nickname}-message`) === 'Too short', `Two characters are an error: ${text(api, `${nickname}-message`)}`);
  assert(nodeOf(`${nickname}-input`).props.ariaDescription === 'Too short', 'The error is what describes the input');
  await capture('29-inputs-text-field-error', overflowing);
  await typeCharacter('c');
  assert(text(api, `${nickname}-message`) === 'At least 3 characters', `Three are not: ${text(api, `${nickname}-message`)}`);
  assert(state().nickname === 'abc', `The readout holds what was typed: ${text(api, 'inputs-json')}`);

  // The page ends in the state the controls were driven to, and all of it was one object.
  const finalState = state();
  assert(finalState.subscribe && finalState.notifications && finalState.size === 'large' && finalState.fruit === 'date'
    && finalState.shipping === null && finalState.volume === 25 && finalState.nickname === 'abc', `The final state: ${text(api, 'inputs-json')}`);
  await capture('28-inputs-final', overflowing);
  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

/** A wheel tick scrolls a container's client size divided by this (`SCROLL_PAGE_DIVISOR` in native/scroll.rs). */
const SCROLL_PAGE_DIVISOR = 8;
/** The overlay scrollbar's geometry (native/scroll.rs `SCROLLBAR_*`, plan Appendix A). */
const SCROLLBAR_THICKNESS = 6;
const SCROLLBAR_MARGIN = 2;
const SCROLLBAR_MIN_THUMB = 24;
/** The default thumb (`#64748b99`) over the white a list's right padding is: 0.4 * white + 0.6 * slate-500. */
const DEFAULT_THUMB_ON_WHITE = '#a2acb9';
/** The touch list's `scrollbar-[#e11d48]`, opaque, so it shows as itself. */
const CUSTOM_THUMB = '#e11d48';
/** A quiet list row (amber-100). */
const QUIET_ROW_FILL = '#fef3c7';
/** An offset is a float, and the reading a rounded one in places: this is the slack allowed either way. */
const SCROLL_TOLERANCE = 0.01;
/** Wheel ticks the lab's lists are scrolled by in one go. */
const SEVERAL_TICKS = 3;
/** How far a finger moves, and how often, in the flick, and how far the content must at least coast afterwards. */
const TOUCH_SLOP_PX = 8;
const FLING_STEP_PX = 15;
const FLING_STEPS = 6;
const MIN_COAST_PX = 30;
/** How often, on the engine's clock, a coasting list is looked at, and how long, in real time, it may take to stop. */
const COAST_POLL_MS = 100;
const COAST_DEADLINE_MS = 5000;
/** How far the thumb is dragged, and how far sideways the mouse strays while it is held. */
const THUMB_DRAG_PX = 30;
const THUMB_STRAY_PX = 100;
/** More Tab presses than the lab's list has rows in view, so a loop that reaches it is a bug. */
const MAX_REVEAL_TABS = 12;
/** A wheel tick over a list that the verifier expects to reach the game, as the counter sees it. */
const ONE_TICK = 1;

function near(actual: number, expected: number, tolerance = SCROLL_TOLERANCE): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

/** Wait for `count` process frames, without the 100 ms `settle` waits (a flick must be released within one). */
async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

/** How much of the last tick that reaches `max` is left over beyond it (in ticks of `tick` pixels). */
function ticksRemainder(max: number, tick: number): number {
  const ticks = max / tick;
  return Math.ceil(ticks) - ticks;
}

/**
 * Plan I5: scroll containers. Wheel, trackpad pan, keys, scrollbar thumbs, touch pans with momentum, chaining and
 * `overscroll-behavior`, clipping, hit testing in scrolled content, re-clamping after layout, the handle's commands,
 * and the counters that say scrolling touches nothing but the scrolled container.
 */
async function verifyScrolling(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  api.showLab('hud');
  await settle();
  api.showLab('scroll');
  await settle();
  move(FAR_CORNER);
  await settle();
  const scrollOf = (testID: string): NativeScrollState => {
    const state = get(api, testID).scroll;
    assert(state, `${testID} is a scroll container`);
    return state;
  };
  const top = (testID: string) => scrollOf(testID).scrollTop;
  const left = (testID: string) => scrollOf(testID).scrollLeft;
  const tickY = (testID: string) => scrollOf(testID).clientHeight / SCROLL_PAGE_DIVISOR;
  const tickX = (testID: string) => scrollOf(testID).clientWidth / SCROLL_PAGE_DIVISOR;
  const rectOf = (testID: string): LayoutRect => get(api, testID).rect;
  const stats = () => api.snapshot().stats;
  const unhandled = () => counts(api).unhandledWheels;
  const scrollingUp = MouseButton.MouseButtonWheelUp;
  const scrollingDown = MouseButton.MouseButtonWheelDown;
  const inside = (inner: LayoutRect, outer: LayoutRect) => inner.x >= outer.x - GEOMETRY_TOLERANCE && inner.y >= outer.y - GEOMETRY_TOLERANCE
    && inner.x + inner.width <= outer.x + outer.width + GEOMETRY_TOLERANCE && inner.y + inner.height <= outer.y + outer.height + GEOMETRY_TOLERANCE;

  // The row (a `testID` starting with `prefix`) that is hovered, and the one at a point. Nodes are read from the snapshot, so
  // a row's label counts as its row.
  const hoveredRow = (prefix = 'list-row-'): string | undefined => {
    const snapshot = api.snapshot();
    let current = snapshot.nodes.find(node => node.id === snapshot.hovered);
    while (current && !String(current.props.testID).startsWith(prefix)) {
      const parent: number | null = current.parent;
      current = snapshot.nodes.find(node => node.id === parent);
    }
    return current === undefined ? undefined : String(current.props.testID);
  };
  const rowUnder = (at: Vector2, prefix = 'list-row-'): string => {
    const row = api.snapshot().nodes.find(node => new RegExp(`^${prefix}\\d+$`).test(String(node.props.testID)) && node.rect.y <= at.y && at.y < node.rect.y + node.rect.height);
    assert(row, `A row is under ${at.x},${at.y}`);
    return String(row.props.testID);
  };

  // ---- Ranges: what Taffy says the content reaches, as DOM numbers ---------------------------------------------
  const initial = scrollOf('scroll-list');
  const listRect = rectOf('scroll-list');
  assert(initial.scrollTop === 0 && initial.scrollLeft === 0 && initial.minScrollTop === 0 && initial.maxScrollTop > 0,
    `A tall list starts at the top with room to scroll down: ${JSON.stringify(initial)}`);
  assert(near(initial.scrollHeight, initial.clientHeight + initial.maxScrollTop) && near(initial.clientHeight, listRect.height - 2),
    `The client area is the padding box (the border is 1 px), the scroll height the client height plus the range: ${JSON.stringify(initial)}`);
  assert(initial.maxScrollLeft === 0 && initial.thumbs?.x === null && initial.thumbs.y !== null,
    'It scrolls vertically only, so it has only a vertical scrollbar');
  assert(get(api, 'list-wrap').scroll === null && get(api, 'list-row-0').scroll === null, 'Only a scroll container has scroll state');
  const reversed = scrollOf('rev-list');
  assert(reversed.scrollTop === 0 && reversed.maxScrollTop === 0 && reversed.minScrollTop < 0
    && near(reversed.scrollHeight, reversed.clientHeight - reversed.minScrollTop),
  `A column-reverse list starts at zero with its range below it: ${JSON.stringify(reversed)}`);
  await capture('29-scroll-lab');

  // ---- Wheel: a tick is a page divided by eight; what nothing can take goes on to the game --------------------------
  const listCentre = () => centerOf(rectOf('scroll-list'));
  let gameWheels = unhandled();
  await wheel(listCentre(), scrollingDown);
  assert(near(top('scroll-list'), tickY('scroll-list')), `One wheel tick scrolls the client height / 8: ${top('scroll-list')} != ${tickY('scroll-list')}`);
  assert(unhandled() === gameWheels, 'A wheel tick a list scrolled for is consumed: the game does not get it');
  assert(text(api, 'list-status').startsWith(`top ${Math.round(tickY('scroll-list'))},`),
    `JS hears a scroll event: ${text(api, 'list-status')}`);
  await wheel(listCentre(), scrollingUp);
  assert(top('scroll-list') === 0, 'And one up goes back');
  gameWheels = unhandled();
  await wheel(listCentre(), scrollingUp);
  assert(top('scroll-list') === 0 && unhandled() === gameWheels + ONE_TICK,
    'At the top, a list has nothing to take and no container behind it: the tick goes to the game');
  gameWheels = unhandled();
  await wheel(centerOf(rectOf('scroll-title')), scrollingDown);
  assert(unhandled() === gameWheels + ONE_TICK, 'A tick over UI that does not scroll reaches the game');

  // ---- Scrolling touches nothing else: no commit, layout, restyle, paint pass or re-record -------------------------
  const quietRect = rectOf('quiet-list');
  const quietTick = tickY('quiet-list');
  const rowBefore = rectOf('quiet-row-5');
  const before = stats();
  const wheelsBefore = api.wheelEvents();
  for (let tick = 0; tick < SEVERAL_TICKS; tick++) await wheel(centerOf(quietRect), scrollingDown);
  const after = stats();
  assert(near(top('quiet-list'), SEVERAL_TICKS * quietTick), `Three ticks scroll three steps: ${top('quiet-list')}`);
  assert(api.wheelEvents() - wheelsBefore === SEVERAL_TICKS, 'JS was asked about each tick');
  for (const counter of ['batches', 'layoutPasses', 'paintPasses', 'nodesCreated', 'nodesUpdated', 'nodesDeleted', 'nodesRestyled', 'mutations', 'boxRecords', 'contentRecords'] as const) {
    assert(after[counter] === before[counter], `Scrolling leaves ${counter} alone: ${before[counter]} -> ${after[counter]}`);
  }
  assert(after.scrollUpdates - before.scrollUpdates === SEVERAL_TICKS, `Each tick moved the container once: ${before.scrollUpdates} -> ${after.scrollUpdates}`);
  assert(after.overlayRecords > before.overlayRecords, 'Only its scrollbar thumb was redrawn');
  assert(near(rectOf('quiet-row-5').y, rowBefore.y - SEVERAL_TICKS * quietTick), 'A row moved up by exactly the scroll offset');

  // ---- Clipping: what is scrolled out of view is not drawn outside the container ------------------------------------
  let image = frameImage(owner);
  const quietX = quietRect.x + quietRect.width / 2;
  const edge = (y: number) => new Vector2(quietX, y);
  assert(paintIs(image, edge(quietRect.y - 2), PAGE_FILL), `A row scrolled past the top edge does not draw above the list: ${describePaint(image, edge(quietRect.y - 2))}`);
  assert(paintIs(image, edge(quietRect.y + 8), QUIET_ROW_FILL), `Row 1 shows in the list where it straddles the edge: ${describePaint(image, edge(quietRect.y + 8))}`);
  assert(paintIs(image, edge(quietRect.y + quietRect.height + 2), PAGE_FILL), `A row past the bottom edge does not draw below the list: ${describePaint(image, edge(quietRect.y + quietRect.height + 2))}`);
  assert(paintIs(image, edge(quietRect.y + quietRect.height - 6), QUIET_ROW_FILL), 'And the part of it inside the list shows');
  await capture('30-scroll-clipped');

  // ---- Scrollbars ---------------------------------------------------------------------------------------------------
  const quiet = scrollOf('quiet-list');
  const thumb = quiet.thumbs?.y;
  assert(thumb, 'A scrolled list has a vertical thumb');
  const trackLength = quiet.clientHeight - 2 * SCROLLBAR_MARGIN;
  const thumbLength = Math.max(SCROLLBAR_MIN_THUMB, trackLength * quiet.clientHeight / quiet.scrollHeight);
  assert(near(thumb.width, SCROLLBAR_THICKNESS) && near(thumb.height, thumbLength, 0.5)
    && near(thumb.x + thumb.width, quietRect.x + quietRect.width - 1 - SCROLLBAR_MARGIN),
  `The thumb is 6 px wide at the right edge and as long as the visible share of the content: ${JSON.stringify(thumb)}`);
  const travelled = (trackLength - thumbLength) * quiet.scrollTop / quiet.maxScrollTop;
  assert(near(thumb.y, quietRect.y + 1 + SCROLLBAR_MARGIN + travelled, 0.5), `And as far along the track as the content is scrolled: ${thumb.y}`);
  const listThumb = scrollOf('scroll-list').thumbs?.y;
  assert(listThumb, 'The vertical list has a thumb');
  image = frameImage(owner);
  assert(paintIs(image, centerOf(listThumb), DEFAULT_THUMB_ON_WHITE), `The default thumb is slate-500 at 60 %: ${describePaint(image, centerOf(listThumb))}`);
  const touchThumb = scrollOf('touch-list').thumbs?.y;
  assert(touchThumb, 'The touch list has a thumb');
  assert(paintIs(image, centerOf(touchThumb), CUSTOM_THUMB), `scrollbar-[#e11d48] colours it: ${describePaint(image, centerOf(touchThumb))}`);
  const carousel = scrollOf('carousel');
  assert(carousel.maxScrollLeft > 0 && carousel.thumbs?.x === null && carousel.thumbs.y === null, 'scrollbar-none hides the bars of a list that still scrolls');
  // The look of a bar is a paint input: changing it with no scroll and no layout change redraws it.
  const touchThumbCentre = centerOf(touchThumb);
  await click(api, 'touch-bars');
  const hidden = scrollOf('touch-list');
  assert(hidden.maxScrollTop > 0 && hidden.thumbs?.y === null, 'scrollbar-none, set while the list rests, takes the bar away');
  assert(paintIs(frameImage(owner), touchThumbCentre, '#ffffff'), `And the thumb is no longer drawn: ${describePaint(frameImage(owner), touchThumbCentre)}`);
  await click(api, 'touch-bars');
  assert(paintIs(frameImage(owner), touchThumbCentre, CUSTOM_THUMB), 'Taking it off draws the thumb again');
  move(FAR_CORNER);
  await settle();

  // ---- Clicks and hover go to the content under the pointer, wherever it was scrolled to -----------------------------
  await wheel(listCentre(), scrollingDown);
  const rowBeforeScroll = hoveredRow();
  for (let tick = 0; tick < SEVERAL_TICKS; tick++) await wheel(listCentre(), scrollingDown);
  assert(near(top('scroll-list'), (SEVERAL_TICKS + 1) * tickY('scroll-list')), 'The list scrolled four steps');
  assert(hoveredRow() === rowUnder(listCentre()), `After a scroll, the hover is on the row now under the stationary pointer: ${hoveredRow()} != ${rowUnder(listCentre())}`);
  assert(hoveredRow() !== rowBeforeScroll, `The pointer is over a different row than before the scroll moved the list: ${rowBeforeScroll}`);
  const targetRow = 'list-row-3';
  assert(inside(rectOf(targetRow), listRect), `Row 3 is in view at its scrolled place: ${JSON.stringify(rectOf(targetRow))}`);
  const statusBefore = text(api, 'list-status');
  await click(api, targetRow);
  assert(text(api, 'list-status').includes('clicked row 3'), `A click at a scrolled row's place reaches that row: ${text(api, 'list-status')}`);
  assert(text(api, 'list-status') !== statusBefore && /wrap clicks 1$/.test(text(api, 'list-status')), 'And bubbles to its ancestors');
  await capture('31-scroll-list-scrolled');

  // ---- Thumb dragging ------------------------------------------------------------------------------------------------
  await click(api, 'list-top');
  assert(top('scroll-list') === 0, 'To top scrolls the list back with scrollTo (a handle command)');
  const draggable = scrollOf('scroll-list');
  const grip = draggable.thumbs?.y;
  assert(grip, 'The list has a thumb to grab');
  const travel = (draggable.clientHeight - 2 * SCROLLBAR_MARGIN) - grip.height;
  const statusBeforeDrag = text(api, 'list-status');
  const grab = centerOf(grip);
  move(grab);
  await settle();
  pointer(grab, true);
  await settle();
  move(new Vector2(grab.x - THUMB_STRAY_PX, grab.y + THUMB_DRAG_PX / 2));
  await settle();
  move(new Vector2(grab.x - THUMB_STRAY_PX, grab.y + THUMB_DRAG_PX));
  await settle();
  assert(near(top('scroll-list'), THUMB_DRAG_PX / travel * draggable.maxScrollTop, 0.5),
    `Dragging the thumb moves the content by the pointer's share of the track, even with the pointer off the bar: ${top('scroll-list')}`);
  pointer(new Vector2(grab.x - THUMB_STRAY_PX, grab.y + THUMB_DRAG_PX), false);
  await settle();
  const dragged = top('scroll-list');
  move(new Vector2(grab.x - THUMB_STRAY_PX, grab.y + 2 * THUMB_DRAG_PX));
  await settle();
  assert(top('scroll-list') === dragged, 'A released thumb is let go');
  assert(text(api, 'list-status').replace(/top \d+/, '') === statusBeforeDrag.replace(/top \d+/, ''), 'Letting go of a thumb is not a click on anything');
  await click(api, 'list-top');
  move(FAR_CORNER);
  await settle();

  // ---- Keyboard ------------------------------------------------------------------------------------------------------
  await click(api, 'list-row-1');
  assert(api.snapshot().focused === get(api, 'list-row-1').id, 'A click focuses the row button');
  const page = scrollOf('scroll-list').clientHeight;
  const line = page / SCROLL_PAGE_DIVISOR;
  const stationary = point(api, 'list-row-1');
  assert(hoveredRow() === 'list-row-1', 'The mouse rests on row 1, which it clicked');
  await keyPress(Key.KeyPagedown);
  assert(near(top('scroll-list'), page), `Page Down scrolls a page: ${top('scroll-list')}`);
  assert(hoveredRow() === rowUnder(stationary) && hoveredRow() !== 'list-row-1',
    `A key scroll under a mouse that did not move hands the hover to the row now under it: ${hoveredRow()} != ${rowUnder(stationary)}`);
  await keyPress(Key.KeyDown);
  assert(near(top('scroll-list'), page + line), `Arrow Down a page / 8: ${top('scroll-list')}`);
  await keyPress(Key.KeyUp);
  await keyPress(Key.KeyPageup);
  assert(top('scroll-list') === 0, `Arrow Up and Page Up come back: ${top('scroll-list')}`);
  await keyPress(Key.KeyEnd);
  assert(near(top('scroll-list'), scrollOf('scroll-list').maxScrollTop), 'End goes to the bottom');
  await keyPress(Key.KeyHome);
  assert(top('scroll-list') === 0, 'Home goes to the top');
  const keysToGame = counts(api).unhandledKeys;
  assert(keysToGame[Key.KeyPagedown] === undefined && keysToGame[Key.KeyHome] === undefined, 'A key that scrolled is not the game\'s');
  await keyPress(Key.KeyTab, true);
  assert(api.snapshot().focused === get(api, 'list-row-0').id, 'Shift+Tab moves to row 0');
  await keyPress(Key.KeySpace);
  assert(text(api, 'list-status').includes('clicked row 0') && top('scroll-list') === 0, 'Space on a focused button presses it and does not scroll');

  // With nothing in React listening (the quiet list has no onScroll, so no commit follows a scroll), the hover still
  // follows a scroll under a mouse that did not move.
  await click(api, 'quiet-row-1');
  assert(api.snapshot().focused === get(api, 'quiet-list').id, 'A press on a row focuses its focusable ancestor, the quiet list');
  const quietRest = point(api, 'quiet-row-1');
  const quietHovered = hoveredRow('quiet-row-');
  assert(quietHovered === 'quiet-row-1', `The mouse rests on the row it pressed: ${quietHovered}`);
  const commitsBeforeKey = stats().batches;
  await keyPress(Key.KeyPagedown);
  assert(stats().batches === commitsBeforeKey, 'The key scroll committed nothing');
  assert(hoveredRow('quiet-row-') === rowUnder(quietRest, 'quiet-row-') && hoveredRow('quiet-row-') !== quietHovered,
    `A scroll under a mouse that did not move hands the hover to the row now under it, with no React in between: ${hoveredRow('quiet-row-')}`);
  await keyPress(Key.KeyHome);
  move(FAR_CORNER);
  await settle();
  api.grabSurfaceFocus();
  await settle();

  // The list itself takes focus, and Space then pages (Shift+Space back).
  await click(api, 'scroll-title');
  assert(api.snapshot().focused === null, 'Pressing something that takes no focus clears it');
  // The press also gave Godot's key focus back; the owner takes it, as a game that wants the keyboard does.
  api.grabSurfaceFocus();
  await settle();
  await keyPress(Key.KeyTab);
  assert(api.snapshot().focused === get(api, 'scroll-list').id, 'Tab\'s first stop is the first scroll container');
  await keyPress(Key.KeySpace);
  assert(near(top('scroll-list'), page), `Space on a scroll container pages down: ${top('scroll-list')}`);
  await keyPress(Key.KeySpace, true);
  assert(top('scroll-list') === 0, 'Shift+Space pages back up');
  keyEvent({ keycode: Key.KeyDown, ctrl: true }, true);
  await settle();
  keyEvent({ keycode: Key.KeyDown, ctrl: true }, false);
  await settle();
  assert(top('scroll-list') === 0, 'A chord with Ctrl is not a scrolling key');

  // Tab to a button below the fold scrolls it into view, and Shift+Tab back up.
  await click(api, 'list-row-0');
  const visible = (testID: string) => inside(rectOf(testID), rectOf('scroll-list'));
  let reached = 0;
  for (let step = 0; step < MAX_REVEAL_TABS && top('scroll-list') === 0; step++) {
    await keyPress(Key.KeyTab);
    reached += 1;
    assert(api.snapshot().focused === get(api, `list-row-${reached}`).id, `Tab visits the rows in order: ${reached}`);
    assert(visible(`list-row-${reached}`), `The focused row is shown: row ${reached}, ${JSON.stringify(rectOf(`list-row-${reached}`))}`);
  }
  assert(top('scroll-list') > 0, 'Tabbing past the last row in view scrolled the list to show the next');
  assert(api.snapshot().focusVisible, 'It is a keyboard focus');
  await capture('32-scroll-tab-reveals');
  for (let step = 0; step < reached; step++) await keyPress(Key.KeyTab, true);
  assert(api.snapshot().focused === get(api, 'list-row-0').id && visible('list-row-0'), 'Shift+Tab back to row 0 shows it');

  // The handle's commands.
  await click(api, 'list-reveal');
  assert(visible('list-row-24'), `scrollIntoView shows a row far below the fold: ${JSON.stringify(rectOf('list-row-24'))}`);
  await click(api, 'list-top');
  assert(top('scroll-list') === 0, 'scrollTo({ top: 0 }) goes back');

  // ---- Re-clamping: the content shrinks under a scrolled list --------------------------------------------------------
  await click(api, 'list-row-0');
  await keyPress(Key.KeyEnd);
  const tallMax = scrollOf('scroll-list').maxScrollTop;
  assert(near(top('scroll-list'), tallMax) && tallMax > 0, 'The list is scrolled to the bottom');
  const updates = stats().scrollUpdates;
  await click(api, 'list-shrink');
  const shortened = scrollOf('scroll-list');
  assert(shortened.maxScrollTop < tallMax && near(shortened.scrollTop, shortened.maxScrollTop),
    `Layout re-clamps the offset to the new range: ${shortened.scrollTop} of ${shortened.maxScrollTop}`);
  assert(stats().scrollUpdates > updates && text(api, 'list-status').includes(`top ${Math.round(shortened.scrollTop)},`), 'And JS hears the move');
  await click(api, 'list-shrink');
  await click(api, 'list-top');

  // ---- Shift+wheel, horizontal ticks, a prevented wheel --------------------------------------------------------------
  const carouselCentre = () => centerOf(rectOf('carousel'));
  gameWheels = unhandled();
  await wheel(carouselCentre(), scrollingDown, { shift: true });
  assert(near(left('carousel'), tickX('carousel')) && top('carousel') === 0, `Shift+wheel scrolls sideways: ${left('carousel')}`);
  await wheel(carouselCentre(), MouseButton.MouseButtonWheelRight);
  assert(near(left('carousel'), 2 * tickX('carousel')), `A horizontal tick does too: ${left('carousel')}`);
  await wheel(carouselCentre(), MouseButton.MouseButtonWheelLeft);
  await wheel(carouselCentre(), MouseButton.MouseButtonWheelLeft);
  assert(left('carousel') === 0, 'And back');
  await wheel(carouselCentre(), scrollingDown, { ctrl: true });
  assert(left('carousel') === 0 && unhandled() === gameWheels, 'A wheel JS prevents scrolls nothing and is not the game\'s');
  await wheel(carouselCentre(), scrollingDown);
  assert(left('carousel') === 0 && unhandled() === gameWheels + ONE_TICK, 'A plain vertical tick over a horizontal carousel has nothing to scroll: it reaches the game');

  // ---- Reversed content ----------------------------------------------------------------------------------------------
  gameWheels = unhandled();
  await wheel(centerOf(rectOf('rev-list')), scrollingDown);
  assert(top('rev-list') === 0 && unhandled() === gameWheels + ONE_TICK, 'A column-reverse list starts at its end: down has nowhere to go');
  const reversedThumbAtRest = scrollOf('rev-list').thumbs?.y;
  assert(reversedThumbAtRest, 'It has a thumb');
  await wheel(centerOf(rectOf('rev-list')), scrollingUp);
  assert(near(top('rev-list'), -tickY('rev-list')), `Up scrolls towards the far content, to a negative offset: ${top('rev-list')}`);
  const reversedThumb = scrollOf('rev-list').thumbs?.y;
  assert(reversedThumb && reversedThumb.y < reversedThumbAtRest.y, 'A reversed list\'s thumb starts at the far end of its track and moves up as it scrolls');

  // ---- Trackpad pan gesture -------------------------------------------------------------------------------------------
  const panWheels = api.wheelEvents();
  const panBefore = top('scroll-list');
  gameWheels = unhandled();
  await pan(listCentre(), new Vector2(0, 1));
  const panned = api.wheelEvents() - panWheels;
  assert(panned >= 1 && near(top('scroll-list') - panBefore, panned * tickY('scroll-list')),
    `A pan gesture scrolls a page / 8 per unit of delta, once per delivery (${panned}): ${top('scroll-list') - panBefore}`);
  assert(unhandled() === gameWheels, 'A pan a list scrolled for is consumed');
  await click(api, 'list-top');

  // ---- Chaining and overscroll-behavior ------------------------------------------------------------------------------
  const toInnerEnd = async (name: 'chain' | 'contain') => {
    const inner = `${name}-inner`;
    const outer = `${name}-outer`;
    const point = () => centerOf(rectOf(inner));
    const innerMax = scrollOf(inner).maxScrollTop;
    const innerTick = tickY(inner);
    assert(innerMax > 0 && scrollOf(outer).maxScrollTop > 0, `${name}: both lists scroll`);
    const ticksToEnd = Math.ceil(innerMax / innerTick);
    for (let tick = 0; tick < ticksToEnd - 1; tick++) await wheel(point(), scrollingDown);
    assert(top(outer) === 0 && top(inner) < innerMax, `${name}: while the inner list can scroll, the outer one stays`);
    const gameBefore = unhandled();
    await wheel(point(), scrollingDown);
    assert(near(top(inner), innerMax), `${name}: the inner list reaches its end`);
    return { point, innerMax, innerTick, gameBefore };
  };
  {
    const { point, innerMax, innerTick, gameBefore } = await toInnerEnd('chain');
    const spill = top('chain-outer');
    assert(spill > 0 && near(spill, ticksRemainder(innerMax, innerTick) * tickY('chain-outer'), 0.05),
      `chain: the tick that overshoots the inner end spills the rest of itself to the outer list: ${spill}`);
    await wheel(point(), scrollingDown);
    assert(near(top('chain-outer'), spill + tickY('chain-outer')) && near(top('chain-inner'), innerMax), 'chain: then the outer list takes the ticks');
    assert(unhandled() === gameBefore, 'chain: and the game gets none of them');
    await capture('33-scroll-chained');
    // The inner list scrolls out of view as the outer one moves, so the rest of the ticks aim at the outer list.
    const outerMax = scrollOf('chain-outer').maxScrollTop;
    const outerPoint = () => centerOf(rectOf('chain-outer'));
    for (let tick = 0; tick < outerMax / tickY('chain-outer') + 2; tick++) await wheel(outerPoint(), scrollingDown);
    const stuck = unhandled();
    await wheel(outerPoint(), scrollingDown);
    assert(near(top('chain-outer'), outerMax) && unhandled() === stuck + ONE_TICK, 'chain: with both at the end the tick reaches the game');
  }
  {
    const { point, innerMax, gameBefore } = await toInnerEnd('contain');
    for (let tick = 0; tick < SEVERAL_TICKS; tick++) await wheel(point(), scrollingDown);
    assert(top('contain-outer') === 0 && near(top('contain-inner'), innerMax), 'contain: overscroll-contain keeps the scroll the inner list cannot take from the outer one');
    assert(unhandled() === gameBefore, 'contain: and from the game');
    await capture('34-scroll-contained');
  }

  // ---- Touch: a pan scrolls, cancels the pointer, coasts; touch-none keeps the pointer events --------------------------
  const touchList = () => rectOf('touch-list');
  const touchStatus = () => text(api, 'touch-status');
  const rowAt = (y: number): Vector2 => new Vector2(touchList().x + touchList().width / 2, y);
  const start = rowAt(touchList().y + touchList().height - 40);

  // A tap on a row clicks it, scroller or not.
  touch(FIRST_TOUCH, start, true);
  await settle();
  touch(FIRST_TOUCH, start, false);
  await settle();
  assert(touchStatus().endsWith('clicks 1'), `A tap on a button in a scroll container clicks it: ${touchStatus()}`);

  // A pan: the pointer is cancelled, the content follows the finger from where the slop was crossed, no click follows.
  api.resetPointerCancels();
  touch(FIRST_TOUCH, start, true);
  await settle();
  touchDrag(FIRST_TOUCH, new Vector2(start.x, start.y - TOUCH_SLOP_PX / 2), new Vector2(0, -TOUCH_SLOP_PX / 2));
  await settle();
  assert(top('touch-list') === 0 && api.pointerCancels() === 0, 'Within the slop the touch is still a tap');
  touchDrag(FIRST_TOUCH, new Vector2(start.x, start.y - TOUCH_SLOP_PX - 4), new Vector2(0, -TOUCH_SLOP_PX / 2 - 4));
  await settle();
  assert(api.pointerCancels() === 1, `Beyond the slop the pan starts and the pointer is cancelled: ${api.pointerCancels()}`);
  assert(top('touch-list') === 0, 'The distance up to the slop is not scrolled');
  const pannedTo = start.y - TOUCH_SLOP_PX - 24;
  touchDrag(FIRST_TOUCH, new Vector2(start.x, pannedTo), new Vector2(0, -20));
  await settle();
  assert(near(top('touch-list'), 20), `The content follows the finger: ${top('touch-list')}`);
  touchDrag(FIRST_TOUCH, new Vector2(start.x, pannedTo + 5), new Vector2(0, 5));
  await settle();
  assert(near(top('touch-list'), 15), `And back when the finger returns: ${top('touch-list')}`);
  await capture('35-scroll-touch-pan');
  touch(FIRST_TOUCH, new Vector2(start.x, pannedTo + 5), false);
  await settle();
  assert(touchStatus().endsWith('clicks 1'), `No click follows a pan: ${touchStatus()}`);
  assert(api.snapshot().pointers.every(record => !record.down), 'The pan left no pointer down');
  const afterPan = top('touch-list');
  await settle();
  assert(top('touch-list') === afterPan, 'A pan whose finger stopped before it lifted does not coast');
  await click(api, 'touch-top');
  assert(top('touch-list') === 0, 'The list\'s Top button scrolls it back');

  // touch-none: the pad keeps the finger's events.
  const pad = centerOf(rectOf('touch-pad'));
  const scrolledBefore = top('touch-list');
  api.resetPointerCancels();
  touch(FIRST_TOUCH, pad, true);
  await settle();
  // 16 px in four steps: beyond the slop at the third, where arbitration would hand the touch to the list.
  for (let step = 1; step <= 4; step++) {
    touchDrag(FIRST_TOUCH, new Vector2(pad.x, pad.y + 4 * step), new Vector2(0, 4));
    await settle();
  }
  touch(FIRST_TOUCH, new Vector2(pad.x, pad.y + 16), false);
  await settle();
  assert(top('touch-list') === scrolledBefore && api.pointerCancels() === 0, 'touch-action: none keeps a touch from panning');
  assert(/moves [1-9]\d*, cancels 0/.test(touchStatus()) && /down 1/.test(touchStatus()), `The pad gets pointermove instead: ${touchStatus()}`);

  // A pointer JS captured is its element's: no pan for a finger, no thumb drag for the mouse (plan 3.12 rule 1, D33).
  const captureStatus = () => text(api, 'capture-status');
  const captureMoves = () => Number(/moves (\d+)/.exec(captureStatus())?.[1]);
  assert(scrollOf('capture-list').maxScrollTop > 0 && top('capture-list') === 0, 'The captured list has something to scroll');
  const captureRect = rectOf('capture-list');
  const captured = centerOf(captureRect);
  api.resetPointerCancels();
  touch(FIRST_TOUCH, captured, true);
  await settle();
  for (let step = 1; step <= 4; step++) {
    touchDrag(FIRST_TOUCH, new Vector2(captured.x, captured.y - 4 * step), new Vector2(0, -4));
    await settle();
  }
  touch(FIRST_TOUCH, new Vector2(captured.x, captured.y - 16), false);
  await settle();
  assert(top('capture-list') === 0 && api.pointerCancels() === 0,
    `A finger whose pointerdown captured it is not panned, though it moved beyond the slop: top ${top('capture-list')}, cancels ${api.pointerCancels()}`);
  assert(/down 1, moves [1-9]\d*, cancels 0/.test(captureStatus()), `The captured list gets the finger's moves instead: ${captureStatus()}`);
  const captureGrip = scrollOf('capture-list').thumbs?.y;
  assert(captureGrip, 'The captured list has a thumb');
  const captureGrab = centerOf(captureGrip);
  move(captureGrab);
  await settle();
  const movesBeforeThumb = captureMoves();
  pointer(captureGrab, true);
  await settle();
  move(new Vector2(captureGrab.x, captureGrab.y + THUMB_DRAG_PX / 2));
  await settle();
  move(new Vector2(captureGrab.x, captureGrab.y + THUMB_DRAG_PX));
  await settle();
  assert(top('capture-list') === 0, `A press on a thumb whose pointerdown captured the mouse drags nothing: ${top('capture-list')}`);
  assert(captureMoves() >= movesBeforeThumb + 2, `The list that captured the mouse hears its moves: ${movesBeforeThumb} -> ${captureMoves()}`);
  pointer(new Vector2(captureGrab.x, captureGrab.y + THUMB_DRAG_PX), false);
  await settle();
  move(FAR_CORNER);
  await settle();

  // A flick: the finger is moving at the end, so the content coasts and stops by itself.
  const flickFrom = rowAt(touchList().y + touchList().height - 20);
  const flick = async (): Promise<Vector2> => {
    touch(FIRST_TOUCH, flickFrom, true);
    await frames(2);
    let finger = flickFrom;
    for (let step = 1; step <= FLING_STEPS; step++) {
      finger = new Vector2(flickFrom.x, flickFrom.y - step * FLING_STEP_PX);
      touchDrag(FIRST_TOUCH, finger, new Vector2(0, -FLING_STEP_PX));
      await frames(2);
    }
    return finger;
  };
  let finger = await flick();
  touch(FIRST_TOUCH, finger, false);
  await frames(1);
  const released = top('touch-list');
  await frames(6);
  const coasted = top('touch-list');
  assert(coasted > released + MIN_COAST_PX, `The content keeps going after the finger lifts: ${released} -> ${coasted}`);
  assert(coasted <= scrollOf('touch-list').maxScrollTop, 'And stays within its range');

  // A touch that lands on the coasting content stops it, and does not click.
  const clicksBefore = touchStatus();
  const landing = rowAt(touchList().y + touchList().height / 2);
  touch(FIRST_TOUCH, landing, true);
  await frames(1);
  const stopped = top('touch-list');
  await settle();
  assert(top('touch-list') === stopped, 'A touch stops the coasting content');
  touch(FIRST_TOUCH, landing, false);
  await settle();
  assert(touchStatus().endsWith(clicksBefore.slice(clicksBefore.lastIndexOf('clicks'))), `The tap that stopped it does not click: ${touchStatus()}`);

  // The lift of a touch that stopped a flick spends that record even when the element it landed on removed itself under
  // the finger (its press went with it): the next tap is a tap, not another one that "stopped a fling".
  await click(api, 'touch-top');
  finger = await flick();
  touch(FIRST_TOUCH, finger, false);
  await frames(1);
  const vanishAt = point(api, 'touch-vanish');
  touch(FIRST_TOUCH, vanishAt, true);
  await settle();
  assert(!api.find('touch-vanish'), 'The button the finger landed on removed itself on pointerdown');
  touch(FIRST_TOUCH, vanishAt, false);
  await settle();
  const touchClicks = () => Number(/clicks (\d+)$/.exec(touchStatus())?.[1]);
  const clicksBeforeNextTap = touchClicks();
  const nextTap = rowAt(touchList().y + touchList().height / 2);
  touch(FIRST_TOUCH, nextTap, true);
  await settle();
  touch(FIRST_TOUCH, nextTap, false);
  await settle();
  assert(touchClicks() === clicksBeforeNextTap + 1, `The next tap clicks: ${touchStatus()}`);
  await click(api, 'touch-vanish-restore');

  // Left alone, the same flick coasts to a stop by itself.
  await click(api, 'touch-top');
  finger = await flick();
  touch(FIRST_TOUCH, finger, false);
  const deadline = Date.now() + COAST_DEADLINE_MS;
  let last = Number.NaN;
  while (Date.now() < deadline) {
    await waitEngineTime(COAST_POLL_MS);
    const now = top('touch-list');
    if (now === last) break;
    last = now;
  }
  assert(top('touch-list') === last && last > FLING_STEPS * FLING_STEP_PX - TOUCH_SLOP_PX, `A flick comes to rest on its own, further than the finger went: ${last}`);
  const idle = stats();
  await settle();
  assert(stats().scrollUpdates === idle.scrollUpdates, 'A resting container asks for no more frames of scrolling');

  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

/** The selection highlight (`DEFAULT_SELECTION_COLOR`, blue-500 at 35 %) and the lab's `selection-[#f43f5e80]` (rose-500 at 50 %), over white. */
const DEFAULT_HIGHLIGHT_ON_WHITE = blend('#3b82f6', '#ffffff', 0x59 / 255);
const ROSE_HIGHLIGHT_ON_WHITE = blend('#f43f5e', '#ffffff', 0x80 / 255);
/** The lab's text colour (`text-slate-900`) and how far ink may stray from it: the text is drawn over the highlight, not under it. */
const SELECTION_TEXT_COLOR = Color.fromString('#0f172a', new Color(0, 0, 0, 1));
const INK_TOLERANCE = 0.06;
const HIGHLIGHT_TOLERANCE = 0.03;
/** A point this far below a paragraph's top is on its first line (the lab's 14 px text lines are taller than this). */
const FIRST_LINE_PROBE_Y = 6;
/** A point this far in from a paragraph's left edge is on its first glyph's left half. */
const FIRST_GLYPH_PROBE_X = 1;
/** The font size of the lab's `text-sm` text, which the verifier measures words with. */
const LAB_FONT_SIZE = 14;
/** At least this share of the pixels inside a highlighted run's box must be highlight (the rest is ink and its edges). */
const MIN_HIGHLIGHT_SHARE = 0.5;
/** The grid step of the pixel scans, and how far in from a short text's padding they start. */
const SCAN_STEP_PX = 2;
const SHORT_TEXT_PADDING_PX = 4;
/** A second press this close to the last one, within the click interval, would count as a double click. */
const SAME_SPOT_PX = 6;
/** A row has to be scrolled this far past the list's top edge to show it is clipped there, and this much of it has to remain in view. */
const MIN_CLIPPED_PX = 3;
const MIN_VISIBLE_ROW_PX = 3;
/** More wheel ticks than it takes to scroll a row of the lab's list past its top edge: a loop that reaches it is a bug. */
const MAX_SELECTION_SCROLL_TICKS = 12;
/** The rows of the lab's list (`LIST_ROWS` in demo/src/selection-lab.tsx), and the last of them: the end of the selectable text. */
const SELECTION_LAB_ROWS = 10;
const LAST_SELECTION_ROW = `sel-row-${SELECTION_LAB_ROWS - 1}`;

/** The lab's selectable texts in document order: what select all copies. */
const SELECTABLE_LAB_TEXTS = [
  'sel-p1', 'sel-p2', 'sel-live', 'sel-tail', 'sel-captured', 'sel-prevented', 'sel-short', 'sel-rose', 'sel-counter',
  ...Array.from({length: SELECTION_LAB_ROWS}, (_, index) => `sel-row-${index}`),
];

/** The share of the pixels of `area`, every `SCAN_STEP_PX`, that are `expected`; and the darkest pixel. */
function scanArea(image: Image, area: LayoutRect, expected: Color): { share: number; darkest: Color } {
  let matching = 0;
  let total = 0;
  let darkest = new Color(1, 1, 1, 1);
  for (let y = Math.ceil(area.y); y < area.y + area.height; y += SCAN_STEP_PX) {
    for (let x = Math.ceil(area.x); x < area.x + area.width; x += SCAN_STEP_PX) {
      const color = image.getPixel(x, y);
      total += 1;
      if (paintNear(image, new Vector2(x, y), expected, HIGHLIGHT_TOLERANCE)) matching += 1;
      if (color.r + color.g + color.b < darkest.r + darkest.g + darkest.b) darkest = color;
    }
  }
  return {share: total === 0 ? 0 : matching / total, darkest};
}

/** A short text's box without its padding: where its glyph run is, which a highlight covers. */
function glyphArea(rect: LayoutRect): LayoutRect {
  return {x: rect.x + SHORT_TEXT_PADDING_PX, y: rect.y, width: rect.width - 2 * SHORT_TEXT_PADDING_PX, height: rect.height};
}

/**
 * Plan I6: text selection. `select-text` opts text in and `select-none` opts a part of it out; a click collapses,
 * a double click selects a word, a triple click the node's text, a drag extends (across paragraphs, skipping
 * `select-none` text, and past the ends), Shift+click extends; a Button, an element that captured the pointer or
 * prevented `pointerdown`, and text with no `select-text` start nothing and clear what was selected. The root
 * takes key focus with a selection and gives it back when the selection goes; Cmd/Ctrl+C copies and Cmd/Ctrl+A
 * selects all; a change of the text, or removal, of what is selected clears it; the highlight is drawn under the
 * text and scrolls and clips with its list. The keys are injected from the verifier's own device and still copy and select all:
 * the root matches those `InputMap` actions as the keyboard's, whatever device a key came from (D44 T3).
 */
async function verifySelection(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  const left = MouseButton.MouseButtonLeft;
  const commandIsMeta = OS.hasFeature('macos');
  api.showLab('hud');
  await settle();
  api.showLab('selection');
  await settle();
  move(FAR_CORNER);
  await settle();
  api.resetSelectionChanges();

  const rectOf = (testID: string): LayoutRect => get(api, testID).rect;
  const textOf = (testID: string): string => get(api, testID).text;
  const firstLine = (testID: string, x = FIRST_GLYPH_PROBE_X) => new Vector2(rectOf(testID).x + x, rectOf(testID).y + FIRST_LINE_PROBE_Y);
  const selected = () => api.selection();
  const ends = (): string => text(api, 'sel-ends');

  // A press near the last one, soon after it, would be part of its click sequence; every gesture starts a new one.
  let lastPress: { at: Vector2; ms: number } | undefined;
  const newSequence = async (at: Vector2): Promise<void> => {
    if (lastPress !== undefined && lastPress.at.distanceTo(at) <= SAME_SPOT_PX) {
      const wait = CLICK_SEQUENCE_PAUSE_MS - (Time.getTicksMsec() - lastPress.ms);
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    }
    lastPress = {at, ms: Time.getTicksMsec()};
  };
  /** The mouse over `at`, then `times` presses and releases, which a quick run counts as a double or triple click. */
  const clickAt = async (at: Vector2, times = 1, shift = false): Promise<void> => {
    await newSequence(at);
    move(at);
    await settle();
    for (let press = 0; press < times; press++) {
      mouseButton(at, left, true, {shift});
      mouseButton(at, left, false, {shift});
    }
    await settle();
  };
  const pressAt = async (at: Vector2): Promise<void> => {
    await newSequence(at);
    move(at);
    await settle();
    mouseButton(at, left, true);
    await settle();
  };
  const releaseAt = async (at: Vector2): Promise<void> => {
    mouseButton(at, left, false);
    await settle();
  };
  /** Press at `from`, move through `through` and to `to`, release there. */
  const dragSelect = async (from: Vector2, to: Vector2, through: readonly Vector2[] = []): Promise<void> => {
    await pressAt(from);
    for (const step of [...through, to]) {
      move(step);
      await settle();
    }
    await releaseAt(to);
  };
  const chord = async (keycode: Key): Promise<void> => tap({keycode, ctrl: !commandIsMeta, meta: commandIsMeta});
  const unhandled = (keycode: Key): number => counts(api).unhandledKeys[keycode] ?? 0;
  const same = (selection: ReturnType<typeof selected>, anchor: string, anchorOffset: number, focus: string, focusOffset: number): boolean =>
    selection !== undefined && selection.anchor.node.testID === anchor && selection.anchor.offset === anchorOffset
    && selection.focus.node.testID === focus && selection.focus.offset === focusOffset;
  const font = ThemeDB.fallbackFont;
  assert(font, 'The engine has a fallback font');
  /** The middle of `word` in `testID`'s first line, measured with the font the lab's text uses. */
  const middleOf = (testID: string, word: string): Vector2 => {
    const paragraph = textOf(testID);
    const start = paragraph.indexOf(word);
    assert(start >= 0, `${testID} contains ${word}`);
    const before = font.getStringSize(paragraph.slice(0, start), HorizontalAlignment.HorizontalAlignmentLeft, -1, LAB_FONT_SIZE).x;
    const inside = font.getStringSize(word, HorizontalAlignment.HorizontalAlignmentLeft, -1, LAB_FONT_SIZE).x;
    return firstLine(testID, before + inside / 2);
  };
  const p1 = textOf('sel-p1');
  const p2 = textOf('sel-p2');
  const none = textOf('sel-none');
  const p1Start = firstLine('sel-p1');
  const p1Middle = firstLine('sel-p1', rectOf('sel-p1').width / 2);
  const intoSecond = firstLine('sel-p2', rectOf('sel-p2').width / 3);
  const nonePoint = centerOf(rectOf('sel-none'));
  const plainPoint = centerOf(rectOf('sel-plain'));
  const buttonPoint = point(api, 'sel-button');

  // ---- Nothing is selectable until text opts in, and the cursor says so --------------------------------------------
  assert(selected() === undefined, 'Nothing is selected at first');
  assert(api.cursorShapeAt(p1Start.x, p1Start.y) === Control.CursorShape.CursorIbeam, 'Selectable text shows the text cursor');
  assert(api.cursorShapeAt(plainPoint.x, plainPoint.y) === Control.CursorShape.CursorArrow, 'Text with no select-text keeps the arrow');
  assert(api.cursorShapeAt(nonePoint.x, nonePoint.y) === Control.CursorShape.CursorArrow, 'select-none text inside a select-text card keeps the arrow');
  assert(api.cursorShapeAt(buttonPoint.x, buttonPoint.y) !== Control.CursorShape.CursorIbeam, 'A Button label inherits select-text but is not selectable: no text cursor');
  await clickAt(plainPoint);
  assert(selected() === undefined && api.selectionChanges() === 0, 'A click on text that is not select-text selects nothing');
  assert(!api.surfaceHasFocus() && api.snapshot().focused === null, 'A press that selects nothing and focuses nothing leaves the keys to the game');

  // ---- A click collapses ---------------------------------------------------------------------------------------------
  await clickAt(p1Start);
  assert(same(selected(), 'sel-p1', 0, 'sel-p1', 0) && selected()?.isCollapsed === true, `A click collapses at the glyph under it: ${JSON.stringify(selected())}`);
  assert(api.selectionChanges() === 1, `And is one selectionchange for the root: ${api.selectionChanges()}`);
  assert(api.surfaceHasFocus() && api.snapshot().focused === null, 'Starting a selection takes Godot key focus for the root without focusing an element');
  assert(ends().includes('anchor sel-p1:0, focus sel-p1:0, collapsed'), `useTextSelection follows it: ${ends()}`);
  await clickAt(p1Start);
  assert(api.selectionChanges() === 1, 'Clicking the same place again changes nothing, so it is not another selectionchange');

  // ---- A double click selects the word, a triple click the node's text ------------------------------------------------
  await clickAt(p1Start, 2);
  assert(same(selected(), 'sel-p1', 0, 'sel-p1', 'The'.length) && selected()?.text === 'The', `A double click selects the word: ${JSON.stringify(selected())}`);
  await clickAt(middleOf('sel-p1', 'brown'), 2);
  const brown = p1.indexOf('brown');
  assert(same(selected(), 'sel-p1', brown, 'sel-p1', brown + 'brown'.length), `A double click in the middle of a word selects that word: ${JSON.stringify(selected())}`);
  assert(text(api, 'sel-readout') === 'selected: "brown"', `The readout shows it: ${text(api, 'sel-readout')}`);
  await clickAt(p1Start, 3);
  assert(same(selected(), 'sel-p1', 0, 'sel-p1', p1.length) && selected()?.text === p1, `A triple click selects the node's whole text: ${JSON.stringify(selected())}`);
  await capture('selection-01-paragraph');

  // ---- A drag across paragraphs skips the select-none sentence between them -------------------------------------------
  await dragSelect(p1Start, intoSecond, [nonePoint]);
  const across = selected();
  assert(across !== undefined && across.anchor.node.testID === 'sel-p1' && across.anchor.offset === 0 && across.focus.node.testID === 'sel-p2',
    `A drag from the first paragraph to the second selects from one into the other: ${JSON.stringify(across)}`);
  assert(across.focus.offset > 0 && across.focus.offset < p2.length, `It ends inside the second paragraph: ${across.focus.offset}`);
  assert(across.text === `${p1}\n${p2.slice(0, across.focus.offset)}`, `Its text is the first paragraph, a newline and the start of the second: ${JSON.stringify(across.text)}`);
  assert(!across.text.includes(none) && !across.text.includes('select-none'), 'The select-none sentence between them is skipped');
  assert(text(api, 'sel-readout') === `selected: ${JSON.stringify(across.text)}`, 'The readout follows the drag');
  await capture('selection-02-across');

  // While the button is down, a pointer over the select-none sentence puts the focus at the start of the next selectable text.
  await pressAt(p1Start);
  move(nonePoint);
  await settle();
  assert(same(selected(), 'sel-p1', 0, 'sel-p2', 0) && selected()?.text === p1,
    `Over a select-none sentence the drag reaches the start of the text after it: ${JSON.stringify(selected())}`);
  move(p1Middle);
  await settle();
  assert(selected()?.focus.node.testID === 'sel-p1' && (selected()?.focus.offset ?? 0) > 0, 'And back over the first paragraph the focus follows');
  await releaseAt(p1Middle);

  // A backwards drag keeps the anchor where the press was.
  await dragSelect(intoSecond, p1Middle);
  const backwards = selected();
  assert(backwards !== undefined && backwards.anchor.node.testID === 'sel-p2' && backwards.focus.node.testID === 'sel-p1',
    `Dragging up keeps the anchor where it began and puts the focus before it: ${JSON.stringify(backwards)}`);
  assert(backwards.text === `${p1.slice(backwards.focus.offset)}\n${p2.slice(0, backwards.anchor.offset)}`, `Its text is in document order: ${JSON.stringify(backwards.text)}`);

  // A drag that ends past everything selects to the end of the last selectable text.
  await dragSelect(p1Start, new Vector2(p1Start.x, api.snapshot().height - 1));
  assert(same(selected(), 'sel-p1', 0, LAST_SELECTION_ROW, textOf(LAST_SELECTION_ROW).length),
    `A pointer below all the text reaches the end of the last selectable text: ${JSON.stringify(selected())}`);

  // ---- Shift+click extends ---------------------------------------------------------------------------------------------
  await clickAt(p1Start);
  await clickAt(intoSecond, 1, true);
  const shifted = selected();
  assert(shifted !== undefined && shifted.anchor.node.testID === 'sel-p1' && shifted.anchor.offset === 0 && shifted.focus.node.testID === 'sel-p2' && shifted.focus.offset > 0,
    `Shift+click extends from the click that began the selection: ${JSON.stringify(shifted)}`);
  assert(shifted.text === `${p1}\n${p2.slice(0, shifted.focus.offset)}`, 'And selects the same text a drag would');

  // ---- A press that cannot select clears what was selected, and the root gives its key focus back -------------------------
  await clickAt(nonePoint);
  assert(selected() === undefined && !api.surfaceHasFocus(), 'A press on select-none text selects nothing, clears the selection and releases key focus');
  assert(ends() === 'no ends' && text(api, 'sel-readout') === 'selected: nothing', 'The readout follows it');
  await clickAt(p1Start, 3);
  assert(selected()?.text === p1, 'Selected again');
  await clickAt(buttonPoint);
  assert(selected() === undefined, 'A press on a Button clears the selection and starts none, though its label inherits select-text');
  assert(api.snapshot().focused === get(api, 'sel-button').id && api.surfaceHasFocus(), 'The Button took focus, and with it the root holds key focus');
  await dragSelect(buttonPoint, intoSecond);
  assert(selected() === undefined, 'A drag that begins on a Button selects nothing');
  // JS wins the press: capture and preventDefault leave nothing for native to select.
  await clickAt(p1Start, 3);
  assert(selected()?.text === p1, 'Selected again');
  const captured = rectOf('sel-captured');
  await dragSelect(new Vector2(captured.x + captured.width / 4, captured.y + FIRST_LINE_PROBE_Y), new Vector2(captured.x + captured.width * 3 / 4, captured.y + FIRST_LINE_PROBE_Y));
  assert(selected() === undefined, 'A pointer an element captured is its element\'s: no selection starts (and the old one is cleared)');
  await clickAt(p1Start, 3);
  const vetoed = rectOf('sel-prevented');
  await dragSelect(new Vector2(vetoed.x + vetoed.width / 4, vetoed.y + FIRST_LINE_PROBE_Y), new Vector2(vetoed.x + vetoed.width * 3 / 4, vetoed.y + FIRST_LINE_PROBE_Y));
  assert(selected()?.text === p1, 'A prevented pointerdown leaves the selection alone, and starts none');

  // ---- Copy and select all -----------------------------------------------------------------------------------------------
  await clickAt(p1Start, 3);
  verifierClipboard.set('before the copy');
  const copiedKeys = unhandled(Key.KeyC);
  await chord(Key.KeyC);
  assert(verifierClipboard.get() === p1, `Cmd/Ctrl+C puts the selected text on the clipboard: ${JSON.stringify(verifierClipboard.get())}`);
  assert(unhandled(Key.KeyC) === copiedKeys, 'The key that copied is consumed: the game does not see it');
  await dragSelect(p1Start, intoSecond, [nonePoint]);
  const dragged = selected();
  assert(dragged !== undefined, 'A drag selected something');
  await chord(Key.KeyC);
  assert(verifierClipboard.get() === dragged.text && verifierClipboard.get().includes('\n') && !verifierClipboard.get().includes('select-none'),
    `A selection across paragraphs copies their text joined by a newline, without the select-none sentence: ${JSON.stringify(verifierClipboard.get())}`);
  await clickAt(p1Start);
  verifierClipboard.set('untouched');
  const uncopiedKeys = unhandled(Key.KeyC);
  await chord(Key.KeyC);
  assert(verifierClipboard.get() === 'untouched' && unhandled(Key.KeyC) === uncopiedKeys + 1,
    'A collapsed selection has nothing to copy: the clipboard is left alone and the key goes to the game');
  const selectAllKeys = unhandled(Key.KeyA);
  await chord(Key.KeyA);
  const everything = SELECTABLE_LAB_TEXTS.map(testID => textOf(testID)).join('\n');
  assert(selected()?.text === everything, `Cmd/Ctrl+A selects all the selectable text, in order, and none of the rest: ${JSON.stringify(selected()?.text)}`);
  assert(!(selected()?.text ?? '').includes('Buttons are never') && !(selected()?.text ?? '').includes('Outside the card'), 'Not the Button\'s label, nor text that did not opt in');
  assert(unhandled(Key.KeyA) === selectAllKeys, 'Select all is consumed');
  await capture('selection-03-all');
  await clickAt(plainPoint);
  assert(selected() === undefined, 'And a press elsewhere clears it');

  // ---- The selection is cleared when the text it covers changes or goes -------------------------------------------------------
  await clickAt(p1Start, 3);
  api.changeSelectionLiveText();
  await settle();
  assert(textOf('sel-live') === 'Live line 1', `The live line changed: ${textOf('sel-live')}`);
  assert(selected()?.text === p1, 'Changing a text outside the selection leaves it alone');
  await clickAt(firstLine('sel-live'), 3);
  assert(selected()?.text === 'Live line 1', 'The live line is selected');
  const beforeChange = api.selectionChanges();
  api.changeSelectionLiveText();
  await settle();
  assert(selected() === undefined && api.selectionChanges() === beforeChange + 1,
    `Changing the text of what is selected clears it, with a selectionchange: ${JSON.stringify(selected())}`);
  assert(text(api, 'sel-readout') === 'selected: nothing', 'The readout follows it');
  await clickAt(firstLine('sel-tail'), 3);
  assert(selected()?.text === textOf('sel-tail'), 'The tail paragraph is selected');
  const beforeRemoval = api.selectionChanges();
  api.removeSelectionTail();
  await settle();
  assert(api.find('sel-tail') === undefined, 'The tail paragraph was removed');
  // The root hears of it (and the readout, which only asks native after a selectionchange, follows) before anything asks for the selection.
  assert(api.selectionChanges() === beforeRemoval + 1 && text(api, 'sel-readout') === 'selected: nothing', 'Removing what is selected clears it, with a selectionchange');
  assert(selected() === undefined, 'And nothing is selected');

  // A text that gets shorter under a selection that covers it ("1000" to "999") clears the selection. The commit paints
  // before the selection settles; the highlight drawn for four characters must not be placed on three (that is an ERROR
  // line, and this verifier fails on one).
  await clickAt(firstLine('sel-counter'), 3);
  assert(selected()?.text === '1000', `The counter is selected: ${JSON.stringify(selected())}`);
  const beforeShrinking = api.selectionChanges();
  api.shrinkSelectionCounter();
  await settle();
  assert(textOf('sel-counter') === '999' && selected() === undefined && api.selectionChanges() === beforeShrinking + 1,
    `Shortening the text of what is selected clears it, with a selectionchange: ${JSON.stringify(selected())}`);

  // ---- Painting: the highlight is in the content item, under the text ---------------------------------------------------------
  await clickAt(plainPoint);
  const short = glyphArea(rectOf('sel-short'));
  let image = frameImage(owner);
  assert(scanArea(image, short, DEFAULT_HIGHLIGHT_ON_WHITE).share === 0, 'Nothing is highlighted before the selection');
  const recordsBefore = api.snapshot().stats.contentRecords;
  await clickAt(centerOf(rectOf('sel-short')), 3);
  assert(selected()?.text === 'Highlight', `The short text is selected: ${JSON.stringify(selected())}`);
  image = frameImage(owner);
  const highlighted = scanArea(image, short, DEFAULT_HIGHLIGHT_ON_WHITE);
  assert(highlighted.share >= MIN_HIGHLIGHT_SHARE, `The selected text is highlighted in the default colour: ${highlighted.share} of its box`);
  assert(api.snapshot().stats.contentRecords > recordsBefore, 'Selecting re-recorded the text\'s content item');
  await clickAt(centerOf(rectOf('sel-rose')), 3);
  assert(selected()?.text === textOf('sel-rose'), 'The rose text is selected');
  image = frameImage(owner);
  const rose = scanArea(image, glyphArea(rectOf('sel-rose')), ROSE_HIGHLIGHT_ON_WHITE);
  assert(rose.share >= MIN_HIGHLIGHT_SHARE, `selection-[#f43f5e80] colours the highlight: ${rose.share} of its box`);
  assert(Math.abs(rose.darkest.r - SELECTION_TEXT_COLOR.r) <= INK_TOLERANCE && Math.abs(rose.darkest.g - SELECTION_TEXT_COLOR.g) <= INK_TOLERANCE
    && Math.abs(rose.darkest.b - SELECTION_TEXT_COLOR.b) <= INK_TOLERANCE, `The text is drawn over its highlight, in its own colour: darkest pixel #${rose.darkest.toHtml(false)}`);
  assert(scanArea(image, short, DEFAULT_HIGHLIGHT_ON_WHITE).share === 0, 'And the first text is no longer highlighted: the highlight is redrawn when the selection moves');
  await capture('selection-04-highlight');
  await clickAt(plainPoint);
  image = frameImage(owner);
  assert(scanArea(image, glyphArea(rectOf('sel-rose')), ROSE_HIGHLIGHT_ON_WHITE).share === 0, 'Clearing the selection removes the highlight');

  // ---- The highlight scrolls with its list and is clipped by it ------------------------------------------------------------------
  const list = () => rectOf('sel-scroll');
  const row = () => rectOf('sel-row-1');
  const visibleRow = (): LayoutRect => {
    const top = Math.max(row().y, list().y + 1);
    return {x: row().x, y: top, width: row().width, height: Math.min(row().y + row().height, list().y + list().height - 1) - top};
  };
  await clickAt(centerOf(row()), 3);
  assert(selected()?.text === 'Scrolling row 1', `A row of the list is selected: ${JSON.stringify(selected())}`);
  assert(scanArea(frameImage(owner), visibleRow(), DEFAULT_HIGHLIGHT_ON_WHITE).share >= MIN_HIGHLIGHT_SHARE, 'The row is highlighted where it is in the list');
  const beforeScroll = api.snapshot().stats;
  for (let tick = 0; tick < MAX_SELECTION_SCROLL_TICKS && row().y > list().y - MIN_CLIPPED_PX; tick++) {
    await wheel(centerOf(list()), MouseButton.MouseButtonWheelDown);
  }
  assert(row().y <= list().y - MIN_CLIPPED_PX && row().y + row().height >= list().y + MIN_VISIBLE_ROW_PX,
    `The row is scrolled partly past the top edge of the list: row ${JSON.stringify(row())}, list ${JSON.stringify(list())}`);
  assert(api.snapshot().stats.contentRecords === beforeScroll.contentRecords, 'Scrolling does not re-record the content: the highlight moves with it');
  image = frameImage(owner);
  assert(scanArea(image, visibleRow(), DEFAULT_HIGHLIGHT_ON_WHITE).share >= MIN_HIGHLIGHT_SHARE, 'The highlight moved with its row');
  const above: LayoutRect = {x: row().x, y: row().y, width: row().width, height: list().y - row().y};
  assert(scanArea(image, above, DEFAULT_HIGHLIGHT_ON_WHITE).share === 0, `And the part of the row past the top edge is clipped: nothing is highlighted above the list ${JSON.stringify(above)}`);
  await capture('selection-05-scrolled');

  // A selectable element inserted between the ends changes what is selected, and nothing names it: the commit's child list does.
  await dragSelect(p1Start, firstLine('sel-live'));
  assert(same(selected(), 'sel-p1', 0, 'sel-live', selected()?.focus.offset ?? -1) && (selected()?.text ?? '').includes('\n'), `A selection from the first paragraph to the live line: ${JSON.stringify(selected())}`);
  const beforeInsertion = api.selectionChanges();
  api.insertSelectionLine();
  await settle();
  assert(api.find('sel-inserted') !== undefined, 'The line was inserted');
  // Asking for the selection would find it stale too (and clear it then); the commit must clear it first.
  assert(api.selectionChanges() === beforeInsertion + 1 && text(api, 'sel-readout') === 'selected: nothing',
    'A selectable line inserted between the ends clears the selection, with a selectionchange, when the commit lands');
  assert(selected() === undefined, 'And nothing is selected');
}

/** The drag lab's list has this many rows (`LIST_ROWS` in demo/src/drag-lab.tsx). */
const LIST_ROWS = 20;
/** A mouse press becomes a drag once it is further than this from where it began (`Viewport.gui_drag_threshold`'s default). */
const DRAG_THRESHOLD_PX = 10;
/** A step that stays inside the threshold, and one that goes past it but is still on a 36 px card. */
const WITHIN_THRESHOLD_PX = 5;
const BEYOND_THRESHOLD_PX = DRAG_THRESHOLD_PX + 2;
/** How long a touch must stay put to become a drag (`TOUCH_DRAG_HOLD_MS`, native/drag.rs), and how long to wait for it. */
const TOUCH_HOLD_MS = 500;
const HOLD_DEADLINE_MS = 3000;
/**
 * Edge auto-scroll: how close to the list's bottom edge the pointer rests, how long the scroll may take, how often it is sampled. Real time, on purpose: the check
 * wants a handful of samples while the list scrolls (the element under the pointer is looked up again, `targets.size >= 3`), and on the engine's clock at four times
 * its rate the list reached its end in 4 samples where it takes 12 or 13 here, leaving that check a margin of one.
 */
const AUTOSCROLL_BAND_PX = 12;
const AUTOSCROLL_DEADLINE_MS = 10_000;
const AUTOSCROLL_SAMPLE_MS = 100;
/** The draggable form (the drag lab's `input-chip`): where a press is in its field, how far it moves, and where one is beside the field. */
const CHIP_FIELD_PRESS_PX = 12;
const CHIP_FIELD_MOVE_THRESHOLDS = 3;
const CHIP_GRAB_PX = 6;
const CHIP_INPUT_TEXT = 'Ada Lovelace';
const MAX_CARET_WAITS = 20;
/** A ghost pixel darker than this (per channel, 0 to 1) is text: the field is white and the page nearly so. */
const GHOST_INK_LUMINANCE = 0.6;
/** A ghost pixel whose blue exceeds its red and its green by this much is the caret's indigo, not slate text. */
const GHOST_CARET_HUE = 0.25;
/** The ghost's opacity (`DRAG_GHOST_OPACITY`, native/drag_ghost.rs) over the lab's page; the palette item is amber-100. */
const GHOST_OPACITY = 0.6;
const AMBER_100 = '#fef3c7';
const GHOST_PROBE_INSET = 6;
const GHOST_SCAN_STEP = 12;
const GHOST_TOLERANCE = 0.03;
/** A touch that swipes moves this far per step, well before the hold elapses. */
const SWIPE_STEP_PX = 15;
/** Where the root, offset by `SURFACE_OFFSET`, is not: inside the window, left of the root's edge. */
const BEYOND_THE_ROOT = new Vector2(20, 100);

async function waitUntil(what: string, ready: () => boolean, deadlineMs: number): Promise<void> {
  const deadline = Date.now() + deadlineMs;
  while (!ready()) {
    assert(Date.now() < deadline, `Timed out after ${deadlineMs} ms waiting for ${what}`);
    await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
  }
}

/** The top-left corner of a `size` area of the lab that is bare page, found in the raster. */
function barePage(owner: Node, size: Vector2, snapshot: NativeSnapshot): Vector2 {
  const image = frameImage(owner);
  const bare = (at: Vector2): boolean => {
    for (let y = 0; y <= size.y; y += GHOST_SCAN_STEP) {
      for (let x = 0; x <= size.x; x += GHOST_SCAN_STEP) if (!paintIs(image, new Vector2(at.x + x, at.y + y), PAGE_FILL)) return false;
    }
    return paintIs(image, new Vector2(at.x + size.x, at.y + size.y), PAGE_FILL);
  };
  for (let y = EMPTY_POINT_SEARCH_STEP; y + size.y < snapshot.height; y += EMPTY_POINT_SEARCH_STEP) {
    for (let x = EMPTY_POINT_SEARCH_STEP; x + size.x < snapshot.width; x += EMPTY_POINT_SEARCH_STEP) {
      if (bare(new Vector2(x, y))) return new Vector2(x, y);
    }
  }
  throw new Error(`No bare ${size.x} x ${size.y} area of page in the drag lab`);
}

/**
 * Plan I9: drag and drop. Arbitration (a press that moves on, a touch that is held, a prevented or captured
 * `pointerdown`, a prevented `dragstart`), the event sequence and its outcomes, reordering and moving cards between
 * columns, a target that takes only `move`, effect negotiation and the cursor, Escape, a release beyond the root,
 * the ghost in the raster, edge auto-scroll and the target following a scroll under a stationary pointer, the
 * root leaving the tree, and touch (hold then move drags; a swipe pans instead).
 */
async function verifyDragging(owner: Node, api: InteractionInspection, capture: (name: string) => Promise<void>): Promise<void> {
  api.showLab('hud');
  await settle();
  api.showLab('drag');
  await settle();
  move(FAR_CORNER);
  await settle();
  const drag = () => api.snapshot().drag;
  /** No pointer is held for a drag, or being watched for one (a finished or cancelled drag leaves `ended`, until the next press). */
  const isOver = () => drag().state !== 'pending' && drag().state !== 'dragging';
  const board = () => text(api, 'board-status');
  const log = () => text(api, 'drag-log');
  const ended = () => text(api, 'end-status');
  const dropStatus = () => text(api, 'drop-status');
  const clicks = () => Number(/clicks (\d+)$/.exec(dropStatus())?.[1]);
  /** The `pointerup`s that reached the lab's root: a drag, which cancels the pointer, sends none. */
  const ups = () => Number(/pointerups (\d+),/.exec(dropStatus())?.[1]);
  const idOf = (testID: string) => get(api, testID).id;
  const cursor = (at: Vector2) => api.cursorShapeAt(at.x, at.y);
  const offset = (at: Vector2, dx: number, dy: number) => new Vector2(at.x + dx, at.y + dy);
  const lastEnd = () => {
    const end = drag().lastEnd;
    assert(end, 'A drag has ended');
    return end;
  };
  /** Press at `from` and move to `via` (all in order). The button stays down. */
  const dragVia = async (from: Vector2, ...via: Vector2[]): Promise<void> => {
    move(from);
    await settle();
    pointer(from, true);
    await settle();
    for (const at of via) {
      move(at);
      await settle();
    }
  };
  const release = async (at: Vector2): Promise<void> => {
    pointer(at, false);
    await settle();
  };

  // ---- At rest ------------------------------------------------------------------------------------------------------
  assert(drag().state === 'idle' && drag().session === 0 && drag().ghost === null && drag().lastEnd === null,
    `Nothing is dragging before the first drag: ${JSON.stringify(drag())}`);
  assert(board() === 'todo: a,b,c | doing: d,e', `The board starts as designed: ${board()}`);
  assert(!api.surfaceProcessing() && !api.surfaceProcessingInput(), 'An idle root asks for no frames and no input');
  assert(get(api, 'card-a').props.draggable === true && get(api, 'ghostless').props.dragPreview === 'none',
    'draggable and dragPreview reach native as props');
  await click(api, 'card-b');
  assert(clicks() === 1 && ups() === 1, `A plain click on a draggable card is still a click, with its pointerup: ${dropStatus()}`);
  await capture('35-drag-lab');

  // ---- Reorder within a column: arbitration, the event sequence, the outcome --------------------------------------
  const cardA = point(api, 'card-a');
  const cardC = point(api, 'card-c');
  api.resetPointerCancels();
  await dragVia(cardA, offset(cardA, 0, WITHIN_THRESHOLD_PX));
  assert(drag().state === 'pending' && drag().source === idOf('card-a'), `A press inside a draggable element is pending: ${JSON.stringify(drag())}`);
  assert(api.pointerCancels() === 0 && drag().ghost === null && log() === 'no events',
    'Within the threshold it is still a press: no cancel, no ghost, no drag event');
  move(offset(cardA, 0, BEYOND_THRESHOLD_PX));
  await settle();
  assert(drag().state === 'dragging' && drag().session === 1, `Past the threshold it is a drag: ${JSON.stringify(drag())}`);
  assert(api.pointerCancels() === 1, `Starting a drag cancels the pointer once: ${api.pointerCancels()}`);
  assert(api.surfaceProcessingInput(), 'A running drag listens for Escape');
  assert(log() === 'dragstart a > dragenter card-a', `dragstart, then dragenter on what is under the pointer: ${log()}`);
  move(cardC);
  await settle();
  assert(drag().target === idOf('card-c') && drag().allowedEffect === 'move', `Over card c, which prevents dragover: ${JSON.stringify(drag())}`);
  assert(cursor(cardC) === Control.CursorShape.CursorCanDrop, 'Over a target that accepts, the cursor is can-drop');
  await capture('36-drag-reorder');
  await release(cardC);
  assert(board() === 'todo: b,a,c | doing: d,e', `Card a dropped on card c lands before it: ${board()}`);
  assert(log() === 'dragstart a > dragenter card-a > dragenter card-c > drop a move > dragend move', `The event sequence: ${log()}`);
  assert(clicks() === 1, 'No click follows a drag');
  assert(ups() === 1, `No pointerup follows it either (the pointer was cancelled): ${dropStatus()}`);
  assert(api.pointerCancels() === 1, 'And no further pointer cancel');
  assert(isOver() && drag().pointer === null && drag().ghost === null, 'The drag is over and the ghost gone');
  const reorder = lastEnd();
  assert(reorder.reason === 'dropped' && reorder.dropEffect === 'move' && !reorder.endedOutsideRoot, `The drop is reported: ${JSON.stringify(reorder)}`);
  assert(ended().startsWith('last drag ended: move outside false at '), `The source heard dragend: ${ended()}`);
  assert(!api.surfaceProcessing() && !api.surfaceProcessingInput(), 'A finished drag asks for no frames and no input');
  assert(cursor(cardC) === Control.CursorShape.CursorArrow, 'The cursor is the element\'s again');

  // ---- Between columns, and onto a column's own space ------------------------------------------------------------------
  const cardB = point(api, 'card-b');
  const cardE = point(api, 'card-e');
  await dragVia(cardB, offset(cardB, 0, BEYOND_THRESHOLD_PX), cardE);
  await release(cardE);
  assert(board() === 'todo: a,c | doing: d,b,e', `Card b dropped on card e moves to the other column before it: ${board()}`);
  const doingCards = point(api, 'card-d');
  const todoRect = get(api, 'column-todo').rect;
  const columnFloor = new Vector2(todoRect.x + todoRect.width / 2, todoRect.y + todoRect.height - WITHIN_THRESHOLD_PX);
  await dragVia(doingCards, offset(doingCards, 0, BEYOND_THRESHOLD_PX), columnFloor);
  assert(drag().target === idOf('column-todo'), `The pointer is over the todo column's own space: ${JSON.stringify(drag())}`);
  await release(columnFloor);
  assert(board() === 'todo: a,c,d | doing: b,e', `Dropped on a column rather than a card, it goes last: ${board()}`);
  assert(clicks() === 1, 'Still no click');

  // ---- The ghost: a translucent copy, following the pointer with the grab offset ----------------------------------------
  const paletteRect = get(api, 'palette').rect;
  const spot = barePage(owner, new Vector2(paletteRect.width, paletteRect.height), api.snapshot());
  const grab = offset(point(api, 'palette'), paletteRect.width / 4 - paletteRect.width / 2, 0);
  const grabInChip = new Vector2(grab.x - paletteRect.x, grab.y - paletteRect.y);
  const amberGhost = blend(AMBER_100, PAGE_FILL, GHOST_OPACITY);
  const probeInGhost = (origin: Vector2) => offset(origin, GHOST_PROBE_INSET, paletteRect.height / 2);
  await dragVia(grab, offset(grab, 0, BEYOND_THRESHOLD_PX));
  let ghost = drag().ghost;
  assert(ghost, 'A dragged element with a native preview has a ghost');
  assert(near(ghost.x, grab.x - grabInChip.x, 0.5) && near(ghost.y, grab.y + BEYOND_THRESHOLD_PX - grabInChip.y, 0.5)
    && near(ghost.width, paletteRect.width, 0.5) && near(ghost.height, paletteRect.height, 0.5),
  `The ghost is the source's box, kept at the same place under the pointer: ${JSON.stringify(ghost)}`);
  const ghostPointer = new Vector2(spot.x + grabInChip.x, spot.y + grabInChip.y);
  move(ghostPointer);
  await settle();
  ghost = drag().ghost;
  assert(ghost && near(ghost.x, spot.x, 0.5) && near(ghost.y, spot.y, 0.5), `The ghost follows the pointer: ${JSON.stringify(ghost)}`);
  const image = frameImage(owner);
  assert(paintNear(image, probeInGhost(spot), amberGhost, GHOST_TOLERANCE),
    `The ghost is the chip at 60 % over the page: ${describePaint(image, probeInGhost(spot))}, expected #${amberGhost.toHtml(false)}`);
  assert(paintIs(image, probeInGhost(new Vector2(paletteRect.x, paletteRect.y)), AMBER_100), 'The source stays where it was, at full opacity');
  assert(cursor(ghostPointer) === Control.CursorShape.CursorForbidden, 'Over bare page nothing accepts: the cursor is forbidden');
  await capture('37-drag-ghost');
  await release(ghostPointer);
  assert(paintIs(frameImage(owner), probeInGhost(spot), PAGE_FILL), 'The ghost is gone with the drag');
  assert(drag().ghost === null && lastEnd().reason === 'released' && lastEnd().dropEffect === 'none', 'Released over nothing, the drag ends with no effect');
  assert(log().endsWith('> dragend none'), `Nothing was dropped: ${log()}`);
  assert(!lastEnd().endedOutsideRoot, 'Over bare page, but inside the root: not outside');

  // dragPreview="none" draws nothing.
  const ghostless = point(api, 'ghostless');
  await dragVia(ghostless, offset(ghostless, 0, BEYOND_THRESHOLD_PX), spot);
  assert(drag().state === 'dragging' && drag().ghost === null, 'dragPreview none: the drag runs with no ghost');
  assert(paintIs(frameImage(owner), probeInGhost(spot), PAGE_FILL), 'And nothing is drawn');
  await release(spot);

  // ---- A text input in a draggable element keeps its press, and is drawn in the ghost ----------------------------------
  // The draggable form holds a field. A press in the field places the caret and a move selects text, as for an HTML
  // `<input>` under a draggable parent: no drag starts. A press beside the field drags the form, and the ghost shows the
  // field's text and none of its caret.
  const chipRect = get(api, 'input-chip').rect;
  const fieldRect = get(api, 'chip-input').rect;
  const chipField = () => {
    const state = get(api, 'chip-input').textInput;
    assert(state, 'The form\'s field is a text input');
    return state;
  };
  const sessionsBefore = drag().session;
  const fieldPress = new Vector2(fieldRect.x + CHIP_FIELD_PRESS_PX, fieldRect.y + fieldRect.height / 2);
  const fieldMove = offset(fieldPress, BEYOND_THRESHOLD_PX * CHIP_FIELD_MOVE_THRESHOLDS, 0);
  await dragVia(fieldPress, fieldMove);
  assert(isOver() && drag().session === sessionsBefore && drag().ghost === null && !log().includes('dragstart input-chip'),
    `A press in a text input under a draggable element starts no drag: ${JSON.stringify(drag())} ${log()}`);
  assert(api.snapshot().focused === idOf('chip-input'), 'The press focused the field');
  assert(chipField().selectionStart === 0 && chipField().selectionEnd > 0 && chipField().selectionEnd < CHIP_INPUT_TEXT.length,
    `and moving on selected text in it: ${chipField().selectionStart},${chipField().selectionEnd}`);
  await release(fieldMove);
  assert(isOver() && chipField().selectionEnd > 0 && log().indexOf('input-chip') === -1,
    'Letting go ends the selection and makes no drag event');
  // Wait for the field's caret to be on, so that it would be in the ghost if the ghost copied it.
  for (let step = 0; step < MAX_CARET_WAITS && !chipField().caretVisible; step++) await settle();
  assert(chipField().caretVisible, 'The focused field draws its caret');
  const formGrab = new Vector2(chipRect.x + CHIP_GRAB_PX, chipRect.y + CHIP_GRAB_PX);
  const formSpot = barePage(owner, new Vector2(chipRect.width, chipRect.height), api.snapshot());
  await dragVia(formGrab, offset(formGrab, 0, BEYOND_THRESHOLD_PX));
  assert(drag().state === 'dragging' && drag().ghost !== null, `A press beside the field drags the form: ${JSON.stringify(drag())}`);
  const formPointer = new Vector2(formSpot.x + CHIP_GRAB_PX, formSpot.y + CHIP_GRAB_PX);
  move(formPointer);
  await settle();
  const ghostLeft = Math.floor(formSpot.x + (fieldRect.x - chipRect.x));
  const ghostTop = Math.floor(formSpot.y + (fieldRect.y - chipRect.y));
  const formImage = frameImage(owner);
  let dark = false;
  let caret = false;
  for (let y = ghostTop; y < ghostTop + fieldRect.height; y++) {
    for (let x = ghostLeft; x < ghostLeft + fieldRect.width; x++) {
      const color = formImage.getPixel(x, y);
      if (color.r + color.g + color.b < GHOST_INK_LUMINANCE * 3) dark = true;
      if (color.b - color.r > GHOST_CARET_HUE && color.b - color.g > GHOST_CARET_HUE) caret = true;
    }
  }
  assert(dark, 'The ghost of a form shows its field\'s text');
  assert(!caret, 'and none of the field\'s caret');
  await capture('37b-drag-input-ghost');
  await release(formPointer);
  assert(drag().ghost === null && lastEnd().reason === 'released', 'The form\'s drag ends where it was released');

  // ---- The trash takes only a move; the palette item only copies -----------------------------------------------------
  const trash = point(api, 'trash');
  const cardCNow = point(api, 'card-c');
  await dragVia(cardCNow, offset(cardCNow, 0, BEYOND_THRESHOLD_PX), trash);
  assert(drag().target === idOf('trash') && drag().allowedEffect === 'move', 'The trash accepts a move');
  assert(cursor(trash) === Control.CursorShape.CursorCanDrop, 'with the can-drop cursor');
  // Godot asks for the cursor before it hands over the motion, so the window shows it from the next motion on.
  move(offset(trash, 1, 0));
  await settle();
  assert(DisplayServer.cursorGetShape() === DisplayServer.CursorShape.CursorCanDrop,
    `Moving over a target sets the window cursor: ${DisplayServer.cursorGetShape()}`);
  await release(offset(trash, 1, 0));
  assert(board() === 'todo: a,d | doing: b,e' && dropStatus().startsWith('trash c,'), `Card c is in the trash: ${board()}, ${dropStatus()}`);
  const palette = point(api, 'palette');
  const doingColumn = get(api, 'column-doing').rect;
  const doingFloor = new Vector2(doingColumn.x + doingColumn.width / 2, doingColumn.y + doingColumn.height - WITHIN_THRESHOLD_PX);
  await dragVia(palette, offset(palette, 0, BEYOND_THRESHOLD_PX), doingFloor);
  assert(drag().allowedEffect === 'copy', `A column takes a copy: ${JSON.stringify(drag())}`);
  await release(doingFloor);
  assert(board() === 'todo: a,d | doing: b,e,n1', `The palette item became a new card: ${board()}`);
  assert(log().includes('drop palette copy'), `The drop carried the copy effect: ${log()}`);

  const reject = async (from: Vector2, over: Vector2, why: string): Promise<void> => {
    const before = board();
    const trashBefore = dropStatus();
    await dragVia(from, offset(from, 0, BEYOND_THRESHOLD_PX), over);
    assert(drag().state === 'dragging' && drag().allowedEffect === null, `${why}: nothing accepted: ${JSON.stringify(drag())}`);
    assert(cursor(over) === Control.CursorShape.CursorForbidden, `${why}: the cursor is forbidden`);
    move(offset(over, 1, 0));
    await settle();
    assert(DisplayServer.cursorGetShape() === DisplayServer.CursorShape.CursorForbidden, `${why}: and so is the window's: ${DisplayServer.cursorGetShape()}`);
    await release(offset(over, 1, 0));
    const end = lastEnd();
    assert(end.reason === 'released' && end.dropEffect === 'none', `${why}: released, with no effect: ${JSON.stringify(end)}`);
    const started = log().lastIndexOf('dragstart');
    assert(started >= 0 && !/drop /.test(log().slice(started)), `${why}: no drop event: ${log()}`);
    assert(board() === before && dropStatus() === trashBefore, `${why}: nothing changed`);
  };
  await reject(point(api, 'palette'), trash, 'The trash takes only a move; a copy-only source is refused');
  await reject(point(api, 'card-a'), point(api, 'refuser'), 'A target that does not prevent dragover');

  // ---- Arbitration: a prevented pointerdown, a captured pointer, a prevented dragstart ---------------------------------
  const clicksBefore = clicks();
  const sessionBeforeGestures = drag().session;
  for (const testID of ['locked', 'captured']) {
    const at = point(api, testID);
    api.resetPointerCancels();
    // Past the threshold and then further, but still on the chip (36 px high), so the release clicks it.
    const furthest = offset(at, 0, BEYOND_THRESHOLD_PX + WITHIN_THRESHOLD_PX / 2);
    await dragVia(at, offset(at, 0, BEYOND_THRESHOLD_PX), furthest);
    assert(isOver() && drag().session === sessionBeforeGestures && api.pointerCancels() === 0,
      `${testID}: JS took the pointer, so no drag is offered: ${JSON.stringify(drag())}`);
    await release(furthest);
  }
  const refused = point(api, 'refused');
  api.resetPointerCancels();
  await dragVia(refused, offset(refused, 0, BEYOND_THRESHOLD_PX));
  assert(log().endsWith('dragstart refused') && drag().state === 'ended' && drag().ghost === null,
    `dragstart ran and was prevented: no drag, no ghost: ${JSON.stringify(drag())} ${log()}`);
  assert(api.pointerCancels() === 0, 'A refused drag leaves the pointer events alone');
  await release(offset(refused, 0, BEYOND_THRESHOLD_PX));
  assert(isOver() && drag().pointer === null, 'The press ends');
  assert(clicks() === clicksBefore + 3, `Those three presses ended in clicks, as plain pointer events: ${clicksBefore} -> ${clicks()}`);

  // ---- A source removed between the press and the threshold is not dragged ------------------------------------------------
  // The chip unmounts itself when the pressed mouse first moves. JS then has nothing to hear `dragstart` with, so the
  // gesture is refused, as a prevented `dragstart` is; a drag that began would send events JS has no data store for.
  const vanishing = point(api, 'vanishing');
  const sessionBeforeVanishing = drag().session;
  const logBeforeVanishing = log();
  api.resetPointerCancels();
  await dragVia(vanishing, offset(vanishing, 0, WITHIN_THRESHOLD_PX));
  assert(!api.snapshot().nodes.some(node => node.props.testID === 'vanishing'), 'The chip removed itself when the pressed mouse moved');
  move(offset(vanishing, 0, BEYOND_THRESHOLD_PX));
  await settle();
  assert(drag().state === 'ended' && drag().session === sessionBeforeVanishing && drag().ghost === null && log() === logBeforeVanishing,
    `A source that is gone is refused: no drag, no drag event: ${JSON.stringify(drag())} ${log()}`);
  assert(api.pointerCancels() === 0, 'The pointer events carry on');
  await release(offset(vanishing, 0, BEYOND_THRESHOLD_PX));
  assert(isOver() && drag().pointer === null, 'The press ends');
  await click(api, 'vanishing-restore');

  // ---- Escape cancels and is accepted ---------------------------------------------------------------------------------
  const boardBefore = board();
  const upsBeforeEscape = ups();
  const cardAEsc = point(api, 'card-a');
  const cardDEsc = point(api, 'card-d');
  api.resetPointerCancels();
  api.resetRootKeys();
  const keysToGame = Object.keys(counts(api).unhandledKeys).length;
  await dragVia(cardAEsc, offset(cardAEsc, 0, BEYOND_THRESHOLD_PX), cardDEsc);
  assert(drag().state === 'dragging' && drag().target === idOf('card-d'), 'A drag is over card d');
  keyEvent({ keycode: Key.KeyEscape }, true);
  await settle();
  keyEvent({ keycode: Key.KeyEscape }, false);
  await settle();
  const cancelled = lastEnd();
  assert(cancelled.reason === 'escape' && cancelled.dropEffect === 'none' && !cancelled.endedOutsideRoot,
    `Escape cancels: not a drop, and not a release outside the root: ${JSON.stringify(cancelled)}`);
  assert(drag().ghost === null && drag().state === 'ended' && !api.surfaceProcessingInput(), 'The ghost goes at once; the held pointer\'s gesture is over');
  assert(api.rootKeys().length === 0 && Object.keys(counts(api).unhandledKeys).length === keysToGame,
    `Escape was accepted: neither JS nor the game saw it (${api.rootKeys()}): ${JSON.stringify(counts(api).unhandledKeys)}`);
  assert(log().endsWith('> dragend none'), `A cancelled drag still ends with dragend: ${log()}`);
  const afterEscape = log();
  move(point(api, 'card-e'));
  await settle();
  move(point(api, 'card-b'));
  await settle();
  assert(log() === afterEscape && drag().state === 'ended', 'The pointer is still down, but moving it drags nothing');
  await release(point(api, 'card-b'));
  assert(board() === boardBefore && isOver() && drag().pointer === null && log() === afterEscape, `Releasing it drops nothing: ${board()}`);
  assert(clicks() === clicksBefore + 3 && ups() === upsBeforeEscape, `And neither clicks nor sends a pointerup: ${dropStatus()}`);

  // ---- Escape, then the window loses its focus with the button still down ---------------------------------------------------
  // The lift will never reach a window that lost focus, so the focus loss ends the cancelled gesture too: the next press is
  // offered to the machine and its release is a release (a click), not the old gesture's.
  const cardAFocus = point(api, 'card-a');
  await dragVia(cardAFocus, offset(cardAFocus, 0, BEYOND_THRESHOLD_PX));
  assert(drag().state === 'dragging', 'A drag is under way');
  keyEvent({ keycode: Key.KeyEscape }, true);
  await settle();
  keyEvent({ keycode: Key.KeyEscape }, false);
  await settle();
  assert(drag().state === 'ended', 'Escape cancelled it, and the button is still down');
  api.simulateWindowFocusLoss();
  await settle();
  assert(drag().state === 'idle', `Losing the window's focus ends the gesture: ${JSON.stringify(drag())}`);
  const clicksBeforeFocusLoss = clicks();
  await click(api, 'card-b');
  assert(clicks() === clicksBeforeFocusLoss + 1, `The next click is a click: ${dropStatus()}`);

  // ---- The hover stays where the drag found it ---------------------------------------------------------------------------
  // A drag looks under the pointer itself; hover events are not sent for what it passes over, wheel ticks included.
  const cardAHover = point(api, 'card-a');
  await dragVia(cardAHover, offset(cardAHover, 0, BEYOND_THRESHOLD_PX), point(api, 'card-d'));
  assert(drag().state === 'dragging', 'A drag is under way');
  const hoveredByTheDrag = api.snapshot().hovered;
  await wheel(point(api, 'card-e'), MouseButton.MouseButtonWheelDown);
  assert(api.snapshot().hovered === hoveredByTheDrag,
    `A wheel tick over another card does not move the hover while the drag runs: ${hoveredByTheDrag} -> ${api.snapshot().hovered}`);
  keyEvent({ keycode: Key.KeyEscape }, true);
  await settle();
  keyEvent({ keycode: Key.KeyEscape }, false);
  await settle();
  await release(point(api, 'card-e'));
  assert(api.snapshot().hovered === idOf('card-e'), `The hover catches up when the drag is over: ${api.snapshot().hovered}`);

  // ---- Text inside a draggable element starts no selection (plan 3.12: a draggable comes before selection) ---------------
  await click(api, 'selectable-plain');
  assert(api.selection() !== undefined, 'A click on select-text that is not in a draggable element selects (the control)');
  const selectableText = point(api, 'selectable-text');
  const sessionBeforeText = drag().session;
  await click(api, 'selectable-text');
  assert(api.selection() === undefined && drag().session === sessionBeforeText,
    `A press on select-text inside a draggable element starts no selection and, as any press that starts none, clears the one there was: ${JSON.stringify(api.selection())}`);
  await dragVia(selectableText, offset(selectableText, 0, BEYOND_THRESHOLD_PX));
  assert(drag().state === 'dragging' && drag().source === idOf('selectable') && api.selection() === undefined,
    `Moving on drags the element, with no selection under way: ${JSON.stringify(drag())}`);
  await release(offset(selectableText, 0, BEYOND_THRESHOLD_PX));
  assert(api.selection() === undefined && isOver(), 'And the drag ends with nothing selected');

  // ---- A release beyond the root ---------------------------------------------------------------------------------------
  api.offsetSurface(SURFACE_OFFSET.x, SURFACE_OFFSET.y);
  await settle();
  const cardAOutside = offset(point(api, 'card-a'), SURFACE_OFFSET.x, SURFACE_OFFSET.y);
  const beyond = BEYOND_THE_ROOT;
  await dragVia(cardAOutside, offset(cardAOutside, 0, BEYOND_THRESHOLD_PX), beyond);
  assert(drag().state === 'dragging' && drag().target === null && drag().allowedEffect === null, 'Beyond the root there is no target');
  const beyondPosition = drag().position;
  assert(beyondPosition && beyondPosition.x === beyond.x - SURFACE_OFFSET.x, 'The drag reports root-local coordinates');
  await release(beyond);
  const outside = lastEnd();
  assert(outside.reason === 'released' && outside.endedOutsideRoot && outside.dropEffect === 'none', `Released beyond the root: ${JSON.stringify(outside)}`);
  assert(ended() === `last drag ended: none outside true at ${beyond.x - SURFACE_OFFSET.x},${beyond.y - SURFACE_OFFSET.y} viewport ${beyond.x},${beyond.y}`,
    `dragend carries root-local and viewport coordinates: ${ended()}`);
  api.offsetSurface(0, 0);
  await settle();

  // ---- Edge auto-scroll, and the target following a scroll under a stationary pointer ------------------------------------
  const listRect = get(api, 'drag-list').rect;
  const listState = () => {
    const state = get(api, 'drag-list').scroll;
    assert(state, 'The list is a scroll container');
    return state;
  };
  assert(listState().scrollTop === 0 && listState().maxScrollTop > 0, 'The list has room to scroll');
  const edgePoint = new Vector2(listRect.x + listRect.width / 2, listRect.y + listRect.height - 1 - AUTOSCROLL_BAND_PX);
  const paletteAgain = point(api, 'palette');
  await dragVia(paletteAgain, offset(paletteAgain, 0, BEYOND_THRESHOLD_PX), centerOf(listRect));
  assert(listState().scrollTop === 0 && !api.surfaceProcessing(), 'Away from the edge the list does not scroll and the root asks for no frames');
  move(edgePoint);
  await settle();
  assert(api.surfaceProcessing(), 'Near the edge the drag asks for frames');
  const targets = new Set<number | null>();
  let captured = false;
  let previousTop = listState().scrollTop;
  const deadline = Date.now() + AUTOSCROLL_DEADLINE_MS;
  while (listState().scrollTop < listState().maxScrollTop - SCROLL_TOLERANCE) {
    assert(Date.now() < deadline, `The list scrolled to ${listState().scrollTop} of ${listState().maxScrollTop} in ${AUTOSCROLL_DEADLINE_MS} ms`);
    await new Promise(resolve => setTimeout(resolve, AUTOSCROLL_SAMPLE_MS));
    const top = listState().scrollTop;
    assert(top >= previousTop, 'Auto-scroll only goes towards the edge the pointer is at');
    previousTop = top;
    const sample = drag();
    targets.add(sample.target);
    if (!captured && top > listState().maxScrollTop / 2) {
      captured = true;
      assert(sample.state === 'dragging' && sample.position !== null && sample.position.y === edgePoint.y, 'The pointer has not moved');
      await capture('38-drag-autoscroll');
    }
  }
  assert(targets.size >= 3, `The element under the stationary pointer was looked up again as the list scrolled: ${targets.size} targets seen`);
  const lastRow = idOf(`row-${LIST_ROWS - 1}`);
  await settle();
  assert(drag().target === lastRow && drag().allowedEffect === 'copy', `At the bottom the pointer is over the last row, which takes the copy: ${JSON.stringify(drag())}`);
  assert(!api.surfaceProcessing(), 'With the list at its end nothing asks for frames');
  await release(edgePoint);
  assert(dropStatus().includes(`list palette onto row ${LIST_ROWS - 1}`), `The drop landed on the last row: ${dropStatus()}`);
  assert(near(listState().scrollTop, listState().maxScrollTop), 'And the list stayed at the bottom');
  await capture('39-drag-list-end');

  // ---- The root leaves the tree mid-drag -----------------------------------------------------------------------------------
  const cardBExit = point(api, 'card-b');
  await dragVia(cardBExit, offset(cardBExit, 0, BEYOND_THRESHOLD_PX));
  assert(drag().state === 'dragging', 'A drag is running');
  api.surfaceAttached(false);
  await settle();
  assert(drag().state === 'idle' && drag().ghost === null && lastEnd().reason === 'rootexit', `The drag ends with the root: ${JSON.stringify(drag())}`);
  assert(lastEnd().dropEffect === 'none' && !lastEnd().endedOutsideRoot, 'Cancelled, not released anywhere');
  assert(ended().startsWith('last drag ended: none outside false'), `JS heard dragend: ${ended()}`);
  api.surfaceAttached(true);
  await settle();
  await release(cardBExit);
  assert(drag().state === 'idle' && board() === boardBefore, 'The root comes back with no drag');
  api.grabSurfaceFocus();
  await settle();

  // ---- Touch: hold then move drags; a swipe pans instead ------------------------------------------------------------------
  move(FAR_CORNER);
  await settle();
  const holdAt = point(api, 'card-d');
  const holdTarget = point(api, 'card-b');
  const holdCancels = api.pointerCancels();
  const boardBeforeTouch = board();
  const clicksBeforeTouch = clicks();
  const upsBeforeTouch = ups();
  touch(FIRST_TOUCH, holdAt, true);
  const heldSince = Date.now();
  await settle();
  assert(drag().state === 'pending' && drag().source === idOf('card-d') && drag().pointer === FIRST_TOUCH_ID, `A touch on a draggable element is pending: ${JSON.stringify(drag())}`);
  assert(api.surfaceProcessing(), 'A touch waiting out its hold asks for frames');
  await waitUntil('the hold to start the drag', () => drag().state === 'dragging', HOLD_DEADLINE_MS);
  assert(Date.now() - heldSince >= TOUCH_HOLD_MS - SETTLE_MS, `The drag began after the hold, not before: ${Date.now() - heldSince} ms`);
  assert(api.pointerCancels() === holdCancels + 1 && drag().ghost !== null, 'Held long enough: the pointer is cancelled and the ghost shows');
  touchDrag(FIRST_TOUCH, holdTarget, new Vector2(holdTarget.x - holdAt.x, holdTarget.y - holdAt.y));
  await settle();
  assert(drag().target === idOf('card-b') && drag().allowedEffect === 'move', 'The finger moves the drag');
  await capture('40-drag-touch-hold');
  touch(FIRST_TOUCH, holdTarget, false);
  await settle();
  assert(board() !== boardBeforeTouch && isOver(), `Lifting the finger over a target drops: ${board()}`);
  assert(clicks() === clicksBeforeTouch && ups() === upsBeforeTouch && lastEnd().reason === 'dropped', `A touch drag does not click or send a pointerup: ${dropStatus()}`);

  // A quick swipe on a draggable row scrolls the list: the drag is declined, the pan takes the finger. The list is at
  // its end after the auto-scroll, so the finger goes down (the content follows it back towards the top).
  const rows = get(api, 'drag-list').rect;
  const visibleRow = Array.from({ length: LIST_ROWS }, (_, index) => get(api, `row-${index}`))
    .find(row => row.rect.y >= rows.y && row.rect.y + row.rect.height <= rows.y + rows.height);
  assert(visibleRow, 'A row is fully in view');
  const swipeStart = centerOf(visibleRow.rect);
  const logBeforeSwipe = log();
  const sessionBefore = drag().session;
  api.resetPointerCancels();
  const topBefore = listState().scrollTop;
  touch(FIRST_TOUCH, swipeStart, true);
  await frames(2);
  assert(drag().state === 'pending', 'A touch on a draggable row waits to see which it is');
  let finger = swipeStart;
  for (let step = 1; step <= 3; step++) {
    finger = new Vector2(swipeStart.x, swipeStart.y + step * SWIPE_STEP_PX);
    touchDrag(FIRST_TOUCH, finger, new Vector2(0, SWIPE_STEP_PX));
    await frames(2);
  }
  assert(listState().scrollTop < topBefore, `Moving first scrolls the list: ${topBefore} -> ${listState().scrollTop}`);
  assert(drag().session === sessionBefore && drag().state !== 'dragging', 'And no drag began');
  assert(api.pointerCancels() === 1, 'The pan cancelled the pointer, once');
  touch(FIRST_TOUCH, finger, false);
  await settle();
  assert(isOver() && log() === logBeforeSwipe && clicks() === clicksBeforeTouch, 'No drag event, no click');
  await waitUntil('the list to stop coasting', () => !api.surfaceProcessing(), HOLD_DEADLINE_MS);

  // A quick tap on a draggable card is a tap.
  const tapAt = point(api, 'card-a');
  touch(FIRST_TOUCH, tapAt, true);
  await frames(2);
  touch(FIRST_TOUCH, tapAt, false);
  await settle();
  assert(clicks() === clicksBeforeTouch + 1 && drag().session === sessionBefore, `A tap clicks and starts no drag: ${dropStatus()}`);

  move(FAR_CORNER);
  await settle();
  api.restoreDemo();
  await settle();
  api.grabSurfaceFocus();
  await settle();
}

/** The sections of this verifier, in the order they run (plan 0.4.1: `--only=<name>[,<name>]` runs just those; `scripts/verifier-sections.mjs`). */
type Section = (typeof NATIVE_INTERACTION_SECTIONS)[number];

/** What the run's arguments ask for: the sections to run and the ones a partial run leaves out. An unknown name is an error: a typo must not skip a section. */
function selectedSections(): SectionCoverage<Section> {
  const args = OS.getCmdlineUserArgs();
  const requested = requestedSections(Array.from({length: args.size()}, (_, i) => args.get(i)));
  return describeSections(NATIVE_INTERACTION_SECTIONS, NATIVE_OPT_IN_SECTIONS, requested);
}

export async function runInteractionVerification(owner: Node, api: InteractionInspection): Promise<void> {
  const directory = OS.getEnvironment('GODOT_REACT_ARTIFACTS') || 'user://react-ui-verification';
  assert(DirAccess.makeDirRecursiveAbsolute(directory) === GError.Ok, 'Cannot create evidence directory');
  const captures: string[] = [];
  async function capture(name: string, overflowing: readonly string[] = []): Promise<void> {
    await settle();
    const snapshot = api.snapshot();
    // The picture and the tree are saved before the geometry is judged, so a capture that fails leaves the evidence of what failed.
    RenderingServer.forceDraw();
    const image = owner.getViewport()?.getTexture()?.getImage();
    assert(image, 'Native verification requires a rendered viewport');
    const path = `${directory}/${name}.png`;
    assert(image.savePng(path) === GError.Ok, `Could not save ${path}`);
    captures.push(path);
    const file = FileAccess.open(`${directory}/${name}.json`, FileAccess.ModeFlags.Write);
    assert(file, 'Cannot write geometry evidence');
    file.storeString(JSON.stringify(snapshot));
    file.close();
    geometry(snapshot, new Set(overflowing.map(testID => get(api, testID).id)));
  }
  const coverage = selectedSections();
  const sections = new Set(coverage.run);
  await settle();
  // How long each section took, for the budget `scripts/verify.mjs` gives a window.
  const sectionMs: Record<string, number> = {};
  const sectionChecks: Record<string, number> = {};
  const timed = async <T>(name: Section, run: () => Promise<T>): Promise<T> => {
    const started = Time.getTicksMsec();
    const checksBefore = assertionTally.count;
    try {
      return await run();
    } finally {
      sectionMs[name] = Time.getTicksMsec() - started;
      sectionChecks[name] = assertionTally.count - checksBefore;
    }
  };
  // First: a face keeps what was added for characters no font has, so this must come before any section that shows such text (`verify-font-fallback.ts`).
  if (sections.has('font-fallback')) await timed('font-fallback', () => verifyFontFallback(api));
  const timing = sections.has('events') ? await timed('events', () => verifyEvents(api, owner, directory, capture)) : null;
  if (sections.has('cooperation')) await timed('cooperation', () => verifyGodotCooperation(owner, api, capture));
  if (sections.has('pointers')) await timed('pointers', () => verifyPointers(owner, api, capture));
  if (sections.has('keyboard')) await timed('keyboard', () => verifyKeyboard(owner, api, capture));
  if (sections.has('positioning')) await timed('positioning', () => verifyPositioning(owner, api, capture));
  if (sections.has('inputs')) await timed('inputs', () => verifyInputs(owner, api, capture));
  if (sections.has('scroll')) await timed('scroll', () => verifyScrolling(owner, api, capture));
  if (sections.has('selection')) await timed('selection', () => verifySelection(owner, api, capture));
  if (sections.has('drag')) await timed('drag', () => verifyDragging(owner, api, capture));
  if (sections.has('forms')) await timed('forms', () => verifyTextInput(owner, api, capture));
  if (sections.has('combobox')) await timed('combobox', () => verifyCombobox(owner, api, capture));
  if (sections.has('dropdown-touch')) await timed('dropdown-touch', () => verifyDropdownTouch(owner, api, capture));
  if (sections.has('touch-selection')) await timed('touch-selection', () => verifyTouchSelection(owner, api, capture));
  if (sections.has('hidpi')) await timed('hidpi', () => verifyHidpi(owner, api, capture));
  if (sections.has('filters')) await timed('filters', () => verifyFilters(owner, api, capture));
  if (sections.has('glass')) await timed('glass', () => verifyGlass(owner, api, capture));
  if (sections.has('navigator')) await timed('navigator', () => verifyNavigator(owner, api, capture));
  if (sections.has('transforms')) await timed('transforms', () => verifyTransforms(owner, api, capture));
  if (sections.has('paint')) await timed('paint', () => verifyPaint(owner, api, capture));
  if (sections.has('layout-utilities')) await timed('layout-utilities', () => verifyLayoutUtilities(owner, api));
  if (sections.has('text-styles')) await timed('text-styles', () => verifyTextStyles(owner, api, capture));
  if (sections.has('rich-text')) await timed('rich-text', () => verifyRichText(owner, api, capture));
  if (sections.has('live-compile')) await timed('live-compile', () => verifyLiveCompile(owner, api, capture));
  if (sections.has('code-editor')) await timed('code-editor', () => verifyCodeEditor(owner, api, capture));
  if (sections.has('key-passthrough')) await timed('key-passthrough', () => verifyKeyPassthrough(owner, api));
  if (sections.has('filters-sizes')) await timed('filters-sizes', () => verifyFilterSizes(owner, api, capture));
  if (sections.has('filters-cost')) await timed('filters-cost', () => measureFilterCost(owner, api));
  if (sections.has('transforms-faults')) await timed('transforms-faults', () => verifyTransformFaults(owner, api));
  if (sections.has('filters-faults')) await timed('filters-faults', () => verifyFilterFaults(owner, api, capture, GLASS_FAULT_CONTROLS));

  // A section that asserted nothing passed nothing; a run that left sections out says so (the verify script prints it).
  const empty = [...sections].filter(section => sectionChecks[section] === 0);
  if (empty.length > 0) throw new Error(`Section(s) ${empty.join(', ')} ran no assertion`);
  console.log('GODOT_REACT_INTERACTION_VERIFY_PASSED', JSON.stringify({sections: coverage.run, partial: coverage.partial, skipped: coverage.skipped, sectionChecks, sectionMs, captures, dispatchTiming: timing}));
}
