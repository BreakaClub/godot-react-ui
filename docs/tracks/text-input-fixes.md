# Text input fixes (review of Phase I7)

Branch `text-input-fixes`, from main `944ca90`. An independent read-only review of the `TextInput` code found nine defects
(plus two things that are by design); this branch fixes them. `docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md`
are not edited here; the decisions below (F1 and up) are for the coordinator to fold into the plan's decision log. Gate
results are at the end.

## What changed, per finding

| # | Defect | Fix | Where | Test that fails without it |
| --- | --- | --- | --- | --- |
| 1 | A paste of nothing deleted the selection | A paste that is empty once line breaks are dealt with is no paste: no `beforeinput`, no edit, selection kept | `text_input.rs` (`PasteText`), `web_clipboard.rs` (`paste_text`) | unit `an_empty_paste_over_a_selection_pastes_nothing_and_keeps_the_selection`; forms section (empty and line-break clipboards over a selection); Web: an image on the browser clipboard |
| 2 | The soft keyboard's element kept the old text | The root writes the text (and selection) to the element itself | `web_keyboard.rs`; see "What the soft keyboard needed" | Web touch scenario: a message box cleared by Enter, a digits-only field, `maxLength` |
| 3 | A text ending in a line break scrolled its caret out of view | The scroll range counts the empty last line | `shaping.rs` (`scroll_ranges`), `text_input.rs` (`display_last_char`) | unit `the_last_displayed_character_...`; forms section `verifyTrailingBreak` (keyboard reveal, `scrollHeight`, the wheel reaching the end) |
| 4 | An unfinished composition was dropped on blur | It is committed as an `insertText` through `beforeinput` (a refusal discards it) | `platform.rs` (`text_input_blurred`, `commit_blurred_preedits`), `paint.rs` (`tick_text_input`) | Web: a Chrome composition left because JS moved the focus, and one refused by `beforeinput` |
| 5 | Assistive "set text selection" counted in the whole text | Rows keep their hard line's start in their element meta; the request is resolved through its `start_element`/`end_element` | `accessibility.rs`, `get_text_line_elements` | `verify:a11y --engine=stock`: second hard line, and across both |
| 6 | The press after a `focus()` of a `selectTextOnFocus` input was ignored | The note is made only when a pointer is down on the input, and taken back at pointer up | `platform.rs`, `pointer.rs` | forms section `verifyFixes`: the kit `TextField` label |
| 7 | `readOnly` while composing left a stuck preedit | Turning it on ends the composition (`compositionend` queued, IME and keyboard closed) | `text_input.rs` (`set_read_only`), `shaping.rs` (`sync_text_input_props`) | unit `turning_read_only_on_ends_a_composition_...`; Web: F7 on the picky field while composing |
| 8a | An assistive replacement with no text did nothing | It deletes the selection (through `beforeinput`) | `accessibility.rs` | a11y verifier |
| 8b | A refused set-value moved the caret | The caret moves only if the text was set | `accessibility.rs` (`replacement_for`) | a11y verifier |
| 8c | The caret was not revealed when the box changed | A focused input's caret is revealed once layout settles after a box or font change | `mount.rs`, `layout.rs`, `paint.rs`, `shaping.rs` | forms section `verifyFixes` (F6 narrows the field under its caret) |
| 8d | `ReplaceText` with the same text was an edit | No event, no undo entry; the caret still goes to 0 | `text_input.rs` | unit `a_replacement_that_changes_nothing_is_not_an_edit` |
| 8e | A phantom second line in a single-line input | The characters the text server ends a line at are line breaks, which a single-line input drops and a multi-line one turns into LF | `text_input.rs` (`is_line_break`, `normalise_line_breaks`), `text_input_godot.rs` | unit tests; the cheap check below |

The two things that stay as they are (a controlled value that changes the length of an edit sends the caret to the end;
`setTextAndSelection` clears the undo history) are in the README's `TextInput` notes.

**The cheap check for 8e.** Before sanitising, a headless Godot script shaped a `TextParagraph` with no break flags (a
single-line input's) over `"ab"` plus U+2028, U+0085, U+000B and `"\n"`: each has one line and its last glyph carries
`GRAPHEME_IS_BREAK_HARD`; plain `"ab"` does not. `TextLayout` adds its empty last line wherever that flag is set, so a
single-line input holding such a character did get a second line for its caret (invisible below the box, and the
horizontal scroll went back to 0). The defect was real.

## Decisions

- **F1. An empty paste is decided before `beforeinput`.** An app is not told of a paste that does nothing. The buffer also
  refuses it (`PasteText` with nothing to insert), so no caller can delete a selection by pasting.
- **F2. `ReplaceText` that changes nothing still puts the caret at 0.** `LineEdit::_set_text` does, and the engine's Right
  presses after `_set_text` count from 0, so leaving the caret where it was would put it in the wrong place.
- **F3. Line separators.** `is_line_break` is the text server's own list (`is_linebreak`, `char_utils.h`): LF, VT, FF, CR,
  NEL, LS, PS. One function (`normalise_line_breaks`) serves typed, pasted and given text, so a controlled value cannot
  carry one in by another route.
- **F4. The preedit is committed from the next frame, not inside the blur.** Blur is reached from commits (an input made
  disabled), presses, Tab and the root losing key focus, and `beforeinput` waits for JS, which plan 3.3 allows only from
  input-origin entry points (`process` is one already: the drag machine delivers from it). The composition ends inside the
  blur, so the input is settled, and `tick_text_input` inserts the preedit a frame later. The cost is one frame between the
  `blur` event and the `input`. A click inside the composing input still cancels the composition without committing it
  (see "Not verified").
- **F4a. What the Web does with a composition when the field is left (found writing its scenario).** Three engine facts,
  from `display_server_web.cpp` and `library_godot_input.js`, and a Chrome run each:
  (1) `_key_callback` drops every raw key while `ime_started`, so Tab (or any key) cannot leave a field mid-composition;
  (2) a *press* elsewhere ends the composition in the browser first (Chrome commits on the mouse down, before the page's
  handler runs) and the engine types the committed text itself as key events, so nothing is left for the root to commit
  (the first run of the scenario passed for that reason, with "yesnope" in the field, and proved nothing);
  (3) what the root's commit is for is the focus moving without a press: `focus()` from JS, a commit that disables the
  input. There `window_set_ime_active(false)` blurs the IME element synchronously, the browser's `compositionend` arrives
  while the IME is off and is ignored, and the preedit used to be lost. The scenario makes that happen from a
  `compositionupdate` handler (the lab's picky field moves the focus when a composition ends in "!"), and checks the
  preedit is committed once, in the field that lost the focus and not also in the one that took it.
  **Engine limit, older than this branch and not touched:** a composition ended that way never resets `ime_started` (case 2
  of `_ime_callback` only does while the IME is on), so every raw key stays dropped until one more composition is committed.
  The scenario ends with one so the rest of its run has keys; a user who clicks away mid-composition is not affected (the
  commit arrives with the IME on), one whose focus is moved by the page is. A fix belongs in the engine (reset `ime_started`
  when the IME is turned off).
- **F5. Assistive selection through element meta, as `TextEdit`.** Each row's element carries `Vector2i(hard line start,
  hard line)`; a request's offset is the line's start plus its `*_char`. A request without elements counts in the text
  (`LineEdit`'s shape). An element that is not one of the input's rows is an `ERROR` line and changes nothing.
- **F6. A verifier can ask for the row elements.** `get_text_line_elements(tag)` is a new `#[func]` (typings regenerated),
  because a `Rid` cannot be made from a number, and the request the adapter makes names real elements.
- **F7. `selectTextOnFocus`: "a pointer is down on it", not "the pointer was used last".** The old test was
  `modality == Pointer`, true after any click anywhere. `Press` records the target of every pointer that is down.
- **F8. Read-only inputs no longer open the platform IME.** `LineEdit::_edit` does nothing for one that is not editable. The
  IME would otherwise swallow keys into a preedit that is ignored.

## What the soft keyboard needed

The engine's Web keyboard is a hidden DOM element (`GodotDisplayVK`, `library_godot_display.js`). `show()` sets its value;
every `input` event on it calls `input_cb(elem.value, elem.selectionEnd)`, i.e. the whole text, and the engine makes
that a `_set_text` on the focused Control followed by one Right key per character before the element's caret
(`DisplayServerWeb::_vk_input_text_callback`). Nothing ever writes native's text back to the element, so any native change
the keyboard did not make is undone by the next key.

Options, from the source:

1. **`virtual_keyboard_show` again.** It sets the value, but `show()` first calls `hide()` when the element is displayed
   (`elem.blur()`, `display = 'none'`, `value = ''`) and then `focus()`es it. A touch browser raises its keyboard only for a
   `focus()` in a user gesture, and an `input` event is not one, so the keyboard could go away and not come back. Rejected.
2. **Write the element.** The root reaches the page through `JavaScriptBridge` already (the Web clipboard). A DOM element's
   `value` can be set from there: `JavaScriptObjectImpl::_set` assigns the property, and setting `value` raises no `input`
   event, so nothing comes back. The element is the page's `document.activeElement` while the keyboard is up (`show()`
   focuses it), recognised by the styles the engine gives it (`z-index: -1`, `display: block`); anything else that has the
   focus is left alone. **Chosen.** No engine change.

The element is written after a `setTextAndSelection` that applied (value and selection) and after a `_set_text` (value only,
and only if it differs: `maxLength` cut the text, JS answered with another). The caret is not written after a `_set_text`,
because the engine's Right presses that follow it move the native caret from 0 by the keyboard's old caret, whatever the
element's caret is.

**The race between two keys (asked by the coordinator; reachable, fixed).** `_set_text` leaves the caret at 0 and the
engine presses Right once per character *a frame later* (its presses go through the input buffer). A second key that
arrives before that frame (a hitch, a slow tablet, a quick typist) runs `_set_text` again with the caret still 0. If that
key is refused, `TextInput` restores the selection it had before the edit, which is the mirror's selection, which is the
0 of the first key's `input` event (`React` is flushed synchronously after each event, `renderer.ts`, so the restore is
made inside the second `_set_text`). Native's own caret then recovers (the presses of both keys, `c1 + c2`, run and clamp at
the end of the text), but the first version of the element write put that 0 into the element, whose caret stood at the start
of the text, and the key after it landed there: `12` and a refused `a` in one frame, then `3`, made `312`. Now the element's
selection is not written while a soft keyboard's Right presses are pending
(`TextInputRoot::keyboard_presses_pending`, set by `_set_text`, cleared by the next frame's tick): setting the value leaves
the element's caret at its end, which is where the keys of a text typed in a hurry are. The Web scenario makes the race
deterministic by dispatching the two `input` events of the element in one task, so no frame can come between them.

Limits, recorded: the keyboard on iOS and Android natively sends keys, not whole texts, so it has no such desync and is not
touched. Two things stay wrong in the engine's design and are not fixed here: the Right presses of two keys in one frame
add up (`c1 + c2`), so a text typed in a hurry into the *middle* of a field leaves the native caret too far right (clamped
at the end); and an edit JS puts back inside a text leaves the native caret after the point it was put back at until the next
key. The text is right in both; the caret is not, and it is the engine's presses, which only an engine change (`_set_text`
with the caret) could fix.

## Not verified

- **macOS IME** (Japanese, Pinyin): native IME cannot be injected. Tested on the buffer, and on the Web in Chrome with
  `Input.imeSetComposition`. Whether macOS also commits marked text itself when the window loses key focus, and so whether
  the engine would send the same text a second time as key events, is unknown; the root cancels the platform's marked text
  (`window_set_ime_active(false)`) after taking the preedit, so a double insertion is not expected.
- **A click inside the composing input** cancels the composition without committing it (the OS composition continues and
  the next IME update restarts it at the caret). `LineEdit` applies the preedit there too. Not changed; the request was blur.
- **The real adapter's actions**: the a11y verifier makes the request the adapter makes (`start_element`, `start_char`, ...)
  through the bound callable, as before; the dump tool still performs none.

## Gates

(see the end of this file, filled in after the runs)
