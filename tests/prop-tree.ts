import { createContext, type ReactNode } from 'react';
import Reconciler from 'react-reconciler';
import { ConcurrentRoot, DefaultEventPriority, NoEventPriority } from 'react-reconciler/constants';

/**
 * Every prop an element was given, JavaScript-only ones included. The renderer under test sends native
 * only `NATIVE_PROP_KEYS`, so a test cannot read `role` or `aria-*` back from the fake host; rendering
 * the same elements through this tiny second reconciler can.
 */
export interface PropNode {
  readonly type: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children: readonly PropNode[];
}

interface PropContainer {
  children: readonly PropNode[];
}

const EMPTY_CONTEXT = Object.freeze({});
const NO_TRANSITION = null;
let updatePriority: Reconciler.EventPriority = NoEventPriority;

function unsupported(what: string): never {
  throw new Error(`The prop-tree test renderer does not support ${what}`);
}

type HostConfig = Reconciler.HostConfig<
  string, Record<string, unknown>, PropContainer, PropNode, never, never, never, never,
  PropNode, typeof EMPTY_CONTEXT, PropNode[], ReturnType<typeof setTimeout>, -1, null
>;

const transitionContext = createContext(null);

const hostConfig = {
  supportsMutation: false,
  supportsPersistence: true,
  supportsHydration: false,
  isPrimaryRenderer: true,
  supportsMicrotasks: true,
  scheduleMicrotask(callback: () => unknown) { void Promise.resolve().then(callback); },
  getRootHostContext: () => EMPTY_CONTEXT,
  getChildHostContext: () => EMPTY_CONTEXT,
  getPublicInstance: (instance: PropNode) => instance,
  createInstance: (type: string, props: Record<string, unknown>): PropNode => ({ type, props, children: [] }),
  createTextInstance: () => unsupported('raw text'),
  appendInitialChild(parent: PropNode, child: PropNode) { (parent.children as PropNode[]).push(child); },
  finalizeInitialChildren: () => false,
  shouldSetTextContent: (type: string) => type === 'text',
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
  cloneInstance: (instance: PropNode, type: string, _oldProps: Record<string, unknown>, newProps: Record<string, unknown>, keepChildren: boolean): PropNode =>
    ({ type, props: newProps, children: keepChildren ? instance.children : [] }),
  cloneHiddenInstance: () => unsupported('Suspense'),
  cloneHiddenTextInstance: () => unsupported('Suspense'),
  createContainerChildSet: (): PropNode[] => [],
  appendChildToContainerChildSet(childSet: PropNode[], child: PropNode) { childSet.push(child); },
  finalizeContainerChildren: () => {},
  replaceContainerChildren(container: PropContainer, children: PropNode[]) { container.children = children; },
  NotPendingTransition: NO_TRANSITION,
  // Same upstream type mismatch that src/renderer.ts documents: the declaration describes React 18's
  // Provider/Consumer shape. This is a test helper and the field is never read.
  HostTransitionContext: transitionContext as unknown as Reconciler.ReactContext<null>,
  setCurrentUpdatePriority(priority: Reconciler.EventPriority) { updatePriority = priority; },
  getCurrentUpdatePriority: () => updatePriority,
  resolveUpdatePriority: () => (updatePriority === NoEventPriority ? DefaultEventPriority : updatePriority),
  resetFormInstance: () => unsupported('forms'),
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

export interface PropTreeRoot {
  render(element: ReactNode): readonly PropNode[];
  unmount(): void;
}

function rethrow(error: unknown): never {
  throw error instanceof Error ? error : new Error(String(error));
}

export function createPropTreeRoot(): PropTreeRoot {
  const container: PropContainer = { children: [] };
  const fiberRoot = reconciler.createContainer(container, ConcurrentRoot, null, false, null, '', rethrow, rethrow, rethrow, () => {});
  return {
    render(element) {
      reconciler.updateContainerSync(element, fiberRoot, null, null);
      reconciler.flushSyncWork();
      return container.children;
    },
    unmount() {
      reconciler.updateContainerSync(null, fiberRoot, null, null);
      reconciler.flushSyncWork();
    },
  };
}

/** The first element, in document order, whose `testID` is `testID`. */
export function findByTestID(nodes: readonly PropNode[], testID: string): PropNode | undefined {
  for (const node of nodes) {
    if (node.props.testID === testID) return node;
    const inside = findByTestID(node.children, testID);
    if (inside !== undefined) return inside;
  }
  return undefined;
}
