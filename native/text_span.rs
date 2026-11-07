//! The spans of a `Text`: nested `Text` in JS is one attributed paragraph here (`src/rich-text.ts`). A text node's `text` prop is the
//! source text and its `spans` prop says which ranges are styled and where the inlays (generated text) sit. This module is the
//! Godot-free half: the wire types and their validation, and the resolution of the spans into what shaping and painting need,
//! the way CSS resolves nested inline elements.
//!
//! - **Display text.** The shown text (`text_style/flow.rs`) with every inlay's text spliced in where it sits. It is what is shaped,
//!   drawn and laid out; [`offsets::OffsetMap`] is the map between its offsets and the shown text's, which everything the document
//!   sees uses (the selection, copy, the geometry queries).
//! - **Segments.** The display text cut at every span boundary: each piece has the colour, the font and the decorations of the
//!   innermost span around it. A decoration is drawn per segment, as Chrome draws one per inline box fragment (its wavy pattern
//!   restarts at every span boundary: `docs/tracks/rich-text.md`).
//! - **Backgrounds.** A span's `backgroundColor` fills its display range, outermost span first.
//!
//! Offsets on the wire are UTF-16 units of the node's `text`; everything after [`resolve`] is in code points of the display text.
//! Nothing here touches Godot.

pub(crate) mod offsets;
pub(crate) mod plan;
#[cfg(test)]
mod tests;

use std::ops::Range;
use std::rc::Rc;

use serde::{Deserialize, Serialize};

use crate::props::StyleSpec;
use crate::text_style::resolve::family_list;
use crate::text_style::spec::{
    DecorationLines, DecorationStyleSpec, DecorationThicknessSpec, FontStyleSpec,
    UnderlineOffsetSpec,
};
use crate::text_style::{InheritedText, TextDecoration, settle};
use offsets::{Inlay, OffsetMap};

/// How deeply spans may nest.
pub const MAX_SPAN_DEPTH: usize = 32;

/// The style of a span: the longhands a nested `Text` may set. Anything else is refused when the commit is parsed.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpanStyleSpec {
    pub color: Option<String>,
    pub background_color: Option<String>,
    pub font_family: Option<String>,
    pub font_weight: Option<u16>,
    pub font_style: Option<FontStyleSpec>,
    pub text_decoration_line: Option<DecorationLines>,
    pub text_decoration_color: Option<String>,
    pub text_decoration_style: Option<DecorationStyleSpec>,
    pub text_decoration_thickness: Option<DecorationThicknessSpec>,
    pub text_underline_offset: Option<UnderlineOffsetSpec>,
}

impl SpanStyleSpec {
    /// The same longhands as a style, to validate with the rules of every other style.
    fn as_style(&self) -> StyleSpec {
        StyleSpec {
            color: self.color.clone(),
            background_color: self.background_color.clone(),
            font_family: self.font_family.clone(),
            font_weight: self.font_weight,
            font_style: self.font_style,
            text_decoration_line: self.text_decoration_line,
            text_decoration_color: self.text_decoration_color.clone(),
            text_decoration_style: self.text_decoration_style,
            text_decoration_thickness: self.text_decoration_thickness.clone(),
            text_underline_offset: self.text_underline_offset.clone(),
            ..StyleSpec::default()
        }
    }
}

/// One styled range of a text, or one inlay. `start` and `end` are UTF-16 offsets into the node's `text`. A span's `children`
/// lie inside it, in order. An inlay has `start == end` and the text it shows.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpanSpec {
    pub start: usize,
    pub end: usize,
    pub style: Option<SpanStyleSpec>,
    pub inlay: Option<String>,
    pub children: Option<Vec<SpanSpec>>,
}

/// UTF-16 offsets of a text, and the code point each one is.
pub(crate) struct Utf16Index {
    /// `None` for a text with no character outside the basic plane, where the two are the same.
    table: Option<Vec<Option<usize>>>,
    utf16_len: usize,
}

impl Utf16Index {
    pub(crate) fn new(text: &str) -> Self {
        if text.chars().all(|character| character.len_utf16() == 1) {
            return Self {
                table: None,
                utf16_len: text.chars().count(),
            };
        }
        let mut table = Vec::with_capacity(text.len() + 1);
        for (index, character) in text.chars().enumerate() {
            table.push(Some(index));
            if character.len_utf16() == 2 {
                table.push(None);
            }
        }
        let utf16_len = table.len();
        table.push(Some(text.chars().count()));
        Self {
            table: Some(table),
            utf16_len,
        }
    }

    pub(crate) fn utf16_len(&self) -> usize {
        self.utf16_len
    }

    /// The code point at UTF-16 offset `offset`; an error for one past the end or inside a surrogate pair.
    pub(crate) fn code_point(&self, offset: usize) -> Result<usize, String> {
        if offset > self.utf16_len {
            return Err(format!(
                "offset {offset} is past the end of the text ({} UTF-16 units)",
                self.utf16_len
            ));
        }
        match &self.table {
            None => Ok(offset),
            Some(table) => {
                table[offset].ok_or_else(|| format!("offset {offset} is inside a surrogate pair"))
            }
        }
    }
}

/// Check `spans` against `text` (the node's `text` prop, `""` when it has none): ranges inside their parents, in order, not
/// overlapping, on character boundaries; an inlay a point with text and no children; the styles valid.
pub fn validate_spans(spans: &[SpanSpec], text: &str) -> Result<(), String> {
    let index = Utf16Index::new(text);
    validate_level(spans, 0, index.utf16_len(), &index, 0, "spans")
}

fn validate_level(
    spans: &[SpanSpec],
    from: usize,
    to: usize,
    index: &Utf16Index,
    depth: usize,
    path: &str,
) -> Result<(), String> {
    if depth > MAX_SPAN_DEPTH {
        return Err(format!("{path} nest deeper than {MAX_SPAN_DEPTH} levels"));
    }
    let mut cursor = from;
    for (n, span) in spans.iter().enumerate() {
        let here = format!("{path}[{n}]");
        if span.start > span.end {
            return Err(format!(
                "{here} starts at {} after it ends at {}",
                span.start, span.end
            ));
        }
        if span.start < cursor {
            return Err(format!(
                "{here} starts at {}, inside the span before it (which ends at {cursor}) or before its parent starts",
                span.start
            ));
        }
        if span.end > to {
            return Err(format!(
                "{here} ends at {}, past the end of its parent ({to})",
                span.end
            ));
        }
        index
            .code_point(span.start)
            .map_err(|error| format!("{here}.start: {error}"))?;
        index
            .code_point(span.end)
            .map_err(|error| format!("{here}.end: {error}"))?;
        if let Some(style) = &span.style {
            style
                .as_style()
                .validate()
                .map_err(|error| format!("{here}.style: {error}"))?;
        }
        let children = span.children.as_deref().unwrap_or(&[]);
        match &span.inlay {
            Some(text) => {
                if text.is_empty() {
                    return Err(format!("{here} is an inlay with no text"));
                }
                if span.start != span.end {
                    return Err(format!(
                        "{here} is an inlay and must sit at one offset, not cover {}..{}",
                        span.start, span.end
                    ));
                }
                if !children.is_empty() {
                    return Err(format!("{here} is an inlay and cannot have children"));
                }
            }
            None => {
                if span.start == span.end && children.is_empty() {
                    return Err(format!("{here} is empty"));
                }
                validate_level(
                    children,
                    span.start,
                    span.end,
                    index,
                    depth + 1,
                    &format!("{here}.children"),
                )?;
            }
        }
        cursor = span.end;
    }
    Ok(())
}

/// What decides the font of a stretch of text: the request that would shape it (`text_style::resolve::ShapingStyle`).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct FontKey {
    pub(crate) families: Vec<String>,
    pub(crate) weight: Option<u16>,
    pub(crate) italic: bool,
}

impl FontKey {
    fn of(style: &StyleSpec) -> Self {
        Self {
            families: style
                .font_family
                .as_deref()
                .map(family_list)
                .unwrap_or_default(),
            weight: style.font_weight,
            italic: style.font_style == Some(FontStyleSpec::Italic),
        }
    }
}

/// What a stretch of the display text looks like, from the innermost span around it.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct SegmentStyle {
    /// The colour a span set (itself or an ancestor span); `None` is the node's own text colour, which may be moving.
    pub(crate) color: Option<String>,
    pub(crate) font: FontKey,
    /// The node's decorations and the ones the spans around it set, each in the colour and thickness of the span that set it.
    pub(crate) decorations: Vec<TextDecoration>,
}

/// A piece of the display text between two span boundaries.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Segment {
    /// In code points of the display text.
    pub(crate) range: Range<usize>,
    /// Generated text.
    pub(crate) inlay: bool,
    pub(crate) style: Rc<SegmentStyle>,
}

/// A span's background: its display range, filled before anything else is drawn over it.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Background {
    pub(crate) range: Range<usize>,
    pub(crate) color: String,
}

/// A stretch of the display text that one font shapes.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct FontRun {
    pub(crate) range: Range<usize>,
    pub(crate) font: FontKey,
}

/// A text with its spans resolved. See the module's documentation.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct RichText {
    pub(crate) display: String,
    pub(crate) map: OffsetMap,
    pub(crate) segments: Vec<Segment>,
    pub(crate) backgrounds: Vec<Background>,
    pub(crate) font_runs: Vec<FontRun>,
}

/// A span with its offsets in code points of the shown text.
struct CodePointSpan<'a> {
    start: usize,
    end: usize,
    style: Option<&'a SpanStyleSpec>,
    inlay: Option<&'a str>,
    children: Vec<CodePointSpan<'a>>,
}

fn in_code_points<'a>(
    spans: &'a [SpanSpec],
    index: &Utf16Index,
    shown_positions: Option<&[usize]>,
) -> Result<Vec<CodePointSpan<'a>>, String> {
    let shown =
        |code_point: usize| shown_positions.map_or(code_point, |positions| positions[code_point]);
    spans
        .iter()
        .map(|span| {
            Ok(CodePointSpan {
                start: shown(index.code_point(span.start)?),
                end: shown(index.code_point(span.end)?),
                style: span.style.as_ref(),
                inlay: span.inlay.as_deref(),
                children: in_code_points(
                    span.children.as_deref().unwrap_or(&[]),
                    index,
                    shown_positions,
                )?,
            })
        })
        .collect()
}

/// A span's style once it has inherited from the span around it, as an element's computed style is.
struct Cascade {
    style: StyleSpec,
    color: Option<String>,
}

impl Cascade {
    /// The style of `own` inside `parent`: colour and the inherited text longhands come from the parent, a decoration joins the
    /// ones propagated to it (`text_style::settle`, which resolves a node's own the same way).
    fn within(parent: &Cascade, own: Option<&SpanStyleSpec>) -> Self {
        let mut style = StyleSpec {
            color: parent.style.color.clone(),
            ..StyleSpec::default()
        };
        InheritedText::of(&parent.style).inherit_into(&mut style);
        let mut color = parent.color.clone();
        if let Some(own) = own {
            if let Some(set) = &own.color {
                style.color = Some(set.clone());
                color = Some(set.clone());
            }
            if own.font_family.is_some() {
                style.font_family = own.font_family.clone();
            }
            if own.font_weight.is_some() {
                style.font_weight = own.font_weight;
            }
            if own.font_style.is_some() {
                style.font_style = own.font_style;
            }
            style.text_decoration_line = own.text_decoration_line;
            style.text_decoration_color = own.text_decoration_color.clone();
            style.text_decoration_style = own.text_decoration_style;
            style.text_decoration_thickness = own.text_decoration_thickness.clone();
            if own.text_underline_offset.is_some() {
                style.text_underline_offset = own.text_underline_offset.clone();
            }
        }
        settle(&mut style);
        Self { style, color }
    }

    fn segment_style(&self) -> Rc<SegmentStyle> {
        Rc::new(SegmentStyle {
            color: self.color.clone(),
            font: FontKey::of(&self.style),
            decorations: self.style.text_decorations.clone(),
        })
    }
}

struct Builder {
    shown: Vec<char>,
    display: String,
    display_len: usize,
    inlays: Vec<Inlay>,
    segments: Vec<Segment>,
    backgrounds: Vec<Background>,
}

impl Builder {
    fn source(&mut self, from: usize, to: usize, style: &Rc<SegmentStyle>) {
        if from >= to {
            return;
        }
        self.display.extend(&self.shown[from..to]);
        self.segments.push(Segment {
            range: self.display_len..self.display_len + (to - from),
            inlay: false,
            style: Rc::clone(style),
        });
        self.display_len += to - from;
    }

    fn inlay(&mut self, at: usize, text: &str, style: &Rc<SegmentStyle>) -> Range<usize> {
        let len = text.chars().count();
        let range = self.display_len..self.display_len + len;
        self.display.push_str(text);
        self.inlays.push(Inlay {
            source: at,
            display: self.display_len,
            len,
        });
        self.segments.push(Segment {
            range: range.clone(),
            inlay: true,
            style: Rc::clone(style),
        });
        self.display_len += len;
        range
    }

    fn walk(
        &mut self,
        spans: &[CodePointSpan],
        from: usize,
        to: usize,
        parent: &Cascade,
        parent_style: &Rc<SegmentStyle>,
    ) {
        let mut cursor = from;
        for span in spans {
            // A span that collapsing left with nothing to style is no box at all.
            if span.inlay.is_none() && span.start == span.end && span.children.is_empty() {
                continue;
            }
            self.source(cursor, span.start, parent_style);
            let cascade = Cascade::within(parent, span.style);
            let style = cascade.segment_style();
            let background = span.style.and_then(|own| own.background_color.clone());
            if let Some(text) = span.inlay {
                let range = self.inlay(span.start, text, &style);
                if let Some(color) = background {
                    self.backgrounds.push(Background { range, color });
                }
            } else {
                // The background is pushed before the children's, so the outermost span fills first.
                let slot = background.map(|color| {
                    self.backgrounds.push(Background { range: 0..0, color });
                    self.backgrounds.len() - 1
                });
                let start = self.display_len;
                self.walk(&span.children, span.start, span.end, &cascade, &style);
                if let Some(slot) = slot {
                    self.backgrounds[slot].range = start..self.display_len;
                }
            }
            cursor = span.end;
        }
        self.source(cursor, to, parent_style);
    }
}

/// Resolve `spans` over a text. `base` is the node's computed style. `source` is its `text` prop, which the spans' UTF-16
/// offsets are into; `shown` is the text it shows, and `shown_positions` where the source's characters went when it differs
/// (`text_style::flow::Shown::positions`).
///
/// Fails for spans that do not fit the text; commit validation (`validate_spans`) has already refused them, so a caller that
/// takes its spans from a mounted node can treat an error as a bug.
pub(crate) fn resolve(
    base: &StyleSpec,
    source: &str,
    shown: &str,
    shown_positions: Option<&[usize]>,
    spans: &[SpanSpec],
) -> Result<RichText, String> {
    let index = Utf16Index::new(source);
    let tree = in_code_points(spans, &index, shown_positions)?;
    let shown_chars: Vec<char> = shown.chars().collect();
    let root = Cascade {
        style: base.clone(),
        color: None,
    };
    let root_style = root.segment_style();
    let mut builder = Builder {
        display: String::with_capacity(shown.len()),
        display_len: 0,
        inlays: Vec::new(),
        segments: Vec::new(),
        backgrounds: Vec::new(),
        shown: shown_chars,
    };
    let to = builder.shown.len();
    builder.walk(&tree, 0, to, &root, &root_style);
    builder
        .backgrounds
        .retain(|background| background.range.start < background.range.end);
    let font_runs = font_runs_of(&builder.segments);
    Ok(RichText {
        map: OffsetMap::new(builder.inlays, to),
        display: builder.display,
        segments: builder.segments,
        backgrounds: builder.backgrounds,
        font_runs,
    })
}

/// The segments' fonts, adjacent equal ones merged.
fn font_runs_of(segments: &[Segment]) -> Vec<FontRun> {
    let mut runs: Vec<FontRun> = Vec::new();
    for segment in segments {
        match runs.last_mut() {
            Some(run) if run.font == segment.style.font => run.range.end = segment.range.end,
            _ => runs.push(FontRun {
                range: segment.range.clone(),
                font: segment.style.font.clone(),
            }),
        }
    }
    runs
}
