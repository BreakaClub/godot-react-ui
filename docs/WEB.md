# Web build

The browser is a required prototype target. React and its reconciler execute in
the browser JavaScript engine through GodotJS; Taffy, text shaping and drawing
remain in the native extension compiled to a WebAssembly side module. There is no
DOM renderer and no embedded V8 in the Web export.

```sh
pnpm install
node scripts/build-web.mjs
node scripts/serve-web.mjs
# Run in another terminal while the server is active:
pnpm verify:web
```

The build runs the TypeScript check and bundle before exporting with the V8 Godot
4.8 editor. The default local URL is `http://127.0.0.1:8096`. `--release` selects the
release engine template; the Rust extension is optimized in both modes.
`--wasm-only` builds just the side module, and `--export-only` rechecks and rebundles
TypeScript before exporting an existing side module. The server includes the
COOP/COEP headers required for `SharedArrayBuffer` and pthreads. Remote hosting
requires HTTPS and the same headers.

The source shell `demo/web-shell.html` passes `--audio-driver Dummy` to the Web
runtime too. Add `?verify=1` to launch the demo's real-input verifier; ordinary
launches remain interactive.

The Rust binding is generated against the checked-in custom Godot 4.8 API dumps
under `native/api/`, selected by `.cargo/config.toml`. A stable 4.7 binding is
insufficient for this custom engine: an editor method expected by that binding
was removed in 4.8, causing eager binding initialization to fail. Web and native
builds use the same exact API input, recorded in the Web receipt.

The library enables godot-rust's public `lazy-function-tables` feature on both
platforms. Breaka's Web engine deliberately excludes 3D physics; eagerly binding
every unrelated class from a full editor API therefore fails during startup.
Demand loading binds each method on first use, with the same method/hash check
and panic on a missing method. All UI Godot calls stay on the main thread;
godot-rust's separate `experimental-threads` feature is not enabled. This Rust
binding cache is distinct from Breaka's Wasm function-table optimization below.

This prototype uses Breaka's existing threaded GodotJS 4.8 templates, Emscripten
6.0.12 and Binaryen 133. Those templates use Breaka's lazy function-table ABI v2;
ordinary eager Wasm extensions are incompatible. The registered compiler pass runs
as part of Emscripten's final linking phase via `-sLAZY_FUNCTION_TABLE=side`. The
build invokes the engine's source-hash and capability validator, verifies the
metadata on all three modules, verifies the exported extension hash, and writes a
`build-receipt.json` beside the exported files. It never modifies a generated Wasm
after linking.

Rust uses `nightly-2026-05-15`, `rust-src`, and
`wasm32-unknown-emscripten`; `-Zbuild-std` rebuilds its standard library with the
pthread/atomics settings needed by the engine. Install it without changing the
global default with `rustup toolchain install nightly-2026-05-15 --profile minimal
--component rust-src --target wasm32-unknown-emscripten`. This compiler retains
the JS exception ABI switch in godot-rust 0.5.5's Web recipe; Rust 1.98 removed
that switch. The build preserves Rust panic handling rather than silently
switching to abort-on-panic. `godot-rust`'s Web support remains
explicitly experimental upstream. Native success alone is insufficient evidence
for this target.

The default paths are this workstation's qualified tools, visible at the top of
`scripts/build-web.mjs`. Other workstations can set `GODOT`, `CARGO`,
`WEB_RUST_TOOLCHAIN`, `EMSDK_ROOT`, `BINARYEN_ROOT`,
`BINARYEN_MANIFEST_SHA256`, `GODOT_EMSCRIPTEN_HELPER` and `SCONS_PYTHON`, and update
the template paths in `demo/export_presets.cfg`. The selected engine and extension
must share the same Emscripten and lazy-table ABI. No toolchain is activated
globally. No build or server command deploys anything.

Primary contracts: [godot-rust Web exports](https://godot-rust.github.io/book/toolchain/export-web.html),
[Godot Web export requirements](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).
