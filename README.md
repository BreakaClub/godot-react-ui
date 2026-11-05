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

The demo has two tabs:

- **Counter:** real React state, derived values, closures, effects, context, disabled buttons, pointer states, and keyboard activation.
- **Inventory:** a responsive Taffy grid, keyed component state, reordering, filtering, insertion/removal, and an empty state.

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

`View` defaults to a flex column. `Text` uses Godot text shaping and wrapping. `Button` participates in native hit testing and keyboard focus. `color`, `fontSize`, and `textAlign` inherit through the React host tree. Events include `onClick`, pointer enter/leave/down/up/move, and focus/blur; they provide `target`, `currentTarget`, root-local coordinates, and `stopPropagation()`. Refs expose a typed handle with its native ID and `getRect()`; `testID` supports inspection without becoming native identity.

Mount with `createRoot(nativeSurface).render(<App />)`, where `nativeSurface` is a `ReactUiRoot` from `godot`. Its Godot owner sets the surface size, calls `dispatchEvents()` each frame, calls `refreshStyles()` after logical viewport changes, and calls `unmount()` before freeing the surface. [The demo owner](demo/src/main.ts) shows the complete lifecycle, including tree re-entry. `render()` commits the initial render synchronously; later hook updates use React's scheduler.

## Styles

This is a strict, typed **Tailwind-like subset**, not Tailwind's CSS compiler or a browser stylesheet engine. Unknown classes and variants throw, even if the variant is currently inactive. Matching classes apply left to right; inline styles apply afterwards. `style` accepts an object or nested arrays containing objects, `false`, `null`, and `undefined`. `StyleSheet.create` freezes reusable definitions; it does not register native style IDs.

| Area | Examples |
| --- | --- |
| Layout | `flex`, `grid`, `hidden`, `flex-row`, `flex-col`, `flex-wrap`, `flex-1`, `grow`, `shrink-0`, `items-center`, `justify-between`, `grid-cols-3` |
| Spacing | `p-6`, `px-4`, `py-2`, `mt-3`, `gap-4`, `gap-x-2`, `p-[10px]`; the numeric scale is four logical pixels |
| Dimensions | `w-full`, `h-auto`, `w-1/2`, `w-[50%]`, `h-[123px]`, `min-w-0`, `max-w-xl`, `basis-0` |
| Paint | `bg-white`, `text-slate-900`, `border`, `border-indigo-500`, `rounded-xl`, `opacity-50`, `bg-[#123456]` |
| Typography | `text-xs` through `text-6xl`, `text-[23px]`, `text-left`, `text-center`, `text-right` |
| Variants | `sm:` 640, `md:` 768, `lg:` 1024, `xl:` 1280, `2xl:` 1536; `hover:`, `active:`, `focus:`, `disabled:`; combinations such as `md:hover:bg-indigo-100` |

The palette includes slate, indigo, emerald, amber, and rose shades 50–950, plus white, black, and transparent. These are familiar Tailwind v3 sRGB hex values. Breakpoints use the surface's logical width, not physical display pixels. [Style types](src/types.ts) and the [native protocol](native/PROTOCOL.md) list the complete supported property surface.

## Architecture and performance boundary

React 19.2.0 matches the backend's version; `react-reconciler` 0.33.0 is pinned to its compatible peer contract. React is a peer dependency so the application and renderer share one instance. Native dependencies are `godot` 0.5.5 and Taffy 0.15.1, locked by Cargo. Bindings use the exact API exported from the project's Godot 4.8 binary, recorded in [native/api](native/api/README.md), for both native and Web builds.

The reconciler creates lightweight JavaScript instances during speculative rendering. Native allocation happens only for committed trees. Each commit produces a validated JSON mutation batch through ordinary ClassDB bindings. JavaScript owns bounded `u32` handles; raw Taffy slot-map keys never cross as potentially lossy JavaScript numbers. Event closures stay in JS, while native input queues are drained outside mutable Rust calls.

Taffy owns Flexbox/Grid geometry. Godot `TextParagraph` owns text shaping and intrinsic measurement. A single custom `Control` draws the tree through one native canvas; there is no Godot `Container` or `Control` for every React element. Paint and layout invalidation are separate. Snapshots expose node geometry and batch, layout, paint, and timing counters.

This remains a performance prototype: JSON serialization, committed-tree comparison, and whole-canvas redraw have costs. It does not claim zero allocation or a frame-rate guarantee. Custom GodotJS/V8 hooks are intentionally deferred until measurements identify a bridge bottleneck; GodotJS already supplies the scheduler and ClassDB facilities required here.

## Verification and Web

```sh
pnpm test:types
pnpm test
cargo test --locked
pnpm build:native
pnpm build
pnpm verify
```

`verify` drives real Godot input through the demo at 1120×800 and 600×900, checks state/effects, keyed moves, focus, geometry, paint-only hover, button activation across padding/text, and mount/unmount behavior, and writes PNGs, snapshots, and logs under `artifacts/native/`. Inspect the actual PNGs alongside the assertions.

For the browser target, see [Web build instructions](docs/WEB.md):

```sh
pnpm build:web
pnpm demo:web
# In a second terminal, while the local server is running:
pnpm verify:web
```

Web uses the browser's JS runtime through GodotJS and the Rust extension compiled to a Wasm side module. It requires the matching threaded GodotJS templates and Emscripten/lazy-table ABI described in that guide, plus its separately pinned Rust nightly.

Verified on 5 November 2026: 12 TypeScript/React tests, 9 Rust tests, Clippy, both native viewport workflows (26 captures), and the Chrome debug Web workflow (123 assertions, 27 captures including touch). The browser tests use actual mouse, keyboard and touch input, and live viewport resizing. The optimized Wasm extension is 953,917 bytes; the engine and JavaScript/PCK payloads are additional. Safari, mobile devices and the release Web preset have not been qualified.

One cold Chrome run reported `net::ERR_ABORTED` while downloading `index.pck` before engine startup. The cause remains unproven: a diagnostic cold launch downloaded the identical pack completely and reached readiness in 1.46 seconds, then the unchanged full verifier passed. No retry, skip or runtime workaround was added. The verifier also records the existing Emscripten dynamic-loader synchronization warning, allowing that exact diagnostic once before startup and treating all other runtime errors as failures.

## Current limits

There is no DOM, full CSS cascade, selector engine, Tailwind plugin support, scrolling, text input/IME, accessibility tree, images, rich inline text, per-element clipping, animations, or custom materials. Font-weight and line-height utilities are not implemented. The native root clips to its own rectangle. Grid currently exposes equal fractional column counts; it does not expose Taffy's complete track-placement API. Native platforms beyond the current macOS target require manifest/build work and runtime qualification.

The prototype establishes the authoring and runtime boundary for later integration into Breaka.
