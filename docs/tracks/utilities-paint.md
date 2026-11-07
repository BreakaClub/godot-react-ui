# Track: paint utilities (box shadows, rings, outlines, borders and corners by side, gradients)

Branch `utilities-paint`, based on main `d282fee`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`,
`docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the paragraph for the README is at the end).

Tailwind v3.4.17 utilities that compile and draw as Chrome draws them: `shadow-*`, `ring-*`, `outline-*`, `border-{t,r,b,l,x,y}`,
`rounded-{t,r,b,l,tl,tr,br,bl}`, `bg-gradient-to-*` with `from-*`, `via-*`, `to-*`, and the inline `boxShadow`, `backgroundImage`,
`border{Top,Right,Bottom,Left}{Width,Color}`, `border{TopLeft,...}Radius`, `borderStyle` and `outline*` styles. Chrome is the reference: the
lab (`demo/src/paint-lab.tsx`) and `scripts/paint-reference.mjs`, which builds the same pages as HTML and compiles their classes with
Tailwind 3.4.17's own compiler (`npm install` into `artifacts/utilities-paint-tailwind/` on first use).

## Where the code is

| What | Where |
| --- | --- |
| Class parsing, one call from `utilityStyle`, one from `mergeLonghands` | `src/utilities/paint.ts`, tests `tests/utilities-paint.test.ts`, fixture `tests/fixtures/paint-styles.json` (the Rust tests parse it) |
| Wire types, per-side merge | `native/props.rs` (fields, `merge`, `validate`, Taffy borders), `native/paint_style.rs` (what a computed style says: widths, colours, radii, outline, gradient) |
| Shadow lists and ring composition | `native/box_shadow.rs` |
| Gradients: parse, line, stops, ramp | `native/gradient.rs` |
| Shapes: rounded rectangle, signed distance, outlines | `native/rrect.rs` |
| Baked masks (shadow, inset shadow, outline, border side) | `native/shadow_mask.rs` |
| Exact fill mesh (fills of boxes with other layers, pills, gradients) | `native/box_mesh.rs` |
| Canvas commands, texture cache | `native/box_draw.rs` |
| What a box item draws, its key | `native/box_paint.rs`, `native/render_tree.rs` (`record_box`, `record_outline`) |
| Transition of `box-shadow` | `native/style_engine.rs`, `native/motion.rs` |
| Filter group extent | `native/filter_render.rs` (`subtree_extent`) |

## Decisions

**P1. Shadows, rings and outlines are baked masks, drawn as tinted nine-patches.** `StyleBoxFlat`'s shadow was measured against
Chrome's before it was rejected, from the engine's formula (`style_box_flat.cpp`, `draw`, "Create shadow"; not rendered): a linear feather
of `shadow_size` whole pixels from the shape's edge, at the colour's full alpha at the edge, where a CSS Gaussian (sigma = blur / 2) is half
of it there. Its best fit to the Gaussian outside the edge, the feather size and an alpha share chosen per shadow, is within 6 % of the
shadow's alpha for `shadow-sm` (feather 2, share 0.44) and 4 % for `shadow-md` to `shadow-2xl` (feather 5, 13, 22, 44; share 0.46), under one
level for Tailwind's alphas, so the profile alone would pass. It fails on what the profile does not do: with a centre it fills the shadow's
rectangle under the box, so a translucent panel shows its own shadow through (the key use, frosted glass, would be wrong whatever the
profile); there is no spread (so no ring, and `shadow-lg`'s `-3px`), no inset, and one shadow a box. What Skia does is what is built: a
Gaussian of the layer's rounded rectangle, with the border box cut out of an outer shadow and the padding box the only place an inset one is
drawn, baked once per key on the CPU in device pixels (`shadow_mask.rs`), cached, shared by every box that has the same layer, and drawn with
`canvas_item_add_nine_patch` tinted by the layer's colour. A key is the layer's numbers in device pixels, the corner radii and the border
widths; a box at least as big as the mask's reach is drawn from one small mask with a stretched middle (the corners hold the hole's corners,
the middle of the box is empty and not drawn), a smaller one from a mask of its own size. No per-element material (materials break
batching, and the Compatibility renderer on the Web draws nothing past 16 per-instance shader parameters), no work per frame.

**P2. One mechanism for four things.** An outer shadow, an inset shadow, an outline (the ring between the border box grown by the offset and
by the offset plus the width) and one side of a border (the ring between the border box and the padding box, cut to the side's wedge by
the two mitre half planes) are all "a mask times a colour": `shadow_mask::Shape`. A ring is a shadow layer with no blur, as in Tailwind (it
is built from the same variables), so a ring, a hard shadow and an outline share the code and the exactness of an analytic edge.

**P3. A plain box is still one `StyleBoxFlat`.** `BorderKey::needs_mesh` says when it cannot be: the sides differ in colour (it has one), or
their widths differ round a rounded corner (it takes the narrower side off the radius where CSS makes the inner curve an ellipse). Per-side
widths with square corners, and per-corner radii with equal widths, are its own (`set_border_width`, `set_corner_radius`). Anything with a
gradient or an inset shadow is drawn in layers (`is_layered`): the fill, the gradient, the inset shadows, the border, as CSS paints them.
The fix of `record_box` for a translucent border is kept as it was (the fill alone, then a ring with no centre).

**P4. A gradient is a mesh over a baked ramp, with no material.** The mesh is the border box's rounded rectangle (a fan with a one device
pixel feather, as `StyleBoxFlat` antialiases) whose vertices carry their position along the gradient line as a texture coordinate; the ramp
is a one pixel high RGBA8 texture, one texel a device pixel along the line rounded up to a power of two (so a hard stop is resolved to
about a pixel and a box that grows keeps its ramp), interpolated as CSS does, in sRGB with premultiplied alpha. The line is CSS's: through
the padding box's centre, as long as the corners need (`|w sin a| + |h cos a|`), and for `to bottom right` and its kin the perpendicular of
the diagonal the other two corners lie on, so that they are both at 50 %.

**P5. The utilities compose as the stylesheet does, and across variants.** Tailwind v3 builds `box-shadow` from `--tw-ring-offset-shadow,
--tw-ring-shadow, --tw-shadow` and the gradient from `--tw-gradient-from/via/to`; `boxShadowParts` and `gradientParts` carry those variables
and merge per variable, like `filterParts`, both in `mergeLonghands` and in native `StyleSpec::merge`. `shadow-sm ring-1 ring-black/5
focus:ring-2 focus:ring-indigo-500` keeps the shadow when the ring grows on focus, resolved natively with no React work. An explicit
`boxShadow` or `backgroundImage` replaces the parts, and a utility set after it takes the composed value back (the `filter` rule).

**P6. A shorthand set after a side resets it; a side set after the shorthand wins.** The wire keeps `borderWidth`, `borderColor` and
`borderRadius` as they were and adds the sides and corners beside them; a longhand beats the shorthand in the same layer (`border
border-t-4`), a shorthand in a later layer or class resets the longhands (`border-t-4 border-2` is 2 all round). Tailwind's stylesheet
orders longhands after shorthands whatever the class order, so `border-t-4 border-2` is a 4 px top in a browser; this library's cascade is
the order of the classes everywhere else (`px-4 p-2`), and this follows it.

**P7. An outline is the native focus ring's author.** A browser's default focus ring is an outline, so setting any outline longhand takes
the native ring away from the element (`has_authored_outline`): `outline-none` (Tailwind's `outline: 2px solid transparent; outline-offset:
2px`) suppresses it, `focus-visible:outline-2 focus-visible:outline-indigo-500` replaces it with the author's.

**P8. `boxShadow` transitions natively, in Stylo.** The resolved list goes to Stylo as CSS text and the sampled computed list comes back
(`SampledStyle::box_shadow`), as `filter` does; Stylo pads the shorter list with transparent shadows and interpolates the lengths and the
premultiplied colours, so `transition: boxShadow` between `shadow-sm` and `shadow-xl` is one native property. `TransitionProperty::BoxShadow`.

**P9. Extents.** A box item's custom rect is its border box plus the reach of its outer shadows (offset, spread and three standard
deviations); an outline item's is its ring. A filter group measures the reach of every element below it (`subtree_extent`). The engine
culls an item by its rectangle, and the `paint` section has a box wholly off the window whose shadow alone reaches in.

**P10. An outer shadow is cut out of the box only where the box lets the backdrop through.** Blink paints an outer shadow under an opaque
background whole and the background over it; it clips the box out of the shadow only for a background colour that is translucent or absent,
because a clip leaves a gap along the antialiased edge. Measured in headless Chrome (a 64 x 56 box, `border-radius: 8px`, `box-shadow: 0 0 0 8px #10b981`, the three
variants as plain CSS on a black and on a #f8fafc page): on the corner arc the fill alone covers 0.227, 0.596, 0.859 of three neighbouring pixels, the
ring alone (no fill) 0.776, 0.405, 0.147 (the two sum to one, so the ring alone is cut), and the two together are not the cut ring under the
fill (214 on the red channel at the middle pixel) but the fill over the whole ring (158, as measured). A cut ring is up to 55 levels too light
on those arcs of an opaque box. `Shape::Outer { under_fill }`: for an opaque background colour the mask's hole starts one device pixel inside
the box (past the fill's antialiased edge, so a large card's shadow is still not drawn across its middle), for any other the hole is the border
box, so a translucent panel does not show its own shadow (negative control NC1).

**P11. A rounded box with other exact layers is filled from the exact mesh, and its fill stops half way under an opaque border.** Shadows,
rings, gradients and mitred borders are coverage masks and meshes with exact arcs. `StyleBoxFlat`'s arcs sit up to half a pixel from them, so
a box that has such a layer against its rounded edge (`fill_from_mesh`) is filled from the same exact mesh as a pill is (`solid`); a box with
none stays one `StyleBoxFlat` call (P3). Where an opaque border is painted over the fill's edge, the fill and the gradient are the border box
moved in by half that border's width (`BoxShape::fill_box`), which is what Blink does with `kBackgroundBleedShrinkBackground`: with the fill's
edge under the border's own antialiased edge, a pixel half covered by each shows a quarter of the fill outside the border (a white halo round
a dark border on the corner of a rounded box; 60 to 70 levels on `bg-slate-800 border-2 border-t-white border-b-black`).

## Limits

* **Not drawn: dashed, dotted and double borders and outlines** (rejected as unsupported classes). A dashed border round a curved corner
  has dashes fitted to each side in the browser; that is a separate piece of work, not a small addition to the masks.
* Borders, radii and outline widths are whole logical pixels in paint (as before: `StyleBoxFlat` takes integers); layout takes the float.
* A gradient is laid out over the padding box and drawn under the border; beyond the padding box it holds its end colours where CSS tiles
  the image, which differs only under a translucent border (`border-white/30` over `from-* to-*`).
* Logical sides and corners (`border-s`, `rounded-ss`), `ring-opacity-*`, `bg-gradient-to-*` with radial or conic images and `url()` images.
* The first shadows to draw bake their mask on the CPU, once per key: 6.5 ms for `shadow-2xl` at device pixel ratio two, 1.7 ms at one ("Cost").

## The Chrome reference, and what it taught

`scripts/paint-reference.mjs --render` builds the lab's pages as HTML (`demo/src/paint-data.ts` is the one source of the classes) and compiles
them with Tailwind 3.4.17's own compiler (`npm install` into `artifacts/utilities-paint-tailwind/` on first use). Two things about it were wrong
at first and are recorded because both looked like findings against the library:

* **`@tailwind utilities` alone is not Tailwind.** The `--tw-ring-offset-width`, `--tw-gradient-*-position` and similar defaults come from
  `@tailwind base`; without them `ring-1` and `from-*` are invalid in Chrome and draw nothing. The first comparison of the ring pages showed
  "our ring is 16 levels darker than Chrome's" on every ring; Chrome's pixel was the bare page. The compile is now `@tailwind base; @tailwind
  utilities;` with the preflight reset off (`corePlugins: { preflight: false }`), which the library has no counterpart of.
* **No preflight means a transparent border colour.** The library draws a border with no colour as transparent; a browser as `currentcolor`;
  Tailwind's preflight as gray-200. The reference sets `border-color: transparent`, and every page gives every drawn side a colour, so the
  comparison does not depend on the difference.

## Results against Chrome

`node --import tsx scripts/paint-reference.mjs --render` renders the twelve pages of the lab in headless Chrome (Tailwind 3.4.17's compiler; the
classes as written) at device pixel ratio 1 and 2, into `artifacts/utilities-paint-chrome/`. `--compare --native=<captures>` holds a
capture of the library against them and writes `artifacts/utilities-paint-compare/compare-paint-<page>-dpr<n>.png` (ours, Chrome's, the
difference times eight; subdirectories for Mobile, Forward+, stock, Web and portrait) and a JSON report (`<name>.json`: the whole page and each
box). The captures are the verifier's own (`artifacts/native-interaction*/{landscape,portrait}/paint-*.png` and the Web verifier's).

Each cell below is the worst channel's: mean difference in levels of 255 / 99th percentile / maximum / number of pixels with any channel
more than 32 levels off (of 116 032 at ratio 1 and 464 128 at ratio 2: the stage is 296 x 392 logical pixels). Landscape; portrait differs
by no more than a pixel or two (Compatibility, portrait: the same table, e.g. glass 3.192 / 41 / 79 / 2716 at ratio 1).

Device pixel ratio 1: worst channel, mean / p99 / max / pixels over 32

| Page | Compatibility, Breaka | Mobile, Breaka | Forward+, Breaka | Compatibility, stock | Web, Chrome |
| --- | --- | --- | --- | --- | --- |
| shadows | 0.131 / 1 / 22 / 0 | 0.062 / 1 / 22 / 0 | 0.062 / 1 / 22 / 0 | 0.131 / 1 / 22 / 0 | 0.089 / 1 / 22 / 0 |
| shadows-translucent | 0.201 / 1 / 24 / 0 | 0.090 / 1 / 24 / 0 | 0.090 / 1 / 24 / 0 | 0.201 / 1 / 24 / 0 | 0.116 / 1 / 24 / 0 |
| shadows-shapes | 0.130 / 1 / 4 / 0 | 0.052 / 1 / 4 / 0 | 0.052 / 1 / 4 / 0 | 0.130 / 1 / 4 / 0 | 0.082 / 1 / 3 / 0 |
| rings | 0.016 / 1 / 7 / 0 | 0.014 / 1 / 8 / 0 | 0.014 / 1 / 8 / 0 | 0.016 / 1 / 7 / 0 | 0.015 / 1 / 8 / 0 |
| rings-shadows | 0.108 / 1 / 7 / 0 | 0.027 / 1 / 7 / 0 | 0.027 / 1 / 7 / 0 | 0.108 / 1 / 7 / 0 | 0.076 / 1 / 7 / 0 |
| outlines | 0.008 / 0 / 4 / 0 | 0.007 / 0 / 5 / 0 | 0.007 / 0 / 5 / 0 | 0.008 / 0 / 4 / 0 | 0.007 / 0 / 5 / 0 |
| borders | 0.037 / 0 / 67 / 36 | 0.037 / 0 / 67 / 36 | 0.037 / 0 / 67 / 36 | 0.037 / 0 / 67 / 36 | 0.037 / 0 / 66 / 36 |
| borders-mixed | 0.019 / 0 / 88 / 10 | 0.017 / 0 / 88 / 10 | 0.017 / 0 / 88 / 10 | 0.019 / 0 / 88 / 10 | 0.017 / 0 / 88 / 10 |
| radii | 0.068 / 0 / 106 / 103 | 0.067 / 0 / 106 / 103 | 0.067 / 0 / 106 / 103 | 0.068 / 0 / 106 / 103 | 0.067 / 0 / 106 / 105 |
| gradients | 0.121 / 1 / 2 / 0 | 0.109 / 1 / 1 / 0 | 0.109 / 1 / 1 / 0 | 0.121 / 1 / 2 / 0 | 0.115 / 1 / 1 / 0 |
| gradients-rounded | 0.149 / 1 / 31 / 0 | 0.117 / 1 / 31 / 0 | 0.117 / 1 / 31 / 0 | 0.149 / 1 / 31 / 0 | 0.131 / 1 / 31 / 0 |
| glass | 3.188 / 41 / 79 / 2709 | 3.175 / 41 / 79 / 2689 | 3.173 / 41 / 79 / 2699 | 3.184 / 41 / 79 / 2709 | 3.169 / 41 / 79 / 2704 |

Device pixel ratio 2: worst channel, mean / p99 / max / pixels over 32

| Page | Compatibility, Breaka | Mobile, Breaka | Forward+, Breaka | Compatibility, stock | Web, Chrome |
| --- | --- | --- | --- | --- | --- |
| shadows | 0.122 / 1 / 23 / 0 | 0.073 / 1 / 23 / 0 | 0.073 / 1 / 23 / 0 | 0.122 / 1 / 23 / 0 | 0.091 / 1 / 23 / 0 |
| shadows-translucent | 0.198 / 1 / 22 / 0 | 0.095 / 1 / 23 / 0 | 0.095 / 1 / 23 / 0 | 0.198 / 1 / 22 / 0 | 0.116 / 1 / 22 / 0 |
| shadows-shapes | 0.108 / 1 / 4 / 0 | 0.042 / 1 / 4 / 0 | 0.042 / 1 / 4 / 0 | 0.108 / 1 / 4 / 0 | 0.075 / 1 / 4 / 0 |
| rings | 0.011 / 1 / 7 / 0 | 0.012 / 1 / 6 / 0 | 0.012 / 1 / 6 / 0 | 0.011 / 1 / 7 / 0 | 0.010 / 0 / 6 / 0 |
| rings-shadows | 0.101 / 1 / 8 / 0 | 0.028 / 1 / 7 / 0 | 0.028 / 1 / 7 / 0 | 0.101 / 1 / 8 / 0 | 0.072 / 1 / 7 / 0 |
| outlines | 0.003 / 0 / 2 / 0 | 0.003 / 0 / 2 / 0 | 0.003 / 0 / 2 / 0 | 0.003 / 0 / 2 / 0 | 0.003 / 0 / 2 / 0 |
| borders | 0.018 / 0 / 60 / 67 | 0.018 / 0 / 60 / 66 | 0.018 / 0 / 60 / 66 | 0.018 / 0 / 60 / 67 | 0.018 / 0 / 60 / 66 |
| borders-mixed | 0.009 / 0 / 65 / 25 | 0.007 / 0 / 65 / 25 | 0.007 / 0 / 65 / 25 | 0.009 / 0 / 65 / 25 | 0.007 / 0 / 65 / 25 |
| radii | 0.041 / 0 / 112 / 201 | 0.041 / 0 / 111 / 201 | 0.041 / 0 / 111 / 201 | 0.041 / 0 / 112 / 201 | 0.041 / 0 / 111 / 201 |
| gradients | 0.105 / 1 / 2 / 0 | 0.101 / 1 / 1 / 0 | 0.101 / 1 / 1 / 0 | 0.105 / 1 / 2 / 0 | 0.102 / 1 / 1 / 0 |
| gradients-rounded | 0.135 / 1 / 31 / 0 | 0.113 / 1 / 32 / 0 | 0.113 / 1 / 32 / 0 | 0.135 / 1 / 31 / 0 | 0.123 / 1 / 32 / 0 |
| glass | 3.177 / 41 / 81 / 10841 | 3.162 / 41 / 81 / 10805 | 3.153 / 41 / 81 / 10780 | 3.175 / 41 / 81 / 10841 | 3.155 / 41 / 81 / 10818 |

How to read it. Every page but `glass` has a 99th percentile of 1 level or less: the pixels that are not edges are exact. The pages of
shadows, rings, outlines and plain gradients have no pixel more than 32 levels off. Their largest differences are the arc of a 1 px border (22
to 24, `shadows` and `shadows-translucent`, see 1 below), 4 on the shapes (a pill, a circle, `rounded-t-3xl`), 7 to 8 on rings, 4 on outlines
and 2 on gradients. What is left of the big differences is on the pages of borders and corners, in "Differences from Chrome that stay".
Mobile and Forward+ differ from Compatibility only in the mean of the pages with soft shadows (0.06 against 0.13 on `shadows`): the same
masks, blended in two spaces.

The Web build (`pnpm build:web`, then `node scripts/verify-interaction-web.mjs --only=paint`: four viewports, 48 captures, 104 checks) draws the
same pixels as native: every maximum of the Web column is within 2 levels of the Compatibility column and every count within a few pixels, and
the Web verifier passed.

## Differences from Chrome that stay

Each of these is measured in the table above and was looked at in the side by side images (`artifacts/utilities-paint-compare/`).

1. **The arcs of a plain rounded box are `StyleBoxFlat`'s.** A box with no shadow, ring, gradient or mitred border is still one `StyleBoxFlat`
   call (P3), and its corner arcs sit 0.3 to 0.5 pixel inside Chrome's at 45 degrees. On the `radii` page that is 103 pixels (ratio 1) and 201
   (ratio 2) more than 32 levels off, at most 106 and 112, one to three pixels of each corner where the box and its backdrop differ most. This
   is the path every rounded box of the library took before this track and it is unchanged. Routing every rounded box through the exact mesh
   (what P11 does for a box with other layers on its edge) would remove it, at five draws for a card with a border (the fill and a mask for
   each side) where it is one now; it is a decision for the library, not for this track. `shadows`' 22 levels (a 1 px border) and the 24 of
   `shadows-translucent` (a translucent 1 px border over a translucent fill) are the same arcs.
2. **Where a one-sided border runs out along a curve** (`rounded-xl border-b-4`, `rounded-lg border-l-8`, `rounded-full border-b-4`; `borders`:
   36 pixels over 32 levels, at most 67) the two renderers differ by up to a quarter of the border's contrast on one or two pixels. The
   difference is Chrome's, not an arc of ours: its pixel values there are quarters (on slate-700 over white: 204, 153, 102, 51), the signature of
   a coarse supersampled path edge, where ours is the exact coverage. Likewise one pixel at the mitre of `rounded-3xl border-8` with a different
   colour on each side (`borders-mixed`: 10 pixels, at most 88).
3. **`glass`: the blur.** Outside the tiles (their shadows, rings, outlines and the backdrop round them: 73 024 of 116 032 pixels at ratio 1)
   the page differs from Chrome by 0.18 / 0.15 / 0.15 on average and 5 at most (7 at ratio 2); inside them, where the fill, the border and `backdrop-blur-*`
   are, by 8.3 / 6.3 / 4.8 on average, 56 / 38 / 29 at the 99th percentile and 79 at most. The inside is the backdrop blur of the filters
   track (`docs/tracks/filter-fixes.md` calibrates it against Chrome) and was not separated further here: the pattern of the difference image
   is smooth gradients over the tiles that overlap an edge of the backdrop, not an edge of a box.
4. **Not drawn: dashed, dotted and double borders and outlines** (rejected; Limits).
5. **A gradient is clamped where CSS tiles it** under a translucent border (Limits); **borders, radii and outline widths are whole logical
   pixels** in paint (`StyleBoxFlat` takes integers; layout takes the float).
6. **An outer shadow under an opaque fill has its hole one device pixel inside the edge** (P10): Chrome has no hole at all there; the pixels
   between are covered whole by the fill, so the two cannot be told apart in a raster. It would show if the fill were drawn with a
   gap, which the exact mesh does not leave.

## Cost

Zero for a tree that uses none of it: a box with no decoration holds no texture (`checkCost`: a page with nothing to paint holds none, a page of
twelve shadows holds fewer than twenty-four shared masks, and gives them back when it goes), a plain box is the one `StyleBoxFlat` call it was,
and `Decoration` is `None`.

The first draw of a mask bakes it on the CPU, once per key, shared by every box that has the same layer. Measured with a release build on this
machine (an M1 Max, the gate's three slots busy, `cargo test --release`, one throwaway test of `shadow_mask::bake`, five runs each; the numbers are
the median):

| Mask | Ratio 1 | Ratio 2 |
| --- | --- | --- |
| `shadow-2xl` (`0 25px 50px -12px`), a box wider than its reach (the stretched mask) | 471 x 471 px, 1.7 ms | 935 x 935 px, 6.5 ms (3.5 MB of RGBA) |
| `shadow-2xl`, a 296 x 64 card (a mask of its own size) | 522 x 290 px, 1.1 ms | 1042 x 578 px, 4.5 ms |
| `shadow-sm` | 39 x 39 px, under 0.1 ms | 71 x 71 px, 0.1 ms |

A transition of `box-shadow` samples a new list each frame, so each frame of it bakes the masks of the layers that changed (a few milliseconds
at ratio 2 for `shadow-2xl`, none while nothing moves); the old ones are released as the lease of the box moves on. That was not measured in
the engine. A hover that changes a shadow and a ring makes no React commit and re-records one box (`checkHover`: `batches` unchanged,
`boxRecords` one more).

## Negative controls

Each is a throwaway mutation of a committed file, built (native) or run (TypeScript), the named check run, the file restored with `git checkout`
(`git status` clean afterwards) and the committed sources rebuilt and the section run green again (Compatibility, both orientations, 1545
checks). The failures are the first assertion to fail; the verifier stops there.

| Control | Mutation | Result |
| --- | --- | --- |
| NC1: a shadow under a translucent fill | `shadow_mask.rs`: the outer shadow's mask is not cut by the box (`value * (1.0 - hole.coverage(x, y))` becomes `*value`) | the `paint` section fails: "A translucent box shows no shadow through itself: rgb(242, 167, 114) with shadow-xl, rgb(252, 171, 115) without" |
| NC2: culling by a too small custom rect | `box_paint.rs`: `paint_rect()` returns the border box, not the border box and its shadows | the first run **passed** (the cell touched the stage's edge, and the engine counts touching rectangles as intersecting): the check was too weak and was fixed (the cell, "Bounds that moved"). After the fix: "The shadow of a box wholly off the window still reaches in, as Chrome draws it: rgb(226, 232, 240) at (2, 373), expected rgb(221, 227, 235) within 3" |
| NC3a: the ring does not compose across variants (TypeScript) | `paint.ts`: `mergePaint` replaces `boxShadowParts` instead of merging per variable | `tests/utilities-paint.test.ts`: 3 of 14 fail ("ring utilities set the variables Tailwind composes", "shadows and rings compose across variants and merge per variable", "compiled paint styles match the native contract fixture"); and the section fails: "shadow-indigo-500/50 tints its shadow blue: rgb(241, 245, 249)" |
| NC3b: the same, natively (the state variants) | `box_shadow.rs`: `ShadowParts::merge` overwrites every variable, set or not | `cargo test box_shadow`: `parts_merge_per_variable` fails; and the section fails on the focus composition: "and the shadow-lg of the same element is still there, as in Chrome (near): rgb(241, 245, 249) at (60, 244), expected rgb(224, 228, 232) within 3" |

The ring pixel of P10 has no mutation run against it: the check asserts Chrome's pixel (a cut ring is 55 levels from it by measurement, before the
change), and the unit test `under_an_opaque_fill_the_shadow_runs_under_the_antialiased_edge` asserts the cut and the uncut mask differ along the edge.

## What was run

Every heavy command through the gate (`.gate/gate`), in the background. Results are from the final commit unless a line says otherwise.

| Command | Result |
| --- | --- |
| `cargo test` | 756 passed, 0 failed (by module: `rrect` 8, `shadow_mask` 12, `box_shadow` 9, `gradient` 13, `paint_style` 7, `box_paint` 9, `box_mesh` 3, `style_engine` 13) |
| `cargo clippy --all-targets -- -D warnings`, and with `--features filter-faults` | clean |
| `cargo +stable fmt --check` | clean for every file of this branch; it reports `native/scroll.rs`, `native/selection_input.rs` and `native/text_input_godot/keys.rs`, which this branch does not touch (the same on its base) |
| `pnpm test` | 643 pass, 0 fail |
| `pnpm test:types`, and `--engine=stock` | exit 0 |
| `pnpm build:native` (Breaka), `pnpm build:native --engine=stock` | built (about 45 s and 2.5 min; one stale-stamp failure early on was an edit of a native file during a build) |
| `node scripts/verify.mjs --interaction --only=paint --no-retry --renderer=<gl_compatibility, mobile, forward_plus>` | PASSED, landscape and portrait, 1545 checks a run, Breaka |
| the same with `--engine=stock` | PASSED, landscape and portrait, 1545 checks a run, the three renderers |
| `pnpm build:web`, then `node scripts/verify-interaction-web.mjs --only=paint` | PASSED, four viewports (landscape, portrait, and both at ratio 2), 48 captures, 104 checks |
| `node --import tsx scripts/paint-reference.mjs --render`, then `--compare` for each of the above | the tables above; side by sides in `artifacts/utilities-paint-compare/` |
| the four negative controls | "Negative controls" |

## Bounds that moved, and why

A check that fails against the code is not widened to pass. These are the checks of `demo/src/verify-paint.ts` whose bound or probe changed after
a failure, with Chrome's pixel for each (read from the reference, `scripts/paint-reference.mjs`, and for the focus ring a headless Chrome focused with
the keyboard). Where Chrome has a value the check now asserts it (`CHROME_*` in the file). The bounds that remain are for reads with no blending in them (`SAME_LEVELS`, 2: a flat colour of the fill), gradient ends
(`NEAR_LEVELS`, 6), Chrome's blended pixels (`CHROME_LEVELS`, 3) and Chrome's arc pixels (`CHROME_ARC_LEVELS`, 8, below).

| Check | Was | Now | Chrome's value, and why it moved |
| --- | --- | --- | --- |
| `shadow-sm ring-1 ring-black/5`: the hairline | the pixel within 1 to 14 levels of the page | (225, 229, 233) at ratio 1, (224, 228, 232) at ratio 2, within 2 | 14 was my guess; the pixel is 16 levels from the page in Chrome too (the ring and the shadow), and ours was equal to it to the level |
| `shadow-md ring-2`: the shadow below the ring | 5 device pixels below the ring, darker than the page by at least 3 | 1 pixel below it: (230, 233, 237) at ratio 1, (226, 230, 234) at ratio 2, within 3 | probe in the wrong place: Chrome is 2 levels from the page at the old pixel (239, 243, 247 against 241, 245, 249) and 11 to 15 at the new one |
| bottom right mitre of `border-4 border-t-red-500 ...` | the pixel on the diagonal, "the bottom's green within 26" | two pixels, one each side of it: (34, 197, 94) below and (59, 130, 246) above, within 2 | the old pixel is on the mitre, where Chrome blends the two colours evenly (47, 164, 170; ours 46, 163, 170) |
| the focused `ring-2` with the shadow of the same element | `shadow-sm` below the ring at least 1 level darker than the page | `shadow-lg`: (224, 228, 232) 4 pixels and (231, 235, 239) 8 pixels below the ring at ratio 1, (224, 228, 231) and (231, 235, 238) at ratio 2, within 3 | probe in the wrong place: with `shadow-sm` Chrome's pixel past the ring is exactly the page's (241, 245, 249): the shadow lies under the ring. `shadow-lg` shows past it, and Chrome's focused and unfocused pixels are equal |
| the shadow of a box wholly off the window | a probe 20 pixels from the shadow's centre, at least 3 darker | 14 pixels from its edge at its middle: (219, 225, 232), within 3 | probe in the wrong place twice: Chrome is the bare page at both earlier ones (the first read above the shadow, the second too far from the edge: 1 level) |
| a box with no fill and `shadow-lg`, its inside | compared with a stripe pixel 4 pixels left of the box | the stripe's own colour (59, 130, 246) within 1 | Chrome's pixel at the old reference is (58, 128, 241): the box's own shadow darkens it |
| the shadow of a box wholly off the window, the cell itself | the cell ended at the stage's edge (`left: -64, width: 64`) | ended 8 pixels past it (`left: -72`); Chrome re-read at the probe: (221, 227, 235) at both ratios, within 3 | not a bound: the first negative control (the item's rectangle cut down to the border box) passed. `RendererCanvasCull` counts rectangles that touch as intersecting (`intersects(rect, true)`), so a box ending exactly at the edge was drawn whatever its rectangle said. The Web check asserted a darkness of my own (3 levels under slate-200); it now asserts Chrome's value too |
| the middle of the shadow transition | between the two ends, or the ends less than 12 levels apart | between the two ends | a clause of mine that passed whenever the ends were close; it never had a Chrome number and is gone (the section passes without it) |
| `ring-8` on an opaque box: the inner arc pixel (a new check) | | Chrome's (158, 227, 204) at ratio 1 and (162, 228, 206) at 2, within 8 | new, so not moved; the bound is the largest difference between our exact arcs and Skia's on the shapes page (7, then 4 after P10 and P11). The pixel is 4 levels from Chrome's; a ring cut out of an opaque box is 55 off |

No check was widened without Chrome's number for the same pixel. Still open, from the same table, are the differences that are not a probe:
see "Differences from Chrome that stay".

## README text

Paste under the styling section of `README.md` (the track does not edit it):

> ### Shadows, rings, outlines, borders by side, gradients
>
> `shadow-*` (`shadow-sm` to `shadow-2xl`, `shadow-inner`, `shadow-none`, `shadow-<colour>[/<opacity>]`, `shadow-[<css>]`), `ring-*` and
> `ring-offset-*` (with `ring-inset`), `outline-*`, `border-{t,r,b,l,x,y}-*`, `rounded-{t,r,b,l,tl,tr,br,bl}-*`, `bg-gradient-to-*` with
> `from-*`, `via-*`, `to-*` (colours, opacities and positions) and the inline `boxShadow`, `backgroundImage`, `border<Side>Width|Color`,
> `border<Corner>Radius` and `outline*` styles compile as Tailwind v3 does and draw as Chrome draws them: a shadow is a Gaussian of the box's own
> rounded rectangle, cut out of the box when its background lets the backdrop through (a frosted panel does not show its shadow), a ring
> is a shadow with a spread, an outline replaces the native focus ring, a border can have a different colour and width on each side with
> mitred corners, and a gradient is interpolated in sRGB with premultiplied alpha along CSS's own gradient line. Shadows and rings
> compose across variants (`shadow-sm ring-1 focus:ring-2` keeps the shadow when the ring grows) and `boxShadow` is a native transition
> property. Against headless Chrome at device pixel ratios 1 and 2 on the Compatibility, Mobile and Forward+ renderers, on the Breaka and
> the stock engine, and in the Web build, a page of any of these differs by under a level on average and by at most a few levels on shadows,
> rings, outlines and gradients; the arcs of rounded corners and the ends of one-sided borders on a curve differ by up to a quarter of the
> contrast on a pixel or two (`docs/tracks/utilities-paint.md`). Not drawn: dashed, dotted and double borders and outlines (rejected with
> an error that names the class), radial and conic gradients, `url()` images, logical sides (`border-s`, `rounded-ss`) and `ring-opacity-*`.
> Borders, radii and outline widths are whole logical pixels in paint. A tree with none of these pays nothing for them.
