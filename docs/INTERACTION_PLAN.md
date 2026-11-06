# Fabric renderer and interaction plan

Status: plan v2.10, 6 November 2026. Done: Phase 0 (`9f4a02c`), Phase 1 (`0d11607`), Phase F0
(`4f7dd0d`), Phase F1 (`ce99bea`), Phase F2 (`578b461`), Phase F3 (`07a8344`), Phase F4 (`e60f6e5`;
its numbers and decisions D7 to D10 are in the progress log and the decision log below), Phase I1
(`edf6081`; decisions D11 to D13), Phase I2 (`fd11f41`; decisions D14 to D16), Phase I3 (`dec1f5d`; decisions D17 to
D19); decision D20 sets the verification tiers; decisions D21 and D22 isolate the native verifiers from real input
(Task 0). Phase I4 (`5018fee`; decisions D23 to D26). Parallel tracks on main (D27): text engine, scroll and drag core,
world-space part 1, kit part 1; kit approach D28; test-input rules D29. Phase I5 (`5858a54`; scroll containers, decisions D30 to
D37) with scroll accessibility (D38) and the scrolling Select list (D39). Phase I6 (`1071e8d`; D41). The stock engine profile (`64e674c`;
D42). Phase I9 (`400bea3`; D43). The freshness guard (`941334b`). Phase I7 with the kit `TextField`, `TextInput` accessibility and
world-space typing, which finishes I8, I10's `TextInput` part and I11 (`539e787`; D44). HiDPI (`6c6abd7`, hardened in `5b7faba`; D45). Verifier
integrity (D46). Scroll bar elements, which finish I10 (D47). `TextInput` fixes (D48). Phase V1, filters and frosted glass (`abdc077`; D40, D49). Input fixes (D50).
Now: an independent review of V1, the batch regression, then final acceptance.

v1 of this plan (`7f0a96c`) was rejected because it built every interaction feature on the
prototype's commit path, which re-walks and re-sends the whole tree on every change. v2 replaces
that path with React Native Fabric's architecture end to end (persistent reconciler, immutable shadow
tree with structural sharing, diffing proportional to change, an incremental native mounting layer,
native style resolution) and then builds the interaction features on it: Godot-cooperative input,
touch, focus and keyboard, positioning and overlays, scrolling, text selection, text input with IME
and on-screen keyboards, an input component kit, HTML-style drag and drop, accessibility, and
world-space UI.

## Decision log

Decisions are made from evidence by whoever reaches them (the coordinator or the implementer) and
recorded here and in `docs/INTERACTION_PROGRESS.md`. A measured gate that fails is a decision point,
not a reason to wait.

- **D1 (v2, `7f312d8`)**: adopt Fabric's architecture end to end; no JSI-style binding work until
  measurements show the GDExtension call boundary is the bottleneck.
- **D2 (after F0, v2.1)**: the persistent shadow tree lives in **JS**, not behind native handles.
  Evidence: F0 (`docs/INTERACTION_PROGRESS.md`, Phase F0) measured native `RefCounted` handles at
  4 µs (native) and 5 µs (Web) per create, but GC reclaims them only under JS allocation pressure:
  on native, 100,000 dropped handles stayed live through 30 idle seconds, and in a 300 × 2,000-node
  commit run up to 67 commits' worth of old trees stayed alive and 70,000 handles were never
  reclaimed after commits stopped. GodotJS has no V8 external-memory accounting (no
  `AdjustAmountOfExternalAllocatedMemory` anywhere in `modules/GodotJS`; only a manual full-GC
  request, `bridge/jsb_environment.cpp:3433-3450`), so wrapping native nodes in any Godot type keeps
  native memory invisible to V8. A JS shadow tree is ordinary GC-managed JS memory with no native
  memory attached, needs no native call during render, and keeps every Fabric property that matters:
  immutable instances, structural sharing, identity-skipping diff, one synchronous native commit
  carrying only changed nodes, native mounting, layout, style resolution and state.

- **D3 (F3)**: a style the motion engine cannot animate (a pixel/percentage mix, an intrinsic
  transition on a growing or shrinking flex main axis) is rejected by `commit` **before anything is
  mounted**: `commit` resolves the computed styles the payload would produce in a dry run
  (`restyle` over a `StyleOverlay` of the validated payload) and checks every transitioning node, then
  reuses those computed styles when it mounts. A style change native itself causes (hover, focus,
  active, a breakpoint) cannot be rejected, so it is applied without animation and an `ERROR` line names
  the node. Evidence: README documented the v1 rejection; invariant 4 forbids a half-applied commit; the
  only alternative (apply, then fail) would leave JS and native disagreeing about the tree.
- **D4 (F3)**: `replaceContainerChildren` records a rejected commit in the root's failure slot and
  returns, instead of throwing. React wraps the call in `captureCommitPhaseError`
  (`react-reconciler.development.js:11360-11380, 12350-12365`), which with no error boundary unmounts the
  whole tree; the v1 behaviour (previous tree stays, the error surfaces at `render()` /
  `dispatchEvents()`, the next commit recovers by diffing from the last accepted state) is what the
  renderer tests and the plan's "existing `container.failure` path" mean.
- **D5 (F3)**: enter and leave events carry `relatedPath` (the other side's path) next to `path`, and
  JS computes the crossed elements from the two tag paths. The plan gave events only `path`, but a
  pointer crossing needs the common ancestor, and JS no longer has parent links.
- **D6 (F3)**: native cancels a press that is in flight when the window loses OS focus
  (`NOTIFICATION_WM_WINDOW_FOCUS_OUT`). Evidence: a 40 % flake of `verify:motion` was traced to
  focus-out arriving 33 ms after the first press; Godot's `_drop_mouse_focus` sends the control a
  synthetic release with `DEVICE_ID_INTERNAL`, which `Control::_call_gui_input` never forwards to
  `_gui_input` (`scene/gui/control.cpp:2530-2540`), so `pressed` stayed set forever. (The verifier now also
  waits for the window to settle before its first input, as the others do.)
- **D7 (F3)**: every path that changes what is drawn ends in a paint pass, whether or not a style
  changed. Two paths did not: a commit that only reorders or removes children (no created or updated
  node, so no computed style changed and `publish_style_changes` returned before the layout flush), and
  `set_focus` onto an element whose style has no `:focus` rule (no restyle, so the focus ring was not
  redrawn until an unrelated paint). Evidence: raster comparison with the Phase 1 build found the pressed
  button without its ring and the reordered cards in their old positions (13,672 pixels), with the
  snapshot's child list already reversed; the progress log's "Defects found" records the chain that
  proved each cause and the negative controls. Fix: `publish_commit(changes, structure_changed)` and a
  `paint_pass()` at the end of `set_focus`; a regression assertion for each in `verify.ts`
  (and `verify-web.mjs`).
- **D8 (F4)**: the JS clauses of criterion 1 (JS commit time and the commit walk, at most
  `MAX_SCALE_RATIO` times the 50-cell figure) are met by a tree whose parents have bounded fan-out and
  not by a flat list of 2,000 siblings; the native clause, payload and mutation counts are met by both.
  Evidence (acceptance run, Web, Chrome 156): one-cell change, JS commit time 2,000 cells against 50:
  7.2x for a flat list whose parent re-renders every cell, 2.6x to 3.2x with memoized cells, **1.1x to 1.4x
  with the same 2,000 cells in 40 memoized rows of 50**. The cause is React, not the renderer: a parent
  that re-renders walks its children (the fixture creates 2,000 elements; memoization only makes each one
  cheap) and, in persistent mode, rebuilds the parent's child list when one child changes
  (`appendAllChildren`); even with state local to the one cell, so the parent does not re-render at all,
  a one-cell commit goes from 0.10 ms at 50 siblings to 0.85-1.0 ms at 2,000 (Node, V8, same renderer,
  no-op host), about 0.4 us per sibling. The renderer's own walk is 0.015 ms at both sizes in the rows
  fixture and about 17 ns per sibling in the memo fixture. So the criterion cannot hold for a flat list
  under React; F4 evaluates the clause on the bounded fan-out fixture and reports the flat variants as
  recorded deviations (the runner prints them as `FAIL (recorded deviation D8)`).
- **D9 (F4)**: Stylo is told only about a node while the node has a `transition` or has just lost one,
  which replaces F3's choice to mirror every mounted node. A node that gains a `transition` in the same
  change that changes a value is first given its previous style and resolved, so its transition still
  starts from the old value. Evidence (instrumented build, Web): at 2,000 cells one cell's colour change
  cost Stylo 320 us against 114 us at 50, and 7.4 ms of the 28 ms commit when every cell changed. Stylo's
  traversal visits every sibling of a dirty node (about 100 ns each), so a restyle of a plain cell grew
  with its sibling count for no effect: plain nodes are never sampled. Result: native commit time for the
  one-cell change is 168 us at 2,000 cells against 198 us at 50 (ratio 0.85), and for every cell 23.8 ms
  against 31.7 ms. One behaviour differs: a `display: none` ancestor with no transition no longer cancels
  a running transition on its descendants (Stylo does not see the ancestor hide); the transition runs to
  its end instead, to the same final value.
- **D10 (F4)**: criterion 4 compares totals. F0's reconcile window ended before its native draw (the draw ran
  in the next frame: 15.9 ms of native draw CPU at 2,000 cells); the Fabric renderer paints inside the
  commit, so its reconcile window is the whole update. "Total time per update" is therefore F0's reconcile
  p50 plus F0's draw p50 (41.30 + 15.885 = 57.19 ms) against the new reconcile window (51.7 ms).
  Compared with the reconcile window alone it is 51.7 against 41.30, which is not a like-for-like
  comparison. The per-node work did not shrink: parse (3.9 ms), validation (3.3 ms), restyle and paint
  (14.8 ms) are all inside the one window.
- **D11 (I1)**: the root's Godot focus mode is `FOCUS_CLICK`, and a primary press that reaches the root
  leaves it holding key focus only if an element is focused. Evidence: Godot gives key focus to a focusable
  Control on every left press that reaches it, before `_gui_call_input` runs any handler
  (`scene/main/viewport.cpp:1976-1992`: `control->grab_focus(true)` when `_is_focusable()`, which is
  `FOCUS_ALL` or `FOCUS_CLICK`), and `grab_focus()` refuses `FOCUS_NONE` (`scene/gui/control.cpp:3017`). The
  plan's "no focus stealing" therefore cannot be had by never grabbing; and `FOCUS_ALL` would also let Godot's own
  Tab navigation (`ui_focus_next`) hand the root key focus. So: `CLICK` (click and `grab_focus()` only), and the
  press's default action ends by releasing key focus when no element is focused, prevented or not. A press that
  lands on a non-focusable element used to need no care; now it releases focus mid-press, which sends
  `FOCUS_EXIT`; that handler cleared `pressed` and with it the click, so it now clears only a keyboard press
  (a key release can no longer arrive) and leaves a mouse press alone (Godot routes it by mouse focus). The
  negative control for each (`ready()` grabbing, `FOCUS_EXIT` clearing every press, never releasing) fails the
  I1 verifier with the named assertion.
- **D12 (I1)**: the pass-through demo is a separate HUD tree (`demo/src/passthrough-hud.tsx`, rendered by
  `godotReactDemo.showHud()`), not a region of the interaction lab. A pointer reaches the Godot Controls under the
  root only where the whole ancestor chain is `pointer-events: none`: an ancestor that takes pointers is the
  target at that point (the lab's `bg-slate-50` app root covers the window). The HUD has four `pointer-events-auto`
  controls in the top row (three buttons, so that Tab can move, and a non-button View that cannot take focus),
  a panel whose labels are `none`, and two wheel panels (one prevents, one only counts).
- **D13 (I1)**: `wheel` deltas are in wheel ticks, positive down and right, with no `deltaMode`: one per notch of a
  discrete wheel scaled by Godot's `factor`, or a pan gesture's `delta` as given. Both are what `ScrollContainer`
  scales by page / 8 (`scene/gui/scroll_container.cpp:190-226, 311-318`), so I5 reuses the numbers unchanged.
  Two engine behaviours found while verifying, neither worked around: `Input` dispatches every
  `InputEventGesture` twice (`core/input/input.cpp:995-1003` and `:1046-1048`), so one trackpad pan reaches JS as
  two `wheel` events and reaches Godot's own `ScrollContainer` twice as well; and Godot's Web display server maps a
  DOM `deltaX > 0` (scroll right) to `WHEEL_LEFT` (`platform/web/display_server_web.cpp:704-710`), so horizontal
  ticks have the opposite sign on Web. They are recorded in the progress log for the engine owner.
- **D14 (I2)**: the pointer pad and the capture knob live on a separate demo page (`demo/src/pointer-lab.tsx`,
  rendered by `godotReactDemo.showLab('pointers')` through a page registry, `demo/src/labs.tsx`, which also holds
  the I1 HUD), not in the interaction lab. The lab's body is a fixed 520 px with no scrolling until I5, and the
  verifiers' geometry check rejects a node that escapes the window, so another section there would push the
  others out of reach; a page also leaves every existing capture untouched (the 94 pre-I1 pairs compare
  unchanged, progress log). I3 to I4 use the same registry.
- **D15 (I2)**: choices the plan did not make, each DOM's. (a) Only the primary `pointerdown` is cancelable:
  nothing native follows another button, so there is nothing to prevent. (b) Click target: a pointer an element
  captured clicks that element if the press began inside it (the usual `setPointerCapture(currentTarget)` pattern,
  whose press target is a child, would otherwise never click); otherwise press and release must reach the same
  element or two parts of one enabled button, as before. (c) A touch's events are `pointerup`, `pointerleave`,
  then `click` (browsers fire the compatibility click after the boundary events); `pointerenter` has no related
  element, so JS enters the whole path. (d) `detail` is the click count of the press on `click`, `auxclick`
  and `dblclick`, and 0 on `pointerdown`/`up`/`move` and `contextmenu`; `dblclick` follows the second `click`
  of a sequence only. (e) The count is measured against where the sequence began and against 500 ms from the
  previous press (Appendix A), per button and kind of pointer.
- **D16 (I2)**: every input event with `device == DEVICE_ID_EMULATION` is ignored, not only touch-to-mouse.
  Evidence: `core/input/input.cpp:858, 888, 926, 960, 1464` set the device on every translated event, and the
  translated mouse press is dispatched before the touch that caused it
  (`_parse_input_event_impl(button_event, true)` runs inside the touch's own handling), so an un-ignored
  emulation shows up as a mouse press ahead of every touch; with the check removed the verifier reads `down
  mouse 1 touch 1, ids 1,2` for one tap. Godot also gives the root key focus on the emulated press
  (`viewport.cpp:1976`); the touch's own default action hands it back as D11 says. A touch's pointer id is
  `2 + Godot touch index` natively; Godot's Web build numbers touches by the browser's contact identifier,
  which keeps counting across taps (id 7 for the fifth tap in a session), so only distinctness and the range
  are asserted there.
- **D17 (I3)**: the focus ring is drawn for keyboard focus only, so the F3 assertion in `demo/src/verify.ts`
  that a mouse press paints the ring on the pressed button is inverted: a mouse press focuses without it. The two
  cannot both hold: plan 3.13 says the ring is drawn only for focus-visible focus and a press is not (and I3's
  verification list asks for "focus ring only after keyboard focus (PNGs)"). What the old assertion protected, D7's
  defect that a focus change which restyles nothing never reached a paint pass, still matters and is now covered
  where the ring is drawn: the Keyboard lab Tabs onto a button with no `focus:` class (`kb-plain`) and probes the
  ring's pixels natively and in the Web page, and `verify.ts` itself now probes the ring after Tab reaches
  `increment`, which has no `focus:` rule either (`A Tab focus paints the focus ring ...`). That step needed a
  second adjustment to the owner: the old loop pressed Tab only while `increment` was not focused, and the press
  just before it had already focused `increment` with the mouse, so `05-keyboard-focus` was a mouse focus and no
  Tab was pressed; the loop now always presses Tab at least once, so the capture is the keyboard focus its name
  says (its pixels equal the pre-I1 capture). The change touches one existing assertion; every other existing
  assertion, including the keyboard ones, is unchanged. Evidence: before the change `pnpm verify` failed with
  exactly that message and nothing else.
- **D18 (I3)**: input modality starts as `keyboard`, a press (any button or touch) makes it `pointer`, and a key
  press other than a bare modifier makes it `keyboard`; `focus()` and `autoFocus` with no explicit
  `focusVisible` follow it (Tab is always a keyboard focus). Before any pointer input `autoFocus` therefore shows
  the ring, as in browsers. The plan says only "while the modality is keyboard"; browsers' extra heuristic (a key
  press makes the already-focused element focus-visible) is not implemented, as the plan does not ask for it.
- **D19 (I3)**: choices the plan did not make. (a) Every key press, repeat and release is awaited by JS while the
  root holds key focus, including keys native has no use for, because root listeners and `preventDefault()` need
  them; a dispatch costs about a tenth of a millisecond for a cheap handler (I1 measurements). (b) Enter and Space
  activate only `Button`s: an element with `tabIndex` is focusable and takes key events but is not a control. (c)
  The repeats of an activation key are consumed while the press it started is in flight, so a held Enter does not
  leak to the game one repeat at a time; the `keyup` that completes it must be the key that started it. (d) Tab
  with Ctrl, Alt or Meta is left alone. (e) `focus()` on a disabled or non-focusable element is an error that says
  which; DOM ignores it silently, but a `focus()` that does nothing hides a bug. (f) `blur` carries the visibility
  the element had; `focus` the one it gets.
- **D20 (coordinator, at Ben's request)**: verification runs in tiers, defined in 0.4.1, instead of every native
  and Web verifier at every phase. While iterating: the affected unit tests and the typecheck. When a task is done:
  the new or changed verifier sections, natively, in landscape. When a phase is done, before its commit: the unit
  suites, typecheck, Clippy, `verify:interaction` and `verify`, `verify:motion` only for the files 0.4.1 names, and the
  Web interaction verifier only if the phase changed Web-specific behaviour. At the end of each batch and before
  final acceptance: one full regression run (`build:web` and all six verifiers). Evidence: AGENTS.md says to prefer
  the narrowest check that proves the change while iterating and to run the broader suites before calling work done;
  the per-phase Web gate (a Wasm build and three browser verifiers) was the main cost of I1 and I2. Phases F0 to I2
  were gated with every verifier and keep the gate lines they were gated by; the gate lines of I3 to I11 are
  rewritten to point at the tiers. The `--only=<name>[,<name>]` section filter 0.4.1 allows exists since I4 (`pnpm verify:interaction --only=positioning`;
  `scripts/verify.mjs` and `scripts/verify-interaction-web.mjs`); the sections are `events`, `cooperation`, `pointers`,
  `keyboard`, `positioning`, and `touch` on the Web page.
- **D21 (Task 0, before I4)**: a native verifier window is isolated from the real keyboard, mouse and window system, and
  reports what still gets in. Evidence (progress log, "Task 0", with the traces): a real mouse sends the verifier's window
  `InputEventMouseMotion`s with device 32 and positions far outside the window (another display) for as long as the window
  is the key window, and none while another window holds that status; one quiet `verify:interaction` run saw 173 events
  that were not the verifier's among 202, and failed `Entering a child hovers its parent`. A foreign motion moves the hover
  before `_input` runs (`Viewport::push_input` calls `_update_mouse_over` at `scene/main/viewport.cpp:3554`, `_input` at
  `:3568`), so the root gets `MOUSE_EXIT`; accumulated input merges a real motion into an injected one whatever their devices
  (`core/input/input.cpp:1654`, `input_event.cpp:1036-1066`: no device check; one injected position was lost this way); and
  the engine gives real events devices 16 (keyboard) and 32 (mouse) by default (`input_event.h:66-67`), the same as an
  unmarked injected event. So (one helper, `demo/src/verifier-input.ts`, for every native verifier): the verifier injects with
  its own device id (`VERIFIER_DEVICE_ID`), the owner drops every other device in `_input` (the engine's touch emulation, device
  -1, is let through), `Input.useAccumulatedInput` is off, and the window is `unfocusable` (`canBecomeKeyWindow` is false,
  `platform/macos/godot_window.mm:60`, so keys and off-window mouse moves never arrive) and `mousePassthrough`
  (`setIgnoresMouseEvents`, so the cursor over it, and a drag of its title bar, reach the window beneath). Only runs started
  with `--verify*` or `--probe` do this; product code (`native/`) has no test hook. `Input.parseInputEvent` needs none of what
  it removes: `Window::_window_input` and `Viewport::push_input` never read window focus. D6 is tested by the verifier
  delivering the focus-out notification itself (`propagateNotification`), not by the OS. Not chosen: hosting the UI in a
  `SubViewport` driven by `push_input` (it skips `Input`'s touch-to-mouse emulation, which D16's test needs, and moves the
  `_unhandled_input` counters), replacing the window's DisplayServer callbacks (immune by construction, more machinery than
  the failure rate calls for), and a project-wide `no_focus` (static; it would reach normal runs). Launch-time focus is not
  prevented: `show_window` always activates the application for the main window (`display_server_macos.mm:1797`,
  `godot_application.mm:59`, whose first line is unconditional and which runs a three-step activation hack for an unbundled
  process), and nothing in `main.cpp` or the project settings turns that off; `open -g` cannot either. A brief focus
  interruption when a window launches is accepted.
- **D22 (Task 0)**: a verifier run that sees interference is disturbed, and only such a run is run again. The isolation of D21
  cannot make a run immune to a person working at the window, so `VerifierInputIsolation` logs a `GODOT_REACT_RUN_DISTURBED`
  line, as it happens, for input from another device, a focus-out the verifier did not send, and a mouse crossing of the
  window, after `STARTUP_SETTLE_MS` (the activation steps and a focus flicker 70 and 190 ms after `_ready` are in the engine's
  startup). `scripts/native-run.mjs`, used by every native verify script, runs a launch to its end and then: a pass is a pass
  (a disturbed pass is reported); a failure without a disturbance in its log is a real failure and is never run again; a
  failure with one is run again, at most twice, then fails with every attempt's log kept (`run-attempt-N.log`) and the
  disturbances named. This is the only retry any verify script makes; frequent disturbances would be the signal to add
  resistance, not retries (`tests/native-run.test.ts` covers the policy with a stand-in for Godot).
- **D23 (I4)**: the paint tree is the React tree except for out-of-flow elements: an `absolute` element's **paint parent** is its
  containing block (the nearest ancestor whose `position` is not `static`, else the layer root), a `fixed` element's the
  layer root, everything else's its parent (`native/stacking.rs`). Evidence: the plan's task 1, recorded as two Rust tests
  over the pinned Taffy (`props::tests::an_absolute_grandchild_is_located_in_its_containing_block_not_its_parent` and
  `...a_fixed_one_use_the_root`): the `Layout.location` of an absolute grandchild is relative to its **containing block's
  border box**, not its parent (oof.rs, "its `location` is relative to the containing block's border box"; here
  (16, 18) in the block against its parent's (32, 32), for `left: 11, top: 13` and a 5 px border), and a fixed box is
  located in the root. That is exactly the frame of the paint parent's content item, so the stored `location` needs no
  correction and the canvas item attaches under the containing block's **content** item (which is clipped to its padding
  box when it clips, so a `relative` + `overflow-hidden` parent clips its absolute children and a static one between them
  and their containing block does not). Hit testing, absolute rectangles, the focus ring and the snapshot's `rect` and
  `clipRect` walk the paint parents; events, inheritance, layout, Tab order and `documentIndex` keep the tree.
  `zIndex` is React Native's: every element, any integer that fits an `i32`, no stacking context; the elements one paint
  parent paints sort by (`zIndex`, document order), the document order of an out-of-flow descendant being its place in the
  whole tree.
- **D24 (I4)**: `layout::compute_tree` marks the output of a leaf with the positioning area of an empty container. Evidence:
  the first run of the positioning section panicked in Taffy (`taffy_tree.rs:564, invalid SlotMap key used`) when the
  popover closed, and a Taffy-only test reproduces it (`props::tests::taffy_keeps_a_stale_hoisted_list_when_its_container_loses_every_child`,
  `should_panic`): Taffy lays a childless node out as a leaf, whose output has no positioning area, and `compute_oof_layout`
  (`oof.rs:351`) returns before replacing the list of out-of-flow boxes the node was the containing block of, so the list
  names deleted nodes and the rounding pass reads them. A layer root whose last child was a popover, or a card whose only
  child was absolute, is exactly that. Flexbox marks an empty container the same way (`flexbox.rs:656`). The workaround
  is one assignment in the measure closure, covered by `layout::tests::a_container_that_loses_its_last_out_of_flow_child_lays_out_again`
  (which fails without it); the `should_panic` test fails when a Taffy update fixes the defect, which is the signal to
  delete both.
- **D25 (I4)**: two loops over the out-of-flow elements only join the named exceptions to invariant 3.2.6. After a commit that
  changes a child list or a style change that changes a `position` or `zIndex`, every out-of-flow element's paint parent is
  re-examined (`Mounted::settle_paint_structure`); and geometry compares every out-of-flow element on every pass. Evidence:
  an absolute element is located in its containing block, which a change anywhere between the two (a static ancestor
  that moved, a keyed reorder above) can move without a layout flag on the path from the root, so the incremental
  walk, which only visits the children of an ancestor of a dirty node, cannot be relied on for it. The cost is the number
  of out-of-flow elements, not the tree's size.
- **D26 (I4)**: events from inside a `<Portal>` bubble along the native path (the overlay tree up to its top-level node, plan
  3.10 rule 8), not through the React ancestors of the `<Portal>`, which DOM and React DOM would; the plan's native path
  rule decides, and a handler that wants the DOM behaviour passes it through props. Tab stops follow document order,
  main layer first, so a popover's come after every main stop and the main stops are in the order they were
  (verified: the popover opens and Tab from the Menu button visits the stops after it, then the popover's, then wraps).
- **Native rule restored (F4)**: plan 3.3 says hover re-hit-tests "if geometry under the mouse changed";
  F3 re-hit-tested at every flush, which walks the siblings at every level (169 us at 2,000 cells).
  `flush_layout` now re-hit-tests only after something that decides the hit changed: a node's geometry,
  a child list, or an element's overflow (`hit_stale`).
- **D27 (coordinator, parallel tracks)**: independent systems are built in parallel git worktrees under
  `/Users/ben/Development/breaka/godot-react-ui-worktrees/`, each on its own branch with its own notes file in
  `docs/tracks/`; the coordinator rebases each onto main, checks it, fast-forwards main and deletes the worktree.
  Godot-free modules land before the phase that integrates them, behind `#[cfg_attr(not(test), allow(dead_code))]`
  that the integrating phase removes. Landed this way: the text engine (`docs/tracks/text-engine.md`: `text_offsets`,
  `selection`, `text_input`), the scroll and drag core (`docs/tracks/scroll-drag-core.md`: `scroll`, `drag`,
  `src/data-transfer.ts`), the world-space recipe (`docs/tracks/world-space.md`, I11 part 1), and kit part 1
  (`docs/tracks/kit.md`: Checkbox, Switch, RadioGroup, Slider); later also `text-layout.md`, `accessibility.md`,
  `select-anchor.md`, `headless-kit-evaluation.md`, and, as they land, `stock-engine.md`, `text-selection.md`, `text-input.md`,
  `drag-and-drop.md` and `filters.md`. Each notes file is part of this decision log; the
  integrating phases must read the relevant one first. Highlights that change plan text: paste is a request
  followed by `PasteText` so `beforeinput` sees the data; secure inputs treat the whole text as one word; End on a
  soft-wrapped line goes before its last character (no caret affinity); keyboard scroll steps are page/8 for arrows
  and a page for Page keys; leftover scroll chains to the next container within one gesture (no latching yet);
  cancelled drags report `endedOutsideRoot: false`; non-main scenes start through the `SceneLauncher` autoload
  (`?scene=` on Web); the kit Slider nests its thumb in the track and uses percentage `flexGrow`.
- **D28 (coordinator, kit)**: the component kit is hand-built, not adopted from a headless library. Evidence
  (`docs/tracks/headless-kit-evaluation.md`): gluestack UI v5's native components have no keyboard model
  (Checkbox, Radio, Switch and Slider handle keys only in their DOM `.web` variants, confirmed by grep of
  `@gluestack-ui/core@5.0.15`), its Switch and Select wrap platform widgets, and its styling is NativeWind; a
  `react-native` shim or a fork would cost as much as I8 and still leave keyboard, slider drag, Select and styling
  to write. Model: Radix's compound API and the WAI-ARIA APG keyboard tables; `react-stately` is reconsidered when
  Select is built. `role`/`aria-*` are typed JS props from kit part 1 and reach native in I10.
- **D29 (coordinator, at Ben's request)**: no test ever generates real OS input (no osascript, cliclick, CGEvent,
  System Events, cursor warping), and no verifier runs in loops or repeated batches; each runs once when its tier
  needs it, re-run only by D22's interference rule. Windowed runs are allowed; a brief focus change at launch is
  acceptable, minutes of back-to-back windows are not. A deliberate-noise "proof" during Task 0 hijacked Ben's
  machine; its tools were deleted and never entered the repository.

- **D30 (I5)**: which axes scroll, and where the range comes from. An axis scrolls only when its own `overflow` is `scroll` or
  `auto`; the other axis of a scroll container is clipped (the one padding-box clip, as for `hidden`) but does not move, so
  `overflow-y-auto` alone makes a vertical scroller. `auto` and `scroll` behave the same (the bars overlay the content and a bar
  is drawn only while there is something to scroll to). Taffy has no `auto`: both map to `Overflow::Scroll` with the style's
  `scrollbar_width` left at its default of zero, which lays out exactly as `Hidden` (evidence: the Rust test
  `props::tests::scroll_and_auto_overflow_lay_out_like_hidden_and_report_a_scroll_range`, content 150 x 400 in a 100 x 100
  container gives a range of (50, 300) for all three). The range is Taffy's `Layout::scroll_width()` / `scroll_height()`, a
  non-negative magnitude, with the axis' `scrollable_overflow_rect.is_reversed()` flag (`flex-col-reverse` gives a negative
  range, `props::tests::a_column_reverse_scroll_container_reports_a_reversed_vertical_range`). The ranges are part of a node's
  stored geometry, so any visit that sees them change re-clamps the offset and redraws the bars; a re-clamp that moves the
  content is a scroll like any other (it queues a `scroll` event).
- **D31 (I5)**: scrolling is a paint-tree property. A scroll container's paint children (its children, plus the out-of-flow
  descendants it is the containing block of, D23) attach to a `scroll` item under its `content` item whose transform is
  minus the offset; hit testing adds the offset when it descends and `absolute_geometry` subtracts it (the snapshot's rects,
  `getRect()`, the focus ring and clicks all follow). An absolute element therefore scrolls with a positioned scroller that
  is its containing block and not with a static one in between (`stacking::tests::an_absolute_box_scrolls_with_a_positioned_scroller...`).
  The scroll and overlay items exist only while the node is a scroll container (`RenderNode::make_scroller`); the paint
  children are re-attached when it becomes or stops being one. Input reachability is a separate question from where
  something is drawn: Tab stops, `autoFocus` and "does focus survive a layout" ask `ScrollMode::Reachable`
  (`stacking::absolute_geometry`), which ignores scroll offsets and the clips of scroll containers (and the viewport) from the
  outermost scroller inwards, as long as that scroller is itself in view. With the drawn rectangle, Tab skipped every button
  scrolled out of its list, and a focused button lost focus when it scrolled out of view.
- **D32 (I5)**: how scroll input is taken. Wheel and pan gestures *chain event by event* (no latching): the containers on the
  paint path from the element under the pointer, innermost first, each take what they can and the remainder spills to the next
  (`scroll::scroll_chain`); a container with nothing to scroll on either axis is not on the path at all (it neither moves nor,
  whatever its `overscroll-behavior`, keeps the scroll from the container behind it). The event is consumed when a container
  moved **or a `contain` container kept what it could not take**, so a contained scroll reaches neither the outer container nor
  the game; with nothing able to take it the event goes on to `_unhandled_input` (plan 3.11). The wheel's `factor` is
  normalised with `scroll::wheel_factor` before `pointer::wheel_ticks`. Shift swaps the wheel's axes, not a pan gesture's.
  Keys scroll only from the focused element (with none, keys are the game's): the first container on its path that the key
  moves takes it (a container at its limit hands the key outwards), Space on a focused enabled `Button` presses it rather than
  scrolling, a chord with Ctrl, Alt or Meta never scrolls, and a key that moved nothing is not consumed. Keyboard focus
  from Tab, `focus()` and `autoFocus` scrolls the element into view (`reveal_node`, the least scrolling of each container,
  innermost first); focus from a press does not. `TextInput` (I7) must be excluded from key scrolling when it exists.
- **D33 (I5)**: touch pans. The arbitration of plan 3.12 rule 4 runs once, at the first movement beyond `TOUCH_SLOP_PX`
  (`pan::PanGesture`, which wraps `scroll::pan_owner`), after an un-prevented primary `pointerdown`; a touch that is declined
  stays pointer events until it lifts, and one that pans **latches** to its owner (what the owner cannot take is dropped; it
  does not chain mid-gesture), cancels the pointer (`pointercancel`, no `click`), and applies the finger's movement from where
  the slop was crossed (the slop itself is not scrolled, as Android and Chrome do). A container with `overscroll-behavior:
  contain` ends the candidate path and owns a pan it cannot move, so the container behind it stays put. A press that explicitly
  captured the pointer, or whose `pointerdown` was prevented, is not a pan (the kit Slider does both and says `touch-none`).
  The release velocity is sampled while the finger is down and the content coasts after it lifts, per `ScrollContainer`'s
  deceleration; a new touch stops every coasting container, and that touch does not click (a tap that stops a fling does not
  in browsers). Evidence: `verify:interaction --only=scroll` (the touch part) and the Web touch page.
- **D34 (I5)**: scrollbars. Overlay thumbs live in an `overlay` item under the box item, drawn after the content and not
  scrolled. Only a thumb takes a pointer (hit before the content it covers); the track is not a hit area, so page-by-click is
  not implemented (the plan asks for thumb dragging only). A primary press on a thumb, after an un-prevented `pointerdown`
  (which still reaches JS with the container as target), starts a drag that moves the content one to one with the pointer
  (`scroll::ThumbDrag`) wherever the pointer goes; the drag ends with the button's release (which does not click), a pointer
  cancel, or the container going away. It does not read the motion's button mask, which synthetic input need not set (the
  first verifier run failed on exactly that: the verifier's motion events carry no mask).
- **D35 (I5)**: one `process()` decision. `update_process()` (motion.rs) is the only place that turns processing on or off: native
  motion is running, a flick is coasting, or a finger is panning (its release velocity is sampled per frame), and the root is
  in the tree. `pause_process()` is the one exception, for `EXIT_TREE` (`is_inside_tree()` is still true while that notification
  is delivered, so the decision cannot be made then). `process()` ticks motion only if motion is active and scrolling only if it
  wants frames, so a flick neither advances the animation clock nor counts an animation frame.
- **D36 (I5)**: JS surface. `scroll` is not cancelable, does not bubble and has no capture handler (`onScroll`); native
  coalesces the pending `scroll` of one container into one event (`EventQueue::push_scroll`). The handle gets
  `scrollTo({left?, top?})` (an omitted axis keeps its offset, read from `getScrollState()`), `scrollBy`, `scrollIntoView()` and
  `getScrollState()`; scrolling a node that is not a scroll container is an error that says so (as `focus()`, D19e: a scroll that
  does nothing would hide a bug), `scrollIntoView` on any mounted element is fine. `getScrollState()` also reports the range of
  each offset and where the thumbs are drawn, and the snapshot carries the same per node (`scroll`). The kit `ScrollView` is
  an outer scroll container and an inner content element that cannot shrink and grows into a short view (React Native's content
  container); it is a tab stop by default (`focusable={false}` turns that off) so keyboard users can scroll it; `horizontal`
  chooses the axis; `className` takes `overscroll-contain`, `scrollbar-none` and `scrollbar-[#hex]`. The kit Slider's root says
  `touch-none`. The Interaction tab's body is a `ScrollView` (its content fits at the verifier sizes, so no bar shows).
- **D37 (I5)**: platform facts for the Web gate. Godot's Web build turns a DOM wheel delta of `d` CSS pixels into `0.03 * d` ticks
  (`DisplayServerWeb::_mouse_wheel_callback`, `MOUSE_WHEEL_PIXEL_FACTOR`, `platform/web/display_server_web.cpp:681`), so a notch of 100 pixels
  scrolls three ticks of page / 8. The Web verifier scrolls with real Chrome input through CDP (`Input.dispatchMouseEvent`
  and, on the touch page, `Input.dispatchTouchEvent`) at both device pixel ratios; a CDP wheel notch of 100 arrives as `deltaY` 100 at ratio 1
  and 50 at ratio 2 (measured; Chrome divides the physical delta by the ratio), so it computes the ticks from the ratio. Chrome reports mouse
  positions in whole CSS pixels, so the thumb drag uses whole pixels. A flick is only a flick if the finger is still moving when it
  lifts (`MOMENTUM_SAMPLE_INTERVAL_S`: a finger that rested for over 0.1 s flings nothing), so the verifier releases right after the last move.
  The geometry checks of both verifiers skip what a scroll container holds (it reaches past the container and the window by design); they
  still check the container and its siblings. Found on the way: the Web export had been failing since Task 0 added `demo/src/verifier-input.ts`
  without an entry point of its own (`failed to include module: res://.godot/GodotJS/src/verifier-input.js`); `scripts/build.mjs` builds it now.
- **D38 (I5 on I10)**: scroll accessibility. A scroll container whose `role` is unset is exposed as `SCROLL_VIEW` and exposes its
  children (an explicit `role` wins and still carries the scroll state; `role="none"` or `presentation` still keeps it out), whether or not it
  has anything to scroll right now (Godot's `ScrollContainer` is always one). Each axis that can move reports its position and its
  range (`update_set_scroll_x/y` and `_range`; a reversed axis has a negative `min`, as `scrollTop` does), an axis that cannot move reports
  nothing, and the actions follow what can move: `SCROLL_UP` and `SCROLL_DOWN` with a vertical range, `SCROLL_LEFT` and `SCROLL_RIGHT`
  with a horizontal one, `SET_SCROLL_OFFSET` with either, and `SCROLL_INTO_VIEW` on every exposed element that has a scrollable
  container in its paint chain (the chain `reveal_node` walks, so an `absolute` child counts as inside its positioned scroller).
  Native performs them through `scroll_by_checked`, `scroll_to_checked` and `scroll_into_view_checked`, not JS (scrolling is native, as the
  wheel is): a scroll by an item or a page moves the distance the arrow and Page keys do (`assistive_scroll_delta`: client size / `SCROLL_PAGE_DIVISOR`,
  or the client size, which is also what `ScrollContainer`'s own actions do), a request with no unit is an item (the engine's
  reading of an absent enum), a unit that is neither is logged and does nothing, and the request's scroll hint is not used (the
  least scrolling that shows the element is `block: nearest`). A set-scroll-offset takes the `Vector2` as `scrollTo(left, top)`, clamped.
  Codes 6 to 11 of `AxAction`. `scroll_changed` asks for an accessibility update (it asks nothing while accessibility is off), and
  layout already does after every pass, which covers a range that changed. **Not done, on purpose:** `ItemList`'s transform on a
  content element. Here every element's bounds are root-local and follow the scroll (`absolute_geometry`), so scrolling re-sets every
  exposed descendant while a screen reader is attached, instead of one element; a transform would need an element of the registry that no
  tag owns, and bounds the registry compares exactly could then change by a rounding error per scroll (`P - offset + offset`). It is the
  optimisation to make if a long list under VoiceOver shows churn. Verified: 7 unit tests; `verify:a11y`'s Godot-side half drives all six
  actions through the bound callables on a scroll view in the lab. The platform tree (`AXScrollArea`, the values) was not read: Godot48
  has no AccessKit, so the run ends "not verified", as before.
- **D39 (I8 on I5)**: the Select list scrolls. `placePopover` returns `maxHeight`, the room on the side it chose (never negative), and
  `Select.Content` is `overflow-y-auto overscroll-contain` with that `maxHeight`, items `shrink-0` (a flex item would shrink to fit and
  nothing would scroll). The height placement is given is the list's own, not the capped box: `box.height - clientHeight + scrollHeight`
  from `getScrollState()` (a list that is not a scroll container, because the caller turned `overflow` off, is as tall as its box), so
  the side and the cap are right again when the trigger moves after an earlier cap. The first pass has no cap, the second sets it, and
  neither draws. Keys that move focus need nothing new: `focus()` already brings the element into view (`focus_element` calls
  `reveal_node`), by the least scrolling, so the first and last items are shown flush with the edge and their padding is not
  scrolled in. Native sends a thumb drag only for a `pointerdown` that was not prevented (D34), and the list prevents the presses that are
  its padding's (so they keep focus in it), so a press on the thumb has to be told apart: `isOnThumb` reads the thumb rectangles from
  `getScrollState()`, and a press there is left alone (it focuses the list, which has `tabIndex -1`, and drags). A real defect the verifier found: the item took
  focus on `pointerenter`, and a key that scrolled the list moved items under a pointer that rested on it, so the item under it took
  focus from the one the keys had just chosen (Home went to item 1, the list scrolled to the top, item 8 was now under the pointer
  and kept the focus). Items take focus on `pointermove` instead (mouse and pen; a finger dragging the list is not choosing),
  as Radix does. Known and left: moving the pointer over an item that is cut by the edge focuses it, and that scrolls it into view
  (`focus()` has no `preventScroll`). `Select.Content` takes `className` for a smaller cap or another look as before.
- **D40 (coordinator, filters)**: Ben asked for `filter` and, above all, `backdrop-filter` with blur, because frosted glass is a common
  UI effect (Phase V1). Both are built from engine primitives through `RenderingServer` from the GDExtension: no engine change, no
  per-element `SubViewport`. Engine evidence, identical in `renderer_rd/renderer_canvas_render_rd.cpp:762-892` and
  `drivers/gles3/rasterizer_canvas_gles3.cpp:414-541`, that shapes the design:
  (a) A material with `hint_screen_texture` copies the back buffer only once per canvas pass, then reuses it, so a second frosted panel
  would not see the first. Each backdrop needs an explicit `canvas_item_set_copy_to_backbuffer`.
  (b) An explicit copy on the same item as a mipmap-reading material does not regenerate the mipmaps once they have been generated in
  that pass (`backbuffer_gen_mipmaps` stays false at line 783), so that panel would get a fresh level 0 and stale blur levels. A
  separate copy item, drawn just before the item with the material, clears the cached flag and forces regeneration for that rectangle.
  (c) The renderer passes `copy_back_buffer->rect` straight to the copy as render-target pixels; the `screen_rect` the culler computes
  (`renderer_canvas_cull.cpp:194`) is not used. So the rectangle must be in render-target pixels and be kept current.
  (d) Mipmap generation covers only that region (`gaussian_blur` over the region, halved per level), so the rectangle must include the
  blur's reach or edges read stale pixels. An item with a copy is attached even when off screen (`renderer_canvas_cull.cpp:260`); a
  rectangle outside the target returns early, so a correct rectangle also keeps off-screen panels free.
  (e) Canvas groups do not nest and screen reads inside one are ignored: the back-buffer logic is gated on
  `canvas_group_owner == nullptr`, and the first group clears the whole back buffer. A `filter` inside a `filter`, or a
  `backdrop-filter` inside a `filter`, cannot work this way; each must produce an explicit error, never a silent no-op.
  (f) An item in canvas group mode draws its children first and then composites (`renderer_canvas_cull.cpp:480-487`), and a box item
  draws its own commands before its children unless they are `behind`, so the backdrop must be behind the box's background and the
  group must be a wrapper around the box. The agent's decisions and measurements are in `docs/tracks/filters.md`.
- **D41 (I6)**: text selection. Decisions S1 to S18 are in `docs/tracks/text-selection.md`, which is part of this log. Those that bind later
  phases: arbitration is thumb, then (I9) a draggable, then selection, and a press that is not prevented and starts no selection clears
  the current one (S2); the root keeps key focus while a selection exists, even a collapsed one, and JS `clearSelection()` does not
  release it (S3); `InputMap` matches a key to an action only on the same device, so a verifier testing a `ui_*` action needs
  `bindVerifierKeys` from `demo/src/verifier-input.ts` (S11); the root event is `DocumentSelectionChange`, wire name `selectionchange`
  with target 0, so `SelectionChange` stays free for I7's element event (S8). Coordinator check after rebasing onto I5: unit, lint and
  type gates, plus the `selection` and `inputs` verifier sections.
- **D42 (coordinator, stock engine)**: every build, run and verify script takes `--engine=stock` or `GODOT_REACT_ENGINE=stock`; `breaka` stays
  the default and the tracked typings stay Breaka's. Stock is Godot 4.7.2 with upstream GodotJS and AccessKit, under
  `/Users/ben/Development/godot-stock/`, and Breaka's engine, templates and binaries are never touched. The evidence, decisions and engine
  differences are in `docs/tracks/stock-engine.md`. Facts that bind later work: the real macOS tree is now read by `verify:a11y --engine=stock`,
  and the input-isolation window flags empty that tree, so the accessibility lab does not set them. On macOS the adapter ignores the scroll
  properties D38 sets, so VoiceOver reads a scroll view's contents but not its position; a stock `ScrollContainer` conveys position
  through a child `AXScrollBar`. So each scrollable axis gets a scroll bar element (`SCROLL_BAR`, value and range, `Increment`/`Decrement`
  mapped to `scroll_by`), built after I7 because both change the accessibility code. Group and radio-group roles and a mixed checkbox
  are gaps in the engine's API, reported as `GODOT_REACT_A11Y_GAP`. Stock's debug Web template needs `use_closure_compiler=no`.
- **D43 (I9)**: drag and drop. Decisions I9-1 to I9-16 are in `docs/tracks/drag-and-drop.md`, which is part of this log. Those that change plan
  text: the touch hold starts a drag from `process()` because a held finger sends no input, the one exception to 3.10 rule 1 (I9-2); a scroll
  under a stationary pointer is looked at again on the next frame, so a JS `scrollTo` never emits cancelable events (I9-3); Escape arrives
  through `input()`, enabled only during a drag, because the root usually has no key focus then (I9-4); the ghost is a copy tree taken
  before `dragstart` handlers run (I9-6); a prevented `dragover` or `drop` with no `dropEffect` is rejected in `resolve_event` (I9-8); text
  inside a draggable starts no selection, and a press there that never becomes a drag clicks and clears the current selection (I9-15).
- **D44 (I7)**: `TextInput`. Decisions T1 to T27 are in `docs/tracks/text-input.md`, which is part of this log. Those that change plan text or
  bind later work: one `selectionchange` wire name with two shapes, told apart by target 0 (T1); key actions match across devices in
  the product, so a verifier's own device reaches them (T3); the engine's IME start drops the last queued raw key (T7); a triple click
  selects all of a text area, `LineEdit`'s rule, not a line (T14); no `aria-labelledby` or `aria-describedby`, because native rejects
  unknown props, so `TextField` sets `aria-label` and `aria-description` (T15); a `TextInput` is always a text field, its `role` can only
  remove it from the tree, and its text is line elements, as `LineEdit` and `TextEdit` do (T17, T18); a text input keeps its press inside
  any draggable (T23); the ghost shows its text and no caret (T24); its own press runs only when no thumb was grabbed (T25). Web paste:
  `clipboard_get()` on Web returns what the previous call read and the engine prevents every keydown, so no `paste` event fires; the root
  reads `navigator.clipboard.readText()` through `JavaScriptBridge` and pastes when the browser answers. The engine is unchanged, so
  anything else calling `clipboard_get` on Web is still stale. Known limit: the IME window is misplaced for a root on a world-space quad.
- **D45 (HiDPI)**: decisions H1 to H7 and the evidence are in `docs/tracks/hidpi.md`, which is part of this log. The rule is the viewport's own
  `get_oversampling()` and nothing else, as Godot's controls do: a window's viewport already equals its content scale, and taking the window
  term as well drew a 1x `SubViewport` at 2x. The level is read once per paint pass and on `DRAW`, because the engine queues a redraw for
  every canvas item when a viewport's oversampling changes, so a scale change with no commit repaints and idle frames still record nothing.
  Rounded `StyleBoxFlat` draws use a one-device-pixel feather. Anything new that paints text must be listed in
  `MountedNode::paints_at_oversampling`, and any rounded `StyleBoxFlat` draw must carry an `Oversampling` in its key and set
  `oversampling.feather()`. World panels render at the window's pixels per logical pixel, which closes W9. The native demo window stays at
  oversampling 1 on Retina, because setting `contentScaleFactor` would shrink every verifier window; the README tells an owner what to set.
  Known limits: glyph caches at levels no viewport owns are not freed, about 20 MiB after levels 1, 2 and 3; layout and borders round to whole
  logical pixels; the drag ghost does not follow a scale change mid-drag.
- **D46 (verifier integrity)**: from an independent review; decisions and evidence are in `docs/tracks/verifier-integrity.md`, part of this log.
  D22 is narrowed: a failed window is re-run only if a disturbance that can reach the system under test came within 5 s before the failure
  on the verifier's own clock. A `window-focus-loss` counts only with a press in flight, a foreign event only if it is a mouse event, and
  a run that never reported is a real failure. A pass after a retry says so, with the first failure's text. `--no-retry` is for negative
  controls. Verifiers use an in-memory clipboard (`native/clipboard.rs`, `verifierClipboard`; on Web a page-memory `navigator.clipboard`), so a
  run cannot overwrite what the person using the machine copied; no file under `demo/src` may call `DisplayServer.clipboard*`. Web verifiers
  serve the export themselves on a free port, or require a given URL to serve every receipt file byte for byte. The Web receipt digests the
  pack, shell and templates. The library is rechecked before every launch. `--only` and headless runs are labelled partial in the
  marker and summary, and a section with no assertions fails. `scripts/editor-session.mjs` removes TypeScript from Godot's saved open
  scripts before every automated editor launch, because the script editor converts indentation when it saves a file it has open (reproduced).
  New sections go in `SECTIONS` and use `verifierClipboard`. Agents log inside their own worktree, not the shared scratch folder.
- **D47 (I10, scroll bars)**: decisions SB1 to SB9 and the real tree against stock controls are in `docs/tracks/scroll-bars.md`, part of this log. Each
  scrollable axis of an exposed scroll container, whatever its role and including a multi-line text input, has a scroll bar element in the
  container's registry slot, keyed by (tag, axis), after the content with horizontal first, as in the stock readings. Value and range are
  reachable offsets, not Godot's content-size convention, and orientation is set while a name is not. `Increment` and `Decrement` use the arrow-key
  step through `scroll_by_checked`, by way of `_on_accessibility_scroll_bar_action`. Not verified: VoiceOver by hand, and in the real tree a
  reversed axis and `scrollbar-width: none`.
- **D48 (`TextInput` fixes)**: from an independent review; decisions and evidence are in `docs/tracks/text-input-fixes.md`, part of this log. An empty paste is
  no paste. An unfinished composition commits on blur through `beforeinput`, one frame later; a click inside a composing field still cancels it. The
  Web soft keyboard's hidden element is written by the root through `JavaScriptBridge`, because the engine sets it once and every key sends its
  whole value back as `_set_text`; its selection is not written while the engine's Right presses are pending (a real race: "312"). Line separators are
  line breaks. Two caret limits are the engine's design and stay: summed Right presses from two keys in one frame, and the caret after JS puts an edit back
  mid-text. **Engine bug, not fixed here**: after a Web composition ended by a focus move, `ime_started` stays set and raw keys are dropped until one more
  composition commits; the fix belongs in the engine. `setTextAndSelection` clears undo and a length-changing transform moves the caret to the end, as
  browsers with React do; the README says so.
- **D49 (V1, filters and frosted glass)**: built as D40 designed; the evidence, blur calibration, GPU cost and limits are in `docs/tracks/filters.md`, part of this log. A
  backdrop is a copy item plus a draw item behind the box; a filter is a canvas group with its own rectangle; a tree with no filters creates no items, materials or
  shaders. Limits: a filter or backdrop inside a filter logs one `ERROR` and that inner effect is skipped; one `drop-shadow` per list, with no blur after it, none on
  `backdropFilter`; colour functions compose with no clamp between them; a blur is capped by the target's mip levels (49.5 px at 600x900); an ancestor's clip fades a
  group's blur at its edge; blur near the render target's edge re-reads the edge texels; a root in a `SubViewport` sees only that viewport; a rotated root blurs by its
  mean scale; a drag ghost shows a filtered source unfiltered. Cost on an M1 Max at 1120x800: about 0.2 to 1.6 ms a panel on Compatibility, 1.2 to 1.9 ms on Mobile.
  First use compiles the shader (about 50 ms on Compatibility, up to 1 s on Mobile with a cold cache); the notes give a warm-up recipe, and nothing runs it automatically.
  `src/styles.ts` also gained colour opacity modifiers (`bg-white/20`) on all 22 palette colours. Known missing utilities: `shadow-*`, font weights, `leading-*`,
  `tracking-*`, gradients, `border-b`, `ring`, `ml-auto`, `transition-*` classes, plus `sticky` and `scale-*`, which 2.3 excludes.
- **D50 (input fixes)**: from an independent review; per-finding detail is in `docs/tracks/input-fixes.md`, part of this log. **Replaces D15(b)**: a `click` goes to the
  nearest common inclusive ancestor of the press and release targets, mouse and touch alike, as the UI Events spec and browsers do; two parts of one enabled button
  still click the button; a release on a disabled element or over nothing clicks nothing. A touch pan and a thumb drag now honour JS capture, as 3.12 rule 1 and D33
  say. Key focus is released whenever no element or selection needs it, including when a commit removes the focused element. The hover stays frozen for a whole drag.

The plan is written so an implementer can execute it phase by phase without re-deciding the
architecture. Where it says **must**, it is a contract. Where it says *suggested*, use judgement and
record what you chose.

---

## 0. Read this first

### 0.1 How to execute this plan

1. Read sections 0–4 in full before touching code. Section 5 holds the phases; do them **in order**.
2. Before each phase, read every file listed under that phase's **Files** in full in the current
   session. The Files list is the expected set; if a task genuinely needs another file (a build
   entry point, a shared test helper), touch it and record why in the progress log.
3. Work one task at a time. After each task, run that task's tests. After each phase, run the phase
   **Gate**, which means the phase-done tier of 0.4.1 (D20), not every verifier. Do not start the next
   phase until the gate passes.
4. Record every phase gate in `docs/INTERACTION_PROGRESS.md`: commands run, pass/fail counts,
   artifact paths you inspected, measurements, anything you chose that this plan left open.
5. Commit at the end of each phase (optionally after each passing task) in the `godot-react-ui`
   repository. Never push.

### 0.2 Stop-and-report conditions

**Decide, document, continue.** When this plan is wrong, incomplete or contradicted by evidence (an
API that differs from what is written, a measured gate that fails, a semantic choice the plan does not
make), gather the evidence, choose the option the evidence supports that stays within section 3's
invariants, record it in the decision log at the top of this file and in
`docs/INTERACTION_PROGRESS.md` (what you found, what you chose, why), fix the plan text it affects, and
keep going. Do not wait for approval.

Stop and report only when:

- every option you can see would break a section 3 invariant or an AGENTS.md hard rule (push, deploy,
  production data, sandbox-protected files);
- a gate still fails after two root-cause fixes and you have no further evidence-backed hypothesis;
- a change would require editing generated output (`dist/`, `target/`, `demo/.godot/`, `artifacts/`).

### 0.3 Rules that apply to every task

These come from `../AGENTS.md` (the breaka-platform root). Read that file once; the rules most
relevant here are:

- **Root cause first.** Reproduce, gather evidence (logs, PNGs, snapshots, debugger), then change
  behaviour. No speculative fixes, no guards that hide bugs, no swallowed errors.
- **Type safety.** No `as any`, no `as unknown as T`, no unproven `as T`, no non-null `!` in
  TypeScript. In Rust, never `unwrap()` data that came from JS or Godot; return an error the way the
  API in section 4 says. `expect("…")` is only for invariants this code itself established, with a
  message that states the invariant.
- **Exhaustiveness.** Rust `match` on protocol enums must not use `_ =>` arms. TypeScript switches
  over unions must be exhaustive through the function's return type. (`@breaka/core` is not a
  dependency of this repository; do not add it.)
- **No magic numbers.** Every tuning value gets a named `const` next to its use with a comment saying
  where the value came from. Appendix A lists the constants this plan introduces.
- **Godot launches** always use `GODOT=/Applications/Godot48.app/Contents/MacOS/Godot` and pass
  `--audio-driver Dummy`. Visual Godot runs started from a sandboxed shell can abort in AppKit with
  exit 134; rerun with host permissions, it is not a project bug.
- **Generated files.** After adding or changing any `#[func]`, `#[signal]` or class, rebuild native
  and regenerate typings, and commit the regenerated `demo/typings/*.d.ts` and `demo/gen/**` with
  `.uid` files. `pnpm gen:types` runs `pnpm build` (which typechecks) first, so it cannot pass while
  TypeScript already uses the new API. In that case run the Godot step directly after
  `pnpm build:native`: `$GODOT --headless --audio-driver Dummy --editor --generate-types --path demo`.
- **Do not rewrite working code** that this plan does not ask you to change. The motion behaviour
  (transitions, intrinsic `0 ↔ auto` sizing) must keep passing `pnpm verify:motion` and
  `pnpm verify:motion:web` with unchanged assertions, even though Phase F3 moves the code that drives it.
- **Inspect the PNGs** a verifier writes when a phase changes anything visual. Assertions alone are not
  acceptance. Compare settled captures, not mid-transition ones: mid-transition captures differ
  between two runs of the same binary.
- **Processes.** Never stop a process you did not start. Before verifiers, check memory pressure
  (`memory_pressure | tail -1`, `sysctl vm.swapusage`); a starved host makes verifiers time out.
- **Commits:** plain subject and body, no AI attribution or co-author trailers. Stage specific files;
  check `git diff --cached --name-only` before every commit. Never commit `artifacts/`.

### 0.4 Commands

Run from `godot-react-ui/`:

```sh
export GODOT=/Applications/Godot48.app/Contents/MacOS/Godot
export PATH="$HOME/.cargo/bin:$PATH"  # rustup first: Homebrew's rustc on PATH aborts in dyld
pnpm test:types                      # TypeScript typecheck
pnpm test                            # TypeScript unit tests (tsx --test)
cargo test --locked                  # Rust unit tests
cargo clippy --locked --all-targets  # baseline: 0 warnings
pnpm build:native                    # release extension into demo/addons/godot-react-ui/bin (atomic replace)
pnpm gen:types                       # regenerate GodotJS typings (see 0.3 for the chicken-and-egg case)
pnpm build                           # typecheck + bundle (verify scripts also run this)
pnpm verify                          # native baseline workflow, 2 viewports
pnpm verify:motion                   # native motion workflow, 2 viewports
pnpm verify:interaction              # native interaction workflow (Phase 1 onwards)
```

Web (see `docs/WEB.md` for toolchain requirements). Serve on a port you have checked is free and
point every Web verifier at it; the verifiers will happily test a stale server:

```sh
pnpm build:web
lsof -nP -iTCP:8097 -sTCP:LISTEN                            # must print nothing
PORT=8097 pnpm demo:web                                     # in the background
GODOT_REACT_WEB_URL=http://127.0.0.1:8097 pnpm verify:web   # same variable for every Web verifier
GODOT_REACT_WEB_URL=http://127.0.0.1:8097 pnpm verify:motion:web
GODOT_REACT_WEB_URL=http://127.0.0.1:8097 pnpm verify:interaction:web
```

Stop your server when the Web run (0.4.1) is done. Bound every wait and check the process and its log if
something stalls. `artifacts/web-verification/failure.png` is never cleared by the verifier; judge a
run by its report and log.

#### 0.4.1 Verification tiers (D20)

Running every native and Web verifier for every phase is the main cost of the work, so use the narrowest
tier that proves what you changed (AGENTS.md: prefer the narrowest check while iterating, run the broader
suites before calling work done):

- **While iterating**: only the affected unit tests (`cargo test <module or test name>`,
  `pnpm exec tsx --test tests/<file>.test.ts`) and `pnpm test:types`.
- **When a task is done**: `pnpm build:native` if native changed, then `pnpm build`; then the new or
  changed verifier sections natively, in one viewport (landscape) unless the change depends on the
  viewport. If `verify:interaction` cannot run one section yet, add a section filter (for example
  `--only=<name>`, passed through `scripts/verify.mjs`, and the same flag in `verify-interaction-web.mjs`).
- **When a phase is done, before its commit** (this is what a phase's **Gate** means, "native gate"):
  `cargo test`, `pnpm test`, `pnpm test:types`, Clippy; `pnpm verify:interaction` (every section, both
  viewports) and `pnpm verify`. `pnpm verify:motion` only if the phase touched `motion.rs`,
  `style_engine.rs`, `computed_style.rs`, the layout or geometry code in `mount.rs`, or `render_tree.rs`.
  **Web only if the phase changed Web-specific behaviour** (touch, DPR, IME or virtual keyboard,
  clipboard, browser input): then `pnpm build:web` and `verify:interaction:web` alone ("Web gate").
- **End of each batch** (after I3, then every two or three phases) **and before final acceptance**: the
  full regression run, `pnpm build:web` and all six verifiers (`verify`, `verify:motion`,
  `verify:interaction`, `verify:web`, `verify:motion:web`, `verify:interaction:web`).

Baselines: at `7f0a96c`, `cargo test` 19, `pnpm test` 13, Clippy 0 warnings, `verify:web` 249
assertions, `verify:motion:web` 433 assertions (`docs/INTERACTION_PROGRESS.md`).

---

## 1. Where the code is today

One Godot `Control`, `ReactUiRoot`, owns the whole React tree; React elements are not Godot nodes.

**Commit path (what v2 replaces).** `src/renderer.ts` is a mutation-mode `react-reconciler` host.
On every commit its `flush()` walks the **entire** JS host tree, re-resolves every node's class names,
`JSON.stringify`s every node's style to diff it against a `committed` map, and sends one JSON batch
(`create`, `style` with the full resolved style, `text`, `children` with full child lists, `remove`)
through `applyBatch`. `flush()` also runs after every frame that delivered input events, because
`hover:`/`active:`/`focus:` variants and inheritance are resolved in JS. Native `apply_batch`
(`native/lib.rs`) clones the whole `Model` to validate the batch, then `sync_model` loops over every
node rebuilding Taffy styles to compare them, re-syncs the whole Stylo document, and `draw()`
re-records every element's canvas items on any redraw.

Measured (existing Web benchmark, DPR 1, 2,000 boxes, every cell updated, median per update):

| Stage | Time |
| --- | --- |
| JS style diff (full tree walk) | 1.2 ms |
| JSON encode | 0.2 ms |
| Native JSON parse | 3.9 ms |
| Native model clone + validate | 1.0 ms |
| Native sync (paint resources, Taffy styles, Stylo pass) | 17 ms |
| Native draw (re-records every element; 244 of 2,003 visible) | 17 ms |
| React reconcile total | 45 ms |

JSON is not the main cost; whole-tree work on both sides is. At 50 nodes the flush is about 1.2 ms.
A one-node change in a large tree still pays the full-tree walks on both sides (by code inspection;
Phase F0 measures it).

**Input.** Phase 1 (uncommitted) adds synchronous event dispatch: native queues events and emits an
`events_ready` signal from inside `gui_input`; JS drains, dispatches capture/bubble with
`preventDefault`, and resolves cancelable events before the signal returns. Measured JS time per
synchronous dispatch is about 1–3 ms p95 on native macOS (up to 3.04 ms for a handler that sets
state; Phase 1 gate run).

The README's "Current limits" section lists the remaining feature gaps (scrolling, text input,
selection, drag and drop, accessibility, positioning).

---

## 2. Scope

### 2.1 Goals — part A: Fabric core

1. **Commit cost proportional to what changed.** No JS or native step walks the whole tree on a
   commit. React clones only changed host nodes; native diffs only changed subtrees (shared subtrees
   are skipped by pointer identity); the mounting layer updates only touched nodes.
2. **No React work for visual state.** Hover, active, focus, focus-visible, focus-within, disabled
   variants and responsive breakpoints are resolved natively. Moving the mouse over 2,000 nodes or
   resizing across a breakpoint causes zero React commits and zero JS→native prop calls.
3. **Incremental paint.** Each element owns retained canvas items in a hierarchy that mirrors the
   view tree. A move updates a transform; only elements whose own visuals or size changed re-record
   commands. Scrolling updates one transform.
4. **One GDExtension call per commit carrying only what changed.** Render makes no native calls. At
   commit, `commit(layer, payload)` (exposed to JS automatically by GodotJS) receives the created
   nodes, the per-node prop diffs and the changed child lists, and nothing else (decision D2).
5. **No regressions.** Every existing verifier passes with unchanged assertions.

### 2.2 Goals — part B: interaction

1. **Godot-cooperative events.** Empty or `pointer-events: none` UI regions let pointer events
   through to Godot `Control`s underneath and to `_unhandled_input`. Keyboard input belongs to the
   game unless a React element has focus. Unconsumed wheel events reach the game.
2. **HTML-like event semantics.** Capture and bubble, `stopPropagation()`, `preventDefault()` that
   cancels native default actions and tells Godot the event was handled; pointer ids, types, buttons,
   modifiers; DOM `key`/`code`.
3. **Touch** as first-class pointers without double handling from Godot's touch-to-mouse emulation.
4. **Focus**: `tabIndex`, `autoFocus`, `focus()`/`blur()`, `:focus-visible`, focus traps in JS.
5. **Positioning and overlays**: `position` (`relative|absolute|fixed`), insets, `zIndex`, an
   overlay layer for popovers and dialogs.
6. **Scroll containers**: per-axis `overflow: scroll|auto`, wheel/trackpad/touch/keyboard scrolling,
   chaining, overlay scrollbars, `onScroll`, programmatic scrolling, scroll-into-view.
7. **Text selection** with `user-select: text`, opt-in.
8. **Text input**: `<TextInput>` single and multi-line, owned natively, with caret, selection, IME,
   Web/mobile virtual keyboard, clipboard, undo/redo, React Native's controlled-input protocol.
9. **Component kit** from primitives: Checkbox, Switch, RadioGroup, Slider, Select, TextField,
   ScrollView.
10. **HTML-style drag and drop** inside a root, with a usable result when a drag ends outside the UI.
11. **Accessibility** through Godot's `AccessibilityServer` sub-elements.
12. **World-space UI**: a verified recipe for a root inside a `SubViewport` on a 3D quad.
13. **Filters and frosted glass**: `filter` and `backdrop-filter` with blur and the CSS colour functions (Phase V1, D40).

### 2.3 Non-goals

Write these into the README limits when the plan is complete; do not half-implement them:

- A JSI-style binding that bypasses GodotJS's ordinary method marshalling. Revisit only if Phase F4
  measurements show the GDExtension call boundary is the bottleneck.
- Child Godot `Control`s per element, including `LineEdit`/`TextEdit` (see 3.2).
- A custom engine module. If a Web engine bug is proven, fix it in `~/Development/godot/platform/web`,
  not with an export-time patch, and only after reporting it.
- Godot drag-and-drop interop with other `Control`s (3.19 explains why).
- Raw text outside `<Text>` (React Native's rule), rich/nested text runs, `contenteditable`.
- CSS stacking contexts: `zIndex` orders siblings, as in React Native (3.15).
- Touch text-selection handles, long-press menus, native context menus, spellcheck.
- Animated programmatic scrolling, overscroll bounce, `position: sticky`, transforms, rounded clip
  masks, native list virtualization.
- Pen-specific pointer data (pen input is reported as `mouse`).

---

## 3. Architecture

### 3.1 Fabric mapping

| React Native Fabric | godot-react-ui v2 |
| --- | --- |
| Reconciler in persistent mode | `react-reconciler` 0.33 with `supportsPersistence: true`, `supportsMutation: false` |
| JSI host object owning a `ShadowNode::Shared` | a frozen JS `Instance` object (decision D2). Instances are immutable once React completes them and share unchanged children by reference; JS GC reclaims them with no native memory attached |
| `UIManager.createNode` / `cloneNodeWithNewProps` / `cloneNodeWithNewChildren(AndProps)` / `appendChild` during render | pure JS in the host config: no native call during render, so abandoned concurrent renders cost nothing natively |
| `createChildSet` / `appendChildToSet` / `completeRoot(rootTag, childSet)` | a JS array of instances, then one `commit(layer, payload_json)` call |
| `RawProps` (a JSI object) parsed into typed C++ `Props` | a JSON object of changed props per node inside the commit payload, merged natively over the node's previous typed `PropsSpec`. GodotJS cannot pass a plain JS object as a `Dictionary` (it only accepts an existing Godot Dictionary wrapper, `modules/GodotJS/bridge/jsb_type_convert.cpp:284-305`), and arrays of objects cost 0.7–1.9 µs per element to marshal (F0), so the payload crosses as one string |
| `ShadowTree` commit with revisions | the JS committed tree (`committedByTag`) plus the native mounted tree; `commit` validates the whole payload before changing anything |
| Differ → `ShadowViewMutation` list | split in two: the JS commit walk finds changed nodes by identity (`===`) in time proportional to the changed paths; native diffs each changed child list against the mounted children and produces a `MountingTransaction` (`Create`, `Delete`, `Insert`, `Remove`, `Update`) |
| Mounting layer creating platform views | mounting layer keyed by tag: Taffy node, computed style, Stylo node, paint resources, canvas items, interaction state |
| Yoga layout on the shadow tree | Taffy on the mounting layer's retained layout tree (deviation: layout runs after the diff, keyed by tag; Taffy caches clean subtrees) |
| Native `State` (scroll offset, text input content) | per-tag interaction state in the mounting layer that survives clones |
| `EventEmitter` → JS dispatch | the Phase 1 synchronous `events_ready` dispatch; events carry their native propagation path |
| View commands (`setTextAndSelection`, `scrollTo`) | `#[func]` commands addressed by tag |
| `StyleSheet.flatten` in JS | JS compiles `className` + `style` once per distinct input into ordered rule layers; native resolves conditions and inheritance |

### 3.2 Invariants (binding)

1. **One `Control` per root.** No per-element `Node`, `Control`, `LineEdit` or `TextEdit`. Every
   primitive `LineEdit` uses is exposed to GDExtension (section 7.3); a child `Control` would escape
   the draw order and clipping of the canvas-item hierarchy and would take Godot key focus.
2. **Native owns** the shadow trees, the mounting layer, layout, computed styles, hit testing, focus,
   pointer state, scroll offsets, text buffers, selections, drag sessions and accessibility elements.
   **JS owns** React state, handlers, and the decision to `preventDefault()`.
3. **JS instances are immutable once React completes them.** `appendInitialChild` only runs on an
   instance React is still building; nothing mutates a completed instance (freeze them in development
   builds of the renderer so a violation throws).
4. **Every JS→native call validates its input** and reports errors without changing committed state.
   A rejected `commit` leaves the previous tree mounted. Internal invariants of native data the native
   code produced itself (the child-list differ's output) are `expect`ed, not validated.
5. **Tags** are JS-allocated `u32`s, unique per root for the root's lifetime; a tag is the identity
   of a node across all its clones.
6. **No whole-tree work on commit.** Any loop over all mounted nodes in a commit path is a bug,
   except where this plan names it (Tab order, accessibility updates, snapshots, and the intrinsic-size
   probe noted in section 8).
7. **Main thread only.** No threads, no deferred calls for correctness.

### 3.3 The pipeline

```
React render (JS)            createInstance / cloneInstance / appendInitialChild
  │                          → new frozen JS instances for changed nodes only; no native calls
React commit (JS)            replaceContainerChildren(container, childSet)
  │                          → commit walk: skip instances === committed; collect created nodes,
  │                            prop diffs, changed child lists
  │                          → commit(layer, payload_json)                 (one call per layer per commit)
Native commit                validate the whole payload; diff each changed child list against the
  │                          mounted children → MountingTransaction
Mount                        apply Remove, Delete, Create, Update, Insert to the mounting layer;
  │                          mark style/layout/paint dirt per node
Style resolution             recompute computed styles for dirty nodes (and descendants whose
  │                          inherited inputs changed); feed Stylo; mark layout/paint dirt
Layout                       Taffy compute_layout if the root is dirty
Geometry                     walk only regions whose layout may have changed (3.7); update transforms,
  │                          clips, rects
Paint                        re-record only canvas items whose own visuals or size changed
Events                       hover re-hit-test if geometry under the mouse changed; queue events
```

Everything above runs synchronously inside `commit`, so `useLayoutEffect` and ref measurements after
a commit see the new layout (as in Fabric's synchronous commits).

Outside commits, native-only changes (hover/focus state, viewport resize, scroll, transitions, text
editing) enter the same pipeline at **Style resolution** or **Geometry** without any JS involvement.

Two rules keep the later stages from being skipped (D7). A commit that changes a child list runs
Layout, Geometry and Paint even when no computed style changed (a keyed reorder, a removal). And a
native change that restyles nothing but changes what is drawn still requests Paint: the focus ring is
drawn by the paint pass from `focused`, not from any style, so moving focus to an element with no
`:focus` rule must end in a pass.

### 3.4 Shadow tree and commit payload (decision D2)

The persistent shadow tree is the tree of JS `Instance` objects (3.9). Native holds no shadow nodes;
it holds the mounted tree (3.7). The commit payload is the only thing that crosses:

```ts
// src/native.ts — serialized with JSON.stringify, one string per commit per layer
interface CommitPayload {
  created: { tag: number; kind: NativeKind; props: NativeProps }[];  // full native props of new tags
  updated: { tag: number; props: NativePropsDiff }[];                // changed keys only; null resets
  children: { tag: number; children: number[] }[];                   // every node whose child list
                                                                     // changed, and every created node
                                                                     // with children; tag 0 = layer root
}
```

```rust
// native/commit.rs (Godot-free)
pub struct CommitPayload { pub created: Vec<CreatedNode>, pub updated: Vec<UpdatedNode>, pub children: Vec<ChildList> }
pub fn validate(payload: &CommitPayload, mounted: &impl MountedTree) -> Result<ValidatedCommit, CommitError>;
pub fn plan(validated: &ValidatedCommit, mounted: &impl MountedTree) -> MountingTransaction;
```

- **Validation before any change** (O(payload) plus O(depth) per moved child): created tags must be
  new for this root's lifetime and unique; updated tags must be mounted (or created in this payload)
  and may not change kind; every child tag must be mounted or created; after applying, each tag has at
  most one parent and no node is its own ancestor (walk the new parent chain); `Text` and `TextInput`
  have no children; every created node must end up attached or the commit is rejected; props diffs
  merge into valid `PropsSpec`s. Any failure returns an error and leaves the mounted tree unchanged.
- **Planning** turns each changed child list into `Remove`/`Insert` against the mounted children (3.7);
  a removed tag that is not re-inserted anywhere in the same payload is `Delete`d with the mounted
  descendants still under it.
- Kinds and rules: `Text` carries its string in the `text` prop and has no children (React Native's
  rule: raw strings must be inside `<Text>`; the renderer's `createTextInstance` throws). `TextInput`
  has no children. `Button` renders its label through a child `Text`.

### 3.5 Props: authored values, diffs, transport

- **Native props** are the subset of React props that native needs: `style` (compiled rule layers,
  3.6), `text`, `disabled`, `hidden` (Suspense), `testID`, and the feature props each phase adds
  (`tabIndex`, `autoFocus`, `draggable`, text input props, `role` and `aria*`). Event handlers and
  everything else stay in JS. `src/props.ts` holds the table of native props; anything not in it is
  JS-only.
- **Diff.** The commit walk compares each changed instance's native props with the committed
  instance of the same tag, key by key (compiled style objects compare by identity because the
  compiler interns them). A diff is an object of changed keys; `null` resets a key to its default.
  Native merges it over the node's previous `PropsSpec` and validates the result (unknown keys and
  invalid values are errors). A handler-only change produces no diff and no payload entry.
- **Transport.** One JSON string per commit per layer containing only changed nodes, parsed by
  `serde_json`. F0 measured a 3-key diff at 0.84 µs (native) and 3.1 µs (Web) to cross and parse, and a
  40-property style at 5.3 µs and 20 µs. This is the `RawProps` analog; there is no whole-state
  message. If the string boundary is ever the bottleneck (F4 measures it), that is the trigger for the
  deferred binding work in 2.3.

### 3.6 Native style resolution

- **Compilation (JS, cached).** `compileStyle(className, style)` turns a class string and inline
  style (object or nested arrays) into `CompiledStyle { layers: StyleLayer[] }`, where
  `StyleLayer = { minWidth?: number; states?: PseudoState[]; style: Style }`. Shorthands
  (`padding`, `margin`, `gap`, `overflow`, `inset`) are expanded to longhands at compile time so
  native merging is a plain ordered overwrite, matching today's `mergeStyle` (`src/styles.ts`).
  Unknown classes still throw at compile time. Results are interned by a canonical key so equal inputs
  return the identical object. `PseudoState = 'hover' | 'active' | 'focus' | 'focusVisible' |
  'focusWithin' | 'disabled'`.
- **Resolution (native).** A node's computed style = its parent's computed inherited properties, then
  each layer in order whose conditions hold (`viewport width >= minWidth` and every listed state is
  set). Inherited properties: `color`, `fontSize`, `textAlign`, `pointerEvents`, `cursor`,
  `userSelect`, `selectionColor`, `caretColor`, `placeholderColor`, `scrollbarColor`,
  `interpolateSize` (today resolved by walking ancestors, `effective_interpolate_size`).
- **State semantics** (CSS): `hover` and `active` apply to the target and all its ancestors (mouse
  hover only; 3.12); a mouse press stays `active` only while the pointer is inside it (the intersection of
  the pressed element's chain and the hover chain), a key press until the key is released; `focus` and `focusVisible` apply to the focused element only; `focusWithin`
  applies to the focused element and its ancestors; `disabled` is the node's own `disabled` prop.
  Today's JS sets `focus` on every ancestor of the focused element; v2 moves that behaviour to the new
  `focus-within:` variant. Record any existing demo or verifier that relied on the old behaviour and
  switch it to `focus-within:`.
- **Dirty propagation.** A node's computed style is recomputed when its props change, a state it
  conditions on changes, the viewport crosses a `minWidth` it uses, or its parent's computed inherited
  values change. Recursion into children stops where a child's inherited inputs are unchanged. Keep an
  index from breakpoint thresholds to the nodes that use them so a resize touches only those nodes.
- **Consumers.** A computed-style change updates, as needed: the Taffy style (layout properties), the
  paint resources (paint properties), and the Stylo node (transition targets). `StyleEngine`
  (`native/style_engine.rs`) becomes incremental (`insert`, `update`, `remove`, `move` by tag) with
  the same Stylo semantics; `verify:motion` is the regression net.

### 3.7 Mounting layer

```rust
// native/mount.rs (Godot-dependent glue around Godot-free data)
pub struct MountedNode {
    pub tag: u32,
    pub kind: Kind,
    pub props: Rc<PropsSpec>,
    pub parent: Option<u32>,            // None for a layer's top-level nodes
    pub children: Vec<u32>,
    pub computed: ComputedStyle,
    pub layout: taffy::NodeId,
    pub visual: Visual,                 // StyleBoxFlat, TextParagraph, colours (existing type)
    pub render: RenderNode,             // canvas items, 3.8
    pub geometry: NodeGeometry,         // size, location relative to paint parent, clip, absolute rect cache
    pub state: InteractionState,        // scroll offset, edit buffer, ... (per tag, survives clones)
}
```

- `MountingTransaction` application order: `Remove` (detach from parents), `Delete` (free Taffy,
  Stylo, canvas items, accessibility element; clear focus/hover/capture/selection references),
  `Create`, `Update` (props → style dirt), `Insert` (attach at index). This replaces `Model`,
  `apply_batch`, `sync_model`, and the flat `rects`/`clips`/`paint_order` maps.
- **Validation** of the whole payload happens before any change (3.4).
- **Child list diff** (per entry in `payload.children`, against the mounted children of that tag):
  common prefix and suffix by tag are stable. For the middle, children present in both lists that keep
  relative order (longest increasing subsequence of old indices) stay; others are `Remove`d and
  `Insert`ed. Tags created in this payload are `Create`d and `Insert`ed; old children not present are
  `Remove`d, and `Delete`d with their remaining mounted descendants if no other entry re-inserts them.
- **Incremental geometry.** After `compute_layout`, walk from each layer root; for each node compare
  the new Taffy layout with the stored geometry; descend into children only if the node is an
  ancestor of a node marked layout-dirty in this pass, or its size changed. A clean subtree with an
  unchanged size has an unchanged internal layout (identical Taffy inputs), and a location change is
  absorbed by that node's transform.
- **Hit testing** descends the hierarchy from the top layer: children in reverse paint order, point
  transformed into child coordinates (subtracting location, adding scroll offset), rejecting outside a
  clipping ancestor's clip. `pointerEvents: none` skips the node itself but still descends into its
  children (CSS semantics). The cost is proportional to depth × siblings examined, not to tree size.
- **Absolute rects** (snapshots, `getRect`, accessibility bounds) are computed by walking up the paint
  parents, cached per node, and invalidated with geometry.
- Interaction state keyed by tag persists across clones and is dropped on `Delete`.

### 3.8 Render tree (canvas-item hierarchy)

Each mounted element owns retained `RenderingServer` canvas items arranged like a view hierarchy:

```
box        transform = location relative to paint parent; modulate alpha = opacity;
           custom rect = own bounds (culling); draws background and border
└─ content clip = padding box when overflowX/Y != visible (TextInput: always); draws text,
           │      selection, IME underline and caret, in that order
           └─ scroll   (scroll containers only) transform = −scroll offset; children attach here
           └─ child box items (non-scrollers)
└─ overlay (scroll containers only) draws scrollbar thumbs after the subtree
```

- **Paint parent**: the parent's `content` (or `scroll`) item, except `position: absolute` attaches to
  its containing block's `content` (or `scroll`) item (nearest positioned ancestor, else the layer root) and
  `position: fixed` attaches to the layer root (D23). An absolute element whose containing block is outside
  an `overflow-hidden` ancestor therefore escapes that clip and that scroller, which is CSS's rule.
- **Sibling order**: draw index = rank by (`zIndex` default 0, document order). `zIndex` orders
  siblings under the same paint parent only, as in React Native.
- **Layers**: layer 0 is the main tree, layer 1 the overlay tree used by `<Portal>`. Each layer has a
  root canvas item parented to `ReactUiRoot`'s canvas item; the overlay root draws last and is
  hit-tested first. The focus ring and the drag ghost use a top-most item above both.
- **Re-recording**: `box` when size or box paint changes; `content` when text, text paint, content
  width (wrapping), selection or caret changes. Moves change transforms only; opacity changes modulate
  only. Godot redraws changed items without `queue_redraw()` on the `Control`.
- `canvas_item_set_clip` clips an item's own drawing and its children, which is how `Control`'s
  `clip_contents` clips child controls; the `content` item's clip rect is in its own coordinates.
- `Control::draw()` no longer paints elements (it may stay empty or be removed).

### 3.9 JS renderer (persistent host config)

`src/renderer.ts` is rewritten as a persistent host. Verified against
`node_modules/.pnpm/react-reconciler@0.33.0_react@19.2.0/node_modules/react-reconciler/cjs/react-reconciler.development.js`:
`updateHostComponent` calls `cloneInstance(currentInstance, type, oldProps, newProps, keepChildren,
null)` and, when children changed, appends them again with `appendInitialChild` (lines 9940-9970);
`updateHostContainer` builds a child set with `createContainerChildSet`/`appendChildToContainerChildSet`
and calls `finalizeContainerChildren` (lines 9930-9939); the commit calls `replaceContainerChildren`
for the root and for portals inside `captureCommitPhaseError` (lines 11370-11380, 12350-12365); a changed host text gets a brand-new
text instance (lines 10282-10300), which is why text travels as a prop instead.

```ts
interface Instance {               // one per clone; never mutated after React completes it
  readonly tag: number;
  readonly kind: NativeKind;
  readonly props: UIProps;         // full React props (handlers included)
  readonly native: NativeProps;    // the native subset (compiled style interned), for diffing
  readonly children: Instance[];   // filled by appendInitialChild while building; shared by reference
}
```

No host config method calls native during render.

| Host config | Behaviour |
| --- | --- |
| `createInstance(type, props, root)` | allocate tag; build `native` from props; new public handle for the tag |
| `createTextInstance` | throw `Text strings must be rendered within a <Text> component` |
| `shouldSetTextContent(type, props)` | `type === 'text'` and children are scalar |
| `appendInitialChild(parent, child)` | push to `parent.children` (parent is still being built) |
| `finalizeInitialChildren` | `false` (autoFocus is native) |
| `cloneInstance(inst, type, oldProps, newProps, keepChildren)` | new `Instance` with the same tag, new `props`/`native`, and `children` = `inst.children` when `keepChildren`, else a fresh array that React fills with `appendInitialChild` |
| `cloneHiddenInstance` / unhide | clone with `hidden: true` / `false` in `native` |
| `cloneHiddenTextInstance` | unreachable (no text instances); throw |
| `createContainerChildSet` / `appendChildToContainerChildSet` | a plain array of instances |
| `finalizeContainerChildren` | nothing |
| `replaceContainerChildren(container, set)` | run the commit walk, call `commit(container.layer, JSON.stringify(payload))`, record its error in the root's failure slot if any (D4: throwing here would make React unmount the tree), then apply the walk's map updates and native deletions |
| `getPublicInstance` | the per-tag public handle (stable across clones) |
| `cloneMutableInstance`, `cloneMutableTextInstance` | read where 0.33 calls them (`react-reconciler.development.js:16979-16984`); implement if reachable with our configuration, else record why not |

**Commit walk** (pure function, `src/commit.ts`): `buildCommit(committedByTag, previousRootTags,
newRootChildren) -> { payload, updates }`. Visit the new root children recursively; an instance
identical (`===`) to `committedByTag.get(tag)` is skipped with its whole subtree. Otherwise: a tag not
yet committed goes into `created` (full native props), a committed tag whose native props differ goes
into `updated` (the diff), and if its child tag list differs from the committed instance's (or it is
new and has children) it goes into `children`; then visit its children. The layer root's child tag list
is compared with `previousRootTags` (entry tag 0). Persistent mode clones every ancestor of a changed
node, so the walk visits only changed paths. `updates` (new `committedByTag` entries) is applied only
after `commit` succeeds; `take_commit_deletions()` then gives the tags to drop from `committedByTag` and
the public-handle map. Event dispatch and public handles read `committedByTag`; nothing reads React
fibers. A rejected commit is recorded in the root's failure slot and thrown at the public API boundary (`render()`, `unmount()`, `dispatchEvents()`), after React finishes its bookkeeping (D4).

**Removed.** `flush()`, the `committed` style-key map, the `Container`/`Instance` parent links,
`applyBatch`, `refreshStyles` (breakpoints are native), and JS pseudo-state flags. `findByTestID`
becomes a native query.

### 3.10 Events

The Phase 1 design stays: input-originated events are dispatched to JS synchronously through the
`events_ready` signal from inside `gui_input`, JS calls `resolveEvent` for cancelable events before
the signal returns, and native runs default actions only if not prevented. Evidence: godot-rust 0.5.5
re-entrancy through `base_mut()` (`godot-core-0.5.5/src/obj/traits.rs:456-524`), verified at runtime
in Phase 1 including a handler that unmounted the root, detached it from the tree, and removed its own
target.

Rules (all **must**):

1. Only input-origin entry points emit `events_ready`: `gui_input`, `OS_IME_UPDATE`, `_set_text`,
   accessibility action callbacks. Calls from JS (`commit`, commands) and lifecycle
   notifications queue events for the next emit or for the owner's per-frame `dispatchEvents()`.
2. `dispatch_depth` guards nesting: input arriving while JS is inside a dispatch is queued with
   `cancelable: false`.
3. After the emit, everything computed before it is stale: look nodes up again and skip the default
   action if its target is gone. Lookups return `Option`; nothing indexes a map with a possibly removed
   tag (Phase 1 found `model.nodes[&id]` panics in `enabled_button_ancestor` and `disabled`).
4. If the root left the tree during the emit, stop.
5. `resolve_event` is valid only for the awaited seq; anything else is an error.
6. A throwing handler does not break the drain loop; errors are rethrown after it.
7. The drain loop is bounded (`MAX_EVENT_DRAIN_ROUNDS`).
8. **Propagation path from native.** Each event carries `path`: the tags from the target up to its
   layer's top-level node. JS resolves each tag through `committedByTag` and dispatches capture
   (outermost first), then bubble (target first), then root listeners. Enter and leave events also
   carry `relatedPath` (D5). Pseudo-states are native, so JS no longer tracks hover/active/focus flags.
9. Events stay JSON strings from `drain_events()` (small, already validated by `src/native.ts`;
   measured above).

### 3.11 Godot co-operation contract

| Godot input | Reaches `ReactUiRoot` when | Consumed (the game does not see it) when |
| --- | --- | --- |
| Mouse button/motion, `ScreenTouch`, `ScreenDrag`, gestures | `_has_point(p)` is true: the native hit test finds an element at `p` whose computed `pointerEvents` is `auto`. During a press Godot keeps routing to the pressed control (`gui.mouse_focus`, `gui.touch_focus`). | Always, once it reaches the root: `MOUSE_FILTER_STOP` marks pointer events handled (`viewport.cpp:1764`). Pass-through is decided only by `_has_point`. |
| Wheel, `InputEventPanGesture` | same as pointer | Only if JS prevented `wheel` or a scroll container scrolled. The root sets `force_pass_scroll_events = true` and calls `accept_event()` itself. |
| Keys | the root has Godot key focus (`viewport.cpp:2313`). The root takes key focus only when a React element is focused, a text selection starts, or the owner calls `grabFocus()`. | Only if JS prevented `keydown`/`keyup`, or a native default action ran (focus moved, button pressed or activated, text edited, scrolled, copied, drag cancelled). |

- **No focus stealing**: `ready()` does not call `grab_focus()`; owners that want keyboard-first
  behaviour (the demo) call `surface.grabFocus()` after mounting. The root's focus mode is `FOCUS_CLICK`
  (D11), so Godot's own Tab navigation never gives it focus.
- Godot grants key focus to the root on every left press that reaches it, before JS runs (D11). After a
  primary press, whatever JS decided, the root holds key focus only if an element is focused: pressing a
  non-focusable element (and not starting a selection) clears element focus and releases Godot focus.
- Tab and Shift+Tab are consumed only if focus moved; Enter and Space only if they pressed or released a
  focused enabled button; a wheel tick or pan only if JS prevented it.
- `viewportX`/`viewportY` are `get_global_transform_with_canvas()` applied to the root-local position.
- Transparent elements still catch pointers, as in HTML. Full-screen HUD containers use
  `pointer-events-none`; interactive children use `pointer-events-auto`.

### 3.12 Pointer model

- **Ids**: mouse `1`; touch `TOUCH_POINTER_ID_BASE + touch index`; `0` for synthetic keyboard
  activation (`click` from Enter/Space has `pointerType: ""`, `pointerId: 0`, `detail: 0`).
- **Emulation rule**: ignore every input event whose `device == InputEvent.DEVICE_ID_EMULATION` (`-1`)
  (`core/input/input.cpp:926`); handle real `InputEventScreenTouch`/`ScreenDrag` as touch pointers.
  The Web platform `preventDefault()`s touch events (`library_godot_input.js:596`), so browsers add no
  compatibility mouse events either.
- **Buttons**: DOM `button` 0 left, 1 middle, 2 right, 3 back, 4 forward, −1 for moves; DOM `buttons`
  1, 2, 4, 8, 16 mapped explicitly from Godot's `MouseButtonMask` bits 1, 2, 4, 128, 256
  (`native/pointer.rs`, Phase 1).
- **Clicks**: `click` for the primary button and touch, `auxclick`, `contextmenu` on right press,
  `dblclick` after the second `click`; `detail` counted natively (Appendix A). The shared-button rule
  (padding and label of one enabled button activate it) stays.
- **Hover**: only the mouse sets the `hover` state; touch dispatches enter/leave on down/up but never
  sets `hover` (no sticky hover).
- **Enter/leave**: one native `pointerleave` (target old, `relatedTarget` new) and one `pointerenter`
  (target new, `relatedTarget` old); JS dispatches to each element leaving or entering the chain below
  the common ancestor, non-bubbling (Phase 1).
- **Capture**: `handle.setPointerCapture(pointerId)` while the pointer is down retargets its
  move/up/cancel; touch pointers are implicitly captured to their `pointerdown` target.
- **Cancel**: `pointercancel` when a touch pan becomes a scroll, a drag starts, the OS cancels the touch,
  or the root leaves the tree; no `click` follows.
- **Gesture arbitration** after an un-prevented primary `pointerdown`: (1) JS took capture → none;
  (2) mouse on a scrollbar thumb → thumb drag; (3) inside a `draggable` element: mouse beyond
  `Viewport.get_drag_threshold()` or touch held `TOUCH_DRAG_HOLD_MS` within `TOUCH_SLOP_PX` → drag and
  drop; (4) touch beyond `TOUCH_SLOP_PX` where the computed `touchAction` allows panning that axis and
  a scroll container can scroll that way → pan (`pointercancel` to JS); (5) mouse on selectable text →
  selection drag; (6) plain pointer events.

### 3.13 Focus

- Focusable: `Button`, `TextInput`, and any element with `tabIndex` (`0` or `-1` only; other values are
  validation errors). Tabbable: focusable, `tabIndex` 0, not disabled (self or ancestor), visible.
- Tab order is document order (pre-order of the mounted tree), never paint order. Tab and Shift-Tab
  wrap, as today; Tab is accepted only when focus moved.
- An un-prevented primary `pointerdown` focuses the nearest focusable ancestor-or-self, else 3.11.
- Native tracks input modality; focus from Tab, or from `focus()` while the modality is keyboard, is
  focus-visible. The native focus ring is drawn only for focus-visible focus.
- `handle.focus({focusVisible?})`, `handle.blur()`; focusing a non-focusable element is an error and
  `focus()` grabs Godot key focus. `autoFocus` focuses the first newly mounted `autoFocus` element in
  document order of a commit.
- Focus traps and roving focus are JS components (`onKeyDown` + `preventDefault()` + `focus()`).
- Godot `FOCUS_EXIT` blurs the focused element.

### 3.14 Keyboard

- `keydown` and `keyup` go to the focused element, or to root listeners when the root has Godot focus
  and no element is focused (target `0`, empty path).
- Echo events arrive as `keydown` with `repeat: true`. Button activation ignores repeats.
- `key`/`code` follow the DOM (Appendix B); modifiers `shiftKey`, `ctrlKey`, `altKey`, `metaKey`.
- Default actions run only if not prevented. Text editing uses Godot's `ui_text_*`, `ui_copy`,
  `ui_cut`, `ui_paste`, `ui_undo`, `ui_redo` InputMap actions exactly as `LineEdit`/`TextEdit` do
  (Appendix C).
- Button activation: press on Enter/Space `keydown`, `click` on the matching `keyup`. No fabricated
  pointer events; the `active` state is native.

### 3.15 Positioning, z-order and overlays

- `position: static|relative|absolute|fixed` and `top/right/bottom/left` (number, `%`, `auto`) map to
  Taffy, which implements containing blocks at the pinned revision
  (`~/.cargo/git/checkouts/taffy-bd4586f5551dc460/fca167c/src/style/mod.rs:354-385`). The `location` Taffy reports for
  an absolute element is relative to its containing block's border box (D23), which is the frame of its paint parent.
- Clipping and scrolling of out-of-flow boxes follow from the paint-parent rule in 3.8.
- `zIndex` orders siblings under one paint parent (React Native semantics). Popovers, menus, dialogs
  and toasts render through `<Portal>` into the overlay layer, which always covers the main layer.
- `get_node_rect(tag)` gives root-local rects for anchoring overlays.

### 3.16 Scroll containers

- Wire longhands `overflowX`, `overflowY`: `visible|hidden|scroll|auto` (the authoring shorthand `overflow` is expanded by
  the compiler). Taffy gets `Overflow::Scroll` for `scroll|auto` with `scrollbar_width = 0.0` (overlay scrollbars; zero
  width behaves like `Hidden` for layout, `…/src/style/mod.rs:467-470`). An axis scrolls only when its own overflow is
  `scroll|auto`; a container that clips on either axis clips both (D30).
- Range from Taffy: `Layout::scroll_width()` / `scroll_height()` (`…/src/tree/layout.rs:799,814`) with the axis'
  `scrollable_overflow_rect.is_reversed()` flag (the magnitude is unsigned), so a reversed axis has the range `-range..=0`.
  Offsets are per-tag native state (`MountedNode::scroll`), re-clamped whenever the stored geometry (which holds the ranges)
  changes, and changing one updates the `scroll` item's transform, the hit-test offset and the scrollbar overlay, queues a
  coalesced `scroll` event and re-finds what is under a stationary mouse; nothing else (no Taffy, no computed style, no
  React, no re-record of boxes or content; the snapshot's `scrollUpdates` and `overlayRecords` are what change).
- Wheel scrolls `client size / SCROLL_PAGE_DIVISOR` per tick; pan gestures `client size × delta / SCROLL_PAGE_DIVISOR`,
  mirroring `ScrollContainer` (`scene/gui/scroll_container.cpp:190-226,311-318`, `ScrollBar::PAGE_DIVISOR = 8`,
  `scene/gui/scroll_bar.h:116`). Shift+wheel scrolls horizontally. Godot's wheel `factor` of 0 means 1 (`wheel_factor`).
- Chaining (D32): the scroll containers on the paint path from the element under the pointer, innermost first, take what they
  can and pass the remainder on, unless `overscrollBehavior: 'contain'` ends the chain; the event is consumed when a container
  moved or a `contain` container kept the rest, and otherwise reaches `_unhandled_input`.
- Touch pan per 3.12 rule 4, decided once at the first movement beyond the slop and latched to its owner (D33), with momentum
  mirroring `ScrollContainer`'s `drag_touching_deaccel` (`scroll_container.cpp:569-610`); a new touch stops it and does not click.
- Keyboard scrolling of the focused element's nearest scroll container that the key can move (arrows a page / 8, Page keys a
  page, Home and End to the physical ends, Space and Shift+Space a page) as the `keydown` default action, except with Ctrl,
  Alt or Meta and (from I7) inside text inputs. `ScrollContainer` handles no keys itself, so the steps follow its accessibility
  scroll actions (`scroll_container.cpp:450-480`; the track note S3).
- Overlay scrollbar thumbs in the `overlay` item, `scrollbarWidth: auto|none`, `scrollbarColor` (inherited), mouse thumb
  dragging (D34).
- `scroll` events (non-bubbling, coalesced per container), `scrollTo`, `scrollBy`, `scrollIntoView` and `getScrollState`
  commands (D36), and scroll-into-view on keyboard or programmatic focus (D32). Tab stops and focus use the reachable
  geometry, not the drawn one (D31).
- One `process()` decision covers motion, coasting flicks and panning fingers (D35).

### 3.17 Text model and selection

- Godot `String` and `TextServer` positions are code point indices; edit buffers are `Vec<char>`.
  **Every offset crossing to JS is a UTF-16 code unit index**; `text_offsets.rs` owns the conversions.
- `TextLayout` (`text_layout.rs`) answers hit test (`TextParagraph.hit_test`), caret rectangles
  (`TextServer.shaped_text_get_carets` on `get_line_rid`), selection rectangles
  (`shaped_text_get_selection` per line), word bounds (`shaped_text_get_word_breaks`), grapheme steps.
  Line origins replicate `TextParagraph::draw` (`scene/resources/text_paragraph.cpp:841-940`).
- `userSelect: none|text`, inherited, default `none`. Selection starts only on `Text` nodes outside
  `Button`s. Model: anchor and focus `(tag, offset)` in document order. Mouse: click collapses, double
  click selects a word, triple click the node's text, drag extends, Shift+click extends. Starting a
  selection grabs Godot focus for the root. `ui_copy` copies (nodes joined by `\n`),
  `ui_text_select_all` selects all selectable text. A text change in the range clears the selection.
  `selectionchange` to root listeners; `root.getSelection()` queries native. `selectionColor`.

### 3.18 Text input

`<TextInput>` (kind `textinput`, `multiline` prop for multi-line). Text lives in a native per-tag
`EditBuffer`, not in props.

- **Rendering** in the `content` item (always clipped): value, bullets for `secure`, or placeholder;
  selection; IME preedit; caret blinking at `CARET_BLINK_INTERVAL_MS` (`LineEdit` default,
  `scene/gui/line_edit.h:200`). Single-line scrolls horizontally to keep the caret visible;
  multi-line wraps and scrolls vertically with wheel chaining.
- **Intrinsic size never depends on the value**: width `TEXT_INPUT_DEFAULT_COLUMNS` × the advance of
  `"0"` at the computed font size; height one line or `rows` lines (`TEXT_AREA_DEFAULT_ROWS`).
- **Editing pipeline** for an un-prevented `keydown`: resolve an `EditCommand` from InputMap actions
  (Appendix C) or, with no Ctrl/Alt/Meta and `unicode >= 32`, `InsertText` (the `LineEdit` rule,
  `scene/gui/line_edit.cpp:1053-1073`); dispatch `beforeinput` (cancelable); if not prevented, apply
  (respecting `readOnly`, `maxLength` in UTF-16 units), push undo, increment the input's
  `eventCount`; queue `input {value, inputType, data, selectionStart, selectionEnd, eventCount}` and
  `selectionchange`.
- **Controlled values: React Native's protocol.** `defaultValue` is a prop applied when the node is
  created. The `TextInput` component tracks the last native text and event count from `input` events;
  in `useLayoutEffect`, if `props.value` is defined and differs from the last native text, it calls
  `handle.setTextAndSelection(eventCount, value, start?, end?)` (RN's `setTextAndSelection` view
  command). Native applies it only if `eventCount` equals its current count; a stale command (the user
  typed again first) is ignored, and the next `input` event lets JS reconcile again. Applying replaces
  the buffer, puts the caret at the end unless a selection is given, clears composition and undo
  history.
- **IME**: on focus `window_set_ime_active(true)` and `window_set_ime_position(screen caret)` as
  `LineEdit::_update_ime_window_position` (`line_edit.cpp:134-147`); off on blur
  (`line_edit.cpp:124-131`). `OS_IME_UPDATE` reaches every node (`scene/main/scene_tree.cpp:922-932`);
  read `ime_get_text()`/`ime_get_selection()` as `line_edit.cpp:1694-1713`, render preedit, queue
  `compositionstart/update/end`. Committed text arrives as key events.
- **Virtual keyboard**: on focus, if `has_feature(FEATURE_VIRTUAL_KEYBOARD)`,
  `virtual_keyboard_show(text, global rect, type, maxLength, selStart, selEnd)`; hide on blur. On Web
  the hidden DOM input reports the whole text through `Viewport::_push_text_input`, which calls a
  method named `_set_text(text, emit_signal)` on the key-focus `Control`
  (`scene/main/viewport.cpp:2856-2868`), then synthetic RIGHT presses place the caret
  (`platform/web/display_server_web.cpp:801-823`). `ReactUiRoot` implements `_set_text` as an
  `insertReplacementText` edit with the caret at 0, like `LineEdit::_set_text`
  (`line_edit.cpp:2126-2142`). On Web, IME and virtual keyboard are mutually exclusive and depend on
  `html/experimental_virtual_keyboard` and touch support (`display_server_web.cpp:1227-1231`,
  `library_godot_display.js:39-41`).
- **Clipboard** through `DisplayServer`; copy/cut disabled for `secure`. Web `clipboard_get` returns a
  cached value refreshed asynchronously (`display_server_web.cpp:1037-1039`); Phase I7 investigates.
- **Undo/redo**: per-input snapshots, `UNDO_LIMIT`, coalesced consecutive `insertText`.

### 3.19 Drag and drop

HTML semantics inside one root: `draggable` prop; `dragstart` (cancelable) → `pointercancel`;
on every move and scroll change, hit test (ignoring `pointerEvents: none`), `drag` on the source,
`dragleave`/`dragenter` on target change, `dragover` (cancelable; prevented ⇒ drop allowed with the
outcome's `dropEffect`); release → `drop` (cancelable) if allowed, then `dragend` with `dropEffect`,
root-local and viewport coordinates and `endedOutsideRoot`. Escape or root exit cancels. `DataTransfer`
in JS with HTML protection modes. Cursor shapes while dragging. Ghost: `dragPreview: 'native' | 'none'`;
the native ghost re-records the source's box/content commands into the top-most item, translucent,
following the pointer. Edge auto-scroll.

Godot `Control` interop is a non-goal: Godot calls `_can_drop_data` on `&self` synchronously during
routing, where a JS decision cannot be made without a mutable re-entrant borrow. `endedOutsideRoot`
plus viewport coordinates is enough for game-world drops.

### 3.20 Cursor

`cursor` (inherited, computed natively). `get_cursor_shape(at)` maps the hit element's computed cursor
(Appendix A). Defaults: text inputs and selectable text `text`, otherwise `default`; drag overrides.

### 3.21 Accessibility

Follow `ItemList` (`scene/gui/item_list.cpp:1315-1365`, `get_focused_accessibility_element` at
`item_list.cpp:1236`): on `NOTIFICATION_ACCESSIBILITY_UPDATE`, ensure one sub-element per exposed node
under the nearest exposed ancestor's element; set role, name, bounds, flags, values, actions bound to
the node's tag. Exposed: `Button`, `TextInput`, `Text` with text, scroll containers, explicit `role`.
`ariaHidden` removes a subtree. Free on `Delete`; forget all on `ACCESSIBILITY_INVALIDATE`;
`queue_accessibility_update()` after commits, focus and geometry changes. The update is a whole-tree
walk by design (Godot asks for it).

### 3.22 Coordinates and world space

Root-local logical pixels, origin top-left, `+y` down, identical to Godot `Control`. Events also carry
`viewportX/viewportY`. 3D surfaces: root in a `SubViewport`, viewport texture on a quad, input
forwarded by analytic ray–plane intersection (Breaka's Web engine has no 3D physics) and
`subViewport.pushInput(event, true)`. Anchored 2D UI: `Camera3D.unprojectPosition()` → an absolute
element.

### 3.23 Component kit

Built only from `View`, `Text`, `Button`, `TextInput`, events, focus, capture, `Portal` and
transitions. No transforms, images or icon fonts: checkmarks are filled inner boxes; switch thumbs move
by transitioning a spacer's `width`.

### 3.24 Module layout (target)

Rust (`native/`). Inherent `impl ReactUiRoot` blocks may live in any module. Child-module items used
elsewhere need `pub(crate)` (never `pub`). All `#[func]`/`#[signal]` declarations stay in the primary
`#[godot_api]` block in `lib.rs` and delegate.

| Module | Contents | Godot-free? |
| --- | --- | --- |
| `lib.rs` | `ReactUiRoot`, `IControl` impl, `#[func]`/`#[signal]` surface | no |
| `props.rs` | `Kind`, `PropsSpec`, `StyleLayers`, `StyleSpec` longhands, diff merge, validation, Taffy mapping (from today's `protocol.rs`) | yes |
| `commit.rs` | `CommitPayload`, validation, planning (3.4) | yes |
| `diff.rs` | `MountingTransaction`, child-list diff (LIS) | yes |
| `computed_style.rs` | layer resolution, inheritance, dirty propagation, breakpoint index | yes |
| `mount.rs` | `MountedNode`, transaction application, incremental geometry, hit test | mixed |
| `render_tree.rs` | canvas-item hierarchy (replaces `render_items.rs`) | no |
| `events.rs`, `pointer.rs` | Phase 1 event queue, wire types, pointer helpers | yes |
| `focus.rs`, `keymap.rs`, `scroll.rs`, `text_offsets.rs`, `selection.rs`, `text_input.rs`, `drag.rs` | interaction logic | yes |
| `text_layout.rs`, `text_input_godot.rs`, `accessibility.rs` | Godot glue | no |
| `motion.rs`, `style_engine.rs`, `layout.rs`, `paint.rs`, `geometry.rs`, `profile.rs` | existing, adapted to tags | mixed |

TypeScript (`src/`): `native.ts` (host interface, payload types, validating parsers), `renderer.ts`
(persistent host config, drain loop), `commit.ts` (commit walk and payload), `events.ts` (Phase 1 dispatch, rebased on paths),
`props.ts` (native prop table and diff), `styles.ts` (compiler to layers), `types.ts`,
`components.tsx` (`View`, `Text`, `Button`, `TextInput`, `Portal`), `kit/*.tsx`.

---

## 4. Native API (GDExtension surface)

GodotJS exposes every `#[func]` in camelCase (`camel_case_bindings_enabled=true`). Check the exact
names in `demo/typings` after regenerating.

### 4.1 Commit API

| Method | Returns | Notes |
| --- | --- | --- |
| `commit(layer: i64, payload_json: GString)` | `GString` error or empty | validate the whole payload, plan, mount, style, layout, geometry, paint, queue events (3.3, 3.4) |
| `take_commit_deletions()` | `PackedInt64Array` | tags deleted by the last successful commit |

`kind` strings: `view`, `text`, `button`, `textinput`.

### 4.2 Props and style payloads

`PropsSpec` (Rust, `#[serde(rename_all = "camelCase", deny_unknown_fields)]`, every field optional).
A diff is the same shape with any field optionally `null` (reset).

| Field | Type | Phase |
| --- | --- | --- |
| `style` | `StyleLayers` (below) | F1 |
| `text` | string (`Text` only) | F1 |
| `disabled` | boolean | F1 |
| `hidden` | boolean (Suspense) | F1 |
| `testID` | string | F1 |
| `tabIndex` | `0` or `-1` | I3 |
| `autoFocus` | boolean | I3 |
| `defaultValue`, `placeholder` | string (`TextInput`) | I7 |
| `multiline`, `readOnly`, `secure`, `selectOnFocus` | boolean (`TextInput`) | I7 |
| `rows`, `maxLength` | positive / nonnegative integer (`TextInput`; `maxLength` in UTF-16 units) | I7 |
| `keyboardType` | `default\|multiline\|number\|decimal\|phone\|email\|url\|password` (1:1 with `DisplayServer.VirtualKeyboardType`) | I7 |
| `draggable` | boolean | I9 |
| `dragPreview` | `native\|none` | I9 |
| `role`, `ariaLabel`, `ariaDescription`, `ariaValueText`, `ariaPlaceholder` | string | I10 |
| `ariaHidden`, `ariaDisabled`, `ariaExpanded`, `ariaSelected`, `ariaReadOnly`, `ariaRequired`, `ariaModal` | boolean | I10 |
| `ariaChecked` | `true\|false\|"mixed"` | I10 |
| `ariaValueMin`, `ariaValueMax`, `ariaValueNow` | finite number | I10 |
| `ariaLive` | `off\|polite\|assertive` | I10 |

`StyleLayers = { layers: [{ minWidth?: number, states?: ("hover"|"active"|"focus"|"focusVisible"|"focusWithin"|"disabled")[], style: StyleSpec }] }`.
`StyleSpec` is today's style property set (`native/protocol.rs`) in longhand form, minus `disabled`
(now a prop) and minus `overflow` (replaced by `overflowX`/`overflowY`), plus these additions:

| Property | Values | Inherited | Phase | Utilities |
| --- | --- | --- | --- | --- |
| `pointerEvents` | `auto\|none` | yes | I1 | `pointer-events-auto`, `pointer-events-none` |
| `cursor` | `default\|pointer\|text\|move\|grab\|grabbing\|not-allowed\|crosshair\|wait\|progress\|help\|ew-resize\|ns-resize\|nesw-resize\|nwse-resize` | yes | I1 | `cursor-*` |
| `position` | `static\|relative\|absolute\|fixed` | no | I4 | `static`, `relative`, `absolute`, `fixed` |
| `top`, `right`, `bottom`, `left` | number, `%`, `auto` | no | I4 | `top-4`, `inset-0`, `inset-x-0`, `left-1/2`, `-top-2` |
| `zIndex` | integer | no | I4 | `z-0` … `z-50`, `z-[n]`, `-z-10` |
| `overflowX`, `overflowY` | `visible\|hidden\|scroll\|auto` | no | F1 (`visible\|hidden`), I5 (`scroll\|auto`) | `overflow-*`, `overflow-x-*`, `overflow-y-*` |
| `overscrollBehavior` | `auto\|contain` | no | I5 | `overscroll-auto`, `overscroll-contain` |
| `scrollbarWidth` | `auto\|none` | no | I5 | `scrollbar-auto`, `scrollbar-none` |
| `scrollbarColor` | hex | yes | I5 | `scrollbar-[#hex]` |
| `touchAction` | `auto\|none\|pan-x\|pan-y` | no (intersected along the path natively) | I5 | `touch-auto`, `touch-none`, `touch-pan-x`, `touch-pan-y` |
| `userSelect` | `none\|text` | yes | I6 | `select-none`, `select-text` |
| `selectionColor` | hex | yes | I6 | `selection-[#hex]` |
| `caretColor`, `placeholderColor` | hex | yes | I7 | `caret-*`, `placeholder-*` |

Variants in `styles.ts`: `sm: md: lg: xl: 2xl:` (unchanged thresholds), `hover:`, `active:`, `focus:`,
`focus-visible:`, `focus-within:`, `disabled:`, and combinations.

### 4.3 Events

Phase 1's `native/events.rs` types, plus `path: Vec<u32>` on every event (target to top-level
ancestor; empty for target `0`) and `relatedPath` on enter and leave events. Event table:

| `type` | Payload (P = `PointerData`) | Bubbles (JS) | Cancelable | Handler props | Native default action | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| `pointerdown` | P | yes | **yes** | `onPointerDown(Capture)` | focus/blur, Godot focus grab/release, selection start, gesture arbitration | 1 |
| `pointermove`, `pointerup` | P | yes | no | `onPointerMove(Capture)`, `onPointerUp(Capture)` | — | 1 |
| `pointercancel` | P | yes | no | `onPointerCancel(Capture)` | — | I2 |
| `pointerenter`, `pointerleave` | P (`relatedTarget`) | no (chain) | no | `onPointerEnter`, `onPointerLeave` | — | 1 |
| `click`, `dblclick`, `auxclick`, `contextmenu` | P | yes | no | `onClick(Capture)`, `onDoubleClick`, `onAuxClick`, `onContextMenu` | — | 1, I2 |
| `wheel` | P + `deltaX`, `deltaY` | yes | **yes** | `onWheel(Capture)` | scroll chaining | I1, I5 |
| `keydown`, `keyup` | `key`, `code`, `repeat`, `isComposing`, modifiers | yes | **yes** | `onKeyDown(Capture)`, `onKeyUp(Capture)` | 3.14, Appendix C | I3 |
| `focus`, `blur` | `relatedTarget`, `focusVisible` | yes (React semantics) | no | `onFocus`, `onBlur` | — | 1, I3 |
| `scroll` | `scrollLeft/Top/Width/Height`, `clientWidth/Height` | no | no | `onScroll` | — | I5 |
| `selectionchange` | `selectionStart`, `selectionEnd` (inputs) | no | no | `onSelectionChange` | — | I6, I7 |
| `beforeinput` | `inputType`, `data` | yes | **yes** | `onBeforeInput` | apply edit | I7 |
| `input` | `inputType`, `data`, `value`, `selectionStart`, `selectionEnd`, `eventCount` | yes | no | `onInput`, `onChange` | — | I7 |
| `compositionstart/update/end` | `data` | yes | no | `onCompositionStart/Update/End` | — | I7 |
| `dragstart` | P + `sessionId` | yes | **yes** | `onDragStart` | begin session | I9 |
| `drag`, `dragend` | P + `sessionId`, `dropEffect`, `endedOutsideRoot` | yes | no | `onDrag`, `onDragEnd` | — | I9 |
| `dragenter`, `dragleave` | P + `sessionId` | yes | no | `onDragEnter`, `onDragLeave` | — | I9 |
| `dragover`, `drop` | P + `sessionId` | yes | **yes** | `onDragOver`, `onDrop` | prevented ⇒ accept/complete | I9 |

`inputType`: `insertText`, `insertLineBreak`, `insertFromPaste`, `insertReplacementText`,
`insertCompositionText`, `deleteContentBackward`, `deleteContentForward`, `deleteWordBackward`,
`deleteWordForward`, `deleteSoftLineBackward`, `deleteSoftLineForward`, `deleteByCut`, `historyUndo`,
`historyRedo`.

Event methods (Phase 1): `#[signal] events_ready()`, `drain_events() -> GString` (JSON array),
`resolve_event(seq, default_prevented, drop_effect) -> GString`.

### 4.4 Commands and queries (by tag)

| Method | Phase |
| --- | --- |
| `get_node_rect(tag) -> GString` (JSON rect or `null`) | F3 |
| `find_by_test_id(test_id) -> i64` (tag or −1) | F3 |
| `get_snapshot() -> GString` (diagnostics; whole-tree by design) | F3 |
| `set_pointer_capture(tag, pointer_id)`, `release_pointer_capture(tag, pointer_id)`, `has_pointer_capture(tag, pointer_id)` | I2 |
| `focus_node(tag, focus_visible: i32 /* -1 modality, 0, 1 */)`, `blur_node(tag)` | I3 |
| `scroll_to(tag, left, top)`, `scroll_by(tag, dx, dy)`, `scroll_into_view(tag)` (each returns an error string or empty), `get_scroll_state(tag) -> GString` (JSON: `scrollLeft/Top/Width/Height`, `clientWidth/Height`, `min/maxScrollLeft`, `min/maxScrollTop`, `thumbs: {x, y}` root-local rectangles or null; `null` for a node that is not a scroll container) | I5 |
| `get_selection()`, `clear_selection()` | I6 |
| `set_text_and_selection(tag, event_count, value, start, end)` (`start`/`end` −1 = caret at end), `get_text_input_state(tag)` | I7 |
| `_set_text(text, emit_signal)` (Godot VK hook) | I7 |
| `_on_accessibility_action(data, tag, action)` (callback target) | I10 |

`IControl` overrides: `has_point` (I1), `get_cursor_shape` (I1), `get_focused_accessibility_element`
(I10).

### 4.5 Snapshot

`get_snapshot` keeps every field the existing verifiers read (per-node `id` (= tag), `kind`, `text`,
`parent`, `children`, `rect`, `clipRect`, `presentation`, `style`; `stats`, `width`, `height`,
`hovered`, `focused`, `pressed`, `clockMs`, `transitions`), where `style` is now the node's
**computed** style (so `disabled`, a prop since F3, is read from `props`), and adds `props`, `layer`,
`focusVisible` and the commit counters in `stats` (`commits` (= `batches`), `nodesCreated`,
`nodesUpdated` (native cannot count JS clones), `nodesDeleted`, `mutations`, `boxRecords`,
`contentRecords`); `paintIndex`, `documentIndex`, `pointers`, per-node `scroll`, `selection`,
per-input `textInput` and `drag` arrive with their phases. As built in I5, every node has `scroll` (the `get_scroll_state` object, or
`null`) and `stats` adds `scrollUpdates` and `overlayRecords`; the rects of what a scroll container paints include its offset. Node `0` stands for the main layer's root. If an existing
verifier reads a field whose meaning must change, update the verifier only to read the equivalent
field and record why.

---

## 5. Phases

Every phase lists **Files** (expected), **Tasks**, and a **Gate**. "Native gate" = the phase-done tier of
0.4.1 (unit tests, typecheck, Clippy, `pnpm verify:interaction`, `pnpm verify`, and `pnpm verify:motion` only for
the code 0.4.1 names); "Web gate" = `pnpm build:web` and `verify:interaction:web`, required only when the phase
changed Web-specific behaviour (D20). The full regression run of 0.4.1 happens at the end of each batch, not per
phase. Phases F0 to I2 were gated, as their lines say, with every verifier. Every gate also requires: Clippy 0 warnings,
README "Current limits" and `native/PROTOCOL.md` updated for what landed, `docs/INTERACTION_PROGRESS.md`
updated, a commit.

### Phase 0 — Baseline and module split — done (`9f4a02c`)

### Phase 1 — Event pipeline (finish and land)

The implementation is in the working tree (uncommitted). Its native parts (`native/events.rs`,
`native/pointer.rs` additions, the signal and re-entrancy handling in `native/lib.rs`) and its JS
dispatch (`src/events.ts`, tests) carry over to v2 unchanged in behaviour; Phase F3 rebases the JS
side on native paths.

**Files**: the Phase 1 working-tree files (`native/events.rs`, `native/pointer.rs`, `native/lib.rs`,
`src/native.ts`, `src/events.ts`, `src/renderer.ts`, `src/components.tsx`, `src/index.ts`,
`tests/recording-host.ts`, `tests/renderer.test.ts`, `tests/events.test.ts`, `demo/src/main.ts`,
`demo/src/app.tsx`, `demo/src/interaction-lab.tsx`, `demo/src/verify-interaction.ts` and `.uid`,
`demo/gen/**`, `demo/typings/**`, `scripts/build.mjs`, `scripts/verify.mjs`, `package.json`) plus new
`scripts/verify-interaction-web.mjs`.

1. Write `scripts/verify-interaction-web.mjs` modelled on `scripts/verify-web.mjs` (real Chrome input,
   DPR 1 and 2, landscape and portrait, a touch page) covering the same assertions as
   `verify-interaction.ts`.
2. Run `pnpm verify:motion`, and inspect the `artifacts/native-interaction/` PNGs.
3. Update `native/PROTOCOL.md` (events), README, and the progress log, including the dispatch-time
   table already measured.

**Gate**: native gate (including `verify:interaction`) and Web gate (including
`verify:interaction:web`).

### Phase F0 — Evidence for the Fabric core — done (`4f7dd0d`), decision D2

Results are in `docs/INTERACTION_PROGRESS.md`. Handle creation passed; reclamation failed, which led
to decision D2 (JS shadow tree). The probe stays in the tree behind the `probe` feature (`--probe` on
the build scripts) for re-measurement; its Files list also included `native/lib.rs` (`mod probe;`),
`demo/src/main.ts`, `scripts/build.mjs`, `scripts/probe-web.mjs` and the generated `probe.ts.uid` and
`.gen.ts`. GodotJS cannot pass a JS array to a typed `Array<Gd<T>>` parameter (godot-rust rejects the
untyped array, `godot-core-0.5.5/src/private.rs:539`); only untyped `VarArray` parameters work.
The original tasks are kept below as the record of what was measured.

**Files**: `native/probe.rs` (new, compiled only with cargo feature `probe`), `Cargo.toml` (feature),
`scripts/build-native.mjs` and `scripts/build-web.mjs` (pass `--features probe` when asked),
`demo/src/probe.ts` (new, run with `--probe`), `demo/src/benchmark.tsx`,
`scripts/verify-motion-web.mjs` (benchmark scenarios), `docs/INTERACTION_PROGRESS.md`.

1. **Handle cost and reclamation**, native and Web, with a probe class exposing
   `make_handle(tag) -> Gd<ProbeHandle>` (a `RefCounted` holding an `Rc<Vec<u8>>` of
   `PROBE_PAYLOAD_BYTES`) and `live_handles() -> i64` (a Rust counter incremented in construction and
   decremented in `Drop`). From JS: create `PROBE_HANDLE_COUNT` handles in a loop and record the time
   per call; drop all references; keep rendering frames and record `live_handles()` and
   `Performance.get_monitor(OBJECT_COUNT)` each second for `PROBE_RECLAIM_TIMEOUT_S`.
   **Pass**: the median create call is at most `MAX_HANDLE_CALL_US_NATIVE` / `MAX_HANDLE_CALL_US_WEB`,
   and `live_handles()` returns to its starting value within the timeout on both platforms.
2. **Props string boundary**: time `probe_parse(props_json)` for a 3-key diff and for a 40-property
   compiled style, native and Web (JS string → `GString` → `String` → `serde_json` into the real
   `PropsSpec` type once Phase F1 has it; for F0 use the current `StyleSpec`).
3. **Array of handles**: time passing a JS array of 1, 50 and 500 handles as an `Array` argument.
4. **Baseline benchmarks of the current renderer** on Web DPR 1 (extend the existing benchmark
   fixture and runner): at 50 and 2,000 cells, (a) one cell's colour changes, (b) every cell changes
   (existing), (c) the mouse sweeps across 200 cells with `hover:` styles, (d) the viewport resizes
   across the `md` breakpoint. Record JS reconcile time, commit time, native batch time, draw CPU time,
   and React commit count.
5. **Decision**: if 1 passes, proceed with native shadow nodes; otherwise use a JS-side persistent
   shadow tree whose commit sends only changed nodes to the mounting layer. Outcome: D2.

**Gate**: progress log contains every measurement with the platform, build mode and host memory
state; `cargo test` and `pnpm test` unchanged; the probe is off in default builds (check the
default `.dylib` and `.wasm` sizes are unchanged).

### Phase F1 — Props, commit validation and differ (Godot-free)

**Files**: `native/props.rs` (from `native/protocol.rs`), `native/commit.rs`, `native/diff.rs`,
`native/computed_style.rs`, `native/lib.rs` (module declarations only), Rust tests.

1. `props.rs`: `Kind`, `PropsSpec`, `StyleLayers`, `StyleSpec` longhands (`overflowX`/`overflowY`
   replace `overflow`; `disabled` moves to `PropsSpec`), `merge_diff(previous, diff_json) ->
   Result<PropsSpec, String>` with `null` resets, validation (today's `StyleSpec::validate` rules,
   kind-specific props, `deny_unknown_fields`), and `taffy_style` for a computed style. Port every
   existing `protocol.rs` test.
2. `commit.rs` per 3.4: `CommitPayload` serde types (`deny_unknown_fields`), `validate` and `plan`
   against a `MountedTree` trait (implemented by a plain test structure here and by the mounting layer in
   F3). Tests for every validation rule in 3.4 (new/duplicate/reused tags, kind change, unknown child,
   two parents, cycle, children of `Text`/`TextInput`, unattached created node, invalid prop diff),
   each asserting the mounted structure is unchanged after rejection.
3. `diff.rs` per 3.7: child-list diff producing `Remove`/`Insert` with LIS for moves; `Delete` for
   removed subtrees not re-inserted (including a subtree moved to another parent in the same payload,
   which must not be deleted). Tests: unchanged list → nothing; insert/remove/move minimal; a property
   test that applying `plan` to the old structure yields the new structure for random tree edits
   (`PROPERTY_TEST_CASES` cases, fixed seed, generator written in the test, no new crate).
4. `computed_style.rs` per 3.6: `resolve(layers, inherited, conditions) -> ComputedStyle`, inherited
   subset extraction, dirty rules, breakpoint index. Tests: layer order and overrides, state and
   breakpoint conditions, inheritance and overriding, `focus` vs `focusWithin`, propagation stops when
   inherited inputs are unchanged.

**Gate**: `cargo test`, Clippy. (No runtime change yet; `protocol.rs` may remain until F3 deletes it.)

### Phase F2 — JS style compiler, native-prop table and commit walk

**Files**: `src/styles.ts`, `src/types.ts`, `src/props.ts` (new), `src/commit.ts` (new),
`tests/styles.test.ts`, `tests/props.test.ts` (new), `tests/commit.test.ts` (new).

1. `compileStyle(className, style) -> CompiledStyle` per 3.6 (layers, longhands, interning, unknown
   classes throw, `focus-visible:` and `focus-within:` variants). Keep `resolveStyles` working until F3
   switches over, then delete it.
2. `src/props.ts`: native prop table (4.2), `nativeProps(kind, props)`, `diffNativeProps(old, new) ->
   NativePropsDiff | null` (changed keys with `null` resets; `null` when unchanged).
3. `src/commit.ts`: `buildCommit` per 3.9, pure and independent of React.
4. Tests: compile output for every utility family, variant combinations, interning identity, diff
   output and stability; `buildCommit` on hand-built instance trees: unchanged tree → empty payload
   and zero visits below the root; one changed leaf in a 2,000-node tree → one `updated` entry and a
   visit count equal to its depth; handler-only change → no entry; moves and reparenting → only the
   affected `children` entries; new subtree → `created` for each node.

**Gate**: `pnpm test:types`, `pnpm test`.

### Phase F3 — Commit API, mounting layer, render tree, persistent renderer

The cut-over. Old and new paths do not coexist; the phase ends with the old path deleted and every
existing verifier green.

**Files**: `native/lib.rs`, `native/mount.rs`, `native/render_tree.rs` (replaces
`native/render_items.rs`), `native/style_engine.rs`, `native/motion.rs`, `native/geometry.rs`,
`native/layout.rs`, `native/paint.rs`, `native/events.rs` (path), `native/protocol.rs` (deleted),
`src/renderer.ts`, `src/native.ts`, `src/events.ts`, `src/components.tsx`, `src/index.ts`, tests
(`tests/recording-host.ts` becomes a fake host that applies commit payloads to a JS structure and
records them), `demo/**` (raw strings
moved into `<Text>`, `refreshStyles` calls removed, `focus:` → `focus-within:` where needed),
verifiers, typings.

1. **Native commit API** (4.1) using `commit.rs` and `diff.rs` against the mounting layer. Regenerate
   typings.
2. **Mounting layer** (3.7): transaction application, per-tag maps replacing `Model`, `handles`,
   `visuals`, `rects`, `clips`, `content_clips`, `paint_order`, `opacities`, `items`.
3. **Style resolution wiring**: pseudo-state changes from hover/press/focus mark nodes dirty;
   viewport size changes go through the breakpoint index; `StyleEngine` incremental API by tag.
4. **Motion port**: `motion.rs` keyed by tag on mounted nodes (transitions, intrinsic tracks,
   overrides, `parent_basis`). `measure_endpoint` keeps its whole-tree probe (section 8). Run
   `verify:motion` early and often.
5. **Incremental layout and geometry** (3.7), hit testing by hierarchy, absolute-rect cache.
6. **Render tree** (3.8): box/content/scroll/overlay items, transforms, modulate, clips, draw index
   ranking, layers, selective re-recording, focus ring item. Delete the per-frame re-record in
   `draw()`.
7. **Events**: `path` on every event; hover/active/focus as native state feeding style resolution.
8. **Persistent renderer** (3.9) including the commit walk, deletions, public handles, `Portal` (layer
   1), `Text`-only strings, `Button` label as a child `Text`, `findByTestID` and `getRect` via native
   queries. Rebase `src/events.ts` on paths and `committedByTag`; keep its tests passing (update only
   how the fake host supplies paths).
9. **Delete** `apply_batch`, `Model`, `sync_model`, `protocol.rs`, `flush()`, the `committed` map,
   `resolveStyles`, `refreshStyles`.
10. **Docs**: rewrite `native/PROTOCOL.md` as the v2 native API; update `docs/MOTION_ARCHITECTURE.md`
    data-flow steps and README architecture section.

**Gate**: native gate and Web gate with unchanged assertions in `verify`, `verify:motion`,
`verify:web`, `verify:motion:web`, `verify:interaction`, `verify:interaction:web` (field-name updates
only, each recorded). Settled PNGs inspected against the Phase 1 captures.

### Phase F4 — Performance acceptance

**Files**: benchmark fixture and runner, `docs/INTERACTION_PROGRESS.md`, README performance paragraph.

Rerun every F0 benchmark scenario on the new renderer (same host, same build mode) and also record the
snapshot commit counters. **Pass** requires all of:

1. One cell changes at 2,000 cells: JS commit time (render + commit walk) and native `commit` time
   are each at most `MAX_SCALE_RATIO` × the same scenario at 50 cells; the payload size and
   `mutations` are the same at both sizes. The JS clause is evaluated on a tree with bounded fan-out
   (rows of 50 cells); a flat list of 2,000 siblings is bound by React's per-sibling work and is
   reported, not required (D8).
2. Hover sweep across 200 cells: zero React commits, zero `commit` calls, `contentRecords` and
   `boxRecords` only for nodes whose paint changed.
3. Resize across `md`: zero React commits; restyled nodes equal the nodes that use `md:` classes.
4. Every cell changes at 2,000 cells: total time per update lower than the F0 baseline (F0's reconcile
   p50 plus its draw p50, since F0 drew after its reconcile window; D10).
5. An idle frame after a commit records zero canvas-item commands (`boxRecords`/`contentRecords`
   unchanged).

If a criterion fails, profile before changing anything (AGENTS.md root cause first) and report if the
fix is not local.

**Gate**: all criteria met and recorded; native and Web gates still green (gated, as written, with every verifier).

### Phase I1 — Godot co-operation

**Files**: `native/lib.rs`, `native/mount.rs`, `native/props.rs`, `native/computed_style.rs`,
`native/events.rs`, `src/types.ts`, `src/styles.ts`, `src/events.ts`, `src/native.ts`, tests,
`demo/src/main.ts`, `demo/src/interaction-lab.tsx`, verifiers.

1. `pointerEvents` and `cursor` (computed, inherited). Hit test skips `pointerEvents: none` nodes but
   descends into children. `IControl::has_point` returns whether the hit test finds a node; it must be
   side-effect free.
2. Remove `grab_focus()` from `ready()`; `pointerdown` default action grabs or releases Godot focus
   (3.11). The demo owner calls `surface.grabFocus()` after mounting.
3. Accept Tab only when focus moved; Enter/Space only when a button was pressed/activated.
4. `set_force_pass_scroll_events(true)`; dispatch `wheel` (cancelable) for `WHEEL_*` and
   `InputEventPanGesture`; accept only when prevented (I5 adds scrolling).
5. `get_cursor_shape(at)` (Appendix A map); `viewportX/viewportY` via
   `get_global_transform_with_canvas()`.
6. **Demo**: a full-window `ColorRect` before the surface (an internal child, so the verifiers' child counts
   hold) counting `_gui_input` presses, counters in `Main._unhandledInput` for presses, wheel ticks, pans and
   keys, exposed as `passthrough()` on the demo API; a HUD (D12) whose ancestors are `pointer-events-none`,
   with `pointer-events-auto` buttons and a panel, rendered by `showHud()`.
7. **Verify** (native and Web): presses in the pass-through region reach the counters and no React
   handler; the button press does not; with no React focus `W` reaches `_unhandled_input`; after
   focusing a React button `W` still does but Tab does not; wheel over the region reaches
   `_unhandled_input`; `cursor-pointer` reports `CURSOR_POINTING_HAND` via `surface.getCursorShape` (native
   also reads `DisplayServer.cursor_get_shape()` after a real move, Web the canvas's CSS cursor); a root
   that has just entered the tree does not hold key focus; a press on a non-focusable element still clicks and
   releases key focus; Tab with nothing tabbable is not consumed; a wheel tick is consumed only when prevented;
   `viewportX` is `x` plus the root's offset.

**Gate**: native gate and Web gate.

### Phase I2 — Pointer model, touch, capture

**Files**: `native/lib.rs`, `native/pointer.rs`, `native/mount.rs`, `native/events.rs`, `src/*`
(events, native, handle), tests, demo, verifiers.

1. Per-pointer records keyed by pointer id; click counting (Appendix A); pure unit tests.
2. Ignore `DEVICE_ID_EMULATION` events (comment citing `core/input/input.cpp:926`).
3. `InputEventScreenTouch` (pressed/released/`is_canceled()`) and `InputEventScreenDrag` as touch
   pointers with implicit capture, enter/leave on down/up, shared-button click rule, multi-touch.
4. All mouse buttons, `contextmenu`, `auxclick`, `dblclick`, `detail`.
5. `set_pointer_capture`/`release_pointer_capture` with validation; handle methods
   `setPointerCapture`, `releasePointerCapture`, `hasPointerCapture` (a native query,
   `has_pointer_capture`, which the 4.4 table did not list); auto-release on up/cancel.
6. `EXIT_TREE` queues `pointercancel` for active pointers.
7. **Demo**: pointer pad showing the last 6 events; a capture-driven knob (D14: on the pointer lab page).
8. **Verify**: right click ⇒ `contextmenu`, no `click`; triple click ⇒ `detail` 1, 2, 3 and one
   `dblclick`; the knob keeps moving outside itself and the root; synthetic `ScreenTouch` (device 0) ⇒
   exactly one `pointerdown` of type touch with emulation on; Web touch tap ⇒ exactly one down/up/click
   and no `hover` state left on the element (snapshot computed style); CDP two-finger touch ⇒ two ids.

**Gate**: native gate and Web gate.

### Phase I3 — Focus and keyboard

**Files**: `native/props.rs`, `native/lib.rs`, `native/focus.rs`, `native/keymap.rs`,
`native/events.rs`, `native/computed_style.rs`, `src/props.ts`, `src/events.ts`, `src/components.tsx`,
`src/styles.ts`, tests, demo, verifiers.

1. `tabIndex`, `autoFocus` props.
2. `focus.rs`: focusable/tabbable, document order, wrap; tests (disabled ancestors, `-1`, hidden).
3. Click focus on nearest focusable ancestor-or-self; modality; focus-visible state and ring.
4. `focus_node`/`blur_node`, handle `focus()`/`blur()`, `autoFocus` at commit.
5. `keymap.rs` (Appendix B) with tests including `get_location()` codes.
6. `keydown` (cancelable, repeats) → default actions (Tab, button press) → accept rule; `keyup` →
   button click; keyboard `click` with `pointerId 0`, `pointerType ""`, `detail 0`; target 0 when no
   element is focused.
7. **Demo**: a dialog with a JS focus trap, a `tabIndex={0}` card, a key log (D14: the Keyboard lab page; it
   also has two keyed buttons that trade places, so Tab order is shown to follow the document, not creation).
8. **Verify**: Tab order is document order; the trap holds; focus ring only after keyboard focus
   (PNGs); held key ⇒ `repeat: true`; Enter on a button ⇒ one `click`, no `pointerdown`; `active:`
   style while Space is held; existing keyboard assertions still pass.

**Gate**: native gate; Web gate (browser keyboard input changed).

### Phase I4 — Positioning, z-order, overlays

**Files**: `native/props.rs`, `native/mount.rs`, `native/render_tree.rs`, `src/types.ts`,
`src/styles.ts`, `src/components.tsx`, tests, demo, verifiers. As built: also `native/stacking.rs` (new, Godot-free),
`native/layout.rs`, `native/motion.rs`, `native/snapshot.rs`, `native/lib.rs`, `src/native.ts`, `tests/recording-host.ts`,
`tests/styles.test.ts` and its fixture, `demo/src/positioning-lab.tsx` and `demo/src/labs.tsx`, `native/PROTOCOL.md`,
README; `render_tree.rs` and `components.tsx` needed no change (the overlay layer and `<Portal>` existed since F3).

1. **Evidence first**: a Rust test recording whether Taffy's `Layout.location` for an absolute
   grandchild is relative to its parent or its containing block; build the paint-parent transform on
   the observed rule and record it.
2. `position`, insets, `zIndex` → Taffy and the render tree (3.8, 3.15).
3. Unit tests: absolute escapes an `overflow-hidden` parent whose containing block is outside it;
   absolute inside a `relative` + `overflow-hidden` parent is clipped; fixed is never clipped by
   ancestors; sibling order by `zIndex` then document order; overlay layer above main.
4. **Demo**: a card with `overflow-hidden` and a menu button opening a popover in a `Portal`, anchored
   with `getRect()`, with a backdrop that closes it.
5. **Verify**: the popover covers later content and receives clicks above it; it is not clipped
   (pixel check); Tab order unchanged.

**Gate**: native gate (including `verify:motion` if it touches the layout, geometry or render code 0.4.1 names); Web gate only if the phase changed Web-specific behaviour.
Done as built (`mount.rs`, `layout.rs` and `motion.rs` changed, so `verify:motion` ran; nothing Web-specific changed, so
there is no Web gate): the progress log, Phase I4. Plan problems found: the task text says the popover is "anchored with
`getRect()`" and the plan 4.4 lists `get_node_rect`, both of which existed since F3; Taffy's stale hoisted list (D24) is not
in the plan; the verifiers' geometry check rejected every out-of-flow element (a child outside its parent, overlapping
siblings), so `verify-interaction.ts` skips out-of-flow elements in it.

### Phase I5 — Scroll containers — built on the `scroll` branch (decisions D30 to D37)

**Files**: `native/scroll.rs`, `native/mount.rs`, `native/render_tree.rs`, `native/props.rs`,
`native/lib.rs`, `native/events.rs`, `src/*`, `src/kit/ScrollView.tsx`, tests, demo, verifiers. As built: also
`native/pan.rs` and `native/scroll_input.rs` (new), `native/stacking.rs`, `native/computed_style.rs`, `native/keyboard_input.rs`,
`native/pointer_input.rs`, `native/motion.rs`, `native/snapshot.rs`, `src/kit/scroll-view.tsx` (the file name the kit uses),
`src/kit/slider.tsx`, `src/types.ts`, `src/styles.ts`, `src/native.ts`, `src/events.ts`, `src/components.tsx`, `src/renderer.ts`,
`tests/recording-host.ts`, the style fixture, `demo/src/scroll-lab.tsx`, `demo/src/labs.tsx`, `demo/src/interaction-lab.tsx`,
`demo/src/main.ts`, `scripts/verify-interaction-web.mjs`, `native/PROTOCOL.md` and the README.

1. `overflowX/Y: scroll|auto`, `overscrollBehavior`, `scrollbarWidth`, `scrollbarColor`,
   `touchAction`.
2. `scroll.rs` (pure): range/clamp incl. reversed axes, wheel/pan conversion, chaining with
   `contain`, momentum step, thumb geometry and thumb drag; tests. (Landed with the scroll and drag core; `pan.rs` adds the
   touch-pan gesture on top of it.)
3. Offsets as per-tag state → `scroll` item transform and hit-test offset; re-clamp after layout; coalesced `scroll`
   events. Scrolling must not touch Taffy, computed styles or React.
4. Wheel default action and accept rule; keyboard scrolling; touch pan with `pointercancel` and
   momentum through one `process()` activity decision that also covers motion (replacing scattered
   `set_process` calls).
5. Overlay scrollbars with mouse dragging.
6. `scroll_to`, `scroll_by`, `scroll_into_view`, `get_scroll_state`; focus scroll-into-view.
7. `ScrollView` kit component.
8. **Demo**: the interaction tab body becomes a vertical `ScrollView` (D36); a horizontal carousel; a nested
   list (chaining); an `overscroll-contain` list; all on a page of their own, `showLab('scroll')` (D14).
9. **Verify**: inner list scrolls then chains; `contain` stops chaining; wheel over non-scrollable UI
   reaches `_unhandled_input`; PageDown scrolls; Tab to an offscreen button scrolls it into view; thumb
   drag; clicks hit scrolled content; clipping pixel check; snapshot counters show no React commit and
   no re-record of scrolled content during a scroll; Web touch swipe scrolls with momentum and cancels
   the pressed item's click; `touch-none` element gets `pointermove` instead.

**Gate**: native gate; Web gate (wheel, touch and DPR scrolling are Web-specific).
Done as built: the progress log, Phase I5. Plan problems found: the Files list omitted `pan.rs`, `scroll_input.rs`, `stacking.rs`
(offsets in hit testing and geometry), `computed_style.rs` (`scrollbarColor` is inherited), `keyboard_input.rs`, `pointer_input.rs`,
`snapshot.rs` and the kit's `ScrollView` file name; Taffy has no `Overflow::Auto` (D30); a container's clip is one rectangle for
both axes, so `overflow-x-auto` alone clips vertically too; Tab stops and "does focus survive a layout" needed a geometry that
ignores scrolling (D31); the plan did not say whether a contained scroll is consumed (D32) or whether a touch pan chains
mid-gesture (D33); the verifiers' geometry checks treated what a scroll container holds as escaping its parent and the window.

### Phase I6 — Text layout and selection — done (`1071e8d`, decision D41)

**Files**: `native/text_offsets.rs`, `native/text_layout.rs`, `native/selection.rs`, `native/lib.rs`,
`native/render_tree.rs`, `native/props.rs`, `src/*`, tests, demo, verifiers.

1. `text_offsets.rs` with tests (ASCII, accents, astral emoji, ZWJ sequences, out of range).
2. `text_layout.rs` (3.17); the verifier checks `hit_test(caret_rect(i).center) == i` for every
   grapheme boundary at left/center/right alignment and wrapped lines.
3. `selection.rs` (pure) model and ranges; tests.
4. `userSelect`, `selectionColor`, gestures, copy/select-all, clearing, `selectionchange`,
   `get_selection`/`clear_selection`, `root.getSelection()` with handles and UTF-16 offsets.
5. Selection painting in `content` items.
6. **Demo**: a `select-text` article with a `select-none` sentence and a selected-text readout.
7. **Verify**: drag across two paragraphs; double and triple click; `select-none` skipped; Cmd/Ctrl+C
   to clipboard (native `DisplayServer.clipboardGet()`; Web with clipboard permissions); PNGs.

**Gate**: native gate (including `verify:motion` if it touches the layout or style code 0.4.1 names); Web gate only if the phase changed Web-specific behaviour.

### Phase I7 — TextInput — done (`539e787`, decision D44)

Four commits (I7A–I7D), each with its own native gate; the Web gate after I7D (IME and the virtual keyboard
are Web-specific), and after I7B if it changed Web-relevant code.

**Files**: `native/props.rs`, `native/text_input.rs`, `native/text_input_godot.rs`,
`native/text_layout.rs`, `native/layout.rs`, `native/mount.rs`, `native/render_tree.rs`,
`native/lib.rs`, `native/events.rs`, `src/components.tsx`, `src/props.ts`, `src/events.ts`,
`src/native.ts`, tests, demo (`export_presets.cfg` in I7B), verifiers.

**I7A — single-line core.** Kind `textinput` and its props; `EditBuffer` (pure: `Vec<char>`,
anchor/focus, `apply(EditCommand)`, `maxLength` in UTF-16 units, read-only, undo/redo with coalescing,
injected grapheme boundaries in tests); measurement per 3.18 in both measure paths and the motion probe;
rendering (value/placeholder/bullets, selection, blinking caret, horizontal scroll, `caretColor`,
`placeholderColor`); pointer caret placement and selection gestures; editing pipeline (`keydown` →
`beforeinput` → apply → `input`/`selectionchange`); `set_text_and_selection` with the event-count rule;
the `TextInput` component (`value`, `defaultValue`, `onChange`, `onBeforeInput`, `onSelectionChange`,
`onSubmit` on Enter when not composing, `placeholder`, `readOnly`, `secure`, `maxLength`,
`selectTextOnFocus`; handle `select()`, `setSelectionRange()`, `selectionStart`, `selectionEnd`,
`value`). JS tests: accepted, rejected (reverts through the command), transformed (uppercase),
uncontrolled, stale command ignored, `onSubmit`.

**I7B — IME and virtual keyboard.** Per 3.18, mirroring the cited `LineEdit` code; `_set_text`; enable
`html/experimental_virtual_keyboard` in `demo/export_presets.cfg` and record that desktop Chrome keeps
the IME path. **Verify (Web)**: CDP `Input.imeSetComposition` shows the preedit and `Input.insertText`
commits it with `compositionstart/update/end` and one `input`; on the touch page, tapping the input
focuses Godot's hidden DOM input and `page.keyboard.type('abc')` yields value `abc` with the caret at
3 and a matching React value. **Native IME** cannot be injected: record a manual check with a macOS
Japanese or Pinyin input source (screenshots), or report that it could not be done.

**I7C — clipboard and undo.** `ui_copy`, `ui_cut`, `ui_paste`, `ui_undo`, `ui_redo`; `secure` blocks
copy/cut. **Investigation (Web paste)**: reproduce whether the first paste after changing the system
clipboard is stale; record the order of the browser `paste` event, the Godot key event and the
clipboard callback; propose a fix only with a platform-causal argument (AGENTS.md "Web Fix
Validation"). The engine checkout `~/Development/godot` is shared by all of Breaka: prefer a fix in
this repository when the causal argument allows it; if the cause is in the engine, fix it there in
its own commit, rebuild the Web template per `docs/WEB.md`, and record both in the decision log.

**I7D — multi-line.** `multiline`, `rows`, wrapping, `insertLineBreak`, vertical caret movement with
desired x, line/document/page movement, internal vertical scroll with chaining, `keyboardType:
'multiline'`.

**Demo**: a form with name, password, `maxLength`, an uppercase-transforming controlled field, a
read-only field, a notes field, and a live JSON readout.

**Verify** (native; Web as above): typing, Shift+arrows and mouse selection, word navigation via the
InputMap, Backspace/Delete over an emoji ZWJ sequence, maxLength, transform, read-only, bullets and
blocked copy, undo/redo, caret visible in PNGs, horizontal scroll follows the caret, multi-line wraps
and scrolls.

**Gate**: native gate after each of I7A to I7D; Web gate after I7D.

### Phase I8 — Component kit

**Files**: `src/kit/*.tsx`, `src/index.ts`, `tests/kit.test.ts`, demo, verifiers. No native changes; if
a component turns out to need one, add it in the relevant native module and record why in the
decision log.

| Component | Built from | Keyboard |
| --- | --- | --- |
| `Checkbox` (`checked`, `indeterminate`, `onChange`) | `Button` `role="checkbox"`, box + filled inner box | Space toggles |
| `Switch` | `Button` `role="switch"`, track + spacer `width` transition + thumb | Space/Enter |
| `RadioGroup` / `Radio` | context, roving `tabIndex` | arrows move and select, wrap |
| `Slider` (`min`, `max`, `step`, `value`) | track + thumb, pointer capture | arrows ±step, Page ±10 steps, Home/End |
| `Select` (`options`, `value`) | `Button` + `Portal` listbox + backdrop | ArrowUp/Down, Enter, Escape |
| `TextField` | label `Text` + `TextInput` + helper/error `Text` | — |
| `ScrollView` | Phase I5 | — |

Each with `disabled`, controlled and uncontrolled forms, `aria-*` passthrough, WAI-ARIA keyboard
behaviour. Tests with the fake host; an "Inputs" demo section bound to one state object; verify each
by mouse, keyboard and (Web) touch.

**Gate**: native gate; Web gate only if the phase changed Web-specific behaviour.

### Phase I9 — Drag and drop — done (`400bea3`, decision D43)

**Files**: `native/drag.rs`, `native/lib.rs`, `native/pointer.rs`, `native/scroll.rs`,
`native/render_tree.rs`, `native/events.rs`, `native/props.rs`, `src/events.ts` (`DataTransfer`),
`src/native.ts`, `src/components.tsx`, tests, demo, verifiers.

1. `drag.rs` (pure) state machine `Idle → Pending → Dragging → Ended` with tests for every transition
   (touch hold vs slop, cancel paths).
2. `draggable`, `dragPreview`; arbitration (3.12 rule 3) with `pointercancel`.
3. Event sequence and outcomes (3.19); `dropEffect` via `resolve_event`; `endedOutsideRoot` and
   viewport coordinates.
4. Cursor shapes; Escape cancels (accepted).
5. Native ghost in the top-most item; `none` draws nothing.
6. Edge auto-scroll through the `process()` activity decision.
7. JS `DataTransfer` with protection modes and `effectAllowed`/`dropEffect` negotiation.
8. **Demo**: a two-column board (reorder within and across), a trash target accepting only `move`, a
   long list that auto-scrolls, a "dropped outside" readout.
9. **Verify**: reorder, cross-column move, rejected drop, Escape, auto-scroll, outside drop
   coordinates, ghost in a mid-drag PNG, no `click` after a drag; Web touch: hold then move drags,
   quick swipe scrolls.

**Gate**: native gate; Web gate (touch drags are Web-specific).

### Phase I10 — Accessibility

**Files**: `native/accessibility.rs`, `native/props.rs`, `native/lib.rs`, `src/props.ts`,
`src/components.tsx`, `src/kit/*`, `scripts/ax-dump.swift`, demo, docs.

1. `role` and `aria-*` JSX props → `PropsSpec` fields; kit components set roles and states.
2. `accessibility.rs` per 3.21 (Appendix D roles). First read `item_list.cpp` around the cited lines
   and `Control`'s accessibility handling to confirm the parent element, bounds coordinate space and
   action-callback argument order; record what you found.
3. Text inputs: `TEXT_FIELD`/`MULTILINE_TEXT_FIELD`, value, placeholder, read-only, text selection via
   `create_sub_text_edit_elements` like `LineEdit` (read its accessibility update first).
4. **Verify (macOS native)**: `scripts/ax-dump.swift` walks the Godot window's AX tree
   (`AXUIElementCreateApplication(pid)`) printing role, title/description, value and frame; a Node
   wrapper asserts the buttons, checkbox (checked), slider (value), text field (value) and scroll view
   appear with frames inside the window. The terminal needs macOS Accessibility permission once; if it
   is missing, stop and ask Ben. Record a short VoiceOver check or report that it could not be done.
   Record `DisplayServer.hasFeature(FEATURE_ACCESSIBILITY_SCREEN_READER)` on Web for the README.

**Gate**: native gate (including the AX dump); Web gate (browser accessibility is Web-specific).

### Phase I11 — World-space UI recipe

**Files**: `demo/src/world-panel.ts` (+ `.uid`), `demo/src/main.ts`, `demo/src/verify-world.ts`,
`scripts/verify.mjs`, `package.json` (`verify:world`), `docs/WORLD_SPACE.md`. No native changes.

1. `Camera3D`, a quad with an unshaded material showing a `SubViewport`'s texture; the `SubViewport`
   (transparent background) holds its own `ReactUiRoot` with a button and a `TextInput`.
2. Input forwarding from the owner's `_unhandledInput` by analytic ray–plane intersection to
   `SubViewport` pixels and `pushInput(event, true)`; keys go to the `SubViewport` while its root has
   focus.
3. A label anchored above a moving 3D node with `unprojectPosition` into an absolute element.
4. **Verify**: clicking the quad's projected button increments a counter; typing into the world
   `TextInput` works; the anchored label tracks the node; PNGs. Web: same if the Web template renders
   3D, else record the evidence and limit the claim to native.

**Gate**: native gate (including `verify:world`); Web gate only if the phase changed Web-specific behaviour.

### Phase V1 — Filters and frosted glass — done (`abdc077`, decisions D40, D49)

Read D40 first. **Files**: `native/props.rs`, `computed_style.rs`, `render_tree.rs`, `motion.rs`, a new native filter module and its
shaders, `src/types.ts`, `src/styles.ts`, a demo lab, a verifier section.

1. **API**: style props `filter` and `backdropFilter` taking CSS filter functions (`blur`, `brightness`, `contrast`, `grayscale`,
   `hue-rotate`, `invert`, `opacity`, `saturate`, `sepia`; `drop-shadow` on `filter`), validated natively at commit. Tailwind utilities
   with their scales and arbitrary values (`blur-md`, `brightness-110`, `backdrop-blur-lg`, `backdrop-saturate-150`, `blur-[6px]`, and
   so on). As in Tailwind, separate utilities compose across variants: `blur-sm hover:brightness-110` keeps the blur on hover.
2. **Native state**: `hover:`, `focus:` and breakpoint variants resolve natively with no React work. A changed filter value updates
   material parameters only, with no commit, layout or re-record. An element without a filter pays nothing, and a tree without any
   filter does no filter work on any frame.
3. **Backdrop**: shows everything already drawn in the render target, including React siblings, the main layer under a `Portal` and
   Godot content behind the root (2D and 3D). Follows the element's rounded corners and inherited opacity, and sits under its
   background and border. Stacked panels each see what is below them. Content scrolling under a fixed frosted header updates live.
   Moving, resizing or scrolling an element keeps its copy rectangle right.
4. **Filter**: applies to the element's whole subtree. Blur may extend outside the box, and ancestors' clips still apply.
5. **Blur quality**: `blur(r)` is a Gaussian with sigma `r` in logical pixels, scaled to render-target pixels. Measured against a real
   Gaussian on a hard edge, with no visible blocks at large radii and no popping as the radius changes.
6. **Transitions**: `filter` and `backdropFilter` join `TransitionProperty`, sampled natively. Matching function lists interpolate per
   function and a missing function interpolates from its identity, per CSS.
7. **Demo and verifier**: a filters lab and verifier section prove each point numerically, plus inspected PNGs.

**Gate**: native gate; Web gate (Web uses the Compatibility renderer, which is the renderer most players get); one lab run on a
`RenderingDevice` renderer. The track notes record the measured GPU cost per panel, because this is the expensive part of the feature.

### Final acceptance

All gates pass from a clean build, and the full regression run of 0.4.1 (every native and Web verifier) passes; README limits list exactly 2.3 plus anything recorded as not done;
`native/PROTOCOL.md` documents the v2 native API; `docs/MOTION_ARCHITECTURE.md` matches the new data
flow; the progress log has every gate's evidence and the F0/F4 measurements side by side.

---

## 6. Verification reference

- **Unit tests** carry the logic: Rust `props`, `shadow`, `diff`, `computed_style`, `events`,
  `pointer`, `focus`, `keymap`, `scroll`, `text_offsets`, `selection`, `text_input`, `drag`; TypeScript
  renderer, events, styles, props and kit tests against a fake host that implements the 4.1 API in JS
  and records calls (so tests can assert that a hover or an unrelated commit makes no native calls).
- **Native runtime**: real Godot input via `Input.parseInputEvent` (it buffers until the next
  iteration; settle frames before asserting). Touch: `InputEventScreenTouch`/`ScreenDrag` with
  `device = 0`.
- **Web runtime**: real Chrome input through Puppeteer and CDP (`Input.dispatchTouchEvent`,
  `Input.imeSetComposition`, `Input.insertText`) at DPR 1 and 2, landscape and portrait, plus a touch
  page.
- **Counters**: commit and paint counters in the snapshot (4.5) are how phases prove work is
  proportional to change.
- **Pixels**: clipping, z-order, selection, caret, scrollbars and ghost need pixel checks or inspected
  PNGs.
- **Known non-blocking teardown crash**: post-suite GodotJS/native shutdown crashes are expected; the
  success marker is authoritative.

---

## 7. Platform facts this design depends on

Engine source: `~/Development/godot` (`version.py` says 4.7.2 on branch `breaka-4.7.2`; the runtime
reports `4.8.beta.custom_build` in `native/api/extension_api.json`). Find code by symbol if line numbers
drift.

### 7.1 Input routing

- `_gui_call_input` marks pointer events handled at the first `MOUSE_FILTER_STOP` control unless it is
  a scroll event with `force_pass_scroll_events` (`scene/main/viewport.cpp:1740-1779`).
- Control lookup calls `has_point` (`viewport.cpp:1844-1876`); touch presses pin to
  `gui.touch_focus[index]` (`viewport.cpp:2212-2240`); screen drags go to the pinned control
  (`viewport.cpp:2262-2287`).
- Godot's drag-and-drop starts from `get_drag_data` (`viewport.cpp:2047-2093`); `ReactUiRoot` does not
  implement it.
- Keys go to `gui.key_focus` and, if unhandled, on to focus navigation and unhandled input
  (`viewport.cpp:2309-2330`).
- Touch-to-mouse emulation sets `device = DEVICE_ID_EMULATION (-1)` (`core/input/input.cpp:908-944`,
  `core/input/input_event.h:64`); Web `preventDefault()`s touch events
  (`platform/web/js/libs/library_godot_input.js:577-603`).

### 7.2 GDExtension and GodotJS

- `Control` virtuals in `extension_api.json`: `_has_point`, `_get_cursor_shape`, `_get_drag_data`,
  `_can_drop_data`, `_drop_data`, `_gui_input`; godot-rust 0.5.5 `IControl` has `has_point(&self)`,
  `get_cursor_shape(&self) -> i32`.
- `Node`: `queue_accessibility_update`, `get_accessibility_element`, virtual
  `_get_focused_accessibility_element`; notifications `ACCESSIBILITY_UPDATE (3000)`,
  `ACCESSIBILITY_INVALIDATE (3001)`, `OS_IME_UPDATE (2013)` — all variants of `ControlNotification`.
- godot-rust signals: `#[signal] fn events_ready();` in the primary `#[godot_api]` block, emitted with
  `self.signals().events_ready().emit()` through `base_mut()` re-borrowing
  (`godot-core-0.5.5/src/signal/signal_object.rs:33`, `obj/traits.rs:456-524`).
- GodotJS argument conversion: a `Dictionary` parameter accepts only an existing Godot Dictionary
  wrapper (`modules/GodotJS/bridge/jsb_type_convert.cpp:284-305`); untyped object values convert only
  if they are Godot variant/object wrappers (`jsb_type_convert.cpp:549-582`); JS arrays convert to
  `Array` and packed arrays (`jsb_type_convert.cpp:256-266`); strings to `String`/`StringName`.
- GodotJS RefCounted lifetime: binding takes one native reference; RefCounted wrappers start weak and
  are promoted to strong only while native code also holds references; the GC callback releases the
  reference (`modules/GodotJS/bridge/jsb_environment.cpp:1166-1180, 1229-1237, 1355-1425`). GodotJS
  does not report native memory to V8 (no `AdjustAmountOfExternalAllocatedMemory` in
  `modules/GodotJS`; only a manual full-GC request, `jsb_environment.cpp:3433-3450`), so native
  memory behind wrappers does not drive collection (F0, decision D2).
- A typed `Array<Gd<T>>` parameter rejects arrays from GodotJS (`godot-core-0.5.5/src/private.rs:539`);
  use untyped `VarArray` if an array parameter is ever needed.
- The JS name of `events_ready` is `eventsReady`; `Signal.connect(Callable.create(fn))` /
  `disconnect` (Phase 1).

### 7.3 Text, IME, keyboard, clipboard

- `DisplayServer`: `window_set_ime_active`, `window_set_ime_position`, `ime_get_text`,
  `ime_get_selection`, `virtual_keyboard_show(existing_text, position: Rect2, type, max_length,
  cursor_start, cursor_end)`, `virtual_keyboard_hide`, `clipboard_get/set/has`, `cursor_set_shape`,
  `has_feature` (`FEATURE_IME`, `FEATURE_VIRTUAL_KEYBOARD`, `FEATURE_CLIPBOARD`, …).
- `TextServer`: `shaped_text_hit_test_position`, `shaped_text_get_carets`, `shaped_text_get_selection`,
  `shaped_text_next/prev_grapheme_pos`, `shaped_text_get_word_breaks`, `string_get_word_breaks`.
- `TextParagraph`: `hit_test`, `get_line_rid`, `get_rid`, `get_line_range`, `get_line_size`,
  `get_line_ascent/descent`, `get_line_width`, `get_line_count`, `get_line_spacing`, `duplicate`.
- Web IME (`platform/web/display_server_web.cpp:892-935`), Web virtual keyboard
  (`library_godot_display.js:31-170`, `viewport.cpp:2856-2868`, `display_server_web.cpp:801-823`),
  Web clipboard (`display_server_web.cpp:1037-1039`), feature flags
  (`display_server_web.cpp:1227-1231`).
- `LineEdit` references: unicode rule (`scene/gui/line_edit.cpp:1053-1073`), IME window (`124-147`),
  IME update (`1694-1713`), virtual keyboard (`2255-2262`), `_set_text` (`2126-2142`), caret blink
  (`scene/gui/line_edit.h:200`).

### 7.4 React reconciler and layout

- Persistent mode in `react-reconciler` 0.33: `updateHostComponent` (`cjs/react-reconciler.development.js:9940-9970`),
  `updateHostContainer` (`9930-9939`), host text recreation (`10282-10300`), `replaceContainerChildren`
  for root and portals (`11370-11380`, `12350-12365`), config names (`17062-17068`), mutable-clone
  hooks (`16979-16984`).
- Taffy: scroll range (`…/fca167c/src/tree/layout.rs:696-830`), positioning (`…/src/style/mod.rs:354-385`),
  `Overflow::Scroll` with zero scrollbar width (`…/src/style/mod.rs:467-470`).
- Godot `ScrollContainer` behaviour to mirror: `scene/gui/scroll_container.cpp:190-226, 311-318,
  450-480, 569-610`; `ScrollBar::PAGE_DIVISOR` (`scene/gui/scroll_bar.h:116`).
- `RenderingServer` canvas items: `canvas_item_set_parent`, `canvas_item_set_transform`,
  `canvas_item_set_modulate`, `canvas_item_set_clip`, `canvas_item_set_custom_rect`,
  `canvas_item_set_draw_index`, `canvas_item_clear`, `free_rid` (today's use:
  `native/render_items.rs`). A clipping item becomes the clip owner for its whole subtree: its final
  clip rect is its global rect intersected with the parent clip, and children inherit it
  (`servers/rendering/renderer_canvas_cull.cpp:413-429`); `Control::clip_contents` is exactly
  `canvas_item_set_clip` (`scene/gui/control.cpp:4627`). Draw index sorts siblings ascending
  (`renderer_canvas_cull.cpp:1958-1966`, `ItemIndexSort` in `renderer_canvas_cull.h:111`).

---

## 8. Risks and open questions

| Risk | Mitigation |
| --- | --- |
| Native handle reclaim tied to JS GC | Measured in F0; resolved by D2 (no native shadow nodes) |
| Commit walk or payload parse grows with change size for large updates | F4 criterion 4 compares every-cell updates with the F0 baseline |
| The F3 cut-over breaks motion | `motion.rs` is ported to tags early in F3 and `verify:motion` runs throughout |
| Re-entrant JS during `gui_input` | Phase 1 rules (3.10), with runtime tests for unmount, detach and target removal |
| `focus:` semantics change (ancestors → `focus-within:`) | F3 records every affected demo/verifier usage |
| Intrinsic-size transitions clone the whole Taffy tree per endpoint measurement (`motion.rs` `measure_endpoint`) | Out of scope; recorded as the one remaining whole-tree commit-path cost; revisit with evidence |
| Canvas-item child clipping or draw-index ordering behaves differently than 3.8 assumes | 7.4 requires checking before building on it |
| Web paste is stale | I7C investigation, no fix without causal evidence |
| Native IME and VoiceOver cannot be automated | manual evidence or an explicit "not verified" |
| Taffy absolute `location` semantics | I4 task 1 measures first |

Open questions (defaults in brackets): Tab at the last element leaves the root instead of wrapping?
[wrap]. Default `userSelect` at the root? [`none`]. `Button` defaults to `cursor: pointer`? [no].

---

## Appendix A — Constants

| Constant | Value | Source / rationale |
| --- | --- | --- |
| `MAX_EVENT_DRAIN_ROUNDS` (JS) | 64 | Event-storm guard (Phase 1) |
| `MOUSE_POINTER_ID` / `KEYBOARD_POINTER_ID` / `TOUCH_POINTER_ID_BASE` | 1 / 0 / 2 | Chrome uses 1 for the mouse |
| `CLICK_COUNT_INTERVAL_MS` | 500 | Common OS double-click default; Godot exposes no interval API |
| `CLICK_COUNT_SLOP_PX` | 4 | Logical px between clicks of one sequence |
| `TOUCH_SLOP_PX` | 8 | Android touch slop (8 dp); Godot's default scroll deadzone is 0; `native/scroll.rs` (`drag.rs` imports it) |
| `TOUCH_DRAG_HOLD_MS` | 500 | Mobile long-press-to-drag; tune with evidence |
| `SCROLL_PAGE_DIVISOR` | 8 | `ScrollBar::PAGE_DIVISOR` (`scene/gui/scroll_bar.h:116`); `native/scroll.rs` |
| `MOMENTUM_DECELERATION_PX_PER_S2` / `MOMENTUM_SAMPLE_INTERVAL_S` | 1000 / 0.1 | `ScrollContainer` `drag_touching_deaccel` (`scroll_container.cpp:569-610`); `native/scroll.rs` |
| `SCROLLBAR_THICKNESS_PX` / `SCROLLBAR_MARGIN_PX` / `SCROLLBAR_MIN_THUMB_PX` | 6 / 2 / 24 | Overlay thumb; `native/scroll.rs` |
| `SCROLLBAR_THUMB_RADIUS_PX` | 3 | Half the thickness: round thumb ends; `native/render_tree.rs` |
| `DEFAULT_SCROLLBAR_COLOR` | `#64748b99` | slate-500 at 60 %; a paint constant, so `native/render_tree.rs` |
| `AUTOSCROLL_EDGE_PX` / `AUTOSCROLL_SPEED_PX_PER_SECOND` | 32 / 600 | Drag auto-scroll; tune with evidence; `native/scroll.rs`, integrated by I9 |
| `DEFAULT_SELECTION_COLOR` | `#3b82f659` | blue-500 at 35 % |
| `DEFAULT_PLACEHOLDER_ALPHA` | 0.5 | Placeholder = text colour at half alpha |
| `CARET_WIDTH_PX` | 1 | Godot default `caret_width`; confirm in the default theme |
| `CARET_BLINK_INTERVAL_MS` | 650 | `LineEdit::caret_blink_interval = 0.65` (`line_edit.h:200`) |
| `TEXT_INPUT_DEFAULT_COLUMNS` / `TEXT_AREA_DEFAULT_ROWS` | 20 / 2 | HTML `size` / `rows` defaults |
| `UNDO_LIMIT` | 100 | Per input |
| `SECURE_TEXT_BULLET` | `'\u{2022}'` | Password mask |
| `DRAG_GHOST_OPACITY` | 0.6 | Browser-like ghost |
| `PROBE_HANDLE_COUNT` / `PROBE_PAYLOAD_BYTES` / `PROBE_RECLAIM_TIMEOUT_S` | 100000 / 64 / 30 | F0 probe |
| `MAX_HANDLE_CALL_US_NATIVE` / `MAX_HANDLE_CALL_US_WEB` | 10 / 30 | F0 decision gate: a 2,000-node full clone stays within one 60 Hz frame on Web |
| `PROPERTY_TEST_CASES` | 500 | F1 differ property test |
| `MAX_SCALE_RATIO` | 2 | F4: cost at 2,000 nodes vs 50 nodes for a one-node change |

`cursor` → `Control.CursorShape`: default→ARROW, pointer→POINTING_HAND, text→IBEAM, move→MOVE,
grab→DRAG, grabbing→DRAG, not-allowed→FORBIDDEN, crosshair→CROSS, wait→WAIT, progress→BUSY,
help→HELP, ew-resize→HSIZE, ns-resize→VSIZE, nesw-resize→BDIAGSIZE, nwse-resize→FDIAGSIZE. While
dragging: allowed→CAN_DROP, not allowed→FORBIDDEN.

## Appendix B — DOM `key` and `code`

`key`: (1) if `get_unicode() >= 32`, that character; (2) else the named key; (3) else
`get_key_label()` if printable (lowercase unless Shift), so Ctrl+C gives `'c'`; (4) else
`'Unidentified'`. Named: Enter (also KP_Enter), Tab, Escape, Backspace, Delete, Insert, Home, End,
PageUp, PageDown, ArrowLeft/Right/Up/Down, Shift, Control, Alt, Meta, CapsLock, F1–F12, ContextMenu,
Pause, PrintScreen, ScrollLock, NumLock.

`code` (from `get_physical_keycode()` and `get_location()`): KeyA–KeyZ, Digit0–Digit9, F1–F12,
Numpad0–Numpad9, NumpadAdd, NumpadSubtract, NumpadMultiply, NumpadDivide, NumpadDecimal, NumpadEnter,
Enter, Tab, Space, Escape, Backspace, Delete, Insert, Home, End, PageUp, PageDown, ArrowLeft/Right/Up/
Down, ShiftLeft/Right, ControlLeft/Right, AltLeft/Right, MetaLeft/Right, CapsLock, Minus, Equal,
BracketLeft, BracketRight, Backslash, Semicolon, Quote, Backquote, Comma, Period, Slash, ContextMenu;
otherwise `'Unidentified'`.

## Appendix C — Edit commands

Match with `event.is_action(name, true)` in this order, like `LineEdit::gui_input`. M = multi-line only.
Record the actions present at runtime (`InputMap.hasAction`) in I7A.

| InputMap action | `EditCommand` | `inputType` |
| --- | --- | --- |
| `ui_text_submit` (single-line) | none natively; JS `onSubmit` | — |
| `ui_text_newline` (M) | `InsertLineBreak` | `insertLineBreak` |
| `ui_copy` / `ui_cut` / `ui_paste` | `Copy` / `Cut` / `Paste` (copy/cut not for `secure`) | — / `deleteByCut` / `insertFromPaste` |
| `ui_undo` / `ui_redo` | `Undo` / `Redo` | `historyUndo` / `historyRedo` |
| `ui_text_select_all` | `SelectAll` | — |
| `ui_text_backspace_all_to_left` / `ui_text_backspace_word` / `ui_text_backspace` | delete to line start / word / grapheme backward | `deleteSoftLineBackward` / `deleteWordBackward` / `deleteContentBackward` |
| `ui_text_delete_all_to_right` / `ui_text_delete_word` / `ui_text_delete` | delete to line end / word / grapheme forward | `deleteSoftLineForward` / `deleteWordForward` / `deleteContentForward` |
| `ui_text_caret_word_left/right` | `MoveWord(dir, extend = Shift)` | — |
| `ui_text_caret_left/right` | `MoveGrapheme(dir, extend)`; with a selection and no Shift, collapse to that side | — |
| `ui_text_caret_line_start/end` | `MoveLineEdge(dir, extend)` | — |
| `ui_text_caret_up/down` (M) | `MoveLine(dir, extend)` keeping desired x | — |
| `ui_text_caret_page_up/down` (M) | `MovePage(dir, extend)` | — |
| `ui_text_caret_document_start/end` (M) | `MoveDocumentEdge(dir, extend)` | — |
| no action, no Ctrl/Alt/Meta, `unicode >= 32` | `InsertText(char)` | `insertText` |

## Appendix D — Roles

| `role` | `AccessibilityServer.AccessibilityRole` |
| --- | --- |
| implicit `Button` / `button` | BUTTON |
| `checkbox` / `switch` / `radio` | CHECK_BOX / CHECK_BUTTON / RADIO_BUTTON |
| `radiogroup`, `group` | CONTAINER (name from `ariaLabel`) |
| `slider` / `progressbar` | SLIDER / PROGRESS_INDICATOR |
| implicit `TextInput` / `textbox` | TEXT_FIELD, or MULTILINE_TEXT_FIELD |
| implicit `Text` / `text` | STATIC_TEXT |
| `link` | LINK |
| `list` / `listitem` / `listbox` / `option` | LIST / LIST_ITEM / LIST_BOX / LIST_BOX_OPTION |
| `combobox` | BUTTON with a popup type (copy what Godot's `OptionButton` does; record it) |
| `menu` / `menuitem` / `menuitemcheckbox` / `menuitemradio` | MENU / MENU_ITEM / MENU_ITEM_CHECK_BOX / MENU_ITEM_RADIO |
| `tablist` / `tab` / `tabpanel` | TAB_BAR / TAB / TAB_PANEL |
| `dialog` | DIALOG (`FLAG_MODAL` when `ariaModal`) |
| `img` / `region` / `tooltip` | IMAGE / REGION / TOOLTIP |
| implicit scroll container | SCROLL_VIEW |
| `none` / `presentation` | not exposed; children attach to the nearest exposed ancestor |

Flags: `disabled`/`ariaDisabled` → FLAG_DISABLED, `ariaHidden` → not exposed, `ariaReadOnly` →
FLAG_READONLY, `ariaRequired` → FLAG_REQUIRED, `ariaModal` → FLAG_MODAL, clipping → FLAG_CLIPS_CHILDREN.
