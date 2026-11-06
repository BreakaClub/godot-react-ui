//! The text input edit buffer (plan section 3.18, Appendix C): the text, the selection, the undo
//! history and the IME composition of one `<TextInput>`, with no Godot types. Phase I7 resolves a
//! key or a pointer gesture to an [`EditCommand`], dispatches `beforeinput`, then calls
//! [`EditBuffer::apply`] and turns the [`EditResult`] into `input`, `selectionchange` and
//! `composition*` events.
//!
//! Offsets are code point indices into `Vec<char>` (what `TextServer` returns). `maxLength` is the
//! exception: it is counted in UTF-16 code units, as the DOM does. Convert offsets that cross to JS
//! with `text_offsets.rs`; [`EditBuffer::selection_utf16`] and [`EditBuffer::utf16_length`] do the
//! `input` event's numbers.
//!
//! # Public API
//!
//! - [`EditConfig`] and [`EditBuffer::new`] / [`EditBuffer::with_text`]: `multiline` is fixed at
//!   creation; `readOnly`, `secure` and `maxLength` change through [`EditBuffer::set_read_only`],
//!   [`EditBuffer::set_secure`] and [`EditBuffer::set_max_length`]. Lowering `maxLength` never
//!   truncates the text (the DOM does not); it only blocks insertions.
//! - [`EditBuffer::apply`]`(command, &`[`EditEnvironment`]`)` returns an [`EditResult`]:
//!   - `text_changed`, `input_type` and `data`: an `input` event is due exactly when `text_changed` is
//!     set, and `input_type`/`data` are its fields (`data` is the text actually inserted, after
//!     `maxLength` and line break handling, for the `insert*` types and `None` otherwise).
//!   - `selection_changed`: a `selectionchange` is due.
//!   - `clipboard`: [`ClipboardEffect::Write`] (copy, cut) or [`ClipboardEffect::Read`] (paste:
//!     read the clipboard, then apply [`EditCommand::PasteText`]). The buffer never touches a clipboard.
//!   - `composition`: which `compositionstart`/`compositionupdate`/`compositionend` is due.
//!   - `blocked`: why a command did nothing (read-only, secure, no room under `maxLength`, ...).
//!   - `event_count`: the buffer's [`EditBuffer::event_count`] after the command.
//!   - [`EditBuffer::check_allowed`] answers `blocked` without applying, so the host can skip
//!     `beforeinput` for a command that cannot run. [`EditCommand::input_type`] and
//!     [`EditCommand::data`] are the `beforeinput` fields.
//! - [`EditBuffer::set_text_and_selection`]`(event_count, value, selection)`: React Native's
//!   `setTextAndSelection`. Ignored as [`SetTextOutcome::Stale`] unless `event_count` equals the
//!   buffer's current count.
//! - Reading: [`EditBuffer::text`], [`EditBuffer::value`], [`EditBuffer::anchor`],
//!   [`EditBuffer::focus`], [`EditBuffer::selection_range`], [`EditBuffer::has_selection`],
//!   [`EditBuffer::composition`], [`EditBuffer::display_text`] (the text with the preedit spliced in
//!   at the caret, for shaping) and [`EditBuffer::preedit_range`] (where the preedit is in it).
//! - Injection: [`TextBoundaries`] (grapheme and word boundaries) and [`LineLayout`] (offset to line
//!   and x, multi-line only) are traits the caller implements over `TextServer` / `TextParagraph`.
//!   [`BoundaryLists`] adapts precomputed lists. Every answer is validated; a bad one is an
//!   [`EditError`] and the buffer is left as it was.
//!
//! # Rules
//!
//! - An edit pushes the state before it onto the undo stack (at most [`UNDO_LIMIT`] entries, oldest
//!   dropped), clears the redo stack and bumps the event count. Consecutive `InsertText` commands
//!   coalesce into the entry of the first, as long as each inserted text contains no white space,
//!   replaces no selection and continues at the caret where the previous insert ended. White space
//!   never coalesces (neither into the entry before it nor with the insert after it), and any
//!   other command, movement and selection change included, ends the run. (A copy and a paste
//!   request change nothing, so they do not.)
//! - The event count increases by one for every command whose result has `text_changed`, and
//!   only then. Selection changes, IME preedit updates and `set_text_and_selection` do not count.
//! - `readOnly` blocks every command that edits the text, and composition. It allows movement,
//!   selection and copy. `secure` blocks copy and cut entirely, and makes a word the whole text so
//!   that caret jumps and double clicks do not reveal where the words are.
//! - A composition's preedit is kept apart from the text (it is not in [`EditBuffer::text`] and
//!   not under `maxLength`). The first non-empty update deletes the selection, like `LineEdit`. The
//!   commit is a normal `InsertText`, which ends the composition first. While composing, only the
//!   IME commands, `InsertText`, and the pointer commands (`SetSelection`, `SelectWordAt`, which
//!   cancel the composition) run; keyboard commands are blocked.
//! - Pasted, inserted and replacement text has its line breaks normalised: a single-line input drops
//!   them, a multi-line one turns `\r\n` and `\r` into `\n`. `set_text_and_selection` text is applied
//!   exactly as given, so that a controlled value round trips.

use std::collections::VecDeque;
use std::ops::Range;

use crate::text_offsets::utf16_length;

/// Entries kept in one input's undo stack (plan Appendix A).
pub(crate) const UNDO_LIMIT: usize = 100;

/// Which way a command goes. For horizontal commands backward is left (or toward the start), for
/// vertical ones it is up, and for an edge it is the start.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Direction {
    Backward,
    Forward,
}

/// The DOM `InputEvent.inputType` values this buffer produces.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum InputType {
    InsertText,
    InsertLineBreak,
    InsertFromPaste,
    InsertReplacementText,
    DeleteContentBackward,
    DeleteContentForward,
    DeleteWordBackward,
    DeleteWordForward,
    DeleteSoftLineBackward,
    DeleteSoftLineForward,
    DeleteByCut,
    HistoryUndo,
    HistoryRedo,
}

impl InputType {
    /// The DOM string.
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            InputType::InsertText => "insertText",
            InputType::InsertLineBreak => "insertLineBreak",
            InputType::InsertFromPaste => "insertFromPaste",
            InputType::InsertReplacementText => "insertReplacementText",
            InputType::DeleteContentBackward => "deleteContentBackward",
            InputType::DeleteContentForward => "deleteContentForward",
            InputType::DeleteWordBackward => "deleteWordBackward",
            InputType::DeleteWordForward => "deleteWordForward",
            InputType::DeleteSoftLineBackward => "deleteSoftLineBackward",
            InputType::DeleteSoftLineForward => "deleteSoftLineForward",
            InputType::DeleteByCut => "deleteByCut",
            InputType::HistoryUndo => "historyUndo",
            InputType::HistoryRedo => "historyRedo",
        }
    }

    /// Whether the DOM event's `data` is the inserted text. (`insertLineBreak` has `data: null`.)
    fn carries_data(self) -> bool {
        match self {
            InputType::InsertText
            | InputType::InsertFromPaste
            | InputType::InsertReplacementText => true,
            InputType::InsertLineBreak
            | InputType::DeleteContentBackward
            | InputType::DeleteContentForward
            | InputType::DeleteWordBackward
            | InputType::DeleteWordForward
            | InputType::DeleteSoftLineBackward
            | InputType::DeleteSoftLineForward
            | InputType::DeleteByCut
            | InputType::HistoryUndo
            | InputType::HistoryRedo => false,
        }
    }
}

/// How much a delete command removes.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum DeleteUnit {
    Grapheme,
    Word,
    /// To the edge of the visual line (a "soft line" in the DOM).
    LineEdge,
}

fn delete_input_type(unit: DeleteUnit, direction: Direction) -> InputType {
    match (unit, direction) {
        (DeleteUnit::Grapheme, Direction::Backward) => InputType::DeleteContentBackward,
        (DeleteUnit::Grapheme, Direction::Forward) => InputType::DeleteContentForward,
        (DeleteUnit::Word, Direction::Backward) => InputType::DeleteWordBackward,
        (DeleteUnit::Word, Direction::Forward) => InputType::DeleteWordForward,
        (DeleteUnit::LineEdge, Direction::Backward) => InputType::DeleteSoftLineBackward,
        (DeleteUnit::LineEdge, Direction::Forward) => InputType::DeleteSoftLineForward,
    }
}

/// One edit, movement or selection change. Appendix C maps `InputMap` actions to these.
#[derive(Clone, Debug, PartialEq)]
pub(crate) enum EditCommand {
    /// Typed or committed text (`ui_text_*` has no action and the key has `unicode >= 32`; an IME
    /// commit). Replaces the selection.
    InsertText(String),
    /// `ui_text_newline`. Multi-line only.
    InsertLineBreak,
    /// Replace the whole text and put the caret at 0: the virtual keyboard's `_set_text`
    /// (`insertReplacementText`).
    ReplaceText(String),
    /// `ui_paste` with the clipboard already read: replaces the selection (`insertFromPaste`).
    PasteText(String),
    /// `ui_paste`: asks the host to read the clipboard ([`ClipboardEffect::Read`]).
    Paste,
    /// `ui_copy`.
    Copy,
    /// `ui_cut`.
    Cut,
    /// `ui_undo`.
    Undo,
    /// `ui_redo`.
    Redo,
    /// `ui_text_select_all`.
    SelectAll,
    /// Double click: select the word at the offset.
    SelectWordAt(usize),
    /// Pointer gestures and `setSelectionRange`: place the anchor and the focus.
    SetSelection { anchor: usize, focus: usize },
    /// `ui_text_backspace` / `ui_text_delete`.
    DeleteGrapheme(Direction),
    /// `ui_text_backspace_word` / `ui_text_delete_word`.
    DeleteWord(Direction),
    /// `ui_text_backspace_all_to_left` / `ui_text_delete_all_to_right`.
    DeleteToLineEdge(Direction),
    /// `ui_text_caret_left` / `ui_text_caret_right`. With a selection and no `extend`, collapses to
    /// that side of it.
    MoveGrapheme { direction: Direction, extend: bool },
    /// `ui_text_caret_word_left` / `ui_text_caret_word_right`.
    MoveWord { direction: Direction, extend: bool },
    /// `ui_text_caret_line_start` / `ui_text_caret_line_end`.
    MoveLineEdge { direction: Direction, extend: bool },
    /// `ui_text_caret_up` / `ui_text_caret_down`, keeping the desired x.
    MoveLine { direction: Direction, extend: bool },
    /// `ui_text_caret_page_up` / `ui_text_caret_page_down`.
    MovePage { direction: Direction, extend: bool },
    /// `ui_text_caret_document_start` / `ui_text_caret_document_end`.
    MoveDocumentEdge { direction: Direction, extend: bool },
    /// The IME's current preedit and the selected part of it (code point offsets into `text`).
    /// Empty text ends the composition, as Godot's `ime_get_text()` does.
    UpdateComposition {
        text: String,
        selection: Range<usize>,
    },
    /// End the composition and drop the preedit (blur, or the IME cancelled).
    CancelComposition,
}

impl EditCommand {
    /// The `inputType` of the `beforeinput` event this command raises, or `None` for a command that
    /// raises none (movement, selection, copy, the paste request, composition).
    pub(crate) fn input_type(&self) -> Option<InputType> {
        match self {
            EditCommand::InsertText(_) => Some(InputType::InsertText),
            EditCommand::InsertLineBreak => Some(InputType::InsertLineBreak),
            EditCommand::ReplaceText(_) => Some(InputType::InsertReplacementText),
            EditCommand::PasteText(_) => Some(InputType::InsertFromPaste),
            EditCommand::Cut => Some(InputType::DeleteByCut),
            EditCommand::Undo => Some(InputType::HistoryUndo),
            EditCommand::Redo => Some(InputType::HistoryRedo),
            EditCommand::DeleteGrapheme(direction) => {
                Some(delete_input_type(DeleteUnit::Grapheme, *direction))
            }
            EditCommand::DeleteWord(direction) => {
                Some(delete_input_type(DeleteUnit::Word, *direction))
            }
            EditCommand::DeleteToLineEdge(direction) => {
                Some(delete_input_type(DeleteUnit::LineEdge, *direction))
            }
            EditCommand::Paste
            | EditCommand::Copy
            | EditCommand::SelectAll
            | EditCommand::SelectWordAt(_)
            | EditCommand::SetSelection { .. }
            | EditCommand::MoveGrapheme { .. }
            | EditCommand::MoveWord { .. }
            | EditCommand::MoveLineEdge { .. }
            | EditCommand::MoveLine { .. }
            | EditCommand::MovePage { .. }
            | EditCommand::MoveDocumentEdge { .. }
            | EditCommand::UpdateComposition { .. }
            | EditCommand::CancelComposition => None,
        }
    }

    /// The `data` of the `beforeinput` event: the text the command carries, as given (before line
    /// break handling and `maxLength`).
    pub(crate) fn data(&self) -> Option<&str> {
        match self {
            EditCommand::InsertText(text)
            | EditCommand::ReplaceText(text)
            | EditCommand::PasteText(text) => Some(text),
            EditCommand::InsertLineBreak
            | EditCommand::Paste
            | EditCommand::Copy
            | EditCommand::Cut
            | EditCommand::Undo
            | EditCommand::Redo
            | EditCommand::SelectAll
            | EditCommand::SelectWordAt(_)
            | EditCommand::SetSelection { .. }
            | EditCommand::DeleteGrapheme(_)
            | EditCommand::DeleteWord(_)
            | EditCommand::DeleteToLineEdge(_)
            | EditCommand::MoveGrapheme { .. }
            | EditCommand::MoveWord { .. }
            | EditCommand::MoveLineEdge { .. }
            | EditCommand::MoveLine { .. }
            | EditCommand::MovePage { .. }
            | EditCommand::MoveDocumentEdge { .. }
            | EditCommand::UpdateComposition { .. }
            | EditCommand::CancelComposition => None,
        }
    }

    fn class(&self) -> CommandClass {
        match self {
            EditCommand::InsertText(_)
            | EditCommand::InsertLineBreak
            | EditCommand::ReplaceText(_)
            | EditCommand::PasteText(_)
            | EditCommand::Paste
            | EditCommand::Cut
            | EditCommand::Undo
            | EditCommand::Redo
            | EditCommand::DeleteGrapheme(_)
            | EditCommand::DeleteWord(_)
            | EditCommand::DeleteToLineEdge(_)
            | EditCommand::UpdateComposition { .. } => CommandClass::Edit,
            EditCommand::Copy => CommandClass::Copy,
            EditCommand::SelectAll
            | EditCommand::MoveGrapheme { .. }
            | EditCommand::MoveWord { .. }
            | EditCommand::MoveLineEdge { .. }
            | EditCommand::MoveLine { .. }
            | EditCommand::MovePage { .. }
            | EditCommand::MoveDocumentEdge { .. } => CommandClass::Keyboard,
            EditCommand::SelectWordAt(_) | EditCommand::SetSelection { .. } => {
                CommandClass::Pointer
            }
            EditCommand::CancelComposition => CommandClass::EndComposition,
        }
    }
}

/// What a command does to the buffer, for deciding whether a mode blocks it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum CommandClass {
    /// Changes the text (or starts a composition, or asks to paste).
    Edit,
    Copy,
    /// Moves or selects with the keyboard.
    Keyboard,
    /// Places the selection from a pointer or from JS; ends a composition.
    Pointer,
    EndComposition,
}

/// Why a command did nothing.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Blocked {
    ReadOnly,
    /// Copy and cut of a `secure` input.
    Secure,
    /// A line break in a single-line input.
    NotMultiline,
    /// A keyboard command while an IME composition is in progress.
    Composing,
    /// The insertion does not fit under `maxLength` at all.
    MaxLength,
}

/// What the host does with the clipboard.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum ClipboardEffect {
    /// Put this text on the clipboard.
    Write(String),
    /// Read the clipboard and apply [`EditCommand::PasteText`] with it.
    Read,
}

/// Which composition event is due.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(crate) enum CompositionEvent {
    #[default]
    None,
    /// `compositionstart`, then `compositionupdate`.
    Start,
    /// `compositionupdate`.
    Update,
    /// `compositionend`.
    End,
}

/// What [`EditBuffer::apply`] did.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct EditResult {
    /// The text changed: an `input` event is due, and the event count went up.
    pub(crate) text_changed: bool,
    /// The anchor or the focus moved: a `selectionchange` is due.
    pub(crate) selection_changed: bool,
    /// `input.inputType`; set exactly when `text_changed` is.
    pub(crate) input_type: Option<InputType>,
    /// `input.data`: the inserted text for an `insert*` type that carries data.
    pub(crate) data: Option<String>,
    pub(crate) clipboard: Option<ClipboardEffect>,
    pub(crate) composition: CompositionEvent,
    pub(crate) blocked: Option<Blocked>,
    /// The buffer's event count after the command.
    pub(crate) event_count: u64,
}

/// What [`EditBuffer::set_text_and_selection`] did.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum SetTextOutcome {
    /// The command carried an old event count (the user typed since), so nothing changed.
    Stale,
    /// Applied. `input_type` and `data` are unset: a programmatic change raises no `input` event.
    Applied(EditResult),
}

/// A malformed answer from the injected text services, or an offset the caller got wrong. The buffer
/// is unchanged when one is returned.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum EditError {
    /// An offset past the end of the text.
    OffsetOutOfRange { offset: usize, len: usize },
    /// A selection range with its start after its end, or a composition selection past the preedit.
    InvalidRange { start: usize, end: usize },
    /// The boundaries or the layout were built for a text of a different length.
    TextMismatch { built_for: usize, buffer: usize },
    /// A multi-line command needs a [`LineLayout`] and the environment has none.
    MissingLayout,
    /// [`BoundaryLists::new`] was given lists that are not sorted, unique and within the text.
    MalformedBoundaryLists,
    /// [`TextBoundaries`] answered with something that is not a boundary of the text.
    InvalidBoundary {
        query: BoundaryQuery,
        offset: usize,
        answer: usize,
    },
    /// [`LineLayout`] answered with something inconsistent.
    InvalidLayout(LayoutProblem),
}

/// Which [`TextBoundaries`] method gave a bad answer.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum BoundaryQuery {
    PreviousGrapheme,
    NextGrapheme,
    PreviousWord,
    NextWord,
    WordRange,
}

/// How a [`LineLayout`] answer was wrong.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum LayoutProblem {
    /// `line_count()` or `page_lines()` was 0.
    Empty,
    /// A line index at or past `line_count()`.
    LineOutOfRange { line: usize, count: usize },
    /// A line range that is backwards or past the end of the text.
    RangeOutsideText { line: usize },
    /// An offset that is not in the line it was asked for.
    OffsetOutsideLine { line: usize, offset: usize },
}

impl std::fmt::Display for EditError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EditError::OffsetOutOfRange { offset, len } => write!(
                formatter,
                "offset {offset} is past the end of the text ({len} code points)"
            ),
            EditError::InvalidRange { start, end } => {
                write!(formatter, "range {start}..{end} is not valid here")
            }
            EditError::TextMismatch { built_for, buffer } => write!(
                formatter,
                "boundaries were built for {built_for} code points but the text has {buffer}"
            ),
            EditError::MissingLayout => {
                formatter.write_str("a multi-line command needs a line layout")
            }
            EditError::MalformedBoundaryLists => {
                formatter.write_str("boundary lists must be strictly increasing and start at 0")
            }
            EditError::InvalidBoundary {
                query,
                offset,
                answer,
            } => write!(
                formatter,
                "{query:?} from {offset} answered {answer}, which is not a boundary it can reach"
            ),
            EditError::InvalidLayout(problem) => {
                write!(formatter, "invalid line layout: {problem:?}")
            }
        }
    }
}

/// Grapheme and word boundaries of the buffer's text, from `TextServer` in the renderer. `text` is
/// the buffer's text at the call. Answers are code point offsets.
pub(crate) trait TextBoundaries {
    /// The start of the grapheme before `offset` (`offset > 0`): the largest boundary below it.
    fn previous_grapheme(&self, text: &[char], offset: usize) -> Result<usize, EditError>;
    /// The end of the grapheme at `offset` (`offset < text.len()`): the smallest boundary above it.
    fn next_grapheme(&self, text: &[char], offset: usize) -> Result<usize, EditError>;
    /// Where the caret lands moving one word backward from `offset` (`offset > 0`), below `offset`.
    fn previous_word(&self, text: &[char], offset: usize) -> Result<usize, EditError>;
    /// Where the caret lands moving one word forward from `offset` (`offset < text.len()`), above it.
    fn next_word(&self, text: &[char], offset: usize) -> Result<usize, EditError>;
    /// The `(start, end)` of the word at `offset`, containing it, for a double click. At the
    /// boundary between two words either is fine; in white space, the white space run.
    fn word_range(&self, text: &[char], offset: usize) -> Result<(usize, usize), EditError>;
}

/// The wrapped lines of a multi-line input, from `TextParagraph` in the renderer. A caret offset
/// belongs to exactly one line: an offset at a soft wrap is on the line after the wrap, and an offset
/// before a hard line break is on the line it ends. Lines are numbered from 0 in text order.
pub(crate) trait LineLayout {
    /// The number of lines, at least 1.
    fn line_count(&self) -> usize;
    /// The line that shows a caret at `offset`.
    fn line_of(&self, offset: usize) -> Result<usize, EditError>;
    /// The first and last caret offsets of `line`, both on it. The last is where End puts the caret.
    fn line_range(&self, line: usize) -> Result<(usize, usize), EditError>;
    /// The x of a caret at `offset` from the left of the text, in logical pixels.
    fn x_of(&self, offset: usize) -> Result<f32, EditError>;
    /// The caret offset on `line` nearest to `x`.
    fn offset_at(&self, line: usize, x: f32) -> Result<usize, EditError>;
    /// How many lines a page move goes, at least 1.
    fn page_lines(&self) -> usize;
}

/// The injected services for one `apply`. The layout is required for multi-line buffers only.
pub(crate) struct EditEnvironment<'a> {
    boundaries: &'a dyn TextBoundaries,
    layout: Option<&'a dyn LineLayout>,
}

impl<'a> EditEnvironment<'a> {
    pub(crate) fn new(boundaries: &'a dyn TextBoundaries) -> Self {
        Self {
            boundaries,
            layout: None,
        }
    }

    pub(crate) fn with_layout(mut self, layout: &'a dyn LineLayout) -> Self {
        self.layout = Some(layout);
        self
    }
}

/// [`TextBoundaries`] from precomputed lists, for a caller that shapes the text once and asks
/// `TextServer` for every boundary up front. Built for one text: its length is checked on every
/// query, so a list that outlived an edit is an error, not a wrong answer.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct BoundaryLists {
    /// Every grapheme boundary, `0` first and the text length last, strictly increasing.
    graphemes: Vec<usize>,
    /// The `(start, end)` of each word, sorted, not overlapping, `start < end`.
    words: Vec<(usize, usize)>,
}

impl BoundaryLists {
    pub(crate) fn new(
        graphemes: Vec<usize>,
        words: Vec<(usize, usize)>,
    ) -> Result<Self, EditError> {
        let text_len = match graphemes.as_slice() {
            [0, .., last] => *last,
            [0] => 0,
            _ => return Err(EditError::MalformedBoundaryLists),
        };
        let increasing = graphemes.windows(2).all(|pair| pair[0] < pair[1]);
        let words_in_order = words
            .iter()
            .all(|(start, end)| start < end && *end <= text_len)
            && words.windows(2).all(|pair| pair[0].1 <= pair[1].0);
        if increasing && words_in_order {
            Ok(Self { graphemes, words })
        } else {
            Err(EditError::MalformedBoundaryLists)
        }
    }

    fn check(&self, text: &[char]) -> Result<(), EditError> {
        let built_for = self.graphemes.last().copied().unwrap_or(0);
        if built_for == text.len() {
            Ok(())
        } else {
            Err(EditError::TextMismatch {
                built_for,
                buffer: text.len(),
            })
        }
    }
}

impl TextBoundaries for BoundaryLists {
    fn previous_grapheme(&self, text: &[char], offset: usize) -> Result<usize, EditError> {
        self.check(text)?;
        let below = self
            .graphemes
            .partition_point(|boundary| *boundary < offset);
        Ok(below
            .checked_sub(1)
            .map_or(0, |index| self.graphemes[index]))
    }

    fn next_grapheme(&self, text: &[char], offset: usize) -> Result<usize, EditError> {
        self.check(text)?;
        let through = self
            .graphemes
            .partition_point(|boundary| *boundary <= offset);
        Ok(self.graphemes.get(through).copied().unwrap_or(text.len()))
    }

    fn previous_word(&self, text: &[char], offset: usize) -> Result<usize, EditError> {
        self.check(text)?;
        Ok(self
            .words
            .iter()
            .rev()
            .map(|(start, _)| *start)
            .find(|start| *start < offset)
            .unwrap_or(0))
    }

    fn next_word(&self, text: &[char], offset: usize) -> Result<usize, EditError> {
        self.check(text)?;
        Ok(self
            .words
            .iter()
            .map(|(_, end)| *end)
            .find(|end| *end > offset)
            .unwrap_or(text.len()))
    }

    fn word_range(&self, text: &[char], offset: usize) -> Result<(usize, usize), EditError> {
        self.check(text)?;
        if let Some(word) = self
            .words
            .iter()
            .find(|(start, end)| *start <= offset && offset < *end)
            .or_else(|| self.words.iter().find(|(_, end)| *end == offset))
        {
            return Ok(*word);
        }
        // In the gap between words (or before the first, or after the last).
        let start = self
            .words
            .iter()
            .rev()
            .map(|(_, end)| *end)
            .find(|end| *end <= offset)
            .unwrap_or(0);
        let end = self
            .words
            .iter()
            .map(|(start, _)| *start)
            .find(|start| *start >= offset)
            .unwrap_or(text.len());
        Ok((start, end))
    }
}

/// The input's modes.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(crate) struct EditConfig {
    /// A multi-line input (a text area): line breaks, vertical movement, a [`LineLayout`].
    pub(crate) multiline: bool,
    pub(crate) read_only: bool,
    /// A password: copy and cut blocked, no word structure revealed.
    pub(crate) secure: bool,
    /// The most UTF-16 code units the user may leave the text with, as the DOM's `maxLength`.
    pub(crate) max_length: Option<usize>,
}

/// The IME preedit: text shown at the caret but not yet part of the value.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct Composition {
    text: Vec<char>,
    selection: Range<usize>,
}

impl Composition {
    pub(crate) fn text(&self) -> &[char] {
        &self.text
    }

    /// The part of the preedit the IME is converting, as code point offsets into [`Self::text`].
    pub(crate) fn selection(&self) -> Range<usize> {
        self.selection.clone()
    }
}

/// An undo or redo entry: the whole state before the edit.
#[derive(Clone, Debug, PartialEq, Eq)]
struct Snapshot {
    text: Vec<char>,
    anchor: usize,
    focus: usize,
}

/// Where the caret goes after an edit.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum CaretAfter {
    /// After the inserted text (at the start of the range for a deletion).
    Insertion,
    At(usize),
}

/// One splice of the text, with what to report and remember about it.
struct Edit {
    range: Range<usize>,
    insertion: Vec<char>,
    input_type: InputType,
    /// Joins the undo entry of the insert before it, if that one ended at this caret.
    coalesce: bool,
    caret: CaretAfter,
}

/// The text, selection, history and composition of one text input.
#[derive(Clone, Debug)]
pub(crate) struct EditBuffer {
    config: EditConfig,
    text: Vec<char>,
    anchor: usize,
    focus: usize,
    composition: Option<Composition>,
    /// Oldest first.
    undo: VecDeque<Snapshot>,
    redo: Vec<Snapshot>,
    event_count: u64,
    /// The x that consecutive vertical moves aim for.
    desired_x: Option<f32>,
    /// The caret where the last coalescible insert ended; the next insert coalesces if it starts here.
    coalesce_at: Option<usize>,
}

impl EditBuffer {
    pub(crate) fn new(config: EditConfig) -> Self {
        Self {
            config,
            text: Vec::new(),
            anchor: 0,
            focus: 0,
            composition: None,
            undo: VecDeque::new(),
            redo: Vec::new(),
            event_count: 0,
            desired_x: None,
            coalesce_at: None,
        }
    }

    /// A buffer holding `text` (`defaultValue`) with the caret at its end and no history. The text
    /// is taken as given, like [`Self::set_text_and_selection`].
    pub(crate) fn with_text(config: EditConfig, text: &str) -> Self {
        let mut buffer = Self::new(config);
        buffer.text = text.chars().collect();
        buffer.anchor = buffer.text.len();
        buffer.focus = buffer.text.len();
        buffer
    }

    pub(crate) fn config(&self) -> EditConfig {
        self.config
    }

    pub(crate) fn set_read_only(&mut self, read_only: bool) {
        self.config.read_only = read_only;
    }

    pub(crate) fn set_secure(&mut self, secure: bool) {
        self.config.secure = secure;
    }

    pub(crate) fn set_max_length(&mut self, max_length: Option<usize>) {
        self.config.max_length = max_length;
    }

    pub(crate) fn text(&self) -> &[char] {
        &self.text
    }

    pub(crate) fn value(&self) -> String {
        self.text.iter().collect()
    }

    /// The text's length in UTF-16 code units, `value.length` in JS.
    #[cfg_attr(not(test), allow(dead_code))] // JS reads the length from the value it is sent.
    pub(crate) fn utf16_length(&self) -> usize {
        utf16_length(self.text.iter().copied())
    }

    /// Where the selection started (code points).
    pub(crate) fn anchor(&self) -> usize {
        self.anchor
    }

    /// The caret (code points): the end of the selection that moves.
    pub(crate) fn focus(&self) -> usize {
        self.focus
    }

    /// The selected `start..end`, ordered, in code points. Empty when the selection is a caret.
    pub(crate) fn selection_range(&self) -> Range<usize> {
        self.anchor.min(self.focus)..self.anchor.max(self.focus)
    }

    pub(crate) fn has_selection(&self) -> bool {
        self.anchor != self.focus
    }

    /// `selectionStart` and `selectionEnd` in UTF-16 code units, ordered, for the `input` event.
    pub(crate) fn selection_utf16(&self) -> (usize, usize) {
        let selected = self.selection_range();
        let start = utf16_length(self.text[..selected.start].iter().copied());
        let end = start + utf16_length(self.text[selected].iter().copied());
        (start, end)
    }

    /// How many `input` events the text has raised; the `eventCount` JS echoes back.
    pub(crate) fn event_count(&self) -> u64 {
        self.event_count
    }

    pub(crate) fn composition(&self) -> Option<&Composition> {
        self.composition.as_ref()
    }

    /// The text to shape and draw: the text with the preedit inserted at the caret.
    pub(crate) fn display_text(&self) -> Vec<char> {
        let Some(composition) = &self.composition else {
            return self.text.clone();
        };
        let mut shown = Vec::with_capacity(self.text.len() + composition.text.len());
        shown.extend_from_slice(&self.text[..self.focus]);
        shown.extend_from_slice(&composition.text);
        shown.extend_from_slice(&self.text[self.focus..]);
        shown
    }

    /// Where the preedit sits in [`Self::display_text`].
    pub(crate) fn preedit_range(&self) -> Option<Range<usize>> {
        self.composition
            .as_ref()
            .map(|composition| self.focus..self.focus + composition.text.len())
    }

    /// Why `command` would do nothing in the current mode, or `None` if it can run.
    pub(crate) fn check_allowed(&self, command: &EditCommand) -> Option<Blocked> {
        let class = command.class();
        if self.config.secure && matches!(command, EditCommand::Copy | EditCommand::Cut) {
            return Some(Blocked::Secure);
        }
        if self.config.read_only && class == CommandClass::Edit {
            return Some(Blocked::ReadOnly);
        }
        if matches!(command, EditCommand::InsertLineBreak) && !self.config.multiline {
            return Some(Blocked::NotMultiline);
        }
        if self.composition.is_some() {
            let ime_owns_it =
                matches!(
                    command,
                    EditCommand::InsertText(_) | EditCommand::UpdateComposition { .. }
                ) || matches!(class, CommandClass::Pointer | CommandClass::EndComposition);
            if !ime_owns_it {
                return Some(Blocked::Composing);
            }
        }
        None
    }

    /// Run one command. A command a mode blocks is not an error: it comes back as
    /// `EditResult::blocked`. An `Err` means the caller passed a bad offset or an injected service
    /// answered wrongly; the buffer is as it was.
    pub(crate) fn apply(
        &mut self,
        command: EditCommand,
        environment: &EditEnvironment<'_>,
    ) -> Result<EditResult, EditError> {
        let mut result = EditResult::default();
        if let Some(reason) = self.check_allowed(&command) {
            result.blocked = Some(reason);
            result.event_count = self.event_count;
            return Ok(result);
        }
        let selection_before = (self.anchor, self.focus);
        // Only a vertical move keeps the desired x, and only an insert, a copy and a paste request
        // keep a typing run going. Both are reset after the command, so one that fails leaves
        // them alone with everything else.
        let keeps_desired_x = matches!(
            command,
            EditCommand::MoveLine { .. } | EditCommand::MovePage { .. }
        );
        let keeps_typing_run = matches!(
            command,
            EditCommand::InsertText(_) | EditCommand::Copy | EditCommand::Paste
        );
        self.dispatch(command, environment, &mut result)?;
        if !keeps_desired_x {
            self.desired_x = None;
        }
        if !keeps_typing_run {
            self.coalesce_at = None;
        }
        result.selection_changed = (self.anchor, self.focus) != selection_before;
        if result.text_changed {
            self.event_count += 1;
        }
        result.event_count = self.event_count;
        Ok(result)
    }

    fn dispatch(
        &mut self,
        command: EditCommand,
        environment: &EditEnvironment<'_>,
        result: &mut EditResult,
    ) -> Result<(), EditError> {
        match command {
            EditCommand::InsertText(text) => self.insert_text(&text, result),
            EditCommand::InsertLineBreak => {
                self.insert_over_selection(vec!['\n'], InputType::InsertLineBreak, false, result)
            }
            EditCommand::ReplaceText(text) => {
                let insertion = self.normalise_line_breaks(&text);
                let everything = 0..self.text.len();
                self.insert_over(
                    everything,
                    insertion,
                    InputType::InsertReplacementText,
                    false,
                    CaretAfter::At(0),
                    result,
                );
            }
            EditCommand::PasteText(text) => {
                let insertion = self.normalise_line_breaks(&text);
                self.insert_over_selection(insertion, InputType::InsertFromPaste, false, result);
            }
            EditCommand::Paste => result.clipboard = Some(ClipboardEffect::Read),
            EditCommand::Copy => {
                if self.has_selection() {
                    result.clipboard = Some(ClipboardEffect::Write(self.selected_text()));
                }
            }
            EditCommand::Cut => {
                if self.has_selection() {
                    result.clipboard = Some(ClipboardEffect::Write(self.selected_text()));
                    self.delete(self.selection_range(), InputType::DeleteByCut, result);
                }
            }
            EditCommand::Undo => self.step_history(HistoryStep::Undo, result),
            EditCommand::Redo => self.step_history(HistoryStep::Redo, result),
            EditCommand::SelectAll => {
                self.anchor = 0;
                self.focus = self.text.len();
            }
            EditCommand::SelectWordAt(offset) => {
                self.check_offset(offset)?;
                let (start, end) = if self.config.secure {
                    (0, self.text.len())
                } else {
                    self.word_range(offset, environment)?
                };
                self.end_composition(result);
                self.anchor = start;
                self.focus = end;
            }
            EditCommand::SetSelection { anchor, focus } => {
                self.check_offset(anchor)?;
                self.check_offset(focus)?;
                self.end_composition(result);
                self.anchor = anchor;
                self.focus = focus;
            }
            EditCommand::DeleteGrapheme(direction) => {
                let range = self.range_to_delete(DeleteUnit::Grapheme, direction, environment)?;
                self.delete(
                    range,
                    delete_input_type(DeleteUnit::Grapheme, direction),
                    result,
                );
            }
            EditCommand::DeleteWord(direction) => {
                let range = self.range_to_delete(DeleteUnit::Word, direction, environment)?;
                self.delete(
                    range,
                    delete_input_type(DeleteUnit::Word, direction),
                    result,
                );
            }
            EditCommand::DeleteToLineEdge(direction) => {
                let range = self.range_to_delete(DeleteUnit::LineEdge, direction, environment)?;
                self.delete(
                    range,
                    delete_input_type(DeleteUnit::LineEdge, direction),
                    result,
                );
            }
            EditCommand::MoveGrapheme { direction, extend } => {
                let focus = if !extend && self.has_selection() {
                    let selected = self.selection_range();
                    match direction {
                        Direction::Backward => selected.start,
                        Direction::Forward => selected.end,
                    }
                } else {
                    self.grapheme_step(direction, environment)?
                };
                self.move_focus(focus, extend);
            }
            EditCommand::MoveWord { direction, extend } => {
                let focus = self.word_step(direction, environment)?;
                self.move_focus(focus, extend);
            }
            EditCommand::MoveLineEdge { direction, extend } => {
                let focus = self.line_edge(direction, environment)?;
                self.move_focus(focus, extend);
            }
            EditCommand::MoveLine { direction, extend } => {
                let focus = self.move_lines(direction, LineStep::One, environment)?;
                self.move_focus(focus, extend);
            }
            EditCommand::MovePage { direction, extend } => {
                let focus = self.move_lines(direction, LineStep::Page, environment)?;
                self.move_focus(focus, extend);
            }
            EditCommand::MoveDocumentEdge { direction, extend } => {
                self.move_focus(self.document_edge(direction), extend);
            }
            EditCommand::UpdateComposition { text, selection } => {
                self.update_composition(&text, selection, result)?;
            }
            EditCommand::CancelComposition => self.end_composition(result),
        }
        Ok(())
    }

    /// Replace the text and selection from JS (React Native's `setTextAndSelection`). Applied only if
    /// `event_count` is the buffer's current count; otherwise the user typed first and the command is
    /// [`SetTextOutcome::Stale`]. `selection` is `start..end` in code points of `value`; without one,
    /// the caret goes to the end. Clears the composition and the undo history; does not change the
    /// event count and raises no `input` event.
    pub(crate) fn set_text_and_selection(
        &mut self,
        event_count: u64,
        value: &str,
        selection: Option<Range<usize>>,
    ) -> Result<SetTextOutcome, EditError> {
        let text: Vec<char> = value.chars().collect();
        let (anchor, focus) = match selection {
            Some(range) if range.start > range.end => {
                return Err(EditError::InvalidRange {
                    start: range.start,
                    end: range.end,
                });
            }
            Some(range) if range.end > text.len() => {
                return Err(EditError::OffsetOutOfRange {
                    offset: range.end,
                    len: text.len(),
                });
            }
            Some(range) => (range.start, range.end),
            None => (text.len(), text.len()),
        };
        if event_count != self.event_count {
            return Ok(SetTextOutcome::Stale);
        }
        let mut result = EditResult {
            text_changed: text != self.text,
            selection_changed: (anchor, focus) != (self.anchor, self.focus),
            ..EditResult::default()
        };
        self.end_composition(&mut result);
        self.text = text;
        self.anchor = anchor;
        self.focus = focus;
        self.undo.clear();
        self.redo.clear();
        self.desired_x = None;
        self.coalesce_at = None;
        result.event_count = self.event_count;
        Ok(SetTextOutcome::Applied(result))
    }

    // ---- text ----

    fn selected_text(&self) -> String {
        self.text[self.selection_range()].iter().collect()
    }

    fn check_offset(&self, offset: usize) -> Result<(), EditError> {
        if offset <= self.text.len() {
            Ok(())
        } else {
            Err(EditError::OffsetOutOfRange {
                offset,
                len: self.text.len(),
            })
        }
    }

    /// Line breaks as this input stores them: none in a single-line input, `\n` only in a
    /// multi-line one.
    fn normalise_line_breaks(&self, text: &str) -> Vec<char> {
        let mut normalised = Vec::with_capacity(text.len());
        let mut characters = text.chars().peekable();
        while let Some(character) = characters.next() {
            match character {
                '\r' => {
                    if characters.peek() == Some(&'\n') {
                        characters.next();
                    }
                    if self.config.multiline {
                        normalised.push('\n');
                    }
                }
                '\n' => {
                    if self.config.multiline {
                        normalised.push('\n');
                    }
                }
                other => normalised.push(other),
            }
        }
        normalised
    }

    /// The longest prefix of `insertion` that fits under `maxLength` when it replaces `replaced`.
    /// Never splits a surrogate pair (a character that does not fit ends the prefix).
    fn fit(&self, replaced: &Range<usize>, mut insertion: Vec<char>) -> Vec<char> {
        let Some(max_length) = self.config.max_length else {
            return insertion;
        };
        let kept = utf16_length(self.text[..replaced.start].iter().copied())
            + utf16_length(self.text[replaced.end..].iter().copied());
        let room = max_length.saturating_sub(kept);
        let mut used = 0;
        let fitting = insertion
            .iter()
            .take_while(|character| {
                used += character.len_utf16();
                used <= room
            })
            .count();
        insertion.truncate(fitting);
        insertion
    }

    fn insert_text(&mut self, text: &str, result: &mut EditResult) {
        // The commit of a composition: the preedit was never in the text, so it only has to end.
        self.end_composition(result);
        let insertion = self.normalise_line_breaks(text);
        if insertion.is_empty() {
            return;
        }
        let coalesce = !insertion.iter().any(|character| character.is_whitespace());
        self.insert_over_selection(insertion, InputType::InsertText, coalesce, result);
    }

    fn insert_over_selection(
        &mut self,
        insertion: Vec<char>,
        input_type: InputType,
        coalesce: bool,
        result: &mut EditResult,
    ) {
        let selected = self.selection_range();
        self.insert_over(
            selected,
            insertion,
            input_type,
            coalesce,
            CaretAfter::Insertion,
            result,
        );
    }

    fn insert_over(
        &mut self,
        range: Range<usize>,
        insertion: Vec<char>,
        input_type: InputType,
        coalesce: bool,
        caret: CaretAfter,
        result: &mut EditResult,
    ) {
        let requested = !insertion.is_empty();
        let fitted = self.fit(&range, insertion);
        if requested && fitted.is_empty() {
            result.blocked = Some(Blocked::MaxLength);
            return;
        }
        if range.is_empty() && fitted.is_empty() {
            return;
        }
        self.edit(
            Edit {
                range,
                insertion: fitted,
                input_type,
                coalesce,
                caret,
            },
            result,
        );
    }

    fn delete(&mut self, range: Range<usize>, input_type: InputType, result: &mut EditResult) {
        if range.is_empty() {
            return;
        }
        self.edit(
            Edit {
                range,
                insertion: Vec::new(),
                input_type,
                coalesce: false,
                caret: CaretAfter::Insertion,
            },
            result,
        );
    }

    /// Splice the text, record undo, and fill in the result.
    fn edit(&mut self, edit: Edit, result: &mut EditResult) {
        let continues_run = edit.coalesce
            && edit.range.is_empty()
            && self.anchor == self.focus
            && self.coalesce_at == Some(self.focus);
        if !continues_run {
            self.push_undo();
        }
        self.redo.clear();
        let caret = match edit.caret {
            CaretAfter::Insertion => edit.range.start + edit.insertion.len(),
            CaretAfter::At(offset) => offset,
        };
        let inserted: String = edit.insertion.iter().collect();
        self.text.splice(edit.range, edit.insertion);
        self.anchor = caret;
        self.focus = caret;
        self.coalesce_at = edit.coalesce.then_some(caret);
        result.text_changed = true;
        result.input_type = Some(edit.input_type);
        result.data = edit.input_type.carries_data().then_some(inserted);
    }

    // ---- history ----

    fn snapshot(&self) -> Snapshot {
        Snapshot {
            text: self.text.clone(),
            anchor: self.anchor,
            focus: self.focus,
        }
    }

    fn push_undo(&mut self) {
        let before = self.snapshot();
        self.push_undo_entry(before);
    }

    fn push_undo_entry(&mut self, entry: Snapshot) {
        if self.undo.len() == UNDO_LIMIT {
            self.undo.pop_front();
        }
        self.undo.push_back(entry);
    }

    fn step_history(&mut self, step: HistoryStep, result: &mut EditResult) {
        let target = match step {
            HistoryStep::Undo => self.undo.pop_back(),
            HistoryStep::Redo => self.redo.pop(),
        };
        let Some(target) = target else {
            return;
        };
        let current = self.snapshot();
        match step {
            HistoryStep::Undo => self.redo.push(current),
            HistoryStep::Redo => self.push_undo_entry(current),
        }
        if target.text != self.text {
            result.text_changed = true;
            result.input_type = Some(match step {
                HistoryStep::Undo => InputType::HistoryUndo,
                HistoryStep::Redo => InputType::HistoryRedo,
            });
        }
        self.text = target.text;
        self.anchor = target.anchor;
        self.focus = target.focus;
    }

    // ---- composition ----

    fn end_composition(&mut self, result: &mut EditResult) {
        if self.composition.take().is_some() {
            result.composition = CompositionEvent::End;
        }
    }

    fn update_composition(
        &mut self,
        text: &str,
        selection: Range<usize>,
        result: &mut EditResult,
    ) -> Result<(), EditError> {
        let preedit: Vec<char> = text.chars().collect();
        if selection.start > selection.end || selection.end > preedit.len() {
            return Err(EditError::InvalidRange {
                start: selection.start,
                end: selection.end,
            });
        }
        if preedit.is_empty() {
            self.end_composition(result);
            return Ok(());
        }
        let update = Composition {
            text: preedit,
            selection,
        };
        match &self.composition {
            Some(current) if *current == update => {}
            Some(_) => {
                self.composition = Some(update);
                result.composition = CompositionEvent::Update;
            }
            None => {
                // Like `LineEdit`, the preedit replaces the selection.
                self.delete(
                    self.selection_range(),
                    InputType::DeleteContentBackward,
                    result,
                );
                self.composition = Some(update);
                result.composition = CompositionEvent::Start;
            }
        }
        Ok(())
    }

    // ---- navigation ----

    fn move_focus(&mut self, focus: usize, extend: bool) {
        self.focus = focus;
        if !extend {
            self.anchor = focus;
        }
    }

    fn document_edge(&self, direction: Direction) -> usize {
        match direction {
            Direction::Backward => 0,
            Direction::Forward => self.text.len(),
        }
    }

    fn invalid_boundary(query: BoundaryQuery, offset: usize, answer: usize) -> EditError {
        EditError::InvalidBoundary {
            query,
            offset,
            answer,
        }
    }

    /// The focus one grapheme in `direction`, or where it is at the end of the text.
    fn grapheme_step(
        &self,
        direction: Direction,
        environment: &EditEnvironment<'_>,
    ) -> Result<usize, EditError> {
        let offset = self.focus;
        match direction {
            Direction::Backward if offset == 0 => Ok(0),
            Direction::Forward if offset == self.text.len() => Ok(offset),
            Direction::Backward => {
                let answer = environment
                    .boundaries
                    .previous_grapheme(&self.text, offset)?;
                if answer < offset {
                    Ok(answer)
                } else {
                    Err(Self::invalid_boundary(
                        BoundaryQuery::PreviousGrapheme,
                        offset,
                        answer,
                    ))
                }
            }
            Direction::Forward => {
                let answer = environment.boundaries.next_grapheme(&self.text, offset)?;
                if answer > offset && answer <= self.text.len() {
                    Ok(answer)
                } else {
                    Err(Self::invalid_boundary(
                        BoundaryQuery::NextGrapheme,
                        offset,
                        answer,
                    ))
                }
            }
        }
    }

    /// The focus one word in `direction`. A secure input has no words to reveal: it is the edge.
    fn word_step(
        &self,
        direction: Direction,
        environment: &EditEnvironment<'_>,
    ) -> Result<usize, EditError> {
        let offset = self.focus;
        if self.config.secure {
            return Ok(self.document_edge(direction));
        }
        match direction {
            Direction::Backward if offset == 0 => Ok(0),
            Direction::Forward if offset == self.text.len() => Ok(offset),
            Direction::Backward => {
                let answer = environment.boundaries.previous_word(&self.text, offset)?;
                if answer < offset {
                    Ok(answer)
                } else {
                    Err(Self::invalid_boundary(
                        BoundaryQuery::PreviousWord,
                        offset,
                        answer,
                    ))
                }
            }
            Direction::Forward => {
                let answer = environment.boundaries.next_word(&self.text, offset)?;
                if answer > offset && answer <= self.text.len() {
                    Ok(answer)
                } else {
                    Err(Self::invalid_boundary(
                        BoundaryQuery::NextWord,
                        offset,
                        answer,
                    ))
                }
            }
        }
    }

    fn word_range(
        &self,
        offset: usize,
        environment: &EditEnvironment<'_>,
    ) -> Result<(usize, usize), EditError> {
        let (start, end) = environment.boundaries.word_range(&self.text, offset)?;
        if start <= offset && offset <= end && end <= self.text.len() {
            Ok((start, end))
        } else {
            Err(Self::invalid_boundary(
                BoundaryQuery::WordRange,
                offset,
                if start > offset { start } else { end },
            ))
        }
    }

    /// The layout of a multi-line buffer; `None` for a single-line one, whose only line is the text.
    fn layout<'a>(
        &self,
        environment: &EditEnvironment<'a>,
    ) -> Result<Option<&'a dyn LineLayout>, EditError> {
        if !self.config.multiline {
            return Ok(None);
        }
        let layout = environment.layout.ok_or(EditError::MissingLayout)?;
        if layout.line_count() == 0 {
            return Err(EditError::InvalidLayout(LayoutProblem::Empty));
        }
        Ok(Some(layout))
    }

    fn checked_line(layout: &dyn LineLayout, offset: usize) -> Result<usize, EditError> {
        let line = layout.line_of(offset)?;
        let count = layout.line_count();
        if line < count {
            Ok(line)
        } else {
            Err(EditError::InvalidLayout(LayoutProblem::LineOutOfRange {
                line,
                count,
            }))
        }
    }

    fn checked_line_range(
        &self,
        layout: &dyn LineLayout,
        line: usize,
    ) -> Result<(usize, usize), EditError> {
        let (start, end) = layout.line_range(line)?;
        if start <= end && end <= self.text.len() {
            Ok((start, end))
        } else {
            Err(EditError::InvalidLayout(LayoutProblem::RangeOutsideText {
                line,
            }))
        }
    }

    /// The edge of the focus's visual line in `direction`. A single-line input has one line.
    fn line_edge(
        &self,
        direction: Direction,
        environment: &EditEnvironment<'_>,
    ) -> Result<usize, EditError> {
        let Some(layout) = self.layout(environment)? else {
            return Ok(self.document_edge(direction));
        };
        let line = Self::checked_line(layout, self.focus)?;
        let (start, end) = self.checked_line_range(layout, line)?;
        Ok(match direction {
            Direction::Backward => start,
            Direction::Forward => end,
        })
    }

    /// Up or down by one line or one page, aiming for the desired x. Past the first or last line
    /// the caret goes to the start or end of the text, as in browsers. A single-line input has
    /// no other line, so it goes there at once.
    fn move_lines(
        &mut self,
        direction: Direction,
        step: LineStep,
        environment: &EditEnvironment<'_>,
    ) -> Result<usize, EditError> {
        let Some(layout) = self.layout(environment)? else {
            return Ok(self.document_edge(direction));
        };
        let line = Self::checked_line(layout, self.focus)?;
        let count = layout.line_count();
        let lines = match step {
            LineStep::One => 1,
            LineStep::Page => match layout.page_lines() {
                0 => return Err(EditError::InvalidLayout(LayoutProblem::Empty)),
                page => page,
            },
        };
        let x = match self.desired_x {
            Some(x) => x,
            None => layout.x_of(self.focus)?,
        };
        let target = match direction {
            Direction::Backward => line.saturating_sub(lines),
            Direction::Forward => (line + lines).min(count - 1),
        };
        let focus = if target == line {
            self.document_edge(direction)
        } else {
            let (start, end) = self.checked_line_range(layout, target)?;
            let offset = layout.offset_at(target, x)?;
            if offset < start || offset > end {
                return Err(EditError::InvalidLayout(LayoutProblem::OffsetOutsideLine {
                    line: target,
                    offset,
                }));
            }
            offset
        };
        self.desired_x = Some(x);
        Ok(focus)
    }

    /// What a delete command removes: the selection if there is one, else the grapheme, word or
    /// line part on the `direction` side of the caret.
    fn range_to_delete(
        &self,
        unit: DeleteUnit,
        direction: Direction,
        environment: &EditEnvironment<'_>,
    ) -> Result<Range<usize>, EditError> {
        if self.has_selection() {
            return Ok(self.selection_range());
        }
        let target = match unit {
            DeleteUnit::Grapheme => self.grapheme_step(direction, environment)?,
            DeleteUnit::Word => self.word_step(direction, environment)?,
            DeleteUnit::LineEdge => self.line_edge(direction, environment)?,
        };
        Ok(self.focus.min(target)..self.focus.max(target))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum HistoryStep {
    Undo,
    Redo,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum LineStep {
    One,
    Page,
}

#[cfg(test)]
mod tests;
