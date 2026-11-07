//! Drawing a line of text the way `TextServer::shaped_text_draw` does, with the glyphs of one font and the shaping of another
//! (letter-spacing), and the decoration lines over and under the text.

use godot::classes::text_server::Direction;
use godot::classes::{RenderingServer, TextServer};
use godot::prelude::*;

use crate::box_draw::{Lease, acquire_baked, begin, end};
use crate::paint::parse_color;
use crate::text_decoration::raster::{dot, wave_layout, wave_tile};
use crate::text_decoration::{DotsPlan, Fragment, LineKind, Shape, WavePlan, shapes};
use crate::text_span::plan::ColorRuns;
use crate::text_style::TextDecoration;
use crate::text_style::metrics::DecorationFont;

/// A glyph of a shaped line, as `shaped_text_get_glyphs` describes it.
struct Glyph {
    /// Where the glyph's cluster starts in the paragraph's text.
    start: i64,
    repeat: i64,
    advance: f32,
    offset: Vector2,
    font: Rid,
    size: i64,
    index: i64,
}

fn glyph_of(dictionary: &VarDictionary) -> Result<Glyph, String> {
    let field = |name: &str| {
        dictionary
            .get(name)
            .ok_or_else(|| format!("a glyph has no {name}"))
    };
    let integer = |name: &str| {
        field(name)?
            .try_to::<i64>()
            .map_err(|error| format!("glyph {name}: {error}"))
    };
    Ok(Glyph {
        start: integer("start")?,
        repeat: integer("repeat")?,
        advance: field("advance")?
            .try_to::<f32>()
            .map_err(|error| format!("glyph advance: {error}"))?,
        offset: field("offset")?
            .try_to::<Vector2>()
            .map_err(|error| format!("glyph offset: {error}"))?,
        font: field("font_rid")?
            .try_to::<Rid>()
            .map_err(|error| format!("glyph font_rid: {error}"))?,
        size: integer("font_size")?,
        index: integer("index")?,
    })
}

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
    fn color_of(&self, glyph: &Glyph) -> Color {
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

/// `TextServer::shaped_text_draw` (`servers/text/text_server.cpp`) for a horizontal line, except that each glyph is drawn
/// with the font `drawing` names in place of the one that shaped it. `position` is the line's baseline origin; `clip_left` and
/// `clip_right` are the paragraph's clip, a right edge of zero or less meaning none.
pub(super) fn draw_glyphs(
    server: &mut Gd<TextServer>,
    line: Rid,
    position: Vector2,
    clip: (f32, f32),
    drawing: &LineDrawing,
) -> Result<(), String> {
    let rtl = server.shaped_text_get_direction(line) == Direction::RTL;
    let ellipsis_at = server.shaped_text_get_ellipsis_pos(line);
    let trim_at = server.shaped_text_get_trim_pos(line);
    let glyphs = server
        .shaped_text_get_glyphs(line)
        .iter_shared()
        .map(|dictionary| glyph_of(&dictionary))
        .collect::<Result<Vec<_>, _>>()?;
    let ellipsis = if ellipsis_at >= 0 {
        server
            .shaped_text_get_ellipsis_glyphs(line)
            .iter_shared()
            .map(|dictionary| glyph_of(&dictionary))
            .collect::<Result<Vec<_>, _>>()?
    } else {
        Vec::new()
    };
    let mut pen = 0.0_f32;
    let draw = |server: &mut Gd<TextServer>, glyph: &Glyph, color: Color, pen: &mut f32| {
        server
            .font_draw_glyph_ex(
                drawing.drawn_as(glyph.font),
                drawing.canvas,
                glyph.size,
                position + Vector2::new(*pen, 0.0) + glyph.offset,
                glyph.index,
            )
            .color(color)
            .oversampling(drawing.oversampling)
            .done();
        *pen += glyph.advance;
    };
    if rtl && ellipsis_at >= 0 {
        for glyph in ellipsis.iter().rev() {
            for _ in 0..glyph.repeat {
                draw(server, glyph, drawing.color, &mut pen);
            }
        }
    }
    let (clip_left, clip_right) = clip;
    for (index, glyph) in glyphs.iter().enumerate() {
        if trim_at >= 0 {
            let index = i64::try_from(index).map_err(|error| error.to_string())?;
            if rtl {
                if index < trim_at {
                    continue;
                }
            } else if index >= trim_at {
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
                draw(server, glyph, drawing.color_of(glyph), &mut pen);
            }
        }
    }
    if !rtl && ellipsis_at >= 0 {
        for glyph in &ellipsis {
            for _ in 0..glyph.repeat {
                draw(server, glyph, drawing.color, &mut pen);
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
                (LineKind::Underline, decoration.lines.underline, Layer::Behind),
                (LineKind::Overline, decoration.lines.overline, Layer::Behind),
                (LineKind::LineThrough, decoration.lines.line_through, Layer::Over),
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
    let parts = (center.fract() * CENTER_FRACTION_PARTS).round();
    // A fraction that rounds up to a whole pixel is the next row's.
    let (row, parts) = if parts >= CENTER_FRACTION_PARTS {
        (center.floor() + 1.0, 0.0)
    } else {
        (center.floor(), parts)
    };
    let (lease, texture, width, height) = acquire_baked(
        vec![
            WAVE_PICTURE,
            plan.wave.width.to_bits(),
            scale.to_bits(),
            parts as u32,
        ],
        || wave_tile(&plan.wave, scale, parts / CENTER_FRACTION_PARTS).raster,
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
    let (lease, texture, width, height) = acquire_baked(
        vec![DOT_PICTURE, diameter.to_bits()],
        || dot(diameter),
    );
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
                Rect2::new(Vector2::new(left, top), Vector2::new(width as f32, height as f32)),
                texture,
                Rect2::new(Vector2::ZERO, Vector2::new(width as f32, height as f32)),
            )
            .modulate(color)
            .done();
    }
    end(canvas);
}
