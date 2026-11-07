# Track: one mesh path for boxes under a transform (batch of 2026-11-08)

Branch `box-mesh`, from main `cbf8407`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are not
edited here (the paragraph for the README is at the end).

## What was wrong

`docs/tracks/transforms.md` ("The `rotateX` and `rotateY` edges at device pixel ratio 2") recorded the cause: `StyleBoxFlat` antialiases an edge with one length
(`anti_aliasing_size`), `Oversampling` sizes it for the axis a transform stretches most, and a rounded box under `rotateX(50deg)` (y squeezed to 0.64) has a
ramp 0.64 of a pixel across its horizontal edges, which comes out hard. Boxes with square corners had been moved to feathered triangles with a feather per box
axis (`native/square_box.rs`); rounded boxes had not, because the one place that meshes a rounded box (`native/box_mesh.rs`, written for gradient fills) had one
feather length too.

## What changed

* `native/box_mesh.rs` is the one drawer of a box that `StyleBoxFlat` does not draw: a `Feather` (below) instead of one length, `fill`, `ring` (a border, any
  widths per side, any corners) and `fill_under_ring`, for square and rounded shapes. `native/square_box.rs` is gone.
* `box_paint::draw_box` draws every box under a map that is more than a move from `box_mesh`: the plain case (`box_draw::plain`: the fill, then the ring over
  it), and the layered cases (a gradient, an inset shadow) through the same `box_draw::solid`, `gradient` and `ring`, now taking the shape's feather.
  A box on the pixel grid is drawn as it was: `StyleBoxFlat` for a plain box, the mesh with a one device pixel feather where it was a mesh already.
* `Raster::soften_squares` is `Raster::mesh_boxes`, `Raster::edge_feather` a `Feather`; `BoxKey::square_feather` is `BoxKey::feather`, and it is no longer cleared
  for a rounded box. `Linear2::edge_feather` is `Linear2::edge_axes`.
* `RRect::outline` takes the growth as a function of the edge's normal, so an arc's feather turns from the one of an axis to the one of the other.
* The fault `transform-squares-hard` is `transform-boxes-hard` (it puts every box back on `StyleBoxFlat`, no longer only squares); `transform-feather-uniform` is
  the feather of one length for every meshed box.

## Design and decisions

**B1. Under a map that is more than a move, every box is a mesh; on the pixel grid nothing changes.** `Raster::mesh_boxes` is `linear != IDENTITY`, as `soften_squares`
was, so a plain translation stays on `StyleBoxFlat` and an untransformed tree costs nothing (`TransformRoot::transformed` is empty, `node_box_feather` returns `None`
before it looks at a node). `docs/tracks/hidpi.md` H4 sets the rule the grid keeps: a rounded `StyleBoxFlat` with `set_aa_size(1 / level)` matches a Godot `Panel` pixel for
pixel at scale 2 (the `hidpi` section checks it against one), and a square box keeps `Oversampling::NONE` and hard edges. Meshing the untransformed case would have given
up that parity for nothing, so `BoxShape::feather_of` returns what it returned before when there is no feather (one device pixel for a rounded shape, none for a square one).

**B2. The feather is two vectors, not two lengths.** An edge whose unit normal is `n` is seen across `L^-T n` after the map `L`, so one device pixel is `|L^-T n|` long across
it in the box's own frame. The columns of `L^-T` (`Linear2::edge_axes`) for the box's x and y axes are the feather across a vertical and a horizontal edge, as before (their lengths are
what `Linear2::edge_feather` returned); an arc, whose normal turns from one axis to the other, takes the blend of the two. Lengths alone cannot say what a skew does to that blend (the
axes lean towards each other), so `box_mesh::Feather` keeps the vectors (`Feather::along(nx, ny)`). Measured against supersampled pixel coverage of a rounded fill (unit tests,
`a_skew_leans_the_feather_round_an_arc`): under `skewX(-18deg) skewY(6deg)` the mean error over edge pixels is 0.0084 with the vectors, 0.0093 with the two lengths and 0.0101 with one length, the worst
0.053, 0.069 and 0.067; under `rotateX(50deg)` the vectors read 0.012 and 0.054 against 0.080 and 0.19 for one length. A rotation, a uniform scale, `rotateX` and `rotateY` have axes at right angles, where the two are the same.

**B3. A rectangle with square corners is a grid, anything with a rounded corner is loops.** Coverage of a rectangle is the product of its span on x and its span on y, which is
piecewise linear on each axis; the mesh is the grid of the lines where it bends, with the coverage computed exactly at each vertex. That is what `square_box.rs` did and what gave the square
rows 0.90 / 0.10 (DPR 1) and 0.802 / 0.198 (DPR 2), so it moved over unchanged (`grid`, `grid_under_ring`) and its tests with it. A shape with a rounded corner is a fan inside a strip, as
the gradient fill was: the outline moved in by half the feather (alpha 1) and out by half of it (alpha 0), every vertex along its own normal by the feather of that normal
(`RRect::outline` takes the amount as a function of the normal). A square corner of a box that has a rounded one is one vertex moved diagonally by the feather of each axis: the corner
point reads 0.5 where a box filter reads 0.25, which is what the gradient fill's mesh did there before (the lab has no such box; it is recorded under the limits).
A rounded shape thinner than its feather would cross its own inner loop; the loop stops at the shape's middle line and carries the share of the feather the shape is thick
(`inner_loop`, `peak`), so a hairline pill reads the share of a pixel it covers rather than a whole one, as a triangle across it (a little less ink than the rectangle's trapezoid).

**B4. A border is four loops, and a border thinner than the feather swaps the middle two.** Outside the outer edge (alpha 0), inside it (alpha 1), outside the inner edge towards the ring
(alpha 1), inside the hole (alpha 0). Across a ring thinner than the feather the two edges' ramps overlap, and coverage is a trapezoid that peaks at the ring's thickness over the
feather; the two middle loops then trade places and carry that peak as their alpha, so the straight edges are exact. Thickness is measured per vertex pair, along the line from the outer
outline's vertex to the inner one's, so a ring of unequal widths round a rounded corner (an elliptical inner curve) is thick on one side and thin on another and the strip follows.
Per-side widths go through the same function: `padding_box` is what `BoxShape` already computed for the masks. The fill under an opaque border stops under the ring's inner edge
(`fill_under_ring`, the `under_border` of `square_box.rs`, now for rounded boxes too): a fan over the inner outline moved out by half a feather with no feather of its own, so nothing of
the fill's colour fringes the border's outer edge; with a side thinner than the feather it is feathered like any fill.

**B5. A latent bug of `square_box::ring` was fixed on the way.** Read from its source, not reproduced on screen: it returned the whole box (`fill(outer)`) when the thinnest of the four
sides had no width, so a transformed square box with only a bottom border was painted entirely in the border colour. The coverage of the ring is the outer shape's less the inner one's, which is nothing along an edge the
two share, so no special case is needed and none is left (`a_side_with_no_border_has_no_ring`). `under_border` checked only the top and left widths against the feather and let the fill leak
past a thin right or bottom one; `grid_under_ring` checks all four.

**B6. What stays as it was.** A border whose sides differ in colour is cut from baked masks (`box_draw::border`, `Shape::Side`); a mask has one texel-wide feather in the box's own frame,
which is a device pixel on the stretched axis (the texture is baked at `Oversampling`) and a fraction of one on the squeezed one, as `StyleBoxFlat` was. The same goes for an `outline`, a
`box-shadow` ring, and the focus ring (a `StyleBoxFlat` stroke), all drawn at the stretched axis' scale. Blurred shadows are unaffected, a blur being much wider than a pixel.

## Against Chrome

The comparison is the transforms track's, unchanged (`docs/tracks/transforms.md`, "Against Chrome"): `node --import tsx scripts/transform-reference.mjs --render` draws every shape case as plain
HTML in headless Chrome at device pixel ratios 1 and 2, `pnpm verify --interaction --only=transforms` saves the library's picture of the same cases
(`artifacts/native-interaction/landscape/transforms-<case>-dpr<k>.png`), and `--diff --native=<dir>` compares them per channel. "Edge pixels" are those within a pixel of a step of more than 8 levels in Chrome's picture,
text is left out; the columns are the number of edge pixels, the mean difference per channel (R / G / B, of 255), the largest, and the share of edge pixels more than 24 levels apart in some channel.
**Before** is this branch's base (`cbf8407`) built and run the same way: it reproduces the transforms notes' table to the digit (`rotate-x-dpr2` 2.452 / 5.421 / 6.416 and 16.183%), so nothing else moved since.
**After** is this branch. The interiors are exact in both (0 in every channel but the few pixels the transforms notes explain) and the text figures did not move, so the table is the edge comparison, for all 34 cases; the full report of each (every column of the transforms notes'
table) is further down, and the side-by-side pictures (Chrome, library, and their difference times four) are in `artifacts/box-mesh-after/compare/<case>.png`, `artifacts/box-mesh-before/compare/` for the base.

| case | edge pixels | edge typical R / G / B before | after | edge worst before | after | > 24 before | after |
| --- | --- | --- | --- | --- | --- | --- | --- |
| identity-dpr1 | 5224 → 5224 | 0.75 / 1.67 / 2.04 | 0.75 / 1.67 / 2.04 | 31 75 110 | 31 75 110 | 3.22% | 3.22% |
| translate-dpr1 | 5224 → 5224 | 0.75 / 1.67 / 2.04 | 0.75 / 1.67 / 2.04 | 31 75 110 | 31 75 110 | 3.22% | 3.22% |
| rotate-dpr1 | 5466 → 5466 | 0.75 / 1.62 / 1.99 | 0.09 / 0.11 / 0.13 | 32 74 108 | 2 5 6 | 3.04% | 0.00% |
| rotate-corner-dpr1 | 5412 → 5412 | 0.75 / 1.64 / 2.01 | 0.08 / 0.11 / 0.13 | 32 75 110 | 2 5 7 | 3.09% | 0.00% |
| scale-up-dpr1 | 8000 → 8000 | 0.73 / 1.66 / 2.06 | 0.03 / 0.07 / 0.09 | 33 75 109 | 2 4 6 | 3.20% | 0.00% |
| scale-down-dpr1 | 2716 → 2716 | 0.78 / 1.88 / 2.14 | 0.03 / 0.19 / 0.10 | 30 71 104 | 3 4 7 | 3.68% | 0.00% |
| skew-dpr1 | 5855 → 5855 | 0.95 / 2.11 / 2.56 | 0.08 / 0.09 / 0.11 | 32 73 106 | 2 4 6 | 2.56% | 0.00% |
| matrix-dpr1 | 5489 → 5489 | 1.12 / 2.54 / 3.04 | 0.08 / 0.09 / 0.13 | 30 76 110 | 2 4 6 | 2.81% | 0.00% |
| rotate-x-dpr1 | 4168 → 4168 | 0.78 / 1.91 / 2.50 | 0.19 / 0.23 / 0.28 | 30 71 104 | 7 16 22 | 2.78% | 0.00% |
| rotate-y-dpr1 | 4412 → 4412 | 0.91 / 2.09 / 2.72 | 0.45 / 0.90 / 0.95 | 31 74 107 | 11 27 40 | 2.99% | 0.27% |
| rotate-xyz-dpr1 | 5066 → 5066 | 0.89 / 2.02 / 2.58 | 0.50 / 1.03 / 1.13 | 31 77 112 | 15 35 50 | 3.16% | 0.81% |
| percent-dpr1 | 5745 → 5745 | 0.71 / 1.50 / 1.83 | 0.08 / 0.12 / 0.14 | 33 75 109 | 2 4 6 | 2.75% | 0.00% |
| mirror-dpr1 | 5224 → 5224 | 0.75 / 1.67 / 2.04 | 0.04 / 0.09 / 0.11 | 31 74 110 | 2 5 7 | 3.22% | 0.00% |
| nested-dpr1 | 6466 → 6466 | 1.08 / 1.70 / 1.82 | 0.10 / 0.12 / 0.13 | 89 76 110 | 7 5 7 | 3.17% | 0.00% |
| square-rotate-dpr1 | 5696 → 5696 | 0.11 / 0.44 / 2.18 | 0.11 / 0.44 / 2.18 | 12 29 63 | 12 29 63 | 4.21% | 4.21% |
| square-rotate-x-dpr1 | 4220 → 4220 | 0.10 / 0.00 / 0.00 | 0.10 / 0.00 / 0.00 | 1 0 0 | 1 0 0 | 0.00% | 0.00% |
| square-skew-dpr1 | 6071 → 6071 | 0.11 / 0.43 / 2.18 | 0.11 / 0.43 / 2.18 | 7 26 59 | 7 26 59 | 4.28% | 4.28% |
| identity-dpr2 | 10652 → 10652 | 0.76 / 1.71 / 2.09 | 0.76 / 1.71 / 2.09 | 33 80 116 | 33 80 116 | 3.30% | 3.30% |
| translate-dpr2 | 10652 → 10652 | 0.76 / 1.71 / 2.09 | 0.76 / 1.71 / 2.09 | 33 80 116 | 33 80 116 | 3.30% | 3.30% |
| rotate-dpr2 | 12505 → 12505 | 0.69 / 1.50 / 1.84 | 0.08 / 0.11 / 0.13 | 34 81 118 | 2 5 6 | 2.85% | 0.00% |
| rotate-corner-dpr2 | 12372 → 12372 | 0.69 / 1.49 / 1.83 | 0.07 / 0.09 / 0.11 | 34 81 118 | 2 4 6 | 2.80% | 0.00% |
| scale-up-dpr2 | 15988 → 15988 | 0.79 / 1.80 / 2.22 | 0.03 / 0.06 / 0.08 | 34 84 124 | 3 4 6 | 3.40% | 0.00% |
| scale-down-dpr2 | 7004 → 7004 | 0.74 / 1.65 / 1.99 | 0.03 / 0.07 / 0.18 | 32 71 104 | 2 4 6 | 2.86% | 0.00% |
| skew-dpr2 | 13237 → 13237 | 0.87 / 1.95 / 2.37 | 0.07 / 0.08 / 0.08 | 34 81 117 | 2 4 5 | 2.37% | 0.00% |
| matrix-dpr2 | 12670 → 12670 | 0.99 / 2.24 / 2.71 | 0.06 / 0.07 / 0.09 | 33 80 117 | 2 4 5 | 2.45% | 0.00% |
| rotate-x-dpr2 | 10950 → 10950 | 2.45 / 5.42 / 6.42 | 1.61 / 3.43 / 3.76 | 34 78 114 | 16 32 47 | 16.18% | 10.82% |
| rotate-y-dpr2 | 9884 → 9884 | 1.06 / 2.30 / 2.83 | 0.52 / 1.16 / 1.40 | 33 81 117 | 16 38 54 | 4.88% | 2.53% |
| rotate-xyz-dpr2 | 13275 → 13275 | 2.44 / 5.30 / 5.93 | 1.86 / 3.98 / 4.35 | 37 80 117 | 18 39 57 | 10.64% | 7.71% |
| percent-dpr2 | 12988 → 12988 | 0.65 / 1.40 / 1.72 | 0.06 / 0.08 / 0.09 | 34 81 117 | 2 4 5 | 2.74% | 0.00% |
| mirror-dpr2 | 10652 → 10652 | 0.76 / 1.71 / 2.09 | 0.03 / 0.07 / 0.08 | 33 79 115 | 2 4 6 | 3.30% | 0.00% |
| nested-dpr2 | 14846 → 14846 | 0.97 / 1.54 / 1.65 | 0.09 / 0.10 / 0.11 | 99 81 119 | 5 5 6 | 2.77% | 0.00% |
| square-rotate-dpr2 | 12973 → 12973 | 0.09 / 0.38 / 1.91 | 0.09 / 0.38 / 1.91 | 7 18 46 | 7 18 46 | 3.70% | 3.70% |
| square-rotate-x-dpr2 | 11034 → 11034 | 1.67 / 3.34 / 2.95 | 1.67 / 3.34 / 2.95 | 16 30 26 | 16 30 26 | 7.69% | 7.69% |
| square-skew-dpr2 | 13734 → 13734 | 0.09 / 0.37 / 1.90 | 0.09 / 0.37 / 1.90 | 11 22 42 | 11 22 42 | 3.67% | 3.67% |

How to read it:

* **The rounded cards, turned, scaled, mirrored, skewed or given a raw matrix, are within a few levels of Chrome's everywhere**: typical 0.03 to 0.19 where they were 0.7 to 3.0, worst 2 to 7 where it was 30 to 110, and not one pixel beyond
  24 levels where 2.4% to 3.7% were. The remaining arcs and borders had been two renderers' idea of antialiasing (`StyleBoxFlat`'s feather against Skia's coverage); the mesh's alpha is the coverage of a one pixel filter across the true
  outline, which is Skia's. Untransformed (`identity`) and translated cards are on `StyleBoxFlat` as before and read what they read (0.75 / 1.67 / 2.04): the hidpi section holds that path to a Godot `Panel`'s pixels.
* **`rotate-x`, `rotate-y` and `rotate-xyz` are the cases the track was about.** At DPR 2 `rotate-x` goes from 2.45 / 5.42 / 6.42 and 16.2% to 1.61 / 3.43 / 3.76 and 10.8%, `rotate-xyz` from 2.44 / 5.30 / 5.93 to 1.86 / 3.98 / 4.35, `rotate-y`
  from 1.06 / 2.30 / 2.83 to 0.52 / 1.16 / 1.40, and at DPR 1 `rotate-x` goes from 0.78 / 1.91 / 2.50 to 0.19 / 0.23 / 0.28. What is left is Chrome's, as the transforms notes found for the square card (`square-rotate-x-dpr2` is 1.67 / 3.34 / 2.95 and
  7.7%, unchanged here): Chrome rasterises a squeezed layer once and resamples it bilinearly, so its edges are as sharp as the sampling phase happens to leave them. Down the middle of `rotate-x-dpr2` (column 520) the top edge reads, in blue,
  Chrome 252 252 **220** 9 9 9 9 11, before 252 252 **252** 9 9 9 9 9 (no antialiased row: the defect), after 252 252 **220** 9 9 9 9 9 137 (Chrome's row to the level); the bottom edge reads Chrome 111 33 9 9 9 44 228 252 and after 137 9 9 9 9 220 252, where Chrome has smeared
  one edge over two rows. In `rotate-y-dpr2` across a row, the left edge reads Chrome 252 252 123 9, after 252 252 123 9, and the right edge Chrome 132 68 9 ... 9 155 252, after 138 61 9 ... 9 123 252.
* **The square-cornered cards (`square-*`) are the same to the digit**, which is the requirement: the grid carries over unchanged. They are further from Chrome than the rounded ones at DPR 1 in blue (2.18 against 0.13 for `rotate`):
  Chrome antialiases a turned plain rectangle by area (a smoothstep across the edge, up to 1.4 pixels wide on a diagonal) and a rounded rectangle by distance (a linear ramp one pixel wide), and the mesh's ramp is the second in both.
  Making the straight edges of a turned square an area ramp is a separate change.

The after table in the transforms notes' shape (every column, DPR 1 and 2):

| case | interior worst (R G B) | interior typical | edge pixels | edge worst (R G B) | edge typical (R G B) | edge > 24 | text: centre offset, ink, partly covered (Chrome) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| identity-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5224 | 31 75 110 | 0.752 1.668 2.039 | 3.216% | 2.15 px, 1.079x, 0.480 (0.482) |
| translate-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5224 | 31 75 110 | 0.752 1.668 2.039 | 3.216% | 2.15 px, 1.079x, 0.480 (0.482) |
| rotate-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5466 | 2 5 6 | 0.087 0.113 0.128 | 0.000% | 2.06 px, 1.071x, 0.646 (0.546) |
| rotate-corner-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5412 | 2 5 7 | 0.080 0.108 0.131 | 0.000% | 2.31 px, 1.073x, 0.661 (0.543) |
| scale-up-dpr1 | 209 177 74 | 0.015 0.013 0.005 | 8000 | 2 4 6 | 0.030 0.068 0.092 | 0.000% | 2.59 px, 1.096x, 0.378 (0.380) |
| scale-down-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 2716 | 3 4 7 | 0.032 0.191 0.102 | 0.000% | 1.61 px, 1.028x, 0.762 (0.646) |
| skew-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5855 | 2 4 6 | 0.078 0.086 0.112 | 0.000% | 2.20 px, 1.066x, 0.571 (0.496) |
| matrix-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5489 | 2 4 6 | 0.076 0.091 0.126 | 0.000% | 2.02 px, 1.066x, 0.591 (0.521) |
| rotate-x-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 4168 | 7 16 22 | 0.191 0.232 0.284 | 0.000% | 2.34 px, 1.073x, 0.518 (0.539) |
| rotate-y-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 4412 | 11 27 40 | 0.448 0.897 0.946 | 0.272% | 1.40 px, 1.098x, 0.557 (0.570) |
| rotate-xyz-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5066 | 15 35 50 | 0.496 1.031 1.130 | 0.809% | 1.90 px, 1.076x, 0.629 (0.614) |
| percent-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5745 | 2 4 6 | 0.083 0.117 0.139 | 0.000% | 2.07 px, 1.072x, 0.643 (0.520) |
| mirror-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5224 | 2 5 7 | 0.037 0.086 0.115 | 0.000% | 2.12 px, 1.082x, 0.480 (0.490) |
| nested-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 6466 | 7 5 7 | 0.105 0.116 0.132 | 0.000% | 1.56 px, 1.059x, 0.531 (0.425) |
| square-rotate-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 5696 | 12 29 63 | 0.110 0.438 2.184 | 4.213% | 2.07 px, 1.070x, 0.646 (0.547) |
| square-rotate-x-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 4220 | 1 0 0 | 0.104 0.000 0.000 | 0.000% | 2.34 px, 1.073x, 0.518 (0.539) |
| square-skew-dpr1 | 0 0 0 | 0.000 0.000 0.000 | 6071 | 7 26 59 | 0.110 0.429 2.180 | 4.283% | 2.20 px, 1.066x, 0.571 (0.496) |
| identity-dpr2 | 94 80 33 | 0.001 0.000 0.000 | 10652 | 33 80 116 | 0.762 1.710 2.092 | 3.305% | 2.11 px, 1.081x, 0.342 (0.333) |
| translate-dpr2 | 94 80 33 | 0.001 0.000 0.000 | 10652 | 33 80 116 | 0.762 1.710 2.092 | 3.305% | 2.11 px, 1.081x, 0.342 (0.333) |
| rotate-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12505 | 2 5 6 | 0.077 0.107 0.131 | 0.000% | 2.04 px, 1.068x, 0.481 (0.408) |
| rotate-corner-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12372 | 2 4 6 | 0.067 0.089 0.108 | 0.000% | 2.35 px, 1.072x, 0.494 (0.427) |
| scale-up-dpr2 | 223 189 79 | 0.022 0.019 0.008 | 15988 | 3 4 6 | 0.030 0.063 0.083 | 0.000% | 1.70 px, 1.045x, 0.247 (0.246) |
| scale-down-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 7004 | 2 4 6 | 0.029 0.069 0.185 | 0.000% | 1.13 px, 1.061x, 0.520 (0.448) |
| skew-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 13237 | 2 4 5 | 0.068 0.078 0.084 | 0.000% | 1.49 px, 1.022x, 0.378 (0.322) |
| matrix-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12670 | 2 4 5 | 0.057 0.073 0.088 | 0.000% | 1.43 px, 1.025x, 0.415 (0.367) |
| rotate-x-dpr2 | 93 78 33 | 0.000 0.000 0.000 | 10950 | 16 32 47 | 1.609 3.432 3.764 | 10.822% | 1.99 px, 1.094x, 0.413 (0.404) |
| rotate-y-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 9884 | 16 38 54 | 0.517 1.156 1.405 | 2.529% | 1.70 px, 1.083x, 0.361 (0.447) |
| rotate-xyz-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 13275 | 18 39 57 | 1.856 3.984 4.352 | 7.714% | 1.83 px, 1.083x, 0.415 (0.454) |
| percent-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12988 | 2 4 5 | 0.061 0.077 0.090 | 0.000% | 2.10 px, 1.073x, 0.429 (0.337) |
| mirror-dpr2 | 94 80 33 | 0.001 0.000 0.000 | 10652 | 2 4 6 | 0.028 0.066 0.081 | 0.000% | 2.13 px, 1.081x, 0.342 (0.332) |
| nested-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 14846 | 5 5 6 | 0.087 0.097 0.110 | 0.000% | 1.61 px, 1.060x, 0.371 (0.315) |
| square-rotate-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 12973 | 7 18 46 | 0.094 0.381 1.909 | 3.700% | 2.05 px, 1.068x, 0.481 (0.408) |
| square-rotate-x-dpr2 | 93 78 33 | 0.000 0.000 0.000 | 11034 | 16 30 26 | 1.671 3.342 2.954 | 7.685% | 1.99 px, 1.094x, 0.413 (0.404) |
| square-skew-dpr2 | 0 0 0 | 0.000 0.000 0.000 | 13734 | 11 22 42 | 0.094 0.367 1.902 | 3.670% | 1.49 px, 1.022x, 0.378 (0.322) |

### The squeezed rows

The `edge` page of the lab (`squeezedEdgeProblems`; the verifier prints these as `GODOT_REACT_TRANSFORMS_MEASURE`): a box scaled 0.6 on y and moved 0.1 px down, so its straight edges fall inside a pixel row, and the share of the top and
the bottom row the box covers is read down its middle. Wanted: 0.9 and 0.1 at DPR 1, 0.8 and 0.2 at DPR 2. The check asserts every one within 0.12 now, rounded boxes included (it logged the rounded ones and asserted only the square ones).

| box | DPR 1 top / bottom | DPR 2 top / bottom |
| --- | --- | --- |
| rounded, before | 1.000 / 0.000 | 1.000 / 0.000 |
| rounded, **after** | **0.901 / 0.099** | **0.802 / 0.198** |
| square (the grid, unchanged) | 0.901 / 0.099 | 0.802 / 0.198 |
| wanted | 0.9 / 0.1 | 0.8 / 0.2 |

A rounded box with a border 1 px thick, squeezed the same way, so the border is 0.6 of a device pixel thick at DPR 1 and 1.2 across two rows at DPR 2 (`edge-ring`, new): DPR 1 rows 200 / 259 / 260 read 0.601 / 0.498 / 0.099 where the border covers 0.6 / 0.5 / 0.1;
DPR 2 rows 400 / 401 / 519 / 520 read 0.802 / 0.399 / 1.000 / 0.198 where it covers 0.8 / 0.4 / 1.0 / 0.2.
A square box and a rounded box with a border and a gradient of one colour, turned 30 degrees (`edge-gradient`, `edge-gradient-ring`, new; the layered drawing): 96.8% of the scanlines across the left edge show a partly covered pixel at DPR 1
(92.1% at DPR 2, for both; the plain turned square is 94.5% and 92.8%, and the check wants 85%).

### Negative controls

`pnpm build:native --faults` builds the library with the faults of `native/filter_faults.rs` compiled in, and `pnpm verify --interaction --only=transforms-faults --faults --no-retry` runs each control's check with its fault off (it must
pass) and on (it must fail with its own message). One run, both windows (portrait skips the two that need a content scale of two): every control held, the default library was built again afterwards.

| fault | what it removes | the check that dies, and what it says |
| --- | --- | --- |
| `transform-feather-uniform` | a feather per axis for every box (one length for both, sized for the stretched axis, which is what `StyleBoxFlat` has) | square, DPR 2: `A squeezed square box's top edge is antialiased (dpr2): row 400 is covered 1 where the box covers 0.8 of it; ... bottom edge (dpr2): row 520 is covered 0 where the box covers 0.2 of it` |
| (same fault, **new control**) | the same, for a rounded box | rounded, DPR 2: `A squeezed rounded box's top edge is antialiased (dpr2): row 200 is covered 1 where the box covers 0.8 of it; A squeezed rounded box's bottom edge is antialiased (dpr2): row 320 is covered 0 where the box covers 0.2 of it` |
| (same fault, **new control**) | the same, for a border thinner than the feather | `A squeezed thin border keeps the share of the row it covers (dpr1): the top border's row 200 is covered 0.831 where the border covers 0.6 of it` |
| `transform-boxes-hard` (was `transform-squares-hard`) | the meshes: every box back on `StyleBoxFlat` | `A square box turned 30 degrees has antialiased edges (dpr1): 0% of the scanlines across its left edge show a partly covered pixel`, and, **new**, `A square box with a gradient turned 30 degrees has antialiased edges (dpr1): 0% ...` |

The first of those is the control the brief asks for: with the feather of one length back (`Fault::TransformFeatherUniform`, which `node_box_feather` honours for every meshed box), the rounded box's squeezed edge reads row 200 covered 1.0 and row 320 covered 0.0
where it covers 0.8 and 0.2, exactly the 1.0 and 0.0 the code before this branch drew; the unit test `one_feather_for_both_axes_is_wrong_on_the_squeezed_one` is the same control at the level of the mesh (the uniform feather's mean error against
supersampled coverage is more than four times the per-axis one's, and its worst more than twice).

## Formatting

The crate's pinned toolchain (`rust-toolchain.toml`, 1.99.1, profile `minimal`) had no `rustfmt`; earlier tracks used `cargo +stable fmt` (`docs/tracks/hidpi.md`). `rustup component add --toolchain 1.99.1 rustfmt` worked (it installs `rustfmt 1.10.0-stable`, the same as `stable`'s), after which a bare
`cargo fmt` and `cargo fmt --check` run in the crate (with `PATH="$HOME/.cargo/bin:$PATH"`, which the track rules already require). Of the files the brief listed only three differed (`native/lib.rs`, the order of two `mod` lines; `native/scroll.rs`; `native/text_input_godot/keys.rs`); `motion.rs`,
`selection_input.rs`, `style_engine.rs`, `props.rs` and `render_tree.rs` were already clean. They are the first commit of the branch (`ca3135c`), and nothing else is in it. `cargo fmt --check` is clean at the end of the branch, and `cargo clippy --locked --all-targets -- -D warnings` too.

## Runs

Every run is the branch's last code (`94c3ec0`), through the gate, silent (`--audio-driver Dummy`, which the scripts pass), and no window of it takes focus.

| What | Command | Result |
| --- | --- | --- |
| Rust | `cargo fmt --check`; `cargo clippy --locked --all-targets -- -D warnings`; `cargo test --locked` | clean; no warnings; 869 passed (862 at the first mesh commit; `box_mesh` has 27 tests, `rrect` 9, `box_draw` 2, `transform` and `transform_state` keep theirs) |
| TypeScript | `pnpm test:types`; `pnpm test` | clean on the default profile (again at the end) and on stock (below); 853 passed |
| Native, Breaka's engine, Compatibility | `pnpm verify --interaction --only=transforms,paint,glass,hidpi` (one run, landscape and portrait) | both windows passed: landscape `transforms` 5283 checks, `paint` 1545, `glass` 1796, `hidpi` 466; portrait 3590, 1545, 1680, 484 |
| Mobile (`--renderer=mobile`), Forward+ (`--renderer=forward_plus`) | `pnpm verify --interaction --only=transforms --renderer=<name>` | both passed both windows: Mobile 5551 and 3792 checks, Forward+ 5555 and 3784. The squeezed rows read 0.897 / 0.103 at DPR 1 (0.901 / 0.099 on Compatibility; the third digit differs, not investigated, and both are well inside the check's 0.12) and 0.802 / 0.198 at DPR 2 |
| Web | `pnpm build:web`, then `node scripts/verify-interaction-web.mjs --only=transforms,paint` | passed: 368 assertions (`transforms` 252, `paint` 104), 104 captures, at the four viewports |
| Negative controls | `pnpm build:native --faults`, `pnpm verify --interaction --only=transforms-faults --faults --no-retry`, then `pnpm build:native` | all controls held in both windows; the default library was built again |
| Stock engine (Godot 4.7.2, `--engine=stock`) | `pnpm build:native --engine=stock`; `pnpm test:types --engine=stock`; `pnpm verify --interaction --only=transforms,paint,glass,hidpi --engine=stock` | stock typecheck clean (typings regenerated from the stock library); both windows passed: landscape `transforms` 5365 checks, `paint` 1545, `glass` 1804, `hidpi` 464; portrait 3546, 1545, 1688, 474. The squeezed rows read 0.901 / 0.099 and 0.802 / 0.198, as on Breaka's engine. A first stock run (before the live-compile addon was built for stock) panicked in the demo's `live-compile` addon, still Breaka's build ("godot-rust compiled against newer Godot version"), and was stopped; `node scripts/build-live-compile.mjs --engine=stock` (2 m 45 s) fixed it, and the default native library and live-compile addon were built again afterwards |

The Web captures are compared with Chrome as the native ones are: `--diff --native=<the Web verifier's retina-landscape directory>` compares the `transforms-<case>-web-dpr2.png` it saves with Chrome's 1120 x 800 at a pixel ratio of two. The 13 cases the Web verifier draws, `edge` pixels, mean R / G / B and the share beyond 24 levels
(`artifacts/box-mesh-after/compare-web/`; no Web run of the base commit was made, so there is no "before"): `rotate` 0.043 / 0.089 / 0.113 and 0%, `rotate-corner` 0.038 / 0.082 / 0.102, `scale-up` 0.027 / 0.063 / 0.081, `scale-down` 0.126 / 0.069 / 0.086, `skew` 0.034 / 0.070 / 0.082,
`matrix` 0.030 / 0.075 / 0.081, `percent`, `mirror` and `nested` 0.026 to 0.055 / 0.065 to 0.083 / 0.080 to 0.092, all 0% beyond 24 levels, worst 2 to 6; `rotate-x` 1.608 / 3.430 / 3.763 and 10.8%, `rotate-y` 0.515 / 1.154 / 1.401 and 2.5%, `rotate-xyz` 1.842 / 3.967 / 4.336 and 7.6%
(the native figures to the second digit: the squeezed cases are Chrome's resampling); `identity`, drawn by `StyleBoxFlat`, 0.762 / 1.711 / 2.090 and 3.3%, as native. The Web engine's rasters of the meshes are the native ones.

## Limits that stay

* **Layers cut from baked masks keep one isotropic feather.** A border whose sides differ in colour (`box_draw::border`), an `outline`, a `box-shadow` ring and the focus ring (a `StyleBoxFlat` stroke) are not meshes. A mask is baked at `Oversampling`, so
  its edge is one texel wide in the box's own frame: a device pixel on the stretched axis and a fraction of one on the squeezed one, which is what a rounded box had before this branch. Nothing here measures them under a squeeze; blurred shadows are
  unaffected. Moving the mixed-colour border over would mean joining the sides' meshes along the mitres with an antialiased seam.
* **A square corner of a shape that also has a rounded one is a diagonal vertex** (the corner point reads 0.5 where a box filter reads 0.25), and a ring of unequal widths whose thin side meets a square corner of such a shape can fold a little there. Measured with the
  unit tests' harness (a 100 x 60 fill under the five maps of `maps()`, against 32 x 32 subsampled coverage of every pixel at an edge; run on a scratch copy of the tests, not committed): all four corners rounded, mean error 0.008 to 0.020 and worst 0.04 to 0.06;
  all four square, 0.005 to 0.020 and 0.03 to 0.04; two or one corners square, the same means (0.007 to 0.020) and a worst pixel of 0.08 to 0.22, which is the pixel at each square corner. The lab has no such box and nothing was compared with Chrome for one.
* **A shape thinner than its feather is a triangle across its middle line when it has a rounded corner** (a hairline pill reads the share of a pixel it covers, with about a quarter less ink than a rectangle's trapezoid); a rectangle is exact.
* **A box whose border has a side with no width and a translucent or partly opaque border** keeps the feathered fill under it, so a quarter of the fill's colour fringes the antialiased outer edge there (`opaque_border` wants all four sides drawn and opaque). The same was true of `square_box.rs`.
* **Chrome's own resampling** accounts for what is left of `rotate-x`, `rotate-y` and `rotate-xyz` at DPR 2 (above), and its area coverage for the turned plain squares' blue; neither is something an exact renderer should copy.
* **While a transform transition runs a box keeps the drawing it had** (nothing is re-recorded until it settles, as for text): a box that was on the grid at rest is a `StyleBoxFlat` while it turns, and a mesh once it has settled.
* A box's mesh is rebuilt when its feather changes (a transform that changes the squeeze, a change of viewport scale); every rounded corner is 7 to 49 segments by its radius, so a card with a border is some hundreds of vertices. No cost was measured; a tree with no transform holds none of it.

## Not verified

* The gradient, inset shadow and border layers under a transform were checked for antialiased edges on a turned box (`edge-gradient`, `edge-gradient-ring`) and nothing more: their colours and the gradient's line were not compared with Chrome under a transform.
* Rounded boxes with some corners square, mixed-colour borders, outlines and shadow rings under a squeeze (above).
* Web before the change: no Web run of the base commit was made (the Web numbers above are after only).
* The portrait window skips the two negative controls that need a content scale of two (it has no room for one); they ran in landscape.
* Memory and time of the meshes were not measured. By count, a card of 220 x 120 with a 16 px radius and a 4 px border is 341 vertices and 476 triangles at scale 1 and 481 and 672 at scale 2 (fill under the ring plus the ring; counted in a scratch copy of the unit tests); a box on the grid costs what it did.

## README text

> **Boxes under a transform.** A box under a rotation, scale, skew or matrix is drawn from antialiased triangles, not `StyleBoxFlat`: square or rounded corners, fills and borders (any width per side, a border thinner than a pixel), gradients. The antialiasing is a
> filter one device pixel wide across every edge, so a transform that squeezes one axis (`rotateX`, `rotateY`, a non-uniform scale) keeps a one pixel ramp on it, and a rounded card turned, scaled or skewed is within a few levels of Chrome's. A box with no
> transform, or only a translation, is drawn as before and matches a Godot `Panel` pixel for pixel. Borders whose sides differ in colour, outlines and shadow rings are still masks baked at the larger stretch.
