//! The real [`ParagraphSource`]: a `TextParagraph` and the primary `TextServer`. Every method is one or a
//! few server calls; the geometry built on them is in `text_layout.rs`.

use std::borrow::Cow;
use std::rc::Rc;

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

/// The keys of a glyph's dictionary, made once for the glyphs of a paragraph: a lookup by a string literal makes a `Variant` for it every
/// time, and a line has a dictionary per glyph.
#[derive(Debug)]
struct GlyphKeys {
    start: Variant,
    end: Variant,
    count: Variant,
    flags: Variant,
    repeat: Variant,
    advance: Variant,
    offset: Variant,
    font_rid: Variant,
    font_size: Variant,
    index: Variant,
}

impl GlyphKeys {
    fn new() -> Self {
        Self {
            start: "start".to_variant(),
            end: "end".to_variant(),
            count: "count".to_variant(),
            flags: "flags".to_variant(),
            repeat: "repeat".to_variant(),
            advance: "advance".to_variant(),
            offset: "offset".to_variant(),
            font_rid: "font_rid".to_variant(),
            font_size: "font_size".to_variant(),
            index: "index".to_variant(),
        }
    }
}

/// A field of a glyph's dictionary. Every lookup is a call into the engine and a conversion (`Dictionary::get` makes two calls, and
/// `get_or_nil` one), which for a line of a hundred glyphs is what reading it costs.
fn field<T: FromGodot>(dictionary: &VarDictionary, key: &Variant) -> Option<T> {
    dictionary.get_or_nil(key).try_to::<T>().ok()
}

/// A glyph of a shaped line (`TextServer::shaped_text_get_glyphs`): what drawing it needs.
#[derive(Clone, Copy, Debug)]
pub(crate) struct ShapedGlyph {
    /// Where the glyph's cluster starts in the paragraph's text.
    pub(crate) start: i64,
    pub(crate) repeat: i64,
    pub(crate) advance: f32,
    pub(crate) offset: Vector2,
    /// The font that has the glyph; empty when no font has the character, which the server then draws as a hex box (see
    /// [`ShapedLine::hex_codes`]). `index` is the code point in that case.
    pub(crate) font: Rid,
    pub(crate) size: i64,
    pub(crate) index: i64,
    /// `Glyph::flags`: the `GraphemeFlag` bits.
    pub(crate) flags: i64,
}

impl ShapedGlyph {
    fn of(dictionary: &VarDictionary, keys: &GlyphKeys) -> Option<Self> {
        Some(Self {
            start: field(dictionary, &keys.start)?,
            repeat: field(dictionary, &keys.repeat)?,
            advance: field(dictionary, &keys.advance)?,
            offset: field(dictionary, &keys.offset)?,
            font: field(dictionary, &keys.font_rid)?,
            size: field(dictionary, &keys.font_size)?,
            index: field(dictionary, &keys.index)?,
            flags: field(dictionary, &keys.flags)?,
        })
    }

    /// Whether the glyph has `flag` (`GRAPHEME_IS_*`) set.
    fn has(&self, flag: GraphemeFlag) -> bool {
        let bits = i64::try_from(flag.ord()).expect("a grapheme flag is a small bit of an int");
        self.flags & bits != 0
    }

    /// A glyph that is not part of the source text, which justification added (`GRAPHEME_IS_VIRTUAL`).
    pub(crate) fn is_virtual(&self) -> bool {
        self.has(GraphemeFlag::VIRTUAL)
    }

    /// The place of an inline object, which its owner draws (`GRAPHEME_IS_EMBEDDED_OBJECT`).
    pub(crate) fn is_embedded_object(&self) -> bool {
        self.has(GraphemeFlag::EMBEDDED_OBJECT)
    }
}

/// The glyphs of the shaped text `shaped`, as the text server has them (`shaped_text_get_glyphs`).
pub(crate) fn read_glyphs(
    server: &Gd<TextServer>,
    shaped: Rid,
) -> Result<Vec<ShapedGlyph>, TextLayoutError> {
    let keys = GlyphKeys::new();
    server
        .shaped_text_get_glyphs(shaped)
        .iter_shared()
        .map(|dictionary| ShapedGlyph::of(&dictionary, &keys))
        .collect::<Option<Vec<_>>>()
        .ok_or(TextLayoutError::MalformedServerData(
            ServerDataProblem::Glyphs,
        ))
}

/// What the text server says of one shaped line that painting and the facts of a layout read: its glyphs, the glyphs of the ellipsis that
/// ends it, where it is cut, and what the facts need of the glyphs' flags. A server call makes a dictionary of every glyph and reading
/// one costs a call into the engine for each field, so a line is read once, and what is kept of it is small: the dictionaries are let go
/// when the line has been read.
#[derive(Clone, Debug)]
pub(crate) struct ShapedLine {
    pub(crate) glyphs: Vec<ShapedGlyph>,
    /// The glyphs of the ellipsis, when the line ends in one (`ellipsis_at` is not negative).
    pub(crate) ellipsis: Vec<ShapedGlyph>,
    /// The line is drawn from its right end (`shaped_text_get_direction`; the inferred direction is in the facts).
    pub(crate) draws_right_to_left: bool,
    /// The glyph the ellipsis follows and the glyph the line is cut at, or -1.
    pub(crate) ellipsis_at: i64,
    pub(crate) trim_at: i64,
    /// Whether the server draws a hex box for a glyph that no font has: `shaped_text_get_preserve_control` or
    /// `shaped_text_get_preserve_invalid` of the line (`TextServer::shaped_text_draw`'s `hex_codes`). Only a line with such a glyph
    /// asks the server.
    pub(crate) hex_codes: bool,
    /// `shaped_text_get_width`: the glyphs' width, rounded up.
    pub(crate) width: f64,
    /// The advance of the white space the line ends with.
    hanging: f32,
    /// Whether the last glyph of the line is a mandatory break (`GRAPHEME_IS_BREAK_HARD`).
    ends_with_hard_break: bool,
}

impl ShapedLine {
    /// Read the shaped text `line`, which ends at `line_end` in its paragraph.
    fn read(
        server: &Gd<TextServer>,
        line: Rid,
        line_end: usize,
        keys: &GlyphKeys,
    ) -> Result<Self, TextLayoutError> {
        let problem = TextLayoutError::MalformedServerData(ServerDataProblem::Glyphs);
        let space = i64::try_from(GraphemeFlag::SPACE.ord()).map_err(|_| problem)?;
        let hard_break = i64::try_from(GraphemeFlag::BREAK_HARD.ord()).map_err(|_| problem)?;
        let end = i64::try_from(line_end).map_err(|_| problem)?;
        let ellipsis_at = server.shaped_text_get_ellipsis_pos(line);
        let raw = server.shaped_text_get_glyphs(line);
        let mut glyphs = Vec::with_capacity(raw.len());
        // A cluster's first glyph has the count; the rest of its glyphs have 0.
        let mut ends_with_hard_break = false;
        for dictionary in raw.iter_shared() {
            glyphs.push(ShapedGlyph::of(&dictionary, keys).ok_or(problem)?);
            if !ends_with_hard_break
                && field::<i64>(&dictionary, &keys.end).ok_or(problem)? == end
                && field::<i64>(&dictionary, &keys.count).ok_or(problem)? > 0
                && field::<i64>(&dictionary, &keys.flags).ok_or(problem)? & hard_break != 0
            {
                ends_with_hard_break = true;
            }
        }
        // The white space the line ends with: only the glyphs from the end are asked what they are.
        let mut hanging = 0.0_f32;
        for (index, glyph) in glyphs.iter().enumerate().rev() {
            let dictionary = raw.get(index).ok_or(problem)?;
            if field::<i64>(&dictionary, &keys.flags).ok_or(problem)? & space == 0 {
                break;
            }
            hanging += glyph.advance * glyph.repeat as f32;
        }
        let hex_codes = glyphs.iter().any(|glyph| glyph.font == Rid::Invalid)
            && (server.shaped_text_get_preserve_control(line)
                || server.shaped_text_get_preserve_invalid(line));
        let ellipsis = if ellipsis_at >= 0 {
            server
                .shaped_text_get_ellipsis_glyphs(line)
                .iter_shared()
                .map(|dictionary| ShapedGlyph::of(&dictionary, keys))
                .collect::<Option<Vec<_>>>()
                .ok_or(problem)?
        } else {
            Vec::new()
        };
        Ok(Self {
            glyphs,
            ellipsis,
            draws_right_to_left: server.shaped_text_get_direction(line) == Direction::RTL,
            ellipsis_at,
            trim_at: server.shaped_text_get_trim_pos(line),
            hex_codes,
            width: server.shaped_text_get_width(line),
            hanging,
            ends_with_hard_break,
        })
    }

    /// A line of the given glyphs that reads nothing from a server, for tests.
    #[cfg(test)]
    pub(crate) fn for_test(glyphs: Vec<ShapedGlyph>) -> Self {
        Self {
            glyphs,
            ellipsis: Vec::new(),
            draws_right_to_left: false,
            ellipsis_at: -1,
            trim_at: -1,
            hex_codes: false,
            width: 0.0,
            hanging: 0.0,
            ends_with_hard_break: false,
        }
    }

    /// The width of the glyphs without the white space the line ends with: what a browser measures and aligns. A line's
    /// `shaped_text_get_width` counts that space and is rounded up to a whole pixel, so the advances are added up instead; a line cut
    /// short by an ellipsis or a trim has the server's width.
    fn visible_width(&self) -> f32 {
        if self.trim_at >= 0 || self.ellipsis_at >= 0 {
            return self.width as f32 - self.hanging;
        }
        let total: f32 = self
            .glyphs
            .iter()
            .map(|glyph| glyph.advance * glyph.repeat as f32)
            .sum();
        (total - self.hanging).max(0.0)
    }
}

/// A paragraph at a width, read from the text server once: the lines' glyphs and the facts a layout of it is built from. Painting a
/// line of a shaped paragraph (`StyledParagraph::draw`) reads glyphs three times when the layout is asked, and every read makes a
/// dictionary for every glyph; this is what it reads instead, and it is right until the paragraph is shaped again.
pub(crate) struct ShapedParagraph {
    pub(crate) facts: ParagraphFacts,
    /// The lines the paragraph shows, in order.
    pub(crate) lines: Vec<ShapedLine>,
    stamp: Stamp,
}

impl ShapedParagraph {
    /// Whether `paragraph`, `content_width` wide, is the paragraph this was read from: the same text, lines and spacing at the same width.
    /// A paragraph is shaped again only when its text or its width change, and either shows in the stamp.
    pub(crate) fn is_of(
        &self,
        paragraph: &Gd<TextParagraph>,
        content_width: f32,
    ) -> Result<bool, TextLayoutError> {
        let mut paragraph = paragraph.clone();
        paragraph.set_width(content_width);
        let now = GodotParagraph::stamp_of(&paragraph, content_width, alignment_of(&paragraph))?;
        Ok(now == self.stamp)
    }
}

/// A `TextParagraph` read through the primary text server.
pub(crate) struct GodotParagraph {
    paragraph: Gd<TextParagraph>,
    server: Gd<TextServer>,
    stamp: Stamp,
    /// Whether the white space a line ends with hangs past it and is left out of the line's width (see
    /// [`GodotParagraph::hanging_spaces`]).
    hangs: bool,
    /// The lines' glyphs and facts, read before (see [`ShapedParagraph`]); with them `facts` asks the server for nothing.
    shaped: Option<Rc<ShapedParagraph>>,
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
            shaped: None,
        })
    }

    /// Lay `paragraph` out `content_width` wide and read every line it shows, once: the glyphs of each, and the facts of the layout
    /// built from them, with the white space a line ends with hanging. What painting needs of a shaped paragraph is in the result, which
    /// stays right for as long as the paragraph is not shaped again ([`ShapedParagraph::is_of`]).
    pub(crate) fn shape(
        paragraph: &Gd<TextParagraph>,
        content_width: f32,
    ) -> Result<ShapedParagraph, TextLayoutError> {
        let source = Self::lay_out(paragraph, content_width)?.hanging_spaces();
        let keys = GlyphKeys::new();
        let lines = (0..source.stamp.visible_lines)
            .map(|line| {
                let end = usize::try_from(source.paragraph.get_line_range(paragraph_line(line)?).y)
                    .map_err(|_| {
                        TextLayoutError::MalformedServerData(ServerDataProblem::LineRanges)
                    })?;
                ShapedLine::read(&source.server, source.line_rid(line)?, end, &keys)
            })
            .collect::<Result<Vec<_>, _>>()?;
        let facts = source.build_facts(&|line, _| Ok(Cow::Borrowed(&lines[line])))?;
        Ok(ShapedParagraph {
            facts,
            lines,
            stamp: source.stamp,
        })
    }

    /// Answer `facts` from what a [`ShapedParagraph`] of this paragraph at this width holds.
    pub(crate) fn with_shaped(mut self, shaped: Rc<ShapedParagraph>) -> Self {
        self.shaped = Some(shaped);
        self
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

    /// The lines' facts, with the glyphs of a line from `line` where they are needed: the width of each line when white space hangs
    /// (`ShapedLine::visible_width`), and the last line's end.
    fn build_facts<'a>(
        &self,
        line: &dyn Fn(usize, usize) -> Result<Cow<'a, ShapedLine>, TextLayoutError>,
    ) -> Result<ParagraphFacts, TextLayoutError> {
        let mut lines = Vec::with_capacity(self.stamp.visible_lines);
        for index in 0..self.stamp.visible_lines {
            let paragraph_index = paragraph_line(index)?;
            let range = self.paragraph.get_line_range(paragraph_index);
            let rid = self.paragraph.get_line_rid(paragraph_index);
            let (Ok(start), Ok(end)) = (usize::try_from(range.x), usize::try_from(range.y)) else {
                return Err(TextLayoutError::MalformedServerData(
                    ServerDataProblem::LineRanges,
                ));
            };
            let direction = self.server.shaped_text_get_inferred_direction(rid);
            lines.push(LineFacts {
                start,
                end,
                ascent: self.paragraph.get_line_ascent(paragraph_index),
                descent: self.paragraph.get_line_descent(paragraph_index),
                width: if self.hangs {
                    line(index, end)?.visible_width()
                } else {
                    self.paragraph.get_line_width(paragraph_index)
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
            Some(last) => line(lines.len() - 1, last.end)?.ends_with_hard_break,
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
}

impl ParagraphSource for GodotParagraph {
    fn facts(&self) -> Result<ParagraphFacts, TextLayoutError> {
        self.ensure_unchanged()?;
        if let Some(shaped) = &self.shaped {
            return Ok(shaped.facts.clone());
        }
        let keys = GlyphKeys::new();
        self.build_facts(&|index, end| {
            ShapedLine::read(&self.server, self.line_rid(index)?, end, &keys).map(Cow::Owned)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn glyph(advance: f32, repeat: i64) -> ShapedGlyph {
        ShapedGlyph {
            start: 0,
            repeat,
            advance,
            offset: Vector2::ZERO,
            font: Rid::new(1),
            size: 12,
            index: 1,
            flags: 0,
        }
    }

    fn line(glyphs: Vec<ShapedGlyph>, hanging: f32) -> ShapedLine {
        ShapedLine {
            hanging,
            width: 100.0,
            ..ShapedLine::for_test(glyphs)
        }
    }

    #[test]
    fn a_line_is_as_wide_as_its_advances_without_the_white_space_it_ends_with() {
        let glyphs = vec![glyph(7.5, 1), glyph(7.5, 2), glyph(4.0, 1)];
        assert_eq!(line(glyphs.clone(), 0.0).visible_width(), 26.5);
        assert_eq!(line(glyphs.clone(), 4.0).visible_width(), 22.5);
        assert_eq!(
            line(glyphs, 40.0).visible_width(),
            0.0,
            "never less than nothing"
        );
    }

    #[test]
    fn a_line_cut_by_a_trim_or_an_ellipsis_has_the_servers_width() {
        let glyphs = vec![glyph(7.5, 1), glyph(7.5, 1)];
        for (trim_at, ellipsis_at) in [(1, -1), (-1, 1)] {
            let cut = ShapedLine {
                trim_at,
                ellipsis_at,
                ..line(glyphs.clone(), 4.0)
            };
            assert_eq!(cut.visible_width(), 96.0);
        }
    }
}
