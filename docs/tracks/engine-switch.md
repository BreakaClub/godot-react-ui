# Track: engine switch (one install, two profiles, and what a run may load)

> **Superseded by [single-build.md](single-build.md).** This track made switching between per-profile native builds cheap. Ben then decided on one native build per
> platform, bound to the oldest Godot API either engine runs (4.7.2) and loaded by both, so there is nothing to switch for native: `pnpm switch:engine`, the per-profile
> target directories, `assessInstall`/`switchBuild` and the tests of this note are deleted. What survives from here: the early refusal of an installed live-compile
> extension on every native run (E1, E2), the stamped target directory of the live-compile build (E3), `installFile` (E5), the manifest written by rename, the CLI kept
> across a clean, and the mutation-control method. The text below is the record of the decision and the measurements then.


Branch `engine-switch`, based on main `98af890` (code-editor landed). Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`,
`docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the paragraph for the README is at the end). One job: switching between
the `breaka` and `stock` engine profiles is cheap when the profile already has a build, and a native run never loads a UI library or a
live-compile extension of the wrong profile or of older sources.

What went wrong: the demo has one install of each native build (`demo/addons/godot-react-ui/bin/`, `demo/addons/live-compile/`), and Godot loads
the live-compile extension in every run of the demo, whichever section runs. The UI library was guarded (`engine.prepareNative`), the extension only
for the sections that use it. A stock run of any other section with Breaka's extension installed got as far as Godot, where godot-rust says "compiled
against newer Godot version" and the run dies late with an error that does not name the cause. Two tracks lost time to it: they built the extension
for stock (3 min 25 s) and then Breaka's again. The UI library's own switch also cost a cargo run even when the profile's target directory held a
current build (below: 2 min 32 s with cold cargo, 47 s after a file's mtime moved, a second when cargo is warm), because the only way to install it was
to run the build, and cargo decides from modification times what the stamp (which hashes content) has already settled.

## What it does

| Question | Answer |
| --- | --- |
| What may a native run load? | Every installed native build must be the run's profile's build of the current sources. `engine.prepareNative` checks the UI library and, **if an extension is installed**, the live-compile extension, before Godot starts. Both are checked and one error names each fix. |
| And before each window of a verifier? | `engine.requireInstalledBuilds`, the same check, runs again before every window (`verify`, `verify:a11y`, `verify:world`, `verify:text-layout`), because another session may switch the install between windows. |
| What if no extension is installed? | Fine. Nothing loads, and the code editor shows its read-only panel. The `live-compile` section requires it (`requireLiveCompile`) and is refused with the build command. |
| What does a refusal tell me? | The one command that fixes it: `pnpm switch:engine --engine=<name>` when the profile's own cargo target directory holds a build of the current sources (a staged copy and a stamp, no compile), `pnpm build:native` or `node scripts/build-live-compile.mjs` when it does not. |
| What does the switch do? | `pnpm switch:engine [--engine=stock] [--probe\|--faults]` installs the profile's target builds of the native library and of the live-compile extension (if it is installed, or the profile has a build of it), and prints what it did and the time. It never compiles. Exit 1 if something still needs a compile. |

### The decision table

`scripts/freshness.mjs` `assessInstall`, per installed build (the UI library; the live-compile extension). "Right profile" means the installed stamp's engine and probe flag
are the run's and its library hash is the file's; "fresh" means the stamp's source digest equals the sources now (`findProblem`, unchanged since the freshness track).

| Installed build | The profile's target directory | A run (`prepareNative`) | `pnpm switch:engine` |
| --- | --- | --- | --- |
| right profile, fresh | any | goes ahead | nothing to do |
| wrong profile (or a probe/faults build for a default run), or replaced after it was stamped | a current build of the sources | **refused: `pnpm switch:engine --engine=<name>`** | installs it: staged copy, stamp |
| wrong profile | no build, a stale one, or one that differs from its stamp | **refused: the build command** | prints why and the build command, exits 1; installs nothing |
| right profile, stale sources | a build of the new sources | refused: `pnpm switch:engine` | installs it |
| right profile, stale sources | stale too | refused: the build command | build command, exit 1 |
| none installed, the UI library | a current build | refused: `pnpm switch:engine` | installs it |
| none installed, the UI library | none | refused: the build command | build command, exit 1 |
| none installed, live-compile | any | **goes ahead** (nothing loads); the `live-compile` section is refused | installs the current build if the profile has one, else says there is nothing to switch (exit 0) |
| the live-compile manifest without its library or stamp (a half install) | any | refused: Godot would fail to load it | as the wrong-profile rows |

`tests/engine-switch.test.ts` (the decisions on a temporary repository) and `tests/engine-switch-wiring.test.ts` (the real `engine.mjs`, `live-compile-build.mjs` and
`switch-engine.mjs` copied into a temporary repository, a stub for `godot --version`) run every row.

## Decisions

**E1. Refuse early, on every native run, for both installs. Do not hide the extension.** The candidates were to check the installed extension in
`prepareNative` for every run and fail with the fix, or to stop Godot loading it. Evidence for the second: the only ways to keep Godot from loading a
`.gdextension` are to change what it finds (rename the manifest, as `gen:types` does around its one headless run; edit `.godot/extension_list.cfg`, which
`import-demo.mjs` rewrites) or to run on a copy of the project (what the stock typings stage does for one generation). The first two mutate files that
another run in the same checkout may be reading, and the copy would need its own import cache for every window. More important, the code editor
decides between its live panel and its read-only panel by whether the class exists in the running Godot (`typeof LiveCompile !== 'function'`,
`demo/src/live-compile-host.ts`), so a hidden stale extension would make the `code-editor` section, and any `--interaction` run without `--only`,
pass on the read-only path while the live path went unexercised; the `live-compile` section could not run at all. Both are the silent pass this
track must not add. A refusal that names a seconds-long copy costs less than any of that, so every run refuses and none hides.

**E2. An absent extension is valid; a half-installed one is not.** The extension is demo-only and optional (live-compile L2): a checkout that never built it
loads nothing, and the code editor says so in a banner. So "installed" means any of its manifest, library or stamp exists, and then it must be the profile's
current build, whole. A manifest with no library (the Web side module builder writes one) would be a late Godot error, so it is refused up front.

**E3. Installing from the target directory needs the target's stamp, and live-compile did not write one.** `engine.requireBuiltLibrary` already trusts
`target[/stock]/react_ui.build.json` (freshness F3). `build-live-compile.mjs` now writes the same stamp
(`live-compile/target[-stock]/live_compile.build.json`) after cargo succeeds, with the same safeguards as the native build: the inputs are hashed first, unless
the target's stamp vouches for them `live_compile_core` and `live_compile_ext` are cleaned so cargo cannot keep an artifact built from other content
(`prepareTarget`), and the stamp is refused if the sources changed during the build. This replaces the old check that compared the library's mtime with the newest
source's mtime, which is the very comparison the freshness track showed cargo itself gets wrong (a restored file keeps its old mtime). Without it a target stamp
would have vouched for a library cargo kept; with it the digest is the one mechanism.

**E4. The switch is an explicit command; a run does not install by itself.** Printing a one-line fix costs the user one command of about a second (table
below); installing automatically would save that, and was not chosen: (a) the install is one set of files per checkout and a run that rewrites it can pull
the library from under a second run's later window in the same checkout (the check before every window would then refuse it, but at the window, not at
the start, and for the wrong run); (b) every other guard here (F9 in `freshness.md`: no `--allow-stale`, no building inside `test:types`) keeps runs from
changing build products, so a verifier's result is a statement about the builds that were there; (c) `dev` and `demo` are long-lived editors, where an
install under a window the developer has open is a surprise. The refusal is the same up-front message either way.

**E5. One mechanism, shared helpers.** `freshness.mjs` gained `installFile` (stage a sibling, check its hash against the stamp, rename; `build-native.mjs`,
`build-live-compile.mjs` and the switch all use it, so `copyFileSync` over a mapped library, which corrupts it, exists nowhere), `assessInstall` /
`installRefusal` (the decision and its message) and `switchBuild` (the decision plus the install). `engine.mjs` and `live-compile-build.mjs` only say where
the installed and target files and stamps are. `writeGdextension` writes the manifest by rename and not at all when it would not change, because a
second run may be reading it.

**E6. The check lives in `prepareNative`, not in each script.** Seven scripts call it (`verify`, `verify:a11y`, `verify:world`, `verify:text-layout`, `dev`, `demo`, `gen:types`); a
new launcher cannot skip the extension. `gen:types` passes `liveCompile: false`: it takes the manifest out of the project while its editor runs, so a stale
extension is no reason to refuse it. `scripts/verify.mjs` changed by one line (`beforeLaunch`); its `usesLiveCompile` block, which the code-editor track
changed, is untouched.

**E7. The switch leaves the Web alone.** The Web side modules (`godot_react_ui.web.wasm`, `live_compile.web.wasm`) are judged by the export's receipt
(freshness F5), not by what is installed, and `build:web` installs them; `switch:engine` neither reads nor writes them.

## Timings and evidence

All on this machine (Apple M1 Max, macOS 26.3), in this worktree, through the gate, one run each. Logs: `artifacts/logs/` (`baseline-switch-native-breaka.log`,
`build-live-compile-both.log`, `refusal-1-stock-navigator.log`, `evidence-sequence.log`, `warm-sequence.log`, `touch-sequence.log`, `mutation-controls.log`).

### What a switch costs

| Switch | Before: build-based | Now: `pnpm switch:engine` |
| --- | --- | --- |
| native library, target stamp fresh, **cargo cold** (this worktree's target directories were cloned from another checkout path, so cargo recompiled godot-rust) | `node scripts/build-native.mjs` to breaka: **2 min 32 s** (`baseline-switch-native-breaka.log`) | 0.05 s |
| native library, source file touched (bytes unchanged: a rebase, a checkout, a restored file), cargo recompiles the crate | `build-native.mjs --engine=stock`: **46.5 s**, `build-native.mjs`: **47.6 s** | 0.04 s to stock, 0.07 s back (both libraries together: 0.21 s and 0.33 s) |
| native library, cargo warm, nothing changed | `build-native.mjs --engine=stock`: 0.72 s, default: 0.47 s | 0.05 s |
| live-compile, cargo warm, nothing changed | `build-live-compile.mjs --engine=stock`: 1.8 s, default: 1.7 s | 0.04 s |
| live-compile, **no build in the target directory** | stock from nothing: 2 min 36 s, breaka after a clean: 1 min 47 s | unchanged: only a compile makes one; the refusal and the switch name the command |

`pnpm switch:engine --engine=stock` with Breaka's builds installed took **0.66 s** wall through pnpm (the script's own timer: native library 0.05 s, live-compile 0.04 s;
the rest is starting node and pnpm), a repeat 0.57 s, and `node scripts/switch-engine.mjs` back to the default 0.19 s to 0.33 s. The script's timer covers hashing the sources (the
API dumps are 7 MB) as well as the staged copy of a 12 MB and an 11 MB file; nothing else runs.

The one-time costs: the first stock native build in this worktree (2 min 36 s) because `target/stock` held a build of older sources, and the first live-compile builds of each
profile (above), which also wrote the target stamps the switch installs from.

### The run that failed late now fails first

Starting with Breaka's builds installed and a current stock build in `target/stock` (live-compile not yet built for stock, `refusal-1-stock-navigator.log`), exit 1 after 0.36 s, no window:

```
$ node scripts/verify.mjs --interaction --only=navigator --engine=stock
Error: The installed libgodot_react_ui.dylib is the breaka profile's, not the stock profile's. The stock library built in target/stock is current, so installing it is a copy and a stamp: run `pnpm switch:engine --engine=stock` first.
The installed liblive_compile.dylib is the breaka profile's, not the stock profile's. Run `node scripts/build-live-compile.mjs --engine=stock` first.
```

With both stock builds present the same command says `pnpm switch:engine --engine=stock` for both lines (0.35 s). Then:

| Step (one gated sequence, `evidence-sequence.log`) | Result |
| --- | --- |
| `pnpm switch:engine --engine=stock` | native library and live-compile installed, 0.66 s wall |
| `node scripts/verify.mjs --interaction --only=navigator --engine=stock` | **landscape and portrait PASSED**, 108 s (includes the build and the editor import) |
| `node scripts/verify.mjs --interaction --only=live-compile --engine=stock` | **PASSED** both windows, 41 s (the announced `live-compile-test-render` error matched) |
| `node scripts/switch-engine.mjs` (back to the default) | both installed from `target` and `live-compile/target`, under 1 s |
| `node scripts/verify.mjs --interaction --only=live-compile` | **PASSED** both windows, 46 s |
| `node scripts/verify.mjs --interaction --only=navigator` | **PASSED** both windows, 99 s |

Each run was `--only=` one section, which the runner reports as PARTIAL (the other sections are not part of this track). Each section ran after another one (`navigator` after `live-compile`, and the reverse),
none was retried, and the last step left the default profile installed. The final state, checked after the touch experiment too: native library and live-compile both the breaka profile's
build of the current sources; `target/stock` and `live-compile/target-stock` both current.

One thing in the first stock log is not this change: the stock editor's import printed `Uncaught Error: unknown module: res://.godot/GodotJS/src/verify-code-editor.js` once (the editor's
resource-type codegen, `jsb.editor.bundle.js`), at the first import after the rebase onto the code-editor work, when `pnpm build` had just created that file in a `.godot` cache cloned from before it existed.
The three later imports did not print it and no verifier window was affected.

### Tests and negative controls

`tests/engine-switch.test.ts` (14 tests: the table on a temporary repository, the install by rename with a descriptor held open across it, the stamp check on the copy, the manifest)
and `tests/engine-switch-wiring.test.ts` (13 tests: the table through the real `engine.mjs`, `live-compile-build.mjs` and `switch-engine.mjs`, copied into a temporary repository with a stub
for `godot --version`; the CLI is run as a subprocess for its output and exit status). Each row of the decision table has a test, for both installs.

Eighteen throwaway mutations of the scripts, each applied to a scratch copy of `scripts/` and the tests (`artifacts/logs/mutation-controls.log`; a scratch tree lacks the repository layout, so 21 older script-argument and engine-profile
tests fail in it with or without a mutation and are subtracted); every one is caught by a test that passes without it:

| Mutation | Caught by |
| --- | --- |
| an available target build is never installed (`install` becomes `build`) | the wrong-profile rows (9 tests) |
| the target build is installed without being checked | no-build and stale rows (12) |
| the install refusal names the compile | the wrong-profile rows (9) |
| the install rewrites the library in place (`copyFileSync` over it) | the descriptor held open across the install |
| the copy is not compared with the stamp | the installed-file-not-the-stamped-file test |
| a required extension may be absent | the absent-extension tests (2) |
| a manifest alone is not an installation | the half-install test |
| the API dump is not an input of the extension | the other-profile-dump test |
| `prepareNative` ignores the extension / checks the library only | the wiring tests (5 and 6) and the launcher list |
| the install writes no stamp | 8 tests |
| the switch writes no manifest | the absent-then-installed test |
| `liveCompile: false` is ignored | the `gen:types` test |
| the switch exits 0 when a compile is needed | 4 tests |
| `verify` checks the library only before each window | the launcher test |
| the live-compile build stops stamping its target (first attempt survived: the guard looked for a substring that appears elsewhere in the file; now it looks for the call) | the guard list in `freshness.test.ts` |
| an absent extension is refused | the absent-extension tests (2) |
| a stale stamp is trusted (digest not compared) | 8 tests |

### Not verified

- `build-live-compile.mjs`'s new clean-and-stamp path ran for real three times (stock from nothing, breaka after a clean, and the warm no-ops), but no test runs it, because it needs cargo: the guard list in `freshness.test.ts` pins that it calls `prepareTarget`, writes `layout.builtStamp` and installs by `installFile`.
- `--probe` and `--faults` switches are exercised in the temporary-repository tests only; no probe or faults library was built.
- `gen:types` (its `liveCompile: false`), `pnpm dev` and `pnpm demo` were not run; they call the same `prepareNative`, tested through the wiring tests.
- The whole interaction suite without `--only` (the code-editor section runs when the extension is installed) was not run; that is the coordinator's regression.
- No Web build or Web verifier: nothing in the Web path changed (E7). No Rust changed, so `cargo test`, Clippy and `cargo fmt --check` were not run.

### Gate results

Run once on the final tree, through the gate (`artifacts/logs/cli-and-final.log`).

| Command | Result |
| --- | --- |
| `pnpm test` | 867 tests, 867 pass, 0 fail, 0 skipped (27 of them new: `tests/engine-switch.test.ts`, `tests/engine-switch-wiring.test.ts`) |
| `pnpm test:types` | clean |
| `tests/verifier-sections.test.ts`, `tests/script-arguments.test.ts` | 44 of 44 (`switch-engine` is in the script-arguments list: it refuses an unknown argument before doing anything) |
| `node scripts/switch-engine.mjs` at the end | native library and live-compile both already the breaka profile's build of the current sources |

An earlier full run of `pnpm test` showed 838 pass and **29 skipped**: the first live-compile build here had cleaned `live_compile_core`, which removed `live-compile-cli`, and the tests that
drive it skip when it is absent (`NEEDS_CLI` in `tests/live-compile-session.test.ts`). The skip is only a line in the output, so it was found by asking where the 29 came from. The build now makes
the CLI again after a clean when it was there (see Limits); rebuilt, nothing is skipped.

## Limits that stay

- The first `build-live-compile.mjs` in a checkout whose live-compile target directories have no stamp (every existing one, once) cleans the two workspace
  crates and recompiles them; their dependencies stay cached unless the checkout moved (a worktree's cloned target directories rebuilt everything: the
  fingerprints name the path).
- A switch installs a build the target directory holds; it cannot tell that the target's library was compiled by another toolchain or engine template (the
  freshness track's limits apply: the toolchain beyond `rust-toolchain.toml`, the engine itself).
- Probe and faults builds switch (`--probe`, `--faults`), but live-compile has none, so an installed extension is only ever the default build.
- Two runs of different profiles in one checkout still cannot overlap: there is one install. The second is refused, which is the point.
- `live-compile-cli` (`--cli`) is not installed and not stamped; it is a test tool. Cleaning `live_compile_core` removes it, so the build makes it again whenever it was there
  (found in this track: the first breaka build here removed the CLI the main checkout has, and the ~29 tests that drive it skipped without saying so in the pass count).

## Merge notes

- Touches `scripts/` (`freshness.mjs`/`.d.mts`, `engine.mjs`/`.d.mts`, `live-compile-build.mjs` and its new `.d.mts`, `build-native.mjs`, `build-live-compile.mjs`, the new
  `switch-engine.mjs`, a line each in `verify.mjs`, `verify-a11y.mjs`, `verify-world.mjs`, `verify-text-layout.mjs`, `generate-types.mjs`), `package.json` (`switch:engine`),
  `tests/` (two new files; the lists in `freshness.test.ts` and `script-arguments.test.ts`), and the notes of the stock-engine, freshness and live-compile tracks.
- After merging, every checkout needs one `node scripts/build-live-compile.mjs` (default profile, and `--engine=stock` where it is used) before the next demo run if the
  extension is installed: the target directories have no stamp, so the build cleans the two crates once. Until then a run is refused with that command.

## README text

Both profiles install their native builds where the demo expects them (`react_ui.gdextension`; and, once built, the demo-only live-compile extension), and each installed build records
which profile built it and from which sources. A native run refuses another profile's build or an older one before Godot starts, and the refusal names the fix. `pnpm switch:engine --engine=<name>` makes the
installed builds that profile's by copying the builds already in its own target directories (`target/stock` and `live-compile/target-stock` for `stock`; a staged copy and a stamp, under a second, no cargo), and for a build
that has no current copy there it prints the build command instead (`pnpm build:native --engine=<name>`, `node scripts/build-live-compile.mjs --engine=<name>`). Finish with `pnpm switch:engine` to leave the
default installed. `--probe` and `--faults` switch the library to the probe or negative-controls build.
