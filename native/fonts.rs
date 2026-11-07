//! The fonts a root draws its text with: the registry of faces `ReactUiRoot.registerFontFace` fills, CSS font matching over it
//! (`text_style/face.rs`), and the cache of `FontVariation`s that carry what a request needs beyond the face (a weight on a
//! variable font's axis, synthetic bold and italic, OpenType features, letter-spacing). The design is in
//! `docs/tracks/utilities-text.md`, "Fonts".

use std::collections::HashMap;

use godot::builtin::{Transform2D, VarDictionary};
use godot::classes::text_server::FontStyle;
use godot::classes::{Font, FontFile, FontVariation};
use godot::prelude::*;

use crate::text_style::face::{FaceChoice, FaceDesc, match_face};
use crate::text_style::resolve::{Feature, ShapingStyle};

/// The weight of a request that names none: CSS's `normal`.
const DEFAULT_WEIGHT: u16 = 400;
/// The `wght` axis' OpenType tag.
const WEIGHT_AXIS: &[u8; 4] = b"wght";
/// Skia's synthetic italic, which Chrome uses: a skew of a quarter (`SkFont::setSkewX(-SK_Scalar1 / 4)`).
const SYNTHETIC_ITALIC_SKEW: f32 = 0.25;
/// Skia's synthetic bold thickens an outline by the font size times a factor that goes from 1/24 at 9 px to 1/32 at 36 px
/// (`kStdFakeBoldInterpKeys` and `Values` in `SkScalerContext.cpp`).
const FAKE_BOLD_SMALL: (f32, f32) = (9.0, 1.0 / 24.0);
const FAKE_BOLD_LARGE: (f32, f32) = (36.0, 1.0 / 32.0);
/// How far a glyph's outline grows, in pixels per unit of `FontVariation.variation_embolden` and of font size
/// (`text_server_adv.cpp`, `_ensure_glyph`: `strength = embolden * size / 16`, in 26.6 units of size 64).
const EMBOLDEN_PER_OUTLINE_GROWTH: f32 = 16.0;
/// What the text server adds to a glyph's advance for the same strength, in pixels per unit of embolden per pixel of size
/// (`text_server_adv.cpp`, `_get_extra_advance`: `embolden * size / 4096` with the size in 26.6 units).
const ADVANCE_PER_EMBOLDEN: f32 = 1.0 / 64.0;
/// The most a size of text can be tracked by before the tracking font's synthetic outlines stop being worth rasterising.
const MAX_FRACTIONAL_TRACKING_EM: f32 = 1.0;

/// A registered face: the family it belongs to, what it covers and the font that draws it.
struct Face {
    /// The family name, lowercase.
    family: String,
    desc: FaceDesc,
    font: Gd<Font>,
}

/// What distinguishes one cached `FontVariation` from another. Equal requests share one, across every paragraph.
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct VariationKey {
    /// The registered face, or `None` for the theme font.
    face: Option<usize>,
    /// The value for a variable face's weight axis.
    axis_weight: Option<u16>,
    /// Bit pattern of the synthetic bold's embolden strength, and of the tracking's.
    embolden: u32,
    tracking: u32,
    skew: bool,
    features: Vec<(String, i32)>,
}

impl VariationKey {
    /// Whether the key asks for nothing the face does not do by itself.
    fn is_plain(&self) -> bool {
        self.axis_weight.is_none()
            && f32::from_bits(self.embolden) == 0.0
            && f32::from_bits(self.tracking) == 0.0
            && !self.skew
            && self.features.is_empty()
    }
}

/// The fonts a paragraph needs.
#[derive(Clone)]
pub(crate) struct ResolvedFont {
    /// The font the text is shaped with. With tracking it carries the extra advance of every glyph.
    pub(crate) shape: Gd<Font>,
    /// The font the glyphs are drawn with: `shape` without the tracking.
    pub(crate) draw: Gd<Font>,
    /// Whether the glyphs have to be drawn with `draw`, because `shape` is not the font they look like.
    pub(crate) tracked: bool,
    /// What the face is, for the metrics of an empty line.
    pub(crate) font_size: i32,
}

impl ResolvedFont {
    /// The font's ascent and descent at the size it is used at.
    pub(crate) fn extents(&self) -> (f32, f32) {
        (
            self.draw.get_ascent_ex().font_size(self.font_size).done(),
            self.draw.get_descent_ex().font_size(self.font_size).done(),
        )
    }
}

/// The registry of faces and the cache of fonts made from it.
#[derive(Default)]
pub(crate) struct FontBook {
    theme: Option<Gd<Font>>,
    faces: Vec<Face>,
    variations: HashMap<VariationKey, Gd<FontVariation>>,
    /// Changes whenever a face is registered: a text shaped before it may be shaped with other fonts now.
    epoch: u64,
}

fn tag(bytes: &[u8; 4]) -> i64 {
    i64::from(u32::from_be_bytes(*bytes))
}

impl FontBook {
    /// The font text uses when nothing names another. It stays the one the root took from its theme.
    pub(crate) fn set_theme_font(&mut self, font: Option<Gd<Font>>) {
        self.theme = font;
    }

    /// A number that changes with every registered face (see [`FontBook::register`]).
    pub(crate) fn epoch(&self) -> u64 {
        self.epoch
    }

    /// Register `font` as a face of `family` covering weights `weight_min..=weight_max` (one weight for a static face, the axis'
    /// range for a variable one). A later registration of the same family, weight range and style replaces the earlier.
    pub(crate) fn register(
        &mut self,
        family: &str,
        weight_min: u16,
        weight_max: u16,
        italic: bool,
        font: Gd<Font>,
    ) -> Result<(), String> {
        let family = family.trim().to_lowercase();
        if family.is_empty() {
            return Err("a font face needs a family name".into());
        }
        if weight_min == 0 || weight_min > weight_max {
            return Err(format!(
                "the weights {weight_min}..={weight_max} are not a range of CSS weights"
            ));
        }
        if font.get_rids().is_empty() {
            return Err(format!("the font for {family} has no data"));
        }
        let desc = FaceDesc {
            weight_min,
            weight_max,
            italic,
        };
        match self
            .faces
            .iter_mut()
            .find(|face| face.family == family && face.desc == desc)
        {
            Some(existing) => existing.font = font,
            None => self.faces.push(Face { family, desc, font }),
        }
        // Variations are made from the faces; a replaced face's are stale.
        self.variations.clear();
        self.epoch += 1;
        Ok(())
    }

    /// The faces `families` name, from the first family that has any. Empty when none does.
    fn faces_of(&self, families: &[String]) -> Vec<usize> {
        for family in families {
            let key = family.to_lowercase();
            let indices: Vec<usize> = self
                .faces
                .iter()
                .enumerate()
                .filter(|(_, face)| face.family == key)
                .map(|(index, _)| index)
                .collect();
            if !indices.is_empty() {
                return indices;
            }
        }
        Vec::new()
    }

    /// The description of the theme font: a face of the weight and style it declares.
    fn theme_desc(font: &Gd<Font>) -> FaceDesc {
        let style = font.get_font_style();
        let italic = style.is_set(FontStyle::ITALIC);
        let weight = u16::try_from(font.get_font_weight())
            .ok()
            .filter(|weight| *weight > 0);
        let fixed = |weight| FaceDesc::fixed(weight, italic);
        if let Ok(file) = font.clone().try_cast::<FontFile>()
            && let Some(axis) = file
                .get_supported_variation_list()
                .get(tag(WEIGHT_AXIS))
                .and_then(|range| range.try_to::<Vector3>().ok())
        {
            return FaceDesc {
                weight_min: axis.x.round() as u16,
                weight_max: axis.y.round() as u16,
                italic,
            };
        }
        fixed(weight.unwrap_or(DEFAULT_WEIGHT))
    }

    /// The fonts for a request: the face CSS matching picks from the families it names (or the theme font), with what the
    /// browser would add for the weight, the slant, the features and the letter-spacing.
    pub(crate) fn resolve(&mut self, style: &ShapingStyle) -> Result<ResolvedFont, String> {
        let theme = self.theme.clone().ok_or("the root has no theme font yet")?;
        let named = self.faces_of(&style.families);
        // The faces CSS matching chooses among, and where each comes from (`None` is the theme font).
        let (descs, sources): (Vec<FaceDesc>, Vec<Option<usize>>) = if named.is_empty() {
            (vec![Self::theme_desc(&theme)], vec![None])
        } else {
            (
                named.iter().map(|&index| self.faces[index].desc).collect(),
                named.iter().map(|&index| Some(index)).collect(),
            )
        };
        let choice = match_face(&descs, style.weight.unwrap_or(DEFAULT_WEIGHT), style.italic)
            .ok_or("no face matches the request")?;
        let face = sources[choice.index];
        let base = face.map_or(theme, |index| self.faces[index].font.clone());
        let variable = descs[choice.index].weight_min != descs[choice.index].weight_max;
        // The theme font keeps the weight it is declared with unless the request names one.
        let sets_axis = variable && (face.is_some() || style.weight.is_some());
        let draw_key = draw_key(face, &choice, sets_axis, style);
        let tracking = tracking_embolden(style.letter_spacing, style.font_size);
        let draw: Gd<Font> = if draw_key.is_plain() {
            base.clone()
        } else {
            self.variation(&draw_key, &base).upcast()
        };
        if tracking == 0.0 {
            return Ok(ResolvedFont {
                shape: draw.clone(),
                draw,
                tracked: false,
                font_size: style.font_size,
            });
        }
        let shape_key = VariationKey {
            tracking: tracking.to_bits(),
            ..draw_key
        };
        Ok(ResolvedFont {
            shape: self.variation(&shape_key, &base).upcast(),
            draw,
            tracked: true,
            font_size: style.font_size,
        })
    }

    fn variation(&mut self, key: &VariationKey, base: &Gd<Font>) -> Gd<FontVariation> {
        if let Some(existing) = self.variations.get(key) {
            return existing.clone();
        }
        let mut variation = FontVariation::new_gd();
        variation.set_base_font(base);
        if let Some(weight) = key.axis_weight {
            let mut axes = VarDictionary::new();
            axes.set(tag(WEIGHT_AXIS), f64::from(weight));
            variation.set_variation_opentype(&axes);
        }
        let embolden = f32::from_bits(key.embolden) + f32::from_bits(key.tracking);
        if embolden != 0.0 {
            variation.set_variation_embolden(embolden);
        }
        if key.skew {
            variation.set_variation_transform(synthetic_italic());
        }
        if !key.features.is_empty() {
            let mut features = VarDictionary::new();
            for (name, value) in &key.features {
                features.set(tag_of(name), i64::from(*value));
            }
            variation.set_opentype_features(&features);
        }
        self.variations.insert(key.clone(), variation.clone());
        variation
    }
}

fn tag_of(name: &str) -> i64 {
    let mut bytes = [b' '; 4];
    for (slot, byte) in bytes.iter_mut().zip(name.bytes()) {
        *slot = byte;
    }
    tag(&bytes)
}

fn draw_key(
    face: Option<usize>,
    choice: &FaceChoice,
    sets_axis: bool,
    style: &ShapingStyle,
) -> VariationKey {
    VariationKey {
        face,
        axis_weight: sets_axis.then_some(choice.weight),
        embolden: if choice.synthetic_bold {
            synthetic_bold_embolden(style.font_size).to_bits()
        } else {
            0.0_f32.to_bits()
        },
        tracking: 0.0_f32.to_bits(),
        skew: choice.synthetic_italic,
        features: style
            .features
            .iter()
            .map(|(name, value): &Feature| ((*name).to_string(), *value))
            .collect(),
    }
}

/// The embolden strength that grows an outline by what Skia's synthetic bold grows it by at `font_size`.
pub(crate) fn synthetic_bold_embolden(font_size: i32) -> f32 {
    let (small_size, small_factor) = FAKE_BOLD_SMALL;
    let (large_size, large_factor) = FAKE_BOLD_LARGE;
    let size = font_size as f32;
    let blend = ((size - small_size) / (large_size - small_size)).clamp(0.0, 1.0);
    let factor = small_factor + (large_factor - small_factor) * blend;
    EMBOLDEN_PER_OUTLINE_GROWTH * factor
}

/// The embolden strength whose extra advance, per glyph, is `letter_spacing` px at `font_size`. The text server adds
/// `embolden * size / 64` px to the advance of every glyph it shapes (the last of a line too, as CSS adds letter-spacing),
/// which is a fraction of a pixel where `SPACING_GLYPH`, `FontVariation.set_spacing` and `shaped_text_set_spacing` are whole
/// pixels. The font made with it is only ever shaped with; its glyphs are drawn with the font without it.
pub(crate) fn tracking_embolden(letter_spacing: f32, font_size: i32) -> f32 {
    if letter_spacing == 0.0 {
        return 0.0;
    }
    debug_assert!(letter_spacing.abs() < MAX_FRACTIONAL_TRACKING_EM * font_size as f32);
    letter_spacing / (ADVANCE_PER_EMBOLDEN * font_size as f32)
}

/// The slant of an italic Skia makes up, as the glyph transform FreeType applies.
fn synthetic_italic() -> Transform2D {
    Transform2D::from_cols(
        Vector2::new(1.0, 0.0),
        Vector2::new(SYNTHETIC_ITALIC_SKEW, 1.0),
        Vector2::ZERO,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn synthetic_bold_grows_the_outline_by_skias_amount() {
        // Skia: size / 24 up to 9 px, size / 32 from 36 px, between them a straight line.
        let grown =
            |size: i32| synthetic_bold_embolden(size) * size as f32 / EMBOLDEN_PER_OUTLINE_GROWTH;
        assert!((grown(9) - 9.0 / 24.0).abs() < 1e-5);
        assert!((grown(36) - 36.0 / 32.0).abs() < 1e-5);
        assert!((grown(100) - 100.0 / 32.0).abs() < 1e-4);
        assert!((grown(4) - 4.0 / 24.0).abs() < 1e-5);
        // Halfway between the keys (22.5 px) the factor is halfway between 1/24 and 1/32.
        let halfway = (1.0 / 24.0 + 1.0 / 32.0) / 2.0;
        assert!(
            (synthetic_bold_embolden(22) * 22.0 / EMBOLDEN_PER_OUTLINE_GROWTH
                - 22.0 * (1.0 / 24.0 + (halfway - 1.0 / 24.0) * (13.0 / 13.5)))
                .abs()
                < 1e-3
        );
    }

    #[test]
    fn tracking_embolden_makes_the_text_server_add_the_spacing_as_advance() {
        // The server adds embolden * size / 64 px to each advance.
        for (spacing, size) in [
            (0.35_f32, 14),
            (-0.35, 14),
            (0.4, 16),
            (1.6, 16),
            (-2.4, 48),
            (0.05, 12),
        ] {
            let strength = tracking_embolden(spacing, size);
            let advance = strength * size as f32 / 64.0;
            assert!((advance - spacing).abs() < 1e-6, "{spacing} at {size}");
        }
        assert_eq!(tracking_embolden(0.0, 16), 0.0);
    }

    #[test]
    fn feature_tags_are_four_bytes() {
        assert_eq!(tag_of("tnum"), i64::from(u32::from_be_bytes(*b"tnum")));
        assert_eq!(tag_of("lnum"), 0x6c6e_756d);
    }
}
