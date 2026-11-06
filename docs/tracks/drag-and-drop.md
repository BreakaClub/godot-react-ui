# Track: drag and drop (Phase I9)

Branch `drag-drop`, based on `6cf7406` (the `scroll` branch's Phase I5). Notes and report for the coordinator; the
plan and the progress log are not edited here. This phase integrates the Godot-free drag state machine
(`native/drag.rs`) and the JS `DataTransfer` (`src/data-transfer.ts`) from `docs/tracks/scroll-drag-core.md`, and builds
the rest of I9: props, arbitration, the event sequence with its outcomes, the cursor, the native ghost, edge
auto-scroll, typed JS events, the demo lab and the verifier sections.

## What was built

| Piece | Where |
| --- | --- |
| `draggable`, `dragPreview` (validated native props) | `native/props.rs`, `src/props.ts`, `src/components.tsx` |
| Drag events on the wire, `resolve_event` validation of a `dropEffect` | `native/events.rs`, `src/native.ts` |
| The glue: arbitration, the machine's environment, Escape, cursor, auto-scroll, frames, snapshot | `native/drag_input.rs` (new) |
| The ghost | `native/drag_ghost.rs` (new), `native/render_tree.rs` (`Recorded`, `RootItem` setters) |
| Hooks into pointer, touch and scroll input | `native/pointer_input.rs`, `native/scroll_input.rs`, `native/lib.rs`, `native/motion.rs` |
| `DataTransfer` per drag, typed events, handler props | `src/drag.ts` (new), `src/events.ts`, `src/renderer.ts`, `src/index.ts` |
| Drag lab and verifier sections | `demo/src/drag-lab.tsx` (new), `demo/src/labs.tsx`, `demo/src/main.ts`, `demo/src/verify-interaction.ts` (`--only=drag`), `scripts/verify-interaction-web.mjs` (`drag`, and the touch page) |
| Docs | `native/PROTOCOL.md` ("Drag and drop"), README |

Nothing in `native/` gained a `#[func]`, so there are no typings or `demo/gen` changes. The `allow(dead_code)` on `mod
drag` and on `AUTOSCROLL_*` / `autoscroll_velocity` are gone; `ticks_to_pixels` keeps its attribute (I10's).

## Decisions

Each was made from the evidence named; none contradicts plan section 3.

- **I9-1. Arbitration order.** Rule 1 (an explicit capture) and rule 2 (a scrollbar thumb) are checked first, then the
  press is offered to the machine (`begin_drag_gesture`), and a touch registers its pan after that (`begin_touch_pan`),
  as the core notes require. Both a pending drag and a pending pan then wait for a touch, and the machine decides:
  the 500 ms hold starts the drag (and removes the pan record), a move beyond the 8 px slop first is `Declined` and the
  pan arbitrates as before. A touch that only stopped a coasting flick is not offered (it already may not click).
  A second pointer while a gesture is underway does not move its grab point.
- **I9-2. The hold timer emits from `process()`.** Plan 3.10 rule 1 lets only input callbacks emit. A finger held
  still sends no input events, so the hold has to start the drag from a frame, and `dragstart` is cancelable, so it is
  awaited like any other. The re-entrancy is the same as in `gui_input` (a virtual call with `&mut self`, JS re-borrows
  through `base_mut()`). Everything else that can happen without input is queued, as before; the one `deliver()` in
  `tick_drag` flushes what the timer's events queued. Evidence: the touch sections of both verifiers.
- **I9-3. A scroll under a stationary pointer is looked at at the next frame, not immediately.** `scrolled(&tags)`
  sets a flag (`refresh_pending`) when a drag is in progress, and the frame sends `DragInput::Refresh`. Calling the
  machine from `scrolled` directly would emit cancelable events from commands JS calls (`scrollTo` in an effect), which
  rule 1 forbids; one frame of latency is invisible and every source (wheel, keys, momentum, commands, auto-scroll)
  takes the same path. The hover is not updated during a drag (it froze at its start): `scrolled` skips it.
- **I9-4. Escape arrives through `input()`, enabled only while a drag runs.** A mouse press hands Godot key focus back
  when nothing is focused (D11), so a drag started by the mouse usually has no key focus and `gui_input` never sees
  Escape. `update_process()` (the one decision, now also for input) calls `set_process_input` for a running drag;
  `input` feeds `DragInput::Escape` and, when consumed, calls `set_input_as_handled()` (neither JS nor the game
  sees the key) and delivers the cancelled drag's events. The matching `keyup` is not swallowed.
- **I9-5. The cursor lags one motion.** Godot asks the root for `_get_cursor_shape` before it hands a motion to
  `gui_input` (`scene/main/viewport.cpp:2154-2176`, the shape is set after the call at `:2216`), so the window shows
  what the previous motion's `dragover` decided. The root's own answer (`getCursorShape`) is always current. The
  verifiers read the window cursor after one more motion. Not worked around: setting the shape ourselves would be
  overwritten by the engine in the same handler.
- **I9-6. The ghost is a copy tree, taken before `dragstart`.** The plan says "re-records the source's box/content
  commands into the top-most item". One item cannot carry clips, scroll offsets and per-element opacity, so the ghost is
  a second tree of `RenderNode`s under one top-most item that replays each element's recorded `BoxKey` / `ContentKey`
  with its transform, clip, opacity and scroll offset (`DragGhost::capture`). It is taken when `dragstart` is about to
  be sent, so a handler that restyles the source (`opacity-50` while dragging) does not change what follows the
  pointer, as a browser's image; a refused drag drops it. It is a snapshot (no scrollbars, does not follow later
  changes or the source's removal), is 60 % opaque (`DRAG_GHOST_OPACITY`) above the focus ring (`GHOST_DRAW_INDEX`),
  and is clipped by the root `Control` like everything else. `dragPreview: 'none'` captures nothing.
- **I9-7. Drag events bubble and are plain events.** As in HTML: no capture handlers, and `dragenter` / `dragleave`
  bubble with `relatedTarget` (they are not the crossing chains of `pointerenter`). A handler that wants "the pointer is
  over this card" therefore either gives the card no hit-testable children (`pointer-events-none` on its text, as the lab
  does) or compares `relatedTarget`; enter always precedes leave (the machine's order), so "a leave clears the highlight
  only if the pointer has not already entered something else" works.
- **I9-8. A prevented `dragover` or `drop` without a `dropEffect` is rejected in `resolve_event`.** The event queue
  records which awaited event needs one and returns the error string, the event then counts as not prevented, and the
  environment's `DragReply::from_outcome(...).expect(...)` states the invariant. JS always sends one (the negotiated
  effect from the store), so this is a guard for a broken JS owner.
- **I9-9. `dragend` always reaches JS.** If the source was removed during the drag it is addressed to the root (target
  0), so root listeners hear it and JS can end the drag's data store; every other drag event for an element that is gone
  is skipped. JS drops a store when `dragstart` is prevented, after `dragend`, and when the root unmounts.
- **I9-10. Wire details.** Drag events carry `button` -1 and `buttons` 1 while the pointer is held (0 for `drop` and
  `dragend`), `sessionId`, and `relatedTarget` for `dragenter` / `dragleave`. A session id is the number of the drag
  (counted when `dragstart` is about to be sent, so a refused drag uses one too).
- **I9-11. What ends a drag.** The machine's own rules (release, Escape, OS cancel, root exit) plus: the window losing
  OS focus cancels it like any press (`cancel_all_pointers` also cancels the drag's pointer, which the table no longer
  holds). The first native verifier run of the portrait viewport was in fact disturbed by another window taking focus
  (`GODOT_REACT_RUN_DISTURBED`, `window-focus-loss`) twice and failed on exactly the assertions that expect a running
  drag; D22 re-ran it and the third attempt passed. Other mouse buttons are ignored while a drag runs.
- **I9-12. `draggable` is the nearest ancestor-or-self with the prop true**, not disabled itself or through an
  ancestor; `draggable={false}` is the default (absent), so it does not block a draggable ancestor.
- **I9-13. Edge auto-scroll scrolls each scroll container on the path independently.** The path is the paint ancestors
  of the element under the pointer that can scroll (`scroll_path`); a container at its limit does not hand the drag to
  the next one (unlike a wheel). The visible area is the container's padding box; `autoscroll_velocity` (S8) does the
  rest. Frames: `update_process()` includes a pending touch hold (`next_deadline_ms`), a scroll waiting to be looked at,
  and a non-zero auto-scroll velocity; a drag that needs none runs with `process()` off (verified).
- **I9-14. Snapshot.** `get_snapshot()` gets a top-level `drag` (plan 4.5 said per-input state would arrive with its
  phase; one drag per root makes it a single object): `state` (`ended` is a finished or cancelled gesture until the next
  press, so a verifier asks "over?" and not "idle?"), `session`, `source`, `target`, `pointer`, `origin`, `position`,
  `allowedEffect`, the shown ghost's rectangle and element count, and how the last drag ended (`lastEnd`).

- **I9-15. Drag and selection (after Phase I6 landed).** The press arbitration in `press_mouse` is thumb, then drag, then
  selection (plan 3.12 rules 2, 3, 5): `begin_drag_gesture` returns whether the press is inside a draggable element, and
  that makes `begin_selection_press`'s `allowed` false. So text inside a draggable element starts no selection, and a
  press there that never becomes a drag is a click that, like any un-prevented press that starts no selection, clears the
  current selection (`run_pointerdown_default`'s `keeps_selection` is false). That is the browser rule for text in a
  draggable. It holds with a prevented `pointerdown` or a captured pointer (those never reach the offer, so selection
  decides as before). Verified in the drag section with a `select-text` chip that is a drag source: a click clears a
  selection made on plain `select-text` and selects nothing, and a press that moves on drags with no selection under
  way. The ghost copies the recorded content key without the selection highlight (it has no font to place one with, and
  the press that starts a drag has cleared the selection).
- **I9-16. Keys.** Escape is matched as a plain key (`InputEventKey.keycode == Key::ESCAPE`) in `input()`, not through an
  InputMap action, so the verifier's device ids (S11) do not affect it.

## Plan problems found

- The Files list omitted `native/pointer_input.rs`, `native/scroll_input.rs`, `native/motion.rs` (`update_process`),
  `native/snapshot.rs`, `src/drag.ts`, `src/index.ts`, `native/drag_input.rs` and `native/drag_ghost.rs`, and lists
  `native/pointer.rs`, which needed no change. `src/events.ts` holds the typed events, `DataTransfer` stays in
  `src/data-transfer.ts`.
- "Escape cancels (accepted)" assumes the root has key focus; it usually does not during a mouse drag (I9-4).
- "A native ghost in the top-most item" needs a tree of items to keep clips and scroll offsets (I9-6).
- Plan 3.10 rule 1 (only input callbacks emit) has one exception, the hold timer (I9-2).
- The plan's `resolve_event(seq, default_prevented, drop_effect)` had no rule for a prevented drag event without an effect
  (I9-8).
