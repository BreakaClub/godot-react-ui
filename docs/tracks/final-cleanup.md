# Track: final cleanup (the contradictions the docs audit found)

Branch `final-cleanup`, based on main with the final-acceptance documents (`f9cd93c`). While bringing the documents into line with the
code for final acceptance, an audit listed places where the code contradicted itself or the docs could not be made true. The coordinator
decided each; this is what was done, with the evidence. `docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md` are not edited here.

| # | Contradiction | Decision | Where |
| --- | --- | --- | --- |
| 1 | A plain `pnpm verify:interaction` printed `PASSED (PARTIAL: not run: filters-sizes, filters-cost, filters-faults)` | A run of every default section is not partial; opt-in sections are never reported as left out | `scripts/verifier-sections.mjs` |
| 2 | Comments and a verifier message said a prevented `keyup` "keeps the click"; the code withholds it | The behaviour is right (browsers do not click either); fix the words | `native/keyboard_input.rs`, `demo/src/verify-interaction.ts` |
| 3 | `build:web`'s headless export launched the editor with no TypeScript scrub, which the README claimed it did | Scrub first, as every other editor launch does | `scripts/build-web.mjs` |
| 4 | `get_node_rect(0)` was `null` while the snapshot gave node 0 a rectangle, so a root handle's `getRect()` was always `undefined` | Return the root's rectangle | `native/stacking.rs` (`rect_of`), `native/snapshot.rs` |
| 5 | `NativeEffects.layout` lacked `both-in-wrapper`, `NativeSnapshot.stats` lacked `commits` and `animationFrames`, `focus()` named only a `Button` and a `tabIndex` | Fix all three | `src/native.ts`, `src/components.tsx`, `native/focus.rs` |
| 6 | The document selection matched `ui_copy` and `ui_text_select_all` against the raw event, so a key from another device did nothing; a text input re-stamped it as the keyboard's (D44 T3) | Both match the re-stamped key | `native/keyboard_input.rs` (`as_keyboard_event`) |
| 7 | Scripts ignored unknown flags; `verify.mjs` accepted an unknown `--only=` name until Godot started; `build-native` took `--probe --faults` | Unknown flags are errors; `--only=` names are checked first; the pair is refused | `scripts/arguments.mjs`, `scripts/verify.mjs`, `scripts/build-native.mjs` |
| 8 | A named-server `fetch` with no deadline; `verify-world-web` with no pass line and no `browser.log`; `dev.mjs` watching four bundles of twenty; `run.mjs` with `probe: false` | Deadline; marker and log; one shared list; check `run.mjs` and change it only if wrong | see below |
| 9 | Comments: the clipboard permission "granted", touches from "device 0" | Fix them | `scripts/verify-interaction-web.mjs`, `demo/src/verify-interaction.ts`, `demo/src/verify-world.ts` |

## What was done, and the evidence

1. **Sections.** `scripts/verifier-sections.mjs` (with `.d.mts`) is the one place for the native and Web section lists, the opt-in set and
   the rules: `sectionsToRun` runs the named sections in run order or every default one, `describeSections` returns what ran, what was left
   out and whether that makes the run partial. The native verifier (`demo/src/verify-interaction.ts`, which imports it the way
   `verify-a11y.ts` imports `scripts/a11y-expectations.mjs`), the Web verifier and `scripts/verify.mjs` use it and keep no list. The root
   cause was the native `skipped` being computed over all sections, opt-in ones included. `tests/verifier-sections.test.ts`: the plain run is
   not partial; naming sections lists only default ones as left out; an opt-in section runs only when named; an unknown or empty name throws
   (and `verify.mjs` throws before it builds or launches, checked by running it); every name in a list has a branch in the verifier that runs it.
2. **Prevented `keyup`.** `KeyRelease::EndsWithoutClick` was already tested (`a_prevented_keyup_still_ends_the_press_but_withholds_the_click`,
   renamed from "keeps the click"); the verifier's `kb-veto-status` assertion was always `clicks 0`. Only wording changed.
3. **Scrub.** `scrubOpenScripts(demo)` runs before the export. `tests/editor-launches.test.ts` finds every script that starts an editor
   (`--editor`, `--generate-types`, `--import`, `--export-`) and requires the scrub, and requires it to precede the export in `build-web.mjs`.
   Not run: a real `pnpm build:web` (it needs the Emscripten and nightly toolchains and a Web build; the change is one call of a function
   `tests/editor-session.test.ts` already tests).
4. **Root rectangle.** `stacking::rect_of` returns the viewport for tag 0, where a mounted node is drawn for any other mounted tag, and
   `None` otherwise (unit test `the_root_has_the_viewport_for_a_rectangle_and_an_unknown_tag_has_none`). The `events` section of the
   interaction verifier reads `getRect()`'s query for node 0 through the demo owner (`rootRect`) and compares it with the snapshot's.
5. **Gaps.** `NativeEffectsLayout` is a union the parser enforces; `stats` parses `commits` and `animationFrames`;
   `focus::refusal_reason` says "it is not a button or text input and has no tabIndex" (the fake hosts and the verifier's regular expression follow;
   the JS side of `focus()` is the native error). `tests/native-snapshot.test.ts`.
6. **Key device.** `as_keyboard_event` duplicates the key and sets the keyboard's device id; the document selection and the text inputs both
   call it. `bindVerifierKeys`, which added the verifier's device to the `ui_copy` and `ui_text_select_all` bindings, had no other user and is
   removed (D41 S11 in the plan mentions it; the plan is not edited). The selection section now injects its keys from `VERIFIER_DEVICE_ID`
   and still copies and selects all, so it fails without the fix: that is the regression test. Checked with
   `verify:interaction --only=selection,forms,events`.
7. **Arguments.** `rejectUnknownArguments` (`scripts/arguments.mjs`) is the first statement of `dev`, `serve-web`, `probe-web`, `verify-web`,
   `verify-world-web`, `verify-interaction-web`, `verify-motion-web`, `verify-world`, `verify-a11y`, `build` and `glass-reference`;
   `build-native`, `build-web`, `generate-types`, `test-types`, `verify` and `verify-text-layout` already had a check. `scripts/run.mjs` forwards its
   arguments to Godot on purpose (`pnpm demo -- ...`). `tests/script-arguments.test.ts` runs each script with a bogus flag and requires a
   non-zero exit, the message, and no other output; it also runs `build-native --probe --faults`, and fails if a new script reads `process.argv`
   without being listed. Found while testing it: `verify-motion-web` checked its flags only after the freshness check, so a stale export hid the
   error; it is first now.
8. **Script oddities.**
   - `servedAssetProblems` gives each file `SERVED_ASSET_TIMEOUT_MS` (30 s) through `AbortSignal.timeout`, headers and body; tests use a server that
     never answers and one that stalls in a body.
   - `verify-world-web` writes `report.json` (with `finishedAt`) and `browser.log` through `writeEvidence` and prints
     `GODOT_REACT_WEB_WORLD_VERIFY_PASSED` through `passedLine`, which returns nothing for a run that did not pass. The old
     `GODOT_REACT_WEB_VERIFY_REPORT ... passed=false` line is gone (nothing read it). Not run: `node scripts/verify-world-web.mjs` itself,
     which needs a Web build; the helpers are unit tested.
   - `scripts/demo-entry-points.mjs` lists all twenty bundles; `build.mjs` builds them in one esbuild call and `dev.mjs` watches them. Nothing was lost
     by merging the four builds into one (each output is a self-contained CommonJS bundle). `tests/demo-entry-points.test.ts` requires every
     `demo/src/*.ts` to be an entry point (the Web export fails on one with no module) and neither script to keep a list.
   - **`run.mjs` `probe: false` is right.** `pnpm demo` opens the interactive demo, and the freshness guard deliberately refuses a probe or faults
     library for a default run (`docs/tracks/freshness.md`). The F0 probe is run with a probe build and Godot directly
     (`$GODOT --path demo -- --probe`), which never went through this script. Only a comment was added.
9. **Comments.** As in the table.

## For the plan and the progress log (not edited here)

- Plan D41 (S11) and `docs/tracks/text-selection.md` mention `bindVerifierKeys`; it is gone and the root matches keys as the keyboard's.
- The plan's 0.4.1 and the README say a plain `verify:interaction` lists three sections as not run; it does not any more (the README is updated).

## A slip, disclosed

While checking by hand that `build-native --probe --faults` was accepted, I ran it before the refusal existed. It started a cargo build into
`target/probe` (the output was piped to `head`, which closed the pipe and ended it); it installed nothing, and the `pnpm build:native` I had started
earlier ran separately into `target/` and is the library the gates used. `target/probe` holds a partial, ignored build.

## Gates

Each run once, on the tree the commits hold (the only changes after the code commits are documents). Logs are in `artifacts/logs/` (ignored by git).
`pnpm build:native` was run once for the library the verifier used (default profile, 3 min 6 s).

| Gate | Result |
| --- | --- |
| `cargo test --locked` | 625 passed (623 before; the two new tests are `focus::tests::the_refusal_names_everything_that_does_take_focus` and `stacking::tests::the_root_has_the_viewport_for_a_rectangle_and_an_unknown_tag_has_none`) |
| `cargo clippy --locked --all-targets` | 0 warnings |
| `rustup run stable cargo fmt --check` | clean |
| `pnpm test:types` (default profile) | clean |
| `pnpm test` | 467 passed (419 before: 48 new, in `verifier-sections`, `script-arguments`, `demo-entry-points`, `editor-launches`, `native-snapshot` and `web-verify`) |
| `pnpm verify:interaction --only=selection,forms,events` | landscape and portrait passed, no disturbance, no re-run. Assertions: `events` 1,092, `selection` 942, `forms` 1,287 (landscape) and 1,277 (portrait). The pass line reads `PASSED (PARTIAL: not run: cooperation, pointers, keyboard, positioning, inputs, scroll, drag, hidpi, filters, glass)`: the three opt-in sections are not listed as left out. The `events` section includes the root rectangle assertion, and `selection` copies and selects all with keys from the verifier's own device and no `bindVerifierKeys` |

Not run:

- `pnpm test:types --engine=stock`: the stock library is not built in this worktree.
- `node scripts/verify-world-web.mjs`, `pnpm build:web`, the Web verifiers: no Web build is needed by any change except the world-space verifier's marker and log
  and the scrub, and building the Web export needs the Emscripten and nightly toolchains. The marker, the log and the deadline are unit tested
  (`tests/web-verify.test.ts`); the scrub has a structural test.
- Negative controls of the new verifier assertions (the selection section without `as_keyboard_event`, the `events` assertion without `rect_of`): each would need a
  native rebuild and a window run.
- The remaining sections of `verify:interaction`, `verify`, `verify:motion`, `verify:world`: the final regression covers them.
