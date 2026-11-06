//! A text input for assistive technologies (plan 3.21, Phase I7): a text field or text area with its
//! text, its selection and the actions that read and change them, as Godot's `LineEdit` and `TextEdit`
//! expose themselves (`line_edit.cpp:1245-1332`, `text_edit.cpp:760-840`).
//!
//! What the field says is in `accessibility_model.rs` ([`AxTextField`], [`props_of`]); this file is the
//! Godot side:
//!
//! * The text is not a value of the field. `create_sub_text_edit_elements` makes, for each line of the
//!   shaped display text, an element with a run per shaped run, whose characters, positions and word
//!   starts the server reads from the shaped text. The field's selection is then set against those
//!   elements (`update_set_text_selection` takes the element of the line each end is on and the
//!   character offset into the shaped text).
//! * Those line elements are created inside the update and cannot be freed inside it
//!   (`free_element` is refused there), so they are freed when what they were made from changes: the
//!   display text, the shaping, or the box the lines are wrapped to ([`ReactUiRoot::discard_text_accessibility`],
//!   called where the display is shaped again and where geometry changes). The field is then set again in
//!   the next update, which makes new ones.
//! * Actions: `set text selection`, `replace selected text` and `set value` become edit commands.
//!   They go through `beforeinput` like any edit, so JS can refuse one. The request carries code point
//!   offsets into the text the platform read, which is the display text.

use std::collections::HashMap;

use godot::classes::AccessibilityServer;
use godot::classes::accessibility_server::AccessibilityAction;
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::accessibility_model::{AxAction, AxBounds, AxTextField, line_for_offset};
use crate::text_input::EditCommand;

use super::{TextInputState, sanitize_value, shaping::display_string};

/// The method the text actions' callables call.
const ACTION_METHOD: &str = "_on_accessibility_action";
/// The keys of the dictionary a `set text selection` request carries (`LineEdit::_accessibility_action_set_selection`).
const SELECTION_START_KEY: &str = "start_char";
const SELECTION_END_KEY: &str = "end_char";

/// `insert_pos` that appends a child element.
const APPEND: i32 = -1;

/// The elements made for a text field's lines, in line order.
#[derive(Default)]
pub(crate) struct TextLineElements {
    rids: Vec<Rid>,
}

/// Everything the platform reads of `state`, as the model has it.
pub(crate) fn ax_text_field(state: &TextInputState, scroll: (f32, f32)) -> AxTextField {
    let config = state.buffer.config();
    let composing = state.buffer.composition().is_some();
    let selection = if composing {
        let caret = state.caret_display_offset();
        (caret, caret)
    } else {
        (state.buffer.anchor(), state.buffer.focus())
    };
    AxTextField {
        multiline: config.multiline,
        read_only: config.read_only,
        text: display_string(state),
        placeholder_shown: state.buffer.text().is_empty() && !composing,
        selection,
        scroll,
    }
}

impl ReactUiRoot {
    /// Set what a text field has beyond a plain element: the line elements of its text, where they
    /// are, its selection, and the actions that act on them. Called inside an update.
    pub(crate) fn apply_text_field_accessibility(
        &mut self,
        server: &mut Gd<AccessibilityServer>,
        element: Rid,
        tag: u32,
        field: &AxTextField,
        bounds: AxBounds,
    ) {
        match self.text_line_placement(tag, field) {
            Ok(placement) => self.place_text_lines(server, element, tag, field, bounds, &placement),
            Err(error) => {
                godot_error!("ReactUiRoot: text input {tag}: cannot expose its text: {error}");
            }
        }
        let root = self.to_gd();
        let callable = |action: AxAction| {
            Callable::from_object_method(&root, ACTION_METHOD)
                .bindv(&varray![i64::from(tag), action.code()])
        };
        server.update_add_action(
            element,
            AccessibilityAction::SET_TEXT_SELECTION,
            &callable(AxAction::SetTextSelection),
        );
        if !field.read_only {
            server.update_add_action(
                element,
                AccessibilityAction::REPLACE_SELECTED_TEXT,
                &callable(AxAction::ReplaceSelectedText),
            );
            server.update_add_action(
                element,
                AccessibilityAction::SET_VALUE,
                &callable(AxAction::SetValue),
            );
        }
    }

    /// Where each line of the display text is, in the field's own space, and the range of text it holds.
    fn text_line_placement(&self, tag: u32, field: &AxTextField) -> Result<LinePlacement, String> {
        let layout = self
            .display_layout(tag)
            .map_err(|error| error.to_string())?;
        let state = self.text_state(tag).ok_or("it is not a text input")?;
        let shaped = state.shaped.as_ref().ok_or("it has no shaped text")?;
        let paragraph_lines = shaped.display.get_line_count();
        let mut lines = Vec::new();
        let mut paragraph_line = 0;
        for line in layout.lines() {
            // The empty line after a final hard break is not a line of the paragraph.
            let shaped_text = if line.after_final_break || field.text.is_empty() {
                None
            } else {
                let rid = shaped.display.get_line_rid(paragraph_line);
                paragraph_line += 1;
                Some(rid)
            };
            lines.push(PlacedLine {
                range: line.range.clone(),
                shaped_text,
                origin: Vector2::new(line.origin.x, line.top()),
                height: line.height(),
            });
        }
        if paragraph_line > paragraph_lines && paragraph_lines > 0 {
            return Err(format!(
                "the layout has more lines than the paragraph ({paragraph_line} of {paragraph_lines})"
            ));
        }
        Ok(LinePlacement { lines })
    }

    fn place_text_lines(
        &mut self,
        server: &mut Gd<AccessibilityServer>,
        element: Rid,
        tag: u32,
        field: &AxTextField,
        bounds: AxBounds,
        placement: &LinePlacement,
    ) {
        let existing = self.accessibility.text_lines.remove(&tag);
        let usable = existing
            .filter(|lines| {
                lines.rids.len() == placement.lines.len()
                    && lines.rids.iter().all(|rid| server.has_element(*rid))
            })
            .unwrap_or_else(|| {
                let last = placement.lines.len().saturating_sub(1);
                TextLineElements {
                    rids: placement
                        .lines
                        .iter()
                        .enumerate()
                        .map(|(index, line)| {
                            server
                                .create_sub_text_edit_elements_ex(
                                    element,
                                    line.shaped_text.unwrap_or(Rid::Invalid),
                                    line.height,
                                )
                                .insert_pos(APPEND)
                                .is_last_line(index == last)
                                .done()
                        })
                        .collect(),
                }
            });
        for (rid, line) in usable.rids.iter().zip(&placement.lines) {
            // The field's element shares the root's space, so a line is placed by where it is in the
            // root: the field's box, the line in the box, less how far the text is scrolled.
            let origin = Vector2::new(
                bounds.x + line.origin.x - field.scroll.0,
                bounds.y + line.origin.y - field.scroll.1,
            );
            server.update_set_transform(
                *rid,
                Transform2D::from_cols(Vector2::RIGHT, Vector2::DOWN, origin),
            );
        }
        let ranges: Vec<_> = placement
            .lines
            .iter()
            .map(|line| line.range.clone())
            .collect();
        let end_of = |offset: usize| {
            line_for_offset(&ranges, offset).and_then(|index| usable.rids.get(index).copied())
        };
        let (anchor, focus) = field.selection;
        if let (Some(anchor_line), Some(focus_line)) = (end_of(anchor), end_of(focus)) {
            server.update_set_text_selection(
                element,
                anchor_line,
                signed(anchor),
                focus_line,
                signed(focus),
            );
        }
        self.accessibility.text_lines.insert(tag, usable);
    }

    /// Free the line elements of text input `tag`: what they were made from changed, and the next
    /// update makes new ones. Not allowed inside an update, so this is called where the text, the
    /// shaping or the wrap width change, which is never inside one.
    pub(crate) fn discard_text_accessibility(&mut self, tag: u32) {
        let Some(lines) = self.accessibility.text_lines.remove(&tag) else {
            return;
        };
        let mut server = AccessibilityServer::singleton();
        for rid in lines.rids {
            if server.has_element(rid) {
                server.free_element(rid);
            }
        }
        self.request_accessibility_update();
    }

    /// A text field's `set text selection`: the data is `{start_char, end_char}`.
    pub(crate) fn assistive_set_selection(&mut self, tag: u32, data: &Variant) {
        let Some((anchor, focus)) = requested_selection(data) else {
            godot_error!(
                "ReactUiRoot: accessibility set-text-selection for node {tag} carried no {SELECTION_START_KEY} and {SELECTION_END_KEY}: {data}"
            );
            return;
        };
        let Some(state) = self.text_state(tag) else {
            return;
        };
        if state.buffer.composition().is_some() {
            godot_warn!(
                "ReactUiRoot: accessibility set-text-selection for node {tag} ignored: the input is composing"
            );
            return;
        }
        let length = state.buffer.text().len();
        if anchor > length || focus > length {
            godot_error!(
                "ReactUiRoot: accessibility set-text-selection for node {tag} is outside the text: {anchor}..{focus} of {length}"
            );
            return;
        }
        self.run_internal_command(tag, EditCommand::SetSelection { anchor, focus });
    }

    /// A text field's `replace selected text`: the data is the text.
    pub(crate) fn assistive_replace_selected(&mut self, tag: u32, data: &Variant) {
        let Some(text) = self.requested_text(tag, data, "replace-selected-text") else {
            return;
        };
        self.run_text_command(tag, EditCommand::InsertText(text));
    }

    /// A text field's `set value`: the data is the new text, and the caret goes after it.
    pub(crate) fn assistive_set_value(&mut self, tag: u32, data: &Variant) {
        let Some(text) = self.requested_text(tag, data, "set-value") else {
            return;
        };
        let length = text.chars().count();
        self.run_text_command(tag, EditCommand::ReplaceText(text));
        // `ReplaceText` puts the caret at 0, as `_set_text` does for a virtual keyboard; a platform that
        // sets the value of a field wants the caret after it, as typing it would leave it.
        let end = self
            .text_state(tag)
            .map_or(length, |state| state.buffer.text().len());
        self.run_internal_command(
            tag,
            EditCommand::SetSelection {
                anchor: end,
                focus: end,
            },
        );
    }

    /// The text of a request, in the form this input stores it, or `None` after saying why not.
    fn requested_text(&self, tag: u32, data: &Variant, what: &str) -> Option<String> {
        let state = self.text_state(tag)?;
        match data.try_to::<GString>() {
            Ok(text) => Some(sanitize_value(
                &text.to_string(),
                state.buffer.config().multiline,
            )),
            Err(_) => {
                godot_error!(
                    "ReactUiRoot: accessibility {what} for node {tag} carried no string: {data}"
                );
                None
            }
        }
    }
}

/// One line of the field's text: what it holds, the shaped line the platform reads it from, and where it is.
struct PlacedLine {
    range: std::ops::Range<usize>,
    shaped_text: Option<Rid>,
    /// The left end of the line's box and its top, in the field's border box.
    origin: Vector2,
    height: f32,
}

struct LinePlacement {
    lines: Vec<PlacedLine>,
}

/// A character offset as the server counts it.
fn signed(offset: usize) -> i32 {
    i32::try_from(offset).unwrap_or(i32::MAX)
}

/// The anchor and the focus of a `set text selection` request.
fn requested_selection(data: &Variant) -> Option<(usize, usize)> {
    let dictionary = data.try_to::<VarDictionary>().ok()?;
    let offset = |key: &str| -> Option<usize> {
        let value = dictionary.get(key)?;
        usize::try_from(value.try_to::<i64>().ok()?).ok()
    };
    Some((offset(SELECTION_START_KEY)?, offset(SELECTION_END_KEY)?))
}

/// The per-root map of line elements, for [`crate::accessibility::Accessibility`].
pub(crate) type TextLines = HashMap<u32, TextLineElements>;
