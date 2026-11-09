import { createContext, createElement, version as reactVersion, type ReactNode } from 'react';
import Reconciler from 'react-reconciler';
import {
  ConcurrentRoot, ContinuousEventPriority, DefaultEventPriority,
  DiscreteEventPriority, NoEventPriority,
} from 'react-reconciler/constants';
import { buildCommit, type CommitNode } from './commit';
import type { HostProps, TextInputHandle, UIHandle, UIProps, UISelection } from './components';
import { DragSessions, type DragDispatch } from './drag';
import { anyChordMatches, parseKeyChordsOf, type KeyChord, type KeyPlatform, type KeyPress } from './key-claims';
import { pagePassthrough, type KeyPassthrough, type KeyPassthroughRegistration } from './key-passthrough';
import type { NativeTextInputState } from './native';
import {
  dispatchEvent, exclusiveAncestry, isNativeDragEvent, NOT_DISPATCHED, RootListeners,
  type DispatchResult, type PathNode, type UIEventMap,
} from './events';
import {
  checkCapture, checkFocus, checkScroll, commitPayload, findTag, readCaretRect, readDeletions, readEvents, readNodeRect,
  readOffsetAtPoint, readRangeRects, readScrollState,
  readSelection, readSnapshot, readTextInputState, readTouchSelection, resolveEvent, setTextAndSelection, setTextSelection,
  type LayoutRect, type NativeDragEndEvent, type NativeDragEvent, type NativeEvent, type NativeEventType, type NativeHost,
  type NativePointerEvent, type NativeSnapshot, type NativeSnapshotNode, type NativeTouchSelection,
} from './native';
import { nativeProps, scalarText, type NativeKind, type NativeProps, type PreviousProps } from './props';
import { checkSpanProps, flattenRichText, type RichPart, type RichRun, type RichSpan } from './rich-text';
import { RendererProfiler, type RendererProfile } from './profile';

/** The native tag of the layer root, which is also the target of events addressed to the root. */
const LAYER_ROOT_TAG = 0;
const MAIN_LAYER = 0;
const OVERLAY_LAYER = 1;
const MAX_TAG = 0xffff_ffff;
/** `focusNode`'s `focusVisible` argument for "follow how the user last gave input". */
const FOCUS_VISIBLE_BY_MODALITY = -1;
/** What each kind of element is called in JSX, for the errors that name one. */
const COMPONENT_NAMES: Readonly<Record<NativeKind, string>> = { view: 'View', text: 'Text', button: 'Button', textinput: 'TextInput' };
/** Where a host element is being created: React Native's `isInAParentText`. Strings and nested `Text` are runs of a `Text` only. */
interface TextContext {
  readonly insideText: boolean;
}
const OUTSIDE_TEXT: TextContext = Object.freeze({ insideText: false });
const INSIDE_TEXT: TextContext = Object.freeze({ insideText: true });
/**
 * Guard against an event storm. Each round drains everything native has queued; handlers that keep
 * producing input-driven events for this many rounds are a bug, not a condition to tolerate.
 */
const MAX_EVENT_DRAIN_ROUNDS = 64;

/**
 * One element as React completed it. Instances are immutable once React has built them: a change
 * clones the instance (and every ancestor) and shares the unchanged children by reference, which is
 * what lets the commit walk skip whole subtrees (plan 3.9).
 */
interface Instance extends CommitNode<Instance> {
  readonly root: RootState;
  /** Full React props, handlers included. */
  readonly props: HostProps;
  /** The native children. A `Text` has none: what it holds is in `parts`. */
  readonly children: Instance[];
  /**
   * What a `Text` holds when its children are more than plain strings and numbers: its strings and its nested `Text`, in
   * order. Its native `text` and `spans` are the flattening of these (`flattenRichText`), made when the commit walk first
   * reads `native`, after React has appended every child.
   */
  readonly parts?: RichPart[];
}

/**
 * A `Text` nested in another: a run of its parent's text, not an element. It has no tag, is never committed natively and its
 * parent's `spans` carry it. React Native does the same (a virtual text shadow node).
 */
interface SpanInstance extends RichSpan {
  readonly root: RootState;
  readonly content: RichPart[];
}

/** What React's host config holds: elements and the runs inside a `Text`. */
type HostInstance = Instance | SpanInstance;

/** One tree of instances native mounts as a layer; React calls its callbacks with this. */
interface LayerContainer {
  readonly kind: 'layer';
  readonly root: RootState;
  readonly layer: number;
  /** The layer's top-level tags as of the last successful commit. */
  rootTags: number[];
  /** The portals with something in them, oldest first: what the overlay layer's top level is, so what opened last paints on top. */
  readonly portals: PortalContainer[];
}

/**
 * One `<Portal>`'s share of the overlay layer. React's persistent mode replaces a portal's container's whole child list whenever that
 * portal changes, and empties it when the portal is deleted (`emptyPortalContainer`), so portals that shared one container erased
 * each other: a second open popover, or a list in a dialog.
 */
interface PortalContainer {
  readonly kind: 'portal';
  readonly root: RootState;
  readonly overlay: LayerContainer;
  children: readonly Instance[];
}

type Container = LayerContainer | PortalContainer;

interface RootState {
  readonly host: NativeHost;
  readonly profiler: RendererProfiler;
  /** Where failures after the first go: `onError`, else the console. */
  readonly report: (error: Error) => void;
  nextTag: number;
  /** The instances native has accepted, by tag, across both layers. Events and handles read this. */
  readonly committed: Map<number, Instance>;
  /** Public handles, stable across clones, dropped when native deletes the tag. */
  readonly handles: Map<number, UIHandle>;
  readonly main: LayerContainer;
  /** Created with the first render. */
  overlay: LayerContainer | undefined;
  unmounted: boolean;
  failure: Error | undefined;
  /** True while `dispatchEvents` drains native events; a nested call returns at once. */
  dispatching: boolean;
  /**
   * Every mounted element's place in document order, built on first use after a commit that changed the
   * tree's structure and dropped by the next one (`documentIndices`).
   */
  documentOrder: ReadonlyMap<number, number> | undefined;
  /** The root's size as last read, or `undefined` until something asks for it (`readRootSize`). */
  size: RootSize | undefined;
  /**
   * The text selection as last read from native, wrapped so that "nothing selected" can be cached too. Dropped when
   * a `selectionchange` arrives or JS clears the selection; `readTextSelection` fills it.
   */
  selectionCache: { readonly value: UISelection | undefined } | undefined;
  readonly sizeListeners: Set<() => void>;
  readonly listeners: RootListeners;
  /** The chords the app claimed for the whole root (`claimKeys`), one list for each call. */
  readonly claimedChords: Set<readonly KeyChord[]>;
  /** The `DataTransfer` stores of the drags underway (plan 3.19). */
  readonly drags: DragSessions;
  /** Handle for the layer root, the target of events addressed to root listeners only. */
  readonly handle: UIHandle;
  unsubscribe: (() => void) | undefined;
}

/** The root's size in logical pixels: the `Control`'s size, which native lays out in and resolves breakpoints against. */
export interface RootSize {
  readonly width: number;
  readonly height: number;
}

export interface RootOptions {
  /**
   * Call `listener` whenever the native root has queued input events that must be delivered now.
   * The Godot owner connects it to the root's `eventsReady` signal and returns a function that
   * disconnects it; `unmount()` calls that function. Native emits from inside its input callbacks, so
   * `listener` runs synchronously and cancelable events are answered before the callback returns.
   */
  subscribeToEvents(listener: () => void): () => void;
  /** React error-boundary reports are forwarded here; unhandled errors also fail the caller. */
  onError?: (error: Error) => void;
  /** Profiling is disabled by default; native hosts can supply a high-resolution clock. */
  profile?: boolean;
  now?: () => number;
  /**
   * On the Web, whether a key chord that nothing in this root claims (Cmd+R, Cmd+F, Cmd+T, F5, F12) goes to the browser instead of the
   * engine, as on a page that does not prevent it. Default true; `setKeyPassthrough` changes it later. Ignored where there is no page
   * (the native platforms). See `UIProps.keyClaims` and `UIRoot.claimKeys` for how an app claims a chord (docs/tracks/key-passthrough.md).
   */
  keyPassthrough?: boolean;
  /** The page's key decision this root joins: the browser's `window` by default. Hosts with a page of their own, and tests, supply one. */
  keyPassthroughPage?: KeyPassthrough;
}

export interface UIRoot {
  /** Commits immediately; subsequent hook updates use React's normal scheduler. */
  render(children: ReactNode): void;
  /**
   * Runs `work`, which may set state, and commits what it scheduled before returning, as React DOM's `flushSync` does. A state
   * update made outside an event is committed with the next frame's microtasks; an editor that swaps code under a page and must know
   * now whether the new page rendered calls this. Throws what the commit threw.
   */
  flushSync<T>(work: () => T): T;
  /** Runs React cleanup and releases the entire native subtree. Idempotent. */
  unmount(): void;
  /**
   * Drain and dispatch native events. Input callbacks reach this through `subscribeToEvents`; call it
   * once per Godot frame as well, for events native queued outside an input callback.
   */
  dispatchEvents(): void;
  /** Listen on the root itself, after elements' bubble phase. Returns the remover. */
  addEventListener<K extends NativeEventType>(type: K, listener: (event: UIEventMap[K]) => void): () => void;
  /**
   * Claim key chords for the app as a whole, whatever has focus: `root.claimKeys(['Mod+K'])` for a shortcut a root listener handles. A claimed
   * chord reaches the engine and this root's `keydown` listeners; an unclaimed one goes to the browser (`UIProps.keyClaims` has the rule and
   * the spelling). Throws for a chord that does not parse. Returns the remover.
   */
  claimKeys(chords: readonly string[]): () => void;
  /** Whether chords nothing claims go to the browser (`RootOptions.keyPassthrough`). */
  setKeyPassthrough(enabled: boolean): void;
  /**
   * The document's text selection (elements with `userSelect: text`), or `undefined` when nothing is selected. It
   * reads native, so the answer is the selection as of now; listen for `selectionchange` to know when it moved.
   */
  getSelection(): UISelection | undefined;
  /** Clears the text selection (`selectionchange` follows if there was one). Does not touch keyboard focus. */
  clearSelection(): void;
  /**
   * The handles and edit menu a touch selection shows (a long press on selectable text or in a text input made it), as they are on
   * screen, or `undefined` when there are none. They are drawn by the root, not elements; this is where a test or an app finds them.
   */
  getTouchSelection(): NativeTouchSelection | undefined;
  getSnapshot(): NativeSnapshot;
  /** The first element created with this `testID`, from a native query. */
  findByTestID(testID: string): NativeSnapshotNode | undefined;
  setProfiling(enabled: boolean): void;
  takeProfile(): RendererProfile;
}

/** The strings of a nested `Text` whose children are plain: it has no child fibers, so its text is read from its props. */
function plainRuns(props: HostProps): RichRun[] {
  const text = scalarText(props.children);
  return text === undefined || text === '' ? [] : [{ kind: 'run', text }];
}

/** A `Text` with strings and nested `Text` among its children holds them as parts; a plain one is read from its props. */
function holdsParts(kind: NativeKind, props: HostProps): boolean {
  return kind === 'text' && scalarText(props.children) === undefined;
}

/**
 * An element. A `Text` that holds parts reads its native props lazily: React appends its children after it makes the
 * instance, and its `text` and `spans` are the flattening of them. Every other element's are made at once.
 */
function makeInstance(
  tag: number, kind: NativeKind, root: RootState, props: HostProps, hidden: boolean, previous: PreviousProps | undefined,
  children: Instance[], parts: RichPart[] | undefined,
): Instance {
  if (parts === undefined) return { tag, kind, root, props, native: nativeProps(kind, props, hidden, previous), children };
  let native: NativeProps | undefined;
  return {
    tag, kind, root, props, children, parts,
    get native() {
      native ??= nativeProps(kind, props, hidden, previous, flattenRichText(parts));
      return native;
    },
  };
}

function createInstance(kind: NativeKind, props: HostProps, container: Container, context: TextContext): HostInstance {
  const root = container.root;
  if (kind === 'text' && context.insideText) {
    checkSpanProps(props);
    return { kind: 'span', root, props, content: plainRuns(props), hidden: false };
  }
  if (kind === 'text' && props.inlay === true) throw new Error('inlay is only valid on a <Text> nested in another <Text>');
  if (root.nextTag > MAX_TAG) throw new Error('UI root exhausted its u32 tags');
  const tag = root.nextTag++;
  return makeInstance(tag, kind, root, props, false, undefined, [], holdsParts(kind, props) ? [] : undefined);
}

function cloneInstance(
  instance: Instance, oldProps: HostProps, newProps: HostProps, keepChildren: boolean, hidden: boolean,
): Instance {
  const kept = keepChildren ? instance.parts : undefined;
  return makeInstance(
    instance.tag, instance.kind, instance.root, newProps, hidden, { props: oldProps, native: instance.native },
    keepChildren ? instance.children : [], holdsParts(instance.kind, newProps) ? (kept ?? []) : undefined,
  );
}

function cloneSpan(span: SpanInstance, newProps: HostProps, keepChildren: boolean, hidden: boolean): SpanInstance {
  checkSpanProps(newProps);
  return {
    kind: 'span', root: span.root, props: newProps, hidden,
    content: scalarText(newProps.children) !== undefined ? plainRuns(newProps) : keepChildren ? span.content : [],
  };
}

/** The pointer-capture methods of the handle of `tag`, which native validates. */
function captureMethods(host: NativeHost, tag: number): Pick<UIHandle, 'setPointerCapture' | 'releasePointerCapture' | 'hasPointerCapture'> {
  return {
    setPointerCapture(pointerId) { checkCapture(host.setPointerCapture(tag, pointerId), 'setPointerCapture'); },
    releasePointerCapture(pointerId) { checkCapture(host.releasePointerCapture(tag, pointerId), 'releasePointerCapture'); },
    hasPointerCapture(pointerId) { return host.hasPointerCapture(tag, pointerId); },
  };
}

/** The focus methods of the handle of `tag`, which native validates. */
function focusMethods(host: NativeHost, tag: number): Pick<UIHandle, 'focus' | 'blur'> {
  return {
    focus(options) {
      const visible = options?.focusVisible;
      checkFocus(host.focusNode(tag, visible === undefined ? FOCUS_VISIBLE_BY_MODALITY : visible ? 1 : 0), 'focus');
    },
    blur() { checkFocus(host.blurNode(tag), 'blur'); },
  };
}

/**
 * Every mounted element's place in document order: the pre-order of the whole tree, the main layer
 * first and then the overlay layer. It is the order native uses for Tab and reports as
 * `documentIndex` in the snapshot (`MountedTree::document_order`), computed here from the committed
 * instances so a query makes no native call. Built on the first query after a commit that changed
 * the tree's structure, which is the only thing that can change it.
 */
function documentIndices(root: RootState): ReadonlyMap<number, number> {
  if (root.documentOrder !== undefined) return root.documentOrder;
  const order = new Map<number, number>();
  const pending: Instance[] = [];
  for (const container of [root.main, root.overlay]) {
    if (container === undefined) continue;
    // The stack pops the next element to visit, so a layer's top-level elements are pushed last first.
    for (let index = container.rootTags.length - 1; index >= 0; index -= 1) {
      const top = root.committed.get(container.rootTags[index] ?? LAYER_ROOT_TAG);
      if (top !== undefined) pending.push(top);
    }
    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      order.set(next.tag, order.size);
      for (let index = next.children.length - 1; index >= 0; index -= 1) {
        const child = next.children[index];
        if (child !== undefined) pending.push(child);
      }
    }
  }
  root.documentOrder = order;
  return order;
}

/** `handle`'s place in document order; throws for an element that is gone or that another root owns. */
function documentIndexOf(root: RootState, handle: UIHandle): number {
  const index = root.handles.get(handle.id) === handle ? documentIndices(root).get(handle.id) : undefined;
  if (index === undefined) throw new Error(`compareDocumentOrder: element ${handle.id} is not mounted in this root`);
  return index;
}

/** The scroll methods of the handle of `tag`, which native validates. */
function scrollMethods(host: NativeHost, tag: number): Pick<UIHandle, 'scrollTo' | 'scrollBy' | 'scrollIntoView' | 'getScrollState'> {
  return {
    scrollTo(position) {
      // An axis left out keeps its offset, so native always gets both.
      const current = position.left === undefined || position.top === undefined ? readScrollState(host, tag) : undefined;
      const left = position.left ?? current?.scrollLeft ?? 0;
      const top = position.top ?? current?.scrollTop ?? 0;
      checkScroll(host.scrollTo(tag, left, top), 'scrollTo');
    },
    scrollBy(delta) { checkScroll(host.scrollBy(tag, delta.left ?? 0, delta.top ?? 0), 'scrollBy'); },
    scrollIntoView() { checkScroll(host.scrollIntoView(tag), 'scrollIntoView'); },
    getScrollState() { return readScrollState(host, tag); },
  };
}

/** The text state of a text input, which must be mounted. */
function textState(host: NativeHost, tag: number): NativeTextInputState {
  const state = readTextInputState(host, tag);
  if (state === undefined) throw new Error(`Text input ${tag} is not mounted`);
  return state;
}

/** The UTF-16 offsets a selection range may have in `value`: whole characters, so no offset inside a surrogate pair. */
function selectionDirection(direction: 'forward' | 'backward' | 'none' | undefined): boolean {
  return direction === 'backward';
}

/** The extra methods of a text input's handle. */
function textInputMethods(host: NativeHost, tag: number): Omit<TextInputHandle, keyof UIHandle> {
  return {
    get value() { return textState(host, tag).value; },
    get selectionStart() { return textState(host, tag).selectionStart; },
    get selectionEnd() { return textState(host, tag).selectionEnd; },
    get selectionDirection() { return textState(host, tag).selectionDirection; },
    select() {
      const state = textState(host, tag);
      setTextSelection(host, tag, 0, state.value.length, false);
    },
    setSelectionRange(start, end, direction) { setTextSelection(host, tag, start, end, selectionDirection(direction)); },
    setTextAndSelection(eventCount, value, start, end) {
      if ((start === undefined) !== (end === undefined)) {
        throw new Error('setTextAndSelection needs both a start and an end, or neither');
      }
      return setTextAndSelection(host, tag, eventCount, value, start ?? NO_SELECTION, end ?? NO_SELECTION);
    },
  };
}

/** `setTextAndSelection`'s start and end for "the caret at the end of the new text". */
const NO_SELECTION = -1;

/** The geometry methods of a `Text`'s handle: where its text is. */
function textMethods(host: NativeHost, tag: number): Pick<UIHandle, 'getCaretRect' | 'getOffsetAtPoint' | 'getRangeRects'> {
  return {
    getCaretRect(offset, side = 'after') { return readCaretRect(host, tag, offset, side); },
    getOffsetAtPoint(x, y) { return readOffsetAtPoint(host, tag, x, y); },
    getRangeRects(start, end) { return readRangeRects(host, tag, start, end); },
  };
}

/** What the same methods do on an element that is not a `Text`. */
function notText(kind: NativeKind): Pick<UIHandle, 'getCaretRect' | 'getOffsetAtPoint' | 'getRangeRects'> {
  const refuse = (method: string) => (): never => { throw new Error(`${method} is only available on a Text, not on a ${kind} element`); };
  return { getCaretRect: refuse('getCaretRect'), getOffsetAtPoint: refuse('getOffsetAtPoint'), getRangeRects: refuse('getRangeRects') };
}

/** The public handle of a tag; created on first use and stable across clones. */
function handleFor(root: RootState, tag: number, kind: NativeKind): UIHandle {
  let handle = root.handles.get(tag);
  if (handle === undefined) {
    const own: UIHandle = handle = {
      id: tag,
      get testID() { return root.committed.get(tag)?.props.testID; },
      getRect() { return readNodeRect(root.host, tag); },
      compareDocumentOrder(other) { return documentIndexOf(root, own) - documentIndexOf(root, other); },
      ...captureMethods(root.host, tag),
      ...focusMethods(root.host, tag),
      ...scrollMethods(root.host, tag),
      ...(kind === 'text' ? textMethods(root.host, tag) : notText(kind)),
    };
    // Its value and selection are read when asked for, so they are defined as accessors (a spread would read them).
    if (kind === 'textinput') Object.defineProperties(own, Object.getOwnPropertyDescriptors(textInputMethods(root.host, tag)));
    root.handles.set(tag, handle);
  }
  return handle;
}

/** The selection native holds now, with its ends as the handles of the elements (always `Text`, whose text it spans). */
function currentSelection(root: RootState): UISelection | undefined {
  const selection = readSelection(root.host);
  if (selection === undefined) return undefined;
  return {
    anchor: { node: handleFor(root, selection.anchor.tag, 'text'), offset: selection.anchor.offset },
    focus: { node: handleFor(root, selection.focus.tag, 'text'), offset: selection.focus.offset },
    isCollapsed: selection.isCollapsed,
    text: selection.text,
  };
}

/**
 * The text selection for `useTextSelection`: the same object until the selection changes, which a hook needs
 * (`useSyncExternalStore` compares snapshots by identity). Read from native when first asked and again after each
 * `selectionchange`.
 */
export function readTextSelection(container: Container): UISelection | undefined {
  const root = container.root;
  root.selectionCache ??= { value: currentSelection(root) };
  return root.selectionCache.value;
}

/** Call `listener` after each `selectionchange`, once the cached selection is dropped. Returns the remover. */
export function watchTextSelection(container: Container, listener: () => void): () => void {
  return container.root.listeners.add('selectionchange', listener);
}

/**
 * Call `listener` for each `type` event that reaches the root: the events no element stopped, whatever they were
 * aimed at (the root's own listeners run after the elements' bubble phase). Returns the remover.
 */
export function watchRootEvent<K extends NativeEventType>(
  container: Container, type: K, listener: (event: UIEventMap[K]) => void,
): () => void {
  return container.root.listeners.add(type, listener);
}

/**
 * Claim `chords` for the whole root `container` belongs to, until the remover is called: a chord claimed reaches the engine and the root's
 * listeners, and one nobody claims goes to the browser. Throws for a chord that does not parse.
 */
export function claimRootKeys(container: Container, chords: readonly string[]): () => void {
  // A list of its own for each claim, so claiming a chord twice and releasing one claim leaves the other.
  const claim = [...parseKeyChordsOf(chords)];
  container.root.claimedChords.add(claim);
  return () => { container.root.claimedChords.delete(claim); };
}

/** Read the current native snapshot for the root `container` belongs to. */
export function readRootSnapshot(container: Container): NativeSnapshot {
  return readSnapshot(container.root.host);
}

/** Scroll the native element with `tag` into view. */
export function scrollTagIntoView(container: Container, tag: number): void {
  checkScroll(container.root.host.scrollIntoView(tag), 'scrollIntoView');
}

/** The rectangles `start..end` covers for the Text element with `tag`, root-local, or `undefined`. */
export function readNodeRangeRects(container: Container, tag: number, start: number, end: number): LayoutRect[] | undefined {
  return readRangeRects(container.root.host, tag, start, end);
}

function finiteSize(value: number, axis: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Native root ${axis} is not a finite, non-negative size: ${value}`);
  return value;
}

/**
 * Read the size from native and adopt it. Returns whether it changed. Listeners are told only when
 * `notify` is set: a read made while rendering (`readRootSize`) must not run React callbacks.
 */
function syncRootSize(root: RootState, notify: boolean): boolean {
  const native = root.host.size;
  const width = finiteSize(native.x, 'width');
  const height = finiteSize(native.y, 'height');
  const known = root.size;
  if (known !== undefined && known.width === width && known.height === height) return false;
  root.size = { width, height };
  if (notify) for (const listener of [...root.sizeListeners]) listener();
  return true;
}

/**
 * The root's size. With nobody watching it is read from native on every call (nothing is told when it
 * changes, so a cached value could be stale); while a watcher exists `dispatchEvents` keeps it current
 * and notifies, so the cache is returned as is and the value is stable between changes.
 */
export function readRootSize(container: Container): RootSize {
  const root = container.root;
  if (root.size === undefined || root.sizeListeners.size === 0) syncRootSize(root, false);
  if (root.size === undefined) throw new Error('UI internal error: the root size was read but not set');
  return root.size;
}

/** Call `listener` after `dispatchEvents` finds that the root's size changed. Returns the remover. */
export function watchRootSize(container: Container, listener: () => void): () => void {
  const root = container.root;
  root.sizeListeners.add(listener);
  // The size may have changed between the render that read it and this subscription.
  syncRootSize(root, true);
  return () => { root.sizeListeners.delete(listener); };
}

/** The first failure fails the caller once the current operation finishes; later ones are reported. */
function recordFailure(root: RootState, error: Error): void {
  if (root.failure === undefined) root.failure = error;
  else root.report(error);
}

/**
 * Walk what changed against what native has committed, send it as one `commit` call, then adopt the
 * result. A native error leaves `committed` as it was, so the next commit diffs from the last
 * accepted state (plan 3.9).
 */
function commitLayer(container: LayerContainer, children: readonly Instance[]): void {
  const root = container.root;
  try {
    const started = root.profiler.start();
    const built = buildCommit(root.committed, container.rootTags, children);
    const walked = root.profiler.start();
    const payload = built.payload;
    const timing = payload === undefined
      ? undefined
      : commitPayload(root.host, container.layer, payload, root.profiler.enabled ? root.profiler.now : undefined);
    for (const [tag, instance] of built.updates) {
      // Nothing may mutate a committed instance: a violation throws instead of corrupting the diff.
      Object.freeze(instance.children);
      if (instance.parts !== undefined) Object.freeze(instance.parts);
      Object.freeze(instance);
      root.committed.set(tag, instance);
    }
    container.rootTags = built.rootTags;
    if (payload !== undefined) {
      // Only a payload changes the tree's structure; a handler-only change moves no element.
      root.documentOrder = undefined;
      for (const tag of readDeletions(root.host)) {
        root.committed.delete(tag);
        root.handles.delete(tag);
      }
    }
    if (started !== undefined && walked !== undefined) {
      root.profiler.record({
        kind: 'flush', startMs: started, walkMs: walked - started,
        jsonEncodeMs: timing?.jsonEncodeMs ?? 0, nativeCallMs: timing?.nativeCallMs ?? 0,
        fullFlushMs: root.profiler.now() - started, visitedNodes: built.visited,
        commandCount: payload === undefined ? 0 : payload.created.length + payload.updated.length + payload.children.length,
        jsonChars: timing?.jsonChars ?? 0,
      });
    }
  } catch (error) {
    // Throwing out of a replaceContainerChildren call makes React treat the whole tree as failed
    // and unmount it. Record the failure instead and surface it at our public API boundary once
    // React has finished its own bookkeeping; the previous native tree stays mounted.
    recordFailure(root, error instanceof Error ? error : new Error(String(error)));
  }
}

function replaceContainerChildren(container: Container, children: Instance[]): void {
  if (container.kind === 'layer') {
    commitLayer(container, children);
    return;
  }
  const { overlay } = container;
  container.children = children;
  const index = overlay.portals.indexOf(container);
  if (children.length === 0) {
    if (index !== -1) overlay.portals.splice(index, 1);
  } else if (index === -1) {
    overlay.portals.push(container);
  }
  commitLayer(overlay, overlay.portals.flatMap((portal) => portal.children));
}

let updatePriority: Reconciler.EventPriority = NoEventPriority;
const transitionContext = createContext(null);

type HostConfig = Reconciler.HostConfig<
  NativeKind, HostProps, Container, HostInstance, RichRun, never, never, never,
  UIHandle, TextContext, Instance[], ReturnType<typeof setTimeout>, -1, null
>;

const hostConfig = {
  // What the reconciler tells a DevTools hook it is (`reconciler.injectIntoDevTools`, below).
  rendererVersion: reactVersion,
  rendererPackageName: 'godot-react-ui',
  supportsMutation: false,
  supportsPersistence: true,
  supportsHydration: false,
  isPrimaryRenderer: true,
  supportsMicrotasks: true,
  scheduleMicrotask(callback: () => unknown) {
    // GodotJS drains Promise microtasks in Environment::update on native and web.
    void Promise.resolve().then(callback).catch((error: unknown) => {
      setTimeout(() => { throw error; }, 0);
    });
  },
  getRootHostContext: () => OUTSIDE_TEXT,
  // Only a `Text` makes what is below it runs of its text (React Native's `isInAParentText`).
  getChildHostContext: (_parent: TextContext, kind: NativeKind) => kind === 'text' ? INSIDE_TEXT : OUTSIDE_TEXT,
  getPublicInstance(instance: HostInstance) {
    if (instance.kind === 'span') {
      throw new Error('A ref on a nested <Text> is not supported: it is a run of its parent\'s text, not an element');
    }
    return handleFor(instance.root, instance.tag, instance.kind);
  },
  // Render makes no native call: instances are plain JS objects, so an abandoned render costs
  // nothing natively (plan 3.9).
  createInstance: (kind: NativeKind, props: HostProps, container: Container, context: TextContext) =>
    createInstance(kind, props, container, context),
  createTextInstance(text: string, _container: Container, context: TextContext): RichRun {
    if (!context.insideText) throw new Error('Text strings must be rendered within a <Text> component');
    return { kind: 'run', text };
  },
  appendInitialChild(parent: HostInstance, child: HostInstance | RichRun) {
    if (parent.kind === 'text' || parent.kind === 'span') {
      if (child.kind === 'run' || child.kind === 'span') {
        const parts = parent.kind === 'span' ? parent.content : parent.parts;
        if (parts === undefined) throw new Error('UI internal error: a Text that holds plain text was given children');
        parts.push(child);
        return;
      }
      throw new Error(`A <${COMPONENT_NAMES[child.kind]}> cannot be rendered inside a <Text>: a Text holds strings, numbers and other <Text> elements`);
    }
    if (child.kind === 'run' || child.kind === 'span') {
      throw new Error('UI internal error: a run of text was appended to an element that is not a Text');
    }
    parent.children.push(child);
  },
  finalizeInitialChildren: () => false,
  shouldSetTextContent: (kind: NativeKind, props: HostProps) => kind === 'text' && scalarText(props.children) !== undefined,
  prepareForCommit: () => null,
  resetAfterCommit: () => {},
  preparePortalMount: () => {},
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  prepareScopeUpdate: () => {},
  getInstanceFromScope: () => null,
  detachDeletedInstance: () => {},
  cloneInstance: (instance: HostInstance, _kind: NativeKind, oldProps: HostProps, newProps: HostProps, keepChildren: boolean) =>
    instance.kind === 'span'
      ? cloneSpan(instance, newProps, keepChildren, false)
      : cloneInstance(instance, oldProps, newProps, keepChildren, false),
  // A hidden subtree (Suspense showing a fallback) keeps its instance but takes no space; when it is
  // shown again React appends the unhidden instance, which the walk diffs back.
  cloneHiddenInstance: (instance: HostInstance, _kind: NativeKind, props: HostProps) =>
    instance.kind === 'span' ? cloneSpan(instance, props, true, true) : cloneInstance(instance, instance.props, props, true, true),
  cloneHiddenTextInstance: (): RichRun => ({ kind: 'run', text: '' }),
  createContainerChildSet: (): Instance[] => [],
  appendChildToContainerChildSet(childSet: Instance[], child: HostInstance) {
    if (child.kind === 'span') throw new Error('UI internal error: a nested <Text> reached the top of a layer');
    childSet.push(child);
  },
  finalizeContainerChildren: () => {},
  replaceContainerChildren,
  NotPendingTransition: null,
  // @types/react-reconciler 0.33 still describes React 18's private Provider/Consumer
  // shape. React 19.2's own test renderer passes createContext here; the reconciler
  // only needs its private current-value slots. Keep this upstream type mismatch
  // confined to this one field; remove the assertion when its declarations are fixed.
  HostTransitionContext: transitionContext as unknown as Reconciler.ReactContext<null>,
  setCurrentUpdatePriority(priority: Reconciler.EventPriority) { updatePriority = priority; },
  getCurrentUpdatePriority: () => updatePriority,
  resolveUpdatePriority: () => updatePriority === NoEventPriority ? DefaultEventPriority : updatePriority,
  resetFormInstance: () => { throw new Error('Native HTML forms are not supported'); },
  requestPostPaintCallback(callback: (time: number) => void) { setTimeout(() => callback(Date.now()), 0); },
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: () => {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => Date.now(),
  maySuspendCommit: () => false,
  preloadInstance: () => true,
  startSuspendingCommit: () => {},
  suspendInstance: () => {},
  waitForCommitToBeReady: () => null,
  // Present in reconciler 0.33's implementation but missing from @types 0.33.
  maySuspendCommitOnUpdate: () => false,
  maySuspendCommitInSyncRender: () => false,
} satisfies HostConfig & {
  maySuspendCommitOnUpdate(): boolean;
  maySuspendCommitInSyncRender(): boolean;
  // Present in reconciler 0.33's implementation (they name the renderer for a DevTools hook) but missing from @types 0.33.
  rendererVersion: string;
  rendererPackageName: string;
};

const reconciler = Reconciler(hostConfig);

/** `BundleType` 0 (production). */
const PRODUCTION_BUNDLE = 0;
let injectedIntoDevTools = false;

/**
 * Registers the renderer with `globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__` if there is one, as every React renderer does when it
 * loads. React DevTools works through that hook, and it has to exist before this runs: a page that wants it installs it first.
 * With no hook the call returns at once and nothing is kept, so an app without DevTools pays nothing. Done on the first root,
 * not at load, so the hook can be installed any time before the first `createRoot`.
 */
function injectIntoDevTools(): void {
  if (injectedIntoDevTools) return;
  injectedIntoDevTools = true;
  reconciler.injectIntoDevTools({ bundleType: PRODUCTION_BUNDLE, version: reactVersion, rendererPackageName: 'godot-react-ui' });
}

/** What `<Portal>` renders into: the overlay layer of the root that rendered it. */
export const OverlayContext = createContext<LayerContainer | null>(null);

/** A `<Portal>`'s own share of `overlay`. It has to last as long as the `<Portal>`: React remounts a portal whose container changes. */
export function createPortalContainer(overlay: LayerContainer): PortalContainer {
  return { kind: 'portal', root: overlay.root, overlay, children: [] };
}

/** Render `children` into the overlay layer, which always covers the main layer. */
export function createOverlayPortal(children: ReactNode, overlay: PortalContainer): ReactNode {
  // @types/react-reconciler 0.33 declares createPortal's result as its own `ReactPortal` shape,
  // which lacks the `type` and `props` members React 19's types give a portal element, although it
  // is the very object React's `createPortal` returns (`$$typeof: react.portal`). This assertion
  // is confined to the one call; remove it when the upstream declaration is fixed.
  return reconciler.createPortal(children, overlay, null) as unknown as ReactNode;
}

/** The committed instance of `tag`, if native still has it. */
function liveInstance(root: RootState, tag: number | null): Instance | undefined {
  return tag === null || tag === LAYER_ROOT_TAG ? undefined : root.committed.get(tag);
}

/** The path nodes of `tags` that are still live, in the order given. */
function pathNodes(root: RootState, tags: readonly number[]): PathNode[] {
  const nodes: PathNode[] = [];
  for (const tag of tags) {
    const instance = root.committed.get(tag);
    if (instance !== undefined) nodes.push({ handle: handleFor(root, tag, instance.kind), props: instance.props });
  }
  return nodes;
}

/**
 * `pointerenter`/`pointerleave` reach each element the pointer crosses, not every ancestor of the
 * target: moving between two children never runs their shared parent's handlers.
 */
function dispatchEnterLeave(root: RootState, native: NativePointerEvent): DispatchResult {
  const related = liveInstance(root, native.relatedTarget);
  const crossed = exclusiveAncestry(native.path, native.relatedPath);
  const ordered = native.type === 'pointerenter' ? crossed.reverse() : crossed;
  const relatedHandle = related === undefined ? null : handleFor(root, related.tag, related.kind);
  let result = NOT_DISPATCHED;
  for (const node of pathNodes(root, ordered)) {
    result = dispatchEvent(native, [node], relatedHandle, root);
    if (result.failure !== undefined) break;
  }
  return result;
}

/** A disabled element, or one inside a disabled one, receives none of these. */
function isClickFamily(type: NativeEventType): boolean {
  return type === 'click' || type === 'dblclick' || type === 'auxclick' || type === 'contextmenu';
}

/**
 * React's own split: moves and wheel ticks arrive in streams and their updates may be batched, and so do the
 * drag events that repeat while the pointer moves (`drag`, `dragenter`, `dragleave`, `dragover`).
 */
function isContinuous(native: NativeEvent): boolean {
  switch (native.type) {
    case 'pointermove': case 'wheel': case 'drag': case 'dragenter': case 'dragleave': case 'dragover':
      return true;
    case 'pointerdown': case 'pointerup': case 'pointerenter': case 'pointerleave': case 'pointercancel':
    case 'click': case 'dblclick': case 'auxclick': case 'contextmenu': case 'scroll': case 'keydown': case 'keyup':
    case 'focus': case 'blur': case 'accessibilityaction': case 'selectionchange': case 'dragstart': case 'drop':
    case 'dragend': case 'beforeinput': case 'input': case 'compositionstart': case 'compositionupdate':
    case 'compositionend':
      return false;
  }
}

/**
 * A drag event goes to the elements on its path with a `DataTransfer` from its drag's store. An event whose
 * element is gone is dropped, except `dragend`, which must reach the store even then (native addresses it to the
 * root when the dragged element was removed).
 */
function dispatchDrag(root: RootState, native: NativeDragEvent | NativeDragEndEvent): DragDispatch {
  const addressesRoot = native.target === LAYER_ROOT_TAG;
  if (!addressesRoot && !root.committed.has(native.target) && native.type !== 'dragend') {
    return { ...NOT_DISPATCHED, dropEffect: '' };
  }
  const related = liveInstance(root, native.relatedTarget);
  return root.drags.dispatch(native, pathNodes(root, native.path), related === undefined ? null : handleFor(root, related.tag, related.kind), root);
}

function dispatch(root: RootState, native: NativeEvent): DispatchResult {
  const addressesRoot = native.target === LAYER_ROOT_TAG;
  // Native queues events ahead of JS: an earlier event in this batch, or a handler that just
  // committed, may have removed this event's target.
  if (!addressesRoot && !root.committed.has(native.target)) return NOT_DISPATCHED;
  if (native.type === 'pointerenter' || native.type === 'pointerleave') return dispatchEnterLeave(root, native);
  const path = pathNodes(root, native.path);
  if (native.type === 'focus' || native.type === 'blur') {
    // The other side of a focus change, if it still exists.
    const related = liveInstance(root, native.relatedTarget);
    return dispatchEvent(native, path, related === undefined ? null : handleFor(root, related.tag, related.kind), root);
  }
  if (isClickFamily(native.type) && path.some((node) => node.props.disabled)) return NOT_DISPATCHED;
  return dispatchEvent(native, path, null, root);
}

/**
 * Whether this root uses the key chord, so it must reach the engine: native's own answer (a focused text input's editing chords, copy and
 * select all for a selection, a focused button's Enter and Space), what the app claimed for the root, and what the focused element and its
 * ancestors declare with `keyClaims`. Asked on `keydown`, before the engine's frame, so it reads the state as it is then.
 */
function claimsKey(state: RootState, press: KeyPress, platform: KeyPlatform): boolean {
  if (state.unmounted) return false;
  if (state.host.claimsKeyChord(press.code, press.key, press.shiftKey, press.ctrlKey, press.altKey, press.metaKey)) return true;
  for (const chords of state.claimedChords) if (anyChordMatches(chords, press, platform)) return true;
  const path = state.host.focusedPath();
  for (let index = 0; index < path.size(); index += 1) {
    const declared = state.committed.get(path.get(index))?.props.keyClaims;
    if (declared !== undefined && anyChordMatches(parseKeyChordsOf(declared), press, platform)) return true;
  }
  return false;
}

export function createRoot(host: NativeHost, options: RootOptions): UIRoot {
  // Fail on a host that does not answer a snapshot before any React work.
  readSnapshot(host);
  injectIntoDevTools();
  const report = (error: Error) => {
    if (options.onError) options.onError(error);
    else console.error(error);
  };
  const state: RootState = {
    host, report, profiler: new RendererProfiler(options.profile ?? false, options.now),
    nextTag: 1, committed: new Map(), handles: new Map(),
    main: { kind: 'layer', get root() { return state; }, layer: MAIN_LAYER, rootTags: [], portals: [] },
    overlay: undefined, unmounted: false, failure: undefined,
    dispatching: false, listeners: new RootListeners(), claimedChords: new Set(), drags: new DragSessions(), unsubscribe: undefined,
    documentOrder: undefined, size: undefined, sizeListeners: new Set(), selectionCache: undefined,
    handle: {
      id: LAYER_ROOT_TAG,
      testID: undefined,
      getRect() { return readNodeRect(host, LAYER_ROOT_TAG); },
      compareDocumentOrder() { throw new Error('compareDocumentOrder: the root is not an element and has no place in document order'); },
      ...captureMethods(host, LAYER_ROOT_TAG),
      ...focusMethods(host, LAYER_ROOT_TAG),
      ...scrollMethods(host, LAYER_ROOT_TAG),
      ...notText('view'),
    },
  };
  const keyPassthrough: KeyPassthroughRegistration = (options.keyPassthroughPage ?? pagePassthrough()).add(
    { claims: (press, platform) => claimsKey(state, press, platform) }, options.keyPassthrough ?? true,
  );
  const onUncaughtError = (error: Error) => {
    state.failure = error;
    options.onError?.(error);
  };
  const fiberRoot = reconciler.createContainer(
    state.main, ConcurrentRoot, null, false, null, '', onUncaughtError, report, report, () => {},
  );
  const overlay = (): LayerContainer => {
    state.overlay ??= { kind: 'layer', get root() { return state; }, layer: OVERLAY_LAYER, rootTags: [], portals: [] };
    return state.overlay;
  };

  function checkFailure(): void {
    if (state.failure !== undefined) {
      const error = state.failure;
      state.failure = undefined;
      throw error;
    }
  }

  function processEvent(native: NativeEvent): void {
    // Whoever listens for the change reads the selection again.
    if (native.type === 'selectionchange') state.selectionCache = undefined;
    const previousPriority = updatePriority;
    updatePriority = isContinuous(native) ? ContinuousEventPriority : DiscreteEventPriority;
    let result: DispatchResult;
    // What a drag's `dragover` or `drop` settled on, for native to act on; every other answer is just prevented or not.
    let dropEffect = '';
    try {
      if (isNativeDragEvent(native)) {
        const dragged = dispatchDrag(state, native);
        result = dragged;
        dropEffect = dragged.dropEffect;
      } else {
        result = dispatch(state, native);
      }
    } finally {
      updatePriority = previousPriority;
    }
    if (result.failure !== undefined) recordFailure(state, result.failure);
    if (native.cancelable) {
      // Native is blocked until this answer arrives, so it is sent even if a handler threw.
      try {
        resolveEvent(host, native.seq, result.defaultPrevented, dropEffect);
      } catch (error) {
        recordFailure(state, error instanceof Error ? error : new Error(String(error)));
      }
    }
    if (!isContinuous(native)) {
      try {
        reconciler.flushSyncWork();
      } catch (error) {
        recordFailure(state, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  const root: UIRoot = {
    render(children) {
      if (state.unmounted) throw new Error('Cannot render into an unmounted UI root');
      const started = state.profiler.start();
      const tree = createElement(OverlayContext.Provider, { value: overlay() }, children);
      reconciler.updateContainerSync(tree, fiberRoot, null, null);
      reconciler.flushSyncWork();
      state.profiler.finishWork('reconcile', started);
      checkFailure();
    },
    flushSync(work) {
      if (state.unmounted) throw new Error('Cannot flush an unmounted UI root');
      const result = reconciler.flushSyncFromReconciler(work);
      checkFailure();
      return result;
    },
    unmount() {
      if (state.unmounted) return;
      // Native must not call back into a root that is going away.
      state.unsubscribe?.();
      state.unsubscribe = undefined;
      keyPassthrough.remove();
      reconciler.updateContainerSync(null, fiberRoot, null, null);
      reconciler.flushSyncWork();
      reconciler.flushPassiveEffects();
      state.unmounted = true;
      state.drags.clear();
      checkFailure();
    },
    dispatchEvents() {
      if (state.unmounted || state.dispatching) return;
      state.dispatching = true;
      const started = state.profiler.start();
      let processed = 0;
      try {
        // Owners call this once per frame, so this is where a change of the root's size is found. Only
        // a watcher (`useRootSize`) makes it cost a native call.
        const resized = state.sizeListeners.size > 0 && syncRootSize(state, true);
        let drained = false;
        for (let round = 0; round < MAX_EVENT_DRAIN_ROUNDS && !drained; round += 1) {
          const events = readEvents(host);
          drained = events.length === 0;
          for (const event of events) {
            processed += 1;
            processEvent(event);
          }
        }
        if (!drained) {
          throw new Error(`UI event drain still produced events after ${MAX_EVENT_DRAIN_ROUNDS} rounds`);
        }
        if (processed !== 0 || resized) reconciler.flushSyncWork();
      } finally {
        state.dispatching = false;
      }
      if (processed !== 0) state.profiler.finishWork('events', started);
      checkFailure();
    },
    addEventListener(type, listener) {
      return state.listeners.add(type, listener);
    },
    claimKeys(chords) {
      return claimRootKeys(state.main, chords);
    },
    setKeyPassthrough(enabled) {
      keyPassthrough.enabled = enabled;
    },
    getSelection() {
      return currentSelection(state);
    },
    getTouchSelection() {
      return readTouchSelection(host);
    },
    clearSelection() {
      host.clearSelection();
      // The `selectionchange` this causes is on its way, but a reader that comes first must not see the old one.
      state.selectionCache = undefined;
    },
    getSnapshot: () => readSnapshot(host),
    setProfiling(enabled) { state.profiler.enabled = enabled; },
    takeProfile: () => state.profiler.take(),
    findByTestID(testID) {
      const tag = findTag(host, testID);
      if (tag === undefined) return undefined;
      return readSnapshot(host).nodes.find((entry) => entry.id === tag);
    },
  };
  state.unsubscribe = options.subscribeToEvents(() => root.dispatchEvents());
  return root;
}
