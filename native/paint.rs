//! Paint resources: colours built from computed styles. Text paragraphs are `text_paragraph.rs`.
use godot::prelude::*;

pub(crate) fn parse_color(value: Option<&str>, default: Color) -> Color {
    value.and_then(Color::from_html).unwrap_or(default)
}
