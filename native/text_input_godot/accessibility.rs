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
use crate::accessibility_model::{
    AxAction, AxBounds, AxTextField, hard_line_of, hard_line_starts, line_for_offset,
};
use crate::text_input::EditCommand;

use super::shaping::{display_string, shape};
use super::{TextInputState, sanitize_value};

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

    /// The rows of the display text, each hard line shaped on its own, as `TextEdit` shapes them: the server
    /// reads a row's text from its shaped text and adds the line break itself, so a row shaped with its `\n`
    /// would be read as a double break (observed: a two-line text read 13 characters, a stock `TextEdit` 12).
    /// A row is placed from the display layout (where the input draws it) and read from the shaped row of
    /// the same hard line; the two wrap alike, and a hard line that does not is an error, not a guess.
    fn text_line_placement(&self, tag: u32, field: &AxTextField) -> Result<LinePlacement, String> {
        let layout = self
            .display_layout(tag)
            .map_err(|error| error.to_string())?;
        let frame = self
            .input_frame(tag)
            .ok_or("it has no font to measure with")?;
        let font = self.font.as_ref().ok_or("there is no font")?;
        let font_size = self
            .text_state(tag)
            .and_then(|state| state.shaped.as_ref())
            .ok_or("it has no shaped text")?
            .font_size;
        let characters: Vec<char> = field.text.chars().collect();
        let starts = hard_line_starts(&field.text);
        let mut display_rows: Vec<Vec<&crate::text_layout::Line>> = vec![Vec::new(); starts.len()];
        for row in layout.lines() {
            display_rows[hard_line_of(&starts, row.range.start)].push(row);
        }
        let mut rows = Vec::new();
        let mut paragraphs = Vec::new();
        for (hard_line, display) in display_rows.iter().enumerate() {
            let begin = starts[hard_line];
            let end = starts
                .get(hard_line + 1)
                .map_or(characters.len(), |next| next - 1);
            let text: String = characters[begin..end].iter().collect();
            // An empty hard line (and an empty field) is one row with no shaped text: the server makes
            // the element and its line break from nothing.
            let rids: Vec<Option<Rid>> = if text.is_empty() {
                vec![None]
            } else {
                let mut paragraph = shape(font, &text, font_size, field.multiline);
                frame.prepare(&mut paragraph);
                let count = usize::try_from(paragraph.get_line_count()).unwrap_or(0);
                let rids = (0..count)
                    .map(|index| {
                        Some(paragraph.get_line_rid(i32::try_from(index).unwrap_or(i32::MAX)))
                    })
                    .collect();
                paragraphs.push(paragraph);
                rids
            };
            if rids.len() != display.len() {
                return Err(format!(
                    "hard line {hard_line} shapes into {} rows and the display draws {}",
                    rids.len(),
                    display.len()
                ));
            }
            for (row, shaped_text) in display.iter().zip(rids) {
                rows.push(PlacedRow {
                    hard_line,
                    column_range: row.range.start.saturating_sub(begin)
                        ..row.range.end.saturating_sub(begin).min(end - begin),
                    shaped_text,
                    origin: Vector2::new(row.origin.x, row.top()),
                    height: row.height(),
                });
            }
        }
        Ok(LinePlacement {
            rows,
            starts,
            _paragraphs: paragraphs,
        })
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
                lines.rids.len() == placement.rows.len()
                    && lines.rids.iter().all(|rid| server.has_element(*rid))
            })
            .unwrap_or_else(|| {
                let last = placement.rows.len().saturating_sub(1);
                TextLineElements {
                    rids: placement
                        .rows
                        .iter()
                        .enumerate()
                        .map(|(index, row)| {
                            server
                                .create_sub_text_edit_elements_ex(
                                    element,
                                    row.shaped_text.unwrap_or(Rid::Invalid),
                                    row.height,
                                )
                                .insert_pos(APPEND)
                                .is_last_line(index == last)
                                .done()
                        })
                        .collect(),
                }
            });
        for (rid, row) in usable.rids.iter().zip(&placement.rows) {
            // The field's element shares the root's space, so a row is placed by where it is in the
            // root: the field's box, the row in the box, less how far the text is scrolled.
            let origin = Vector2::new(
                bounds.x + row.origin.x - field.scroll.0,
                bounds.y + row.origin.y - field.scroll.1,
            );
            server.update_set_transform(
                *rid,
                Transform2D::from_cols(Vector2::RIGHT, Vector2::DOWN, origin),
            );
        }
        // An end of the selection is a column in a hard line, on the element of the row that holds it.
        let end_of = |offset: usize| {
            let hard_line = hard_line_of(&placement.starts, offset);
            let column = offset.saturating_sub(placement.starts[hard_line]);
            let indices: Vec<usize> = (0..placement.rows.len())
                .filter(|index| placement.rows[*index].hard_line == hard_line)
                .collect();
            let ranges: Vec<_> = indices
                .iter()
                .map(|index| placement.rows[*index].column_range.clone())
                .collect();
            line_for_offset(&ranges, column)
                .and_then(|row| usable.rids.get(indices[row]).copied())
                .map(|rid| (rid, column))
        };
        let (anchor, focus) = field.selection;
        if let (Some((anchor_row, anchor_column)), Some((focus_row, focus_column))) =
            (end_of(anchor), end_of(focus))
        {
            server.update_set_text_selection(
                element,
                anchor_row,
                signed(anchor_column),
                focus_row,
                signed(focus_column),
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

/// One row of the field's text: the hard line it is in, the columns of that line it holds, the shaped row the
/// platform reads it from, and where it is.
struct PlacedRow {
    hard_line: usize,
    column_range: std::ops::Range<usize>,
    shaped_text: Option<Rid>,
    /// The left end of the row's box and its top, in the field's border box.
    origin: Vector2,
    height: f32,
}

struct LinePlacement {
    rows: Vec<PlacedRow>,
    /// Where each hard line starts, in code points of the display text.
    starts: Vec<usize>,
    /// The shaped paragraphs the rows' RIDs belong to, alive until the elements are made.
    _paragraphs: Vec<Gd<godot::classes::TextParagraph>>,
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
