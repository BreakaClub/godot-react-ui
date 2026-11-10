import { createElement as h, useState } from 'react';
import { Node } from 'godot';
import {
  Callable, FontFile, Image as GodotImage, ImageTexture, InputEventMouseButton, MouseButton, ReactUiRoot, ShaderMaterial, Time, Vector2, proxy,
} from 'godot.lib.api';
import {
  Button, Image, Text, View, createRoot, readActivity, registerFontFace, registerMaterial, registerTexture, takeNativeProfile,
  type GodotHost, type NativeHost, type UIRoot,
} from 'godot-react-ui';
// Not part of the package: the object the renderer calls a root through, for the timing below.
import { bindNativeHost } from '../src/godot-host';

// The main script of a project that is not the demo: `pnpm verify:casing` (scripts/verify-casing.mjs) runs it, from one bundle, in a
// project with GodotJS's camel-case bindings off and in one with them on. It uses the package as it is published (`dist`), and is
// type-checked against the declarations of a project without camel-case bindings.
//
// So that one bundle runs in both, every Godot call this file makes is made through `godot.lib.api`, under Godot's names. Only the class
// it extends is `godot`'s own: a script's base is the engine's class, not a proxy of it. The library is handed a root as a project has it
// (the object itself) and as code written against `godot.lib.api` has it (that module's proxy).

const PASSED_MARKER = 'GODOT_REACT_CASING_VERIFY_PASSED';
const FAILED_MARKER = 'GODOT_REACT_VERIFY_FAILED';
const POINTER_CALLS = 300_000;
const RECT_CALLS = 50_000;
const UPDATES = 3_000;
const NANOSECONDS_PER_MICROSECOND = 1000;
const MICROSECONDS_PER_MILLISECOND = 1000;
const ROOT_WIDTH = 800;
const ROOT_HEIGHT = 600;
const TEXTURE_SIDE = 8;
const PICTURE_SIDE = 32;
/** Frames for a commit to be laid out, and for an event to reach React and its update to reach native. */
const SETTLE_FRAMES = 2;
/** What an unmounted root's snapshot has left: its layer roots. */
const UNMOUNTED_NODES = 2;

interface Check { name: string; ok: boolean; detail?: unknown }

let setCountOfLastPanel: ((count: number) => void) | undefined;

function Panel() {
  const [count, setCount] = useState(0);
  setCountOfLastPanel = setCount;
  return h(View, { testID: 'panel', style: { padding: 16, gap: 8 } },
    h(Button, { testID: 'counter', style: { width: 200, height: 48 }, onClick: () => setCount(value => value + 1) }, `Count: ${count}`),
    h(Image, { testID: 'picture', source: 'probe-texture', material: 'probe-material', style: { width: PICTURE_SIDE, height: PICTURE_SIDE } }),
    h(Text, { testID: 'label', style: { fontFamily: 'probe' } }, 'A label in the registered face'),
  );
}

/** The label the counter shows: a button's words are a text node under it. */
function countShown(root: UIRoot): string | undefined {
  return root.getSnapshot().nodes.find(node => node.text.startsWith('Count: '))?.text;
}

/**
 * A root as the library's functions take one. That this compiles with the root of a project without camel-case bindings is the type
 * check; a variable declared with this type would be narrowed back to the root's own by its assignment.
 */
function asHost(host: GodotHost<NativeHost>): GodotHost<NativeHost> {
  return host;
}

export default class CasingProbe extends Node {
  private readonly roots = new Set<UIRoot>();
  private waiters: Array<() => void> = [];
  private readonly checks: Check[] = [];

  override _ready(): void {
    const self = proxy.instance_proxy(this);
    void this.run().then((report) => {
      const failed = this.checks.filter(check => !check.ok);
      if (failed.length > 0) {
        console.error(`${FAILED_MARKER} ${failed.length} of ${this.checks.length} checks failed: ${failed.map(check => check.name).join('; ')}`);
      } else {
        console.log(`${PASSED_MARKER} ${JSON.stringify({ checks: this.checks.length, ...report })}`);
      }
      self.get_tree()?.quit(failed.length === 0 ? 0 : 1);
    }).catch((error: unknown) => {
      console.error(`${FAILED_MARKER} ${error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error)}`);
      self.get_tree()?.quit(1);
    });
  }

  override _process(): void {
    for (const root of this.roots) root.dispatchEvents();
    const waiters = this.waiters;
    this.waiters = [];
    for (const resolve of waiters) resolve();
  }

  private check(name: string, ok: boolean, detail?: unknown): void {
    this.checks.push({ name, ok, detail });
    console.log(`CASING_CHECK ${ok ? 'ok  ' : 'FAIL'} ${name}${detail === undefined ? '' : ` ${JSON.stringify(detail)}`}`);
  }

  private async frames(count: number): Promise<void> {
    for (let index = 0; index < count; index++) await new Promise<void>(resolve => this.waiters.push(resolve));
  }

  /** A root in the tree, as `godot.lib.api` makes it: its proxy. */
  private makeSurface(): ReactUiRoot {
    const surface = new ReactUiRoot();
    proxy.instance_proxy(this).add_child(surface);
    surface.size = new Vector2(ROOT_WIDTH, ROOT_HEIGHT);
    return surface;
  }

  private mount(surface: ReactUiRoot, handed: GodotHost<NativeHost>): UIRoot {
    const root = createRoot(handed, {
      now: () => Time.get_ticks_usec() / MICROSECONDS_PER_MILLISECOND,
      subscribeToEvents: (listener) => {
        const callable = Callable.create(listener);
        surface.events_ready.connect(callable);
        return () => surface.events_ready.disconnect(callable);
      },
    });
    this.roots.add(root);
    return root;
  }

  private click(x: number, y: number): void {
    const viewport = proxy.instance_proxy(this).get_viewport();
    if (!viewport) throw new Error('The probe has no viewport');
    for (const pressed of [true, false]) {
      const event = new InputEventMouseButton();
      event.button_index = MouseButton.MOUSE_BUTTON_LEFT;
      event.pressed = pressed;
      event.position = new Vector2(x, y);
      event.global_position = new Vector2(x, y);
      viewport.push_input(event);
    }
  }

  /** Mount, click, register, read diagnostics and unmount on one root, handed to the library as `kind` says. */
  private async exercise(kind: 'itself' | 'proxied'): Promise<void> {
    const surface = this.makeSurface();
    const unwrap = <Value>(value: Value): Value => kind === 'itself' ? proxy.proxy_unwrap_value(value) : value;
    const handed = unwrap(surface);
    const root = this.mount(surface, handed);
    root.render(h(Panel));
    await this.frames(SETTLE_FRAMES);
    const before = root.findByTestID('counter');
    this.check(`${kind}: the first commit reached native`, countShown(root) === 'Count: 0', countShown(root));
    if (!before) throw new Error(`${kind}: nothing was mounted`);

    this.click(before.rect.x + before.rect.width / 2, before.rect.y + before.rect.height / 2);
    await this.frames(SETTLE_FRAMES);
    this.check(`${kind}: a click reached React and its update reached native`, countShown(root) === 'Count: 1', countShown(root));

    root.flushSync(() => setCountOfLastPanel?.(41));
    this.check(`${kind}: flushSync committed before it returned`, countShown(root) === 'Count: 41', countShown(root));
    this.check(`${kind}: the snapshot holds the tree`, root.getSnapshot().nodes.length >= 4, root.getSnapshot().nodes.length);

    const texture = ImageTexture.create_from_image(GodotImage.create_empty(TEXTURE_SIDE, TEXTURE_SIDE, false, GodotImage.Format.FORMAT_RGBA8));
    if (!texture) throw new Error('No texture was made');
    registerTexture(handed, 'probe-texture', unwrap(texture));
    registerMaterial(handed, 'probe-material', unwrap(new ShaderMaterial()));
    const font = new FontFile();
    font.load_dynamic_font('res://OpenSans-Variable.ttf');
    registerFontFace(handed, { family: 'probe', weight: [300, 800], font: unwrap(font) });
    await this.frames(SETTLE_FRAMES);
    const picture = root.findByTestID('picture');
    this.check(`${kind}: a texture, a material and a font face registered`, picture?.rect.width === PICTURE_SIDE, picture?.rect);
    let refusal = '';
    try {
      registerFontFace(handed, { family: '', weight: 400, font: unwrap(font) });
    } catch (error) {
      refusal = error instanceof Error ? error.message : String(error);
    }
    this.check(`${kind}: a refused face says why`, refusal.startsWith('Cannot register the  face: '), refusal);

    surface.set_profiling(true);
    root.flushSync(() => setCountOfLastPanel?.(42));
    await this.frames(SETTLE_FRAMES);
    const activity = readActivity(handed);
    this.check(`${kind}: activity was read`, typeof activity.animating === 'boolean', Object.keys(activity));
    const profile = takeNativeProfile(handed);
    this.check(`${kind}: the native profile was read`, Array.isArray(profile.samples), { samples: profile.samples.length, dropped: profile.dropped });
    surface.set_profiling(false);

    // The root says whether it held each: a registration that went nowhere would answer false.
    const hadTexture = surface.unregister_texture('probe-texture');
    const hadMaterial = surface.unregister_material('probe-material');
    this.check(`${kind}: the root held the texture and the material`, hadTexture && hadMaterial, { hadTexture, hadMaterial });

    root.unmount();
    this.roots.delete(root);
    const left: unknown = JSON.parse(surface.get_snapshot());
    const nodesLeft = typeof left === 'object' && left !== null && 'nodes' in left && Array.isArray(left.nodes) ? left.nodes.length : undefined;
    this.check(`${kind}: unmount released the tree`, nodesLeft !== undefined && nodesLeft <= UNMOUNTED_NODES, { nodesLeft });
    surface.queue_free();
  }

  private async run(): Promise<Record<string, unknown>> {
    const proxied = new ReactUiRoot();
    const itself = proxy.proxy_unwrap_value(proxied);
    const camel = Reflect.has(itself, 'takeCommitDeletions');
    const godot = Reflect.has(itself, 'take_commit_deletions');
    this.check('godot.lib.api hands out a proxy, which unwraps to the root', itself !== proxied);
    this.check('a root has its methods under one naming only', camel !== godot, { camel, godot });
    proxied.free();

    await this.exercise('itself');
    await this.exercise('proxied');
    return { rootHasCamelCasedNames: camel, ...await this.time() };
  }

  /** What a call costs on the root itself, through the object the renderer calls, and through `godot.lib.api`'s proxy. */
  private async time(): Promise<Record<string, unknown>> {
    const surface = this.makeSurface();
    const itself = asHost(proxy.proxy_unwrap_value(surface));
    const root = this.mount(surface, itself);
    root.render(h(Panel));
    await this.frames(SETTLE_FRAMES);
    const tag = root.findByTestID('counter')?.id;
    if (tag === undefined) throw new Error('Nothing to time against');
    const bound = bindNativeHost(itself);
    const perCall = (calls: number, startUsec: number) => Math.round((Time.get_ticks_usec() - startUsec) * NANOSECONDS_PER_MICROSECOND / calls);

    const nanoseconds: Record<string, number> = {};
    for (const pass of ['warm-up', 'measured'] as const) {
      let captured = 0;
      let start = Time.get_ticks_usec();
      if ('hasPointerCapture' in itself) for (let index = 0; index < POINTER_CALLS; index++) captured += itself.hasPointerCapture(tag, 0) ? 1 : 0;
      else for (let index = 0; index < POINTER_CALLS; index++) captured += itself.has_pointer_capture(tag, 0) ? 1 : 0;
      nanoseconds['hasPointerCapture on the root itself'] = perCall(POINTER_CALLS, start);
      start = Time.get_ticks_usec();
      for (let index = 0; index < POINTER_CALLS; index++) captured += bound.hasPointerCapture(tag, 0) ? 1 : 0;
      nanoseconds['hasPointerCapture as the renderer calls it'] = perCall(POINTER_CALLS, start);
      start = Time.get_ticks_usec();
      for (let index = 0; index < POINTER_CALLS; index++) captured += surface.has_pointer_capture(tag, 0) ? 1 : 0;
      nanoseconds['hasPointerCapture through the godot.lib.api proxy'] = perCall(POINTER_CALLS, start);

      let length = 0;
      start = Time.get_ticks_usec();
      if ('getNodeRect' in itself) for (let index = 0; index < RECT_CALLS; index++) length += itself.getNodeRect(tag).length;
      else for (let index = 0; index < RECT_CALLS; index++) length += itself.get_node_rect(tag).length;
      nanoseconds['getNodeRect on the root itself'] = perCall(RECT_CALLS, start);
      start = Time.get_ticks_usec();
      for (let index = 0; index < RECT_CALLS; index++) length += bound.getNodeRect(tag).length;
      nanoseconds['getNodeRect as the renderer calls it'] = perCall(RECT_CALLS, start);
      start = Time.get_ticks_usec();
      for (let index = 0; index < RECT_CALLS; index++) length += surface.get_node_rect(tag).length;
      nanoseconds['getNodeRect through the godot.lib.api proxy'] = perCall(RECT_CALLS, start);

      start = Time.get_ticks_usec();
      for (let index = 0; index < UPDATES; index++) root.flushSync(() => setCountOfLastPanel?.(index));
      nanoseconds['a React state update, committed'] = perCall(UPDATES, start);
      if (pass === 'measured') this.check('the timed calls answered', captured === 0 && length > 0, { captured, length });
    }
    root.unmount();
    this.roots.delete(root);
    surface.queue_free();
    return { rendererCallsTheRootItself: bound === itself, nanosecondsPerCall: nanoseconds };
  }
}
