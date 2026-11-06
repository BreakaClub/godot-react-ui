# Web build

The browser is a required prototype target. React and its reconciler execute in
the browser JavaScript engine through GodotJS; Taffy, text shaping and drawing
remain in the native extension compiled to a WebAssembly side module. There is no
DOM renderer and no embedded V8 in the Web export.

```sh
pnpm install
node scripts/build-web.mjs
# The verifiers serve the export themselves, on a free port:
pnpm verify:web
pnpm verify:motion:web
pnpm verify:interaction:web
node scripts/verify-world-web.mjs
# To look at it by hand: node scripts/serve-web.mjs
```

The build runs the TypeScript check and bundle before exporting with the V8 Godot
4.8 editor. `serve-web` listens on `http://127.0.0.1:8096` (or `PORT`). `--release` selects the
release engine template; the Rust extension is optimized in both modes.
`--wasm-only` builds just the side module, and `--export-only` rechecks and rebundles
TypeScript before exporting an existing side module. `--probe` (on `build-web.mjs` and `serve-web.mjs`)
builds and serves the F0 probe build for `scripts/probe-web.mjs`. Every verifier runs Chrome headless through
puppeteer-core (`CHROME` names the binary), serves the export itself on a free port (`GODOT_REACT_WEB_URL` instead names a server whose
files it checks against the receipt, byte for byte), and takes `--release` for the release export. The server includes the
COOP/COEP headers required for `SharedArrayBuffer` and pthreads. Remote hosting
requires HTTPS and the same headers.

The demo keeps `Window.contentScaleMode` disabled and sets its
`contentScaleFactor` to `DisplayServer.screenGetScale()` on Web. Godot's Web
display server sizes the backing canvas in device pixels; its Window then divides
the logical viewport by this factor and transforms input back to logical units.
The render target stays at full resolution. The viewport carries the factor as its
font oversampling, and native reads it from there and passes it to every text and
rounded-edge draw it records (Godot supplies it only to a `CanvasItem` drawing in
`_draw`, and the root records its own canvas items). The owner checks the live
ratio each frame so browser zoom and display changes are handled even when the
backing size does not change; native repaints on the viewport's redraw request, so
text is redrawn at the new ratio without a commit (`docs/tracks/hidpi.md`). Browser verification covers both DPR 1 and DPR 2 at landscape
and portrait sizes, plus real touch input.

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

The default paths are this workstation's qualified tools: the Godot binaries, the Emscripten SDK and the Rust nightly are in
`scripts/engine.mjs` (per profile), and the cargo, Binaryen, Emscripten-helper, manifest hash and Python defaults are at the top of
`scripts/build-web.mjs`. Other workstations can set `GODOT`, `CARGO`,
`WEB_RUST_TOOLCHAIN`, `EMSDK_ROOT`, `BINARYEN_ROOT`,
`BINARYEN_MANIFEST_SHA256`, `GODOT_EMSCRIPTEN_HELPER` and `SCONS_PYTHON` (the last four only matter to the `breaka` profile's
lazy-table pass), and update the template paths in `demo/export_presets.cfg`. The selected engine and extension
must share the same Emscripten and lazy-table ABI. No toolchain is activated
globally. No build or server command deploys anything.

## The `stock` engine profile

`node scripts/build-web.mjs --engine=stock` (or `GODOT_REACT_ENGINE=stock`) builds the same extension for an unmodified
Godot 4.7.2 with upstream GodotJS instead of Breaka's engine. The default `breaka` profile is unchanged. What differs
(the decisions and evidence are in [tracks/stock-engine.md](tracks/stock-engine.md)):

| | `breaka` (default) | `stock` |
| --- | --- | --- |
| Engine and exporter | Godot 4.8, `/Applications/Godot48.app` | Godot 4.7.2, `/Users/ben/Development/godot-stock/bin/godot-stock` |
| Templates | the `lean3d_closure_sdk6` dlink zips named by the `Web` preset | `godot-stock/templates/4.7.2.stable.custom_build/web_dlink_{debug,release}.zip`, named by the `Web (stock)` preset |
| Emscripten | 6.0.12 plus Binaryen 133 | 4.0.11 (`godot-stock/emsdk`), with its own Binaryen |
| Lazy function-table pass | `-sLAZY_FUNCTION_TABLE=side`, validated by the engine's helper; the `breaka.lazy-table` custom section is checked on all three modules | none: no Binaryen override, no helper, no metadata check |
| godot-rust flags | pthread, atomics, `SIDE_MODULE=2`, hidden visibility, `-Zbuild-std` | the same |
| API input | `native/api` | `native/api/stock-4.7.2` |
| Output | `target/web`, `artifacts/web-<mode>` | `target/stock-web`, `artifacts/stock/web-<mode>` |

Verify a stock export with the same selector (`--release` selects the release template, as for `breaka`). The verifiers serve the
export themselves on a free port (scripts/web-verify.mjs), so there is no server to start and no port to choose:

```sh
node scripts/build-web.mjs --engine=stock
pnpm verify:web --engine=stock
pnpm verify:interaction:web --engine=stock
```

To look at an export by hand, `PORT=8100 pnpm demo:web --engine=stock`. A verifier pointed at that server with
`GODOT_REACT_WEB_URL=http://127.0.0.1:8100` first compares every file the server sends with the export's receipt and refuses any
difference.

The stock debug template as first built aborted in every pthread worker (the closure compiler plus Emscripten assertions: a global
collision in `godot.js`); `godot-stock/templates/.../web_dlink_debug.zip` was relinked without the closure compiler and works
(tracks/stock-engine.md, S10). If you have the older zip (sha256 `aee48977...`), use `--release` or rebuild it that way.

Stock Godot 4.7.2's Web input turns a browser `touchcancel` into a plain release, so the touch page of
`verify:interaction:web` records that gap (`GODOT_REACT_WEB_GAP`) instead of asserting a `pointercancel` there
(tracks/stock-engine.md, S11). The stock side module needs the stock Emscripten 4.0.11 at `godot-stock/emsdk`, and the same pinned
nightly accepts it.

The receipt (`build-receipt.json`) records the profile, the exporting binary and version, the template and its hash, the mode,
the Rust toolchain and the SDK, the Emscripten version, the API dump hashes, a digest of the pack, shell and template inputs
(`content`), the side module's stamp (`extension`), the modules' metadata, and each exported file's size and hash (`files`); it has no lazy-table
fields for `stock`. The side module must be linked by
the same Emscripten as the template, whatever the profile, so the two profiles use different SDKs and never share a
target directory. `build:web` refuses to export when the installed side module was built for the other profile, or from other
sources than the working tree. The receipt records the side module's stamp (`extension`: profile, probe flag, hash, cargo features, a
digest of the sources and each source file's hash), and `serve-web`, `probe-web` and every Web verifier refuse an export whose stamp no
longer matches the working tree, naming the files that differ and the fix (`pnpm build:web`, or `pnpm build:web --export-only` when the pack, shell, template or an exported file is what moved; `docs/tracks/freshness.md`). An export made
before the guard has no stamp and is refused once.

## Web-specific limits

Verified in headless Chrome only (debug template of the `breaka` profile; the `stock` profile also ran its release template): Safari, mobile devices and the `breaka`
release preset are not qualified. The Web engine has no accessibility code, so the accessibility tree is native only. A paste asks the browser through
`JavaScriptBridge` because the engine's `clipboard_get` is stale, and the root writes the engine's hidden soft-keyboard element itself; after a Web IME composition
ended by a focus move the engine keeps `ime_started` set (an engine bug, not worked around). Horizontal wheel ticks have the opposite sign on Web, a touch's
`pointerId` is the browser's contact identifier, and the stock 4.7.2 engine turns `touchcancel` into a plain release. The full list is the README's "Current limits".

Primary contracts: [godot-rust Web exports](https://godot-rust.github.io/book/toolchain/export-web.html),
[Godot Web export requirements](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).
