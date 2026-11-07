# Track: keystroke speed (what was done about the 3.6 ms a typed character costs in the code editor)

Branch `keystroke-speed`, the `keystroke-profile` diagnosis branch rebased onto main `a7e91f5`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md`
and `README.md` are not edited here (the paragraph for the README is at the end). The diagnosis is [keystroke-profile.md](keystroke-profile.md); this is the work it ranked, and where it stopped.

Ben's bar: even 2 ms per keystroke is absurdly slow. On main (the spans view) a typed character cost 3.60 ms (press + release, median) and a caret move 1.63 ms, at the JSX attribute site
(`className="w-full h-full bg-slate-50 p-6 gap-3"`, line 99 of the Controls lab) and 3.98 ms at the function-body site.

## Result

Press + release of one key, median of 400 to 1,600 keystrokes per figure (4 alternating rounds of 400 for a typed character on Breaka's engine, 3 for the caret moves and for the stock typed
character, 2 for the stock caret move; the order of the two builds reversed each round), the Controls lab's code panel, native, Compatibility renderer, Apple M1 Max shared with other tracks
(load average 7 to 10 during these runs). The figures that are not marked stock are Breaka's engine.
"Before" is `a7e91f5` with the harness additions of this branch (`baseline` variant: the same editor and the same native library as main); "after" is `8a7a6aa` (`final`).

| | before, ms | after, ms | change |
| --- | ---: | ---: | ---: |
| typed character, JSX attribute site | 3.64 | **2.50** | -1.14 (-31 %) |
| Backspace, attribute site | 3.57 | 2.41 | -1.16 |
| typed character, function-body site | 3.92 | **2.46** | -1.46 (-37 %) |
| Backspace, function-body site | 3.85 | 2.35 | -1.50 |
| caret move (arrow keys), attribute site | 1.62 | **1.21** | -0.42 (-26 %) |
| caret move, function-body site | 1.67 | 1.24 | -0.43 |
| stock engine (4.7.2), typed character, attribute site | 3.42 | 2.43 | -0.99 |
| stock engine, Backspace | 3.35 | 2.33 | -1.02 |
| stock engine, caret move | 1.55 | 1.11 | -0.44 |

(An earlier run of the attribute site's table had one round that the machine disturbed, 3.83 and 2.86 for the two builds, and read 3.65 against 2.60; its other three rounds agree with the table.
Spread between rounds of the figures above: 0.03 to 0.1 ms. The two builds of every pair were measured in the same minutes.)

**The targets were not reached.** A typed character is 2.5 ms, not well under 1, and a caret move 1.2 ms, not under 0.5. What moved is what was ours and was wasted: 1.1 to 1.5 ms of every
typed character and 0.4 ms of every caret move. What is left, from a V8 CPU profile of the final build (800 keystrokes, 100 us sampling, which adds about 7 % to the 2.5 and 1.2 ms measured
without it; `artifacts/keystroke-speed/profile-final-*`), in milliseconds per key:

| | typed character | caret move | whose |
| --- | ---: | ---: | --- |
| CodeMirror: lezer's incremental parse | 0.46 | 0.00 | CodeMirror (cause 6) |
| CodeMirror: the transaction (state, history, commands, brackets) | 0.13 | 0.07 | CodeMirror |
| Godot routes the key (`Input.parseInputEvent` outside JS) | 0.22 | 0.17 | the engine |
| native commit: the edited line's paint (glyph read 0.27) | 0.43 | 0.07 | ours, limited by the server's API |
| native commit: mount (two paragraphs shaped, the size check, styles), validate, JSON, layout, geometry | 0.51 | 0.33 | ours |
| React: components, host props, reconciler | 0.45 | 0.38 | ours and React's |
| events: dispatch, `drainEvents`, `resolveEvent`, engine calls from JS | 0.20 | 0.18 | ours |
| editor data (lines, controller) | 0.15 | 0.05 | the demo's |
| the commit walk, freezing after the call | 0.07 | 0.06 | ours |
| the harness and the renderer profiler's clock | 0.05 | 0.04 | not the library's |
| **profile total** (measured without the profiler: 2.50 and 1.21) | **2.67** | **1.35** | |

The CodeMirror transaction and the engine's routing, 0.9 ms of a typed character, are not this library's, and nothing it does moves them; with them alone under the target a typed character
cannot be "well under 1 ms" on the key's own critical path. For a caret move the same two are 0.3 ms: the other 1.0 ms are a React render of the panel and the status bar, a commit of three
nodes and the event round trips, each of which was trimmed and each of which still costs what a Fabric-shaped renderer costs to do the smallest update. See causes 6 and 7.

## What was done, cause by cause

Each fix is its own commit with its numbers. The numbers are from `scripts/keystroke-ab.mjs` (below): the two builds of a pair are measured in the same minutes, in alternating rounds of 400
keystrokes (200 typed characters and 200 Backspaces) with the order reversed every round, press + release medians, so a pair's difference is the figure to read, not the absolute level of a run
(other tracks share the machine: load average 7 to 20; two identical builds read 3.63 and 3.61 against each other, 0.05 apart).

| # | commit | what | pair, typed + deleted, ms |
| --- | --- | --- | --- |
| 1 | `a2eb481` | text sizes remembered; a text whose size cannot have changed lays nothing out | 3.545 -> 3.429 (-0.12) |
| 2 | `c92ccb6`, `61c0c99`, `1f51744` | the shaped glyphs read once and kept (the colour-run plan built into the first, found unused and removed in the last) | 3.354 -> 2.861 (-0.49); the cheaper reads 2.545 -> 2.440 (-0.10) |
| 4 | `743f538` | an inline style compiled again only when its content changed | 2.925 -> 2.816 (-0.11) |
| 3 | `61ce711`, `8a7a6aa` | `EditorView` once per key; the blink state set only when it changes | 2.799 -> 2.601 (-0.20) |
| 5 | `144a6dc` | one walk of the tree for the window's colours; only the lines whose parts changed are built | 2.659 -> 2.561 (-0.10) |
| | `e50f096`, `7e5b39e`, `8ed54df`, `5f23c4b` | the A/B tool and its guards; `buildLine` removed | |

### 1. Native layout measured text that did not change (`a2eb481`)

The diagnosis saw 35 text measures for a one-character edit, 31 of them the status bar's, and could not say why unchanged texts were measured again (freezing the position text helped; a fixed
width did not). A trace of every measure with the node it was for (`scripts/keystroke-experiments/measure-trace.patch`, `KEYSTROKE_TRACE_MEASURE`) gives the answer:

* In a pass that replaces "Ln 99, Col 68" the *unchanged* file name text was asked 11 times and the one in the "No problems" button 10 times, the changed text 13. The questions are all different:
  `(known, available)` of `MaxContent`, `MinContent`, `Definite(41)`, `Definite(79)` crossed with the heights `MaxContent`, `MinContent`, `Definite(16)`, on both axes. They are the questions the
  ancestors that size by content ask in turn (the row asks for its minimum and maximum width and then the height at the width it settled on; the panel, the split and the lab ask the row in
  the same ways).
* Taffy keeps **nine** answers per node (`CACHE_SIZE` in `src/tree/cache.rs` of the pinned revision), replaced in the order they are made. A node asked eleven different questions per layout asks them
  in the same order every layout, so each answer is evicted before it is asked for again: every question misses, the cache never answers. A node that sits in a row that is laid out again is
  measured again in full, whether or not anything about it changed. The row is laid out again whenever any text in it is replaced, because `set_node_context` marks the node and every ancestor.
* So the measure of an unchanged text is wasted twice: it is one `TextParagraph` clone, `set_width` and `get_size` in the text server per question (about 5 us), and the layout above it runs
  again for a text whose size cannot have changed.

The fix is in two parts, both in `native/` and both a library fix (it helps every app with a status bar):

* `MeasuredText` (`native/text_measure.rs`) is the node context of a text: the shaped paragraph and the sizes it has given, by the width it was offered. Asked again, it answers from memory; the
  eleven questions are three or four different widths. It forgets, and says so, only if it is asked about 64 widths.
* `layout::replace_context` is how a text that is shaped again is put in the tree. A new text that gives, for every question the old one was asked, the answer the old one gave, cannot change any layout
  built from the old one, so it replaces it with `get_node_context_mut` and Taffy is not told: "Ln 99, Col 67" becoming "Ln 99, Col 68" dirties nothing and lays nothing out. A text that is a
  character wider still dirties its row, and its neighbours answer from memory. A text that forgot its questions cannot vouch for the layout and lays it out.
* `compute_tree` is generic over `LeafContext`, which is what lets the layout be tested without a Godot paragraph.

Tests (`native/layout.rs`, `native/text_measure.rs`): a tree of the status bar inside two content-sized rows reproduces the eleven questions and the nine places; a same-size text lays out nothing
(no ancestor dirty, no text asked by the layout); a wider text measures itself and its neighbours measure nothing though Taffy asks them again (`file.0 > 0` is asserted: that is the test of the
cause, not just the cure); a text that forgot lays out. Mutation controls, run: a leaf that never answers from memory fails 3 tests; a `replace_context` that always tells Taffy fails the same-size test.

Cost: the check measures the new text at the old one's questions, and it measures them on a paragraph that is new, so the first of them also pays for breaking its lines. Mount went 1.14 to 1.28 ms
where layout went 0.30 to 0.05 ms.

### 2. Spans paint (`c92ccb6`, `61c0c99`, `1f51744`)

Where the 1.0 ms of paint was: the line's glyphs are read from the text server three times per paint (the width of the line without its trailing white space, the check for a final hard
break, and the glyph loop), and each read makes a dictionary of ten fields for every glyph and costs a call into the engine for every field read from it. A timer in the measuring build, for the
85 glyphs of the attribute-site line: `shaped_text_get_glyphs` 120 us, parsing the dictionaries 300 us, drawing the glyphs 30 us. The draw is not the cost; the read is.

* `ShapedLine` / `ShapedParagraph` (`native/text_layout/paragraph.rs`): a paragraph at a width is read once, into plain structs (the eight fields drawing a glyph needs, one `get_or_nil` call each: `get`
  is two), and the facts of the layout (line widths with the hanging white space found from the end of the line, the hard break) come from the same read, so `TextLayout::new` and the draw both use it.
  The dictionaries are let go when the line has been read. `StyledParagraph` keeps the result, checks it against the paragraph's stamp (text length, line count, width, spacing) on each use and drops it
  with the paragraph: **it is invalidated exactly when the paragraph is shaped again**, which makes another `StyledParagraph` (`repaint_rich`, for a change of colours only, keeps the shaping and
  keeps the cache).
* A paragraph with nothing decorated no longer builds a `TextLayout` to draw; the line origins are `place_lines` over the facts (the function `TextLayout::new` calls). Decorations and backgrounds,
  which need the server's selection rectangles, still use the layout, now over the cached facts.
* Only the changed line repaints: the paint pass visits 8 to 11 nodes per key and re-records 2 contents (the edited line and the position text); the others cost 0 to 3 us each (traced). The pass is
  1.00 ms before, 0.43 after, of which the edited line is about 0.3: the 120 us call that builds the dictionaries, 60 us of parsing, 60 us of freeing them, the draw 30 us.
* **Colour runs, built and taken out.** The brief suggested one `shaped_text_draw` call per run of one colour, and the first commit has it: a clip from the pen where a stretch's first glyph starts to
  where its last ends, the very floats the server adds up (read in this engine's `servers/text/text_server.cpp`, whose `shaped_text_draw` is identical in the stock 4.7.2 source), so each glyph is drawn by
  exactly one stretch at the coordinates `font_draw_glyph` would give it. (The rich-text notes feared a ligature across a colour change would be lost; it is not, because the clip is at the pens of
  glyphs and not at character offsets.) Tests ran 400 random lines through the server's loop as read from the source. Then a trace of the plan on the editor's own line showed it refused every
  time: the code font's ligatures have glyphs with an advance of 0 (4 on that line), and a stretch cannot be clipped round a glyph that does not move the pen without drawing it twice. Even
  where it applies it replaces a 30 us loop. The plan, its tests and its constructor are removed in `1f51744`, whose message says so; the gain recorded for `c92ccb6` is the cache alone.
* A middle version (`61c0c99`) kept the dictionaries and read the fields of a glyph that the runs did not need later, 0.03 ms quicker; with the plan gone every coloured line is drawn glyph by glyph
  and would read the server a second time, and a window of coloured lines would hold about a megabyte of Godot dictionaries. Undone.

Tests: `native/text_layout/paragraph.rs` for the width of a line without its hanging white space and for a line cut by a trim or an ellipsis; the rich-text, text-styles and code-editor sections
(below) for the paint itself. Not tested natively: the cache's invalidation on a re-shaped paragraph needs the text server (the verifiers type, recolour and restyle text with it).

### 3. `EditorView` rendered twice (`61ce711`, `8a7a6aa`)

`HoverTracker.cancel()` told its owner to hide the tooltip on every key (`setTooltip(undefined)`), and the layout effect that measures off-grid carets set its state on every render. React cannot skip
a `setState` to the value a state holds when the fiber still carries lanes from the render before, so each rendered `EditorView` again and found nothing changed. The tracker now says "hide"
only when it showed something, and the effect compares with a ref that mirrors the state. `tests/code-panel.test.ts` counts commits of the panel with a `Profiler`: a typed character and a
Backspace are one (before the change: 2); precise coverage of the final build has `EditorView` at 1.0 renders and `dispatchSetState` at 1.0 a key (the diagnosis: 2.0 and 4.5).

The fix exposed a limit React has: its nested-update counter. React throws (error #185) at the 51st commit in a row that leaves a sync or default lane pending, and the verifiers' `pressKey`
sends a key's presses with no frame between, so nothing runs between the commits of a burst of 45 ArrowRight presses but the burst itself. `Carets`' effect, which restarts the blink on every key,
set its state to `true` each time; a state set to the value it holds still leaves a default lane pending (the same reason as above), the scheduler cannot run inside the burst, and the original
editor was saved only by the second render of every key, which rendered that update by the way. With the second render gone the code-editor sections of both native engines and of the Web failed
with #185. `8a7a6aa` sets the blink state only when it changes; `tests/code-panel.test.ts` sends 120 presses in one burst (passes on the original editor, throws "Maximum update depth exceeded" with
`61ce711` alone, passes with `8a7a6aa`). This is a latent limit of the editor's state flow, not of the engine, and no Web-only or native-only argument is involved: both failed alike.

### 4. 21 inline styles compiled every key (`743f538`)

The causal layer is the renderer: a render writes `style={{ left, top }}` as a new object every time, so the identity test in `nativeProps` was never true for an inline style. `sameStyleProp`
compares the style props by content (nested lists, nested data, key order ignored, `false`/`null`/`undefined` and lists of them being no style), and `compileStyle`, a function of the class string and
that alone, is called only when they differ. Any app with an inline style benefits.

### 5. 25 lines rebuilt and re-coloured per key (`144a6dc`)

`LineBuilder` reads each line's parts (text, colours, and the selection, problems, brackets and pieces that fall in it) and builds the lines whose parts differ from what they were last built from;
`HighlightCache.window` reads the colours of the whole window in one walk of the tree and cuts the spans at line ends. A line downstream of an edit whose colours changed has other spans and is built.
Not done, deliberately: mapping the untouched lines through the change without reading their colours. Whether a line's colours changed is decided by the tree, and a tree edit can change the colours of
any line below it (typing `/*` recolours everything to the end of the comment; a test types it). The read is what the 0.1 ms is, and it is exact. Tests: every window of lines of a source with
multi-line templates and comments, read in one walk, equals each line read alone; a keystroke builds one line, a caret move none, a selection the line it is in.

### 6. CodeMirror and lezer, 0.5 to 0.6 ms (not moved)

Where it is (V8 CPU profile of 800 keystrokes, 100 us sampling, attribute site, after the fixes above): lezer's incremental parse 0.476 ms and the rest of the CodeMirror transaction (state,
history, commands, brackets) 0.132 ms of 2.9 ms, 21 %. It is one call: `EditorState.update` runs `Language.state`'s field update, which calls `LanguageState.apply`, which calls
`ParseContext.work` with a 20 ms budget (`Work.Apply`) up to where the previous parse ended. Lezer reads and shifts about 300 tokens for one typed character (precise coverage per keystroke:
`readToken` 322, `shift` 295, `reduce` 402, `tryReuse` 675). Why it cannot reuse more of the old tree around an edit was not looked into any further than the diagnosis did. The library alone
is 0.25 ms in Chrome, 0.33 in this engine's V8 and 0.48 in the window (cold caches between keys).

What could leave the key's critical path, and what each costs. The brief's example (put the typed character in with the old highlighting carried over, re-highlight after the commit) needs three things:

* **The text must reach the view before the transaction does.** The view draws the controller's `EditorState`; the character is in it only after `EditorState.update` has run the parse. So the line
  would be drawn from a shadow of the edit (the old line's text and colour spans with the character spliced in and the spans after it shifted), and the real transaction would run after the commit.
  That is a second source of truth for the text of a line, with the selection, IME composition, multiple carets and the history all having to agree with it.
* **The parse itself cannot be told to wait.** `LanguageState.apply` is inside the transaction and takes no budget from the caller, and a parser wrapper that returned a provisional tree would
  hand CodeMirror a tree it reuses for the next parse (`TreeFragment.addTree`), which is wrong at the edit and stays wrong where reuse trusts it. The only exit is a second state without the
  language for the key and a catch-up of the real one afterwards, which is the same shadow again.
* **Any key that changes colours needs a second commit.** Typing `"`, `` ` ``, `/*`, `(` or `<` recolours the rest of the line and sometimes everything below it (a test types `/*`); the shadow
  can not know that, so the key would be followed by a second render and commit, 1 ms of React and native work that today is done once. For a letter typed inside an identifier, a string or a
  comment the colours do not change and the second step would find nothing: the user sees the character at once and the colours never move.

What the user would see: for most keys nothing different, the character one parse (about 0.5 ms) earlier; for a key that recolours, the new colours a frame or more after the character, where
today they come with it. The work is not removed, only moved after the key, so the frame that holds the key costs the same: the figure "press + release" would fall by the parse and the next
frame's idle step would grow by as much. I did not build it: it saves under 0.5 ms of a 2.4 ms key at the price of a second state that has to be right in every edit, and the key would still
cost 1.9 ms. The CodeMirror cost stays in the table as what it is.


### 7. The caret-move floor

A caret move that edits nothing was 1.62 ms and is 1.21 now. What was ours in the 1.62: the layout of the status bar (the position text changes on every move, and its row was measured
again: native layout 0.23 -> 0.05 ms, cause 1), the compile of the caret's and the input's inline styles (cause 4), and the extra render of the editor (cause 3, and the `Carets` blink state);
the native commit fell from 0.51 to 0.40 ms and the rest of the saving is React.

The 1.21 ms that is left, attributed (profile above, milliseconds): the native commit of three nodes 0.40 (parse 0.02, validate 0.03, mount 0.17, layout 0.05, geometry 0.05, paint 0.07);
React 0.38 (the panel renders: `CodeEditor`, `EditorView`, `StatusBar`, `Carets`, the two lines whose current-line background changes, the text input, each with the library's `View`/`Text`
wrappers: 37 function components and 38 host updates for a typed character, by precise coverage); Godot's routing of the key 0.17; events 0.18 (a blocking `keydown` round trip, `drainEvents` twice per dispatch, `resolveEvent`);
CodeMirror's selection transaction 0.07. What was left uncut and why:

* **Godot's routing** (0.17 to 0.22) is `Input.parseInputEvent` outside JS. `sample(1)` on the process shows the library's own `handle_input` outside the JS call at 3 % of its samples, so it
  is the engine's input plumbing and the harness's `_input`, and it has no symbols to look into.
* **React** could be cut by splitting the panel so a caret move renders only the carets and the status bar (the tab bar, the problems list and the lines that do not change are re-rendered or
  re-evaluated today), at an estimated 0.1 to 0.15 ms and a restructuring of `CodeEditor` and `EditorView`; not done.
* **The commit of three nodes** costs 0.17 ms in mount, which is the position text shaped again (two paragraphs), the new check that it measures as before (cause 1's cost), and Stylo's
  restyle of the nodes whose style props arrived. Not pursued: each is a few tens of microseconds.
* **Events**: `dispatchEvents` reads events until it reads none, so two `drainEvents` per dispatch and 3.6 dispatches a key; a count from native would save about 0.02 ms. Not done.

## What the fixes were measured with

* `scripts/keystroke-ab.mjs snapshot <name>` copies the demo as built (library, bundle, imports; an APFS clone, so it costs nothing until something changes) as a variant; `run <a> <b> ...` runs
  `scripts/profile-keystrokes.mjs --standalone --demo=<variant>` on each in turn, reversing the order every round, and prints medians, means, p95, the median per round and the median of the
  renderer's `events` sample, the native commit call, the native layout and the paint pass. `--move` presses arrow keys; `--site=function` types at the function body; `--engine=stock`.
  The runs are in `artifacts/keystroke-speed/runs/` (not committed: `artifacts/` is ignored).
* A run is one quiet window of the demo (Compatibility renderer, 1120x800, `--audio-driver Dummy`, no focus, no inspector client), 100 keystrokes of warm-up and then bursts of 8 typed characters
  and 8 Backspaces with a frame before each key, the live recompile awaited between bursts. Nothing generates real input; the keys are `Input.parseInputEvent` calls.
* `scripts/profile-keystrokes.mjs --sample=<seconds>` has macOS `sample` look at the Godot process; the engine has no symbols, so it shows the library and V8 only.

## What was run on the final tree (`8a7a6aa`; the commit after it is these notes)

| Command | Result |
| --- | --- |
| `pnpm test:types` | clean |
| `pnpm test` | 907 tests, 907 pass (the first run on the branch failed 2: the guard tests that list every script, now listing `keystroke-ab.mjs`) |
| `cargo fmt --check`, `cargo test`, `cargo clippy --all-targets -- -D warnings` | clean; 878 tests pass (876 on main, plus the layout, text-measure and paragraph tests) |
| `node scripts/verify.mjs --interaction --only=code-editor,rich-text,text-styles,layout-utilities,scroll,inputs,navigator,live-compile`, Breaka's engine | **PASSED**, landscape and portrait, 533 s. Checks (landscape): inputs 4118, scroll 2689, navigator 7774, layout-utilities 7323, text-styles 7798, rich-text 24967, live-compile 1541, code-editor 3546 (the portrait window is a phone width, which offers no Code button: 2 by design) |
| the same with `--engine=stock` | **PASSED**, landscape and portrait, 521 s. inputs 4118, scroll 2681, navigator 7774, layout-utilities 7663, text-styles 7798, rich-text 24967, live-compile 1541, code-editor 3546 |
| `pnpm build:web`, `node scripts/verify-interaction-web.mjs --only=code-editor,rich-text` | **PASSED**: rich-text 108 checks, code-editor 132, 261 assertions, 59 captures (headless Chrome, 113 s) |

The first native and Web runs of the branch's end state **failed** in the code-editor section with React error #185 (cause 3); that is how the `Carets` finding was made. Between that run and these, the
only change is `8a7a6aa`. The unit-test mutation controls and the A/B pairs are described with each cause.

## Decisions

* **Measure builds against each other in the same minutes** (`keystroke-ab.mjs`), and read the difference of a pair, not a figure from another day. The diagnosis's V8 profiles were used to find
  and to attribute; every fix was kept or dropped on its pair.
* **Cause 1 is fixed under Taffy, not in it.** The pinned Taffy keeps nine answers per node (a constant of its cache). A fork of a git dependency for one number would have left the cost of the
  Godot call in every miss; remembering the answers where they are made removes the call, and the equality check lets a replacement skip the layout altogether. The cost is the check (0.1 ms in
  mount when the text really is the same size) and a text's memory of at most 64 widths (about 1.5 KB; 3 to 10 in practice).
* **The colour-run plan was built, tested and taken out.** It was refused for every line of the editor (the code font's ligatures have glyphs with no advance) and the glyph loop it replaces costs
  30 us a line. The tests it had were exact and the plan was sound; there was nothing for it to speed up. Kept: the shaped-glyph cache, which is where the milliseconds were.
* **Dictionaries are not kept.** A `ShapedLine` holds 56 bytes a glyph (a window of 25 coloured lines is about 100 KB) and none of the server's dictionaries, which are 700 bytes a glyph.
  Keeping them was 0.03 ms quicker and would have held a megabyte for a screenful.
* **Line data is compared by its parts, not mapped through the change** (cause 5), because a tree edit can recolour lines far from it.
* **CodeMirror stays where it is** (cause 6): the only way off the critical path is a second, shadow state for the edited line.
* **A latent React limit was found and fixed, not worked around** (`8a7a6aa`): removing the second render of every key (cause 3) exposed that `Carets` left a default-lane update pending after each key, and
  React throws at the 51st commit in a row that does. The old second render rendered that update by the way. The verifiers' `pressKey` is the burst that shows it; a jest test of 120 keys is now the
  regression test.
* **The renderer, not the editor, compares inline styles** (cause 4): it is the layer that decides a compile is needed, and it helps any app.

## What was not verified, and what stays

* **Targets.** A typed character is not "well under 1 ms" and a caret move is not under 0.5 ms; see "Result" and the sections on causes 6 and 7 for where the rest goes and what would move it.
* Breaka's engine at both sites; the stock engine at the attribute site only; the Compatibility renderer only (the layout and JS changes do not depend on the renderer, the glyph cache issues the
  same canvas commands as before; Mobile and Forward+ were not run). The Web `code-editor` and `rich-text` passes ran (above); no keystroke timing was taken on the Web.
* Keys are injected one frame apart. A person types about 100 ms apart, which the diagnosis found 0.1 to 0.3 ms dearer (cold caches); not re-measured.
* The text-layout probe (`pnpm verify:text-layout`, `--features probe`) was not run. `GodotParagraph::lay_out` and its callers are unchanged; `facts()` has a new path behind it.
  `selection_input::lay_out` (caret, hit tests, selection rectangles) still reads glyphs without the cache: it is not on the typing path.
* `measure_endpoint` (the intrinsic-size transitions) still lays out a clone of the whole tree, and measures every text again in it, on a commit that changes an intrinsic target: unchanged, not a keystroke cost here.
* The machine is shared (load average 7 to 20); two identical builds differ by about 0.05 ms in a run, a pair by less. Absolute figures from another day may differ by 0.1 ms.
* The mutation controls (a leaf that never remembers, a replacement that always tells Taffy, a run that stops short, a missing pen guard) were run by hand, once each; they are not automated.
* Memory: `MeasuredText` at most 64 widths a text (24 bytes each); `ShapedParagraph` 56 bytes a glyph of a coloured or decorated paragraph that was painted, dropped with the paragraph.


## Reproducing it

```
pnpm build:native && node scripts/build.mjs                                          # the library and the demo bundle
node scripts/keystroke-ab.mjs snapshot <name>                                        # keep this build as a variant
node scripts/keystroke-ab.mjs run baseline <name> --rounds=4 [--site=function] [--move] [--engine=stock]
node scripts/profile-keystrokes.mjs --cpu=100 --demo=artifacts/keystroke-speed/variants/<name>/demo --out=<dir>   # a V8 CPU profile of a variant
node scripts/analyze-keystroke-profile.mjs <dir>
```

## README text

- **Keystroke speed.** A typed character in the code editor costs 2.5 ms (3.6 before) and a caret move 1.2 ms (1.6), on both engines (`docs/tracks/keystroke-speed.md`). The native library
  remembers what a text answered the layout and does not lay out again for a text whose size cannot have changed; it reads a coloured paragraph's glyphs once, not three times a paint; the
  renderer compares inline styles by content. `scripts/keystroke-ab.mjs` keeps a build as a variant and measures two of them in alternating rounds
  (`snapshot`, `run`); the notes say what is left of a keystroke (CodeMirror's parse 0.46 ms, Godot's routing 0.2 ms, React 0.45 ms) and why the target of under 1 ms is out of reach.
