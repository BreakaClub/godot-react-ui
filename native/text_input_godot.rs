//! `<TextInput>` on the mounted tree (plan section 3.18): the glue between the Godot-free edit
//! buffer (`text_input.rs`), the text layout (`text_layout.rs`) and the root's input, events and
//! painting. A text input is one mounted node with no children; its text, selection, undo history
//! and composition live in a [`TextInputState`] per tag, which survives the clones React makes.
//!
//! Where things are:
//! - `shaping.rs`: font metrics, the size a text input measures at (never a function of its value),
//!   the display and placeholder paragraphs, and the layouts built from them.
//! - `keys.rs`: the `InputMap` actions a key press can be (Appendix C) and what each asks of the
//!   buffer; the part that needs no engine is unit tested.
//! - `pipeline.rs`: running one command (`beforeinput`, apply, `input`, `selectionchange`) and the
//!   commands JS gives (`set_text_and_selection`, `set_text_selection`, `get_text_input_state`).
//! - `pointer.rs`: placing the caret, selecting by click count and by dragging.
//! - `paint.rs`: the selection, text, preedit underline and caret in the node's scroll item, and the
//!   caret's blink.
//! - `platform.rs`: the IME window, the virtual keyboard and the clipboard.
//! - `web_clipboard.rs`: a paste on the Web, which the browser answers later.
//! - `accessibility.rs`: a text input's text elements, selection and actions for assistive technologies.
//!
//! # Rules
//!
//! - **The buffer's text is the truth.** What is drawn is its display text (the text with the IME
//!   preedit spliced in, or bullets for a secure input); edits, boundaries and line moves are always
//!   asked of a layout of the buffer's own text, so a password's spaces and a composition's preedit
//!   never reach `TextServer`'s idea of where a grapheme or a word ends.
//! - **Nothing is guessed.** A [`TextInputError`] (a layout that cannot be built, a boundary the
//!   server got wrong) is logged as an `ERROR` line and the command does nothing. There is no
//!   fallback caret position.
//! - **Typing does not lay out.** The measured size of a text input never depends on its value
//!   (`shaping::Metrics::intrinsic_size`), so an edit changes paint and scroll ranges only.
//! - **The scroll item scrolls the text.** A text input paints into the `scroll` item of its render
//!   node, so following the caret is a transform. A single-line input scrolls horizontally, a
//!   multi-line one vertically (it is also a scroll container for wheel, touch and thumb dragging;
//!   key scrolling never applies to an input, because its keys move the caret).

mod accessibility;
mod keys;
mod paint;
mod pipeline;
mod platform;
mod pointer;
mod shaping;
mod web_clipboard;

use std::fmt;

use godot::classes::TextParagraph;
use godot::prelude::*;

use crate::text_input::{EditBuffer, EditConfig, EditError};
use crate::text_layout::{TextDirection, TextLayoutError};
use crate::text_offsets::OffsetError;

pub(crate) use accessibility::{TextLines, ax_text_field};
pub(crate) use keys::TextActionTable;
pub(crate) use paint::GhostText;
pub(crate) use pipeline::TextCommandOutcome;
pub(crate) use pointer::TextDrag;
pub(crate) use shaping::scroll_ranges;
pub(crate) use web_clipboard::WebClipboard;

/// What `set_text_and_selection` returns for a command it ignored because its `eventCount` was old
/// (the user typed first). An applied command returns "" and an error returns its message.
pub(crate) const STALE_COMMAND: &str = "stale";

/// How long the caret stays on and off while an input is focused, in seconds: `LineEdit`'s
/// `caret_blink_interval` (`scene/gui/line_edit.h:200`).
pub(crate) const CARET_BLINK_INTERVAL_SECONDS: f64 = 0.65;
/// The caret's width in pixels: `LineEdit`'s default theme `caret_width`.
pub(crate) const CARET_WIDTH_PX: f32 = 1.0;
/// A single-line input is this many `0` advances wide (HTML's `size` default), and a multi-line one
/// this many rows tall until `rows` says otherwise.
pub(crate) const TEXT_INPUT_DEFAULT_COLUMNS: f32 = 20.0;
pub(crate) const TEXT_AREA_DEFAULT_ROWS: u32 = 2;
/// What a secure input draws for each code point of its text.
pub(crate) const SECURE_TEXT_BULLET: char = '\u{2022}';
/// Blue-500 at 35 %: the selection when nothing styles it (plan Appendix A).
pub(crate) const DEFAULT_SELECTION_COLOR: &str = "#3b82f659";
/// A placeholder is the text colour at this alpha when `placeholderColor` is not set.
pub(crate) const DEFAULT_PLACEHOLDER_ALPHA: f32 = 0.5;

/// Why a command on a text input could not run. Logged, never hidden: the input is left as it was.
#[derive(Debug)]
pub(crate) enum TextInputError {
    /// The root has no theme font yet (it has not been ready), so nothing can be shaped.
    NotShaped,
    Layout(TextLayoutError),
    Edit(EditError),
    Offset(OffsetError),
}

impl fmt::Display for TextInputError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TextInputError::NotShaped => {
                formatter.write_str("the text input has not been shaped (the root has no font yet)")
            }
            TextInputError::Layout(error) => write!(formatter, "text layout: {error}"),
            TextInputError::Edit(error) => write!(formatter, "edit buffer: {error}"),
            TextInputError::Offset(error) => write!(formatter, "text offset: {error}"),
        }
    }
}

impl From<TextLayoutError> for TextInputError {
    fn from(error: TextLayoutError) -> Self {
        TextInputError::Layout(error)
    }
}

impl From<EditError> for TextInputError {
    fn from(error: EditError) -> Self {
        TextInputError::Edit(error)
    }
}

impl From<OffsetError> for TextInputError {
    fn from(error: OffsetError) -> Self {
        TextInputError::Offset(error)
    }
}

/// The caret's blink: on for [`CARET_BLINK_INTERVAL_SECONDS`], then off for as long, restarting
/// (on) at every key press or click on the input.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct CaretBlink {
    pub(crate) visible: bool,
    elapsed: f64,
}

impl CaretBlink {
    pub(crate) const RESTARTED: Self = Self {
        visible: true,
        elapsed: 0.0,
    };

    /// Advance by `delta` seconds. Returns whether the caret changed between on and off.
    pub(crate) fn tick(&mut self, delta: f64) -> bool {
        self.elapsed += delta;
        if self.elapsed < CARET_BLINK_INTERVAL_SECONDS {
            return false;
        }
        self.elapsed = 0.0;
        self.visible = !self.visible;
        true
    }

    /// Show the caret and start its on-period over. Returns whether it was off.
    pub(crate) fn restart(&mut self) -> bool {
        let was_hidden = !self.visible;
        *self = Self::RESTARTED;
        was_hidden
    }
}

/// The paragraphs a text input draws and edits against, shaped from its current text.
pub(crate) struct Shaped {
    /// The display text: the buffer's text with the preedit spliced in, or its bullets.
    pub(crate) display: Gd<TextParagraph>,
    /// The placeholder, shaped when the input has one.
    pub(crate) placeholder: Option<Gd<TextParagraph>>,
    /// The font size both were shaped at.
    pub(crate) font_size: i32,
}

/// Everything native keeps for one text input, per tag.
pub(crate) struct TextInputState {
    pub(crate) buffer: EditBuffer,
    /// Which way the next typed text goes at a change of direction (`LineEdit`: left to right at
    /// the start, then the dominant direction of what was inserted, `line_edit.cpp:2430-2439`).
    pub(crate) input_direction: TextDirection,
    pub(crate) shaped: Option<Shaped>,
    /// The selection (UTF-16, ordered) of the last `selectionchange` JS was sent; the next one is
    /// due when the selection differs.
    pub(crate) reported_selection: (usize, usize),
    /// The size layout was last told this input measures at.
    pub(crate) intrinsic: Option<Vector2>,
    pub(crate) blink: CaretBlink,
    /// Bumped whenever what the text item draws changes (text, selection, preedit, styling).
    pub(crate) generation: u64,
    /// A pointer press focused the input and `selectTextOnFocus` selected everything: the click that
    /// did must not collapse the selection to a caret.
    pub(crate) selected_by_focusing_press: bool,
}

impl TextInputState {
    /// A text input holding `default_value` with the caret at its end. A single-line input keeps no
    /// line breaks, as the DOM's value sanitization says.
    pub(crate) fn new(config: EditConfig, default_value: &str) -> Self {
        let value = sanitize_value(default_value, config.multiline);
        let buffer = EditBuffer::with_text(config, &value);
        let reported_selection = buffer.selection_utf16();
        Self {
            buffer,
            input_direction: TextDirection::Ltr,
            shaped: None,
            reported_selection,
            intrinsic: None,
            blink: CaretBlink::RESTARTED,
            generation: 0,
            selected_by_focusing_press: false,
        }
    }
}

impl TextInputState {
    /// The offset of the display text the caret is drawn at: the buffer's focus, or, while an IME
    /// composes, where its conversion starts inside the preedit (`LineEdit::get_caret_pixel_pos`,
    /// `line_edit.cpp:1984-1988`).
    pub(crate) fn caret_display_offset(&self) -> usize {
        match self.buffer.composition() {
            Some(composition) => self.buffer.focus() + composition.selection().start,
            None => self.buffer.focus(),
        }
    }

    /// The offsets of the display text that scrolling must keep in view: the caret alone, or the span
    /// from where an IME's conversion starts to where it ends (the end of the preedit when nothing is
    /// being converted), `line_edit.cpp:1984-2009`.
    pub(crate) fn caret_display_span(&self) -> (usize, usize) {
        let start = self.caret_display_offset();
        match self.buffer.composition() {
            Some(composition) => {
                let selected = composition.selection();
                let end = if selected.is_empty() {
                    self.buffer.focus() + composition.text().len()
                } else {
                    self.buffer.focus() + selected.end
                };
                (start, end.max(start))
            }
            None => (start, start),
        }
    }
}

/// A value as a text input stores it when it is given rather than typed: a single-line input has no
/// line breaks, a multi-line one only `\n` (`\r\n` and `\r` become one).
pub(crate) fn sanitize_value(value: &str, multiline: bool) -> String {
    let mut sanitized = String::with_capacity(value.len());
    let mut characters = value.chars().peekable();
    while let Some(character) = characters.next() {
        match character {
            '\r' => {
                if characters.peek() == Some(&'\n') {
                    characters.next();
                }
                if multiline {
                    sanitized.push('\n');
                }
            }
            '\n' => {
                if multiline {
                    sanitized.push('\n');
                }
            }
            other => sanitized.push(other),
        }
    }
    sanitized
}

/// Root-wide text input state: what is not per tag.
#[derive(Default)]
pub(crate) struct TextInputRoot {
    /// A drag that began on a text input and is extending its selection.
    pub(crate) drag: Option<TextDrag>,
    /// False while the OS window is known to be unfocused: the caret is not drawn.
    pub(crate) window_unfocused: bool,
    pub(crate) actions: TextActionTable,
    /// The clipboard reads the browser has yet to answer (the Web only).
    pub(crate) web_clipboard: WebClipboard,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_caret_blinks_on_the_interval_and_a_key_press_restarts_it() {
        let mut blink = CaretBlink::RESTARTED;
        assert!(blink.visible);
        assert!(!blink.tick(CARET_BLINK_INTERVAL_SECONDS / 2.0), "still on");
        assert!(
            blink.tick(CARET_BLINK_INTERVAL_SECONDS / 2.0),
            "the interval ends"
        );
        assert!(!blink.visible);
        assert!(!blink.tick(0.1));
        assert!(blink.restart(), "it was off");
        assert!(blink.visible);
        assert!(!blink.restart(), "already on");
        assert!(
            !blink.tick(CARET_BLINK_INTERVAL_SECONDS - 0.01),
            "the period started over"
        );
    }

    #[test]
    fn a_given_value_loses_line_breaks_by_the_inputs_kind() {
        assert_eq!(sanitize_value("a\r\nb\rc\nd", false), "abcd");
        assert_eq!(sanitize_value("a\r\nb\rc\nd", true), "a\nb\nc\nd");
        assert_eq!(sanitize_value("héllo 👩‍👩‍👧", false), "héllo 👩‍👩‍👧");
    }

    #[test]
    fn a_new_input_holds_its_default_with_the_caret_at_the_end() {
        let state = TextInputState::new(
            EditConfig {
                multiline: false,
                ..EditConfig::default()
            },
            "ab\ncd",
        );
        assert_eq!(state.buffer.value(), "abcd");
        assert_eq!(state.buffer.selection_utf16(), (4, 4));
        assert_eq!(state.reported_selection, (4, 4));
    }
}
