import { createContext, createElement, type ReactNode } from 'react';
import Reconciler from 'react-reconciler';
import {
  ConcurrentRoot, ContinuousEventPriority, DefaultEventPriority,
  DiscreteEventPriority, NoEventPriority,
} from 'react-reconciler/constants';
import { buildCommit, type CommitNode } from './commit';
import type { UIHandle, UIProps } from './components';
import {
  dispatchEvent, exclusiveAncestry, NOT_DISPATCHED, RootListeners,
  type DispatchResult, type PathNode, type UIEventMap,
} from './events';
import {
  checkCapture, commitPayload, findTag, readDeletions, readEvents, readNodeRect, readSnapshot, resolveEvent,
  type NativeEvent, type NativeEventType, type NativeHost, type NativePointerEvent,
  type NativeSnapshot, type NativeSnapshotNode,
} from './native';
import { nativeProps, scalarText, type NativeKind } from './props';
import { RendererProfiler, type RendererProfile } from './profile';

/** The native tag of the layer root, which is also the target of events addressed to the root. */
const LAYER_ROOT_TAG = 0;
const MAIN_LAYER = 0;
const OVERLAY_LAYER = 1;
const MAX_TAG = 0xffff_ffff;
const EMPTY_CONTEXT = Object.freeze({});
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
  readonly props: UIProps;
  readonly children: Instance[];
}

/** One tree of instances native mounts as a layer; React calls its callbacks with this. */
interface Container {
  readonly root: RootState;
  readonly layer: number;
  /** The layer's top-level tags as of the last successful commit. */
  rootTags: number[];
}

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
  readonly main: Container;
  /** Created with the first render. */
  overlay: Container | undefined;
  unmounted: boolean;
  failure: Error | undefined;
  /** True while `dispatchEvents` drains native events; a nested call returns at once. */
  dispatching: boolean;
  readonly listeners: RootListeners;
  /** Handle for the layer root, the target of events addressed to root listeners only. */
  readonly handle: UIHandle;
  unsubscribe: (() => void) | undefined;
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
  getSnapshot(): NativeSnapshot;
  /** The first element created with this `testID`, from a native query. */
  findByTestID(testID: string): NativeSnapshotNode | undefined;
  setProfiling(enabled: boolean): void;
  takeProfile(): RendererProfile;
}

function createInstance(kind: NativeKind, props: UIProps, container: Container): Instance {
  const root = container.root;
  if (root.nextTag > MAX_TAG) throw new Error('UI root exhausted its u32 tags');
  const tag = root.nextTag++;
  return { tag, kind, root, props, native: nativeProps(kind, props, false), children: [] };
}

function cloneInstance(
  instance: Instance, kind: NativeKind, oldProps: UIProps, newProps: UIProps, keepChildren: boolean, hidden: boolean,
): Instance {
  return {
    tag: instance.tag, kind, root: instance.root, props: newProps,
    native: nativeProps(kind, newProps, hidden, { props: oldProps, native: instance.native }),
    children: keepChildren ? instance.children : [],
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

/** The public handle of a tag; created on first use and stable across clones. */
function handleFor(root: RootState, tag: number): UIHandle {
  let handle = root.handles.get(tag);
  if (handle === undefined) {
    handle = {
      id: tag,
      get testID() { return root.committed.get(tag)?.props.testID; },
      getRect() { return readNodeRect(root.host, tag); },
      ...captureMethods(root.host, tag),
    };
    root.handles.set(tag, handle);
  }
  return handle;
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
function replaceContainerChildren(container: Container, children: Instance[]): void {
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
      Object.freeze(instance);
      root.committed.set(tag, instance);
    }
    container.rootTags = built.rootTags;
    if (payload !== undefined) {
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

let updatePriority: Reconciler.EventPriority = NoEventPriority;
const transitionContext = createContext(null);

type HostConfig = Reconciler.HostConfig<
  NativeKind, UIProps, Container, Instance, never, never, never, never,
  UIHandle, typeof EMPTY_CONTEXT, Instance[], ReturnType<typeof setTimeout>, -1, null
>;

const hostConfig = {
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
  getRootHostContext: () => EMPTY_CONTEXT,
  getChildHostContext: () => EMPTY_CONTEXT,
  getPublicInstance: (instance: Instance) => handleFor(instance.root, instance.tag),
  // Render makes no native call: instances are plain JS objects, so an abandoned render costs
  // nothing natively (plan 3.9).
  createInstance: (kind: NativeKind, props: UIProps, container: Container) => createInstance(kind, props, container),
  createTextInstance(): never {
    throw new Error('Text strings must be rendered within a <Text> component');
  },
  appendInitialChild(parent: Instance, child: Instance) { parent.children.push(child); },
  finalizeInitialChildren: () => false,
  shouldSetTextContent: (kind: NativeKind, props: UIProps) => kind === 'text' && scalarText(props.children) !== undefined,
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
  cloneInstance: (instance: Instance, kind: NativeKind, oldProps: UIProps, newProps: UIProps, keepChildren: boolean) =>
    cloneInstance(instance, kind, oldProps, newProps, keepChildren, false),
  // A hidden subtree (Suspense showing a fallback) keeps its instance but takes no space; when it is
  // shown again React appends the unhidden instance, which the walk diffs back.
  cloneHiddenInstance: (instance: Instance, kind: NativeKind, props: UIProps) =>
    cloneInstance(instance, kind, instance.props, props, true, true),
  cloneHiddenTextInstance(): never {
    throw new Error('Text strings must be rendered within a <Text> component');
  },
  createContainerChildSet: (): Instance[] => [],
  appendChildToContainerChildSet(childSet: Instance[], child: Instance) { childSet.push(child); },
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
};

const reconciler = Reconciler(hostConfig);

/** What `<Portal>` renders into: the overlay layer of the root that rendered it. */
export const OverlayContext = createContext<Container | null>(null);

/** Render `children` into the overlay layer, which always covers the main layer. */
export function createOverlayPortal(children: ReactNode, overlay: Container): ReactNode {
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
    if (instance !== undefined) nodes.push({ handle: handleFor(root, tag), props: instance.props });
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
  const relatedHandle = related === undefined ? null : handleFor(root, related.tag);
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

/** React's own split: moves and wheel ticks arrive in streams and their updates may be batched. */
function isContinuous(native: NativeEvent): boolean {
  return native.type === 'pointermove' || native.type === 'wheel';
}

function dispatch(root: RootState, native: NativeEvent): DispatchResult {
  const addressesRoot = native.target === LAYER_ROOT_TAG;
  // Native queues events ahead of JS: an earlier event in this batch, or a handler that just
  // committed, may have removed this event's target.
  if (!addressesRoot && !root.committed.has(native.target)) return NOT_DISPATCHED;
  if (native.type === 'pointerenter' || native.type === 'pointerleave') return dispatchEnterLeave(root, native);
  const path = pathNodes(root, native.path);
  if (isClickFamily(native.type) && path.some((node) => node.props.disabled)) return NOT_DISPATCHED;
  return dispatchEvent(native, path, null, root);
}

export function createRoot(host: NativeHost, options: RootOptions): UIRoot {
  // Fail on a host that does not answer a snapshot before any React work.
  readSnapshot(host);
  const report = (error: Error) => {
    if (options.onError) options.onError(error);
    else console.error(error);
  };
  const state: RootState = {
    host, report, profiler: new RendererProfiler(options.profile ?? false, options.now),
    nextTag: 1, committed: new Map(), handles: new Map(),
    main: { get root() { return state; }, layer: MAIN_LAYER, rootTags: [] },
    overlay: undefined, unmounted: false, failure: undefined,
    dispatching: false, listeners: new RootListeners(), unsubscribe: undefined,
    handle: {
      id: LAYER_ROOT_TAG,
      testID: undefined,
      getRect() { return readNodeRect(host, LAYER_ROOT_TAG); },
      ...captureMethods(host, LAYER_ROOT_TAG),
    },
  };
  const onUncaughtError = (error: Error) => {
    state.failure = error;
    options.onError?.(error);
  };
  const fiberRoot = reconciler.createContainer(
    state.main, ConcurrentRoot, null, false, null, '', onUncaughtError, report, report, () => {},
  );
  const overlay = (): Container => {
    state.overlay ??= { get root() { return state; }, layer: OVERLAY_LAYER, rootTags: [] };
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
    const previousPriority = updatePriority;
    updatePriority = isContinuous(native) ? ContinuousEventPriority : DiscreteEventPriority;
    let result: DispatchResult;
    try {
      result = dispatch(state, native);
    } finally {
      updatePriority = previousPriority;
    }
    if (result.failure !== undefined) recordFailure(state, result.failure);
    if (native.cancelable) {
      // Native is blocked until this answer arrives, so it is sent even if a handler threw.
      try {
        resolveEvent(host, native.seq, result.defaultPrevented);
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
    unmount() {
      if (state.unmounted) return;
      // Native must not call back into a root that is going away.
      state.unsubscribe?.();
      state.unsubscribe = undefined;
      reconciler.updateContainerSync(null, fiberRoot, null, null);
      reconciler.flushSyncWork();
      reconciler.flushPassiveEffects();
      state.unmounted = true;
      checkFailure();
    },
    dispatchEvents() {
      if (state.unmounted || state.dispatching) return;
      state.dispatching = true;
      const started = state.profiler.start();
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
        if (processed !== 0) reconciler.flushSyncWork();
      } finally {
        state.dispatching = false;
      }
      if (processed !== 0) state.profiler.finishWork('events', started);
      checkFailure();
    },
    addEventListener(type, listener) {
      return state.listeners.add(type, listener);
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
