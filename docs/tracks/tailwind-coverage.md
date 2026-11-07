# Tailwind v3.4.17 coverage

Which of Tailwind v3.4.17's utilities and variants this library compiles, measured, not listed by hand. Ben asked to see the missing
utilities; this is that list, with who adds each gap or why it stays one. Regenerate it after a merge:

```
npm pack tailwindcss@3.4.17 && mkdir tw && (cd tw && npm init -y && npm install --ignore-scripts ../tailwindcss-3.4.17.tgz)
node --import tsx scripts/tailwind-coverage.mjs --tailwind=tw --markdown=docs/tracks/tailwind-coverage.md [--before=<json>]
```

**Method.** Each of the 178 core plugins of `lib/corePlugins.js` (all but `preflight`) is run against a recording stand-in for Tailwind's
plugin API with the default theme, which lists the class names `tailwind build` would generate (named values and the negative classes
Tailwind's `negateValue` allows; arbitrary `[...]` values are not enumerable, and the tests in `tests/utilities-layout.test.ts` and
`tests/styles.test.ts` cover the ones this library takes). Each class name is handed to `compileStyle`: it counts as compiled when it
does not throw. A variant is tried in front of `p-1`. Colour classes and the per-side border classes dominate the counts, which is why
the share is lower than the importance of what is missing. "Compiles" means the class is accepted and native honours it, not that it
has been checked against a browser: `docs/tracks/utilities-layout-motion.md` says which layout and transition classes were.

Owners: `utilities-paint` (shadows, rings, outlines, per-side borders and radii, gradients), `utilities-text` (font and text utilities),
`transforms`, and `utilities-layout-motion` (everything else that has a meaning here). A track's row says "added by" until its branch
is merged; regenerating after the merge turns it into "supported". "Deliberately absent" always gives the reason.

## Summary

* Class names that compile: **8045 of 11344** (70.9 %).
* Variants (of 103 probed, covering every family of v3.4.17): **11 compile**.

## Core plugins

| plugin | classes | compile | before | status |
| --- | ---: | ---: | ---: | --- |
| `container` | 1 | 1 |  | supported |
| `accessibility` | 2 | 2 |  | supported |
| `pointerEvents` | 2 | 2 |  | supported |
| `visibility` | 3 | 2 |  | partly (the rest is deliberately absent): `collapse` is absent: a flex `visibility: collapse` keeps the cross size and is not `display: none`; use `invisible` or `hidden` |
| `position` | 5 | 4 |  | partly (the rest is deliberately absent): `sticky` needs scroll-linked positioning in the layout engine; use `relative`, `absolute` or `fixed` |
| `inset` | 765 | 765 |  | supported |
| `isolation` | 2 | 0 |  | deliberately absent: z-index here never creates a stacking context, so there is nothing for `isolate` to do |
| `zIndex` | 13 | 13 |  | supported |
| `order` | 30 | 30 |  | supported |
| `gridColumn` | 14 | 14 |  | supported |
| `gridColumnStart` | 27 | 27 |  | supported |
| `gridColumnEnd` | 27 | 27 |  | supported |
| `gridRow` | 14 | 14 |  | supported |
| `gridRowStart` | 27 | 27 |  | supported |
| `gridRowEnd` | 27 | 27 |  | supported |
| `float` | 5 | 0 |  | deliberately absent: no floats; use flex (`ml-auto`, `justify-end`) or grid |
| `clear` | 6 | 0 |  | deliberately absent: no floats, so nothing to clear |
| `margin` | 639 | 639 |  | supported |
| `boxSizing` | 2 | 2 |  | supported |
| `lineClamp` | 7 | 7 |  | supported |
| `display` | 21 | 5 |  | partly (the rest is deliberately absent): `block` and `flow-root` are Taffy block layout; there is no inline layout, so `inline*`, `table*`, `contents` and `list-item` are absent (a flex or grid parent makes its children block-level anyway) |
| `aspectRatio` | 3 | 3 |  | supported |
| `size` | 66 | 66 |  | supported |
| `height` | 59 | 59 |  | supported |
| `maxHeight` | 44 | 41 |  | partly (the rest is deliberately absent): `max-h-min|max|fit` are absent for the same reason as `max-w-*` |
| `minHeight` | 43 | 40 |  | partly (the rest is deliberately absent): `min-h-min|max|fit` are absent for the same reason as `max-w-*` |
| `width` | 70 | 70 |  | supported |
| `minWidth` | 39 | 36 |  | partly (the rest is deliberately absent): `min-w-min|max|fit` are absent for the same reason as `max-w-*` |
| `maxWidth` | 57 | 53 |  | partly (the rest is deliberately absent): `max-w-min|max|fit` are absent (Taffy limits take lengths and percentages, not intrinsic keywords; size the box with `w-min`); `max-w-prose` needs the `ch` unit |
| `flex` | 4 | 4 |  | supported |
| `flexShrink` | 4 | 2 |  | partly (the rest is deliberately absent): not yet decided |
| `flexGrow` | 4 | 2 |  | partly (the rest is deliberately absent): not yet decided |
| `flexBasis` | 63 | 63 |  | supported |
| `tableLayout` | 2 | 0 |  | deliberately absent: no table layout; use grid |
| `captionSide` | 2 | 0 |  | deliberately absent: no table layout |
| `borderCollapse` | 2 | 0 |  | deliberately absent: no table layout |
| `borderSpacing` | 105 | 0 |  | deliberately absent: no table layout |
| `transformOrigin` | 9 | 9 |  | supported |
| `translate` | 168 | 168 |  | supported |
| `rotate` | 18 | 18 |  | supported |
| `skew` | 24 | 24 |  | supported |
| `scale` | 60 | 60 |  | supported |
| `transform` | 4 | 4 |  | supported |
| `animation` | 5 | 0 |  | deliberately absent: keyframe animations are not part of the motion engine (transitions only) |
| `cursor` | 36 | 15 |  | partly (the rest is deliberately absent): native has the 15 shapes Godot has; the rest (`cursor-copy`, `cursor-zoom-in`, `cursor-none`, ...) have no Godot cursor to map to |
| `touchAction` | 10 | 4 |  | partly (the rest is deliberately absent): native has `auto`, `none`, `pan-x` and `pan-y`; pinch-zoom and manipulation are not modelled |
| `userSelect` | 4 | 2 |  | partly (the rest is deliberately absent): native selects text with `select-text` and `select-none`; `select-all` and `select-auto` are not modelled |
| `resize` | 4 | 0 |  | deliberately absent: no user-resizable elements |
| `scrollSnapType` | 6 | 0 |  | deliberately absent: no scroll snapping |
| `scrollSnapAlign` | 4 | 0 |  | deliberately absent: no scroll snapping |
| `scrollSnapStop` | 2 | 0 |  | deliberately absent: no scroll snapping |
| `scrollMargin` | 630 | 0 |  | deliberately absent: no scroll snapping or scroll-into-view offsets |
| `scrollPadding` | 315 | 0 |  | deliberately absent: no scroll snapping or scroll-into-view offsets |
| `listStylePosition` | 2 | 0 |  | deliberately absent: no list markers; draw the marker as an element |
| `listStyleType` | 3 | 0 |  | deliberately absent: no list markers |
| `listStyleImage` | 1 | 0 |  | deliberately absent: no list markers |
| `appearance` | 2 | 0 |  | deliberately absent: there are no native form controls to restyle |
| `columns` | 26 | 0 |  | deliberately absent: no multi-column layout; use `grid-cols-*` (the class says so) |
| `breakBefore` | 8 | 0 |  | deliberately absent: no fragmentation |
| `breakInside` | 4 | 0 |  | deliberately absent: no fragmentation |
| `breakAfter` | 8 | 0 |  | deliberately absent: no fragmentation |
| `gridAutoColumns` | 4 | 4 |  | supported |
| `gridAutoFlow` | 5 | 5 |  | supported |
| `gridAutoRows` | 4 | 4 |  | supported |
| `gridTemplateColumns` | 14 | 13 |  | partly (the rest is deliberately absent): `grid-cols-subgrid` is absent: Taffy has no subgrid |
| `gridTemplateRows` | 14 | 13 |  | partly (the rest is deliberately absent): `grid-rows-subgrid` is absent: Taffy has no subgrid |
| `flexDirection` | 4 | 4 |  | supported |
| `flexWrap` | 3 | 3 |  | supported |
| `placeContent` | 8 | 7 |  | partly (the rest is deliberately absent): `place-content-baseline` is absent for the same reason |
| `placeItems` | 5 | 5 |  | supported |
| `alignContent` | 9 | 8 |  | partly (the rest is deliberately absent): `content-baseline` is absent: Taffy has no baseline content alignment |
| `alignItems` | 5 | 5 |  | supported |
| `justifyContent` | 8 | 8 |  | supported |
| `justifyItems` | 4 | 4 |  | supported |
| `gap` | 105 | 105 |  | supported |
| `space` | 142 | 0 |  | deliberately absent: a child combinator for margins does not exist natively; the class throws and says to use `gap-x-*` or `gap-y-*` on the container |
| `divideWidth` | 12 | 0 |  | deliberately absent: a child combinator for borders does not exist natively; the class throws and says to border the children |
| `divideStyle` | 5 | 0 |  | deliberately absent: as `divide-width` |
| `divideColor` | 247 | 0 |  | deliberately absent: as `divide-width` |
| `divideOpacity` | 21 | 0 |  | deliberately absent: as `divide-width` |
| `placeSelf` | 5 | 5 |  | supported |
| `alignSelf` | 6 | 6 |  | supported |
| `justifySelf` | 5 | 5 |  | supported |
| `overflow` | 15 | 15 |  | supported |
| `overscrollBehavior` | 9 | 2 |  | partly (the rest is deliberately absent): native overscroll is one value for both axes, `auto` or `contain`; `overscroll-none` and the per-axis forms are not modelled |
| `scrollBehavior` | 2 | 0 |  | deliberately absent: smooth scrolling of programmatic scrolls is not modelled |
| `textOverflow` | 4 | 3 |  | partly (`utilities-text` adds the rest): `truncate`, `text-ellipsis` |
| `hyphens` | 3 | 0 |  | added by `utilities-text`: `hyphens-*` |
| `whitespace` | 6 | 6 |  | supported |
| `textWrap` | 4 | 0 |  | added by `utilities-text`: `text-wrap`, `text-balance` |
| `wordBreak` | 4 | 4 |  | supported |
| `borderRadius` | 135 | 81 |  | partly (`utilities-paint` adds the rest): per-corner and per-side radii |
| `borderWidth` | 45 | 35 |  | partly (`utilities-paint` adds the rest): per-side border widths |
| `borderStyle` | 6 | 2 |  | partly (`utilities-paint` adds the rest): dashed, dotted and double borders |
| `borderColor` | 2223 | 1715 |  | partly (`utilities-paint` adds the rest): per-side border colours |
| `borderOpacity` | 21 | 0 |  | added by `utilities-paint`: the opacity utilities `border-opacity-*` |
| `backgroundColor` | 247 | 245 |  | partly (the rest is deliberately absent): `bg-inherit` and `bg-current` need `inherit` and `currentColor` as paint values |
| `backgroundOpacity` | 21 | 0 |  | added by `utilities-paint`: the opacity utilities `bg-opacity-*` |
| `backgroundImage` | 9 | 9 |  | supported |
| `gradientColorStops` | 804 | 798 |  | partly (`utilities-paint` adds the rest): `from-*`, `via-*`, `to-*` |
| `boxDecorationBreak` | 4 | 0 |  | deliberately absent: no fragmentation |
| `backgroundSize` | 3 | 0 |  | deliberately absent: no background images |
| `backgroundAttachment` | 3 | 0 |  | deliberately absent: no background images |
| `backgroundClip` | 4 | 0 |  | deliberately absent: no background images (`bg-clip-text` needs text as a mask) |
| `backgroundPosition` | 9 | 0 |  | deliberately absent: no background images |
| `backgroundRepeat` | 6 | 0 |  | deliberately absent: no background images |
| `backgroundOrigin` | 3 | 0 |  | deliberately absent: no background images |
| `fill` | 248 | 0 |  | deliberately absent: no SVG content |
| `stroke` | 248 | 0 |  | deliberately absent: no SVG content |
| `strokeWidth` | 3 | 0 |  | deliberately absent: no SVG content |
| `objectFit` | 5 | 0 |  | deliberately absent: no replaced content (images are not elements here) |
| `objectPosition` | 9 | 0 |  | deliberately absent: no replaced content |
| `padding` | 315 | 315 |  | supported |
| `textAlign` | 6 | 6 |  | supported |
| `textIndent` | 70 | 0 |  | added by `utilities-text`: `indent-*` |
| `verticalAlign` | 8 | 0 |  | added by `utilities-text`: `align-*` |
| `fontFamily` | 3 | 3 |  | supported |
| `fontSize` | 13 | 13 |  | supported |
| `fontWeight` | 9 | 9 |  | supported |
| `textTransform` | 4 | 4 |  | supported |
| `fontStyle` | 2 | 2 |  | supported |
| `fontVariantNumeric` | 9 | 9 |  | supported |
| `lineHeight` | 14 | 14 |  | supported |
| `letterSpacing` | 12 | 6 |  | partly (`utilities-text` adds the rest): `tracking-*` |
| `textColor` | 247 | 245 |  | partly (the rest is deliberately absent): `text-inherit` and `text-current`: a colour is inherited by default; there is no `currentColor` keyword |
| `textOpacity` | 21 | 0 |  | added by `utilities-text`: `text-opacity-*` |
| `textDecoration` | 4 | 4 |  | supported |
| `textDecorationColor` | 247 | 245 |  | partly (`utilities-text` adds the rest): text decoration |
| `textDecorationStyle` | 5 | 5 |  | supported |
| `textDecorationThickness` | 7 | 7 |  | supported |
| `textUnderlineOffset` | 6 | 6 |  | supported |
| `fontSmoothing` | 2 | 1 |  | partly (`utilities-text` adds the rest): `antialiased` |
| `placeholderColor` | 247 | 245 |  | partly (the rest is deliberately absent): `placeholder-inherit` and `placeholder-current`: as `text-inherit` |
| `placeholderOpacity` | 21 | 0 |  | added by `utilities-text`: `placeholder-opacity-*` |
| `caretColor` | 247 | 245 |  | partly (the rest is deliberately absent): `caret-inherit` and `caret-current`: as `text-inherit` |
| `accentColor` | 248 | 0 |  | deliberately absent: there are no native form controls to tint; the kit components take their own colour classes |
| `opacity` | 21 | 21 |  | supported |
| `backgroundBlendMode` | 16 | 0 |  | deliberately absent: no blend modes |
| `mixBlendMode` | 18 | 0 |  | deliberately absent: no blend modes |
| `boxShadow` | 8 | 8 |  | supported |
| `boxShadowColor` | 247 | 245 |  | partly (`utilities-paint` adds the rest): box shadow colours |
| `outlineStyle` | 5 | 2 |  | partly (`utilities-paint` adds the rest): outlines |
| `outlineWidth` | 5 | 5 |  | supported |
| `outlineOffset` | 10 | 10 |  | supported |
| `outlineColor` | 247 | 245 |  | partly (`utilities-paint` adds the rest): outlines |
| `ringWidth` | 7 | 7 |  | supported |
| `ringColor` | 247 | 245 |  | partly (`utilities-paint` adds the rest): rings |
| `ringOpacity` | 21 | 0 |  | added by `utilities-paint`: rings |
| `ringOffsetWidth` | 5 | 5 |  | supported |
| `ringOffsetColor` | 247 | 245 |  | partly (`utilities-paint` adds the rest): rings |
| `blur` | 9 | 8 |  | partly (the rest is deliberately absent): `blur-0`: use `blur-none` |
| `brightness` | 11 | 11 |  | supported |
| `contrast` | 7 | 7 |  | supported |
| `dropShadow` | 7 | 7 |  | supported |
| `grayscale` | 2 | 2 |  | supported |
| `hueRotate` | 12 | 12 |  | supported |
| `invert` | 2 | 2 |  | supported |
| `saturate` | 5 | 5 |  | supported |
| `sepia` | 2 | 2 |  | supported |
| `filter` | 2 | 2 |  | supported |
| `backdropBlur` | 9 | 8 |  | partly (the rest is deliberately absent): `backdrop-blur-0`: use `backdrop-blur-none` |
| `backdropBrightness` | 11 | 11 |  | supported |
| `backdropContrast` | 7 | 7 |  | supported |
| `backdropGrayscale` | 2 | 2 |  | supported |
| `backdropHueRotate` | 12 | 12 |  | supported |
| `backdropInvert` | 2 | 2 |  | supported |
| `backdropOpacity` | 21 | 15 |  | partly (the rest is deliberately absent): native takes the amounts 0 to 100; Tailwind names a few more steps that fall between them |
| `backdropSaturate` | 5 | 5 |  | supported |
| `backdropSepia` | 2 | 2 |  | supported |
| `backdropFilter` | 2 | 2 |  | supported |
| `transitionProperty` | 7 | 7 |  | supported |
| `transitionDelay` | 9 | 9 |  | supported |
| `transitionDuration` | 9 | 9 |  | supported |
| `transitionTimingFunction` | 4 | 4 |  | supported |
| `willChange` | 4 | 0 |  | deliberately absent: a performance hint with nothing to hint at |
| `contain` | 8 | 0 |  | deliberately absent: no layout containment hints |
| `content` | 1 | 0 |  | added by `utilities-text`: `content-[...]` needs `before:` and `after:` |
| `forcedColorAdjust` | 2 | 0 |  | deliberately absent: no forced-colors mode |

## Variants

| variant | status |
| --- | --- |
| `*` | deliberately absent: a child combinator for styles does not exist natively |
| `first-letter` | deliberately absent: no pseudo-elements |
| `first-line` | deliberately absent: no pseudo-elements |
| `marker` | deliberately absent: no pseudo-elements |
| `selection` | deliberately absent: no pseudo-elements; `selection-<colour>` sets the highlight colour as a utility |
| `file` | deliberately absent: no pseudo-elements |
| `placeholder` | deliberately absent: no pseudo-elements; `placeholder-<colour>` sets the colour as a utility |
| `backdrop` | deliberately absent: no pseudo-elements |
| `before` | deliberately absent: no pseudo-elements |
| `after` | deliberately absent: no pseudo-elements |
| `first` | deliberately absent: structural states: the mounted tree knows each node's place among its siblings, so these are possible, and no track owns them |
| `last` | deliberately absent: as `first` |
| `only` | deliberately absent: as `first` |
| `odd` | deliberately absent: as `first` |
| `even` | deliberately absent: as `first` |
| `first-of-type` | deliberately absent: there are no element types to count |
| `last-of-type` | deliberately absent: no element types |
| `only-of-type` | deliberately absent: no element types |
| `visited` | deliberately absent: no links |
| `target` | deliberately absent: no URL fragment |
| `open` | deliberately absent: no `open` attribute |
| `default` | deliberately absent: no form default |
| `checked` | deliberately absent: form states are the `aria-checked` prop; no condition reads it yet |
| `indeterminate` | deliberately absent: as `checked` |
| `placeholder-shown` | deliberately absent: no condition on a text input's emptiness |
| `autofill` | deliberately absent: no autofill |
| `optional` | deliberately absent: no form validity |
| `required` | deliberately absent: no form validity |
| `valid` | deliberately absent: no form validity |
| `invalid` | deliberately absent: no form validity |
| `in-range` | deliberately absent: no form validity |
| `out-of-range` | deliberately absent: no form validity |
| `read-only` | deliberately absent: no condition on `readOnly` |
| `empty` | deliberately absent: no condition on emptiness |
| `focus-within` | supported |
| `hover` | supported |
| `focus` | supported |
| `focus-visible` | supported |
| `active` | supported |
| `enabled` | deliberately absent: the inverse of `disabled`, which is a condition: possible, no track owns it |
| `disabled` | supported |
| `group-hover` | deliberately absent: ancestor state conditions (`group`, `peer`): hover, focus and press chains exist natively, so these are possible, and no track owns them |
| `group-focus` | deliberately absent: ancestor state conditions (`group`, `peer`): hover, focus and press chains exist natively, so these are possible, and no track owns them |
| `group-active` | deliberately absent: ancestor state conditions (`group`, `peer`): hover, focus and press chains exist natively, so these are possible, and no track owns them |
| `group-disabled` | deliberately absent: ancestor state conditions (`group`, `peer`): hover, focus and press chains exist natively, so these are possible, and no track owns them |
| `group-focus-within` | deliberately absent: ancestor state conditions (`group`, `peer`): hover, focus and press chains exist natively, so these are possible, and no track owns them |
| `group-focus-visible` | deliberately absent: ancestor state conditions (`group`, `peer`): hover, focus and press chains exist natively, so these are possible, and no track owns them |
| `group-first` | deliberately absent: ancestor state conditions (`group`, `peer`): hover, focus and press chains exist natively, so these are possible, and no track owns them |
| `group-odd` | deliberately absent: ancestor state conditions (`group`, `peer`): hover, focus and press chains exist natively, so these are possible, and no track owns them |
| `group-hover/name` | deliberately absent: ancestor state conditions (`group`, `peer`): hover, focus and press chains exist natively, so these are possible, and no track owns them |
| `peer-hover` | deliberately absent: sibling state conditions: possible, no track owns them |
| `peer-focus` | deliberately absent: sibling state conditions: possible, no track owns them |
| `peer-checked` | deliberately absent: sibling state conditions: possible, no track owns them |
| `peer-disabled` | deliberately absent: sibling state conditions: possible, no track owns them |
| `peer-focus-visible` | deliberately absent: sibling state conditions: possible, no track owns them |
| `peer-invalid` | deliberately absent: sibling state conditions: possible, no track owns them |
| `peer-hover/name` | deliberately absent: sibling state conditions: possible, no track owns them |
| `ltr` | deliberately absent: no text direction |
| `rtl` | deliberately absent: no text direction |
| `motion-safe` | deliberately absent: the reduced-motion setting is not read |
| `motion-reduce` | deliberately absent: the reduced-motion setting is not read |
| `dark` | deliberately absent: the colour scheme is not read |
| `print` | deliberately absent: no print media |
| `portrait` | deliberately absent: orientation could be read from the viewport; no track owns it |
| `landscape` | deliberately absent: as `portrait` |
| `contrast-more` | deliberately absent: no contrast preference |
| `contrast-less` | deliberately absent: no contrast preference |
| `forced-colors` | deliberately absent: no forced-colors mode |
| `sm` | supported |
| `md` | supported |
| `lg` | supported |
| `xl` | supported |
| `2xl` | supported |
| `max-sm` | deliberately absent: conditions are minimum widths only; `max-*` and `min-[..]` need a maximum width condition |
| `max-md` | deliberately absent: conditions are minimum widths only; `max-*` and `min-[..]` need a maximum width condition |
| `max-lg` | deliberately absent: conditions are minimum widths only; `max-*` and `min-[..]` need a maximum width condition |
| `max-xl` | deliberately absent: conditions are minimum widths only; `max-*` and `min-[..]` need a maximum width condition |
| `max-2xl` | deliberately absent: conditions are minimum widths only; `max-*` and `min-[..]` need a maximum width condition |
| `min-[900px]` | deliberately absent: arbitrary breakpoints: possible (a minimum width in a layer), no track owns it |
| `max-[900px]` | deliberately absent: conditions are minimum widths only; `max-*` and `min-[..]` need a maximum width condition |
| `min-[1200px]` | deliberately absent: arbitrary breakpoints: possible (a minimum width in a layer), no track owns it |
| `supports-[display:grid]` | deliberately absent: no feature queries |
| `has-[:checked]` | deliberately absent: no selectors |
| `group-has-[:checked]` | deliberately absent: no selectors |
| `peer-has-[:checked]` | deliberately absent: no selectors |
| `aria-checked` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `aria-disabled` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `aria-expanded` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `aria-hidden` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `aria-pressed` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `aria-readonly` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `aria-required` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `aria-selected` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `aria-[sort=ascending]` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `group-aria-expanded` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `peer-aria-checked` | deliberately absent: the aria props are on the element, but no condition reads them; no track owns it |
| `data-[state=open]` | deliberately absent: there are no data attributes |
| `data-[active]` | deliberately absent: there are no data attributes |
| `group-data-[state=open]` | deliberately absent: there are no data attributes |
| `peer-data-[state=open]` | deliberately absent: there are no data attributes |
| `[&:nth-child(3)]` | deliberately absent: no arbitrary selectors |
| `[&>*]` | deliberately absent: no arbitrary selectors |
| `[@media(min-width:900px)]` | deliberately absent: no arbitrary selectors |

## What is left, class by class

The first few classes of each plugin that still do not compile (the plugin's full list is `--missing --plugin=<name>`):

* `visibility` (1 of 3): `collapse`
* `position` (1 of 5): `sticky`
* `isolation` (2 of 2): `isolate` `isolation-auto`
* `float` (5 of 5): `float-start` `float-end` `float-right` `float-left` `float-none`
* `clear` (6 of 6): `clear-start` `clear-end` `clear-left` `clear-right` `clear-both` `clear-none`
* `display` (16 of 21): `inline-block` `inline` `inline-flex` `table` `inline-table` `table-caption` `table-cell` `table-column` ...
* `maxHeight` (3 of 44): `max-h-min` `max-h-max` `max-h-fit`
* `minHeight` (3 of 43): `min-h-min` `min-h-max` `min-h-fit`
* `minWidth` (3 of 39): `min-w-min` `min-w-max` `min-w-fit`
* `maxWidth` (4 of 57): `max-w-min` `max-w-max` `max-w-fit` `max-w-prose`
* `flexShrink` (2 of 4): `flex-shrink-0` `flex-shrink`
* `flexGrow` (2 of 4): `flex-grow-0` `flex-grow`
* `tableLayout` (2 of 2): `table-auto` `table-fixed`
* `captionSide` (2 of 2): `caption-top` `caption-bottom`
* `borderCollapse` (2 of 2): `border-collapse` `border-separate`
* `borderSpacing` (105 of 105): `border-spacing-0` `border-spacing-1` `border-spacing-2` `border-spacing-3` `border-spacing-4` `border-spacing-5` `border-spacing-6` `border-spacing-7` ...
* `animation` (5 of 5): `animate-none` `animate-spin` `animate-ping` `animate-pulse` `animate-bounce`
* `cursor` (21 of 36): `cursor-auto` `cursor-none` `cursor-context-menu` `cursor-cell` `cursor-vertical-text` `cursor-alias` `cursor-copy` `cursor-no-drop` ...
* `touchAction` (6 of 10): `touch-pan-left` `touch-pan-right` `touch-pan-up` `touch-pan-down` `touch-pinch-zoom` `touch-manipulation`
* `userSelect` (2 of 4): `select-all` `select-auto`
* `resize` (4 of 4): `resize-none` `resize-y` `resize-x` `resize`
* `scrollSnapType` (6 of 6): `snap-none` `snap-x` `snap-y` `snap-both` `snap-mandatory` `snap-proximity`
* `scrollSnapAlign` (4 of 4): `snap-start` `snap-end` `snap-center` `snap-align-none`
* `scrollSnapStop` (2 of 2): `snap-normal` `snap-always`
* `scrollMargin` (630 of 630): `scroll-m-0` `-scroll-m-0` `scroll-m-1` `-scroll-m-1` `scroll-m-2` `-scroll-m-2` `scroll-m-3` `-scroll-m-3` ...
* `scrollPadding` (315 of 315): `scroll-p-0` `scroll-p-1` `scroll-p-2` `scroll-p-3` `scroll-p-4` `scroll-p-5` `scroll-p-6` `scroll-p-7` ...
* `listStylePosition` (2 of 2): `list-inside` `list-outside`
* `listStyleType` (3 of 3): `list-none` `list-disc` `list-decimal`
* `listStyleImage` (1 of 1): `list-image-none`
* `appearance` (2 of 2): `appearance-none` `appearance-auto`
* `columns` (26 of 26): `columns-1` `columns-2` `columns-3` `columns-4` `columns-5` `columns-6` `columns-7` `columns-8` ...
* `breakBefore` (8 of 8): `break-before-auto` `break-before-avoid` `break-before-all` `break-before-avoid-page` `break-before-page` `break-before-left` `break-before-right` `break-before-column`
* `breakInside` (4 of 4): `break-inside-auto` `break-inside-avoid` `break-inside-avoid-page` `break-inside-avoid-column`
* `breakAfter` (8 of 8): `break-after-auto` `break-after-avoid` `break-after-all` `break-after-avoid-page` `break-after-page` `break-after-left` `break-after-right` `break-after-column`
* `gridTemplateColumns` (1 of 14): `grid-cols-subgrid`
* `gridTemplateRows` (1 of 14): `grid-rows-subgrid`
* `placeContent` (1 of 8): `place-content-baseline`
* `alignContent` (1 of 9): `content-baseline`
* `space` (142 of 142): `space-x-0` `-space-x-0` `space-x-1` `-space-x-1` `space-x-2` `-space-x-2` `space-x-3` `-space-x-3` ...
* `divideWidth` (12 of 12): `divide-x-0` `divide-x-2` `divide-x-4` `divide-x-8` `divide-x` `divide-y-0` `divide-y-2` `divide-y-4` ...
* `divideStyle` (5 of 5): `divide-solid` `divide-dashed` `divide-dotted` `divide-double` `divide-none`
* `divideColor` (247 of 247): `divide-inherit` `divide-current` `divide-transparent` `divide-black` `divide-white` `divide-slate-50` `divide-slate-100` `divide-slate-200` ...
* `divideOpacity` (21 of 21): `divide-opacity-0` `divide-opacity-5` `divide-opacity-10` `divide-opacity-15` `divide-opacity-20` `divide-opacity-25` `divide-opacity-30` `divide-opacity-35` ...
* `overscrollBehavior` (7 of 9): `overscroll-none` `overscroll-y-auto` `overscroll-y-contain` `overscroll-y-none` `overscroll-x-auto` `overscroll-x-contain` `overscroll-x-none`
* `scrollBehavior` (2 of 2): `scroll-auto` `scroll-smooth`
* `textOverflow` (1 of 4): `overflow-ellipsis`
* `hyphens` (3 of 3): `hyphens-none` `hyphens-manual` `hyphens-auto`
* `textWrap` (4 of 4): `text-wrap` `text-nowrap` `text-balance` `text-pretty`
* `borderRadius` (54 of 135): `rounded-s-none` `rounded-s-sm` `rounded-s` `rounded-s-md` `rounded-s-lg` `rounded-s-xl` `rounded-s-2xl` `rounded-s-3xl` ...
* `borderWidth` (10 of 45): `border-s-0` `border-s-2` `border-s-4` `border-s-8` `border-s` `border-e-0` `border-e-2` `border-e-4` ...
* `borderStyle` (4 of 6): `border-dashed` `border-dotted` `border-double` `border-hidden`
* `borderColor` (508 of 2223): `border-inherit` `border-current` `border-x-inherit` `border-x-current` `border-y-inherit` `border-y-current` `border-s-inherit` `border-s-current` ...
* `borderOpacity` (21 of 21): `border-opacity-0` `border-opacity-5` `border-opacity-10` `border-opacity-15` `border-opacity-20` `border-opacity-25` `border-opacity-30` `border-opacity-35` ...
* `backgroundColor` (2 of 247): `bg-inherit` `bg-current`
* `backgroundOpacity` (21 of 21): `bg-opacity-0` `bg-opacity-5` `bg-opacity-10` `bg-opacity-15` `bg-opacity-20` `bg-opacity-25` `bg-opacity-30` `bg-opacity-35` ...
* `gradientColorStops` (6 of 804): `from-inherit` `from-current` `via-inherit` `via-current` `to-inherit` `to-current`
* `boxDecorationBreak` (4 of 4): `decoration-slice` `decoration-clone` `box-decoration-slice` `box-decoration-clone`
* `backgroundSize` (3 of 3): `bg-auto` `bg-cover` `bg-contain`
* `backgroundAttachment` (3 of 3): `bg-fixed` `bg-local` `bg-scroll`
* `backgroundClip` (4 of 4): `bg-clip-border` `bg-clip-padding` `bg-clip-content` `bg-clip-text`
* `backgroundPosition` (9 of 9): `bg-bottom` `bg-center` `bg-left` `bg-left-bottom` `bg-left-top` `bg-right` `bg-right-bottom` `bg-right-top` ...
* `backgroundRepeat` (6 of 6): `bg-repeat` `bg-no-repeat` `bg-repeat-x` `bg-repeat-y` `bg-repeat-round` `bg-repeat-space`
* `backgroundOrigin` (3 of 3): `bg-origin-border` `bg-origin-padding` `bg-origin-content`
* `fill` (248 of 248): `fill-none` `fill-inherit` `fill-current` `fill-transparent` `fill-black` `fill-white` `fill-slate-50` `fill-slate-100` ...
* `stroke` (248 of 248): `stroke-none` `stroke-inherit` `stroke-current` `stroke-transparent` `stroke-black` `stroke-white` `stroke-slate-50` `stroke-slate-100` ...
* `strokeWidth` (3 of 3): `stroke-0` `stroke-1` `stroke-2`
* `objectFit` (5 of 5): `object-contain` `object-cover` `object-fill` `object-none` `object-scale-down`
* `objectPosition` (9 of 9): `object-bottom` `object-center` `object-left` `object-left-bottom` `object-left-top` `object-right` `object-right-bottom` `object-right-top` ...
* `textIndent` (70 of 70): `indent-0` `-indent-0` `indent-1` `-indent-1` `indent-2` `-indent-2` `indent-3` `-indent-3` ...
* `verticalAlign` (8 of 8): `align-baseline` `align-top` `align-middle` `align-bottom` `align-text-top` `align-text-bottom` `align-sub` `align-super`
* `letterSpacing` (6 of 12): `-tracking-tighter` `-tracking-tight` `-tracking-normal` `-tracking-wide` `-tracking-wider` `-tracking-widest`
* `textColor` (2 of 247): `text-inherit` `text-current`
* `textOpacity` (21 of 21): `text-opacity-0` `text-opacity-5` `text-opacity-10` `text-opacity-15` `text-opacity-20` `text-opacity-25` `text-opacity-30` `text-opacity-35` ...
* `textDecorationColor` (2 of 247): `decoration-inherit` `decoration-current`
* `fontSmoothing` (1 of 2): `subpixel-antialiased`
* `placeholderColor` (2 of 247): `placeholder-inherit` `placeholder-current`
* `placeholderOpacity` (21 of 21): `placeholder-opacity-0` `placeholder-opacity-5` `placeholder-opacity-10` `placeholder-opacity-15` `placeholder-opacity-20` `placeholder-opacity-25` `placeholder-opacity-30` `placeholder-opacity-35` ...
* `caretColor` (2 of 247): `caret-inherit` `caret-current`
* `accentColor` (248 of 248): `accent-inherit` `accent-current` `accent-transparent` `accent-black` `accent-white` `accent-slate-50` `accent-slate-100` `accent-slate-200` ...
* `backgroundBlendMode` (16 of 16): `bg-blend-normal` `bg-blend-multiply` `bg-blend-screen` `bg-blend-overlay` `bg-blend-darken` `bg-blend-lighten` `bg-blend-color-dodge` `bg-blend-color-burn` ...
* `mixBlendMode` (18 of 18): `mix-blend-normal` `mix-blend-multiply` `mix-blend-screen` `mix-blend-overlay` `mix-blend-darken` `mix-blend-lighten` `mix-blend-color-dodge` `mix-blend-color-burn` ...
* `boxShadowColor` (2 of 247): `shadow-inherit` `shadow-current`
* `outlineStyle` (3 of 5): `outline-dashed` `outline-dotted` `outline-double`
* `outlineColor` (2 of 247): `outline-inherit` `outline-current`
* `ringColor` (2 of 247): `ring-inherit` `ring-current`
* `ringOpacity` (21 of 21): `ring-opacity-0` `ring-opacity-5` `ring-opacity-10` `ring-opacity-15` `ring-opacity-20` `ring-opacity-25` `ring-opacity-30` `ring-opacity-35` ...
* `ringOffsetColor` (2 of 247): `ring-offset-inherit` `ring-offset-current`
* `blur` (1 of 9): `blur-0`
* `backdropBlur` (1 of 9): `backdrop-blur-0`
* `backdropOpacity` (6 of 21): `backdrop-opacity-15` `backdrop-opacity-35` `backdrop-opacity-45` `backdrop-opacity-55` `backdrop-opacity-65` `backdrop-opacity-85`
* `willChange` (4 of 4): `will-change-auto` `will-change-scroll` `will-change-contents` `will-change-transform`
* `contain` (8 of 8): `contain-none` `contain-content` `contain-strict` `contain-size` `contain-inline-size` `contain-layout` `contain-paint` `contain-style`
* `content` (1 of 1): `content-none`
* `forcedColorAdjust` (2 of 2): `forced-color-adjust-auto` `forced-color-adjust-none`
