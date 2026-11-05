//! Typed native props: what a React element contributes to the mounted tree, with the style
//! layers that native resolves (docs/INTERACTION_PLAN.md sections 3.5, 3.6 and 4.2).
//!
//! Nothing here touches Godot. A prop set arrives as JSON inside a commit payload, is parsed into
//! these types with `deny_unknown_fields`, merged over the node's previous props and validated
//! before any mounted state changes.

use std::collections::BTreeSet;

use serde::de::{Deserialize, Deserializer};
use serde::{Deserialize as DeriveDeserialize, Serialize};
use taffy::geometry::{Point, Rect, Size};
use taffy::style::{
    AlignItems, Display, FlexDirection, FlexWrap, JustifyContent, LengthPercentage,
    LengthPercentageAuto, Overflow,
};
use taffy::style_helpers::{auto, fr, length, minmax};

/// What a node is. `TextInput` joins this enum with the text input phase.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    View,
    Text,
    Button,
}

impl Kind {
    /// `Text` carries its string in the `text` prop (React Native's rule), so it has no children.
    pub(crate) fn allows_children(self) -> bool {
        match self {
            Kind::View | Kind::Button => true,
            Kind::Text => false,
        }
    }
}

#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum Dimension {
    Num(f32),
    Text(String),
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DisplaySpec {
    Flex,
    Grid,
    None,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FlexDirectionSpec {
    Row,
    Column,
    RowReverse,
    ColumnReverse,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FlexWrapSpec {
    Nowrap,
    Wrap,
    WrapReverse,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AlignSpec {
    Start,
    End,
    Center,
    Stretch,
    Baseline,
    FlexStart,
    FlexEnd,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum JustifySpec {
    Start,
    End,
    Center,
    SpaceBetween,
    SpaceAround,
    SpaceEvenly,
    FlexStart,
    FlexEnd,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TextAlignSpec {
    Left,
    Center,
    Right,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub enum TransitionProperty {
    Width,
    Height,
    Opacity,
    BackgroundColor,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Easing {
    Linear,
    Ease,
    EaseIn,
    EaseOut,
    EaseInOut,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum InterpolateSize {
    NumericOnly,
    AllowKeywords,
}

/// `scroll` and `auto` join this enum with the scroll container phase.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OverflowSpec {
    Visible,
    Hidden,
}

#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TransitionSpec {
    pub properties: Vec<TransitionProperty>,
    pub duration_ms: f64,
    pub delay_ms: Option<f64>,
    pub easing: Option<Easing>,
}

impl TransitionSpec {
    pub fn validate(&self) -> Result<(), String> {
        if self.properties.is_empty() {
            return Err("transition.properties must not be empty".into());
        }
        let mut unique = BTreeSet::new();
        if self
            .properties
            .iter()
            .any(|property| !unique.insert(*property))
        {
            return Err("transition.properties must not contain duplicates".into());
        }
        if !self.duration_ms.is_finite() || self.duration_ms < 0.0 {
            return Err("transition.durationMs must be a finite nonnegative number".into());
        }
        if self
            .delay_ms
            .is_some_and(|delay| !delay.is_finite() || delay < 0.0)
        {
            return Err("transition.delayMs must be a finite nonnegative number".into());
        }
        Ok(())
    }
}

/// The style layers' conditions. `focus` and `focusVisible` apply to the focused element only,
/// `focusWithin` to it and its ancestors, `hover` and `active` to the target and its ancestors, and
/// `disabled` to a node whose own `disabled` prop is true (plan 3.6).
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub enum PseudoState {
    Hover,
    Active,
    Focus,
    FocusVisible,
    FocusWithin,
    Disabled,
}

/// One compiled class or inline style: applied when the viewport is at least `min_width` wide and
/// every listed state holds. Layers apply in order, later layers overriding earlier ones.
#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StyleLayer {
    #[serde(default)]
    pub min_width: Option<f32>,
    #[serde(default)]
    pub states: Vec<PseudoState>,
    pub style: StyleSpec,
}

#[derive(Clone, Debug, Default, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StyleLayers {
    pub layers: Vec<StyleLayer>,
}

impl StyleLayers {
    pub fn validate(&self) -> Result<(), String> {
        for (index, layer) in self.layers.iter().enumerate() {
            if layer
                .min_width
                .is_some_and(|width| !width.is_finite() || width < 0.0)
            {
                return Err(format!(
                    "style.layers[{index}].minWidth must be a finite nonnegative number"
                ));
            }
            layer
                .style
                .validate()
                .map_err(|error| format!("style.layers[{index}]: {error}"))?;
        }
        Ok(())
    }
}

/// Style longhands. Shorthands (`padding`, `margin`, `gap`, `overflow`) are expanded by the JS
/// compiler so merging layers is a plain ordered overwrite. `disabled` is a prop, not a style.
#[derive(Clone, Debug, Default, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StyleSpec {
    pub width: Option<Dimension>,
    pub height: Option<Dimension>,
    pub min_width: Option<Dimension>,
    pub min_height: Option<Dimension>,
    pub max_width: Option<Dimension>,
    pub max_height: Option<Dimension>,
    pub display: Option<DisplaySpec>,
    pub flex_direction: Option<FlexDirectionSpec>,
    pub flex_wrap: Option<FlexWrapSpec>,
    pub flex_grow: Option<f32>,
    pub flex_shrink: Option<f32>,
    pub flex_basis: Option<Dimension>,
    pub row_gap: Option<f32>,
    pub column_gap: Option<f32>,
    pub padding_top: Option<f32>,
    pub padding_right: Option<f32>,
    pub padding_bottom: Option<f32>,
    pub padding_left: Option<f32>,
    pub margin_top: Option<f32>,
    pub margin_right: Option<f32>,
    pub margin_bottom: Option<f32>,
    pub margin_left: Option<f32>,
    pub align_items: Option<AlignSpec>,
    pub align_self: Option<AlignSpec>,
    pub justify_content: Option<JustifySpec>,
    pub grid_template_columns: Option<u16>,
    pub background_color: Option<String>,
    pub color: Option<String>,
    pub font_size: Option<i32>,
    pub border_radius: Option<f32>,
    pub border_width: Option<f32>,
    pub border_color: Option<String>,
    pub opacity: Option<f32>,
    pub text_align: Option<TextAlignSpec>,
    pub transition: Option<TransitionSpec>,
    pub interpolate_size: Option<InterpolateSize>,
    pub overflow_x: Option<OverflowSpec>,
    pub overflow_y: Option<OverflowSpec>,
}

pub(crate) enum ParsedDimension {
    Length(f32),
    Percent(f32),
    Auto,
}

impl Dimension {
    pub(crate) fn value(&self) -> Result<ParsedDimension, String> {
        match self {
            Self::Num(value) if value.is_finite() && *value >= 0.0 => {
                Ok(ParsedDimension::Length(*value))
            }
            Self::Num(_) => Err("dimension must be a finite nonnegative number".into()),
            Self::Text(value) if value == "auto" => Ok(ParsedDimension::Auto),
            Self::Text(value) => {
                let percent = value
                    .strip_suffix('%')
                    .and_then(|number| number.parse::<f32>().ok())
                    .filter(|number| number.is_finite() && *number >= 0.0)
                    .ok_or_else(|| {
                        format!(
                            "invalid dimension {value:?}; expected auto or a nonnegative percentage"
                        )
                    })?;
                Ok(ParsedDimension::Percent(percent / 100.0))
            }
        }
    }
}

pub(crate) fn dimension(value: &Option<Dimension>) -> Result<taffy::style::Dimension, String> {
    Ok(match value.as_ref().map(Dimension::value).transpose()? {
        Some(ParsedDimension::Length(value)) => taffy::style::Dimension::length(value),
        Some(ParsedDimension::Percent(value)) => taffy::style::Dimension::percent(value),
        Some(ParsedDimension::Auto) | None => auto(),
    })
}

pub(crate) fn bound(value: &Option<Dimension>) -> Result<LengthPercentageAuto, String> {
    Ok(match value.as_ref().map(Dimension::value).transpose()? {
        Some(ParsedDimension::Length(value)) => LengthPercentageAuto::length(value),
        Some(ParsedDimension::Percent(value)) => LengthPercentageAuto::percent(value),
        Some(ParsedDimension::Auto) | None => auto(),
    })
}

pub(crate) fn align(value: AlignSpec) -> AlignItems {
    match value {
        AlignSpec::Start => AlignItems::START,
        AlignSpec::End => AlignItems::END,
        AlignSpec::Center => AlignItems::CENTER,
        AlignSpec::Stretch => AlignItems::STRETCH,
        AlignSpec::Baseline => AlignItems::BASELINE,
        AlignSpec::FlexStart => AlignItems::FLEX_START,
        AlignSpec::FlexEnd => AlignItems::FLEX_END,
    }
}

pub(crate) fn justify(value: JustifySpec) -> JustifyContent {
    match value {
        JustifySpec::Start => JustifyContent::START,
        JustifySpec::End => JustifyContent::END,
        JustifySpec::Center => JustifyContent::CENTER,
        JustifySpec::SpaceBetween => JustifyContent::SPACE_BETWEEN,
        JustifySpec::SpaceAround => JustifyContent::SPACE_AROUND,
        JustifySpec::SpaceEvenly => JustifyContent::SPACE_EVENLY,
        JustifySpec::FlexStart => JustifyContent::FLEX_START,
        JustifySpec::FlexEnd => JustifyContent::FLEX_END,
    }
}

fn overflow(value: Option<OverflowSpec>) -> Overflow {
    // Taffy fca167c style::Overflow and flexbox/grid automatic-minimum-size resolution
    // distinguish Hidden (zero minimum) from Visible (content minimum). Rendering owns clipping
    // separately; this preserves CSS layout semantics.
    match value.unwrap_or(OverflowSpec::Visible) {
        OverflowSpec::Visible => Overflow::Visible,
        OverflowSpec::Hidden => Overflow::Hidden,
    }
}

impl StyleSpec {
    /// Overwrite every field `other` sets. The exhaustive destructuring makes adding a field to
    /// `StyleSpec` without merging it a compile error.
    pub fn merge(&mut self, other: &StyleSpec) {
        macro_rules! overwrite {
            ($($field:ident),+ $(,)?) => {{
                let StyleSpec { $($field),+ } = other;
                $(
                    if $field.is_some() {
                        self.$field = $field.clone();
                    }
                )+
            }};
        }
        overwrite!(
            width,
            height,
            min_width,
            min_height,
            max_width,
            max_height,
            display,
            flex_direction,
            flex_wrap,
            flex_grow,
            flex_shrink,
            flex_basis,
            row_gap,
            column_gap,
            padding_top,
            padding_right,
            padding_bottom,
            padding_left,
            margin_top,
            margin_right,
            margin_bottom,
            margin_left,
            align_items,
            align_self,
            justify_content,
            grid_template_columns,
            background_color,
            color,
            font_size,
            border_radius,
            border_width,
            border_color,
            opacity,
            text_align,
            transition,
            interpolate_size,
            overflow_x,
            overflow_y,
        );
    }

    pub fn validate(&self) -> Result<(), String> {
        if let Some(transition) = &self.transition {
            transition.validate()?;
        }
        for (name, value) in [
            ("width", &self.width),
            ("height", &self.height),
            ("minWidth", &self.min_width),
            ("minHeight", &self.min_height),
            ("maxWidth", &self.max_width),
            ("maxHeight", &self.max_height),
            ("flexBasis", &self.flex_basis),
        ] {
            if let Some(value) = value {
                value.value().map_err(|error| format!("{name}: {error}"))?;
            }
        }
        for (name, value) in [
            ("flexGrow", self.flex_grow),
            ("flexShrink", self.flex_shrink),
            ("rowGap", self.row_gap),
            ("columnGap", self.column_gap),
            ("paddingTop", self.padding_top),
            ("paddingRight", self.padding_right),
            ("paddingBottom", self.padding_bottom),
            ("paddingLeft", self.padding_left),
            ("borderRadius", self.border_radius),
            ("borderWidth", self.border_width),
        ] {
            if value.is_some_and(|value| !value.is_finite() || value < 0.0) {
                return Err(format!("{name} must be a finite nonnegative number"));
            }
        }
        for (name, value) in [
            ("marginTop", self.margin_top),
            ("marginRight", self.margin_right),
            ("marginBottom", self.margin_bottom),
            ("marginLeft", self.margin_left),
        ] {
            if value.is_some_and(|value| !value.is_finite()) {
                return Err(format!("{name} must be finite"));
            }
        }
        if self
            .opacity
            .is_some_and(|value| !value.is_finite() || !(0.0..=1.0).contains(&value))
        {
            return Err("opacity must be between 0 and 1".into());
        }
        if self.font_size.is_some_and(|value| value <= 0) {
            return Err("fontSize must be a positive integer".into());
        }
        if self.grid_template_columns == Some(0) {
            return Err("gridTemplateColumns must be a positive integer".into());
        }
        for (name, value) in [
            ("backgroundColor", &self.background_color),
            ("color", &self.color),
            ("borderColor", &self.border_color),
        ] {
            if let Some(value) = value {
                let Some(hex) = value.strip_prefix('#') else {
                    return Err(format!("{name} must be a hex color"));
                };
                if !matches!(hex.len(), 3 | 4 | 6 | 8)
                    || !hex.bytes().all(|byte| byte.is_ascii_hexdigit())
                {
                    return Err(format!("{name} must be #RGB, #RGBA, #RRGGBB, or #RRGGBBAA"));
                }
            }
        }
        Ok(())
    }

    /// The Taffy style of a resolved (computed) style.
    pub fn taffy_style(&self) -> Result<taffy::Style, String> {
        self.validate()?;
        let border = LengthPercentage::length(self.border_width.unwrap_or(0.0));
        Ok(taffy::Style {
            overflow: Point {
                x: overflow(self.overflow_x),
                y: overflow(self.overflow_y),
            },
            display: match self.display.unwrap_or(DisplaySpec::Flex) {
                DisplaySpec::Flex => Display::Flex,
                DisplaySpec::Grid => Display::Grid,
                DisplaySpec::None => Display::None,
            },
            size: Size {
                width: dimension(&self.width)?,
                height: dimension(&self.height)?,
            },
            min_size: Size {
                width: bound(&self.min_width)?,
                height: bound(&self.min_height)?,
            },
            max_size: Size {
                width: bound(&self.max_width)?,
                height: bound(&self.max_height)?,
            },
            flex_direction: match self.flex_direction.unwrap_or(FlexDirectionSpec::Column) {
                FlexDirectionSpec::Row => FlexDirection::Row,
                FlexDirectionSpec::Column => FlexDirection::Column,
                FlexDirectionSpec::RowReverse => FlexDirection::RowReverse,
                FlexDirectionSpec::ColumnReverse => FlexDirection::ColumnReverse,
            },
            flex_wrap: match self.flex_wrap.unwrap_or(FlexWrapSpec::Nowrap) {
                FlexWrapSpec::Nowrap => FlexWrap::NoWrap,
                FlexWrapSpec::Wrap => FlexWrap::Wrap,
                FlexWrapSpec::WrapReverse => FlexWrap::WrapReverse,
            },
            flex_grow: self.flex_grow.unwrap_or(0.0),
            flex_shrink: self.flex_shrink.unwrap_or(1.0),
            flex_basis: dimension(&self.flex_basis)?,
            gap: Size {
                width: LengthPercentage::length(self.column_gap.unwrap_or(0.0)),
                height: LengthPercentage::length(self.row_gap.unwrap_or(0.0)),
            },
            padding: Rect {
                left: LengthPercentage::length(self.padding_left.unwrap_or(0.0)),
                right: LengthPercentage::length(self.padding_right.unwrap_or(0.0)),
                top: LengthPercentage::length(self.padding_top.unwrap_or(0.0)),
                bottom: LengthPercentage::length(self.padding_bottom.unwrap_or(0.0)),
            },
            margin: Rect {
                left: LengthPercentageAuto::length(self.margin_left.unwrap_or(0.0)),
                right: LengthPercentageAuto::length(self.margin_right.unwrap_or(0.0)),
                top: LengthPercentageAuto::length(self.margin_top.unwrap_or(0.0)),
                bottom: LengthPercentageAuto::length(self.margin_bottom.unwrap_or(0.0)),
            },
            border: Rect {
                left: border,
                right: border,
                top: border,
                bottom: border,
            },
            align_items: self.align_items.map(align).unwrap_or(AlignItems::STRETCH),
            align_self: self.align_self.map(align),
            justify_content: self
                .justify_content
                .map(justify)
                .unwrap_or(JustifyContent::FLEX_START),
            grid_template_columns: self
                .grid_template_columns
                .map(|count| vec![minmax(length(0.0), fr(1.0)); usize::from(count)])
                .unwrap_or_default(),
            ..taffy::Style::default()
        })
    }
}

/// Everything a React element asks of native besides its place in the tree. Every field is
/// optional; an absent field is the default.
#[derive(Clone, Debug, Default, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PropsSpec {
    pub style: Option<StyleLayers>,
    pub text: Option<String>,
    pub disabled: Option<bool>,
    /// Set by Suspense while a boundary shows its fallback; the node and its subtree take no space.
    pub hidden: Option<bool>,
    #[serde(rename = "testID")]
    pub test_id: Option<String>,
}

/// A change to one prop inside a commit payload. JSON `null` resets the prop to its default and an
/// absent key leaves it alone, which `Option<Option<T>>` cannot express through serde.
#[derive(Clone, Debug, Default, PartialEq)]
pub enum Patch<T> {
    #[default]
    Keep,
    Reset,
    Set(T),
}

impl<'de, T: Deserialize<'de>> Deserialize<'de> for Patch<T> {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Ok(match Option::<T>::deserialize(deserializer)? {
            Some(value) => Patch::Set(value),
            None => Patch::Reset,
        })
    }
}

impl<T: Clone> Patch<T> {
    fn apply(&self, previous: &Option<T>) -> Option<T> {
        match self {
            Patch::Keep => previous.clone(),
            Patch::Reset => None,
            Patch::Set(value) => Some(value.clone()),
        }
    }
}

/// The same shape as [`PropsSpec`] where each field may also be `null` (reset).
#[derive(Clone, Debug, Default, DeriveDeserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PropsDiff {
    #[serde(default)]
    pub style: Patch<StyleLayers>,
    #[serde(default)]
    pub text: Patch<String>,
    #[serde(default)]
    pub disabled: Patch<bool>,
    #[serde(default)]
    pub hidden: Patch<bool>,
    #[serde(default, rename = "testID")]
    pub test_id: Patch<String>,
}

impl PropsSpec {
    /// `previous` with `diff` applied. The result is not validated; see [`PropsSpec::validate`].
    pub fn with_diff(&self, diff: &PropsDiff) -> PropsSpec {
        PropsSpec {
            style: diff.style.apply(&self.style),
            text: diff.text.apply(&self.text),
            disabled: diff.disabled.apply(&self.disabled),
            hidden: diff.hidden.apply(&self.hidden),
            test_id: diff.test_id.apply(&self.test_id),
        }
    }

    pub fn validate(&self, kind: Kind) -> Result<(), String> {
        if let Some(style) = &self.style {
            style.validate()?;
        }
        if self.text.is_some() && kind != Kind::Text {
            return Err("text is only valid on text nodes".into());
        }
        Ok(())
    }

    pub fn is_disabled(&self) -> bool {
        self.disabled == Some(true)
    }

    pub fn is_hidden(&self) -> bool {
        self.hidden == Some(true)
    }
}

/// Parse a JSON props diff and merge it over `previous`, validating the result for `kind`. This is
/// the one-step form of what a commit payload does for each updated node.
pub fn merge_diff(previous: &PropsSpec, kind: Kind, diff_json: &str) -> Result<PropsSpec, String> {
    let diff: PropsDiff =
        serde_json::from_str(diff_json).map_err(|error| format!("invalid props diff: {error}"))?;
    let merged = previous.with_diff(&diff);
    merged.validate(kind)?;
    Ok(merged)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ALL_FIELDS_JSON: &str = r##"{
        "width":1,"height":2,"minWidth":3,"minHeight":4,"maxWidth":5,"maxHeight":6,
        "display":"grid","flexDirection":"row","flexWrap":"wrap","flexGrow":1,"flexShrink":2,
        "flexBasis":7,"rowGap":8,"columnGap":9,"paddingTop":1,"paddingRight":2,"paddingBottom":3,
        "paddingLeft":4,"marginTop":1,"marginRight":2,"marginBottom":3,"marginLeft":4,
        "alignItems":"center","alignSelf":"end","justifyContent":"space-between",
        "gridTemplateColumns":3,"backgroundColor":"#fff","color":"#000","fontSize":12,
        "borderRadius":4,"borderWidth":1,"borderColor":"#123","opacity":0.5,"textAlign":"right",
        "transition":{"properties":["width"],"durationMs":10},"interpolateSize":"allow-keywords",
        "overflowX":"hidden","overflowY":"hidden"
    }"##;

    fn style(json: &str) -> StyleSpec {
        serde_json::from_str(json).expect("test style must parse")
    }

    #[test]
    fn rejects_unknown_styles_and_invalid_values() {
        assert!(serde_json::from_str::<StyleSpec>(r#"{"imaginaryProperty":12}"#).is_err());
        assert!(serde_json::from_str::<StyleSpec>(r#"{"display":"banana"}"#).is_err());
        // Shorthands and `disabled` are no longer style fields; the compiler expands the former and
        // `disabled` is a prop.
        for json in [
            r#"{"padding":4}"#,
            r#"{"margin":4}"#,
            r#"{"gap":4}"#,
            r#"{"overflow":"hidden"}"#,
            r#"{"disabled":true}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
        for json in [
            r#"{"width":"-2%"}"#,
            r#"{"paddingLeft":-1}"#,
            r#"{"fontSize":0}"#,
            r#"{"color":"red"}"#,
            r#"{"opacity":2}"#,
            r#"{"gridTemplateColumns":0}"#,
        ] {
            assert!(style(json).validate().is_err(), "{json}");
        }
    }

    #[test]
    fn transition_contract_round_trips_typed_values() {
        let json = r#"{
            "transition": {
                "properties": ["height", "backgroundColor"],
                "durationMs": 240.5,
                "delayMs": 20,
                "easing": "ease-in-out"
            },
            "interpolateSize": "allow-keywords",
            "overflowX": "hidden",
            "overflowY": "hidden"
        }"#;
        let style: StyleSpec = serde_json::from_str(json).unwrap();
        style.validate().unwrap();
        let transition = style.transition.as_ref().unwrap();
        assert_eq!(
            transition.properties,
            vec![
                TransitionProperty::Height,
                TransitionProperty::BackgroundColor
            ]
        );
        assert_eq!(transition.easing, Some(Easing::EaseInOut));
        assert_eq!(style.interpolate_size, Some(InterpolateSize::AllowKeywords));
        assert_eq!(style.overflow_x, Some(OverflowSpec::Hidden));
        let round_trip: StyleSpec =
            serde_json::from_str(&serde_json::to_string(&style).unwrap()).unwrap();
        assert_eq!(round_trip, style);
        let immediate = self::style(r#"{"transition":{"properties":["opacity"],"durationMs":0}}"#);
        immediate.validate().unwrap();
        assert_eq!(immediate.transition.unwrap().easing, None);
    }

    #[test]
    fn rejects_invalid_transition_shapes_and_timings() {
        for json in [
            r#"{"transition":{"properties":["transform"],"durationMs":100}}"#,
            r#"{"transition":{"properties":["width"],"durationMs":100,"easing":"spring"}}"#,
            r#"{"transition":{"properties":["width"],"durationMs":100,"repeat":2}}"#,
            r#"{"interpolateSize":"always"}"#,
            r#"{"overflowX":"scroll"}"#,
            r#"{"overflowY":"auto"}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
        for json in [
            r#"{"transition":{"properties":[],"durationMs":100}}"#,
            r#"{"transition":{"properties":["height","height"],"durationMs":100}}"#,
            r#"{"transition":{"properties":["height"],"durationMs":-1}}"#,
            r#"{"transition":{"properties":["height"],"durationMs":100,"delayMs":-1}}"#,
        ] {
            assert!(style(json).validate().is_err(), "{json}");
        }
        for invalid in [f64::INFINITY, f64::NEG_INFINITY, f64::NAN] {
            let mut transition = TransitionSpec {
                properties: vec![TransitionProperty::Width],
                duration_ms: invalid,
                delay_ms: None,
                easing: None,
            };
            assert!(transition.validate().is_err());
            transition.duration_ms = 100.0;
            transition.delay_ms = Some(invalid);
            assert!(transition.validate().is_err());
        }
    }

    #[test]
    fn hidden_overflow_releases_the_flex_content_minimum() {
        use taffy::prelude::*;

        fn item_width(overflow: OverflowSpec) -> f32 {
            let mut tree: TaffyTree<()> = TaffyTree::new();
            let content_style = style(r#"{"width":200,"height":20}"#);
            let content = tree.new_leaf(content_style.taffy_style().unwrap()).unwrap();
            let item_style = StyleSpec {
                overflow_x: Some(overflow),
                overflow_y: Some(overflow),
                ..StyleSpec::default()
            };
            let item = tree
                .new_with_children(item_style.taffy_style().unwrap(), &[content])
                .unwrap();
            let root_style = style(r#"{"width":100,"height":40,"flexDirection":"row"}"#);
            let root = tree
                .new_with_children(root_style.taffy_style().unwrap(), &[item])
                .unwrap();
            tree.compute_layout(root, Size::MAX_CONTENT).unwrap();
            tree.layout(item).unwrap().size.width
        }

        assert_eq!(item_width(OverflowSpec::Visible), 200.0);
        assert_eq!(item_width(OverflowSpec::Hidden), 100.0);
    }

    #[test]
    fn flex_and_grid_use_native_taffy_geometry() {
        use taffy::prelude::*;
        let mut tree: TaffyTree<()> = TaffyTree::new();
        let grid = style(
            r#"{"display":"grid","gridTemplateColumns":2,"width":240,"rowGap":20,"columnGap":20,
                "paddingTop":10,"paddingRight":10,"paddingBottom":10,"paddingLeft":10}"#,
        );
        let child_style = style(r#"{"height":30}"#);
        let first = tree.new_leaf(child_style.taffy_style().unwrap()).unwrap();
        let second = tree.new_leaf(child_style.taffy_style().unwrap()).unwrap();
        let root = tree
            .new_with_children(grid.taffy_style().unwrap(), &[first, second])
            .unwrap();
        tree.compute_layout(root, Size::MAX_CONTENT).unwrap();
        let first_layout = tree.layout(first).unwrap();
        let second_layout = tree.layout(second).unwrap();
        assert_eq!(first_layout.location.x, 10.0);
        assert_eq!(first_layout.size.width, 100.0);
        assert_eq!(second_layout.location.x, 130.0);
        assert_eq!(tree.layout(root).unwrap().size.height, 50.0);
    }

    #[test]
    fn merging_overwrites_exactly_the_fields_the_other_style_sets() {
        // Every field of the all-fields fixture lands in an empty style, so a field added to
        // `StyleSpec` but missed by `merge` fails here (the destructuring in `merge` already makes
        // that a compile error).
        let everything = style(ALL_FIELDS_JSON);
        let mut merged = StyleSpec::default();
        merged.merge(&everything);
        assert_eq!(merged, everything);

        let mut base = style(r##"{"width":10,"backgroundColor":"#111","paddingLeft":4}"##);
        base.merge(&style(r##"{"width":"50%","color":"#222"}"##));
        assert_eq!(
            base,
            style(r##"{"width":"50%","backgroundColor":"#111","paddingLeft":4,"color":"#222"}"##)
        );
        let before = base.clone();
        base.merge(&StyleSpec::default());
        assert_eq!(base, before, "an empty layer changes nothing");
    }

    #[test]
    fn style_layers_parse_with_conditions_and_reject_unknown_keys() {
        let layers: StyleLayers = serde_json::from_str(
            r##"{"layers":[
                {"style":{"backgroundColor":"#fff"}},
                {"minWidth":768,"states":["hover","focusVisible"],"style":{"width":50}}
            ]}"##,
        )
        .unwrap();
        layers.validate().unwrap();
        assert_eq!(layers.layers[0].min_width, None);
        assert!(layers.layers[0].states.is_empty());
        assert_eq!(layers.layers[1].min_width, Some(768.0));
        assert_eq!(
            layers.layers[1].states,
            vec![PseudoState::Hover, PseudoState::FocusVisible]
        );
        assert!(
            serde_json::from_str::<StyleLayers>(r#"{"layers":[{"style":{},"extra":1}]}"#).is_err()
        );
        assert!(
            serde_json::from_str::<StyleLayers>(
                r#"{"layers":[{"states":["pressed"],"style":{}}]}"#
            )
            .is_err()
        );
        let negative: StyleLayers =
            serde_json::from_str(r#"{"layers":[{"minWidth":-1,"style":{}}]}"#).unwrap();
        assert!(negative.validate().is_err());
        let invalid_inner: StyleLayers =
            serde_json::from_str(r#"{"layers":[{"style":{"opacity":3}}]}"#).unwrap();
        assert!(
            invalid_inner
                .validate()
                .unwrap_err()
                .contains("style.layers[0]")
        );
    }

    /// The JS style compiler's output (`tests/fixtures/compiled-styles.json`, checked by
    /// `tests/styles.test.ts`) must be exactly what this crate accepts.
    #[test]
    fn the_js_compilers_output_parses_and_validates() {
        #[derive(DeriveDeserialize)]
        struct Case {
            #[serde(rename = "className")]
            class_name: String,
            compiled: StyleLayers,
        }
        let cases: Vec<Case> =
            serde_json::from_str(include_str!("../tests/fixtures/compiled-styles.json"))
                .expect("the fixture parses with deny_unknown_fields");
        assert!(cases.len() >= 5);
        for case in &cases {
            case.compiled
                .validate()
                .unwrap_or_else(|error| panic!("{}: {error}", case.class_name));
            for layer in &case.compiled.layers {
                layer
                    .style
                    .taffy_style()
                    .unwrap_or_else(|error| panic!("{}: {error}", case.class_name));
            }
        }
        // The cascade survives the round trip: resolving the last case's layers with no
        // conditions gives the overflow, transition and padding the class and inline style set.
        let last = &cases[cases.len() - 1].compiled;
        let mut merged = StyleSpec::default();
        for layer in &last.layers {
            merged.merge(&layer.style);
        }
        assert_eq!(merged.overflow_x, Some(OverflowSpec::Hidden));
        assert_eq!(merged.padding_left, Some(4.0));
        assert_eq!(merged.height, Some(Dimension::Text("auto".into())));
        assert_eq!(
            merged.transition.map(|transition| transition.duration_ms),
            Some(600.0)
        );
    }

    #[test]
    fn diff_distinguishes_keep_reset_and_set() {
        let previous = PropsSpec {
            style: Some(StyleLayers::default()),
            text: Some("old".into()),
            disabled: Some(true),
            hidden: None,
            test_id: Some("id".into()),
        };
        // Absent keys are kept, null resets, a value sets.
        let merged = merge_diff(
            &previous,
            Kind::Text,
            r#"{"text":"new","disabled":null,"hidden":true}"#,
        )
        .unwrap();
        assert_eq!(merged.text.as_deref(), Some("new"));
        assert_eq!(merged.disabled, None);
        assert_eq!(merged.hidden, Some(true));
        assert_eq!(merged.test_id.as_deref(), Some("id"));
        assert_eq!(merged.style, previous.style);
        let unchanged = merge_diff(&previous, Kind::Text, "{}").unwrap();
        assert_eq!(unchanged, previous);
        let cleared = merge_diff(&previous, Kind::Text, r#"{"style":null,"testID":null}"#).unwrap();
        assert_eq!(cleared.style, None);
        assert_eq!(cleared.test_id, None);
    }

    #[test]
    fn diff_results_are_validated_for_the_kind() {
        let empty = PropsSpec::default();
        assert!(merge_diff(&empty, Kind::View, r#"{"text":"x"}"#).is_err());
        assert!(merge_diff(&empty, Kind::Button, r#"{"text":"x"}"#).is_err());
        assert!(merge_diff(&empty, Kind::Text, r#"{"text":"x"}"#).is_ok());
        assert!(merge_diff(&empty, Kind::View, r#"{"imaginary":1}"#).is_err());
        assert!(merge_diff(&empty, Kind::View, r#"{"disabled":"yes"}"#).is_err());
        assert!(
            merge_diff(
                &empty,
                Kind::View,
                r#"{"style":{"layers":[{"style":{"fontSize":0}}]}}"#
            )
            .is_err()
        );
        assert!(merge_diff(&empty, Kind::View, "not json").is_err());
    }
}
