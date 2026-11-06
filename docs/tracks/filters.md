# Track: Filters and frosted glass (Phase V1, D40)

Branch `filters`, based on main `d417bb5` and rebased once onto `710adc3` (Phase I6) at the coordinator's request. Notes and
report for the coordinator; `docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md` are not edited here.

> **Corrected by `docs/tracks/filter-fixes.md`** (an independent review of this work): the single Compatibility primer is now a probe per
> group, an element can have both properties (its backdrop hangs beside its group), Forward+ has its own measured chain, Mobile and Forward+
> place texels by the whole target, a changed viewport transform is read every frame while an effect exists, and a group's alpha on
> Compatibility is two bits. The sections below describe `abdc077`; where they differ, the fixes' notes win.

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
| `exp4` | A copy region whose origin or size is not a multiple of the level's texel size shifts that level by up to half a texel: 8 px blur at level 3 came out 3 px off (error 0.198, against 0.006 aligned). `gaussian_blur` halves the region with truncating shifts (`copy_effects.cpp:276-279`). | `blur::copy_region` aligns outwards to the level. After `chain_map` (next row) this is no longer what keeps the blur in place: see "Negative controls" (an unaligned region leaves at most 0.125 px and 2.5 % of width, aligned 0.8 %). |
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

## Negative controls

Every assertion that guards a fix has to fail when the fix is taken out. `native/filter_faults.rs` puts each fix back out, one
at a time, at the single site where it lives; the faults exist only in a library built with `pnpm build:native --faults` (cargo
feature `filter-faults`, its own `target/faults`), and `pnpm build:native` afterwards restores the default (a `strings` check of
the installed file tells which one is there). It is a feature set of its own to the freshness guard (`docs/tracks/freshness.md`): a
default run refuses it ("cargo features differ: built with [filter-faults], wanted []") and a faults run refuses a default build. A fault is switched by the environment variable `GODOT_REACT_FILTER_FAULT`, read at
the fault's site on every use, so the opt-in `filters-faults` section (`--only=filters-faults`, both viewports with
`pnpm verify --interaction --only=filters-faults --faults --no-retry`: a re-run would hide a control that did not hold) switches them with `OS.setEnvironment` in one process. For each
control it runs the guarding check with the fault off (it must pass) and on (it must fail, with the message of that check), clears
every effect between the two so items, materials and (for the one fault that changes a shader's source) shaders are made again,
and saves the broken picture as `filters-fault-<name>.png`.

| Fault | What is put back | Check that must fail | Failure measured (landscape 1120 x 800 unless noted) |
| --- | --- | --- | --- |
| `merged-copy` | the copy asked of the draw item, not a separate one before it (D40 b) | stacked panels: B over A blurs A's blur | 22.80 px wide where 29.0 is expected (the variances add) and a single blur is 20.50; portrait 22.40 |
| `no-primer` | no Compatibility primer | filter blur accuracy | `filter blur 2px`: 2.46 px wide for a 5.13 px Gaussian (a hard edge, level 0 read). Skipped on Mobile, which has no primer |
| `stale-rects` | a copy or group rectangle computed once, never followed | a panel in a scrolling list, a moving panel | "Scrolling by 37 moved the panel's copy rectangle" |
| `fit-empty-group` | the wrapper left to the engine to fit (no command of its own, `fit_empty`) | an ancestor's clip cuts the blur | beyond the clip edge the page reads 0.290 where 0.392 is expected (`filters-fault-fit-empty-group.png`) |
| `textbook-chain` | texels at `2^L (j + 0.5)` instead of the engine's halving | edge accuracy at every radius, on a target that is not a multiple of 16 | portrait only: `backdrop blur 16px`, departure from a Gaussian 0.1007 against 0.02 (`filters-fault-textbook-chain.png`); skipped on 1120 x 800, which halves exactly at every level it keeps |
| `no-nesting-check` | a filter in a filter is drawn, wrongly, and not reported | nested elements are reported and not drawn | "The inner filter inside it is not drawn" |
| `double-modulate` | the group composite multiplies the inherited opacity again | opacity applies once | 0.251 where 0.5 is expected (the stock composite's 0.25) |
| `shadow-box-only` | the composite covers only the box, not the shadow | a hard `drop-shadow(6px 6px)` is drawn | 0.392 (the page) where black 0 is expected, 3 px beyond the card |
| `single-border-draw` | a translucent border drawn in one `StyleBoxFlat` call (the glass showcase, below) | the border round a glass card's corner is unbroken | dimmest point 11.0 levels above the glass (11.3 portrait) against 26.3 or more fixed; limit 18 |

Results: both viewports pass with every applicable control holding (landscape eight, portrait all nine; each fault failed with its own
check's message, not another). Captures: `artifacts/filters-iter/faults-landscape/` and `artifacts/filters-iter/faults-portrait/`,
`filters-fault-<name>.png`; inspected: `merged-copy` (B's blur no wider than A's where they overlap, and stale vertical stripes below A),
`fit-empty-group` (the halo drawn at the clip's edge) and `textbook-chain` (a faceted edge across the panel).

The first run of the fault for the copy rectangle's alignment found that no check failed, and that is the result: since the shader
places texels with `chain_map` (from the region's own origin and size), alignment is no longer what keeps the blur in place. The
section measures that instead of asserting a failure: the moving panel at radii 16 and 24 over 41 positions every 3 px (every phase
of a 16 px texel), once aligned and once not: aligned, a worst edge shift of 0.000 px (0.125 px in portrait) and a worst width error
of 0.8 % (1.0 %); unaligned, 0.125 px and 2.5 % (1.9 %), inside the 0.8 px and 4 % limits of the other checks. The old claim in
`copy_region`'s comment (and the `exp4` row above) described the shader before `chain_map`; both now say so.

Two further assertions came out of building the controls: the accuracy check asserts the blurred edge's position (half crossing
within 0.8 px of the sharp edge; the value is printed only when it fails, and it passed at every radius, both targets, DPR 1 and 2), and the moving panel runs at a second radius (16) so a
level-4 texel grid meets the panel's edges at several phases.

## Glass showcase

Ben judges the look by eye, and the test patterns above are correct but are not a UI. The `glass` lab is frosted glass as a
product developer would write it, with the utilities as a browser developer writes them (`backdrop-blur-xl backdrop-saturate-150
bg-white/20 border border-white/30`), and the same page as plain HTML in headless Chrome to hold it against.

* **Files**: `demo/src/glass-lab.tsx` (the page), `demo/src/glass-data.ts` (colours, copy and the layout rules that need numbers,
  with no dependency on the library so the reference page uses the same), `demo/src/verify-glass.ts` and the `glass` section of the
  interaction verifier, `scripts/verify-glass-web.mjs` (the same reads on Web), `scripts/glass-reference.mjs`
  (`pnpm glass:reference`: the reference page; `--compare=<out.png> label=image ...` puts captures side by side). The lab is
  registered in `labs.tsx` with a name, an import and a case.
* **The page**: blurred colour (six circles with `blur-3xl` that bleed past the window) behind a glass bar fixed over a scrolling
  page; crisp tiles that scroll under the bar; three glass cards, each `draggable`, with a `hover:` button; two overlapping glass
  panels over crisp shapes; a card with a `TextInput`; a sheet over a `backdrop-blur-sm` scrim in a `Portal`.
* **The section** (about 17 to 19 s a window, at device pixel ratio 1 and then 2 through the window's content scale): text contrast
  on the glass (WCAG, 4.5 for body text and the placeholder, 3 for the brand, titles and the caret); the bar blurring a tile row
  under it (widest step across the bar 1 level, 160 or more just below it); corners clean (the page outside a rounded corner is
  the page's, the glass inside is tinted); the border an unbroken line; hover lightening the button; the scrim darkening the page to
  0.70 and softening a tile's edge from 41 levels to 3; Cancel closing the sheet; the glass stable while a tile edge is carried
  across the bar a pixel at a time (no step back, no step more than 2 levels off the trend); the text field's caret (contrast 7.7
  to 8.6), the text over its selection (6.3 to 6.7) and the selection told from the field (26 to 67 levels apart); and the drag
  ghost (below). Web has the same reads, without the stability run.
* **Captures** (read, not only asserted): native `artifacts/native-interaction/{landscape,portrait}/glass-*.png` and
  `glass-dpr2-*.png` (page, scrolled, hover, input, input-selected, drag, sheet); Web
  `artifacts/web-interaction-verification/{landscape,portrait,retina-landscape,retina-portrait}/glass-*.png`; Chrome
  `artifacts/glass-reference/chrome-<state>-<window>.png`; side by side `artifacts/glass-compare/*.png`.

### Against the same CSS in Chrome

The glass itself matches. Over the regions of the page that are glass (card interiors, the back panel, the page between) the mean
difference from Chrome's raster is 0.7 to 1.3 levels of 255 at device pixel ratio 1, with a 95th percentile of 2 to 4, and
the Web build (the library in Chrome's canvas) looks the same beside plain Chrome (compared by eye in `artifacts/glass-compare/web-*.png`, not measured). The differences are these, in the order they
matter:

| Difference | What it is | What was done |
| --- | --- | --- |
| A 1 px translucent border looked **dotted** at ratio 1 and **doubled** at ratio 2 | `StyleBoxFlat::draw` with a centre fades the ring's inner edge from the fill colour to the border colour (`style_box_flat.cpp:479` and the "ring inner border" gradient after it), which adds a translucent fill a second time along the ring | **Fixed** (`record_box`): the fill over the whole border box, then a ring with no centre over it, as CSS composites them. Control: `single-border-draw` |
| `bg-white/20`, `border-white/30`, `text-white/80` did not compile | opacity modifiers on colours were unsupported | **Fixed** (`src/styles.ts`, tests): `/NN`, `/[0.37]`, `/[37%]` on any named colour or 3 or 6 digit arbitrary value; `selection-`, `caret-` and `placeholder-` take it too |
| A glass element **inside** a backdrop-filtered ancestor (a sheet inside its scrim) is flat in Chrome and frosted here | Chrome makes each `backdrop-filter` element a *backdrop root*: a descendant sees only that element's content (the sheet's raster is 28 to 40 levels from ours, and dark and uniform). Canvas items have no such rule: a glass element sees everything drawn before it | Not a defect here. The reference page puts the sheet beside the scrim, as developers do for this reason, and `chrome-sheet-nested-*.png` keeps the nested form |
| Blur near the **render target's edge** | A filter group's buffer holds what is drawn inside the target, and the blur reads the edge texels again beyond it (clamped); Chrome blurs the whole element, including the part beyond the window. A background blob that bleeds past the window matches within a mean of 7 levels (worst 34) in the outermost 40 px; one that merely touches the edge comes out about twice as strong at it (`blur-3xl` circles clamped inside the window: 123 against 80 levels at the edge). A backdrop blur near the edge differs by up to 12 levels (not traced further) | Not fixed: the content beyond the target is not drawn. **Let a blurred background bleed past the window**; do not end it at the edge. The lab does |
| Text: the face and the line boxes | Godot's default face (Open Sans) against the browser's, and `text-*` here sets the size only, where Tailwind also sets the line height: a page is 5 px taller after its first block (the first tile at 173 against 168) | Recorded; not in scope. `leading-*` is unsupported |
| The overlay scrollbar's thumb | drawn on the right edge natively; the reference hides it | none |

### What a developer reaches for that is missing

Checked by compiling the class (`compileStyle`) before writing the page: unsupported, with what the page did instead.

| Utility | Instead |
| --- | --- |
| `shadow-*` (box shadow) | nothing: glass cards have no shadow. `drop-shadow-*` is a filter, and a filter group would hold the element's own backdrop (the nesting limit), so it is not a substitute |
| `font-medium`, `font-semibold`, `font-bold`, `leading-*`, `tracking-*`, `uppercase`, `truncate` | the default face and size only |
| `bg-gradient-*` | blurred circles for the colour behind the glass |
| `border-b`, `border-t`, `ring-*`, `ml-auto`, `sticky`, `scale-*`, `translate-*`, `transition-*`, `duration-*` | a full border; `justify-between`; `fixed`; `transition` as the inline style |

### Design findings

Not rendering faults, but what a designer would catch: white text on `bg-white/20` glass is below WCAG AA (3.6 to 4.2 for 14 px
text) over a bright backdrop (cyan `#22d3ee`, yellow, orange); the CSS is the same in a browser; the page's colours were deepened (the 700
and 800 shades) until every text on the glass measured 3 or more in every window, and the field on the glass takes `bg-black/20`
(its placeholder measured 3.7 on `bg-white/10`, 5.8 on `bg-black/20`). The default selection (`#3b82f6` at 35 %) is readable on the
glass; the section keeps it that way.

### Text input and drag ghost (I7 and I9 on glass)

* The field on its glass card keeps its caret (a 1 px line, contrast 7.7 to 8.6 against the glass) and its selection readable at
  both ratios, with I7's own typing, selecting and caret blink (the section reuses `typeText`, `pressAction` and `waitForCaretOn`).
* **A filtered source's drag ghost is unfiltered.** `DragGhost::capture` copies the box and content commands an element recorded;
  the effect items (the group, the copy and backdrop items) live in `RenderNode.group` and `.backdrop` and are not recorded, so the
  ghost of a glass card is its translucent box and its text at 60 %, with no blur: the tile row's edges stay crisp through it
  (widest step 36 levels). The section checks that the ghost is drawn, is the card's size,
  stays unblurred and goes when the drag ends. Giving the ghost its own group or backdrop from the source's `FilterEffect` is the
  way to a glass ghost, and is not done.

## Limits found

See the README ("Filters and frosted glass") for the user-facing list. Beyond it:

* **Clip edge**: a filtered element's descendants are drawn into the group's buffer clipped by their ancestors' scissor, so
  content beyond an ancestor's clip is absent from the blurred picture and the blur fades at the clip edge (CSS blurs the whole
  element, then clips).
* **Transparent render targets**: not exercised, so not claimed. Whether the back buffer of a transparent target holds
  premultiplied or straight colour, and what the backdrop shader then reads, was not measured; a `SubViewport` with
  `transparent_bg` (world-space UI, I11) is the case to measure before relying on a frosted panel there.
* **Colour clamping**: lists compose into one matrix; there is no clamp between functions (`brightness(2) contrast(0.5)` differs
  from a browser where an intermediate value leaves 0 to 1).
* **`backdrop-filter: opacity()`** blends the filtered backdrop with the unfiltered one (the engine's alpha blend), not with the page.
* **Fixed descendants**: `position: fixed` descendants of a filtered element paint in the layer root (D23), outside the group.
* **Drag ghost (I9)**: see the merge notes.
* **Mean scale**: radii use `sqrt(|det|)` of the root-to-target transform; a rotated root keeps the copy rectangle as the bounding
  box and blurs isotropically.
* **Render-target edge**: a filter's blur near the edge of the render target reads the edge's texels again, not the part of the
  element beyond it (see "Glass showcase"); let backgrounds bleed past the window.
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
* **Faults are a build feature, not a product hook**: `filter-faults` is a cargo feature built into its own target directory; in a
  default build `faults::active` is a constant `false` and the library contains no trace of the variable name (`strings` finds it
  once in the faults library and not in the default one).
* **Alignment kept**, though `chain_map` made it unnecessary for correctness: it tightens an unaligned region's 2.5 % width error
  to 0.8 % for under a texel of region, and its unit tests stay. It is not claimed as a guard.

## Gates

Run from the worktree (`artifacts/logs/` holds each step's log), each once, on the final tree after the last rebase onto `main`
(`67aeea9`: Phase I7, Phase I9, the stock profile, the freshness guard, HiDPI, verifier integrity D46, the full palette):

| Gate | Result |
| --- | --- |
| `cargo test --locked` | 569 passed, also with `--features filter-faults` |
| `cargo clippy --locked --all-targets` | 0 warnings, also with `--features filter-faults` |
| `rustup run stable cargo fmt --check` | clean |
| `pnpm test:types`, default profile and `--engine=stock` | clean (the stock one needs `pnpm build:native --engine=stock` first, as the freshness guard says) |
| `pnpm test` | 413 pass (the opacity modifier on all 22 colours, the freshness of a faults build, the expected-error marker) |
| `pnpm verify:interaction --only=filters,glass` | landscape and portrait passed: `filters` 26,441 assertions (14.3 s), `glass` 1,835 (17.4 s) a window |
| stock `pnpm verify:interaction --only=filters --engine=stock` | landscape and portrait passed (10,130 assertions a window) |
| `pnpm verify --interaction --only=filters-faults --faults --no-retry` | landscape 8 controls held (`textbook-chain` skipped on 1120 x 800), portrait all 9, each with its own check's message; a default run refuses the faults library ("cargo features differ: built with [filter-faults], wanted []"), and the default library was restored (`strings` finds no fault name in it) |
| `pnpm build:web`, then `pnpm verify:interaction:web --only=filters,glass` (the verifier serves the export itself) | passed: `filters` 592 assertions, `glass` 72, 676 in all, 56 captures, at device scale 1 and 2, landscape and portrait |

The full suites (`verify:interaction` with every section, `verify`, `verify:motion`, `verify:world`) were run once on the tree
before the last two rebases and passed (the first full interaction run failed in portrait on a precondition of mine, below); they
wait for the batch regression, as asked. One finding of the full runs is kept: after the `drag` and `forms` sections the portrait
window left the pointer over the native-state card of the `filters` section, which then read as hovered at rest (green 0.561, which
is 0.51 times the hover's 1.1). The failure was the same in every attempt, so it was a real one, not the focus loss in its log; the
section now moves the pointer off its fixtures first.

The Mobile (RenderingDevice, Metal) run of the `filters` section passed once before the rebases and was not run again. The `no-primer`
control is Compatibility-only, and the faults section was not run on Mobile.

Inspected captures (read, not only asserted): native `artifacts/native-interaction/<viewport>/` (the `filters-*` set and the `glass-*`
set, at both pixel ratios), Web `artifacts/web-interaction-verification/{landscape,portrait,retina-landscape,retina-portrait}/`,
Chrome `artifacts/glass-reference/`, side by side `artifacts/glass-compare/`, negative controls
`artifacts/native-interaction/<viewport>/filters-fault-*.png`. `artifacts/` is ignored by git.

## Merge notes

`filters` is rebased onto `main` `67aeea9` (twice: after I7, and after the HiDPI hardening and the verifier integrity work); a merge
should have nothing left to resolve. What the rebases settled, in case a later one meets the same places:

* **I7 (`TextInput`)**: `native/snapshot.rs` and `src/native.ts` carry `textInput` and `effects` side by side; the glass lab has a
  `TextInput` on a glass card and the section reads its caret and selection. `demo/src/verify-text-input.ts` already exported
  `typeText`, `pressAction` and `waitForCaretOn`; the only change is `waitForCaretOn` taking `Pick<InteractionInspection, 'find'>`.
* **I9 (drag and drop)**: `scroll_input.rs` marks the effects stale and refreshes their rectangles, then looks under the pointer unless
  a drag is in progress. A filtered source's **drag ghost is unfiltered**: `DragGhost::capture` replays the box and content commands a
  `RenderNode` recorded, and the group, copy and backdrop items are not among them, so the ghost of a glass card is its translucent box
  and text at 60 % with no blur (the tile row's edges stay crisp through it, widest step 36 levels). The glass section checks that it is
  drawn, is the card's size, is unblurred and goes when the drag ends. A glass ghost would give the ghost's items their own group or
  backdrop from the source's `FilterEffect`; not done.
* **Stock profile and freshness**: `--faults` is a feature set of its own in `scripts/engine.mjs` (`faults` next to `probe`,
  `targets.nativeFaults`, the rebuild command, `engine.d.mts`), so a default run refuses a faults library ("cargo features differ") and
  `verify.mjs --faults` is accepted only with `--only=filters-faults` and refuses a default build. No new script calls `selectEngine(`, so
  `tests/freshness.test.ts` `GUARDS` is unchanged.
* **HiDPI (D45)**: a rounded backdrop shape is a `StyleBoxFlat` drawn outside `NOTIFICATION_DRAW`: its key now carries the
  `Oversampling` (only when rounded) and `set_aa_size(feather())` precedes the draw; the level is read once from the root's cached
  value. The translucent-border draw in `record_box` keeps the feather for both of its calls. Nothing the filters paint is text, so
  nothing joins `paints_at_oversampling` (a rounded view already does, and a repaint of it runs the effect's sync).
* **Verifier integrity (D46)**: `verify-filters.ts` and `verify-glass.ts` count their assertions in `assertionTally`; the Web scenarios
  run through `section(...)`; the expected-error marker (`GODOT_REACT_EXPECT_ERROR`) was re-applied on main's rewritten
  `scripts/native-run.mjs`, with its test; the faults section runs with `--no-retry`. The new sections are in `SECTIONS`, and
  `filters-cost` and `filters-faults` are opt-in.
* **Palette**: the opacity modifier works on all 22 colours (`parseColor` takes `name/NN` on any named colour); the README and the
  missing-utilities table follow.
* **Other files a merge touches** (unchanged by the rebases): `src/styles.ts`, `src/types.ts`, `native/props.rs`, `native/render_tree.rs`
  (`RenderNode` gains `parent`, `draw_index`, `backdrop`, `group`; the box item's `record_box` draws a translucent border as a fill and a
  ring), `native/lib.rs`, `Cargo.toml` and `Cargo.lock` (`stylo_static_prefs`, the `filter-faults` feature), `scripts/build.mjs` (three
  entry points), `scripts/build-native.mjs`, `scripts/verify.mjs`, `package.json` (`glass:reference`). No `#[func]` was added, so no
  typings or `demo/gen` changed.
