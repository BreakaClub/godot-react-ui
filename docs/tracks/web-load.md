# Track: web load (react.breaka.club took ages to load)

Branch `web-load`, based on main `9697dd6`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are
not edited here (the README text is at the end). Nothing is deployed: no `wrangler deploy`, no `--remote` write, no `--execute` against the real bucket.

Ben: "the UI playground took AGES to load for me just then from react.breaka.club". The cold load was 66.6 MiB on the wire, 52.7 MiB of it the pack,
sent with no compression; and every deploy made every returning visitor download it all again.

**Headline.** A cold load is now 12.2 MiB (was 66.6), and a returning visitor after a deploy downloads 2.0 MiB (was all 66.6 again: `Clear-Site-Data` emptied the cache, read from the code, not measured). On a 20 Mbit/s line with a
40 ms round trip, headless Chrome reaches the demo in 6.7 s instead of 29.8 s. A visit with nothing new to download makes two small requests. That is
measured through the real Worker on `wrangler dev` with a browser that accepts only `br`; **the one thing only production can show** is whether
Cloudflare's edge passes the stored brotli through to Chrome untouched (its documentation says it does; the local runtime does not, see W3), and the
command that shows it is in "After the deploy".

## Measurements

Headless Chrome through puppeteer-core (CDP only), `scripts/check-site.mjs`, 1280 x 800, a fresh profile for a cold load and the same profile again for a warm
one. Throttled runs use CDP network emulation, 20 Mbit/s down with 40 ms added round trip; production adds its real round trip (Melbourne edge) on top. MiB are
1,048,576 bytes. "Wire" is what Chrome counted off the network (`encodedDataLength`), headers included.

| Run | Ready (`godotReactDemo`) | Requests (network / cache) | Wire |
| --- | --- | --- | --- |
| Before, cold, throttled (production) | 29.8 s | 10 / 0 | 66.58 MiB |
| Before, cold, unthrottled (production, this machine) | 3.6 s | 10 / 0 | 66.56 MiB |
| Before, warm, throttled (production, same profile) | 1.7 s | 9 / 1 | 0.01 MiB |
| After, cold, throttled (Worker, `br` only) | 6.7 s | 13 / 0 | 12.16 MiB |
| After, cold, unthrottled | 1.3 s | 13 / 0 | 12.16 MiB |
| After, warm, throttled (same profile) | 1.4 s | 2 / 11 | 0.00 MiB |
| After, a returning visitor after a deploy that changed the pack and page, throttled | 2.0 s | 9 / 4 | 2.01 MiB |
| After, cold, Chrome's own `Accept-Encoding` on the local runtime (see W3) | 2.2 s | 13 / 0 | 16.56 MiB |

Per file, cold (wire MiB; before is production's, after is the Worker's stored brotli):

| File | Raw | Before (encoding) | After (`br`) |
| --- | --- | --- | --- |
| `index.pck` | 52.69 (before), 6.60 (after) | 52.71 (none) | 1.83 |
| `index.side.wasm` (the engine) | 30.68 | 7.56 (zstd) | 5.61 |
| `live_compile.web.wasm` | 8.32 | 3.03 (zstd) | 2.24 |
| `godot_react_ui.web.wasm` | 7.43 | 2.49 (zstd) | 1.85 |
| `index.wasm` | 1.38 | 0.56 (zstd) | 0.45 |
| `index.js` | 1.08 | 0.22 (zstd) | 0.17 |
| the page and the redirects | | 0.01 | 0.00 |
| total | | 66.58 | 12.16 |

Compression, by tool, on the same files (bytes): `index.side.wasm` 32,167,559 raw, brotli 11 5,878,283, zstd 19 6,346,830, gzip 9 8,427,912;
`live_compile.web.wasm` 8,728,932, 2,346,245 / 2,500,035 / 3,304,284; `godot_react_ui.web.wasm` 7,789,383, 1,942,009 / 2,090,038 / 2,711,395;
`index.wasm` 1,443,401, 475,989 / 514,404 / 577,876; `index.js` 1,136,533, 180,271 / 191,861 / 221,962; the old 55 MB pack 55,265,884, 2,797,497 / 3,545,430 /
12,243,690. Brotli 11 with a 16 MiB window beats zstd 19 (8 MiB window, the most browsers accept) by 6 to 8 percent on every binary and 21 on the pack, and Cloudflare's own
on-the-fly zstd (the "before" column) by 25 to 26 percent on each of the four binaries. So: brotli, no zstd.

## What was wrong, and the evidence

1. **The pack went out raw.** `curl -sI -H 'Accept-Encoding: zstd, br, gzip' https://react.breaka.club/index.pck` answers `content-type: application/octet-stream`
   and no `content-encoding`; `index.wasm` and the others answer `application/wasm` with `content-encoding: zstd`. Cloudflare compresses a list of types
   (HTML, CSS, JavaScript, JSON, SVG, fonts, `application/wasm`) and `application/octet-stream` is not on it. The Worker could change the pack's type, but the
   engine does not care what it is called and the Worker can do better: serve a copy compressed once, at deploy, at the highest brotli quality.
2. **The pack held 154 files, 52.7 MiB, of which 6.6 MiB runs.** 33.2 MiB source maps, 12.9 MiB the compiled bundles of verifiers, probes and goldens (each a
   complete copy of React and the library), 3.3 MiB the bundles that run, 2.1 MiB the code editor's project, 1.2 MiB fonts.
3. **Every deploy discarded every visitor's cache.** `Clear-Site-Data: "cache"` whenever the `react_demo_rev` cookie differed from the revision (a first visit, and every
   visit after a deploy), on top of `no-cache` with an ETag for every file.
4. **`live_compile.web.wasm` went to everyone.** 2.2 MiB compressed, loaded at startup with the other side modules, whether or not the code panel ever opens.

## Decisions

**W1. Compress once, at deploy, with brotli; the Worker sends the stored bytes.** `scripts/release-bundle.mjs` makes a brotli 11 copy (window 16 MiB, the largest every
browser's decoder accepts) of every `.html .js .json .wasm .pck .svg .txt` file when it is at most 95 percent of the original; copies are cached under
`artifacts/web-deploy-cache/` by content hash, so a deploy that changes only the pack recompresses only the pack (the first plan, with the binaries to compress, took 64 s; a rerun reuses the copies). The Worker (`deploy/cloudflare-worker.ts`) sends the copy with `Content-Encoding: br`, `Vary: Accept-Encoding`, its stored `Content-Length`
and `encodeBody: 'manual'` when the browser's own `Accept-Encoding` allows `br`, the plain file otherwise (RFC 9110 quality values and `*` are honoured:
`tests/web-release.test.ts`). The page loader needs nothing: Godot's `fetch` reads the decoded stream.

**W2. The engine's progress bar stays right.** Godot's loader (`index.js`, `Preloader`) wraps each fetch in a stream that adds `value.length` of every decoded chunk to
`loaded`, and divides by `fileSizes[...]`, which the export writes from the files' own sizes. Compressed transfer changes neither. What it does not count is the
side modules (Emscripten fetches them, not the loader), so the percentage can reach 100 while 8 MiB are still arriving: the shell now says "Starting the native UI
playground…" at 100 percent instead of sitting on a number (`demo/web-shell.html`). Nothing reads `Content-Length`.

**W3. The browser's Accept-Encoding, not the Worker's.** Cloudflare rewrites a request's `Accept-Encoding` before a Worker sees it (to `gzip` or `br, gzip`) and keeps the
original in `request.cf.clientAcceptEncoding`. The Worker decides from that and falls back to the header when there is no `cf`. Found with a probe Worker on
`wrangler dev` (`{"ae":"br, gzip","cf":"identity"}` for a request that sent `identity`). The stored copy carries `Cache-Control: ..., no-transform`, which Cloudflare
documents as "do not alter this response's compression". The **local** runtime ignores that and, for the compressible types (`text/javascript`, `application/wasm`),
decodes a manual `br` and re-encodes it, as far as I can tell for the first of gzip and br in the browser's list (`gzip, deflate, br, zstd` becomes gzip: 16.56 MiB instead of 12.16; `br, gzip` stays br): so local
numbers for Chrome's own header are the gzip ones, and the `br` rows above force the header (`--accept-encoding=br`, CDP), which the local runtime passes through
byte for byte (`curl -H 'Accept-Encoding: br'` returns exactly the 180,271 stored bytes of `index.js`). Cloudflare's compression page says that with a
`content-encoding` from the origin it "will keep the same compression" when the visitor supports it; **not verified on the real edge** (a deploy was forbidden).
If the edge re-encodes, the worst case is gzip or Cloudflare's own zstd of the decoded bytes, which is what the binaries got before; the pack is
`application/octet-stream`, which the edge leaves alone either way, so its saving does not depend on this.

**W4. A release is immutable and addressed by content; the pointer is the only thing that moves.** Layout under `react-demo/v2/` in `breaka-asset-uploads`
(`deploy/release-layout.mjs` is the one definition the Worker and the deploy script share):

```
current.json            the pointer: the release the site shows, and the 20 releases before it
releases/<id>.json      a manifest: each file's path, type, size, hash of its bytes, size of its brotli copy
objects/<hash>          a file's bytes; objects/<hash>.br its brotli copy
```

A release id is a hash of its files' paths and contents, so publishing the same export twice is the same release. A deploy puts the objects, then the manifest, then
the pointer (one object: one atomic write, and a half-uploaded release is never shown). A rollback writes the pointer only. Old releases stay in the bucket, so a
tab that has an older page open keeps working. The legacy `react-demo/current/` objects are left alone: the previous Worker version reads them, which is the way back
from the whole change if it ever came to that (`wrangler rollback` on the Worker).

**W5. Versioned URLs by path, not by query.** The brief suggested `?v=<hash>`, but Godot builds the URLs itself (`${executable}.pck`, `.wasm`, `.side.wasm`, the worklets
and the GDExtension libraries by name), so no query can be added and the extension libraries are matched by file name. The page's `<base href="/r/<release>/">`
(injected after the charset by `scripts/release-bundle.mjs`) points every relative load at one release, which also makes the page consistent with itself: it can never
be half of one deploy and half of another. The bytes of the large binaries (`.wasm`, `.pck`) answer `/r/<release>/<file>` with a cacheable 302 to
`/o/<hash>/<file>`, so a binary that did not change between two deploys is the same URL and comes from the browser's cache: the table's "returning visitor after a
deploy" row downloads the new pack and script only (2.01 MiB) and takes the engine's side module, both extension libraries and `index.wasm` from cache. Scripts do not redirect: a worker
started from a redirected script takes the final URL as its base, and the engine's relative loads from a worker would miss. Everything under `/r/` and `/o/` is
`public, max-age=31536000, immutable`; the page is `no-cache` with an ETag, so a deploy is picked up on the next visit and an unchanged page costs a 304.
`Clear-Site-Data` and the `react_demo_rev` cookie are gone.

**W6. The release export is staged, not configured** (`scripts/release-stage.mjs`, used by `scripts/build-web.mjs --release`). GodotJS's export plugin
(`modules/GodotJS/weaver-editor/jsb_export_plugin.cpp`) does, for every `.ts` Godot resource the export packs: `_export_file` adds a remap and `export_compiled_script`
loads the compiled module from the editor's JS environment and adds it, "failed to include module" when there is none, and with
`GodotJS/editor/packaging/source_map_included` (default true; a project-wide setting read with `GLOBAL_GET`, in Breaka's GodotJS and upstream's alike) adds
`<module>.js.map` through `add_file`, which no export filter touches. So a verifier can leave the pack only by leaving the project, and the maps only by not being there or by
a setting that applies to the debug export as well. `export_presets.cfg` has one preset per engine profile, not per mode, and `tests/engine.test.ts` pins the pair identical
but for name, path and templates, so I kept it that way and did not add release presets. Instead the release export runs on a copy of `demo/` (a copy-on-write clone,
timestamps kept) from which the 39 verification-only scripts, the two scenes that exist for them (`a11y.tscn`, `text-layout-probe.tscn`) and every
`.godot/GodotJS/**/*.map` have been taken out; Godot then writes a consistent pack and shell (the `fileSizes` in the page match). The debug export is made from `demo/`
itself and is unchanged. `scripts/demo-entry-points.mjs` says which scripts the playground starts (`DEMO_RELEASE_ENTRY_POINTS`: `main`, `scene-launcher`, `world-main`; the rest are
bundled into those). The plan refuses what would ship broken (a kept scene or autoload whose script is dropped; a scene with some scripts kept and some not), and after
the export `assertReleasePack` reads the pack's directory the way the engine does (`scripts/pack-contents.mjs`) and fails the build if it holds a source map or a
script outside the release set, or lacks one inside it. `deploy-web.mjs` runs the same check, so an old export lying in `artifacts/web-release` cannot be published.

| Release pack | Before | After |
| --- | --- | --- |
| files | 154 | 30 |
| size | 52.69 MiB | 6.60 MiB |
| source maps | 42 files, 33.23 MiB | none |
| compiled scripts of verifiers, probes, goldens | 39 files, 12.86 MiB | none |
| compiled scripts that run (`main`, `world-main`, `scene-launcher`) | 3 files, 3.28 MiB | 3 files, 3.28 MiB |
| `live-compile/project.json` | 2.09 MiB | 2.09 MiB |
| fonts | 1.20 MiB | 1.20 MiB |
| brotli | 2.67 MiB | 1.83 MiB |

**W7. Rollback exists now.** The brief said the deploy script already had atomic releases and a one-command rollback. It had neither (`git log` and the file: it uploaded
file by file to `react-demo/current/` and ran `wrangler deploy`). Versioned releases give both: `pnpm deploy:web:rollback` writes the pointer back to the release before the
current one, `--rollback=<id>` to a named one, `--releases` lists them. Exercised against local state: rollback, roll forward, a dry run that changes nothing, an unknown id
refused, the old release's files still served after it was left.

**W8. A local mode for the deploy script.** `--local --persist-to=<directory>` does everything against wrangler's local R2 state and refuses to run without a directory (so it
cannot touch the shared local state root `pnpm dev` uses); it never deploys the Worker. `wrangler dev -c wrangler.react-demo.jsonc --persist-to <directory>` serves it.
The Worker is deployed by `--execute` only when its source (`cloudflare-worker.ts`, `release-layout.mjs`, `wrangler.react-demo.jsonc`) differs from the hash the pointer records,
or with `--deploy-worker`, and after the pointer is written, so the Worker that is still running ignores the pointer.

## What `live_compile.web.wasm` costs a visitor who never opens the code panel

After the engine's module (5.61 MiB) it is the largest download, and nothing on the page uses it until the code panel opens. Its cost is the download. Its startup and memory cost are in the noise.

| What | Cost |
| --- | --- |
| Bytes | 8,728,932 raw; 2,346,245 brotli (2.24 MiB, 18 percent of a cold visit's 12.16 MiB); 3.03 MiB as Cloudflare compressed it before (zstd) |
| Static memory in the shared heap (`dylink.0`) | 566,424 bytes and 1,229 table slots (the UI extension: 973,972 bytes, 2,745 slots) |
| Startup, local file server, headless Chrome, 4 alternating runs each | ready (`godotReactDemo`) with it: 1178, 1276, 1418, 1202 ms, median 1276; without it: 1294, 1227, 1152, 1241 ms, median 1241. The 35 ms between the medians is inside the spread of either set |
| Memory after the page is up and idle (`measureUserAgentSpecificMemory`, after a forced GC) | 248.2 MiB with it (the same four times), 247.6 to 247.7 MiB without: 0.5 MiB, which is its 566,424 bytes of static memory. Anything its code costs beyond that is inside the noise of the measurement |
| Time to fetch it | 2.24 MiB at 20 Mbit/s is 0.94 s of a cold visit that now takes 6.7 s on that line, in parallel with the other files |

The A/B (a throwaway script, `ab.mjs`, not committed) is the release export as built against the same export with `live_compile.web.wasm` taken out of the page's `gdextensionLibs` (a local file server, so the network is not in the numbers; the machine's load average was 20 to 43 while it ran, so read the medians, not single runs). The engine does start without it: it logs one error line
(`Can't open dynamic library: addons/live-compile/bin/live_compile.web.wasm ... file not found, and synchronous loading of external files is not available`, from `OS_Web::open_dynamic_library`)
and the page comes up; the code panel's `openExtensionHost` then throws "The live-compile extension is not loaded" because `LiveCompile` is not a class.

**Can a side module be loaded when the code panel first opens?** In principle yes; it is not small, so it is not built. Evidence from the sources:

- Emscripten loads what the page lists in `gdextensionLibs` as `dynamicLibraries` during startup (`index.js`, `D.o`), and Godot's `OS_Web::open_dynamic_library` (`platform/web/os_web.cpp:277`) calls
  `dlopen` with only the file name of the `.gdextension` library path. It succeeds only for a library already loaded; it cannot fetch (`synchronous loading of external files is not available`).
- The engine's JS module does expose `loadDynamicLibrary` after start (`platform/web/js/engine/engine.js:175` checks for it), and it is asynchronous, so a library can be fetched and loaded later.
- What it would take: (1) take `live_compile.web.wasm` out of `gdextensionLibs` and out of the startup extension list, so no error line and no failed extension (`.godot/extension_list.cfg`
  lists the extension; the export writes it); (2) when the panel is first asked for, the page script fetches the file (its URL is a release URL, so it is cached like the rest) and calls
  `loadDynamicLibrary(name, { loadAsync: true, global: true, nodelete: true })`, reachable from Godot through `JavaScriptBridge`; (3) then `GDExtensionManager.loadExtension('res://addons/live-compile/live_compile.gdextension')`,
  which `dlopen`s the now-loaded library and initialises its classes for the levels already reached; (4) `live-compile-host.ts` uses `LiveCompile` from the `godot` module and checks `typeof LiveCompile !== 'function'` when the host opens, so it must be
  looked up after step 3; whether GodotJS's `godot` module sees a class registered after it was first evaluated was not checked; (5) `tryOpenExtensionHost` becomes asynchronous
  and the panel needs a "loading the compiler" state.
- The unknowns: Breaka's Web engine has a lazy function-table ABI that every side module must match (`scripts/build-web.mjs`, `breaka.lazy-table` metadata), and nothing in the tree loads a module after startup, so whether
  a late load grows the table correctly is untested; the extension starts a service thread from the pthread pool (`start()`), which at that time is a pool worker created on demand. It is a day's
  experiment with a real chance of a snag in the ABI, for 2.2 MiB (18 percent of a cold visit) and about 35 ms (noise) of startup and 0.5 MiB of memory. I would do it after the current batch if Ben wants the first visit under 10 MiB.

## Duplicated bundles: is it worth fixing at the root?

`scripts/build.mjs` bundles every entry point with all its dependencies (`bundle: true`, one esbuild call over `DEMO_ENTRY_POINTS`), so a script that imports React and the
library carries them. An esbuild metafile of `main.ts` (2,633,736 bytes, unminified, no maps) says what the playground's own script is made of: **740,538 bytes (28 percent) are verification
code** that `main.ts` imports statically (`verify`, `verify-interaction`, `verify-motion`, `verify-live-compile`, `probe`, goldens), 404,872 react-reconciler, 403,591 the demo and its
labs, about 687,000 CodeMirror (307,965 its view, 113,567 its state, 208,219 the Lezer parsers, 57,500 its language and commands), 259,994 the library. The release pack's bundles that remain are
`main.js` (2.65 MB) and `world-main.js` (0.78 MB), which repeats React and the library. What a root fix would save in the release export: dropping the verification code from
`main.js` is 0.74 MB raw and about 0.13 MB brotli-compressed (28 percent of `main.js`'s 458,567 compressed bytes, by share); sharing React and the library between `main` and `world-main` is about 0.7 MB raw, 0.1 MB
compressed (`world-main.js` is 122,162 compressed bytes, most of it the copy); loading CodeMirror only when the code panel opens is about 0.69 MB raw, 0.12 MB compressed. In the debug export (the verifiers' pack, 52.7 MiB, 46.1 MiB of it maps and the verifiers' copies) it would be far more, but nothing waits
on that pack over a network. What it would take: `main.ts` would load its verifiers with `require()` on the flag that starts them (the exporter follows a module's `children`, so a debug pack that keeps the verifier scripts would keep what they load, and the release stage already drops them; whether
GodotJS resolves a relative `require` of a compiled bundle on the Web was not tried), and a shared chunk would need esbuild's `splitting`, which needs ESM output, while `scripts/build.mjs` builds CommonJS for GodotJS and
I did not check whether the Web loader takes ESM: otherwise a hand-made shared bundle with the entry points as externals.
So: a day of work with GodotJS loader unknowns.
Not worth doing now: together about 0.36 MiB of a 12.2 MiB first visit. (The compressed figures are shares of the measured compressed bundles, not separate builds.)

## Verification

All on this worktree, heavy commands through the gate, Chrome headless through puppeteer-core (CDP, no OS input, no focus), the machine at a load average of 20 to 43 throughout.

| What | Result |
| --- | --- |
| `pnpm test` | 723 tests, 723 pass (run twice, the second on the final code). New: `tests/web-worker.test.ts` (10: the Worker against an in-memory bucket: routing, headers on every status, br by the browser's own header, `br;q=0`, 304s, the redirects, HEAD, 404s that never reach the bucket, 503 and logged 500s), `tests/web-release.test.ts` (8: Accept-Encoding parsing, types, the `<base>`, release ids, staging and the manifest the Worker accepts, refused exports, manifest and pointer validation, pointer history and rollback), `tests/release-stage.test.ts` (7: the plan against the real project, refused plans, staging on a fixture tree, the pack guard, a synthetic format-4 pack read and refused when truncated, encrypted or another format). `tests/script-arguments.test.ts` gained `check-site` |
| `pnpm test:types` | exit 0 (the Worker, which `tests/web-worker.test.ts` imports, is now type checked) |
| `cargo test --locked` | 810 passed, exit 0 (no Rust changed) |
| `cargo clippy --locked --all-targets -- -D warnings` | exit 0 |
| `rustup run stable cargo fmt --check` | **fails on `main` at 9697dd6, in four files this track did not touch** (`native/lib.rs` module order, `props.rs` import order, `render_tree.rs`, `scroll.rs`); not fixed here |
| The pack guard's negative control | `assertReleasePack` on the old release pack and on the debug pack: "not a release pack (124 problems)"; on the new release pack: 30 files, passes |
| `node scripts/build-web.mjs --release --export-only` | "Release pack: 30 files, no source maps; scripts main, scene-launcher, world-main; left out 39 scripts and a11y.tscn, text-layout-probe.tscn." 6,916,556 bytes (was 55,265,884) |
| The debug export, which the verifiers use | `node scripts/build-web.mjs --export-only`: 154 files, 55,252,540 bytes of entries, the same count and groups as the old pack (42 source maps 33.23 MiB, 39 verifier bundles 12.86 MiB): nothing it had was removed |
| `node scripts/verify-web.mjs` (debug export) | `GODOT_REACT_WEB_VERIFY_PASSED` 261 assertions, 53 captures |
| `node scripts/verify-web.mjs --release` (the stripped pack) | `GODOT_REACT_WEB_VERIFY_PASSED` 261 assertions, 53 captures |
| `node scripts/verify-live-compile-web.mjs --release` (the stripped pack, the editor's compiler in Chrome) | `GODOT_REACT_WEB_LIVE_COMPILE_VERIFY_PASSED` 8 assertions |
| `node scripts/verify-interaction-web.mjs` on the debug export, every section but `navigator` and `transforms` (they fail on `main`, below) | `GODOT_REACT_WEB_INTERACTION_VERIFY_PASSED`: 15 sections, four viewports, 2,473 assertions, 336 captures |
| `node scripts/verify-interaction-web.mjs --release --only=navigator` on the stripped release pack | the landscape pass completed (30 captures: all 25 labs opened including the World space scene lab, the window labs and their return), then the portrait pass failed at the check that fails on `main` (below) after 28 captures |
| `node scripts/deploy-web.mjs --execute --local --persist-to=artifacts/web-load-r2`, `wrangler dev` on it, `node scripts/check-site.mjs --url=http://127.0.0.1:8811/ --accept-encoding=br --files` | passed: the navigator lists 25 labs, a lab is shown without tripping its error boundary, Next shows another, the code panel opens, the document is the export's page with only the `<base>` added, and all 9 other files of the release export are served byte for byte (through the redirects and the stored brotli); no console error, no failed request. Ran for the pack before and after the web shell change, ready in 1.3 to 3.6 s on this machine depending on its load |
| Rollback, local | `--rollback` dry run (changes nothing), `--rollback --execute` (the site serves the earlier release), `--rollback=<id> --execute` (forward again), an unknown id (refused, exit 1), the released files of the older release still served |
| A throwaway Worker on `wrangler dev` | showed that the Worker sees `Accept-Encoding: br, gzip` whatever the browser sent, with the browser's in `request.cf.clientAcceptEncoding`, and how the local runtime re-encodes a manual `br` (W3) |

**Two sections of the Web interaction verifier failed on `main`, and not because of this track.** Both were wrong checks, since fixed (`docs/tracks/web-fixes.md`):
the wheel check expected one tick from a 100 px Chrome wheel, which the engine's Web display server turns into three, and the portrait filter check counted the lab
menu's items while the menu was closed. What follows is what this track saw at the time. `transforms`: the first full `verify-interaction-web.mjs` on the debug export failed in the landscape pass of `transforms`:
"A wheel tick over a vertical list tilted 8 degrees scrolls it about a tick: top 51.989, tick 17.5" (about three ticks, not one). Run alone (`--only=transforms`) it failed with
the same value to the last digit. Control: the debug export rebuilt with the web shell exactly as `9697dd6` has it (this track's only change to the debug export's inputs), `--only=transforms`: the
same failure, same value. So it is deterministic and present in the base. Not investigated further (it is the scroll and transforms code, not this track); the history of `native/scroll.rs`
puts `8721e7b` (the Shift+scroll change in the web shell and the scroll code) closest to it, which is a suspect, not a finding.

`navigator`: "portrait: Escape in the filter clears it" (`scripts/verify-navigator-web.mjs:156`; after Escape the check counts `lab-menu-item-*` nodes, which in the portrait layout I take to exist only while the menu's list is open; a reading of the check, not tested). Failed in the
full run, alone, and with the base web shell (rebuilt and run the same way), so also deterministic and in the base; the landscape pass of the same section passes, for the debug and for the stripped release pack.
Not investigated. Neither failure is hidden by the 2,473-assertion pass above: those two sections are the ones left out of it, and I did not edit either verifier.


## After the deploy (the coordinator's commands)

```sh
# 1. Build the release export from the merged tree (the build strips the pack, and the deploy refuses a pack that is not stripped)
node scripts/build-web.mjs --release            # --export-only when the side modules are already built for this tree
# 2. Plan: stages and compresses, prints every file, how a visitor gets it, and what would be uploaded; touches nothing
node scripts/deploy-web.mjs
# 3. Publish: uploads what the bucket lacks, writes the pointer, deploys the Worker (its source changed). Needs the wrangler login of the breaka account.
node scripts/deploy-web.mjs --execute
# 4. Check the live site: loads it in headless Chrome, compares every file with the export's receipt, opens a lab and the code panel
node scripts/check-site.mjs --url=https://react.breaka.club/ --files
# 5. The one thing only the edge can show: the stored brotli must arrive as stored (content-encoding: br and the stored content-length, not a re-encoding)
R=$(curl -s 'https://react.breaka.club/?demo=navigator' | grep -o '/r/[0-9a-f]*/' | head -1)
curl -sI -H 'Accept-Encoding: gzip, deflate, br, zstd' "https://react.breaka.club${R}index.js"      # expect content-encoding: br, content-length 180271-ish
curl -sIL -H 'Accept-Encoding: gzip, deflate, br, zstd' "https://react.breaka.club${R}index.pck"   # 302 to /o/<hash>/index.pck, then content-encoding: br
```

Rollback, if the site is wrong:

```sh
node scripts/deploy-web.mjs --releases                         # what the site has shown, newest first
node scripts/deploy-web.mjs --rollback --execute              # back to the release before the current one (pnpm deploy:web:rollback)
node scripts/deploy-web.mjs --rollback=<id> --execute         # or to a named one
```

That is a single object write; no upload, no Worker deploy. If the new **Worker** is the problem (it reads `react-demo/v2/`; the old one reads `react-demo/current/`, which this change leaves alone):
`wrangler rollback -c wrangler.react-demo.jsonc` (or redeploy the previous commit's Worker). The deploy needs root `pnpm dev` stopped only for the backend, not for this.

## Limits that stay

- **Production's edge was not run.** Whether Cloudflare passes the stored brotli through to Chrome as stored is documented, not observed (W3); the command that shows it is step 5 above. The
  local runtime re-encodes it for Chrome's own header, so every local `br` number forces `Accept-Encoding: br`. The worst case if the edge re-encodes is what `.wasm` already got.
- **Other browsers were not run.** Chrome only (headless, CDP). Cached 302s, `<base>` with workers, `Content-Encoding: br` with `instantiateStreaming` and the isolation headers are standard,
  but Safari and Firefox were not tried. Brotli is accepted by every browser that has the WebGL 2, SharedArrayBuffer and threads the page requires.
- **The real bucket was not touched.** `wrangler r2 object get/put --remote` and `wrangler deploy` were not run. The "no such key" test of the deploy script matches wrangler's local message
  ("The specified key does not exist"); the remote message was not seen. A first deploy that fails there fails loudly before anything is written.
- **Nothing prunes the bucket.** Old releases stay (so tabs with an old page keep working), and an object is stored once however many releases use it. Wrangler cannot list objects, so a
  prune would work from the manifests; not written. A deploy that changes the pack and the page stores about 2 MiB; one that changes the engine module stores 5.6 MiB plus 30.7 MiB raw.
- **The stock engine's release export was not built here** (its Web side module is not installed in this worktree; `build-web --engine=stock` would first rebuild it). The staging is engine-agnostic and
  unit tested for both profiles' presets (they are untouched); run `node scripts/build-web.mjs --release --export-only --engine=stock` and `node scripts/verify-web.mjs --release --engine=stock` once.
- **Timing is Chrome on this machine with emulated throttling**, not a home connection through Wi-Fi and TLS; "ready" is `godotReactDemo` appearing, not the first painted frame. Production's rows add its real round trip.
- **A cold visit pays one extra round trip for the five redirects** (in parallel, so about the round trip once; 0.04 s at 40 ms). The bare `/` redirect is `no-store`, so every visit to the bare address pays one more.
- **`main.js` still carries the verifiers and CodeMirror** (see "Duplicated bundles"); not changed here.
- **Cloudflare Web Analytics still injects its beacon** into the document (a zone setting, not this Worker), so the page makes a request to `cdn-cgi/rum` and one for `beacon.min.js`.
- **The shell's percentage is the pack and the engine module only**; the side modules are not in it (W2).
- **A verifier that was running in another track's headless Chrome may have been killed by me**: I stopped a hung A/B run of mine with `pkill -f` on Chrome's flags, which matches every headless Chrome of
  the tracks that launch it that way. Nothing else was touched; a verifier that failed with a closed browser during this session should simply be re-run.

## README text

**Web hosting (react.breaka.club).** The release Web export is a stripped pack (30 files, 6.6 MiB: no source maps, none of the verification or probe scripts; the Web verifiers use the
debug export, which is unchanged). `pnpm deploy:web` compresses each file once with brotli, publishes an immutable release under `react-demo/v2/` (a manifest and content-addressed objects)
and moves a single pointer; the Worker serves the current release's page, revalidated on each visit, and everything else from `/r/<release>/` and `/o/<hash>/` URLs cached for a year,
with the stored brotli as `Content-Encoding: br`. A first visit transfers about 12 MiB (it was 66), a returning visitor after a deploy about 2 MiB, one with nothing new two small requests.
`pnpm deploy:web:rollback` points the site back at the previous release in one object write; `pnpm check:site --url=<address> --files` loads a site in headless Chrome, reports what the
load cost and checks that the navigator, a lab and the code panel work. `--local --persist-to=<directory>` runs the deploy against wrangler's local state for `wrangler dev`. See
`docs/tracks/web-load.md`.
