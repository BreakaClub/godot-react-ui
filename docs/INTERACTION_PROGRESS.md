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

## Phase F0 - Evidence for the Fabric core (measurement only)

Date: 6 November 2026. No product behaviour changed: the probe is compiled only with the `probe` cargo
feature, and the benchmark fixture and runner gained scenarios without changing the existing ones.

**Decision gate: not passed as specified.** Handle creation is well inside its limit on both platforms,
but `live_handles()` did not return to its starting value within 30 s of idle frames on native in any of
three passes, and on Web in one of three. On native it did return, within one to three rounds of
allocating 250,000 JS objects, once the JS heap was under pressure (on Web the one stuck pass was left
with a single live handle), and the supplementary steady-state pass shows the live count staying bounded
while commits allocate. Plan section 0.2 and F0 task 5 say to stop and
report here; no fallback was chosen and Phase F1 was not started. Details below.

### Platforms, build modes and host state

| Run | Platform and build | Host memory at the run |
| --- | --- | --- |
| Native probe | macOS (Apple M1 Max), `Godot48.app` (reports a debug engine build), release probe dylib built with `--features probe` into `target/probe`, 10,425,584 bytes | 46 % free, swap 18.2 GB of 19.5 GB used, load average 7.6 / 11.7 / 12.1 |
| Web probe | Chrome 156 (headless, 10 cores), debug Web template, probe Wasm built with `--features web,probe` into `target/web-probe`, 6,607,977 bytes, DPR 1, 1120x800 | 49 % free, swap 19.3 GB of 20.5 GB used, load average 9.9 / 13.6 / 13.0 |
| Baseline benchmarks | the same Chrome and debug template, **default** build, DPR 1, 1120x800 | 52 % free, swap 19.3 GB of 20.5 GB used, load average 11.5 / 11.0 / 11.8 |

The host stayed heavily swapped and loaded throughout, so absolute times are likely biased upwards;
ratios and counts are the evidence.

### What was added

- `native/probe.rs` (cargo feature `probe`, `Cargo.toml`): `ReactUiProbeHandle` (a `RefCounted` owning a
  fresh `Rc<Vec<u8>>` of 64 bytes; a counter incremented on creation and decremented in `Drop`) and
  `ReactUiProbe` with `make_handle`, `live_handles`, `noop`, `string_length` (marshalling only),
  `probe_parse` (JS string to `GString` to `String` to `serde_json` into today's `StyleSpec`, plus
  `validate()`), and `count_handles_typed` / `count_handles_untyped`.
- `scripts/build-native.mjs --probe` and `scripts/build-web.mjs --probe` build the feature into
  `target/probe` and `target/web-probe` and install over the default library; a default build restores
  it. `demo/src/probe.ts` runs the measurements (`--probe` natively, `godotReactDemo.runProbe()` on Web)
  and `scripts/probe-web.mjs` drives it in Chrome. The probe's classes are declared in `probe.ts` by
  module augmentation, so default generated typings do not mention them (checked: `gen:types` with the
  default dylib leaves `demo/typings` unchanged).
- Benchmarks: `demo/src/benchmark.tsx` gained `hover` and `responsive` fixture modes, an `only` option
  and a React commit counter (`Profiler`); `scripts/verify-motion-web.mjs --baseline` runs four scenarios
  at 50 and 2,000 cells into `artifacts/fabric-baseline/` without touching the motion evidence.
- Extra files beyond the plan's list: `native/lib.rs` (one `mod probe;` line), `demo/src/main.ts` (the
  `--probe` argument and `runProbe`), `scripts/build.mjs` (esbuild entry), `scripts/probe-web.mjs`, and the
  generated `demo/src/probe.ts.uid` and `demo/gen/godot/src/probe.ts.gen.ts`.

### 1. Handle creation and reclamation (100,000 handles, 64-byte payload)

Creation: batch mean is the loop time over 100,000 `make_handle` calls; per-call is each call timed with
`Time.getTicksUsec()` (integer microseconds natively, 5 us steps on a cross-origin-isolated Web page, so
the batch mean is the more precise figure). "Churn" drops each handle at once.

| Platform | Batch mean us/call (100,000 creates) | Per-call median / p95 / p99 / max us | Churn mean us/call | Limit us | Result |
| --- | --- | --- | --- | --- | --- |
| native macOS | 3.585 | 4 / 4 / 5 / 191 | 3.597 | 10 | pass |
| Web (Chrome) | 5.912 | 5 / 10 / 15 / 3455 | 6.017 | 30 | pass |

Reclamation after dropping every reference, sampling `live_handles()` and `Performance` object count once
a second for up to 30 s while the engine keeps rendering frames (the demo is mounted). Peak live is 100,000
in every pass; the engine object count tracked it (native 101,649 then constant, Web 101,318).

| Platform | Pass | Peak live | Live after 30 s idle | Back to start within 30 s? | Allocation-pressure rounds to reclaim (250,000 JS objects each) |
| --- | --- | --- | --- | --- | --- |
| native macOS | retained, batch timed | 100,000 | 100,000 | NO | 2 |
| native macOS | retained, per-call timed | 100,000 | 100,000 | NO | 3 |
| native macOS | churn (dropped at once) | 100,000 | 100,000 | NO | 1 |
| Web (Chrome) | retained, batch timed | 100,000 | 0 | yes, at 23 s | n/a |
| Web (Chrome) | retained, per-call timed | 100,000 | 1 | NO | not reclaimed after 40 |
| Web (Chrome) | churn (dropped at once) | 100,001 | 0 | yes, at 1 s | n/a |

On Web, pass 2 ended with 99,999 of 100,000 handles reclaimed and one still live after 40 rounds of
pressure; I did not establish what held it (the probe's last loop iteration is a candidate).

Supplementary, outside the gate (the question the gate leaves open): does the live count stay bounded
while something is committing? Each commit allocates a handle and a small JS instance for every node of a
2,000-node tree, 16 ms apart, and the previous commit's tree stays reachable for one more commit.

| Platform | Commits x nodes | Handles created | Commit mean ms | Peak live | Live in 2nd half (min - max) | Live at end | First decrease at commit | Idle reclaim after stopping |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| native macOS | 300 x 2,000 | 600,000 | 8.39 | 134,000 | 36,000 - 134,000 | 70,000 | 9 | no (live 70,000) |
| Web (Chrome) | 300 x 2,000 | 600,000 | 12.34 | 104,000 | 4,000 - 104,000 | 18,000 | 50 | yes |

Reading: while commits allocate, V8 collects and the live count saw-tooths (second half: native 36,000 to
134,000, which is 18 to 67 commits' worth of nodes; Web 4,000 to 104,000, 2 to 52 commits' worth), but it
is not tight, and on native the remainder is not collected once allocation stops (Web collected it within
6 s). Per-handle native memory was not measured.

### 2. Props string boundary (microseconds per call, batch mean over 10,000 calls)

"String only" is JS string to `GString` to `String`; "parse" adds `serde_json` into `StyleSpec` and
`validate()`. The 3-key diff is `{backgroundColor, opacity, width}`; the 40-property style sets 40 of
`StyleSpec`'s 41 fields (all but `transition`).

| Platform | Call floor (`liveHandles`) | `noop` | 3-key diff (bytes): string only / parse | 40-property style (bytes): string only / parse |
| --- | --- | --- | --- | --- |
| native macOS | 0.168 | 0.093 | (55) 0.663 / 0.843 | (696) 3.965 / 5.325 |
| Web (Chrome) | 0.788 | 0.504 | (55) 3.311 / 3.053 | (696) 18.108 / 19.970 |

### 3. Arrays of handles

A JS array of 1, 50 and 500 handles passed as an argument (2,000 calls each, batch mean).

| Platform | Array of | Typed `Array<Gd<T>>` | Untyped `Array`: us per call | ns per element |
| --- | --- | --- | --- | --- |
| native macOS | 1 handles | rejected | 1.14 | 1141 |
| native macOS | 50 handles | rejected | 35.78 | 716 |
| native macOS | 500 handles | rejected | 353.27 | 707 |
| Web (Chrome) | 1 handles | rejected | 5.04 | 5040 |
| Web (Chrome) | 50 handles | rejected | 105.75 | 2115 |
| Web (Chrome) | 500 handles | rejected | 973.30 | 1947 |

The plan's signature `Array<Gd<ShadowNodeHandle>>` does not work. GodotJS converts a JS array to an
untyped `Array`, and godot-rust rejects it for a typed parameter, natively and on Web:

```
ERROR: godot-rust function call failed: ReactUiProbe::count_handles_typed()
    Reason: parameter #0 (Array<Gd<ReactUiProbeHandle>>) conversion
  Source: expected array of type Class(ReactUiProbeHandle), got Untyped: [<ReactUiProbeHandle#...>]
   at: godot_core::private::handle_fallible_call (godot-core-0.5.5/src/private.rs:539)
```

An untyped `VarArray` parameter works and converts each element natively (about 0.7 us per element
natively, 2 to 5 us on Web).

### 4. Baseline benchmarks of the current renderer (Web, DPR 1)

Phase 1 renderer, default build, 30 repetitions for (a) and (b), 200 mouse moves for (c) (all 50 cells in
the 50-cell case), 10 crossings of the `md` breakpoint each way for (d) (viewport 1120 to 700 and back).
(a) changes one cell's colour, (b) every cell's, (c) sweeps the mouse over cells with `hover:` styles,
(d) resizes across `md` with `md:` classes on every cell. "React commits" counts `Profiler` `onRender`
calls of the fixture. "JS flush" is the renderer's whole-tree `flush()`, which runs after every React
commit and after every batch of input events. The native batch runs inside the JS flush (do not add them);
draw CPU time is recorded separately.

| Scenario | Cells (nodes) | React commits | JS reconcile p50 / p95 ms | JS flush (commit) p50 / p95 ms | JS events p50 / p95 ms | Native batch p50 / p95 us | Native draw CPU p50 / p95 us | JS flushes | Native batches | Layout passes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2000-a-one-cell-colour | 2,000 (2,003) | 30 | 24.75 / 56.22 | 12.91 / 14.19 | - | 11664 / 12882 | 16342 / 17535 | 30 | 30 | 0 |
| 2000-b-every-cell-colour | 2,000 (2,003) | 30 | 41.30 / 70.40 | 28.34 / 29.94 | - | 20347 / 21957 | 15885 / 17383 | 30 | 30 | 0 |
| 2000-c-hover-sweep | 2,000 (2,003) | 0 | - | 12.87 / 14.39 | 12.96 / 14.47 | 11752 / 13204 | 15777 / 17522 | 200 | 200 | 0 |
| 2000-d-breakpoint-resize | 2,000 (2,003) | 0 | - | 29.04 / 30.07 | - | 20908 / 21593 | 15804 / 16795 | 20 | 20 | 40 |
| 50-a-one-cell-colour | 50 (53) | 30 | 2.98 / 3.67 | 0.92 / 1.18 | - | 788 / 1025 | 869 / 1038 | 30 | 30 | 0 |
| 50-b-every-cell-colour | 50 (53) | 30 | 3.49 / 4.92 | 1.49 / 2.14 | - | 1117 / 1625 | 777 / 1060 | 30 | 30 | 0 |
| 50-c-hover-sweep | 50 (53) | 0 | - | 1.24 / 1.79 | 1.40 / 1.99 | 1037 / 1517 | 1080 / 1554 | 50 | 50 | 0 |
| 50-d-breakpoint-resize | 50 (53) | 0 | - | 1.06 / 1.22 | - | 760 / 917 | 557 / 727 | 20 | 20 | 40 |

Reading (2,000 cells against 50, median): changing one cell costs 8x the React time, 14x the JS flush, 15x
the native batch and 19x the draw time. A hover costs 9x, 11x and 15x with no React commit at all
(a 2,000-node move is about 13 ms of JS events plus a 16 ms draw, over one 60 Hz frame). A breakpoint
crossing costs 27x in JS and native batch. These are the whole-tree costs the plan predicted by code
inspection; F4's target is a ratio of at most 2.

### Default builds are unchanged

| Artifact | Phase 1 (`0d11607`) | After F0, probe off | With the probe |
| --- | --- | --- | --- |
| Native dylib | 10,314,848 bytes | 10,314,848 bytes | 10,425,584 bytes |
| Web Wasm | 6,542,640 bytes | 6,542,640 bytes | 6,607,977 bytes |

The hashes of the default artifacts differ from Phase 1 (embedded source line numbers moved by the
`mod probe;` line); the sizes do not. Default `demo/typings` and `demo/gen` contain no probe classes.

### Gate

| Command | Result |
| --- | --- |
| `pnpm test:types` / `pnpm test` | clean / **30 passed** (unchanged) |
| `cargo test --locked` | **31 passed** (unchanged) |
| `cargo clippy --locked --all-targets` | **0 warnings**, also with `--features probe` |
| `pnpm verify`, `verify:motion`, `verify:interaction` | exit 0, both viewports, no errors |
| `pnpm verify:web`, `verify:motion:web`, `verify:interaction:web` | 249, 433 and 158 assertions, all unchanged |

### Plan problems found

- Plan 4.1 and 3.1 give `complete_root(layer, children: Array<Gd<ShadowNodeHandle>>)`: a typed array
  argument is rejected (task 3 above); it must be an untyped array validated natively.
- The reclamation gate ("`live_handles()` returns to its starting value within the timeout") measures
  idle wall-clock time, but reclamation is driven by JS heap allocation, not by time: natively no handle
  was reclaimed in 30 idle seconds and all were reclaimed after one to three allocation rounds. The gate
  as written fails; whether the property that matters (bounded live handles while committing) holds is a
  question for the steady-state numbers above.
- The Web probe runner must allow the typed-array rejection lines (19 console lines) or it sees them as
  errors; they are expected output of the array test.
- F0's Files list omits `native/lib.rs`, `demo/src/main.ts`, `scripts/build.mjs`, `scripts/probe-web.mjs`
  and the generated `.uid`/`.gen.ts` of `probe.ts`.

### Decision D2 (coordinator, after F0)

The persistent shadow tree lives in JS (plan v2.1, `fdea46d`, decision log D2). Native `RefCounted`
handles were cheap to create (4 µs native, 5 µs Web) but reclaimed only under JS allocation pressure
(table above). Before choosing, `modules/GodotJS` was searched for V8 external-memory reporting: there is
no `AdjustAmountOfExternalAllocatedMemory` call anywhere, only a manual full-GC request
(`bridge/jsb_environment.cpp:3433-3450`), so wrapping native nodes in any Godot type cannot make V8 see
their native memory. A JS shadow tree keeps that memory in the JS heap, removes every native call from
render, and sends one payload per commit with only the changed nodes. The plan's F1-F4 tasks were
rewritten accordingly; the typed-array and Files-list findings above are folded into the plan.

## Phase F1 - Props, commit validation and differ (Godot-free)

Date: 6 November 2026. Native-only, nothing in the runtime calls the new modules yet (they carry a
`#[allow(dead_code)]` in `native/lib.rs` that Phase F3 removes when it wires them in). Host while
gating: 44 % free, swap 17.9 GB of 19.5 GB used, load average 8.4.

### What landed

| Module | Contents |
| --- | --- |
| `native/props.rs` | `Kind`, `PropsSpec` (`style`, `text`, `disabled`, `hidden`, `testID`), `PropsDiff` with `Patch<T>` (`Keep` / `Reset` / `Set`), `StyleLayers`/`StyleLayer`/`PseudoState`, `StyleSpec` in longhand form (`overflowX`/`overflowY` replace `overflow`, `disabled` moved to the props, no `padding`/`margin`/`gap` shorthands), `StyleSpec::merge` (exhaustively destructured, so a new field that is not merged fails to compile), `taffy_style`, `merge_diff(previous, kind, diff_json)` |
| `native/commit.rs` | `CommitPayload` (`created`, `updated`, `children`, all `deny_unknown_fields`), the `MountedTree` read-only trait, `validate(payload, layer, mounted) -> ValidatedCommit`, `plan(validated, mounted) -> MountingTransaction` |
| `native/diff.rs` | `Parent`, `diff_children` (prefix/suffix, longest increasing subsequence for the middle), `MountingTransaction` (`removes`, `deletes`, `creates`, `updates`, `inserts`), a fixed-seed PRNG shared by the property tests |
| `native/computed_style.rs` | `resolve(layers, hidden, inherited, conditions)`, `ComputedStyle`/`InheritedStyle`, `PseudoStates`, `InteractionState::states_of` (the CSS state semantics of plan 3.6), `BreakpointIndex`, the `StyleTree` trait with `restyle` (depth-ordered, stops where inherited inputs are unchanged), `depth` and `chain` |

`native/protocol.rs` (the v1 batch protocol, deleted in F3) now re-exports the enums and mapping
helpers it shared with `props.rs` instead of duplicating them (no behaviour change; its 9 tests
still pass).

### Gate

| Command | Result |
| --- | --- |
| `cargo test --locked` | **84 passed** (was 31): `props` 9, `diff` 7, `commit` 22, `computed_style` 15, plus the 31 existing (`events` 11, `pointer` 4, `protocol` 9, `style_engine` 7) |
| `cargo clippy --locked --all-targets` | **0 warnings**, also with `--features probe` |
| `pnpm test`, `pnpm test:types` | unchanged (30 passed, clean): no TypeScript touched |

Every `protocol.rs` test is ported: the five that exercise `StyleSpec` (unknown styles and invalid
values, transition contract, invalid transition shapes, hidden overflow releasing the flex content
minimum, flex and grid geometry) live in `props.rs`; the four that exercise `Model` map to commit
tests (a rejected payload leaves the mounted tree unchanged; cycles and duplicate children;
re-parenting, removal and no tag reuse; leaf shape).

Commit validation tests assert for every rejection that the mounted tree is byte-identical
afterwards: reused, duplicate and zero tags; updates to unknown, repeated or other-layer nodes; unknown
and repeated children; children of `Text`; two parents (including through a node that moved in the
same payload); cycles (direct and through a same-payload move); created nodes left unattached
(loose, attached to another loose node, attached to a node the payload detaches); a rewritten list for
a detached node; invalid prop diffs. The differ property test (`PROPERTY_TEST_CASES` = 500, fixed
seed) checks that applying the diff to the old list gives exactly the new one and that every removal
is a drop or a move and every insertion a new child or a move. The commit property test (500 cases,
fixed seed) builds a random mounted forest, drops nodes, creates nodes and gives every survivor a new
random parent and child order, then checks that `validate` accepts the payload, that applying the
planned transaction yields exactly the new structure, and that `deletes` is exactly the set of nodes
that did not survive. The test asserts the generator really produced deleting, creating, moving and
move-out-of-a-deleted-parent cases (at least 50, 50, 50 and 10 of the 500).

### Choices the plan left open

- **No `TextInput` kind yet.** Plan F1 asks for a "children of `Text`/`TextInput`" test. `Kind`
  has `View`, `Text` and `Button`; `Kind::allows_children` is the single place the rule lives and the
  `TextInput` variant joins it in I7 (a wire kind that renders nothing would be a half-implemented
  feature). The rule is tested for `Text`.
- **`validate` takes the layer** (`validate(payload, layer, mounted)`) because "mounted in this
  layer" is part of the rules (a tag of the overlay layer cannot be updated or listed by a main-layer
  commit), and `MountedTree` therefore also answers `layer(tag)`.
- **The wire key for the test id is `testID`** (as in the plan's prop table); serde's camelCase would
  have produced `testId`.
- **A node moving out of a parent that is itself being deleted is legal, and gets an explicit
  removal.** The strict reading of plan 3.4 ("at most one parent") would reject a payload that moves
  a child out of a deleted parent without rewriting the dead parent's list. React cannot produce that
  edit (it never moves a host instance across parents), but the native contract says a moved subtree
  must not be deleted, so `plan` detaches such a node from its old parent explicitly and the mounting
  layer never sees a node with two parents. A rewritten list for a node the same payload detaches
  *is* rejected.
- **Created props may be amended by an `updated` entry for the same tag** (plan: "updated tags must
  be mounted (or created in this payload)"); the merged result is what is created.
- **`Patch<T>` instead of `Option<Option<T>>`** for diffs: serde cannot tell an absent key from `null`
  with the latter.
- **Removals are emitted per parent in descending index order and insertions in ascending final
  index order**, which is what makes sequential application correct without index fix-ups; the
  reference applier in the tests and the property tests rely on exactly that.
- `StyleLayers` serializes as `{ "layers": [...] }` and a layer's `minWidth` is a `f32` threshold
  keyed in the breakpoint index by its bit pattern (valid for the finite, nonnegative values
  validation allows), so a resize finds the affected nodes with one ordered range query.

### Plan problems found

- Plan F1 does not mention that `validate` needs the layer, nor how a node leaving a deleted parent is
  detached; both are decided above.
- The plan's `diff.rs` task says the property test applies `plan` to the old structure, but `plan`
  lives in `commit.rs` (3.4); the test is in `commit.rs`, the list-level property test in `diff.rs`.

## Phase F2 - JS style compiler, native-prop table and commit walk

Date: 6 November 2026. TypeScript only, plus two Rust tests that read the fixtures the TypeScript
tests produce. The v1 renderer still drives the runtime; nothing calls the new modules until F3.

### What landed

| File | Contents |
| --- | --- |
| `src/styles.ts` | `compileStyle(className, style) -> CompiledStyle` (ordered layers with `minWidth` and `states`, shorthands expanded to longhands, adjacent layers with equal conditions merged, interned by a canonical key, deeply frozen, never sharing the caller's objects), `styleKey`; new `focus-visible:` / `focus-within:` variants and `overflow-x-*` / `overflow-y-*` utilities. `resolveStyles` is unchanged in behaviour (the v1 renderer still calls it) |
| `src/types.ts` | `PseudoState`, `StyleLayer`, `CompiledStyle`, `LonghandStyle`; `Style` gains `overflowX`/`overflowY` |
| `src/props.ts` | the native prop table (`NativeProps`: `style`, `text`, `disabled`, `hidden`, `testID`; `NATIVE_PROP_KEYS`), `nativeProps(kind, props, hidden, previous?)` (reuses a compiled style when `className` and `style` are unchanged), `diffNativeProps` (changed keys, `null` resets, `null` when nothing native changed), `scalarText`, `NativeKind` |
| `src/commit.ts` | `buildCommit(committed, previousRootTags, rootChildren)`: the pure commit walk (skip instances `===` their committed one, otherwise created / updated / child lists), `CommitPayload`, `LAYER_ROOT_TAG` |
| `tests/` | `styles.test.ts` (+8), `props.test.ts` (7), `commit.test.ts` (11), `fixtures.ts` and the fixtures `tests/fixtures/compiled-styles.json` and `commit-payloads.json` |

`src/native.ts` re-exports `NativeKind` from `src/props.ts`, and the v1 `renderer.ts` imports
`scalarText` from there (one definition instead of two); nothing else in the v1 path changed.

### Gate

| Command | Result |
| --- | --- |
| `pnpm test:types` | clean |
| `pnpm test` | **57 passed** (was 30; the 13 renderer and 17 events tests and the 5 original style tests are untouched) |
| `pnpm build` | ok |
| `cargo test --locked` | **86 passed** (the two fixture tests are new) |
| `cargo clippy --locked --all-targets` | **0 warnings** |

Cross-language contract: the TypeScript tests write what the compiler and the commit walk produce
into JSON fixtures (a test fails if the output drifts from the checked-in file; `UPDATE_FIXTURES=1
pnpm test` regenerates). The Rust tests `include_str!` the same files and parse them with the real
`deny_unknown_fields` types: every compiled style validates and converts to a Taffy style, and the two
walk payloads parse, validate and apply to the mounted-tree reference implementation, including a
`null` reset of `testID`, a `hidden` flag and a new appended child. So a key the compiler emits that
native does not know fails a test now rather than at the first Godot run.

Commit walk evidence (`tests/commit.test.ts`): an unchanged 2,003-node tree gives no payload and
zero visits; one changed leaf in it gives one `updated` entry, no child list entry, a payload under
400 bytes and 4 visits (root, section, grid, leaf: its depth); the same single-leaf change at 50 and
at 2,000 cells yields identical visit counts, payload size and entry count; a handler-only change
visits the clone, replaces the committed instance and produces no payload; a keyed reorder, a
removal, an addition, a reparent and a new subtree each produce exactly the affected child lists.

### Choices the plan left open

- **Layer merging.** Adjacent layers with identical conditions merge into one, and an inline style
  merges into the preceding unconditional layer. This only shortens payloads: it is equivalent to
  applying the layers one by one because merging is an ordered overwrite.
- **Intern table.** Compiled styles are interned by a canonical key (sorted keys, undefined
  dropped) in a table bounded at `INTERN_LIMIT` (4,096); overflow clears it. Clearing can only make
  equal inputs compile to a new object, so `diffNativeProps` also compares styles by content
  (`styleKey`) and an unchanged style never produces a diff. A class-string-only cache sits in front
  of it so the common case does no work.
- **`Style.disabled` stays in the type until F3** (the v1 renderer still uses it); `compileStyle`
  rejects it with a message pointing at the `disabled` prop.
- **`overflow` stays an authoring shorthand in the utility table** so `resolveStyles` still emits what
  the v1 native protocol accepts; the compiler expands it to `overflowX`/`overflowY`.
- **`buildCommit` is generic over the renderer's instance type** (`CommitNode<Self>`), so the walk
  stays independent of React while the renderer can keep handlers on its own instances. An
  index-aligned identity check skips unchanged siblings of a long list without a map lookup.
- **`disabled` and `hidden` are `true` or absent**, never `false`, so "reset" has one spelling.

### Plan problems found

- Plan F2 says `diffNativeProps(old, new)`; the compiled styles it compares need their canonical key
  when the intern table has been cleared, so `diffNativeProps` throws for a hand-built style that did
  not come from `compileStyle` (tested).

## Phase F3 - Commit API, mounting layer, render tree, persistent renderer

Date: 6 November 2026. The cut-over: the v1 batch path (`apply_batch`, `Model`, `sync_model`,
`protocol.rs`, `flush()`, the style-key map, `resolveStyles`, `refreshStyles`, the per-frame re-record in
`draw()`) is deleted and every existing verifier passes on the new path. macOS (Apple M1 Max), release
dylib for native, debug Web template with Chrome 156 for Web. Host while gating: 42-45 % free, swap
17.5 GB of 18.4-19.5 GB used.

### What changed, by file

| File | Change |
| --- | --- |
| `native/lib.rs` | `ReactUiRoot` now holds `mounted: Mounted`, the Taffy tree with one root per layer, the layer and focus-ring canvas items, dirty sets and the motion state. `#[func]`s: `commit`, `take_commit_deletions`, `get_node_rect`, `find_by_test_id` (new), `get_snapshot`, `drain_events`, `resolve_event`, `get_activity`, `take_profile`, `set_profiling`; `apply_batch` is gone. Hover, press and focus feed `refresh_interaction`, which restyles only the nodes whose state-conditioned style changed. Native cancels a press on window focus loss (D6) |
| `native/mount.rs` (new) | `Mounted` (the per-tag record replacing `Model`, `handles`, `visuals`, `rects`, `clips`, `content_clips`, `paint_order`, `opacities`, `items`), `MountedTree`/`StyleTree`/`ButtonTree` impls, `run_commit` (validate, plan, dry-run restyle with motion check, then Remove, Delete, Create, Update, Insert), the `StyleOverlay` dry run, incremental geometry (children of ancestors of dirty nodes and of resized nodes), hit testing by hierarchy, document order, absolute geometry |
| `native/render_tree.rs` (new, replaces `render_items.rs`) | per-element box and content canvas items (transform, modulate, clip, custom rect), layer items, focus-ring item, `paint_pass` with record keys (an idle frame records nothing) |
| `native/motion.rs` | ported to tags: `publish_style_changes` (the single sink for every computed-style change), motion nodes, intrinsic tracks, presentation, `measure_endpoint` (still the whole-tree probe), ticks |
| `native/style_engine.rs` | incremental by tag (`insert`, `update`, `remove`, `set_children`, `resolve`, `sampled`); the seven Stylo tests are ported unchanged in assertion, plus one reparenting test |
| `native/layout.rs`, `native/paint.rs`, `native/pointer.rs`, `native/events.rs`, `native/profile.rs`, `native/snapshot.rs` (new) | layout flush per layer; paragraphs and colours from computed styles; button activation over a tree trait (tests ported); events carry `path` and `relatedPath`; commit samples; the whole-tree snapshot |
| `native/protocol.rs`, `native/render_items.rs` | deleted |
| `src/renderer.ts` | persistent host config (`supportsPersistence`), `Instance`, `replaceContainerChildren`, public handles, native event paths, `Portal` containers; no `flush()`, `committed` style map, parent links, pseudo-state flags or `refreshStyles` |
| `src/native.ts`, `src/components.tsx`, `src/index.ts`, `src/styles.ts`, `src/types.ts`, `src/profile.ts` | `NativeHost` is the commit API; `Button` renders its label as a child `Text`; `Portal`; `resolveStyles`, `StyleState` and `Style.disabled` deleted; flush samples report `walkMs` |
| `tests/recording-host.ts` | a fake host that applies commit payloads to a JS tree, answers deletions and queries, records every native call, and supplies event paths |
| `demo/src/main.ts`, `demo/src/probe.ts`, typings | `refreshStyles` removed; the probe's style fixture uses the longhand `StyleSpec`; `godot7`/`godot8` typings regenerated |
| `scripts/verify-web.mjs`, `scripts/verify-motion-web.mjs`, `demo/src/verify-motion.ts` | field-name and timing updates listed below |
| `native/PROTOCOL.md`, `README.md`, `docs/MOTION_ARCHITECTURE.md` | rewritten or updated for the v2 API |

No demo source needed a raw-string move (the demo already renders strings inside `<Text>` and `Button`
labels), and no `focus:` variant relied on the old ancestor semantics: every `focus:` class sits on a
`Button`, which is the focused element.

### Gate

| Command | Result |
| --- | --- |
| `cargo test --locked` | **79 passed** (84 after F1, 86 after F2, less the 9 `protocol` tests deleted with `protocol.rs`, plus the pointer test for an unmounted tag and the Stylo reparenting test) |
| `cargo clippy --locked --all-targets` | **0 warnings**, also with `--features probe` |
| `pnpm test:types` / `pnpm test` | clean / **60 passed** (the 13 renderer and 17 events tests keep their assertions except where listed below, plus 8 new renderer tests) |
| `rustup run stable rustfmt --edition 2024 --check native/lib.rs` (reaches every module) | clean |
| `pnpm build:native` | ok (dylib 10,437,616 bytes) |
| `pnpm gen:types` | exit 0; `godot7`/`godot8` typings byte-identical before and after (md5 `9bbfc6a1...`, `e5a29d18...`), see "Typings" |
| `pnpm verify` | exit 0, both viewports; assertions unchanged plus the two added in "Defects found" |
| `pnpm verify:motion` | exit 0, both viewports, assertions unchanged; 6 consecutive runs after D6, once more on the final tree |
| `pnpm verify:interaction` | exit 0, both viewports, assertions unchanged |
| `pnpm build:web` | ok; Wasm 6,646,725 bytes (Phase 1: 6,542,640) |
| `pnpm verify:web` (port 8097) | passed: **253 assertions** (249 unchanged plus one added check in each of the 4 viewports), 53 captures |
| `pnpm verify:motion:web` | passed: **433 assertions**, 26 captures, 30 benchmark cells (unchanged) |
| `pnpm verify:interaction:web` | passed: **158 assertions**, 33 captures (unchanged) |

The numbers above are from the final tree, after the two defects below were fixed. The first full pass
(before the raster comparison found them) had the same assertion counts and was green, which is the
point of "Defects found": the verifiers' assertions did not see either defect.

### Defects found by comparing rasters with the Phase 1 build (both fixed)

Every settled native capture was compared pixel by pixel with the same capture from a Phase 1 worktree
(`8d24f8d`, built and run the same way). Two captures differed for a real reason, both defects of the F3
implementation that no existing assertion covers.

1. **The focus ring was not painted when focus moved to an element with no `focus:` style.**
   `03-pressed`: the new capture lacked the ring around the pressed `Add 1` button (pixel (57, 373)
   white; Phase 1: `#7da8ff`). Evidence chain: computed styles and interaction state were identical to
   Phase 1; the ring's key and rect were correct; probe canvas items (plain, clipped, custom-rect,
   created before, during and after the press) all rendered while items created by the ring path did not;
   rendering info counted 5 fewer objects and 4 fewer draw calls in that frame than in the frame where the
   ring appears, and the ring items did not hide behind anything: they did not exist yet; a log of `set_focus` against `update_focus_ring` showed the
   ring pass ran 221 frames after the press (frame 18 against frame 239), when the pointer left and the
   button restyled. Root cause: the ring is drawn by `paint_pass`, and a pass only ran when a restyle
   led to `flush_layout`; `set_focus` on an element whose style does not use `:focus` restyles nothing
   (`refresh_interaction` returns early), so no pass ran. Phase 1 redrew the whole control on every state
   change, which hid this. `05-keyboard-focus` passed by luck: the secondary buttons carry
   `focus:border-indigo-500`. Fix: `set_focus` ends with `paint_pass()`. Also removed `visual_changed`,
   a dirty flag introduced in F3 that nothing ever set, and `update_focus_ring` now records the ring as
   drawn only after it could draw.
2. **A keyed reorder was not laid out or painted.** `08-reordered` differed in 13,672 pixels (landscape)
   and 13,376 (portrait): the cards stayed in their old positions while the tree's child lists were
   reversed (snapshot: `children [102, 96, 90, 84]` but rects in the old positions, e.g. card 84 at
   (32, 339)). Root cause: `publish_style_changes` returned early when a commit changed no computed style
   and no text, and a commit that only removes and inserts (a reorder) changes neither, so no
   `flush_layout` ran. Every commit that had previously been tested also created or updated a node. Fix:
   `run_commit` calls `publish_commit(changes, structure_changed)` and a changed child list publishes
   even with no style change.

Both fixes have a regression assertion that fails without them (negative controls: each fix reverted
alone, `pnpm verify` rebuilt and run: exit 0 with the fix, `GODOT_REACT_VERIFY_FAILED` with the named
message without it):

- `demo/src/verify.ts`: after the mouse press, the pixel one column inside the pressed button's left
  edge, at its mid-height, must be the focus ring colour (`A mouse press paints the focus ring on the
  pressed button even when its style has no focus rule`). Added to the existing assertions.
- `demo/src/verify.ts`: after `reverse-items`, the moved card's rect must differ from its rect before
  (`Keyed move lays the moved native node out at its new position`). The previous assertions checked the
  node's identity and its hook state only.
- `scripts/verify-web.mjs`: the same reorder check (`Keyed reverse lays the moved native node out at its
  new position`); the existing check compared the child id list only.

Raster comparison after the fixes (Phase 1 worktree captures against the final tree; `png-diff` is a
small decoder in the session scratchpad):

| Set | Pairs | Identical | Differing, and why |
| --- | --- | --- | --- |
| `artifacts/native` (landscape + portrait) | 26 | 24 | `portrait/08-reordered` and `portrait/09-full-grid`: 1 pixel each at (306, 637), channel delta 1 (red 79 against 80) on the rounded green border of card 84: antialiasing of a corner drawn at a different float origin (hierarchical canvas item transform against absolute rect). Not visible |
| `artifacts/native-interaction` | 16 | 10 | `05-enter-leave`, `06-self-removed`, `07-reattached` in both viewports: 112 to 206 pixels in an 8 x 34 box that reads `down frame=378` against `388`: the lab prints the engine frame number, which differs run to run. Nothing else differs |
| `artifacts/native-motion` | 52 | 26 | the 26 that differ are the mid-transition captures (`02-opening`, `04-closing`, `05a/c/d/f/g/i/j/l`, `06-retargeting`, `08-reversed`, `12-paint-intermediate`), sampled at wall-clock offsets, so a different frame of the same animation; the 26 settled captures are identical |

### Changes to existing verifiers and tests (all recorded)

No assertion was weakened. Every change below follows from a deliberate field or semantic change.

- `scripts/verify-web.mjs` (3 sites): `style.disabled === true` became `props.disabled === true`.
  `disabled` is a prop of the element since F3, not a style; the snapshot's `style` is the computed
  style.
- `scripts/verify-motion-web.mjs` (1 site): the profile stage key `styleDiffMs` became `walkMs`. The JS
  stage that was the whole-tree style diff is now the commit walk.
- `demo/src/verify-motion.ts`: the first input waits for the window to settle (100 ms and 2 process
  frames), as `verify.ts` and `verify-interaction.ts` already do (see D6). No assertion changed.
- `tests/renderer.test.ts`: (a) the label's inherited colour is no longer readable from the snapshot of a
  fake host; the assertion that `text.style.color` is white became "the label's parent is the button and
  the button carries `text-white text-lg` as compiled layers" (inheritance is native); (b) the hover
  assertion that read `style.backgroundColor` after `pointerenter` became "hover causes no commit",
  because JS no longer tracks or resolves hover; (c) `host.batches` became `host.commits`,
  `rejectNextBatch` became `rejectNextCommit`, and the malformed-host literal implements the commit API.
- `tests/events.test.ts`: the three `style.backgroundColor` hover assertions became "no commit was
  caused by any enter or leave" (hover is native); the malformed event in the boundary test gained the
  `path` field events now carry, so the `Invalid native event.x` assertion is unchanged.
- `tests/styles.test.ts`: the five `resolveStyles` tests were replaced by `compileStyle` equivalents
  (added in F2), since `resolveStyles` is deleted; the `StyleSheet` test now compiles through
  `compileStyle`.
- Rust: `native/events.rs` tests pass a path (and `push_crossing` for enter) and the wire-shape test
  expects `path` and `relatedPath`; `native/pointer.rs` tests build their fixture through a small tree
  trait instead of `Model` with the same assertions; `native/style_engine.rs` tests use a `Scene` helper
  over the incremental API with the same assertions.

### Decisions

D3 to D7 are recorded in the plan's decision log with their evidence. In short:

- **D3 (motion validation).** A commit the motion engine cannot animate is rejected before it is
  mounted, by a dry-run restyle over a `StyleOverlay` of the validated payload; the computed styles it
  produces are reused when the commit mounts. A hover, focus or breakpoint style that cannot be animated
  is applied without animation and logged as an `ERROR` naming the node.
- **D4 (commit failure).** `replaceContainerChildren` records the error and returns; throwing makes React
  unmount the whole tree (`captureCommitPhaseError`). Tested by the unchanged "rejected commit preserves
  the native tree, React can commit again" test.
- **D5 (`relatedPath`).** Enter and leave events carry the other side's path as well.
- **D6 (focus loss).** The `verify:motion` failures were root-caused with native logging (not guessed):
  in 5 of 8 first-viewport runs the window lost OS focus 33 ms after the verifier's first press
  (`WM_WINDOW_FOCUS_OUT` at t=625 ms after a press at t=592 ms; focus returned at t=763 ms). Godot drops
  the mouse focus and sends the control a synthetic release whose device is `DEVICE_ID_INTERNAL`, which
  `Control::_call_gui_input` never forwards to `_gui_input` (`scene/gui/control.cpp:2530-2540`), so the
  click never completed and native's `pressed` stayed set. Native now clears `pressed` on that
  notification (a press in flight must not stay pressed forever, in any host), and the verifier waits
  for the window to settle before its first input. The failure only appeared once the cut-over made
  startup faster: the first press now lands in the focus churn that process exit around the first window
  causes.
- **D7 (paint and layout are never skipped).** A commit that only reorders or removes children and a
  focus change onto an element with no `:focus` style both ended without a layout or paint pass; the raster
  comparison found them (see "Defects found"). Every path that changes what is drawn now ends in a pass.

### Typings

`pnpm gen:types` runs `$GODOT --headless --audio-driver Dummy --editor --generate-types --path demo`
through `scripts/generate-types.mjs` and exits 0 (3 `ObjectDB instances were leaked at exit` lines, the
known teardown). Running it on the final tree left `demo/typings/godot7.gen.d.ts` and `godot8.gen.d.ts`
byte-identical, so the committed typings are the generated ones: `commit`, `take_commit_deletions`,
`get_node_rect` and `find_by_test_id` added, `apply_batch` removed. `demo/gen/**` produced no change.

### Choices the plan left open

- **Button label.** `Button` wraps each run of string and number children in a `Text` and passes element
  children through `Children.toArray` (which re-keys them consistently across renders).
- **`Instance` carries its root** so `getPublicInstance` can return the stable per-tag handle; handles are
  created on first use (not at `createInstance`) so abandoned renders leak none.
- **Instances are frozen at commit**, not at creation: `appendInitialChild` still builds them.
- **`active` state.** A mouse press is active while the pointer is inside the pressed element (the
  intersection of the pressed chain and the hover chain), a key press until the key is released; this
  preserves v1's behaviour (leaving a pressed element deactivates it).
- **Both overflow axes clip together** for now: `hidden` on either axis clips the padding box (per-axis
  clipping arrives with the scroll phase).
- **Absolute rects are computed by walking up the parents** (cost proportional to depth) rather than
  cached per node: only the focus ring, `get_node_rect` and snapshots use them in F3, and the snapshot
  derives them top-down in one pass.
- **Snapshot node 0** stands for the main layer's root so the verifiers' geometry checks (which read
  node 0's children) are unchanged; layer 1's top-level nodes report `parent: null`, `layer: 1`.
- **`Sample::Batch`** keeps its name for a commit sample (`parseMicros`, `validateMicros`, `mountMicros`,
  `layoutMicros`, `geometryMicros`, `totalMicros`); the benchmark runner reads `totalMicros`.
- **Taffy layout roots.** One Taffy root per layer, sized to the viewport; a layer whose tree did not
  change is not laid out.
- **Stylo mirrors every mounted node** (so a node that gains a `transition` and changes a value in the
  same commit still animates) but only motion nodes are sampled each frame. (F4 replaced this with D9:
  Stylo is written only for nodes that have or just lost a `transition`.)

### Plan problems found

- Plan 3.9 says `replaceContainerChildren` throws a rejected commit's error; that unmounts the React tree
  (D4).
- Plan 3.10 rule 8 and 4.3 give events only `path`; a crossing needs the other path too (D5).
- Plan 3.7's "absolute rects cached per node" is deferred (above).
- Plan 4.5 lists `nodesCloned`; native can only count the nodes it created, updated and deleted.
- The plan does not say where motion validation happens once styles resolve natively (D3).
- Plan F3's Files list omits `native/snapshot.rs`, `native/PROTOCOL.md`'s consumers `README.md` and
  `docs/MOTION_ARCHITECTURE.md`, `native/probe.rs` (it imported the deleted `StyleSpec`), `native/pointer.rs`
  tests and `native/profile.rs` (all touched; section 0.1 allows it).
- Process note: pointing a baseline git worktree's `node_modules` at the main checkout's made `pnpm`
  recreate the main checkout's modules directory through the symlink (pnpm purges a mismatched modules
  directory when `CI=true`). `pnpm install --frozen-lockfile --offline` in the main checkout restored it
  (lockfile unchanged, tests green); the baseline worktree now has its own `node_modules`.

### Measurements

Dispatch time per synchronous event (JS time inside the one dispatch a mouse press waits for, 40 presses
per cell, milliseconds, p50 / p95; Phase 1 figures from its gate in brackets): native macOS landscape,
cheap handler 0.07 / 0.10 [0.93 / 1.47], state-updating handler 1.25 / (see `artifacts/native-interaction/`)
[1.66 / 3.04]; Web landscape, cheap handler 0.10 / 0.15 [0.90 / 1.01], state-updating handler 3.03 / 4.30
[1.80 / 2.54] (final-tree run: 2.64 / 4.47 and 3.20 / 4.39 in the two viewports, so the regression is
about 1 ms and not noise). The cheap handler no longer pays a whole-tree flush (about 9 times faster natively and on
Web). The state-updating handler is faster natively but slower on Web (p50 3.0 against 1.8 ms); Phase F4
profiles it before changing anything.

## Phase F4 - Performance acceptance

Date: 6 November 2026. Every F0 benchmark scenario rerun on the Fabric renderer with the same host, the
same Chrome 156 and the same debug Web template and development React bundle as F0, plus the five
acceptance criteria of plan F4 evaluated by the runner (`node scripts/verify-motion-web.mjs --acceptance`,
reports under `artifacts/fabric-acceptance/`, kept copies in the session scratchpad
`acceptance-run1/` (before the fixes), `acceptance-run2-diag/` (instrumented build), `acceptance-run4/`
and `acceptance-final/` (after)). Host while measuring: 39 to 45 % free, swap 17.7 GB of 18.4 GB used
(the same heavily swapped host as F0); p50s are stable between runs (the two post-fix runs differ by less
than 1 ms in every p50 below). **Result: criteria 2, 3, 4 and 5 pass; criterion 1 passes for every clause
on a tree with bounded fan-out and, for a flat list of 2,000 siblings, passes the native, payload and
mutation clauses and fails the two JS clauses, a recorded deviation (D8).**

### What changed

| File | Change |
| --- | --- |
| `scripts/verify-motion-web.mjs` | `--acceptance` mode (own output directory, F0 evidence untouched): per-commit figures from the raw profile samples (`derived`: JS commit time = reconcile window minus the native call, commit walk, native commit time, payload characters and entries, visited nodes), the one-cell-memo and one-cell-rows scenarios, an idle-frames scenario, and `acceptanceCriteria` with the F0 constants and `MAX_SCALE_RATIO` (2). `styleDiffMs` became `walkMs` in F3 |
| `demo/src/benchmark.tsx` | `memoCells` (cells in a memoized component, as a real app keeps list rows) and `rowSize` (the same cells in memoized rows of 50 under one column, so no parent has more than 50 or `count / 50` children); the F0 fixture stays the default |
| `native/layout.rs`, `native/lib.rs`, `native/mount.rs`, `native/motion.rs` | the hit re-test rule and the Stylo rule below (D9 and "Native rule restored" in the plan) |
| `docs/INTERACTION_PLAN.md`, `native/PROTOCOL.md`, `docs/MOTION_ARCHITECTURE.md`, `README.md` | D8 to D10, the F4 criteria wording, the Stylo statements, the performance paragraph |

### First run (F3 tree, before any change): what failed and why

`pnpm build:web` of `07a8344`, then the acceptance runner. Criteria 2, 3 and 5 passed. Failed:

| Clause | 50 cells | 2,000 cells | Ratio |
| --- | --- | --- | --- |
| 1, flat list: native commit time p50 | 254 us | 668.5 us | 2.63 |
| 1, flat list, memoized cells: native commit time | 239 us | 639 us | 2.67 |
| 1, flat list: JS commit time p50 | 1.78 ms | 17.56 ms | 9.85 |
| 1, flat list, memoized: JS commit time | 0.98 ms | 3.91 ms | 4.0 |
| 1, flat list: commit walk | 0.022 ms | 0.405 ms | 18.4 |
| 1: payload characters, same entries and mutations | 215 | 216 | one more digit in a tag (the check was exact) |
| 4: every cell at 2,000, reconcile p50 | | 58.4 ms against F0 41.3 ms | 1.41 |

Profile before changing anything (instrumented native build: a timer around each phase of `run_commit`,
`publish` and `flush_layout`, printed per commit; the figures include roughly 0.3 ms of print cost in the
enclosing phases, constant at both sizes; the instrumentation is not in the tree):

- **Native, one cell**: the growth is two terms, both proportional to the sibling count. `geometry`
  4 us to 170 us: `flush_layout` re-hit-tested the pointer at every flush, and a hit test walks the
  siblings at every level (`pointer_known` was true at 2,000 cells, false at 50, so the first run also
  compared unlike things). `style_engine` 114 us to 320 us: Stylo's traversal visits every sibling of a dirty
  node, and F3 wrote every node's style to Stylo although only nodes with a `transition` are ever sampled.
  Everything else was constant: validate plus dry run 24 and 19 us, apply 4 us, authored styles 9 and 4 us,
  paint 84 us at both sizes.
- **Native, every cell at 2,000** (28.1 ms instrumented, 31.7 ms sampled): parse 4.0 ms, validate plus dry
  run 3.6 ms, apply 0.9 ms, Stylo 7.4 ms, flush 15.3 ms of which paint 14.9 ms. JS: React 17 ms, commit walk
  0.44 ms, JSON encode 0.53 ms, native call 39.9 ms (31.7 ms inside native, the rest the Web call boundary).
- **JS, one cell**: React, not the renderer. A V8 CPU profile (Node, development React, no-op host) of the
  every-cell update puts 25 % of self time in `styles.ts`, 18 % in `react-reconciler` and 17 % in `react`;
  for a memoized one-cell update 40 % is `react` (`createElement` alone 25 %) and 30 % `react-reconciler`,
  with `styles.ts` at 1.7 %. With state local to the one cell, so the parent does not re-render at all,
  `setState` to native commit takes 0.10 ms at 50 siblings and 0.85 to 1.0 ms at 2,000 (React rebuilds the
  parent's child list in persistent mode, `appendAllChildren`, about 0.4 us per sibling).
- **Criterion 4**: F0's reconcile window (41.30 ms) ended before its native draw (15.885 ms p50 of draw CPU,
  run in the next frame); the Fabric renderer paints inside the commit, so its reconcile window includes
  14.8 ms of paint. Like for like, F0's total is 57.19 ms and the first run's was 58.4 ms (2 % worse).

### Changes made, all native, all local

1. **Hit re-test only when something that decides the hit changed** (`hit_stale`, set by a geometry change,
   a child-list change, a deleted node or an overflow change; plan 3.3 already said "if geometry under the
   mouse changed"). 169 us at 2,000 cells, now 0 in a flush that moved nothing.
2. **Stylo is written only for nodes that have or just lost a `transition`** (D9). The node that gains a
   `transition` in the change that changes a value is given its previous style and resolved first, so it
   still animates from the old value. Stylo write plus pass for one plain cell at 2,000 cells: 206 us
   removed; every cell: 7.4 ms removed.
3. The runner's payload check compares entries and mutations exactly and characters within
   `MAX_TAG_DIGIT_GROWTH_CHARS` (4), since tags have more digits after more nodes have been mounted; the
   criterion-4 comparison uses F0's total (D10); the JS clauses of criterion 1 are evaluated on the rows
   fixture and the flat variants are reported (D8).

No change to JS (`src/`): the renderer's own JS cost is 1 to 9 % of the profile and no hotspot is local to it.

### F4 criteria, measured, beside the F0 baseline

Scenarios as in F0 (30 repetitions of (a) and (b), 200 mouse moves for (c), 10 `md` crossings each way for
(d); 2,000 cells are 2,003 nodes). "Native commit" is the whole native `commit`, which now contains layout,
geometry and paint; F0's "native batch" did not contain the draw.

| Scenario (2,000 cells) | F0 reconcile p50 | F0 JS flush p50 | F0 native batch p50 | F0 native draw p50 | F4 reconcile p50 / p95 | F4 native commit p50 / p95 | F4 paint inside it p50 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a. one cell, flat list | 24.75 ms | 12.91 ms | 11,664 us | 16,342 us | 18.12 / 42.52 ms | 168 / 189 us | 84 us |
| a. one cell, memoized cells | | | | | 4.42 / 20.64 ms | 159 / 185 us | 79 us |
| a. one cell, 40 memoized rows | | | | | 1.84 / 2.06 ms | 152 / 179 us | 70 us |
| b. every cell | 41.30 ms | 28.34 ms | 20,347 us | 15,885 us | 51.68 / 82.99 ms (includes the paint) | 23,779 / 24,841 us | 14,769 us |
| c. hover sweep, 200 moves | no React commit | 12.87 ms x 200 flushes | 11,752 us x 200 | 15,777 us | no React commit, 0 flushes | 0 commits | 130 us |
| d. `md` crossings, 20 | no React commit | 29.04 ms x 20 | 20,908 us x 20 | 15,804 us | no React commit | 0 commits | 14,896 us |

| Scenario (50 cells) | F0 reconcile p50 | F0 native batch p50 | F4 reconcile p50 | F4 native commit p50 | F4 paint p50 |
| --- | --- | --- | --- | --- | --- |
| a. one cell, flat list | 2.98 ms | 788 us | 3.04 ms | 198 us | 90 us |
| a. one cell, memoized cells | | | 1.48 ms | 176 us | 82 us |
| a. one cell, 1 memoized row | | | 1.72 ms | 196 us | 87 us |
| b. every cell | 3.49 ms | 1,117 us | 3.56 ms | 1,051 us | 602 us |
| c. hover sweep, 50 moves | | 1,037 us x 50 | no React commit | 0 commits | 180 us |
| d. `md` crossings | | 760 us x 20 | no React commit | 0 commits | 577 us |

Commit counters from the snapshot (`activity`) over each scenario: one cell, 2,000 cells (30 updates): 30
mutations, 30 nodes updated, 30 nodes restyled, 30 box records, 0 content records, 0 layout passes. Every
cell: 60,000 of each, 60,000 box records. Hover sweep: 0 mutations, 399 nodes restyled and 399 box records
for 200 moves (2 per move, the cell left and the cell entered), 0 content records. Resize: 0 mutations,
40,000 nodes restyled (2,000 per crossing, all of them), 40,060 box records, 20 content records, 40 layout passes
(the same 40 as F0).

| Criterion | Result | Measured |
| --- | --- | --- |
| 1 native commit time, 2,000 at most 2x 50 | **pass**, all three variants | flat 168 / 198 us (0.85), memoized 159 / 176 (0.90), rows 152 / 196 (0.78); first run 2.63 |
| 1 payload and mutations equal | **pass** | 1 entry and 1 mutation per commit at both sizes; 215 to 217 characters (tag digits) |
| 1 JS commit time and commit walk, rows (bounded fan-out) | **pass** | JS 1.47 ms to 1.64 ms (1.12), walk 0.016 to 0.015 ms (0.91) |
| 1 JS commit time, flat list | **fail, recorded deviation D8** | 2.79 to 17.89 ms (6.4 to 7.2), memoized 1.26 to 4.23 ms (3.1 to 3.4), walk 0.031 to 0.52 ms |
| 2 hover sweep | **pass** | 0 React commits, 0 commit calls at 50 and 2,000 cells; box records 99 and 399 for 50 and 200 moves, content records 0; JS events 0.15 ms p50 per move at 2,000 cells against F0 12.96 ms, paint 130 us against 15.8 ms |
| 3 resize across `md` | **pass** | 0 React commits; restyled nodes 1,000 and 40,000 = exactly the nodes using `md:` per crossing (50 and 2,000) |
| 4 every cell, total time per update | **pass** | 51.68 ms p50 (82.99 p95) against F0 57.19 ms (41.30 reconcile + 15.885 draw; p95 87.8): 9.6 % lower; first run 58.4 |
| 5 idle frames record nothing | **pass** | 6 idle frames after a commit: box records 1,960 and 75,304, content 37 and 62, paint passes 133 and 337, all unchanged |

### State-updating handler on Web (profiled, not changed)

F3 left this for F4: the dispatch of a press whose handler sets React state takes 2.6 to 3.4 ms p50 on
Web in the final run (Phase 1: 1.8 ms; native macOS is faster than Phase 1, 1.25 against 1.66 ms). Per-press
breakdown of that window on Web (temporary instrumentation, reverted): in 38 of 40 presses nothing is
committed (the lab's log is at its cap, so the rendered text does not change), so the 3 ms is JS only, React
rendering the lab in the development bundle; in the presses that do commit, the native commit is 1.0 to 1.2 ms
(layout 0.7 to 0.8, mount 0.3 including 0.17 of paint), the commit walk 0.02 ms and the JSON encode 0.01 ms.
A V8 profile of the same press in Node puts 53 % of the time under `dispatchEvents` in `react`, 18 % in
`react-reconciler`, 9 % in `renderer.ts` (the commit walk) and 4 % in `components.tsx` when cold (0.71 ms
for 40 presses, against 0.19 ms warm). No hotspot is local to the renderer, so nothing was changed. The press
stays at about a sixth of one 60 Hz frame.

### Gate

All commands on the final tree, in this order, exit 0 (log files in `/tmp/final-gate/`):

| Command | Result |
| --- | --- |
| `cargo test`, `cargo clippy --all-targets -- -D warnings` (also `--features probe`) | 79 passed; 0 warnings |
| `rustup run stable rustfmt --edition 2024 --check native/lib.rs` | clean |
| `pnpm test:types` / `pnpm test` | clean / 60 passed |
| `pnpm build:native`, `pnpm gen:types` | dylib 10,437,600 bytes; typings byte-identical before and after |
| `pnpm build` | ok |
| `pnpm verify`, `verify:motion`, `verify:interaction` | exit 0, both viewports each; captures compared with Phase 1: 24 of 26, all 26 settled of 52, and 10 of 16 identical; the rest are the one-pixel, mid-transition and frame-number differences explained in the F3 section |
| `pnpm build:web` | ok; Wasm 6,648,667 bytes |
| `node scripts/verify-motion-web.mjs --acceptance` | exit 0 (103 assertions, 12 benchmark cells; 4 criteria reported as recorded deviations) |
| `pnpm verify:web` | 253 assertions, 53 captures |
| `pnpm verify:motion:web` | 433 assertions, 26 captures, 30 benchmark cells |
| `pnpm verify:interaction:web` | 158 assertions, 33 captures |

### Process notes

- A `git checkout -- native/...` meant to remove the diagnostic prints also reverted the two uncommitted
  native changes above, because I had not committed them first. The changes were re-applied from the recorded
  edits, the tree rebuilt, and the whole gate run again on the re-applied sources; the figures in this
  section are from that second pass (the first post-fix pass gave the same p50s).
- The baseline git worktree used for the F3 raster comparison is removed.

## Phase I1 - Godot co-operation

Date: 6 November 2026. macOS (Apple M1 Max), release dylib for native, debug Web template with Chrome 156 for
Web. Host while gating: 40 % free, swap 17.5 GB of 18.4 GB used (the same heavily swapped host as F3 and F4).
Decisions D11 to D13 are in the plan's decision log with their evidence; the engine findings and the plan
problems found are at the end of this section.

### What changed, by file

| File | Change |
| --- | --- |
| `native/props.rs` | `PointerEventsSpec` (`auto`, `none`) and `CursorSpec` (the 15 CSS cursors of plan 4.2) as `StyleSpec` fields `pointer_events` and `cursor`, in `merge`; one test for every value, the kebab-case names and the rejections |
| `native/computed_style.rs` | both properties are inherited (`InheritedStyle`, `resolve`); `is_pointer_target()` and `cursor_or_default()`; the inheritance test covers a child taking `pointer-events` back with `auto` |
| `native/mount.rs` | `hit_node` skips an element whose computed `pointer-events` is `none` but still descends into its children; `cursor_at(point)` |
| `native/motion.rs` | a `pointer-events` change sets `hit_stale` (it decides the hit), like an overflow change |
| `native/events.rs` | `EventPayload::Wheel(WheelData)`: the pointer fields plus `deltaX`, `deltaY`; wire-shape test |
| `native/pointer.rs` | `wheel_ticks` (Godot wheel button and factor to DOM-signed deltas) and `cursor_shape` (Appendix A), both unit tested |
| `native/lib.rs` | `has_point` and `get_cursor_shape` (`IControl`); focus mode `CLICK`; no `grab_focus()` in `ready()`; `set_force_pass_scroll_events(true)`; `viewportX/viewportY` from `get_global_transform_with_canvas()`; `wheel` for wheel buttons (press only) and `InputEventPanGesture`, consumed only when prevented; Tab consumed only if focus moved; Enter and Space consumed only when they press or release a focused button; a primary press ends by releasing key focus when no element is focused; `FOCUS_EXIT` clears only a keyboard press |
| `src/types.ts`, `src/styles.ts` | `pointerEvents` and `cursor` styles; `pointer-events-auto\|none` and `cursor-*` utilities; fixture case in `tests/fixtures/compiled-styles.json` (the Rust test parses it) |
| `src/native.ts`, `src/events.ts`, `src/components.tsx`, `src/index.ts` | `wheel` events (`UIWheelEvent`, `onWheel`, `onWheelCapture`), the shared mouse fields, native parser; `src/renderer.ts` gives wheel React's continuous priority |
| `tests/events.test.ts`, `tests/recording-host.ts`, `tests/styles.test.ts` | wheel capture/bubble, deltas and resolution, root listeners, a malformed wheel, the cursor and pointer-events utilities |
| `demo/src/main.ts` | an internal full-window `ColorRect` behind the root (so `getChildCount()` still counts only the surface) that counts `_gui_input` presses; `_unhandledInput` counters (presses, wheel ticks, pans, keys); `grabFocus()` after mounting; demo API `showHud`, `passthrough`, `resetPassthrough`, `cursorShapeAt`, `surfaceHasFocus`, `grabSurfaceFocus`, `bareSurfaceHasFocus`, `offsetSurface` |
| `demo/src/passthrough-hud.tsx` (new) | the HUD of D12 |
| `demo/src/verify-interaction.ts`, `scripts/verify-interaction-web.mjs` | the Godot co-operation scenario, native and Web |
| `native/PROTOCOL.md`, `README.md`, `docs/INTERACTION_PLAN.md` | the I1 behaviour, D11 to D13, plan 3.11 and the I1 task text |

### Gate

All commands on the final tree, in this order, exit 0 (logs in `/tmp/i1-gate/`):

| Command | Result |
| --- | --- |
| `pnpm test:types` / `pnpm test` | clean / **64 passed** (60 before: 3 wheel tests, 1 cursor utility test) |
| `cargo test --locked` | **82 passed** (79 before: pointer-events and cursor parsing, the wheel wire shape, `wheel_ticks`, `cursor_shape`) |
| `cargo clippy --locked --all-targets -- -D warnings`, also `--features probe` | 0 warnings |
| `rustup run stable rustfmt --edition 2024 --check native/lib.rs` (reaches every module) | clean |
| `pnpm build:native` | ok (dylib 10,463,008 bytes, default build: no probe feature) |
| `pnpm gen:types` | exit 0; `git status` of `demo/typings` and `demo/gen` identical before and after: no `#[func]`, `#[signal]` or class changed (`has_point` and `get_cursor_shape` are engine virtuals). The four `Codegen failed to load module script` warnings are the F3 ones |
| `pnpm build` | ok |
| `pnpm verify` | exit 0, both viewports, assertions unchanged |
| `pnpm verify:motion` | exit 0, both viewports, assertions unchanged |
| `pnpm verify:interaction` | exit 0, both viewports; the existing assertions unchanged, plus the I1 scenario (59 assertions) |
| `pnpm build:web` | ok; Wasm 6,662,691 bytes (F4: 6,648,667) |
| `pnpm verify:web` (port 8097) | passed: **253 assertions**, 53 captures (unchanged) |
| `pnpm verify:motion:web` | passed: **433 assertions**, 26 captures, 30 benchmark cells (unchanged) |
| `pnpm verify:interaction:web` | passed: **358 assertions** (158 before), 41 captures (33 before), four viewports and the touch page |

The server on 8097 was `node scripts/serve-web.mjs` with `PORT=8097` (what `pnpm demo:web` runs) and was stopped
afterwards.

### Rasters compared with the pre-I1 build

A worktree at `1b7a14b` (the commit before I1) was built and run the same way (`verify`, `verify:motion`,
`verify:interaction`), and every settled native capture compared pixel by pixel with the final tree
(`png-diff`, a small PNG decoder in the session scratchpad):

| Set | Pairs | Identical | Differing, and why |
| --- | --- | --- | --- |
| `native` (landscape and portrait) | 26 | 26 | none |
| `native-motion` | 52 | 28 | the 24 that differ are the mid-transition captures (`02-opening` portrait, `04-closing`, `05a/c/d/f/g/i/j/l`, `06-retargeting`, `08-reversed`, `12-paint-intermediate`), sampled at wall-clock offsets; all settled captures are identical |
| `native-interaction` (the 16 that exist in both) | 16 | 10 | `05-enter-leave`, `06-self-removed`, `07-reattached` in both viewports: 96 and 204 pixels in the box that reads `down frame=N`, the engine frame number the lab prints. Nothing else differs |

So I1 changes no pixel of the existing demo. The new captures were inspected: `09-passthrough-hud` shows the
Godot `ColorRect`'s green through the transparent HUD root (landscape, portrait and, on Web, every viewport),
and `10-hud-focus` the focus ring on the Shift+Tab target. The ring there is the one the keyboard moved; I3
turns the ring off for mouse focus.

### Negative controls

Each new regression assertion was checked to fail without its fix (the fix reverted alone, `pnpm build:native`,
`pnpm verify:interaction`, the failing message copied here; the tree was restored from a copy afterwards):

| Reverted | Failing assertion |
| --- | --- |
| `ready()` calls `grab_focus()` again | `A root that has just entered the tree must not steal key focus` |
| `FOCUS_EXIT` clears every press | `The panel, not its none label, is the target: inventory 1, map 0, help 0, panel 0, label 0, locked false` (the release of key focus inside the press cancelled its click) |
| Tab always consumed | `A Tab that moved nothing is not consumed` |
| `viewport_x` equals `x` | `Pointer events carry root-local and canvas coordinates: ... viewport 216,377.5 != ... viewport 266,407.5` |
| `has_point` always true | `The Control behind the root saw the press: {"backdropPresses":0,"unhandledPresses":0,...}` |
| `release_focus()` never called | `A press that leaves no element focused releases the root's key focus` |
| a wheel is always consumed | `A wheel tick over an element with no onWheel reaches the game` |
| `get_cursor_shape` always arrow | `cursor-pointer shows the pointing hand` |
| hit test ignores `pointer-events` | `Nothing is hovered over a pass-through region: 126` |

### Verification added

`verify-interaction.ts` and `verify-interaction-web.mjs` run the HUD (`api.showHud()`) after the existing
scenarios. Everything below is asserted natively and on Web (Web: real Chrome mouse, keyboard and wheel input at
both device pixel ratios, both orientations):

- a root that has just entered the tree holds no key focus;
- a press in a region of `pointer-events: none` ancestors reaches the `ColorRect` behind the root and
  `_unhandled_input` once, and no React handler; hover is `null` there;
- a press on a `pointer-events-auto` button reaches neither; hover reaches an auto element inside a none region;
- a press on a panel whose labels are `none` targets the panel (the label's own `onClick` never runs), still clicks
  although it releases key focus mid-press, and leaves no element focused and the root without key focus;
- with the root unfocused, `W` and Tab reach `_unhandled_input`; after the owner grabs focus with no element
  focused, `W` still does and Tab (which moves focus) does not; after a button took focus `W` still does, Tab and
  Shift+Tab do not, Enter activates the button and is consumed;
- with every button disabled Tab changes nothing and is not consumed;
- wheel ticks over empty space, over an element with no `onWheel` and over one whose handler only counts reach
  `_unhandled_input`; one whose handler calls `preventDefault()` does not; the four directions carry DOM-signed
  deltas natively; a trackpad pan reaches JS as `wheel` with its own deltas and is consumed only if prevented;
- cursors: `getCursorShape` for `cursor-pointer` (button, its padding and its inherited label), `cursor-help`,
  `cursor-move`, the default and a `pointer-events-none` label (the panel's cursor); natively
  `DisplayServer.cursor_get_shape()` after a real move to the button, to the help button and off the HUD, on Web the
  canvas's CSS cursor (`pointer`, `help`, `default`/`auto`);
- with the root moved 50 and 30 pixels inside the window, `viewportX - x` is 50 and `viewportY - y` is 30.

### Choices the plan left open

- **`wheel` units.** Ticks, positive down and right, no `deltaMode` (D13). A wheel at the pointer's position when
  Godot has pinned routing to the root during a press and the pointer is over nothing is addressed to the root
  (target 0), so root listeners see it.
- **`wheel` event priority.** React's continuous priority, with no `flushSyncWork()` after it, as `pointermove`.
- **Tab and a single tabbable element.** Tab with one enabled button already focused does not move focus, so it is
  not consumed and Godot's own navigation runs. The plan's open question (leave or wrap) keeps its default for two
  or more.
- **HUD buttons.** Three, so that Tab can move (the plan said one); the lock is a non-button View so locking
  leaves nothing tabbable.
- **Demo `ColorRect`.** An internal front child (`add_child(..., INTERNAL_MODE_FRONT)`): sorted before the
  surface, and invisible to `get_child_count()`, which several existing verifier assertions use.
- **Enter and Space release.** A release with no keyboard press in flight is not consumed; a release that ends a
  press is, whichever button holds focus then (it cancels the click if focus moved).

### Engine findings (reported, not worked around)

- Godot's `Input` dispatches every `InputEventGesture` twice (`core/input/input.cpp:995-1003`, then
  `:1046-1048`). Evidence: instrumented native build, one parsed `InputEventPanGesture` reached `gui_input` twice
  in the same frame with two distinct event objects; a plain `ColorRect`'s `gui_input` signal and the demo's
  `_unhandled_input` saw it twice too, so it is not ours. Real trackpads use the same path, so Godot's own
  `ScrollContainer` scrolls a pan twice. Native does not filter it; the verifier asserts that JS and the game see
  the same number of pans.
- Godot's Web display server maps a DOM `deltaX > 0` to `WHEEL_LEFT`
  (`platform/web/display_server_web.cpp:704-710`), the macOS convention, so a horizontal wheel has the opposite
  sign on Web to the DOM. The Web verifier asserts a horizontal tick arrives as `deltaX` only and that the
  opposite wheel reverses the sign; the sign natively is asserted by the native verifier. Vertical ticks follow
  the DOM on both.
- The Web display server writes the canvas CSS cursor only when the shape changes, so a canvas that never left the
  arrow reads `auto`, not `default`.

### Plan problems found

- Plan 3.11 assumed the root could refrain from taking key focus; Godot grants it on every press (D11).
- Plan I1 task 6 put the pass-through region in the interaction lab; it needs a tree whose ancestors are all
  `none` (D12).
- Plan I1 task 7's "one `pointer-events-auto` button" cannot show that Tab does not reach the game while a button
  has focus: one button gives Tab nothing to move to.
- Plan 4.4 gives `get_cursor_shape(at)` as taking effect through the root; the verification that a shape reaches
  the window needed `DisplayServer.cursor_get_shape()` (native) and the canvas style (Web), neither of which the plan
  names.

### Process notes

- A worktree at `1b7a14b` in the session scratchpad (`pre-i1`) holds the baseline build; it shares this
  checkout's `target/` through `CARGO_TARGET_DIR`, which cost one full rebuild of the `godot` crates afterwards.
