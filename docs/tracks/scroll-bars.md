# Track: scroll bar accessibility elements (plan D42)

Branch `scroll-bars`, based on main `6c6abd7`, rebased onto `944ca90` (Phase I7) while it was being built and onto `2c152d9` (HiDPI,
D45) at the end. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md` and `docs/INTERACTION_PROGRESS.md` are not edited
here. This is the owed item of `docs/tracks/stock-engine.md` (S14, "Owed"): a screen reader on macOS could read a scroll view's
contents and not where in them it was, because the macOS adapter ignores the scroll properties plan D38 sets on a node.

**Headline: every scrollable axis now has an `AXScrollBar` in the real macOS tree, and `pnpm verify:a11y --engine=stock` reads it.**
The lab's `Messages` view has a vertical bar whose value is 0 before a scroll, 40 after a scroll to 40 pixels and 251 (its maximum) at
the end; the new `Gallery` view, which overflows on both axes, has a horizontal bar and then a vertical one; the new `Log` text area,
whose text overflows, has a vertical bar, loses it when its text shrinks to fit and gets it back when the text grows. Frames agree
with native's track rectangles with a residual of 0.000 points (scale 0.500) over 25 to 29 elements in every reading. VoiceOver itself
was not run.

## What changed

| What | Where |
| --- | --- |
| The model: `AxRole::ScrollBar`, `AxScrollAxis.track`, the bars a scroll state asks for (`scroll_bars_of`), the registry's create, prune, apply bookkeeping per `(tag, axis)`, the action codes and the step | `native/accessibility_model/scroll_bars.rs` (new, with its tests), `native/accessibility_model.rs` (the role, the track field, `mod scroll_bars`, the slot's `bars`, model tests) |
| The Godot side: create inside the update, set when changed, free where the geometry changes, the action entry | `native/accessibility/scroll_bars.rs` (new), `native/accessibility.rs` (`axis_scrolls`, `scroll_axis` with the track, the update pass, the role) |
| The prune hook, the track layout | `native/mount.rs` (`update_node_geometry`, `MountedNode::scrollbar_layout`) |
| The bound callable | `native/lib.rs` (`_on_accessibility_scroll_bar_action`, a new `#[func]`) |
| `tracks` in the scroll state the snapshot and `getScrollState` report | `native/scroll_input.rs`, `src/native.ts`, `native/PROTOCOL.md`, three tests that build a `NativeScrollState` |
| The lab and the checks | `demo/src/a11y-panel.tsx` (`Log`, `Gallery`, 900x1000), `demo/src/verify-a11y.ts`, `scripts/a11y-expectations.mjs` and `.d.mts`, `scripts/verify-a11y.mjs`, `tests/a11y-expectations.test.ts` |
| Recordings | `tests/fixtures/ax-lab/`: the lab's four readings and its geometry re-recorded, `macos-log-fits.json`, and two stock controls, `stock-scroll-controls.tscn` / `macos-stock-scroll-controls.json` and `stock-text-area-scroll-controls.tscn` / `macos-stock-text-area-scroll-controls.json` |

## The control: what a stock engine shows

Stock Godot 4.7.2 with AccessKit 0.22.3, the same adapter and the same read-only dump tool as `docs/tracks/stock-engine.md`, one window
per scene (the scenes and readings are in `tests/fixtures/ax-lab/`).

| | Stock `ScrollContainer`, 12 labels and a button in a 96 px view | Stock `ScrollContainer` that overflows on both axes | Stock `TextEdit` with 13 lines and a long line | Stock `TextEdit` that fits, stock `LineEdit` with a long text |
| --- | --- | --- | --- | --- |
| Children of the container | its content, then one `AXScrollBar` | its content, then a horizontal `AXScrollBar`, then a vertical one | the two bars only (the line elements are not in the macOS tree) | none |
| A bar | value 0, minimum 0, maximum 355; frame 4 x 48 points flush with the right edge | horizontal 96 x 4 (maximum 582), vertical 4 x 44 (maximum 212) | horizontal 156 x 4 (maximum 1928), vertical 4 x 30 (maximum 13, in lines) | |
| Name, orientation, actions | no name; `AXUnknownOrientation`; `AXScrollToVisible`, `AXIncrement`, `AXDecrement` | the same | the same | |

## Decisions

Each was made from the evidence named; none contradicts plan section 3. Numbering is local (SB1 and up) for the coordinator to fold
into the decision log.

**SB1. A bar belongs to its container's registry slot, keyed by axis, not to a registry of its own.** The server frees an element's
children with it (`_free_recursive`, `accessibility_server_accesskit.cpp`), and the engine forgets every element with the root
(`ACCESSIBILITY_INVALIDATE`). With the bars in the `Slot` of the container, `Registry::remove`, `prune`, `forget_all` and
`root_elements` already do the right thing by construction, with nothing to keep in step: the unit tests show a removed container
frees its bars once (`removing_the_container_takes_its_bars_with_it...`), a pruned one takes them with it, and `forget_all` forgets them
without freeing. A separate `(tag, axis)` registry would have needed a hook at every place a slot goes. The code is in a child module of
`accessibility_model` and of `accessibility`, so the shared files gained a role, a field and a `mod` line.

**SB2. Which elements: every exposed scroll container, whatever its role, and a multi-line text input.** D38 gives the scroll properties
and actions to any exposed scroll container, so the bars follow. The control settles the text area: a stock `TextEdit` that overflows
has `AXScrollBar` children, one that fits has none, and a `LineEdit` never does however far it scrolls its text. A multi-line `TextInput`
is a scroll container (`MountedNode::is_scroll_container`, Phase I7) and so has a bar for each axis that scrolls; a single-line one is
not and has none. The real tree agrees: `Log` (overflowing) has one vertical bar and nothing else under it, `Notes` (two lines) and
`Name` have none. A text field's bars come before its line elements in the server's child list (the lines are appended during the
field's own set), which does not show: the macOS tree has no line elements, for the control either.

**SB3. Order: after the content, the horizontal bar before the vertical one.** Both stock containers and the `TextEdit` list them so. The
registry inserts content at its index among the content and a bar at "content count plus the bars before it", so a content child added
later still goes in before the bars, and an axis that starts to scroll later goes in front of the later axis (unit tests,
`content_added_after_the_bars_goes_in_before_them`, `an_axis_that_starts_to_scroll_later...`; the real tree, `Gallery`).

**SB4. Value and range are the reachable offsets, not Godot's.** A stock bar's maximum is the size of the content, which its value never
reaches (355 for a view that can scroll 259). Here the value is the scroll offset (`scrollTop`/`scrollLeft`), the minimum and maximum are
the container's reachable offsets (a reversed axis keeps its negative minimum, as D38 sets it), and the value ends at the maximum:
`Messages` reads 0, 40, 251 of 251. A screen reader that reads the value as a share of the range then reads the end as the whole of it.
This is the one place the values differ from the control on purpose; both are numbers in Godot pixels, not points.

**SB5. The bar has an orientation and no name.** The stock bar has neither (`AXUnknownOrientation`, no title or description); two bars of
one container are then both just "scroll bar". `update_set_list_orientation` is applied to any role (`accessibility.md`, decision 1) and
the real tree conveys it: `AXHorizontalOrientation` and `AXVerticalOrientation`, in the order above. The platform names the role itself
(`roleDescription` "scroll bar"), and a name would repeat it, so none is set (the expectations check there is none). How VoiceOver speaks
a scroll bar with an orientation and no name was not heard; if it turns out to say only "scroll bar", the fix is one string in
`apply_scroll_bar`.

**SB6. The bar covers its track, drawn or not.** The element's bounds are the track `scroll::scrollbars` lays out (6 px thick, 2 px
inset from the client area, stopping short of the corner when both axes scroll), in root-local pixels. The bar element exists because
the axis scrolls, so `scrollbar-width: none`, which only hides the drawing, does not remove it; `MountedNode::scrollbar_layout` is
`scrollbars()` without that check, and `getScrollState().tracks` reports the same rectangles for the verifiers (`thumbs` stays the drawn
ones). The real tree's frames equal the snapshot's tracks to 0.000 points. Not exercised in the real tree: `scrollbar-width: none` and a
reversed axis (unit tests cover the second's range).

**SB7. Increment and decrement only, one arrow key step through `scroll_by_checked`.** They are what VoiceOver uses on a scroll bar
(`AXIncrement`, `AXDecrement`). A stock bar also takes a set-value; D42 names the two, so no more are offered. The step is
`assistive_scroll_delta(.., Item, client)`: the client size along the bar's axis divided by `SCROLL_PAGE_DIVISOR`, which is what the
arrow keys scroll (a unit test compares it to `key_scroll_delta` for all four arrows, and the Godot-side half presses the real Down and
Right keys on the focused views and checks the bar's increment moves the same distance). An increment goes towards `max` (down, right),
also on a reversed axis. The callable is a new `#[func]`, `_on_accessibility_scroll_bar_action(data, tag, axis, action)`, not new
`AxAction` codes: the bar is not a node with a tag of its own, the codes would collide with the text actions' numbering when branches
meet, and an action for an axis that no longer scrolls is ignored (the interface changed between the request and the call, as for any
action).

**SB8. Lifetime: made in the update, set when changed, freed where the ranges change.** `update_accessibility` computes every element's
properties once, creates the missing bars after the content has grown (so the container is set again with its new child: the slot's
`children_changed`), then sets only the elements and bars whose properties differ from what was last set; a scroll changes the bar's
value and nothing is created. `free_element` is refused inside an update, so a bar is freed in `update_node_geometry`, where
`scroll_ranges` change, by `prune_scroll_bar_elements(tag)`; `axis_scrolls` is the one definition of "this axis has a bar" for both the
creation and the freeing. A bar that exists without being wanted at update time is logged as an error (as for content elements),
which is what the negative control below saw. Real tree: the Godot-side half sets `Log` to "short" and the platform tree has the text
area and no bar (`macos-log-fits.json`), then sets the long text back, the bar is back and steps. The half also sets `Notes` to three
lines and back, which makes a bar for a moment and frees it; with the prune removed, `Notes` kept it.

**SB9. Cost with accessibility off.** Nothing is created while no assistive technology has asked for the tree: the registry is empty,
`request_accessibility_update` queues nothing, `prune_scroll_bar_elements` returns at `has_scroll_bars(tag)` (one hash lookup) and a
scroll only asks for an update, as before. That is reasoning from the code; no timing was measured.

## What the real tree shows

`pnpm verify:a11y --engine=stock`, readings of the lab (900 x 1000 logical pixels, 0.5 points per pixel). Values are Godot pixels.

| Element | Before any scroll | Scrolled to 40 px | Scrolled to the end | After the Godot-side input | Frame (points) |
| --- | --- | --- | --- | --- | --- |
| `Messages`, vertical | 0 of 0..251 | 40 | 251 | 251 | 3 x 45, at the right edge |
| `Gallery`, horizontal | 0 of 0..322 | 0 | 0 | 39.75 (one step: 318 / 8) | 153 x 3 |
| `Gallery`, vertical | 0 of 0..86 | 0 | 0 | 8.75 (70 / 8) | 3 x 29 |
| `Log`, vertical | 0 of 0..69 | 0 | 0 | 61.25 (the end of its range less a step) | 3 x 29 |

Every bar: `AXScrollBar`, role description "scroll bar", `AXVerticalOrientation` or `AXHorizontalOrientation`, actions
`AXIncrement` and `AXDecrement` only, no title or description. Against the control: same element, same place, same order (the tests
`the recorded scroll bars are the stock controls' scroll bars...`); different orientation (the control has none), no
`AXScrollToVisible` (a bar is not a mounted node to scroll into view), and the range of SB4.

One observation that is not a decision: in the earlier recording the last child of `Messages`, the button, was in the platform tree only
when scrolled to the end; with the bar as the container's last child it is in the tree at every position. That is the adapter's own child
filtering and was not investigated; the checks do not depend on it (a child wholly in view must be in the tree and every child that is
must have native's frame).

## Checks

Run once each on the rebased tree (`eed0e68` on `2c152d9`), in order, by `artifacts/logs/gates.sh`; the logs are in `artifacts/logs/` and
the verifiers' own evidence is in `artifacts/stock/native-a11y/run/` and `artifacts/native-interaction/`.

| Command | Engine | Result |
| --- | --- | --- |
| `cargo test --locked` | n/a | 566 passed (21 are new: 15 in `accessibility_model/scroll_bars.rs`, 6 in the model's tests) |
| `cargo clippy --locked --all-targets` | n/a | 0 warnings |
| `rustup run stable cargo fmt --check` | n/a | clean |
| `pnpm test:types` | breaka, stock | clean, clean (the stock one after the stock library was rebuilt: the freshness guard refuses it before) |
| `pnpm test` | n/a | 375 passed (5 are new: the bars wrong in each way, the recorded bar following the scroll, the bars against the stock controls, the text area that stopped overflowing, and the old tree without bars) |
| `pnpm build:native` | stock, then breaka (the default, installed last) | succeed |
| `pnpm verify:a11y` | stock | **passed**. Geometry scale 0.500, residual 0.000 points over 27, 29, 25 and 25 elements; the readings are `ax-before.json`, `ax-scrolled.json`, `ax-scrolled-end.json`, `ax-log-fits.json` and `ax-after.json`. A foreign mouse motion and a focus loss were reported at launch; it passed, so it was not repeated. Platform focus was not checked (the window is not key) |
| `pnpm verify:a11y` | breaka (default) | its Godot-side half **passed** (`GODOT_REACT_A11Y_NATIVE_PASSED`, which now includes tracks, the bar actions against the arrow keys, and the log shrinking and growing), then `GODOT_REACT_A11Y_UNSUPPORTED`, exit 2, "not verified": the engine has no AccessKit. Under D22 the runner repeated it three times because each attempt had a disturbance; the outcome was the same |
| `pnpm verify:interaction --only=scroll` | breaka (default) | passed, landscape and portrait (a foreign mouse motion and a focus loss each, passed) |

Before the final run, `pnpm verify:a11y --engine=stock` ran three more times while this was built, and none is a gate result: the first
(the lab as first written) passed; the second failed in the Godot-side half at "whose new bar steps its text: 69", which was this work's
own expectation being wrong (a set-value leaves the caret after the text and the text area scrolls to show it, so the bar is at the end
of its range, 69 of 69, not at the start; the assertion now steps back from the end) and not a defect of the bars; the third passed and
is the source of the re-recorded fixtures. Not run: the Web verifiers (the Web export has no accessibility code in the engine),
`verify`, `verify:motion` and the other interaction sections (nothing outside accessibility changed behaviour; `getScrollState` gained a
field).

### Negative controls: each new assertion fails without its fix

Unit tests: 14 mutations of `native/accessibility_model/scroll_bars.rs`, each applied alone, the accessibility tests run, the file put
back (`artifacts/logs/scroll-bar-unit-mutations.txt`). All 14 were caught, by one to four tests each: bars before the content, a bar
that does not mark its container when made or when freed, pruning that frees nothing, the vertical bar not counting the horizontal one,
a bar made again on every update, a bar set only once, a page-sized step, an inverted orientation, no horizontal bar, a bar not
covering its track, the wrong position, an unreported unpruned bar, an increment towards the start. The first run of this harness found a
real gap in the tests (a bar that did not mark its container survived, because the content had already marked it), now
`a_bar_made_after_the_content_marks_the_container_to_be_sent_again`, and a harness bug (`copy2` kept the backup's old modification time, so
cargo kept the mutated build); both are fixed and the 14 results above are from the corrected run.

The real tree, two builds of the stock library with the changes named, and one reading of the old tree, `pnpm verify:a11y --engine=stock`:

| Without | Result |
| --- | --- |
| The prune hook in `update_node_geometry`, and a bar set only once | Fails with the platform's values stale and a bar left behind: `a11y-scroller vertical scroll bar: AXValue is 0, expected 40 (scrollTop)`, `... is 0, expected 251`, `a11y-gallery horizontal scroll bar: AXValue is 0, expected 39.75`, `a11y-gallery vertical scroll bar: AXValue is 0, expected 8.75`, `a11y-log vertical scroll bar: AXValue is 0, expected 61.25`, `fits: the Log text area kept its scroll bar after its text stopped overflowing`, and `a11y-notes: expected 0 scroll bar(s) (none), found 1` (the bar `Notes` got while it overflowed, value 23 of 23). The native log also has `scroll bar elements exist for axes that cannot scroll ... and were not pruned: [(38, Y)]`. `artifacts/logs/verify-a11y-stock-negative-a.log` |
| The bound action doing anything (`_on_accessibility_scroll_bar_action` returns at once) | The Godot-side half fails: `An increment action on the vertical bar scrolls the same step as the Down key: 11.75` (the scroll stayed one key step instead of two). `artifacts/logs/verify-a11y-stock-negative-b.log` |
| The bars at all | Not run as a build: the real reading of the lab before this work (`HEAD` before the commit, from the stock-engine track) judged by the new expectations fails with `a11y-scroller: expected 1 scroll bar(s) (vertical), found 0`; a recorded reading with the bars stripped fails for each of the three scroll containers (a test) |

Each of these two runs was repeated by `native-run.mjs` under D22 (three attempts), because a focus-loss disturbance was in the log of the
first and the second attempt; the failure was the same in every attempt.

## Not verified

- **VoiceOver.** Not run: not automatable here, and the brief forbids real input. What VoiceOver says for a scroll bar with an
  orientation and no name, and whether VO-arrow adjustments reach the callable, is open. The macOS tree is what is verified.
- Windows (UI Automation) and Linux (AT-SPI) trees through AccessKit were not read. The element, role, value, range and actions are
  the engine's generic ones.
- Breaka's engine has no accessibility driver; `pnpm verify:a11y` on it runs the Godot-side half (which now includes the bar actions)
  and ends "not verified", as before.
- `scrollbar-width: none` and a reversed axis in the real tree (SB6). Platform focus, as before.
- The Web export has no accessibility code in the engine.

## Merge notes

- Files shared with other branches: `native/accessibility.rs` (imports, `axis_scrolls`, `scroll_axis`, the update pass, `server_role`,
  `mod scroll_bars`), `native/accessibility_model.rs` (one role, one field on `AxScrollAxis`, one on `Slot`, a `mod`, tests inserted before
  "Registry"), `native/lib.rs` (a `#[func]` after `_on_accessibility_action`), `native/mount.rs` (`scrollbars()` split from
  `scrollbar_layout()`, one line in `update_node_geometry`), `native/scroll_input.rs` (`tracks` in `scroll_state_json`).
- The new `#[func]` changes the generated typings: `demo/typings/godot7.gen.d.ts` gains `_on_accessibility_scroll_bar_action`. On a
  merge with another branch's typings, regenerate rather than resolve by hand.
- `NativeScrollState` gained a required `tracks`; code that builds one (three tests did) needs `tracks: null`.
- The lab is 900 x 1000 now (`scripts/verify-a11y.mjs`) and has two more elements, so the recorded readings and
  `snapshot-geometry-after.json` were all re-recorded; their ids are the lab's `testID`s as before.
- Plan D42 can say its owed item is done; D38's "Not done, on purpose" (a transform on the content as `ItemList` has) is unchanged.
