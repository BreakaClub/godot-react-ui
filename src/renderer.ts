import { createContext, type ReactNode } from 'react';
import Reconciler from 'react-reconciler';
import {
  ConcurrentRoot, ContinuousEventPriority, DefaultEventPriority,
  DiscreteEventPriority, NoEventPriority,
} from 'react-reconciler/constants';
import type { UIHandle, UIProps } from './components';
import {
  dispatchEvent, exclusiveAncestry, NOT_DISPATCHED, RootListeners,
  type DispatchResult, type UIEventMap,
} from './events';
import {
  applyCommands, readEvents, readSnapshot, resolveEvent,
  type NativeCommand, type NativeEvent, type NativeEventType, type NativeHost, type NativeKind,
  type NativePointerEvent, type NativeSnapshot, type NativeSnapshotNode,
} from './native';
import { scalarText } from './props';
import { resolveStyles } from './styles';
import type { Style } from './types';
import { RendererProfiler, type RendererProfile } from './profile';

const VIEWPORT_ID = 0;
const MAX_NODE_ID = 0xffff_ffff;
const EMPTY_CONTEXT = Object.freeze({});
/**
 * Guard against an event storm. Each round drains everything native has queued; handlers that keep
 * producing input-driven events for this many rounds are a bug, not a condition to tolerate.
 */
const MAX_EVENT_DRAIN_ROUNDS = 64;

interface Instance {
  readonly id: number;
  readonly kind: NativeKind;
  readonly root: Container;
  readonly handle: UIHandle;
  props: UIProps;
  text: string;
  children: Instance[];
  parent: Instance | Container | null;
  hidden: boolean;
  hover: boolean;
  active: boolean;
  focus: boolean;
}

interface CommittedNode {
  readonly instance: Instance;
  readonly styleKey: string;
  readonly text: string;
  readonly children: number[];
}

interface Container {
  readonly host: NativeHost;
  readonly profiler: RendererProfiler;
  readonly id: typeof VIEWPORT_ID;
  children: Instance[];
  committed: Map<number, CommittedNode>;
  rootChildren: number[];
  nextId: number;
  width: number;
  unmounted: boolean;
  failure: Error | undefined;
  /** True while `dispatchEvents` drains native events; a nested call returns at once. */
  dispatching: boolean;
  readonly listeners: RootListeners;
  /** Handle for the viewport root, the target of events addressed to root listeners only. */
  readonly handle: UIHandle;
  unsubscribe: (() => void) | undefined;
  flush(): void;
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
}

export interface UIRoot {
  /** Commits immediately; subsequent hook updates use React's normal scheduler. */
  render(children: ReactNode): void;
  /** Runs React cleanup and releases the entire native subtree. Idempotent. */
  unmount(): void;
  /**
   * Drain and dispatch native events. Input callbacks reach this through `subscribeToEvents`; call it
   * once per Godot frame as well, for events native queued outside an input callback.
   */
  dispatchEvents(): void;
  /** Listen on the root itself, after elements' bubble phase. Returns the remover. */
  addEventListener<K extends NativeEventType>(type: K, listener: (event: UIEventMap[K]) => void): () => void;
  /** Call after the logical viewport resizes. Width drives responsive utility classes. */
  refreshStyles(width?: number): void;
  getSnapshot(): NativeSnapshot;
  findByTestID(testID: string): NativeSnapshotNode | undefined;
  setProfiling(enabled: boolean): void;
  takeProfile(): RendererProfile;
}

function createInstance(kind: NativeKind, props: UIProps, root: Container, text?: string): Instance {
  if (root.nextId > MAX_NODE_ID) throw new Error('UI root exhausted its u32 node IDs');
  const id = root.nextId++;
  const instance: Instance = {
    id, kind, root, props,
    text: text ?? (kind === 'text' ? scalarText(props.children) ?? '' : ''),
    children: [], parent: null, hidden: false, hover: false, active: false, focus: false,
    handle: {
      id,
      get testID() { return instance.props.testID; },
      getRect() { return readSnapshot(root.host).nodes.find((node) => node.id === id)?.rect; },
    },
  };
  return instance;
}

function detach(child: Instance): void {
  if (child.parent === null) return;
  const siblings = child.parent.children;
  const index = siblings.indexOf(child);
  if (index === -1) throw new Error('UI parent/child relationship is inconsistent');
  siblings.splice(index, 1);
  child.parent = null;
}

function append(parent: Container | Instance, child: Instance): void {
  detach(child);
  parent.children.push(child);
  child.parent = parent;
}

function insert(parent: Container | Instance, child: Instance, before: Instance): void {
  if (child === before) return;
  detach(child);
  const index = parent.children.indexOf(before);
  if (index === -1) throw new Error('UI insertBefore target is not a child of its parent');
  parent.children.splice(index, 0, child);
  child.parent = parent;
}

function remove(parent: Container | Instance, child: Instance): void {
  if (child.parent !== parent) throw new Error('UI removeChild target has a different parent');
  detach(child);
}

function sameChildren(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function inheritedTextStyle(style: Style): Style {
  const inherited: Style = {};
  if (style.color !== undefined) inherited.color = style.color;
  if (style.fontSize !== undefined) inherited.fontSize = style.fontSize;
  if (style.textAlign !== undefined) inherited.textAlign = style.textAlign;
  return inherited;
}

/** Only this commit path allocates native nodes; abandoned React renders remain ordinary JS data. */
function flush(container: Container): void {
  const started = container.profiler.start();
  const creates: NativeCommand[] = [];
  const updates: NativeCommand[] = [];
  const hierarchy: NativeCommand[] = [];
  const next = new Map<number, CommittedNode>();

  function visit(instance: Instance, inherited: Style): void {
    if (next.has(instance.id)) throw new Error('UI tree contains a cycle or a duplicate child');
    const resolved = resolveStyles(instance.props.className, instance.props.style, {
      width: container.width,
      hover: instance.hover,
      active: instance.active,
      focus: instance.focus,
      disabled: instance.props.disabled ?? false,
    });
    const style: Style = { ...inherited, ...resolved };
    if (instance.props.disabled !== undefined) style.disabled = instance.props.disabled;
    if (instance.hidden) style.display = 'none';
    const styleKey = JSON.stringify(style);
    const children = instance.children.map((child) => child.id);
    const previous = container.committed.get(instance.id);
    if (previous === undefined) creates.push({ op: 'create', id: instance.id, kind: instance.kind });
    if (previous?.styleKey !== styleKey) updates.push({ op: 'style', id: instance.id, style });
    if (previous?.text !== instance.text) updates.push({ op: 'text', id: instance.id, text: instance.text });
    if (previous === undefined || !sameChildren(previous.children, children)) {
      hierarchy.push({ op: 'children', id: instance.id, children });
    }
    next.set(instance.id, { instance, styleKey, text: instance.text, children });
    const childStyle = inheritedTextStyle(style);
    for (const child of instance.children) visit(child, childStyle);
  }

  for (const child of container.children) visit(child, {});
  const rootChildren = container.children.map((child) => child.id);
  if (!sameChildren(container.rootChildren, rootChildren)) {
    hierarchy.push({ op: 'children', id: VIEWPORT_ID, children: rootChildren });
  }

  // Detach surviving/reparented nodes before deleting old subtrees. Removing old descendants
  // first also works with the native recursive-remove contract and keeps every ID explicit.
  const removals: NativeCommand[] = [];
  for (const [id] of [...container.committed].reverse()) {
    if (!next.has(id)) removals.push({ op: 'remove', id });
  }
  const commands = [...creates, ...updates, ...hierarchy, ...removals];
  const diffEnd = container.profiler.start();
  const timing = applyCommands(container.host, commands, container.profiler.enabled ? container.profiler.now : undefined);
  container.committed = next;
  container.rootChildren = rootChildren;
  if (started !== undefined && diffEnd !== undefined) {
    container.profiler.record({
      kind: 'flush', startMs: started, styleDiffMs: diffEnd - started,
      jsonEncodeMs: timing?.jsonEncodeMs ?? 0, nativeCallMs: timing?.nativeCallMs ?? 0,
      fullFlushMs: container.profiler.now() - started,
      visitedNodes: next.size, commandCount: commands.length, jsonChars: timing?.jsonChars ?? 0,
    });
  }
}

let updatePriority: Reconciler.EventPriority = NoEventPriority;
const transitionContext = createContext(null);

type HostConfig = Reconciler.HostConfig<
  NativeKind, UIProps, Container, Instance, Instance, never, never, never,
  UIHandle, typeof EMPTY_CONTEXT, never, ReturnType<typeof setTimeout>, -1, null
>;

const hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,
  supportsMicrotasks: true,
  scheduleMicrotask(callback: () => unknown) {
    // GodotJS drains Promise microtasks in Environment::update on native and web.
    void Promise.resolve().then(callback).catch((error: unknown) => {
      setTimeout(() => { throw error; }, 0);
    });
  },
  getRootHostContext: () => EMPTY_CONTEXT,
  getChildHostContext: () => EMPTY_CONTEXT,
  getPublicInstance: (instance: Instance) => instance.handle,
  createInstance: (kind: NativeKind, props: UIProps, root: Container) => createInstance(kind, props, root),
  createTextInstance: (text: string, root: Container) => createInstance('text', {}, root, text),
  appendInitialChild: append,
  finalizeInitialChildren: () => false,
  shouldSetTextContent: (kind: NativeKind, props: UIProps) => kind === 'text' && scalarText(props.children) !== undefined,
  prepareForCommit: () => null,
  resetAfterCommit(container: Container) {
    try {
      container.flush();
    } catch (error) {
      // React 19.2 assigns root.current and advances its pending commit phase
      // after this callback returns. Throwing here strands that global phase
      // and prevents later roots from committing. Surface the same failure at
      // our public API boundary after React completes its bookkeeping instead.
      container.failure = error instanceof Error ? error : new Error(String(error));
    }
  },
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
  appendChild: append,
  appendChildToContainer: append,
  insertBefore: insert,
  insertInContainerBefore: insert,
  removeChild: remove,
  removeChildFromContainer: remove,
  clearContainer(container: Container) {
    for (const child of container.children) child.parent = null;
    container.children = [];
  },
  resetTextContent(instance: Instance) { instance.text = ''; },
  commitTextUpdate(instance: Instance, _oldText: string, text: string) { instance.text = text; },
  commitUpdate(instance: Instance, kind: NativeKind, _previous: UIProps, props: UIProps) {
    instance.props = props;
    if (kind === 'text') instance.text = scalarText(props.children) ?? '';
  },
  hideInstance(instance: Instance) { instance.hidden = true; },
  hideTextInstance(instance: Instance) { instance.hidden = true; },
  unhideInstance(instance: Instance) { instance.hidden = false; },
  unhideTextInstance(instance: Instance) { instance.hidden = false; },
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
};

const reconciler = Reconciler(hostConfig);

/** The target first, then its ancestors up to (not including) the root. */
function ancestry(instance: Instance | undefined): Instance[] {
  const path: Instance[] = [];
  let current: Container | Instance | null = instance ?? null;
  while (current !== null && 'kind' in current) {
    path.push(current);
    current = current.parent;
  }
  return path;
}

function liveInstance(container: Container, id: number | null): Instance | undefined {
  return id === null || id === VIEWPORT_ID ? undefined : container.committed.get(id)?.instance;
}

/**
 * `pointerenter`/`pointerleave` reach each element the pointer crosses, not every ancestor of the
 * target: moving between two children never runs their shared parent's handlers.
 */
function dispatchEnterLeave(container: Container, native: NativePointerEvent, path: Instance[]): DispatchResult {
  const related = liveInstance(container, native.relatedTarget);
  const crossed = exclusiveAncestry(path, ancestry(related));
  const ordered = native.type === 'pointerenter' ? crossed.reverse() : crossed;
  let result = NOT_DISPATCHED;
  for (const instance of ordered) {
    // Touch pointers never set hover, which removes sticky hover after taps.
    if (native.type === 'pointerenter') {
      if (native.pointerType === 'mouse') instance.hover = true;
    } else {
      if (native.pointerType === 'mouse') instance.hover = false;
      instance.active = false;
    }
    result = dispatchEvent(native, [instance], related?.handle ?? null, container);
    if (result.failure !== undefined) break;
  }
  return result;
}

function dispatch(container: Container, native: NativeEvent): DispatchResult {
  const addressesRoot = native.target === VIEWPORT_ID;
  const target = liveInstance(container, native.target);
  // Native queues events ahead of JS: an earlier event in this batch, or a handler that just
  // committed, may have removed this event's target.
  if (!addressesRoot && target === undefined) return NOT_DISPATCHED;
  const path = ancestry(target);
  switch (native.type) {
    case 'pointerenter': case 'pointerleave':
      return dispatchEnterLeave(container, native, path);
    case 'pointerdown': for (const instance of path) instance.active = true; break;
    case 'pointerup': for (const instance of path) instance.active = false; break;
    case 'focus': for (const instance of path) instance.focus = true; break;
    case 'blur': for (const instance of path) { instance.focus = false; instance.active = false; } break;
    case 'pointermove': case 'click': break;
  }
  if (native.type === 'click' && path.some((instance) => instance.props.disabled)) return NOT_DISPATCHED;
  return dispatchEvent(native, path, null, container);
}

export function createRoot(host: NativeHost, options: RootOptions): UIRoot {
  const container: Container = {
    host, profiler: new RendererProfiler(options.profile ?? false, options.now),
    id: VIEWPORT_ID, children: [], committed: new Map(), rootChildren: [],
    nextId: 1, width: readSnapshot(host).width, unmounted: false, failure: undefined,
    dispatching: false, listeners: new RootListeners(), unsubscribe: undefined,
    handle: {
      id: VIEWPORT_ID,
      testID: undefined,
      getRect() { return readSnapshot(host).nodes.find((node) => node.id === VIEWPORT_ID)?.rect; },
    },
    flush() { flush(container); },
  };
  const onUncaughtError = (error: Error) => {
    container.failure = error;
    options.onError?.(error);
  };
  const report = (error: Error) => {
    if (options.onError) options.onError(error);
    else console.error(error);
  };
  const fiberRoot = reconciler.createContainer(
    container, ConcurrentRoot, null, false, null, '', onUncaughtError, report, report, () => {},
  );

  function checkFailure(): void {
    if (container.failure !== undefined) {
      const error = container.failure;
      container.failure = undefined;
      throw error;
    }
  }

  /** The first failure fails the caller once dispatch finishes; later ones are reported, never dropped. */
  function recordFailure(error: Error): void {
    if (container.failure === undefined) container.failure = error;
    else report(error);
  }

  function processEvent(native: NativeEvent): void {
    const previousPriority = updatePriority;
    updatePriority = native.type === 'pointermove' ? ContinuousEventPriority : DiscreteEventPriority;
    let result: DispatchResult;
    try {
      result = dispatch(container, native);
    } finally {
      updatePriority = previousPriority;
    }
    if (result.failure !== undefined) recordFailure(result.failure);
    if (native.cancelable) {
      // Native is blocked until this answer arrives, so it is sent even if a handler threw.
      try {
        resolveEvent(host, native.seq, result.defaultPrevented);
      } catch (error) {
        recordFailure(error instanceof Error ? error : new Error(String(error)));
      }
    }
    if (native.type !== 'pointermove') {
      try {
        reconciler.flushSyncWork();
      } catch (error) {
        recordFailure(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  const root: UIRoot = {
    render(children) {
      if (container.unmounted) throw new Error('Cannot render into an unmounted UI root');
      const started = container.profiler.start();
      reconciler.updateContainerSync(children, fiberRoot, null, null);
      reconciler.flushSyncWork();
      container.profiler.finishWork('reconcile', started);
      checkFailure();
    },
    unmount() {
      if (container.unmounted) return;
      // Native must not call back into a root that is going away.
      container.unsubscribe?.();
      container.unsubscribe = undefined;
      reconciler.updateContainerSync(null, fiberRoot, null, null);
      reconciler.flushSyncWork();
      reconciler.flushPassiveEffects();
      container.unmounted = true;
      checkFailure();
    },
    dispatchEvents() {
      if (container.unmounted || container.dispatching) return;
      container.dispatching = true;
      const started = container.profiler.start();
      let processed = 0;
      try {
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
        if (processed !== 0) {
          reconciler.flushSyncWork();
          // Pseudo-state changes can affect paint without scheduling a React render.
          container.flush();
        }
      } finally {
        container.dispatching = false;
      }
      if (processed !== 0) container.profiler.finishWork('events', started);
      checkFailure();
    },
    addEventListener(type, listener) {
      return container.listeners.add(type, listener);
    },
    refreshStyles(width = readSnapshot(host).width) {
      if (container.unmounted) throw new Error('Cannot refresh an unmounted UI root');
      if (!Number.isFinite(width) || width < 0) throw new Error('UI viewport width must be nonnegative');
      container.width = width;
      container.flush();
    },
    getSnapshot: () => readSnapshot(host),
    setProfiling(enabled) { container.profiler.enabled = enabled; },
    takeProfile: () => container.profiler.take(),
    findByTestID(testID) {
      for (const [id, node] of container.committed) {
        if (node.instance.props.testID === testID) {
          return readSnapshot(host).nodes.find((entry) => entry.id === id);
        }
      }
      return undefined;
    },
  };
  container.unsubscribe = options.subscribeToEvents(() => root.dispatchEvents());
  return root;
}
