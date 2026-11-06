import { Children, createElement, forwardRef, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { UIAccessibilityActionEvent, UIFocusEvent, UIKeyboardEvent, UIPointerEvent, UIScrollEvent, UIWheelEvent } from './events';
import type { LayoutRect, NativeScrollState } from './native';
import { createOverlayPortal, OverlayContext, readRootSize, watchRootSize, type RootSize } from './renderer';
import type { StyleProp, UIAriaProps } from './types';

export interface UIHandle {
  readonly id: number;
  readonly testID: string | undefined;
  /** The element's root-local rectangle, from a native query, or `undefined` once it is gone. */
  getRect(): LayoutRect | undefined;
  /**
   * Where this element stands against `other` in document order, the pre-order of the whole tree with the
   * main layer first and the overlay layer after it (the order Tab follows and the snapshot's
   * `documentIndex` reports): negative if this element comes first, positive if `other` does, and 0 for
   * the same element. Use it to put the parts a compound component registered in the order they are
   * shown, after an item was inserted in the middle or a keyed list was reordered. It reads the committed
   * tree and makes no native call. Throws if either element is gone or belongs to another root.
   */
  compareDocumentOrder(other: UIHandle): number;
  /**
   * Route `pointerId`'s `pointermove`, `pointerup` and `pointercancel` (and its `click`) to this element
   * wherever the pointer is, until the pointer goes up or is cancelled, or the element is removed. Only a
   * pointer that is down can be captured; a touch is captured to its `pointerdown` target from the start.
   * Throws for a pointer that is not down or an element that is gone.
   */
  setPointerCapture(pointerId: number): void;
  /** Ends this element's capture of `pointerId`. Does nothing if it is not capturing it. */
  releasePointerCapture(pointerId: number): void;
  hasPointerCapture(pointerId: number): boolean;
  /**
   * Focus the element and give the root Godot key focus. The focus shows the ring and matches
   * `focus-visible:` if it is a keyboard focus: `focusVisible` says so, else it follows how the user last
   * gave input. Throws for an element that is gone or cannot take focus (not a `Button`, no `tabIndex`,
   * or disabled).
   */
  focus(options?: { focusVisible?: boolean }): void;
  /** Takes focus away if this element has it. */
  blur(): void;
  /**
   * Scroll a scroll container (`overflow` `scroll` or `auto`) to these offsets, as `scrollLeft` and
   * `scrollTop` are (zero or negative on a reversed axis), clamped to its range. An axis left out stays where
   * it is. Throws for an element that is gone or is not a scroll container. Instant, and it ends any flick.
   */
  scrollTo(position: { left?: number; top?: number }): void;
  /** Scroll a scroll container by these distances, clamped. Throws like `scrollTo`. */
  scrollBy(delta: { left?: number; top?: number }): void;
  /**
   * Scroll the scroll containers around this element, innermost first, by the least that shows it (all of
   * it if it fits). An element in no scroll container is fine and moves nothing.
   */
  scrollIntoView(): void;
  /** A scroll container's position, size and range, or `undefined` for an element that is not one. */
  getScrollState(): NativeScrollState | undefined;
}

export interface UIProps extends UIAriaProps {
  children?: ReactNode;
  className?: string;
  style?: StyleProp;
  testID?: string;
  disabled?: boolean;
  /** `0` makes the element focusable and tabbable, `-1` focusable but skipped by Tab. Buttons need neither. */
  tabIndex?: 0 | -1;
  /** Focus the element when it is first mounted (the first such element of a commit, in document order). */
  autoFocus?: boolean;
  /** A key press or repeat. Cancelable: `preventDefault()` keeps Tab, Enter and Space from acting. */
  onKeyDown?: (event: UIKeyboardEvent) => void;
  onKeyDownCapture?: (event: UIKeyboardEvent) => void;
  onKeyUp?: (event: UIKeyboardEvent) => void;
  onKeyUpCapture?: (event: UIKeyboardEvent) => void;
  onClick?: (event: UIPointerEvent) => void;
  onClickCapture?: (event: UIPointerEvent) => void;
  onPointerDown?: (event: UIPointerEvent) => void;
  onPointerDownCapture?: (event: UIPointerEvent) => void;
  onPointerUp?: (event: UIPointerEvent) => void;
  onPointerUpCapture?: (event: UIPointerEvent) => void;
  onPointerMove?: (event: UIPointerEvent) => void;
  onPointerMoveCapture?: (event: UIPointerEvent) => void;
  /** The OS or the root ended the pointer's contact: no `pointerup` and no `click` follow. */
  onPointerCancel?: (event: UIPointerEvent) => void;
  onPointerCancelCapture?: (event: UIPointerEvent) => void;
  /** The second `click` of a sequence; `detail` is 2. */
  onDoubleClick?: (event: UIPointerEvent) => void;
  /** A `click` of a button other than the primary one (`button` 1 middle, 2 secondary, 3 back, 4 forward). */
  onAuxClick?: (event: UIPointerEvent) => void;
  /** The secondary button was pressed. */
  onContextMenu?: (event: UIPointerEvent) => void;
  /**
   * A wheel tick or trackpad pan. Cancelable: `preventDefault()` keeps it from the game and from
   * native scrolling.
   */
  onWheel?: (event: UIWheelEvent) => void;
  onWheelCapture?: (event: UIWheelEvent) => void;
  /**
   * A scroll container moved. Does not bubble and cannot be cancelled; native coalesces the events of a
   * container, so the handler sees where it is now, not every step.
   */
  onScroll?: (event: UIScrollEvent) => void;
  /** Does not bubble: runs for each element the pointer enters, outermost first. */
  onPointerEnter?: (event: UIPointerEvent) => void;
  /** Does not bubble: runs for each element the pointer leaves, deepest first. */
  onPointerLeave?: (event: UIPointerEvent) => void;
  onFocus?: (event: UIFocusEvent) => void;
  onBlur?: (event: UIFocusEvent) => void;
  /**
   * A screen reader or other assistive technology acted on this element's accessibility node: `increment`,
   * `decrement` and `setValue` for `role="slider"`. Its clicks and focus changes arrive as `onClick`,
   * `onFocus` and `onBlur`. Bubbles, and cannot be prevented.
   */
  onAccessibilityAction?: (event: UIAccessibilityActionEvent) => void;
}

/** A flex-column element by default; Taffy owns its complete layout. */
export const View = forwardRef<UIHandle, UIProps>((props, ref) =>
  createElement('view', { ...props, ref }));
View.displayName = 'View';

/**
 * Native Godot-shaped text. Its children must be strings or numbers; React Native's rule is that
 * raw strings only appear inside `<Text>`. Text color, size and alignment inherit from the parent.
 */
export const Text = forwardRef<UIHandle, UIProps>((props, ref) =>
  createElement('text', { ...props, ref }));
Text.displayName = 'Text';

/**
 * A button's label is its own `Text` child: JSX interpolation produces separate string and number
 * children, and a run of them is one shaped text run, rather than separate flex children for
 * "Add " and 1. Elements between the runs pass through.
 */
function withLabels(children: ReactNode): ReactNode[] {
  const labelled: ReactNode[] = [];
  let run: string[] = [];
  const endRun = () => {
    if (run.length === 0) return;
    labelled.push(createElement(Text, { key: `label-${labelled.length}` }, run.join('')));
    run = [];
  };
  for (const child of Children.toArray(children)) {
    if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
      run.push(String(child));
    } else {
      endRun();
      labelled.push(child);
    }
  }
  endRun();
  return labelled;
}

/** Native hit testing and keyboard activation; event closures stay in JavaScript. */
export const Button = forwardRef<UIHandle, UIProps>((props, ref) =>
  createElement('button', { ...props, ref }, withLabels(props.children)));
Button.displayName = 'Button';

/**
 * Render `children` into the overlay layer, which always draws above the main layer and is
 * hit-tested first: popovers, menus, dialogs and toasts. React state and context flow through it
 * as usual.
 */
export function Portal({ children }: { children?: ReactNode }): ReactNode {
  const overlay = useContext(OverlayContext);
  if (overlay === null) throw new Error('<Portal> must be rendered inside a root created by createRoot');
  return createOverlayPortal(children, overlay);
}

/**
 * The size of the root this component is rendered in, in logical pixels: what a popover needs to flip or
 * clamp to the viewport. It follows the root's `Control` size, so the component renders again when the
 * owner resizes the root (`dispatchEvents` finds the change, which owners call once per frame).
 * Breakpoints are native and need no JS; this is for placing things in JS.
 */
export function useRootSize(): RootSize {
  const overlay = useContext(OverlayContext);
  if (overlay === null) throw new Error('useRootSize() must be used inside a root created by createRoot');
  // React subscribes again whenever the subscribe function changes, so these are stable for the root.
  const subscribe = useCallback((listener: () => void) => watchRootSize(overlay, listener), [overlay]);
  const read = useCallback(() => readRootSize(overlay), [overlay]);
  return useSyncExternalStore(subscribe, read);
}
