# Track: stock Web (the live-compile Web side module is per profile)

Branch `stock-web`, based on main `36fb6e5`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the paragraph for the
README is at the end). One job: a Web export never contains a live-compile side module built for another profile's Emscripten, and the stock Web verifiers pass whole.

## What was wrong

`node scripts/build-web.mjs --engine=stock` succeeded, and then every stock Web verifier (`verify-web`, `verify-motion-web`, `verify-interaction-web`, `verify-world-web`) failed at page load with
`unknown dylink.0 subsection: 6` and `TypeError: Cannot read properties of undefined (reading '__breaka_lazy_register')`. The logs are the coordinator's `artifacts/logs/stock-web-*.log`.

The chain, each link read from the code and not guessed:

1. The live-compile extension has a Web side module, `live_compile.web.wasm`, built by `scripts/build-live-compile-web.mjs`. That script refused any profile but `breaka`, so the file was linked with Breaka's Emscripten 6.0.12 and Breaka's
   lazy function-table flags, which add a `breaka.lazy-table` custom section and a `dylink.0` subsection (6) that Emscripten 4.0.11's loader does not know, and import `__breaka_lazy_register`, which the stock engine does not provide.
2. The file lived in the one shared install (`demo/addons/live-compile/bin/`) and `writeGdextension()` listed it in the extension's manifest *whenever the file existed*, whichever profile was exporting.
3. Godot copies whatever the manifest lists into the export and the page loads it. The stock export (Emscripten 4.0.11) therefore shipped Breaka's module. Nothing checked it: `engine.requireInstalledWasm` and the receipt's `extension` stamp cover the UI library's side module only.

The native single-build track (docs/tracks/single-build.md) said "the Web stays per profile" and made that true for the UI library's side module. The live-compile module was the one it missed.

## Decision

**S1. Build live-compile's Web side module per profile. Bun's toolchain can target Emscripten 4.0.11, so the stock profile gets a live code editor on the Web.** Proof, not a claim:

| | `breaka` | `stock` |
| --- | --- | --- |
| command | `node scripts/build-live-compile-web.mjs` | `node scripts/build-live-compile-web.mjs --engine=stock` |
| SDK | Emscripten 6.0.12, Binaryen 133, the lazy function-table link flags | Emscripten 4.0.11 (`/Users/ben/Development/godot-stock/emsdk`), its own Binaryen, **no** lazy-table flags |
| toolchain | `live-compile/rust-toolchain.toml`, `nightly-2026-09-15`, `-Zbuild-std=std,panic_abort`, the `wasm` profile (`panic=abort`) | the same |
| build | 160 s wall (cargo 2 min 38 s) | **205 s wall (cargo 3 min 24 s)**, from nothing |
| file | `live_compile.web.wasm`, 8,728,932 bytes (the same size as before this track) | `live_compile.web.stock.wasm`, 8,719,103 bytes |
| `breaka.lazy-table` sections / `dylink.0` | 1 / 1 | **0** / 1 (an ordinary side module) |
| loads in its own engine's page | `verify-live-compile-web.mjs`: 8 assertions passed | `verify-live-compile-web.mjs --engine=stock`: 8 assertions passed; the checker answered (first check 167.6 ms, later median 14.3 ms) |

The stock Web interaction verifier ran every section whole with the code editor on its live panel (below). The build refuses a module whose ABI is not the profile's: a module with a lazy-table section for a profile whose templates do not take it, or without one for a profile that needs it, is not installed.

**S2. An export holds exactly its own profile's module, or none, and "none" means the extension is out of the project, not just its Web lines.** The task allowed this as the alternative to S1; it is kept as the rule for a profile that has no module (a checkout that never built one),
and it is tested for real, because the first version of it was wrong. With the module moved aside and a manifest that listed only the native library, the stock page still failed at load: the manifest is packed, listed and loaded whatever it lists, and the engine logged
`ERROR: No GDExtension library found for current OS and architecture (web.wasm32) in configuration file: res://addons/live-compile/live_compile.gdextension`, which the verifiers count as a browser error. So `build:web` makes such an export with the manifest taken out of the project
(`withoutLiveCompileManifest`, the hiding `gen:types` already did, now one shared helper that also puts back a manifest a killed run left hidden). The pack then names no such file (0 references), and the stock `verify-web` passes on it (261 assertions) where it used to die.

**S3. The module has its own file, stamp and target per profile, and its stamp records the profile.** Breaka's keeps its name; stock's is `live_compile.web.stock.wasm`, with `live_compile.web[.stock].build.json` beside the extension and its own cargo target
(`live-compile/target/web`, `live-compile/target/web-stock`). The stamp is the freshness guard's (docs/tracks/freshness.md): `engine`, the library hash, and the digest of the extension's sources plus the profile's own Web dump pair and the `web` feature, written through the same `beginBuild` as the other builds
(inputs hashed before and after cargo, the workspace crates cleaned unless the target's stamp vouches for them).

**S4. The guard refuses the wrong-profile case before anything runs, in three places.**
- *The export.* `liveCompileWebPlan(engine)`: nothing installed for the profile means the export has none; a module stamped for this profile from the current sources is listed by name; **a module that is installed and is anything else** (no stamp, another profile's stamp, older sources, replaced after it was built) stops the export and names `node scripts/build-live-compile-web.mjs --engine=<name>`. It is never left out silently: the default export must not lose its code editor without saying so. Modules an earlier export left in the output are removed first (Godot copies into the output and never deletes), the exported directory is checked against the plan, and the receipt records `liveCompile`: `{ name, stamp }` or `null`.
- *Every Web verifier.* `engine.requireFreshWebExport` (the call `verify-web`, `verify-motion-web`, `verify-interaction-web`, `verify-world-web`, `verify-live-compile-web`, `probe-web` and `serve-web` already make) now also refuses an export that contains a live-compile module its receipt does not record, one recorded for another profile or built from older sources, one that is not the recorded file, and a recorded one that is missing. An export made before this track has no `liveCompile` field: it is accepted when it holds no module and refused when it does, which is exactly the broken stock export. The fix it names is `pnpm build:web --export-only --engine=<name>`, which in turn names the module build if the installed module is out of date.
- *The live-compile Web section.* `verify-live-compile-web.mjs` refuses an export with no module for its profile (`requireLiveCompileWebModule`), saying its code editor is read-only and what to build.

**S5. The release pack and the deploy are the default profile's and are unchanged.** The release export is made from the same plan; its pack still ships `live_compile.web.wasm` (below).

**S6. Found while proving the read-only path: the demo's no-extension check was an engine error on the Web.** `openExtensionHost` tested `typeof LiveCompile !== 'function'`. Natively a missing class is `undefined`; on the Web naming a class the engine lacks makes it log
`[jsbb] throwing an error ... godot class not found 'LiveCompile'` as a console error, even though the editor's own `try/catch` then shows the read-only panel correctly. A module-less Web export would pass for a user and fail every verifier. It now asks `ClassDB.classExists('LiveCompile')` first (typed, the same answer natively), and its message names the Web build as well as the native one.

## What it does

| State of the profile | Web export (`pnpm build:web --engine=<p>`) | Web verifiers | Code editor in the page |
| --- | --- | --- | --- |
| a module stamped for `<p>` from the current sources | lists it, copies it, records `liveCompile: { name, stamp }` | accept | live |
| no module installed for `<p>` | extension out of the project, no module, `liveCompile: null` | accept; `verify-live-compile-web` refuses up front (nothing to run) | read-only, with its banner |
| the other profile's module only | as the row above: it is a different file and is never listed | as above | read-only |
| a module installed for `<p>` that is not its current build | **the export stops**, naming `node scripts/build-live-compile-web.mjs --engine=<p>` | n/a | n/a |
| an export (old or hand-made) containing a module its receipt does not record, or the other profile's | n/a | **refuse before opening a page**, naming `pnpm build:web --export-only --engine=<p>` | n/a |

## Evidence

All through the gate, in this worktree (main `36fb6e5`), with `PATH="$HOME/.cargo/bin:$PATH"`. Logs in `artifacts/logs/` (`livecompile-web-builds.log`, `stock-web-run.log`, `stock-web-run-2.log`, `stock-web-readonly*.log`, `final.log`, `mutation-controls*.log`).

**The failure shape is refused up front.** With the stock export intact and Breaka's `live_compile.web.wasm` copied into it, `node scripts/verify-web.mjs --engine=stock` exits 1 after 1 s, before a browser starts:
`Error: The Web export artifacts/stock/web-debug should contain the live-compile Web side module live_compile.web.stock.wasm and no other; it contains live_compile.web.stock.wasm, live_compile.web.wasm. Run `pnpm build:web --export-only --engine=stock` first`.

**Stock, whole** (`pnpm build:web --engine=stock`, then, on the final tree):

| Command | Result |
| --- | --- |
| `pnpm build:web --engine=stock` | first run 172 s (UI side module and export); the receipt says `liveCompile: { name: live_compile.web.stock.wasm, engine: stock }`; the manifest lists that file and no other |
| `verify-live-compile-web.mjs --engine=stock` | **PASSED**, 8 assertions, 19 s |
| `verify-web.mjs --engine=stock` | **PASSED**, 261 assertions, 53 captures, 46 s |
| `verify-world-web.mjs --engine=stock` | **PASSED**, 96 assertions, 15 s |
| `verify-motion-web.mjs --engine=stock` | **PASSED**, 433 assertions, 148 s |
| `verify-interaction-web.mjs --engine=stock` | **PASSED, `partial: false`**, every section, 5040 assertions, 578 captures, 1133 s; the code editor ran its live panel (132 checks) |

**Stock with no module** (module and stamp moved aside, `pnpm build:web --wasm-only --engine=stock` then `--export-only`): `receipt.liveCompile: null`, no `live_compile*.wasm` in the export, the pack names no `live_compile.gdextension`, the manifest back in the project afterwards. `verify-web --engine=stock` **PASSED** (261);
`verify-interaction-web --only=code-editor --engine=stock` **PASSED**, and its assertion "Without the compiler the panel says plainly why it is read-only" holds with the banner
`Read-only. The live-compile extension is not loaded: run "node scripts/build-live-compile.mjs", then import the project once (pnpm demo does)` (the wording before S6 named only the native build; it names both now); the touch page says so too. `verify-live-compile-web --engine=stock` refuses before a page opens:
`The stock Web export has no live-compile side module (its code editor is read-only), so there is nothing for this section to run. Run `node scripts/build-live-compile-web.mjs --engine=stock`, then `pnpm build:web --export-only --engine=stock`.` The export log prints three editor `ERROR: ... live_compile.gdextension` lines at startup (the editor's cached extension list still names the hidden manifest); the export itself succeeds and the page is clean.

**Default profile, unchanged:** `pnpm build:web` (the export includes `live_compile.web.wasm`, receipt `liveCompile: { name: live_compile.web.wasm, engine: breaka }`, the manifest lists it); `verify-live-compile-web.mjs` **PASSED** (8 assertions, 18 s);
`verify-web.mjs` **PASSED** (261 assertions, 45 s); `verify-interaction-web.mjs --only=code-editor` **PASSED** (132 checks, live, 84 s).

**Release pack and deploy dry-run (default profile):** `pnpm build:web --release` makes a 32-file pack whose receipt records the module; `node scripts/deploy-web.mjs` lists `live_compile.web.wasm  8.32 MB  2.24 MB brotli  redirect to /o/<hash>/` (total first visit 56.10 MB, 12.27 MB brotli) and uploads nothing (dry run).

**Native, both engines** (the demo's extension check changed): `node scripts/verify.mjs --interaction --only=live-compile,code-editor` on Breaka's 4.8 (106 s) and with `--engine=stock` (104 s): **PASSED**, landscape and portrait, live-compile 1541 checks and code-editor 3546 on the live panel.

**Unit suites:** `pnpm test` 905 tests, 905 pass, 0 skipped; `pnpm test:types` clean on both profiles.

### Tests and negative controls

`tests/stock-web.test.ts` (12 tests) runs the real `engine.mjs`, `freshness.mjs`, `live-compile-build.mjs`, `native-binding.mjs` and `web-content.mjs` in a temporary git repository (`tests/skeleton.ts`, the helper `tests/single-build.test.ts` now shares), with export presets and fake templates, so `engine.requireFreshWebExport` runs for real:
the names and targets per profile; no module / the other profile's module / the profile's own; every way an installed module can fail to be current (another profile's stamp, older sources, the profile's own Web dump, replaced, stamp or file missing) is refused with the build command and the other profile's dump does not stale this one;
the broken stock export refused up front (receipt from before the field, receipt `null`, receipt naming the Breaka stamp); an export with the module accepted for each profile and refused when the file is missing, replaced, doubled, recorded for the other profile or stale; the manifest taken out and put back whatever happens (a throw, a killed run's leftover, a stale leftover, no manifest at all); the live-compile Web section refused for a module-less export; and the wiring of the real scripts.
`tests/freshness.test.ts`, `tests/engine.test.ts` and `tests/single-build.test.ts` follow the new names.

Twenty-five throwaway mutations, each applied to a scratch copy of `scripts/`, the demo's host file and the tests (`artifacts/logs/mutation-controls*.log`; the scratch tree has no repository layout, so one older test fails in it with or without a mutation and is subtracted), **every one caught**: the stock profile using Breaka's module file; an installed module that is not current accepted, or silently left out;
a module the receipt does not record accepted; an export from before the field accepted with a module; any file name accepted for the recorded module; the recorded stamp not checked; `requireFreshWebExport` not checking the module; stale modules not removed; the manifest listing a Web library whatever the caller says; the export not clearing stale modules, not writing the manifest for the profile, not recording the module, not hiding the manifest for a module-less export;
the module stamped for Breaka whatever the profile; only Breaka's file name recognised; one stamp for both profiles; the module judged against the native inputs; the live-compile section not refusing a module-less export; its verifier skipping the check; the helper not hiding the manifest, not restoring it after a throw, not restoring a killed run's; the demo naming `LiveCompile` before asking `ClassDB`; `gen:types` leaving the shared helper. Two survived at first (the refusal inside the verifier script, and `gen:types` using the helper): the first check moved into the shared module so a test reaches it, the second pinned in the guard list; both are caught now.

## Not verified

- **The stock Web module on a real Safari or iPad**: only headless Chrome ran, as for every Web verifier here.
- **The stock live-compile module's size and load cost** were not measured against Breaka's beyond the file sizes (8.72 MB and 8.73 MB); the page fetches it at startup like the other side modules (docs/tracks/web-load.md).
- **The deploy was a dry run**; nothing was uploaded, and the stock profile has no deploy.
- **`--probe` Web builds** were not run.
- **The export log of a module-less export prints three editor `ERROR` lines** for the hidden manifest (cached extension list). They are the editor's, before the export, and do not fail it; a fix would be to rewrite the cached list, which this track did not do.
- **Native `code-editor` and `live-compile`** ran on both engines, but only those two sections: the demo change is the one line that asks `ClassDB` first.

## Merge notes

What every checkout must build once, after merging:
1. `node scripts/build-live-compile-web.mjs` (default profile, about 2 min 40 s): the existing `live_compile.web.wasm` has no stamp, so `pnpm build:web` and every default Web verifier say so and name this command until it is rebuilt.
2. `node scripts/build-live-compile-web.mjs --engine=stock` (about 3 min 25 s) if the stock Web export should have the live code editor. Without it the stock export builds, passes its verifiers and has a read-only code editor that says so.
3. `pnpm build:web --engine=<name>` per profile (an old export that contains a module its receipt does not record is refused until re-exported; `--export-only` is enough when the UI side module is current).
4. As before, the UI library's Web side module is one shared slot: after a default build, `pnpm build:web --wasm-only --engine=stock` installs stock's before a stock export, and the export says so if it is not.

Touches `scripts/` (`live-compile-build.mjs`/`.d.mts`, `build-live-compile-web.mjs`, `build-web.mjs`, `engine.mjs`, `verify-live-compile-web.mjs`, `generate-types.mjs`), one line of `demo/src/live-compile-host.ts`, `tests/` (the new `stock-web.test.ts` and `skeleton.ts`, and the lists in `freshness.test.ts`, `engine.test.ts`, `single-build.test.ts`), and the notes of the Web, live-compile and single-build tracks.

## README text

The Web builds are per engine profile. A Web side module must be linked with the Emscripten of the engine that loads it (6.0.12 for Breaka's, 4.0.11 for stock's), and that holds for the live-compile extension's module as well as the UI library's: `node scripts/build-live-compile-web.mjs [--engine=stock]` builds `live_compile.web.wasm` or `live_compile.web.stock.wasm`
and stamps it with its profile. A Web export contains exactly its own profile's module or none (a profile with no module gets a read-only code editor that says so), records it in its receipt, and every Web verifier refuses, before opening a page, an export that holds any other live-compile module. The native library and extension are still one build for both engines (docs/tracks/single-build.md).
Details: [docs/tracks/stock-web.md](docs/tracks/stock-web.md).
