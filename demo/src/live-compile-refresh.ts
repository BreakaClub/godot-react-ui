import * as RefreshRuntime from 'react-refresh/runtime';
import type { RefreshHooks } from './live-compile-modules';

/**
 * React Fast Refresh for the live code editor: `react-refresh/runtime` keeps a family for each component the compiler registered
 * (`$RefreshReg$`), compares the hooks of the old and the new implementation (`$RefreshSig$`), and `performReactRefresh` re-renders
 * the mounted components of the families an edit changed, keeping their state where the hooks are the same and remounting them where
 * they are not. It reaches React through `__REACT_DEVTOOLS_GLOBAL_HOOK__`, which the library's renderer registers with when it makes
 * its first root (`src/renderer.ts`, `injectIntoDevTools`), so the hook has to be installed before that.
 */

let installed = false;

/** Installs the DevTools hook the refresh runtime listens on. Call before the first `createRoot`; later calls do nothing. */
export function installRefreshHook(): void {
  if (installed) return;
  installed = true;
  RefreshRuntime.injectIntoGlobalHook(globalThis);
}

export const refreshHooks: RefreshHooks = {
  createSignature: () => RefreshRuntime.createSignatureFunctionForTransform(),
  register: (type, id) => RefreshRuntime.register(type, id),
  isLikelyComponentType: type => RefreshRuntime.isLikelyComponentType(type),
};

/** Re-renders what the registrations since the last call changed. Returns what React updated, or null when nothing was registered. */
export function performRefresh(): RefreshRuntime.RefreshUpdate | null {
  return RefreshRuntime.performReactRefresh();
}
