import type { UIHandle, UIProps } from './components';
import type { DataTransfer, DropEffect } from './data-transfer';
import type {
  NativeAccessibilityAction, NativeAccessibilityActionEvent, NativeDragEndEvent, NativeDragEvent, NativeDragEventType,
  NativeEvent, NativeEventType, NativeFocusEvent, NativeFocusEventType, NativeKeyEvent, NativeKeyEventType,
  NativeMouseFields, NativePointerEvent, NativePointerEventType, NativePointerType, NativeScrollEvent, NativeWheelEvent,
} from './native';

/** DOM `Event.eventPhase`. */
export const EventPhase = { None: 0, Capturing: 1, AtTarget: 2, Bubbling: 3 } as const;
export type EventPhaseValue = (typeof EventPhase)[keyof typeof EventPhase];

export interface UISyntheticEvent<Type extends NativeEventType = NativeEventType> {
  readonly type: Type;
  readonly target: UIHandle;
  /** The element whose handler is running; the root while root listeners run. */
  readonly currentTarget: UIHandle;
  readonly eventPhase: EventPhaseValue;
  readonly bubbles: boolean;
  /** Only a cancelable event can be prevented; native waits for the answer before it acts. */
  readonly cancelable: boolean;
  readonly defaultPrevented: boolean;
  /** Milliseconds on the engine tick clock when native queued the event. */
  readonly timeStamp: number;
  /** Cancels native's default action for a cancelable event. A no-op otherwise, as in the DOM. */
  preventDefault(): void;
  stopPropagation(): void;
  isPropagationStopped(): boolean;
  isDefaultPrevented(): boolean;
}

/** What every event with a pointer position carries. */
export interface UIMouseFields {
  /** Root-local logical pixels, independent of device pixel ratio. */
  readonly x: number;
  readonly y: number;
  /** Canvas coordinates, which is what game code receives in `_unhandled_input`. */
  readonly viewportX: number;
  readonly viewportY: number;
  /** 1 is the mouse. 0 is synthetic keyboard activation. */
  readonly pointerId: number;
  readonly pointerType: NativePointerType;
  /** DOM `button`: 0 primary, or -1 when the event is not a button change. */
  readonly button: number;
  /** DOM `buttons` bitmask: 1 primary, 2 secondary, 4 auxiliary, 8 back, 16 forward. */
  readonly buttons: number;
  readonly detail: number;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

export interface UIPointerEvent extends UISyntheticEvent<NativePointerEventType>, UIMouseFields {
  /** Enter and leave events: the element left towards or entered from, if it still exists. */
  readonly relatedTarget: UIHandle | null;
}

/**
 * A wheel tick or trackpad pan, cancelable: preventing it keeps it from the game and from native
 * scrolling. Deltas are in wheel ticks (one per notch of a discrete wheel, scaled for smooth
 * devices), positive down and right, so DOM sign conventions carry over.
 */
export interface UIWheelEvent extends UISyntheticEvent<'wheel'>, UIMouseFields {
  readonly deltaX: number;
  readonly deltaY: number;
}

/**
 * A scroll container moved: by the wheel, a touch pan or a flick, the keyboard, a scrollbar, focus, a
 * command, or layout re-clamping it. It does not bubble and cannot be cancelled. Native coalesces them per
 * container, so a handler sees where the container is when it runs, not every step on the way. Offsets are
 * the DOM's: zero or negative on a reversed axis.
 */
export interface UIScrollEvent extends UISyntheticEvent<'scroll'> {
  readonly scrollLeft: number;
  readonly scrollTop: number;
  /** The client size plus the range the content can move. */
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  /** The container's padding box. */
  readonly clientWidth: number;
  readonly clientHeight: number;
}

export interface UIFocusEvent extends UISyntheticEvent<NativeFocusEventType> {
  /** The element focus came from (`focus`) or goes to (`blur`), if there is one and it still exists. */
  readonly relatedTarget: UIHandle | null;
  /** The focus is a keyboard focus (Tab, or `focus()` after keyboard input): the ring and `:focus-visible`. */
  readonly focusVisible: boolean;
}

/**
 * A key press, repeat or release. `keydown` is cancelable: preventing it keeps native's default action
 * (Tab moving focus, Enter and Space pressing a button) and the game from seeing the key.
 */
export interface UIKeyboardEvent extends UISyntheticEvent<NativeKeyEventType> {
  /** DOM `key`: the character typed, else the key's name (`Enter`, `ArrowLeft`, ...). */
  readonly key: string;
  /** DOM `code`: the physical key (`KeyA`, `Digit1`, `ShiftLeft`, ...). */
  readonly code: string;
  /** True for the repeats Godot sends while a key is held. */
  readonly repeat: boolean;
  readonly isComposing: boolean;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

/**
 * An assistive technology asked the element to do something no pointer or key gesture says. Sent for an
 * element with `role="slider"` (`increment`, `decrement`, `setValue`); a screen reader's click, focus and
 * blur actions arrive as the ordinary `click`, `focus` and `blur` events. Not cancelable: native has no
 * default action to keep, so the handler is the whole effect (plan 3.21).
 */
export interface UIAccessibilityActionEvent extends UISyntheticEvent<'accessibilityaction'> {
  readonly action: NativeAccessibilityAction;
  /** The number `setValue` asked for; `undefined` for `increment` and `decrement`. */
  readonly value: number | undefined;
}

/**
 * The document's text selection changed (a click, a drag, Shift+click, select all, `clearSelection()`, or the text
 * it covered changed). It is addressed to the root's listeners, does not bubble and cannot be cancelled, and carries
 * nothing: read `root.getSelection()` (or `useTextSelection()`). Native coalesces the changes of one delivery.
 */
export type UISelectionChangeEvent = UISyntheticEvent<'selectionchange'>;

/**
 * A drag-and-drop event (plan 3.19), with the HTML semantics: they all bubble; `dragstart`, `dragover` and
 * `drop` are cancelable. `dragstart` and `drag` target the dragged element, `dragend` too (or the root, if the
 * element was removed during the drag); `dragenter`, `dragover`, `dragleave` and `drop` target the element under
 * the pointer. Preventing `dragstart` stops the drag; preventing `dragover` (with a `dropEffect` the source's
 * `effectAllowed` permits) accepts a drop there; preventing `drop` reports that it was handled.
 * `dataTransfer` is a new object for each event, in the mode the event calls for (see `DataTransfer`).
 */
export interface UIDragEvent<Type extends NativeDragEventType = NativeDragEventType>
  extends UISyntheticEvent<Type>, UIMouseFields {
  readonly dataTransfer: DataTransfer;
  /** `dragenter`: the element the pointer came from; `dragleave`: the element it goes to, if there is one and it still exists. */
  readonly relatedTarget: UIHandle | null;
  /** The drag this event belongs to: the same for every event from `dragstart` to `dragend`. */
  readonly sessionId: number;
}

/**
 * The last event of a drag, at the dragged element. `x`, `y`, `viewportX` and `viewportY` are where the pointer
 * was released (or last was, for a cancelled drag), so a game can place what was dropped outside the UI.
 */
export interface UIDragEndEvent extends UIDragEvent<'dragend'> {
  /** What the drop did: `none` if it was not dropped on a target that accepted it, or was cancelled. */
  readonly dropEffect: DropEffect;
  /** The pointer was released beyond the root. False for a drag that was cancelled (Escape, the OS, the root leaving). */
  readonly endedOutsideRoot: boolean;
}

/** Kept so handler types written against the first event model still compile. */
export type UIEvent = UIPointerEvent;
export type UIAnyEvent =
  | UIPointerEvent | UIWheelEvent | UIScrollEvent | UIKeyboardEvent | UIFocusEvent | UIAccessibilityActionEvent
  | UISelectionChangeEvent
  | UIDragEvent | UIDragEndEvent;

export interface UIEventMap {
  pointerdown: UIPointerEvent;
  pointermove: UIPointerEvent;
  pointerup: UIPointerEvent;
  pointerenter: UIPointerEvent;
  pointerleave: UIPointerEvent;
  pointercancel: UIPointerEvent;
  click: UIPointerEvent;
  dblclick: UIPointerEvent;
  auxclick: UIPointerEvent;
  contextmenu: UIPointerEvent;
  wheel: UIWheelEvent;
  scroll: UIScrollEvent;
  keydown: UIKeyboardEvent;
  keyup: UIKeyboardEvent;
  focus: UIFocusEvent;
  blur: UIFocusEvent;
  accessibilityaction: UIAccessibilityActionEvent;
  selectionchange: UISelectionChangeEvent;
  dragstart: UIDragEvent<'dragstart'>;
  drag: UIDragEvent<'drag'>;
  dragenter: UIDragEvent<'dragenter'>;
  dragleave: UIDragEvent<'dragleave'>;
  dragover: UIDragEvent<'dragover'>;
  drop: UIDragEvent<'drop'>;
  dragend: UIDragEndEvent;
}

class SyntheticEvent<Type extends NativeEventType> implements UISyntheticEvent<Type> {
  readonly type: Type;
  readonly target: UIHandle;
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  readonly timeStamp: number;
  #currentTarget: UIHandle;
  #eventPhase: EventPhaseValue = EventPhase.None;
  #defaultPrevented = false;
  #propagationStopped = false;

  constructor(type: Type, target: UIHandle, bubbles: boolean, cancelable: boolean, timeStamp: number) {
    this.type = type;
    this.target = target;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
    this.timeStamp = timeStamp;
    this.#currentTarget = target;
  }

  get currentTarget(): UIHandle { return this.#currentTarget; }
  get eventPhase(): EventPhaseValue { return this.#eventPhase; }
  get defaultPrevented(): boolean { return this.#defaultPrevented; }
  preventDefault(): void { if (this.cancelable) this.#defaultPrevented = true; }
  stopPropagation(): void { this.#propagationStopped = true; }
  isPropagationStopped(): boolean { return this.#propagationStopped; }
  isDefaultPrevented(): boolean { return this.#defaultPrevented; }

  /** Dispatcher only; not part of the public event interface. */
  enter(currentTarget: UIHandle, phase: EventPhaseValue): void {
    this.#currentTarget = currentTarget;
    this.#eventPhase = phase;
  }
}

abstract class MouseEventImpl<Type extends NativeEventType> extends SyntheticEvent<Type> implements UIMouseFields {
  readonly x: number;
  readonly y: number;
  readonly viewportX: number;
  readonly viewportY: number;
  readonly pointerId: number;
  readonly pointerType: NativePointerType;
  readonly button: number;
  readonly buttons: number;
  readonly detail: number;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;

  constructor(type: Type, native: NativeMouseFields, target: UIHandle, bubbles: boolean) {
    super(type, target, bubbles, native.cancelable, native.timeStamp);
    this.x = native.x;
    this.y = native.y;
    this.viewportX = native.viewportX;
    this.viewportY = native.viewportY;
    this.pointerId = native.pointerId;
    this.pointerType = native.pointerType;
    this.button = native.button;
    this.buttons = native.buttons;
    this.detail = native.detail;
    this.shiftKey = native.shiftKey;
    this.ctrlKey = native.ctrlKey;
    this.altKey = native.altKey;
    this.metaKey = native.metaKey;
  }
}

class PointerEventImpl extends MouseEventImpl<NativePointerEventType> implements UIPointerEvent {
  readonly relatedTarget: UIHandle | null;

  constructor(native: NativePointerEvent, target: UIHandle, related: UIHandle | null, bubbles: boolean) {
    super(native.type, native, target, bubbles);
    this.relatedTarget = related;
  }
}

class WheelEventImpl extends MouseEventImpl<'wheel'> implements UIWheelEvent {
  readonly deltaX: number;
  readonly deltaY: number;

  constructor(native: NativeWheelEvent, target: UIHandle, bubbles: boolean) {
    super(native.type, native, target, bubbles);
    this.deltaX = native.deltaX;
    this.deltaY = native.deltaY;
  }
}

class DragEventImpl<Type extends NativeDragEventType> extends MouseEventImpl<Type> implements UIDragEvent<Type> {
  readonly dataTransfer: DataTransfer;
  readonly relatedTarget: UIHandle | null;
  readonly sessionId: number;

  constructor(native: NativeDragEvent | NativeDragEndEvent, type: Type, target: UIHandle, related: UIHandle | null, bubbles: boolean, transfer: DataTransfer) {
    super(type, native, target, bubbles);
    this.dataTransfer = transfer;
    this.relatedTarget = related;
    this.sessionId = native.sessionId;
  }
}

class DragEndEventImpl extends DragEventImpl<'dragend'> implements UIDragEndEvent {
  readonly dropEffect: DropEffect;
  readonly endedOutsideRoot: boolean;

  constructor(native: NativeDragEndEvent, target: UIHandle, related: UIHandle | null, bubbles: boolean, transfer: DataTransfer) {
    super(native, native.type, target, related, bubbles, transfer);
    this.dropEffect = native.dropEffect;
    this.endedOutsideRoot = native.endedOutsideRoot;
  }
}

class ScrollEventImpl extends SyntheticEvent<'scroll'> implements UIScrollEvent {
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly clientWidth: number;
  readonly clientHeight: number;

  constructor(native: NativeScrollEvent, target: UIHandle, bubbles: boolean) {
    super(native.type, target, bubbles, native.cancelable, native.timeStamp);
    this.scrollLeft = native.scrollLeft;
    this.scrollTop = native.scrollTop;
    this.scrollWidth = native.scrollWidth;
    this.scrollHeight = native.scrollHeight;
    this.clientWidth = native.clientWidth;
    this.clientHeight = native.clientHeight;
  }
}

class FocusEventImpl extends SyntheticEvent<NativeFocusEventType> implements UIFocusEvent {
  readonly relatedTarget: UIHandle | null;
  readonly focusVisible: boolean;

  constructor(native: NativeFocusEvent, target: UIHandle, related: UIHandle | null, bubbles: boolean) {
    super(native.type, target, bubbles, native.cancelable, native.timeStamp);
    this.relatedTarget = related;
    this.focusVisible = native.focusVisible;
  }
}

class KeyboardEventImpl extends SyntheticEvent<NativeKeyEventType> implements UIKeyboardEvent {
  readonly key: string;
  readonly code: string;
  readonly repeat: boolean;
  readonly isComposing: boolean;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;

  constructor(native: NativeKeyEvent, target: UIHandle, bubbles: boolean) {
    super(native.type, target, bubbles, native.cancelable, native.timeStamp);
    this.key = native.key;
    this.code = native.code;
    this.repeat = native.repeat;
    this.isComposing = native.isComposing;
    this.shiftKey = native.shiftKey;
    this.ctrlKey = native.ctrlKey;
    this.altKey = native.altKey;
    this.metaKey = native.metaKey;
  }
}

class AccessibilityActionEventImpl extends SyntheticEvent<'accessibilityaction'> implements UIAccessibilityActionEvent {
  readonly action: NativeAccessibilityAction;
  readonly value: number | undefined;

  constructor(native: NativeAccessibilityActionEvent, target: UIHandle, bubbles: boolean) {
    super(native.type, target, bubbles, native.cancelable, native.timeStamp);
    this.action = native.action;
    this.value = native.value ?? undefined;
  }
}

type Handler<E> = ((event: E) => void) | undefined;

/** `focus` and `blur` are the only events without pointer data. */
function isFocusEvent(event: UIAnyEvent): event is UIFocusEvent {
  return event.type === 'focus' || event.type === 'blur';
}

function isWheelEvent(event: UIAnyEvent): event is UIWheelEvent {
  return event.type === 'wheel';
}

function isKeyboardEvent(event: UIAnyEvent): event is UIKeyboardEvent {
  return event.type === 'keydown' || event.type === 'keyup';
}

function isAccessibilityActionEvent(event: UIAnyEvent): event is UIAccessibilityActionEvent {
  return event.type === 'accessibilityaction';
}

function isScrollEvent(event: UIAnyEvent): event is UIScrollEvent {
  return event.type === 'scroll';
}

function isSelectionChangeEvent(event: UIAnyEvent): event is UISelectionChangeEvent {
  return event.type === 'selectionchange';
}

const DRAG_EVENT_TYPES: readonly NativeEventType[] = ['dragstart', 'drag', 'dragenter', 'dragleave', 'dragover', 'drop', 'dragend'];

function isDragEvent(event: UIAnyEvent): event is UIDragEvent | UIDragEndEvent {
  return DRAG_EVENT_TYPES.includes(event.type);
}

/** Whether a native event is one of the drag-and-drop family. */
export function isNativeDragEvent(native: NativeEvent): native is NativeDragEvent | NativeDragEndEvent {
  return DRAG_EVENT_TYPES.includes(native.type);
}

/** One entry per native event type: whether it bubbles and which prop receives each phase. */
interface EventSpec {
  readonly bubbles: boolean;
  /** Call the handler `props` registers for this phase, if any. */
  invoke(props: UIProps, capture: boolean, event: UIAnyEvent): void;
}

function pointerSpec(
  bubbles: boolean,
  bubble: (props: UIProps) => Handler<UIPointerEvent>,
  capture?: (props: UIProps) => Handler<UIPointerEvent>,
): EventSpec {
  return {
    bubbles,
    invoke(props, isCapture, event) {
      const handler = isCapture ? capture?.(props) : bubble(props);
      if (handler === undefined) return;
      if (
        isFocusEvent(event) || isWheelEvent(event) || isKeyboardEvent(event) || isScrollEvent(event)
        || isAccessibilityActionEvent(event) || isSelectionChangeEvent(event) || isDragEvent(event)
      ) {
        throw new Error(`UI internal error: ${event.type} reached a pointer event handler`);
      }
      handler(event);
    },
  };
}

function wheelSpec(
  bubble: (props: UIProps) => Handler<UIWheelEvent>,
  capture: (props: UIProps) => Handler<UIWheelEvent>,
): EventSpec {
  return {
    bubbles: true,
    invoke(props, isCapture, event) {
      const handler = isCapture ? capture(props) : bubble(props);
      if (handler === undefined) return;
      if (!isWheelEvent(event)) {
        throw new Error(`UI internal error: ${event.type} reached a wheel event handler`);
      }
      handler(event);
    },
  };
}

/** `scroll` does not bubble and has no capture handler. */
function scrollSpec(bubble: (props: UIProps) => Handler<UIScrollEvent>): EventSpec {
  return {
    bubbles: false,
    invoke(props, isCapture, event) {
      if (isCapture) return;
      const handler = bubble(props);
      if (handler === undefined) return;
      if (!isScrollEvent(event)) {
        throw new Error(`UI internal error: ${event.type} reached a scroll event handler`);
      }
      handler(event);
    },
  };
}

function keySpec(
  bubble: (props: UIProps) => Handler<UIKeyboardEvent>,
  capture: (props: UIProps) => Handler<UIKeyboardEvent>,
): EventSpec {
  return {
    bubbles: true,
    invoke(props, isCapture, event) {
      const handler = isCapture ? capture(props) : bubble(props);
      if (handler === undefined) return;
      if (!isKeyboardEvent(event)) {
        throw new Error(`UI internal error: ${event.type} reached a keyboard event handler`);
      }
      handler(event);
    },
  };
}

function focusSpec(bubble: (props: UIProps) => Handler<UIFocusEvent>): EventSpec {
  return {
    bubbles: true,
    invoke(props, isCapture, event) {
      if (isCapture) return;
      const handler = bubble(props);
      if (handler === undefined) return;
      if (!isFocusEvent(event)) {
        throw new Error(`UI internal error: ${event.type} reached a focus event handler`);
      }
      handler(event);
    },
  };
}

function accessibilityActionSpec(bubble: (props: UIProps) => Handler<UIAccessibilityActionEvent>): EventSpec {
  return {
    bubbles: true,
    invoke(props, isCapture, event) {
      if (isCapture) return;
      const handler = bubble(props);
      if (handler === undefined) return;
      if (!isAccessibilityActionEvent(event)) {
        throw new Error(`UI internal error: ${event.type} reached an accessibility action handler`);
      }
      handler(event);
    },
  };
}

/**
 * `selectionchange` is the document's: addressed to the root's listeners, so no element has a handler for it. (A
 * `TextInput`'s own selection, Phase I7, is its element's event and gets a prop.)
 */
const SELECTION_CHANGE_SPEC: EventSpec = { bubbles: false, invoke() {} };

/** Drag events bubble and have no capture handlers. */
function dragSpec<K extends NativeDragEventType>(type: K, bubble: (props: UIProps) => Handler<UIEventMap[K]>): EventSpec {
  return {
    bubbles: true,
    invoke(props, isCapture, event) {
      if (isCapture) return;
      const handler = bubble(props);
      if (handler === undefined) return;
      if (!isEventType(event, type)) {
        throw new Error(`UI internal error: ${event.type} reached a ${type} handler`);
      }
      handler(event);
    },
  };
}

/** The only place that knows which prop names which event. Completeness is checked by `Record`. */
const EVENT_TABLE: Record<NativeEventType, EventSpec> = {
  pointerdown: pointerSpec(true, (p) => p.onPointerDown, (p) => p.onPointerDownCapture),
  pointermove: pointerSpec(true, (p) => p.onPointerMove, (p) => p.onPointerMoveCapture),
  pointerup: pointerSpec(true, (p) => p.onPointerUp, (p) => p.onPointerUpCapture),
  pointerenter: pointerSpec(false, (p) => p.onPointerEnter),
  pointerleave: pointerSpec(false, (p) => p.onPointerLeave),
  pointercancel: pointerSpec(true, (p) => p.onPointerCancel, (p) => p.onPointerCancelCapture),
  click: pointerSpec(true, (p) => p.onClick, (p) => p.onClickCapture),
  dblclick: pointerSpec(true, (p) => p.onDoubleClick),
  auxclick: pointerSpec(true, (p) => p.onAuxClick),
  contextmenu: pointerSpec(true, (p) => p.onContextMenu),
  wheel: wheelSpec((p) => p.onWheel, (p) => p.onWheelCapture),
  scroll: scrollSpec((p) => p.onScroll),
  keydown: keySpec((p) => p.onKeyDown, (p) => p.onKeyDownCapture),
  keyup: keySpec((p) => p.onKeyUp, (p) => p.onKeyUpCapture),
  focus: focusSpec((p) => p.onFocus),
  blur: focusSpec((p) => p.onBlur),
  accessibilityaction: accessibilityActionSpec((p) => p.onAccessibilityAction),
  selectionchange: SELECTION_CHANGE_SPEC,
  dragstart: dragSpec('dragstart', (p) => p.onDragStart),
  drag: dragSpec('drag', (p) => p.onDrag),
  dragenter: dragSpec('dragenter', (p) => p.onDragEnter),
  dragleave: dragSpec('dragleave', (p) => p.onDragLeave),
  dragover: dragSpec('dragover', (p) => p.onDragOver),
  drop: dragSpec('drop', (p) => p.onDrop),
  dragend: dragSpec('dragend', (p) => p.onDragEnd),
};

/** `event` is a `type` event: this is the runtime check behind the typed listener registration. */
function isEventType<K extends NativeEventType>(event: UIAnyEvent, type: K): event is UIEventMap[K] {
  return event.type === type;
}

/** Listeners on the root itself: they run after the bubble phase and see events addressed to the root. */
export class RootListeners {
  private readonly byType = new Map<NativeEventType, Set<(event: UIAnyEvent) => void>>();

  add<K extends NativeEventType>(type: K, listener: (event: UIEventMap[K]) => void): () => void {
    const wrapped = (event: UIAnyEvent): void => {
      if (isEventType(event, type)) listener(event);
    };
    const listeners = this.byType.get(type) ?? new Set<(event: UIAnyEvent) => void>();
    listeners.add(wrapped);
    this.byType.set(type, listeners);
    return () => { listeners.delete(wrapped); };
  }

  emit(event: UIAnyEvent): void {
    // A listener may remove itself while running.
    for (const listener of [...(this.byType.get(event.type) ?? [])]) listener(event);
  }
}

/** What dispatch needs to know about one element on the path from the target to the root. */
export interface PathNode {
  readonly handle: UIHandle;
  readonly props: UIProps;
}

export interface RootTarget {
  readonly handle: UIHandle;
  readonly listeners: RootListeners;
}

export interface DispatchResult {
  readonly defaultPrevented: boolean;
  /** A handler threw. Dispatch of this event stopped there; the caller reports it. */
  readonly failure: Error | undefined;
}

export const NOT_DISPATCHED: DispatchResult = Object.freeze({ defaultPrevented: false, failure: undefined });

function createEvent(
  native: NativeEvent, target: UIHandle, related: UIHandle | null, bubbles: boolean, transfer: DataTransfer | undefined,
): PointerEventImpl | WheelEventImpl | ScrollEventImpl | KeyboardEventImpl | FocusEventImpl | AccessibilityActionEventImpl
  | DragEventImpl<NativeDragEventType> | SyntheticEvent<'selectionchange'> {
  switch (native.type) {
    case 'pointerdown': case 'pointermove': case 'pointerup':
    case 'pointerenter': case 'pointerleave': case 'pointercancel': case 'click': case 'dblclick':
    case 'auxclick': case 'contextmenu':
      return new PointerEventImpl(native, target, related, bubbles);
    case 'wheel':
      return new WheelEventImpl(native, target, bubbles);
    case 'scroll':
      return new ScrollEventImpl(native, target, bubbles);
    case 'keydown': case 'keyup':
      return new KeyboardEventImpl(native, target, bubbles);
    case 'focus': case 'blur':
      return new FocusEventImpl(native, target, related, bubbles);
    case 'accessibilityaction':
      return new AccessibilityActionEventImpl(native, target, bubbles);
    case 'selectionchange':
      return new SyntheticEvent(native.type, target, bubbles, native.cancelable, native.timeStamp);
    case 'dragstart': case 'drag': case 'dragenter': case 'dragleave': case 'dragover': case 'drop':
      if (transfer === undefined) throw new Error(`UI internal error: a ${native.type} event needs a DataTransfer`);
      return new DragEventImpl(native, native.type, target, related, bubbles, transfer);
    case 'dragend':
      if (transfer === undefined) throw new Error('UI internal error: a dragend event needs a DataTransfer');
      return new DragEndEventImpl(native, target, related, bubbles, transfer);
  }
}

/**
 * Capture handlers from the outermost ancestor down to the target, then bubble handlers from the
 * target up (non-bubbling types: the target only), then root listeners. `path` lists the target
 * first and its ancestors after it; an empty path addresses the root. A handler that throws ends
 * this event's dispatch and is returned as `failure`, with `defaultPrevented` as it stood. A drag event
 * needs the `DataTransfer` of its handlers (`DragSessions` makes it).
 */
export function dispatchEvent(
  native: NativeEvent, path: readonly PathNode[], related: UIHandle | null, root: RootTarget, transfer?: DataTransfer,
): DispatchResult {
  const spec = EVENT_TABLE[native.type];
  const targetNode = path[0];
  const event = createEvent(native, targetNode?.handle ?? root.handle, related, spec.bubbles, transfer);
  try {
    for (const node of [...path].reverse()) {
      if (event.isPropagationStopped()) break;
      event.enter(node.handle, node === targetNode ? EventPhase.AtTarget : EventPhase.Capturing);
      spec.invoke(node.props, true, event);
    }
    for (const node of path) {
      if (event.isPropagationStopped()) break;
      if (node !== targetNode && !spec.bubbles) break;
      event.enter(node.handle, node === targetNode ? EventPhase.AtTarget : EventPhase.Bubbling);
      spec.invoke(node.props, false, event);
    }
    if (!event.isPropagationStopped() && (spec.bubbles || targetNode === undefined)) {
      event.enter(root.handle, targetNode === undefined ? EventPhase.AtTarget : EventPhase.Bubbling);
      root.listeners.emit(event);
    }
  } catch (error) {
    return { defaultPrevented: event.defaultPrevented, failure: error instanceof Error ? error : new Error(String(error)) };
  } finally {
    event.enter(event.target, EventPhase.None);
  }
  return { defaultPrevented: event.defaultPrevented, failure: undefined };
}

/**
 * The elements a pointer crosses when it moves between two elements, deepest first: `path` (the
 * entered or left element, then its ancestors) without the ancestors it shares with `relatedPath`.
 * A pointer that leaves the root or arrives from outside has an empty `relatedPath`, so the whole
 * `path` is crossed. Leave handlers run in this order; enter handlers run in reverse.
 */
export function exclusiveAncestry<T>(path: readonly T[], relatedPath: readonly T[]): T[] {
  let shared = 0;
  while (
    shared < path.length && shared < relatedPath.length &&
    path[path.length - 1 - shared] === relatedPath[relatedPath.length - 1 - shared]
  ) shared += 1;
  return path.slice(0, path.length - shared);
}
