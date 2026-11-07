# Track: dropdown lists under a finger

Branch `dropdown-touch`, based on main `91c4502` (the release live at `https://react.breaka.club`). Notes and report for the coordinator;
`docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the README text is at the end).

Ben's report, from his phone on the live site: "Dropdown lists in all our controls are buggy on mobile. You cannot scroll with touch.
Consequently you can't click any items beyond those visible by default."

**Result.** The kit `Select` list could not be panned by a finger, on the Web and natively, so every item below the first screenful was
out of reach. That is the lab menu at the top of the phone navigator, every `Select` in the Controls lab and the Transforms lab, and any
`Select` an app writes. One condition in `src/kit/select.tsx` caused it, and one condition fixes it. The kit `Combobox` and `Combobox` with
chips already scrolled, in headless Chrome with real touch input, on the live site and on this branch's base: I could not reproduce a
defect in them (see "Not verified" for what a phone could still do to them). There is no `Menu` component in the library.

| Commit | What |
| --- | --- |
| `c8cfef6` | The `dropdown-touch` lab and section: native (screen touch and drag) and Web (Chrome touch events), for every dropdown. Fails for the `Select` as it stood. |
| `8d3bcba` | The fix: `src/kit/select.tsx`, and two unit tests in `tests/select.test.ts`. |
| the commit after | These notes. |

## Which controls

Every list in `src/` and `demo/src/` that renders in a `<Portal>` or the overlay layer, found by `grep -rn "Portal\|createOverlayPortal"` and
by reading each user:

| Control | Where | A scrollable list that takes a finger? | Before | After |
| --- | --- | --- | --- | --- |
| `Select` | `src/kit/select.tsx`; Controls lab (`inputs`), Transforms lab (`transform-case-select`), the navigator's lab menu (`lab-menu`, phone width) | yes | **cannot be panned** | pans |
| `Combobox` (single) | `src/kit/combobox.tsx`; Combobox lab | yes | pans | pans |
| `Combobox` with chips (`multiple`) | same | yes | pans (checked in a window short enough for the list to overflow: landscape 844 x 390) | pans |
| `Menu` | none: no such component; `role="menu"` appears only as an ARIA role name in `src/types.ts` | n/a | n/a | n/a |
| The Positioning lab's three-item popover (`pos-popover`) | `demo/src/positioning-lab.tsx` | no: three buttons, nothing to scroll | n/a | n/a |
| The code editor's hover tooltip (`code-hover`) | `demo/src/editor/view/hover-tooltip.tsx` | scrolls (`overflow-y-auto`) but is `pointer-events-none`: a tooltip, never touched | n/a | n/a |
| Glass, Filters, Rich text and Transforms labs' portals | scrims, a sheet, a caret marker, a bounding box | no | n/a | n/a |

## Reproduction

### Web, with real touch events

`artifacts/scratch/dropdown-repro.mjs` (a scratch script, not committed): headless Chrome 156.0.8078.80 through puppeteer-core 24.37.2, a
mobile page (`isMobile`, `hasTouch`, 390 x 844 at device pixel ratio 2, and landscape 844 x 390), touches sent with the DevTools Protocol's
`Input.dispatchTouchEvent`, no OS input. For each dropdown it opens the list with a tap, pans it up 140 px in eight steps (one frame apart),
lifts, waits 40 frames for momentum, then taps an option that began out of view. It reads the list's and the page's scroll offsets from
`godotReactDemo.find`, and the number of `pointercancel`s the root saw (`godotReactDemo.pointerCancels()`, which counts what native
sends to JS when a pan starts, D33).

Against this branch's base export (`artifacts/web-debug`, unfixed) and the live site, read only (load, touch, read; nothing changed there). They agree:

| Dropdown (390 x 844) | List offset after the pan, then after momentum | Page offset | `pointercancel`s | A tap on an option that began out of view |
| --- | --- | --- | --- | --- |
| Select, Controls lab, long list | 0, 0 | unchanged | **0** | nothing to tap: it never came into view |
| Select, same, in the navigator, lab page scrolled by 119 | 0, 0 | 119, unchanged | not read | same |
| Select, the navigator's lab menu | 0, 0 | unchanged | **0** | same |
| Combobox (bottom, long list), page at rest | 191, 685 | 0 | 1 | Option 24 chosen, list closed |
| Combobox (bottom), page scrolled by 200 | 191, 685 | 200, unchanged | 1 | Option 24 chosen |
| Combobox with chips, landscape, local | 162, 218 | 0 | 1 | Kiwi added as a chip |

(The Combobox with chips has twelve options, which fit under the control in portrait, so there is nothing to pan there; the landscape row
is the one that scrolls. Two of the live landscape trials timed out opening their list because the harness tapped a trigger that is below
the 390 px fold in the navigator; that is the script, not a finding. Local and live, the numbers for the others are the same to the pixel.)

So: with a finger, the Select list does not move and the page does not move either. Nothing happens at all.

The same section run as a verifier on the base code, `node scripts/verify-interaction-web.mjs --only=dropdown-touch`
(`artifacts/logs/web-unfixed-dropdown-touch.log`):

```
AssertionError [ERR_ASSERTION]: touch: Select, page at 0: a pan moves the list by the finger's travel from the slop (100 px): {"moved":0}
```

### Natively, with ScreenTouch and ScreenDrag

`node scripts/verify.mjs --interaction --only=dropdown-touch --no-retry` on the base code, Breaka's engine, landscape window
(`artifacts/logs/native-unfixed-dropdown-touch.log`):

```
GODOT_REACT_VERIFY_FAILED Error: Select, page at 0: a pan moves the list by the finger's travel from the slop (100 px): 0
```

The same list, the same assertion and the same value as on the Web.

## Cause

`native/pointer_input.rs` (`press_touch`) decides at the moment a finger goes down whether the touch may become a pan:

```rust
let may_pan = !prevented && !self.pointers.captured_by_js(id);
self.begin_touch_pan(id, target, position, may_pan);
```

A `pointerdown` that JS prevented is never a pan (plan 3.12 rule 4, D33: "a press that explicitly captured the pointer, or whose
`pointerdown` was prevented, is not a pan"). The touch then stays pointer events (`pointermove` to the item) and scrolls nothing.

The `Select` list prevents every press on it that is not on a scrollbar thumb, whatever its pointer type:

```tsx
onPointerDown={(event) => { if (!isOnThumb(listbox.current, event.x, event.y)) event.preventDefault(); }}
```

(`git log -S` puts it in `714a640`, "Scroll the Select list".) It was written so that a mouse press on the list's padding does not take focus
out of it. A finger on a list of items lands on an item, the press bubbles to the list, the list prevents it, and the touch can never
pan. The `Combobox` list had the same line, and the combobox track found the problem and wrote `event.pointerType !== 'touch' &&` into it
(`docs/tracks/combobox.md`, decision 5); the `Select` never got it.

Evidence that this line is the cause:

1. **Trace.** The root's `pointercancel` count while a pan is made (native sends `pointercancel` when it takes a touch for a pan): Select 0,
   Combobox 1, under the same touches, in the same overlay layer, with the same list classes (`overflow-y-auto overscroll-contain`).
2. **A/B on the one condition**, both directions, with the same verifier (negative controls, below): put the old Select line back and the
   Select check fails with `moved: 0`; add the same prevention to the Combobox list and the Combobox check fails with `moved: 0`.

The candidates in the brief, and why each is out:

- *Pan-owner hit-testing only walks the base layer.* `arbitrate_pan` (`native/scroll_input.rs`) starts at the node under the finger and
  walks `paint_parent` until it reaches a layer. A list in the overlay layer is itself a scroll container at the start of that path, and the
  Combobox list, in the same layer, is found and pans.
- *The popover's outside-press or dismiss handling captures the touch.* The Select's backdrop is behind the list, so a press on the list never
  reaches it; the Combobox has no backdrop. The unfixed Select list stayed open and nothing was dismissed.
- *The list is not a scroll container on touch.* Same classes as the Combobox, which pans; the checks assert `maxScrollTop` is more than the pan.
- *`touch-action` or pointer capture on the trigger.* Neither list sets `touch-action` (it is `auto`) and neither calls `setPointerCapture`.
- *A Web-only path in the display server's touch translation.* The same check fails with the same value natively, with injected screen
  touches that never go through the Web display server. The cause is in shared code (the kit and the native library's arbiter), so there is no
  platform argument to make; it was never Web-specific.

## Fix

`src/kit/select.tsx`, one condition, as the Combobox list has it:

```tsx
onPointerDown={(event) => {
  if (event.pointerType !== 'touch' && !isOnThumb(listbox.current, event.x, event.y)) event.preventDefault();
}}
```

A mouse press behaves as before (pinned by the existing unit test and by a new one). A touch now goes down un-prevented: the default of the
press focuses the item (or the list) under the finger, a pan beyond the 8 px slop becomes a scroll of the list (`pointercancel`, no click),
momentum works as for any container, and a tap still clicks the item. Wheel and keyboard are untouched. No Rust changed.

What a person sees that they did not before: the item under the finger when a pan began shows its `focus:` highlight (the press focused
it) until focus moves, because `Select` items are focusable and highlight on focus, as keyboard navigation uses. In the rasters below
it is the light-blue row. The `Combobox`'s options are not focusable, so it does not show this. I left it: it is a pressed look on a touch,
not a selection, and removing it would mean either preventing the press (which is the bug) or moving focus on `pointercancel` for the sake of a
highlight.

## Checks

A new lab, `dropdown-touch` ("Dropdown lists on touch", Input group, `demo/src/dropdown-touch-lab.tsx`): a Select, a Combobox and a
Combobox with chips, each with forty options, in a page that scrolls (`dropdown-touch-page`, with a tail) and a JSON readout of the
three values. A new section of the same name, native (`demo/src/verify-dropdown-touch.ts`, screen touch and screen drag, every
touch from the verifier's own device) and on the Web touch page (`scripts/verify-dropdown-touch-web.mjs`, puppeteer's touchscreen, no OS input; the 600 x 900 page).
For each of the three controls:

1. **Page at rest, then page scrolled by 80.** A tap opens the list; there are options below what it shows and room to pan them into view.
2. **A slow pan** (six 20 px steps up the screen, the finger rests before it lifts, so nothing coasts): the list moved by 100 px, which
   is the finger's travel from where the 8 px slop was crossed (D33: the slop is not scrolled), within 1.5 px; the page's offset is exactly what it was; the list
   is still open; nothing was chosen.
3. **An option that began out of view is now in view** (fully inside the list), and a tap on its centre chooses it: the readout holds its value,
   the list closed (stays open for the multiple combobox, whose chip was added), the page still where it was.
4. **A short pan** (10 px, which crosses the slop, then 6 px more) that began and ended on an option: the list moved only by those 6 px, nothing was chosen, the list is open.
5. **A flick** (six 24 px steps, lifted while moving): the list keeps going after the lift by more than 30 px and comes to rest by itself, the page did not move, nothing was chosen.

A verifier lesson: the first native version rested the finger with `settle()` (100 ms and two frames) and the short pan coasted 50 px
(measured 56 against 6). The release velocity is sampled once the finger has been still for 0.1 s (`VelocityTracker`,
`native/scroll.rs`), so a finger that rests exactly that long is not reliably at zero. Both verifiers now rest 300 ms (native: and six frames).
That was the check's timing, not the product.

### Negative controls (the checks fail without the code)

Scratch mutations of the working tree, rebuilt and run with `--no-retry`; the tree was restored from HEAD afterwards (`artifacts/scratch/run-controls.sh`,
logs `artifacts/logs/control-*.log`):

| Mutation | Native (landscape window) | Web touch page |
| --- | --- | --- |
| A: the Select as before the fix | `Select, page at 0: a pan moves the list by the finger's travel from the slop (100 px): 0` | `touch: Select, page at 0: a pan moves ... (100 px): {"moved":0}` (on the base build, with this very scenario) |
| B: the Combobox list prevents a touch press too (Select fixed) | `Combobox, page at 0: a pan moves the list by the finger's travel from the slop (100 px): 0` | `touch: Combobox, page at 0: a pan moves ... (100 px): {"moved":0}` |

In B every Select check, including the scrolled-page case, short pan and flick, passes first: the section reaches the Combobox rows
and fails there. Unit tests: with the old line restored, the new `Select: a touch press on the list is not prevented ...` test fails.

### Raster

`artifacts/web-interaction-verification/touch/dropdown-touch-select-panned.png` (Web touch page) and
`artifacts/native-interaction/portrait/dropdown-touch-select-panned.png` (native, 600 x 900) show the Select list after a pan with the page scrolled
by 80: the list starts at "Option 4", its scrollbar thumb is part way down, the row the finger went down on is highlighted, the page's own
scrollbar is at the right and has not moved. I looked at both. They are the same picture.

## Gates

All on this machine, through the gate, one run each, logs in `artifacts/logs/`; Chrome headless through puppeteer-core, every Godot window silent
(`--audio-driver Dummy`, through `scripts/native-run.mjs`).

| Command | Result |
| --- | --- |
| `pnpm test:types` | clean |
| `pnpm test` | 883 tests, 883 pass (two new in `tests/select.test.ts`; `tests/labs.test.ts`, `tests/navigator.test.ts` and the section-name tests cover the new lab and section) |
| `cargo fmt --check` | clean. No Rust changed, so `cargo test` and `cargo clippy --all-targets -- -D warnings` were **not** run. |
| `node scripts/verify.mjs --interaction --only=dropdown-touch`, Breaka's engine (`pnpm build:native` first: the worktree's cached library was of older sources) | landscape and portrait PASSED, 675 and 671 checks |
| the same with `--engine=stock` (`pnpm build:native --engine=stock`, then back with `pnpm switch:engine`) | landscape and portrait PASSED, 683 and 671 checks |
| `--only=inputs,scroll,combobox --engine=stock` | landscape and portrait PASSED (inputs 4118, scroll 2693 and 2679, combobox 1562 and 1572) |
| `--only=positioning,inputs,scroll,combobox,dropdown-touch,navigator`, Breaka's engine (so the new section runs after combobox, and the sections that open a `Select` ran with the fix) | landscape and portrait PASSED (positioning 766, inputs 4118, scroll 2679, combobox 1562 and 1572, dropdown-touch 675 and 673, navigator 7774 and 7130) |
| `pnpm build:web --export-only`, then `node scripts/verify-interaction-web.mjs --only=combobox,dropdown-touch,navigator,touch,drag` | PASSED: dropdown-touch 96, combobox 180, navigator 1973, touch 59, drag 135 |

The Web side module (`pnpm build:web` without `--export-only`) was not rebuilt: no Rust changed and its stamp matched the sources, which `--export-only` checks.

## Not verified

- **A real phone.** None was available: not iOS Safari, not Android Chrome. Everything above is Chrome's touch events over the DevTools
  Protocol in a headless desktop browser, and Godot's screen-touch events injected on a Mac. What a phone adds that these cannot show: the
  operating system's own touch handling around the canvas (`touch-action: none` is set on it by `web-shell.html`, and the touch arrives as
  `touchstart/move/end` either way), real finger noise and coalesced events, and **the soft keyboard**. The `Combobox` is the one to check on
  a phone: a press on its list focuses the list for a moment and the list hands the focus back to the input (combobox decision 5). The
  Web verifier shows the engine's hidden input element stays up through that on a touch page, but iOS may close and not reopen a keyboard when focus
  moves inside a touch, which headless Chrome does not do. If Ben still sees a `Combobox` that will not scroll on his phone, that is the first thing to look at, and
  I could not reproduce it.
- **The release export.** The Web runs are of the debug export (`artifacts/web-debug`), as every Web verifier is; the live site is the release
  export of the same sources. The stock profile's Web export (release only) was not run.
- **The Mobile and Forward+ renderers.** Nothing that is drawn changed.
- **Rust.** No Rust changed, so `cargo test`, `cargo clippy` and `cargo fmt --check` were not run.

## Limits that stay

- **Prevented presses are not pans, for any touch (D33), which is not what a browser does.** In a browser `pointerdown`'s `preventDefault`
  suppresses the compatibility mouse events and nothing else; only `touch-action` stops a pan. Here a prevented press also ends the pan, so a kit
  part that prevents a press to manage focus loses touch scrolling unless it exempts touch, as the two lists now do. I did not change the rule: it is a
  decision (D33, plan 3.12), the kit `Slider` and the drag lab's `locked` chip use a prevented press to opt out of gestures, and the kit fix is the smaller one. The same class of problem is still
  there in the kit in small places: a finger that begins a swipe on a `Combobox`'s clear or trigger button, or a chip's remove button
  (`onPointerDown` with `preventDefault` so they never take focus from the input), cannot pan the page. They are not lists and are not the report; changing them
  means letting those buttons take focus on a touch, which needs thought about the keyboard.

## README text

> Dropdown lists scroll under a finger. The kit `Select`, `Combobox` and `Combobox` with chips pan their lists with touch (momentum, no selection
> from a pan, the page behind does not move), on the Web and natively; a mouse press on a list is still prevented so it keeps focus where it
> is, and a touch is not, because a press that was prevented cannot become a pan. The Dropdown lists on touch lab shows all three, and the
> `dropdown-touch` verifier section pans them with real touch events.
