# What should the lab code editor be built from? Evaluation and design (2026-11-07)

Branch `code-editor-evaluation`, rebased on main `5956068`. An evaluation, a design and measurements; no library code changed.
The probes are under `experiments/code-editor/` (a package of their own; nothing is in the library's dependencies).

Ben's scope cut during the work: editors that need the DOM are ruled out without further trial, and the question became "is there a real
headless core where we provide the components, or do we build our own". Everything below is read in that light.

What was run, by whom:

| Mine, run in this session | Sub-agent probes (run by two agents; their scripts are committed, I did not re-run or review them line by line) |
| --- | --- |
| `experiments/code-editor/cm/probe-headless.mjs`, `probe-uiw.tsx`, `weights.mjs`; `harness/smoke.tsx`; the headless Godot bench `native/run.mjs` (Breaka's engine, `--headless --audio-driver Dummy`, no window) | `overlay/` (prism-react-renderer, react-live, the DOM shim, textarea overlays) and `frameworks/` (Monaco, Lexical, Slate, ProseMirror, shiki, Ace, virtualizers, React Native editors) |

## 1. Recommendation

**Build the editor ourselves around CodeMirror 6's headless model: `@codemirror/state` plus Lezer for the document, selection, undo,
transactions, mapping and the incremental TS/JSX parse; our own React view; `@tanstack/virtual-core` for the lines. Do not use any
CodeMirror view or any React editor library.** In three layers:

1. **Model (take CodeMirror's):** `@codemirror/state`, `@codemirror/language` + `@codemirror/lang-javascript` (Lezer TS/JSX), `@lezer/highlight`,
   `@codemirror/commands` (run against a 12-member `EditorView` stand-in that we write, about 100 lines in the experiment), `@codemirror/lint`
   (diagnostics as state that maps through edits). 413 KB minified, 141 KB gzipped for the whole headless route (section 3). We write about
   700 lines of glue instead of an estimated 2,800 lines of model plus 1,500 of tests (section 3.3).
2. **View (ours, in two steps):** first on today's primitives (a `View` of fixed-width `Text` runs per visible line, windowed), then on
   **native rich text spans** added to `Text` (one node per line; per-glyph colour, backgrounds and underlines over one shaped paragraph),
   which is where `StyledParagraph` (main, `native/text_paragraph.rs`) is the natural home. Today's primitives work but do not scale and cannot
   draw wavy underlines or exact columns (section 5).
3. **Input (ours, on the existing `TextInput`):** JS owns the text. A focused, always-empty, caret-positioned `TextInput` is only the input
   sink for keys, IME, the soft keyboard and paste; every `keydown` and `beforeinput` is answered by a CodeMirror transaction and prevented.
   A native `TextInput` that holds the file is the wrong owner: **486 ms per keystroke at the end of a 47 KB value, 249 ms to mount** (section 5).

Why not "build our own, all of it": the model is not the small part (section 3.3), CodeMirror's headless layers load and run in GodotJS
with no `document` (proved in the engine, section 3.1), and the seam is narrow enough to keep (the view code sees a model interface, not
CodeMirror types). Why not Lezer alone: Lezer is the parser, not the document; we would still write the text model, changes, mapping,
history, selection and about 40 commands. What would change this: a model written for us by a track with spare weeks, or a requirement
CodeMirror's state cannot meet (none found).

No existing React editor library fits: every one that edits needs the DOM (Ben's rule), and the ones that run unmodified are display-only
(`prism-react-renderer`), a playground half (`react-live`'s transform and evaluate), or virtualisation. Those are the honest React-compatibility
tests this evaluation produced (section 2, 9).

## 2. Candidates

| Candidate | Verdict | Evidence |
| --- | --- | --- |
| `@codemirror/state` 6.7.6, `@lezer/*`, `@codemirror/language`, `lang-javascript`, `commands`, `lint`, `autocomplete`, `search` (MIT, 14M to 25M weekly downloads, releases every few weeks) | **Use** (state, language, lezer, commands, lint). `autocomplete` and `search`: use their state pieces if needed (`CompletionContext`, `SearchCursor` both ran headless) | section 3 |
| `@codemirror/view` | Imports with no DOM (guarded `typeof document`, `navigator`); **never construct an `EditorView`** | section 3.1 |
| `@uiw/react-codemirror` | Imports; shipped wrapper throws `Unsupported utility class "cm-theme-light"` (our class compiler); its hook calls `document.createElement`. **Ruled out** | `cm/probe-uiw.tsx`, ran |
| `react-simple-code-editor`, `@uiw/react-textarea-code-editor`, Monaco (+ `@monaco-editor/react`), `react-live` editor half, `use-editable`, Slate (`slate-react`), ProseMirror `prosemirror-view`, Lexical's React plugins, `react-ace`/Ace renderer, a generic DOM shim | **Needs the DOM: ruled out** (Ben) | one line each, not pursued |
| Headless cores of the same families: Monaco's model (176 deep-import files, hand-built services), ProseMirror state + `DecorationSet`, Lexical headless, Slate core, Ace `EditSession` | Work headless, none is a supported entry point or fits code as CodeMirror's state does; not chosen | sub-agent probes |
| `prism-react-renderer`, `react-syntax-highlighter` (custom `renderer`) | Run **unmodified** through our renderer as a `View` of `Text` runs: 40 lines became 406 nodes in one 35.6 KB commit. Display-only; a viewer fallback, not the editor | sub-agent probe |
| `react-live` transform half | Lab TSX through sucrase and evaluate rendered, 2.4 to 12.3 ms each, 6 of the repo's labs. Relevant to `live-compile`, not to the editor | sub-agent probe |
| `@tanstack/virtual-core` 3.19 | **Use.** A 150-line adapter (`frameworks/virtual/godot-virtual.ts`) windows a `ScrollView`; measured in the engine (section 5). `@tanstack/react-virtual` works if `react-dom` resolves to a stub exporting `flushSync` | probes, bench |
| RN `VirtualizedList`, `react-window`, `react-virtuoso`, `@legendapp/list`, FlashList | VirtualizedList runs through a `react-native` alias with a larger window and more commits; the rest are DOM or native-module bound. Not chosen | sub-agent probe |
| Tokenisers: shiki (72 ms warm per 1,000 lines, JS regex engine), Prism (about 11 ms), `web-tree-sitter` | Not chosen: none is incremental; **`WebAssembly` is undefined in GodotJS native** (measured), which rules out tree-sitter there | bench `environment` line |
| Build everything ourselves | Not recommended (section 3.3) | |

## 3. The headless core, on evidence

### 3.1 It loads and runs in GodotJS

A headless engine run (`node experiments/code-editor/native/run.mjs`, Breaka's Godot48, `--headless`) bundles `@codemirror/state`,
`language`, `lang-javascript`, `@lezer/highlight` into the script with esbuild and ran them. The engine's JS environment, measured there:
`document`, `window`, `navigator`, `requestIdleCallback`, `requestAnimationFrame`, `queueMicrotask`, `TextEncoder`, `WebAssembly` and
`performance` are all **undefined**; `setTimeout` is a function. CodeMirror's packages only feature-detect these. Timings on the 1,048-line
TSX sample (`demo/src/filters-lab.tsx` + `src/kit/select.tsx`; load average 22, one trial each round, the first round is cold):

| | cold | warm (rounds 1 to 4) |
| --- | --- | --- |
| `EditorState.create` | 10.8 ms | 0.9 to 1.9 ms |
| full parse (`ensureSyntaxTree`), 9,752 nodes, 0 errors | 26.5 ms | 12.5 to 17.7 ms |
| highlight spans for the whole document / for 40 lines | 10.6 ms / 0.30 ms | 2.9 to 4.0 ms / 0.09 to 0.11 ms |
| a one-character `state.update` + `ensureSyntaxTree` | 0.43 + 2.3 ms | 0.03 to 0.1 + 0.6 to 0.8 ms |
| spans for the one changed line | 0.12 ms | 0.04 to 0.08 ms |

In Node (`cm/probe-headless.mjs`, same sample) the same things run, plus: undo/redo; multiple selections (`replaceSelection` keeps three
ranges); `Decoration.mark` / `widget` as plain `RangeSet`s that **map through edits** (an inlay widget moved with a 2-character insert);
a `StateField`'s decorations readable from `state.facet(EditorView.decorations)`; `@codemirror/lint` diagnostics held in state and mapped
through an edit (`[10,14]` became `[14,18]` after a 4-character insert at 0, which is what asynchronous results from `live-compile` need);
`CompletionContext` + `completeFromList`, and the language's own completion sources; `matchBrackets`, `foldable` (160 foldable lines),
`getIndentation`; `SearchCursor` over the file in 8.7 ms.

What bites, found by running it:

* **`syntaxTree(state)` is stale without a view.** It is the tree as of the last transaction; with no view there is no background parse step.
  A headless caller must use the tree `ensureSyntaxTree(state, doc.length, budget)` returns (the highlight of the whole sample went from 254
  spans to 6,665).
* **Commands.** About 40 `StateCommand`s (undo, redo, `insertNewlineAndIndent`, `indentMore`, `toggleComment`, `moveLineUp`, `copyLineDown`,
  `deleteCharBackward`, `selectLine`, `selectAll`, ...) run against a bare `{ state, dispatch }`. The rest (cursor movement, `deleteLine`,
  page moves, `addCursorBelow`, group deletion) call `view.moveByChar`, `moveByGroup`, `moveToLineBoundary`, `moveVertically`, `lineBlockAt`,
  `textDirectionAt`, `coordsAtPos`, `defaultLineHeight`, `scrollDOM`, `lineWrapping`, `dom`, `documentTop`. `cm/headless-view.mjs`
  implements those for a monospace, non-wrapping, left-to-right editor (about 100 lines); 11 of 12 commands I tried then ran (the twelfth, `selectLineEnd`,
  correctly did nothing at a line end). `dispatch` must accept a transaction or specs. Typing this needs one documented cast.
  Right-to-left text and wrapping are out of scope for the stand-in.
* A custom `Highlighter` (`{ style(tags) => string | null }`) can return a palette key directly; no CSS or `StyleModule` is needed.

### 3.2 Weight (`cm/weights.mjs`, esbuild, tree-shaken, minified; bytes)

| Layer | min | gzip |
| --- | --- | --- |
| state (document, changes, selection, transactions, RangeSet) | 48,455 | 16,204 |
| Lezer parser (javascript + highlight + common) | 131,546 | 48,387 |
| `language` + `lang-javascript` | 367,603 | 126,357 |
| `history` + state commands | 255,684 | 83,667 |
| lint state | 230,713 | 74,779 |
| autocomplete / search | 239,121 / 53,121 | 78,236 / 17,550 |
| **the whole headless route together** | **412,690** | **141,159** |
| reference: `@codemirror/view` alone | 201,328 | 65,451 |

The layers share code, so the parts do not add up to the whole. Part of the 413 KB is `@codemirror/view` code that `language` and `commands`
import; it is never run.

### 3.3 What building our own costs (estimate, not measured)

| Piece | CodeMirror gives | Ours, lines of TS (estimate) |
| --- | --- | --- |
| Text storage with line index and offset/line maps | `Text` (balanced tree) | 150 (array of lines; fine to 10^4 lines) |
| Changes: compose, map positions, invert | `ChangeSet` | 400 |
| Selections: several ranges, goal column, mapping, merging | `EditorSelection` | 200 |
| Transactions, extension composition | `EditorState`, facets | 150 to 250 |
| History: grouping, selection restore | `history()` | 250 |
| Ranges that map through edits (diagnostics, marks, widgets) | `RangeSet` | 200 |
| Commands: movement, deletion, indent, comment, line ops | `@codemirror/commands` | 900 |
| Brackets, folding, indentation from a syntax tree | `@codemirror/language` | 300 |
| Completion and lint state | `autocomplete`, `lint` | 200 |
| Parser and highlighter for TS/JSX | Lezer | not writable; tokenisers mis-colour templates, JSX text and regexes; Bun's tokens (`live-compile`) arrive a round trip late |
| **Total** | | **about 2,800 lines of model + tests about 1,500; CodeMirror route: about 700 lines of glue** |

Glue we write either way: the `EditorView` stand-in, the run builder and palette, a diagnostics bridge, a keymap table (`w3c-keyname`
is DOM-free but our `UIKeyboardEvent` already has `key`), the UTF-16 conversions at the native boundary. Own-model risk is in the parts nobody
sees until they break: undo across multiple cursors, mapping through simultaneous edits, goal columns, IME-adjacent edits. CodeMirror has years of
those fixed. The cost of CodeMirror is 413 KB minified in the bundle, a version coupling to its `Command` contract, and one cast.

## 4. Native text facts the design rests on (engine evidence)

All read in `/Users/ben/Development/godot` (Breaka's 4.8) and checked against the repo; nothing here needs an engine patch (stock 4.7.2 has the same
`TextServer` API, which `utilities-text` already calls).

* `TextParagraph::draw` takes **one colour** (`text_paragraph.cpp:841`, `shaped_text_draw(..., p_color, ...)` per line). `TextServer::shaped_text_draw`
  (`text_server.cpp:1750`) is a plain loop over `shaped_text_get_glyphs` calling `font_draw_glyph` with that colour (line 1821); its clip arguments skip
  whole glyphs by advance (1795 to 1818), they are not pixel clips.
* `RichTextLabel` colours per run by doing exactly that loop itself with a colour per item (`rich_text_label.cpp:1655`, `TS->font_draw_glyph(frid, ci,
  size, off, gl, font_color)`), and draws underline / strikethrough as `draw_line` and dotted as `draw_dashed_line` (`:1426-1490`). **The engine has no wavy
  underline.** `RichTextLabel` is a `Control`, a stated non-goal, but its method is the one to copy.
* Each glyph dictionary from `shaped_text_get_glyphs` carries `start`, `end` (source offsets), `advance`, `font_rid`, `font_size`, `index`, `flags`
  (`text_server.cpp:2314-2324`), so a glyph's run is a lookup by `start`.
* **`StyledParagraph` on main already owns this loop.** `native/text_paragraph/draw.rs` `draw_glyphs` re-implements `shaped_text_draw` with
  `font_draw_glyph_ex` (so a tracked font can draw with another font's glyphs) and takes one `LineDrawing.color`; `draw_decorations` fills rectangle
  bands for `underline | overline | line-through` in one colour per `TextDecoration`; `spec.rs` rejects `wavy` as a `textDecorationLine`
  (its test, line 381), and has no decoration style at all. `StyledParagraph::draw` falls back to `draw_lines` (per line, from a `TextLayout`) whenever it
  has decorations or tracking, so the per-line path already exists and is verified.
* `text_layout.rs` (main) has `hit_test`, `carets`, `selection_rects`, grapheme and word boundaries over a `TextParagraph`, in code points, with
  `text_offsets.rs` for UTF-16. The TextInput's IME preedit is spliced into a **display text** with its own offsets (`EditBuffer::display_text`,
  `preedit_range`), which is the precedent for inlays.
* A `TextInput` keystroke: `keydown` goes to JS, cancelable, and a prevented one is consumed (`keyboard_input.rs:111-118`); otherwise `beforeinput` goes to JS,
  cancelable, native waits, and a prevented command changes nothing (`text_input_godot/pipeline.rs:1-18`). The IME window is placed at the **focused
  input's caret** (`platform.rs:209`, `update_ime_position`). Copy writes the input's own selection to the clipboard; paste delivers the clipboard as
  `beforeinput.data`. There is no JS clipboard API in `src/`.
* Layout: text sizes pass through Taffy; run boxes of a `Text` row are whole-pixel. In the bench a row of 6 to 7 runs measured 8.53 to 8.65 px per
  character against a monospace advance that is one number; runs were contiguous (max gap 0). Cause not isolated (Taffy's layout rounding is the likely
  one); the consequence is that columns cannot be trusted across lines made of different runs. Setting every run's `width` to `chars * advance`
  works around it (phase 2).

## 5. Rendering options and the scale measurements

Measured by `native/run.mjs`: Breaka's Godot48, **`--headless`** (no window, so no draw cost, no GPU memory, no pixels), release native build from
`d282fee`, a 1,048-line TSX sample, a monospace system font, three trials per scenario. Load average 22 at the start and 20 at the end of the
reported run (an earlier run at load above 100 gave the same shapes at 1.3 to 5 times the cost, and is not used). Times are wall clock.

| Scenario (nodes) | JSON | Mount: JS flush | Mount: native (parse / validate / mount / layout / geometry) | One edit at line 1, 501, 1,048 | Memory |
| --- | --- | --- | --- | --- | --- |
| **A. every line a `View` of `Text` runs, all 1,048 lines** (10,427; 9,377 runs) | 1.44 MB | 377 to 430 ms | 363 to 406 ms (12 to 15 / 26 to 31 / 116 to 130 / 192 to 209 / 17 to 21) | commit 76 to 201 bytes; native 1.6 to 2.4 ms, of which layout 1.3 to 2.0 | Godot static +60 to 74 MB; RSS 199 to 490 MB |
| plain: one `Text` per line (1,050) | 176 KB | 50 to 52 ms | 48 to 51 ms | commit 74 bytes; native 0.9 to 1.5 ms | static +17 MB |
| **A, windowed** (`virtual-core`, 328 nodes, 38 lines + overscan 5) | 45 KB | 12.5 to 14.3 ms | 11.9 to 13.6 ms | edit of a visible line: 75 bytes, native 0.26 to 0.43 ms (one trial 12.5 ms in layout) | static +2.1 MB |
| windowed scroll by one line | 587 bytes, 5 commands | 0.46 to 0.52 ms | native 0.39 to 0.45 ms | | |
| windowed scroll by a page / to the end | 44.8 KB / 43.0 KB | 13.1 to 14.5 / 14.5 to 17.6 ms | native 12.4 to 13.7 / 13.8 to 16.6 ms | | |
| **C. the whole file in one `Text`** (3) | 49 KB | 94 to 110 ms | layout 85 to 97 ms | | static +12 MB |
| **C. the whole file in one multi-line `TextInput`** (1) | 49 KB | 249 ms | mount 199 ms of the 249 | **a typed character at the end: 486 ms** (5 keystrokes, JS event handling only 3.7 ms in total) | |

Reading it:

* **A, unwindowed, is out**: a 0.4 s synchronous commit on first mount and 10,000 nodes. **A, windowed, is fine for a first version**: a window mounts in 13 ms,
  a one-line scroll is 587 bytes and 0.4 ms of native work, an edit is under 0.5 ms of native work. Nodes per line (about 9) is the cost driver: the
  windowed page jump costs 12 to 14 ms of native time for 38 lines.
* **Virtualise even with one node per line.** 1,050 plain lines cost 50 ms to mount and 17 MB. From the 48 microseconds per node implied by that,
  a window of 40 lines with a gutter node each should mount in about 4 ms (an estimate, not measured).
* **Native-owned text (`TextInput` holding the file) is ruled out**: 486 ms per keystroke at the far end, because native re-shapes the whole value (one
  `Text` of the same document takes 85 to 97 ms to lay out). It also owns undo as 100 whole-text snapshots and sends the whole value in every `input` event.
* **Keystroke budget, what ran per keystroke** (the numbers above): CodeMirror update + tree + one-line highlight 0.7 to 1 ms warm in the engine; one
  changed line is a 75 to 201 byte commit and 0.3 to 2.4 ms native. The bench's `latencyToCommitEndMs` (6 to 28 ms) is dominated by React's scheduler
  (a timer-triggered update waits for the next turn); a native event's updates are discrete priority and flush synchronously
  (`renderer.ts`, `DiscreteEventPriority`), which I did not measure end to end.
* The idle cost is zero: no native `frame` samples while nothing animates.

### Options compared

| | A. `View` of `Text` runs (today) | B. native spans on `Text` (one node per line) | C. native `TextInput` with decorations |
| --- | --- | --- | --- |
| Nodes / JSON per visible line | about 9 / 1.2 KB | 1 to 2 / about 0.2 KB (text + `[start, end, style]` triples) | n/a |
| Per-run colour | yes | yes (per glyph in `draw_glyphs`) | needs the same native work |
| Backgrounds across runs, selection, bracket match | split runs at range edges in JS | span property, rects from `selection_rects` | same |
| Underline, wavy underline | no (no run style) / no | solid, dotted, dashed, double, wavy as span decoration | same |
| Inlays | extra sibling `Text` (offsets skip it for free) | generated spans (display text with an offset map) | same |
| Columns exact | only with explicit run widths | yes, one shaped paragraph | yes |
| Who owns the text | JS (CodeMirror) | JS | native: ruled out above |
| Keystroke | JS model + one line commit | same, one node | whole-value shaping per key |
| IME / soft keyboard / paste | input sink | input sink | native, but one style and 486 ms |
| Selection, drag, double click | JS from pointer events + hit test | same, hit test from native geometry | native, one style |

## 6. The design

### 6.1 Ownership and the keystroke path

JS owns the document (`EditorState`). Native owns glyphs, the IME and the clipboard plumbing.

```
native key -> keydown (JS, cancelable)
              editor keymap -> CodeMirror command -> transaction -> preventDefault          (arrows, Enter, Tab, undo, delete, ...)
           -> otherwise beforeinput {inputType, data} (JS, cancelable)
              insertText / insertFromPaste / deleteContentBackward ... -> transaction -> preventDefault
transaction -> model update (about 1 ms) -> React: the changed line's props -> one commit (about 75 to 200 bytes today)
```

* **The input sink** is a one-pixel, transparent `TextInput` that always has focus, `absolute` at the caret's rectangle (so the OS IME window and the soft
  keyboard follow the caret, `platform.rs:209`), whose buffer is always empty because every `keydown` and `beforeinput` is prevented. Its own undo
  never fills.
* **IME:** composition events deliver the preedit; the editor shows it at the caret as display text with a converting underline (the same
  display-splice the TextInput uses), and the commit arrives as an `insertText`/`insertCompositionText` `beforeinput`. Native IME by hand is recorded as not verified in the plan's limits, so phase 3 says so.
* **Copy and cut:** on `keydown` of the copy chord, call `setTextAndSelection(count, selectedText, 0, length)` on the sink and let the key through: native copies
  the sink's selection. Cut then deletes in the model. **Paste** arrives as `beforeinput.data`. No new API is needed; a JS clipboard API would be cleaner (section 6.2).
* **Undo/redo:** CodeMirror's `history()`; the keymap prevents native undo.
* **Pointer:** pointer events on the line rows; offset from `x` by the monospace grid at first, from a native hit test later (section 6.2). Drag selection and
  autoscroll in JS on pointer moves; double click is `state.wordAt`, triple click a line. Selection ranges become per-line background spans.
* **Caret:** an absolutely positioned `View` per range. Blink: a JS timer toggling opacity twice a second only while focused, until the library has a native
  animation (not "per frame", but still JS; flagged in section 6.2).
* **Diagnostics** from `live-compile` arrive asynchronously with UTF-16 offsets for a document version; map them with the changes since
  (`ChangeSet.mapPos`; `setDiagnostics` does it) before drawing. They become underline spans.
* **Gutter** (line numbers, current-line highlight, fold and diagnostic markers), **indent guides**, **hover tooltips** and the **completion popup** are React:
  a row is `[gutter Text][line]`; the popups use `Portal` + `placePopover` (main) anchored to the caret or token rectangle; a `Combobox`-style list
  for completions. Guides are one cell-wide `View` per indent level now, a repeating gradient background later.
* **Fonts:** `font-mono` and `registerFontFace` from `utilities-text`; main has JetBrains Mono (OFL) in `demo/fonts`. The Web has no system fonts, so the
  editor must register a face. Tabs: the model's tab size, shown as the display-text expansion (the same mechanism as inlays), not `tab_align`.

### 6.2 What the view needs from native (all through `StyledParagraph`)

Everything below hangs off the one change that Fabric already shows the way to: **React Native's nested `<Text>`** compiles to an attributed string on one shadow node.
Make `<Text>a<Text style=...>b</Text></Text>` a flat `spans` prop on the single `text` host node. That reverses the plan's non-goal "rich/nested text runs"; it is the
only change that the editor, rich messages, chat logs and syntax-coloured docs all need, so it is a library feature, not an editor special case.

| Primitive | Where | Engine evidence | General or editor-only |
| --- | --- | --- | --- |
| **Spans on `Text`**: `{ start, end, color?, backgroundColor?, fontWeight?, fontStyle?, decoration? }` in UTF-16, validated, non-overlapping and sorted | `props.rs` (typed, `deny_unknown_fields`), `text_style/spec.rs`; protocol in `native/PROTOCOL.md`; JS: nested `Text` -> spans in `nativeProps` | RichTextLabel's item stack (`rich_text_label.cpp:1655`) | **general** |
| **Per-glyph colour**: `LineDrawing.color` becomes a lookup by `glyph.start` | `text_paragraph/draw.rs` `draw_glyphs` | `shaped_text_draw` loop (`text_server.cpp:1780-1830`); glyph `start`/`end` | general |
| **Different font per span** (bold, italic): one `add_string` per font-changing span | `StyledParagraph::build` | `TextParagraph` takes several spans in one shaping | general; the editor can start with colour only |
| **Background per span**: rectangles from `layout.selection_rects(start, end)` drawn under the glyphs | `draw_lines` | `text_layout.rs` `selection_rects` (verified, 619 checks) | general |
| **Decoration styles per span**: solid, dotted, dashed, double and **wavy**; colour, thickness, offset per span | `draw_decorations` (today whole paragraph, solid bands) | none in the engine: draw with `canvas_item_add_polyline` or rects. Chrome is the reference (`text-decoration: underline wavy red`), compared per channel at DPR 1 and 2 (`scripts/glass-reference.mjs`); wave amplitude and wavelength are read from Chrome's output, not guessed | general (CSS) |
| **Generated spans** (inlays): text shown, drawn and measured but not in the source offsets | `StyledParagraph` shapes the display text; a display <-> source offset map beside `text_offsets.rs` | the TextInput's `display_text()` and `preedit_range()` | small, general (`::before`/`::after` content) |
| **Geometry to JS**: `getCaretRect(offset)`, `getOffsetAtPoint(x, y)`, `getRangeRects(start, end)` on a text handle | new handle methods over `text_layout.rs` | `hit_test`, `carets`, `selection_rects`, already verified | **general** (`Range.getClientRects`, `caretPositionFromPoint`) |
| Layout resize notification (`onLayout`) | events | `settle_scroll` queues a scroll event only when the offset moved | general (virtualisers need it) |
| Caret blink without JS (an animation primitive) | motion | | general |
| A JS clipboard API | `src/` + `clipboard.rs` | `ClipboardEffect` exists in `text_input.rs` | general; optional |

Not native and not needed: gutter, line numbers, current line, indent guides, bracket match (span background), folding, multiple cursors, popups.

## 7. The lab page

The registry (`demo/src/labs.tsx`) gives each lab `sources: ['res://src/...tsx']`, and the shell (`demo/src/navigator.tsx`) is `lg:flex-row` with a sidebar from 1024 px
and a stage that is `absolute inset-0` inside the content column. Add a **Code** button to the header (no new route). The stage becomes a flex container:

* below `xl` (1280 px): `flex-col`, the lab on top with `min-h-[40%]`, the code panel under it at `h-[45%]`, a draggable divider later;
* `xl` and wider: `xl:flex-row`, lab `min-w-0 flex-1`, code panel `xl:w-[44%] 2xl:w-[40%]` with the sidebar collapsing to its icon column when the panel is open;
* the panel is a `View` with a tab per `sources` entry, its own `ScrollView` (vertical via the virtualiser, horizontal for long lines), a diagnostics strip, and a
  "Run" state fed by `live-compile` (edited code replaces the lab component behind the existing per-lab error boundary).

Breakpoints are native classes, so the switch costs no JS. Multi-file labs show tabs; the editor mounts only the active file.

## 8. Build plan

Each phase ends with what it proves and its tests. The first four need no native change except where stated.

| # | Phase | Proves | Tests |
| --- | --- | --- | --- |
| 1 | **Model package** (TS only): `EditorModel` over CodeMirror state; run builder + palette; the `EditorView` stand-in; diagnostics mapping; keymap table; UTF-16 helpers | the model is correct with no rendering, in Node and in GodotJS | Node tests: typing, undo, multi-cursor, indent, comment, move line; every cursor command against the stand-in; highlight spans equal Lezer's; diagnostics mapped across edits; surrogate pairs; a 1,000-line file parses; an in-engine headless check that the bundle loads with no `document` (the bench's `environment` line) |
| 2 | **Read-only viewer on today's primitives**: `virtual-core`, mono font, gutter, fixed-width runs (`width = chars * advance`), horizontal scroll, `Code` panel in the shell | virtualisation, exact columns, window mount under 15 ms | lab + verifier section: geometry assertions (each run at `column * advance`, rows at `index * 20`), commit-size and node-count budgets, a captured raster at DPR 1 and 2, resize while mounted (the stale-window friction) |
| 3 | **Editing**: the input sink, keydown/beforeinput, clipboard by selection mirror, caret and selection layers, pointer selection, double/triple click, IME display, soft keyboard | JS-owned text works end to end | synthetic-input verifier (`demo/src/verifier-input.ts`): typing, Enter auto-indent, Tab, undo, multi-cursor, paste, cut, drag select, composition events; a negative control that fails if the sink's buffer ever holds text; IME by hand listed as unverified until done |
| 4 | **Native spans** (general): nested `Text` -> `spans`; colour per glyph; backgrounds; font per span | one node per line, no per-run nodes | Rust unit tests on span validation and the draw plan (a fake glyph list); probe cases beside `text_layout_probe` (ligatures, combining marks, emoji, bidi inside spans); numbers against Chrome inline `<span>`s per channel at DPR 1 and 2; the editor switches over and the phase-2 tests still pass with node counts cut ~9x |
| 5 | **Decorations and generated spans**: underline styles incl. wavy, inlays with the offset map | diagnostics and inlay hints draw like the browser | Chrome compare for `text-decoration` styles; offset-map tests (click, caret and selection around an inlay); fault test: a wrong map fails the check |
| 6 | **Geometry queries** to JS | tabs, wide characters and inlays hit-test correctly | text-layout probe reused through the new handle methods; pointer verifier on a mixed-width line |
| 7 | **`live-compile` integration**: diagnostics, hover, completion, inlay hints, run edited lab | the whole loop | popup placement tests with `placePopover`; stale-result rejection by document version; an edit during a pending request |
| 8 | **Hardening**: keystroke budget verifier, memory, Web verify, accessibility (`role="textbox"`, `aria-multiline`, line text), a 5,000-line file | "never hitches" with numbers | budget asserts: commit bytes per keystroke, native ms per keystroke, window mount; Web run; AX tree check |

General library features (useful to every user): phases 4, 5 and 6, `onLayout`, a native animation, a clipboard API. Editor-only: phases 1, 2, 3 and 7.

## 9. React-level findings and limits found on the way

Reproductions are scripts in the experiments; the first four were run by sub-agents, the others by me.

1. **A controlled `TextInput` loses the selection after an imperative edit.** `setTextAndSelection(0, '  hello', 2, 7)` then a `setValue` leaves the caret at the
   end; `src/text-input.tsx:61-83` compares with `native.current`, which only its own commands and `input` events update. `overlay/textinput-imperative-vs-controlled.tsx`.
2. **Style keys are not validated in JS.** `{ whiteSpace, fontStyle, padding: '1em' }` compiles and mounts without error while native's `StyleSpec` is `deny_unknown_fields`.
   `overlay/style-passthrough.tsx`. A bad class throws at once; a bad style key would only fail in native.
3. **An unknown host element (`div`) passes `createInstance`** and fails only when the payload is parsed. `overlay/unknown-host-type.tsx`.
4. **Misleading error:** `<Text>{<Text/>}{'b'}</Text>` says "Text strings must be rendered within a <Text>". `frameworks/lib/probe-dom-element.tsx`.
5. **No resize notification:** a scroll container that changes size fires nothing, so a virtualiser keeps a stale window until the next scroll (`settle_scroll` queues an event only when
   the offset moved). `frameworks/virtual/probe-virtual-core.tsx`, "container grew".
6. **GodotJS native has no `performance`, `queueMicrotask`, `requestAnimationFrame`, `WebAssembly`, `TextEncoder`** (bench `environment`). Libraries that assume them need shims (the virtualiser adapter shims
   `requestAnimationFrame` with `setTimeout`).
7. **Programmatic scrolls need `dispatchEvents()` every frame.** My first bench scrolled and nothing re-rendered until the owner called it from `_process`, as `UIRoot.dispatchEvents`
   documents. Not a bug; a trap for a library that scrolls for the user.
8. `UIKeyboardEvent` has no `keyCode`; `TextInputHandle.value`/`selectionStart` are read-only and there is no `setRangeText`; `scrollTo` ignores `behavior`.
9. Class components, refs, `memo`, effects, context providers and a persistent-mode reconciler ran `VirtualizedList`, `LexicalComposer` and `react-live` with no React-level bug.

## 10. Not verified, and limits

* No pixel, draw or GPU numbers: the bench ran `--headless`. The scale prototype needs a window run for draw cost and VRAM; none was needed to decide.
* Times are wall clock on a shared machine (load 20 to 100+); trials are shown as ranges. The unwindowed 10k-node numbers are the least certain.
* The sub-agents' probes (overlay and frameworks) were run by them; I did not re-run or read them closely beyond what the table cites.
* The `EditorView` stand-in was exercised for 12 commands, left-to-right only, no wrapping, no bidi.
* IME by hand, the soft keyboard, the Web build (where `document` may exist and CodeMirror takes its DOM-guard branches, harmlessly), Windows and Linux were not tried.
* The native spans, wavy underline and geometry queries are designs; nothing native was changed or measured for them. Their cost is an estimate from per-node numbers.
* Lezer's TS/JSX grammar parsed the sample with 0 error nodes; type-aware colouring (semantic tokens) is `live-compile`'s to add on top, asynchronously.
* The CodeMirror line counts in section 3.3 are my estimate of the equivalent code, not a measurement.

## README text

> **Code editor (planned).** The lab code panel will be built on CodeMirror 6's headless model (`@codemirror/state`, Lezer) with the library's own view: JS owns the text, a
> hidden `TextInput` is the input sink, lines are windowed with `@tanstack/virtual-core`, and `Text` gains attributed spans (per-glyph colour, backgrounds, wavy underlines) so a
> line is one node. No DOM editor can run here; `docs/tracks/code-editor-evaluation.md` has the evidence, the measurements and the build plan.
