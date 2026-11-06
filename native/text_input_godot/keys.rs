//! A key press as a text edit (plan Appendix C): which `InputMap` action it is, as `LineEdit`
//! decides it (`scene/gui/line_edit.cpp:690-1075`), and what that asks of the edit buffer.
//!
//! The actions are matched in `LineEdit`'s order with `event.is_action(name, true)` (an exact
//! match, so Ctrl+Left is not Left). The caret movements are matched with Shift removed from the
//! event and Shift itself selects (`:1007-1010`); every other action sees the event as it is. Which
//! key is which action is the project's `InputMap`, so a game that rebinds `ui_text_backspace`
//! rebinds the text inputs with it.
//!
//! What this does not do, and `LineEdit` does: `ui_menu`'s context menu, Alt-code and `ui_unicode_start`
//! character entry, `ui_cancel` ending the edit, `ui_text_submit` leaving the field (a single-line
//! input keeps focus; JS decides what Enter means), and the clear button.

use std::cell::OnceCell;

use godot::classes::{InputEvent, InputEventKey, InputMap};
use godot::prelude::*;

use crate::text_input::{Direction, EditCommand, EditConfig};

/// What a key press can be in a text input.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TextAction {
    Copy,
    SelectAll,
    Cut,
    /// Enter in a single-line input: JS's `onSubmit`; native only consumes the key.
    Submit,
    /// Enter in a multi-line input.
    Newline,
    Paste,
    Undo,
    Redo,
    BackspaceToLineStart,
    BackspaceWord,
    Backspace,
    DeleteToLineEnd,
    DeleteWord,
    Delete,
    CaretWordLeft,
    CaretLeft,
    CaretWordRight,
    CaretRight,
    CaretUp,
    CaretDown,
    CaretLineStart,
    CaretLineEnd,
    CaretPageUp,
    CaretPageDown,
    CaretDocumentStart,
    CaretDocumentEnd,
    SwapInputDirection,
}

/// Whether the event is matched as it is or with Shift removed (and Shift extending the selection).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Match {
    Exact,
    WithoutShift,
}

/// `LineEdit::gui_input`'s order. An action earlier in the list wins when two are bound to one key.
const ACTIONS: &[(&str, TextAction, Match)] = &[
    ("ui_copy", TextAction::Copy, Match::Exact),
    ("ui_text_select_all", TextAction::SelectAll, Match::Exact),
    ("ui_cut", TextAction::Cut, Match::Exact),
    ("ui_text_submit", TextAction::Submit, Match::Exact),
    ("ui_text_newline", TextAction::Newline, Match::Exact),
    ("ui_paste", TextAction::Paste, Match::Exact),
    ("ui_undo", TextAction::Undo, Match::Exact),
    ("ui_redo", TextAction::Redo, Match::Exact),
    (
        "ui_text_backspace_all_to_left",
        TextAction::BackspaceToLineStart,
        Match::Exact,
    ),
    (
        "ui_text_backspace_word",
        TextAction::BackspaceWord,
        Match::Exact,
    ),
    ("ui_text_backspace", TextAction::Backspace, Match::Exact),
    (
        "ui_text_delete_all_to_right",
        TextAction::DeleteToLineEnd,
        Match::Exact,
    ),
    ("ui_text_delete_word", TextAction::DeleteWord, Match::Exact),
    ("ui_text_delete", TextAction::Delete, Match::Exact),
    (
        "ui_text_caret_word_left",
        TextAction::CaretWordLeft,
        Match::WithoutShift,
    ),
    (
        "ui_text_caret_left",
        TextAction::CaretLeft,
        Match::WithoutShift,
    ),
    (
        "ui_text_caret_word_right",
        TextAction::CaretWordRight,
        Match::WithoutShift,
    ),
    (
        "ui_text_caret_right",
        TextAction::CaretRight,
        Match::WithoutShift,
    ),
    ("ui_text_caret_up", TextAction::CaretUp, Match::WithoutShift),
    (
        "ui_text_caret_down",
        TextAction::CaretDown,
        Match::WithoutShift,
    ),
    (
        "ui_text_caret_line_start",
        TextAction::CaretLineStart,
        Match::WithoutShift,
    ),
    (
        "ui_text_caret_line_end",
        TextAction::CaretLineEnd,
        Match::WithoutShift,
    ),
    (
        "ui_text_caret_page_up",
        TextAction::CaretPageUp,
        Match::WithoutShift,
    ),
    (
        "ui_text_caret_page_down",
        TextAction::CaretPageDown,
        Match::WithoutShift,
    ),
    (
        "ui_text_caret_document_start",
        TextAction::CaretDocumentStart,
        Match::WithoutShift,
    ),
    (
        "ui_text_caret_document_end",
        TextAction::CaretDocumentEnd,
        Match::WithoutShift,
    ),
    (
        "ui_swap_input_direction",
        TextAction::SwapInputDirection,
        Match::Exact,
    ),
];

struct Entry {
    name: StringName,
    action: TextAction,
    matching: Match,
}

/// The actions this project's `InputMap` has, in matching order.
#[derive(Default)]
pub(crate) struct TextActionTable {
    present: OnceCell<Vec<Entry>>,
}

impl TextActionTable {
    fn entries(&self) -> &[Entry] {
        self.present.get_or_init(|| {
            let map = InputMap::singleton();
            let mut present = Vec::with_capacity(ACTIONS.len());
            let mut missing = Vec::new();
            for (name, action, matching) in ACTIONS {
                let name = StringName::from(*name);
                if map.has_action(&name) {
                    present.push(Entry {
                        name,
                        action: *action,
                        matching: *matching,
                    });
                } else {
                    missing.push(*action);
                }
            }
            if !missing.is_empty() {
                godot_error!(
                    "ReactUiRoot: the InputMap has no action for {missing:?}; text inputs ignore those keys"
                );
            }
            present
        })
    }

    /// The first action `key` is, for an input that is multi-line or not. Enter is a line break in
    /// the one and a submit in the other.
    pub(crate) fn action_of(&self, key: &Gd<InputEventKey>, multiline: bool) -> Option<TextAction> {
        // An `InputMap` action binds a key to a device: every `InputEventKey` is made with the keyboard's
        // (`input_event.cpp:670`), and `InputMap::_find_event` ignores a binding unless the event's device is
        // its own (`input_map.cpp:152`). A key that arrives from another device (an event a `SubViewport` was
        // given, one a host injected) is the same key for editing, so it is matched as the keyboard's.
        let mut as_keyboard = key.duplicate_resource();
        as_keyboard.set_device(InputEvent::DEVICE_ID_KEYBOARD);
        let mut without_shift = as_keyboard.duplicate_resource();
        without_shift.set_shift_pressed(false);
        for entry in self.entries() {
            match (entry.action, multiline) {
                (TextAction::Submit, true) | (TextAction::Newline, false) => continue,
                _ => {}
            }
            let event = match entry.matching {
                Match::Exact => &as_keyboard,
                Match::WithoutShift => &without_shift,
            };
            if event.is_action_ex(&entry.name).exact_match(true).done() {
                return Some(entry.action);
            }
        }
        None
    }
}

/// What an action asks of a text input.
#[derive(Clone, Debug, PartialEq)]
pub(crate) enum KeyRequest {
    /// Run this command on the edit buffer.
    Edit(EditCommand),
    /// Enter in a single-line input: JS decides; native consumes the key.
    Submit,
    SwapInputDirection,
}

/// The request an action is, for a held Shift (which extends the selection of a movement) and the
/// input's modes. A `readOnly` input cuts as a copy, as `LineEdit` does (`line_edit.cpp:703-709`).
pub(crate) fn request_for(action: TextAction, shift: bool, config: EditConfig) -> KeyRequest {
    let backward = Direction::Backward;
    let forward = Direction::Forward;
    let command = match action {
        TextAction::Submit => return KeyRequest::Submit,
        TextAction::SwapInputDirection => return KeyRequest::SwapInputDirection,
        TextAction::Copy => EditCommand::Copy,
        TextAction::SelectAll => EditCommand::SelectAll,
        TextAction::Cut if config.read_only => EditCommand::Copy,
        TextAction::Cut => EditCommand::Cut,
        TextAction::Newline => EditCommand::InsertLineBreak,
        TextAction::Paste => EditCommand::Paste,
        TextAction::Undo => EditCommand::Undo,
        TextAction::Redo => EditCommand::Redo,
        TextAction::BackspaceToLineStart => EditCommand::DeleteToLineEdge(backward),
        TextAction::BackspaceWord => EditCommand::DeleteWord(backward),
        TextAction::Backspace => EditCommand::DeleteGrapheme(backward),
        TextAction::DeleteToLineEnd => EditCommand::DeleteToLineEdge(forward),
        TextAction::DeleteWord => EditCommand::DeleteWord(forward),
        TextAction::Delete => EditCommand::DeleteGrapheme(forward),
        TextAction::CaretWordLeft => EditCommand::MoveWord {
            direction: backward,
            extend: shift,
        },
        TextAction::CaretLeft => EditCommand::MoveGrapheme {
            direction: backward,
            extend: shift,
        },
        TextAction::CaretWordRight => EditCommand::MoveWord {
            direction: forward,
            extend: shift,
        },
        TextAction::CaretRight => EditCommand::MoveGrapheme {
            direction: forward,
            extend: shift,
        },
        TextAction::CaretUp => EditCommand::MoveLine {
            direction: backward,
            extend: shift,
        },
        TextAction::CaretDown => EditCommand::MoveLine {
            direction: forward,
            extend: shift,
        },
        TextAction::CaretLineStart => EditCommand::MoveLineEdge {
            direction: backward,
            extend: shift,
        },
        TextAction::CaretLineEnd => EditCommand::MoveLineEdge {
            direction: forward,
            extend: shift,
        },
        TextAction::CaretPageUp => EditCommand::MovePage {
            direction: backward,
            extend: shift,
        },
        TextAction::CaretPageDown => EditCommand::MovePage {
            direction: forward,
            extend: shift,
        },
        TextAction::CaretDocumentStart => EditCommand::MoveDocumentEdge {
            direction: backward,
            extend: shift,
        },
        TextAction::CaretDocumentEnd => EditCommand::MoveDocumentEdge {
            direction: forward,
            extend: shift,
        },
    };
    KeyRequest::Edit(command)
}

/// The text a key types when it is no action: `unicode >= 32` with no Ctrl, Alt or Meta
/// (`line_edit.cpp:1054-1074`; the engine already keeps the macOS function keys out of `unicode`,
/// `platform/macos/godot_content_view.mm:316`). Shift is not a modifier here: it makes capitals.
pub(crate) fn typed_text(unicode: u32, ctrl: bool, alt: bool, meta: bool) -> Option<String> {
    const FIRST_PRINTABLE: u32 = 32;
    if ctrl || alt || meta || unicode < FIRST_PRINTABLE {
        return None;
    }
    char::from_u32(unicode).map(String::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SINGLE: EditConfig = EditConfig {
        multiline: false,
        read_only: false,
        secure: false,
        max_length: None,
    };

    #[test]
    fn every_action_in_the_table_is_unique_and_a_ui_action() {
        let mut names: Vec<&str> = ACTIONS.iter().map(|(name, _, _)| *name).collect();
        assert!(names.iter().all(|name| name.starts_with("ui_")));
        names.sort_unstable();
        names.dedup();
        assert_eq!(names.len(), ACTIONS.len());
        let mut actions: Vec<_> = ACTIONS
            .iter()
            .map(|(_, action, _)| format!("{action:?}"))
            .collect();
        actions.sort_unstable();
        actions.dedup();
        assert_eq!(actions.len(), ACTIONS.len(), "each action has one name");
    }

    #[test]
    fn shift_extends_movements_and_means_nothing_to_edits() {
        let left = request_for(TextAction::CaretLeft, true, SINGLE);
        assert_eq!(
            left,
            KeyRequest::Edit(EditCommand::MoveGrapheme {
                direction: Direction::Backward,
                extend: true
            })
        );
        let plain = request_for(TextAction::CaretWordRight, false, SINGLE);
        assert_eq!(
            plain,
            KeyRequest::Edit(EditCommand::MoveWord {
                direction: Direction::Forward,
                extend: false
            })
        );
        // Shift is part of the key an edit is bound to, not an extension.
        assert_eq!(
            request_for(TextAction::Backspace, true, SINGLE),
            KeyRequest::Edit(EditCommand::DeleteGrapheme(Direction::Backward))
        );
    }

    #[test]
    fn a_read_only_input_cuts_as_a_copy() {
        let read_only = EditConfig {
            read_only: true,
            ..SINGLE
        };
        assert_eq!(
            request_for(TextAction::Cut, false, read_only),
            KeyRequest::Edit(EditCommand::Copy)
        );
        assert_eq!(
            request_for(TextAction::Cut, false, SINGLE),
            KeyRequest::Edit(EditCommand::Cut)
        );
    }

    #[test]
    fn enter_submits_one_line_and_is_a_line_break_in_many() {
        assert_eq!(
            request_for(TextAction::Submit, false, SINGLE),
            KeyRequest::Submit
        );
        assert_eq!(
            request_for(TextAction::Newline, false, SINGLE),
            KeyRequest::Edit(EditCommand::InsertLineBreak)
        );
    }

    #[test]
    fn a_key_types_when_it_has_a_character_and_no_chord_modifier() {
        assert_eq!(
            typed_text('a' as u32, false, false, false).as_deref(),
            Some("a")
        );
        assert_eq!(
            typed_text('😀' as u32, false, false, false).as_deref(),
            Some("😀")
        );
        assert_eq!(
            typed_text(' ' as u32, false, false, false).as_deref(),
            Some(" ")
        );
        // Control characters (Backspace 8, Tab 9, Enter 13, Escape 27) type nothing.
        for control in [0, 8, 9, 13, 27, 31] {
            assert_eq!(typed_text(control, false, false, false), None, "{control}");
        }
        assert_eq!(typed_text('c' as u32, true, false, false), None);
        assert_eq!(typed_text('c' as u32, false, true, false), None);
        assert_eq!(typed_text('c' as u32, false, false, true), None);
        // A surrogate code point is not a character.
        assert_eq!(typed_text(0xD800, false, false, false), None);
    }
}
