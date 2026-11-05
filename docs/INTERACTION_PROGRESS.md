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
