# Track: live compile (the checker, the compiler and the hot swap under the demo's code editor)

Branch `live-compile`, based on main `d282fee` and rebased onto `5956068`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`,
`docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the paragraph for the README is at the end).

Ben's goal: the demo's labs get a revealable code editor, and "you should be able to modify the TSX and see the components update on the same
page. With type checking and compilation handled by bun TSC." This track builds everything under that editor, driven from code, and no editor:
Bun's TypeScript checker, Bun's compiler, and a swap into the running page that keeps state.

## Ben's direction, and what the measurements say about it

The first plan was WebAssembly (UCGE's `bun_sema` module in a worker). Ben's direction, relayed by the coordinator: "May be we need to wrap bun
Rust in a GDExtension, the same way we do for our UI rust lib." It is a separate demo-only extension, `live_compile`, with its own `.gdextension`
under `demo/addons/live-compile/`. The numbers agree with it on the native side, and decide one thing on the Web.

| Question | Answer | Evidence |
| --- | --- | --- |
| Does `WebAssembly` exist in GodotJS's native V8? | **No, on either engine, on the main thread or in a `JSWorker`.** | `typeof WebAssembly` is `"undefined"` in Breaka's 4.8 and stock 4.7.2, main and worker (a probe scene, `--headless`). The V8 12.4 monolith GodotJS ships is built with `v8_enable_webassembly = false`: `libv8_monolith.a` has the strings "WebAssembly is disabled" and "WebAssembly support is not enabled", and 4 `v8::internal::wasm::` symbols. A wasm checker could not run natively in either engine. |
| Are `eval` and `new Function` allowed? | **Yes, in every realm tried.** | `new Function('a','return a+1')(1) === 2`, indirect and direct `eval` work on both engines, main and worker. On the Web GodotJS loads its own modules through the browser's `eval`. The hot swap depends on it. |
| `Worker`, `TextEncoder`, `queueMicrotask`, `fetch`, `structuredClone`, `performance` natively | **None exist.** `setTimeout`, `SharedArrayBuffer`, `Atomics`, `require` do. | Same probe. Recursion depth until `RangeError`: about 9,300 frames on the main thread and in a worker. |
| Does `bun_sema` write JavaScript? | **No: it is a checker.** | `bun_sema` has no emit. "Compile" is Bun's `bun_js_parser` and `bun_js_printer`. |
| Do Bun's crates build for `wasm32-unknown-unknown` and native? | **Yes**, with the patches in `live-compile/patches/`. | Both targets check and build; see Build. |
| Do they build on the toolchain the repository already uses for the Web (`nightly-2026-05-15`)? | **No.** `core::alloc::AllocatorClone` does not exist there: Bun's revision needs `nightly-2026-09-15` or newer. | `cargo check` on `nightly-2026-05-15`: `E0405` in `bun_alloc/MimallocArena.rs:552`. So the extension has a third toolchain (`live-compile/rust-toolchain.toml`), for native and for the Web. |
| Can the extension be a Web side module, given the UI extension's recipe needs `-Z emscripten-wasm-eh=false`? | **Yes, built on the first real attempt**; see Web. | That switch exists on `nightly-2026-05-15` and is gone on `nightly-2026-09-15`. The module is built with `panic=abort`, which leaves it no landing pads, and has no exception imports. |

## Decisions

**L1. A GDExtension, not a worker, natively; the same extension as a Web side module on the Web.** Natively there is no WebAssembly to run a wasm
checker, so a GDExtension is the only route that does not need a second process; a native process (`live-compile-cli`) exists too, as a test tool.
On the Web the side module is the same code in the same typed API.

**L2. Separate extension, separate toolchain, demo-only.** `live-compile/` is its own cargo workspace (`core`, `ext`) with its own `rust-toolchain.toml`
and `.cargo/config.toml`; nothing in `native/`, `Cargo.toml` or `src/` knows it exists, except one small hunk in `src/renderer.ts` (L7). The demo has
no `.gdextension` for it unless a build wrote one (`demo/addons/live-compile/` is generated and ignored), so a checkout that never built it loads and
logs nothing, and the `live-compile` section is opt-in (`NATIVE_OPT_IN_SECTIONS`).

**L3. One tree of Bun's crates.** `live-compile/scripts/vendor-bun.py` extracts 35 crates at Bun revision `408c9374b266` into `live-compile/vendor/bun`
(generated, ignored, `--verify` mode): UCGE's closure of `bun_sema` and the parser/printer closure that a sub-agent worked out, merged. Seven reviewed
patches (`live-compile/patches/`) are applied to pristine upstream files, each with its reason in the script's `SOURCE_ADAPTATIONS`; two crates are
replaced by stand-ins in `live-compile/stubs/` (`bun_crash_handler`, `bun_io`: the parser and printer use a few functions of each, and the real ones are
the signal handlers and the event loop); `bun_options_types`, `bun_sourcemap` lose the install and source-map-reading code. Everything else is Bun's, byte
for byte (`provenance.json`).

**L4. The library answers JSON requests; the extension owns a thread.** `live_compile_core::Service::handle` takes one request and gives one response.
Three front ends call it: the extension (`ext/lib.rs`), `live-compile-cli` (frames on stdin and stdout) and a WebAssembly export. The extension is a
main-thread extension, as `godot_react_ui` is (no gdext `experimental-threads`): the checker runs on a plain Rust thread that touches no Godot API and
talks in strings. A check is a request that returns an id and is answered through `poll()`; a newer check supersedes one that has not begun
(single flight, as UCGE's session). `compile` waits for its answer (milliseconds). Nothing runs while nothing is asked: the thread waits on a condition
variable, and JS polls (a 1 ms timer) only while a check is outstanding.

**L5. Type errors do not block running.** As in a browser dev server: `update` sends the text to the checker and compiles and swaps the same text
regardless; the type diagnostics arrive separately (`UpdateReport.check`). A syntax error does block, because there is nothing to run.

**L6. Compile means Bun's parser and printer plus a lowering pass of ours.** Bun's printer prints ES modules; its CommonJS form is made by the
bundler's linker, which has no single-file mode. `core/lower.rs` is that conversion over Bun's own AST: each import becomes a `require` of the module's
namespace and every use of an imported name a property read off it at the time of the use (live bindings, through the parser's `namespace_alias`),
each export a getter on `exports` defined before anything runs (so a cycle sees what ES modules see). The result is a function body with
`require`, `exports`, `module`, `$RefreshReg$` and `$RefreshSig$` as free identifiers. React Fast Refresh is the parser's own option
(`features.react_fast_refresh`), as Bun's bundler uses it, not ours. JSX is the automatic runtime with the production calls (`jsx`, `jsxs`).

**L7. The renderer registers with the DevTools hook, and bundles the production builds of React.** `scripts/build.mjs`
bundles the production build of React and `react-reconciler` (`process.env.NODE_ENV = "production"`). `src/renderer.ts`
registers with `__REACT_DEVTOOLS_GLOBAL_HOOK__` on the first `createRoot` if one is installed, passing `bundleType: 0`
(`bundleType: PRODUCTION_BUNDLE`). The host config also gained `rendererVersion` and `rendererPackageName` (which the
reconciler reads for the call). `demo/src/live-compile-refresh.ts` preserves component state across edits via stable family
proxy components (replacing the proxy identity when `$RefreshSig$` changes) without needing the development reconciler or
`react-refresh/runtime`.

**L8. The module registry is stable under edits.** `require` answers a module's *namespace*, a `Proxy` that reads the module's current exports at the time
of each use, so a module that is evaluated again is seen by every importer without evaluating them (live bindings across versions). A module that
exports something that is not a component (a constant an importer read when it ran) is propagated to its importers, Metro's rule
(`isRefreshBoundary`). An edit is transactional: compile, evaluate (with whatever it newly imports), and only then register the components with
Fast Refresh, so a module that throws halfway leaves the families as they were.

**L9. A render that throws is rolled back by running the last good source again, and its state is lost.** React discards the tree whose render threw.
The session catches that with an error boundary, puts the registry's previous instances back, and evaluates the last good source again: the Fast
Refresh runtime registers each function once and ignores one it has seen, so a family can be given old code only as new functions (a first version that
registered the old functions again left the failed code in the family; the Node test of the session found it). The page renders from a fresh boundary and
shows the last good version, with its state started again, which is the limit of what React keeps (asserted by the section). Preflighting the render in
a throwaway root was considered and not done: it would run the component's effects.

**L10. The editor's calls never block on the checker.** `compile` waits (milliseconds, bounded at 30 s so a thread that never runs is an error and not a
hung page); a check, a hover and a set of inlay hints are requests answered through `poll`. The reply carries the service thread's own time
(`serviceMs`), because JavaScript sees an answer a frame later at the soonest: its timer fires once a frame.

**L11. Hover and inlay hints are in, completions are not.** `core/services.rs` drives `bun_sema`'s `Services` (the API TypeScript's own checker gives a
language service): `node` at a position, `type_at_location`, `type_to_string`, `symbol_at_location`, `resolved_signature`, `signature_info`. See Limits.

## What was built

```
live-compile/                       its own cargo workspace and toolchain (nightly-2026-09-15); nothing in native/, src/ or Cargo.toml depends on it
  scripts/vendor-bun.py             extracts 35 of Bun's crates at 408c9374b266 into vendor/ (generated, ignored); --verify
  patches/, stubs/                  seven reviewed patches, two stand-in crates; every one is listed with its reason in the script
  core/                             live_compile_core: Service::handle(request) -> JSON; check.rs, transpile.rs, lower.rs, services.rs;
                                    main.rs is live-compile-cli (frames on stdin/stdout), wasm.rs the wasm32-unknown-unknown exports
  ext/                              live_compile_ext: the GDExtension, class LiveCompile; one thread, a queue, a reply list
  types/                            react-refresh/runtime's declarations (the package has none)
demo/src/live-compile-protocol.ts   the JSON the library speaks, as types, with validators
demo/src/live-compile-host.ts       LiveCompileHost: compile, setFile, requestCheck, hover, inlayHints, over the extension
demo/src/live-compile-modules.ts    the module registry: namespaces, transactions, boundaries
demo/src/live-compile-refresh.ts    React Fast Refresh runtime glue
demo/src/live-compile-root.tsx      the error boundary the lab is mounted in
demo/src/live-compile-session.ts    LiveSession: open, update, check, hover, inlayHints, unmount   <- what the editor calls
demo/src/live-compile-open.ts       the session over this bundle's React and library
demo/src/verify-live-compile.ts     the `live-compile` section
scripts/live-compile-project.mjs    writes demo/live-compile/project.json (lab sources, declarations, lib files)
scripts/build-live-compile.mjs      builds and installs the extension (and --cli the native process); stamp for the freshness guard
scripts/build-live-compile-web.mjs  builds the Web side module
scripts/live-compile-agreement.mjs  Bun's checker against tsc on every lab and on broken edits; compiles every lab file
scripts/verify-live-compile-web.mjs the section in Chrome
```

### What the editor phase calls

```ts
const session = openLiveSession({ root, labId: 'inputs', exportName: 'InputsLab' }); // demo/src/live-compile-open.ts; throws, saying how, if the extension is not built
session.open();                                       // sends the project to the checker, compiles and runs the lab, mounts it
const report = session.update(path, text);            // on each change: compile, run, refresh. Synchronous; never throws for a bad edit
report.outcome;       // 'swapped' | 'compile-failed' | 'evaluation-failed' | 'render-failed' (the last good page is on screen in all three)
report.diagnostics;   // syntax errors, with UTF-16 start/end/line/character
report.error;         // the message a module or a render threw
report.timings;       // compileMs, swapMs, totalMs
await report.check;   // the type check of this text: { kind: 'checked', report: { diagnostics: [{ pos, end, code, category, messageText, ... }] } } | 'superseded' | 'failed'
await session.hover(path, offset);                    // { start, end, name, type } | null
await session.inlayHints(path, from, to, 'literals'); // [{ position, kind: 'type' | 'parameter', label }]
session.sourceOf(path); session.sources;              // the text a module last ran from; the lab's files, component first
session.unmount();
```

A `LiveSession` is for one lab (`demo/src/labs.tsx`'s `sources`). `project.json` holds every lab, so switching lab is a new session.

## Commands and results

Every number below is from this machine while it was starved (load average 20 to 120 on 10 cores through the session), so they are slower than a quiet
machine would give. Native: Breaka's 4.8 engine, Compatibility renderer, `Window` 1120 x 800 (landscape) and 600 x 900 (portrait), invisible quiet windows.

| What | Command | Result |
| --- | --- | --- |
| Bun's checker against `tsc` | `node scripts/live-compile-agreement.mjs` | **37 of 37 agree** (code, start and end, per file): all 23 labs (0 diagnostics each, in both), nine broken edits of the Controls, Frosted glass and Forms labs, the section's four type-correct edits (0 in both) and its type error (TS2322 at offset 1953 in both) and syntax error (at the semicolon, offset 1962, in both). One message (an unknown attribute on `Text`) differs in words (TypeScript 7.0.2's against 5.9.3's text), never in code or position. Bun 5 to 27 ms a check (the first of a run 14 to 22 ms), `tsc` 103 to 355 ms. |
| The compiler on every lab file | the same script | 31 files compile to function bodies that JavaScript parses, 0 fail; median 0.3 ms, worst 3.4 ms through the CLI's pipe |
| The compiler's shapes | `tests/live-compile-compile.test.ts` | 7 of 7: Fast Refresh instrumentation, getters for exports, live-binding reads, arrow/memo/forwardRef/class/default-expression/re-export/namespace/type-only modules, `import.meta` and top-level `await` as diagnostics, UTF-16 offsets after an emoji |
| The registry | `tests/live-compile-modules.test.ts` | 12 of 12 |
| The whole session in Node against the real compiler, React, the library's reconciler and the Fast Refresh runtime | `tests/live-compile-session.test.ts` | 5 of 5: mount; recolour and retitle with the count kept; hook order starts the state again; syntax error and throwing module change nothing; throwing render rolls back |
| The renderer's DevTools registration | `tests/renderer-devtools.test.ts` | 1 of 1; `renderer`, `kit`, `events`, `commit`, `props`, `select` test files: 211 of 211 |
| The section, native, Breaka's engine | `node scripts/verify.mjs --interaction --only=live-compile` | **PASSED in both windows, 1516 assertions each**, section 10.2 s (the runner matched the announced `live-compile-test-render` error) |
| The section, Chrome | `node scripts/verify-live-compile-web.mjs` | **PASSED** on the debug export, headless Chrome, 1120 x 800 at device pixel ratio 1; the extension is a Web side module and the same section code ran in the page |
| The section, stock engine | `node scripts/verify.mjs --interaction --only=live-compile --engine=stock` | **PASSED in both windows, 1516 assertions each**, stock Godot 4.7.2 with upstream GodotJS (V8 12.4), the extension built against `native/api/stock-4.7.2`; check on the service thread median 5.2 ms (worst 7.2 and 7.7), an edit to the pixels median 33.3 and 33.5 ms. The stock typings stage had to learn to leave the optional extension out (`scripts/typings.mjs`: the stage lists what it leaves out, clears what an earlier stage had of it, and the typings record includes that list), or the stock type check saw `LiveCompile` twice. `cargo test -p live_compile_core -p live_compile_ext`: 3 of 3. |

What the section proves, on the Controls lab's real source (`demo/src/inputs-lab.tsx`): the lab compiled in the running realm has exactly the nodes, texts and
rectangles the bundled copy has (the tree fingerprints are equal); an edit of its background class and title reaches `presentation.backgroundColor`, the
texts and the pixels (read back from the viewport texture), and a counter at 3 is still 3; swapping two `useState` calls resets the counter to 0 instead of
crashing, and the reordered page works; a syntax error leaves the page and the counter as they were, with the compiler's error at the semicolon and the
checker's at the same offset; a module that throws when it runs, and a render that throws, leave the last good page (the second after rolling back, with its
counter started again); a type error (TS2322) is reported at the offset `tsc` has, and the new code ran; twenty checks asked for at once come back as two
answered and eighteen superseded; hover and inlay hints answer.

Measurements, Controls lab (163 lines), two native windows then Chrome:

| | native landscape | native portrait | Chrome (Web side module) |
| --- | --- | --- | --- |
| open (project to the checker, compile, run, mount) | 29.3 ms | 27.6 ms | 115.2 ms |
| first check, on the service thread | 24.1 ms (JS saw 42.6) | 16.5 ms (JS saw 16.7) | 164.3 ms (JS saw 167.1) |
| later checks, on the service thread, median / worst | 5.4 / 6.4 ms | 5.2 / 5.9 ms | 14.2 / 35.4 ms |
| later checks as JavaScript sees them (its timer fires once a frame) | 16.6 / 17.3 ms | 9.0 / 33.4 ms | 18.4 / 40.3 ms |
| hover, inlay hints (14 of them) as JavaScript sees them | 16.6 ms, 15.4 ms | 7.5 ms, 9.6 ms | 16.6 ms, 33.6 ms |
| compile a file (parser, lowering, printer, through the extension), median | 5.35 ms | 5.4 ms | 9.34 ms |
| evaluate, register and let React refresh and commit, median / worst | 4.5 / 6.1 ms | 4.2 / 5.8 ms | 9.9 / 11.4 ms |
| **an edit to the pixels** (call `update`, then wait for the colour to be in the viewport texture), median / p95 / worst of 30 | **33.3 / 41.0 / 41.9 ms** | **33.2 / 35.3 / 35.3 ms** | **45.2 / 47.5 / 49.0 ms** |
| the worst gap between two turns of a 1 ms timer (the frame), idle / during ten checks | 33.4 / 33.3 ms | 36.6 / 18.1 ms | 6.4 / 5.6 ms |

The edit to the pixels is the sum of `update` (11 to 12 ms natively) and one to two frames. The check never holds a frame: the longest frame stall while
ten checks ran is the idle one, within the noise of the machine's load. The compile median through the extension is 5 ms where the native process makes it in
0.3 ms: the difference is the channel to the service thread and the thread waking up on a loaded machine, not the compiler.

The extension, sizes:

| | bytes | brotli level 11 |
| --- | --- | --- |
| `live_compile.web.wasm` (Web side module, served beside the page) | 8,728,932 | about 2.34 MB |
| `demo/live-compile/project.json` (in the pack: 23 labs' sources, the library's and React's declarations, the ES2022 lib files) | 2,066,961 | 198 KB |
| `liblive_compile.dylib` (native, not in the pack) | 10.8 MB | |
| `live-compile-cli` (native test process, not in the pack) | 10.7 MB | |
| the debug Web export's `index.pck` (all of the demo, in this export) | 57,001,732 | |

So the editor phase adds about 2.5 MB to what a browser downloads (brotli), and the pack carries the 2.07 MB project file (it compresses with the rest of the pack)
and the new scripts (about 8.5 MB of JavaScript and source maps in the debug pack: every `demo/src/*.ts` is its own script resource and the three that
import React or the library each carry a copy). The native process holds 30 MB after its first check and 44 MB after thirty (one lab).

Build: the vendor step (35 crates, 517 files, 19 MB, seconds), the native library 2 min 25 s from nothing (3 min with the checker's crates), `live-compile-cli`
3 min, the Web side module 3 min 30 s, each at `nice -n 10` with 3 jobs and at most one of Bun's builds at a time (peak about 3 GB), all through the gate.
The Web build's recipe is the UI extension's (`scripts/build-web.mjs`) with `--cap-lints=warn` and without `-Z emscripten-wasm-eh=false`.


## Limits that stay

- **Completions are not built.** `bun_sema`'s `Services` has what they need (`properties_of_type` for a member list, `symbol_in_scope` for names in scope,
  `signature_info` for call help); hover and inlay hints are built over the same program and show the way. They are the next piece of the editor
  phase's service layer.
- **Inlay hints are parameter names (`literals`, the editors' usual choice, or `all`) and the inferred types of variable declarations.** Not done:
  inferred return types, parameter types of callbacks, property names in object literals. A call with a rest parameter is not hinted past it.
- **Hover is the name and the type, not TypeScript's full quick info** (no documentation text, no declaration kind prefix). The type text is printed with
  fully qualified names (`import("react").Dispatch<...>`) because the services are asked without a scope's import context.
- **A render that throws loses the state of the tree that threw.** React discards it; the last good version renders again from its first render.
- **Only files the project has can be edited.** `ModuleRegistry.prepare` of a path it does not know throws; an editor that offers new files needs
  `setFile` and a registry entry for them.
- **What the compiled form cannot say:** `import.meta` and top-level `await` are diagnostics (the module is a function body). A dynamic `import()` compiles
  and is left as it is; the registry has no loader for it. `export =` works.
- **The project is the labs' own TSX plus the library's declarations, `@types/react` and the ES2022 lib files.** `godot`'s typings are not in it (the labs
  import only the library and React), and there are no `node_modules` or `package.json`s: packages resolve through `paths`. A lab that imports something
  else gets TS2307. The lib files are TypeScript 7.0.2's (Bun's bundle), `tsc` here is 5.9.3's: messages differ in words in a few cases (positions and
  codes agree).
- **Memory.** One checker process holds 30 MB after its first check and 44 MB after thirty, for one lab; it keeps the parsed program of the last four
  configurations it has checked (about 8 MB each), so checking every lab in turn without an edit stays bounded. The Web module's share was not measured.
- **Safari, iPad, the release export and the Web at device pixel ratio two were not run.** The Web run is headless Chrome, the debug export of the `breaka`
  profile, landscape. The stock profile's Web side module is built and run by docs/tracks/stock-web.md (`node scripts/build-live-compile-web.mjs --engine=stock`, Emscripten 4.0.11); this track's Web numbers are the `breaka` profile's.
- **The extension has one install and every native demo run loads it, whichever engine it starts, and it is one build for both.** It is bound to Godot API 4.7.2
  (`NATIVE_BINDING_API`, `scripts/native-binding.mjs`), so Breaka's 4.8 and the stock 4.7.2 load the same library (docs/tracks/single-build.md). A run is refused, before Godot
  starts, when the installed extension is bound to another API or older than its sources, with `node scripts/build-live-compile.mjs` as the fix. The build stamps the target
  directory (`live-compile/target/live_compile.build.json`); it cleans `live_compile_core` and `live_compile_ext` unless that stamp vouches for the sources, and it no longer
  compares file modification times. There is no `--engine=` and no `target-stock`. The Web side module is the exception: it is per profile (`build-live-compile-web.mjs --engine=<name>`, its own file, stamp and
  target, docs/tracks/stock-web.md), because a side module is linked with the Emscripten of the engine that loads it.
- **The native extension is macOS arm64.** The `.gdextension` lists no other desktop platform.
- **Typings.** The class `LiveCompile` is declared by hand in `demo/src/live-compile-host.ts`, as the probe classes are, because the extension is optional and
  the tracked typings must not describe it; `scripts/generate-types.mjs` takes the manifest out of the project while the editor writes them.
- **A panic** is a failed answer on the native thread (`catch_unwind`) and drops the parsed programs; in the Web module (`panic=abort`) a panic traps the
  service thread, and the page is told the call did not answer (the bounded wait) rather than hanging.
- **Build prerequisites on this workstation:** the Bun checkout at `/Users/ben/Development/bun` (revision `408c9374b266`, only read) for the vendor step, rustup's
  `nightly-2026-09-15` with `wasm32-unknown-emscripten`, `wasm32-unknown-unknown` and `rust-src`, and Node 24 for `scripts/live-compile-project.mjs` (Bun's lib
  bundle is zstd with dictionaries, which `node:zlib` reads from 24; the script starts nodenv's Node 24 itself).
- **Wire size and the pack.** See the table above; every `demo/src/*.ts` is its own script resource (`scripts/demo-entry-points.mjs`), and the three new ones
  that import React or the library each carry a copy of them (about 1 MB each, as the verifiers do): the debug pack holds about 8.5 MB of them with their
  source maps.

## README text

The demo can compile and type-check a lab's TSX inside the running page, which is what a code editor needs under it. It is a separate, demo-only
GDExtension, `live-compile/` (Bun's TypeScript checker and its JavaScript compiler, built with their own nightly toolchain; nothing in the package gains
a dependency or bytes), and the demo's TypeScript around it (`demo/src/live-compile-*.ts`). `node scripts/build-live-compile.mjs` builds and installs it
(one build for both engine profiles, bound to Godot API 4.7.2; `--cli` also builds a native test process; `node scripts/build-live-compile-web.mjs [--engine=stock]` builds its Web side module for a profile). In the
demo, `openLiveSession({ root, labId, exportName })` gives a session for one lab: `update(path, text)` sends the text to the checker, which runs on its own
thread and never holds a frame, compiles it, runs the result in the page and has React Fast Refresh re-render what changed, keeping state where the hooks
are the same. A file that does not compile, a module that throws and a render that throws each leave the last good version on screen; a type error does not
stop the new code. `hover` and `inlayHints` ask the same program for types and parameter names. The checker's diagnostics match `tsc`'s on every lab
(`node scripts/live-compile-agreement.mjs`); the section runs with `node scripts/verify.mjs --interaction --only=live-compile` and, in Chrome, with
`node scripts/verify-live-compile-web.mjs`. The one change to the library: `createRoot` registers the renderer with the React DevTools hook if the page
installed one (React Fast Refresh and DevTools work through it), and does nothing otherwise.
