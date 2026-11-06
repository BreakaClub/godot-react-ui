# Input fixes: notes and report

Branch `input-fixes`, based on main `944ca90` (Phase I7 landed). The result of an independent review of the input,
scrolling, selection and drag code (reviewed at `6c6abd7`; every finding was read again against `944ca90`, which adds
`TextInput` and its own press path, and none was changed by it). The plan and the progress log are not edited here: the
decisions below, numbered F1 to F10 after the review's findings, are for the coordinator to fold into the plan's decision
log. **F5 replaces D15(b).**

## Findings and what changed

| # | Defect | Fix | Where |
| --- | --- | --- | --- |
| F1 | A touch pan and a scrollbar-thumb drag ignored a pointer JS had captured (plan 3.12 rule 1, D33). | `PointerTable::captured_by_js` tells an element's capture from a touch's implicit one; the pan and the thumb drag check it after the `pointerdown` dispatch, as the drag and the selection did. | `pointer_state.rs`, `pointer_input.rs`, `scroll_input.rs`, `drag_input.rs`, `selection_input.rs` |
| F2 | A drag started from a source JS had removed before `dragstart`: the skipped event read as accepted, so a drag ran whose events JS had no data store for. | `DragEnvironment::exists`; the machine refuses a missing source as it does a prevented `dragstart` (mouse threshold and touch hold). | `drag.rs`, `drag_input.rs` |
| F3 | The root kept Godot key focus after a commit removed the focused element, after an element was disabled or left reach, after Tab found nothing, and after a commit cleared the selection. | `delete_node` only notes the release (`key_focus_release_due`); the commit performs it once settled and auto-focus has run. The other paths release at once. A commit that removed no focus leaves key focus alone (`grabFocus()`). | `mount.rs`, `lib.rs`, `layout.rs`, `keyboard_input.rs`, `selection_input.rs`, `pointer_input.rs` |
| F4 | The commit's paint pass drew the old selection highlights over changed text before `settle_selection` dropped them; a text that got shorter ("1000" to "999") made `selection_rects` refuse the range and log an ERROR. | `SelectionState::node_changed` drops the highlights with the selection and returns the nodes to repaint. | `selection_input.rs` |
| F5 | A click needed press and release on the same element (or two parts of one enabled button): a press on a row's text lifted on its padding clicked nothing. | `pointer::click_target_of`: the nearest common inclusive ancestor, mouse and touch alike. | `pointer.rs`, `pointer_input.rs`, `PROTOCOL.md` |
| F6 | A prevented `keyup` skipped `key_up_default`, so a keyboard press never ended (the button stayed `:active`). | The release is always handled; a prevented `keyup` only keeps the click (`key_release`). | `keyboard_input.rs` |
| F7 | Escape cancels a drag with the button still down; a window focus loss then cancelled nothing, so the next press was ignored and its release swallowed. | `DragMachine::held_pointer`; the focus-loss cancel includes it. | `drag.rs`, `drag_input.rs` |
| F8 | The hover moved during a drag on a wheel tick, on any layout change under the pointer and on `MOUSE_EXIT`. | Each leaves the hover alone while `drag_in_progress()`; the end of the drag catches it up. | `pointer_input.rs`, `layout.rs`, `lib.rs` |
| F9 | `release_touch` read the "stopped a fling" record only after the pointer table gave up a press, so a touch whose element was removed left it set and the next tap lost its click. | The record is spent first. | `pointer_input.rs` |
| F10 | `next_tab_stop` scanned the document order for every stop it considered: a Tab press cost stops x nodes. | One position map per call. | `focus.rs` |

## Decisions

- **F1.** Both gates are after the dispatch, on `captured_by_js`, so an implicit touch capture (every touch has one) does
  not stop a pan. A mouse capture is always explicit, so `mouse_is_captured` is the same check. The plan text stands.
- **F2.** The refusal is in the machine, not in `emit_drag_event`, so it is a Godot-free unit test. No event is sent for a
  refused drag (not `pointercancel` either): the pointer carries on as plain pointer events, like a prevented `dragstart`.
  A source removed *during* `dragstart`, or later, is unchanged (I9-9: `dragend` goes to the root).
- **F3.** Release on every path that leaves no focused element and no selection, as D11 says. `delete_node` runs in the
  middle of a transaction, and the release sends the root a `FOCUS_EXIT`, so it only sets a flag that `run_commit` settles
  after `apply_auto_focus`. Not released: `clear_selection()` from JS (S3: the owner may have asked for focus), and
  commits that removed no focus. `EXIT_TREE` and `FOCUS_EXIT` need none (the root already lost it).
- **F4.** Highlights are dropped in `selection_node_changed`, where the model is cleared, not at settle time. The
  `selectionchange` still follows from `settle_selection`.
- **F5, replacing D15(b).** The click target is the nearest common inclusive ancestor of the press target and the element
  the pointer was released over, for the mouse and for touch (the touch's implicit capture to its `pointerdown` target does
  not enter into it). Kept: an element's explicit pointer capture clicks that element if the press began inside it; two
  parts of one enabled button click the button itself, even when they share a nearer ancestor inside it; nothing is clicked
  for a release on a disabled element or inside one, a release over nothing (beyond the root nothing is hit, unless an
  element overflows it), or two elements with no common ancestor (another layer or another top-level element, whose common
  ancestor in the DOM would be `body`). The first version also refused a release outside the root's rectangle; the inputs
  section found that wrong: after the root shrinks, a trigger that the page left below it is still hit and clicked, and the
  section clicks it, so the rule is only "nothing is hit". Consequences
  worth knowing: dragging a text selection across two paragraphs of a clickable card now clicks the card on release (as in
  browsers), and a press on one button lifted on its sibling clicks their parent, not either button.
- **F6.** A prevented `keyup` is still consumed (the game does not see it).
- **F7.** The machine reports the pointer an ended gesture still holds; the owner cancels it on focus loss. An unrelated
  press is still ignored while a pointer is held, as before.
- **F8.** `MOUSE_EXIT` still clears `pointer_known`; only the hover update is skipped.
- **F9.** Only `release_touch` leaked the record (a pan, a drag or a cancel each remove it).
- **F10.** A `HashMap` of positions, built per call. A merge walk would be O(n) with no allocation but assumes `stops` is a
  subsequence of the order, which the function's callers satisfy but its tests do not. Not changed, as asked: the rebuilt
  selection `Document` (S1) and `hit_node`.

### Measurements

`next_tab_stop`, release build, three presses (forward from the middle, forward from the last, backward from the first),
before and after:

| Buttons x nodes | Before | After |
| --- | --- | --- |
| 1,000 in 4,000 | 1.5 ms | 0.14 ms |
| 5,000 in 20,000 | 38.8 ms | 0.63 ms |
| 20,000 in 40,000 | 320 ms | 1.6 ms |

The unit test (20,000 buttons, three presses under a second) fails on the old scan in a debug build. No measurement was
taken of the selection document or of `hit_node`: both are linear in the tree per mouse move (S1 for the document, the paint-tree
descent for `hit_node`), and were left alone.

## Tests

Rust unit tests (all Godot-free): `PointerTable::captured_by_js`; the drag machine refusing a removed source (mouse and
touch), not ending a drag whose source is removed later, `held_pointer` and the cancel that frees the next press;
`SelectionState::node_changed`; `click_target_of` (common ancestor, buttons, disabled, unmounted); `key_release`; the long
Tab list. Verifier assertions where only a real run proves it:

| Section | Assertion |
| --- | --- |
| `scroll` | a list whose `pointerdown` captures: a finger moved beyond the slop is not panned and gets its moves; a press on its thumb drags nothing and gets its moves. A finger landing on a coasting list on a button that removes itself on `pointerdown`: the next tap clicks. |
| `drag` | a chip that removes itself between the press and the threshold is refused (no session, no event, no ghost). Escape, then a simulated window focus loss: the next click is a click. A wheel tick during a drag leaves the hover; the hover catches up after. |
| `events` | a button that removes itself from its own click: nothing focused and the root gave Godot key focus back. |
| `selection` | select the counter ("1000"), shorten it to "999": cleared with one `selectionchange` (and no ERROR line, which fails the run). |
| `pointers` | a press on the pad's label lifted on the pad (and the reverse) clicks the pad, with the mouse and with a finger; lifted on the bare page or beyond the root, it does not. |
| `keyboard` | Space on a button under a parent that prevents every `keyup`: no click, and the press ends (style at rest, nothing pressed). |

Lab additions: the scroll lab's captured list and the touch list's vanishing button, the drag lab's vanishing chip, the
selection lab's counter (added to the select-all list of both verifiers), the interaction lab's click-remove button, the
keyboard lab's vetoed button.

## A verifier failure that looked like interference (attempt 3, "The removed button can be restored")

The third attempt of the first complete `verify:interaction` run on this branch failed in the events section at the
existing assertion "The removed button can be restored", with one disturbance in its log (a `window-focus-loss` at
5,706 ms, frame 579) and no foreign input; attempts 1 and 2 passed that section (their failures were the scroll lab's
geometry, fixed since). It was not written off; this is the trace, from `run-attempt-3.log` (kept as
`artifacts/logs/inputfixes-run3-attempt3.log`) and the sources.

- **The step.** `click(api, 'self-restore')` is a mouse move, a press 100 ms later, a release 100 ms after that, and a
  last 100 ms settle. The press focuses the button, the release queues a `click`, JS sets `present` and the removed
  button comes back. The assertion fails if no `click` was made.
- **When it runs.** The events section does 52 settle-equivalents (each at least 100 ms) before that assertion, so it
  runs about 5.2 to 6.2 s after `GODOT_REACT_DEMO_READY`. The focus loss is at 5.7 s, and the failure is logged after it
  (log order is chronological): the focus loss falls in the 0.3 s in which this click happens (an estimate: the section's
  own settles add up to 5.2 s and each takes a little over its 100 ms). Attempt 2's focus loss (4.1 s) fell between
  steps and its run passed; only a loss while the button is *down*, the 100 ms between press and release, can cancel it.
- **Can a focus loss reach the root and cancel the press?** Yes. The engine sends `NOTIFICATION_WM_WINDOW_FOCUS_OUT` to
  every node in the window, depth first, the root `Control` included (`scene/main/window.cpp:827-837` and `:898-905`);
  the isolation's disturbance report is made from the same notification on the owner, the root's parent, and the engine
  visits the root right after it. `ReactUiRoot` answers it with `cancel_all_pointers()` (D6, `lib.rs`): the press
  ends with a `pointercancel`, and the release that follows clicks nothing. The pointers section checks exactly that
  with `simulateWindowFocusLoss()` and it passed in every run here ("The release after a focus loss clicks nothing"), and
  D6 itself was found from a real focus loss 33 ms after a press. The `reachesRoot: false` the `verifier-integrity` review
  measured is consistent with this: a `pointercancel` is only produced when a pointer is down, so a focus loss during a
  quiet moment shows no effect at the root; it does not mean the notification does not arrive.
- **Is this change on that path?** No. The path from the removal to the assertion: `self-remove` is removed by its own
  `pointerdown` while `focus-normal` holds focus (the section asserts that), so `delete_node` does not see the focused
  element and `key_focus_release_due` is not set; the press's default action is skipped for the removed target and
  `release_key_focus_without_element` finds an element focused and does nothing; the release finds no press (the press was
  dropped with its target) and clicks nothing, as asserted just before; then `self-restore` is clicked by a press and a
  release on one element (`click_target_of` returns it), with no drag in progress for the hover guards. The focus-out
  handler gained nothing that runs here (`cancel_dragging_pointer` looks for a held pointer only in an ended drag). So the
  failure needs the focus loss, and the focus loss alone explains it.
- **Result.** Interference with a real cause (a press cancelled by the window losing focus), not a flaky bug of the fixes.
  The gate run after the scroll geometry fix is the evidence that it does not recur; no run was made to test it.

## Merge notes

- Based on `944ca90`. Commits touch `native/` (the files in the table), `native/PROTOCOL.md` (the click rule),
  `demo/src` (labs and `verify-interaction.ts`) and `scripts/verify-interaction-web.mjs` (one list). No `#[func]`, so no
  typings or `demo/gen` changes.
- Expect conflicts with the `filters`, `hidpi`, `scroll-bars` and `verifier-integrity` branches in `pointer_input.rs`,
  `scroll_input.rs`, `lib.rs` (a field and three small edits), `verify-interaction.ts` and the labs; each hunk is local.
  `scroll-bars` will touch `scroll_input.rs`'s thumb code: the capture gate is in `press_mouse`, not in `begin_thumb_drag`.
- The plan: F5 replaces D15(b) and the click paragraph of 3.12; D33's capture sentence is now true as written.
