//! The text longhands as the style engine resolves them: what a child inherits (`InheritedText`), the lengths an element turns
//! into px where they are set (`settle`), and the typed view shaping and painting read (`TextStyle`).

use super::spec::{
    DecorationLines, DecorationStyleSpec, DecorationThickness, DecorationThicknessSpec, FontStyleSpec,
    LetterSpacingSpec, LineClampSpec, LineHeightSpec, LineHeightValue, NumericFigureSpec,
    NumericFractionSpec, NumericSpacingSpec, OverflowWrapSpec, TextLength, TextOverflowSpec,
    TextTransformSpec, UnderlineOffsetSpec, WhiteSpaceSpec, WordBreakSpec,
};
use crate::DEFAULT_FONT_SIZE;
use crate::props::{PositionSpec, StyleSpec, TextAlignSpec};

/// The colour a decoration has when neither it nor the element sets one: the default text colour.
const DEFAULT_TEXT_COLOR: &str = "#ffffff";

/// A decoration that applies to the text of the element it was set on and of the in-flow elements below it. Its colour and
/// thickness are those of the element that set it, resolved there (`currentcolor` is that element's `color`).
#[derive(Clone, Debug, PartialEq)]
pub struct TextDecoration {
    pub lines: DecorationLines,
    pub color: String,
    /// How the lines are drawn: solid, double, dotted, dashed or wavy.
    pub style: DecorationStyleSpec,
    pub thickness: DecorationThickness,
    /// px below the underline's natural place; `None` is the font's own.
    pub underline_offset: Option<f32>,
}

/// The text properties an element passes to its children: the inherited longhands, and the decorations that propagate.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct InheritedText {
    font_family: Option<String>,
    font_weight: Option<u16>,
    font_style: Option<FontStyleSpec>,
    line_height: Option<LineHeightSpec>,
    letter_spacing: Option<LetterSpacingSpec>,
    text_transform: Option<TextTransformSpec>,
    text_underline_offset: Option<UnderlineOffsetSpec>,
    white_space: Option<WhiteSpaceSpec>,
    word_break: Option<WordBreakSpec>,
    overflow_wrap: Option<OverflowWrapSpec>,
    numeric_figure: Option<NumericFigureSpec>,
    numeric_spacing: Option<NumericSpacingSpec>,
    numeric_fraction: Option<NumericFractionSpec>,
    ordinal: Option<bool>,
    slashed_zero: Option<bool>,
    decorations: Vec<TextDecoration>,
}

impl InheritedText {
    /// What `style`, a computed style, passes on.
    pub fn of(style: &StyleSpec) -> Self {
        Self {
            font_family: style.font_family.clone(),
            font_weight: style.font_weight,
            font_style: style.font_style,
            line_height: style.line_height.clone(),
            letter_spacing: style.letter_spacing.clone(),
            text_transform: style.text_transform,
            text_underline_offset: style.text_underline_offset.clone(),
            white_space: style.white_space,
            word_break: style.word_break,
            overflow_wrap: style.overflow_wrap,
            numeric_figure: style.numeric_figure,
            numeric_spacing: style.numeric_spacing,
            numeric_fraction: style.numeric_fraction,
            ordinal: style.ordinal,
            slashed_zero: style.slashed_zero,
            decorations: style.text_decorations.clone(),
        }
    }

    /// Start a computed style from what the parent passes on.
    pub fn inherit_into(&self, style: &mut StyleSpec) {
        style.font_family = self.font_family.clone();
        style.font_weight = self.font_weight;
        style.font_style = self.font_style;
        style.line_height = self.line_height.clone();
        style.letter_spacing = self.letter_spacing.clone();
        style.text_transform = self.text_transform;
        style.text_underline_offset = self.text_underline_offset.clone();
        style.white_space = self.white_space;
        style.word_break = self.word_break;
        style.overflow_wrap = self.overflow_wrap;
        style.numeric_figure = self.numeric_figure;
        style.numeric_spacing = self.numeric_spacing;
        style.numeric_fraction = self.numeric_fraction;
        style.ordinal = self.ordinal;
        style.slashed_zero = self.slashed_zero;
        style.text_decorations = self.decorations.clone();
    }
}

/// Finish the text longhands of a style whose layers were merged over what the parent passed on.
///
/// A length in `em` is a multiple of the font size of the element it is set on and is inherited as px (CSS Values 4, relative
/// lengths), so it is turned into px here, once, with this element's font size; a unitless line height stays a factor, which
/// each descendant multiplies by its own. The decoration an element sets joins the ones propagated to it; an out-of-flow
/// element (`absolute`, `fixed`) receives none from its parent (CSS Text Decoration 3, "Decorating box").
pub fn settle(style: &mut StyleSpec) {
    let font_size = style.font_size.unwrap_or(DEFAULT_FONT_SIZE) as f32;
    if let Some(spacing) = &style.letter_spacing {
        let spacing = spacing
            .parsed()
            .expect("computed styles are built from validated layers");
        style.letter_spacing = Some(LetterSpacingSpec::Px(match spacing {
            TextLength::Px(px) => px,
            TextLength::Em(em) => em * font_size,
        }));
    }
    if let Some(height) = &style.line_height
        && let LineHeightValue::Em(em) = height
            .parsed()
            .expect("computed styles are built from validated layers")
    {
        style.line_height = Some(LineHeightSpec::Px(em * font_size));
    }
    let out_of_flow = style.position.is_some_and(PositionSpec::is_out_of_flow);
    if out_of_flow {
        style.text_decorations.clear();
    }
    if let Some(lines) = style.text_decoration_line.filter(|lines| !lines.is_none()) {
        style.text_decorations.push(TextDecoration {
            lines,
            color: style
                .text_decoration_color
                .clone()
                .or_else(|| style.color.clone())
                .unwrap_or_else(|| DEFAULT_TEXT_COLOR.to_string()),
            style: style.text_decoration_style.unwrap_or_default(),
            thickness: style
                .text_decoration_thickness
                .as_ref()
                .map_or(
                    Ok(DecorationThickness::Auto),
                    DecorationThicknessSpec::parsed,
                )
                .expect("computed styles are built from validated layers"),
            underline_offset: style
                .text_underline_offset
                .as_ref()
                .map_or(Ok(None), UnderlineOffsetSpec::px)
                .expect("computed styles are built from validated layers"),
        });
    }
}

/// A `line-height` once resolved against the element's font size.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum LineHeight {
    /// The font's own ascent and descent.
    Normal,
    Px(f32),
}

/// The CSS text alignment the renderer draws (`start` and `end` are `left` and `right`: there is no `direction`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Alignment {
    Left,
    Center,
    Right,
    Justify,
}

/// How a paragraph may break its lines.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Wrapping {
    /// Whether a line may break at a soft opportunity at all (`nowrap` and `pre` do not).
    pub wraps: bool,
    /// `word-break: break-all`: a break is allowed between any two characters.
    pub break_anywhere: bool,
    /// `overflow-wrap: break-word` or `anywhere`: a word wider than the line is broken rather than overflowing.
    pub break_long_words: bool,
}

/// The OpenType features a style turns on or off, as `(tag, value)`.
pub type Feature = (&'static str, i32);

/// Everything that decides how a text is shaped and laid out: when it differs the paragraph is built again.
#[derive(Clone, Debug, PartialEq)]
pub struct ShapingStyle {
    pub font_size: i32,
    /// The families in order, as written; empty for the theme font.
    pub families: Vec<String>,
    /// `None` is the theme font as it is.
    pub weight: Option<u16>,
    pub italic: bool,
    pub line_height: LineHeight,
    /// px, added after every character.
    pub letter_spacing: f32,
    pub transform: TextTransformSpec,
    pub white_space: WhiteSpaceSpec,
    pub wrapping: Wrapping,
    pub alignment: Alignment,
    /// Whether what a line cannot show is replaced by an ellipsis: `text-overflow: ellipsis` on an element that clips.
    pub ellipsis: bool,
    pub line_clamp: Option<u32>,
    pub features: Vec<Feature>,
}

/// What painting adds to the shaped text.
#[derive(Clone, Debug, PartialEq)]
pub struct TextStyle {
    pub shaping: ShapingStyle,
    pub decorations: Vec<TextDecoration>,
}

impl TextStyle {
    /// The text style of a computed style. `clips` is whether the element clips its content on the inline axis, which
    /// `text-overflow` needs.
    pub fn of(style: &StyleSpec, clips: bool) -> Self {
        let font_size = style.font_size.unwrap_or(DEFAULT_FONT_SIZE);
        let white_space = style.white_space.unwrap_or(WhiteSpaceSpec::PreWrap);
        let letter_spacing = style.letter_spacing.as_ref().map_or(0.0, |spacing| {
            match spacing
                .parsed()
                .expect("computed styles are built from validated layers")
            {
                TextLength::Px(px) => px,
                TextLength::Em(em) => em * font_size as f32,
            }
        });
        let line_height = style
            .line_height
            .as_ref()
            .map_or(LineHeight::Normal, |height| {
                match height
                    .parsed()
                    .expect("computed styles are built from validated layers")
                {
                    LineHeightValue::Normal => LineHeight::Normal,
                    LineHeightValue::Px(px) => LineHeight::Px(px),
                    LineHeightValue::Factor(factor) => LineHeight::Px(factor * font_size as f32),
                    LineHeightValue::Em(em) => LineHeight::Px(em * font_size as f32),
                }
            });
        let line_clamp = style.line_clamp.as_ref().and_then(|clamp: &LineClampSpec| {
            clamp
                .lines()
                .expect("computed styles are built from validated layers")
        });
        Self {
            shaping: ShapingStyle {
                font_size,
                families: style
                    .font_family
                    .as_deref()
                    .map(family_list)
                    .unwrap_or_default(),
                weight: style.font_weight,
                italic: style.font_style == Some(FontStyleSpec::Italic),
                line_height,
                letter_spacing,
                transform: style.text_transform.unwrap_or(TextTransformSpec::None),
                white_space,
                wrapping: wrapping_of(white_space, style.word_break, style.overflow_wrap),
                alignment: match style.text_align {
                    Some(TextAlignSpec::Center) => Alignment::Center,
                    Some(TextAlignSpec::Right | TextAlignSpec::End) => Alignment::Right,
                    Some(TextAlignSpec::Justify) => Alignment::Justify,
                    Some(TextAlignSpec::Left | TextAlignSpec::Start) | None => Alignment::Left,
                },
                ellipsis: clips && style.text_overflow == Some(TextOverflowSpec::Ellipsis),
                line_clamp,
                features: features_of(style, letter_spacing != 0.0),
            },
            decorations: style.text_decorations.clone(),
        }
    }
}

/// `font-family`'s comma separated list.
pub(crate) fn family_list(text: &str) -> Vec<String> {
    text.split(',')
        .map(|family| family.trim().trim_matches(['"', '\'']).trim().to_string())
        .filter(|family| !family.is_empty())
        .collect()
}

fn wrapping_of(
    white_space: WhiteSpaceSpec,
    word_break: Option<WordBreakSpec>,
    overflow_wrap: Option<OverflowWrapSpec>,
) -> Wrapping {
    Wrapping {
        wraps: !matches!(white_space, WhiteSpaceSpec::Nowrap | WhiteSpaceSpec::Pre),
        break_anywhere: word_break == Some(WordBreakSpec::BreakAll),
        break_long_words: matches!(
            overflow_wrap,
            Some(OverflowWrapSpec::BreakWord | OverflowWrapSpec::Anywhere)
        ),
    }
}

/// CSS turns optional ligatures off when letter-spacing is not zero (CSS Text 3, "Letter-spacing"): they would join letters
/// the spacing pulls apart.
const LIGATURE_FEATURES: [&str; 2] = ["liga", "clig"];

fn features_of(style: &StyleSpec, spaced: bool) -> Vec<Feature> {
    let mut features: Vec<Feature> = Vec::new();
    match style.numeric_figure {
        Some(NumericFigureSpec::Lining) => features.push(("lnum", 1)),
        Some(NumericFigureSpec::Oldstyle) => features.push(("onum", 1)),
        Some(NumericFigureSpec::Normal) | None => {}
    }
    match style.numeric_spacing {
        Some(NumericSpacingSpec::Proportional) => features.push(("pnum", 1)),
        Some(NumericSpacingSpec::Tabular) => features.push(("tnum", 1)),
        Some(NumericSpacingSpec::Normal) | None => {}
    }
    match style.numeric_fraction {
        Some(NumericFractionSpec::Diagonal) => features.push(("frac", 1)),
        Some(NumericFractionSpec::Stacked) => features.push(("afrc", 1)),
        Some(NumericFractionSpec::Normal) | None => {}
    }
    if style.ordinal == Some(true) {
        features.push(("ordn", 1));
    }
    if style.slashed_zero == Some(true) {
        features.push(("zero", 1));
    }
    if spaced {
        features.extend(LIGATURE_FEATURES.map(|tag| (tag, 0)));
    }
    features
}

#[cfg(test)]
mod tests {
    use super::*;

    fn style(json: &str) -> StyleSpec {
        serde_json::from_str(json).expect("a style")
    }

    fn settled(json: &str) -> StyleSpec {
        let mut spec = style(json);
        settle(&mut spec);
        spec
    }

    #[test]
    fn em_lengths_become_px_with_the_font_size_of_the_element_that_sets_them() {
        let spec = settled(r#"{"fontSize":20,"letterSpacing":"0.05em","lineHeight":"1.5em"}"#);
        assert_eq!(spec.letter_spacing, Some(LetterSpacingSpec::Px(1.0)));
        assert_eq!(spec.line_height, Some(LineHeightSpec::Px(30.0)));
        // A unitless factor and `normal` are left for each element to resolve.
        assert_eq!(
            settled(r#"{"lineHeight":"1.5"}"#).line_height,
            Some(LineHeightSpec::Text("1.5".into()))
        );
        // The default size applies when the element and its ancestors set none.
        assert_eq!(
            settled(r#"{"letterSpacing":"0.1em"}"#).letter_spacing,
            Some(LetterSpacingSpec::Px(1.6))
        );
    }

    #[test]
    fn a_child_inherits_the_px_not_the_em() {
        let parent = settled(r#"{"fontSize":10,"letterSpacing":"0.5em","lineHeight":"2"}"#);
        let mut child = style(r#"{"fontSize":40}"#);
        InheritedText::of(&parent).inherit_into(&mut child);
        settle(&mut child);
        let resolved = TextStyle::of(&child, false);
        assert_eq!(resolved.shaping.letter_spacing, 5.0);
        // The factor is the child's own: 2 times its 40 px.
        assert_eq!(resolved.shaping.line_height, LineHeight::Px(80.0));
    }

    #[test]
    fn decorations_propagate_with_the_colour_and_thickness_of_the_element_that_set_them() {
        let parent = settled(
            r##"{"color":"#ff0000","textDecorationLine":"underline","textDecorationThickness":3}"##,
        );
        assert_eq!(parent.text_decorations.len(), 1);
        assert_eq!(parent.text_decorations[0].color, "#ff0000");
        assert_eq!(
            parent.text_decorations[0].thickness,
            DecorationThickness::Px(3.0)
        );
        let mut child = style(r##"{"color":"#00ff00"}"##);
        InheritedText::of(&parent).inherit_into(&mut child);
        settle(&mut child);
        assert_eq!(
            child.text_decorations, parent.text_decorations,
            "the child draws the parent's line, in the parent's colour"
        );
        // `none` cannot take a propagated decoration away; a child's own line adds to it.
        let mut none = style(r#"{"textDecorationLine":"none"}"#);
        InheritedText::of(&parent).inherit_into(&mut none);
        settle(&mut none);
        assert_eq!(none.text_decorations.len(), 1);
        let mut own =
            style(r##"{"textDecorationLine":"line-through","textDecorationColor":"#0000ff"}"##);
        InheritedText::of(&parent).inherit_into(&mut own);
        settle(&mut own);
        assert_eq!(own.text_decorations.len(), 2);
        assert_eq!(own.text_decorations[1].color, "#0000ff");
        // An absolute element is not decorated by its parent.
        let mut absolute = style(r#"{"position":"absolute"}"#);
        InheritedText::of(&parent).inherit_into(&mut absolute);
        settle(&mut absolute);
        assert!(absolute.text_decorations.is_empty());
    }

    #[test]
    fn an_unset_style_is_the_legacy_text_style() {
        let resolved = TextStyle::of(&style("{}"), false);
        let shaping = resolved.shaping;
        assert_eq!(shaping.font_size, DEFAULT_FONT_SIZE);
        assert!(shaping.families.is_empty());
        assert_eq!(shaping.weight, None);
        assert!(!shaping.italic);
        assert_eq!(shaping.line_height, LineHeight::Normal);
        assert_eq!(shaping.letter_spacing, 0.0);
        assert_eq!(shaping.white_space, WhiteSpaceSpec::PreWrap);
        assert!(
            shaping.wrapping.wraps
                && !shaping.wrapping.break_anywhere
                && !shaping.wrapping.break_long_words
        );
        assert!(shaping.features.is_empty() && !shaping.ellipsis && shaping.line_clamp.is_none());
        assert!(resolved.decorations.is_empty());
    }

    #[test]
    fn families_are_a_trimmed_unquoted_list() {
        assert_eq!(
            family_list(r#""Open Sans", Inter ,'mono'"#),
            ["Open Sans", "Inter", "mono"]
        );
        assert!(family_list(" , ").is_empty());
    }

    #[test]
    fn ellipsis_needs_a_clipping_element_and_features_follow_the_numerals() {
        let spec = style(
            r#"{"textOverflow":"ellipsis","numericSpacing":"tabular","numericFigure":"lining","slashedZero":true}"#,
        );
        assert!(!TextStyle::of(&spec, false).shaping.ellipsis);
        let shaping = TextStyle::of(&spec, true).shaping;
        assert!(shaping.ellipsis);
        assert_eq!(shaping.features, [("lnum", 1), ("tnum", 1), ("zero", 1)]);
        // Letter-spacing turns the ligatures off.
        let spaced = TextStyle::of(&style(r#"{"letterSpacing":1}"#), false).shaping;
        assert_eq!(spaced.features, [("liga", 0), ("clig", 0)]);
    }

    #[test]
    fn white_space_and_breaking_decide_the_wrapping() {
        let wrapping = |json: &str| TextStyle::of(&style(json), false).shaping.wrapping;
        assert!(!wrapping(r#"{"whiteSpace":"nowrap"}"#).wraps);
        assert!(!wrapping(r#"{"whiteSpace":"pre"}"#).wraps);
        assert!(wrapping(r#"{"whiteSpace":"pre-line"}"#).wraps);
        assert!(wrapping(r#"{"wordBreak":"break-all"}"#).break_anywhere);
        assert!(wrapping(r#"{"overflowWrap":"break-word"}"#).break_long_words);
        assert!(wrapping(r#"{"overflowWrap":"anywhere"}"#).break_long_words);
        assert!(!wrapping(r#"{"overflowWrap":"normal"}"#).break_long_words);
    }
}
