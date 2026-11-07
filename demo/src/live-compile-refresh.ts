import { useSyncExternalStore } from 'react';
import type { RefreshHooks } from './live-compile-modules';

/**
 * Production-compatible component family registry for the live code editor.
 *
 * In production (`process.env.NODE_ENV === "production"`), `react-refresh/runtime` cannot be loaded, and `react-reconciler` omits
 * DevTools refresh entry points. React's reconciler preserves hook state across renders when `current.type === element.type`, and resets
 * state when `current.type !== element.type`.
 *
 * This registry assigns a stable proxy component to each component `id`. When a component is updated with an unchanged hook signature
 * (`$RefreshSig$`), the proxy reference is retained, preserving hook state. When the signature changes (hook added, removed, or reordered),
 * a new proxy reference is created, causing React to cleanly reset the component's state without crashing on changed hook orders.
 *
 * A proxy also subscribes each mounted instance to its family (`useSyncExternalStore`), and a family that is given new code tells its
 * instances. Rendering again from the root is not enough: React skips a subtree whose element it has already rendered (a `React.memo`
 * component with the props it had, an element a parent kept in `useMemo`), and that subtree would go on showing the old code. This
 * is what the dev reconciler's `scheduleRefresh` does for the real Fast Refresh: mark every fiber of an updated family for a render.
 */

// `typeof x === 'function'` narrows `unknown` to `Function` in TypeScript.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type AnyFunction = Function;

interface SignatureEntry {
  readonly key: string;
  readonly forceReset: boolean;
}

interface Family {
  readonly id: string;
  current: AnyFunction;
  signature: string | undefined;
  proxy: AnyFunction;
  /** Grows each time the family is given new code; the instances' store snapshot. */
  version: number;
  readonly listeners: Set<() => void>;
  readonly subscribe: (listener: () => void) => () => void;
  readonly getVersion: () => number;
}

const pendingSignatures = new WeakMap<AnyFunction, SignatureEntry>();
const familiesById = new Map<string, Family>();
const familyByComponent = new WeakMap<AnyFunction, Family>();
const refreshListeners = new Set<() => void>();

function componentName(fn: AnyFunction): string {
  const displayName = Reflect.get(fn, 'displayName');
  return typeof displayName === 'string' && displayName !== '' ? displayName : fn.name;
}

function makeProxy(family: Family): AnyFunction {
  const ProxyComponent = function (this: unknown, props: unknown, ref: unknown): unknown {
    // Asks for a render when the family gets new code, whatever its parents' bailouts say.
    useSyncExternalStore(family.subscribe, family.getVersion);
    if (typeof props === 'object' && props !== null && '__refreshEpoch' in props) {
      const copy: Record<string, unknown> = { ...props };
      delete copy['__refreshEpoch'];
      return Reflect.apply(family.current, this, [copy, ref]);
    }
    return Reflect.apply(family.current, this, [props, ref]);
  };
  const name = componentName(family.current);
  if (name !== '') {
    Object.defineProperty(ProxyComponent, 'name', { value: name, configurable: true });
  }
  return ProxyComponent;
}

function createSignature(): (type?: unknown, key?: unknown, forceReset?: unknown) => unknown {
  return (type?: unknown, key?: unknown, forceReset?: unknown) => {
    if (typeof key === 'string' && typeof type === 'function') {
      pendingSignatures.set(type, {
        key,
        forceReset: Boolean(forceReset),
      });
      return type;
    }
    return type;
  };
}

function register(type: unknown, id: string): void {
  if (typeof type !== 'function') return;
  const sigEntry = pendingSignatures.get(type);
  const nextSig = sigEntry !== undefined ? `${sigEntry.key}::${Boolean(sigEntry.forceReset)}` : undefined;

  let family = familiesById.get(id);
  if (family === undefined) {
    const listeners = new Set<() => void>();
    const created: Family = {
      id,
      current: type,
      signature: nextSig,
      proxy: type,
      version: 0,
      listeners,
      subscribe: listener => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      },
      getVersion: () => created.version,
    };
    created.proxy = makeProxy(created);
    family = created;
    familiesById.set(id, family);
  } else {
    const signatureChanged = family.signature !== nextSig || sigEntry?.forceReset === true;
    family.current = type;
    family.signature = nextSig;
    if (signatureChanged) {
      family.proxy = makeProxy(family);
    }
    family.version += 1;
    for (const listener of [...family.listeners]) listener();
  }

  familyByComponent.set(type, family);
  familyByComponent.set(family.proxy, family);
}

/**
 * `memo(Component)` and `forwardRef(render)` are not components the compiler registers (the parser's Fast Refresh pass registers
 * top-level functions only), so a module that is evaluated again makes new wrapper objects, which are new element types: the
 * wrapped component remounts and loses its state, and a wrapper that holds an older version of an inner function that another
 * module has since edited shows the old code. A wrapper made here is one object for the component, whatever the number of times
 * the module that makes it runs, over a stable inner function that calls the latest version of the component (through its family,
 * if it has one) and, like a proxy, subscribes its instances to the wrapper's family. A wrapper is told apart by the module that
 * makes it, the name of what it wraps and how many wrappers of that name the module made before it.
 */
interface WrapperFamily {
  wrapped: unknown;
  current: unknown;
  compare: unknown;
  readonly signature: string | undefined;
  readonly hasCompare: boolean;
  version: number;
  readonly listeners: Set<() => void>;
  readonly subscribe: (listener: () => void) => () => void;
  readonly getVersion: () => number;
}

const wrapperFamilies = new Map<string, WrapperFamily>();

type CompareProps = (previous: unknown, next: unknown) => boolean;

/** How the wrapper object is made from its inner function (React's `memo` or `forwardRef`, the module's own copy). */
export type CreateWrapper = (inner: unknown, compare: CompareProps | undefined) => unknown;

function isCompare(value: unknown): value is CompareProps {
  return typeof value === 'function';
}

function signatureOf(component: unknown): { readonly signature: string | undefined; readonly forceReset: boolean } {
  const entry = typeof component === 'function' ? pendingSignatures.get(component) : undefined;
  return entry === undefined
    ? { signature: undefined, forceReset: false }
    : { signature: `${entry.key}::${Boolean(entry.forceReset)}`, forceReset: Boolean(entry.forceReset) };
}

export function stableWrapper(key: string, component: unknown, compare: unknown, create: CreateWrapper): unknown {
  // A wrapper of something that is not a function (another wrapper) is left to React.
  if (typeof component !== 'function') return create(component, isCompare(compare) ? compare : undefined);
  const { signature, forceReset } = signatureOf(component);
  const hasCompare = isCompare(compare);
  const existing = wrapperFamilies.get(key);
  if (existing !== undefined && existing.signature === signature && existing.hasCompare === hasCompare && !forceReset) {
    existing.current = component;
    existing.compare = compare;
    existing.version += 1;
    for (const listener of [...existing.listeners]) listener();
    return existing.wrapped;
  }
  const listeners = new Set<() => void>();
  const family: WrapperFamily = {
    wrapped: undefined, current: component, compare, signature, hasCompare, version: 0, listeners,
    subscribe: listener => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getVersion: () => family.version,
  };
  const Stable = function (props: unknown, ref: unknown): unknown {
    useSyncExternalStore(family.subscribe, family.getVersion);
    const inner = resolveRefreshComponent(family.current);
    if (typeof inner !== 'function') throw new Error(`The component ${componentName(component)} wrapped by ${key} is not a function`);
    return Reflect.apply(inner, undefined, [props, ref]);
  };
  Object.defineProperty(Stable, 'name', { value: componentName(component), configurable: true });
  family.wrapped = create(Stable, hasCompare ? (previous, next) => {
    const latest = family.compare;
    return isCompare(latest) ? latest(previous, next) : false;
  } : undefined);
  wrapperFamilies.set(key, family);
  return family.wrapped;
}

const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
const REACT_MEMO_TYPE = Symbol.for('react.memo');

export function isLikelyComponentType(type: unknown): boolean {
  switch (typeof type) {
    case 'function': {
      if (type.prototype !== null && type.prototype !== undefined) {
        if (Boolean(Reflect.get(type.prototype, 'isReactComponent'))) return true;
        const ownNames = Object.getOwnPropertyNames(type.prototype);
        if (
          ownNames.length > 1 ||
          ownNames[0] !== 'constructor' ||
          Object.getPrototypeOf(type.prototype) !== Object.prototype
        ) {
          return false;
        }
      }
      const name = componentName(type);
      return /^[A-Z]/u.test(name);
    }
    case 'object': {
      if (type !== null) {
        const kind = Reflect.get(type, '$$typeof');
        return kind === REACT_FORWARD_REF_TYPE || kind === REACT_MEMO_TYPE;
      }
      return false;
    }
    default:
      return false;
  }
}

export function resolveRefreshComponent(type: unknown): unknown {
  if (typeof type === 'function') {
    const family = familyByComponent.get(type);
    if (family !== undefined) {
      return family.proxy;
    }
  }
  return type;
}

/** Installs the refresh hook. In production, component proxies manage state preservation directly. */
export function installRefreshHook(): void {
  // Production component family registry does not require dev-reconciler hook injection.
}

export const refreshHooks: RefreshHooks = {
  createSignature,
  register,
  isLikelyComponentType,
};

export function onPerformRefresh(listener: () => void): () => void {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
}

/** Re-renders what the registrations since the last call changed. */
export function performRefresh(): unknown {
  for (const listener of refreshListeners) {
    listener();
  }
  return null;
}
