import { createContext, type ReactNode } from 'react';
import Reconciler from 'react-reconciler';
import {
  ConcurrentRoot, ContinuousEventPriority, DefaultEventPriority,
  DiscreteEventPriority, NoEventPriority,
} from 'react-reconciler/constants';
import type { UIEvent, UIHandle, UIProps } from './components';
import {
  applyCommands, readEvents, readSnapshot,
  type NativeCommand, type NativeEvent, type NativeHost, type NativeKind,
  type NativeSnapshot, type NativeSnapshotNode,
} from './native';
import { resolveStyles } from './styles';
import type { Style } from './types';
import { RendererProfiler, type RendererProfile } from './profile';

const VIEWPORT_ID = 0;
const MAX_NODE_ID = 0xffff_ffff;
const EMPTY_CONTEXT = Object.freeze({});

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
  flush(): void;
}

export interface RootOptions {
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
  /** Call once per Godot frame. Events are dispatched with React event priorities. */
  dispatchEvents(): void;
  /** Call after the logical viewport resizes. Width drives responsive utility classes. */
  refreshStyles(width?: number): void;
  getSnapshot(): NativeSnapshot;
  findByTestID(testID: string): NativeSnapshotNode | undefined;
  setProfiling(enabled: boolean): void;
  takeProfile(): RendererProfile;
}

function scalarText(children: ReactNode): string | undefined {
  if (children === null || children === undefined || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number' || typeof children === 'bigint') {
    return String(children);
  }
  if (Array.isArray(children)) {
    let text = '';
    for (const child of children) {
      const part = scalarText(child);
      if (part === undefined) return undefined;
      text += part;
    }
    return text;
  }
  return undefined;
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

function eventHandler(props: UIProps, type: NativeEvent['type']): UIProps['onClick'] {
  switch (type) {
    case 'click': return props.onClick;
    case 'pointerdown': return props.onPointerDown;
    case 'pointerup': return props.onPointerUp;
    case 'pointermove': return props.onPointerMove;
    case 'pointerenter': return props.onPointerEnter;
    case 'pointerleave': return props.onPointerLeave;
    case 'focus': return props.onFocus;
    case 'blur': return props.onBlur;
  }
}

function dispatch(container: Container, event: NativeEvent): void {
  const target = container.committed.get(event.id)?.instance;
  // Events are queued natively; an earlier event in this same frame may have unmounted its target.
  if (target === undefined) return;
  const path: Instance[] = [];
  let current: Container | Instance | null = target;
  while (current !== null && 'kind' in current) {
    path.push(current);
    current = current.parent;
  }
  let propagationStopped = false;
  for (const instance of path) {
    switch (event.type) {
      case 'pointerenter': instance.hover = true; break;
      case 'pointerleave': instance.hover = false; instance.active = false; break;
      case 'pointerdown': instance.active = true; break;
      case 'pointerup': instance.active = false; break;
      case 'focus': instance.focus = true; break;
      case 'blur': instance.focus = false; instance.active = false; break;
    }
  }
  if (event.type === 'click' && path.some((instance) => instance.props.disabled)) return;
  for (const instance of path) {
    if (propagationStopped) break;
    const handler = eventHandler(instance.props, event.type);
    if (handler === undefined) continue;
    const synthetic: UIEvent = {
      type: event.type,
      target: target.handle,
      currentTarget: instance.handle,
      x: event.x,
      y: event.y,
      stopPropagation() { propagationStopped = true; },
      isPropagationStopped: () => propagationStopped,
    };
    handler(synthetic);
  }
}

export function createRoot(host: NativeHost, options: RootOptions = {}): UIRoot {
  const container: Container = {
    host, profiler: new RendererProfiler(options.profile ?? false, options.now),
    id: VIEWPORT_ID, children: [], committed: new Map(), rootChildren: [],
    nextId: 1, width: readSnapshot(host).width, unmounted: false, failure: undefined,
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

  return {
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
      reconciler.updateContainerSync(null, fiberRoot, null, null);
      reconciler.flushSyncWork();
      reconciler.flushPassiveEffects();
      container.unmounted = true;
      checkFailure();
    },
    dispatchEvents() {
      if (container.unmounted) return;
      const started = container.profiler.start();
      const events = readEvents(host);
      for (const event of events) {
        const previousPriority = updatePriority;
        updatePriority = event.type === 'pointermove' ? ContinuousEventPriority : DiscreteEventPriority;
        try {
          dispatch(container, event);
        } finally {
          updatePriority = previousPriority;
        }
      }
      reconciler.flushSyncWork();
      // Pseudo-state changes can affect paint without scheduling a React render.
      if (events.length !== 0) container.flush();
      if (events.length !== 0) container.profiler.finishWork('events', started);
      checkFailure();
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
}
