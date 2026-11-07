//! Fonts, sizes and layouts of a text input: how big it measures, what it draws, and the
//! [`GodotTextLayout`]s that answer where the caret, the pointer and the edit buffer's moves land.

use std::ops::Range;

use godot::classes::text_server::LineBreakFlag;
use godot::classes::{Font, TextParagraph, TextServerManager};
use godot::global::HorizontalAlignment;
use godot::prelude::*;

use super::{
    SECURE_TEXT_BULLET, Shaped, TEXT_AREA_DEFAULT_ROWS, TEXT_INPUT_DEFAULT_COLUMNS, TextInputError,
    TextInputState,
};
use crate::events::{CompositionData, EventPayload};
use crate::mount::Edges;
use crate::props::{Kind, PropsSpec, TextAlignSpec};
use crate::scroll::{ScrollRange, ScrollRanges};
use crate::text_input::{CompositionEvent, is_line_break};
use crate::text_layout::{
    GodotParagraph, GodotTextLayout, LineExtents, TextDirection, TextLayout, TextLayoutError,
};
use crate::{DEFAULT_FONT_SIZE, ReactUiRoot};

/// What a font measures at one size.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Metrics {
    pub(crate) font_size: i32,
    pub(crate) ascent: f32,
    pub(crate) descent: f32,
    /// The advance of `0`: a column of a text input's default width.
    pub(crate) zero_advance: f32,
}

impl Metrics {
    pub(crate) fn of(font: &Gd<Font>, font_size: i32) -> Self {
        Self {
            font_size,
            ascent: font.get_ascent_ex().font_size(font_size).done(),
            descent: font.get_descent_ex().font_size(font_size).done(),
            zero_advance: font.get_char_size('0' as u32, font_size).x,
        }
    }

    pub(crate) fn line_height(&self) -> f32 {
        self.ascent + self.descent
    }

    /// What an empty line measures: a paragraph with no text has no font to take metrics from.
    pub(crate) fn empty_line(&self) -> LineExtents {
        LineExtents {
            ascent: self.ascent,
            descent: self.descent,
        }
    }

    /// The content size of a text input: [`TEXT_INPUT_DEFAULT_COLUMNS`] columns wide and one line
    /// (or `rows` lines) tall. Never a function of the value, so typing does not lay out.
    pub(crate) fn intrinsic_size(&self, multiline: bool, rows: Option<u32>) -> Vector2 {
        let lines = if multiline {
            rows.unwrap_or(TEXT_AREA_DEFAULT_ROWS)
        } else {
            1
        };
        Vector2::new(
            TEXT_INPUT_DEFAULT_COLUMNS * self.zero_advance,
            lines as f32 * self.line_height(),
        )
    }
}

pub(crate) fn horizontal_alignment(align: Option<TextAlignSpec>) -> HorizontalAlignment {
    match align {
        Some(TextAlignSpec::Center) => HorizontalAlignment::CENTER,
        Some(TextAlignSpec::Right | TextAlignSpec::End) => HorizontalAlignment::RIGHT,
        // A line of a text input is never justified: it is one line, the last, which a justified paragraph leaves alone.
        Some(TextAlignSpec::Left | TextAlignSpec::Start | TextAlignSpec::Justify) | None => {
            HorizontalAlignment::LEFT
        }
    }
}

/// A shaped paragraph of `text`, which may be empty (an empty text still has a paragraph, which
/// [`GodotParagraph::lay_out`] and the layout need to place a caret in an empty field). A
/// single-line input never wraps; a multi-line one breaks as a `Text` node does.
pub(crate) fn shape(
    font: &Gd<Font>,
    text: &str,
    font_size: i32,
    multiline: bool,
) -> Gd<TextParagraph> {
    let mut paragraph = TextParagraph::new_gd();
    paragraph.set_break_flags(if multiline {
        LineBreakFlag::MANDATORY | LineBreakFlag::WORD_BOUND | LineBreakFlag::ADAPTIVE
    } else {
        LineBreakFlag::NONE
    });
    if !text.is_empty() {
        assert!(
            paragraph.add_string(text, font, font_size),
            "Godot rejected validated text/font"
        );
    }
    paragraph
}

/// The width an unwrapped paragraph is given: a width that is not positive means its lines are as wide
/// as they are.
pub(crate) const UNWRAPPED_WIDTH: f32 = -1.0;

/// Set a paragraph's width and alignment for drawing and for layout, and return the width. A
/// multi-line input wraps at the content width. A single-line input aligns its line within the
/// content width, except when the line is wider than that: `TextParagraph::draw` clips every line
/// to the paragraph's width (`text_paragraph.cpp`: `shaped_text_draw(..., clip_l, clip_l + l_width)`),
/// which would cut off a long line where the scrolled text still has to show, so such a line is
/// laid out unwrapped and starts at the left edge, as `LineEdit`'s does once it scrolls.
pub(crate) fn lay_out_paragraph(
    paragraph: &mut Gd<TextParagraph>,
    content_width: f32,
    multiline: bool,
    desired: HorizontalAlignment,
) -> f32 {
    paragraph.set_alignment(desired);
    if multiline {
        paragraph.set_width(content_width);
        return content_width;
    }
    paragraph.set_width(UNWRAPPED_WIDTH);
    if paragraph.get_size().x > content_width {
        return UNWRAPPED_WIDTH;
    }
    paragraph.set_width(content_width);
    content_width
}

/// The text an input draws: its buffer's text with the preedit spliced in at the caret, each code
/// of a secure input's text (not its preedit) shown as a bullet.
pub(crate) fn display_string(state: &TextInputState) -> String {
    let shown = state.buffer.display_text();
    if !state.buffer.config().secure {
        return shown.into_iter().collect();
    }
    let preedit = state.buffer.preedit_range().unwrap_or(0..0);
    shown
        .into_iter()
        .enumerate()
        .map(|(index, character)| {
            if preedit.contains(&index) {
                character
            } else {
                SECURE_TEXT_BULLET
            }
        })
        .collect()
}

/// The dominant direction of `range` of `paragraph`'s text, if it has one
/// (`TextServer::shaped_text_get_dominant_direction_in_range`).
pub(crate) fn dominant_direction(
    paragraph: &Gd<TextParagraph>,
    range: Range<usize>,
) -> Option<TextDirection> {
    use godot::classes::text_server::Direction;
    let server = TextServerManager::singleton().get_primary_interface()?;
    let direction = server.shaped_text_get_dominant_direction_in_range(
        paragraph.get_rid(),
        i64::try_from(range.start).ok()?,
        i64::try_from(range.end).ok()?,
    );
    match direction {
        Direction::LTR => Some(TextDirection::Ltr),
        Direction::RTL => Some(TextDirection::Rtl),
        _ => None,
    }
}

/// The scroll ranges of a text input from its text: how far past its padding box the text (and the
/// caret at its end) reaches. A single-line input scrolls horizontally, a multi-line one vertically
/// (it wraps). `None` while the input has not been shaped.
pub(crate) fn scroll_ranges(
    state: &TextInputState,
    align: Option<TextAlignSpec>,
    size: Vector2,
    border: Edges,
    padding: Edges,
) -> ScrollRanges {
    let Some(shaped) = &state.shaped else {
        return ScrollRanges::default();
    };
    let multiline = state.buffer.config().multiline;
    let content_width =
        (size.x - border.left - border.right - padding.left - padding.right).max(0.0);
    let client = Vector2::new(
        (size.x - border.left - border.right).max(0.0),
        (size.y - border.top - border.bottom).max(0.0),
    );
    let mut paragraph = shaped.display.clone();
    lay_out_paragraph(
        &mut paragraph,
        content_width,
        multiline,
        horizontal_alignment(align),
    );
    let text = paragraph.get_size();
    if multiline {
        // The last line's bottom, then the bottom padding. A text that ends in a line break has one more line
        // for its caret to stand on, which the paragraph does not shape (`TextLayout` adds it, with the last
        // line's height): it is part of the reach, or the caret on it would scroll out of view and the wheel
        // could not bring it back.
        let after_final_break = !state.buffer.config().secure
            && state.buffer.display_last_char().is_some_and(is_line_break);
        let last_line = paragraph.get_line_count() - 1;
        let extra = if after_final_break && last_line >= 0 {
            paragraph.get_line_ascent(last_line)
                + paragraph.get_line_descent(last_line)
                + paragraph.get_line_spacing()
        } else {
            0.0
        };
        let end = padding.top + text.y + extra + padding.bottom;
        ScrollRanges {
            y: ScrollRange::new((end - client.y).max(0.0), false),
            ..ScrollRanges::default()
        }
    } else {
        // The caret at the end of the line sits one caret width past it.
        let end = padding.left + text.x + super::CARET_WIDTH_PX + padding.right;
        ScrollRanges {
            x: ScrollRange::new((end - client.x).max(0.0), false),
            ..ScrollRanges::default()
        }
    }
}

/// What shaping a text input needs from its node, copied out so no borrow of the mounted tree is
/// held while the layout is built.
pub(crate) struct InputFrame {
    pub(crate) metrics: Metrics,
    pub(crate) align: HorizontalAlignment,
    pub(crate) multiline: bool,
    pub(crate) content_width: f32,
    pub(crate) content_height: f32,
    /// Where the paragraph is drawn, in the node's box coordinates: the content box's corner, with a
    /// single-line input's line centred in its height.
    pub(crate) origin: Vector2,
}

impl InputFrame {
    /// The frame of a text input of the given geometry.
    pub(crate) fn new(
        metrics: Metrics,
        align: Option<TextAlignSpec>,
        multiline: bool,
        size: Vector2,
        border: Edges,
        padding: Edges,
    ) -> Self {
        let content_width =
            (size.x - border.left - border.right - padding.left - padding.right).max(0.0);
        let content_height =
            (size.y - border.top - border.bottom - padding.top - padding.bottom).max(0.0);
        let centring = if multiline {
            0.0
        } else {
            ((content_height - metrics.line_height()) / 2.0).max(0.0)
        };
        Self {
            metrics,
            align: horizontal_alignment(align),
            multiline,
            content_width,
            content_height,
            origin: Vector2::new(
                border.left + padding.left,
                border.top + padding.top + centring,
            ),
        }
    }

    /// Set `paragraph` up as it is drawn in this frame (its width and alignment). Returns the width.
    pub(crate) fn prepare(&self, paragraph: &mut Gd<TextParagraph>) -> f32 {
        lay_out_paragraph(paragraph, self.content_width, self.multiline, self.align)
    }

    /// A layout of `paragraph` as it is drawn in this frame.
    pub(crate) fn layout(
        &self,
        paragraph: &Gd<TextParagraph>,
    ) -> Result<GodotTextLayout, TextLayoutError> {
        let mut paragraph = paragraph.clone();
        let width = self.prepare(&mut paragraph);
        let source = GodotParagraph::lay_out(&paragraph, width)?;
        TextLayout::new(source, self.origin, self.metrics.empty_line())
    }
}

impl ReactUiRoot {
    /// The frame of the text input `tag`, or `None` when it is not one or has no font to measure.
    pub(crate) fn input_frame(&self, tag: u32) -> Option<InputFrame> {
        let font = self.font.as_ref()?;
        let node = self.mounted.nodes.get(&tag)?;
        let state = node.text_input.as_ref()?;
        let font_size = node.computed.font_size.unwrap_or(DEFAULT_FONT_SIZE);
        Some(InputFrame::new(
            Metrics::of(font, font_size),
            node.computed.text_align,
            state.buffer.config().multiline,
            node.geometry.size,
            node.geometry.border,
            node.geometry.padding,
        ))
    }

    /// Shape the text input `tag` from its props and buffer (the whole of it: the display text, the
    /// placeholder) and tell layout its measured size. Returns whether anything was shaped.
    pub(crate) fn refresh_text_input(&mut self, tag: u32) -> bool {
        let Some(font) = self.font.clone() else {
            return false;
        };
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return false;
        };
        debug_assert_eq!(node.kind, Kind::TextInput);
        let font_size = node.computed.font_size.unwrap_or(DEFAULT_FONT_SIZE);
        let rows = node.props.rows;
        let placeholder = node
            .props
            .placeholder
            .clone()
            .filter(|text| !text.is_empty());
        let layout = node.layout;
        let Some(state) = node.text_input.as_mut() else {
            return false;
        };
        let multiline = state.buffer.config().multiline;
        let metrics = Metrics::of(&font, font_size);
        // What the field shows, for the characters no font has (`font_fallback.rs`).
        let shown = display_string(state);
        let noted: Vec<String> = std::iter::once(shown.clone())
            .chain(placeholder.clone())
            .collect();
        state.shaped = Some(Shaped {
            display: shape(&font, &shown, font_size, multiline),
            placeholder: placeholder.map(|text| shape(&font, &text, font_size, multiline)),
            font_size,
        });
        state.generation += 1;
        let intrinsic = metrics.intrinsic_size(multiline, rows);
        if state.intrinsic != Some(intrinsic) {
            state.intrinsic = Some(intrinsic);
            self.tree
                .set_node_context(layout, Some(crate::TextContext::Intrinsic(intrinsic)))
                .expect("a mounted node has a layout node");
            self.content_generation += 1;
        }
        self.layout_dirty.insert(tag);
        self.paint_dirty.insert(tag);
        // The text elements assistive technologies read were made from the old shaping.
        self.discard_text_accessibility(tag);
        self.forget_missing_glyphs(tag);
        for text in &noted {
            self.note_missing_glyphs(Some(tag), text, &font, font_size);
        }
        // A new font size or placeholder moves the caret.
        self.note_text_input_box_changed(tag);
        true
    }

    /// The box of text input `tag` (or what it is shaped with) changed: if it has the focus, its caret may have
    /// been left out of view, and is looked for once layout has settled.
    pub(crate) fn note_text_input_box_changed(&mut self, tag: u32) {
        if self.focused == Some(tag) && self.text_state(tag).is_some() {
            self.text_inputs.reveal_after_layout.insert(tag);
        }
    }

    /// A text input's props changed: bring its buffer's modes in line (`readOnly`, `secure`,
    /// `maxLength`; `multiline` cannot change and `defaultValue` is only the start). Returns whether
    /// the shaping must be redone (the placeholder, the secure bullets, the rows or a composition that
    /// ended changed).
    ///
    /// A composition cannot go on in a read-only input, so turning `readOnly` on ends it (`compositionend`
    /// is queued, and the platform's IME and keyboard close, as they do for any input that cannot be typed
    /// into).
    pub(crate) fn sync_text_input_props(&mut self, tag: u32, previous: &PropsSpec) -> bool {
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return false;
        };
        let Some(state) = node.text_input.as_mut() else {
            return false;
        };
        let props = &node.props;
        let secure = props.secure == Some(true);
        let secure_changed = secure != state.buffer.config().secure;
        let read_only = props.read_only == Some(true);
        let read_only_turned_on = read_only && !state.buffer.config().read_only;
        let composition = state.buffer.set_read_only(read_only);
        state.buffer.set_secure(secure);
        state
            .buffer
            .set_max_length(props.max_length.map(|length| length as usize));
        let reshape = secure_changed
            || props.placeholder != previous.placeholder
            || props.rows != previous.rows
            || composition != CompositionEvent::None;
        if composition == CompositionEvent::End {
            self.queue(
                tag,
                EventPayload::CompositionEnd(CompositionData {
                    data: String::new(),
                }),
            );
        }
        if read_only_turned_on && self.focused == Some(tag) {
            self.end_platform_text_session();
        }
        reshape
    }

    /// Shape the display text again after the buffer's text, a composition or the secure mode
    /// changed. The placeholder and the measured size do not depend on any of them.
    pub(crate) fn reshape_display(&mut self, tag: u32) {
        let Some(font) = self.font.clone() else {
            return;
        };
        let Some(state) = self
            .mounted
            .nodes
            .get_mut(&tag)
            .and_then(|node| node.text_input.as_mut())
        else {
            return;
        };
        let Some(shaped) = state.shaped.as_ref() else {
            return;
        };
        let (font_size, multiline) = (shaped.font_size, state.buffer.config().multiline);
        let display = shape(&font, &display_string(state), font_size, multiline);
        if let Some(shaped) = state.shaped.as_mut() {
            shaped.display = display;
        }
        state.generation += 1;
        self.layout_dirty.insert(tag);
        self.paint_dirty.insert(tag);
        self.discard_text_accessibility(tag);
    }

    /// The layout of what the input draws (its display text), for the caret, the selection, the
    /// pointer and the IME.
    pub(crate) fn display_layout(&self, tag: u32) -> Result<GodotTextLayout, TextInputError> {
        let frame = self.input_frame(tag).ok_or(TextInputError::NotShaped)?;
        let shaped = self
            .mounted
            .nodes
            .get(&tag)
            .and_then(|node| node.text_input.as_ref())
            .and_then(|state| state.shaped.as_ref())
            .ok_or(TextInputError::NotShaped)?;
        Ok(frame.layout(&shaped.display)?)
    }

    /// The layout of the buffer's own text, which the edit buffer's boundaries and line moves ask:
    /// the display layout itself when the display text is the buffer's text, else a fresh shaping of
    /// it (a password draws bullets and a composing input draws its preedit, and neither has the
    /// buffer's graphemes and words).
    pub(crate) fn buffer_layout(&self, tag: u32) -> Result<GodotTextLayout, TextInputError> {
        let frame = self.input_frame(tag).ok_or(TextInputError::NotShaped)?;
        let state = self
            .mounted
            .nodes
            .get(&tag)
            .and_then(|node| node.text_input.as_ref())
            .ok_or(TextInputError::NotShaped)?;
        let shaped = state.shaped.as_ref().ok_or(TextInputError::NotShaped)?;
        let config = state.buffer.config();
        if !config.secure && state.buffer.composition().is_none() {
            return Ok(frame.layout(&shaped.display)?);
        }
        let font = self.font.as_ref().ok_or(TextInputError::NotShaped)?;
        let text = state.buffer.value();
        let paragraph = shape(font, &text, shaped.font_size, config.multiline);
        Ok(frame.layout(&paragraph)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn metrics() -> Metrics {
        Metrics {
            font_size: 16,
            ascent: 12.0,
            descent: 4.0,
            zero_advance: 9.0,
        }
    }

    #[test]
    fn a_text_input_measures_in_columns_and_rows_and_never_by_its_value() {
        let single = metrics().intrinsic_size(false, None);
        assert_eq!(single, Vector2::new(180.0, 16.0));
        // `rows` means nothing to a single-line input.
        assert_eq!(metrics().intrinsic_size(false, Some(5)), single);
        assert_eq!(
            metrics().intrinsic_size(true, None),
            Vector2::new(180.0, 32.0)
        );
        assert_eq!(
            metrics().intrinsic_size(true, Some(5)),
            Vector2::new(180.0, 80.0)
        );
    }

    #[test]
    fn an_empty_line_measures_the_font() {
        assert_eq!(
            metrics().empty_line(),
            LineExtents {
                ascent: 12.0,
                descent: 4.0
            }
        );
    }

    #[test]
    fn a_single_line_is_centred_vertically_and_a_text_area_starts_at_the_top() {
        let border = Edges {
            left: 1.0,
            top: 1.0,
            right: 1.0,
            bottom: 1.0,
        };
        let padding = Edges {
            left: 8.0,
            top: 4.0,
            right: 8.0,
            bottom: 4.0,
        };
        // 40 tall: 38 inside the border, 30 inside the padding; the 16 px line gets 7 px above it.
        let single = InputFrame::new(
            metrics(),
            None,
            false,
            Vector2::new(200.0, 40.0),
            border,
            padding,
        );
        assert_eq!(single.origin, Vector2::new(9.0, 12.0));
        assert_eq!(single.content_width, 182.0);
        assert_eq!(single.content_height, 30.0);
        let area = InputFrame::new(
            metrics(),
            None,
            true,
            Vector2::new(200.0, 40.0),
            border,
            padding,
        );
        assert_eq!(area.origin, Vector2::new(9.0, 5.0));
        // A box shorter than its line does not push the line above the box.
        let squat = InputFrame::new(
            metrics(),
            None,
            false,
            Vector2::new(200.0, 10.0),
            border,
            padding,
        );
        assert_eq!(squat.origin.y, 5.0);
    }
}
