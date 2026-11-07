// A thin `react-native` for @react-native/virtualized-lists, backed by godot-react-ui. Only what VirtualizedList imports:
// View, ScrollView (unused when renderScrollComponent is given, but imported), StyleSheet, Platform, I18nManager,
// RefreshControl, findNodeHandle, and `react-native/react-private-interface`'s ReactNativeFeatureFlags.
//
// The scroll component (GodotRnScroll) is the real work: it adapts our scroll container to RN's contract.
//   RN onScroll event  <- our onScroll (scrollTop, clientHeight, scrollHeight)
//   RN onLayout        <- getScrollState() once after mount (there is no layout event; see the report)
//   RN onContentSizeChange <- scrollHeight, when a scroll event or a re-read shows it changed
//   RN scrollTo({y})   -> handle.scrollTo({ top })
import {
  createElement as h, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type ForwardedRef, type ReactNode,
} from 'react';
import { View as GodotView } from '../../../../src';
import { ScrollView as GodotScrollView } from '../../../../src/kit';
import type { UIHandle, UIScrollEvent } from '../../../../src';

type RnStyle = Record<string, unknown> | ReadonlyArray<RnStyle | undefined | null | false> | undefined | null | false;

function flatten(style: RnStyle): Record<string, unknown> {
  if (style === undefined || style === null || style === false) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map((entry) => flatten(entry as RnStyle)));
  return style as Record<string, unknown>;
}

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten,
  compose: (a: RnStyle, b: RnStyle): RnStyle => [a, b],
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
};
export const Platform = { OS: 'godot' as const, select: <T,>(spec: { default?: T }): T | undefined => spec.default };
export const I18nManager = { isRTL: false, doLeftAndRightSwapInRTL: false };
export const RefreshControl = (): null => null;
export const findNodeHandle = (): null => null;

interface ViewProps { style?: RnStyle; children?: ReactNode; onLayout?: unknown; testID?: string }
/** RN `View`: flatten the style, drop onLayout (we have no layout event; cells use getItemLayout instead). */
export const View = forwardRef<UIHandle, ViewProps>(function View(props, ref) {
  const { style, children, testID } = props;
  return h(GodotView, { ref, style: flatten(style) as never, testID }, children);
});
export const ScrollView = View;

export interface RnScrollEvent {
  nativeEvent: {
    contentOffset: { x: number; y: number };
    contentSize: { width: number; height: number };
    layoutMeasurement: { width: number; height: number };
  };
}
interface ScrollProps {
  children?: ReactNode;
  style?: RnStyle;
  contentContainerStyle?: RnStyle;
  testID?: string;
  onScroll?: (event: RnScrollEvent) => void;
  onLayout?: (event: { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } }) => void;
  onContentSizeChange?: (width: number, height: number) => void;
}
export interface RnScrollHandle {
  scrollTo(options: { x?: number; y?: number; animated?: boolean }): void;
  scrollToEnd(): void;
  getScrollRef(): RnScrollHandle;
  getNativeScrollRef(): RnScrollHandle;
  getScrollResponder(): RnScrollHandle;
  getScrollableNode(): number;
  flashScrollIndicators(): void;
}

export const GodotRnScroll = forwardRef<RnScrollHandle, ScrollProps>(function GodotRnScroll(props, ref: ForwardedRef<RnScrollHandle>) {
  const { children, style, contentContainerStyle, testID, onScroll, onLayout, onContentSizeChange } = props;
  const handle = useRef<UIHandle | null>(null);
  const lastContent = useRef({ width: -1, height: -1 });
  const reportContent = useCallback((width: number, height: number) => {
    if (lastContent.current.width === width && lastContent.current.height === height) return;
    lastContent.current = { width, height };
    onContentSizeChange?.(width, height);
  }, [onContentSizeChange]);
  const api: RnScrollHandle = {
    scrollTo(options) { handle.current?.scrollTo({ left: options.x, top: options.y }); },
    scrollToEnd() { const state = handle.current?.getScrollState(); if (state) handle.current?.scrollTo({ top: state.maxScrollTop }); },
    getScrollRef() { return api; }, getNativeScrollRef() { return api; }, getScrollResponder() { return api; },
    getScrollableNode() { return handle.current?.id ?? -1; }, flashScrollIndicators() {},
  };
  useImperativeHandle(ref, () => api);
  // The two events RN's ScrollView fires on its own, synthesised from one read after the first commit.
  useEffect(() => {
    const state = handle.current?.getScrollState();
    if (state === undefined) return;
    onLayout?.({ nativeEvent: { layout: { x: 0, y: 0, width: state.clientWidth, height: state.clientHeight } } });
    reportContent(state.scrollWidth, state.scrollHeight);
  });
  const handleScroll = (event: UIScrollEvent): void => {
    reportContent(event.scrollWidth, event.scrollHeight);
    onScroll?.({
      nativeEvent: {
        contentOffset: { x: event.scrollLeft, y: event.scrollTop },
        contentSize: { width: event.scrollWidth, height: event.scrollHeight },
        layoutMeasurement: { width: event.clientWidth, height: event.clientHeight },
      },
    });
  };
  return h(GodotScrollView, {
    ref: (node: UIHandle | null) => { handle.current = node; },
    testID, focusable: false, onScroll: handleScroll, style: flatten(style) as never, contentStyle: flatten(contentContainerStyle) as never,
  }, children);
});

export const ReactNativeFeatureFlags = {
  fixVirtualizeListCollapseWindowSize: (): boolean => false,
  deferFlatListFocusChangeRenderUpdate: (): boolean => false,
};
