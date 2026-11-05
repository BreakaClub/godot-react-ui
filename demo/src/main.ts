import { createElement } from 'react';
import { Callable, DirAccess, DisplayServer, Engine, FileAccess, Node, ReactUiRoot, OS, Time, Vector2 } from 'godot';
import { createClassBinder } from 'godot.annotations';
import { createRoot, readActivity, takeNativeProfile, type ReactRoot } from '../../src';
import { App } from './app';
import { setLabOwner } from './interaction-lab';
import { observeInputFailure, runVerification } from './verify';
import { BenchmarkApp, type BenchmarkProps } from './benchmark';
import { runProbe } from './probe';
import { runInteractionVerification } from './verify-interaction';
import { runMotionVerification } from './verify-motion';

const bind = createClassBinder();
const MICROSECONDS_PER_MILLISECOND = 1000;

/** One Godot node owns the renderer and its lifetime on native and Web. */
@bind()
export default class Main extends Node {
  private surface: ReactUiRoot | null = null;
  private renderer: ReactRoot | null = null;
  private width = 0;
  private height = 0;
  private readonly web = OS.hasFeature('web');

  override _ready(): void {
    this.updateDisplayScale();
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
    const args = OS.getCmdlineUserArgs();
    const verify = Array.from({length:args.size()}, (_, i) => args.get(i)).includes('--verify');
    const verifyMotion = Array.from({length:args.size()}, (_, i) => args.get(i)).includes('--verify-motion');
    const verifyInteraction = Array.from({length:args.size()}, (_, i) => args.get(i)).includes('--verify-interaction');
    if (Array.from({length:args.size()}, (_, i) => args.get(i)).includes('--probe')) {
      void runProbe().then(result => this.writeProbeResult(result)).then(() => this.getTree()?.quit()).catch(error => {
        console.error('GODOT_REACT_PROBE_FAILED', error instanceof Error ? error.stack : String(error));
        this.getTree()?.quit(1);
      });
    }
    if (verify || verifyMotion || verifyInteraction) {
      const verification = verifyMotion ? runMotionVerification(this, api)
        : verifyInteraction ? runInteractionVerification(this, api) : runVerification(this, api);
      void verification.then(() => this.getTree()?.quit()).catch(async error => {
        console.error('GODOT_REACT_VERIFY_FAILED', error instanceof Error ? error.stack : String(error));
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
    const viewport = this.getViewport();
    if (!viewport) throw new Error('Demo requires a viewport');
    const size = viewport.getVisibleRect().size;
    surface.size = size;
    this.width = size.x;
    this.height = size.y;
    this.surface = surface;
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
      this.width = size.x;
      this.height = size.y;
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
