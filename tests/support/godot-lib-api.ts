/**
 * GodotJS's `godot.lib.api` module for the Node tests, which have no engine: as much of it as the library uses (src/godot-host.ts).
 * tests/tsconfig.json names this file for the module, and `pnpm test` gives tsx that config.
 *
 * The engine's module makes proxies of Godot objects that answer a symbol of its own, `ProxyTarget`, with the object. `proxyOf` makes
 * such a proxy here, and counts what is read through it, so a test can hold the library to reading nothing through one.
 */

const ProxyTarget = Symbol('ProxyTarget');

/** The objects `proxyOf` made proxies of, by proxy. */
const targets = new WeakMap<object, { readonly target: object; reads: number }>();

/** A proxy of `target`, as `godot.lib.api`'s `instance_proxy` is one: every member is read through it, and `ProxyTarget` is the target. */
export function proxyOf<Target extends object>(target: Target): Target {
  const made: Target = new Proxy(target, {
    get(inner, key) {
      if (key === ProxyTarget) return inner;
      const entry = targets.get(made);
      if (entry !== undefined) entry.reads += 1;
      const value: unknown = Reflect.get(inner, key);
      return typeof value === 'function' ? value.bind(inner) : value;
    },
  });
  targets.set(made, { target, reads: 0 });
  return made;
}

/** How many members were read through a proxy `proxyOf` made. */
export function readsThrough(made: object): number {
  const entry = targets.get(made);
  if (entry === undefined) throw new Error('readsThrough: not a proxy that proxyOf made');
  return entry.reads;
}

export const proxy = {
  /** The engine's: `value?.[ProxyTarget] ?? value`. */
  proxy_unwrap_value<Value>(value: Value): Value {
    if (typeof value !== 'object' || value === null) return value;
    const inner: unknown = Reflect.get(value, ProxyTarget);
    // The cast: a proxy's target is the object the proxy was typed as, which `Reflect.get` cannot say. The engine's own function is typed
    // the same way, over an `any`.
    return inner === undefined ? value : inner as Value;
  },
};
