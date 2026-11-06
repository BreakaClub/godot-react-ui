# Text layout track: notes and report

Branch `text-layout`, based on `5151c68`. `native/text_layout.rs`: caret, hit-test and selection geometry over
Godot's `TextParagraph` and `TextServer`, and the adapters that connect it to the Godot-free text engine
(`text_input.rs`, `selection.rs`), for Phases I6 (text selection) and I7 (TextInput) of
`docs/INTERACTION_PLAN.md`. Nothing in the renderer uses it yet; that integration is not part of this track.
Neither `INTERACTION_PLAN.md` nor `INTERACTION_PROGRESS.md` was touched: the decisions below are for the
coordinator to fold into the plan's decision log.

Commits: `a1afb1c` (code, probe, verifier, generated files, `.uid` files), then the commit that adds this file.

## What was built

| File | |
| --- | --- |
| `native/text_layout.rs` | the layout, its types and errors, the adapters; 44 unit tests |
| `native/text_layout/paragraph.rs` | `GodotParagraph`: the `TextParagraph` and the primary `TextServer` behind the layout |
| `native/text_layout/tests.rs` | the unit tests, over a fake paragraph that follows the server's rules on a monospace font |
| `native/text_layout_probe.rs` and `native/text_layout_probe/{cases,checks,ink}.rs` | the `probe` cargo feature's runtime verification |
| `demo/text-layout-probe.tscn`, `demo/src/text-layout-probe.ts` | the scene and its owner |
| `demo/src/verify-text-layout.ts`, `scripts/verify-text-layout.mjs`, `package.json` `verify:text-layout` | the verifier and its driver |
| `scripts/build.mjs` | a separate `build` call with the two new entry points |
| `native/lib.rs` | two `mod` lines and a comment (see decision 11) |
| `demo/gen/godot/**`, `demo/src/*.uid` | generated files for the two new scripts and the scene |

Not touched, as instructed: `demo/src/main.ts`, `scripts/verify.mjs`, `demo/src/labs.tsx`,
`demo/src/verify-interaction.ts`, the text engine modules, the renderer.

## API

Everything is `pub(crate)`; the module header documents each item in full. Offsets are code points, rectangles
and points are in the coordinates of the item the paragraph is drawn into (the draw position included).

- **Building.** `GodotParagraph::lay_out(&Gd<TextParagraph>, content_width) -> Result<GodotParagraph, _>` sets the
  paragraph's width exactly as `RenderNode::record_content` does before it draws (Taffy's measurement leaves
  whatever width it last tried), and refuses what is not replicated (`Unsupported`: vertical orientation, drop
  cap, `max_lines_visible >= 0`, `FILL` alignment). `TextLayout::new(source, origin, empty_line)`; `origin` is
  `Geometry::content_origin()`, `empty_line: LineExtents { ascent, descent }` is the font's measure of an empty
  line. `GodotTextLayout = TextLayout<GodotParagraph>`.
- **Lines.** `lines()`, `line(i)`, `line_of(offset)`. A `Line` has `range`, `first_offset`, `last_offset`,
  `origin` (where `draw` hands the line to `shaped_text_draw`), `ascent`, `descent`, `width`, `direction`,
  `after_final_break`, and `top()`, `height()`, `rect()`.
- **Hit test.** `hit_test(point) -> offset`, `hit(point) -> Hit { offset, line }`, `offset_at(line, x)`.
- **Carets.** `carets(offset) -> Carets { line, leading, trailing }` (each `Option<Caret { x, top, height,
  direction }>`; `Carets::primary(input_direction)` is the one `LineEdit` draws), `carets_on_line(line, offset)`
  (the end of a soft wrapped row), `caret(offset, input_direction)`. `Caret::rect(width)` and `center()`.
- **Selection.** `selection_rects(start, end) -> Vec<SelectionRect { line, rect }>`.
- **Graphemes.** `grapheme_boundaries()`, `previous_grapheme(o)`, `next_grapheme(o)` (`Ok(None)` at the edge),
  `nearest_grapheme(o)`.
- **Words.** `word_ranges()`, `word_at(o)` (LineEdit's double click), `word_range_at(o)` (the `TextBoundaries`
  contract).
- **Adapters.** `boundaries() -> BoundaryLists` (a `TextBoundaries`), `line_layout(input_direction, page_height)
  -> ParagraphLines` (a `LineLayout`).
- **Errors.** `TextLayoutError`: `Unsupported`, `NoTextServer`, `NonFinite`, `OffsetOutOfRange`, `InvalidRange`,
  `LineOutOfRange`, `OffsetNotOnLine`, `Stale`, `NoCaret`, `HitTestMissed`, `MalformedServerData`.

## Verification

Run from `godot-react-ui/` (the worktree here), with `GODOT=/Applications/Godot48.app/Contents/MacOS/Godot`,
`CARGO_BUILD_JOBS=3` and rustup's cargo first on `PATH`:

| Check | Result |
| --- | --- |
| `cargo test --locked` | 431 passed (387 before, 44 new), also with `--features probe` |
| `cargo clippy --locked --all-targets`, and with `--features probe` | 0 warnings each |
| `rustup run stable cargo fmt --check` | clean |
| `pnpm test:types`, `pnpm test` | clean, 186 pass |
| `pnpm build:native --probe` then `pnpm verify:text-layout` | 619 checks, all passed (the run after the last code change; the earlier runs are listed below) |
| `pnpm build:native` (default) | restored; the installed library is the default build |

The unit tests cover what does not need an engine: line placement against hand-computed numbers (baselines,
spacing, left/centre/right, `width <= 0`, overflow of a line wider than its box in both directions), line
ownership of offsets (soft wrap, hard break, empty lines, final hard break, empty text), hit-test snapping and
the outside-the-text rules, carets in drawn coordinates, selection runs, words against `BoundaryLists`, the
contracts of `LineLayout` for every offset and line of several texts, the error mapping, and `EditBuffer::apply`
driven by both adapters (vertical movement keeping the desired x, line edges, pages, grapheme and word moves,
double click, deletion, the caret on the line after a final break).

The probe checks real `TextParagraph`s (built by `paint::build_paragraph`, as the renderer builds them) in eleven
cases, each at left, centre and right alignment (33 panels): wrapped Latin, a short Latin line, unwrapped
multi-line Latin (`width = -1`), combining marks (a stack of three), an emoji ZWJ sequence, a flag, a skin tone
modifier and a keycap, Hebrew (wrapped), mixed Latin/Hebrew/digits (unwrapped and wrapped), hard breaks (an empty
line and a final break), CRLF, empty text.
Every case is written as the graphemes it is made of, so grapheme boundaries and words are checked against what is
known independently of Godot. Per panel:

| Check | What it compares |
| --- | --- |
| `grapheme-boundaries`, `grapheme-steps` | the server's character breaks against the case's graphemes; next/previous/nearest at every offset |
| `word-ranges`, `word-range-at` | the layout's words against the server's own list and against the words of the text (white space and ASCII punctuation separate them); `word_range_at`, `word_at` and the boundary lists at every offset |
| `line-geometry` | each line's ascent, descent and width against the paragraph's own; the lines' height and the widest line against `TextParagraph::get_size`; the line count against `get_line_count` |
| `caret-geometry` | every caret is inside its line's box |
| `hit-test-round-trip` | `hit_test(caret.center) == offset` for every caret of every grapheme boundary |
| `hit-test-inside-grapheme` | the same, probed 1 px inside the caret's own grapheme, in text of any direction |
| `hit-test-outside` | above, below, far left, far right of every line |
| `selection-additive` | `a..b` covers what `a..c` and `c..b` cover, for every triple of boundaries (up to 15,180 triples a panel), and the per-grapheme runs add up to the whole |
| `selection-extent` | in text of one direction, each line's run is from the caret of its first offset to the caret of its last, for every pair of boundaries (the selection and caret queries are separate code in the server) |
| `adapter-*` | the adapters under a real multi-line `EditBuffer`, from every grapheme boundary: grapheme moves land on the next and previous boundary, word moves on the `LineEdit` stops, up/down/page land on the right line and on a boundary, Home/End on the line's offsets, Backspace/Delete remove exactly one grapheme (the emoji sequence, the combining stack, CRLF), double click selects the contract's word; every `apply` is accepted (no `InvalidBoundary` / `InvalidLayout`) |
| `engine-hit-test-claims` | the three claims about `TextParagraph::hit_test` made in the module header (below) |
| `draw-parity` | the pixels `draw` puts on the canvas against the line boxes (below) |
| `draw-parity-control` | the same comparison against the left-aligned boxes must fail wherever alignment moved a line 30 px or more |

Once: the four unsupported paragraphs are refused with the named reason, a width set after the layout was built is
noticed (`Stale`), `lay_out` resets a width a measurement left (8 lines at the measured width, 1 at 1000), and
line spacing of 6 px: the lines and spacing add up to 81 px, the placed lines span 81, `get_size` says 81.

**Draw parity.** The line origins replicate `TextParagraph::draw`'s arithmetic, so the only oracle that is not the
same arithmetic is the ink. The verifier draws a case without overlays (black on white), reads the viewport back
and, for each line, finds the ink in the band from 40 % of the ascent up to the baseline (it holds the body of
glyphs and none of the neighbouring line's accents): it must lie inside the line's box (2 px overhang) and span it
within one font size, and the panel's ink must lie within the first and last line (6 px, for emoji). The control
shifts the boxes to the left-aligned ones and requires the check to fail: it did in 18 of 18 panels where a line
moved at least 30 px (the empty case has no ink, so it has no control). The unwrapped case (`width = -1`, which
aligns against the widest line) is among them.

**Captures** (`artifacts/native-text-layout/`, not committed; each has the geometry over the text: line boxes in
light blue, the selection in blue, every grapheme boundary's leading caret as a red lower half and trailing caret
as a green upper half, and the cursor in magenta). Inspected, all but `03-latin-short.png` (one row):

- `01-latin-wrapped.png`: four rows; carets on every glyph edge in all three alignments; the selection starts at
  the `n` of "brown" and ends after "na" three rows down; each row's box is as wide as its glyphs.
- `02-unwrapped-lines.png`: with `width = -1` the short lines are centred and right aligned against the widest.
- `04-combining.png`: the accented letters and the stack of three marks are one cell each, with no caret inside.
- `05-emoji.png`: the family, flag, waving hand with skin tone and keycap are one cell each; the cursor sits after
  the family.
- `06-hebrew.png`: right-to-left text wraps to two rows and, as in Godot, left alignment is flush left.
- `07-bidi-mixed.png`, `08-bidi-wrapped.png`: `abc אבג def 123 דה end`; the selection over the Hebrew run is
  split in two where the logical range skips its middle letters, and continues across the wrap.
- `09-hard-breaks.png`: the empty second line has its caret at the alignment origin, and the offset after the
  final line feed has a full-height caret on a fifth line below the paragraph's four.
- `10-crlf.png`, `11-empty.png`: the caret after a final CRLF is on a line of its own; the empty text's caret is at
  the left edge, the centre and the right edge of its box.

Four verifier runs in all, each diagnosed from its log before the next: (1) headless: everything passed except
`hit-test-round-trip` on the mixed cases (a wrong expectation of mine, decision 9); (2) windowed, with the
`hit-test-inside-grapheme` check: all 600 checks passed; (3) windowed, after adding the negative control and the
unwrapped case: the control failed on the empty case, which has no ink to disagree with (a wrong applicability
condition of mine, fixed); (4) windowed: all 619 passed. No run was repeated because of interference, and no input
of any kind was sent: the probe reads geometry and draws, and `--headless` runs skip the pixel checks.

## Evidence from the engine

Read in `~/Development/godot` and each confirmed by the probe:

1. **`TextParagraph::hit_test` is not usable for a pointer** (`scene/resources/text_paragraph.cpp:1048-1076`). It
   passes the point's x straight to `shaped_text_hit_test_position` on the line, so a centred or right-aligned line
   is hit at the wrong place (it disagrees with the carets at 71 of 90 offsets of the centred `latin-wrapped` case
   and 45 of 46 of the centred `hard-breaks` case); its `if (ofs.y < 0) return 0;` tests the offset it just
   zeroed, so a point above the first line falls through every line and answers the end of the text (89 for
   `latin-wrapped`); and for a point right of a line that ends in a line break the server answers the offset after
   the break, which is on the next line. This is why the layout has its own hit test.
2. **A paragraph has no line after a final hard break.** `shaped_text_get_line_breaks`
   (`servers/text/text_server.cpp:1034-1219`) ends a line at its mandatory break and adds a last line only if
   glyphs remain. `"First line\nsecond\n\nfourth after a blank line\n"` is four lines in the paragraph
   (`get_line_count`, matched by `line-geometry`) and the caret after the last line feed has no line to be on. The
   layout adds one (decision 2).
3. **An empty paragraph has no metrics.** `TextServerAdvanced::_shaped_text_add_string` returns before adding a
   span for an empty string (`modules/text_server_adv/text_server_adv.cpp:5312-5314`), so a paragraph without text
   reports ascent and descent 0 and `shaped_text_get_carets` returns two empty rects. `LineEdit` supplies the
   font's height itself (`line_edit.cpp:1568-1600`); the layout takes it as `empty_line`.
4. **Taffy's measurement leaves a width on the paragraph.** `layout.rs` sets the width of the paragraph it measures
   to whatever candidate it tries; only `record_content` sets the content width again, just before it draws. A
   layout of a node's paragraph made between the two would describe lines nobody drew, so `lay_out` sets it
   (verified: a paragraph left at 50 px is 8 lines, and 1 line after `lay_out` at 1000 px).
5. **Carets are positions.** `shaped_text_get_carets` returns rectangles whose width is a cell's advance and
   negative for a right-to-left glyph; `LineEdit` replaces the width with `caret_width` and uses `position.x`
   (`line_edit.cpp:1601-1625`, `:1990`). The two halves (`leading` after the grapheme that ends at the offset,
   `trailing` before the one that starts there) are the lower and the upper half of the line, at one x unless the
   direction changes.
6. **Grapheme boundaries are `shaped_text_get_character_breaks`**, the ICU extended grapheme clusters
   (`text_server_adv.cpp:6455-6507`), which `LineEdit` moves its caret by
   (`shaped_text_prev_character_pos`/`next_character_pos`), not `shaped_text_next_grapheme_pos`, which steps over
   glyph clusters (whatever the font's shaping produced: a ligature is one). The probe's independently
   written graphemes (ZWJ family, flag, skin tone, keycap, stacked marks, CRLF) all match the server's breaks.
7. **At a change of direction one visual position is two offsets.** In `abc אבג def`, offset 4 (before the alef)
   has a leading caret after the space and a trailing caret at the right edge of the Hebrew run, and offset 7 (after
   the gimel) has a leading caret at the *left* edge of the run and a trailing caret before the space. Those are the
   same two x positions, and `shaped_text_hit_test_position` (which takes only an x) answers 7 at both, never 4.
   Offset 4 is reached from the right half of the space before the run. In `bidi-mixed` 4 of 44 carets, and in
   `bidi-wrapped` 8 of 88, hit the other offset sharing their x (36 over the six mixed panels); the same carets
   probed 1 px inside their own grapheme hit their own offset every time, and so does every caret of pure
   left-to-right and pure right-to-left text (`hebrew`: 57 of 57).

## Decisions

Each was made from the evidence above, the plan's text and its invariants.

1. **Two layers: a `ParagraphSource` trait and the geometry on it.** The fake paragraph lets the placement,
   ownership of offsets, snapping and adapters be unit-tested without Godot (as the text engine track tested
   against fakes); the real `GodotParagraph` is a thin reader of the server, verified by the probe. The fake
   re-implements three server algorithms for one glyph per grapheme, so a mistake shared between the fake and the
   layout is possible; the probe is what rules that out.
2. **The empty line after a final hard break is the layout's.** The offset at the end of such a text is on a
   virtual line (`Line::after_final_break`) with the last line's height, placed below the last line (spacing
   included) and aligned like an empty line. Evidence 2. It is detected from the glyphs of the last line
   (`GRAPHEME_IS_BREAK_HARD`, set by `text_server_adv.cpp:6662`), not by looking for `\n` in a string the layout
   does not have, so a break the server does not treat as one is not invented.
3. **Every offset is on the last line that starts at or before it; a line's last offset is the grapheme boundary
   before its range's end, except for the final line.** This is the `LineLayout` contract and what the text
   engine's own fake layout does (End on a soft wrapped row stops before its last character). It also means a hit
   test never answers an offset that `line_of` puts on another line. No caret affinity; `carets_on_line` is the
   hook for the end of a row (a caret there is the same offset as the next row's start).
4. **Pointer hit test**: nearest line by y (above the first is the first, below the last is the last, the gap
   between lines is the upper line's), `shaped_text_hit_test_position` on the line with the line's x offset removed,
   then snapped to a grapheme boundary and kept on the line. A hit inside a grapheme picks the boundary whose caret
   is nearer to the point, not `closest_character_pos` of the server's answer: for a grapheme of an even number of
   code points the server's sub-division has no middle (`text_server.cpp:1606-1628`), so a point in the right half of
   "e" + acute (two code points) snaps to the start under `LineEdit`'s rule (a tie goes to the lower boundary).
   Evidence 1, and a unit test. Points outside the text are valid input; a NaN or infinite one is an error.
5. **Unsupported paragraphs are refused, not approximated** (vertical, drop cap, `max_lines_visible`, `FILL`):
   the renderer uses none of them, and the probe verifies none. `FILL` would change line widths by justification.
6. **`empty_line` is a parameter.** Evidence 3. The caller has the font; the layout does not.
7. **The text engine's traits are unchanged.** `BoundaryLists` already is a `TextBoundaries` over precomputed
   lists with every check `apply` needs, so `boundaries()` builds one from the server's breaks rather than a second
   implementation; `word_range_at` repeats its word-range rule (the layout has no `&[char]` to give it) and a test
   and a probe check assert both agree at every offset. `ParagraphLines` meets the `LineLayout` contract by
   construction (lines tile the text, `first_offset` and `last_offset` are on their line, `offset_at` stays inside
   them) and the probe's `apply` checks confirm it from every boundary. A `TextLayoutError` maps to the nearest
   `EditError` (offset and line out of range to themselves, `Stale` to `TextMismatch`, a missing caret or hit to
   `InvalidLayout(OffsetOutsideLine)`, the rest to `InvalidLayout(Empty)`), because `EditError` has no place for a
   failed text service and the contract does not need one: the other failures are caught when the layout is built.
   The mapping loses detail; call the `TextLayout` directly for the precise error.
8. **Stale layouts are detected.** `GodotParagraph` records the width, alignment, line spacing, text length and
   line count at `lay_out` and compares them on every query; a mismatch is `Stale { built_for, now }`. It cannot
   see a text change of the same length with the same lines; the layout is meant to live for one gesture or one
   paint.
9. **The exact-centre round trip is a pure-direction invariant.** The task asked for `hit_test(caret.center) ==
   offset` at every boundary. It holds in all 27 panels of left-to-right and right-to-left text (every caret), and
   in mixed text it fails at changes of direction by evidence 7. The mixed cases require the stronger statement
   that matters for the pointer (every caret probed inside its own grapheme hits its offset) and count the
   aliases. No change to the layout: Godot's hit test has no affinity, and nothing in it can be made to have it.
10. **Selection rectangles are the server's runs, as drawn.** A zero-width run (the line feed's) is dropped, so
    selecting only a line break shows nothing; browsers highlight a small block there. Not built.
11. **`dead_code` is allowed in every build without `probe`, not only in non-test builds.** The brief suggested
    `cfg_attr(not(any(test, feature = "probe")), allow(dead_code))`, but under `cfg(test)` the half that talks to
    the server (`GodotParagraph` and the errors only it makes) has no caller (the tests use the fake), so Clippy
    with `--all-targets` would warn. The attribute is `cfg_attr(not(feature = "probe"), allow(dead_code))`; with
    `probe` nothing is allowed and Clippy is clean, so the probe still proves every item is reachable. **I6/I7
    must remove it.**
12. **No generated typings for the probe class.** As for `ReactUiProbe` (`demo/src/probe.ts`), the class is
    declared in `demo/src/text-layout-probe.ts` (`declare module 'godot'`), because a default `gen:types` must not
    describe a class a default build does not contain. `gen:types` was run with the default build installed; the
    new script files and the scene gained `demo/gen/godot/**` files and `.uid` files, which are committed. (It also
    rewrites `demo/typings/jsb.*.bundle.d.ts` with CRLF line endings only; those are left modified and unstaged, as
    the world-space track did.)
13. **A headless mode for the numeric checks.** `pnpm verify:text-layout --headless` runs the geometry checks
    without a window (a `DisplayServer` named `headless` has no renderer); the pixel checks and the captures need
    the windowed run. Both pass `--audio-driver Dummy`.

## What I6 and I7 must do

- **Remove the `dead_code` attribute** on `mod text_layout` in `native/lib.rs` (decision 11) and keep
  `text_layout_probe` behind the feature.
- **Build a layout** from a node's paragraph when you need one (a pointer event, a paint of the selection or the
  caret), not in the commit path: `GodotParagraph::lay_out(&paragraph, node.geometry.content_width())`, then
  `TextLayout::new(source, node.geometry.content_origin(), LineExtents { ascent, descent })` with
  `Font::get_ascent_ex().font_size(size).done()` and `get_descent_ex()`. Drop it before the paragraph's text or
  width changes. A `Text` node with no text has no paragraph (`build_paragraph` returns `None`); its length is 0.
  Check that `layout.text_len()` equals the length the selection `Document` holds for the node.
- **Coordinates.** Everything is in the content item's coordinates (the node's border box, as `content_origin`
  is). Convert pointer positions from root-local through the node's absolute geometry and its scroll ancestors
  (I5) before `hit`, and rectangles back when painting. A selection or caret drawn in a content item needs the
  selection range and caret in its `ContentKey` so that it is re-recorded.
- **I6.** A click or drag: `hit(point)`, then `text_offsets` for the UTF-16 offsets JS sees. A double click:
  `word_range_at(offset)` is the answer for `WordRanges`; its trait has no error path, so call it first and pass a
  closure that returns the validated answer (or log the error and ignore the gesture, never guess). Paint:
  `selection_rects(start, end)` per `NodeRange`. `Text` nodes outside `userSelect: text` need no layout.
- **I7.**
  - Shape the **buffer's text**, not the displayed text, for `boundaries()`: a secure input draws bullets and a
    composing input draws the preedit spliced in, so neither paragraph has the buffer's boundaries. The paragraph
    that is never drawn can be shaped on demand. `boundaries()` and `line_layout()` need the layout of the same
    text the buffer holds when `apply` runs (a length mismatch is `TextMismatch`).
  - An empty value has no paragraph from `build_paragraph`; create the paragraph with the same settings (the
    probe's `paragraph_for` is the recipe: `MANDATORY | WORD_BOUND | ADAPTIVE` break flags and the alignment), and
    consider moving that into `paint.rs`.
  - Hold the input direction yourself (`LineEdit`: LTR at the start, then the dominant direction of what was
    inserted, `line_edit.cpp:2430-2439`, and `ui_swap_input_direction`) and pass it to `caret()` and
    `line_layout()`. Draw the caret as `LineEdit` does: the leading and trailing carets, each `caret_width` wide,
    plus the direction markers where they differ (`line_edit.cpp:1601-1625`). `selectTextOnFocus`, scrolling to the
    caret and the IME position come from `caret(...)` and `Line::rect()`.
  - `line_layout(direction, page_height)`: `page_height` is the visible height of the content; a page move goes
    the number of lines that fit (at least one).
  - Single-line inputs need no `LineLayout` (`apply` goes to the edges itself).
  - Surface a `TextLayoutError` as an `ERROR` line; never fall back to a guessed position.
- **Caveats.** Native only: the Web build has not been tried. Its text server may not be `TextServerAdvanced`
  (no ICU means `character_breaks` is one per code point and a ZWJ sequence splits); run the probe's checks there
  before relying on it (`GodotParagraph` works with whichever server is primary). Not built: caret affinity,
  highlighting of a selected line break, `FILL` alignment, vertical text. Performance was not measured: building a
  layout is a few server calls per line, the character breaks, and the glyphs of the last line.
