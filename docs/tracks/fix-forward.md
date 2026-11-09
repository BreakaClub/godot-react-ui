# Track: fix forward (main after Gemini's merges)

Branch `fix-forward`, based on main `cd7924e`. Ben's ask, after a review of the commits Gemini made on 2026-11-08 (seven tracks merged into main and
deployed as `d23dfaac979e`): fix main forward, keeping the labs' explanations. This is what failed, why, and what changed.

## What failed on `cd7924e`

Unit, type and Rust gates passed. The runtime verifiers did not, on either engine or on the Web. A run stops at its first failing section, so every
native section was run on its own, and each failing one again on `1a3940e` (main before the lab-clarity merge, with `61207e0`'s two type fixes) to
find the commit that broke it.

| Failure | Cause | Commit |
| --- | --- | --- |
| keyboard, inputs, selection, drag, combobox, pointers (portrait), Web touch page | the labs' new notes made them taller than the verifier windows (1120 x 800, 600 x 900, and 560 x 400 and 300 x 450 at a pixel ratio of two) or moved the controls the verifiers press | lab-clarity `fb3c5fb` |
| world, native and Web | a `Button` centres its label, and the verifiers read Add's fill colour at its centre, which is now on the white glyphs | button-centre `a25b80d` |
| text-styles | the break-normal cell was clipped after Chrome's ink numbers were captured without the clip; ink was half of Chrome's in two cells | `cd7924e` |
| navigator, portrait | the header's new Show Expected button made its button group wider than a 300 px root, and the group could not wrap | `cd7924e` |
| live-compile | the lab-clarity rewrite of the Controls lab left the section's edits, the latency loop's pattern and the keystroke bench's anchor pointing at text that is gone; a stale pattern silently changed nothing | lab-clarity `fb3c5fb` |
| live-compile, lab walk | Paint (rewritten by lab-clarity) reads `Object.entries`, which the live compiler refused: see "The compiler" below | lab-clarity exposed a compiler bug |
| code-editor | its press-line picker took the first long line after the middle, which could be below the view; its word-jump, paste and typing checks assumed lines 3 and 5 of the source, which lab-clarity's new import moved | editor-pointer `1002f01`, lab-clarity |
| labs-fit (Web) | the Glass lab's decorative circles reach past a 412 px phone; they are clipped there | lab-clarity's own new section |

Also found: the live-compile section's "no new Worker" assertions compared `undefined` with `undefined`, because nothing installed the Worker counter
they read.

## What changed

**Labs (the explanations stay).**
- Keyboard: the logs stand beside the controls in a wide window; the dialog floats over the page (`absolute`, as a modal does) instead of taking a
  row; the page scrolls in a short window (`keyboard-page`), and the verifier reads the logs from the tree; rows are `gap-2`.
- Controls (inputs): the Selects and Text field groups head the second column, which keeps the tab order the verifier checks and puts the long
  select's trigger high enough in a wide window. The verifier scrolls the page until that trigger is in the window's top quarter before opening its
  list, and asserts the case it checks (more room under the trigger than over it).
- Combobox: captions under their controls, not over them; a one-paragraph intro; the pinned bottom box is a control with a one-line caption again.
- Selection: ten list rows, not fourteen (more than the list shows, and the last one's place is above the bottom of the wide window, which the "past
  everything" drag needs); the readout is `line-clamp-3` (the element keeps the whole text); one-paragraph intro; `gap-2`.
- Drag: the sections grow to share their row; one-paragraph intro; shorter captions; the "vanishes" chip's detail fits its 36 px chip.
- Pointer: shorter pad and capture captions, a one-paragraph intro, the capture button and its result on one row.
- Navigator: the header's button group wraps.
- Glass: the aurora has a test id; `FIT_EXCEPTIONS` names it and the two clipped decor circles, with the reason.

**Verifiers.**
- World (native and Web): Add's colour is read at its inset corner, as Reset's already was.
- Live compile: the probe reads the page's top-left padding (its scrollbar is at the right now); the edits, the latency loop and the busy-service
  edits change the root's background through one `withBackground` that fails when it finds nothing; the memo probes go under the introduction; the
  check after an edit waits for the page to take the edit's check answer (`waitForRepliesTaken`) before asserting nothing is outstanding; the thread
  check takes its baseline once the threads released before have ended; the lab walk's per-lab wait, which includes mounting the compiled lab, is
  held to the sequence's bound for the page's own work (the service's own wait is held to 100 ms by the busy-service check).
- Live compile on the Web: a Worker counter is installed before the page's scripts run, and the script checks the counts came back as numbers.
- Code editor (native and Web): press lines are chosen from the lines in view; the keyboard checks start on the first line that begins with a word;
  the paste and typing checks use the source's first blank line.
- Interaction: a capture saves its picture and tree before the geometry is judged, so a failure leaves its evidence; "escapes parent" names both
  nodes and their rectangles.
- Text styles: Chrome's numbers recaptured (`scripts/text-styles-reference.mjs --golden`); only break-normal's and break-words' ink changed.

**The compiler (live-compile/core/lower.rs).** The pass reads the global `Object` (`Object.defineProperty(exports, ...)`), and refuses a module that
declares a module-level `Object`. It checked the module scope's members, and the parser puts a name nothing declares there too, as an `Unbound`
symbol at its first use (`P::find_symbol`): a lab that only read `Object.entries` was refused. And had it been let through, `fresh_symbol` would
have named the pass's `Object` `Object2`, because the file's names held `Object`. Now `check_free_names` skips unbound members, and `object_ref` reuses
the module's unbound `Object` or makes a symbol of that exact name. Two tests in `tests/live-compile-compile.test.ts`: a module that reads the global
compiles and its exports are defined on it; a module-level `const Object` is still refused.

## Not done here

- Find and replace in the code editor, and a tooltip with the full text of an inlay cut short with an ellipsis: briefed to the editor-pointer track
  and never built.
- Firefox and real phones.

## Checks

On this branch (its final commit for the interaction runs; one native library bound to Godot 4.7.2, loaded by both engines), every step through
the gate once, the native and Web lanes side by side.

| Gate | Breaka engine | Stock engine |
| --- | --- | --- |
| `pnpm test` | 1,104 passed, none skipped (the live-compile CLI built) | |
| `pnpm test:types` | clean | clean |
| Clippy, default, `probe`, `filter-faults`; `cargo fmt --check` | clean (the main crate is unchanged since `cd7924e`) | |
| live-compile `cargo fmt --check`, clippy on `core` | clean (two warnings in vendored Bun code, as before) | |
| `verify`, `verify:motion` | passed, both windows | passed, both windows |
| `verify:interaction`, every default section | passed, both windows (724 s) | passed, both windows (605 s) |
| `verify:world` | passed, both windows | passed, both windows |
| `verify:a11y` | Godot-side checks passed; no AccessKit driver (exit 2, as before) | passed |
| `verify:text-layout` (probe build) | passed | passed |
| `filters,glass,paint,transforms,rich-text,text-styles` on Mobile and Forward+ | passed, both windows | |
| `filters-faults`, `transforms-faults` (negative controls) | passed: each fault caught | |
| `verify:web`, `verify:motion:web`, `verify-world-web` | passed | |
| `verify:interaction:web`, every section | passed: six jobs, 5,794 assertions, 600 captures, 530 s | failed in two jobs under the load of the six jobs, each passing on its own (`hidpi`, and `font-slices` in 98 s); both fixed in `28f1cf1` (the caret's picture, the pages job's deadline). The full run that would confirm them was stopped at Ben's request, to free the machine: not re-run |
| `verify-live-compile-web` | passed: 10 assertions; Workers 19 at the start and the end of the lab walk, 19 after each round of held threads | passed |
