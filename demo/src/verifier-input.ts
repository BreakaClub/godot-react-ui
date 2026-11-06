import { Engine, Input, InputEvent, Node, Time, Window } from 'godot';

/**
 * The device id of every input event a verifier or probe injects. Godot 4.8 gives the events of a real
 * keyboard device 16 and of a real mouse device 32 (`InputEvent::DEVICE_ID_KEYBOARD` and `DEVICE_ID_MOUSE`,
 * core/input/input_event.h) and reserves the ids between them, so an injected event is told apart from a real
 * one only if it carries an id no device has. A real device id is a small number; this is far above any.
 */
export const VERIFIER_DEVICE_ID = 1 << 30;

/**
 * How long after the owner is ready the window system may still be settling the window. The engine activates an
 * unbundled application with three steps 20 ms apart (`GodotApplication.activateApplication`,
 * platform/macos/godot_application.mm), and the window gains and loses key status, and the cursor "enters" it,
 * while that happens (observed: a focus loss 70 ms and a focus gain 190 ms after `_ready`). Notifications in this
 * window are logged but are not disturbances.
 */
const STARTUP_SETTLE_MS = 500;

/** `InputEvent::DEVICE_ID_EMULATION`: the touch-to-mouse and mouse-to-touch translations of an injected event. */
const DEVICE_ID_EMULATION = -1;

/** Inject `event` the way a verifier does: marked as the verifier's, so nothing can mistake it for a device's. */
export function parseVerifierEvent(event: InputEvent): void {
  event.device = VERIFIER_DEVICE_ID;
  Input.parseInputEvent(event);
}

/** Whether the arguments after `--` ask for a verifier or the probe: runs that inject their own input. */
export function injectsOwnInput(userArgs: readonly string[]): boolean {
  return ['--verify', '--verify-motion', '--verify-interaction', '--verify-world', '--probe'].some(flag => userArgs.includes(flag));
}

/** What a run observed that the verifier did not cause. */
export type Disturbance = 'foreign-input' | 'window-focus-loss' | 'window-mouse-crossing';

/**
 * Keeps the real keyboard, mouse and window system out of a run that injects its own input, and reports it when
 * it gets in anyway (docs/INTERACTION_PROGRESS.md, Task 0; plan decisions D21 and D22).
 *
 * Why it is needed: while a window is the key window, AppKit delivers every mouse move on the machine to it,
 * whatever display the cursor is on (`setAcceptsMouseMovedEvents`, platform/macos/display_server_macos.mm:156),
 * and every key the user types. Godot updates the Control under the pointer from each motion event before `_input`
 * runs (`Viewport::push_input` calls `_update_mouse_over` first, scene/main/viewport.cpp:3554 and :3568), so one
 * real move hands the hover to whatever is under the real cursor and sends the root `MOUSE_EXIT`; accumulated
 * input merges a real motion into an injected one whatever their devices (`Input::parse_input_event`,
 * core/input/input.cpp:1654, and `InputEventMouseMotion::accumulate` checks no device); and a real key lands in the
 * focused element. A window the system takes focus from also cancels the press in flight (plan D6).
 *
 * What it does:
 * - `unfocusable` (`NSWindow.canBecomeKeyWindow` is false, platform/macos/godot_window.mm:60): the window never
 *   becomes the key window, so neither keys nor off-window mouse moves reach it and another application taking
 *   focus has nothing to take;
 * - `mousePassthrough` (`setIgnoresMouseEvents`, display_server_macos.mm): a cursor over the window reaches the
 *   window beneath, and the window cannot be dragged or resized with the mouse;
 * - `Input.useAccumulatedInput = false`: every injected event is dispatched at once and in order, never merged with
 *   another;
 * - every event from another device is dropped before the GUI gets it (`rejects`).
 *
 * `Input.parseInputEvent` needs none of the window state it removes: `Window::_window_input` and
 * `Viewport::push_input` never look at window focus.
 *
 * None of this can make a run immune to a person who interacts with the window, so anything that still gets
 * through is recorded as a disturbance, in the log, as it happens. The verify script re-runs a run that failed
 * with a disturbance in its log (at most twice) and never re-runs one that failed without.
 */
export class VerifierInputIsolation {
  private readonly startedMs = Time.getTicksMsec();
  private readonly counts = new Map<Disturbance, number>();
  /** Notifications the verifier sends itself (D6's focus-out, a window mouse exit) that are not the window system's. */
  private readonly simulated = new Map<number, number>();

  private constructor(window: Window) {
    window.unfocusable = true;
    window.mousePassthrough = true;
    Input.useAccumulatedInput = false;
    console.log('GODOT_REACT_INPUT_ISOLATED', JSON.stringify({
      unfocusable: window.unfocusable, mousePassthrough: window.mousePassthrough, accumulatedInput: Input.useAccumulatedInput,
    }));
  }

  static begin(window: Window): VerifierInputIsolation {
    return new VerifierInputIsolation(window);
  }

  /**
   * Whether `event` is foreign: not injected by the verifier and not made by the engine from an injected one
   * (a touch's emulated mouse event). The caller drops a foreign event. Events the engine makes on its own, such
   * as the releases it sends for presses it cancels when the window loses focus, are foreign too.
   */
  rejects(event: InputEvent): boolean {
    const device = event.device;
    if (device === VERIFIER_DEVICE_ID || device === DEVICE_ID_EMULATION) return false;
    this.disturb('foreign-input', `${event.getClass()} device=${device}`);
    return true;
  }

  /** The owner forwards the notifications it receives: the window losing focus and the cursor crossing it. */
  notify(what: number): void {
    const pending = this.simulated.get(what) ?? 0;
    if (pending > 0) {
      this.simulated.set(what, pending - 1);
      return;
    }
    if (what === Node.NOTIFICATION_WM_WINDOW_FOCUS_OUT) {
      this.disturb('window-focus-loss', 'NOTIFICATION_WM_WINDOW_FOCUS_OUT');
    } else if (what === Node.NOTIFICATION_WM_MOUSE_ENTER) {
      this.disturb('window-mouse-crossing', 'NOTIFICATION_WM_MOUSE_ENTER');
    } else if (what === Node.NOTIFICATION_WM_MOUSE_EXIT) {
      this.disturb('window-mouse-crossing', 'NOTIFICATION_WM_MOUSE_EXIT');
    }
  }

  /**
   * The next notification `what` is one the verifier sends itself (D6's focus-out, a window mouse exit to test
   * what leaving the window does), not the window system's.
   */
  expectSimulated(what: number): void {
    this.simulated.set(what, (this.simulated.get(what) ?? 0) + 1);
  }

  private disturb(kind: Disturbance, detail: string): void {
    const sinceReadyMs = Time.getTicksMsec() - this.startedMs;
    if (sinceReadyMs < STARTUP_SETTLE_MS) return;
    const seen = this.counts.get(kind) ?? 0;
    this.counts.set(kind, seen + 1);
    // The first of each kind is logged where it happened; the verify script looks for this line. A real
    // mouse moving over the window would otherwise log fifty lines a second.
    if (seen === 0) {
      console.log('GODOT_REACT_RUN_DISTURBED', JSON.stringify({ kind, detail, sinceReadyMs, frame: Engine.getProcessFrames() }));
    }
  }

  /** Print the totals of a run that was disturbed (nothing for a quiet one). */
  report(): void {
    if (this.counts.size === 0) return;
    console.log('GODOT_REACT_RUN_DISTURBANCES', JSON.stringify(Object.fromEntries(this.counts)));
  }
}
