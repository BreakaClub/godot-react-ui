# Track: accessibility (Phase I10, native exposure and its verification)

Branch `accessibility`, rebased onto main `a98df16` (positioning, the shared verifier isolation and text layout). Notes and report for the coordinator; `docs/INTERACTION_PLAN.md` and
`docs/INTERACTION_PROGRESS.md` are not edited here. This is plan I10 tasks 1 and 2 plus the verification of task 4,
for everything except `TextInput` (I7); scroll containers (I5) were added on the `scroll` branch (D38).

**Update (stock-engine track, 6 November 2026): the platform tree has since been read, on a stock Godot 4.7.2 built with
AccessKit, and `verify:a11y` passes against it (`docs/tracks/stock-engine.md`, S7 to S9). The two expectations that failed
were the group "Size" and the mixed checkbox, which this engine cannot convey; the lab's verifier also stopped making its
window unfocusable, which empties the tree. The paragraph below is the state before that.**

**Headline: the platform's accessibility tree could not be read, because no engine that can run this project has an
accessibility driver.** `/Applications/Godot48.app` (27 Oct) was built without AccessKit:
`AccessibilityServer.is_supported()` is false, `DisplayServer.has_feature(FEATURE_ACCESSIBILITY_SCREEN_READER)` is false,
`SceneTree.is_accessibility_enabled()` is false even with `--accessibility always`, and the binary has no `_accesskit_`
symbol. The older local editors that do have AccessKit are 4.7.2 and cannot load the extension (below). So the engine
never sends `NOTIFICATION_ACCESSIBILITY_UPDATE`, and nothing in `native/accessibility.rs`'s update pass has run in a
real engine. Everything else here ran, including the action entry point and the JS side in a real window, and the dump
tool reading the lab's own window from inside the run. What is needed is under "To finish the verification", and why
the engine lacks the driver is decision 17.

| What | Where | Commit |
| --- | --- | --- |
| Native fields, JS wiring, the model, the registry, the Godot glue, the `accessibilityaction` event, the slider's answer, tests | `native/props.rs`, `native/accessibility_model.rs`, `native/accessibility.rs`, `native/events.rs`, hooks in `native/lib.rs` `mount.rs` `layout.rs` `motion.rs`, `src/props.ts` `src/native.ts` `src/events.ts` `src/components.tsx` `src/index.ts` `src/types.ts` `src/kit/slider*.ts*`, `tests/*` | `e95e653` |
| Lab scene, verifiers, AX dump tool, typings, these notes | `demo/a11y.tscn`, `demo/src/a11y-*.ts*`, `demo/src/verify-a11y.ts`, `scripts/verify-a11y.mjs`, `scripts/ax-dump.swift`, `scripts/ax-tree.mjs`, `scripts/a11y-expectations.mjs`, `demo/typings/godot7.gen.d.ts`, `demo/gen/**`, `docs/tracks/accessibility.md` | `3ffe642` |
| After the rebase: bounds from the paint tree, the verifier on the shared isolation and runner, the in-process dump | `native/accessibility*.rs`, `demo/src/a11y-main.ts` `verify-a11y.ts` `verifier-input.ts`, `scripts/verify-a11y.mjs` `ax-dump.swift` `a11y-expectations.mjs` | `eb31786` |
| The dump-tool self-check, the older-engine result, decision 17 and the final checks | `demo/src/verify-a11y.ts`, this file | the commit after `eb31786` |

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
12. **Bounds** are the node's border box in root-local logical pixels, no transforms on sub-elements. After the
    positioning phase an `absolute` or `fixed` element is located in its *paint* parent's frame, not its tree
    parent's, so the walk does not add up tree locations: `AxSource::node` returns the rectangle from
    `stacking::absolute_geometry` (the same function the snapshot's rects come from) and the model uses it as given.
    Reading order is document order (the tree), not paint order. Clipping ancestors are not applied, but an exposed
    element that clips its children has `FLAG_CLIPS_CHILDREN`.
13. **No `aria-valuestep`:** plan 4.2 has no such field, so the numeric step is not set; increment and decrement are
    answered by JS, which knows the step.
14. **The platform tree is read by the run itself, through the shared native runner.** The verifier follows
    `verify-world` (plan D21, D22): `demo/src/verifier-input.ts` isolates the window from real input (`--verify-a11y`
    joins `injectsOwnInput`), events are injected with `parseVerifierEvent`, and `scripts/verify-a11y.mjs` launches the
    run through `scripts/native-run.mjs`, so a failure with a disturbance in its log is re-run at most twice and any
    other failure is not. The runner waits for the window to finish, so the run reads its own tree: it starts
    `scripts/ax-dump.swift` against its own process with `OS.createProcess` (not `OS.execute`: the tool asks this
    process's main thread for the tree, which a blocked main thread never answers), polls for the file the tool writes
    atomically (`--output`), and judges the readings with `scripts/a11y-expectations.mjs` (bundled into the Godot
    script; it is pure) before and after the changes. The dump tool only calls `AXUIElementCopyAttributeValue`, the
    wrapper refuses to run if its source mentions a call that could act, and it reads only the application's windows
    (the menu bar lists the user's recent files). Geometry is checked by fitting one scale and offset over all
    elements and bounding the residual, so a retina window (0.5 points per pixel was observed) is not a special case.
    An engine without a driver ends the run with `GODOT_REACT_A11Y_UNSUPPORTED` (exit 2: not verified), a missing
    Accessibility permission with `GODOT_REACT_A11Y_NOT_TRUSTED` (exit 3).
15. **Platform focus is not judged under isolation.** The isolated window is never the key window, and the platform
    reports focus only for a key window, so there is nothing to read; `checkFocus` is skipped with a logged note
    instead of passing or failing on no evidence. Native's own choice of focused element
    (`get_focused_accessibility_element`) is therefore unverified against a real adapter.
16. **Assistive actions are exercised through the callable's entry point.** The verifier calls
    `ReactUiRoot._on_accessibility_action` the way the adapter's callable does (a `Callable` bound with the tag and the
    action code, called with the request's data), because the dump tool must not perform real accessibility actions.
    That proves argument order, the native-to-JS event, and the kit's handling; it does not prove that AccessKit
    delivers a request to the callable (it is the engine's code and the shape is `ItemList`'s).
17. **Shipping gap: accessibility cannot work in the shipped game until Breaka's engine builds include AccessKit.**
    Both the editor and the export templates must be built with it. The current `/Applications/Godot48.app`
    (installed 2026-10-27) is not: `AccessibilityServer.is_supported()` is false, the binary has no AccessKit
    symbol, and `--accessibility always` changes nothing, so with it the update pass never runs and the game
    exposes only the window. On macOS the option is `accesskit` (default on), the SDK is looked for at
    `accesskit_sdk_path`, default `bin/build_deps/accesskit` under the source tree being built
    (`platform/macos/detect.py:57-60`); if that path does not exist the build prints a warning and carries on
    with `env["accesskit"] = False` (`detect.py:215-232`). **Why the 27 Oct build lacks it, from its recorded
    build log** (`/Users/ben/Development/godot-4.8-restoration-20261027/evidence/editor-build.log`, lines 3-7): the
    editor was built in that restoration tree (`.../source`), which has no `bin/build_deps/` at all, and scons
    printed "The screen reader support driver requires dependencies to be installed ... Alternatively, disable
    this driver by compiling with `accesskit=no` explicitly" and disabled the driver (the same log disables ANGLE the
    same way). It was not a flag anyone passed; the SDK was missing from the tree. Builds made in the main checkout
    `~/Development/godot`, where `bin/build_deps/accesskit` exists, do contain it: every 4.7.x engine binary in its
    `bin/` (`nm -gU` shows 450 `_accesskit_` symbols in each editor and the debug templates; the `template_release`
    one has 124) is built with it, while Godot48 and its source binary
    (`godot-4.8-restoration-20261027/artifacts/godot.macos.editor.arm64.unit463`) have none. Two things to
    check before relying on that checkout for a 4.8 build: the SDK installed there is dated 20 Mar 2026, and the
    4.8 source pins AccessKit 0.22.3 (`misc/scripts/install_accesskit.py`, updated 15 Jul 2026), so refresh it with
    that script first (the installed copy's version was not recorded, and a mismatch would show as compile errors
    in `drivers/accesskit`); and `docs/operations/GODOT_ENGINE_BUILDS.md`'s macOS recipe has no `accesskit_sdk_path`
    and relies on the default being present. Fixes: install the SDK in the tree being built or pass
    `accesskit_sdk_path=...`, and treat the AccessKit warning in the scons log as an error. The Web platform in this engine has no
    accessibility code at all (`platform/web/` contains none), so a Web export has no screen-reader support from the
    engine whatever the build flags are; that is a separate gap from this one. The export templates for macOS were
    not inspected.

## Checks

Run on the rebased branch (`eb31786` and the commit after it), each once:

| Command | Result |
| --- | --- |
| `cargo test --locked` | 473 passed (416 were this track's tree before the rebase; the rest is main's) |
| `cargo clippy --locked --all-targets` | 0 warnings |
| `rustup run stable cargo fmt --check` | clean |
| `pnpm test:types` | clean |
| `pnpm test` | 216 passed, including the AX-tree helper and expectation tests |
| `pnpm build:native`, `pnpm build`, `pnpm gen:types` | succeed; `godot7.gen.d.ts` regenerates to no change |
| `pnpm verify` | passed, both viewports (landscape reported `GODOT_REACT_RUN_DISTURBED` and passed) |
| `pnpm verify:motion` | passed, both viewports |
| `pnpm verify:interaction` | passed, both viewports, all five sections including positioning (landscape reported a disturbance and passed) |
| `pnpm verify:a11y` (Godot48; run twice in all: once after the port, once after the dump self-check was added) | the Godot-side half passes in an isolated window, the dump tool reads the run's own window from inside it (8 nodes), then the run ends `GODOT_REACT_A11Y_UNSUPPORTED` and the wrapper exits 2 "not verified" |
| `GODOT=…/godot.macos.editor.arm64 pnpm verify:a11y` | not run as such; see "The older engine" |

No run was re-run because of a disturbance. A "disturbed" pass means the shared isolation logged a foreign event,
a focus loss or a cursor crossing during the run; the verifiers still passed, and the log has the line.

The Godot-side half (`demo/src/verify-a11y.ts`, `GODOT_REACT_A11Y_NATIVE_PASSED`) checks, in a window with Godot's own
input: the native props of the lab as snapshot reports them (including `ariaChecked: "mixed"`), Space on a checkbox,
a switch and a radio item changing `ariaChecked` natively, the arrow key moving the slider, and then, through the
bound-callable entry point, a click action pressing Save and doing nothing on a disabled button, focus and blur actions
moving focus, increment/decrement/set-value (including a value past the end) moving the slider, and the root keeping
Godot key focus. A first run of it failed on a real defect (a set-value of `300` arrives as an integer variant and was
rejected); fixed in `requested_number`.

`scripts/ax-dump.swift` works: the verifier starts it against its own process and reads the lab's window (8 nodes: the
window, its title bar buttons and title, no content, which is what an engine without AccessKit exposes; under isolation
the window's subrole is `AXDialog`). The expectations for the real tree
are tested against hand-written readings, including readings that are wrong in each way the checks look for
(`tests/a11y-expectations.test.ts`, `tests/ax-tree.test.ts`); they encode what AccessKit's macOS adapter is expected to
show (`AXButton`/`AXCheckBox`/`AXRadioButton`/`AXSlider`, names in `AXTitle` or `AXDescription`, `AXValue` 0/1 for
toggles) and have never met the real adapter, so a first real run may need them adjusted.

Not run: the Web verifiers (nothing here changes Web behaviour; the extension's accessibility calls are native-only
in effect, and the engine's Web platform has no accessibility driver).

## The older engine (coordinator step 4)

`/Users/ben/Development/godot/bin/godot.macos.editor.arm64` (14 Oct) does have the driver (`nm -gU` shows 450
`_accesskit_` symbols; so do its dev and debug-template siblings), but it is `4.7.2.stable.custom_build.8525f2d85`
and cannot run this project. I did not run `pnpm verify:a11y` against it, because the wrapper would first run
`importDemo` with that editor in this worktree and an older editor can rewrite project and import state; I ran the
same engine on a copy of `demo/` in the scratchpad instead (`--headless --path demo --quit`), which is the point the
wrapper would have died at. The exact output:

```
ERROR: GDExtension only compatible with Godot version 4.8.0 or later: res://addons/godot-react-ui/react_ui.gdextension, but your Godot version is 4.7.2
   at: parse_gdextension_file (core/extension/gdextension_library_loader.cpp:327)
ERROR: Can't open GDExtension dynamic library: 'res://addons/godot-react-ui/react_ui.gdextension'.
   at: open_library (core/extension/gdextension.cpp:811)
ERROR: Error loading extension: 'res://addons/godot-react-ui/react_ui.gdextension'.
   at: load_extensions (core/extension/gdextension_manager.cpp:333)
...
Uncaught Error: godot class not found 'ReactUiRoot'
```

GodotJS itself loads and runs the project's scripts in that engine; the extension does not, and could not be forced to:
the extension is built against the 4.8 API (`compatibility_minimum = "4.8"`), and `AccessibilityServer` is a 4.8
class (4.7 has the accessibility calls on `DisplayServer`). No engine was rebuilt or replaced.

## To finish the verification

1. **A 4.8 engine with AccessKit** (decision 17): install or refresh the SDK in the source tree and rebuild the editor
   there; check that the scons log has no AccessKit warning and that `nm -gU <binary> | grep -c _accesskit_` is
   non-zero. Nothing else in this repository needs to change.
2. **macOS Accessibility permission** for the process that runs `pnpm verify:a11y`: System Settings > Privacy &
   Security > Accessibility. On this machine `AXIsProcessTrusted()` is already true for the agent's process and the
   dump tool read the run's own window, so no grant was needed here; the wrapper stops with exactly this message
   (exit 3) if it is missing.
3. `GODOT=<that engine> pnpm verify:a11y`. Evidence goes to `artifacts/native-a11y/run/` (`ax-window.json`,
   `ax-before.json`, `ax-after.json`, `run.log`). Compare `ax-before.json` with the table in
   `scripts/a11y-expectations.mjs`: those expectations were written from AccessKit's macOS mapping and have not met
   the real adapter, so fix whichever side is wrong, with the dump as evidence. Platform focus is not judged under
   isolation (decision 15).
4. **VoiceOver, manually, not done:** with the lab running (`godot --path demo res://a11y.tscn`, no
   `--verify-a11y`), turn VoiceOver on and check that the order, names and states read as the table says, that
   VO-Space presses Save, that adjusting the slider with VO-Up/Down changes Volume, and that the hidden text is
   skipped.

Web is not claimed. `DisplayServer.hasFeature(FEATURE_ACCESSIBILITY_SCREEN_READER)` was recorded on native macOS only
(false on this engine); recording it on Web needs a Web build and a browser run, which was not cheap.

## Deferred

- **Scroll containers (I5): done on the `scroll` branch (plan D38).** `SCROLL_VIEW`, the scroll offsets and ranges and
  the scroll actions (`SCROLL_UP/DOWN/LEFT/RIGHT`, `SET_SCROLL_OFFSET`, `SCROLL_INTO_VIEW`) are built, with unit tests and Godot-side
  checks in `verify:a11y`; the platform tree for them (`AXScrollArea`) is unread, as for everything here. Still not done: a
  transform on the scrolled content's element as `ItemList` does. Our bounds are root-local and follow the scroll, so a scroll
  re-sets every exposed descendant while a screen reader is attached; the transform is the optimisation if that shows.
- **`TextInput` (I7):** `TEXT_FIELD`/`MULTILINE_TEXT_FIELD`, value, placeholder, read-only, selection through
  `create_sub_text_edit_elements`, and the set-selection and replace-text actions. `role="textbox"` is parsed and not
  exposed until then.
- Translating the `"mixed"` description; `tooltip` text and `ACTION_SHOW_TOOLTIP`; `aria-labelledby`/`describedby`
  relations (`update_add_related_*`); a numeric step; list/tree item counts and positions (`set size`/`position in
  set`); `aria-live` regions are sent but untested.

## Merging notes (shared files touched)

Rebased onto main `a98df16`: the only conflicts were `package.json` (the `verify:a11y` script beside `verify:text-layout`) and
`scripts/build.mjs` (the lab's `build()` call beside the text-layout one); both kept both sides. `native/props.rs`,
`native/mount.rs`, `native/lib.rs` and `native/layout.rs` merged without conflict, but positioning changed what a
node's `location` means, which the rebase could not see (decision 12). `demo/src/verifier-input.ts` gained
`--verify-a11y` in `injectsOwnInput`; `demo/gen/godot/src/verifier-input.ts.gen.ts` is its generated file, which main did
not have. Original notes:

Small and local, in the places the positioning and text-layout tracks also edit: `native/props.rs` (new enums before
`TransitionSpec`; 18 fields at the end of `PropsSpec`, `PropsDiff` and `with_diff`; `validate`), `native/lib.rs`
(two `mod` lines, a field, three notification arms, the focused-element virtual, one `#[func]`, one line in
`set_focus`), `native/mount.rs` (a block at the end of `run_commit`, one line in `delete_node`), `native/layout.rs`
(one line), `native/motion.rs` (one line), `native/events.rs` (a variant and two types), `src/components.tsx` (an import
and one prop), `scripts/build.mjs` (one `build()` call), `package.json` (one script), `tests/recording-host.ts` (one
helper). `tests/prop-tree.ts` is deleted: it existed only to read the aria props back before they reached native.
