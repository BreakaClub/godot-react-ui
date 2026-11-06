# Track: verifier integrity (when a verifier says PASSED, can it be trusted?)

Branch `verifier-integrity`, based on main `944ca90`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md` and
`docs/INTERACTION_PROGRESS.md` are not edited here. The work answers an independent read-only review of the test and build
tooling at `6c6abd7` (nine findings and a minor list), and one nuisance: something rewrote the indentation of `demo/src/main.ts`.
Native product code changed in one place only: the clipboard seam (finding 7). Every decision below is the coordinator's call
as sent, with what was found while doing it.

The rule behind all of it, from AGENTS.md "Test Integrity" and plan D21, D22 and D29: a PASSED must mean the product did what the
assertions say, on the build that was checked, and the run must not have taken anything from the person using the machine.

## Summary

| # | Finding of the review | What changed |
| --- | --- | --- |
| 1 | The retry (D22) re-ran any failure whose log held a disturbance, so a real, flaky failure could pass on a lucky second run. | A failure is re-run only if a disturbance that reaches the system under test came shortly before it. `window-focus-loss` counts only with a press in flight; a foreign event counts only if it is a mouse event. A pass after a retry says so, with the first failure's text, and keeps its log and captures. `--no-retry`. |
| 2 | A Web verifier judged whatever server answered on its port; only the pack was compared. | The verifier serves the export itself on a free port. With `GODOT_REACT_WEB_URL`, every file of the receipt is fetched from that server and compared by hash first. |
| 3 | The Web freshness guard saw only the Rust side module. | The receipt records a digest of the sources of the pack and shell and of the engine template, and the files of the export; every Web run checks all of it. |
| 4 | Freshness was checked once, minutes before the later windows. | Checked again before every launch, re-runs included. |
| 5 | `verify:a11y` PASSED hid skipped and vacuous checks. | The marker line lists what was not run and what the engine cannot convey; the summary prints both. The mixed checkbox is stricter; the platform's advertised actions are judged. |
| 6 | A filtered or headless run printed the same PASSED; a run with no checks passed. | Partial runs say so in the marker line and the summary; a section or probe that asserts nothing fails. |
| 7 | Verifiers overwrote the Mac's clipboard. | A verifier run keeps its clipboard in memory (native) or in the page (Web); nothing reaches the machine's. |
| 8 | The runner left Godot running if it was killed, and had no escalation. | Signals are forwarded, SIGKILL follows SIGTERM, timers are cleared, and the script exiting kills the child. |
| 9 | "Disabled reset does not change state" could not fail. | The disabled button's handler is counted; the assertion is that it did not run. |
| minor | Stale `run.log` read after a failed launch; stale `run-attempt` logs; an `ax-dump` binary kept by file time; an ambient `GDRUST_*` variable overriding the default profile's dumps. | Cleared at the start of each run; the tool is rebuilt when its source hash differs; both dump variables are always set. |
| editor | Godot's script editor rewrote `main.ts`. | TypeScript is taken out of the saved editor layout before any editor launch. |

## What the scripts print now

From the runs of this branch (native windows on this Mac; the retry, a11y and headless lines are scripted stand-ins for Godot
through `scripts/native-run.mjs`, because none of those cases happened in a real run, and are marked so).

```
$ pnpm verify:interaction --only=selection,forms          # real run: two windows
[JS] GODOT_REACT_INPUT_ISOLATED {"unfocusable":true,"mousePassthrough":true,"accumulatedInput":false,"clipboard":"memory"}
[JS] GODOT_REACT_RUN_DISTURBED {"kind":"window-focus-loss","detail":"NOTIFICATION_WM_WINDOW_FOCUS_OUT","sinceReadyMs":43012,"frame":4882,"reachesRoot":false,"inFlight":[]}
[JS] GODOT_REACT_INTERACTION_VERIFY_PASSED {"sections":["selection","forms"],"partial":true,"skipped":["events","cooperation","pointers","keyboard","positioning","inputs","scroll","drag"],"sectionChecks":{"selection":906,"forms":1132},"sectionMs":{…},"captures":[…],"dispatchTiming":null}
[JS] GODOT_REACT_RUN_ENDED {"sinceReadyMs":54246,"disturbances":{"window-focus-loss":1},"reaching":{}}
landscape: PASSED (PARTIAL: not run: events, cooperation, pointers, keyboard, positioning, inputs, scroll, drag)
…
verify-interaction summary:
  landscape: PASSED (PARTIAL: not run: events, cooperation, pointers, keyboard, positioning, inputs, scroll, drag)
  portrait: PASSED (PARTIAL: not run: events, cooperation, pointers, keyboard, positioning, inputs, scroll, drag)

$ pnpm verify                                             # real run, the default smoke
verify summary:
  landscape: PASSED
  portrait: PASSED
```

```
$ pnpm verify:interaction:web --only=forms               # real run: no server started, no port chosen
Serving artifacts/web-debug on http://127.0.0.1:53783/ (a free port, this verifier's own server)
GODOT_REACT_WEB_INTERACTION_VERIFY_PASSED {"sections":["forms"],"partial":true,"skipped":["events","cooperation","pointers","keyboard","scroll","selection","drag","touch"],"sectionChecks":{"forms":178},"assertions":190,"captures":16,"timing":{},"engineGaps":[],"report":"…/artifacts/web-interaction-verification/report.json"}
```

The lines of cases that did not happen in a real run (a scripted Godot, `scripts/native-run.mjs` as the script runs it):

```
portrait: PASSED after 1 disturbed failure(s). First failure: portrait runtime verification failed (exit 0): ERROR: [JS] GODOT_REACT_VERIFY_FAILED Error: Entering a child hovers its parent; see <dir>/run.log. Disturbance: foreign-input (InputEventMouseMotion device=32) 300 ms before the end. Its log and captures: <dir>/run-attempt-1.log, <dir>-failed-attempt-1
landscape: FAILED: … GODOT_REACT_VERIFY_FAILED Error: Entering a child hovers its parent … (1 disturbance(s) were logged but none reached the system under test within 5000 ms before the failure (window-focus-loss with nothing to act on), so this is a real failure and is not re-run)
landscape: FAILED: … (a disturbance reached the system under test before it: foreign-input (InputEventMouseMotion device=32) 300 ms before the end; not re-run because retries are off)
a11y: PASSED (PARTIAL: not run: platform focus (the window is not the key window)) (5 recorded engine gap(s), not failures: a11y-size; a11y-select-all; a11y-scroller; a11y-notes; a11y-readonly)
text-layout (headless): PASSED (PARTIAL: not run: pixel checks, captures)
```

## 1. Retrying a disturbed failure (D22)

Ben's rule stands: interference is detected and the run is re-run; a failure with no detected interference is real. What was wrong
is "detected": the old rule re-ran on the presence of the line `GODOT_REACT_RUN_DISTURBED` anywhere in the log, with no relation to
the failure. Reproduced with a stand-in for Godot (`tests/native-run.test.ts`, "a real failure is not laundered"): a run that fails
an assertion and logs a focus loss afterwards was re-run and, on a lucky second launch, passed.

**What a disturbance is, measured.** Two real windows of this branch (`verify:interaction --only=selection,forms`, 54 s and 55 s)
each logged exactly one disturbance, a `window-focus-loss` with `reachesRoot: false` at 43.0 s and 25.9 s, and the two 12 s windows of
`pnpm verify` logged none. The recent run logs of the sibling worktree `filters` (`artifacts/filters-iter/*/run*.log`, seven
runs) show exactly one disturbance per run, always `window-focus-loss`, never anything else, at 0.8 s, 0.8 s, 3.0 s, 8.4 s, 10.6 s,
29.4 s (after the verifier had already printed PASSED, in teardown) and one in the run that failed `glass-dpr2: the scrim's blur
softens the tiles' edges from 25.3 to 30.7 levels`, a deterministic pixel assertion, which the old rule re-ran because of a focus loss
at 781 ms. Reading the engine explains the pattern:

- `NOTIFICATION_WM_WINDOW_FOCUS_OUT` is sent on macOS only from `windowDidResignKey` and `windowDidMiniaturize`
  (`platform/macos/godot_window_delegate.mm:354,368`), after `ds->release_pressed_events()`.
- `unfocusable` (`WINDOW_FLAG_NO_FOCUS`) sets `wd.no_focus`, which `canBecomeKeyWindow` reads
  (`godot_window.mm:68`), but nothing resigns a window that is already key (`display_server_macos.mm:2571`). The window is shown and made
  key by the engine before the owner's `_ready` sets the flag, so it stays the key window until something else takes it. That
  one loss is the moment the window becomes isolated, and it comes again at teardown when the window is closed. It is not an attack
  on the run.
- What a focus loss does to the system under test: the engine releases the keys and buttons it believes are pressed (foreign events,
  dropped by `_input`), and the root cancels every pointer that is down (plan D6). With nothing pressed it changes nothing.
- A foreign event: `Viewport::push_input` (`scene/main/viewport.cpp:3523,3537,3545`) runs `_update_mouse_over` for any
  `InputEventMouse` before `_input`, and `_gui_cleanup_internal_state` for a handled mouse release: a real mouse event moves the hover
  and clears the mouse focus even though `_input` drops it. A key or a gesture is dropped before the GUI sees it.

So the verifier now records, per disturbance, whether it reaches the root (`reachesRoot`) and what it had pressed
(`inFlight`), and the runner uses only those that do:

| kind | reaches the system under test | retry reason |
| --- | --- | --- |
| `foreign-input` | a mouse event (hover and mouse focus change before `_input`); a key or gesture is dropped first | only a mouse event |
| `window-focus-loss` | cancels the pointers that are down | only with a verifier press, key or touch in flight |
| `window-mouse-crossing` | the window's mouse exit clears the hover | yes (not measured: no run log in the sample has one; kept) |

I did not measure what the old `window-focus-loss` count would have been on an unattended machine beyond the seven logs; the reading of the
engine above is the basis for treating it as routine. If a window ever logs a focus loss *with* a press in flight, it is retried.

**The rule** (`scripts/native-run.mjs`, `relevantDisturbances`): a failed window is re-run (at most twice) only if a logged
disturbance has `reachesRoot` and came at most `DISTURBANCE_RELEVANCE_MS` (5 s) before the run ended, on the verifier's own clock.
The verifier now prints `GODOT_REACT_RUN_ENDED {"sinceReadyMs": …}` once when a run ends, passed or failed, immediately after the
failure line, so a failure has a time that does not depend on how the pipe batched the lines. Each kind logs again after 250 ms
instead of only the first time, so the disturbance nearest the failure is in the log. Not re-run, with the reason in the error:

- no disturbance at all ("no interference was detected");
- disturbances that cannot have caused it (none reached the root, or none within 5 s before the end, or one logged after it);
- a run that never printed its end (killed at its deadline, crashed): there is no failure time to order anything against, and a
  disturbance does not stall a process. This also ends the old behaviour of re-running a deadline kill because of an unrelated focus loss
  (verify.mjs's own comment records three wasted runs);
- a window with no input isolation (the text layout probe): "this window takes no input, so no interference is tracked for it".

The 5 s is a judgement, not a measurement: the verifier re-asserts what it just injected within a settle (about 100 ms), a disturbance acts
at once and the verifier's next injected input undoes it, and the longest wait inside one step is a few seconds. A shorter window would
miss a long step; a longer one re-admits what the old rule did. It is a named constant with this reasoning beside it.

**Reporting.** A pass after retries is `landscape: PASSED after 1 disturbed failure(s). First failure: …. Disturbance: …. Its log and
captures: <dir>/run-attempt-1.log, <dir>-failed-attempt-1`. The first failure's log is `run-attempt-1.log` and its captures are copied
to `<window dir>-failed-attempt-1/` before the re-run overwrites them. Evidence of earlier invocations (`run.log`,
`run-attempt-N.log`, `*-failed-attempt-N`) is removed when a run starts, so nothing old reads as this run's.

**`--no-retry`** (`verify`, `verify:motion`, `verify:interaction`, `verify:world`, `verify:a11y`): each window runs once, and a failure
with a relevant disturbance fails with the disturbance named and "retries are off". Use it for negative controls: a control that is
re-run until it passes proves nothing (the progress log records one such control).

## 2. Which Web server the browser talks to

A Web verifier now serves the checked export itself, from `artifacts/<profile>/web-<mode>`, on port 0 (the system picks a free one),
bound to 127.0.0.1, and closes the server when it finishes. Agents running in parallel need no port arithmetic, and nothing else
can answer. `GODOT_REACT_WEB_URL` still works for a server somebody started: the verifier fetches every file in the export's
receipt (`files`: name, size, sha256) from it and refuses to open a browser unless each is identical, so another checkout's export, the
other engine's, or an older side module under an identical pack all fail by name (`scripts/web-verify.mjs`). `verify-world-web` had no
check at all before; it and `probe-web` use the same path. The server code is `scripts/web-server.mjs`, shared with `serve-web`
(which still listens on 8096 or `PORT`, for looking at an export by hand).

## 3. Web freshness: the pack, the shell, the template

`build:web` records in `build-receipt.json` a `content` digest (per-file hashes, like the native stamp) of: every source file git lists
under `src/` and `demo/` (tracked or not, minus what `.gitignore` hides: `node_modules`, `.godot`, the installed binaries) except
`demo/typings` (the preset excludes it from the pack) and `demo/gen` (`.gdignore`), `package.json`, `pnpm-lock.yaml`, `tsconfig.json`,
`scripts/build.mjs`, and the hash of the engine template zip the preset names. The digest is taken before the build and after the
export; if it moved, nothing is recorded. `requireFreshWebExport` (every Web verifier, `serve-web`, `probe-web`) compares it with the
working tree and also checks that every file of the export is still the one in the receipt. An export made before the guard has no
`content` and is refused once, with `pnpm build:web --export-only`. A refusal names the file that changed.

What is still not an input (amends freshness.md F10): the Emscripten SDK and the Rust nightly the side module and template were built with, the
engine binary that does the export, and `demo/.godot` (made by `pnpm build` from the inputs).

## 4. Freshness checked before every launch

`runNativeVerifier` takes `beforeLaunch(attempt)`, which every script sets to `engine.requireInstalledLibrary(...)`; it runs before
each window, a re-run included, and a refusal stops the run before anything opens. (A rebuild by another session between the
landscape and the portrait window used to go unnoticed.) `verify-text-layout` uses the same runner now (one window, no retry, probe build
required).

## 5. The accessibility PASSED

`GODOT_REACT_A11Y_VERIFY_PASSED` now carries `{"partial", "skipped", "gaps"}` and the summary prints them:

- `skipped`: checks that did not run. Today that is the platform focus check, which `checkFocus` skips when the window is not the key
  window (which it has never been in a recorded run, docs/tracks/stock-engine.md); a pass says `PARTIAL: not run: platform focus
  (the window is not the key window)`. It is not turned into a failure: the person's focus is not ours to take.
- `gaps`: what the engine cannot convey and the verifier recorded (the group role, the mixed state, the scroll view's role, values and
  actions, the read-only attribute). Not failures, as decided: "recorded gaps stay gaps". They are counted and named in the summary.
- The mixed checkbox: reading as unchecked is accepted only on the engine the gap was recorded on (stock, `GODOT_REACT_ENGINE`), only
  with an AXValue of exactly 0, and only with no state text that says something else. Anywhere else the mixed state must be conveyed
  (AXValue 2 or a description that says mixed). The stock tree cannot do better; this stops the accepted value from widening.
- Actions advertised on the platform, judged where the adapter shows them (the recorded tree, `tests/fixtures/ax-lab`): `AXPress` on
  the enabled button, the three toggles and the three radio buttons, `AXIncrement` and `AXDecrement` on the slider, and none that acts on
  the disabled button. The Godot-side half still calls the element's action callable itself (nothing here performs an accessibility
  action: D29 and the read-only tool), so this is what shows that the action is registered with the platform at all. Still not
  checked: that the platform's `AXPress` on the real adapter reaches `_on_accessibility_action` with the code the callable binds.

## 6. Partial and empty runs

- `GODOT_REACT_INTERACTION_VERIFY_PASSED` and the Web equivalent carry `sections`, `partial`, `skipped` and `sectionChecks`. A filtered
  run prints `PASSED (PARTIAL: not run: …)` in the script's summary. A section that made no assertion fails the run.
- `GODOT_REACT_TEXT_LAYOUT_VERIFY_PASSED` carries `partial` and `skipped` (a headless run has no pixel checks or captures); a probe that
  ran no check at all fails. The Web verifiers fail a run with no assertion.
- The assertion count is a shared tally in `demo/src/verifier-input.ts` that each verifier file's `assert` increments.

Not done: a count for every native verifier (`verify`, `verify:motion`, `verify:world`, `verify:a11y` are one linear script each, with no
filter that could leave them empty).

## 7. The clipboard

**The problem.** The `selection` (I6) and `forms` (I7) sections copy, cut and paste through `DisplayServer.clipboard_*`, which on macOS
is the person's pasteboard. They put the text back afterwards, but `DisplayServer` exposes text only, so an image, files or formatting
the person had copied were lost, a run that was killed left test text there, and a copy made in the middle made a section fail with no
disturbance logged. On the Web, headless Chrome's `navigator.clipboard` is the same pasteboard (full Chrome without a window) and
nothing was saved or restored.

**Native.** `native/clipboard.rs` is the one place the root reads and writes the clipboard (the three call sites in
`selection_input.rs`, `text_input_godot/pipeline.rs` and `web_clipboard.rs` go through it). Normally it calls `DisplayServer`. A
verifier run calls `ReactUiRoot.isolateClipboard(true)` (three static `#[func]`s: `isolate_clipboard`, `clipboard_text`,
`set_clipboard_text`), from `VerifierInputIsolation`'s constructor, so every verifier run is isolated from its first line; the
clipboard is then the process's memory and the machine's is never read or written. Everything above the bottom runs unchanged: the
selection text a copy composes, the edit commands a text input applies, what a paste is made of. The verifiers use
`verifierClipboard.get/set` (`demo/src/verifier-input.ts`) in place of `DisplayServer.clipboardGet/Set`, and a unit test fails if any
file under `demo/src` calls `DisplayServer.clipboard*` again. No real round trip is kept: restoring after one cannot be lossless
(`DisplayServer` is text only), so zero touches of the real pasteboard is the only way the person loses nothing. What this leaves
unverified is the engine's own leaf (`DisplayServer::clipboard_set` onto `NSPasteboard`), which is the engine's.

**Web.** `scripts/web-clipboard.mjs` replaces `navigator.clipboard` with an object in the page's memory (`writeText`, `readText`) before
any page script runs. The engine's glue (`godot_js_display_clipboard_set/get`), the product's copy, cut and paste, the paste that asks the
browser (`web_clipboard.rs`) and the refused-read path (a scenario replaces `readText` with a rejection) all still run. What is lost is
the real browser's permission behaviour for the clipboard, which no scenario tested (the verifier granted it). Whether headless Chrome
reaches the OS pasteboard was not measured: a measurement writes to the person's pasteboard, which is the harm, so the clipboard is
swapped on the assumption that it does.

## 8. Reaping Godot

`launch()` in `scripts/native-run.mjs`: on the deadline SIGTERM, then SIGKILL after `KILL_GRACE_MS` (5 s); SIGINT, SIGTERM and SIGHUP sent to
the script are forwarded to Godot with the same escalation and end the run as interrupted (no re-run, no next window); the script
exiting for any reason kills a running child; every timer is cleared when the child leaves. Tests: a child that ignores SIGTERM is gone
after the deadline plus the grace; a SIGTERM sent to a script running a hanging stand-in leaves no child.

## 9. The vacuous assertion

`verify.ts:216` and `verify-web.mjs:76` clicked Reset at zero and asserted zero, which an enabled Reset also gives. The demo's Reset handler now
counts its calls (`getDemoLifecycle().resetPresses`, `godotReactDemo.lifecycle()` on the Web); the assertions are that an enabled Reset
runs its handler once and a disabled one does not run it, so the counter is shown to be live and the disabled press to be inert.

## Minor list

- `verify-a11y.mjs` read `run.log` after an error, possibly a previous run's: the runner removes it before it launches.
- The `ax-dump` tool was rebuilt by file time, so a source restored with an old time kept a binary built from other content: it is
  rebuilt when the hash of its source differs from the hash recorded beside it.
- An exported `GDRUST_GODOT_API_JSON` or `GDRUST_GODOT_INTERFACE_JSON` beat `.cargo/config.toml` (cargo's `[env]` does not override a
  set variable) and would bind a default build to another engine under a valid stamp: `bindingEnvironment` now names the default
  profile's own files too, the same ones the stamp hashes.
- Unknown arguments to `verify.mjs` and `verify-text-layout.mjs` are errors.

## The `main.ts` indentation nuisance

**What writes it.** Ben's explanation reproduced. With `open_scripts=["res://src/main.ts"]` in `demo/.godot/editor/editor_layout.cfg`,
one headless `Godot --headless --editor --generate-types --path demo` (the command `pnpm gen:types` runs) turned the 254 space-indented
lines of `demo/src/main.ts` into tabs: `diff -w` empty, `grep -c '^\t'` 0 before and 254 after. The script editor
(`ScriptEditor::set_window_layout`) opens whatever the layout lists, and it saves what it has open with
`text_editor/behavior/files/convert_indent_on_save` on and `text_editor/behavior/indent/type = 0` (tabs) in the person's editor
settings. This worktree's `project_metadata.cfg` also lists `res://src/main.ts` under recent files, so someone had opened it here.

**The fix** (`scripts/editor-session.mjs`): `scrubOpenScripts(project)` removes the `.ts` and `.tsx` entries from
`[ScriptEditor] open_scripts` (strings or dictionaries, one line or several) and a TypeScript `selected_script`, and nothing else; it
rewrites the file in one step and only when it removes something. It runs before `import-demo.mjs` (every native verify and
`build:web`'s callers), `generate-types.mjs`, `typings.mjs` (on the staged project, which carries a copy of the layout) and `dev.mjs`
(the interactive editor). With the same seeded layout and the guard on, `pnpm gen:types` left `main.ts` byte-identical (`cmp` against
the copy made first). Left alone on purpose: `script_editor_cache.cfg` (view state of a script opened some other way; it opens
nothing), the recent-files list (a menu), and the editor setting `restore_scripts_on_load` (the person's). A person can still open a TypeScript
file by hand; the README says so and to use an external editor.

## Tests

`tests/native-run.test.ts` (retry policy, `--no-retry`, per-launch check, partial runs, reaping, signal forwarding),
`tests/web-verify.test.ts` (free-port servers, served-asset comparison, named URL accepted or refused, the sources of an export, the
browser clipboard), `tests/freshness.test.ts` (content digest, export files), `tests/a11y-expectations.test.ts` (actions, mixed
strictness), `tests/editor-session.test.ts` (the scrub), `tests/verifier-clipboard.test.ts` (no verifier touches `DisplayServer`'s
clipboard), `tests/engine.test.ts`; `cargo test` in `native/clipboard.rs` (routing with a fake system clipboard).

## Gates, and what each was run on

Logs and evidence are in the worktree (`artifacts/logs/`, `artifacts/native*/…/run.log`, `artifacts/web-interaction-verification/report.json`);
nothing was read from the shared scratch folder, where agents overwrote each other's logs.

| Gate | Result |
| --- | --- |
| `pnpm test` | 401 passed, 0 skipped |
| `pnpm test:types`, `--engine=stock` | clean, clean (the stock one regenerated its typings once: the stock library was rebuilt) |
| `pnpm verify` (default smoke) | landscape and portrait PASSED, no disturbance (`artifacts/native/*/run.log`) |
| `pnpm verify:interaction --only=selection,forms` | both windows PASSED (selection 906 assertions, forms 1132 in each; one idle `window-focus-loss` each); the pasteboard text hash was the same before and after |
| `pnpm verify:interaction:web --only=forms` | PASSED on a free port (190 assertions, 178 in `forms`, 0 failed requests); the pasteboard text hash was the same before and after |
| `cargo test --locked` | 545 passed (4 new in `native/clipboard.rs`); then `rustfmt --check` asked for one line of that file's test module to be wrapped, which was done, the default and stock libraries were rebuilt, and `cargo test --locked clipboard` passed again (5 tests) |

Not run: Clippy, `verify:motion`, `verify:world`, `verify:a11y` (needs the stock engine with the Accessibility permission), `verify:text-layout` (needs a
probe build), `verify:web` and `verify:motion:web`, the full `verify:interaction` and `verify:interaction:web`, and anything on the stock profile
beyond the typecheck. The Web export was made, and `verify:interaction:web` run, on the tree before the rustfmt-only change to
`native/clipboard.rs`; that file differs by whitespace in its test module, so the export is stale against the digest and needs
`pnpm build:web` before its next Web verify, as every checkout does.

A note for anyone running `cargo test` here: a bare `cargo` on this Mac can be Homebrew's (`/opt/homebrew/Cellar/rust`), whose `rustc` aborts at
start with a dyld error against Homebrew's llvm. Put `~/.cargo/bin` first on `PATH`, as the build scripts do.

## Merge notes

- Native: `native/clipboard.rs` (new), three one-line call sites, three static `#[func]`s on `ReactUiRoot` in `native/lib.rs`, and the
  regenerated `demo/typings/godot7.gen.d.ts`. Tracks that rebase over Rust should not conflict beyond those lines.
- `demo/src/verify-interaction.ts` has five small edits (the import, the tally in `assert`, the clipboard calls in `selection`, the
  per-section counts, the marker line); `demo/src/main.ts` one line (`lifecycle`); `verifier-input.ts` is rewritten around
  the isolation class and keeps its exports.
- Every checkout needs `pnpm build:native` (the sources changed) and `pnpm build:web` before its next Web verify: an export has no
  `content` digest and is refused once.
- New sections of `verify-interaction.ts` should use `verifierClipboard`, count their assertions through the file's `assert`, and appear in `SECTIONS`.
