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

**L7. The renderer registers with the DevTools hook.** React Fast Refresh (`react-refresh/runtime`) reaches React through
`__REACT_DEVTOOLS_GLOBAL_HOOK__`, which a renderer registers with by calling `reconciler.injectIntoDevTools()`. `src/renderer.ts` did not. It now does,
on the first `createRoot`, and returns at once when no hook is installed, so an app with neither DevTools nor Fast Refresh pays nothing. The host
config also gained `rendererVersion` and `rendererPackageName` (which the reconciler reads for the call). `react-refresh@0.18.0` is a dev dependency of
the demo only. The demo bundles the development build of `react-reconciler` (`process.env.NODE_ENV` is defined to `"development"` in `scripts/build.mjs`,
which is also what the library's `dist/` build is made with); the production reconciler has no refresh entry points, so a consumer that wants Fast
Refresh bundles the development build.

**L8. The module registry is stable under edits.** `require` answers a module's *namespace*, a `Proxy` that reads the module's current exports at the time
of each use, so a module that is evaluated again is seen by every importer without evaluating them (live bindings across versions). A module that
exports something that is not a component (a constant an importer read when it ran) is propagated to its importers, Metro's rule
(`isRefreshBoundary`). An edit is transactional: compile, evaluate (with whatever it newly imports), and only then register the components with
Fast Refresh, so a module that throws halfway leaves the families as they were.

**L9. A render that throws is rolled back, and its state is lost.** React discards the tree whose render threw. The session catches it with an error
boundary, puts the previous module instances back, registers their components again and renders from a fresh boundary. The page shows the last good
version; its state starts again, which is the limit of what React keeps (recorded and asserted by the section). Preflighting the render in a throwaway root
was considered and not done: it would run the component's effects.

## What was built

(see "Commands and results")

## README text

(to be filled in)
