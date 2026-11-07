# Track: two Web interaction verifier failures that were on `main`

Branch `web-fixes`, based on main `748b5ac`. Notes for the coordinator; `docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md` are not edited here.
`docs/tracks/web-load.md` found two sections of `node scripts/verify-interaction-web.mjs` failing on `main` (`transforms` and `navigator`) and showed they were in the
base commit. Neither was diagnosed. Both were wrong checks, not wrong library code; nothing under `native/`, `src/` or `demo/` changed. Three verifier files did.

## `transforms`: "A wheel tick over a vertical list tilted 8 degrees scrolls it about a tick" (top 51.989, tick 17.5)

**Cause: the check's expectation, not the scroll code and not `8721e7b`.** A CDP wheel of 100 CSS pixels is not one tick on the Web.

* Godot's Web display server makes a DOM wheel event into an `InputEventMouseButton` (`WHEEL_UP`/`WHEEL_DOWN`/`WHEEL_LEFT`/`WHEEL_RIGHT`) whose `factor` is
  `delta * 0.03` for pixel deltas (`DisplayServerWeb::_mouse_wheel_callback`, `platform/web/display_server_web.cpp:662-715`, `MOUSE_WHEEL_PIXEL_FACTOR`).
  `wheel_ticks` then multiplies the notch by that factor (`native/pointer_input.rs` `handle_mouse_button` -> `dispatch_wheel` -> `ScrollInput::wheel`).
  So 100 px at DPR 1 is 3.0 ticks (Chrome sends 50 at DPR 2: 1.5 ticks). A native notch is `factor` 1. The native section sends one notch and passes.
  `verify-interaction-web.mjs` already knows this (`notchTicks()`, "measured: `deltaY` 100 and 50"); the transforms section, written later, did not use it.
* The suspect in the brief does not apply. It is not a pan gesture: the Web path sends mouse-wheel button events, `shift_pressed` is false, and the
  `ticks.x == 0.0` condition added in `8721e7b` (`ScrollInput::wheel`, `native/scroll.rs`) is not reached. The numbers also fit the rotation exactly,
  so nothing is wrong in how the ticks map through it.
* Evidence, a throwaway diagnostic in the check (removed; log `artifacts/logs/web-transforms-diag.log`), wheel steps on the tilted list at DPR 1, each step's movement
  read back:

  | `deltaY` (CSS px) | list moved by | in ticks of 17.5 (= 140 / 8) |
  | --- | --- | --- |
  | 33.333 (= exactly 1 tick) | 17.3297 | 0.9903 |
  | 33.333 | 17.3297 | 0.9903 |
  | 100 | 51.9891 | 2.9708 |
  | 200 | 103.9781 | 5.9416 |

  One tick times `cos(8 degrees)` is 17.3297. 51.9891 is 3 times that, to four decimals. The offset is linear in the factor and the rotation maps a screen-down tick to
  `cos(tilt)` along the list's own y, as `docs/tracks/transforms.md` says it does.

**Fix** (`scripts/verify-transforms-web.mjs`): the check expects `notch * tick * cos(8 degrees)` with `notch = 100 / DPR * 0.03`, within 0.25 px, and the
quarter-turned row `notch * 160 / 8` along its own x with `scrollTop === 0`. That is tighter than before (`0 < top <= tick + 1`), not looser: three ticks along the screen
would be 52.5, 0.51 px from the right answer, and the 0.25 px tolerance tells them apart. The check was renamed from "tick" to "notch".

**A second failure was behind it.** Once the scroll check passed, the section failed on `Browser/runtime errors`: the library reports a clip in a turned frame once per element
(`native/transform_state.rs:289`, `:310`), and the lab's `scroll` and `input` cases do it on purpose. The native section announces this
(`GODOT_REACT_EXPECT_ERROR`, `demo/src/verify-transforms.ts`); the Web section never reached the cases, so nobody had noticed it did not. It now announces it the way the filters
section does for its nesting error (`expectedConsoleErrors`: the message and the `at:` line, once per case) and waits until the report has come, so a case that stops
provoking it fails. `verify-interaction-web.mjs` passes `expectedConsoleErrors` to the section.

## `navigator`: "portrait: Escape in the filter clears it"

**Cause: the check, as `web-load` read it.** In the portrait layout the lab list is the `Select` menu, and its `lab-menu-item-*` nodes exist only while the menu is open. After Escape the check
counted them with the menu closed.

* Evidence (a throwaway `console.log` beside the fix, removed; log `artifacts/logs/web-navigator-diag.log`), at all four viewports: after Escape, with no menu open, the items in the tree
  were `[]` in portrait and all 25 ids in the wide layout; with the menu opened they were 25 of 25 in portrait. So the filter was cleared; the check had been looking at nothing.
* The native section does it correctly: `shownLabs` in `demo/src/verify-navigator.ts` opens the menu, reads it, and closes it.

**Fix** (`scripts/verify-navigator-web.mjs`): the same `shownLabs` helper, and the ids are compared in order (`labs.map(id)`), not just counted.

**A second failure was behind it, in the start scenario** (`runNavigatorStartScenario`, which runs after the four viewports and which no earlier run had reached). It opens `/?lab=no-such-lab`; the demo
logs `There is no lab called "no-such-lab" (--lab=)` as a console error on purpose (`demo/src/main.ts:111`), the scenario collected it in an `errors` array shared by every page it opens, and the next
page (`/?lab=world`) refused to start because the array was not empty. Fixed by announcing the error for that one page (`openPage(..., expected)`, once, removed as it appears) and checking it came
(`and the demo logs the unknown id as a console error, once`).

## Negative controls (both die without the fix)

Throwaway mutations of the fixed verifiers, each restored after its run (`artifacts/logs/web-controls.log`):

| Mutation | Result |
| --- | --- |
| Expectation without the cosine (3 ticks along the screen, 52.5) | `A wheel notch over a vertical list tilted 8 degrees scrolls it by its ticks, along its own y: {"top":51.989...,"expectedTop":52.5,"notch":3,"tick":17.5}` |
| The Escape that clears the filter is not pressed | `Escape in the filter clears it: {"cleared":["glass"], "expected":[25 ids]}` |

The checks before the fix are their own control: each failed in the log of the unmodified `main` (`artifacts/logs/web-transforms-before.log`, `artifacts/logs/web-navigator-before.log`).

## What was run

All through `.gate/gate`, in this worktree, on the debug export rebuilt from this tree (`node scripts/build-web.mjs --export-only`; the installed side module was already fresh for the tree).

| Command | Result |
| --- | --- |
| `node scripts/verify-interaction-web.mjs --only=transforms` on `748b5ac` | FAILED: `top` 51.989070892333984, `tick` 17.5 (landscape) |
| `node scripts/verify-interaction-web.mjs --only=navigator` on `748b5ac` | FAILED: `portrait: Escape in the filter clears it` |
| the same two with the fixes | `GODOT_REACT_WEB_INTERACTION_VERIFY_PASSED`: transforms 252 checks (264 assertions, 56 captures), navigator 1833 checks (1845 assertions, 118 captures); both over landscape, portrait, retina-landscape, retina-portrait, and (navigator) the start scenario |
| `node scripts/verify.mjs --interaction --only=transforms,navigator` (Breaka's engine) | PASSED, landscape (navigator 7232, transforms 5355) and portrait (6592, 3569) |
| `node scripts/verify.mjs --engine=stock --interaction --only=transforms,navigator` | PASSED, landscape (7232, 5337) and portrait; see the live-compile note below |
| `pnpm test` | 723 passed, 0 failed |
| `node scripts/verify-interaction-web.mjs` (whole, debug export, final tree) | `GODOT_REACT_WEB_INTERACTION_VERIFY_PASSED`, `partial: false`, 17 sections, four viewports, 4,558 assertions, 510 captures (navigator 1833, transforms 252; `artifacts/logs/web-interaction-full.log`) |
| `pnpm test:types` | ran as the first step of both native verify runs: passed |
| `cargo test`, `cargo clippy`, `cargo fmt --check` | not run: nothing under `native/`, `src/` or `demo/` changed |

## Environment finding: a stock native run needs a stock live-compile build

The live-compile addon (`demo/addons/live-compile`, generated and gitignored) is installed built for Breaka's Godot 4.8 API. Stock 4.7.2 loads it at project start and godot-rust panics
(`godot-rust compiled against newer Godot version: v4.8.beta.custom_build but loaded by older Godot binary`), which logs `ERROR:` lines. `native-run.mjs` counts an unannounced `ERROR:` as a failed
run, so **every** stock native run in a tree whose installed live-compile library is Breaka's fails with "emitted a runtime error before completion", whatever the section. The sections themselves passed
in that run (`GODOT_REACT_INTERACTION_VERIFY_PASSED` for both). There is no stock build of it here (`live-compile/target-stock` does not exist in `main` or any worktree); it would be
`node scripts/build-live-compile.mjs --engine=stock`, a build of Bun's compiler that I did not run.

To get a clean stock result I moved `demo/addons/live-compile` aside, removed its line from `demo/.godot/extension_list.cfg` (both ignored, generated), ran stock, and put both back (the script is
`scratchpad/stock-run.sh`, backup of the addon and of the list were taken first). Afterwards the Breaka native library was rebuilt and installed again. **The coordinator's stock runs will hit this unless
a stock live-compile library is built or the same workaround is used.**

## Not verified, limits

* The brief placed the Shift+scroll code at `native/scroll_input.rs:112-129`; the wheel mapping is in `native/pointer_input.rs` (`dispatch_wheel`) and `native/scroll.rs` (`ScrollInput::wheel`). Nothing there was wrong.
* The Web factor 0.03 is from the engine source at `/Users/ben/Development/godot-4.8-restoration-20261027/source/platform/web/display_server_web.cpp`, which I did not prove is exactly the source of the template this export uses; the measured numbers (above) and the existing `notchTicks()` measurement agree with it.
* DPR 2 (notch 1.5) is covered by the passing retina viewports of the fixed sections, not by a separate diagnostic.
* The `live_compile` stock build was not made (above).
* I did not edit `docs/tracks/web-load.md`, which still says both sections fail on `main` and "Not investigated". The coordinator should replace that paragraph with a pointer here.

## README text

> The Web interaction verifier (`node scripts/verify-interaction-web.mjs`) sends Chrome wheel events, and Godot's Web display server makes a pixel delta of `d` into `0.03 * d` wheel ticks, so a 100 px notch is 3 ticks at
> device pixel ratio 1 and 1.5 at 2 (a native notch is one). A check that scrolls must expect that (`notchTicks()`). Console errors a section provokes on purpose are announced with
> `expectedConsoleErrors` and must appear. The portrait navigator keeps its labs in a menu whose items exist only while it is open.
