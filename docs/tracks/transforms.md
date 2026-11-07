# Track: CSS transforms (batch of 2026-11-07)

Branch `transforms`, based on main `d282fee`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md`
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

## For `transform-3d-spike`

* `native/transform.rs` keeps the 4 x 4 (`NodeTransform::matrix`, the full matrix about the origin, perspective row included if it ever were non-trivial).
  `evaluate` refuses a projective matrix today (`is_projective`: any of `m14`, `m24`, `m34`, `m44 != 1`) and `TransformList::parse` refuses `perspective()`; a
  perspective pass removes those two checks, reads `NodeTransform::matrix`, and decides per element whether to draw through the 2D `Placement` (no W) or
  into a render target.
* The 2D path flattens each element on its own (z dropped after that element's matrix, before its parent's), which is what `transform-style: flat` does. If a
  perspective element has `flat` children they are flattened into its plane before the projection, so the 2D `Placement` is still right for them inside a
  render target of the perspective element.
* Stylo can hand an animated transform as `InterpolateMatrix`/`AccumulateMatrix` (resolved in `operation_matrix`) and as a `Perspective` operation
  (refused while the style is validated, so never sampled).
* Everything that reads geometry asks `Mounted::absolute_affine` / `absolute_geometry`; a perspective element's bounding box and its point mapping (a
  homogeneous divide) are the two functions to extend.

## Against Chrome

(To be filled in: see the report.)

## README text

(To be filled in.)
