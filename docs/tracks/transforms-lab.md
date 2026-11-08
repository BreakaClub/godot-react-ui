# Track: transforms lab (Ben's phone report of 2026-11-08)

Branch `transforms-lab`, based on main `3021765`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are not edited
here (the README text is at the end).

## The report

Ben, on his Android phone (412 x 915 CSS pixels at 2.625) at react.breaka.club, the Transforms lab's "Hit testing (rotated & scaled)" case
(`artifacts/reports/ben-transforms-hit-android.jpg`): "This doesn't seem right. Maybe it is. It's not clear what this scenario even represents." Three things were visible in it.

## What was wrong, and why

| What Ben saw | Cause | Where it was | Fix |
| --- | --- | --- | --- |
| The caption "Click the turned bar, ..." runs off the right edge, the stage is cut at 412 | The lab was laid out at a desktop's width: the stage and the case list row had `width: STAGE.width` (520), the case list was `w-52` and the caption `flex-1` beside it. Nothing wraps in a row that is wider than the window. | the lab | The lab is `w-full max-w-[520px]`; below 520 the stage (a 520 x 320 canvas of absolutely placed parts) is drawn under `scale(width / 520)` about its top left corner, inside a box of the scaled size that clips the stage's 520 px of layout (layout ignores a transform); the case list, Flip button, caption and results are laid out at the width, in a column, and wrap. The width is the lab's own, measured with `getRect()` when the root's size changes (`useRootSize`), so a lab in a narrower area than the window fits that area. At 520 and wider nothing is wrapped or scaled, so every position the verifier reads (`BEHAVIOUR`, root-local) is unchanged. |
| "Turned bar" sits at the bar's top left corner, partly outside it | Not the library: see "The label of the turned bar". The lab gave a `Button` a fixed size and no alignment; a library `Button` is a plain flex column (README: "`View` defaults to a flex column", a `Button` "renders its string and number children as one `Text` label"), so its label is at its top left. The bar's 8 px rounded corner then cuts across the first letter's tip. | the lab | `items-center justify-center` on the bar, and on the labels of the hover, utilities and drag cases, which had the same flush top left corner (found in the side-by-sides below). |
| Nothing says what it demonstrates, what to try, or what should happen | There was a one-line caption for the case and a text counter `bar 0 child 0 parent 0`; the scaled-to-zero box was not mentioned and not drawn. | the lab | A caption for every case (36), in one to three plain sentences, in `demo/src/transform-data.ts` (shared with the Chrome reference). The hit page: counters are results ("Taps counted": Turned bar, Red bar, Yellow square, Box scaled to zero, Empty stage, each with its colour and a count); a tap outlines the parts it hit (3 px amber, 2 px outside, 0.9 s, one cancellable timer, the click's capture phase clears the last tap's outline) and highlights their counters; thin outlines mark where the turned bar, the scaled square and the zero box sit before their transforms, with labels, so "empty corners of the unturned box" is visible; a tap on the bare stage counts as a miss. |

Also fixed while looking at every case on a phone:

* **Hover and utilities cases did nothing on a touch screen** (a touch never hovers: README "Pointers"). They gain `active:` variants (`active:scale-125`, `active:scale-110`) and the captions say press and hold.
* **The selection card was narrower than its text.** `Hamburgefonstiv in a turned frame` (`whitespace-nowrap`) was cut at "fra" in the library, native and Web, at every size. The library draws a paragraph clipped to its width (`native/text_paragraph.rs:590`, mirroring `TextParagraph::draw`), where Chrome lets nowrap text overflow its box visibly. The lab case is about selection, not overflow, so the card is 340 wide now (`BEHAVIOUR.selectable`). The difference is a library behaviour that stays (see "Differences that stay").
* **The scaled stage shrank inside its box.** The first phone run of the new check failed `shape:identity: and is 253.54 px tall: {... height 201.24}`: the 320 px tall stage is a flex child of a column box of the scaled height, and flex shrinks it (CSS does the same, and so did the first version of the reference page). It is `shrink-0` now.

## Method: Chrome as the reference, at three sizes

`scripts/transform-lab-reference.mjs` draws **every case of the lab** (17 shapes, 4 transitions, 15 behaviour pages, and the hit page right after a tap) as plain HTML with the CSS a browser
developer writes, the engine's Inter, the lab's own numbers (`transform-data.ts`), in headless Chrome through Puppeteer: the whole lab page (the stage scaled to fit, the results, a stand-in for the
case list, the caption), at a phone (412 x 915, mobile emulation with touch, DPR 2.625 and 2) and a desktop (1120 x 800, DPR 1). `scripts/transform-lab-web-capture.mjs` captures the library's Web export
in the navigator (`?demo=navigator&lab=transforms`) at the same three, case by case through `godotReactTransformLab.setCase`; the native verifier saves its own phone-width picture of every case
(`transforms-lab-<case>-phone.png`, root 412 wide, device pixel ratio 1). `--compare` crops the three, puts them side by side and compares Chrome's with the Web export per channel over the stage
(interior and edge apart, text left out, as `transform-reference.mjs` does).

```
node --import tsx scripts/transform-lab-web-capture.mjs --out=artifacts/transforms-lab-web
node --import tsx scripts/transform-lab-reference.mjs --render --offsets=artifacts/transforms-lab-web/offsets.json
node --import tsx scripts/transform-lab-reference.mjs --compare --web=artifacts/transforms-lab-web --native=artifacts/native-interaction/portrait
```

The side-by-sides are in `artifacts/transforms-lab-compare/<case>-<device>.png` (device: `phone`, `phone2`, `desktop`; left to right: Chrome, library on the Web, library native at ratio 1 for `phone2`
and `phone`); `artifacts/transforms-lab-notes/ben-before-after.png` is Ben's screenshot, the new page, and the new page after a tap. All were looked at; the ones that showed a difference are in the next section.

### Numbers

Edge pixels are those within a pixel of a step of more than 8 levels in Chrome's picture; "edge >24" is the share of them that differ by more than 24 levels in some channel. The comparison is over the stage
(the lab sits at (257, 125) on the desktop and (0, 276) on the phone in the navigator).

| device | cases | median edge >24 | interior |
| --- | --- | --- | --- |
| desktop 1120 x 800 at 1 | 37 | 0.16% | exact (0 to 3 levels) except `shape-scale-up` (0.015%, the ends of text ink past the text mask), `combined` (0.05%), `loop` (0.06%), `starting` (0.10%), `selection` (0.03%), `sharp` (0.03%), `scroll` (0.34%), `clip` (0.91%): all explained below |
| phone 412 x 915 at 2 | 37 | **0%** | the same list, at the same sizes |
| phone 412 x 915 at **2.625** (Ben's) | 37 | 34% | exact, but see "A lab on a half pixel" |

Per case, desktop at 1 and phone at 2 (interior worst level, interior share >24 / edge typical R G B, edge share >24):

| case | desktop 1x: interior worst, interior >24 / edge typical R G B, edge >24 | phone 412 at 2x: same |
| --- | --- | --- |
| shape-identity | 0, 0.000% / 0.74 1.67 2.04, 3.22% | 0, 0.000% / 0.04 0.05 0.09, 0.00% |
| shape-translate | 0, 0.000% / 0.74 1.67 2.04, 3.22% | 0, 0.000% / 0.07 0.09 0.09, 0.00% |
| shape-rotate | 0, 0.000% / 0.13 0.29 0.41, 0.07% | 0, 0.000% / 0.03 0.07 0.09, 0.00% |
| shape-rotate-corner | 0, 0.000% / 0.11 0.26 0.36, 0.00% | 0, 0.000% / 0.04 0.08 0.10, 0.00% |
| shape-scale-up | 209, 0.015% / 0.03 0.07 0.09, 0.00% | 223, 0.005% / 0.02 0.07 0.15, 0.00% |
| shape-scale-down | 0, 0.000% / 0.03 0.07 0.10, 0.00% | 0, 0.000% / 0.09 0.11 0.12, 0.00% |
| shape-skew | 0, 0.000% / 0.12 0.27 0.38, 0.10% | 0, 0.000% / 0.04 0.08 0.10, 0.00% |
| shape-matrix | 0, 0.000% / 0.14 0.31 0.47, 0.16% | 0, 0.000% / 0.03 0.08 0.09, 0.00% |
| shape-rotate-x | 0, 0.000% / 0.10 0.23 0.28, 0.00% | 0, 0.000% / 1.55 3.37 3.75, 6.79% |
| shape-rotate-y | 0, 0.000% / 0.41 0.90 0.94, 0.27% | 0, 0.000% / 1.63 3.44 3.67, 1.30% |
| shape-rotate-xyz | 0, 0.000% / 0.48 1.03 1.12, 0.71% | 0, 0.000% / 1.30 2.89 3.37, 4.49% |
| shape-percent | 0, 0.000% / 0.11 0.24 0.33, 0.00% | 0, 0.000% / 0.04 0.08 0.10, 0.00% |
| shape-mirror | 0, 0.000% / 0.04 0.08 0.11, 0.00% | 0, 0.000% / 0.08 0.10 0.15, 0.00% |
| shape-nested | 0, 0.000% / 0.22 0.33 0.41, 0.00% | 0, 0.000% / 0.05 0.08 0.09, 0.00% |
| shape-square-rotate | 0, 0.000% / 0.20 0.45 1.98, 3.32% | 0, 0.000% / 0.09 0.34 1.89, 3.59% |
| shape-square-rotate-x | 0, 0.000% / 0.00 0.00 0.00, 0.00% | 0, 0.000% / 1.46 3.75 5.76, 13.82% |
| shape-square-skew | 0, 0.000% / 0.20 0.44 1.97, 3.34% | 0, 0.000% / 0.09 0.36 1.92, 3.77% |
| transition-rotate | 0, 0.000% / 0.74 1.67 2.04, 3.22% | 0, 0.000% / 0.04 0.05 0.09, 0.00% |
| transition-scale | 0, 0.000% / 0.74 1.67 2.04, 3.22% | 0, 0.000% / 0.04 0.05 0.09, 0.00% |
| transition-mismatch | 0, 0.000% / 0.16 0.36 0.49, 0.41% | 0, 0.000% / 0.04 0.09 0.11, 0.00% |
| transition-tailwind | 0, 0.000% / 0.74 1.67 2.04, 3.22% | 0, 0.000% / 0.04 0.05 0.09, 0.00% |
| combined | 233, 0.051% / 6.11 4.28 4.57, 3.34% | 240, 0.065% / 6.86 4.65 5.07, 3.52% |
| loop | 185, 0.055% / 8.67 8.94 3.73, 5.36% | 185, 0.092% / 9.52 9.77 4.39, 5.95% |
| starting | 244, 0.096% / 6.62 4.40 3.56, 3.35% | 244, 0.132% / 6.79 4.54 3.70, 3.65% |
| contain | 0, 0.000% / 0.00 0.00 0.00, 0.00% | 0, 0.000% / 0.01 0.04 0.04, 0.03% |
| edge | 0, 0.000% / 0.60 0.92 0.83, 0.85% | 0, 0.000% / 0.42 0.53 0.28, 0.70% |
| hit | 0, 0.000% / 0.02 0.03 0.01, 0.02% | 0, 0.000% / 0.07 0.06 0.04, 0.02% |
| hover | 0, 0.000% / 2.25 2.27 0.19, 4.62% | 0, 0.000% / 0.07 0.08 0.02, 0.00% |
| utilities | 0, 0.000% / 0.02 0.17 0.16, 0.00% | 0, 0.000% / 0.02 0.03 0.03, 0.00% |
| input | 0, 0.000% / 0.42 0.19 0.14, 0.00% | 0, 0.000% / 0.30 0.14 0.10, 0.00% |
| selection | 218, 0.028% / 0.00 0.00 0.00, 0.00% | 226, 0.017% / 0.00 0.00 0.00, 0.00% |
| drag | 0, 0.000% / 0.14 0.24 0.35, 0.10% | 0, 0.000% / 0.04 0.07 0.08, 0.00% |
| scroll | 92, 0.344% / 0.51 0.44 0.38, 0.58% | 92, 0.345% / 0.42 0.40 1.06, 0.30% |
| anchor | 0, 0.000% / 0.05 0.04 0.01, 0.00% | 0, 0.000% / 0.01 0.01 0.01, 0.00% |
| clip | 232, 0.914% / 2.50 10.17 8.43, 5.11% | 232, 0.864% / 2.57 10.56 8.77, 6.82% |
| sharp | 233, 0.028% / 0.00 0.00 0.00, 0.00% | 233, 0.014% / 0.00 0.00 0.00, 0.00% |
| hit-tapped | 0, 0.000% / 0.03 0.18 0.43, 0.71% | 0, 0.000% / 0.08 1.06 2.71, 5.10% |

The shapes are the earlier track's pictures again, now under the phone's scale: at 2 under `scale(0.79)` every shape's edges are within 0.1 of a level of Chrome's (typical 0.04 / 0.05 / 0.09 for `identity`, against 0.74 / 1.67 / 2.04
unscaled), because a transformed box is drawn from the feathered mesh (`docs/tracks/box-mesh.md`), which is Chrome's raster of a transformed layer, where an untransformed rounded box is `StyleBoxFlat`'s
(the baseline of `docs/tracks/transforms.md`).

## The label of the turned bar

`artifacts/transforms-lab-notes/label-ben-vs-chrome.png` (`scripts/transform-lab-label-experiment.mjs`): the bar's corner at 2.625, from the left: Ben's screenshot of the library, then Chrome drawing the same
box (220 x 56, `rotate(30deg)`, radius 8, label `text-sm`) as a flex column with the label as its only child (what the lab had), as a real `<button>`, and as a flex column with `align-items: center; justify-content: center`.
Ben's picture and the first are the same: the label at the corner, its first letter's tip outside the rounded corner. So the text placement inside a transformed element is right (it matches Chrome's to the pixel), the library's
`Button` lays out as documented, and the bar's missing centring was the lab's. A browser's `<button>` centres only because of its user-agent stylesheet; the library has none, and every kit control sets
its own alignment. **A decision for the coordinator, not made here:** whether `Button` should centre by default like a browser's; it would move the label of every `Button` in the demo and the kit that relies on being a flex column.

The verifier now holds it: `checkHit` asserts the label's centre is within 2 px of the bar's.

## Differences that stay (found by the comparison)

| Difference | Cause | Status |
| --- | --- | --- |
| A rotated `overflow` clip: in the `clip` case the red square is cut by the box round the turned square, in Chrome by the square; in the `scroll` case "Row 5" shows past the tilted list's corner | Godot's clips are axis aligned; `docs/tracks/transforms.md`, "Rotated and skewed clips" (decision, one `ERROR` per element, announced by the verifier) | known limit; both captions say so |
| Text wider than its box is cut at the box (`selection` before the card was widened) where Chrome overflows visibly | `native/text_paragraph.rs:590`: the paragraph is drawn clipped to its width | not changed: a text-layout decision that is not this track's; reported |
| A lab on a half device pixel at ratio 2.625 differs from Chrome at every edge | see below | observation, not diagnosed further |
| `->` is an arrow (`→`) in Chrome's Inter, two glyphs in the library | the font's `calt` feature is not applied by the engine's shaping here | cosmetic |
| `loop`, `starting`, `combined` interiors 0.05 to 0.13% | the buttons in those pages hug their label, and Chrome's label is a pixel wider or narrower than the library's (the ink is 1.08 times Chrome's, `docs/tracks/transforms.md`), so a button edge is a pixel away; (`loop`'s reference is the paused page: the capture pauses the loop at its first step, whose button says Resume) | explained, the pixels are button edges (found by locating them: y 190 to 220, the button rows) |
| `scroll` interior 0.34% | the library draws overlay scroll bar thumbs (the Chrome page hides its scroll bars) | not a difference |
| `rotate-x`, `rotate-xyz`, `square-rotate-x` edges 5 to 14% at ratio 2 | Chrome resamples a squeezed layer: `docs/tracks/transforms.md`, "The `rotateX` and `rotateY` edges at device pixel ratio 2" | known |
| The case list is a different control | the Chrome page's is a stand-in | not compared |

### A lab on a half pixel

At 2.625 the median edge share is 34% and everything inside is exact. The lab's top is at 276 CSS pixels in the navigator, 724.5 device pixels at 2.625: Chrome and the library put a box's edges on opposite sides of
the half pixel (Chrome snaps non-transformed boxes to its pixel grid, the library draws them where layout puts them), so every edge in the picture differs and nothing else. At ratio 2 the same lab is at pixel 552 and the median
is 0%. A shift search of the whole stage by whole pixels found no better alignment (best at 0, 0), which is what a half pixel looks like. Whether the library should snap non-transformed boxes on a fractional ratio is for the
`hidpi` track (D45); the 2.625 pictures are in the compare directory for it. **This was not investigated further.**

## Checks

All new or changed checks are in the `transforms` section (`demo/src/verify-transforms.ts`); `scripts/verify-transforms-web.mjs` is unchanged and passes.

What changed in the verifier, and why:

* `checkHit(owner, api, capture, suffix)` takes the owner (it reads pixels). It reads the new counters `hit-count-bar|child|parent|collapsed|empty` instead of the text of `hit-counts` (`bar 1`, `child 1 parent 1`): those expectations were tied to the old text.
  New in it: a tap on the bare stage where the zero box is counts as a miss and never for the zero box; the amber outline is read in the raster 3.5 px outside the bar's top edge (a quarter of the way along it: its
  middle is crossed by the thin outline of the unturned box); the label's centre is within 2 px of the bar's.
* `checkPhone` (new, at the end of the section, in each window): the root is resized to 412 wide and **every case** is shown. For each: the lab is no wider than the phone; the stage is drawn at 412 / 520; its rectangle fills the width and is
  253.5 tall; the caption is inside the width and a long one runs to two lines or more; the case list (and Flip) are inside; then `capture()` saves the picture and runs the generic geometry check ("escapes right",
  "child escapes parent", sibling overlap) over the whole root. On the hit page a tap goes through the stage's scale and the bar's turn (it counts), and a tap on the bare stage is a miss. Cases that animate on their own are brought to rest first
  (`bringToRest`: the loop is paused at its first step by pressing its buttons, transitions are waited out, bounded), because the generic check compares the boxes round turned content, which overlap at 45 degrees. The turned-clip
  reports of `input`, `scroll` and `clip` are announced as the full-size checks announce them.
* The retina block (content scale 2, a 560 x 400 logical window) gives the root 640 px of height: the case list and caption under the stage do not fit 400.
* `TransformsInspection` gains `resizeSurface`.

### Why the phone check resizes the root and does not use `--viewport=412x915`

`--viewport` runs a 1120 x 800 window with `content_scale_mode = viewport`, aspect kept: the 412 x 915 content is scaled by 0.87 and letterboxed 380 px from the left. The verifier injects input in window pixels
(`Input.parseInputEvent`), which are the root's only when nothing is stretched, so a press at the loop button's root-local point (82.4, 207.6) was in the black bar. **Found with the inspector attached, after three logging passes
that did not name it** (the process's own V8 inspector on a private port, 9417 in `demo/project.godot` for the run, reverted; 9229 was another track's demo): paused in `bringToRest` right after the move, `api.snapshot().pointers` was `[]`, `hovered` null,
and the window `size 1120 x 800, contentScaleMode 2, aspect 1, contentScaleSize 412 x 915`. A hit-test reproduction in Rust (a clipping box holding a scaled stage and an absolute row past the box's layout height) passed, which cleared
`hit_node`, and no Rust changed. The phone check resizes the root in the standard windows, where window pixels are the root's. A `--viewport` run of the `transforms` section is not supported: it would run the full-size checks, which read the stage at its own 520 px.

### Negative controls (each runs the section once, `--no-retry`, landscape; the lab is restored from git after each)

| Mutation of the lab | The check that dies, and what it says |
| --- | --- |
| none | passes in both windows |
| `const fit = 1` (the stage is never scaled) | `transform-stage has no transform` (the phone check; and the generic geometry check would say "escapes right") |
| `HIT_FLASH = {}` (a tap outlines nothing) | `A tap on the bar outlines it: 228.12,103.22 (outside its top edge) is f8fafc, not the amber outline` |
| the bar loses `items-center justify-center` | `The turned bar's label is in its middle: its centre is 269,142.41 and the bar's 260,158` |

`tests/transform-lab.test.ts` (new, 5 tests) holds the rest against the fake host: every case has a label and a caption that is a sentence, a transition says Flip, the stage is unscaled at 520 and scaled
`floor(412 / 520 * 10000) / 10000` in a box of the scaled size at 412 (`getRect()` answered by the host), and a tap counts for what it hit, outlines it for exactly `HIT_FLASH_MS` and clears the last tap's outline as the next starts.
`tests/script-arguments.test.ts` and `tests/freshness.test.ts` list the three new scripts.

## Evidence

All through the gate, in this worktree, `PATH="$HOME/.cargo/bin:$PATH"`. Logs in `artifacts/logs/`.

| Command | Result |
| --- | --- |
| `pnpm build:native`, `node scripts/build-live-compile.mjs` (the installed ones were from before the touch-selection work) | built (`build-native.log`) |
| `pnpm test:types`, `pnpm test` | clean; **987 tests, 987 pass, 0 fail** (`final-1.log`). An earlier full run had one failure, `tests/editor-lines.test.ts` "keywords, numbers, comments and templates are coloured by the parse", which passes alone, in the main checkout and in the next full run: not diagnosed (it runs the parse under a time budget, on a host running other tracks' jobs) |
| `node scripts/verify.mjs --interaction --only=transforms,navigator` (Breaka's engine) | PASSED, landscape and portrait: navigator 8202 and 7540 checks, transforms 9840 and 7768 (before this track: transforms 5139 and 3425, landscape and portrait, `docs/tracks/transforms.md`) |
| the same with `--engine=stock` | PASSED: navigator 8202 and 7540, transforms 9767 and 7912 |
| `node scripts/build-web.mjs --export-only` then `node scripts/verify-interaction-web.mjs --only=transforms,navigator,touch` | PASSED, 2441 assertions (navigator 2113, transforms 252, touch 59) |
| `node scripts/transform-lab-web-capture.mjs` | 36 cases (and the tapped hit page) at 412 x 915 at 2.625, 412 x 915 at 2 and 1120 x 800; `document 412 wide` on both phones: nothing runs off the right edge |
| the negative controls | above (`control-*.log`) |
| `cargo test`, `cargo clippy`, `cargo fmt --check` | **not run: no Rust changed** (`git diff 3021765 --stat -- native Cargo.toml Cargo.lock` is empty) |

The Web passes were run on the export of the lab as committed in `d5a0dd0`; the one change since (`40019ae`) is the label check in the native verifier.

## Not verified

* **A real phone.** Chrome's mobile emulation (touch events through the protocol, Android's viewport and ratio) and the native verifier at 412 wide, not Ben's Android Chrome. The outline's timing on a real finger, the on-screen keyboard
  in the `input` case and the browser's own scrolling of the page around the lab were not looked at.
* The Web captures tap the loop buttons and the bar with `page.touchscreen.tap` at ratio 2.625 and 2; a touch drag (the `drag` case's half-second hold, the `scroll` lists) was not driven on a phone-sized page.
* The phone at 2.625 numerically (see "A lab on a half pixel"); the native phone captures are at ratio 1 only.
* Safari and iOS.
* Mobile and Forward+ renderers: the lab's drawing is the earlier track's (measured there); the new captures are Compatibility.

## README text

> The Transforms lab fits a phone: below 520 logical pixels the stage is drawn under `scale(width / 520)` and the case list, caption and results wrap at the window's width. Every case has a caption that says what it shows and what
> to try; the hit-testing case counts taps under names and colours, outlines the part a tap hit, and marks where the boxes sit before their transforms. `scripts/transform-lab-reference.mjs` draws every case as plain HTML in headless Chrome
> at a phone's size and a desktop's, and `scripts/transform-lab-web-capture.mjs` captures the Web export at the same sizes, for a side by side of each case.
