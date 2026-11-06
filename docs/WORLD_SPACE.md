# World-space UI

A React root can be drawn on a quad in a 3D scene and still take mouse, touch and keyboard input. It
needs no native code: the root lives in a `SubViewport` like any other root, the viewport's texture is
the quad's material, and the scene's owner turns main-viewport input into `SubViewport` input.

This is the recipe of plan Phase I11 (`docs/INTERACTION_PLAN.md`, section 3.22). It is built and
verified in `demo/world.tscn`; every number below is from that scene.

Verified on macOS (Godot 4.8, Compatibility renderer, `pnpm verify:world`, landscape 1120x800 and
portrait 600x900) and in real Chrome on Breaka's Web template (`scripts/verify-world-web.mjs`, DPR 1
and DPR 2, plus a touch page). Not done: typing into a world-space `TextInput` (needs Phase I7) and
a label anchored to a moving 3D node (needs `position: absolute`, Phase I4).

| File | Role |
| --- | --- |
| `demo/world.tscn` | One `Node` whose script is the owner. |
| `demo/src/world-main.ts` | The owner: builds the scene, mounts the root, routes input. |
| `demo/src/world-geometry.ts` | Ray-quad intersection and the pixel mapping, as plain numbers. |
| `demo/src/world-panel.tsx` | The React content: a counter and two buttons. |
| `demo/src/verify-world.ts` | Native verifier (`--verify-world`). |
| `demo/src/scene-launcher.ts` | Web only: starts the scene named by `--scene` (see "Running it"). |
| `tests/world-geometry.test.ts` | Unit tests of the maths. |
| `scripts/verify-world.mjs`, `scripts/verify-world-web.mjs` | Native and Web drivers. |

## Scene setup

```
World (Node, world-main.ts)
  Camera                    Camera3D, current
  Backdrop                  MeshInstance3D, QuadMesh, flat unshaded colour (shows the panel's margin is clear)
  PanelViewport             SubViewport, 480x320, transparent background
    WorldSurface            ReactUiRoot, size 480x320, one React root
  PanelQuad                 MeshInstance3D, QuadMesh 1.5 x 1.0, unshaded material showing PanelViewport
```

All of it is built in `WorldMain.buildScene()`.

- **`SubViewport`**: `size` is the panel's pixels (480x320). `transparentBg = true`, so the panel can
  be any shape. `renderTargetUpdateMode = UpdateAlways`; the default `UpdateWhenVisible` should stop
  the panel rendering off-screen, but it was not tried here, so test the first frame if you switch.
  A `SubViewport` is not a `Container`: set the root's `size` to the viewport's size yourself.
- **Material**: a `StandardMaterial3D`, `ShadingModeUnshaded`, `albedoTexture = viewport.getTexture()`,
  `TransparencyAlpha`, **`BlendModePremultAlpha`**. Canvas items drawn into a transparent viewport leave
  premultiplied colour on their antialiased edges; the default blend scales it by alpha again and
  draws a dark outline around the card (seen in the first capture, gone with the premultiplied
  blend). With it, solid colours reach the screen exactly: the verifier reads `#4f46e5` back from the
  3D view at the middle of the button.
- **Quad**: a `QuadMesh` faces its local `+z`, `+x` is the texture's right and `+y` its top, and the
  texture is upright (checked on the raster, not assumed). Give the quad the panel's aspect ratio so a
  panel pixel is square: `QUAD_HEIGHT = QUAD_WIDTH * PANEL_HEIGHT / PANEL_WIDTH`. The demo turns it 24
  degrees about `y` and tilts it 8 degrees: a quad that faces the camera squarely would hide a wrong
  mapping.
- **Mount and unmount** are as in `main.ts`: `subscribeToEvents` connects the root's `eventsReady`
  signal through a `Callable` (which holds its function strongly, so `unmount()` disconnects it),
  `_process` calls `dispatchEvents()`, and `unmount()` runs React cleanup before `queueFree()`.
  The owner also lets the pointer leave first, so hover is cleared while the root still exists.

## The mapping

Breaka's Web engine has no 3D physics, so there is no `Area3D` or physics ray query to find the
quad. The intersection is analytic and short (`intersectQuad`).

For a point `p` in the main viewport:

1. `o = camera.projectRayOrigin(p)` and `d = camera.projectRayNormal(p)`. (A perspective camera's
   origin is the camera position; an orthogonal camera's is on the near plane at `p`. Both work.)
2. Move the ray into the quad's local space. A direction is the difference of two points, so
   `quad.toLocal(o)` and `quad.toLocal(o + d)` give `o'` and, by subtraction, `d'`. The quad's
   rotation, scale and position are all inside that.
3. The quad is the plane `z = 0` there. `o'.z + t * d'.z = 0` gives `t = -o'.z / d'.z`. No hit if
   `|d'.z|` is a negligible fraction of `|d'|` (parallel; `1e-9`) or `t <= 0` (the plane is behind the
   ray).
4. The hit is `h = o' + t d'`. It is on the quad's **front** only if `d'.z < 0`: with the default
   back-face culling the other side draws nothing, so it must not take input either.
5. Panel pixel, for a quad of `w` by `h` showing `W` by `H` pixels (rows grow downwards):
   `u = (h.x / w + 0.5) * W`, `v = (0.5 - h.y / h) * H`. It is on the panel when `0 <= u < W` and
   `0 <= v < H`. Outside that, the pixel is still returned, with `inside = false` (a drag that left
   the quad needs it).

The inverse, for anchoring or for tests, is `quadPixelToLocal` then `quad.toGlobal` then
`camera.unprojectPosition` (`WorldMain.screenPointOf`). The verifier clicks at that projected point
and also checks that `panelPixelAt(screenPointOf(p))` returns `p` to 0.05 px.

`world-geometry.ts` takes and returns plain `{x, y, z}` objects so that Node can test it; the
eight tests cover the centre, the edges, an oblique ray, scaling of the direction, parallel, behind,
back-facing and the round trip.

## Input

Everything is routed from the owner's `_unhandledInput`. Godot's GUI in the main viewport has first
refusal, so a HUD `Control` over the 3D view still wins; whatever it leaves reaches the quad. A routed
event is copied (`event.duplicate()`, so modifiers, button mask and the rest survive), given its new
position, and sent with `subViewport.pushInput(copy, true)`. `true` means the position is already in
the viewport's own coordinates, so Godot does not transform it again. When the panel consumed the
event (`subViewport.isInputHandled()`), the owner calls `setInputAsHandled()` on the main viewport,
so a click on the panel is not also a click on the game. Anything the panel did not consume (a miss, the
see-through margin, a key while the root has no focus) continues to the game.

**Mouse.**

- A motion is routed while the ray is on the panel.
- A press is routed only if it lands on the panel. The buttons it pressed are remembered; their motion
  and release are then routed **wherever the ray goes**, with the unclamped pixel from step 5 (outside
  `[0, W)` when the pointer is beside the quad). That is what a window does with a drag that leaves it:
  without it, a press on a button and a release off the quad leaves the button pressed forever.
  Verified: a held button reports a pointer position beyond the panel, and the release ends the press
  without a click.
- A wheel tick is a press and a release in one; it is routed if it lands on the panel and is not "held".
- `relative` of a motion is recomputed in panel pixels from the previous routed position.
  `velocity` and the other fields are copied from the source event, so they are screen quantities.

**Leaving the quad.** A miss sends nothing, but the panel must stop being hovered. Godot already has
the call for a viewport shown somewhere other than a `SubViewportContainer`: `notifyMouseEntered()`
and `notifyMouseExited()` (documented for exactly this; `Viewport::notify_mouse_exited` runs
`_mouse_leave_viewport`, which drops the hovered control and so sends it `NOTIFICATION_MOUSE_EXIT`,
which the root turns into "no hover"). The owner keeps one flag so they pair (the engine warns when
they do not, and the verifier driver fails on that warning): enter on the first routed hit, exit when
a motion no longer hits the panel, and when the OS sends `NOTIFICATION_WM_MOUSE_EXIT` to the owner (the
pointer left the window; no motion event says so). A held press keeps its mouse focus through an
exit, as in a window. The alternative, a motion event at a position outside the root's rect, was
not chosen: it depends on the root's bounds and fakes input.

**Touch.** Real touches arrive as `InputEventScreenTouch` and `InputEventScreenDrag` and are forwarded
the same way, by touch index: a finger that goes down on the panel owns its drags and its end, wherever
they land. Godot also turns each real touch into an emulated mouse event (`emulate_mouse_from_touch`,
`device == DEVICE_ID_EMULATION`); the owner ignores every such event, as the root does (plan D16), or
a tap would be a second press. A touch never sets hover.

**Keys** are pushed to the `SubViewport` only while the root has key focus (`surface.hasFocus()`).
Focus is the root's own (plan 3.11, D11): a click on a button focuses it and gives the root key
focus, Tab and Enter then go to the panel, and a press on something that cannot take focus (here
the title) releases it, after which keys belong to the game again. Godot would drop a key itself
when nothing in the `SubViewport` has focus, so the explicit check states the contract rather
than changing behaviour; it also keeps keys away from `_unhandled_input` handlers a panel might have.

## Resolution and oversampling

- **Panel pixels per screen pixel.** The panel is `480x320`; with the camera at `z = 2.6` and a 50
  degree field of view the 360-pixel card is drawn 342 screen pixels wide at 1120x800 (0.95 screen
  pixel per panel pixel) and 385 wide at 600x900 (1.07), so the texture is sampled almost 1:1 and text
  is as crisp as in a normal root. Choose the `SubViewport` size from the quad's footprint on screen
  (distance, field of view, window size); the root lays out in those pixels.
- **High-DPI.** On Web at DPR 2 (`contentScaleFactor` 2, as in `main.ts`) the same quad covers about
  twice as many physical pixels, so the 480-pixel texture is magnified about 2x and the text is softer
  (`artifacts/web-world-verification/retina-portrait/*.png`, inspected: legible, visibly soft next to the
  DPR 1 captures). To keep it sharp, size the panel for the physical footprint and author its
  layout at that size.
- **`size2DOverrideStretch` does not fix it.** Tried at 2x (`size` 960x640, `size2DOverride` 480x320,
  stretch on): input still maps correctly (the whole native verifier passed, because input positions
  are in the override's logical 480x320 space), the texture is 960x640, but the text was not
  re-rasterised at 2x: the glyphs in it are softer than the 1x texture scaled up (mean absolute
  difference 2.2 of 255 from a bicubic upscale of the 1x raster; peak gradient 70 against 139). Why
  the native text path ignores the viewport's oversampling here was not investigated.
- **Minification.** A viewport texture has no mipmaps and the material uses linear filtering, so a quad
  much smaller on screen than its panel will shimmer. Not exercised here.

## Limits

- **No occlusion.** The ray meets the quad's plane and nothing else. A prop between the camera and
  the quad does not block clicks. With several panels or with a game that also picks 3D objects,
  compare `QuadHit.distance` with the game's own hit before routing.
- One quad per owner; several would route by the nearest `distance`.
- Back faces take no input; the quad is not double-sided.
- Pan and magnify gestures, joypad and `ui_*` focus navigation are not forwarded; the cursor shape the
  root asks for is not applied to the OS cursor.
- The panel has no scroll container (Phase I5) and no `TextInput` (I7), so wheel ticks reach only the
  root's listeners and nothing can be typed. Anchoring a label to a moving node needs I4.
- Hover and pointer events come from the camera ray only; moving the quad or camera without moving the
  mouse does not re-hit-test until the next motion.

## Running it

```sh
export GODOT=/Applications/Godot48.app/Contents/MacOS/Godot
pnpm verify:world                    # native, landscape and portrait; PNGs in artifacts/native-world/
# Godot runs a scene other than the main one when its path follows the project options:
$GODOT --audio-driver Dummy --path demo --resolution 1120x800 res://world.tscn
$GODOT --audio-driver Dummy --path demo --resolution 1120x800 res://world.tscn -- --verify-world
```

The native verifier injects every event with its own device id and tells the owner to route only that
device (`onlyAcceptDevice`), and turns input accumulation off. A real mouse moving over the window
sends events too (device 32 was seen, at positions on another display), and Godot merges consecutive
motion events, so a stray one lands inside an injected one and moves it; without this most runs
failed on a machine in use. What it cannot filter is the window losing OS focus,
which cancels a press in flight (plan D6): the owner counts those (`windowFocusLosses`) and the
verifier names them in a failure. Keep other applications from taking focus while it runs.

Web: `pnpm build:web`, serve on a port you have checked is free (`PORT=8098 pnpm demo:web`), then
`GODOT_REACT_WEB_URL=http://127.0.0.1:8098 node scripts/verify-world-web.mjs`, or open
`http://127.0.0.1:8098/?scene=res://world.tscn`. Breaka's Web engine is built without
command-line path overrides (a scene path in its arguments aborts with "compiled without support for
path overrides"), so the page cannot pass the scene to the engine. It passes `--scene res://world.tscn`
after `--` instead, and the `SceneLauncher` autoload (`demo/src/scene-launcher.ts`, registered in
`project.godot`) changes to that scene on the first frame, replacing the main scene. Without
`--scene` it does nothing.
