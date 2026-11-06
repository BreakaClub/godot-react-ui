# Text input (Phase I7): notes and report

Branch `text-input`, rebased onto `main` at `710adc3` (Phase I6, text selection) and again onto `6c6abd7` (Phase I9, the stock
engine profile and the freshness guard; sections "Rebase onto 6c6abd7" and "The real accessibility tree" below). Phase I7 of
`docs/INTERACTION_PLAN.md`: the `TextInput` element (single-line and multi-line), IME and the virtual keyboard,
clipboard and undo, the controlled-value protocol, the kit `TextField`, accessibility, and typing in world space.
`docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md` were not touched: the decisions below (numbered T1 and up
so as not to collide with the plan's) are for the coordinator to fold into the plan's decision log.

This file is written as the phases land; a section that says "owed" has not been done.

## What changed

| Where | What |
| --- | --- |
| `native/text_input.rs` | The Godot-free `EditBuffer`: commands, undo with coalescing, `maxLength` in UTF-16 units, read-only, secure, composition, the event-count rule |
| `native/text_input_godot.rs` and `text_input_godot/` | The glue. `shaping.rs` (metrics, the size a field measures at, paragraphs, layouts), `keys.rs` (InputMap actions to commands), `pipeline.rs` (`keydown` to `beforeinput`, apply, `input`, `selectionchange`; JS's commands), `pointer.rs`, `paint.rs` (selection, text, preedit, caret, scrolling), `platform.rs` (IME window, virtual keyboard, window focus), `web_clipboard.rs` (a paste on the Web) |
| `native/props.rs`, `commit.rs`, `computed_style.rs`, `layout.rs`, `motion.rs`, `mount.rs`, `render_tree.rs`, `scroll_input.rs`, `focus.rs`, `keyboard_input.rs`, `pointer_input.rs`, `snapshot.rs`, `events.rs`, `lib.rs` | Kind `textinput`, its props and `caretColor`/`placeholderColor`, measurement in both paths and the motion probe, the edit items, wheel scrolling of a text area, the events, the `#[func]`s |
| `src/text-input.tsx`, `components.tsx`, `events.ts`, `native.ts`, `renderer.ts`, `props.ts`, `styles.ts` | The `TextInput` component and handle, the events, the host methods |
| `demo/src/forms-lab.tsx`, `verify-text-input.ts` | The form lab with a live JSON readout, and the `forms` section |
| `scripts/verify-interaction-web.mjs`, `scripts/build.mjs`, `demo/export_presets.cfg`, `demo/src/main.ts` | The Web `forms` scenarios (typing, IME, paste, touch keyboard), `html/experimental_virtual_keyboard`, platform facts |

## Decisions

- **T1. One `selectionchange` wire name, two shapes.** Phase I6 made the document's `selectionchange` (target 0, no
  fields); a text input's is addressed to the input and carries its offsets. `NativeSelectionChangeEvent` is a union of
  `NativeDocumentSelectionChangeEvent` and `NativeInputSelectionChangeEvent`, told apart by the target when the event is
  parsed (`LAYER_ROOT_TAG` is 0), so the wire shape and the TypeScript shape agree and the test host can emit either.
  `UITextSelectionChangeEvent` is the document's event with `selectionStart` and `selectionEnd`; `onSelectionChange` on a
  `TextInput` receives it, and root listeners keep `UISelectionChangeEvent`.
- **T2. A single-line field is laid out unwrapped.** `TextParagraph::draw` clips each line to the paragraph's width, so a
  line longer than the box lost its text when scrolled; a single-line input is laid out with width -1 and scrolled
  instead.
- **T3. Key actions match across devices.** `InputMap` matches an event to an action only if both have the same device,
  and key-bound actions belong to the keyboard (16). A key forwarded into a `SubViewport`, or injected by a verifier
  (`1 << 30`), would match nothing, so `TextActionTable::action_of` matches a copy of the event with the keyboard's
  device. This is product code, not a verifier convenience, so the forms section does not need `bindVerifierKeys`.
- **T4. The caret is drawn only while the window is active, and any key or press says it is.** A window the OS takes focus
  from while a run is under way hears of its loss and never of its return when it cannot become the key window (the
  verifier's window cannot). A key or a press that reaches the root proves the window is the one receiving input.
- **T5. A press on a text input is not a document selection.** The press clears the document's selection and starts none
  (a text input is not selectable text), and `key_down_default` offers a key to `run_selection_key` only when no text
  input has the focus.
- **T6. The engine's focus notifications reach the root in the middle of its IME and keyboard calls (Web).** Evidence:
  with a text input focused and the IME element holding browser focus, unmounting the root panicked at `bind_mut`
  ("already bound; T = ReactUiRoot"). A trace placed the panic inside `DisplayServer::window_set_ime_active(false)`, called
  from `commit`. Platform-causal argument: the Web game runs on the browser's main thread (Emscripten prints "Blocking on
  the main thread is very dangerous"; `Thread::is_main_thread()` is true for DOM callbacks), `GodotIME.ime_active(false)`
  calls `canvas.focus()`, and the canvas's capturing `focus` listener calls `DisplayServerWeb::send_window_event_callback`,
  which, on the main thread, notifies every node with `NOTIFICATION_WM_WINDOW_FOCUS_IN` before returning
  (`library_godot_display.js` `godot_js_display_notification_cb`, `display_server_web.cpp` `_send_window_event_callback`).
  Native macOS does not notify from inside `window_set_ime_active`. The fix is `ReactUiRoot::call_engine`, which holds the
  base guard (`self.base_mut()`, the guard `self.base_mut().grab_focus()` takes) for the duration of the engine call,
  which makes the outer borrow inaccessible and the nested notification legal. It wraps every IME and virtual keyboard
  call. It reproduced only when the IME element held DOM focus (the engine re-focuses it every 100 ms), which is why a
  focus followed at once by an unmount did not show it.
- **T7. The engine's IME start drops the last raw key.** `DisplayServerWeb::_ime_callback` case 0 deletes the last
  queued raw key-down, because on a real keyboard that key is the one that began the composition. A scenario that presses
  Home and starts a composition at once loses the Home (observed in the portrait run: the preedit opened at the end of
  the text). The Web scenario waits for the caret to reach 0 before composing. Nothing to fix: a person's keystroke and
  the composition it starts are one event to the engine.
- **T8. Desktop Chrome keeps the IME path.** `html/experimental_virtual_keyboard=true` is set in
  `demo/export_presets.cfg`. Recorded by the scenarios (`platformFacts`): a desktop page reports `ime: true,
  virtualKeyboard: false`; a page with touch reports `ime: false, virtualKeyboard: true`. The engine reports the virtual
  keyboard only when the setting is on and the browser has touch (`display_server_web.cpp` `has_feature`,
  `library_godot_display.js:39-41`).
- **T9. The machine's clipboard is restored.** The native `forms` section reads the clipboard before it starts and puts it
  back in a `finally`, whatever the run does; the clipboard is shared with whoever is using the machine.
- **T10. The forms lab scrolls.** Its root is `overflow-y-auto`, and a comments area follows the readout, so the lab is
  taller than the window and a wheel over the notes area can chain from the text to the page.
- **T11. The Web build needs a module for every demo `.ts`.** `verify-text-input.ts` is an entry point in
  `scripts/build.mjs`, like `verifier-input.ts`.

## Multi-line (Phase I7D)

The multi-line machinery (wrapping paragraphs, `rows` in the measured height, vertical movement with the desired
column, page and document movement, the vertical scroll item, the wheel as a scroll container) was built with the
single-line core, because both go through the same buffer, layout and paint path; I7D is its verification, with no native
change. Native `forms` section (`verifyMultiline`, both viewports): Enter is a line break and submits nothing, five lines
in a three-row box scroll to the caret, a paragraph wraps onto at least three lines, End stands at the end of the wrapped
line, Up twice from a long line through a short one returns to the column it began in (the check that fails if the desired
column is forgotten: it would land at offset 2, not 9), Shift+Up selects to the line above, Home, End and the document
edges, Page up and down, a press right of a short line puts the caret at its end, a drag across lines selects across them,
and the wheel scrolls the text first and the page after it. Captures: `forms-12-text-area-scrolled`,
`forms-13-page-scrolled`. Web: the same keys in real Chrome with a real wheel (`forms-05-text-area`), and on the touch
page a tap on the text area makes the engine's hidden element a `textarea` (`keyboardType` defaults to `multiline`) whose
Enter is a line break.

- **T12. Chaining spills the remainder, as the scroll core does.** The tick that reaches the end of the text scrolls
  the rest of its distance on the page (`scroll_chain`, a deliberate difference from browsers, plan 3.12). The section
  checks that the page stays put while the text can still scroll and moves once the text is at its end, not that the page
  waits for the next tick.
- **T13. A column is a pixel position.** Vertical movement keeps the x the caret began at, so one line's character
  count does not carry to the next ("fifth" is narrower than "fourth"). The Web scenario asserts a range; the native one
  uses `c` x 14 under `aaaa aaaa` and `bb`, where no glyph width can change the answer.
- **T14. A triple click selects all of the text**, in a text area too (`LineEdit`'s rule). `HTMLTextAreaElement`
  selects a line; not built, no consumer.

## Kit `TextField`

`src/kit/text-field.tsx`, exported with `TextFieldProps`: a column of a label `Text`, a `TextInput` and a helper or error
`Text`. Every `TextInput` prop passes through (controlled, uncontrolled, `multiline`, ...), the ref is the input's
handle, `className`/`style` style the root and `label*`, `input*` and `message*` props style the parts, and the parts
have test ids `${testID}-label`, `-input` and `-message`. An error takes the helper's place, in rose, and the input's
border turns rose (the palette has no red). A press on the label focuses the input unless it is disabled. Tests:
`tests/text-field.test.ts` (8; six mutants of the component each fail one of them). It is in the Inputs lab (a
Nickname field with a three-character minimum) and the Inputs section checks the label's press, the helper giving way
to the error and back, and the value in the readout (captures `29-inputs-text-field-error`); with the label's press
removed the section fails at "A press on the label focuses the input".

- **T15. No `aria-labelledby` or `aria-describedby`.** The plan and the kit notes asked for them "if native accepts";
  native's props have `ariaLabel` and `ariaDescription` only, and an unknown prop fails the commit. They are not typed.
  The kit does what they would do with the text it has: the label becomes the input's `aria-label`, the error (else the
  helper) its `aria-description`, and either can be overridden. Relationship props would be a change to the
  accessibility model (the next section), not to the kit.
- **T16. The Inputs section's tab stops include text inputs.** `tabStops` counted buttons and `tabIndex` 0; native makes a
  `TextInput` a tab stop (`focus.rs`), so the helper does too.

## Accessibility

`native/accessibility_model.rs` (Godot-free, mutants killed by its tests) and `native/text_input_godot/accessibility.rs`
(the Godot side). A `TextInput` is a `TEXT_FIELD` or, with `multiline`, a `MULTILINE_TEXT_FIELD`; it has a name, a
description, a placeholder while one shows, `FLAG_READONLY`, its text and its selection, and the actions focus, set text
selection, replace selected text and set value, mirroring `LineEdit` (`line_edit.cpp:1245-1332`) and `TextEdit`
(`text_edit.cpp:760-840`). The a11y lab has a name field, a text area and a read-only field, `scripts/a11y-expectations.mjs`
expects `AXTextField` and `AXTextArea` with their `AXValue`, and the Godot-side half of `pnpm verify:a11y` selects, replaces and
sets the text through the actions' callable and checks the result; with the replace action made a whole-text replacement it
fails at "A replace-selected-text action replaces the selection". On Breaka's own engine the platform tree is not read (no
accessibility driver, `GODOT_REACT_A11Y_UNSUPPORTED`, exit 2); on the stock engine it is, and that is the next section.

- **T17. A `TextInput` is always a text field.** Its `role` can only remove it from the tree. A `View` with
  `role="textbox"` stays unexposed: it has no text, selection or edit to offer.
- **T18. The text is line elements, not a value.** As `LineEdit` and `TextEdit` do: one element per row of the text, each
  hard line shaped on its own (the first reading of the real tree changed this from rows of one paragraph, see "The real
  accessibility tree"), with the selection set against them. A line owns its start offset and not its end, so a caret at the
  start of the next line is on that line; the last line owns the end of the text (`line_for_offset`, tested). A line's
  elements are made inside the update and `free_element` is refused there, so they are freed where the display is shaped
  again (`reshape_display`, `refresh_text_input`) and where the box changes shape (`update_node_geometry`), never inside one,
  and the field is set again in the next update because its text, selection and scroll are part of what it is compared by.
- **T19. A field with no name is named by its placeholder**, as `LineEdit::_get_accessibility_name` does.
- **T20. Assistive edits are edits.** They go through `beforeinput`, so JS can refuse one and hears the `input`. A
  set-value puts the caret after the text, which `ReplaceText` (the virtual keyboard's, caret at 0) does not.
- **T21. The a11y lab is 900x900**, taller than before, for four more fields.

## World-space typing

`demo/src/world-panel.tsx` has a name field and an echo line; `verify-world.ts` and `verify-world-web.mjs` type into it
through the projected quad (`docs/WORLD_SPACE.md`, "Typing"). The owner needed no change. This finishes Phase I11's open
item. The IME window position is not placed from the projected caret: `update_ime_position` uses the root's global position
in its own viewport and that viewport's screen transform, which is the main window's for a root in the main window and
only approximately right for one in a `SubViewport` on a quad. Recorded, not fixed: it needs the projection, which only the
owner has.

## The real accessibility tree

`pnpm verify:a11y --engine=stock` reads the lab's tree from the macOS Accessibility API through the stock engine's AccessKit
adapter (Godot 4.7.2, `docs/tracks/stock-engine.md`). The dump tool (`scripts/ax-dump.swift`, read only) now also reads, for a
text field or area, `AXSelectedText`, `AXSelectedTextRange`, `AXNumberOfCharacters`, `AXVisibleCharacterRange`,
`AXInsertionPointLineNumber`, the text by range (`AXStringForRange`, a parameterized read), the attribute names and the names
of the attributes that could be set (`AXUIElementIsAttributeSettable`, which sets nothing). `scripts/a11y-expectations.mjs` judges
the lab's four text inputs (a name field edited by the Godot-side half and left with "Lovelace" selected, a two-line text area,
a read-only field selected whole, and an empty field with only a placeholder).

**A control.** Because a gap has to be told from a defect, a scene of stock controls (`tests/fixtures/ax-lab/stock-controls.tscn`: a
`LineEdit`, a read-only one, an empty one with a placeholder, and a `TextEdit`) was run through the same engine and adapter, and its
tree recorded (`macos-stock-controls.json`). `tests/a11y-expectations.test.ts` compares the recorded reading of the lab's inputs with it
attribute by attribute: role, role description, subrole, enabled, every attribute name, every settable attribute name, and whether an
`AXValue` exists.

**Defect found and fixed (T22).** The first reading (a diagnostic window of the lab, before any verifier run) differed from the control
in one thing: the text area "first\nsecond" read **13** characters, with the caret at the end at offset 13, where the stock `TextEdit` reads
12. The server (`create_sub_text_edit_elements`) adds a line break to every row but the last, and the rows of one paragraph carry their
own `\n`, so each line break was read twice. `TextEdit` shapes each hard line separately; so does the library now (`text_line_placement`:
each hard line shaped on its own, its rows paired with the rows the input draws, a selection end being a column in a hard line on the
row that holds it). The unit tests of `hard_line_starts` and `hard_line_of` pin the mapping, and the expectation fails on the old reading
("a11y-notes: AXNumberOfCharacters is 13, expected 12", checked by running the expectations over that first reading).

**What the real tree shows now** (the run's `ax-before.json` and `ax-after.json`, recorded as `tests/fixtures/ax-lab/macos-*.json`):

| Text input | Role | Text | Selection | Other |
| --- | --- | --- | --- | --- |
| Name | `AXTextField` "text field", title `Name` | `AXValue` "Ada", then "Ada Lovelace" after the Godot-side set-value | caret `{3,0}`, then `{4,8}` and `AXSelectedText` "Lovelace" | 160 x 20.5 points at 0.5 points per pixel; no placeholder while it has text |
| Notes | `AXTextArea` "text entry area", title `Notes` | no `AXValue`; `AXStringForRange` "first\nsecond", 12 characters | caret `{12,0}`, `AXInsertionPointLineNumber` 1 | |
| Reference (read-only) | `AXTextField` | "Fixed" | `{5,0}`, then `{0,5}` | `AXValue` still settable |
| Search (empty, no label) | `AXTextField`, title `Search` (the placeholder names it) | "" | `{0,0}` | `AXPlaceholderValue` "Search" |

Frames fit the snapshot geometry with the rest of the lab (one scale and offset, residual within 2 points). The text-run elements the
server makes are not elements in the macOS tree (children: none, for the control as well).

**`GODOT_REACT_A11Y_GAP`s** (what the engine or adapter cannot convey; each shown by the control, so none is this library's):
- A text area has no `AXValue` in the platform tree (the stock `TextEdit` has none); its text is read by range, which the run checks.
- A read-only field is not marked read-only: `AXValue` stays settable, as for a stock `LineEdit` with `editable` off, and the adapter has no
  attribute for it. `FLAG_READONLY` is set; nothing on macOS carries it. (Whether a screen reader still reads it, VoiceOver was not run.)

**Not a gap, a difference.** The stock controls advertise `AXScrollToVisible` even outside a scroll container; the library offers
scroll-into-view only inside one (decision of the scroll phase, `docs/tracks/accessibility.md`), so its text inputs advertise none.
That is not a defect: nothing could scroll.

**Still not verified:** platform focus (the window is not the key window in a run, `docs/tracks/stock-engine.md` S9), the actions on a text
field through the real adapter (the dump tool performs none; the actions are checked through the action callable, as before), and VoiceOver
by hand.

## Rebase onto 6c6abd7 and fit-up to Phase I9

`git rebase main` (rerere on) replayed the 18 commits of this branch; main is Phase I9 (drag and drop), the stock engine profile and the
freshness guard. Conflicts and how they were decided (both sides' intent kept):
- **Events (`native/events.rs`, `src/events.ts`, `src/native.ts`, `src/renderer.ts`, `tests/recording-host.ts`):** both families of events
  (the text input's `beforeinput`, `input`, `selectionchange`, `compositionstart|update|end` and I9's `drag*`) are in every union, table and
  switch; the two `selectionchange` shapes of T1 are kept. `isContinuous` lists the text events as not continuous.
- **Pointer, frames and Escape (`native/pointer_input.rs`, `native/lib.rs`, `native/motion.rs`):** the drag machine owns the pointer first (as
  main has it) and the text selection drag second; both tick from `process()`; `update_process` asks for frames for either.
- **`ContentKey` and oversampling:** main's `6c6abd7` and this branch's `5aef575` are the same idea (the viewport's oversampling reaches
  `TextParagraph::draw_ex`; it is in the cache key so a scale change repaints). Main's version stood for `Text`, including
  `native/drag_ghost.rs`; the text input's part of `5aef575` (its `EditTextKey`, `draw_text`, and repainting inputs on a scale change)
  stayed on top of it. `5aef575` and `ea0527e` are kept as commits.
- **Verifiers (`demo/src/verify-interaction.ts`, `scripts/verify-interaction-web.mjs`, labs):** the `drag` and `forms` sections side by
  side, both in `SECTIONS`; the Web touch workflow runs the drag and the forms scenarios.
- **a11y (`scripts/a11y-expectations.mjs`, `tests/a11y-expectations.test.ts`, `scripts/verify-a11y.mjs`):** main's scroll expectations and
  the text input ones together; main's longer deadline kept.

Fit-up, each decided here and tested:
- **T23. A text input keeps its press, whatever draggable element it sits in.** `begin_drag_gesture` declines a press whose hit is a text
  input, so under a `draggable` ancestor the press places the caret, a move selects text, and no `dragstart` follows, as for an HTML
  `<input>`. Test: the drag section's draggable form (`input-chip`): a press in its field and a move past the drag threshold selects text
  and makes no drag, and a press beside the field drags the form. With the decline removed it fails at "A press in a text input under a
  draggable element starts no drag".
- **T24. The ghost shows a dragged text input's text, not its caret.** The ghost copies boxes and paragraphs the source's items last
  recorded; a text input draws from its own text item, so `text_input_ghost_texts` hands the ghost each input's paragraph (or placeholder)
  ready, with no selection, preedit or caret, and `GhostText::record` draws it with the same oversampling key as the live item (so it is
  sharp at DPR 2, as `Text` in the ghost is since `6c6abd7`). Test: the ghost's field region has dark text pixels and no pixel of the
  field's indigo caret, with the source's caret verified on first. Fails without the copy at "The ghost of a form shows its field's text".
- **T25. Arbitration stays thumb, then drag, then selection, and the text input's own press is last.** Found while testing it: a press that
  grabbed a text area's scrollbar thumb also placed the caret (the arbitration flag only gated the selection drag). The input's own press
  now runs only when no thumb was grabbed. Test (forms section): dragging a text area's thumb scrolls its text and leaves the caret;
  fails at "and leaves the caret where it was" without the fix.
- **T26. Scripts.** This branch adds no script that calls `selectEngine(`; `GUARDS` in `tests/freshness.test.ts` is unchanged and its test
  passes. (`scripts/build.mjs` gained an entry point for `verify-text-input.ts`; the Web scripts it touched were already guarded.)
- **T27. Typings.** `pnpm gen:types` after the rebase changed nothing tracked except the two `jsb.*.bundle.d.ts` files' line endings
  (restored); `demo/typings/godot7.gen.d.ts` and `demo/gen/**` are as committed. No `#[func]` was added by the rebase or the fit-up.

## Web paste: investigation and decision (Phase I7C)

**Reproduced.** Chrome (headless, clipboard permissions granted), the engine's own `clipboard_get` path, 1120x800:

| Step | System clipboard | A paste inserted |
| --- | --- | --- |
| first paste after setting `alpha` | `alpha` | nothing (the cache was empty) |
| second paste | `alpha` | `alpha` |
| after setting `beta` | `beta` | `alpha` (stale) |
| 1 s later, same clipboard | `beta` | `beta` |
| after setting `gamma`, waiting 1 s | `gamma` | `beta` (stale; waiting does not help) |

**Order of events** for one paste (page's own listeners, `performance.now()` in ms; Godot's event time stamps use the same
clock on the Web): `keydown` at 0, `keydown` seen again at 0 with `defaultPrevented: true`, `readText` called +3, the
Godot paste (the text appears in the field) +12, `readText` resolved +13. No `paste` event reached the page at all.

**Cause (engine, not this repository).** `DisplayServerWeb::clipboard_get()` starts an asynchronous
`navigator.clipboard.readText()` and returns the text the previous call read; the answer refreshes the cache only when
the promise resolves, after the Godot key has been handled. The `paste` event that would refresh it
(`godot_js_input_paste_cb`) never fires, because the engine's key listeners (`GodotInput.onKeyEvent`, the IME element's
`key_event_cb`) call `preventDefault()` on every `keydown`, which cancels the browser's paste. The cache is therefore
always exactly one read behind, whatever time has passed.

**Fix (this repository).** The engine's design cannot be repaired from outside, but `JavaScriptBridge` is in Breaka's Web
template (`Engine.has_singleton("JavaScriptBridge")` is true on the page, recorded in `platformFacts`), and a paste is an
event that completes later anyway. On the Web `ui_paste` calls `navigator.clipboard.readText()` through
`JavaScriptBridge.get_interface("navigator")` and gives the promise two callbacks made with `create_callback`; the root
pastes into the input that asked, if it still has the focus, when the browser answers (`text_input_godot/web_clipboard.rs`).
A refused read is logged as an `ERROR` and pastes nothing. Every other platform answers at once and is unchanged.
Semantics checked in the engine's source: `get_interface` is `window[name]`; `Object.get` and `call` on a
`JavaScriptObject` read a property and call a method (`JavaScriptObjectImpl::_get`, `callp`); a callback is called with one
`Array` of the promise's arguments and runs when the promise settles, never inside another call of ours.
Two choices: the callbacks are made once and kept for the root's life (a wrapper freed while its callback runs frees what
the bridge is still using), and a read whose input lost focus before the answer is dropped.

The engine was not changed. A fix there (making the paste a browser `paste` event, or an asynchronous clipboard API) is a
design change for every Breaka export and not needed for this repository; the record here is the evidence for whoever
takes it up.

**Verified (Web).** The `forms` scenario (`runPasteScenario`): copy and cut write the browser's clipboard; the first
paste after a change inserts the new text and so does every later one; the page sees no `paste` event and the `keydown`
was prevented; one paste makes one read; a paste is an `insertFromPaste` input and undo takes it back; a read-only field
never reads the clipboard; a refused read pastes nothing and says so; pasting works again afterwards. **Negative
control:** with the engine's `clipboard_get` on every platform, the scenario fails at "The first paste after the
clipboard changed inserts the new text".

## Negative controls

Each was a single run with the fix removed; the assertion that failed is quoted. Native `forms` section unless noted.

| Change made | Fails at |
| --- | --- |
| The vertical movement forgets its desired column (`desired_x` cleared on every command) | "And up again returns to the column it began in, which the short line could not hold" |
| A single-line input keeps line breaks in text it is given | "A paste replaces the selection and drops the line breaks" |
| A text area is not a scroll container (wheel and scroll state) | "form-notes has a scroll state" |
| Web: the root pastes through the engine's `clipboard_get` | "The first paste after the clipboard changed inserts the new text" |
| Web: the IME and keyboard calls do not hold the base guard | the `bind_mut` panic, at Tab out of a field with the IME element focused ("Browser/runtime errors") |
| Kit `TextField`: the label's press does nothing (Inputs section) | "A press on the label focuses the input: none" |
| Kit `TextField`: six mutants, each by `tests/text-field.test.ts` | the test of that behaviour |
| Accessibility model: six mutants (a text input not exposed, multiline as one line, read-only editable, no placeholder name, a line owning its end, text not part of the props), each by `accessibility_model` tests | the test of that behaviour |
| Accessibility: replace-selected-text replaces the whole text (Godot-side half of `verify:a11y`) | "A replace-selected-text action replaces the selection" |

From the single-line core (I7A), also native `forms` runs with the fix removed:

| Change made | Fails at |
| --- | --- |
| Keys are matched to `InputMap` actions without normalising the device | "Home puts the caret at the start and scrolls back" (the verifier's device matches no action) |
| A drag does not extend the selection | "Dragging across the first words selects them" |
| A press that focuses a `selectTextOnFocus` field collapses the selection | "A press that focuses a selectTextOnFocus field selects all of it" |
| An empty line's caret keeps the ligature marker | "An empty field's caret has no marker" |
| An unfocused input paints its selection | "An unfocused field does not paint its selection" |
| A single-line input is laid out at its box's width (the paragraph clips it) | "The text before the caret is drawn after it scrolled" |

In JS (`tests/text-input.test.ts`): a command ignored as stale remembered as applied, and a change of `defaultValue` sent to
native, each fail a test. Not mutation-tested: the Web multi-line scenario and the touch text area (they exercise existing
behaviour in a real browser), the world-space typing steps, and the clipboard verifier's copy, cut and undo-of-paste lines.

## Gates

Run once each on the final tree, which has `5aef575` (HiDPI font oversampling, another session's commit on this branch) and
the two small commits after it in the build. Native runs used `/Applications/Godot48.app`, `--audio-driver Dummy`, an isolated
window; no run was disturbed, and none was re-run.

| Command | Result |
| --- | --- |
| `cargo test --locked` | 534 passed |
| `cargo clippy --locked --all-targets` | 0 warnings (one in `5aef575`, an `as f32` on a value that is already `f32`, removed in `ea0527e`) |
| `rustup run stable cargo fmt --check` | clean (`ea0527e` also reflows a `ContentKey` in `render_tree.rs` that `5aef575` left unformatted) |
| `pnpm test:types` | clean |
| `pnpm test` | 325 passed |
| `pnpm verify:interaction` | passed, both viewports, all nine sections (`forms` 38.8 s) |
| `pnpm verify` | passed, both viewports |
| `pnpm verify:world` | passed, both viewports, with the typing steps |
| `pnpm verify:motion` | passed, both viewports |
| `pnpm verify:a11y` | the Godot-side half passed (`GODOT_REACT_A11Y_NATIVE_PASSED`, text actions included); the platform tree is not verified (`GODOT_REACT_A11Y_UNSUPPORTED`, exit 2): the engine has no accessibility driver |
| `pnpm build:web` | succeeds (Breaka's threaded template, nightly `build-std`) |
| `pnpm verify:interaction:web` | passed: 965 assertions, 108 captures, every section at all four viewports and the touch page |
| `node scripts/verify-world-web.mjs` | passed: 94 assertions. First run failed in the second viewport: the page runs on across viewports and the field kept `Hi there`, so the step now empties it; the next launch timed out starting Chrome before any step ran; the third run passed |

Captures inspected (all under `artifacts/`, not committed): `native-interaction/{landscape,portrait}/forms-01` to `forms-13`
(placeholder and caret, scrolled text, Shift selection, drag selection, emoji, bullets, paste, the text area scrolled, the page
scrolled by the wheel), `native-interaction/landscape/29-inputs-text-field-error.png`, `native-world/landscape/06a-typing.png`,
`web-interaction-verification/landscape/forms-02-ime-preedit-landscape.png`, `forms-04-paste.png`, `forms-05-text-area.png`,
`web-interaction-verification/touch/forms-03-touch-keyboard.png`, `web-world-verification/landscape/06-typing.png`.

Native IME was not injected (it cannot be): the Web IME was driven with `Input.imeSetComposition` and `Input.insertText`,
and the native path (`NOTIFICATION_OS_IME_UPDATE`) is the same code that ran there. **A manual check with a macOS Japanese or
Pinyin input source was not done.**

## Merge notes

- `main` moved (I9, the stock engine profile, a freshness guard) after this branch was rebased onto `710adc3`. Expect
  conflicts in `native/lib.rs`, `native/events.rs`, `native/props.rs`, `native/pointer_input.rs`, `native/keyboard_input.rs`,
  `native/render_tree.rs`, `native/PROTOCOL.md`, `src/events.ts`, `src/native.ts`, `src/index.ts`, `demo/src/labs.tsx`,
  `demo/src/verify-interaction.ts`, `scripts/verify-interaction-web.mjs` and `tests/recording-host.ts`. A press on a text input places the
  caret and may start a selection drag in it (`text_input_pointer_down`, after the thumb and capture arbitration); I9's
  draggable-element step sits between those and selection in plan 3.12, so a `draggable` ancestor of a text input needs the
  input to keep its press, as an HTML `<input>` does. I did not touch that. `typings`: regenerate with
  `pnpm build:native` and the Godot `--generate-types` step; restore `demo/typings/jsb.*.bundle.d.ts` if only line endings changed.
- The freshness guard will refuse old stamps once; `pnpm build:native` clears it.
- `demo/src/main.ts` is whitespace-modified in this worktree (a whole-file re-indent, `git diff -w` is empty). It is not mine
  and is not committed; discard or keep it as you see fit.
- A `TextInput` is a tab stop and takes `disabled`; `tabStops()` in `verify-interaction.ts` counts it. Another phase that adds a
  focusable element to a lab the Inputs section tab-orders must list it there too.
- The installed `libgodot_react_ui.dylib` is the default (non-probe) build.

## Not done

- A manual native IME check (above).
- The platform accessibility tree for text inputs (no engine with AccessKit), and `aria-labelledby` / `aria-describedby`
  (native has no relationship props, T15).
- The IME window and the on-screen keyboard are placed from the root's own screen transform, which is wrong for a root on a quad
  in a `SubViewport` (world-space section).
- A triple click selects all of a text area's text, not a line (T14).
- The Web `clipboard_get` is still stale for every other consumer of it (an engine design, see the investigation); only the
  root's paste no longer uses it.
