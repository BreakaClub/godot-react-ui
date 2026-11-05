# Motion engine and extension boundaries

The renderer keeps React's authored state separate from the values currently being displayed. A React update sends a target once; the native owner advances motion on its Godot process clock. The Web build uses the same Rust code in a Wasm side module. UI work remains on the Godot main thread; this is not a background-thread performance claim.

## Ownership and data flow

1. `src/types.ts` defines typed authoring properties. `src/styles.ts` resolves the documented utility subset; typed inline styles can also declare transitions.
2. `src/renderer.ts` maintains the committed React host tree and sends changed native nodes in a validated batch. It does not render animation frames through React.
3. `native/protocol.rs` holds canonical authored styles and validates mutation/topology contracts. A target such as `height: auto` is not overwritten with sampled pixel values.
4. `native/style_engine.rs` owns a retained Blitz document and calls its public Stylo style pass. Stylo supplies interpolation, easing, delays, and reversal behavior. This adapter does not call Blitz's Parley layout/painting pipeline.
5. `native/motion.rs` applies sampled presentation values to Taffy and Godot's paint resources, `native/layout.rs` runs Taffy with text measured by Godot, and `native/lib.rs` owns the root control and draws. Godot `TextParagraph` remains the text measurement and drawing authority. Layout changes reflow siblings; paint-only changes preserve the layout cache.
6. `native/render_items.rs` owns lightweight CanvasItem RIDs. Rectangular clip intersections are used for both draw commands and hit testing. There is still one owning Godot Control, rather than a Control for each React element.

The native owner pauses its clock while outside the scene tree and resumes when the same control reenters. Removing a node releases its layout, animation, and render resources. In `native/style_engine.rs`, removed Blitz DOM nodes are detached with `remove_node` (clearing `IS_IN_DOCUMENT` so Stylo cancels their transitions immediately) rather than freeing their `SlotMap` slot (`remove_and_drop_node`): `blitz-dom` casts `NodeId(u64)` to 32-bit `OpaqueNode(usize)` on `wasm32`, and `slotmap::KeyData::from_ffi` reconstructs truncated upper-32-bit generations as `v1`, so keeping allocated slots at `v1` preserves lossless 32-bit `OpaqueNode` lookup across unmounts and remounts. Events are queued for JS rather than calling JS while Rust holds a mutable root borrow.

## Intrinsic dimensions

Pinned Stylo handles numeric transitions but does not smoothly interpolate a numeric size and `auto`; the isolated experiment records this explicitly. The native extension therefore supplies intrinsic endpoints when `interpolateSize: 'allow-keywords'` is enabled.

A separate Taffy measurement tree uses duplicated Godot shaping resources. It resolves the target under the current parent constraints without changing the displayed tree or its text paragraphs. Pixel endpoints are passed into Stylo while the canonical model keeps the authored dimension. Each intrinsic axis releases its override when its full-precision sampled pixel value reaches the endpoint. Returning to `auto` does not wait for an unrelated paint animation to end.

During an active intrinsic transition, content, font metrics, parent dimensions, and the shell's width can invalidate the endpoint. Retargeting starts from the current presentation. Once intrinsic motion finishes, `auto` resumes normal layout behavior; content changes alone do not invent a new transition.

The prototype explicitly rejects intrinsic transitions on a flex main axis unless `flexGrow` and `flexShrink` are zero. This avoids applying flex distribution twice to an already-used intrinsic endpoint. Direct pixel/percentage transitions are also rejected: Stylo can interpolate their calc expressions, but the high-level Taffy adapter currently lacks a resolver with the current layout's containing-block context. Supporting them requires extending that layout adapter or its upstream calc callback, while retaining the same React, protocol, and native-owner boundaries. Previous-frame rectangles are not used as a substitute for CSS sizing semantics.

## Adding features

| Feature category | Extension points | Existing parts that remain responsible |
| --- | --- | --- |
| Another animated paint property | Typed protocol value, Stylo property mapping, sampled value, Godot paint adapter | React reconciliation, native clock, CSS timing and reversal |
| Another layout property | Typed protocol and Taffy mapping; computed-value resolution when required | Native measurement, layout invalidation, sibling flow |
| Stylesheets and selectors | Public stylesheet registration plus class/attribute mutations into the retained Blitz document | Stylo's selector/cascade engine; current utility resolver is not a CSS compiler |
| Rounded clipping or masks | Native clip representation and render adapter, matching hit geometry | Native ownership, transition samples, layout tree |
| Scrolling and virtualization | Owned scroll offset, clipping/input policy, visible-content management | Style/motion engine and stable node identities |
| Text input, rich text, accessibility | Dedicated typed widget/text/accessibility adapters and lifecycle tests | React state, canonical node identity, native layout authority |

The last categories require new subsystems, not just additional utility names. The architecture provides ownership boundaries; it does not claim those features are implemented or costless. The current transition property set is width, height, opacity, and background color. General keyframes, animation lifecycle callbacks, full CSS stylesheet authoring, and browser-complete layout behavior are not claimed.

## Measurement contract

Profiling is opt-in and bounded. JS samples record tree/style diff, JSON encoding, synchronous native call, and complete host flush durations. A reconciliation window includes its nested host/native work and must not be added to those stages again. Payload size is reported as UTF-16 characters, not as wire bytes.

Native samples separate batch parsing, model cloning, validation, synchronization, layout, geometry collection, motion work, and draw-command CPU work. `animating` reports actual engine/owned intrinsic activity; the transition records are diagnostics rather than Stylo's private per-property state. Rounded color or geometry values are not used as the root's completion signal.

The browser verifier records RAF intervals, input/render-request to observed-draw RAF latency, and JS heap observations. None of these measures physical display latency or GPU execution time. Screenshots and full tree snapshots are kept outside the timed benchmark windows. The synthetic matrix updates every keyed cell at 50, 500, and 2,000 cells, with both plain boxes and shaped text; offscreen nodes are not virtualized. It is a scaling probe, not a claim that those workloads represent a game HUD.

See `native/PROTOCOL.md` for the exact wire and diagnostic schemas, `docs/BLITZ_EVALUATION.md` for the dependency experiment, and the generated files under `artifacts/motion-web-verification/` for measurements from a specific build.
