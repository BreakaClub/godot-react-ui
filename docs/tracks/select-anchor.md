# Track: Select (Phase I8, part 2) and the anchored label (Phase I11, part 2)

Branch `select-anchor`, based on `5b31cdf`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md` and
`docs/INTERACTION_PROGRESS.md` are not edited here. Two independent pieces: the kit `Select` with the renderer
queries it needed, and a 2D label that follows a moving 3D node. No Rust changed (so no dylib, typings or `gen/`
change); the installed dylib is the default release build.

| What | Where | Commit |
| --- | --- | --- |
| Document-order and root-size queries, `Select`, RadioGroup on document order, tests | `src/renderer.ts`, `src/components.tsx`, `src/native.ts`, `src/index.ts`, `src/kit/{select.tsx,collection.ts,listbox.ts,popover-position.ts,keys.ts,radio-group.tsx,index.ts}`, `tests/{select,overlay-queries,kit,kit-host,prop-tree,recording-host,renderer}.test.ts` (and helpers) | `4b63507` |
| Inputs lab, `inputs` verifier section; Select closes on resize, disabled items stay in the list | `demo/src/{inputs-lab.tsx,labs.tsx,main.ts,verify-interaction.ts}`, `src/kit/select.tsx`, `tests/select.test.ts` | `652975c` |
| Anchored label, `verify:world` section, recipe | `demo/src/{world-label.tsx,world-main.ts,verify-world.ts}`, `docs/WORLD_SPACE.md`, `scripts/verify-world-web.mjs` | `973bc36` |
| These notes and the last verifier edits | `docs/tracks/select-anchor.md`, `demo/src/verify-interaction.ts` | the commit after `973bc36` |

## APIs

**Renderer** (`src/index.ts` exports `useRootSize` and the type `RootSize`):

```ts
handle.compareDocumentOrder(other: UIHandle): number   // < 0 if handle comes first; 0 for the same element
useRootSize(): RootSize                                // { width, height } of the root's Control, logical pixels
interface NativeHost { readonly size: { x: number; y: number } }   // Control.size, read on demand
```

`compareDocumentOrder` orders by the pre-order of the whole tree, main layer first, then the overlay layer (the
order Tab follows and the snapshot's `documentIndex`). It is answered from the committed instances in JS, with no native
call: the index map is built on the first query after a commit that changed the structure (a payload) and dropped by the
next one. It throws for an element that is gone, the root handle, or a handle of another root (tags are per root, so
identity is what tells them apart).

`useRootSize()` is `useSyncExternalStore` over a per-root cache. Reading it makes the renderer read `host.size` (the
Godot `Control.size` property, which is exactly what native's `sync_viewport` lays out in). While nobody watches, every
read goes to native, so a popover opened between two frames is placed with the size of now; while a component watches,
`dispatchEvents()` (which owners call once per frame) reads it once per call and renders the watchers again only when it
changed. A root nobody asked the size of never reads it.

**Select** (`src/kit/select.tsx`, exported from `src/index.ts` with its prop types):

```tsx
<Select.Root value? defaultValue? onValueChange?(v: string) open? defaultOpen? onOpenChange?(o: boolean) disabled?>
  <Select.Trigger className? style? testID? {...aria}>             // Button role="combobox", aria-expanded
    <Select.Value placeholder? className? style? testID?>{children replaces the text}</Select.Value>
    <Select.Icon />                                                // a caret drawn from 1 px boxes
  </Select.Trigger>
  <Select.Content testID? sideOffset=4 collisionPadding=8 className? style? {...aria}>   // View role="listbox", in a Portal
    <Select.Item value disabled? textValue? testID? {...aria}>     // Button role="option", aria-selected, aria-disabled
      <Select.ItemText>Apple</Select.ItemText>
      <Select.ItemIndicator />                                     // renders only while selected; children replace the dot
    </Select.Item>
  </Select.Content>
</Select.Root>
```

`value` is `string | null` (`null` is a controlled select with nothing selected), as in `RadioGroup`; both `value` and
`open` go through the kit's `useControllableState`. Keyboard (WAI-ARIA Authoring Practices, select-only combobox, all
natively verified except where noted): on the trigger Enter and Space (the button's own activation) and ArrowDown and
ArrowUp open the list; opening focuses the selected item, else the first enabled one, else the list itself; in the list
ArrowDown and ArrowUp move without wrapping and skip disabled items, Home and End jump, Enter and Space choose (the item
is a button), Escape closes, Tab chooses the focused item, closes and lets native move on from the trigger, a letter
moves to the next item that starts with what was typed (one second window, the same letter again walks on; unit
tested, and `b`, `b` natively). Closing by any user path (item, Escape, Tab, backdrop) gives focus back to the trigger.

## Decisions

1. **Root size: a native query (`Control.size`) read on demand, not a resize event.** The brief said "JS-side
   reading only", and an event needs an `EventPayload` variant, a `NativeEventType`, an `EVENT_TABLE` entry and a
   `UIEventMap` entry in the same hot files the `scroll` track edits for its own event, for a value that changes once a
   window is resized. The host is a `Control`, and GodotJS exposes `size` as a property of it (`getSize` does not
   exist in the typings: the first typecheck said so), so no `#[func]` is needed either. The cost of this choice is a
   native read per `dispatchEvents()` while something watches; an event would make that free. If `scroll`'s event
   machinery lands first, a `resize` event is a few lines on top of it and `readRootSize` would stop reading.
2. **Document order: JS, from the committed instances, not a native query.** A native `#[func]` would have to take a
   tag list (GodotJS cannot pass a plain JS array, so JSON) or be called per tag; the committed tree is the same tree as
   native's mounted one by the commit invariant, the walk is O(tree) once per structural commit, and nothing in
   `NativeHost` changes. The definition is native's (`MountedTree::document_order`), checked natively: the Inputs
   verifier reverses a radio group and compares the keyboard walk with the snapshot's `documentIndex`.
3. **`RadioGroup` moved onto it.** Its documented limitation (an item inserted in the middle or a keyed reorder was
   walked in mount order) is gone for arrow keys, and the tab stop ("the first enabled item") follows too. The tab stop
   is derived in a layout effect (`useInDocumentOrder`, `src/kit/collection.ts`) that renders again only when the order
   is not the registration order, so a group that mounts in the order it is shown still costs two commits (a test pins
   it). Before this a render could only read the previous commit's order.
4. **No `react-stately`, no new dependency.** Not needed: Select's state is `open`, `value` and the item registry, and
   the helpers are small and pure (`listbox.ts`, `popover-position.ts`, both unit tested). The evaluation's open
   question (does GodotJS's V8 have `Intl`?) is answered for native by a line the `inputs` section logs,
   `GODOT_REACT_RUNTIME_FACTS`: it does not (see Runtime checks), and `react-stately`'s slider and select state use
   `Intl.NumberFormat` and `Intl.ListFormat`. Not adopting it leaves `Menu`, `Tabs` and `Combobox` still possible later
   (reconsider with a polyfill if their state grows), as the evaluation said.
5. **A closed Select still renders its items, in a collecting mode.** `Select.Value` has to show the selected item's
   text before the list was ever opened, and the items live in the list. Radix renders them into a detached fragment;
   there is no detached container here, so `Select.Content` renders its children when closed too: each `Select.Item`
   registers `{ value, textValue, disabled }` and renders nothing, inside one `display: none` View (so a wrapper the
   caller put between the content and the items adds no gap or space). An item's text is `textValue`, else the text of
   its string children and `Select.ItemText`s, else its `value`. The open list renders the same elements as buttons.
6. **Focus lives in the list.** The selected item takes focus on opening and the arrow keys call `focus()` on the next
   item (Radix's model, and "focus returns to the trigger" in the brief), not `aria-activedescendant`. The item under
   the pointer takes focus too (`pointerenter`, `focusVisible: false`), so the pointer and the keyboard share one highlight
   (`focus:`) and only the keyboard shows the ring. The list is `tabIndex -1` so that a list with no enabled item still has
   somewhere for focus and Escape to go. Keys are handled on the list and clicks on the items: overlay events bubble
   along the overlay's own tree (D26), never through the React ancestors of the `<Portal>`.
7. **A press on the list prevents the `pointerdown` default.** Native clears element focus for a press on something
   that cannot take it (plan 3.11, D11), which would end keyboard handling after a click on the list's padding. Items still
   click (the default being prevented only skips the focus change). Verified natively.
8. **A disabled item is not natively `disabled`; it is `aria-disabled`, dimmed and inert.** Evidence: native sends no
   event for a press on a disabled element (`press_mouse` filters the target with `is_disabled`) and then runs the
   `pointerdown` default for the hit, which clears focus, so JS cannot prevent it. Negative control: with `disabled`
   passed to native the `inputs` section fails with "Pressing the disabled item leaves focus in the list ...: none".
   This departs from kit decision 4 ("a disabled element gets `disabled` on the parts that need `disabled:` styles"): the
   dimming is a class (`opacity-50 cursor-not-allowed`) here. I10 must map `aria-disabled` to the disabled flag on its own.
9. **A resize while the list is open closes it** (Radix does the same), instead of placing it again. First built the
   other way, and the native run showed why that fails: after the root shrinks, layout runs before JS can place the list
   again, and `layout.rs` drops the focus of an element that is no longer visible for input
   (`visible_for_input`), so the list placed itself correctly but keyboard focus was gone ("focus none, root focus
   true"). Closing is consistent: `dismiss()` focuses the trigger. Tested at both levels.
10. **Placement is measured, in the same JS turn.** The list renders at the origin, a layout effect reads the trigger's and
    the list's `getRect()` and the root size, and `placePopover` (pure) puts it under the trigger with the left edges
    aligned, flipped above when it does not fit below and there is more room above, kept `collisionPadding` inside the
    root, at least as wide as the trigger. Both commits run before anything is drawn. A list taller than either side is
    pinned to the nearer edge and clipped by the window: `ScrollView` (I5) is the answer, and `Select.Content` takes a
    `className` for it then.
11. **Tab chooses the focused item and is not prevented.** `choose()` focuses the trigger first, so native's Tab default
    moves on from the trigger (APG: "Tab ... sets the value ... closes the listbox, moves focus to the next focusable
    element"). Verified natively: focus lands on the next tab stop.
12. **Not done, deliberately:** Radix's press-drag-release (open on `pointerdown`, choose on `pointerup` over an item), item
    groups and separators, `position="item-aligned"`, and touch verification (Web only; the clicks are the same
    events). `aria-haspopup`, `aria-controls` are not typed (I10).
13. **Tests: a prop-tree portal and inert handle.** `tests/prop-tree.ts` now gives refs a real `compareDocumentOrder` over
    the tree being rendered and records what a portal rendered (`portalNodes`), so the ARIA output of the open list can be
    read; its `getRect`, `focus` and `blur` are inert, and everything else is tested against `KitHost` (which gains
    `rectsByTestID` for rectangles layout would have produced).
14. **Anchored label: a second root, rendered by the owner each frame.** `render()` is synchronous, so the label and the
    node are always in the same frame (a store and `useSyncExternalStore` would commit on a microtask). The node is placed
    from panel pixels with `quadPixelToLocal` (the inverse mapping, "where it fits") and is a child of the quad, so on the
    quad's plane it projects to the point `screenPointOf` gives that pixel, which the verifier asserts to tie the two directions.
    A node behind the camera hides the label with `display: none` (`unprojectPosition` returns a mirrored point).
15. **The orbiter's colour is `#33b2e5`, not a Tailwind green.** The Compatibility renderer shades unshaded materials in 8
    bits of linear colour: emerald-500's red channel (16) came out as 11 and failed a pixel probe. Every channel is now well
    above black.
16. **The verifiers park the orbiter.** The other `verify:world` captures read pixels over the quad, and an orbiting
    sphere and label would cross them, so the run parks the node off to one side first (their PNGs are unchanged); the Web
    verifier gets the same one-line call (not re-run).

## Tests

| Command | Result |
| --- | --- |
| `pnpm test:types` | clean |
| `pnpm test` | 255 passed, 0 failed |
| `cargo test --locked` | 400 passed (no Rust changed) |
| `cargo clippy --locked --all-targets` | 0 warnings |
| `rustup run stable cargo fmt --check` | clean |

New (62): `tests/overlay-queries.test.ts` 11 (document order 6, root size 5), `tests/select.test.ts` 48 (the pure helpers
`placePopover`, `stepEnabled`, `typeAheadMatch`; closed state and `Select.Value`; pointer; keyboard; type-ahead; controlled
and uncontrolled; placement and resize; errors and ARIA output), `tests/kit.test.ts` +3 (RadioGroup walks items where they
are shown, tab stop after a reorder, no extra commit for a group that mounts in order). `pnpm test`: 255 pass, 0 fail
(193 before this track).

### Negative controls

Unit tests, one mutation at a time, the file restored after each (`git diff` empty): every one failed the named tests.

| Mutation | Failed |
| --- | --- |
| overlay before main in the order | "the overlay layer comes after the whole main layer" |
| order cache not dropped on a structural commit | "a keyed reorder and an insertion in the middle ..." |
| `dispatchEvents` does not read the size | `useRootSize` renders, "every component that uses the size follows it" |
| size not re-read while unwatched | "a size read while nothing watches is current" |
| `subscribe` not stable (resubscribes each render) | "renders again only when it changes" (reads per dispatch) |
| RadioGroup arrow walk in registration order | "RadioGroup walks the items where they are shown" |
| RadioGroup tab stop in registration order | "... the item shown first the tab stop, also after a reorder" |
| `placePopover` never flips | 3 tests (pure and Select, resize) |
| focus not returned to the trigger | 5 (item, backdrop, Enter/Space, Escape, Tab) |
| closed list collects nothing | 8 (`Value` before opening, text sources, choosing, controlled) |
| Tab prevented | "Tab chooses the focused item ..." |
| arrows wrap | `stepEnabled`, "arrows move focus without wrapping" |
| press on the list not prevented | "a press on the list is not allowed to take focus" |
| type-ahead reset timer not cleared | "type-ahead cancels its pending reset" |
| collector not `display: none` | "closed adds one hidden node ..." |
| opening takes no focus | the keyboard and focus tests (the mutated suite had to be run on a quiet host: the first attempts only looked hung, see "Environment") |
| backdrop does not close | 1+ |
| pointer enter focuses a disabled item | "a pointer entering an item ..." |
| `minWidth` ignores the trigger | "places the list under the trigger ..." |

Native, one run each (windowed):

| Mutation | Failure |
| --- | --- |
| Select items natively `disabled` | `inputs`: "Pressing the disabled item leaves focus in the list ...: none" |
| `useRootSize` never subscribes | `inputs`: "Resizing the root closes the open list" |
| label shown for a node behind the camera | `verify:world`: "A label for a node behind the camera is not shown" |
| label root takes pointers | `verify:world`: "Moving onto the projected Add button hovers it: null" (the whole-window root eats the very first hover, before the label section) |

## Runtime checks

Native, Godot 4.8 Compatibility renderer (Metal), both viewports, each verifier once for the gate:

| Command | Result |
| --- | --- |
| `pnpm verify:interaction` | passed, landscape and portrait, sections `events, cooperation, pointers, keyboard, positioning, inputs`. The landscape window lost OS focus once (`GODOT_REACT_RUN_DISTURBED`) and passed. Portrait failed once in `Stop toggle reads on` (an `events` assertion, not mine) with a window focus loss in its log, so D22 ran it again, and it passed on attempt 2 (the failed attempt's log is `artifacts/native-interaction/portrait/run-attempt-1.log`) |
| `pnpm verify` | passed, both viewports |
| `pnpm verify:world` | passed, both viewports, no disturbance |
| `--only=inputs` while developing (one window each) | 7 runs (6 landscape, 1 portrait): the first four failed at an assertion each, the last three passed; and 2 `verify:world` runs, the first failing on the sphere's colour |

Failures found while building, none of them flakes: the select's `props.disabled` is `false`, not absent, in a native snapshot (my
assertion; runs 1); focus lost after a resize (decision 9, a real native behaviour; runs 2 to 4, the third and fourth added diagnostics
that showed "focus none, root focus true"); the sphere's red channel (decision 15).

What the kit notes asked to be checked in a window (all `inputs` assertions, both viewports):

- **Slider thumb overflow, centring, hit area.** Track 6 px high, thumb 20 px, the thumb sticks out above and below the track,
  its centre is on the track's within 1 px, at 40 its centre is 40 % along the travel, and a pointer at a point where the thumb sticks
  out of the track (above it) hits the thumb (native hit testing descends into children outside a non-clipping parent). Dragging the
  thumb 60 px right, and 20 px off the track vertically, sets the value the travel says (within 1); pressing the thumb does not move
  it and focuses it; ArrowRight, PageUp, Home, End and a press on the track (to 50 and to 25) give the values the math says.
  `geometry()` in the verifier rejects a child outside its parent, so `capture()` takes an `overflowing` list of test IDs (the thumb).
- **The Switch's `0 <-> 20` px spacer transition is accepted** by native (D3 rejects what it cannot animate, and nothing was
  rejected): after a press the spacer is 20 px wide and the thumb 22 px in, `animationFrames` rose (it did animate), Enter takes it
  back to 0 px, Space turns it on again; the locked, checked switch shows its thumb on.
- **The `disabled` opacity reaches the subtree.** The locked checkbox's button has presentation opacity 0.5 and its mark, a grandchild,
  is drawn at about the 50 % blend of indigo over the page (the probe is within 0.05 of it), against exactly `#4f46e5` for the enabled
  one. A press on it changes nothing and gives it no focus.
- **RadioGroup mounts over two commits** and ends with exactly one radio tab stop (the selected item; the unselected and the
  disabled one are `tabIndex -1`); arrows move focus and selection together, skip the disabled item and wrap; the tab stop follows
  the selection; after Reverse (a keyed reorder) the items are shown in the reverse order, native's `documentIndex` is reversed, and
  ArrowRight from the item shown last goes to the next item in the new order (`small` to `large`, past the disabled `huge`),
  which mount order would not give (`medium`). So the JS document order agrees with native's.
- **Select.** Closed: placeholder, no list, no items. A press opens it in the overlay layer, under the trigger (4 px gap, left edges
  aligned), at least as wide as the trigger, with a backdrop that covers the window, focus on the first enabled item and no ring; a
  pointer over an item focuses it, over the disabled one moves nothing; a press on the disabled item and on the list's padding keeps focus
  in the list; ArrowDown skips the disabled item and stops at the end, Home, End, `b` then `b` again (type-ahead, the game saw no key);
  Enter chooses and closes and focus is on the trigger and `Value` shows the text. Opened by ArrowDown from the keyboard it focuses the
  chosen item with the keyboard ring; Escape closes without choosing; Enter and Space on the trigger open it; Tab chooses the focused item,
  closes, and native moves focus on to the next tab stop (`inputs-next`). A press outside the list closes it, chooses nothing, focuses the
  trigger, and does not click the button under the backdrop (`Next 0` unchanged). A press on an item chooses it. The select at the bottom of the
  window opens above its trigger, flush with the gap and inside the root. Resizing the root's `Control` while the list is open (200 px shorter,
  through `resizeSurface`, the native `Control.size` path `useRootSize` reads) closes it and focuses the trigger; a list opened in the smaller root
  is placed against the smaller root.
- **`Intl`:** `GODOT_REACT_RUNTIME_FACTS {"intl":"undefined", ...}`: **GodotJS's V8 has no `Intl` natively** (nor `NumberFormat`, `ListFormat`
  or `Segmenter`). The evaluation's open question has its answer: `react-stately`'s slider and select state read `Intl.NumberFormat` and
  `Intl.ListFormat`, so adopting it would need polyfills natively (the Web browser has `Intl`; not checked here). One more reason, with decision 4.

Inspected PNGs (every one looked at):

- `/Users/ben/Development/breaka/godot-react-ui-worktrees/select-anchor/artifacts/native-interaction/landscape/` and `.../portrait/`:
  `22-inputs-rest.png` (all five controls at rest, the locked copies dimmed, the slider thumb centred and standing out of its track, the caret
  on both triggers), `23-inputs-slider-rest.png`, `24-inputs-select-open.png` (pointer open: Apple highlighted, no ring, the disabled Cherry
  dimmed, list under the trigger and over the JSON box), `25-inputs-select-keyboard.png` (keyboard open: Blueberry with the ring and the
  indicator square), `26-inputs-select-flipped.png` (the bottom select's list above its trigger), `27-inputs-final.png`.
- `.../native-world/landscape/` and `.../portrait/`: `09-anchored-label.png` (the label above the sphere, over the 3D view, off the card),
  `10-anchored-label-over-button.png` (the label covering the Add button, whose click still reaches it),
  `11-anchored-label-behind-camera.png` (no label), and `01-world.png` to `08-remounted.png`, with the orbiter parked: `01-world.png` shows
  no sphere and no label.

## What the next parts need

- **TextField (I7):** `aria-labelledby` and `aria-describedby` are still not typed, and `useId` works under this reconciler
  (RadioGroup and Select use it). A TextInput is native-owned and has its own controlled protocol; do not force it through
  `useControllableState`. An editable combobox is TextInput plus this listbox: `OpenContent`'s placement, backdrop and
  the pure helpers (`placePopover`, `stepEnabled`, `typeAheadMatch`) are reusable, but the open list is not factored out
  of `Select` yet (do it when the second user exists). Type-ahead there is the input's text, not a buffer.
- **I10:** the kit sets `role="combobox"` with `aria-expanded` on the trigger, `role="listbox"` on the list and
  `role="option"` with `aria-selected` and `aria-disabled` on items, all JS-only today. Needed natively: those three roles,
  `aria-expanded`, `aria-selected`, and `aria-disabled` mapped to the disabled flag independently of the native `disabled`
  prop (decision 8). `aria-haspopup` and `aria-controls` are not typed; focus is on the option itself, so
  `aria-activedescendant` is not needed. The options are in the overlay layer: the accessibility parent of the list is the
  nearest exposed ancestor in the overlay layer, i.e. the root's element.
- **I5 (scroll):** `Select.Content` needs `overflow-y: auto` and a `max-height` for long lists, and native's minimal
  scroll-into-view on keyboard focus. Until then a long list is clipped by the window. Resizing then closes the list as
  now.
- **Event for the root size**, if `scroll`'s event plumbing lands: replace the read in `dispatchEvents` (decision 1).

## Environment

The host ran at a load average of 20 to 46 with 8.6 of 9.2 GB of swap used while this was built. Two things came of it: the
first mutation runs of "opening takes no focus" and "backdrop does not close" were started in parallel, one of them from
a script that does not kill grandchildren, and looked like hangs; they were a starved `tsx` start (minutes) and the
mutation script was rewritten to run one mutant at a time in its own process group with a deadline. `select.tsx` was checked
afterwards (the whole suite passes and no mutant text remains). The native verifier runs finished in 60 to 90 seconds each.
