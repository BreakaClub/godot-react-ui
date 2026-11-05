//! Paint resources: colours and text paragraphs built from computed styles.
use godot::classes::text_server::LineBreakFlag;
use godot::classes::{Font, TextParagraph};
use godot::global::HorizontalAlignment;
use godot::prelude::*;

use crate::DEFAULT_FONT_SIZE;
use crate::computed_style::ComputedStyle;
use crate::props::TextAlignSpec;

pub(crate) fn parse_color(value: Option<&str>, default: Color) -> Color {
    value.and_then(Color::from_html).unwrap_or(default)
}

/// A shaped paragraph for `text` in the computed font size and alignment, or `None` for no text.
pub(crate) fn build_paragraph(
    font: &Gd<Font>,
    text: &str,
    computed: &ComputedStyle,
) -> Option<Gd<TextParagraph>> {
    if text.is_empty() {
        return None;
    }
    let mut paragraph = TextParagraph::new_gd();
    // Match Godot Label AUTOWRAP_WORD_SMART: grapheme fallback only for words wider than the line,
    // not an unconditional break per glyph.
    paragraph.set_break_flags(
        LineBreakFlag::MANDATORY | LineBreakFlag::WORD_BOUND | LineBreakFlag::ADAPTIVE,
    );
    paragraph.set_alignment(match computed.text_align {
        Some(TextAlignSpec::Center) => HorizontalAlignment::CENTER,
        Some(TextAlignSpec::Right) => HorizontalAlignment::RIGHT,
        Some(TextAlignSpec::Left) | None => HorizontalAlignment::LEFT,
    });
    assert!(
        paragraph.add_string(text, font, computed.font_size.unwrap_or(DEFAULT_FONT_SIZE)),
        "Godot rejected validated text/font"
    );
    Some(paragraph)
}
