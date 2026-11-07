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

/// A glyph of a shaped line, as `TextServer::shaped_text_get_glyphs` describes it.
#[derive(Clone, Copy, Debug)]
pub(crate) struct ShapedGlyph {
    /// Where the glyph's cluster starts and ends in the paragraph's text.
    pub(crate) start: i64,
    pub(crate) end: i64,
    /// How many characters the cluster has, on the first glyph of the cluster; the others have 0.
    pub(crate) count: i64,
    pub(crate) flags: i64,
    pub(crate) repeat: i64,
    pub(crate) advance: f32,
    pub(crate) offset: Vector2,
    pub(crate) font: Rid,
    pub(crate) size: i64,
    pub(crate) index: i64,
}

impl ShapedGlyph {
    fn of(dictionary: &VarDictionary, keys: &GlyphKeys) -> Option<Self> {
        let integer = |key: &Variant| dictionary.get(key)?.try_to::<i64>().ok();
        Some(Self {
            start: integer(&keys.start)?,
            end: integer(&keys.end)?,
            count: integer(&keys.count)?,
            flags: integer(&keys.flags)?,
            repeat: integer(&keys.repeat)?,
            advance: dictionary.get(&keys.advance)?.try_to::<f32>().ok()?,
            offset: dictionary.get(&keys.offset)?.try_to::<Vector2>().ok()?,
            font: dictionary.get(&keys.font_rid)?.try_to::<Rid>().ok()?,
            size: integer(&keys.font_size)?,
            index: integer(&keys.index)?,
        })
    }
}

/// What the text server says of one shaped line that painting and the facts of a layout read: its glyphs, the glyphs of the ellipsis that
/// ends it, and where it is cut. A server call makes a dictionary of every glyph, so a line is read once.
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
    /// `shaped_text_get_width`: the glyphs' width, rounded up.
    pub(crate) width: f64,
}

impl ShapedLine {
    fn read(server: &Gd<TextServer>, line: Rid, keys: &GlyphKeys) -> Result<Self, TextLayoutError> {
        let problem = TextLayoutError::MalformedServerData(ServerDataProblem::Glyphs);
        let read = |glyphs: Array<VarDictionary>| {
            glyphs
                .iter_shared()
                .map(|dictionary| ShapedGlyph::of(&dictionary, keys))
                .collect::<Option<Vec<_>>>()
                .ok_or(problem)
        };
        let ellipsis_at = server.shaped_text_get_ellipsis_pos(line);
        Ok(Self {
            glyphs: read(server.shaped_text_get_glyphs(line))?,
            ellipsis: if ellipsis_at >= 0 {
                read(server.shaped_text_get_ellipsis_glyphs(line))?
            } else {
                Vec::new()
            },
            draws_right_to_left: server.shaped_text_get_direction(line) == Direction::RTL,
            ellipsis_at,
            trim_at: server.shaped_text_get_trim_pos(line),
            width: server.shaped_text_get_width(line),
        })
    }

    /// The width of the glyphs without the white space the line ends with: what a browser measures and aligns. A line's
    /// `shaped_text_get_width` counts that space and is rounded up to a whole pixel, so the advances are added up instead; a line cut
    /// short by an ellipsis or a trim has the server's width.
    fn visible_width(&self) -> Result<f32, TextLayoutError> {
        let problem = TextLayoutError::MalformedServerData(ServerDataProblem::Glyphs);
        let space = i64::try_from(GraphemeFlag::SPACE.ord()).map_err(|_| problem)?;
        let advances: Vec<(bool, f32)> = self
            .glyphs
            .iter()
            .map(|glyph| {
                (
                    glyph.flags & space != 0,
                    glyph.advance * glyph.repeat as f32,
                )
            })
            .collect();
        let hanging: f32 = advances
            .iter()
            .rev()
            .take_while(|(is_space, _)| *is_space)
            .map(|(_, advance)| advance)
            .sum();
        if self.trim_at >= 0 || self.ellipsis_at >= 0 {
            return Ok(self.width as f32 - hanging);
        }
        let total: f32 = advances.iter().map(|(_, advance)| advance).sum();
        Ok((total - hanging).max(0.0))
    }

    /// Whether the last glyph of the line is a mandatory break (`GRAPHEME_IS_BREAK_HARD`), the line ending at `line_end`.
    fn ends_with_hard_break(&self, line_end: usize) -> Result<bool, TextLayoutError> {
        let problem = TextLayoutError::MalformedServerData(ServerDataProblem::Glyphs);
        let hard_break = i64::try_from(GraphemeFlag::BREAK_HARD.ord()).map_err(|_| problem)?;
        let end = i64::try_from(line_end).map_err(|_| problem)?;
        // A cluster's first glyph has the count; the rest of its glyphs have 0.
        Ok(self
            .glyphs
            .iter()
            .any(|glyph| glyph.count > 0 && glyph.end == end && glyph.flags & hard_break != 0))
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
            .map(|line| ShapedLine::read(&source.server, source.line_rid(line)?, &keys))
            .collect::<Result<Vec<_>, _>>()?;
        let facts = source.build_facts(&|line| Ok(Cow::Borrowed(&lines[line])))?;
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
        line: &dyn Fn(usize) -> Result<Cow<'a, ShapedLine>, TextLayoutError>,
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
                    line(index)?.visible_width()?
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
            Some(last) => line(lines.len() - 1)?.ends_with_hard_break(last.end)?,
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
        self.build_facts(&|index| {
            ShapedLine::read(&self.server, self.line_rid(index)?, &keys).map(Cow::Owned)
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
