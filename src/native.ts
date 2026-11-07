import { LAYER_ROOT_TAG, type CommitPayload } from './commit';
import { isDropEffect, type DropEffect } from './data-transfer';
import type { NativeKind } from './props';
import { TRANSITION_PROPERTIES } from './types';
import type { TransitionProperty } from './types';

export type { NativeKind } from './props';

/** A Godot `PackedInt64Array`, as much of it as the renderer reads. */
export interface PackedTags {
  size(): number;
  get(index: number): number;
}

/** The ClassDB-facing API. Structural typing also permits fake hosts in tests. */
export interface NativeHost {
  /**
   * Apply one layer's commit payload (a JSON string, plan 4.1). An empty string means success;
   * anything else says why nothing changed.
   */
  commit(layer: number, payloadJson: string): string;
  /** The tags the last successful `commit` deleted. */
  takeCommitDeletions(): PackedTags;
  drainEvents(): string;
  getSnapshot(): string;
  /** The root-local rectangle of a node as JSON, or `null`. */
  getNodeRect(tag: number): string;
  /**
   * The root's size in logical pixels. The host is a `ReactUiRoot`, a `Control`, so this is `Control.size`
   * (`get_size()`), the very value native lays out in and resolves breakpoints against (`sync_viewport`).
   * Read on demand: the renderer makes no call until something asks for the size.
   */
  readonly size: { readonly x: number; readonly y: number };
  /** The tag of the first node created with `testId`, or -1. */
  findByTestId(testId: string): number;
  /**
   * `element.setPointerCapture(pointerId)`: the element receives the pointer's events until it is
   * released, the pointer goes up or is cancelled, or the element is removed. An empty string means
   * success; anything else says why nothing changed.
   */
  setPointerCapture(tag: number, pointerId: number): string;
  /** Only the capturing element can release; any other call does nothing. An empty string means success. */
  releasePointerCapture(tag: number, pointerId: number): string;
  hasPointerCapture(tag: number, pointerId: number): boolean;
  /**
   * `element.focus()`: focus the element and give the root Godot key focus. `focusVisible` is -1 to
   * follow the input modality, 0 for never, 1 for always. An empty string means success; anything
   * else says why nothing changed (not mounted, or it cannot take focus).
   */
  focusNode(tag: number, focusVisible: number): string;
  /** `element.blur()`: nothing happens unless the element holds focus. An empty string means success. */
  blurNode(tag: number): string;
  /**
   * `element.scrollTo(left, top)`: offsets as `scrollLeft` and `scrollTop` (zero or negative on a reversed
   * axis), clamped to the range. An empty string means success; anything else says why nothing changed (not
   * mounted, not a scroll container, not finite).
   */
  scrollTo(tag: number, left: number, top: number): string;
  /** `element.scrollBy(dx, dy)`. An empty string means success. */
  scrollBy(tag: number, dx: number, dy: number): string;
  /** Scroll the containers around the element, innermost first, just far enough to show it. An empty string means success. */
  scrollIntoView(tag: number): string;
  /** A scroll container's state as JSON (`NativeScrollState`), or `null` for anything else. */
  getScrollState(tag: number): string;
  /**
   * The document's text selection as JSON (`NativeSelection`), or `null` when nothing is selected. Offsets are in
   * UTF-16 code units, the unit JS counts string positions in.
   */
  getSelection(): string;
  /** Drop the document's text selection. Native queues `selectionchange` if there was one. */
  clearSelection(): void;
  /**
   * `setTextAndSelection(eventCount, value, start, end)` on a text input (plan 3.18): replace its text and
   * selection unless the user typed since the event count was read. `start` and `end` are UTF-16 offsets into
   * `value`, both -1 for the caret at the end. Returns '' when applied, `STALE_TEXT_COMMAND` when ignored for its
   * count, else why nothing changed.
   */
  setTextAndSelection(tag: number, eventCount: number, value: string, start: number, end: number): string;
  /** `setSelectionRange` on a text input: UTF-16 offsets into its text. An empty string means success. */
  setTextSelection(tag: number, start: number, end: number, backward: boolean): string;
  /** A text input's state as JSON (`NativeTextInputState`), or `null` for anything else. */
  getTextInputState(tag: number): string;
  /**
   * Where a caret at `offset` (UTF-16 units of the text the node shows, inlays not counted) is, as the root-local rectangle
   * JSON (`{x, y, width, height}`), `null` for a node that is not a mounted `Text`, or `{"error": reason}` for an offset past the
   * end or inside a surrogate pair. `side` is -1 for the position before generated text (an inlay) or at the end of a soft
   * wrapped line, and 1 for the position after it.
   */
  getCaretRect(tag: number, offset: number, side: number): string;
  /** The caret position nearest to a root-local point: `{"offset": n, "side": "before" | "after"}`, or `null` for a node that is not a mounted `Text`. */
  getOffsetAtPoint(tag: number, x: number, y: number): string;
  /** The root-local rectangles `start..end` covers, one or more per line, as JSON; `null` or `{"error": reason}` as for `getCaretRect`. */
  getRangeRects(tag: number, start: number, end: number): string;
  /**
   * Answer the one event native is awaiting (`cancelable: true`). An empty string means success.
   * `dropEffect` is '' (not set), 'none', 'copy', 'move' or 'link'.
   */
  resolveEvent(seq: number, defaultPrevented: boolean, dropEffect: string): string;
}

export interface NativeDiagnosticsHost extends NativeHost {
  setProfiling(enabled: boolean): void;
  takeProfile(): string;
  getActivity(): string;
}

export interface NativeActivity {
  batches: number;
  layoutPasses: number;
  paintPasses: number;
  animationFrames: number;
  animating: boolean;
  trackedTransitions: number;
  clockMs: number;
  drawSerial: number;
  nodeCount: number;
  /** Commit counters (plan 4.5): what the mounting and render layers did, cumulatively. */
  mutations: number;
  nodesUpdated: number;
  nodesRestyled: number;
  boxRecords: number;
  contentRecords: number;
  /** What the filter and backdrop-filter effects hold and have done, cumulatively (plan Phase V1). */
  effects: NativeEffectsActivity;
  /** The textures (shadow and outline masks, gradient ramps) the boxes hold: none while no box has a shadow, ring, outline or gradient. */
  paintTextures: number;
}

export interface NativeEffectsActivity {
  /** Elements with live backdrop items / a live filter group. */
  backdrops: number;
  groups: number;
  /** Elements that ask for an effect and cannot have it, because a filter group is above them. */
  blocked: number;
  /** Backdrops whose copy rectangle is set (not culled or clipped away). */
  copiesEnabled: number;
  itemsCreated: number;
  materialsCreated: number;
  /** Materials freed again: created minus freed is the number an element's live effects hold. */
  materialsFreed: number;
  shadersCreated: number;
  /** Times a material's parameters were written. */
  materialUpdates: number;
  copyRectUpdates: number;
  /** Times a group walked its subtree for the rectangle it covers (it keeps the answer until something inside changes). */
  subtreeWalks: number;
  /** Groups that have a Compatibility probe, which makes their mipmaps readable. */
  probes: number;
  /** Refreshes of the effects' rectangles that had something to do, and the microseconds they took in all. */
  refreshes: number;
  refreshMicros: number;
}

/** How a blur was built: the back-buffer mip level read and the Gaussian reconstruction on it. */
export interface NativeBlurPlan {
  level: number;
  kernelTexels: number;
  pairs: number;
  /** The standard deviation drawn, in render-target pixels; less than asked when the target has too few mip levels. */
  achievedPx: number;
  clamped: boolean;
}

/** How an element's effect items hang (`RenderNode::layout_name`): `both` has the backdrop outside the group, on its shell; `both-in-wrapper` inside it. */
export type NativeEffectsLayout = 'plain' | 'backdrop' | 'group' | 'both' | 'both-in-wrapper';

export interface NativeEffects {
  backdrop: { plan: NativeBlurPlan | null; region: [number, number, number, number] | null; kind: string | null } | null;
  /** `culled`: the element's opacity is too low for the engine to draw anything of it, so its group is not drawn either. */
  filter: { plan: NativeBlurPlan | null; kind: string | null; probe: boolean; culled: boolean } | null;
  layout: NativeEffectsLayout;
}

/** A transform's matrix: CSS `matrix(a, b, c, d, e, f)` of the element's own frame about its origin. */
export type NativeMatrix = [number, number, number, number, number, number];

export interface NativeTransition {
  id: number;
  property: TransitionProperty;
  /** A number, a colour or a filter list as text, or a transform's matrix. */
  current: number | string | NativeMatrix;
  target: number | string | NativeMatrix;
  startedAtMs: number;
  durationMs: number;
}

type NativeSampleKind = 'batch' | 'frame' | 'draw';
export interface NativeTimingSample {
  kind: NativeSampleKind;
  [field: string]: number | NativeSampleKind;
}
export interface NativeProfile {
  samples: NativeTimingSample[];
  dropped: number;
  counters: NativeActivity;
}

export type NativePointerEventType =
  | 'pointerdown' | 'pointerup' | 'pointermove' | 'pointerenter' | 'pointerleave' | 'pointercancel'
  | 'click' | 'dblclick' | 'auxclick' | 'contextmenu';
export type NativeWheelEventType = 'wheel';
export type NativeScrollEventType = 'scroll';
export type NativeFocusEventType = 'focus' | 'blur';
export type NativeKeyEventType = 'keydown' | 'keyup';
export type NativeAccessibilityEventType = 'accessibilityaction';
export type NativeSelectionEventType = 'selectionchange';
export type NativeDragEventType = 'dragstart' | 'drag' | 'dragenter' | 'dragleave' | 'dragover' | 'drop' | 'dragend';
export type NativeCompositionEventType = 'compositionstart' | 'compositionupdate' | 'compositionend';
export type NativeEventType =
  | NativePointerEventType | NativeWheelEventType | NativeScrollEventType | NativeKeyEventType | NativeFocusEventType
  | NativeAccessibilityEventType | NativeSelectionEventType | NativeDragEventType | 'beforeinput' | 'input'
  | NativeCompositionEventType;

/** '' is synthetic keyboard activation, as in browsers. */
export type NativePointerType = 'mouse' | 'touch' | '';

interface NativeEventBase {
  /** Monotonic per root, starting at 1. */
  seq: number;
  /** 0 addresses root listeners only. */
  target: number;
  /** The target and then its ancestors up to its layer's top-level node; empty for target 0. */
  path: number[];
  /** True only while native is blocked waiting for `resolveEvent(seq, ...)`. */
  cancelable: boolean;
  /** Milliseconds on the engine tick clock when native queued the event. */
  timeStamp: number;
}

/** What every event with a pointer position carries. */
export interface NativeMouseFields extends NativeEventBase {
  /** Root-local logical pixels. */
  x: number;
  y: number;
  /** Canvas coordinates. */
  viewportX: number;
  viewportY: number;
  pointerId: number;
  pointerType: NativePointerType;
  /** DOM `button`, -1 when the event is not a button change. */
  button: number;
  /** DOM `buttons` bitmask. */
  buttons: number;
  /** Click count. */
  detail: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface NativePointerEvent extends NativeMouseFields {
  type: NativePointerEventType;
  /** Enter and leave events: the element left towards or entered from. */
  relatedTarget: number | null;
  /** Enter and leave events: `relatedTarget`'s path (empty if none). */
  relatedPath: number[];
}

/** A wheel tick or trackpad pan; cancelable. Deltas are in wheel ticks, positive down and right. */
export interface NativeWheelEvent extends NativeMouseFields {
  type: NativeWheelEventType;
  deltaX: number;
  deltaY: number;
}

export interface NativeFocusEvent extends NativeEventBase {
  type: NativeFocusEventType;
  /** The element on the other side of the focus change, if there is one. */
  relatedTarget: number | null;
  /** The (new, for `focus`; old, for `blur`) focus is a keyboard focus. */
  focusVisible: boolean;
}

/** A key press, echo or release; `keydown` is cancelable. */
export interface NativeKeyEvent extends NativeEventBase {
  type: NativeKeyEventType;
  /** DOM `KeyboardEvent.key`. */
  key: string;
  /** DOM `KeyboardEvent.code`. */
  code: string;
  repeat: boolean;
  isComposing: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/** What an assistive technology can ask of a slider (plan 3.21): step it, or set it to a number. */
export type NativeAccessibilityAction = 'increment' | 'decrement' | 'setValue';

/**
 * An assistive technology acted on the element's accessibility node. Not cancelable: native has no default
 * action to keep. `click`, `focus` and `blur` actions reach JS as the ordinary events.
 */
export interface NativeAccessibilityActionEvent extends NativeEventBase {
  type: NativeAccessibilityEventType;
  action: NativeAccessibilityAction;
  /** The requested value of `setValue`; `null` for `increment` and `decrement`. */
  value: number | null;
}

/**
 * A scroll container moved (or was re-clamped by layout). Not cancelable, and coalesced per container: JS
 * sees where the container is when it looks, not every step. The size fields are the DOM's: the client size
 * is the padding box, the scroll size is the client size plus the range the content can move.
 */
export interface NativeScrollEvent extends NativeEventBase {
  type: NativeScrollEventType;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
}

/**
 * The document's text selection changed. Addressed to the root's listeners (target 0), not cancelable, and carries
 * nothing: ask the root for `getSelection()`. Native coalesces the changes of one delivery into one event.
 */
export interface NativeDocumentSelectionChangeEvent extends NativeEventBase {
  type: NativeSelectionEventType;
}

/** A text input's selection moved: addressed to the input, UTF-16 units, ordered. */
export interface NativeInputSelectionChangeEvent extends NativeEventBase {
  type: NativeSelectionEventType;
  selectionStart: number;
  selectionEnd: number;
}

/** Both events share the wire name `selectionchange`; the target tells them apart (0 is the document's). */
export type NativeSelectionChangeEvent = NativeDocumentSelectionChangeEvent | NativeInputSelectionChangeEvent;

/** The DOM `inputType`s a text input's edits have (plan 4.3). */
export type NativeInputType =
  | 'insertText' | 'insertLineBreak' | 'insertFromPaste' | 'insertReplacementText' | 'deleteContentBackward'
  | 'deleteContentForward' | 'deleteWordBackward' | 'deleteWordForward' | 'deleteSoftLineBackward'
  | 'deleteSoftLineForward' | 'deleteByCut' | 'historyUndo' | 'historyRedo';

/** A text input is about to make this edit. Cancelable: native waits for the answer. */
export interface NativeBeforeInputEvent extends NativeEventBase {
  type: 'beforeinput';
  inputType: NativeInputType;
  /** The text an insertion carries, as given (before `maxLength` and line break handling). */
  data: string | null;
}

/**
 * A text input's text changed because of an edit. The selection is in UTF-16 units, and `eventCount` is the
 * number a `setTextAndSelection` answering this event must carry for native to apply it.
 */
export interface NativeInputEvent extends NativeEventBase {
  type: 'input';
  inputType: NativeInputType;
  data: string | null;
  value: string;
  selectionStart: number;
  selectionEnd: number;
  eventCount: number;
}

/** The IME's preedit: its text now, empty at the start and at the end of a composition. */
export interface NativeCompositionEvent extends NativeEventBase {
  type: NativeCompositionEventType;
  data: string;
}

/**
 * A drag-and-drop event (plan 3.19). `dragstart`, `dragover` and `drop` are cancelable. Every event of one
 * drag carries the same `sessionId`, which is how JS finds the drag's `DataTransfer` store.
 */
export interface NativeDragEvent extends NativeMouseFields {
  type: Exclude<NativeDragEventType, 'dragend'>;
  /** `dragenter`: the element the pointer came from; `dragleave`: the element it goes to. */
  relatedTarget: number | null;
  sessionId: number;
}

/** The last event of a drag: how it ended. */
export interface NativeDragEndEvent extends NativeMouseFields {
  type: 'dragend';
  relatedTarget: number | null;
  sessionId: number;
  /** `none` for a drag that was not dropped or was cancelled. */
  dropEffect: DropEffect;
  /** The pointer was released beyond the root. False for a cancelled drag, which was not released anywhere. */
  endedOutsideRoot: boolean;
}

export type NativeEvent =
  | NativePointerEvent | NativeWheelEvent | NativeScrollEvent | NativeKeyEvent | NativeFocusEvent | NativeAccessibilityActionEvent
  | NativeBeforeInputEvent | NativeInputEvent | NativeSelectionChangeEvent | NativeCompositionEvent
  | NativeDragEvent | NativeDragEndEvent;

/** One end of the selection: a `Text` element and a UTF-16 offset into its text. */
export interface NativeSelectionPoint {
  tag: number;
  offset: number;
}

/**
 * The document's text selection (plan 3.17): where it started (`anchor`) and where it ends (`focus`, which may come
 * before the anchor), and the text copying it would produce (the selected nodes' text joined by `\n`).
 */
export interface NativeSelection {
  anchor: NativeSelectionPoint;
  focus: NativeSelectionPoint;
  isCollapsed: boolean;
  text: string;
}

/**
 * A scroll container's position and range. The offsets of a reversed axis (`flex-col-reverse`) are zero or
 * negative, as in the DOM, and the range each can take is `min...max`.
 */
export interface NativeScrollState {
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
  minScrollLeft: number;
  maxScrollLeft: number;
  minScrollTop: number;
  maxScrollTop: number;
  /** Where the overlay scrollbar thumbs are drawn, root-local; each is `null` when that axis has no bar. */
  thumbs: { x: LayoutRect | null; y: LayoutRect | null } | null;
  /**
   * Where the scrollbar tracks lie, root-local; each is `null` when that axis cannot scroll. Unlike `thumbs`
   * they are there for `scrollbar-width: none` too, because the accessibility tree's scroll bar element for an
   * axis that scrolls covers its track whether or not the bar is drawn.
   */
  tracks: { x: LayoutRect | null; y: LayoutRect | null } | null;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NativeSnapshotNode {
  id: number;
  kind: NativeKind;
  /** 0 is the main layer, 1 the overlay layer. */
  layer: number;
  text: string;
  /** The React tree's parent; events, inheritance, layout and Tab order follow it. */
  parent: number | null;
  children: number[];
  /** Who paints and hit-tests the node: its parent, unless it is `absolute` or `fixed`. */
  paintParent: number | null;
  /** Its place among what its paint parent paints, back to front (`zIndex`, then document order). */
  paintIndex: number;
  /** Its place in document order (pre-order of the whole tree, main layer first). */
  documentIndex: number;
  /** Root-local, and clipped through the paint ancestors. */
  rect: LayoutRect;
  clipRect: LayoutRect | null;
  presentation: {
    width: number; height: number; widthIsAuto: boolean; heightIsAuto: boolean; opacity: number; backgroundColor: string;
    /** The text colour and the border colour as `#rrggbbaa`: the values a transition is moving, or the computed ones. */
    color: string; borderColor: string;
  };
  /** The node's computed style: inherited values, then every style layer that applies. */
  style: Record<string, unknown>;
  /** The native props the node was last given (`style` as compiled layers, `text`, `disabled`, ...). */
  props: Record<string, unknown>;
  /** Set for a scroll container: where it is scrolled and how far it can go. */
  scroll: NativeScrollState | null;
  /** Set for a text input: what native holds of it and draws. */
  textInput: NativeTextInputSnapshot | null;
  /** Set while the element has a filter or backdrop-filter that is drawn. */
  effects: NativeEffects | null;
  /**
   * Set while the element has a transform that does something (the sampled one while it transitions): the matrix of its
   * own frame about its origin, of which `rect` is the bounding box.
   */
  transform: NativeMatrix | null;
  /**
   * The factor text and rounded corners are rasterised at on top of the viewport's, for the transforms on the element
   * and above it, as of the last time they settled; `null` until the element has been placed or while no transform exists.
   */
  rasterScale: number | null;
}

/** A text input's state as JS reads it (`getTextInputState`). Offsets are UTF-16 units. */
export interface NativeTextInputState {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  selectionDirection: 'forward' | 'backward';
  /** What a `setTextAndSelection` must carry to be applied: the number of `input` events so far. */
  eventCount: number;
  composing: boolean;
  /** The IME's preedit and the part of it being converted, while composing. */
  preedit: { text: string; selectionStart: number; selectionEnd: number } | null;
  scrollLeft: number;
  scrollTop: number;
  caretVisible: boolean;
  inputDirection: 'ltr' | 'rtl';
}

/** The snapshot's view of a text input: its state and what it draws. */
export interface NativeTextInputSnapshot extends NativeTextInputState {
  /** The text drawn: the value with the preedit spliced in, or bullets for a secure input. */
  displayText: string;
  showingPlaceholder: boolean;
  /** The caret's rectangle, root-local, or `null` while it cannot be laid out. */
  caret: LayoutRect | null;
}

export interface NativeSnapshot {
  clockMs: number;
  /**
   * Device pixels per logical pixel the root's text and rounded edges were last drawn at: the font oversampling of the
   * viewport it is in (2 on a window at a content scale of 2, 1 in a `SubViewport` that is not stretched).
   */
  oversampling: number;
  transitions: NativeTransition[];
  nodes: NativeSnapshotNode[];
  stats: {
    layoutPasses: number;
    /** Successful commits. */
    batches: number;
    nodeCount: number;
    paintPasses: number;
    layoutMicros: number;
    /** The same count as `batches`: successful commits. */
    commits: number;
    animationFrames: number;
    nodesCreated: number;
    nodesUpdated: number;
    nodesDeleted: number;
    /** Nodes whose computed style changed and was published (commit, hover, press, focus, breakpoint). */
    nodesRestyled: number;
    /** Removes, deletes, creates, updates and inserts the mounting layer applied. */
    mutations: number;
    /** Canvas-item command lists re-recorded: boxes (background, border) and contents (text). */
    boxRecords: number;
    contentRecords: number;
    /** Scroll containers whose offset changed, and scrollbar overlays re-recorded. Scrolling changes these and nothing above. */
    scrollUpdates: number;
    overlayRecords: number;
  };
  width: number;
  height: number;
  hovered: number | null;
  focused: number | null;
  pressed: number | null;
  /** The focused element's focus is a keyboard focus: `:focus-visible` matches and the ring is drawn. */
  focusVisible: boolean;
  /** How the user last gave input. */
  modality: 'keyboard' | 'pointer';
  /** Every pointer native knows: the mouse, and each touch while it is down. */
  pointers: NativePointerState[];
  /** The drag-and-drop state machine (plan 3.19). */
  drag: NativeDragState;
}

/**
 * The root's one drag. `busy` is only seen by a handler of a drag event, while native is in the middle of an
 * input; `ended` is a gesture that finished but whose pointer is still down.
 */
export interface NativeDragState {
  state: 'idle' | 'pending' | 'dragging' | 'ended' | 'busy';
  /** The number of the latest drag (0 before the first). */
  session: number;
  source: number | null;
  /** The element under the dragged pointer. */
  target: number | null;
  pointer: number | null;
  /** Root-local: where the pointer went down, and where it is. */
  origin: { x: number; y: number } | null;
  position: { x: number; y: number } | null;
  /** The effect the current target accepted with its latest `dragover`; `null` shows the forbidden cursor. */
  allowedEffect: DropEffect | null;
  /** The drag ghost as drawn, root-local, with the number of elements it copies; `null` if there is none. */
  ghost: (LayoutRect & { elements: number }) | null;
  lastEnd: { reason: NativeDragEndReason; dropEffect: DropEffect; endedOutsideRoot: boolean } | null;
}

export type NativeDragEndReason = 'dropped' | 'released' | 'escape' | 'pointercancel' | 'rootexit';

export interface NativePointerState {
  id: number;
  type: 'mouse' | 'touch';
  /** Root-local logical pixels. */
  x: number;
  y: number;
  /** DOM `buttons`. */
  buttons: number;
  /** A button (or the touch contact) is down. */
  down: boolean;
  /** The element receiving the pointer's events regardless of what is under it. */
  capture: { target: number; implicit: boolean } | null;
}

const MAX_NODE_ID = 0xffff_ffff;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid native ${label}: expected an object`);
  }
  return value;
}

function number(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid native ${label}: expected a finite number`);
  }
  return value;
}

function id(value: unknown, label: string): number {
  const result = number(value, label);
  if (!Number.isInteger(result) || result < 0 || result > MAX_NODE_ID) {
    throw new Error(`Invalid native ${label}: expected a u32 node ID`);
  }
  return result;
}

function optionalId(value: unknown, label: string): number | null {
  return value === null ? null : id(value, label);
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid native ${label}: expected a string`);
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid native ${label}: expected a boolean`);
  return value;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid native ${label}: expected an array`);
  return value;
}

function kind(value: unknown): NativeKind {
  if (value === 'view' || value === 'text' || value === 'button' || value === 'textinput') return value;
  throw new Error(`Invalid native node kind: ${String(value)}`);
}

function eventType(value: unknown): NativeEventType {
  switch (value) {
    case 'pointerdown': case 'pointerup': case 'pointermove': case 'pointerenter':
    case 'pointerleave': case 'pointercancel': case 'click': case 'dblclick': case 'auxclick':
    case 'contextmenu': case 'wheel': case 'scroll': case 'keydown': case 'keyup': case 'focus': case 'blur':
    case 'accessibilityaction': case 'selectionchange': case 'dragstart': case 'drag': case 'dragenter': case 'dragleave':
    case 'dragover': case 'drop': case 'dragend': case 'beforeinput': case 'input':
    case 'compositionstart': case 'compositionupdate': case 'compositionend':
      return value;
    default:
      throw new Error(`Invalid native event type: ${String(value)}`);
  }
}

function accessibilityAction(value: unknown): NativeAccessibilityAction {
  if (value === 'increment' || value === 'decrement' || value === 'setValue') return value;
  throw new Error(`Invalid native accessibility action: ${String(value)}`);
}

function modality(value: unknown): 'keyboard' | 'pointer' {
  if (value === 'keyboard' || value === 'pointer') return value;
  throw new Error(`Invalid native modality: ${String(value)}`);
}

function pointerType(value: unknown): NativePointerType {
  if (value === 'mouse' || value === 'touch' || value === '') return value;
  throw new Error(`Invalid native pointer type: ${String(value)}`);
}

function integer(value: unknown, label: string): number {
  const result = number(value, label);
  if (!Number.isInteger(result)) throw new Error(`Invalid native ${label}: expected an integer`);
  return result;
}

function nonnegativeInteger(value: unknown, label: string): number {
  const result = number(value, label);
  if (!Number.isInteger(result) || result < 0) {
    throw new Error(`Invalid native ${label}: expected a nonnegative integer`);
  }
  return result;
}

function idList(value: unknown, label: string): number[] {
  return array(value, label).map((entry) => id(entry, label));
}

const INPUT_TYPES: readonly NativeInputType[] = [
  'insertText', 'insertLineBreak', 'insertFromPaste', 'insertReplacementText', 'deleteContentBackward',
  'deleteContentForward', 'deleteWordBackward', 'deleteWordForward', 'deleteSoftLineBackward',
  'deleteSoftLineForward', 'deleteByCut', 'historyUndo', 'historyRedo',
];

function inputType(value: unknown): NativeInputType {
  const found = INPUT_TYPES.find((candidate) => candidate === value);
  if (found === undefined) throw new Error(`Invalid native input type: ${String(value)}`);
  return found;
}

function nullableString(value: unknown, label: string): string | null {
  return value === null ? null : string(value, label);
}

function mouseFields(base: NativeEventBase, event: Record<string, unknown>): NativeMouseFields {
  return {
    ...base,
    x: number(event.x, 'event.x'), y: number(event.y, 'event.y'),
    viewportX: number(event.viewportX, 'event.viewportX'), viewportY: number(event.viewportY, 'event.viewportY'),
    pointerId: nonnegativeInteger(event.pointerId, 'event.pointerId'),
    pointerType: pointerType(event.pointerType),
    button: number(event.button, 'event.button'),
    buttons: nonnegativeInteger(event.buttons, 'event.buttons'),
    detail: nonnegativeInteger(event.detail, 'event.detail'),
    shiftKey: boolean(event.shiftKey, 'event.shiftKey'), ctrlKey: boolean(event.ctrlKey, 'event.ctrlKey'),
    altKey: boolean(event.altKey, 'event.altKey'), metaKey: boolean(event.metaKey, 'event.metaKey'),
  };
}

function pointerEvent(type: NativePointerEventType, base: NativeEventBase, event: Record<string, unknown>): NativePointerEvent {
  return {
    ...mouseFields(base, event), type,
    relatedTarget: optionalId(event.relatedTarget, 'event.relatedTarget'),
    relatedPath: event.relatedPath === undefined ? [] : idList(event.relatedPath, 'event.relatedPath'),
  };
}

function dropEffect(value: unknown, label: string): DropEffect {
  if (!isDropEffect(value)) throw new Error(`Invalid native ${label}: ${String(value)}`);
  return value;
}

function dragEvent(type: NativeDragEvent['type'], base: NativeEventBase, event: Record<string, unknown>): NativeDragEvent {
  return {
    ...mouseFields(base, event), type,
    relatedTarget: optionalId(event.relatedTarget, 'event.relatedTarget'),
    sessionId: nonnegativeInteger(event.sessionId, 'event.sessionId'),
  };
}

function dragEndEvent(base: NativeEventBase, event: Record<string, unknown>): NativeDragEndEvent {
  return {
    ...mouseFields(base, event), type: 'dragend',
    relatedTarget: optionalId(event.relatedTarget, 'event.relatedTarget'),
    sessionId: nonnegativeInteger(event.sessionId, 'event.sessionId'),
    dropEffect: dropEffect(event.dropEffect, 'event.dropEffect'),
    endedOutsideRoot: boolean(event.endedOutsideRoot, 'event.endedOutsideRoot'),
  };
}

function wheelEvent(base: NativeEventBase, event: Record<string, unknown>): NativeWheelEvent {
  return {
    ...mouseFields(base, event), type: 'wheel',
    deltaX: number(event.deltaX, 'event.deltaX'), deltaY: number(event.deltaY, 'event.deltaY'),
  };
}

function scrollEvent(base: NativeEventBase, event: Record<string, unknown>): NativeScrollEvent {
  return {
    ...base, type: 'scroll',
    scrollLeft: number(event.scrollLeft, 'event.scrollLeft'), scrollTop: number(event.scrollTop, 'event.scrollTop'),
    scrollWidth: number(event.scrollWidth, 'event.scrollWidth'), scrollHeight: number(event.scrollHeight, 'event.scrollHeight'),
    clientWidth: number(event.clientWidth, 'event.clientWidth'), clientHeight: number(event.clientHeight, 'event.clientHeight'),
  };
}

function nativeEvent(entry: unknown): NativeEvent {
  const event = record(entry, 'event');
  const base: NativeEventBase = {
    seq: nonnegativeInteger(event.seq, 'event.seq'),
    target: id(event.target, 'event.target'),
    path: idList(event.path, 'event.path'),
    cancelable: boolean(event.cancelable, 'event.cancelable'),
    timeStamp: number(event.timeStamp, 'event.timeStamp'),
  };
  const type = eventType(event.type);
  switch (type) {
    case 'pointerdown': case 'pointerup': case 'pointermove': case 'pointerenter':
    case 'pointerleave': case 'pointercancel': case 'click': case 'dblclick': case 'auxclick':
    case 'contextmenu':
      return pointerEvent(type, base, event);
    case 'wheel':
      return wheelEvent(base, event);
    case 'scroll':
      return scrollEvent(base, event);
    case 'keydown': case 'keyup':
      return {
        ...base, type, key: string(event.key, 'event.key'), code: string(event.code, 'event.code'),
        repeat: boolean(event.repeat, 'event.repeat'), isComposing: boolean(event.isComposing, 'event.isComposing'),
        shiftKey: boolean(event.shiftKey, 'event.shiftKey'), ctrlKey: boolean(event.ctrlKey, 'event.ctrlKey'),
        altKey: boolean(event.altKey, 'event.altKey'), metaKey: boolean(event.metaKey, 'event.metaKey'),
      };
    case 'focus': case 'blur':
      return {
        ...base, type, relatedTarget: optionalId(event.relatedTarget, 'event.relatedTarget'),
        focusVisible: boolean(event.focusVisible, 'event.focusVisible'),
      };
    case 'accessibilityaction':
      return {
        ...base, type, action: accessibilityAction(event.action),
        value: event.value === null ? null : number(event.value, 'event.value'),
      };
    case 'beforeinput':
      return { ...base, type, inputType: inputType(event.inputType), data: nullableString(event.data, 'event.data') };
    case 'input':
      return {
        ...base, type, inputType: inputType(event.inputType), data: nullableString(event.data, 'event.data'),
        value: string(event.value, 'event.value'),
        selectionStart: nonnegativeInteger(event.selectionStart, 'event.selectionStart'),
        selectionEnd: nonnegativeInteger(event.selectionEnd, 'event.selectionEnd'),
        eventCount: nonnegativeInteger(event.eventCount, 'event.eventCount'),
      };
    case 'selectionchange':
      // The document's event is addressed to the root (target 0) and carries nothing; an input's is addressed to it.
      if (base.target === LAYER_ROOT_TAG) return { ...base, type };
      return {
        ...base, type,
        selectionStart: nonnegativeInteger(event.selectionStart, 'event.selectionStart'),
        selectionEnd: nonnegativeInteger(event.selectionEnd, 'event.selectionEnd'),
      };
    case 'compositionstart': case 'compositionupdate': case 'compositionend':
      return { ...base, type, data: string(event.data, 'event.data') };
    case 'dragstart': case 'drag': case 'dragenter': case 'dragleave': case 'dragover': case 'drop':
      return dragEvent(type, base, event);
    case 'dragend':
      return dragEndEvent(base, event);
  }
}

function textInputState(value: unknown, label: string): NativeTextInputState {
  const state = record(value, label);
  const direction = state.selectionDirection;
  if (direction !== 'forward' && direction !== 'backward') throw new Error(`Invalid native ${label}.selectionDirection`);
  const inputDirection = state.inputDirection;
  if (inputDirection !== 'ltr' && inputDirection !== 'rtl') throw new Error(`Invalid native ${label}.inputDirection`);
  const preedit = state.preedit === null ? null : record(state.preedit, `${label}.preedit`);
  return {
    value: string(state.value, `${label}.value`),
    selectionStart: nonnegativeInteger(state.selectionStart, `${label}.selectionStart`),
    selectionEnd: nonnegativeInteger(state.selectionEnd, `${label}.selectionEnd`),
    selectionDirection: direction,
    eventCount: nonnegativeInteger(state.eventCount, `${label}.eventCount`),
    composing: boolean(state.composing, `${label}.composing`),
    preedit: preedit === null ? null : {
      text: string(preedit.text, `${label}.preedit.text`),
      selectionStart: nonnegativeInteger(preedit.selectionStart, `${label}.preedit.selectionStart`),
      selectionEnd: nonnegativeInteger(preedit.selectionEnd, `${label}.preedit.selectionEnd`),
    },
    scrollLeft: number(state.scrollLeft, `${label}.scrollLeft`),
    scrollTop: number(state.scrollTop, `${label}.scrollTop`),
    caretVisible: boolean(state.caretVisible, `${label}.caretVisible`),
    inputDirection,
  };
}

function textInputSnapshot(value: unknown, label: string): NativeTextInputSnapshot {
  const snapshot = record(value, label);
  return {
    ...textInputState(value, label),
    displayText: string(snapshot.displayText, `${label}.displayText`),
    showingPlaceholder: boolean(snapshot.showingPlaceholder, `${label}.showingPlaceholder`),
    caret: snapshot.caret === null ? null : rect(snapshot.caret, `${label}.caret`),
  };
}

function rect(value: unknown, label: string): LayoutRect {
  const object = record(value, label);
  return {
    x: number(object.x, `${label}.x`), y: number(object.y, `${label}.y`),
    width: number(object.width, `${label}.width`), height: number(object.height, `${label}.height`),
  };
}

function scrollState(value: unknown, label: string): NativeScrollState {
  const state = record(value, label);
  return {
    scrollLeft: number(state.scrollLeft, `${label}.scrollLeft`), scrollTop: number(state.scrollTop, `${label}.scrollTop`),
    scrollWidth: number(state.scrollWidth, `${label}.scrollWidth`), scrollHeight: number(state.scrollHeight, `${label}.scrollHeight`),
    clientWidth: number(state.clientWidth, `${label}.clientWidth`), clientHeight: number(state.clientHeight, `${label}.clientHeight`),
    minScrollLeft: number(state.minScrollLeft, `${label}.minScrollLeft`), maxScrollLeft: number(state.maxScrollLeft, `${label}.maxScrollLeft`),
    minScrollTop: number(state.minScrollTop, `${label}.minScrollTop`), maxScrollTop: number(state.maxScrollTop, `${label}.maxScrollTop`),
    thumbs: state.thumbs === null ? null : thumbRects(state.thumbs, `${label}.thumbs`),
    tracks: state.tracks === null ? null : thumbRects(state.tracks, `${label}.tracks`),
  };
}

function point(value: unknown, label: string): { x: number; y: number } {
  const object = record(value, label);
  return { x: number(object.x, `${label}.x`), y: number(object.y, `${label}.y`) };
}

function dragState(value: unknown): NativeDragState {
  const drag = record(value, 'snapshot.drag');
  const state = drag.state;
  if (state !== 'idle' && state !== 'pending' && state !== 'dragging' && state !== 'ended' && state !== 'busy') {
    throw new Error(`Invalid native drag state: ${String(state)}`);
  }
  const ghost = drag.ghost === null ? null : record(drag.ghost, 'drag.ghost');
  const lastEnd = drag.lastEnd === null ? null : record(drag.lastEnd, 'drag.lastEnd');
  return {
    state, session: nonnegativeInteger(drag.session, 'drag.session'),
    source: optionalId(drag.source, 'drag.source'), target: optionalId(drag.target, 'drag.target'),
    pointer: optionalId(drag.pointer, 'drag.pointer'),
    origin: drag.origin === null ? null : point(drag.origin, 'drag.origin'),
    position: drag.position === null ? null : point(drag.position, 'drag.position'),
    allowedEffect: drag.allowedEffect === null ? null : dropEffect(drag.allowedEffect, 'drag.allowedEffect'),
    ghost: ghost === null ? null : { ...rect(ghost, 'drag.ghost'), elements: nonnegativeInteger(ghost.elements, 'drag.ghost.elements') },
    lastEnd: lastEnd === null ? null : {
      reason: dragEndReason(lastEnd.reason), dropEffect: dropEffect(lastEnd.dropEffect, 'drag.lastEnd.dropEffect'),
      endedOutsideRoot: boolean(lastEnd.endedOutsideRoot, 'drag.lastEnd.endedOutsideRoot'),
    },
  };
}

function dragEndReason(value: unknown): NativeDragEndReason {
  if (value === 'dropped' || value === 'released' || value === 'escape' || value === 'pointercancel' || value === 'rootexit') {
    return value;
  }
  throw new Error(`Invalid native drag end reason: ${String(value)}`);
}

function thumbRects(value: unknown, label: string): { x: LayoutRect | null; y: LayoutRect | null } {
  const thumbs = record(value, label);
  return {
    x: thumbs.x === null ? null : rect(thumbs.x, `${label}.x`),
    y: thumbs.y === null ? null : rect(thumbs.y, `${label}.y`),
  };
}

function transitionProperty(value: unknown): TransitionProperty {
  const property = TRANSITION_PROPERTIES.find(candidate => candidate === value);
  if (property !== undefined) return property;
  throw new Error(`Invalid native transition property: ${String(value)}`);
}

function matrix(value: unknown, name: string): NativeMatrix {
  const numbers = array(value, name).map(entry => number(entry, name));
  const [a, b, c, d, e, f] = numbers;
  if (numbers.length !== 6 || a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined) {
    throw new Error(`Native ${name} must be six numbers`);
  }
  return [a, b, c, d, e, f];
}

function transitionValue(value: unknown): number | string | NativeMatrix {
  if (Array.isArray(value)) return matrix(value, 'transition matrix');
  return typeof value === 'string' ? value : number(value, 'transition value');
}

export function readActivity(host: NativeDiagnosticsHost): NativeActivity {
  const value: unknown = JSON.parse(host.getActivity());
  return parseActivity(value);
}

function parseActivity(value: unknown): NativeActivity {
  const activity = record(value, 'activity');
  if (typeof activity.animating !== 'boolean') throw new Error('Native activity.animating must be boolean');
  return {
    batches: number(activity.batches, 'batches'),
    layoutPasses: number(activity.layoutPasses, 'layoutPasses'),
    paintPasses: number(activity.paintPasses, 'paintPasses'),
    animationFrames: number(activity.animationFrames, 'animationFrames'),
    animating: activity.animating,
    trackedTransitions: number(activity.trackedTransitions, 'trackedTransitions'),
    clockMs: number(activity.clockMs, 'clockMs'),
    drawSerial: number(activity.drawSerial, 'drawSerial'),
    nodeCount: number(activity.nodeCount, 'nodeCount'),
    mutations: number(activity.mutations, 'mutations'),
    nodesUpdated: number(activity.nodesUpdated, 'nodesUpdated'),
    nodesRestyled: number(activity.nodesRestyled, 'nodesRestyled'),
    boxRecords: number(activity.boxRecords, 'boxRecords'),
    contentRecords: number(activity.contentRecords, 'contentRecords'),
    effects: effectsActivity(activity.effects),
    paintTextures: number(activity.paintTextures, 'paintTextures'),
  };
}

function effectsActivity(value: unknown): NativeEffectsActivity {
  const effects = record(value, 'activity.effects');
  return {
    backdrops: number(effects.backdrops, 'effects.backdrops'),
    groups: number(effects.groups, 'effects.groups'),
    blocked: number(effects.blocked, 'effects.blocked'),
    copiesEnabled: number(effects.copiesEnabled, 'effects.copiesEnabled'),
    itemsCreated: number(effects.itemsCreated, 'effects.itemsCreated'),
    materialsCreated: number(effects.materialsCreated, 'effects.materialsCreated'),
    materialsFreed: number(effects.materialsFreed, 'effects.materialsFreed'),
    shadersCreated: number(effects.shadersCreated, 'effects.shadersCreated'),
    materialUpdates: number(effects.materialUpdates, 'effects.materialUpdates'),
    copyRectUpdates: number(effects.copyRectUpdates, 'effects.copyRectUpdates'),
    subtreeWalks: number(effects.subtreeWalks, 'effects.subtreeWalks'),
    probes: number(effects.probes, 'effects.probes'),
    refreshes: number(effects.refreshes, 'effects.refreshes'),
    refreshMicros: number(effects.refreshMicros, 'effects.refreshMicros'),
  };
}

function blurPlan(value: unknown, label: string): NativeBlurPlan | null {
  if (value === null) return null;
  const plan = record(value, label);
  return {
    level: nonnegativeInteger(plan.level, `${label}.level`), kernelTexels: number(plan.kernelTexels, `${label}.kernelTexels`),
    pairs: nonnegativeInteger(plan.pairs, `${label}.pairs`), achievedPx: number(plan.achievedPx, `${label}.achievedPx`),
    clamped: boolean(plan.clamped, `${label}.clamped`),
  };
}

function nodeEffects(value: unknown): NativeEffects | null {
  if (value === null) return null;
  const effects = record(value, 'node.effects');
  const kind = (entry: unknown): string | null => (entry === null ? null : string(entry, 'effects kind'));
  const backdrop = effects.backdrop === null ? null : record(effects.backdrop, 'effects.backdrop');
  const filter = effects.filter === null ? null : record(effects.filter, 'effects.filter');
  return {
    backdrop: backdrop === null ? null : {
      plan: blurPlan(backdrop.plan, 'effects.backdrop.plan'),
      region: backdrop.region === null ? null : regionTuple(backdrop.region),
      kind: kind(backdrop.kind),
    },
    filter: filter === null ? null : {
      plan: blurPlan(filter.plan, 'effects.filter.plan'), kind: kind(filter.kind),
      probe: boolean(filter.probe, 'effects.filter.probe'), culled: boolean(filter.culled, 'effects.filter.culled'),
    },
    layout: effectsLayout(effects.layout),
  };
}

function effectsLayout(value: unknown): NativeEffectsLayout {
  if (value === 'plain' || value === 'backdrop' || value === 'group' || value === 'both' || value === 'both-in-wrapper') return value;
  throw new Error(`Invalid native effects layout: ${String(value)}`);
}

function regionTuple(value: unknown): [number, number, number, number] {
  const items = array(value, 'effects region').map(entry => number(entry, 'effects region entry'));
  const [x, y, width, height] = items;
  if (items.length !== 4 || x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error('Native effects region must be four numbers');
  }
  return [x, y, width, height];
}

export function takeNativeProfile(host: NativeDiagnosticsHost): NativeProfile {
  const value: unknown = JSON.parse(host.takeProfile());
  const profile = record(value, 'profile');
  return {
    dropped: number(profile.dropped, 'profile dropped'), counters: parseActivity(profile.counters),
    samples: array(profile.samples, 'profile samples').map(value => {
      const fields = record(value, 'profile sample');
      const kind = fields.kind;
      if (kind !== 'batch' && kind !== 'frame' && kind !== 'draw') throw new Error('Invalid native profile sample kind');
      const sample: NativeTimingSample = {kind};
      for (const [key, value] of Object.entries(fields)) {
        if (key !== 'kind') sample[key] = number(value, `profile ${key}`);
      }
      return sample;
    }),
  };
}

export function readEvents(host: NativeHost): NativeEvent[] {
  const value: unknown = JSON.parse(host.drainEvents());
  return array(value, 'events').map(nativeEvent);
}

/** Report the outcome of an awaited (`cancelable`) event. Native rejects any other sequence number. */
export function resolveEvent(host: NativeHost, seq: number, defaultPrevented: boolean, dropEffect = ''): void {
  const error = host.resolveEvent(seq, defaultPrevented, dropEffect);
  if (error !== '') throw new Error(`Native resolveEvent rejected event ${seq}: ${error}`);
}

export function readSnapshot(host: NativeHost): NativeSnapshot {
  const value: unknown = JSON.parse(host.getSnapshot());
  const snapshot = record(value, 'snapshot');
  const stats = record(snapshot.stats, 'snapshot.stats');
  return {
    clockMs: number(snapshot.clockMs, 'snapshot.clockMs'),
    oversampling: number(snapshot.oversampling, 'snapshot.oversampling'),
    transitions: array(snapshot.transitions, 'snapshot.transitions').map(value => {
      const transition = record(value, 'transition');
      return {
        id: id(transition.id, 'transition.id'), property: transitionProperty(transition.property),
        current: transitionValue(transition.current), target: transitionValue(transition.target),
        startedAtMs: number(transition.startedAtMs, 'transition.startedAtMs'),
        durationMs: number(transition.durationMs, 'transition.durationMs'),
      };
    }),
    nodes: array(snapshot.nodes, 'snapshot.nodes').map((entry) => {
      const node = record(entry, 'node');
      const presentation = record(node.presentation, 'node.presentation');
      return {
        id: id(node.id, 'node.id'),
        kind: kind(node.kind),
        layer: nonnegativeInteger(node.layer, 'node.layer'),
        text: string(node.text, 'node.text'),
        parent: optionalId(node.parent, 'node.parent'),
        children: array(node.children, 'node.children').map((child) => id(child, 'child ID')),
        paintParent: optionalId(node.paintParent, 'node.paintParent'),
        paintIndex: nonnegativeInteger(node.paintIndex, 'node.paintIndex'),
        documentIndex: integer(node.documentIndex, 'node.documentIndex'),
        rect: rect(node.rect, 'node.rect'),
        clipRect: node.clipRect === null ? null : rect(node.clipRect, 'node.clipRect'),
        presentation: {
          width: number(presentation.width, 'presentation.width'),
          height: number(presentation.height, 'presentation.height'),
          widthIsAuto: boolean(presentation.widthIsAuto, 'presentation.widthIsAuto'),
          heightIsAuto: boolean(presentation.heightIsAuto, 'presentation.heightIsAuto'),
          opacity: number(presentation.opacity, 'presentation.opacity'),
          backgroundColor: string(presentation.backgroundColor, 'presentation.backgroundColor'),
          color: string(presentation.color, 'presentation.color'),
          borderColor: string(presentation.borderColor, 'presentation.borderColor'),
        },
        style: record(node.style, 'node.style'),
        props: record(node.props, 'node.props'),
        scroll: node.scroll === null ? null : scrollState(node.scroll, 'node.scroll'),
        textInput: node.textInput === null ? null : textInputSnapshot(node.textInput, 'node.textInput'),
        effects: nodeEffects(node.effects),
        transform: node.transform === null ? null : matrix(node.transform, 'node.transform'),
        rasterScale: node.rasterScale === null ? null : number(node.rasterScale, 'node.rasterScale'),
      };
    }),
    stats: {
      layoutPasses: number(stats.layoutPasses, 'stats.layoutPasses'),
      batches: number(stats.batches, 'stats.batches'),
      commits: number(stats.commits, 'stats.commits'),
      animationFrames: number(stats.animationFrames, 'stats.animationFrames'),
      nodeCount: number(stats.nodeCount, 'stats.nodeCount'),
      paintPasses: number(stats.paintPasses, 'stats.paintPasses'),
      layoutMicros: number(stats.layoutMicros, 'stats.layoutMicros'),
      nodesCreated: number(stats.nodesCreated, 'stats.nodesCreated'),
      nodesUpdated: number(stats.nodesUpdated, 'stats.nodesUpdated'),
      nodesDeleted: number(stats.nodesDeleted, 'stats.nodesDeleted'),
      nodesRestyled: number(stats.nodesRestyled, 'stats.nodesRestyled'),
      mutations: number(stats.mutations, 'stats.mutations'),
      boxRecords: number(stats.boxRecords, 'stats.boxRecords'),
      contentRecords: number(stats.contentRecords, 'stats.contentRecords'),
      scrollUpdates: number(stats.scrollUpdates, 'stats.scrollUpdates'),
      overlayRecords: number(stats.overlayRecords, 'stats.overlayRecords'),
    },
    width: number(snapshot.width, 'snapshot.width'),
    height: number(snapshot.height, 'snapshot.height'),
    hovered: optionalId(snapshot.hovered, 'snapshot.hovered'),
    focused: optionalId(snapshot.focused, 'snapshot.focused'),
    pressed: optionalId(snapshot.pressed, 'snapshot.pressed'),
    focusVisible: boolean(snapshot.focusVisible, 'snapshot.focusVisible'),
    modality: modality(snapshot.modality),
    drag: dragState(snapshot.drag),
    pointers: array(snapshot.pointers, 'snapshot.pointers').map((entry) => {
      const pointer = record(entry, 'pointer');
      const type = pointer.type;
      if (type !== 'mouse' && type !== 'touch') throw new Error(`Invalid native pointer kind: ${String(type)}`);
      const capture = pointer.capture === null ? null : record(pointer.capture, 'pointer.capture');
      return {
        id: nonnegativeInteger(pointer.id, 'pointer.id'), type,
        x: number(pointer.x, 'pointer.x'), y: number(pointer.y, 'pointer.y'),
        buttons: nonnegativeInteger(pointer.buttons, 'pointer.buttons'),
        down: boolean(pointer.down, 'pointer.down'),
        capture: capture === null ? null : { target: id(capture.target, 'capture.target'), implicit: boolean(capture.implicit, 'capture.implicit') },
      };
    }),
  };
}

export interface CommitTiming {
  jsonEncodeMs: number;
  nativeCallMs: number;
  jsonChars: number;
}

/** Send one layer's commit payload. Throws, leaving the mounted tree unchanged, if native rejects it. */
export function commitPayload(host: NativeHost, layer: number, payload: CommitPayload, now?: () => number): CommitTiming | undefined {
  const encodeStart = now?.();
  const json = JSON.stringify(payload);
  const callStart = now?.();
  const error = host.commit(layer, json);
  const callEnd = now?.();
  if (error !== '') throw new Error(`Native UI commit rejected: ${error}`);
  if (encodeStart === undefined || callStart === undefined || callEnd === undefined) return;
  return {jsonEncodeMs: callStart - encodeStart, nativeCallMs: callEnd - callStart, jsonChars: json.length};
}

/** Throw if native refused a pointer-capture request (DOM throws `NotFoundError` or `InvalidStateError`). */
export function checkCapture(error: string, method: string): void {
  if (error !== '') throw new Error(`${method} failed: ${error}`);
}

/** Throw if native refused a focus request (DOM's `focus()` ignores these silently; ours says why). */
export function checkFocus(error: string, method: string): void {
  if (error !== '') throw new Error(`${method} failed: ${error}`);
}

/** Throw if native refused a scroll command (DOM's `scrollTo` ignores these silently; ours says why). */
export function checkScroll(error: string, method: string): void {
  if (error !== '') throw new Error(`${method} failed: ${error}`);
}

/** A scroll container's state, or `undefined` for a node that is not one (or is gone). */
export function readScrollState(host: NativeHost, tag: number): NativeScrollState | undefined {
  const value: unknown = JSON.parse(host.getScrollState(tag));
  return value === null ? undefined : scrollState(value, 'scroll state');
}

function selectionPoint(value: unknown, label: string): NativeSelectionPoint {
  const point = record(value, label);
  return { tag: id(point.tag, `${label}.tag`), offset: nonnegativeInteger(point.offset, `${label}.offset`) };
}

/** The document's text selection, or `undefined` when nothing is selected. */
export function readSelection(host: NativeHost): NativeSelection | undefined {
  const value: unknown = JSON.parse(host.getSelection());
  if (value === null) return undefined;
  const selection = record(value, 'selection');
  return {
    anchor: selectionPoint(selection.anchor, 'selection.anchor'),
    focus: selectionPoint(selection.focus, 'selection.focus'),
    isCollapsed: boolean(selection.isCollapsed, 'selection.isCollapsed'),
    text: string(selection.text, 'selection.text'),
  };
}

/** What `setTextAndSelection` returns for a command it ignored because its event count was old. */
export const STALE_TEXT_COMMAND = 'stale';

/**
 * Send `setTextAndSelection`. Returns whether native applied it: `false` means the user typed since `eventCount` was
 * read (nothing changed, and the next `input` event lets the caller reconcile again). Any other refusal throws.
 */
export function setTextAndSelection(
  host: NativeHost, tag: number, eventCount: number, value: string, start: number, end: number,
): boolean {
  const result = host.setTextAndSelection(tag, eventCount, value, start, end);
  if (result === '') return true;
  if (result === STALE_TEXT_COMMAND) return false;
  throw new Error(`setTextAndSelection failed: ${result}`);
}

/** Throw if native refused `setSelectionRange`. */
export function setTextSelection(host: NativeHost, tag: number, start: number, end: number, backward: boolean): void {
  const result = host.setTextSelection(tag, start, end, backward);
  if (result !== '') throw new Error(`setSelectionRange failed: ${result}`);
}

/** A text input's value, selection and event count, or `undefined` for a node that is not a mounted text input. */
export function readTextInputState(host: NativeHost, tag: number): NativeTextInputState | undefined {
  const value: unknown = JSON.parse(host.getTextInputState(tag));
  return value === null ? undefined : textInputState(value, 'text input state');
}

/** The tags the commit that just succeeded deleted. */
export function readDeletions(host: NativeHost): number[] {
  const tags = host.takeCommitDeletions();
  const deleted: number[] = [];
  for (let index = 0; index < tags.size(); index += 1) deleted.push(id(tags.get(index), 'deleted tag'));
  return deleted;
}

export function readNodeRect(host: NativeHost, tag: number): LayoutRect | undefined {
  const value: unknown = JSON.parse(host.getNodeRect(tag));
  return value === null ? undefined : rect(value, 'node rect');
}

/** Which side of generated text (an inlay), or of a soft line break, a text position is on. */
export type TextSide = 'before' | 'after';

/** `getCaretRect`'s `side` on the wire. */
const SIDE_BEFORE = -1;
const SIDE_AFTER = 1;

/** A text position: an offset into the text a node shows (inlays not counted) and the side of what sits there it is on. */
export interface NativeTextPosition {
  readonly offset: number;
  readonly side: TextSide;
}

/** `null` is a node that is not a mounted `Text`; a reply with an `error` is an argument native refused. */
function textGeometryReply(json: string, method: string): Record<string, unknown> | undefined {
  const value: unknown = JSON.parse(json);
  if (value === null) return undefined;
  const reply = record(value, method);
  if (reply.error !== undefined) throw new RangeError(`${method} failed: ${string(reply.error, `${method}.error`)}`);
  return reply;
}

/** The caret rectangle at `offset`, root-local, or `undefined` for an element that is gone. Throws `RangeError` for an offset native refuses. */
export function readCaretRect(host: NativeHost, tag: number, offset: number, side: TextSide): LayoutRect | undefined {
  const reply = textGeometryReply(host.getCaretRect(tag, offset, side === 'before' ? SIDE_BEFORE : SIDE_AFTER), 'getCaretRect');
  return reply === undefined ? undefined : rect(reply, 'caret rect');
}

/** The caret position nearest to `(x, y)`, root-local, or `undefined` for an element that is gone. */
export function readOffsetAtPoint(host: NativeHost, tag: number, x: number, y: number): NativeTextPosition | undefined {
  const reply = textGeometryReply(host.getOffsetAtPoint(tag, x, y), 'getOffsetAtPoint');
  if (reply === undefined) return undefined;
  const side = reply.side;
  if (side !== 'before' && side !== 'after') throw new Error(`Invalid native text position side: ${String(side)}`);
  return { offset: nonnegativeInteger(reply.offset, 'text position.offset'), side };
}

/** The rectangles `start..end` covers, root-local, or `undefined` for an element that is gone. Throws `RangeError` for a range native refuses. */
export function readRangeRects(host: NativeHost, tag: number, start: number, end: number): LayoutRect[] | undefined {
  const reply = textGeometryReply(host.getRangeRects(tag, start, end), 'getRangeRects');
  if (reply === undefined) return undefined;
  const rects = reply.rects;
  if (!Array.isArray(rects)) throw new Error('Invalid native range rects');
  return rects.map((entry: unknown) => rect(entry, 'range rect'));
}

/** The tag of the first node created with `testID`, if any. */
export function findTag(host: NativeHost, testID: string): number | undefined {
  const tag = host.findByTestId(testID);
  return tag < 0 ? undefined : id(tag, 'tag');
}
