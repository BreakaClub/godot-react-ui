# Track: Fixes from the independent review of filters and frosted glass (Phase V1)

Branch `filter-fixes`, based on main `4ea0bd8` (V1 and every other track). From an independent read of `abdc077` against the engine
source; each finding was traced before it was fixed, and each fix has a regression test that fails without it. Notes for the
coordinator; `docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md` are not edited here.

## What changed, per finding

| # | Finding | Fix | Test that fails without it |
| --- | --- | --- | --- |
| 1 | Forward+'s back-buffer chain is not the dual filter the model assumed: blurs came out 1.3 to 2.0 times too wide | `RendererKind` is `Compatibility`, `Mobile`, `ForwardPlus`; Forward+ has its own variance step, kernel range, stale band and tap budget (calibration below). An unmeasured rendering method draws nothing and logs one error | `blur.rs` unit tests (the model against the measured variances; no radius clamped or in a gap); the `filters` section on Forward+; control `dual-filter-on-forward-plus` |
| 2 | An element with `filter` and `backdrop-filter` drew its backdrop inside its own group: a white slab and no error | The group is under a bare `shell` item; the backdrop's copy and draw items hang on the shell (before the wrapper), with the box item's place and opacity. Nothing is blocked by an element's own group | `verifyBothOnOneElement` (lab scene `both`, six states, and `backdrop-blur-xl drop-shadow-lg`), glass card `glass-dual-card`; controls `backdrop-in-wrapper`, `keep-effect-state` |
| 3 | Mobile and Forward+ place a level's texels by the copy region; the engine places them by the whole target | `blur::texel_map`: Compatibility follows the region, both RenderingDevice renderers `chain_map(0, target, level)` | unit test `the_rendering_device_renderers_place_texels_by_the_whole_target_not_the_region`; `filters-sizes` at 1920 x 1080 and 1366 x 768 on Mobile; control `region-chain` |
| 4 | Compatibility: a blur group after a backdrop that reads no mipmap read level 0 (a hard edge); the primer was also culled when the root's origin was off screen | Each blur group has its own probe (one pixel copied, one pixel drawn with a mip-reading material) on its shell, right before it, at a pixel of the group that is on the target; no global primer | `verifyGroupAfterPlainBackdrop`, `verifyGroupWithRootOriginOffScreen`; control `root-primer` (the old primer put back) |
| 5 | A panel held back by a filter above it was never looked at again when that filter went | `Effects.blocked`; a group appearing or going re-syncs live, held-back and (on delete) held-back-by-a-deleted-group effects, in rounds bounded by their number | `verifyBlockedReturns`; control `blocked-forgotten` |
| 6 | Removing one effect from an element that keeps the other left its material and state; the next one drew nothing (no material, shape or copy rectangle) and the material leaked | `drop_backdrop_state` and `drop_group_state` free the material and clear every field that belongs to the items that went | `verifyBothOnOneElement` steps; control `keep-effect-state` |
| 7 | A group's region with a negative origin was truncated toward zero by the engine: a pixel too large on the far side | The region is cut to the target before it is biased; `REGION_BIAS_PX` only ever sees coordinates that are not negative | unit tests in `filter_render.rs`; `verifyGroupAtTheCorner` (0.042 px worst, limit 0.25); the fault `truncated-bias` is measured, not a failing control (decision 7) |
| 8 | Commits made while the root is outside the tree were never planned when it came back at the same transform | `update_effect_params` forgets the cached transform when it cannot read one; the first refresh back re-plans every effect | `verifyCommitOutsideTheTree`; control `keep-transform-out-of-tree` |
| 9 | A change to the viewport's canvas transform (`Camera2D`, a `CanvasLayer`) was picked up "on the next paint pass", which is not every frame | While an effect exists the root asks for `process()` frames and reads the transform each one; a tree with no effect asks for none | `verifyCanvasTransformFollowed`; control `stale-viewport` |
| 10 | Rectangles of a group under a rotated or mirrored root were the transformed corner and the absolute size | `local_rect` is the bounding box of the four corners | unit test; `verifyMirroredRoot`; control `corner-rect` |
| 11 | Text that changed inside a fixed-size node kept a group's rectangle too small | A content record notes the change, and the group measures its subtree again | `verifyTextChangeGrowsGroup`; control `text-unnoticed` |
| 12 | Every group walked its whole subtree on any change anywhere; a filtered element at opacity 0 still paid for a group | A group keeps its subtree's extent (relative to its own corner) until an element inside it changes (geometry, scroll, content, paint children); the shell is hidden below the engine's own cull threshold (0.007) | `verifyUnrelatedChangesDoNotWalk`, `verifyFadedGroupIsNotDrawn`; controls `walk-every-subtree`, `visible-at-zero-opacity` |
| 13 | Units in filter arguments were case-sensitive (`4PX`, `90DEG`) | Arguments are lowercased before they are read, in native and in the arbitrary-value parser | `filter.rs` and `tests/filters.test.ts` |
| 14 | (found while testing at a fixed size) A window in `viewport` content-scale mode: rectangles and radii were computed in screen pixels | The root-to-target transform is the stretch, the global canvas transform and the item's, not `Viewport::get_final_transform` (a `Window`'s adds the map to the screen) | `filters-sizes` and control `window-transform` under `--viewport` |

## Forward+ calibration

Run on this Mac (Apple M1 Max), Godot 4.8 beta custom build 1225394ce, Metal 4.0 Forward+, `--rendering-method forward_plus`.

Probes: `experiments/filters-engine/exp1.gd` and `exp3.gd` run unchanged under `--rendering-method gl_compatibility`, `mobile` and
`forward_plus` (copied under `artifacts/fixes/`, logs `artifacts/logs/fix-exp1-*.log`, `fix-exp3-*.log`).

**What the engine does** (`servers/rendering/renderer_rd/storage_rd/texture_storage.cpp:5177` and the files it calls):

| Renderer | How the back buffer's mip chain is made | Texels placed by |
| --- | --- | --- |
| Compatibility | `gaussian_blur` (GLES3): the 13-tap dual filter, normalised by the copy region | the region's integer halving (`blur::chain_map(region)`) |
| Mobile | `RenderForwardMobile::_render_buffers_can_be_storage()` is false, so `gaussian_blur_raster`: the same 13 taps, one full-screen triangle per level, **the region is never read** | the whole target's halving |
| Forward+ | `gaussian_blur` (compute, `copy.glsl` `MODE_GAUSSIAN_BLUR`): a separable 7-tap kernel `{0.2146, 0.1899, 0.1315, 0.0713}` over 2 x 2 bilinear quads two source texels apart; the region only picks which pixels are written (`section.xy + gid`), the UV is the pixel over the level's full size | the whole target's halving |

**Variance of one step, in source texels squared**, from the edge profile's second moment (the derivative of each level's edge,
minus the variance of the bilinear interpolation of sampling a level, `texel^2 / 6`):

| | level 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Compatibility (profile sigma, px) | 1.58 | 3.36 | 6.85 | 13.70 | |
| Mobile (profile sigma, px) | 1.58 | 3.43 | 6.90 | 13.80 | 27.59 |
| Forward+ (profile sigma, px) | 3.39 | 7.63 | 15.61 | 31.25 | 62.51 |
| Forward+ step variance | 10.8 | 11.1 | 11.1 | 11.0 | 11.0 |

The kernel's own variance from `copy.glsl` is `4 * 2.715 + 0.25 = 11.11` (cache entries two texels apart, each a two-texel box), so the
constant is **11.0**; the dual filter's is 1.75 (Compatibility and Mobile agree to one 8-bit step, as `exp1` found before).

**Stale band at a copy region's border** (`exp3`: the least inflation that leaves a read clean): Compatibility 16, 24, 48 px at levels
2, 3, 4 (3 to 4 texels), Mobile the same, **Forward+ 24, 48, 96 px (six texels; 2 to 4 % leaks at four)**: `FORWARD_PLUS_CONTAMINATION_TEXELS`
is 6.5. Mobile and Forward+ need no primer (the whole back buffer is sampleable whatever was copied).

**What the old plan drew on Forward+** (the dual filter's variance, level chosen for it, then the wider chain):

| css px | old plan | Forward+ drew | new plan (level, kernel texels, pairs) | draws |
| --- | --- | --- | --- | --- |
| 2 | L1, 0.75 | 3.6 px (1.8x) | L0, 2.00, 7 | 2.0 |
| 4 | L2, 0.67 | 7.9 px (2.0x) | L1, 1.12, 5 | 4.0 |
| 8 | L3, 0.65 | 16.1 px (2.0x) | L1, 3.64, 12 | 8.0 |
| 12 | L3, 1.29 | 18.4 px (1.5x) | L2, 2.36, 9 | 12.0 |
| 16 | L4, 0.65 | 32.3 px (2.0x) | L2, 3.54, 12 | 16.0 |
| 24 | L4, 1.29 | 36.9 px (1.5x) | L3, 2.32, 8 | 24.0 |
| 40 | L5, 0.99 | 69.0 px (1.7x) | L4, 1.61, 6 | 40.0 |
| 64 | L6, 0.65 | 129 px (2.0x) | L4, 3.51, 12 | 64.0 |

**The model for Forward+** (`blur.rs`): step variance 11.0, reconstruction kernel 0.8 to 3.7 texels (a binomial-ish 13-tap chain is
fine at 0.6; this one's first levels are a truncated kernel over boxes, 0.0125 off a Gaussian and 2.9 % too wide at level three with 0.6, 0.0088
and 1.6 % at 0.8), up to 13 bilinear pairs per axis. With a kernel of three texels a level could not reach where the next may start (a 64 px blur fell
in the gap and clamped at 57 px); 3.7 closes every gap, so no radius from 0.3 to 120 px is clamped on a target with levels to nine.

Checked three ways: the CPU model against the measured chain (unit tests: profile within 0.016 and width within 2 % of a Gaussian at the eight lab radii at
DPR 1 and 2, a 1 % radius sweep within 0.012, the variance of each level's impulse response within 4 % of the constant); the real renderer
(`pnpm verify:interaction --only=filters --renderer=forward_plus`, both windows: every radius within the verifier's bounds, width within
`max(4 %, 0.6 px)` of `2.563 sigma` and profile within 0.02 of the Gaussian's, sweep worst 0.0112 against 0.012; Compatibility's is 0.0089 and Mobile's 0.0071);
and the control `dual-filter-on-forward-plus` (the old model put back), which fails at `backdrop blur 2px: 10 to 90 width 9.58 px, a Gaussian of 2.00 px has 5.13`.
Forward+ was not run before this track; there is nothing it refuses.

Two things the engine does that a model cannot take out:

* A target that does not halve exactly (600 x 900, 1366 x 768) makes the last steps of the RenderingDevice chains wider than `2^level` (the last step carries most of the
  variance and its texel is `size[n-1] / size[n]` times wider): up to 4 to 5 % in width at 600 wide, level five. The verifier allows that much (`chainStretch`), the shader's maps already follow it.
* Compatibility's group buffer is the opaque target's RGB10_A2 back buffer (`texture_storage.cpp:2567`): **two bits of alpha**. A half-transparent element
  in a filter group is drawn at one third or two thirds (a black box at opacity 0.25, 0.5, 0.75, 0.9 came out 0.667, 0.333, 0.333, 0 over white), and so are the
  alpha edges of a blurred group (a drop shadow's halo has four steps). Colours have ten bits. It is not something the shader can restore; a transparent window or
  an HDR 2D viewport has a wider format. Recorded in the README.


## Decisions

1. **Forward+**: split and calibrated, not refused (it starts here: Metal 4.0 Forward+). `Compatibility`, `Mobile` and `ForwardPlus` are separate kinds with their own
   variance, kernel range, stale band and tap budget; a rendering method none of them names draws nothing and logs one error.
2. **Both properties on one element** works: the backdrop is outside the group, on a shell item beside it. Where it differs from CSS (Filter Effects 2, section 2.1, step 6: "if
   element B has any transforms, effects, or clips, apply those to T'", where T' holds the filtered backdrop *and* the element's content), recorded in the README:
   the element's `filter` does not apply to its backdrop's result. So a `blur()` does not soften the frosted area's edge, a `drop-shadow()` is cast by the element's own fill
   (20 % opaque on a typical glass card: a faint shadow) and shows through a translucent fill (CSS hides it behind the opaque frosted area), and `brightness()` and the like leave
   the backdrop alone. The element's own `opacity` does apply to the backdrop (the spec says it does, and the draw item carries it). Not done: giving the group an alpha mask of
   the frosted area, which needs an opaque draw into a group whose composite then paints it over the backdrop.
3. **RenderingDevice mip placement**: `blur::texel_map` (tested), and proved at 1920 x 1080 and 1366 x 768 on Mobile with the logical-viewport window (`--viewport=WxH`: the window's
   content scale in `viewport` mode, aspect kept, so the target is that size on any display): the control `region-chain` fails there at `backdrop blur 4px: the edge departs from a Gaussian by 0.1027 (limit 0.02)`
   (1366 x 768) and `backdrop blur 24px, edge turned: ... 0.0691` (1920 x 1080), and `textbook-chain` fails at 1920 x 1080 only through the edge turned down a column, which
   is why the lab has one. The same fault is a no-op at the verifier's own 1120 x 800.
4. **Group after a plain backdrop**: a probe per group, not a better global primer. The primer's job is to leave `material_screen_texture_mipmaps_cached` true when the group's composite
   is flushed, and every copy item clears it, so only something between the last copy and the composite can be relied on. Its cost is one batch break and a one pixel mip generation per
   blur group per frame on Compatibility. The probe's pixel is one of the target the group covers (the root's origin may be off screen).
5. **Revive blocked effects** and 6. **partial removal** as proposed; the leak is counted (`materialsCreated - materialsFreed` is what live effects hold) and checked.
7. **Truncation**: fixed as proposed (cut before biased, tested). **It does not show on the real renderer on the fixture built for it**: the blurred edge 70 % across a panel at the target's corner is
   0.042 px off with the region cut and 0.042 px off without (`GODOT_REACT_FILTERS_TRUNCATION`, `fixed` and `biased`), where the arithmetic says 0.5 to 0.6 px for the biased one. The review's trace of
   how the engine builds the group's region from its members (the unions and `Rect2i` truncation) therefore holds for the pieces tested and misses something in the real
   path; I did not find what. There is no failing control for it (the section measures both and asserts only that neither is out of tolerance); the unit tests do pin the arithmetic.

Found on the way, not on the list:

* **A `Window` in `viewport` content-scale mode** computed every rectangle and radius in screen pixels (`get_final_transform` includes `window_transform`); fixed (finding 14 above).
* **Two bits of alpha in a Compatibility group** (above). The fade check allows a third.
* **The verifier's filtered-panel profile** needs its plateaus in reach: a radius whose 2.4 sigma does not fit a narrow window is skipped and logged (64 px at 600 wide on a renderer that draws it unclamped).

Lower-severity list, all done: out-of-tree commits (8), stale viewport transforms (9: a frame is asked for only while an effect exists, `effects_want_frames`; a move alone does not re-plan), rotated or mirrored roots (10, the
bounding box of four corners), stale rectangles after text changes (11; a scrolled `TextInput`'s own overflow is still not in the extent: its text item's rectangle is the whole text, which the
group's region does not include; not seen, not fixed), cost (12) and case-insensitive units (13).

**Cost numbers** (`GODOT_REACT_FILTERS_REFRESH`, four unrelated width changes beside a filtered list of 400 rows, native refresh time in microseconds, Apple M1 Max):
with the extent kept 16 to 17 in all (4 per change, no walk); with every group walking its subtree each time (the fault) 120 to 185 (30 to 46 per change, four walks): about ten times as much at 400 nodes,
and it grows with the subtree. A filtered element at opacity 0 now hides its shell: `culled: true` in the snapshot, none of the group's passes (full-target clear, mip generation of its region, composite) are
queued; the engine already culled its box item at the same threshold (0.007). Not measured in GPU milliseconds.


## Gates

Run from the worktree, each once on the final tree (logs in `artifacts/logs/fix-gate-*.log`), except where a defect was found and fixed in between (the earlier failing runs are
in `fix-*` logs and described above).

| Gate | Result |
| --- | --- |
| `cargo test --locked` (also `--features filter-faults`) | 623 passed (was 569) |
| `cargo clippy --locked --all-targets` (also `--features filter-faults`) | 0 warnings |
| `rustup run stable cargo fmt --check` | clean |
| `pnpm test:types`, default and `--engine=stock` | clean |
| `pnpm test` | 419 pass (the units test fails without the fix) |
| `pnpm verify:interaction --only=filters,glass,hidpi` | landscape and portrait passed: `filters` 26,774 and 10,463 assertions, `glass` 1,944 and 1,848, `hidpi` 488 and 494 |
| `pnpm verify --interaction --only=filters-faults --faults --no-retry` | landscape and portrait passed; every applicable control failed with its own check's message (`textbook-chain` portrait only; `region-chain`, `window-transform`, `dual-filter-on-forward-plus` need another renderer or size, below) |
| the same on Mobile at `--viewport=1366x768` and `--viewport=1920x1080` | passed (`region-chain` and `window-transform` hold, `textbook-chain` at 1920 x 1080 through the turned edge) |
| the same on Forward+ | landscape and portrait passed (`dual-filter-on-forward-plus` holds) |
| stock `pnpm verify:interaction --only=filters --engine=stock` | landscape and portrait passed (26,774 and 10,463) |
| `filters` on Mobile and on Forward+ (`--renderer=`) | both windows passed on each (26,774 and 10,455 assertions) |
| `filters-sizes` on Mobile, 1920 x 1080 and 1366 x 768 | passed (253 assertions each) |
| `pnpm build:web`, `pnpm verify:interaction:web --only=filters,glass` | passed: `filters` 676 assertions (592 before) and `glass` 72, 760 in all with the others, 56 captures, both orientations at device scale 1 and 2; the blocked-panel check announces the nesting error it provokes |


## Merge notes

Based on `4ea0bd8`; four code commits and the notes. Nothing was merged, rebased or pushed.

* `native/`: `blur.rs` (renderer kinds, `texel_map`), `filter_render.rs` (effects restructured; the biggest diff), `render_tree.rs` (`RenderNode`'s shell, probe, `arrange_backdrop`, `ensure_group(blur, probe)`),
  `filter_faults.rs` (13 faults added), `filter.rs` (units), and one-line hooks in `lib.rs` (frame while an effect exists), `mount.rs`, `scroll_input.rs`, `motion.rs`.
* **Snapshot change (JS/native contract)**: `NativeEffectsActivity.primer` is gone; `blocked`, `probes`, `subtreeWalks`, `refreshes`, `refreshMicros` and `materialsFreed` are new;
  `NativeEffects` has `layout` and its `filter` has `probe` and `culled`. Anything else reading them (the Web scenario was updated) must follow. No `#[func]` changed.
* `demo/src/main.ts`: `mirrorSurface`, `shiftCanvas`, and `--logical-viewport=WxH`; `scripts/verify.mjs`: `--renderer=` and `--viewport=`; sections: opt-in `filters-sizes`.
* `docs/tracks/filters.md` has a pointer to these notes; `docs/INTERACTION_PLAN.md` and `INTERACTION_PROGRESS.md` are untouched (D40's engine facts (a) to (f) held; this adds (g) the two RenderingDevice chains,
  (h) every copy item clears the mipmap flag, (i) a Compatibility group's buffer has two bits of alpha, (j) a window's final transform includes the map to the screen).
* The first run on Mobile and Forward+ at the verifier's windows needs `--renderer=`; the freshness guard and every other script are unchanged.

