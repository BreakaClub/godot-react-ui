# Text engine track: notes and report

Branch `text-engine`, based on `fd11f41`. Three Godot-free modules for Phases I6 (text selection) and
I7 (TextInput) of `docs/INTERACTION_PLAN.md`: `native/text_offsets.rs`, `native/selection.rs`,
`native/text_input.rs` (tests of the last in `native/text_input/tests.rs`). Nothing uses them yet;
each is declared in `native/lib.rs` with `#[cfg_attr(not(test), allow(dead_code))]` and a comment.
**The integrating phase must remove that attribute.** No other line of `lib.rs` or of any existing
module changed. Neither `INTERACTION_PLAN.md` nor `INTERACTION_PROGRESS.md` was touched: the decisions
below are for the coordinator to fold into the plan's decision log.

## Verification

| Check | Result |
| --- | --- |
| `cargo test --locked` | 251 passed (95 existing, 156 new) |
| New tests | `text_offsets` 15, `selection` 34, `text_input` 107 |
| `cargo clippy --locked --all-targets` | 0 warnings |
| `rustup run stable cargo fmt --check` | clean |

No Godot, Web or JS run was made (none was asked for), so everything below is verified against fakes:
boundaries computed from the text (a combining mark or a ZWJ joins a grapheme, a word is a run of
non-space characters) and a monospace layout that wraps at a fixed column count. Nothing here has been
checked against `TextServer`, `TextParagraph` or `LineEdit` behaviour; I did not read their sources for
this task. Where a decision below mirrors Godot, it is from the plan's text.

## Public API

All items are `pub(crate)`. Each module's header documents its API and rules in full; this is the summary.

### `text_offsets`

Offsets are validated, never clamped. The text is any `IntoIterator<Item = char>` (`str.chars()`,
`slice.iter().copied()`).

- `utf16_length(text) -> usize`
- `utf16_to_code_point(text, utf16_offset) -> Result<usize, OffsetError>`
- `code_point_to_utf16(text, index) -> Result<usize, OffsetError>`
- `utf16_range_to_code_points(text, start, end)` and `code_point_range_to_utf16(text, start, end)`:
  both ends converted, order kept.
- `OffsetError::{Utf16OutOfRange, SplitsSurrogatePair, CodePointOutOfRange}`. The offset equal to the
  length is valid.

### `selection`

- `SelectableNode { tag, len (code points), selectable }`, `Document::new(Vec<SelectableNode>)`
  (document order; `userSelect: none` nodes are listed with `selectable: false`; a repeated tag is
  `SelectionError::DuplicateNode`). `Document::selectable_start_after(tag)` and
  `selectable_end_before(tag)` snap a pointer over a non-selectable node to the nearest selectable position.
- `SelectionPoint { tag, offset }`.
- `TextSelection` (default is "no selection"). Every mutator returns `Result<bool, SelectionError>`:
  `Ok(true)` if the anchor or focus changed (the `selectionchange` condition), and changes nothing on `Err`.
  `collapse(doc, point)`, `extend(doc, point)`, `select_word(doc, point, &impl WordRanges)`,
  `select_node(doc, tag)`, `select_all(doc)`, `select(doc, anchor, focus)`.
  `clear() -> bool`, `node_changed(tag) -> bool` (text changed or node removed: clears if it was inside
  the selection), `clear_if_stale(doc) -> bool`.
  `ranges(doc) -> Result<Vec<NodeRange { tag, start, end }>, _>` (to paint),
  `selected_text(doc, |tag| Option<&str>) -> Result<String, _>` (to copy).
  `anchor()`, `focus()`, `is_active()`, `is_collapsed()`, `covers(tag)`.
- `WordRanges`: `fn word_range(&self, tag, offset) -> (start, end)`, implemented for any
  `Fn(u32, usize) -> (usize, usize)`.

### `text_input`

- `UNDO_LIMIT = 100`, `Direction::{Backward, Forward}`, `InputType` (with `as_str()` giving the DOM string).
- `EditConfig { multiline, read_only, secure, max_length: Option<usize> }`;
  `EditBuffer::new(config)`, `EditBuffer::with_text(config, "defaultValue")` (caret at the end);
  `set_read_only`, `set_secure`, `set_max_length` (multiline is fixed at creation).
- `EditBuffer::apply(EditCommand, &EditEnvironment) -> Result<EditResult, EditError>`.
  `EditCommand`: `InsertText(String)`, `InsertLineBreak`, `ReplaceText(String)`, `PasteText(String)`,
  `Paste`, `Copy`, `Cut`, `Undo`, `Redo`, `SelectAll`, `SelectWordAt(offset)`,
  `SetSelection { anchor, focus }`, `DeleteGrapheme(dir)`, `DeleteWord(dir)`, `DeleteToLineEdge(dir)`,
  `MoveGrapheme/MoveWord/MoveLineEdge/MoveLine/MovePage/MoveDocumentEdge { direction, extend }`,
  `UpdateComposition { text, selection: Range<usize> }`, `CancelComposition`.
  `command.input_type()` and `command.data()` are the `beforeinput` fields;
  `buffer.check_allowed(&command)` says whether a mode blocks it (skip `beforeinput` if so).
- `EditResult { text_changed, selection_changed, input_type, data, clipboard, composition, blocked, event_count }`.
  `text_changed` is exactly when an `input` event is due and when `event_count` went up;
  `input_type`/`data` are that event's fields. `clipboard` is `Write(text)` (copy, cut) or `Read` (paste:
  read the clipboard, then apply `PasteText`). `composition` is `None/Start/Update/End`. `blocked` is
  `Option<Blocked::{ReadOnly, Secure, NotMultiline, Composing, MaxLength}>`.
- `EditBuffer::set_text_and_selection(event_count, value, Option<Range<usize>>) -> Result<SetTextOutcome, EditError>`
  with `SetTextOutcome::{Stale, Applied(EditResult)}`.
- Reading: `text()`, `value()`, `anchor()`, `focus()`, `selection_range()`, `has_selection()`,
  `selection_utf16()`, `utf16_length()`, `event_count()`, `composition()` (`text()`, `selection()`),
  `display_text()` (text with the preedit spliced at the caret) and `preedit_range()`, `config()`.
- Injection, built per `apply` as `EditEnvironment::new(&boundaries)` and, for multi-line,
  `.with_layout(&layout)`:
  - `TextBoundaries`: `previous_grapheme`, `next_grapheme`, `previous_word`, `next_word`, `word_range`
    (each gets the buffer's text and a code point offset and returns `Result<_, EditError>`).
  - `LineLayout`: `line_count`, `line_of(offset)`, `line_range(line)`, `x_of(offset)`,
    `offset_at(line, x)`, `page_lines`.
  - `BoundaryLists::new(graphemes, words)`: a `TextBoundaries` over precomputed lists (checks the text's
    length on every query, so a stale list is `EditError::TextMismatch`, not a wrong answer).
- `EditError::{OffsetOutOfRange, InvalidRange, TextMismatch, MissingLayout, MalformedBoundaryLists,
  InvalidBoundary, InvalidLayout}`. An `Err` leaves the buffer as it was.

## Decisions

Each was made from the plan's text and its invariants, because the plan left it open or the shorthand in
the task description did not cover it.

**Offsets**

1. **Generic over `IntoIterator<Item = char>`**, not `&str` and `&[char]` twins. Godot-side text is a
   `String` and the buffer is a `Vec<char>`; one signature serves both and cannot drift.
2. A lone surrogate cannot be a Rust `char`, so JS strings holding one arrive already replaced.
   Nothing in this module can see one; recorded so nobody looks for a "lone surrogate" error.

**Selection**

3. **`Document` is a snapshot** (indexed by tag), built when a gesture starts. Selection operations are
   then O(log n) lookups, not a scan of the tree, and a repeated tag is an error.
4. **`userSelect: none` nodes are in the list**, flagged. Plan 3.17 says a range skips them, which needs
   them to be present to be skipped. An endpoint in one is `SelectionError::NotSelectable`: the gesture
   layer maps the hit to a selectable position (`selectable_start_after` / `selectable_end_before`).
5. **The selection stores the set of covered nodes** (selectable nodes from the first endpoint's to
   the last's). `node_changed(tag)` must work for a node that has been removed, which is no longer in any
   document, so membership cannot be recomputed from the tree. `clear_if_stale(doc)` is the other half:
   it compares against a fresh document for changes that name no node (a selectable node inserted into
   the range). Without it the plan's rule "text change in the range clears the selection" would miss
   insertions.
6. **A collapsed selection is covered too**: a text change in its node clears it (its offset may no longer
   exist).
7. **A node with `userSelect: none` between the endpoints does not clear the selection when it changes**
   (it contributes no text).
8. **Empty ranges are omitted**, so a collapsed selection has no ranges, and a selection from the end
   of one node to the start of the next has none. `selected_text` therefore joins only non-empty ranges
   with `\n` and does not produce leading or trailing blank lines (browsers differ here; the plan only
   says "nodes joined by `\n`").
9. **Mutators return `Ok(bool)` "changed"** so the host raises `selectionchange` only on a real change.
10. **`extend` with no selection collapses at the point** (Shift+click with nothing selected).
11. **Word bounds are injected as a trait with a closure impl**, and are validated:
    `start <= offset <= end <= len`, else `InvalidWordRange`. No word-granularity drag extension is built;
    `select(doc, anchor, focus)` is the primitive a gesture layer can use for it.

**Edit buffer: shape**

12. **`apply` returns `Result<EditResult, EditError>`**, not a bare `EditResult`. The injected services can
    answer wrongly (a stale layout, a boundary that does not move) and plan 3.2 rule 4 says errors are
    reported, not clamped. A mode blocking a command is *not* an error: it is `EditResult::blocked`.
13. **The injected traits are fallible**, and `apply` checks every answer (a grapheme or word step must
    make progress and stay inside the text; a line index must exist; a line range must lie in the text;
    `offset_at` must land on its line). A bad answer is `InvalidBoundary` / `InvalidLayout` and no state
    has changed.
14. **Boundaries are passed the buffer's text** (`&[char]`) on every call rather than being a precomputed
    value held by the buffer: the text changes with every edit, and a held list would be stale.
    `BoundaryLists` is the adapter for a caller that shapes once and wants lists.
15. **Commands beyond Appendix C**, each needed by the plan elsewhere:
    - `PasteText(String)` next to `Paste`. `beforeinput` for a paste needs the pasted `data` before the
      edit, and the buffer never reads a clipboard, so paste is a request (`ClipboardEffect::Read`) and then
      an insert with `inputType: insertFromPaste`.
    - `ReplaceText(String)`: plan 3.18 specifies `_set_text` as an `insertReplacementText` edit with the
      caret at 0.
    - `SetSelection { anchor, focus }`: pointer caret placement, drag selection and `setSelectionRange`.
    - `SelectWordAt(offset)`: double click (needs the injected word bounds, which `apply` already has).
    - `UpdateComposition` and `CancelComposition`: IME.
16. **`Direction::{Backward, Forward}` everywhere** (up/left/start and down/right/end), one enum for
    the `dir` of Appendix C.

**Edit buffer: behaviour**

17. **The event count increases once per command with `text_changed`, and nothing else bumps it**:
    not selection changes, not preedit updates, not `set_text_and_selection`. Reason: plan 3.18 increments
    it when it queues an `input` event; React Native's native side does not count its own
    `setTextAndSelection` either (JS would then send stale counts). The result carries the count after
    the command.
18. **`maxLength` follows the DOM**: counted in UTF-16 units over the whole text; an insertion is cut to
    the prefix that fits and never splits a surrogate pair (the first character that does not fit ends
    the prefix; later, smaller characters are not tried); a selection being replaced frees its room;
    an insertion that fits nothing is `Blocked::MaxLength` and leaves the selection undeleted; text already
    longer than `maxLength` is kept (lowering it never truncates), deletes always work; a line break costs one
    unit; the IME preedit is not counted, its commit is cut like any insert; `set_text_and_selection`
    applies no limit.
19. **Line breaks are normalised on insert, paste and replace**: a single-line input drops `\r` and `\n`;
    a multi-line input turns `\r\n` and `\r` into `\n`. `set_text_and_selection` and `with_text` are
    applied as given, so a controlled value round-trips exactly (the host owns what it sends).
20. **Undo coalescing**: an `InsertText` joins the previous entry when (a) the previous command was a
    coalescible insert that ended at this caret, (b) nothing is selected, and (c) the inserted text has no
    white space. White space is never coalesced either way (so "hello world" is three entries: `hello`,
    ` `, `world`). Any other command ends the run except `Copy` and the paste request (they change
    nothing). Snapshots are whole-text clones, as plan 3.18 says; a very large multi-line value makes
    100 snapshots large, which the plan accepted.
21. **Undo/redo restore the selection** as well as the text. An undo whose snapshot has the same text
    reports no `text_changed` (no `input` event, no count), only a selection change.
22. **Cut and Copy need a selection**; with a caret they do nothing. **Secure** blocks copy and cut
    entirely (no deletion either).
23. **Secure input has no words**: word moves, word delete and `SelectWordAt` use the whole text (caret
    to the edge, delete to the edge, select all), so caret jumps and double clicks do not reveal where
    the spaces in a password are. (Plan 3.18 says only "copy/cut disabled for secure"; this is an addition.)
24. **`readOnly` blocks every command that edits, composition included**, and allows movement,
    selection and copy. A line break in a single-line input is `Blocked::NotMultiline`, not a no-op.
25. **`MoveGrapheme` without Shift and with a selection collapses to that side** (Appendix C); `MoveWord`
    and the rest move from the focus and collapse. Delete commands with a selection delete just the
    selection, with the `inputType` of the command that was pressed.
26. **Vertical movement**: the desired x is kept across consecutive `MoveLine`/`MovePage` and reset by
    any other command. Up from the first line and down from the last line go to the start and end of
    the text, as browsers do (also for a page move that cannot move). A single-line input needs no
    layout: vertical moves go to the edges, line edge moves and `DeleteToLineEdge` use the whole text.
    A multi-line input without a layout is `EditError::MissingLayout`.
27. **No caret affinity.** The `LineLayout` contract is that each caret offset belongs to exactly one line
    (an offset at a soft wrap is on the line after it) and `line_range(line)` returns the first and last
    offsets *on that line*, the last being where End puts the caret. The consequence is that End on a soft
    wrapped row puts the caret before that row's last character. A layout that wants the visual end of a row
    needs affinity state in the buffer, which I judged out of scope; if I7D needs it, `MoveLineEdge` is the
    place.
28. **IME**: the preedit is stored apart from the text and is not under `maxLength`. The first non-empty
    `UpdateComposition` deletes the selection (as `LineEdit` does on `NOTIFICATION_OS_IME_UPDATE`); that
    deletion is a normal edit reported as `text_changed` with `deleteContentBackward` together with
    `composition: Start`, so React sees the value change. A repeated identical update reports nothing.
    Empty preedit text means the composition ended (Godot's `ime_get_text()` empty). The commit is a
    normal `InsertText`, which ends the composition first (so both orders Godot can deliver work: the
    clear then the key events, or the key events first). While composing, keyboard commands are
    `Blocked::Composing`; the pointer commands `SetSelection` and `SelectWordAt` cancel the composition.
    The preedit selection is `Range<usize>` in code points of the preedit; Godot's `ime_get_selection()`
    gives a start and a length, so the host converts.
29. **`set_text_and_selection` validates its selection first, then the count**: a malformed selection is an
    error even for a stale command. A stale one changes nothing and returns `Stale`. A fresh one replaces
    the text, puts the caret at the end unless a `start..end` range is given (forward direction), ends any
    composition, clears undo and redo, and raises no `input` event (`input_type` and `data` unset).

## What the integrating phases must know

- **Remove the `cfg_attr(not(test), allow(dead_code))` lines** in `lib.rs` when you wire these in. While
  they are unused, under `cfg(test)` every item is exercised by a test, so the attribute hides nothing in
  the test build; the non-test build needs it.
- **I6**
  - Build a `Document` per gesture (or cache it until the tree's text nodes change) from the mounted
    tree's `Text` nodes in pre-order. Do not build it in the commit path (invariant 6); there, call
    `node_changed(tag)` for each created/updated-text/deleted `Text` tag in the commit, which is
    proportional to the change. Call `clear_if_stale` with a fresh document when a commit
    inserted or reordered selectable nodes and you have a document at hand anyway.
  - `getSelection()` converts the endpoints with `text_offsets` against each node's current text.
  - `select_word` needs `shaped_text_get_word_breaks` results wrapped as `WordRanges`; the contract is
    "contains the offset" (the closure may return either word at a boundary).
- **I7**
  - Resolve the Appendix C action to a command, call `check_allowed` and skip `beforeinput` if it
    returns a reason, dispatch `beforeinput` with `command.input_type()` and `command.data()`, apply, then
    emit from the result: `input` when `text_changed` (value from `value()`, selection from
    `selection_utf16()`, `eventCount` from `result.event_count`), `selectionchange` when
    `selection_changed`, `compositionstart` + `compositionupdate` / `compositionupdate` / `compositionend`
    from `result.composition`, and act on `result.clipboard`.
  - Paste is two steps: `Paste` returns `ClipboardEffect::Read`; read the clipboard (the Web
    clipboard read is asynchronous and possibly stale, I7C), then apply `PasteText(text)`, which is the
    command whose `beforeinput` has the data.
  - Render `display_text()` (it contains the preedit) and underline `preedit_range()` with
    `composition().selection()` as the converting part. Caret and scroll computations use the display text.
  - Call `CancelComposition` when the input loses focus; the buffer does not know about focus.
  - The `LineLayout` and `TextBoundaries` implementations are in `text_input_godot.rs`; they must satisfy the
    contracts in the trait documentation, which `apply` enforces by returning `InvalidBoundary` /
    `InvalidLayout`. Word stops are the caret positions a word move lands on (the plan's `LineEdit`
    reference is the model), not the word's own start and end for both directions.
  - The unicode rule that turns a key into `InsertText` (`unicode >= 32`, no Ctrl/Alt/Meta), `onSubmit`
    on Enter, caret blinking, scrolling to the caret, `selectTextOnFocus`, `autoFocus` and the
    `selectionDirection` string are not in the buffer.
  - Under `max_length` an insert can be refused with `Blocked::MaxLength`; there is no `input` event
    then, and the host may want to flash or ignore.
  - Changing `multiline` after creation is not supported (it is create-time). Changing `read_only`,
    `secure`, `max_length` through the setters is fine at any time.
- **Not built:** word-granularity drag after a double click, caret affinity, `selectionDirection`,
  Chrome's coalescing of consecutive Backspace/Delete into one undo entry (the plan coalesces only
  `insertText`), and DOM `insertCompositionText` input events (the preedit never enters the value).
