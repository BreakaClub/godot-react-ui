# Track: accessibility (Phase I10, native exposure and its verification)

Branch `accessibility`, based on `5151c68`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md` and
`docs/INTERACTION_PROGRESS.md` are not edited here. This is plan I10 tasks 1 and 2 plus the verification of task 4,
for everything except scroll containers (I5) and `TextInput` (I7).

**Headline: the platform's accessibility tree could not be read, because the installed engine has no accessibility
driver.** `/Applications/Godot48.app` was built without AccessKit: `AccessibilityServer.is_supported()` is false,
`DisplayServer.has_feature(FEATURE_ACCESSIBILITY_SCREEN_READER)` is false, `SceneTree.is_accessibility_enabled()` is
false even with `--accessibility always`, and the binary contains no AccessKit symbol. So the engine never sends
`NOTIFICATION_ACCESSIBILITY_UPDATE` and nothing in `native/accessibility.rs`'s update pass has run in a real engine.
Everything else here ran (below), including the action entry point and the JS side in a real window. What Ben needs to
do is under "To finish the verification".

| What | Where | Commit |
| --- | --- | --- |
| Native fields, JS wiring, the model, the registry, the Godot glue, the `accessibilityaction` event, the slider's answer, tests | `native/props.rs`, `native/accessibility_model.rs`, `native/accessibility.rs`, `native/events.rs`, hooks in `native/lib.rs` `mount.rs` `layout.rs` `motion.rs`, `src/props.ts` `src/native.ts` `src/events.ts` `src/components.tsx` `src/index.ts` `src/types.ts` `src/kit/slider*.ts*`, `tests/*` | `a241d4c` |
| Lab scene, verifiers, AX dump tool, typings, these notes | `demo/a11y.tscn`, `demo/src/a11y-*.ts*`, `demo/src/verify-a11y.ts`, `scripts/verify-a11y.mjs`, `scripts/ax-dump.swift`, `scripts/ax-tree.mjs`, `scripts/a11y-expectations.mjs`, `demo/typings/godot7.gen.d.ts`, `demo/gen/**`, `docs/tracks/accessibility.md` | the commit after `a241d4c` |

## What the engine does (read from source, with the lines)

Engine checkout `~/Development/godot` (`50ff66187a`); the binary reports `4.8.beta.custom_build.1225394ce`.

- **The tree is built lazily, on request.** `SceneTree::_flush_accessibility_changes` (`scene_tree.cpp:304`) calls
  `AccessibilityServer::update_if_active` every frame (rate-limited by `accessibility/general/updates_per_second`),
  and the AccessKit server's `update_if_active` (`accessibility_server_accesskit.cpp:678`) only runs the update
  callback when the platform adapter is active, i.e. once an assistive client has asked for the tree. On activation
  `Window::_accessibility_activate` (`window.cpp:962`) queues every node in the window; on deactivation
  `_accessibility_deactivate` (`:969`) sends `NOTIFICATION_ACCESSIBILITY_INVALIDATE` to every node.
- **Whether accessibility is active.** `SceneTree::is_accessibility_enabled()` (`scene_tree.cpp:213`) is false unless
  the mode is `always` (`--accessibility always`) or, in `auto`, a screen reader is running
  (`DisplayServerMacOSBase::accessibility_screen_reader_active`, `display_server_macos_base.mm:490`, asks the
  application delegate whether VoiceOver is on). It also needs `FEATURE_ACCESSIBILITY_SCREEN_READER`, which macOS
  answers with `AccessibilityServer::is_supported()` (`display_server_macos.mm:859`). The extension cannot ask whether
  the *adapter* is active, only the above; the update notification only arrives when it is.
- **Only queued nodes get the notification** (`_process_accessibility_changes`, `scene_tree.cpp:252`), then the focus is
  re-read every update from `gui_focus_owner->get_focused_accessibility_element()`.
- **The parent element and the coordinate space** (`item_list.cpp:1285-1365`, `control.cpp:4429-4448`,
  `node.cpp:3742`): a `Control`'s element is made by `Node::get_accessibility_element()` and given its transform
  (`get_transform()`) and bounds `(0, 0, size)`; a sub-element made with `create_sub_element(parent_rid, role)` has no
  transform of its own and so shares its parent's space. So a sub-element's bounds are in the root's local logical
  pixels, which is what `Mounted` geometry already is. `ItemList` makes everything it exposes a sub-element of its own
  element, sets everything on an element only when that element is dirty, and forgets its RIDs (without freeing) on
  `NOTIFICATION_ACCESSIBILITY_INVALIDATE` and `EXIT_TREE`.
- **Action callbacks.** The AccessKit callback does `cb.call_deferred(rq_data)` (`accessibility_server_accesskit.cpp:211`),
  and Godot appends bound arguments after call arguments, so a callable bound with `(tag, action)` is called as
  `(data, tag, action)`: `ItemList::_accessibility_action_focus(const Variant &p_data, int p_index)`. The data is a
  float for a numeric set-value, a string for a text one, nothing for click/focus/blur/increment/decrement.
- **Two properties of the server that shape the registry** (this is why `accessibility_model.rs` has `prune` and `grow`):
  1. `free_element` is refused inside the update notification (`:598`, `in_accessibility_update`); `create_sub_element`
     is allowed there.
  2. After the platform has been sent a node, `ae->node` is null (`:670`); the next `update_set_*` on that element
     (`_ensure_node`, `:701`) starts a **new node that has only a role and a name**. So an element is either set
     completely in an update or not touched; a partial update erases the rest. A parent's child list is pushed only when
     the parent itself is re-sent, so adding or removing a child means setting the parent again.
- **`update_set_checked` takes a bool** (`:1247`); there is no mixed state. Godot's own `Tree` ignores indeterminate.
- **Focus and the mixed state** are the two places the engine's vocabulary is narrower than ARIA's; both are decisions
  below.

## Public API

```tsx
<View role="group" aria-label="Actions" aria-hidden aria-disabled aria-expanded aria-selected aria-readonly
      aria-required aria-modal aria-checked aria-valuemin aria-valuemax aria-valuenow aria-valuetext
      aria-placeholder aria-description aria-live aria-orientation
      onAccessibilityAction={(event) => { event.action; event.value; }} />
```

`role` and every `aria-*` prop are sent to native as `role` and `ariaLabel`, `ariaDescription`, `ariaValueText`,
`ariaPlaceholder`, `ariaHidden`, `ariaDisabled`, `ariaExpanded`, `ariaSelected`, `ariaReadOnly`, `ariaRequired`,
`ariaModal`, `ariaChecked` (`true | false | "mixed"`), `ariaValueMin/Max/Now`, `ariaLive`, `ariaOrientation`
(`src/props.ts`; `native/props.rs` validates: unknown role or enum value, a non-finite number, `min > max`). A boolean
whose default is false (`hidden`, `disabled`, `readonly`, `required`, `modal`) is sent only when true;
`aria-expanded`, `aria-selected` and `aria-checked` send `false` too, because absent means "not applicable".
`onAccessibilityAction` receives `increment`, `decrement` and `setValue` (with `value`) for `role="slider"`; it bubbles
and is not cancelable. The kit's `Slider.Thumb` handles it; its clicks and focus changes arrive as `click`, `focus`
and `blur`.

## Decisions

1. **`aria-orientation` is a native field** (`ariaOrientation`, `horizontal | vertical`), mapped to
   `update_set_list_orientation`, which the AccessKit server applies as the node's `orientation`
   (`accessibility_server_accesskit.cpp:1583`) for any role, not only lists. The kit sets it on the slider thumb and
   the radio group; ignoring it would throw away information it already provides.
2. **Exposure.** `Button` is a BUTTON and `Text` with content is STATIC_TEXT; a `View` is exposed only with an explicit
   role (Appendix D); `role="none"`/`presentation` is not exposed and its children attach to the nearest exposed
   ancestor; `aria-hidden`, `display: none` and Suspense's `hidden` remove the element and its subtree.
   `role="textbox"` is accepted but **not exposed yet** (a text field needs a value, selection and edit actions that
   come with `TextInput`, I7; exposing one now would claim a field the user cannot read or edit). A test pins it.
3. **Presentational children, name from content.** Roles whose children ARIA makes presentational (button, checkbox,
   switch, radio, link, menuitem*, option, tab, combobox, and `text`) are named from the text inside them
   (`aria-label` wins; an inner `aria-label` stands for the subtree) and expose none of their descendants; slider,
   progressbar and img expose none either and take their name from `aria-label` only. This is what makes the kit's
   `<Checkbox>Subscribe</Checkbox>` one element named "Subscribe", not a checkbox with a stray static-text child.
   Containers (`group`, `radiogroup`, `list`, ...) expose their children.
4. **Static text is a value, not a name**, as Godot's `Label` reports it (`label.cpp:721`): STATIC_TEXT with
   `update_set_value(text)`. `aria-label` becomes its name if given.
5. **Mixed.** `aria-checked="mixed"` is reported as unchecked plus the state description `"mixed"`
   (`update_set_state_description`), because `update_set_checked` is a bool. The verifier accepts AXValue 2 or a
   description containing "mixed", so a platform that conveys it either way passes and one that conveys neither fails.
6. **Registry: prune after a commit, grow inside the update** (`native/accessibility_model.rs`, `Registry`). After a
   commit that changes anything (`run_commit`), and after a restyle that changes `display`, the registry is pruned
   against the freshly walked tree using the commit differ (`diff::diff_children`): elements that are gone, hidden,
   under a different parent or out of order are freed (a move frees and recreates the moved element, nothing else).
   Inside the update the missing elements are created at their index and every element whose properties changed (or
   whose child list changed) is set completely. A node `Delete` frees its element at once. The walk is whole-tree, as
   plan 3.21 says; it happens only while elements exist, i.e. while an assistive technology has asked for the tree.
   `grow` reports (and `update_accessibility` logs as an error) any element that should have been pruned and was not.
7. **A dedicated `accessibilityaction` event, not a synthetic `keydown`.** `SET_VALUE` carries a number, which no key
   can express; a synthetic key would also reach app shortcuts, go to the focused element rather than the one
   addressed, and be cancelable. The event goes to the addressed node, bubbles, and cannot be prevented; `Slider.Thumb`
   handles it with the same step/clamp/commit path as its keys (`valueForAccessibilityAction`).
8. **Click, focus, blur.** CLICK queues the same `click` the keyboard queues on Enter/Space `keyup` (pointer 0, empty
   pointer type, no count) and does nothing for a disabled element; it is offered only for roles that activate
   (button, checkbox, switch, radio, link, menu items, tab, option, combobox) that are not disabled. FOCUS uses
   `focus_element(tag, visible = true)` (an assistive technology moves focus like a keyboard) after
   `is_focusable`; BLUR uses `blur_node_checked`. After each action the queue is delivered at once, because an
   assistive action is an input-origin entry point (plan 3.10 rule 1).
9. **Actions are advertised per element** from what the element is: `click` as above; `focus`/`blur` for a `Button` or
   an element with `tabIndex` that has no `disabled` prop on it or an ancestor (an `aria-disabled` element stays
   focusable); `increment`/`decrement`/`set value` for an enabled slider.
10. **Cost.** `request_accessibility_update` queues an update only while `SceneTree::is_accessibility_enabled()` is
    true; the engine delivers nothing otherwise, so with no accessibility driver or no screen reader a commit pays
    one `is_accessibility_enabled()` call per layout flush and an `is_empty()` check on the registry. With the
    mode `always` and no client, updates are queued (one set insert) but the platform never calls the update, so the
    walk does not run. That is reasoning from the engine source plus the observation that the registry stays empty
    in the run below; no timing was measured.
11. **Focus.** `get_focused_accessibility_element` returns the focused node's element, else its nearest exposed
    ancestor's, else the root's own element.
12. **Bounds** are the node's border box in root-local logical pixels (origins accumulated down the walk), no
    transforms on sub-elements; clipping ancestors are not applied, but an exposed element that clips its children has
    `FLAG_CLIPS_CHILDREN`.
13. **No `aria-valuestep`:** plan 4.2 has no such field, so the numeric step is not set; increment and decrement are
    answered by JS, which knows the step.
14. **The platform tree is read from outside the process** (`scripts/ax-dump.swift`), the Godot half changes state
    with `Input.parse_input_event`, and the two meet through files in a per-run directory
    (`scripts/verify-a11y.mjs`). The dump tool only calls `AXUIElementCopyAttributeValue`; the wrapper refuses to run if
    its source mentions a call that could act. It reads only the application's windows (its menu bar lists the user's
    recent files). Geometry is checked by fitting one scale and offset over all elements and bounding the residual,
    so a retina window (0.5 points per pixel was observed) is not a special case.
15. **Assistive actions are exercised through the callable's entry point.** The verifier calls
    `ReactUiRoot._on_accessibility_action` the way the adapter's callable does (a `Callable` bound with the tag and the
    action code, called with the request's data), because the dump tool must not perform real accessibility actions.
    That proves argument order, the native-to-JS event, and the kit's handling; it does not prove that AccessKit
    delivers a request to the callable (it is the engine's code and the shape is `ItemList`'s).

## Checks

| Command | Result |
| --- | --- |
| `cargo test --locked` | 416 passed (the model, registry, props and event wire tests are new) |
| `cargo clippy --locked --all-targets` | 0 warnings |
| `rustup run stable cargo fmt --check` | clean |
| `pnpm test:types` | clean |
| `pnpm test` | 209 passed (178 before this track), including the AX-tree helper and expectation tests |
| `pnpm build:native`, `pnpm build`, `pnpm gen:types` | succeed; typings and `demo/gen` committed |
| `node scripts/verify-a11y.mjs` (once, then once more after its last edit) | the Godot-side half passes in a real window; the run then reports that the platform tree was not verified (exit 2) |

The Godot-side half (`demo/src/verify-a11y.ts`, `GODOT_REACT_A11Y_NATIVE_PASSED`) checks, in a window with Godot's own
input: the native props of the lab as snapshot reports them (including `ariaChecked: "mixed"`), Space on a checkbox,
a switch and a radio item changing `ariaChecked` natively, the arrow key moving the slider, and then, through the
bound-callable entry point, a click action pressing Save and doing nothing on a disabled button, focus and blur actions
moving focus, increment/decrement/set-value (including a value past the end) moving the slider, and the root keeping
Godot key focus. A first run of it failed on a real defect (a set-value of `300` arrives as an integer variant and was
rejected); fixed in `requested_number`.

`scripts/ax-dump.swift` was run against the lab window on this machine and works (8 nodes: the window, its title bar
buttons and title, no content, which is what an engine without AccessKit exposes). The expectations for the real tree
are tested against hand-written readings, including readings that are wrong in each way the checks look for
(`tests/a11y-expectations.test.ts`, `tests/ax-tree.test.ts`); they encode what AccessKit's macOS adapter is expected to
show (`AXButton`/`AXCheckBox`/`AXRadioButton`/`AXSlider`, names in `AXTitle` or `AXDescription`, `AXValue` 0/1 for
toggles) and have never met the real adapter, so a first real run may need them adjusted.

Not run, by the brief: `pnpm verify`, `pnpm verify:motion`, `pnpm verify:interaction` and the Web verifiers. The commit
path changed by one call each in `run_commit`, `delete_node`, `flush_layout`, `set_focus` and `publish_style_changes`,
all no-ops unless accessibility is enabled; the coordinator's merge gate should run them.

## To finish the verification

1. **An engine with AccessKit.** The SDK is present in the engine checkout (`bin/build_deps/accesskit`, with
   `lib/macos/arm64/static`), and `platform/macos/detect.py` links it and defines `ACCESSKIT_ENABLED` by default; if the
   path is missing it prints a warning and builds without it, so a build run from a tree that lacks
   `bin/build_deps/accesskit` (or with `accesskit=no`) gives exactly this binary; the build flags of Godot48 were
   not inspected. Rebuild Godot48 with
   `accesskit_sdk_path=/Users/ben/Development/godot/bin/build_deps/accesskit` (and check the build log for the
   AccessKit warning), then `strings` the binary for `accesskit_macos_subclassing_adapter_for_window`.
2. **macOS Accessibility permission** for the process that runs `pnpm verify:a11y`: System Settings > Privacy &
   Security > Accessibility. On this machine `AXIsProcessTrusted()` is already true for the agent's process, so no
   grant was needed here; the wrapper stops with exactly this message (exit 3) if it is missing.
3. `GODOT=<that engine> pnpm verify:a11y`. Evidence goes to `artifacts/native-a11y/run-*/` (`ax-before.json`,
   `ax-after.json`, `ready.json`, `mutated.json`, `run.log`).
4. **VoiceOver, manually, not done:** with the lab running (`godot --path demo res://a11y.tscn`, no
   `--verify-a11y`), turn VoiceOver on and check that the order, names and states read as the table in the verifier
   (`scripts/a11y-expectations.mjs`) says, that VO-Space presses Save, that adjusting the slider with VO-Up/Down
   changes Volume, and that the hidden text is skipped.

Web is not claimed. `DisplayServer.hasFeature(FEATURE_ACCESSIBILITY_SCREEN_READER)` was recorded on native macOS only
(false on this engine); recording it on Web needs a Web build and a browser run, which was not cheap.

## Deferred

- **Scroll containers (I5):** `SCROLL_VIEW`, the scroll offsets and ranges, the scroll actions
  (`SCROLL_UP/DOWN/LEFT/RIGHT`, `SET_SCROLL_OFFSET`, `SCROLL_INTO_VIEW`), and a transform on the scrolled content's
  element as `ItemList` does. No placeholder code exists for them.
- **`TextInput` (I7):** `TEXT_FIELD`/`MULTILINE_TEXT_FIELD`, value, placeholder, read-only, selection through
  `create_sub_text_edit_elements`, and the set-selection and replace-text actions. `role="textbox"` is parsed and not
  exposed until then.
- Translating the `"mixed"` description; `tooltip` text and `ACTION_SHOW_TOOLTIP`; `aria-labelledby`/`describedby`
  relations (`update_add_related_*`); a numeric step; list/tree item counts and positions (`set size`/`position in
  set`); `aria-live` regions are sent but untested.

## Merging notes (shared files touched)

Small and local, in the places the positioning and text-layout tracks also edit: `native/props.rs` (new enums before
`TransitionSpec`; 18 fields at the end of `PropsSpec`, `PropsDiff` and `with_diff`; `validate`), `native/lib.rs`
(two `mod` lines, a field, three notification arms, the focused-element virtual, one `#[func]`, one line in
`set_focus`), `native/mount.rs` (a block at the end of `run_commit`, one line in `delete_node`), `native/layout.rs`
(one line), `native/motion.rs` (one line), `native/events.rs` (a variant and two types), `src/components.tsx` (an import
and one prop), `scripts/build.mjs` (one `build()` call), `package.json` (one script), `tests/recording-host.ts` (one
helper). `tests/prop-tree.ts` is deleted: it existed only to read the aria props back before they reached native.
