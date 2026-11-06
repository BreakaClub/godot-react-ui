# Track notes: world-space UI recipe (Phase I11)

Branch `world-space`, based on `fd11f41`. The recipe itself is `docs/WORLD_SPACE.md`; this file is the
implementer's notes and report for whoever folds it into `docs/INTERACTION_PLAN.md` and
`docs/INTERACTION_PROGRESS.md` (neither was edited here).

Commits: `e4af1f2` (code, verifiers, gen files, `.uid` files), then the commit that adds this file and
`docs/WORLD_SPACE.md`.

## What was built

A React root in a transparent `SubViewport` (480x320) whose texture is the albedo of an unshaded quad,
under a `Camera3D`, over a flat backdrop. The owner routes main-viewport mouse, wheel, touch and key input
onto the panel by an analytic ray-plane intersection and `subViewport.pushInput(event, true)`.

| File | |
| --- | --- |
| `demo/world.tscn`, `demo/src/world-main.ts` | scene and owner (`godotReactWorld` inspection global) |
| `demo/src/world-geometry.ts`, `tests/world-geometry.test.ts` | ray-quad maths on plain numbers, 8 unit tests |
| `demo/src/world-panel.tsx` | counter `Text`, increment and reset `Button`s with hover/active styles |
| `demo/src/verify-world.ts`, `scripts/verify-world.mjs`, `package.json` `verify:world` | native verifier and driver (landscape and portrait) |
| `scripts/verify-world-web.mjs` | Chrome verifier (no package script: the brief allowed one added line) |
| `demo/src/scene-launcher.ts`, `demo/project.godot` (autoload), `demo/web-shell.html` (`?scene=`) | starting the scene on Web |
| `scripts/build.mjs` | a second `build` call with the new entry points |
| `docs/WORLD_SPACE.md` | the recipe |

Not touched, as instructed: `main.ts`, `main.tscn`, `app.tsx`, `interaction-lab.tsx`, `verify.mjs`,
`src/`, `native/`, the plan and progress files. No native change, so no dylib or typings change; gen files
and `.uid` files for the new scripts are committed. `--generate-types` also rewrote
`demo/typings/jsb.editor.bundle.d.ts` and `jsb.runtime.bundle.d.ts` with CRLF line endings only
(`git diff --ignore-space-at-eol` is empty); they are left modified and unstaged.

## How to run

```sh
export GODOT=/Applications/Godot48.app/Contents/MacOS/Godot
export PATH="$HOME/.cargo/bin:$PATH"
pnpm test:types && pnpm test         # 74 pass (8 new)
pnpm verify:world                     # native; artifacts/native-world/{landscape,portrait}/
# a scene other than the main one, natively (confirmed): the path follows the project options
$GODOT --audio-driver Dummy --path demo --resolution 1120x800 res://world.tscn -- --verify-world
# Web
pnpm build:web                        # wasm + export; the pack contains world.tscn (world.tscn.remap in index.pck)
lsof -nP -iTCP:8098 -sTCP:LISTEN      # must print nothing
PORT=8098 pnpm demo:web &             # then:
GODOT_REACT_WEB_URL=http://127.0.0.1:8098 node scripts/verify-world-web.mjs
```

## Results

Native (`pnpm verify:world`, exit 0, both viewports; Compatibility renderer, Metal): the whole sequence
passes. After the last code change: 7 full runs, 5 passed and 2 failed with a named window focus loss
(see "Flakiness"), plus 3 portrait-only runs (2 passed, 1 focus loss); the last two runs, taken as the gate
before the commit, were clean. Inspected PNGs (main-viewport captures, 3D view):

- `/Users/ben/Development/breaka/godot-react-ui-worktrees/world-space/artifacts/native-world/landscape/`
  `01-world.png` (rest), `02-hover.png`, `03-pressed.png`, `04-incremented.png` (3), `05-reset.png`,
  `06-keyboard-focus.png`, `07-touch.png`, `08-remounted.png`, plus `01-panel-texture.png` (the raw
  `SubViewport` image) and a `.json` snapshot each.
- `/Users/ben/Development/breaka/godot-react-ui-worktrees/world-space/artifacts/native-world/portrait/`: the same set.

What the pictures show: upright, unmirrored text on the rotated quad; the transparent margin shows the
backdrop; hover and pressed states are visibly darker; the focus ring shows after a click and after Tab; the
touch capture shows the rest colour with a focus ring (a touch does not hover). Card edges are clean after
the premultiplied-blend fix (W7; before it a dark outline ran round the card, first capture of the session).

Web, real Chrome 156.0.8078.80 (headless, puppeteer-core) against `http://127.0.0.1:8098`
(`scripts/verify-world-web.mjs`, 86 assertions, passed in 2 consecutive runs after the last export):
landscape DPR 1, portrait DPR 2 and a touch page. The Web template **does** render this 3D scene and the
`SubViewport` texture, with transparency and unshaded material, and runs the scene. Inspected:

- `/Users/ben/Development/breaka/godot-react-ui-worktrees/world-space/artifacts/web-world-verification/landscape/` (`01-world` to `05-keyboard-focus`)
- `.../web-world-verification/retina-portrait/` (same; 1200x1800 physical pixels; text visibly softer, W9)
- `.../web-world-verification/touch/01-touch.png`; `report.json` has every assertion.

Negative controls (each fails the verifier with the named assertion, then the source was restored from a copy
and the diff checked): emulated-mouse skip removed (a touch off the quad counts as two game presses), no leave
on a miss (hover stays), no capture of a held press (press never ends), flipped y mapping (the round trip
fails), no handled propagation (a consumed click reaches the game), back faces routed (the back of the quad
hits), motion not routed beyond the quad while held (the pointer is not at the unclamped pixel). One more
check was weak: removing the explicit `hasFocus()` gate on keys changes nothing, because Godot drops a key
itself when nothing in the `SubViewport` has focus (W11). Web: a click offset 120 px from the projected
point fails on the raster assertion (white where indigo is expected).

## Decisions

- **W1, separate scene and owner.** `demo/world.tscn` and `world-main.ts` instead of editing `main.ts`
  (plan I11 lists `main.ts`, `verify.mjs`, `world-panel.ts`; the brief overrode that). The panel file is
  `.tsx` for JSX. Reason: other agents own `main.ts` and `verify.mjs`.
- **W2, the scene is run by path natively, by an autoload on Web.** Natively
  `godot ... --path demo res://world.tscn -- --verify-world` works (confirmed, scene starts, user
  arguments reach `OS.getCmdlineUserArgs()`). On the Web template the same path aborts the engine:
  "Scene path was specified on the command line, but this Godot binary was compiled without support for
  path overrides" (`main/main.cpp`, which blocks `--scene`, `--path` and `--main-pack` the same way). Choices
  without editing `main.ts`: a `SceneLauncher` autoload (project.godot `[autoload]`, one section) that,
  on the first frame, calls `changeSceneToFile` for the value after `--scene` in the user arguments, and
  the shell turning `?scene=` into those arguments. The main scene is created first and replaced; its
  `godotReactDemo` global is deleted by its own `_exitTree`. Alternatives rejected: a second export preset
  with a feature-tag main scene (two tracked files and a second export directory), and `override.cfg`
  through `copyToFS` (fragile). `pnpm verify` (baseline, both viewports) passes with the autoload.
- **W3, hover on leaving the quad: `notifyMouseEntered()` and `notifyMouseExited()` on the `SubViewport`.**
  Engine evidence (`scene/main/viewport.cpp`): `push_input` calls `_update_mouse_over` for every mouse
  event; `notify_mouse_exited` runs `_mouse_leave_viewport`, which `_drop_mouse_over`s, which sends the
  hovered control `NOTIFICATION_MOUSE_EXIT` (the native root clears hover on it, `native/lib.rs`); the class
  documentation names this call for viewports shown through a `TextureRect` or forwarded by an `Area3D`.
  Both warn if unpaired, so the owner keeps a flag, and the drivers fail on "previously notified". A
  window exit (`NOTIFICATION_WM_MOUSE_EXIT`, which brings no motion event) does the same. Rejected: sending a
  motion at a position outside the root (depends on its bounds, fakes input).
- **W4, a held press is routed to its end.** A press must land on the panel; later motion and the release
  of the buttons it pressed (and a touch's drags and end) are routed wherever the ray meets the plane, with
  the unclamped pixel. Without it a release off the quad never reaches the root and the button stays pressed;
  the verifier covers this, including the pointer's reported position beyond the panel.
- **W5, back faces take no input.** The quad is back-face culled, so a ray that meets its back is not a hit
  (`QuadHit.frontFacing`, direction local `z < 0`); verified by rotating the quad 180 degrees.
- **W6, events with `device == DEVICE_ID_EMULATION` are ignored by the owner**, as the root ignores them
  (plan D16): real touches are routed as touches and the emulated mouse press would be a second press.
- **W7, the quad blends with `BlendModePremultAlpha`.** Canvas items drawn into a transparent viewport leave
  premultiplied colour at antialiased edges; the default blend darkened every edge (first capture). After
  the change the raster at the projected button centre is exactly `#4f46e5`, `#4338ca` (hover), `#3730a3`
  (active), so the sRGB path is exact with an unshaded material.
- **W8, a rotated, tilted quad** (24 degrees yaw, -8 pitch) so that a wrong ray-plane mapping cannot pass
  by symmetry; the camera sits at `z = 2.6`, 50 degrees field of view, which draws a panel pixel at 0.95
  (landscape) and 1.07 (portrait) screen pixels.
- **W9, resolution.** At Web DPR 2 the 480-pixel texture covers about twice as many physical pixels and the
  text is softer. `size2DOverrideStretch` at 2x (`size` 960x640, override 480x320) was tried natively: input
  mapping is unchanged (positions are in the override's logical space, the whole verifier passed), but the
  text was not re-rasterised at 2x (mean absolute difference 2.2 of 255 from a bicubic upscale of the 1x
  raster, peak gradient 70 against 139). Native text drawing apparently does not use the viewport's
  oversampling there; not investigated, and not used. Recorded in the recipe, nothing changed.
- **W10, build entry points.** The Web export plugin fails ("Failed to load required GodotJS module for
  export: res://.godot/GodotJS/src/world-geometry.js") when a demo `.ts` file has no compiled module, so
  every demo `.ts` must be a `build.mjs` entry, not only the ones a scene loads. The new entries are a
  separate `build` call placed away from the existing `entryPoints` line to keep merges clean.
- **W11, keys.** Pushed to the `SubViewport` only while `surface.hasFocus()`. The control showed Godot would
  drop the key anyway with nothing focused; the gate stays as the stated contract (and keeps keys out of
  `_unhandled_input` handlers a panel could have), and the recipe says so.
- **W12, handled propagation.** After `pushInput`, `subViewport.isInputHandled()` decides whether the owner
  calls `setInputAsHandled()` on the main viewport. The panel's `pointer-events-none` margin is therefore
  see-through for input as well as for pixels (verified: a click there is a game press).
- **W13, `UpdateAlways`.** Chosen for deterministic reads; `UpdateWhenVisible` was not tried (stated in the
  recipe).
- **W14, verifier isolation from real input** (found while gating; root cause below). The verifier injects
  every event with `device = 1 << 30`, calls `owner.onlyAcceptDevice(...)`, and sets
  `Input.useAccumulatedInput = false`.
- **W15, verifier failure note for focus loss.** The owner counts `WM_WINDOW_FOCUS_OUT`
  (`windowFocusLosses`, never reset); a failing run says how many happened. No retry was added.

## Flakiness found and its causes (shared machine, a person and other agents using it)

Without W14, `pnpm verify:world` failed on most of its runs (about 13 of 17 attempts) with different hover
assertions each time.
Evidence: temporary logging in `_unhandledInput` showed real mouse motion events (`device` 32) at positions
like `-4729,586` (another display) arriving about every frame during the run. Two effects: such an event is a
motion that misses the quad, so it clears hover; and `Input`'s accumulation merges consecutive motion events
regardless of device, so a stray one lands inside an injected one and changes its position. W14 removed it
(5 of 6 runs then passed; the one failure was presumably the next cause, there was no counter yet).

What W14 cannot filter is the window losing OS focus: `NOTIFICATION_WM_WINDOW_FOCUS_OUT` makes the native root
cancel a press in flight (plan D6, correct behaviour). With the counter (W15) the remaining failures say so:
"Three clicks: 2 (the window lost OS focus 1 time(s) ...)" (twice, both in the portrait run, which starts
right after the landscape window closes) and "Pressing Add presses it: null (... lost OS focus ...)". Frontmost-app
sampling (`lsappinfo front` every 0.5 s) shows `SystemUIServer` briefly in front about 0.5 s after each Godot
window appears; later losses are from something activating at an unobserved moment. Rerunning passes. This is
environmental and the same exposure applies to every windowed verifier; the failure text now names it. Counted
from the final code: see "Results".

Also seen in the logs, unrelated to this work: the GodotJS debugger fails to bind port 9229 when another
Godot is running (`[JSDebugger][Warning]`), harmless.

## For the coordinator to fold in

- Plan Phase I11 text: the file list is now `world-main.ts`, `world-panel.tsx`, `world-geometry.ts`,
  `verify-world.ts`, `scripts/verify-world.mjs`, `verify-world-web.mjs`, `scene-launcher.ts`, and no edit of
  `main.ts` or `verify.mjs`. The plan's "a button and a `TextInput`" is a counter and two buttons until I7.
- Suggested decision-log entries: W2 (Web cannot take a scene path; autoload), W3, W4, W7 and W14 carry
  evidence worth keeping; W9 is an open question for whoever owns native text drawing.
- `package.json`: add `"verify:world:web": "node scripts/verify-world-web.mjs"` if wanted (not added: one line
  was allowed). `docs/WEB.md` could mention `?scene=`.
- Merge conflicts to expect: `package.json` (one line after `verify:interaction:web`), `scripts/build.mjs`
  (a new `build` call before the `tsc` spawn), `demo/web-shell.html` (the `args` lines), `demo/project.godot`
  (a new `[autoload]` section before `[display]`).
- The Web export needs every demo `.ts` file to be a `build.mjs` entry (W10): new demo scripts from the other
  tracks must be added too, or `pnpm build:web` fails at export.

## Remaining Phase I11 work (deliberately not built, no placeholders written)

1. A label anchored above a moving 3D node: `Camera3D.unprojectPosition()` into an absolute element. Needs
   `position: absolute` (Phase I4). The inverse mapping the label would reuse is in place
   (`WorldMain.screenPointOf`).
2. Typing into a world-space `TextInput` and checking it with the verifier. Needs Phase I7. Key routing and
   focus are already verified with buttons; IME and on-screen keyboards through a `SubViewport` are untested.

Other open points noted in `docs/WORLD_SPACE.md` (limits): no occlusion test (a prop in front of the quad
does not block clicks), one quad per owner, gestures and joypad not forwarded, cursor shape not applied,
`UpdateWhenVisible` and minification (no mipmaps) not exercised, and the DPR 2 softness (W9).
