# Native API v2: the Fabric-style commit protocol

`ReactUiRoot` is a Godot `Control`; GodotJS imports it from `godot` and calls the camelCase methods
`commit`, `takeCommitDeletions`, `getSnapshot`, `getNodeRect`, `findByTestId`, `drainEvents` and
`resolveEvent`, and connects to its `eventsReady` signal. All methods run on the Godot main thread.
Commits and queries never call back into JS; the only native-to-JS call is the `eventsReady`
emission described under "Input events".

The architecture is React Native Fabric's (`docs/INTERACTION_PLAN.md`, sections 3 and 4). React runs
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

- `created`: nodes new to this root with their full props. `kind` is `view`, `text` or `button`.
  `Text` carries its string in the `text` prop and has no children; a `Button` renders its label
  through a child `Text`.
- `updated`: mounted nodes with a props diff. An absent key is unchanged and JSON `null` resets the
  key to its default.
- `children`: every node whose child list changed, and every created node that has children; tag `0`
  is the layer's own list of top-level nodes.
- Everything is parsed with `deny_unknown_fields`: an unknown key anywhere is an error.

Validation (`native/commit.rs`) happens before any change: created tags are nonzero, never used
before and unique; updated tags are mounted in this layer (or created by this payload) and appear
once; child lists name mounted-or-created nodes of this layer, each at most once, and only `view` and
`button` nodes have children; every node ends with at most one parent and none is its own ancestor;
every created node ends up attached; a list for a node the same payload detaches is rejected; merged
props are valid for the node's kind. A style the motion engine cannot animate (below) is also a
rejection. After validation the plan (`MountingTransaction`) applies in the order Remove, Delete,
Create, Update, Insert; a removed node that is not inserted elsewhere in the payload is deleted
together with its mounted descendants, and a node moved to another parent is not.

`take_commit_deletions() -> PackedInt64Array` returns the tags the last successful `commit` deleted,
so JS drops its instances and public handles.

## Props and styles

| Prop | Type |
| --- | --- |
| `style` | `{layers: [{minWidth?: number, states?: [...], style: {...}}]}` |
| `text` | string (`text` nodes only) |
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

JS compiles `className` and `style` once per distinct input into ordered **layers** (`src/styles.ts`;
shorthands `padding`, `margin`, `gap`, `overflow` and `inset` are expanded to longhands there). Native resolves
a node's **computed style**: its parent's inherited properties (`color`, `fontSize`, `textAlign`,
`interpolateSize`, `pointerEvents`, `cursor`, `scrollbarColor`, `userSelect`, `selectionColor`, `caretColor`, `placeholderColor`), then every layer whose conditions hold, in order. A layer applies when the root's
logical width is at least its `minWidth` and every listed state holds: `hover` and `active` apply to the
target and its ancestors; `focus` and `focusVisible` to the focused element only; `focusWithin` to it
and its ancestors; `disabled` to a node whose own `disabled` prop is true. Hover, press, focus and
breakpoint changes restyle only the nodes whose style uses the state or threshold that changed, with no
JS and no React work. A mouse press stays `active` only while the pointer is inside it; a key press
until the key is released.

Style longhands (camelCase): width/height/minWidth/minHeight/maxWidth/maxHeight/flexBasis accept
nonnegative numbers, `"auto"`, or percentage strings; display `flex|grid|none`; flexDirection
`row|column|row-reverse|column-reverse`; flexWrap `nowrap|wrap|wrap-reverse`; flexGrow/flexShrink
nonnegative numbers; rowGap/columnGap, paddingTop/Right/Bottom/Left (nonnegative) and
marginTop/Right/Bottom/Left (finite) numeric pixels; alignItems/alignSelf
`start|end|center|stretch|baseline|flex-start|flex-end`; justifyContent
`start|end|center|space-between|space-around|space-evenly|flex-start|flex-end`; gridTemplateColumns a
positive integer (equal fractional columns); backgroundColor/color/borderColor
`#RGB|#RGBA|#RRGGBB|#RRGGBBAA`; fontSize a positive integer; borderRadius/borderWidth nonnegative
pixels; opacity 0..1; textAlign `left|center|right`; overscrollBehavior `auto|contain`, scrollbarWidth `auto|none`,
scrollbarColor (a hex colour, inherited) and touchAction `auto|none|pan-x|pan-y` (see "Scrolling" below); pointerEvents `auto|none` and cursor
`default|pointer|text|move|grab|grabbing|not-allowed|crosshair|wait|progress|help|ew-resize|ns-resize|nesw-resize|nwse-resize`
(both inherited; see "Godot co-operation" below); userSelect `none|text` and selectionColor (a hex colour), both inherited (see "Text selection" below); transition and interpolateSize as described below; overflowX/overflowY
`visible|hidden|scroll|auto` ("Scrolling" below). `position` is `static|relative|absolute|fixed` (not inherited; `sticky` is
rejected), `top`/`right`/`bottom`/`left` are finite numbers (negative allowed), percentage strings (negative
allowed) or `"auto"`, and `zIndex` is a 32-bit integer; see "Positioning and stacking" below. Unsupported properties fail explicitly. Default is a flex column,
transparent background, white 16px text, no spacing, normal flex shrinking. Text is shaped and wrapped
with Godot `TextParagraph`; there is no JS text measurement callback.

A node's `kind` is `view`, `text`, `button` or `textinput`. A `textinput` has no children and no `text`: its text lives in
a native edit buffer ("Text input" below). `caretColor` and `placeholderColor` are hex colours (inherited): the caret is drawn
in the text colour and the placeholder in the text colour at half alpha when they are not set.

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
item; the focus ring is a top-most item above both. Only an element whose own visuals or size changed
re-records; an idle frame records nothing.

Native hit testing descends the **paint tree** in reverse paint order, the overlay layer first, and hands a
point to a clipping element's paint children only inside its padding box, plus the scroll offset for a scroll container
(and a scrollbar thumb of a container is hit before the content it covers). An element whose computed `pointerEvents` is `none` is never
the hit, but its children are still tested (CSS semantics). The root clips drawing and input to its own
rectangle. Enabled buttons participate in Tab/Shift-Tab focus (document order) and Enter/Space activation.

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
out-of-flow elements only (plan 3.2, invariant 6, named exception). A childless element is laid out by Taffy as a
leaf, which does not replace the list of out-of-flow boxes it was the containing block of; `layout::compute_tree` gives
leaf output the positioning area of an empty container so that the list is replaced when its last child goes.

## Godot co-operation

The root is one `Control` among the game's own (plan 3.11), so it passes on what React does not use.

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
- **Key focus.** The root's focus mode is click-only and `ready()` does not grab focus. It holds Godot key focus
  only when its owner calls `grab_focus()`, an element is focused or a text selection exists. Godot grants key focus to a focusable
  Control on every left press that reaches it, before any handler runs, so a primary press that leaves no element
  focused (a press on something that cannot take focus, or one whose `pointerdown` was prevented with nothing
  focused) hands key focus back: keys then go to the game. A key press in flight (Enter or Space held) ends if the
  root loses key focus; a mouse press does not, because Godot routes it by mouse focus, not key focus.
- **Keys.** Tab and Shift+Tab are consumed only if element focus moved. Enter and Space are consumed only when
  they press or release a focused enabled button. `ui_copy` is consumed only when it copied a selection and
  `ui_text_select_all` only when something is selectable. Every other key is left for `_unhandled_input`.
- **Wheel.** `force_pass_scroll_events` is set. A wheel tick (`WHEEL_UP|DOWN|LEFT|RIGHT` press; the release Godot
  sends with it is not a tick; a `factor` of 0 means 1) and a trackpad pan gesture each queue a cancelable `wheel`
  at the pointer. The event is consumed only if JS calls `preventDefault()`, or its default action (scrolling, below)
  took it; otherwise it continues to `_unhandled_input`.

A click targets the deepest element when press and release hit the same enabled element; when their
deepest hits differ but share the same enabled button ancestor (for example button padding and its
label), the click targets that button. Crossing to another button or releasing outside the pressed
button does not activate it. Disabled buttons and descendants of disabled ancestors cannot activate.

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
- **Touch**: after an un-prevented primary `pointerdown`, a finger that moves beyond 8 px starts a pan if `touchAction`
  (intersected from the touched element outwards) allows the axis and a container can move that way; the pointer is cancelled
  (`pointercancel`, no `click`), the owner follows the finger (latched to it, from where the slop was crossed) and coasts when
  the finger lifts. A touch that cannot pan stays pointer events. A touch that lands on a coasting container stops it and
  does not click.
- **Scrollbars**: thumbs are drawn in the overlay item (`scrollbarWidth: none` hides them, `scrollbarColor` colours them; default
  `#64748b99`) and are the only part that takes a pointer; dragging one moves the content with the mouse (no click follows).
- **Events**: `scroll` (`scrollLeft`, `scrollTop`, `scrollWidth`, `scrollHeight`, `clientWidth`, `clientHeight`; target only,
  not cancelable) is queued whenever an offset changes (input, command, flick or layout re-clamp), one per container while it
  waits for JS. Scrolling never commits, lays out, restyles or re-records boxes or content: `get_snapshot().stats` shows
  `scrollUpdates` and `overlayRecords` and nothing else changing.
- **Commands**: `scroll_to(tag, left, top)`, `scroll_by(tag, dx, dy)` and `scroll_into_view(tag)` return an error string (empty
  for success; a node that is not a scroll container, or a non-finite number, is an error) and end any flick;
  `get_scroll_state(tag)` returns the container's state as JSON (the event's fields, `minScrollLeft`, `maxScrollLeft`,
  `minScrollTop`, `maxScrollTop`, the drawn `thumbs` and the `tracks` of the axes that scroll, drawn or not) or `null`. `get_snapshot()` gives every node a `scroll` field with the same.
- **Frames**: `process()` runs only while native motion is running, a flick is coasting or a finger is panning
  (`update_process()` is the one decision).

## Text selection

The document has one text selection (`native/selection_input.rs`; the Godot-free model is `native/selection.rs`, the
offset conversions `native/text_offsets.rs`, the geometry over Godot's `TextParagraph` and `TextServer`
`native/text_layout.rs`). Only `Text` elements with a computed `userSelect: text`, outside any `Button` and not under
`display: none`, can hold an end of it; a `userSelect: none` element between the ends contributes no range and no text.
A `Document` (the `Text` nodes in document order, with their length in code points and whether they are selectable) and
a text layout are built when a gesture, a key or a query needs them and are dropped after it: nothing is built on a
commit path. The model works in code points; every offset that crosses to JS is a UTF-16 code unit offset.

- **Gestures** (mouse only; plan 3.12 rule 5, after a pointer JS captured and after a scrollbar thumb). An un-prevented
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
- **Keys.** With the root holding key focus and no `TextInput` focused (Phase I7), the `ui_copy` action puts the selected
  nodes' text, one per non-empty range, joined by `\n`, on the clipboard (`DisplayServer.clipboard_set`) and the
  `ui_text_select_all` action selects from the start of the first selectable text to the end of the last. Matching is
  `event.is_action("ui_copy", true)`, so it needs the device an `InputMap` event has (a real keyboard's).
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
- **Events**: `selectionchange` is addressed to the root listeners (target 0, empty path), is not cancelable and has no
  payload; a change queues one, and one still waiting for JS is updated in place. JS asks the root for the selection.
- **Queries and commands**: `get_selection() -> String` is `null`, or `{"anchor": {"tag", "offset"}, "focus": {"tag",
  "offset"}, "isCollapsed", "text"}` (`text` is what copying gives; the anchor may come after the focus);
  `clear_selection()` drops it and queues `selectionchange` if there was one. JS: `root.getSelection()` (element handles
  and offsets), `root.clearSelection()`, `root.addEventListener('selectionchange', ...)` and the `useTextSelection()` hook.
- Not built: word-granularity drag after a double click, caret affinity at wraps and direction changes, highlighting a
  selected line break, auto-scroll while dragging, touch selection handles, selection inside a `TextInput` (Phase I7).

## Queries

- `get_snapshot() -> String`: `{nodes, stats, width, height, hovered, focused, pressed, focusVisible,
  clockMs, transitions}`. Each node is `{id, kind, layer, text, parent, children, paintParent, paintIndex,
  documentIndex, rect, clipRect, style, props, presentation}`: `id` is the tag, `parent` and `children` are the React
  tree's, `paintParent` is who paints the node (`parent`'s rule, `0` for the main layer's root, `null` in the overlay)
  and `paintIndex` its place, back to front, among what that paint parent paints, `documentIndex` its pre-order place
  (node 0 reports `-1`), `rect` is root-local logical pixels, `clipRect` the clip its paint ancestors impose (or `null`), `style` the node's **computed** style (unset properties omitted) and `props`
  the native props it was last given. Node `0` stands for the main layer's root (`parent: null`); layer 0's
  top-level nodes report `parent: 0`, layer 1's report `null` and `layer: 1`. `stats` is
  `{layoutPasses, batches (= commits), commits, nodeCount, paintPasses, layoutMicros, nodesCreated,
  nodesUpdated, nodesDeleted, mutations, boxRecords, contentRecords, animationFrames}`: `mutations` counts
  the removes, deletes, creates, updates and inserts applied, `boxRecords` and `contentRecords` the canvas
  command lists re-recorded. `nodeCount` excludes node 0. Whole-tree by design: diagnostics only.
- `get_node_rect(tag: int) -> String`: the root-local rectangle as JSON, or `null`.
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
  Enter and leave events also carry `relatedPath`, the other side's path. `wheel` carries the same pointer fields
  (`button` -1, `pointerType` `"mouse"`) plus `deltaX,deltaY` in wheel ticks, positive down and right: one per notch
  of a discrete wheel, scaled by Godot's `factor` (or a pan gesture's `delta`) for smooth devices, which is what
  `ScrollContainer` scales by page / 8. It is cancelable. `keydown` and `keyup` carry `key`, `code`, `repeat`,
  `isComposing` (true while a text input is composing) and the four modifiers; `keydown` is cancelable (see "Focus and
  keyboard"). `focus` and `blur` carry `relatedTarget` (the element on the other side of the change, or `null`)
  and `focusVisible` (the new focus, for `focus`; the old one, for `blur`).
  Only a mouse `pointerdown` on an enabled element is cancelable; its default action is focusing the nearest
  enabled button (and taking Godot key focus), which `preventDefault()` skips. `click` still follows a prevented
  `pointerdown`, as in browsers.
- Drag events (`dragstart`, `drag`, `dragenter`, `dragleave`, `dragover`, `drop`, `dragend`) carry the pointer fields
  above (`button` -1, `buttons` 1 while the pointer is held and 0 for `drop` and `dragend`), `sessionId` (the drag's
  number; every event of one drag has the same) and, for `dragenter` and `dragleave`, `relatedTarget`. `dragend` also
  carries `dropEffect` and `endedOutsideRoot`. `dragstart`, `dragover` and `drop` are cancelable. See "Drag and drop".
- Native emits one `pointerleave` (target the element left, `relatedTarget` the element entered) and one
  `pointerenter` (target the element entered, `relatedTarget` the element left). JS dispatches them to the
  elements actually crossed, below the lowest common ancestor, without bubbling.
- Enter/Space on a focused button makes one `click` with `pointerId: 0`, `pointerType: ""` and `detail: 0` when the
  key is released (not cancelable). No `pointerdown` or `pointerup` is made up for it.
- A press in flight when the window loses OS focus is cancelled natively (Godot drops mouse focus and its
  synthetic release never reaches `gui_input`): JS gets `pointercancel`.

## Text input

A `textinput` node (`<TextInput>`, `src/text-input.tsx`) owns an `EditBuffer` (`native/text_input.rs`: text, anchor and
focus, undo and redo, the IME composition, `maxLength`, read-only and secure modes) in per-tag state
(`native/text_input_godot/`). Offsets that cross to JS are UTF-16 units (`native/text_offsets.rs`). It measures
`TEXT_INPUT_DEFAULT_COLUMNS` (20) advances of `0` wide and one line tall (or `rows` lines for a multi-line input) at its
font size, whatever it holds, so typing never lays out; a long value scrolls.

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
- **Pointer.** An un-prevented primary press on a text input places the caret (Shift extends from the anchor), a
  double click selects the word, a triple click everything, and dragging with the button held extends the selection (by
  words after a double click); a press that focuses a `selectOnFocus` input selects everything instead. The pointer
  over a text input is the text cursor unless its style says otherwise.
- **Painting.** The selection, the text (or the placeholder), the IME preedit's underline and the caret are drawn into two
  canvas items under the node's `scroll` item, so following the caret is a transform: a single-line input scrolls
  horizontally and a multi-line one vertically (and is a scroll container for wheel, touch pans and thumb dragging, with
  chaining to the container around it). The caret blinks (650 ms) in the focused input while its window has focus, draws
  both of `TextServer`'s carets and the direction markers as `LineEdit` does, and is plain on an empty line. The selection of
  an input that is not focused is kept (`selectionStart`) but not drawn. Colours: `color`, `caretColor`, `placeholderColor`
  and a fixed selection colour (`#3b82f659`).
- **Platform.** Gaining focus starts the IME and shows the on-screen keyboard where the engine has them (`FEATURE_IME`,
  `FEATURE_VIRTUAL_KEYBOARD`); `NOTIFICATION_OS_IME_UPDATE` becomes the preedit, and `_set_text` (the Web virtual
  keyboard's hook) an `insertReplacementText` edit with the caret at 0. Copy, cut and paste use `DisplayServer`'s clipboard,
  except that on the Web a paste asks the browser (`navigator.clipboard.readText()` through `JavaScriptBridge`) and pastes
  when it answers, because `clipboard_get` there returns the text the previous call read; a refused read is logged and
  pastes nothing. IME and keyboard calls run with the root's base guard held, since the Web engine notifies every node
  of a window focus change from inside them.
- **Accessibility.** A `TextInput` is a text field (`TEXT_FIELD`, or `MULTILINE_TEXT_FIELD` with `multiline`) whatever
  its `role`, which can only remove it (`none`, `presentation`). It is named by `aria-label`, else its `placeholder`; its
  text is not a value but one element per line of the shaped display text (`create_sub_text_edit_elements`, bullets for a
  secure input, the preedit spliced in), placed in the root's space and freed and made again when the text, the shaping
  or the box it wraps to changes; its selection is `update_set_text_selection` against those elements. Actions: focus,
  `set text selection` (`{start_char, end_char}`, code points of the display text), and, unless `readOnly` or disabled,
  `replace selected text` (an `insertText` edit) and `set value` (an `insertReplacementText` edit with the caret after it),
  both through `beforeinput`. Not read from a platform tree: the engine that runs this project has no accessibility driver.

## Focus and keyboard

- **Focusable** (`native/focus.rs`, unit tested): a `Button`, or any element with a `tabIndex` (`0` or `-1`; any
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
  press began inside it. Pressing a disabled element, releasing on one, releasing over nothing or beyond the root,
  or releasing over an element with no ancestor in common with the pressed one (another layer or top-level
  element) does not click.
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

Rules native follows: only input callbacks emit (`gui_input`, and `input` while a drag runs); `commit`, lifecycle
notifications and `process()` queue events for the next emission or the owner's per-frame `dispatchEvents()`. The
one exception is a drag's own timers in `process()` (a touch held long enough, a scroll under a stationary pointer),
whose cancelable `dragstart` and `dragover` must be answered synchronously like any other (see "Drag and drop"). Input that arrives while JS is
inside a dispatch is queued with `cancelable: false`. After the emission everything native knew before it is
stale: it looks the target up again (lookups return `Option`), skips the default action if the target was
removed, and does nothing further if the root left the scene tree. JS may call `commit`, `get_snapshot` and
`resolve_event` on the same root while native is inside the emission (godot-rust re-borrows through
`base_mut()`). A handler that throws does not stop the JS drain loop; the first error is rethrown after it
finishes. The JS drain loop is bounded at 64 rounds.

Godot's `Input` dispatches every `InputEventGesture` twice (once explicitly and once with every event,
`core/input/input.cpp:995-1003` and `:1046-1048`), so a pan gesture, real or parsed, reaches JS as two `wheel` events
with the same deltas, exactly as it reaches Godot's own `ScrollContainer`. Native does not filter this.

Limits: no touch text selection, accessibility tree, drag and drop with Godot `Control`s (the plan's
3.19: `_can_drop_data` is synchronous on `&self`, where a JS answer cannot be had; `endedOutsideRoot` plus the release
point is what a game uses) or with files or `setDragImage`, images, rich inline text, rounded clip
masks, `position: sticky`, CSS stacking contexts (`zIndex` orders siblings of one paint parent), a public CSS stylesheet/selector API, arbitrary keyframe animations, or custom native
materials. Both overflow axes clip together (`hidden`, `scroll` or `auto` on either clips the padding box). Not scrolling: scrollbar
track clicks (paging), animated programmatic scrolling, overscroll bounce, `position: sticky`. Native drawing uses owned
CanvasItem RIDs with cached resources and one Control for the whole React tree.

## Drag and drop

HTML drag and drop inside one root (`native/drag.rs` is the Godot-free state machine, 50 unit tests;
`native/drag_input.rs` is the glue; `native/drag_ghost.rs` the ghost; `src/data-transfer.ts` and `src/drag.ts` the
JS half). `draggable` and `dragPreview` are props (above).

- **Arbitration** (plan 3.12 rule 3). After an un-prevented primary `pointerdown` whose pointer no element captured
  and that is not on a scrollbar thumb, a press inside a `draggable` element (the nearest one at or above the press,
  unless it or an ancestor is `disabled`) is offered to the machine; it is **pending**. A mouse becomes a drag when it
  is further than `Viewport.gui_drag_threshold` (read at the press; 10 by default) from where it went down; a touch
  when it has stayed within the 8 px slop for 500 ms (`TOUCH_DRAG_HOLD_MS`, `process()` ticks the timer, and
  the machine also advances it on the next input). A touch that moves beyond the slop first is declined and goes on to
  pan or stay pointer events (touch pans register after the drag offer, rule 4). A touch that stopped a coasting flick
  starts nothing.
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
  It is a snapshot (no scrollbars, no later changes), and the root's clip applies. `none` draws nothing.
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

A node whose computed style has `transition: {properties: ('width'|'height'|'opacity'|'backgroundColor')[],
durationMs: number, delayMs?: number, easing?: 'linear'|'ease'|'ease-in'|'ease-out'|'ease-in-out'}` is a
*motion node*. Duration and delay are finite nonnegative milliseconds. Easing defaults to CSS `ease`. A retained
Blitz/Stylo style tree owns numeric/color interpolation, delay and reversal shortening. Every mounted node has an
element in it, kept in tree order (`insert`, `remove`, `set_children`), but a node's style is written to it only
while the node is a motion node or has just stopped being one (which cancels what was running); a node that gains
a `transition` in the change that changes a value is first given its previous style, so it animates from it.
Only motion nodes are sampled and presented differently from their computed style (decision D9). One root-owned Godot process clock advances it; no JS
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
scissor clipping: border radius affects paint, not the clip shape. Nested rounded masks are not claimed.

Per-node `presentation: {width,height,widthIsAuto,heightIsAuto,opacity,backgroundColor}` and the snapshot's
`transitions: [{id,property,current,target,startedAtMs,durationMs}]` report what is being presented; dimension and
opacity diagnostics are numbers and colors are hexadecimal RGBA strings. The `widthIsAuto` and `heightIsAuto` flags
read the actual Taffy presentation style. Transition records are native tracking diagnostics, not access to Stylo's
private per-property animation table.

`get_activity() -> String` provides compact JSON `{batches,layoutPasses,paintPasses,animationFrames,animating,
trackedTransitions,clockMs,drawSerial,nodeCount}` (`batches` counts commits; `drawSerial` is the paint pass count,
which advances only when native changed something visible). `animating` reflects actual global Stylo activity or
owned intrinsic transitions; use it for completion. `set_profiling(enabled: bool)` controls an off-by-default
512-sample ring; `take_profile() -> String` drains `{samples,dropped,counters}`. Samples have
`kind: 'batch'|'frame'|'draw'`: a `batch` record is one `commit` (parse, validate-and-plan-and-dry-run, mount,
layout, geometry and total microseconds), a `frame` record one animation tick (style, measure, layout, geometry,
animation microseconds), and a `draw` record the CPU microseconds of a paint pass that re-recorded canvas items.
Nested layout/geometry timings are subtracted from their surrounding bookkeeping phases. Timings measure CPU work,
not GPU completion. Profiling drops the oldest sample at capacity and reports how many were dropped.
