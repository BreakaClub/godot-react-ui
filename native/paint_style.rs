//! What a computed style says about the paint of a box beyond its fill: border sides, corners, outline, shadows and
//! gradient. Nothing here touches Godot; `box_paint.rs` turns it into canvas items.

use crate::border_image::BorderImage;
use crate::box_shadow::ShadowList;
use crate::filter::Rgba;
use crate::gradient::{BackgroundImage, LinearGradient};
use crate::props::{LineStyleSpec, StyleSpec};

/// `outline-width: medium`: the width of an outline whose style is set and whose width is not (CSS Backgrounds and
/// Borders 3, "outline-width").
pub const MEDIUM_OUTLINE_WIDTH_PX: f32 = 3.0;

/// An outline that is drawn: a solid style and a visible width and colour. `color` is `None` for `currentcolor`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Outline {
    pub width: f32,
    pub offset: f32,
    pub color: Option<Rgba>,
}

impl StyleSpec {
    /// The border widths in CSS pixels, top, right, bottom, left. A `border-style` of `none` takes them all away (the
    /// used width of a border with no style is zero); a side's own width wins over the shorthand.
    pub fn border_widths(&self) -> [f32; 4] {
        if self.border_style == Some(LineStyleSpec::None) {
            return [0.0; 4];
        }
        let all = self.border_width.unwrap_or(0.0);
        [
            self.border_top_width.unwrap_or(all),
            self.border_right_width.unwrap_or(all),
            self.border_bottom_width.unwrap_or(all),
            self.border_left_width.unwrap_or(all),
        ]
    }

    /// The colour of each border side as written (top, right, bottom, left), `None` where nothing sets one.
    pub fn border_colors(&self) -> [Option<&str>; 4] {
        let all = self.border_color.as_deref();
        [
            self.border_top_color.as_deref().or(all),
            self.border_right_color.as_deref().or(all),
            self.border_bottom_color.as_deref().or(all),
            self.border_left_color.as_deref().or(all),
        ]
    }

    /// Whether border side `side` (top, right, bottom, left) has a colour of its own, so that the shorthand `border-color` (the
    /// one a transition of `borderColor` samples) does not set it.
    pub fn border_side_has_own_color(&self, side: usize) -> bool {
        [
            &self.border_top_color,
            &self.border_right_color,
            &self.border_bottom_color,
            &self.border_left_color,
        ][side]
            .is_some()
    }

    /// The corner radii in CSS pixels, top left, top right, bottom right, bottom left.
    pub fn border_radii(&self) -> [f32; 4] {
        let all = self.border_radius.unwrap_or(0.0);
        [
            self.border_top_left_radius.unwrap_or(all),
            self.border_top_right_radius.unwrap_or(all),
            self.border_bottom_right_radius.unwrap_or(all),
            self.border_bottom_left_radius.unwrap_or(all),
        ]
    }

    /// Whether the style sets any part of an outline. A browser's focus ring is an outline, so an author who sets one
    /// takes the ring away from the element (`outline-none` is the common case).
    pub fn has_authored_outline(&self) -> bool {
        self.outline_style.is_some()
            || self.outline_width.is_some()
            || self.outline_color.is_some()
            || self.outline_offset.is_some()
    }

    /// The outline to draw, if the style asks for a visible one.
    pub fn outline(&self) -> Option<Outline> {
        if self.outline_style != Some(LineStyleSpec::Solid) {
            return None;
        }
        let width = self.outline_width.unwrap_or(MEDIUM_OUTLINE_WIDTH_PX);
        if width <= 0.0 {
            return None;
        }
        let color = match self.outline_color.as_deref() {
            Some(text) => crate::filter::parse_color_token(text).ok().flatten(),
            None => None,
        };
        if color.is_some_and(|color| color[3] <= 0.0) {
            return None;
        }
        Some(Outline {
            width,
            offset: self.outline_offset.unwrap_or(0.0),
            color,
        })
    }

    /// The `box-shadow` list this style resolves to: an explicit `boxShadow`, or what the shadow and ring utilities
    /// compose. `currentcolor` is not resolved.
    pub fn box_shadow_list(&self) -> ShadowList {
        match (&self.box_shadow, &self.box_shadow_parts) {
            (Some(list), _) => list.clone(),
            (None, Some(parts)) => parts.to_list(),
            (None, None) => ShadowList::default(),
        }
    }

    /// The gradient this style paints over its background colour, if any.
    pub fn background_gradient(&self) -> Option<LinearGradient> {
        match (&self.background_image, &self.gradient_parts) {
            (Some(BackgroundImage::Gradient(gradient)), _) => Some(gradient.clone()),
            (Some(BackgroundImage::None), _) => None,
            (None, Some(parts)) => parts.to_gradient(),
            (None, None) => None,
        }
    }

    /// The border image this style asks for: `border-image-source` names a texture, and the slice, width, outset and repeat
    /// say how it is cut and laid out (CSS's initial values for what is not set). Whether the texture is registered is for
    /// the root to say.
    pub fn border_image(&self) -> Option<BorderImage> {
        let texture = self.border_image_source.as_ref()?.texture_id()?;
        Some(BorderImage {
            texture: texture.to_owned(),
            slice: self.border_image_slice.unwrap_or_default(),
            width: self.border_image_width.unwrap_or_default(),
            outset: self.border_image_outset.unwrap_or_default(),
            repeat: self.border_image_repeat.unwrap_or_default(),
        })
    }

    /// Whether the style sets a shadow, a ring or a gradient at all: the check that lets a plain element skip the work.
    pub fn has_box_decoration(&self) -> bool {
        self.box_shadow.is_some()
            || self.box_shadow_parts.is_some()
            || self.background_image.is_some()
            || self.gradient_parts.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::border_image::{BorderImageRepeat, EdgeValue, SliceValue};

    fn style(json: &str) -> StyleSpec {
        serde_json::from_str(json).expect("fixture style")
    }

    #[test]
    fn a_side_wins_over_the_shorthand_whatever_the_order() {
        let spec = style(
            r##"{"borderTopWidth":4,"borderWidth":1,"borderLeftColor":"#ff0000","borderColor":"#00ff00"}"##,
        );
        assert_eq!(spec.border_widths(), [4.0, 1.0, 1.0, 1.0]);
        assert_eq!(
            spec.border_colors(),
            [
                Some("#00ff00"),
                Some("#00ff00"),
                Some("#00ff00"),
                Some("#ff0000")
            ]
        );
        let corners =
            style(r##"{"borderTopLeftRadius":0,"borderTopRightRadius":0,"borderRadius":8}"##);
        assert_eq!(corners.border_radii(), [0.0, 0.0, 8.0, 8.0]);
    }

    #[test]
    fn a_later_shorthand_resets_the_sides_an_earlier_layer_set() {
        let mut spec =
            style(r##"{"borderTopWidth":4,"borderRightColor":"#111111","borderTopLeftRadius":0}"##);
        spec.merge(&style(
            r##"{"borderWidth":2,"borderColor":"#222222","borderRadius":6}"##,
        ));
        assert_eq!(spec.border_widths(), [2.0; 4]);
        assert_eq!(spec.border_colors(), [Some("#222222"); 4]);
        assert_eq!(spec.border_radii(), [6.0; 4]);
        // And a side set after it applies on top.
        spec.merge(&style(r##"{"borderBottomWidth":0}"##));
        assert_eq!(spec.border_widths(), [2.0, 2.0, 0.0, 2.0]);
    }

    #[test]
    fn border_style_none_takes_the_width_away() {
        let spec = style(r#"{"borderWidth":3,"borderStyle":"none"}"#);
        assert_eq!(spec.border_widths(), [0.0; 4]);
        assert_eq!(
            spec.taffy_style().expect("valid").border.top,
            taffy::LengthPercentage::length(0.0)
        );
        let solid = style(r#"{"borderWidth":3,"borderStyle":"solid"}"#);
        assert_eq!(solid.border_widths(), [3.0; 4]);
    }

    #[test]
    fn per_side_widths_reach_the_layout() {
        let spec = style(r#"{"borderLeftWidth":5,"borderBottomWidth":2}"#);
        let border = spec.taffy_style().expect("valid").border;
        assert_eq!(border.left, taffy::LengthPercentage::length(5.0));
        assert_eq!(border.bottom, taffy::LengthPercentage::length(2.0));
        assert_eq!(border.top, taffy::LengthPercentage::length(0.0));
    }

    #[test]
    fn an_outline_needs_a_solid_style_and_a_visible_colour() {
        assert_eq!(
            style(r#"{"outlineWidth":2}"#).outline(),
            None,
            "the default style is none"
        );
        assert!(style(r#"{"outlineWidth":2}"#).has_authored_outline());
        let solid = style(
            r##"{"outlineStyle":"solid","outlineWidth":2,"outlineColor":"#3b82f6","outlineOffset":2}"##,
        );
        let outline = solid.outline().expect("an outline");
        assert_eq!((outline.width, outline.offset), (2.0, 2.0));
        assert!(outline.color.is_some());
        // Tailwind's outline-none: a transparent two pixel outline, which replaces the focus ring and draws nothing.
        let none = style(
            r##"{"outlineStyle":"solid","outlineWidth":2,"outlineColor":"#00000000","outlineOffset":2}"##,
        );
        assert_eq!(none.outline(), None);
        assert!(none.has_authored_outline());
        assert_eq!(
            style(r#"{"outlineStyle":"solid"}"#)
                .outline()
                .expect("medium")
                .width,
            MEDIUM_OUTLINE_WIDTH_PX
        );
        assert!(!style(r#"{"opacity":1}"#).has_authored_outline());
    }

    #[test]
    fn shadows_and_gradients_resolve_from_an_explicit_value_or_the_utilities() {
        let parts = style(
            r##"{"boxShadowParts":{"ringWidth":2},"gradientParts":{"direction":"to-r","from":"#000000"}}"##,
        );
        assert_eq!(parts.box_shadow_list().0.len(), 2);
        assert!(parts.background_gradient().is_some());
        assert!(parts.has_box_decoration());
        let mut merged = parts.clone();
        merged.merge(&style(r#"{"boxShadow":"none","backgroundImage":"none"}"#));
        assert!(merged.box_shadow_list().is_empty());
        assert!(merged.background_gradient().is_none());
        // A utility after an explicit value takes the property back.
        merged.merge(&style(r#"{"boxShadowParts":{"ringWidth":1}}"#));
        assert_eq!(merged.box_shadow_list().0.len(), 2);
        assert!(!style(r#"{"opacity":1}"#).has_box_decoration());
    }

    /// The JS style compiler's output for the paint utilities (`tests/fixtures/paint-styles.json`, checked by
    /// `tests/utilities-paint.test.ts`) must be exactly what this crate accepts, and compose to what the classes mean.
    #[test]
    fn the_js_compilers_paint_output_parses_validates_and_composes() {
        #[derive(serde::Deserialize)]
        struct Case {
            #[serde(rename = "className")]
            class_name: String,
            compiled: crate::props::StyleLayers,
        }
        let cases: Vec<Case> =
            serde_json::from_str(include_str!("../tests/fixtures/paint-styles.json"))
                .expect("the fixture parses with deny_unknown_fields");
        assert!(cases.len() >= 10);
        let resolve = |case: &Case, hover: bool, focus: bool| -> StyleSpec {
            let mut spec = StyleSpec::default();
            for layer in &case.compiled.layers {
                let states_hold = layer.states.iter().all(|state| match state {
                    crate::props::PseudoState::Hover => hover,
                    crate::props::PseudoState::Focus | crate::props::PseudoState::FocusVisible => {
                        focus
                    }
                    _ => false,
                });
                if states_hold {
                    spec.merge(&layer.style);
                }
            }
            spec
        };
        for case in &cases {
            case.compiled
                .validate()
                .unwrap_or_else(|error| panic!("{}: {error}", case.class_name));
            for hover in [false, true] {
                for focus in [false, true] {
                    resolve(case, hover, focus)
                        .taffy_style()
                        .unwrap_or_else(|error| panic!("{}: {error}", case.class_name));
                }
            }
        }
        // `shadow-sm ring-1 ring-black/5 focus:ring-2 focus:ring-indigo-500 hover:shadow-lg`: the shadow survives the ring's change.
        let card = &cases[0];
        let at_rest = resolve(card, false, false).box_shadow_list();
        assert_eq!(at_rest.0.len(), 3, "ring offset, ring, one-layer shadow-sm");
        assert_eq!(at_rest.0[1].spread, 1.0);
        let focused = resolve(card, false, true).box_shadow_list();
        assert_eq!(focused.0.len(), 3);
        assert_eq!(focused.0[1].spread, 2.0);
        assert_eq!(focused.0[2].blur, 2.0, "the shadow stays");
        let hovered = resolve(card, true, false).box_shadow_list();
        assert_eq!(hovered.0.len(), 4, "shadow-lg has two layers");
        assert_eq!(hovered.0[1].spread, 1.0, "the ring stays");
        // `border-t-4 border-indigo-500 border-b border-b-slate-200 rounded-t-xl rounded-bl-md`.
        let accent = resolve(&cases[3], false, false);
        assert_eq!(accent.border_widths(), [4.0, 0.0, 1.0, 0.0]);
        assert_eq!(accent.border_radii(), [12.0, 12.0, 0.0, 6.0]);
        assert_eq!(accent.border_colors()[2], Some("#e2e8f0"));
        // The gradient composes across hover and keeps its other stops.
        let gradient = &cases[7];
        let at_rest = resolve(gradient, false, false)
            .background_gradient()
            .expect("a gradient");
        let hovered = resolve(gradient, true, false)
            .background_gradient()
            .expect("a gradient");
        assert_eq!(at_rest.stops.len(), 3);
        assert_ne!(at_rest.stops[0].color, hovered.stops[0].color);
        assert_eq!(at_rest.stops[1], hovered.stops[1]);
        // `border-slice-12 border-slice-fill ... hover:border-slice-t-[25%] border-repeat-round`: the slice merges side by side.
        let framed = &cases[12];
        let at_rest = resolve(framed, false, false)
            .border_image()
            .expect("a border image");
        assert_eq!(at_rest.texture, "frame");
        assert_eq!(at_rest.slice.top, Some(SliceValue::Pixels(12.0)));
        assert_eq!(at_rest.slice.fill, Some(true));
        assert_eq!(at_rest.width.left, Some(EdgeValue::Pixels(10.0)));
        assert_eq!(at_rest.repeat, BorderImageRepeat::Round);
        let hovered = resolve(framed, true, false)
            .border_image()
            .expect("a border image");
        assert_eq!(hovered.slice.top, Some(SliceValue::Percent(25.0)));
        assert_eq!(hovered.slice.left, Some(SliceValue::Pixels(12.0)));
        // The inline text sets all four sides of each value.
        let inline = resolve(&cases[13], false, false)
            .border_image()
            .expect("a border image");
        assert_eq!(inline.slice.right, Some(SliceValue::Pixels(16.0)));
        assert_eq!(inline.slice.fill, Some(true));
        assert_eq!(inline.width.right, Some(EdgeValue::Auto));
        assert_eq!(inline.outset.top, Some(EdgeValue::Pixels(2.0)));
        assert_eq!(inline.outset.left, Some(EdgeValue::Multiple(0.0)));
        // `outline-none focus-visible:outline-2 focus-visible:outline-indigo-500`: authored, drawn only when focused.
        let outline = &cases[6];
        assert!(resolve(outline, false, false).has_authored_outline());
        assert_eq!(resolve(outline, false, false).outline(), None);
        assert_eq!(
            resolve(outline, false, true)
                .outline()
                .map(|outline| outline.width),
            Some(2.0)
        );
    }
}
