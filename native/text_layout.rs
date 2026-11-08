//! Caret, hit-test and selection geometry over a laid-out Godot `TextParagraph` (plan section 3.17),
//! and the adapters that plug it into the Godot-free text engine (`text_input.rs`, `selection.rs`).
//!
//! A [`TextLayout`] is a snapshot of one paragraph as `TextParagraph::draw` puts it on the canvas: every
//! point and rectangle it returns is in the coordinates of the item the paragraph is drawn into, with
//! the draw position (`origin`) included, so a caret rectangle is exactly where the glyphs it belongs to
//! are. Offsets are code point indices, as in `TextServer`; convert what crosses to JS with
//! `text_offsets.rs`.
//!
//! The server is reached through [`ParagraphSource`]. [`GodotParagraph`] is the real one; the tests drive
//! the layout with a fake, so the line placement, line ownership of offsets and the adapters are tested
//! without an engine. What only the engine can answer (carets, selection runs, hit tests, shaping) is
//! verified by the `probe` build (`native/text_layout_probe.rs`, `pnpm verify:text-layout`).
//!
//! # Public API
//!
//! - [`TextLayout::new`]`(source, origin, empty_line)`. `empty_line` is what an empty line measures: a
//!   paragraph with no text has no font to take metrics from, so the caller gives the font's.
//!   [`GodotParagraph::lay_out`] makes the source for a `TextParagraph`; it sets the paragraph's width the
//!   way `RenderNode::record_content` does before drawing, so the lines are the drawn ones.
//! - Lines: [`TextLayout::lines`], [`TextLayout::line`], [`TextLayout::line_of`] (the line that shows a
//!   caret at an offset). [`Line`] carries the baseline origin `draw` hands to `shaped_text_draw`, the
//!   box, the text range, and the first and last caret offsets on the line.
//! - Hit test: [`TextLayout::hit_test`] (a point to a grapheme boundary), [`TextLayout::hit`] (also the
//!   line), [`TextLayout::offset_at`] (a line and an x).
//! - Carets: [`TextLayout::carets`] (the leading and the trailing caret of an offset, as
//!   `shaped_text_get_carets` gives them), [`TextLayout::carets_on_line`] (the same for a chosen line: the
//!   end of a soft wrapped row is also the start of the next, and this is how to ask for the row's end) and
//!   [`TextLayout::caret`] (the one `LineEdit` draws for an input direction).
//! - Selection: [`TextLayout::selection_rects`], per line, from `shaped_text_get_selection`.
//! - Graphemes: [`TextLayout::grapheme_boundaries`], [`TextLayout::previous_grapheme`],
//!   [`TextLayout::next_grapheme`], [`TextLayout::nearest_grapheme`].
//! - Words: [`TextLayout::word_ranges`] (`shaped_text_get_word_breaks`), [`TextLayout::word_at`] (the word
//!   `LineEdit` selects on a double click) and [`TextLayout::word_range_at`] (the `TextBoundaries` contract:
//!   the white space run when the offset is not in a word).
//! - Adapters: [`TextLayout::boundaries`] is a [`TextBoundaries`](crate::text_input::TextBoundaries)
//!   ([`BoundaryLists`] built from the server's grapheme and word breaks), and
//!   [`TextLayout::line_layout`] is a [`LineLayout`] ([`ParagraphLines`]) for multi-line `EditBuffer`s.
//!
//! # Rules
//!
//! - Line origins replicate `TextParagraph::draw` (`scene/resources/text_paragraph.cpp:841-943`): the
//!   baseline of a line is the previous line's baseline plus its descent and the line spacing plus this
//!   line's ascent; the x offset comes from the alignment and the line's width against `width`
//!   (`get_size().x` when the width is not positive). Horizontal paragraphs with left, centre and right
//!   alignment (justified included) and no drop cap are supported; anything else is
//!   [`TextLayoutError::Unsupported`], never approximated. A paragraph with `max_lines_visible` is the layout of the lines it
//!   shows: the text it hides is not in the layout (`text_len` is where the last visible line ends), which is where a pointer
//!   can reach.
//! - Every offset belongs to exactly one line: the last line that starts at or before it. An offset at a
//!   soft wrap is on the line after the wrap and the offset after a hard line break is on the line after
//!   it (the [`LineLayout`] contract). `TextParagraph` shapes no empty line after a final hard line break
//!   (`text_server.cpp:1034-1219` ends the last line at the break), so this layout adds one: the offset at
//!   the end of such a text is on an empty line below the last, with the last line's height.
//! - [`TextLayout::hit_test`] answers a grapheme boundary on the line the point is on: above the first
//!   line is the first line, below the last is the last, and the gap between two lines belongs to the
//!   upper one. Past the end of a line it is the line's last offset (see [`Line::last_offset`]), so the
//!   result is always an offset [`TextLayout::line_of`] puts on that line; inside a grapheme it is the
//!   boundary nearer to the point. `TextParagraph::hit_test` cannot be used for this: it ignores the
//!   alignment offset of a line, answers the end of the text for a point above the first line (its
//!   `ofs.y < 0` guard tests an offset it just zeroed, not the point), and returns the offset after a
//!   final hard break for a point right of its line. (The probe verifies all three.)
//! - Where the text changes direction a visual position is the end of one run and the start of the other:
//!   two offsets at one x, each with its own caret there ([`Carets`]). The server's hit test has no
//!   affinity and answers one of them at exactly that x; the other is reached from the side of its own
//!   grapheme (the probe uses 1 px inside). The caret of an offset therefore round trips through [`TextLayout::hit_test`]
//!   in text of one direction, and in mixed text when probed inside its own grapheme.
//! - Offsets, lines, ranges and points that are not valid are errors, not clamps. A point outside the
//!   text is valid (it is a pointer position); a NaN or infinite one is not.
//! - Carets are positions, not boxes: [`Caret::x`] is the caret's x and the caller draws the width.
//!   Godot's carets come in two halves of the line's height, the leading half below and the trailing half
//!   above, at the same x unless the text changes direction there ([`Carets`]).
//! - A layout is a snapshot of a paragraph as [`GodotParagraph::lay_out`] left it. Build one per gesture or
//!   per paint and drop it before the paragraph's text, width or alignment changes; [`GodotParagraph`]
//!   returns [`TextLayoutError::Stale`] if the paragraph changed under it. Building one costs a few server
//!   calls per line, one call for the grapheme breaks, and a read of the glyphs of the last line (to know
//!   whether it ends in a hard break); words are only fetched when asked for.

mod paragraph;
#[cfg(test)]
mod tests;

use std::cell::OnceCell;
use std::ops::Range;

use godot::builtin::{Rect2, Vector2};

use crate::text_input::{BoundaryLists, EditError, LayoutProblem, LineLayout};

pub(crate) use paragraph::{GodotParagraph, ShapedGlyph, ShapedLine, ShapedParagraph, read_glyphs};

/// A [`TextLayout`] over a real `TextParagraph`.
pub(crate) type GodotTextLayout = TextLayout<GodotParagraph>;

/// The horizontal alignments `TextParagraph::draw` is replicated for here. `Fill` is `HORIZONTAL_ALIGNMENT_FILL`: the
/// paragraph justified every line but the last (`fit_to_width`), so each of those is as wide as the box and the glyphs of
/// a line start at its left edge, or at its right when the line runs right to left.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TextAlignment {
    Left,
    Center,
    Right,
    Fill,
}

/// The direction of a line (`shaped_text_get_inferred_direction`) or of a caret.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TextDirection {
    Ltr,
    Rtl,
}

/// What a paragraph has that this layout does not replicate.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Unsupported {
    /// `ORIENTATION_VERTICAL`.
    VerticalOrientation,
    /// A drop cap (`set_dropcap`).
    DropCap,
}

/// What the text server returned that cannot be right.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ServerDataProblem {
    /// Line ranges that do not start at 0, are not contiguous or do not end at the text's length.
    LineRanges,
    /// Character breaks that are not strictly increasing and ending at the text's length.
    GraphemeBreaks,
    /// Word breaks that are not sorted, non-overlapping `start < end` pairs inside the text.
    WordBreaks,
    /// A hit test answer past the end of the text.
    HitTest,
    /// A caret answer missing a field or with a value that is not a rectangle or a direction.
    Carets,
    /// A glyph list that is not a list of dictionaries with the fields glyphs have.
    Glyphs,
}

/// Why a layout could not be built or a query could not be answered.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TextLayoutError {
    /// The paragraph uses something this layout does not replicate.
    Unsupported(Unsupported),
    /// `TextServerManager` has no primary text server.
    NoTextServer,
    /// A point or an origin with a NaN or infinite coordinate.
    NonFinite,
    /// An offset past the end of the text.
    OffsetOutOfRange { offset: usize, len: usize },
    /// A range whose start is after its end.
    InvalidRange { start: usize, end: usize },
    /// A line index at or past the number of lines.
    LineOutOfRange { line: usize, count: usize },
    /// An offset outside the text range of the line it was asked for.
    OffsetNotOnLine { line: usize, offset: usize },
    /// The paragraph changed after the layout was built (text, width, alignment, line spacing or the
    /// lines). The text lengths are given because a length is what the edit buffer can compare.
    Stale { built_for: usize, now: usize },
    /// The server has no caret for an offset that is on the line.
    NoCaret { line: usize, offset: usize },
    /// The server's hit test found nothing on a line, where every x inside it has an answer.
    HitTestMissed { line: usize },
    /// The server's data broke an invariant this layout relies on.
    MalformedServerData(ServerDataProblem),
}

impl std::fmt::Display for TextLayoutError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TextLayoutError::Unsupported(what) => {
                write!(
                    formatter,
                    "the paragraph uses something unsupported: {what:?}"
                )
            }
            TextLayoutError::NoTextServer => formatter.write_str("there is no primary text server"),
            TextLayoutError::NonFinite => formatter.write_str("a coordinate is NaN or infinite"),
            TextLayoutError::OffsetOutOfRange { offset, len } => write!(
                formatter,
                "offset {offset} is past the end of the text ({len} code points)"
            ),
            TextLayoutError::InvalidRange { start, end } => {
                write!(formatter, "range {start}..{end} starts after it ends")
            }
            TextLayoutError::LineOutOfRange { line, count } => {
                write!(formatter, "line {line} is past the last of {count} lines")
            }
            TextLayoutError::OffsetNotOnLine { line, offset } => {
                write!(
                    formatter,
                    "offset {offset} is not in the text of line {line}"
                )
            }
            TextLayoutError::Stale { built_for, now } => write!(
                formatter,
                "the paragraph changed after the layout was built (text length {built_for} then, {now} now)"
            ),
            TextLayoutError::NoCaret { line, offset } => write!(
                formatter,
                "the text server has no caret for offset {offset} on line {line}"
            ),
            TextLayoutError::HitTestMissed { line } => {
                write!(formatter, "the text server's hit test missed line {line}")
            }
            TextLayoutError::MalformedServerData(problem) => {
                write!(
                    formatter,
                    "the text server returned malformed data: {problem:?}"
                )
            }
        }
    }
}

/// What the server says about one shaped line. Positions are in the paragraph's code points.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct LineFacts {
    pub(crate) start: usize,
    pub(crate) end: usize,
    pub(crate) ascent: f32,
    pub(crate) descent: f32,
    /// `shaped_text_get_width`: the glyphs' width, rounded up.
    pub(crate) width: f32,
    pub(crate) direction: TextDirection,
}

/// What a paragraph reports about itself.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ParagraphFacts {
    /// `TextParagraph::get_width`: the width lines wrap to; not positive means no wrapping.
    pub(crate) width: f32,
    pub(crate) alignment: TextAlignment,
    pub(crate) line_spacing: f32,
    /// The text's length in code points.
    pub(crate) text_len: usize,
    pub(crate) lines: Vec<LineFacts>,
    /// Whether the last line ends with a mandatory break (`GRAPHEME_IS_BREAK_HARD`), after which a
    /// caret is on a line the paragraph does not have.
    pub(crate) ends_with_hard_break: bool,
}

/// What an empty line measures. The caller takes it from the font (`Font::get_ascent` and
/// `get_descent` at the font size): a paragraph with no text reports zero for both.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct LineExtents {
    pub(crate) ascent: f32,
    pub(crate) descent: f32,
}

/// One caret as `TextServer::shaped_text_get_carets` gives it: relative to the line, with `y` from
/// the baseline (negative above it).
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct ServerCaret {
    pub(crate) x: f32,
    pub(crate) top: f32,
    pub(crate) height: f32,
    /// `None` is `DIRECTION_AUTO`: a caret inside a grapheme, which both directions share.
    pub(crate) direction: Option<TextDirection>,
}

/// Both carets the server has for an offset. An absent one is an empty `Rect2` in Godot.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct ServerCarets {
    pub(crate) leading: Option<ServerCaret>,
    pub(crate) trailing: Option<ServerCaret>,
}

/// The shaped paragraph behind a layout: every question a [`TextLayout`] puts to the text server.
/// `line` is an index into [`ParagraphFacts::lines`] (never the virtual line after a final break).
pub(crate) trait ParagraphSource {
    fn facts(&self) -> Result<ParagraphFacts, TextLayoutError>;
    /// `shaped_text_get_character_breaks`: every grapheme boundary after the start, the end included.
    fn character_breaks(&self) -> Result<Vec<usize>, TextLayoutError>;
    /// `shaped_text_get_word_breaks`: `start, end` pairs, flattened.
    fn word_breaks(&self) -> Result<Vec<usize>, TextLayoutError>;
    /// `shaped_text_get_carets` on the line, for an offset on it.
    fn carets(&self, line: usize, offset: usize) -> Result<ServerCarets, TextLayoutError>;
    /// `shaped_text_get_selection` on the line: `(start, end)` x ranges relative to the line.
    fn selection(
        &self,
        line: usize,
        start: usize,
        end: usize,
    ) -> Result<Vec<(f32, f32)>, TextLayoutError>;
    /// `shaped_text_hit_test_position` on the line, with x relative to the line; `None` for the
    /// server's -1.
    fn hit_test_position(&self, line: usize, x: f32) -> Result<Option<usize>, TextLayoutError>;
}

/// One line as drawn.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Line {
    /// The text the server shaped on the line. Empty for an empty text and for the line after a final
    /// hard break.
    pub(crate) range: Range<usize>,
    /// The first caret offset on the line: the start of its range.
    pub(crate) first_offset: usize,
    /// The last caret offset on the line, where End puts the caret. A line that is followed by another
    /// does not own its range's end (that is the next line's first offset), so this is the grapheme
    /// boundary before it; the last line owns the end of the text.
    pub(crate) last_offset: usize,
    /// Where `TextParagraph::draw` passes the line to `shaped_text_draw`: the left end of the line's
    /// glyphs, on the baseline.
    pub(crate) origin: Vector2,
    pub(crate) ascent: f32,
    pub(crate) descent: f32,
    pub(crate) width: f32,
    pub(crate) direction: TextDirection,
    /// The empty line after a final hard break, which the server does not shape.
    pub(crate) after_final_break: bool,
}

impl Line {
    pub(crate) fn top(&self) -> f32 {
        self.origin.y - self.ascent
    }

    pub(crate) fn height(&self) -> f32 {
        self.ascent + self.descent
    }

    /// The line's box: from the left end of its glyphs, its height, as wide as its glyphs.
    #[cfg_attr(not(feature = "probe"), allow(dead_code))] // No caller yet: the probe uses it.
    pub(crate) fn rect(&self) -> Rect2 {
        Rect2::new(
            Vector2::new(self.origin.x, self.top()),
            Vector2::new(self.width, self.height()),
        )
    }
}

/// A caret position in the layout's coordinates.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Caret {
    pub(crate) x: f32,
    pub(crate) top: f32,
    pub(crate) height: f32,
    pub(crate) direction: Option<TextDirection>,
}

impl Caret {
    /// The caret drawn `width` wide with `x` as its left edge, as `LineEdit` does.
    pub(crate) fn rect(&self, width: f32) -> Rect2 {
        Rect2::new(
            Vector2::new(self.x, self.top),
            Vector2::new(width, self.height),
        )
    }

    /// The middle of the caret's line segment.
    #[cfg_attr(not(feature = "probe"), allow(dead_code))] // No caller yet: the probe uses it.
    pub(crate) fn center(&self) -> Vector2 {
        Vector2::new(self.x, self.top + self.height / 2.0)
    }
}

/// The carets of an offset. At least one is present. Where the text keeps one direction both are at
/// the same x (the leading one covers the lower half of the line, the trailing one the upper half);
/// where it changes direction they are apart and each belongs to one side.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Carets {
    pub(crate) line: usize,
    /// After the grapheme that ends at the offset (`shaped_text_get_carets` "leading_rect").
    pub(crate) leading: Option<Caret>,
    /// Before the grapheme that starts at the offset ("trailing_rect").
    pub(crate) trailing: Option<Caret>,
}

impl Carets {
    /// The caret `LineEdit` places the cursor at for an input direction (`line_edit.cpp:1990`): the
    /// leading one if it is direction-neutral or goes the way the input does, or if there is no
    /// trailing one; the trailing one otherwise.
    pub(crate) fn primary(&self, input_direction: TextDirection) -> Caret {
        self.leading
            .filter(|caret| {
                caret
                    .direction
                    .is_none_or(|direction| direction == input_direction)
            })
            .or(self.trailing)
            .or(self.leading)
            .expect("TextLayout::carets returns NoCaret instead of a Carets without a caret")
    }
}

/// A hit-test answer: a grapheme boundary and the line it is on.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Hit {
    pub(crate) offset: usize,
    pub(crate) line: usize,
}

/// One selected run on one line.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct SelectionRect {
    pub(crate) line: usize,
    pub(crate) rect: Rect2,
}

/// A paragraph's lines, carets, hit tests and selection, in the coordinates `TextParagraph::draw` uses.
pub(crate) struct TextLayout<S> {
    source: S,
    origin: Vector2,
    text_len: usize,
    lines: Vec<Line>,
    /// Every grapheme boundary: 0, the server's character breaks, the text's length last.
    graphemes: Vec<usize>,
    /// Computed when first asked for: painting never needs them.
    words: OnceCell<Vec<(usize, usize)>>,
}

impl<S: ParagraphSource> TextLayout<S> {
    /// Lay out `source` as drawn at `origin`. `empty_line` is the measure of a line with no text.
    pub(crate) fn new(
        source: S,
        origin: Vector2,
        empty_line: LineExtents,
    ) -> Result<Self, TextLayoutError> {
        if !origin.x.is_finite() || !origin.y.is_finite() {
            return Err(TextLayoutError::NonFinite);
        }
        let facts = source.facts()?;
        let text_len = facts.text_len;
        validate_line_ranges(&facts.lines, text_len)?;
        let graphemes = grapheme_boundaries(text_len, &source.character_breaks()?)?;

        let mut shaped = facts.lines;
        if text_len == 0 {
            // The single empty line has no glyphs to measure.
            for line in &mut shaped {
                line.ascent = empty_line.ascent;
                line.descent = empty_line.descent;
            }
        }
        let mut after_final_break = None;
        if facts.ends_with_hard_break {
            let last = shaped
                .last()
                .expect("validated lines include at least one line");
            after_final_break = Some(LineFacts {
                start: text_len,
                end: text_len,
                ascent: last.ascent,
                descent: last.descent,
                width: 0.0,
                direction: last.direction,
            });
        }
        let shaped_count = shaped.len();
        shaped.extend(after_final_break);

        let origins = place_lines(
            origin,
            facts.width,
            facts.alignment,
            facts.line_spacing,
            &shaped,
        );
        let lines = shaped
            .iter()
            .zip(origins)
            .enumerate()
            .map(|(index, (line, line_origin))| Line {
                range: line.start..line.end,
                first_offset: line.start,
                last_offset: last_offset(&graphemes, line, index + 1 == shaped.len()),
                origin: line_origin,
                ascent: line.ascent,
                descent: line.descent,
                width: line.width,
                direction: line.direction,
                after_final_break: index >= shaped_count,
            })
            .collect();

        Ok(Self {
            source,
            origin,
            text_len,
            lines,
            graphemes,
            words: OnceCell::new(),
        })
    }

    /// The paragraph's text length in code points.
    pub(crate) fn text_len(&self) -> usize {
        self.text_len
    }

    /// Where the paragraph is drawn.
    #[cfg_attr(not(feature = "probe"), allow(dead_code))] // No caller yet: the probe uses it.
    pub(crate) fn origin(&self) -> Vector2 {
        self.origin
    }

    #[cfg_attr(not(feature = "probe"), allow(dead_code))] // No caller yet: the probe uses it.
    pub(crate) fn lines(&self) -> &[Line] {
        &self.lines
    }

    pub(crate) fn line(&self, index: usize) -> Result<&Line, TextLayoutError> {
        self.lines
            .get(index)
            .ok_or(TextLayoutError::LineOutOfRange {
                line: index,
                count: self.lines.len(),
            })
    }

    /// The line that shows a caret at `offset`.
    pub(crate) fn line_of(&self, offset: usize) -> Result<usize, TextLayoutError> {
        self.check_offset(offset)?;
        let starting_after = self
            .lines
            .partition_point(|line| line.first_offset <= offset);
        // The first line starts at 0, so something starts at or before every offset.
        Ok(starting_after - 1)
    }

    // ---- hit test ----

    /// The grapheme boundary nearest to `point`, on the line the point is on.
    pub(crate) fn hit_test(&self, point: Vector2) -> Result<usize, TextLayoutError> {
        self.hit(point).map(|hit| hit.offset)
    }

    /// [`TextLayout::hit_test`] with the line.
    pub(crate) fn hit(&self, point: Vector2) -> Result<Hit, TextLayoutError> {
        if !point.x.is_finite() || !point.y.is_finite() {
            return Err(TextLayoutError::NonFinite);
        }
        // The last line that starts at or above the point; above the first line is the first.
        let line = self
            .lines
            .partition_point(|line| line.top() <= point.y)
            .saturating_sub(1);
        let offset = self.offset_on_line(line, point.x)?;
        Ok(Hit { offset, line })
    }

    /// The caret offset on `line` nearest to the layout x `x`.
    pub(crate) fn offset_at(&self, line: usize, x: f32) -> Result<usize, TextLayoutError> {
        if !x.is_finite() {
            return Err(TextLayoutError::NonFinite);
        }
        self.line(line)?;
        self.offset_on_line(line, x)
    }

    fn offset_on_line(&self, index: usize, x: f32) -> Result<usize, TextLayoutError> {
        let line = &self.lines[index];
        if line.range.is_empty() {
            return Ok(line.first_offset);
        }
        let raw = self
            .source
            .hit_test_position(index, x - line.origin.x)?
            .ok_or(TextLayoutError::HitTestMissed { line: index })?;
        if raw > self.text_len {
            return Err(TextLayoutError::MalformedServerData(
                ServerDataProblem::HitTest,
            ));
        }
        // A caret never sits inside a grapheme (`LineEdit` snaps with `closest_character_pos`,
        // `line_edit.cpp:1920`). For a hit inside one the server's answer is a split of its cell into
        // equal parts per code point, which for a cell of an even number of code points has no middle
        // to round from, so the boundary is chosen by where the point is in the grapheme instead.
        let boundary = match self.graphemes.binary_search(&raw) {
            Ok(_) => raw,
            Err(inside) => {
                self.nearer_boundary(index, x, self.graphemes[inside - 1], self.graphemes[inside])?
            }
        };
        // The server answers the end of a line that is followed by another with the offset after its
        // last character, which is the next line's first offset. The nearest offset on this line is
        // its last.
        Ok(boundary.clamp(line.first_offset, line.last_offset))
    }

    /// Whichever of the two boundaries of the grapheme `lower..upper` is nearer to the layout x `x`
    /// (the lower one if they are as near), measured at the carets that touch the grapheme.
    fn nearer_boundary(
        &self,
        index: usize,
        x: f32,
        lower: usize,
        upper: usize,
    ) -> Result<usize, TextLayoutError> {
        let line = &self.lines[index];
        let before = self.source.carets(index, lower)?.trailing;
        let after = self.source.carets(index, upper)?.leading;
        let (Some(before), Some(after)) = (before, after) else {
            return Err(TextLayoutError::NoCaret {
                line: index,
                offset: if before.is_none() { lower } else { upper },
            });
        };
        let to_lower = (x - (line.origin.x + before.x)).abs();
        let to_upper = (x - (line.origin.x + after.x)).abs();
        Ok(if to_upper < to_lower { upper } else { lower })
    }

    // ---- carets ----

    /// The carets of `offset`, on the line that shows it.
    pub(crate) fn carets(&self, offset: usize) -> Result<Carets, TextLayoutError> {
        self.carets_on_line(self.line_of(offset)?, offset)
    }

    /// The carets `offset` has on `line`. `offset` may be the end of the line's range even when the
    /// next line owns it (a soft wrap): that is where a caret at the end of the row would be drawn.
    pub(crate) fn carets_on_line(
        &self,
        index: usize,
        offset: usize,
    ) -> Result<Carets, TextLayoutError> {
        let line = self.line(index)?;
        if !(line.range.start..=line.range.end).contains(&offset) {
            return Err(TextLayoutError::OffsetNotOnLine {
                line: index,
                offset,
            });
        }
        if line.range.is_empty() {
            // Nothing is shaped here, so the server has no caret. `LineEdit` puts one at the start
            // of an empty field (`line_edit.cpp:1568-1600`); here it is the line's start.
            let caret = Caret {
                x: line.origin.x,
                top: line.top(),
                height: line.height(),
                direction: None,
            };
            return Ok(Carets {
                line: index,
                leading: Some(caret),
                trailing: None,
            });
        }
        let raw = self.source.carets(index, offset)?;
        let place = |caret: ServerCaret| Caret {
            x: line.origin.x + caret.x,
            top: line.origin.y + caret.top,
            height: caret.height,
            direction: caret.direction,
        };
        let carets = Carets {
            line: index,
            leading: raw.leading.map(place),
            trailing: raw.trailing.map(place),
        };
        if carets.leading.is_none() && carets.trailing.is_none() {
            return Err(TextLayoutError::NoCaret {
                line: index,
                offset,
            });
        }
        Ok(carets)
    }

    /// The caret the cursor is drawn at for an input direction ([`Carets::primary`]).
    pub(crate) fn caret(
        &self,
        offset: usize,
        input_direction: TextDirection,
    ) -> Result<Caret, TextLayoutError> {
        Ok(self.carets(offset)?.primary(input_direction))
    }

    // ---- selection ----

    /// The runs `start..end` covers, per line, as the server measures them. Empty for an empty range.
    pub(crate) fn selection_rects(
        &self,
        start: usize,
        end: usize,
    ) -> Result<Vec<SelectionRect>, TextLayoutError> {
        if start > end {
            return Err(TextLayoutError::InvalidRange { start, end });
        }
        self.check_offset(end)?;
        let mut rects = Vec::new();
        if start == end {
            return Ok(rects);
        }
        for (index, line) in self.lines.iter().enumerate() {
            let from = start.max(line.range.start);
            let to = end.min(line.range.end);
            if from >= to {
                continue;
            }
            for (left, right) in self.source.selection(index, from, to)? {
                // The line break glyph measures a zero-width run.
                if right > left {
                    rects.push(SelectionRect {
                        line: index,
                        rect: Rect2::new(
                            Vector2::new(line.origin.x + left, line.top()),
                            Vector2::new(right - left, line.height()),
                        ),
                    });
                }
            }
        }
        Ok(rects)
    }

    // ---- graphemes ----

    /// Every grapheme boundary of the text, 0 first and the length last.
    #[cfg_attr(not(feature = "probe"), allow(dead_code))] // No caller yet: the probe uses it.
    pub(crate) fn grapheme_boundaries(&self) -> &[usize] {
        &self.graphemes
    }

    /// The largest boundary below `offset`, or `None` at the start.
    #[cfg_attr(not(feature = "probe"), allow(dead_code))] // No caller yet: the probe uses it.
    pub(crate) fn previous_grapheme(
        &self,
        offset: usize,
    ) -> Result<Option<usize>, TextLayoutError> {
        self.check_offset(offset)?;
        let below = self
            .graphemes
            .partition_point(|boundary| *boundary < offset);
        Ok(below.checked_sub(1).map(|index| self.graphemes[index]))
    }

    /// The smallest boundary above `offset`, or `None` at the end.
    #[cfg_attr(not(feature = "probe"), allow(dead_code))] // No caller yet: the probe uses it.
    pub(crate) fn next_grapheme(&self, offset: usize) -> Result<Option<usize>, TextLayoutError> {
        self.check_offset(offset)?;
        let through = self
            .graphemes
            .partition_point(|boundary| *boundary <= offset);
        Ok(self.graphemes.get(through).copied())
    }

    /// The boundary closest to `offset`; between two it is the lower one
    /// (`TextServer::shaped_text_closest_character_pos`).
    #[cfg_attr(not(feature = "probe"), allow(dead_code))] // No caller yet: the probe uses it.
    pub(crate) fn nearest_grapheme(&self, offset: usize) -> Result<usize, TextLayoutError> {
        self.check_offset(offset)?;
        Ok(self.nearest_boundary(offset))
    }

    fn nearest_boundary(&self, offset: usize) -> usize {
        let through = self
            .graphemes
            .partition_point(|boundary| *boundary <= offset);
        let lower = self.graphemes[through - 1];
        match self.graphemes.get(through) {
            Some(upper) if upper - offset < offset - lower => *upper,
            _ => lower,
        }
    }

    // ---- words ----

    /// The words the server finds: `shaped_text_get_word_breaks` with its default flags (white space
    /// and punctuation separate words), as `(start, end)` pairs in text order.
    pub(crate) fn word_ranges(&self) -> Result<&[(usize, usize)], TextLayoutError> {
        if let Some(words) = self.words.get() {
            return Ok(words);
        }
        let words = word_pairs(self.text_len, &self.source.word_breaks()?)?;
        Ok(self.words.get_or_init(|| words))
    }

    /// The first word with `start <= offset <= end`, as `LineEdit` picks one on a double click
    /// (`line_edit.cpp:543-557`); `None` in white space.
    #[cfg_attr(not(feature = "probe"), allow(dead_code))] // No caller yet: the probe uses it.
    pub(crate) fn word_at(&self, offset: usize) -> Result<Option<(usize, usize)>, TextLayoutError> {
        self.check_offset(offset)?;
        Ok(self
            .word_ranges()?
            .iter()
            .find(|(start, end)| *start <= offset && offset <= *end)
            .copied())
    }

    /// The word `point` (in the layout's coordinates) is over, as a long press on text selects one: the point must be inside the
    /// glyphs of a line, on a grapheme that is part of a word. White space and punctuation, the gaps between lines and the empty room
    /// beside or below a line's glyphs have no word (`None`), where a double click's [`TextLayout::word_range_at`] takes the nearest.
    pub(crate) fn word_under(
        &self,
        point: Vector2,
    ) -> Result<Option<(usize, usize)>, TextLayoutError> {
        let on_line = |line: &Line| {
            !line.range.is_empty()
                && line.top() <= point.y
                && point.y < line.top() + line.height()
                && line.origin.x <= point.x
                && point.x < line.origin.x + line.width
        };
        if !self.lines.iter().any(on_line) {
            return Ok(None);
        }
        // The grapheme under the point is on one side of the nearest boundary: the one whose run contains the point.
        let boundary = self.hit(point)?.offset;
        let before = self
            .previous_grapheme(boundary)?
            .map(|start| (start, boundary));
        let after = self.next_grapheme(boundary)?.map(|end| (boundary, end));
        for (start, end) in before.into_iter().chain(after) {
            let over = self.selection_rects(start, end)?.iter().any(|run| {
                run.rect.position.x <= point.x && point.x < run.rect.position.x + run.rect.size.x
            });
            if over {
                return Ok(self
                    .word_ranges()?
                    .iter()
                    .find(|(word_start, word_end)| *word_start <= start && end <= *word_end)
                    .copied());
            }
        }
        Ok(None)
    }

    /// The `TextBoundaries::word_range` contract: the word that contains `offset`, preferring the one
    /// that starts there, else the one that ends there; in the gap between words, the gap.
    pub(crate) fn word_range_at(&self, offset: usize) -> Result<(usize, usize), TextLayoutError> {
        self.check_offset(offset)?;
        let words = self.word_ranges()?;
        if let Some(word) = words
            .iter()
            .find(|(start, end)| *start <= offset && offset < *end)
            .or_else(|| words.iter().find(|(_, end)| *end == offset))
        {
            return Ok(*word);
        }
        let start = words
            .iter()
            .rev()
            .map(|(_, end)| *end)
            .find(|end| *end <= offset)
            .unwrap_or(0);
        let end = words
            .iter()
            .map(|(start, _)| *start)
            .find(|start| *start >= offset)
            .unwrap_or(self.text_len);
        Ok((start, end))
    }

    // ---- adapters ----

    /// The text engine's grapheme and word boundaries from the server's: a
    /// [`TextBoundaries`](crate::text_input::TextBoundaries) for the text this paragraph shaped.
    ///
    /// The paragraph must be shaped from the buffer's own text. A password field draws bullets and a
    /// field with a composition draws the preedit spliced in, so neither paragraph has the buffer's
    /// boundaries; shape the buffer's text for this (it need not be drawn).
    pub(crate) fn boundaries(&self) -> Result<BoundaryLists, TextLayoutError> {
        BoundaryLists::new(self.graphemes.clone(), self.word_ranges()?.to_vec())
            .map_err(|_| TextLayoutError::MalformedServerData(ServerDataProblem::WordBreaks))
    }

    /// The text engine's line queries over this layout, for a multi-line `EditBuffer`.
    /// `input_direction` picks the caret at a direction change ([`Carets::primary`]); `page_height` is
    /// the visible height of the content, which sets how many lines a page move goes.
    pub(crate) fn line_layout(
        &self,
        input_direction: TextDirection,
        page_height: f32,
    ) -> Result<ParagraphLines<'_, S>, TextLayoutError> {
        if !page_height.is_finite() {
            return Err(TextLayoutError::NonFinite);
        }
        let pitch = self.line_pitch();
        let fitting = if pitch > 0.0 {
            (page_height / pitch).floor().max(0.0) as usize
        } else {
            0
        };
        Ok(ParagraphLines {
            layout: self,
            input_direction,
            page_lines: fitting.max(1),
        })
    }

    /// The distance between the tops of two lines: the tallest line, plus the spacing between lines.
    fn line_pitch(&self) -> f32 {
        let spacing = match self.lines.as_slice() {
            [first, second, ..] => second.top() - first.origin.y - first.descent,
            _ => 0.0,
        };
        self.lines.iter().map(Line::height).fold(0.0, f32::max) + spacing.max(0.0)
    }

    fn check_offset(&self, offset: usize) -> Result<(), TextLayoutError> {
        if offset <= self.text_len {
            Ok(())
        } else {
            Err(TextLayoutError::OffsetOutOfRange {
                offset,
                len: self.text_len,
            })
        }
    }
}

/// Where each line's glyphs start, replicating `TextParagraph::draw`
/// (`scene/resources/text_paragraph.cpp:867-942`, the horizontal case with no drop cap).
/// Where each of the lines of a paragraph starts, as `TextParagraph::draw` places them, for a paragraph drawn at `origin`.
pub(crate) fn place_lines(
    origin: Vector2,
    width: f32,
    alignment: TextAlignment,
    line_spacing: f32,
    lines: &[LineFacts],
) -> Vec<Vector2> {
    // `l_width = width > 0 ? width : get_size().x`, and `get_size().x` is the widest line.
    let widest = lines.iter().map(|line| line.width).fold(0.0, f32::max);
    let line_width = if width > 0.0 { width } else { widest };
    let mut y = origin.y;
    lines
        .iter()
        .map(|line| {
            y += line.ascent;
            let mut x = origin.x;
            if line_width > 0.0 {
                match alignment {
                    TextAlignment::Left => {}
                    TextAlignment::Center => {
                        if line.width <= line_width {
                            x += ((line_width - line.width) / 2.0).floor();
                        } else if line.direction == TextDirection::Rtl {
                            // A line wider than the box overflows to the left, anchored on its right.
                            x += line_width - line.width;
                        }
                    }
                    TextAlignment::Right => x += line_width - line.width,
                    TextAlignment::Fill => {
                        if line.direction == TextDirection::Rtl {
                            x += line_width - line.width;
                        }
                    }
                }
            }
            let baseline = Vector2::new(x, y);
            y += line.descent + line_spacing;
            baseline
        })
        .collect()
}

/// The last caret offset on a line (see [`Line::last_offset`]).
fn last_offset(graphemes: &[usize], line: &LineFacts, final_line: bool) -> usize {
    if final_line {
        return line.end;
    }
    let below = graphemes.partition_point(|boundary| *boundary < line.end);
    let previous = below
        .checked_sub(1)
        .map_or(line.start, |index| graphemes[index]);
    previous.max(line.start)
}

/// Lines must tile the text: the first starts at 0, each starts where the one before ended, the last
/// ends at the text's length. Everything that maps an offset to a line relies on it.
fn validate_line_ranges(lines: &[LineFacts], text_len: usize) -> Result<(), TextLayoutError> {
    let problem = TextLayoutError::MalformedServerData(ServerDataProblem::LineRanges);
    let mut expected_start = 0;
    for line in lines {
        if line.start != expected_start || line.end < line.start {
            return Err(problem);
        }
        expected_start = line.end;
    }
    if lines.is_empty() || expected_start != text_len {
        return Err(problem);
    }
    Ok(())
}

fn grapheme_boundaries(text_len: usize, breaks: &[usize]) -> Result<Vec<usize>, TextLayoutError> {
    let problem = TextLayoutError::MalformedServerData(ServerDataProblem::GraphemeBreaks);
    let mut boundaries = Vec::with_capacity(breaks.len() + 1);
    boundaries.push(0);
    let mut previous = 0;
    for boundary in breaks {
        if *boundary <= previous || *boundary > text_len {
            return Err(problem);
        }
        boundaries.push(*boundary);
        previous = *boundary;
    }
    if previous != text_len {
        return Err(problem);
    }
    Ok(boundaries)
}

fn word_pairs(text_len: usize, flat: &[usize]) -> Result<Vec<(usize, usize)>, TextLayoutError> {
    let problem = TextLayoutError::MalformedServerData(ServerDataProblem::WordBreaks);
    let (pairs, remainder) = flat.as_chunks::<2>();
    if !remainder.is_empty() {
        return Err(problem);
    }
    let words: Vec<(usize, usize)> = pairs.iter().map(|[start, end]| (*start, *end)).collect();
    let ordered = words
        .iter()
        .all(|(start, end)| start < end && *end <= text_len)
        && words.windows(2).all(|pair| pair[0].1 <= pair[1].0);
    if ordered { Ok(words) } else { Err(problem) }
}

/// A [`LineLayout`] over a [`TextLayout`] (see [`TextLayout::line_layout`]).
///
/// The contract is met by construction: lines tile the text, so every offset is on exactly one line;
/// [`Line::first_offset`] and [`Line::last_offset`] are both on their line; [`TextLayout::offset_at`]
/// answers inside them. Positions are "from the left of the text": the layout's x less its origin's.
///
/// `TextLayoutError`s map to the nearest [`EditError`]: an offset or line out of range to itself, a
/// stale paragraph to `TextMismatch`, and a server that has no caret or no hit to
/// `InvalidLayout(OffsetOutsideLine)`. The text engine's error type has no place for a failed text
/// service and the contract does not need one: the other failures are caught when the layout is built.
/// Call the [`TextLayout`] directly for the precise error.
pub(crate) struct ParagraphLines<'a, S> {
    layout: &'a TextLayout<S>,
    input_direction: TextDirection,
    page_lines: usize,
}

impl<S: ParagraphSource> ParagraphLines<'_, S> {
    fn edit_error(&self, error: TextLayoutError) -> EditError {
        match error {
            TextLayoutError::OffsetOutOfRange { offset, len } => {
                EditError::OffsetOutOfRange { offset, len }
            }
            TextLayoutError::InvalidRange { start, end } => EditError::InvalidRange { start, end },
            TextLayoutError::LineOutOfRange { line, count } => {
                EditError::InvalidLayout(LayoutProblem::LineOutOfRange { line, count })
            }
            TextLayoutError::Stale { built_for, now } => EditError::TextMismatch {
                built_for,
                buffer: now,
            },
            TextLayoutError::NoCaret { line, offset }
            | TextLayoutError::OffsetNotOnLine { line, offset } => {
                EditError::InvalidLayout(LayoutProblem::OffsetOutsideLine { line, offset })
            }
            TextLayoutError::HitTestMissed { line } => {
                EditError::InvalidLayout(LayoutProblem::OffsetOutsideLine {
                    line,
                    offset: self
                        .layout
                        .lines
                        .get(line)
                        .map_or(0, |line| line.first_offset),
                })
            }
            TextLayoutError::Unsupported(_)
            | TextLayoutError::NoTextServer
            | TextLayoutError::NonFinite
            | TextLayoutError::MalformedServerData(_) => {
                EditError::InvalidLayout(LayoutProblem::Empty)
            }
        }
    }
}

impl<S: ParagraphSource> LineLayout for ParagraphLines<'_, S> {
    fn line_count(&self) -> usize {
        self.layout.lines.len()
    }

    fn line_of(&self, offset: usize) -> Result<usize, EditError> {
        self.layout
            .line_of(offset)
            .map_err(|error| self.edit_error(error))
    }

    fn line_range(&self, line: usize) -> Result<(usize, usize), EditError> {
        let line = self
            .layout
            .line(line)
            .map_err(|error| self.edit_error(error))?;
        Ok((line.first_offset, line.last_offset))
    }

    fn x_of(&self, offset: usize) -> Result<f32, EditError> {
        let caret = self
            .layout
            .caret(offset, self.input_direction)
            .map_err(|error| self.edit_error(error))?;
        Ok(caret.x - self.layout.origin.x)
    }

    fn offset_at(&self, line: usize, x: f32) -> Result<usize, EditError> {
        self.layout
            .offset_at(line, x + self.layout.origin.x)
            .map_err(|error| self.edit_error(error))
    }

    fn page_lines(&self) -> usize {
        self.page_lines
    }
}
