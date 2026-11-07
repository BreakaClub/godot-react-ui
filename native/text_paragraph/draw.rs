//! Drawing a line of text the way `TextServer::shaped_text_draw` does, with the glyphs of one font and the shaping of another
//! (letter-spacing), and the decoration lines over and under the text.

use godot::classes::text_server::Direction;
use godot::classes::{RenderingServer, TextServer};
use godot::prelude::*;

use crate::paint::parse_color;
use crate::text_style::TextDecoration;
use crate::text_style::metrics::{Band, DecorationFont, Decorator};

/// A glyph of a shaped line, as `shaped_text_get_glyphs` describes it.
struct Glyph {
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
    pub(super) color: Color,
    pub(super) oversampling: f32,
    /// The rid each glyph's font is drawn as: the shaping font's and the drawing font's, in the same order.
    pub(super) fonts: &'a [(Rid, Rid)],
}

impl LineDrawing<'_> {
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
    let draw = |server: &mut Gd<TextServer>, glyph: &Glyph, pen: &mut f32| {
        server
            .font_draw_glyph_ex(
                drawing.drawn_as(glyph.font),
                drawing.canvas,
                glyph.size,
                position + Vector2::new(*pen, 0.0) + glyph.offset,
                glyph.index,
            )
            .color(drawing.color)
            .oversampling(drawing.oversampling)
            .done();
        *pen += glyph.advance;
    };
    if rtl && ellipsis_at >= 0 {
        for glyph in ellipsis.iter().rev() {
            for _ in 0..glyph.repeat {
                draw(server, glyph, &mut pen);
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
                draw(server, glyph, &mut pen);
            }
        }
    }
    if !rtl && ellipsis_at >= 0 {
        for glyph in &ellipsis {
            for _ in 0..glyph.repeat {
                draw(server, glyph, &mut pen);
            }
        }
    }
    Ok(())
}

/// A line of text as far as its decorations are concerned.
pub(super) struct DecoratedLine {
    /// The left end of the line's glyphs on the baseline.
    pub(super) origin: Vector2,
    /// The glyphs' width, trailing white space not counted.
    pub(super) width: f32,
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

/// Draw the decorations of `layer` for `lines`, each decoration in its own colour, with its edges on the device pixel grid of
/// `scale`.
pub(super) fn draw_decorations(
    canvas: Rid,
    decorations: &[TextDecoration],
    lines: &[DecoratedLine],
    font: DecorationFont,
    scale: f32,
    layer: Layer,
) {
    let mut server = RenderingServer::singleton();
    for decoration in decorations {
        let color = parse_color(Some(&decoration.color), Color::WHITE);
        let decorator = Decorator::new(
            font,
            decoration.thickness,
            decoration.underline_offset,
            scale,
        );
        let bands: [(bool, Layer, Option<Band>); 3] = [
            (
                decoration.lines.underline,
                Layer::Behind,
                decorator.underline(),
            ),
            (
                decoration.lines.overline,
                Layer::Behind,
                decorator.overline(),
            ),
            (
                decoration.lines.line_through,
                Layer::Over,
                decorator.line_through(),
            ),
        ];
        for (wanted, band_layer, band) in bands {
            let (true, true, Some(band)) = (wanted, band_layer == layer, band) else {
                continue;
            };
            for line in lines {
                // The baseline is on the device grid too, as it is where Chrome draws.
                let baseline = (line.origin.y * scale).round() / scale;
                server.canvas_item_add_rect(
                    canvas,
                    Rect2::new(
                        Vector2::new(line.origin.x, baseline + band.top),
                        Vector2::new(line.width, band.height),
                    ),
                    color,
                );
            }
        }
    }
}
