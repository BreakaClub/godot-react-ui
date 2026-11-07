# Track: code editor (the lab navigator's code panel, replaced)

Branch `code-editor`, based on main `9697dd6`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and
`README.md` are not edited here (the paragraph for the README is at the end). The design is `docs/tracks/code-editor-evaluation.md` (sections 6
and 8); the compiler and checker under it are `docs/tracks/live-compile.md`.

Ben's goal: "Each lab will show its code, or rather the code editor can be revealed and you should be able to modify the TSX and see the
components update on the same page. With type checking and compilation handled by bun TSC", with "highlights, inlays, underlines etc."

The editor that `9697dd6` added could not edit (a click only focused a hidden input, so the caret stayed on line 1), never reached the page,
had no type information, drifted off its columns (a constant `7.8` where the font measures about `7.2`), re-rendered and re-highlighted every
visible line twice a second, and compiled on the main thread. It is replaced. What was kept: CodeMirror 6's headless packages and Lezer, and the
Code button.

## What works, end to end

Press Code on a lab and its TSX opens beside the page: highlighted, with a gutter, a caret, selections, and the keys of a code editor. Type, and the page follows after a short pause in typing:
the edited component swaps in with its state kept where its hooks are the same. A syntax error keeps the last good page and is underlined and listed; a type error is underlined where `tsc`
puts it and says so when hovered, with the type; inlay hints stand in the line. Everything below was run in this worktree (injected input only: no real mouse, keys or clipboard).

Moved onto rich-text (C6, C19-C21): a line is one `Text` with nested `Text` spans, diagnostics are wavy underlines, the hint, the preedit and the selected line break are inlays, and a line with wide
characters is placed by its text. What was measured, before (a `Text` per run, 20 px lines, `cbf8407`) and after (spans, 16 px lines), on the default engine (Breaka's Godot 4.8, landscape 1920 x 1080
logical, DPR 1), the same section, the keystroke being a character typed into the 85-column `className` line of the Controls lab. "Before" is four runs, "after" three; the time to ink swings 5 ms
between runs of the same build on this machine, so read it by its range.

| | before: runs | after: spans |
|---|---|---|
| nodes on the whole page with the panel open | 446 | 301 |
| commands to mount the panel | 409 | 251 |
| window mount (press Code to the first lines drawn) | 171, 175, 203 ms | 149, 157, 162 ms |
| commit per keystroke (characters of JSON; the line's text and every span of it now) | median 849, worst 1,364 | median 1,202 to 1,205, worst 1,493 to 1,497 |
| a keystroke's handling in JS (the longest `events` sample) | 2.7 ms | 3.5 to 3.8 ms |
| the native commit call of it | 0.72 to 0.78 ms | 1.5 to 1.7 ms |
| keystroke to ink, median / p95 | 18.1 to 20.5 / 28.3 to 32.5 ms | 13.4 to 24.8 / 20.2 to 30.4 ms |
| last key to the page | 232 to 239 ms | 227 to 237 ms |
| autoscroll starts after the pointer leaves | 51 to 54 ms | 31 ms |
| idle, panel open, not focused | 0 busy samples | 0 busy samples |

Spans are kept. The page is a third smaller and mounts a few ms sooner, a keystroke is not slower to ink, and the columns, the waves, the inlays and the wide characters are the paragraph's. They cost more per
keystroke on the wire: the line's whole `spans` array goes down with its text, about 80 characters a span, so a line with fifteen punctuation spans is 1,300; the 40 % more JSON is well under the budget
(3,000) and not where the time is (JSON encoding is 0.01 ms). Two things measured on the way: the first spans build put the old probe's per-render caret queries on every keystroke (C20: 8.7 ms of JS and
28 ms to ink), and with 20 px lines a selection was not contiguous (C21). Other facts of the same runs: advance 7.203125 px, line 16 px, gutter 44 px; every column of the first twelve lines has its caret on
`column * advance` to 0.05 px (443 carets); a selection from column 100 to 106 of a long line has its edges in the raster where the grid says; the wave under a type error is red on 2 to 3 rows of pixels (a solid line is one);
a comment with three emoji and two CJK characters has its carets up to 0.89 of a column off the grid, a press across an emoji lands on the nearer caret, Right moves over both code units, and the selection band
is under exactly the three emoji in the raster.

Sections, on both engines (`pnpm switch:engine` between them): default engine `code-editor` 3,546 assertions (landscape; the portrait window runs 2 more), `live-compile` 1,541, `navigator` 7,560; stock
engine (Godot 4.7.2): the same three, 3,546, 1,541 and 7,560 (`artifacts/logs/rich-final-default-1.log`, `rich-stock-sections.log`). Stock: mount 151 ms, 251 commands, keystroke to ink median 15.8 ms (p95 28.7).

Checked in the section: a press puts the caret within a pixel; drag, double, triple and Shift+click; the keys of the table (Alt/Ctrl word jumps and the rest; the Node tests run every bound
command in four kinds of document); Copy, Cut and Paste (the section runs with the root's in-process clipboard, `setClipboardText`; the browser's real one is read in the Web scenario);
IME preedit (composition events, native and Web) drawn underlined at the caret and committed; undo and redo; Reset; hiding and showing the panel keeps the text and the lab's state;
the page's counter keeps its count through an edit; a class the library does not know is not sent and is underlined; a read-only fallback when the extension is missing.

Negative controls. The spans build failed its own section before it passed, each time at the cause: a regex with Unicode property escapes that the engine's JavaScript rejects (the app did not load), a selection
raster check at a pixel above the span's background (C21), a caret hiding the pixel next to a selection's end, and the probe's cost (C20: the keystroke breakdown showed 8.7 ms against 2.7). Two controls on the finished build, each restored after: the probe's advance rounded to a quarter pixel again (the old grid) fails the section at "The caret is at the pixel of its column: 468 against 466.67"
(`artifacts/logs/neg-quantised-advance.log`), and `onGrid` forced true (every line on the grid) fails it at "The caret at the end of the line is where the text puts it: 409 against 415.42" on the line with emoji
(`neg-all-on-grid.log`). The section failed on real defects before it passed, each fixed at its cause (C5 click counts, C6 clipped glyphs and drifting runs, C14 the class that reset the counter,
the stale inlay mapping, the tooltip that stayed). 36 mutants of the model, controller, annotations and embedded session were run against the Node tests and all are killed (five survivors
got tests). The live-compile memo cases fail natively with the family subscription removed ("The element the parent kept shows the edited component: kept v1"). The Web touch scenario failed
on "Backspace takes one off" with the input empty and passes with C18's space in it (`artifacts/logs/web-code-editor6.log` before, `web-code-editor8.log` after).

Web in Chrome (`node scripts/build-web.mjs --export-only`, then `node scripts/verify-interaction-web.mjs --only=code-editor`; `artifacts/logs/rich-web-final.log`, after a full `node scripts/build-web.mjs`): 132
checks and 153 assertions over the landscape page at DPR 1, the retina page at DPR 2, the portrait page (no button) and the touch-landscape page. The touch page taps a column (caret on its pixel, the
engine's soft keyboard element focused), types `XY`, `Z`, presses Backspace through it (C18), taps elsewhere, and pans with a finger. The Web checks the same caret per column of the first lines, the wavy
underline, the hint's carets either side of it, the preedit as an inlay with the caret after it, and a line with emoji and CJK pasted from the browser's clipboard: a press lands on the nearer caret and the
selection is the span over the three emoji. (The Web build has no font for the emoji or the CJK: the room is laid out, nothing is drawn.)

Rasters are in `artifacts/code-editor/` (ignored by git): `native-dpr1-*` (8 states), `web-landscape-*` (DPR 1, 9 states incl. preedit and wide), `web-retina-landscape-*` (DPR 2, the same 9) and
`web-touch-landscape-code-editor-10-touch.png`. I looked at them: no clipped glyphs, a multi-line selection is one block, the wave under `label` at DPR 2 is a crisp red wave under the right five letters
and the syntax error's `=` `=` are waved, the inlay pills are under the hints, the tooltip shows TS2322 and the type, the gutter marks the problem line, the emoji are selected by a band exactly under them
(native: Apple Color Emoji), and the CJK characters leave a gap (see the limits).

## Layout of the code

```
demo/src/editor/               hidden from Godot by .gdignore: no script resources, no .uid, no entry points; bundled into its importers
  model.ts                     EditorModel: a CodeMirror EditorState, a document version, the changes that made each version
  command-target.ts            the part of EditorView that CodeMirror's commands use, for a monospace editor with no DOM
  commands.ts                  typed and pasted text, Copy and Cut through a port, Tab, "select next occurrence"
  keymap.ts                    CodeMirror's defaultKeymap + historyKeymap matched against a UIKeyboardEvent, per platform
  controller.ts                EditorController: the keys, beforeinput, composition and pointer of one file; line specs for the view
  annotations.ts diagnostics.ts   results of the type checker mapped through the edits made since their text
  highlight.ts lines.ts line-layout.ts   Lezer colours cached per line; a line as segments; the offset <-> column map of a line on the grid (printable ASCII)
  workspace.ts                 EditorWorkspace: the files of a lab, the debounced update of the live session, the check, hints and hover
  lab-code.ts                  openLabCode: a live session + workspace, or the read-only fallback with the reason
  geometry.ts pointer-selection.ts    columns, lines, windows; click, drag, word and line selection
  view/                        the React part: editor-view, code-line (one Text with spans), gutter, carets, hover tooltip, problems, status bar
demo/src/code-editor.tsx       the panel (tabs, Reset, the view, problems, status)
demo/src/navigator.tsx         the Code button, useLabCode, the stage that keeps its place in the tree
demo/src/live-compile-session.ts   LiveSession.Lab (embedded mode)       src/renderer.ts   UIRoot.flushSync
demo/src/verify-code-editor.ts   scripts/verify-code-editor-web.mjs      tests/editor-*.test.ts tests/code-panel.test.ts
```

## Decisions

**C1. The text is CodeMirror's, the view and the input are ours** (the evaluation's design, built as written). `EditorModel` is an `EditorState` (TypeScript and
JSX through Lezer, history, several selections, `indentOnInput`) with no `EditorView`; `EditorController` answers a `keydown`, a `beforeinput`, a composition
and the pointer with transactions. The input is a `multiline` `TextInput`, one column wide, at the caret, that holds one zero-width space (C18); every `beforeinput` is prevented, so its own
buffer is never edited (a test asserts it, and the Web touch scenario types and deletes through the soft keyboard into it).

**C2. `demo/src/editor/` has a `.gdignore`.** Every `demo/src/*.ts` is a Godot script and, by `scripts/demo-entry-points.mjs`, a bundle of its own; the editor's
thirty files import CodeMirror, which would then be in the pack thirty times over. Hidden from Godot the folder needs no `.uid` and no entry points, and is bundled
into the files that import it (`main.ts`). `demo/src/verify-code-editor.ts` is an ordinary entry point with its `.uid`.

**C3. The keymap is CodeMirror's own table.** `defaultKeymap` and `historyKeymap` (arrows, word jumps, Home/End, pages, Shift to select, select line, indent, comment,
move/copy line, add cursor, delete by grapheme/word/line, undo/redo), matched by `keymap.ts` against `UIKeyboardEvent` (CodeMirror's matcher is in `@codemirror/view`,
which needs a DOM) with Tab, Cmd+C/X/D/L added. Alt jumps by word on macOS and Ctrl elsewhere because the table says so; the platform is `OS.hasFeature('macos'|'web_macos'|...)`.
`CommandTarget` is the part of `EditorView` the commands call (monospace, no wrapping); `tests/editor-keymap.test.ts` runs every bound command, on both platforms,
in four kinds of document and five selections (over 1,000 runs). The one cast is `asEditorView` (`EditorView` has private members), documented at the site.

**C4. Copy and Cut are a call, Paste is the platform's event.** The evaluation's trick (mirror the selection into the input so native copies it) is not used. Copy and
Cut call a `ClipboardPort` (`ReactUiRoot.setClipboardText`: the machine's clipboard, the browser's on the Web, the process's memory in a verifier run,
`native/clipboard.rs`). Paste is left to native: Cmd+V is not the editor's key, native reads the clipboard (on the Web, `navigator.clipboard.readText`, `web_clipboard.rs`)
and the text arrives as `beforeinput` `insertFromPaste`. Copy with nothing selected copies the line and pasting it with nothing selected puts it above the caret's line;
a paste of as many lines as selections gives each its line; tabs become spaces.

**C5. Click counts are the editor's.** A `pointerdown` has `detail` 0 (as in the DOM; only `click` has a count), so `ClickSequence` counts presses by native's own rule
(500 ms, 4 px). The first version read `detail` and a double click selected nothing: the section's "double click selects the word" failed on it.

**C6. A line is one `Text` with nested `Text` spans (rich-text), not a row of runs.** `view/code-line.tsx`: the `Text` holds the document's own line and each coloured range is a nested `Text`
(only what is not in the line's own colour is a span, which keeps what a keystroke sends down). The selection and the bracket match are span backgrounds, a diagnostic is
`textDecorationLine: underline` with `textDecorationStyle: wavy` in its severity's colour, and the inlay hint, the IME preedit and the selected line break are `inlay` spans: text the paragraph
shows, measures and wraps but does not count, so a caret, a press or a range is at the document's offset. The first version was a run per segment, absolute at `column * advance` and `ceil`-wide,
with the advance rounded to the quarter pixel the glyphs were painted at (7.25 where layout said 7.205); that was a workaround for the seam between boxes (clipped last glyphs, runs 1.3 px
off their column) and went with it: the paragraph is one shaped line, `editor/font-grid.ts` is deleted, and the grid advance is the probe's own `getCaretRect(400) - getCaretRect(0)` over 400
(7.203125 at 12 px: a 26.6 fixed-point number), not the width of a box that layout rounds to whole pixels. A paragraph whose glyphs are placed at quarter pixels has no drift: the caret of every
column of the first twelve lines is on `column * advance` to 0.05 px (443 carets, native; the Web checks the same).

**C19. The grid stays where it is exact; any other line is placed by its text.** On a line of printable ASCII a column is a code unit and a code unit is `advance` wide, so the caret, a press and
the hover are `column * advance` and `round(x / advance)` and ask the text nothing (a Node test asserts a press on such a line makes no text query). A line with any other character, or a hint or
preedit with one (CJK and emoji are two columns, a combining mark none, a tab goes to a tab stop, the hint's ellipsis is `…`), is `LineLayout.onGrid === false`: the editor asks that line's `Text` through
its handle (`getCaretRect(offset, side)` for the caret and the input, `getOffsetAtPoint` for a press and the hover, `getRangeRects` for the tooltip's anchor), after the layout effect that follows
the render for the caret (until it is measured, which is before paint, a caret is drawn at its grid column). A caret is on the `before` side of the group of generated
text at its offset, and after it while a preedit is shown; the hint at the composition's offset is not shown during it, so that "after" is after the preedit and nothing else. The width of the scrolling
content is an estimate (`displayColumns`: two columns for a wide character, none for a mark, a tab stop for a tab), because nothing needs it exact. The engine's JavaScript has no Unicode property
escapes (`\p{Emoji}` throws "Invalid property name"), so these are ranges.

**C20. The probe asks for its carets when its box changes, not on every render.** The first spans build kept the old probe, which measured after every render: three native calls, two of them
`getCaretRect` on a 400-character paragraph. A keystroke renders the editor, so each cost about 6 ms (the keystroke's JS went from 2.7 ms to 8.7 ms and its key-to-ink from 18 to 28 ms). The
probe now reads `getRect()` (cheap) every render and the carets only when the box is not the one it last measured them in.

**C21. Lines are 16 px (`leading-4`), not 20.** A span's background is the font's own height (about 15 px for JetBrains Mono at 12 px), not the line box: with 20 px lines a selection over several
lines was a stack of bands with a 4 px gap between them (read off the raster: rows 3 to 17 of a 20 px line). At 16 px (1.33 times the font size, as VS Code's) the bands touch and a multi-line selection is one block.

**C7. Windowing is a division, not `@tanstack/virtual-core`.** Lines are a fixed height, so the lines to draw are `floor(scrollTop / lineHeight)` less an overscan to
`ceil((scrollTop + height) / lineHeight)` plus one. virtual-core would need a duck-typed scroll element behind a cast, a timer for `isScrolling` and an animation-frame shim, to
do that. The dependency stays in `package.json` and is unused.

**C8. One scroller, a gutter that follows `scrollLeft`.** The content is one `overflow-auto` `View` as large as the file; lines, carets, selection and the input are absolute in it;
the gutter is absolute at `left = scrollLeft`, which changes only when the person scrolls sideways (the vertical scroll is native and costs no commit). A scroll event moves the
window; a line that stays in it keeps its props (`LineSpecCache`, `memo`) and costs no commit.

**C9. The caret blinks in `Carets` alone, and only while the input has the focus.** A tick re-renders the carets and nothing else; an editor without the focus draws no
caret and has no timer, so the root asks for no frames (checked: `surfaceProcessing()` over two seconds).

**C10. Highlighting never blocks.** `ParseScheduler` asks `ensureSyntaxTree(state, endOfWindow, 8 ms)`; if that is not enough the lines are coloured with the tree so far
and a `setTimeout(0)` carries the parse on in 8 ms steps, reporting when it reaches the window. CodeMirror does up to 20 ms of incremental parse inside a transaction itself
(`LanguageState.apply`; under a millisecond for a typed character). Spans are cached per line by text and tree and compared with the old ones, so an unchanged line gets
the same array and the same props.

**C11. A result is for a version; it is mapped or it is dropped.** `EditorModel` numbers the versions of the text and keeps the change set of each of the last 1,000.
A type check, a set of inlay hints is placed with `ChangeSet.mapPos` through the edits since its text (`AnnotationSet.replace`), refused if the model no longer knows them
(the status bar says so), and every later edit keeps it in step. A hover is asked of the text that is on the page (a pending edit is sent first) and thrown away if the text moved
meanwhile. The extension's queue is FIFO (`live-compile/ext/lib.rs`), so a query sees exactly the files as they were when it was asked: queries are tagged with the version of
the last `update`, not the version now. A result for an older version than one already drawn is dropped. Two sets of problems: the checker's, and the compiler's and the class
check's (drawn before the checker answers); a syntax error the checker also has is shown once.

**C12. The lab on the stage is the session's, and an edit is on the page when `update` returns.** `LiveSession.Lab` is a component that renders the edited lab (inside the
session's error boundary) in the navigator's own tree; `UIRoot.flushSync(work)` (new, `src/renderer.ts`, a small hunk: React DOM's `flushSync`) commits what an update scheduled
before returning, because a state update outside an event otherwise waits for the next frame's microtasks (GodotJS drains them in `Environment::update`) and `update` must
know whether the new page rendered to roll it back. The session is made when the Code button is first pressed (a layout effect, so the page is the live one in the next commit) and kept for as
long as the lab stays selected: hiding the panel does not throw an edit away. The stage keeps its place in the tree whether or not the panel is beside it, so the lab keeps its
state when the panel is shown or hidden (checked). Debounce: 150 ms after the last change, at most 600 ms while typing never pauses. Reset puts the files back and sends them.

**C13. The family proxy missed pages React skips; fixed at the cause, with two regression cases.** `live-compile-refresh.ts` re-rendered only from the root (`__refreshEpoch`),
so an element a parent kept in `useMemo` kept its component's old code (`tests/live-compile-embedded.test.ts`, case 3: "Heavy v1" after an edit to "Heavy v2"; reproduced before
the fix). Now every family proxy subscribes its mounted instances (`useSyncExternalStore`) and a family given new code tells them: the dev reconciler's `scheduleRefresh`,
done in user land. Second finding: Bun's Fast Refresh pass registers top-level functions only, not `memo(...)` or `forwardRef(...)`, so each run of a module made a new
wrapper object, a new element type: the wrapped component remounted and lost its state (case 4), and a wrapper made in an unedited module held the old function of a body that
another module had since edited (case 5). `stableWrapper` makes one wrapper object per component (keyed by module, name and order in the module), over a stable inner function that
calls the latest version through its family, with the same subscription; a changed hook signature starts the state again, as for a plain component. Both cases are in the Node tests
(six mutants of the fix, all killed) and in the `live-compile` section (`MEMO_SETUP` and `MEMO_EDIT` in `scripts/live-compile-edits.mjs`).

**C14. A class the library does not have is not sent.** The library throws for an unknown class when a component renders. Typing `bg-emerald-100` passes through `bg-e`, and sent to
the page that is a render that throws, which React answers by dropping the state (the section found it: "The counter kept its count through the edit: Next 0"). The classes
written as string literals in the text are tried first with the library's `compileStyle` (`class-check.ts`); a text with one it does not have is not sent, the class is underlined,
the status bar names it, and the text is still checked. A computed class is the page's to get right.

**C15. Without the compiler the code is shown read-only, with the reason in two places.** The extension is optional (`node scripts/build-live-compile.mjs`) and so is the project
file. If the session cannot open, `openLabCode` returns the files read from the build (`FileAccess`), read-only (`EditorState.readOnly`), a banner that begins "Read-only." with the
exception's message, and a status bar that says "Read-only. Live compile is not available: ...". It is never "Ready". The `code-editor` section runs in the default regression and checks
whichever path the machine has: a machine without the extension checks the read-only path (typing changes nothing, a word can be copied), one with it the live path.

**C16. The Code button is not offered below 768 logical pixels (`md`), and not for a window or scene lab.** A phone's screen cannot hold the page and an editor, and the soft keyboard
takes half of what is left: a 600 px portrait window has a 330 px panel and a keyboard over it. Editing code on a phone is not something Ben asked for ("the Code button shows on
phones: decide"). A tablet (768 and wider) has the panel and its tap, caret and soft keyboard are checked on a touch page of that size. The section asserts the button's absence in the portrait window.

**C17. Wavy underlines, inlays and exact columns came with `rich-text` (C6, C19).** The first version drew a solid underline because a run could not have a wave; the diagnostics are now the
paragraph's own waves (checked in the raster at DPR 1 and DPR 2: red on three rows of pixels under the range, where a solid line is one), and the preedit and hints are inlays. The look of the hint is kept: a
span background and its colour. A span draws nothing for a character no font has (in a plain text the engine draws a hex box): see the limits.

**C18. The input holds one zero-width space, for a soft keyboard's Backspace.** The first version's input was empty. On the Web a soft keyboard types into a hidden DOM element that
holds the text of the focused input and sends *all* of it with every key (`GodotDisplayVK`, and `native/text_input_godot/web_keyboard.rs` keeps it in step with what native holds). An element
that held nothing gave Backspace nothing to delete: no `input` event, so the key never reached the editor (the Web touch scenario's "Backspace takes one off" timed out; Backspace on a
phone or tablet would not have worked at all). The input now holds U+200B (`editor/sink.ts`, `SINK_TEXT`), which every answered edit leaves in place (native writes it back to the element
after a prevented edit). A text from the soft keyboard without it is a Backspace; one with it, wherever the keyboard's caret left it, has what was typed beside it. The engine presses
Right once per character of the element's text after it (`_vk_input_text_callback`), which now counts the space, and the controller swallows that many plain Right presses within 250 ms
of the text (`SOFT_KEYBOARD_PRESS_WINDOW_MS`): they are the engine's, not arrows. On a desktop the space is never seen: every `keydown` that edits is the keymap's and every `beforeinput` is prevented.

## Not verified, and limits

Not verified:
- A real phone's or tablet's soft keyboard (iOS Safari, Android Chrome). The touch page is Chrome with touch events and the engine's hidden element, driven by Puppeteer's keyboard; a real keyboard
  also sends autocorrection (`insertReplacementText` of a whole word) and Android's composing text, which the controller treats as typed text or a composition but I have not seen.
- Safari and Firefox on the Web for the editor (Chrome only).
- A real IME. The composition events are synthesised (native and Web); no real OS input was generated, by the rules of the track.
- Native at DPR 2. The Web retina page (DPR 2) is the evidence for the grid, the caret and the waves at that scale; a native window ran at 1.0.
- The machine's real clipboard on the desktop (the section uses the root's in-process one); the browser's is read in the Web scenario.
- Right-to-left or mixed-direction text in a line (rich-text's own limit: two carets at a direction change, the primary one answered), and a span that splits a grapheme cluster.
- A line off the grid with a font that has CJK (none registered, none found; see the limits): the geometry of the missing-glyph boxes is verified, the glyphs are not.
- The stock engine's Web export (rich-text's limit too: `live-compile`'s Web side module is Breaka-only).

Limits:
- The demo's fonts have no CJK, and on this machine the engine found no system fallback for it: in a plain text the characters are two-column hex boxes, and in a span (a comment, a string) they are
  not drawn at all, only the room they take. The geometry of a line with them is verified (carets, presses, selection band, in the raster); the glyphs are not on screen. Emoji, which a fallback does
  have, draw. Registering a CJK font is the owner's choice, as the demo registers its Latin ones.
- The width of the scrolling content for a line off the grid is an estimate (`displayColumns`); a caret near the right end of such a line scrolls into view by the text's own caret, not the estimate.
- Moving up and down keeps the column in code units (CodeMirror's goal column in a monospace `CommandTarget`), so over a line with wide characters the caret lands by code unit, not by x.
- A span's background is the font's height, so a selection is only contiguous because the lines are (C21); a taller line height would show the gaps again.
- A render that throws loses the page's state (React drops it); the class check (C14) covers the common case, a mistyped literal `className`, and nothing else.
- Leaving a lab drops its edits: the session is kept while the lab stays selected, not across selections.
- A type check older than the last 1,000 edits is dropped (the status bar says so).
- A stray `}` in JSX text is not a syntax error to Bun's parser, so it is not underlined; the section types ` = = ;` for a syntax error.
- `@tanstack/virtual-core` stays in `package.json` and is unused (C7).
- Below 768 logical pixels there is no Code button (C16).

## README text

**Code editor.** The lab navigator can reveal the TSX of the lab on the stage in an editor that is made of the library's own components: press Code, type, and the page above updates after a short
pause, with its state kept where the hooks are the same. Bun's checker and compiler (the `live-compile` extension) report errors, types for a hover and inlay hints, drawn as wavy underlines, a
problems list and a status line; a syntax or type error leaves the last good page on the stage. The text lives in CodeMirror 6's headless `EditorState` (Lezer highlighting, history, several
selections, CodeMirror's key table). The view is a window of lines, each one `Text` with nested `Text` spans for its colours, its selection, its waves and its hints (rich text), with a caret and a gutter;
on a line of printable ASCII the monospace grid places the caret and answers a press, and on any other line (emoji, CJK, combining marks) the line's own text does, through `getCaretRect`,
`getOffsetAtPoint` and `getRangeRects`. A focused `TextInput` at the caret takes the keyboard, the IME and the soft keyboard and is never edited: every key it receives is answered with a transaction.
Without the extension the code is shown read-only, with the reason. See `demo/src/editor/` and `docs/tracks/code-editor.md`.
