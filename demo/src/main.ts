import { createElement } from 'react';
import { DisplayServer, Node, ReactUiRoot, OS, Vector2 } from 'godot';
import { createClassBinder } from 'godot.annotations';
import { createRoot, type ReactRoot } from '../../src';
import { App } from './app';
import { runVerification } from './verify';

const bind = createClassBinder();

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
    };
    // This demo-only inspection surface is also available in the Web JS realm.
    Object.assign(globalThis, { godotReactDemo: api });
    console.log('GODOT_REACT_DEMO_READY');
    const args = OS.getCmdlineUserArgs();
    const verify = Array.from({length:args.size()}, (_, i) => args.get(i)).includes('--verify');
    if (verify) {
      void runVerification(this, api).then(() => this.getTree()?.quit()).catch(error => {
        console.error('GODOT_REACT_VERIFY_FAILED', error instanceof Error ? error.stack : String(error));
        this.getTree()?.quit(1);
      });
    }
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
    const renderer = createRoot(surface);
    this.renderer = renderer;
    renderer.render(createElement(App));
  }

  private unmount(): void {
    if (!this.renderer || !this.surface) throw new Error('Demo is not mounted');
    this.renderer.unmount();
    this.renderer = null;
    this.surface.queueFree();
    this.surface = null;
  }

  override _process(): void {
    this.updateDisplayScale();
    if (!this.renderer || !this.surface) return;
    const viewport = this.getViewport();
    if (!viewport) throw new Error('Mounted demo lost its viewport');
    const size = viewport.getVisibleRect().size;
    if (size.x !== this.width || size.y !== this.height) {
      this.width = size.x;
      this.height = size.y;
      this.surface.size = new Vector2(this.width, this.height);
      this.renderer.refreshStyles();
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
