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

JS compiles `className` and `style` once per distinct input into ordered **layers** (`src/styles.ts`;
shorthands `padding`, `margin`, `gap`, `overflow` and `inset` are expanded to longhands there). Native resolves
a node's **computed style**: its parent's inherited properties (`color`, `fontSize`, `textAlign`,
`interpolateSize`, `pointerEvents`, `cursor`), then every layer whose conditions hold, in order. A layer applies when the root's
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
pixels; opacity 0..1; textAlign `left|center|right`; pointerEvents `auto|none` and cursor
`default|pointer|text|move|grab|grabbing|not-allowed|crosshair|wait|progress|help|ew-resize|ns-resize|nesw-resize|nwse-resize`
(both inherited; see "Godot co-operation" below); transition, interpolateSize and overflowX/overflowY
`visible|hidden` as described below. `position` is `static|relative|absolute|fixed` (not inherited; `sticky` is
rejected), `top`/`right`/`bottom`/`left` are finite numbers (negative allowed), percentage strings (negative
allowed) or `"auto"`, and `zIndex` is a 32-bit integer; see "Positioning and stacking" below. Unsupported properties fail explicitly. Default is a flex column,
transparent background, white 16px text, no spacing, normal flex shrinking. Text is shaped and wrapped
with Godot `TextParagraph`; there is no JS text measurement callback.

## Mounted tree, geometry, paint

The mounting layer (`native/mount.rs`) owns one record per tag: props, computed style, Taffy node,
Godot paint resources, canvas items and geometry. Layout runs on Taffy's retained tree and Taffy
caches clean subtrees. After layout, only the children of an ancestor of a changed node (or of a node
whose size changed) are compared with the stored geometry; a changed location moves one canvas item.

Each element owns two retained canvas items mirroring the view hierarchy (`native/render_tree.rs`): a
**box** item (transform = location in its parent, modulate alpha = opacity, draws background and border)
with a **content** item below it (clips to the padding box when `overflow` is `hidden`, draws text, and
parents the child boxes). Sibling order is the child-list order. Layer 0 and layer 1 each have a root
item; the focus ring is a top-most item above both. Only an element whose own visuals or size changed
re-records; an idle frame records nothing.

Native hit testing descends the **paint tree** in reverse paint order, the overlay layer first, and hands a
point to a clipping element's paint children only inside its padding box. An element whose computed `pointerEvents` is `none` is never
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
  `ns-resize` VSIZE, `nesw-resize` BDIAGSIZE, `nwse-resize` FDIAGSIZE); over nothing it is ARROW.
- **Key focus.** The root's focus mode is click-only and `ready()` does not grab focus. It holds Godot key focus
  only when its owner calls `grab_focus()` or an element is focused. Godot grants key focus to a focusable
  Control on every left press that reaches it, before any handler runs, so a primary press that leaves no element
  focused (a press on something that cannot take focus, or one whose `pointerdown` was prevented with nothing
  focused) hands key focus back: keys then go to the game. A key press in flight (Enter or Space held) ends if the
  root loses key focus; a mouse press does not, because Godot routes it by mouse focus, not key focus.
- **Keys.** Tab and Shift+Tab are consumed only if element focus moved. Enter and Space are consumed only when
  they press or release a focused enabled button. Every other key is left for `_unhandled_input`.
- **Wheel.** `force_pass_scroll_events` is set. A wheel tick (`WHEEL_UP|DOWN|LEFT|RIGHT` press; the release Godot
  sends with it is not a tick) and a trackpad pan gesture each queue a cancelable `wheel` at the pointer. The event
  is consumed only if JS calls `preventDefault()` (scrolling is added by Phase I5); otherwise it continues to
  `_unhandled_input`.

A click targets the deepest element when press and release hit the same enabled element; when their
deepest hits differ but share the same enabled button ancestor (for example button padding and its
label), the click targets that button. Crossing to another button or releasing outside the pressed
button does not activate it. Disabled buttons and descendants of disabled ancestors cannot activate.

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
  `copy`, `move` or `link` (drag and drop is not implemented yet).
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
  `isComposing` (always false until Phase I7) and the four modifiers; `keydown` is cancelable (see "Focus and
  keyboard"). `focus` and `blur` carry `relatedTarget` (the element on the other side of the change, or `null`)
  and `focusVisible` (the new focus, for `focus`; the old one, for `blur`).
  Only a mouse `pointerdown` on an enabled element is cancelable; its default action is focusing the nearest
  enabled button (and taking Godot key focus), which `preventDefault()` skips. `click` still follows a prevented
  `pointerdown`, as in browsers.
- Native emits one `pointerleave` (target the element left, `relatedTarget` the element entered) and one
  `pointerenter` (target the element entered, `relatedTarget` the element left). JS dispatches them to the
  elements actually crossed, below the lowest common ancestor, without bubbling.
- Enter/Space on a focused button makes one `click` with `pointerId: 0`, `pointerType: ""` and `detail: 0` when the
  key is released (not cancelable). No `pointerdown` or `pointerup` is made up for it.
- A press in flight when the window loses OS focus is cancelled natively (Godot drops mouse focus and its
  synthetic release never reaches `gui_input`): JS gets `pointercancel`.

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
  `detail` on `click`, `auxclick` and `dblclick` is the count of the press. A click needs press and release on the
  same element, or on two parts of one enabled button; a pointer an element captured clicks that element if the
  press began inside it. Pressing a disabled element or releasing outside the pressed one does not click.
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

Rules native follows: only input callbacks emit (`gui_input`); `commit`, lifecycle notifications and `process()`
queue events for the next emission or the owner's per-frame `dispatchEvents()`. Input that arrives while JS is
inside a dispatch is queued with `cancelable: false`. After the emission everything native knew before it is
stale: it looks the target up again (lookups return `Option`), skips the default action if the target was
removed, and does nothing further if the root left the scene tree. JS may call `commit`, `get_snapshot` and
`resolve_event` on the same root while native is inside the emission (godot-rust re-borrows through
`base_mut()`). A handler that throws does not stop the JS drain loop; the first error is rethrown after it
finishes. The JS drain loop is bounded at 64 rounds.

Godot's `Input` dispatches every `InputEventGesture` twice (once explicitly and once with every event,
`core/input/input.cpp:995-1003` and `:1046-1048`), so a pan gesture, real or parsed, reaches JS as two `wheel` events
with the same deltas, exactly as it reaches Godot's own `ScrollContainer`. Native does not filter this.

Limits: no scrolling, text input/IME, text selection, accessibility tree, images, rich inline text, rounded clip
masks, `position: sticky`, CSS stacking contexts (`zIndex` orders siblings of one paint parent), a public CSS stylesheet/selector API, arbitrary keyframe animations, or custom native
materials. Both overflow axes clip together (`hidden` on either clips the padding box). Native drawing uses owned
CanvasItem RIDs with cached resources and one Control for the whole React tree.

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
