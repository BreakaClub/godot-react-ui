import assert from 'node:assert/strict';
import { createRoot, type RootOptions, type UIRoot } from '../src';
import type { CommitPayload } from '../src/commit';
import type {
  NativeAccessibilityAction, NativeAccessibilityActionEvent, NativeEvent, NativeEventType, NativeFocusEventType,
  NativeHost, NativeKeyEvent, NativePointerEvent, NativePointerEventType, NativeScrollEvent, NativeScrollState,
  NativeSnapshot, NativeSnapshotNode, NativeWheelEvent, PackedTags,
} from '../src/native';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numbers(value: unknown): number[] {
  assert.ok(Array.isArray(value));
  return value.map((entry: unknown) => {
    assert.equal(typeof entry, 'number');
    return Number(entry);
  });
}

function entries(value: unknown): Record<string, unknown>[] {
  assert.ok(Array.isArray(value));
  return value.map((entry: unknown) => {
    assert.ok(isRecord(entry));
    return entry;
  });
}

function tagOf(entry: Record<string, unknown>): number {
  assert.equal(typeof entry.tag, 'number');
  return Number(entry.tag);
}

/** Parse a commit payload with the same strictness as native: exactly these keys, typed entries. */
function parsePayload(value: unknown): CommitPayload {
  assert.ok(isRecord(value));
  assert.deepEqual(Object.keys(value).sort(), ['children', 'created', 'updated'], 'a payload has exactly these keys');
  return {
    created: entries(value.created).map((entry) => {
      assert.ok(entry.kind === 'view' || entry.kind === 'text' || entry.kind === 'button');
      assert.ok(isRecord(entry.props));
      return { tag: tagOf(entry), kind: entry.kind, props: entry.props };
    }),
    updated: entries(value.updated).map((entry) => {
      assert.ok(isRecord(entry.props));
      return { tag: tagOf(entry), props: entry.props };
    }),
    children: entries(value.children).map((entry) => ({ tag: tagOf(entry), children: numbers(entry.children) })),
  };
}

export function node(id: number, kind: 'view' | 'text' | 'button'): NativeSnapshotNode {
  return {
    id, kind, layer: 0, text: '', parent: null, children: [], paintParent: null, paintIndex: 0, documentIndex: 0, style: {}, props: {},
    scroll: null,
    rect: { x: 0, y: 0, width: 100, height: 40 },
    clipRect: null,
    presentation: {width: 100, height: 40, widthIsAuto: false, heightIsAuto: false, opacity: 1, backgroundColor: '#00000000'},
  };
}

/** One call across the native boundary, for tests that assert what did and did not cross. */
export type NativeCall =
  | 'commit' | 'takeCommitDeletions' | 'drainEvents' | 'getSnapshot' | 'getNodeRect' | 'getSize' | 'findByTestId' | 'resolveEvent'
  | 'setPointerCapture' | 'releasePointerCapture' | 'hasPointerCapture' | 'focusNode' | 'blurNode'
  | 'scrollTo' | 'scrollBy' | 'scrollIntoView' | 'getScrollState';

/**
 * A fake native host that implements the commit API in JavaScript: it applies each payload to a
 * plain tree, answers deletions, snapshots and node queries, and records every call. It does no
 * layout, style resolution or event synthesis (pseudo-states are native, so a test can only assert
 * that hover causes no native call, never what it paints).
 */
export class RecordingHost implements NativeHost {
  /** Node 0 stands for the main layer's root, as in native snapshots. */
  readonly mainRoot = node(0, 'view');
  readonly nodes = new Map<number, NativeSnapshotNode>([[0, this.mainRoot]]);
  /** Every accepted commit, in order. */
  readonly commits: Array<{ layer: number; payload: CommitPayload }> = [];
  /** Every call that crossed the boundary, in order. */
  readonly calls: NativeCall[] = [];
  /** The top-level tags of each layer. */
  readonly layerRoots: number[][] = [[], []];
  events: NativeEvent[] = [];
  rejectNextCommit = false;
  /** Every `resolveEvent` call, in order. */
  readonly resolutions: Array<{ seq: number; defaultPrevented: boolean; dropEffect: string }> = [];
  /** What `resolveEvent` returns; a nonempty string simulates native rejecting the answer. */
  resolveError = '';
  /** The pointers that are down, which native lets elements capture (pointer id to nothing else). */
  readonly pointersDown = new Set<number>();
  /** Capture by pointer id: the element receiving that pointer's events. */
  readonly captures = new Map<number, number>();
  /** The tags `focus()` may focus (native decides focusability; the fake is told). */
  readonly focusable = new Set<number>();
  /** Every `focusNode` and `blurNode` request: tag and the focusVisible argument (undefined for blur). */
  readonly focusRequests: Array<{ tag: number; focusVisible: number | undefined }> = [];
  focused: number | null = null;
  /** What the root's `Control` reports as its size; a test changes it with `resize` to resize the root. */
  private currentSize = { x: 1024, y: 768 };
  /** The scroll containers the fake knows (native decides which elements are one; the test is told). */
  readonly scrollStates = new Map<number, NativeScrollState>();
  /** Every `scrollTo`, `scrollBy` and `scrollIntoView` request, in order. */
  readonly scrollRequests: Array<{ method: 'scrollTo' | 'scrollBy' | 'scrollIntoView'; tag: number; x?: number; y?: number }> = [];
  /** Extra events appended to every drain, for storm tests. */
  produceEvents: (() => NativeEvent[]) | undefined;
  private nextSeq = 1;
  private readonly used = new Set<number>();
  private deleted: number[] = [];

  commit(layer: number, json: string): string {
    this.calls.push('commit');
    if (this.rejectNextCommit) {
      this.rejectNextCommit = false;
      return 'deliberate transport failure';
    }
    const payload = parsePayload(JSON.parse(json));
    // Mirror the native contract the tests rely on; native/commit.rs holds the full rules.
    for (const created of payload.created) {
      if (this.used.has(created.tag)) return `tag ${created.tag} has already been used`;
    }
    for (const created of payload.created) {
      this.used.add(created.tag);
      const next = node(created.tag, created.kind);
      next.layer = layer;
      this.setProps(next, Object.fromEntries(Object.entries(created.props)));
      this.nodes.set(created.tag, next);
    }
    for (const updated of payload.updated) {
      const target = this.nodes.get(updated.tag);
      if (target === undefined) return `node ${updated.tag} is not mounted`;
      const props = { ...target.props };
      for (const [key, value] of Object.entries(updated.props)) {
        if (value === null) Reflect.deleteProperty(props, key);
        else props[key] = value;
      }
      this.setProps(target, props);
    }
    for (const list of payload.children) {
      for (const child of list.children) {
        if (!this.nodes.has(child)) return `child ${child} does not exist`;
      }
      const parent = list.tag === 0 ? undefined : this.nodes.get(list.tag);
      if (list.tag !== 0 && parent === undefined) return `child list for unknown node ${list.tag}`;
      const previous = list.tag === 0 ? this.layerRoots[layer] ?? [] : parent?.children ?? [];
      for (const gone of previous) {
        const old = this.nodes.get(gone);
        if (old !== undefined && old.parent === (list.tag === 0 ? 0 : list.tag)) old.parent = null;
      }
      for (const child of list.children) {
        const target = this.nodes.get(child);
        assert.ok(target);
        target.parent = list.tag === 0 && layer !== 0 ? null : list.tag;
        target.layer = layer;
      }
      if (list.tag === 0) this.layerRoots[layer] = [...list.children];
      else if (parent !== undefined) parent.children = [...list.children];
    }
    this.mainRoot.children = this.layerRoots[0] ?? [];
    this.commits.push({ layer, payload });
    this.deleted = this.collectUnreachable();
    for (const tag of this.deleted) this.nodes.delete(tag);
    return '';
  }

  private setProps(target: NativeSnapshotNode, props: Record<string, unknown>): void {
    target.props = props;
    target.text = typeof props.text === 'string' ? props.text : '';
  }

  /** Nodes no layer root reaches any more: native deletes them with their subtrees. */
  private collectUnreachable(): number[] {
    const reachable = new Set<number>();
    const visit = (tag: number) => {
      reachable.add(tag);
      for (const child of this.nodes.get(tag)?.children ?? []) visit(child);
    };
    for (const roots of this.layerRoots) roots.forEach(visit);
    return [...this.nodes.keys()].filter((tag) => tag !== 0 && !reachable.has(tag));
  }

  takeCommitDeletions(): PackedTags {
    this.calls.push('takeCommitDeletions');
    const tags = this.deleted;
    this.deleted = [];
    return { size: () => tags.length, get: (index: number) => tags[index] ?? -1 };
  }

  drainEvents(): string {
    this.calls.push('drainEvents');
    const events = [...this.events, ...(this.produceEvents?.() ?? [])];
    this.events = [];
    return JSON.stringify(events);
  }

  resolveEvent(seq: number, defaultPrevented: boolean, dropEffect: string): string {
    this.calls.push('resolveEvent');
    this.resolutions.push({ seq, defaultPrevented, dropEffect });
    return this.resolveError;
  }

  setPointerCapture(tag: number, pointerId: number): string {
    this.calls.push('setPointerCapture');
    if (!this.nodes.has(tag) || tag === 0) return `node ${tag} is not mounted`;
    if (!this.pointersDown.has(pointerId)) return `pointer ${pointerId} is not active`;
    this.captures.set(pointerId, tag);
    return '';
  }

  releasePointerCapture(tag: number, pointerId: number): string {
    this.calls.push('releasePointerCapture');
    if (this.captures.get(pointerId) === tag) this.captures.delete(pointerId);
    return '';
  }

  hasPointerCapture(tag: number, pointerId: number): boolean {
    this.calls.push('hasPointerCapture');
    return this.captures.get(pointerId) === tag;
  }

  focusNode(tag: number, focusVisible: number): string {
    this.calls.push('focusNode');
    this.focusRequests.push({ tag, focusVisible });
    if (!this.nodes.has(tag) || tag === 0) return `node ${tag} is not mounted`;
    if (!this.focusable.has(tag)) return `node ${tag} cannot take focus: it is not a button and has no tabIndex`;
    this.focused = tag;
    return '';
  }

  blurNode(tag: number): string {
    this.calls.push('blurNode');
    this.focusRequests.push({ tag, focusVisible: undefined });
    if (this.focused === tag) this.focused = null;
    return '';
  }

  scrollTo(tag: number, left: number, top: number): string {
    this.calls.push('scrollTo');
    this.scrollRequests.push({ method: 'scrollTo', tag, x: left, y: top });
    return this.scrollStates.has(tag) ? '' : `node ${tag} is not a scroll container`;
  }

  scrollBy(tag: number, dx: number, dy: number): string {
    this.calls.push('scrollBy');
    this.scrollRequests.push({ method: 'scrollBy', tag, x: dx, y: dy });
    return this.scrollStates.has(tag) ? '' : `node ${tag} is not a scroll container`;
  }

  scrollIntoView(tag: number): string {
    this.calls.push('scrollIntoView');
    this.scrollRequests.push({ method: 'scrollIntoView', tag });
    return this.nodes.has(tag) ? '' : `node ${tag} is not mounted`;
  }

  getScrollState(tag: number): string {
    this.calls.push('getScrollState');
    return JSON.stringify(this.scrollStates.get(tag) ?? null);
  }

  getNodeRect(tag: number): string {
    this.calls.push('getNodeRect');
    return JSON.stringify(this.nodes.get(tag)?.rect ?? null);
  }

  /** A read of the root's size crosses the boundary like any other property of the Godot object. */
  get size(): { readonly x: number; readonly y: number } {
    this.calls.push('getSize');
    return { x: this.currentSize.x, y: this.currentSize.y };
  }

  /** The owner resizing the root's `Control`. */
  resize(width: number, height: number): void {
    this.currentSize = { x: width, y: height };
  }

  findByTestId(testId: string): number {
    this.calls.push('findByTestId');
    const tags = [...this.nodes.values()].filter((entry) => entry.props.testID === testId).map((entry) => entry.id);
    return tags.length === 0 ? -1 : Math.min(...tags);
  }

  getSnapshot(): string {
    this.calls.push('getSnapshot');
    const snapshot: NativeSnapshot = {
      clockMs: 0, transitions: [],
      nodes: [...this.nodes.values()],
      width: this.currentSize.x, height: this.currentSize.y, hovered: null, focused: this.focused, pressed: null, focusVisible: false, modality: 'keyboard', pointers: [],
      stats: {
        batches: this.commits.length, nodeCount: this.nodes.size - 1, layoutPasses: 0, paintPasses: 0, layoutMicros: 0,
        nodesCreated: 0, nodesUpdated: 0, nodesDeleted: 0, nodesRestyled: 0, mutations: 0, boxRecords: 0, contentRecords: 0,
        scrollUpdates: 0, overlayRecords: 0,
      },
    };
    return JSON.stringify(snapshot);
  }

  /** The target and its ancestors up to its layer's top-level node, like native's `path_of`. */
  pathOf(tag: number): number[] {
    const path: number[] = [];
    let current = this.nodes.get(tag);
    while (current !== undefined && current.id !== 0) {
      path.push(current.id);
      current = current.parent === null ? undefined : this.nodes.get(current.parent);
    }
    return path;
  }

  /** Native calls since `mark`, for "this crossed the boundary" assertions. */
  callsSince(mark: number): NativeCall[] {
    return this.calls.slice(mark);
  }

  /** Queue a pointer or focus event with the next sequence number. */
  event(target: number, type: NativeEventType, overrides: Partial<NativePointerEvent> = {}): NativeEvent {
    const event = isFocusType(type)
      ? this.focusEvent(target, type)
      : type === 'wheel' ? this.wheelEvent(target)
        : type === 'scroll' ? this.scrollEvent(target)
          : type === 'keydown' || type === 'keyup' ? this.keyEvent(target, type)
            : type === 'accessibilityaction' ? this.accessibilityActionEvent(target, 'increment')
              : this.pointerEvent(target, type, overrides);
    this.events.push(event);
    return event;
  }

  /** A `scroll` event: never cancelable, as native does not wait for JS's answer. */
  scrollEvent(target: number, overrides: Partial<NativeScrollEvent> = {}): NativeScrollEvent {
    return {
      seq: this.nextSeq++, target, path: this.pathOf(target), cancelable: false, timeStamp: 1.5, type: 'scroll',
      scrollLeft: 0, scrollTop: 120, scrollWidth: 300, scrollHeight: 900, clientWidth: 300, clientHeight: 400,
      ...overrides,
    };
  }

  /** A wheel tick or pan; cancelable like the native one (native awaits JS's answer). */
  wheelEvent(target: number, overrides: Partial<NativeWheelEvent> = {}): NativeWheelEvent {
    return {
      seq: this.nextSeq++, target, path: this.pathOf(target), cancelable: true, timeStamp: 1.5, type: 'wheel',
      x: 10, y: 20, viewportX: 10, viewportY: 20, pointerId: 1, pointerType: 'mouse',
      button: -1, buttons: 0, detail: 0, deltaX: 0, deltaY: 1,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      ...overrides,
    };
  }

  pointerEvent(target: number, type: NativePointerEventType, overrides: Partial<NativePointerEvent> = {}): NativePointerEvent {
    const relatedTarget = overrides.relatedTarget ?? null;
    return {
      seq: this.nextSeq++, target, path: this.pathOf(target), cancelable: false, timeStamp: 1.5, type,
      x: 10, y: 20, viewportX: 10, viewportY: 20, pointerId: 1, pointerType: 'mouse',
      button: type === 'pointerdown' || type === 'pointerup' || type === 'click' ? 0 : -1,
      buttons: 0, detail: 0, relatedTarget,
      relatedPath: relatedTarget === null ? [] : this.pathOf(relatedTarget),
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      ...overrides,
    };
  }

  focusEvent(target: number, type: NativeFocusEventType, related: number | null = null, focusVisible = false): NativeEvent {
    return {
      seq: this.nextSeq++, target, path: this.pathOf(target), cancelable: false, timeStamp: 1.5, type,
      relatedTarget: related, focusVisible,
    };
  }

  /** An assistive technology's action on `target`'s accessibility node; never cancelable. */
  accessibilityActionEvent(
    target: number, action: NativeAccessibilityAction, value: number | null = null,
  ): NativeAccessibilityActionEvent {
    return {
      seq: this.nextSeq++, target, path: this.pathOf(target), cancelable: false, timeStamp: 1.5,
      type: 'accessibilityaction', action, value,
    };
  }

  /** A key press or release; a `keydown` is cancelable, as native awaits JS's answer. */
  keyEvent(target: number, type: 'keydown' | 'keyup', overrides: Partial<NativeKeyEvent> = {}): NativeKeyEvent {
    return {
      seq: this.nextSeq++, target, path: this.pathOf(target), cancelable: type === 'keydown', timeStamp: 1.5, type,
      key: 'a', code: 'KeyA', repeat: false, isComposing: false,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      ...overrides,
    };
  }
}

function isFocusType(type: NativeEventType): type is NativeFocusEventType {
  return type === 'focus' || type === 'blur';
}

/** Stands in for the Godot owner's `eventsReady` connection. */
export class FakeSubscription {
  listener: (() => void) | undefined;
  unsubscribed = 0;
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listener = listener;
    return () => {
      this.unsubscribed += 1;
      this.listener = undefined;
    };
  };

  /** Native emitting `eventsReady` from inside an input callback. */
  fire(): void {
    this.listener?.();
  }
}

export const NO_SUBSCRIPTION: RootOptions['subscribeToEvents'] = () => () => {};

export function createTestRoot(host: NativeHost, options: Partial<RootOptions> = {}): { root: UIRoot; subscription: FakeSubscription } {
  const subscription = new FakeSubscription();
  const root = createRoot(host, { subscribeToEvents: subscription.subscribe, ...options });
  return { root, subscription };
}
