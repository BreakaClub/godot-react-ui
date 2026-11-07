# Rich text track: nested `Text`, inlays, geometry queries, decoration styles

Branch `rich-text`. Why: the lab code editor (`docs/tracks/code-editor-evaluation.md`, sections 4 to 6.2) needs attributed text, and a
`View` of `Text` runs costs about 9 nodes a line, cannot keep columns exact and cannot draw wavy underlines. These are general library
features, with Chrome as the reference. The plan's non-goal "rich/nested text runs" is reversed by this track.

## API for the editor

Settled and committed before the native half is finished; the JS side below is implemented and unit tested (`tests/rich-text.test.ts`).
The native queries answer once the native library is rebuilt from this branch.

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
