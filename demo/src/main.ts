import { createElement, type ReactElement } from 'react';
import {
  BaseMaterial3D, BoxMesh, Callable, Camera3D, Color, ColorRect, Control, DirAccess, DisplayServer, Engine, FileAccess, InputEvent, InputEventKey,
  InputEventMouseButton, InputEventPanGesture, InputMap, JavaScriptBridge, Label, MeshInstance3D, MouseButton, Node, Node3D, ReactUiRoot, OS, StandardMaterial3D,
  StyleBoxFlat, Input, Time, Transform2D, Vector2, Vector2I, Vector3, Window,
} from 'godot';
import { createClassBinder } from 'godot.annotations';
import { createRoot, readActivity, takeNativeProfile, type ReactRoot, type UIHandle } from '../../src';
import { findTag, readCaretRect, readNodeRect, readOffsetAtPoint, readRangeRects, type TextSide } from '../../src/native';
import { App, getDemoLifecycle } from './app';
import { setLabOwner } from './interaction-lab';
import { demoStart, type DemoStart } from './launch';
import { LABS, findLab, labElement, labsInOrder, type Lab, type LabName, type SceneLab } from './labs';
import { PaintLab } from './paint-lab';
import { Navigator, type NavigatorProps } from './navigator';
import { openSceneWithBack } from './scene-return';
import { registerDemoFonts } from './demo-fonts';
import { FiltersLab, type FiltersLabProps } from './filters-lab';
import { selectionLabControls } from './selection-lab';
import { LayoutUtilitiesLab, TransitionClassesLab, type LayoutUtilitiesPage } from './layout-utilities-lab';
import { RichTextLab, richTextHandles, type RichTextLabProps } from './rich-text-lab';
import { installDemoFontSlices, type DemoFontSlices } from './font-fallback';
import { FontSlicesLab, type FontSlicesLabProps } from './font-slices-lab';
import { currentFontSlices, installedFontSlices } from './font-slices-store';
import { TextStylesLab } from './text-styles-lab';
import { observeInputFailure, runVerification } from './verify';
import { BenchmarkApp, type BenchmarkProps } from './benchmark';
import { runProbe } from './probe';
import { openLiveSession } from './live-compile-open';
import { openExtensionHost, readProject } from './live-compile-host';
import type { ExtensionHost } from './live-compile-service';
import type { CodeSupport } from './editor/lab-code';
import { verifyLiveCompile } from './verify-live-compile';
import { installRefreshHook } from './live-compile-refresh';

/** `--logical-viewport=WxH` (after `--`): the size the render target and the root have, whatever the window's. */
const LOGICAL_VIEWPORT_ARGUMENT = '--logical-viewport=';
import { installKeystrokeProfile } from './profile-keystrokes';
import { runInteractionVerification } from './verify-interaction';
import { runMotionVerification } from './verify-motion';
import { VerifierInputIsolation, injectsOwnInput } from './verifier-input';

const bind = createClassBinder();
const MICROSECONDS_PER_MILLISECOND = 1000;
const BACKDROP_COLOR = new Color(0.86, 0.9, 0.84, 1);
/**
 * The tag the backdrop draws where it saw a press (the HUD lab, docs/tracks/lab-clarity.md): the one thing on screen that shows a press went
 * through the React root to the Godot scene behind it. A slate-900 pill with white text, the colours the scene-return button uses.
 */
const PRESS_TAG_FILL = new Color(0.059, 0.09, 0.165, 0.9);
const PRESS_TAG_PADDING = 8;
const PRESS_TAG_CORNER_RADIUS = 12;
/** How far down and right of the press the tag sits, so that the pointer does not cover it. */
const PRESS_TAG_OFFSET = 14;
/** What a verifier may configure the font slice loader with: the language the text is in, and where the manifest is. */
interface FontSliceSettings {
  readonly language?: string;
  readonly manifestUrl?: string;
}

/** What the verifier may ask of the navigator: its props, and labs of its own after the demo's (the registry here is this bundle's, not the verifier's). */
export type NavigatorOptions = Omit<NavigatorProps, 'labs'> & { extraLabs?: readonly Lab[] };

/** How long the navigator leaves the window empty after a lab asked for the root to be unmounted or detached, before it puts it back. */
const ROOT_RECOVERY_DELAY_MS = 600;

/**
 * The lab the navigator was on when it left for a scene of its own. The scene's Back button changes to the main scene again, which
 * is a new `Main`; this module outlives it, so the navigator comes back where it was.
 */
let resumeLab: string | undefined;

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

/** The tag of the text with a test id, for the geometry queries the verifiers make through the demo's API (any text in the tree). */
function textTag(surface: ReactUiRoot, testID: string): number {
  const tag = findTag(surface, testID);
  if (tag === undefined) throw new Error(`There is no element with test id ${testID}`);
  return tag;
}

/** A text of the rich text lab by its test id, for the geometry queries the Web verifier makes through the demo's API. */
function richTextHandle(testID: string): UIHandle {
  const handle = richTextHandles.get(testID);
  if (handle === undefined) throw new Error(`The rich text lab has no text ${testID}`);
  return handle;
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
  /** The backdrop's tag of the last press it saw (`passthrough.backdropPresses`), hidden until it sees one. */
  private pressTag: Label | null = null;
  private pointerCancels = 0;
  /** `wheel` events that reached the root's own listener (every wheel tick or pan JS was shown). */
  private wheelEvents = 0;
  private rootKeys: string[] = [];
  /** `selectionchange` events the root's own listener saw. */
  private selectionChanges = 0;
  private passthrough: PassthroughCounts = { backdropPresses: 0, unhandledPresses: 0, unhandledWheels: 0, unhandledPans: 0, unhandledKeys: {} };
  /** Set only in a run that injects its own input (a verifier or the probe); a normal run takes real input. */
  private isolation: VerifierInputIsolation | null = null;
  /** What this run opens with: the navigator, or the playground the verifiers were written against (`launch.ts`). */
  private start: DemoStart = { kind: 'app' };
  /** The lab the user last chose in the navigator, so a navigator mounted again opens on it. */
  private currentLab: string | undefined;
  /** Programmatic navigation callback for the active Navigator instance. */
  private navigatorNavigate: ((id: string) => void) | undefined;
  /** True when navigating in response to a popstate event, to avoid pushing a duplicate history entry. */
  private handlingPopState = false;
  /** How many times `showNavigator` has been called: the key of the navigator it renders, so each call mounts a fresh one. */
  private navigatorShown = 0;
  /** The pending return of the navigator's root after a lab took it away (`recoverRoot`); at most one. */
  private recovery: ReturnType<typeof setTimeout> | null = null;
  /** The loader of fonts for characters no registered font has (the Web only: `docs/tracks/font-slices.md`), and what it was last configured with. */
  private fontSlices: DemoFontSlices | undefined = undefined;
  /** The live-compile service of this page, made at the first lab that is edited and ended with the node: one thread however many labs are opened. */
  private liveCompile: ExtensionHost | undefined = undefined;
  /** Services a verifier holds to use up a browser's pool of workers (`holdLiveCompileThreads`). */
  private readonly heldServices: ExtensionHost[] = [];
  private fontSliceOptions: FontSliceSettings | null = {};

  override _ready(): void {
    const args = OS.getCmdlineUserArgs();
    const userArgs = Array.from({length:args.size()}, (_, i) => args.get(i));
    const injects = injectsOwnInput(userArgs);
    // First, before the window can become the key window: see VerifierInputIsolation.
    if (injects) {
      const window = this.getWindow();
      if (!window) throw new Error('A verifier run requires its owning Window');
      this.isolation = VerifierInputIsolation.begin(window);
    }
    this.start = demoStart(userArgs, injects);
    if (this.start.kind === 'navigator') {
      this.start = { kind: 'navigator', lab: resumeLab ?? this.start.lab };
      resumeLab = undefined;
      this.currentLab = this.start.lab;
      if (this.start.lab !== undefined && findLab(this.start.lab) === undefined) {
        console.error(`There is no lab called "${this.start.lab}" (--lab=); the navigator lists the ids that work.`);
      }
    }
    // React Fast Refresh (live-compile) listens on the DevTools hook the renderer registers with at its first root.
    installRefreshHook();
    this.updateDisplayScale();
    const logical = userArgs.find(argument => argument.startsWith(LOGICAL_VIEWPORT_ARGUMENT));
    if (logical !== undefined) this.useLogicalViewport(logical.slice(LOGICAL_VIEWPORT_ARGUMENT.length));
    this.createBackdrop();
    this.mount();
    if (this.start.kind === 'navigator' && this.currentLab !== undefined && Engine.hasSingleton('JavaScriptBridge')) {
      const initialLabId = this.currentLab;
      // A failure here is the browser's own (Godot's eval reports a thrown error in the page's console), so it is not caught.
      JavaScriptBridge.eval(`
        const url = new URL(window.location.href);
        if (!url.searchParams.has('lab') && !window.location.hash) {
          url.searchParams.set('demo', 'navigator');
          url.searchParams.set('lab', ${JSON.stringify(initialLabId)});
          window.history.replaceState({ lab: ${JSON.stringify(initialLabId)} }, '', url.pathname + url.search + url.hash);
        }
      `, true);
    }
    const api = {
      snapshot: () => this.requireRenderer().getSnapshot(),
      /** What the demo's React effects and handlers have done (`getDemoLifecycle`): a disabled button's handler must not appear in it. */
      lifecycle: () => getDemoLifecycle(),
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
      /** The labs in the navigator's order, as plain data for a browser verifier (`scripts/verify-navigator-web.mjs`). */
      labs: () => labsInOrder(LABS).map(({ id, title, kind, group }) => ({ id, title, kind, group })),
      /**
       * The lab navigator in place of the app (`navigator.tsx`), as a normal run opens it. `initialLab` and the callbacks are its
       * props, `extraLabs` are listed after the demo's own; `onLabChange` is the owner's too (it remembers the lab) and is called after
       * the caller's.
       */
      showNavigator: (options: NavigatorOptions = {}) => {
        // A navigator takes its `initialLab` only when it mounts, so each call mounts a new one.
        this.navigatorShown += 1;
        this.requireRenderer().render(this.navigatorElement(options));
      },
      /** Navigate the active lab without remounting the shell, or mount the navigator if not open. */
      navigateLab: (id: string) => {
        try {
          this.handlingPopState = true;
          if (this.navigatorNavigate) {
            this.navigatorNavigate(id);
          } else {
            this.currentLab = id;
            this.requireRenderer().render(this.navigatorElement({ initialLab: id }));
          }
        } finally {
          this.handlingPopState = false;
        }
      },
      // A page in place of the app: the HUD over the backdrop Control (plan I1), the pointer lab (I2), ...
      showLab: (name: LabName) => this.requireRenderer().render(labElement(name)),
      /**
       * The text of a lab's first source file as the live-compile project has it (the pack carries the project, not the `.tsx` files), for a browser
       * verifier of the code panel (`scripts/verify-code-editor-web.mjs`).
       */
      labSource: (id: string) => {
        const project = readProject();
        const path = project.labs[id]?.sources[0];
        const file = project.files.find(candidate => candidate.path === path);
        if (file === undefined) throw new Error(`The live-compile project has no source for the lab ${id}`);
        return file.text;
      },
      /** A lab compiled from its source and kept up to date as the source changes (`live-compile-session.ts`), for the `live-compile` section. */
      openLiveSession: (labId: string, exportName: string) => openLiveSession({ host: this.requireLiveCompile(), root: this.requireRenderer(), labId, exportName }),
      /** The service the live sessions share (`ExtensionHost`): its state, a ping, and the hooks the `live-compile` section tries. */
      liveCompile: () => this.requireLiveCompile(),
      /** Ends the page's service, as leaving the page does: the next session starts a new one, with a new thread. */
      restartLiveCompile: () => this.closeLiveCompile(),
      /**
       * Starts `count` services more, each with a thread of its own and nothing to do: what a page has in hand when it has opened more labs than the
       * garbage collector has taken back (one service for each, before the page shared one). A browser's pool has eight workers, so a service started
       * after these needs a worker that the pool cannot give at once. Returns how many are held.
       */
      holdLiveCompileThreads: (count: number) => {
        for (let index = 0; index < count; index += 1) this.heldServices.push(openExtensionHost());
        return this.heldServices.length;
      },
      releaseLiveCompileThreads: () => {
        for (const held of this.heldServices.splice(0)) held.close();
      },
      /** One page of the paint lab on its own (`docs/tracks/utilities-paint.md`), at the stage's size, from the window's corner. */
      showPaintPage: (page: string) => this.requireRenderer().render(createElement(PaintLab, { page })),
      /** The filters lab (plan Phase V1): rendered again with new props, so a change is an ordinary commit. */
      /** One page of the text styles lab (`text-styles-data.ts`). */
      showTextStyles: (page: string) => this.requireRenderer().render(createElement(TextStylesLab, { page })),
      /** One page of the rich text lab (`rich-text-data.ts`) bare, with the tone its changing samples have; rendered again with another tone it is an ordinary commit. */
      showRichText: (props: RichTextLabProps) => this.requireRenderer().render(createElement(RichTextLab, props)),
      showFontSlices: (props: FontSlicesLabProps) => this.requireRenderer().render(createElement(FontSlicesLab, props)),
      /** The font slice loader's state (`installed` is false natively, and with the loader taken away): what a verifier reads. */
      fontSlices: () => currentFontSlices(),
      /** Resolves when everything the loader was asked for has been fetched and added or has failed. */
      fontSlicesIdle: () => installedFontSlices()?.loader.whenIdle() ?? Promise.resolve(),
      /** Install the loader again with other options (a new one starts with nothing fetched), or take it away with `null`: a verifier's controls. */
      configureFontSlices: (options: FontSliceSettings | null) => {
        this.fontSliceOptions = options;
        this.installFontSlices();
      },
      /** The geometry queries of a text of the rich text lab by its test id (`getCaretRect`, `getOffsetAtPoint`, `getRangeRects`), for the Web verifier. */
      richTextCaret: (testID: string, offset: number, side: 'before' | 'after') => richTextHandle(testID).getCaretRect(offset, side) ?? null,
      richTextOffsetAt: (testID: string, x: number, y: number) => richTextHandle(testID).getOffsetAtPoint(x, y) ?? null,
      richTextRanges: (testID: string, start: number, end: number) => richTextHandle(testID).getRangeRects(start, end) ?? null,
      /** Where the text with test id `testID` has its caret at `offset` (`getCaretRect`), a press at a point (`getOffsetAtPoint`) and a range (`getRangeRects`): the code editor's lines. */
      textCaret: (testID: string, offset: number, side: TextSide) => readCaretRect(this.requireSurface(), textTag(this.requireSurface(), testID), offset, side) ?? null,
      textOffsetAt: (testID: string, x: number, y: number) => readOffsetAtPoint(this.requireSurface(), textTag(this.requireSurface(), testID), x, y) ?? null,
      textRanges: (testID: string, start: number, end: number) => readRangeRects(this.requireSurface(), textTag(this.requireSurface(), testID), start, end) ?? null,
      /** One page of the layout utilities lab (`layout-utilities-data.ts`), bare at the root's corner, or its transition page. */
      showLayoutUtilities: (page: LayoutUtilitiesPage) => this.requireRenderer().render(
        page === 'transitions' ? createElement(TransitionClassesLab) : createElement(LayoutUtilitiesLab, { page }),
      ),
      /** The lines of a text as drawn, root-local, as the native layout has them (`ReactUiRoot.getTextLines`). */
      textLines: (testID: string): unknown => {
        const surface = this.requireSurface();
        const tag = surface.findByTestId(testID);
        if (tag < 0) throw new Error(`There is no element with test id ${testID}`);
        return JSON.parse(surface.getTextLines(tag));
      },
      showFilters: (props: FiltersLabProps) => this.requireRenderer().render(createElement(FiltersLab, props)),
      /**
       * What Godot draws behind the root, for the filters that read it: `2d` is a Control of two flat colours meeting at the
       * window's middle, `3d` is a lit box in the window's own viewport (the backdrop Control is hidden so the 3D shows),
       * `none` removes both and restores the backdrop.
       */
      godotContent: (kind: 'none' | '2d' | '3d') => this.setGodotContent(kind),
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
      /** The document's text selection, as `root.getSelection()` answers it. */
      selection: () => this.requireRenderer().getSelection(),
      /** The handles and edit menu of the selection a touch made, as `root.getTouchSelection()` answers it. */
      touchSelection: () => this.requireRenderer().getTouchSelection(),
      /**
       * Where the caret of the text input `testID` is when it stands at `offset`: a measurement, not an interaction. It puts the caret
       * there (`setSelectionRange`, which sends a `selectionchange`) and reads the caret the snapshot has, which is where a press at that
       * offset's edge lands. `null` while the caret cannot be laid out.
       */
      inputCaretAt: (testID: string, offset: number) => {
        const surface = this.requireSurface();
        const found = this.requireRenderer().findByTestID(testID);
        if (!found?.textInput) throw new Error(`${testID} is not a text input`);
        const error = surface.setTextSelection(found.id, offset, offset, false);
        if (error !== '') throw new Error(`setSelectionRange on ${testID}: ${error}`);
        return this.requireRenderer().findByTestID(testID)?.textInput?.caret ?? null;
      },
      /** The selection lab's commits (React state changes made outside any event, as an app's timer would). */
      changeSelectionLiveText: () => selectionLabControls().changeLiveText(),
      removeSelectionTail: () => selectionLabControls().removeTail(),
      insertSelectionLine: () => selectionLabControls().insertLine(),
      shrinkSelectionCounter: () => selectionLabControls().shrinkCounter(),
      /** `selectionchange` events the root's own listener saw since the last reset. */
      selectionChanges: () => this.selectionChanges,
      resetSelectionChanges: () => { this.selectionChanges = 0; },
      /** `pointercancel`s the root's own listener saw since the last reset. */
      pointerCancels: () => this.pointerCancels,
      resetPointerCancels: () => { this.pointerCancels = 0; },
      /** `wheel` events (ticks and pans) the root's own listener saw: how many times JS was asked about one. */
      wheelEvents: () => this.wheelEvents,
      passthrough: (): PassthroughCounts => ({ ...this.passthrough, unhandledKeys: { ...this.passthrough.unhandledKeys } }),
      resetPassthrough: () => {
        this.passthrough = { backdropPresses: 0, unhandledPresses: 0, unhandledWheels: 0, unhandledPans: 0, unhandledKeys: {} };
        if (this.pressTag) this.pressTag.visible = false;
      },
      /** Whether the engine's `Input` has this key (a `Key` value) down: a key the engine heard go down and never come up stays down (docs/tracks/key-passthrough.md). */
      keyPressed: (keycode: number) => Input.isKeyPressed(keycode),
      /** Whether key chords that nothing in the root claims go to the browser (`RootOptions.keyPassthrough`). */
      setKeyPassthrough: (enabled: boolean) => { this.requireRenderer().setKeyPassthrough(enabled); },
      /** The tags of the focused element and its ancestors, the element first (`ReactUiRoot.focusedPath`). */
      focusedPath: (): number[] => {
        const path = this.requireSurface().focusedPath();
        return Array.from({ length: path.size() }, (_, index) => path.get(index));
      },
      /** Whether native would act on this DOM key if it were pressed now (`ReactUiRoot.claimsKeyChord`), which is what keeps it from the browser. */
      claimsKeyChord: (code: string, key: string, shift: boolean, ctrl: boolean, alt: boolean, meta: boolean) => (
        this.requireSurface().claimsKeyChord(code, key, shift, ctrl, alt, meta)
      ),
      /** What the engine says about the scale this window draws at, for the HiDPI verifiers (docs/tracks/hidpi.md). */
      scaleFacts: () => {
        const window = this.getWindow();
        if (!window) throw new Error('The demo requires its owning Window');
        return { viewportOversampling: window.getOversampling(), contentScaleFactor: window.contentScaleFactor, screenScale: DisplayServer.screenGetScale() };
      },
      /** The cursor Godot would show with the pointer at (x, y), through the root's `_get_cursor_shape`. */
      cursorShapeAt: (x: number, y: number) => this.requireSurface().getCursorShape(new Vector2(x, y)),
      /**
       * The first key the project's `InputMap` binds to `action`, as the engine names it (`Left`, `Home`, `A`) with its
       * modifiers, so a browser verifier can press the keys that mean "word left" on this platform with real input.
       */
      actionKey: (action: string) => {
        const events = InputMap.actionGetEvents(action);
        for (let index = 0; index < events.size(); index++) {
          const event = events.get(index);
          if (event instanceof InputEventKey) {
            const code = event.keycode !== 0 ? event.keycode : event.physicalKeycode;
            return {
              key: OS.getKeycodeString(code), shift: event.shiftPressed, ctrl: event.ctrlPressed, alt: event.altPressed,
              meta: event.metaPressed,
            };
          }
        }
        throw new Error(`The InputMap binds no key to ${action}`);
      },
      /** What the platform offers text input: an IME and an on-screen keyboard (on the Web they exclude each other). */
      platformFacts: () => ({
        ime: DisplayServer.hasFeature(DisplayServer.Feature.FeatureIme),
        virtualKeyboard: DisplayServer.hasFeature(DisplayServer.Feature.FeatureVirtualKeyboard),
        clipboard: DisplayServer.hasFeature(DisplayServer.Feature.FeatureClipboard),
        javaScriptBridge: Engine.hasSingleton('JavaScriptBridge'),
      }),
      /** Whether the root holds Godot key focus. */
      surfaceHasFocus: () => this.requireSurface().hasFocus(),
      rootRect: () => readNodeRect(this.requireSurface(), 0),
      /** Whether the root asks for `process()` frames and for `_input` (native's one decision, `update_process`). */
      surfaceProcessing: () => this.requireSurface().isProcessing(),
      surfaceProcessingInput: () => this.requireSurface().isProcessingInput(),
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
      /** Scale the root's Control (everything it draws), as a world-space owner might. */
      scaleSurface: (factor: number) => { this.requireSurface().scale = new Vector2(factor, factor); },
      /** Mirror the root left to right in place (a negative x scale about its left edge, moved right by its width), or put it back. */
      mirrorSurface: (on: boolean) => {
        const surface = this.requireSurface();
        surface.scale = on ? new Vector2(-1, 1) : new Vector2(1, 1);
        surface.position = on ? new Vector2(surface.size.x, 0) : new Vector2(0, 0);
      },
      /** Move the window's canvas transform, as a `Camera2D` does: nothing is told but the renderer. */
      shiftCanvas: (x: number, y: number) => {
        const window = this.getWindow();
        if (!window) throw new Error('The demo requires its owning Window');
        window.canvasTransform = new Transform2D(0, new Vector2(x, y));
      },
      /** Scroll a scroll container, found by `testID`, to `top`: the programmatic path of `scrollTo`. */
      scrollTo: (testID: string, top: number) => {
        const found = this.requireRenderer().findByTestID(testID);
        if (!found) throw new Error(`No element ${testID} to scroll`);
        const error = this.requireSurface().scrollTo(found.id, 0, top);
        if (error !== '') throw new Error(`scrollTo ${testID}: ${error}`);
      },
      /**
       * Resize the root's Control, as the owner does when the window changes size. Until the window itself
       * changes size `_process` leaves it as set here.
       */
      resizeSurface: (width: number, height: number) => { this.requireSurface().size = new Vector2(width, height); },
      /**
       * The engine's clock rate (`Engine.timeScale`), which scales the `delta` the native motion clock advances by: 0 holds every transition
       * where it is, 1 lets them run. A verifier that must look at transitions while they are still in flight holds the clock, so what it
       * sees does not depend on how long its own steps take on a busy machine.
       */
      setTimeScale: (scale: number) => {
        if (!Number.isFinite(scale) || scale < 0) throw new Error(`The time scale must be a finite number of at least 0, not ${scale}`);
        Engine.timeScale = scale;
      },
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
    Object.assign(globalThis, {
      godotReactDemo: api,
      // The `live-compile` section by itself, in this page, with no captures: how the Web verifier runs it (scripts/verify-live-compile-web.mjs).
      godotReactLiveCompile: () => verifyLiveCompile(this, api, async () => {}),
    });
    console.log('GODOT_REACT_DEMO_READY');
    // The keystroke cost diagnostic (docs/tracks/keystroke-profile.md): it only drives the editor, and only when asked.
    if (userArgs.some(argument => argument.startsWith('--profile-keystrokes'))) installKeystrokeProfile(this, api, userArgs);
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
    const tag = this.createPressTag();
    backdrop.addChild(tag);
    this.pressTag = tag;
    backdrop.guiInput.connect(Callable.create((event: InputEvent) => {
      if (event instanceof InputEventMouseButton && event.pressed && event.buttonIndex === MouseButton.MouseButtonLeft) {
        this.passthrough.backdropPresses += 1;
        this.placePressTag(tag, backdrop.size, event.position);
      }
    }));
    // Internal and first: it is not counted among the demo's children (the verifiers count the
    // surface) and it sorts behind the root.
    this.addChild(backdrop, false, Node.InternalMode.InternalModeFront);
    this.backdrop = backdrop;
    this.sizeToViewport();
  }

  /** The tag that says where the backdrop saw a press: a Label that takes no pointer, so it never changes what reaches the backdrop. */
  private createPressTag(): Label {
    const tag = new Label();
    tag.setName('PressTag');
    tag.mouseFilter = Control.MouseFilter.MouseFilterIgnore;
    tag.visible = false;
    const pill = new StyleBoxFlat();
    pill.bgColor = PRESS_TAG_FILL;
    pill.setCornerRadiusAll(PRESS_TAG_CORNER_RADIUS);
    pill.setContentMarginAll(PRESS_TAG_PADDING);
    tag.addThemeStyleboxOverride('normal', pill);
    tag.addThemeColorOverride('font_color', Color.WHITE);
    return tag;
  }

  /** Say how many presses the backdrop has seen, down and right of the last one and kept inside `room`, the backdrop's size. */
  private placePressTag(tag: Label, room: Vector2, press: Vector2): void {
    tag.text = `Godot saw press ${this.passthrough.backdropPresses}`;
    const size = tag.getCombinedMinimumSize();
    tag.position = new Vector2(
      Math.min(Math.max(press.x + PRESS_TAG_OFFSET, 0), Math.max(room.x - size.x, 0)),
      Math.min(Math.max(press.y + PRESS_TAG_OFFSET, 0), Math.max(room.y - size.y, 0)),
    );
    tag.visible = true;
  }

  private godotNodes: Node[] = [];

  private setGodotContent(kind: 'none' | '2d' | '3d'): void {
    for (const node of this.godotNodes) {
      this.removeChild(node);
      node.free();
    }
    this.godotNodes = [];
    if (this.backdrop) this.backdrop.visible = kind !== '3d';
    if (kind === 'none') return;
    if (kind === '2d') {
      const left = new ColorRect();
      left.color = new Color(0.8, 0.1, 0.1, 1);
      left.mouseFilter = Control.MouseFilter.MouseFilterIgnore;
      const right = new ColorRect();
      right.color = new Color(1, 0.9, 0.2, 1);
      right.mouseFilter = Control.MouseFilter.MouseFilterIgnore;
      this.addChild(left, false, Node.InternalMode.InternalModeFront);
      this.addChild(right, false, Node.InternalMode.InternalModeFront);
      left.size = new Vector2(this.width / 2, this.height);
      right.position = new Vector2(this.width / 2, 0);
      right.size = new Vector2(this.width / 2, this.height);
      this.godotNodes.push(left, right);
      return;
    }
    // A flat-lit box filling the middle of the view, in the window's own 3D world.
    const camera = new Camera3D();
    camera.position = new Vector3(0, 0, 4);
    const box = new MeshInstance3D();
    box.mesh = new BoxMesh();
    const material = new StandardMaterial3D();
    material.albedoColor = new Color(0.1, 0.5, 0.9, 1);
    material.shadingMode = BaseMaterial3D.ShadingMode.ShadingModeUnshaded;
    box.setSurfaceOverrideMaterial(0, material);
    const holder = new Node3D();
    holder.addChild(camera);
    holder.addChild(box);
    this.addChild(holder);
    camera.makeCurrent();
    this.godotNodes.push(holder);
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

  /**
   * Draw at a fixed size whatever the window is: the window's content scale in `viewport` mode, aspect kept, so the render target is
   * `WxH` (a verifier can run at 1920 x 1080 or 1366 x 768 on a display that has neither) and the root is laid out at that size.
   */
  private useLogicalViewport(size: string): void {
    const match = /^(\d+)x(\d+)$/u.exec(size);
    if (match?.[1] === undefined || match[2] === undefined) throw new Error(`${LOGICAL_VIEWPORT_ARGUMENT}WxH, not ${size}`);
    const window = this.getWindow();
    if (!window) throw new Error('A logical viewport requires the owning Window');
    window.contentScaleMode = Window.ContentScaleMode.ContentScaleModeViewport;
    window.contentScaleAspect = Window.ContentScaleAspect.ContentScaleAspectKeep;
    window.contentScaleSize = new Vector2I(Number(match[1]), Number(match[2]));
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
    registerDemoFonts(surface);
    this.fontSlices = this.fontSliceOptions === null ? undefined : installDemoFontSlices(surface, this.fontSliceOptions);
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
    renderer.addEventListener('selectionchange', () => { this.selectionChanges += 1; });
    renderer.addEventListener('keydown', event => {
      if (event.target.id === 0) this.rootKeys.push(event.key);
    });
    setLabOwner({
      unmountRoot: () => {
        this.unmount();
        this.recoverRoot(() => { if (!this.renderer) this.mount(); });
      },
      detachSurface: () => {
        const owned = this.requireSurface();
        if (owned.getParent() === this) this.removeChild(owned);
        this.recoverRoot(() => { if (owned.getParent() === null && this.surface === owned) this.addChild(owned); });
      },
      processFrame: () => Engine.getProcessFrames(),
      focusedNodeId: () => this.requireRenderer().getSnapshot().focused,
    });
    renderer.render(this.start.kind === 'app' ? createElement(App) : this.navigatorElement({ initialLab: this.currentLab }));
  }

  /** The navigator with the owner's callbacks: it remembers the lab, and can leave for a scene of its own. */
  private navigatorElement({ extraLabs = [], ...props }: NavigatorOptions): ReactElement {
    return createElement(Navigator, {
      code: this.codeSupport(),
      ...props,
      key: this.navigatorShown,
      labs: [...LABS, ...extraLabs],
      onNavigate: (navigate: (id: string) => void) => {
        this.navigatorNavigate = navigate;
        props.onNavigate?.(navigate);
      },
      onLabChange: (id: string) => {
        props.onLabChange?.(id);
        this.currentLab = id;
        if (!this.handlingPopState && Engine.hasSingleton('JavaScriptBridge')) {
          JavaScriptBridge.eval(`
            const url = new URL(window.location.href);
            if (url.searchParams.get('lab') !== ${JSON.stringify(id)}) {
              url.searchParams.set('demo', 'navigator');
              url.searchParams.set('lab', ${JSON.stringify(id)});
              window.history.pushState({ lab: ${JSON.stringify(id)} }, '', url.pathname + url.search + url.hash);
            }
          `, true);
        }
      },
      onOpenScene: props.onOpenScene ?? ((lab: SceneLab) => this.openScene(lab)),
    });
  }

  /**
   * What the navigator's code panel needs: a live session of a lab that renders inside the navigator's tree, the text of a source file,
   * and the host's clipboard and keyboard conventions. Word jumps are Alt on macOS and Ctrl elsewhere, and a browser on a Mac is a Mac.
   */
  private codeSupport(): CodeSupport {
    const onMac = ['macos', 'web_macos', 'ios', 'web_ios'].some(feature => OS.hasFeature(feature));
    return {
      openSession: lab => openLiveSession({
        host: this.requireLiveCompile(), root: this.requireRenderer(), labId: lab.id, exportName: lab.component.name, embedded: true, placeholder: lab.component,
      }),
      readSource: path => FileAccess.getFileAsString(path),
      platform: onMac ? 'mac' : 'other',
      // The browser's clipboard is read asynchronously and the engine's own read answers one call late (docs/tracks/text-input.md): on the Web the
      // editor's menu offers no Paste, and the keyboard's own paste is the way.
      clipboard: {
        writeText: text => ReactUiRoot.setClipboardText(text),
        ...(Engine.hasSingleton('JavaScriptBridge') ? {} : { readText: () => ReactUiRoot.clipboardText() }),
      },
      now: () => Time.getTicksUsec() / MICROSECONDS_PER_MILLISECOND,
    };
  }

  /** The page's live-compile service; throws, saying how to build it, when the extension is not there. */
  private requireLiveCompile(): ExtensionHost {
    this.liveCompile ??= openExtensionHost();
    return this.liveCompile;
  }

  /** Ends the page's live-compile service, and with it the thread and every request still outstanding. */
  private closeLiveCompile(): void {
    this.liveCompile?.close();
    this.liveCompile = undefined;
  }

  /** Leave for the scene `lab` is, with a Godot button to come back to the navigator on the same lab. */
  private openScene(lab: SceneLab): void {
    const tree = this.getTree();
    const current = tree?.currentScene;
    if (!tree || !current) throw new Error(`Cannot open ${lab.scene}: the demo is not in a scene tree`);
    resumeLab = lab.id;
    openSceneWithBack(tree, lab.scene, current.sceneFilePath);
  }

  /**
   * A lab asked for the root to be unmounted or detached (the Events lab's two danger buttons, which the verifiers press to prove
   * native survives them). A verifier mounts the root again itself. In the navigator nobody would: the window stays empty, so it
   * puts the root back after a pause, on the lab the user was on. One return is pending at most.
   */
  private recoverRoot(restore: () => void): void {
    if (this.start.kind !== 'navigator') return;
    this.cancelRecovery();
    this.recovery = setTimeout(() => {
      this.recovery = null;
      restore();
    }, ROOT_RECOVERY_DELAY_MS);
  }

  private cancelRecovery(): void {
    if (this.recovery === null) return;
    clearTimeout(this.recovery);
    this.recovery = null;
  }

  /** (Re)install the loader of fonts for characters no font has, as `fontSliceOptions` says; the Web has no system fonts to fall back to, native has. */
  private installFontSlices(): void {
    this.fontSlices?.dispose();
    this.fontSlices = undefined;
    if (this.fontSliceOptions === null || !this.surface) return;
    this.fontSlices = installDemoFontSlices(this.surface, this.fontSliceOptions);
  }

  private unmount(): void {
    if (!this.renderer || !this.surface) throw new Error('Demo is not mounted');
    this.fontSlices?.dispose();
    this.fontSlices = undefined;
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
    this.cancelRecovery();
    if (this.renderer) this.unmount();
    // The service thread ends, and a browser takes its worker back for the pool.
    this.closeLiveCompile();
    for (const held of this.heldServices.splice(0)) held.close();
    Reflect.deleteProperty(globalThis, 'godotReactDemo');
  }

  override _enterTree(): void {
    // _ready mounts the first time; tree re-entry mounts a fresh React owner.
    if (this.isNodeReady() && !this.renderer) this.mount();
  }
}
