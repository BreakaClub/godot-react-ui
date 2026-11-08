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
node scripts/verify-live-compile-web.mjs    # the code editor's compiler in Chrome (needs the profile's live-compile Web side module; --engine=stock for stock's)
# To look at it by hand: node scripts/serve-web.mjs   (pnpm demo:web; --lab=<id> opens a lab)
```

The build runs the TypeScript check and bundle before exporting with the V8 Godot
4.8 editor. `serve-web` listens on `http://127.0.0.1:8096` (or `PORT`). `--release` selects the
release engine template and exports the stripped release pack ("The release export and hosting"); the Rust extension is optimized in both modes.
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

A page that hosts the canvas must keep the canvas out of the document's size, on both engine profiles. The engine sizes the canvas from
`window.innerWidth` and `innerHeight` every frame, in pixels, and a phone turned from landscape back to portrait still has the landscape-sized canvas when the
browser measures the page: a canvas that counts toward the document's size makes mobile Chrome zoom out to fit it, which makes `innerWidth` the wider size, and the
page stays that wide (the root laid out at the landscape width, off the screen). The shell therefore puts the canvas in a fixed, clipping `#stage` and sets
`minimum-scale=1` in its viewport meta (`docs/tracks/rotation.md`; the Web verifier's `rotation` section holds a page to it).

The Rust binding is generated against checked-in API dumps, and which pair binds what depends on the target (`native/api/README.md`). The Web side module of the `breaka`
profile is bound to the custom Godot 4.8 dumps under `native/api/`, which `scripts/build-web.mjs` sets for the cargo child process; the `stock` profile's Web side module is bound to
`native/api/stock-4.7.2/`. The native builds are not bound to Breaka's dumps any more: the UI library and the live-compile extension are one build bound to the 4.7.2 pair for both
engine profiles (`NATIVE_BINDING_API` in `scripts/native-binding.mjs`; `.cargo/config.toml` names the same pair for a hand-run `cargo test`), which Breaka's 4.8 loads
(`docs/tracks/single-build.md`). A stable 4.7 binding built from godot-rust's own table is insufficient for Breaka's custom engine: an editor method expected by that binding
was removed in 4.8, causing eager binding initialization to fail, which is why the Breaka Web build keeps its own dumps. The Web receipt records the hashes of the pair a side module
is bound to.

The library enables godot-rust's public `lazy-function-tables` feature on both
platforms. Breaka's Web engine deliberately excludes 3D physics; eagerly binding
every unrelated class from a full editor API therefore fails during startup.
Demand loading binds each method on first use, with the same method/hash check
and panic on a missing method. All UI Godot calls stay on the main thread;
godot-rust's separate `experimental-threads` feature is not enabled. This Rust
binding cache is distinct from Breaka's Wasm function-table optimization below. (It is also why a library bound to 4.7.2 runs in Breaka's 4.8: only the methods it calls have to
exist there, with the hash it was bound with.)

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

The Web is per profile, unlike the native library: a Web side module is linked with the Emscripten SDK of the engine whose templates load it (4.0.11 for `stock`, 6.0.12
for `breaka`, with Breaka's lazy function-table ABI), and the two cannot load each other's. The native UI library and live-compile extension are one build for both
profiles, bound to Godot API 4.7.2 (docs/tracks/single-build.md); `build:web` and `build-live-compile-web.mjs` are the only builds that take `--engine=`.

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
| live-compile side module | `live_compile.web.wasm`, Emscripten 6.0.12 with the lazy function-table flags | `live_compile.web.stock.wasm`, Emscripten 4.0.11, an ordinary side module |
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

## The live-compile side module

The code editor's compiler and checker (`live-compile/`, `docs/tracks/live-compile.md`) are a second Web side module, `live_compile.web.wasm` (8.7 MB, about 2.3 MB brotli), built by
`node scripts/build-live-compile-web.mjs` per profile (`--engine=stock` builds `live_compile.web.stock.wasm` with the stock SDK, Emscripten 4.0.11, and no lazy function-table flags). It has its own toolchain, `live-compile/rust-toolchain.toml` (`nightly-2026-09-15`, because Bun's crates need
`core::alloc::AllocatorClone`, which `nightly-2026-05-15` lacks), and its recipe is the UI extension's with `--cap-lints=warn` and without `-Z emscripten-wasm-eh=false` (that switch is gone
on the newer nightly); it is built with `panic=abort`, so a panic traps the service thread and the page is told the call did not answer. The page lists it in `gdextensionLibs`, so it is
fetched at startup with the other side modules whether or not the code panel ever opens; loading it on first use is designed in `docs/tracks/web-load.md` and not built. The export also
carries `demo/live-compile/project.json` (the labs' TSX, the library's and React's declarations and the ES2022 lib files; 2.07 MB in the pack, 198 KB compressed). The Web build checks that
the export holds the side module and the project, and `node scripts/verify-live-compile-web.mjs` runs the `live-compile` section in Chrome.

**This module is per profile, and an export holds exactly its own profile's or none** (docs/tracks/stock-web.md). Each profile has its own file (`live_compile.web.wasm` for `breaka`, `live_compile.web.stock.wasm`
for `stock`), stamp and cargo target (`live-compile/target/web`, `live-compile/target/web-stock`). The stamp records the profile; `build:web` writes the extension's manifest with a Web library only for the
module stamped for the profile it exports, clears modules an earlier export left in the output, and records the module in the receipt (`liveCompile`: its file name and stamp, or `null`). With no module
installed for the profile the export has none and the code editor is read-only (it says so in its banner). A module that is installed and is not the profile's current build stops the export, naming the
build. Every Web verifier refuses, before it opens a page, an export that contains a module its receipt does not record or one stamped for another profile: the page loads whatever the manifest lists, and a
Breaka module in a stock page dies at load with `unknown dylink.0 subsection: 6`.

## The release export and hosting (react.breaka.club)

`node scripts/build-web.mjs --release` selects the release engine template and exports a stripped pack. GodotJS's export plugin packs every `.ts` resource and its source map and no
export filter reaches them, so the release export runs on a copy of `demo/` (`scripts/release-stage.mjs`) from which the 39 verification-only scripts, the two scenes that exist for them
(`a11y.tscn`, `text-layout-probe.tscn`) and every `.godot/GodotJS/**/*.map` have been taken out. The debug export, which the Web verifiers use, is made from `demo/` itself and is
unchanged. `scripts/demo-entry-points.mjs` says which scripts the playground starts (`DEMO_RELEASE_ENTRY_POINTS`: `main`, `scene-launcher`, `world-main`); after the export
`assertReleasePack` reads the pack's directory as the engine does (`scripts/pack-contents.mjs`) and fails the build if the pack holds a source map or a script outside the release set, and
the deploy script runs the same check. The release pack is 30 files and 6.6 MiB where the debug pack is 154 files and 52.7 MiB.

```sh
pnpm deploy:web:plan        # stage and compress the release, print every file and what would be uploaded (a dry run)
pnpm deploy:web             # upload what the bucket lacks, point the site at the new release, deploy the Worker if its source changed
pnpm deploy:web:releases    # the releases the site has shown, newest first
pnpm deploy:web:rollback    # point the site back at the release before the current one (one object write)
pnpm check:site --url=https://react.breaka.club/ --files   # load the site in headless Chrome, compare every file, open a lab and the code panel
```

The site is the Cloudflare Worker `godot-react-ui-demo` (`deploy/cloudflare-worker.ts`, `wrangler.react-demo.jsonc`, custom domain `react.breaka.club`) over the R2 bucket
`breaka-asset-uploads`, prefix `react-demo/v2/` (`deploy/release-layout.mjs` is the one definition of the layout the Worker and the deploy script share):

```
current.json            the pointer: the release the site shows, and the 20 releases before it
releases/<id>.json      a manifest: each file's path, type, size, hash of its bytes, size of its brotli copy
objects/<hash>          a file's bytes; objects/<hash>.br its brotli copy
```

A release id is a hash of its files' paths and contents, so publishing the same export twice is the same release. A deploy puts the objects, then the manifest, then the pointer; the
pointer is one object, so the site changes in one atomic write and a half-uploaded release is never shown, and a rollback writes only the pointer. Old releases stay in the bucket (nothing
prunes it), so a tab with an older page open keeps working. Each compressible file (`.html .js .json .wasm .pck .svg .txt`) is compressed once, at deploy, with brotli 11 and a 16 MiB
window, and cached under `artifacts/web-deploy-cache/` by content hash; the Worker sends the stored bytes with `Content-Encoding: br`, `Vary: Accept-Encoding` and the stored
`Content-Length` when the browser's own `Accept-Encoding` allows `br` (Cloudflare rewrites the request header; the original is in `request.cf.clientAcceptEncoding`), the plain file
otherwise. The page is served with `no-cache` and an ETag, and its `<base href="/r/<release>/">` sends every relative load of the engine to that release; `.wasm` and `.pck` answer
there with a cacheable redirect to `/o/<hash>/<name>`, so a binary that did not change between two deploys is already in the visitor's cache; scripts do not redirect, because a worker
started from a redirected script takes the final URL as its base. Everything under `/r/` and `/o/` is `public, max-age=31536000, immutable`. Godot builds its URLs itself, so versioning is
by path, not by query. The bare address redirects to `/?demo=navigator`, and `?lab=<id>`, `?demo=navigator` and `?demo=app` pass through to the page. The isolation headers
(`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Resource-Policy: cross-origin`) are on every response, redirects, 304s and
errors included. The Worker is deployed only when its source (`cloudflare-worker.ts`, `release-layout.mjs`, `wrangler.react-demo.jsonc`) differs from the hash the pointer records
(`--deploy-worker` forces it), and after the pointer is written. `--local --persist-to=<directory>` runs a deploy against wrangler's local R2 state for `wrangler dev -c
wrangler.react-demo.jsonc --persist-to <directory>`, refuses to run without a directory (so it cannot touch the state root `pnpm dev` shares) and never deploys the Worker.

Measured in headless Chrome through the Worker on `wrangler dev` with a browser that accepts only `br`: a cold visit transfers 12.16 MiB (it was 66.58 MiB with the pack uncompressed
and every deploy emptying the cache), a returning visitor after a deploy that changed the pack and the page 2.01 MiB, one with nothing new two small requests; on a 20 Mbit/s line with a
40 ms round trip the demo is ready in 6.7 s where it took 29.8 s. Not observed: whether Cloudflare's edge passes the stored brotli through untouched (the local runtime re-encodes it
for Chrome's own `Accept-Encoding`, so every local `br` figure forces the header; the `curl` that shows it is in `docs/tracks/web-load.md`). Chrome only; the stock engine's release
export was not built. A build or test command never deploys anything; `pnpm deploy:web` needs the wrangler login of the breaka account.

## Web-specific limits

Verified in headless Chrome only (debug template of the `breaka` profile; the `stock` profile also ran its release template; on the `breaka` release export, `verify-web.mjs --release`,
`verify-live-compile-web.mjs --release` and the landscape pass of the navigator section ran): Safari, Firefox and mobile devices are not qualified. The Web engine has no accessibility code, so the accessibility tree is native only. A paste asks the browser through
`JavaScriptBridge` because the engine's `clipboard_get` is stale, and the root writes the engine's hidden soft-keyboard element itself; after a Web IME composition
ended by a focus move the engine keeps `ime_started` set (an engine bug, not worked around). Horizontal wheel ticks have the opposite sign on Web, a wheel event's pixel delta `d` is `0.03 * d` ticks (so a 100 px notch from Chrome is 3 ticks at device pixel ratio 1 and 1.5 at 2,
where a native notch is one; `docs/tracks/web-fixes.md`), a touch's `pointerId` is the browser's contact identifier, and the stock 4.7.2 engine turns `touchcancel` into a plain release. The full list is the README's "Current limits".

Primary contracts: [godot-rust Web exports](https://godot-rust.github.io/book/toolchain/export-web.html),
[Godot Web export requirements](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).
