# Track: component kit, part 1 (Checkbox, Switch, RadioGroup, Slider)

Branch `kit`, based on `edf7385`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md` and
`docs/INTERACTION_PROGRESS.md` are not edited here. This is the first part of Phase I8, TypeScript and React
only, with unit tests. Select, TextField and ScrollView wait for Portal (I4), scrolling (I5) and TextInput (I7).
No native, demo or verifier file changed, and nothing here has been seen in a Godot window or a browser: the
layout and motion claims below are reasoned from the native source and are listed under "Not verified".

| What | Where | Commit |
| --- | --- | --- |
| Kit, ARIA typing, exports, tests | `src/kit/*`, `src/types.ts`, `src/components.tsx`, `src/index.ts`, `tests/kit*.ts`, `tests/prop-tree.ts` | `483b25a` |
| These notes, one comment fix | `docs/tracks/kit.md`, `src/kit/slider.tsx` | the commit after `483b25a` |

## Public API

All four are exported from `src/index.ts` with their prop types. Every part takes `className` and `style` (the
part's own defaults first, the caller's after, so the caller wins) and every component forwards a `ref` to
`UIHandle`. Each is controlled (a defined value prop) or uncontrolled (`defaultX`) through
`useControllableState` (`src/kit/use-controllable-state.ts`, not exported from the package).

```tsx
<Checkbox checked? defaultChecked? onCheckedChange?(checked: boolean) disabled? testID?
          className? style? boxClassName? boxStyle? indicatorClassName? indicatorStyle? {...aria}>label</Checkbox>
// checked: boolean | 'indeterminate'. Button role="checkbox", a box, a filled inner box (a bar when indeterminate).

<Switch checked? defaultChecked? onCheckedChange?(checked: boolean) disabled? testID?
        trackWidth? thumbSize? thumbInset? className? style? trackClassName? trackStyle? thumbClassName? thumbStyle?
        {...aria}>label</Switch>
// Button role="switch" > track View > [spacer View (width transition), thumb View]. Defaults 44 / 20 / 2 px.

<RadioGroup.Root value?: string | null  defaultValue? onValueChange?(value: string) disabled?
                 orientation?: 'horizontal' | 'vertical'  testID? className? style? {...aria}>
  <RadioGroup.Item value: string disabled? testID? className? style? circleClassName? circleStyle?
                   indicatorClassName? indicatorStyle? {...aria}>label</RadioGroup.Item>
</RadioGroup.Root>
// Root: View role="radiogroup". Item: Button role="radio" > circle View > dot View.

<Slider.Root value? defaultValue? onValueChange?(v) onValueCommit?(v) min=0 max=100 step=1
             orientation?: 'horizontal' | 'vertical' disabled? testID? className? style?>
  <Slider.Track testID? className? style?>        // a flex row; appends the empty remainder after its children
    <Slider.Range testID? className? style? />    // the filled part
    <Slider.Thumb testID? className? style? {...aria} />   // View role="slider", tabIndex 0, takes the keys
  </Slider.Track>
</Slider.Root>
```

`aria` is every `aria-*` prop except the ones the component sets itself (`role`, `aria-checked`, and for the
slider `aria-valuemin/max/now` and `aria-orientation`); the component's own values are applied after the
caller's, so they cannot be overridden. The slider's ARIA lives on the Thumb, so `aria-label` goes there.

## ARIA typing

`src/types.ts` gains `UIRole` (the roles of plan Appendix D) and `UIAriaProps` (`role`, and the `aria-*` props of
plan 4.2, plus `aria-orientation`); `UIProps extends UIAriaProps` in `src/components.tsx`. They are JavaScript-only:
`nativeProps` ignores them and `NATIVE_PROP_KEYS` in `src/props.ts` is unchanged (that file is not touched).
Two tests pin it: `nativeProps` returns `{}` for every aria prop and `NATIVE_PROP_KEYS` holds none, and every
commit payload of a mounted View, Button and each kit component contains only native keys.

## Checks

| Command | Result |
| --- | --- |
| `pnpm test:types` | clean |
| `pnpm test` | 178 passed, 0 failed (105 before this track, 73 added in `tests/kit.test.ts`) |
| esbuild bundle of `src/index.ts` and `tsc -p tsconfig.package.json`, both into the scratchpad | both succeed, so JSX in `src` bundles (`react/jsx-runtime` stays external) and the declarations emit |

The 73 tests: 2 for ARIA not reaching native, 5 for the hook, 9 Checkbox, 8 Switch, 16 RadioGroup (two of them on
the pure helpers `arrowDirection` and `adjacentEnabledIndex`), 5 for slider math, 24 Slider, 4 for ARIA output.

### Test infrastructure

- `tests/kit-host.ts` `KitHost extends RecordingHost` (a subclass so `tests/recording-host.ts` is untouched and
  cannot conflict with the other tracks). It adds what the kit depends on and each piece cites the native source it
  copies: `focusNode` refuses what `native/focus.rs` refuses (not a button, no `tabIndex`, or in a disabled
  element); Enter and Space press a focused enabled button when `keydown` is not prevented and the matching
  `keyup` clicks it with pointer 0 and no pointer type (`native/keyboard_input.rs` `key_down_default`,
  `key_up_default`); `keyup` is cancelable as native awaits it; a captured pointer's events go to the capturing
  element and an up or cancel ends the capture. Helpers: `pressKey`, `keyDown`, `keyUp`, `pointer`, `setRect`.
- `tests/prop-tree.ts` is a second, tiny persistent-mode reconciler that renders elements to a plain tree with
  every prop. JavaScript-only props never cross to the fake host, so this is the only way to read `role` and
  `aria-*` back. Used by the four ARIA output tests only.
- A pointer move is a continuous event, so React renders its update later: tests that look at what a move drew
  `await settle()` first (a 10 ms timer); callbacks are synchronous.

### Negative controls

One sweep, before the coordinator's rule against repeated runs, with a throwaway script in the scratchpad (not in
the repository): each mutant was one string replacement in one source file, the kit test file was run, and the
file was restored by writing its original text back (`git status` was clean afterwards). 43 mutants were
defined; 41 ran and every one was killed; two (S5 Switch wrong role, L14 Slider wrong role) never ran because
their pattern matched twice, and were not re-run.

| Component | Mutants killed (by the named test group) |
| --- | --- |
| Checkbox | Enter not prevented (Space/Enter test); indeterminate click asks for unchecked; `disabled` not passed on; indeterminate reported `true` (ARIA output); caller class placed before the default (passthrough) |
| Switch | spacer width inverted; spacer transition removed; travel ignores the inset (geometry); `disabled` not passed on; click does not toggle |
| RadioGroup | tab stop ignores the selection; every item a tab stop; arrows clamp instead of wrapping; arrows stop on disabled items; arrows not prevented; arrows do not call `focus()`; orientation ignored; Enter not prevented; removed items stay registered; Ctrl/Alt/Meta not ignored |
| Slider | pointer not captured; pointerdown not prevented; no thumb focus; no grab offset; fraction not clamped; Page = 5 steps; keys not prevented; no float rounding; vertical not reversed; remainder grows with the value; drag never ends; `disabled` ignored for a press and for keys; Home goes to the wrong value; commit on every change; max not rounded to the grid |
| `useControllableState` | compare with the rendered value instead of the latest request; a controlled request does not re-render; the mode switch is not reported |
| ARIA | `role` sent to native in `nativeProps`; `role` added to `NATIVE_PROP_KEYS` |

## Decisions

1. **Buttons activate natively; the kit listens for `click`.** Checkbox, Switch and RadioGroup.Item are `Button`s,
   so Enter and Space already press them and `click` follows on `keyup` (plan 3.14, D19b). One `onClick` then
   serves a pointer, a touch, Space, and later an accessibility action. The kit only removes what the Authoring
   Practices exclude: Checkbox and RadioGroup.Item `preventDefault()` Enter on `keydown` and `keyup` (so the
   button does not activate and the game does not see a stray release). Switch has no key handler. This is
   Radix's approach. Handling Space in `onKeyDown` instead was rejected: it would lose the native `active` look,
   the repeat rule and the consumed `keyup`. Evidence: `native/keyboard_input.rs` `key_down_default` / `key_up_default`.
2. **Checkbox and Switch are single components with part props, not Radix `Root`/`Indicator`.** A label is part
   of the button (so pressing it toggles it) and the box and thumb are internal; `boxClassName`, `trackStyle`
   and the like reach each part. RadioGroup and Slider are compound as briefed. `onCheckedChange` receives a
   `boolean` (a click never produces `'indeterminate'`; Radix types it `CheckedState`), and
   `useControllableState<T, S extends T>` lets the state hold `CheckedState` while the setter takes `boolean`.
3. **`useControllableState` compares with the latest request, and a controlled request re-renders.** The drain
   loop delivers many `pointermove` events before React renders (continuous updates are not flushed per event,
   `src/renderer.ts` `processEvent`), so comparing with the rendered value drops a move back to it. After a
   controlled request the hook renders its component so a parent that declines shows its value again and
   the same request is reported again (a later key press for the same step). Switching between controlled
   and uncontrolled is `console.error`, as React does for inputs, and the state keeps working.
4. **A disabled element gets the `disabled` prop on the root and on parts that need `disabled:` styles**
   (native applies `disabled:` only to a node with its own prop, `native/props.rs:207`). Click handlers have no
   guard: the dispatcher drops the click family for a disabled path (`src/renderer.ts` `dispatch`) and native
   sends no pointer to one. Key and pointer handlers of the Slider and RadioGroup do check `disabled`, because
   `keydown` and `pointerdown` are not filtered by the dispatcher and a batch can deliver one after an earlier
   event disabled the control.
5. **RadioGroup.** `value` is `string | null`; `null` is a controlled group with nothing selected (`undefined`
   means uncontrolled). The tab stop (`tabIndex 0`) is the selected item if it is enabled, else the first enabled
   item; every other item is `-1` (task: "checked item, or the first"; the disabled cases are mine). Orientation
   is Radix's: unset takes all four arrows, `'horizontal'` only Left and Right, `'vertical'` only Up and Down, and
   the other axis's keys are not prevented. Arrows with Ctrl, Alt or Meta are ignored. Home and End are not
   handled (not in the Authoring Practices radio pattern). Items register in a layout effect and the group
   keeps them in an array in mount order, so a group mounts in two native commits (the second sets the tab stop).
   **Limitation:** an item inserted into the middle of a mounted group, or a keyed reorder, is not walked in
   its new place. JS has no document-order query; `native/mount.rs` `document_order` exists but is not exposed.
6. **Slider layout.** One value, no range slider (not asked for; adding one is a new component, not a change
   of `value`'s type). The track is a flex row `[Range, Thumb, remainder]`; Range and the remainder get
   `flexGrow` of `fraction * 100` and `100 - fraction * 100` with `flexBasis 0`; the Thumb has a fixed size. The
   factors are percentages because Taffy hands out only `sum(flexGrow)` of the free space when the sum is under 1
   (`taffy .../src/compute/flexbox.rs:1899`), which would break a slider whose range is 0 to 0.5. **Deviation from
   Radix: the Thumb is inside the Track**, because there is no `position: absolute` before I4 and the thumb has
   to share the row. When I4 lands the thumb can become a sibling of the track without changing the part names.
   The Track is the bar (6 px, rounded), the Thumb is taller than it and Taffy centres an overflowing flex item
   (`flexbox.rs:2481`: unsafe centring) and native hit testing descends into children outside a non-clipping
   parent (`native/mount.rs` `hit_node`).
7. **Slider values.** The grid starts at `min` (`min 1, step 2` is 1, 3, 5), as in HTML. When `max` is not on the
   grid the slider's end is the last grid value (`max 10, step 3` ends at 9), so the thumb reaches both ends of
   the track; `aria-valuemax` reports that value. Rounding uses the decimals of `step` and `min` to remove float
   noise (`0.1 * 3`). `min >= max`, a non-positive or non-finite `step`, and `step > max - min` throw from render
   with a message that says which. A controlled value outside the range is shown at the end it is past.
8. **Slider pointer.** The root takes `pointerdown`, `pointermove`, `pointerup`, `pointercancel`. A primary press
   reads `getRect()` of the track and the thumb once, captures the pointer on the root, calls `preventDefault()`,
   and focuses the thumb. The prevent is needed because native's default for an unprevented press on a
   non-focusable element (the track) clears element focus (plan 3.11, 3.13), which would undo the explicit
   `thumb.focus()`; capture also stops touch panning (plan 3.12, gesture arbitration step 1). The value puts the thumb's **centre**
   under the pointer over a travel of `trackLength - thumbLength`, clamped to the ends, so a pointer far outside
   the track still reaches the root (captured) and gives an end. A press that lands on the thumb element does not
   change the value and keeps the grab offset; a press on any other element, a child of the thumb included, jumps.
   A second pointer is ignored while one drags; a non-primary button is ignored.
9. **`onValueCommit`.** Once per drag when the pointer goes up or is cancelled, and once per key press, only if
   the value differs from where the drag began (Radix's rule). A cancel commits what the drag reached.
10. **Slider keys** on the Thumb, all prevented, none with Ctrl/Alt/Meta: Right and Up `+step`, Left and Down
    `-step` (whatever the orientation, per the Authoring Practices), PageUp and PageDown `10` steps
    (`PAGE_STEPS`; the practices leave the amount open), Home and End. A key at an end is still prevented but
    changes and commits nothing. Shift+arrow is not special (Radix makes it ten steps).
11. **Switch geometry is numeric props** (`trackWidth` 44, `thumbSize` 20, `thumbInset` 2), because the spacer's
    `width` must be a pixel value (a pixel/percentage transition is rejected, D3) and so JavaScript has to know
    the travel; sizing the parts with a class instead breaks the travel. A `trackWidth` too small for the thumb
    throws. The track also transitions `backgroundColor`. The durations are named constants.
12. **Defaults are a neutral slate and indigo look from supported utilities only** (every default class is
    compiled by the tests, and an unknown one would throw). No `hover:` styles: `hover` matches the hovered node and
    its ancestors, not the other way, so a box cannot react to the pointer being over its label; the native focus
    ring is drawn on the focused button. Caveat: the caller's unconditional class comes after the defaults'
    `disabled:` layer, so a caller's `opacity-75` also applies while disabled.
13. **No wrapper `Slot` / `asChild`.** The evaluation asked for it to be confirmed before committing the API to
    it; nothing in this part needed it, so it is left for Select and the later parts.
14. **`aria-orientation` is added to `UIAriaProps`** although plan 4.2 has no native field for it (the brief needs
    it on the slider and radio group). Phase I10 must add a field or ignore it. `aria-labelledby`,
    `aria-describedby`, `aria-pressed`, `aria-invalid` are not typed because 4.2 does not list them.
15. **Tests live in `tests/kit.test.ts` with two helper files** (`kit-host.ts`, `prop-tree.ts`); `recording-host.ts`
    is untouched. Shared-file edits are small so the merge with the positioning track stays easy: `src/types.ts`
    gets one block appended; `src/components.tsx` changes the `./types` import line and the `UIProps` declaration
    line; `src/index.ts` gets the kit exports (a block after the `./components` exports) and `UIAriaProps`, `UIRole`
    in the types export.

## Not verified

- Nothing was rendered: the native layout, the thumb overflowing the track and its centring, the hit area, the
  focus ring on the checkbox, the opacity of a disabled subtree, and the `disabled:` / `cursor` styles are
  reasoned from source only. Check them first in the Inputs demo, at both viewports.
- That native accepts the Switch transitions in `commit` (D3): the spacer goes `0 <-> 20` px with `flexShrink 0`, both
  pixels, which should pass, but no Rust or Godot ran here.
- Touch on the Slider (the press captures the pointer; a slider inside a scroll container needs I5's `touchAction`
  semantics checked), and keyboard focus on the Slider's thumb in a real window.

## What the next parts need from this

- **Select** (needs I4 Portal and a root-size accessor): reuse `useControllableState`, `parts.ts`
  (`joinClassNames`, `useStyle`, `useComposedRef`), `keys.ts`, and `KitHost`. The RadioGroup registry (items
  register in a layout effect, the group walks them skipping disabled ones, wrapping) is the pattern for options;
  it needs a document-order query to be right for options added later, so expose one from the renderer
  (`documentOrder(tags)` over `committed`, or a native query over `document_order`) before Select and decide
  whether RadioGroup moves onto it. Roles `combobox`, `listbox`, `option` are in `UIRole`.
- **TextField** (I7): `aria-labelledby` / `aria-describedby` are not typed yet and a FormControl needs ids
  (`useId` works under this reconciler: RadioGroup uses it). The controlled-value protocol of `TextInput` is
  not the same as `useControllableState`; do not force it through that hook.
- **ScrollView** (I5): the Slider and the RadioGroup rely on no scrolling today. A Slider inside a ScrollView
  should set `touchAction: 'none'` on the root once it exists (capture already prevents the pan, but say so in the
  style too), and the track's `getRect()` is root-local so it stays right when the content is scrolled.
- **Phase I10:** the kit already sets `role` and `aria-*` on the right nodes. Needed natively: `role`, `ariaChecked`
  (`true|false|"mixed"`, which `aria-checked` maps onto directly), `ariaValueMin/Max/Now`, `ariaLabel`,
  `ariaDescription`, `ariaValueText`, a field or a decision for `aria-orientation`, and the `disabled` prop for
  FLAG_DISABLED (already set on the slider's thumb and the radio items). The slider's increment and decrement
  actions should call the same `valueForKey` / `snapToStep` logic (`src/kit/slider-math.ts` is pure). When the
  props become native, `tests/kit.test.ts` ARIA output tests can read the snapshot and `prop-tree.ts` can go.
  The "ARIA is not sent" tests must then be changed to assert the new native fields instead.
