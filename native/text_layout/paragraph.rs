//! The real [`ParagraphSource`]: a `TextParagraph` and the primary `TextServer`. Every method is one or a
//! few server calls; the geometry built on them is in `text_layout.rs`.

use godot::builtin::Vector2;
use godot::classes::text_server::{Direction, GraphemeFlag, Orientation};
use godot::classes::{TextParagraph, TextServer, TextServerManager};
use godot::global::HorizontalAlignment;
use godot::obj::{EngineBitfield, EngineEnum};
use godot::prelude::*;

use super::{
    LineFacts, ParagraphFacts, ParagraphSource, ServerCaret, ServerCarets, ServerDataProblem,
    TextAlignment, TextDirection, TextLayoutError, Unsupported,
};

/// What of a paragraph the layout was built from; if any of it differs later, the lines the layout
/// holds are not the paragraph's any more.
#[derive(Clone, Copy, Debug, PartialEq)]
struct Stamp {
    width: f32,
    alignment: TextAlignment,
    line_spacing: f32,
    /// The whole text's length, hidden lines included.
    text_len: usize,
    /// All the paragraph's lines, hidden ones included.
    line_count: usize,
    /// The lines it shows (`max_lines_visible`), and where the last of them ends.
    visible_lines: usize,
    visible_end: usize,
}

/// A `TextParagraph` read through the primary text server.
pub(crate) struct GodotParagraph {
    paragraph: Gd<TextParagraph>,
    server: Gd<TextServer>,
    stamp: Stamp,
    /// Whether the white space a line ends with hangs past it and is left out of the line's width (see
    /// [`GodotParagraph::hanging_spaces`]).
    hangs: bool,
}

impl GodotParagraph {
    /// Lay `paragraph` out `content_width` wide, as `RenderNode::record_content` does before it draws it.
    /// A paragraph's width is left at whatever the last measurement set (Taffy asks for min-content and
    /// max-content widths), so a layout of it without this would describe lines nobody drew.
    ///
    /// Fails for a paragraph this layout does not replicate (see [`Unsupported`]).
    pub(crate) fn lay_out(
        paragraph: &Gd<TextParagraph>,
        content_width: f32,
    ) -> Result<Self, TextLayoutError> {
        let server = TextServerManager::singleton()
            .get_primary_interface()
            .ok_or(TextLayoutError::NoTextServer)?;
        let mut paragraph = paragraph.clone();
        if paragraph.get_orientation() != Orientation::HORIZONTAL {
            return Err(TextLayoutError::Unsupported(
                Unsupported::VerticalOrientation,
            ));
        }
        let dropcap = paragraph.get_dropcap_size();
        if dropcap != Vector2::ZERO {
            return Err(TextLayoutError::Unsupported(Unsupported::DropCap));
        }
        let alignment = alignment_of(&paragraph);
        paragraph.set_width(content_width);
        let stamp = Self::stamp_of(&paragraph, content_width, alignment)?;
        Ok(Self {
            paragraph,
            server,
            stamp,
            hangs: false,
        })
    }

    /// Measure each line without the white space it ends with, as a browser does for the text of an element: that space hangs
    /// past the line's edge, so a right or centre aligned line ends or is centred on its glyphs. The default is the server's
    /// width, which counts it and is what `TextParagraph::draw` aligns by; a caller that asks for this draws the text where the
    /// layout puts it (`StyledParagraph::draw`), not with `TextParagraph::draw`.
    pub(crate) fn hanging_spaces(mut self) -> Self {
        self.hangs = true;
        self
    }

    /// What of `paragraph` a layout is built from. A paragraph that hides lines (`max_lines_visible`) is laid out as the lines
    /// it shows, which end where the last of them does.
    fn stamp_of(
        paragraph: &Gd<TextParagraph>,
        width: f32,
        alignment: TextAlignment,
    ) -> Result<Stamp, TextLayoutError> {
        let line_count = line_count_of(paragraph)?;
        let max_lines = paragraph.get_max_lines_visible();
        let visible_lines =
            usize::try_from(max_lines).map_or(line_count, |max| max.min(line_count));
        let text_len = text_len_of(paragraph)?;
        let visible_end = match visible_lines.checked_sub(1) {
            Some(last) if visible_lines < line_count => {
                let range = paragraph.get_line_range(paragraph_line(last)?);
                usize::try_from(range.y).map_err(|_| {
                    TextLayoutError::MalformedServerData(ServerDataProblem::LineRanges)
                })?
            }
            _ => text_len,
        };
        Ok(Stamp {
            width,
            alignment,
            line_spacing: paragraph.get_line_spacing(),
            text_len,
            line_count,
            visible_lines,
            visible_end,
        })
    }

    /// Fails if the paragraph is no longer the one the layout was built from.
    fn ensure_unchanged(&self) -> Result<(), TextLayoutError> {
        let now = Self::stamp_of(
            &self.paragraph,
            self.paragraph.get_width(),
            alignment_of(&self.paragraph),
        )?;
        if now == self.stamp {
            Ok(())
        } else {
            Err(TextLayoutError::Stale {
                built_for: self.stamp.text_len,
                now: now.text_len,
            })
        }
    }

    /// The server's shaped text of a line.
    fn line_rid(&self, line: usize) -> Result<Rid, TextLayoutError> {
        self.ensure_unchanged()?;
        if line >= self.stamp.visible_lines {
            return Err(TextLayoutError::LineOutOfRange {
                line,
                count: self.stamp.visible_lines,
            });
        }
        Ok(self.paragraph.get_line_rid(paragraph_line(line)?))
    }

    /// Whether the last glyph of the line is a mandatory break (`GRAPHEME_IS_BREAK_HARD`).
    fn line_ends_with_hard_break(
        &self,
        rid: Rid,
        line_end: usize,
    ) -> Result<bool, TextLayoutError> {
        let problem = TextLayoutError::MalformedServerData(ServerDataProblem::Glyphs);
        let hard_break = i64::try_from(GraphemeFlag::BREAK_HARD.ord()).map_err(|_| problem)?;
        for glyph in self.server.shaped_text_get_glyphs(rid).iter_shared() {
            let end = dictionary_int(&glyph, "end").ok_or(problem)?;
            let count = dictionary_int(&glyph, "count").ok_or(problem)?;
            let flags = dictionary_int(&glyph, "flags").ok_or(problem)?;
            // A cluster's first glyph has the count; the rest of its glyphs have 0.
            if count > 0 && end == to_index(line_end) && flags & hard_break != 0 {
                return Ok(true);
            }
        }
        Ok(false)
    }
}

impl ParagraphSource for GodotParagraph {
    fn facts(&self) -> Result<ParagraphFacts, TextLayoutError> {
        self.ensure_unchanged()?;
        let mut lines = Vec::with_capacity(self.stamp.visible_lines);
        for line in 0..self.stamp.visible_lines {
            let index = paragraph_line(line)?;
            let range = self.paragraph.get_line_range(index);
            let rid = self.paragraph.get_line_rid(index);
            let (Ok(start), Ok(end)) = (usize::try_from(range.x), usize::try_from(range.y)) else {
                return Err(TextLayoutError::MalformedServerData(
                    ServerDataProblem::LineRanges,
                ));
            };
            let direction = self.server.shaped_text_get_inferred_direction(rid);
            lines.push(LineFacts {
                start,
                end,
                ascent: self.paragraph.get_line_ascent(index),
                descent: self.paragraph.get_line_descent(index),
                width: if self.hangs {
                    visible_line_width(&self.server, rid)?
                } else {
                    self.paragraph.get_line_width(index)
                },
                // The inferred direction of a shaped text is never AUTO.
                direction: if direction == Direction::RTL {
                    TextDirection::Rtl
                } else {
                    TextDirection::Ltr
                },
            });
        }
        let ends_with_hard_break = match lines.last() {
            Some(last) => {
                let rid = self
                    .paragraph
                    .get_line_rid(paragraph_line(lines.len() - 1)?);
                self.line_ends_with_hard_break(rid, last.end)?
            }
            None => false,
        };
        Ok(ParagraphFacts {
            width: self.stamp.width,
            alignment: self.stamp.alignment,
            line_spacing: self.stamp.line_spacing,
            text_len: self.stamp.visible_end,
            lines,
            ends_with_hard_break,
        })
    }

    fn character_breaks(&self) -> Result<Vec<usize>, TextLayoutError> {
        self.ensure_unchanged()?;
        let breaks = self
            .server
            .shaped_text_get_character_breaks(self.paragraph.get_rid());
        breaks
            .as_slice()
            .iter()
            .map(|offset| {
                usize::try_from(*offset).map_err(|_| {
                    TextLayoutError::MalformedServerData(ServerDataProblem::GraphemeBreaks)
                })
            })
            .take_while(|offset| {
                offset
                    .as_ref()
                    .map_or(true, |offset| *offset <= self.stamp.visible_end)
            })
            .collect()
    }

    fn word_breaks(&self) -> Result<Vec<usize>, TextLayoutError> {
        self.ensure_unchanged()?;
        let breaks = self
            .server
            .shaped_text_get_word_breaks(self.paragraph.get_rid());
        // The pairs of words that end inside the lines the paragraph shows.
        let breaks: Result<Vec<usize>, TextLayoutError> = breaks
            .as_slice()
            .iter()
            .map(|offset| {
                usize::try_from(*offset).map_err(|_| {
                    TextLayoutError::MalformedServerData(ServerDataProblem::WordBreaks)
                })
            })
            .collect();
        let breaks = breaks?;
        let (pairs, _) = breaks.as_chunks::<2>();
        Ok(pairs
            .iter()
            .take_while(|[_, end]| *end <= self.stamp.visible_end)
            .flatten()
            .copied()
            .collect())
    }

    fn carets(&self, line: usize, offset: usize) -> Result<ServerCarets, TextLayoutError> {
        let rid = self.line_rid(line)?;
        let carets = self.server.shaped_text_get_carets(rid, to_index(offset));
        Ok(ServerCarets {
            leading: caret_of(&carets, "leading_rect", "leading_direction")?,
            trailing: caret_of(&carets, "trailing_rect", "trailing_direction")?,
        })
    }

    fn selection(
        &self,
        line: usize,
        start: usize,
        end: usize,
    ) -> Result<Vec<(f32, f32)>, TextLayoutError> {
        let rid = self.line_rid(line)?;
        let runs = self
            .server
            .shaped_text_get_selection(rid, to_index(start), to_index(end));
        Ok(runs.as_slice().iter().map(|run| (run.x, run.y)).collect())
    }

    fn hit_test_position(&self, line: usize, x: f32) -> Result<Option<usize>, TextLayoutError> {
        let rid = self.line_rid(line)?;
        let position = self.server.shaped_text_hit_test_position(rid, f64::from(x));
        Ok(usize::try_from(position).ok())
    }
}

/// The width of a shaped line's glyphs without the white space it ends with: what a browser measures and aligns. A line's
/// `shaped_text_get_width` counts that space and is rounded up to a whole pixel, so the advances are added up instead; a line cut
/// short by an ellipsis or a trim has the server's width.
fn visible_line_width(server: &Gd<TextServer>, line: Rid) -> Result<f32, TextLayoutError> {
    let problem = TextLayoutError::MalformedServerData(ServerDataProblem::Glyphs);
    let space = i64::try_from(GraphemeFlag::SPACE.ord()).map_err(|_| problem)?;
    let mut advances = Vec::new();
    for glyph in server.shaped_text_get_glyphs(line).iter_shared() {
        let flags = dictionary_int(&glyph, "flags").ok_or(problem)?;
        let repeat = dictionary_int(&glyph, "repeat").ok_or(problem)?;
        let advance = glyph
            .get("advance")
            .and_then(|value| value.try_to::<f32>().ok())
            .ok_or(problem)?;
        advances.push((flags & space != 0, advance * repeat as f32));
    }
    let hanging: f32 = advances
        .iter()
        .rev()
        .take_while(|(is_space, _)| *is_space)
        .map(|(_, advance)| advance)
        .sum();
    if server.shaped_text_get_trim_pos(line) >= 0 || server.shaped_text_get_ellipsis_pos(line) >= 0
    {
        return Ok(server.shaped_text_get_width(line) as f32 - hanging);
    }
    let total: f32 = advances.iter().map(|(_, advance)| advance).sum();
    Ok((total - hanging).max(0.0))
}

fn alignment_of(paragraph: &Gd<TextParagraph>) -> TextAlignment {
    let alignment = paragraph.get_alignment();
    if alignment == HorizontalAlignment::LEFT {
        TextAlignment::Left
    } else if alignment == HorizontalAlignment::CENTER {
        TextAlignment::Center
    } else if alignment == HorizontalAlignment::RIGHT {
        TextAlignment::Right
    } else {
        TextAlignment::Fill
    }
}

fn text_len_of(paragraph: &Gd<TextParagraph>) -> Result<usize, TextLayoutError> {
    usize::try_from(paragraph.get_range().y)
        .map_err(|_| TextLayoutError::MalformedServerData(ServerDataProblem::LineRanges))
}

fn line_count_of(paragraph: &Gd<TextParagraph>) -> Result<usize, TextLayoutError> {
    usize::try_from(paragraph.get_line_count())
        .map_err(|_| TextLayoutError::MalformedServerData(ServerDataProblem::LineRanges))
}

/// A line index as the 32-bit `int` `TextParagraph`'s line methods take.
fn paragraph_line(line: usize) -> Result<i32, TextLayoutError> {
    i32::try_from(line).map_err(|_| TextLayoutError::LineOutOfRange {
        line,
        count: i32::MAX as usize,
    })
}

/// An offset as the 64-bit `int` `TextServer`'s methods take.
fn to_index(value: usize) -> i64 {
    i64::try_from(value).expect("an index into text fits in 63 bits")
}

fn dictionary_int(dictionary: &VarDictionary, key: &str) -> Option<i64> {
    dictionary.get(key)?.try_to::<i64>().ok()
}

/// One of the two carets of a `shaped_text_get_carets` dictionary. An empty `Rect2` is no caret.
fn caret_of(
    carets: &VarDictionary,
    rect_key: &str,
    direction_key: &str,
) -> Result<Option<ServerCaret>, TextLayoutError> {
    let problem = TextLayoutError::MalformedServerData(ServerDataProblem::Carets);
    let rect = carets
        .get(rect_key)
        .and_then(|value| value.try_to::<Rect2>().ok())
        .ok_or(problem)?;
    if rect == Rect2::default() {
        return Ok(None);
    }
    let direction = dictionary_int(carets, direction_key).ok_or(problem)?;
    let direction = if direction == i64::from(Direction::AUTO.ord()) {
        None
    } else if direction == i64::from(Direction::LTR.ord()) {
        Some(TextDirection::Ltr)
    } else if direction == i64::from(Direction::RTL.ord()) {
        Some(TextDirection::Rtl)
    } else {
        return Err(problem);
    };
    Ok(Some(ServerCaret {
        // The rectangle's position is the caret's place whichever way its width points.
        x: rect.position.x,
        top: rect.position.y,
        height: rect.size.y,
        direction,
    }))
}
