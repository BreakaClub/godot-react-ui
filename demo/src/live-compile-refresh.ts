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
    const created: Family = {
      id,
      current: type,
      signature: nextSig,
      proxy: type,
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
  }

  familyByComponent.set(type, family);
  familyByComponent.set(family.proxy, family);
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
