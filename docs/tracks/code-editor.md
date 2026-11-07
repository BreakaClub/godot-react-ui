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

_DECISIONS BELOW_

## README text

_README_
