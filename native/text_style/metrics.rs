//! The arithmetic of a line box: where `line-height` puts the glyphs inside it, and where the decoration lines go. Nothing here
//! touches Godot.

use super::spec::DecorationThickness;

/// Chrome rounds a font's ascent and descent to whole pixels before it places anything (`SimpleFontData::PlatformInit`).
pub fn rounded(value: f32) -> f32 {
    value.round()
}

/// How the text server is told to build a line `line_height` tall from a font of `ascent` and `descent`.
///
/// CSS gives a line its `line-height` and puts half of what the glyphs leave over above them, and half below
/// (CSS Inline 3, "Leading and half-leading"), the first line included. Blink floors the upper half to a whole pixel and gives
/// the rest to the lower (`CalculateLeadingSpace` in `ng_inline_box_state.cc`). The text server has integer extra space above
/// and below each line (`SPACING_TOP`, `SPACING_BOTTOM`) and a float gap between lines, which together make the same boxes.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct LineBox {
    /// Added to the line's ascent (negative when the line is shorter than its glyphs).
    pub top: i32,
    /// Added to the line's descent.
    pub bottom: i32,
    /// Added between lines: the fraction of a pixel `line_height` has beyond the whole pixels the two above make up.
    pub gap: f32,
}

impl LineBox {
    /// The line box for `line_height` px around a font whose (whole pixel) ascent and descent are given.
    pub fn of(ascent: f32, descent: f32, line_height: f32) -> Self {
        let ascent = rounded(ascent);
        let descent = rounded(descent);
        let leading = line_height - (ascent + descent);
        let half = (leading / 2.0).floor();
        let whole = line_height.floor();
        Self {
            top: half as i32,
            bottom: (whole - (ascent + descent) - half) as i32,
            gap: line_height - whole,
        }
    }
}

/// A horizontal band under, through or over the text: `top` is its upper edge below the baseline (negative above it) and
/// `height` its thickness, both in logical px and on the device pixel grid.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Band {
    pub top: f32,
    pub height: f32,
}

/// What a font gives the decoration lines.
#[derive(Clone, Copy, Debug)]
pub struct DecorationFont {
    pub size: f32,
    /// The font's ascent.
    pub ascent: f32,
    /// The thickness its underline has (`post.underlineThickness`).
    pub underline_thickness: f32,
}

/// Where a browser puts the decoration lines of text at a device pixel ratio of `scale`. These are the rules Blink draws
/// by, read off Chrome's pixels (`docs/tracks/utilities-text.md`, "Decoration"): the sizes are worked out in CSS pixels and
/// then each edge is rounded to a device pixel, so a line is never blurred.
#[derive(Clone, Copy, Debug)]
pub struct Decorator {
    font: DecorationFont,
    thickness: DecorationThickness,
    /// The `text-underline-offset`, if the style gave one.
    offset: Option<f32>,
    scale: f32,
}

impl Decorator {
    pub fn new(
        font: DecorationFont,
        thickness: DecorationThickness,
        offset: Option<f32>,
        scale: f32,
    ) -> Self {
        Self {
            font,
            thickness,
            offset,
            scale,
        }
    }

    /// The thickness before it is made whole, in CSS px: `auto` is a tenth of the font size, `from-font` the font's own.
    fn raw_thickness(&self) -> f32 {
        match self.thickness {
            DecorationThickness::Auto => self.font.size / AUTO_THICKNESS_DIVISOR,
            DecorationThickness::FromFont => self.font.underline_thickness,
            DecorationThickness::Px(px) => px,
        }
    }

    /// The thickness in whole device pixels: `auto` rounds down to whole CSS px and `from-font` to the nearest, each at least
    /// one; an explicit `0` is none.
    fn device_thickness(&self) -> f32 {
        let css = match self.thickness {
            DecorationThickness::Auto => self.raw_thickness().floor().max(1.0),
            DecorationThickness::FromFont => self.raw_thickness().round().max(1.0),
            DecorationThickness::Px(px) => return (px * self.scale).round().max(0.0),
        };
        (css * self.scale).round()
    }

    fn band(&self, top_css: f32, thickness: f32) -> Option<Band> {
        (thickness > 0.0).then(|| Band {
            top: (top_css * self.scale).round() / self.scale,
            height: thickness / self.scale,
        })
    }

    /// The underline sits `offset` below the baseline, or by default a gap of half its thickness rounded up, at least one pixel.
    pub fn underline(&self) -> Option<Band> {
        let thickness = self.device_thickness();
        let gap = self
            .offset
            .unwrap_or_else(|| (self.raw_thickness() / 2.0).ceil().max(1.0));
        self.band(gap, thickness)
    }

    /// The overline's lower edge is the font's ascent above the baseline.
    pub fn overline(&self) -> Option<Band> {
        let thickness = self.device_thickness();
        let top = -(self.font.ascent.round() * self.scale + thickness) / self.scale;
        self.band(top, thickness)
    }

    /// The line through the text is centred a third of the ascent above the baseline.
    pub fn line_through(&self) -> Option<Band> {
        let thickness = self.device_thickness();
        let center = self.font.ascent / STRIKE_THROUGH_ASCENT_DIVISOR;
        let top = -((center + thickness / self.scale / 2.0) * self.scale).round() / self.scale;
        self.band(top, thickness)
    }
}

/// Blink's default decoration thickness is the font size over this.
const AUTO_THICKNESS_DIVISOR: f32 = 10.0;
/// The line through the text is centred at the ascent over this above the baseline.
const STRIKE_THROUGH_ASCENT_DIVISOR: f32 = 3.0;

#[cfg(test)]
mod tests {
    use super::*;

    /// A line's ascent and descent as the server will report them.
    fn line(ascent: f32, descent: f32, line_height: f32) -> (f32, f32, f32) {
        let line_box = LineBox::of(ascent, descent, line_height);
        (
            rounded(ascent) + line_box.top as f32,
            rounded(descent) + line_box.bottom as f32,
            line_box.gap,
        )
    }

    #[test]
    fn leading_is_split_with_the_upper_half_floored() {
        // A 16 px font of ascent 18 and descent 5 (23 px) in a 24 px line: one pixel over, none above, one below.
        assert_eq!(line(18.0, 5.0, 24.0), (18.0, 6.0, 0.0));
        // 28 px: five over, two above, three below.
        assert_eq!(line(18.0, 5.0, 28.0), (20.0, 8.0, 0.0));
        // 20 px: three too little; the upper half floors to -2, so -2 above and -1 below.
        assert_eq!(line(18.0, 5.0, 20.0), (16.0, 4.0, 0.0));
    }

    #[test]
    fn a_fractional_line_height_leaves_its_fraction_as_the_gap() {
        // 14 px text at line-height 1.625 is 22.75 px: a 22 px line and a 0.75 px gap, each line 22.75 from the next.
        let (above, below, gap) = line(13.0, 4.0, 22.75);
        assert_eq!(above + below, 22.0);
        assert_eq!(gap, 0.75);
        // The leading is 5.75, half 2.875, floored to 2 above.
        assert_eq!(above, 15.0);
    }

    #[test]
    fn the_line_always_adds_up_to_the_line_height() {
        for line_height in [0.0, 1.0, 9.5, 16.0, 19.99, 22.75, 23.0, 40.0, 100.25] {
            for (ascent, descent) in [(18.0, 5.0), (15.6, 3.9), (12.0, 4.0)] {
                let (above, below, gap) = line(ascent, descent, line_height);
                assert!(
                    (above + below + gap - line_height).abs() < 1e-4,
                    "{line_height} {ascent} {descent}"
                );
                assert!((0.0..1.0).contains(&gap));
            }
        }
    }

    /// The device pixel rows Chrome 156 filled below (positive) or above the baseline of "HHHH" in black on white, for
    /// `text-decoration: underline` (`probe2.mjs` of the track's evidence). Open Sans has an ascent of 1.0688 em, the other
    /// fonts have theirs in the table; the underline thickness is the font's `post` table's.
    fn chrome(size: f32, ascent_em: f32, post_thickness_em: f32, scale: f32) -> Decorator {
        let font = DecorationFont {
            size,
            ascent: (ascent_em * size).round(),
            underline_thickness: post_thickness_em * size,
        };
        Decorator::new(font, DecorationThickness::Auto, None, scale)
    }

    fn device_rows(band: Band, scale: f32) -> (i32, i32) {
        ((band.top * scale) as i32, (band.height * scale) as i32)
    }

    #[test]
    fn underlines_fall_where_chrome_draws_them() {
        // (size, scale): rows of the first device pixel below the baseline and how many. Open Sans.
        let open_sans = |size: f32, scale: f32| {
            device_rows(
                chrome(size, 1.06885, 0.0244, scale).underline().unwrap(),
                scale,
            )
        };
        assert_eq!(open_sans(12.0, 1.0), (1, 1));
        assert_eq!(open_sans(16.0, 1.0), (1, 1));
        assert_eq!(open_sans(24.0, 1.0), (2, 2));
        assert_eq!(open_sans(48.0, 1.0), (3, 4));
        assert_eq!(open_sans(16.0, 2.0), (2, 2));
        assert_eq!(open_sans(24.0, 2.0), (4, 4));
        assert_eq!(open_sans(48.0, 2.0), (6, 8));
        // PT Serif at 32 px: three rows, starting two below.
        assert_eq!(
            device_rows(chrome(32.0, 1.039, 0.05, 1.0).underline().unwrap(), 1.0),
            (2, 3)
        );
    }

    #[test]
    fn lines_through_and_over_the_text_fall_where_chrome_draws_them() {
        let through = |size: f32, scale: f32| {
            device_rows(
                chrome(size, 1.06885, 0.0244, scale).line_through().unwrap(),
                scale,
            )
        };
        assert_eq!(through(12.0, 1.0), (-5, 1));
        assert_eq!(through(16.0, 1.0), (-6, 1));
        assert_eq!(through(24.0, 1.0), (-10, 2));
        assert_eq!(through(48.0, 1.0), (-19, 4));
        assert_eq!(through(16.0, 2.0), (-12, 2));
        let over = |size: f32, scale: f32| {
            device_rows(
                chrome(size, 1.06885, 0.0244, scale).overline().unwrap(),
                scale,
            )
        };
        assert_eq!(over(12.0, 1.0), (-14, 1));
        assert_eq!(over(16.0, 1.0), (-18, 1));
        assert_eq!(over(24.0, 1.0), (-28, 2));
        assert_eq!(over(48.0, 1.0), (-55, 4));
        assert_eq!(over(16.0, 2.0), (-36, 2));
    }

    #[test]
    fn explicit_thickness_and_offset_are_used_as_given() {
        let font = DecorationFont {
            size: 16.0,
            ascent: 17.0,
            underline_thickness: 0.4,
        };
        // `decoration-2`: two px thick, one below the baseline. `underline-offset-4`: four below.
        let thick = Decorator::new(font, DecorationThickness::Px(2.0), None, 1.0)
            .underline()
            .unwrap();
        assert_eq!((thick.top, thick.height), (1.0, 2.0));
        let offset = Decorator::new(font, DecorationThickness::Auto, Some(4.0), 1.0)
            .underline()
            .unwrap();
        assert_eq!((offset.top, offset.height), (4.0, 1.0));
        // At twice the pixels the same CSS sizes are twice the rows, and the edges are on the grid.
        let sharp = Decorator::new(font, DecorationThickness::Px(1.5), Some(2.25), 2.0)
            .underline()
            .unwrap();
        assert_eq!((sharp.top, sharp.height), (2.5, 1.5));
        // From the font: its thickness, whole and at least one.
        assert_eq!(
            Decorator::new(font, DecorationThickness::FromFont, None, 1.0)
                .underline()
                .unwrap()
                .height,
            1.0
        );
        // `decoration-0` draws nothing.
        assert!(
            Decorator::new(font, DecorationThickness::Px(0.0), None, 1.0)
                .underline()
                .is_none()
        );
    }

    #[test]
    fn a_font_whose_metrics_are_fractional_is_rounded_like_the_browser() {
        // 15.6 and 3.9 are 16 and 4.
        assert_eq!(LineBox::of(15.6, 3.9, 24.0), LineBox::of(16.0, 4.0, 24.0));
    }
}
