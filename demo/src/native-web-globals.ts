import { AbortController as LibraryAbortController, AbortSignal as LibraryAbortSignal } from 'abort-controller/dist/abort-controller';

// The navigator's router (TanStack Router) is written for a browser. Native GodotJS gives scripts the ECMAScript builtins, `console`, the
// timers and its own bindings (GodotJS bridge/jsb_essentials.cpp), and none of the Web platform's globals; Node, which runs the tests,
// has some of them and not others. This gives the router what it reaches for on every navigation, where the platform has none of its own
// (a browser keeps its own everywhere):
// - AbortController and AbortSignal: router-core makes one for each route match and each load (router.js, load-client.js).
// - scrollTo: after each navigation the router puts the browser window's scroll back to the top (scroll-restoration.js). Native has no
//   window and Node runs none; the navigator scrolls its own ScrollView, which the router does not know about. There, nothing scrolls.
// - self: router-core keeps itself on `self.__TSR_ROUTER__`, the browser's global. The native bundle defines `self` as `globalThis`
//   (scripts/build.mjs); Node has no `self`.
// URLSearchParams is only for reading a search, which the navigator's routes do not have: its router reads none (`NO_SEARCH` in
// navigator.tsx). queueMicrotask is only for a redirect, `router.navigate` (what a `Link` does) and the browser history, none of which the
// navigator uses: it moves its memory history with `commitLocation`. A navigator that starts using one needs queueMicrotask here.
// tests/navigator.test.ts runs the navigator with Node's Web globals taken away.

declare global {
  // eslint-disable-next-line no-var
  var scrollTo: ((options?: { top?: number; left?: number; behavior?: string }) => void) | undefined;
  // eslint-disable-next-line no-var
  var self: typeof globalThis | undefined;
}

function define(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true, enumerable: false });
}

/** Install what the router needs where the platform has none of its own. The module does it once; a test that takes them away does it again. */
export function installNativeWebGlobals(): void {
  if (!Reflect.has(globalThis, 'AbortController')) {
    // abort-controller's implementation of the DOM standard's AbortController as of 2019: `signal`, `abort()`, and a signal's `aborted`,
    // `onabort` and abort listeners, which is all router-core uses. It predates the signal's `reason` and `throwIfAborted()` and the static
    // `AbortSignal.timeout`/`any`, which Node's declarations of the global name promise, so it is defined, not assigned to that typed
    // global. Nothing in the demo calls them; an AbortController in native GodotJS itself would make this unnecessary.
    define('AbortController', LibraryAbortController);
    define('AbortSignal', LibraryAbortSignal);
  }
  if (globalThis.scrollTo === undefined) globalThis.scrollTo = () => {};
  if (globalThis.self === undefined) globalThis.self = globalThis;
}

installNativeWebGlobals();
