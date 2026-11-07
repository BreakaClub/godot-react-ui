// An adapter that lets @tanstack/virtual-core (3.19.11) drive a godot-react-ui scroll container.
//
// virtual-core never touches the DOM itself except through the "scroll element" it is given and the "window"
// (`element.ownerDocument.defaultView`, else `element.window`) it schedules frames on. Both are duck-typed at run
// time, so a plain object works; only the TYPES insist on `Element | Window`, hence the one documented cast below.
//
// What the adapter reads from godot-react-ui: the container's handle (`ref` of the `View`), `handle.getScrollState()`
// for the first size and offset, the `onScroll` event (scrollTop, clientWidth, clientHeight) for every later one,
// and `handle.scrollTo({ top })` to write. Nothing else.
import { useLayoutEffect, useReducer, useRef, useState } from 'react';
import {
  Virtualizer, type Rect, type VirtualizerOptions, type VirtualItem,
} from '@tanstack/virtual-core';
import type { UIHandle, UIScrollEvent } from '../../../../src';

/** The frame the window shim reports (virtual-core's own debounce and its scroll reconcile use `requestAnimationFrame`). */
const FRAME_MS = 16;
/** How long after the last scroll event `isScrolling` stays true (virtual-core's default is 150 ms). */
const SCROLLING_RESET_MS = 150;

interface WindowShim {
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(id: number): void;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  performance: { now(): number };
}

const windowShim: WindowShim = {
  requestAnimationFrame(callback) { return Number(setTimeout(callback, FRAME_MS)); },
  cancelAnimationFrame(id) { clearTimeout(id); },
  setTimeout, clearTimeout,
  performance: { now: () => Date.now() },
};

type ScrollListener = () => void;

/** The stand-in for a DOM scroll element: the properties virtual-core reads, kept current from native's events. */
export class GodotScrollSource {
  /** virtual-core takes this as `targetWindow` when the element has no `ownerDocument`. */
  readonly window = windowShim;
  scrollTop = 0;
  scrollLeft = 0;
  clientWidth = 0;
  clientHeight = 0;
  scrollWidth = 0;
  scrollHeight = 0;
  handle: UIHandle | null = null;
  readonly scrollListeners = new Set<ScrollListener>();
  /** Counts for the probe: how often virtual-core wrote a position through the handle. */
  scrollToCalls: Array<{ top: number; behavior: string | undefined }> = [];

  /** Called from the container's `ref`. Reads the first size and offset synchronously from native. */
  attach = (handle: UIHandle | null): void => {
    this.handle = handle;
    if (handle === null) return;
    const state = handle.getScrollState();
    if (state === undefined) throw new Error('the ref element is not a scroll container (give the View overflow-y-scroll)');
    this.scrollTop = state.scrollTop;
    this.clientWidth = state.clientWidth;
    this.clientHeight = state.clientHeight;
    this.scrollWidth = state.scrollWidth;
    this.scrollHeight = state.scrollHeight;
  };

  /** Called from the container's `onScroll`. */
  onScroll = (event: UIScrollEvent): void => {
    this.scrollTop = event.scrollTop;
    this.scrollLeft = event.scrollLeft;
    this.clientWidth = event.clientWidth;
    this.clientHeight = event.clientHeight;
    this.scrollWidth = event.scrollWidth;
    this.scrollHeight = event.scrollHeight;
    for (const listener of [...this.scrollListeners]) listener();
  };

  /** What virtual-core's `scrollToFn` ends in (`scrollElement.scrollTo({ top, behavior })`). */
  scrollTo(options: { top?: number; left?: number; behavior?: string }): void {
    if (this.handle === null) throw new Error('scrollTo before the scroll container was attached');
    this.scrollToCalls.push({ top: options.top ?? Number.NaN, behavior: options.behavior });
    // `behavior: 'smooth'` has no equivalent: `scrollTo` is instant (components.tsx UIHandle.scrollTo).
    this.handle.scrollTo({ top: options.top, left: options.left });
  }
}

type GodotOptions = Omit<
  VirtualizerOptions<Element, Element>,
  'getScrollElement' | 'observeElementRect' | 'observeElementOffset' | 'scrollToFn' | 'onChange'
>;

/** Same three hooks the DOM versions are: rect, offset, write. */
function observeRect(source: GodotScrollSource) {
  return (_instance: unknown, callback: (rect: Rect) => void): (() => void) => {
    callback({ width: source.clientWidth, height: source.clientHeight });
    // A container whose size changes without moving fires no event: there is no ResizeObserver equivalent. The only
    // later size reports are the ones a scroll event carries.
    let width = source.clientWidth;
    let height = source.clientHeight;
    const listener = () => {
      if (source.clientWidth === width && source.clientHeight === height) return;
      width = source.clientWidth;
      height = source.clientHeight;
      callback({ width, height });
    };
    source.scrollListeners.add(listener);
    return () => { source.scrollListeners.delete(listener); };
  };
}

function observeOffset(source: GodotScrollSource) {
  return (_instance: unknown, callback: (offset: number, isScrolling: boolean) => void): (() => void) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listener = () => {
      callback(source.scrollTop, true);
      if (timer !== undefined) clearTimeout(timer);
      // native has no `scrollend`, so `isScrolling` resets on a timer, as virtual-core does without `onscrollend`.
      timer = setTimeout(() => { timer = undefined; callback(source.scrollTop, false); }, SCROLLING_RESET_MS);
    };
    source.scrollListeners.add(listener);
    return () => {
      source.scrollListeners.delete(listener);
      if (timer !== undefined) clearTimeout(timer);
    };
  };
}

/** The four options every virtual-core adapter has to supply, bound to one scroll source. */
export function godotScrollOptions(scrollSource: GodotScrollSource): Pick<
  VirtualizerOptions<Element, Element>, 'getScrollElement' | 'observeElementRect' | 'observeElementOffset' | 'scrollToFn'
> {
  return {
    // The ONE cast: virtual-core types its scroll element as `Element | Window`, and reads only the members
    // GodotScrollSource has (see the file header). Remove it by widening the type upstream.
    getScrollElement: () => (scrollSource.handle === null ? null : (scrollSource as unknown as Element)),
    observeElementRect: observeRect(scrollSource),
    observeElementOffset: observeOffset(scrollSource),
    scrollToFn: (offset, { adjustments = 0, behavior }) => {
      scrollSource.scrollTo({ top: offset + adjustments, behavior });
    },
  };
}

export interface GodotVirtualizer {
  readonly virtualizer: Virtualizer<Element, Element>;
  readonly source: GodotScrollSource;
  /** Pass as the `ref` of the scroll container. */
  readonly containerRef: (handle: UIHandle | null) => void;
  /** Pass as the `onScroll` of the scroll container. */
  readonly onScroll: (event: UIScrollEvent) => void;
  readonly items: VirtualItem[];
  readonly totalSize: number;
  /** How often the hook re-rendered its component because virtual-core said something changed. */
  readonly renders: { count: number };
}

/**
 * The React side, the same shape as `useVirtualizerBase` in @tanstack/react-virtual 3.14.26 minus `flushSync` and
 * the direct-DOM-update branch (about 25 lines): one Virtualizer per component, `setOptions` every render, `_didMount`
 * and `_willUpdate` in layout effects, `onChange` re-renders.
 */
export function useGodotVirtualizer(options: GodotOptions): GodotVirtualizer {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const renders = useRef({ count: 0 });
  renders.current.count += 1;
  const [{ source, virtualizer }] = useState(() => {
    const scrollSource = new GodotScrollSource();
    const resolved: VirtualizerOptions<Element, Element> = {
      ...options, ...godotScrollOptions(scrollSource), onChange: () => { rerender(); },
    };
    return { source: scrollSource, virtualizer: new Virtualizer<Element, Element>(resolved) };
  });
  virtualizer.setOptions({
    ...virtualizer.options,
    ...options,
    onChange: () => { rerender(); },
  });
  useLayoutEffect(() => virtualizer._didMount(), [virtualizer]);
  useLayoutEffect(() => virtualizer._willUpdate());
  return {
    virtualizer, source, renders: renders.current,
    containerRef: source.attach,
    onScroll: source.onScroll,
    items: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}
