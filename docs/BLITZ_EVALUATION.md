# Blitz / Stylo evaluation

Evaluated on 5 November 2026. The executable probe lives in
[`experiments/blitz-probe`](../experiments/blitz-probe/README.md), with its own
Cargo workspace and lockfile. The main extension's dependencies are unchanged.

## Result

**Blitz/Stylo is a feasible reuse candidate on the required Web toolchain.** Its
headless style/layout transition path runs natively and in actual Chrome as an
Emscripten side module. It is not yet integrated into the Godot scene, text or
paint pipelines, and the probe does not establish its application-scale
performance.

This matters because Taffy alone supplies layout algorithms. Blitz integrates
Stylo's CSS cascade, computed values, transitions and animations with Taffy,
incremental layout damage, text layout, hit testing, and a paint tree. Reusing it
could remove substantial custom CSS work; it would introduce a broader native
engine and an integration boundary that must be deliberately qualified.

## Pinned inputs

- Blitz: `3f85506dcf2e465947413cef87d15515d0c548c8` (`0.3.0-beta.4`).
- Stylo: Blitz's own pin, `2dca34592ced37c6aa01733e94206a767194cf9d` (`0.23.0`).
- Taffy: Blitz's own pin, `fca167cf659b8bf48019d0dea90624109a78103f` (`0.15.0`).
- Native compiler: rustup Rust `1.99.1`.
- Web compiler: `nightly-2026-05-15`, `wasm32-unknown-emscripten`, rebuilt standard
  library with the main project's pthread/atomics and exception ABI settings.
- Emscripten `6.0.12`, pinned Binaryen `133`, and Breaka lazy-table ABI v2.
- `blitz-dom`, `blitz-html`, and `blitz-traits` use `default-features = false`.
  Optional networking, system fonts, SVG, accessibility and custom widgets are
  not part of this minimal probe. The resolved graph contains 200 packages.

## Executed behavior

The probe parses real HTML and CSS, mutates the panel's inline `height` through
Blitz's document mutator, supplies timestamps to `resolve`, and reads the actual
Taffy geometry produced by the integrated pipeline. It does not replace Stylo's
transition implementation or directly write layout results.

| Case | Observed result |
| --- | --- |
| `height: 40px → 120px`, linear, one second | 40px initially, 80px at 0.5s, 120px after completion |
| Following sibling during the size transition | Sibling top moves to 80px at the midpoint |
| Reverse back to 40px at the midpoint | Presentation remains at 80px, reaches 60px at 0.75s and 40px after completion; CSS reversal shortening is active |
| Remove an animated element | Subsequent resolution succeeds and active animation ticking clears |
| `height: 40px → auto`, intrinsic child height 120px | Immediately becomes 120px; smooth intrinsic sizing is absent in this pinned path |

All assertions passed in the native executable, its Rust test, the Node dynamic-loader smoke,
and Chrome `156.0.8078.80`. The browser reported cross-origin isolation, exit code
zero, and no browser or probe errors. Its temporary server and browser were
closed after verification. Machine-readable browser and build reports are under
the probe's ignored `artifacts/` directory.

The first native release build took 1m53s. The first matching Web build took
1m36s. These are observations on this workstation, not reproducible build-time
benchmarks. The optimized Wasm side module is **6,778,668 bytes**, SHA-256
`f3b459029520f52a514c47ddba14e5c2b8c0b8572e79756713387774968c181f`.
That module includes the minimal HTML, CSS, layout and text dependencies; it does
not include a Godot adapter or a painter. Its size should not be compared as if it
implemented the same scope as the current smaller Taffy-only extension.

## Why the animation results are credible

Blitz's [`resolve_stylist`](https://github.com/DioxusLabs/blitz/blob/3f85506dcf2e465947413cef87d15515d0c548c8/packages/blitz-dom/src/stylo.rs#L89-L209)
advances native animation states, restyles animated elements at the supplied
time, clears removed-node animation sets, and reports whether another frame is
needed. The document's
[`resolve`](https://github.com/DioxusLabs/blitz/blob/3f85506dcf2e465947413cef87d15515d0c548c8/packages/blitz-dom/src/resolve.rs#L78-L132)
then runs damage propagation, layout, transforms and paint-tree construction.

Stylo implements
[transition replacement and reversal](https://github.com/servo/stylo/blob/2dca34592ced37c6aa01733e94206a767194cf9d/style/servo/animation.rs#L1370-L1570).
Its
[length/percentage interpolation](https://github.com/servo/stylo/blob/2dca34592ced37c6aa01733e94206a767194cf9d/style/values/computed/length_percentage.rs#L965-L1007)
also preserves mixed-unit expressions as weighted `calc()` values. Those
percentage and mixed-unit cases were inspected in source but are not part of the
executed numeric-height fixture.

Intrinsic sizing is a separate extension seam. The pinned Stylo
[`GenericSize`](https://github.com/servo/stylo/blob/2dca34592ced37c6aa01733e94206a767194cf9d/style/values/generics/length.rs#L133-L176)
represents `Auto` and a length/percentage as different variants, and its
[derived interpolation](https://github.com/servo/stylo/blob/2dca34592ced37c6aa01733e94206a767194cf9d/style_derive/animate.rs#L49-L63)
rejects different variants. The immediate jump observed by the probe agrees with
that causal path. Smooth intrinsic transitions would require explicit support
for intrinsic endpoints, dependency-sensitive measurement and retargeting; an
`allow-discrete` transition would not provide smooth sizing.

## Integration work and risks

1. **React mutation adapter:** retain the existing JS component/reconciler-facing
   API if desired, but map its committed tree, attributes and stylesheet changes
   into a Blitz document. A node remains an identity; CSS values need their own
   typed representation rather than overloading IDs or existing scalar fields.
2. **Native frame ownership:** provide one document clock and schedule resolution
   while transitions are active or style/layout is dirty. A React update supplies
   the destination state; native animation sampling does not need a JS commit
   every frame. Cancellation and node removal must remain owned by the document.
3. **Paint and text:** Blitz currently uses Parley and an AnyRender-oriented
   painter. The probe uses no visible text and no painter. Using Godot text
   measurement alongside different Parley glyph metrics would not establish
   parity. A Godot paint/text integration or a deliberate alternative rendering
   backend is required before adopting it for player-facing UI.
4. **Intrinsic size transitions:** these are not supplied by the pinned engine.
   Their semantics must cover content changes, font/image readiness, ancestor
   resizing, interruption and restoration of `auto` ownership at completion.
5. **Animation lifecycle events:** existing animation execution does not imply
   complete DOM event dispatch. At evaluation time
   [issue #863](https://github.com/DioxusLabs/blitz/issues/863) and
   [PR #1277](https://github.com/DioxusLabs/blitz/pull/1277) for animation/transition
   event dispatch are open. `onTransitionEnd` and cancellation events need their
   own integration/qualification.
6. **Web qualification:** the compiled engine ran in a browser with the actual
   lazy-table loader source, but it has not shared a live Godot process, resources
   or frame budget with gameplay. Safari/mobile, full rendering, JS mutation
   transport, large-tree performance and memory behavior remain untested.

## Host smoke details

The small Emscripten host uses the engine's existing `lazy_function_table.cpp`
and `library_godot_lazy_table.js`. A plain main module initially failed the
compiler's required ensure-helper check; adding the actual engine helper fixed
that host setup. Its first dynamic load then exposed a missing standard-library
symbol: the C-only host did not retain Rust's C++ exception type-info dependency.
Emscripten's `reportUndefinedSymbols` path and the module imports established the
cause. The probe host now uses the documented `EMCC_FORCE_STDLIBS=1` option for
runtime-discovered libraries. This changes the isolated smoke host only; no
engine, SDK, generated Wasm, or production path was patched.

## Decision

Do not reject Blitz/Stylo on an assumption that it cannot compile or execute on
the required Web ABI: that part now has direct evidence. Also do not call it a
ready replacement for the current extension. It is a credible next integration
candidate for broad HTML/CSS behavior, with a clear native styling/animation
foundation, a larger dependency/payload cost, and unresolved Godot paint/text and
intrinsic-size integration work. The isolated probe can be kept as a regression
check while that decision is made.
