//! Colour helpers for native paint resources.
use godot::prelude::Color;

pub(crate) fn parse_color(value: Option<&str>, default: Color, opacity: f32) -> Color {
    let mut color = value.and_then(Color::from_html).unwrap_or(default);
    color.a *= opacity;
    color
}

pub(crate) fn with_opacity(mut color: Color, opacity: f32) -> Color {
    color.a *= opacity;
    color
}
