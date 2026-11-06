# Track: scroll and drag-and-drop core

Branch `scroll-drag-core`, based on `fd11f41`. Notes and report for the coordinator; the plan and the
progress log are not edited here. This track builds and unit-tests three pieces that Phases I5
(scrolling) and I9 (drag and drop) will integrate later. Nothing in the renderer uses them yet.

| Piece | File | Tests | Commit |
| --- | --- | --- | --- |
| Scroll math | `native/scroll.rs` | 71 | `9d02c7e` |
| Drag-and-drop state machine | `native/drag.rs` | 50 | `9d02c7e` |
| JS `DataTransfer` | `src/data-transfer.ts`, `tests/data-transfer.test.ts` | 34 | `9f922ee` |

`native/lib.rs` gets one `mod` line per Rust module, each behind `#[cfg_attr(not(test),
allow(dead_code))]` with a comment saying Phase I5 / I9 integrates it and the attribute then goes. No
other existing file changed. `src/index.ts` is untouched; `DataTransfer` is not exported from it.

## Checks (at `9f922ee`)

| Command | Result |
| --- | --- |
| `cargo test --locked` | 216 passed (95 before this track: 71 scroll + 50 drag added) |
| `cargo clippy --locked --all-targets` | 0 warnings |
| `rustup run stable cargo fmt --check` | clean |
| `pnpm test:types` | clean |
| `pnpm test` | 100 passed (66 before + 34 added) |

Negative controls (by hand, restored afterwards): 16 single-line mutations of `scroll.rs` and
`drag.rs` and 9 of `data-transfer.ts`, each changing one rule the tests are meant to pin (enter and
leave order, the strict threshold, `endedOutsideRoot`, the update on release, forgetting the allowed
effect on a target change, the tick-before-input rule, swallowing after Escape, `contain`, the reversed
range sign, momentum limits and decay, Shift swapping, touch-action intersection, physical Home / End,
the minimum thumb, the velocity sampling interval; the drop and `dragstart` store modes, replacement
order of `setData`, the negotiation, the `url` alias, `effectAllowed` mode, mode restore on a throw,
the default effect table, the `types` cache). Every mutant failed at least one test.

## `native/scroll.rs` public API

Everything is `pub(crate)`, Godot-free, and takes plain `f32` pixels. It has its own `Vec2` and `Rect`
(no `godot` import at all); convert at the boundary.

- **Ranges and state.** `ScrollRange::new(magnitude, reversed)` takes what Taffy gives:
  `Layout::scroll_width()` / `scroll_height()` are a non-negative magnitude (also for a reversed axis,
  taffy `tree/layout.rs:797-825`) and `scrollable_overflow_rect.is_reversed()` is the flag. Normal axes
  allow `0..=magnitude`, reversed ones `-magnitude..=0`; a zero, negative or non-finite magnitude is
  `ScrollRange::NONE`. `ScrollRanges { x, y }`. `ScrollState { offset, velocity }` with `reclamp`
  (after layout; a clamped axis loses its momentum), `scroll_to`, `scroll_by` (both return the movement
  actually made) and `stop_momentum`.
- **Input to pixels.** `wheel_factor(raw)` (Godot's `factor` of 0 means 1), `ticks_to_pixels(ticks,
  client)`, `ScrollInput::wheel(ticks, shift)` (Shift swaps the axes), `ScrollInput::pan(ticks)` (no
  swap), `ScrollInput::Pixels`.
- **Chaining.** `scroll_chain(&mut [ScrollLink], ScrollInput) -> ChainOutcome`. A `ScrollLink` is
  `{ client, ranges, offset, overscroll }`, innermost first; offsets are updated in place.
  `ChainOutcome { moved, moved_by (pixels per link), remainder (input units), stopped_by }`. `moved` is
  what decides Godot's `accept_event`.
- **Keyboard.** `ScrollKey` (`ArrowUp/Down/Left/Right`, `PageUp/Down`, `Home`, `End`, `Space`),
  `key_scroll_delta(key, shift, &link)`, `scroll_key(&mut links, key, shift) -> KeyScrollOutcome`.
- **Reveal.** `scroll_reveal_delta(target, client)`: the smallest scroll that shows a rectangle.
- **Touch pan.** `exceeds_slop(displacement, slop)`, `dominant_axis(displacement)`, `TouchAction`
  (`Auto|None|PanX|PanY`), `PanAllowed`, `pan_owner(&[PanCandidate], displacement) -> Option<PanOwner>`
  (walks the path from the touched element outwards intersecting `touch-action`; the owner is the
  first scroller that can still move opposite to the finger along the dominant axis).
- **Momentum.** `VelocityTracker` (`motion(scroll_delta)` per movement, `frame(dt)` per frame,
  `release()`), `momentum_step(&mut state, &ranges, dt) -> MomentumStep { moved_by, finished }`.
- **Scrollbars.** `scrollbars(client, &ranges, offset) -> Scrollbars { x, y }` (`Option<Scrollbar>` with
  `track` and `thumb` rectangles in container-local, unscrolled coordinates), `Scrollbar::hit(point) ->
  Option<ScrollbarHit::{Thumb, TrackBefore, TrackAfter}>`, `ThumbDrag::begin(bar, pointer, offset)` and
  `ThumbDrag::offset_at(pointer) -> f32`.
- **Drag auto-scroll.** `autoscroll_velocity(pointer, viewport, &ranges, offset) -> Vec2`.
- **Constants** (Appendix A names): `SCROLL_PAGE_DIVISOR`, `MOMENTUM_DECELERATION_PX_PER_S2`,
  `MOMENTUM_SAMPLE_INTERVAL_S`, `TOUCH_SLOP_PX`, `SCROLLBAR_THICKNESS_PX`, `SCROLLBAR_MARGIN_PX`,
  `SCROLLBAR_MIN_THUMB_PX`, `AUTOSCROLL_EDGE_PX`, `AUTOSCROLL_SPEED_PX_PER_SECOND`.

## `native/drag.rs` public API

- `DragMachine::new(DragConfig::new(mouse_threshold_px))` (`Viewport.get_drag_threshold()`; the touch
  slop and `TOUCH_DRAG_HOLD_MS` come from the plan's constants), `set_config`.
- `handle(now_ms, DragInput, &mut impl DragEnvironment) -> DragStep { consumed, outcomes }`.
  Inputs: `PointerDown { pointer, position, source: Option<u32> }` (`source` is the nearest `draggable`
  element, or `None`), `PointerMove`, `HoldTick`, `PointerUp`, `PointerCancel`, `Escape`, `RootExit`
  and `Refresh` (re-hit-test at the last position after a scroll). `DragOutcome` is `Started`,
  `Refused` (prevented `dragstart`), `Declined` (a touch beyond the slop before the hold; pan wins) or
  `Ended(DragEnded { reason, drop_effect, ended_outside_root })`.
- `DragEnvironment { hit_test(position) -> DragHit::{Outside, Inside, Element(tag)}; emit(DragEvent) ->
  DragReply }`. `DragEvent { source, pointer, position, kind }` with `DragEventKind` `PointerCancel`,
  `DragStart`, `Drag`, `DragEnter`, `DragLeave` (both with `related_target`), `DragOver`, `Drop`,
  `DragEnd { drop_effect, ended_outside_root }`; `is_cancelable()` is true for `DragStart`, `DragOver`,
  `Drop`. `DragReply::{Default, Prevented(DropEffect)}`; `DragReply::from_outcome(&event,
  EventOutcome)` validates what `resolve_event` reported (a prevented `dragover` or `drop` without a
  `dropEffect` is `DragReplyError::MissingDropEffect`).
- Accessors: `state()` (`Idle|Pending|Dragging|Ended`), `pointer()`, `source()`, `origin()` (the grab
  point), `position()`, `target()`, `allowed_effect()` (the last `dragover`'s accepted effect at the
  current target; `None` means the forbidden cursor), `next_deadline_ms()` (when a touch hold elapses).
- Constants: `TOUCH_DRAG_HOLD_MS`. It reuses `events::{DropEffect, EventOutcome}`.

## `src/data-transfer.ts` public API

- `DragDataStore` (one per drag) and `DataTransfer` (one per event, bound to the store).
- `store.dispatch(type, run)` for `dragstart`, `drag`, `dragenter`, `dragleave`;
  `store.dispatchDragOver(run: transfer => defaultPrevented): DropEffect` and
  `store.dispatchDrop(run): DropEffect` return the negotiated effect to give `resolveEvent`;
  `store.dispatchDragEnd(nativeDropEffect, run)` ends the association; `store.dispose()` for a refused
  or cancelled drag.
- `DataTransfer`: `setData`, `getData`, `clearData`, `types`, `effectAllowed`, `dropEffect`. A
  standalone `new DataTransfer()` is read/write with `effectAllowed` `none`, as in browsers.
- Pure helpers: `defaultDropEffect(effectAllowed)`, `negotiateDropEffect(effectAllowed, dropEffect)`,
  `isDropEffect`, `isEffectAllowed`, `DROP_EFFECTS`, `EFFECTS_ALLOWED`.

## Decisions

Each was made from the evidence named; none contradicts section 3.

### Scroll

- **S1. Wheel deltas are ticks; `factor` 0 is normalised by the caller.** D13 says `wheel` deltas are
  already multiplied by Godot's `factor`. `InputEventMouseButton.factor` is documented "May be 0 if not
  supported" (`doc/classes/InputEventMouseButton.xml`), and `pointer::wheel_ticks` multiplies by whatever
  it is given, so a platform reporting 0 would scroll nothing. I did not touch `pointer.rs`; `wheel_factor`
  is the one-line fix the integrating phase applies where it reads the factor.
- **S2. Not mirrored: the hidden-bar fallback.** `ScrollContainer` sends a vertical tick to the
  horizontal bar when the vertical bar is hidden (`scroll_container.cpp:189,210`). The DOM does not, and
  chaining hands the tick to an ancestor, so a horizontal carousel inside a page does not swallow the
  page's wheel. Shift swapping (`:187`) is mirrored, for wheel only; pans ignore Shift as the engine does.
- **S3. Keyboard steps.** The brief pointed at `scroll_container.cpp:450-480`; that range is the
  accessibility scroll actions, not key handling. `ScrollContainer` handles no keys itself, and its
  `ScrollBar`s handle `ui_up/down/left/right/home/end` (`scroll_bar.cpp:225-257`) with a step of 0
  (`:712`), so the engine has no useful keyboard scroll to copy and no Page keys at all. The
  accessibility actions are its definition of the two step sizes: an
  "item" is `page / PAGE_DIVISOR` (arrows) and a "page" is the page (Page keys, Space). Home / End go to
  the physical top / bottom edge (`min` / `max`, so a reversed axis' Home is `-range`). Like browsers,
  Up/Down/Page/Home/End/Space act on the vertical axis only, Left/Right on the horizontal one. The
  first link the key moves takes it, so a container at its limit hands the key to its ancestor.
- **S4. Chaining spills the remainder over; `contain` is both axes; no latching.** Per the brief: each
  link consumes what it can and the remainder (in the input's own units, so containers of different
  sizes convert correctly) goes to the next link. Browsers instead chain only when a container consumes
  nothing and latch to one scroller per gesture; I5 can latch by remembering the first link that moved.
  `overscrollBehavior` is one property here, so `contain` ends the chain for both axes, including an
  input on an axis the container cannot scroll. `stopped_by` is set only when something was left over.
- **S5. Pan owner and touch-action.** `touch-action` is intersected from the touched element outwards
  up to and including the scroller that would pan (plan 4.2: "intersected along the path natively"), so a `none`
  or wrong-axis element between the touch and the scroller keeps the pointer events; restrictions above
  the owner do not apply to it. The axis is the dominant one (ties vertical). The slop is Euclidean and
  strict like Godot's drag threshold (`viewport.cpp:2051-2052`); `TOUCH_SLOP_PX` (8, Appendix A) replaces
  the engine's scroll deadzone default of 0 (`scroll_container.cpp:951`).
- **S6. Momentum mirrors `ScrollContainer`, minus one quirk.** Constants and where they come from:
  deceleration 1000 px/s^2 (`scroll_container.cpp:605,613`), velocity re-sampled on a frame that had
  motion or once more than 0.1 s passed without (`:626`), so releasing a finger that rested for over a
  tenth of a second flings nothing; per-axis step `pos += v * dt` with strict limit comparisons
  (`:573-598`). The engine writes `sign * (speed - decel)` back even when negative, so an axis that
  stopped before the other one reverses and creeps (`:619`); here a stopped axis keeps zero velocity.
  The pan itself should apply movement incrementally; the engine's `drag_from + drag_accum`
  (`:285-297`) keeps "dead travel" past an edge before the content follows a reversed finger.
  `VelocityTracker::motion` takes the scroll delta (the finger's movement, negated), as `drag_accum -=
  motion` does.
- **S7. Scrollbar geometry.** Thumb length is the visible share of the content (`client / (client +
  magnitude)`, the proportion `ScrollBar::get_grabber_size` uses, `scroll_bar.cpp:483-494`) of the
  track, at least `SCROLLBAR_MIN_THUMB_PX` and at most the track; the track is the client length minus
  both margins and, when both bars exist, the other bar's thickness and margin so they do not meet at
  the corner. A thumb drag moves one to one with the pointer: offset fraction = fraction at press +
  pointer travel / room the thumb has (`scroll_bar.cpp:186-196`). A reversed axis' thumb starts at the
  far end of the track (offset 0 is fraction 1). Track clicks are classified (`TrackBefore/After`) so I5
  can page as `ScrollBar` does, but the plan only requires thumb dragging.
- **S8. Auto-scroll.** Linear ramp from zero at `AUTOSCROLL_EDGE_PX` from an edge to full speed at the
  edge, towards that edge, only while the pointer is inside the container and only on an axis that can
  still move that way; the nearer edge wins in a tiny viewport. (The engine ramps in proportion to depth
  too, `scroll_container.cpp:544-566`.)
- **S9. Addition: `scroll_reveal_delta`.** Not in the brief; I5 task 6 (focus scroll-into-view) needs it
  and it is three lines mirroring `ensure_control_visible` (`scroll_container.cpp:377`).

### Drag

- **G1. The environment is synchronous and injected.** `hit_test` and `emit` are trait methods and the
  machine owns no clock: `handle(now_ms, input, env)`. `emit` returns a typed `DragReply`, so the
  machine never sees a "prevented, no effect" combination; `DragReply::from_outcome` rejects it at the
  boundary (invariant 4: validate JS-to-native input). `Option<DragMachine>::take()` around the call
  solves the re-entrancy borrow.
- **G2. Event order.** `dragstart`, then `pointercancel` (plan 3.19: only a drag that really begins
  cancels the pointer), then `drag`, `dragenter`, `dragover`. On a target change `dragenter` comes
  before `dragleave`, as in the HTML spec (the processing-model order fetched from
  `html.spec.whatwg.org/multipage/dnd.html`). On release with an accepting target: `drop` and no
  `dragleave`; without one: `dragleave`, then `dragend`. A prevented `dragover` accepts the drop with
  the effect JS reports; effect `none` refuses. Moving to a new target forgets the old target's answer
  until the new `dragover` replies.
- **G3. `endedOutsideRoot` is true only for a release outside the root.** Escape, an OS cancel and the
  root leaving all end with `dragend` effect `none`, `endedOutsideRoot: false`. A game reading
  `endedOutsideRoot` as "dropped into the world" must not see a cancelled drag as a drop. The hit test
  distinguishes `Outside` (beyond the root) from `Inside` (over no element).
- **G4. A late timer cannot change the outcome.** Every input except `PointerDown` first advances time:
  a touch whose hold has elapsed starts dragging where it stood, then the input is handled. A move
  beyond the slop that arrives after the deadline therefore drags (the hold completed first), and a
  release after the deadline starts and ends the drag in place. `outcomes` is a list for this reason
  (`[Started, Ended(..)]`). `next_deadline_ms()` is for the owner's per-frame activity decision.
- **G5. One pointer, and what "consumed" means.** A second pointer is ignored while a gesture is
  underway. `consumed` is true for moves, releases and cancels of a running drag, and for the rest of a
  pointer whose drag Escape cancelled (its events ended at `pointercancel`); false while pending and for
  a refused or declined gesture, whose pointer events carry on. Escape is consumed only by a running
  drag. After Escape the held pointer stays swallowed until it is released or cancelled.
- **G6. Release at a position the last move missed updates first** (drag, enter/leave, dragover), so
  the drop lands where the pointer is, without an extra update when nothing moved.
- **G7. `Refresh`.** Not in the brief's input list: a scroll changes what is under a stationary
  pointer, and plan 3.19 asks for a hit test on scroll change, so I5/I9 need an input for it.

### DataTransfer

Facts taken from the HTML spec's "Drag and drop" section (fetched; the page's summary of each rule):

- **T1. Store versus transfer.** The spec has one drag data store per drag and a new `DataTransfer` per
  event bound to it. `DragDataStore` holds items, `effectAllowed`, the current drag operation and the
  mode; `DataTransfer` holds only its own `dropEffect`. A transfer a handler keeps past its event sees
  the store's resting mode (protected), and an empty inert store once the drag ends.
- **T2. Modes.** `dragstart` read/write; `drop` read-only; `drag`, `dragenter`, `dragover`, `dragleave`,
  `dragend` protected (formats visible, `getData` returns `''`, nothing can be added). `effectAllowed`
  can be set only in read/write mode, and an invalid value is ignored; `dropEffect` can be set in any
  mode, an invalid value is ignored. Neither setter throws.
- **T3. Items.** Formats are lowercased; `text` is `text/plain` and `url` is `text/uri-list`. `setData`
  removes any item of that format and appends the new one at the end (the normative steps; MDN says
  "same position"). `getData('url')` returns the first line of the list that is neither empty nor a
  comment. It does not validate absolute URLs: GodotJS natively has no `URL` global (project memory:
  `new URL()` and zod `.url()` fail natively), so a line is taken as written.
- **T4. Initial `dropEffect`.** `none` on `dragstart`, `drag`, `dragleave`; the current drag operation on
  `drop` and `dragend`; on `dragenter` and `dragover` from `effectAllowed`: none to none, copy to copy,
  move to move, link to link, copyLink to copy, copyMove to copy, all to copy, linkMove to link,
  uninitialized to copy. The spec lets the UA pick the alternative (and, for `uninitialized`, depends on
  what is dragged); I took the first listed and the generic `copy`.
- **T5. Negotiation.** After a canceled `dragover`, the operation is the handler's `dropEffect` if
  `effectAllowed` permits it (copy needs uninitialized/copy/copyLink/copyMove/all, link needs
  uninitialized/link/copyLink/linkMove/all, move needs uninitialized/move/copyMove/linkMove/all), else
  `none`; a `dragover` that is not canceled gives `none`. The spec's other accepted case (a drop on a
  text control) has no analogue here. After `drop`: canceled means the operation is the `dropEffect` the
  handlers left, otherwise `none` (the spec's wording; no permit check). `dragend`'s effect is native's.
- **T6. No `files`, `items`, `setDragImage`.** The ghost is the element's `dragPreview`.

## What the integrating phases must know

**I5 (scrolling)**

1. Give `ScrollRange::new` the magnitude from Taffy **and** the reversed flag; `scroll_width()` alone
   is unsigned.
2. Normalise Godot's wheel `factor` with `wheel_factor` before `pointer::wheel_ticks` (S1).
3. `scrollbars()` returns rectangles in the container's local, unscrolled space: draw them in the
   `overlay` item, not the scrolled one, and hit-test them with the container-local pointer.
4. Re-clamp with `ScrollState::reclamp` after every layout, not only on scroll.
5. For a touch pan: on the first move beyond the slop call `pan_owner` over the path (build
   `PanCandidate`s from the touched element outwards, each with its computed `touchAction` and, if it is
   a scroll container, its ranges and offset); if it returns `Some`, send `pointercancel`, then apply
   each later movement incrementally with `ScrollInput::Pixels(-movement)` masked by `owner.allowed`,
   feed `VelocityTracker`, and on release start `momentum_step` per frame if `release()` is non-zero.
   If it returns `None` the touch stays pointer events. A new touch must `stop_momentum`.
6. Momentum, a pending hold timer and drag auto-scroll all want frames: the single `process()` activity
   decision should include `!state.velocity.is_zero()`, `DragMachine::next_deadline_ms()` and a running
   drag with a non-zero `autoscroll_velocity`.
7. Mouse wheel on non-scrollable UI: `scroll_chain` returning `moved == false` means do not accept the
   event (it reaches `_unhandled_input`).

**I9 (drag and drop)**

1. Hold the machine as `Option<DragMachine>` on the root and `take()` it around `handle`, because `emit`
   runs JS that may unmount anything. After `emit`, skip events whose source or target tag is gone
   (re-look-up paths; a removed source simply gets no `dragend`).
2. Feed `PointerMove`/`PointerUp` to the machine before normal pointer dispatch and drop the pointer
   event when `consumed`; send `pointercancel` only from the `DragEventKind::PointerCancel` event the
   machine emits; suppress the `click` for a pointer whose drag started (`DragOutcome::Started`).
3. After each scroll change under a stationary pointer (wheel, auto-scroll, momentum) call `Refresh`.
4. `DragReply::from_outcome` belongs in `resolve_event`: a `MissingDropEffect` is a JS bug to report as
   the call's error string.
5. JS side: one `DragDataStore` per session id; `dispatchDragOver` and `dispatchDrop` results are what
   `resolveEvent` carries as `dropEffect`; call `dispatchDragEnd` last, and `dispose()` when `dragstart`
   was prevented or the drag was cancelled before `dragend` could be delivered.
6. `TOUCH_SLOP_PX` is defined in `scroll.rs` (drag imports it) and `TOUCH_DRAG_HOLD_MS` in `drag.rs`;
   move them next to the other pointer constants in `pointer_state.rs` if you prefer one home.
7. Remove both `allow(dead_code)` attributes in `lib.rs` when the modules are used, and
   `DEFAULT_SCROLLBAR_COLOR` (`#64748b99`, Appendix A) still needs defining where the scrollbar is
   painted: it is a paint constant, so it is not in `scroll.rs`.

## Integration in Phase I5 (what changed against the notes above)

Written by the I5 implementer; decisions D30 to D37 in `docs/INTERACTION_PLAN.md` have the evidence.

- `scroll.rs` is used as written: `ScrollRange::new(magnitude, reversed)` takes Taffy's `scroll_width()` / `scroll_height()` with
  `is_reversed()`; `wheel_factor` runs before `pointer::wheel_ticks`; the scrollbars are container-local rectangles (the overlay
  item draws them at the padding box's origin, hit testing adds the same origin); the module-level `allow(dead_code)` is gone. Three
  items keep an item-level `#[cfg_attr(not(test), allow(dead_code))]` with a comment naming their consumer: `AUTOSCROLL_EDGE_PX`,
  `AUTOSCROLL_SPEED_PX_PER_SECOND` and `autoscroll_velocity` (I9), and `ticks_to_pixels` (I10's scroll actions, one container).
  `ScrollRanges` and `ScrollRange` gained `Default` (none).
- Open points decided: **wheel and pan gestures chain per event, no latching** (S4's "I5 can latch" was not taken: wheel ticks are
  small, and the spill-over is what the plan's verification expects); **touch pans latch to the owner** chosen once at the first
  movement beyond the slop (`pan.rs`), the slop is not scrolled, and a `contain` container owns a pan it cannot move; **a container
  with nothing to scroll is not on the chain** (`overscroll-behavior` does nothing on it); **a contained scroll is consumed** (the
  event is accepted although nothing moved, so it does not reach the game); **a touch that stops a fling does not click**; **only the
  thumb takes a pointer** (`ScrollbarHit::TrackBefore/After` are classified and unused: no paging by track click). S2 (no hidden-bar
  fallback) and S3 (key steps) hold as written.
- New for I9: `reveal_node` (`scroll_input.rs`) is the `scrollIntoView` walk over the paint parents, and `scrolled(&tags)` is the single
  place that finishes a scroll (item transform, overlay, coalesced event, hover, ring): drag auto-scroll and `DragMachine::Refresh`
  should end there. `update_process()` already takes `ScrollInputState::wants_frames()`; add a running drag with a non-zero
  `autoscroll_velocity` and `DragMachine::next_deadline_ms()` to it. A pan latched to its owner is `TouchPan` in
  `ScrollInputState::pans`; the drag arbitration (plan 3.12 rule 3) must run before `begin_touch_pan` registers one.
- New for I10: `Mounted` has each container's ranges (`geometry.scroll_ranges`) and offset (`scroll`); `scroll_by_checked`,
  `scroll_to_checked` and `scroll_into_view_checked` are what the AX scroll actions call (`ticks_to_pixels` is for a single container's
  line and page steps); the snapshot and `get_scroll_state` give `scrollLeft`... and the drawn thumbs for the AX value.
- New for I7: text inputs must be excluded from key scrolling in `key_down_default` (arrows, Home, End, Page keys and Space belong to
  the editor); and a multi-line `TextInput` is itself a scroll container whose wheel chains like any other.
