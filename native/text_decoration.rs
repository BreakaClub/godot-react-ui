//! Decoration lines in the five CSS styles (`text-decoration-style`), drawn as Chrome draws them. A line is drawn per *fragment*:
//! the stretch of one text run on one line, as Chrome paints a decoration once per inline box fragment, so a wavy or dashed
//! pattern starts again at every span boundary and every wrapped line (`docs/tracks/rich-text.md`, "Decoration styles").
//!
//! The geometry is Blink's, read off its pixels (headless Chrome 156, JetBrains Mono and Open Sans at 12 to 48 px, device pixel
//! ratios 1 and 2, thicknesses 1 to 10), not recalled from its source:
//!
//! - **solid**: the band of `text_style::metrics::Decorator`, as before.
//! - **double**: two bands of the thickness `T` with one CSS px between them: the first where the solid band is, the second below it for
//!   an underline and a line through the text and above it for an overline (`Geometry`).
//! - **dashed**: butt dashes of `3T` with gaps of `2T` for `T < 3`, `2T` and `T` otherwise, on the solid band's rows. A line `L` long
//!   (the whole CSS px between its floored ends) is fitted: the number of dashes is the one of the two nearest whole numbers that
//!   keeps the gap nearest the nominal, and the gap is stretched to make the first dash start at the left end and the last end at
//!   the right (`fit_gap`).
//! - **dotted**: squares of `T` every `2T` for `T < 4` (the last one cut by the line's end), round dots of diameter `T` fitted like
//!   dashes for `T >= 4`.
//! - **wavy**: a cubic Bezier S-curve, one cubic per period, stroked `w` wide with butt caps (`Wave`), antialiased with 4 samples
//!   per pixel (`raster`), anchored at the fragment's left edge rounded to a device pixel, and cut off, not completed, at its right.
//!
//! The overline and the line through the text have the same patterns as the underline and rows of their own (`Geometry`), measured the
//! same way. A fractional explicit thickness is rounded half up to whole CSS px (at least one) for every style but solid. `auto`
//! thickness on a dotted or dashed line is Chrome's antialiased half-pixel stroke, which is drawn here as the nearest whole pixels.
//! Everything here is Godot-free; `text_paragraph/draw.rs` draws the plans.

pub(crate) mod raster;

use crate::text_style::metrics::{DecorationFont, Decorator};
use crate::text_style::spec::{DecorationStyleSpec, DecorationThickness};
use crate::text_style::TextDecoration;

/// Which of the three lines of a decoration.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum LineKind {
    Underline,
    Overline,
    LineThrough,
}

/// One stretch of a decorated run on one line, in logical px. `baseline` is on the device grid.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Fragment {
    pub(crate) left: f32,
    pub(crate) right: f32,
    pub(crate) baseline: f32,
}

/// A filled rectangle in logical px.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct PlanRect {
    pub(crate) x: f32,
    pub(crate) y: f32,
    pub(crate) width: f32,
    pub(crate) height: f32,
}

/// A wavy line: Chrome's wave of stroke width `wave.width`, from device pixel `left` (logical px) to `right`, with the centre line
/// `center` (logical px, from the top of the page) below the baseline.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct WavePlan {
    pub(crate) wave: Wave,
    pub(crate) left: f32,
    pub(crate) right: f32,
    pub(crate) center: f32,
}

/// Round dots of diameter `diameter` (logical px) with their centres at `centers` (x) on the row `center_y`.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct DotsPlan {
    pub(crate) diameter: f32,
    pub(crate) centers: Vec<f32>,
    pub(crate) center_y: f32,
    pub(crate) clip_right: f32,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum Shape {
    Rect(PlanRect),
    Wave(WavePlan),
    Dots(DotsPlan),
}

/// Chrome's wavy line, in CSS px.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Wave {
    /// The stroke width: the whole thickness, or the font size over ten for `auto`.
    pub(crate) width: f32,
    /// The length of one period: `3 + 2 floor(2 w)`.
    pub(crate) period: f32,
    /// How far the cubic's control points are from the centre line: `1.5 + floor(3 w)`.
    pub(crate) control: f32,
}

impl Wave {
    pub(crate) fn new(width: f32) -> Self {
        Self {
            width,
            period: 3.0 + 2.0 * (2.0 * width).floor(),
            control: 1.5 + (3.0 * width).floor(),
        }
    }

    /// The centre line's height above and below its rest at the crest and the trough of the curve (half the peak to peak
    /// amplitude, which is `sqrt(3) (w + 1/2)`).
    pub(crate) fn amplitude(&self) -> f32 {
        // The cubic y(t) = 3 d t (1 - t) (1 - 2t) peaks at t = (3 - sqrt 3) / 6, where it is d sqrt(3) / 6.
        self.control * 3.0_f32.sqrt() / 6.0
    }

    /// The point of the centre line `t` of the way along a period: (x, y) from the period's start on the centre line.
    pub(crate) fn point(&self, t: f32) -> (f32, f32) {
        (
            self.period * (1.5 * t * (1.0 - t) + t * t * t),
            3.0 * self.control * t * (1.0 - t) * (1.0 - 2.0 * t),
        )
    }
}

/// An underline's wave has its centre line this far below the rounded lower edge of a solid line of the wave's thickness (CSS px).
const WAVE_CENTRE_BELOW_EDGE: f32 = 1.5;
/// The thickness of `auto`: Blink's font size over this.
const AUTO_THICKNESS_DIVISOR: f32 = 10.0;
/// A dashed line's dash and gap, in thicknesses, below and from this thickness.
const SHORT_LINE_THICKNESS: f32 = 3.0;
const DASH_SHORT: f32 = 3.0;
const DASH_LONG: f32 = 2.0;
const GAP_SHORT: f32 = 2.0;
const GAP_LONG: f32 = 1.0;
/// Dots are squares below this thickness and round from it.
const ROUND_DOT_THICKNESS: f32 = 4.0;
/// The space between the two lines of a double decoration, in CSS px.
const DOUBLE_GAP: f32 = 1.0;
/// An `auto` overline's second line is `floor(w + 0.4) + 1` from the first: the unrounded stroke rounds up from this far below a half.
const OVERLINE_AUTO_ROUNDING: f32 = 0.4;

/// A fitted dashed or dotted line: how many dashes and the gap between them.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Fit {
    pub(crate) count: usize,
    pub(crate) gap: f32,
}

/// Blink's `SelectBestDashGap`: dashes of `dash` and nominal gaps of `nominal_gap` fitted into `length` so that the first starts at
/// one end and the last ends at the other. Of the two counts around the nominal one, the one whose gap is nearer the nominal is used;
/// a line too short for two dashes is one dash.
pub(crate) fn fit_gap(length: f32, dash: f32, nominal_gap: f32) -> Fit {
    let lower = ((length + nominal_gap) / (dash + nominal_gap)).floor().max(0.0) as usize;
    let gap_for = |count: usize| {
        (count > 1).then(|| (length - count as f32 * dash) / (count - 1) as f32)
    };
    let smaller = gap_for(lower).map(|gap| Fit { count: lower, gap });
    let larger = gap_for(lower + 1)
        .filter(|gap| *gap > 0.0)
        .map(|gap| Fit { count: lower + 1, gap });
    match (smaller, larger) {
        (Some(smaller), Some(larger)) => {
            if (smaller.gap - nominal_gap).abs() < (larger.gap - nominal_gap).abs() {
                smaller
            } else {
                larger
            }
        }
        (Some(only), None) | (None, Some(only)) => only,
        (None, None) => Fit { count: 1, gap: 0.0 },
    }
}

/// The thickness numbers a patterned line is built from.
#[derive(Clone, Copy, Debug, PartialEq)]
struct Thickness {
    /// The wave's stroke width (CSS px, fractional for `auto`).
    stroke: f32,
    /// The whole thickness that dashes and dots are built from.
    whole: f32,
    /// The thickness of the solid line and of the lines of a double: the same as `whole` unless `auto` (a tenth of the font size
    /// rounded down).
    drawn: f32,
    auto: bool,
}

fn round_half_up(value: f32) -> f32 {
    (value + 0.5).floor()
}

fn thickness(requested: DecorationThickness, font: DecorationFont) -> Option<Thickness> {
    let whole = |value: f32| {
        let whole = round_half_up(value).max(1.0);
        Thickness { stroke: whole, whole, drawn: whole, auto: false }
    };
    match requested {
        DecorationThickness::Px(px) if px <= 0.0 => None,
        DecorationThickness::Px(px) => Some(whole(px)),
        DecorationThickness::Auto => {
            let stroke = (font.size / AUTO_THICKNESS_DIVISOR).max(1.0);
            Some(Thickness {
                stroke,
                whole: round_half_up(stroke).max(1.0),
                drawn: (font.size / AUTO_THICKNESS_DIVISOR).floor().max(1.0),
                auto: true,
            })
        }
        DecorationThickness::FromFont => Some(whole(font.underline_thickness)),
    }
}

/// Where the rows of a decoration line are, in CSS px from the baseline (y down), for each of the three lines. Chrome's rules, with
/// `A` the font's ascent rounded to a whole pixel, `w` the stroke and `T` the drawn thickness:
///
/// | line | solid and double's first line | dotted and dashed | wavy centre line |
/// | --- | --- | --- | --- |
/// | underline | `g` (the offset, else `ceil(w / 2)`, at least 1) | the same | `round(g + w) + 1.5` |
/// | overline | `-A - T` | the same | `round(-A - w - T) - 0.5` |
/// | line through | `floor(-A / 3 - w / 2 + 1/2)` | `floor(-ceil(A / 3) - T / 2 + 1/2)` | `round(-A / 3 - w / 2) + 1/2` |
///
/// A double's second line is `D` from the first, below it for an underline and a line through the text, above it for an overline:
/// `T + 1` (`auto` has `round(w) + 1` for an underline and `floor(w + 0.4) + 1` for an overline).
#[derive(Clone, Copy, Debug)]
struct Geometry {
    kind: LineKind,
    ascent: f32,
    thickness: Thickness,
    /// The `text-underline-offset`, which an underline has and the other lines ignore.
    offset: Option<f32>,
}

impl Geometry {
    fn underline_top(&self) -> f32 {
        self.offset
            .unwrap_or_else(|| (self.thickness.stroke / 2.0).ceil().max(1.0))
    }

    /// The top of a solid-position line of height `height`, the top of a double's first line and of a dashed or dotted one.
    fn top(&self, height: f32, patterned_line_through: bool) -> f32 {
        match self.kind {
            LineKind::Underline => self.underline_top(),
            LineKind::Overline => -self.ascent - height,
            LineKind::LineThrough if patterned_line_through => {
                (-(self.ascent / 3.0).ceil() - height / 2.0 + 0.5).floor()
            }
            LineKind::LineThrough => (-self.ascent / 3.0 - self.thickness.stroke / 2.0 + 0.5).floor(),
        }
    }

    /// How far the second line of a double is from the first.
    fn double_distance(&self) -> f32 {
        let t = self.thickness;
        if !t.auto {
            return t.drawn + DOUBLE_GAP;
        }
        match self.kind {
            LineKind::Underline => round_half_up(t.stroke) + DOUBLE_GAP,
            LineKind::Overline => (t.stroke + OVERLINE_AUTO_ROUNDING).floor() + DOUBLE_GAP,
            LineKind::LineThrough => t.drawn + DOUBLE_GAP,
        }
    }

    /// The wave's centre line, rounded to a device pixel as Chrome rounds it.
    fn wave_center(&self, scale: f32) -> f32 {
        let w = self.thickness.stroke;
        let round = |value: f32| (value * scale).round() / scale;
        match self.kind {
            LineKind::Underline => round(self.underline_top() + w) + WAVE_CENTRE_BELOW_EDGE,
            LineKind::Overline => round(-self.ascent - w - self.thickness.drawn) - 0.5,
            LineKind::LineThrough => round(-self.ascent / 3.0 - w / 2.0) + 0.5,
        }
    }
}

/// What to draw for one line of `decoration` over `fragment`. Empty when the thickness is zero.
pub(crate) fn shapes(
    decoration: &TextDecoration,
    kind: LineKind,
    font: DecorationFont,
    scale: f32,
    fragment: Fragment,
) -> Vec<Shape> {
    let decorator = Decorator::new(font, decoration.thickness, decoration.underline_offset, scale);
    let solid_band = match kind {
        LineKind::Underline => decorator.underline(),
        LineKind::Overline => decorator.overline(),
        LineKind::LineThrough => decorator.line_through(),
    };
    let Some(band) = solid_band else {
        return Vec::new();
    };
    if decoration.style == DecorationStyleSpec::Solid {
        return vec![Shape::Rect(PlanRect {
            x: fragment.left,
            y: fragment.baseline + band.top,
            width: fragment.right - fragment.left,
            height: band.height,
        })];
    }
    let Some(thickness) = thickness(decoration.thickness, font) else {
        return Vec::new();
    };
    let geometry = Geometry {
        kind,
        ascent: font.ascent.round(),
        thickness,
        offset: decoration.underline_offset,
    };
    patterned(decoration.style, geometry, scale, fragment)
}

fn patterned(style: DecorationStyleSpec, geometry: Geometry, scale: f32, fragment: Fragment) -> Vec<Shape> {
    let device = |value: f32| (value * scale).round() / scale;
    let row = |top: f32, height: f32| -> (f32, f32) {
        (fragment.baseline + device(top), device(height).max(1.0 / scale))
    };
    let width = fragment.right - fragment.left;
    let thickness = geometry.thickness;
    let whole = thickness.whole;
    match style {
        DecorationStyleSpec::Solid => unreachable!("solid lines are drawn from their band"),
        DecorationStyleSpec::Double => {
            let first = geometry.top(thickness.drawn, false);
            let distance = geometry.double_distance();
            // An overline's pair keeps its order top to bottom: the second line is above the first.
            let second = if geometry.kind == LineKind::Overline { first - distance } else { first + distance };
            [first, second]
                .into_iter()
                .map(|top| {
                    let (y, height) = row(top, thickness.drawn);
                    Shape::Rect(PlanRect { x: fragment.left, y, width, height })
                })
                .collect()
        }
        DecorationStyleSpec::Dashed => {
            let (dash, nominal) = if whole < SHORT_LINE_THICKNESS {
                (DASH_SHORT * whole, GAP_SHORT * whole)
            } else {
                (DASH_LONG * whole, GAP_LONG * whole)
            };
            let (y, height) = row(geometry.top(whole, true), whole);
            let start = fragment.left.floor();
            let length = fragment.right.floor() - start;
            let fit = fit_gap(length, dash, nominal);
            (0..fit.count)
                .map(|k| {
                    let from = start + k as f32 * (dash + fit.gap);
                    let to = (from + dash).min(start + length);
                    Shape::Rect(PlanRect { x: device(from), y, width: device(to) - device(from), height })
                })
                .collect()
        }
        DecorationStyleSpec::Dotted if whole < ROUND_DOT_THICKNESS => {
            let (y, height) = row(geometry.top(whole, true), whole);
            let start = fragment.left.floor();
            let end = fragment.right.floor();
            let mut x = start;
            let mut rects = Vec::new();
            while x < end {
                let to = (x + whole).min(end);
                rects.push(Shape::Rect(PlanRect { x: device(x), y, width: device(to) - device(x), height }));
                x += 2.0 * whole;
            }
            rects
        }
        DecorationStyleSpec::Dotted => {
            let start = fragment.left.floor();
            let length = fragment.right.floor() - start;
            let fit = fit_gap(length, whole, whole);
            let pitch = whole + fit.gap;
            vec![Shape::Dots(DotsPlan {
                diameter: whole,
                centers: (0..fit.count).map(|k| start + whole / 2.0 + k as f32 * pitch).collect(),
                center_y: fragment.baseline + geometry.top(whole, true) + whole / 2.0,
                clip_right: start + length,
            })]
        }
        DecorationStyleSpec::Wavy => {
            let wave = Wave::new(thickness.stroke);
            vec![Shape::Wave(WavePlan {
                wave,
                left: device(fragment.left),
                right: fragment.right,
                center: fragment.baseline + geometry.wave_center(scale),
            })]
        }
    }
}

#[cfg(test)]
mod tests;
