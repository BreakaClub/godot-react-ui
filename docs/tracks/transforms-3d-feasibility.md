# Track notes: can 3D transforms match HTML mid-tree? (`transform-3d-spike`)

Branch `transform-3d-spike`, based on main `d282fee`. An experiment, not a feature: nothing under `native/`, `src/` or `demo/` changed.
Everything is in `experiments/transform3d/` (GDScript on the raw `RenderingServer`, plus Node scripts for Chrome and the comparison).
`docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md` are not edited here.

Ben's question: "What about 3D transforms for individual elements? I know we can render in world space which is very powerful, but can we
match HTML with 3D transforms mid tree?"

## Answer

**Yes, with a render target per transformed element, and it matches Chrome closely.** A transformed element, with its whole subtree flattened
into its own render target (a *surface*; "layer" is already taken by the React roots in `stacking.rs`), is drawn mid-tree as one canvas item whose
fragment shader applies the inverse homography. The shader needs no W from the engine: it reads the item-local position (interpolated affinely,
which is exact because every ancestor transform is affine) and divides by the third row itself. Measured against headless Chrome 156 on this M1 Max,
on both engines (Breaka 4.8 and stock 4.7.2) and all three renderers, using Chrome's own raster of the flat card as the source so the
comparison isolates the transform:

* interior mean difference **0.01 to 0.13** levels of 255 (p99 1, max 2) for `perspective()`, `rotateX/Y/Z`, `translateZ`, `perspective-origin` and
  compositions, at DPR 1 and 2; edges mean 0.02 to 0.34 (p99 1, max 1 to 3);
* `preserve-3d` with a BSP sort: a six-face cube and two intersecting cards, mean 0.9 (DPR 1) to 1.6 (DPR 2), p99 1 to 32;
* a surface inside a surface, real 3D in both: mean 1.1 to 1.3, p99 8 to 19, max 57 to 66.

What does **not** match, with the numbers, is below, next to what matches. The short list: a plane crossing the eye matches Chrome's painting but
not Chrome's hit testing (Chrome's own hit region is disjoint from what it paints); the Godot-rendered card differs from Chrome's by the text
rasteriser (mean 4 to 7, a baseline that the flat card has too); a surface drawn inside a `filter` group on an opaque Compatibility target loses
alpha to two bits; the alternatives that avoid the render target all fail one of the CSS features (section 7); and I could not make the real-3D-quad
alternative render the right colours on Mobile and Forward+ (section 7d).

## What was built and how it was measured

| File (all in `experiments/transform3d/`) | What |
| --- | --- |
| `scenarios.json`, `scenes.json` | The card scenarios (a 320 x 200 card: 1 px white border, 16 px radius, text, a 55 % translucent fill, on a two-colour page with a stripe) and the `preserve-3d` / nested scenes. Both sides read them. |
| `geometry.mjs`, `chrome-reference.mjs` | The CSS matrices in JS, and headless Chrome (puppeteer-core, CDP only) rendering every scenario at DPR 1 and 2, the flat card at several raster scales, `getBoundingClientRect()` and an `elementFromPoint` grid. Chrome 156.0.8078.80, default flags. |
| `compositor.gd` | The matrices in GDScript (a second implementation: its projected corners agree with Chrome's `getBoundingClientRect()` to 0.01 px), the visible polygon (near-plane clip, screen clip, edge expansion), the shader, and layer / material helpers. |
| `spike.gd`, `s_*.gd` | The driver (one scenario per Godot run) and the scenarios: `accuracy`, `raster`, `layer_memory`, `nest_*`, `cost_layers`, `p3d_scene`, `hit_*`, `alt_*`, `alt2_*`. |
| `compare.mjs`, `hit-test.mjs` | Per-channel comparison (mean, 99th percentile, max of the per-pixel largest channel difference, in 8-bit levels) over three regions of the projected outline: interior, an edge band of 1.5 device pixels, exterior; whole-scene comparison for `preserve-3d`; side-by-side PNGs. |
| `run-accuracy.sh`, `run-scenario.sh` | Run a scenario on both engines and all three renderers. |

Side-by-side PNGs (Chrome | ours | difference x4) are in `artifacts/transform3d-spike/sidebyside/` (gitignored, 48 files; names say what they are);
the raw captures are in `artifacts/transform3d-spike/godot/<engine>-<renderer>/` and `chrome/`, the numbers in `compare*/results.json`.

Method notes that matter for reading the numbers:

* **"src" mode** samples Chrome's own raster of the untransformed card (a PNG at the layer's raster scale). The difference is then the transform, the
  sampling and the edge, not the text rasteriser. **"own" mode** renders the card with Godot (`StyleBoxFlat`, `FontFile` of the system Arial) into the
  surface; the flat (untransformed) card has the same differences from Chrome, so they are the rasteriser, not the transform: flat interior
  4.2 / p99 101 / max 217 (DPR 1), 5.6 / 108 / 217 (DPR 2); p35 transformed 4.7 / 85 / 213 and 6.0 / 99 / 217. The edge band at DPR 2 is 20 to 26 in
  both (`StyleBoxFlat`'s border against Chrome's), flat and transformed alike.
* **Engines and renderers.** Breaka's Godot 4.8 and stock 4.7.2; Compatibility (OpenGL 4.1 over Metal), Mobile and Forward+ (Metal 4.0). The two engines
  agree to the digit on every comparison (max difference of any mean: 0.00). Mobile and Forward+ agree to the digit. Compatibility is about 0.1 level
  higher in the interior (0.13 against 0.03), probably because its opaque target is RGB10_A2 (not checked).
* Every Godot run was a single window with `--audio-driver Dummy`, no OS input. (Godot launches were stopped by the coordinator's order near the end;
  what was and was not run is listed under "Not verified".)

## 1. The compositor layer: what the shader does and what each choice measured

The shader (`compositor.gd`, `SHADER`): `local` = the vertex's position in the item's space (a varying); `q = (row_s . p, row_t . p, row_w . p)` with the
three rows the inverse homography divided by the box size, so `q = (s, t, 1) / W` for the box's own coordinates `(s, t)` in 0..1; discard if
`q.z <= 0` (behind the eye); `uv = q.xy / q.z`. The polygon drawn is the box clipped to `W > 1e-5`, clipped to the screen, with its edges moved out 1 px.

| Question | What was measured |
| --- | --- |
| **Edge antialiasing** (no MSAA on canvas items) | Analytic: the four edge numerators `q.x`, `q.z - q.x`, `q.y`, `q.z - q.y` are affine in screen space, so their derivatives (`dFdx`, `dFdy`) are constant and `d / |grad d|` is the exact distance in device pixels; coverage is the product of `clamp(d + 0.5)`. Control with coverage off: edge mean 53 to 97, max 208 (a whole-alpha error, a 1 px stair). With it: edge mean 0.02 to 0.34, max 1 to 3. |
| **Premultiplied alpha** | A transparent target holds premultiplied colour; the shader returns premultiplied colour with `render_mode blend_premul_alpha`. Control with the engine's default blend: interior mean 48.5 to 49.3, max 214 to 225 on every scenario (the translucent fill is multiplied by alpha twice). |
| **Filtering and mipmaps, plane steep** | One bilinear tap, no mips, is what Chrome does: `rotateY(75deg)` at DPR 1 differs from Chrome by mean **0.13**, max 1. A supersampled option (up to 8 x 8 taps along the Jacobian) is smoother but differs from Chrome by mean 3.30, p99 64, max 111 (DPR 1) and 2.49 / 56 / 137 (DPR 2). Default `max_taps = 1`. There are no mips (a viewport texture has none); beyond about 8x minification it would still shimmer, as Chrome's does. |
| **Parameters per layer** | Two ways measured. (a) A material per surface with three `vec3` uniforms (what `compositor.gd` uses). (b) One shared material, the surface as the polygon's texture and `(s/W, t/W, 1/W)` as vertex data (UV and `COLOR.r`; the rasteriser interpolates it exactly). Same pixels (no pixel differs by more than 1 %, RMSE 1.3 to 2.0 of 65535), same cost (28.5 to 29.7 us per layer update from GDScript against 29.2 to 36.4: a `material_set_param` is not the cost). (b) has two defects: the engine multiplies `COLOR` by the item's modulate before the vertex shader reads it, so any tinted ancestor or `modulate` corrupts the data (measured with modulate 0.5: the shared quad shrinks and moves, the per-surface one is right), and `canvas_item_add_primitive` stores colours as half floats (`canvas.glsl` `USE_PRIMITIVE`). **Use (a).** Different surfaces have different textures, so they cannot batch anyway. No per-instance uniforms are involved, so the browser's 16-item limit does not apply, but the Web was not run. |
| **Ancestors** | The matrix is the element's matrix relative to its parent's box; every ancestor is affine, so the engine applies it. Nothing about the ancestors, the DPR or the viewport reaches the shader. |

### Accuracy table (src mode, one bilinear tap, analytic edges, premultiplied; mean / p99 / max in levels)

The raster scale is Chrome's, fitted in section 2. Worst of the six engine and renderer combinations is Compatibility; Mobile and Forward+ are the
second number where they differ.

| Scenario (CSS) | DPR | Interior | Edge band |
| --- | --- | --- | --- |
| `perspective(800px) rotateY(35deg)` (p35) | 1 | 0.13 / 1 / 2 (RD 0.03) | 0.28 / 1 / 1 |
| | 2 | 0.12 / 1 / 2 (0.01) | 0.17 / 1 / 1 |
| container `perspective 800px`, `rotateX(25deg)` | 1, 2 | 0.13 / 1 / 2 and 0.12 / 1 / 2 | 0.30 / 1 / 2 and 0.10 / 1 / 1 |
| `perspective-origin: 90% 15%`, `rotateY(35deg)` | 1, 2 | 0.13 / 1 / 2 and 0.11 / 1 / 2 | 0.34 / 1 / 2 and 0.15 / 1 / 1 |
| `translateZ(300px) rotateY(20deg)` (1.6x at the centre, largest local magnification 1.93) | 1, 2 | 0.09 / 1 / 2 and 0.08 / 1 / 2 | 0.23 / 1 / 2 and 0.13 / 1 / 1 |
| `perspective(800px) rotateY(75deg)` | 1, 2 | 0.13 / 1 / 1 and 0.11 / 1 / 2 | 0.23 / 1 / 1 and 0.26 / 1 / 3 |
| `perspective(800px) rotateX(20deg) rotateY(-30deg) rotateZ(8deg)` | 1, 2 | 0.13 / 1 / 2 and 0.12 / 1 / 2 | 0.33 / 1 / 1 and 0.19 / 1 / 2 |
| `rotateY(150deg)`, `backface-visibility` visible (mirrored) | 1, 2 | 0.12 / 1 / 2 and 0.11 / 1 / 2 | 0.30 / 1 / 1 and 0.18 / 1 / 1 |
| `perspective(100px) rotateY(80deg)` (crosses the eye) | 1, 2 | 0.10 / 1 / 9 and 0.10 / 1 / 7 | 0.41 / 3 / 57 and 0.18 / 2 / 3 |
| `perspective(200px) translateZ(120px) rotateX(70deg)` (crosses the eye) | 1, 2 | 0.65 / 22 / 143 and 0.09 / 1 / 3 | 0.74 / 21 / 42 and 0.13 / 2 / 18 |
| `translateZ(500px)` with perspective 400px (wholly behind the eye) | 1, 2 | nothing drawn by either: exterior max 0 | |
| the flat card (no transform), as a floor | 1, 2 | 0.52 / 1 / 2 and 0.51 / 1 / 2 | 0.13 / 1 / 1 and 0.00 / 0 / 1 |

The two weak rows are the plane crossing the eye: the residual is the grazing text rows next to the horizon (`artifacts/.../sidebyside/card-cross2-dpr1.png`)
and one corner of the near-plane edge. Chrome's geometry there is clipped at `W > epsilon`; mine at `1e-5`; the polygon matches, the texels near the
horizon do not (extreme minification, a single tap each).

Matrices: the projected bounding boxes of the six non-crossing scenarios equal Chrome's `getBoundingClientRect()` to 0.01 px.

## 2. Raster scale (and memory)

Text is sharp only if the surface is rasterised at the scale the plane is displayed at. I swept Chrome's own raster of the flat card (scales 1, 1.5, 1.6, 2,
2.5, 2.67, 3, 3.2, 4, 5, 5.33) against Chrome's transformed render and took the scale with the smallest error: **it fits `round(DPR x s)`, where `s` is the
largest singular value of the plane's Jacobian over the card** (the largest local magnification):

| Scenario | `s` | DPR 1 best scale (error) | DPR 2 best scale (error) |
| --- | --- | --- | --- |
| p35 | 1.151 | 1 (0.13 / 1 / 2) | 2 (0.12 / 1 / 2) |
| `translateZ(300px) rotateY(20deg)` | 1.932 | 2 (0.09 / 1 / 2) | 4 (0.08 / 1 / 2) |
| `perspective-origin 90% 15%` | 1.342 | 1 | 3 (0.11 / 1 / 2) |
| `rotateY(75deg)` | 1.255 | 1 | 3 (0.11 / 1 / 2) |
| `rotateX(25deg)`, combo | 1.086, 1.159 | 1 | 2 |
| crosses the eye (unbounded) | inf | 4 (0.10 / 1 / 9) | 4 (0.10 / 1 / 2) |

With the wrong scale (raster = DPR whatever the magnification) the same scenarios are 1.2 to 10.7 mean off: `translateZ` at DPR 2 1.60 / 44 / 182, `perspective-origin`
at DPR 2 1.26 / 33 / 137, the plane crossing the eye 10.69 / 105 / 196. Pure axis-aligned magnification (`translateZ(300px)` alone, 1.6x) is different: Chrome uses
the exact scale (1.6 at DPR 1: 0.08 / 1 / 1; 3.2 at DPR 2: 0.07 / 1 / 2; rounding to 2 or 3 gives 1.78 and 0.89). That case is affine, so the `transforms` track's 2D path
draws it at the real size and needs no surface (sharper than Chrome). (`translateZ(500px)`, 2.67x, could not be tested exactly: Chrome's flat PNG at 2.67 is 854.4 px wide.)
The cap: the plane crossing the eye (`cross1`) has unbounded `s`; Chrome's pick was 4 at both DPRs. I use 4, and the production rule should cap by texture size too.

**Memory.** RGBA8, 320 x 200 CSS px: **256,000 bytes at raster 1, 1,024,000 at 2, 2,621,440 at 3.2 (DPR 2 and 1.6x), 4,096,000 at 4**. What the renderers report
(`RENDERING_INFO_TEXTURE_MEM_USED` delta for one surface): Compatibility **2.00x** the raw bytes (2,048,000 / 5,242,880 / 8,192,000; probably a depth/stencil attachment, not
verified); Mobile 1.4x to 1.9x (1.97 MB / 4.10 MB / 5.90 MB; the first reading of each run includes first-use allocations and is not clean). So a card is 0.5 MB (Compat, DPR 1) to
8 MB (Compat, 4x); 50 cards at DPR 2 are 51 MB raw, about 100 MB on Compatibility. The ink overflow of descendants (shadows, children outside the box) adds to the surface.

## 3. Nesting and order

| Case | Result (all six engine and renderer combinations unless said) |
| --- | --- |
| **Order of nested targets in one frame** | Stage <- L1 <- L2, all redrawn every frame, L2's content a counter, read back after the frame. With `viewport_set_parent_viewport` (L2's parent L1, L1's parent the stage), registered in the worst order: **0 frames late** at every frame. Without parents, inner registered first: 0. Without parents, outer registered first: **2 frames late** (one per level), steadily. `RendererViewport::_sort_active_viewports` sorts children first, parents last, and siblings in registration order; so the rule is: **always set the parent**. |
| **Layer inside a layer, real 3D in both** | Outer `perspective(800px) rotateY(30deg)`, inner (flattened into the outer's plane) `perspective(300px) rotateX(35deg)`: vs Chrome mean **1.30 / p99 19 / max 66** (DPR 1) and **1.09 / 8 / 57** (DPR 2); 1.9 % and 1.0 % of covered pixels differ by more than 8 levels. The residual is along the inner card's border. The inner raster scale is the outer's times its own magnification. |
| **Clipped scroll container inside a surface** | Clip and scrolled content in the layer's canvas: no pixel outside the clip rectangle is covered (0 of 176,000 pixels outside); inside, exactly the stripes drawn (40,000 of 80,000 pixels empty: the gaps between the stripes). The surface is flat, so the engine's axis-aligned clip is exact there. |
| **`filter` (a canvas group with a shader) inside a surface** | The group has its own back buffer in the surface's target: the 55 % translucent fill comes out as exactly alpha 140 and the expected grey (35 premultiplied) on every combination, i.e. a surface is a transparent target (RGBA8 back buffer), so the two-bit alpha does not apply inside it. (A group shader that returns its colour as straight, with the default blend, double-multiplies: 19 instead of 35; the group's back buffer is premultiplied.) |
| **A surface inside a filter group** | Transparent outer target: group output equals the CPU's grey of the plain composite (channel max 1, alpha max 0, 227 distinct alpha levels). **Opaque outer target (the main viewport) on Compatibility: channel mean 12.46, max 35** (the group's back buffer is RGB10_A2: two bits of alpha, `texture_storage.cpp:2567`); on Mobile and Forward+ 0 / 0. This is `filters.md`'s known limit, and it applies unchanged. |
| **A surface under a clipped ancestor** | The quad is an ordinary polygon, so the normal clip applies: inside the clip identical to the unclipped render (max diff 0), outside it 0 of 235,200 pixels are anything but background. |

## 4. Cost on this M1 Max

How: stage 1280 x 800 CSS at DPR 2 (2560 x 1600); N cards 320 x 200 at raster scale 2, each a quad spinning (`rotateY`, 60 degrees per second, a different phase each); vsync off;
30 warm-up and 150 measured frames; medians. **GPU** is `viewport_get_measured_render_time_gpu` summed over the stage and the surfaces (the Compatibility driver has no timer: 0). **Engine CPU**
is `viewport_get_measured_render_time_cpu` summed likewise. **Wall** is the time between `frame_post_draw` signals. **Script** is the GDScript spent updating the quads (3 uniforms and a polygon per card:
about 80 us each; this is the interpreter, not the work: a Rust caller makes the same server calls). *Static*: surfaces rendered once (`VIEWPORT_UPDATE_ONCE`), only the quad's parameters move:
**a spin re-renders nothing**. *Dynamic*: surfaces re-rendered every frame (`UPDATE_ALWAYS`) with a moving item. *Flat*: the cards drawn straight into the stage, the cost of the content itself.

| Renderer | Case | GPU ms (1 / 10 / 50) | Engine CPU ms (1 / 10 / 50) | Wall ms (1 / 10 / 50) |
| --- | --- | --- | --- | --- |
| Mobile | flat | 0.25 / 0.31 / 1.11 | 0.021 / 0.041 / 0.131 | 2.67 / 2.57 / 2.54 |
| | **static** | 0.23 / 0.44 / **1.55** | 0.016 / 0.023 / **0.044** | 2.29 / 2.13 / 5.07 |
| | **dynamic** | 0.40 / 1.41 / **6.12** | 0.036 / 0.135 / **0.523** | 2.28 / 3.59 / 7.51 |
| Forward+ | flat | 0.22 / 0.30 / 0.64 | 0.020 / 0.041 / 0.129 | 2.48 / 1.32 / 2.10 |
| | static | 0.29 / 0.44 / 1.53 | 0.014 / 0.024 / 0.043 | 2.71 / 2.11 / 4.92 |
| | dynamic | 0.41 / 1.44 / 6.19 | 0.034 / 0.125 / 0.555 | 2.84 / 3.21 / 7.59 |
| Compatibility | flat | n/a | 0.114 / 0.243 / 0.925 | 1.18 / 1.25 / 2.54 |
| | static | n/a | 0.117 / 0.250 / 0.824 | 1.30 / 2.24 / 8.18 |
| | dynamic | n/a | 0.215 / 1.551 / **7.671** | 1.42 / 4.78 / 15.04 |
| Stock 4.7.2, Compatibility | static, dynamic (50) | n/a | 0.725, 6.889 | 5.69, 12.99 |

Reading it: the static case, which is the motion case (a transition or spin), costs **0.04 ms of engine CPU and 1.5 ms of GPU at 50 surfaces on Mobile and Forward+** (0.8 ms CPU on
Compatibility); most of the wall time at 50 is the GDScript driver's 4 ms. The dynamic case is what content change costs: 50 re-rendered surfaces are 6.1 ms of GPU (Mobile, Forward+) and 7.7 ms of
engine CPU (Compatibility: about 150 us of engine CPU per viewport). Only update a surface when its content changed. p95 wall times (5 to 18 ms) are in `cost-layers.json`; they are noisy
on a desktop with the window server's own scheduling, which is why the medians of the engine's own timers are the numbers to use.

**The Web was not run** (it needs a WebGL2 export; the brief said only if quick, and it is not). The shader's portability is a claim someone must check: it uses `dFdx`/`dFdy`,
`textureSize` and a loop whose bounds come from a `uniform int`, all WebGL2-legal, but untested here.

## 5. `transform-style: preserve-3d`

The faces of one 3D context are surfaces; the draw order comes from a BSP tree in the projected space `(x/w, y/w, z/w)` (planes stay planes there, as in `cc::BspTree`; the viewer is at `z = +inf`);
pieces that cross a splitter are cut in homogeneous coordinates (exact `(u, v)` at the cut), each piece is drawn with its face's surface and homography, outer edges expanded by 1 px, cut edges not.
Implemented in `s_p3d.gd` (about 280 lines of GDScript).

| Scene | Variant | DPR 1 mean / p99 / max | DPR 2 mean / p99 / max | Pixels off by more than 32 |
| --- | --- | --- | --- | --- |
| Six translucent faces (alpha 0.7, backfaces visible), `rotateX(-25deg) rotateY(35deg)`, perspective 800px | **BSP** | **0.94 / 1 / 38** | 1.44 / 21 / 74 | 0.00 % , 0.52 % |
| | depth of the centre only (no cutting) | 0.94 / 1 / 38 (a convex body needs no cut) | 1.44 / 21 / 74 | same |
| | document order | 50.8 / 137 / 137 | 51.3 / 137 / 148 | 57 % |
| Two translucent cards that intersect along a line | **BSP** (3 polygons: one card is cut in two) | **0.91 / 1 / 18** | 1.58 / 32 / 69 | 0.00 % , 0.96 % |
| | depth of the centre only | 14.7 / 84 / 137 | 15.4 / 84 / 153 | 16 %, 17 % |
| | document order | 14.7 / 84 / 137 | 15.4 / 84 / 153 | 16 %, 17 % |

(Compatibility; the other five combinations are within 0.04 of the mean, with one exception below.) At DPR 2 the residual is a dashed 1 px line along the outer silhouette; the intersection line
itself shows no difference (`sidebyside/preserve3d-cards-bsp-dpr2.png`). A real depth buffer does not buy this (7d): intersecting translucent faces need the cut either way.

**One failure I could not explain.** In one Forward+ launch (the first scene of the run, cube, DPR 1) two of the six faces were drawn as if their `UPDATE_ONCE` surface was blank (mean 18.2, max 187,
against 0.90). Six repeat launches, then 24 more (8 each on Forward+, Mobile and Compatibility), reproduced nothing; one failure in roughly 40 (my estimate, not a count) Forward+ launches that used `UPDATE_ONCE` surfaces.
The cause is not known (an unready pipeline on the single render is my guess, not a finding). **The implementation must not trust a single `UPDATE_ONCE`**: render a new or changed surface for its
first two frames and then stop, and put a negative-control check in the verifier.

**What it would take in Rust.** A port of `DrawPolygon` / `BspTree` (about 250 lines: plane from Newell's normal, classify with epsilon, split with edge flags, far-to-near traversal), the face list per
context from `stacking.rs`, and the flattening rules (a context root with `opacity < 1`, `filter`, `overflow` other than visible, a mask or a clip-path is flat, as in the spec); see "Recommended architecture".

## 6. Hit testing, `backface-visibility`, the near plane

* **Round trip** (`hit_roundtrip`: a 65 x 41 grid of plane points including the edges and corners, to screen and back through the inverse homography): maximum error **9.0e-5 px in f64, 3.0e-4 px in f32**
  (single-precision `Basis`, the steep `rotateY(75deg)` case, the worst), on every non-crossing scenario; the plane crossing the eye 4.9e-4 (f64) and 2.5e-3 (f32). All far inside the 0.05 px bound.
  Near the horizon the screen position is the ill-conditioned side: in `cross2` the re-projected point is up to 4.6 px off for points whose `W` is a few thousandths. Use f64 for the inverse.
* **`backface-visibility: hidden`** by the sign of the homography's determinant (the local Jacobian is `det(H) / W^3`, and visible points have `W > 0`): it agrees with the sign of the projected area and with
  `cos(angle)` for `rotateY(0 to 355 deg)` in 5 degree steps (70 of 70, `hit_facing`). Chrome with `hidden` at `rotateY(150deg)` draws exactly the bare page (0 differing pixels against the empty page);
  not drawing a face with a negative determinant reproduces that by construction (that capture was skipped, so it is not a pixel measurement of ours). Visible backs draw mirrored and match (table above).
* **Near-plane clipping, `W <= 0`** (a plane crossing the viewer): clipping the polygon against `W > 1e-5` before projecting reproduces Chrome's painting (table, `cross1`, `cross2`: interior 0.10 to 0.65 mean at DPR 1,
  0.09 to 0.10 at DPR 2); a plane wholly behind the eye draws nothing in both.
* **Hit grid against Chrome's `elementFromPoint`** (8 CSS px grid, 4000 cells, DPR 1; `hit-test.mjs`; the card's rounded corners included): p35 7 disagreeing cells of 863 hits, x25 3 of 921, po 6 of 1042, tz 10 of 2470,
  steep 28 of 288, combo 8 of 838, `rotateY(150deg)` visible 5 of 887, `translateZ` alone 0 and 0. The worst disagreement is 0.67 to 1.58 px from the card's outline for p35, x25, steep and the mirrored case, and 2.5, 3.9 and 6.9 px for combo, po and tz; I measured distance to the unrounded outline and suspect those are at the rounded corners (16 px radius, magnified), but did not check. **For planes crossing the eye Chrome's hit test and its painting disagree with each other**: `cross1` painted 1992 cells, hit 97; in `cross2` Chrome's hit region is the
  unclipped mirror image above the horizon (its `getBoundingClientRect()` ends at y = 160.68, where the painted region begins), disjoint from the painted one. I follow the painting. Do not copy Chrome's hit region there.

## 7. The alternatives, one measurement each

All against the compositor layer at the same raster scale (DPR), mean / p99 / max in levels, p35, Compatibility and Mobile (Forward+ is identical to Mobile; stock and Breaka agree).

### 7a. A canvas group with a homography material (no new target)

The group's back buffer holds the flat card; the wrapper item covers the projected outline and its shader reads the buffer back through the inverse homography.

* **Mobile / Forward+ (RGBA8 back buffer): interior 0.02 / 1 / 1** (the same as a surface), edge mean 8.5 to 10.9 (p99 52 to 79): the buffer's own bilinear edge is faded twice.
* **Compatibility (opaque target: RGB10_A2, two bits of alpha): interior 17.7 / 24 / 32** (DPR 1 and 2, every scenario 17.1 to 17.7): two bits of alpha can only read the 55 % fill back as 33 % or 67 %, and the card is visibly more opaque
  (`sidebyside/alt-group-compat-p35-dpr1.png`); edge 8.6 to 16.7.
* **Nesting**: no: groups do not nest (`filters.md`: a group in a group draws wrong colours). A control that reads the buffer as straight colour is wrong everywhere (interior mean 46).
* **Ruled out** for Compatibility, which is the default and the Web renderer.

### 7b. A `vertex()` shader projecting `VERTEX` over the subtree with `use_parent_material` (no target)

Written with `render_mode skip_vertex_transform`, `MODEL_MATRIX`, and the world-space homography.

| What is projected | Interior mean / p99 / max (DPR 1) | Edge band |
| --- | --- | --- |
| A textured rect (two triangles): the seam of an affine UV | **22.1 / 218 / 218** (steep 27.1, x25 19.5, combo 22.5) | 22.8 / 96 / 128 |
| A `StyleBoxFlat` (border, radius, translucent fill) | 0.63 / 4 / 83 (steep 0.50 / 1 / 74) | 7.6 / 53 / 84 (steep 13.4) |
| Glyphs (text) | 0.16 / 4 / 19 (steep 0.28 / 6 / 25) | n/a |
| The whole card (style, text, the colour bar) | 1.04 / 14 / 109 | 7.6 to 25.4, aliased outline |

* Sharp text, as predicted, and flat colours and rounded rects are fine in the interior; **an image or any large textured rect is unusable** (the 99th percentile is the full range, 218).
* The outline has no antialiasing (the feather of the style box is projected with the geometry): edge mean 7.6 to 25.
* **Culling**: an item whose unprojected rectangle is off screen but whose projection is on screen is **not drawn: 0 of 640 pixels** (the engine tests the pre-projection rectangle); with
  `canvas_item_set_custom_rect` set to the projected bounds it is drawn (640 of 640). Every projected item needs its custom rect maintained.
* **Clips are screen-space and unprojected**: a clipping ancestor with the card's own rectangle (`overflow: hidden`) cuts 3.6 % of the projected card (p35), 6.8 % (steep) and **59 %** (`translateZ`).
* No nesting, no `preserve-3d` ordering, no per-pixel anything. **Ruled out** as the general mechanism. (Text-only subtrees would be fine; it is not worth a second path.)

### 7c. Subdivided mesh quads (CPU-projected vertices, no shader, no target)

A textured grid of N x N cells. Worst UV error (affine across a triangle against the true projective map) in CSS px, and the interior difference from the surface (DPR 1, Compatibility; Mobile is 0.1 to 0.35 lower):

| N (triangles) | 1 (2) | 2 (8) | 4 (32) | 8 (128) | 16 (512) | 32 (2048) |
| --- | --- | --- | --- | --- | --- | --- |
| worst UV error, p35 | 19.2 | 5.7 | 1.55 | 0.41 | 0.10 | 0.03 |
| worst UV error, `rotateY(75deg)` | 21.7 | 7.2 | 2.1 | 0.57 | 0.15 | 0.04 |
| worst UV error, `translateZ(300px) rotateY(20deg)` | 32.0 | 9.4 | 2.56 | 0.67 | 0.17 | 0.04 |
| interior mean / p99, p35 | 23.4 / 218 | 13.0 / 212 | 6.3 / 127 | 2.2 / 41 | 1.28 / 20 | 1.21 / 19 |

It converges (0.5 px needs N = 8 for p35 and 16 for the other two, that is 128 to 512 triangles per textured rect), but the **outline never gets antialiased** (edge mean 11 to 23, p99 90 to 116 at every N), the per-element work is the vertex
count, every draw command in the subtree would need subdividing and re-projecting on every transform change, and nothing here nests or sorts. **Ruled out.**

### 7d. A real quad per element in a 3D viewport with a camera

Raw `RenderingServer`: a scenario, a camera with an off-centre frustum (`camera_set_frustum`, the eye at distance `d` over the perspective-origin), one mesh per face with its surface as albedo, drawn into the stage.

* **Geometry right on all three renderers** (first try, the cube and cards are in the right place on Mobile and Forward+ too).
* **Colours right on Compatibility only; wrong on Mobile and Forward+ and not fixed.** On Compatibility, single card p35: interior 6.6 / 85 / 217 (the compositor's own-mode floor is 4.7), edge **17.4 / 93 / 103 without MSAA and 7.9 / 41 / 64 with 4x MSAA**
  (the compositor: 4.1); cube 1.84 / 35 / 156 (1.61 / 35 / 91 with MSAA) against the BSP compositor's 0.94 / 1 / 38. On Mobile and Forward+ the first attempt came out washed out (mean 56 to 77) because the 3D pipeline treats `ALBEDO`
  as linear and tonemaps to sRGB; I did not get to correct and re-run it before the Godot launches were stopped. The numbers for those two renderers are therefore not a measurement of the approach, only of my shader. (The cost
  numbers below do not depend on colour.)
* **Does the depth buffer buy anything for preserve-3d?** For opaque faces, yes (exact per-pixel intersections, no cutting). For translucent faces, **no**: the engine sorts transparent objects per object, so two intersecting
  translucent cards are wrong: **20.0 / 87 / 163, 22.6 % of the covered pixels more than 32 levels off** (Compatibility, DPR 1 and 2), against the BSP compositor's 0.91. CSS cards are almost always translucent or have alpha edges.
* **Antialiasing** is MSAA (4x on all three renderers' 3D): coarse against analytic coverage (above).
* **Cost** (same stage, N quads, spinning, surfaces rendered once), GPU / engine CPU in ms at 1 / 10 / 50: Mobile off 0.60 / 0.74 / 0.82 and 0.07 / 0.08 / 0.10, 4x MSAA 0.84 / 0.89 / 0.97; Forward+ off 1.04 / 1.36 / 2.09, 4x 1.22 / 1.35 / 2.57, CPU 0.09 to 0.13;
  Compatibility CPU 0.22 / 0.26 / 0.63, 4x 0.48 / 0.55 / 0.71. Against the compositor's static case (Mobile GPU 0.23 / 0.44 / 1.55): a 3D viewport costs more with few quads (a whole extra pass) and a little less with many; neither matters.
* The big costs of (d) are not in the table: it is a second pipeline (3D viewport, cameras, mesh instances, materials, an environment that is not the 2D one), with its own filtering, antialiasing, colour space and transparency
  rules, and it still needs the surfaces for the content. **Ruled out as the way to get CSS: the compositor layer is the same surfaces without the second pipeline.**

## Per CSS feature: matches or not

| Feature | Matches Chrome? | Number |
| --- | --- | --- |
| Transform functions (`perspective()`, `rotateX`, `rotateY`, `rotateZ`, `translateZ`, compositions) | Yes | Interior mean 0.01 to 0.13, p99 1, max 2; edge mean 0.02 to 0.34, p99 1, max 1 to 3 (DPR 1 and 2, six combinations). Geometry 0.01 px against `getBoundingClientRect()`. |
| `perspective` (property on the parent) | Yes | Same rows (x25, po, tz). |
| `perspective-origin` off centre | Yes | 0.13 / 1 / 2 (DPR 1), 0.11 / 1 / 2 (DPR 2); Chrome rasterises it at 3 at DPR 2. |
| `translateZ` toward the viewer | Yes, only at Chrome's raster scale | 0.09 / 1 / 2 and 0.08 / 1 / 2; at raster = DPR it is 2.99 / 57 / 163 and 1.60 / 44 / 182. Pure axis-aligned magnification is affine: use the 2D path. |
| `transform-style: preserve-3d` (cube, 6 faces) | Yes | 0.94 / 1 / 38 (DPR 1), 1.44 / 21 / 74 (DPR 2). |
| Intersecting planes | Yes (BSP cut) | 0.91 / 1 / 18 and 1.58 / 32 / 69; sorting by depth alone: 14.7 / 84 / 137. |
| `backface-visibility` | Yes | Visible: 0.12 / 1 / 2. Hidden: determinant sign, 70 of 70 angles; Chrome draws the bare page, and so do we by construction. |
| Nesting (a surface inside a surface) | Yes, a little looser | 1.30 / 19 / 66 and 1.09 / 8 / 57. Same-frame order requires `viewport_set_parent_viewport`; without it 2 frames late. |
| `overflow` clip inside a surface; clipped ancestor of a surface | Yes | 0 leaked pixels, 0 difference. |
| `filter` inside a surface | Yes, better than the main target | alpha exact (140 of 140) on all renderers. |
| A surface inside a `filter` | Yes except Compatibility on an opaque target | 0 / 0 on RGBA8; mean 12.5, max 35 (two-bit alpha) on Compatibility with an opaque outer target. |
| Plane crossing the eye (`W <= 0`) | Painting yes; hit testing no | Painting 0.10 / 1 / 9 (DPR 1, `cross1`), 0.09 / 1 / 3 (DPR 2, `cross2`) with one 143 corner at DPR 1; Chrome's own hit region is not the painted one. |
| Hit testing | Yes (inverse homography) | 9e-5 px (f64), 3e-4 px (f32) round trip; 0 to 28 disagreeing cells of 288 to 2470; worst 0.67 to 1.58 px from the outline (2.5 to 6.9 px for combo, po, tz: probably rounded corners, not checked). |
| Transitions | Yes for matching function lists | Chrome's animation paused at 50 % against the static state at the midpoint: 0 differing pixels (DPR 1), peak 1 level (DPR 2). Mismatched lists need CSS's matrix decomposition; not built or measured here. |
| `translateZ` text sharpness during a change of scale | Not solved | The raster scale steps at integer boundaries (Chrome's rule), a re-render per step; a transition should rasterise at the largest scale it will reach. |
| Text rasterised by Godot rather than Chrome | Differs (not a 3D issue) | Flat and transformed alike: interior mean 4 to 7. |
| `backdrop-filter` on or under a surface | Not supported | The backdrop is the main target's screen space. |

## Recommended architecture (one page)

**A surface per element whose resolved transform is not affine in its own plane** (the homography's bottom row is not `(0, 0, 1)` after dividing by `W`: any `perspective()`, a parent's `perspective` with a 3D transform
on the child, or `rotateX/Y` seen through a perspective), plus every face of a `preserve-3d` context. Everything that is affine (2D, and `rotateX/Y` without perspective, which is a 1D scale, and pure `translateZ`
magnification) stays on the `transforms` track's path, with no render target.

1. **Surface.** `viewport_create` (transparent background, `CLEAR_ALWAYS`, `viewport_set_parent_viewport` to the viewport that holds the quad: this is what makes nesting same-frame), its own canvas, `canvas_item` for the quad with
   one `ShaderMaterial` (three `vec3` uniforms) and the polygon of `visible_polygon`. The element's `box_item`, `content_item`, scroll items, overlay, filter group wrapper (the filter lives inside the surface) and its
   descendants attach under the surface's canvas with a canvas transform `scale(r) . translate(-ink_origin)`; the quad takes the place the box item had in the paint parent (as `GroupItems::shell` does for a filter).
2. **Raster scale** `r = round(DPR x s)`, with `s` the largest Jacobian singular value over the plane, capped (4; and by a texture size budget); recomputed when the matrix changes, and the surface re-recorded only when `r` changes.
   Items inside record with `Oversampling = r` (`docs/tracks/hidpi.md`, D45), so text and rounded edges are crisp. A transition should use the largest `s` it reaches.
3. **Update.** Content change: re-record inside the surface and render it for two frames (`UPDATE_ALWAYS`, then `UPDATE_DISABLED`; not a lone `UPDATE_ONCE`, section 5). Transform change (animation, hover transition): **only** the three uniforms and the
   polygon, no re-recording, no re-render. That is the measured static case: 0.04 ms of engine CPU and 1.5 ms of GPU for 50 surfaces.
4. **Ink bounds.** The surface covers the union of the element's border box and its descendants' painted overflow (shadows, children outside the box, filter margins), as the filter group's `bounds` item does, with an upper limit.
5. **`preserve-3d`.** `stacking.rs` finds a context (a root with `transform-style: preserve-3d` and the 3D-transformed descendants through a chain of such parents; it is flat if the root has `opacity < 1`, a filter, `overflow` other than visible, a mask or a
   clip-path). The context's faces are painted at the root's position in its paint parent in BSP order (new `native/bsp.rs`), each piece a polygon item with its face's material. Each face is a surface.
6. **Hit testing.** The paint-tree hit test (`stacking.rs`, `pointer.rs`) maps the point through the inverse homography on entering a surface (f64), skips a face with `backface-visibility: hidden` and a negative determinant, and in a context
   takes the nearest face along the ray. The flat descendants then hit-test as today.
7. **Controls and limits as code**: `W` clipped at 1e-5, raster cap, texture budget, the first-frames rule, and no `backdrop-filter` on a surface.

**New modules:** `native/surface.rs` (homography, polygon, raster-scale rule, shader source and material pool), `native/bsp.rs`, `native/hit3d.rs`. **Touched:** `native/render_tree.rs` (`RenderNode::surface`, re-parenting of the element's items, ink bounds,
`Oversampling` hand-off), `native/mount.rs`, `native/stacking.rs` (contexts, face lists), `native/props.rs` and `computed_style.rs` (`perspective`, `perspective-origin`, `transform-style`, `backface-visibility`, the 3D functions; owned by the `transforms` track),
`native/motion.rs` (per-frame matrices into surface uniforms), `native/pointer*.rs` (the hit test).

### What the `transforms` track's matrix path needs to expose

Per element, in the parent's border-box frame (transform-origin and the parent's `perspective` and `perspective-origin` already applied): the **full 4 x 4 in f64** (row-major, acting on column vectors, as `geometry.mjs`), a **classification** `Identity | Translate | Affine2D | Projective`
(so only `Projective` and `preserve-3d` members need a surface), `homography()` (the 3 x 3 of the z = 0 plane), `max_magnification(size)`, the **determinant sign** (for `backface-visibility` and mirrored text), the `preserve-3d` flags (the element is a context root; it is a member),
and `interpolate(from, to, t)` for 3D lists (per function when the lists match, CSS matrix decomposition otherwise). The 2D path should handle the affine cases and `backface-visibility: hidden` for them.

## Honest size estimate

The prototype is about 2,200 lines of GDScript (the compositor 350, BSP 280, the rest nesting, hit testing, cost and the alternatives) and 470 of JS, and it renders the cases above. The product is its Rust port plus the integration. My estimate, for one engineer who knows
this renderer:

| Piece | Rust lines | Weeks |
| --- | --- | --- |
| `surface.rs`: homography, inverse, polygon with near and screen clips, raster rule, shader, material pool; unit tests | 600 | 0.5 |
| Lifecycle in `render_tree.rs` and `mount.rs`: surface create and destroy, re-parenting, ink bounds, `Oversampling` hand-off, invalidation and the first-frames rule, parent viewports, opacity, filter inside | 900 | 1.5 |
| Hit testing, `backface-visibility`, tests | 400 | 0.5 |
| `preserve-3d`: contexts in `stacking.rs`, flattening rules, BSP port, draw list | 800 | 1.5 |
| Transitions: 3D interpolation and decomposition (if the `transforms` track has not) | 350 | 0.5 |
| Verifier sections and labs: Chrome references, per-DPR and per-renderer numbers, negative controls | 1,000 (TS, Rust, mjs) | 1 |
| Web verification and fixes (WebGL2) | n/a | 1 |

About **4,000 lines and 6 weeks**; three of them for the single-surface path (surfaces, nesting, hit testing, controls), which is also the part that is demonstrably within the measured numbers. The risks, in order: the Web (untested), the memory budget with many
large surfaces, the unexplained blank `UPDATE_ONCE` surface, and the number of `Oversampling`-dependent caches in `render_tree.rs` that must see `r` rather than the window's scale.

## Limits that would remain

* **Memory**: 0.25 to 4 MB per card, doubled on Compatibility; 50 cards at DPR 2 about 51 MB raw. Large or many 3D elements need a budget and a lower-scale fallback (blurrier text).
* **Dynamic content**: a re-rendered surface is a render pass: 50 per frame is 6.1 ms of GPU (Mobile, Forward+) or 7.7 ms of engine CPU (Compatibility). Animating the *content* of many 3D elements is expensive; animating their *transforms* is almost free.
* **Raster scale steps**: text re-rasterises when `round(DPR x s)` changes, as in Chrome; a transition should fix the scale at its maximum.
* **No mips**: planes seen steeply than about 8x minified shimmer, as Chrome's do; the supersampled option differs from Chrome by mean 3.3.
* **Compatibility, opaque target, filters outside a surface**: two-bit alpha (existing limit); a surface inside a filter group is hit by it (mean 12.5, max 35).
* **`backdrop-filter`** on or under a surface: unsupported.
* **Hit testing** for a plane crossing the eye follows the painting, not Chrome's hit region (which disagrees with Chrome's own painting).
* **Pixel snapping**: Chrome snaps some axis-aligned layers; the 2D path owns that.
* **Seams**: BSP pieces are not antialiased along their cuts (no visible difference from Chrome in the cards scene, but a thin line is possible with a very acute intersection).
* **The first-frames rule** is a workaround for a failure I could not explain.

## Not verified, and what I could not make work

* **The Web** (WebGL2): not run. Shader portability is a claim to check.
* **The real-3D-quad alternative on Mobile and Forward+**: the geometry is right, the colours are wrong (the linear/sRGB handling of the 3D pipeline); not corrected, because the coordinator stopped all Godot launches while I was writing this up. Compatibility is measured.
* **The blank `UPDATE_ONCE` surface** (once, Forward+, section 5): cause not found.
* **The exact raster scale for `translateZ(500px)`** (2.67x): Chrome's flat PNG at that scale is not an integer size, so the comparison is not clean; the fit for the other cases is.
* **Chrome's raster-scale rule** is a fit to error minima over the scales I generated, not Chrome's source; it matched all six rotated or projective cases at DPR 2 (p35, x25, po, steep, tz, combo) and the DPR 1 ones I checked (p35 at 1, tz at 2), and the axis-aligned case differs (above).
* **Transitions between mismatched function lists** (CSS matrix decomposition): not built.
* **`pnpm test` (467 passed) and `pnpm test:types` (exit 0) were run**; they do not touch this experiment. `cargo test`, `clippy` and `fmt` were not run: nothing in `native/` changed and the brief forbids cargo builds.
* Headless Chrome used its default compositing; I did not compare `--disable-gpu`.

## How to reproduce

```sh
node experiments/transform3d/chrome-reference.mjs                      # Chrome: artifacts/transform3d-spike/chrome/
experiments/transform3d/run-accuracy.sh                                # both engines x three renderers
experiments/transform3d/run-scenario.sh p3d_scene                      # also: nest_order, nest_clip, nest_both, nest_filter_in_layer, nest_layer_in_filter,
                                                                       # nest_under_clip, cost_layers, hit_roundtrip, hit_facing, alt_group, alt_vertex, alt_cull,
                                                                       # alt_clip, alt_mesh, alt2_truth_parts, alt2_node3d, alt2_node3d_cost, alt2_shared, raster, layer_memory
node experiments/transform3d/compare.mjs --tags=breaka-compat --modes=src,own --sides=p35,steep
node experiments/transform3d/compare.mjs --scenes=cube,cards --variants=bsp,centroid,unsorted
node experiments/transform3d/compare.mjs --alt=p35,steep,x25,combo,tz --tags=breaka-compat,breaka-mobile
node experiments/transform3d/hit-test.mjs
```

Godot is run as `/Applications/Godot48.app/Contents/MacOS/Godot --path experiments/transform3d --audio-driver Dummy --rendering-method <gl_compatibility|mobile|forward_plus> --resolution 320x200 --script res://spike.gd -- scenario=<name> tag=<tag> out=<dir> chrome=<dir>`
(the stock engine is `/Users/ben/Development/godot-stock/bin/godot-stock`). A scenario script that fails to parse hangs the run until the shell's `timeout`; `spike.gd` quits with status 1 if a scenario file cannot be instantiated.

## README text

> **3D transforms.** `docs/tracks/transforms-3d-feasibility.md` records an experiment, not a feature: a transformed element with perspective can be matched to Chrome by rendering its subtree
> into its own render target and drawing that mid-tree as one canvas item whose shader applies the inverse homography (analytic edge coverage, premultiplied alpha, one bilinear tap). Against
> headless Chrome on both engines and all three renderers the interior differs by 0.01 to 0.13 levels of 255 on average (max 2), `preserve-3d` cubes and intersecting planes (BSP-sorted) by 0.9 to 1.6, nested
> surfaces by 1.1 to 1.3. A spinning transform re-renders nothing (50 surfaces: 0.04 ms of engine CPU, 1.5 ms of GPU on Mobile). Not built: the Rust implementation (about 4,000 lines, 6 weeks), and the Web is untested.
