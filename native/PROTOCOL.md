# Native API v2: the Fabric-style commit protocol

`ReactUiRoot` is a Godot `Control`; GodotJS imports it from `godot` and calls its `#[func]`s under camelCase names
(`take_commit_deletions` is `takeCommitDeletions`; gdext exposes the Rust names as written, and `#[func]`/`#[signal]` take no
arguments here). The renderer (`src/renderer.ts`, typed in `src/native.ts`) calls:

- `commit`, `takeCommitDeletions` ("Commit");
- `drainEvents`, `resolveEvent` and the `eventsReady` signal ("Input events");
- `getSnapshot`, `getNodeRect`, `findByTestId`, `getScrollState`, `getSelection`, `getTextInputState` ("Queries");
- `getCaretRect`, `getOffsetAtPoint`, `getRangeRects` ("Rich text"; the `UIHandle` methods of the same names), `getTextLines` ("Queries");
- `registerFontFace` ("Text styles and fonts");
- `setPointerCapture`, `releasePointerCapture`, `hasPointerCapture` ("Pointer model");
- `focusNode`, `blurNode` ("Focus and keyboard");
- `scrollTo`, `scrollBy`, `scrollIntoView` ("Scrolling");
- `clearSelection` ("Text selection");
- `setTextAndSelection`, `setTextSelection` ("Text input");
- the `Control`'s own `size` property, which the owner sets and `useRootSize` reads.

`getActivity`, `setProfiling` and `takeProfile` are diagnostics for verifiers and benchmarks ("Native CSS motion and clipping").
The remaining `#[func]`s are hooks for the platform and the verifiers ("Platform and verifier hooks"). All methods run on the
Godot main thread. Commits and queries never call back into JS; the only native-to-JS call is the `eventsReady` emission
described under "Input events".

The architecture is React Native Fabric's. React runs
in persistent mode: the shadow tree is a tree of immutable JS instances that share unchanged
children, and render makes no native call. At commit, the JS commit walk (`src/commit.ts`) finds the
changed nodes by instance identity and sends **one `commit` call per layer** carrying only the
created nodes, the prop diffs and the changed child lists. Native validates the whole payload before
it changes anything, diffs each changed child list against the mounted children, mounts the
transaction, resolves styles, lays out, updates geometry and re-records only what changed.

## Commit

`commit(layer: int, payload_json: String) -> String`. An empty return is success; anything else is
the reason nothing changed (a rejected commit leaves the previous tree mounted). `layer` is `0` (the
main tree) or `1` (the overlay tree `<Portal>` renders into, drawn above layer 0 and hit-tested
first). A tag belongs to the layer that created it; tags are unsigned 32-bit integers allocated by
JS, unique for the root's lifetime and never reused.

```json
{
  "created":  [{"tag": 1, "kind": "view", "props": {"style": {"layers": [{"style": {"paddingTop": 4}}]}}},
               {"tag": 2, "kind": "text", "props": {"text": "Hello"}}],
  "updated":  [{"tag": 3, "props": {"disabled": true, "testID": null}}],
  "children": [{"tag": 0, "children": [1]}, {"tag": 1, "children": [2]}]
}
```

- `created`: nodes new to this root with their full props. `kind` is `view`, `text`, `button`, `textinput` or `image`.
  `Text` carries its string in the `text` prop and has no children; a `Button` renders its label
  through a child `Text`; a `TextInput` has neither (its text is in a native edit buffer, "Text input").
- `updated`: mounted nodes with a props diff. An absent key is unchanged and JSON `null` resets the
  key to its default.
- `children`: every node whose child list changed, and every created node that has children; tag `0`
  is the layer's own list of top-level nodes.
- Everything is parsed with `deny_unknown_fields`: an unknown key anywhere is an error. Every payload key may be absent
  (an absent list is empty).

Validation (`native/commit.rs`) happens before any change: created tags are nonzero, never used
before and unique; updated tags are mounted in this layer (or created by this payload) and appear
once; child lists name mounted-or-created nodes of this layer, each at most once, and only `view` and
`button` nodes have children; every node ends with at most one parent and none is its own ancestor;
every created node ends up attached; a list for a node the same payload detaches is rejected; merged
props are valid for the node's kind. A style the motion engine cannot animate (below) is also a
rejection. After validation the plan (`MountingTransaction`) applies in the order Remove, Delete,
Create, Update, Insert; a removed node that is not inserted elsewhere in the payload is deleted
together with its mounted descendants, and a node moved to another parent is not.

The returned reason is the first violation, for example `Invalid commit JSON: …`, `layer N is negative`, `layer N does not
exist; layers are 0..2`, `tag 0 is the layer root and cannot be created`, `tag N has already been used`, `node N is updated
more than once`, `node N is not mounted in layer L`, `node N is listed under two parents`, `node N would become its own
ancestor`, or a prop error (`tabIndex must be 0 or -1, not N`, `rows is only valid with multiline`, `multiline cannot change
after a text input is created`, `ariaValueMin (…) must not be greater than ariaValueMax (…)`, `text is only valid on text
nodes`).

`take_commit_deletions() -> PackedInt64Array` returns the tags the last successful `commit` deleted,
so JS drops its instances and public handles.

## Props and styles

| Prop | Type |
| --- | --- |
| `style` | `{layers: [{minWidth?: number, states?: [...], style: {...}}]}` |
| `text` | string (`text` nodes only) |
| `spans` | array of `{start, end, style?, inlay?, children?}` (`text` nodes only; "Rich text") |
| `disabled` | boolean |
| `hidden` | boolean (Suspense: the node and its subtree take no space) |
| `testID` | string |
| `tabIndex` | `0` or `-1` (any node kind) |
| `autoFocus` | boolean |
| `draggable` | boolean (any node kind) |
| `dragPreview` | `native` or `none` (what follows the pointer while the element is dragged; `native` when absent) |
| `defaultValue`, `placeholder` | string (`textinput` only; `defaultValue` is the starting text, later changes are ignored) |
| `multiline`, `readOnly`, `secure`, `selectOnFocus` | boolean (`textinput` only; `multiline` cannot change after creation) |
| `rows`, `maxLength` | positive / nonnegative integer (`textinput` only; `rows` needs `multiline`; `maxLength` in UTF-16 units) |
| `keyboardType` | `default|multiline|number|decimal|phone|email|url|password` (`textinput` only; one to one with `DisplayServer.VirtualKeyboardType`) |
| `role` | `button checkbox switch radio radiogroup group slider progressbar textbox text link list listitem listbox option combobox menu menuitem menuitemcheckbox menuitemradio tablist tab tabpanel dialog img region tooltip none presentation` ("Accessibility") |
| `ariaLabel`, `ariaDescription`, `ariaValueText`, `ariaPlaceholder` | string |
| `ariaHidden`, `ariaDisabled`, `ariaReadOnly`, `ariaRequired`, `ariaModal` | boolean (JS sends them only when true) |
| `ariaExpanded`, `ariaSelected` | boolean (`false` is sent) |
| `ariaChecked` | `true`, `false` or `"mixed"` |
| `ariaValueMin`, `ariaValueMax`, `ariaValueNow` | finite numbers; min may not exceed max |
| `ariaLive` | `off|polite|assertive`; `ariaOrientation`: `horizontal|vertical` |
| `ariaActiveDescendant`, `ariaControls` | the tag of an element: a nonzero integer, which JS sends as the `id` of a handle (native has no DOM ids); a tag that is not in the accessibility tree is logged as an error |

The JSX names are `aria-label` and so on and `selectTextOnFocus`; the wire names above are camelCase and `selectOnFocus`
(`src/props.ts`).

JS compiles `className` and `style` once per distinct input into ordered **layers** (`src/styles.ts`;
shorthands `padding`, `margin`, `gap`, `overflow` and `inset` are expanded to longhands there). Native resolves
a node's **computed style**: its parent's inherited properties (`color`, `fontSize`, `textAlign`,
`interpolateSize`, `pointerEvents`, `cursor`, `scrollbarColor`, `userSelect`, `selectionColor`, `caretColor`, `placeholderColor`, `visibility`, and the text longhands of "Text styles and fonts"), then every layer whose conditions hold, in order. A layer applies when the root's
logical width is at least its `minWidth` and every listed state holds: `hover` and `active` apply to the
target and its ancestors; `focus` and `focusVisible` to the focused element only; `focusWithin` to it
and its ancestors; `disabled` to a node whose own `disabled` prop is true; `starting` (CSS `@starting-style`) to the style a node starts from, resolved
besides its resting style only when the node is first mounted or is shown from `display: none` and some layer uses the state, so the node transitions from it (`StyleChange::starting`). Hover, press, focus and
breakpoint changes restyle only the nodes whose style uses the state or threshold that changed, with no
JS and no React work. A mouse press stays `active` only while the pointer is inside it; a key press
until the key is released.

Style longhands (camelCase): width/height/minWidth/minHeight/maxWidth/maxHeight/flexBasis accept
nonnegative numbers, `"auto"`, or percentage strings; display `flex|grid|block|flow-root|none` (`block` and `flow-root` are Taffy block layout: children stack and vertical margins collapse; there is no inline layout); flexDirection
`row|column|row-reverse|column-reverse`; flexWrap `nowrap|wrap|wrap-reverse`; flexGrow/flexShrink
nonnegative numbers; rowGap/columnGap, paddingTop/Right/Bottom/Left (nonnegative) and
marginTop/Right/Bottom/Left (finite) numeric pixels; alignItems/alignSelf
`start|end|center|stretch|baseline|flex-start|flex-end`; justifyContent
`start|end|center|space-between|space-around|space-evenly|flex-start|flex-end`; gridTemplateColumns and gridTemplateRows a
positive integer (equal fractional columns or rows) or a list of tracks (sizes, `minmax`, `fitContent`, `repeat` with a count, `auto-fill` or `auto-fit`); backgroundColor/color/borderColor
`#RGB|#RGBA|#RRGGBB|#RRGGBBAA`; fontSize a positive integer; borderRadius/borderWidth nonnegative
pixels; opacity 0..1; textAlign `left|center|right|justify|start|end`; overscrollBehavior `auto|contain`, scrollbarWidth `auto|none`,
scrollbarColor (a hex colour, inherited) and touchAction `auto|none|pan-x|pan-y` (see "Scrolling" below); pointerEvents `auto|none` and cursor
`default|pointer|text|move|grab|grabbing|not-allowed|crosshair|wait|progress|help|ew-resize|ns-resize|nesw-resize|nwse-resize`
(both inherited; see "Godot co-operation" below); userSelect `none|text` and selectionColor (a hex colour), both inherited (see "Text selection" below); transition and interpolateSize as described below; overflowX/overflowY
`visible|hidden|scroll|auto` ("Scrolling" below); `filter` and `backdropFilter` ("Filters and frosted glass" below). `position` is `static|relative|absolute|fixed` (not inherited; `sticky` is
rejected), `top`/`right`/`bottom`/`left` are finite numbers (negative allowed), percentage strings (negative
allowed) or `"auto"`, and `zIndex` is a 32-bit integer; see "Positioning and stacking" below. The longhands the utility tracks added are listed
below and in "Text styles and fonts", "Paint beyond the fill" and "Transforms". Unsupported properties fail explicitly. Default is a flex column,
transparent background, white 16px text, no spacing, normal flex shrinking. Text is shaped and wrapped
with Godot `TextParagraph`; there is no JS text measurement callback.

A node's `kind` is `view`, `text`, `button` or `textinput`. A `textinput` has no children and no `text`: its text lives in
a native edit buffer ("Text input" below). `caretColor` and `placeholderColor` are hex colours (inherited): the caret is drawn
in the text colour and the placeholder in the text colour at half alpha when they are not set.

**Layout longhands added with the utility classes** (`src/utilities/layout.ts`; value types in `src/types.ts`). `width`, `height` and `flexBasis` also
take `min-content`, `max-content` and `fit-content` (Taffy's minimum and maximum sizes take none), and every size takes `vw` and `vh` percentages, which native resolves to pixels
in the computed style against the root's size (`StyleSpec::resolve_viewport_units`; nodes that use them are indexed beside the breakpoint index and restyled when the viewport changes,
and layout refuses an unresolved one). Margins take `auto`, negative values and percentages. `alignContent` and `justifyContent` take `stretch` and `normal` as well, and `justifyContent` defaults to `normal`
(Taffy treats it as `flex-start` for flex, and a grid's `auto` tracks stretch as in CSS); `justifyItems`, `justifySelf`, `order` (it reorders the Taffy children, in `ReactUiRoot::apply_layout_order`;
painting and hit testing keep document order), `aspectRatio` (a number or `auto`), `boxSizing`, and `visibility` (`visible|hidden`, inherited: the element paints nothing of its own, is not a
pointer target, cannot be focused, is left out of the accessibility tree and out of selection, keeps its layout, and a child can be `visible`). The grid: `gridTemplateColumns|Rows`,
`gridAutoFlow`, `gridAutoColumns|Rows`, `gridColumnStart|End|Span` and `gridRowStart|End|Span` (`native/grid_style.rs`); a line beats a span, in either class order.

## Mounted tree, geometry, paint

The mounting layer (`native/mount.rs`) owns one record per tag: props, computed style, Taffy node,
Godot paint resources, canvas items and geometry. Layout runs on Taffy's retained tree and Taffy
caches clean subtrees. After layout, only the children of an ancestor of a changed node (or of a node
whose size changed) are compared with the stored geometry; a changed location moves one canvas item.

Each element owns two retained canvas items mirroring the view hierarchy (`native/render_tree.rs`): a
**box** item (transform = location in its parent, modulate alpha = opacity, draws background and border)
with a **content** item below it (clips to the padding box when `overflow` is not `visible`, draws text, and
parents the child boxes). A scroll container has two more items: a **scroll** item under the content item
(transform = minus the scroll offset; the child boxes parent to it instead) and an **overlay** item under the box
item, drawn after the content, for the scrollbar thumbs. Sibling order is the child-list order. Layer 0 and layer 1 each have a root
item; the focus ring is a top-most item above both, and the drag ghost one above that. A text input has two more items
under its scroll item: **text** (selection, text, the preedit's underline) and **caret**. An element with a filter has more
(see "Filters and frosted glass"). Only an element whose own visuals or size changed re-records; an idle frame records nothing.

**Display scale.** Text, text inputs, rounded boxes and scroll containers record at the font oversampling of the viewport the
root is in (`Viewport.get_oversampling()`, which is what Godot's own controls draw at; a window carries its content scale, a
`SubViewport` has its own). It is read once per paint pass and on `NOTIFICATION_DRAW` (which the engine sends every canvas item
when a viewport's oversampling changes) and on entering the tree, so a change of scale repaints those elements with no commit,
and an idle frame still records nothing. Rounded `StyleBoxFlat` draws use a one-device-pixel feather. The snapshot's
`oversampling` is the scale the root last drew at.

Native hit testing descends the **paint tree** in reverse paint order, the overlay layer first, takes the point through the inverse of an element's transform before it tests the clip and the
children ("Transforms"), and hands a
point to a clipping element's paint children only inside its padding box, plus the scroll offset for a scroll container
(and a scrollbar thumb of a container is hit before the content it covers). An element whose computed `pointerEvents` is `none` is never
the hit, but its children are still tested (CSS semantics). The root clips drawing and input to its own
rectangle. Enabled buttons, text inputs and `tabIndex` elements participate in Tab/Shift-Tab focus (document order); Enter and
Space activate enabled buttons only.

## Images

`register_texture(id: String, texture: Texture2D) -> String` and `register_material(id: String, material: Material) -> String`
register, per root, what an `image` node's `source` and `material` name; an empty return is success (an empty id is refused). A
second registration of an id replaces the first. `unregister_texture(id) -> bool` and `unregister_material(id) -> bool` forget one
and say whether it was there. Registering or forgetting an id lays out and draws again the images that name it, so a picture
fetched after its UI mounted appears without a commit (`ReactUiRoot::refresh_image_users`).

An `image` node has no children and these props (`native/image.rs`, validated in `PropsSpec::validate_image`; every one is rejected
on another kind with `<prop> is only valid on images`):

| Prop | Type |
| --- | --- |
| `source` | a texture id; until it is registered the image draws nothing and has no intrinsic size |
| `fit` | `fill` (default) `contain` `cover` `none` `scale-down`, as CSS `object-fit`, or `tile` (the whole texture repeated at its size from the content box's top left) |
| `slice` | `{top, right, bottom, left, fill?}`: a nine-slice in the picture's pixels drawn over the whole content box (`canvas_item_add_nine_patch`); only with `fit: fill`, no flips |
| `sourceRect` | `{x, y, width, height}`: the region of the texture shown (an atlas region); not with `fit: tile` |
| `tintColor` | hex colour the picture is multiplied by |
| `material` | a material id; its shader sees the picture as `TEXTURE`. An unregistered id draws without one |
| `flipX`, `flipY` | booleans; not with `slice` or `fit: tile` |

Layout treats an image as a replaced element: its leaf's intrinsic size is the region's (`TextContext::Intrinsic`), and unless the
author set an `aspect-ratio` the region's proportions are the Taffy `aspect_ratio` (`image::with_intrinsic_aspect`, applied where
the authored and presented layout styles are made), so a width alone gives the height. Paint draws the picture in an **image** item
under the box item, after the background and border and before the outline; the material is set on that item only. `fit` is
resolved analytically (`image::place`): what falls outside the content box is cut from the source rectangle, so the item needs no
clip of its own. The paint ancestors' clips apply to it as to any child. Not built: `object-position`, per-image texture filtering
or repeat modes beyond `tile`, nine-slice tiling, and an `image` kind in the transition probe tree (an `auto` size transition of an
image's ancestor measures the image as empty).

## Positioning and stacking

`position`, the four insets and `zIndex` are layout and paint properties. Layout is Taffy's: an `absolute` element is
placed by its insets in its **containing block**, the padding box of its nearest `relative`, `absolute` or `fixed`
ancestor, else the layer's root (the root's size is the window's); `fixed` is placed in the layer's root whatever its
ancestors are. At the pinned Taffy revision `Layout.location` of such an element is relative to its containing block's
border box, not to its parent (`props::tests::an_absolute_grandchild_is_located_in_its_containing_block_not_its_parent`).

What is drawn and hit follows the **paint tree**, which differs from the React tree (events, inheritance, Tab order,
layout) only for out-of-flow elements (`native/stacking.rs`): an element's **paint parent** is its parent, except that an
`absolute` element's is its containing block and a `fixed` element's is the layer's root. An element's geometry
(`location`) is in its paint parent's frame, its canvas items hang under its paint parent's content item, and the
clips and scroll offsets that apply to it are its paint ancestors', so an `absolute` element whose containing block
is outside an `overflow: hidden` parent is not clipped by that parent, and one inside a `relative` hidden parent is.
Siblings of one paint parent (the elements it paints: its children, and the out-of-flow descendants it is the
containing block of) are painted in ascending (`zIndex`, document order), where `zIndex` defaults to 0 and applies to
every element, as in React Native (no stacking contexts). The overlay layer (layer 1) is drawn above and hit-tested
before layer 0 whatever the `zIndex`es. Tab order and `documentIndex` are document order, main layer first.

The mounted tree keeps each element's `paint_parent` and `paint_children` and a set of the out-of-flow elements. After
a commit that changes a child list, or a style change that changes a `position` or `zIndex`, the paint parents of those
elements and of every out-of-flow element are re-examined and the affected paint lists are rebuilt, before geometry
(`Mounted::settle_paint_structure`); geometry compares every out-of-flow element on every pass, because a change
anywhere between it and its containing block moves it with no layout flag on the way. These two loops run over the
out-of-flow elements only (invariant 6, named exception). A childless element is laid out by Taffy as a
leaf, which does not replace the list of out-of-flow boxes it was the containing block of; `layout::compute_tree` gives
leaf output the positioning area of an empty container so that the list is replaced when its last child goes.

A **transformed** element is the containing block of its `absolute` and `fixed` descendants, as in CSS. `StyleSpec::taffy_style` gives a static transformed element `Position::Relative` (Taffy's
containing block for absolute boxes; its insets are not applied) and a `fixed` element below a transform `Position::Absolute` (Taffy's `fixed` is always the root); `InheritedStyle::inside_transform`
carries that down and `stacking::paint_parent` makes the same two choices, so the frames agree. Unlike CSS, a `relative` element between the transform and a `fixed` descendant is that descendant's
containing block here. A transform creates no stacking context (`zIndex` has none), and scrollable overflow ignores transforms.

## Text styles and fonts

The text longhands (`src/utilities/text.ts`, `native/text_style/`): `fontFamily` (a registered family, or a comma separated list of them: the first registered
one is used), `fontWeight` (a number), `fontStyle`, `lineHeight` (a factor, or a length), `letterSpacing` (px, or `em` of the element's font size), `textTransform`,
`textDecorationLine|Color|Style|Thickness`, `textUnderlineOffset`, `textOverflow`, `whiteSpace`, `wordBreak`, `overflowWrap`, `lineClamp`, `numericFigure|Spacing|Fraction`, `ordinal` and
`slashedZero`. All inherit except `textOverflow` and `lineClamp`; a decoration propagates instead, to the in-flow text below (not to an `absolute` or `fixed` descendant) in the colour and
thickness set where it was declared, and cannot be taken away there. An `em` length becomes px where it is set; a unitless line height stays a factor that each element multiplies by its own size.
Unset `whiteSpace` behaves as `pre-wrap`, so no existing text changed. The text a node shows is its source text after `textTransform` and white-space collapsing, and offsets JS sees count it.

`register_font_face(family: String, weight_min: int, weight_max: int, italic: bool, font: Font) -> String` registers `font` as a face of `family` for this root (per root, like a Godot `Theme`;
nothing is process-global). A static face has `weight_min == weight_max`; a variable font gives the range of its `wght` axis. An empty return is success; anything else says why nothing changed (an empty
family name, weights that are not a range of CSS weights, a font with no data). A later registration of the same family, weight range and style replaces the earlier. Text that names the family is shaped with the face CSS font matching picks (style first, then weight; `text_style/face.rs`), a bold or italic the
family lacks is made up as a browser does, and text that names no registered family keeps the theme font, so a tree that registers nothing costs nothing. Registering a face shapes the text that
names a family again. `src/fonts.ts` wraps it as `registerFontFace(root, {family, weight, style, font})`.

`StyledParagraph` (`native/text_paragraph.rs`) is the one place that reads or draws a node's text. It configures a `TextParagraph` from the style (letter spacing is the text server's own fractional
advance, `embolden * size / 64` px added to each shaped glyph, so wrapping, widths, carets and selection are the real geometry), and draws a paragraph line by line, each baseline on a device pixel,
when it is tracked, decorated, fractionally spaced or centred, or when the display ratio is not a whole number; anything else is `TextParagraph::draw`.

## Paint beyond the fill

`boxShadow` is CSS text (a list of `[inset] x y [blur [spread]] colour`, or `none`) with `boxShadowParts`, the variables Tailwind composes (`--tw-ring-offset-shadow`, `--tw-ring-shadow`,
`--tw-shadow`), merged per variable across layers as `filterParts` is, so `shadow-sm ring-1 focus:ring-2` keeps the shadow; an explicit `boxShadow` replaces the parts, and a utility set after
it takes the composed value back. `backgroundImage` is `none` or `linear-gradient(...)` over `backgroundColor`, with `gradientParts` (`--tw-gradient-from|via|to` and their positions), merged the
same way. `borderStyle` and `outlineStyle` are `none|solid` (dashed, dotted and double are rejected), the border has sides and corners (`border{Top,Right,Bottom,Left}{Width,Color}`,
`border{TopLeft,TopRight,BottomRight,BottomLeft}Radius`; a side beats the shorthand in the same layer and a shorthand in a later layer resets the sides, following the class order), and
`outline{Style,Width,Color,Offset}` draws outside the border box (setting any of them takes the native focus ring from the element). Widths, radii and outline widths are whole logical pixels in paint;
layout takes the float. `boxShadow` is a transition property, interpolated by Stylo (a shorter list is padded with transparent shadows). Native paint: `paint_style.rs` says what a computed style
asks, `box_paint.rs` what a box item records and its key; a plain box with a uniform border is one `StyleBoxFlat`, and anything else is drawn in layers (fill, gradient, inset shadows, border) from
baked coverage masks (`shadow_mask.rs`, shared between boxes with the same layer and leased from a cache) and exact meshes (`box_mesh.rs`, `gradient.rs`). A box item's custom rect is its
border box plus the reach of its outer shadows, so the engine culls it correctly; `get_activity().paintTextures` counts the baked textures held.

## Transforms

`transform` (CSS text, or `none`), `transformOrigin` (CSS text) and `transformParts` (`translateX|Y`, `rotate`, `skewX|Y`, `scaleX|Y`, `gpu`: what Tailwind's separate utilities set, merged per
field across layers). A value is parsed by Stylo in a throwaway document (`native/transform.rs`), so units, `calc()` and every syntax rule are Stylo's, and a refused value is a rejected commit with a
specific message: `perspective()` and a projective `matrix3d()` say "perspective is not implemented yet", and `em`, `ex`, `ch`, `lh` and the viewport units are refused because they would resolve
against the scratch element (`rem` is 16 px). An element's matrix is `translate(-origin) * list * translate(origin)` for its border box, a 4 x 4 in `f64` flattened per element to the canvas
affine (`Placement`, with its inverse; `None` when the determinant is below 1e-9, which hides the element and what is in it). The box item takes `location x matrix`, so nothing is re-recorded,
and layout ignores the transform (apart from the containing block, "Positioning and stacking"). Everything that reads geometry goes through the matrix: hit testing (the point through the inverse
before the clip and the children), `get_node_rect` and the snapshot's `rect` (the bounding box of the drawn border box), the clips of paint ancestors (the bounding box of the clip rectangle under
their maps: an `overflow` clip in a frame that a transform rotates or skews is drawn as the box round the rotated rectangle and logged once per element), the focus ring, selection and the text
input's pointer, caret and IME position, wheel and pan deltas, drag auto-scroll and the ghost, `scroll_into_view`, accessibility bounds, and filter and backdrop extents. Text, rounded corners and
scroll bar ends are drawn at `Oversampling` times the larger column of the accumulated linear map, rounded up to an eighth and never below a quarter (`transform_state.rs`), and drawn again once an
animation settles. Every box under a map that is more than a move is a feathered mesh with a feather per axis (`box_mesh.rs`); a box on the pixel grid is drawn as before.
The snapshot's nodes have `transform` (the six numbers of the affine, or `null`) and `rasterScale` (`null` without a transform).

## Filters and frosted glass

`filter` (the element and everything painted inside it) and `backdropFilter` (what is already drawn behind the element, inside
its rounded border box) are style longhands (`native/filter.rs`, `native/filter_render.rs`, `native/blur.rs`).
Neither is inherited.

- **Wire form.** Each has CSS text (`none`, or functions `blur(4px) brightness(1.1) …`: `blur`, `brightness`, `contrast`,
  `grayscale`, `hue-rotate`, `invert`, `opacity`, `saturate`, `sepia`, and one `drop-shadow` on `filter`) and a per-function
  *parts* object (`filterParts`, `backdropFilterParts`: `blur`, `brightness`, `contrast`, `grayscale`, `hueRotate`, `invert`,
  `opacity` (backdrop only), `saturate`, `sepia`, `dropShadow: {x, y, blur, color} | "none"`) which Tailwind utilities set one
  function at a time. Units are read case-insensitively. Merging layer B over A: an explicit list replaces the list and forgets
  the parts; parts set after it take the property back to a list composed in a fixed order (blur, brightness, contrast, grayscale,
  hue-rotate, invert, opacity, saturate, sepia, drop-shadow), merged per function. So `blur-sm hover:brightness-110` keeps the
  blur on hover and an inline `filter` replaces both. A commit that carries an invalid list is rejected: `blur()` is 0 to 256 CSS
  pixels, a list has at most one `drop-shadow()` and no `blur()` after it, and `backdropFilter` has no `drop-shadow()`.
- **Drawing.** A backdrop is two items drawn before the box's own background: a copy of the render target (an explicit
  `canvas_item_set_copy_to_backbuffer` with a rectangle in render-target pixels, large enough for the blur's reach) and a draw item
  that reads the copy's mip chain through a material. A filter is a canvas group around the box item, under a bare **shell** item
  that also holds the element's own backdrop items (so both can be on one element) and, on Compatibility, a one-pixel mip probe.
  `blur(r)` is a Gaussian of standard deviation `r` logical pixels scaled to the render target, planned over the target's mip
  chain (`blur::plan`: level, kernel texels, pairs); the colour functions compose into one matrix applied after the blur. Items,
  materials and shaders exist only while the filter does; a changed value is `material_set_param`, with no commit, layout or
  re-record. An element with no filter pays nothing, and a tree with none asks for no frames; while any effect exists the root asks
  for `process()` frames so that its rectangles follow a changed canvas transform.
- **Renderers.** Compatibility, Mobile and Forward+ each have their own measured model of the engine's mip chain; any other
  rendering method draws nothing and logs one `ERROR`.
- **Nesting.** A `filter` inside a `filter`, or a `backdropFilter` inside a `filter`, is reported once with an `ERROR` naming both
  elements and the inner effect is not drawn (Godot's canvas groups do not nest). It is not a commit rejection.
- **Transitions.** `filter` and `backdropFilter` are transition properties, sampled natively through Stylo (matching lists
  interpolate function by function and a missing function from its identity). Transition records report them as CSS text.
- **Reporting.** Each snapshot node has `effects`, `null` or `{backdrop: {plan, region, kind} | null, filter: {plan, kind, probe,
  culled} | null, layout}`; `plan` is `{level, kernelTexels, pairs, achievedPx, clamped}` (`clamped` when the target has too few
  mip levels for the radius) and `layout` is `plain`, `backdrop`, `group`, `both` or `both-in-wrapper`. `get_activity().effects`
  counts what exists and what was made (below).

## Godot co-operation

The root is one `Control` among the game's own, so it passes on what React does not use.

- **Pointers.** `has_point(p)` is true only where the hit test above finds an element, so empty space and
  `pointer-events: none` regions reach whatever Control lies underneath, and then `_unhandled_input`. It reads the
  mounted tree and changes nothing. A press that Godot has pinned to the root (`gui.mouse_focus`) keeps reaching it
  wherever the pointer goes. For a pass-through region every ancestor must also be `none`: an ancestor that takes
  pointers is the target there.
- **Cursor.** `get_cursor_shape(at)` maps the computed `cursor` of the element the hit test finds at `at` to a
  Godot `CursorShape` (`default` ARROW, `pointer` POINTING_HAND, `text` IBEAM, `move` MOVE, `grab` and `grabbing`
  DRAG, `not-allowed` FORBIDDEN, `crosshair` CROSS, `wait` WAIT, `progress` BUSY, `help` HELP, `ew-resize` HSIZE,
  `ns-resize` VSIZE, `nesw-resize` BDIAGSIZE, `nwse-resize` FDIAGSIZE); over nothing it is ARROW. An element that set no
  `cursor` over selectable text (below) shows IBEAM.
- **Key focus.** The root's focus mode is click-only and `ready()` grabs focus only if an element is already focused (an
  `autoFocus` from before it entered the tree). It holds Godot key focus when its owner calls `grab_focus()`, an element is
  focused or a text selection exists. Godot grants key focus to a focusable Control on every left press that reaches it,
  before any handler runs, so a primary press that leaves no element focused and no selection (a press on something that
  cannot take focus, or one whose `pointerdown` was prevented with nothing focused) hands key focus back: keys then go to the
  game. It is handed back by the same rule (`release_key_focus_without_element`: no focused element, no selection) when
  `blur_node` leaves nothing focused, when Tab finds nothing to move to, when an element is disabled or leaves reach, when a
  commit clears the selection, and, once the commit has settled, when a commit removed the focused element. A commit that
  removed no focus leaves key focus alone, so an owner's `grab_focus()` lasts until one of these happens. A key press in flight
  (Enter or Space held) ends if the root loses key focus; a mouse press does not, because Godot routes it by mouse focus,
  not key focus.
- **Keys.** Tab and Shift+Tab are consumed only if element focus moved. Enter and Space are consumed only when
  they press or release a focused enabled button. `ui_copy` is consumed only when it copied a selection and
  `ui_text_select_all` only when something is selectable. Every other key is left for `_unhandled_input`.
- **Wheel.** `force_pass_scroll_events` is set. A wheel tick (`WHEEL_UP|DOWN|LEFT|RIGHT` press; the release Godot
  sends with it is not a tick; a `factor` of 0 means 1) and a trackpad pan gesture each queue a cancelable `wheel`
  at the pointer. The event is consumed only if JS calls `preventDefault()`, or its default action (scrolling, below)
  took it; otherwise it continues to `_unhandled_input`.

Which element a `click` goes to is under "Pointer model" (the nearest common inclusive ancestor of the press and release
targets). Disabled buttons and descendants of disabled ancestors cannot activate.

## Scrolling

An element whose `overflowX` or `overflowY` is `scroll` or `auto` is a **scroll container** (`native/scroll_input.rs`,
Godot-free math in `native/scroll.rs` and `native/pan.rs`). Only an axis with its own `scroll|auto` scrolls, and a container
that clips on one axis clips on both. `scroll` and `auto` behave alike: the scrollbars overlay the content and take no layout
space. The range of an axis is Taffy's `scroll_width()` / `scroll_height()` and its reversed flag, so a `flex-col-reverse`
container's offsets run from minus its overflow to zero. The offset is native per-tag state, applied as the `scroll` item's
transform and as the hit-test and geometry offset, and re-clamped after layout.

- **Wheel and pan gestures** chain: the containers around the element under the pointer (paint ancestors, innermost first, those
  with something to scroll) each take `client size / 8` per tick (a pan gesture: `client size * delta / 8`; Shift swaps the
  wheel's axes) and pass the rest outwards; `overscrollBehavior: contain` ends the chain. The event is consumed when a container
  moved or a `contain` container kept the rest; otherwise it reaches `_unhandled_input`. JS may prevent it first.
- **Keys** scroll the focused element's nearest container that the key can move: arrows a page / 8, Page Up/Down a page, Home
  and End the ends, Space and Shift+Space a page (Space on a focused enabled button presses it). Not with Ctrl, Alt or Meta,
  and a key that moved nothing is not consumed. Keyboard focus (Tab, `focus()`, `autoFocus`) scrolls the element into view.
- **Touch**: after an un-prevented primary `pointerdown` whose pointer no element captured, a finger that moves beyond 8 px starts a pan if `touchAction`
  (intersected from the touched element outwards) allows the axis and a container can move that way; the pointer is cancelled
  (`pointercancel`, no `click`), the owner follows the finger (latched to it, from where the slop was crossed) and coasts when
  the finger lifts. A touch that cannot pan stays pointer events. A touch that lands on a coasting container stops it and
  does not click.
- **Scrollbars**: thumbs are drawn in the overlay item (`scrollbarWidth: none` hides them, `scrollbarColor` colours them; default
  `#64748b99`) and are the only part that takes a pointer; dragging one (after an un-prevented `pointerdown` whose pointer no
  element captured) moves the content with the mouse (no click follows).
- **Events**: `scroll` (`scrollLeft`, `scrollTop`, `scrollWidth`, `scrollHeight`, `clientWidth`, `clientHeight`; target only,
  not cancelable) is queued whenever an offset changes (input, command, flick or layout re-clamp), one per container while it
  waits for JS. Scrolling never commits, lays out, restyles or re-records boxes or content: `get_snapshot().stats` shows
  `scrollUpdates` and `overlayRecords` and nothing else changing.
- **Commands**: `scroll_to(tag, left, top)`, `scroll_by(tag, dx, dy)` and `scroll_into_view(tag)` return an error string (empty
  for success). `scroll_to` and `scroll_by` error for a node that is not a scroll container or a non-finite number;
  `scroll_into_view` is fine on any mounted element and errors only for one that is not mounted. They end any flick;
  `get_scroll_state(tag)` returns the container's state as JSON (the event's fields, `minScrollLeft`, `maxScrollLeft`,
  `minScrollTop`, `maxScrollTop`, the drawn `thumbs` and the `tracks` of the axes that scroll, drawn or not) or `null`. `get_snapshot()` gives every node a `scroll` field with the same.
- **Frames**: `process()` runs only while it has work: native motion is running, a flick is coasting, a finger is panning,
  a drag needs its timers or edge auto-scroll, a focused text input's caret is blinking or a blurred composition is pending,
  or a filter effect exists (`update_process()`, `motion.rs`, is the one decision; `process_input` is on only during a drag).

## Text selection

The document has one text selection (`native/selection_input.rs`; the Godot-free model is `native/selection.rs`, the
offset conversions `native/text_offsets.rs`, the geometry over Godot's `TextParagraph` and `TextServer`
`native/text_layout.rs`). Only `Text` elements with a computed `userSelect: text`, outside any `Button` and not under
`display: none`, can hold an end of it; a `userSelect: none` element between the ends contributes no range and no text.
A `Document` (the `Text` nodes in document order, with their length in code points and whether they are selectable) and
a text layout are built when a gesture, a key or a query needs them and are dropped after it: nothing is built on a
commit path. The model works in code points; every offset that crosses to JS is a UTF-16 code unit offset.

- **Gestures** (mouse only; after a pointer JS captured and after a scrollbar thumb). An un-prevented
  primary `pointerdown` on selectable text collapses the selection at the glyph boundary under the pointer
  (`TextLayout::hit_test`); with Shift it extends the current selection; a second press of a click sequence (`detail` 2)
  selects the word (`shaped_text_get_word_breaks`), a third the whole text of the node. Moving the mouse with the button
  down extends the selection to the point under the pointer. A pointer that is not over selectable text extends to the
  start of the first selectable text after it in reading order (below a line, or right of it, counts as after), or to the
  end of the last selectable text if there is none (`selection_input::drag_target`). A press that starts or extends no
  selection (a `Button`, `select-none` text, anything else, or text whose pointer was captured) clears the current one; a
  prevented `pointerdown` leaves it alone. A touch starts no selection and a touch press clears one.
- **Focus.** Starting a selection takes Godot key focus for the root without focusing an element; the root keeps it while
  a selection exists, and a press that clears the selection and focuses nothing hands it back (see "Godot co-operation").
  Clearing it through `clear_selection` never releases focus: the owner may have asked for it.
- **Keys.** With the root holding key focus and no `TextInput` focused, the `ui_copy` action puts the selected
  nodes' text, one per non-empty range, joined by `\n`, on the clipboard (`native/clipboard.rs`: `DisplayServer`'s, or
  process memory in a verifier run, "Platform and verifier hooks") and the
  `ui_text_select_all` action selects from the start of the first selectable text to the end of the last. Matching is
  `event.is_action("ui_copy", true)` on the key re-stamped as the keyboard's (`keyboard_input::as_keyboard_event`, T3), so a key from
  another device (a `SubViewport`'s, a host's, a verifier's) copies and selects all as a real keyboard's does; a text input matches its
  actions the same way.
- **Lifecycle.** A commit that changes the text of, or removes, a `Text` element the selection covers (a covered element
  is a selectable one from the first end's to the last's), or a restyle that changes such an element's `userSelect` or
  `display`, clears the selection. A commit that changes a child list while a selection exists builds a document and
  clears the selection if it no longer describes it (a selectable element inserted or moved between the ends, or an
  end that stopped being selectable): whole-tree work, but only in that case. A stale selection is also found whenever
  a document is next built.
- **Painting.** What each element has selected is a code point range kept by the root; the element's content item
  records the highlight rectangles (`TextLayout::selection_rects`, in the item's coordinates) under the paragraph, in
  `selectionColor` (default `#3b82f659`), and the range and colour are part of the content item's key, so changing the
  selection re-records exactly the elements whose range changed. The highlight is inside the content item, so it scrolls
  with a scroll container and is clipped by the containers around it.
- **Events**: `selectionchange` has one wire name with two shapes, told apart by `target` (T1). The document's is
  addressed to the root listeners (target 0, empty path), is not cancelable and has no payload; a change queues one, and one
  still waiting for JS is updated in place. JS asks the root for the selection. A text input's (below) has a target and
  carries the offsets.
- **Queries and commands**: `get_selection() -> String` is `null`, or `{"anchor": {"tag", "offset"}, "focus": {"tag",
  "offset"}, "isCollapsed", "text"}` (`text` is what copying gives; the anchor may come after the focus);
  `clear_selection()` drops it and queues `selectionchange` if there was one. JS: `root.getSelection()` (element handles
  and offsets), `root.clearSelection()`, `root.addEventListener('selectionchange', ...)` and the `useTextSelection()` hook.
- Not built: word-granularity drag after a double click, caret affinity at wraps and direction changes, highlighting a
  selected line break, auto-scroll while dragging, touch selection handles. (Selection inside a `TextInput` is built; see
  "Text input".) Text inside a `draggable` element starts no selection.

## Rich text

Nested `Text` in JS (`src/rich-text.ts`) is one `text` node whose `text` is the source text, every string child joined, and whose `spans` prop
says what is styled in it; a nested `Text` is never a node. A span is `{start, end, style?, inlay?, children?}`: `start` and `end` are UTF-16
offsets into `text`; `style` the longhands a nested `Text` may set (`color`, `backgroundColor`, `fontFamily`, `fontWeight`, `fontStyle`,
`textDecorationLine`, `textDecorationColor`, `textDecorationStyle`, `textDecorationThickness`, `textUnderlineOffset`, one flat object: any other
key is an error); `children` lie inside it, in order, and inherit from it. An **inlay** is generated text: `start == end` (where it sits in the
source), `inlay` the text it shows, no children. Validation (`text_span::validate_spans`, at commit) names the span (`spans[2].children[0] ends
at 9, past the end of its parent (7)`): ranges in order and inside their parent, on character boundaries (no offset inside a surrogate pair), an
inlay a point with text, no span empty unless it holds an inlay.

Native resolves them like nested inline elements (`text_span.rs`): the **display text** is the shown text with each inlay spliced in, and it is
what is shaped (one `TextParagraph::add_string` per run of one font), drawn and laid out; `text_span/offsets.rs` maps its offsets to the shown
text's, which the document uses (selection, copy, accessibility names, the queries below). A glyph is drawn in the colour of the segment its
cluster starts in; a decoration is drawn per segment and line fragment, in `text_decoration.rs`'s Chrome geometry; a background fills its span's
display range under the selection and the text. A change to `spans` that only recolours, decorates or backgrounds, with the same text, fonts and
style, is painted again without shaping (`paragraphRepaints` in `get_activity`, against `paragraphBuilds`).

- `get_caret_rect(tag, offset, side) -> String`: the caret at UTF-16 `offset` of the text the node shows (inlays not counted), `side` -1 for before
  generated text or at the end of a soft wrapped line and 1 for after; a zero-width root-local rectangle the height of the line box, as JSON
  `{x, y, width, height}`. `null` for a node that is not a mounted `Text`; `{"error": reason}` for an offset past the end or inside a surrogate pair.
- `get_offset_at_point(tag, x, y) -> String`: the caret position nearest a root-local point, clamped into the text: `{"offset", "side":
  "before" | "after"}`. Inside an inlay it is the nearer side. The point goes through the node's inverse matrix, so a transformed text is hit where
  it is drawn.
- `get_range_rects(tag, start, end) -> String`: `{"rects": [{x, y, width, height}, ...]}`, one or more per line, the boxes of a selection
  highlight; the range covers an inlay strictly inside it and none at its ends. Empty for an empty range.

The three bound a transformed rectangle by its box, as `get_node_rect` does.

## Queries

- `get_snapshot() -> String`: `{nodes, stats, width, height, hovered, focused, pressed, focusVisible, modality,
  pointers, drag, clockMs, oversampling, transitions}`. Each node is `{id, kind, layer, text, parent, children, paintParent,
  paintIndex, documentIndex, rect, clipRect, style, props, presentation, scroll, textInput, effects, transform, rasterScale}`: `id` is the tag, `parent` and `children` are the React
  tree's, `paintParent` is who paints the node (`parent`'s rule, `0` for the main layer's root, `null` in the overlay)
  and `paintIndex` its place, back to front, among what that paint parent paints, `documentIndex` its pre-order place
  (node 0 reports `-1`), `rect` is root-local logical pixels, `clipRect` the clip its paint ancestors impose (or `null`), `style` the node's **computed** style (unset properties omitted) and `props`
  the native props it was last given (every key, `null` when unset). Node `0` stands for the main layer's root (`parent: null`); layer 0's
  top-level nodes report `parent: 0`, layer 1's report `null` and `layer: 1`. `stats` is
  `{layoutPasses, batches (= commits), commits, nodeCount, paintPasses, layoutMicros, nodesCreated,
  nodesUpdated, nodesRestyled, nodesDeleted, mutations, boxRecords, contentRecords, animationFrames, scrollUpdates,
  overlayRecords}`: `mutations` counts
  the removes, deletes, creates, updates and inserts applied, `boxRecords` and `contentRecords` the canvas
  command lists re-recorded, `scrollUpdates` and `overlayRecords` what scrolling changed. `nodeCount` excludes node 0.
  `oversampling` is the font oversampling the root last drew at ("Mounted tree, geometry, paint"); `scroll`, `textInput` and
  `effects` are `null` unless the node is a scroll container, a text input or has a filter, and `transform` and `rasterScale` unless the node (or an ancestor, for the scale) has a transform ("Transforms"). Whole-tree by design:
  diagnostics only.
- `get_node_rect(tag: int) -> String`: the root-local rectangle as JSON, or `null` when the node is not mounted. Node 0 is
  the root, which has the rectangle the snapshot gives it (the viewport), so a root handle's `getRect()` answers.
- `get_text_lines(tag: int) -> String`: the lines of a text node as they are drawn, in root-local coordinates (`text_lines_json` in `selection_input.rs`), or `null`; it reports `text` (the
  shown text) and `display` (the display text its line ranges index, "Rich text"). For verifiers that compare the layout with another renderer's.
- `find_by_test_id(test_id: String) -> int`: the lowest (first created) tag carrying the `testID`, or -1.
- `get_text_input_state(tag: int) -> String`: a text input's `{value, selectionStart, selectionEnd, selectionDirection,
  eventCount, composing, preedit, scrollLeft, scrollTop, caretVisible, inputDirection}` as JSON (offsets in UTF-16
  units, `eventCount` the number a `set_text_and_selection` must carry), or `null` for anything else. The snapshot's node
  has the same under `textInput` (or `null`) plus `displayText` (the value with the preedit spliced in, or bullets),
  `showingPlaceholder` and `caret` (the caret's root-local rectangle).

## Input events

Native queues input events and delivers them to JS **synchronously from inside the Godot input callback**,
so JS can say `preventDefault()` before native acts. JS and native share the main thread; this is the
browser model, not an IPC round trip.

- `#[signal] events_ready()` (JS: `surface.eventsReady`) is emitted from `gui_input` when events are queued.
  The JS owner connects a callable (`createRoot`'s required `subscribeToEvents` option) that calls
  `dispatchEvents()`, which drains, dispatches and answers before the signal returns. `unmount()`
  disconnects it.
- `drain_events() -> String` returns and clears a JSON array of events. Every event is
  `{seq,target,path,cancelable,timeStamp,type,...}`: `seq` is monotonic per root starting at 1; `target` is the
  element tag (0 addresses root listeners only); `path` is the target followed by its ancestors up to its
  layer's top-level node (empty for target 0), which JS resolves through its committed instances to run capture
  and bubble; `timeStamp` is milliseconds on the engine tick clock; `cancelable` is true only for the one event
  native is waiting on.
- `resolve_event(seq: int, default_prevented: bool, drop_effect: String) -> String` answers that event. Only the
  awaited `seq` can be resolved, once; anything else returns an error string. `drop_effect` is `""`, `none`,
  `copy`, `move` or `link`: the effect JS settled on for a `dragover` or `drop`. Preventing a `dragover` or a `drop`
  without one is an error (the event then counts as not prevented), so native never guesses what a target accepted.
- Event types: `pointerdown|pointermove|pointerup|pointerenter|pointerleave|pointercancel|click|dblclick|auxclick|
  contextmenu` carry `x,y` (root-local
  logical pixels), `viewportX,viewportY` (canvas coordinates: the root's global transform with canvas applied to the
  root-local position, which is what `_unhandled_input` receives), `pointerId` (1 mouse, 2 and up touches, 0
  synthetic keyboard activation), `pointerType` (`"mouse"`, `"touch"` or `""`), `button` (DOM button: 0 left, 1
  middle, 2 right, 3 back, 4 forward; -1 when not a button change), `buttons`
  (DOM `buttons` bitmask mapped from Godot's mask), `detail` (the click count on `click`, `auxclick` and `dblclick`,
  otherwise 0), `relatedTarget` (enter and leave only, else `null`) and `shiftKey,ctrlKey,altKey,metaKey`.
  Enter and leave events also carry `relatedPath`, the other side's path (omitted when it is empty). `wheel` carries the same pointer fields
  (`button` -1, `pointerType` `"mouse"`) plus `deltaX,deltaY` in wheel ticks, positive down and right: one per notch
  of a discrete wheel, scaled by Godot's `factor` (or a pan gesture's `delta`) for smooth devices, which is what
  `ScrollContainer` scales by page / 8. It is cancelable. `keydown` and `keyup` carry `key`, `code`, `repeat`,
  `isComposing` (true while a text input is composing) and the four modifiers; both are cancelable (see "Focus and
  keyboard"). `focus` and `blur` carry `relatedTarget` (the element on the other side of the change, or `null`)
  and `focusVisible` (the new focus, for `focus`; the old one, for `blur`).
  `accessibilityaction` carries `action` (`increment`, `decrement` or `setValue`) and `value` (the number `setValue` asked
  for, else `null`); it is not cancelable ("Accessibility").
  Only a primary `pointerdown` on an enabled element, mouse or touch, is cancelable; its default action is to focus the
  nearest focusable ancestor-or-self (button, text input or `tabIndex` element), else to clear focus (handing key focus back,
  "Godot co-operation"), and to start or clear the text selection and the other gestures of "Pointer model", which
  `preventDefault()` skips. `click` still follows a prevented `pointerdown`, as in browsers.
- **Propagation.** JS runs the capture phase only for `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `click`,
  `wheel`, `keydown` and `keyup`. Everything bubbles except `pointerenter`, `pointerleave`, `scroll` and `selectionchange`
  (`focus` and `blur` bubble, unlike the DOM's). Root listeners see an event after its bubble phase, and see only events that
  bubble or are addressed to the root (`src/events.ts`).
- Drag events (`dragstart`, `drag`, `dragenter`, `dragleave`, `dragover`, `drop`, `dragend`) carry the pointer fields
  above (`button` -1, `buttons` 1 while the pointer is held and 0 for `drop` and `dragend`), `sessionId` (the drag's
  number; every event of one drag has the same) and, for `dragenter` and `dragleave`, `relatedTarget`. `dragend` also
  carries `dropEffect` and `endedOutsideRoot`. `dragstart`, `dragover` and `drop` are cancelable. See "Drag and drop".
- Native emits one `pointerleave` (target the element left, `relatedTarget` the element entered) and one
  `pointerenter` (target the element entered, `relatedTarget` the element left). JS dispatches them to the
  elements actually crossed, below the lowest common ancestor, without bubbling.
- Enter/Space on a focused button makes one `click` with `pointerId: 0`, `pointerType: ""` and `detail: 0` when the
  key is released (not cancelable). No `pointerdown` or `pointerup` is made up for it. If JS prevents the `keyup` the
  press ends and no `click` follows, as in browsers (`KeyRelease::EndsWithoutClick` in `keyboard_input.rs`).
- A press in flight when the window loses OS focus is cancelled natively (Godot drops mouse focus and its
  synthetic release never reaches `gui_input`): JS gets `pointercancel`.

## Text input

A `textinput` node (`<TextInput>`, `src/text-input.tsx`) owns an `EditBuffer` (`native/text_input.rs`: text, anchor and
focus, undo and redo, the IME composition, `maxLength`, read-only and secure modes) in per-tag state
(`native/text_input_godot/`). Offsets that cross to JS are UTF-16 units (`native/text_offsets.rs`). It measures
`TEXT_INPUT_DEFAULT_COLUMNS` (20) advances of `0` wide and one line tall (a multi-line input: `rows` lines, 2 without
`rows`, `TEXT_AREA_DEFAULT_ROWS`) at its font size, whatever it holds, so typing never lays out; a long value scrolls. Values
that cross into the buffer are normalised: a single-line input drops line breaks, a multi-line one turns `\r\n`, `\r`, NEL
and the line and paragraph separators into `\n`.

- **Editing.** An un-prevented `keydown` aimed at a focused text input resolves to an edit command with the project's
  own `InputMap` actions in `LineEdit`'s order (`ui_copy`, `ui_text_select_all`, `ui_cut`, `ui_text_submit` or
  `ui_text_newline`, `ui_paste`, `ui_undo`, `ui_redo`, the backspace and delete actions, then the caret movements with
  Shift removed and extending the selection, `ui_swap_input_direction`), or, with no action, to the typed character
  (`unicode >= 32`, no Ctrl, Alt or Meta). A key from any device matches as the keyboard's (an `InputMap` binding ignores
  events from another device). A command the mode forbids (`readOnly`, copy and cut of a `secure` input, a line break in
  a single-line input, a keyboard command during a composition) never reaches JS. For the others, native sends
  `beforeinput` (cancelable, awaited), applies the edit unless JS prevented it, sends `input`, and then
  `selectionchange` if the selection is not where JS last heard it was. Enter in a single-line input is consumed and
  does nothing natively (JS decides what a submit is). Keys the input has no use for (Escape, function keys) are not
  consumed, so they reach the game; Tab moves focus; keys never scroll a text input.
- **Events.** `beforeinput {inputType, data}` (cancelable, bubbles); `input {inputType, data, value, selectionStart,
  selectionEnd, eventCount}` (bubbles; `value` is all of the text); `selectionchange {selectionStart, selectionEnd}`
  (does not bubble); `compositionstart|compositionupdate|compositionend {data}`. `inputType` is one of `insertText`,
  `insertLineBreak`, `insertFromPaste`, `insertReplacementText`, the `delete*` types, `deleteByCut`, `historyUndo`,
  `historyRedo`. `keydown.isComposing` is true while a composition is in progress.
- **Controlled values (React Native's protocol).** `set_text_and_selection(tag, event_count, value, start, end) ->
  String` replaces the text and selection (UTF-16 offsets into `value`, both -1 for the caret at the end) only if
  `event_count` is the buffer's current count, which goes up by one for each `input` event and for nothing else. It
  returns `""` when applied, `"stale"` when ignored for its count (the user typed first; nothing changed) and an error
  message otherwise. Applying clears the undo history and the composition and raises no `input`; a single-line input drops
  line breaks from the value. `set_text_selection(tag, start, end, backward) -> String` is `setSelectionRange` (UTF-16
  offsets into the current text; undo history untouched). The `TextInput` component answers each `input` with the
  command when `value` differs from what native holds, so a transform or a rejection takes effect inside the same
  dispatch.
- **Pointer.** An un-prevented primary press on a text input, when no scrollbar thumb was grabbed and no element captured the
  pointer, places the caret (Shift extends from the anchor), a double click selects the word, a triple click everything (all of
  a text area's text, not a line: `LineEdit`'s rule, T14), and dragging with the button held extends the selection (by words
  after a double click); a press that focuses a `selectOnFocus` input selects everything instead. A text input keeps its press
  inside any `draggable` ancestor (it is never a drag source, T23). The pointer over a text input is the text cursor unless
  its style says otherwise.
- **Painting.** The selection, the text (or the placeholder), the IME preedit's underline and the caret are drawn into two
  canvas items under the node's `scroll` item, so following the caret is a transform: a single-line input scrolls
  horizontally and a multi-line one vertically (and is a scroll container for wheel, touch pans and thumb dragging, with
  chaining to the container around it). The caret blinks (650 ms) in the focused input while its window has focus, draws
  both of `TextServer`'s carets and the direction markers as `LineEdit` does, and is plain on an empty line. The selection of
  an input that is not focused is kept (`selectionStart`) but not drawn. Colours: `color`, `caretColor`, `placeholderColor`
  and a fixed selection colour (`#3b82f659`).
- **Platform.** Gaining focus starts the IME and shows the on-screen keyboard where the engine has them (`FEATURE_IME`,
  `FEATURE_VIRTUAL_KEYBOARD`); `NOTIFICATION_OS_IME_UPDATE` becomes the preedit, and `_set_text` (the Web virtual
  keyboard's hook) an `insertReplacementText` edit with the caret at 0. Copy, cut and paste use the clipboard of
  `native/clipboard.rs` (`DisplayServer`'s, or process memory when a verifier isolated it, "Platform and verifier hooks"),
  except that on the Web a paste asks the browser (`navigator.clipboard.readText()` through `JavaScriptBridge`, answered by
  `_on_web_clipboard_text` or `_on_web_clipboard_refused`) and pastes when it answers, because `clipboard_get` there returns
  the text the previous call read (the engine is unchanged, so any other caller of it on Web still gets the stale text); a
  refused read is logged and pastes nothing, and an empty paste is no paste. On the Web the root also writes the engine's
  hidden soft-keyboard element (value, and the selection unless the engine's Right presses from `_set_text` are still
  pending) through `JavaScriptBridge`, because the engine sets it once and every key sends its whole value back. An unfinished
  composition commits on blur through `beforeinput`, one frame later; a click inside the composing input still cancels it.
  IME and keyboard calls run with the root's base guard held, since the Web engine notifies every node of a window focus
  change from inside them. Engine behaviour that stays: the engine's IME start drops the last queued raw key,
  the Right presses of two keys in one frame add up, the caret after JS puts an edit back mid-text is off until the next key,
  and after a Web composition ended by a focus move `ime_started` stays set and raw keys are dropped until one more
  composition commits. The IME window and the on-screen keyboard are placed from the root's own screen transform
  (`update_ime_position`), which is wrong for a root on a quad in a `SubViewport`.
- **Accessibility.** A `TextInput` is a text field (`TEXT_FIELD`, or `MULTILINE_TEXT_FIELD` with `multiline`) whatever
  its `role`, which can only remove it (`none`, `presentation`). It is named by `aria-label`, else its `placeholder`; its
  text is not a value but one element per line of the shaped display text (`create_sub_text_edit_elements`, bullets for a
  secure input, the preedit spliced in), placed in the root's space and freed and made again when the text, the shaping
  or the box it wraps to changes; its selection is `update_set_text_selection` against those elements. Actions: focus,
  `set text selection` (`{start_char, end_char}`, code points of the display text), and, unless `readOnly` or disabled,
  `replace selected text` (an `insertText` edit) and `set value` (an `insertReplacementText` edit with the caret after it),
  both through `beforeinput`. The platform tree for text inputs was read on the stock profile only ("Accessibility").

## Focus and keyboard

- **Focusable** (`native/focus.rs`, unit tested): a `Button`, a `TextInput`, or any element with a `tabIndex` (`0` or `-1`; any
  other value is a commit error), unless it or an ancestor is disabled. **Tabbable**: focusable, not `tabIndex`
  `-1`, and visible. Tab order is document order (pre-order of the mounted tree, the main layer first), never paint
  order; Tab and Shift+Tab wrap, and from an element that is not a stop (say `tabIndex` `-1`) they continue from its
  place in document order.
- **Focus moves.** An un-prevented primary `pointerdown` focuses the nearest focusable ancestor-or-self, else clears
  focus (and hands key focus back, see "Godot co-operation"). Tab moves along the tab stops. `focus_node(tag,
  focus_visible: int) -> String` focuses an element and gives the root Godot key focus (`focus_visible` -1 follows
  the input modality, 0 never, 1 always; an unmounted or non-focusable element is an error that says why);
  `blur_node(tag) -> String` blurs it only if it holds focus. `autoFocus` focuses the first element a commit
  created that asked for it and can take it, in document order, after layout. Changing focus queues `blur` to the
  element losing it and `focus` to the one gaining it, each naming the other.
- **Modality and the ring.** Native tracks how the user last gave input (the snapshot's `modality`): any press makes
  it `pointer`, a key press other than a bare modifier makes it `keyboard`; it starts as `keyboard`. A focus is a
  keyboard focus (`focusVisible`; `focus-visible:` styles match and the ring is drawn) if it came from Tab, or from
  `focus_node` or `autoFocus` while the modality is `keyboard`; a press focuses without it.
- **Key events.** While the root holds Godot key focus every key press, repeat (`repeat: true`) and release is queued
  as `keydown` or `keyup` to the focused element, or to root listeners (target 0, empty path) when none is focused.
  Both are awaited: JS answers `preventDefault()` before native acts. Native then runs the default action unless
  prevented and consumes the key (keeps it from the game) only if JS prevented it or a default action ran. `key` and
  `code` follow plan Appendix B (`native/keymap.rs`, unit tested): `key` is the typed character, else the key's name,
  else its printable label (so Ctrl+C reads `c`), else `Unidentified`; `code` comes from the physical keycode (the
  logical one for a synthetic event that has none) and, for modifiers, the key's side.
- **Default actions.** Tab (without Ctrl, Alt or Meta) moves focus and is consumed only if it moved. Enter, keypad
  Enter and Space press a focused enabled `Button`: the press (and `active:` style) starts on `keydown`, its
  repeats belong to it (consumed, nothing more), and the `click` follows the matching `keyup`. A `keyup` with no
  press behind it belongs to the game.

## Pointer model

One record per pointer id (`native/pointer_state.rs`, unit tested): the mouse is pointer 1, a touch is pointer
`2 + Godot touch index`, and synthetic keyboard activation is pointer 0. Each record holds the position, the DOM
`buttons`, for every button that is down its press (target element and click count), and its capture.

- **Emulation.** Godot translates the first touch to mouse events and, if enabled, mouse events to touches, and
  marks the copies with `DEVICE_ID_EMULATION` (-1; `core/input/input.cpp:926`). Native ignores every input event
  with that device, so a touch is one touch pointer and never also a mouse press, and a touch never sets `hover`.
- **Mouse buttons.** Every button is a pointer. Only the primary `pointerdown` is cancelable (nothing native
  follows another button). The right press queues `contextmenu` after its `pointerdown`. On release: `pointerup`,
  then `click` (primary) or `auxclick` (any other button), then `dblclick` after the second `click` of a sequence.
  `contextmenu`, `auxclick` and `dblclick` are not cancelable.
- **Click counting.** A press continues a sequence if it is the same button of the same kind of pointer, at most
  500 ms after the previous press and within 4 logical pixels of where the sequence began; its count is one more.
  `detail` on `click`, `auxclick` and `dblclick` is the count of the press. A click goes to the nearest common
  inclusive ancestor of the element pressed and the element the pointer was released over, mouse and touch alike (two
  parts of one enabled button click the button itself); a pointer an element captured clicks that element if the
  press began inside it. Pressing a disabled element, releasing on one, releasing over nothing (beyond the root
  nothing is hit, unless an element overflows it), or releasing over an element with no ancestor in common with
  the pressed one (another layer or top-level element) does not click.
- **Touch.** A finger that goes down queues `pointerenter` (no related element, so JS enters the whole path), then
  `pointerdown` (cancelable, `buttons` 1, `pointerType` `"touch"`) with the same default action as a mouse press
  (focus, or hand key focus back). The finger is captured to its `pointerdown` target for as long as it is down,
  so its `pointermove`s (from `InputEventScreenDrag`) go there wherever the finger is. Lifting it queues
  `pointerup`, `pointerleave` and `click`; a cancelled touch (`InputEventScreenTouch.canceled`) queues
  `pointercancel` and `pointerleave` and nothing else. A touch is `active` (the `active:` style) while it is down.
- **Capture.** `set_pointer_capture(tag: int, pointer_id: int) -> String` makes the element the target of that
  pointer's `pointermove`, `pointerup`, `pointercancel` and `click` wherever the pointer is (events keep the
  element's own path). It refuses (nothing changes, the string says why) an element that is not mounted and a
  pointer that is not down. `release_pointer_capture(tag, pointer_id) -> String` ends the capture only if `tag`
  holds it; `has_pointer_capture(tag, pointer_id) -> bool`. A capture ends by itself with the last button
  release or touch lift, with `pointercancel`, and when the element is deleted. An explicit capture replaces the
  implicit one of a touch. Godot keeps routing a pressed mouse to the root wherever the pointer goes (its mouse
  focus), so a captured drag keeps working outside the root and the window.
- **Cancel.** `pointercancel` (target the capture target, else the press target; `buttons` 0) ends a pointer's
  contact when the OS cancels a touch, the window loses OS focus, or the root leaves the scene tree; no `pointerup`
  or `click` follows.
- `get_snapshot()` adds `pointers: [{id, type: 'mouse'|'touch', x, y, buttons, down, capture: {target, implicit}|null}]`:
  the mouse, and each touch while it is down.

Rules native follows: only input-origin entry points emit (`gui_input`, `input` while a drag runs, the IME update, `_set_text`,
an accessibility action callback, the Web paste answer); `commit`, lifecycle notifications and `process()` queue events for the
next emission or the owner's per-frame `dispatchEvents()`. The one exception is a drag's own timers in `process()` (a touch
held long enough, a scroll under a stationary pointer), whose cancelable `dragstart` and `dragover` must be answered
synchronously like any other (see "Drag and drop"). A text edit can also emit in the middle of its pipeline, so that JS has
answered `input` before `selectionchange`. Input that arrives while JS is
inside a dispatch is queued with `cancelable: false`. After the emission everything native knew before it is
stale: it looks the target up again (lookups return `Option`), skips the default action if the target was
removed, and does nothing further if the root left the scene tree. JS may call `commit`, `get_snapshot` and
`resolve_event` on the same root while native is inside the emission (godot-rust re-borrows through
`base_mut()`). A handler that throws does not stop the JS drain loop; the first error is rethrown after it
finishes. The JS drain loop is bounded at 64 rounds.

Godot's `Input` dispatches every `InputEventGesture` twice (once explicitly and once with every event,
`core/input/input.cpp:995-1003` and `:1046-1048`), so a pan gesture, real or parsed, reaches JS as two `wheel` events
with the same deltas, exactly as it reaches Godot's own `ScrollContainer`. Native does not filter this.

Limits: no touch text selection, drag and drop with Godot `Control`s
(`_can_drop_data` is synchronous on `&self`, where a JS answer cannot be had; `endedOutsideRoot` plus the release
point is what a game uses) or with files or `setDragImage`, images, rich inline text, rounded clip
masks, `position: sticky`, CSS stacking contexts (`zIndex` orders siblings of one paint parent), a public CSS stylesheet/selector API, arbitrary keyframe animations, or custom native
materials. Both overflow axes clip together (`hidden`, `scroll` or `auto` on either clips the padding box). Not scrolling: scrollbar
track clicks (paging), animated programmatic scrolling, overscroll bounce, `position: sticky`. Native drawing uses owned
CanvasItem RIDs with cached resources and one Control for the whole React tree. The README's "Current limits" is the full list.

## Drag and drop

HTML drag and drop inside one root (`native/drag.rs` is the Godot-free state machine, unit tested;
`native/drag_input.rs` is the glue; `native/drag_ghost.rs` the ghost; `src/data-transfer.ts` and `src/drag.ts` the
JS half). `draggable` and `dragPreview` are props (above).

- **Arbitration**. After an un-prevented primary `pointerdown` whose pointer no element captured
  and that is not on a scrollbar thumb, a press inside a `draggable` element (the nearest one at or above the press,
  unless it or an ancestor is `disabled`) is offered to the machine; it is **pending**. A mouse becomes a drag when it
  is further than `Viewport.gui_drag_threshold` (read at the press; 10 by default) from where it went down; a touch
  when it has stayed within the 8 px slop for 500 ms (`TOUCH_DRAG_HOLD_MS`, `process()` ticks the timer, and
  the machine also advances it on the next input). A touch that moves beyond the slop first is declined and goes on to
  pan or stay pointer events (touch pans register after the drag offer, rule 4). A touch that stopped a coasting flick
  starts nothing. A press on a text input is never offered (it keeps its press, "Text input"), and text inside a `draggable`
  element starts no selection; a press there that never becomes a drag clicks and clears the current selection.
- **Start.** `dragstart` (cancelable, at the dragged element) is sent first; if JS prevents it nothing else happens
  and the pointer carries on as plain pointer events. Otherwise the pointer is cancelled (`pointercancel`; no `pointerup`
  or `click` follows) and the drag begins: `drag` at the source, `dragenter` and `dragover` at the element under the
  pointer. From then on every move of the held pointer, and every scroll of anything under it (looked at again at
  the next frame), sends `drag` (source), `dragenter` (new target, `relatedTarget` the old one), `dragleave` (old
  target, `relatedTarget` the new one; enter comes first, as in the HTML processing model) and `dragover` (cancelable).
  The hit test skips `pointer-events: none` elements; the ghost is not in the tree. The hover freezes during a drag
  and catches up when it ends.
- **Accepting.** Preventing `dragover` accepts a drop at that target with the `dropEffect` JS reports through
  `resolve_event`: the one the handler left on `dataTransfer` if `effectAllowed` permits it, else `none`, which refuses.
  Release over an accepting target sends `drop` (cancelable; the effect JS reports is the drag's effect), then
  `dragend`; over anything else it sends `dragleave` to the target and `dragend` with the effect `none`.
- **End.** `dragend` (at the source; at the root when the source was removed, so JS can end the drag's store)
  carries `dropEffect`, `endedOutsideRoot` and the release point (`x,y` and `viewportX,viewportY`). `endedOutsideRoot`
  is true only for a release beyond the root. Escape (handled in `input` while a drag runs, so the root needs no key
  focus; accepted), the OS cancelling the pointer (window focus loss) and the root leaving the tree cancel: `dragleave`
  and `dragend` with the effect `none` and `endedOutsideRoot` false. After Escape the held pointer's remaining events
  are swallowed until it is released, which does not click.
- **Cursor.** While a drag runs `_get_cursor_shape` returns `CURSOR_CAN_DROP` over a target that accepted and
  `CURSOR_FORBIDDEN` anywhere else. Godot asks for the shape before it hands a motion to `gui_input`, so the window
  shows what the previous motion decided.
- **Ghost.** `dragPreview: native` (the default): a copy of the source and everything it paints, as drawn when the
  drag was about to start (before `dragstart` handlers run, so a handler that restyles the source does not change it),
  drawn at 60 % in a top-most canvas item above both layers and the focus ring, at the pointer with the grab offset.
  It is a snapshot (no scrollbars, no later changes, no filter: the ghost of a filtered source shows it unfiltered), and the
  root's clip applies. `none` draws nothing. A text input's ghost shows its text and no caret.
- **Edge auto-scroll.** While a drag runs, each scroll container on the path from the element under the pointer scrolls
  towards an edge the pointer is within 32 px of (inside its padding box), at up to 600 px per second, on an axis that
  can still move that way. Frames come from the one `update_process()` decision, together with a pending touch hold and
  a scroll waiting to be looked at; a drag that needs none runs with `process()` off (and `input` on, for Escape).
- **Session.** One drag at a time per root. `sessionId` numbers the drags; JS keeps one `DataTransfer` store for each,
  made at `dragstart` and dropped after `dragend`. The machine is taken out of the root while it handles an input
  (`Option<DragMachine>`), because every event it emits runs JS that may remove anything or unmount the root; events
  for an element that is gone are skipped, and a root that left the tree cancels the drag.
- `get_snapshot()` adds `drag: {state: idle|pending|dragging|ended|busy, session, source, target, pointer, origin,
  position, allowedEffect, ghost: {x,y,width,height,elements}|null, lastEnd: {reason: dropped|released|escape|
  pointercancel|rootexit, dropEffect, endedOutsideRoot}|null}`. `ended` is a finished or cancelled gesture (until the
  next press); `busy` is only seen by a JS handler of a drag event.

## Native CSS motion and clipping

A node whose computed style has `transition: {properties: ('width'|'height'|'opacity'|'backgroundColor'|'color'|'borderColor'|'filter'|'backdropFilter'|'transform'|'boxShadow')[] | 'all',
durationMs: number, delayMs?: number, easing?: 'linear'|'ease'|'ease-in'|'ease-out'|'ease-in-out'|{cubicBezier: [x1, y1, x2, y2]}}` is a
*motion node*. `properties` is non-empty and has no duplicates. `'all'` is every property of `TransitionProperty::ANIMATABLE` (`native/props.rs`, twinned by `TRANSITION_PROPERTIES` in `src/types.ts`): a change
that cannot animate under `'all'` (a width from pixels to a percentage, an intrinsic size on a flex main axis that can grow) is a quiet `MotionViolation`, applied at once with no report and no rejected
commit, where naming the property in a list keeps the rejection. `transitionParts` (`properties`, `durationMs`, `delayMs`, `easing`, each optional; `properties` may be `'all'` or `'none'`) is what the
`transition-*` utility classes set: native merges it per field across layers (`transition::merge_transition`; an inline `transition` replaces it and a longhand after the inline one edits it) and
fills what is missing with CSS's initial values (`all`, 0 ms, `ease`); no duration and no delay is no transition, so the node is not a motion node. Text colour and border colour animate, and text
that inherits a moving colour paints the ancestor's sampled colour (`presented_text_color`). Duration and delay are finite nonnegative milliseconds. Easing defaults to CSS `ease`. A retained
Blitz/Stylo style tree owns numeric/color interpolation, delay and reversal shortening. Every mounted node has an
element in it, kept in tree order (`insert`, `remove`, `set_children`), but a node's style is written to it only
while the node is a motion node or has just stopped being one (which cancels what was running); a node that gains
a `transition` in the change that changes a value is first given its previous style, so it animates from it.
Only motion nodes are sampled and presented differently from their computed style. One root-owned Godot process clock advances it; no JS
animation frames or per-frame commits are required. The clock pauses when the root leaves the scene tree and
resumes when the same root reenters.

`interpolateSize: 'allow-keywords'` opts into native intrinsic dimension endpoints; it is inherited, with
`numeric-only` the default. Canonical authored `auto`/percentage values remain in the computed style. A separate
Taffy probe with duplicated Godot text-shaping resources resolves endpoints without modifying visible geometry
(the one remaining whole-tree cost on a commit path). Explicit pixel endpoints are supplied to Stylo while moving,
and authored dimensions are restored without retriggering animation when that axis's full-precision sampled pixel
value exactly reaches its target, independently of unrelated paint transitions. During an active intrinsic
transition, content/font changes, parent size changes, and changing shell width remeasure and retarget from the
currently sampled value. Settled `auto` remains ordinary intrinsic layout.

Intrinsic animation on a flex main axis requires `flexGrow: 0` and `flexShrink: 0`; same-unit pixel or
percentage transitions are supported and direct pixel-to-percentage or percentage-to-pixel transitions are not,
because the selected high-level Taffy tree has no current-layout calc resolver. A **commit** that would cause
either is rejected before it is mounted (the dry-run restyle resolves the computed styles the commit would
produce). A change native itself causes (a hover, focus or breakpoint style) cannot be rejected: it is applied
without animation and an `ERROR` line names the node.

`overflow: 'hidden'` clips descendants and text to the sampled padding box, with ancestor intersections; the
border is still painted. Hit testing and focus eligibility use the same clip geometry. This is rectangular
scissor clipping: border radius affects paint, not the clip shape. Nested rounded masks are not claimed, and under a rotation or skew the clip is the bounding box of the rotated rectangle
("Transforms").

Per-node `presentation: {width,height,widthIsAuto,heightIsAuto,opacity,backgroundColor,color,borderColor}` and the snapshot's
`transitions: [{id,property,current,target,startedAtMs,durationMs}]` report what is being presented; dimension and
opacity diagnostics are numbers, colors are hexadecimal RGBA strings, a filter transition's `current` and `target` are
CSS filter text (a sampled filter is not in `presentation`: it goes straight to the effect's material), a transform's are the six numbers of the matrix
(`matrix(a, b, c, d, e, f)` about the origin) and a `boxShadow`'s are CSS text.
`filter` and `backdropFilter` transitions are interpolated by Stylo function by function (`backdrop-filter` is behind a Stylo
preference that native turns on); the sampled list comes back as CSS text and updates material parameters only. The `widthIsAuto` and `heightIsAuto` flags
read the actual Taffy presentation style. Transition records are native tracking diagnostics, not access to Stylo's
private per-property animation table.

`get_activity() -> String` provides compact JSON `{batches,layoutPasses,paintPasses,animationFrames,animating,
trackedTransitions,clockMs,drawSerial,nodeCount,mutations,nodesUpdated,nodesRestyled,boxRecords,contentRecords,paragraphBuilds,paragraphRepaints,effects,paintTextures}`
(`batches` counts commits; `drawSerial` is the paint pass count, which advances only when native changed something visible; `paragraphBuilds` counts the paragraphs shaped and
`paragraphRepaints` the changes to a text's spans, colours or decorations that were painted again without shaping; `paintTextures` is the number of baked textures, shadow masks and decoration pictures, held).
`effects` is `{backdrops, groups, blocked, copiesEnabled, itemsCreated, materialsCreated, materialsFreed, shadersCreated,
materialUpdates, copyRectUpdates, subtreeWalks, probes, refreshes, refreshMicros}`: how many backdrop and filter effects
exist, how many are held back by an enclosing group, and what has been made, freed and updated since the root began, so a
tree without filters shows all zeros (`materialsCreated - materialsFreed` is what live effects hold). `animating` reflects actual global Stylo activity or
owned intrinsic transitions; use it for completion. `set_profiling(enabled: bool)` controls an off-by-default
512-sample ring; `take_profile() -> String` drains `{samples,dropped,counters}`. Samples have
`kind: 'batch'|'frame'|'draw'`: a `batch` record is one `commit` (parse, validate-and-plan-and-dry-run, mount,
layout, geometry and total microseconds), a `frame` record one animation tick (style, measure, layout, geometry,
animation microseconds), and a `draw` record the CPU microseconds of a paint pass that re-recorded canvas items.
Nested layout/geometry timings are subtracted from their surrounding bookkeeping phases. Timings measure CPU work,
not GPU completion. Profiling drops the oldest sample at capacity and reports how many were dropped.

## Accessibility

Native exposes the React tree through Godot's `AccessibilityServer` (`native/accessibility.rs` is the Godot glue,
`native/accessibility_model.rs` the Godot-free model: which node is exposed, with which role, name, flags and actions; plan
3.21). It follows `ItemList`: on `NOTIFICATION_ACCESSIBILITY_UPDATE` there is one element per exposed
node under the nearest exposed ancestor's, and `queue_accessibility_update()` runs after commits, focus and geometry changes
and scrolls (it does nothing while accessibility is off).

- **What is exposed.** `Button`, `Text` with text and `TextInput` have implicit roles (`button`, static text, text field /
  multiline text field); a scroll container with no `role` is `SCROLL_VIEW` and exposes its children; every other element only
  with an explicit `role`. `ariaHidden`, `role: none` and `role: presentation` keep an element (and its subtree, for
  `ariaHidden`) out. Props are in the table under "Props and styles"; `aria-labelledby` and `aria-describedby` do not exist
  (native rejects unknown props, so the kit's `TextField` sets `aria-label` and `aria-description`). Bounds are root-local and
  follow scrolling.
- **Actions** (bound to callables that call `_on_accessibility_action(data, tag, action)`): click (queues a `click` with
  pointer 0, unless disabled), focus and blur (acting like the keyboard), `set text selection`, `replace selected text` and
  `set value` on a text input (edits through `beforeinput`), increment, decrement and set value on an element that advertises
  adjusting (queues an `accessibilityaction` event for JS, which the kit `Slider` answers), and the scroll actions below.
- **Scrolling.** A scroll container reports each axis that can move with its position and range (a reversed axis has a
  negative minimum) and offers `SCROLL_UP`, `SCROLL_DOWN`, `SCROLL_LEFT`, `SCROLL_RIGHT` and `SET_SCROLL_OFFSET` for the axes
  that can move, and `SCROLL_INTO_VIEW` on every exposed element with a scroll container in its paint chain (performed by
  `scroll_by_checked`, `scroll_to_checked`, `scroll_into_view_checked`: an item or a page moves what the arrow and Page keys do).
  Each scrollable axis of an exposed container (a multi-line text input included) also has a **scroll bar element** keyed by
  (tag, axis), after the content, horizontal first, with value and range as reachable offsets and orientation; its
  `Increment` and `Decrement` call `_on_accessibility_scroll_bar_action(data, tag, axis, action)` and step as the arrow keys
 . It exists because a stock macOS adapter reads a scroll position only from such an element.
- **Not done.** A transform on the scrolled content's element as `ItemList` has: every exposed descendant is re-set on each
  scroll while a screen reader is attached.
- **Verified where.** The Godot-side half (the tree native builds, the action entry points) runs under every profile. The macOS
  platform tree was read only on the `stock` profile, which has AccessKit, where `pnpm verify:a11y --engine=stock` passes;
  it records engine gaps it cannot convey (a group or radio-group element, a mixed checkbox, a text area's value, a read-only
  field, a scroll view's position and actions). Breaka's engine has no accessibility driver, so there `verify:a11y` ends "not
  verified" (exit 2). Windows and Linux trees, the Web (the Web engine has no accessibility code), and VoiceOver by hand were
  not checked.

## Platform and verifier hooks

`#[func]`s that the engine, the platform adapter or a verifier call, not the renderer:

- `isolate_clipboard(isolated: bool)`, `clipboard_text() -> String`, `set_clipboard_text(text: String)` (static, so
  `ReactUiRoot.isolateClipboard(true)` and so on). Copy, cut and paste go through `native/clipboard.rs`, which is
  `DisplayServer`'s clipboard unless isolated; an isolated clipboard is this process's memory, so a verifier run never reads or
  writes the person's. The verifiers call `isolateClipboard(true)` from `VerifierInputIsolation`; a normal run never does.
- `_on_accessibility_action`, `_on_accessibility_scroll_bar_action` and the `get_focused_accessibility_element` virtual:
  see "Accessibility". `get_text_line_elements(tag) -> Array<Rid>` returns the accessibility elements of a text input's rows so a
  verifier can make the request an adapter makes.
- `_set_text(text, emit_signal)`: the virtual keyboard's hook ("Text input"). `_on_web_clipboard_text(arguments)` and
  `_on_web_clipboard_refused(arguments)`: the `JavaScriptBridge` callbacks of a Web paste.
- Build-time classes: with cargo feature `probe` the extension also exports `ReactUiProbe` and `ReactUiProbeHandle`
  (`native/probe.rs`: handle cost and the props string boundary, phase F0; `make_handle`, `live_handles`, `noop`, `string_length`,
  `probe_parse`, `count_handles_typed`, `count_handles_untyped`) and `ReactUiTextLayoutProbe` (`native/text_layout_probe.rs`: the text
  layout checks; `case_count`, `case_name`, `show_case`, `verify`, `check_ink`). A default build has none of them. Feature `filter-faults` adds
  no class; it makes `native/filter_faults.rs` read an environment variable at each fault site, in its own library that a default
  run refuses.
