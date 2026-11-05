# Interaction architecture and implementation plan

Status: plan, not implemented. Written 6 November 2026 against commit `636242b`.

This document is the complete brief for adding Godot-cooperative input, touch, focus and keyboard,
positioning, scrolling, text selection, text input (with IME and on-screen keyboards), a small input
component kit, HTML-style drag and drop, accessibility, and world-space (3D) use to `godot-react-ui`.
It is written so an implementer can execute it phase by phase without re-deciding the architecture.
Where this document says **must**, it is a contract. Where it says *suggested*, use judgement and
record what you chose.

---

## 0. Read this first

### 0.1 How to execute this plan

1. Read sections 0–4 in full before touching code. Sections 5.x are the phases; do them **in order**.
2. Before each phase, read every file listed under that phase's **Files** in full in the current session.
3. Work one task at a time. After each task, run that task's tests. After each phase, run the phase
   **Gate**. Do not start the next phase until the gate passes.
4. Record every phase gate in `docs/INTERACTION_PROGRESS.md` (created in Phase 0): commands run,
   pass/fail counts, artifact paths you inspected, anything you chose that this plan left open.
5. Commit at the end of each phase (and optionally after each passing task) in the `godot-react-ui`
   repository. Never push.

### 0.2 Stop-and-report conditions

Stop, write the evidence into `docs/INTERACTION_PROGRESS.md`, and report instead of improvising when:

- a Godot, GodotJS, godot-rust, Taffy or browser API named here does not exist, has a different
  signature, or behaves differently than this document states (paste the exact error or source line);
- a gate fails twice after you have identified and fixed a root cause;
- you need a semantic decision this document does not make;
- a change would require editing generated output (`dist/`, `target/`, `demo/.godot/`, `artifacts/`).

### 0.3 Rules that apply to every task

These come from `../AGENTS.md` (the breaka-platform root). Read that file once; the rules most
relevant here are:

- **Root cause first.** Reproduce, gather evidence (logs, PNGs, snapshots, debugger), then change
  behaviour. No speculative fixes, no guards that hide bugs, no swallowed errors.
- **Type safety.** No `as any`, no `as unknown as T`, no unproven `as T`, no non-null `!` in
  TypeScript. In Rust, never `unwrap()` data that came from JS or Godot; return an error string the
  way `apply_batch` does. `expect("…")` is only for invariants this code itself established, with a
  message that states the invariant (existing style in `native/lib.rs`).
- **Exhaustiveness.** Rust `match` on protocol enums must not use `_ =>` arms. TypeScript switches
  over unions must be exhaustive through the function's return type, the way `eventHandler` in
  `src/renderer.ts` is. (`@breaka/core` is not a dependency of this repository; do not add it.)
- **No magic numbers.** Every tuning value gets a named `const` next to its use with a comment saying
  where the value came from. Appendix A lists the constants this plan introduces.
- **Godot launches** always use `GODOT=/Applications/Godot48.app/Contents/MacOS/Godot` and pass
  `--audio-driver Dummy`. The existing scripts already do; keep it that way in every new script.
  Visual Godot runs started from a sandboxed shell can abort in AppKit with exit 134; rerun with host
  permissions, it is not a project bug.
- **Generated files.** After adding or changing any `#[func]`, `#[signal]` or class on
  `ReactUiRoot`, run `pnpm build:native && pnpm gen:types` and commit the regenerated
  `demo/typings/*.d.ts` and `demo/gen/**`. Commit `.uid` files with their sources.
- **Do not rewrite working code** that this plan does not ask you to change. The motion system
  (`native/style_engine.rs`, intrinsic transitions in `native/lib.rs`) must keep passing
  `pnpm verify:motion` unchanged.
- **Inspect the PNGs** a verifier writes when a phase changes anything visual. Assertions alone are
  not acceptance.
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
cargo clippy --locked --all-targets  # baseline: 0 warnings (Phase 0)
pnpm build:native                    # release extension into demo/addons/godot-react-ui/bin
pnpm gen:types                       # regenerate GodotJS typings after native API changes
pnpm build                           # typecheck + bundle (verify scripts also run this)
pnpm verify                          # native baseline workflow, 2 viewports
pnpm verify:motion                   # native motion workflow, 2 viewports
pnpm verify:interaction              # native interaction workflow (added in Phase 1)
```

Web (see `docs/WEB.md` for toolchain requirements):

```sh
pnpm build:web
pnpm demo:web                        # serves http://127.0.0.1:8096; run in the background
pnpm verify:web
pnpm verify:motion:web
pnpm verify:interaction:web          # added in Phase 1
```

Other tools on this Mac also run this demo: other `serve-web.mjs` servers (8096 has been taken) and a
Godot demo process that maps the installed dylib and owns the GodotJS debugger port 9229 (a benign
"debugger disabled" log line). Never stop processes you did not start. Serve on a port you have
checked is free and point the verifiers at it; the verifiers will happily test a stale server:

```sh
lsof -nP -iTCP:8097 -sTCP:LISTEN     # must print nothing
PORT=8097 pnpm demo:web              # in the background
GODOT_REACT_WEB_URL=http://127.0.0.1:8097 pnpm verify:web   # same variable for every Web verifier
```

Stop your server when the Web gate is done. Bound every wait: no verifier may run longer than its
deadline, and you must check the process and its log if it stalls. `artifacts/web-verification/failure.png`
is never cleared by the verifier, so judge a run by its report and log, not by that file.

Baseline at `636242b` (run 6 November 2026): `cargo test` 19 passed, `pnpm test` 13 passed,
`pnpm test:types` clean. Phase 0 baseline (`7f0a96c`): Clippy 0 warnings, `verify:web` 249 assertions,
`verify:motion:web` 433 assertions; see `docs/INTERACTION_PROGRESS.md`.

---

## 1. Where the code is today

One Godot `Control`, `ReactUiRoot` (`native/lib.rs:101`), owns the whole React tree. React elements
are not Godot nodes. Per element the native side keeps an authored model node
(`native/protocol.rs:444`), a Taffy layout node, a retained Stylo node for transitions
(`native/style_engine.rs`), paint resources (`Visual`: a `StyleBoxFlat` and an optional
`TextParagraph`, `native/lib.rs:48`), and two `RenderingServer` canvas items (`RenderItems`:
`paint` and `text`, `native/render_items.rs`). `draw()` (`native/lib.rs:332`) records each element's
commands into its own canvas items in paint order with per-item rectangular clips.

JS (`src/renderer.ts`) is a `react-reconciler` host. On commit it diffs the committed host tree and
sends one JSON batch (`create`, `style`, `text`, `children`, `remove`) through `applyBatch`. Native
input is queued as JSON events (`drainEvents`) and dispatched by JS once per frame when the Godot
owner calls `dispatchEvents()` from `_process` (`demo/src/main.ts:128`).

What input does today (`native/lib.rs:258-326`):

| Area | Today |
| --- | --- |
| Pointer | Mouse motion and **left** button only. Hit test walks `paint_order` in reverse, honouring inherited clips (`native/lib.rs:857`). |
| Touch | Works only through Godot's `emulate_mouse_from_touch` (enabled in `demo/project.godot`). `InputEventScreenTouch/Drag` are ignored. |
| Godot boundary | `mouse_filter = STOP` (`native/lib.rs:187`) and the root grabs Godot keyboard focus in `ready()` (`native/lib.rs:215`). Every pixel of the root swallows pointer events; Tab is always swallowed. |
| Focus | Only `Button`s are focusable. Tab/Shift-Tab wrap in paint order (`native/lib.rs:941`). Enter/Space activate. Focus ring always drawn for the focused element. |
| Keyboard | Only Tab, Enter, KP_Enter, Space are looked at. Echo (repeat) is ignored. No key events reach JS. |
| Events to JS | `pointerdown/up/move/enter/leave`, `click`, `focus`, `blur` with `{id,type,x,y}`. Delivered a frame later. `stopPropagation()` works in JS; there is no `preventDefault()` and nothing JS does can change what Godot sees. |
| Scrolling, text selection, text input, drag and drop, accessibility, positioning/z-index | Not implemented. `overflow` supports `visible|hidden`. |

The README's "Current limits" section lists the same gaps.

---

## 2. Scope

### 2.1 Goals

1. **Godot-cooperative events.** Empty or `pointer-events: none` UI regions let pointer events
   through to Godot `Control`s underneath and to `_unhandled_input` (the game). Keyboard input
   belongs to the game unless a React element has focus. Unconsumed wheel events reach the game.
2. **HTML-like event semantics.** Capture and bubble phases, `stopPropagation()`, and
   `preventDefault()` that actually cancels native default actions and tells Godot the event was
   handled. Pointer events with ids, types, buttons and modifiers. Key events with DOM `key`/`code`.
3. **Touch** as first-class pointers (multi-touch ids, implicit capture, no sticky hover, cancel on
   pan), without double handling from Godot's touch-to-mouse emulation.
4. **Focus**: `tabIndex`, `autoFocus`, `focus()`/`blur()`, `:focus-visible`, focus traps buildable in
   JS.
5. **Positioning**: `position` (`relative|absolute|fixed`), insets, `zIndex` with CSS-like stacking,
   portals for popovers.
6. **Scroll containers**: `overflow: scroll|auto` per axis, wheel/trackpad/touch/keyboard scrolling,
   scroll chaining, overlay scrollbars, `onScroll`, programmatic scrolling, scroll-into-view.
7. **Text selection** of ordinary text with `user-select: text`, opt-in (off by default for games).
8. **Text input**: `<TextInput>` single and multi-line, owned natively inside `ReactUiRoot`, with
   caret, selection, IME composition, Web/mobile virtual keyboard, clipboard, undo/redo, controlled
   and uncontrolled React semantics.
9. **Component kit** built only from primitives: Checkbox, Switch, RadioGroup, Slider, Select,
   TextField, ScrollView.
10. **HTML-style drag and drop** inside a root: `draggable`, `DataTransfer`, the full drag event
    sequence, drop acceptance through `dragover` + `preventDefault()`, drag ghost, edge auto-scroll,
    and a usable result when a drag ends outside the UI (for game-world drops).
11. **Accessibility** through Godot's `AccessibilityServer` sub-elements.
12. **World-space UI**: a documented and verified recipe for `ReactUiRoot` inside a `SubViewport` on a
    3D quad, with input forwarding, plus screen-space anchoring of UI to 3D positions.

### 2.2 Non-goals for this plan

Write these into the README limits when the plan is complete; do not half-implement them:

- Child Godot `Control`s per element, including `LineEdit`/`TextEdit` (see 3.1).
- A custom engine module. Everything here uses APIs already exposed to GDExtension (section 7). If a
  Web engine bug is proven, fix it in the engine sources (`~/Development/godot/platform/web`), not with
  an export-time patch, and only after reporting it.
- Godot drag-and-drop interop (`_get_drag_data`/`_can_drop_data`/`_drop_data`) between React and other
  Godot `Control`s. Section 3.13 explains why and what replaces it.
- Touch text selection handles, long-press context menus, native context menus, spellcheck, rich text
  editing, `contenteditable`.
- Smooth (animated) programmatic scrolling, overscroll bounce, `position: sticky`, CSS transforms,
  rounded clip masks, list virtualization in native (JS can virtualize with `onScroll` + absolute
  positioning).
- Pen-specific pointer data (pen input is reported as `mouse`).

---

## 3. Architecture

### 3.1 Invariants (unchanged from today, and binding)

1. **One `Control` per root.** No per-element `Node`, `Control`, `LineEdit` or `TextEdit`. A child
   `LineEdit` would sit outside the `RenderItems` draw-index sequence (React overlays could not cover
   it), would not inherit per-element clips (scroll containers, `overflow: hidden`), and would take
   Godot key focus from `ReactUiRoot`, firing `FOCUS_EXIT` (`native/lib.rs:232`) and wiping element
   focus. Every primitive `LineEdit` uses is exposed to GDExtension instead (section 7.3).
2. **Native owns geometry and interaction state**: layout, hit testing, clips, scroll offsets, focus,
   pointer state, text buffers, selections, drag sessions, accessibility elements. **JS owns
   semantics**: handlers, application state, and the decision to `preventDefault()`.
3. **Every JS→native mutation is validated** against a staged model before native state changes
   (`apply_batch`, `native/lib.rs:425`). New commands follow the same rule and return an error string,
   never panic on JS data.
4. **IDs** are JS-allocated `u32` handles; `0` is the permanent viewport root; IDs are never reused.
5. **Main thread only.** No threads, no deferred calls for correctness.

### 3.2 Module layout (target)

Rust (`native/`). Inherent `impl ReactUiRoot` blocks may live in any of these modules: private
fields of a struct defined in the crate root are visible to its child modules. Methods, types and
functions defined in a child module are not visible to `lib.rs` or sibling modules unless marked
`pub(crate)` (Phase 0 showed `error[E0624]` otherwise); use `pub(crate)`, never `pub`, for anything
used across modules. All `#[func]` and `#[signal]` declarations stay in the primary `#[godot_api]`
block in `lib.rs` (godot-rust does not allow signals in secondary blocks) and delegate.

| Module | Contents | Godot-free (unit-testable)? |
| --- | --- | --- |
| `lib.rs` | `ReactUiRoot` struct, `IControl` impl, `#[func]`/`#[signal]` surface, wiring | no |
| `protocol.rs` | commands, `StyleSpec`, `PropsSpec`, `Kind`, `Model` | yes |
| `events.rs` | event payload types, `EventQueue`, outcomes | yes |
| `geometry.rs` | `BoxRect`, clip math, geometry pass, stacking/paint order, hit test | yes |
| `pointer.rs` | per-pointer state, click counting, gesture arbitration, button activation helpers | yes |
| `focus.rs` | focusable/tabbable rules, document-order navigation, modality | yes |
| `keymap.rs` | Godot `Key` → DOM `key`/`code` | yes |
| `scroll.rs` | scroll state, clamping, wheel/pan conversion, chaining, momentum, scrollbar geometry | yes |
| `text_offsets.rs` | UTF-16 ↔ code point offset conversion | yes |
| `text_layout.rs` | caret/selection/hit geometry over `TextParagraph` + `TextServer` | no |
| `selection.rs` | static text selection model | yes |
| `text_input.rs` | `EditBuffer` (text, selection, commands, undo), IME state | yes |
| `text_input_godot.rs` | IME/virtual keyboard/clipboard glue | no |
| `drag.rs` | drag-session state machine | yes |
| `accessibility.rs` | role mapping and `AccessibilityServer` element registry | no |
| `motion.rs` | existing transition/intrinsic code moved out of `lib.rs` (Phase 0) | mixed |
| `layout.rs` | Taffy measurement (`compute_tree` and the leaf measure) | no |
| `paint.rs` | colour helpers, selection/caret/scrollbar drawing helpers | no |
| `render_items.rs`, `style_engine.rs`, `profile.rs` | unchanged except where a phase says | — |

TypeScript (`src/`):

| File | Contents |
| --- | --- |
| `native.ts` | wire types and validating parsers for commands, events, queries |
| `events.ts` | synthetic event objects, handler-prop table, capture/bubble dispatch, enter/leave chains, `DataTransfer` |
| `renderer.ts` | host config, commit diff (style **and** props), event drain loop |
| `props.ts` | `UIProps` → native `PropsSpec` resolution and validation |
| `components.tsx` | `View`, `Text`, `Button`, `TextInput`, `Portal` |
| `styles.ts`, `types.ts` | new style properties and utilities |
| `kit/*.tsx` | Checkbox, Switch, RadioGroup, Slider, Select, TextField, ScrollView |

Demo (`demo/src/`): a new tab, **04 Interaction** (`interaction-lab.tsx`), and a new native verifier
`verify-interaction.ts` started with `--verify-interaction`; plus `scripts/verify-interaction-web.mjs`.

### 3.3 Event pipeline v2: synchronous dispatch

**Problem.** Godot needs to know *inside* `gui_input` whether an event was consumed
(`accept_event()`), and HTML semantics need `preventDefault()` to cancel default actions (focus
change, text insertion, scrolling, drop acceptance) before they happen. Today JS sees events a frame
later, so neither is possible.

**Decision.** Input-originated events are dispatched to JS **synchronously** from inside the Godot
input callback, through a Godot signal, and JS reports `preventDefault()` back before the signal
returns. JS and native share the main thread, so this is the browser model, not an IPC round trip.

Evidence that this is supported:

- godot-rust 0.5.5 supports re-entrant calls into the same object while a `base_mut()` guard is held
  (`~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/godot-core-0.5.5/src/obj/traits.rs:456-501`,
  example "We can call back into `self` through Godot"). Typed signal emission from `&mut self` goes
  through `base_mut()` re-borrowing for exactly this reason (`…/godot-core-0.5.5/src/signal/signal_object.rs:33`).
  So a JS handler connected to a `ReactUiRoot` signal may call `applyBatch`, `drainEvents` and
  `resolveEvent` on the same root while Rust is inside `gui_input`.
- Godot signals call connected `Callable`s synchronously (no `CONNECT_DEFERRED`).
- React's own model for discrete events (click, keydown) is a synchronous flush at the end of the
  event; `reconciler.flushSyncWork()` already does this (`src/renderer.ts:424`).

**Mechanics.**

```
Godot Viewport ──gui_input(event)──▶ ReactUiRoot (Rust, &mut self)
   1. update native pointer/focus state, hit test, build event(s)
   2. queue preceding non-cancelable events (enter/leave, …)
   3. for a cancelable event E:
        queue E with cancelable=true, remember seq(E) as awaited
        emit signal events_ready()           ── re-entrant JS ──▶
            JS UIRoot.dispatchEvents():
              loop: events = drainEvents(); for each: dispatch capture/bubble
                    if event.cancelable: resolveEvent(seq, defaultPrevented, dropEffect)
                    flushSyncWork()          (may call applyBatch re-entrantly)
              until drainEvents() is empty
        ◀── signal returns
        outcome = awaited outcome or "not prevented"
   4. if root left the tree during step 3: return (no default actions)
   5. re-validate everything computed in step 1 (targets may be gone, geometry may have moved)
   6. if !outcome.defaultPrevented: run E's default action (may queue more events, e.g. focus)
   7. accept_event() if outcome.defaultPrevented || a default action was performed (keys/wheel)
   8. if events are still queued: emit events_ready() once more (non-cancelable delivery)
```

Rules (all **must**):

1. Only **input-origin entry points** emit `events_ready`: `gui_input`, the IME notification
   (`OS_IME_UPDATE`), the virtual-keyboard text hook `_set_text`, and accessibility action callbacks.
   Nothing called from JS (`apply_batch`, focus/scroll methods) and no lifecycle notification
   (`READY`, `ENTER_TREE`, `EXIT_TREE`, `PREDELETE`, `RESIZED`, `FOCUS_EXIT`, `MOUSE_EXIT`) and not
   `process()` emits; events they generate are queued and delivered by the next emit or by the owner's
   per-frame `dispatchEvents()` (which stays).
2. `dispatch_depth: u32` guards nesting. If an input entry point runs while `dispatch_depth > 0`
   (possible if JS calls `Viewport.pushInput` from a handler), its events are queued with
   `cancelable: false` and no emit happens; the outer JS drain loop delivers them.
3. After the signal returns, every id, rect, focus or capture value computed before it is stale. The
   compiler prevents holding borrows across the emit; you must also not trust copied values. Look
   nodes up again (`self.model.nodes.contains_key`), and skip the default action if its target is gone.
4. If `!self.base().is_inside_tree()` after the emit (JS unmounted or detached the root), stop.
5. `resolve_event(seq, …)` is only valid for the currently awaited seq; anything else returns an
   error string and JS throws. Events delivered without awaiting are serialized with
   `cancelable: false`, so JS never resolves them.
6. A JS handler that throws must not break the loop: the renderer records the error (existing
   `container.failure` / `onError` path), still calls `resolveEvent` with the state reached so far,
   finishes the loop, then rethrows at the end of `dispatchEvents()` (GodotJS reports it). No silent
   swallowing.
7. The JS drain loop is bounded (`MAX_EVENT_DRAIN_ROUNDS`, Appendix A) and throws if exceeded; an
   unbounded loop is an event storm bug, not a condition to tolerate.
8. `pointermove` is queued and delivered by the step-8 emit at the end of the same `gui_input`; it is
   not cancelable. Godot accumulates mouse motion by default, so this is about one emit per frame.

**Wiring in JS.** `createRoot(host, options)` gains a **required** option
`subscribeToEvents(listener: () => void): () => void`. The Godot owner implements it by connecting a
`Callable` to the root's `eventsReady` signal and returning a disconnect function; `unmount()` must
call it (a GodotJS `Callable` holds its function strongly, so a forgotten connection leaks the whole
root). Tests pass a fake. `dispatchEvents()` remains public and the owner keeps calling it each frame
for queued events.

```ts
// demo/src/main.ts (shape; verify the exact signal property name in demo/typings after gen:types)
const renderer = createRoot(surface, {
  now: () => Time.getTicksUsec() / MICROSECONDS_PER_MILLISECOND,
  subscribeToEvents: (listener) => {
    const callable = Callable.create(listener);
    surface.eventsReady.connect(callable);
    return () => surface.eventsReady.disconnect(callable);
  },
});
```

### 3.4 The Godot co-operation contract

This table is the contract between the UI and the rest of the Godot scene. Godot behaviour is cited
from the engine sources in section 7.

| Godot input | Reaches `ReactUiRoot` when | Consumed (game does not see it) when |
| --- | --- | --- |
| Mouse button / motion, `ScreenTouch`, `ScreenDrag`, gestures | `_has_point(p)` is true, i.e. the native hit test finds an element at `p` whose effective `pointerEvents` is `auto`. During a press Godot keeps routing to the pressed control (`gui.mouse_focus`, `gui.touch_focus`) regardless. | Always, once it reaches the root: `MOUSE_FILTER_STOP` marks pointer events handled (`viewport.cpp:1764`). Pass-through is therefore decided only by `_has_point`. |
| Wheel (`WHEEL_*` buttons), `InputEventPanGesture` | same as pointer | Only if JS called `preventDefault()` on `wheel`, or a scroll container scrolled. The root sets `force_pass_scroll_events = true` so Godot does not auto-consume scroll events (`viewport.cpp:1764`); the root calls `accept_event()` explicitly. |
| Keys | the root has Godot key focus (`viewport.cpp:2313`). The root only takes key focus when a React element is focused, a text selection is started, or the owner calls `grabFocus()`. | Only if JS called `preventDefault()` on `keydown`/`keyup`, or a native default action ran (focus moved, button pressed/activated, text edited, scrolled, copied, drag cancelled). Unconsumed keys continue to Godot focus navigation and `_unhandled_input`. |

Consequences the implementer must keep:

- **No focus stealing.** `ready()` no longer calls `grab_focus()` (`native/lib.rs:215`). The demo
  owner calls `surface.grabFocus()` after mounting to keep the demo's keyboard-first behaviour.
- **Pressing a non-focusable element** (and not starting a selection) clears element focus and calls
  `release_focus()` if the root had Godot focus, so the keyboard returns to the game, like clicking a
  page background in a browser.
- **Transparent elements still catch pointers.** As in HTML, a `View` with no background is a hit
  target. Full-screen HUD containers use `pointer-events-none` and re-enable children with
  `pointer-events-auto`.

### 3.5 Pointer model

- **Ids.** `pointerId` `1` is the mouse. Touch pointers are `TOUCH_POINTER_ID_BASE + touch index`.
  `0` is reserved for synthetic keyboard activation (`click` from Enter/Space has `pointerType: ""`,
  `pointerId: 0`, `detail: 0`, as in browsers).
- **Types.** `"mouse" | "touch" | ""`. Pen is reported as mouse (non-goal).
- **Emulation rule.** Godot synthesizes mouse events from touch (and optionally touch from mouse) and
  marks every synthesized event with `device == InputEvent.DEVICE_ID_EMULATION` (`-1`)
  (`core/input/input.cpp:926`, `core/input/input_event.h:64`). The root **ignores every input event
  whose device is `-1`** and handles real `InputEventScreenTouch`/`ScreenDrag` as touch pointers.
  This removes double handling regardless of the project's emulation settings. The Web platform calls
  `preventDefault()` on touch events (`platform/web/js/libs/library_godot_input.js:596`), so browsers
  do not add compatibility mouse events either.
- **Buttons.** DOM `button`: 0 left, 1 middle, 2 right, 3 back (`XBUTTON1`), 4 forward (`XBUTTON2`);
  `-1` for moves. DOM `buttons` bitmask: 1 left, 2 right, 4 middle, 8 back, 16 forward (map from
  Godot's `MouseButtonMask` explicitly; do not assume equal bit values for the extra buttons).
- **Clicks.** `click` for the primary button (left mouse, touch), `auxclick` for others, `contextmenu`
  on right-button press, `dblclick` after the second `click`. `detail` is the click count, computed
  natively (`CLICK_COUNT_INTERVAL_MS`, `CLICK_COUNT_SLOP_PX`); Godot's `double_click` flag is not used
  because triple clicks are needed for selection. The existing rule that padding and label of the same
  enabled button activate it (`shared_button_target`, `native/lib.rs:999`) stays.
- **Hover.** Only the mouse sets the `hover:` pseudo-state. Touch pointers dispatch
  `pointerenter`/`pointerleave` (down/up) but never set `hover`, which removes sticky hover after taps.
- **Enter/leave semantics (DOM).** Native emits one `pointerleave` (target = old deepest hit,
  `relatedTarget` = new) and one `pointerenter` (target = new, `relatedTarget` = old). JS dispatches
  `onPointerLeave` to each element from the old target up to (not including) the lowest common
  ancestor, then `onPointerEnter` from below the common ancestor down to the new target. They do not
  bubble. (Today every ancestor's enter/leave handler runs on every child-to-child move; that is a
  bug this fixes.)
- **Capture.** `handle.setPointerCapture(pointerId)` (valid only while that pointer is down) makes
  `pointermove/up/cancel` for that pointer target the capturing element. Touch pointers are implicitly
  captured to their `pointerdown` target, as in browsers. Godot already routes a pressed mouse/touch to
  the root even outside its rectangle, so capture works past the root edge.
- **Cancel.** `pointercancel` is sent to the pointer's target when: a touch pan becomes a scroll, a
  drag starts, the touch is cancelled by the OS (`ScreenTouch.canceled`), or the root leaves the tree.
  No `click` follows a cancel.
- **Gesture arbitration** (per primary pointer, after an un-prevented `pointerdown`):
  1. JS took pointer capture → no native gesture.
  2. Mouse on the thumb of an overlay scrollbar → thumb drag.
  3. Inside a `draggable` element: mouse moves past the viewport's drag threshold
     (`Viewport.get_drag_threshold()`, the same value Godot uses, `viewport.cpp:2052`), or touch held
     for `TOUCH_DRAG_HOLD_MS` without exceeding `TOUCH_SLOP_PX` → drag-and-drop session.
  4. Touch moved past `TOUCH_SLOP_PX` and the effective `touchAction` along the path to the nearest
     scroll container allows panning in the dominant axis, and that container can scroll that way →
     pan-scroll (`pointercancel` to JS).
  5. Mouse on selectable text → selection drag.
  6. Otherwise plain pointer events.

### 3.6 Focus model

- **Focusable**: `Button`, `TextInput`, and any element with `tabIndex` set. `tabIndex` accepts only
  `0` (focusable, in tab order) and `-1` (focusable programmatically and by click, not by Tab). Other
  values are rejected by validation (positive tab indices are a known accessibility anti-pattern).
- **Tabbable**: focusable, effective `tabIndex == 0`, not disabled (self or ancestor), visible for
  input (non-zero rect intersecting its clip, `visible_for_input`, `native/lib.rs:875`).
- **Order**: document order (pre-order of the model tree), **not** paint order. Paint order changes
  with `zIndex` (Phase 5); tab order must not.
- **Tab** moves focus and wraps, as today. Shift-Tab goes backwards. Tab is accepted only when focus
  moved.
- **Click focus**: an un-prevented primary `pointerdown` focuses the nearest focusable ancestor-or-self
  of the hit element; if there is none, see 3.4 (blur and release).
- **`:focus-visible`**: native tracks the last input modality (keyboard vs pointer). Focus from Tab,
  or from `focus()` while the modality is keyboard, is focus-visible. The native focus ring is drawn
  only for focus-visible focus, and the renderer exposes a `focus-visible:` style variant.
- **Programmatic**: `handle.focus({ focusVisible?: boolean })`, `handle.blur()`. Focus on an element
  that is not focusable is an error. `focus()` also grabs Godot key focus for the root.
- **`autoFocus`**: when an `autoFocus` element is first mounted and visible, it is focused (first in
  document order among those created in the batch wins) and the root grabs Godot focus.
- **Focus traps / roving focus** (dialogs, radio groups, menus) are JS components built from
  `onKeyDown` + `preventDefault()` + `focus()`; no native trap primitive.
- Godot `FOCUS_EXIT` (another `Control` took focus) blurs the focused element, as today.

### 3.7 Keyboard model

- `keydown` and `keyup` go to the focused element, or to root listeners
  (`root.addEventListener`) when the root has Godot focus but no element is focused.
- Echo events are delivered as `keydown` with `repeat: true` (needed for held Backspace/arrows).
  Button activation ignores repeats, as today.
- `key` and `code` follow the DOM (`keymap.rs`, Appendix B). Modifiers: `shiftKey`, `ctrlKey`,
  `altKey`, `metaKey`.
- Default actions run only if the `keydown`/`keyup` was not prevented. Text editing commands are
  recognised through Godot's built-in `ui_text_*`, `ui_copy`, `ui_cut`, `ui_paste`, `ui_undo`,
  `ui_redo` InputMap actions, exactly as `LineEdit`/`TextEdit` do, so platform shortcuts (Cmd on
  macOS, Ctrl elsewhere) and user remapping come for free (Appendix C).
- Button activation keeps today's semantics: press on Enter/Space `keydown`, `click` on the matching
  `keyup`. It no longer fabricates `pointerdown`/`pointerup`; the `active:` pseudo-state comes from a
  renderer-internal `activechange` event instead.

### 3.8 Geometry: positioning, stacking, clipping

- Taffy at the pinned revision implements CSS `position: static|relative|absolute|fixed|sticky` with
  containing blocks (`~/.cargo/git/checkouts/taffy-bd4586f5551dc460/fca167c/src/style/mod.rs:354`).
  Expose `position` (`relative|absolute|fixed`; `static` default; `sticky` is a non-goal) and
  `top/right/bottom/left` (number, percentage, `auto`).
- **Containing-block rule for clips and scroll offsets.** An ancestor's `overflow` clip and scroll
  offset apply to a box only if that ancestor is an inclusive descendant of the box's containing
  block. In-flow boxes: containing block is the parent, so all ancestors apply (today's behaviour).
  `absolute`: nearest ancestor with `position != static`, else the root. `fixed`: the root (no
  ancestor clip or scroll applies). This is CSS's rule and is what lets a popover escape an
  `overflow-hidden` card.
- **Stacking.** An element with `zIndex` set forms a stacking context. Paint order of a stacking
  context: the context element, then descendant contexts with negative `zIndex` (ascending), then
  descendants that are not contexts in document order, then descendant contexts with `zIndex >= 0`
  (ascending, document order on ties). Contexts are atomic. Deviation from CSS, documented: positioned
  elements without `zIndex` paint in document order (CSS paints them after in-flow content), and
  `opacity` does not create a stacking context.
- Hit testing walks paint order in reverse, as today. Tab order uses document order.
- Geometry is two passes: a tree pass (rects, clips, content clips, opacities, document order, scroll
  offsets, containing blocks) and a stacking pass (paint order).

### 3.9 Scroll containers

- Style: `overflowX`, `overflowY` each `visible|hidden|scroll|auto` on the wire. The authoring
  shorthand `overflow` stays in `types.ts` and is expanded by the JS resolver into both longhands
  (like `padding`). Taffy gets `Overflow::Scroll` for `scroll|auto` and `scrollbar_width = 0.0`
  (overlay scrollbars; with zero width Taffy treats `Scroll` like `Hidden` for layout).
- A **scroll container** is an element with `overflowX` or `overflowY` in `scroll|auto`. It clips to
  its padding box like `hidden`.
- **Range** comes from Taffy, not hand math: `Layout::scroll_width()` / `scroll_height()`
  (`taffy …/src/tree/layout.rs:799,814`). For a normal axis the offset is in `0..=range`; for a
  reversed axis (`row-reverse`/`column-reverse`, `scrollable_overflow_rect.is_reversed()`) it is in
  `-range..=0`. Initial offset 0. Re-clamp after every layout.
- Offsets are applied in the geometry tree pass (subtract from descendants' positions, subject to the
  containing-block rule). Scrolling never dirties Taffy layout.
- **Wheel**: `WHEEL_UP/DOWN/LEFT/RIGHT` presses scroll `client size / SCROLL_PAGE_DIVISOR × factor`
  (`factor` 0 means 1), and `InputEventPanGesture` scrolls `client size × delta / SCROLL_PAGE_DIVISOR`,
  mirroring Godot's `ScrollContainer` (`scene/gui/scroll_container.cpp:190-226,311-318`,
  `ScrollBar::PAGE_DIVISOR = 8` at `scene/gui/scroll_bar.h:116`). Shift+wheel scrolls horizontally.
- **Chaining**: the delta goes to the nearest scroll container on the target's ancestor path that can
  move in that direction; the remainder continues to the next one, unless `overscrollBehavior:
  'contain'`. If nothing moved and JS did not prevent `wheel`, the event is not accepted (game gets it).
- **Touch pan** per 3.5 rule 4, with momentum after release. Mirror the deceleration of
  `ScrollContainer`'s `drag_touching_deaccel` (`scroll_container.cpp:569-610`); constants in Appendix A.
- **Keyboard**: arrows, PageUp/PageDown, Home/End, Space/Shift+Space scroll the nearest scroll
  container ancestor-or-self of the focused element, as the `keydown` default action, unless the
  focused element is a text input. Step sizes mirror `ScrollContainer` (`scroll_container.cpp:450-480`).
- **Scrollbars**: overlay thumbs, no track, drawn when the axis overflows, `scrollbarWidth: 'auto' |
  'none'`, colour `scrollbarColor`. The mouse can drag a thumb (implicit capture). Thumbs draw after the
  container's whole subtree, so each scroll container gets a third canvas item (`RenderItems::overlay`)
  whose draw index follows its subtree's last item.
- **Events and API**: `scroll` (non-bubbling, coalesced to at most one queued per container),
  `handle.scrollTo({left, top})`, `handle.scrollBy`, `handle.scrollIntoView()`; focus moved by
  keyboard or `focus()` scrolls ancestors minimally so the element is visible.

### 3.10 Text model shared by selection and input

- **Offsets.** Godot `String` and every `TextServer` position are Unicode code point indices. Rust
  stores text as `Vec<char>` (code points) in edit buffers. **Every offset crossing to JS is a UTF-16
  code unit index** (DOM `selectionStart` semantics). `text_offsets.rs` owns the conversions; nothing
  else converts. Never use Rust byte offsets in protocol or Godot calls.
- **`TextLayout`** (`text_layout.rs`) wraps a laid-out `TextParagraph` plus its content origin and
  answers: hit test (point → code point offset, via `TextParagraph.hit_test`), caret rectangle (via
  `TextServer.shaped_text_get_carets` on the line RID from `get_line_rid`), selection rectangles (via
  `TextServer.shaped_text_get_selection` per line in range), word bounds (via
  `TextServer.shaped_text_get_word_breaks` on `get_rid()`), grapheme steps
  (`shaped_text_next/prev_grapheme_pos`). Line origins must replicate `TextParagraph::draw`
  (`scene/resources/text_paragraph.cpp:841-940`): per line `y += ascent` before the line, then
  `y += descent + line_spacing`; `x` from the paragraph's horizontal alignment and line width. A unit
  check in the verifier compares `TextLayout` caret positions with `hit_test` round trips.
- Selection rectangles and carets are drawn into the element's `text` canvas item (which already has
  the content clip): selection rectangles first, then the paragraph, then IME underline, then caret.

### 3.11 Static text selection

- Style `userSelect: 'none' | 'text'`, inherited (JS resolver), default `none` at the root (game
  default). Selection only starts on `Text` nodes outside any `Button` subtree.
- Model: `anchor` and `focus`, each `(node id, code point offset)`, ordered by document order then
  offset. A range covers the selectable text nodes between them; `userSelect: none` text inside the
  range is skipped.
- Gestures (mouse): click collapses at the hit offset, double click selects a word, triple click
  selects the node's text, drag extends (focus updates only while over selectable text), Shift+click
  extends. Touch selection is a non-goal.
- Starting a selection grabs Godot focus for the root (so Copy works) without focusing an element.
  Pressing elsewhere clears it.
- Keyboard default actions: `ui_copy` copies (`DisplayServer.clipboard_set`, nodes joined by `\n`);
  `ui_text_select_all` selects all selectable text in the root.
- Text content change on a node in the range clears the selection. `selectionchange` goes to root
  listeners; `root.getSelection()` queries native.
- Paint colour `selectionColor` (inherited, default in Appendix A).

### 3.12 Text input

A new element kind `textinput` (`<TextInput>`, multi-line with `multiline`). It has no children and
no `text` command; its text lives in a native `EditBuffer`.

- **Rendering**: background/border as any element; the text paragraph is built from the buffer (or
  bullets for `secure`, or the placeholder when empty and not composing); always clipped to its own
  padding box. Single-line: no wrapping, horizontal scroll so the caret stays visible (as `LineEdit`).
  Multi-line: wraps to content width, internal vertical scroll with wheel chaining to ancestors.
- **Intrinsic size** must not depend on the value (layout would jump while typing): width
  `TEXT_INPUT_DEFAULT_COLUMNS` × the width of `"0"` in the element's font size; height one line, or
  `rows` lines for multi-line (`rows` default `TEXT_AREA_DEFAULT_ROWS`). `TextContext` becomes an enum
  (`Paragraph(Gd<TextParagraph>)` | `Input { … }`) and both measurement closures handle both variants
  (`flush_layout` and `compute_tree`, including the duplicated probe tree in `measure_endpoint`).
- **Editing pipeline** for a `keydown` on a focused, editable input that JS did not prevent:
  1. Resolve an `EditCommand` from InputMap actions (Appendix C) or, if no action matched and no
     Ctrl/Alt/Meta is held and `unicode >= 32`, `InsertText(char)` (the `LineEdit` rule,
     `scene/gui/line_edit.cpp:1053-1073`).
  2. Dispatch `beforeinput { inputType, data }` (cancelable).
  3. If not prevented: apply to the buffer (respecting `readOnly`, `maxLength` in UTF-16 units),
     push undo, re-shape, keep caret visible, update IME position.
  4. Queue `input { value, inputType, data, selectionStart, selectionEnd }` and, if the selection
     changed, `selectionchange`.
- **Controlled/uncontrolled** (React DOM semantics):
  - JS sends `inputvalue {id, value}` on mount (`value ?? defaultValue ?? ""`), whenever the `value`
    prop changes between commits, and after any `input` event whose resulting committed `value` prop
    differs from the native value (the app rejected or transformed the edit). Native then replaces the
    buffer, puts the caret at the end, clears composition and undo history (browser behaviour for
    programmatic value changes).
  - Because dispatch is synchronous and React flushes discrete updates before returning, the
    controlled value is reconciled before the next keystroke is processed; there is no
    stale-value race and no caret jump on accepted edits.
- **IME** (desktop native and desktop Web): on focus `DisplayServer.window_set_ime_active(true, id)`
  and `window_set_ime_position(screen caret)` computed exactly as `LineEdit::_update_ime_window_position`
  (`line_edit.cpp:134-147`); on blur, inactive (`line_edit.cpp:124-131`). On `OS_IME_UPDATE` (Godot
  propagates it to every node, `scene/main/scene_tree.cpp:922-932`), read `ime_get_text()` /
  `ime_get_selection()` as `LineEdit` does (`line_edit.cpp:1694-1713`), render the preedit at the
  caret with an underline, and queue `compositionstart/update/end`. Committed text arrives as key
  events with `unicode` and goes through the normal pipeline with `isComposing: false`.
- **Virtual keyboard** (Web on touch devices, mobile): on focus, if
  `DisplayServer.has_feature(FEATURE_VIRTUAL_KEYBOARD)`, call `virtual_keyboard_show(text,
  global rect, type, maxLength, selStart, selEnd)` (signature in section 7.3); on blur
  `virtual_keyboard_hide()`. On Web the hidden DOM `<input>`/`<textarea>` reports the **whole text**
  back through `Viewport::_push_text_input`, which calls a method literally named `_set_text(text,
  emit_signal)` on the key-focus `Control` (`scene/main/viewport.cpp:2856-2868`), followed by
  synthetic `RIGHT` key presses to place the caret (`platform/web/display_server_web.cpp:801-823`).
  So `ReactUiRoot` exposes `#[func] fn _set_text(&mut self, text: GString, emit_signal: bool)`, which,
  when a text input is focused, replaces its value as `insertReplacementText` (`beforeinput` then
  `input`) and sets the caret to 0 like `LineEdit::_set_text` (`line_edit.cpp:2126-2142`); the
  following `RIGHT` presses move it. On Web, `FEATURE_IME` and `FEATURE_VIRTUAL_KEYBOARD` are mutually
  exclusive and depend on the `html/experimental_virtual_keyboard` export option and touch support
  (`display_server_web.cpp:1227-1231`, `library_godot_display.js:39-41`).
- **Clipboard**: copy/cut through `DisplayServer.clipboard_set` (disabled for `secure`), paste through
  `clipboard_get`. On Web `clipboard_get` returns a cached value and refreshes it asynchronously
  (`display_server_web.cpp:1037-1039`), so the first paste can be stale. Phase 8 has an explicit
  investigation task for this; do not paper over it.
- **Undo/redo**: native per-input stack of `(text, selection)` snapshots, `UNDO_LIMIT` entries,
  consecutive `insertText` of non-whitespace characters coalesce; `historyUndo`/`historyRedo` go
  through `beforeinput`.
- **Caret blink** on the native clock with `CARET_BLINK_INTERVAL_MS` (LineEdit's default,
  `scene/gui/line_edit.h:200`). Processing runs while an editable input is focused.

### 3.13 Drag and drop

HTML semantics inside one root:

- `draggable` prop. Session start per 3.5 rule 3, then `dragstart` (cancelable) on the source; if
  prevented, no drag and pointer events continue. If started: `pointercancel` to the pointer's target,
  no `click`.
- While dragging, on every pointer move and every scroll change: hit test at the pointer (ignoring
  `pointerEvents: none`); `drag` on the source; on target change `dragleave` (old) and `dragenter`
  (new); then `dragover` (cancelable) on the current target. `dragover` prevented ⇒ drop allowed with
  the outcome's `dropEffect`.
- Release: if the last `dragover` allowed a drop, `drop` (cancelable) on the target; prevented ⇒ the
  drop happened with that effect, else `none`. Then `dragend` on the source with the final
  `dropEffect`, root-local and viewport coordinates, and `endedOutsideRoot`. Escape or root exit
  cancels: `dragleave`, then `dragend` with `none`.
- Data stays in JS. `DataTransfer` (JS) supports `setData/getData/clearData/types/effectAllowed/
  dropEffect`, with HTML's protection modes (`getData` only during `drop`).
- Cursor: drag / can-drop / forbidden shapes while dragging.
- Ghost: `dragPreview: 'native' | 'none'` (default `native`): a translucent copy of the source's
  backgrounds and text in one extra canvas item, following the pointer with the grab offset, drawn
  above everything. `none` lets the app render its own layer (absolute, `pointer-events-none`).
- Edge auto-scroll of scroll containers under the pointer while dragging.
- **Why no Godot `Control` interop**: Godot calls `_can_drop_data` on `&self` and synchronously during
  routing, so a JS decision cannot be made there without a mutable re-entrant borrow; and starting a
  Godot drag from React would require handing a `Variant` and preview `Control` to Godot mid-gesture.
  A drag that ends outside the root still reports `endedOutsideRoot` with viewport coordinates, which
  is enough for game-world drops (the app raycasts). Interop is a separate future design.

### 3.14 Cursor

`cursor` style (inherited). `ReactUiRoot::get_cursor_shape(at)` maps the hit element's effective
cursor to `Control.CursorShape` (Godot queries it on motion). Defaults: text inputs and selectable text
`text`, otherwise `default`; drag sessions override.

### 3.15 Accessibility

Godot exposes `AccessibilityServer` with sub-elements designed for single-`Control` widgets that draw
many items; `ItemList` is the model to copy (`scene/gui/item_list.cpp:1315-1365`,
`get_focused_accessibility_element` at `item_list.cpp:1236`).

- On `NOTIFICATION_ACCESSIBILITY_UPDATE`, for each **exposed** node in document order ensure a
  sub-element under the nearest exposed ancestor's element (or the root's
  `get_accessibility_element()`), then set role, name, bounds (root-local, identity transforms), flags,
  checked/value/range, and actions with callbacks bound to the node id.
- Exposed: `Button` (BUTTON), `TextInput` (TEXT_FIELD / MULTILINE_TEXT_FIELD), `Text` with text
  (STATIC_TEXT), scroll containers (SCROLL_VIEW), and any node with an explicit `role`. `aria-hidden`
  removes a subtree.
- Actions: CLICK → synthetic activation; FOCUS/BLUR → focus API; SCROLL_* and SET_SCROLL_OFFSET on
  scroll containers; INCREMENT/DECREMENT/SET_VALUE for `slider` (dispatched to JS as `keydown`
  ArrowUp/ArrowDown and a value event the Slider component handles); SET_TEXT_SELECTION /
  REPLACE_SELECTED_TEXT for text inputs.
- `get_focused_accessibility_element` returns the focused node's element.
- Free a node's element when the node is removed; on `ACCESSIBILITY_INVALIDATE`, forget all element
  RIDs without freeing (Godot invalidated them; follow `ItemList`).
- Call `queue_accessibility_update()` after batches, focus changes, and geometry/scroll changes.

### 3.16 Coordinates and world space

- Coordinates are root-local logical pixels: origin top-left, `+x` right, `+y` down, identical to
  Godot `Control`/`CanvasItem`. Events also carry `viewportX/viewportY`
  (`get_global_transform_with_canvas()` applied to the local point), which is what game code receives
  in `_unhandled_input`.
- **3D surfaces**: put the root in a `SubViewport` (transparent background), show the viewport
  texture on a quad, and forward input by intersecting the camera ray with the quad's plane
  analytically (Breaka's Web engine has no 3D physics, so no `Area3D`), converting the hit to viewport
  pixels, and calling `subViewport.pushInput(event, true)`. The root needs no changes.
- **Anchored 2D UI over 3D**: `Camera3D.unprojectPosition()` → `position: absolute` element in the
  normal screen-space root.

### 3.17 Component kit

Built only from `View`, `Text`, `Button`, `TextInput`, events, focus, capture, portals and
transitions. No new native primitives. There are no transforms, images or icon fonts: checkmarks are
filled inner boxes, switch thumbs move by animating a spacer's `width` (an existing transitionable
property).

---

## 4. Wire protocol v2

Bump `native/PROTOCOL.md` to v2 as phases land. JS and native evolve together in this repository;
there is no v1 compatibility requirement.

### 4.1 Commands

Existing: `create`, `style`, `text`, `children`, `remove`. New:

```json
{"op":"create","id":7,"kind":"textinput"}
{"op":"props","id":7,"props":{"tabIndex":0,"autoFocus":true,"textInput":{"placeholder":"Name","multiline":false}}}
{"op":"inputvalue","id":7,"value":"Ada"}
```

- `kind` adds `"textinput"`. Validation: a `textinput` has no children and no `text`.
- `props` replaces the node's complete `PropsSpec` (omitted fields reset), like `style`. JS diffs it by
  serialized key, like `styleKey` (`src/renderer.ts:174`).
- `inputvalue` is only valid on `textinput`; it forces the native buffer (3.12). JS-forced values are
  not truncated by `maxLength` (DOM behaviour).
- Order within a batch stays: creates, then per-node `style`, `props`, `text`/`inputvalue`, then
  hierarchy, then removals.

`PropsSpec` (Rust, `#[serde(rename_all = "camelCase", deny_unknown_fields)]`, every field optional):

| Field | Type | Phase |
| --- | --- | --- |
| `tabIndex` | `0` or `-1` | 4 |
| `autoFocus` | boolean | 4 |
| `draggable` | boolean | 10 |
| `dragPreview` | `"native" \| "none"` | 10 |
| `textInput` | `TextInputSpec` (below) | 8 |
| `role` | string enum (Appendix D) | 11 |
| `ariaLabel`, `ariaDescription`, `ariaValueText`, `ariaPlaceholder` | string | 11 |
| `ariaHidden`, `ariaDisabled`, `ariaExpanded`, `ariaSelected`, `ariaReadOnly`, `ariaRequired`, `ariaModal` | boolean | 11 |
| `ariaChecked` | `true \| false \| "mixed"` | 11 |
| `ariaValueMin`, `ariaValueMax`, `ariaValueNow` | finite number | 11 |
| `ariaLive` | `"off" \| "polite" \| "assertive"` | 11 |

`TextInputSpec`: `placeholder?: string`, `multiline: boolean`, `rows?: positive integer`,
`readOnly: boolean`, `secure: boolean`, `maxLength?: nonnegative integer (UTF-16 units)`,
`keyboardType?: "default"|"multiline"|"number"|"decimal"|"phone"|"email"|"url"|"password"` (maps 1:1
to `DisplayServer.VirtualKeyboardType`), `selectOnFocus: boolean`.

### 4.2 Style properties added

All are validated in `StyleSpec::validate` and typed in `src/types.ts`. "Inherited" means the JS
resolver passes the value to children (extend `inheritedTextStyle`, `src/renderer.ts:146`, renamed to
`inheritedStyle`); native receives resolved values per node.

| Property | Values | Inherited | Phase | Utility classes |
| --- | --- | --- | --- | --- |
| `pointerEvents` | `auto \| none` | yes | 2 | `pointer-events-auto`, `pointer-events-none` |
| `cursor` | `default \| pointer \| text \| move \| grab \| grabbing \| not-allowed \| crosshair \| wait \| progress \| help \| ew-resize \| ns-resize \| nesw-resize \| nwse-resize` | yes | 2 | `cursor-*` |
| `position` | `static \| relative \| absolute \| fixed` | no | 5 | `static`, `relative`, `absolute`, `fixed` |
| `top`, `right`, `bottom`, `left` | number, `%`, `auto` | no | 5 | `top-4`, `inset-0`, `inset-x-0`, `left-1/2`, `-top-2` (negative allowed) |
| `zIndex` | integer | no | 5 | `z-0`, `z-10` … `z-50`, `z-[n]`, `-z-10` |
| `overflowX`, `overflowY` (wire) | `visible \| hidden \| scroll \| auto` | no | 6 | `overflow-*`, `overflow-x-*`, `overflow-y-*` |
| `overscrollBehavior` | `auto \| contain` | no | 6 | `overscroll-auto`, `overscroll-contain` |
| `scrollbarWidth` | `auto \| none` | no | 6 | `scrollbar-auto`, `scrollbar-none` |
| `scrollbarColor` | hex | yes | 6 | `scrollbar-[#hex]` |
| `touchAction` | `auto \| none \| pan-x \| pan-y` | no (native intersects along the path) | 6 | `touch-auto`, `touch-none`, `touch-pan-x`, `touch-pan-y` |
| `userSelect` | `none \| text` | yes | 7 | `select-none`, `select-text` |
| `selectionColor` | hex | yes | 7 | `selection:bg-*` is **not** added; use the style or `selection-[#hex]` |
| `caretColor` | hex | yes | 8 | `caret-*` |
| `placeholderColor` | hex | yes | 8 | `placeholder-*` |

The wire `overflow` property is replaced by `overflowX`/`overflowY` in Phase 6 (update
`protocol.rs` tests that use `overflow`). The variant list in `styles.ts` gains `focus-visible:`
(Phase 4).

### 4.3 Events

Every event (Rust `native/events.rs`, serialized by `drain_events`):

```rust
pub type EventSeq = u64;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiEvent {
    pub seq: EventSeq,          // monotonically increasing per root, starts at 1
    pub target: u32,            // 0 = root listeners only
    pub cancelable: bool,       // true only if native is awaiting resolve_event for this seq
    pub time_stamp: f64,        // milliseconds, Time::get_ticks_usec() / 1000 at queue time
    #[serde(flatten)]
    pub payload: EventPayload,  // internally tagged by "type"
}

#[derive(Clone, Copy, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Modifiers { pub shift_key: bool, pub ctrl_key: bool, pub alt_key: bool, pub meta_key: bool }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PointerData {
    pub x: f32, pub y: f32,                    // root-local logical px
    pub viewport_x: f32, pub viewport_y: f32,  // canvas coordinates
    pub pointer_id: u32,
    pub pointer_type: PointerType,             // "mouse" | "touch" | ""
    pub button: i8,                            // DOM button, -1 when not applicable
    pub buttons: u16,                          // DOM buttons bitmask
    pub detail: u32,                           // click count
    pub related_target: Option<u32>,           // enter/leave only, else null
    #[serde(flatten)] pub modifiers: Modifiers,
}
```

| `type` | Payload fields (besides `PointerData` where marked P) | Target | Bubbles (JS) | Cancelable | Handler props | Native default action when not prevented | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pointerdown` | P | hit / capture | yes | **yes** | `onPointerDown`, `onPointerDownCapture` | focus/blur, Godot focus grab/release, selection start, gesture arbitration | 1 |
| `pointermove` | P | hit / capture | yes | no | `onPointerMove(Capture)` | — | 1 |
| `pointerup` | P | hit / capture | yes | no | `onPointerUp(Capture)` | — | 1 |
| `pointercancel` | P | previous target | yes | no | `onPointerCancel(Capture)` | — | 3 |
| `pointerenter`, `pointerleave` | P (`relatedTarget`) | chain (3.5) | no | no | `onPointerEnter`, `onPointerLeave` | — | 1 |
| `click`, `dblclick`, `auxclick`, `contextmenu` | P | activation target | yes | no | `onClick(Capture)`, `onDoubleClick`, `onAuxClick`, `onContextMenu` | — | 1 (`click`), 3 |
| `wheel` | P + `deltaX`, `deltaY` (px) | hit | yes | **yes** | `onWheel(Capture)` | scroll chaining (Phase 6) | 2 |
| `keydown`, `keyup` | `key`, `code`, `repeat`, `isComposing`, modifiers | focused or 0 | yes | **yes** | `onKeyDown(Capture)`, `onKeyUp(Capture)` | 3.7 and Appendix C | 4 |
| `focus`, `blur` | `relatedTarget`, `focusVisible` | focused | yes (React semantics) | no | `onFocus`, `onBlur` | — | 1 (fields in 4) |
| `activechange` | `active` | pressed | renderer-internal | no | none | — | 4 |
| `scroll` | `scrollLeft`, `scrollTop`, `scrollWidth`, `scrollHeight`, `clientWidth`, `clientHeight` | scroller | no | no | `onScroll` | — | 6 |
| `selectionchange` | `selectionStart`, `selectionEnd` (UTF-16; inputs only) | input or 0 | no | no | `onSelectionChange` | — | 7, 8 |
| `beforeinput` | `inputType`, `data` (string or null) | input | yes | **yes** | `onBeforeInput` | apply edit | 8 |
| `input` | `inputType`, `data`, `value`, `selectionStart`, `selectionEnd` | input | yes | no | `onInput`, `onChange` | — | 8 |
| `compositionstart/update/end` | `data` | input | yes | no | `onCompositionStart/Update/End` | — | 8 |
| `dragstart` | P + `sessionId` | source | yes | **yes** | `onDragStart` | begin session | 10 |
| `drag`, `dragend` | P + `sessionId`, `dropEffect`, `endedOutsideRoot` (dragend) | source | yes | no | `onDrag`, `onDragEnd` | — | 10 |
| `dragenter`, `dragleave` | P + `sessionId` | drop target | yes | no | `onDragEnter`, `onDragLeave` | — | 10 |
| `dragover`, `drop` | P + `sessionId` | drop target | yes | **yes** | `onDragOver`, `onDrop` | prevented ⇒ accept / complete | 10 |

`inputType` values: `insertText`, `insertLineBreak`, `insertFromPaste`, `insertReplacementText`,
`insertCompositionText`, `deleteContentBackward`, `deleteContentForward`, `deleteWordBackward`,
`deleteWordForward`, `deleteSoftLineBackward`, `deleteSoftLineForward`, `deleteByCut`, `historyUndo`,
`historyRedo`.

### 4.4 Native methods added to `ReactUiRoot`

All return `GString` (empty = success, else an error message) unless noted, and all validate ids.

| Method (`snake_case` in Rust; GodotJS exposes camelCase) | Phase |
| --- | --- |
| `#[signal] events_ready()` | 1 |
| `resolve_event(seq: i64, default_prevented: bool, drop_effect: GString)` | 1 |
| `set_pointer_capture(id: u32, pointer_id: u32)`, `release_pointer_capture(id, pointer_id)` | 3 |
| `focus_node(id: u32, focus_visible: i32 /* -1 = by modality, 0, 1 */)`, `blur_node(id)` | 4 |
| `get_node_rect(id: u32) -> GString` (JSON rect or `null`; replaces snapshot parsing in `UIHandle.getRect`) | 5 |
| `scroll_to(id, left: f32, top: f32)`, `scroll_by(id, dx, dy)`, `scroll_into_view(id)`, `get_scroll_state(id) -> GString` | 6 |
| `get_selection() -> GString`, `clear_selection()` | 7 |
| `get_text_input_state(id) -> GString` (`{value, selectionStart, selectionEnd, composing}`), `set_text_selection(id, start, end)` | 8 |
| `_set_text(text: GString, emit_signal: bool)` (Godot virtual-keyboard hook; not called from JS) | 8 |
| `_on_accessibility_action(data: Variant, node_id: u32, action: i32)` (callback target; not called from JS) | 11 |

`IControl` overrides added: `has_point` (2), `get_cursor_shape` (2), `get_focused_accessibility_element` (11).

### 4.5 Snapshot additions

`get_snapshot` keeps every existing field (verifiers depend on them) and adds: `pointers`
(`[{pointerId, pointerType, target, capture, buttons}]`), `focusVisible`, per-node `scroll`
(`{left, top, rangeX, rangeY}` or null), per-node `props`, `paintIndex`, `documentIndex`, `selection`
(`{anchor:{id,offset}, focus:{id,offset}}` or null; UTF-16), per-input `textInput` state, `drag`
(session or null). `hovered` and `pressed` keep meaning "mouse hover" and "pressed element".

---

## 5. Phases

Every phase lists **Files** (the only files it should touch, apart from docs and generated typings),
**Tasks**, and a **Gate**. "Native gate" means all commands in 0.4 except Web; "Web gate" adds the
Web block. Every gate also requires: no new Clippy warnings versus the Phase 0 baseline, README
"Current limits" and `native/PROTOCOL.md` updated for what landed, `docs/INTERACTION_PROGRESS.md`
updated, a commit.

### Phase 0 — Baseline and module split (no behaviour change)

**Files**: `native/lib.rs`, new `native/motion.rs`, `native/geometry.rs`, `native/pointer.rs`,
`native/layout.rs`, `native/paint.rs`, new `docs/INTERACTION_PROGRESS.md`.

1. Run the full native and Web gates on the untouched tree. Record counts, Clippy warning count, and
   artifact paths in `docs/INTERACTION_PROGRESS.md`. If anything fails, stop and report: the plan
   assumes a green baseline.
2. Move code without changing it (cut/paste plus `use` lines; no renames, no logic edits):
   - `IntrinsicTrack`, `MotionValue`, `TransitionRecord` and the whole second `impl ReactUiRoot`
     block (`native/lib.rs:1062-1530`), plus `color_components`, `color_hex`, `axis_property`,
     `property_axis`, `dimension_value`, `is_auto`, `resolve_dimension`, `property_changed`,
     `set_override`, `validate_motion_changes`, `effective_interpolate_size` → `motion.rs`.
   - `BoxRect` (`lib.rs:56-77`), `intersect_clip`, `intersects` → `geometry.rs`.
   - `enabled_button_ancestor`, `shared_button_target`, and `mod input_tests` → `pointer.rs`.
   - `compute_tree`, and replace the identical inline measure closure in `flush_layout`
     (`lib.rs:725-757`) with a call to it → `layout.rs`. This is the only allowed edit beyond moving;
     confirm the closures are identical before replacing.
   - `parse_color`, `with_opacity` → `paint.rs`. `micros` → `profile.rs`.
3. `cargo test` must list the same 19 tests (module paths may change).

**Gate**: native gate, plus `verify:web` and `verify:motion:web` (a pure move must be invisible).

**Done** (`9f4a02c`). "Invisible" means identical assertions and byte-identical settled captures.
Captures taken mid-transition differ between any two runs of the same binary, so never compare them
by hash; compare settled captures, assertions and geometry instead.

### Phase 1 — Event pipeline v2

**Files**: `native/events.rs` (new), `native/lib.rs`, `src/native.ts`, `src/events.ts` (new),
`src/renderer.ts`, `src/components.tsx`, `src/index.ts`, `tests/renderer.test.ts`,
`tests/events.test.ts` (new), `demo/src/main.ts`, `demo/src/app.tsx`, `demo/src/interaction-lab.tsx`
(new), `demo/src/verify-interaction.ts` (new), `scripts/verify.mjs`,
`scripts/verify-interaction-web.mjs` (new), `package.json`.

1. **`native/events.rs`**: the types in 4.3 (payload variants needed now: `pointerdown`, `pointermove`,
   `pointerup`, `pointerenter`, `pointerleave`, `click`, `focus`, `blur`) and
   ```rust
   pub struct EventOutcome { pub default_prevented: bool, pub drop_effect: Option<DropEffect> }
   pub struct EventQueue { /* next_seq, queued: Vec<UiEvent>, awaited: Option<EventSeq>, outcome: Option<EventOutcome> */ }
   impl EventQueue {
       pub fn push(&mut self, target: u32, payload: EventPayload, time_stamp: f64) -> EventSeq;          // cancelable = false
       pub fn push_awaited(&mut self, target: u32, payload: EventPayload, time_stamp: f64) -> EventSeq;  // cancelable = true, sets awaited
       pub fn drain(&mut self) -> Vec<UiEvent>;
       pub fn resolve(&mut self, seq: EventSeq, outcome: EventOutcome) -> Result<(), String>;           // only the awaited seq
       pub fn take_outcome(&mut self, seq: EventSeq) -> EventOutcome;                                   // clears awaited; default if unresolved
       pub fn retain(&mut self, keep: impl Fn(&EventPayload) -> bool);                                  // for EXIT_TREE
       pub fn is_empty(&self) -> bool;
   }
   ```
   Unit tests: seq starts at 1 and increases; resolving a non-awaited seq errors; resolving twice
   errors; `take_outcome` without resolve is "not prevented"; serialization matches 4.3 exactly
   (assert the JSON of one event of each variant).
2. **`ReactUiRoot`**: replace `events: Vec<UiEvent>` and `emit()` with `EventQueue`; add
   `dispatch_depth: u32`; add `#[signal] fn events_ready();` and `#[func] resolve_event`. Implement
   ```rust
   fn deliver(&mut self);   // if depth == 0 && queue non-empty && inside tree: depth += 1; self.signals().events_ready().emit(); depth -= 1
   fn dispatch_cancelable(&mut self, target: u32, payload: EventPayload) -> EventOutcome;
   //   depth > 0  -> push (not awaited), return default
   //   else       -> push_awaited, deliver(), take_outcome(seq)
   ```
   Follow every rule in 3.3. Build `PointerData` from the Godot event (position, button, mask,
   modifiers, `viewport_x/y` can be root-local copies until Phase 2 fills them).
3. Rework `gui_input` for the mouse path: hover update (queues enter/leave with `relatedTarget`),
   `pointerdown` through `dispatch_cancelable`, then — only if not prevented — the existing focus
   default action. Keep `pressed` tracking and the shared-button click rule. End every `gui_input` with
   `deliver()`. Keyboard activation keeps today's synthetic `pointerdown/pointerup/click` until
   Phase 4 (use `pointer_id: 0`, `pointer_type: ""`).
4. **JS `src/native.ts`**: `NativeEvent` becomes a discriminated union validated per `type`;
   `NativeHost` gains `resolveEvent(seq: number, defaultPrevented: boolean, dropEffect: string): string`.
5. **JS `src/events.ts`**: synthetic event objects (`UISyntheticEvent` base with `type`, `target`,
   `currentTarget`, `eventPhase`, `bubbles`, `cancelable`, `defaultPrevented`, `timeStamp`,
   `preventDefault()`, `stopPropagation()`, `isPropagationStopped()`, `isDefaultPrevented()`;
   `UIPointerEvent` adds the `PointerData` fields; keep `export type UIEvent = UIPointerEvent` so
   existing handler types still compile). A single table maps each event type to `{ bubbles,
   bubbleProp, captureProp }` — no per-type switch duplication. Dispatch: capture handlers from the
   outermost ancestor down to the target, then bubble handlers from the target up (non-bubbling types:
   target only), then root listeners. `preventDefault()` on a non-cancelable event is a no-op, as in the
   DOM.
6. **JS `src/renderer.ts`**: `RootOptions.subscribeToEvents` (required), stored unsubscribe called in
   `unmount()`; `dispatchEvents()` becomes the re-entrancy-guarded bounded drain loop of 3.3 (resolve
   each cancelable event, `flushSyncWork()` after each discrete event, `container.flush()` after the
   loop); enter/leave chain dispatch (3.5) with hover flags set only for `pointerType === 'mouse'`;
   `UIRoot.addEventListener(type, listener): () => void` for root listeners.
7. **Demo**: `main.ts` passes `subscribeToEvents` (3.3 snippet). Add tab **04 Interaction** with a
   first section "Events": three nested boxes whose capture/bubble handlers append to a visible log,
   a "stop in capture" toggle, and a `Button` whose `onPointerDown` calls `preventDefault()` (it must
   not take focus when clicked). Use fixed height `h-[520px]` for the tab body so later sections can
   scroll inside it (Phase 6).
8. **Verifier**: `demo/src/verify-interaction.ts` (modelled on `verify.ts`: same settle/press helpers,
   captures into `GODOT_REACT_ARTIFACTS`), selected by `--verify-interaction`; `scripts/verify.mjs`
   accepts `--interaction` (success marker `GODOT_REACT_INTERACTION_VERIFY_PASSED`); `package.json`
   adds `verify:interaction` and `verify:interaction:web`; `scripts/verify-interaction-web.mjs` is
   modelled on `verify-web.mjs` (real Chrome input, both DPRs, touch page). Assert: capture/bubble log
   order; stopping in capture prevents bubble; the preventDefault button does not become focused
   (`snapshot().focused`); all existing `verify` assertions still pass.
9. **Tests**: `tests/events.test.ts` with a `RecordingHost` that records `resolveEvent` calls and a fake
   `subscribeToEvents`: capture/bubble order; `stopPropagation` in capture; `preventDefault` reported
   for cancelable and ignored for non-cancelable; enter/leave chains with a shared ancestor and with
   `relatedTarget: null`; re-entrant `dispatchEvents()` from inside a handler does not recurse; a
   throwing handler still resolves and rethrows after the loop; `unmount()` calls the unsubscribe;
   the drain loop throws after `MAX_EVENT_DRAIN_ROUNDS`. Update existing tests for the new fields.

**Gate**: native gate (including `verify:interaction`) and Web gate.

### Phase 2 — Godot co-operation

**Files**: `native/lib.rs`, `native/protocol.rs`, `native/geometry.rs`, `native/events.rs`,
`src/types.ts`, `src/styles.ts`, `src/renderer.ts`, `src/native.ts`, `src/events.ts`, tests,
`demo/src/main.ts`, `demo/src/interaction-lab.tsx`, verifiers.

1. `StyleSpec.pointer_events: Option<PointerEventsSpec>` and `cursor: Option<CursorSpec>`; types,
   utilities, inheritance in the JS resolver.
2. `hit_test` skips nodes whose `pointer_events` is `None`. Implement `IControl::has_point(&self,
   point) -> bool { self.hit_test(point).is_some() }`. `has_point` must stay side-effect free.
3. Remove `grab_focus()` from `ready()`. In the `pointerdown` default action: focusable target ⇒
   `grab_focus()` + element focus; otherwise element focus `None` and `release_focus()` if the root
   has focus. The demo owner calls `surface.grabFocus()` after `mount()`.
4. Keys: accept Tab only when focus moved; Enter/Space only when a button was pressed/activated. Any
   other key is not accepted (Phase 4 adds JS key events and `preventDefault`).
5. Wheel: in `ready()` call `set_force_pass_scroll_events(true)`. Dispatch `wheel` (cancelable) for
   `WHEEL_*` presses and `InputEventPanGesture` with pixel deltas (constants in Appendix A); accept only
   when prevented (Phase 6 adds scrolling).
6. `get_cursor_shape(&self, at)` maps the hit element's effective cursor (Appendix A table).
7. Fill `viewport_x/viewport_y` with `get_global_transform_with_canvas()` applied to the local point.
8. **Demo**: in `main.ts`, add a full-window `ColorRect` (or plain `Control`) **before** the surface
   that counts `_gui_input` mouse presses, and count presses/keys in `Main._unhandledInput`; expose
   `passthrough(): {controlPresses, unhandledPresses, unhandledKeys}` on the demo API. In the
   interaction tab add a "pass-through" region: a `pointer-events-none` box with one
   `pointer-events-auto` button inside, and a short explanation text.
9. **Verify** (native and Web): click inside the pass-through region away from the button ⇒ control
   or unhandled counters increase and no React handler ran; click the button ⇒ counters unchanged;
   with no React focus, pressing `W` reaches `_unhandled_input`; after focusing a React button, `W`
   still reaches it but Tab does not; wheel over the region reaches `_unhandled_input`; `cursor-pointer`
   element reports `CURSOR_POINTING_HAND` via `surface.getCursorShape(point)`.

**Gate**: native gate and Web gate.

### Phase 3 — Pointer model, touch, capture

**Files**: `native/lib.rs`, `native/pointer.rs`, `native/events.rs`, `src/*` (events, native,
components handle), tests, interaction demo and verifiers.

1. `pointer.rs`: `PointerRecord { pointer_id, pointer_type, position, buttons, pressed_target,
   down_position, capture, hover }` keyed by pointer id; click counting (Appendix A); pure unit tests
   for counting, slop and the button/buttons mappings.
2. Ignore input events with `get_device() == DEVICE_ID_EMULATION` (`-1`), and say why in a comment
   citing `core/input/input.cpp:926`.
3. Handle `InputEventScreenTouch` (pressed / released / `is_canceled()`) and `InputEventScreenDrag` as
   touch pointers: down ⇒ enter chain + `pointerdown` (cancelable) + implicit capture to the target;
   drag ⇒ `pointermove`; up ⇒ `pointerup`, `click` (same shared-button rule), leave chain; canceled ⇒
   `pointercancel`, leave chain, no click. Multi-touch: independent records.
4. Mouse: all buttons; `contextmenu` on right press; `auxclick` for non-primary releases; `dblclick`
   after a `click` with `detail == 2`; `detail` on down/up/click.
5. `set_pointer_capture` / `release_pointer_capture` (#[func]) with validation (node exists, pointer is
   down); capture retargets `pointermove/up/cancel`; released automatically on up/cancel. Handle API
   `setPointerCapture`, `releasePointerCapture`, `hasPointerCapture`.
6. `EXIT_TREE`: every active pointer gets `pointercancel` queued; records cleared.
7. **Demo**: a "pointer pad" that shows the last 6 events with `pointerId/pointerType/button/detail`,
   and a draggable-by-capture knob (pointerdown ⇒ `setPointerCapture`, move updates position).
8. **Verify**: native — right click ⇒ `contextmenu` and no `click`; triple click ⇒ `detail` 1,2,3 and
   one `dblclick`; capture knob keeps moving when the mouse leaves the knob and the root; synthetic
   `InputEventScreenTouch` (device 0) produces exactly one `pointerdown` with `pointerType: 'touch'`
   even with `emulate_mouse_from_touch` on. Web touch page — `page.touchscreen.tap` ⇒ exactly one
   pointerdown/up/click, `pointerType: 'touch'`, and no `hover:` style left on the tapped element
   (assert snapshot style or capture); two-finger touch via CDP `Input.dispatchTouchEvent` ⇒ two
   pointer ids.

**Gate**: native gate and Web gate.

### Phase 4 — Props, focus and keyboard

**Files**: `native/protocol.rs`, `native/lib.rs`, `native/focus.rs` (new), `native/keymap.rs` (new),
`native/events.rs`, `src/props.ts` (new), `src/renderer.ts`, `src/native.ts`, `src/events.ts`,
`src/components.tsx`, `src/styles.ts`, `src/types.ts`, tests, demo, verifiers.

1. `props` command and `PropsSpec { tab_index, auto_focus }` with validation and model storage;
   `src/props.ts` resolves `UIProps` → `PropsSpec`; renderer diffs and sends `props`.
2. `focus.rs`: `is_focusable`, `is_tabbable`, document-order list, next/previous with wrap; unit
   tests over a `Model` fixture (disabled ancestors, `tabIndex -1`, hidden/zero-size).
3. Replace `advance_focus` (paint order) with document order. Focusable click target is the nearest
   focusable ancestor-or-self (replaces `button_ancestor` for focus; keep `enabled_button_ancestor` for
   activation).
4. Modality and focus-visible; focus ring only when focus-visible; `focus` event payload gains
   `relatedTarget`, `focusVisible`; `StyleState.focusVisible` and the `focus-visible:` variant.
5. `focus_node` / `blur_node`, handle `focus()` / `blur()`; `autoFocus` at commit (3.6).
6. `keymap.rs` (Appendix B) with unit tests for letters, digits, shifted symbols, Ctrl+letter
   (`key` is the letter), arrows, modifiers' `code` with location (`ShiftLeft`/`ShiftRight` from
   `InputEventKey.get_location()`).
7. Key path: `keydown` (cancelable, repeats included) → default actions table (3.7: Tab, button press)
   → accept rule; `keyup` (cancelable) → button click. Keyboard activation now emits
   `activechange {active}` (renderer sets/clears the `active` flag on the path) instead of synthetic
   pointer events; `click` from keyboard has `pointerId 0`, `pointerType ""`, `detail 0`. No focused
   element ⇒ target 0 (root listeners).
8. **Demo**: a dialog with a JS focus trap (Tab/Shift-Tab wrap inside via `preventDefault` +
   `focus()`), a `tabIndex={0}` card, a key log showing `key/code/repeat/modifiers`.
9. **Verify**: Tab order follows document order even when a later sibling has a higher `zIndex` (add
   the zIndex check in Phase 5); the focus trap holds; focus ring visible only after keyboard focus
   (inspect PNGs at a pointer focus and a Tab focus); held key produces `repeat: true`; Enter on a
   focused button fires one `click` and no `pointerdown`; `active:` style appears while Space is held;
   existing `verify` keyboard assertions still pass.

**Gate**: native gate and Web gate.

### Phase 5 — Positioning, stacking, portals

**Files**: `native/protocol.rs`, `native/geometry.rs`, `native/lib.rs`, `src/types.ts`,
`src/styles.ts`, `src/components.tsx`, `src/renderer.ts`, `src/native.ts`, tests, demo, verifiers.

1. **Evidence first**: a Rust unit test in `geometry.rs` that builds a Taffy tree with an absolute
   grandchild whose containing block is its grandparent, and records whether `Layout.location` is
   relative to the parent or to the containing block. Write the observed rule into the test name and
   into `docs/INTERACTION_PROGRESS.md`. The geometry pass is built on that observed rule.
2. `position`, `top/right/bottom/left`, `zIndex` in `StyleSpec` → Taffy `position`/`inset`; utilities
   including negatives and fractions.
3. Geometry tree pass with containing blocks (3.8): per node compute its containing block id; clips
   and (later) scroll offsets from an ancestor apply only if that ancestor is an inclusive descendant
   of the containing block. Unit tests: absolute escapes an `overflow-hidden` parent whose containing
   block is outside it; absolute inside a `relative` + `overflow-hidden` parent is clipped; fixed is
   never clipped by ancestors.
4. Stacking pass (3.8) producing `paint_order`; keep `document_order` separately. Unit tests: later
   sibling covers earlier; `z-10` inside an earlier non-context sibling covers a later sibling;
   `-z-10` paints below its context's in-flow content; contexts are atomic.
5. `get_node_rect` (#[func]); `UIHandle.getRect()` uses it.
6. `<Portal>`: renders its children as children of the root container (React `createPortal` with the
   renderer's `Container`, provided through a context set in `render()`).
7. **Demo**: a card with `overflow-hidden` containing a "menu" button that opens an absolutely
   positioned popover in a `Portal` (anchored with `getRect()`), and a backdrop that closes it.
8. **Verify**: popover covers the following card and receives clicks above it (hit test follows paint
   order); it is not clipped by the card (pixel check like the motion clip checks); Tab order
   unchanged.

**Gate**: native gate and Web gate.

### Phase 6 — Scroll containers

**Files**: `native/scroll.rs` (new), `native/geometry.rs`, `native/protocol.rs`, `native/lib.rs`,
`native/render_items.rs`, `native/paint.rs`, `native/events.rs`, `src/*`, `src/kit/ScrollView.tsx`,
tests, demo, verifiers.

1. Wire `overflowX/overflowY` (4.2), `overscrollBehavior`, `scrollbarWidth`, `scrollbarColor`,
   `touchAction`; JS expands `overflow`. Update protocol tests.
2. `scroll.rs` (pure): `ScrollState { offset, velocity }`, range/clamp including reversed axes,
   wheel/pan delta conversion (Appendix A), chaining with `contain`, momentum step, thumb geometry and
   thumb-drag mapping. Unit tests for each.
3. Apply offsets in the geometry pass under the containing-block rule; re-clamp after layout; hover
   and hit test refresh after any offset change; queue coalesced `scroll` events.
4. Wheel default action (chaining) and accept rule (3.4). Keyboard scrolling default actions (3.9).
5. Touch pan per 3.5 rule 4 with `pointercancel`; momentum on release driven by `process()`.
   Introduce one function that decides whether processing is needed (motion active, momentum active,
   caret blink later, auto-scroll later) and replace the scattered `set_process` calls
   (`native/lib.rs:186,241,252,1265,1528`) with it. `verify:motion` must stay green.
6. Overlay scrollbars: `RenderItems.overlay` created only for scroll containers; draw index after the
   container's subtree; mouse thumb dragging.
7. Scroll APIs (#[func]s, handle methods), `onScroll`, focus scroll-into-view.
8. `ScrollView` kit component (a `View` with `overflowY: 'auto'` and props passthrough).
9. **Demo**: the interaction tab body becomes a vertical `ScrollView`; a horizontal carousel; a nested
   vertical list inside the outer scroller (chaining); an `overscroll-contain` list.
10. **Verify**: wheel scrolls the inner list then chains to the outer one at the end; `contain` stops
    chaining; wheel over a non-scrollable area reaches `_unhandled_input`; keyboard PageDown scrolls;
    Tab to an offscreen button scrolls it into view; thumb drag scrolls; hit testing after scroll hits
    the scrolled content (click a list item after scrolling); scrolled content is clipped (pixel
    check). Web touch page: swipe (CDP touch sequence) scrolls with momentum and cancels the pressed
    item's click; `touch-none` element receives `pointermove` instead.

**Gate**: native gate and Web gate.

### Phase 7 — Text layout and text selection

**Files**: `native/text_offsets.rs`, `native/text_layout.rs`, `native/selection.rs` (new),
`native/lib.rs`, `native/paint.rs`, `native/protocol.rs`, `src/*`, tests, demo, verifiers.

1. `text_offsets.rs` with unit tests (ASCII, BMP accents, astral emoji with surrogate pairs, ZWJ
   sequences, out-of-range errors).
2. `text_layout.rs` per 3.10. The verifier checks `hit_test(caret_rect(i).center) == i` for every
   grapheme boundary of a sample paragraph at left/center/right alignment and wrapped lines.
3. `selection.rs` model (pure) with ordering and per-node ranges; unit tests.
4. `userSelect`, `selectionColor`; gestures (3.11); copy and select-all default actions; clear rules;
   `selectionchange`; `get_selection`/`clear_selection`; `root.getSelection()` returning handles and
   UTF-16 offsets.
5. Paint selection rectangles into the text canvas item before the paragraph.
6. **Demo**: a `select-text` article with three paragraphs, one `select-none` sentence, and a
   "selected text" readout fed by `selectionchange`.
7. **Verify**: drag across two paragraphs selects the expected text (compare `getSelection().text`);
   double click selects a word, triple click the paragraph; the `select-none` sentence is skipped;
   Cmd/Ctrl+C puts the text on the clipboard (`DisplayServer.clipboardGet()` natively; Web with
   clipboard permissions granted to the page); PNG shows highlight under text, clipped by containers.

**Gate**: native gate and Web gate.

### Phase 8 — TextInput

Split into four commits (8A–8D), each with its own native gate; the Web gate runs after 8D (and after
8B if 8B changed Web-relevant code).

**Files**: `native/protocol.rs`, `native/text_input.rs`, `native/text_input_godot.rs`,
`native/text_layout.rs`, `native/layout.rs`, `native/lib.rs`, `native/paint.rs`, `native/events.rs`,
`src/components.tsx` (`TextInput`), `src/props.ts`, `src/renderer.ts`, `src/native.ts`,
`src/events.ts`, tests, demo (`export_presets.cfg` for 8B), verifiers.

**8A — single-line editing core**
1. `Kind::TextInput`, `TextInputSpec`, `inputvalue` command, validation (no children, no text).
2. `EditBuffer` (pure): `Vec<char>` text, anchor/focus selection, `apply(EditCommand) -> EditResult`
   for every command in Appendix C that applies to single-line input, `maxLength` in UTF-16 units,
   read-only, undo/redo stack with coalescing. Unit tests per command, including emoji/ZWJ grapheme
   deletion via injected grapheme boundaries (the caller computes boundaries with `TextServer`; tests
   pass them directly).
3. `TextContext` enum and intrinsic measurement (3.12) in both measure paths and the probe tree.
4. Rendering: value/placeholder/secure bullets, selection, caret with blink, horizontal scroll to
   caret, own-box clipping, `caretColor`, `placeholderColor`.
5. Pointer: click places caret, drag selects, double/triple click word/all, Shift+click extends;
   default cursor `text`.
6. Event pipeline: `keydown` → `beforeinput` → apply → `input` / `selectionchange` (3.12);
   controlled/uncontrolled protocol in the renderer; `TextInput` component with `value`,
   `defaultValue`, `onChange` (fires on `input`), `onBeforeInput`, `onSelectionChange`, `onSubmit`
   (JS: Enter `keydown` on single-line, not composing), `placeholder`, `readOnly`, `secure`,
   `maxLength`, `selectTextOnFocus`; handle `select()`, `setSelectionRange()`, `selectionStart`,
   `selectionEnd`, `value`.
7. Tests (JS): controlled value accepted, rejected (reverts), transformed (uppercase) — each must send
   the right `inputvalue`; uncontrolled `defaultValue`; `onSubmit`.

**8B — IME and virtual keyboard**
1. IME activation/position/notification handling and composition rendering (3.12), mirroring the
   cited `LineEdit` code.
2. Virtual keyboard show/hide with `keyboardType`; `_set_text` hook.
3. Enable `html/experimental_virtual_keyboard` in `demo/export_presets.cfg` (desktop Chrome keeps the
   IME path because `'ontouchstart' in window` is false there; record the evidence).
4. **Verify (Web)**: desktop page — CDP `Input.imeSetComposition` shows the preedit and
   `Input.insertText` commits it, producing `compositionstart/update/end` and one `input`; touch page —
   tapping the input shows the hidden DOM input (assert `document.activeElement` is the Godot VK
   element), `page.keyboard.type('abc')` produces value `abc` with caret at 3, and the React value
   matches. **Native IME** cannot be injected through Godot's input API: record a manual check with a
   macOS Japanese or Pinyin input source (screenshot of preedit and committed text) in the progress
   log, or report that it could not be done.

**8C — clipboard and undo**
1. Copy/cut/paste default actions (`ui_copy`, `ui_cut`, `ui_paste`), disabled copy/cut for `secure`;
   `insertFromPaste`, `deleteByCut`; undo/redo (`ui_undo`, `ui_redo`).
2. **Investigation (Web paste)**: reproduce in the Web verifier whether the first Cmd/Ctrl+V after
   changing the system clipboard pastes stale text (`display_server_web.cpp:1037-1039` suggests it
   does). Record the event order (browser `paste` event, Godot key event, clipboard callback) with
   instrumentation. Only then propose a fix with a platform-causal argument (AGENTS.md "Web Fix
   Validation"). Candidate directions to evaluate, not to assume: handle the browser `paste` event's
   `clipboardData` in the browser realm and feed it as `insertFromPaste`, or fix the engine's Web
   clipboard flow in `~/Development/godot/platform/web`. Stop and report before implementing an engine
   change.

**8D — multi-line**
1. `multiline`, `rows`, wrapping, `Enter` ⇒ `insertLineBreak`, vertical caret movement keeping the
   desired x, line start/end, document start/end, page up/down, internal vertical scroll with wheel
   chaining, `keyboardType: 'multiline'` for the virtual keyboard.

**Demo**: a form with name, password, a `maxLength` field, an uppercase-transforming controlled field,
a read-only field and a multi-line notes field, with a live JSON readout of the values.

**Verify** (native for all; Web as above): type, edit, select with Shift+arrows and mouse, word
navigation (Alt/Option+arrow on macOS via the InputMap), Backspace/Delete including an emoji ZWJ
sequence, maxLength, transform, read-only, password bullets and blocked copy, undo/redo, caret visible
in PNGs, horizontal scroll follows the caret, multi-line wraps and scrolls.

**Gate**: native gate and Web gate after 8D.

### Phase 9 — Component kit and Inputs demo

**Files**: `src/kit/*.tsx` (new), `src/index.ts`, `tests/kit.test.ts` (new), demo, verifiers. No
native changes; if a component seems to need one, stop and report.

Components (each with `disabled`, controlled and uncontrolled forms, `aria-*` props passed through for
Phase 11, and keyboard behaviour from the WAI-ARIA Authoring Practices):

| Component | Built from | Keyboard |
| --- | --- | --- |
| `Checkbox` (`checked`, `indeterminate`, `onChange`) | `Button` with `role="checkbox"`, box + filled inner box | Space toggles |
| `Switch` | `Button` `role="switch"`, track + spacer `width` transition + thumb | Space/Enter toggle |
| `RadioGroup` / `Radio` | context, `tabIndex` roving (only the checked/first radio is tabbable) | arrows move and select, wrap |
| `Slider` (`min`, `max`, `step`, `value`) | track `View` + thumb, pointer capture | arrows ±step, PageUp/Down ±10 steps, Home/End |
| `Select` (`options`, `value`) | `Button` + `Portal` listbox (Phase 5), backdrop | ArrowUp/Down open and move, Enter select, Escape close, type-ahead optional |
| `TextField` | label `Text` + `TextInput` + helper/error `Text` | — |
| `ScrollView` | Phase 6 | — |

Tests: renderer-level tests with `RecordingHost` driving synthetic events for toggling, roving focus,
slider value from pointer position and keys, select open/close/keyboard. Demo: an "Inputs" section
with every component bound to one state object and a JSON readout. Verify: each component by mouse,
keyboard and (Web) touch.

**Gate**: native gate and Web gate.

### Phase 10 — Drag and drop

**Files**: `native/drag.rs` (new), `native/lib.rs`, `native/pointer.rs`, `native/scroll.rs`,
`native/render_items.rs`, `native/paint.rs`, `native/events.rs`, `native/protocol.rs`, `src/events.ts`
(`DataTransfer`, drag events), `src/native.ts`, `src/components.tsx`, tests, demo, verifiers.

1. `drag.rs` (pure) state machine: `Idle → Pending(pointer, source, origin, started_at) → Dragging
   (session, target, last_allowed_effect) → Ended`, transitions on move/hold/up/cancel/escape/exit;
   unit tests for each transition, including touch hold vs slop and cancel paths.
2. `draggable`, `dragPreview` props; gesture integration (3.5 rule 3) with `pointercancel` on start.
3. Event sequence and outcomes (3.13); `dropEffect` passed through `resolve_event`; `endedOutsideRoot`
   and viewport coordinates on `dragend`.
4. Cursor shapes during drag; Escape cancels (accepted).
5. Native ghost canvas item (3.13), removed on end; `dragPreview: 'none'` draws nothing.
6. Edge auto-scroll (Appendix A) through the `process()` decision function.
7. JS `DataTransfer` with protection modes and `effectAllowed`/`dropEffect` negotiation (HTML rules,
   simplified: if `dropEffect` set in `dragover` is not allowed by `effectAllowed`, the drop is not
   allowed).
8. **Demo**: a two-column board of cards (reorder within and across columns), a trash target that
   only accepts `move`, a list long enough to auto-scroll, and a "drop outside the UI" readout showing
   `endedOutsideRoot` and viewport coordinates.
9. **Verify**: reorder within a column, move across columns, rejected drop on a target that does not
   prevent `dragover`, Escape cancel, auto-scroll reaches the bottom of the list, drop outside reports
   coordinates, ghost visible in a mid-drag PNG, no `click` after a drag; Web touch: hold then move
   drags, quick swipe scrolls instead.

**Gate**: native gate and Web gate.

### Phase 11 — Accessibility

**Files**: `native/accessibility.rs` (new), `native/protocol.rs` (aria props), `native/lib.rs`,
`src/props.ts`, `src/components.tsx`, `src/kit/*`, `scripts/ax-dump.swift` (new), demo, docs.

1. `role` and `aria*` props (4.1), JS `role` and `aria-*` JSX props mapped to camelCase `PropsSpec`
   fields; kit components set roles and states.
2. `accessibility.rs`: role mapping (Appendix D), element registry `BTreeMap<u32, Rid>`, update pass on
   `NOTIFICATION_ACCESSIBILITY_UPDATE`, invalidate handling, frees on removal and `PREDELETE`, focused
   element override, actions bound to `_on_accessibility_action` with the node id and action
   (`Callable::from_object_method(...)` plus `bind`), and `queue_accessibility_update()` triggers.
   Before writing it, read `item_list.cpp` around the cited lines and `Control`'s own accessibility
   handling to confirm the parent element, bounds coordinate space and action callback argument order;
   record what you found.
3. Text inputs: `TEXT_FIELD`/`MULTILINE_TEXT_FIELD` with value, placeholder, read-only, and text
   selection via `create_sub_text_edit_elements` like `LineEdit` (read `line_edit.cpp`'s accessibility
   update first).
4. **Verify (macOS native)**: `scripts/ax-dump.swift` walks the Godot window's AX tree with
   `AXUIElementCreateApplication(pid)` and prints role, title/description, value and frame for every
   element. With the demo on the interaction tab, assert (in a small Node wrapper) that the buttons,
   checkbox (with checked state), slider (with value), text field (with value) and scroll view appear
   with frames inside the window. The terminal needs macOS Accessibility permission once; if it is not
   granted, stop and ask the user to grant it. Also record a short VoiceOver check (focus moves and
   announcements) in the progress log, or report that it could not be done. Web accessibility is not
   claimed; record `DisplayServer.hasFeature(FEATURE_ACCESSIBILITY_SCREEN_READER)` on Web for the README.

**Gate**: native gate (including the AX dump) and Web gate (regression only).

### Phase 12 — World-space UI recipe

**Files**: `demo/src/world-panel.ts` (new, with `.uid`), `demo/src/main.ts` (a launch flag
`--world-panel` or a demo-API toggle), `demo/src/verify-world.ts` (new), `scripts/verify.mjs`,
`package.json` (`verify:world`), `docs/WORLD_SPACE.md` (new). No native changes.

1. A 3D scene: `Camera3D`, a `MeshInstance3D` quad with an unshaded `StandardMaterial3D` whose albedo
   is a `SubViewport`'s `ViewportTexture`; the `SubViewport` (transparent background) contains its own
   `ReactUiRoot` and React root (a small panel with a button and a `TextInput`).
2. Input forwarding: in the owner's `_unhandledInput` (the 2D surface passes these through when
   pointer-transparent), intersect the camera ray (`projectRayOrigin`/`projectRayNormal`) with the
   quad plane analytically, convert to `SubViewport` pixels, copy the event with the new position and
   `pushInput(event, true)`; keyboard events go to the `SubViewport` while its root has focus.
3. Screen-space anchor: a label above a moving 3D node, positioned with `unprojectPosition` into an
   absolute element in the main root each frame.
4. **Verify**: a click on the quad's projected button increments a counter in the world panel;
   typing into the world `TextInput` works; the anchored label tracks the node (geometry check against
   `unprojectPosition`); PNGs inspected. Web: same checks if the Web template renders 3D; if it does
   not, record the evidence and limit the claim to native.

**Gate**: native gate (including `verify:world`) and Web gate.

### Final acceptance

- All gates pass from a clean build (`pnpm build:native && pnpm build`, then every verify command,
  native and Web).
- README "Current limits" lists exactly the non-goals of 2.2 plus anything recorded as not done.
- `native/PROTOCOL.md` documents protocol v2 completely; `docs/MOTION_ARCHITECTURE.md` "Adding
  features" table points at this plan's modules.
- `docs/INTERACTION_PROGRESS.md` has every gate's evidence.

---

## 6. Verification reference

- **Unit tests**: pure Rust modules (`events`, `geometry`, `pointer`, `focus`, `keymap`, `scroll`,
  `text_offsets`, `selection`, `text_input`, `drag`) carry most logic and must be tested without
  Godot. TypeScript tests use `RecordingHost` (`tests/renderer.test.ts`) extended with
  `resolveEvent` recording and a fake `subscribeToEvents`.
- **Native runtime**: drive real Godot input with `Input.parseInputEvent` as `demo/src/verify.ts`
  does. `parseInputEvent` buffers until the next iteration, so settle frames before asserting (the
  existing `settle()` helper). Touch: construct `InputEventScreenTouch`/`ScreenDrag` with `device = 0`.
- **Web runtime**: real Chrome input through Puppeteer (`page.mouse`, `page.keyboard`,
  `page.touchscreen`) and CDP (`Input.dispatchTouchEvent`, `Input.imeSetComposition`,
  `Input.insertText`), at DPR 1 and 2, landscape and portrait, plus a touch page, like
  `scripts/verify-web.mjs`.
- **Pixels**: clipping, stacking, selection highlight, caret, scrollbars and ghost need pixel checks or
  inspected PNG captures, not only snapshot geometry.
- **Known non-blocking teardown crash**: post-suite GodotJS/native shutdown crashes are expected; the
  success marker is authoritative. Mention teardown evidence when it appears.

---

## 7. Platform facts this design depends on

Engine source: `~/Development/godot` (its `version.py` says 4.7.2 on branch `breaka-4.7.2`; the
runtime binary reports `4.8.beta.custom_build` in `native/api/extension_api.json`). Line numbers refer
to that checkout; if they drift, find the code by symbol. godot-rust and Taffy paths are the exact
locked versions.

### 7.1 Input routing

- `Viewport::_gui_call_input` marks pointer events handled at the first `MOUSE_FILTER_STOP` control
  unless it is a scroll event and `force_pass_scroll_events` is set (`scene/main/viewport.cpp:1740-1779`,
  especially 1764-1767).
- Control lookup calls `has_point` (`viewport.cpp:1844-1876`); touch presses route to
  `gui_find_control` and are then pinned to `gui.touch_focus[index]` until release
  (`viewport.cpp:2212-2240`); screen drags go to the pinned control (`viewport.cpp:2262-2287`).
- Godot's own drag-and-drop starts from `get_drag_data` on the mouse-focus control after
  `gui.drag_threshold` (`viewport.cpp:2047-2093`). `ReactUiRoot` does not implement `get_drag_data`,
  so Godot never starts a drag from it.
- Keys go to `gui.key_focus` and, if not handled, on to focus navigation and unhandled input
  (`viewport.cpp:2309-2330`).
- Touch-to-mouse emulation sets `device = DEVICE_ID_EMULATION (-1)` on synthesized events
  (`core/input/input.cpp:908-944`, `core/input/input_event.h:64`).
- The Web platform `preventDefault()`s touch events (`platform/web/js/libs/library_godot_input.js:577-603`).

### 7.2 GDExtension surface (from `native/api/extension_api.json`)

- `Control` virtuals: `_has_point`, `_get_cursor_shape`, `_get_drag_data`, `_can_drop_data`,
  `_drop_data`, `_gui_input`, `_get_tooltip`, `_accessibility_get_contextual_info`. godot-rust 0.5.5
  generates `has_point(&self)`, `get_cursor_shape(&self) -> i32`, `can_drop_data(&self)`,
  `get_drag_data(&mut self)`, `drop_data(&mut self)` in `IControl`.
- `Control`: `set_force_pass_scroll_events`, `accept_event`, `grab_focus`, `release_focus`,
  `has_focus`, `force_drag`, `set_mouse_filter`.
- `Viewport`: `push_input(event, in_local_coords)`, `push_text_input`, `gui_release_focus`,
  `gui_get_focus_owner`, `set_input_as_handled`, `get_drag_threshold`.
- `Node`: `queue_accessibility_update`, `get_accessibility_element`, virtual
  `_get_focused_accessibility_element`; notifications `ACCESSIBILITY_UPDATE (3000)`,
  `ACCESSIBILITY_INVALIDATE (3001)`, `OS_IME_UPDATE (2013)`, `DRAG_BEGIN/END`. All are variants of
  godot-rust's generated `ControlNotification`.
- `MouseFilter`: STOP 0, PASS 1, IGNORE 2. `CursorShape`: ARROW 0 … HELP 16.

### 7.3 Text, IME, keyboard, clipboard

- `DisplayServer`: `window_set_ime_active(active, window_id)`, `window_set_ime_position(position,
  window_id)`, `ime_get_text()`, `ime_get_selection()`, `virtual_keyboard_show(existing_text: String,
  position: Rect2, type: VirtualKeyboardType, max_length: int, cursor_start: int, cursor_end: int)`,
  `virtual_keyboard_hide()`, `virtual_keyboard_get_height()`, `clipboard_get/set/has`,
  `clipboard_get/set_primary`, `cursor_set_shape`, `has_feature` (`FEATURE_IME`,
  `FEATURE_VIRTUAL_KEYBOARD`, `FEATURE_CLIPBOARD`, `FEATURE_TOUCHSCREEN`,
  `FEATURE_ACCESSIBILITY_SCREEN_READER`, …). `VirtualKeyboardType`: DEFAULT, MULTILINE, NUMBER,
  NUMBER_DECIMAL, PHONE, EMAIL_ADDRESS, PASSWORD, URL.
- `TextServer`: `shaped_text_hit_test_position`, `shaped_text_hit_test_grapheme`,
  `shaped_text_get_carets`, `shaped_text_get_selection`, `shaped_text_next_grapheme_pos`,
  `shaped_text_prev_grapheme_pos`, `shaped_text_get_word_breaks`, `shaped_text_get_grapheme_bounds`,
  `shaped_text_closest_character_pos`, `shaped_text_get_ascent`, `string_get_word_breaks`.
- `TextParagraph`: `hit_test(coords)`, `get_line_rid(line)`, `get_rid()`, `get_line_range(line)`,
  `get_line_size(line)`, `get_line_ascent/descent(line)`, `get_line_width(line)`, `get_line_count()`,
  `get_line_spacing()`, `duplicate()`.
- IME notifications reach every node (`scene/main/scene_tree.cpp:922-932`). Web IME start/update/commit
  (`platform/web/display_server_web.cpp:892-935`); commit text arrives as key events.
- Web virtual keyboard: hidden DOM `<input>`/`<textarea>` (`platform/web/js/libs/library_godot_display.js:31-170`),
  text delivered through `_set_text` by name (`scene/main/viewport.cpp:2856-2868`) plus synthetic
  RIGHT keys (`display_server_web.cpp:801-823`); availability requires the export option and touch
  (`library_godot_display.js:39-41`, `display_server_web.cpp:1227-1231`).
- Web `clipboard_get` returns a cached value and refreshes asynchronously
  (`display_server_web.cpp:1037-1039`).
- `LineEdit` references: unicode insertion rule (`scene/gui/line_edit.cpp:1053-1073`), IME window
  (`line_edit.cpp:124-147`), IME update (`line_edit.cpp:1694-1713`), virtual keyboard
  (`line_edit.cpp:2255-2262`), `_set_text` (`line_edit.cpp:2126-2142`), caret blink default
  (`scene/gui/line_edit.h:200`).

### 7.4 Re-entrancy and layout

- godot-rust re-entrancy through `base_mut()`: `godot-core-0.5.5/src/obj/traits.rs:456-501`; signals:
  `godot-core-0.5.5/src/signal/signal_object.rs:33`; `#[signal]` syntax and `self.signals()`:
  `godot-macros-0.5.5/src/lib.rs:1175-1200` (signals only in the primary `#[godot_api]` block,
  `lib.rs:1256`).
- Taffy scroll range: `taffy …/fca167c/src/tree/layout.rs:696-830`; positioning:
  `…/src/style/mod.rs:354-385`; `Overflow::Scroll` with `scrollbar_width = 0` behaves like `Hidden`
  (`…/src/style/mod.rs:467-470`).
- Godot `ScrollContainer` wheel, pan and touch behaviour to mirror:
  `scene/gui/scroll_container.cpp:190-226, 311-318, 450-480, 569-610`; `ScrollBar::PAGE_DIVISOR`
  (`scene/gui/scroll_bar.h:116`).

---

## 8. Risks and open questions

| Risk | Mitigation in this plan |
| --- | --- |
| Re-entrant JS during `gui_input` corrupts native assumptions | Rules 3.3.3–3.3.5; every default action re-validates; nested input is non-cancelable. Phase 1 tests a handler that unmounts the root and one that removes its own target. |
| Synchronous dispatch costs frame time | Discrete events only await; moves batch per `gui_input`; the existing profiler covers batches. Record the interaction verifier's JS dispatch time in the progress log at Phase 1 and Phase 10. |
| Web paste is stale | Explicit investigation in 8C; no fix without causal evidence. |
| Web virtual keyboard rewrites the whole value and moves the caret with RIGHT keys | `_set_text` mirrors `LineEdit`; verified with a real touch page in 8B. |
| Native IME cannot be automated | Manual evidence or an explicit "not verified" in the progress log and README. |
| Taffy absolute `location` semantics | Phase 5 task 1 measures before building on it. |
| Accessibility element coordinate space and callback argument order | Phase 11 task 2 reads `ItemList`/`Control` first and records findings. |
| Changing focus stealing breaks owners that relied on it | Documented owner responsibility (`grabFocus()` after mount) in README; demo updated in Phase 2. |
| Stacking simplifications differ from CSS in edge cases | Documented deviations (3.8); tests pin the supported cases. |

Open questions for the project owner (record answers in the progress log; defaults in brackets are
what to do if there is no answer):

1. Should Tab at the last element leave the root (Godot focus navigation) instead of wrapping? [Wrap,
   as today.]
2. Default `userSelect` for the root: `none` (game default) or `text`? [`none`.]
3. Should `Button` default to `cursor: pointer`? [No; browsers default to the arrow, apps opt in.]

---

## Appendix A — Constants

Name every value as a `const` next to its use, with the source comment shown here. "Tune with
evidence" means: keep the value unless a verifier or recorded user check shows it is wrong, and then
record the change.

| Constant | Value | Source / rationale |
| --- | --- | --- |
| `MAX_EVENT_DRAIN_ROUNDS` (JS) | 64 | Guard against event storms; each round drains the whole queue. |
| `MOUSE_POINTER_ID` | 1 | Chrome uses 1 for the mouse. |
| `KEYBOARD_POINTER_ID` | 0 | Synthetic activation, as browsers do. |
| `TOUCH_POINTER_ID_BASE` | 2 | First id after the mouse. |
| `CLICK_COUNT_INTERVAL_MS` | 500 | Common OS double-click default; Godot exposes no interval API. |
| `CLICK_COUNT_SLOP_PX` | 4 | Logical px between clicks of one sequence. |
| `TOUCH_SLOP_PX` | 8 | Android's touch slop (8 dp); Godot's `gui/common/default_scroll_deadzone` defaults to 0, which cannot distinguish taps from pans. |
| `TOUCH_DRAG_HOLD_MS` | 500 | Long-press to start a touch drag, matching mobile browser behaviour. Tune with evidence. |
| `SCROLL_PAGE_DIVISOR` | 8 | `ScrollBar::PAGE_DIVISOR` (`scene/gui/scroll_bar.h:116`). |
| `MOMENTUM_*` | mirror | Use the same deceleration as `ScrollContainer` `drag_touching_deaccel` (`scroll_container.cpp:569-610`); name the constants after reading it. |
| `SCROLLBAR_THICKNESS_PX` | 6 | Overlay thumb thickness. |
| `SCROLLBAR_MARGIN_PX` | 2 | Gap from the container edge. |
| `SCROLLBAR_MIN_THUMB_PX` | 24 | Keep the thumb grabbable. |
| `DEFAULT_SCROLLBAR_COLOR` | `#64748b99` | slate-500 at 60 %. |
| `AUTOSCROLL_EDGE_PX` | 32 | Drag auto-scroll zone. |
| `AUTOSCROLL_SPEED_PX_PER_SECOND` | 600 | Drag auto-scroll speed at the edge. Tune with evidence. |
| `DEFAULT_SELECTION_COLOR` | `#3b82f659` | blue-500 at 35 %. |
| `DEFAULT_PLACEHOLDER_ALPHA` | 0.5 | Placeholder uses the text colour at half alpha unless `placeholderColor` is set. |
| `CARET_WIDTH_PX` | 1 | Matches Godot's default `caret_width` theme constant; confirm in the default theme. |
| `CARET_BLINK_INTERVAL_MS` | 650 | `LineEdit::caret_blink_interval = 0.65` (`scene/gui/line_edit.h:200`). |
| `TEXT_INPUT_DEFAULT_COLUMNS` | 20 | HTML `<input size>` default. |
| `TEXT_AREA_DEFAULT_ROWS` | 2 | HTML `<textarea rows>` default. |
| `UNDO_LIMIT` | 100 | Per input. |
| `SECURE_TEXT_BULLET` | `'\u{2022}'` | Password mask character. |
| `DRAG_GHOST_OPACITY` | 0.6 | Browser-like translucent ghost. |
| `WHEEL_PAN_GESTURE` | — | Pan gestures use `SCROLL_PAGE_DIVISOR` like `ScrollContainer`; no separate constant. |
| `WHEEL_EVENT_DELTA_PX` (for the JS `wheel` event's `deltaX/Y` only) | client size / `SCROLL_PAGE_DIVISOR` × factor of the nearest scroll container, else root height / `SCROLL_PAGE_DIVISOR` × factor | Keeps the reported delta equal to the scroll actually applied. |

`cursor` → `Control.CursorShape`: default→ARROW, pointer→POINTING_HAND, text→IBEAM, move→MOVE,
grab→DRAG, grabbing→DRAG, not-allowed→FORBIDDEN, crosshair→CROSS, wait→WAIT, progress→BUSY,
help→HELP, ew-resize→HSIZE, ns-resize→VSIZE, nesw-resize→BDIAGSIZE, nwse-resize→FDIAGSIZE. Drag
session: allowed→CAN_DROP, not allowed→FORBIDDEN.

## Appendix B — DOM `key` and `code`

`key` (layout-dependent, what the key produces):

1. If `get_unicode() >= 32`, the character (`'a'`, `'A'`, `'!'`, `' '`).
2. Else if the key is in the named table, the name.
3. Else if `get_key_label()` is a printable character, that character (lowercase unless Shift), so
   Ctrl+C gives `'c'`.
4. Else `'Unidentified'`.

Named keys: Enter (also KP_Enter), Tab, Escape, Backspace, Delete, Insert, Home, End, PageUp,
PageDown, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Shift, Control, Alt, Meta, CapsLock, F1–F12,
ContextMenu (MENU), Pause, PrintScreen, ScrollLock, NumLock. Space produces `' '` by rule 1.

`code` (physical, from `get_physical_keycode()` and `get_location()`): KeyA–KeyZ, Digit0–Digit9,
F1–F12, Numpad0–Numpad9, NumpadAdd, NumpadSubtract, NumpadMultiply, NumpadDivide, NumpadDecimal,
NumpadEnter, Enter, Tab, Space, Escape, Backspace, Delete, Insert, Home, End, PageUp, PageDown,
ArrowLeft/Right/Up/Down, ShiftLeft/Right, ControlLeft/Right, AltLeft/Right, MetaLeft/Right, CapsLock,
Minus, Equal, BracketLeft, BracketRight, Backslash, Semicolon, Quote, Backquote, Comma, Period, Slash,
ContextMenu. Anything else: `'Unidentified'`.

## Appendix C — Edit commands

Match with `event.is_action(name, true)` (allow echo) in this order, like `LineEdit::gui_input`.
Commands marked M are multi-line only (Phase 8D).

| InputMap action | `EditCommand` | `inputType` (if it edits) |
| --- | --- | --- |
| `ui_text_submit` (single-line) | none natively; JS `onSubmit` handles Enter | — |
| `ui_text_newline` (M) | `InsertLineBreak` | `insertLineBreak` |
| `ui_copy` | `Copy` (not for `secure`) | — |
| `ui_cut` | `Cut` (not for `secure`) | `deleteByCut` |
| `ui_paste` | `Paste` | `insertFromPaste` |
| `ui_undo` / `ui_redo` | `Undo` / `Redo` | `historyUndo` / `historyRedo` |
| `ui_text_select_all` | `SelectAll` | — |
| `ui_text_backspace_all_to_left` | `DeleteToLineStart` | `deleteSoftLineBackward` |
| `ui_text_backspace_word` | `DeleteWordBackward` | `deleteWordBackward` |
| `ui_text_backspace` | `DeleteBackward` (grapheme) | `deleteContentBackward` |
| `ui_text_delete_all_to_right` | `DeleteToLineEnd` | `deleteSoftLineForward` |
| `ui_text_delete_word` | `DeleteWordForward` | `deleteWordForward` |
| `ui_text_delete` | `DeleteForward` (grapheme) | `deleteContentForward` |
| `ui_text_caret_word_left/right` | `MoveWord(dir, extend = Shift)` | — |
| `ui_text_caret_left/right` | `MoveGrapheme(dir, extend)`; with a selection and no Shift, collapse to that side | — |
| `ui_text_caret_line_start/end` | `MoveLineEdge(dir, extend)` | — |
| `ui_text_caret_up/down` (M) | `MoveLine(dir, extend)` keeping desired x | — |
| `ui_text_caret_page_up/down` (M) | `MovePage(dir, extend)` | — |
| `ui_text_caret_document_start/end` (M) | `MoveDocumentEdge(dir, extend)` | — |
| no action, no Ctrl/Alt/Meta, `unicode >= 32` | `InsertText(char)` | `insertText` |

Check the exact action names exist in the project's InputMap at runtime
(`InputMap.hasAction`) during Phase 8A and record the list; `LineEdit` and `TextEdit` use the names
above (`scene/gui/line_edit.cpp`, `scene/gui/text_edit.cpp`).

## Appendix D — Roles

| `role` prop | `AccessibilityServer.AccessibilityRole` |
| --- | --- |
| implicit `Button` / `button` | BUTTON |
| `checkbox` | CHECK_BOX |
| `switch` | CHECK_BUTTON |
| `radio` | RADIO_BUTTON |
| `radiogroup`, `group` | CONTAINER (with `ariaLabel` as name) |
| `slider` | SLIDER |
| `progressbar` | PROGRESS_INDICATOR |
| implicit `TextInput` / `textbox` | TEXT_FIELD, or MULTILINE_TEXT_FIELD when multi-line |
| implicit `Text` / `text` | STATIC_TEXT |
| `link` | LINK |
| `list` / `listitem` | LIST / LIST_ITEM |
| `listbox` / `option` | LIST_BOX / LIST_BOX_OPTION |
| `combobox` | BUTTON with `POPUP` type set via `update_set_popup_type` (record what Godot's `OptionButton` does and copy it) |
| `menu` / `menuitem` / `menuitemcheckbox` / `menuitemradio` | MENU / MENU_ITEM / MENU_ITEM_CHECK_BOX / MENU_ITEM_RADIO |
| `tablist` / `tab` / `tabpanel` | TAB_BAR / TAB / TAB_PANEL |
| `dialog` | DIALOG (set `FLAG_MODAL` when `ariaModal`) |
| `img` | IMAGE |
| `region` | REGION |
| `tooltip` | TOOLTIP |
| implicit scroll container | SCROLL_VIEW |
| `none` / `presentation` | not exposed; children attach to the nearest exposed ancestor |

Flags: `ariaDisabled`/`disabled` → FLAG_DISABLED, `ariaHidden` → not exposed, `ariaReadOnly` →
FLAG_READONLY, `ariaRequired` → FLAG_REQUIRED, `ariaModal` → FLAG_MODAL, `overflow` clipping →
FLAG_CLIPS_CHILDREN.
