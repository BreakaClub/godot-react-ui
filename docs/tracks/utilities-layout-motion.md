# Track: layout and motion utilities (`utilities-layout-motion`)

Branch `utilities-layout-motion`, rebased onto main `5956068`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`,
`docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the README text is at the end).

Three parts: an audit of Tailwind v3.4.17 against what compiles (`docs/tracks/tailwind-coverage.md`), the layout utilities that have a
meaning under Flexbox, Grid and block layout with Taffy, and the transition classes. Every layout class that is claimed was compared
with Chrome under Tailwind's own CSS.

## Where things are

| What | Where |
| --- | --- |
| Class parsing | `src/utilities/layout.ts`, `src/utilities/transition.ts`, `src/utilities/hints.ts` (the teaching errors); one call each in `utilityStyle` (`src/styles.ts`) |
| Native types | `native/props.rs` (fields, merge, validate, `taffy_style`), `native/grid_style.rs` (tracks and placement), `native/transition.rs` (longhands, `all`, easing) |
| Native behaviour | `native/computed_style.rs` (viewport units, `visibility`, transition longhands resolved), `native/layout.rs` (`order`), `native/motion.rs` and `native/style_engine.rs` (colour and border-colour transitions, quiet `all`), `native/render_tree.rs` (sampled colours, hidden elements) |
| Tests | `tests/utilities-layout.test.ts`, `native/utility_layouts.rs` (Taffy against Chrome, and layouts against CSS), `native/transition.rs`, `native/motion.rs`, `native/grid_style.rs` |
| Lab, reference, verifier | `demo/src/layout-utilities-data.ts` (the page as data), `layout-utilities-lab.tsx`, `layout-utilities-reference.ts` (Chrome's numbers, generated), `verify-layout-utilities.ts` (section `layout-utilities`), `scripts/layout-utilities-reference.mjs`, `tests/fixtures/layout-utilities*.{css,json}` |
| Audit | `scripts/tailwind-coverage.mjs` (measures), `scripts/tailwind-coverage-notes.mjs` (owner and reason per gap), `docs/tracks/tailwind-coverage.md` (generated) |

## What was added

**Layout classes** (all in `tests/utilities-layout.test.ts`; the native side in `native/utility_layouts.rs`):

* margins: `m*-auto`, negative (`-mt-2`, `-mx-1`, `-m-px`), percentage (`m-[10%]`), start and end (`ms-*`, `me-*`; left and right, there is no
  right-to-left layout), `ps-*`, `pe-*`, `start-*`, `end-*`, arbitrary rem lengths in every spacing class;
* sizes: `size-*`, `w-screen`, `h-screen`, `min-h-screen`, `max-h-screen` and the `svh`, `lvh`, `dvh` (and width) names, `[50vw]`, `w|h-min|max|fit`,
  `max-w-screen-*`, `max-w-none`, `basis-*`, `grow-[n]`, `shrink-[n]`, `flex-[...]`;
* grid: `grid-rows-*`, `grid-cols-[...]` and `grid-rows-[...]` (px, rem, fr, %, auto, min-content, max-content, `minmax()`, `fit-content()`,
  `repeat(n | auto-fill | auto-fit, ...)`), `grid-cols-none`, `auto-cols-*`, `auto-rows-*`, `grid-flow-*`, `col-span-*`, `col-start-*`, `col-end-*`,
  `row-*`, `col-auto`, `-col-start-*`;
* alignment: `content-*`, `justify-items-*`, `justify-self-*`, `place-content-*`, `place-items-*`, `place-self-*`, `self-auto`, `justify-normal`,
  `justify-stretch`; `order-*` (including `-order-*`, `order-first`, `order-last`), `aspect-*`, `box-border`, `box-content`;
* `visible`, `invisible`, `overflow-clip` (and the axis forms), `block`, `flow-root`, `container`, `sr-only`, `not-sr-only`.

**Transition classes**: `transition`, `transition-none|all|colors|opacity|transform`, `duration-*`, `delay-*`, `ease-*` with Tailwind's timing (`transition` is
150 ms and `cubic-bezier(0.4, 0, 0.2, 1)`; `ease-in` is `cubic-bezier(0.4, 0, 1, 1)`), arbitrary `duration-[250ms]` and `ease-[cubic-bezier(...)]`.

### Decisions

1. **Viewport units are resolved in the computed style.** Taffy has none, and `h-screen` must not mean "100% of the parent". `vw` and `vh` stay in the
   layers and are replaced with pixels in `resolve()` (`StyleSpec::resolve_viewport_units`); nodes that use them are indexed beside the breakpoint
   index and restyled when the viewport's size changes. Layout refuses an unresolved one (`taffy_style` returns an error), so a path that forgot
   would fail loudly. The viewport is the root Control's size, as the breakpoints' is.
2. **Intrinsic keywords are for `width`, `height` and `flexBasis` only.** Taffy's `Dimension` has `min-content`, `max-content` and `fit-content`; its
   `min_size` and `max_size` are `LengthPercentageAuto` and cannot. `min-w-min` and the like throw and say to size the box with `w-min`. The
   keywords are not interpolated: a transition across one jumps (CSS does not interpolate them either), and `SampledDimension::Intrinsic` keeps the
   authored size so the sampled value never reaches layout as a number.
3. **A grid item's span is its own field.** `col-span-3` sets `gridColumnSpan`; `col-start-2` sets the start line; native resolves a line over a span
   (`grid_style::placement`), so `col-start-2 col-span-3` is `2 / span 3` in either order, which is what Tailwind's stylesheet order gives it.
4. **`order` lists the Taffy children in order** (`ReactUiRoot::apply_layout_order`, stable by `order`). The Taffy child list is put back in document
   order before the mounted tree changes it by index. Painting and hit testing keep document order (CSS paints in order-modified order; the two differ only
   for overlapping flex items).
5. **`visibility` is inherited and honest about what it does:** the element paints nothing of its own, is not a pointer target, cannot be focused,
   is left out of the accessibility tree and out of selection, its scroll bars and its text-input drawing go, and its backdrop filter is not drawn;
   its children can be `visible`. Layout is unchanged. `collapse` throws.
6. **`justify-content` defaults to `normal`**, not `flex-start`. Flex lays out the same (Taffy treats `normal` as `flex-start`); a grid's `auto` tracks now
   stretch as in CSS, which the comparison with Chrome showed (`grid-cols-[auto_auto]`). Nothing could make an `auto` column before this track.
7. **Display.** `block` and `flow-root` are Taffy block layout (margins collapse; verified against Chrome). `inline`, `inline-block`, `inline-flex`,
   `inline-grid`, `table*`, `contents` and `list-item` throw: there is no inline layout, and a flex or grid parent makes its children block-level anyway, so the
   message says to use `flex`, `grid` or `block`. A silent mapping would have been wrong inside a `block` parent.
8. **`space-*`, `divide-*`, `float-*`, `clear-*`, `columns-*`, `sticky`, `isolate`, `w-[calc()]`, `max-w-prose`, `grid-cols-subgrid`, `content-baseline`,
   `transition-shadow`** throw with a message that names what to use (`src/utilities/hints.ts`, one test per message). `container` and `sr-only` were
   worth mapping (layers at each breakpoint; a 1 px clipped absolute box).
9. **Transitions are longhands that compose.** `transition-colors hover:duration-500` keeps the colours and takes 500 ms while hovered: the classes set
   `transitionParts`, native merges them per field across layers (`transition::merge_transition`; a full inline `transition` replaces them and a longhand
   after it edits it), and the computed style resolves them with CSS's initial values (`all`, 0 ms, `ease`). `duration-200` alone animates everything. No
   duration and no delay is no transition, so the node is not a motion node.
10. **`transition-all` never throws.** `Transition.properties: 'all'` means every property of `TransitionProperty::ANIMATABLE`; a change that cannot animate
    (a width from pixels to a percentage, an intrinsic size on a flex main axis that can grow) is a quiet `MotionViolation` and is applied at once, with no report
    and no rejected commit. An explicit list that names the property keeps the report (D3).
11. **Colour and border colour animate; the text that inherits a moving colour follows it.** The Stylo mirror holds `color` and `border-color`; the sampled
    values paint. A node's descendants with the same computed colour paint the ancestor's sampled colour (`presented_text_color`) and are painted again while it
    moves and once when it stops. A descendant that set the same colour on purpose would follow too; that is the only ambiguity.

### The one place to extend (for the merge)

`TRANSITION_PROPERTIES` in `src/types.ts` is the list of what native animates, and `TransitionProperty::ANIMATABLE` in `native/props.rs` is its twin
(an exhaustive match in `motion.rs`' tests fails to compile until a new variant is placed). The class mapping reads the first: `transition`,
`transition-colors`, `-opacity`, `-transform` and `-shadow` name CSS properties (`src/utilities/transition.ts`, `TRANSITION_GROUPS`) and use whichever of them
native animates. Main added `transform` and this branch maps it, so `transition-transform` and the default `transition` already include it. When
`utilities-paint` adds `boxShadow` it adds one string to `TRANSITION_PROPERTIES`, one variant and one entry to `ANIMATABLE`, and `transition-shadow` and
`transition` start to include it with no change here (`tests/utilities-layout.test.ts` pins `transition-shadow` as an error until then, and the
`transition` list in its fixture then gains `boxShadow`).

## Evidence

All native runs used the quiet-window runner behind the gate; `--no-retry` where a negative control or a first run mattered.

| What | Result |
| --- | --- |
| `cargo test` (after the rebase) | 732 passed, 0 failed |
| `native/utility_layouts.rs` `taffy_lays_the_lab_out_as_chrome_does` | Taffy lays out the whole lab from the compiled classes: 582 boxes at 1120 x 800 and 600 x 900 within 0.5 px of Chrome's `getBoundingClientRect` on every edge (two cases are recorded as known differences, below) |
| `scripts/layout-utilities-reference.mjs --check` | the stored reference is what the installed Chrome (156.0.8078.80) renders again: 600 rectangles, worst difference 0 px; transition tables, 0 |
| `layout-utilities` section, Breaka, landscape and portrait | passed both windows. Against Chrome: worst edge difference 0.5 px (alignment page), 0.41 (sizes), 0.34 (grid), 0.2 (margins), 0 (misc); mean 0 to 0.1 px. 5187 and 4928 assertions |
| `layout-utilities` section, stock Godot 4.7.2 | passed both windows with the same numbers (7637 and 7873 assertions) |
| Transitions against Chrome | nine scenarios (`transition-colors duration-500 ease-in-out`, `transition-opacity ease-linear`, `transition duration-500 ease-in`, `ease-out`, `transition-all` with a width and a colour, `transition-all` with a percentage width, `duration-500` alone, `delay-100 ease-[cubic-bezier(0.1,0.7,1,0.1)]`, `hover:duration-[700ms]`), 30 to 59 samples each, compared with Chrome's `CSSTransition` paused at the same progress (a 101-row table per property). Mean difference ~0 in every scenario; worst plain difference 1.6 to 5.2 levels of 255 (the steep end of the custom curve), opacity 3e-8, width 1.1 px (the library lays out in whole pixels). The text colour of a `Text` that inherits the animated colour is compared too |
| `verify:motion` (Breaka) | both windows passed (`--no-retry`) |
| `verify:motion:web` | **fails, on timing, not on the change.** The Web export was built (`pnpm build:web --engine=breaka`); the run fails twice at `motion-dpr1: Font change after height completion: unrelated paint is still in flight` with `{"animating":false,"opacity":0.45}`. The paint transition lasts 600 ms and the check observes it three times after one click; with a temporary log in the verifier the three observations were 26, 309 and 626 ms after the click on a host at load average 63, so the third came after the transition ended. Each click and observation costs about 300 ms there; the check passes only when each costs under about 200 ms. Nothing this track changed is on that path (the section's three steps are pointer clicks and snapshots), and `verify:motion` passes natively. Rerun it on a quiet host: `node scripts/verify-motion-web.mjs` (the export is built) |
| `pnpm test:types`, `cargo clippy --all-targets -- -D warnings` | exit 0 |
| `pnpm test` | 646 passed, 0 failed |
| `rustup run stable cargo fmt --check` | clean for this track's files. Main is not clean in `native/scroll.rs`, `native/selection_input.rs` and `native/text_input_godot/keys.rs` (formatting only, left alone) |
| Chrome pictures | `artifacts/utilities-layout-motion-compare/compare-<page>-1120x800.png` (Chrome left, library right), `chrome-<page>-<size>.png` |

**How the transition check counts.** A sample is taken a frame at a time from the library's clock, and the library's value lay within noise of Chrome's curve
at the same progress but not always to the 8-bit level: a sample must lie on Chrome's curve within 5 ms of its progress, widened by one level of rounding.
Where the curve is steep a millisecond is several levels, which is why the plain differences above reach 5. I did not find the source of that jitter;
its mean is zero in every scenario, so it is not a lag, and the check does not hide a bias.

### Negative controls (each fails without the code, and was restored)

| Control | Result |
| --- | --- |
| Taffy parity test with `margin()` reading `auto` as 0 | `16 of 582 boxes differ from Chrome` |
| `--check` with a stored rectangle changed by 7 px | `stored [119,36,48,24] now [112,36,48,24]`, exit 1 |
| native section with `mx-auto` changed to `ml-auto` in the lab | `1 of 26 boxes on the margins page (window 1120x800) are more than 0.5 px from Chrome's` |
| native section with `ease-in-out` changed to a linear curve | `colors backgroundColor at 0.04: library #437feeff, Chrome [60,130,245,255] (7 levels apart, and not within 5 ms of its curve)` |

The first run of the section found bugs that were mine: the root node's snapshot had no colour fields; a probe sat on a neighbouring box; a clipped stage's child was
flex-shrunk so nothing hung past it; and the Chrome stylesheet lacked the transition scenarios' classes (Chrome then reported static default colours, which the
section correctly refused). The comparison with Chrome found real differences in the library too, all fixed: wrapping caption text widening cells (a font
effect, so captions are out of flow), the root's flex row shrinking a wide page, `grid-cols-[auto_auto]` not stretching (decision 6).

## Limits that stay

* **`w-min` on a wrapping flex container.** Taffy gives the container the narrowest width but one line of height (the items wrap, the box does not grow), so what follows it is off.
  `w-fit` and `w-max` are right, and `w-min` on a `Text` or a box that does not wrap is right. Recorded in the lab as a known case (`sizes.intrinsic-min`), left out of the comparison and
  reported by it.
* **`flex-1` in a column of unknown height.** Chrome takes the `0%` of `flex: 1 1 0%` against an unknown height as the content, so boxes with a `height` of their own collapse to nothing;
  Taffy (and this library's `flex-1`, whose basis is `0`) shares the container's height by the boxes' own heights. With a known height they agree. Pinned by
  `flex_one_in_a_column_of_unknown_height_is_not_chromes` so that a Taffy change shows; known case `sizes.flex-1-column`.
* **A flex-shrunk box with an `aspect-ratio`** keeps the height of its unshrunk width in Taffy; Chrome follows the shrunk width. The lab's aspect stage is wide enough not to shrink.
* **`transition-all` animates the properties in `TransitionProperty::ANIMATABLE`** (sizes, opacity, colours, filters, transform): padding, margin, gap, insets and radii jump.
  A width from pixels to a percentage jumps where Chrome interpolates it.
* **Colour inheritance follows the computed colour**, not the cascade: see decision 11.
* **`order` does not change paint order or hit testing**, only layout.
* **`visibility: hidden` on an element that has a `filter`** still applies the filter to its visible descendants (as CSS does) and does not draw its own backdrop filter.
* **Scale classes are Tailwind's** for the new classes (`order-1` to `12`, `col-span-1` to `12`, `col-start-1` to `13`); an arbitrary `[n]` takes any value. The spacing classes still accept any number.
* **Not verified:** the Web build of the layout lab (the section is native only, as asked); `utilities-paint` and `transforms` merge behaviour beyond reading the diffs; the two Godot
  renderers other than Compatibility (no drawing changed beyond colours and hiding).

## Review of `8721e7b` (the `starting:` variant)

Read for how it meets this track. I found nothing wrong. `restyle` resolves the `starting` style through the same `resolve()` that now folds `transition-*` longhands, so a
`starting:` layer composes with the transition classes (`starting:opacity-0 transition duration-500`); `motion_violations` runs on the `starting` style as on a previous one, so a
`transition-all` element that starts from a percentage width jumps quietly instead of rejecting the commit. One thing to know: `validate_motion` now applies to a first mount,
so an explicit `properties: ['width']` that starts from `starting:w-1/2` and ends at pixels is a rejected commit, which is the same rule as an update.

## README text

> **Layout and motion utilities.** Margins take `auto`, negative and percentage values; `w-screen`, `h-screen` and `[50vw]` size against the root; `w-fit`, `w-min`, `w-max`
> size by content; grids take `grid-cols-[...]` and `grid-rows-[...]` tracks (`minmax`, `fit-content`, `repeat(auto-fill, ...)`), `col-span-*`, `col-start-*`, `grid-flow-*`,
> `auto-cols-*`; `content-*`, `justify-items-*`, `place-*`, `order-*`, `aspect-*`, `invisible`, `overflow-clip`, `block` and `container` work as in Tailwind.
> `transition`, `transition-colors|opacity|transform|all|none`, `duration-*`, `delay-*` and `ease-*` use Tailwind's timing and compose across variants
> (`transition-colors hover:duration-500`); `transition-all` animates every property native can and lets the others jump. Classes with no honest meaning here
> (`space-*`, `divide-*`, `inline-*`, `float-*`, `sticky`) throw an error that names what to use. `docs/tracks/tailwind-coverage.md` lists, class by class, what compiles
> and what is left.
