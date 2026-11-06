import { createElement } from 'react';
import { Callable, DisplayServer, InputEvent, Node, OS, ReactUiRoot, Time } from 'godot';
import { createClassBinder } from 'godot.annotations';
import { createRoot, type NativeSnapshot, type NativeSnapshotNode, type ReactRoot } from '../../src';
import { A11yPanel } from './a11y-panel';
import { VerifierInputIsolation, injectsOwnInput } from './verifier-input';
import { runA11yVerification } from './verify-a11y';

const bind = createClassBinder();
const MICROSECONDS_PER_MILLISECOND = 1000;

/**
 * One Godot node owns the accessibility lab (`a11y.tscn`): a full-window `ReactUiRoot` showing `A11yPanel`,
 * read by `scripts/verify-a11y.mjs` through the platform's accessibility tree and by `verify-a11y.ts` through
 * the native snapshot. Run it with `--accessibility always` so the platform tree exists without a screen reader.
 */
@bind()
export default class A11yMain extends Node {
  private surface: ReactUiRoot | null = null;
  private renderer: ReactRoot | null = null;
  /** Set only in a run that injects its own input (the verifier); a normal run takes real input. */
  private isolation: VerifierInputIsolation | null = null;

  override _ready(): void {
    const args = OS.getCmdlineUserArgs();
    const userArgs = Array.from({ length: args.size() }, (_, i) => args.get(i));
    // First, before the window can become the key window: see VerifierInputIsolation.
    if (injectsOwnInput(userArgs)) {
      const window = this.getWindow();
      if (!window) throw new Error('A verifier run requires its owning Window');
      // The window stays focusable: the flags that make it unfocusable also leave the platform tree empty.
      this.isolation = VerifierInputIsolation.begin(window, { restrictWindow: false });
    }
    this.mount();
    const api = {
      snapshot: (): NativeSnapshot => this.requireRenderer().getSnapshot(),
      find: (testID: string): NativeSnapshotNode | undefined => this.requireRenderer().findByTestID(testID),
      surface: (): ReactUiRoot => this.requireSurface(),
      /** What the engine says about accessibility: the facts the README records. */
      engine: () => ({
        screenReaderFeature: DisplayServer.hasFeature(DisplayServer.Feature.FeatureAccessibilityScreenReader),
        screenReaderActive: DisplayServer.accessibilityScreenReaderActive(),
        enabled: this.getTree()?.isAccessibilityEnabled() ?? false,
        supported: this.getTree()?.isAccessibilitySupported() ?? false,
      }),
    };
    Object.assign(globalThis, { godotReactA11y: api });
    console.log('GODOT_REACT_A11Y_READY');
    if (userArgs.includes('--verify-a11y')) {
      void runA11yVerification(api).then(() => { this.isolation?.report(); this.getTree()?.quit(); }).catch(error => {
        console.error('GODOT_REACT_VERIFY_FAILED', error instanceof Error ? error.message : String(error));
        this.isolation?.report();
        this.getTree()?.quit(1);
      });
    }
  }

  /** A foreign event should not reach an isolated window; one that does is dropped and recorded. */
  override _input(event: InputEvent): void {
    if (this.isolation?.rejects(event)) this.getViewport()?.setInputAsHandled();
  }

  _notification(what: number): void {
    this.isolation?.notify(what);
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
