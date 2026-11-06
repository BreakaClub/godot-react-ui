# Track: stock engine (engine profiles, and the accessibility tree read for real)

Branch `stock-engine`, rebased onto main `d417bb5` (Phase I5 and scroll accessibility, S13; first built on `cab7d0f`). Notes and report for the coordinator; `docs/INTERACTION_PLAN.md` and
`docs/INTERACTION_PROGRESS.md` are not edited here. Two jobs: make `godot-react-ui` build and test against a stock
Godot 4.7.2 with upstream GodotJS as well as Breaka's custom 4.8 (which stays the default), and use the stock engine,
which has the AccessKit driver Breaka's installed engine lacks, to read the real macOS accessibility tree and finish
Phase I10's one unverified piece (`docs/tracks/accessibility.md`, "To finish the verification").

**Headline: the platform tree is readable and `pnpm verify:a11y --engine=stock` passes against it.** The first real run
failed, for a reason nobody could have seen without an adapter: the verifier's input isolation made the window
unfocusable, and with that the platform tree is the window and nothing under it. The lab keeps the isolation's input
filter and drops the two window flags (S8). The hand-written expectations then met the real adapter and were right
about everything except two things the engine cannot convey (S9); after I5 landed the same run reads the scroll view too (S14). Which engine verified it: stock Godot 4.7.2
(`4.7.2.stable.custom_build.ed1daf0bf`), GodotJS upstream `main` plus PR #196, AccessKit 0.22.3, macOS 26.3, Apple M1 Max.

## How the profiles work

One selector for every script, resolved by `scripts/engine.mjs`:

```sh
pnpm verify                         # breaka (default)
pnpm verify --engine=stock          # stock Godot 4.7.2 + upstream GodotJS
GODOT_REACT_ENGINE=stock pnpm verify
```

The flag wins over the variable; an unknown name or two different flags is an error. The resolved name is exported as
`GODOT_REACT_ENGINE`, so the scripts a script starts (`pnpm build`, the editor import) agree. `GODOT` still overrides the
profile's binary, and the binary's `godot --version` must start with the profile's (`4.8.` / `4.7.`), checked before
anything runs.

| | `breaka` (default) | `stock` |
| --- | --- | --- |
| Godot | `/Applications/Godot48.app/Contents/MacOS/Godot` | `/Users/ben/Development/godot-stock/bin/godot-stock` |
| Rust API dumps | `native/api` (via `.cargo/config.toml`) | `native/api/stock-4.7.2` (environment of the cargo child) |
| Native target dir | `target/` (`target/probe`) | `target/stock` (`target/stock-probe`) |
| Web target dir | `target/web` (`target/web-probe`) | `target/stock-web` (`target/stock-web-probe`) |
| Evidence | `artifacts/<name>` | `artifacts/stock/<name>` |
| GodotJS typings | tracked `demo/typings`, `demo/gen` | generated, untracked `target/stock/typings` |
| Typecheck | `tsconfig.json` | `tsconfig.stock.json` |
| Web export preset | `Web` | `Web (stock)` |
| Web SDK, templates | Emscripten 6.0.12 + Binaryen 133, the lean 3D lazy-table templates | Emscripten 4.0.11, the stock `web_dlink_*` templates |

Scripts: `build-native`, `build-web`, `generate-types`, `dev`, `run`, `serve-web`, `probe-web`, every `verify*` and
`test:types` take the selector. `scripts/engine.mjs` is the one place that knows the paths.

The extension and the Web side module are installed where the one checked-in `react_ui.gdextension` expects them
(`demo/addons/godot-react-ui/bin/`), and the installing build writes `react_ui.build.json` / `react_ui.web.build.json`
beside them: which profile built it, whether it is a probe build, and its SHA-256. Every native verifier and `run`
refuses a library that is not its profile's (and not a probe build unless it wants one), and the Web export refuses a
side module built for the other profile. So switching profiles is `pnpm build:native --engine=<name>`, and the last
build installed wins; finish with the default (`pnpm build:native`).

## Decisions

S1. **A flag and a variable, defaulting to `breaka`, with the profile in one module.** Evidence: eight scripts hard-coded
`/Applications/Godot48.app`, and `build-web.mjs` hard-coded Breaka's Emscripten SDK, Binaryen, helper module and the first
`custom_template/` line of the presets file. A profile object (binary, version prefix, dump directory, target and artifact
directories, Web SDK and capabilities) read through `selectEngine()` keeps each script to a line or two and is unit tested
(`tests/engine.test.ts`). Not chosen: `GODOT` alone (it cannot select the dumps, the target directory or the SDK).

S2. **Separate target directories and evidence, one install path.** Cargo's fingerprints include the dump the bindings
were generated from, so two profiles sharing `target/` would rebuild everything on every switch (the stock build is
3 min 5 s from an empty target directory, the crates already downloaded). The install path cannot be split: `react_ui.gdextension` names
one, and the project is the one thing both engines load. The stamp (S3) is what makes sharing it safe.

S3. **The installed library records its profile and hash, and runs refuse the other's.** Evidence: before this change the
only thing keeping Breaka's 4.8 library out of the stock editor was the manifest's `compatibility_minimum = "4.8"`
(BUILD_NOTES: `GDExtension only compatible with Godot version 4.8.0 or later`). S4 lowers that, so the guard has to live
somewhere else; a library bound to the other engine's API would load and fail late or wrongly. The check costs one JSON read
and says "run `pnpm build:native --engine=stock`".

S4. **`react_ui.gdextension` says `compatibility_minimum = "4.7"` for both profiles.** Verified, not assumed: BUILD_NOTES'
text search found no 4.8-only API in `native/**/*.rs`; the library compiled unchanged against the 4.7.2 dump (3 min 5 s, no
error) and loads in the stock editor (`Initialize godot-rust (API v4.7.2.stable.custom_build ...)`), and the breaka build
is unchanged except for this line and loads in 4.8 (gate results below). The alternative, a manifest generated per
profile, would add a tracked file that must be kept in step, for a guard (a library newer than the engine) that the stamp
already provides and gdext's own API-version check backs up.

S5. **Typings are per profile; the tracked ones stay Breaka's.** `demo/typings` and `demo/gen` come from Breaka's GodotJS
and are what `pnpm test:types` checks by default. The stock editor writes different ones, so committing them would break the
default profile, and committing both would be about 12 MB of generated text (5.9 MB each) for files nobody edits. What differs (diff of a stock generation against the tracked set):
`jsb.release`, `GodotJS.setScriptHotReload` and `replaceModuleSource` exist only in Breaka's GodotJS (the project uses none of
them); 1,101 classes are declared against 1,067: 35 are Breaka's engine's alone (`GodotJSObjectDBSnapshot`, `Line3D`, `Trail3D`,
the `Physics*Result*` classes, ...) and `TextServerFallback` is the only one stock has alone; the scene wrappers in
`gen/` map `res://src/main.ts` to `Script` in stock and to `Main` in Breaka's; the stock `godot.annotations` declares a
syntactically invalid `export function export(...)` (a reserved word), after which `tsc` reports two syntax errors and skips
every semantic diagnostic; and the stock files use CRLF line endings. So `stock`:
`generate-types` (and the first `test:types`) copies `demo/` to `target/stock/typings-project` without the tracked typings,
`gen/` and the installed library, puts the stock library where the `.gdextension` names it, runs the stock editor's
`--generate-types` there, keeps `typings/` as `target/stock/typings` with the invalid declaration removed
(`scripts/typings.mjs`, tested for both line endings), and records the editor version and the library and dump hashes so a
change regenerates it. `tsconfig.stock.json` compiles `src`, `demo/src`, `tests` and those typings. The project type-checks
against both sets with no change to its sources, which is the evidence that it uses only API both GodotJS builds declare.

S6. **Stock Web mode is a profile, not a fork of the script** (`scripts/build-web.mjs`). Emscripten 4.0.11 from the stock
tree (`EMSDK_ROOT`), the stock `web_dlink_{debug,release}.zip` templates named by the `Web (stock)` preset (parsed per
preset now, because the old regex read the first `custom_template/` line of the file), the stock editor as exporter, the
godot-rust flags unchanged. Dropped for stock, as BUILD_NOTES lists: the Binaryen override, the engine's helper module
and manifest hash, `-sLAZY_FUNCTION_TABLE=side`, and the `breaka.lazy-table` metadata checks (the stock modules have no such
section). The receipt records the profile, the exporter's version, the template hash and the Emscripten version instead.

S7. **The accessibility tree is read from the stock engine, by the existing verifier, unchanged in method.** The stock editor
was built with AccessKit (`AccessibilityServer.is_supported()` is true in a window, false under `--headless`), the
Godot-side half of `verify:a11y` ran as before, and `scripts/ax-dump.swift` (read only: `AXUIElementCopyAttributeValue`, no
action, no input) read the lab's own process.

S8. **The a11y lab no longer makes its window unfocusable.** The first real run (`pnpm verify:a11y --engine=stock`, no
interference in its log) failed: the platform tree was the window, its title bar and one empty `AXGroup`, before and
after, for the 30 s the verifier polls. The adapter was active (the engine logs `adapter activated` before `_ready`) and
`SceneTree::_flush_accessibility_changes` was running, so the question was what in this run differed from a run that works.
Evidence, each a single window read twice with the same tool (diagnostic windows, not verifier runs; the tool and the lab
unchanged):

| Run | What differs | Platform tree under the window |
| --- | --- | --- |
| The verifier (`--verify-a11y`) | isolation: `unfocusable` and `mousePassthrough` set in `_ready` | empty `AXGroup`; window subrole `AXDialog` |
| The lab alone (`res://a11y.tscn`, no arguments) | none | 23 nodes: every element, names, values, frames; window `AXStandardWindow` |
| The lab with `-- --probe` (isolation, no verification) | isolation only | empty `AXGroup`; window `AXDialog`, identical to the verifier's |
| Bare Controls, the two flags set in `_initialize` | the flags, on a window with no extension | all Controls present; window `AXStandardWindow` |

So the isolation, not the extension, the timing of the first read, or the tool, empties the tree. Which of the two flags
does it, and why a bare window with both set early keeps its tree, was not pursued (the window's subrole changes to
`AXDialog` in the failing runs, which suggests the window-class state AppKit reads when the flags are set after the window
is up; that is a guess). The engine source shows both flags only set bits in `WindowData` (`display_server_macos.mm:2571`,
`:2585`; `process_events` applies `setIgnoresMouseEvents` from `mpass`), and `GodotWindow.canBecomeKeyWindow` returns
`!no_focus`, so nothing there touches the accessibility adapter. The decision does not depend on it: `VerifierInputIsolation.begin(window,
{ restrictWindow: false })` keeps the device filter (`rejects`), the disturbance reports and unaccumulated input, and does
not set the two flags; only `a11y-main.ts` passes it. A foreign key or mouse event still cannot change the lab's state (it is
dropped by device in `_input`, as in every verifier), and a foreign focus change is reported and re-runs a failed run
(plan D21, D22). What is lost is only the guarantee that the window never takes key status or mouse events.

S9. **The hand-written expectations met the real adapter and were right except for two things the engine cannot convey.**
`scripts/a11y-expectations.mjs` now names them (`engineGap`) and reports them as notes (`GODOT_REACT_A11Y_GAP`), once each,
instead of failing a check no native change can satisfy:

- **The group "Size".** Expected: an `AXGroup` or `AXRadioGroup` named "Size". Real: no such element; the three radio buttons
  are in the tree, under the window's content group, in order. Cause: the engine's `AccessibilityRole` has no group and no
  radio group (`servers/display/accessibility_server_enums.h`), only `ROLE_CONTAINER`, which maps to AccessKit's generic
  container, and AccessKit leaves a generic container out of the platform tree (its children move up to the nearest element that is
  in it; the one container shown is the focused one). Native maps `group` and `radiogroup` to that container
  (`native/accessibility_model.rs`), which is the best the engine offers. A bare `Panel` (`ROLE_PANEL`) with an accessibility name
  does appear with its title, but as `AXUnknown`, not `AXGroup` (control window, same tool), so remapping groups to `PANEL`
  would keep the name and lose the role; not done. For Breaka's engine work: map two roles to AccessKit's `Group` and
  `RadioGroup`.
- **The mixed checkbox.** Expected: AXValue 2 or a state description saying "mixed". Real: `AXValue` false (0), no description,
  help or any other attribute the tool reads mentions it. Cause: `update_set_checked` takes a bool
  (`accessibility_server_accesskit.cpp:1247-1257` sets AccessKit's toggled to true or false, never mixed), and the state
  description native sets with it (decision 5 of `docs/tracks/accessibility.md`) reaches no attribute the Accessibility API
  exposes on macOS. The check now passes a conveyed mixed (AXValue 2 or a description), notes an unchecked reading, and still
  fails a mixed checkbox that reads as checked.

Everything else matched on first contact: roles (`AXButton`, `AXStaticText`, `AXCheckBox`, `AXRadioButton`, `AXSlider`; the
switch is an `AXCheckBox` with subrole `AXSwitch`), names in `AXTitle` (the static texts carry theirs in `AXValue`), toggle
values as booleans (`AXValue` true/false, read by `numeric`), the radio values, `AXEnabled` false on the disabled button, the
slider's value and `AXMinValue`/`AXMaxValue` 0 and 100 and horizontal orientation, the values after the Godot-side input
(Subscribe unchecked, Sound on, Large selected, Volume 80, "Saved 1 times"), the hidden subtree absent, and the geometry:
one scale and offset fit all ten elements at 0.500 points per pixel with a residual of 0.000 points in both phases.
`tests/fixtures/ax-lab/` holds the recorded "after" tree and the snapshot geometry, and `tests/a11y-expectations.test.ts`
judges them, so the expectations are now tested against a real adapter reading as well as hand-written ones.

**Not verified, still:** platform focus. The window was not the key window in any run (`AXWindow.focused` false throughout,
also without isolation, when started from an agent shell), so `checkFocus` skipped as designed. Native's choice of focused
element is still unchecked against a real adapter, and VoiceOver by hand is still not done (`docs/tracks/accessibility.md`,
"To finish the verification", step 4). The platform's own `focusedElement` was the first element under the content group in
every window (`SceneLauncher`, an autoload `Node`, in the lab); with no Godot `Control` focused the engine's focus is the window's
and AccessKit reports the first exposed element; a person using the lab would see the focus move to the Volume slider only once
the window is key.

S10. **The stock debug Web template aborted in every pthread worker. The cause was a build-flag combination, and relinking the template without the closure compiler fixes it.**
The first `verify:web --engine=stock` against a stock debug export failed in under a second with `TypeError: A is not a
function` at `index.js:41:246`, eight times, and the engine stuck on `loading-workers`. A minimal project (one `Label`, no extension,
no React) exported by the same stock editor with the same preset failed identically in the same Chrome 156 (`Chrome/156.0.8078.80`),
so it was the template, not this project; the same project exported with `template_release` started. Diagnosis, from the abort
itself, in one page load of a scratch copy of the minimal debug export (`index.js` edited to print the abort text and to
record the stack of every module load in a worker; the template zip untouched, sha256 `aee48977...`):

- **The exact message**, in each of `em-pthread-1` to `em-pthread-8`: `Aborted(Assertion failed: module should only be loaded once on
  each pthread worker)`. It is thrown as a `TypeError` because `abort()` calls the module's `err` helper, which the factory has not
  defined yet at its first statement.
- **It is not a second load.** Each worker recorded exactly one load, the `isPthread&&Godot()` call at `index.js:4659:274`, whose
  first statement is the assertion (`index.js:1:470`). `globalThis.v` was already truthy before the module's first run.
- **What defines `v`.** `index.js` is two Closure outputs in one file. The Emscripten module (compiled by `emcc --closure 1`) is
  wrapped in a function; its flag `globalThis.moduleLoaded` was minified to `globalThis.v`. After it, from line 4661, comes Godot's
  engine loader (`Engine`, `Features`, `Preloader`), compiled by Godot's own Closure step (`run_closure_compiler`), **not wrapped**:
  it starts `function t(){...}function u(){...}function v(){return!0===window.isSecureContext}...`. A worker runs the file as a
  classic script, so those top-level declarations are hoisted onto `globalThis` before any statement runs. Evaluating just that
  part in an empty VM context lists the globals `t u v w x y z A B`, with `v` = `function v(){return!0===window.isSecureContext}`,
  so `!globalThis.v` is false. The two Closure runs are independent, so their short names collide.
- **Why only the debug template.** A debug target turns Emscripten runtime assertions on (`platform/web/detect.py:147-149`), so the
  collision aborts. In `template_release` the assertion is compiled out; the later `globalThis.v=!0` only overwrites the loader's
  `isSecureContext` helper, which a worker never calls, so release starts. Upstream's CI builds only `template_release` with
  `use_closure_compiler=yes` (`.github/workflows/web_builds.yml`); the debug-plus-closure combination BUILD_NOTES used is one it never
  exercises. Without the closure compiler (the option's default) the loader is plain code with readable names and the flag keeps
  its own.

Fix, under `/Users/ben/Development/godot-stock/` only, nothing of Breaka's touched: 87 GiB were free on the data volume (the bar
was 40); `scons platform=web target=template_debug threads=yes dlink_enabled=yes use_closure_compiler=no debug_symbols=no
skip_js_runtime=yes -j4`, at `nice -n 10`, from the stock tree's environment, after a dry run (`-n`) that listed two link steps and
no compile step. Only the link changed: 81 s, the 2,173 existing objects reused, `godot.wasm` and `godot.side.wasm` unchanged in
size. The old zip is kept as `backups/web_dlink_debug-4.7.2-closure-yes-aborts-in-workers.zip`; the new `web_dlink_debug.zip` has sha256
`fda0803989de792a1b4698750a0cc3ae1c5ef73cb303ae46eca4ef5ed666a926` and an unminified 4.2 MB `godot.js`. `web_dlink_release.zip` is
unchanged. `BUILD_NOTES.md` there records it. Checked: the minimal project exported with the new template starts (`Godot Engine
v4.7.2.stable.custom_build.ed1daf0bf`, `Initialized GodotJS bridge`, `Build configuration: Emscripten 4.0.11, multi-threaded,
GDExtension support.`), and `verify:web --engine=stock` against the full **debug** export passes (253 assertions, 53 captures, no page errors;
a first attempt failed on `Invalid native node.scroll`, which was my stale Web side module from before the rebase, rebuilt before the second).
`debug` and `--release` both work for the stock profile; `engine.webMode()` is a plain parser again.

S11. **Stock 4.7.2's Web input cannot report a cancelled touch, and the Web interaction verifier says so.** With the release
export serving, `verify:interaction:web` passed 608 assertions and then failed its last touch check: a `touchCancel` sent
through CDP produced no `pointercancel`; the pad saw `pointerdown`, `pointerup`, `pointerleave` and `click`. Cause: stock's
`library_godot_input.js:601-602` gives `touchend` and `touchcancel` the same callback type (1), and
`DisplayServerWeb::_touch_callback` turns it into `InputEventScreenTouch` with `pressed = false`. Breaka's engine gives
`touchcancel` its own type (3) and `ev->set_canceled(p_type == 3)` (`/Users/ben/Development/godot/platform/web/display_server_web.cpp:772`,
`library_godot_input.js:602`), which is what native's `pointercancel` is built on. Nothing in this repository can tell the two
apart, so it is an engine difference, and the stock engine cannot be patched here. The check is now the profile's
`reportsCancelledTouch` capability: where it is true (Breaka's) nothing changes; where it is false the verifier records the gap
(`GODOT_REACT_WEB_GAP`, in the report and the pass line, with the pad lines it observed), checks the finger is released, and
carries on. A real consequence for any product that ships on stock Godot: a browser that cancels a touch (a system gesture,
a call, a palm) ends the press as a tap and fires a click. That is the engine's behaviour and the reason Breaka carries the patch.

S12. **A text-layout probe assertion compared floats exactly.** `verify:text-layout` on stock failed one of 619 checks:
"emoji (center): first line top 123.44791 is not the origin 123.447914" (`native/text_layout_probe/checks.rs`). A line's top
is its baseline less its ascent and the baseline was the origin plus that ascent (`place_lines`), so each step rounds to
`f32` and the top can sit an ulp off a fractional origin, which a centred panel has. The stock engine's emoji font metrics
land on such a value; Breaka's engine's do not. The assertion is now `|top - origin| <= f32::EPSILON * (|origin| + ascent)`
(under 2e-5 at this size; the observed difference was one ulp, 7.6e-6). It is a probe-only file (feature `probe`), nothing
shipped changes, and it only loosens a check that was stricter than the arithmetic allows.

S13. **Rebased onto `d417bb5`.** One textual conflict, `scripts/verify.mjs`: kept both the profile selection and main's
`INTERACTION_DEADLINE_MS` (300 s for the interaction workflow, 120 s for the others). Git merged without conflict `README.md`,
`docs/tracks/accessibility.md`, `scripts/a11y-expectations.mjs`, `demo/src/verify-a11y.ts`, `tests/a11y-expectations.test.ts` and
`scripts/verify-interaction-web.mjs` (main's scrolling section and the touch-cancel gate of S11 are independent). Main added no script
or verifier, so none needed the profile. After the rebase the working tree had no stray diffs: nothing in `demo/typings/jsb.*.bundle.d.ts`
differed by line endings. Main changed one tracked typings file (`godot7.gen.d.ts`, +8 lines, Breaka's); the stock typings are generated
separately and the project type-checks against both. The installed native library and Web side module were stale after the rebase (built
before it); both profiles' were rebuilt from the rebased sources before any run that used them. A guard that compares the installed
build's source digest with the working tree's would have caught the stale side module that cost a failed `verify:web` (S10); not built.

S14. **Scroll accessibility (D38) read from the real tree.** The lab now has the scroll view main added with D38: `Messages`, 12 rows and a
"Mark all read" button in a 320 by 96 px view (`a11y-scroller`). `verify:a11y --engine=stock` reads the platform tree four times (before the
Godot-side input; with the view set to a scroll offset of 40 px; with it scrolled to its end; after the input and a scroll back with
scroll-into-view), judges each in full, and passes (geometry scale 0.500, residual 0.000 points over 16, 18, 15 and 16 elements). What the
real tree shows (the four readings and their scroll subtrees are in `tests/fixtures/ax-lab/`):

| | D38 and the table main wrote | The real tree | Verdict |
| --- | --- | --- | --- |
| Role | `AXScrollArea` | `AXUnknown`, role description "unknown", name "Messages" in `AXTitle`; frame 160 by 48 points, where the 320 by 96 px view is | adapter gap, noted. A stock Godot `ScrollContainer` (the same engine role, `ROLE_SCROLL_VIEW`) is `AXUnknown` too (control window, same tool) |
| Scroll position and range | "the scroll bars' values" | none. The element has no `AXValue`, `AXMinValue`, `AXMaxValue`, `AXVerticalScrollBar` or `AXHorizontalScrollBar`; its attribute list is the generic one | adapter gap, noted: the macOS adapter ignores the scroll properties set on a node (`update_set_scroll_x/y` and their ranges) |
| Scroll actions | six actions on the container and on its contents | the container advertises no action; every message and the button advertise `AXScrollToVisible` (D38's scroll-into-view); Save, the checkboxes and radios advertise only `AXPress`, the slider `AXIncrement` and `AXDecrement` | scroll up, down, left, right and set-offset have no macOS counterpart, noted; scroll-into-view is conveyed and checked, on the contents and nowhere else |
| Children | all 13 | those in view and a margin beyond it: at the top Messages 1 to 5 (the view shows 1 to 4), at 40 px 1 to 7, at the end 10, 11, 12 and the button. A child at least 17 px beyond the edge is in the tree, one 30 px or more is not | adapter filter, noted: native exposes all 13 (`walk` does no culling, and the server forwards every node set in an update), so it is AccessKit's. A child wholly in view must be in the tree, and is checked |
| Frames | root-local, following the scroll | every child in the tree has native's frame at that moment, in points at 0.5 per pixel, residual 0.000 in every reading; Message 2 is at 596.5 points before and 576.5 after the 40 px scroll | matches, checked |

What the stock engine itself does, for comparison (control window, a bare `ScrollContainer` with 12 `Label` rows): its container is
`AXUnknown` with no scroll attributes, and it adds a **child element of role `SCROLL_BAR`** (`AXScrollBar`: value 0, minimum 0,
maximum 320, a 30 by 4 point frame, actions `AXScrollToVisible`, `AXIncrement`, `AXDecrement`). That is how the engine tells macOS the
position and range of a scrolled area. This library's scroll bars are drawn on the canvas, not elements, so VoiceOver on macOS reads
this library's scroll views' contents but not where in them it is.

*Decision: not fixed here.* Nothing in native is wrong (no wrong name, state or frame in the tree), and the scroll bar element is a
feature, not a repair: it needs an element that no tag owns (D38 already named that limit for `ItemList`'s transform), so a registry keyed by
`(tag, axis)` next to the tag-keyed one, its own props (value, range, orientation), `Increment` and `Decrement` mapped to `scroll_by`, the
scroll view's own scroll properties kept for platforms that read them, unit tests, and verifier changes. It is the right next step for
macOS screen readers and is listed under "Owed".

*The unproven claim in D38*, "the accessibility update requested on each scroll keeps a live tree current", is proven for the cases
read: the scroll came from the action entry point the adapter's own action would call (`_on_accessibility_action` with a set-scroll-offset),
and the tree followed to the pixel at a scroll offset of 40 px, at the end, and after scrolling back, with the set of children following the
viewport each time. Wheel and touch scrolls reach the same native `scroll_changed` and its accessibility update; they were not read separately
(no real input). The verifier's wait for the update is its re-read loop (a few reads at most); first-read staleness was not measured.

S15. **Reading the tree got slower, and the dump tool got a little wider.** Each reading takes 5 to 15 seconds, because the target answers one
attribute request per frame (about 560 requests for the lab's 31 nodes), so the verifier's limits moved: 45 s for one dump (was 20), 60 s to
wait for an expected change (was 30), 300 s for the run (was 180). `scripts/ax-dump.swift` still only calls `AXUIElementCopyAttributeValue`
and now also `AXUIElementCopyAttributeNames` and `AXUIElementCopyActionNames` (names only; it still performs and sets nothing; the wrapper
refuses to run it if its source mentions an action or event call). It records every element's action names, and for scroll areas and
unknown-role elements their attribute names and any scroll bar attributes. An empty action list is left out, so an element with no
`actionNames` advertises none.

## Engine differences found

| Where | Stock Godot 4.7.2 + upstream GodotJS | Breaka's Godot 4.8 + its GodotJS | What was done |
| --- | --- | --- | --- |
| Accessibility driver | AccessKit 0.22.3 built in; `AccessibilityServer.is_supported()` true in a window | none in the installed `Godot48.app` | the reason for this track; S7 to S9 |
| GodotJS declarations | `godot.annotations` declares invalid `export function export`; CRLF; no `jsb.release`, `setScriptHotReload`, `replaceModuleSource`; 1,067 classes | valid; LF; those three; 1,101 classes | per-profile typings, S5; project uses none of the missing API |
| GodotJS runtime | `Callable.create`, `bindv`, signals, `OS.createProcess`, `FileAccess`, `createClassBinder`, `getCmdlineUserArgs`, `Time`, `Engine.getProcessFrames`, `setTimeout` all behave as the demo needs; `Intl` absent | same, `Intl` absent | none needed: no difference found at runtime in project code (every verifier below ran its JS) |
| V8 dispatch cost | cheap handler p50 0.055 ms, state-updating p50 0.887 ms (native) | 0.054 ms, 0.856 ms | none; recorded |
| Window flags and the platform tree | the tree is empty while the lab's window is `unfocusable` and `mousePassthrough` | not observable (no driver) | S8: the lab's isolation no longer sets them |
| Text server | emoji line metrics put a centred panel's origin on a value where `(o + a) - a != o` | different metrics | S12: the probe check allows rounding |
| Web debug template | aborted in every pthread worker at startup (closure compiler plus assertions: a global `v` from the unwrapped engine loader) | works (different Emscripten, no assertions) | S10: relinked without the closure compiler; both modes work |
| Scroll view on macOS | `SCROLL_VIEW` is `AXUnknown`, no scroll state, no scroll actions, children near the viewport only; `AXScrollToVisible` on contents | not observable (no driver) | S14: noted as gaps, the rest checked |
| Web touch cancel | `touchcancel` is a plain `touchend` | `touchcancel` is a cancelled touch | S11: capability flag, gap recorded |
| Web startup diagnostic | Emscripten 4.0.11 emits none; the verifiers allow the 6.0.12 one only if it appears | Emscripten 6.0.12 warns once before `DEMO_READY` | none needed |
| `project.godot` `config/features` | lists "4.8"; 4.7.2 loads it with no warning | | left as is |
| Rust bindings | compile unchanged against the 4.7.2 dump, no 4.8-only API used (S4) | | none |

## Checks

Each ran once, except where a row says why it ran again.

| Command | Engine | Result |
| --- | --- | --- |
| `pnpm test` | n/a | 291 passed |
| `pnpm test:types` | breaka, stock | clean, clean |
| `pnpm build:native` | stock (3 min 5 s cold), stock probe (3 min 0 s), breaka (2 min 4 s) | all succeed; no 4.8-only API |
| `pnpm verify:a11y` | stock | **passed**; first run failed (S8), second after the lab's window stayed focusable; geometry scale 0.500, residual 0.000 over 10 elements in both phases; one focus-loss disturbance reported, not re-run needed |
| `pnpm verify` | stock | passed, landscape and portrait (portrait disturbed, passed) |
| `pnpm verify:motion` | stock | passed, both (both disturbed by real mouse and focus events, passed) |
| `pnpm verify:interaction` | stock | passed, both; landscape needed one D22 re-run (attempt 1 failed with `Missing test target inputs-shipping-list` after a focus-loss disturbance at 76 s, attempt 2 undisturbed and passed) |
| `pnpm verify:world` | stock | passed, both |
| `pnpm verify:text-layout` | stock (probe build) | first run failed one of 619 checks (S12); passed 619/619 after the fix; the default library was reinstalled afterwards |
| `pnpm verify`, `pnpm verify:interaction` | breaka (default) | passed, passed; no re-run; interaction facts and dispatch timings match stock's |
| `pnpm build:web --engine=stock` | stock, release | side module 6,848,255 bytes (3 min 27 s, nightly-2026-05-15 accepts Emscripten 4.0.11), export succeeds, receipt written |
| `pnpm verify:web --release` | stock, port 8100 | **passed**: 253 assertions, 53 captures (the debug export failed at startup then; fixed since, S10) |
| `pnpm verify:interaction:web --release` | stock, port 8100 | **passed**: 608 assertions, 66 captures; first run failed its last touch check (S11), second after the capability gate |

Not run then: `verify:motion:web` and `scripts/verify-world-web.mjs` (not in the brief), `cargo test` and Clippy (no shipped Rust changed;
the one Rust change is probe-only and compiled in both probe builds), anything on Safari or a device, VoiceOver by hand.

### After the rebase onto `d417bb5` (S13 to S15)

Each ran once.

| Command | Engine | Result |
| --- | --- | --- |
| `pnpm test:types` | breaka, stock | clean, clean |
| `pnpm test` | n/a | 310 passed |
| `cargo test --locked` | n/a | 496 passed |
| `cargo clippy --locked --all-targets` | n/a | 0 warnings |
| `pnpm verify` | breaka (default) | passed, landscape and portrait, undisturbed |
| `pnpm verify:a11y` | stock | **passed**, with the scroll view read in four whole-tree readings (S14); geometry residual 0.000 points over 16, 18, 15 and 16 elements; one focus-loss disturbance, passed |
| `pnpm verify:interaction` | stock | passed, landscape and portrait, all seven sections including `scroll`; a focus-loss disturbance in each, passed, no re-run |
| `pnpm verify:web` (debug export) | stock, port 8100 | **passed**: 253 assertions, 53 captures, no page errors, against the relinked debug template (S10); the first attempt failed on my stale Web side module (`Invalid native node.scroll`) and is not a result |
| Web side module rebuild | stock | 38 s incremental, 6,917,039 bytes |

Not run after the rebase: `verify:motion`, `verify:world`, `verify:text-layout` and the Web interaction verifier on stock, and `verify:interaction` on
the default profile (the brief's list did not include them; main's Rust changed mostly in scrolling and the accessibility model, which the
runs above and 496 Rust tests exercise); anything on Safari or a device; VoiceOver by hand.

## Owed

- Platform focus and VoiceOver, by hand (S9, "Not verified").
- Breaka's engine: map a group role and a radio-group role to AccessKit `Group` and `RadioGroup`; a scroll area role for `SCROLL_VIEW` (and the
  adapter's scroll properties, if its macOS side can be given them); take `update_set_checked` to a tri-state; a decision on whether to carry
  the Web touch-cancel patch into any stock-based build.
- ~~macOS scroll state (S14): a scroll bar element (`SCROLL_BAR` role, value and range, `Increment` and `Decrement` mapped to `scroll_by`) for each
  scrollable axis, so VoiceOver reads where in a scroll view it is, as it does for a stock Godot `ScrollContainer`. A registry change
  (an element keyed by tag and axis), with verifier changes; the first real reading of it is the lab's `Messages` view.~~ Done: `docs/tracks/scroll-bars.md` (D47).
- ~~A freshness guard for the installed native library and Web side module: compare a digest of `native/`, `Cargo.toml`, `Cargo.lock` and the API
  dump with the one recorded when it was built (S13 describes the failure this would have caught).~~ Done: `docs/tracks/freshness.md`.
- At the time of writing, the Web side module installed in `demo/addons/godot-react-ui/bin/` was the stock profile's (a checkout state, not a standing fact). A Breaka Web export needs
  `pnpm build:web --wasm-only` first; `build:web` says so instead of packing the wrong one. The native library installed is
  the default's.
