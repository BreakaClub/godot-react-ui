import {
  Engine, Input, InputEvent, InputEventKey, InputEventMouse, InputEventMouseButton, InputEventScreenTouch, Node,
  ReactUiRoot, Time, Window,
} from 'godot';

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

/** A disturbance of one kind is logged at most this often: a real mouse moving over the window would otherwise log every frame. */
const DISTURBANCE_LOG_INTERVAL_MS = 250;

/** `InputEvent::DEVICE_ID_EMULATION`: the touch-to-mouse and mouse-to-touch translations of an injected event. */
const DEVICE_ID_EMULATION = -1;

/** Inject `event` the way a verifier does: marked as the verifier's, so nothing can mistake it for a device's. */
export function parseVerifierEvent(event: InputEvent): void {
  event.device = VERIFIER_DEVICE_ID;
  Input.parseInputEvent(event);
}

/** Whether the arguments after `--` ask for a verifier or the probe: runs that inject their own input. */
export function injectsOwnInput(userArgs: readonly string[]): boolean {
  return ['--verify', '--verify-motion', '--verify-interaction', '--verify-world', '--verify-a11y', '--probe'].some(flag => userArgs.includes(flag));
}

/** What a run observed that the verifier did not cause. */
export type Disturbance = 'foreign-input' | 'window-focus-loss' | 'window-mouse-crossing';

/**
 * Keeps the real keyboard, mouse and window system out of a run that injects its own input, and reports it when
 * it gets in anyway (docs/INTERACTION_PROGRESS.md, Task 0; plan decisions D21 and D22; docs/tracks/verifier-integrity.md).
 *
 * Why it is needed: while a window is the key window, AppKit delivers every mouse move on the machine to it,
 * whatever display the cursor is on (`setAcceptsMouseMovedEvents`, platform/macos/display_server_macos.mm:156),
 * and every key the user types. Godot updates the Control under the pointer from each motion event before `_input`
 * runs (`Viewport::push_input` calls `_update_mouse_over` first, scene/main/viewport.cpp:3523 and :3537), so one
 * real move hands the hover to whatever is under the real cursor and sends the root `MOUSE_EXIT`; accumulated
 * input merges a real motion into an injected one whatever their devices (`Input::parse_input_event`,
 * core/input/input.cpp:1654, and `InputEventMouseMotion::accumulate` checks no device); and a real key lands in the
 * focused element. A window the system takes focus from also cancels the press in flight (plan D6).
 *
 * What it does:
 * - `unfocusable` (`NSWindow.canBecomeKeyWindow` is false, platform/macos/godot_window.mm:60): the window cannot become
 *   the key window, so neither keys nor off-window mouse moves reach it once it is not. Setting the flag does not take key
 *   status from a window that already has it (`WINDOW_FLAG_NO_FOCUS` only sets `wd.no_focus`), so the window stays the
 *   key window until something else takes it: that is the one `window-focus-loss` every run logs, and it is the moment
 *   the window stops being exposed, not an attack on it;
 * - `mousePassthrough` (`setIgnoresMouseEvents`, display_server_macos.mm): a cursor over the window reaches the
 *   window beneath, and the window cannot be dragged or resized with the mouse;
 * - `Input.useAccumulatedInput = false`: every injected event is dispatched at once and in order, never merged with
 *   another;
 * - every event from another device is dropped before the GUI gets it (`rejects`);
 * - the clipboard the product reads and writes is the process's own memory, not the machine's (`isolateClipboard`).
 *
 * `Input.parseInputEvent` needs none of the window state it removes: `Window::_window_input` and
 * `Viewport::push_input` never look at window focus.
 *
 * None of this can make a run immune to a person who interacts with the window, so anything that still gets
 * through is recorded as a disturbance, in the log, as it happens, with whether it can reach the system under test
 * (`reachesRoot`) and what the verifier had pressed at that moment. The verify script re-runs a run that failed with a
 * disturbance that reached the root shortly before the failure (at most twice) and never re-runs one that failed without
 * (scripts/native-run.mjs).
 */
export class VerifierInputIsolation {
  private readonly startedMs = Time.getTicksMsec();
  private readonly counts = new Map<Disturbance, number>();
  private readonly reaching = new Map<Disturbance, number>();
  private readonly lastLoggedMs = new Map<Disturbance, number>();
  /** The keys, buttons and fingers the verifier has pressed and not released: what a focus loss would cancel. */
  private readonly held = new Set<string>();
  /** Notifications the verifier sends itself (D6's focus-out, a window mouse exit) that are not the window system's. */
  private readonly simulated = new Map<number, number>();

  private constructor(window: Window, restrictWindow: boolean) {
    if (restrictWindow) {
      window.unfocusable = true;
      window.mousePassthrough = true;
    }
    Input.useAccumulatedInput = false;
    ReactUiRoot.isolateClipboard(true);
    console.log('GODOT_REACT_INPUT_ISOLATED', JSON.stringify({
      unfocusable: window.unfocusable, mousePassthrough: window.mousePassthrough, accumulatedInput: Input.useAccumulatedInput,
      clipboard: 'memory',
    }));
  }

  /**
   * Isolate `window`. `restrictWindow: false` keeps everything but the two window flags: the device filter, the
   * disturbance reports and unaccumulated input. The accessibility verifier needs that: with `unfocusable` and
   * `mousePassthrough` set the platform's accessibility tree has the window and nothing under it, with them
   * unset it has the whole lab (docs/tracks/stock-engine.md, "The accessibility tree"). A window that can take
   * key status receives real keys and mouse moves like any other; they are rejected by device and reported.
   */
  static begin(window: Window, { restrictWindow = true }: { restrictWindow?: boolean } = {}): VerifierInputIsolation {
    return new VerifierInputIsolation(window, restrictWindow);
  }

  /**
   * Whether `event` is foreign: not injected by the verifier and not made by the engine from an injected one
   * (a touch's emulated mouse event). The caller drops a foreign event. Events the engine makes on its own, such
   * as the releases it sends for presses it cancels when the window loses focus, are foreign too.
   */
  rejects(event: InputEvent): boolean {
    const device = event.device;
    if (device === VERIFIER_DEVICE_ID) {
      this.track(event);
      return false;
    }
    if (device === DEVICE_ID_EMULATION) return false;
    // A mouse event moves the hover and clears the mouse focus before `_input` can drop it (`Viewport::push_input` calls
    // `_update_mouse_over` for any `InputEventMouse` first, and `_gui_cleanup_internal_state` for one handled in `_input`).
    // A key or a gesture is dropped before the GUI sees it: it changes nothing the system under test can observe.
    this.disturb('foreign-input', `${event.getClass()} device=${device}`, event instanceof InputEventMouse);
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
      // The root cancels every pointer that is down when the window loses focus (plan D6): with nothing pressed it
      // changes nothing the system under test can observe.
      this.disturb('window-focus-loss', 'NOTIFICATION_WM_WINDOW_FOCUS_OUT', this.held.size > 0);
    } else if (what === Node.NOTIFICATION_WM_MOUSE_ENTER) {
      this.disturb('window-mouse-crossing', 'NOTIFICATION_WM_MOUSE_ENTER', true);
    } else if (what === Node.NOTIFICATION_WM_MOUSE_EXIT) {
      this.disturb('window-mouse-crossing', 'NOTIFICATION_WM_MOUSE_EXIT', true);
    }
  }

  /**
   * The next notification `what` is one the verifier sends itself (D6's focus-out, a window mouse exit to test
   * what leaving the window does), not the window system's.
   */
  expectSimulated(what: number): void {
    this.simulated.set(what, (this.simulated.get(what) ?? 0) + 1);
  }

  private track(event: InputEvent): void {
    if (event instanceof InputEventKey) this.hold(`key:${event.keycode}`, event.pressed);
    else if (event instanceof InputEventMouseButton) this.hold(`mouse:${event.buttonIndex}`, event.pressed);
    else if (event instanceof InputEventScreenTouch) this.hold(`touch:${event.index}`, event.pressed);
  }

  private hold(input: string, pressed: boolean): void {
    if (pressed) this.held.add(input);
    else this.held.delete(input);
  }

  private disturb(kind: Disturbance, detail: string, reachesRoot: boolean): void {
    const now = Time.getTicksMsec();
    const sinceReadyMs = now - this.startedMs;
    if (sinceReadyMs < STARTUP_SETTLE_MS) return;
    this.counts.set(kind, (this.counts.get(kind) ?? 0) + 1);
    if (reachesRoot) this.reaching.set(kind, (this.reaching.get(kind) ?? 0) + 1);
    // Each kind logs where it happened, and again after a pause: the verify script orders the disturbances against the
    // failure by these lines (a real mouse moving over the window would otherwise log fifty lines a second).
    const lastLogged = this.lastLoggedMs.get(kind);
    if (lastLogged !== undefined && now - lastLogged < DISTURBANCE_LOG_INTERVAL_MS) return;
    this.lastLoggedMs.set(kind, now);
    console.log('GODOT_REACT_RUN_DISTURBED', JSON.stringify({
      kind, detail, sinceReadyMs, frame: Engine.getProcessFrames(), reachesRoot, inFlight: [...this.held],
    }));
  }

  /**
   * Print where the run ended on this verifier's clock, and the totals of what disturbed it. The verify script times a
   * failure by this line, so every owner prints it once, after the failure or the pass.
   */
  report(): void {
    console.log('GODOT_REACT_RUN_ENDED', JSON.stringify({
      sinceReadyMs: Time.getTicksMsec() - this.startedMs,
      disturbances: Object.fromEntries(this.counts), reaching: Object.fromEntries(this.reaching),
    }));
  }
}

/**
 * The clipboard a verifier reads and writes: the process's own memory while `VerifierInputIsolation` is active, which is
 * also where the product's copy, cut and paste go (native/clipboard.rs). The machine's clipboard is the person's: a
 * verifier must never overwrite what they copied, so no verifier calls `DisplayServer.clipboard*` itself.
 */
export const verifierClipboard = {
  get: (): string => ReactUiRoot.clipboardText(),
  set: (text: string): void => ReactUiRoot.setClipboardText(text),
};

/**
 * How many assertions the verifier files of this process have run. Each file has its own `assert`; they all count here, so a
 * section that ran none (a filter that matched nothing, a loop over an empty list) fails instead of passing.
 */
export const assertionTally = { count: 0 };
