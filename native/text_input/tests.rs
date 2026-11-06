//! Unit tests for the edit buffer. The injected text services are fakes: boundaries computed from the
//! text (a combining mark or a ZWJ joins a grapheme; a word is a run of non-space characters) and a
//! monospace layout that wraps at a fixed number of columns.

use super::*;

/// "a", a family emoji (man, ZWJ, woman, ZWJ, girl: five code points, one grapheme), "b".
const FAMILY_TEXT: &str = "a\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}b";
/// Code points of the family emoji in [`FAMILY_TEXT`].
const FAMILY_LEN: usize = 5;
/// The grinning face: one code point, two UTF-16 units.
const GRIN: char = '\u{1F600}';
const COMBINING_ACUTE: char = '\u{0301}';

/// The fake layout's glyph width, in logical pixels.
const CHAR_WIDTH: f32 = 10.0;
/// Columns per row of the fake layout; a longer paragraph wraps.
const COLUMNS: usize = 10;
/// Lines per page move in the fake layout.
const PAGE_LINES: usize = 2;

// ---- fakes ----

fn is_joiner(character: char) -> bool {
    ('\u{0300}'..='\u{036F}').contains(&character) || character == '\u{FE0F}'
}

/// Grapheme boundaries of `text`, `0` first and the length last.
fn grapheme_boundaries(text: &[char]) -> Vec<usize> {
    let mut boundaries = vec![0];
    let mut index = 0;
    while index < text.len() {
        index += 1;
        loop {
            match text.get(index) {
                Some(character) if is_joiner(*character) => index += 1,
                Some('\u{200D}') if index + 1 < text.len() => index += 2,
                _ => break,
            }
        }
        boundaries.push(index);
    }
    boundaries
}

/// Runs of non-white-space characters.
fn word_ranges(text: &[char]) -> Vec<(usize, usize)> {
    let mut words = Vec::new();
    let mut start = None;
    for (index, character) in text.iter().enumerate() {
        match (character.is_whitespace(), start) {
            (false, None) => start = Some(index),
            (true, Some(word_start)) => {
                words.push((word_start, index));
                start = None;
            }
            (false, Some(_)) | (true, None) => {}
        }
    }
    if let Some(word_start) = start {
        words.push((word_start, text.len()));
    }
    words
}

/// Boundaries computed from whatever text the buffer has at the call.
struct TestBoundaries;

impl TestBoundaries {
    fn lists(text: &[char]) -> BoundaryLists {
        BoundaryLists::new(grapheme_boundaries(text), word_ranges(text))
            .expect("the fake builds valid lists")
    }
}

impl TextBoundaries for TestBoundaries {
    fn previous_grapheme(&self, text: &[char], offset: usize) -> Result<usize, EditError> {
        Self::lists(text).previous_grapheme(text, offset)
    }

    fn next_grapheme(&self, text: &[char], offset: usize) -> Result<usize, EditError> {
        Self::lists(text).next_grapheme(text, offset)
    }

    fn previous_word(&self, text: &[char], offset: usize) -> Result<usize, EditError> {
        Self::lists(text).previous_word(text, offset)
    }

    fn next_word(&self, text: &[char], offset: usize) -> Result<usize, EditError> {
        Self::lists(text).next_word(text, offset)
    }

    fn word_range(&self, text: &[char], offset: usize) -> Result<(usize, usize), EditError> {
        Self::lists(text).word_range(text, offset)
    }
}

/// One row of the monospace layout: the first and last caret offsets on it.
#[derive(Clone, Copy)]
struct Row {
    start: usize,
    end: usize,
}

/// A monospace layout over `text`: hard breaks at `\n`, soft wraps every `columns` characters. A soft
/// wrapped row's last caret is before its last character (so that the next row's first offset is the
/// only offset on that row, as [`LineLayout`] requires).
struct MonospaceLayout {
    rows: Vec<Row>,
    page_lines: usize,
}

impl MonospaceLayout {
    fn new(text: &[char], columns: usize, page_lines: usize) -> Self {
        let mut rows = Vec::new();
        let mut paragraph_start = 0;
        loop {
            let paragraph_end = text[paragraph_start..]
                .iter()
                .position(|character| *character == '\n')
                .map_or(text.len(), |position| paragraph_start + position);
            let mut row_start = paragraph_start;
            while paragraph_end - row_start > columns {
                rows.push(Row {
                    start: row_start,
                    end: row_start + columns - 1,
                });
                row_start += columns;
            }
            rows.push(Row {
                start: row_start,
                end: paragraph_end,
            });
            if paragraph_end == text.len() {
                break;
            }
            paragraph_start = paragraph_end + 1;
        }
        Self { rows, page_lines }
    }
}

impl LineLayout for MonospaceLayout {
    fn line_count(&self) -> usize {
        self.rows.len()
    }

    fn line_of(&self, offset: usize) -> Result<usize, EditError> {
        self.rows
            .iter()
            .position(|row| row.start <= offset && offset <= row.end)
            .ok_or(EditError::OffsetOutOfRange {
                offset,
                len: self.rows.last().map_or(0, |row| row.end),
            })
    }

    fn line_range(&self, line: usize) -> Result<(usize, usize), EditError> {
        let row =
            self.rows
                .get(line)
                .ok_or(EditError::InvalidLayout(LayoutProblem::LineOutOfRange {
                    line,
                    count: self.rows.len(),
                }))?;
        Ok((row.start, row.end))
    }

    fn x_of(&self, offset: usize) -> Result<f32, EditError> {
        let row = self.rows[self.line_of(offset)?];
        Ok((offset - row.start) as f32 * CHAR_WIDTH)
    }

    fn offset_at(&self, line: usize, x: f32) -> Result<usize, EditError> {
        let (start, end) = self.line_range(line)?;
        let column = (x / CHAR_WIDTH).round().max(0.0) as usize;
        Ok(start + column.min(end - start))
    }

    fn page_lines(&self) -> usize {
        self.page_lines
    }
}

/// Run `command` the way the renderer would: boundaries for the buffer's text, and for a multi-line
/// buffer a layout of it.
fn run(buffer: &mut EditBuffer, command: EditCommand) -> EditResult {
    try_run(buffer, command).expect("the fakes answer correctly")
}

fn try_run(buffer: &mut EditBuffer, command: EditCommand) -> Result<EditResult, EditError> {
    let layout = MonospaceLayout::new(buffer.text(), COLUMNS, PAGE_LINES);
    let environment = EditEnvironment::new(&TestBoundaries);
    if buffer.config().multiline {
        buffer.apply(command, &environment.with_layout(&layout))
    } else {
        buffer.apply(command, &environment)
    }
}

fn single(text: &str) -> EditBuffer {
    EditBuffer::with_text(EditConfig::default(), text)
}

fn multi(text: &str) -> EditBuffer {
    EditBuffer::with_text(
        EditConfig {
            multiline: true,
            ..EditConfig::default()
        },
        text,
    )
}

fn with_config(text: &str, config: EditConfig) -> EditBuffer {
    EditBuffer::with_text(config, text)
}

fn select(buffer: &mut EditBuffer, anchor: usize, focus: usize) {
    run(buffer, EditCommand::SetSelection { anchor, focus });
}

fn caret(buffer: &mut EditBuffer, offset: usize) {
    select(buffer, offset, offset);
}

fn type_text(buffer: &mut EditBuffer, text: &str) {
    for character in text.chars() {
        run(buffer, EditCommand::InsertText(character.to_string()));
    }
}

fn insert(buffer: &mut EditBuffer, text: &str) -> EditResult {
    run(buffer, EditCommand::InsertText(text.to_string()))
}

fn move_grapheme(direction: Direction, extend: bool) -> EditCommand {
    EditCommand::MoveGrapheme { direction, extend }
}

fn move_word(direction: Direction, extend: bool) -> EditCommand {
    EditCommand::MoveWord { direction, extend }
}

fn move_line(direction: Direction, extend: bool) -> EditCommand {
    EditCommand::MoveLine { direction, extend }
}

/// A result in which nothing happened and the event count is `event_count`.
fn nothing(event_count: u64) -> EditResult {
    EditResult {
        event_count,
        ..EditResult::default()
    }
}

// ---- construction and reading ----

#[test]
fn a_new_buffer_is_empty_with_the_caret_at_zero() {
    let buffer = EditBuffer::new(EditConfig::default());
    assert_eq!(buffer.value(), "");
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 0));
    assert!(!buffer.has_selection());
    assert_eq!(buffer.selection_range(), 0..0);
    assert_eq!(buffer.event_count(), 0);
    assert!(buffer.composition().is_none());
    assert_eq!(buffer.utf16_length(), 0);
}

#[test]
fn with_text_puts_the_caret_at_the_end_and_counts_utf16_units() {
    let text = format!("h\u{00E9}llo{GRIN}");
    let buffer = single(&text);
    assert_eq!(buffer.value(), text);
    assert_eq!(buffer.text().len(), 6);
    assert_eq!((buffer.anchor(), buffer.focus()), (6, 6));
    assert_eq!(buffer.utf16_length(), 7);
    assert_eq!(buffer.selection_utf16(), (7, 7));
    assert_eq!(buffer.event_count(), 0);
}

#[test]
fn the_selection_is_reported_ordered_in_utf16_units() {
    let mut buffer = single(&format!("a{GRIN}b"));
    // Anchor after focus: a backward selection of the emoji and the "b".
    select(&mut buffer, 3, 1);
    assert_eq!((buffer.anchor(), buffer.focus()), (3, 1));
    assert_eq!(buffer.selection_range(), 1..3);
    assert!(buffer.has_selection());
    assert_eq!(buffer.selection_utf16(), (1, 4));
}

#[test]
fn the_setters_change_the_modes() {
    let mut buffer = single("x");
    buffer.set_read_only(true);
    buffer.set_secure(true);
    buffer.set_max_length(Some(3));
    assert_eq!(
        buffer.config(),
        EditConfig {
            multiline: false,
            read_only: true,
            secure: true,
            max_length: Some(3),
        }
    );
    buffer.set_max_length(None);
    assert_eq!(buffer.config().max_length, None);
}

// ---- InsertText ----

#[test]
fn insert_text_reports_the_event_fields() {
    let mut buffer = single("");
    let result = insert(&mut buffer, "a");
    assert_eq!(
        result,
        EditResult {
            text_changed: true,
            selection_changed: true,
            input_type: Some(InputType::InsertText),
            data: Some("a".to_string()),
            clipboard: None,
            composition: CompositionEvent::None,
            blocked: None,
            event_count: 1,
        }
    );
    assert_eq!(buffer.value(), "a");
    assert_eq!((buffer.anchor(), buffer.focus()), (1, 1));
}

#[test]
fn insert_text_goes_in_at_the_caret() {
    let mut buffer = single("ac");
    caret(&mut buffer, 1);
    insert(&mut buffer, "b");
    assert_eq!(buffer.value(), "abc");
    assert_eq!(buffer.focus(), 2);
}

#[test]
fn insert_text_replaces_the_selection() {
    let mut buffer = single("hello");
    select(&mut buffer, 1, 4);
    let result = insert(&mut buffer, "X");
    assert_eq!(buffer.value(), "hXo");
    assert_eq!((buffer.anchor(), buffer.focus()), (2, 2));
    assert_eq!(result.data.as_deref(), Some("X"));
    assert!(result.selection_changed);
}

#[test]
fn insert_text_replaces_a_backward_selection_too() {
    let mut buffer = single("hello");
    select(&mut buffer, 4, 1);
    insert(&mut buffer, "X");
    assert_eq!(buffer.value(), "hXo");
}

#[test]
fn insert_text_with_an_astral_character_moves_the_caret_one_code_point() {
    let mut buffer = single("ab");
    caret(&mut buffer, 1);
    insert(&mut buffer, &GRIN.to_string());
    assert_eq!(buffer.value(), format!("a{GRIN}b"));
    assert_eq!(buffer.focus(), 2);
    assert_eq!(buffer.selection_utf16(), (3, 3));
}

#[test]
fn a_single_line_input_drops_line_breaks_from_inserted_text() {
    let mut buffer = single("");
    let result = insert(&mut buffer, "a\nb\r\nc\rd");
    assert_eq!(buffer.value(), "abcd");
    assert_eq!(result.data.as_deref(), Some("abcd"));
}

#[test]
fn a_multi_line_input_normalises_line_breaks_to_lf() {
    let mut buffer = multi("");
    let result = insert(&mut buffer, "a\r\nb\rc\nd");
    assert_eq!(buffer.value(), "a\nb\nc\nd");
    assert_eq!(result.data.as_deref(), Some("a\nb\nc\nd"));
}

#[test]
fn inserting_nothing_does_nothing() {
    let mut buffer = single("abc");
    assert_eq!(insert(&mut buffer, ""), nothing(0));
    // Text that is only line breaks is nothing in a single-line input.
    assert_eq!(insert(&mut buffer, "\n\r\n"), nothing(0));
    assert_eq!(buffer.value(), "abc");
}

// ---- InsertLineBreak and ReplaceText ----

#[test]
fn insert_line_break_inserts_lf_in_a_multi_line_input() {
    let mut buffer = multi("ab");
    caret(&mut buffer, 1);
    let result = run(&mut buffer, EditCommand::InsertLineBreak);
    assert_eq!(buffer.value(), "a\nb");
    assert_eq!(buffer.focus(), 2);
    assert_eq!(result.input_type, Some(InputType::InsertLineBreak));
    assert_eq!(result.data, None, "insertLineBreak has data: null");
    assert!(result.text_changed);
}

#[test]
fn insert_line_break_is_blocked_in_a_single_line_input() {
    let mut buffer = single("ab");
    let result = run(&mut buffer, EditCommand::InsertLineBreak);
    assert_eq!(result.blocked, Some(Blocked::NotMultiline));
    assert_eq!(buffer.value(), "ab");
    assert_eq!(result.event_count, 0);
}

#[test]
fn replace_text_replaces_everything_and_puts_the_caret_at_zero() {
    let mut buffer = single("hello");
    let result = run(&mut buffer, EditCommand::ReplaceText("world!".to_string()));
    assert_eq!(buffer.value(), "world!");
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 0));
    assert_eq!(result.input_type, Some(InputType::InsertReplacementText));
    assert_eq!(result.data.as_deref(), Some("world!"));
    assert!(result.text_changed && result.selection_changed);
    assert_eq!(result.event_count, 1);
}

#[test]
fn replace_text_with_nothing_clears_the_text() {
    let mut buffer = single("hello");
    let result = run(&mut buffer, EditCommand::ReplaceText(String::new()));
    assert_eq!(buffer.value(), "");
    assert_eq!(result.data.as_deref(), Some(""));
    assert!(result.text_changed);
    // Clearing nothing is nothing.
    assert_eq!(
        run(&mut buffer, EditCommand::ReplaceText(String::new())),
        nothing(1)
    );
}

#[test]
fn replace_text_is_cut_to_max_length() {
    let mut buffer = with_config(
        "hello",
        EditConfig {
            max_length: Some(3),
            ..EditConfig::default()
        },
    );
    let result = run(&mut buffer, EditCommand::ReplaceText("abcdef".to_string()));
    assert_eq!(buffer.value(), "abc");
    assert_eq!(result.data.as_deref(), Some("abc"));
}

#[test]
fn a_replacement_that_changes_nothing_is_not_an_edit() {
    let mut buffer = single("hello");
    caret(&mut buffer, 3);
    // A keyboard that sends back the text it was given: no event, no undo entry, and the caret still goes to 0
    // (the engine's Right presses count from there).
    let result = run(&mut buffer, EditCommand::ReplaceText("hello".to_string()));
    assert!(!result.text_changed && result.input_type.is_none() && result.data.is_none());
    assert!(result.selection_changed, "the caret moved to 0");
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 0));
    assert_eq!(buffer.event_count(), 0);
    assert_eq!(
        run(&mut buffer, EditCommand::Undo),
        nothing(0),
        "no undo entry was left"
    );
    // The same for a text that `maxLength` cuts back to what is already there.
    let mut limited = with_config(
        "abc",
        EditConfig {
            max_length: Some(3),
            ..EditConfig::default()
        },
    );
    let result = run(&mut limited, EditCommand::ReplaceText("abcd".to_string()));
    assert!(!result.text_changed && result.blocked.is_none());
    assert_eq!(
        (limited.value().as_str(), limited.event_count()),
        ("abc", 0)
    );
    assert_eq!(run(&mut limited, EditCommand::Undo), nothing(0));
}

// ---- line breaks ----

#[test]
fn every_line_separator_is_a_line_break() {
    for separator in [
        '\n', '\r', '\u{000B}', '\u{000C}', '\u{0085}', '\u{2028}', '\u{2029}',
    ] {
        assert!(is_line_break(separator), "{separator:?}");
    }
    for other in ['a', ' ', '\t', '\u{200D}', '\u{00A0}', '\u{001C}'] {
        assert!(!is_line_break(other), "{other:?}");
    }
}

#[test]
fn a_single_line_input_drops_every_line_separator_and_a_multi_line_one_turns_them_into_lf() {
    let text = "a\r\nb\rc\u{000B}d\u{000C}e\u{0085}f\u{2028}g\u{2029}h\ni";
    assert_eq!(
        normalise_line_breaks(text, false)
            .into_iter()
            .collect::<String>(),
        "abcdefghi"
    );
    assert_eq!(
        normalise_line_breaks(text, true)
            .into_iter()
            .collect::<String>(),
        "a\nb\nc\nd\ne\nf\ng\nh\ni"
    );
    // A separator at the end of a single-line text must not survive: the text server would treat it as a
    // final hard break and the input would grow a line the caret lives on.
    let mut buffer = single("ab");
    insert(&mut buffer, "c\u{2028}");
    assert_eq!(buffer.value(), "abc");
    let result = run(&mut buffer, EditCommand::PasteText("\u{0085}".to_string()));
    assert_eq!(buffer.value(), "abc");
    assert!(!result.text_changed);
}

// ---- an empty paste ----

#[test]
fn an_empty_paste_over_a_selection_pastes_nothing_and_keeps_the_selection() {
    // An empty clipboard, an image on it (`readText()` resolves to ""), or only line breaks in a single-line input.
    for clipboard in ["", "\n", "\r\n\u{2028}"] {
        let mut buffer = single("hello");
        select(&mut buffer, 1, 4);
        let result = run(&mut buffer, EditCommand::PasteText(clipboard.to_string()));
        assert_eq!(result, nothing(0), "{clipboard:?}");
        assert_eq!(buffer.value(), "hello", "{clipboard:?}");
        assert_eq!(buffer.selection_range(), 1..4, "{clipboard:?}");
        assert_eq!(
            run(&mut buffer, EditCommand::Undo),
            nothing(0),
            "no undo entry for {clipboard:?}"
        );
    }
    // A line break is something to paste into a text area, and replaces the selection.
    let mut area = multi("hello");
    select(&mut area, 1, 4);
    let result = run(&mut area, EditCommand::PasteText("\n".to_string()));
    assert!(result.text_changed);
    assert_eq!(area.value(), "h\no");
}

// ---- the last character shown ----

#[test]
fn the_last_displayed_character_is_the_texts_or_the_preedits() {
    let mut buffer = multi("a\n");
    assert_eq!(buffer.display_last_char(), Some('\n'));
    caret(&mut buffer, 1);
    run(&mut buffer, preedit("x", 0..1));
    assert_eq!(
        buffer.display_last_char(),
        Some('\n'),
        "the preedit is before the break"
    );
    let mut ending = multi("ab");
    run(&mut ending, preedit("x", 0..1));
    assert_eq!(
        ending.display_last_char(),
        Some('x'),
        "at the end of the text the preedit ends the display"
    );
    assert_eq!(single("").display_last_char(), None);
}

// ---- maxLength ----

fn limited(text: &str, max_length: usize) -> EditBuffer {
    with_config(
        text,
        EditConfig {
            max_length: Some(max_length),
            ..EditConfig::default()
        },
    )
}

#[test]
fn a_full_input_blocks_typing_without_a_change_or_an_event() {
    let mut buffer = limited("abc", 3);
    let result = insert(&mut buffer, "d");
    assert_eq!(result.blocked, Some(Blocked::MaxLength));
    assert!(!result.text_changed && result.input_type.is_none() && result.data.is_none());
    assert_eq!(result.event_count, 0);
    assert_eq!(buffer.value(), "abc");
}

#[test]
fn text_that_does_not_all_fit_is_cut_to_what_does() {
    let mut buffer = limited("ab", 5);
    let result = run(&mut buffer, EditCommand::PasteText("cdefg".to_string()));
    assert_eq!(buffer.value(), "abcde");
    assert_eq!(result.data.as_deref(), Some("cde"));
    assert_eq!(result.input_type, Some(InputType::InsertFromPaste));
}

#[test]
fn max_length_counts_utf16_units_so_an_astral_character_costs_two() {
    let mut buffer = limited("", 3);
    type_text(&mut buffer, "a");
    // 1 + 2 = 3 units: fits exactly.
    insert(&mut buffer, &GRIN.to_string());
    assert_eq!(buffer.utf16_length(), 3);
    assert_eq!(buffer.text().len(), 2);
    let result = insert(&mut buffer, "b");
    assert_eq!(result.blocked, Some(Blocked::MaxLength));
}

#[test]
fn a_cut_never_splits_a_surrogate_pair() {
    let mut buffer = limited("ab", 4);
    // Room for two units: the first emoji fits whole, the second does not.
    let result = insert(&mut buffer, &format!("{GRIN}{GRIN}"));
    assert_eq!(buffer.value(), format!("ab{GRIN}"));
    assert_eq!(result.data, Some(GRIN.to_string()));

    // Room for one unit: an emoji needs two, so nothing fits.
    let mut buffer = limited("ab", 3);
    let result = insert(&mut buffer, &GRIN.to_string());
    assert_eq!(result.blocked, Some(Blocked::MaxLength));
    assert_eq!(buffer.value(), "ab");
}

#[test]
fn a_cut_stops_at_the_first_character_that_does_not_fit() {
    // One unit of room: "😀" does not fit, so the "b" after it is not tried.
    let mut buffer = limited("ab", 3);
    let result = insert(&mut buffer, &format!("{GRIN}b"));
    assert_eq!(result.blocked, Some(Blocked::MaxLength));
    assert_eq!(buffer.value(), "ab");
}

#[test]
fn replacing_a_selection_frees_its_room() {
    let mut buffer = limited("abc", 3);
    select(&mut buffer, 0, 3);
    insert(&mut buffer, "xyz");
    assert_eq!(buffer.value(), "xyz");
}

#[test]
fn an_insertion_that_does_not_fit_leaves_the_selection_alone() {
    let mut buffer = limited("abc", 3);
    select(&mut buffer, 1, 2);
    // Two units to put where one unit was freed.
    let result = insert(&mut buffer, &GRIN.to_string());
    assert_eq!(result.blocked, Some(Blocked::MaxLength));
    assert_eq!(buffer.value(), "abc");
    assert_eq!(buffer.selection_range(), 1..2);
}

#[test]
fn text_longer_than_max_length_is_kept_but_nothing_more_goes_in() {
    let mut buffer = single("abcd");
    buffer.set_max_length(Some(2));
    assert_eq!(buffer.value(), "abcd");
    assert_eq!(insert(&mut buffer, "x").blocked, Some(Blocked::MaxLength));
    // Deleting is always allowed, and typing is again once there is room.
    run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.value(), "a");
    insert(&mut buffer, "x");
    assert_eq!(buffer.value(), "ax");
}

#[test]
fn a_line_break_counts_one_unit_under_max_length() {
    let mut buffer = with_config(
        "ab",
        EditConfig {
            multiline: true,
            max_length: Some(3),
            ..EditConfig::default()
        },
    );
    run(&mut buffer, EditCommand::InsertLineBreak);
    assert_eq!(buffer.value(), "ab\n");
    assert_eq!(
        run(&mut buffer, EditCommand::InsertLineBreak).blocked,
        Some(Blocked::MaxLength)
    );
}

// ---- deleting ----

#[test]
fn backspace_deletes_one_grapheme_before_the_caret() {
    let mut buffer = single("abc");
    let result = run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.value(), "ab");
    assert_eq!(buffer.focus(), 2);
    assert_eq!(result.input_type, Some(InputType::DeleteContentBackward));
    assert_eq!(result.data, None);
    assert!(result.text_changed && result.selection_changed);
}

#[test]
fn delete_removes_the_grapheme_after_the_caret_and_leaves_the_caret() {
    let mut buffer = single("abc");
    caret(&mut buffer, 0);
    let result = run(&mut buffer, EditCommand::DeleteGrapheme(Direction::Forward));
    assert_eq!(buffer.value(), "bc");
    assert_eq!(buffer.focus(), 0);
    assert_eq!(result.input_type, Some(InputType::DeleteContentForward));
    assert!(result.text_changed);
    assert!(!result.selection_changed, "the caret did not move");
}

#[test]
fn backspace_deletes_a_zwj_sequence_as_one_grapheme() {
    let mut buffer = single(FAMILY_TEXT);
    caret(&mut buffer, 1 + FAMILY_LEN);
    let result = run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.value(), "ab");
    assert_eq!(buffer.focus(), 1);
    assert!(result.text_changed);
}

#[test]
fn delete_forward_removes_a_zwj_sequence_as_one_grapheme() {
    let mut buffer = single(FAMILY_TEXT);
    caret(&mut buffer, 1);
    run(&mut buffer, EditCommand::DeleteGrapheme(Direction::Forward));
    assert_eq!(buffer.value(), "ab");
    assert_eq!(buffer.focus(), 1);
}

#[test]
fn backspace_deletes_a_letter_with_its_combining_mark() {
    let mut buffer = single(&format!("xe{COMBINING_ACUTE}"));
    run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.value(), "x");
}

#[test]
fn deleting_at_the_edges_does_nothing() {
    let mut buffer = single("abc");
    caret(&mut buffer, 0);
    assert_eq!(
        run(
            &mut buffer,
            EditCommand::DeleteGrapheme(Direction::Backward)
        ),
        nothing(0)
    );
    caret(&mut buffer, 3);
    assert_eq!(
        run(&mut buffer, EditCommand::DeleteGrapheme(Direction::Forward)),
        nothing(0)
    );
    assert_eq!(
        run(&mut buffer, EditCommand::DeleteWord(Direction::Forward)),
        nothing(0)
    );
    assert_eq!(buffer.value(), "abc");
}

#[test]
fn deleting_with_a_selection_deletes_only_the_selection() {
    let mut buffer = single("hello");
    select(&mut buffer, 1, 4);
    let result = run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.value(), "ho");
    assert_eq!((buffer.anchor(), buffer.focus()), (1, 1));
    assert_eq!(result.input_type, Some(InputType::DeleteContentBackward));

    let mut buffer = single("hello");
    select(&mut buffer, 4, 1);
    let result = run(&mut buffer, EditCommand::DeleteGrapheme(Direction::Forward));
    assert_eq!(buffer.value(), "ho");
    assert_eq!(result.input_type, Some(InputType::DeleteContentForward));
}

#[test]
fn delete_word_removes_to_the_previous_and_next_word_stops() {
    let mut buffer = single("hello big world");
    let result = run(&mut buffer, EditCommand::DeleteWord(Direction::Backward));
    assert_eq!(buffer.value(), "hello big ");
    assert_eq!(result.input_type, Some(InputType::DeleteWordBackward));
    run(&mut buffer, EditCommand::DeleteWord(Direction::Backward));
    assert_eq!(buffer.value(), "hello ");

    let mut buffer = single("hello big world");
    caret(&mut buffer, 0);
    let result = run(&mut buffer, EditCommand::DeleteWord(Direction::Forward));
    assert_eq!(buffer.value(), " big world");
    assert_eq!(result.input_type, Some(InputType::DeleteWordForward));
}

#[test]
fn delete_to_line_edge_in_a_single_line_input_goes_to_the_text_edge() {
    let mut buffer = single("hello world");
    caret(&mut buffer, 5);
    let result = run(
        &mut buffer,
        EditCommand::DeleteToLineEdge(Direction::Backward),
    );
    assert_eq!(buffer.value(), " world");
    assert_eq!(buffer.focus(), 0);
    assert_eq!(result.input_type, Some(InputType::DeleteSoftLineBackward));

    let mut buffer = single("hello world");
    caret(&mut buffer, 5);
    let result = run(
        &mut buffer,
        EditCommand::DeleteToLineEdge(Direction::Forward),
    );
    assert_eq!(buffer.value(), "hello");
    assert_eq!(result.input_type, Some(InputType::DeleteSoftLineForward));
}

#[test]
fn delete_to_line_edge_in_a_wrapped_multi_line_input_stops_at_the_visual_line() {
    // Ten columns: the first row holds offsets 0..=9 (End is before the "9"), the second 10..=15.
    let text = "0123456789ABCDE";

    let mut buffer = multi(text);
    caret(&mut buffer, 12);
    run(
        &mut buffer,
        EditCommand::DeleteToLineEdge(Direction::Backward),
    );
    assert_eq!(buffer.value(), "0123456789CDE");
    assert_eq!(buffer.focus(), 10);

    let mut buffer = multi(text);
    caret(&mut buffer, 4);
    run(
        &mut buffer,
        EditCommand::DeleteToLineEdge(Direction::Forward),
    );
    assert_eq!(buffer.value(), "01239ABCDE");
    assert_eq!(buffer.focus(), 4);
}

// ---- movement ----

#[test]
fn grapheme_moves_step_one_grapheme_and_extend_keeps_the_anchor() {
    let mut buffer = single("abc");
    let result = run(&mut buffer, move_grapheme(Direction::Backward, false));
    assert_eq!((buffer.anchor(), buffer.focus()), (2, 2));
    assert!(result.selection_changed && !result.text_changed);
    assert_eq!(result.input_type, None);

    run(&mut buffer, move_grapheme(Direction::Backward, true));
    assert_eq!((buffer.anchor(), buffer.focus()), (2, 1));
    run(&mut buffer, move_grapheme(Direction::Backward, true));
    assert_eq!((buffer.anchor(), buffer.focus()), (2, 0));
    // Shift+Right shrinks the selection from the focus end.
    run(&mut buffer, move_grapheme(Direction::Forward, true));
    assert_eq!((buffer.anchor(), buffer.focus()), (2, 1));
}

#[test]
fn a_plain_move_with_a_selection_collapses_to_that_side() {
    let mut buffer = single("abcde");
    select(&mut buffer, 1, 4);
    run(&mut buffer, move_grapheme(Direction::Backward, false));
    assert_eq!((buffer.anchor(), buffer.focus()), (1, 1));

    select(&mut buffer, 4, 1);
    run(&mut buffer, move_grapheme(Direction::Forward, false));
    assert_eq!((buffer.anchor(), buffer.focus()), (4, 4));
}

#[test]
fn a_move_at_the_edge_changes_nothing() {
    let mut buffer = single("abc");
    caret(&mut buffer, 0);
    let result = run(&mut buffer, move_grapheme(Direction::Backward, false));
    assert_eq!(result, nothing(0));
    caret(&mut buffer, 3);
    let result = run(&mut buffer, move_grapheme(Direction::Forward, true));
    assert_eq!(result, nothing(0));
}

#[test]
fn a_grapheme_move_steps_over_a_whole_zwj_sequence() {
    let mut buffer = single(FAMILY_TEXT);
    caret(&mut buffer, 1);
    run(&mut buffer, move_grapheme(Direction::Forward, false));
    assert_eq!(buffer.focus(), 1 + FAMILY_LEN);
    run(&mut buffer, move_grapheme(Direction::Backward, false));
    assert_eq!(buffer.focus(), 1);
}

#[test]
fn word_moves_land_on_word_stops_and_extend_like_shift() {
    let mut buffer = single("hello big world");
    caret(&mut buffer, 0);
    for expected in [5, 9, 15] {
        run(&mut buffer, move_word(Direction::Forward, false));
        assert_eq!(buffer.focus(), expected);
    }
    for expected in [10, 6, 0] {
        run(&mut buffer, move_word(Direction::Backward, false));
        assert_eq!(buffer.focus(), expected);
    }
    run(&mut buffer, move_word(Direction::Forward, true));
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 5));
}

#[test]
fn line_edge_and_document_edge_moves_in_a_single_line_input() {
    let mut buffer = single("hello");
    caret(&mut buffer, 2);
    run(
        &mut buffer,
        EditCommand::MoveLineEdge {
            direction: Direction::Backward,
            extend: false,
        },
    );
    assert_eq!(buffer.focus(), 0);
    run(
        &mut buffer,
        EditCommand::MoveLineEdge {
            direction: Direction::Forward,
            extend: true,
        },
    );
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 5));
    run(
        &mut buffer,
        EditCommand::MoveDocumentEdge {
            direction: Direction::Backward,
            extend: false,
        },
    );
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 0));
    run(
        &mut buffer,
        EditCommand::MoveDocumentEdge {
            direction: Direction::Forward,
            extend: true,
        },
    );
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 5));
}

#[test]
fn select_all_selects_the_whole_text() {
    let mut buffer = single("hello");
    caret(&mut buffer, 2);
    let result = run(&mut buffer, EditCommand::SelectAll);
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 5));
    assert!(result.selection_changed && !result.text_changed);
    // Again: nothing changes, so no selectionchange.
    assert!(!run(&mut buffer, EditCommand::SelectAll).selection_changed);
}

#[test]
fn set_selection_keeps_the_direction_and_validates_the_offsets() {
    let mut buffer = single("hello");
    select(&mut buffer, 4, 1);
    assert_eq!((buffer.anchor(), buffer.focus()), (4, 1));

    let error = try_run(
        &mut buffer,
        EditCommand::SetSelection {
            anchor: 0,
            focus: 9,
        },
    );
    assert_eq!(
        error,
        Err(EditError::OffsetOutOfRange { offset: 9, len: 5 })
    );
    assert_eq!((buffer.anchor(), buffer.focus()), (4, 1));
}

#[test]
fn select_word_at_selects_the_word_or_the_gap() {
    let mut buffer = single("hello  big");
    run(&mut buffer, EditCommand::SelectWordAt(8));
    assert_eq!((buffer.anchor(), buffer.focus()), (7, 10));
    // Between the two spaces.
    run(&mut buffer, EditCommand::SelectWordAt(6));
    assert_eq!((buffer.anchor(), buffer.focus()), (5, 7));
    // At the end of a word the word is chosen.
    run(&mut buffer, EditCommand::SelectWordAt(5));
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 5));

    assert_eq!(
        try_run(&mut buffer, EditCommand::SelectWordAt(11)),
        Err(EditError::OffsetOutOfRange {
            offset: 11,
            len: 10
        })
    );
}

// ---- multi-line movement ----

/// Lines of 6, 2 and 8 characters, none wrapped: offsets 0..=6, 7..=9 and 10..=18.
const RAGGED: &str = "abcdef\nab\nabcdefgh";

#[test]
fn moving_down_keeps_the_desired_x_across_a_short_line() {
    let mut buffer = multi(RAGGED);
    caret(&mut buffer, 5);
    run(&mut buffer, move_line(Direction::Forward, false));
    assert_eq!(buffer.focus(), 9, "the short line ends at column 2");
    run(&mut buffer, move_line(Direction::Forward, false));
    assert_eq!(buffer.focus(), 15, "back to column 5");
    run(&mut buffer, move_line(Direction::Backward, false));
    assert_eq!(buffer.focus(), 9);
    run(&mut buffer, move_line(Direction::Backward, false));
    assert_eq!(buffer.focus(), 5);
}

#[test]
fn a_horizontal_move_resets_the_desired_x() {
    let mut buffer = multi(RAGGED);
    caret(&mut buffer, 5);
    run(&mut buffer, move_line(Direction::Forward, false));
    assert_eq!(buffer.focus(), 9);
    // Left from the end of the short line: the desired x is now column 1.
    run(&mut buffer, move_grapheme(Direction::Backward, false));
    assert_eq!(buffer.focus(), 8);
    run(&mut buffer, move_line(Direction::Forward, false));
    assert_eq!(buffer.focus(), 11);
}

#[test]
fn moving_past_the_first_or_last_line_goes_to_the_text_edge() {
    let mut buffer = multi(RAGGED);
    caret(&mut buffer, 3);
    run(&mut buffer, move_line(Direction::Backward, false));
    assert_eq!(buffer.focus(), 0);
    caret(&mut buffer, 12);
    run(&mut buffer, move_line(Direction::Forward, false));
    assert_eq!(buffer.focus(), 18);
}

#[test]
fn moving_a_line_with_extend_keeps_the_anchor() {
    let mut buffer = multi(RAGGED);
    caret(&mut buffer, 5);
    run(&mut buffer, move_line(Direction::Forward, true));
    assert_eq!((buffer.anchor(), buffer.focus()), (5, 9));
}

#[test]
fn page_moves_go_a_page_of_lines_and_then_to_the_text_edge() {
    // Five one-letter lines at offsets 0, 2, 4, 6, 8; the text is nine code points.
    let mut buffer = multi("a\nb\nc\nd\ne");
    caret(&mut buffer, 0);
    let page_down = EditCommand::MovePage {
        direction: Direction::Forward,
        extend: false,
    };
    run(&mut buffer, page_down.clone());
    assert_eq!(buffer.focus(), 4);
    run(&mut buffer, page_down.clone());
    assert_eq!(buffer.focus(), 8);
    run(&mut buffer, page_down);
    assert_eq!(buffer.focus(), 9, "already on the last line");

    let page_up = EditCommand::MovePage {
        direction: Direction::Backward,
        extend: true,
    };
    run(&mut buffer, page_up);
    // Two lines up from the last (line 4 to line 2). The desired x is still 0, where the first page
    // move started, not the x of the text end.
    assert_eq!((buffer.anchor(), buffer.focus()), (9, 4));
}

#[test]
fn line_edge_moves_stay_on_the_visual_line_of_a_wrapped_paragraph() {
    let mut buffer = multi("0123456789ABCDE");
    let line_edge = |direction| EditCommand::MoveLineEdge {
        direction,
        extend: false,
    };
    caret(&mut buffer, 12);
    run(&mut buffer, line_edge(Direction::Backward));
    assert_eq!(buffer.focus(), 10);
    caret(&mut buffer, 12);
    run(&mut buffer, line_edge(Direction::Forward));
    assert_eq!(buffer.focus(), 15);
    caret(&mut buffer, 4);
    run(&mut buffer, line_edge(Direction::Forward));
    assert_eq!(
        buffer.focus(),
        9,
        "End on a soft wrapped row stays on the row"
    );
    run(&mut buffer, line_edge(Direction::Backward));
    assert_eq!(buffer.focus(), 0);
}

#[test]
fn a_single_line_input_sends_vertical_moves_to_the_text_edges_without_a_layout() {
    let mut buffer = single("hello");
    caret(&mut buffer, 2);
    run(&mut buffer, move_line(Direction::Forward, false));
    assert_eq!(buffer.focus(), 5);
    run(&mut buffer, move_line(Direction::Backward, true));
    assert_eq!((buffer.anchor(), buffer.focus()), (5, 0));
    run(
        &mut buffer,
        EditCommand::MovePage {
            direction: Direction::Forward,
            extend: false,
        },
    );
    assert_eq!(buffer.focus(), 5);
}

#[test]
fn a_multi_line_input_needs_a_layout() {
    let mut buffer = multi(RAGGED);
    caret(&mut buffer, 3);
    let environment = EditEnvironment::new(&TestBoundaries);
    let result = buffer.apply(move_line(Direction::Forward, false), &environment);
    assert_eq!(result, Err(EditError::MissingLayout));
    assert_eq!(buffer.focus(), 3);
}

/// A layout with one fault, to check that the buffer validates what it is told.
#[derive(Clone, Copy)]
enum Fault {
    NoLines,
    LineOutOfRange,
    RangeOutsideText,
    OffsetOutsideLine,
    NoPageLines,
}

/// Two lines over "abc\ndef": offsets 0..=3 and 4..=7.
struct FaultyLayout(Fault);

impl LineLayout for FaultyLayout {
    fn line_count(&self) -> usize {
        match self.0 {
            Fault::NoLines => 0,
            _ => 2,
        }
    }

    fn line_of(&self, offset: usize) -> Result<usize, EditError> {
        match self.0 {
            Fault::LineOutOfRange => Ok(5),
            _ => Ok(usize::from(offset > 3)),
        }
    }

    fn line_range(&self, line: usize) -> Result<(usize, usize), EditError> {
        match (self.0, line) {
            (Fault::RangeOutsideText, _) => Ok((0, 99)),
            (_, 0) => Ok((0, 3)),
            (_, _) => Ok((4, 7)),
        }
    }

    fn x_of(&self, _offset: usize) -> Result<f32, EditError> {
        Ok(0.0)
    }

    fn offset_at(&self, _line: usize, _x: f32) -> Result<usize, EditError> {
        match self.0 {
            Fault::OffsetOutsideLine => Ok(0),
            _ => Ok(4),
        }
    }

    fn page_lines(&self) -> usize {
        match self.0 {
            Fault::NoPageLines => 0,
            _ => 1,
        }
    }
}

#[test]
fn a_layout_that_answers_wrongly_is_an_error_and_the_buffer_is_unchanged() {
    let cases = [
        (
            Fault::NoLines,
            move_line(Direction::Forward, false),
            LayoutProblem::Empty,
        ),
        (
            Fault::LineOutOfRange,
            move_line(Direction::Forward, false),
            LayoutProblem::LineOutOfRange { line: 5, count: 2 },
        ),
        (
            Fault::RangeOutsideText,
            EditCommand::MoveLineEdge {
                direction: Direction::Forward,
                extend: false,
            },
            LayoutProblem::RangeOutsideText { line: 0 },
        ),
        (
            Fault::OffsetOutsideLine,
            move_line(Direction::Forward, false),
            LayoutProblem::OffsetOutsideLine { line: 1, offset: 0 },
        ),
        (
            Fault::NoPageLines,
            EditCommand::MovePage {
                direction: Direction::Forward,
                extend: false,
            },
            LayoutProblem::Empty,
        ),
    ];
    for (fault, command, problem) in cases {
        let mut buffer = multi("abc\ndef");
        caret(&mut buffer, 1);
        let layout = FaultyLayout(fault);
        let environment = EditEnvironment::new(&TestBoundaries).with_layout(&layout);
        let result = buffer.apply(command, &environment);
        assert_eq!(result, Err(EditError::InvalidLayout(problem)));
        assert_eq!((buffer.anchor(), buffer.focus()), (1, 1));
    }
}

// ---- faulty boundaries ----

/// Boundaries that never make progress.
struct StuckBoundaries;

impl TextBoundaries for StuckBoundaries {
    fn previous_grapheme(&self, _text: &[char], offset: usize) -> Result<usize, EditError> {
        Ok(offset)
    }

    fn next_grapheme(&self, _text: &[char], offset: usize) -> Result<usize, EditError> {
        Ok(offset)
    }

    fn previous_word(&self, _text: &[char], offset: usize) -> Result<usize, EditError> {
        Ok(offset)
    }

    fn next_word(&self, text: &[char], _offset: usize) -> Result<usize, EditError> {
        Ok(text.len() + 1)
    }

    fn word_range(&self, _text: &[char], _offset: usize) -> Result<(usize, usize), EditError> {
        Ok((3, 4))
    }
}

#[test]
fn boundaries_that_do_not_make_progress_are_errors_and_change_nothing() {
    let environment = EditEnvironment::new(&StuckBoundaries);
    let cases = [
        (
            move_grapheme(Direction::Backward, false),
            BoundaryQuery::PreviousGrapheme,
        ),
        (
            EditCommand::DeleteGrapheme(Direction::Forward),
            BoundaryQuery::NextGrapheme,
        ),
        (
            move_word(Direction::Backward, false),
            BoundaryQuery::PreviousWord,
        ),
        (
            EditCommand::DeleteWord(Direction::Forward),
            BoundaryQuery::NextWord,
        ),
        (EditCommand::SelectWordAt(1), BoundaryQuery::WordRange),
    ];
    for (command, query) in cases {
        let mut buffer = single("abcd");
        caret(&mut buffer, 1);
        let result = buffer.apply(command, &environment);
        assert!(
            matches!(result, Err(EditError::InvalidBoundary { query: got, .. }) if got == query),
            "{query:?} gave {result:?}"
        );
        assert_eq!(buffer.value(), "abcd");
        assert_eq!((buffer.anchor(), buffer.focus()), (1, 1));
        assert_eq!(buffer.event_count(), 0);
    }
}

// ---- boundary lists ----

#[test]
fn boundary_lists_answer_from_the_precomputed_boundaries() {
    // "a", the family emoji, "b", then "  c": graphemes at 0 1 6 7 8 9 10, words "a<family>b" and "c".
    let text: Vec<char> = format!("{FAMILY_TEXT}  c").chars().collect();
    let lists =
        BoundaryLists::new(vec![0, 1, 6, 7, 8, 9, 10], vec![(0, 7), (9, 10)]).expect("valid lists");

    assert_eq!(lists.previous_grapheme(&text, 6), Ok(1));
    assert_eq!(lists.previous_grapheme(&text, 7), Ok(6));
    assert_eq!(lists.next_grapheme(&text, 1), Ok(6));
    assert_eq!(lists.next_grapheme(&text, 0), Ok(1));
    // An offset inside a grapheme steps to the boundary on that side.
    assert_eq!(lists.previous_grapheme(&text, 3), Ok(1));
    assert_eq!(lists.next_grapheme(&text, 3), Ok(6));
    assert_eq!(lists.next_grapheme(&text, 10), Ok(10));

    assert_eq!(lists.next_word(&text, 0), Ok(7));
    assert_eq!(lists.next_word(&text, 7), Ok(10));
    assert_eq!(lists.next_word(&text, 10), Ok(10));
    assert_eq!(lists.previous_word(&text, 10), Ok(9));
    assert_eq!(lists.previous_word(&text, 9), Ok(0));
    assert_eq!(lists.previous_word(&text, 0), Ok(0));

    assert_eq!(lists.word_range(&text, 3), Ok((0, 7)));
    assert_eq!(lists.word_range(&text, 7), Ok((0, 7)), "the end of a word");
    assert_eq!(lists.word_range(&text, 8), Ok((7, 9)), "between the spaces");
    assert_eq!(lists.word_range(&text, 9), Ok((9, 10)));
}

#[test]
fn boundary_lists_without_words_select_the_whole_gap() {
    let text: Vec<char> = "   ".chars().collect();
    let lists = BoundaryLists::new(vec![0, 1, 2, 3], vec![]).expect("valid lists");
    assert_eq!(lists.word_range(&text, 1), Ok((0, 3)));
    assert_eq!(lists.next_word(&text, 0), Ok(3));
    assert_eq!(lists.previous_word(&text, 3), Ok(0));
}

#[test]
fn boundary_lists_built_for_another_text_are_an_error() {
    let lists = BoundaryLists::new(vec![0, 1, 2], vec![(0, 2)]).expect("valid lists");
    let longer: Vec<char> = "abc".chars().collect();
    let mismatch = EditError::TextMismatch {
        built_for: 2,
        buffer: 3,
    };
    assert_eq!(lists.previous_grapheme(&longer, 2), Err(mismatch));
    assert_eq!(lists.next_grapheme(&longer, 0), Err(mismatch));
    assert_eq!(lists.previous_word(&longer, 2), Err(mismatch));
    assert_eq!(lists.next_word(&longer, 0), Err(mismatch));
    assert_eq!(lists.word_range(&longer, 0), Err(mismatch));
}

#[test]
fn malformed_boundary_lists_are_rejected() {
    let malformed = Err(EditError::MalformedBoundaryLists);
    assert_eq!(BoundaryLists::new(vec![], vec![]), malformed);
    assert_eq!(BoundaryLists::new(vec![1, 2], vec![]), malformed);
    assert_eq!(BoundaryLists::new(vec![0, 2, 2], vec![]), malformed);
    assert_eq!(BoundaryLists::new(vec![0, 3, 2], vec![]), malformed);
    // A word that is empty, backwards, past the text, or overlapping the one before it.
    assert_eq!(BoundaryLists::new(vec![0, 2], vec![(1, 1)]), malformed);
    assert_eq!(BoundaryLists::new(vec![0, 2], vec![(1, 3)]), malformed);
    assert_eq!(
        BoundaryLists::new(vec![0, 1, 2, 3], vec![(0, 2), (1, 3)]),
        malformed
    );
    // The empty text has one boundary.
    assert!(BoundaryLists::new(vec![0], vec![]).is_ok());
}

#[test]
fn a_buffer_edits_through_boundary_lists() {
    let mut buffer = single(FAMILY_TEXT);
    caret(&mut buffer, 1 + FAMILY_LEN);
    let lists = BoundaryLists::new(vec![0, 1, 6, 7], vec![(0, 7)]).expect("valid lists");
    let environment = EditEnvironment::new(&lists);
    let result = buffer
        .apply(
            EditCommand::DeleteGrapheme(Direction::Backward),
            &environment,
        )
        .expect("the lists fit the text");
    assert!(result.text_changed);
    assert_eq!(buffer.value(), "ab");

    // The lists no longer describe the shorter text.
    let stale = buffer.apply(
        EditCommand::DeleteGrapheme(Direction::Backward),
        &environment,
    );
    assert_eq!(
        stale,
        Err(EditError::TextMismatch {
            built_for: 7,
            buffer: 2
        })
    );
    assert_eq!(buffer.value(), "ab");
}

// ---- read-only and secure ----

#[test]
fn read_only_blocks_every_edit_and_allows_movement_and_selection() {
    let config = EditConfig {
        multiline: true,
        read_only: true,
        ..EditConfig::default()
    };
    let edits = [
        EditCommand::InsertText("x".to_string()),
        EditCommand::InsertLineBreak,
        EditCommand::ReplaceText("x".to_string()),
        EditCommand::PasteText("x".to_string()),
        EditCommand::Paste,
        EditCommand::Cut,
        EditCommand::Undo,
        EditCommand::Redo,
        EditCommand::DeleteGrapheme(Direction::Backward),
        EditCommand::DeleteWord(Direction::Forward),
        EditCommand::DeleteToLineEdge(Direction::Backward),
        EditCommand::UpdateComposition {
            text: "a".to_string(),
            selection: 0..1,
        },
    ];
    for command in edits {
        let mut buffer = with_config("hello", config);
        select(&mut buffer, 1, 3);
        let result = run(&mut buffer, command.clone());
        assert_eq!(result.blocked, Some(Blocked::ReadOnly), "{command:?}");
        assert_eq!(result.clipboard, None, "{command:?}");
        assert_eq!(buffer.value(), "hello", "{command:?}");
        assert_eq!(buffer.event_count(), 0, "{command:?}");
        assert!(buffer.composition().is_none(), "{command:?}");
    }

    let allowed = [
        move_grapheme(Direction::Backward, false),
        move_word(Direction::Forward, true),
        move_line(Direction::Forward, false),
        EditCommand::MoveLineEdge {
            direction: Direction::Forward,
            extend: false,
        },
        EditCommand::MoveDocumentEdge {
            direction: Direction::Backward,
            extend: true,
        },
        EditCommand::MovePage {
            direction: Direction::Forward,
            extend: false,
        },
        EditCommand::SelectAll,
        EditCommand::SelectWordAt(2),
        EditCommand::SetSelection {
            anchor: 0,
            focus: 2,
        },
        EditCommand::Copy,
        EditCommand::CancelComposition,
    ];
    for command in allowed {
        let mut buffer = with_config("hello", config);
        select(&mut buffer, 1, 3);
        assert_eq!(
            run(&mut buffer, command.clone()).blocked,
            None,
            "{command:?}"
        );
    }
}

#[test]
fn read_only_copy_still_copies() {
    let mut buffer = with_config(
        "hello",
        EditConfig {
            read_only: true,
            ..EditConfig::default()
        },
    );
    select(&mut buffer, 1, 4);
    let result = run(&mut buffer, EditCommand::Copy);
    assert_eq!(result.clipboard, Some(ClipboardEffect::Write("ell".into())));
}

#[test]
fn secure_blocks_copy_and_cut_without_touching_the_text() {
    let mut buffer = with_config(
        "secret",
        EditConfig {
            secure: true,
            ..EditConfig::default()
        },
    );
    select(&mut buffer, 0, 6);
    for command in [EditCommand::Copy, EditCommand::Cut] {
        let result = run(&mut buffer, command.clone());
        assert_eq!(result.blocked, Some(Blocked::Secure), "{command:?}");
        assert_eq!(result.clipboard, None, "{command:?}");
        assert!(!result.text_changed, "{command:?}");
    }
    assert_eq!(buffer.value(), "secret");
    assert_eq!(buffer.selection_range(), 0..6);
}

#[test]
fn secure_still_allows_typing_pasting_and_deleting() {
    let mut buffer = with_config(
        "",
        EditConfig {
            secure: true,
            ..EditConfig::default()
        },
    );
    type_text(&mut buffer, "pw");
    run(&mut buffer, EditCommand::PasteText("123".to_string()));
    run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.value(), "pw12");
}

#[test]
fn secure_treats_the_whole_text_as_one_word() {
    let config = EditConfig {
        secure: true,
        ..EditConfig::default()
    };
    let mut buffer = with_config("pass word", config);
    caret(&mut buffer, 4);
    run(&mut buffer, move_word(Direction::Forward, false));
    assert_eq!(buffer.focus(), 9);
    caret(&mut buffer, 4);
    run(&mut buffer, move_word(Direction::Backward, false));
    assert_eq!(buffer.focus(), 0);

    caret(&mut buffer, 4);
    run(&mut buffer, EditCommand::DeleteWord(Direction::Backward));
    assert_eq!(buffer.value(), " word");

    run(&mut buffer, EditCommand::SelectWordAt(2));
    assert_eq!(buffer.selection_range(), 0..5);
}

// ---- clipboard ----

#[test]
fn copy_returns_the_selected_text_and_changes_nothing() {
    let mut buffer = single("hello");
    select(&mut buffer, 1, 4);
    let result = run(&mut buffer, EditCommand::Copy);
    assert_eq!(result.clipboard, Some(ClipboardEffect::Write("ell".into())));
    assert!(!result.text_changed && !result.selection_changed);
    assert_eq!(result.event_count, 0);

    // A backward selection copies the same text.
    select(&mut buffer, 4, 1);
    let result = run(&mut buffer, EditCommand::Copy);
    assert_eq!(result.clipboard, Some(ClipboardEffect::Write("ell".into())));
}

#[test]
fn copy_with_only_a_caret_copies_nothing() {
    let mut buffer = single("hello");
    assert_eq!(run(&mut buffer, EditCommand::Copy), nothing(0));
    assert_eq!(run(&mut buffer, EditCommand::Cut), nothing(0));
    assert_eq!(buffer.value(), "hello");
}

#[test]
fn cut_removes_the_selection_and_returns_it() {
    let mut buffer = single("hello");
    select(&mut buffer, 1, 4);
    let result = run(&mut buffer, EditCommand::Cut);
    assert_eq!(buffer.value(), "ho");
    assert_eq!(result.clipboard, Some(ClipboardEffect::Write("ell".into())));
    assert_eq!(result.input_type, Some(InputType::DeleteByCut));
    assert_eq!(result.data, None);
    assert!(result.text_changed);
    assert_eq!(result.event_count, 1);
    // One undo brings it back.
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "hello");
    assert_eq!(buffer.selection_range(), 1..4);
}

#[test]
fn paste_asks_for_the_clipboard_and_changes_nothing() {
    let mut buffer = single("hello");
    let result = run(&mut buffer, EditCommand::Paste);
    assert_eq!(result.clipboard, Some(ClipboardEffect::Read));
    assert!(!result.text_changed && result.blocked.is_none());
    assert_eq!(buffer.value(), "hello");
}

#[test]
fn paste_text_replaces_the_selection() {
    let mut buffer = single("hello");
    select(&mut buffer, 1, 4);
    let result = run(&mut buffer, EditCommand::PasteText("ipp".to_string()));
    assert_eq!(buffer.value(), "hippo");
    assert_eq!(buffer.focus(), 4);
    assert_eq!(result.input_type, Some(InputType::InsertFromPaste));
    assert_eq!(result.data.as_deref(), Some("ipp"));
    // An empty clipboard pastes nothing.
    assert_eq!(
        run(&mut buffer, EditCommand::PasteText(String::new())),
        nothing(1)
    );
}

// ---- undo and redo ----

#[test]
fn undo_reverts_an_edit_and_redo_reapplies_it() {
    let mut buffer = single("");
    insert(&mut buffer, "a");

    let result = run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "");
    assert_eq!(buffer.focus(), 0);
    assert_eq!(result.input_type, Some(InputType::HistoryUndo));
    assert!(result.text_changed && result.selection_changed);
    assert_eq!(result.event_count, 2);

    let result = run(&mut buffer, EditCommand::Redo);
    assert_eq!(buffer.value(), "a");
    assert_eq!(buffer.focus(), 1);
    assert_eq!(result.input_type, Some(InputType::HistoryRedo));
    assert_eq!(result.event_count, 3);
}

#[test]
fn undo_and_redo_with_no_history_do_nothing() {
    let mut buffer = single("abc");
    assert_eq!(run(&mut buffer, EditCommand::Undo), nothing(0));
    assert_eq!(run(&mut buffer, EditCommand::Redo), nothing(0));
    assert_eq!(buffer.value(), "abc");
}

#[test]
fn undo_restores_the_selection_that_the_edit_replaced() {
    let mut buffer = single("hello");
    select(&mut buffer, 1, 4);
    run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.value(), "ho");
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "hello");
    assert_eq!((buffer.anchor(), buffer.focus()), (1, 4));
}

#[test]
fn consecutive_typing_is_one_undo_entry() {
    let mut buffer = single("");
    type_text(&mut buffer, "hello");
    assert_eq!(buffer.undo.len(), 1);
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "");
}

#[test]
fn white_space_ends_a_run_and_is_its_own_entry() {
    let mut buffer = single("");
    type_text(&mut buffer, "hello world");
    assert_eq!(buffer.undo.len(), 3, "hello, the space, world");
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "hello ");
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "hello");
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "");
}

#[test]
fn text_with_white_space_in_it_does_not_coalesce_either_way() {
    let mut buffer = single("");
    insert(&mut buffer, "a b");
    insert(&mut buffer, "c");
    insert(&mut buffer, "d");
    assert_eq!(buffer.undo.len(), 2, "a b, then c and d together");
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "a b");
}

#[test]
fn moving_the_caret_ends_a_run_even_if_it_comes_back() {
    let mut buffer = single("");
    type_text(&mut buffer, "ab");
    run(&mut buffer, move_grapheme(Direction::Backward, false));
    run(&mut buffer, move_grapheme(Direction::Forward, false));
    type_text(&mut buffer, "c");
    assert_eq!(buffer.undo.len(), 2);
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "ab");
}

#[test]
fn an_insert_over_a_selection_starts_a_new_run_that_later_typing_joins() {
    let mut buffer = single("");
    type_text(&mut buffer, "abc");
    select(&mut buffer, 0, 3);
    type_text(&mut buffer, "xy");
    assert_eq!(buffer.value(), "xy");
    assert_eq!(buffer.undo.len(), 2);
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "abc");
    assert_eq!(buffer.selection_range(), 0..3);
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "");
}

#[test]
fn a_copy_does_not_end_a_run() {
    let mut buffer = single("");
    type_text(&mut buffer, "ab");
    run(&mut buffer, EditCommand::Copy);
    run(&mut buffer, EditCommand::Paste);
    type_text(&mut buffer, "c");
    assert_eq!(buffer.undo.len(), 1);
}

#[test]
fn a_new_edit_clears_the_redo_stack() {
    let mut buffer = single("");
    insert(&mut buffer, "a");
    run(&mut buffer, EditCommand::Undo);
    insert(&mut buffer, "b");
    assert_eq!(run(&mut buffer, EditCommand::Redo), nothing(3));
    assert_eq!(buffer.value(), "b");
}

#[test]
fn undo_is_limited_to_undo_limit_entries() {
    let mut buffer = single("");
    let edits = UNDO_LIMIT + 5;
    for _ in 0..edits {
        // White space never coalesces, so each is its own entry.
        insert(&mut buffer, " ");
    }
    assert_eq!(buffer.undo.len(), UNDO_LIMIT);
    for _ in 0..edits {
        run(&mut buffer, EditCommand::Undo);
    }
    assert_eq!(
        buffer.text().len(),
        5,
        "the five oldest edits cannot be undone"
    );
}

#[test]
fn redo_after_the_limit_still_works() {
    let mut buffer = single("");
    for _ in 0..UNDO_LIMIT + 2 {
        insert(&mut buffer, " ");
    }
    for _ in 0..UNDO_LIMIT {
        run(&mut buffer, EditCommand::Undo);
    }
    for _ in 0..UNDO_LIMIT {
        run(&mut buffer, EditCommand::Redo);
    }
    assert_eq!(buffer.text().len(), UNDO_LIMIT + 2);
}

// ---- composition ----

fn preedit(text: &str, selection: Range<usize>) -> EditCommand {
    EditCommand::UpdateComposition {
        text: text.to_string(),
        selection,
    }
}

#[test]
fn a_composition_shows_at_the_caret_but_is_not_in_the_text() {
    let mut buffer = single("ab");
    caret(&mut buffer, 1);
    let result = run(&mut buffer, preedit("\u{304B}\u{306A}", 0..1));
    assert_eq!(result.composition, CompositionEvent::Start);
    assert!(!result.text_changed && !result.selection_changed);
    assert_eq!(result.event_count, 0);
    assert_eq!(buffer.value(), "ab");
    let composition = buffer.composition().expect("composing");
    assert_eq!(composition.text(), ['\u{304B}', '\u{306A}']);
    assert_eq!(composition.selection(), 0..1);
    let shown: String = buffer.display_text().into_iter().collect();
    assert_eq!(shown, "a\u{304B}\u{306A}b");
    assert_eq!(buffer.preedit_range(), Some(1..3));
}

#[test]
fn without_a_composition_the_display_text_is_the_text() {
    let buffer = single("abc");
    assert_eq!(buffer.display_text(), buffer.text());
    assert_eq!(buffer.preedit_range(), None);
}

#[test]
fn starting_a_composition_replaces_the_selection() {
    let mut buffer = single("hello");
    select(&mut buffer, 1, 4);
    let result = run(&mut buffer, preedit("x", 0..1));
    assert_eq!(result.composition, CompositionEvent::Start);
    assert!(result.text_changed && result.selection_changed);
    assert_eq!(result.input_type, Some(InputType::DeleteContentBackward));
    assert_eq!(result.data, None);
    assert_eq!(result.event_count, 1);
    assert_eq!(buffer.value(), "ho");
    assert_eq!((buffer.anchor(), buffer.focus()), (1, 1));
    // Cancelling and undoing brings the selected text back.
    run(&mut buffer, EditCommand::CancelComposition);
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "hello");
}

#[test]
fn updating_a_composition_changes_the_preedit_and_nothing_else() {
    let mut buffer = single("ab");
    run(&mut buffer, preedit("\u{304B}", 0..1));
    let result = run(&mut buffer, preedit("\u{304B}\u{306A}\u{308A}", 1..3));
    assert_eq!(result.composition, CompositionEvent::Update);
    assert!(!result.text_changed);
    assert_eq!(result.event_count, 0);
    let composition = buffer.composition().expect("composing");
    assert_eq!(composition.text().len(), 3);
    assert_eq!(composition.selection(), 1..3);

    // The same preedit again is not an update.
    let result = run(&mut buffer, preedit("\u{304B}\u{306A}\u{308A}", 1..3));
    assert_eq!(result.composition, CompositionEvent::None);
    // A different selection of the same preedit is.
    let result = run(&mut buffer, preedit("\u{304B}\u{306A}\u{308A}", 0..3));
    assert_eq!(result.composition, CompositionEvent::Update);
}

#[test]
fn committing_inserts_the_text_and_ends_the_composition() {
    let mut buffer = single("ab");
    caret(&mut buffer, 1);
    run(&mut buffer, preedit("\u{304B}\u{306A}", 0..2));
    let result = insert(&mut buffer, "\u{4EEE}\u{540D}");
    assert_eq!(result.composition, CompositionEvent::End);
    assert!(result.text_changed);
    assert_eq!(result.input_type, Some(InputType::InsertText));
    assert_eq!(result.data.as_deref(), Some("\u{4EEE}\u{540D}"));
    assert_eq!(result.event_count, 1);
    assert_eq!(buffer.value(), "a\u{4EEE}\u{540D}b");
    assert_eq!(buffer.focus(), 3);
    assert!(buffer.composition().is_none());
    assert_eq!(buffer.preedit_range(), None);
}

#[test]
fn the_commit_is_cut_to_max_length_but_the_preedit_is_not() {
    let mut buffer = limited("ab", 3);
    run(&mut buffer, preedit("\u{304B}\u{306A}\u{308A}", 0..3));
    assert_eq!(buffer.composition().map(|c| c.text().len()), Some(3));
    let result = insert(&mut buffer, "\u{304B}\u{306A}\u{308A}");
    assert_eq!(buffer.value(), "ab\u{304B}");
    assert_eq!(result.data.as_deref(), Some("\u{304B}"));
    assert_eq!(result.composition, CompositionEvent::End);
}

#[test]
fn an_empty_commit_just_ends_the_composition() {
    let mut buffer = single("ab");
    run(&mut buffer, preedit("x", 0..1));
    let result = insert(&mut buffer, "");
    assert_eq!(result.composition, CompositionEvent::End);
    assert!(!result.text_changed);
    assert_eq!(buffer.value(), "ab");
}

#[test]
fn cancelling_drops_the_preedit() {
    let mut buffer = single("ab");
    run(&mut buffer, preedit("x", 0..1));
    let result = run(&mut buffer, EditCommand::CancelComposition);
    assert_eq!(result.composition, CompositionEvent::End);
    assert!(!result.text_changed);
    assert_eq!(buffer.value(), "ab");
    assert!(buffer.composition().is_none());
    // Nothing left to cancel.
    assert_eq!(run(&mut buffer, EditCommand::CancelComposition), nothing(0));
}

#[test]
fn an_empty_preedit_ends_the_composition_like_godot_reports_it() {
    let mut buffer = single("ab");
    run(&mut buffer, preedit("x", 0..1));
    let result = run(&mut buffer, preedit("", 0..0));
    assert_eq!(result.composition, CompositionEvent::End);
    assert!(buffer.composition().is_none());
    // And with no composition, an empty preedit is nothing.
    assert_eq!(run(&mut buffer, preedit("", 0..0)), nothing(0));
}

#[test]
fn keyboard_commands_are_blocked_while_composing() {
    let mut buffer = single("hello");
    select(&mut buffer, 1, 3);
    run(&mut buffer, preedit("x", 0..1));
    let blocked = [
        move_grapheme(Direction::Forward, false),
        move_word(Direction::Forward, false),
        EditCommand::DeleteGrapheme(Direction::Backward),
        EditCommand::Undo,
        EditCommand::SelectAll,
        EditCommand::Copy,
        EditCommand::Paste,
        EditCommand::PasteText("x".to_string()),
        EditCommand::ReplaceText("x".to_string()),
        EditCommand::MoveDocumentEdge {
            direction: Direction::Backward,
            extend: false,
        },
    ];
    for command in blocked {
        let result = run(&mut buffer, command.clone());
        assert_eq!(result.blocked, Some(Blocked::Composing), "{command:?}");
        assert!(buffer.composition().is_some(), "{command:?}");
    }
    assert_eq!(buffer.value(), "hlo");
}

#[test]
fn a_pointer_selection_ends_a_composition() {
    for command in [
        EditCommand::SetSelection {
            anchor: 0,
            focus: 2,
        },
        EditCommand::SelectWordAt(1),
    ] {
        let mut buffer = single("hello");
        run(&mut buffer, preedit("x", 0..1));
        let result = run(&mut buffer, command.clone());
        assert_eq!(result.composition, CompositionEvent::End, "{command:?}");
        assert!(buffer.composition().is_none(), "{command:?}");
        assert!(result.selection_changed, "{command:?}");
    }
}

#[test]
fn a_bad_pointer_selection_leaves_the_composition_alone() {
    let mut buffer = single("hello");
    run(&mut buffer, preedit("x", 0..1));
    let result = try_run(
        &mut buffer,
        EditCommand::SetSelection {
            anchor: 0,
            focus: 99,
        },
    );
    assert_eq!(
        result,
        Err(EditError::OffsetOutOfRange { offset: 99, len: 5 })
    );
    assert!(buffer.composition().is_some());
}

#[test]
fn a_composition_selection_must_lie_inside_the_preedit() {
    let mut buffer = single("hello");
    assert_eq!(
        try_run(&mut buffer, preedit("ab", 0..3)),
        Err(EditError::InvalidRange { start: 0, end: 3 })
    );
    #[expect(
        clippy::reversed_empty_ranges,
        reason = "the invalid input is the point"
    )]
    let backwards = 2..1;
    assert_eq!(
        try_run(&mut buffer, preedit("ab", backwards)),
        Err(EditError::InvalidRange { start: 2, end: 1 })
    );
    assert!(buffer.composition().is_none());
}

// ---- event count and controlled values ----

#[test]
fn the_event_count_goes_up_once_per_text_change_and_only_then() {
    let mut buffer = single("abc");
    assert_eq!(buffer.event_count(), 0);

    run(&mut buffer, move_grapheme(Direction::Backward, false));
    run(&mut buffer, EditCommand::SelectAll);
    run(&mut buffer, EditCommand::Copy);
    run(&mut buffer, preedit("x", 0..1));
    run(&mut buffer, EditCommand::CancelComposition);
    assert_eq!(
        buffer.event_count(),
        1,
        "only the preedit's start deleted the selection"
    );

    let before = buffer.event_count();
    insert(&mut buffer, "d");
    assert_eq!(buffer.event_count(), before + 1);
    run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.event_count(), before + 2);
    // A blocked insert and a no-op delete are not events.
    buffer.set_max_length(Some(0));
    insert(&mut buffer, "e");
    caret(&mut buffer, 0);
    run(
        &mut buffer,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.event_count(), before + 2);
}

#[test]
fn a_fresh_set_text_and_selection_replaces_text_and_history() {
    let mut buffer = single("");
    type_text(&mut buffer, "abcd");
    assert_eq!(buffer.event_count(), 4);

    let outcome = buffer
        .set_text_and_selection(4, "ABCD", None)
        .expect("valid");
    let SetTextOutcome::Applied(result) = outcome else {
        panic!("the count matches, so it applies");
    };
    assert_eq!(buffer.value(), "ABCD");
    assert_eq!((buffer.anchor(), buffer.focus()), (4, 4));
    assert!(result.text_changed && !result.selection_changed);
    assert_eq!(
        result.input_type, None,
        "no input event for a programmatic change"
    );
    assert_eq!(result.data, None);
    assert_eq!(
        buffer.event_count(),
        4,
        "the count only follows input events"
    );
    assert_eq!(result.event_count, 4);
    assert!(buffer.undo.is_empty() && buffer.redo.is_empty());
    assert_eq!(run(&mut buffer, EditCommand::Undo), nothing(4));
}

#[test]
fn set_text_and_selection_puts_the_caret_at_the_end_unless_told() {
    let mut buffer = single("abc");
    buffer
        .set_text_and_selection(0, "h\u{00E9}llo", None)
        .expect("valid");
    assert_eq!((buffer.anchor(), buffer.focus()), (5, 5));

    buffer
        .set_text_and_selection(0, "h\u{00E9}llo", Some(1..3))
        .expect("valid");
    assert_eq!((buffer.anchor(), buffer.focus()), (1, 3));
}

#[test]
fn a_stale_set_text_and_selection_is_ignored() {
    let mut buffer = single("");
    type_text(&mut buffer, "ab");
    select(&mut buffer, 0, 1);
    let before = buffer.clone();
    let outcome = buffer
        .set_text_and_selection(1, "zzz", None)
        .expect("valid");
    assert_eq!(outcome, SetTextOutcome::Stale);
    assert_eq!(buffer.value(), before.value());
    assert_eq!((buffer.anchor(), buffer.focus()), (0, 1));
    assert_eq!(buffer.undo.len(), before.undo.len());
    assert_eq!(buffer.event_count(), 2);
}

#[test]
fn the_react_native_protocol_survives_typing_ahead_of_a_command() {
    // JS transforms "a" to "A" and sends the command with the count of the event it answered.
    let mut buffer = single("");
    insert(&mut buffer, "a");
    assert_eq!(buffer.event_count(), 1);
    // The user types again before the command arrives: the command is stale.
    insert(&mut buffer, "b");
    assert_eq!(
        buffer.set_text_and_selection(1, "A", None),
        Ok(SetTextOutcome::Stale)
    );
    assert_eq!(buffer.value(), "ab");
    // The second `input` event lets JS reconcile again, with the current count.
    let outcome = buffer.set_text_and_selection(2, "AB", None).expect("valid");
    assert!(matches!(outcome, SetTextOutcome::Applied(_)));
    assert_eq!(buffer.value(), "AB");
    // Typing continues from the replaced text, and undo does not reach back before it.
    insert(&mut buffer, "c");
    run(&mut buffer, EditCommand::Undo);
    assert_eq!(buffer.value(), "AB");
    assert_eq!(run(&mut buffer, EditCommand::Undo).input_type, None);
    assert_eq!(buffer.value(), "AB");
}

#[test]
fn set_text_and_selection_validates_the_selection_even_when_fresh() {
    let mut buffer = single("abc");
    #[expect(
        clippy::reversed_empty_ranges,
        reason = "the invalid input is the point"
    )]
    let backwards = 3..2;
    assert_eq!(
        buffer.set_text_and_selection(0, "hello", Some(backwards)),
        Err(EditError::InvalidRange { start: 3, end: 2 })
    );
    assert_eq!(
        buffer.set_text_and_selection(0, "hello", Some(0..9)),
        Err(EditError::OffsetOutOfRange { offset: 9, len: 5 })
    );
    assert_eq!(buffer.value(), "abc");
}

#[test]
fn set_text_and_selection_ends_a_composition() {
    let mut buffer = single("ab");
    run(&mut buffer, preedit("x", 0..1));
    let outcome = buffer.set_text_and_selection(0, "ab", None).expect("valid");
    let SetTextOutcome::Applied(result) = outcome else {
        panic!("fresh");
    };
    assert_eq!(result.composition, CompositionEvent::End);
    assert!(!result.text_changed, "the same text");
    assert!(buffer.composition().is_none());
}

#[test]
fn set_text_and_selection_applies_the_text_exactly_as_given() {
    let mut buffer = single("");
    buffer
        .set_text_and_selection(0, "a\nb\u{1F600}", None)
        .expect("valid");
    assert_eq!(buffer.value(), "a\nb\u{1F600}");
}

// ---- the mapping from commands to events ----

#[test]
fn commands_know_their_before_input_fields() {
    let cases = [
        (
            EditCommand::InsertText("a".to_string()),
            Some(InputType::InsertText),
            Some("a"),
        ),
        (
            EditCommand::InsertLineBreak,
            Some(InputType::InsertLineBreak),
            None,
        ),
        (
            EditCommand::ReplaceText("r".to_string()),
            Some(InputType::InsertReplacementText),
            Some("r"),
        ),
        (
            EditCommand::PasteText("p".to_string()),
            Some(InputType::InsertFromPaste),
            Some("p"),
        ),
        (EditCommand::Cut, Some(InputType::DeleteByCut), None),
        (EditCommand::Undo, Some(InputType::HistoryUndo), None),
        (EditCommand::Redo, Some(InputType::HistoryRedo), None),
        (
            EditCommand::DeleteGrapheme(Direction::Backward),
            Some(InputType::DeleteContentBackward),
            None,
        ),
        (
            EditCommand::DeleteGrapheme(Direction::Forward),
            Some(InputType::DeleteContentForward),
            None,
        ),
        (
            EditCommand::DeleteWord(Direction::Backward),
            Some(InputType::DeleteWordBackward),
            None,
        ),
        (
            EditCommand::DeleteWord(Direction::Forward),
            Some(InputType::DeleteWordForward),
            None,
        ),
        (
            EditCommand::DeleteToLineEdge(Direction::Backward),
            Some(InputType::DeleteSoftLineBackward),
            None,
        ),
        (
            EditCommand::DeleteToLineEdge(Direction::Forward),
            Some(InputType::DeleteSoftLineForward),
            None,
        ),
        (EditCommand::Paste, None, None),
        (EditCommand::Copy, None, None),
        (EditCommand::SelectAll, None, None),
        (EditCommand::SelectWordAt(0), None, None),
        (
            EditCommand::SetSelection {
                anchor: 0,
                focus: 0,
            },
            None,
            None,
        ),
        (move_grapheme(Direction::Backward, false), None, None),
        (move_word(Direction::Backward, false), None, None),
        (
            EditCommand::MoveLineEdge {
                direction: Direction::Backward,
                extend: false,
            },
            None,
            None,
        ),
        (move_line(Direction::Backward, false), None, None),
        (
            EditCommand::MovePage {
                direction: Direction::Backward,
                extend: false,
            },
            None,
            None,
        ),
        (
            EditCommand::MoveDocumentEdge {
                direction: Direction::Backward,
                extend: false,
            },
            None,
            None,
        ),
        (preedit("a", 0..1), None, None),
        (EditCommand::CancelComposition, None, None),
    ];
    for (command, input_type, data) in cases {
        assert_eq!(command.input_type(), input_type, "{command:?}");
        assert_eq!(command.data(), data, "{command:?}");
    }
}

#[test]
fn input_types_have_their_dom_names() {
    let names = [
        (InputType::InsertText, "insertText"),
        (InputType::InsertLineBreak, "insertLineBreak"),
        (InputType::InsertFromPaste, "insertFromPaste"),
        (InputType::InsertReplacementText, "insertReplacementText"),
        (InputType::DeleteContentBackward, "deleteContentBackward"),
        (InputType::DeleteContentForward, "deleteContentForward"),
        (InputType::DeleteWordBackward, "deleteWordBackward"),
        (InputType::DeleteWordForward, "deleteWordForward"),
        (InputType::DeleteSoftLineBackward, "deleteSoftLineBackward"),
        (InputType::DeleteSoftLineForward, "deleteSoftLineForward"),
        (InputType::DeleteByCut, "deleteByCut"),
        (InputType::HistoryUndo, "historyUndo"),
        (InputType::HistoryRedo, "historyRedo"),
    ];
    for (input_type, name) in names {
        assert_eq!(input_type.as_str(), name);
    }
}

#[test]
fn check_allowed_answers_without_applying() {
    let mut buffer = with_config(
        "abc",
        EditConfig {
            read_only: true,
            secure: true,
            ..EditConfig::default()
        },
    );
    assert_eq!(
        buffer.check_allowed(&EditCommand::Copy),
        Some(Blocked::Secure)
    );
    assert_eq!(
        buffer.check_allowed(&EditCommand::InsertText("x".into())),
        Some(Blocked::ReadOnly)
    );
    assert_eq!(buffer.check_allowed(&EditCommand::SelectAll), None);
    assert_eq!(buffer.value(), "abc");

    buffer.set_read_only(false);
    buffer.set_secure(false);
    assert_eq!(
        buffer.check_allowed(&EditCommand::InsertText("x".into())),
        None
    );
}

#[test]
fn errors_say_what_was_wrong() {
    let messages = [
        EditError::OffsetOutOfRange { offset: 9, len: 5 }.to_string(),
        EditError::InvalidRange { start: 3, end: 2 }.to_string(),
        EditError::TextMismatch {
            built_for: 7,
            buffer: 2,
        }
        .to_string(),
        EditError::MissingLayout.to_string(),
        EditError::MalformedBoundaryLists.to_string(),
        EditError::InvalidBoundary {
            query: BoundaryQuery::NextWord,
            offset: 1,
            answer: 1,
        }
        .to_string(),
        EditError::InvalidLayout(LayoutProblem::Empty).to_string(),
    ];
    assert!(messages[0].contains('9') && messages[0].contains('5'));
    assert!(messages[1].contains('3') && messages[1].contains('2'));
    assert!(messages[2].contains('7') && messages[2].contains('2'));
    assert!(messages[3].contains("layout"));
    assert!(messages[4].contains("increasing"));
    assert!(messages[5].contains("NextWord"));
    assert!(messages[6].contains("Empty"));
}

#[test]
fn turning_read_only_on_ends_a_composition_that_could_never_end_itself() {
    let mut buffer = single("ab");
    caret(&mut buffer, 1);
    run(&mut buffer, preedit("x", 0..1));
    // A read-only input blocks every composition command, even the empty one that ends it, so without this the
    // preedit would stay and every keyboard command would be refused as composing.
    assert_eq!(buffer.set_read_only(true), CompositionEvent::End);
    assert!(buffer.composition().is_none());
    assert_eq!(buffer.display_text(), buffer.text());
    let moved = run(&mut buffer, move_grapheme(Direction::Backward, false));
    assert_eq!(moved.blocked, None, "the caret moves");
    assert_eq!(buffer.focus(), 0);
    // Nothing composing: turning it on, or off, says nothing.
    assert_eq!(buffer.set_read_only(true), CompositionEvent::None);
    assert_eq!(buffer.set_read_only(false), CompositionEvent::None);
}
