# Track notes: HiDPI rendering review (Phase H1)

Branch `hidpi`, based on main `6c6abd7` (the fix that made text sharp at a content scale of two), rebased once onto main `944ca90`
(Phase I7, `TextInput`) at the coordinator's request. This file is the implementer's notes and report; `docs/INTERACTION_PLAN.md` and
`docs/INTERACTION_PROGRESS.md` are not edited here. The recipe for panels in a 3D scene is `docs/WORLD_SPACE.md`; the owner-facing
rule is the README's "Display scale".

**Result in one paragraph.** `6c6abd7` was right about the problem (outside Godot's `_draw`, TextServer draws at 1x unless it is
given a level) and right about the main window, but its rule was not the engine's: it drew at the larger of the viewport's
oversampling and the content scale factor of the window around it. The second term is redundant for a window and wrong in three
cases (a `SubViewport`, the viewport stretch mode, a window with font oversampling off). The review also found what the fix did not
reach: `StyleBoxFlat` has the same blind spot (a rounded edge is two device pixels soft at scale 2, a visible halo next to a Godot
`Panel`), a change of scale that carries no commit left retained text at the old level, every paint asked the engine four questions
per node, and the level was an unnamed `* 64.0`. All four are fixed and covered by new assertions that fail without them; the
world-space panel can now be rendered at twice its texels, so W9 is closed; one suspicion (fractional scroll offsets blurring text)
was measured and is wrong.

## What the engine does (read from source, then measured)

All of this is `~/Development/godot` at the engine Breaka runs.

- `CanvasItem::_redraw_callback` (`scene/main/canvas_item.cpp:150-180`) sets a global, `TextServer::vp_oversampling`, to
  `get_viewport()->get_oversampling()` (times the item's own scale when `oversampling_with_scale` is on) for the length of
  `NOTIFICATION_DRAW` and resets it to 0 afterwards. TextServer's glyph draw (`text_server_adv.cpp:4243-4284`) uses an explicit
  `oversampling` argument if it is positive, else that global, else 1. `StyleBoxFlat::draw` (`style_box_flat.cpp:498-512`) divides its
  antialiasing feather by the same global ("so that antialiasing doesn't become blurry at viewport resolutions higher than the
  default"). The root records its own canvas items through the `RenderingServer`, outside `_draw`, so both read 0: text is 1x and the
  feather is one logical pixel unless the root says otherwise.
- A `Window`'s viewport oversampling is its size over its 2D override (`Viewport::_set_size`, `viewport.cpp:1133-1180`), and a
  `Window` sets that override to `size / content_scale_factor` (`window.cpp:1302-1330`). So the window's oversampling already
  **is** its content scale factor, a stretch mode's scale or an `oversampling_override`. A `SubViewport` has its own: 1, or its
  size over its 2D override when `size_2d_override_stretch` is on. `Node::get_window()` is `Viewport::get_base_window()`, the
  main window, from anywhere.
- When a viewport's size or oversampling changes, `_set_size` calls `update_canvas_items()`, which `queue_redraw()`s every
  `CanvasItem` in it (`viewport.cpp:1396-1414`): that is how Godot's own controls re-draw at the new scale, and it is the notification
  the root can rely on. `NOTIFICATION_WM_DPI_CHANGE` is sent on macOS (`windowDidChangeBackingProperties`) and Wayland, after
  `_update_viewport_size()` has already done the above; the Web display server sends none, the owner polls instead.
- TextServer keys glyph caches by oversampling in 26.6 fixed point, `CLAMP(level, 0.1, 100.0) * 64` truncated
  (`text_server_adv.cpp:2171-2200`, `_reference_oversampling_level`). A cache made for an *explicit* oversampling is never attached
  to a level (`_ensure_cache_for_size` is called with 0), a cache made for the viewport's is, and an explicit draw that finds a
  level-attached cache detaches it ("Size used directly, remove from oversampling list").

## The seven questions

**1. SubViewport and world space. Suspicion right, in one more case than named.** Measured natively
(`GODOT_REACT_HIDPI_MEASURE` lines of `verify:interaction --only=hidpi`, `artifacts/hidpi-baseline-landscape/run.log` for the first
run):

| Configuration | `viewport.get_oversampling()` | `window.content_scale_factor` | The commit's rule |
| --- | --- | --- | --- |
| no stretch settings | 1 | 1 | 1 |
| `content_scale_factor = 2` | **2** | 2 | 2 |
| `canvas_items` stretch, scale 2, factor 1 | **2** | 1 | 2 (the viewport, not the window term) |
| `viewport` stretch mode, factor 2 | **1** | 2 | **2, wrong**: the viewport renders small and is upscaled |
| `Window.oversampling = false`, factor 2 | **1** | 2 | **2, wrong**: overrides an explicit choice |
| `oversampling_override = 3` | **3** | 1 | 3 |
| `SubViewport` 480x320 in a factor-2 window | **1** | 2 (via `get_window()`) | **2, wrong**: a 2x raster minified into a 1x texture |
| `SubViewport` 960x640, 2D override 480x320 | **2** | 2 | 2 |

So a 1x `SubViewport` in a 2x window did rasterise at 2x and get minified, a viewport in the pixel stretch mode did the same, and a
window that switched font oversampling off was overridden. **Why window scale was added is not recorded in the commit and nothing
measured needs it:** for the main window the viewport's value equals the content scale factor on native (the `content-scale-2` measure) and on the Web
(`scale-facts` in `artifacts/web-interaction-verification/report.json`, equal to the device pixel ratio at both ratios). The one
rule that matches every row and what Godot's controls do is **the viewport's own oversampling**, which is what native now reads
(`ReactUiRoot::viewport_oversampling`). The floor of 1.0 went too: TextServer clamps to its own 0.1 to 100 and the engine's controls
draw at less than 1 when the viewport asks for it.

Not done: `CanvasItem.oversampling_with_scale` (a root whose own `scale` is above 1 draws at the viewport's level, like a `Label`
with the default setting). Nothing in this repository scales a root, and honouring it needs the global scale of the item and a
watch on its transform.

**2. Scale changes with no commit. Suspicion right.** `paint_pass` ran only from commit, layout, restyle and selection, and the
root handled no notification of the scale. A text node painted at 1x stayed at 1x when the viewport went to 2x unless something else
dirtied it. Fixed on the engine's own signal, not on polling: the root handles `NOTIFICATION_DRAW`, which the viewport sends every
canvas item when its oversampling changes, reads the viewport's level once and, only if it is not the level it last drew at, paints
the nodes whose items depend on it (text, text inputs, rounded boxes, scroll containers; `MountedNode::paints_at_oversampling`).
It also does this on entering the tree (a root can come from another viewport). The zero-work idle frame guarantee holds: a frame
with no change handles no notification, and a `DRAW` for another reason (a focus change) reads the level, finds it unchanged and
records nothing. Verified (`verifyScaleChanges`): an oversampling override of 3 with no commit makes the root report 3 and
re-record exactly its 4 texts and 4 rounded boxes, then six idle frames record nothing; clearing the override returns it to 2;
`Window.oversampling = false` gives 1; a `canvas_items` stretch with the factor at 1 gives 2. `WM_DPI_CHANGE` is not needed: on macOS
the viewport has already changed by the time it arrives.

**3. Cost. Suspicion right, small.** Timing 2,000 calls of the old `oversampling()` (four engine calls: `get_viewport`,
`get_oversampling`, `get_window`, `get_content_scale_factor`) inside a 2,000-node repaint on the baseline build, 30 repaints:
0.82 to 0.88 ms per repaint (0.42 microseconds per node) against a whole pass of 19 to 49 ms (the first, cold one is the 49), p50 21.4 ms with the
instrumentation subtracted: 4 %. It is now one `get_viewport` and one `get_oversampling` per pass, cached on the root, and the same 2,000-cell
repaint reads p50 19.1, 19.6, 21.5 and 19.3 ms in four runs on this loaded host (p95 21 to 33): the range overlaps the
baseline's 21.4 ms net, so the claim is the directly measured 0.84 ms (4 %), not a repaint-time improvement the noise would hide. On the
Web, where each engine call crosses the side-module boundary, the saving is larger; not measured.

**4. Glyph cache references. Suspicion right; it matters a little, and is not fixed.** The extension cannot reference a level
(`TextServer.reference_oversampling_level` is not bound), and a draw with an explicit oversampling makes a cache that is attached to no
level, so nothing frees it when the viewport stops using the level; `font_get_size_cache_info` after the verifier went from scale 2
back to 1 still lists every oversampled size, and none of the entries has a `viewport_oversampling` (they are all "used directly").
What it holds: one cache per (font, size, level) ever drawn, 256 KiB for a 16 px size at scale 2, 1 MiB for 36 to 54 px, 4 MiB for
90 px and over. The demo's 18 cache entries totalled about 20 MiB after the verifier had drawn at levels 1, 2 and 3 (the 3 is
the test's override; roughly 12 MiB of it). In use the levels are 1 and the display's (2): two sets, bounded, freed with the font. Not fixed because
there is no sound way to free a level's caches (a direct cache cannot be told from another level's by its size), and drawing from
inside `NOTIFICATION_DRAW` to get the engine's bookkeeping would put every re-record behind a deferred redraw.

**5. Named constant. Right.** `render_tree.rs`: `OVERSAMPLING_UNITS_PER_FACTOR` (TextServer's 26.6 key), its clamp range, and a typed
`Oversampling` that stores the level in those units (`from_factor`, `factor`, `feather`); keys hold it, so the f32 beside the key in
`record_content`, `TextDrawing` and the drag ghost is gone. A unit test checks that TextServer reads back the level it was given
for all 6,395 levels in its range (a level that did not survive the trip would key one cache and draw at another).

**6. Tests. Added.** `pnpm verify:interaction --only=hidpi` (native, `demo/src/verify-hidpi.ts`, page `demo/src/hidpi-lab.tsx`): the
engine facts above; at content scale 2 and 1.5 the React text against the same text drawn by a Godot `Label` and a rounded box
against a Godot `Panel`, in the raster; the scale-change checks; a text input's caret, selection and horizontal scrolling; the focus
ring; a half-device-pixel placement. `verify:world` gained `verifyPanelResolution`. The Web interaction verifier has a `hidpi`
section at both pixel ratios, which also changes the ratio in place, and `verify-world-web.mjs` checks the panel's scale.

**7. Native on a real Retina screen.** On this Mac (`DisplayServer.screen_get_scale()` 2) the demo window opens as 1120 x 800
*pixels*, 560 x 400 points, with a content scale factor of 1 and a viewport oversampling of 1: logical pixels are physical pixels,
the text is as sharp as the screen can make it, and the UI is half the size a Retina user expects. Nothing is wrong and nothing
changes without the owner: the Web owner sets `contentScaleFactor` from the screen's scale every frame, the native owner does not,
and **that is left alone**. Setting it natively would halve the logical size of every native verifier window (the portrait one is
600 x 900 pixels: 300 x 450, which the labs do not fit) and no evidence asks for it. The README's "Display scale" tells an owner
what to set (`Window.contentScaleFactor = DisplayServer.screenGetScale()`, or the `canvas_items` stretch mode), what the library does
with it, and that injected input is in window pixels (the window divides it by the content scale).

## Other findings

| Finding | Evidence | Verdict |
| --- | --- | --- |
| `StyleBoxFlat` antialiasing at scale 2: rounded boxes, the focus ring and the scrollbar thumbs had a one-logical-pixel feather, two device pixels | a rounded box's left edge had two partly covered pixels (coverage 0.25, 0.75) where a Godot `Panel` has none; visible as a pale fringe in `artifacts/hidpi-baseline-landscape/hidpi-dpr2-lab.png` | **Fixed**: the feather is one device pixel (`Oversampling::feather`); the box, the ring and the thumbs carry the level in their keys (only when rounded, so a square box is not re-recorded when the scale changes) |
| Fractional scroll offsets blur text | a text field scrolled to 37.75 logical pixels (75.5 device) has the same stem sharpness as at rest (peak step 0.686, 1.51 partial pixels per edge in both); a whole root moved by a quarter and a half logical pixel (half and one device pixel) has identical stems (0.937, 0.5, 26 edges) | **Wrong suspicion**, not changed. The assertion that would have enforced whole device pixels was removed |
| Text baselines at fractional device pixels | at 2 and at 1.5 the React stems match the same text drawn by a Godot `Label` exactly (peak step 0.937 and 0.953, vertical step 1 for both) | no problem found. Layout rounds to whole logical pixels, so at a whole scale a baseline is on a device pixel; at 1.5 an odd logical y is half a device pixel and the engine's `Label` does the same |
| Layout rounding | Taffy's default `use_rounding`: every location and size is a whole logical pixel (snapshot rectangles are integers), two device pixels at scale 2 where Chrome positions at 1/64 px and snaps to the device pixel | **Not changed** (a layout scale would be a design change: lengths in device pixels). A 0.5 CSS px difference at most |
| 1 px borders | a 1 logical pixel border is 2 device pixels at scale 2, exactly Chrome's; the square border is hard-edged (no partial pixels). `border_width` is a whole logical pixel in paint (`round() as i32`, `StyleBoxFlat` takes an `int`) but a float in layout (`props.rs:783`), so `border-[0.5px]` reserves 0.5 and paints 1, and a Chrome hairline at DPR 2 cannot be expressed | **Not changed**; recorded. Fixing it means drawing borders as rectangles in device pixels |
| Text input at scale 2 | caret exactly 2 device pixels wide, hard edged, at the column native reports (316 to 317 for x 158); selection of the first five stems starts at the first glyph's left bearing and ends with the fifth, before the sixth, and at the caret (tint columns 34 to 78 against stems at 37 to 75 and 79); horizontal scrolling keeps the stems crisp; the IME preedit underline is read on the Web (cannot be injected natively) | no problem found |
| Focus ring at scale 2 | 4 device pixels wide (2 logical), one run, rounded corners antialiased to a device pixel | fine after the feather fix |
| Drag ghost | it replays the recorded keys, now including the level, so its text is drawn at the level the source was; it is a snapshot and does not follow a change of scale during a drag | by design, noted |
| `Input.parseInputEvent` at a content scale | positions are window pixels, divided by the content scale (`Viewport::_make_input_local`): a verifier that clicked a logical point at scale 2 hit the point at half of it | documented in the README; the verifier multiplies |
| `docs/WEB.md` said "CanvasItem supplies the viewport oversampling factor to native text drawing" | it does not for a retained canvas item (the reason for `6c6abd7`) | corrected |
| W9 of the world-space notes: "Native text drawing apparently does not use the viewport's oversampling there" | the root drew at 1x outside `_draw` (this review, 1); with the fix a 2x panel is sharp | **Closed**: the demo and recipe changed |

## Decisions

- **H1. The rule is the viewport's oversampling, nothing else.** Evidence: the table in question 1. A single rule that agrees with
  what Godot's controls do in every configuration measured.
- **H2. The level lives on the root, is read once per pass and on `DRAW`.** A pass that reads it per node costs 4 % of a full
  repaint; one that reads nothing (a field kept up to date by notifications alone) would be stale in the frame between a scale
  change and its `DRAW`. Reading once at the start of each pass and on `DRAW` is current for every paint that goes through
  `paint_pass`; the paints that do not (a scroll's thumbs, the focus ring) use the level of the last read, and are re-recorded
  on the `DRAW` of the same frame if it changed.
- **H3. The scale is a typed value in TextServer's units, in every key that depends on it.** `Oversampling` replaces the loose
  `u32` keys and the `f32` beside them.
- **H4. Antialiasing feathers are set, not inherited.** `StyleBoxFlat::set_aa_size(1 / level)` before each draw; a square box
  keeps `Oversampling::NONE` in its key (no antialiasing, no re-record on a scale change).
- **H5. No change to the native owner's content scale** (question 7).
- **H6. No glyph cache cleanup** (question 4) and **no `oversampling_with_scale`** (question 1).
- **H7. The world-space panel renders at the window's device pixels per logical pixel by default.** The recipe is the stretched 2D
  override; the owner follows `Window.contentScaleFactor`; `setPanelPixelScale(n)` fixes it for a test.

## What a text paint path must do (for whoever adds one)

`TextInput`'s paint code already carries these after this branch; they are the contract for any retained text or antialiased shape:

1. Take the level from `self.oversampling()` (the cached `Oversampling`), never from the engine, and put it in the key of
   everything whose commands depend on it.
2. Pass `key.oversampling.factor()` as the `oversampling` argument of every `draw_ex` / `draw_string`, and set
   `StyleBoxFlat::set_aa_size(key.oversampling.feather())` before any rounded draw.
3. Be listed in `MountedNode::paints_at_oversampling` so a change of scale marks the node dirty.

## Negative controls

Each is the committed code with one fix patched out, built (`pnpm build:native`), and run for the one window that must notice; the
patch was then restored from a saved copy and `git diff native/` was empty. The failures are the soft assertions of the section,
all reported at once.

| Control | Patch | Run | Failed |
| --- | --- | --- | --- |
| NC1, the viewport's value ignored | `Oversampling::from_factor` returns 1 for every factor: text at 1x (as before `6c6abd7`), a one logical pixel feather | `--only=hidpi`, landscape | **17 of the section's checks**, among them: the root draws at 1; React text against a Godot `Label` at scale 2 (peak step 0.482 against 0.937, 2.50 partial pixels per edge against 0.50, vertical step 0.498 against 1.000) and at 1.5 (0.647 against 0.953); a rounded box's edge (2 partial pixels against 0); the scale-change checks; the selection against its glyphs (column 70 against glyphs ending at 75); the focus ring (2 device pixels in place of 4) |
| NC2, no redraw hook | the `DRAW` arm and the call on entering the tree removed | `--only=hidpi`, landscape | **3**: "A change of oversampling with no commit reaches the root: it draws at 2, not 3"; "It draws again exactly what depends on the scale: 0 texts of 4, 0 rounded boxes of 4"; "A window with font oversampling switched off is drawn at 1: 2". Everything that goes through a commit, layout or restyle still passes |
| NC3, the commit's rule | `max(1.0, max(viewport, window content scale))` | `verify:world`, landscape | **the first new world assertion**: "A root in a SubViewport that is not stretched does not follow the window's content scale: it draws at 2" (the world verifier stops at its first failure) |

## Web

`pnpm build:web` (2 min 46 s), served on port 8105 and stopped after. `scripts/verify-interaction-web.mjs --only=hidpi`: **92
assertions, 18 captures, no page errors**, at DPR 1 and 2, landscape and portrait. The DPR 1 landscape page also changes the ratio
to 2 and back in place, with the CSS size unchanged, and the root must report 2 and draw its text again with no commit (it does:
`stats.contentRecords` grows). `scale-facts`: the window's viewport oversampling, its content scale factor and the screen scale are
1, 1, 1 and 2, 2, 2, so on the Web too the window's factor added nothing to the viewport's own. The preedit underline is 1 device
pixel thick at DPR 1 (row 177, the stems end at 176) and 2 at DPR 2 (rows 354 and 355, stems end at 353). `scripts/verify-world-web.mjs`:
**96 assertions**, passed, the panel's texture scale equals the device pixel ratio and the root draws at it.

Honesty about the runs: the Web hidpi section was run five times. The first four failed on assertions I had just written, not on the
product: a selection found by exact tint finds almost nothing at one device pixel per logical pixel (the gaps between stems are one
pixel wide), the selection's last pixel can touch the next glyph's first at that density, and the tilde of an `ñ` is as dark across
the probe as the underline below it. Each assertion was corrected against the pixels in the failure message (the report keeps the
numbers) and the section then passed on its fifth run with nothing else changed; the product code is the one of commit `7fa5626`.

## Gates (each once, after the last code change `7fa5626`; commits `a854940`, `7fa5626`, `8b690ea` and this file's)

| Gate | Result |
| --- | --- |
| `cargo test --locked` | 545 passed (4 new: `render_tree::tests`) |
| `cargo clippy --locked --all-targets` | 0 warnings |
| `cargo +stable fmt --check` | clean (`rustup`'s 1.99.1 toolchain has no rustfmt; the stable one's was used) |
| `pnpm test:types` | clean on both profiles (`breaka`, and `--engine=stock` once the stock library existed) |
| `pnpm test` | 370 passed |
| `pnpm verify:interaction --only=hidpi,forms,drag` | passed in both windows (sections: hidpi 6.4 s, forms 39.5 s, drag 16.5 s in landscape; the portrait run was disturbed by something outside it and passed; `forms` and `drag` because the text input's paint code and the drag ghost changed) |
| `pnpm verify` | passed, landscape and portrait |
| `pnpm verify:world` | passed in both windows, including the 2x panel (the landscape one disturbed and passed: `run-attempt-1.log`) |
| `pnpm build:web`, then on port 8105 `verify-interaction-web.mjs --only=hidpi` and `verify-world-web.mjs` | 92 and 96 assertions, passed (the section's fifth run, see "Web"); the server was stopped |
| one stock native run of the new section | `--engine=stock`, landscape, passed with the same numbers as the default engine (stems 0.937, rounded edge 0 partial pixels, selection tint 34 to 78 against stems at 37 to 75) |
| `pnpm verify:motion` | passed, landscape and portrait |
| negative controls | NC1 to NC3 above |

`pnpm verify:motion` (native, both windows) passed too, as plan D20 asks when `render_tree.rs` changes. The Web verifiers other
than the two above (`verify:web`, `verify:motion:web`, the other sections of `verify:interaction:web`) were not run: this branch
changes nothing they read at scale 1 (a box's feather is 1 there, as before) and their sections were not touched.

Inspected PNGs (all under `artifacts/`, which is not committed):

- Native, content scale 2: `hidpi-fixed4/hidpi-dpr2-lab.png`, `hidpi-dpr2-field-scrolled.png`, `hidpi-dpr2-field-selection.png`,
  `hidpi-dpr2-focus-ring.png` (and the same four under `native-interaction/landscape/`); `hidpi-baseline-landscape/hidpi-dpr2-lab.png`
  for the halo of the baseline.
- World: `native-world/landscape/12-panel-2x.png`, `12-panel-texture-2x.png`, `native-world/portrait/12-panel-2x.png`.
- Web: `web-interaction-verification/{landscape,portrait,retina-landscape,retina-portrait}/hidpi-*.png`,
  `hidpi-ratio-changed-in-place-landscape.png`, `web-world-verification/retina-portrait/06-typing.png`.
- At scale 1 `native/landscape/04-incremented.png` (rounded cards and buttons unchanged).

## Merge notes

- The branch is rebased onto main `944ca90` (I7); it fast-forwards onto main while main has not moved.
- Files other branches are likely to touch: `native/render_tree.rs` (keys, `paint_pass`), `native/lib.rs` (a field, one notification
  arm, `viewport_oversampling`), `native/snapshot.rs`, `src/native.ts` and `tests/recording-host.ts` (the snapshot's `oversampling`),
  `demo/src/verify-interaction.ts` (one import, `SECTIONS`, one dispatch line, `NativeProfile` and `benchmark` on the inspection
  interface), `demo/src/labs.tsx`, `scripts/build.mjs` (`verify-hidpi.ts` as an entry), `scripts/verify-interaction-web.mjs`
  (`SECTIONS`, one scenario block), `demo/src/verify-text-input.ts` (five helpers exported), `demo/src/world-main.ts` and
  `verify-world.ts`.
- **A branch that records a box, an overlay or a ring must follow H4:** a rounded `StyleBoxFlat` draw needs `Oversampling` in its key
  and `set_aa_size(oversampling.feather())` before it draws (the scroll-bar branch's thumbs, any new filter or frosted-glass
  panel with rounded corners), and a node kind that paints text must be listed in `MountedNode::paints_at_oversampling`.
- No `#[func]`, `#[signal]` or class changed: no typings or `gen/` changes. The snapshot JSON gained one field.
- `.uid`: `demo/src/verify-hidpi.ts.uid` is committed.

## How to run

```sh
export GODOT=/Applications/Godot48.app/Contents/MacOS/Godot
export PATH="$HOME/.cargo/bin:$PATH" CARGO_BUILD_JOBS=3
pnpm build:native
pnpm verify:interaction --only=hidpi    # native, landscape and portrait
pnpm verify:world                        # native, includes the 2x panel
pnpm build:web                                  # the Web verifiers serve the export themselves (D46)
node scripts/verify-interaction-web.mjs --only=hidpi
node scripts/verify-world-web.mjs
```
