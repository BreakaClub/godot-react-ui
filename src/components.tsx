import {
  Children, createElement, forwardRef, useCallback, useContext, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode,
} from 'react';
import type {
  UIAccessibilityActionEvent, UIBeforeInputEvent, UICompositionEvent, UIDragEndEvent, UIDragEvent, UIEventMap, UIFocusEvent,
  UIInputEvent, UIKeyboardEvent, UIPointerEvent, UIScrollEvent, UITextSelectionChangeEvent, UIWheelEvent,
} from './events';
import type { LayoutRect, NativeEventType, NativeScrollState, NativeSnapshot, TextSide } from './native';
import {
  claimRootKeys, createOverlayPortal, createPortalContainer, OverlayContext, readNodeRangeRects, readRootSize,
  readRootSnapshot, readTextSelection, scrollTagIntoView, watchRootEvent, watchRootSize,
  watchTextSelection,
  type RootSize,
} from './renderer';
import type { KeyboardType } from './props';
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
   * gave input. Throws for an element that is gone or cannot take focus (not a `Button` or `TextInput`, no `tabIndex`,
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
  /**
   * `Text` only (these three throw for any other element). Where the element's text is, in the root-local space `getRect()` uses:
   * a text under a rotation, a scale or a scroll is reported where it is drawn, at any device pixel ratio. Offsets are UTF-16 code
   * units of the text the element shows: its children joined, nested `Text` flattened, inlays left out (`text-transform` and
   * `white-space` collapsing can change that text, and the selection uses the shown one too).
   *
   * The caret at `offset`: a zero-width rectangle as tall as the line box (as a selection highlight is), at the x where a caret
   * between the characters either side of `offset` is drawn. `side` picks one of the two places an offset can have: before or
   * after an inlay at that offset, the end of a soft wrapped line or the start of the next. It defaults to `'after'`. Throws
   * `RangeError` for an offset past the end or inside a surrogate pair. `undefined` once the element is gone.
   */
  getCaretRect(offset: number, side?: TextSide): LayoutRect | undefined;
  /**
   * `Text` only. The caret position nearest to a root-local point, clamped into the text (above the first line is the first, past
   * the end of a line is its end). Inside an inlay it is the nearer side. `undefined` once the element is gone.
   */
  getOffsetAtPoint(x: number, y: number): UITextPosition | undefined;
  /**
   * `Text` only. The rectangles `start..end` covers, one or more per line, the boxes a selection highlight is made of (the line's
   * height, the glyphs' width). An inlay inside the range is covered, one at an end is not. Empty for an empty range. Throws
   * `RangeError` for a range past the end or with an end inside a surrogate pair. `undefined` once the element is gone.
   */
  getRangeRects(start: number, end: number): LayoutRect[] | undefined;
}

/**
 * A caret position in a `Text`: an offset into the text it shows (UTF-16 code units, so `text.slice(0, offset)` is what precedes
 * it; generated text, an inlay, is not counted) and the side of what sits there it is on. `side` tells apart the two places one
 * offset has: either side of an inlay, and the end of a soft wrapped line (`'before'`) from the start of the next (`'after'`).
 * It is `'after'` everywhere else.
 */
export interface UITextPosition {
  readonly offset: number;
  readonly side: TextSide;
}

/** One end of the text selection: a `Text` element and an offset into its text. */
export interface UISelectionPoint {
  readonly node: UIHandle;
  /** UTF-16 code units from the start of the element's text, so `text.slice(0, offset)` is what precedes it. */
  readonly offset: number;
}

/**
 * The document's text selection (`userSelect: text`): where it started and where it ends, which may be before the
 * start when it was dragged backwards. `text` is what copying it would put on the clipboard: the text of each
 * selected element, joined by newlines; elements with `userSelect: none` between the ends contribute nothing.
 */
export interface UISelection {
  readonly anchor: UISelectionPoint;
  readonly focus: UISelectionPoint;
  /** A click: the ends are the same place. */
  readonly isCollapsed: boolean;
  readonly text: string;
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
  /**
   * The element can be dragged (HTML drag and drop inside this root): a primary press or a touch
   * on it, or on something inside it that is not `draggable` itself, starts a drag once a mouse moves past the
   * viewport's drag threshold, or a touch is held for half a second without moving. Starting a drag cancels the
   * pointer (`pointercancel`, no `click`); a `pointerdown` that was prevented or captured starts none.
   */
  draggable?: boolean;
  /** What follows the pointer while the element is dragged: a translucent copy of it (`native`, the default), or nothing. */
  dragPreview?: 'native' | 'none';
  /**
   * The drag is about to start; the handler fills `event.dataTransfer` (`setData`, `effectAllowed`).
   * Cancelable: `preventDefault()` stops the drag.
   */
  onDragStart?: (event: UIDragEvent<'dragstart'>) => void;
  /** The dragged element, on every pointer move and scroll while it is dragged. */
  onDrag?: (event: UIDragEvent<'drag'>) => void;
  /** The last event of a drag, at the dragged element, whatever happened to the drop. */
  onDragEnd?: (event: UIDragEndEvent) => void;
  /** A dragged pointer entered this element (bubbles, as in the DOM: `relatedTarget` is where it came from). */
  onDragEnter?: (event: UIDragEvent<'dragenter'>) => void;
  onDragLeave?: (event: UIDragEvent<'dragleave'>) => void;
  /**
   * A dragged pointer is over this element, on every move and scroll. Cancelable: `preventDefault()` makes this
   * a drop target; the drop then has the `dropEffect` the handler left on `event.dataTransfer` if the drag's
   * `effectAllowed` permits it (a drop with the effect `none` is refused). The cursor shows it.
   */
  onDragOver?: (event: UIDragEvent<'dragover'>) => void;
  /** The pointer was released over a target that accepted. Cancelable: `preventDefault()` reports it was handled. */
  onDrop?: (event: UIDragEvent<'drop'>) => void;
  /**
   * The key chords this element handles itself, while it or something inside it has focus: `['Mod+S', 'Mod+Shift+P', 'F2']`. On the Web a
   * chord that nothing claims (Cmd+R, Cmd+F, Cmd+T, F5, F12) goes to the browser and never reaches `onKeyDown`, because whether a key is used
   * is not known until the browser has finished with it. Typing, caret keys, Tab, Escape and Enter reach a focused element's `onKeyDown`
   * without a claim; a chord with Cmd (Ctrl elsewhere), a function key or Ctrl+Tab does only if claimed here, on an ancestor, or by
   * `UIRoot.claimKeys`. `Mod` is Cmd on macOS and Ctrl elsewhere; the key is a character or a name (`Enter`, `ArrowLeft`, `F5`); `+` is
   * `Plus`. A text input claims its own editing chords without this. Native platforms keep every key and ignore it.
   */
  keyClaims?: readonly string[];
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
  /**
   * A text input below this element is about to make an edit. Cancelable: `preventDefault()` rejects it, and native
   * waits for the answer. Bubbles.
   */
  onBeforeInput?: (event: UIBeforeInputEvent) => void;
  /** A text input below this element changed its text because of an edit. Bubbles. */
  onInput?: (event: UIInputEvent) => void;
  /** A text input's selection moved. Does not bubble: only the input itself hears it. */
  onSelectionChange?: (event: UITextSelectionChangeEvent) => void;
  /** An IME composition began, changed or ended in a text input below this element. Bubbles. */
  onCompositionStart?: (event: UICompositionEvent) => void;
  onCompositionUpdate?: (event: UICompositionEvent) => void;
  onCompositionEnd?: (event: UICompositionEvent) => void;
}

/**
 * What a `TextInput` element carries beyond {@link UIProps}: the settings native reads. The
 * `TextInput` component builds these from its own props; only it renders a `textinput` element.
 */
export interface TextInputHostProps {
  /** The text the input starts with. Later changes are ignored: native owns the text (`setTextAndSelection` replaces it). */
  defaultValue?: string;
  placeholder?: string;
  /** A text area: line breaks, wrapping, vertical movement and scrolling. Fixed when the input is created. */
  multiline?: boolean;
  /** Focusable and selectable, but its text cannot be edited. */
  readOnly?: boolean;
  /** A password: bullets are drawn, and copy, cut and word jumps reveal nothing. */
  secure?: boolean;
  /** Select all of the text when the input gains focus. */
  selectTextOnFocus?: boolean;
  /** The height of a multi-line input in lines. */
  rows?: number;
  /** The most UTF-16 code units the user can type in. Text already longer is kept. */
  maxLength?: number;
  /** The on-screen keyboard to ask a touch device for. */
  keyboardType?: KeyboardType;
}

/** What only a `Text` nested in another has. */
export interface TextSpanHostProps {
  /**
   * Generated text: shown in the paragraph, measured and wrapped like the text around it, but not part of the text. The
   * offsets of the selection, of `getCaretRect` and of everything else skip it; selecting across it and copying leave it
   * out; it is not in the accessible name. A caret can sit on either side of it (`UITextPosition.side`). It takes the style of
   * the `Text` it is in, with its own `className` and `style` on top. It holds plain text.
   */
  inlay?: boolean;
}

/** The props of any element the host renders. */
export type HostProps = UIProps & TextInputHostProps & TextSpanHostProps;

/** The handle of a `TextInput`: an element handle that can also read and move the selection. */
export interface TextInputHandle extends UIHandle {
  /** All of the text, as native holds it now. Throws once the element is gone. */
  readonly value: string;
  /** UTF-16 offsets into `value`, ordered. */
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly selectionDirection: 'forward' | 'backward';
  /** Select all of the text. Does not touch the undo history. */
  select(): void;
  /**
   * Select `start` to `end` (UTF-16 offsets into `value`, `start <= end`). `'backward'` puts the caret at `start`.
   * Does not touch the undo history. Throws for an offset past the end or inside a surrogate pair.
   */
  setSelectionRange(start: number, end: number, direction?: 'forward' | 'backward' | 'none'): void;
  /**
   * React Native's `setTextAndSelection`: replace the text, and the selection (UTF-16 offsets into `value`, the
   * caret at the end when both are left out), if `eventCount` is the number of `input` events the input has made.
   * Returns `false`, changing nothing, when it is not: the user typed since JS read the count, and the next `input`
   * event lets the caller reconcile again. Applying clears the undo history and raises no `input` event.
   */
  setTextAndSelection(eventCount: number, value: string, start?: number, end?: number): boolean;
}

/** A flex-column element by default; Taffy owns its complete layout. */
export const View = forwardRef<UIHandle, UIProps>((props, ref) =>
  createElement('view', { ...props, ref }));
View.displayName = 'View';

/**
 * The props of a `Text`. A `Text` nested in another is a run of its parent's text, not an element: it takes `className`,
 * `style`, `inlay` and children, and its style may set colour, background colour, font family, weight and style, and the text
 * decoration longhands (`SPAN_STYLE_KEYS` in `src/rich-text.ts`).
 */
export interface TextProps extends UIProps, TextSpanHostProps {}

/**
 * Native Godot-shaped text. Its children are strings, numbers and other `Text`, which make one paragraph as in React Native:
 * `<Text>const <Text className="text-purple-400">x</Text> = 1</Text>` is one element with a styled range. React Native's rule
 * is that raw strings only appear inside `<Text>`. Text color, size and alignment inherit from the parent.
 */
export const Text = forwardRef<UIHandle, TextProps>((props, ref) =>
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

/**
 * Native hit testing and keyboard activation; event closures stay in JavaScript.
 *
 * Like a browser's `<button>`, it centres its content: a flex column with `align-items: center`, `justify-content: center` and `text-align: center`
 * (the user agent's style, `native/user_agent.rs`), so a label sits in the middle of a button whatever size the button is given. A `className` or `style`
 * replaces each of them as it would the browser's own: `items-start`, `justify-between`, `flex-row`, `text-left`. Padding, border and background are
 * yours: the library adds none.
 */
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
  const [container] = useState(() => createPortalContainer(overlay));
  return createOverlayPortal(children, container);
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

/**
 * The document's text selection, as a hook: the component renders again when it changes (`selectionchange`). Nothing
 * selected, or the selection a commit cleared, is `undefined`. The value is the same object until the next change.
 */
export function useTextSelection(): UISelection | undefined {
  const overlay = useContext(OverlayContext);
  if (overlay === null) throw new Error('useTextSelection() must be used inside a root created by createRoot');
  const subscribe = useCallback((listener: () => void) => watchTextSelection(overlay, listener), [overlay]);
  const read = useCallback(() => readTextSelection(overlay), [overlay]);
  return useSyncExternalStore(subscribe, read);
}

/**
 * Claim key chords for the whole root while this component is mounted: `useKeyClaims(['Mod+K'])` beside a `useRootEvent('keydown', ...)` that
 * handles them. A claimed chord reaches the engine and the root's listeners wherever focus is; one nobody claims goes to the browser on the Web.
 * `UIProps.keyClaims` has the rule and the spelling. Throws for a chord that does not parse.
 */
export function useKeyClaims(chords: readonly string[]): void {
  const overlay = useContext(OverlayContext);
  if (overlay === null) throw new Error('useKeyClaims() must be used inside a root created by createRoot');
  // A list written inline is a new array every render; the claim changes only when a chord does.
  const spelling = chords.join('\n');
  useLayoutEffect(() => claimRootKeys(overlay, spelling === '' ? [] : spelling.split('\n')), [overlay, spelling]);
}

/**
 * Run `listener` for every `type` event that reaches the root while this component is mounted: any event of
 * that type no element stopped (`stopPropagation`), whichever element it was aimed at. A document-level listener,
 * for a popup that closes when something outside it happens. The latest `listener` runs; changing it does not
 * subscribe again.
 */
export function useRootEvent<K extends NativeEventType>(type: K, listener: (event: UIEventMap[K]) => void): void {
  const overlay = useContext(OverlayContext);
  if (overlay === null) throw new Error('useRootEvent() must be used inside a root created by createRoot');
  const latest = useRef(listener);
  useLayoutEffect(() => { latest.current = listener; });
  useLayoutEffect(() => watchRootEvent(overlay, type, (event) => { latest.current(event); }), [overlay, type]);
}

/**
 * Read the current snapshot of native nodes in this root.
 */
export function useRootSnapshot(): () => NativeSnapshot {
  const overlay = useContext(OverlayContext);
  if (overlay === null) throw new Error('useRootSnapshot() must be used inside a root created by createRoot');
  return useCallback(() => readRootSnapshot(overlay), [overlay]);
}

/**
 * Scroll the native element with `tag` into view.
 */
export function useScrollIntoView(): (tag: number) => void {
  const overlay = useContext(OverlayContext);
  if (overlay === null) throw new Error('useScrollIntoView() must be used inside a root created by createRoot');
  return useCallback((tag: number) => scrollTagIntoView(overlay, tag), [overlay]);
}

/**
 * The rectangles `start..end` covers for the Text element with `tag`, root-local, or `undefined`.
 */
export function useRangeRects(): (tag: number, start: number, end: number) => LayoutRect[] | undefined {
  const overlay = useContext(OverlayContext);
  if (overlay === null) throw new Error('useRangeRects() must be used inside a root created by createRoot');
  return useCallback((tag: number, start: number, end: number) => readNodeRangeRects(overlay, tag, start, end), [overlay]);
}
