//! What painting a [`RichText`] needs from it, without Godot: the colour of a glyph by where its cluster starts (what
//! `RichTextLabel` does, `rich_text_label.cpp:1655`), and the fragments decorations are drawn per. Both are tested over fake
//! glyph lists and lines.

use std::ops::Range;

use super::{RichText, Segment};

/// The colour each stretch of the display text is drawn in: `None` is the node's own text colour.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ColorRuns<T> {
    /// The start of each segment, in order, and its colour.
    runs: Vec<(usize, Option<T>)>,
}

impl<T> ColorRuns<T> {
    /// The colours of `rich`'s segments, each colour string turned into a `T`.
    pub(crate) fn of(rich: &RichText, parse: impl Fn(&str) -> T) -> Self {
        Self {
            runs: rich
                .segments
                .iter()
                .map(|segment| {
                    (
                        segment.range.start,
                        segment.style.color.as_deref().map(&parse),
                    )
                })
                .collect(),
        }
    }

    /// Runs given by hand: the start of each segment and its colour.
    #[cfg(test)]
    pub(crate) fn from_runs(runs: Vec<(usize, Option<T>)>) -> Self {
        Self { runs }
    }

    /// Whether any stretch has a colour of its own.
    pub(crate) fn any(&self) -> bool {
        self.runs.iter().any(|(_, color)| color.is_some())
    }

    /// The colour of the glyph whose cluster starts at display offset `start`: that of the segment that holds it. `None` is the
    /// node's colour.
    pub(crate) fn at(&self, start: usize) -> Option<&T> {
        let after = self.runs.partition_point(|(from, _)| *from <= start);
        self.runs.get(after.checked_sub(1)?)?.1.as_ref()
    }
}

/// A stretch of one decorated segment on one line.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct FragmentRange {
    pub(crate) line: usize,
    pub(crate) segment: usize,
    pub(crate) range: Range<usize>,
}

/// The pieces of the segments that have decorations, cut at the line breaks, in line order and then text order. `lines` are the
/// lines' ranges in display offsets.
pub(crate) fn fragments(segments: &[Segment], lines: &[Range<usize>]) -> Vec<FragmentRange> {
    let mut found = Vec::new();
    for (line, range) in lines.iter().enumerate() {
        if range.is_empty() {
            continue;
        }
        let first = segments.partition_point(|segment| segment.range.end <= range.start);
        for (segment, candidate) in segments.iter().enumerate().skip(first) {
            if candidate.range.start >= range.end {
                break;
            }
            if candidate.style.decorations.is_empty() {
                continue;
            }
            let from = candidate.range.start.max(range.start);
            let to = candidate.range.end.min(range.end);
            if from < to {
                found.push(FragmentRange {
                    line,
                    segment,
                    range: from..to,
                });
            }
        }
    }
    found
}
