//! Rounded rectangles in device pixels: the shape every box, shadow, ring and outline is cut from.
//!
//! Nothing here touches Godot. A rectangle has four corners, each with a horizontal and a vertical radius (the border
//! box has circular ones; the padding box inside a border of unequal widths has elliptical ones, CSS Backgrounds 3
//! section 5.5). The functions are the ones CSS defines for these shapes: scaling the radii so that they fit, growing
//! and shrinking the rectangle by a spread, the padding box inside the borders, and a signed distance that gives
//! the anti-aliased coverage of a pixel.

use std::f32::consts::FRAC_PI_2;

/// The horizontal and vertical radius of one corner. Either being zero makes the corner square.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Corner {
    pub x: f32,
    pub y: f32,
}

impl Corner {
    pub const SQUARE: Corner = Corner { x: 0.0, y: 0.0 };

    pub fn circular(radius: f32) -> Corner {
        Corner {
            x: radius,
            y: radius,
        }
        .normalized()
    }

    /// A corner with a zero radius on either axis is square (CSS Backgrounds 3 section 5.1).
    fn normalized(self) -> Corner {
        if self.x > 0.0 && self.y > 0.0 {
            self
        } else {
            Corner::SQUARE
        }
    }

    pub fn is_square(self) -> bool {
        self.x <= 0.0 || self.y <= 0.0
    }
}

/// Top left, top right, bottom right, bottom left: the order CSS lists the corners in.
pub const TOP_LEFT: usize = 0;
pub const TOP_RIGHT: usize = 1;
pub const BOTTOM_RIGHT: usize = 2;
pub const BOTTOM_LEFT: usize = 3;
/// Top, right, bottom, left: the order CSS lists the sides in.
pub const TOP: usize = 0;
pub const RIGHT: usize = 1;
pub const BOTTOM: usize = 2;
pub const LEFT: usize = 3;

/// A rounded rectangle: the edges and the four corners.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RRect {
    pub x0: f32,
    pub y0: f32,
    pub x1: f32,
    pub y1: f32,
    pub corners: [Corner; 4],
}

impl RRect {
    /// The rectangle `[0, width] x [0, height]` with circular corner radii, scaled down together when two radii
    /// on a side would overlap (CSS Backgrounds 3 section 5.5).
    pub fn from_box(width: f32, height: f32, radii: [f32; 4]) -> RRect {
        RRect {
            x0: 0.0,
            y0: 0.0,
            x1: width,
            y1: height,
            corners: radii.map(|radius| Corner::circular(radius.max(0.0))),
        }
        .fitted()
    }

    pub fn width(&self) -> f32 {
        self.x1 - self.x0
    }

    pub fn height(&self) -> f32 {
        self.y1 - self.y0
    }

    pub fn is_rounded(&self) -> bool {
        self.corners.iter().any(|corner| !corner.is_square())
    }

    /// Scale every radius by the one factor that makes the radii on each side fit that side.
    fn fitted(mut self) -> RRect {
        let [tl, tr, br, bl] = self.corners;
        let mut factor = 1.0_f32;
        for (available, sum) in [
            (self.width(), tl.x + tr.x),
            (self.width(), bl.x + br.x),
            (self.height(), tl.y + bl.y),
            (self.height(), tr.y + br.y),
        ] {
            if sum > available {
                factor = factor.min(available.max(0.0) / sum);
            }
        }
        if factor < 1.0 {
            for corner in &mut self.corners {
                corner.x *= factor;
                corner.y *= factor;
                *corner = corner.normalized();
            }
        }
        self
    }

    pub fn translated(self, dx: f32, dy: f32) -> RRect {
        RRect {
            x0: self.x0 + dx,
            y0: self.y0 + dy,
            x1: self.x1 + dx,
            y1: self.y1 + dy,
            ..self
        }
    }

    /// Every edge moved out by `amount` (in, when negative), as `box-shadow`'s spread does: a rounded corner's radii
    /// grow by the same amount, a square corner stays square (the browser's rule; CSS Backgrounds 3 section 7.2 asks
    /// for a smoother transition for a radius smaller than the spread, which Chrome does not do).
    pub fn outset(self, amount: f32) -> RRect {
        let mut out = RRect {
            x0: self.x0 - amount,
            y0: self.y0 - amount,
            x1: self.x1 + amount,
            y1: self.y1 + amount,
            corners: self.corners,
        };
        for corner in &mut out.corners {
            if !corner.is_square() {
                *corner = Corner {
                    x: (corner.x + amount).max(0.0),
                    y: (corner.y + amount).max(0.0),
                }
                .normalized();
            }
        }
        if out.width() < 0.0 {
            let middle = (out.x0 + out.x1) * 0.5;
            out.x0 = middle;
            out.x1 = middle;
        }
        if out.height() < 0.0 {
            let middle = (out.y0 + out.y1) * 0.5;
            out.y0 = middle;
            out.y1 = middle;
        }
        out
    }

    /// The padding box: the edges moved in by the border widths (top, right, bottom, left), each corner's radii
    /// reduced by the widths of the two sides that meet there, one on each axis (an ellipse when they differ).
    pub fn padding_box(self, widths: [f32; 4]) -> RRect {
        let top = widths[TOP];
        let right = widths[RIGHT];
        let bottom = widths[BOTTOM];
        let left = widths[LEFT];
        let mut out = RRect {
            x0: self.x0 + left,
            y0: self.y0 + top,
            x1: (self.x1 - right).max(self.x0 + left),
            y1: (self.y1 - bottom).max(self.y0 + top),
            corners: self.corners,
        };
        let reduce = |corner: Corner, horizontal: f32, vertical: f32| {
            if corner.is_square() {
                Corner::SQUARE
            } else {
                Corner {
                    x: (corner.x - horizontal).max(0.0),
                    y: (corner.y - vertical).max(0.0),
                }
                .normalized()
            }
        };
        out.corners = [
            reduce(self.corners[TOP_LEFT], left, top),
            reduce(self.corners[TOP_RIGHT], right, top),
            reduce(self.corners[BOTTOM_RIGHT], right, bottom),
            reduce(self.corners[BOTTOM_LEFT], left, bottom),
        ];
        out
    }

    /// The signed distance from the point to the outline: negative inside. Exact along the edges and for a circular
    /// corner; first order for an elliptical one (the distance is within a few per cent of the true one near the
    /// outline, which is where it is used).
    ///
    /// Each corner owns the part of the plane past its arc's centre on both axes; the rest is the box. A corner's arc can run
    /// past the middle of its side (the top of `rounded-t-full` on a 64 x 56 box has a radius of 32), so no quadrant is
    /// assumed: every corner is asked.
    pub fn signed_distance(&self, x: f32, y: f32) -> f32 {
        for corner in [TOP_LEFT, TOP_RIGHT, BOTTOM_RIGHT, BOTTOM_LEFT] {
            let Corner { x: rx, y: ry } = self.corners[corner];
            if rx <= 0.0 || ry <= 0.0 {
                continue;
            }
            // Distances past the corner's two edges, going outward.
            let (past_x, past_y) = match corner {
                TOP_LEFT => (self.x0 - x, self.y0 - y),
                TOP_RIGHT => (x - self.x1, self.y0 - y),
                BOTTOM_RIGHT => (x - self.x1, y - self.y1),
                _ => (self.x0 - x, y - self.y1),
            };
            // The arc's centre is (rx, ry) inside the corner point.
            let qx = past_x + rx;
            let qy = past_y + ry;
            if qx > 0.0 && qy > 0.0 {
                let k0 = ((qx / rx).powi(2) + (qy / ry).powi(2)).sqrt();
                let k1 = ((qx / (rx * rx)).powi(2) + (qy / (ry * ry)).powi(2)).sqrt();
                return if k1 > 0.0 { k0 * (k0 - 1.0) / k1 } else { 0.0 };
            }
        }
        // Along an edge or at a square corner: the box distance.
        let past_left = self.x0 - x;
        let past_right = x - self.x1;
        let past_top = self.y0 - y;
        let past_bottom = y - self.y1;
        let outside_x = past_left.max(past_right).max(0.0);
        let outside_y = past_top.max(past_bottom).max(0.0);
        if outside_x > 0.0 || outside_y > 0.0 {
            outside_x.hypot(outside_y)
        } else {
            past_left.max(past_right).max(past_top).max(past_bottom)
        }
    }

    /// How much of the pixel centred on the point the shape covers: one device pixel of anti-aliasing across the
    /// outline, which is exact for an edge on a pixel boundary.
    pub fn coverage(&self, x: f32, y: f32) -> f32 {
        (0.5 - self.signed_distance(x, y)).clamp(0.0, 1.0)
    }

    /// The first point of corner `corner`'s arc, on the way round clockwise from the top left: the arc runs from
    /// there to the last point of `corner_arc` through `segments` steps.
    fn corner_geometry(&self, corner: usize) -> (f32, f32, f32, f32) {
        // The arc's centre and the angle it starts at, measured so that `(cos, sin)` is the outward direction,
        // y down.
        let Corner { x: rx, y: ry } = self.corners[corner];
        match corner {
            TOP_LEFT => (self.x0 + rx, self.y0 + ry, rx, ry),
            TOP_RIGHT => (self.x1 - rx, self.y0 + ry, rx, ry),
            BOTTOM_RIGHT => (self.x1 - rx, self.y1 - ry, rx, ry),
            _ => (self.x0 + rx, self.y1 - ry, rx, ry),
        }
    }

    /// The outline as a polygon going clockwise (y down) from the top left, with every vertex moved by `grow` along its
    /// outward normal (inward when negative). A rounded corner contributes `segments + 1` points on its arc, a square
    /// one a single point moved diagonally, so that two loops made with the same `segments` pair up vertex for vertex.
    pub fn outline(&self, grow: f32, segments: usize) -> Vec<Vertex> {
        let mut points = Vec::with_capacity(4 * (segments + 1));
        for corner in [TOP_LEFT, TOP_RIGHT, BOTTOM_RIGHT, BOTTOM_LEFT] {
            let Corner { x: rx, y: ry } = self.corners[corner];
            if rx > 0.0 && ry > 0.0 {
                let (cx, cy, _, _) = self.corner_geometry(corner);
                // The first angle of each corner, clockwise from the top left: 180 degrees to 270, 270 to 360, ...
                let start = (corner as f32 + 2.0) * FRAC_PI_2;
                for step in 0..=segments {
                    let angle = start + FRAC_PI_2 * step as f32 / segments as f32;
                    let (sin, cos) = angle.sin_cos();
                    let radius_x = (rx + grow).max(0.0);
                    let radius_y = (ry + grow).max(0.0);
                    points.push(Vertex {
                        x: cx + radius_x * cos,
                        y: cy + radius_y * sin,
                    });
                }
            } else {
                let (sign_x, sign_y, x, y) = match corner {
                    TOP_LEFT => (-1.0, -1.0, self.x0, self.y0),
                    TOP_RIGHT => (1.0, -1.0, self.x1, self.y0),
                    BOTTOM_RIGHT => (1.0, 1.0, self.x1, self.y1),
                    _ => (-1.0, 1.0, self.x0, self.y1),
                };
                // One vertex stands in for the arc's points; repeating it keeps the loops the same length.
                for _ in 0..=segments {
                    points.push(Vertex {
                        x: x + sign_x * grow,
                        y: y + sign_y * grow,
                    });
                }
            }
        }
        points
    }
}

/// A vertex of an outline.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Vertex {
    pub x: f32,
    pub y: f32,
}

/// The most the chord of a corner's arc may be from the arc, in device pixels.
const ARC_TOLERANCE_PX: f32 = 0.02;
const MIN_ARC_SEGMENTS: usize = 6;
const MAX_ARC_SEGMENTS: usize = 48;

/// How many segments a quarter arc of this radius needs to stay within [`ARC_TOLERANCE_PX`] of the circle.
pub fn arc_segments(radius: f32) -> usize {
    if radius <= ARC_TOLERANCE_PX {
        return MIN_ARC_SEGMENTS;
    }
    let half_step = (1.0 - ARC_TOLERANCE_PX / radius).acos();
    let steps = (FRAC_PI_2 / (2.0 * half_step)).ceil();
    (steps as usize).clamp(MIN_ARC_SEGMENTS, MAX_ARC_SEGMENTS)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f32, b: f32) {
        assert!((a - b).abs() < 1e-3, "{a} != {b}");
    }

    #[test]
    fn radii_that_do_not_fit_are_scaled_together() {
        // A pill: radius 9999 on a 100 x 40 box becomes 20 on every corner.
        let pill = RRect::from_box(100.0, 40.0, [9999.0; 4]);
        for corner in pill.corners {
            close(corner.x, 20.0);
            close(corner.y, 20.0);
        }
        // Unequal radii keep their ratio: the factor is the smallest that fits.
        let uneven = RRect::from_box(100.0, 100.0, [80.0, 40.0, 0.0, 0.0]);
        close(uneven.corners[TOP_LEFT].x, 80.0 * 100.0 / 120.0);
        close(uneven.corners[TOP_RIGHT].x, 40.0 * 100.0 / 120.0);
    }

    #[test]
    fn spread_grows_a_rounded_corner_and_leaves_a_square_one() {
        let rect = RRect::from_box(100.0, 50.0, [8.0, 0.0, 8.0, 0.0]).outset(4.0);
        close(rect.x0, -4.0);
        close(rect.y1, 54.0);
        close(rect.corners[TOP_LEFT].x, 12.0);
        assert!(rect.corners[TOP_RIGHT].is_square());
        let shrunk = RRect::from_box(100.0, 50.0, [8.0; 4]).outset(-10.0);
        assert!(
            shrunk.corners[TOP_LEFT].is_square(),
            "a radius shrunk below zero is square"
        );
    }

    #[test]
    fn the_padding_box_is_inside_the_borders_with_elliptical_corners() {
        let rect = RRect::from_box(100.0, 50.0, [10.0; 4]).padding_box([2.0, 4.0, 6.0, 8.0]);
        close(rect.x0, 8.0);
        close(rect.y0, 2.0);
        close(rect.x1, 96.0);
        close(rect.y1, 44.0);
        // Top left: left border 8 and top border 2.
        close(rect.corners[TOP_LEFT].x, 2.0);
        close(rect.corners[TOP_LEFT].y, 8.0);
        // Bottom right: right border 4 and bottom 6.
        close(rect.corners[BOTTOM_RIGHT].x, 6.0);
        close(rect.corners[BOTTOM_RIGHT].y, 4.0);
    }

    #[test]
    fn distance_is_exact_on_the_edges_and_a_circular_corner() {
        let rect = RRect::from_box(100.0, 60.0, [10.0; 4]);
        close(rect.signed_distance(50.0, 0.0), 0.0);
        close(rect.signed_distance(50.0, -3.0), 3.0);
        close(rect.signed_distance(50.0, 5.0), -5.0);
        close(rect.signed_distance(-2.0, 30.0), 2.0);
        // The corner circle is centred at (10, 10): the point (10 - 5 * cos45, 10 - 5 * sin45) is 5 inside.
        let diagonal = 5.0 * std::f32::consts::FRAC_1_SQRT_2;
        close(rect.signed_distance(10.0 - diagonal, 10.0 - diagonal), -5.0);
        close(
            rect.signed_distance(0.0, 0.0),
            10.0 * (std::f32::consts::SQRT_2 - 1.0),
        );
        // A square corner: the distance to the corner point.
        let square = RRect::from_box(100.0, 60.0, [0.0; 4]);
        close(square.signed_distance(-3.0, -4.0), 5.0);
    }

    #[test]
    fn coverage_is_a_one_pixel_ramp_across_the_edge() {
        let rect = RRect::from_box(10.0, 10.0, [0.0; 4]);
        close(rect.coverage(0.5, 5.0), 1.0);
        close(rect.coverage(-0.5, 5.0), 0.0);
        close(rect.coverage(0.25, 5.0), 0.75);
        close(rect.coverage(5.0, 5.0), 1.0);
    }

    #[test]
    fn two_outlines_with_one_segment_count_pair_up() {
        let outer = RRect::from_box(40.0, 30.0, [8.0, 0.0, 8.0, 3.0]);
        let inner = outer.padding_box([2.0; 4]);
        let segments = arc_segments(8.0);
        assert_eq!(
            outer.outline(0.0, segments).len(),
            inner.outline(0.0, segments).len()
        );
        let points = outer.outline(0.0, segments);
        // The loop is closed on itself: the first point of the top left arc is above-left of its centre.
        close(points[0].x, 0.0);
        close(points[0].y, 8.0);
        close(points[segments].x, 8.0);
        close(points[segments].y, 0.0);
    }

    #[test]
    fn the_outline_grows_along_its_normal() {
        let rect = RRect::from_box(40.0, 30.0, [8.0; 4]);
        let grown = rect.outline(1.0, 8);
        // The topmost point of the loop is one pixel above the box.
        let top = grown
            .iter()
            .map(|point| point.y)
            .fold(f32::INFINITY, f32::min);
        close(top, -1.0);
        let left = grown
            .iter()
            .map(|point| point.x)
            .fold(f32::INFINITY, f32::min);
        close(left, -1.0);
    }

    #[test]
    fn arcs_get_more_segments_as_they_grow() {
        assert_eq!(arc_segments(1.0), MIN_ARC_SEGMENTS);
        assert!(arc_segments(16.0) > arc_segments(2.0));
        assert_eq!(arc_segments(100_000.0), MAX_ARC_SEGMENTS);
    }
}
