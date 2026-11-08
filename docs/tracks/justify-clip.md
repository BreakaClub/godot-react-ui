# Track: trailing glyph clipping in justified text and unclipped text rendering

Branch `justify-clip`, based on main `c9f6a6c`. Investigates and resolves the issue reported where the last glyph of justified text in the Text styles lab (`whitespace` page, `justify` case: `text-justify text-sm`) had its trailing "r" in "over" clipped ("The quick brown fox jumps ove").

## Root Cause

1. In `native/text_paragraph.rs`, whole pixel ratios (device pixel ratio 1.0 and 2.0) took a fast-path bypass directly into Godot C++'s `TextParagraph::draw` (`paragraph.draw_ex(canvas, origin)`).
2. In Godot's C++ implementation (`servers/text/text_server.cpp` and `scene/resources/text_paragraph.cpp`), `TextParagraph::draw` hardcodes line clipping to the paragraph's nominal `width` by passing `clip_l = 0.0` and `clip_r = width` to `shaped_text_draw`.
3. Furthermore, in our own `draw_lines` implementation in `native/text_paragraph.rs`, `clip_width` was computed as `if width > 0.0 { width } else { self.paragraph.get_size().x }`, and passed to `shaped_text_draw_ex.clip_l(...).clip_r(...)`.
4. When text is justified, the space-expansion algorithm expands word spaces across the line so that glyph advances reach the line box boundary. Due to subpixel glyph advances and font rounding, the ink or advance of the final glyph can extend fractionally (by <0.01 px) beyond the nominal layout width, or Godot's C++ clipping drops the trailing glyph entirely.
5. In standard CSS, text has `overflow: visible` by default: glyphs that extend past their line box are drawn unless an ancestor specifies `overflow: hidden` (which is managed by `CanvasItem` clip rects in Godot). Artificial horizontal clipping on text itself violates CSS rendering invariants.

## Fix

1. **Remove artificial horizontal text clipping in `native/text_paragraph.rs`:**
   - Eliminate the bypass to Godot C++'s `TextParagraph::draw` so all text rendering flows through `draw_lines`.
   - In `draw_lines`, pass `(-1.0, -1.0)` to `draw::draw_glyphs` and call `shaped_text_draw_ex` without `clip_l` and `clip_r` (which defaults to `-1.0`, meaning no clipping).
   - Container-level clipping (`overflow: hidden`, `line-clamp`, scroll views) continues to be handled correctly by Godot `CanvasItem` clipping rects.

2. **Verifier & Golden Verification:**
   - Added character ink and line ink edge measurement in `scripts/text-ink.mjs` and `demo/src/text-ink.ts`.
   - Verified against Chrome headless reference data (`scripts/text-styles-golden.json` and `demo/src/text-styles-golden.ts`).
   - Integrated ink verification on the `whitespace` page in `demo/src/verify-text-styles.ts` and `scripts/verify-text-styles-web.mjs`.
   - Added negative controls in `verifyInkControls`: asserting that an undrawn glyph (e.g. missing "r") or an early line termination immediately triggers test failure.

## Verification

- `cargo test`: 914 tests passed, 0 failed.
- `cargo clippy --all-targets -- -D warnings`: passed cleanly.
- `cargo fmt --check`: passed cleanly.
- `pnpm test:types`: passed cleanly.
- `npx tsx --test tests/text-ink.test.ts`: 14 tests passed.
- `npx tsx --test tests/demo-entry-points.test.ts`: 3 tests passed.
- `npx tsx --test tests/text-styles-golden.test.ts`: 3 tests passed.
- Native interaction verifier (`verify.mjs --interaction --only=text-styles`):
  - Landscape (ratio 1 and 2): PASSED.
  - Portrait (ratio 1): PASSED.
  - All 402 characters on the `whitespace` page verified with exact ink match to Chrome.
  - Line ink edges at ratio 1: 30 lines, mean diff 0.000, worst 0.000.
