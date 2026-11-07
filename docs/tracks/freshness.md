# Track: freshness guard (installed builds against the source)

Branch `freshness`, based on main `64e674c`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md` and
`docs/INTERACTION_PROGRESS.md` are not edited here. One job: no run, export or typecheck may silently use a native library, Web
side module or set of typings that is older than the source. This closes the "Owed" item in `docs/tracks/stock-engine.md` (a
freshness guard for the installed native library and Web side module). It is a guard in the scripts: no Rust, no TypeScript
renderer and no demo code changed.

Three false results produced it:

1. A stock Web run failed with `Invalid native node.scroll`: the installed Web side module predated a rebase (stock-engine S10, S13).
2. A stock `test:types` failed after a rebase onto a phase that added `#[func]`s: the stock library, and so the stock typings generated
   from it, had not been rebuilt, and the typecheck reported the missing methods as type errors.
3. A negative control restored a Rust file with its old mtime. Cargo compares mtimes, so it kept the artifact built from the mutant, and a
   full gate ran against a stale mutant dylib. A guard built on mtimes would have missed this too.

## What it does

A build records a digest of what it was made from; a run recomputes it from the working tree and refuses on a difference, before any
window or browser opens, naming the files that differ and the command that fixes it.

| Where | What is checked | Fix it names |
| --- | --- | --- |
| `prepareNative` (`verify`, `verify:interaction`, `verify:motion`, `verify:a11y`, `verify:world`, `verify:text-layout`, `demo`, `dev`) | installed library's stamp: profile, probe flag, library hash, digest. Since the engine-switch track also the installed live-compile extension's, if one is installed | `pnpm build:native [--probe] [--faults] --engine=<name>`, or `pnpm switch:engine [--probe] [--faults] --engine=<name>` when the profile's target directory holds a current build (docs/tracks/engine-switch.md) |
| `build:web` (export step, `--export-only`) | installed Web side module's stamp | `pnpm build:web --wasm-only [--probe] --engine=<name>` |
| `verify:web`, `verify:motion:web`, `verify:interaction:web`, `scripts/verify-world-web.mjs`, `demo:web`, `scripts/probe-web.mjs` | the export's `build-receipt.json` (`extension` is the side module's stamp; `content` the digest of the pack, shell and template inputs; `files` each exported file's size and hash) and the exported `.wasm` beside it | `pnpm build:web [--release] [--probe] --engine=<name>`, or `pnpm build:web --export-only` when the pack, shell, template or an exported file is what moved |
| `test:types --engine=stock`, `gen:types --engine=stock` | the stock library cargo left in `target/stock` (what the typings are generated from) | `pnpm build:native --engine=stock` |
| `gen:types` (default profile) | the installed library (the editor writes the tracked typings from it) | `pnpm build:native` |
| `build:native`, `build:web` | cargo's target stamp: whether cargo's artifact is a build of these sources (F3) | cleans this crate itself |

`tests/freshness.test.ts` also lists every script that calls `selectEngine(` with the guard it must call, and fails for a script that is
not listed, so a new verifier cannot run unguarded.

## Decisions

F1. **The digest is of file contents, per file, plus the cargo features.** Evidence: cargo's freshness check is mtime based, and the third
false result above is exactly a restored file whose mtime is older than the build. A content hash does not care. Inputs
(`scripts/freshness.mjs`, `collectInputs`): every file under `native/` except `native/api/` and Markdown; `Cargo.toml`, `Cargo.lock`;
`build.rs`, `rust-toolchain.toml` and `.cargo/config.toml` when present; the profile's API dump pair (`native/api/*.json` for `breaka`,
`native/api/stock-4.7.2/*.json` for `stock`); and the cargo features (`probe` for a native probe build, `filter-faults` for the filters negative-controls build
(`pnpm build:native --faults`, `verify --interaction --only=filters-faults --faults`), `web` and `probe` for Web), so a
probe or faults build is never fresh for a default run. Each file's hash is kept in the stamp (about 4.8 KB), not just one combined digest: a refusal
that says `changed: native/props.rs` is actionable where "digest mismatch" is not. Left out on purpose: the other profile's dumps (editing
them must not stale this profile), Markdown (`native/PROTOCOL.md` is prose; `include_str!` of `tests/fixtures/*.json` is under
`#[cfg(test)]` modules, `native/commit.rs:439`, `native/props.rs:1098`). `native/probe.rs` and `native/text_layout_probe*` are inputs of the
default digest although only `--features probe` compiles them: a probe-only edit makes a default build stale and costs one crate rebuild
(27 s here), which is the conservative side. A check costs about 14 ms (47 files, 7 MB of dumps).

F2. **One stamp format, written in three places; no second mechanism.** The existing stamp (`react_ui.build.json`,
`react_ui.web.build.json` beside the installed artifact: `engine`, `probe`, `library`, `sha256`) gains `features`, `digest` and `inputs`.
The same stamp is written beside cargo's own output (`target/react_ui.build.json`, `target/stock/...`, `target/web/react_ui.web.build.json`)
and into the Web export's receipt as `extension`. `findProblem` is the one comparison: missing library or stamp, wrong profile or probe flag,
a library replaced after it was stamped, a stamp from before the guard (no digest), then the content comparison. Stamps are written to a
sibling file and renamed, so a reader never sees half of one. An unreadable stamp counts as a missing one.

F3. **A build does not trust cargo's mtime check; it cleans this crate unless the target's stamp vouches for the sources.** The simplest
correct way: before `cargo build`, `engine.beginBuild` hashes the inputs and compares them with the stamp in cargo's target directory
(written after the last successful build there). If it is missing, differs, or its recorded library hash is not the file now in the target
directory, it deletes the stamp and runs `cargo clean --locked -p godot-react-ui --release` (`--target wasm32-unknown-emscripten` for Web),
which removes this crate's artifacts and nothing else, so cargo has to compile it again. Cargo then rebuilds only the crate. The stamp is
removed *before* the clean and written *after* a successful compile (and only if the sources did not change while it ran), so an
interrupted build never leaves a stamp that vouches for what is left. Not chosen: always cleaning (a no-change `build:native` would recompile
every time); touching source files to bump their mtimes (it edits the user's tree and still needs the comparison); a `build.rs` that emits
the digest through `rerun-if-env-changed` (it would work, and would even embed the digest in the binary, but adds a Rust file to the crate for a
problem the scripts can solve). The Web `cargo clean` was checked without a Web build against a fabricated target layout (below).

F4. **Every path that runs an installed build checks it first** (table above). The check sits where the profile and binary are already
verified (`prepareNative`) rather than in each script, so the native verifiers, `demo` and `dev` get it from one call; the Web scripts call
`requireFreshWebExport`. `serve-web` takes `--probe` to serve a probe export, as `build:web --probe` makes it, because a probe export is
correctly refused as a default one.

F5. **A Web run is judged by its export, not by whatever side module is installed.** The browser runs `artifacts/web-<mode>/` (`artifacts/stock/web-<mode>/` for the stock profile)
(`godot_react_ui.web.wasm` is copied there), and the installed side module may legitimately belong to the other profile at that moment. So
`build:web` stamps the receipt with the side module's stamp, and the verifiers and the server compare the receipt's stamp with the working
tree *and* the exported `.wasm`'s hash with the stamp. The export step itself still refuses a stale installed side module
(`requireInstalledWasm`), which is where the false result 1 would have been caught. An export made before the guard has no `extension`,
and is refused once.

F6. **Stock typings are tied to the same digest, and a typecheck never builds a library.** `ensureStockTypings` and `generateStockTypings`
first call `requireBuiltLibrary`: the library in `target/stock/release` must be a build of the current sources (its target stamp), or the
command refuses with `pnpm build:native --engine=stock`. The typings record (`target/stock/typings.json`) gains `sourceDigest` next to the
library hash, so declarations are regenerated, as before and cheaply (a headless stock editor, about 10 s), whenever the library they list was built
from different sources. Not chosen: rebuilding the library from inside `test:types` (minutes, and silent). Note the fix command also
installs the stock library over the installed path (stock-engine S3); `pnpm build:native` puts the default back, and is quick when its
target stamp is fresh. (Since the engine-switch track, `pnpm switch:engine` does that from the target directory without running cargo at all.)

F7. **Interruption and races.** The inputs are hashed before cargo runs and again after it; if they differ the build fails instead of
stamping a result that mixes two source states (a refusal later is the safe direction). While a build runs the installed library and its
stamp are still the old, matching pair, so a run started during a build is refused if the sources moved, and the library is replaced by
rename as before (running Godots keep their inode). Between the rename and the stamp write there is a window of a few milliseconds in which
a run sees a library that differs from its stamp and is refused with "replaced after it was built"; rerun it.

F8. **`gen:types` on the default profile checks the installed library first.** The Breaka editor writes the tracked `demo/typings` and
`demo/gen` from the installed library; generating them from a stale one would commit wrong declarations. The check comes before `pnpm build`.

F9. **`pnpm dev` checks once, at startup, and does not police the session.** No watch mode in this repository rebuilds native code: the
only watcher is esbuild's, for the TypeScript bundle, which the guard does not concern; the editor maps the library at launch, extension
hot reload is off, and a native rebuild is a restart (README). So the one moment a stale library can slip into a dev session is its start, where
`dev.mjs` now refuses (and does so before it creates the esbuild watcher or the editor, which it did not before). A rebuild running in
another terminal is safe: the old library and stamp stay a matching pair until the rename, and a `dev` started in that window is refused
with the sources-changed message, which is correct. Edits to Rust sources during a running session are the developer's work in progress
and are not reported; the next start of `dev` or of any verifier is. Not added: an override flag (`--allow-stale`). An escape hatch would
reopen the silent case this exists to close, and the fix is one command. Live iteration of the TypeScript side is untouched.

F10. **Known limits.**
- *Dependencies.* The forced clean is of this crate. godot-rust's bindings are generated from the API dump by dependency build scripts that
  cargo tracks by the dump's path and mtime. Replacing a dump by regenerating it from an engine gives it a new mtime and cargo rebuilds the
  bindings; restoring an old dump *with its old mtime* would fool cargo for them, and the guard (which does see the content) would clean this
  crate but not them. A dump is not edited by hand; if it ever is, `cargo clean` the profile's target directory.
- *Not inputs.* The Rust and Emscripten toolchains beyond `rust-toolchain.toml` (Web's pinned nightly is in `engine.mjs`), the engine and
  its templates, the compiled JavaScript (`pnpm build` and the pack have their own typecheck gate) and the tracked `demo/typings`.
- *A hand-run `cargo build`* outside the scripts changes the library under a stamp that does not describe it; the stamp's library hash
  then differs, and the next `build:native` cleans and rebuilds.
- *Cost.* The first `build:native` or `build:web` in a checkout whose target directories have no stamp (every existing one, once) recompiles
  this crate (27 s on this machine with the dependencies cached). The first build in this fresh worktree took 2 min 20 s because the
  godot-rust crates also compiled; the later builds recompiled only this crate, so that was the cloned target's own state (it was built at
  another checkout path), not the clean.

## Evidence

All from the command line, in this worktree. The messages are what the scripts printed.

Installed library missing (nothing built yet), a Web export missing, the installed side module missing:

```
Error: No breaka build of libgodot_react_ui.dylib is available: the installed libgodot_react_ui.dylib or its build stamp is missing. Run `pnpm build:native --engine=breaka` first.
Error: No breaka Web export artifacts/web-debug exists: .../artifacts/web-debug/build-receipt.json is missing. Run `pnpm build:web --engine=breaka` first.
Error: No breaka build of godot_react_ui.web.wasm is available: the installed godot_react_ui.web.wasm or its build stamp is missing. Run `pnpm build:web --wasm-only --engine=breaka` first.
```

The stock library installed, a default-profile run (profile mismatch, existing check):

```
Error: The installed libgodot_react_ui.dylib is the stock profile's, not the breaka profile's. Run `pnpm build:native --engine=breaka` first.
```

`native/lib.rs` edited (a string the library carries, `Invalid commit JSON (MUTANT)`), with the stock library built from the original installed
and stamped in `target/stock`:

```
$ GODOT_REACT_ENGINE=stock pnpm test:types
Error: The stock library built in target/stock is stale: it was built from different sources than the working tree (changed: native/lib.rs). Run `pnpm build:native --engine=stock` first.
$ pnpm verify:interaction --engine=stock --only=events
Error: The installed libgodot_react_ui.dylib is stale: it was built from different sources than the working tree (changed: native/lib.rs). Run `pnpm build:native --engine=stock` first.
```

The restored-mtime case, end to end (default profile). The mutant was built and installed by `pnpm build:native` (the marker string is in the
dylib). `native/lib.rs` was then restored with `cp -p` from a backup: same bytes, same mtime as before the edit (18:58:37, 19 minutes
before the mutant build, 19:17:04).

```
$ cargo build --locked --release            # what build:native ran before the guard
    Finished `release` profile [optimized] target(s) in 0.38s
$ strings target/release/libgodot_react_ui.dylib | grep -c MUTANT
1                                           # cargo kept the mutant
$ pnpm verify:interaction --only=events     # no window opens
Error: The installed libgodot_react_ui.dylib is stale: it was built from different sources than the working tree (changed: native/lib.rs). Run `pnpm build:native --engine=breaka` first.
$ pnpm build:native
The breaka library built in target is stale: it was built from different sources than the working tree (changed: native/lib.rs). Cleaning godot-react-ui so cargo rebuilds it from the current sources (its dependencies stay cached).
   Compiling godot-react-ui v0.1.0 (...)
    Finished `release` profile [optimized] target(s) in 27.48s
$ strings demo/addons/godot-react-ui/bin/libgodot_react_ui.dylib | grep -c MUTANT   # and target/release's
0
```

The installed stamp's digest after that (`68eaaa95...`) equals the digest computed from the pristine tree before any edit. A content edit of
`native/props.rs` (appended comment, new mtime) is refused with `changed: native/props.rs`; restoring it (`cp -p`) makes `prepareNative` pass again.

The Web `cargo clean` was validated without a Web build: a fabricated `wasm32-unknown-emscripten/release` layout in a scratch target
directory (one fingerprint directory and `deps/` files of `godot-react-ui`, one `serde` rlib, the uplifted `godot_react_ui.wasm`), then
`cargo +nightly-2026-05-15 clean --locked -p godot-react-ui --release --target wasm32-unknown-emscripten` removed the five files of the crate
(including the uplifted `.wasm`) and left the `serde` rlib.

## Gate results

Each ran once, at the end, on the final tree.

| Command | Profile | Result |
| --- | --- | --- |
| `pnpm test:types` | breaka | clean |
| `pnpm test:types` | stock | clean. It needed `pnpm build:native --engine=stock` first (2 min 19 s, the first build here), which stamped `target/stock`; the typings were regenerated once (18 files, 10 s) because their record had no `sourceDigest`, and not again on the second run |
| `pnpm test` | n/a | 332 passed, 15 of them new (`tests/freshness.test.ts`) |
| `pnpm build:native` | breaka | `Finished` in 0.33 s with no clean (the target stamp vouched for the sources); the installed stamp reads `probe: false`, `features: []`, digest `68eaaa95...`: a default build is installed |
| `pnpm verify:interaction --only=events` | breaka | passed, landscape and portrait (section 25.9 s and 26.1 s, 1 min 3 s in all); one `window-focus-loss` disturbance in each, reported and passed, no re-run |
| Each refusal from the command line | breaka, stock | demonstrated once above, before any window opened |

Not run, as asked or because nothing relevant changed: `cargo test` and Clippy (no Rust changed; `native/lib.rs` and `native/props.rs` were edited
for the demonstrations and restored byte for byte, `git diff native/` shows only `native/api/README.md`), a Web build (the `cargo clean`
command was validated against a fabricated layout instead, and `beginBuild('web', ...)` was exercised with a stub `clean`), the other native
and Web verifiers.

## Merge notes

- Touches `scripts/` (new `freshness.mjs`/`.d.mts`; `engine.mjs`/`.d.mts`, `build-native.mjs`, `build-web.mjs`, `typings.mjs`, `dev.mjs`,
  `generate-types.mjs`, `serve-web.mjs`, `probe-web.mjs` and the four `verify*-web.mjs`), `tests/freshness.test.ts`, `README.md`,
  `docs/WEB.md`, `native/api/README.md` and this file. `engine.mjs` is shared with the other worktrees' scripts only through its API:
  `recordInstalledLibrary` and `recordInstalledWasm` are gone (the build scripts use `engine.beginBuild`); nothing else called them.
  A track that adds a script calling `selectEngine(` must add it to `GUARDS` in `tests/freshness.test.ts` and call `prepareNative` or
  `requireFreshWebExport`.
- After merging, every checkout needs one `pnpm build:native` (and `pnpm build:web` where it exports) before its next verify: the installed
  stamps have no digest, so they are refused once ("built before the freshness guard"), and the target directories have no stamp, so the
  build cleans this crate once. A Web export made earlier is refused once the same way. The stock typings regenerate once.
- No Rust changed, so rebasing the Rust-heavy tracks over this has no conflicts beyond `scripts/`.
