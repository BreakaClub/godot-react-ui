# Track: CSS transforms (batch of 2026-11-07)

Branch `transforms` (merged to main, from `d282fee`), finished on `transforms-finish` (from main `76418ad`). Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md`
and `README.md` are not edited here (the paragraph for the README is at the end).

`transform` and `transformOrigin` as styles, drawn by moving an element's canvas item, with every reader of geometry going through the matrix.
Everything that does not need a render target; `perspective()` is refused with a message that says so, and the matrices are 4 x 4 inside so that
a perspective pass can be added later without redoing any of it (see "For `transform-3d-spike`").

## What the engine does (read from source)

* The canvas has no W: `gl_Position = screen_transform * vec4(vertex, 0.0, 1.0)` (`drivers/gles3/shaders/canvas.glsl:280` and the RD equivalent),
  `VERTEX` is a `vec2`, and an item's transform is a `Transform2D`. A matrix without perspective, `rotateX` and `rotateY` included, projects to an
  affine map by taking its x, y and offset terms and dropping z. Chrome draws those orthographically (`transform-style: flat`), so the picture is the
  same and no render target is involved.
* Clips are axis aligned: `canvas_item_set_clip` takes the bounding box of the transformed rectangle (`renderer_canvas_cull.cpp:415`). A clip under a
  translate, a scale, a mirror or a quarter turn is therefore exact; under any other rotation or a skew it is the box round the rotated rectangle.
* `clip_children` (`CANVAS_GROUP_MODE_CLIP_ONLY`, `drivers/gles3/rasterizer_canvas_gles3.cpp:474-516`, `:609-620`) would give an exact rotated mask. It
  draws the children into the render target's back buffer, which on Compatibility is RGB10_A2 (two bits of alpha, `docs/tracks/filter-fixes.md`),
  canvas groups do not nest (so no rotated clip inside a rotated clip, inside a filter, or holding one), and the mask is the clip owner's own
  drawing. See "Rotated and skewed clips" for the decision.
* Stylo (`style::values::computed::transform`) already implements `transform` parsing, `calc()`, unit resolution, the matrix of a list
  (`Transform::to_transform_3d_matrix(Some(&reference_box))`) and CSS's interpolation: function by function for matching lists, otherwise by
  decomposing the matrices. For lists that do not match and have a percentage in them it hands back `InterpolateMatrix { from_list, to_list, progress }`,
  which needs the element's box to resolve; `native/transform.rs` resolves it with Stylo's own `Matrix3D::animate`.

## Design

* **Style.** `transform` (CSS text, like `filter`), `transformOrigin` (CSS text), and `transformParts` for Tailwind's separate utilities. A value is
  parsed once by Stylo, in a throwaway document on a thread-local (`native/transform.rs`, `Scratch`): the value is written to an element and read back
  computed, so units, `calc()`, case and every syntax rule are Stylo's, and a refused value is told from "computed to the previous value" by writing a
  sentinel first. Results are cached by text. The messages are specific: an unknown function names it, `perspective()` and a projective `matrix3d()` say
  "perspective is not implemented yet", and `em`, `ex`, `ch`, `lh` and the viewport units are refused (they would resolve against the scratch element, not
  the real one); `rem` is 16 px, as in Tailwind. Not hand-rolled: nothing here parses CSS.
* **Matrix.** Stylo's `Matrix3D` (row vectors, `m41` is the x translation) is the 4 x 4. An element's matrix is `translate(-origin) * list * translate(origin)`
  for its border box. `Placement` is the 2D affine of that (x, y and offset terms) and its inverse, `None` when the determinant is below 1e-9 (a collapsed
  or edge-on element: `scale(0)`, `rotateY(90deg)`). Flattening is per element, not of the product: a child's `rotateX` is dropped to 2D before the parent's
  `rotateY` applies, as `transform-style: flat` does (unit test `nested_flattening_is_per_element_not_of_the_product`).
* **Paint.** An element's box item takes `location x matrix` (`RenderNode::item_transform`); everything below it follows. No re-record, no layout, no change
  to siblings. A matrix with no inverse hides the item. An element with no transform is `Option::None` on its node (`MountedNode::transform`) and nothing in
  `transform_state.rs` runs for it.
* **Square corners.** `StyleBoxFlat` antialiases only a rounded or skewed box, so under a map that is not the identity a box with square corners is drawn from feathered
  triangles instead (`native/square_box.rs`; `Raster::soften_squares`, `BoxKey::square_feather`): per-vertex coverage alpha, a box filter one device pixel wide on each of the box's own
  axes (`Linear2::edge_feather`). Rounded boxes stay on `StyleBoxFlat` with one feather length (see "Against Chrome").
* **Motion.** `TransitionProperty::Transform`. The node's CSS text is mirrored into the Stylo document with the rest of a motion node's style and the sampled
  computed list comes back in `SampledStyle::transform`; it is evaluated against the element's current box each frame (a handful of multiplications, no
  JS, no re-record). The snapshot's `transitions` records carry the six numbers of the matrix.
* **Layout ignores transforms**, with one exception that is the CSS rule for containing blocks: a transformed element is the containing block of its
  `absolute` and `fixed` descendants. `StyleSpec::taffy_style` gives a static transformed element `Position::Relative` (Taffy's containing block for
  absolute boxes; its insets are not applied) and a `fixed` element below a transform `Position::Absolute` (Taffy's `fixed` is always the root);
  `InheritedStyle::inside_transform` carries that down; `stacking::paint_parent` makes the same two choices, so the frames agree. Difference: a `relative`
  element between the transform and a fixed descendant is the fixed element's containing block here, and in CSS it is not.
* **`zIndex`** keeps its React Native meaning (no stacking contexts, plan): a transform does not create one, as it does in CSS.
* **Scrollable overflow** ignores transforms: a child that a transform moves past its container's edge does not extend the container's scroll range.
  (Recorded as a difference from CSS, which counts the transformed box.)

## Everything that reads geometry

| Reader | How it goes through the matrix |
| --- | --- |
| Hit testing (`stacking.rs` `hit_node`) | the point goes through the placement's inverse before the clip and the children; a singular matrix hits nothing, nor anything in it |
| `getRect()` / `node_rect_json` / snapshot `rect` | the bounding box of the drawn border box, as `getBoundingClientRect()` |
| `absolute_geometry` / clips | clips of paint ancestors are the bounding box of the clip rectangle under the ancestors' maps (the engine's own) |
| Focus ring (`render_tree.rs`) | drawn in the element's frame through its map (`canvas_item_add_set_transform`), still clipped by the ancestors' box |
| Selection hit testing, text input pointer and caret, IME position | `Mounted::to_local` / `to_root` (the inverse and the map of `absolute_affine`) |
| On-screen keyboard rect, accessibility bounds | the bounding box |
| Accessibility scroll tracks, scroll thumbs (`scroll_state_json`) | the bounding box of the drawn track and thumb |
| Wheel and pan deltas, thumb drags, momentum | `ScrollLink::frame`: pixels map through the inverse of the container's linear part (a finger moves the content one to one whatever the scale); wheel ticks are a fraction of the container's page, so only their direction maps. Touch slop stays in screen pixels. `touch-action` axes are screen axes |
| Drag auto-scroll | edge bands and velocity are in the container's own frame |
| Drag ghost | the copy is drawn through the source's accumulated map, so a turned card is dragged turned; `ghost.rect` is the box round it |
| `scrollIntoView` and focus reveal | the rectangle is carried up through each container's map as a bounding box |
| Filter and backdrop-filter extents | a group's rectangle is the bounding box of the subtree under the element's map, found in the frame its paint parent locates children in; a backdrop's copy rectangle is the bounding box |

## Sharpness

Godot rasters glyphs at a size. Text, rounded corners (the `StyleBoxFlat` feather) and scroll bar ends are drawn at `Oversampling` (D45) times the scale
the transforms on the element and above it put on it (`transform_state.rs`: the larger column of the accumulated linear map, rounded up to an eighth so that
nearby scales share a glyph cache, never below a quarter). While a transform transition runs on the element or an ancestor nothing is re-recorded and the
raster stays as it was, as a browser's compositor keeps a layer's; when the transition settles, the subtree's text is drawn again at the new scale (one
record per element). A tree with no transform keeps nothing (`TransformRoot::transformed` is empty).

## Rotated and skewed clips

Decision: an `overflow` clip in a frame that a transform rotates or skews (any frame whose accumulated map is not axis aligned: not a translate, a scale, a
mirror or a quarter turn) is drawn as the engine draws it, the bounding box of the rotated rectangle, and one `ERROR` is logged per element, once, naming
the problem and the fix (rotate the content of the clip, not the clip). Hit testing is exact (it clips in the element's own frame); the drawing is not. Not
an honest mask, because the one the engine offers (`clip_children`) has Compatibility's two bits of alpha, no nesting with a filter or another rotated clip,
and an owner that must be its own mask, so a mask built on it would be right in the demo and wrong in an app with a blurred panel or a rounded list inside.
A render target per clipped element (the work `transform-3d-spike` measures) would draw the element's subtree into a texture and draw the texture through the
mask or the matrix; that gives exact rotated clips with 8-bit antialiasing and no nesting rule, and is where this belongs.

## For the 3D work: what the matrix path exposes

`docs/tracks/transforms-3d-feasibility.md` ("What the `transforms` track's matrix path needs to expose") asks for the items below; this is where each is.
`native/transform.rs`, `NodeTransform` (one per transformed element, evaluated for its border box about its origin):

| Asked | Here |
| --- | --- |
| the full 4 x 4 in f64 | `NodeTransform::matrix`, a `Transform3D<f64>` in euclid's row-vector layout; `column_vector_matrix()` gives it row-major acting on column vectors, as CSS and `geometry.mjs` write it |
| a classification `Identity`, `Translate`, `Affine2D`, `Projective` | `TransformClass`, `classify(&matrix)`, `NodeTransform::class()`. `Affine2D` is every matrix without a projective row, a flat 3D rotation included. `evaluate` refuses `Projective` at this one place (and `TransformList::parse` refuses `perspective()` and a projective `matrix3d()` earlier, with the message that says so) |
| `homography()`, the 3 x 3 of the z = 0 plane | `NodeTransform::homography()`: acts on `(x, y, 1)`, third row is the divisor |
| `max_magnification(size)` | `NodeTransform::max_magnification(size)`: the largest singular value of the plane map's Jacobian at the four corners of the box (exact for an affine map); `None` if a corner is behind the eye. The raster scale rule uses the cheaper larger column of the linear part (`Linear2::scale_factor`) |
| the determinant sign | `NodeTransform::determinant_sign()`: the sign of the homography's determinant (`-1` for a mirror or a back face, `0` collapsed). The 2D path hides a collapsed element and draws a mirror |
| `interpolate(from, to, t)` for 3D lists | `TransformList::interpolate`: Stylo's own (`Animate` with `Procedure::Interpolate`), function by function for matching lists, else by decomposing the matrices; transitions already run through it (`StyleEngine`), with `InterpolateMatrix` resolved against the box in `operation_matrix` |

Not exposed: the `preserve-3d` flags (there is no `transform-style` yet, so every element is flat and every element is its own context) and a parent's
`perspective` and `perspective-origin` folded into the matrix (those properties do not exist yet; `perspective()` is refused). The matrix is in the element's
own border-box frame about its origin, which is what the spike's "in the parent's border-box frame" needs once the parent's perspective is applied on top.

Other things a perspective pass needs, and where they are:

* The 2D path flattens each element on its own (z dropped after that element's matrix, before its parent's), which is what `transform-style: flat` does. If a
  perspective element has `flat` children they are flattened into its plane before the projection, so the 2D `Placement` is still right for them inside a
  render target of the perspective element.
* Stylo can hand an animated transform as `InterpolateMatrix`/`AccumulateMatrix` (resolved in `operation_matrix`) and as a `Perspective` operation
  (refused while the style is validated, so never sampled).
* Everything that reads geometry asks `Mounted::absolute_affine` / `absolute_geometry`; a perspective element's bounding box and its point mapping (a
  homogeneous divide) are the two functions to extend. A text raster's scale already comes from one function (`transform_state.rs`, `raster_factor`).

## Against Chrome

`node --import tsx scripts/transform-reference.mjs --render` draws every shape case (`demo/src/transform-data.ts`, `SHAPE_CASES`) as plain HTML with the CSS a
browser developer writes, in headless Chrome through Puppeteer, with the engine's own font, at device pixel ratio 1 (a 1120 x 800 window) and 2 (a 560 x 400
window at twice the pixels, the verifier's content scale of two). The native verifier saves the library's picture of the same case
(`pnpm verify --interaction --only=transforms`, `artifacts/native-interaction/landscape/transforms-<case>-dpr<k>.png`), and `--diff --native=<dir>` compares the
two per channel (`artifacts/transforms-compare/<case>-dpr<k>.png` is Chrome, ours, and their difference times four side by side, with the text left out in
purple; `report.json` has the numbers). A pixel is an *interior* pixel when it is at least a few pixels from any edge of the card and its text, an *edge* pixel
when it is near one; the two are reported apart because the box fill is exact and the edges are two renderers' idea of antialiasing. "worst" is the largest
difference of any pixel in that channel (0 to 255), "typical" the mean over the pixels counted, ">24" the share of them more than 24 levels apart in some channel.
The text is compared by what a pixel comparison cannot hold it to: where the ink is (centroid distance), how much there is (ink ratio) and how many of its pixels
are partly covered (a proxy for sharpness; the last column's figure in brackets is Chrome's).

| case | interior worst (R G B) | interior typical | edge pixels | edge worst (R G B) | edge typical (R G B) | edge > 24 | text: centre offset, ink, partly covered (Chrome) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| identity-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5224 | 31 75 110 | 0.752 1.668 2.039 | 3.216% | 2.15 px, 1.079x, 0.480 (0.482) |
| translate-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5224 | 31 75 110 | 0.752 1.668 2.039 | 3.216% | 2.15 px, 1.079x, 0.480 (0.482) |
| rotate-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5466 | 32 74 108 | 0.749 1.618 1.987 | 3.037% | 2.06 px, 1.071x, 0.646 (0.546) |
| rotate-corner-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5412 | 32 75 110 | 0.750 1.637 2.006 | 3.086% | 2.31 px, 1.073x, 0.661 (0.543) |
| scale-up-dpr1 | 197 167 70 | 0.015 0.013 0.005 | 8000 | 33 75 109 | 0.732 1.657 2.060 | 3.200% | 2.55 px, 1.096x, 0.447 (0.380) |
| scale-down-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 2716 | 30 71 104 | 0.782 1.878 2.140 | 3.682% | 1.63 px, 1.033x, 0.739 (0.646) |
| skew-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5855 | 32 73 106 | 0.946 2.107 2.560 | 2.562% | 2.17 px, 1.065x, 0.584 (0.496) |
| matrix-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5489 | 30 76 110 | 1.116 2.539 3.040 | 2.806% | 2.01 px, 1.066x, 0.587 (0.521) |
| rotate-x-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 4168 | 30 71 104 | 0.783 1.906 2.505 | 2.783% | 2.34 px, 1.073x, 0.518 (0.539) |
| rotate-y-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 4412 | 31 74 107 | 0.909 2.093 2.719 | 2.992% | 1.40 px, 1.098x, 0.557 (0.570) |
| rotate-xyz-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5066 | 31 77 112 | 0.889 2.023 2.578 | 3.158% | 1.90 px, 1.076x, 0.629 (0.614) |
| percent-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5745 | 33 75 109 | 0.708 1.500 1.827 | 2.750% | 2.07 px, 1.072x, 0.643 (0.520) |
| mirror-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5224 | 31 74 110 | 0.749 1.668 2.042 | 3.216% | 2.12 px, 1.082x, 0.480 (0.490) |
| nested-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 6466 | 89 76 110 | 1.078 1.704 1.819 | 3.170% | 1.55 px, 1.058x, 0.531 (0.425) |
| square-rotate-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5696 | 12 29 63 | 0.111 0.438 2.184 | 4.213% | 2.07 px, 1.070x, 0.646 (0.547) |
| square-rotate-x-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 4220 | 1 0 0 | 0.104 0.000 0.000 | 0.000% | 2.34 px, 1.073x, 0.518 (0.539) |
| square-skew-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 6071 | 7 26 59 | 0.110 0.429 2.180 | 4.283% | 2.17 px, 1.065x, 0.584 (0.496) |
| identity-dpr2 | 94 80 33 | 0.001 0.000 0.000 | 10652 | 33 80 116 | 0.762 1.710 2.092 | 3.305% | 2.11 px, 1.081x, 0.342 (0.333) |
| translate-dpr2 | 94 80 33 | 0.001 0.000 0.000 | 10652 | 33 80 116 | 0.762 1.710 2.092 | 3.305% | 2.11 px, 1.081x, 0.342 (0.333) |
| rotate-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12504 | 34 81 118 | 0.694 1.498 1.839 | 2.847% | 2.04 px, 1.068x, 0.481 (0.408) |
| rotate-corner-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12372 | 34 81 118 | 0.692 1.495 1.830 | 2.797% | 2.35 px, 1.072x, 0.494 (0.427) |
| scale-up-dpr2 | 223 189 79 | 0.022 0.019 0.008 | 15988 | 34 84 124 | 0.792 1.797 2.219 | 3.403% | 1.70 px, 1.045x, 0.247 (0.246) |
| scale-down-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 7004 | 32 71 104 | 0.745 1.651 1.988 | 2.856% | 1.10 px, 1.066x, 0.558 (0.448) |
| skew-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 13239 | 34 81 117 | 0.869 1.952 2.370 | 2.372% | 1.48 px, 1.022x, 0.377 (0.322) |
| matrix-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12670 | 33 80 117 | 0.993 2.238 2.726 | 2.447% | 1.40 px, 1.026x, 0.411 (0.367) |
| rotate-x-dpr2 | 93 78 33 | 0.000 0.000 0.000 | 10950 | 34 78 114 | 2.452 5.421 6.416 | 16.183% | 1.99 px, 1.094x, 0.413 (0.404) |
| rotate-y-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 9884 | 33 81 117 | 1.063 2.303 2.828 | 4.836% | 1.70 px, 1.083x, 0.361 (0.447) |
| rotate-xyz-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 13275 | 37 80 117 | 2.438 5.297 5.929 | 10.637% | 1.83 px, 1.083x, 0.415 (0.454) |
| percent-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12989 | 34 81 117 | 0.646 1.403 1.719 | 2.741% | 2.10 px, 1.073x, 0.429 (0.337) |
| mirror-dpr2 | 94 80 33 | 0.001 0.000 0.000 | 10652 | 33 79 115 | 0.757 1.708 2.086 | 3.305% | 2.13 px, 1.081x, 0.342 (0.332) |
| nested-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 14846 | 99 81 119 | 0.965 1.538 1.650 | 2.768% | 1.60 px, 1.059x, 0.371 (0.315) |
| square-rotate-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12973 | 7 18 46 | 0.094 0.381 1.909 | 3.700% | 2.05 px, 1.068x, 0.481 (0.408) |
| square-rotate-x-dpr2 | 93 78 33 | 0.000 0.000 0.000 | 11034 | 16 30 26 | 1.671 3.342 2.954 | 7.685% | 1.99 px, 1.094x, 0.413 (0.404) |
| square-skew-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 13734 | 11 22 42 | 0.093 0.368 1.903 | 3.670% | 1.48 px, 1.022x, 0.377 (0.322) |

How to read it:

* **Interiors are exact** (0 in every channel) in every case but a handful of pixels (`scale-up` 0.017% and 0.013%, `identity` and `translate` at DPR 2 0.001%, and one
  pixel run at the same place in `rotate-x` and `square-rotate-x` at DPR 2). In `scale-up` they are the ends of text ink that stick out past the rectangle left out for the text (the
  white ticks beside the purple in its picture); `identity` and `translate` have a few with no transform to blame.
* **Edges of the rounded cards** are the same in every case as in `identity` (typical 0.75 / 1.67 / 2.04, worst 31 / 75 / 110 in R / G / B): the rounded corners and
  the ring of the border, where `StyleBoxFlat`'s feather and Skia's coverage disagree by a few levels along the arcs. A rotation, a scale, a mirror, a
  skew or a raw matrix adds at most a few tenths to the typical figures (`skew` 0.95 / 2.11 / 2.56, `matrix` 1.12 / 2.54 / 3.04, `rotate-y` 0.91 / 2.09 / 2.72 at DPR 1);
  `nested` has one more bad pixel run in R (89, 99 at DPR 2) at its child's corner, not diagnosed further.
* **Boxes with square corners** (`square-*`, drawn from feathered triangles, `native/square_box.rs`) are closer to Chrome than the rounded cards, because they have
  no arcs: typical 0.11 / 0.44 / 2.18 for `square-rotate` at DPR 1, 0.10 / 0.00 / 0.00 and no pixel beyond 24 for `square-rotate-x` at DPR 1, and 0.09 / 0.38 / 1.91 and
  0.09 / 0.37 / 1.90 at DPR 2 for `square-rotate` and `square-skew`. What is left in the blue channel of the slanted ones is the corner cells (the mesh interpolates the
  product of two edges' coverage linearly across a cell, which is within 0.06 of the true value) and Chrome's own rounding.
* **Text**: the ink is 1.02 to 1.10 times Chrome's (1.08 with no transform at all), its centre is 1.1 to 2.6 px from Chrome's in every case including `identity` (2.15 px with no
  transform, so not the transform's; most likely the font's metrics, not investigated), and the share of partly covered pixels is within 0.11 of Chrome's (ours is the higher
  in the turned and scaled cases). Sharpness under a scale is held by its own check, `Scaled text is as sharp as the same text at its size`, which has a negative control.

### The `rotateX` and `rotateY` edges at device pixel ratio 2

The first comparison had the `rotate-x` and `rotate-xyz` cards' edges at DPR 2 about three times further from Chrome's at their squeezed top and bottom borders than any other
case (typical 2.45 / 5.42 / 6.42 and 2.44 / 5.30 / 5.93, 16.2% and 10.6% beyond 24, against 0.75 / 1.67 / 2.04 for `identity`); the cause was not known and the baseline of
the rounded rectangle was not accepted as the explanation. What was found:

1. **A real defect, in the library.** `StyleBoxFlat` antialiases an edge with one feather length (`anti_aliasing_size`) in the box's own frame, and `Oversampling` sized it for the
   axis a transform stretches most. `rotateX(50deg)` squeezes y to 0.64 and leaves x alone, so the feather is 0.64 of a device pixel across a horizontal edge: the ramp is
   narrower than a pixel and the edge comes out hard, placed by rounding to a pixel row instead of by the share of the row the box covers. A failing check was written first
   (`squeezedEdge`, a box scaled 0.6 on y and moved 0.1 px down, so that its edges fall inside a pixel row): at DPR 2 the top row was covered 1.0 and the bottom row 0.0
   where the box covers 0.8 and 0.2 of them (and the turned-square check below found 0% of the scanlines antialiased).
2. **Fixed exactly for boxes with square corners.** A square box under a transform now draws from triangles whose vertex coverage is a box filter one device pixel wide *on each of
   its own axes* (`Linear2::edge_feather`: the inverse transpose's column for the axis, so a skew is handled as well as a squeeze), with the exact trapezoid for a border thinner than the
   filter. Rows now read 0.90 / 0.10 (0.897 to 0.901) at DPR 1 and 0.802 / 0.198 at DPR 2 (want 0.9 / 0.1 and 0.8 / 0.2) on all three renderers.
3. **Not fixable for a rounded box with the one length `StyleBoxFlat` has.** Sizing the single feather for the squeezed axis (one pixel there) widens it on the stretched axis to
   1.56 px for `rotateX(50deg)`, and that was measured to be worse overall, because Chrome's stretched axis is crisp. Per channel, edge typical R / G / B and share beyond 24 (cards, DPR 1 and 2):

   | case | feather by the larger stretch (kept) | by the geometric mean | by the smaller stretch |
   | --- | --- | --- | --- |
   | rotate-x dpr1 | 0.78 / 1.91 / 2.51, 2.8% | 1.73 / 4.07 / 4.96, 8.8% | 2.64 / 5.70 / 6.67, 14.9% |
   | rotate-y dpr1 | 0.91 / 2.09 / 2.72, 3.0% | 2.18 / 4.75 / 5.82, 3.3% | 3.46 / 7.72 / 9.04, 16.8% |
   | rotate-x dpr2 | 2.45 / 5.42 / 6.42, 16.2% | 2.94 / 6.45 / 7.45, 17.4% | 3.19 / 7.22 / 8.34, 21.8% |
   | rotate-y dpr2 | 1.06 / 2.30 / 2.83, 4.8% | 2.05 / 4.60 / 5.62, 5.1% | 3.20 / 7.15 / 8.54, 17.2% |
   | rotate-xyz dpr2 | 2.44 / 5.30 / 5.93, 10.6% | 2.19 / 4.73 / 5.28, 9.2% | 2.19 / 4.73 / 5.28, 9.2% |

   The squeezed edge rows do get right (the top border of `rotate-x-dpr2`: 1.62 to 0.33 mean difference in its band) and the vertical edges, exact before, are blurred (0 to 4.4), a visible 2 px
   fringe of about two pixels on the long edges of a flipped `rotateY` card. The rounded cards keep the larger-stretch feather (the first column), as before; this is recorded as a limit below.
4. **The rest of the DPR 2 gap is Chrome's.** Chrome rasterises a squeezed layer at one scale and resamples it with bilinear filtering, so its edges are as sharp as the sampling phase
   happens to leave them: in `rotate-x-dpr2` its top border edge is one partly covered row (0.13) and its bottom border's two edges are two partly covered rows each (0.22 and 0.82, 0.84
   and 0.10), which no box filter makes, and its bottom border is 4.98 device pixels thick where its top one is 5.12 and the exact projection (8 x cos 50) is 5.14, which is what the library draws
   (5.13). At DPR 1 the bottom edge probed (`rotate-x-dpr1`, column 270) is one partly covered row. The square-cornered `square-rotate-x` card matches Chrome's top edge to within 2 levels (rows 242 to 248),
   and its bottom edge's last row to 5; it is 21 to 30 levels away in the three rows where Chrome smears (391, 392, 396), and its remaining 1.67 / 3.34 / 2.95 (7.7% beyond 24, against
   2.45 / 5.42 / 6.42 and 16.2% for the rounded card) is that.

So: the cause is established and is two things, the library's (one feather length, fixed where the library draws the box itself) and the reference's (a bilinear resample, which an exact renderer
cannot and should not reproduce). The way to fix the rounded corners too is a feather per axis in the one place that draws a rounded box (`utilities-paint`'s `box_mesh`, see the note in the report).

### Turned square corners

`StyleBoxFlat` turns antialiasing on only for a box with a rounded corner or a skew (`scene/resources/style_box_flat.cpp:474`, Breaka's tree: `aa_on = (rounded_corners || !skew.is_zero_approx()) && anti_aliased`,
stock 4.7.2's source is not on this machine to compare), so a plain square (`rotate-45` on a `View`) drew a staircase. A failing check came first (`turnedSquare`:
the share of scanlines across a 30 degree edge that show a partly covered pixel was 0% at DPR 1 and 2) and the fix is the same triangles; 94.5% and 92.8% now, with the check at 85%. Not
done by giving the box a near-zero radius or skew, which would have turned on `StyleBoxFlat`'s antialiasing at the price of its unscaled feather and a constant nobody could justify. `square_box.rs`
follows the feathered-mesh convention of `utilities-paint`'s `box_mesh` (per-vertex coverage alpha, a one device pixel feather centred on the true edge) and does not depend on it landing; when it
does, the two should be one drawer (see the report).

### The transitions

Chrome's matrix (`getComputedStyle().transform`) is recorded at 21 fractions of each transition (`TRANSITION_SAMPLES`, steps of 0.05; `GOLDEN_TRANSITION_MATRICES`), and the verifier compares the library's
matrix, read from the snapshot's `transitions` records on every frame the animation runs (136 to 182 samples a case), with the golden ones linearly interpolated to that frame's progress. `worstMatrix` is the largest
difference of any of the four linear numbers and `worstOffsetPx` of the two translation terms. The figures agree across Compatibility, Mobile and Forward+ to the fourth place.

| case | from, to | worstMatrix | worstOffsetPx |
| --- | --- | --- | --- |
| rotate | `rotate(0deg)`, `rotate(90deg)` | 0.00077 | 0.096 |
| scale | `scale(1)`, `scale(1.8)` | 0 | 0 |
| mismatch | `rotate(30deg)`, `translateX(40%) scale(1.5)`: lists that do not match, with a percentage, which Stylo resolves by decomposing the matrices (`InterpolateMatrix`) | 0.00019 | 0.026 |
| tailwind | `-translate-x-1/2 scale-110` as Tailwind composes it (`transformParts`) | 0 | 0 |

The `rotate` figure is the golden's own resolution, not the library's error: a chord of 4.5 degrees (one 0.05 step of 90) is off the arc by (0.0785 rad)^2 / 8 = 0.00077, which is the number; `mismatch` is the same effect on a smaller
swing. The library agrees with Chrome at every sampled fraction to within that.

### Negative controls

`pnpm build:native --faults` builds the library with the faults of `native/filter_faults.rs` compiled in (cargo feature `filter-faults`), and `pnpm verify --interaction --only=transforms-faults --faults --no-retry`
runs each control's check with its fault off (it must pass) and on (it must fail with its own message). Then `pnpm build:native` for the default library.

All seven controls died (each check passes with its fault off and fails with it on, with its own message), landscape; portrait skips the retina one (the window has no room for a content scale of two):

| fault | what it removes | the check that dies, and what it says |
| --- | --- | --- |
| `transform-hit-flat` | hit testing through the inverse of the matrix | the turned bar: `The turned bar is hit at its own point 3,3 (drawn at 179.84,82.85)` |
| `transform-rect-unbounded` | `getRect()` as the bounding box of the transformed border box | `rotate (fault): the card's rectangle is the box round it: {... width 220, height 120} is 52.85 px from Chrome's {... width 243.56 ...}` |
| `transform-ring-flat` | the focus ring turning with the element | `The focus ring turns with the bar: its own edge point 110,1 (drawn at 273.5,134.62) is 4f46e5, not the ring` |
| `transform-raster-unscaled` | text rasterised at the scale a transform puts on it | `Scaled text is as sharp as the same text at its size (fault): 0.621 partly covered against 0.332` |
| `transform-feather-uniform` | a square box's feather per axis (one length for both, sized by the stretched axis) | at DPR 2: `A squeezed box's top edge is antialiased: row 400 is covered 1 where the box covers 0.8 of it; ... bottom edge: row 520 is covered 0 where the box covers 0.2` |
| `transform-squares-hard` | the feathered triangles of a square box (back to `StyleBoxFlat`) | `A square box turned 30 degrees has antialiased edges (dpr1): 0% of the scanlines across its left edge show a partly covered pixel` |
| `transform-no-containing-block` | a transformed element as the containing block of `absolute` and `fixed` children | `contain-absolute is placed in its transformed parent's frame (150,120), as CSS does: 10,10` |

The first run of the section did not hold four controls, for reasons in the harness and not the library, both fixed: a control ran its check twice on a page that stayed mounted, so the second run
was the first's picture and focus (`showCase` now leaves for another case and comes back when it is asked for the one on screen), and the containing-block page's parent was `position: absolute`, which is a
containing block with or without a transform (it is now a static element placed by margins).

### Renderers

`pnpm verify --interaction --only=transforms --renderer=mobile` and `--renderer=forward_plus`, once each, landscape and portrait: both pass (Mobile 5543 and 3789 checks, Forward+ 5545 and 3775, landscape and portrait; Compatibility 5139 and 3425), the squeezed-edge
rows, the turned square, the transitions and the controlled geometry read the same numbers as on Compatibility. The Web and stock engine runs are the coordinator's.

### Limits

* Rounded corners under a transform that squeezes one axis keep one feather length (see above): exact on the stretched axis, down to 0.6 of a pixel on the squeezed one at `scaleY(0.6)` (rows 1.0 / 0.0 against 0.9 / 0.1 at DPR 1 and 0.8 / 0.2 at DPR 2; the verifier logs them as `squeezedRoundedEdge` and does not assert them).
  A turn or a uniform scale is exact.
* The focus ring of a turned or scaled element is a `StyleBoxFlat` stroke drawn through the element's map; it is as antialiased as that is (rounded: one length; square: hard).
* A box is drawn from the triangles only when its corners are square; its border has one colour and one width on all four sides (the rest of the library's boxes do not have more).
* A square box thinner than one device pixel on an axis (an edge-on card) reads the share it covers, not a full pixel.
* The blur radius of a `filter` is in the element's own frame and is not scaled by a transform on it; the backdrop and filter *extents* are.
* A `relative` element between a transform and a `fixed` descendant is the descendant's containing block here, and in CSS it is not. Scrollable overflow ignores transforms. `touch-action` axes are screen axes.
* When a transform transition settles the subtree's text and rounded corners are drawn again at the new scale (one record per element, a cost proportional to the subtree).
* IME placement under a transform goes through the same `Mounted::to_local` / `to_root` as the caret and the pointer; no IME was run to see it.

### Review of `8721e7b` as far as it touches the transforms

`starting:` (the `Starting` pseudo state, `StyleChange::starting`, `sync_gained_transitions`) feeds Stylo the starting style first and the resting style on top, so a `transformParts` and a `transform` in a `starting:` layer
animate through the same path as any other transition (the mismatched-list resolution included); the unit test `transforms_transition_with_opacity_background_and_height_and_ping_pong_in_a_loop` and the `combined`, `loop`
and `starting` pages pass on all three renderers in both windows. Nothing wrong found in code that touches the transforms. Two things for whoever owns those pages: their checks are bounded by wall-clock windows
(`Date.now()` against 800 to 950 ms, around 400 ms transitions), which a starved host can miss without anything being wrong, and the lab's `Flip` button lost its `font-medium`.

## README text

> ### Transforms
>
> `transform` and `transformOrigin` take CSS text (Stylo parses and validates it, so units, `calc()` and every syntax rule are the browser's), and Tailwind's `translate-*`, `rotate-*`, `skew-*`, `scale-*`, `origin-*` and
> `transform` utilities compose across variants as they do in Tailwind 3.4. An element is moved by giving its canvas item the matrix, so layout is untouched and nothing is re-recorded; hit testing, `getRect()` (the bounding
> box, as `getBoundingClientRect()`), the focus ring, text selection and the text input caret, wheel and touch scrolling, drag and its ghost, accessibility bounds, filter extents and `scrollIntoView` all go through it.
> Transitions and `starting:` animate the matrix with Stylo's own interpolation, matching lists function by function and others by decomposition, and agree with Chrome's to a fraction of a pixel. Text and rounded corners
> are rasterised at the scale the transforms put on them once an animation settles. A transformed element is the containing block of its `absolute` and `fixed` descendants, as in CSS.
>
> What is not built: `perspective` (refused with a message that says so) and `transform-style: preserve-3d`; `rotateX` and `rotateY` are drawn flattened, as CSS draws them with no perspective. **Rotated and skewed `overflow` clips
> are not exact**: Godot's clips are axis-aligned rectangles, so an `overflow` clip under a rotation or a skew is drawn as the box round the rotated rectangle and the library logs one `ERROR` per element saying so (hit testing is
> exact). Translate, scale, mirror and quarter-turn clips are exact; rotate the content of the clip, not the clip. An exact rotated clip needs a render target per clipped element, which is the work `transform-3d-spike` measures.
> Under a transform that squeezes one axis, a rounded corner's antialiasing is exact on the stretched axis and up to 40% narrow on the squeezed one; boxes with square corners are exact on both.

The matrix path exposes everything `docs/tracks/transforms-3d-feasibility.md` asks for except the two items that need properties that do not exist yet (see "For the 3D work"): the 4 x 4 in f64, the classification, the homography,
the largest magnification, the determinant sign and `interpolate`; not the `preserve-3d` flags nor a parent's `perspective`.
