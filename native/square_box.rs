//! Antialiased edges for a box with square corners that a transform has turned, skewed or scaled.
//!
//! `StyleBoxFlat` antialiases only a box with a rounded corner or a skew (`scene/resources/style_box_flat.cpp`, `aa_on`): a box with
//! square corners is meant to sit on device pixels, so it draws every edge hard. Under a transform its edges do not sit on pixels,
//! and a turned square came out as a staircase where a browser's is smooth. Such a box is drawn here instead, from triangles whose
//! vertices carry the shape's coverage: what a box filter one device pixel wide reads where it lies across the box, which is the
//! share of a pixel the box covers (and is what `StyleBoxFlat`'s feather is on an edge that has no turn in it).
//!
//! The filter is one length on each of the box's own axes (`feather`), so a transform that squeezes one axis gets a longer feather
//! there and still reads one device pixel across the edge (`Linear2::edge_feather`); `StyleBoxFlat` has one `anti_aliasing_size`
//! and cannot. Coverage of a box is separable (its span on x times its span on y), and the ring of a border is the outer box's
//! coverage less the inner one's, so every one of them is piecewise linear in each axis, with its corners where a span's edge
//! ramps start and stop: the meshes are the grids those lines cut, a vertex at each crossing, which is exact on the straight edges
//! (including a border thinner than the feather, whose coverage is a trapezoid that peaks below one) and a close fit at a corner.
//!
//! The shapes are pure data (the tests need no engine); [`draw`] turns one into a canvas command.

use godot::classes::RenderingServer;
use godot::prelude::*;

/// A feather narrower than this is a hard edge: it keeps a division by it finite.
const MIN_FEATHER: f32 = 1e-3;
/// Grid lines closer than this are one line.
const SAME_LINE: f32 = 1e-4;

/// A vertex: where it is, and how much of the shape covers it (1 inside the feather, 0 outside).
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Point {
    pub x: f32,
    pub y: f32,
    pub coverage: f32,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub(crate) struct Mesh {
    pub points: Vec<Point>,
    pub indices: Vec<i32>,
}

/// An axis-aligned rectangle, `x0 <= x1` and `y0 <= y1`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Rect {
    pub x0: f32,
    pub y0: f32,
    pub x1: f32,
    pub y1: f32,
}

impl Rect {
    pub(crate) fn from_size(size: Vector2) -> Rect {
        Rect {
            x0: 0.0,
            y0: 0.0,
            x1: size.x,
            y1: size.y,
        }
    }

    /// Moved in by `by` on every side, never past its own middle.
    pub(crate) fn inset(self, by: f32) -> Rect {
        let by = by
            .min((self.x1 - self.x0) / 2.0)
            .min((self.y1 - self.y0) / 2.0);
        Rect {
            x0: self.x0 + by,
            y0: self.y0 + by,
            x1: self.x1 - by,
            y1: self.y1 - by,
        }
    }

    fn is_empty(self) -> bool {
        self.x1 <= self.x0 || self.y1 <= self.y0
    }
}

/// How much of a half plane that starts at 0 (everything at `u` or beyond) a box filter `feather` wide, centred at `u`, covers.
fn ramp(u: f32, feather: f32) -> f32 {
    (0.5 + u / feather.max(MIN_FEATHER)).clamp(0.0, 1.0)
}

/// How much of the span `lo..hi` the filter centred at `t` covers.
fn span(t: f32, lo: f32, hi: f32, feather: f32) -> f32 {
    ramp(t - lo, feather) - ramp(t - hi, feather)
}

/// The coverage at `(x, y)` of `outer` less `inner` (a ring) or of `outer` alone.
fn coverage(outer: Rect, inner: Option<Rect>, feather: Vector2, x: f32, y: f32) -> f32 {
    let of =
        |rect: Rect| span(x, rect.x0, rect.x1, feather.x) * span(y, rect.y0, rect.y1, feather.y);
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

/// The grid mesh of the coverage of `outer`, less `inner` when there is one.
fn grid(outer: Rect, inner: Option<Rect>, feather: Vector2) -> Mesh {
    let mut mesh = Mesh::default();
    if outer.is_empty() {
        return mesh;
    }
    let xs = stops(
        [outer.x0, outer.x1]
            .into_iter()
            .chain(inner.into_iter().flat_map(|rect| [rect.x0, rect.x1])),
        feather.x,
    );
    let ys = stops(
        [outer.y0, outer.y1]
            .into_iter()
            .chain(inner.into_iter().flat_map(|rect| [rect.y0, rect.y1])),
        feather.y,
    );
    for &y in &ys {
        for &x in &xs {
            mesh.points.push(Point {
                x,
                y,
                coverage: coverage(outer, inner, feather, x, y),
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
                .all(|&index| mesh.points[index].coverage == 0.0)
            {
                continue;
            }
            let [a, b, c, d] =
                [a, b, c, d].map(|index| i32::try_from(index).expect("a mesh index fits an i32"));
            mesh.indices.extend([a, b, c, a, c, d]);
        }
    }
    mesh
}

/// A filled rectangle whose edges are antialiased: coverage 0.5 on each edge, ramping across `feather` (along x and along y)
/// centred on it. A rectangle narrower than the feather peaks below 1, as a browser's filter reads a sliver.
pub(crate) fn fill(rect: Rect, feather: Vector2) -> Mesh {
    grid(rect, None, feather)
}

/// A rectangle filled with no feather: a quad of full coverage.
pub(crate) fn solid(rect: Rect) -> Mesh {
    let mut mesh = Mesh::default();
    if !rect.is_empty() {
        mesh.points.extend([
            Point {
                x: rect.x0,
                y: rect.y0,
                coverage: 1.0,
            },
            Point {
                x: rect.x1,
                y: rect.y0,
                coverage: 1.0,
            },
            Point {
                x: rect.x1,
                y: rect.y1,
                coverage: 1.0,
            },
            Point {
                x: rect.x0,
                y: rect.y1,
                coverage: 1.0,
            },
        ]);
        mesh.indices.extend([0, 1, 2, 0, 2, 3]);
    }
    mesh
}

/// The ring between a border box and its padding box, with the feather centred on each of its two edges. A ring thinner than the
/// feather is a trapezoid as wide as the two edges' ramps together, peaking at its width over the feather.
pub(crate) fn ring(outer: Rect, inner: Rect, feather: Vector2) -> Mesh {
    let width = (inner.x0 - outer.x0)
        .min(outer.x1 - inner.x1)
        .min(inner.y0 - outer.y0)
        .min(outer.y1 - inner.y1);
    if width <= 0.0 {
        return fill(outer, feather);
    }
    grid(outer, Some(inner), feather)
}

/// The fill of a box whose border is opaque: it stops under the ring's inner feather and has no feather of its own, so nothing of
/// it shows past the border's outer edge (a feathered fill under a feathered border leaves a fringe of the fill's colour there). A
/// border thinner than the feather has no room for that and the fill is feathered like any other.
pub(crate) fn under_border(outer: Rect, inner: Rect, feather: Vector2) -> Mesh {
    let (across_x, across_y) = (inner.x0 - outer.x0, inner.y0 - outer.y0);
    if across_x < feather.x || across_y < feather.y {
        return fill(outer, feather);
    }
    solid(Rect {
        x0: inner.x0 - feather.x / 2.0,
        y0: inner.y0 - feather.y / 2.0,
        x1: inner.x1 + feather.x / 2.0,
        y1: inner.y1 + feather.y / 2.0,
    })
}

/// Draw `mesh` in `color`: each vertex's alpha is the colour's times its coverage.
pub(crate) fn draw(item: Rid, mesh: &Mesh, color: Color) {
    if mesh.indices.is_empty() || color.a <= 0.0 {
        return;
    }
    let indices = PackedInt32Array::from(mesh.indices.clone());
    let points = PackedVector2Array::from(
        mesh.points
            .iter()
            .map(|point| Vector2::new(point.x, point.y))
            .collect::<Vec<Vector2>>(),
    );
    let colors = PackedColorArray::from(
        mesh.points
            .iter()
            .map(|point| Color::from_rgba(color.r, color.g, color.b, color.a * point.coverage))
            .collect::<Vec<Color>>(),
    );
    RenderingServer::singleton().canvas_item_add_triangle_array(item, &indices, &points, &colors);
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The interpolated coverage of the mesh at a point: the triangle it lies in, 0 if none.
    fn sample(mesh: &Mesh, x: f32, y: f32) -> f32 {
        for triangle in mesh.indices.chunks(3) {
            let [a, b, c] =
                [triangle[0], triangle[1], triangle[2]].map(|index| mesh.points[index as usize]);
            let det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
            if det == 0.0 {
                continue;
            }
            let wa = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / det;
            let wb = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / det;
            let wc = 1.0 - wa - wb;
            let slack = -1e-5;
            if wa >= slack && wb >= slack && wc >= slack {
                return wa * a.coverage + wb * b.coverage + wc * c.coverage;
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

    const ONE: Vector2 = Vector2::new(1.0, 1.0);

    const BOX: Rect = Rect {
        x0: 10.0,
        y0: 20.0,
        x1: 110.0,
        y1: 80.0,
    };

    #[test]
    fn a_fill_ramps_across_each_edge_and_is_solid_inside() {
        let mesh = fill(BOX, ONE);
        // On the edge the shape covers half a pixel's width; the ramp runs half a feather either side of it.
        near(sample(&mesh, 10.0, 50.0), 0.5);
        near(sample(&mesh, 10.25, 50.0), 0.75);
        near(sample(&mesh, 9.75, 50.0), 0.25);
        near(sample(&mesh, 60.0, 50.0), 1.0);
        near(sample(&mesh, 60.0, 20.0), 0.5);
        near(sample(&mesh, 60.0, 80.25), 0.25);
        near(sample(&mesh, 9.0, 50.0), 0.0);
        // A wider feather is a wider ramp, still centred on the edge.
        let soft = fill(BOX, Vector2::new(2.0, 2.0));
        near(sample(&soft, 10.0, 50.0), 0.5);
        near(sample(&soft, 9.5, 50.0), 0.25);
    }

    /// A squeezed axis has a longer feather, and each axis ramps over its own.
    #[test]
    fn a_fill_ramps_over_a_feather_of_its_own_on_each_axis() {
        let mesh = fill(BOX, Vector2::new(1.0, 2.5));
        near(sample(&mesh, 10.25, 50.0), 0.75);
        near(sample(&mesh, 60.0, 20.0), 0.5);
        near(sample(&mesh, 60.0, 20.5), 0.7);
        near(sample(&mesh, 60.0, 19.5), 0.3);
        near(sample(&mesh, 60.0, 18.75), 0.0);
        near(sample(&mesh, 60.0, 21.25), 1.0);
    }

    #[test]
    fn a_ring_is_feathered_on_both_of_its_edges() {
        let inner = Rect {
            x0: 14.0,
            y0: 24.0,
            x1: 106.0,
            y1: 76.0,
        };
        let mesh = ring(BOX, inner, ONE);
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
        let inner = Rect {
            x0: 10.5,
            y0: 20.5,
            x1: 109.5,
            y1: 79.5,
        };
        let mesh = ring(BOX, inner, Vector2::new(2.0, 2.0));
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
        let inner = Rect {
            x0: 11.0,
            y0: 21.0,
            x1: 109.0,
            y1: 79.0,
        };
        let mesh = ring(BOX, inner, Vector2::new(1.0, 2.0));
        near(sample(&mesh, 10.5, 50.0), 1.0);
        near(sample(&mesh, 60.0, 20.5), 0.5);
    }

    #[test]
    fn a_box_smaller_than_its_feather_reads_the_share_it_covers() {
        let tiny = Rect {
            x0: 0.0,
            y0: 0.0,
            x1: 0.4,
            y1: 0.4,
        };
        let mesh = fill(tiny, ONE);
        near(sample(&mesh, 0.2, 0.2), 0.16);
        assert!(
            mesh.points
                .iter()
                .all(|point| point.coverage <= 0.16 + 1e-5)
        );
        assert!(
            fill(
                Rect {
                    x0: 1.0,
                    y0: 1.0,
                    x1: 1.0,
                    y1: 5.0
                },
                ONE
            )
            .indices
            .is_empty()
        );
        assert!(
            solid(Rect {
                x0: 1.0,
                y0: 1.0,
                x1: 1.0,
                y1: 5.0
            })
            .indices
            .is_empty()
        );
    }

    #[test]
    fn an_opaque_borders_fill_stops_under_the_ring_unless_the_border_is_thinner_than_the_feather() {
        let inner = BOX.inset(4.0);
        let under = under_border(BOX, inner, ONE);
        near(sample(&under, 13.6, 50.0), 1.0);
        near(sample(&under, 13.4, 50.0), 0.0);
        let thin = under_border(BOX, BOX.inset(0.5), ONE);
        near(sample(&thin, 10.0, 50.0), 0.5);
    }

    #[test]
    fn the_corner_of_a_box_reads_the_product_of_its_two_edges_coverage() {
        let mesh = fill(BOX, ONE);
        // On the corner point itself each edge covers half.
        near(sample(&mesh, 10.0, 20.0), 0.25);
        // A little in from the corner along the diagonal both are three quarters: 0.5625 where the mesh interpolates.
        let at = sample(&mesh, 10.25, 20.25);
        assert!((at - 0.5625).abs() < 0.07, "{at}");
    }
}
