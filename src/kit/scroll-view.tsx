import { forwardRef, type ForwardedRef, type ReactNode } from 'react';
import { View, type UIHandle, type UIProps } from '../components';
import type { StyleProp, UIAriaProps } from '../types';
import { joinClassNames, useStyle, type PartProps } from './parts';

/** The scroll container: it clips and scrolls its content on one axis, and its size comes from the caller. */
const VERTICAL_CLASS = 'flex-col overflow-y-auto';
const HORIZONTAL_CLASS = 'flex-row overflow-x-auto';
/**
 * The content never shrinks to the container (a flex item with `flex-shrink: 1` would, and there would
 * be nothing to scroll), and grows to fill it when it is shorter, so content that centres or spaces
 * itself does so in the visible area (React Native's content container).
 */
const CONTENT_VERTICAL_CLASS = 'flex-col shrink-0 grow';
const CONTENT_HORIZONTAL_CLASS = 'flex-row shrink-0 grow';

/** The `aria-*` props a scroll view passes on. */
type ScrollViewAriaProps = Omit<UIAriaProps, 'role'>;

/**
 * The event props a scroll view passes to the scroll container. `onScroll` does not bubble and native
 * coalesces its events, so the handler sees where the container is, not every step. `onWheel` and
 * `onWheelCapture` can `preventDefault()` to keep the wheel from scrolling it.
 */
type ScrollViewEventProps = Pick<UIProps, 'onScroll' | 'onWheel' | 'onWheelCapture' | 'onKeyDown' | 'onKeyDownCapture' | 'onClick'>;

export interface ScrollViewProps extends PartProps, ScrollViewAriaProps, ScrollViewEventProps {
  children?: ReactNode;
  /** Scroll sideways instead of down (React Native's `horizontal`). */
  horizontal?: boolean;
  /**
   * Make the view a tab stop, so keyboard users can focus it and scroll it with the arrow, Page, Home, End and
   * Space keys. On by default; a scroll view whose content has focusable parts of its own may turn it off, as
   * those keys scroll it from there too. Native scrolls the focused element's nearest scroll container.
   */
  focusable?: boolean;
  testID?: string;
  /** Classes and style of the element that holds the children (the one that is as tall as the content). */
  contentClassName?: string;
  contentStyle?: StyleProp;
}

/**
 * A scroll container. Give it a size (`h-64`, `flex-1`, `max-h-[300px]`): it scrolls what does not fit.
 * Wheel, trackpad, touch, keyboard and its overlay scrollbar all scroll it, and a scroll it cannot take chains
 * to the container behind it unless its `className` has `overscroll-contain`. Style the scrollbar with
 * `scrollbar-none` or `scrollbar-[#hex]`. `ref` is the handle of the scroll container, which has
 * `scrollTo`, `scrollBy`, `scrollIntoView` and `getScrollState`.
 *
 * Put a `Slider` or anything else that wants a finger's movement inside with `touch-none`
 * (`Slider` does), and keep `overflow-hidden`-style clipping off the content you want to scroll.
 */
export const ScrollView = forwardRef<UIHandle, ScrollViewProps>(function ScrollView(
  props, ref: ForwardedRef<UIHandle>,
) {
  const {
    children, horizontal = false, focusable = true, testID, className, style, contentClassName, contentStyle,
    ...passedOn
  } = props;
  const outerStyle = useStyle(undefined, style);
  const innerStyle = useStyle(undefined, contentStyle);
  return (
    <View
      ref={ref}
      testID={testID}
      tabIndex={focusable ? 0 : undefined}
      className={joinClassNames(horizontal ? HORIZONTAL_CLASS : VERTICAL_CLASS, className)}
      style={outerStyle}
      {...passedOn}
    >
      <View
        className={joinClassNames(horizontal ? CONTENT_HORIZONTAL_CLASS : CONTENT_VERTICAL_CLASS, contentClassName)}
        style={innerStyle}
      >
        {children}
      </View>
    </View>
  );
});
ScrollView.displayName = 'ScrollView';
