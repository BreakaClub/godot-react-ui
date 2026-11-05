# Native protocol v1

`ReactUiRoot` is a Godot `Control`; GodotJS imports it from `godot` and calls the camelCase methods `applyBatch`, `getSnapshot`, and `drainEvents`. All methods run on the Godot main thread. There are no synchronous JS callbacks from native mutable methods.

`apply_batch(json: String) -> String` accepts a JSON array of tagged commands. Empty return means success; a nonempty return describes validation failure. IDs are explicit unsigned 32-bit integers; ID 0 is the permanent viewport root. IDs must not be reused during a root's lifetime. A batch validates against a staged metadata tree before native state is changed.

```json
[
  {"op":"create","id":1,"kind":"view"},
  {"op":"style","id":1,"style":{"display":"flex","flexDirection":"column","width":"100%","padding":24,"gap":12,"backgroundColor":"#111827"}},
  {"op":"create","id":2,"kind":"text"},
  {"op":"text","id":2,"text":"Hello React"},
  {"op":"children","id":1,"children":[2]},
  {"op":"children","id":0,"children":[1]}
]
```

Commands: `create {id,kind:"view"|"text"|"button"}`, `style {id,style}`, `text {id,text}`, `children {id,children:number[]}`, `remove {id}`. `style` replaces the complete resolved style; omitted properties reset to defaults. `children` replaces ordered children and permits reparenting; cycles, duplicate children, missing IDs, and root removal are errors. `remove` removes a node and its descendants. Only mounted nodes draw, receive events, or participate in viewport layout.

Style properties (camelCase): width/height/minWidth/minHeight/maxWidth/maxHeight/flexBasis accept nonnegative numbers, `"auto"`, or percentage strings; display `flex|grid|none`; flexDirection `row|column|row-reverse|column-reverse`; flexWrap `nowrap|wrap|wrap-reverse`; flexGrow/flexShrink nonnegative numbers; gap/rowGap/columnGap, padding/paddingTop/paddingRight/paddingBottom/paddingLeft, margin/marginTop/marginRight/marginBottom/marginLeft numeric pixels; alignItems/alignSelf `start|end|center|stretch|baseline|flex-start|flex-end`; justifyContent `start|end|center|space-between|space-around|space-evenly|flex-start|flex-end`; gridTemplateColumns positive integer (equal fractional columns); backgroundColor/color/borderColor `#RGB|#RGBA|#RRGGBB|#RRGGBBAA`; fontSize positive integer; borderRadius/borderWidth nonnegative pixels; opacity 0..1; disabled boolean; textAlign `left|center|right`. Unsupported properties fail explicitly. Default is flex column, transparent background, white 16px text, no spacing, normal flex shrinking. Text is shaped and wrapped with Godot TextParagraph; no JS text measurement callback.

`get_snapshot() -> String` returns JSON `{nodes:[{id,kind,text,parent,children,rect:{x,y,width,height},style}],stats:{layoutPasses,batches,nodeCount,paintPasses,layoutMicros},width,height,hovered,focused,pressed}`. Rectangles use root-local logical pixels. Detached nodes have zero rectangles. Root ID 0 appears in nodes; nodeCount excludes it.

`drain_events() -> String` returns and clears JSON events `[{id,type,x,y}]`; event types are `pointerdown|pointerup|pointermove|pointerenter|pointerleave|click|focus|blur`. Coordinates are root-local. Native hit testing chooses the topmost mounted visible element in reverse paint order; JS handles propagation. Enabled buttons participate in Tab/Shift-Tab focus and Enter/Space activation. Pointer events retain their deepest hit element IDs. A click targets that element when press and release hit the same enabled element; when their deepest hits differ but share the same enabled button ancestor (for example button padding and its label), the click targets that button. Crossing to another button or releasing outside the pressed button does not activate it. Disabled buttons and descendants of disabled ancestors cannot activate. The root clips drawing and input to its own rectangle.

Prototype limits: no scrolling, text input/IME, accessibility tree, images, rich inline text, per-node clipping, CSS selector engine, animations, or custom native materials. Flex/grid and text shaping are native; styles arrive resolved from the JS renderer. Text color and font size are resolved per element; inheritance belongs to the JS style layer. Native drawing is one root CanvasItem with cached resources, not one Control per React element.
