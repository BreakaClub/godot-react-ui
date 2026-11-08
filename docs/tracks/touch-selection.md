# Touch text selection: notes and report

Branch `touch-selection`, based on main `a1bba11`. Notes and report for the coordinator. `docs/INTERACTION_PLAN.md` carries decision **D71** (and the narrowed non-goal in
2.3), added on the coordinator's instruction; `docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the README text is at the end). Decisions are numbered
TS1 and up so as not to collide with the plan's.

Ben's report, from his phone on `https://react.breaka.club`: "Text selection not working on mobile web."

__RESULT__

## Reproduction (before)

Headless Chrome 156 through puppeteer-core, a mobile page (`isMobile`, `hasTouch`, 390 x 844 at device pixel ratio 2, and 1120 x 800 for the code editor), touches sent with
`Input.dispatchTouchEvent` (a finger down for 1.2 s, then up; no OS input), against the live site and against this branch's base export (`artifacts/web-main-baseline`, main
`a1bba11`), reading what the library reports (`artifacts/scratch/touch-repro.mjs`, results in `artifacts/touch-selection-repro/{live,local-main}/results.json`):

| Target | Live site | Main's export |
| --- | --- | --- |
| `Text` with `select-text` (the selection lab's first paragraph) | `getSelection()` is `undefined` | the same |
| `TextInput` (forms lab) holding "hello world", pressed on "hello" | caret at 1, selection 1..1 | the same |
| Code editor, Code panel, a line | the caret at the pressed column (`Ln 4, Col 18`), nothing selected | the same |

It never worked, so it is not a regression: plan 2.3 listed "touch text-selection handles, long-press menus" as non-goals and the I6 notes (S2) say "a touch never starts one".
A touch press only cleared a selection.

## What it does

| Where | What |
| --- | --- |
| `native/touch_selection.rs` (new, Godot-free, 13 unit tests) | The long press (`Hold`, `TOUCH_SELECT_HOLD_MS`), the handles (`Handle`, `Edge`, the grab offset), the edit menu (`menu_actions`, `layout_menu`) and what a press on the chrome hit (`ChromeLayout::hit`) |
| `native/touch_selection_input.rs` (new) | The integration: the hold armed at a touch, the word selected when it elapses, the gestures (extending, a handle, a menu segment), autoscroll, the chrome placed from the selection and drawn into one top-most canvas item, the actions, `get_touch_selection()` |
| `native/pointer_input.rs` | `press_touch` looks at the chrome first, arms the hold, keeps a touch selection through the press and defers the caret in the input that holds it; `release_touch` ends a selection on a tap; `handle_touch`/`handle_touch_drag` offer every touch to the selection first; a mouse press ends a touch selection |
| `native/text_layout.rs` | `TextLayout::word_under(point)`: the word a finger is over (5 tests on the fake paragraph) |
| `native/selection.rs`, `selection_input.rs`, `text_geometry.rs` | `Document::compare`, `drag_point` (the drag's rule for where the focus goes, now shared), `select_points`; the geometry helpers the chrome uses are `pub(crate)` |
| `native/scroll_input.rs` | A touch pan is declined when JS captured the pointer after the press (TS5); `scrolled()` tells the chrome |
| `native/lib.rs`, `layout.rs`, `motion.rs`, `text_input_godot/pipeline.rs` | The field, `has_point` (the chrome receives pointers over nothing), frames for the hold and for a finger at an edge, the chrome follows layout and selection changes |
| `src/native.ts`, `renderer.ts`, `index.ts`, `src/touch-selection.ts` | `root.getTouchSelection()` and its types; the shared numbers the code editor draws with (held to the Rust file by a test) |
| `demo/src/touch-selection-lab.tsx`, `verify-touch-selection.ts`, `scripts/verify-touch-selection-web.mjs` | The lab (`touch-selection`, Text group), the native section and the Web scenario (the touch page at DPR 1 and a retina page) |
| `demo/src/editor/` (`touch-selection.ts`, `view/touch-chrome.tsx`, `view/editor-view.tsx`, `controller.ts`, `clipboard.ts`) | The code editor's long press, handles and menu (TS14) |

## Decisions

Each was made from the evidence of this session or from the documented defaults of the two platforms, and is tested where a check can see it.

- **TS1. Scope.** Selectable `Text` (`userSelect: text`, outside a `Button`), `TextInput` and the multi-line one, and the code editor through its controller. A secure input and an input with an IME composition under
  way are not touch-selectable (copy and cut are disabled for a secure one, D44; the preedit is not the buffer's text). Spellcheck and the OS's own menus stay out (2.3).
- **TS2. The hold: 500 ms, within `TOUCH_SLOP_PX` (8 px).** iOS's `UILongPressGestureRecognizer.minimumPressDuration` and Android's `ViewConfiguration.DEFAULT_LONG_PRESS_TIMEOUT` are both 500 ms (documented defaults; Android lets a
  person lengthen it). It is `TOUCH_SELECT_HOLD_MS`, a constant of its own with the same value as the touch drag's `TOUCH_DRAG_HOLD_MS`, because the two gestures are decided separately (TS5). It is measured on the engine's tick clock
  (`event_time_ms()`), as the drag's is, from the moment the root handled the press; `process()` frames are requested only while a hold waits. On the Web the engine builds the touch event inside the DOM handler (`DisplayServerWeb::touch_callback`: synchronously on the main thread, deferred only with `PROXY_TO_PTHREAD`) and Godot handles it at its next
  input flush, so a hold is measured from the frame that handled the press.
- **TS3. What a long press selects.** The word whose letters the finger is over: the point must be inside a line's glyphs and on a grapheme that belongs to a word (the text server's word breaks, `TextLayout::word_under`). White space,
  punctuation, the gaps between lines and the empty room beside or below a line select nothing, and the touch goes on as it was (a tap). This is not a double click's rule (`word_range_at` takes the nearest word, and a gap is a
  "word"): the brief says white space selects nothing, and both mobile browsers select the nearest word only for a press on the word itself. A selection that starts is the node's own (`userSelect` and `Button` rules are the
  document's, S4).
- **TS4. The pointer events.** A long press that selects ends the finger's pointer events with `pointercancel` (and `pointerleave`), as a drag does; no `click` follows the lift. No `contextmenu` is sent for a touch (a browser sends one
  on Android; here an element that wants no selection prevents `pointerdown`, which is what keeps it from any default action, or sets `user-select: none`). A prevented `pointerdown`, a pointer JS captured and a press that only stopped a
  coasting flick start no hold. The selection events are the mouse's: `selectionchange` and `root.getSelection()` (D41) for the document, `selectionchange` with offsets on a `TextInput`.
- **TS5. Arbitration (plan 3.12).** Order after an un-prevented press: JS capture, scrollbar thumb, a draggable element, **long press**, pan, plain pointer events. Inside a `draggable` element the hold is the drag's (rule 3) and nothing
  selects; a finger that moves beyond the slop first is a pan or a tap, never a selection (the hold is dropped); a finger that selected is not a pan (its pan is dropped when the hold fires). One rule changed in the pan: a touch is
  declined as a pan when JS has captured its pointer *since the press* (`touch_pan_moved`), as one captured in `pointerdown` always was. The code editor needs it: its own long press captures the finger it selected with, and
  the finger that goes on moving must extend the selection, not scroll the editor.
- **TS6. The finger that selected goes on selecting.** It extends the selection from the word, by characters, whichever side of the word it goes (the anchor is the word's far end, the focus follows the finger): Android and iOS both
  extend from a long press that is not lifted. The word is the least the selection can be.
- **TS7. Handles.** One at each end of the selection, in reading order: a 2 px stem along the edge, the height of its line, and a 12 px ball past it (above the first line, below the last), in the selection's colour at full opacity with
  a 1 px white ring so it shows on any background. A finger grabs it by a 44 px square around the ball (the smaller of iOS's 44 pt and Android's 48 dp guidelines), and the handle keeps the distance it had from the finger, so the end
  does not jump to the fingertip. A drag moves the end by characters (the text server's grapheme boundaries), never collapses the selection (a move onto the other end is ignored: one character stays), and where it crosses the other end
  the roles swap. A handle is shown only for an end that is in view: inside every clip around its text (a scroll container) and the root; the end that scrolled away shows none. The chrome follows scrolling and layout: it is re-placed on
  every scroll, layout and selection change, and costs nothing while no touch selection exists.
- **TS8. Autoscroll.** A finger that is selecting (extending or dragging a handle) scrolls the containers around the text it is over when it is within 32 px of their edge, at up to 600 px/s, the drag's own rule
  (`autoscroll_velocity`); for a text input also the input itself, which a single-line field is not a scroll container for. The selection is re-aimed at the finger after every step.
- **TS9. The menu.** A dark bar (slate-900, white 14 px labels, slate-700 under a pressed segment) of Cut, Copy, Paste and Select All in the order both platforms use; Cut and Paste only in an editable input, Copy only when there is
  something to copy (not a secure input), Select All unless all of it is selected. It sits above the start handle's ball, centred on the ends and inside the root with an 8 px margin; below the end handle when there is no room above;
  over the selection when neither side has room. It steps aside while a finger moves the selection and while a pan or a flick scrolls, and returns when they stop. Copy puts the text on the clipboard (`native/clipboard.rs`), keeps the
  selection and its handles and dismisses the menu until the selection changes; Select All selects all selectable text (the document's) or all of the input; Cut and Paste are the input's own commands (`beforeinput` first, so JS can
  refuse). Each segment acts if the finger lifts over it.
- **TS10. Clearing.** A tap (a touch that lifted within the slop of where it went down) on anything but the chrome ends a touch selection of the document. A tap in the text input that holds one puts the caret there, which collapses
  the selection and takes the handles away; a tap outside the input blurs it, which does the same. A mouse press ends it too, with no code of its own: a press collapses or clears the document's selection and places a text input's caret, and the chrome exists only for a non-collapsed selection a touch made (a hook for it was built and removed: the negative control that skipped it passed the check). A swipe keeps it: so a touch press no longer clears a
  *touch* selection at the moment it goes down (it did, for every touch press, before: S2). To keep that true in an input the caret of a press in the input that holds the selection is placed when the finger lifts, if it was a tap.
- **TS11. A text input and the soft keyboard (Web).** The engine's own `touchstart` handler moves the browser's focus to the canvas (`GodotConfig.canvas.focus()`, `library_godot_input.js`), which takes it from the hidden element
  that is the soft keyboard; the library puts the keyboard back when a gesture ends (`show_virtual_keyboard` at a long press's lift, a handle's lift and a menu action), as it already does for a tap. That call writes the field's
  text and selection to the element, so a key of the keyboard replaces the selected words (checked on the Web: typing `X` replaces "beta gamma"). While the finger is down the element is blurred: on a real phone the keyboard may flicker
  (not verified).
- **TS12. No caret handle and no caret-only menu.** The brief asks for a caret handle only if both browsers show one: iOS Safari does not (a tap places the caret, and tapping it again shows the menu; Android Chrome shows a teardrop).
  So a long press on white space in an input selects nothing and shows no Paste menu, and a tap shows nothing. Paste into a caret therefore needs the keyboard's paste, or a word selected first. A limit (below).
- **TS13. Clipboard writes on the Web.** `clipboard::write` is `DisplayServer::clipboard_set`, which calls `navigator.clipboard.writeText` when Godot handles the touch, a frame after the DOM `touchend`. Chrome allows it
  inside the touch's transient user activation (checked: the page's clipboard stub records `navigator.userActivation.isActive` at the call, and it is true). Safari's rule is stricter and **was not verified**: a write outside the gesture's
  own handler may be refused there, which is why the demo shell already writes the clipboard from a synchronous `keydown` for Cmd+C (`demo/web-shell.html`). The same shell trick for the menu's Copy (a `touchend` listener that knows the
  Copy segment's rectangle) is not built; see the limits.
- **TS14. The code editor owns its selection, so it draws its own.** The editor's lines are `Text` with no `userSelect`; its selection is CodeMirror's. `demo/src/editor/view/editor-view.tsx` times a long press with
  `LongPress` (500 ms, 8 px, `src/touch-selection.ts`, held to the Rust numbers by `tests/touch-selection.test.ts`), selects the word with the controller's double click (`pointerDown` with two clicks, so the finger that goes on moving
  extends by words, and punctuation runs are words: it is code), captures the finger, and draws two handles and a menu from the same numbers as Views in the scrolling content (`view/touch-chrome.tsx`), so they scroll with the text.
  A handle drags with the controller's `dragSelectionEnd`; the editor's own `Autoscroll` follows the finger at the edges. Differences from the root's: the menu does not step aside while the content scrolls, and its Paste is offered only
  where the clipboard can be read at once (native; on the Web the engine's read is asynchronous and stale, `docs/tracks/text-input.md`), so on the Web the menu is Cut, Copy and Select All.
- **TS15. The chrome is the root's.** One canvas item above the focus ring and the drag ghost (`TOUCH_CHROME_DRAW_INDEX`), so it is over every layer, a dialog included; it is hit tested before the tree on a touch, `has_point`
  answers for it so a handle outside every element still receives the finger, and no element hears of a touch on it. `get_touch_selection()` (`root.getTouchSelection()`) reports it for tests and apps.

## Behaviour against the two browsers

Columns two and three are from the platforms' documented defaults and what I know of their behaviour, **not measured on a device** (none was available). The last column is what this build does, and what the checks below test.

| | iOS Safari | Android Chrome | Here |
| --- | --- | --- | --- |
| Hold to select | about 0.5 s (UIKit long press) | 500 ms (`getLongPressTimeout`), user-adjustable | 500 ms within 8 px, on the engine clock (TS2) |
| What it selects | the word under the finger | the word under the finger | the word whose letters the finger is on; white space and punctuation nothing (TS3) |
| Moving before the hold elapses | scrolls | scrolls | a pan or a tap; no selection (TS5) |
| The held finger moves | extends the selection | extends it | extends it by characters from the word (TS6) |
| Pointer events | touch events are cancelled | `contextmenu`, then cancel | `pointercancel`, no click, no `contextmenu` (TS4) |
| Handles | two, with a loupe while dragging | two teardrops | two stems with balls, no loupe (TS7) |
| Handle drag | by character, crossing swaps | by character, crossing swaps | by character, crossing swaps, never collapses (TS7) |
| Edge of a scroller | scrolls | scrolls | scrolls (TS8) |
| Menu | Copy, Look Up, Share; in a field Cut, Copy, Paste, Select All | Copy, Select all, Share; in a field Cut, Copy, Paste, Select all | Copy and Select All; in an editable field Cut, Copy, Paste, Select All (TS9) |
| Menu while dragging or scrolling | hidden | hidden | hidden (TS9) |
| Tap elsewhere | clears | clears | clears (TS10) |
| A scroll | keeps the selection | keeps it | keeps it, handles follow the text (TS10, TS7) |
| Caret handle after a tap in a field | none (a loupe on a held caret) | a teardrop | none (TS12) |
| Native menu inside the canvas | n/a | n/a | none: the library draws its own |

## Evidence

### What the checks do

The native section (`demo/src/verify-touch-selection.ts`, `--only=touch-selection`, ScreenTouch and ScreenDrag from the verifier's own device, 424 checks per window, both windows) and the Web scenario
(`scripts/verify-touch-selection-web.mjs`, `Input.dispatchTouchEvent` on the touch page at DPR 1 and on a retina page at DPR 2) run the lab's gestures with exact answers:

- **Long press.** Nothing is selected at 250 ms; at 0.85 s the word under the finger is, with its offsets (`brown`, 10 to 15, in `ts-p1`); `selectionchange` was queued; the finger's one `pointercancel` is the only pointer event; handles are
  shown while the finger is down, the menu only after it lifts, and lifting is no pointer event. Handle stems stand on the carets of the two ends (within 1.5 px), the start handle's ball above its line and the end handle's below, a
  handle's grab square is 44 px, the menu is above the selection. Pixels: the ball is the selection's colour, the menu body slate-900 and its label light.
- **Handles.** The end handle dragged to offset 19 gives `brown fox`, back to 13 gives `bro`; the start handle to 4 gives `quick bro`; dragged past the end it flips (13..20); a handle taken to within one character of the other end
  and then onto it leaves one character selected.
- **Menu.** Copy puts exactly the selection on the clipboard (the verifier's in-memory one natively; the browser's, through a wrapper that records `navigator.userActivation.isActive`, on the Web, where it is true) and leaves the
  selection and handles with the menu gone; Select All selects every selectable text (first words to `it does not select.`, `Scrolling row 13` among them) and the menu then offers Copy only; a tap on plain text clears
  everything and sends `selectionchange`.
- **Arbitration.** A swipe that begins on selectable text scrolls the page by the finger's travel from the slop (100 px) and selects nothing, the finger resting past the hold; a finger that leaves the slop and returns selects
  nothing; a tap on a button clicks it; a long press on the space between two words and on the empty room beside the last line selects nothing; a swipe keeps a selection, the handles move with the text by exactly the page's scroll,
  the menu steps aside during the pan and is back after; a mouse press ends a touch selection; a long press inside a `draggable` card starts the drag (`drag.state` is `dragging`) and selects nothing.
- **Autoscroll.** A handle held 6 px above the bottom edge of the 96 px list scrolls it past a whole list height in 0.9 s, the selection follows down it (`row 1` to a row at least 10), its start stays at its word, and the
  start handle of the end that scrolled away is not shown; the same in the text area, whose text scrolls.
- **Text input.** The word under the finger is selected as the input's own selection (`selectionStart`/`End` 6 and 10 of "alpha beta gamma ..."), as `owner: input`, and not the document's; the menu is Cut, Copy, Paste, Select All; the end handle extends it
  to 16; Copy copies `beta gamma`; a tap in the field puts the caret there and hides the chrome; Paste replaces a long-pressed `delta` with the clipboard; Cut takes `alpha` out and onto the clipboard; the read-only field's menu is Copy and Select All and
  Select All selects the whole value.
- **Web only.** The soft keyboard's hidden element is the focused element after each gesture and holds the field's text and the selected range, follows a handle drag, and a key typed into it replaces the selected words.
- **Code editor** (`--only=code-editor`, 4,147 checks natively; the touch step of `scripts/verify-code-editor-web.mjs`): nothing is selected at 250 ms; a long press selects `useState`, handles stand on its edges, the menu offers Cut, Copy
  and Select All, Copy puts `useState` on the clipboard, the end handle dragged five columns extends it by exactly five, a tap hides everything, white space selects nothing, a swipe scrolls, and the finger that selected by
  holding extends the selection down three lines without panning the editor (this is the check that fails without the late-capture rule).

__GATES__

## Not verified

- **A real phone.** No iOS Safari and no Android Chrome was available. The two browser columns of the table are from the platforms' documented defaults and what I know of their behaviour, not measured. Everything above is Chrome's touch
  events over the DevTools Protocol in a headless desktop browser (real input events, real time: a finger held down for a second), and Godot's screen-touch events injected on a Mac. What a phone adds that these cannot show: real finger noise
  and coalesced events, the operating system's own touch handling around the canvas (the engine sets `touch-action: none` on it and cancels `touchstart`), and the soft keyboard.
- **The soft keyboard on a real phone.** The engine's `touchstart` moves the browser's focus to the canvas, which on a phone dismisses the keyboard; the library brings it back when the finger lifts (TS11), as it does after a tap. iOS may
  close the keyboard and not reopen it when focus moves inside a touch, which headless Chrome does not do, so a flicker or a closed keyboard on iOS is the first thing to look for. The checks verify the element that is the keyboard
  is the focused element after every gesture, with the right text and selection, and that its key replaces the selection.
- **Safari's clipboard rule** (TS13): the menu's Copy writes through `navigator.clipboard.writeText` a frame after the DOM event. Chrome allows it (recorded: `isActive` true); Safari may not.
- **Stock engine on the Web** (`--engine=stock` Web export is release-only here), **the release Web export** (every Web run is the debug export), **bidirectional text** (the caret of the primary direction places the stems; not exercised) and an
  **IME composition** (a field that is composing is not touch-selectable).
- **The Mobile and Forward+ renderers** drew the chrome in the native run listed in the gates; the Web is Compatibility only.

## Limits that stay

- No caret handle and no Paste menu for a caret (TS12); no magnifier loupe; handles move by characters, with no word snapping.
- The menu has Copy and Select All and, in an editable field, Cut and Paste; there is no Look Up, Share or Translate.
- A secure input and an input that is composing cannot be selected by touch (TS1).
- The menu's Copy on iOS Safari (above). The shell trick that would make it work there (a `touchend` listener in `demo/web-shell.html` that writes `window.__godotReactSelectedText` when the finger lifts over the Copy segment, whose
  rectangle `get_touch_selection()` has) is the recipe; it was not built.
- The code editor's menu does not step aside while its content scrolls, and has no Paste on the Web (TS14); its handles are Views, so they are clipped by the editor's scroller and scroll with it.
- No `contextmenu` event for a touch (TS4), so an app that uses one for a long press must use its own `pointerdown` timer.
- Text is selectable only where `userSelect` says so: the default is `none`, and this track did not change which of the demo's labs have `select-text` (the Selection and Touch selection labs).

## README text

> **Touch text selection.** Press and hold on selectable text or in a `TextInput` (a single line or a text area) and the word under your finger is selected, as on a phone: two handles mark the ends and
> drag them by characters (they scroll the container they are in when held at its edge), and a small menu offers Copy and Select All, with Cut and Paste in an editable field. A tap elsewhere clears it, and a swipe still scrolls
> and keeps it. White space selects nothing, a long press inside a `draggable` element is the drag's, and a `pointerdown` that was prevented starts nothing. The handles and the menu are drawn by the library (no OS menu exists inside a
> canvas) and `root.getSelection()`, `selectionchange` and `useTextSelection()` report a touch selection as they report a mouse one. The code editor does the same for its CodeMirror selection. See
> `docs/tracks/touch-selection.md` and the `touch-selection` lab and section. Limits: no caret handle or caret-only Paste menu, no magnifier, secure inputs are not selectable by touch, the menu's Copy was verified
> in Chrome (Safari's user-activation rule for the clipboard, and real iOS and Android devices and soft keyboards, were not).

