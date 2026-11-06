//! Drawing a text input: the selection, the text (or the placeholder), the IME preedit's underline
//! and the caret, in the two items under its scroll item (`render_tree.rs`), and keeping the caret
//! in view by scrolling that item (plan 3.8, 3.18).
//!
//! The drawing follows `LineEdit::_notification(NOTIFICATION_DRAW)` (`line_edit.cpp:1498-1670`): the
//! selection under the text, the preedit underlined at the baseline (a thin line, thick for the part
//! the IME is converting, which also has no caret), both carets of the caret's position and the
//! direction markers where they differ or sit inside a ligature. The caret is its own item, so that
//! blinking redraws nothing but it.

use std::collections::HashMap;

use godot::classes::RenderingServer;
use godot::prelude::*;

use super::shaping::horizontal_alignment;
use super::{
    CARET_WIDTH_PX, DEFAULT_PLACEHOLDER_ALPHA, DEFAULT_SELECTION_COLOR, TextInputError,
    TextInputState,
};
use crate::ReactUiRoot;
use crate::paint::parse_color;
use crate::render_tree::{CaretKey, EditTextKey, RenderNode};
use crate::scroll::Vec2;
use crate::scroll_input::to_vector;
use crate::text_layout::{Carets, GodotTextLayout, TextDirection, TextLayoutError};

/// How much thicker the underline of the part of a preedit being converted is than the rest of it
/// (`line_edit.cpp:1664`).
const CONVERTING_UNDERLINE_FACTOR: f32 = 3.0;
/// The width of the marker over a caret inside a ligature, and its offset to the left of the caret,
/// both in caret widths (`line_edit.cpp:1604`).
const MID_MARKER_WIDTH: f32 = 6.0;
const MID_MARKER_OFFSET: f32 = -2.5;
/// The direction marker at a change of direction: its width, and its offset in caret widths for a
/// left-to-right and a right-to-left side (`line_edit.cpp:1609-1615`).
const SPLIT_MARKER_WIDTH: f32 = 3.0;
const SPLIT_MARKER_LTR_OFFSET: f32 = 0.5;
const SPLIT_MARKER_RTL_OFFSET: f32 = -3.0;

/// The rectangles of the caret(s) at `offset` and their markers, as `LineEdit` draws them.
///
/// A caret on a line with no text is only a caret (`line_edit.cpp:1567-1600` draws it with no markers):
/// the layout makes one for it with no direction, which on a line with glyphs means a position inside
/// a ligature.
fn caret_rects(carets: &Carets, line_is_empty: bool) -> Vec<Rect2> {
    let width = CARET_WIDTH_PX;
    let mut rects = Vec::new();
    match (carets.leading, carets.trailing) {
        _ if line_is_empty => {}
        (Some(leading), _) if leading.direction.is_none() => {
            rects.push(Rect2::new(
                Vector2::new(leading.x + MID_MARKER_OFFSET * width, leading.top),
                Vector2::new(MID_MARKER_WIDTH * width, width),
            ));
        }
        (Some(leading), Some(trailing)) if leading.direction != trailing.direction => {
            let side = |direction: Option<TextDirection>| match direction {
                Some(TextDirection::Rtl) => SPLIT_MARKER_RTL_OFFSET,
                Some(TextDirection::Ltr) | None => SPLIT_MARKER_LTR_OFFSET,
            };
            rects.push(Rect2::new(
                Vector2::new(
                    leading.x + side(leading.direction) * width,
                    leading.top + leading.height - width,
                ),
                Vector2::new(SPLIT_MARKER_WIDTH * width, width),
            ));
            rects.push(Rect2::new(
                Vector2::new(trailing.x + side(trailing.direction) * width, trailing.top),
                Vector2::new(SPLIT_MARKER_WIDTH * width, width),
            ));
        }
        _ => {}
    }
    for caret in [carets.leading, carets.trailing].into_iter().flatten() {
        rects.push(caret.rect(width));
    }
    rects
}

/// What the text item of an input draws, ready to record.
struct TextDrawing {
    key: EditTextKey,
    selection: Vec<Rect2>,
    underline: Vec<Rect2>,
    converting: Vec<Rect2>,
    origin: Vector2,
    color: Color,
    placeholder: Option<Gd<godot::classes::TextParagraph>>,
    display: Gd<godot::classes::TextParagraph>,
    selection_color: Color,
}

/// What the drag ghost draws of one text input: its text or placeholder, nothing else.
pub(crate) struct GhostText {
    drawing: TextDrawing,
}

impl GhostText {
    /// Draw it into the copy's text item.
    pub(crate) fn record(&self, copy: &mut RenderNode) {
        copy.make_edit_items();
        copy.record_edit_text(self.drawing.key.clone(), |item| {
            draw_text(item, &self.drawing);
        });
    }
}

impl ReactUiRoot {
    /// What the drag ghost of `source` draws for each text input at or under it, by tag. A selection,
    /// an IME preedit and the caret belong to the live input, not to a copy of it.
    pub(crate) fn text_input_ghost_texts(&self, source: u32) -> HashMap<u32, GhostText> {
        let mut texts = HashMap::new();
        let mut pending = vec![source];
        while let Some(tag) = pending.pop() {
            let Some(node) = self.mounted.nodes.get(&tag) else {
                continue;
            };
            pending.extend(node.paint_children.iter().copied());
            if node.text_input.is_none() {
                continue;
            }
            let drawing = self
                .display_layout(tag)
                .and_then(|layout| self.text_drawing(tag, &layout, false));
            match drawing {
                Ok((mut drawing, _)) => {
                    drawing.selection.clear();
                    drawing.underline.clear();
                    drawing.converting.clear();
                    drawing.key.selection = None;
                    drawing.key.preedit = None;
                    texts.insert(tag, GhostText { drawing });
                }
                Err(TextInputError::NotShaped) => {}
                Err(error) => {
                    godot_error!(
                        "ReactUiRoot: text input {tag}: cannot copy it into a drag ghost: {error}"
                    );
                }
            }
        }
        texts
    }

    /// Bring the text and caret items of the text input `tag` up to date. Returns whether either was
    /// re-recorded. A layout that cannot be built is an `ERROR` line and leaves what is drawn alone.
    pub(crate) fn paint_text_input(&mut self, tag: u32) -> bool {
        match self.draw_text_input(tag) {
            Ok(recorded) => recorded,
            Err(TextInputError::NotShaped) => false,
            Err(error) => {
                godot_error!("ReactUiRoot: text input {tag}: cannot draw: {error}");
                false
            }
        }
    }

    fn draw_text_input(&mut self, tag: u32) -> Result<bool, TextInputError> {
        let Some(node) = self.mounted.nodes.get(&tag) else {
            return Ok(false);
        };
        if node.text_input.is_none() || !node.render.has_scroller() {
            return Ok(false);
        }
        let layout = self.display_layout(tag)?;
        let focused = self.focused == Some(tag) && !self.text_inputs.window_unfocused;
        let (drawing, caret) = self.text_drawing(tag, &layout, focused)?;
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return Ok(false);
        };
        node.render.make_edit_items();
        let mut recorded = node.render.record_edit_text(drawing.key.clone(), |item| {
            draw_text(item, &drawing);
        });
        recorded |= node.render.record_edit_caret(caret, |item, key| {
            let mut server = RenderingServer::singleton();
            for rect in &key.rects {
                server.canvas_item_add_rect(item, *rect, key.color);
            }
        });
        Ok(recorded)
    }

    fn text_drawing(
        &self,
        tag: u32,
        layout: &GodotTextLayout,
        focused: bool,
    ) -> Result<(TextDrawing, Option<CaretKey>), TextInputError> {
        let node = self
            .mounted
            .nodes
            .get(&tag)
            .ok_or(TextInputError::NotShaped)?;
        let state = node.text_input.as_ref().ok_or(TextInputError::NotShaped)?;
        let shaped = state.shaped.as_ref().ok_or(TextInputError::NotShaped)?;
        let computed = &node.computed;
        let color = parse_color(computed.color.as_deref(), Color::WHITE);
        let placeholder_color = computed.placeholder_color.as_deref().map_or_else(
            || {
                Color::from_rgba(
                    color.r,
                    color.g,
                    color.b,
                    color.a * DEFAULT_PLACEHOLDER_ALPHA,
                )
            },
            |hex| parse_color(Some(hex), color),
        );
        let caret_color = parse_color(computed.caret_color.as_deref(), color);
        let selection_color = parse_color(Some(DEFAULT_SELECTION_COLOR), Color::TRANSPARENT_BLACK);

        let buffer = &state.buffer;
        let showing_placeholder = buffer.text().is_empty()
            && buffer.composition().is_none()
            && shaped.placeholder.is_some();
        // The selection of an input that is not focused is kept (`selectionStart` still reads it) but not
        // drawn, as a browser does not draw it (`LineEdit` goes further and drops it).
        let selection = {
            let range = buffer.selection_range();
            (self.focused == Some(tag) && !range.is_empty()).then_some((range.start, range.end))
        };
        let preedit = match (buffer.composition(), buffer.preedit_range()) {
            (Some(composition), Some(range)) => {
                let converting = composition.selection();
                Some((
                    (range.start, range.end),
                    (range.start + converting.start, range.start + converting.end),
                ))
            }
            _ => None,
        };
        let selection_rects = match selection {
            Some((start, end)) => layout.selection_rects(start, end)?,
            None => Vec::new(),
        };
        let (underline, converting) = match preedit {
            Some(((start, end), (converted_start, converted_end))) => (
                underline_rects(layout, start, end)?,
                underline_rects(layout, converted_start, converted_end)?,
            ),
            None => (Vec::new(), Vec::new()),
        };
        let frame = self.input_frame(tag).ok_or(TextInputError::NotShaped)?;
        let key = EditTextKey {
            generation: state.generation,
            origin: frame.origin,
            content_width: frame.content_width,
            alignment: horizontal_alignment(computed.text_align).ord(),
            color,
            placeholder: showing_placeholder.then_some(placeholder_color),
            selection_color,
            selection,
            preedit,
            oversampling: self.oversampling(),
        };
        let drawing = TextDrawing {
            key,
            selection: selection_rects.into_iter().map(|rect| rect.rect).collect(),
            underline,
            converting,
            origin: frame.origin,
            color: if showing_placeholder {
                placeholder_color
            } else {
                color
            },
            placeholder: showing_placeholder
                .then(|| shaped.placeholder.clone())
                .flatten()
                .map(|mut paragraph| {
                    frame.prepare(&mut paragraph);
                    paragraph
                }),
            display: shaped.display.clone(),
            selection_color,
        };
        let caret = if focused && state.blink.visible && !converting_text(state) {
            let carets = layout.carets(state.caret_display_offset())?;
            let line_is_empty = layout.line(carets.line)?.range.is_empty();
            Some(CaretKey {
                rects: caret_rects(&carets, line_is_empty),
                color: caret_color,
            })
        } else {
            None
        };
        Ok((drawing, caret))
    }

    /// Draw the text input `tag` again now.
    pub(crate) fn repaint_text_input(&mut self, tag: u32) {
        self.paint_dirty.insert(tag);
        self.paint_pass();
    }

    /// A key or a click on the input: the caret is on for a full period again.
    pub(crate) fn restart_caret_blink(&mut self, tag: u32) {
        if let Some(state) = self.text_state_mut(tag)
            && state.blink.restart()
        {
            self.paint_text_input(tag);
        }
    }

    /// Whether a text input is focused in a window that has focus, which keeps the caret blinking and
    /// so needs frames (`motion.rs`'s `update_process`).
    pub(crate) fn text_input_wants_frames(&self) -> bool {
        !self.text_inputs.window_unfocused && self.focused_text_input().is_some()
    }

    /// Advance the focused input's caret blink by `delta` seconds and redraw it when it flips.
    pub(crate) fn tick_text_input(&mut self, delta: f64) {
        let Some(tag) = self.focused_text_input() else {
            return;
        };
        let flipped = self
            .text_state_mut(tag)
            .is_some_and(|state| state.blink.tick(delta));
        if flipped {
            self.paint_text_input(tag);
        }
    }

    /// Scroll the text input `tag` the least that shows its caret (or the IME's conversion), with the
    /// padding the caret would otherwise sit in the edge of (`LineEdit::set_caret_column`). A
    /// single-line input scrolls horizontally, a multi-line one vertically. A layout that cannot be
    /// built is an `ERROR` line and leaves the scroll alone.
    pub(crate) fn reveal_text_caret(&mut self, tag: u32) {
        match self.caret_scroll_target(tag) {
            Ok(Some(target)) => {
                let Some(node) = self.mounted.nodes.get_mut(&tag) else {
                    return;
                };
                let ranges = node.geometry.scroll_ranges;
                let moved = node.scroll.scroll_to(&ranges, target);
                if moved != Vec2::ZERO {
                    node.scroll.stop_momentum();
                    self.scrolled(&[tag]);
                }
            }
            Ok(None) => {}
            Err(TextInputError::NotShaped) => {}
            Err(error) => {
                godot_error!("ReactUiRoot: text input {tag}: cannot follow the caret: {error}");
            }
        }
    }

    fn caret_scroll_target(&self, tag: u32) -> Result<Option<Vec2>, TextInputError> {
        let Some(node) = self.mounted.nodes.get(&tag) else {
            return Ok(None);
        };
        let Some(state) = node.text_input.as_ref() else {
            return Ok(None);
        };
        let layout = self.display_layout(tag)?;
        let (from, to) = state.caret_display_span();
        let start = layout.caret(from, state.input_direction)?;
        let end = layout.caret(to, state.input_direction)?;
        let geometry = &node.geometry;
        let client = geometry.padding_box();
        let offset = node.scroll.offset;
        let mut target = offset;
        if state.buffer.config().multiline {
            // The padding box's frame: the layout's y less the border; the padding around the text
            // is part of what scrolls, so the first and last lines reach the box's edge.
            let top = start.top.min(end.top) - geometry.border.top - geometry.padding.top;
            let bottom = start.top.max(end.top) + start.height.max(end.height)
                - geometry.border.top
                + geometry.padding.bottom;
            target.y = least_scroll(offset.y, top, bottom, client.height);
        } else {
            let left = start.x.min(end.x) - geometry.border.left - geometry.padding.left;
            let right =
                start.x.max(end.x) + CARET_WIDTH_PX - geometry.border.left + geometry.padding.right;
            target.x = least_scroll(offset.x, left, right, client.width);
        }
        Ok((target != offset).then_some(target))
    }

    /// The root-local position of the caret, for the IME window: its left edge and the middle of its
    /// line (`LineEdit::_update_ime_window_position`, `line_edit.cpp:139`).
    pub(crate) fn text_input_caret_position(&self, tag: u32) -> Result<Vector2, TextInputError> {
        let node = self
            .mounted
            .nodes
            .get(&tag)
            .ok_or(TextInputError::NotShaped)?;
        let state = node.text_input.as_ref().ok_or(TextInputError::NotShaped)?;
        let layout = self.display_layout(tag)?;
        let caret = layout.caret(state.caret_display_offset(), state.input_direction)?;
        let (rect, _) = self
            .mounted
            .absolute_geometry(tag, self.viewport_box())
            .ok_or(TextInputError::NotShaped)?;
        let scrolled = to_vector(node.scroll.offset);
        Ok(Vector2::new(
            rect.x + caret.x - scrolled.x,
            rect.y + caret.top + caret.height / 2.0 - scrolled.y,
        ))
    }
}

/// Whether the IME is converting part of its preedit, in which case it draws its own thick underline
/// and the input draws no caret.
fn converting_text(state: &TextInputState) -> bool {
    state
        .buffer
        .composition()
        .is_some_and(|composition| !composition.selection().is_empty())
}

/// The thin lines under `start..end` of the display text, at the baseline of each line it crosses.
fn underline_rects(
    layout: &GodotTextLayout,
    start: usize,
    end: usize,
) -> Result<Vec<Rect2>, TextLayoutError> {
    let mut rects = Vec::new();
    for run in layout.selection_rects(start, end)? {
        let baseline = layout.line(run.line)?.origin.y;
        rects.push(Rect2::new(
            Vector2::new(run.rect.position.x, baseline),
            Vector2::new(run.rect.size.x, CARET_WIDTH_PX),
        ));
    }
    Ok(rects)
}

fn draw_text(item: Rid, drawing: &TextDrawing) {
    let mut server = RenderingServer::singleton();
    for rect in &drawing.selection {
        server.canvas_item_add_rect(item, *rect, drawing.selection_color);
    }
    let paragraph = drawing.placeholder.as_ref().unwrap_or(&drawing.display);
    paragraph
        .draw_ex(item, drawing.origin)
        .color(drawing.color)
        .oversampling(drawing.key.oversampling.factor())
        .done();
    for rect in &drawing.underline {
        server.canvas_item_add_rect(item, *rect, drawing.color);
    }
    for rect in &drawing.converting {
        let thick = Rect2::new(
            rect.position,
            Vector2::new(rect.size.x, rect.size.y * CONVERTING_UNDERLINE_FACTOR),
        );
        server.canvas_item_add_rect(item, thick, drawing.color);
    }
}

/// The scroll offset that shows `near..far` (an edge of the thing to keep in view and the opposite
/// one, in the scrolled content's frame) in a window `size` long, moving `offset` as little as
/// possible.
fn least_scroll(offset: f32, near: f32, far: f32, size: f32) -> f32 {
    if near < offset {
        near
    } else if far > offset + size {
        far - size
    } else {
        offset
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::text_layout::Caret;

    fn caret(x: f32, direction: Option<TextDirection>) -> Caret {
        Caret {
            x,
            top: 10.0,
            height: 8.0,
            direction,
        }
    }

    #[test]
    fn scrolling_moves_only_as_far_as_the_caret_needs() {
        // Inside the window: stay.
        assert_eq!(least_scroll(10.0, 20.0, 25.0, 50.0), 10.0);
        // Left of it: the near edge becomes the window's start.
        assert_eq!(least_scroll(30.0, 12.0, 17.0, 50.0), 12.0);
        // Right of it: the far edge becomes the window's end.
        assert_eq!(least_scroll(0.0, 80.0, 85.0, 50.0), 35.0);
        // A span wider than the window shows its near edge.
        assert_eq!(least_scroll(0.0, 10.0, 90.0, 50.0), 40.0 + 0.0);
    }

    #[test]
    fn a_plain_caret_is_its_two_halves_and_nothing_else() {
        let rects = caret_rects(
            &Carets {
                line: 0,
                leading: Some(caret(5.0, Some(TextDirection::Ltr))),
                trailing: Some(caret(5.0, Some(TextDirection::Ltr))),
            },
            false,
        );
        assert_eq!(rects.len(), 2);
        assert!(rects.iter().all(|rect| rect.size.x == CARET_WIDTH_PX));
    }

    #[test]
    fn a_caret_inside_a_ligature_gets_a_marker_over_it() {
        let rects = caret_rects(
            &Carets {
                line: 0,
                leading: Some(caret(5.0, None)),
                trailing: None,
            },
            false,
        );
        assert_eq!(rects.len(), 2);
        let marker = rects[0];
        assert_eq!(marker.size.x, MID_MARKER_WIDTH * CARET_WIDTH_PX);
        assert_eq!(marker.position.x, 5.0 + MID_MARKER_OFFSET * CARET_WIDTH_PX);
    }

    #[test]
    fn a_caret_on_an_empty_line_is_only_a_caret() {
        // The layout gives an empty line's caret no direction, which on a line with glyphs is a ligature.
        let carets = Carets {
            line: 0,
            leading: Some(caret(5.0, None)),
            trailing: None,
        };
        assert_eq!(caret_rects(&carets, true).len(), 1);
        assert_eq!(caret_rects(&carets, false).len(), 2);
    }

    #[test]
    fn a_split_caret_marks_the_direction_of_each_side() {
        let rects = caret_rects(
            &Carets {
                line: 0,
                leading: Some(caret(5.0, Some(TextDirection::Ltr))),
                trailing: Some(caret(40.0, Some(TextDirection::Rtl))),
            },
            false,
        );
        // Two markers, then the two carets.
        assert_eq!(rects.len(), 4);
        assert_eq!(rects[0].position.x, 5.0 + SPLIT_MARKER_LTR_OFFSET);
        assert_eq!(rects[1].position.x, 40.0 + SPLIT_MARKER_RTL_OFFSET);
    }
}
