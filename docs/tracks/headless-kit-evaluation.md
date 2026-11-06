# Can `godot-react-ui` use an existing headless React Native kit? Evaluation (2026-11-06)

Research only. No repository was modified. All tarballs were fetched with `npm pack` (no install, no scripts) into
`$S/npm/<pkg>/src/package/` and were only read with grep/sed/cat; nothing downloaded was executed. Things I did not
run are labelled "unverified (read, not run)".

`$S` = `/private/tmp/claude-501/-Users-ben-Development-breaka-breaka-platform/8ba2c998-d319-45ba-8374-5a4a8a78afdb/scratchpad`

Path legend used below (all under `$S/npm/`):

| Short | Full |
| --- | --- |
| `core:` | `_gluestack-ui_core/src/package/lib/esm/` (`@gluestack-ui/core@5.0.15`) |
| `utils:` | `_gluestack-ui_utils/src/package/lib/esm/` (`@gluestack-ui/utils@5.0.6`) |
| `rnp:` | `_rn-primitives_<name>/src/package/dist/` (`@rn-primitives/*@1.5.2`) |
| `ra:` | `react-aria/src/package/dist/` (`react-aria@3.53.1`) |
| `rs:` | `react-stately/src/package/dist/` (`react-stately@3.51.0`) |
| `tg:` | `_tamagui_<name>/src/package/src/` (`@tamagui/*@3.2.3`) |
| `radix:` | `_radix-ui_react-<name>/src/package/dist/index.mjs` |
| `zag:` | `_zag-js_<name>/src/package/dist/` (`@zag-js/*@1.47.0`) |
| `tpl:` | `$S/gh/tpl/*.tsx` (gluestack v5 copy-paste component templates fetched from GitHub `src/components/ui/*`) |

---

## 1. Recommendation

**Do not adopt gluestack UI v5 (neither path (a) shim nor path (b) fork). Take path (c): hand-build Phase I8 as
planned, using Radix's compound-component API shape and the WAI-ARIA APG keyboard tables as the behaviour model.
Optionally adopt `react-stately` (DOM-free state hooks) for Slider and Select state; make that decision when
Select/Menu/Tabs work starts, not now.**

Why, in five facts, each verified from source:

1. **gluestack's "headless" layer is not behaviour-complete on the path we could run.** `@gluestack-ui/core`
   ships two implementations per component: a *native* one (no `.web` suffix) and a *web* one (`*.web.js[x]`).
   The native one has **no keyboard model for Checkbox, Radio, Switch, Slider or Select** (only Tabs has arrow
   keys, `core:tabs/creator/TabsList.jsx:34-67`). The web one gets its keyboard behaviour from `@react-aria/*`
   hooks that need a real DOM `<input>`, `document`, `window` and `getBoundingClientRect`. Phase I8 requires
   WAI-ARIA keyboard behaviour for every control, so we would hand-write exactly the part that matters.
2. **Its native Switch and Select are not headless at all.** `createSwitch({ Root })` wraps a *platform* Switch
   (`tpl:switch.tsx:9-11` passes `RNSwitch`); `core:switch/creator/Switch.jsx` just forwards `value`/`onValueChange`.
   Its Select is an Actionsheet (bottom sheet using `Animated`, `Dimensions`, `PanResponder`, `Keyboard`) on native
   and a hidden `<select>` on web (`core:select/creator/SelectPortal.jsx`). Neither is a dropdown listbox.
3. **The headless layer is an internal detail of a NativeWind copy-paste kit, not a supported product.** The repo
   description is "copy-paste components & patterns crafted with Tailwind CSS (NativeWind)"; the upstream
   `CLAUDE.md` calls `createX` the layer under the copy-paste templates; the v5 docs no longer carry the
   "Unstyled Library" page (it 308-redirects to `v1.gluestack.io`). Core has had **no commits since the 2026-06-25
   release** (last `packages/gluestack-core` commit: "chore: release stable v5 packages"); later repo commits
   (to 2026-09-02) are docs, landing page and a modal fix in the templates.
4. **The styling half of the kit cannot be used.** The templates use NativeWind classes (`data-[hover=true]:bg-primary/90`,
   `web:`, `ring-*`, `shadow-*`, `dark:`) and `tailwind-variants`. Our `compileStyle` **throws** on an unknown
   utility or variant (`src/styles.ts`, `compileToken`: `Unsupported style variant`, `Unsupported utility class`).
   So we would rewrite all styling regardless, which is the other half of Phase I8.
5. **The best reusable asset is not gluestack, it is `react-stately`.** It is platform-neutral (peer: `react` only,
   0 `react-dom` imports, 14.7k lines in `rs:private/`, the only `HTMLElement` mention is a guarded test-env check
   in `rs:private/virtualizer/Virtualizer.mjs:145`). gluestack's creators call those same hooks
   (`useToggleState`, `useSliderState`, `useRadioGroupState`) and add context plumbing around them.

Net: path (a) saves about nothing on I8 (see section 4); path (b) is worse than hand-building; path (c) costs half a
day and gives us the useful parts (state vocabulary, form-control context, compound structure).

---

## 2. Evidence

### 2.1 What gluestack UI v5 is (npm registry + GitHub, 2026-11-06)

| Item | Finding | Source |
| --- | --- | --- |
| Stable release | v5.0.0 tagged 2026-06-25 (alpha 2026-03-16) | `gh api repos/gluestack/gluestack-ui/releases`; release page |
| Headless/creator package | `@gluestack-ui/core@5.0.15` (modified 2026-06-25), MIT per `package.json` | `npm view` |
| Utils package | `@gluestack-ui/utils@5.0.6` (2026-06-25), MIT per `package.json` | `npm view` |
| CLI | `gluestack-ui@5.0.3` (copies templates into the app) | `npm view`; `$S/npm/gluestack-ui/src/package/README.md` |
| Old per-component headless packages | `@gluestack-ui/button@1.0.14`, `checkbox@0.1.39`, `switch@0.1.29`, `slider@0.1.32` ... last published 2025-09-10; they depend on `@react-native-aria/*` (see 2.6). Superseded by `core`. Not evaluated further. | `npm view` |
| Licence | `package.json` says MIT for core/utils/CLI. The repo root has no LICENSE file and GitHub reports `license: null`; the `core` tarball has no LICENSE file though its `files` list names one (`$S/npm/_gluestack-ui_core/src/package/` has none). Needs a human check before any code is vendored (path b). | tarball listing; `gh api repos/gluestack/gluestack-ui` |
| Activity | 5.3k stars, 51 commits since 2026-06-25 but 3 authors do 47 of them; last push 2026-09-02. Zero commits to `packages/gluestack-core` since the stable release. | `gh api .../commits?since=` |
| React 19 | `core` peer is `react >=16.8.0` (no upper bound). Starter apps pin `react@19.2.3`, `react-native@0.85.3`, `expo@^56`, `nativewind@^5.0.0-preview.2` (a **preview** NativeWind in the "stable" starters). So React 19 works in RN; nothing says it was tested on a custom reconciler. | `gh api .../apps/starter-kit-expo/package.json` |
| Docs | Release notes and the stable blog post say nothing about headless. `gluestack.io/ui/docs/core-concepts/unstyled-library` 308-redirects to `v1.gluestack.io/...`, whose content is the v1 `styled(Pressable)` + `createButton({Root, Text, Group, Spinner, Icon})` recipe. | WebFetch |
| Intended use | Per upstream `CLAUDE.md` ("Component architecture"): `packages/gluestack-core/src/<c>/creator/` is the "no styling, pure logic and accessibility" factory that "receives generic primitive components"; `aria/` holds hooks "using React Aria"; `src/components/ui/<c>/index.tsx` is the copy-paste component that calls `createX()` with `react-native` primitives. | `gh api .../CLAUDE.md` |

Dependencies of `@gluestack-ui/core@5.0.15` (from `npm view`): 25 `@react-aria/*`, `@react-stately/*`, `@react-types/*`
packages, plus `date-fns`. Peers: `@gluestack-ui/utils`, `react`, `react-native`, `react-native-safe-area-context`,
`react-native-svg`, `react-native-web`. Dependencies of `utils`: `react-aria@^3.48`, `react-stately@^3.46`,
`@react-aria/{dialog,focus,interactions,ssr,utils}`, `tailwind-variants@0.1.20`, `dom-helpers`; peers `react-native`,
`react-native-web`, `tailwindcss`.

Side finding: `@react-aria/*@latest` are now thin re-export shims over the monolith `react-aria` (e.g.
`@react-aria/interactions@3.28.1` is 49 lines and `dependencies: { "react-aria": "^3.48.0" }`), and the monolith has
a **peer dependency on `react-dom`** and imports `flushSync`/`createPortal` from it in 12 files
(`ra:private/interactions/usePress.mjs`, `private/overlays/Overlay.mjs`, `private/utils/animation.mjs`, ...). It is
`sideEffects: false`, so a tree-shaking bundler should drop them on paths that never reach those files, but
`@react-aria/utils` (imported by 9 gluestack native-path files) re-exports `runAfterTransition` from
`animation.mjs`; whether esbuild drops that is unverified (read, not run).

### 2.2 Dependence on `react-native`: imports and exact APIs

Counted over the compiled output (`core:` and `utils:`), all non-`.web` files (the native path; the `.web` path is
in 2.5). Counts are occurrences in the whole package, then the files.

**Imports of `react-native` in `@gluestack-ui/core` (58 import lines).** Files listed are the ones relevant to
Phase I8 first; everything else is overlay/animation machinery we would not use.

| `react-native` name | APIs used | Files (core:) | Relevant to I8? |
| --- | --- | --- | --- |
| `Platform` | `Platform.OS` (49 uses in 35 files), `Platform.select` (1), `Platform.Version` | `switch/creator/Switch.jsx`, `slider/creator/SliderThumb.jsx`, `slider/creator/SliderFilledTrack.jsx`, `input/creator/Input.jsx`, `textarea/creator/Textarea.jsx`, `select/creator/Select{Item,Portal,Backdrop,Content,DragIndicator,...}.jsx` (9 files), `divider/creator/Divider.jsx`, `link/creator/UseLink.js`, `menu/*`, `tabs/creator/TabsTrigger.jsx`, `tooltip/*`, `popover/creator/PopoverContent.jsx`, `modal/creator/ModalContent.jsx`, `overlay/creator/index.jsx`, `overlay/aria/utils.js`, ... | Yes. `Platform.OS === 'web'` switches to **DOM** branches (`<select>`, `<option>`, `HTMLInputElement`, `<input>` in SliderThumb). A shim must report a non-`web` OS, i.e. lie. |
| `View` | host component | `calendar/.../CalendarDayIndicator.jsx`, `alert-dialog/AlertDialog.jsx`, `modal/Modal.jsx`, `toast/*`, `popover/PopoverContent.jsx`, `menu/*`, `overlay/aria/Portal.jsx`, `tooltip/TooltipContent.jsx` | Not for I8 components |
| `StyleSheet` | `absoluteFill`, `flatten`, `create` | `overlay/aria/Portal.jsx`, `select/creator/SelectPortal.jsx`, `actionsheet/Actionsheet.jsx`, `bottomsheet/BottomSheet.jsx`, `accordion/AnimatedHeight.jsx` | Select (native + web branch) |
| `PanResponder` | `PanResponder.create({onMoveShouldSetPanResponderCapture, onPanResponderGrant/Move/Release/Terminate})`, `.panHandlers` | `slider/aria/useMove.js`, `slider/aria/usePanResponder.js`, `actionsheet/ActionsheetDragIndicatorWrapper.jsx`, `bottomsheet/BottomSheetDragIndicatorWrapper.jsx` | **Slider drag.** No RN responder system exists in our renderer. |
| `Animated` | `Animated.Value/timing/parallel/View` (45 uses in 12 files) | every `OverlayAnimatePresence.jsx` (tooltip, actionsheet, alert-dialog, toast, popover, menu, modal), `accordion/AnimatedHeight.jsx`, `toast/ToastList.jsx`, drag-indicator wrappers | No (overlays/accordion) |
| `Dimensions` | `Dimensions.get('window'|'screen')`, `.addEventListener` (16 uses) | `actionsheet/ActionsheetContent.jsx`, `bottomsheet/BottomSheetContent.jsx`, `overlay/aria/useOverlayPosition.js`, drag-indicator wrappers | Popover/Select positioning |
| `AccessibilityInfo` | `isScreenReaderEnabled`, `announceForAccessibility`, `setAccessibilityFocus`, `addEventListener` (38 uses in 7 files) | `modal/ModalContent.jsx`, `alert-dialog/AlertDialogContent.jsx`, `popover/PopoverContent.jsx`, `menu/MenuPopover/PopoverContent.jsx`, `toast/ToastTitle.jsx`, `actionsheet/ActionsheetContent.jsx`, `bottomsheet/BottomSheetContent.jsx` | No |
| `Keyboard` | `Keyboard.dismiss`, `addListener` (6 uses) | `select/creator/SelectTrigger.jsx:15` (`Keyboard.dismiss()` on open), `modal/ModalContent.jsx`, `alert-dialog/AlertDialogContent.jsx`, `popover/PopoverContent.jsx`, actionsheet, bottomsheet | Select |
| `Modal` | RN `<Modal>` | `overlay/creator/index.jsx` | Overlay root |
| `StatusBar` | `StatusBar.currentHeight` | `overlay/aria/utils.js:1` | Overlay |
| `Linking` | `Linking.openURL` | `link/creator/UseLink.js` | No |
| host-prop usage inside creators | `onLayout` (20 uses, 11 files; reads `event.nativeEvent.layout.{x,y,width,height}`), `measureInWindow`/`measure` (7, 4 files), `findNodeHandle` (12, 6 files), `nativeEvent` (23, 10 files), `accessibilityViewIsModal`/`importantForAccessibility` (7), `collapsable` (6), `pointerEvents` as a prop (10), `focusable` (9), `tabIndex` (23), `role` (31), `aria-*` (many), `onPress/onPressIn/onPressOut` (205/55/57), `onHoverIn/onHoverOut` (52/52), `onFocus/onBlur` (79/81) | Slider needs `onLayout` + `measureInWindow` + `nativeEvent.{pageX,pageY,locationX,locationY}` (`core:slider/aria/useSlider.js:80-100`, `SliderThumb.jsx:84`) | Yes for Slider |

**Imports of `react-native` in `@gluestack-ui/utils` (7 import lines)**

| Name | APIs | File (utils:) |
| --- | --- | --- |
| `findNodeHandle` | re-export | `common/findNodeHandle.js:2` |
| `BackHandler`, `Platform` | `BackHandler.addEventListener('hardwareBackPress')` | `aria/interactions/useKeyboardDismisssable.js:3`; pulled in by **every** `@gluestack-ui/utils/aria` import (64 core files) |
| `I18nManager` | `I18nManager.isRTL` / `getConstants()` | `aria/utils/index.js:1` (`isRTL`, used by Slider) |
| `BackHandler` | | `hooks/use-back-handler/index.js` |
| `useWindowDimensions` | | `hooks/use-media-query/index.js:1`, `hooks/use-break-point-value/index.js:1` |
| `Keyboard`, `Platform` | | `hooks/use-keyboard-bottom-inset/index.js:2` |
| `Dimensions` | | `hooks/use-break-point-value/index.js:1` |

`@gluestack-ui/utils/hooks` is a barrel (`utils:hooks/index.js`) that re-exports all of these, and core imports
`useControllableState` and `useLayout` from it (10 files), so a bundler that does not drop unused re-exports needs
every one of those names to exist in the aliased module.

### 2.3 Other React-Native-only (or DOM-only) dependencies actually imported

Scanned over all `from '<pkg>'` in non-`.web` files of core (196 `react`, 64 `utils/aria`, 58 `react-native`, 57
`utils/common`, then the rest) and utils.

| Package | Where | Used for | Hard? |
| --- | --- | --- | --- |
| `react-native-svg` | `core:icon/creator/primitiveIcon/index.jsx`, `createIcon/index.jsx` (`Svg`, `G`, `Path`) | Icons | Avoid (we have no images or SVG; plan 3.23 says no icon fonts) |
| `react-native-safe-area-context` | `core:toast/creator/ToastList.jsx` (`SafeAreaProvider`, `SafeAreaView`, `initialWindowMetrics`) | Toast | Avoid toast |
| `dom-helpers/*` | `core:overlay/aria/web/overlays/src/calculatePosition.js` (`css`, `offset`, `position`, `scrollTop`, `getComputedStyle`, `ownerDocument`) | Popover placement on **web** | DOM only |
| `@react-aria/visually-hidden` | `core:slider/creator/SliderThumb.jsx` (renders `<input>` when `Platform.OS === 'web'`), `.web` checkbox/radio | Hidden native inputs | DOM only |
| `@react-aria/utils` | `mergeProps`, `chain`, `useId`, `useLayoutEffect`, `mergeIds`, `mergeRefs` (9 native-path files) | prop merging | Platform-neutral logic, but resolves into the monolith (2.1) |
| `@react-aria/label` | `core:slider/aria/useSlider.js` (`useLabel`) | label/field ids | neutral |
| `@react-stately/{toggle,slider,radio,checkbox,utils}`, `react-stately` | `core:checkbox/creator/Checkbox.jsx`, `switch/creator/Switch.jsx`, `slider/creator/Slider.jsx`, `radio/...` | State | Neutral (2.5) |
| `@react-aria/ssr` | `utils:aria/utils/index.js` (`SSRProvider`, `useIsSSR`) | SSR | neutral |
| `tailwind-variants`, `tailwind-merge`, `clsx`, `tailwindcss/plugin` | `utils:nativewind-utils/{tva,cn,tailwind-plugin}` | NativeWind styling (`tva`) | Not usable with our `className` (throws on unknown tokens) |
| `date-fns` | `core:calendar/*` | Calendar | n/a |
| `nativewind` / `@legendapp/motion` / `@expo/html-elements` / `react-native-reanimated` | **not imported by core or utils.** `nativewind` is imported only by the templates (`tpl:*.tsx`: `styled(UIIcon, { className: 'style' })`). `expo-constants` and `@react-native-aria/utils` appear only in comments (`core:overlay/aria/utils.js:2`, `core:form-control/creator/useFormControl.jsx:13`). | | |

### 2.4 Creator API: primitives are arguments (good news), but through HOCs of `StyledX`

The creator shape is as hoped. From `core:button/creator/index.jsx`:

```js
export function createButton({ Root, Text, Group, Spinner, Icon }) {
    const Button = ButtonMain(Root);              // ButtonMain = (StyledButton) => forwardRef(...)
    Button.Text = ButtonText(Text); Button.Group = ButtonGroup(Group); ...
```

and `core:checkbox/creator/index.js` (`createCheckbox({ Root, Indicator, Icon, Label, Group })`),
`core:switch/creator/index.jsx` (`createSwitch({ Root })`), `core:select/creator/index.js`
(`createSelect({Root, Trigger, Input, Icon}, {Portal, Backdrop, Content, DragIndicator, DragIndicatorWrapper, Item, ItemText, ScrollView, VirtualizedList, FlatList, SectionList, SectionHeaderText})`),
`tpl:slider.tsx:11-17` (`createSlider({Root, Thumb, Track, FilledTrack, ThumbInteraction})`). So our `View`, `Text`
and `Button` *could* be passed in as `Root`/`Text`.

What the creators then do to the primitive (`core:button/creator/Button.jsx:15-60`, `core:checkbox/creator/Checkbox.jsx`,
`core:pressable/creator/Pressable.jsx`): they render `<StyledRoot ... />` with

* RN-Pressable events: `onPress`, `onPressIn`, `onPressOut`, `onHoverIn`, `onHoverOut`, `onFocus`, `onBlur`;
* NativeWind plumbing, three times over, in **every** component (41 files with `states=`, 43 with `dataSet=`, plus
  `data-hover`, `data-active`, `data-disabled`, `data-focus-visible`, ... for UniWind): props our host ignores
  (JS-only props are legal, `src/props.ts` keeps only `NATIVE_PROP_KEYS`), but pure noise;
* `role`, `aria-*`, `tabIndex`, `disabled`, `ref` merged through `mergeRefs`.

The state flags (`hover/focus/active/disabled/focusVisible/checked/indeterminate/invalid/readonly`) are held in JS
`useState` and supplied to styling via context (`ButtonContext`, `CheckboxProvider`, ...). In our renderer the pseudo
states are *native* (`hover:`, `active:`, `focus-visible:`, `disabled:` variants); only `checked`, `invalid`, etc.
need JS.

### 2.5 What the headless layer actually does, per component (native path vs web path)

| Component | Native path (what we would run) | Web path (`*.web.*`, DOM) |
| --- | --- | --- |
| Button / Pressable | JS-state `usePress` that only wraps `onPressIn/Out` into `isPressed` (`utils:aria/interactions/usePress.js`, 43 lines); `useHover` = `onHoverIn/Out` flag (`useHover.js`); `useFocusRing` **hard-coded** `isFocusVisible: false` (`utils:aria/focus/useFocusRing.js`); `useFocus` = flag. | `useHover.web`, `useFocusRing.web`, `FocusScope.web` from react-aria |
| Checkbox | `useToggleState` + `usePress({onPress: () => state.setSelected(!state.isSelected)})` (`core:checkbox/aria/useCheckbox.js`, `utils:aria/toggle/useToggle.js`). No keyboard. `aria-checked` set. | `@react-aria/checkbox` `useCheckbox` -> returns props for a real `<input type=checkbox>`; keyboard is browser behaviour (`ra:private/toggle/useToggle.mjs:41-140`: `onChange`, `type: 'checkbox'`) |
| Radio / RadioGroup | `useRadio`: `onPress` -> `state.setSelectedValue(value)`; `useRadioGroup`: `role=radiogroup`, `aria-label` only (`core:radio/aria/*.js`, 31 + 18 lines). **No arrow-key roving, no tabindex management.** | `@react-aria/radio` (hidden `<input type=radio>`) |
| Switch | Wraps a **platform Switch** (`tpl:switch.tsx`, `core:switch/creator/Switch.jsx`): forwards `value`, `onValueChange`. | `@react-aria/switch` -> `<input>` |
| Slider | Drag by `PanResponder` (`core:slider/aria/useMove.js`), track tap via `onPress` + `measureInWindow` + `nativeEvent.pageX`; thumb position `left: '<pct>%'` with `transform: [{translateX}, {scale}]` (`core:slider/creator/SliderThumb.jsx:60-80`); screen-reader `increment`/`decrement` actions; **no arrow/Home/End/Page keys**. | `useMove.web.js` (170 lines, window listeners + `ArrowLeft/Right/Up/Down`), hidden `<input type=range>` |
| Select | Actionsheet bottom sheet (`Animated`, `Dimensions`, `PanResponder`), items are `Pressable`s. | hidden native `<select>` with `<option>` (`core:select/creator/SelectPortal.jsx`) |
| FormControl | Context with ids/flags. **Bug:** `var idCounter = 0` is declared *inside* `useFormControlProvider` (`core:form-control/creator/useFormControl.jsx`), so every FormControl in a tree gets id `field-1`. | same |
| Input / Textarea | RN `TextInput` as `Input`; `editable`, `secureTextEntry`, `onChangeText`. | DOM `<input>` |

Size of the native-path code for the I8 subset, compiled JSX lines in `core:` (non-`.web`): button 291 (11 files),
pressable 68 (2), checkbox 419 (15), radio 371 (13), switch 115 (5), slider 705 (14), input 199 (7), textarea 129 (5),
form-control 327 (11), select 560 (18), tabs 567 (12), popover 793 (13), modal 375 (11).

`react-stately` (the actually reusable piece) in `rs:private/`: toggle 85 lines, radio 57, slider 194, select 134,
list 242, selection 437, collections 463, overlays 48, menu 137, tabs 60. It needs `numberFormatter` for the slider
state (gluestack passes a fake `{ format: e => e }`, `core:slider/creator/Slider.jsx`); only multi-thumb labels touch
`Intl.ListFormat` (`rs:private/slider/useSliderState.mjs:119`). Whether GodotJS's V8 has `Intl` is an open question (section 6).

### 2.6 Alternatives, same method, shorter

| Candidate | State today | Depends on RN / DOM | Verdict for us |
| --- | --- | --- | --- |
| **`@rn-primitives/*`** (react-native-reusables) 1.5.2, MIT, 2026-07-02; repo `roninoss/rn-primitives` pushed 2026-08-08, 946 stars | `checkbox.mjs` 80 lines, `switch.mjs` 46, `radio-group.mjs` 98, `slider.mjs` 85 (native files). Each is `Pressable`/`View` + `onPress` + `role`/`aria-*`/`accessibilityState`, `asChild` via a 160-line `Slot`. Native **slider has no drag**, only `accessibilityActions` increment/decrement (`rnp:slider/slider.mjs:48-70`). Native **select** 357 lines uses `measure`, `onLayout`, `BackHandler`, `useRelativePosition` (`Dimensions.get('screen')`), `@rn-primitives/portal` (zustand). Web files re-export **Radix** (`@radix-ui/react-checkbox` etc.). Hooks pkg uses `AccessibilityInfo`, `findNodeHandle`, `Dimensions`. | Peers `react-native`, `react-native-web`. | Smaller and cleaner than gluestack but even less behaviour (no keyboard, no drag). Useful only as a reading of "RN twin of Radix". The `Slot` (`asChild`) idea is worth copying. |
| **`react-aria` hooks** 3.53.1, Apache-2.0 (adobe/react-spectrum pushed 2026-11-06) | Hooks return props for DOM elements. `usePress` (738 lines) uses `document` listeners, `getOwnerDocument`, `instanceof HTMLElement/HTMLInputElement/HTMLButtonElement`, `tagName`, `isVirtualClick`. `useSlider*` explicitly delegates keyboard to a hidden `<input type=range>`, uses `trackRef.current.getBoundingClientRect()`, `window` listeners, `document.getElementById`. `useToggle` returns `inputProps` for `<input type=checkbox>`. DOM-touching lines: interactions 149/2741, utils 136/2534, overlays 85/1768, focus 36/947. | peer `react-dom`; `flushSync`/`createPortal` imports in 12 files | **Hooks: no** (DOM emulation project). **`react-stately`: yes, optional** (next row). |
| **`react-stately`** 3.51.0, Apache-2.0 | 0 `react-dom` imports; peer `react` only; deps `@internationalized/{date,number,string}`, `@react-types/shared`, `use-sync-external-store`. Hooks: `useToggleState`, `useRadioGroupState`, `useSliderState`, `useSelectState`, `useListState`, `useSingleSelectListState`, `useOverlayTriggerState`, `useMenuTriggerState`, `useTabListState`, `useDisclosureState`, `useControlledState`, `useComboBoxState`, `useTreeState`, ... | none | The only third-party piece that fits both our host and our "no DOM" rule. |
| **`@react-native-aria/*`** 0.2.x | last published 2025-06; pins ancient `@react-aria/*` 3.x ranges (e.g. `@react-aria/checkbox: 3.2.1`), peers `react-native`; gluestack v5 dropped it | RN | Dead end. |
| **Tamagui headless** `@tamagui/{checkbox,switch,radio}-headless` 3.2.3 (MIT, 2026-11-05; repo pushed today, 14.3k stars; peer `react >=19`) | `useSwitch` is 160 lines (`tg:switch-headless/src/useSwitch.tsx`), `useCheckbox` 124, `useRadioGroup` 275. Native branch is `{ onPress: () => setChecked(p => !p) }`; the rest is `isWeb` bubble `<input>` for forms (`window.HTMLInputElement.prototype`, `button.closest('form')`). Slider (`@tamagui/slider`, 760-line `Slider.tsx`) needs `@tamagui/core` (their style engine), `measure`, `onLayout`, responder events, `window.addEventListener('resize')`. Deps pull `@tamagui/web`, `@tamagui/label`, `@tamagui/focusable`. | `@tamagui/react-native-types`, `isWeb` constant | The headless hooks are tiny but trivial (toggle on press); the substantive parts (slider, select, popper) are tied to Tamagui's engine. No. |
| **Radix** `@radix-ui/react-{switch 1.4.1, slider 1.6.1, radio-group 1.5.1, select, roving-focus 1.2.1}` (MIT, pushed 2026-10-14) | DOM-only: `Primitive` imports `react-dom` `flushSync` (`radix:primitive/index.mjs:7,43`); switch/radio/slider each render a `BubbleInput` (`window.HTMLInputElement.prototype`, `dispatchEvent`) and call `control.closest('form')`; `RovingFocus` uses `document.activeElement`; Select is 1294 lines with 64 DOM-touching lines and ~20 deps (`react-remove-scroll`, `aria-hidden`, popper, presence, focus-scope, dismissable-layer). **But** the Slider uses `setPointerCapture/hasPointerCapture/releasePointerCapture` and a rect (`radix:slider/index.mjs:385-402`) which map 1:1 onto our `UIHandle` (`setPointerCapture`, `getRect`), and `asChild`/`Slot` composition maps onto our `View`/`Button`. | `react-dom` peer | Best **API and behaviour model**. Not usable as code (refs would be `UIHandle`, so `closest()` throws; unverified, read not run). |
| **Zag.js** `@zag-js/*` 1.47.0 (MIT, 2026-10-26) | Machines look elements up by id through `scope.getRootNode().getElementById` (`zag:core/scope.mjs`), use hidden inputs (`dom.getHiddenInputEl`), `trackPointerMove(scope.getDoc())`, `getBoundingClientRect`. `@zag-js/dom-query` 2233 lines, 119 DOM-touch lines. | peer `react-dom` (`@zag-js/react`) | No. |
| Base UI 1.9.0, Ariakit 0.4.42, Headless UI 2.2.10, Ark UI 5.40.0 | All peer `react-dom`; DOM libraries. Not opened. | | No. |
| HeroUI Native 1.0.11 | Styled (Uniwind, bottom-sheet, svg, blur peers). | | No. |
| `anvil-native`, `@primitiv-ui/react` | Surfaced by one web search only; not opened. | | Not evaluated. |

Conclusion for 3: no existing library provides *behaviour* (keyboard, focus, pointer capture, popup dismissal) in a
form that runs on a host that is neither a DOM nor React Native. The renderer has already built that behaviour
natively (Phases I1-I3), so what remains is thin glue.

---

## 3. Shim surface, if path (a) were taken anyway

This is for completeness. It is sized for the *I8 subset* of gluestack-core's native path: Button, Pressable,
Checkbox(+Group), Radio(+Group), Switch, Slider, Input, Textarea, FormControl. Select, Popover, Modal, Tooltip,
Actionsheet, Toast, Accordion, Tabs are excluded (they need `Animated`, `Modal`, `Dimensions`, `AccessibilityInfo`,
`SafeArea`).

Bundler: `esbuild@0.25.11` is already the project's bundler (`package.json`), so an alias is trivial:
`alias: { 'react-native': 'src/compat/react-native.ts', 'react-native-web': ..., 'react-dom': 'src/compat/react-dom-stub.ts' }`.
Do **not** set a `.web` resolve extension (that selects the DOM branches).

### 3.1 Module `react-native` (must export every named import that is reachable)

| Export | Needed because | What it must do |
| --- | --- | --- |
| `Platform` | `Platform.OS` in 35 files, `Platform.select` | `OS: 'ios'` (any non-`'web'` value; `'web'` selects DOM branches that create `<input>`, `<select>`, `HTMLInputElement`), `select(spec)`, `Version` |
| `StyleSheet` | `absoluteFill`, `flatten`, `create` | Map to our `StyleSheet` (`src/styles.ts:271`); add `absoluteFill` only after Phase I4 (`position`/insets) |
| `I18nManager` | `isRTL()` in slider | `{ isRTL: false }` |
| `findNodeHandle` | `utils:common/findNodeHandle.js`, overlay components | Return the `UIHandle.id` or `null` |
| `Keyboard` | `Keyboard.dismiss` in `SelectTrigger`, hooks barrel | No-op object with `dismiss`, `addListener -> { remove }` |
| `BackHandler` | pulled by every `utils/aria` import | `addEventListener -> { remove }` no-op |
| `Dimensions`, `useWindowDimensions` | hooks barrel (`use-break-point-value`, `use-media-query`) | Need a root size (see section 5) or stubs |
| `PanResponder` | only if the unmodified native slider is used | **Do not implement**: replace `useMove` (see 3.3) |
| `View`, `Text` | consumer-provided Roots and Group | Adapters over our `View`, `Text` (3.2) |
| `Pressable` | Root of Button, Checkbox, Radio, Select trigger | Adapter over our `Button` (3.2) |
| `TextInput` | Input, Textarea | Adapter over the planned `TextInput` (Phase I7) |
| `ActivityIndicator` | Button.Spinner | Pass a custom spinner instead |
| `Switch` | Root of `createSwitch` | There is no RN `Switch` here: write our own (a `Button role="switch"` + track + thumb). The creator then only adds controlled/uncontrolled plumbing (~77 lines). |

### 3.2 Host component adapters (RN props -> our props)

| RN prop on `Pressable`/`View`/`Text` | Our equivalent | Mismatch |
| --- | --- | --- |
| `onPress(e)` | `onClick` | Handler receives a `UIPointerEvent` without `nativeEvent`. Slider track tap reads `e.nativeEvent.{pageX,pageY,locationX,locationY}`: must be synthesized from `x,y,viewportX/Y` and `getRect()`. |
| `onPressIn` / `onPressOut` | `onPointerDown` / `onPointerUp`+`onPointerCancel`+`onPointerLeave` | RN fires `onPressOut` when the finger leaves the press region; approximate with leave. |
| `onHoverIn` / `onHoverOut` | `onPointerEnter` / `onPointerLeave` filtered to `pointerType === 'mouse'` | Our plan says touch never sets hover (3.12), consistent. |
| `onLongPress`, `delayLongPress`, `hitSlop`, `android_ripple` | none | Drop. |
| `disabled` | `disabled` | same |
| `role`, `aria-*` | planned (Phase I10, Appendix D). **Not in `UIProps` today** (`src/components.tsx`) | See section 5. |
| `accessibilityRole/State/Label`, `accessible`, `importantForAccessibility`, `accessibilityViewIsModal` | none | Map to `role`/`aria-*` or drop. |
| `tabIndex`, `focusable` | `tabIndex` (0 or -1 only) | `focusable` -> `tabIndex`. |
| `style` (RN object, arrays, `transform`, `left: '50%'`) | `Style` | Unknown keys. Slider thumb passes `transform: [{translateX}, {scale}]` and `left: '<pct>%'` (`core:slider/creator/SliderThumb.jsx:60-80`). Transforms are an explicit non-goal (plan 2.3); `left` needs Phase I4. Needs a style translator or a fork. |
| `className` | `className` | Only our subset; gluestack/NativeWind strings throw. |
| `states`, `dataSet`, `data-*` | ignored | fine, but the NativeWind variants that read them do not exist. |
| `pointerEvents` as prop | `pointerEvents` in style | translate |
| `onLayout(e)` with `e.nativeEvent.layout` | none | **No layout event in the plan** (only `getRect()` on demand). Slider (track and thumb size), Tabs, Popover use it. Emulate with `useLayoutEffect` + `getRect()` (does not follow later layout changes). |
| `ref.measure/measureInWindow/measureLayout` | `UIHandle.getRect()` (sync, root-local) | RN's API is async-callback; wrap. Window coordinates need `viewportX/Y`. |
| `ref` shape | `UIHandle` (`focus`, `blur`, `getRect`, capture) | Need `useImperativeHandle` wrapper to add `measure*`, `setNativeProps`. |
| Function children `({pressed, hovered, focused}) => ...`, function `style` | none | Pressable adapter must evaluate them from our native pseudo-state: not available to JS (plan 3.10 rule 8: "pseudo-states are native, so JS no longer tracks hover/active/focus flags"). The adapter has to track pointer enter/leave/down/up and focus itself, i.e. the JS-state design the plan removed. |
| `TextInput`: `value`, `onChangeText`, `editable`, `secureTextEntry`, `multiline`, `placeholder`, `onSubmitEditing` | planned `TextInput` (`onChange`, `readOnly`, `secure`, `multiline`) | mappable once Phase I7 lands |

### 3.3 Semantic gaps the shim cannot hide

1. **Keyboard.** The native path has none. We would add roving focus for RadioGroup, arrow/Home/End/Page for Slider,
   Space/Enter for Switch, a listbox for Select: exactly Phase I8's keyboard column.
2. **Slider drag.** `PanResponder` has no counterpart; the right implementation is `onPointerDown` +
   `setPointerCapture` + `getRect()` (what Radix does). That replaces `useMove`/`useSlider`/`useSliderThumb`
   (≈ 400 of the slider's 705 lines) and the thumb styling.
3. **Select.** Replaced wholesale (Actionsheet/`<select>` are unusable).
4. **`Platform.OS` lie.** Any future gluestack release that adds `Platform.OS === 'ios'`-only behaviour affects us silently.
5. **Focus ring.** `useFocusRing` is hard-coded `false` on the native path (`utils:aria/focus/useFocusRing.js`); our
   native `focus-visible` state is the correct source, and JS cannot read it.
6. **`@react-aria/utils` -> monolith with `react-dom` peer** (2.1): needs `react-dom` stub or a tree-shaking check.

---

## 4. Feasibility and effort, per path

Effort figures are my estimates in engineer-days, not measurements. "Hand-built I8" baseline: the Phase I8 table
(Checkbox, Switch, RadioGroup, Slider, Select, TextField; ScrollView is I5) is ≈ 900-1,300 lines of TSX plus tests,
estimated 4-6 days including fake-host tests, demo section and Web/native verification.

### 4.1 gluestack UI v5

| Path | What it is | Effort | Risks | Gain over hand-building I8 |
| --- | --- | --- | --- | --- |
| (a) as-is + `react-native` alias shim | Section 3. | Shim + adapters ≈ 450-700 lines TS, 2-3 days; then keyboard, slider drag, Select, Switch host, all styling: ≈ 70-80% of the hand-built work remains (keyboard column of I8, Select, Slider, styling). Total ≈ 5-7 days. | Re-implements the JS pressed/hovered/focused tracking the plan deliberately moved native; `Platform.OS` lie; `react-dom` peer via `@react-aria/utils`; creators change under us (stable since 2026-06-25, core unmaintained since); form-control id bug; ~25 transitive `@react-*` packages and `tailwind-variants`/`tailwind-merge`; licence ambiguity. | ≈ 0 to slightly negative. The only retained value: compound-component structure, state-flag context, `useToggleState`/`useSliderState` wiring (≈ 700 compiled lines we would otherwise write, but those are the easy 700). |
| (b) fork | Vendor from GitHub TS (`packages/gluestack-core/src`, not the compiled JSX) and edit. | Subset ≈ 96 native-path files (button 11, pressable 2, checkbox 15, radio 13, switch 5, slider 14, input 7, textarea 5, form-control 11, plus utils aria/common ≈ 20) ≈ 3,100 compiled lines. Mechanical edits in ~45 files (delete the `states`/`dataSet`/`data-*` triple, swap `@gluestack-ui/utils/aria`, `Platform`, `onPress*`), rewrite of slider/select/switch. 5-8 days. | We own an RN-flavoured fork we cannot merge upstream; licence file check first. | Negative: more work than writing the same components against our events. |
| (c) inspiration | Read the creators for state vocabulary and context shape. | 0.5 day | none | Real but small: the `hover/focus/active/disabled/focusVisible/checked/indeterminate/invalid/readonly` state set per part; `Checkbox.Indicator/Icon/Label/Group` and `RadioGroup` context structure; FormControl's ids for label / helper / error and `aria-describedby`. |

### 4.2 Best alternative: hand-build with Radix as the model, optional `react-stately` for state

| Path | What it is | Effort | Risks | Gain |
| --- | --- | --- | --- | --- |
| (a) as-is | n/a: no alternative runs on our host (Radix, react-aria, Zag, Base UI need a DOM; rn-primitives/Tamagui native paths are press-only). A DOM-emulation layer (`document`, `HTMLElement`, `ownerDocument`, `getBoundingClientRect`, hidden `<input>`) would be a bigger project than I8. | - | - | - |
| (b) fork Radix (MIT) | Take `switch`, `checkbox`, `radio-group`, `slider`, `roving-focus`, `use-controllable-state`, `slot` and strip form bubbling, `Presence`, `react-dom`, replace `getBoundingClientRect` with `getRect()`. | 4-7 days (Select not forkable: 1294 lines, ~20 deps) | Compiled sources only in the tarball; fork drift | Less than just reading them. |
| (c) model only (recommended) | Radix's compound API (`Root/Thumb/Indicator`, `asChild`/slot, `checked` + `onCheckedChange`, `value` + `onValueChange`, `orientation`, `dir`), APG keyboard tables, our events. Optionally `react-stately`'s `useSliderState` / `useSelectState` + `useListState`. | In-plan I8 estimate (4-6 days); adopting `react-stately` for Slider + Select state trims ≈ 0.5-1 day of math/selection code and adds a dependency | `react-stately` brings `@internationalized/*` and a 1,571-file package (tree-shaken); `Intl` availability in GodotJS V8 unknown; `useSelectState` expects `Item` collections built by `CollectionBuilder` (unverified, read not run, under GodotJS). | Spec-grade state edge cases (step snapping/precision, selection, typeahead state), and a path to Menu/Tabs/Combobox/Tree later at low cost. |

---

## 5. Plan changes

### 5.1 Under the recommended path (hand-build I8)

Phase I8 scope stays as written (`src/kit/*.tsx`, the six components, controlled/uncontrolled, aria passthrough,
WAI-ARIA keyboard). Additions and ordering fixes found while checking what the kit would need:

1. **`role` and `aria-*` must exist as typed props before I8.** `UIProps` (`src/components.tsx`) has neither today;
   Phase I8 uses `Button role="checkbox"` and "`aria-*` passthrough", while accessibility is Phase I10. Add the
   types and JS-side acceptance (native may ignore them until I10), or move that slice of I10 ahead of I8.
2. **Root size accessor** for Select/popover positioning (flip, clamp to the viewport). `UIRoot` has no size today
   (`src/renderer.ts:93-110`); `getRect()` is element-only. Add `root.getSize()` plus a `useRootSize()` hook (or
   fire a resize event). gluestack uses `Dimensions`; Radix uses the window.
3. **Slider without transforms.** Layout it as a row of `[filled flexGrow=p][thumb fixed width][rest flexGrow=1-p]`
   (the same trick as the Switch spacer in plan 3.23). Pointer capture (I2) and `getRect()` already give drag and
   track tap; no `onLayout`, no transforms.
4. **Select**: `Button role="combobox"` + `Portal` listbox + full-screen backdrop; position from `getRect()` and (2);
   Escape/Enter/arrows/typeahead via `onKeyDown`; focus returns via `focus()` on close. All planned primitives
   (I3, I4) suffice. State machine mirrors `useSelectState` (`isOpen`, `selectedKey`, `focusedKey`).
5. **Record in the I8 section** that the decision to hand-build was checked against gluestack/rn-primitives/Radix
   (this report) so it is not re-opened.
6. **Optional** (decide before starting Select): add `react-stately` as a dependency for `useSliderState`,
   `useSelectState`, `useListState`; first confirm `Intl.NumberFormat`/`Intl.ListFormat` in GodotJS V8 and
   `CollectionBuilder` under our reconciler. If either fails, drop the idea.

### 5.2 Only if gluestack were adopted later (not recommended): renderer features it would force

| Feature | Why | In the plan? |
| --- | --- | --- |
| Layout notification (`onLayout`/rect-changed event) | Slider track/thumb, Tabs indicator, Popover arrow, sheet heights (20 uses) | No. Only `getRect()` on demand. |
| `transform` (`translate`, `scale`) | Slider thumb centering and press scale (`SliderThumb.jsx`) | Explicit non-goal (2.3). |
| `position`, `left`/`top` in `%` | Thumb placement | Phase I4, but `%` insets unconfirmed |
| `Animated` | Every overlay presence, accordion height | No: our `transition` covers width/height/opacity/background only |
| `Dimensions`/viewport size and change events | Overlay placement | Not exposed (5.1 item 2 covers the need) |
| `PanResponder` / responder negotiation | Slider, sheets | No: pointer capture is the model |
| Safe-area insets | Toast, Actionsheet | Not needed for a game UI; app can pass insets |
| Pseudo-state readback in JS (`hovered`, `pressed`, `focused` render-prop args, `isFocusVisible`) | Pressable function children, `useFocusRing` | Contradicts plan 3.10 rule 8 (states are native) |

---

## 6. Open questions

1. **Licence of `@gluestack-ui/core`/`utils`.** `package.json` says MIT, but no LICENSE file ships in the `core`
   tarball and the GitHub repo reports none at the root. Matters only for path (b).
2. **Is `Intl` (NumberFormat, ListFormat) present in GodotJS's V8 (native and Web)?** Only relevant if we adopt
   `react-stately` slider/select state. Not testable by me without running code.
3. **Does esbuild drop `react-dom` imports reached through `@react-aria/utils` -> `react-aria`?** `sideEffects: false`
   is set (`react-aria/src/package/package.json:45`), but I did not bundle anything.
4. **Do we want Tab/Menu/Combobox/Tree/Table/Calendar later?** If yes, `react-stately` is the strongest reusable
   asset and the case for adopting it grows; if the kit stays at the six I8 controls, hand-writing is cheaper.
5. **Should `role`/`aria-*` typing move ahead of I8** (5.1 item 1), or should I8 ship with the props accepted but
   unexposed until I10?
6. **Root size API shape**: `getSize()` + hook, or a `resize` event on the root listener? Needed by Select and
   every later popover.
7. **Radix as a copy source:** `asChild`/`Slot` composition for our `View`/`Button` (the `rn-primitives` `Slot` is
   160 lines, MIT) looks valuable for the kit's public API; confirm that our reconciler's ref and prop merging suit
   it before committing the API to it.
8. Not examined: `anvil-native`, `@primitiv-ui/react` (surfaced by one web search, no registry check), and the
   copy-paste templates beyond button/checkbox/switch/slider/select/input.

## Appendix: commands and artifacts

* Registry queries: `npm view <pkg> version time.modified license dependencies peerDependencies --json`, outputs inline above.
* Tarballs: `$S/npm/` (gluestack core/utils/CLI/legacy button+switch+slider; rn-primitives x10; react-aria, react-stately, `@react-aria/*` and `@react-stately/*` shims; Tamagui x12; Zag x8; Radix x9). Templates and repo metadata: `$S/gh/`.
* Repository inspected read-only: `godot-react-ui/src/{components,index,types,styles,events,props,renderer}.ts*`, `docs/INTERACTION_PLAN.md` (3.10-3.23, 2.3, Phase I4, I8, Appendix D), `docs/MOTION_ARCHITECTURE.md`, `package.json`. No file in the repo was changed.
