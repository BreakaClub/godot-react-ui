//! The pointer in a text input (plan 3.17, 3.18): a click places the caret, a double click selects a
//! word, a triple click everything, Shift extends, and dragging with the button down extends the
//! selection to the pointer. They are the default action of a primary `pointerdown`, so JS can keep
//! them with `preventDefault()`, and they need no capture: while the button is down Godot keeps
//! routing the mouse to the root.
//!
//! The pointer is turned into an offset with the text layout of what the input draws, in the frame
//! of its scroll item: the point less the node's drawn origin plus how far it is scrolled.

use godot::prelude::*;

use super::TextInputError;
use crate::ReactUiRoot;
use crate::pointer::MOUSE_POINTER_ID;
use crate::scroll_input::to_vector;
use crate::text_input::EditCommand;

/// The click count at which a click selects a word, and from which it selects everything (plan
/// Appendix A: `detail` counts the consecutive presses of one sequence).
const WORD_CLICK_COUNT: u32 = 2;
const SELECT_ALL_CLICK_COUNT: u32 = 3;

/// A selection drag in progress: the text input and the end of the selection that stays put.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct TextDrag {
    pub(crate) tag: u32,
    /// The code point offset the drag began at (or Shift-extended from).
    anchor: usize,
    /// After a double click the drag extends by words, and the word first selected stays selected.
    word: Option<(usize, usize)>,
}

impl ReactUiRoot {
    /// The default action of an un-prevented primary press that hit `hit`: if it is a text input
    /// (the press has just focused it), place the caret or select as the click count says, and
    /// begin a drag when the pointer is a mouse (`draggable`). `shift` extends the existing selection.
    pub(crate) fn text_input_pointer_down(
        &mut self,
        hit: Option<u32>,
        point: Vector2,
        detail: u32,
        shift: bool,
        draggable: bool,
    ) {
        self.text_inputs.drag = None;
        let Some(tag) = hit.filter(|tag| self.focused == Some(*tag)) else {
            return;
        };
        if self.text_state(tag).is_none() {
            return;
        }
        self.note_window_active();
        let Some(state) = self.text_state_mut(tag) else {
            return;
        };
        // `selectTextOnFocus`: the press that focused the input selected everything, and the click
        // that did must not collapse it.
        if std::mem::take(&mut state.selected_by_focusing_press) {
            return;
        }
        if state.buffer.composition().is_some() {
            self.run_internal_command(tag, EditCommand::CancelComposition);
        }
        let offset = match self.text_offset_at(tag, point) {
            Ok(offset) => offset,
            Err(error) => {
                godot_error!("ReactUiRoot: text input {tag}: cannot place the caret: {error}");
                return;
            }
        };
        let Some(state) = self.text_state(tag) else {
            return;
        };
        let anchor = state.buffer.anchor();
        if detail >= SELECT_ALL_CLICK_COUNT {
            self.run_internal_command(tag, EditCommand::SelectAll);
            return;
        }
        if detail == WORD_CLICK_COUNT {
            self.run_internal_command(tag, EditCommand::SelectWordAt(offset));
            if draggable && let Some(state) = self.text_state(tag) {
                let word = state.buffer.selection_range();
                self.text_inputs.drag = Some(TextDrag {
                    tag,
                    anchor: word.start,
                    word: Some((word.start, word.end)),
                });
            }
            return;
        }
        let start = if shift { anchor } else { offset };
        self.run_internal_command(
            tag,
            EditCommand::SetSelection {
                anchor: start,
                focus: offset,
            },
        );
        if draggable {
            self.text_inputs.drag = Some(TextDrag {
                tag,
                anchor: start,
                word: None,
            });
        }
    }

    /// The mouse moved: if a selection drag is in progress, extend it to the pointer.
    pub(crate) fn text_input_pointer_move(&mut self) {
        let Some(drag) = self.text_inputs.drag else {
            return;
        };
        // The press is native's own record (a motion event's button mask is the device's word, and a
        // synthetic one need not carry it, as the scrollbar thumb drag found).
        let held = self
            .pointers
            .get(MOUSE_POINTER_ID)
            .is_some_and(|record| record.is_down());
        if !held || self.text_state(drag.tag).is_none() {
            // The press ended somewhere native was not told, or the input is gone.
            self.text_inputs.drag = None;
            return;
        }
        let command = match self.drag_selection(drag) {
            Ok(command) => command,
            Err(error) => {
                godot_error!(
                    "ReactUiRoot: text input {}: cannot extend the selection: {error}",
                    drag.tag
                );
                self.text_inputs.drag = None;
                return;
            }
        };
        let Some(state) = self.text_state(drag.tag) else {
            return;
        };
        let EditCommand::SetSelection { anchor, focus } = command else {
            return;
        };
        if (state.buffer.anchor(), state.buffer.focus()) != (anchor, focus) {
            self.run_internal_command(drag.tag, command);
        }
    }

    /// The selection a drag has reached: from its anchor to the pointer, by words after a double click.
    fn drag_selection(&self, drag: TextDrag) -> Result<EditCommand, TextInputError> {
        let offset = self.text_offset_at(drag.tag, self.pointer)?;
        let Some((word_start, word_end)) = drag.word else {
            return Ok(EditCommand::SetSelection {
                anchor: drag.anchor,
                focus: offset,
            });
        };
        let (start, end) = self.buffer_layout(drag.tag)?.word_range_at(offset)?;
        Ok(if start < word_start {
            EditCommand::SetSelection {
                anchor: word_end,
                focus: start,
            }
        } else {
            EditCommand::SetSelection {
                anchor: word_start,
                focus: end.max(word_end),
            }
        })
    }

    /// The primary button went up: the drag is over, and a touch screen's keyboard may show.
    pub(crate) fn text_input_pointer_up(&mut self, hit: Option<u32>) {
        self.text_inputs.drag = None;
        if let Some(tag) =
            hit.filter(|tag| self.focused == Some(*tag) && self.text_state(*tag).is_some())
        {
            self.show_virtual_keyboard(tag);
        }
    }

    /// The offset of the text input `tag`'s display text at the root-local `point`: the nearest
    /// grapheme boundary on the line the point is on (`TextLayout::hit_test`).
    pub(crate) fn text_offset_at(&self, tag: u32, point: Vector2) -> Result<usize, TextInputError> {
        let (rect, _) = self
            .mounted
            .absolute_geometry(tag, self.viewport_box())
            .ok_or(TextInputError::NotShaped)?;
        let scrolled = self
            .mounted
            .nodes
            .get(&tag)
            .map_or(Vector2::ZERO, |node| to_vector(node.scroll.offset));
        let local = point - Vector2::new(rect.x, rect.y) + scrolled;
        Ok(self.display_layout(tag)?.hit_test(local)?)
    }
}
