# Track: two Web failures in the full regression on `main` 99ba6f0

Branch `regression-fixes`, based on main `99ba6f0`. Notes for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here.
The full regression on `99ba6f0` had two Web failures, both from the default profile's debug export in headless Chrome; every other Web verifier passed (`verify-web.mjs`,
`verify-world-web.mjs`). Neither is in the Rust, in `native/` or in the library: the first is a demo lab computing a negative width, the second a Web check that spends more wall-clock
time than the transition it reads lasts. Nothing under `native/` or `src/` changed; one demo data file, one demo API method and two verifier files did, plus a unit test.

## 1. `verify-interaction-web.mjs`: `Native UI commit rejected: node 2088: style.layers[0]: width: dimension must be a finite nonnegative number`

### What node 2088 is, and what the number was

* **Node 2088 is `glass-card-0`, the first card of the frosted glass lab.** Tags are allocated per root in creation order (`src/renderer.ts` `nextTag`), so the same sections in the same order
  give the same tags. Proof that this holds here: the failing run logged `node 2047 has a backdrop-filter inside node 2048` (the filters section's deliberate nesting case), and every passing
  run logs the same two numbers. A tag map printed by a throwaway diagnostic at the end of the glass lab's mount (landscape, 1120 wide; the diagnostic is removed) reads
  `2060 glass-blob-0 ... 2082 view, 2083 view(w=40), 2084 glass-card-title-0, 2085 glass-card-body-0, 2086 text, 2087 glass-card-button-0, 2088 glass-card-0 (width 352), 2089 ...`.
  The identical map came out of the retina landscape pass; the portrait passes agree with each other (the glass lab's tags there start lower, 2030 to 2098).
* **Its width is `glassLayout(rootWidth).cardWidth`** (`demo/src/glass-data.ts`), passed as `style={{ width }}` and merged into `layers[0]` with the class layer (consecutive layers with the same
  minWidth and states merge, `compileStyle`). It was `Math.floor((width - 2 * PAGE_PADDING - (columns - 1) * CARD_GAP) / columns)` with `PAGE_PADDING` 16: **negative when the root is narrower than 32 px**
  (one column, `width < 32`). A JS `NaN` or `Infinity` would have been `null` in the JSON and a reset, not this error; a negative finite number is what `Dimension::value` (`native/props.rs`) refuses.
* **Which commit failed.** `failure.png` of the failing run shows the navigator fully mounted, and `root.render` throws a recorded failure to its caller (`checkFailure`), so the error was not
  in the `showNavigator` call: it came from `dispatchEvents` in the native context (the stack ends in `flushSyncWork`), i.e. from a flush after an event. The stack frame
  `replaceContainerChildren (main.js:13677:5)` is indented four spaces, inside `if (container.kind === 'layer')`: the **main layer's** commit, not the overlay's. That is the glass lab's re-render on
  the sheet's Cancel click (`setSheetOpen(false)`): the sheet's removal is the overlay layer's own commit, which succeeded, which is why `glass: Cancel closes the sheet` passed. The page's error
  reached the verifier only at the navigator's first `waitUntil` because the console message arrives after the click's own `checkBrowserErrors`.

### The decision: the lab sent an invalid value; native is right to refuse it

CSS has no negative width: a literal one is invalid and the declaration is dropped, and `calc()` clamps its result at zero. Native refusing it (`Dimension::value`: finite and nonnegative) is the contract, so
the fix is on the JS side, where the number is computed. Nothing in the library computes it: `useRootSize` hands out the root's size as it is. `glassLayout` now says a card in a root that cannot hold the page's
padding is zero wide (`Math.max(0, ...)`), with the CSS reason in a comment. Only the glass lab uses a root's width in arithmetic that can go negative (`filters-lab`'s `Stripes` is `floor(width / 8)`).

### Reproduced on demand, with the same error and the same frames

The glass section of the Web verifier now narrows the root to 20 px (`demo('resizeSurface', 20, height)`: the owner's own way of resizing the root, which `_process` leaves as set), waits for the cards to be zero
wide, and restores it. Without the fix (log `artifacts/logs/control-glass-without-fix.log`, a glass-only run, node 89 in that run's tags):

```
Native UI commit rejected: node 89: style.layers[0]: width: dimension must be a finite nonnegative number
    at commitPayload (.../main.js:13237:27)
    at commitLayer (.../main.js:13643:50)
    at replaceContainerChildren (.../main.js:13677:5)
    at commitMutationEffectsOnFiber (.../main.js:6234:19)  ...  flushSyncWorkAcrossRoots_impl (.../main.js:1697:151)
```

The positions are the regression's, character for character. With the fix the same run passes (`glass` 76 checks, up from 72: one new check per viewport). A unit test (`tests/glass-layout.test.ts`) renders the lab
against the recording host while the root goes 1120, 600, 200, 31, 20, 0, 600, 1120 and asserts no length in any committed style is negative or not finite; without the fix it fails with
`node 29 (glass-card-0) has width -1 in a 31 px root`.

### What is not proven: why the root was narrower than 32 px at that moment

The defect that failed the run is proven and fixed. **I did not find what made the root narrow in the regression run, and I could not make it happen again.** Tried, all passing: the whole Web interaction run twice with
logging of every root and viewport size change (`root size` in `syncRootSize`, `demo viewport` in `_process`; removed); `glass,navigator` in all four viewports; `hidpi,filters,glass,navigator` with Chrome's CPU slowed
four times. In those runs the size logging shows no change of the root's size inside a pass: it changes only where the verifier calls `page.setViewport` between passes. The failing run was concurrent with
the native regression (load average above 20), so it is a rare transient of the harness under load. The clamp means such a transient no longer fails a run, and it also hides that it happened; if a
run ever logs a card at zero width with a root of the right size, the places to look are `Demo._process` (`getVisibleRect()` against `this.width`) and Chrome's canvas resize under load.
Whether the native lane can hit it: the same lab runs there with the same arithmetic, so it could if its root were that narrow; the native interaction run in the regression was killed at its
300 s deadline during the glass section (`INTERACTION_DEADLINE_MS`, being handled in the main checkout), so it says nothing either way. The glass lab, its data and its Web check are unchanged by the batch
(`git log 9697dd6..99ba6f0` on them is empty): the defect was latent and a rare transient found it.

## 2. `verify-motion-web.mjs`: `Font change after height completion: unrelated paint is still in flight: {"animating":false,"opacity":0.44999998807907104}`

### A wall-clock race in the check, not a motion regression

A throwaway timeline in the check (removed), read from the paint toggle's click returning, on the export of `99ba6f0` with a load average of about 9:

| step | time | swatch opacity | `animating` |
| --- | --- | --- | --- |
| height restored to auto (`until` returns) | +11 ms | | |
| `Height completion` observation | +28 ms | 0.9925 | true |
| `Copy change` click returns | +301 ms | | |
| `Copy change` observation | +311 ms | 0.6775 | true |
| `Font change` click returns | +617 ms | | |
| `Font change` observation | +627 ms | **0.45** | **false** |

The paint transition (`opacity` and `backgroundColor`, `MOTION_DURATION_MS` 600, `ease-in-out`) behaved as specified: almost at its start value at +28 ms, about a third of the way down at +311 ms (a transition that began
shortly before the click returned), and at its target 0.45 (0.44999998807907104 is that target as a 32-bit float) once its 600 ms were over. `animating` was false because nothing was animating any more. Nothing was cancelled, settled early
or reset. The check made three observations across two clicks, each click costing 273 to 306 ms here (three position reads, three pairs of painted frames, a dozen round trips), against a transition 600 ms long: it passes only
while a click takes under about 285 ms, which a quiet machine does and a busy one does not. It failed in the regression run, when the machine was busy with the native regression and two other tracks (load average 13 to 20 when I looked
minutes later).

It is not from this batch: `git log 9697dd6..99ba6f0` shows no change to `scripts/verify-motion-web.mjs`, `demo/src/motion-lab.tsx`, `demo/src/verify-motion.ts` or `native/transition.rs`; the batch's `native/motion.rs` changes (text spans: the paragraph is taken
again when a span's colour or decoration changes, the `has_text` test, boxed paragraph context) and its `native/lib.rs` changes (box meshes, spans, rustfmt) do not touch the transition clock or what finishes a transition; native `verify.mjs --motion`,
which has one click between the paint start and its observation, passed in the regression (`breaka-motion` exit 0 in 42 s). I did not bisect builds: the timeline shows a transition that was right and a check that was slow.

### The fix: the check holds the engine's clock where it must not move

Sleeps and retries are out, and a longer paint would only move the cliff. The motion clock is the engine's (`tick_motion(delta)`, `native/lib.rs`), and `Engine.timeScale` scales that `delta`. The demo gets one method,
`setTimeScale(scale)` (`demo/src/main.ts`, next to `resizeSurface`); the check (`scripts/verify-motion-web.mjs`, `runMotion`, the independent-owners scenario) does this:

1. the clock at a quarter (`SLOWED_TIME_SCALE`) from the open click until the height passes 70 % (the overlap trigger);
2. held (0) before the paint is toggled, so the paint starts where the height is however long the click takes; the trace starts here;
3. at a quarter again until the height is restored to auto with the paint still intermediate;
4. held while the three stages observe and click; the capture is taken held; then the clock goes back to 1 and `settled()` runs as before.

The paint is in flight at each stage because nothing moves it, and the stages' own assertions are unchanged (the height stays auto, follows the new content, creates no height transition). Frames still run while the clock is held, so
`animating` stays true and layout and measurement still happen each frame.

Two things found on the way: every frame, held or not, adds native profile samples, and the profile keeps 512 (`PROFILE_CAPACITY`, `native/profile.rs`), which the trace's check refuses to overflow (`dropped: 409` with the clock at a tenth and
the trace started before the opening; now the trace starts after the overlap and the slowdown is a quarter); and `Engine.timeScale` does not touch the browser's own timers, which the check's polls use.

### Negative control: the original check fails under slowdown, the fixed one passes

`--stage-cpu-throttle=<rate>` (new; Chrome's `Emulation.setCPUThrottlingRate`) slows the page only while the independent-owners scenario reads its transitions. Slowing the whole run does not isolate it: the rest of the verifier waits on
the wall clock after each click with little margin, and at 1.5 and 2 times slower both the original and the fixed file died earlier (`Timed out waiting for opening visual mid-flight height`, `Timed out waiting for native transition to begin`).
With the slowdown on the stage alone (the original from `HEAD`, patched only to throttle over the same span):

| check | slowdown | result |
| --- | --- | --- |
| original | 2 times | FAILED `motion-dpr1: Copy change after height completion: unrelated paint is still in flight: {"animating":false,"opacity":0.44999998807907104}` |
| original | 3 times | FAILED, the same message |
| fixed | 2 times | `GODOT_REACT_MOTION_VERIFY_PASSED` (433 assertions, both device pixel ratios) |
| fixed | 3 times | `GODOT_REACT_MOTION_VERIFY_PASSED` (433 assertions) |

## What was run (all on the final tree, default engine, debug Web export built from it)

| command | result |
| --- | --- |
| `node scripts/verify-interaction-web.mjs` (whole, no `--only`) | `GODOT_REACT_WEB_INTERACTION_VERIFY_PASSED`, 20 sections, 5042 assertions, 578 captures (glass 76, navigator 1973) |
| `node scripts/verify-motion-web.mjs` | `GODOT_REACT_MOTION_VERIFY_PASSED`, 433 assertions, 26 captures, 30 benchmarks |
| `pnpm test` | 892 passed, 0 failed (two new: `tests/glass-layout.test.ts`) |
| `pnpm test:types` | passed |
| `node scripts/verify.mjs --interaction --only=glass` (default engine) | PASSED, landscape and portrait (the lab's data and `main.ts` are shared with the native demo) |
| `node scripts/verify.mjs --motion` (default engine) | PASSED, landscape and portrait |

Before the fixes, on the unfixed export: the whole Web interaction run passed twice, `glass,navigator` and `events..glass` once each (the first failure was not reproducible by repetition), and `verify-motion-web.mjs` failed the same way on the
first run with the timeline logging in.

## Not verified, limits

* **The trigger of the narrow root** (above) is not found. The glass lab no longer fails on one, and nothing else in the demo computes a width from the root that can go negative.
* **Rust unchanged**, so `cargo test`, clippy and fmt were not run, and nothing was run on the stock engine or on Mobile and Forward+. Only the default engine's native glass and motion sections were run.
* The motion check's clock is held during the three stages: they verify behaviour at a fixed time in the transitions' timelines, and the completion of the paint and of the height is still verified by the sections around them. The rest of
  `verify-motion-web.mjs` still waits on the wall clock after each click and has little margin on a slow machine (it fails at 1.5 times slower); it was not changed, and a failure there is a different failure.
* `Engine.timeScale` is an engine-wide setting; the Web verifiers use a page of their own, so nothing else sees it, and the check puts it back to 1 before the stage's `settled()`.
* The error `Native UI commit rejected: node 2088` names a tag nobody can place; a testID in that message would have saved most of this investigation. Not done here.

## README text

The Web motion verifier reads transitions that are still in flight with the engine's clock under its control: `demo/src/main.ts` exposes `setTimeScale`, which scales the `delta` the native motion clock advances by,
and the independent-owners scenario slows the clock while it sets the overlap up and holds it while it reads, so the result does not depend on how long the browser's steps take.
`node scripts/verify-motion-web.mjs --stage-cpu-throttle=3` runs that scenario with Chrome's CPU slowed three times. A lab that lays itself out from `useRootSize` must clamp a length at zero, as CSS does: native refuses a negative width.
