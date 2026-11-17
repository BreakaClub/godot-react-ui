//! Paint resources: colours built from computed styles. Text paragraphs are `text_paragraph.rs`.
use godot::prelude::*;

pub(crate) fn parse_color(value: Option<&str>, default: Color) -> Color {
    value.and_then(Color::from_html).unwrap_or(default)
}

/// Whether `value` is a colour as the wire carries one: `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`.
pub(crate) fn validate_hex(value: &str) -> Result<(), String> {
    let Some(hex) = value.strip_prefix('#') else {
        return Err("must be a hex color".into());
    };
    if !matches!(hex.len(), 3 | 4 | 6 | 8) || !hex.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err("must be #RGB, #RGBA, #RRGGBB, or #RRGGBBAA".into());
    }
    Ok(())
}
