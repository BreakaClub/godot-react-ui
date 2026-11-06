# Track: Filters and frosted glass (Phase V1, D40)

Branch `filters`, based on main `d417bb5` and rebased once onto `710adc3` (Phase I6) at the coordinator's request. Notes and
report for the coordinator; `docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md` are not edited here.

`filter` and `backdrop-filter` (blur, brightness, contrast, grayscale, hue-rotate, invert, opacity, saturate, sepia, one
drop-shadow) with Tailwind utilities, native hover and breakpoint state, transitions, and the cost and limits recorded below.
Nothing in the engine changed: everything is `RenderingServer` calls from the GDExtension and one shader per kind.

## Evidence first: what the engine does

`experiments/filters-engine/` holds five GDScript probes, run on this Mac (Godot 4.8 beta custom build 1225394ce, Apple M1 Max,
Compatibility = OpenGL 4.1 over Metal, Mobile = Metal 4.0 Forward Mobile). D40 (a) to (f) held; the probes found more.

| Probe | Finding | Consequence |
| --- | --- | --- |
| `exp1` | The back buffer's mip chain is the same on Compatibility and Mobile (one 8-bit step apart, levels 1 to 4; Mobile to level 7). Each downsample is `[1 3 4 4 3 1] / 16`, not the 13-tap filter's naive marginal: `gaussian_blur` sets `PIXEL_SIZE` from the destination level (`copy_effects.cpp:300-306`), so the taps are two source texels apart. One step has variance 1.75 source texels squared; level L has `1.75 (4^L - 1) / 3` base pixels squared (sigma 1.32, 2.96, 6.06, 12.2, 24.4 for L = 1 to 5). A CPU model of it reproduces the GPU's profile to 0.003. | `native/blur.rs` is a model of the chain; its unit tests and the verifier both check against it. |
| `exp1` | Compatibility allocates only levels down to about 32 px: `max(1, floor(log2(max(w, h))) - 4)` levels (`texture_storage.cpp:2773`); the RenderingDevice back buffer keeps all but the 1 x 1 level. A 640 x 360 target has levels 0 to 4; 1120 x 800, 0 to 5; 600 x 900, 0 to 4. | A blur is capped by what the target can reach. The plan reports `clamped` and `achievedPx`; 600 x 900 reaches 49.5 px of a 64 px request. |
| `exp1` | Sampling one level directly shows its texels: a hard edge is a 4.4 / 9.3 / 18.9 / 37.7 px ramp of straight facets at levels 1 to 4, whatever radius is wanted. | The shader reads the largest level whose own blur still fits, then a Gaussian-weighted reconstruction of it (see "The kernel"). |
| `exp2` | The copy rectangle is in render-target pixels at content scale 1 and 2 (24,072 of 24,072 sampled pixels match). | Rectangles are computed through `viewport.get_final_transform() * root.get_global_transform_with_canvas()`. |
| `exp2` | A copy merged into the mip-reading item leaves the second of two stacked panels with the first's unblurred levels: 18.9 px (one blur) where separate items give 23.2 px (a blur of a blur). | D40 (b) confirmed; the regression. |
| `exp2`, `exp3` | A canvas group's mipmaps are readable only if the "mipmaps cached" flag happens to be true for the frame (`rasterizer_canvas_gles3.cpp:403-541`); a group alone gets level 0 (0.8 px edge), the same group after a frosted panel gets the blur. One pixel copied and one pixel drawn with a mip-reading material before everything else set it for the whole frame. | A Compatibility-only "primer" under the first layer, made with the first filter group. |
| `exp2` | A stock canvas group applies inherited modulate twice (0.25 under a 0.5 ancestor). | The group's shader composites the buffer's alpha and ignores `COLOR`. |
| `exp2` | A backdrop inside a group, or a group inside a group, draws wrong colours (the back buffer slot is the white default), not nothing. | One `ERROR` per element, and the inner effect is not drawn. |
| `exp3` | Stale mip data in a copy region's border: a bilinear read is clean only when the region is grown by about 4 texels (16 px at level 2, 24 at 3, 48 at 4). | `CONTAMINATION_TEXELS = 3.5`, plus the kernel's own reach, rounded up. |
| `exp4` | A copy region whose origin or size is not a multiple of the level's texel size shifts that level by up to half a texel: 8 px blur at level 3 came out 3 px off (error 0.198, against 0.006 aligned). `gaussian_blur` halves the region with truncating shifts (`copy_effects.cpp:276-279`). | `blur::copy_region` aligns outwards to the level. |
| portrait run | For a target or region that is not a multiple of 2^L the engine's level texels are not at `2^L (j + 0.5)` (a 900 px target's level 3 has 112 rows over 900 px; an edge 200 px down was 0.87 px off, and `uv * size` is wrong the same way). | `blur::chain_map` replays the integer halving per axis and the shader finds texels through it. |
| `exp5` | A canvas group with `fit_empty` is `clear()`ed by the culler every frame (`renderer_canvas_cull.cpp:233`), and `Item::clear()` drops its clip owner (`renderer_canvas_render.h:459`): its composite ignores an ancestor's clip (black at x=250 beyond a clip at 200). A group with its own command is not cleared and is clipped. | The wrapper draws its own rectangle; a hidden child carries the larger mipmap region. |
| `ViewportTexture` | `get_size()` of a Window multiplies the physical size by the stretch scale again (2240 x 1600 for a 1120 x 800 target at content scale 2). | The target size is the visible rectangle times the stretch scale. |

## The kernel

`blur::plan(sigma_px, max_level)`: level L is the largest whose chain variance plus the minimum reconstruction fits,
`1.75 (4^L - 1) / 3 + (0.6 * 2^L)^2 <= sigma^2`; the rest of the variance is a Gaussian of `kernel_texels` (0.6 to 3) texels
over that level, evaluated per fragment as Gaussian weights over the texels around it, fetched in bilinear pairs
(`pairs = ceil(3 * kernel) + 1` per axis, at most 10) and renormalised. Weights follow the fractional position, so the
output is as smooth as the Gaussian and there is no pop where the level changes (the variance is continuous across it).
`KERNEL_MIN_TEXELS = 0.6` keeps the partition-of-unity ripple (`2 exp(-2 pi^2 k^2)`) under 0.1 %.

Accuracy against a true Gaussian edge (model in `blur.rs` tests, GPU in the verifier, both within the same bounds):

| radius (css px) | 2 | 4 | 8 | 12 | 16 | 24 | 40 | 64 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| plan at DPR 1 (level, kernel texels) | 1, 0.75 | 2, 0.67 | 3, 0.65 | 3, 1.29 | 4, 0.65 | 4, 1.29 | 5, 0.99 | 5, 1.85 |

* Model: worst profile error under 0.0082 and 10-90 width within 2 % at all eight radii at DPR 1 and 2.
* GPU (`filters-edge-*`): every radius passes the verifier's bounds: width within `max(4 %, 0.6 px)` of `2.5631 * sigma`, profile
  within 0.02 of the cumulative Gaussian (the model predicts 0.006, two 8-bit steps; a faceted blur is 0.05 to 0.2).
* Smoothness: 160 radii from 3 to 70 px at +2 % steps, a probe 12 px from the edge, worst deviation of a step from the ideal step
  0.0089 (limit 0.012, 3 steps of 8 bits).
* DPR 2 (see below): the same radii at twice the pixels, plan level up by one.

## Rendering design (as built)

* **Backdrop**: `RenderNode.backdrop` = `{copy, draw}`, both `behind` children of the box item (indices 0, 1). `copy` has no
  commands; `canvas_item_set_copy_to_backbuffer(copy, true, region)`. `draw` draws a white `StyleBoxFlat` of the border box and
  corner radius with the material, so `COLOR.a` carries coverage and the inherited opacity. Kinds: `BackdropBlur` (mip hint) and
  `BackdropPlain` (colour only, no mipmaps, level 0 read).
* **Filter**: a canvas group (`TRANSPARENT`, `blur_mipmaps` for the blur kind) between the paint parent and the box item. The wrapper
  draws its own rectangle (so it is not `clear()`ed and keeps its ancestor's clip) = the content's area and its shadow's, grown by
  `(pairs + 1)` texels; a hidden `bounds` child carries the aligned region the mipmaps are made for (grown by 3.5 more texels, the
  stale band). The subtree's rectangle is the union of its descendants' boxes and paragraphs, a superset of what the engine
  accumulates. Opacity stays on the box item (inside the group), so filter-then-opacity equals opacity-then-filter.
* **Shaders**: four, created on first use (`BackdropPlain`, `BackdropBlur`, `GroupPlain`, `GroupBlur`); one material per effect
  (`MaterialSlot`), parameters written only when they change. A value change is `material_set_param` calls.
* **Rectangles** (`refresh_effect_rects`): recomputed after anything that can move an element on the target: a geometry change, a
  scroll (`scrolled`), a motion sample (they reach geometry), the root's own transform (`NOTIFICATION_TRANSFORM_CHANGED`),
  a changed target size. A changed root-to-target transform or target size also re-plans every effect (a radius is in css px and
  drawn in target px). A backdrop whose visible part (its box clipped by its ancestors and the target) is empty has its copy
  disabled and its draw item hidden, so a scrolled-away panel does no copy. A radius below 0.25 px, `none`, or an identity
  list creates nothing.
* **Nesting**: `group_ancestor` walks the paint parents; a backdrop or filter below a live group is reported once per
  (element, ancestor) with an `ERROR` naming both, and not drawn. When a group appears or goes, every other effect re-checks.
* **Colour functions**: one 4 x 5 matrix composed natively after the blur (`filter::ColorMatrix`, tested against the specification's
  matrices); Gaussian blurs add in variance; one `drop-shadow` (blur before it widens it, no blur after it).

## Style merging (`computed_style` / `props`)

`StyleSpec` has `filter`, `backdrop_filter` (parsed `FilterList`, CSS text on the wire, validated at commit) and
`filter_parts`, `backdrop_filter_parts` (the functions Tailwind's utilities set, one field each). Merging layer B over A: an
explicit list replaces the list and forgets the parts; parts set after it take the property back to the composed list in
Tailwind's fixed order (blur, brightness, contrast, grayscale, hue-rotate, invert, [opacity for backdrop], saturate, sepia,
[drop-shadow for filter]), merged per function. This is what Tailwind's CSS does (each utility sets its variable and `filter`),
so `blur-sm hover:brightness-110` keeps the blur on hover with no React work, and `style={{filter}}` replaces both (inline
layers come after every class). `merge_filter` and the JS `mergeLonghands` implement it; the unit tests cover both.

## Transitions

`TransitionProperty::{Filter, BackdropFilter}`. Stylo has both properties (per-function interpolation with identity padding,
`animation_type = "with_zero"`); `backdrop-filter` is behind `layout.css.backdrop-filter.enabled`, which defaults to false in
`stylo_static_prefs` and is set at runtime (`stylo_static_prefs` is now a direct dependency, the same revision). So nothing is
interpolated natively: the mirrored lists go to Stylo as CSS text and the sampled lists come back
(`style_engine::sampled_filters`). `style_engine::tests::filter_lists_transition_per_function_and_end_exactly` checks the sampled
lists against `FilterList::interpolate` (a test-only reference) at 0, 0.25, 0.5, 0.75 and the exact end.

## Cost

Method: `--only=filters-cost` (opt-in). Per cell: wall time per frame, median of five runs of 20 forced draws that end in a
read-back (which waits for the GPU), vsync off (with vsync a frame takes a display refresh whatever it costs, 8.3 ms at 120 Hz),
minus the same scene without the effect; where the renderer reports it, the viewport's own GPU time
(`viewport_get_measured_render_time_gpu`, median of ten, minus its baseline). Compatibility reports no GPU time. This Mac's GPU is
much faster than a low-end device's, and cells are noisy at about a millisecond, so read the table for shape, not decimals.

*Apple M1 Max, 1120 x 800 at DPR 1, one panel, extra milliseconds per frame (median of 5):*

| | Compatibility, backdrop | Compatibility, filter | Mobile, backdrop (GPU) | Mobile, filter (GPU) |
| --- | --- | --- | --- | --- |
| 200 x 150, 4 / 16 / 64 px | 0.7 / 0.2 / 0.2 | 0.9 / 1.3 / 1.1 | 1.7 / 1.6 / -0.1 | 0.1 / 1.7 / 1.4 |
| 400 x 300, 4 / 16 / 64 px | -0.2 / -0.5 / 0.9 | 0.7 / 1.1 / 1.1 | 1.8 / 2.2 / 0.8 | 0.7 / 1.6 / 0.3 |
| 800 x 600, 4 / 16 / 64 px | 0.4 / 1.1 / 1.5 | 1.2 / 1.4 / 0.9 | 1.4 / 1.4 / 0.5 | 1.4 / 1.4 / 1.4 |
| 1100 x 780, 4 / 16 / 64 px | -0.8 / 0.6 / 1.6 | 1.6 / 1.5 / 1.4 | 1.9 / 1.2 / 1.2 | 1.6 / 1.9 / 1.7 |
| four 400 x 300 panels at 16 px | 1.7 | 2.5 | | |

* Per panel the cost is about 0.5 to 2 ms and nearly flat in size and radius on this GPU: it is dominated by the fixed work of
  the passes (the copy, the mip chain for the region, a batch break either side), not by the pixels. The final pass is
  `pairs^2` fetches per fragment (9 at 16 px, up to 100 at the widest kernel) from a small level.
* **First use** (the hitch a player sees when the first frosted panel opens): Compatibility 43 to 52 ms (React commit, sync,
  shader compile, first draw); Mobile 0.8 to 1.0 s on a cold shader cache (pipeline compilation), 17 to 36 ms once the engine's
  disk shader cache has it. Decision: shaders compile on first use, not at startup, because a tree without a filter must pay
  nothing (D40, plan 3.2.6). An app that cares renders a 1 x 1 `backdrop-blur-sm` element (and, for `filter`, a 1 x 1 `blur-sm`
  one) while it loads. The section's warm-up element shows the first real panel afterwards costing 22 to 31 ms on Mobile and
  within the noise on Compatibility.
* **Recommendation**: on a desktop or modern phone, ten or so frosted panels at DPR 1 are inside a 60 fps budget on cost alone.
  On a low-end mobile GPU (an order of magnitude slower in fill and bandwidth) treat each large panel as a few milliseconds:
  one or two full-width panels, small radii (a level that needs 3 pairs rather than 9 is much cheaper), and no animated radius
  on large panels. DPR 2 quadruples the pixels the mip chain and the final pass touch, and doubles the radius in target
  pixels (one level up, wider kernel): budget one panel at DPR 2 where you would budget two at DPR 1.

## DPR 2, and how it was reached

Natively: `Window.contentScaleFactor = 2` (content scale mode disabled), which makes the logical window 560 x 400 and keeps the
1120 x 800 render target; every length is then scaled by 2 into target pixels, the stretch transform is `scale 2`, and the
`ViewportTexture` size trap above appears. Web: the verifier's retina viewports use Chrome's `deviceScaleFactor: 2` and the demo
sets `contentScaleFactor` from `DisplayServer.screenGetScale()` (docs/WEB.md). The native `filters` section reruns blur accuracy
at 2, 4, 8, 12, 16, 24 and 40 px for both targets at DPR 2 (`verifyRootTransforms`), the shape check at DPR 2, and writes
`filters-dpr2-edge-backdrop.png`, `filters-dpr2-edge-filter.png`, `filters-dpr2-shape.png`; the Web section runs every check at
both ratios and both orientations.

## Limits found

See the README ("Filters and frosted glass") for the user-facing list. Beyond it:

* **Clip edge**: a filtered element's descendants are drawn into the group's buffer clipped by their ancestors' scissor, so
  content beyond an ancestor's clip is absent from the blurred picture and the blur fades at the clip edge (CSS blurs the whole
  element, then clips).
* **Transparent render targets**: not exercised. The back buffer of a transparent target holds premultiplied colour; the backdrop
  reads it as straight alpha, so a frosted panel over a transparent target is expected to be wrong. A `SubViewport` with
  `transparent_bg` is the case to check (world-space UI, I11) before relying on it.
* **Colour clamping**: lists compose into one matrix; there is no clamp between functions (`brightness(2) contrast(0.5)` differs
  from a browser where an intermediate value leaves 0 to 1).
* **`backdrop-filter: opacity()`** blends the filtered backdrop with the unfiltered one (the engine's alpha blend), not with the page.
* **Fixed descendants**: `position: fixed` descendants of a filtered element paint in the layer root (D23), outside the group.
* **Drag ghost (I9)**: see the merge notes.
* **Mean scale**: radii use `sqrt(|det|)` of the root-to-target transform; a rotated root keeps the copy rectangle as the bounding
  box and blurs isotropically.
* **Stale viewport transforms**: a change of the viewport's canvas transform or stretch with no root notification is picked up on
  the next paint pass, not the same frame.

## Decisions

* **Stylo for transitions, not native interpolation** (it has the properties; one pref turns the second on).
* **Per-function style representation** (`filter` text plus `filterParts`), validated at commit, with a native merge.
* **Gaussian-weights-over-a-level kernel** over trilinear lod blending or B-spline reconstruction: continuous variance, exact
  shape, cheaper at small radii; costs a loop of `pairs^2` fetches.
* **Group = wrapper with its own rectangle** (not `fit_empty`) after `exp5`; the group's region is a separate hidden child.
* **Texels through `chain_map`** instead of avoiding unaligned regions: cutting a region inward at the target's far edge would
  leave unblurred strips exactly where a "blur the whole page" element sits.
* **Faults are not product hooks**: see "Negative controls".
