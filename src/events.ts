import type { UIHandle, UIProps } from './components';
import type {
  NativeEvent, NativeEventType, NativeFocusEvent, NativeFocusEventType, NativePointerEvent,
  NativePointerEventType, NativePointerType,
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

export interface UIPointerEvent extends UISyntheticEvent<NativePointerEventType> {
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
  /** Enter and leave events: the element left towards or entered from, if it still exists. */
  readonly relatedTarget: UIHandle | null;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

export interface UIFocusEvent extends UISyntheticEvent<NativeFocusEventType> {}

/** Kept so handler types written against the first event model still compile. */
export type UIEvent = UIPointerEvent;
export type UIAnyEvent = UIPointerEvent | UIFocusEvent;

export interface UIEventMap {
  pointerdown: UIPointerEvent;
  pointermove: UIPointerEvent;
  pointerup: UIPointerEvent;
  pointerenter: UIPointerEvent;
  pointerleave: UIPointerEvent;
  click: UIPointerEvent;
  focus: UIFocusEvent;
  blur: UIFocusEvent;
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

class PointerEventImpl extends SyntheticEvent<NativePointerEventType> implements UIPointerEvent {
  readonly x: number;
  readonly y: number;
  readonly viewportX: number;
  readonly viewportY: number;
  readonly pointerId: number;
  readonly pointerType: NativePointerType;
  readonly button: number;
  readonly buttons: number;
  readonly detail: number;
  readonly relatedTarget: UIHandle | null;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;

  constructor(native: NativePointerEvent, target: UIHandle, related: UIHandle | null, bubbles: boolean) {
    super(native.type, target, bubbles, native.cancelable, native.timeStamp);
    this.x = native.x;
    this.y = native.y;
    this.viewportX = native.viewportX;
    this.viewportY = native.viewportY;
    this.pointerId = native.pointerId;
    this.pointerType = native.pointerType;
    this.button = native.button;
    this.buttons = native.buttons;
    this.detail = native.detail;
    this.relatedTarget = related;
    this.shiftKey = native.shiftKey;
    this.ctrlKey = native.ctrlKey;
    this.altKey = native.altKey;
    this.metaKey = native.metaKey;
  }
}

class FocusEventImpl extends SyntheticEvent<NativeFocusEventType> implements UIFocusEvent {
  constructor(native: NativeFocusEvent, target: UIHandle, bubbles: boolean) {
    super(native.type, target, bubbles, native.cancelable, native.timeStamp);
  }
}

type Handler<E> = ((event: E) => void) | undefined;

/** `focus` and `blur` are the only events without pointer data. */
function isFocusEvent(event: UIAnyEvent): event is UIFocusEvent {
  return event.type === 'focus' || event.type === 'blur';
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
      if (isFocusEvent(event)) {
        throw new Error(`UI internal error: ${event.type} reached a pointer event handler`);
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

/** The only place that knows which prop names which event. Completeness is checked by `Record`. */
const EVENT_TABLE: Record<NativeEventType, EventSpec> = {
  pointerdown: pointerSpec(true, (p) => p.onPointerDown, (p) => p.onPointerDownCapture),
  pointermove: pointerSpec(true, (p) => p.onPointerMove, (p) => p.onPointerMoveCapture),
  pointerup: pointerSpec(true, (p) => p.onPointerUp, (p) => p.onPointerUpCapture),
  pointerenter: pointerSpec(false, (p) => p.onPointerEnter),
  pointerleave: pointerSpec(false, (p) => p.onPointerLeave),
  click: pointerSpec(true, (p) => p.onClick, (p) => p.onClickCapture),
  focus: focusSpec((p) => p.onFocus),
  blur: focusSpec((p) => p.onBlur),
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

function createEvent(native: NativeEvent, target: UIHandle, related: UIHandle | null, bubbles: boolean): PointerEventImpl | FocusEventImpl {
  switch (native.type) {
    case 'pointerdown': case 'pointermove': case 'pointerup':
    case 'pointerenter': case 'pointerleave': case 'click':
      return new PointerEventImpl(native, target, related, bubbles);
    case 'focus': case 'blur':
      return new FocusEventImpl(native, target, bubbles);
  }
}

/**
 * Capture handlers from the outermost ancestor down to the target, then bubble handlers from the
 * target up (non-bubbling types: the target only), then root listeners. `path` lists the target
 * first and its ancestors after it; an empty path addresses the root. A handler that throws ends
 * this event's dispatch and is returned as `failure`, with `defaultPrevented` as it stood.
 */
export function dispatchEvent(native: NativeEvent, path: readonly PathNode[], related: UIHandle | null, root: RootTarget): DispatchResult {
  const spec = EVENT_TABLE[native.type];
  const targetNode = path[0];
  const event = createEvent(native, targetNode?.handle ?? root.handle, related, spec.bubbles);
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
