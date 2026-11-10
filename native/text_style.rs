//! Text styles: the longhands Tailwind's text utilities set (`src/utilities/text.ts`), how they inherit, and the arithmetic that
//! turns them into shaped text. The Godot side that applies them is `text_paragraph.rs` and `fonts.rs`; everything here is
//! Godot-free and unit tested.

pub(crate) mod face;
pub(crate) mod flow;
pub(crate) mod metrics;
pub(crate) mod resolve;
pub(crate) mod spec;

pub use resolve::{InheritedText, TextDecoration, TextStroke, TextStyle, settle};
pub use spec::{
    DecorationLines, DecorationStyleSpec, DecorationThicknessSpec, FontStyleSpec,
    LetterSpacingSpec, LineClampSpec, LineHeightSpec, NumericFigureSpec, NumericFractionSpec,
    NumericSpacingSpec, OverflowWrapSpec, PaintOrderSpec, TextOverflowSpec, TextTransformSpec,
    UnderlineOffsetSpec, WhiteSpaceSpec, WordBreakSpec,
};

use crate::props::StyleSpec;

impl StyleSpec {
    /// Check the text longhands that carry more than a keyword: a layer with a malformed one is refused whole.
    pub(crate) fn validate_text(&self) -> Result<(), String> {
        if let Some(spacing) = &self.letter_spacing {
            spacing.parsed()?;
        }
        if let Some(height) = &self.line_height {
            height.parsed()?;
        }
        self.validate_text_stroke()?;
        if let Some(thickness) = &self.text_decoration_thickness {
            thickness.parsed()?;
        }
        if let Some(offset) = &self.text_underline_offset {
            offset.px()?;
        }
        if let Some(clamp) = &self.line_clamp {
            clamp.lines()?;
        }
        Ok(())
    }

    /// The stroke longhands. A stroke is drawn under the fill and nowhere else (`PaintOrderSpec`), and a computed style is built
    /// from validated layers that cannot be checked against each other, so each layer must keep that true by itself: one that sets a
    /// width above zero sets `paintOrder: 'stroke'` with it, and one that sets `paintOrder: 'normal'` sets the width to zero with it
    /// (which also takes away a stroke inherited or set by an earlier layer).
    fn validate_text_stroke(&self) -> Result<(), String> {
        if let Some(width) = self.text_stroke_width
            && (!width.is_finite() || width < 0.0)
        {
            return Err("WebkitTextStrokeWidth must be a finite nonnegative number".into());
        }
        let strokes = self.text_stroke_width.is_some_and(|width| width > 0.0);
        if strokes && self.paint_order != Some(PaintOrderSpec::Stroke) {
            return Err(
                "WebkitTextStrokeWidth above 0 needs paintOrder: 'stroke' in the same style: a stroke painted over the fill \
                 (paintOrder 'normal', CSS's default) is not supported"
                    .into(),
            );
        }
        if self.paint_order == Some(PaintOrderSpec::Normal) && self.text_stroke_width != Some(0.0) {
            return Err(
                "paintOrder: 'normal' needs WebkitTextStrokeWidth: 0 in the same style: it would paint any stroke over the fill, \
                 which is not supported (use paintOrder: 'stroke' for a stroke)"
                    .into(),
            );
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn style(json: &str) -> StyleSpec {
        serde_json::from_str(json).expect("a style")
    }

    #[test]
    fn the_stroke_longhands_are_the_css_names_on_the_wire() {
        let spec = style(
            r##"{"WebkitTextStrokeWidth":2,"WebkitTextStrokeColor":"#ffffff","paintOrder":"stroke"}"##,
        );
        assert_eq!(spec.text_stroke_width, Some(2.0));
        assert_eq!(spec.text_stroke_color.as_deref(), Some("#ffffff"));
        assert_eq!(spec.paint_order, Some(PaintOrderSpec::Stroke));
        spec.validate().expect("a stroke under the fill");
        assert_eq!(
            serde_json::to_value(&spec).unwrap()["WebkitTextStrokeWidth"],
            2.0
        );
        // Only the CSS spelling is a property: a lower case first letter is another, unknown one.
        assert!(serde_json::from_str::<StyleSpec>(r#"{"webkitTextStrokeWidth":2}"#).is_err());
        assert!(serde_json::from_str::<StyleSpec>(r#"{"paintOrder":"fill"}"#).is_err());
        assert!(serde_json::from_str::<StyleSpec>(r#"{"paintOrder":"stroke fill"}"#).is_err());
    }

    #[test]
    fn a_stroke_width_is_a_finite_nonnegative_number() {
        for width in ["-1", "-0.5"] {
            let json = format!(r#"{{"WebkitTextStrokeWidth":{width},"paintOrder":"stroke"}}"#);
            let error = style(&json).validate().unwrap_err();
            assert!(error.contains("WebkitTextStrokeWidth"), "{json}: {error}");
        }
        let infinite = StyleSpec {
            text_stroke_width: Some(f32::INFINITY),
            paint_order: Some(PaintOrderSpec::Stroke),
            ..StyleSpec::default()
        };
        assert!(infinite.validate().is_err());
        let not_a_number = StyleSpec {
            text_stroke_width: Some(f32::NAN),
            paint_order: Some(PaintOrderSpec::Stroke),
            ..StyleSpec::default()
        };
        assert!(not_a_number.validate().is_err());
        for json in [
            r#"{"WebkitTextStrokeWidth":0,"paintOrder":"stroke"}"#,
            r#"{"WebkitTextStrokeWidth":0.5,"paintOrder":"stroke"}"#,
            r#"{"WebkitTextStrokeWidth":0}"#,
            r#"{}"#,
        ] {
            style(json).validate().expect(json);
        }
    }

    #[test]
    fn a_stroke_painted_over_the_fill_is_refused_and_says_what_to_set() {
        for json in [
            // CSS's default order is `normal`, which is what an unset one is.
            r#"{"WebkitTextStrokeWidth":2}"#,
            r#"{"WebkitTextStrokeWidth":2,"paintOrder":"normal"}"#,
        ] {
            let error = style(json).validate().unwrap_err();
            assert!(error.contains("paintOrder: 'stroke'"), "{json}: {error}");
        }
    }

    #[test]
    fn normal_paint_order_is_only_accepted_with_a_zero_width_that_takes_an_inherited_stroke_away() {
        style(r#"{"paintOrder":"normal","WebkitTextStrokeWidth":0}"#)
            .validate()
            .expect("no stroke, so no order to get wrong");
        // A bare `normal` would leave a stroke from an ancestor or an earlier layer painted over the fill.
        let error = style(r#"{"paintOrder":"normal"}"#).validate().unwrap_err();
        assert!(error.contains("WebkitTextStrokeWidth: 0"), "{error}");
        style(r#"{"paintOrder":"stroke"}"#)
            .validate()
            .expect("`stroke` is always right");
    }

    #[test]
    fn a_stroke_colour_is_a_hex_colour() {
        style(r##"{"WebkitTextStrokeColor":"#fff"}"##)
            .validate()
            .unwrap();
        let error = style(r#"{"WebkitTextStrokeColor":"white"}"#)
            .validate()
            .unwrap_err();
        assert!(error.contains("WebkitTextStrokeColor"), "{error}");
    }
}
