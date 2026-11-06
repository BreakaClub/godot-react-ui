//! CSS filter lists (`filter`, `backdrop-filter`): parsing, validation, serialisation for Stylo, and
//! composition into what the renderer draws (plan Phase V1, D40). Nothing here touches Godot.
//!
//! A list is the CSS functions in order. The renderer draws one Gaussian blur and one colour matrix
//! (plus, for `filter` only, one drop shadow), so [`FilterEffect::compose`] folds a list into those:
//! Gaussian blurs add in variance, and every other function is an affine colour map that commutes with
//! a blur. One difference from a browser is stated in the README: the maps are composed into one matrix
//! and applied once after the blur, so values that leave `[0, 1]` between two functions are not clamped
//! between them.

use std::fmt::Write as _;

use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::props::StyleSpec;

/// The largest `blur()` radius accepted, in CSS pixels. Tailwind's `blur-3xl` is 64 px; this is four
/// times that. A blur is limited further by the mip levels of the render target (`blur.rs`).
pub const MAX_BLUR_CSS_PX: f32 = 256.0;
/// A colour channel's range in `rgb()` notation.
const CHANNEL_MAX: f32 = 255.0;
const PERCENT: f32 = 100.0;
/// Angle units to degrees (CSS Values 4: 400 grad and 1 turn are a full circle).
const DEGREES_PER_GRAD: f32 = 0.9;
const DEGREES_PER_TURN: f32 = 360.0;
/// Rec. 709 luminance weights of the Filter Effects `grayscale()` matrix, and the `saturate()` and
/// `hue-rotate()` matrices' weights, as the specification writes them.
const GRAY: [f32; 3] = [0.2126, 0.7152, 0.0722];
const SEPIA: [[f32; 3]; 3] = [
    [0.393, 0.769, 0.189],
    [0.349, 0.686, 0.168],
    [0.272, 0.534, 0.131],
];
const SATURATE: [f32; 3] = [0.213, 0.715, 0.072];

/// An sRGB colour with straight alpha, components in `[0, 1]`.
pub type Rgba = [f32; 4];

/// Which property a list belongs to: `filter` (the element and its subtree) or `backdrop-filter` (what
/// is behind the element). Only `filter` has `drop-shadow()`; only `backdrop-filter` has an `opacity`
/// utility, because Tailwind's `opacity-*` is the element's own opacity.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FilterKind {
    Filter,
    Backdrop,
}

/// `drop-shadow()`: offsets and blur radius in CSS pixels. `color` is `None` for `currentcolor`, which
/// [`FilterList::resolve_current_color`] replaces with the element's text colour.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct DropShadow {
    pub x: f32,
    pub y: f32,
    pub blur: f32,
    pub color: Option<Rgba>,
}

/// One CSS filter function with its argument in the unit the renderer uses.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum FilterFunction {
    /// Standard deviation in CSS pixels.
    Blur(f32),
    Brightness(f32),
    Contrast(f32),
    Grayscale(f32),
    /// Degrees.
    HueRotate(f32),
    Invert(f32),
    Opacity(f32),
    Saturate(f32),
    Sepia(f32),
    DropShadow(DropShadow),
}

impl FilterFunction {
    /// The function with its argument at the identity: what a missing function interpolates from (CSS
    /// Filter Effects, "interpolation of filter functions"). Test-only: Stylo does the interpolating.
    #[cfg(test)]
    pub fn identity(self) -> FilterFunction {
        match self {
            Self::Blur(_) => Self::Blur(0.0),
            Self::Brightness(_) => Self::Brightness(1.0),
            Self::Contrast(_) => Self::Contrast(1.0),
            Self::Grayscale(_) => Self::Grayscale(0.0),
            Self::HueRotate(_) => Self::HueRotate(0.0),
            Self::Invert(_) => Self::Invert(0.0),
            Self::Opacity(_) => Self::Opacity(1.0),
            Self::Saturate(_) => Self::Saturate(1.0),
            Self::Sepia(_) => Self::Sepia(0.0),
            Self::DropShadow(shadow) => Self::DropShadow(DropShadow {
                x: 0.0,
                y: 0.0,
                blur: 0.0,
                color: shadow.color.map(|[r, g, b, _]| [r, g, b, 0.0]),
            }),
        }
    }

    fn name(self) -> &'static str {
        match self {
            Self::Blur(_) => "blur",
            Self::Brightness(_) => "brightness",
            Self::Contrast(_) => "contrast",
            Self::Grayscale(_) => "grayscale",
            Self::HueRotate(_) => "hue-rotate",
            Self::Invert(_) => "invert",
            Self::Opacity(_) => "opacity",
            Self::Saturate(_) => "saturate",
            Self::Sepia(_) => "sepia",
            Self::DropShadow(_) => "drop-shadow",
        }
    }
}

/// A `filter` or `backdrop-filter` value: the functions in order, empty for `none`.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct FilterList(pub Vec<FilterFunction>);

impl FilterList {
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// Parse CSS filter syntax (`none`, or one or more functions separated by whitespace).
    pub fn parse(input: &str) -> Result<FilterList, String> {
        parse_list(input).map(FilterList)
    }

    /// Check the limits that hold for any list: radii in range, `drop-shadow` only where allowed (a
    /// `backdrop-filter` has none, Filter Effects 2).
    pub fn validate(&self, kind: FilterKind) -> Result<(), String> {
        let allow_drop_shadow = kind == FilterKind::Filter;
        let mut shadows = 0;
        let mut blur_after_shadow = false;
        for function in &self.0 {
            match function {
                FilterFunction::Blur(radius) => {
                    if !radius.is_finite() || *radius < 0.0 || *radius > MAX_BLUR_CSS_PX {
                        return Err(format!(
                            "blur() must be between 0 and {MAX_BLUR_CSS_PX} px, got {radius}"
                        ));
                    }
                    blur_after_shadow |= shadows > 0;
                }
                FilterFunction::DropShadow(shadow) => {
                    if !allow_drop_shadow {
                        return Err("backdrop-filter has no drop-shadow()".into());
                    }
                    if [shadow.x, shadow.y, shadow.blur]
                        .iter()
                        .any(|value| !value.is_finite())
                        || shadow.blur < 0.0
                        || shadow.blur > MAX_BLUR_CSS_PX
                    {
                        return Err(format!(
                            "drop-shadow() needs finite offsets and a blur between 0 and {MAX_BLUR_CSS_PX} px"
                        ));
                    }
                    shadows += 1;
                }
                FilterFunction::Brightness(amount)
                | FilterFunction::Contrast(amount)
                | FilterFunction::Saturate(amount) => {
                    if !amount.is_finite() || *amount < 0.0 {
                        return Err(format!(
                            "{}() must be a finite number of at least 0, got {amount}",
                            function.name()
                        ));
                    }
                }
                FilterFunction::Grayscale(amount)
                | FilterFunction::Invert(amount)
                | FilterFunction::Opacity(amount)
                | FilterFunction::Sepia(amount) => {
                    if !amount.is_finite() || *amount < 0.0 || *amount > 1.0 {
                        return Err(format!(
                            "{}() must be between 0 and 1, got {amount}",
                            function.name()
                        ));
                    }
                }
                FilterFunction::HueRotate(angle) => {
                    if !angle.is_finite() {
                        return Err("hue-rotate() must be finite".into());
                    }
                }
            }
        }
        if shadows > 1 {
            return Err("only one drop-shadow() per filter is drawn (the renderer composes a blur, a colour matrix and one shadow)".into());
        }
        if blur_after_shadow {
            return Err(
                "blur() after drop-shadow() would blur the shadow; put the blur before it".into(),
            );
        }
        Ok(())
    }

    /// The list with `currentcolor` shadows replaced by `current`.
    pub fn resolve_current_color(&self, current: Rgba) -> FilterList {
        FilterList(
            self.0
                .iter()
                .map(|function| match function {
                    FilterFunction::DropShadow(shadow) => FilterFunction::DropShadow(DropShadow {
                        color: Some(shadow.color.unwrap_or(current)),
                        ..*shadow
                    }),
                    other => *other,
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
        for function in &self.0 {
            if !css.is_empty() {
                css.push(' ');
            }
            // Writing to a String cannot fail.
            let _ = match function {
                FilterFunction::Blur(radius) => write!(css, "blur({radius}px)"),
                FilterFunction::Brightness(amount) => write!(css, "brightness({amount})"),
                FilterFunction::Contrast(amount) => write!(css, "contrast({amount})"),
                FilterFunction::Grayscale(amount) => write!(css, "grayscale({amount})"),
                FilterFunction::HueRotate(angle) => write!(css, "hue-rotate({angle}deg)"),
                FilterFunction::Invert(amount) => write!(css, "invert({amount})"),
                FilterFunction::Opacity(amount) => write!(css, "opacity({amount})"),
                FilterFunction::Saturate(amount) => write!(css, "saturate({amount})"),
                FilterFunction::Sepia(amount) => write!(css, "sepia({amount})"),
                FilterFunction::DropShadow(shadow) => {
                    let [r, g, b, a] = shadow.color.unwrap_or([0.0, 0.0, 0.0, 1.0]);
                    write!(
                        css,
                        "drop-shadow(rgba({}, {}, {}, {a}) {}px {}px {}px)",
                        (r * CHANNEL_MAX).round(),
                        (g * CHANNEL_MAX).round(),
                        (b * CHANNEL_MAX).round(),
                        shadow.x,
                        shadow.y,
                        shadow.blur,
                    )
                }
            };
        }
        css
    }

    /// Interpolate two lists the way CSS does for equal-length prefixes of the same functions; a
    /// function missing from the shorter list interpolates from its identity. `None` when a pair of
    /// functions differ in kind (CSS then interpolates discretely). The reference the style engine's
    /// sampled lists are checked against (`style_engine::tests`); transitions themselves run in Stylo.
    #[cfg(test)]
    pub fn interpolate(&self, other: &FilterList, progress: f32) -> Option<FilterList> {
        let length = self.0.len().max(other.0.len());
        let mut out = Vec::with_capacity(length);
        for index in 0..length {
            let (from, to) = match (self.0.get(index), other.0.get(index)) {
                (Some(from), Some(to)) => (*from, *to),
                (Some(from), None) => (*from, from.identity()),
                (None, Some(to)) => (to.identity(), *to),
                (None, None) => unreachable!("index is below the longer list's length"),
            };
            out.push(interpolate_function(from, to, progress)?);
        }
        Some(FilterList(out))
    }
}

#[cfg(test)]
fn lerp(from: f32, to: f32, progress: f32) -> f32 {
    from + (to - from) * progress
}

#[cfg(test)]
fn interpolate_function(
    from: FilterFunction,
    to: FilterFunction,
    t: f32,
) -> Option<FilterFunction> {
    use FilterFunction as F;
    Some(match (from, to) {
        (F::Blur(a), F::Blur(b)) => F::Blur(lerp(a, b, t)),
        (F::Brightness(a), F::Brightness(b)) => F::Brightness(lerp(a, b, t)),
        (F::Contrast(a), F::Contrast(b)) => F::Contrast(lerp(a, b, t)),
        (F::Grayscale(a), F::Grayscale(b)) => F::Grayscale(lerp(a, b, t)),
        (F::HueRotate(a), F::HueRotate(b)) => F::HueRotate(lerp(a, b, t)),
        (F::Invert(a), F::Invert(b)) => F::Invert(lerp(a, b, t)),
        (F::Opacity(a), F::Opacity(b)) => F::Opacity(lerp(a, b, t)),
        (F::Saturate(a), F::Saturate(b)) => F::Saturate(lerp(a, b, t)),
        (F::Sepia(a), F::Sepia(b)) => F::Sepia(lerp(a, b, t)),
        (F::DropShadow(a), F::DropShadow(b)) => {
            let color = |shadow: DropShadow| shadow.color.unwrap_or([0.0, 0.0, 0.0, 1.0]);
            let (ca, cb) = (color(a), color(b));
            F::DropShadow(DropShadow {
                x: lerp(a.x, b.x, t),
                y: lerp(a.y, b.y, t),
                blur: lerp(a.blur, b.blur, t),
                color: Some([
                    lerp(ca[0], cb[0], t),
                    lerp(ca[1], cb[1], t),
                    lerp(ca[2], cb[2], t),
                    lerp(ca[3], cb[3], t),
                ]),
            })
        }
        _ => return None,
    })
}

// A value in a style layer is CSS text on the wire, validated when the commit is parsed.
impl<'de> Deserialize<'de> for FilterList {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        FilterList::parse(&text).map_err(serde::de::Error::custom)
    }
}

impl Serialize for FilterList {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_css())
    }
}

// ---------------------------------------------------------------------------------------------
// Utilities (Tailwind): separate functions that compose across variants.
// ---------------------------------------------------------------------------------------------

/// The functions Tailwind's separate utilities set (`blur-sm`, `hover:brightness-110`, ...). Each is
/// merged on its own across layers, so `blur-sm hover:brightness-110` keeps the blur on hover, where an
/// inline `filter` replaces the whole list. `opacity` is for `backdrop-filter` only.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FilterParts {
    pub blur: Option<f32>,
    pub brightness: Option<f32>,
    pub contrast: Option<f32>,
    pub grayscale: Option<f32>,
    pub hue_rotate: Option<f32>,
    pub invert: Option<f32>,
    pub opacity: Option<f32>,
    pub saturate: Option<f32>,
    pub sepia: Option<f32>,
    pub drop_shadow: Option<DropShadowPartValue>,
}

/// A utility's drop shadow, as set in a layer: `none` removes the shadow a lower layer set.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum DropShadowPartValue {
    Shadow(DropShadowPartSpec),
    None(NoShadow),
}

/// The JSON string `"none"`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct NoShadow;

impl Serialize for NoShadow {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str("none")
    }
}

impl<'de> Deserialize<'de> for NoShadow {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        if text == "none" {
            Ok(NoShadow)
        } else {
            Err(serde::de::Error::custom(format!(
                "dropShadow must be an object or \"none\", got {text:?}"
            )))
        }
    }
}

/// The wire form of [`DropShadowPart`] (a hex colour string).
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DropShadowPartSpec {
    pub x: f32,
    pub y: f32,
    pub blur: f32,
    pub color: String,
}

impl FilterParts {
    /// Overwrite the functions `other` sets.
    pub fn merge(&mut self, other: &FilterParts) {
        macro_rules! overwrite {
            ($($field:ident),+ $(,)?) => {{
                let FilterParts { $($field),+ } = other;
                $(
                    if $field.is_some() {
                        self.$field = $field.clone();
                    }
                )+
            }};
        }
        overwrite!(
            blur,
            brightness,
            contrast,
            grayscale,
            hue_rotate,
            invert,
            opacity,
            saturate,
            sepia,
            drop_shadow,
        );
    }

    pub fn validate(&self, kind: FilterKind) -> Result<(), String> {
        if kind == FilterKind::Backdrop && self.drop_shadow.is_some() {
            return Err("backdrop-filter has no drop-shadow".into());
        }
        if kind == FilterKind::Filter && self.opacity.is_some() {
            return Err("only backdrop-filter has an opacity utility".into());
        }
        // The list a utility composes is validated like any other.
        self.to_list(kind).validate(kind)?;
        if let Some(DropShadowPartValue::Shadow(shadow)) = &self.drop_shadow {
            parse_color_token(&shadow.color)
                .map_err(|error| format!("dropShadow color: {error}"))?;
        }
        Ok(())
    }

    /// The functions in Tailwind's fixed order: blur, brightness, contrast, grayscale, hue-rotate,
    /// invert, opacity (backdrop only), saturate, sepia, then the shadow (filter only).
    pub fn to_list(&self, kind: FilterKind) -> FilterList {
        let mut list = Vec::new();
        if let Some(radius) = self.blur {
            list.push(FilterFunction::Blur(radius));
        }
        if let Some(amount) = self.brightness {
            list.push(FilterFunction::Brightness(amount));
        }
        if let Some(amount) = self.contrast {
            list.push(FilterFunction::Contrast(amount));
        }
        if let Some(amount) = self.grayscale {
            list.push(FilterFunction::Grayscale(amount));
        }
        if let Some(angle) = self.hue_rotate {
            list.push(FilterFunction::HueRotate(angle));
        }
        if let Some(amount) = self.invert {
            list.push(FilterFunction::Invert(amount));
        }
        if kind == FilterKind::Backdrop
            && let Some(amount) = self.opacity
        {
            list.push(FilterFunction::Opacity(amount));
        }
        if let Some(amount) = self.saturate {
            list.push(FilterFunction::Saturate(amount));
        }
        if let Some(amount) = self.sepia {
            list.push(FilterFunction::Sepia(amount));
        }
        if kind == FilterKind::Filter
            && let Some(DropShadowPartValue::Shadow(shadow)) = &self.drop_shadow
            && let Ok(color) = parse_color_token(&shadow.color)
            && color != Some([0.0, 0.0, 0.0, 0.0])
        {
            list.push(FilterFunction::DropShadow(DropShadow {
                x: shadow.x,
                y: shadow.y,
                blur: shadow.blur,
                color,
            }));
        }
        FilterList(list)
    }
}

// ---------------------------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------------------------

/// A 4 x 5 colour matrix: row `i` gives output channel `i` (red, green, blue, alpha) as a weighted sum
/// of the input's four channels plus a constant, on straight sRGB values.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ColorMatrix(pub [[f32; 5]; 4]);

impl ColorMatrix {
    pub const IDENTITY: ColorMatrix = ColorMatrix([
        [1.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 1.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 1.0, 0.0],
    ]);

    pub fn is_identity(&self) -> bool {
        *self == Self::IDENTITY
    }

    /// The matrix that applies `self` and then `next`.
    pub fn then(&self, next: &ColorMatrix) -> ColorMatrix {
        let mut out = [[0.0; 5]; 4];
        for (row, out_row) in out.iter_mut().enumerate() {
            for (column, cell) in out_row.iter_mut().enumerate() {
                let mut sum: f32 = (0..4).map(|k| next.0[row][k] * self.0[k][column]).sum();
                if column == 4 {
                    sum += next.0[row][4];
                }
                *cell = sum;
            }
        }
        ColorMatrix(out)
    }

    /// `[r, g, b, a]` mapped, not clamped. Test-only: the shader applies the matrix.
    #[cfg(test)]
    pub fn apply(&self, color: Rgba) -> Rgba {
        let mut out = [0.0; 4];
        for (row, value) in out.iter_mut().enumerate() {
            *value = (0..4).map(|k| self.0[row][k] * color[k]).sum::<f32>() + self.0[row][4];
        }
        out
    }

    fn rgb(rows: [[f32; 3]; 3], offset: [f32; 3]) -> ColorMatrix {
        let mut matrix = Self::IDENTITY.0;
        for row in 0..3 {
            matrix[row][..3].copy_from_slice(&rows[row]);
            matrix[row][4] = offset[row];
        }
        ColorMatrix(matrix)
    }

    /// The matrix of a colour function, per Filter Effects 1 ("filter functions"). `None` for `blur()`
    /// and `drop-shadow()`.
    pub fn of(function: FilterFunction) -> Option<ColorMatrix> {
        use FilterFunction as F;
        let diagonal = |slope: f32, intercept: f32| {
            Self::rgb(
                [[slope, 0.0, 0.0], [0.0, slope, 0.0], [0.0, 0.0, slope]],
                [intercept; 3],
            )
        };
        Some(match function {
            F::Blur(_) | F::DropShadow(_) => return None,
            F::Brightness(amount) => diagonal(amount, 0.0),
            F::Contrast(amount) => diagonal(amount, 0.5 - 0.5 * amount),
            F::Invert(amount) => diagonal(1.0 - 2.0 * amount, amount),
            F::Opacity(amount) => {
                let mut matrix = Self::IDENTITY.0;
                matrix[3][3] = amount;
                ColorMatrix(matrix)
            }
            F::Grayscale(amount) => {
                let b = 1.0 - amount;
                let [r, g, bl] = GRAY;
                Self::rgb(
                    [
                        [r + (1.0 - r) * b, g - g * b, bl - bl * b],
                        [r - r * b, g + (1.0 - g) * b, bl - bl * b],
                        [r - r * b, g - g * b, bl + (1.0 - bl) * b],
                    ],
                    [0.0; 3],
                )
            }
            F::Sepia(amount) => {
                let b = 1.0 - amount;
                let row = |index: usize, own: usize| {
                    let mut cells = [0.0; 3];
                    for (column, cell) in cells.iter_mut().enumerate() {
                        let target = SEPIA[index][column];
                        let identity = if column == own { 1.0 } else { 0.0 };
                        *cell = target * amount + identity * b;
                    }
                    cells
                };
                Self::rgb([row(0, 0), row(1, 1), row(2, 2)], [0.0; 3])
            }
            F::Saturate(amount) => {
                let [r, g, bl] = SATURATE;
                Self::rgb(
                    [
                        [r + (1.0 - r) * amount, g - g * amount, bl - bl * amount],
                        [r - r * amount, g + (1.0 - g) * amount, bl - bl * amount],
                        [r - r * amount, g - g * amount, bl + (1.0 - bl) * amount],
                    ],
                    [0.0; 3],
                )
            }
            F::HueRotate(degrees) => {
                let (s, c) = degrees.to_radians().sin_cos();
                Self::rgb(
                    [
                        [
                            0.213 + c * 0.787 - s * 0.213,
                            0.715 - c * 0.715 - s * 0.715,
                            0.072 - c * 0.072 + s * 0.928,
                        ],
                        [
                            0.213 - c * 0.213 + s * 0.143,
                            0.715 + c * 0.285 + s * 0.140,
                            0.072 - c * 0.072 - s * 0.283,
                        ],
                        [
                            0.213 - c * 0.213 - s * 0.787,
                            0.715 - c * 0.715 + s * 0.715,
                            0.072 + c * 0.928 + s * 0.072,
                        ],
                    ],
                    [0.0; 3],
                )
            }
        })
    }
}

/// The `drop-shadow()` stage of an effect. `sigma_before` is the blur applied before the shadow (it
/// widens the shadow's blur: variances add), `blur_css_px` the shadow's own.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ShadowStage {
    pub x: f32,
    pub y: f32,
    pub blur_css_px: f32,
    pub color: Rgba,
}

/// What the renderer draws for a list: blur, colour map, and an optional shadow with a second colour
/// map after it.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FilterEffect {
    /// Standard deviation of the blur applied to the element, in CSS pixels (blurs add in variance).
    pub sigma_css_px: f32,
    /// The colour map applied after the blur (before the shadow, when there is one).
    pub matrix: ColorMatrix,
    pub shadow: Option<ShadowStage>,
    /// The colour map applied to the element with its shadow under it (identity without a shadow).
    pub after_shadow: ColorMatrix,
}

impl FilterEffect {
    pub const NONE: FilterEffect = FilterEffect {
        sigma_css_px: 0.0,
        matrix: ColorMatrix::IDENTITY,
        shadow: None,
        after_shadow: ColorMatrix::IDENTITY,
    };

    /// Fold a validated list into an effect. `current` is the colour of a `currentcolor` shadow.
    pub fn compose(list: &FilterList, current: Rgba) -> FilterEffect {
        let mut effect = FilterEffect::NONE;
        let mut variance = 0.0f32;
        for function in &list.0 {
            match function {
                FilterFunction::Blur(radius) => variance += radius * radius,
                FilterFunction::DropShadow(shadow) => {
                    effect.sigma_css_px = variance.sqrt();
                    effect.shadow = Some(ShadowStage {
                        x: shadow.x,
                        y: shadow.y,
                        blur_css_px: shadow.blur,
                        color: shadow.color.unwrap_or(current),
                    });
                }
                other => {
                    let matrix =
                        ColorMatrix::of(*other).expect("every other function is a colour map");
                    if effect.shadow.is_some() {
                        effect.after_shadow = effect.after_shadow.then(&matrix);
                    } else {
                        effect.matrix = effect.matrix.then(&matrix);
                    }
                }
            }
        }
        if effect.shadow.is_none() {
            effect.sigma_css_px = variance.sqrt();
        }
        effect
    }

    /// Whether drawing it changes nothing.
    pub fn is_none(&self) -> bool {
        self.sigma_css_px <= 0.0
            && self.matrix.is_identity()
            && self.shadow.is_none()
            && self.after_shadow.is_identity()
    }

    /// The part of the blur the shadow adds to the element's: the shadow's blur in variance with it.
    pub fn shadow_sigma_css_px(&self) -> Option<f32> {
        self.shadow.map(|shadow| {
            (self.sigma_css_px * self.sigma_css_px + shadow.blur_css_px * shadow.blur_css_px).sqrt()
        })
    }
}

impl StyleSpec {
    /// Whether the style sets any filter at all: the check that lets an element without one skip all
    /// filter work.
    pub fn has_filters(&self) -> bool {
        self.filter.is_some()
            || self.filter_parts.is_some()
            || self.backdrop_filter.is_some()
            || self.backdrop_filter_parts.is_some()
    }

    /// The `filter` list this style resolves to: an explicit `filter`, or the utilities' functions.
    pub fn filter_list(&self) -> FilterList {
        match (&self.filter, &self.filter_parts) {
            (Some(list), _) => list.clone(),
            (None, Some(parts)) => parts.to_list(FilterKind::Filter),
            (None, None) => FilterList::default(),
        }
    }

    pub fn backdrop_filter_list(&self) -> FilterList {
        match (&self.backdrop_filter, &self.backdrop_filter_parts) {
            (Some(list), _) => list.clone(),
            (None, Some(parts)) => parts.to_list(FilterKind::Backdrop),
            (None, None) => FilterList::default(),
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------------------------

fn parse_list(input: &str) -> Result<Vec<FilterFunction>, String> {
    let input = input.trim();
    if input.eq_ignore_ascii_case("none") {
        return Ok(Vec::new());
    }
    if input.is_empty() {
        return Err("a filter is `none` or a list of filter functions".into());
    }
    let mut functions = Vec::new();
    let mut rest = input;
    while !rest.is_empty() {
        let open = rest.find('(').ok_or_else(|| {
            format!("expected a filter function, found {rest:?} (url() filters are not supported)")
        })?;
        let name = rest[..open].trim().to_ascii_lowercase();
        let close = matching_paren(rest, open)
            .ok_or_else(|| format!("unclosed parenthesis in {:?}", rest[..open].trim()))?;
        let arguments = &rest[open + 1..close];
        functions.push(parse_function(&name, arguments)?);
        rest = rest[close + 1..].trim_start();
    }
    Ok(functions)
}

fn matching_paren(text: &str, open: usize) -> Option<usize> {
    let mut depth = 0usize;
    for (index, character) in text.char_indices().skip_while(|(index, _)| *index < open) {
        match character {
            '(' => depth += 1,
            ')' => {
                depth -= 1;
                if depth == 0 {
                    return Some(index);
                }
            }
            _ => {}
        }
    }
    None
}

fn parse_function(name: &str, arguments: &str) -> Result<FilterFunction, String> {
    // Units, keywords and colour names are ASCII case-insensitive in CSS (`4PX`, `90DEG`, `Currentcolor`), as the name is.
    let lowered = arguments.trim().to_ascii_lowercase();
    let arguments = lowered.as_str();
    let amount = |default: f32| -> Result<f32, String> {
        if arguments.is_empty() {
            Ok(default)
        } else {
            parse_amount(arguments).map_err(|error| format!("{name}(): {error}"))
        }
    };
    // These functions clamp an amount above 1 to 1 (Filter Effects 1).
    let clamped = |default: f32| amount(default).map(|value| value.min(1.0));
    Ok(match name {
        "blur" => FilterFunction::Blur(if arguments.is_empty() {
            0.0
        } else {
            parse_length(arguments).map_err(|error| format!("blur(): {error}"))?
        }),
        "brightness" => FilterFunction::Brightness(amount(1.0)?),
        "contrast" => FilterFunction::Contrast(amount(1.0)?),
        "saturate" => FilterFunction::Saturate(amount(1.0)?),
        "grayscale" => FilterFunction::Grayscale(clamped(1.0)?),
        "invert" => FilterFunction::Invert(clamped(1.0)?),
        "opacity" => FilterFunction::Opacity(clamped(1.0)?),
        "sepia" => FilterFunction::Sepia(clamped(1.0)?),
        "hue-rotate" => FilterFunction::HueRotate(if arguments.is_empty() {
            0.0
        } else {
            parse_angle(arguments).map_err(|error| format!("hue-rotate(): {error}"))?
        }),
        "drop-shadow" => FilterFunction::DropShadow(parse_drop_shadow(arguments)?),
        other => {
            return Err(format!(
                "unknown filter function {other}() (blur, brightness, contrast, drop-shadow, grayscale, hue-rotate, invert, opacity, saturate, sepia)"
            ));
        }
    })
}

fn parse_number(token: &str) -> Result<f32, String> {
    token
        .parse::<f32>()
        .ok()
        .filter(|value| value.is_finite())
        .ok_or_else(|| format!("expected a number, found {token:?}"))
}

/// A number, or a percentage as a fraction.
fn parse_amount(token: &str) -> Result<f32, String> {
    match token.strip_suffix('%') {
        Some(number) => parse_number(number).map(|value| value / PERCENT),
        None => parse_number(token),
    }
}

/// `4px`, or a unitless `0`.
fn parse_length(token: &str) -> Result<f32, String> {
    if let Some(number) = token.strip_suffix("px") {
        return parse_number(number);
    }
    match parse_number(token) {
        Ok(0.0) => Ok(0.0),
        _ => Err(format!(
            "expected a length in px (or 0), found {token:?}; em, rem and % lengths are not supported"
        )),
    }
}

fn parse_angle(token: &str) -> Result<f32, String> {
    for (suffix, to_degrees) in [
        ("deg", 1.0),
        ("grad", DEGREES_PER_GRAD),
        ("turn", DEGREES_PER_TURN),
    ] {
        if let Some(number) = token.strip_suffix(suffix) {
            return parse_number(number).map(|value| value * to_degrees);
        }
    }
    if let Some(number) = token.strip_suffix("rad") {
        return parse_number(number).map(f32::to_degrees);
    }
    match parse_number(token) {
        Ok(0.0) => Ok(0.0),
        _ => Err(format!(
            "expected an angle (deg, grad, rad or turn), found {token:?}"
        )),
    }
}

/// Whitespace-separated tokens, keeping parenthesised groups whole (`rgb(0 0 0 / 50%)`).
fn tokens(text: &str) -> Vec<&str> {
    let mut out = Vec::new();
    let mut depth = 0usize;
    let mut start = None;
    for (index, character) in text.char_indices() {
        match character {
            '(' => depth += 1,
            ')' => depth = depth.saturating_sub(1),
            _ => {}
        }
        if character.is_whitespace() && depth == 0 {
            if let Some(from) = start.take() {
                out.push(&text[from..index]);
            }
        } else if start.is_none() {
            start = Some(index);
        }
    }
    if let Some(from) = start {
        out.push(&text[from..]);
    }
    out
}

fn parse_drop_shadow(arguments: &str) -> Result<DropShadow, String> {
    let mut lengths = Vec::new();
    let mut color: Option<Option<Rgba>> = None;
    for token in tokens(arguments) {
        if let Ok(length) = parse_length(token) {
            lengths.push(length);
        } else {
            if color.is_some() {
                return Err(format!(
                    "drop-shadow(): more than one colour, found {token:?}"
                ));
            }
            color =
                Some(parse_color_token(token).map_err(|error| format!("drop-shadow(): {error}"))?);
        }
    }
    match lengths.as_slice() {
        [x, y] => Ok(DropShadow {
            x: *x,
            y: *y,
            blur: 0.0,
            color: color.unwrap_or(None),
        }),
        [x, y, blur] if *blur >= 0.0 => Ok(DropShadow {
            x: *x,
            y: *y,
            blur: *blur,
            color: color.unwrap_or(None),
        }),
        [_, _, _] => Err("drop-shadow(): the blur radius must not be negative".into()),
        _ => Err(format!(
            "drop-shadow() needs two or three lengths (x, y, blur) and an optional colour, found {arguments:?}"
        )),
    }
}

/// A colour: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`, `transparent`, `black`, `white`,
/// or `currentcolor` (returned as `None`).
pub fn parse_color_token(token: &str) -> Result<Option<Rgba>, String> {
    let lower = token.trim().to_ascii_lowercase();
    match lower.as_str() {
        "currentcolor" => return Ok(None),
        "transparent" => return Ok(Some([0.0, 0.0, 0.0, 0.0])),
        "black" => return Ok(Some([0.0, 0.0, 0.0, 1.0])),
        "white" => return Ok(Some([1.0, 1.0, 1.0, 1.0])),
        _ => {}
    }
    if let Some(hex) = lower.strip_prefix('#') {
        return parse_hex(hex).map(Some);
    }
    for prefix in ["rgba(", "rgb("] {
        if let Some(rest) = lower.strip_prefix(prefix) {
            let inner = rest
                .strip_suffix(')')
                .ok_or_else(|| format!("unclosed {prefix}) in {token:?}"))?;
            return parse_rgb_arguments(inner).map(Some);
        }
    }
    Err(format!(
        "unsupported colour {token:?} (use #hex, rgb(), rgba(), black, white, transparent or currentcolor)"
    ))
}

fn parse_hex(hex: &str) -> Result<Rgba, String> {
    if !hex.bytes().all(|byte| byte.is_ascii_hexdigit()) || !matches!(hex.len(), 3 | 4 | 6 | 8) {
        return Err(format!("#{hex} is not #RGB, #RGBA, #RRGGBB or #RRGGBBAA"));
    }
    let digits: Vec<u8> = hex
        .bytes()
        .map(|byte| (byte as char).to_digit(16).expect("checked hexadecimal") as u8)
        .collect();
    let channel = |index: usize| -> f32 {
        let value = if hex.len() <= 4 {
            digits[index] * 17
        } else {
            digits[index * 2] * 16 + digits[index * 2 + 1]
        };
        f32::from(value) / CHANNEL_MAX
    };
    let alpha = if matches!(hex.len(), 4 | 8) {
        channel(3)
    } else {
        1.0
    };
    Ok([channel(0), channel(1), channel(2), alpha])
}

fn parse_rgb_arguments(inner: &str) -> Result<Rgba, String> {
    let normalised = inner.replace([',', '/'], " ");
    let parts = tokens(&normalised);
    if !matches!(parts.len(), 3 | 4) {
        return Err(format!(
            "rgb() needs three channels and an optional alpha, found {inner:?}"
        ));
    }
    let channel = |token: &str| -> Result<f32, String> {
        match token.strip_suffix('%') {
            Some(number) => parse_number(number).map(|value| (value / PERCENT).clamp(0.0, 1.0)),
            None => parse_number(token).map(|value| (value / CHANNEL_MAX).clamp(0.0, 1.0)),
        }
    };
    let alpha = match parts.get(3) {
        Some(token) => parse_amount(token)?.clamp(0.0, 1.0),
        None => 1.0,
    };
    Ok([
        channel(parts[0])?,
        channel(parts[1])?,
        channel(parts[2])?,
        alpha,
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPSILON: f32 = 1e-4;

    fn list(css: &str) -> FilterList {
        FilterList::parse(css).unwrap_or_else(|error| panic!("{css:?}: {error}"))
    }

    fn close(a: &[f32], b: &[f32]) {
        assert_eq!(a.len(), b.len());
        for (x, y) in a.iter().zip(b) {
            assert!((x - y).abs() < EPSILON, "{a:?} != {b:?}");
        }
    }

    #[test]
    fn parses_every_function_with_units_and_percentages() {
        let parsed = list(
            "blur(4px) brightness(110%) contrast(1.25) grayscale(.5) hue-rotate(0.25turn) invert(100%) opacity(50%) saturate(2) sepia(1)",
        );
        assert_eq!(
            parsed.0,
            vec![
                FilterFunction::Blur(4.0),
                FilterFunction::Brightness(1.1),
                FilterFunction::Contrast(1.25),
                FilterFunction::Grayscale(0.5),
                FilterFunction::HueRotate(90.0),
                FilterFunction::Invert(1.0),
                FilterFunction::Opacity(0.5),
                FilterFunction::Saturate(2.0),
                FilterFunction::Sepia(1.0),
            ]
        );
        assert!(list("none").is_empty());
        assert!(list("  NONE ").is_empty());
        assert_eq!(list("BLUR(0)").0, vec![FilterFunction::Blur(0.0)]);
        assert_eq!(list("blur()").0, vec![FilterFunction::Blur(0.0)]);
        assert_eq!(list("grayscale()").0, vec![FilterFunction::Grayscale(1.0)]);
        close(
            &[list("hue-rotate(3.14159265rad)")
                .0
                .iter()
                .map(|f| match f {
                    FilterFunction::HueRotate(d) => *d,
                    _ => 0.0,
                })
                .sum::<f32>()],
            &[180.0],
        );
        assert_eq!(
            list("hue-rotate(200grad)").0,
            vec![FilterFunction::HueRotate(180.0)]
        );
        assert_eq!(
            list("grayscale(200%)").0,
            vec![FilterFunction::Grayscale(1.0)],
            "clamped to 1"
        );
    }

    #[test]
    fn units_and_keywords_are_case_insensitive_as_in_css() {
        assert_eq!(list("blur(4PX)").0, vec![FilterFunction::Blur(4.0)]);
        assert_eq!(list("Blur( 4Px )").0, vec![FilterFunction::Blur(4.0)]);
        assert_eq!(
            list("hue-rotate(90DEG)").0,
            vec![FilterFunction::HueRotate(90.0)]
        );
        assert_eq!(
            list("HUE-ROTATE(0.25TURN)").0,
            vec![FilterFunction::HueRotate(90.0)]
        );
        assert_eq!(
            list("hue-rotate(200GRAD)").0,
            vec![FilterFunction::HueRotate(180.0)]
        );
        close(
            &[match list("hue-rotate(3.14159265RAD)").0[0] {
                FilterFunction::HueRotate(degrees) => degrees,
                other => panic!("{other:?}"),
            }],
            &[180.0],
        );
        assert_eq!(
            list("brightness(110%)").0,
            vec![FilterFunction::Brightness(1.1)]
        );
        let FilterFunction::DropShadow(shadow) = list("drop-shadow(2PX 3Px 4px CURRENTCOLOR)").0[0]
        else {
            panic!("a drop shadow");
        };
        assert_eq!(
            (shadow.x, shadow.y, shadow.blur, shadow.color),
            (2.0, 3.0, 4.0, None)
        );
        let FilterFunction::DropShadow(shadow) =
            list("drop-shadow(0 4PX 8PX RGB(0 0 0 / 50%))").0[0]
        else {
            panic!("a drop shadow");
        };
        close(&shadow.color.unwrap(), &[0.0, 0.0, 0.0, 0.5]);
        assert!(FilterList::parse("blur(4 px)").is_err());
        assert!(FilterList::parse("blur(4EM)").is_err());
    }

    #[test]
    fn parses_drop_shadows_with_the_colour_first_or_last() {
        let shadow = |css: &str| match list(css).0[0] {
            FilterFunction::DropShadow(shadow) => shadow,
            other => panic!("{other:?}"),
        };
        let a = shadow("drop-shadow(0 4px 8px rgb(0 0 0 / 50%))");
        assert_eq!((a.x, a.y, a.blur), (0.0, 4.0, 8.0));
        close(&a.color.unwrap(), &[0.0, 0.0, 0.0, 0.5]);
        let b = shadow("drop-shadow(#ff000080 2px 3px)");
        assert_eq!((b.x, b.y, b.blur), (2.0, 3.0, 0.0));
        close(&b.color.unwrap(), &[1.0, 0.0, 0.0, 128.0 / 255.0]);
        let c = shadow("drop-shadow(1px 1px 1px rgba(255, 128, 0, .25))");
        close(&c.color.unwrap(), &[1.0, 128.0 / 255.0, 0.0, 0.25]);
        assert_eq!(
            shadow("drop-shadow(0 0 4px)").color,
            None,
            "currentcolor by default"
        );
        assert_eq!(shadow("drop-shadow(0 0 4px currentColor)").color, None);
    }

    #[test]
    fn rejects_what_it_cannot_draw_naming_the_problem() {
        for (css, fragment) in [
            ("blur(1em)", "px"),
            ("blur(-1px)", ""),
            ("brightness(abc)", "brightness()"),
            ("sparkle(2)", "unknown filter function"),
            ("url(#f)", "unknown filter function url()"),
            ("blur(4px", "unclosed"),
            ("drop-shadow(1px)", "two or three lengths"),
            ("drop-shadow(1px 2px red)", "unsupported colour"),
            ("hue-rotate(10)", "angle"),
            ("", "none"),
            ("4px", "expected a filter function"),
        ] {
            let result = FilterList::parse(css)
                .and_then(|parsed| parsed.validate(FilterKind::Filter).map(|_| parsed));
            let error = result.expect_err(css);
            assert!(error.contains(fragment), "{css:?} -> {error}");
        }
    }

    #[test]
    fn validation_limits() {
        assert!(
            list("blur(999px)")
                .validate(FilterKind::Backdrop)
                .unwrap_err()
                .contains("between 0 and 256")
        );
        assert!(
            list("drop-shadow(0 0 1px black)")
                .validate(FilterKind::Backdrop)
                .unwrap_err()
                .contains("no drop-shadow")
        );
        assert!(
            list("drop-shadow(0 0 1px black) drop-shadow(0 0 2px black)")
                .validate(FilterKind::Filter)
                .unwrap_err()
                .contains("only one")
        );
        assert!(
            list("drop-shadow(0 0 1px black) blur(2px)")
                .validate(FilterKind::Filter)
                .unwrap_err()
                .contains("blur() after")
        );
        assert!(
            list("blur(2px) drop-shadow(0 0 1px black) brightness(2)")
                .validate(FilterKind::Filter)
                .is_ok()
        );
    }

    #[test]
    fn serialises_to_css_the_style_engine_reads_back() {
        let original = list(
            "blur(4px) brightness(1.1) hue-rotate(30deg) drop-shadow(rgba(0, 0, 0, 0.5) 1px 2px 3px)",
        );
        assert_eq!(FilterList::parse(&original.to_css()).unwrap(), original);
        assert_eq!(FilterList::default().to_css(), "none");
    }

    #[test]
    fn function_matrices_match_the_specification_at_known_points() {
        let colour = [0.2, 0.4, 0.8, 1.0];
        let apply = |function| ColorMatrix::of(function).unwrap().apply(colour);
        close(
            &apply(FilterFunction::Brightness(1.5)),
            &[0.3, 0.6, 1.2, 1.0],
        );
        close(
            &apply(FilterFunction::Contrast(0.5)),
            &[0.35, 0.45, 0.65, 1.0],
        );
        close(&apply(FilterFunction::Invert(1.0)), &[0.8, 0.6, 0.2, 1.0]);
        close(&apply(FilterFunction::Invert(0.5)), &[0.5, 0.5, 0.5, 1.0]);
        close(
            &apply(FilterFunction::Opacity(0.25)),
            &[0.2, 0.4, 0.8, 0.25],
        );
        let luma = 0.2126 * 0.2 + 0.7152 * 0.4 + 0.0722 * 0.8;
        close(
            &apply(FilterFunction::Grayscale(1.0)),
            &[luma, luma, luma, 1.0],
        );
        close(&apply(FilterFunction::Grayscale(0.0)), &colour);
        close(&apply(FilterFunction::Saturate(1.0)), &colour);
        let sepia = apply(FilterFunction::Sepia(1.0));
        close(
            &sepia[..3],
            &[
                0.393 * 0.2 + 0.769 * 0.4 + 0.189 * 0.8,
                0.349 * 0.2 + 0.686 * 0.4 + 0.168 * 0.8,
                0.272 * 0.2 + 0.534 * 0.4 + 0.131 * 0.8,
            ],
        );
        close(&apply(FilterFunction::HueRotate(0.0)), &colour);
        // A full turn is the identity too.
        close(&apply(FilterFunction::HueRotate(360.0)), &colour);
        // Saturate(0) is the same grey as grayscale(1) up to the specifications' differing weights.
        let desaturated = apply(FilterFunction::Saturate(0.0));
        assert!((desaturated[0] - desaturated[1]).abs() < EPSILON);
    }

    #[test]
    fn composition_adds_blur_variances_and_orders_the_matrices() {
        let current = [1.0, 1.0, 1.0, 1.0];
        let effect = FilterEffect::compose(
            &list("blur(3px) brightness(2) blur(4px) invert(1)"),
            current,
        );
        assert!((effect.sigma_css_px - 5.0).abs() < EPSILON, "sqrt(9 + 16)");
        // brightness then invert: 1 - 2c.
        close(
            &effect.matrix.apply([0.25, 0.0, 0.5, 1.0]),
            &[0.5, 1.0, 0.0, 1.0],
        );
        assert!(effect.shadow.is_none());
        assert!(FilterEffect::compose(&FilterList::default(), current).is_none());
        assert!(!FilterEffect::compose(&list("brightness(1.1)"), current).is_none());
        assert!(FilterEffect::compose(&list("blur(0px) brightness(1)"), current).is_none());
    }

    #[test]
    fn a_shadow_splits_the_list_and_widens_with_the_blur_before_it() {
        let current = [0.5, 0.5, 0.5, 1.0];
        let effect = FilterEffect::compose(
            &list("blur(3px) sepia(1) drop-shadow(1px 2px 4px) invert(1)"),
            current,
        );
        assert!((effect.sigma_css_px - 3.0).abs() < EPSILON);
        let shadow = effect.shadow.expect("a shadow stage");
        assert_eq!((shadow.x, shadow.y, shadow.blur_css_px), (1.0, 2.0, 4.0));
        assert_eq!(
            shadow.color, current,
            "currentcolor resolves to the element colour"
        );
        assert!(
            (effect.shadow_sigma_css_px().unwrap() - 5.0).abs() < EPSILON,
            "sqrt(9 + 16)"
        );
        assert!(
            !effect.matrix.is_identity(),
            "sepia applies before the shadow"
        );
        close(
            &effect.after_shadow.apply([0.25, 0.5, 1.0, 1.0]),
            &[0.75, 0.5, 0.0, 1.0],
        );
    }

    #[test]
    fn interpolation_pads_with_identities_and_refuses_mismatched_functions() {
        let from = list("blur(0px)");
        let to = list("blur(8px) brightness(1.5)");
        let halfway = from.interpolate(&to, 0.5).expect("same kinds in order");
        assert_eq!(
            halfway.0,
            vec![FilterFunction::Blur(4.0), FilterFunction::Brightness(1.25)]
        );
        let end = from.interpolate(&to, 1.0).unwrap();
        assert_eq!(end, to, "the end state is exact");
        assert_eq!(
            from.interpolate(&to, 0.0).unwrap().0[1],
            FilterFunction::Brightness(1.0)
        );
        assert!(
            list("blur(2px)")
                .interpolate(&list("brightness(2)"), 0.5)
                .is_none()
        );
        assert_eq!(
            FilterList::default()
                .interpolate(&list("grayscale(1)"), 0.25)
                .unwrap()
                .0,
            vec![FilterFunction::Grayscale(0.25)]
        );
    }

    #[test]
    fn utilities_compose_in_tailwinds_order_and_merge_per_function() {
        let mut parts: FilterParts = serde_json::from_str(r#"{"blur":4}"#).unwrap();
        let hover: FilterParts = serde_json::from_str(r#"{"brightness":1.1}"#).unwrap();
        parts.merge(&hover);
        assert_eq!(
            parts.to_list(FilterKind::Filter).0,
            vec![FilterFunction::Blur(4.0), FilterFunction::Brightness(1.1)]
        );
        let override_blur: FilterParts = serde_json::from_str(r#"{"blur":8}"#).unwrap();
        parts.merge(&override_blur);
        assert_eq!(
            parts.to_list(FilterKind::Filter).0[0],
            FilterFunction::Blur(8.0)
        );
        let shadow: FilterParts =
            serde_json::from_str(r##"{"dropShadow":{"x":0,"y":1,"blur":2,"color":"#0000001a"}}"##)
                .unwrap();
        parts.merge(&shadow);
        assert!(
            matches!(
                parts.to_list(FilterKind::Filter).0.last(),
                Some(FilterFunction::DropShadow(_))
            ),
            "the shadow is last"
        );
        let none: FilterParts = serde_json::from_str(r#"{"dropShadow":"none"}"#).unwrap();
        parts.merge(&none);
        assert!(!matches!(
            parts.to_list(FilterKind::Filter).0.last(),
            Some(FilterFunction::DropShadow(_))
        ));
        // Backdrop lists put opacity between invert and saturate.
        let backdrop: FilterParts =
            serde_json::from_str(r#"{"saturate":1.5,"opacity":0.5,"invert":1}"#).unwrap();
        assert_eq!(
            backdrop.to_list(FilterKind::Backdrop).0,
            vec![
                FilterFunction::Invert(1.0),
                FilterFunction::Opacity(0.5),
                FilterFunction::Saturate(1.5)
            ]
        );
        assert!(
            backdrop.validate(FilterKind::Filter).is_err(),
            "filter has no opacity utility"
        );
        assert!(backdrop.validate(FilterKind::Backdrop).is_ok());
    }
}
