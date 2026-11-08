# Track: rotation (a phone turned landscape and back keeps the landscape width)

Branch `rotation`, based on main `a1bba11`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the README text is at the end).

Ben's report: "Rotated to landscape and back and got stuff with layout off screen." His screenshot (`artifacts/reports/ben-rotation-android.jpg`, Android Chrome on a phone at react.breaka.club) shows the navigator after
portrait, landscape, portrait: the top bar's select, its open lab list and the group labels run off the right edge, as if the root kept a landscape width.

**The browser in the screenshot is probably not Chrome.** Its bottom toolbar (a shield with a tick inside the address pill, a "+" button, a rounded tab counter reading 79, a vertical three-dot menu) is the toolbar of Firefox for
Android (Gecko), whereas the brief and the emulation here are Chrome's. The screenshot names no browser, so this is a reading of the icons, not a fact; the question for Ben is which browser he used. It matters for what is proven below.

## Result

| Part | State |
| --- | --- |
| Reproduced | Yes, in headless Chrome's mobile emulation (CDP `Emulation.setDeviceMetricsOverride`, `mobile: true`, 412 x 915 at DPR 2.625), on this branch's export **and on the live site** (read-only). Landscape to portrait leaves the page zoomed out to 0.45, `window.innerWidth` 912, the canvas and the root 912 CSS pixels wide in a 412 pixel screen. |
| Cause | The page's own canvas. See "Cause". Not the engine's resize code, not the content scale, not the root's size sync: each did what it was told. |
| Fix | In `demo/web-shell.html`, the HTML shell, which both engine profiles use: the canvas sits in a fixed, clipping `#stage`, and the viewport meta has `minimum-scale=1`. No engine, template or Rust change. |
| Check | New Web section `rotation` (`scripts/verify-rotation-web.mjs`, judged by `scripts/rotation-check.mjs`, unit tests `tests/rotation-check.test.ts`). **Fails on main, passes with the fix.** |
| Not verified | A real Android or iOS device. See the end. |

## Reproduction

Everything through the gate, headless Chrome, no OS input. The probe is a throwaway (`artifacts/rotation-probe/probe.mjs`, not committed); its job was to record every layer at each step. The committed check (below) is
the repeatable form.

The device is turned with `Emulation.setDeviceMetricsOverride({ width, height, deviceScaleFactor: 2.625, mobile: true, screenWidth, screenHeight, screenOrientation })` and `Emulation.setTouchEmulationEnabled`, portrait to
landscape to portrait to landscape to portrait, 4 s after each turn. The emulation sends `orientationchange`, then `resize` and `visualViewport` `resize` (landscape to portrait: `orientationchange` first, `resize` about 30 ms later). Recorded per step: `innerWidth`/`innerHeight`,
`visualViewport` (size and scale), the document's `clientWidth` and `scrollWidth`, the canvas's CSS size and backing size, `scaleFacts()` (the window's content scale factor), and the root's width and height from the snapshot.

Main's export (`a1bba11`), phone 412 x 915 at DPR 2.625, the navigator (`?demo=navigator`), lab list closed:

| Step | `innerWidth` x `innerHeight` | `visualViewport.scale` | document `clientWidth` / `scrollWidth` | canvas CSS size | canvas backing | root (width x height) |
| --- | --- | --- | --- | --- | --- | --- |
| portrait, at start | 412 x 915 | 1 | 412 / 412 | 411 x 914 | 1081 x 2401 | 411.8 x 914.7 |
| landscape, 0 to 4000 ms | 915 x 412 | 1 | 915 / 915 | 914 x 411 | 2401 x 1081 | 914.7 x 411.8 |
| **portrait again, 0 ms** (`orientationchange` only) | **914 x 2030** | **0.451** | 412 / **914** | 914 x 411 (still the landscape canvas) | 2401 x 1081 | 914.7 x 411.8 |
| **portrait again, 300 ms** (`resize` has fired) | **912 x 2026** | **0.452** | 412 / **912** | **912 x 2025** | 2394 x 5318 | **912 x 2025.9** |
| portrait again, 4000 ms | 912 x 2026 | 0.452 | 412 / 912 | 912 x 2025 | 2394 x 5318 | 912 x 2025.9 |

It never recovers, and every later turn does the same (landscape, portrait: 912 wide again). Portrait to landscape is always right. The same run on **the live site** (`LIVE_URL=https://react.breaka.club/`, read-only requests)
gives `innerWidth` 913 x 2028, scale 0.451, canvas 913 x 2029 at 0 ms and 912 x 2026, scale 0.452, root 912 x 2025.9 at 4000 ms. The emulation shows the page zoomed out, where Ben's phone shows a page at normal size
with its right part off the screen: the same symptom (a page as wide as the landscape canvas) at another scale, which I could not tie to one browser behaviour without his phone (see "Not verified").

## Cause

The chain, each link read from a number above or from the source:

1. Godot's Web display server sizes the canvas from **`window.innerWidth` and `innerHeight` multiplied by `devicePixelRatio`**, every frame (`GodotDisplayScreen.updateSize` in `platform/web/js/libs/library_godot_display.js`, called from
   `DisplayServerWeb::check_size_force_redraw` each frame; the stock 4.7.2 source, `/Users/ben/Development/godot-stock/src/godot/platform/web/js/libs/library_godot_display.js` lines 320 and 321, has the same `window.innerWidth * scale`,
   read and not modified). The export's `canvasResizePolicy` is 2 (full window). It writes the result to `canvas.style.width/height` in pixels.
2. The demo's root takes its size from the window (`Demo._process`: `getVisibleRect().size`, divided by the content scale factor, which `updateDisplayScale` sets to `DisplayServer.screenGetScale()`). `scaleFacts()` reads 2.625 at every step.
   The root's size is therefore the canvas's backing size divided by the pixel ratio: 912 x 2025.9 is exactly 2394 / 2.625 x 5318 / 2.625. **The root, the window and the content scale did what they were told**; they were told 912.
3. When the phone goes from landscape back to portrait, Chrome fires `orientationchange` and measures the page **before** the engine's next frame. At that moment the canvas is still the landscape one, 914 CSS pixels wide, positioned in
   the 412 pixel viewport: `documentElement.scrollWidth` is 914 and `clientWidth` is 412. The document's `scrollWidth` is 914 although `html, body` are `overflow: hidden`.
4. On a viewport change, mobile Chrome zooms the page out to fit content that is wider than the layout viewport (`visualViewport.scale` 0.451 = 412 / 914). **`window.innerWidth` follows the visual viewport's width in CSS
   pixels** there, so it becomes 412 / 0.451 = 914, and `innerHeight` 2030 (in the emulation `innerWidth` equals `visualViewport.width` at every row above).
5. The engine reads the 914 and sizes the canvas to it (912 after the next `resize`, as the height and the zoom settle). The canvas is still the widest thing on the page, so the zoom stays and `innerWidth` stays: **a fixed point**
   the page holds itself in. Nothing about the canvas shrinking back can happen, because shrinking it is what the engine would do from a 412 `innerWidth`, which the browser no longer reports.
   Portrait to landscape cannot do this: a canvas smaller than the new viewport overflows nothing.

Controlled experiments on main's export, the same probe, only the shell's `index.html` changed (symlinked copies of the export under `artifacts/rotation-probe/`):

| Shell | Landscape back to portrait, 0 ms | at 4000 ms |
| --- | --- | --- |
| main | `innerWidth` 914, scale 0.451, `scrollWidth` 914 | stuck: 912 x 2026, scale 0.452, root 912 x 2025.9 |
| meta viewport `minimum-scale=1` only (v1) | `innerWidth` 412, scale 1, `scrollWidth` 914 (the old canvas, still too wide) | 412 x 915, scale 1, canvas 411 x 914, root 411.8 x 914.7 |
| canvas in a `position: fixed; inset: 0; overflow: hidden` stage only (v2) | `innerWidth` 412, scale 1, `scrollWidth` 412 | the same, healed within a frame of the `resize` |
| both (v3, what ships) | `innerWidth` 412, scale 1, `scrollWidth` 412 | the same |

Each alone removes the failure in the emulation, so the proof that the page's own overflow is the cause is the pair: with the zoom forbidden (v1) the engine reads a 412 `innerWidth` on the next frame and the canvas
shrinks; with the canvas unable to overflow (v2) the browser never zooms. The engine's own resize path is the one that heals the page in both.

### Layers looked at and cleared

- **Godot's Web canvas resize on orientation change** (`DisplayServerWeb`, `library_godot_display.js`): polled every frame and called by a `resize` listener; with a correct `innerWidth` it resized the canvas within one `resize` event of the turn
  in every healthy run above. It is not stale. It *follows* `innerWidth`, and the 912 is what it was given.
- **The window's content scale / the root viewport:** `scaleFacts()` (content scale factor, viewport oversampling, screen scale) is 2.625 at every step, in every variant.
- **`syncRootSize` / `useRootSize`** (`src/renderer.ts`): they read the native Control's `size`, which the demo sets from the window each frame; the 912 comes from the window. They are not involved, and **nothing in the library needed to change.**
- **A stale `innerWidth` right after rotation** (the mobile-browser quirk the brief suggested): real in a sense, `innerWidth` is 914 at 0 ms, but not stale: it is the zoomed-out visual viewport's width, and it stays 912 for ever.
  `orientationchange` arrives **before** `resize` here, as on phones, so the 0 ms row is what the engine's frame loop sees first.

No engine, template or Rust change is made or needed. The stock 4.7.2 template (`/Users/ben/Development/godot-stock`) and Breaka's templates are untouched, and the fix is in a file both profiles use.
If the engine were ever hardened, `updateSize` could read `document.documentElement.clientWidth/clientHeight` (412 and 915 throughout in the table above) instead of `innerWidth`; it is not proposed here, and not needed (it would only make the engine
independent of page zoom, and the stock template could not take it).

## The fix

`demo/web-shell.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
...
#stage { position: fixed; inset: 0; overflow: hidden; }
...
<div id="stage"><canvas id="canvas" ...></canvas></div>
```

- The fixed, clipping stage is the cause's fix: a fixed element does not count toward the document's scrollable size and the stage clips its child, so the canvas can never be the content the browser fits. The engine sets the canvas
  `position: absolute` inside it (`canvas_resize_policy` 2), which now positions against the stage, which is at the page's corner: coordinates are unchanged.
- `minimum-scale=1` is the zoom: the browser may not zoom this page out (zooming in is unchanged). It is the standard
  answer for this Chrome Android behaviour and each of the two removed the failure alone; both are kept because they answer different causes of the same state and cost nothing.
- The engine's hidden text elements for the soft keyboard are inserted before the canvas, so they are in the stage too; they are positioned from the canvas's rectangle (`GodotDisplayVK.updateSize`), at `z-index: -1`, unchanged in effect.
- `docs/WEB.md` says what a hosting page must do.

## The check: Web section `rotation`

`node scripts/verify-interaction-web.mjs --only=rotation` (or with other sections). Each case is a page of its own, in Chrome's mobile emulation with touch on:

| Case | Device | Turns |
| --- | --- | --- |
| `phone` | 412 x 915, DPR 2.625 (Ben's phone class) | portrait to landscape, back to portrait, to landscape again (so portrait to landscape, and portrait to landscape to portrait) |
| `phone-list-open` | the same | the lab list is opened with a touch in portrait and **left open across each turn**; whichever way the turn leaves it (it closes on a resize), it is opened again once the page has settled |
| `tablet` | 800 x 1280, DPR 2 | portrait to landscape to portrait: the navigator changes between its top bar and its sidebar (1024 px breakpoint) |

After each turn the page may settle for 5 s (the engine looks at the window every frame, so a healthy page took 40 to 200 ms in the runs below: logged as `settledAfterMs`), must then hold for 30 more frames, and the page must **fill the device's viewport**
(`rotationProblems`, one sentence for each layer that does not):

1. the browser's layout viewport (`innerWidth`/`innerHeight`) is the device's size, and `visualViewport.scale` is 1;
2. the device pixel ratio is the one emulated;
3. the document's content (`scrollWidth`/`scrollHeight`) is no larger than its layout viewport;
4. the canvas is the device's size at 0,0, and its backing store is that size times the ratio (floored);
5. **the root's width and height equal the viewport's** (within one pixel: the engine floors the canvas's CSS size);
6. **no node of the navigator extends past the root** outside a scroll container (`outsideTheRoot`; what a scroll container holds reaches past it by design), the open lab list included;
7. the navigator has the layout of the window's width (sidebar from 1024, top bar below).

The root's size is also sampled **at every frame of each turn** (`rootRect()`, in the page) and must be one orientation's size or the other at each frame (`transientRootProblems`): a frame in which the root is outside the device's two
sides is a root that was not told the window's size (see "The narrow root of the batch regression"). Screenshots of every settled step are in `artifacts/web-interaction-verification/rotation/` (a protocol screenshot of the
emulated viewport, not puppeteer's 800 x 600).

`rotationProblems` and `outsideTheRoot` are pure and unit-tested (`tests/rotation-check.test.ts`) against the broken page's numbers above and against a healthy page's.

### The negative control, on main

With the check in place and the shell as on main (`a1bba11`), `node scripts/verify-interaction-web.mjs --only=rotation` exits 1, after the start and the portrait to landscape turn passed, at the turn back to portrait:

```
rotation: phone, turned to portrait (lab list closed): the root, the canvas and the browser's viewport are the device's 412 x 915: {"problems":[
 "the browser's layout viewport is 912 x 2026 (window.innerWidth/innerHeight), not the device's 412 x 915",
 "the browser zoomed the page to 0.4517543911933899 (visualViewport.scale), not 1",
 "the document's content is 912 x 2026, larger than its 412 x 915 layout viewport",
 "the canvas is 912 x 2025 at 0,0, not 412 x 915 at 0,0",
 "the canvas's backing store is 2394 x 5318 pixels, not 1081 x 2401",
 "the root is 912 x 2025.9, not the viewport's 412 x 915"],"settledAfterMs":5042,...
```

Log: `artifacts/logs/rotation-main-negative-2.log` (the first version of the check, before the list and sampler were added, failed at the same step: `rotation-main-negative.log`). The commit that adds the check (`faa2301`) has no fix, so
that commit is the control.

## The narrow root of the batch regression

`docs/tracks/regression-fixes.md` records a Web root briefly narrower than 32 px "for no proven reason". The question was whether root-size handling on the Web is a cause of both.

**Not shown.** In the emulation here, the root is never narrower than the narrower side of the device at any frame of any turn (43 to 48 frames sampled per turn, every one the size of one orientation or the other; `transientRootProblems`),
and the failure found here makes the root *wider*, not narrower. The mechanism found (a canvas sized from a measurement the browser changes) could make a root narrow if `window.innerWidth` were momentarily tiny, which no
measurement here shows. The new check would fail a run in which that happened *during a turn* (the sampler), or *after a settle* (`rotationProblems`); it does not watch the interaction verifier's own `page.setViewport` calls. I do not
claim this fix explains that regression, and the notes there stand.

## Evidence

All through the gate, in this worktree (`rotation`, from `a1bba11`), Breaka's profile, the debug export, headless Chrome. Logs in `artifacts/logs/`.

| Command | Result |
| --- | --- |
| `node scripts/verify-interaction-web.mjs --only=rotation` with **main's shell** (commit `faa2301`: the check, no fix), rebuilt with `node scripts/build-web.mjs --export-only` | **FAILED**, exit 1, at `phone, turned to portrait`: the six problems quoted above; the start and the turn to landscape passed first. `rotation-main-negative-2.log`. |
| the same with the fix (`demo/web-shell.html`), export rebuilt | **PASSED**, 34 checks (46 assertions with the section's start), 3 pages; each settled in 40 to 200 ms. `rotation-fixed-2.log` |
| `node scripts/verify-interaction-web.mjs --only=navigator,touch,hidpi,rotation` on the final tree | **PASSED**: `hidpi` 80, `navigator` 2043, `rotation` 34, `touch` 59 checks; 2,233 assertions, 153 captures. `rotation-fixed-pass.log` |
| `pnpm test` | 969 tests, 969 pass (includes `tests/rotation-check.test.ts`, 8 tests, and `tests/verifier-sections.test.ts`, which holds the new section to a branch in the Web verifier) |
| `pnpm test:types` | exit 0 |
| `cargo fmt --check` | clean. No file under `native/` or `src/` changed, so `cargo test` and `cargo clippy` were not run and no native section was run. |
| `node scripts/build-web.mjs --engine=stock`, then `node scripts/verify-interaction-web.mjs --engine=stock --only=hidpi,rotation,touch` (the stock 4.7.2 Web template, Emscripten 4.0.11, the same shell) | **PASSED**: `hidpi` 80, `rotation` 34, `touch` 57 checks, 188 assertions; the one engine gap is the known `touch-cancel` one. `rotation-stock.log`. Not run on stock's unfixed shell, so there is no stock negative control: the stock template has the same `innerWidth` code (read from its source above). |
| `pnpm test:types --engine=stock` | exit 0 |
The probe's numbers (the table under "Reproduction", the live site and the four shell variants) are in `artifacts/logs/probe-1.log`, `probe-live.log`, `probe-v1.log`, `probe-v2.log`, `probe-v3.log`.

## Not verified

- **A real Android or iOS device, and any browser but Chrome.** If the screenshot is Firefox for Android (above), nothing here ran on Gecko: Gecko's viewport, zoom and `innerWidth` rules are not Chrome's. Chrome's emulation does reproduce a failure
  of the same shape, a page as wide as the landscape canvas after the turn back, from the same source (a canvas sized from `innerWidth` that is itself wider than the new viewport), and the shell fix removes that source for any browser
  that lets overflowing content widen its viewport (the fixed, clipping stage leaves nothing to overflow; `minimum-scale=1` is the standard instruction against shrink-to-fit and zoom-out). That is a reason to expect it to help Ben's browser, not a test of it.
  Everything above is Chrome's emulation of a phone. Ben's screenshot shows the page at normal size with its right part off the screen, where the emulation shows it zoomed out to 0.45: the same width, at another scale. I
  could not see Ben's phone's `innerWidth`, zoom or events, so I cannot say they are one mechanism. If the real device still shows it after the fix is deployed, the thing to record is `innerWidth`, `visualViewport.scale`, `documentElement.clientWidth` and `scrollWidth` at
  the broken moment (the probe's `state()` is the shape), and the next candidate is the engine reading `document.documentElement.clientWidth` instead of `innerWidth` (above).
- Which event Android Chrome sends that the emulation does not: none is known. The emulation's order is `orientationchange`, `resize`, `visualViewport` `resize`; a real turn animates, and Android may send more than one
  `resize` with intermediate sizes. The check turns the device in one step.
- Safari on iOS and iPadOS, Firefox, Samsung Internet; the browser's address bar collapsing, split-screen and foldables.
- The release export on the deployed site: the check runs on the debug export. The shell is the same file for both modes, and the fix reaches the site only when `main` is redeployed (`node scripts/build-web.mjs --release && node scripts/deploy-web.mjs --execute`).
- Native: no Rust, no native code and no demo script changed, so no native section was run for this track. Running the stock Web build installed the stock profile's side module over Breaka's in this worktree's `demo/addons` (ignored files); `artifacts/web-debug` is still Breaka's export, `artifacts/stock/web-debug` stock's.

## README text

**Turning a phone.** The Web shell (`demo/web-shell.html`) keeps the canvas out of the document's size: it sits in a fixed, clipping stage and the viewport meta has `minimum-scale=1`. Godot's Web display server sizes the canvas from
`window.innerWidth` every frame, and on mobile Chrome a canvas that is wider than the viewport (the landscape canvas, the moment a phone is turned back to portrait) makes the browser zoom the page out, which makes `innerWidth` the wider
size and the page stays that wide. A page that hosts the canvas must do the same. The Web interaction verifier's `rotation` section turns an emulated phone and tablet (Chrome's mobile emulation, touch on) from portrait to landscape and
back with the navigator on screen, the lab list open and closed, and requires the browser's viewport, the canvas, the root and every navigator node to fit the device after each turn (`docs/tracks/rotation.md`).
