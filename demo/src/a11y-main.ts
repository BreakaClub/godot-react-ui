import { createElement } from 'react';
import { Callable, DisplayServer, InputEvent, Node, OS, ReactUiRoot, Time, Vector2 } from 'godot';
import { createClassBinder } from 'godot.annotations';
import { createRoot, type NativeSnapshot, type NativeSnapshotNode, type ReactRoot } from '../../src';
import { A11yPanel } from './a11y-panel';
import { runA11yVerification, VERIFIER_DEVICE_ID } from './verify-a11y';

const bind = createClassBinder();
const MICROSECONDS_PER_MILLISECOND = 1000;

/** What could have disturbed a verification: input from a real device, and the window losing OS focus. */
export interface A11yInterference {
  /** Events from any device but the verifier's, swallowed before the panel saw them. */
  foreignInput: number;
  windowFocusLosses: number;
}

/**
 * One Godot node owns the accessibility lab (`a11y.tscn`): a full-window `ReactUiRoot` showing `A11yPanel`,
 * read by `scripts/verify-a11y.mjs` through the platform's accessibility tree and by `verify-a11y.ts` through
 * the native snapshot. Run it with `--accessibility always` so the platform tree exists without a screen reader.
 */
@bind()
export default class A11yMain extends Node {
  private surface: ReactUiRoot | null = null;
  private renderer: ReactRoot | null = null;
  private interference: A11yInterference = { foreignInput: 0, windowFocusLosses: 0 };
  /** While verifying, only the verifier's own events reach the panel. */
  private verifying = false;

  override _ready(): void {
    this.mount();
    const api = {
      snapshot: (): NativeSnapshot => this.requireRenderer().getSnapshot(),
      find: (testID: string): NativeSnapshotNode | undefined => this.requireRenderer().findByTestID(testID),
      surface: (): ReactUiRoot => this.requireSurface(),
      interference: (): A11yInterference => ({ ...this.interference }),
      /** What the engine says about accessibility: the facts the README records. */
      engine: () => ({
        screenReaderFeature: DisplayServer.hasFeature(DisplayServer.Feature.FeatureAccessibilityScreenReader),
        screenReaderActive: DisplayServer.accessibilityScreenReaderActive(),
        enabled: this.getTree()?.isAccessibilityEnabled() ?? false,
        supported: this.getTree()?.isAccessibilitySupported() ?? false,
      }),
      windowSize: (): Vector2 => this.requireSurface().size,
    };
    Object.assign(globalThis, { godotReactA11y: api });
    console.log('GODOT_REACT_A11Y_READY');
    const args = OS.getCmdlineUserArgs();
    if (Array.from({ length: args.size() }, (_, i) => args.get(i)).includes('--verify-a11y')) {
      this.verifying = true;
      void runA11yVerification(api).then(() => this.getTree()?.quit()).catch(error => {
        console.error('GODOT_REACT_VERIFY_FAILED', error instanceof Error ? error.stack : String(error));
        this.getTree()?.quit(1);
      });
    }
  }

  /**
   * Verification only: a real mouse or keyboard sends events to the window too, and would interleave with the
   * verifier's own. Everything not from the verifier's device is counted and swallowed before the GUI sees it.
   */
  override _input(event: InputEvent): void {
    if (!this.verifying || event.device === VERIFIER_DEVICE_ID) return;
    this.interference.foreignInput += 1;
    this.getViewport()?.setInputAsHandled();
  }

  _notification(what: number): void {
    if (what === Node.NOTIFICATION_WM_WINDOW_FOCUS_OUT) this.interference.windowFocusLosses += 1;
  }

  private mount(): void {
    if (this.renderer) throw new Error('The accessibility lab is already mounted');
    const surface = new ReactUiRoot();
    surface.setName('A11ySurface');
    this.addChild(surface);
    const size = this.getViewport()?.getVisibleRect().size;
    if (!size) throw new Error('The accessibility lab requires a viewport');
    surface.size = size;
    this.surface = surface;
    const renderer = createRoot(surface, {
      now: () => Time.getTicksUsec() / MICROSECONDS_PER_MILLISECOND,
      // A GodotJS Callable holds its function strongly, so unmount() must disconnect it.
      subscribeToEvents: (listener) => {
        const callable = Callable.create(listener);
        surface.eventsReady.connect(callable);
        return () => surface.eventsReady.disconnect(callable);
      },
    });
    this.renderer = renderer;
    renderer.render(createElement(A11yPanel));
  }

  override _process(): void {
    if (!this.renderer || !this.surface) return;
    const size = this.getViewport()?.getVisibleRect().size;
    if (size && (size.x !== this.surface.size.x || size.y !== this.surface.size.y)) this.surface.size = size;
    this.renderer.dispatchEvents();
  }

  override _exitTree(): void {
    if (this.renderer) {
      this.renderer.unmount();
      this.renderer = null;
    }
    this.surface?.queueFree();
    this.surface = null;
    Reflect.deleteProperty(globalThis, 'godotReactA11y');
  }

  private requireRenderer(): ReactRoot {
    if (!this.renderer) throw new Error('The accessibility lab is not mounted');
    return this.renderer;
  }

  private requireSurface(): ReactUiRoot {
    if (!this.surface) throw new Error('The accessibility lab is not mounted');
    return this.surface;
  }
}
