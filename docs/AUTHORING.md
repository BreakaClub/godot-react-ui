# Authoring

Use ordinary React, including hooks and component composition, with five native primitives (`View`, `Text`, `Button`, `Portal` and `TextInput`) and a small component kit built from them (`Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Select`, `Combobox`, `TextField`, `ScrollView`):

## Primitives

```tsx
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'godot-react-ui';

const styles = StyleSheet.create({
  panel: { padding: 24, borderRadius: 16, backgroundColor: '#ffffff' },
});

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.panel} className="gap-4">
      <Text className="text-3xl text-slate-900">Count: {count}</Text>
      <View className="flex-col md:flex-row gap-3">
        <Button
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-3"
          onClick={() => setCount(value => value + 1)}
        >
          Add one
        </Button>
        <Button
          disabled={count === 0}
          className="rounded-lg bg-slate-100 text-slate-700 disabled:text-slate-400 px-4 py-3"
          onClick={() => setCount(0)}
        >
          Reset
        </Button>
      </View>
    </View>
  );
}
```

`View` defaults to a flex column; `Button` is the same column with its content centred on both axes and its text centred (`align-items: center`, `justify-content: center` and `text-align: center`, which is what a browser's `<button>` does, and the only part of its user-agent style the library takes: no padding, border, background or font), and a class or style of yours replaces each of them (`items-start`, `justify-between`, `flex-row`, `text-left`). `Text` uses Godot text shaping and wrapping; as in React Native, raw strings may only appear inside `<Text>` (a raw string in a `View` throws); a `Text` inside a `Text` is a span of one attributed paragraph ("Rich text" below). `Button` participates in native hit testing and keyboard focus and renders its string and number children as one `Text` label. `Portal` renders its children into the overlay layer, which always draws above the main layer and is hit-tested first. Each `<Portal>` has its own container in that layer (React's persistent mode replaces a portal container's whole child list whenever that portal changes and empties it when the portal is deleted, so portals that shared one erased each other), so any number can be open at once; the overlay's top level is their children together, oldest portal first, so what opened last paints on top. `color`, `fontSize`, `textAlign`, `pointerEvents`, `cursor`, `userSelect` and `selectionColor` inherit natively.

## Focus and keys

Focus: `Button`s, and any element with `tabIndex={0}` (in the tab order) or `{-1}` (focusable only), take focus from a press, Tab (document order, wrapping, never a disabled or invisible element), `handle.focus()` or `autoFocus`. The focus ring and `focus-visible:` styles mark a keyboard focus only (Tab, or `focus()` after keyboard input); a press focuses without them. `onKeyDown`/`onKeyUp` (cancelable `keydown`) carry DOM `key`, `code`, `repeat` and the modifiers; Enter and Space press a focused `Button` and click it on release, without pointer events (a prevented `keyup` ends the press with no click), and a focus trap is a few lines of `onKeyDown`, `preventDefault()` and `focus()`.

## Events

Events include `onClick`, `onDoubleClick`, `onAuxClick` (any button but the primary), `onContextMenu`, pointer enter/leave/down/up/move/cancel (each with a `Capture` variant except enter/leave and the click family beyond `onClick`), `onWheel` (cancelable; deltas are in wheel ticks, positive down and right) and focus/blur. A `click` goes to the nearest common ancestor of the press and release targets, as in browsers (two parts of one enabled button click the button; a release on a disabled element or over nothing clicks nothing). They have DOM semantics: capture handlers run outermost first, then bubble handlers from the target up, then root listeners (`root.addEventListener`); `pointerenter`/`pointerleave` do not bubble and run only for the elements the pointer crosses. Events provide `target`, `currentTarget`, `eventPhase`, root-local coordinates, `pointerId`, `pointerType`, `button`, `buttons`, modifiers, `timeStamp`, `stopPropagation()` and `preventDefault()`. A pointer press is dispatched synchronously from inside Godot's input callback, so `preventDefault()` on `onPointerDown` stops native's focus default action before it runs.

## Pointers

The mouse (pointer 1, every button, click counting in `detail`) and touches (pointer 2 and up, multi-touch, captured to where they went down; the engine's mouse emulation is ignored, so a touch is never also a mouse press and never hovers) produce DOM pointer events. `handle.setPointerCapture(pointerId)` (also `releasePointerCapture`, `hasPointerCapture`) routes a pressed pointer's moves, up and cancel to an element wherever it goes, including outside the root and the window; `pointercancel` ends a contact the OS, a lost window focus or a detached root interrupted.

## Working with Godot input

The root takes pointers only where an element can receive them, so empty space and `pointer-events: none` regions (when every ancestor is `none` too) reach the Godot `Control`s underneath and then `_unhandled_input`; `cursor-*` sets the window cursor through the root's `_get_cursor_shape`. The root takes no key focus when it enters the tree: its owner calls `grabFocus()` for keyboard-first behaviour, and an element taking focus grabs it. Tab is consumed only when it moved focus, Enter and Space only when they activated a focused button, and a wheel tick only when a handler calls `preventDefault()`; everything else reaches `_unhandled_input`. A press on something that cannot take focus hands key focus back to the game. `viewportX`/`viewportY` are canvas coordinates (what `_unhandled_input` receives), `x`/`y` are root-local.

## Positioning

Positioning follows CSS with React Native's `zIndex`: `position` (`static`, `relative`, `absolute`, `fixed`; no `sticky`), `top`/`right`/`bottom`/`left` (pixels, percentages, `auto`; negative allowed; the `inset` shorthand and the `top-4`, `inset-0`, `inset-x-0`, `left-1/2`, `-top-2` utilities) and `zIndex` (the `z-10`, `z-[3]`, `-z-10` utilities). An `absolute` element is placed in, painted by and clipped by its nearest positioned ancestor (else the root), not by its parent: a menu in an `overflow-hidden` card stays visible where its containing block is outside the card. `zIndex` orders the elements one parent paints; there are no stacking contexts. `<Portal>` content is positioned like any other (`absolute inset-0` is a full-window backdrop); read an anchor's rectangle with `getRect()`. Events from inside a portal bubble through the overlay tree, not through the React ancestors of the `<Portal>`, and its Tab stops come after the main layer's.

## Scrolling

`overflow` `scroll` or `auto` on an axis makes a scroll container (the kit `ScrollView` wraps one with a content element that cannot shrink). The wheel, a trackpad pan, the keyboard (arrows, Page, Home, End, Space on the focused element's container; Tab and `focus()` scroll their element into view), a touch pan with momentum and an overlay scrollbar thumb dragged with the mouse all scroll it; a scroll the innermost container cannot take chains to the next one unless it has `overscroll-contain`, and a wheel tick nothing can take reaches `_unhandled_input`. `onScroll` (coalesced, not bubbling) and the handle's `scrollTo`, `scrollBy`, `scrollIntoView` and `getScrollState` read and move it. A touch that moves beyond 8 px pans the container unless `touch-action` forbids it, which cancels the pointer and its `click`; `touch-none` keeps the pointer events (the kit `Slider` has it). Scrolling moves one canvas item: no commit, layout, restyle or re-record happens (the snapshot's `scrollUpdates` and `overlayRecords` are what change).

## Text selection

`select-text` (inherited; the default is `select-none`) lets the mouse select the text of `Text` elements: a click collapses, a double click selects a word, a triple click the node's text, dragging extends (across elements, skipping `select-none` text, and to the start or end of the text after or before a pointer that is not over text) and Shift+click extends. A press on a `Button`, on an element that captured the pointer or prevented `pointerdown`, or on anything not selectable starts nothing and clears the selection. A selection takes Godot key focus for the root (no element is focused) so `ui_copy` (Cmd/Ctrl+C) puts the selected nodes' text, joined by newlines, on the clipboard and `ui_text_select_all` selects all selectable text; changing or removing text the selection covers clears it. `selection-[#hex]` colours the highlight, which is drawn under the text in the content item, so it scrolls and clips with its container; selectable text shows the text cursor. `root.addEventListener('selectionchange', ...)` (no payload, coalesced), `root.getSelection()` (the anchor and focus as element handles with UTF-16 offsets, the selected `text`, `isCollapsed`), `root.clearSelection()` and the `useTextSelection()` hook read it.

## Drag and drop

Drag and drop follows HTML inside one root: `draggable` (and `dragPreview`: `native`, a translucent copy of the element that follows the pointer, or `none`) makes an element a drag source, once a mouse moves past `Viewport`'s drag threshold or a touch is held still for half a second (a touch that moves first pans instead, and a prevented or captured `pointerdown` starts nothing; text inside a draggable element starts no selection). `onDragStart` (cancelable; fills `event.dataTransfer`), `onDrag`, `onDragEnter`, `onDragLeave`, `onDragOver` (cancelable: preventing it makes the element a drop target for the `dropEffect` the handler leaves, if the source's `effectAllowed` permits it), `onDrop` (cancelable) and `onDragEnd` (`dropEffect`, root-local and viewport coordinates, and `endedOutsideRoot` for a release beyond the root) all bubble; starting a drag cancels the pointer (`pointercancel`, no `click`). `DataTransfer` has the HTML protection modes (`setData` in `dragstart` only, `getData` in `drop` only). The cursor shows can-drop or forbidden, Escape cancels, a scroll container scrolls when the pointer rests near its edge, and the target follows a scroll under a stationary pointer.

## State variants and refs

Hover, press and focus are native state: they restyle `hover:`, `active:`, `focus:`, `focus-visible:`, `focus-within:` and `disabled:` variants without any React render or JS call. Refs expose a typed handle with its native tag and `getRect()` (a native query); `testID` supports inspection and `findByTestID` (a native query) without becoming native identity.

## TextInput

`TextInput` (and the kit's `TextField`) keeps its text natively and follows React Native's controlled-input protocol: pass `value` and store what `onChange` reports, or pass `defaultValue` and leave it alone. An edit is applied first and reported (`beforeinput`, then `input`); a `value` that differs from the text the user made is sent back with `setTextAndSelection`, so an `onChange` that stores something else (capitals, a filtered string, the old value) takes effect at once. Two consequences that a developer used to a plain `<input>` can trip over, and that a controlled `<input>` in a browser has too:

- **The caret goes to the end when a controlled value changes the length of an edit.** It stays where it was when the value has the length of the edit's text (a transform such as capitals) or goes back to the text from before the edit (a rejected edit, with the selection it had). Any other value, a mask that adds separators for instance, puts the caret at the end of the new text.
- **`setTextAndSelection` clears the undo history.** A controlled field whose `onChange` rewrites what was typed, or refuses some of it, has no undo for the text before the rewrite.

Also: `multiline` is fixed when the input is created (a commit that changes it is rejected); a paste with no text pastes nothing; a triple click selects all of a text area's text, not a line (`LineEdit`'s rule); a `TextInput` is always a text field to assistive technology (its `role` can only remove it from the tree); and there is no `aria-labelledby` or `aria-describedby` (native rejects unknown props), so the kit's `TextField` sets `aria-label` and `aria-description`. The text utilities (weights, families, tracking, line height) are accepted on a `TextInput` and do nothing: it shapes with the theme font.

## Combobox

`Combobox.Root`, `Control`, `Input`, `Clear`, `Trigger`, `Content`, `Item`, `ItemText`, `ItemIndicator` and `Empty` make an editable combobox (the WAI-ARIA editable combobox with list autocomplete): a `TextInput` with `role="combobox"` that filters a list in the overlay layer while keyboard focus stays in the input and the active option is announced through `aria-activedescendant`. `multiple` makes it a multi-select whose choices are chips (`Chips`, `Chip`, `ChipRemove`; the chips and the input wrap together in the control, so `Chips` takes the `Input` as its child). Typing filters (`filter`: a function, or `null` for options a parent fetches) and opens; ArrowDown and ArrowUp open and move (they go round), Alt+ArrowDown and Alt+ArrowUp open and close, Enter chooses, Escape closes and then clears, Home and End are the caret's, and Tab leaves and chooses nothing; `allowCustomValue` makes typed text a value (Enter, or a comma in a multiple one). Backspace in an empty input moves onto the last chip and a second press removes it. There is no backdrop: a press outside reaches what is under it and the input's `blur` closes the list, and a wheel anywhere but over the list closes it too (`useRootEvent('wheel', ...)`, a document-level listener, is exported). A mouse press on the list is prevented to keep focus in the input; a touch is not, because a prevented press cannot become a pan, and the list gives the focus straight back to the input. `value`, `inputValue` and `open` are controllable, and `value` is typed by `multiple` (`string | null`, or `readonly string[]`). Options are children, as in `Select`; a thousand options cost what a thousand `Select` items cost (about 110 ms to open, measured in JavaScript against the recording host, not natively), and there is no virtualisation.

## Rich text

A `Text` with nested `Text` is one attributed paragraph, as in React Native: `<Text>const <Text className="text-purple-600">x</Text> = 1</Text>` is one native node with a styled range. A span sets colour, background colour, font family, weight and slant and the text decoration (`underline`, `overline`, `line-through`; `decoration-solid|double|dotted|dashed|wavy`, thickness, colour, `underline-offset`), inherits from the span it is in, and is drawn per glyph over one shaped paragraph, so monospace columns are exact. Decorations are drawn as Chrome draws them, wavy included. `<Text inlay>` is generated text (a type hint): shown, measured and wrapped, but not part of the text: offsets, the selection, copy and the accessible name skip it, and a caret can sit on either side of it. Every `Text` handle answers `getCaretRect(offset, side)`, `getOffsetAtPoint(x, y)` and `getRangeRects(start, end)` in the root-local space of `getRect()`, right under transforms and at any pixel ratio. A change to one span's colour is a commit of a few hundred characters that paints without shaping again. A nested `Text` accepts only `children`, `className`, `style` and `inlay` (no ref, handler, `role` or `testID`, because it is not an element), its style may set only the longhands above, and a font size, letter spacing, case or breakpoint or state class on one throws, naming it; a `View` or `Button` inside a `Text` throws. The nesting is flattened in the renderer's host config, as React Native does with virtual text nodes, so an app with no nested `Text` takes the old path.

## Accessibility

`role` (the ARIA names of `UIRole`) and the `aria-*` props of `UIAriaProps` (`aria-label`, `-description`, `-valuetext`, `-placeholder`, `-hidden`, `-disabled`, `-expanded`, `-selected`, `-readonly`, `-required`, `-modal`, `-checked` including `'mixed'`, `-valuemin`, `-valuemax`, `-valuenow`, `-live`, `-orientation`, and `-activedescendant` and `-controls`, which name an element by the `id` of its handle because native has no DOM ids) reach Godot's `AccessibilityServer`. Native keeps one accessibility element per exposed node: a `Button`, a `Text` with text, a `TextInput`, a scroll container (`SCROLL_VIEW`) and anything with an explicit `role`; `aria-hidden` removes a subtree. Each has a name, role, state and bounds that follow scrolling, and actions: click, focus, a text input's selection and edits (through `beforeinput`), a slider's increment, decrement and set value (`onAccessibilityAction`; the kit `Slider` answers it), the scroll actions, and a scroll bar element for each scrollable axis. The kit sets its own roles and states. What was verified where (the macOS tree was read only on the `stock` engine profile, which has AccessKit; Breaka's engine has no accessibility driver; VoiceOver was never run by hand) is in [LIMITS.md](LIMITS.md).

## Mounting

Mount with `createRoot(nativeSurface, { subscribeToEvents }).render(<App />)`, where `nativeSurface` is a `ReactUiRoot` from `godot`. `subscribeToEvents(listener)` is required: the owner connects a `Callable` for `listener` to the surface's `eventsReady` signal and returns a function that disconnects it (a GodotJS `Callable` holds its function strongly, so `unmount()` calls that function or the whole root would stay reachable). Native emits `eventsReady` from inside its input callbacks. The owner also sets the surface size (native restyles the nodes whose breakpoints the new width crosses, with no React render), calls `dispatchEvents()` each frame for events native queued outside an input callback, and calls `unmount()` before freeing the surface. [The demo owner](../demo/src/main.ts) shows the complete lifecycle, including tree re-entry. `render()` commits the initial render synchronously; later hook updates use React's scheduler.

## Display scale

The root draws its text and its rounded edges at the font oversampling of the viewport it is in (`Viewport.get_oversampling()`), which is what Godot's own controls draw at. A `Window` carries its content scale factor, a stretch mode's scale and an oversampling override in it, so the owner decides how sharp the UI is by scaling its window; the library follows, including a change of scale that nothing else tells it about (a window moved to another display, the owner changing `contentScaleFactor`): it draws again at the new scale without a commit. `Window.use_font_oversampling = false` (a deliberate 1x raster) is honoured, as it is for Godot's own controls. The snapshot's `oversampling` is the scale the root last drew at.

**An owner that wants a high-DPI window sets one of these; the library does not.** A native window with no stretch settings has a content scale factor of 1: logical pixels are physical pixels, the text is as sharp as the screen, and the UI is small on a Retina display (the demo's 1120 x 800 window is 560 x 400 points on a 2x Mac, `DisplayServer.screen_get_scale()` is 2). To lay the UI out in points and draw it at the display's resolution, set `Window.contentScaleFactor = DisplayServer.screenGetScale()` (what the Web demo owner does every frame, so browser zoom and display changes are followed), or use the project's `display/window/stretch/mode = canvas_items`; either gives the viewport an oversampling of the scale. Injected input (`Input.parseInputEvent`) is in window pixels, which the window divides by the content scale, so a verifier gives it positions in logical pixels times the scale. A root inside a `SubViewport` has the viewport's own scale, not the window's: to render a `SubViewport` (a world-space panel) at more texels than layout pixels, set its `size2DOverride` to the layout size, `size2DOverrideStretch` on, and `size` to the texel size ([WORLD_SPACE.md](WORLD_SPACE.md)).
