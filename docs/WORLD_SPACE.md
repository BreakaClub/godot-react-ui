# World-space UI

A React root can be drawn on a quad in a 3D scene and still take mouse, touch and keyboard input. It
needs no native code: the root lives in a `SubViewport` like any other root, the viewport's texture is
the quad's material, and the scene's owner turns main-viewport input into `SubViewport` input.

This is the recipe of plan Phase I11 (`docs/INTERACTION_PLAN.md`, section 3.22). It is built and
verified in `demo/world.tscn`; every number below is from that scene.

Verified on macOS (Godot 4.8, Compatibility renderer, `pnpm verify:world`, landscape 1120x800 and
portrait 600x900, including the panel at twice its texels) and in real Chrome on Breaka's Web template
(`scripts/verify-world-web.mjs`, DPR 1 and DPR 2, plus a touch page). The anchored label (below) was added after the Web run and is verified natively
only. Typing into a world-space `TextInput` is built and verified (below), natively and in Chrome.

| File | Role |
| --- | --- |
| `demo/world.tscn` | One `Node` whose script is the owner. |
| `demo/src/world-main.ts` | The owner: builds the scene, mounts the root, routes input. |
| `demo/src/world-geometry.ts` | Ray-quad intersection and the pixel mapping, as plain numbers. |
| `demo/src/world-panel.tsx` | The React content: a counter, two buttons and a name field. |
| `demo/src/world-label.tsx` | The anchored label: one absolute element of the screen-space root. |
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

- **`SubViewport`**: the panel's pixels are `480x320`. `size2DOverride` is that size and `size2DOverrideStretch` is on,
  and `size` is the **texture** size: the panel's pixels times a texel scale (`PanelViewport.size` is 480x320 at scale 1
  and 960x640 at scale 2; see "Resolution and oversampling"). The root lays out in panel pixels, input arrives in panel
  pixels, and the viewport draws them at the texel scale. `transparentBg = true`, so the panel can be any shape.
  `renderTargetUpdateMode = UpdateAlways`; the default `UpdateWhenVisible` should stop the panel rendering off-screen,
  but it was not tried here, so test the first frame if you switch. A `SubViewport` is not a `Container`: set the
  root's `size` to the panel size (the override's, not `size`) yourself.
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

## Anchored 2D UI

A 2D label that follows a 3D node is the opposite recipe: the node is in the world, the UI is ordinary screen-space
UI. Nothing is routed; the label is placed from where the camera sees the node. `demo/world.tscn` has one: a small
sphere (`Orbiter`) circling in front of the quad, and a label above it.

```
World (Node, world-main.ts)
  ...
  PanelQuad                 MeshInstance3D
    Orbiter                 MeshInstance3D, SphereMesh: the node the label follows (a child of the quad)
  LabelSurface              ReactUiRoot, the size of the window, in the main viewport: the screen-space root
```

- **A second root.** `LabelSurface` is a `ReactUiRoot` added to the owner like the demo's own root and sized to the
  window (the owner follows the window's size each frame). It is a separate React root from the panel's: the panel's
  lives in a `SubViewport` on a quad, this one is drawn over the 3D view. Everything in it is `pointer-events-none`, so
  `_has_point` is false everywhere and Godot hands every pointer on to the owner's quad routing (plan 3.11); it holds no
  key focus.
- **Each frame**, in `_process` after the node moved: `world = orbiter.globalPosition`,
  `screen = camera.unprojectPosition(world)`, `behind = camera.isPositionBehind(world)`, and the owner renders
  `<AnchoredLabel anchor={{ x, y, visible: !behind }}/>` when the anchor changed. The label is one `absolute` element
  of fixed size (`LABEL_WIDTH` x `LABEL_HEIGHT`), `left = x - width / 2` and `top = y - LABEL_GAP - height`: centred over
  the point and floating above it. The render is synchronous, so the label and the node are always in the same frame.
- **Behind the camera.** `unprojectPosition` does not say that a point is behind the camera; it returns a mirrored
  point. A hidden label is `display: none` (it keeps its last place), so it also takes no space and draws nothing.
- **A node off screen** but in front of the camera projects outside the window; the label is placed there and the
  window clips it. Clamp the anchor to the window in the component if the label must stay visible.
- **The inverse mapping.** The orbiter is placed in the quad's own frame from panel pixels with `quadPixelToLocal`
  (`world-geometry.ts`) and lifted along the quad's normal, so it circles the card's top edge whatever the quad's
  rotation. At height 0 it is on the plane and projects to the very point `screenPointOf` gives that panel pixel, which
  is how the verifier ties the two directions together.
- **Cost.** A moving node commits one small tree per frame (the label's `left` and `top`); a still node commits
  nothing, since the owner renders only when the anchor changed.

Verified natively in `pnpm verify:world` (`verifyAnchoredLabel`): the label root is a separate root the size of the
window; on the quad's plane the node projects to `screenPointOf`'s point and the label is centred over it and
12 px above, to within one pixel (layout rounds to whole pixels), at four panel pixels and heights; the lift changes
the projection; the raster shows the sphere at the projected point and the label in its colour over the 3D view;
a click on a button that the label covers reaches the button and not the game (no `pointer-events` to the label);
a node behind the camera hides the label (`display: none`, zero rectangle) and bringing it back shows it again; and with
the orbit running the label moves and agrees with the camera's projection of the node's current position whenever it
is read. PNGs: `artifacts/native-world/<viewport>/09-anchored-label.png`, `10-anchored-label-over-button.png`,
`11-anchored-label-behind-camera.png`. The other captures are taken with the orbiter parked off to one side, so they
are unchanged.

## Resolution and oversampling

- **Panel pixels per screen pixel.** The panel is `480x320`; with the camera at `z = 2.6` and a 50
  degree field of view the 360-pixel card is drawn 342 screen pixels wide at 1120x800 (0.95 screen
  pixel per panel pixel) and 385 wide at 600x900 (1.07), so a panel pixel is about a screen pixel.
  Choose the panel size from the quad's footprint on screen (distance, field of view, window size); the
  root lays out in those pixels.
- **Texels per panel pixel.** On a screen with `devicePixelRatio` 2 the same quad covers about twice as many *device*
  pixels, so a 480x320 texture is magnified about 2x and soft. Render the panel at more texels instead of laying it
  out larger: `size2DOverride` = the panel's pixels, `size2DOverrideStretch = true`, `size` = the panel's pixels times
  the texel scale. The demo's owner takes the scale from the window it is in (`Window.contentScaleFactor`, which it
  already sets from `DisplayServer.screenGetScale()` on the Web), so a panel about as big on screen as its panel is
  as sharp as the screen. `WorldMain.updatePanelResolution` does it each frame; `godotReactWorld.setPanelPixelScale(n)`
  fixes it for a test. The texture is `PANEL_WIDTH * n` by `PANEL_HEIGHT * n` and everything else is unchanged:
  input positions are in the override's panel pixels (the verifier clicks a button, types in the field and places the
  caret through the quad at scale 2), `panelPixelAt` and `screenPointOf` do not change.
- **Why that makes the text sharp.** A viewport's font oversampling is its size over its 2D override when the stretch is on
  (`Viewport::_set_size`), so the panel's viewport has an oversampling of 2, and the root draws its glyphs at the
  viewport's oversampling (`docs/tracks/hidpi.md`): a 2x raster for a 2x texture. The first version of this recipe tried
  the same override and found the text soft ("the glyphs in it are softer than the 1x texture scaled up"): the root
  then drew its text with no oversampling at all, outside Godot's `_draw`, so the texture held a 1x raster scaled up by
  the viewport. Read from the raster now: the digit in the panel at scale 2 has a peak edge step of 0.81 (the same
  digit at scale 1: 0.88, a scale-1 texture upscaled to 2x: 0.44), and the caret of the field is two texels wide.
- **The window's scale does not reach the panel.** A root draws at the oversampling of *its* viewport. A node in a
  `SubViewport` that is not stretched has an oversampling of 1 however the window around it is scaled
  (`get_window()` from inside the `SubViewport` is the main window, which is why the rule is not "the larger of the
  viewport's and the window's"), so a 1x panel in a window at content scale 2 is drawn exactly as in a window at 1: the
  verifier compares the two rasters.
- **A change of scale needs no commit.** Setting `setPanelPixelScale(1)` then `(2)` changes the viewport's size, hence its
  oversampling, and the root repaints its text at the new scale on the viewport's redraw request with no React render.
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
- The panel has no scroll container, so wheel ticks reach only the root's listeners (it does have a `TextInput`,
  "Typing" below). The IME window and the on-screen keyboard are placed from the main window's transform, which is wrong for a
  root on a quad; selecting text by dragging across the quad and IME or an on-screen keyboard through a `SubViewport` were not exercised.
- The anchored label is not clamped to the window, does not avoid the 3D objects in front of its node (it is a 2D
  overlay), and a label for several nodes would be one `absolute` element each in the same root.
- Hover and pointer events come from the camera ray only; moving the quad or camera without moving the
  mouse does not re-hit-test until the next motion.

## Typing

The panel has a `TextInput` (`world-input`) under the buttons, with an echo line. Nothing in the owner changed for it:
a press on the projected field is routed as any other press and focuses it (the root takes key focus inside the
`SubViewport`), and `routeKey` forwards the key events the main viewport leaves unhandled while the root holds focus. The
text input matches the keys to its `InputMap` actions with the device of the event normalised to the keyboard's, because a
key pushed into a `SubViewport` keeps the device it came with, and `InputMap` matches an event only to bindings of the
same device (decision T3, `docs/tracks/text-input.md`); without that, a forwarded key would type its character but none of
the editing keys would act. Verified natively (`06a-typing`: Hello, Hi ther) with real Godot input: a press on the projected
field focuses it, typed characters and Backspace edit it, React follows, no key reaches the game, a press at the projected
start of the text puts the caret there, typing goes in at the caret, and a press on the title hands key focus back so the
next key is the game's. In Chrome (`verify-world-web.mjs`, `06-typing`) the same with `page.keyboard.type`. Not done:
the IME's candidate window and the on-screen keyboard are placed from the main window's screen transform
(`update_ime_position`), which is wrong for a root inside a `SubViewport` on a quad (it would need the projected caret);
text selection by dragging across the quad was not exercised.

## Running it

```sh
export GODOT=/Applications/Godot48.app/Contents/MacOS/Godot
pnpm verify:world                    # native, landscape and portrait; PNGs in artifacts/native-world/
# Godot runs a scene other than the main one when its path follows the project options:
$GODOT --audio-driver Dummy --path demo --resolution 1120x800 res://world.tscn
$GODOT --audio-driver Dummy --path demo --resolution 1120x800 res://world.tscn -- --verify-world
```

The native verifier shares its isolation with the other native verifiers (`demo/src/verifier-input.ts`, plan D21 and
D22): it injects every event with its own device id, the owner drops every other device, input accumulation is off,
and the window is unfocusable and mouse-passthrough. A real mouse over the window would otherwise send events too
(device 32 was seen, at positions on another display), Godot would merge a stray motion into an injected one, and
the window losing OS focus would cancel a press in flight (plan D6). What still gets in is logged as
`GODOT_REACT_RUN_DISTURBED`, and `scripts/verify-world.mjs` (through `scripts/native-run.mjs`) runs again a run that
failed within 5 s of a disturbance that could reach the root, at most twice (`--no-retry` runs each window once); a failure without one is real and is not run again
(D22, narrowed by D46). The window-exit test sends its
own `NOTIFICATION_WM_MOUSE_EXIT` (`simulateWindowMouseExit`), so it is not counted as a disturbance.

Web: `pnpm build:web`, then `node scripts/verify-world-web.mjs` (it has no package script; like the other Web verifiers it serves the
export itself on a free port, and `GODOT_REACT_WEB_URL` only names a server whose files it checks against the export's receipt). It leaves `report.json` and `browser.log` in `artifacts/web-world-verification/` and prints `GODOT_REACT_WEB_WORLD_VERIFY_PASSED` only for a run that passed. To look at the scene
by hand, `pnpm demo:web` and open `http://127.0.0.1:8096/?scene=res://world.tscn` (or `PORT`). Breaka's Web engine is built without
command-line path overrides (a scene path in its arguments aborts with "compiled without support for
path overrides"), so the page cannot pass the scene to the engine. It passes `--scene res://world.tscn`
after `--` instead, and the `SceneLauncher` autoload (`demo/src/scene-launcher.ts`, registered in
`project.godot`) changes to that scene on the first frame, replacing the main scene. Without
`--scene` it does nothing.
