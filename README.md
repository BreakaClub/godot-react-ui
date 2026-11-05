# godot-react-ui

A standalone prototype of React TSX in GodotJS, with Rust/Taffy layout and native Godot drawing. It is not integrated into `breaka-rpg`.

One repository contains the GDExtension, the `godot-react-ui` TypeScript package, and an interactive Godot demo. Keeping them together lets the native protocol and renderer evolve together while the boundary is experimental. The package is marked `private: true`; it has not been published. Repository creation and local builds do not create a remote, push, or deploy anything.

## Run the native demo

The current native addon manifest targets Apple Silicon macOS. Use the Godot 4.8 V8/GodotJS build, Node.js, pnpm 11.5.2, and rustup. `rust-toolchain.toml` pins Rust 1.99.1. The build uses rustup's Cargo, avoiding this workstation's unrelated Homebrew Rust installation.

```sh
export GODOT=/Applications/Godot48.app/Contents/MacOS/Godot
pnpm install
pnpm build:native
pnpm build
pnpm demo
```

`build:native` compiles the optimized Rust library and installs it into `demo/addons/godot-react-ui/bin/`. `build` typechecks before bundling the demo and emitting CommonJS, ES modules and declarations into `dist/`. Both package entry points are importable; `pnpm pack` creates a local npm tarball without publishing. Generated GodotJS declarations and scene wrappers are included under `demo/typings/` and `demo/gen/`; `.uid` files are project metadata. Compiled libraries, JavaScript bundles, and the `.godot` import cache are generated locally.

The demo has four tabs:

- **Counter:** real React state, derived values, closures, effects, context, disabled buttons, pointer states, and keyboard activation.
- **Inventory:** a responsive Taffy grid, keyed component state, reordering, filtering, insertion/removal, and an empty state.
- **Interaction:** the event pipeline: capture and bubble with `stopPropagation()`, `preventDefault()` that stops native's focus default action, synchronous dispatch (a handler observes native state before its default action runs), `pointerenter`/`pointerleave` that reach only the elements crossed, and handlers that remove their own target, detach the root from the scene tree, or unmount it while native is still inside the press.
- **Motion:** native Blitz/Stylo CSS transitions (`width`, `height`, `opacity`, `backgroundColor`), intrinsic `0 ↔ auto` height transitions (`interpolateSize: 'allow-keywords'`), rectangular clipping (`overflow: 'hidden'`) for both rendering and hit testing, in-flight retargeting across text/font/width/viewport changes, rapid reversal, tree detach/reattach pause/resume, and active-transition removal.

Resize the window to see `md:` classes recompose the layout. Tab and Shift-Tab move between enabled buttons; Enter and Space activate them. All provided Godot launch scripts use `--audio-driver Dummy`.

For TypeScript iteration, run `pnpm dev`. It watches the demo bundle and opens the Godot editor; run the demo there and restart its scene when changing initialization. Native extension changes require rebuilding and restarting Godot because extension hot reload is disabled.

## Authoring

Use ordinary React, including hooks and component composition, with three native primitives:

```tsx
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'godot-react-ui';

const styles = StyleSheet.create({
  panel: { padding: 24, borderRadius: 16, backgroundColor: '#ffffff' },
});

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.panel} className="gap-4">
      <Text className="text-3xl text-slate-900">Count: {count}</Text>
      <View className="flex-col md:flex-row gap-3">
        <Button
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-3"
          onClick={() => setCount(value => value + 1)}
        >
          Add one
        </Button>
        <Button
          disabled={count === 0}
          className="rounded-lg bg-slate-100 text-slate-700 disabled:text-slate-400 px-4 py-3"
          onClick={() => setCount(0)}
        >
          Reset
        </Button>
      </View>
    </View>
  );
}
```

`View` defaults to a flex column. `Text` uses Godot text shaping and wrapping. `Button` participates in native hit testing and keyboard focus. `color`, `fontSize`, and `textAlign` inherit through the React host tree. Events include `onClick`, pointer enter/leave/down/up/move (each with a `Capture` variant except enter/leave), and focus/blur. They have DOM semantics: capture handlers run outermost first, then bubble handlers from the target up, then root listeners (`root.addEventListener`); `pointerenter`/`pointerleave` do not bubble and run only for the elements the pointer crosses. Events provide `target`, `currentTarget`, `eventPhase`, root-local coordinates, `pointerId`, `pointerType`, `button`, `buttons`, modifiers, `timeStamp`, `stopPropagation()` and `preventDefault()`. A pointer press is dispatched synchronously from inside Godot's input callback, so `preventDefault()` on `onPointerDown` stops native's focus default action before it runs. Refs expose a typed handle with its native ID and `getRect()`; `testID` supports inspection without becoming native identity.

Mount with `createRoot(nativeSurface, { subscribeToEvents }).render(<App />)`, where `nativeSurface` is a `ReactUiRoot` from `godot`. `subscribeToEvents(listener)` is required: the owner connects a `Callable` for `listener` to the surface's `eventsReady` signal and returns a function that disconnects it (a GodotJS `Callable` holds its function strongly, so `unmount()` calls that function or the whole root would stay reachable). Native emits `eventsReady` from inside its input callbacks. The owner also sets the surface size, calls `dispatchEvents()` each frame for events native queued outside an input callback, calls `refreshStyles()` after logical viewport changes, and calls `unmount()` before freeing the surface. [The demo owner](demo/src/main.ts) shows the complete lifecycle, including tree re-entry. `render()` commits the initial render synchronously; later hook updates use React's scheduler.

On Web, the demo owner also synchronizes its Window's `contentScaleFactor` with `DisplayServer.screenGetScale()`. Layout and hit testing then use CSS-sized logical coordinates while the backing canvas and font rasterization retain the full device resolution. Polling detects browser zoom and display-density changes, including those that leave the backing dimensions unchanged.

## Styles

This is a strict, typed **Tailwind-like subset**, not Tailwind's CSS compiler or a browser stylesheet engine. Unknown classes and variants throw, even if the variant is currently inactive. Matching classes apply left to right; inline styles apply afterwards. `style` accepts an object or nested arrays containing objects, `false`, `null`, and `undefined`. `StyleSheet.create` freezes reusable definitions; it does not register native style IDs.

| Area | Examples |
| --- | --- |
| Layout | `flex`, `grid`, `hidden`, `flex-row`, `flex-col`, `flex-wrap`, `flex-1`, `grow`, `shrink-0`, `items-center`, `justify-between`, `grid-cols-3`, `overflow-hidden`, `overflow-visible` |
| Spacing | `p-6`, `px-4`, `py-2`, `mt-3`, `gap-4`, `gap-x-2`, `p-[10px]`; the numeric scale is four logical pixels |
| Dimensions | `w-full`, `h-auto`, `w-1/2`, `w-[50%]`, `h-[123px]`, `min-w-0`, `max-w-xl`, `basis-0` |
| Paint | `bg-white`, `text-slate-900`, `border`, `border-indigo-500`, `rounded-xl`, `opacity-50`, `bg-[#123456]` |
| Typography | `text-xs` through `text-6xl`, `text-[23px]`, `text-left`, `text-center`, `text-right` |
| Motion | Inline `transition: { properties, durationMs, delayMs?, easing? }` (`width`, `height`, `opacity`, `backgroundColor`) and `interpolateSize: 'numeric-only' \| 'allow-keywords'` |
| Variants | `sm:` 640, `md:` 768, `lg:` 1024, `xl:` 1280, `2xl:` 1536; `hover:`, `active:`, `focus:`, `disabled:`; combinations such as `md:hover:bg-indigo-100` |

The palette includes slate, indigo, emerald, amber, and rose shades 50–950, plus white, black, and transparent. These are familiar Tailwind v3 sRGB hex values. Breakpoints use the surface's logical width, not physical display pixels. [Style types](src/types.ts), the [native protocol](native/PROTOCOL.md), [motion architecture](docs/MOTION_ARCHITECTURE.md), and the [Blitz/Stylo evaluation](docs/BLITZ_EVALUATION.md) document the supported surface and boundaries.

## Architecture and performance boundary

React 19.2.0 matches the backend's version; `react-reconciler` 0.33.0 is pinned to its compatible peer contract. React is a peer dependency so the application and renderer share one instance. Native dependencies are `godot` 0.5.5, Taffy 0.15.1, and `blitz-dom` 0.2.2 (retaining Stylo for CSS transition resolution), locked by Cargo. Bindings use the exact API exported from the project's Godot 4.8 binary, recorded in [native/api](native/api/README.md), for both native and Web builds.

The reconciler creates lightweight JavaScript instances during speculative rendering. Native allocation happens only for committed trees. Each commit produces a validated JSON mutation batch through ordinary ClassDB bindings. JavaScript owns bounded `u32` handles; raw Taffy slot-map keys never cross as potentially lossy JavaScript numbers. Event closures stay in JS, while native input queues are drained outside mutable Rust calls.

Taffy owns Flexbox/Grid geometry. Godot `TextParagraph` owns text shaping and intrinsic measurement. Stylo (via `blitz-dom`) owns transition timing, easing, interruption, and reversal on the native process clock, while a dedicated native measurement tree supplies intrinsic endpoints when `interpolateSize: 'allow-keywords'` is active. A single custom `Control` draws the tree through lightweight `RenderingServer` `CanvasItem` RIDs with per-element rectangular clipping (`overflow: 'hidden'`) for both rendering and hit testing; there is no Godot `Container` or `Control` for every React element. Paint and layout invalidation are separate. Snapshots and opt-in profiles expose node geometry, active transitions, and batch, layout, paint, and stage timing counters.

This remains a performance prototype: JSON serialization, committed-tree comparison, and whole-canvas redraw have costs. It does not claim zero allocation or a frame-rate guarantee. Custom GodotJS/V8 hooks are intentionally deferred until measurements identify a bridge bottleneck; GodotJS already supplies the scheduler and ClassDB facilities required here.

## Verification and Web

```sh
pnpm test:types
pnpm test
cargo test --locked
pnpm build:native
pnpm build
pnpm verify
pnpm verify:motion
pnpm verify:interaction
```

`verify`, `verify:motion` and `verify:interaction` drive real Godot input through the demo at 1120×800 and 600×900, checking state/effects, keyed moves, focus, geometry, paint-only hover, button activation across padding/text, mount/unmount behavior, intrinsic `0 ↔ auto` transitions, pixel-level overflow clipping, in-flight retargeting, rapid reversal, and tree detach/reattach pause/resume, writing PNGs, snapshots, and logs under `artifacts/native/`, `artifacts/native-motion/` and `artifacts/native-interaction/`. `verify:interaction` also asserts capture/bubble order, `preventDefault` on a cancelable event, synchronous dispatch, enter/leave chains and three re-entrant handlers, and records the JS time inside one synchronous dispatch. Inspect the actual PNGs alongside the assertions.

For the browser target, see [Web build instructions](docs/WEB.md):

```sh
pnpm build:web
pnpm demo:web
# In a second terminal, while the local server is running:
pnpm verify:web
pnpm verify:motion:web
pnpm verify:interaction:web
```

By default the verifiers expect the server on port 8096; set `PORT` for `demo:web` and `GODOT_REACT_WEB_URL` for every Web verifier to use another port. Web uses the browser's JS runtime through GodotJS and the Rust extension compiled to a Wasm side module. It requires the matching threaded GodotJS templates and Emscripten/lazy-table ABI described in that guide, plus its separately pinned Rust nightly.

Verified on 5 November 2026: 13 TypeScript/React tests, 19 Rust unit tests, Clippy, both native baseline and motion viewport workflows (26 baseline captures + 52 motion captures), the Chrome debug Web baseline workflow (247 assertions, 53 captures including touch), and the Chrome debug Web motion/benchmark workflow (433 assertions, 26 captures, 30 benchmark cells across 50/500/2,000 nodes at DPR 1 and DPR 2). The optimized Wasm extension is 6,739,346 bytes (including Blitz/Stylo); the engine and JavaScript/PCK payloads are additional. Safari, mobile devices and the release Web preset have not been qualified.

When Godot's Web shell (`fetchWithProgress`) finishes reading `index.pck` through `ReadableStream.getReader()`, Chromium can emit a benign `net::ERR_ABORTED` on the completed stream close after all `Content-Length` bytes are delivered; `verify-motion-web.mjs` verifies the exact byte count and SHA-256 of `index.pck` before allowing that post-completion event. The verifier also records the existing Emscripten dynamic-loader synchronization warning once before startup and treats all other runtime errors as failures.

## Current limits

There is no DOM, full CSS cascade, selector engine, Tailwind plugin support, scrolling, text input/IME, accessibility tree, images, rich inline text, rounded clipping/masks, general `@keyframes` animations, or custom materials. Mixed pixel/percentage transitions and intrinsic transitions on non-zero-flex main-axis items are explicitly rejected at validation time. Font-weight and line-height utilities are not implemented. Grid currently exposes equal fractional column counts; it does not expose Taffy's complete track-placement API. Native platforms beyond the current macOS target require manifest/build work and runtime qualification.

The prototype establishes the authoring and runtime boundary for later integration into Breaka.
