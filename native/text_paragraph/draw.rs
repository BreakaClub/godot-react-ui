//! Drawing a line of text the way `TextServer::shaped_text_draw` does, with the glyphs of one font and the shaping of another
//! (letter-spacing), and the decoration lines over and under the text.

use godot::classes::{RenderingServer, TextServer};
use godot::prelude::*;

use crate::box_draw::{Lease, acquire_baked, begin, end};
use crate::paint::parse_color;
use crate::text_decoration::raster::{dot, split_center, wave_layout, wave_tile};
use crate::text_decoration::{DotsPlan, Fragment, LineKind, Shape, WavePlan, shapes};
use crate::text_layout::{GlyphPlacement, ShapedGlyph, ShapedLine};
use crate::text_span::plan::ColorRuns;
use crate::text_style::TextDecoration;
use crate::text_style::metrics::DecorationFont;

/// What to draw a line with.
pub(super) struct LineDrawing<'a> {
    pub(super) canvas: Rid,
    /// The text colour, and the colour of any glyph that `colors` leaves to it.
    pub(super) color: Color,
    /// The colour of a glyph by where its cluster starts, when spans give some glyphs their own.
    pub(super) colors: Option<&'a ColorRuns<Color>>,
    pub(super) oversampling: f32,
    /// The rid each glyph's font is drawn as: the shaping font's and the drawing font's, in the same order.
    pub(super) fonts: &'a [(Rid, Rid)],
}

impl LineDrawing<'_> {
    /// The colour glyph `glyph` is drawn in.
    fn color_of(&self, glyph: &ShapedGlyph) -> Color {
        usize::try_from(glyph.start)
            .ok()
            .and_then(|start| self.colors?.at(start))
            .copied()
            .unwrap_or(self.color)
    }

    fn drawn_as(&self, font: Rid) -> Rid {
        self.fonts
            .iter()
            .find(|(shaped, _)| *shaped == font)
            .map_or(font, |(_, drawn)| *drawn)
    }
}

/// A stretch of a line that is drawn in one colour, as the clip the text server draws it with.
struct Run {
    left: f32,
    right: f32,
    color: Color,
}

impl LineDrawing<'_> {
    /// The line as stretches of one colour each, if the text server can draw each of them in one call (`shaped_text_draw` with a clip)
    /// and draw exactly the glyphs that [`draw_glyphs`] draws one by one; `None` if it cannot, and then the glyphs are drawn one by one.
    ///
    /// The server draws a glyph when it starts at or after the left clip and ends at or before the right one, adding the advances
    /// from the line's start in single precision, as this does. A stretch is clipped from the pen where its first glyph starts to the
    /// pen where its last glyph ends: the very floats the server adds up, so every glyph is drawn by the stretch it is in and by no
    /// other. That needs every glyph to advance the pen, or the glyph before a stretch's start would also start at it, and a glyph with no
    /// advance (a combining mark) or one too small to move the pen would be drawn twice. The server also draws the ellipsis a line ends
    /// in with every call; draws a box for a character no font has, where this draws none; draws a right to left line from its other
    /// end; and draws a font that tracks with the font that shaped it, not the one it is drawn with.
    fn runs(&self, line: &ShapedLine, clip: (f32, f32)) -> Option<Vec<Run>> {
        if line.draws_right_to_left
            || line.ellipsis_at >= 0
            || self.fonts.iter().any(|(shaped, drawn)| shaped != drawn)
        {
            return None;
        }
        let (clip_left, clip_right) = clip;
        let mut runs: Vec<Run> = Vec::new();
        let mut pen = 0.0_f32;
        for (index, glyph) in line.glyphs.iter().enumerate() {
            if line.trim_at >= 0 && i64::try_from(index).ok()? >= line.trim_at {
                break;
            }
            for _ in 0..glyph.repeat {
                if clip_right > 0.0 && pen + glyph.advance > clip_right {
                    return Some(runs);
                }
                if clip_left > 0.0 && pen < clip_left {
                    pen += glyph.advance;
                    continue;
                }
                let end = pen + glyph.advance;
                if glyph.font == Rid::Invalid
                    || end.partial_cmp(&pen) != Some(std::cmp::Ordering::Greater)
                {
                    return None;
                }
                let color = self.color_of(glyph);
                match runs.last_mut() {
                    Some(run) if run.color == color => run.right = end,
                    _ => runs.push(Run {
                        left: pen,
                        right: end,
                        color,
                    }),
                }
                pen = end;
            }
        }
        Some(runs)
    }
}

/// `TextServer::shaped_text_draw` (`servers/text/text_server.cpp`) for a horizontal line, except that each glyph is drawn
/// with the font `drawing` names in place of the one that shaped it, and in the colour its cluster has. `position` is the line's
/// baseline origin; `clip_left` and `clip_right` are the paragraph's clip, a right edge of zero or less meaning none.
/// A line the server can draw colour by colour is drawn so, a call for each stretch of one colour (`LineDrawing::runs`).
pub(super) fn draw_glyphs(
    server: &mut Gd<TextServer>,
    line_rid: Rid,
    position: Vector2,
    clip: (f32, f32),
    drawing: &LineDrawing,
    line: &ShapedLine,
) -> Result<(), String> {
    if let Some(runs) = drawing.runs(line, clip) {
        for run in runs {
            server
                .shaped_text_draw_ex(line_rid, drawing.canvas, position)
                .clip_l(f64::from(run.left))
                .clip_r(f64::from(run.right))
                .color(run.color)
                .oversampling(drawing.oversampling)
                .done();
        }
        return Ok(());
    }
    let rtl = line.draws_right_to_left;
    let mut pen = 0.0_f32;
    let draw = |server: &mut Gd<TextServer>,
                glyph: &ShapedGlyph,
                placement: &GlyphPlacement,
                color: Color,
                pen: &mut f32| {
        server
            .font_draw_glyph_ex(
                drawing.drawn_as(glyph.font),
                drawing.canvas,
                placement.size,
                position + Vector2::new(*pen, 0.0) + placement.offset,
                placement.index,
            )
            .color(color)
            .oversampling(drawing.oversampling)
            .done();
        *pen += glyph.advance;
    };
    if rtl && line.ellipsis_at >= 0 {
        for (glyph, placement) in line.ellipsis.iter().rev() {
            for _ in 0..glyph.repeat {
                draw(server, glyph, placement, drawing.color, &mut pen);
            }
        }
    }
    let (clip_left, clip_right) = clip;
    for (index, glyph) in line.glyphs.iter().enumerate() {
        if line.trim_at >= 0 {
            let index = i64::try_from(index).map_err(|error| error.to_string())?;
            if rtl {
                if index < line.trim_at {
                    continue;
                }
            } else if index >= line.trim_at {
                break;
            }
        }
        for _ in 0..glyph.repeat {
            if clip_right > 0.0 && pen + glyph.advance > clip_right {
                return Ok(());
            }
            if clip_left > 0.0 && pen < clip_left {
                pen += glyph.advance;
                continue;
            }
            if glyph.font == Rid::Invalid {
                // The server draws a hex box for a character the fonts cannot show; this draws none.
                pen += glyph.advance;
            } else {
                let placement = line.placement(index).map_err(|error| error.to_string())?;
                draw(server, glyph, &placement, drawing.color_of(glyph), &mut pen);
            }
        }
    }
    if !rtl && line.ellipsis_at >= 0 {
        for (glyph, placement) in &line.ellipsis {
            for _ in 0..glyph.repeat {
                draw(server, glyph, placement, drawing.color, &mut pen);
            }
        }
    }
    Ok(())
}

/// The font's numbers the decoration lines are placed with.
pub(super) fn decoration_font(size: i32, ascent: f32, underline_thickness: f32) -> DecorationFont {
    DecorationFont {
        size: size as f32,
        ascent,
        underline_thickness,
    }
}

/// Which side of the glyphs a band is drawn on.
#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) enum Layer {
    /// Underlines and overlines, which glyphs are drawn over.
    Behind,
    /// Lines through the text, which are drawn over the glyphs.
    Over,
}

/// A stretch of one text run on one line, and the decorations it is drawn with.
pub(super) struct DecoratedFragment {
    pub(super) fragment: Fragment,
    pub(super) decorations: Vec<TextDecoration>,
}

/// Draw the decorations of `layer` for `fragments`, each decoration in its own colour and style, with its edges on the device
/// pixel grid of `scale`. The pictures baked for a wave or a dot are leased into `leases`, which the caller keeps while the
/// item shows them.
pub(super) fn draw_decorations(
    canvas: Rid,
    fragments: &[DecoratedFragment],
    font: DecorationFont,
    scale: f32,
    layer: Layer,
    leases: &mut Vec<Lease>,
) {
    let mut server = RenderingServer::singleton();
    for decorated in fragments {
        for decoration in &decorated.decorations {
            let color = parse_color(Some(&decoration.color), Color::WHITE);
            let lines: [(LineKind, bool, Layer); 3] = [
                (
                    LineKind::Underline,
                    decoration.lines.underline,
                    Layer::Behind,
                ),
                (LineKind::Overline, decoration.lines.overline, Layer::Behind),
                (
                    LineKind::LineThrough,
                    decoration.lines.line_through,
                    Layer::Over,
                ),
            ];
            for (kind, wanted, line_layer) in lines {
                if !wanted || line_layer != layer {
                    continue;
                }
                for shape in shapes(decoration, kind, font, scale, decorated.fragment) {
                    match shape {
                        Shape::Rect(rect) => server.canvas_item_add_rect(
                            canvas,
                            Rect2::new(
                                Vector2::new(rect.x, rect.y),
                                Vector2::new(rect.width, rect.height),
                            ),
                            color,
                        ),
                        Shape::Wave(wave) => draw_wave(canvas, &wave, color, scale, leases),
                        Shape::Dots(dots) => draw_dots(canvas, &dots, color, scale, leases),
                    }
                }
            }
        }
    }
}

/// Picture kinds in a baked picture's cache key.
const WAVE_PICTURE: u32 = 1;
const DOT_PICTURE: u32 = 2;
/// A baked wave keeps the fraction of a device pixel its centre line is down to this many parts.
const CENTER_FRACTION_PARTS: f32 = 64.0;

fn draw_wave(canvas: Rid, plan: &WavePlan, color: Color, scale: f32, leases: &mut Vec<Lease>) {
    let layout = wave_layout(&plan.wave, scale);
    let center = plan.center * scale;
    let (row, parts) = split_center(center, CENTER_FRACTION_PARTS);
    let (lease, texture, width, height) = acquire_baked(
        vec![
            WAVE_PICTURE,
            plan.wave.width.to_bits(),
            scale.to_bits(),
            parts,
        ],
        || wave_tile(&plan.wave, scale, parts as f32 / CENTER_FRACTION_PARTS).raster,
    );
    leases.push(lease);
    let left = (plan.left * scale).round();
    let right = (plan.right * scale).round();
    let top = row - layout.rows_above as f32;
    let mut server = RenderingServer::singleton();
    begin(canvas, scale);
    let mut x = left;
    while x < right {
        let drawn = (width as f32).min(right - x);
        server
            .canvas_item_add_texture_rect_region_ex(
                canvas,
                Rect2::new(Vector2::new(x, top), Vector2::new(drawn, height as f32)),
                texture,
                Rect2::new(Vector2::ZERO, Vector2::new(drawn, height as f32)),
            )
            .modulate(color)
            .done();
        x += width as f32;
    }
    end(canvas);
}

fn draw_dots(canvas: Rid, plan: &DotsPlan, color: Color, scale: f32, leases: &mut Vec<Lease>) {
    let diameter = plan.diameter * scale;
    let (lease, texture, width, height) =
        acquire_baked(vec![DOT_PICTURE, diameter.to_bits()], || dot(diameter));
    leases.push(lease);
    let mut server = RenderingServer::singleton();
    begin(canvas, scale);
    let top = (plan.center_y * scale - height as f32 / 2.0).round();
    for center in &plan.centers {
        if *center + plan.diameter / 2.0 > plan.clip_right + 1e-3 {
            continue;
        }
        let left = (center * scale - width as f32 / 2.0).round();
        server
            .canvas_item_add_texture_rect_region_ex(
                canvas,
                Rect2::new(
                    Vector2::new(left, top),
                    Vector2::new(width as f32, height as f32),
                ),
                texture,
                Rect2::new(Vector2::ZERO, Vector2::new(width as f32, height as f32)),
            )
            .modulate(color)
            .done();
    }
    end(canvas);
}

#[cfg(test)]
mod tests {
    use super::*;

    const RED: Color = Color::from_rgba(1.0, 0.0, 0.0, 1.0);
    const GREEN: Color = Color::from_rgba(0.0, 1.0, 0.0, 1.0);
    const BLUE: Color = Color::from_rgba(0.0, 0.0, 1.0, 1.0);
    const TEXT: Color = Color::from_rgba(0.9, 0.9, 0.9, 1.0);
    const FONT: u64 = 7;

    fn glyph(start: i64, advance: f32) -> ShapedGlyph {
        ShapedGlyph {
            start,
            repeat: 1,
            advance,
            font: Rid::new(FONT),
        }
    }

    fn line(glyphs: Vec<ShapedGlyph>) -> ShapedLine {
        ShapedLine::for_test(glyphs)
    }

    /// The glyphs `TextServer::shaped_text_draw` draws for a left to right line without an ellipsis (`servers/text/text_server.cpp`),
    /// as the pen where each is drawn and its index.
    fn server_draws(line: &ShapedLine, clip_left: f64, clip_right: f64) -> Vec<(f32, i64)> {
        let mut drawn = Vec::new();
        let mut pen = 0.0_f32;
        for (index, glyph) in line.glyphs.iter().enumerate() {
            if line.trim_at >= 0 && i64::try_from(index).unwrap() >= line.trim_at {
                break;
            }
            for _ in 0..glyph.repeat {
                if clip_right > 0.0 && f64::from(pen + glyph.advance) > clip_right {
                    return drawn;
                }
                if clip_left > 0.0 && f64::from(pen) < clip_left {
                    pen += glyph.advance;
                    continue;
                }
                drawn.push((pen, glyph.start));
                pen += glyph.advance;
            }
        }
        drawn
    }

    /// What `draw_glyphs` draws one glyph at a time: the pen, the index and the colour of each.
    fn glyphwise(
        line: &ShapedLine,
        clip: (f32, f32),
        drawing: &LineDrawing,
    ) -> Vec<(f32, i64, Color)> {
        let mut drawn = Vec::new();
        let mut pen = 0.0_f32;
        for glyph in &line.glyphs {
            for _ in 0..glyph.repeat {
                if clip.1 > 0.0 && pen + glyph.advance > clip.1 {
                    return drawn;
                }
                if clip.0 > 0.0 && pen < clip.0 {
                    pen += glyph.advance;
                    continue;
                }
                drawn.push((pen, glyph.start, drawing.color_of(glyph)));
                pen += glyph.advance;
            }
        }
        drawn
    }

    /// What the runs draw, by the server's rules: every glyph a run's clip lets through, in the run's colour.
    fn by_runs(line: &ShapedLine, runs: &[Run]) -> Vec<(f32, i64, Color)> {
        runs.iter()
            .flat_map(|run| {
                server_draws(line, f64::from(run.left), f64::from(run.right))
                    .into_iter()
                    .map(|(pen, index)| (pen, index, run.color))
            })
            .collect()
    }

    fn drawing<'a>(colors: &'a ColorRuns<Color>, fonts: &'a [(Rid, Rid)]) -> LineDrawing<'a> {
        LineDrawing {
            canvas: Rid::new(1),
            color: TEXT,
            colors: Some(colors),
            oversampling: 1.0,
            fonts,
        }
    }

    fn untracked() -> Vec<(Rid, Rid)> {
        vec![(Rid::new(FONT), Rid::new(FONT))]
    }

    fn colors(runs: &[(usize, Option<Color>)]) -> ColorRuns<Color> {
        ColorRuns::from_runs(runs.to_vec())
    }

    #[test]
    fn a_line_in_three_colours_is_three_calls_that_draw_the_glyphs_once_each() {
        let line = line((0..10).map(|start| glyph(start, 7.25)).collect());
        let colors = colors(&[(0, None), (3, Some(RED)), (6, Some(GREEN)), (8, None)]);
        let fonts = untracked();
        let drawing = drawing(&colors, &fonts);
        let clip = (0.0, 100.0);
        let runs = drawing
            .runs(&line, clip)
            .expect("a plain line is drawn in runs");
        let stretches: Vec<(f32, f32, Color)> = runs
            .iter()
            .map(|run| (run.left, run.right, run.color))
            .collect();
        assert_eq!(
            stretches,
            vec![
                (0.0, 21.75, TEXT),
                (21.75, 43.5, RED),
                (43.5, 58.0, GREEN),
                (58.0, 72.5, TEXT)
            ]
        );
        assert_eq!(by_runs(&line, &runs), glyphwise(&line, clip, &drawing));
    }

    #[test]
    fn the_paragraphs_clip_cuts_the_runs_where_it_cuts_the_glyphs() {
        let line = line((0..12).map(|start| glyph(start, 6.1)).collect());
        let colors = colors(&[(0, Some(RED)), (4, Some(BLUE)), (9, Some(RED))]);
        let fonts = untracked();
        let drawing = drawing(&colors, &fonts);
        for clip in [
            (0.0, 30.0),
            (13.0, 60.0),
            (13.0, 0.0),
            (0.0, 0.0),
            (40.0, 41.0),
            (6.1, 66.0),
            (200.0, 300.0),
        ] {
            let runs = drawing
                .runs(&line, clip)
                .expect("a plain line is drawn in runs");
            assert_eq!(
                by_runs(&line, &runs),
                glyphwise(&line, clip, &drawing),
                "clip {clip:?}"
            );
        }
    }

    #[test]
    fn a_repeated_glyph_and_a_cut_line_are_drawn_as_the_server_draws_them() {
        let mut glyphs: Vec<ShapedGlyph> = (0..8).map(|start| glyph(start, 5.5)).collect();
        glyphs[2].repeat = 3;
        glyphs[5].repeat = 0;
        let mut cut = line(glyphs);
        cut.trim_at = 6;
        let colors = colors(&[(0, None), (2, Some(GREEN)), (4, Some(BLUE))]);
        let fonts = untracked();
        let drawing = drawing(&colors, &fonts);
        let runs = drawing
            .runs(&cut, (0.0, 500.0))
            .expect("a cut line is drawn in runs");
        let wanted: Vec<(f32, i64, Color)> = {
            let mut pen = 0.0_f32;
            let mut wanted = Vec::new();
            for (index, glyph) in cut.glyphs.iter().enumerate().take(6) {
                for _ in 0..glyph.repeat {
                    wanted.push((pen, i64::try_from(index).unwrap(), drawing.color_of(glyph)));
                    pen += glyph.advance;
                }
            }
            wanted
        };
        assert_eq!(by_runs(&cut, &runs), wanted);
    }

    #[test]
    fn a_glyph_that_does_not_move_the_pen_is_drawn_on_its_own() {
        // A combining mark starts where the next stretch starts, and a stretch's clip would let it through twice.
        let mut glyphs: Vec<ShapedGlyph> = (0..6).map(|start| glyph(start, 7.0)).collect();
        glyphs[3].advance = 0.0;
        let colors = colors(&[(0, Some(RED)), (3, Some(GREEN))]);
        let fonts = untracked();
        assert!(
            drawing(&colors, &fonts)
                .runs(&line(glyphs), (0.0, 100.0))
                .is_none()
        );
        // And one whose advance is lost in the pen's precision.
        let mut tiny: Vec<ShapedGlyph> = (0..4).map(|start| glyph(start, 7.0)).collect();
        tiny[2].advance = 1e-9;
        assert!(
            drawing(&colors, &fonts)
                .runs(&line(tiny), (0.0, 100.0))
                .is_none()
        );
    }

    #[test]
    fn a_line_the_server_would_draw_differently_is_drawn_glyph_by_glyph() {
        let colors = colors(&[(0, Some(RED))]);
        let fonts = untracked();
        let drawing = drawing(&colors, &fonts);
        let plain = || line((0..4).map(|start| glyph(start, 7.0)).collect());
        assert!(drawing.runs(&plain(), (0.0, 100.0)).is_some());
        let mut ellipsis = plain();
        ellipsis.ellipsis_at = 2;
        assert!(
            drawing.runs(&ellipsis, (0.0, 100.0)).is_none(),
            "the server draws the ellipsis with every call"
        );
        let mut right_to_left = plain();
        right_to_left.draws_right_to_left = true;
        assert!(drawing.runs(&right_to_left, (0.0, 100.0)).is_none());
        let mut missing = plain();
        missing.glyphs[1].font = Rid::Invalid;
        assert!(
            drawing.runs(&missing, (0.0, 100.0)).is_none(),
            "the server draws a box for it"
        );
        let tracked = vec![(Rid::new(FONT), Rid::new(FONT + 1))];
        assert!(
            super::tests::drawing(&colors, &tracked)
                .runs(&plain(), (0.0, 100.0))
                .is_none()
        );
    }

    /// Lines of fractional advances (the pen is a sum of floats that do not add exactly), colours changing at random, and clips at random:
    /// the runs draw exactly the glyphs, in the colours, that one at a time draws.
    #[test]
    fn runs_draw_what_glyph_by_glyph_draws_for_many_lines() {
        let mut state = 0x2545_f491_4f6c_dd1d_u64;
        let mut next = move |bound: u64| {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state % bound
        };
        let fonts = untracked();
        for case in 0..400 {
            let count = 1 + next(120) as i64;
            let advance = 4.0 + next(1000) as f32 / 100.0;
            let glyphs: Vec<ShapedGlyph> = (0..count)
                .map(|start| {
                    let mut glyph = glyph(start, advance);
                    if next(9) == 0 {
                        glyph.advance += next(300) as f32 / 100.0;
                    }
                    if next(25) == 0 {
                        glyph.repeat = next(3) as i64;
                    }
                    glyph
                })
                .collect();
            let mut changes = vec![(0, None)];
            for start in 1..count as usize {
                if next(5) == 0 {
                    changes.push((
                        start,
                        [Some(RED), Some(GREEN), Some(BLUE), None][next(4) as usize],
                    ));
                }
            }
            let colors = colors(&changes);
            let drawing = drawing(&colors, &fonts);
            let line = line(glyphs);
            let width = line
                .glyphs
                .iter()
                .map(|glyph| glyph.advance * glyph.repeat as f32)
                .sum::<f32>();
            let left = if next(3) == 0 {
                next(width as u64 + 1) as f32
            } else {
                0.0
            };
            let right = if next(3) == 0 {
                left + next(width as u64 + 1) as f32
            } else {
                left + width + 10.0
            };
            let clip = (left, right);
            let runs = drawing
                .runs(&line, clip)
                .expect("fractional advances still move the pen");
            assert_eq!(
                by_runs(&line, &runs),
                glyphwise(&line, clip, &drawing),
                "case {case}, clip {clip:?}"
            );
        }
    }
}
