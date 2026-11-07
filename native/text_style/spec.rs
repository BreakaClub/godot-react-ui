//! The wire types of the text longhands (`src/types.ts`): what a style layer carries, validated when the layer arrives. The
//! types a reader uses once the style is computed are in `resolve.rs`.

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FontStyleSpec {
    Normal,
    Italic,
}

/// CSS `font-weight` is any number from 1 to 1000. The compiler turns the keywords into numbers.
pub const MIN_FONT_WEIGHT: u16 = 1;
pub const MAX_FONT_WEIGHT: u16 = 1000;

/// A length of the text styles: px, or `"<n>em"` of the element's own font size.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum LetterSpacingSpec {
    Px(f32),
    Text(String),
}

/// What a length or a line height is once parsed.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum TextLength {
    Px(f32),
    /// A multiple of the element's own font size, which the element turns into px where it is set.
    Em(f32),
}

impl LetterSpacingSpec {
    pub(crate) fn parsed(&self) -> Result<TextLength, String> {
        match self {
            Self::Px(value) if value.is_finite() => Ok(TextLength::Px(*value)),
            Self::Px(_) => Err("letterSpacing must be finite".into()),
            Self::Text(text) => parse_em(text)
                .map(TextLength::Em)
                .ok_or_else(|| format!("invalid letterSpacing {text:?}; expected px or \"<n>em\"")),
        }
    }
}

/// CSS `line-height`: px, `normal`, a unitless factor (`"1.5"`) or `"1.5em"` / `"150%"`.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum LineHeightSpec {
    Px(f32),
    Text(String),
}

/// A parsed `line-height`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum LineHeightValue {
    /// The font's own metrics.
    Normal,
    Px(f32),
    /// A multiple of each element's own font size; inherited as the multiple.
    Factor(f32),
    /// A multiple of the font size of the element it is set on; inherited as px.
    Em(f32),
}

impl LineHeightSpec {
    pub(crate) fn parsed(&self) -> Result<LineHeightValue, String> {
        let invalid = |text: &str| {
            format!(
                "invalid lineHeight {text:?}; expected px, normal, a factor, \"<n>em\" or \"<n>%\""
            )
        };
        match self {
            Self::Px(value) if value.is_finite() && *value >= 0.0 => {
                Ok(LineHeightValue::Px(*value))
            }
            Self::Px(_) => Err("lineHeight must be a finite nonnegative number".into()),
            Self::Text(text) if text == "normal" => Ok(LineHeightValue::Normal),
            Self::Text(text) => {
                if let Some(percent) = text.strip_suffix('%') {
                    let percent = parse_number(percent).ok_or_else(|| invalid(text))?;
                    return nonnegative(LineHeightValue::Em(percent / PERCENT), percent, text);
                }
                if let Some(em) = parse_em(text) {
                    return nonnegative(LineHeightValue::Em(em), em, text);
                }
                let factor = parse_number(text).ok_or_else(|| invalid(text))?;
                nonnegative(LineHeightValue::Factor(factor), factor, text)
            }
        }
    }
}

fn nonnegative(value: LineHeightValue, amount: f32, text: &str) -> Result<LineHeightValue, String> {
    if amount >= 0.0 {
        Ok(value)
    } else {
        Err(format!("lineHeight {text:?} must not be negative"))
    }
}

const PERCENT: f32 = 100.0;

fn parse_number(text: &str) -> Option<f32> {
    text.parse::<f32>().ok().filter(|number| number.is_finite())
}

fn parse_em(text: &str) -> Option<f32> {
    text.strip_suffix("em").and_then(parse_number)
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TextTransformSpec {
    None,
    Uppercase,
    Lowercase,
    Capitalize,
}

/// CSS `text-decoration-line`: `none`, or one to three of the lines. On the wire it is the CSS text.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct DecorationLines {
    pub underline: bool,
    pub overline: bool,
    pub line_through: bool,
}

impl DecorationLines {
    pub(crate) fn is_none(self) -> bool {
        self == Self::default()
    }

    fn parse(text: &str) -> Result<Self, String> {
        let mut lines = Self::default();
        if text == "none" {
            return Ok(lines);
        }
        for word in text.split(' ') {
            let line = match word {
                "underline" => &mut lines.underline,
                "overline" => &mut lines.overline,
                "line-through" => &mut lines.line_through,
                _ => return Err(format!("invalid textDecorationLine {text:?}")),
            };
            if std::mem::replace(line, true) {
                return Err(format!("textDecorationLine {text:?} repeats a line"));
            }
        }
        Ok(lines)
    }

    fn text(self) -> String {
        if self.is_none() {
            return "none".into();
        }
        [
            (self.underline, "underline"),
            (self.overline, "overline"),
            (self.line_through, "line-through"),
        ]
        .into_iter()
        .filter_map(|(present, word)| present.then_some(word))
        .collect::<Vec<_>>()
        .join(" ")
    }
}

impl<'de> Deserialize<'de> for DecorationLines {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        Self::parse(&text).map_err(serde::de::Error::custom)
    }
}

impl Serialize for DecorationLines {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.text())
    }
}

/// CSS `text-decoration-style`: how the decoration lines are drawn.
#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DecorationStyleSpec {
    #[default]
    Solid,
    Double,
    Dotted,
    Dashed,
    Wavy,
}

/// `text-decoration-thickness`: px, `auto` or `from-font`.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum DecorationThicknessSpec {
    Px(f32),
    Keyword(String),
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum DecorationThickness {
    /// A tenth of the font size, whole pixels, at least one (what Chrome draws).
    Auto,
    /// The thickness the font gives its underline.
    FromFont,
    Px(f32),
}

impl DecorationThicknessSpec {
    pub(crate) fn parsed(&self) -> Result<DecorationThickness, String> {
        match self {
            Self::Px(value) if value.is_finite() && *value >= 0.0 => {
                Ok(DecorationThickness::Px(*value))
            }
            Self::Px(_) => {
                Err("textDecorationThickness must be a finite nonnegative number".into())
            }
            Self::Keyword(word) if word == "auto" => Ok(DecorationThickness::Auto),
            Self::Keyword(word) if word == "from-font" => Ok(DecorationThickness::FromFont),
            Self::Keyword(word) => Err(format!(
                "invalid textDecorationThickness {word:?}; expected px, auto or from-font"
            )),
        }
    }
}

/// `text-underline-offset`: px below the underline's natural place, or `auto` (no offset).
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum UnderlineOffsetSpec {
    Px(f32),
    Keyword(String),
}

impl UnderlineOffsetSpec {
    /// The offset in px; `auto` is the font's own place, which is no offset.
    pub(crate) fn px(&self) -> Result<Option<f32>, String> {
        match self {
            Self::Px(value) if value.is_finite() => Ok(Some(*value)),
            Self::Px(_) => Err("textUnderlineOffset must be finite".into()),
            Self::Keyword(word) if word == "auto" => Ok(None),
            Self::Keyword(word) => Err(format!(
                "invalid textUnderlineOffset {word:?}; expected px or auto"
            )),
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TextOverflowSpec {
    Clip,
    Ellipsis,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum WhiteSpaceSpec {
    Normal,
    Nowrap,
    Pre,
    PreLine,
    PreWrap,
    BreakSpaces,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum WordBreakSpec {
    Normal,
    BreakAll,
    KeepAll,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum OverflowWrapSpec {
    Normal,
    BreakWord,
    Anywhere,
}

/// `-webkit-line-clamp`: at most this many lines, or `none`.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum LineClampSpec {
    Lines(u32),
    Keyword(String),
}

impl LineClampSpec {
    /// The clamp, or `None` for `none`.
    pub(crate) fn lines(&self) -> Result<Option<u32>, String> {
        match self {
            Self::Lines(0) => Err("lineClamp must be a positive integer or none".into()),
            Self::Lines(lines) => Ok(Some(*lines)),
            Self::Keyword(word) if word == "none" => Ok(None),
            Self::Keyword(word) => Err(format!(
                "invalid lineClamp {word:?}; expected a positive integer or none"
            )),
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NumericFigureSpec {
    Normal,
    Lining,
    Oldstyle,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NumericSpacingSpec {
    Normal,
    Proportional,
    Tabular,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NumericFractionSpec {
    Normal,
    Diagonal,
    Stacked,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line_height(json: &str) -> Result<LineHeightValue, String> {
        serde_json::from_str::<LineHeightSpec>(json)
            .expect("a number or a string")
            .parsed()
    }

    #[test]
    fn line_heights_parse_every_css_form_the_compiler_sends() {
        assert_eq!(line_height("22"), Ok(LineHeightValue::Px(22.0)));
        assert_eq!(line_height("0"), Ok(LineHeightValue::Px(0.0)));
        assert_eq!(line_height(r#""normal""#), Ok(LineHeightValue::Normal));
        assert_eq!(line_height(r#""1.5""#), Ok(LineHeightValue::Factor(1.5)));
        assert_eq!(line_height(r#""2""#), Ok(LineHeightValue::Factor(2.0)));
        assert_eq!(line_height(r#""1.25em""#), Ok(LineHeightValue::Em(1.25)));
        assert_eq!(line_height(r#""150%""#), Ok(LineHeightValue::Em(1.5)));
        for invalid in [
            r#""abc""#,
            r#""-1""#,
            "-4",
            r#""1.5px""#,
            r#""""#,
            r#""%""#,
            r#""-10%""#,
        ] {
            assert!(line_height(invalid).is_err(), "{invalid}");
        }
    }

    #[test]
    fn letter_spacing_is_px_or_em() {
        let parse = |json: &str| {
            serde_json::from_str::<LetterSpacingSpec>(json)
                .unwrap()
                .parsed()
        };
        assert_eq!(parse("0.5"), Ok(TextLength::Px(0.5)));
        assert_eq!(parse("-1"), Ok(TextLength::Px(-1.0)));
        assert_eq!(parse(r#""-0.025em""#), Ok(TextLength::Em(-0.025)));
        assert!(parse(r#""3px""#).is_err());
        assert!(parse(r#""em""#).is_err());
    }

    #[test]
    fn decoration_lines_round_trip_as_css_text() {
        let parse = |text: &str| serde_json::from_str::<DecorationLines>(&format!("{text:?}"));
        assert!(parse("none").unwrap().is_none());
        let both = parse("underline line-through").unwrap();
        assert!(both.underline && both.line_through && !both.overline);
        assert_eq!(
            serde_json::to_string(&both).unwrap(),
            r#""underline line-through""#
        );
        assert_eq!(
            serde_json::to_string(&DecorationLines::default()).unwrap(),
            r#""none""#
        );
        for invalid in [
            "",
            "underline underline",
            "wavy",
            "none underline",
            "underline  overline",
        ] {
            assert!(parse(invalid).is_err(), "{invalid:?}");
        }
    }

    #[test]
    fn thickness_offset_and_clamp_keywords_are_checked() {
        let thickness = |json: &str| {
            serde_json::from_str::<DecorationThicknessSpec>(json)
                .unwrap()
                .parsed()
        };
        assert_eq!(thickness("2"), Ok(DecorationThickness::Px(2.0)));
        assert_eq!(thickness(r#""auto""#), Ok(DecorationThickness::Auto));
        assert_eq!(
            thickness(r#""from-font""#),
            Ok(DecorationThickness::FromFont)
        );
        assert!(thickness("-1").is_err());
        assert!(thickness(r#""thick""#).is_err());
        let offset = |json: &str| {
            serde_json::from_str::<UnderlineOffsetSpec>(json)
                .unwrap()
                .px()
        };
        assert_eq!(offset("4"), Ok(Some(4.0)));
        assert_eq!(offset("-2"), Ok(Some(-2.0)));
        assert_eq!(offset(r#""auto""#), Ok(None));
        assert!(offset(r#""near""#).is_err());
        let clamp = |json: &str| serde_json::from_str::<LineClampSpec>(json).unwrap().lines();
        assert_eq!(clamp("3"), Ok(Some(3)));
        assert_eq!(clamp(r#""none""#), Ok(None));
        assert!(clamp("0").is_err());
        assert!(clamp(r#""three""#).is_err());
    }
}
