import { createElement } from 'react';
import {
  Callable, Color, ColorRect, Control, DirAccess, DisplayServer, Engine, FileAccess, InputEvent, InputEventKey,
  InputEventMouseButton, InputEventPanGesture, MouseButton, Node, ReactUiRoot, OS, Time, Vector2,
} from 'godot';
import { createClassBinder } from 'godot.annotations';
import { createRoot, readActivity, takeNativeProfile, type ReactRoot } from '../../src';
import { App } from './app';
import { setLabOwner } from './interaction-lab';
import { labElement, type LabName } from './labs';
import { observeInputFailure, runVerification } from './verify';
import { BenchmarkApp, type BenchmarkProps } from './benchmark';
import { runProbe } from './probe';
import { runInteractionVerification } from './verify-interaction';
import { runMotionVerification } from './verify-motion';
import { VerifierInputIsolation, injectsOwnInput } from './verifier-input';

const bind = createClassBinder();
const MICROSECONDS_PER_MILLISECOND = 1000;
const BACKDROP_COLOR = new Color(0.86, 0.9, 0.84, 1);

/** What reached Godot instead of the React root, for the pass-through verification. */
export interface PassthroughCounts {
  /** Left presses the Control behind the root saw in its `_gui_input`. */
  backdropPresses: number;
  /** Left presses nothing consumed, as `_unhandled_input` sees them. */
  unhandledPresses: number;
  /** Wheel ticks nothing consumed. */
  unhandledWheels: number;
  /**
   * Trackpad pan gestures nothing consumed. Godot's `Input` dispatches every gesture twice (see the
   * progress log), so one parsed pan counts twice here and in any Control that receives it.
   */
  unhandledPans: number;
  /** Unconsumed key presses (not echoes) by Godot keycode. */
  unhandledKeys: Record<number, number>;
}

/** One Godot node owns the renderer and its lifetime on native and Web. */
@bind()
export default class Main extends Node {
  private surface: ReactUiRoot | null = null;
  private renderer: ReactRoot | null = null;
  private width = 0;
  private height = 0;
  private readonly web = OS.hasFeature('web');
  /** A full-window Control behind the React root: the "game" the HUD sits over. */
  private backdrop: ColorRect | null = null;
  private pointerCancels = 0;
  /** `wheel` events that reached the root's own listener (every wheel tick or pan JS was shown). */
  private wheelEvents = 0;
  private rootKeys: string[] = [];
  private passthrough: PassthroughCounts = { backdropPresses: 0, unhandledPresses: 0, unhandledWheels: 0, unhandledPans: 0, unhandledKeys: {} };
  /** Set only in a run that injects its own input (a verifier or the probe); a normal run takes real input. */
  private isolation: VerifierInputIsolation | null = null;

  override _ready(): void {
    const args = OS.getCmdlineUserArgs();
    const userArgs = Array.from({length:args.size()}, (_, i) => args.get(i));
    // First, before the window can become the key window: see VerifierInputIsolation.
    if (injectsOwnInput(userArgs)) {
      const window = this.getWindow();
      if (!window) throw new Error('A verifier run requires its owning Window');
      this.isolation = VerifierInputIsolation.begin(window);
    }
    this.updateDisplayScale();
    this.createBackdrop();
    this.mount();
    const api = {
      snapshot: () => this.requireRenderer().getSnapshot(),
      find: (testID: string) => this.requireRenderer().findByTestID(testID),
      mount: () => this.mount(),
      unmount: () => this.unmount(),
      activity: () => readActivity(this.requireSurface()),
      profile: (enabled: boolean) => {
        this.requireRenderer().setProfiling(enabled);
        this.requireSurface().setProfiling(enabled);
      },
      takeProfile: () => ({js: this.requireRenderer().takeProfile(), native: takeNativeProfile(this.requireSurface())}),
      // Phase F0 evidence probe; only a build with the `probe` cargo feature can run it.
      runProbe: () => runProbe(),
      benchmark: (props: BenchmarkProps) => this.requireRenderer().render(createElement(BenchmarkApp, props)),
      restoreDemo: () => this.requireRenderer().render(createElement(App)),
      // A page in place of the app: the HUD over the backdrop Control (plan I1), the pointer lab (I2), ...
      showLab: (name: LabName) => this.requireRenderer().render(labElement(name)),
      /** The `key` of every `keydown` addressed to the root itself (no element focused), in order. */
      rootKeys: () => [...this.rootKeys],
      resetRootKeys: () => { this.rootKeys = []; },
      /** Deliver the notification the window system sends when the window loses OS focus (plan D6). */
      simulateWindowFocusLoss: () => {
        const window = this.getWindow();
        if (!window) throw new Error('The demo requires its owning Window');
        this.isolation?.expectSimulated(Node.NOTIFICATION_WM_WINDOW_FOCUS_OUT);
        window.propagateNotification(Node.NOTIFICATION_WM_WINDOW_FOCUS_OUT);
      },
      /** `pointercancel`s the root's own listener saw since the last reset. */
      pointerCancels: () => this.pointerCancels,
      resetPointerCancels: () => { this.pointerCancels = 0; },
      /** `wheel` events (ticks and pans) the root's own listener saw: how many times JS was asked about one. */
      wheelEvents: () => this.wheelEvents,
      passthrough: (): PassthroughCounts => ({ ...this.passthrough, unhandledKeys: { ...this.passthrough.unhandledKeys } }),
      resetPassthrough: () => { this.passthrough = { backdropPresses: 0, unhandledPresses: 0, unhandledWheels: 0, unhandledPans: 0, unhandledKeys: {} }; },
      /** The cursor Godot would show with the pointer at (x, y), through the root's `_get_cursor_shape`. */
      cursorShapeAt: (x: number, y: number) => this.requireSurface().getCursorShape(new Vector2(x, y)),
      /** Whether the root holds Godot key focus. */
      surfaceHasFocus: () => this.requireSurface().hasFocus(),
      grabSurfaceFocus: () => this.requireSurface().grabFocus(),
      /** Whether a root that has only just entered the tree holds key focus (it must not). */
      bareSurfaceHasFocus: () => {
        const bare = new ReactUiRoot();
        this.addChild(bare);
        const focused = bare.hasFocus();
        this.removeChild(bare);
        bare.free();
        return focused;
      },
      /** Move the root inside the window, to tell root-local from viewport coordinates. */
      offsetSurface: (x: number, y: number) => { this.requireSurface().position = new Vector2(x, y); },
      /**
       * Resize the root's Control, as the owner does when the window changes size. Until the window itself
       * changes size `_process` leaves it as set here.
       */
      resizeSurface: (width: number, height: number) => { this.requireSurface().size = new Vector2(width, height); },
      surfaceAttached: (attached: boolean) => {
        const surface = this.requireSurface();
        const parent = surface.getParent();
        if (parent !== null && parent !== this) throw new Error('Demo surface has an unexpected owner');
        if (attached && parent === null) this.addChild(surface);
        if (!attached && parent === this) {
          this.removeChild(surface);
          this.requireRenderer().dispatchEvents();
        }
      },
    };
    // This demo-only inspection surface is also available in the Web JS realm.
    Object.assign(globalThis, { godotReactDemo: api });
    console.log('GODOT_REACT_DEMO_READY');
    const verify = userArgs.includes('--verify');
    const verifyMotion = userArgs.includes('--verify-motion');
    const verifyInteraction = userArgs.includes('--verify-interaction');
    if (userArgs.includes('--probe')) {
      void runProbe().then(result => this.writeProbeResult(result)).then(() => this.getTree()?.quit()).catch(error => {
        console.error('GODOT_REACT_PROBE_FAILED', error instanceof Error ? error.stack : String(error));
        this.getTree()?.quit(1);
      });
    }
    if (verify || verifyMotion || verifyInteraction) {
      const verification = verifyMotion ? runMotionVerification(this, api)
        : verifyInteraction ? runInteractionVerification(this, api) : runVerification(this, api);
      void verification.then(() => { this.isolation?.report(); this.getTree()?.quit(); }).catch(async error => {
        console.error('GODOT_REACT_VERIFY_FAILED', error instanceof Error ? error.stack : String(error));
        this.isolation?.report();
        if (verify && !verifyMotion && !verifyInteraction) {
          try {
            await observeInputFailure(this, api);
          } catch (diagnosticError) {
            console.error('GODOT_REACT_INPUT_DIAGNOSTIC_FAILED', String(diagnosticError));
          }
        }
        this.getTree()?.quit(1);
      });
    }
  }

  /**
   * A full-window Control in front of nothing and behind the React root. Wherever the root has no
   * element to receive a pointer, Godot hands the pointer to this instead. It passes what it sees on
   * to `_unhandled_input`, the way a game's own UI under a HUD would.
   */
  private createBackdrop(): void {
    const backdrop = new ColorRect();
    backdrop.setName('GameBackdrop');
    backdrop.color = BACKDROP_COLOR;
    backdrop.mouseFilter = Control.MouseFilter.MouseFilterPass;
    backdrop.guiInput.connect(Callable.create((event: InputEvent) => {
      if (event instanceof InputEventMouseButton && event.pressed && event.buttonIndex === MouseButton.MouseButtonLeft) {
        this.passthrough.backdropPresses += 1;
      }
    }));
    // Internal and first: it is not counted among the demo's children (the verifiers count the
    // surface) and it sorts behind the root.
    this.addChild(backdrop, false, Node.InternalMode.InternalModeFront);
    this.backdrop = backdrop;
    this.sizeToViewport();
  }

  private sizeToViewport(): void {
    const viewport = this.getViewport();
    if (!viewport) throw new Error('Demo requires a viewport');
    const size = viewport.getVisibleRect().size;
    this.width = size.x;
    this.height = size.y;
    if (this.backdrop) this.backdrop.size = size;
  }

  override _input(event: InputEvent): void {
    // A foreign event should not reach an isolated window; one that does is dropped and recorded (a
    // mouse move has already moved the hover by then, so the run counts as disturbed).
    if (this.isolation?.rejects(event)) this.getViewport()?.setInputAsHandled();
  }

  override _notification(what: number): void {
    this.isolation?.notify(what);
  }

  override _unhandledInput(event: InputEvent): void {
    if (event instanceof InputEventPanGesture) this.passthrough.unhandledPans += 1;
    if (event instanceof InputEventMouseButton && event.pressed) {
      if (event.buttonIndex === MouseButton.MouseButtonLeft) this.passthrough.unhandledPresses += 1;
      if (event.buttonIndex === MouseButton.MouseButtonWheelUp || event.buttonIndex === MouseButton.MouseButtonWheelDown
        || event.buttonIndex === MouseButton.MouseButtonWheelLeft || event.buttonIndex === MouseButton.MouseButtonWheelRight) {
        this.passthrough.unhandledWheels += 1;
      }
    } else if (event instanceof InputEventKey && event.pressed && !event.echo) {
      this.passthrough.unhandledKeys[event.keycode] = (this.passthrough.unhandledKeys[event.keycode] ?? 0) + 1;
    }
  }

  private writeProbeResult(result: unknown): void {
    const directory = OS.getEnvironment('GODOT_REACT_ARTIFACTS');
    if (!directory) return;
    DirAccess.makeDirRecursiveAbsolute(directory);
    const file = FileAccess.open(`${directory}/probe.json`, FileAccess.ModeFlags.Write);
    if (!file) throw new Error('Cannot write the probe result');
    file.storeString(JSON.stringify(result, null, 2));
    file.close();
  }

  private updateDisplayScale(): void {
    if (!this.web) return;
    const window = this.getWindow();
    if (!window) throw new Error('Web demo requires its owning Window');
    // DisplayServerWeb returns the canvas device-pixel ratio. Window divides
    // its logical size and transforms input by contentScaleFactor while keeping
    // the full-resolution render target (window.cpp::_update_viewport_size).
    const scale = DisplayServer.screenGetScale();
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid display scale');
    if (window.contentScaleFactor !== scale) window.contentScaleFactor = scale;
  }

  private requireRenderer(): ReactRoot {
    if (!this.renderer) throw new Error('Demo renderer is not mounted');
    return this.renderer;
  }

  private requireSurface(): ReactUiRoot {
    if (!this.surface) throw new Error('Demo surface is not mounted');
    return this.surface;
  }

  private mount(): void {
    if (this.renderer) throw new Error('Demo is already mounted');
    const surface = new ReactUiRoot();
    surface.setName('ReactSurface');
    this.addChild(surface);
    this.sizeToViewport();
    surface.size = new Vector2(this.width, this.height);
    this.surface = surface;
    // The root takes no key focus by itself; this demo wants keyboard-first behaviour.
    surface.grabFocus();
    const renderer = createRoot(surface, {
      now: () => Time.getTicksUsec() / MICROSECONDS_PER_MILLISECOND,
      // Native emits eventsReady from inside its input callbacks; dispatch runs synchronously there
      // and answers preventDefault() before the signal returns. A GodotJS Callable holds its function
      // strongly, so unmount() must disconnect it or the whole root would stay reachable.
      subscribeToEvents: (listener) => {
        const callable = Callable.create(listener);
        surface.eventsReady.connect(callable);
        return () => surface.eventsReady.disconnect(callable);
      },
    });
    this.renderer = renderer;
    renderer.addEventListener('pointercancel', () => { this.pointerCancels += 1; });
    renderer.addEventListener('wheel', () => { this.wheelEvents += 1; });
    renderer.addEventListener('keydown', event => {
      if (event.target.id === 0) this.rootKeys.push(event.key);
    });
    setLabOwner({
      unmountRoot: () => this.unmount(),
      detachSurface: () => {
        const owned = this.requireSurface();
        if (owned.getParent() === this) this.removeChild(owned);
      },
      processFrame: () => Engine.getProcessFrames(),
      focusedNodeId: () => this.requireRenderer().getSnapshot().focused,
    });
    renderer.render(createElement(App));
  }

  private unmount(): void {
    if (!this.renderer || !this.surface) throw new Error('Demo is not mounted');
    setLabOwner(undefined);
    this.renderer.unmount();
    this.renderer = null;
    this.surface.queueFree();
    this.surface = null;
  }

  override _process(): void {
    this.updateDisplayScale();
    if (!this.renderer || !this.surface || !this.surface.isInsideTree()) return;
    const viewport = this.getViewport();
    if (!viewport) throw new Error('Mounted demo lost its viewport');
    const size = viewport.getVisibleRect().size;
    if (size.x !== this.width || size.y !== this.height) {
      this.sizeToViewport();
      // Native restyles the nodes whose breakpoints the new size crosses; React is not involved.
      this.surface.size = new Vector2(this.width, this.height);
    }
    this.renderer.dispatchEvents();
  }

  override _exitTree(): void {
    if (this.renderer) this.unmount();
    Reflect.deleteProperty(globalThis, 'godotReactDemo');
  }

  override _enterTree(): void {
    // _ready mounts the first time; tree re-entry mounts a fresh React owner.
    if (this.isNodeReady() && !this.renderer) this.mount();
  }
}
