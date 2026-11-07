//! The triangle meshes a box is drawn from where `StyleBoxFlat` cannot draw it: a gradient fill, a pill, and every box that a
//! transform has turned, skewed or scaled. Nothing here touches Godot: a mesh is positions, an alpha for each and triangle
//! indices, in whatever unit the shapes are given in (the callers use device pixels).
//!
//! The antialiasing is a box filter [`Feather`] wide, centred on the true edge: the alpha at a vertex is the share of a
//! pixel's filter the shape covers there, so a mesh drawn through a map reads on the screen what an exact rasteriser reads.
//! A feather is a length *per axis of the box*, because a transform that squeezes one axis makes a pixel a longer stretch of it
//! (`StyleBoxFlat` has one `anti_aliasing_size`, and a rounded box under `rotateX` came out hard on the squeezed axis).
//!
//! Two constructions, by the shape:
//!
//! * A rectangle with square corners has coverage that is the product of its span on x and its span on y, which is piecewise
//!   linear in each, with its breaks where an edge's ramp starts, ends and passes its middle. The mesh is the grid those lines cut,
//!   a vertex at each crossing: exact on the straight edges (a border thinner than the feather included, whose coverage is a
//!   trapezoid that peaks below one) and within 0.06 of the true value in a corner cell.
//! * A shape with a rounded corner is a fan inside a strip: the outline moved in by half the feather (alpha 1) and out by half
//!   of it (alpha 0), each vertex along its own normal by the feather of that normal, so an arc turns from the feather of one axis
//!   to the feather of the other. A ring (a border) is four such loops, the two edges' ramps with the body between them; a ring
//!   thinner than the feather swaps the middle two, which is the trapezoid again.

use crate::rrect::{RRect, Vertex, arc_segments};

/// A feather narrower than this is a hard edge: it keeps a division by it finite.
const MIN_FEATHER: f32 = 1e-3;
/// Grid lines closer than this are one line.
const SAME_LINE: f32 = 1e-4;

/// How long the ramp across an edge must be, in the box's own frame, to measure one pixel on the screen.
///
/// An edge whose unit normal is `n` is seen across `L⁻ᵀ n` after the map `L`, so the box-frame length that one screen pixel
/// spans across it is `|L⁻ᵀ n|`. The two vectors kept are that for the box's x axis and for its y axis: their lengths are the
/// feather of a vertical and of a horizontal edge, and any other normal is their blend. A map that only turns or scales evenly
/// makes both unit-length and at right angles; `rotateX(50deg)` makes the y vector 1.56 long; a skew makes them lean.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Feather {
    across_x: [f32; 2],
    across_y: [f32; 2],
}

impl Feather {
    /// No feather: an edge is hard (a box on the pixel grid has square edges on pixels).
    pub const NONE: Feather = Feather::isotropic(0.0);

    /// One length across every edge, whichever way it faces.
    pub const fn isotropic(length: f32) -> Feather {
        Feather {
            across_x: [length, 0.0],
            across_y: [0.0, length],
        }
    }

    /// The vectors for the box's x and y axes (the columns of the inverse transpose of the map; `Linear2::edge_axes`).
    pub const fn from_axes(across_x: [f32; 2], across_y: [f32; 2]) -> Feather {
        Feather { across_x, across_y }
    }

    /// The feather across a vertical edge (its normal is the box's x axis).
    pub fn x(&self) -> f32 {
        self.across_x[0].hypot(self.across_x[1])
    }

    /// The feather across a horizontal edge.
    pub fn y(&self) -> f32 {
        self.across_y[0].hypot(self.across_y[1])
    }

    pub fn is_none(&self) -> bool {
        self.x() <= MIN_FEATHER && self.y() <= MIN_FEATHER
    }

    /// The feather across an edge whose outward unit normal is `(nx, ny)`.
    pub fn along(&self, nx: f32, ny: f32) -> f32 {
        let x = nx * self.across_x[0] + ny * self.across_y[0];
        let y = nx * self.across_x[1] + ny * self.across_y[1];
        x.hypot(y)
    }

    /// The same feather in a unit `factor` times as long.
    pub fn scaled(&self, factor: f32) -> Feather {
        Feather {
            across_x: self.across_x.map(|value| value * factor),
            across_y: self.across_y.map(|value| value * factor),
        }
    }
}

/// A vertex: where it is and how opaque the shape is there (0 on the outer edge of the feather, 1 inside).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point {
    pub x: f32,
    pub y: f32,
    pub alpha: f32,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct Mesh {
    pub points: Vec<Point>,
    pub indices: Vec<u32>,
}

impl Mesh {
    fn push(&mut self, point: Point) -> u32 {
        self.points.push(point);
        u32::try_from(self.points.len() - 1).expect("a mesh index fits a u32")
    }

    fn triangle(&mut self, a: u32, b: u32, c: u32) {
        self.indices.extend([a, b, c]);
    }

    pub fn is_empty(&self) -> bool {
        self.indices.is_empty()
    }

    /// Add a convex polygon as a fan.
    fn polygon(&mut self, polygon: &[Point]) {
        if polygon.len() < 3 {
            return;
        }
        let first = self.push(polygon[0]);
        let mut previous = self.push(polygon[1]);
        for point in &polygon[2..] {
            let next = self.push(*point);
            self.triangle(first, previous, next);
            previous = next;
        }
    }
}

fn moved(vertex: &Vertex, alpha: f32) -> Point {
    Point {
        x: vertex.x,
        y: vertex.y,
        alpha,
    }
}

/// The segments of a corner arc for a rectangle: enough for its largest radius.
fn segments_for(rect: &RRect) -> usize {
    rect.corners
        .iter()
        .map(|corner| arc_segments(corner.x.max(corner.y)))
        .max()
        .unwrap_or(1)
}

/// A rectangle filled with no feather: a quad of full alpha.
fn solid(rect: &RRect) -> Mesh {
    let mut mesh = Mesh::default();
    if rect.width() > 0.0 && rect.height() > 0.0 {
        let corner = |x: f32, y: f32| Point { x, y, alpha: 1.0 };
        mesh.polygon(&[
            corner(rect.x0, rect.y0),
            corner(rect.x1, rect.y0),
            corner(rect.x1, rect.y1),
            corner(rect.x0, rect.y1),
        ]);
    }
    mesh
}

// ---------------------------------------------------------------------------------------------
// Rectangles: the grid
// ---------------------------------------------------------------------------------------------

/// How much of a half plane that starts at 0 (everything at `u` or beyond) a box filter `feather` wide, centred at `u`, covers.
fn ramp(u: f32, feather: f32) -> f32 {
    (0.5 + u / feather.max(MIN_FEATHER)).clamp(0.0, 1.0)
}

/// How much of the span `lo..hi` the filter centred at `t` covers.
fn span(t: f32, lo: f32, hi: f32, feather: f32) -> f32 {
    ramp(t - lo, feather) - ramp(t - hi, feather)
}

/// The coverage at `(x, y)` of `outer` less `inner` (a ring) or of `outer` alone.
fn coverage(outer: &RRect, inner: Option<&RRect>, feather: Feather, x: f32, y: f32) -> f32 {
    let of = |rect: &RRect| {
        span(x, rect.x0, rect.x1, feather.x()) * span(y, rect.y0, rect.y1, feather.y())
    };
    (of(outer) - inner.map_or(0.0, of)).max(0.0)
}

/// The lines along one axis where coverage stops being linear: each edge's ramp starts, ends, and passes through its middle (a
/// line in the middle of a ramp halves what a diagonal across a corner cell gets wrong).
fn stops(edges: impl IntoIterator<Item = f32>, feather: f32) -> Vec<f32> {
    let mut lines: Vec<f32> = edges
        .into_iter()
        .flat_map(|edge| [edge - feather / 2.0, edge, edge + feather / 2.0])
        .collect();
    lines.sort_by(f32::total_cmp);
    lines.dedup_by(|later, earlier| *later - *earlier < SAME_LINE);
    lines
}

/// The grid mesh of the coverage of the rectangle `outer`, less `inner` when there is one. Neither has a rounded corner.
fn grid(outer: &RRect, inner: Option<&RRect>, feather: Feather) -> Mesh {
    let mut mesh = Mesh::default();
    if outer.width() <= 0.0 || outer.height() <= 0.0 {
        return mesh;
    }
    let xs = stops(
        [outer.x0, outer.x1]
            .into_iter()
            .chain(inner.into_iter().flat_map(|rect| [rect.x0, rect.x1])),
        feather.x(),
    );
    let ys = stops(
        [outer.y0, outer.y1]
            .into_iter()
            .chain(inner.into_iter().flat_map(|rect| [rect.y0, rect.y1])),
        feather.y(),
    );
    for &y in &ys {
        for &x in &xs {
            mesh.points.push(Point {
                x,
                y,
                alpha: coverage(outer, inner, feather, x, y),
            });
        }
    }
    let columns = xs.len();
    for row in 0..ys.len() - 1 {
        for column in 0..columns - 1 {
            let corner = |dx: usize, dy: usize| row * columns + column + dx + dy * columns;
            let [a, b, c, d] = [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
            // A cell no vertex of which is covered has no coverage in it either: coverage is bilinear there.
            if [a, b, c, d]
                .iter()
                .all(|&index| mesh.points[index].alpha == 0.0)
            {
                continue;
            }
            let [a, b, c, d] =
                [a, b, c, d].map(|index| u32::try_from(index).expect("a mesh index fits a u32"));
            mesh.indices.extend([a, b, c, a, c, d]);
        }
    }
    mesh
}

/// The fill under an opaque border of a rectangle: it stops under the ring's inner feather and has no feather of its own.
fn grid_under_ring(outer: &RRect, inner: &RRect, feather: Feather) -> Mesh {
    let widths = [
        (inner.x0 - outer.x0, feather.x()),
        (outer.x1 - inner.x1, feather.x()),
        (inner.y0 - outer.y0, feather.y()),
        (outer.y1 - inner.y1, feather.y()),
    ];
    if widths.iter().any(|(width, feather)| width < feather) {
        return grid(outer, None, feather);
    }
    solid(&RRect {
        x0: inner.x0 - feather.x() / 2.0,
        y0: inner.y0 - feather.y() / 2.0,
        x1: inner.x1 + feather.x() / 2.0,
        y1: inner.y1 + feather.y() / 2.0,
        corners: [crate::rrect::Corner::SQUARE; 4],
    })
}

// ---------------------------------------------------------------------------------------------
// Rounded shapes: loops
// ---------------------------------------------------------------------------------------------

/// The outline of `rect` moved outward by `by` times the feather of each vertex's normal (inward when negative).
fn loop_of(rect: &RRect, segments: usize, feather: Feather, by: f32) -> Vec<Vertex> {
    rect.outline(segments, |nx, ny| by * feather.along(nx, ny))
}

fn rounded_fill(rect: &RRect, feather: Feather) -> Mesh {
    let mut mesh = Mesh::default();
    let segments = segments_for(rect);
    let inner = loop_of(rect, segments, feather, -0.5);
    let centre = mesh.push(Point {
        x: (rect.x0 + rect.x1) * 0.5,
        y: (rect.y0 + rect.y1) * 0.5,
        alpha: 1.0,
    });
    let inner_ids: Vec<u32> = inner
        .iter()
        .map(|vertex| mesh.push(moved(vertex, 1.0)))
        .collect();
    let count = inner_ids.len();
    for index in 0..count {
        mesh.triangle(centre, inner_ids[index], inner_ids[(index + 1) % count]);
    }
    if feather.is_none() {
        return mesh;
    }
    let outer = loop_of(rect, segments, feather, 0.5);
    let outer_ids: Vec<u32> = outer
        .iter()
        .map(|vertex| mesh.push(moved(vertex, 0.0)))
        .collect();
    for index in 0..count {
        let next = (index + 1) % count;
        mesh.triangle(inner_ids[index], outer_ids[index], outer_ids[next]);
        mesh.triangle(inner_ids[index], outer_ids[next], inner_ids[next]);
    }
    mesh
}

/// How thick the ring is at each vertex of its two outlines, in the feather there: 1 is a ring exactly as thick as its feather.
/// The thickness is the distance between a vertex of the outer outline and its partner on the inner one.
fn thickness_in_feathers(outer: &[Vertex], inner: &[Vertex], feather: Feather) -> Vec<f32> {
    outer
        .iter()
        .zip(inner)
        .map(|(outside, inside)| {
            let (dx, dy) = (inside.x - outside.x, inside.y - outside.y);
            let thickness = dx.hypot(dy);
            if thickness <= 0.0 {
                return 0.0;
            }
            thickness
                / feather
                    .along(dx / thickness, dy / thickness)
                    .max(MIN_FEATHER)
        })
        .collect()
}

/// A ring of four loops: out of the outer edge (alpha 0), into the outer edge (alpha 1), out of the inner edge, towards the ring
/// (alpha 1), into the inner edge's hole (alpha 0). Where the ring is thinner than the feather the two middle loops swap and
/// reach only the share of the feather the ring is thick (a trapezoid rather than a plateau).
fn rounded_ring(outer: &RRect, inner: &RRect, feather: Feather) -> Mesh {
    if inner.width() <= 0.0 || inner.height() <= 0.0 {
        return fill(outer, feather);
    }
    let segments = segments_for(outer);
    let outer_edge = loop_of(outer, segments, feather, 0.0);
    let inner_edge = loop_of(inner, segments, feather, 0.0);
    let thickness = thickness_in_feathers(&outer_edge, &inner_edge, feather);
    let outside = loop_of(outer, segments, feather, 0.5);
    let outer_in = loop_of(outer, segments, feather, -0.5);
    let inner_out = loop_of(inner, segments, feather, 0.5);
    let hole = loop_of(inner, segments, feather, -0.5);
    let mut mesh = Mesh::default();
    for index in 0..outside.len() {
        let alpha = thickness[index].min(1.0);
        let (first, second) = if thickness[index] >= 1.0 {
            (&outer_in[index], &inner_out[index])
        } else {
            (&inner_out[index], &outer_in[index])
        };
        mesh.push(moved(&outside[index], 0.0));
        mesh.push(moved(first, alpha));
        mesh.push(moved(second, alpha));
        mesh.push(moved(&hole[index], 0.0));
    }
    let count = outside.len();
    let id = |index: usize, layer: usize| (index % count * 4 + layer) as u32;
    for index in 0..count {
        for layer in 0..3 {
            let [a, b, c, d] = [
                id(index, layer),
                id(index + 1, layer),
                id(index + 1, layer + 1),
                id(index, layer + 1),
            ];
            let at = |id: u32| mesh.points[id as usize];
            let flat = [a, b, c, d].iter().all(|&id| at(id).alpha == 0.0);
            // A square corner repeats its vertex: its quads have no area.
            let empty = same_place(at(a), at(b)) && same_place(at(d), at(c));
            if !flat && !empty {
                mesh.triangle(a, b, c);
                mesh.triangle(a, c, d);
            }
        }
    }
    mesh
}

fn same_place(a: Point, b: Point) -> bool {
    (a.x - b.x).abs() < SAME_LINE && (a.y - b.y).abs() < SAME_LINE
}

/// The fill under an opaque rounded border: a fan over the inner edge moved out half a feather, with no feather of its own.
fn rounded_fill_under_ring(outer: &RRect, inner: &RRect, feather: Feather) -> Mesh {
    if inner.width() <= 0.0 || inner.height() <= 0.0 {
        return fill(outer, feather);
    }
    let segments = segments_for(outer);
    let outer_edge = loop_of(outer, segments, feather, 0.0);
    let inner_edge = loop_of(inner, segments, feather, 0.0);
    if thickness_in_feathers(&outer_edge, &inner_edge, feather)
        .iter()
        .any(|thickness| *thickness < 1.0)
    {
        return fill(outer, feather);
    }
    let mut mesh = Mesh::default();
    let centre = mesh.push(Point {
        x: (outer.x0 + outer.x1) * 0.5,
        y: (outer.y0 + outer.y1) * 0.5,
        alpha: 1.0,
    });
    let ids: Vec<u32> = loop_of(inner, segments, feather, 0.5)
        .iter()
        .map(|vertex| mesh.push(moved(vertex, 1.0)))
        .collect();
    for index in 0..ids.len() {
        mesh.triangle(centre, ids[index], ids[(index + 1) % ids.len()]);
    }
    mesh
}

// ---------------------------------------------------------------------------------------------
// The shapes callers draw
// ---------------------------------------------------------------------------------------------

/// A filled rectangle or rounded rectangle, antialiased by `feather` centred on its edges. With no feather a rectangle is a quad. A
/// shape narrower than its feather reads the share it covers.
pub fn fill(rect: &RRect, feather: Feather) -> Mesh {
    if rect.width() <= 0.0 || rect.height() <= 0.0 {
        return Mesh::default();
    }
    if rect.is_rounded() {
        rounded_fill(rect, feather)
    } else if feather.is_none() {
        solid(rect)
    } else {
        grid(rect, None, feather)
    }
}

/// The ring between a border box and its padding box, with the feather centred on each of its two edges. A ring thinner than the
/// feather is a trapezoid as wide as the two edges' ramps together, peaking at its width over the feather; a side with no width
/// has no ring.
pub fn ring(outer: &RRect, inner: &RRect, feather: Feather) -> Mesh {
    if outer.width() <= 0.0 || outer.height() <= 0.0 {
        return Mesh::default();
    }
    if outer.is_rounded() {
        rounded_ring(outer, inner, feather)
    } else {
        grid(outer, Some(inner), feather)
    }
}

/// The fill of a box whose border is opaque: it stops under the ring's inner feather and has no feather of its own, so nothing of
/// it shows past the border's outer edge (a feathered fill under a feathered border leaves a fringe of the fill's colour there). A
/// border thinner than the feather has no room for that and the fill is feathered like any other.
pub fn fill_under_ring(outer: &RRect, inner: &RRect, feather: Feather) -> Mesh {
    if outer.width() <= 0.0 || outer.height() <= 0.0 {
        return Mesh::default();
    }
    if outer.is_rounded() {
        rounded_fill_under_ring(outer, inner, feather)
    } else {
        grid_under_ring(outer, inner, feather)
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::rrect::Corner;

    /// The interpolated alpha of the mesh at a point: the triangle it lies in, 0 if none.
    pub(crate) fn sample(mesh: &Mesh, x: f32, y: f32) -> f32 {
        for triangle in mesh.indices.as_chunks::<3>().0 {
            let [a, b, c] = triangle.map(|index| mesh.points[index as usize]);
            let det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
            if det.abs() < 1e-9 {
                continue;
            }
            let wa = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / det;
            let wb = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / det;
            let wc = 1.0 - wa - wb;
            let slack = -1e-5;
            if wa >= slack && wb >= slack && wc >= slack {
                return wa * a.alpha + wb * b.alpha + wc * c.alpha;
            }
        }
        0.0
    }

    fn near(actual: f32, expected: f32) {
        assert!(
            (actual - expected).abs() < 1e-4,
            "{actual} is not {expected}"
        );
    }

    fn within(actual: f32, expected: f32, tolerance: f32) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "{actual} is not {expected} within {tolerance}"
        );
    }

    const ONE: Feather = Feather::isotropic(1.0);

    fn rect(x0: f32, y0: f32, x1: f32, y1: f32) -> RRect {
        RRect {
            x0,
            y0,
            x1,
            y1,
            corners: [Corner::SQUARE; 4],
        }
    }

    fn boxed() -> RRect {
        rect(10.0, 20.0, 110.0, 80.0)
    }

    fn feather_of(x: f32, y: f32) -> Feather {
        Feather::from_axes([x, 0.0], [0.0, y])
    }

    #[test]
    fn a_feather_is_the_length_that_measures_a_pixel_across_each_edge() {
        near(ONE.along(1.0, 0.0), 1.0);
        near(ONE.along(0.6, 0.8), 1.0);
        let squeezed = feather_of(1.0, 2.5);
        near(squeezed.x(), 1.0);
        near(squeezed.y(), 2.5);
        near(squeezed.along(0.0, -1.0), 2.5);
        // A normal between the axes blends them.
        near(squeezed.along(0.6, 0.8), (0.36_f32 + 4.0).sqrt());
        assert!(Feather::NONE.is_none() && !ONE.is_none());
        near(squeezed.scaled(2.0).y(), 5.0);
        // A skew leans the axes towards each other: the diagonal is longer than the two axes alone give.
        let leaning = Feather::from_axes([1.0, 0.0], [0.5, 1.0]);
        assert!(leaning.along(0.0, 1.0) > 1.0 && leaning.y() > 1.0);
    }

    #[test]
    fn a_square_fill_with_no_feather_is_a_quad() {
        let mesh = fill(&boxed(), Feather::NONE);
        assert_eq!(mesh.indices.len(), 6);
        near(sample(&mesh, 10.5, 20.5), 1.0);
        near(sample(&mesh, 9.5, 20.5), 0.0);
    }

    #[test]
    fn a_fill_ramps_across_each_edge_and_is_solid_inside() {
        let mesh = fill(&boxed(), ONE);
        // On the edge the shape covers half a pixel's width; the ramp runs half a feather either side of it.
        near(sample(&mesh, 10.0, 50.0), 0.5);
        near(sample(&mesh, 10.25, 50.0), 0.75);
        near(sample(&mesh, 9.75, 50.0), 0.25);
        near(sample(&mesh, 60.0, 50.0), 1.0);
        near(sample(&mesh, 60.0, 20.0), 0.5);
        near(sample(&mesh, 60.0, 80.25), 0.25);
        near(sample(&mesh, 9.0, 50.0), 0.0);
        // A wider feather is a wider ramp, still centred on the edge.
        let soft = fill(&boxed(), Feather::isotropic(2.0));
        near(sample(&soft, 10.0, 50.0), 0.5);
        near(sample(&soft, 9.5, 50.0), 0.25);
    }

    /// A squeezed axis has a longer feather, and each axis ramps over its own.
    #[test]
    fn a_fill_ramps_over_a_feather_of_its_own_on_each_axis() {
        let mesh = fill(&boxed(), feather_of(1.0, 2.5));
        near(sample(&mesh, 10.25, 50.0), 0.75);
        near(sample(&mesh, 60.0, 20.0), 0.5);
        near(sample(&mesh, 60.0, 20.5), 0.7);
        near(sample(&mesh, 60.0, 19.5), 0.3);
        near(sample(&mesh, 60.0, 18.75), 0.0);
        near(sample(&mesh, 60.0, 21.25), 1.0);
    }

    #[test]
    fn a_ring_is_feathered_on_both_of_its_edges() {
        let inner = rect(14.0, 24.0, 106.0, 76.0);
        let mesh = ring(&boxed(), &inner, ONE);
        near(sample(&mesh, 10.0, 50.0), 0.5);
        near(sample(&mesh, 12.0, 50.0), 1.0);
        near(sample(&mesh, 14.0, 50.0), 0.5);
        near(sample(&mesh, 14.25, 50.0), 0.25);
        near(sample(&mesh, 14.5, 50.0), 0.0);
        near(sample(&mesh, 60.0, 50.0), 0.0);
        near(sample(&mesh, 60.0, 76.0), 0.5);
        near(sample(&mesh, 60.0, 22.0), 1.0);
    }

    /// The coverage of a sliver: a box filter two long over a ring half as wide reads a quarter, across a plateau as wide as the
    /// difference, and the two edges' ramps together are as wide as the ring and the filter.
    #[test]
    fn a_ring_thinner_than_the_feather_is_a_trapezoid_that_peaks_below_one() {
        let inner = rect(10.5, 20.5, 109.5, 79.5);
        let mesh = ring(&boxed(), &inner, Feather::isotropic(2.0));
        near(sample(&mesh, 9.0, 50.0), 0.0);
        near(sample(&mesh, 9.5, 50.0), 0.25);
        near(sample(&mesh, 10.25, 50.0), 0.25);
        near(sample(&mesh, 11.0, 50.0), 0.25);
        near(sample(&mesh, 11.5, 50.0), 0.0);
        near(sample(&mesh, 60.0, 20.25), 0.25);
    }

    /// A box thinner than the feather in only one direction: the ring is a whole feather wide on x and a sliver on y.
    #[test]
    fn a_ring_can_be_thin_on_one_axis_and_thick_on_the_other() {
        let inner = rect(11.0, 21.0, 109.0, 79.0);
        let mesh = ring(&boxed(), &inner, feather_of(1.0, 2.0));
        near(sample(&mesh, 10.5, 50.0), 1.0);
        near(sample(&mesh, 60.0, 20.5), 0.5);
    }

    /// A border on one side only: the other three have no ring, and no fringe of one either.
    #[test]
    fn a_side_with_no_border_has_no_ring() {
        let inner = rect(10.0, 20.0, 110.0, 78.0);
        let mesh = ring(&boxed(), &inner, ONE);
        near(sample(&mesh, 60.0, 79.0), 1.0);
        near(sample(&mesh, 60.0, 50.0), 0.0);
        near(sample(&mesh, 60.0, 20.5), 0.0);
        near(sample(&mesh, 10.5, 50.0), 0.0);
        near(sample(&mesh, 109.5, 50.0), 0.0);
        near(sample(&mesh, 60.0, 78.0), 0.5);
    }

    #[test]
    fn a_box_smaller_than_its_feather_reads_the_share_it_covers() {
        let tiny = rect(0.0, 0.0, 0.4, 0.4);
        let mesh = fill(&tiny, ONE);
        near(sample(&mesh, 0.2, 0.2), 0.16);
        assert!(mesh.points.iter().all(|point| point.alpha <= 0.16 + 1e-5));
        assert!(fill(&rect(1.0, 1.0, 1.0, 5.0), ONE).indices.is_empty());
        assert!(
            fill(&rect(1.0, 1.0, 1.0, 5.0), Feather::NONE)
                .indices
                .is_empty()
        );
    }

    #[test]
    fn an_opaque_borders_fill_stops_under_the_ring_unless_the_border_is_thinner_than_the_feather() {
        let inner = boxed().padding_box([4.0; 4]);
        let under = fill_under_ring(&boxed(), &inner, ONE);
        near(sample(&under, 13.6, 50.0), 1.0);
        near(sample(&under, 13.4, 50.0), 0.0);
        let thin = fill_under_ring(&boxed(), &boxed().padding_box([0.5; 4]), ONE);
        near(sample(&thin, 10.0, 50.0), 0.5);
        // One thin side is enough: the fill would leak past it.
        let uneven = fill_under_ring(&boxed(), &boxed().padding_box([4.0, 0.5, 4.0, 4.0]), ONE);
        near(sample(&uneven, 110.0, 50.0), 0.5);
    }

    #[test]
    fn the_corner_of_a_box_reads_the_product_of_its_two_edges_coverage() {
        let mesh = fill(&boxed(), ONE);
        // On the corner point itself each edge covers half.
        near(sample(&mesh, 10.0, 20.0), 0.25);
        // A little in from the corner along the diagonal both are three quarters: 0.5625 where the mesh interpolates.
        within(sample(&mesh, 10.25, 20.25), 0.5625, 0.07);
    }

    #[test]
    fn a_rounded_fill_has_the_coverage_of_the_shape() {
        let shape = RRect::from_box(40.0, 30.0, [10.0; 4]);
        let mesh = fill(&shape, ONE);
        let mut worst = 0.0_f32;
        let mut mean = 0.0;
        let mut count = 0.0;
        for row in -2..32 {
            for column in -2..42 {
                let (x, y) = (column as f32 + 0.5, row as f32 + 0.5);
                let difference = (sample(&mesh, x, y) - shape.coverage(x, y)).abs();
                worst = worst.max(difference);
                mean += difference;
                count += 1.0;
            }
        }
        // The straight edges are exact; the arcs differ by a fraction of a pixel's coverage.
        assert!(worst < 0.2, "worst {worst}");
        assert!(mean / count < 0.003, "mean {}", mean / count);
    }

    #[test]
    fn a_pill_top_is_a_true_circle() {
        // rounded-t-full on 64 x 56: radii scaled to 32 on the top corners; the arc is the circle of radius 32 about (32, 32).
        let shape = RRect::from_box(64.0, 56.0, [9999.0, 9999.0, 0.0, 0.0]);
        assert!(
            (shape.corners[0].x - 32.0).abs() < 1e-3 && (shape.corners[0].y - 32.0).abs() < 1e-3
        );
        let mesh = fill(&shape, ONE);
        // The pixel centred (3.5, 16.5) is 32.44 from the centre: 0.44 outside the circle, so 0.06 covered.
        let coverage = sample(&mesh, 3.5, 16.5);
        assert!((coverage - 0.06).abs() < 0.04, "{coverage}");
        // And the one beside it, (4.5, 16.5), 31.6 from the centre, is wholly inside.
        assert!(sample(&mesh, 4.5, 16.5) > 0.9);
    }

    /// A rounded box's straight edges keep the feather of their own axis, and its arcs turn from one to the other.
    #[test]
    fn a_rounded_fill_ramps_over_a_feather_of_its_own_on_each_axis() {
        let shape = RRect::from_box(100.0, 60.0, [10.0; 4]);
        let mesh = fill(&shape, feather_of(1.0, 2.5));
        near(sample(&mesh, 50.0, 0.0), 0.5);
        near(sample(&mesh, 50.0, 0.5), 0.7);
        near(sample(&mesh, 50.0, -0.5), 0.3);
        near(sample(&mesh, 0.25, 30.0), 0.75);
        near(sample(&mesh, -0.25, 30.0), 0.25);
        // On the arc 45 degrees round, the feather is that of a diagonal normal: sqrt(0.5 + 0.5 * 6.25) = 1.9.
        let diagonal = std::f32::consts::FRAC_1_SQRT_2;
        let width = feather_of(1.0, 2.5).along(diagonal, diagonal);
        within(width, 1.9, 0.01);
        let (edge_x, edge_y) = (10.0 - 10.0 * diagonal, 10.0 - 10.0 * diagonal);
        within(sample(&mesh, edge_x, edge_y), 0.5, 0.02);
        let inside = width / 4.0;
        within(
            sample(
                &mesh,
                edge_x + diagonal * inside,
                edge_y + diagonal * inside,
            ),
            0.75,
            0.03,
        );
    }

    #[test]
    fn a_rounded_ring_is_feathered_on_both_edges_and_solid_between() {
        let outer = RRect::from_box(100.0, 60.0, [12.0; 4]);
        let inner = outer.padding_box([4.0; 4]);
        let mesh = ring(&outer, &inner, ONE);
        near(sample(&mesh, 50.0, 0.0), 0.5);
        near(sample(&mesh, 50.0, 2.0), 1.0);
        near(sample(&mesh, 50.0, 4.0), 0.5);
        near(sample(&mesh, 50.0, 4.25), 0.25);
        near(sample(&mesh, 50.0, 10.0), 0.0);
        near(sample(&mesh, 0.0, 30.0), 0.5);
        near(sample(&mesh, 2.0, 30.0), 1.0);
        // The arc of the ring, halfway round the corner: 12 out, 8 in.
        let diagonal = std::f32::consts::FRAC_1_SQRT_2;
        let at = |radius: f32| (12.0 - radius * diagonal, 12.0 - radius * diagonal);
        within(sample(&mesh, at(12.0).0, at(12.0).1), 0.5, 0.03);
        within(sample(&mesh, at(10.0).0, at(10.0).1), 1.0, 0.02);
        within(sample(&mesh, at(8.0).0, at(8.0).1), 0.5, 0.03);
    }

    #[test]
    fn a_rounded_ring_thinner_than_the_feather_is_a_trapezoid_that_peaks_below_one() {
        let outer = RRect::from_box(100.0, 60.0, [12.0; 4]);
        let inner = outer.padding_box([0.5; 4]);
        let mesh = ring(&outer, &inner, ONE);
        near(sample(&mesh, 50.0, -0.5), 0.0);
        near(sample(&mesh, 50.0, -0.25), 0.25);
        near(sample(&mesh, 50.0, 0.0), 0.5);
        near(sample(&mesh, 50.0, 0.25), 0.5);
        near(sample(&mesh, 50.0, 0.5), 0.5);
        near(sample(&mesh, 50.0, 0.75), 0.25);
        near(sample(&mesh, 50.0, 1.0), 0.0);
        // The same ring squeezed on y: a feather of 2.5 makes it a fifth as thick as the filter.
        let squeezed = ring(&outer, &inner, feather_of(1.0, 2.5));
        near(sample(&squeezed, 50.0, 0.25), 0.2);
        near(sample(&squeezed, 0.25, 30.0), 0.5);
    }

    /// Unequal widths round a corner make the inner edge an ellipse; the ring is still the difference of the two shapes.
    #[test]
    fn a_rounded_ring_of_unequal_widths_is_the_difference_of_its_two_shapes() {
        let outer = RRect::from_box(80.0, 50.0, [16.0; 4]);
        let inner = outer.padding_box([2.0, 6.0, 4.0, 8.0]);
        let mesh = ring(&outer, &inner, ONE);
        let mut worst = 0.0_f32;
        let mut mean = 0.0;
        let mut count = 0.0;
        for row in -2..52 {
            for column in -2..82 {
                let (x, y) = (column as f32 + 0.5, row as f32 + 0.5);
                let want = (outer.coverage(x, y) - inner.coverage(x, y)).max(0.0);
                let difference = (sample(&mesh, x, y) - want).abs();
                worst = worst.max(difference);
                mean += difference;
                count += 1.0;
            }
        }
        assert!(worst < 0.3, "worst {worst}");
        assert!(mean / count < 0.005, "mean {}", mean / count);
    }

    #[test]
    fn a_rounded_ring_with_no_hole_is_the_whole_shape() {
        let outer = RRect::from_box(20.0, 20.0, [6.0; 4]);
        let inner = outer.padding_box([10.0; 4]);
        let mesh = ring(&outer, &inner, ONE);
        near(sample(&mesh, 10.0, 10.0), 1.0);
        near(sample(&mesh, 0.0, 10.0), 0.5);
    }

    #[test]
    fn a_rounded_borders_fill_stops_under_the_ring() {
        let outer = RRect::from_box(100.0, 60.0, [12.0; 4]);
        let under = fill_under_ring(&outer, &outer.padding_box([4.0; 4]), ONE);
        // The fill reaches half a feather past the ring's inner edge and stops there, hard.
        near(sample(&under, 50.0, 3.6), 1.0);
        near(sample(&under, 50.0, 3.4), 0.0);
        near(sample(&under, 50.0, 30.0), 1.0);
        let thin = fill_under_ring(&outer, &outer.padding_box([0.5; 4]), ONE);
        near(sample(&thin, 50.0, 0.0), 0.5);
    }

    #[test]
    fn a_rounded_shape_with_a_square_corner_has_a_diagonal_one() {
        let shape = RRect::from_box(40.0, 30.0, [8.0, 8.0, 0.0, 0.0]);
        let mesh = fill(&shape, ONE);
        near(sample(&mesh, 20.0, 15.0), 1.0);
        // The square bottom corners ramp out along the diagonal.
        within(sample(&mesh, 40.0, 30.0), 0.5, 0.01);
        near(sample(&mesh, 20.0, 30.0), 0.5);
        for point in &mesh.points {
            assert!(point.x.is_finite() && point.y.is_finite());
        }
        assert!(
            mesh.indices
                .iter()
                .all(|&index| (index as usize) < mesh.points.len())
        );
    }

    // -----------------------------------------------------------------------------------------
    // Through a map: what the screen reads
    // -----------------------------------------------------------------------------------------

    /// A linear map `(x, y) -> (a x + c y, b x + d y)`, then a move by [`OFFSET`].
    #[derive(Clone, Copy)]
    struct Map {
        a: f32,
        b: f32,
        c: f32,
        d: f32,
    }

    /// The pixel's filter is read on a grid of this many subsamples a side.
    const SUBSAMPLES: u32 = 32;
    const COARSE_SUBSAMPLES: u32 = 8;
    /// Where the shape lands, in pixels: not on a pixel boundary, so every edge has a partly covered pixel.
    const OFFSET: (f32, f32) = (0.37, 0.61);

    impl Map {
        /// The linear part alone.
        fn linear(&self, x: f32, y: f32) -> (f32, f32) {
            (self.a * x + self.c * y, self.b * x + self.d * y)
        }

        fn inverse(&self) -> Map {
            let det = self.a * self.d - self.b * self.c;
            Map {
                a: self.d / det,
                b: -self.b / det,
                c: -self.c / det,
                d: self.a / det,
            }
        }

        /// The point of the box that lands at the screen point.
        fn invert(&self, x: f32, y: f32) -> (f32, f32) {
            self.inverse().linear(x - OFFSET.0, y - OFFSET.1)
        }

        /// What `Linear2::edge_axes` is: the columns of the inverse transpose.
        fn feather(&self) -> Feather {
            let det = (self.a * self.d - self.b * self.c).abs();
            Feather::from_axes([self.d / det, -self.c / det], [-self.b / det, self.a / det])
        }

        /// The larger stretch, which `StyleBoxFlat` sized its one feather for.
        fn uniform(&self) -> Feather {
            Feather::isotropic(1.0 / self.a.hypot(self.b).max(self.c.hypot(self.d)))
        }
    }

    /// For each pixel near an edge of `inside` (a test of a point of the box), where its centre is in the box and the share of the
    /// pixel the shape covers (by subsampling): what an exact rasteriser would put there.
    fn reference_under(
        map: Map,
        size: (f32, f32),
        inside: impl Fn(f32, f32) -> bool,
    ) -> Vec<(f32, f32, f32)> {
        let corners = [(0.0, 0.0), (size.0, 0.0), (0.0, size.1), (size.0, size.1)].map(|(x, y)| {
            let (x, y) = map.linear(x, y);
            (x + OFFSET.0, y + OFFSET.1)
        });
        let low = corners
            .map(|c| c.0.min(c.1))
            .into_iter()
            .fold(f32::MAX, f32::min);
        let high = corners
            .map(|c| c.0.max(c.1))
            .into_iter()
            .fold(f32::MIN, f32::max);
        let mut pixels = Vec::new();
        for py in low.floor() as i32 - 2..high.ceil() as i32 + 2 {
            for px in low.floor() as i32 - 2..high.ceil() as i32 + 2 {
                let (x, y) = map.invert(px as f32 + 0.5, py as f32 + 0.5);
                let covered_by = |side: u32| {
                    let mut covered = 0;
                    for sy in 0..side {
                        for sx in 0..side {
                            let (u, v) = (
                                px as f32 + (sx as f32 + 0.5) / side as f32,
                                py as f32 + (sy as f32 + 0.5) / side as f32,
                            );
                            let (bx, by) = map.invert(u, v);
                            covered += u32::from(inside(bx, by));
                        }
                    }
                    covered
                };
                // A coarse look first: most pixels are wholly in or out, and are not read finely.
                let coarse = covered_by(COARSE_SUBSAMPLES);
                if coarse == 0 || coarse == COARSE_SUBSAMPLES * COARSE_SUBSAMPLES {
                    continue;
                }
                let covered = covered_by(SUBSAMPLES);
                let share = covered as f32 / (SUBSAMPLES * SUBSAMPLES) as f32;
                // Pixels wholly in or out say nothing: the flat inside and the flat outside are exact in every mesh.
                if share > 0.0 && share < 1.0 {
                    pixels.push((x, y, share));
                }
            }
        }
        pixels
    }

    /// The mean and the worst difference between what the mesh reads at those pixels and the share they are covered.
    fn error_against(
        mesh: &Mesh,
        reference: &[(f32, f32, f32)],
        region: impl Fn(f32, f32) -> bool,
    ) -> (f32, f32) {
        let (mut total, mut worst, mut count) = (0.0_f32, 0.0_f32, 0.0_f32);
        for &(x, y, share) in reference {
            if region(x, y) {
                let difference = (sample(mesh, x, y) - share).abs();
                total += difference;
                worst = worst.max(difference);
                count += 1.0;
            }
        }
        (total / count.max(1.0), worst)
    }

    fn maps() -> [(&'static str, Map); 5] {
        let squeeze = 50.0_f32.to_radians().cos();
        let turn = 30.0_f32.to_radians();
        [
            (
                "rotateX",
                Map {
                    a: 1.0,
                    b: 0.0,
                    c: 0.0,
                    d: squeeze,
                },
            ),
            (
                "rotateY",
                Map {
                    a: 40.0_f32.to_radians().cos(),
                    b: 0.0,
                    c: 0.0,
                    d: 1.0,
                },
            ),
            (
                "turn",
                Map {
                    a: turn.cos(),
                    b: turn.sin(),
                    c: -turn.sin(),
                    d: turn.cos(),
                },
            ),
            (
                "skew",
                Map {
                    a: 1.0,
                    b: 6.0_f32.to_radians().tan(),
                    c: (-18.0_f32).to_radians().tan(),
                    d: 1.0,
                },
            ),
            (
                "scale",
                Map {
                    a: 0.6,
                    b: 0.0,
                    c: 0.0,
                    d: 0.6,
                },
            ),
        ]
    }

    const SHAPE_SIZE: (f32, f32) = (100.0, 60.0);

    #[test]
    fn a_rounded_fill_drawn_through_a_map_reads_what_a_rasteriser_would() {
        let shape = RRect::from_box(SHAPE_SIZE.0, SHAPE_SIZE.1, [12.0; 4]);
        for (name, map) in maps() {
            let reference =
                reference_under(map, SHAPE_SIZE, |x, y| shape.signed_distance(x, y) <= 0.0);
            let (mean, worst) =
                error_against(&fill(&shape, map.feather()), &reference, |_, _| true);
            assert!(
                mean < 0.02 && worst < 0.08,
                "{name}: mean {mean}, worst {worst}"
            );
        }
    }

    #[test]
    fn a_rounded_ring_drawn_through_a_map_reads_what_a_rasteriser_would() {
        let outer = RRect::from_box(SHAPE_SIZE.0, SHAPE_SIZE.1, [12.0; 4]);
        for width in [4.0, 0.5] {
            let inner = outer.padding_box([width; 4]);
            for (name, map) in maps() {
                let reference = reference_under(map, SHAPE_SIZE, |x, y| {
                    outer.signed_distance(x, y) <= 0.0 && inner.signed_distance(x, y) > 0.0
                });
                let (mean, worst) =
                    error_against(&ring(&outer, &inner, map.feather()), &reference, |_, _| {
                        true
                    });
                assert!(
                    mean < 0.03 && worst < 0.12,
                    "{name} border {width}: mean {mean}, worst {worst}"
                );
            }
        }
    }

    /// The control for the feather per axis: one length for both, sized for the stretched axis as `StyleBoxFlat` has it, leaves
    /// the squeezed axis of `rotateX` nearly hard (the ramp is 0.64 of a pixel there).
    #[test]
    fn one_feather_for_both_axes_is_wrong_on_the_squeezed_one() {
        let shape = RRect::from_box(SHAPE_SIZE.0, SHAPE_SIZE.1, [12.0; 4]);
        let (_, map) = maps()[0];
        let reference = reference_under(map, SHAPE_SIZE, |x, y| shape.signed_distance(x, y) <= 0.0);
        let (mean, worst) = error_against(&fill(&shape, map.feather()), &reference, |_, _| true);
        let (uniform_mean, uniform_worst) =
            error_against(&fill(&shape, map.uniform()), &reference, |_, _| true);
        assert!(
            uniform_mean > 4.0 * mean,
            "mean {mean}, uniform {uniform_mean}"
        );
        assert!(
            uniform_worst > 2.0 * worst,
            "worst {worst}, uniform {uniform_worst}"
        );
        // On the straight middle of the edges, where the feather of the squeezed axis is everything.
        let middle = |x: f32, _: f32| x > 30.0 && x < 70.0;
        let (straight, _) = error_against(&fill(&shape, map.feather()), &reference, middle);
        let (uniform_straight, _) = error_against(&fill(&shape, map.uniform()), &reference, middle);
        assert!(
            straight < 0.02 && uniform_straight > 0.08,
            "{straight} against {uniform_straight}"
        );
    }

    /// A skew leans the two axes' vectors: the feather round a corner follows them, which lengths alone do not.
    #[test]
    fn a_skew_leans_the_feather_round_an_arc() {
        let shape = RRect::from_box(SHAPE_SIZE.0, SHAPE_SIZE.1, [12.0; 4]);
        let (_, map) = maps()[3];
        let reference = reference_under(map, SHAPE_SIZE, |x, y| shape.signed_distance(x, y) <= 0.0);
        let full = map.feather();
        let (mean, worst) = error_against(&fill(&shape, full), &reference, |_, _| true);
        let (axes_mean, axes_worst) = error_against(
            &fill(&shape, feather_of(full.x(), full.y())),
            &reference,
            |_, _| true,
        );
        assert!(
            mean < axes_mean && worst < 0.8 * axes_worst,
            "mean {mean} against {axes_mean}, worst {worst} against {axes_worst}"
        );
    }
}
