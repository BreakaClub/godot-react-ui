# Rich text track: nested `Text`, inlays, geometry queries, decoration styles

Branch `rich-text`. Why: the lab code editor (`docs/tracks/code-editor-evaluation.md`, sections 4 to 6.2) needs attributed text, and a
`View` of `Text` runs costs about 9 nodes a line, cannot keep columns exact and cannot draw wavy underlines. These are general library
features, with Chrome as the reference. The plan's non-goal "rich/nested text runs" is reversed by this track.

## API for the editor

Implemented on the JS side (`tests/rich-text.test.ts`) and natively (`native/text_span.rs`, `text_geometry.rs`); verified by the `rich-text` section
of the interaction verifier (see "Verification"). This section was committed before the native half was finished, and nothing in it changed since.

### Nested `Text` is one paragraph

```tsx
<Text className="font-mono text-xs whitespace-pre" testID="line-12">
  <Text className="text-purple-400">const</Text> x
  <Text inlay className="text-slate-500">: number</Text>
  {' = '}<Text className="text-amber-300 underline decoration-wavy decoration-red-500">1</Text>;
</Text>
```

* One host node. The outer `Text`'s native `text` is the children joined, `const x = 1;`, and its native `spans` are the styled ranges
  (UTF-16 offsets into `text`). A nested `Text` is never a native node: no tag, no layout, no `getRect()`.
* The parent receives the whole `spans` array when any span changes (React Native sends the whole attributed string too). A colour
  change sends `{ spans }` and nothing else; native re-records without shaping again. A change of the text sends `text` and `spans`.
* Nesting works like CSS inline elements: a child inherits colour, font family, weight and style from the span it is in, and a text
  decoration propagates to what is inside; a background is not inherited but is drawn under the nested spans' text.
* A nested `Text` accepts only `children`, `className`, `style`, `inlay`. Anything else (`onClick`, `testID`, `ref`, `role`, ...) throws
  at render, naming the prop.
* Its style may set only these longhands (`SPAN_STYLE_KEYS` in `src/rich-text.ts`): `color`, `backgroundColor`, `fontFamily`,
  `fontWeight`, `fontStyle`, `textDecorationLine`, `textDecorationColor`, `textDecorationStyle`, `textDecorationThickness`,
  `textUnderlineOffset`. Tailwind: `text-*` colour, `bg-*` colour, `font-*`, `italic`, `underline|overline|line-through`,
  `decoration-<colour>`, `decoration-<n>`, `decoration-solid|double|dotted|dashed|wavy`, `underline-offset-*`. Anything else (padding,
  font size, letter spacing, text transform...) throws, naming the longhand.
* Breakpoint and state classes (`md:`, `hover:`) throw on a nested `Text`: a span is not a pointer target and is not restyled when the
  viewport changes. Style the parent, or choose in JavaScript.
* Components that return a `Text`, fragments and arrays between the two work. A `View` or a `Button` inside a `Text` throws.

### Inlays

`<Text inlay className=...>generated text</Text>` inside a `Text`: shown, measured and wrapped like the text around it, but not part of
the source text. It holds plain text. It sits at the source offset where it appears in the children. It takes the style of the `Text` it is
in, with its own `className` and `style` on top.

* Offsets of everything below skip inlays: `getCaretRect`, `getOffsetAtPoint`, `getRangeRects`, the document selection
  (`getSelection()`, `useTextSelection()`), pointer selection, copy, double click and word boundaries.
* Selecting across an inlay and copying leaves it out; the highlight band runs through an inlay that is inside the range and stops at
  one that is at an end of it. The accessible name leaves inlays out.
* A caret can sit on either side of an inlay: `side: 'before'` (left of the inlay) or `'after'` (right of it). Several inlays at one
  offset count as one group. Clicking inside an inlay snaps to the nearer side.

### Geometry queries on any `Text` handle (`UIHandle`)

All three are in the same root-local space as `getRect()`, correct under transforms (the bounding box of what is drawn) and at any
device pixel ratio. Offsets are UTF-16 units of the text the element shows (the source text without inlays; `text-transform` and
`white-space` collapsing can change the shown text, and the selection uses the shown text too). They throw for an element that is not
a `Text`.

```ts
type TextSide = 'before' | 'after';
interface UITextPosition { readonly offset: number; readonly side: TextSide }
interface LayoutRect { x: number; y: number; width: number; height: number }

getCaretRect(offset: number, side?: TextSide): LayoutRect | undefined
getOffsetAtPoint(x: number, y: number): UITextPosition | undefined
getRangeRects(start: number, end: number): LayoutRect[] | undefined
```

* `getCaretRect(offset, side = 'after')`: `width` is 0; `y` and `height` are the line box (the same band `getRangeRects` gives), so a caret
  and a selection highlight line up. An empty `Text` answers offset 0 with a rect at its content origin, the height of its empty line.
  Throws `RangeError` for an offset past the end or inside a surrogate pair.
* `getOffsetAtPoint(x, y)`: the nearest caret position, clamped (above the first line is the first line; past the end of a line is its
  end). `side` is `'before'`/`'after'` the inlay it falls beside; `'after'` otherwise. Never throws for a finite point.
* `getRangeRects(start, end)`: one rect per line run (empty for `start === end`). Throws `RangeError` like `getCaretRect`.
* All return `undefined` once the element is gone (as `getRect()` does).

### What to build on

* One `Text` per line, `whitespace-pre`, `font-mono`: columns are exact (one shaped paragraph, not run boxes rounded to pixels).
* Recolour with `className` on spans; to mark a range (bracket match, selection band) wrap it in a span with `bg-*`.
* Diagnostics: a span with `underline decoration-wavy decoration-<colour>` (see "Decoration styles" for what is drawn).
* Inlay hints: a `<Text inlay>` at the hint's source offset.

## Decisions (so far)

* **Where the flattening happens.** In the renderer's host config (`src/renderer.ts`), as React Native does with virtual text nodes: the
  host context says a `Text` is inside a `Text` (`getChildHostContext`), so the nested one becomes a `SpanInstance` (no tag, never
  committed) and strings become runs. The parent `Text` instance reads `native` lazily (`makeInstance`): React appends a clone's
  children after creating it, so `text` and `spans` can only be made when the commit walk reads them. `flattenRichText`
  (`src/rich-text.ts`) is the one place that makes them. An app with no nested `Text` takes the old path unchanged.
* **Wire format.** `spans`: a tree of `{ start, end, style?, inlay?, children? }`. A tree (not a flat list) because a zero-width inlay at a
  span's end is either inside or after it, and a flat list cannot say which. `style` is the span's classes and style merged into one flat
  longhand object.
* **Why a nested `Text` has no state or breakpoint classes.** Registering the parent for every threshold its spans use is breakpoint
  index work for a case nobody asked for; refusing it by name is honest and can be relaxed later.
* **`TextHandle` is not a type.** The three queries are on `UIHandle`, as `scrollTo` is, so existing `ref`s typed `UIHandle` keep working.

## Decisions (native)

* **Spans resolve like nested inline elements** (`native/text_span.rs`, Godot-free, 30 unit tests): a span's style inherits colour and the text
  longhands from the span it is in through the same `InheritedText`/`settle` the style engine uses for nodes, so a decoration propagates, takes the colour
  and thickness of the span that set it and `currentcolor` is that span's. A segment's colour is `None` unless a span set one, so a node's own colour (which a
  transition may be moving) still paints text no span coloured.
* **One shaped paragraph, one font per run.** The display text (shown text with the inlays spliced in) is shaped with one `TextParagraph::add_string` per run
  of one font (`StyledParagraph::build_rich`). Colour changes do not split a run, so a colour-only highlight is one string. `fontSize`, letter spacing and
  text transform per span are refused by name: they change the line box or the length of the text.
* **Glyph colour by cluster start**, the loop `RichTextLabel` has (`draw.rs`, `ColorRuns`): a ligature takes the colour of its first character. A paragraph with
  no per-glyph colours, decorations or tracking still goes through `TextParagraph::draw`, so plain text and an unused feature cost nothing.
* **Offsets.** `text_span/offsets.rs` is the display/source map (tested: groups of inlays at one offset, ends of a range, inside a group). The document (selection
  model, copy, accessibility, the three queries) is in shown-text offsets; `text_style/flow.rs` now also says where each source character went when `text-transform`
  or white space collapsing changed the text (`shown_text_mapped`), so spans stay on the right characters under `whitespace-normal` and `uppercase`.
* **A selection highlight covers an inlay strictly inside the range and none at its ends**; a click inside an inlay is on the nearer side; a double click on a
  word that has an inlay in it selects the word's source characters (`abc` + inlay `def` + `ghi` selects `abcghi`).
* **No re-shaping for a repaint.** `refresh_paragraph` resolves the spans again on any `spans`, colour or decoration change, and hands the paragraph the new paint
  data when the display text, the font runs, the shaping style and the font book's epoch (bumped by `registerFontFace`) are what it was shaped from
  (`repaint_rich`). `paragraphBuilds` and `paragraphRepaints` in `getActivity` count the two.
* **Decorations per fragment** (`decorated_fragments`): the segments with decorations, cut at line breaks, with their extent from the layout's selection rectangles,
  because that is what Chrome does (a wave restarts at every span). A text with no spans is one fragment per line, as before.
* **Baked pictures for a wave and for round dots** (`text_decoration/raster.rs`), leased from the same cache as shadow masks (`box_draw::acquire_baked`), one
  per stroke width and pixel ratio, tiled along the line; at a fractional ratio several periods are baked so the picture is a whole number of device pixels.
* **A span's styles are unconditional.** See above; `hover:` and breakpoint classes on a span throw. The parent text restyles through the ordinary path, and a text
  with spans re-resolves them when its colour or decorations change (`motion.rs`).

## Limits

* Spans take colour, background, family, weight, style and decoration only; no font size, letter spacing, case or numerals per span.
* An inlay holds plain text, and a nested `Text` has no ref, handler, role or test id (it is not an element).
* The pattern of `auto` thickness on a dotted or dashed line, and dash and dot positions between device pixels, differ from Chrome as noted under "Decoration styles".
* Caret positions are by line box: a mixed-direction line has two carets at a direction change and `getCaretRect` returns the primary (left-to-right) one.
* Bidirectional text, and text where spans split a grapheme cluster, were not checked against Chrome.

## Decoration styles: what Chrome draws, read off its pixels

Measured in headless Chrome 156 (puppeteer-core; JetBrains Mono at 12, 14, 16, 24 and 25 px, Open Sans at 16 px, device pixel ratios 1 and 2,
thicknesses auto and 1 to 10 px, `text-decoration-skip-ink: none`, the text transparent so only the line is in the picture). The scripts
and their raw output are in the scratch directory of the session that measured them (`.../scratchpad/chrome-decoration/`, `run-section.sh
<section>`); the numbers below are what the implementation (`native/text_decoration.rs`, `text_decoration/raster.rs`) holds to, in unit tests
that quote them. Chrome's "DPR 2" here is puppeteer's emulated device scale: everything is laid out and snapped in CSS px and scaled by two.
A real high-density display (zoom-for-dsf) may snap in device pixels; it was not measured.

**Definitions.** `w` is the stroke: an explicit thickness rounded half up to whole CSS px (at least 1), or the font size over ten for `auto`
(unrounded). `T` is the drawn thickness (`w`, or `max(1, floor(size / 10))` for `auto`). `A` is the font's ascent rounded to a whole pixel.
Rows are CSS px from the baseline, y down.

| | solid and first line of a double | dotted and dashed | wavy centre line |
| --- | --- | --- | --- |
| underline | `g` = the offset, else `max(1, ceil(w / 2))` | the same | `round(g + w) + 1.5` |
| overline | `[-A - T, -A)` | the same | `round(-A - w - T) - 0.5` |
| line through | `floor(-A / 3 - w / 2 + 1/2)` | `floor(-ceil(A / 3) - T / 2 + 1/2)` | `round(-A / 3 - w / 2) + 1/2` |

`text-underline-offset` changes the underline only (30/30 identical for the other two, five styles, four offsets).

* **Double**: two bands of `T` with one CSS px between them; the second is below the first for an underline and a line through the text and
  **above** it for an overline. For `auto` the distance between the tops is `round(w) + 1` (underline), `floor(w + 0.4) + 1` (overline), `T + 1`.
* **Dashed**: butt dashes of `3T` with `2T` gaps for `T < 3`, `2T` and `T` otherwise, on the solid band's rows. A line of `L` whole CSS px
  (`floor(right) - floor(left)`) is fitted as Blink's `SelectBestDashGap` does: of the two counts around the nominal one the gap nearer the
  nominal wins (ties go to the larger count); the first dash starts at `floor(left)` and the last ends at `floor(right)`. At `L = 192`: T 1 gives
  39 dashes and a gap of 1.974, T 2 20 and 3.789, T 3 22 and 2.857, T 4 16 and 4.267, T 6 11 and 6.
* **Dotted**: squares of `T` every `2T` for `T < 4` (the last cut by the line's end); round dots of diameter `T` fitted like dashes
  (dash = gap = T) for `T >= 4`, drawn as a circle of radius `T/2 - 0.17` device px.
* **Wavy**: a cubic Bezier S-curve, one cubic per period, from `(0, 0)` with control points `(P/2, d)` and `(P/2, -d)` to `(P, 0)`, stroked `w`
  wide with butt caps: period `P = 3 + 2 floor(2w)`, control distance `d = 1.5 + floor(3w)`, centre-line peak to peak `sqrt(3) (w + 1/2)`. It is
  anchored to the fragment's left edge rounded to a device pixel and **cut off, not completed**, at its right. The overline's wave is
  pixel-exact against this model (1/255); the underline's too; the line through the text is exact for T 3 and 6 at DPR 1 and T 1, 3, 4, 6 at
  DPR 2 and within 0.17 coverage on crest and trough tips for the others. Antialiasing is 4 samples per pixel at (3/8, 1/8), (7/8, 3/8),
  (1/8, 5/8), (5/8, 7/8): every partial pixel is 0.25, 0.5 or 0.75. A sample is inside when its distance to the centre line is at most `w / 2`,
  which agrees with Chrome for 93 to 97 % of the pixels of a wave and differs by one sample at a few tips (Skia's stroker is a little tighter there).
* **Where a pattern starts**: at every inline box fragment. A wave over `abc<b>def</b>ghi` starts again at the bold span and again after it
  (differing by 6 px of 0.03 from three independent spans; 1.0 over whole segments from one continuous span), and at the start of every wrapped
  line; dashes and dots are fitted to each fragment's own length. The library draws a decoration per segment of a text (between span
  boundaries) and per line, so it does the same.
* **Backgrounds** of a span have no antialiasing: each edge rounds to a whole CSS px (then scales), and the height is the content area, rows
  `[-round(ascent), round(descent))`, not the line box.

Left out, with the reason: `auto` thickness on a dotted or dashed line is a stroke of about `round(2w)/2` px with antialiased rows (Chrome),
drawn here as the nearest whole pixels; dash and dot x positions are quantised to a quarter device pixel in Chrome and to a device pixel
here; the exact round-dot construction (a dot's phase differs from dot to dot in Chrome).

## README text

> **Rich text.** A `Text` with nested `Text` is one attributed paragraph, as in React Native: `<Text>const <Text className="text-purple-600">x</Text> = 1</Text>` is one
> native node with a styled range. A span sets colour, background colour, font family, weight and slant and the text decoration (`underline`, `overline`, `line-through`;
> `decoration-solid|double|dotted|dashed|wavy`, thickness, colour, `underline-offset`), inherits from the span it is in, and is drawn per glyph over one shaped
> paragraph, so monospace columns are exact. Decorations are drawn as Chrome draws them, wavy included. `<Text inlay>` is generated text (a type hint): shown,
> measured and wrapped, but not part of the text: offsets, the selection, copy and the accessible name skip it, and a caret can sit on either side of it. Every `Text`
> handle answers `getCaretRect(offset, side)`, `getOffsetAtPoint(x, y)` and `getRangeRects(start, end)` in the root-local space of `getRect()`, right under transforms and at
> any pixel ratio. A change to one span's colour is a commit of a few hundred characters that paints without shaping again. Details and the Chrome comparison:
> `docs/tracks/rich-text.md`.
