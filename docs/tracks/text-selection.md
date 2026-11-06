# Text selection (Phase I6): notes and report

Branch `text-selection`, based on `6cf7406` (Phase I5 on the `scroll` branch). Phase I6 of `docs/INTERACTION_PLAN.md`:
`userSelect` and `selectionColor`, mouse selection gestures, copy and select all, clearing, `selectionchange`,
`get_selection`/`clear_selection` and `root.getSelection()`, highlight painting, the `select-text` lab and the verifier
section. `docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md` were not touched: the decisions below (numbered
S1 to S18 so as not to collide with the plan's) are for the coordinator to fold into the plan's decision log.

## What changed

| Where | What |
| --- | --- |
| `native/selection_input.rs` (new) | The integration: `SelectionState`, the document builder, gestures (`begin_selection_press`, `selection_drag_moved`, `end_selection_drag`), keys (`run_selection_key`), lifecycle (`selection_node_changed`, `note_selection_restyle`, `settle_selection`), queries (`selection_json`), highlight rectangles, the cursor rule and the pure `drag_target` (7 unit tests) |
| `native/props.rs`, `native/computed_style.rs` | `userSelect` (`UserSelectSpec`) and `selectionColor`, both inherited |
| `native/render_tree.rs` | `ContentKey` carries the selection (`SelectionPaint`); `record_content` draws the highlight under the paragraph from a closure that builds the layout only when the item re-records; `DEFAULT_SELECTION_COLOR` |
| `native/pointer_input.rs` | Arbitration order (thumb, then selection, then the focus default), drag motion, release and cancel, `run_pointerdown_default` takes `keeps_selection`, key focus is kept for a selection |
| `native/keyboard_input.rs` | `key_down_default` first offers the key to `run_selection_key` |
| `native/mount.rs`, `native/motion.rs` | `node_changed` calls on a text change and on delete; `settle_selection` after a commit and after a restyle publish; `cursor_at` takes the rule for an unset cursor |
| `native/events.rs` | `EventPayload::DocumentSelectionChange` (wire `selectionchange`), `EventQueue::push_selection_change` (coalesced) |
| `native/lib.rs` | `selecting` field, `get_selection()`, `clear_selection()`, `mod selection_input`; the `dead_code` allowance of `selection` is gone, `text_offsets` and `text_layout` keep theirs (S13) |
| `native/selection.rs` | `Document::node` and `Document::selectable_nodes`; `selectable_start_after` and `selectable_end_before` removed (S4) |
| `src/*` | `userSelect`/`selectionColor` types and the `select-none`, `select-text`, `selection-[#hex]` utilities; `selectionchange` event, `NativeHost.getSelection/clearSelection`, `readSelection`; `root.getSelection()`, `root.clearSelection()` and the `useTextSelection()` hook |
| `demo/src/selection-lab.tsx`, `labs.tsx`, `main.ts` | The lab (`showLab('selection')`), the demo API the verifier uses |
| `demo/src/verify-interaction.ts`, `verifier-input.ts` | The `selection` section; `bindVerifierKeys` (S11; removed by `docs/tracks/final-cleanup.md`, the root now matches keys as the keyboard's); `KeySpec.meta`, `mouseButton` takes Shift |
| `scripts/verify-interaction-web.mjs` | The `selection` scenario (the clipboard is the in-memory one of D46; no permission is granted) |
| `tests/` | `selection.test.ts` (6), style tests and fixture, `RecordingHost` selection support |
| `README.md`, `native/PROTOCOL.md` | Text selection, limits |

## Decisions

Each was made from the evidence in this session and the plan's text.

- **S1. Nothing is kept between events.** The `Document` (the `Text` nodes in document order with their length and
  whether they are selectable) and the `TextLayout` are built when a press, a drag motion, a key or a query needs them and
  dropped; a drag motion rebuilds the document (one walk of the tree and a character count per text node). A cached
  document would need an invalidation hook on every commit, restyle and layout, and the cost of rebuilding is one
  pre-order walk per mouse move while a button is down. The commit path builds nothing (invariant 6): it calls
  `node_changed(tag)` for each `Text` whose text changed and each deleted node, and a restyle that changes `userSelect` or
  `display` of a covered node does the same.
- **S2. Which presses select, and what the others do.** Arbitration (plan 3.12): a pointer JS captured, then a scrollbar
  thumb, then (Phase I9) a draggable element, then selection. The order in `press_mouse` is: `begin_thumb_drag`, then
  `begin_selection_press` (allowed only if no thumb was grabbed and the pointer is not captured), then
  `run_pointerdown_default`. A primary press that is not prevented and did not start or extend a selection **clears the
  current one** (mouse and touch alike; a touch never starts one). A prevented `pointerdown` leaves the selection alone,
  like every other default action. A press on a non-`Text` element (a padded `View`) starts nothing: there is no "nearest
  text" start, only the drag rule (S4).
- **S3. Key focus.** The root keeps Godot key focus while a selection exists, a collapsed one included (a click puts
  the caret, and Shift+click extends from it); `release_key_focus_without_element` asks `selection_holds_key_focus()`.
  `clear_selection()` from JS does not release focus (the owner may have asked for it with `grabFocus()`); a press that
  clears the selection and focuses nothing does, as plan 3.11 says.
- **S4. A pointer that is not over selectable text during a drag.** Evidence for the problem: the model's
  `selectable_start_after`/`selectable_end_before` snap relative to a node, which needs the pointer to be over a node. The
  rule built (`drag_target`): inside the first selectable box that holds the pointer, else the start of the first
  selectable box that lies after the pointer in reading order (a box below the pointer, or on its line and to its right),
  else the end of the last one. It is what browsers do in the gap between blocks and below the last line, it needs no
  direction (anchor before or after), and it covers a `select-none` sentence, a `View`'s padding and empty space with one
  rule. The two snap helpers had no other user and were removed with their test.
- **S5. No word-granularity drag.** After a double click the anchor is the word's start and the drag extends the focus
  character by character (the text engine track did not build word drags either).
- **S6. Lifecycle.** `node_changed` for a text change or a delete, and for a `userSelect` or `display` change of a covered
  node. An insertion or move is the case no node names: a commit that changes a child list while a selection exists builds
  a document and calls `clear_if_stale`. That is a whole-tree walk in a commit path: a named exception to invariant 6, taken
  only while a selection exists and only for a commit that changes a child list (one pre-order walk, the cost of one Tab
  press). `clear_if_stale` is also called whenever a document is built for a gesture, a key or a query, which finds an end
  that stopped being selectable without any signal (an ancestor became a `Button` or `display: none`).
- **S7. Painting.** `SelectionState::highlights` holds the code point range each node paints; a selection change diffs the
  old and new maps and marks only the nodes whose range changed dirty. `ContentKey` gains the range and the resolved colour
  (default `#3b82f659`, Appendix A), so selecting re-records exactly those content items. `record_content` takes a closure
  that returns the rectangles, called only when the item is re-recorded and there is a highlight, so a hover restyle of a
  highlighted node builds no layout. A `TextLayoutError` is an `ERROR` line and no highlight (never a guessed position);
  the verifier fails a run with an `ERROR:` line.
- **S8. The event.** `EventPayload::DocumentSelectionChange` serializes as `selectionchange` (target 0, empty path, no
  payload, not cancelable, not bubbling) and is coalesced while waiting. The name leaves `SelectionChange` free for the
  `TextInput` event of Phase I7, which goes to its input and carries offsets. No `onSelectionChange` element prop yet.
- **S9. JS surface.** `root.getSelection()` returns `{anchor, focus: {node: UIHandle, offset (UTF-16)}, isCollapsed,
  text}` or `undefined`; the offsets are converted natively with `text_offsets::code_point_to_utf16`, against each node's
  current text. `root.clearSelection()`. `useTextSelection()` is a `useSyncExternalStore` hook over a cache that holds the
  object until the next `selectionchange` (an identity-stable snapshot is what the hook needs; one native read per change,
  however many components read it). The snapshot (`get_snapshot`) does not carry the selection: `getSelection()` does.
- **S10. Cursor.** Plan 3.20 says selectable text shows `text`: `Mounted::cursor_at` takes a function for an element that
  set no `cursor`, and the root answers `text` for selectable text outside a `Button`, else `default`.
  `ComputedStyle::cursor_or_default` had no user left and was removed.
- **S11. Copy and `InputMap`.** `ui_copy` is matched as LineEdit does (`is_action("ui_copy", true)`). The first verifier run
  showed the key reaching JS (`rootKeys` had `c`) and native not copying: native's `is_action` was false for an event whose
  `as_text()` and JS `isAction` said `Command+C`. Cause: `InputMap::_find_event` (`core/input/input_map.cpp:153`) matches an
  event only if the action's event has the same device or `ALL_DEVICES`, `action_add_event` normalises key events to
  `DEVICE_ID_KEYBOARD` (`input_map.cpp:210-221`), and the verifier injects with `VERIFIER_DEVICE_ID` (D21), so no verifier key
  ever triggers any `ui_*` action. The product is right for a real keyboard (device 16). The fix is in the verifier:
  `bindVerifierKeys(['ui_copy', 'ui_text_select_all'])` adds a copy of each key event of those actions with the verifier's
  device for the duration of the section and removes it after, so native still matches the real action. Phase I7's
  `ui_text_*` actions need the same call.
- **S12. The system clipboard.** The native section writes to the machine's clipboard through `DisplayServer`. It
  saves the text that was there and restores it in a `finally`.
- **S13. Dead-code allowances.** `selection` is fully used and lost its attribute. `text_offsets` keeps
  `cfg_attr(not(test), allow(dead_code))` (I6 uses only `code_point_to_utf16`; the JS-to-native direction is
  `setSelectionRange` and `setTextAndSelection`, I7) and `text_layout` keeps its (carets, line layout and the edit buffer
  adapters are I7's); their comments say so. I7 removes both.
- **S14. Disabled subtrees.** `disabled` does not stop selection (the DOM selects text in a disabled container).
- **S15. A selection spans layers.** Document order is the main layer then the overlay layer, as Tab order is.
- **S16. Highlight geometry is the text server's.** Selection rectangles are `shaped_text_get_selection` per line
  (`TextLayout::selection_rects`), so a wrapped paragraph highlights each line's run up to its break, and a selected line
  break has no block (text-layout track decision 10).
- **S17. Auto-scroll and scroll-while-dragging.** Wheel scrolling during a drag does not extend the selection until the
  mouse moves again, and there is no edge auto-scroll (Phase I9 integrates `AUTOSCROLL_*`).
- **S18. The window budget.** `scripts/verify.mjs` killed a window after 120 s. The pre-existing sections of the
  interaction verifier reach the end of the scroll section after about 110 s on a busy machine (capture timestamps of a
  window killed at the limit, `exit null`), and the selection section adds about 15 s, so the limit is raised to 300 s: it
  stays a hang detector. The pass line of the verifier now reports `sectionMs` for each section (landscape, busy machine:
  events 25.9 s, cooperation 7.5, pointers 5.7, keyboard 17.7, positioning 5.7, inputs 14.8, scroll 45.3, selection 14.9).

## Plan problems found

For the plan's Phase I6 entry ("done as built" text), the coordinator may use these.

- The Files list omitted `native/selection_input.rs` (new), `native/pointer_input.rs`, `native/keyboard_input.rs`,
  `native/mount.rs`, `native/motion.rs`, `native/events.rs`, `native/computed_style.rs`, `demo/src/verifier-input.ts` and
  `scripts/verify-interaction-web.mjs`.
- Plan 3.17 says nothing about what a press that starts no selection does to the current one, what a prevented
  `pointerdown` does, where a drag goes when the pointer is not over selectable text, or whether an insertion between the
  ends clears the selection (S2, S4, S6).
- Plan 4.3 gives `selectionchange` `selectionStart` and `selectionEnd` "(inputs)": the document's event has no payload
  (S8). Plan 4.5 lists `selection` among the per-node snapshot fields arriving in I6; it is not in the snapshot, because
  `getSelection()` is the query (S9).
- `InputMap` matches a key event to an action only on the same device, so no verifier key ever triggered a `ui_*`
  action (S11); Phase I7's verifier has the same problem.
- Plan 3.20 (selectable text shows the text cursor) was not in I6's task list but is one rule in `cursor_at` (S10).
- `scripts/verify.mjs` gave each window 120 s; the interaction verifier needs more than that on a busy machine before the
  selection section (S18).

## Verification

### Gates

| Check | Result |
| --- | --- |
| `cargo test --locked` | 498 passed (490 at `6cf7406`; `drag_target` 7, the style parsing, the event coalescing and `Document::node` added, the snapping test removed) |
| `cargo clippy --locked --all-targets` (and with `--features probe`) | 0 warnings |
| `rustup run stable cargo fmt --check` | clean |
| `pnpm test:types`, `pnpm test` | clean, 293 passed (287 before: `selection.test.ts` 6; the style and fixture tests gained cases) |
| `pnpm verify:interaction` (all eight sections, both viewports) | passed. Landscape passed on its third attempt: the first two failed while the window was disturbed by a real mouse (86 and 167 foreign `InputEventMouseMotion`s, the assertion `Entering a child hovers its parent`; D22). Portrait passed on its first attempt, which saw 464 foreign inputs and one focus loss. An earlier invocation failed in three disturbed attempts, two of them killed by the old 120 s limit (S18) |
| `pnpm verify` | passed (portrait on its second attempt; the first failed while disturbed) |
| `pnpm verify:motion` | passed, both viewports (the phase touched `motion.rs`, `computed_style.rs` and `render_tree.rs`) |
| `pnpm build:web` and `pnpm verify:interaction:web` (port 8101, my own `node scripts/serve-web.mjs`, stopped afterwards) | passed: **771 assertions** (691 at I5, +20 per viewport), 91 captures, at both device pixel ratios and orientations. The first run failed on the verifier's own assertion (it counted the Command key press, which nothing handles, as a leak of the copy key); fixed and run again |
| Installed library | a default build (`strings` finds no `SEL_NC`), `pnpm build:native` after the last negative control |

The Web wasm was compiled while the one-line font-clone change in `paint_node` was being made, so it may hold the
version before it; the change does not alter behaviour. The native windows after it (`verify`, `verify:motion` and a last
selection-only run, `final-default-build`) ran on the final library.

`sectionMs` of the landscape pass: events 25.9 s, cooperation 7.5, pointers 5.7, keyboard 17.7, positioning 5.7, inputs
14.8, scroll 45.3, selection 14.9 (a busy machine: other worktrees were running their own windows and builds).

### Captures inspected

Native, landscape (`artifacts/native-interaction/landscape/`): `selection-01-paragraph.png` (a triple-clicked paragraph:
the blue run under the two lines of text, each line to its wrap), `selection-02-across.png` (the first paragraph and the
start of the second, the `select-none` sentence between them untouched), `selection-03-all.png` (every selectable text,
including the first rows of the list and the two short texts, and not the sentence, the Button's label or the plain
text; the readout is the whole selected string), `selection-04-highlight.png` (the rose highlight, and the default one
gone from the other short text), `selection-05-scrolled.png` (the highlighted row scrolled partly past the list's top
edge: the highlight is clipped there). Portrait (`.../portrait/selection-03-all.png`, `selection-05-scrolled.png`): the
same at 600 x 900, the lab fitting. Web (`artifacts/web-interaction-verification/landscape/selection-01-across.png`): the
same drag in Chrome; the emoji is the Web font's missing-glyph box.

### Negative controls

One build with temporary mutations, each switched on by an environment variable the run set (`SEL_NC`), each in one
window of `verify:interaction --only=selection`, none re-run. The mutations are not in any commit and the final library is
a default build.

| Mutation | Verifier assertion that failed |
| --- | --- |
| none (the same build, no mutation) | passed |
| the highlight drawn after the text (`over-text`) | `The text is drawn over its highlight, in its own colour: darkest pixel #822b44` (twice, in two disturbed attempts) |
| the selection left out of the content key (`no-key`) | `The selected text is highlighted in the default colour: 0 of its box` |
| no `node_changed` on a text change (`keep-on-text-change`) | `Changing the text of what is selected clears it, with a selectionchange` |
| no `node_changed` on delete (`keep-on-removal`) | **passed**: the structural check clears a removal too (S6); the two mechanisms overlap |
| no structural check (`no-stale-check`) | `A selectable line inserted between the ends clears the selection, with a selectionchange, when the commit lands` |
| neither of the two (`keep-on-removal,no-stale-check`) | `Removing what is selected clears it, with a selectionchange` |
| a Button's label selectable (`button-selectable`) | `A press on a Button clears the selection and starts none, though its label inherits select-text` |
| a captured pointer still starts a selection (`capture-ignored`) | `A pointer an element captured is its element's: no selection starts` |
| a selection does not hold key focus (`focus-released`) | `Starting a selection takes Godot key focus for the root without focusing an element` |
| a press that starts no selection leaves the old one (`press-keeps`) | `It ends inside the second paragraph: 0` (the next gesture ran from the old selection) |
| no rule for a pointer that is not over selectable text (`no-gap-rule`) | `Over a select-none sentence the drag reaches the start of the text after it` |

Two findings from the controls: the first `no-stale-check` and `keep-on-removal` runs passed because asking for the
selection (`getSelection()`) finds a stale selection and clears it too; the removal and insertion assertions now require
the `selectionchange` and the readout (which only asks native after one) before anything asks for the selection, and that
is what made them fail. And one run of `no-stale-check` failed earlier than its target, at the copy assertion, with a
clipboard holding text from another process (`touchend touchcancel`): the system clipboard is shared with whatever else
runs on the machine, and nothing in the verifier can tell that apart from a wrong copy. It is a possible source of a
flake, not of a failure that persisted.

The pure rules have Rust unit tests (`drag_target`, `selectionchange` coalescing, the style parsing and inheritance,
`Document::node`); no negative control was made for those.

## Merge notes (for the coordinator)

Expect conflicts, in these places, and resolve them as follows.

- `native/pointer_input.rs`, `press_mouse` primary block: thumb, then (Phase I9) drag, then selection, then the focus
  default. `begin_selection_press(hit, detail, allowed)`'s `allowed` must also be false once a drag has started
  (`!grabbed_thumb && !drag_started && !mouse_is_captured()`). `run_pointerdown_default(hit, prevented, keeps_selection)`
  gained a parameter at both call sites; I7 passes whatever it needs through the same call. `release_key_focus_without_element`
  must keep asking `selection_holds_key_focus()` (and I7 adds its own reasons to hold focus).
- `native/keyboard_input.rs`, `key_down_default(key, keycode, echo, modifiers)`: `run_selection_key` runs first. **A focused
  `TextInput` must be excluded** from it (its `ui_copy` and `ui_text_select_all` are its own); `Kind::TextInput` does not exist
  here, so the exclusion is a comment in `run_selection_key`. `is_selectable_text` and `selection_document` only list
  `Kind::Text`, so a `TextInput` is never part of the document selection.
- `native/render_tree.rs`: `ContentKey` has a `selection` field and `record_content` a third argument. I7's caret and IME
  paint extend the same key; the highlight must stay first (under the text). I7 may reuse `SelectionPaint` and
  `highlight_rects` for a `TextInput`'s own selection.
- `native/events.rs`: both phases add a `selectionchange`: mine is `DocumentSelectionChange` (unit variant, target 0), the
  `TextInput` one is addressed to its input with offsets. In TypeScript `NativeEventType` has `'selectionchange'`,
  `UISelectionChangeEvent` is the type of mine and `EVENT_TABLE.selectionchange` ignores element handlers; I7 turns that spec
  into a real one with `onSelectionChange` and adds the offsets to the event (an input event and a document event can be
  told apart by `target`).
- `native/props.rs` `StyleSpec`: `user_select` and `selection_color` follow `cursor`; I7's `caret_color` and
  `placeholder_color` are meant to sit with them (the plan lists the four together).
- `native/lib.rs`: the `text_offsets` and `text_layout` attributes (S13), the `selecting` field, two `#[func]`s.
- `demo/src/verify-interaction.ts`: the `SECTIONS` list and the dispatch line, `InteractionInspection`, `KeySpec` and
  `mouseButton`; my section is one block before `SECTIONS`. `demo/src/verifier-input.ts`: `bindVerifierKeys`, which I7's
  verifier needs for its `ui_text_*` keys (S11). `demo/src/main.ts`: the selection entries of the demo API.
- `tests/recording-host.ts`, `tests/renderer.test.ts` (the fake host in the malformed-host test) and `NativeHost` gained
  `getSelection` and `clearSelection`.
