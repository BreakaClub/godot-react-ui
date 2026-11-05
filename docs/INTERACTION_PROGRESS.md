# Interaction plan progress

Evidence log for `docs/INTERACTION_PLAN.md`. One section per phase: commands run, pass/fail counts,
artifact paths inspected, and every choice the plan left open. Raw command logs for a phase are kept
outside the repository; the numbers below are copied from them.

## Environment notes that apply to every phase

- **Cargo needs rustup first on `PATH`.** In this workstation's shell `/opt/homebrew/bin` precedes
  `~/.cargo/bin`, and the literal plan command `~/.cargo/bin/cargo test --locked` aborts:

  ```
  error: process didn't exit successfully: `rustc -vV` (signal: 6, SIGABRT: process abort signal)
  dyld[95125]: Symbol not found: __ZN4llvm10PGOOptionsC1ENSt3__112basic_string...
    Referenced from: /opt/homebrew/Cellar/rust/1.92.0/lib/librustc_driver-dfe564a45da94295.dylib
  ```

  `scripts/build-native.mjs` and `scripts/build-web.mjs` already prepend `~/.cargo/bin`. For direct
  cargo commands use `export PATH="$HOME/.cargo/bin:$PATH"` first. With it, `rustc -vV` reports 1.99.1.
- **Web gate port.** Port 8096 was already held by another tool's `node scripts/serve-web.mjs`
  (started 5 Nov 21:19 by a Codex app-server, serving this same `artifacts/web-debug`). It was left
  running. The Web gate used `PORT=8097 pnpm demo:web` with `GODOT_REACT_WEB_URL=http://127.0.0.1:8097`
  for both verifiers (both scripts read that variable), and the 8097 server was stopped afterwards.
- **GodotJS debugger port.** Native verifier logs contain `lws_socket_bind ... port 9229` and
  `Failed to bind debugger websocket ... debugger disabled for this runtime`. Another tool's
  long-running demo Godot process (pid 70296, started 00:36 from the Antigravity language server)
  owns 9229. It is not a verifier failure and does not match the verifier's error regex (`ERROR:`).
- **Host state while gating (6 Nov 2026).** `memory_pressure`: 36-42 % free. `vm.swapusage`: about
  16.4 GB of 17.4 GB used before the baseline, 17.1 GB of 18.4 GB after the split build. Load average
  7-10. No verifier timed out.
- **Protecting another process's dylib.** `copyFileSync` in `build-native.mjs` rewrites the installed
  dylib in place, which can fault a process that has it mapped (pid 70296 does). Before each
  `pnpm build:native` the installed copy `demo/addons/godot-react-ui/bin/libgodot_react_ui.dylib`
  (gitignored build output) was unlinked, so the script created a new file and the old process kept
  its own inode. The script itself is unchanged.

## Phase 0 - Baseline and module split

Date: 6 November 2026. Commit under test for the baseline: `7f0a96c` (code identical to `636242b`).

### 1. Baseline on the untouched tree

| Command | Result |
| --- | --- |
| `pnpm test:types` | clean |
| `pnpm test` | 13 passed, 0 failed |
| `cargo test --locked` | **19 passed**, 0 failed (9 `protocol::tests`, 7 `style_engine::tests`, 3 `input_tests`) |
| `cargo clippy --locked --all-targets` | **0 warnings**, 0 errors. This is the Phase 0 baseline: later phases must stay at 0 |
| `pnpm build:native` | ok (release already current; installed dylib sha256 `5214338795e8...`, 10,497,968 bytes) |
| `pnpm build` | ok |
| `pnpm verify` | exit 0; `GODOT_REACT_VERIFY_PASSED` for landscape and portrait; 26 captures (13 per viewport) |
| `pnpm verify:motion` | exit 0; `GODOT_REACT_MOTION_VERIFY_PASSED` for both viewports; 52 captures (26 per viewport) |
| `pnpm build:web` | ok; Wasm 6,739,346 bytes, SHA-256 `288974a2...`; 2 pre-existing build warnings (unstable `atomics` target feature, emcc linker flag notes) |
| `pnpm verify:web` (Chrome 156, port 8097) | passed: **249 assertions**, 53 captures, 0 page errors, 0 failed requests, 2 expected diagnostics (emscripten "Blocking on the main thread") |
| `pnpm verify:motion:web` | passed: **433 assertions**, 26 captures, 30 benchmark cells, 0 errors, 1 expected diagnostic |

Baseline PNGs inspected: `artifacts/native/landscape/05-keyboard-focus.png`,
`artifacts/native/portrait/09-full-grid.png`, `artifacts/native-motion/landscape/02-opening.png`,
`artifacts/native-motion/portrait/06-retargeting.png`,
`artifacts/web-verification/retina-landscape/05-keyboard-focus.png`,
`artifacts/web-verification/touch/01-touch-incremented.png`,
`artifacts/motion-web-verification/motion-dpr2/08-paint-in-flight.png`.

### 2. What moved (cut/paste; `HEAD` line numbers)

| Destination | Items moved from `native/lib.rs` |
| --- | --- |
| `native/motion.rs` | `IntrinsicTrack`, `MotionValue`, `TransitionRecord` (1062-1086); the whole second `impl ReactUiRoot` block (1088-1530: `activity_json`, `presentation_json`, `parent_basis`, `apply_presentation`, `publish_model`, `current_motion_value`, `target_motion_value`, `measure_endpoint`, `refresh_intrinsic_targets`, `finish_transitions`, `tick_motion`); free functions `color_components`, `color_hex`, `axis_property`, `property_axis`, `dimension_value`, `is_auto`, `resolve_dimension`, `property_changed`, `set_override`, `validate_motion_changes`, `effective_interpolate_size`; consts `HEX_COLOR_CHANNEL_MAX`, `PERCENTAGE_SCALE` |
| `native/geometry.rs` | `BoxRect` and its `impl` (56-77), `intersect_clip`, `intersects` |
| `native/pointer.rs` | `enabled_button_ancestor`, `shared_button_target`, `mod input_tests` |
| `native/layout.rs` | `compute_tree` |
| `native/paint.rs` | `parse_color`, `with_opacity` |
| `native/profile.rs` | `micros` |

`lib.rs` keeps the `ReactUiRoot` struct, both `IControl`/`#[godot_api]` blocks, the first inherent
`impl` (`sync_model`, `make_visual`, `flush_layout`, `collect_rects`, `hit_test`, `visible_for_input`,
`disabled`, `button_ancestor`, `emit`, `update_hover`, `set_focus`, `advance_focus`), `TextContext`,
`Visual`, `Stats`, `UiEvent`, and the remaining consts. `native/lib.rs` went from 1,730 to 917 lines
(new files: `motion.rs` 635, `pointer.rs` 85, `geometry.rs` 45, `layout.rs` 39, `paint.rs` 13).

**Edits beyond moving** (everything else is byte-identical, see "Proof of a pure move"):

1. `mod`/`use` lines in `lib.rs` and the new modules, plus one-line `//!` module comments.
2. `pub(crate)` on every item used across a new module boundary: `BoxRect` and its four fields and two
   methods, `intersect_clip`, `intersects`, `parse_color`, `with_opacity`, `enabled_button_ancestor`,
   `shared_button_target`, `compute_tree`, `IntrinsicTrack`, `TransitionRecord`,
   `validate_motion_changes`, and the six `ReactUiRoot` methods `lib.rs` calls
   (`activity_json`, `presentation_json`, `apply_presentation`, `publish_model`,
   `refresh_intrinsic_targets`, `tick_motion`). `micros` is `pub` like the rest of `profile.rs`.
3. In `mod input_tests`, one added `use crate::protocol::Command;` (it previously came in through
   `use super::*` from the crate root's imports).
4. `flush_layout`: the inline measure closure and its `compute_layout_with_measure` call are replaced
   by `compute_tree(&mut self.tree, root, self.viewport_size);`. The surrounding timing and counters
   are unchanged.

**`compute_tree` closure identity (checked before replacing).** Indentation-normalized diff of the
`flush_layout` closure (`HEAD:native/lib.rs:732-755`) against the `compute_tree` closure
(`1692-1714`) differs in exactly one construct: `flush_layout` binds
`let width = known.width.unwrap_or(match available.width {...}); paragraph.set_width(width);` while
`compute_tree` writes `paragraph.set_width(known.width.unwrap_or(match available.width {...}));`.
Same expression, evaluated once, in the same order. The available-space argument is
`Definite(self.viewport_size.x/.y)` in one and `Definite(size.x/.y)` with `size = self.viewport_size`
in the other. The only observable difference is the panic text on a layout error:
`"validated native layout tree"` (old `flush_layout`) becomes `"validated measurement tree"`.

**Proof of a pure move.** Multiset comparison of all non-blank lines of `HEAD:native/lib.rs` plus
`HEAD:native/profile.rs` against `lib.rs`, `geometry.rs`, `layout.rs`, `motion.rs`, `paint.rs`,
`pointer.rs`, `profile.rs` after removing the `pub(crate)`/`pub` prefixes. Lines present only in the
original: the 33-line `compute_layout_with_measure` statement in `flush_layout`
(`HEAD:native/lib.rs:725-757`, which duplicates `compute_tree`) and the old `use protocol::{...}` /
`use profile::...` lines. Lines present only in the new files: `mod`/`use` lines, the module `//!`
comments (one line each, two for `motion.rs`), `use crate::protocol::Command;`, and the single
`compute_tree(...)` call.

### 3. Phase 0 gate (after the split)

| Command | Result |
| --- | --- |
| `pnpm test:types` | clean |
| `pnpm test` | 13 passed |
| `cargo test --locked` | **19 passed**. Names identical to baseline except the three `input_tests` now print as `pointer::input_tests::...` |
| `cargo clippy --locked --all-targets` | **0 warnings** (no new warnings versus the baseline) |
| `pnpm build:native` | ok; dylib 10,274,688 bytes (see size note), sha256 `4a5c3bc5172e...`; a second `cargo build --release` reproduced the same hash |
| `pnpm build` | ok |
| `pnpm gen:types` | ok; `git status` identical before and after, so `demo/typings` and `demo/gen` are unchanged (no `#[func]`/`#[signal]`/class change) |
| `pnpm verify` | exit 0, both viewports passed, 26 captures |
| `pnpm verify:motion` | exit 0, both viewports passed, 52 captures (run twice, both passed) |
| `pnpm build:web` | ok; Wasm 6,525,152 bytes, SHA-256 `b9dca3d0...` |
| `pnpm verify:web` | passed: **249 assertions**, 53 captures, 0 errors, 2 expected diagnostics (identical to baseline) |
| `pnpm verify:motion:web` | passed: **433 assertions**, 26 captures, 30 benchmark cells, 0 errors, 1 expected diagnostic (identical to baseline) |

No GodotJS/native teardown crash or "teardown exited" message appeared in any native or Web log.

**Capture comparison, native.** SHA-256 of every PNG against the baseline run:
`artifacts/native`: 26 of 26 byte-identical. `artifacts/native-motion`: 26 of 52 identical; the 26
that differ are exactly the mid-transition frames (`02-opening`, `04-closing`, `05a/c/d/f/g/i/j/l`,
`06-retargeting`, `08-reversed`, `12-paint-intermediate`, per viewport). They are frame-timing
dependent: two runs of the same split binary differ from each other in 25 of those 26 files with the
same bounding boxes and magnitude as baseline-versus-split (for example `landscape/02-opening.png`:
26,146 pixels differ from baseline, 58,486 between the two split runs, max channel delta 204 in both,
all inside the moving panel). `landscape/12-paint-intermediate.png` differs from baseline only inside
the 72x40 px colour swatch (49,489)-(120,528), max channel delta 8, a colour caught at a slightly
different progress. The verifiers' own assertions for those states passed in every run.

**Post-split PNGs inspected:** `artifacts/native-motion/landscape/02-opening.png`,
`artifacts/native-motion/portrait/06-retargeting.png` (mid-transition clip and reflow correct),
`artifacts/web-verification/retina-portrait/09-full-grid.png`,
`artifacts/motion-web-verification/motion-dpr1/03-open.png`. The native baseline captures I inspected
(`05-keyboard-focus`, `09-full-grid`) are among the 26 byte-identical files.

**Binary size change (explained, not a regression).** The split removes 223,280 bytes from the
native dylib and 214,194 bytes (-3.18 %) from the Wasm. Cause: `TaffyTree::compute_layout_with_measure`
is generic over the measure closure, so the duplicate closure in `flush_layout` made the compiler
instantiate Taffy's layout engine twice. Built from `git archive HEAD`, the dylib is exactly the
baseline 10,497,968 bytes and contains two `compute_block_layout` instantiations,
`...compute_tree::{closure#0}` and `...ReactUiRoot::flush_layout::{closure#0}`; the split build
contains one (`...layout::compute_tree::{closure#0}`). Grid instantiations fell from 9 to 6.

### 4. Choices the plan left open

- Consts only used by moved code (`HEX_COLOR_CHANNEL_MAX`, `PERCENTAGE_SCALE`) moved with it to
  `motion.rs`; `MILLISECONDS_PER_SECOND` is used by both and stays in `lib.rs`
  (`use crate::{MILLISECONDS_PER_SECOND, ...}`).
- `pub(crate)` rather than `pub(super)`, because later phases add sibling modules that will need the
  same items.
- The `docs/MOTION_ARCHITECTURE.md` ownership list (step 5) said `native/lib.rs` applies presentation
  values; it now names `native/motion.rs`, `native/layout.rs` and `native/lib.rs` accurately.
- README untouched: nothing user-visible landed. Two figures in its dated "Verified on 5 November"
  paragraph no longer match a fresh run: `verify:web` reports 249 assertions (README: 247) and the
  optimized Wasm is 6,525,152 bytes (README: 6,739,346).
- `rustfmt` is not installed for the pinned 1.99.1 toolchain; `rustup run stable rustfmt --edition 2024
  --check` was used read-only. The only difference on lines written for this phase (the
  `use protocol::{...}` list) was applied. The remaining differences are in text moved verbatim
  (`lib.rs` `authored_layout_changed`, two `let active = ...` in `motion.rs`) or in untouched
  `style_engine.rs`, and were left alone.

### 5. Plan corrections found

- Section 3.2 says private fields are visible to child modules "so no visibility changes are needed".
  True for fields, false for methods: a private method in an `impl ReactUiRoot` block inside a child
  module is private to that module. Evidence: making `tick_motion` private again gives
  `error[E0624]: method `tick_motion` is private` at `native/lib.rs:311`. Methods that `lib.rs` calls,
  and any moved type or free function it uses, need `pub(crate)`.
- Section 0.4 needs rustup first on `PATH` for direct cargo commands, and a way to run the Web gate
  when 8096 is taken (`PORT=...` for `demo:web`, `GODOT_REACT_WEB_URL=...` for both Web verifiers).
- "A pure move must be invisible" holds for assertions and for all non-transition captures, but not
  for byte-identical PNGs of in-flight motion captures, and not for binary size (the duplicate
  closure removal). Later gates should compare assertions and inspected PNGs, not hashes of in-flight
  frames.
- `artifacts/web-verification/failure.png` (5 Nov 17:37) is a stale leftover; the verifier does not
  clear it, so its presence is not evidence of a failure in the current run.

## Phase 1 - Event pipeline (finish and land)

Date: 6 November 2026. macOS (Apple M1 Max), Godot 4.8 beta V8 build, release dylib for native, debug
Web template with Chrome 156 for Web. Host memory while gating: 40-43 % free, swap 17.0-17.6 GB used of
18.4 GB, load average 7-9 (the host stays swapped; no verifier timed out).

### What landed

Synchronous input dispatch. Native queues events and emits `events_ready` from inside `gui_input`; JS
drains, dispatches capture and bubble, and answers `preventDefault()` through `resolve_event` before the
signal returns. Details are in `native/PROTOCOL.md` ("Input events") and the README.

- Native: `native/events.rs` (wire types, `EventQueue` with the awaited/cancelable semantics, 11 tests),
  `native/pointer.rs` (`dom_buttons`, pointer constants, 1 test), `native/lib.rs` (`EventQueue` and
  `dispatch_depth`, `#[signal] events_ready`, `resolve_event`, `deliver`, `dispatch_cancelable`,
  `handle_input`/`press_primary`/`release_primary`, one enter and one leave per hover change).
- JS: `src/native.ts` (validated event union, `resolveEvent`), `src/events.ts` (event classes, the single
  event table, capture/bubble/root-listener dispatch, `exclusiveAncestry`), `src/renderer.ts` (required
  `subscribeToEvents`, enter/leave chains, bounded re-entrancy-guarded drain loop, `addEventListener`),
  `src/components.tsx`, `src/index.ts`.
- Tests: `tests/events.test.ts` (17 tests), `tests/recording-host.ts` (shared host), `tests/renderer.test.ts`
  (same 13 tests, unchanged assertions).
- Demo and verifiers: the **04 Interaction** tab (`demo/src/interaction-lab.tsx`), `demo/src/main.ts`,
  `demo/src/app.tsx`, `demo/src/verify-interaction.ts` (native), `scripts/verify-interaction-web.mjs`
  (Web), `scripts/verify.mjs --interaction`, `package.json`.
- Generated: `demo/typings/godot7.gen.d.ts` (`eventsReady`, `resolveEvent`),
  `demo/gen/godot/src/verify-interaction.ts.gen.ts`, `demo/src/verify-interaction.ts.uid`.
- Docs: `native/PROTOCOL.md`, `README.md`, `docs/MOTION_ARCHITECTURE.md` (it said events never reach JS while
  Rust holds the root borrow).

Files beyond the plan's list, and why: `scripts/build.mjs` (esbuild entry point for the new verifier, so
its script and generated typings sit with `verify.ts` and `verify-motion.ts`), `tests/recording-host.ts`
(`RecordingHost` is shared by two test files; a `*.test.ts` import would re-run the tests),
`docs/MOTION_ARCHITECTURE.md`.

### Gate

| Command | Result |
| --- | --- |
| `pnpm test:types` | clean |
| `pnpm test` | **30 passed** (13 existing, assertions unchanged, plus 17 new) |
| `cargo test --locked` | **31 passed** (19 baseline, 11 `events`, 1 `pointer`) |
| `cargo clippy --locked --all-targets` | **0 warnings** |
| `pnpm build:native` | ok (default dylib 10,314,848 bytes, sha256 `ddc82477db65...`) |
| `pnpm gen:types` | ok; `git status` identical before and after (typings already regenerated) |
| `pnpm build` | ok |
| `pnpm verify` | exit 0, both viewports passed, no engine errors |
| `pnpm verify:motion` | exit 0, both viewports passed, unchanged assertions |
| `pnpm verify:interaction` | exit 0, both viewports passed, no `ERROR:`/panic/`Uncaught` in the log |
| `pnpm build:web` | ok; Wasm 6,542,640 bytes (Phase 0: 6,525,152) |
| `pnpm verify:web` (port 8097) | passed: **249 assertions**, 53 captures, 0 page errors, 0 failed requests (unchanged) |
| `pnpm verify:motion:web` | passed: **433 assertions**, 26 captures, 30 benchmark cells (unchanged) |
| `pnpm verify:interaction:web` | passed: **158 assertions**, 33 captures, 0 page errors, 0 failed requests |

`verify:web` reports 3 expected diagnostics where Phase 0 had 2. The third is the documented benign
`net::ERR_ABORTED` on the completed `index.pck` stream close, accepted by the verifier only after it
checks the exact byte count and SHA-256 (it happened on the touch page this run; it is timing
dependent). The Phase 0 captures cannot be compared byte for byte: the fourth tab changes every
screen, and in portrait the tab row now wraps to a second row.

`verify:interaction` and `verify:interaction:web` assert, in both viewports (Web at both DPRs plus a
touch page): capture then bubble order; `stopPropagation` in capture stops bubble and root listeners;
a prevented `pointerdown` does not focus its button and its `click` still fires; synchronous dispatch
(the `pointerdown` handler sees the old focus, the `focus` handler runs in the same process frame, native
frame numbers equal); enter/leave chains (`parent:enter a:enter a:leave b:enter b:leave parent:leave`,
the parent stays hovered between siblings); a handler that removes its own target (default action
skipped, no click on the removed element); a handler that detaches the root from the scene tree (no
default action, no `focused`/`pressed`/`hovered`, the root works after re-entering); and a handler that
unmounts the React root (surface freed natively, fresh root dispatches normally).

PNGs inspected: `artifacts/native-interaction/landscape/{01-interaction,02-capture-bubble,04-prevent-default,05-enter-leave,06-self-removed}.png`,
`artifacts/native-interaction/portrait/{01-interaction,07-reattached,08-remounted}.png`,
`artifacts/native/portrait/01-counter.png`, `artifacts/native-motion/landscape/03-open.png`,
`artifacts/web-interaction-verification/retina-landscape/05-enter-leave.png`,
`artifacts/web-interaction-verification/portrait/06-self-removed.png`,
`artifacts/web-interaction-verification/touch/01-touch-interaction.png`. The lab fits its 520 px body in
both viewports.

### JS dispatch time per synchronous event

JS time inside the one `dispatchEvents` call a mouse press waits for (the first `events` profile sample
after the press, which is the cancelable `pointerdown`; it includes handler work, `flushSyncWork()` and
the trailing `container.flush()`, and excludes the Godot-to-V8 call itself). 40 presses per cell. "Cheap" is
a handler that only calls `preventDefault()`; "state-updating" sets React state three times. Milliseconds,
p50 / p95 / max.

| Platform | Viewport | Cheap handler | State-updating handler |
| --- | --- | --- | --- |
| native macOS (release dylib) | landscape 1120x800 | 0.93 / 1.47 / 1.64 | 1.66 / 3.04 / 3.12 |
| native macOS (release dylib) | portrait 600x900 | 0.84 / 1.10 / 1.23 | 1.32 / 2.08 / 2.24 |
| Web, Chrome 156 (debug template) | landscape | 0.90 / 1.01 / 1.72 | 1.80 / 2.54 / 2.64 |
| Web, Chrome 156 (debug template) | portrait | 0.82 / 0.93 / 0.94 | 1.74 / 2.60 / 2.64 |
| Web, Chrome 156 (debug template) | retina-landscape | 0.86 / 0.97 / 1.36 | 1.82 / 2.74 / 2.86 |
| Web, Chrome 156 (debug template) | retina-portrait | 0.79 / 0.89 / 0.90 | 1.79 / 2.72 / 5.34 |

A first native run measured the same range (cheap p95 1.56 / 0.98 ms, state-updating p95 2.34 / 1.67 ms).
Both stay well under one 60 Hz frame (16.7 ms). Every press also runs the whole-tree `flush()`, which the
Fabric core replaces.

### Choices the plan left open

- `detail` is 1 on a mouse `click` and 0 elsewhere: click counting belongs to the pointer model.
- `focus`/`blur` carry no payload fields yet (`relatedTarget` and `focusVisible` come with the keyboard model).
- The event table maps each type to typed getters (`p => p.onPointerDown`) instead of prop-name strings:
  a name table would need a cast to call a handler whose parameter type depends on the name. `UIEvent`
  stays as an alias of `UIPointerEvent`; `onFocus`/`onBlur` take `UIFocusEvent`, which has no coordinates.
- A handler that throws ends dispatch of that event and is recorded; the first error is rethrown after
  the loop, later ones go to `onError` (or `console.error`) so none is dropped.
- The enter/leave rule changes the `active:` behaviour slightly: moving from a pressed button's label to
  its padding no longer drops the button's `active` paint (leave only touches elements below the common
  ancestor). `focus:` still applies to every ancestor of the focused element, as before; that moves to
  `focus-within:` in the Fabric phases.
- `press_primary` skips the default action when the target was removed during dispatch (plan rule 3),
  rather than treating it as a click on empty space (which would blur the current focus).
- TypeScript `#private` class fields run under GodotJS and in Chrome (used by the event classes).
- `pnpm gen:types` could not run first: `pnpm build` typechecks, and the demo already used
  `eventsReady`. The Godot step was run directly once after `pnpm build:native`.

### Plan corrections found

- Plan section 1 says the measured JS dispatch is "about 1-2.5 ms p95 on native macOS"; the gate run
  measured up to 3.04 ms p95 for the state-updating handler in landscape (table above).
- The Web interaction verifier has to leave a fresh root at the end of each viewport: the page persists
  across viewports (the native verifier gets a new Godot process each time), so the lab's log and click
  counters leaked into the next viewport on the first run. A verifier script bug, not a product bug.
- Phase 1's Files list does not include `scripts/build.mjs`, `tests/recording-host.ts`, the README,
  `native/PROTOCOL.md` or `docs/MOTION_ARCHITECTURE.md` (all touched; section 0.1 allows it).
