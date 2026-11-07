# Track: keystroke profile (why a keystroke in the code editor costs 2.7 ms of JS)

Branch `keystroke-profile`, begun on main `9dba853`, measured on `91c4502` (the code editor as one row of `Text` runs per line, "runs view") and on
`894c97d` (the editor moved onto rich-text spans, "spans view"); it sits on `894c97d`. Main has moved on since (the single native build, `6885cd8`, changes the native library); neither view was measured on that. Diagnosis only: the editor, the renderer and the native library are as they are on main. Notes and
report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the paragraph for the README is at the end).

Ben's question: one keystroke in the code editor costs about 2.7 ms of JS (the renderer profiler's `events` sample, `src/renderer.ts` `dispatchEvents`); even 2 ms is absurdly slow;
what is it spending it on? Already ruled out before this track: V8 is not jitless on macOS, `/Applications/Godot48.app` is not a dev build, the demo's React is the production build.

## The answer

A keystroke does not cost 2.7 ms because of one slow thing. It goes through five layers, and each does more than one typed character needs. Press and release of one typed character, median of 4,800 keystrokes per view,
the two views alternated in the same minutes (load average 8), on the same native library, Breaka's engine, the Controls lab's `className` line:

| | runs view (`91c4502`) | spans view (`894c97d`) |
| --- | ---: | ---: |
| press + release, median / mean / p95 | **2.76** / 2.82 / 3.42 ms | **3.60** / 3.66 / 4.28 ms |
| the renderer's `events` sample (what Ben measured) | 2.52 | 3.36 |
| of which the native `commit` call | 0.78 | 1.62 |
| a key that moves the caret and changes no text (arrow) | 1.66 | 1.63 |

(Ben's 2.67 ms is this `events` sample. Here it reads 2.4 to 2.6 ms for the runs view depending on the minute: the spread between minutes on this machine is 0.1 to 0.15 ms, and runs at load 20 and over came out 0.1 to 0.25 above.)

Where the runs view's 2.8 ms goes, from a V8 CPU profile of 1,600 keystrokes scaled to the unprofiled time (the full table is below), most expensive first:

1. **The native commit, 0.8 ms (29 %).** Five commands. Taffy lays out for 0.30 ms, 0.21 of it measuring text 35 times, and 31 of those 35 fit the status bar's texts, measured again because its "Ln 99, Col 67" changed; the paint
   pass records 10 nodes for 5 changed ones (0.15); shaping, the part one expects, is 0.05.
2. **CodeMirror and lezer, 0.55 ms (20 %).** The transaction with its parse takes 0.48 ms in the window, 0.33 in this engine's V8 in a loop, and 0.25 in Chrome: the library alone costs a quarter of a millisecond in a browser.
3. **React, 0.7 ms (24 %).** The editor renders twice for one key (the second only because of `setState`s to the value already held), 38 host components are given props again for 5 changed nodes, and 21 inline `style`
   objects are compiled again every key.
4. **The editor's own data, 0.3 ms (11 %).** All 25 lines of the window are rebuilt and re-coloured for every key; one changed.
5. **Event plumbing and the engine's key routing, 0.4 ms (15 %).** Two blocking native-to-JS round trips, 3.6 `dispatchEvents`, 6 `drainEvents`, and 0.22 ms inside `Input.parseInputEvent` outside JS.

What it is not: the GodotJS bridge (a JS call into the engine takes 0.1 µs, measured in a loop, and the library makes about 15 per keystroke: 6 `drainEvents`, 2.5 `resolveEvent`, 2 root-size reads, the commit, the deletions, a scroll state, a node rectangle), JSON (0.01 ms), garbage collection (0.04 ms, between keys), or the profilers (under 0.1 ms).
A caret move that edits nothing costs 1.66 ms, so about 1.1 ms of the 2.8 is specific to editing text and 1.66 is the pipeline's floor for any key.

The spans view adds **0.84 ms, all of it native, all of it paint**: a line whose glyphs have colours of their own is drawn glyph by glyph from a layout read out of the text server (0.56 ms for the layout, 0.35 for the 97 glyphs;
the whole paint pass 1.02 ms against 0.15), where the runs view had `TextParagraph.draw` draw each run in one call. The JS it adds is below 0.1 ms. Details and the fixes, with the ones that were timed, below.

## What was measured, and how

- **Engine and build.** Breaka's `/Applications/Godot48.app` (Godot 4.8 with GodotJS on V8), the demo in a real quiet window (`scripts/quiet-window.mjs`, 1120x800, Compatibility renderer, `--audio-driver Dummy`), the release build of the native library (`pnpm build:native`; from the overhead matrix on, its measuring build, which is 0.5 % slower), Apple M1 Max. `OS.isDebugBuild()` is true in this binary (it is an editor-target build) and
  the JS is the production React build (`process.env.NODE_ENV` is "production" in the demo bundle).
- **The keystroke.** `demo/src/profile-keystrokes.ts` opens the Controls lab (`inputs`), opens the code panel (a click on the Code button), puts the
  caret in the source with the same key events the code-editor verifier uses (`Input.parseInputEvent` with a keycode and a unicode, marked as the verifier's
  by `parseVerifierEvent`), and types in bursts: 8 characters, then 8 Backspaces, at the same place, so the line keeps its length and the source returns
  to what it was. One frame passes before every key, as in typing. A burst is shorter than the workspace's 600 ms longest wait, so the live recompile
  (150 ms after the last key) runs after the burst and never inside it; the driver waits for it and for the type check between bursts. Two places:
  `attribute` (inside the string of `className="w-full h-full bg-slate-50 p-6 gap-3"`, line 99 of the 164-line lab) and `function` (before the `;`
  of `const sizes = reversed ? [...SIZES].reverse() : SIZES;` in the component's body, line 96). 200 keystrokes of warm-up, then 1,600 measured per
  configuration (100 bursts), or 400 where said.
- **Timers inside the process.** For every key press and release: the wall time of the `Input.parseInputEvent` call (everything the key causes happens inside
  it), the renderer profiler's `events` and `flush` samples (`src/profile.ts`), the native library's `batch` and `draw` samples and counters.
- **V8 CPU profile.** `scripts/profile-keystrokes.mjs` connects to GodotJS's inspector (on a free port, set through an `override.cfg` that the run removes: the
  default 9229 is shared by every GodotJS process on the machine, and another session's run held it when this one started) and uses `Runtime.evaluate`
  to call the driver, and the Profiler domain only (`Profiler.setSamplingInterval`, `start`, `stop`; `startPreciseCoverage` for call counts). One CPU
  profile per burst; the profile holds the keystrokes and the frames between them, not the set-up, the warm-up, the recompile or the type check.
- **Reading a CPU profile here.** Three things the profile does not tell you by itself.
  1. The sampler does not keep the interval it is asked for: 25 µs gives samples 42 or 83 µs apart, 100 µs about 125 to 250; and it stalls for milliseconds now and then. DevTools' convention
     (a sample lasts until the next) credits a stall to whatever stack came before it, so a sample is credited with at most 2.5 typical intervals
     (`MAX_SAMPLE_INTERVALS` in `scripts/analyze-keystroke-profile.mjs`). With that, the time the profile puts inside the key injection (2.99 ms for the runs
     view at 100 µs) agrees with the wall time measured around the same calls with the profiler attached (2.81 to 2.93 in the two rounds of the overhead matrix), which is 4 to 10 % over the unprofiled time.
  2. A native frame is named after whichever exported symbol is nearest to the sampled address, a different wrong name from sample to sample
     (`poll`, `removeLogger`, `getThemeColor`, `setClipboardText`, all in the same `Input.parseInputEvent` call). The analysis names a native frame after the JS function that called it.
  3. Phases are exclusive: each sample goes to the innermost frame that fits a phase (`PHASES` in the analysis script), so the phases add up to the time
     inside the key injection.
- **Cost of looking.** Same keystrokes, mean press + release, ms (two rounds, interleaved, load average 7 to 35 from other tracks): no inspector, renderer
  profiler off 2.71 / 2.63; inspector listening with no client 2.72 / 2.68; renderer profiler on 2.90 / 2.60; client attached with `Runtime.enable` 2.69 / 2.63; with
  `Profiler.enable` 2.69 / 2.61; CPU profiler running at 100 µs 2.93 / 2.81; at 25 µs 3.47 / 3.02. So the renderer's own profiler costs under 0.1 ms, an attached client nothing
  measurable, and the V8 sampler 0.2 ms at 100 µs and 0.4 to 0.8 ms at 25 µs. The phase table is shares of a 100 µs profile applied to the unprofiled time.

## Where the time goes, by phase

V8 CPU profiles at a 100 µs request (1,600 keystrokes per column, 100 bursts; the sampler keeps 125 to 250 µs), every sample in exactly one phase, the phases scaled so that they add up to the unprofiled mean press + release of
that view and site (the profile itself sums to 2.99 ms for the runs view's attribute site, 6 % over the 2.82 measured without it). Milliseconds per keystroke; typed characters and Backspaces together.

| Phase | runs, attribute site | spans, attribute site | runs, function site | spans, function site |
| --- | ---: | ---: | ---: | ---: |
| Native commit call (`host.commit`) | 0.81 | 1.57 | 0.78 | 1.97 |
| CodeMirror: lezer incremental parse | 0.43 | 0.43 | 0.38 | 0.38 |
| CodeMirror: state transaction, commands, brackets | 0.13 | 0.12 | 0.13 | 0.13 |
| Editor data: lines, colour spans, controller | 0.32 | 0.34 | 0.29 | 0.31 |
| React: host props (`nativeProps`, `compileStyle`) | 0.27 | 0.20 | 0.34 | 0.21 |
| React: components and render phase | 0.21 | 0.28 | 0.22 | 0.25 |
| React: reconciler scheduling, commit phase | 0.12 | 0.15 | 0.13 | 0.15 |
| Commit walk, JSON, after-call work | 0.07 | 0.07 | 0.07 | 0.07 |
| Event dispatch (`processEvent`, handlers) | 0.13 | 0.14 | 0.12 | 0.15 |
| Native event calls (`drainEvents`, `resolveEvent`, other) | 0.08 | 0.09 | 0.09 | 0.09 |
| Engine routes the key (outside JS) | 0.22 | 0.22 | 0.21 | 0.22 |
| Harness and instrumentation | 0.04 | 0.06 | 0.05 | 0.05 |
| GC | 0.00 | 0.00 | 0.00 | 0.00 |
| **Total** | **2.82** | **3.66** | **2.80** | **3.98** |

How to read the rows:

- *Native commit call* is the time the JS thread spends inside `host.commit`; the sampler sees native code as one frame, so its parts are in "The native commit" below.
- *CodeMirror: lezer incremental parse* is `LanguageState.apply` inside the transaction (`@lezer/lr`, `@lezer/common`, `@codemirror/language`) and *state transaction* is the rest of `EditorState.update`, the history, the commands and the
  bracket match. Tree walking for the colours is in *editor data*, not here (the first version of the analysis put it here: the tree cursor lives in the same package).
- *Editor data* is `controller.lines` (`buildLine` for 25 or 28 lines, the colour spans, the line layout, the caches), the controller and the commands.
- *React* has three rows: the host-props step of `completeWork` (`nativeProps`, `compileStyle`, `diffNativeProps`), the components and the render phase, and the reconciler's own scheduling and commit phase. The *commit walk*
  (`buildCommit`, the JSON, the freezing after the call) is its own row: 0.07 ms in both views.
- *Event dispatch* is `processEvent` and `dispatchEvent` (the synthetic event, the path, the handlers' own overhead); *native event calls* are `drainEvents` with its JSON, `resolveEvent` and the others.
  *Engine routes the key* is the time inside `Input.parseInputEvent` that is neither a JS callback nor the harness: Godot's input routing and `ReactUiRoot`'s native key handling.
- *Harness and instrumentation* is the demo's `_input` and `_unhandledInput` (the verifier's isolation) and the renderer profiler's clock; neither is the library's.
- *GC* is 0.04 ms per keystroke, but V8 reports a collection as its own root, outside the stack of the key that caused it, so the table shows 0.00 and the 0.04 ms is in the profile's "rest of the burst" (about 1.5 % of a keystroke).
- The other samples in the bursts are not in the table: the frames between keys (`_process`), the timers, and the driver's own reads of the profilers (0.37 ms per key for the three `takeProfile` reads, outside the timed calls).

- **The GodotJS bridge is not a cost.** A call from JS into the engine takes 0.10 to 0.11 µs (a Godot method returning an integer, a boolean or a `StringName`, 200,000 in a loop after a warm-up, `nativeCallCost` in the driver; an empty JS function
  takes 4 ns), so the library's 15 calls per keystroke are under 2 µs together. What native calls cost is what they do: `commit`, 0.76 ms, and `Input.parseInputEvent`, which carries the whole keystroke.

Other keys, press + release median / mean, ms (attribute site, 800 each):

| | insert | Backspace | arrow Right | arrow Left |
| --- | ---: | ---: | ---: | ---: |
| runs view | 2.85 / 2.95 | 2.83 / 2.93 | 1.66 / 1.69 | 1.67 / 1.71 |
| spans view | 3.62 / 3.66 | 3.57 / 3.63 | 1.61 / 1.63 | 1.64 / 1.72 |

- **Typing with the keys 100 ms apart** (six frames, four keys to a burst) costs 3.16 for a character and 2.90 for a Backspace in the runs view, 3.84 and 3.67 in the spans view: 0.1 to 0.3 ms more than at one frame a key. The first key after a pause also sends the
  status bar's "Waiting for a pause in typing…" (8 commands, 1,372 characters), and the caches have gone cold.
- **The function-body site** (`const sizes = … : SIZES;`, 46 hosts walked in the runs view) costs the same in the runs view, 2.80, and more in the spans view, 3.98: the line has more coloured tokens, so more glyphs take the slow draw (paint pass 1.42 ms).
- **The renderer's `events` sample** has two entries for a typed character: `keydown` at 0.06 ms and `beforeinput` at 2.4, which holds the CodeMirror transaction, the React render and commit and the native call. A Backspace is one entry, the `keydown`: the editor handles it there.

## React: what runs on a keystroke

Calls per keystroke from precise coverage (`Profiler.startPreciseCoverage` with call counts, 400 keystrokes, the runs view; the burst's frames and timers are in it, the driver's profile reads are not
counted here):

| | per keystroke |
| --- | ---: |
| `EditorView` renders | **2.0** |
| `CodeEditor`, `StatusBar` renders | 1.0 each |
| `RunLine` renders (the one line that changed, of the 25 in the window) | 1.0 |
| `Carets` renders (a prop change, and `setShown(true)` in its effect when the caret was off) | 1.5 |
| root renders (`performWorkOnRoot`) | 2.0 |
| host components updated (`updateHostComponent`) / given new native props (`nativeProps`) / cloned and walked by the commit (`cloneInstance`, `visit`) | 44.4 / 37.9 / 37.9 |
| `compileStyle` calls / of those in `mergeLonghands` / `canonicalJson` calls | 21.1 / 93 / 230 |
| `setState` calls (`dispatchSetState`) / store re-renders forced (`forceStoreRerender`) / `useSyncExternalStore` updates | 4.5 / 4.6 / 7.0 |
| `buildLine` calls (25 lines, twice) / `colorSpans` calls | 50 / 25 |
| `drainEvents` round trips (`readEvents`) / `dispatchEvents` / `processEvent` / `resolveEvent` | 6.1 / 3.6 / 2.5 / 2.5 |

- **The editor renders twice for one keystroke, and the second render does nothing.** Both renders are inside the keystroke (traced for a Backspace: both under `processEvent` → `flushSyncWork`; that the patch below takes 0.17 ms off the timed press + release says the same of a typed character).
  The second is React running `EditorView` again because of a `setState` to the value the state already has, which it cannot skip when the fiber still carries lanes from the render before:
  `hover.cancel()` calls `setTooltip(undefined)` every time (`onKeyDown`, `onBeforeInput` and the effect on `controller.model.version`, `demo/src/editor/view/editor-view.tsx:189`, `:273`, `:278`;
  `demo/src/editor/view/hover.ts:56`), and `GridProbe`'s layout effect calls `onMeasured`, which sets `measured` to an equal value, on every render (`demo/src/editor/view/grid-probe.tsx:35`). With
  both stopped (a throwaway patch: `hover.cancel()` shows nothing when nothing is shown, the probe reports a measurement only when it changed) `EditorView` renders once, `dispatchSetState` falls from 4.5 to
  1.0 per keystroke, and `buildLine` from 50 to 25; with either alone it still renders twice.
- **Most host components are given props again for one changed line.** 38 host instances are cloned and walked by the commit for 5 changed nodes: the window's 25 lines are memoised (`RunLine`, `GutterCell`)
  and do not render, but everything above and beside them does (the content `View`, the gutter `View`, the text input, the carets, the status bar), and several have an inline `style={{...}}`
  that is a new object every render (those four, the status bar's two coloured texts, and the changed line's twelve runs). `nativeProps` reuses a compiled style only when `previous.props.style === props.style` (`src/props.ts:132`), so each of them goes through `compileStyle` (parse the classes,
  merge the longhands, sort, canonical JSON, look up the interned copy): 21 compiles per keystroke, 93 `mergeLonghands`, 230 `canonicalJson` calls. The changed line is 12 `Text` runs, each with a new `runStyle` object too.
  With the style compared by its contents (a throwaway patch in `nativeProps`) the compiles fall from 21.1 to 4.1 per keystroke, `mergeLonghands` from 93 to 17 and `canonicalJson` from 230 to 46.

## The native commit (0.76 ms for 5 commands)

`host.commit` is one synchronous call of 5 commands (5 updated nodes, no creates, no moves; 877 characters of JSON). The renderer's profile times the call at 0.76 ms (median of 1,600); the native
`batch` sample at 0.74, so the crossing itself (a JS string to a Godot string and back) is about 0.02. The `batch` sample splits it into parse 0.03, validate 0.04, mount 0.26, layout 0.30 and
geometry 0.10 ms, but the paint pass (0.15, a `draw` sample) is inside mount and the text shaping is too. To see the rest, a measuring build of the native library was made
(`scripts/keystroke-experiments/native-detail.patch`: scoped timers and counters in `native/`, printed by `take_profile`; kept as a patch and never applied in a commit, built and installed only in this worktree, and 0.5 % slower than the clean build
on the same keystrokes, 2.696 against 2.682 ms). `scripts/analyze-native-detail.mjs` reads them. Medians of 800 typed characters, in microseconds, each timer inclusive of the ones inside it:

| | µs |
| --- | ---: |
| **the whole `commit` call** | **756** |
| JSON parse (serde) | 26 |
| validate, plan, and Stylo's dry-run restyle | 15 + 4 + 24 |
| apply the transaction (5 updates) | 9 |
| style engine update, authored style, presentation | 17 + 8 + 9 |
| text shaping: 2 paragraphs, 56 characters (`StyledParagraph::build`) | 54 |
| **`flush_layout`** | **568** |
| of which taffy layout (`compute_tree`) | 304 |
| of which, inside the text measure callback: 35 calls, 5.4 µs each (189 µs the measure, 12 the paragraph clone) | 212 |
| of which geometry (`update_geometry`) | 60 |
| of which the paint pass: 10 dirty nodes, 15 µs each | 150 |

- **Shaping is the small part.** Two paragraphs are rebuilt for the keystroke (the edited run, and the status bar's "Ln 99, Col 67") and shaping them takes 54 µs: 7 % of the call.
- **Layout measures text 35 times for a one-character edit, and most of them are not the edited line.** `native/layout.rs:28-39` clones the paragraph and asks Godot's `TextParagraph` for its size at
  the width taffy offers (`set_width` + `get_size`), once for each (known size, available space) taffy probes. Tracing the calls of one press (`KEYSTROKE_TRACE_MEASURE`, same patch) shows 4 calls on 20 px high texts (the edited run, 276 px wide, and the 8 px run after it) and the other 31 on texts 16 px high and their wrapped
  probes (94, 79, 75, 56, 41 and 29 px wide, 16 to 64 px high), which fits the status bar's four texts: 94 px is 13 columns of the monospace font, "Ln 99, Col 67" itself. A throwaway patch that stops the position text from changing (`scripts/keystroke-experiments/status-text-constant.patch`) takes the measure calls from 35 to 4, taffy from 304 to 157 µs,
  the commit call from 0.76 to 0.59 ms and the keystroke from 2.69 to 2.52 ms. Giving the text a fixed width (`w-28`) does not help: still 32 calls. So a change of one text's content makes taffy measure the texts around it again; why their cached sizes are not reused was not traced.
- **The paint pass records 10 nodes for 5 changed ones** (`native/render_tree.rs paint_pass`, 15 µs each; 3 of them are re-recorded, 1 box and 2 contents, and the rest are checked and found unchanged).
- **Native counters per keystroke** (medians): 5 mutations, 5 nodes updated, 4 restyled, 1 box record, 2 content records, 2 paragraph builds, 0 repaints, 1 layout pass, 1 paint pass.

## CodeMirror and lezer, in a browser and here

`demo/src/editor/keystroke-bench.ts` runs the editor's data work with no window, no React and no native library: the transaction of a typed character through the editor's
model (`EditorState.update` with the TypeScript + JSX language, history, `indentOnInput`), the lezer parse that comes with it, and what the view asks of the controller for the
lines it draws after an edit (the tree to the end of the window, the bracket match, `buildLine` for each of the window's lines). It types the same insert and Backspace pairs at the
same place of the same file, a window of 25 lines (83 to 107, what the panel mounts), 1,000 keystrokes after 400 of warm-up. The same function runs in Node, in headless Chrome (page served
cross-origin isolated, so `performance.now()` has 5 µs resolution) and inside the Godot V8 (`godotReactKeystrokeProfile.bench`). No view is involved: CodeMirror's own `EditorView` would
add DOM work to the first two columns of the table below, and is not measured.

| Piece, median ms per keystroke | Chrome 156 (headless) | Node 22.16 | Godot V8 (Breaka's engine) |
| --- | ---: | ---: | ---: |
| `controller.beforeInput` (the transaction through the editor's model) | 0.260 | 0.321 | 0.341 |
| `controller.lines(83, 107)` (the view's data after the edit) | 0.110 | 0.123 | 0.127 |
| `EditorModel.dispatch` (the model's transaction, pieces timed in turn) | 0.255 | 0.317 | 0.340 |
| then `ensureSyntaxTree` to the end of the window | 0.000 | 0.000 | 0.001 |
| `matchedBrackets` | 0.000 | 0.002 | 0.002 |
| `buildLine` for the 25 lines | 0.095 | 0.121 | 0.124 |
| colour spans of the 25 lines (`colorSpans` each) | 0.050 | 0.061 | 0.061 |
| colour spans of the changed line only | 0.000 | 0.003 | 0.003 |
| `EditorState.update`, language only (CodeMirror alone) | 0.245 | 0.305 | 0.326 |
| `ensureSyntaxTree` after the bare update | 0.000 | 0.000 | 0.000 |

(Three repeats of the Node and Chrome run, load 12 to 15: Chrome 0.250 to 0.255 for the bare update and 0.270 to 0.275 for the controller's transaction, Node 0.30 to 0.31 and 0.33 to 0.35; the engine's two runs: 0.326 and 0.331, 0.341 and 0.354. One earlier Chrome run, concurrent with another job, read 0.34 and is left out.)

- **What CodeMirror costs on its own, in a browser:** a transaction with the parse takes 0.25 ms (`bareUpdate`: `EditorState.update` with the language and nothing else), and there is no
  cheaper way to ask it: the parse is inside `LanguageState.apply`. Lezer reads and shifts about 300 tokens for one typed character (precise coverage, calls per keystroke: `readToken` 322,
  `shift` 294, `reduce` 402, `tryReuse` 675); why it cannot reuse more of the old tree around an edit in the page's root element was not looked into.
- **What it costs in this engine:** 0.33 ms for the same call, 33 % more than Chrome's and 7 % more than Node's. The engine's V8 is 12.4.254.21 (its inspector's `/json/version`) and Chrome 156's is 15.6.75.27, more than
  three major versions apart; that is the likely cause and was not tested (a different V8 cannot be put in the engine here). Node 22's V8 is in between.
- **What ours adds:** the controller's `beforeInput` (the model, `typeText`, the listeners) is 0.34 ms against 0.33 for the bare update, so the glue costs nothing; the lines the view builds
  after the edit (`controller.lines`) cost 0.13 ms in isolation, of which 0.06 is reading the colour spans of all 25 lines (a new tree makes every cached line miss,
  `demo/src/editor/highlight.ts:105`) and the rest `buildLine` for 25 lines (5,464 calls of `covers` per keystroke in `colorAt`, `demo/src/editor/lines.ts:69`).
- **In the window** the same work costs more: a timer inside `EditorModel.dispatch` (a throwaway patch, `scripts/keystroke-experiments/dispatch-timer.patch`; no profiler attached) puts the transaction with its parse at
  0.48 ms median (mean 0.45, p95 0.58) over 1,600 keystrokes, against 0.34 for the same call in the bench in the same V8; the phase table has the parse and the transaction at 0.56 ms (the Backspace's path through the keymap included) and the lines, colour spans and
  controller at 0.32 ms, against 0.13 for the lines in the bench. The extra is cold caches and allocation: between two keystrokes the engine draws a frame and React and native run, and the bench's loop does not.

So the library part of a keystroke is 0.35 to 0.4 ms in a browser and 0.5 to 0.6 ms in the window here. It is about a fifth of the 2.7 ms.

## Causes, ranked by milliseconds

Runs view, attribute site, 2.8 ms of press + release. "Timed" means a throwaway patch was built and measured against the unpatched bundle, alternating the two in the same minutes (A/B/A/B, three rounds, 1,600 keystrokes a run);
"estimated" means it was not tried, and the figure is the cost of the thing less what would plausibly be left.

| # | cause | cost now | fix | saving |
| --- | --- | ---: | --- | ---: |
| 1 | The status bar's changed text makes native measure 31 texts again (`native/layout.rs:28`, 35 calls in one layout) | 0.19 | stop the measure from running for text that cannot have changed: cache `StyledParagraph::measure(offered)` by paragraph generation, so a sibling the layout probes again is a lookup | **0.17 timed** (freezing the text: native call 0.76 → 0.59, layout 0.30 → 0.16); a cache should keep most of it |
| 2 | `EditorView` renders twice (`setTooltip(undefined)` from `hover.cancel()`, `setMeasured` from the probe: a `setState` to the held value, which React cannot skip) | 0.17 | `hover.cancel()` only when something is shown; the probe reports a changed measurement only | **0.17 timed** (2.69 → 2.52) |
| 3 | 21 inline `style` objects compiled again per key (`src/props.ts:132` compares by identity) | 0.14 | compare the inline style by its contents in `nativeProps`, or have the components keep their style objects | **0.14 timed** (2.69 → 2.55; `compileStyle` 21.1 → 4.1 per key); the two together 2.33, **0.36 timed** |
| 4 | CodeMirror's transaction and lezer's parse | 0.56 (0.48 in the window) | none cheap: 0.25 in Chrome. Parse after the frame and colour the new character with the old tree for one frame (the colours lag one frame), or a lighter grammar | up to 0.4, with a visible cost; estimated |
| 5 | The editor rebuilds all 25 lines and re-reads all 25 colour spans per key (`controller.lines`, `highlight.ts:105` misses for every line on a new tree) | 0.32 | rebuild the lines whose text or tokens changed; the others keep their spec | 0.2; estimated (the bench has the lines at 0.13 of it in isolation) |
| 6 | The paint pass records 10 nodes for 5 changed (15 µs each, `native/render_tree.rs`) | 0.15 | skip a node whose paint inputs are equal | 0.07; estimated |
| 7 | Event plumbing: two blocking round trips, 3.6 `dispatchEvents`, 6 `drainEvents`, a synthetic event and its path each, `processEvent` flushing React after each | 0.43 with the engine's routing | one `drainEvents` per dispatch round; no flush when nothing is pending; the routing inside `Input.parseInputEvent` (0.22) is the engine's | 0.1; estimated |
| 8 | The rest of the native commit: taffy outside the measures 0.09, shaping 0.05, geometry 0.06, Stylo with validate and plan 0.04, JSON parse 0.03, the style engine and presentation 0.03, the rest of the call 0.1 | 0.42 | per-commit work; none stands out | not pursued |

(1 and 2 and 3 do not overlap; 1 was timed in a separate run, the others in the rotation.) All the timed ones together are 0.53 ms of 2.8; with the estimated ones about 0.9, which would leave the runs view near 1.9 ms. Going below needs the parse (4) off the keystroke
and the pipeline's floor down: a caret move alone costs 1.66 ms, and rows 1 and 2 and the event path are most of it, so they come first, since every key pays them.

What the profile also showed, and is not on the list because it is small: `useSyncExternalStore` on two stores (the controller's and the workspace's) in both `EditorView` and `CodeEditor` (7 store updates per key), `longestLine` walks all 164 lines
for every key (0.01 ms), `matchedBrackets` and `caretPlacements` (0.01 each), and the renderer profiler's own clock (0.015 ms).

## The spans view: what it adds

`894c97d` draws a line as one `Text` with nested `Text` spans (`demo/src/editor/view/code-line.tsx`). Measured as above, on the same native library: 3.60 ms against 2.76 (median of 4,800 keystrokes each, alternated), 3.98 against 2.80 at the function-body site. It matches the code-editor track's own
3.5 to 3.8. Where the 0.84 ms is (attribute site):

| | runs | spans | |
| --- | ---: | ---: | --- |
| native commit call | 0.78 | 1.62 | **+0.84** |
| of which the paint pass | 0.15 | 1.02 | +0.87 |
| of which taffy layout / geometry / shaping | 0.30 / 0.06 / 0.05 | 0.33 / 0.03 / 0.07 | 0 / −0.03 / +0.02 |
| the commit walk (`buildCommit`) | 0.06 | 0.11 | +0.05 |
| React: components, host props, reconciler | 0.60 | 0.63 | +0.03 |
| CodeMirror, editor data, events, engine | 1.4 | 1.4 | 0 |
| a caret move (no text changes) | 1.66 | 1.63 | 0 |

- **The paint pass is the whole difference.** `StyledParagraph::draw` (`native/text_paragraph.rs:364`) lets Godot's `TextParagraph::draw` draw a paragraph only when nothing about it needs more; a paragraph whose spans give some glyphs a colour of their own
  (`draws_glyphs()`) is drawn by `draw_lines`: a layout of the whole line is read out of the text server and every glyph is drawn on its own. The measuring build times the parts, for the 97-character line of the attribute site, medians in µs: the layout
  563, the glyph loop 348 (97 glyphs, 3.6 µs each), the decorations 4, the rest of the 9 nodes painted about 100; 1,018 in all. At the function-body site, with more coloured tokens, the pass is 1.42 ms. The runs view drew each run with one `TextParagraph::draw` call, and re-recorded only the nodes that changed (2 contents and 1 box: the 0.15). The cost of a keystroke in the spans view therefore grows with the number of glyphs on the line, not with the characters changed; a 120-column line costs more.
- **The JS the spans add is under 0.1 ms.** Per keystroke (precise coverage): `flattenRichText` once (the line's text and 9 spans), `keyOf` twice (a `JSON.stringify` of the line's spans, about 1,000 characters, to compare them with the last ones: `src/rich-text.ts:171`), `sameSpans`
  26 times, 9 `cloneSpan` / `styleOf` / `spanStyle` for the 9 coloured segments, 12 `isPlain`. The JSON is 1,014 characters against 877 and encodes in 0.010 ms in both. The commit walk visits 26 nodes instead of 38 and takes 0.11 ms instead of 0.06;
  the React components cost 0.07 more and the host props 0.07 less (a line is one host instead of twelve: `compileStyle` 18 per key instead of 21, `nativeProps` 26 instead of 38).
- **Native re-shaping is not the cost either.** Two paragraphs are rebuilt in both views (the edited line, now 97 characters, and the status bar's text): 67 µs against 54.
- **Unchanged by the move:** CodeMirror and the editor's data (`controller.lines` is 56 `buildLine` calls for a 28-line window, as 50 for 25 before), the two renders of `EditorView` (2.0 root renders and 4.5 `setState` per key in both: the hover part is the same code and the probe part is now the `measuredCarets`
  layout effect of `editor-view.tsx`, which sets state on every render; not tried), the status bar's 31 text measures, and the events.
- **C20's 8.7 ms is gone**, as the code-editor notes say; the probe asks for its carets when its box changes. Nothing in this profile resembles it.

Fixes that would bring the spans view down: draw coloured spans without the per-glyph path (a `shaped_text_draw` per run of one colour with clip rectangles, the way the runs view drew them) and without building the layout, which the paint does not need when there are no backgrounds or
decorations; or keep the line's canvas items when only a character changed. The cost is native and the estimate is the runs view's 0.15 for the pass: up to 0.8 ms, not tried.

## Decisions

- **The runs view was measured on `91c4502`, not on the `9dba853` the branch began on.** `91c4502` has the same native sources as `894c97d` (the box-mesh work landed between them, and `894c97d` changes none), so one measuring library serves both views and the
  difference between them is the editor and nothing else. The box-mesh work itself cost the keystroke nothing: 2.61 ms before and 2.68 after, unprofiled, same editor (`runs-attribute-off` against `runs91-attribute-off`).
  The first profiles, at `9dba853`, gave the same shares and were dropped; the overhead matrix in "What was measured" is from them.
- **The spans view was measured on `894c97d`, not on the latest main.** Main has since taken the single native build (`6885cd8`), which rebinds the library; measuring on it would have put a second change into the comparison.
- **Only the Profiler domain, and `Runtime.enable` for the context id.** GodotJS registers its context without the default flag, so `Runtime.evaluate` needs the id that `Runtime.enable` announces; the Debugger domain was never enabled.
- **The inspector is on a free port**, through a generated `override.cfg` (removed when the run ends). The first run of this track connected to the default port, 9229, which another session's verifier held, and sent it `Profiler.enable` and a failed `Runtime.evaluate` before the check was added that the target
  is this run's demo (`typeof godotReactKeystrokeProfile`). The session ended when the socket closed, a second later; nothing else was sent.
- **A diagnostic is not a behaviour change.** The driver, the bench and the scripts are committed; the native timers and the four throwaway patches that were timed are committed as patches and were never part of a commit of `native/` or `src/`. The measuring library is installed only
  in this worktree and was replaced by a clean build at the end.
- **A sample's credit is capped** and **native frames are named by their caller** (see "What was measured"); both were found by reading profiles that did not add up (a total of 2.1 ms against 3.2 measured; frames named `removeLogger` and `poll`).

## Reproducing it

Everything heavy goes through the gate, windows through the quiet-window runner, nothing generates real input. In a worktree with the library and the demo built (`pnpm build:native`, `node scripts/build.mjs`):

```
node scripts/profile-keystrokes.mjs --site=attribute --bursts=100 --cpu=off              # unprofiled timers per keystroke  -> records.json
node scripts/profile-keystrokes.mjs --site=attribute --bursts=100 --cpu=100              # V8 CPU profile per burst         -> profile-NN.cpuprofile
node scripts/profile-keystrokes.mjs --site=attribute --bursts=25 --coverage              # call counts per keystroke        -> coverage-NN.json
node scripts/profile-keystrokes.mjs --site=attribute --move | --gap=6 --inserts=2        # arrow keys; keys 100 ms apart
node scripts/profile-keystrokes.mjs --site=attribute --bench                             # the editor's data work in the engine's V8
node scripts/profile-keystrokes.mjs --site=attribute --standalone [--no-inspector]       # no client attached
node scripts/keystroke-bench.mjs --site=attribute --first=83 --last=107                  # the same, in Node and headless Chrome
node scripts/analyze-keystroke-profile.mjs artifacts/keystroke-profile/<run>...          # tables from a run (or several, as one)
git apply scripts/keystroke-experiments/native-detail.patch && pnpm build:native                     # the measuring native library (then revert and rebuild)
node scripts/analyze-native-detail.mjs artifacts/keystroke-profile/<run> --kind=insert   # the native commit's phases
```

Each run keeps the bundle it ran (`artifacts/keystroke-profile/bundles/<hash>`), because a CPU profile names positions in `main.js` and only that bundle's source map reads them back: the first
analysis of the profiles here named the wrong functions after a later build had replaced the map. The throwaway patches that were timed are in `scripts/keystroke-experiments/` (`probe-hover-style.patch`, `status-text-constant.patch`, `status-text-width.patch`, `dispatch-timer.patch`).

## What was not done

- Only Breaka's engine, natively, the Compatibility renderer, one machine (M1 Max, 10 cores) that other tracks were using (load average 7 to 35 during the runs; the A/B/A/B comparisons alternate configurations inside the same minutes, and
  round 3 of the patched variants ran two of its four runs at load 26, and its figures agree with the other two rounds). The stock engine, the Web and the other renderers were not measured; V8 on the Web is the browser's, and the finding about the native commit is about native code that is the same on all.
- Typing is injected at a frame a key, 17 ms apart; a person types about 100 ms apart. Keys 100 ms apart were also run (cost 0.1 to 0.3 ms more).
- None of the fixes is implemented. The throwaway patches that were timed (probe and hover, style comparison, status text) are evidence for the numbers, not a proposal of their exact form; `probe-hover-style.patch` is against `91c4502` and no longer applies to the spans view's `grid-probe.tsx`.
- The 250 µs to 5 ms stalls of the V8 sampler and its quantised interval are worked around, not explained.
- Why lezer re-reads 300 tokens, and why taffy measures the status bar's siblings again, were observed, not traced to a line.
- Checks run on the final tree: `pnpm test` (891 pass), `pnpm test:types`, `cargo fmt --check`. `cargo test` and `cargo clippy` were not run: no Rust is changed by any commit of this track. The tool ran natively on Breaka's engine only; there is no verifier section, since it asserts nothing about the editor.

## README text

- **Keystroke cost.** `scripts/profile-keystrokes.mjs` types into the lab navigator's code panel in a quiet window and keeps, per keystroke, the renderer's and the native library's timers, a V8 CPU
  profile (through GodotJS's inspector, Profiler domain only) and the call counts of every function; `scripts/analyze-keystroke-profile.mjs` turns them into tables and `scripts/keystroke-bench.mjs` times the
  editor's CodeMirror work in Node and headless Chrome. `docs/tracks/keystroke-profile.md` says where a keystroke's 2.7 ms goes (the native commit, the parse, React renders the editor again for each key), what
  CodeMirror costs on its own, and what each cause would save.
