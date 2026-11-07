# Track: Combobox (an editable combobox, single and multiple, with chips)

Branch `combobox`, based on main `d282fee`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md`
and `README.md` are not edited here (the README text is at the end). Ben asked for "more advanced controls, e.g. a combobox, and a combobox
with chips (essentially multiselection where each entry adds a chip)": this is the kit's `Combobox`, one compound component with a
`multiple` mode, following the WAI-ARIA Authoring Practices' editable combobox with list autocomplete.

## API

```tsx
<Combobox.Root value? defaultValue? onValueChange? inputValue? defaultInputValue? onInputValueChange?
               open? defaultOpen? onOpenChange? filter? disabled? autoHighlight? allowCustomValue? loop? multiple?>
  <Combobox.Control>                           // the box that looks like one input; a press on its padding focuses the input
    <Combobox.Input placeholder? />            // a TextInput, role="combobox"
    <Combobox.Clear /> <Combobox.Trigger />    // buttons that never take focus from the input
  </Combobox.Control>
  <Combobox.Content sideOffset? collisionPadding?>   // role="listbox", in a Portal
    <Combobox.Item value textValue? disabled?>       // role="option"
      <Combobox.ItemText>Apple</Combobox.ItemText>
      <Combobox.ItemIndicator />
    </Combobox.Item>
    <Combobox.Empty>No matches</Combobox.Empty>
  </Combobox.Content>
</Combobox.Root>

<Combobox.Root multiple value?: readonly string[] defaultValue? onValueChange?(value: readonly string[])>
  <Combobox.Control>
    <Combobox.Chips renderChip?={(value, label) => <Combobox.Chip value={value}>{label}<Combobox.ChipRemove /></Combobox.Chip>}>
      <Combobox.Input />
    </Combobox.Chips>
    <Combobox.Clear /> <Combobox.Trigger />
  </Combobox.Control>
  ...
</Combobox.Root>
```

`value` is typed by `multiple` with a discriminated union (`ComboboxSingleRootProps | ComboboxMultipleRootProps`): single is
`string | null` with `onValueChange(value: string | null)`, multiple is `readonly string[]`. Every part takes `className`, `style` and `testID`
and forwards a ref (`Input` a `TextInputHandle`), the caller's class after the part's own. Defaults are the neutral slate and indigo look of
`Select`, from classes that exist on this branch. Exported: `Combobox`, `defaultComboboxFilter`, `useRootEvent`, the prop types.

## Decisions

1. **The shape differs from the brief in one place: `Chips` wraps the input.** The brief had `Chips` hold only the chips, with `Input` a sibling
   in the `Control`. For the input to take "the remaining room on the line" next to the last chip, the chips and the input have to be items
   of one wrapping row, and there is no `display: contents`, so a chips-only `Chips` would put the input on a line of its own. As in Base UI,
   `Chips` is the wrapping row (`flex-row flex-wrap`, `grow`) and takes the `Input` as its child; `Clear` and `Trigger` sit after it in the
   `Control`. The chip renderer is a prop, `renderChip(value, label)`, not function children (children are what follows the chips); it
   defaults to a `Chip` with a `ChipRemove`. This also keeps every part an element, so every part takes `className`, `style`, `testID` and a ref.
   Added beyond the brief: `loop` (decision 8) and `Combobox.Empty` (the brief had it).
2. **Typed by `multiple`, no cast.** `ComboboxRoot` picks `SingleRoot` or `MultipleRoot` by `props.multiple`, which narrow the discriminated
   union; each owns its `useControllableState` and hands `ComboboxCore` a list of values and one setter. Changing `multiple` on a mounted
   combobox remounts it (a different component). `value`, `inputValue` and `open` are controllable through `useControllableState`, and a
   controlled parent that declines a change sees its value put back (tests). The single `value` is `null` for "nothing", as `Select`'s.
3. **Shared with `Select`, not copied.** `src/kit/popup.tsx` holds what both lists share: `usePopupPlacement` (the measured, same-turn
   placement with `placePopover`, taking the anchor as a function so a combobox can anchor on its control or its input), the item registry
   (`useItemRegistry`, `upsertEntry`), the `collect` mode wrapper, `isOnThumb`, `textOfChildren` and the drawn caret. `select.tsx` lost about 100
   lines and gained none; its 54 tests pass unchanged, and `tests/kit.test.ts` and `tests/overlay-queries.test.ts` with them (151 together).
4. **Focus stays in the input; the active option is announced.** The options are plain `View`s with `role="option"` and no `tabIndex`; the
   input has `role="combobox"`, `aria-expanded` (true only while a list is on screen), `aria-activedescendant` and `aria-controls`. Native
   names elements by tag, so the two new props take the `id` of a `UIHandle` (decision 12). The root learns the tags in layout effects
   (the active option's element and the list's), which re-render the input before anything is drawn.
5. **A press on the list: prevented for a mouse, not for a finger.** Plan 3.11 and 3.13 say the default of a press on something that cannot take
   focus clears it, so the list prevents `pointerdown` to keep focus in the input, as `Slider` does. But D33 says a prevented `pointerdown` is
   not a pan, so a prevented press would make the list impossible to scroll with a finger. So: a mouse or pen press (except on a scrollbar thumb,
   `isOnThumb`) is prevented; a touch is not. The list is `tabIndex -1`, so an unprevented press lands on it, not on nothing, the input's `blur`
   names the list as `relatedTarget` and is ignored, and the list's `focus` handler gives the focus straight back to the input. The same
   path covers an assistive technology focusing the list. Choosing is the option's `click`, so a touch that pans (`pointercancel`) chooses
   nothing (D50). Cost: on a touch device the keyboard element is taken away and given back during a tap on the list (see "Web").
6. **No backdrop; leaving is `blur`; the page scrolling is a wheel outside.** A press outside reaches what is under it and blurs the input,
   which closes the list. When the page scrolls under an open list the list would hang in the air: it cannot follow (nothing says an ancestor
   scrolled, and `scroll` does not bubble), so it **closes** on any `wheel` that reaches the root and was not over the list. That needed a
   document-level listener, which components did not have: `useRootEvent(type, listener)` (exports `watchRootEvent` from the renderer, ten
   lines) subscribes to `UIRoot`'s own listeners in a layout effect. The list stops its own wheel's propagation, and scrolls (`overflow-y-auto
   overscroll-contain`, capped by placement). A touch pan on the page begins with a press that blurs the input, so it needs no case. **Resize
   repositions** where `Select` closes: `Select` closes because layout drops the focus of the trigger the resize pushed out of the root, but
   the input stays visible, and a resize that did push it out blurs it, which closes the list; the same placement effect runs again.
7. **Filtering.** The default filter (`containsFilter`) is a case-insensitive substring of `textValue` (`toLowerCase`, since the native runtime
   has no `Intl`). `filter={fn}` gets `(textValue, query, value)` and is not called for an empty query; `filter={null}` lists everything for a
   parent that fetches. The query is the input text, except in a single combobox whose text is its chosen option's and has not been edited
   (the "pristine" rule, as MUI's): then it is empty, so reopening a chosen combobox lists everything and starts on the chosen option. Items
   register `{value, textValue, disabled}` always (so chips and the input can name a value before the list was ever opened: `collect`
   mode, as `Select`); the root computes which values match, and an item renders only if it does. `Combobox.Empty` makes the list open on "no
   match"; without one a list with nothing to show does not open. It is a polite live region.
8. **Keys.** ArrowDown/ArrowUp open and move, skipping disabled options, and **wrap** from one end to the other (`loop`, default true; `Select`
   does not wrap because it is a listbox, but with Home and End given to the caret an editable combobox has no other way to the far end). A
   closed list opens on the chosen option, else the first (Down) or last (Up). Alt+Down opens without moving (the chosen option, if any, is
   highlighted as the list's starting place), Alt+Up closes. Home and End are the caret's. Enter chooses the active option; with none it is
   the combobox's only when `allowCustomValue` and there is text. Escape closes; with the list closed it clears the text, and in a single
   combobox the choice with it (otherwise leaving would put the text back). Shift, Ctrl and Meta chords are the text's. While
   `event.isComposing` no key is taken and Enter chooses nothing. **Tab commits nothing**: it is a plain `blur`, which closes the list and, in a
   single combobox, puts the chosen text back (or keeps the typed text with `allowCustomValue`). `Select` commits on Tab because there the
   focused item is the pending value; here an active option is only a place the arrows went.
9. **Leaving.** Closing the list on `blur`; a single combobox puts its chosen option's text back, or with `allowCustomValue` keeps what was
   typed and reports it (typed text equal to an option's text is that option; emptied text clears the value); a multiple combobox drops text
   that was not entered with Enter or a comma. Focus moving onto a chip closes the list but keeps the text.
10. **Chips.** A chip is a `Button` with `role="group"` and `aria-label` (a button so that `withLabels` wraps its text and it is focusable;
    a group because a button's children are presentational and the remove button must stay in the tree), `tabIndex -1`. From the input:
    ArrowLeft at caret 0, or Backspace in an empty input, focuses the last chip; **Backspace only moves onto the chip, a second press removes
    it, and a key repeat does neither**, so holding Backspace eats at most the text, never the chips (the deliberate two-step guard). On a
    chip, ArrowLeft/Right walk (stopping at the first; past the last returns to the input), Backspace/Delete remove it and give the input
    the focus first (removing the focused element would clear focus). `ChipRemove` is a `Button` with `aria-label` "Remove <label>", never
    takes focus on press, and renders nothing in a disabled combobox ("chips with no removal"). Custom values: Enter with no active option adds
    the typed text, and so does a comma (swallowed, even on empty text), with `allowCustomValue`. The placeholder is dropped once there is a chip.
11. **Large lists.** Measured with `tsx tests/combobox-benchmark.ts 1000` against the recording host (JavaScript and the commit only, V8 under Node on a Mac
    that other sessions were loading, load average above 100: run-to-run spread is a factor of two, so these are orders, not budgets). 1,000
    children-based options, each a `View` holding a `Text` and an indicator: rendering the closed combobox takes 16 to 46 ms (the options only
    register); opening it creates 2,001 nodes and takes 78 to 193 ms (median of the four runs 111 ms), a `Select` list of the same options 92 to 246 ms
    (median 120 ms) for 2,002 nodes, so opening costs what `Select` costs. Typing "e" (a list closed to a list of 800, so it also opens it) sends a
    commit of 1,601 created nodes, 803 child lists and 449 KB in 98 ms. After that a keystroke that changes nothing the list shows ("err") re-renders
    the 1,000 option components and sends an empty commit in 11 to 15 ms; one that removes about 600 options ("er") sends one child list (926 bytes)
    in 23 ms. A keystroke is therefore about one frame of JavaScript at 1,000 options, and the first one a visible hitch, the same one opening a
    `Select` of that size has. **No `items` prop was added**: the cost is Select's, it is not growing per keystroke, and a render-function `items`
    prop would save the re-render of options that did not change without changing the open cost, which only windowing the list would; windowing
    belongs to a scroll container's virtualisation (not built: `ScrollView` notes) and would serve `Select` too. What native costs for a commit of 2,000
    nodes was not measured here (no window could be opened, see "Not verified").
12. **Native accessibility.** A `TextInput` with `role="combobox"` is a `TEXT_FIELD` with the list popup type and `expanded` (the server has no
    combobox role; its select-only one is a button, and a `View` with the role still maps to it, unchanged). Two props are new:
    `aria-activedescendant` and `aria-controls` (`UIAriaProps`, `src/props.ts`, `native/props.rs`, validated non-zero) become
    `update_set_active_descendant` and `update_add_related_controls`. They name an element by its tag, the `id` of a `UIHandle`, since native has no DOM
    ids. A tag that is not in the accessibility tree is logged as an error. **Element identity:** the server replaces a freed and recreated
    element, and a node holding the old element would point at nothing, so the registry gives each element a generation and sends again
    any node whose related element changed (`Registry::needs_apply`, tests that fail without it).
13. **The accessibility lab has a combobox** (`demo/src/a11y-panel.tsx`: two chips, a list open from the start with the first option active, via
    `defaultOpen` and `autoHighlight`). The Godot-side half of `verify:a11y` checks what native holds of it (`demo/src/verify-a11y.ts`: the
    role, `ariaExpanded`, and that `ariaControls` and `ariaActiveDescendant` are the tags of the list and of the first option). **The platform
    tree for it was read once, and no expectation was written from the reading** ("Not verified" has what it showed).


14. **A tap on a `TextInput` was never a click on the Web (found by this track's touch page; a library bug, fixed at its cause).** Evidence, from
    headless Chrome with touch on the Web export, logging the page's own events and the events that reached JS on the combobox's input
    (`page.touchscreen.tap`): `touchstart`, then ten milliseconds later, inside the same handler, `window` and canvas `blur` and `focusin` on the
    engine's hidden `INPUT`, then `touchend`; JS saw `pointerdown`, `focus`, `pointercancel` and no `pointerup` or `click`. Cause: the tap focuses the
    input, native calls `virtual_keyboard_show`, `GodotDisplayVK.show` focuses its element, which blurs the canvas, and the engine reports a canvas
    blur as `NOTIFICATION_WM_WINDOW_FOCUS_OUT`; the root answers that with `cancel_all_pointers()` (D6: a lost window focus cancels the pointers in
    flight), so the finger is cancelled before it lifts. The engine already drops the canvas `focus` and `blur` notifications while its IME element holds
    the focus (`DisplayServerWeb::_send_window_event_callback`, `godot_js_is_ime_focused`), which is why a mouse press on desktop Chrome was
    never affected; it has no such rule for the soft keyboard. A real device takes the same path (the engine's touch callback runs in the DOM `touchstart` handler and
    shows the keyboard there); no real device was tried. `native/pointer_input.rs` (`press_touch`, `release_touch`), `begin_touch_pan`, `text_input_pointer_down` and the fling rule
    were read and are not involved. **Fix:** `ReactUiRoot::call_engine` (which wraps every engine call that moves the browser's focus between the canvas and its
    IME or keyboard element) counts its calls, and `on_notification` ignores `WM_WINDOW_FOCUS_IN` and `_OUT` while one runs
    (`native/lib.rs`, `native/text_input_godot/platform.rs`): the notification arrives synchronously inside the call, it is the library's own focus move, and the
    window did not change. Not changed: a real focus loss still cancels the pointers. **Check:** `runTouchFormsScenario` taps the forms lab's name field
    and requires one `click` on it (`nameClicks` in the lab's readout); the combobox touch page needs the same click to open its list.

## Tests

| What | Where | Count |
| --- | --- | --- |
| Unit tests of the component on `ComboboxHost` (a `TextInputHost` that sends `blur` and `focus` when focus moves, and applies a press's default) | `tests/combobox.test.ts`, `tests/combobox-host.ts` | 98 |
| The two new props in the JS mapping | `tests/props.test.ts` | 1 |
| Select, kit and overlay tests, unchanged by the refactor | `tests/select.test.ts`, `tests/kit.test.ts`, `tests/overlay-queries.test.ts` | 151 |
| Native: the combobox role on a text input, the relations, generations in the registry; the two props parse, merge, reset and are validated | `native/accessibility_model.rs`, `native/props.rs` | 5 new |

**Negative controls (unit tests).** 46 one-line mutants of `src/kit/*` (a script outside the repository, each mutant applied by one string
replacement, the combobox test file run, the file restored by writing its text back; `git status` clean afterwards): loop off, ArrowDown not
prevented, Enter not choosing, no clear on Escape, composition not owning the keys, Alt+Down moving, blur not closing, blur not reverting,
multiple choose keeping the text / closing / resetting the active option, held Backspace, ArrowLeft ignoring the caret, key removal not
refocusing the input, chip remove taking focus, comma typed, a touch press on the list prevented, the list keeping a focus it was given, the
blur-to-list case, wheel outside and inside, touch and disabled hover, the control's padding press, the missing `aria-activedescendant`, `aria-expanded`
from the request, `selectTextOnFocus`, the pristine query, disabled chip removal, custom text, the comma without `allowCustomValue`, blur onto a
chip, the empty list, Ctrl chords, Delete, the trigger and Clear not focusing, the placement gap, looping arithmetic, chip names, Tab choosing,
Enter not committing custom text. **43 died at once; 3 survived** (a repeat of Backspace reaching an empty input, a wheel over the list
closing it, which the test checked before React had rendered it, and Clear not focusing the input when an assistive technology pressed it),
each got a test and then died. All 46 are killed. Native model: the generation check is a test that fails without it (`an_element_is_set_again_when_an_element_it_names_is_made_again`).

## Verified (the finishing pass, branch `combobox-finish`, on main `4fc733b`)

What was run, with the commands, and what they said. Every heavy command went through `.gate/gate`; no window took focus (`scripts/native-run.mjs`
starts verifier windows quiet). Logs are in `artifacts/logs/finish-*.log` and `stock-*.log` (not committed).

| What | Command | Result |
| --- | --- | --- |
| The tap bug, before the fix | `node artifacts/logs/touch-click-diag.mjs` (headless Chrome, touch, the Web export of main plus a temporary event log on the combobox input, not committed) | the tap on the input gave `pointerdown`, `focus`, `pointercancel` and no `click`; a tap on a button beside it was a click (decision 14) |
| Web, Breaka | `node scripts/verify-interaction-web.mjs --only=combobox,touch` | **passed**: `combobox` 180 checks (landscape, portrait, retina landscape and retina portrait, then the touch page), `touch` 59, 256 assertions, 41 captures, no engine gaps |
| Web, stock, the fix switched off | `node scripts/verify-interaction-web.mjs --engine=stock --only=touch` against a stock export built with `if false && self.engine_is_moving_focus()` in `native/lib.rs` | **failed** at "a tap on a text input is a click": the control for the new check |
| Web, stock, the fix in | `node scripts/verify-interaction-web.mjs --engine=stock --only=combobox,touch` | **passed**: `combobox` 180, `touch` 57, 254 assertions, 41 captures; the one recorded gap is `touch-cancel` (stock's Web input maps `touchcancel` to `touchend`, S11) |
| JS tests | `pnpm test` | **630 passed**, 0 failed |
| Types | `pnpm test:types`, and `pnpm test:types --engine=stock` | clean, both |
| Rust | `cargo test --locked`; `cargo clippy --locked --all-targets -- -D warnings` | 694 passed; no warnings |
| Accessibility | `node scripts/verify-a11y.mjs --engine=stock --no-retry` (stock Godot 4.7.2 with AccessKit, macOS Accessibility API, quiet window) | **passed** (`GODOT_REACT_A11Y_VERIFY_PASSED`, `GODOT_REACT_A11Y_NATIVE_PASSED`): the Godot-side checks of the lab's combobox (role, `ariaExpanded`, `ariaControls` and `ariaActiveDescendant` are the tags of the list and of the first option) passed, and the existing expectations still hold with the combobox in the lab; its elements are in `ax-before.json` (below) |
| Formatting | `cargo fmt --check` | flags five files this pass did not touch (`native/motion.rs`, `scroll.rs`, `selection_input.rs`, `style_engine.rs`, `text_input_godot/keys.rs`): main is not format-clean; the files this pass changed are |

Two attempts failed on the way, neither a pass: the first touch page run failed at "a tap opens the list" (the library bug, decision 14), and the next at "a tap
on bare page closes the list", which was the verifier's own mistake: it tapped the title, which the bottom combobox's open list covers; it now taps the lab's
right-hand margin. The stock builds first failed because `pnpm build` type-checks against the stock typings, which need the stock native library built from the
same sources (`pnpm build:native --engine=stock`); that is the freshness guard working, not a code failure.

**Rasters.** The Web run's captures, kept in `artifacts/combobox/web/<viewport>/combobox-<state>-<viewport>.png` (not committed): rest, open, filtered, empty,
single selected, chips wrapped, chip focused, flipped and disabled, at device pixel ratio 1 (landscape, portrait) and 2 (the retina viewports). Looked at: chips
wrapped (retina landscape), chip focused and flipped (landscape). The chips wrap over two lines and the control grows to hold them, the list follows it, the
focused chip has the ring and a tinted fill, the disabled combobox is dimmed with its chips and no remove buttons, the flipped list sits above its control with its
scrollbar and the active option tinted, and the list is as wide as the control. One thing looks odd and was left: when the last chip leaves less room than the
input's 64 px minimum the input drops to a line of its own, so the control ends in an empty row (the placeholder is dropped once there are chips). The native
rasters of `captureStates` (`artifacts/combobox/` on the native runs, DPR 1 and 2) were not looked at by this pass; the coordinator ran the native section.

## Not verified

- **Native windows in this pass.** The native `combobox` section was not run here: the coordinator ran it on main on Breaka and stock and reported it
  passing, and nothing the pass changed is reached by a native run except `call_engine`'s counter, which a desktop window never has a focus notification inside.
  The earlier pass, before windows were stopped, saw the single, multiple and disabled flows of the native section pass up to the bottom combobox's wheel step, which
  it then corrected; it never saw its resize and DPR 2 capture steps pass.
- **What native costs for a long list.** Decision 11's numbers are JavaScript and the commit's size only.
- **The platform accessibility tree for the combobox.** The real macOS tree was read once (`artifacts/stock/native-a11y/run/ax-before.json`, stock engine) and the combobox is in it, but **no expectation for it was
  written into `scripts/a11y-expectations.mjs`** (adding elements there also needs the recorded fixtures in `tests/fixtures/ax-lab` regenerated). What the reading
  shows: the input is an `AXTextField` titled "Fruits" with `AXSelectedChildren` and `AXLinkedUIElements` among its attributes (the adapter's
  mapping of the active descendant and of `aria-controls`; the dump tool lists attribute names for these and does not read their values, so that they name the
  right elements was not read); it shows **no `AXExpanded`** and the tool does not read a popup attribute, so `aria-expanded` and the list popup type are set natively
  (unit tested) and not confirmed in the platform tree; the list is an `AXList` titled "Fruit options"; each option is an `AXStaticText` with its title,
  `AXSelected` true for the two chosen ones and false for the others, and the actions `AXPick` and `AXPress`; each chip's remove button is an `AXButton` titled
  "Remove Apple" with `AXPress`, next to the chip's text (the chip's group, a generic container, is left out of the platform tree like the other groups). Platform
  focus is not judged under isolation (accessibility decision 15), so which element the platform calls focused (the active option, if the adapter follows
  `aria-activedescendant`) is unread. The live region on `Combobox.Empty` is not in the lab.
- **A real touch device.** The Web touch page is headless Chrome's emulated touch with the engine's soft keyboard element; the keyboard's resize of the viewport,
  and what iOS Safari does when the element takes focus, were not seen.
- **VoiceOver, IME on native.** Native IME cannot be injected; the Web IME step is Chrome's `Input.imeSetComposition`.
- **Stock native rasters, Mobile and Forward+ renderers** for the combobox's own drawing (it adds no drawing of its own: borders, fills, the caret and the ring).

## README text

In the kit list (line "a small component kit built from them"): add `Combobox`.

> **Combobox.** `Combobox.Root`, `Control`, `Input`, `Clear`, `Trigger`, `Content`, `Item`, `ItemText`, `ItemIndicator` and `Empty` make an editable
> combobox (the WAI-ARIA editable combobox with list autocomplete): a `TextInput` with `role="combobox"` that filters a list in the overlay layer
> while keyboard focus stays in the input and the active option is announced through `aria-activedescendant` (the `id` of the option's handle;
> native has no DOM ids). `multiple` makes it a multi-select whose choices are chips (`Chips`, `Chip`, `ChipRemove`; the chips and the input wrap together
> in the control). Typing filters (`filter`: a function, or `null` for options a parent fetches) and opens; ArrowDown/ArrowUp open and move (they go
> round), Alt+ArrowDown/Up open and close, Enter chooses, Escape closes and then clears, Home and End are the caret's, Tab leaves and chooses nothing;
> `allowCustomValue` makes typed text a value (Enter, a comma in a multiple one). Backspace in an empty input moves onto the last chip and a second
> press removes it. There is no backdrop: a press outside reaches what is under it and the input's `blur` closes the list; a wheel anywhere but over the
> list closes it too (`useRootEvent('wheel', ...)`, a document-level listener, is exported). A mouse press on the list is prevented to keep focus in the
> input; a touch is not (a prevented press cannot become a pan), and the list gives the focus straight back. `value`, `inputValue` and `open` are
> controllable. Options are children, as in `Select`; a thousand cost what a thousand `Select` items cost (docs/tracks/combobox.md), and
> there is no virtualisation.

New text-input props in the "Accessibility" paragraph: `aria-activedescendant` and `aria-controls` take the `id` of an element handle.
