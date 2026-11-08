import { createElement } from 'react';
import {
  BaseMaterial3D, Callable, Camera3D, Color, DisplayServer, Image, InputEvent, InputEventKey, InputEventMouse,
  InputEventMouseButton, InputEventMouseMotion, InputEventScreenDrag, InputEventScreenTouch, MeshInstance3D,
  MouseButton, Node, OS, QuadMesh, ReactUiRoot, SphereMesh, StandardMaterial3D, SubViewport, Time, Vector2, Vector2I, Vector3,
} from 'godot';
import { createClassBinder } from 'godot.annotations';
import { createRoot, type NativeSnapshot, type NativeSnapshotNode, type ReactRoot } from '../../src';
import { cameraDistanceToFit, intersectQuad, quadPixelToLocal, type QuadHit, type QuadSurface } from './world-geometry';
import { AnchoredLabel, type Anchor } from './world-label';
import { WorldPanel } from './world-panel';
import { runWorldVerification } from './verify-world';
import { VerifierInputIsolation, injectsOwnInput } from './verifier-input';

const bind = createClassBinder();
const MICROSECONDS_PER_MILLISECOND = 1000;

/**
 * The panel's pixels: the coordinate space the React root lays out in and the input forwarded to it is given in. The
 * `SubViewport` renders them at `panelPixelScale` texture pixels each (`applyPanelResolution`).
 */
const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 320;
/** The quad's width in world units; the camera below is placed so that a panel pixel lands on about one screen pixel. */
const QUAD_WIDTH = 1.5;
/** Same aspect as the panel, so a panel pixel is square on the quad. */
const QUAD_HEIGHT = QUAD_WIDTH * PANEL_HEIGHT / PANEL_WIDTH;
/** Turned and tilted away from the camera on purpose: an axis-aligned quad would hide a wrong ray-plane mapping. */
const QUAD_ROTATION_DEGREES = { x: -8, y: 24, z: 0 };
/** Far enough that the quad fits the portrait window, near enough that a panel pixel is about a screen pixel. */
const CAMERA_POSITION = { x: 0, y: 0.25, z: 2.6 };
const CAMERA_FOV_DEGREES = 50;
const RADIANS_PER_DEGREE = Math.PI / 180;
/**
 * In a window too narrow for the quad (a phone) the camera backs away along its line of sight until the quad's width fits, with this
 * fraction of the half width to spare. The windows the verifiers use (600 x 900 and wider) already fit, so for them it stays where it was.
 */
const CAMERA_FIT_MARGIN = 0.03;
/** A backdrop behind the quad shows that the panel's transparent margin really is see-through. */
const BACKDROP_SIZE = { x: 9, y: 6 };
const BACKDROP_Z = -0.8;
/** Tailwind slate-300. */
const BACKDROP_COLOR = new Color(0.796, 0.835, 0.882, 1);

/** The node the anchored label follows: a small sphere in front of the quad, with a label above it. */
const ORBITER_RADIUS = 0.05;
/**
 * `#33b2e5`, a blue the label's amber is told apart from. Every channel is well above black: the Compatibility
 * renderer shades in 8 bits of linear colour, which cannot hold a dark channel (emerald-500's red, 16, came out as 11).
 */
const ORBITER_COLOR = new Color(51 / 255, 178 / 255, 229 / 255, 1);
const ORBITER_TITLE = 'Orbiter';
/**
 * Its path, drawn in the panel's own pixels (so the node circles the card's top edge, through the inverse mapping
 * of `world-geometry.ts`) and lifted off the quad along its normal, in world units.
 */
const ORBIT_CENTER_PIXEL = { x: PANEL_WIDTH / 2, y: 36 };
const ORBIT_RADIUS_PIXEL = { x: 190, y: 28 };
const ORBIT_HEIGHT = 0.3;
/** Radians per second. */
const ORBIT_SPEED = 1.2;

/** Narrowing: `copy` is an instance of exactly the class `original` is. */
function isSameClass<T extends InputEvent>(copy: InputEvent, original: T): copy is T {
  return Object.getPrototypeOf(copy) === Object.getPrototypeOf(original);
}

/**
 * `event` copied, every field included (modifiers, button mask, double click, ...). The original may still
 * be on its way to other nodes, so the position is rewritten on the copy.
 */
function copyEvent<T extends InputEvent>(event: T): T {
  const copy = event.duplicate();
  if (!(copy instanceof InputEvent) || !isSameClass(copy, event)) throw new Error('InputEvent.duplicate() returned a different class');
  return copy;
}

function isWheelButton(button: MouseButton): boolean {
  return button === MouseButton.MouseButtonWheelUp || button === MouseButton.MouseButtonWheelDown
    || button === MouseButton.MouseButtonWheelLeft || button === MouseButton.MouseButtonWheelRight;
}

/** What the "game" behind the panel saw, for the verifier: input nothing consumed. */
export interface WorldCounts {
  /** Primary mouse presses and touch contacts no panel consumed. */
  gamePresses: number;
  /** Key presses (not echoes) no panel consumed. */
  gameKeys: number;
  /** Pointer and wheel events the panel's root heard. */
  panelPointerEvents: number;
  /** Whether the pointer is currently inside the quad, as far as the owner has told the SubViewport. */
  pointerInside: boolean;
}

/** A point in the panel, in `SubViewport` pixels, or in the main viewport: a plain object, so it can leave the realm. */
export interface Point2 {
  x: number;
  y: number;
}

/** A point in the world: a plain object, so it can leave the realm. */
export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** What the camera makes of the orbiter, by the same call the label is placed with. */
export interface OrbiterReading {
  world: Point3;
  /** `Camera3D.unprojectPosition` of the node's global position. */
  screen: Point2;
  /** `Camera3D.isPositionBehind`: then `screen` is mirrored and the label is hidden. */
  behind: boolean;
}

/**
 * One Godot node owns the 3D scene, the panel's `SubViewport`, the React root inside it, and the routing
 * of main-viewport input onto the panel. Nothing here needs physics: the camera ray is intersected with the
 * quad's plane analytically (`world-geometry.ts`), because Breaka's Web engine has no 3D physics.
 */
@bind()
export default class WorldMain extends Node {
  private camera: Camera3D | null = null;
  /** The window aspect the camera was last placed for (`fitCamera`); 0 before it was placed. */
  private cameraFitAspect = 0;
  private quad: MeshInstance3D | null = null;
  private panelViewport: SubViewport | null = null;
  private surface: ReactUiRoot | null = null;
  private renderer: ReactRoot | null = null;
  private readonly web = OS.hasFeature('web');
  private readonly panel: QuadSurface = {
    width: QUAD_WIDTH, height: QUAD_HEIGHT, pixelWidth: PANEL_WIDTH, pixelHeight: PANEL_HEIGHT,
  };
  /** Texture pixels per panel pixel the `SubViewport` renders at now, and the scale a caller asked for in place of the window's. */
  private panelPixelScale = 1;
  private panelScaleOverride: number | null = null;
  /** Whether the pointer is inside the quad as the panel's viewport has been told (enter/exit pair up). */
  private pointerInside = false;
  /** Mouse buttons pressed on the panel and not yet released: their motion and release are routed wherever they go. */
  private readonly heldButtons = new Set<MouseButton>();
  /** Where the last mouse event routed to the panel landed, for `relative` and for a release with no ray hit. */
  private lastMousePixel: Vector2 | null = null;
  /** Fingers that went down on the panel, by touch index, with the panel pixel they were last at. */
  private readonly touches = new Map<number, Vector2>();
  private counts: WorldCounts = { gamePresses: 0, gameKeys: 0, panelPointerEvents: 0, pointerInside: false };
  /** Set only in a run that injects its own input (the verifier); a normal run takes real input. */
  private isolation: VerifierInputIsolation | null = null;
  /** The node in front of the quad that the label follows, a child of the quad so it moves with it. */
  private orbiter: MeshInstance3D | null = null;
  private orbitPhase = 0;
  private orbiting = true;
  /** The second root, in the main viewport: screen-space UI over the 3D view, one label in it. */
  private labelSurface: ReactUiRoot | null = null;
  private labelRenderer: ReactRoot | null = null;
  private anchor: Anchor = { x: 0, y: 0, visible: false };

  override _ready(): void {
    const args = OS.getCmdlineUserArgs();
    const userArgs = Array.from({ length: args.size() }, (_, i) => args.get(i));
    // First, before the window can become the key window: see VerifierInputIsolation.
    if (injectsOwnInput(userArgs)) {
      const window = this.getWindow();
      if (!window) throw new Error('A verifier run requires its owning Window');
      this.isolation = VerifierInputIsolation.begin(window);
    }
    this.updateDisplayScale();
    this.buildScene();
    this.mount();
    this.mountLabel();
    const api = {
      snapshot: (): NativeSnapshot => this.requireRenderer().getSnapshot(),
      find: (testID: string): NativeSnapshotNode | undefined => this.requireRenderer().findByTestID(testID),
      mount: () => this.mount(),
      unmount: () => this.unmount(),
      counts: (): WorldCounts => ({ ...this.counts, pointerInside: this.pointerInside }),
      resetCounts: () => { this.counts = { gamePresses: 0, gameKeys: 0, panelPointerEvents: 0, pointerInside: false }; },
      /** Deliver the notification the window system sends when the cursor leaves the window. */
      simulateWindowMouseExit: () => {
        this.isolation?.expectSimulated(Node.NOTIFICATION_WM_MOUSE_EXIT);
        this.notification(Node.NOTIFICATION_WM_MOUSE_EXIT);
      },
      /** The panel pixel under a main-viewport point, by the same ray the input routing uses. */
      panelPixelAt: (x: number, y: number): (Point2 & { inside: boolean }) | undefined => {
        const hit = this.pick(new Vector2(x, y));
        return hit === undefined ? undefined : { x: hit.x, y: hit.y, inside: hit.inside };
      },
      /** The main-viewport point at which a panel pixel is drawn: the inverse of `panelPixelAt`. */
      screenPointOf: (x: number, y: number): Point2 => this.screenPointOf(x, y),
      panelSize: (): Point2 => ({ x: PANEL_WIDTH, y: PANEL_HEIGHT }),
      /** Texture pixels the panel renders at per panel pixel now. */
      panelPixelScale: (): number => this.panelPixelScale,
      /** Render the panel at `scale` texture pixels per panel pixel; `null` follows the window's content scale again. */
      setPanelPixelScale: (scale: number | null) => {
        this.panelScaleOverride = scale;
        this.updatePanelResolution();
      },
      /** The main viewport's logical size: the coordinate space of `screenPointOf`. */
      viewportSize: (): Point2 => {
        const viewport = this.getViewport();
        if (!viewport) throw new Error('World requires a viewport');
        const size = viewport.getVisibleRect().size;
        return { x: size.x, y: size.y };
      },
      surfaceHasFocus: (): boolean => this.requireSurface().hasFocus(),
      grabSurfaceFocus: () => this.requireSurface().grabFocus(),
      /** The screen-space root that holds the anchored label (a second root, in the main viewport). */
      labelSnapshot: (): NativeSnapshot => this.requireLabelRenderer().getSnapshot(),
      findInLabel: (testID: string): NativeSnapshotNode | undefined => this.requireLabelRenderer().findByTestID(testID),
      /**
       * Stop the orbit and put the orbiter at a panel pixel, `height` world units in front of the quad. Height 0 is on
       * the quad's plane: the same point `screenPointOf` projects.
       */
      placeOrbiter: (x: number, y: number, height: number) => {
        this.orbiting = false;
        this.placeOrbiterAtPanelPixel(x, y, height);
        this.updateAnchoredLabel();
      },
      /** Stop the orbit and put the orbiter at a world position (behind the camera, say). */
      placeOrbiterInWorld: (x: number, y: number, z: number) => {
        this.orbiting = false;
        this.requireOrbiter().globalPosition = new Vector3(x, y, z);
        this.updateAnchoredLabel();
      },
      resumeOrbit: () => { this.orbiting = true; },
      /** Where the camera puts the orbiter now, by the call the label uses. */
      orbiterScreen: (): OrbiterReading => this.readOrbiter(),
      cameraPosition: (): Point3 => {
        const position = this.requireCamera().globalPosition;
        return { x: position.x, y: position.y, z: position.z };
      },
      /** The panel's own render target, as the quad's material samples it. */
      panelImage: (): Image => {
        const image = this.requirePanelViewport().getTexture()?.getImage();
        if (!image) throw new Error('The panel viewport has no image to read');
        return image;
      },
    };
    // This demo-only inspection surface is also available in the Web JS realm.
    Object.assign(globalThis, { godotReactWorld: api });
    console.log('GODOT_REACT_WORLD_READY');
    if (userArgs.includes('--verify-world')) {
      void runWorldVerification(this, api).then(() => { this.isolation?.report(); this.getTree()?.quit(); }).catch(error => {
        console.error('GODOT_REACT_VERIFY_FAILED', error instanceof Error ? error.stack : String(error));
        this.isolation?.report();
        this.getTree()?.quit(1);
      });
    }
  }

  /** Web: the canvas is sized in device pixels, so the window divides its logical size by the ratio. */
  private updateDisplayScale(): void {
    if (!this.web) return;
    const window = this.getWindow();
    if (!window) throw new Error('Web demo requires its owning Window');
    const scale = DisplayServer.screenGetScale();
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid display scale');
    if (window.contentScaleFactor !== scale) window.contentScaleFactor = scale;
  }

  /**
   * The panel's texture is as many pixels per panel pixel as the window has device pixels per logical pixel, which is
   * about right for a quad about as large on screen as its panel (the camera below puts a panel pixel on 0.95 to 1.07
   * screen pixels). The `SubViewport`'s stretched 2D override makes the root's text and edges draw at that scale
   * (`Viewport::get_oversampling`, which native reads), so a panel on a high-DPI screen is as sharp as the screen is.
   */
  private updatePanelResolution(): void {
    const scale = this.panelScaleOverride ?? this.getWindow()?.contentScaleFactor ?? 1;
    if (this.panelViewport === null || scale === this.panelPixelScale) return;
    this.applyPanelResolution(this.panelViewport, scale);
  }

  private applyPanelResolution(viewport: SubViewport, scale: number): void {
    if (!Number.isFinite(scale) || scale <= 0) throw new Error(`Invalid panel pixel scale ${scale}`);
    this.panelPixelScale = scale;
    viewport.size = new Vector2I(Math.round(PANEL_WIDTH * scale), Math.round(PANEL_HEIGHT * scale));
  }

  private buildScene(): void {
    const camera = new Camera3D();
    camera.setName('Camera');
    camera.fov = CAMERA_FOV_DEGREES;
    this.addChild(camera);
    camera.current = true;
    this.camera = camera;
    this.fitCamera(this.viewportSize());

    this.addChild(this.createBackdrop());

    // The panel renders into its own SubViewport; the quad shows that viewport's texture.
    const viewport = new SubViewport();
    viewport.setName('PanelViewport');
    // The 2D override is the panel's own size and stretch is on, so the viewport can be rendered at more texture pixels
    // than that (`applyPanelResolution`) while the root, the input and every position stay in panel pixels.
    viewport.size2DOverride = new Vector2I(PANEL_WIDTH, PANEL_HEIGHT);
    viewport.size2DOverrideStretch = true;
    viewport.size = new Vector2I(PANEL_WIDTH, PANEL_HEIGHT);
    viewport.transparentBg = true;
    viewport.renderTargetUpdateMode = SubViewport.UpdateMode.UpdateAlways;
    this.addChild(viewport);
    this.panelViewport = viewport;

    const material = new StandardMaterial3D();
    material.shadingMode = BaseMaterial3D.ShadingMode.ShadingModeUnshaded;
    material.transparency = BaseMaterial3D.Transparency.TransparencyAlpha;
    // Canvas items drawn into a transparent viewport leave premultiplied colour at their antialiased edges
    // (rgb already scaled by alpha). The default blend would scale it again and darken every edge.
    material.blendMode = BaseMaterial3D.BlendMode.BlendModePremultAlpha;
    material.textureFilter = BaseMaterial3D.TextureFilter.TextureFilterLinear;
    material.albedoTexture = viewport.getTexture();
    const mesh = new QuadMesh();
    mesh.size = new Vector2(QUAD_WIDTH, QUAD_HEIGHT);
    const quad = new MeshInstance3D();
    quad.setName('PanelQuad');
    quad.mesh = mesh;
    quad.materialOverride = material;
    quad.rotationDegrees = new Vector3(QUAD_ROTATION_DEGREES.x, QUAD_ROTATION_DEGREES.y, QUAD_ROTATION_DEGREES.z);
    this.addChild(quad);
    this.quad = quad;

    // A child of the quad, so it is placed in the panel's own frame and turns with it.
    const orbiterMaterial = new StandardMaterial3D();
    orbiterMaterial.shadingMode = BaseMaterial3D.ShadingMode.ShadingModeUnshaded;
    orbiterMaterial.albedoColor = ORBITER_COLOR;
    const orbiterMesh = new SphereMesh();
    orbiterMesh.radius = ORBITER_RADIUS;
    orbiterMesh.height = ORBITER_RADIUS * 2;
    const orbiter = new MeshInstance3D();
    orbiter.setName('Orbiter');
    orbiter.mesh = orbiterMesh;
    orbiter.materialOverride = orbiterMaterial;
    quad.addChild(orbiter);
    this.orbiter = orbiter;
    this.placeOrbiterOnOrbit();
  }

  private createBackdrop(): MeshInstance3D {
    const material = new StandardMaterial3D();
    material.shadingMode = BaseMaterial3D.ShadingMode.ShadingModeUnshaded;
    material.albedoColor = BACKDROP_COLOR;
    const mesh = new QuadMesh();
    mesh.size = new Vector2(BACKDROP_SIZE.x, BACKDROP_SIZE.y);
    const backdrop = new MeshInstance3D();
    backdrop.setName('Backdrop');
    backdrop.mesh = mesh;
    backdrop.materialOverride = material;
    backdrop.position = new Vector3(0, 0, BACKDROP_Z);
    return backdrop;
  }

  private mount(): void {
    if (this.renderer) throw new Error('World is already mounted');
    const viewport = this.requirePanelViewport();
    const surface = new ReactUiRoot();
    surface.setName('WorldSurface');
    viewport.addChild(surface);
    surface.size = new Vector2(PANEL_WIDTH, PANEL_HEIGHT);
    this.surface = surface;
    const renderer = createRoot(surface, {
      now: () => Time.getTicksUsec() / MICROSECONDS_PER_MILLISECOND,
      // As in the main demo: native emits eventsReady from inside its input callbacks, and a GodotJS
      // Callable holds its function strongly, so unmount() must disconnect it.
      subscribeToEvents: (listener) => {
        const callable = Callable.create(listener);
        surface.eventsReady.connect(callable);
        return () => surface.eventsReady.disconnect(callable);
      },
    });
    this.renderer = renderer;
    for (const type of ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'click', 'wheel'] as const) {
      renderer.addEventListener(type, () => { this.counts.panelPointerEvents += 1; });
    }
    renderer.render(createElement(WorldPanel));
  }

  private unmount(): void {
    if (!this.renderer || !this.surface) throw new Error('World is not mounted');
    // The pointer leaves while the root still exists, so its hover is cleared natively. Then React cleanup,
    // then the node: the renderer releases the native subtree it owns.
    this.leavePanel();
    this.renderer.unmount();
    this.renderer = null;
    this.surface.queueFree();
    this.surface = null;
    this.heldButtons.clear();
    this.touches.clear();
    this.lastMousePixel = null;
  }

  override _process(delta: number): void {
    this.updateDisplayScale();
    this.updatePanelResolution();
    this.renderer?.dispatchEvents();
    this.labelRenderer?.dispatchEvents();
    if (this.orbiting) {
      this.orbitPhase += delta * ORBIT_SPEED;
      this.placeOrbiterOnOrbit();
    }
    const size = this.viewportSize();
    this.fitCamera(size);
    this.fitLabelSurface(size);
    this.updateAnchoredLabel();
  }

  override _exitTree(): void {
    if (this.renderer) this.unmount();
    this.unmountLabel();
    Reflect.deleteProperty(globalThis, 'godotReactWorld');
  }

  // ---- The anchored label -----------------------------------------------------------------------------

  /**
   * A second React root: a full-window `ReactUiRoot` in the main viewport, over the 3D view, that holds one label.
   * Everything in it is `pointer-events-none`, so Godot gives every pointer to whatever lies beneath (here the
   * routing to the quad), and it takes no key focus.
   */
  private mountLabel(): void {
    if (this.labelRenderer) throw new Error('The label root is already mounted');
    const surface = new ReactUiRoot();
    surface.setName('LabelSurface');
    this.addChild(surface);
    surface.size = this.viewportSize();
    this.labelSurface = surface;
    this.labelRenderer = createRoot(surface, {
      now: () => Time.getTicksUsec() / MICROSECONDS_PER_MILLISECOND,
      subscribeToEvents: (listener) => {
        const callable = Callable.create(listener);
        surface.eventsReady.connect(callable);
        return () => surface.eventsReady.disconnect(callable);
      },
    });
    this.updateAnchoredLabel(true);
  }

  private unmountLabel(): void {
    if (!this.labelRenderer || !this.labelSurface) return;
    this.labelRenderer.unmount();
    this.labelRenderer = null;
    this.labelSurface.queueFree();
    this.labelSurface = null;
  }

  private viewportSize(): Vector2 {
    const viewport = this.getViewport();
    if (!viewport) throw new Error('World requires a viewport');
    return viewport.getVisibleRect().size;
  }

  /**
   * Put the camera where the quad fits the window's width: where it always was, or further back along its line of sight in a window narrower
   * than that (`cameraDistanceToFit`). Placed again when the window's aspect changes.
   */
  private fitCamera(size: Vector2): void {
    // A minimised window has no aspect to fit; the camera keeps its place until it has one.
    if (size.x <= 0 || size.y <= 0) return;
    const aspect = size.x / size.y;
    if (aspect === this.cameraFitAspect) return;
    this.cameraFitAspect = aspect;
    const needed = cameraDistanceToFit(QUAD_WIDTH, QUAD_ROTATION_DEGREES.y * RADIANS_PER_DEGREE, CAMERA_FOV_DEGREES * RADIANS_PER_DEGREE, aspect, CAMERA_FIT_MARGIN);
    const scale = Math.max(1, needed / CAMERA_POSITION.z);
    this.requireCamera().lookAtFromPosition(
      new Vector3(CAMERA_POSITION.x * scale, CAMERA_POSITION.y * scale, CAMERA_POSITION.z * scale), new Vector3(0, 0, 0),
    );
  }

  /** The label root fills the window, like the demo's: it follows the window's size. */
  private fitLabelSurface(size: Vector2): void {
    const surface = this.labelSurface;
    if (surface === null) return;
    if (surface.size.x !== size.x || surface.size.y !== size.y) surface.size = size;
  }

  /** Put the orbiter on its path: panel pixels turned into the quad's local frame by the inverse mapping. */
  private placeOrbiterOnOrbit(): void {
    this.placeOrbiterAtPanelPixel(
      ORBIT_CENTER_PIXEL.x + ORBIT_RADIUS_PIXEL.x * Math.cos(this.orbitPhase),
      ORBIT_CENTER_PIXEL.y + ORBIT_RADIUS_PIXEL.y * Math.sin(this.orbitPhase),
      ORBIT_HEIGHT,
    );
  }

  private placeOrbiterAtPanelPixel(x: number, y: number, height: number): void {
    const local = quadPixelToLocal(this.panel, x, y);
    this.requireOrbiter().position = new Vector3(local.x, local.y, local.z + height);
  }

  private readOrbiter(): OrbiterReading {
    const camera = this.requireCamera();
    const world = this.requireOrbiter().globalPosition;
    const screen = camera.unprojectPosition(world);
    return { world: { x: world.x, y: world.y, z: world.z }, screen: { x: screen.x, y: screen.y }, behind: camera.isPositionBehind(world) };
  }

  /**
   * Project the orbiter into the main viewport and give the label the result. A node behind the camera projects to
   * a mirrored point (`unprojectPosition` does not say), so it hides the label and keeps the last place.
   */
  private updateAnchoredLabel(force = false): void {
    const renderer = this.labelRenderer;
    if (renderer === null) return;
    const reading = this.readOrbiter();
    const next: Anchor = reading.behind
      ? { x: this.anchor.x, y: this.anchor.y, visible: false }
      : { x: reading.screen.x, y: reading.screen.y, visible: true };
    if (!force && next.x === this.anchor.x && next.y === this.anchor.y && next.visible === this.anchor.visible) return;
    this.anchor = next;
    renderer.render(createElement(AnchoredLabel, { anchor: next, title: ORBITER_TITLE }));
  }

  /** `NOTIFICATION_WM_MOUSE_EXIT` leaves no motion event behind, so tell the panel the pointer is gone. */
  _notification(what: number): void {
    this.isolation?.notify(what);
    if (what === Node.NOTIFICATION_WM_MOUSE_EXIT) this.leavePanel();
  }

  /** A foreign event should not reach an isolated window; one that does is dropped and recorded. */
  override _input(event: InputEvent): void {
    if (this.isolation?.rejects(event)) this.getViewport()?.setInputAsHandled();
  }

  // ---- Input routing --------------------------------------------------------------------------------

  /**
   * Everything the main viewport's GUI left unhandled lands here: the panel gets first refusal and, when it
   * consumes the event, the game behind it does not see it.
   */
  override _unhandledInput(event: InputEvent): void {
    // Godot also turns real touches into mouse events (`emulate_mouse_from_touch`, device -1). The touch is
    // what is routed; the emulated mouse press that comes with it would be a second press.
    if (event.device === InputEvent.DEVICE_ID_EMULATION) return;
    if (this.routeToPanel(event)) {
      this.getViewport()?.setInputAsHandled();
      return;
    }
    if (event instanceof InputEventMouseButton && event.pressed && event.buttonIndex === MouseButton.MouseButtonLeft) {
      this.counts.gamePresses += 1;
    } else if (event instanceof InputEventScreenTouch && event.pressed) {
      this.counts.gamePresses += 1;
    } else if (event instanceof InputEventKey && event.pressed && !event.echo) {
      this.counts.gameKeys += 1;
    }
  }

  /** Whether the panel consumed `event`. */
  private routeToPanel(event: InputEvent): boolean {
    if (event instanceof InputEventMouse) return this.routeMouse(event);
    if (event instanceof InputEventScreenTouch) return this.routeTouch(event);
    if (event instanceof InputEventScreenDrag) return this.routeDrag(event);
    if (event instanceof InputEventKey) return this.routeKey(event);
    return false;
  }

  /**
   * Where a main-viewport point lands on the panel: the camera's ray through it, moved into the quad's local
   * space and meeting its `z = 0` plane. Misses (`undefined`) when the ray is parallel to the plane, the
   * plane is behind the camera, or the ray meets the quad's back.
   */
  private pick(screen: Vector2): QuadHit | undefined {
    const camera = this.requireCamera();
    const quad = this.requireQuad();
    const origin = camera.projectRayOrigin(screen);
    const direction = camera.projectRayNormal(screen);
    const tip = new Vector3(origin.x + direction.x, origin.y + direction.y, origin.z + direction.z);
    // A direction is a difference of two points, so `toLocal` (which applies the inverse of the quad's
    // global transform to a point) moves the whole ray, scale and rotation included.
    const localOrigin = quad.toLocal(origin);
    const localTip = quad.toLocal(tip);
    const hit = intersectQuad(
      localOrigin,
      { x: localTip.x - localOrigin.x, y: localTip.y - localOrigin.y, z: localTip.z - localOrigin.z },
      this.panel,
    );
    return hit !== undefined && hit.frontFacing ? hit : undefined;
  }

  private screenPointOf(x: number, y: number): Point2 {
    const camera = this.requireCamera();
    const local = quadPixelToLocal(this.panel, x, y);
    const world = this.requireQuad().toGlobal(new Vector3(local.x, local.y, local.z));
    if (camera.isPositionBehind(world)) throw new Error(`Panel pixel ${x},${y} is behind the camera`);
    const screen = camera.unprojectPosition(world);
    return { x: screen.x, y: screen.y };
  }

  /** The pointer entered the quad: Godot's own pair for a viewport shown outside a `SubViewportContainer`. */
  private enterPanel(): void {
    if (this.pointerInside) return;
    this.requirePanelViewport().notifyMouseEntered();
    this.pointerInside = true;
  }

  /**
   * The pointer left the quad (or the window). The panel clears hover through the notification Godot sends a
   * root when its viewport loses the mouse; a press that is still held keeps its mouse focus, as in a window.
   */
  private leavePanel(): void {
    if (!this.pointerInside) return;
    this.pointerInside = false;
    const viewport = this.panelViewport;
    if (viewport !== null && viewport.isInsideTree()) viewport.notifyMouseExited();
  }

  /**
   * Whether the panel is to see a mouse event. A press must land on the panel; what follows it (motion, the
   * release of a button it pressed) is routed wherever the ray lands, so a drag that leaves the quad still
   * ends on the button it started on, as in a window. Wheel ticks are a press and a release at once and are
   * not "held".
   */
  private shouldRouteMouse(event: InputEventMouse, hit: QuadHit | undefined): boolean {
    const inside = hit?.inside === true;
    if (!(event instanceof InputEventMouseButton)) return inside || (this.heldButtons.size > 0 && hit !== undefined);
    if (isWheelButton(event.buttonIndex)) return inside;
    return event.pressed ? inside : this.heldButtons.has(event.buttonIndex);
  }

  private routeMouse(event: InputEventMouse): boolean {
    const viewport = this.requirePanelViewport();
    const hit = this.pick(event.position);
    if (hit?.inside === true) this.enterPanel(); else this.leavePanel();
    if (!this.shouldRouteMouse(event, hit)) return false;

    const last = this.lastMousePixel;
    const pixel = hit !== undefined ? new Vector2(hit.x, hit.y) : last;
    if (pixel === null) throw new Error('A mouse event was routed to the panel before any pixel was known');
    const copy = copyEvent(event);
    copy.position = pixel;
    copy.globalPosition = pixel;
    if (copy instanceof InputEventMouseMotion) {
      copy.relative = last === null ? new Vector2(0, 0) : new Vector2(pixel.x - last.x, pixel.y - last.y);
    }
    if (event instanceof InputEventMouseButton && !isWheelButton(event.buttonIndex)) {
      if (event.pressed) this.heldButtons.add(event.buttonIndex); else this.heldButtons.delete(event.buttonIndex);
    }
    this.lastMousePixel = pixel;
    viewport.pushInput(copy, true);
    return viewport.isInputHandled();
  }

  private routeTouch(event: InputEventScreenTouch): boolean {
    const viewport = this.requirePanelViewport();
    const known = this.touches.get(event.index);
    const hit = this.pick(event.position);
    // Like a press, a touch starts on the panel or not at all; its drags and its end follow it anywhere.
    if (event.pressed ? hit?.inside !== true : known === undefined) return false;
    const pixel = hit !== undefined ? new Vector2(hit.x, hit.y) : known;
    if (pixel === undefined) throw new Error('A touch was routed to the panel before any pixel was known');
    const copy = copyEvent(event);
    copy.position = pixel;
    if (event.pressed) this.touches.set(event.index, pixel); else this.touches.delete(event.index);
    viewport.pushInput(copy, true);
    return viewport.isInputHandled();
  }

  private routeDrag(event: InputEventScreenDrag): boolean {
    const viewport = this.requirePanelViewport();
    const known = this.touches.get(event.index);
    const hit = this.pick(event.position);
    if (known === undefined || hit === undefined) return false;
    const pixel = new Vector2(hit.x, hit.y);
    const copy = copyEvent(event);
    copy.position = pixel;
    copy.relative = new Vector2(pixel.x - known.x, pixel.y - known.y);
    this.touches.set(event.index, pixel);
    viewport.pushInput(copy, true);
    return viewport.isInputHandled();
  }

  /** Keys follow focus: they reach the panel only while its root holds key focus inside the SubViewport. */
  private routeKey(event: InputEventKey): boolean {
    const surface = this.surface;
    if (surface === null || !surface.hasFocus()) return false;
    const viewport = this.requirePanelViewport();
    viewport.pushInput(event, true);
    return viewport.isInputHandled();
  }

  // ---- Lookups -------------------------------------------------------------------------------------

  private requireCamera(): Camera3D {
    if (!this.camera) throw new Error('World camera is not built');
    return this.camera;
  }

  private requireQuad(): MeshInstance3D {
    if (!this.quad) throw new Error('World quad is not built');
    return this.quad;
  }

  private requirePanelViewport(): SubViewport {
    if (!this.panelViewport) throw new Error('World panel viewport is not built');
    return this.panelViewport;
  }

  private requireRenderer(): ReactRoot {
    if (!this.renderer) throw new Error('World renderer is not mounted');
    return this.renderer;
  }

  private requireSurface(): ReactUiRoot {
    if (!this.surface) throw new Error('World surface is not mounted');
    return this.surface;
  }

  private requireOrbiter(): MeshInstance3D {
    if (!this.orbiter) throw new Error('World orbiter is not built');
    return this.orbiter;
  }

  private requireLabelRenderer(): ReactRoot {
    if (!this.labelRenderer) throw new Error('World label root is not mounted');
    return this.labelRenderer;
  }
}
