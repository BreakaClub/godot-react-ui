//! Text styles: the longhands Tailwind's text utilities set (`src/utilities/text.ts`), how they inherit, and the arithmetic that
//! turns them into shaped text. The Godot side that applies them is `text_paragraph.rs` and `fonts.rs`; everything here is
//! Godot-free and unit tested. The design and its evidence are in `docs/tracks/utilities-text.md`.

pub(crate) mod face;
pub(crate) mod flow;
pub(crate) mod metrics;
pub(crate) mod resolve;
pub(crate) mod spec;

pub use resolve::{InheritedText, TextDecoration, TextStyle, settle};
pub use spec::{
    DecorationLines, DecorationThicknessSpec, FontStyleSpec, LetterSpacingSpec, LineClampSpec,
    LineHeightSpec, NumericFigureSpec, NumericFractionSpec, NumericSpacingSpec, OverflowWrapSpec,
    TextOverflowSpec, TextTransformSpec, UnderlineOffsetSpec, WhiteSpaceSpec, WordBreakSpec,
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
}
