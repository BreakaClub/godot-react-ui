//! The coverage masks of what is drawn round and inside a box, baked on the CPU in device pixels. Nothing here touches Godot.
//!
//! A `box-shadow` layer is what Skia draws for a blurred rounded rectangle: a Gaussian of the layer's shape, cut by the
//! box where CSS says the shadow is not drawn. An outer shadow is not drawn inside the border box, so a translucent panel
//! does not show its shadow through; an inset shadow is drawn inside the padding box only. An outline is the ring between
//! two grown copies of the border box. One side of a border is the ring between the border box and the padding box,
//! cut along the mitres to its wedge. Each mask is one byte a pixel; the renderer tints it with a colour (`box_draw.rs`).
//!
//! The Gaussian of a rounded rectangle is integrated row by row: each row of the shape is an interval, whose horizontal
//! blur is a difference of two normal distribution functions, and the rows are weighted by a vertical Gaussian. The rows
//! between the corners are all the same interval, which is integrated exactly; the corners are summed in steps small enough
//! for the blur to hide the step.

use crate::rrect::{BOTTOM, BOTTOM_LEFT, BOTTOM_RIGHT, RIGHT, RRect, TOP, TOP_LEFT, TOP_RIGHT};

/// A standard deviation below this (device pixels) is drawn as a sharp edge: a Gaussian narrower than a pixel cannot be
/// sampled at pixel centres.
const SHARP_SIGMA_PX: f32 = 0.35;
/// The rows of a corner are summed in steps of a quarter of the standard deviation, between these bounds.
const STEP_PER_SIGMA: f32 = 0.25;
const MIN_STEP_PX: f32 = 0.25;
const MAX_STEP_PX: f32 = 8.0;
/// The rows farther than this many standard deviations from a pixel do not reach it.
const REACH_SIGMAS: f32 = 4.0;
const ALPHA_MAX: f32 = 255.0;
/// How far inside the border box the hole of a shadow under an opaque fill starts: past the fill's antialiased edge (one pixel
/// wide), where the fill covers the shadow whole.
const UNDER_FILL_INSET_PX: f32 = 1.0;

/// What a mask is the coverage of.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Shape {
    /// Outside the border box: the shadow of the box, with the box cut out. Under an opaque fill (`under_fill`) the cut is
    /// [`UNDER_FILL_INSET_PX`] inside the box's edge: Chrome does not cut an opaque box out of its shadow (it would leave a gap
    /// along the antialiased edge) and so the shadow, a ring above all, shows through the edge pixels the fill only partly covers.
    Outer {
        offset: (f32, f32),
        spread: f32,
        sigma: f32,
        under_fill: bool,
    },
    /// Inside the padding box: the box with the shadow's shape cut out.
    Inset {
        offset: (f32, f32),
        spread: f32,
        sigma: f32,
    },
    /// An outline: the ring between the border box grown by `inner` and by `outer` (either may be negative).
    Ring { inner: f32, outer: f32 },
    /// One side of the border (top, right, bottom, left, as `rrect` numbers them), cut to its wedge. A side that `extend`s runs half a
    /// pixel under its neighbours (which are drawn after it, over it): the mitre is antialiased by the neighbour alone, so no
    /// sliver of the page shows between two sides of different colours.
    Side { side: usize, extend: bool },
}

/// A mask's shape, in device pixels, relative to a border box whose top left corner is the origin.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MaskSpec {
    pub shape: Shape,
    pub width: f32,
    pub height: f32,
    /// The border box's radii: top left, top right, bottom right, bottom left.
    pub radii: [f32; 4],
    /// The border widths (top, right, bottom, left): they set the padding box.
    pub borders: [f32; 4],
    /// How many pixels around the border box the mask covers.
    pub margin: usize,
}

pub struct Mask {
    pub width: usize,
    pub height: usize,
    pub alpha: Vec<u8>,
}

/// The standard normal distribution function.
fn phi(z: f32) -> f32 {
    0.5 * (1.0 + erf(z * std::f32::consts::FRAC_1_SQRT_2))
}

/// The error function (Abramowitz and Stegun 7.1.26, absolute error under 1.5e-7).
fn erf(x: f32) -> f32 {
    const A: [f32; 5] = [
        0.254_829_6,
        -0.284_496_72,
        1.421_413_8,
        -1.453_152_1,
        1.061_405_4,
    ];
    const P: f32 = 0.327_591_1;
    let t = 1.0 / (1.0 + P * x.abs());
    let poly = t * (A[0] + t * (A[1] + t * (A[2] + t * (A[3] + t * A[4]))));
    let magnitude = 1.0 - poly * (-x * x).exp();
    magnitude.copysign(x)
}

/// The horizontal extent of the shape at height `v`: the left and right edges where the rounded corners have cut it.
fn row_extent(shape: &RRect, v: f32) -> (f32, f32) {
    let inset = |corner: usize, from_top: bool| -> f32 {
        let radius = shape.corners[corner];
        if radius.is_square() {
            return 0.0;
        }
        let distance = if from_top {
            shape.y0 + radius.y - v
        } else {
            v - (shape.y1 - radius.y)
        };
        if distance <= 0.0 {
            return 0.0;
        }
        let unit = (distance / radius.y).min(1.0);
        radius.x * (1.0 - (1.0 - unit * unit).sqrt())
    };
    (
        shape.x0 + inset(TOP_LEFT, true).max(inset(BOTTOM_LEFT, false)),
        shape.x1 - inset(TOP_RIGHT, true).max(inset(BOTTOM_RIGHT, false)),
    )
}

/// The Gaussian blur of the shape's indicator at the centre of every pixel of a `width x height` grid whose pixel
/// `(0, 0)` is at `(origin_x, origin_y)` in the shape's coordinates.
fn blurred(
    shape: &RRect,
    sigma: f32,
    origin_x: f32,
    origin_y: f32,
    width: usize,
    height: usize,
) -> Vec<f32> {
    if sigma < SHARP_SIGMA_PX {
        let mut out = Vec::with_capacity(width * height);
        for row in 0..height {
            for column in 0..width {
                out.push(
                    shape.coverage(origin_x + column as f32 + 0.5, origin_y + row as f32 + 0.5),
                );
            }
        }
        return out;
    }
    let columns: Vec<f32> = (0..width)
        .map(|column| origin_x + column as f32 + 0.5)
        .collect();
    // Where the corners end: above this the shape's rows vary, between the two it is a plain interval.
    let top_corner = shape.corners[TOP_LEFT].y.max(shape.corners[TOP_RIGHT].y);
    let bottom_corner = shape.corners[BOTTOM_LEFT]
        .y
        .max(shape.corners[BOTTOM_RIGHT].y);
    let mut zone_top = (shape.y0 + top_corner).min(shape.y1);
    let mut zone_bottom = (shape.y1 - bottom_corner).max(shape.y0);
    if zone_top > zone_bottom {
        let middle = (zone_top + zone_bottom) * 0.5;
        zone_top = middle;
        zone_bottom = middle;
    }
    let step = (sigma * STEP_PER_SIGMA).clamp(MIN_STEP_PX, MAX_STEP_PX);
    // The summed rows (the corners) as (height of the row, its horizontal blur at every column).
    let mut rows: Vec<(f32, f32, Vec<f32>)> = Vec::new();
    for (from, to) in [(shape.y0, zone_top), (zone_bottom, shape.y1)] {
        let length = to - from;
        if length <= 0.0 {
            continue;
        }
        let count = (length / step).ceil().max(1.0) as usize;
        let thickness = length / count as f32;
        for index in 0..count {
            let v = from + (index as f32 + 0.5) * thickness;
            let (left, right) = row_extent(shape, v);
            let profile = columns
                .iter()
                .map(|x| phi((x - left) / sigma) - phi((x - right) / sigma))
                .collect();
            rows.push((v, thickness, profile));
        }
    }
    let middle_profile: Vec<f32> = columns
        .iter()
        .map(|x| phi((x - shape.x0) / sigma) - phi((x - shape.x1) / sigma))
        .collect();
    let reach = REACH_SIGMAS * sigma;
    let normal = 1.0 / (sigma * (2.0 * std::f32::consts::PI).sqrt());
    let mut out = vec![0.0_f32; width * height];
    for row in 0..height {
        let y = origin_y + row as f32 + 0.5;
        let weight_of = |v: f32, thickness: f32| -> f32 {
            let z = (y - v) / sigma;
            normal * (-0.5 * z * z).exp() * thickness
        };
        let middle_weight = if zone_bottom > zone_top {
            phi((y - zone_top) / sigma) - phi((y - zone_bottom) / sigma)
        } else {
            0.0
        };
        let line = &mut out[row * width..(row + 1) * width];
        if middle_weight > 0.0 {
            for (value, profile) in line.iter_mut().zip(&middle_profile) {
                *value += middle_weight * profile;
            }
        }
        for (v, thickness, profile) in &rows {
            if (y - v).abs() > reach {
                continue;
            }
            let weight = weight_of(*v, *thickness);
            for (value, profile) in line.iter_mut().zip(profile) {
                *value += weight * profile;
            }
        }
    }
    for value in &mut out {
        *value = value.clamp(0.0, 1.0);
    }
    out
}

/// The coverage of a half plane bounded by the mitre line of one corner: the side of the line that `reference` is on.
#[derive(Clone, Copy)]
struct Wedge {
    origin: (f32, f32),
    direction: (f32, f32),
    sign: f32,
}

impl Wedge {
    /// The share of the pixel on the kept side of the line: a ramp one pixel wide across it, or, when `extend`, the same ramp half a
    /// pixel further out.
    fn coverage(&self, x: f32, y: f32, extend: bool) -> f32 {
        let length = self.direction.0.hypot(self.direction.1);
        let cross = self.direction.0 * (y - self.origin.1) - self.direction.1 * (x - self.origin.0);
        let edge = if extend { 1.0 } else { 0.5 };
        (edge + self.sign * cross / length).clamp(0.0, 1.0)
    }
}

/// The two half planes that bound a side of the border: from each end's corner of the border box to the same corner of the
/// padding box (CSS Backgrounds 3 section 5.2). A corner whose two sides have no width has no mitre.
fn wedges(border_box: &RRect, padding_box: &RRect, side: usize) -> Vec<Wedge> {
    let corner_point = |rect: &RRect, corner: usize| -> (f32, f32) {
        match corner {
            TOP_LEFT => (rect.x0, rect.y0),
            TOP_RIGHT => (rect.x1, rect.y0),
            BOTTOM_RIGHT => (rect.x1, rect.y1),
            _ => (rect.x0, rect.y1),
        }
    };
    let (first, second) = match side {
        TOP => (TOP_LEFT, TOP_RIGHT),
        RIGHT => (TOP_RIGHT, BOTTOM_RIGHT),
        BOTTOM => (BOTTOM_RIGHT, BOTTOM_LEFT),
        _ => (BOTTOM_LEFT, TOP_LEFT),
    };
    let mut wedges = Vec::new();
    for (corner, toward) in [(first, second), (second, first)] {
        let outside = corner_point(border_box, corner);
        let inside = corner_point(padding_box, corner);
        let direction = (inside.0 - outside.0, inside.1 - outside.1);
        if direction == (0.0, 0.0) {
            continue;
        }
        // The side is on the same side of the line as a point along the border box's edge towards the other end.
        let along = corner_point(border_box, toward);
        let step = ((along.0 - outside.0).hypot(along.1 - outside.1)).max(1.0);
        let reference = (
            outside.0 + (along.0 - outside.0) / step,
            outside.1 + (along.1 - outside.1) / step,
        );
        let cross =
            direction.0 * (reference.1 - outside.1) - direction.1 * (reference.0 - outside.0);
        wedges.push(Wedge {
            origin: outside,
            direction,
            sign: if cross < 0.0 { -1.0 } else { 1.0 },
        });
    }
    wedges
}

/// Bake the mask.
pub fn bake(spec: &MaskSpec) -> Mask {
    let margin = spec.margin as f32;
    let width = (spec.width + 2.0 * margin).ceil().max(1.0) as usize;
    let height = (spec.height + 2.0 * margin).ceil().max(1.0) as usize;
    let border_box = RRect::from_box(spec.width, spec.height, spec.radii);
    let origin = -margin;
    let centre = |index: usize| -> (f32, f32) {
        (
            origin + (index % width) as f32 + 0.5,
            origin + (index / width) as f32 + 0.5,
        )
    };
    let alpha: Vec<f32> = match spec.shape {
        Shape::Outer {
            offset,
            spread,
            sigma,
            under_fill,
        } => {
            let shape = border_box.translated(offset.0, offset.1).outset(spread);
            let cast = blurred(&shape, sigma, origin, origin, width, height);
            let hole = if under_fill {
                border_box.outset(-UNDER_FILL_INSET_PX)
            } else {
                border_box
            };
            cast.iter()
                .enumerate()
                .map(|(index, value)| {
                    let (x, y) = centre(index);
                    value * (1.0 - hole.coverage(x, y))
                })
                .collect()
        }
        Shape::Inset {
            offset,
            spread,
            sigma,
        } => {
            let padding = border_box.padding_box(spec.borders);
            let hole = padding.translated(offset.0, offset.1).outset(-spread);
            let cast = blurred(&hole, sigma, origin, origin, width, height);
            cast.iter()
                .enumerate()
                .map(|(index, value)| {
                    let (x, y) = centre(index);
                    (1.0 - value) * padding.coverage(x, y)
                })
                .collect()
        }
        Shape::Ring { inner, outer } => {
            let outside = border_box.outset(outer);
            let inside = border_box.outset(inner);
            (0..width * height)
                .map(|index| {
                    let (x, y) = centre(index);
                    (outside.coverage(x, y) - inside.coverage(x, y)).max(0.0)
                })
                .collect()
        }
        Shape::Side { side, extend } => {
            let padding = border_box.padding_box(spec.borders);
            let planes = wedges(&border_box, &padding, side);
            (0..width * height)
                .map(|index| {
                    let (x, y) = centre(index);
                    // The padding box is inside the border box: the ring is the difference of their coverages, which is nothing where their
                    // edges coincide (a product would leave a quarter of the colour on every antialiased pixel there).
                    let ring = (border_box.coverage(x, y) - padding.coverage(x, y)).max(0.0);
                    planes
                        .iter()
                        .fold(ring, |total, plane| total * plane.coverage(x, y, extend))
                })
                .collect()
        }
    };
    Mask {
        width,
        height,
        alpha: alpha
            .into_iter()
            .map(|value| (value.clamp(0.0, 1.0) * ALPHA_MAX).round() as u8)
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn outer(
        width: f32,
        height: f32,
        radius: f32,
        offset: (f32, f32),
        spread: f32,
        sigma: f32,
        margin: usize,
    ) -> MaskSpec {
        MaskSpec {
            shape: Shape::Outer {
                offset,
                spread,
                sigma,
                under_fill: false,
            },
            width,
            height,
            radii: [radius; 4],
            borders: [0.0; 4],
            margin,
        }
    }

    fn at(mask: &Mask, margin: usize, x: i32, y: i32) -> u8 {
        let column = (x + margin as i32) as usize;
        let row = (y + margin as i32) as usize;
        mask.alpha[row * mask.width + column]
    }

    /// The blur of a rounded rectangle by direct convolution of a supersampled indicator with a truncated kernel.
    fn brute_force(shape: &RRect, sigma: f32, x: f32, y: f32) -> f32 {
        const SUBSAMPLES: i32 = 4;
        let reach = (4.0 * sigma).ceil() as i32;
        let mut total = 0.0;
        let mut weights = 0.0;
        for dy in -reach * SUBSAMPLES..=reach * SUBSAMPLES {
            for dx in -reach * SUBSAMPLES..=reach * SUBSAMPLES {
                let ox = dx as f32 / SUBSAMPLES as f32;
                let oy = dy as f32 / SUBSAMPLES as f32;
                let weight = (-(ox * ox + oy * oy) / (2.0 * sigma * sigma)).exp();
                weights += weight;
                // A sharp indicator (no anti-aliasing) at the sample.
                let inside = shape.signed_distance(x + ox, y + oy) <= 0.0;
                if inside {
                    total += weight;
                }
            }
        }
        total / weights
    }

    #[test]
    fn the_normal_distribution_function_is_accurate() {
        for (z, expected) in [
            (0.0, 0.5),
            (1.0, 0.841_344_7),
            (-1.0, 0.158_655_3),
            (2.0, 0.977_249_9),
            (-3.0, 0.001_349_9),
        ] {
            assert!(
                (phi(z) - expected).abs() < 2e-6,
                "{z}: {} != {expected}",
                phi(z)
            );
        }
    }

    #[test]
    fn the_integrated_blur_matches_a_brute_force_convolution() {
        let shape = RRect::from_box(40.0, 30.0, [8.0, 8.0, 8.0, 8.0]);
        let sigma = 3.0;
        let grid = blurred(&shape, sigma, -12.0, -12.0, 64, 54);
        let mut worst = 0.0_f32;
        for (column, row) in [
            (0, 0),
            (6, 6),
            (12, 12),
            (20, 3),
            (3, 20),
            (32, 27),
            (50, 40),
            (63, 53),
            (10, 40),
            (25, 25),
        ] {
            let x = -12.0 + column as f32 + 0.5;
            let y = -12.0 + row as f32 + 0.5;
            let expected = brute_force(&shape, sigma, x, y);
            let got = grid[row * 64 + column];
            worst = worst.max((got - expected).abs());
        }
        assert!(worst < 0.01, "worst difference {worst}");
    }

    #[test]
    fn an_outer_shadow_is_not_drawn_inside_the_box() {
        let mask = bake(&outer(60.0, 40.0, 6.0, (0.0, 8.0), 0.0, 6.0, 30));
        // Deep inside the box: nothing, though the shadow's shape is there.
        assert_eq!(at(&mask, 30, 30, 20), 0);
        assert_eq!(at(&mask, 30, 10, 10), 0);
        // Below the box: the shadow, fading with the distance.
        let near = at(&mask, 30, 30, 42);
        let far = at(&mask, 30, 30, 60);
        assert!(near > 100, "{near}");
        assert!(far < near / 2, "{far}");
        // Far enough outside: nothing.
        assert_eq!(at(&mask, 30, 30, 69), 0);
    }

    #[test]
    fn under_an_opaque_fill_the_shadow_runs_under_the_antialiased_edge() {
        // box-shadow: 0 0 0 4px under an opaque box: Chrome paints the ring whole and the fill over it, so the pixels along the
        // box's edge that the fill covers only partly show the ring under them.
        let mut spec = outer(60.0, 40.0, 0.0, (0.0, 0.0), 4.0, 0.0, 6);
        let cut = bake(&spec);
        spec.shape = Shape::Outer {
            offset: (0.0, 0.0),
            spread: 4.0,
            sigma: 0.0,
            under_fill: true,
        };
        let under = bake(&spec);
        for x in 10..50 {
            assert_eq!(at(&cut, 6, x, 0), 0, "cut out: the first row of the box");
            assert_eq!(
                at(&under, 6, x, 0),
                255,
                "under the fill: the ring is there"
            );
            assert_eq!(at(&under, 6, x, 1), 0, "a row in, the fill covers it whole");
            assert_eq!(at(&under, 6, x, 20), 0);
            // Outside the box the two are the same ring.
            assert_eq!(at(&under, 6, x, -1), at(&cut, 6, x, -1));
        }
    }

    #[test]
    fn a_hard_ring_is_one_clean_band() {
        // box-shadow: 0 0 0 4px: an annulus four pixels wide, hard at both edges on pixel boundaries.
        let mask = bake(&outer(60.0, 40.0, 0.0, (0.0, 0.0), 4.0, 0.0, 6));
        for x in 10..50 {
            assert_eq!(at(&mask, 6, x, -1), 255);
            assert_eq!(at(&mask, 6, x, -4), 255);
            assert_eq!(at(&mask, 6, x, -5), 0);
            assert_eq!(at(&mask, 6, x, 0), 0);
        }
    }

    #[test]
    fn a_rounded_ring_follows_the_corner() {
        let mask = bake(&outer(60.0, 40.0, 10.0, (0.0, 0.0), 3.0, 0.0, 6));
        // The corner arc's centre is at (10, 10); the ring is the arc grown by 3 (radius 13), so 11.5 from the centre
        // is in the ring and 14.5 is out.
        let diagonal = std::f32::consts::FRAC_1_SQRT_2;
        let pixel = |distance: f32| {
            at(
                &mask,
                6,
                (10.0 - distance * diagonal) as i32,
                (10.0 - distance * diagonal) as i32,
            )
        };
        assert!(pixel(11.5) > 200, "{}", pixel(11.5));
        assert!(pixel(5.0) == 0, "inside the box");
        assert!(pixel(16.0) == 0, "outside the ring");
    }

    #[test]
    fn an_inset_shadow_is_inside_the_padding_box() {
        let spec = MaskSpec {
            shape: Shape::Inset {
                offset: (0.0, 4.0),
                spread: 0.0,
                sigma: 3.0,
            },
            width: 60.0,
            height: 40.0,
            radii: [6.0; 4],
            borders: [2.0; 4],
            margin: 0,
        };
        let mask = bake(&spec);
        // Outside the padding box (in the border): nothing. At the top edge, offset down: the shadow is strongest there.
        assert_eq!(at(&mask, 0, 30, 0), 0);
        assert_eq!(at(&mask, 0, 30, 1), 0);
        let top = at(&mask, 0, 30, 3);
        let bottom = at(&mask, 0, 30, 36);
        assert!(top > 150, "{top}");
        assert!(bottom < top / 2, "{bottom}");
        // The middle of the box is clear of it.
        assert_eq!(at(&mask, 0, 30, 20), 0);
    }

    #[test]
    fn an_inset_ring_is_a_band_inside_the_border() {
        // ring-inset ring-2: inset 0 0 0 2px.
        let spec = MaskSpec {
            shape: Shape::Inset {
                offset: (0.0, 0.0),
                spread: 2.0,
                sigma: 0.0,
            },
            width: 40.0,
            height: 30.0,
            radii: [0.0; 4],
            borders: [0.0; 4],
            margin: 0,
        };
        let mask = bake(&spec);
        assert_eq!(at(&mask, 0, 20, 0), 255);
        assert_eq!(at(&mask, 0, 20, 1), 255);
        assert_eq!(at(&mask, 0, 20, 2), 0);
        assert_eq!(at(&mask, 0, 0, 15), 255);
        assert_eq!(at(&mask, 0, 20, 15), 0);
    }

    #[test]
    fn the_mask_has_the_size_of_the_box_and_its_margin() {
        let mask = bake(&outer(60.0, 40.0, 0.0, (0.0, 0.0), 0.0, 2.0, 10));
        assert_eq!((mask.width, mask.height), (80, 60));
        assert_eq!(mask.alpha.len(), 80 * 60);
    }

    #[test]
    fn an_outline_is_a_ring_clear_of_the_box() {
        // outline-2 outline-offset-2: the ring from 2 to 4 pixels outside the box.
        let spec = MaskSpec {
            shape: Shape::Ring {
                inner: 2.0,
                outer: 4.0,
            },
            width: 40.0,
            height: 30.0,
            radii: [0.0; 4],
            borders: [0.0; 4],
            margin: 6,
        };
        let mask = bake(&spec);
        assert_eq!(at(&mask, 6, 20, -1), 0, "the gap");
        assert_eq!(at(&mask, 6, 20, -2), 0, "the gap");
        assert_eq!(at(&mask, 6, 20, -3), 255);
        assert_eq!(at(&mask, 6, 20, -4), 255);
        assert_eq!(at(&mask, 6, 20, -5), 0);
        assert_eq!(at(&mask, 6, 20, 15), 0, "inside the box");
        // A negative offset draws it inside.
        let inside = bake(&MaskSpec {
            shape: Shape::Ring {
                inner: -4.0,
                outer: -2.0,
            },
            margin: 0,
            ..spec
        });
        assert_eq!(at(&inside, 0, 20, 0), 0);
        assert_eq!(at(&inside, 0, 20, 2), 255);
        assert_eq!(at(&inside, 0, 20, 3), 255);
        assert_eq!(at(&inside, 0, 20, 4), 0);
    }

    #[test]
    fn the_sides_of_a_border_tile_the_ring_along_the_mitres() {
        // Top 4, right 4, bottom 4, left 10 on a 40 x 30 box. The top left mitre goes from (0, 0) to (10, 4).
        let spec = |side: usize| MaskSpec {
            shape: Shape::Side {
                side,
                extend: false,
            },
            width: 40.0,
            height: 30.0,
            radii: [0.0; 4],
            borders: [4.0, 4.0, 4.0, 10.0],
            margin: 0,
        };
        let sides = [TOP, RIGHT, BOTTOM, 3].map(|side| bake(&spec(side)));
        let total =
            |x: i32, y: i32| -> i32 { sides.iter().map(|mask| i32::from(at(mask, 0, x, y))).sum() };
        // The ring is covered exactly once, away from the mitres; the middle of the box not at all.
        for (x, y) in [(20, 1), (20, 28), (1, 15), (38, 15), (5, 20), (30, 2)] {
            assert_eq!(total(x, y), 255, "({x}, {y})");
        }
        assert_eq!(total(20, 15), 0);
        // On either side of the top left mitre: (6, 1) is the top's, (6, 3) the left's.
        assert_eq!(at(&sides[0], 0, 6, 1), 255);
        assert_eq!(at(&sides[3], 0, 6, 1), 0);
        assert_eq!(at(&sides[3], 0, 6, 3), 255);
        assert_eq!(at(&sides[0], 0, 6, 3), 0);
        // A single side is its whole band, with no stray coverage along the zero-width sides of a rounded box.
        let bottom = bake(&MaskSpec {
            shape: Shape::Side {
                side: BOTTOM,
                extend: false,
            },
            width: 40.0,
            height: 30.0,
            radii: [8.0; 4],
            borders: [0.0, 0.0, 3.0, 0.0],
            margin: 0,
        });
        assert_eq!(at(&bottom, 0, 20, 0), 0);
        assert_eq!(at(&bottom, 0, 0, 12), 0);
        assert_eq!(at(&bottom, 0, 20, 28), 255);
        assert_eq!(at(&bottom, 0, 20, 26), 0);
    }

    #[test]
    fn a_bottom_border_under_a_pill_top_is_nowhere_near_the_top() {
        // rounded-t-full border-b-4 on 64 x 56: the top arc is the border box's and the padding box's alike, so no border there.
        let bottom = bake(&MaskSpec {
            shape: Shape::Side {
                side: BOTTOM,
                extend: false,
            },
            width: 64.0,
            height: 56.0,
            radii: [9999.0, 9999.0, 0.0, 0.0],
            borders: [0.0, 0.0, 4.0, 0.0],
            margin: 0,
        });
        let strongest = (0..40_usize)
            .flat_map(|row| (0..64_usize).map(move |column| (row, column)))
            .map(|(row, column)| bottom.alpha[row * bottom.width + column])
            .max()
            .unwrap_or(0);
        assert_eq!(
            strongest, 0,
            "nothing of the bottom border above its own rows"
        );
    }
}
