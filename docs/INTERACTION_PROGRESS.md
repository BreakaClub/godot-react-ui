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

## Phase I2 - Pointer model, touch, capture

Date: 6 November 2026. Same host and builds as I1; while gating 55 % free, swap 8.3 GB of 9.2 GB used (less
starved than at I1). Decisions D14 to D16 are in the plan's decision log with their evidence.

### What changed, by file

| File | Change |
| --- | --- |
| `native/pointer_state.rs` (new, Godot-free) | `PointerTable` (one record per pointer id: position, DOM `buttons`, each down button's press with its target and click count, capture), capture rules (`set_capture` refuses an unmounted element and a pointer that is not down; only the capturing element releases; a capture ends with the last release, with `cancel`, or when its element is deleted; a touch is captured to its `pointerdown` target implicitly), `ClickCounter` (500 ms, 4 px, per button and kind of pointer), `touch_pointer_id`. 11 unit tests |
| `native/pointer_input.rs` (new) | the Godot glue that moved out of `lib.rs` and grew: mouse motion and every mouse button (`pointerdown`, `contextmenu`, `pointerup`, `click`/`auxclick`/`dblclick` with their counts), wheel and pan (I1), touch press/drag/release/cancel with `pointerenter`/`pointerleave`, captured moves, `pointercancel`, the primary press's default action (shared by mouse and touch) |
| `native/pointer.rs`, `native/events.rs` | `dom_button_of` (all five buttons); payloads `PointerCancel`, `DoubleClick` (wire `dblclick`), `AuxClick`, `ContextMenu`; `PointerType::Touch` |
| `native/lib.rs` | `pointers` and `clicks` on the root; every input event with `device == DEVICE_ID_EMULATION` is ignored; `set_pointer_capture`, `release_pointer_capture`, `has_pointer_capture` (`#[func]`); `EXIT_TREE` and window focus loss cancel every pointer that is down; a touch is `active` while down |
| `native/mount.rs`, `native/snapshot.rs` | deleting an element ends the captures and presses on it; the snapshot lists `pointers` |
| `src/native.ts`, `src/events.ts`, `src/components.tsx`, `src/renderer.ts` | `pointercancel`, `dblclick`, `auxclick`, `contextmenu` and their handler props; the handle's `setPointerCapture`, `releasePointerCapture`, `hasPointerCapture` (native validates, JS throws its error); the click family skips disabled elements |
| `tests/recording-host.ts`, `tests/events.test.ts`, `tests/renderer.test.ts` | the fake host's capture API; the click family and `pointercancel`; handle capture and its failures |
| `demo/src/pointer-lab.tsx`, `demo/src/labs.tsx` (new), `demo/src/main.ts` | the pointer pad and the capture knob on a page registry (`showLab`), a root `pointercancel` counter |
| `demo/src/verify-interaction.ts`, `scripts/verify-interaction-web.mjs` | the pointer scenarios, native (37 assertions) and Web (mouse half in every viewport, touch half on the touch page) |
| `demo/typings/godot7.gen.d.ts` | the three new methods |
| `native/PROTOCOL.md`, `README.md`, `docs/INTERACTION_PLAN.md` | the pointer model, D14 to D16, the I2 task text |

### Gate

All commands on the final tree, in this order, exit 0 (logs in `/tmp/i2-gate/`):

| Command | Result |
| --- | --- |
| `pnpm test:types` / `pnpm test` | clean / **66 passed** (64 before) |
| `cargo test --locked` | **95 passed** (82 before: 11 `pointer_state`, `dom_button_of`, the click-family wire shapes, the touch pointer type) |
| `cargo clippy --locked --all-targets -- -D warnings`, also `--features probe` | 0 warnings |
| `rustup run stable rustfmt --edition 2024 --check native/lib.rs` | clean |
| `pnpm build:native` | ok (dylib 10,525,280 bytes, default build) |
| `pnpm gen:types` | exit 0; only `demo/typings/godot7.gen.d.ts` changed (the three `#[func]`s), and a second run left it identical. It could not pass first: `src/native.ts` and the demo already used the new host methods, so the typings were generated with `$GODOT --headless --audio-driver Dummy --editor --generate-types --path demo` after `pnpm build:native`, as plan 0.3 says |
| `pnpm build` | ok |
| `pnpm verify` / `verify:motion` / `verify:interaction` | exit 0, both viewports each; existing assertions unchanged; the interaction run adds `verifyPointers` (37 assertions) |
| `pnpm build:web` | ok; Wasm 6,712,485 bytes (I1: 6,662,691) |
| `pnpm verify:web` (port 8097) | passed: **253 assertions**, 53 captures (unchanged) |
| `pnpm verify:motion:web` | passed: **433 assertions**, 26 captures, 30 benchmark cells (unchanged) |
| `pnpm verify:interaction:web` | passed: **422 assertions** (358 before), 54 captures (41 before) |

The server on 8097 was `node scripts/serve-web.mjs` with `PORT=8097` and was stopped afterwards.

### Rasters compared with the pre-I1 build

The same worktree at `1b7a14b` as for I1, every settled native capture against the final tree: **94 pairs, 66
identical**. The 28 that differ are the 22 mid-transition motion captures (sampled at wall-clock offsets) and
the six interaction captures that print the engine frame number (`05-enter-leave`, `06-self-removed`,
`07-reattached`, both viewports: 112 and 216 pixels in the 9 x 34 and 15 x 34 boxes that read `down frame=N`).
Nothing else differs, so I2 changed no pixel of the existing demo. The new captures were inspected
(`11-pointers` to `14-pointer-touch-tap`, native and Web): the pad's last six log lines, the knob at 77 while
the pointer is captured and outside its track, and the touch tap's `enter, down, up, leave, click` with no hover
paint on the pad.

### Negative controls

Each new regression assertion was checked to fail without its fix (the fix reverted alone, `pnpm build:native`,
`pnpm verify:interaction`; the sources were restored from copies and compared afterwards):

| Reverted | Failing assertion |
| --- | --- |
| emulated (device -1) events are handled | `A touch is one touch pointerdown and no mouse press: down mouse 1 touch 1, ids 1,2, clicks 1,1, ...` |
| a captured pointer's events go to what is under it | `Outside the root, to the right, the knob is at its end: value 50, captured true, moves 1` |
| every click counts 1 | `A triple click counts 1, 2, 3 with one dblclick: ... clicks 1,1,1, dbl 0 ...` |
| `EXIT_TREE` does not cancel pointers | `Leaving the tree while a button is down cancels the pointer: 0` |
| the capture is not released with the last button | `The capture ended with the press` |
| every release is a `click` (no `auxclick`) | `A right click is pointerdown, contextmenu, pointerup, auxclick: ... pointerup mouse#1 b2 bs0 d0|click mouse#1 b2 bs0 d1` |

### Verification added

Natively and on Web (Web: the mouse half at both device pixel ratios and orientations, the touch half on the
touch page with real touch events and CDP):

- a right click is `pointerdown`, `contextmenu`, `pointerup`, `auxclick` and no `click`; a middle click is an
  `auxclick` of button 1; `buttons` carries 2 and 4 while they are down;
- three quick presses count 1, 2, 3 with one `dblclick` (detail 2); a press after 650 ms, and one 10 px away,
  count 1;
- the knob: pressing it captures the pointer (native records it, explicit); dragging far outside the root and
  the window, on both sides, moves it to its ends and back; its `pointerup` arrives outside; the capture ends
  with the press; without a press it ignores the pointer; capturing an idle pointer throws
  `setPointerCapture failed: pointer 1 is not active ...`;
- touch with `emulate_mouse_from_touch` on (asserted from the project setting): a tap is `pointerenter`,
  `pointerdown`, `pointerup`, `pointerleave`, `click` of one touch pointer and no mouse press; the pad is not
  hovered and shows no hover paint afterwards; no pointer record is left;
- two fingers are two touch pointers, each captured to where it went down (the knob's own capture replaces its
  finger's implicit one), and a finger dragged far outside the root keeps moving the knob;
- a cancelled touch is `pointercancel` and `pointerleave` with no `pointerup` or `click`;
- the root leaving the scene tree mid-press cancels the pointer (a root listener counts one `pointercancel`).

### Choices the plan left open

- D15 lists the click and capture choices; D16 the emulation rule.
- **Mouse position when a captured pointer is over nothing.** Moves and the `pointerup` still go to the capture
  target; `pointerdown` and `click` need an element under the pointer or a capture, so a pointer released over
  nothing and not captured sends no `pointerup` (there is nothing to address; root listeners only see events with
  an element target).
- **Window focus loss.** D6 already cancelled the press silently; JS now also gets `pointercancel`, which ends its
  capture.
- **Touch on a disabled element or on nothing.** Native takes no pointer for it and sends nothing, as for the mouse.
- **`pointerenter` for a touch** carries `buttons` 0 and `button` -1; `pointerdown` carries `buttons` 1.
- **New modules.** `pointer_state.rs` and `pointer_input.rs` (plan 3.24 lists neither): the model is Godot-free and
  tested, the glue grew past what `lib.rs` should hold.

### Engine findings

- `Input.parseInputEvent` leaves an `InputEventMouseButton`'s `button_mask` as the script set it, so the
  existing verifiers' presses carry `buttons` 0. The new helper sets the mask a real device reports (1, 2, 4 while
  down). No existing assertion read `buttons`.
- Godot's Web build numbers a touch by the browser's contact identifier, which keeps counting across taps: the
  fifth tap of a session was pointer 7. DOM `pointerId`s for touches behave the same way; the Web verifier checks
  one id runs through a tap and two fingers have two distinct ids from the touch range.
- Godot's `Viewport` grants the root key focus on the emulated mouse press that precedes a touch, too
  (`viewport.cpp:1976`); the touch's own `pointerdown` default action hands it back (D11).

### Plan problems found

- Plan 4.4 lists `set_pointer_capture` and `release_pointer_capture` but the handle's `hasPointerCapture` needs a
  native answer (the capture ends natively on up and cancel): `has_pointer_capture` was added.
- Plan I2's demo (pad and knob in the Interaction tab) cannot fit its fixed, non-scrolling body (D14).
- Plan 3.24 and the I2 Files list omit `native/snapshot.rs` (4.5 says `pointers` arrives with I2), the two new
  modules, `demo/src/labs.tsx` and `tests/recording-host.ts`.

## Phase I3 - Focus and keyboard

Date: 6 November 2026. Same host and builds as I1 and I2. Decisions D17 to D19 are in the plan's decision log with
their evidence.

### What changed, by file

| File | Change |
| --- | --- |
| `native/props.rs` | `tabIndex` (`0` or `-1`, any node kind) and `autoFocus` props, merged and validated; one test |
| `native/focus.rs` (new, Godot-free) | `FocusTree`, `nearest_focusable`, `is_focusable`, `is_tabbable`, `tab_stops` (document order, a visibility predicate), `next_tab_stop` (wraps; continues from a non-stop's place), the `Modality` enum. 7 unit tests |
| `native/keymap.rs` (new, pure over Godot's `Key`) | DOM `key` (typed character, else name, else printable label, else `Unidentified`) and `code` (physical key; modifiers by side), `is_modifier_key`. 7 unit tests |
| `native/keyboard_input.rs` (new) | key events dispatched (awaited) to the focused element or to root listeners, Tab and Enter/Space default actions and the consume rule, `advance_focus` along the tab stops, `focus_node` and `blur_node`, `autoFocus` |
| `native/events.rs` | `KeyData`, `FocusData`; `KeyDown`, `KeyUp`; `Focus` and `Blur` now carry `relatedTarget` and `focusVisible` |
| `native/lib.rs` | `modality` and `activation_key`; `set_focus` with the related element and visibility (a same-element change of visibility only restyles); `focus_node` and `blur_node` (`#[func]`); the old key branch, `advance_focus` and Enter/Space code replaced by `handle_key`; the root takes key focus in `ready()` if an element was focused before it entered the tree |
| `native/mount.rs`, `native/render_tree.rs`, `native/pointer_input.rs`, `native/snapshot.rs` | `FocusTree` for the mounted tree and `autoFocus` after each commit; the ring only for a keyboard focus; a press focuses the nearest focusable ancestor-or-self and sets the modality; the snapshot reports `modality` |
| `src/props.ts`, `src/native.ts`, `src/events.ts`, `src/components.tsx`, `src/renderer.ts`, `src/index.ts` | `tabIndex`, `autoFocus`; `keydown`/`keyup` (`UIKeyboardEvent`, `onKeyDown(Capture)`, `onKeyUp(Capture)`); focus events with `relatedTarget` and `focusVisible`; the handle's `focus()` and `blur()`; the host's `focusNode` and `blurNode` |
| `tests/*` | the fake host's focus API and key events; key capture/bubble/preventDefault/repeat, root key events, focus events with related targets, handle focus, the new props |
| `demo/src/keyboard-lab.tsx` (new), `demo/src/labs.tsx` | the Keyboard lab: buttons (one disabled, one with no `focus:` class), two keyed buttons that trade places, a `tabIndex={0}` card with `focus-visible:` styles and a key log, a `tabIndex={-1}` element, a dialog with a JS focus trap and `autoFocus`, `focus()` buttons |
| `demo/src/verify.ts` | one assertion inverted (D17); the `05-keyboard-focus` step always presses Tab at least once (it used to be a mouse focus) and a new assertion probes the ring after it |
| `demo/src/verify-interaction.ts`, `scripts/verify-interaction-web.mjs` | the keyboard scenarios, native and Web (the ring is a pixel of the canvas screenshot on Web) |
| `demo/typings/godot7.gen.d.ts` | the two new methods |
| `native/PROTOCOL.md`, `README.md`, `docs/INTERACTION_PLAN.md` | focus and keyboard, D17 to D19, the I3 task text |

### Gate

Verification tiers changed during this phase (D20, at Ben's request): the phase-done tier is the unit suites, the
typecheck, Clippy, `verify:interaction` and `verify` natively, `verify:motion` because `render_tree.rs` changed,
and the Web interaction verifier because browser keyboard input changed. `verify:web` and `verify:motion:web` are in
the batch regression (see the batch section). Logs are in `/tmp/i3-gate/`.

| Command | Result |
| --- | --- |
| `pnpm test:types` / `pnpm test` | clean / **71 passed** (66 before) |
| `cargo test --locked` | **110 passed** (95 before: 7 `focus`, 7 `keymap`, 1 `props`; the wire-shape test in `events` was extended) |
| `cargo clippy --locked --all-targets -- -D warnings`, also `--features probe` | 0 warnings |
| `rustup run stable rustfmt --edition 2024 --check native/lib.rs` | clean |
| `pnpm build:native` | ok (dylib 10,545,600 bytes, default build; I2: 10,525,280) |
| `pnpm gen:types` | exit 0; only `demo/typings/godot7.gen.d.ts` changed (`focusNode`, `blurNode`) and a second run left it identical. It could not pass first: `src/native.ts` already used the new host methods, so the typings were generated with `$GODOT --headless --audio-driver Dummy --editor --generate-types --path demo` after `pnpm build:native` (plan 0.3) |
| `pnpm build` | ok |
| `pnpm verify` (native, both viewports) | exit 0 on the final tree; existing assertions unchanged except the one D17 names |
| `pnpm verify:motion` (native, both viewports) | exit 0, assertions unchanged |
| `pnpm verify:interaction` (native, both viewports) | exit 0, adds `verifyKeyboard` (38 assertions) and the root-key check in the HUD section |
| `pnpm build:web` | ok; Wasm 6,737,867 bytes (I2: 6,712,485) |
| `pnpm verify:interaction:web` (port 8097) | passed: **610 assertions** (422 before), 66 captures (54 before), mouse half at both pixel ratios and orientations |

The server on 8097 was `node scripts/serve-web.mjs` with `PORT=8097`.

### The native verifiers are flaky on this host, before and after I1 to I3

On the final tree `pnpm verify:interaction` passed 7 of 11 full runs and `pnpm verify` 5 of 8 (everything after the
implementation was complete; the runs are logged in `/tmp/i3-gate/`). The failures name different, mouse or window
dependent assertions each time: `Entering a child hovers its parent`, `The Interaction tab mounts its lab`,
`Dragging inside the track moves the knob: value 0, captured true, moves 15`, `Label-to-padding release activates
the same button`, and once the I3 assertion `With no element focused a key goes to root listeners, as target 0:
w,Control` (a `Control` key arrived that the verifier never sends) and once a `windowFocused:false` state dump. At
the pre-I1 commit `1b7a14b` the interaction verifier failed 4 of 6 runs, with `Entering a child hovers its parent`.
Every gate above is a passing full run; a failing run was repeated, never edited around.

What is proven: Godot sends this Control `MOUSE_EXIT` while the verifier's pointer is over an element and
`has_point` has not returned false (diagnostic `godot_print`s in `update_hover`, `MOUSE_EXIT` and `has_point`, run
with `pnpm verify:motion` and then removed; `lib.rs` is byte-identical to the build that was gated), and the
pre-I1 code clears hover on `MOUSE_EXIT` in the same way (`git show 1b7a14b:native/lib.rs`). What is not proven:
who sends it. The stray `Control` key and `windowFocused:false` point at real input and window focus on a host
that was in use while the windows were open; I did not move the cursor or lock input to check. Nothing in the code
was changed for it.

### Rasters compared with the pre-I1 build

The same worktree at `1b7a14b`, every native capture of the last run of each workflow against it, with a script that
classifies each differing pixel (`classify.py` in the session scratchpad): **94 pairs, 20 identical**. A pair whose
hover, pressed or focused element differs from the baseline's is a pair where the hover differs by timing (above),
and its pixels are not comparable; there were 2 in the last runs (`native/portrait/04-incremented`, hovered 21 in the
baseline and none now, and `native-interaction/portrait/06-self-removed`, none in the baseline and 106 now). The rest
differ for three reasons:

- **The focus ring is gone for mouse focus (D17), 43 pairs** (13 `native`, 23 `native-motion`, 7 `native-interaction`). At least 90 % of each pair's differing pixels are the ring's
  blue (125, 168, 255 and its blends) in the baseline, now the button's own colour or the page's. Inspected: `03-pressed`, `04-incremented`
  (the ring around `increment`), `06-context-accent`, `07-inventory`, `08-reordered`, `10-filtered`, `12-reentry`, the
  motion lab's `01-closed`, `03-open`, `07-long-narrow`, `10-removed`, `11-remounted`, `13-paint-settled`,
  `14-owner-remounted`, and the interaction lab's `01-interaction` (the `04 Interaction` tab) and `06-self-removed`
  (the `Takes focus` button: the baseline has the ring and the indigo `focus:` border, the new capture only the
  border, which is `focus:` applying to a pointer focus as D17 says).
- **Mid-transition motion captures, 25 pairs** (sampled at wall-clock offsets, as in I1 and I2; they also contain the
  same ring pixels). Not counted in the 43.
- **The engine frame number in the interaction log text**, together with the ring: 122 non-ring pixels in the
  landscape `06-self-removed` and `07-reattached`, 312 in the portrait `05-enter-leave` and `07-reattached`
  (`down frame=366` against `368` in the landscape `06-self-removed`, viewed side by side).

`05-keyboard-focus`, a capture of a mouse focus in the baseline, is now a real keyboard focus (D17) and its pixels
equal the baseline's, ring included. The new captures were inspected, native and Web: `15-keyboard-ring` (the card
after Tab: ring and the `focus-visible:` fill, six `keydown`/`keyup` Tab lines, focus lines naming where focus
came from), `16-mouse-focus-no-ring` and `17-focus-trap` (the ring on `More`, the dialog's last button, after
Shift+Tab wrapped to it).

### Negative controls

Each new regression assertion was checked to fail without its fix (the fix reverted alone, `pnpm build:native`, the
verifier; the sources were restored from copies and compared afterwards):

| Reverted | Failing assertion |
| --- | --- |
| the ring is drawn for any focus | `A press paints no ring` |
| Tab follows tag order, not document order | `After a reorder Tab follows the new document order: kb-first,kb-activate,kb-plain,kb-swap-a,kb-swap-b,... != kb-first,kb-activate,kb-plain,kb-swap-b,kb-swap-a,...` |
| Enter and Space queue a fake `pointerdown` | `Enter is one keyboard click: pointer 0, no pointer type, no pointerdown: clicks 1, pointerdowns 1, last click type "" id 0 d0` |
| `repeat` is always false | `Key events carry DOM key, code and repeat: keydown key=A code=KeyA repeat=false|...` |
| `autoFocus` is ignored | `autoFocus focuses the dialog's first button when it mounts: kb-open` |
| the default action runs although `preventDefault()` was called | `Tab at the last button wraps to the first (the trap): dlg-cancel` |
| Enter clicks on `keydown` | `Enter activates the focused button: inventory 1, map 2, help 0, panel 1, label 0, locked false` (a `verify:interaction` HUD assertion that was already there) |
| `focus()` is always a keyboard focus | `focus() after a press is not a keyboard focus` |
| Tab focus is not visible (`verify.ts`) | `A Tab focus paints the focus ring on the button even when its style has no focus rule` |

### Verification added

Natively and on Web (Web: the ring is read from the canvas screenshot with an inline PNG decoder):

- Tab visits `Button`s and `tabIndex={0}` elements in document order and wraps; Shift+Tab walks it backwards; a
  disabled button and a `tabIndex={-1}` element are skipped; two keyed buttons that trade places change the order
  Tab follows (so it is the document, not creation order);
- Tab onto a button with no `focus:` class paints the ring (a focus change that restyles nothing still paints,
  D7's defect); the card shows the ring and matches `focus-visible:`; a press focuses without the ring and matches
  `focus:` but not `focus-visible:`;
- `focus` and `blur` name the element focus came from and went to, and whether it was a keyboard focus;
- key events carry the DOM `key`, `code` and `repeat` (a typed `a` is `KeyA` with key `a`, Shift+`a` is `A`, arrow
  keys, `Tab`), `keyup` follows `keydown`, and with nothing focused they reach root listeners as target 0;
- Enter and Space on a focused button are one `click` of pointer 0 with no pointer type and no `pointerdown`; `:active`
  applies while Space is held; nothing clicks until the key is released; the held key's repeats neither click nor
  release; the HUD scenario's keys reach the game when native does not consume them;
- a modal dialog written in JS from `onKeyDown`, `preventDefault()` and `focus()` keeps Tab inside itself (Tab at
  its last button wraps to the first, Shift+Tab at its first wraps to the last), `autoFocus` focuses its first
  button when it mounts, and Escape closes it and returns focus to its opener;
- `focus()` after a press is not a keyboard focus, `focus({ focusVisible: true })` shows the ring, and `focus()` on
  an element that cannot take focus throws `focus failed: node N cannot take focus: it is not a button and has no
  tabIndex`.

### Choices the plan left open

- D17 to D19 list the ring, modality and key choices.
- **`tabIndex` values.** Only `0` and `-1` are accepted (any other value is a validation error, as the plan says
  positive values are out of scope); it is a native prop on every kind of element.
- **Root key focus.** The root takes Godot key focus when an element is focused (including one focused by a commit
  before the root entered the tree), not at `ready()` (plan 3.11).
- **New modules.** `focus.rs`, `keymap.rs` and `keyboard_input.rs` (plan 3.24 lists `focus.rs` and `keymap.rs`; the
  glue to Godot's key events is the third, as `pointer_input.rs` was for I2).
- **A demo page.** The Keyboard lab is a page on the registry (`showLab('keyboard')`), not a section of the
  Interaction tab (D14).

### Engine findings

- A Godot `InputEventKey` from a real keyboard carries `unicode`; `Input.parseInputEvent` leaves it as the script set
  it, so the verifier's helper sets it (the DOM `key` of a typed character comes from it).
- `Key` has no distinct left and right `Shift`/`Control`/`Alt`/`Meta`; the side comes from the event's `location`
  (`KeyLocation`), which the verifier's events leave unspecified, and `dom_code` reads that as the left key.
- Godot grants the root key focus on every left press before any handler runs (`viewport.cpp:1976`), so a press on
  an element that takes no focus needs the post-press release D11 describes; a press on one that does (a button or a
  `tabIndex` element) leaves key focus alone.

### Plan problems found

- Plan I3 says the ring shows for `:focus-visible` and the F3 verifier asserts a mouse press paints it; the two
  contradict (D17).
- The F3 verifier's `05-keyboard-focus` never pressed Tab (the mouse had already focused the button), so it was
  not a keyboard-focus capture and the assertion named `Tab reaches increment` could not fail (D17).
- Plan 3.24 omits `native/keyboard_input.rs`, `demo/src/keyboard-lab.tsx` and `tests/recording-host.ts`.


## Batch regression after Phase I3 (I1 to I3)

Date: 6 November 2026, run on the I3 commit `dec1f5d` (the plan edit that followed it changes no code). This is the
full regression run D20 asks for at the end of a batch: `pnpm build:web` and all six verifiers, each run once with a
retry budget of three; every one passed on its first attempt (logs in `/tmp/regress/`, 3 of 3 verifiers per platform).
Host while running: 48 % free, swap 8.2 GB of 9.2 GB used.

| Command | Result |
| --- | --- |
| `pnpm build:web` | ok (44 s); Wasm 6,737,867 bytes |
| `pnpm verify:interaction:web` (port 8097) | passed: **610 assertions**, 66 captures |
| `pnpm verify:web` | passed: **253 assertions**, 53 captures (unchanged since F4) |
| `pnpm verify:motion:web` | passed: **433 assertions**, 26 captures, 30 benchmark cells (unchanged) |
| `pnpm verify` (native, both viewports) | passed |
| `pnpm verify:motion` (native, both viewports) | passed |
| `pnpm verify:interaction` (native, both viewports) | passed |

The existing assertions of `verify`, `verify:motion`, `verify:web`, `verify:motion:web`, `verify:interaction` and
`verify:interaction:web` are those of the pre-I1 commit `1b7a14b`, with the single exception D17 records (the
`verify.ts` mouse-press ring assertion, inverted, and the keyboard-focus step that now really presses Tab); the
Web counts of `verify:web` and `verify:motion:web` are exactly the F4 and I2 counts, so no I1 to I3 change moved a
Web assertion in those two.

### Rasters of this run against the pre-I1 build

Every native capture of this run against the worktree at `1b7a14b` (`classify.py`): **94 pairs, 20 identical,
46 with only the focus ring removed (D17; at least 90 % of the differing pixels are the baseline's ring blue), 27
that differ for the reasons I1 and I2 recorded** (22 mid-transition motion captures sampled at wall-clock offsets,
and five interaction captures that print the engine frame number, which also carry the ring), **and 1 whose hover
differs**. That one is the portrait `native-interaction/06-self-removed`: the pointer is at (362.5, 668.5), over the
`Restore` button that slid into the place of the button that removed itself, and this build hovers it. The baseline's
own landscape capture of the same step shows `Restore` hovered, and its portrait capture does not, so the baseline's
portrait run lost the hover (the `MOUSE_EXIT` timing described in the I3 section); the I3 tree's portrait capture
agrees with both landscape captures. No pixel differs for any other reason.

I1's and I2's claims that those phases changed no pixel of the existing demo stand: the pixels that changed are the
focus ring, and they changed in I3.

## Task 0 - native verifiers and the real keyboard, mouse and window system

Date: 6 November 2026. Decisions D21 and D22 are in the plan's decision log. The I3 section above records the flake:
`verify:interaction` passed 7 of 11 runs and `verify` 5 of 8, with hover, focus and stray-key failures that named nothing the
verifiers did.

### What reaches a verifier window (traces)

A temporary trace (every input event the demo received, with its class, device and position; every root notification
`MOUSE_ENTER/EXIT`, `WM_WINDOW_FOCUS_IN/OUT`, `WM_MOUSE_*`, `FOCUS_*`; a wall-clock stamp on each; later removed by editing)
over the unchanged verifiers showed:

- **Real mouse motion arrives with device 32 at positions far outside the window.** A quiet `verify:interaction` portrait run
  (nothing of mine moving anything; the user was working) saw 202 `_input` events, 173 of them not the verifier's:
  `InputEventMouseMotion device=32 pos=-10692,-907 ...` at about 50 a second, against a 600 x 900 window, from a cursor on
  another display. That run failed `Entering a child hovers its parent`. Godot 4.8 gives every real mouse event device 32 and
  every real key device 16 (`core/input/input_event.h:66-67`), and an unmarked injected event gets the same, so the two cannot
  be told apart without marking one.
- **They arrive only while the window is the key window.** Between a focus-out at 31.09 s and a focus-in at 32.79 s of one run
  (another Godot window, the same size and position, had been ordered in front of it) the cursor kept moving and not one
  real event reached `_input`; the first came 0.3 s after the focus-in. That is what AppKit's rule for the key window gives
  (the window asks for every mouse move, `setAcceptsMouseMovedEvents:YES`, `platform/macos/display_server_macos.mm:156`,
  and the key window gets the keys); the isolation below is built on it and the verifier now reports any event that
  disproves it.
- **Each real motion moves the hover before `_input` can drop it.** `Viewport::push_input` calls `_update_mouse_over(me)`
  (`scene/main/viewport.cpp:3554`) and only then `_call_input_pause` (`:3568`), which runs `_input`. In the trace a real
  motion that followed an injected one was followed by `MOUSE_EXIT` on the root (`hovered=Some(124)` cleared); the failed
  assertions were the hover ones (`Entering a child hovers its parent`, `Moving between siblings keeps the parent
  hovered`, `Hover reaches an auto element inside a none region`) and `Moving over a cursor-pointer button sets the window
  cursor: 0` (the real position, over nothing, set the arrow).
- **Accumulation loses an injected position.** `Input::parse_input_event` merges a motion into the previous buffered event
  (`core/input/input.cpp:1654-1657`) and `InputEventMouseMotion::accumulate` checks the window, the button mask and the
  modifiers, not the device (`input_event.cpp:1036-1066`). In one run an injected motion's position (`561.5,163.5`) never
  reached `_input`: a real motion in the same frame had absorbed it.
- **Focus.** Every run showed `WM_WINDOW_FOCUS_OUT` and `APPLICATION_FOCUS_OUT` about 70 ms after `_ready` and the matching
  `IN` events about 190 ms after it: the engine's own activation of an unbundled application (below), not a user. A second
  Godot window (another agent's verifier, the same size and default position) was on top of this one in two of the traces; it
  and the resulting focus loss cancel a press in flight (D6). `windowFocused:false` in the I3 dumps is this.
- **Engine startup activates the application.** `DisplayServerMacOS::show_window` calls `[GodotApp activateApplication]` for the
  main window (`display_server_macos.mm:1797`); that calls `activateIgnoringOtherApps:YES` and, because the process is not a
  bundle started by launchd (`isatty`, or a bundle id that differs from `__CFBundleIdentifier`), the three-step activation
  hack (switch to SystemUIServer, `TransformProcessType`, activate again, each step 20 ms apart,
  `platform/macos/godot_application.mm:59-80, 192-216`). Nothing in `main.cpp` reads a command-line flag or setting that
  turns it off (`display/window/size/no_focus` only changes whether the window is made the key window, and is static), and
  `open -g` would still reach the unconditional first line. A verifier window therefore interrupts the user's focus for an
  instant when it opens; that is accepted. (A watcher that polled `NSWorkspace.frontmostApplication` from a plain tool
  reported the same application throughout; a command-line tool with no run loop gets a stale answer, so that observation
  is not evidence either way and is not used.)

The trace and a partial matrix of runs were taken before the instruction not to generate real input or run repeated
verifiers; they were made with the cursor moved by a helper written for the purpose, which was removed with the loop
scripts. In that partial matrix the interaction verifier passed all 10 landscape and portrait runs with no cursor movement
of mine (the user's own mouse was in use) and failed 8 of 10 with the cursor swept across the window (hover assertions,
the middle-click log, the cursor shape). Nothing of that is kept in the repository; no such tool is used again, and the
numbers are the reason for the design below, not an acceptance claim.

### Decision

D21 and D22. The mechanisms, against the evidence:

| Mechanism | Verdict |
| --- | --- |
| Inject with a dedicated device id; the owner drops every other device in `_input` | kept, but alone insufficient: hover has moved before `_input` |
| `Input.useAccumulatedInput = false` | kept: removes the merge |
| `unfocusable` window | kept: the window never becomes the key window, so the real keyboard and the off-window mouse never arrive, and a focus theft has nothing to take |
| `mousePassthrough` window | kept: the cursor over the window reaches what is beneath, and its title bar cannot drag or close it |
| The verifier delivers the focus-out notification (D6) | kept: D6 is tested by injecting the condition, not by relying on the OS |
| Host the UI in a `SubViewport` driven by `push_input` | not chosen: it skips `Input`'s touch/mouse emulation (D16's test) and moves the `_unhandled_input` counters |
| Replace the window's DisplayServer input and event callbacks with a filter | not chosen: immune by construction, but more machinery than the rate calls for; revisit if disturbances are frequent |
| `display/window/size/no_focus` project setting, or `override.cfg` | not chosen: static; reaches normal runs |
| Launch with `open -g` | not chosen: the engine's activation call is unconditional |
| Detect and re-run on interference | kept (D22) |

### What changed, by file

| File | Change |
| --- | --- |
| `demo/src/verifier-input.ts` (new) | `VERIFIER_DEVICE_ID` (`1 << 30`, the id `verify-world` uses), `parseVerifierEvent`, `injectsOwnInput(args)`, and `VerifierInputIsolation`: the flags, accumulation off, the foreign-device drop, and the `GODOT_REACT_RUN_DISTURBED` log |
| `demo/src/main.ts` | begins the isolation first in `_ready` when the arguments after `--` ask for a verifier or the probe; `_input` and `_notification` feed it; `simulateWindowFocusLoss` for D6; a report of the totals at the end |
| `demo/src/verify.ts`, `verify-motion.ts`, `verify-interaction.ts` | every injected event goes through `parseVerifierEvent` (14 sites, no assertion changed); the interaction verifier's body is split into sections for `--only` |
| `demo/src/verify-interaction.ts` | one new assertion block in the pointers section: the window's focus-out cancels a press in flight (D6) |
| `scripts/native-run.mjs` (new), `native-run.d.mts`, `scripts/verify.mjs`, `tests/native-run.test.ts` (new) | D22: one launch-and-judge function every native verify script uses, and its policy tested with a stand-in for Godot (6 tests, no window) |

The existing assertions of the three verifiers are unchanged.

### Gate (Task 0 and Phase I4, on the tree rebased onto the world-space, text-engine, scroll/drag-core and kit merges)

One normal run of each native verifier, in this order, each exiting 0 on its first and only run, with the isolation line
`GODOT_REACT_INPUT_ISOLATED {"unfocusable":true,"mousePassthrough":true,"accumulatedInput":false}` in every window's log
and no `GODOT_REACT_RUN_DISTURBED` line in any:

| Command | Result |
| --- | --- |
| `pnpm test:types` / `pnpm test` | clean / **193 passed** (78 on this branch before the other tracks merged: 71 at I3, 6 `native-run`, 1 positioning styles) |
| `cargo test --locked` | **400 passed** (the merged tracks' tests and this phase's: 7 `stacking`, 4 in `props`, 1 in `layout`) |
| `cargo clippy --locked --all-targets -- -D warnings`, also `--features probe` | 0 warnings |
| `rustup run stable rustfmt --edition 2024 --check native/lib.rs` | clean |
| `pnpm build:native` | ok (default build; the probe was never installed) |
| `pnpm verify:interaction` (both viewports) | exit 0, sections events, cooperation, pointers, keyboard, positioning; the existing assertions unchanged, plus the D6 block and the positioning section |
| `pnpm verify` | exit 0 |
| `pnpm verify:motion` | exit 0 (run because `mount.rs`, `layout.rs` and `motion.rs` changed) |
| `pnpm verify:world` | exit 0, with the world verifier now on the shared isolation |

No Web gate: nothing Web-specific changed (D20). `scripts/verify-interaction-web.mjs` gained `--only` (syntax checked,
not run).

During development (not statistics): `pnpm verify:interaction --only=positioning` was run twice. The first run failed
for a reason the section could not name, a Taffy panic when the popover closed (D24), which is the negative control of
that fix; the second, after the fix, passed in both viewports.

### Rasters

Every settled native capture of the gate against the main checkout's last captures: `native` 26 of 26 identical;
`native-motion` identical except the 23 mid-transition captures (sampled at wall-clock offsets, as before; all settled
ones identical); `native-interaction` identical except `05-enter-leave`, `06-self-removed` and `07-reattached`, which print
the engine frame number (206 and 100 differing pixels in the 15 x 34 and 8 x 34 box that reads `down frame=N`), and the four
new ones. I4 changed no pixel of the existing demo. The new captures were inspected, both viewports: `18-positioning-stacking`
(B over A, C behind both), `19-positioning-raised` (A over B after `Raise A`), `20-positioning-clipping` (the red box
clipped in the relative cell, whole past the static hidden parent, the fixed box in the window's corner) and
`21-positioning-popover` (the popover under the Menu button, extending below the card and over the later button, unclipped).

### Negative controls

Each new regression assertion was checked to fail without its fix (the fix reverted alone, `pnpm build:native`,
`pnpm verify:interaction --only=positioning`; the source restored from a copy and compared afterwards):

| Reverted | Failing assertion |
| --- | --- |
| absolute and fixed elements are painted by their tree parent | `Node 106 escapes right: {"x":1360,"y":1030,...}` (the fixed box located in its cell; the section's own clipping assertions follow it) |
| `zIndex` ignored (document order only) | `C, though last in the document, is behind B for z-index -10: #f59e0b at 149,160` |
| the overlay layer is hit-tested after the main layer | `And a pointer there reaches the popover` |
| leaf output without the positioning area (D24) | the first section run's Taffy panic; and `layout::tests::a_container_that_loses_its_last_out_of_flow_child_lays_out_again` fails with `invalid SlotMap key used` |
| the window's focus-out no longer cancels the press in flight (D6, `lib.rs`) | `Focus loss clears the pressed element: 191` (`--only=pointers`) |
| (Rust) paint parent, order and hit rules | the seven `stacking` tests; `props` tests for the Taffy location rule |

The D6 block exercises the handler F3 added, now with the notification delivered by the verifier instead of the window
system; its control reverts that handler.

### What changed, by file

| File | Change |
| --- | --- |
| `native/props.rs` | `PositionSpec`, `Inset`, `zIndex` and the four insets as `StyleSpec` fields (merge, validation, Taffy mapping, `sticky` and non-integer `zIndex` rejected); the Taffy evidence tests (location rule, root and fixed, the stale hoisted list) |
| `native/stacking.rs` (new, Godot-free) | `paint_parent`, `painted_by` (sort by `zIndex`, then document key), `hit_test`, `absolute_geometry` over two traits; 7 tests |
| `native/mount.rs` | `paint_parent`, `paint_children`, `paint_roots`, `out_of_flow`; the traits over `Mounted`; `hit_test` and `absolute_geometry` delegate; `settle_paint_structure` and `move_paint_item`; geometry compares the out-of-flow nodes; delete and remove keep the paint lists honest |
| `native/layout.rs`, `native/motion.rs`, `native/lib.rs`, `native/snapshot.rs` | the positioning area workaround (D24) and its test; a changed `position` or `zIndex` re-examines the node; the settle call before geometry; the snapshot's `paintParent`, `paintIndex`, `documentIndex` |
| `src/types.ts`, `src/styles.ts`, `src/native.ts` | `Position`, `Inset`, `zIndex`; the `inset` shorthand; the utilities `static`, `relative`, `absolute`, `fixed`, `top-*`, `right-*`, `bottom-*`, `left-*`, `inset-*`, `inset-x-*`, `inset-y-*` (negative and fractional values), `z-*`, `-z-*`, `z-[n]`; the snapshot parser |
| `tests/styles.test.ts`, `tests/fixtures/compiled-styles.json`, `tests/recording-host.ts` | the utilities and their rejections; the cross-language fixture case; the fake host's snapshot fields |
| `demo/src/positioning-lab.tsx` (new), `labs.tsx` | the lab: stacking boxes with a toggle, three clipping cells with a fixed box, a card with a Menu button, a `Portal` popover anchored with `getRect()`, a backdrop, a later button under it |
| `demo/src/verify-interaction.ts` | `verifyPositioning`; the geometry check skips out-of-flow nodes; `--only` |
| `scripts/verify-interaction-web.mjs` | `--only` |
| `native/PROTOCOL.md`, `README.md`, `docs/INTERACTION_PLAN.md` | positioning and stacking, the snapshot fields, the limits, D21 to D26 |

### Choices the plan left open

- D23 to D26 list them: the paint-parent model, the Taffy workaround, the loops over the out-of-flow nodes, portal
  event paths and Tab order.
- **`zIndex` applies to every element** (the plan said React Native's semantics); `z-auto` is 0; values beyond an `i32`
  are rejected by the style compiler.
- **`inset` is a shorthand** expanded by the compiler (as `padding`), and `insetX`/`insetY` are not styles: the utilities
  `inset-x-*` and `inset-y-*` set the longhands.
- **The overlay layer root is an ordinary flex container**, so an in-flow `Portal` child stacks like any root child;
  popovers use `absolute`.
- **A new demo page, not the Interaction tab** (D14): `showLab('positioning')`.
- **No Web section for positioning.** The behaviour is not Web-specific (D20) and the Web page needs its own pixel decoding;
  `--only` exists there for the next phase that needs it.

### Engine findings

- Taffy (`fca167c`): a node keeps the list of out-of-flow boxes it contained when it loses every child (D24, with a
  test that fails when Taffy fixes it).
- The same Taffy gives an absolute element's `location` relative to its containing block's border box, and a fixed one's
  relative to the root; the plan's "evidence first" task is recorded as D23's tests.

### Plan problems found

- The Files list omitted `native/stacking.rs`, `layout.rs`, `motion.rs`, `snapshot.rs`, `lib.rs`, `src/native.ts` and the
  tests; `render_tree.rs` and `components.tsx` needed no change (the overlay layer and `Portal` already existed).
- Plan 3.8 says an absolute element attaches to its containing block's "item"; it is the `content` item (clipped to the
  padding box when the block clips), which the text now says.
- The verifiers' geometry check treated every out-of-flow element as a defect (a child outside its parent, overlapping
  siblings); `verify-interaction.ts` now skips them.
- The Taffy defect above (D24) is not in the plan.

## Phase I5 - Scroll containers

Date: 6 November 2026, on the `scroll` worktree branch (based on `5b31cdf`; not merged, not pushed). macOS (Apple M1 Max), release
dylib for native, debug Web template with Chrome for Web. Host while gating: 42-45 % free, swap 8.0-8.6 GB of 9.2 GB used (the same
heavily swapped host as I1 to I4; other agents were building and running Godot windows at the same time). Decisions D30 to D37 are in the
plan's decision log with their evidence. The integration notes of the scroll and drag core (`docs/tracks/scroll-drag-core.md`) were taken
as requirements; what they left open is decided there and in the decision log.

### What changed, by file

| File | Change |
| --- | --- |
| `native/props.rs`, `native/computed_style.rs` | `OverflowSpec` gains `scroll` and `auto` (`scrolls()`, `clips()`), `overscrollBehavior`, `scrollbarWidth`, `scrollbarColor` (inherited) and `touchAction` as `StyleSpec` fields (merge, validation, tests); `scroll|auto` map to Taffy's `Overflow::Scroll` with the default zero `scrollbar_width`; three Taffy tests record the facts D30 rests on |
| `native/pan.rs` (new, Godot-free) | `PanGesture`: one touch from going down to the first movement beyond the slop (arbitrated once, via `scroll::pan_owner`), latched pan with the slop not scrolled and the `touch-action` axes masked, release velocity. 5 tests |
| `native/scroll_input.rs` (new) | The glue: per-container offsets moved by wheel chains, keys, touch pans, thumb drags, momentum and the commands; `scrolled()` finishes every scroll (item transform, overlay, coalesced event, hover, focus ring); `reveal_node` (scroll into view); `sync_scroll_container` (scroll and overlay items follow `overflow`); `settle_scroll` (re-clamp); `scroll_state_json` |
| `native/mount.rs` | `MountedNode::scroll` (`ScrollState`), `NodeGeometry::scroll_ranges` (Taffy's range and reversed flag, masked by the axes that scroll), `clips_content` for every non-`visible` overflow, `Frame::scroll` (offset and thumb rectangles), `visible_for_input` asks the reachable geometry; geometry settles the scroll container whose ranges or size changed |
| `native/stacking.rs` | `ScrollFrame`, the offset in hit testing and `absolute_geometry`, thumbs hit before the content they cover, `ScrollMode::{Drawn, Reachable}`. 6 new tests |
| `native/render_tree.rs` | `RenderNode`'s lazy `scroll` and `overlay` items (`make_scroller`, `set_scroll_offset`, `record_overlay`), the overlay drawn with `DEFAULT_SCROLLBAR_COLOR`, the overlay repainted with the node's other paint |
| `native/events.rs` | `scroll` payload (`ScrollData`) and `EventQueue::push_scroll`, which coalesces the waiting event of a container. 2 tests |
| `native/pointer_input.rs`, `native/keyboard_input.rs` | wheel default action and consume rule (`wheel_factor`, Shift swaps the wheel's axes), thumb press, drag and release (no click), touch pan start, move, end and cancel, the fling-stopping touch; key scrolling (Space on a button still presses it, Ctrl/Alt/Meta never scroll), Tab/`focus()`/`autoFocus` reveal their element |
| `native/motion.rs`, `native/lib.rs` | one `update_process()` for motion, flicks and panning fingers, `pause_process()` for `EXIT_TREE` (D35); `process()` ticks only what has work; `scroll_to`, `scroll_by`, `scroll_into_view`, `get_scroll_state`; `Stats::{scroll_updates, overlay_records}`; the `allow(dead_code)` on `mod scroll` is gone (three items keep a commented item-level one for I9 and I10) |
| `native/scroll.rs`, `native/snapshot.rs` | `Default` for the range types; every node reports `scroll` and what a scroll container paints is shifted by its offset |
| `src/types.ts`, `src/styles.ts`, `src/native.ts`, `src/events.ts`, `src/components.tsx`, `src/renderer.ts`, `src/index.ts` | the style types and the utilities `overflow-scroll/auto` (and `-x-`, `-y-`), `overscroll-*`, `scrollbar-*`, `touch-*`; `scroll` events and `onScroll`; the host's four scroll methods and the handle's `scrollTo`, `scrollBy`, `scrollIntoView`, `getScrollState`; the snapshot's `scroll` and counters |
| `src/kit/scroll-view.tsx`, `src/kit/slider.tsx`, `src/kit/index.ts` | `ScrollView` (D36); the Slider's root says `touch-none` |
| `tests/*` | the fake host's scroll API and events; styles, events, handle and kit tests; the style fixture (the Rust tests parse it) |
| `demo/src/scroll-lab.tsx` (new), `labs.tsx`, `interaction-lab.tsx`, `main.ts`, `verify-interaction.ts`, `scripts/verify-interaction-web.mjs` | the lab (`showLab('scroll')`), the Interaction tab as a `ScrollView`, a wheel counter on the demo API, the native `scroll` section and the Web mouse and touch scroll scenarios; both verifiers' geometry checks skip what a scroll container holds |
| `demo/typings/godot7.gen.d.ts`, `demo/gen/godot/src/verifier-input.ts.gen.ts` | the four new methods; the generated file Task 0 left out |
| `native/PROTOCOL.md`, `README.md`, `docs/*` | scrolling, D30 to D37, plan 3.16 / 4.4 / 4.5 / Appendix A and the I5 task text, the scroll-drag-core and kit notes |

### Gate

All commands on the final tree, in this order, exit 0 (logs in `/tmp/i5-gate/`):

| Command | Result |
| --- | --- |
| `cargo test --locked` | **416 passed** (400 before: 3 `props`, 2 `events`, 6 `stacking`, 5 `pan`; the existing `props` test that rejected `overflowX: scroll` and `overflowY: auto` moved to the accepted values) |
| `cargo clippy --locked --all-targets -- -D warnings`, also `--features probe` | 0 warnings |
| `rustup run stable rustfmt --edition 2024 --check native/lib.rs` | clean |
| `pnpm test:types` / `pnpm test` | clean / **201 passed** (193 before: 1 style, 3 event and handle, 4 kit) |
| `pnpm build:native` | ok (default build, no probe feature) |
| `pnpm gen:types` | the Godot step run directly after `pnpm build:native` and `pnpm build` (the typings had to exist for `pnpm build` to typecheck): only `demo/typings/godot7.gen.d.ts` changed (the four `#[func]`s) and `verifier-input.ts.gen.ts` appeared, the generated file for a Task 0 source that no commit had included. The first run happened before `pnpm build` and wrote degraded `demo/gen` files (modules not compiled yet, so every script typed as `GObject`); they were regenerated correctly by a second run after the build |
| `pnpm verify:interaction` (both viewports) | exit 0, all six sections: events, cooperation, pointers, keyboard, positioning, scroll (**113** assertions in the scroll section; 28 captures per viewport); the existing assertions unchanged |
| `pnpm verify` / `pnpm verify:motion` | exit 0 / exit 0 (the latter because `mount.rs` and `render_tree.rs` changed) |
| `pnpm build:web` | ok on the second try (Wasm 6,850,089 bytes; I3: 6,737,867): the first failed in the export step, `failed to include module: res://.godot/GodotJS/src/verifier-input.js`, a defect from Task 0 (the Web export needs a compiled module for every demo script, and `scripts/build.mjs` never built `verifier-input.ts` as an entry point; no Web gate had run since). Fixed in `scripts/build.mjs`; the second run was `node scripts/build-web.mjs --export-only` over the Wasm the first run had built |
| `pnpm verify:interaction:web` (port 8099, my own `PORT=8099 node scripts/serve-web.mjs --debug`, stopped afterwards) | passed: **691 assertions** (610 at I3), 79 captures (66 at I3), 164 assertions per viewport at both device pixel ratios and orientations, 31 on the touch page. Three earlier runs of the new scenarios failed for the verifier's own reasons, each diagnosed from its log before the next run: the thumb drag used a fractional pixel (Chrome reports mouse positions in whole CSS pixels), the wheel notch scrolled half as many ticks at ratio 2 (Chrome delivers `deltaY` 50 for a CDP notch of 100 there; measured with a probe), and the flick was released more than 0.1 s after its last movement (`MOMENTUM_SAMPLE_INTERVAL_S`), which flings nothing by design |

Interference (D22): one landscape window of the final `verify:interaction` run and the portrait one logged `window-focus-loss`
disturbances (`GODOT_REACT_RUN_DISTURBED`, one and five); both passed, so nothing was re-run (a pass is a pass). No other run
logged one.

### Rasters

Every settled native capture of the final run against the main checkout's last captures: **112 of 112 identical** (`native`,
`native-motion` and the 18 pre-I4 and I4 captures of `native-interaction`, both viewports). In particular the Interaction tab, now a
`ScrollView`, is pixel-identical to its capture before (`01-interaction`): its content fits, so no bar shows. The new captures were
inspected, both viewports: `29-scroll-lab` (the seven sections at rest: thumbs at the right edges, none on the carousel, the rose
thumb on the touch list, the reversed list at its end with its thumb at the bottom), `30-scroll-clipped` (the quiet list scrolled four steps: rows
straddling its top and bottom edges are cut at them and nothing draws above or below), `31-scroll-list-scrolled` (the clicked row in its
scrolled place, with the hover and the click readout), `32-scroll-tab-reveals` (Tab brought row 3 into view: the keyboard ring around it,
fully inside the list, `top 22`), `33-scroll-chained` (the inner list at its end and the outer one scrolled on) and `34-scroll-contained` (the
inner list at its end and the outer one at 0), `35-scroll-touch-pan` (the touch list panned 15 px, `clicks 1` from the earlier tap only).
`29-scroll-lab` in portrait fits the 600 x 900 window in three rows; it did not at the first section width (the first portrait run failed `Node 460 escapes bottom`, a real layout defect of the lab, fixed by narrowing the sections). The Web captures were inspected too (`retina-landscape/26-scroll-chained`, `touch/28-scroll-touch-pan`: crisp thumbs and clipping at ratio 2; the touch list coasted past 12 rows).

### Negative controls

Godot-free: each mutant below was applied alone with `cargo test --locked` and the file restored from a copy afterwards.

| Mutant | Failing test |
| --- | --- |
| hit testing ignores the scroll offset | `a_pointer_reaches_the_row_that_the_scroll_offset_put_under_it`, `a_scrollbar_thumb_is_hit_before_...`, `an_absolute_box_scrolls_with_a_positioned_scroller_...` |
| drawn geometry ignores the scroll offset | `drawn_geometry_follows_the_scroll_...`, `nested_scrollers_add_their_offsets`, `an_absolute_box_scrolls_...` |
| the reachable geometry keeps the scrollers' clips | `reachable_geometry_ignores_scrolling_but_not_what_hides_an_element_for_good` |
| thumbs are not hit | `a_scrollbar_thumb_is_hit_before_the_content_it_covers` |
| `scroll` events are not coalesced | `scroll_events_coalesce_per_container_and_only_while_waiting` |
| the slop is scrolled too | `a_pan_scrolls_opposite_to_the_finger_...`, `release_velocity_is_what_the_last_frames_saw_...` |
| `pan-y` does not mask the horizontal axis | survived at first (the test had no `pan-x` case); `a_pan_scrolls_opposite_...` now has one and the mutant fails it |
| `scroll` and `auto` map to Taffy's `Hidden` | `scroll_and_auto_overflow_lay_out_like_hidden_and_report_a_scroll_range` |

Integration (the fix reverted alone, `pnpm build:native`, one landscape window of `verify:interaction --only=scroll`, the source restored
and compared afterwards):

| Reverted | Failing assertion |
| --- | --- |
| a `contain` container's kept scroll is not consumed | `contain: and from the game` |
| no re-clamp after layout | `Layout re-clamps the offset to the new range: 1070 of 190` |
| Tab stops and focus retention use the drawn geometry | `Arrow Down a page / 8: 142` (the focused row scrolled out of view lost focus, so the key found nothing to scroll) |
| the tap that stops a fling clicks | `The tap that stops it does not click: ... clicks 2` |
| the scrollbar overlay is not repainted with the node's other paint | `And the thumb is no longer drawn: #e11d48 at 186,419` (a real defect found by reading the code after the first gate run, then fixed) |
| no hover refresh after a scroll | `A scroll under a mouse that did not move hands the hover to the row now under it, with no React in between: quiet-row-1`; the first version of the assertion passed with the refresh removed (the lab's `onScroll` caused a commit that re-found the hover, and the wheel helper moves the mouse before every tick), so the check was moved to the quiet list, which has no handlers, and to a key scroll |

### Verification added

Native (`verify:interaction --only=scroll`, both viewports; Web mirrors the mouse and touch halves, below):

- ranges: a tall list has `maxScrollTop > 0`, its client area is its padding box, `scrollHeight` is the client height plus the range; a
  `column-reverse` list has a negative range; only scroll containers have scroll state;
- wheel: one tick is the client height / 8 and is consumed, JS hears the `scroll`, the same tick at the top with nothing behind the list
  and one over UI that does not scroll reach `_unhandled_input`; Shift+wheel, horizontal ticks and a prevented (Ctrl) wheel; a pan gesture
  scrolls page / 8 per delivery and is consumed;
- scrolling touches nothing else: three ticks over a list with no handlers leave `batches`, `layoutPasses`, `paintPasses`, `nodesCreated`,
  `nodesUpdated`, `nodesDeleted`, `nodesRestyled`, `mutations`, `boxRecords` and `contentRecords` unchanged, move `scrollUpdates` by exactly
  three and `overlayRecords` up, and move a row by exactly the offset;
- clipping pixels: rows straddling the top and bottom edges draw inside the list and not above or below it;
- scrollbars: thumb width, edge, length and position follow the formulas of `scroll.rs`; the default thumb is slate-500 at 60 % (a
  blended pixel), `scrollbar-[#e11d48]` colours it exactly, `scrollbar-none` hides it on a list that scrolls, and changing it with no scroll
  repaints it; the thumb drags the content by the pointer's share of the track with the pointer off the bar, lets go on release and clicks nothing;
- hit testing and hover: after four ticks the hover is on the row now under the stationary pointer; a click at a scrolled row's place
  reaches it and bubbles; a key scroll under a mouse that did not move (quiet list, no React) hands the hover on;
- keyboard: Page Down, arrows, End, Home, Space and Shift+Space on a container, Space on a focused button presses it and does not scroll,
  Ctrl chords do not scroll, a key that scrolled is not the game's, Tab to a row below the fold scrolls it into view (the ring is a keyboard
  focus and the row is fully inside the list) and Shift+Tab back, `scrollIntoView` and `scrollTo({ top: 0 })` through the handle;
- re-clamping: the content shrinks under a list scrolled to its bottom; the offset follows and JS hears it;
- chaining: while the inner list can scroll the outer one stays, the overshooting tick spills its remainder (checked to the pixel), then the
  outer list takes the ticks and the game gets none, and with both at the end the tick reaches the game; `overscroll-contain` keeps the
  rest from the outer list and from the game;
- touch (device 0 with the engine's emulation on): a tap clicks a button in a scroll container; a movement inside the slop is still a tap;
  beyond it the pan starts, `pointercancel` is sent once, the slop is not scrolled, the content follows the finger and back, and no
  `click` follows; `touch-none` keeps `pointermove` and the list does not pan; a flick coasts after the finger lifts and comes to rest on
  its own, further than the finger went, and then asks for no more frames; a touch on the coasting content stops it and does not click.

### Choices the plan left open

- D30 to D37 list them: which axes scroll and the Taffy mapping, the paint-tree and reachability rules, how wheel, key and touch input are
  taken and consumed (including contain), the scrollbar rules, the one `process()` decision, the JS surface and the Web wheel scale.
- **A page of its own for the demo** (D14): the plan said the Interaction tab becomes a vertical `ScrollView` and gets the carousel and the
  lists; the tab's body is a `ScrollView` now (no pixel changed), and the lists live on the `scroll` lab page, because the tab's fixed
  body could not hold them without pushing the existing captures.
- **Both viewports for the section.** The runner starts both windows for any `--only`; the section passed in both after the layout fix.

### Engine findings

- `is_inside_tree()` is still true while `NOTIFICATION_EXIT_TREE` is delivered (`scene/main/node.cpp` `_propagate_exit_tree` notifies at
  line 431, and clears `data.tree` at line 455), so the root's `process()` decision cannot be made from there: `pause_process()` (D35).
- Godot's Web display server turns a DOM wheel notch of 100 pixels into 3 ticks (`MOUSE_WHEEL_PIXEL_FACTOR` 0.03,
  `platform/web/display_server_web.cpp:681`, D37).
- On the Web touch page a swipe leaves a `mouse` pointer record at the finger's last position and hovers the row under it (visible in
  `touch/28-scroll-touch-pan`). Chrome sent only pointer and touch events (probe: one `pointerdown`, `touchstart`, three
  `pointermove` and `touchmove`, one `pointerup` and `touchend`, no `mouse*`), so the cause is Godot's accumulated input
  merging the touch's emulated motion into the buffered real mouse motion of the verifier's own `page.mouse.move(1, 1)` (the
  mechanism D21 found; the native verifiers turn accumulation off). It needs a real mouse and a touch on one device; no assertion
  depends on it and it is not changed here.
- Chrome reports mouse positions in whole CSS pixels and divides a CDP wheel notch by the device pixel ratio (`deltaY` 100 at ratio 1, 50
  at 2); a Web verifier that scrolls must account for both (D37).
- `InputEventMouseMotion` from `Input.parseInputEvent` carries no button mask unless the script sets it, so a drag that reads the mask
  to decide the button is still down fails under synthetic input (the first thumb-drag run); native does not read it (D34).

### Plan problems found

- Listed with the phase in the plan: files, Taffy's missing `auto`, one clip for both axes, reachable geometry for Tab and focus, contain
  and latching, and the verifiers' geometry checks.
- The scroll and drag core's S2/S3 notes needed no change; its claim "I5 can latch by remembering the first link that moved" was not taken
  for wheel and pan gestures (D32) and was taken for touch pans (D33).
- Plan 3.16's "re-clamped after layout" needed a rule for where the ranges live: they are part of the stored geometry (D30).

### What is left for the next phases

- **I9 (drag and drop)**: drag auto-scroll through `scrolled(&tags)` and the `update_process()` decision; `autoscroll_velocity` is built and
  unused (its `allow(dead_code)` goes then); `begin_touch_pan` must come after the drag arbitration of 3.12 rule 3; `DragMachine::Refresh`
  after each scroll under a stationary pointer. Details in the scroll-drag-core notes.
- **I10 (accessibility)**: done on this branch after the rebase (D38, "Rebased onto `cab7d0f`" below): the AX scroll actions call
  `scroll_by_checked`, `scroll_to_checked` and `scroll_into_view_checked`.
- **I7**: text inputs must be excluded from key scrolling in `key_down_default`.
- Not done, by plan or choice: scrollbar track clicks (paging), animated programmatic scrolling, overscroll bounce, `position: sticky`,
  fading scrollbars, native list virtualization.

## Rebased onto `cab7d0f`: scroll accessibility and the scrolling Select list (D38, D39)

Main moved to `cab7d0f` (text layout, I10 accessibility, kit Select and the anchored label) while the `scroll` branch was waiting. The
branch is rebased onto it (its four commits are now `02fb2b7`, `b2f4d48`, `554cb58` and `6cf7406`), then carries the two pieces the
coordinator asked for: the I10 remainder for scroll containers (`3ceb564`), the Select list that scrolls (`714a640`) and the interaction
verifier's deadline (`836447b`).

### Rebase

Every conflict was a place where both sides added to the same list or block, and both were kept:

| File | Resolution |
| --- | --- |
| `native/lib.rs` | main's `_on_accessibility_action` and the accessibility element hooks, then this branch's `scroll_to`, `scroll_by`, `scroll_into_view`, `get_scroll_state`, `mod pan; mod scroll; mod scroll_input;` and the scroll `process()` tick |
| `src/native.ts`, `src/renderer.ts`, `src/components.tsx`, `src/events.ts`, `src/index.ts`, `src/kit/index.ts` | main's `getSize`/`useRootSize`, the ARIA props and `UIAccessibilityActionEvent`, plus this branch's scroll host methods, the handle's four scroll methods, `UIScrollEvent`/`onScroll`, `ScrollView` |
| `tests/recording-host.ts`, `tests/events.test.ts` | the fake host keeps main's `size`/`resize` and accessibility action events and this branch's `scrollStates`, scroll requests and `scroll` events |
| `demo/src/labs.tsx`, `demo/src/verify-interaction.ts` | both labs (`inputs`, `scroll`) and both sections; the scroll captures were `22` to `28` and collided with main's inputs captures, so they are now `29` to `35` (inputs `22` to `28`) |
| `scripts/build.mjs`, `demo/typings/godot7.gen.d.ts` | main's `text-layout` and `a11y-main` entry points beside this branch's `verifier-input`; the typings keep the four scroll methods |
| `demo/typings/jsb.*.bundle.d.ts` | CRLF-only differences (`git diff --ignore-cr-at-eol --stat` printed nothing), restored, not committed |

ARIA props now go to native, and `PropsSpec` rejects unknown keys: nothing this branch adds is an ARIA prop (scroll is style, events and
handle methods), and `tests/prop-tree.ts` was not used by any of its tests. After the rebase and before anything new: `cargo test` 489,
`pnpm test:types` clean, `pnpm test` 286.

### What was added

| File | Change |
| --- | --- |
| `native/accessibility_model.rs` | `AxRole::ScrollView`; `AxScroll` and `AxScrollAxis` on `AxNode` and `AxProps`; `AxNode::in_scrollable`; the unroled-scroll-container rule in `visit`; `AxActions::{scroll_x, scroll_y, scroll_into_view}`; `AxAction::{ScrollUp, ScrollDown, ScrollLeft, ScrollRight, SetScrollOffset, ScrollIntoView}` (codes 6 to 11). 6 tests |
| `native/accessibility.rs` | `Mounted` reads the scroll state and the paint chain for `AxNode`; the role, `update_set_scroll_x/y` and ranges, the six actions' callables; `handle_accessibility_action` performs them through `scroll_by_checked`, `scroll_to_checked` and `scroll_into_view_checked`, with the unit (`AccessibilityScrollUnit`, none meaning an item) and the offset (`Vector2`) read and rejected loudly |
| `native/scroll.rs`, `native/scroll_input.rs` | `ScrollDirection`, `ScrollUnit` and `assistive_scroll_delta` (the distances of the arrow and Page keys; 1 test); `scroll_changed` asks for an accessibility update |
| `src/kit/popover-position.ts`, `src/kit/select.tsx` | `placePopover` returns `maxHeight`; the list is `overflow-y-auto overscroll-contain` with it, items `shrink-0`, the placed height is the items' (`scrollHeight`), a press on a thumb is not prevented, items take focus on `pointermove` (mouse and pen) instead of `pointerenter`. 5 tests |
| `tests/kit-host.ts`, `tests/select.test.ts`, `tests/a11y-expectations.test.ts` | `scrollStatesByTestID` for the fake host; the placement, cap, natural-height, thumb and pointer tests; the scroll area in the hand-written readings |
| `demo/src/inputs-lab.tsx`, `demo/src/verify-interaction.ts` | a 40-item select in the Inputs lab (own state, not in the readout) and its `inputs` verifier case; the tab stops and the captures (`27-inputs-select-long`, `28-inputs-final`, scroll `29` to `35`) |
| `demo/src/a11y-panel.tsx`, `demo/src/verify-a11y.ts`, `scripts/a11y-expectations.mjs` | a `ScrollView` of twelve messages and a button in the accessibility lab; the Godot-side checks of all six actions; `AXScrollArea` in the table the platform tree will be judged by |
| `scripts/verify.mjs` | the interaction verifier's deadline, see "Gate" |

The Select verifier case (`verifyInputs`, in the landscape window the list is capped to 502 px under its trigger: 1368 px of items): the list is
as tall as the room under its trigger less the gap and the margin, still under the trigger, scrollable with a thumb; opening focuses
item 1; ArrowDown as many times as items fit lands on the first item that was cut, and the list scrolled just far enough to put it flush with the
bottom edge; End shows the last item flush; the wheel scrolls a step, goes on to the end, and a tick at the end is contained (the game's
wheel counter does not move); Home shows the first item flush with the top edge; a thumb drag moves the content one to one and
neither closes the list nor chooses; a press on an item that was scrolled into view chooses it, closes the list and refocuses the trigger.

### Found on the way

- **Keyboard against a resting pointer** (a real defect, found by that verifier case on its first run): items took focus on
  `pointerenter`, and a key that scrolled the list moved items under a pointer that had not moved, so the item that arrived under it took
  focus from the one the key had chosen ("Home goes to the first item ...: inputs-long-item-option-8"). Items take focus on
  `pointermove` now (D39).
- **A thumb that could not be dragged**: the list prevents the `pointerdown` of the presses that are its padding's, and native only
  drags a thumb for a press nobody prevented (D34); the list now leaves a press on a thumb alone (D39).
- **The interaction verifier's deadline**: with the scroll and inputs sections both in it, a landscape run takes about 130 s, and the
  120 s deadline (`SIGTERM`, `exit null`) killed it in every attempt. Each attempt also logged an unrelated `window-focus-loss` (and, in
  the controls, a real `InputEventMouseMotion device=32` from outside the verifier), so the runner took the kills for interference and
  ran it again three times (D22). `scripts/verify.mjs` now gives the interaction workflow 300 s, a hang guard and not a budget.
  The first full run with it passed; both windows logged one focus loss each and passed.

### Gate

All on the final tree, each once except where said:

| Command | Result |
| --- | --- |
| `cargo test --locked` | **496 passed** (489 after the rebase: 6 in `accessibility_model`, 1 in `scroll`) |
| `cargo clippy --locked --all-targets -- -D warnings`, also `--features probe` | 0 warnings |
| `rustup run stable rustfmt --edition 2024 --check native/lib.rs` | clean |
| `pnpm test:types` / `pnpm test` | clean / **292 passed** (286 after the rebase) |
| `pnpm build:native` | ok; the installed dylib is the default build (rebuilt after the negative controls) |
| `pnpm verify:a11y` | the Godot-side half passed (`GODOT_REACT_A11Y_NATIVE_PASSED`, with the scroll checks), then exit 2 "the platform tree was NOT verified: no accessibility driver" (Godot48 has no AccessKit), as expected |
| `pnpm verify:interaction` | exit 0, both windows, all seven sections. Runs before it: one failed at the Home assertion (the defect above), then the runner's three attempts were killed by the 120 s deadline; the passing run is the next one. Both windows logged one `window-focus-loss` and passed |
| `pnpm verify` / `pnpm verify:motion` / `pnpm verify:world` | exit 0 / 0 / 0 (a focus loss in `verify`'s portrait window; it passed) |
| `pnpm build:web`, then `pnpm verify:interaction:web` (port 8099, free beforehand, my own `PORT=8099 node scripts/serve-web.mjs --debug`, stopped afterwards) | passed: **691 assertions**, 79 captures, the same as before the rebase (the Web verifier has no `inputs` section, and accessibility is native-only here) |

The new captures were inspected, both viewports: `27-inputs-select-long` (the list ends 8 px above the window's bottom edge, an item cut at its top
edge, the thumb at the right edge, near the top of its track after the drag) and `22-inputs-rest` (the new select fits in the row, portrait too).

### Negative controls

Each with the fix reverted alone, rebuilt (`pnpm build:native` or `pnpm build`), run once, restored from a copy and verified restored:

| Reverted | Failing assertion |
| --- | --- |
| the scroll actions move by zero | `verify:a11y`: "A scroll-down action by an item scrolls a step: 0 for 11.75" |
| `SET_SCROLL_OFFSET` does nothing | `verify:a11y`: "A set-scroll-offset action scrolls to the offset: 0" |
| `SCROLL_INTO_VIEW` does nothing | `verify:a11y`: "A scroll-into-view action on the last item scrolls it into view: 0" |
| the list gets no `maxHeight` | `inputs`: "A list taller than the room under its trigger is capped to that room: 1368 for 502" |
| the list prevents every press | `inputs`: "Dragging the list's thumb moves the content with it: 4 -> 4" (two of the three attempts reached it; the third was disturbed earlier) |
| items focus on `pointerenter` | the first full run, before the fix: "Home goes to the first item and shows it at the top edge: inputs-long-item-option-8". The control run that put it back failed earlier in all three attempts, in assertions that are hover-sensitive and have nothing to do with the change, with a foreign `InputEventMouseMotion` in each log, so it shows nothing |
| the placed height is the box's, and a thumb press is prevented | the Select unit tests 46 and 47 ("places a capped list for its items' height ...", "a press on a scrollbar thumb is left to native ...") |

What no control or run here can show: that the platform tree has an `AXScrollArea` with the scroll values and offers the actions, and that
`request_accessibility_update` in `scroll_changed` keeps a live tree current (the engine does not deliver updates when accessibility is
off, which is how the verifier runs). That needs the stock engine with AccessKit; another agent is wiring the verifier to it.

### What is left

- Read the platform tree for the scroll view on a stock engine: `AXScrollArea` for `a11y-scroller`, its scroll bar values, and that
  VoiceOver's scroll gestures reach the actions. The table in `scripts/a11y-expectations.mjs` for it was written, not read from an adapter.
- A transform on a content element, as `ItemList` does, if a long scroll view under a screen reader shows churn (D38).
- `focus({ preventScroll })`, so that moving the pointer over an item cut by the list's edge does not scroll it into view (D39).

## Phase I6: text selection (`1071e8d`, D41)

Built on the `text-selection` branch; the full report, decisions S1 to S18 and negative controls are in `docs/tracks/text-selection.md`.

- **Agent's gates, on the branch before rebasing:** `cargo test` 498 passed, Clippy clean, fmt clean, `pnpm test` 293 passed, `verify:interaction` (all 8 sections, both viewports), `verify`, `verify:motion`, and `verify:interaction:web` (771 assertions, 91 captures). The landscape interaction window passed on its third attempt and `verify` portrait on its second; each re-run followed a logged real-mouse disturbance (D22).
- **Coordinator's check after rebasing onto `d417bb5` (I5 and D40):** `cargo test` 505 passed, Clippy clean, fmt clean, `pnpm test:types` clean, `pnpm test` 0 failed, and `verify:interaction --only=selection,inputs` passed in both viewports with no re-runs. The one conflict was the 300 s window deadline, which I5 and I6 had each added; main's interaction-only deadline was kept.
- **Inspected:** `selection-04-highlight.png` (landscape): the rose highlight sits under its text and the readout matches.

**Not run after the rebase:** the other interaction sections, `verify`, `verify:motion` and the Web verifier. They wait for the batch regression.

## Stock engine profile (`64e674c`, D42)

Built on the `stock-engine` branch; the full report is in `docs/tracks/stock-engine.md`.

- **Agent's gates, on `d417bb5`:** stock `verify:a11y` (real macOS tree, four readings, geometry residual 0.000 pt), stock `verify:interaction`, default `verify`, `cargo test` 496 passed, Clippy clean, `pnpm test` 310 passed, `test:types` clean on both profiles. Earlier in the track, before that rebase: stock `verify`, `verify:motion`, `verify:world`, `verify:text-layout` (619/619), and stock Web `verify:web` and `verify:interaction:web` on the release template. After the debug template fix: stock Web `verify:web` on the debug template (253 assertions).
- **Coordinator's check after rebasing onto `710adc3` (I6):** `cargo test` 505 passed, Clippy clean, fmt clean, `pnpm test` 317 passed, default `test:types` clean, and `verify:interaction --only=selection` passed on both profiles in both viewports. The first stock `test:types` failed because it ran before the stock library was rebuilt, so its typings predated I6's `#[func]`s; after building that library and regenerating, it passed. The freshness guard track exists to catch that case.
- **Proven for the first time:** the accessibility update requested on each scroll keeps a live tree current. After a 40 px scroll, Message 2 moved from 596.5 pt to 576.5 pt, which is exactly 40 px at 0.5 pt per pixel.
- **Not done:** platform focus and VoiceOver by hand; scroll bar elements (D42).

## Phase I9: drag and drop (`400bea3`, D43)

Built on the `drag-drop` branch; the full report, decisions I9-1 to I9-16 and negative controls are in `docs/tracks/drag-and-drop.md`.

- **Agent's gates, on `710adc3`:** `cargo test` 510 passed, Clippy clean, fmt clean, `pnpm test` 310 passed, `verify:interaction` (nine sections, both viewports), `verify`, `verify:motion`, and `verify:interaction:web` (906 assertions, 104 captures, including a touch page). One landscape attempt was disturbed by another window and re-run under D22.
- **Coordinator's check after rebasing onto `64e674c` (stock engine):** `cargo test` 510 passed, Clippy clean, fmt clean, `pnpm test` 328 passed, `test:types` clean on both profiles, and `verify:interaction --only=drag` passed on both profiles in both viewports with no re-runs.
- **Inspected:** `37-drag-ghost.png` (landscape): the ghost follows the pointer at 60 % and the source stays at full opacity.

**Not run after the rebase:** the other interaction sections, `verify`, `verify:motion` and the Web verifier. They wait for the batch regression.

## Freshness guard (`941334b`)

Built on the `freshness` branch; decisions F1 to F10 are in `docs/tracks/freshness.md`. Every run, export and typecheck compares a digest of the real sources with the one recorded when the installed build was made, and refuses a stale build before any window opens, naming the changed files and the command to fix it. `build:native` and `build:web` clean this crate when cargo's mtime check would have kept a stale artifact.

- **Agent's gates:** 15 new unit tests; every refusal shown from the command line, including the restored-mtime case (cargo printed `Finished` with the mutant still in its output, the verifier refused, and `build:native` rebuilt it to the pristine digest); `verify:interaction --only=events` passed in both viewports.
- **Coordinator's check after rebasing onto `2f6d368` (I9):** `pnpm test` 343 passed, `test:types` clean on both profiles, both libraries rebuilt.
- **Not verified end to end:** the Web guard, because no Web build was run. The next Web gate exercises it.
- **After this merge:** each checkout needs one `pnpm build:native`, and `pnpm build:web` where it exports, because older stamps have no digest and are refused once.

## Phase I7: TextInput, TextField, accessibility and world-space typing (`539e787`, D44)

Built on the `text-input` branch, rebased by its own agent onto `6c6abd7` (I9, stock engine, freshness guard, HiDPI for plain text). The full report, decisions T1 to T27 and negative controls are in `docs/tracks/text-input.md`.

- **Agent's gates after that rebase:** `cargo test` 541 passed, Clippy clean, fmt clean, `test:types` clean on both profiles, `pnpm test` 370 passed, `verify:interaction` (ten sections, both viewports), `verify`, `verify:world`, `verify:motion`, stock `verify:interaction --only=forms`, stock `verify:a11y`, and `verify:interaction:web` (1100 assertions, 121 captures). The first landscape interaction attempt failed in the drag section after six window focus losses and passed on its D22 re-run; another agent's windows were running at the time. That failure was not diagnosed further, so the batch regression should watch that section.
- **Real accessibility tree, first reading:** matches stock `LineEdit` and `TextEdit` on role, attributes and settable attributes. One defect found and fixed: each line break in a text area was counted twice (13 characters for 12). Gaps, each shown by the stock control: a text area has no `AXValue`, and read-only is not conveyed.
- **Freshness guard, Web path:** accepted a genuine export end to end, and refused a one-byte source change before any browser opened.
- **Inspected by the coordinator:** `forms-12-text-area-scrolled.png`: fields, bullets, placeholder, caret, multi-line scroll and the JSON readout look right.
- **Not verified:** native IME by hand, VoiceOver by hand, platform focus, and the text actions through the real adapter. Not re-run: stock Web and `verify-world-web` after the rebase; they wait for the batch regression.

**Tooling nuisances to resolve:** running Godot's type generation rewrites the indentation of `demo/src/main.ts` (whitespace only, cause not yet found; it must not be committed), and generates `demo/gen/godot/addons/godot-react-ui/bin/react_ui.build.json.gen.ts` for the freshness stamp, now ignored.

## HiDPI hardening (`5b7faba`, D45)

Reviewed and hardened on the `hidpi` branch, which fast-forwarded onto `944ca90`. Evidence is in `docs/tracks/hidpi.md`.

- **Gates, on that exact commit:** `cargo test` 545 passed, Clippy clean, fmt clean, `test:types` clean on both profiles, `pnpm test` 370 passed, `verify:interaction --only=hidpi,forms,drag`, `verify`, `verify:motion`, `verify:world`, `verify-interaction-web.mjs --only=hidpi` (92 assertions), `verify-world-web.mjs` (96 assertions), and a stock native run of the new section.
- **Negative controls, one window each:** no oversampling fails 17 checks; no redraw hook fails 3, exactly the stale-scale checks; the earlier window-term rule fails `verify:world`.
- **Inspected by the coordinator:** `hidpi-dpr2-lab.png`: text and box edges are crisp at scale 2.
- **Not run on this commit:** the other interaction sections and the rest of the Web suite. They wait for the batch regression.

## Verifier integrity and the full palette (D46)

Built on the `verifier-integrity` branch from an independent review of the tooling; the per-finding report and evidence are in `docs/tracks/verifier-integrity.md`.

- **Agent's gates, on `944ca90`:** `pnpm test` 401 passed, `test:types` clean on both profiles, `pnpm verify`, `verify:interaction --only=selection,forms`, `verify:interaction:web --only=forms` on a port the verifier opened itself, `cargo test` 545 passed. Pasteboard text hashes before and after the native and Web runs matched. `main.ts` reproduced: with `open_scripts` seeded, one headless `--generate-types` converted 254 lines to tabs; with the guard, the file stayed byte-identical.
- **Coordinator's check after rebasing onto `6d470b0` (HiDPI, palette):** `cargo test` 549 passed, Clippy clean, fmt clean, `pnpm test` exit 0, `test:types` clean on both profiles, and `verify:interaction --only=hidpi,selection` passed in both viewports, both marked partial as they should be. The one conflict kept both sides, including wrapping the Web `hidpi` scenario in the new per-section counting.
- **Not verified:** whether headless Chrome reaches the OS pasteboard. A check would write to it, so the Web verifiers swap `navigator.clipboard` and assume it does.

**Palette (`6d470b0`):** all 22 Tailwind v3 colours, generated from tailwindcss 3.4.17's own data; the 55 existing values were checked against it and did not change. `pnpm test` 371 passed.
