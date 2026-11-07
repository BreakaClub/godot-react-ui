//! CSS `box-shadow` lists and the Tailwind utilities that compose one: parsing, validation, serialisation for Stylo,
//! and the extents the renderer needs. Nothing here touches Godot.
//!
//! Tailwind v3 builds `box-shadow` as `ring-offset-shadow, ring-shadow, shadow` from separate variables, so that
//! `shadow-sm ring-1 ring-black/5 focus:ring-2 focus:ring-indigo-500` keeps the shadow when the ring changes.
//! [`ShadowParts`] holds those variables, merged field by field across style layers (the pattern of `FilterParts`),
//! and [`ShadowParts::to_list`] composes them the way the stylesheet does.

use std::fmt::Write as _;

use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::filter::{NoShadow, Rgba, parse_color_token, parse_length, tokens};

const CHANNEL_MAX: f32 = 255.0;
/// The largest blur radius accepted, in CSS pixels: four times Tailwind's `shadow-2xl` (50 px).
pub const MAX_SHADOW_BLUR_CSS_PX: f32 = 200.0;
/// How many standard deviations of a Gaussian the renderer draws; what lies beyond is under 0.14 %.
pub const SHADOW_SIGMAS: f32 = 3.0;
/// A blur radius in CSS is twice the standard deviation of the Gaussian (CSS Backgrounds 3 section 7.3).
pub const SIGMA_PER_BLUR: f32 = 0.5;
/// Tailwind's default ring colour: `blue-500` at half opacity (`rgb(59 130 246 / 0.5)`).
const DEFAULT_RING_COLOR: Rgba = [
    59.0 / CHANNEL_MAX,
    130.0 / CHANNEL_MAX,
    246.0 / CHANNEL_MAX,
    0.5,
];
/// Tailwind's default ring offset colour.
const DEFAULT_RING_OFFSET_COLOR: Rgba = [1.0, 1.0, 1.0, 1.0];

/// One shadow of a `box-shadow` list. Lengths are CSS pixels; `color` is `None` for `currentcolor`, which
/// [`ShadowList::resolve_current_color`] replaces with the element's text colour.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ShadowLayer {
    pub x: f32,
    pub y: f32,
    pub blur: f32,
    pub spread: f32,
    pub color: Option<Rgba>,
    pub inset: bool,
}

impl ShadowLayer {
    /// Whether the layer paints anything: a transparent colour, an inset shadow nothing moves, blurs or shrinks, and an
    /// outer shadow that is wholly under the box (no blur, and a spread that does not make up for the offset) draw
    /// nothing.
    pub fn is_visible(&self) -> bool {
        if self.color.is_some_and(|color| color[3] <= 0.0) {
            return false;
        }
        if self.inset {
            return self.blur > 0.0 || self.spread > 0.0 || self.x != 0.0 || self.y != 0.0;
        }
        self.spread + self.blur * SIGMA_PER_BLUR * SHADOW_SIGMAS + self.x.abs().max(self.y.abs())
            > 0.0
    }

    /// How far the layer's paint reaches past the box on each side (top, right, bottom, left), in CSS pixels. An
    /// inset shadow stays inside.
    pub fn reach(&self) -> [f32; 4] {
        if self.inset {
            return [0.0; 4];
        }
        let spread = self.spread + self.blur * SIGMA_PER_BLUR * SHADOW_SIGMAS;
        [
            (spread - self.y).max(0.0),
            (spread + self.x).max(0.0),
            (spread + self.y).max(0.0),
            (spread - self.x).max(0.0),
        ]
    }
}

/// A `box-shadow` value: the shadows in order (the first is on top), empty for `none`.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct ShadowList(pub Vec<ShadowLayer>);

impl ShadowList {
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// Parse CSS `box-shadow` syntax.
    pub fn parse(input: &str) -> Result<ShadowList, String> {
        let input = input.trim();
        if input.eq_ignore_ascii_case("none") {
            return Ok(ShadowList::default());
        }
        if input.is_empty() {
            return Err("a box-shadow is `none` or a list of shadows".into());
        }
        let mut layers = Vec::new();
        let mut depth = 0usize;
        let mut start = 0;
        for (index, character) in input.char_indices() {
            match character {
                '(' => depth += 1,
                ')' => depth = depth.saturating_sub(1),
                ',' if depth == 0 => {
                    layers.push(parse_layer(&input[start..index])?);
                    start = index + 1;
                }
                _ => {}
            }
        }
        layers.push(parse_layer(&input[start..])?);
        Ok(ShadowList(layers))
    }

    /// Check what every list must hold: finite lengths and a blur in range.
    pub fn validate(&self) -> Result<(), String> {
        for layer in &self.0 {
            if ![layer.x, layer.y, layer.blur, layer.spread]
                .iter()
                .all(|value| value.is_finite())
            {
                return Err("box-shadow lengths must be finite".into());
            }
            if layer.blur < 0.0 || layer.blur > MAX_SHADOW_BLUR_CSS_PX {
                return Err(format!(
                    "box-shadow blur must be between 0 and {MAX_SHADOW_BLUR_CSS_PX} px, got {}",
                    layer.blur
                ));
            }
        }
        Ok(())
    }

    /// The list with `currentcolor` shadows replaced by `current`.
    pub fn resolve_current_color(&self, current: Rgba) -> ShadowList {
        ShadowList(
            self.0
                .iter()
                .map(|layer| ShadowLayer {
                    color: Some(layer.color.unwrap_or(current)),
                    ..*layer
                })
                .collect(),
        )
    }

    /// CSS text for the style engine: every colour is concrete (`resolve_current_color` first).
    pub fn to_css(&self) -> String {
        if self.0.is_empty() {
            return "none".into();
        }
        let mut css = String::new();
        for layer in &self.0 {
            if !css.is_empty() {
                css.push_str(", ");
            }
            let [r, g, b, a] = layer.color.unwrap_or([0.0, 0.0, 0.0, 1.0]);
            // Writing to a String cannot fail.
            let _ = write!(
                css,
                "{}rgba({}, {}, {}, {a}) {}px {}px {}px {}px",
                if layer.inset { "inset " } else { "" },
                (r * CHANNEL_MAX).round(),
                (g * CHANNEL_MAX).round(),
                (b * CHANNEL_MAX).round(),
                layer.x,
                layer.y,
                layer.blur,
                layer.spread,
            );
        }
        css
    }

    /// How far the visible shadows reach past the box (top, right, bottom, left), in CSS pixels.
    pub fn reach(&self) -> [f32; 4] {
        let mut reach = [0.0_f32; 4];
        for layer in self.0.iter().filter(|layer| layer.is_visible()) {
            for (total, layer_reach) in reach.iter_mut().zip(layer.reach()) {
                *total = total.max(layer_reach);
            }
        }
        reach
    }
}

fn parse_layer(text: &str) -> Result<ShadowLayer, String> {
    let mut lengths = Vec::new();
    let mut color: Option<Option<Rgba>> = None;
    let mut inset = false;
    for token in tokens(text) {
        if token.eq_ignore_ascii_case("inset") {
            if inset {
                return Err(format!("box-shadow: `inset` twice in {text:?}"));
            }
            inset = true;
        } else if let Ok(length) = parse_length(&token.to_ascii_lowercase()) {
            lengths.push(length);
        } else {
            if color.is_some() {
                return Err(format!("box-shadow: more than one colour, found {token:?}"));
            }
            color = Some(parse_color_token(token).map_err(|error| format!("box-shadow: {error}"))?);
        }
    }
    let (x, y, blur, spread) = match lengths.as_slice() {
        [x, y] => (*x, *y, 0.0, 0.0),
        [x, y, blur] => (*x, *y, *blur, 0.0),
        [x, y, blur, spread] => (*x, *y, *blur, *spread),
        _ => {
            return Err(format!(
                "box-shadow needs two to four lengths (x, y, blur, spread) and an optional colour, found {text:?}"
            ));
        }
    };
    if blur < 0.0 {
        return Err("box-shadow: the blur radius must not be negative".into());
    }
    Ok(ShadowLayer {
        x,
        y,
        blur,
        spread,
        color: color.unwrap_or(None),
        inset,
    })
}

// A value in a style layer is CSS text on the wire, validated when the commit is parsed.
impl<'de> Deserialize<'de> for ShadowList {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        ShadowList::parse(&text).map_err(serde::de::Error::custom)
    }
}

impl Serialize for ShadowList {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_css())
    }
}

// ---------------------------------------------------------------------------------------------
// Utilities (Tailwind): shadow-*, ring-*, composed across variants.
// ---------------------------------------------------------------------------------------------

/// One layer of a `shadow-*` size utility, with its colour as CSS text.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ShadowPartLayer {
    pub x: f32,
    pub y: f32,
    pub blur: f32,
    pub spread: f32,
    pub color: String,
    pub inset: Option<bool>,
}

/// A `shadow-*` size utility: its layers, or `none`.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum ShadowPartValue {
    Layers(Vec<ShadowPartLayer>),
    None(NoShadow),
}

/// Tailwind's box-shadow variables. `ring_width` is what the `ring-*` width utilities set (they also set the
/// property that uses the others); the other ring fields do nothing alone, as in the stylesheet. Colours are `#rgb`,
/// `#rrggbb` or `#rrggbbaa`.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ShadowParts {
    pub shadow: Option<ShadowPartValue>,
    /// `shadow-<colour>`: replaces the colour of every layer of the size utility.
    pub shadow_color: Option<String>,
    pub ring_width: Option<f32>,
    pub ring_inset: Option<bool>,
    pub ring_color: Option<String>,
    pub ring_offset_width: Option<f32>,
    pub ring_offset_color: Option<String>,
}

impl ShadowParts {
    /// Overwrite the variables `other` sets.
    pub fn merge(&mut self, other: &ShadowParts) {
        macro_rules! overwrite {
            ($($field:ident),+ $(,)?) => {{
                let ShadowParts { $($field),+ } = other;
                $(
                    if $field.is_some() {
                        self.$field = $field.clone();
                    }
                )+
            }};
        }
        overwrite!(
            shadow,
            shadow_color,
            ring_width,
            ring_inset,
            ring_color,
            ring_offset_width,
            ring_offset_color,
        );
    }

    pub fn validate(&self) -> Result<(), String> {
        for (name, color) in [
            ("shadowColor", &self.shadow_color),
            ("ringColor", &self.ring_color),
            ("ringOffsetColor", &self.ring_offset_color),
        ] {
            if let Some(color) = color {
                parse_color_token(color).map_err(|error| format!("{name}: {error}"))?;
            }
        }
        for (name, width) in [
            ("ringWidth", self.ring_width),
            ("ringOffsetWidth", self.ring_offset_width),
        ] {
            if width.is_some_and(|width| !width.is_finite() || width < 0.0) {
                return Err(format!("{name} must be a finite nonnegative number"));
            }
        }
        if let Some(ShadowPartValue::Layers(layers)) = &self.shadow {
            for layer in layers {
                parse_color_token(&layer.color)
                    .map_err(|error| format!("shadow layer colour: {error}"))?;
            }
        }
        self.to_list().validate()
    }

    /// The list the variables compose, in Tailwind's order: the ring offset, the ring, then the shadow. A ring
    /// takes its offset width and colour, and `ring-inset` makes both inset.
    pub fn to_list(&self) -> ShadowList {
        let mut layers = Vec::new();
        let color = |text: &Option<String>, default: Rgba| -> Rgba {
            text.as_deref()
                .and_then(|text| parse_color_token(text).ok().flatten())
                .unwrap_or(default)
        };
        if let Some(width) = self.ring_width {
            let offset = self.ring_offset_width.unwrap_or(0.0);
            let inset = self.ring_inset.unwrap_or(false);
            layers.push(ShadowLayer {
                x: 0.0,
                y: 0.0,
                blur: 0.0,
                spread: offset,
                color: Some(color(&self.ring_offset_color, DEFAULT_RING_OFFSET_COLOR)),
                inset,
            });
            layers.push(ShadowLayer {
                x: 0.0,
                y: 0.0,
                blur: 0.0,
                spread: width + offset,
                color: Some(color(&self.ring_color, DEFAULT_RING_COLOR)),
                inset,
            });
        }
        if let Some(ShadowPartValue::Layers(parts)) = &self.shadow {
            let replacement = self
                .shadow_color
                .as_deref()
                .and_then(|text| parse_color_token(text).ok().flatten());
            for part in parts {
                layers.push(ShadowLayer {
                    x: part.x,
                    y: part.y,
                    blur: part.blur,
                    spread: part.spread,
                    color: replacement.or_else(|| parse_color_token(&part.color).ok().flatten()),
                    inset: part.inset.unwrap_or(false),
                });
            }
        }
        ShadowList(layers)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f32, b: f32) {
        assert!((a - b).abs() < 1e-4, "{a} != {b}");
    }

    fn part(x: f32, y: f32, blur: f32, spread: f32, alpha: f32) -> ShadowPartLayer {
        ShadowPartLayer {
            x,
            y,
            blur,
            spread,
            color: format!("rgba(0, 0, 0, {alpha})"),
            inset: None,
        }
    }

    #[test]
    fn parses_tailwinds_shadows() {
        let list =
            ShadowList::parse("0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)")
                .expect("shadow-lg");
        assert_eq!(list.0.len(), 2);
        assert_eq!(list.0[0].y, 10.0);
        assert_eq!(list.0[0].blur, 15.0);
        assert_eq!(list.0[0].spread, -3.0);
        close(list.0[0].color.expect("a colour")[3], 0.1);
        let inner = ShadowList::parse("inset 0 2px 4px 0 rgb(0 0 0 / 0.05)").expect("shadow-inner");
        assert!(inner.0[0].inset);
        assert_eq!(inner.0[0].y, 2.0);
        assert!(ShadowList::parse("none").expect("none").is_empty());
        // The colour may come first, and none means currentcolor.
        let first = ShadowList::parse("#ff0000 1px 2px").expect("colour first");
        assert_eq!(first.0[0].color, Some([1.0, 0.0, 0.0, 1.0]));
        assert_eq!(
            ShadowList::parse("1px 2px").expect("no colour").0[0].color,
            None
        );
        assert_eq!(
            ShadowList::parse("0PX 4Px 6PX #000")
                .expect("units are case insensitive")
                .0[0]
                .blur,
            6.0
        );
    }

    #[test]
    fn rejects_what_it_cannot_draw_naming_the_problem() {
        for css in [
            "",
            "1px",
            "1px 2px 3px 4px 5px",
            "1px 2px -3px",
            "1rem 2px",
            "1px 2px red blue",
            "inset inset 1px 1px",
            "1px 2px notacolour",
        ] {
            assert!(ShadowList::parse(css).is_err(), "{css}");
        }
        let too_blurry = ShadowList::parse("0 0 500px #000").expect("parses");
        assert!(too_blurry.validate().is_err());
    }

    #[test]
    fn serialises_to_css_that_parses_back() {
        let list =
            ShadowList::parse("inset 1px 2px 3px 4px rgba(10, 20, 30, 0.5), 0 0 0 2px #3b82f680")
                .expect("a list");
        let css = list.resolve_current_color([0.0, 0.0, 0.0, 1.0]).to_css();
        assert_eq!(ShadowList::parse(&css).expect("round trip").0.len(), 2);
        assert_eq!(ShadowList::default().to_css(), "none");
    }

    #[test]
    fn a_layer_reaches_past_the_box_by_offset_spread_and_three_sigmas() {
        let layer = ShadowLayer {
            x: 2.0,
            y: 10.0,
            blur: 16.0,
            spread: -3.0,
            color: Some([0.0, 0.0, 0.0, 0.1]),
            inset: false,
        };
        // sigma 8, three sigmas 24: 24 - 3 = 21 around, moved by the offset.
        let [top, right, bottom, left] = layer.reach();
        close(top, 11.0);
        close(right, 23.0);
        close(bottom, 31.0);
        close(left, 19.0);
        let inset = ShadowLayer {
            inset: true,
            ..layer
        };
        assert_eq!(inset.reach(), [0.0; 4]);
    }

    #[test]
    fn invisible_layers_are_known() {
        let layer = |x: f32, y: f32, blur: f32, spread: f32, alpha: f32| ShadowLayer {
            x,
            y,
            blur,
            spread,
            color: Some([0.0, 0.0, 0.0, alpha]),
            inset: false,
        };
        assert!(
            !layer(0.0, 0.0, 0.0, 0.0, 1.0).is_visible(),
            "0 0 #000 is under the box"
        );
        assert!(!layer(0.0, 0.0, 0.0, 4.0, 0.0).is_visible(), "transparent");
        assert!(layer(0.0, 0.0, 0.0, 4.0, 1.0).is_visible(), "a ring");
        assert!(
            layer(0.0, 1.0, 0.0, 0.0, 1.0).is_visible(),
            "an offset hard shadow"
        );
        assert!(layer(0.0, 0.0, 5.0, 0.0, 0.5).is_visible(), "a glow");
        assert!(
            !ShadowLayer {
                inset: true,
                ..layer(0.0, 0.0, 0.0, 0.0, 1.0)
            }
            .is_visible()
        );
    }

    #[test]
    fn utilities_compose_in_tailwinds_order() {
        let mut parts = ShadowParts {
            shadow: Some(ShadowPartValue::Layers(vec![
                part(0.0, 1.0, 3.0, 0.0, 0.1),
                part(0.0, 1.0, 2.0, -1.0, 0.1),
            ])),
            ring_width: Some(1.0),
            ring_color: Some("#0000000d".into()),
            ..ShadowParts::default()
        };
        let list = parts.to_list();
        // ring offset, ring, shadow, shadow.
        assert_eq!(list.0.len(), 4);
        close(list.0[0].spread, 0.0);
        close(list.0[1].spread, 1.0);
        assert_eq!(list.0[2].blur, 3.0);
        assert!(list.0.iter().all(|layer| !layer.inset));
        // ring-offset-2 widens both; ring-inset makes them inset; the ring offset is white by default.
        parts.ring_offset_width = Some(2.0);
        parts.ring_inset = Some(true);
        let list = parts.to_list();
        close(list.0[0].spread, 2.0);
        close(list.0[1].spread, 3.0);
        assert!(list.0[0].inset && list.0[1].inset && !list.0[2].inset);
        assert_eq!(list.0[0].color, Some([1.0, 1.0, 1.0, 1.0]));
        // `shadow-red-500/50` replaces each layer's colour, alpha included.
        parts.shadow_color = Some("#ef444480".into());
        let list = parts.to_list();
        close(list.0[2].color.expect("a colour")[3], 128.0 / 255.0);
        close(list.0[3].color.expect("a colour")[0], 239.0 / 255.0);
    }

    #[test]
    fn a_ring_alone_has_tailwinds_default_colour_and_a_colour_alone_does_nothing() {
        let ring = ShadowParts {
            ring_width: Some(3.0),
            ..ShadowParts::default()
        };
        let list = ring.to_list();
        close(list.0[1].color.expect("a colour")[3], 0.5);
        close(list.0[1].color.expect("a colour")[2], 246.0 / 255.0);
        let colour_only = ShadowParts {
            ring_color: Some("#ff0000".into()),
            shadow_color: Some("#00ff00".into()),
            ..ShadowParts::default()
        };
        assert!(
            colour_only.to_list().is_empty(),
            "a colour alone sets no shadow"
        );
        let none = ShadowParts {
            shadow: Some(ShadowPartValue::None(NoShadow)),
            ..ShadowParts::default()
        };
        assert!(none.to_list().is_empty());
    }

    #[test]
    fn parts_merge_per_variable() {
        let mut parts = ShadowParts {
            shadow: Some(ShadowPartValue::Layers(vec![part(
                0.0, 1.0, 2.0, 0.0, 0.05,
            )])),
            ring_width: Some(1.0),
            ring_color: Some("#000000".into()),
            ..ShadowParts::default()
        };
        parts.merge(&ShadowParts {
            ring_width: Some(2.0),
            ring_color: Some("#6366f1".into()),
            ..ShadowParts::default()
        });
        assert!(parts.shadow.is_some(), "the shadow survives a focus ring");
        assert_eq!(parts.ring_width, Some(2.0));
        assert_eq!(parts.ring_color.as_deref(), Some("#6366f1"));
    }

    #[test]
    fn parts_wire_format_is_camel_case_and_strict() {
        let parts: ShadowParts = serde_json::from_str(
            r##"{"shadow":[{"x":0,"y":1,"blur":2,"spread":0,"color":"rgba(0, 0, 0, 0.05)"}],"ringWidth":2,"ringInset":true}"##,
        )
        .expect("parses");
        assert_eq!(parts.ring_width, Some(2.0));
        assert!(
            serde_json::from_str::<ShadowParts>(r#"{"shadow":"none"}"#)
                .expect("none")
                .shadow
                .is_some()
        );
        assert!(serde_json::from_str::<ShadowParts>(r#"{"shadow":"lg"}"#).is_err());
        assert!(serde_json::from_str::<ShadowParts>(r#"{"ring":2}"#).is_err());
    }
}
