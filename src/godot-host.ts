/**
 * A `ReactUiRoot` under either naming of its methods.
 *
 * GodotJS gives a Godot class's methods the names Godot has for them (`take_commit_deletions`), or, in a project with camel-case bindings
 * (`runtime/core/camel_case_bindings_enabled`), camel-cased ones (`takeCommitDeletions`). The setting is the project's, not this library's,
 * so the library takes a root of either kind: its host interfaces are written with the camel-cased names, `GodotNamed` is the same interface
 * under Godot's names, and each function that takes a root takes `GodotHost`, one or the other.
 *
 * Nothing here goes through `godot.lib.api`'s proxies, which make a `Proxy` for every method read and wrap every argument and result: a
 * root is told apart once by the names it has, and from then on its methods are called directly. That module is used for one thing, to
 * get the root out of a proxy of it, and is loaded when a root is first handed over (`godotLibApi`), so the package loads with no Godot.
 */
import type { FontFaceHost } from './fonts';
import type { ImageHost } from './images';
import type { NativeDiagnosticsHost, NativeHost } from './native';

/** Every method of the host interfaces. `size`, the one property, has the same name either way. */
type HostMethod = Exclude<keyof NativeDiagnosticsHost | keyof ImageHost<unknown, unknown> | keyof FontFaceHost<unknown>, 'size'>;

/**
 * The name Godot has for each method of the host interfaces: its `#[func]` in native/lib.rs. GodotJS's camel-casing of the name is the
 * interface's own (tests/godot-host.test.ts holds both to that).
 */
export const GODOT_NAMES = {
  commit: 'commit',
  takeCommitDeletions: 'take_commit_deletions',
  drainEvents: 'drain_events',
  getSnapshot: 'get_snapshot',
  getNodeRect: 'get_node_rect',
  findByTestId: 'find_by_test_id',
  setPointerCapture: 'set_pointer_capture',
  releasePointerCapture: 'release_pointer_capture',
  hasPointerCapture: 'has_pointer_capture',
  focusNode: 'focus_node',
  blurNode: 'blur_node',
  scrollTo: 'scroll_to',
  scrollBy: 'scroll_by',
  scrollIntoView: 'scroll_into_view',
  getScrollState: 'get_scroll_state',
  getSelection: 'get_selection',
  clearSelection: 'clear_selection',
  getTouchSelection: 'get_touch_selection',
  setTextAndSelection: 'set_text_and_selection',
  setTextSelection: 'set_text_selection',
  getTextInputState: 'get_text_input_state',
  getCaretRect: 'get_caret_rect',
  getOffsetAtPoint: 'get_offset_at_point',
  getRangeRects: 'get_range_rects',
  resolveEvent: 'resolve_event',
  claimsKeyChord: 'claims_key_chord',
  focusedPath: 'focused_path',
  setProfiling: 'set_profiling',
  takeProfile: 'take_profile',
  getActivity: 'get_activity',
  registerTexture: 'register_texture',
  unregisterTexture: 'unregister_texture',
  registerMaterial: 'register_material',
  unregisterMaterial: 'unregister_material',
  registerFontFace: 'register_font_face',
} as const satisfies Record<HostMethod, string>;

type GodotNames = typeof GODOT_NAMES;

/** `Host` with each method under the name Godot has for it: what a project without camel-case bindings has. */
export type GodotNamed<Host> = { [Key in keyof Host as Key extends keyof GodotNames ? GodotNames[Key] : Key]: Host[Key] };

/** `Host` as a project has it: under the camel-cased names, or under Godot's. */
export type GodotHost<Host> = Host | GodotNamed<Host>;

/**
 * The root itself, where `host` is `godot.lib.api`'s proxy of one: what a library written against `godot.lib.api` has, since that module's
 * classes construct proxies. Calls on the proxy work, each through a new `Proxy` and with its result wrapped in another; calls on the root
 * cost what they cost any project.
 */
export function unwrapHost<Host>(host: Host): Host {
  return godotLibApi().proxy.proxy_unwrap_value(host);
}

/** As much of GodotJS's `godot.lib.api` as is used here. */
type GodotLibApi = Pick<typeof import('godot.lib.api'), 'proxy'>;

let loadedGodotLibApi: GodotLibApi | undefined;

/**
 * GodotJS's `godot.lib.api`, loaded by the first call and not with this module. The module exists only in GodotJS, and the parts of the
 * package that take no root (the style compiler, for one) are also loaded where there is no Godot: a project's unit tests in Node. An
 * `import` would load it with the package, and the symbol its proxies answer to is the engine's, reachable through this module alone.
 *
 * `require` is the CommonJS one GodotJS gives every module it runs, and its result is untyped: the type is the one GodotJS's typings
 * declare for the module.
 */
function godotLibApi(): GodotLibApi {
  if (loadedGodotLibApi === undefined) {
    const api: GodotLibApi = require('godot.lib.api');
    loadedGodotLibApi = api;
  }
  return loadedGodotLibApi;
}

/**
 * `given` under the names the renderer calls it by. A root with camel-cased methods is returned as it is, so in such a project the
 * renderer calls the root itself. A root with Godot's names gets one object, made once for the root's life, whose methods call the root's:
 * a JS call on top of each native one, which crosses into the engine and builds or parses JSON.
 */
export function bindNativeHost(given: GodotHost<NativeHost>): NativeHost {
  const host = unwrapHost(given);
  if ('takeCommitDeletions' in host) return host;
  return {
    get size() { return host.size; },
    commit: (layer, payloadJson) => host.commit(layer, payloadJson),
    takeCommitDeletions: () => host.take_commit_deletions(),
    drainEvents: () => host.drain_events(),
    getSnapshot: () => host.get_snapshot(),
    getNodeRect: tag => host.get_node_rect(tag),
    findByTestId: testId => host.find_by_test_id(testId),
    setPointerCapture: (tag, pointerId) => host.set_pointer_capture(tag, pointerId),
    releasePointerCapture: (tag, pointerId) => host.release_pointer_capture(tag, pointerId),
    hasPointerCapture: (tag, pointerId) => host.has_pointer_capture(tag, pointerId),
    focusNode: (tag, focusVisible) => host.focus_node(tag, focusVisible),
    blurNode: tag => host.blur_node(tag),
    scrollTo: (tag, left, top) => host.scroll_to(tag, left, top),
    scrollBy: (tag, dx, dy) => host.scroll_by(tag, dx, dy),
    scrollIntoView: tag => host.scroll_into_view(tag),
    getScrollState: tag => host.get_scroll_state(tag),
    getSelection: () => host.get_selection(),
    clearSelection: () => host.clear_selection(),
    getTouchSelection: () => host.get_touch_selection(),
    setTextAndSelection: (tag, eventCount, value, start, end) => host.set_text_and_selection(tag, eventCount, value, start, end),
    setTextSelection: (tag, start, end, backward) => host.set_text_selection(tag, start, end, backward),
    getTextInputState: tag => host.get_text_input_state(tag),
    getCaretRect: (tag, offset, side) => host.get_caret_rect(tag, offset, side),
    getOffsetAtPoint: (tag, x, y) => host.get_offset_at_point(tag, x, y),
    getRangeRects: (tag, start, end) => host.get_range_rects(tag, start, end),
    resolveEvent: (seq, defaultPrevented, dropEffect) => host.resolve_event(seq, defaultPrevented, dropEffect),
    claimsKeyChord: (code, key, shiftKey, ctrlKey, altKey, metaKey) => host.claims_key_chord(code, key, shiftKey, ctrlKey, altKey, metaKey),
    focusedPath: () => host.focused_path(),
  };
}
