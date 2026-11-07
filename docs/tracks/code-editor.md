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

In a real Breaka window (`node scripts/verify.mjs --interaction --only=code-editor`, injected input only): _RESULTS BELOW_

## Layout of the code

```
demo/src/editor/               hidden from Godot by .gdignore: no script resources, no .uid, no entry points; bundled into its importers
  model.ts                     EditorModel: a CodeMirror EditorState, a document version, the changes that made each version
  command-target.ts            the part of EditorView that CodeMirror's commands use, for a monospace editor with no DOM
  commands.ts                  typed and pasted text, Copy and Cut through a port, Tab, "select next occurrence"
  keymap.ts                    CodeMirror's defaultKeymap + historyKeymap matched against a UIKeyboardEvent, per platform
  controller.ts                EditorController: the keys, beforeinput, composition and pointer of one file; line specs for the view
  annotations.ts diagnostics.ts   results of the type checker mapped through the edits made since their text
  highlight.ts lines.ts line-layout.ts   Lezer colours cached per line; a line as segments; the offset <-> column map with inlays and a preedit
  workspace.ts                 EditorWorkspace: the files of a lab, the debounced update of the live session, the check, hints and hover
  lab-code.ts                  openLabCode: a live session + workspace, or the read-only fallback with the reason
  geometry.ts pointer-selection.ts    columns, lines, windows; click, drag, word and line selection
  view/                        the React part: editor-view, run-line (the seam for native spans), gutter, carets, hover tooltip, problems, status bar
demo/src/code-editor.tsx       the panel (tabs, Reset, the view, problems, status)
demo/src/navigator.tsx         the Code button, useLabCode, the stage that keeps its place in the tree
demo/src/live-compile-session.ts   LiveSession.Lab (embedded mode)       src/renderer.ts   UIRoot.flushSync
demo/src/verify-code-editor.ts   scripts/verify-code-editor-web.mjs      tests/editor-*.test.ts tests/code-panel.test.ts
```

## Decisions

**C1. The text is CodeMirror's, the view and the input are ours** (the evaluation's design, built as written). `EditorModel` is an `EditorState` (TypeScript and
JSX through Lezer, history, several selections, `indentOnInput`) with no `EditorView`; `EditorController` answers a `keydown`, a `beforeinput`, a composition
and the pointer with transactions. The input is an empty `multiline` `TextInput`, one column wide, at the caret; every `beforeinput` is prevented, so its own
buffer never holds text (a test asserts it, and the Web touch scenario types through the soft keyboard into it).

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

**C6. A run is placed at its column and is as wide as its glyphs are painted.** `GridProbe` lays out an invisible line of 400 characters in the editor's font; the advance is its width over
400 and the line height its height. Three things the first captures of the section showed, each with the number:
(1) at 12 px layout gives a character 7.205 px but the glyphs are painted 7.25 apart (the demo's fonts place glyphs at quarter pixels, `demo-fonts.ts`), so the advance is rounded to
`GLYPH_POSITION_STEP_PX` (0.25, `editor/font-grid.ts`) and is 7.25, the grid of the paint; (2) layout makes every `Text` box a whole number of pixels, rounding down as often as up, and a box
narrower than its glyphs makes the paragraph skip the last glyph (the capture read "impor", "InputsStat", "numbe", and a one-column run, `{`, vanished): a run's width is `ceil(chars * advance)`;
(3) in a row those roundings add up (a run 18 columns in stood 1.3 px off its column), so each run is absolute at `left = column * advance` and a selection or inlay background is a box of its own
under the text, exactly the columns it covers. A 12.5 px font would have made (1) and (2) go away (7.5 px) but native font sizes are integers (`font_size: Option<i32>`). All of this is a
workaround for a line that is many `Text` runs; one native paragraph (rich-text spans, `getCaretRect`) has no such seam.

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

**C17. Wavy underlines wait for `rich-text`.** The view draws a solid underline on the run (`textDecorationLine`), which the library has. `LineSpec`'s segments already say `wavy`; `RunLine` is the one
file that changes when a line becomes one `Text` with spans. `rich-text` had not landed (no commits, no notes) when this was written, so nothing here uses spans, `getCaretRect`,
`getOffsetAtPoint` or `getRangeRects`. Characters wider than a column or made of several code units (CJK, emoji, combining marks) are laid out on the one-column grid until it does.


## README text

_README_
