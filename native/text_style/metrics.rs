//! The arithmetic of a line box: where `line-height` puts the glyphs inside it, how a fractional letter-spacing is carried by the
//! text server, and where the decoration lines go. Nothing here touches Godot.

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
                assert!((above + below + gap - line_height).abs() < 1e-4, "{line_height} {ascent} {descent}");
                assert!(gap >= 0.0 && gap < 1.0);
            }
        }
    }

    #[test]
    fn a_font_whose_metrics_are_fractional_is_rounded_like_the_browser() {
        // 15.6 and 3.9 are 16 and 4.
        assert_eq!(LineBox::of(15.6, 3.9, 24.0), LineBox::of(16.0, 4.0, 24.0));
    }
}
