# Text input (Phase I7): notes and report

Branch `text-input`, rebased once onto `main` at `710adc3` (Phase I6, text selection). Phase I7 of
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

## Owed

The kit `TextField`, accessibility, world-space typing, the gates, merge notes.
