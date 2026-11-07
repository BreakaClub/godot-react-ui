//! The spans of a paragraph (`text_span.rs`) on the Godot side: the fonts that shape its runs, the colour of each glyph, the
//! backgrounds and the decorations per fragment.

use std::ops::Range;

use godot::prelude::*;

use crate::fonts::ResolvedFont;
use crate::paint::parse_color;
use crate::text_span::RichText;
use crate::text_span::plan::ColorRuns;
use crate::text_style::resolve::ShapingStyle;

/// A paragraph with spans: its resolved text, the font that shapes each font run, and what painting reads of it.
pub(crate) struct RichParagraph {
    pub(super) text: RichText,
    /// One per `text.font_runs`.
    pub(super) fonts: Vec<ResolvedFont>,
    pub(super) colors: ColorRuns<Color>,
    pub(super) backgrounds: Vec<(Range<usize>, Color)>,
    /// `FontBook::epoch` when the fonts were chosen.
    epoch: u64,
    /// What the paragraph was shaped from, to tell a change that needs shaping again from one that only repaints.
    style: ShapingStyle,
}

impl RichParagraph {
    pub(super) fn new(text: RichText, fonts: Vec<ResolvedFont>, style: &ShapingStyle, epoch: u64) -> Self {
        assert_eq!(text.font_runs.len(), fonts.len(), "a font for every run");
        let colors = ColorRuns::of(&text, |color| parse_color(Some(color), Color::WHITE));
        let backgrounds = text
            .backgrounds
            .iter()
            .map(|background| (background.range.clone(), parse_color(Some(&background.color), Color::TRANSPARENT_BLACK)))
            .collect();
        Self { text, fonts, colors, backgrounds, epoch, style: style.clone() }
    }

    /// Whether `text` shapes to what this paragraph is shaped from: the same characters in the same fonts, at the same style.
    pub(super) fn shapes_like(&self, text: &RichText, style: &ShapingStyle, epoch: u64) -> bool {
        self.epoch == epoch
            && self.style == *style
            && self.text.display == text.display
            && self.text.font_runs == text.font_runs
    }

    /// Whether any glyph has to be drawn one at a time: it has a colour of its own, or the font tracks.
    pub(super) fn draws_glyphs(&self) -> bool {
        self.colors.any() || self.fonts.iter().any(|font| font.tracked)
    }

    /// Whether any segment is decorated.
    pub(super) fn is_decorated(&self) -> bool {
        self.text.segments.iter().any(|segment| !segment.style.decorations.is_empty())
    }
}
