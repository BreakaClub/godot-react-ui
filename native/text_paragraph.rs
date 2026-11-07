//! A node's shaped text: Godot's `TextParagraph` configured from the node's text style (`text_style/`), with what CSS adds to it
//! that the paragraph does not do by itself: line boxes with half-leading, letter-spacing in fractions of a pixel, decoration
//! lines, the way a clipped line ends. Everything that reads or draws a node's text goes through [`StyledParagraph`].

mod draw;
mod found;
mod rich;

use std::cell::RefCell;
use std::rc::Rc;

use godot::classes::text_server::{JustificationFlag, LineBreakFlag, OverrunBehavior, SpacingType};
use godot::classes::{Font, RenderingServer, TextParagraph, TextServer, TextServerManager};
use godot::global::HorizontalAlignment;
use godot::prelude::*;

use crate::box_draw::Lease;
use crate::fonts::ResolvedFont;
use crate::text_decoration::Fragment;
use crate::text_layout::{
    GodotParagraph, GodotTextLayout, LineExtents, ShapedParagraph, TextLayout, TextLayoutError,
    place_lines, read_glyphs,
};
use crate::text_span::RichText;
use crate::text_span::offsets::OffsetMap;
use crate::text_span::plan::fragments;
use crate::text_style::TextDecoration;
use crate::text_style::metrics::LineBox;
use crate::text_style::resolve::{Alignment, LineHeight, ShapingStyle, Wrapping};

/// CSS `tab-size` initial value: a tab advances to the next multiple of this many spaces.
const TAB_SIZE_SPACES: f32 = 8.0;

/// How far the viewport's oversampling may be from a whole number and still count as one (the factor is an `f32` such as 1.5 or 2.0).
const WHOLE_OVERSAMPLING_TOLERANCE: f32 = 1e-3;

/// The width Taffy offers a text, as it is measured.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) enum Offered {
    Definite(f32),
    /// The narrowest the text can be: as wide as its widest word (or its widest line if it cannot break).
    MinContent,
    /// The widest the text can be: its longest line.
    MaxContent,
}

impl crate::text_measure::Sizer for StyledParagraph {
    fn size_at(&mut self, offered: Offered) -> Vector2 {
        self.measure(offered)
    }
}

/// A shaped paragraph and what is needed to measure it, draw it and lay it out for selection.
#[derive(Clone)]
pub(crate) struct StyledParagraph {
    paragraph: Gd<TextParagraph>,
    font: ResolvedFont,
    style: ShapingStyle,
    /// The extra space above and below each line and the fraction of a pixel between lines that a `line-height` makes.
    line_box: Option<LineBox>,
    /// The decoration lines drawn over the text.
    decorations: Vec<TextDecoration>,
    /// The spans of a text made of nested `Text`: its fonts, colours, backgrounds and decorations per fragment. With them the
    /// decorations are the segments' (the node's own are in each), and `decorations` is empty.
    rich: Option<Rc<rich::RichParagraph>>,
    /// The text of a paragraph without spans whose font tracks, to shape it again with the fonts that draw (`found.rs`). Spans keep theirs.
    plain_text: Option<Rc<str>>,
    /// What painting read of the shaped lines at the width it last drew at, and is right until the paragraph is shaped again, which makes
    /// another `StyledParagraph`: reading a line's glyphs makes a dictionary for each, and painting needs them (`shaped`).
    shaped: RefCell<Option<Rc<ShapedParagraph>>>,
}

fn alignment_of(alignment: Alignment) -> HorizontalAlignment {
    match alignment {
        Alignment::Left => HorizontalAlignment::LEFT,
        Alignment::Center => HorizontalAlignment::CENTER,
        Alignment::Right => HorizontalAlignment::RIGHT,
        Alignment::Justify => HorizontalAlignment::FILL,
    }
}

/// The ways a line may break: at a line feed always; at a space if the text wraps; between any two characters for
/// `word-break: break-all`; inside a word wider than the line for `overflow-wrap: break-word` (`adaptive`).
fn break_flags(wrapping: Wrapping, adaptive: bool) -> LineBreakFlag {
    let mut flags = LineBreakFlag::MANDATORY;
    if wrapping.wraps {
        flags |= if wrapping.break_anywhere {
            LineBreakFlag::GRAPHEME_BOUND
        } else {
            LineBreakFlag::WORD_BOUND
        };
        if adaptive && wrapping.break_long_words && !wrapping.break_anywhere {
            flags |= LineBreakFlag::ADAPTIVE;
        }
    }
    flags
}

impl StyledParagraph {
    /// The paragraph for `text`, which is already what is shown (`text_style::flow::shown_text`). An empty text gives a
    /// paragraph with no lines, which a text input needs to place a caret in an empty value; a `Text` has none.
    pub(crate) fn build(text: &str, style: &ShapingStyle, font: ResolvedFont) -> Self {
        let mut paragraph = Self::configured(style);
        if !text.is_empty() {
            assert!(
                paragraph.add_string(text, &font.shape, style.font_size),
                "Godot rejected validated text/font"
            );
        }
        Self::finished(paragraph, text, style, font, None)
    }

    /// The paragraph for a text with spans (`text_span::resolve`): the display text, shaped in `fonts`, one per font run of
    /// `text`. `base` is the node's own font, which the metrics of an empty line and of a decoration are taken from. `epoch` is
    /// the font book's, to tell later whether the fonts could have changed.
    pub(crate) fn build_rich(
        text: RichText,
        fonts: Vec<ResolvedFont>,
        style: &ShapingStyle,
        base: ResolvedFont,
        epoch: u64,
    ) -> Self {
        let mut paragraph = Self::configured(style);
        let characters: Vec<char> = text.display.chars().collect();
        for (run, font) in text.font_runs.iter().zip(&fonts) {
            let piece: String = characters[run.range.clone()].iter().collect();
            assert!(
                paragraph.add_string(&piece, &font.shape, style.font_size),
                "Godot rejected validated text/font"
            );
        }
        let display = text.display.clone();
        let rich = rich::RichParagraph::new(text, fonts, style, epoch);
        Self::finished(paragraph, &display, style, base, Some(Rc::new(rich)))
    }

    /// An empty `TextParagraph` set up for `style`: how it breaks, aligns, justifies, ellipsizes and clamps.
    fn configured(style: &ShapingStyle) -> Gd<TextParagraph> {
        let mut paragraph = TextParagraph::new_gd();
        paragraph.set_break_flags(break_flags(style.wrapping, true));
        paragraph.set_alignment(alignment_of(style.alignment));
        if style.alignment == Alignment::Justify {
            // The last line of a justified paragraph is not stretched.
            // Justification stretches the glyphs to the edge and lets the space a line ends with hang past it, as CSS does.
            paragraph.set_justification_flags(
                JustificationFlag::WORD_BOUND
                    | JustificationFlag::SKIP_LAST_LINE
                    | JustificationFlag::TRIM_EDGE_SPACES,
            );
        }
        if style.ellipsis {
            paragraph.set_text_overrun_behavior(OverrunBehavior::TRIM_ELLIPSIS);
        }
        if let Some(lines) = style.line_clamp {
            paragraph.set_max_lines_visible(i32::try_from(lines).unwrap_or(i32::MAX));
        }
        paragraph
    }

    /// What is done to a paragraph once its text is in: the line box of `line-height`, and tab stops.
    fn finished(
        mut paragraph: Gd<TextParagraph>,
        text: &str,
        style: &ShapingStyle,
        font: ResolvedFont,
        rich: Option<Rc<rich::RichParagraph>>,
    ) -> Self {
        let line_box = Self::line_box_of(style, &font);
        if let Some(line_box) = line_box {
            let mut server = TextServerManager::singleton()
                .get_primary_interface()
                .expect("the text server exists once a text is shaped");
            server.shaped_text_set_spacing(
                paragraph.get_rid(),
                SpacingType::TOP,
                i64::from(line_box.top),
            );
            server.shaped_text_set_spacing(
                paragraph.get_rid(),
                SpacingType::BOTTOM,
                i64::from(line_box.bottom),
            );
            paragraph.set_line_spacing(line_box.gap);
        }
        if text.contains('\t') {
            let space = font.shape.get_char_size(u32::from(' '), style.font_size).x;
            paragraph.tab_align(&PackedFloat32Array::from([TAB_SIZE_SPACES * space]));
        }
        let plain_text = (rich.is_none() && font.tracked).then(|| Rc::from(text));
        Self {
            paragraph,
            font,
            style: style.clone(),
            line_box,
            decorations: Vec::new(),
            rich,
            plain_text,
            shaped: RefCell::new(None),
        }
    }

    /// Give this paragraph the spans of `text` without shaping it again, if shaping them gives what it holds: the same characters
    /// in the same fonts at the same style. The colours, backgrounds and decorations are what changed. Hands `text` back when it
    /// has to be shaped again.
    pub(crate) fn repaint_rich(
        &mut self,
        text: RichText,
        style: &ShapingStyle,
        epoch: u64,
    ) -> Result<(), Box<RichText>> {
        let Some(rich) = self.rich.as_ref() else {
            return Err(Box::new(text));
        };
        if !rich.shapes_like(&text, style, epoch) {
            return Err(Box::new(text));
        }
        let fonts = rich.fonts.clone();
        self.rich = Some(Rc::new(rich::RichParagraph::new(text, fonts, style, epoch)));
        Ok(())
    }

    /// The offsets of this paragraph's inlays, if it has spans.
    pub(crate) fn offset_map(&self) -> Option<&OffsetMap> {
        self.rich.as_ref().map(|rich| &rich.text.map)
    }

    /// The spans' text, if it has them.
    pub(crate) fn rich_text(&self) -> Option<&RichText> {
        self.rich.as_ref().map(|rich| &rich.text)
    }

    fn line_box_of(style: &ShapingStyle, font: &ResolvedFont) -> Option<LineBox> {
        match style.line_height {
            LineHeight::Normal => None,
            LineHeight::Px(height) => {
                let (ascent, descent) = font.extents();
                Some(LineBox::of(ascent, descent, height))
            }
        }
    }

    /// What an empty line of this style measures (a paragraph with no text has no font to take metrics from).
    pub(crate) fn empty_line(font: &ResolvedFont, style: &ShapingStyle) -> LineExtents {
        let (ascent, descent) = font.extents();
        match Self::line_box_of(style, font) {
            Some(line_box) => LineExtents {
                ascent: ascent + line_box.top as f32,
                descent: descent + line_box.bottom as f32,
            },
            None => LineExtents { ascent, descent },
        }
    }

    /// This paragraph's own empty-line extents.
    pub(crate) fn extents_of_empty_line(&self) -> LineExtents {
        Self::empty_line(&self.font, &self.style)
    }

    pub(crate) fn paragraph(&self) -> &Gd<TextParagraph> {
        &self.paragraph
    }

    /// Replace the decoration lines; the shaping does not change.
    pub(crate) fn set_decorations(&mut self, decorations: Vec<TextDecoration>) {
        self.decorations = decorations;
    }

    /// A copy that shares nothing with this one, for a layout probe that must not disturb what is drawn.
    pub(crate) fn duplicate(&self) -> Self {
        Self {
            paragraph: self
                .paragraph
                .duplicate()
                .expect("TextParagraph duplicate is available"),
            shaped: RefCell::new(None),
            ..self.clone()
        }
    }

    pub(crate) fn set_width(&mut self, width: f32) {
        self.paragraph.set_width(width);
    }

    /// The size the text takes when `offered` this much width, in the layout's units. The height includes the fraction of a
    /// pixel of a fractional `line-height` that follows the last line, which the paragraph itself leaves out (it only puts
    /// the gap between lines).
    pub(crate) fn measure(&mut self, offered: Offered) -> Vector2 {
        // Godot's `TextServer::shaped_text_get_line_breaks` only wraps when `width > 0` (`width <= 0`, including `0.0`,
        // means no line wrapping), so `MinContent` and a zero `Definite` width use `f32::MIN_POSITIVE`.
        let width = match offered {
            Offered::Definite(width) => width.max(f32::MIN_POSITIVE),
            Offered::MinContent => f32::MIN_POSITIVE,
            Offered::MaxContent => -1.0,
        };
        // `overflow-wrap: break-word` lets a long word break only if the line is too narrow for it; it does not make
        // the word's break points count for the narrowest the text can be (`anywhere` does).
        let narrowest_ignores_long_words = matches!(offered, Offered::MinContent)
            && self.style.wrapping.break_long_words
            && !self.style.wrapping.break_anywhere;
        if narrowest_ignores_long_words {
            self.paragraph
                .set_break_flags(break_flags(self.style.wrapping, false));
        }
        self.paragraph.set_width(width);
        let mut size = self.paragraph.get_size();
        if narrowest_ignores_long_words {
            self.paragraph
                .set_break_flags(break_flags(self.style.wrapping, true));
            self.paragraph.set_width(width);
        }
        size.y += self.line_box.map_or(0.0, |line_box| line_box.gap);
        size
    }

    /// The size the text has now, at the width it was last measured or drawn at.
    pub(crate) fn drawn_size(&self) -> Vector2 {
        let mut size = self.paragraph.get_size();
        size.y += self.line_box.map_or(0.0, |line_box| line_box.gap);
        size
    }

    /// The paragraph `width` wide with its lines read from the text server: the glyphs of each line and the facts of the layout, as they
    /// were when painting last read them if the paragraph has not been shaped again since. Sets the paragraph's width.
    fn shaped(&self, width: f32) -> Result<Rc<ShapedParagraph>, TextLayoutError> {
        if let Some(shaped) = self.shaped.borrow().as_ref()
            && shaped.is_of(&self.paragraph, width)?
        {
            return Ok(Rc::clone(shaped));
        }
        let shaped = Rc::new(GodotParagraph::shape(&self.paragraph, width)?);
        *self.shaped.borrow_mut() = Some(Rc::clone(&shaped));
        Ok(shaped)
    }

    /// The layout of this paragraph as it is drawn at `origin`, `width` wide, with the white space a line ends with left out
    /// of its width (as a browser lets it hang).
    fn layout(&self, origin: Vector2, width: f32) -> Result<GodotTextLayout, String> {
        let source = GodotParagraph::lay_out(&self.paragraph, width)
            .map_err(|error| error.to_string())?
            .hanging_spaces()
            .with_shaped(self.shaped(width).map_err(|error| error.to_string())?);
        TextLayout::new(source, origin, self.extents_of_empty_line())
            .map_err(|error| error.to_string())
    }

    /// Draw the backgrounds of the spans: under the selection highlight and under the text. A span's background fills the
    /// content area of its text (the font's rounded ascent above the baseline, its descent below), not the line box, and its
    /// edges are whole logical pixels, as Chrome paints it.
    pub(crate) fn draw_backgrounds(
        &mut self,
        canvas: Rid,
        origin: Vector2,
        width: f32,
        oversampling: f32,
    ) {
        let Some(rich) = self.rich.clone() else {
            return;
        };
        if rich.backgrounds.is_empty() {
            return;
        }
        self.paragraph.set_width(width);
        let result = self.layout(origin, width).and_then(|layout| {
            let (above, below) = self.font.chrome_extents();
            let mut server = RenderingServer::singleton();
            for (range, color) in &rich.backgrounds {
                for run in layout
                    .selection_rects(range.start, range.end)
                    .map_err(|error| error.to_string())?
                {
                    let line = layout.line(run.line).map_err(|error| error.to_string())?;
                    let baseline = (line.origin.y * oversampling).round() / oversampling;
                    let left = run.rect.position.x.round();
                    let right = (run.rect.position.x + run.rect.size.x).round();
                    server.canvas_item_add_rect(
                        canvas,
                        Rect2::new(
                            Vector2::new(left, baseline - above),
                            Vector2::new(right - left, above + below),
                        ),
                        *color,
                    );
                }
            }
            Ok(())
        });
        if let Err(error) = result {
            godot_error!("StyledParagraph: cannot draw the backgrounds: {error}");
        }
    }

    /// Draw the text with its first line's top left at `origin` in `canvas`, `width` wide, and its decoration lines. Returns the
    /// baked pictures the decorations use, which the caller keeps for as long as the item shows them.
    ///
    /// A paragraph that needs nothing `TextParagraph::draw` does not do is drawn by it. One that does (its glyphs are not
    /// those of the font that shaped it, some are in colours of their own, it has decorations, or its lines are not on whole
    /// pixels) is drawn line by line from its layout, which places the lines as `TextParagraph::draw` does.
    pub(crate) fn draw(
        &mut self,
        canvas: Rid,
        origin: Vector2,
        width: f32,
        color: Color,
        oversampling: f32,
    ) -> Vec<Lease> {
        self.paragraph.set_width(width);
        let fractional_lines = self.line_box.is_some_and(|line_box| line_box.gap != 0.0);
        // `TextParagraph::draw` aligns a line by its width with the space it ends with; the layout aligns it without (as a
        // browser lets that space hang), so a centred or right aligned text that wraps is drawn where the layout puts its
        // lines. A text on one line has no space at a wrap to hang.
        let hangs = matches!(self.style.alignment, Alignment::Center | Alignment::Right)
            && self.paragraph.get_line_count() > 1;
        // A line box puts a baseline on a whole logical pixel, which is a whole device pixel only when the oversampling is a
        // whole number: 33 px at 1.5 is row 49.5, which splits the ends of the glyphs across two rows. `draw_lines` snaps
        // each baseline to a device pixel.
        let baselines_off_device_pixels =
            (oversampling - oversampling.round()).abs() > WHOLE_OVERSAMPLING_TOLERANCE;
        if !self.draws_glyphs()
            && !self.is_decorated()
            && !fractional_lines
            && !hangs
            && !baselines_off_device_pixels
        {
            self.paragraph
                .draw_ex(canvas, origin)
                .color(color)
                .oversampling(oversampling)
                .done();
            return Vec::new();
        }
        match self.draw_lines(canvas, origin, width, color, oversampling) {
            Ok(leases) => leases,
            Err(error) => {
                godot_error!("StyledParagraph: cannot draw the text: {error}");
                Vec::new()
            }
        }
    }

    /// Whether the glyphs are drawn one at a time: the font tracks, or spans give some a colour of their own.
    fn draws_glyphs(&self) -> bool {
        self.font.tracked || self.rich.as_ref().is_some_and(|rich| rich.draws_glyphs())
    }

    /// Whether the text is shaped with fonts that carry letter-spacing and drawn with fonts that do not.
    fn tracks(&self) -> bool {
        self.font.tracked
            || self
                .rich
                .as_ref()
                .is_some_and(|rich| rich.fonts.iter().any(|font| font.tracked))
    }

    /// The pairs of fonts for the glyphs of fonts the text server found by itself, which `fonts` (the paragraph's own pairs of shaping and
    /// drawing fonts) does not list: the text shaped again with the drawing fonts (see `found.rs`). Nothing for a paragraph whose glyphs
    /// are all in the fonts it lists, which shapes nothing again.
    fn found_draw_fonts(
        &self,
        server: &mut Gd<TextServer>,
        shaped: &ShapedParagraph,
        fonts: &[(Rid, Rid)],
    ) -> Result<Vec<(Rid, Rid)>, String> {
        let glyphs = || shaped.lines.iter().flat_map(|line| line.glyphs.iter());
        if !found::has_found_font(glyphs(), fonts) {
            return Ok(Vec::new());
        }
        let size = i64::from(self.style.font_size);
        let again = server.create_shaped_text();
        for (text, font) in self.runs_to_draw_with()? {
            let added = server
                .shaped_text_add_string_ex(again, text.as_str(), &font.get_rids(), size)
                .opentype_features(&font.get_opentype_features())
                .done();
            if !added {
                server.free_rid(again);
                return Err("the text server did not take the text to shape it again".into());
            }
        }
        let untracked = read_glyphs(server, again).map_err(|error| error.to_string());
        server.free_rid(again);
        found::draw_fonts_of_found(glyphs(), fonts, &untracked?)
    }

    /// The runs of the text with the font that draws each, in order.
    fn runs_to_draw_with(&self) -> Result<Vec<(String, Gd<Font>)>, String> {
        if let Some(rich) = &self.rich {
            let characters: Vec<char> = rich.text.display.chars().collect();
            return Ok(rich
                .text
                .font_runs
                .iter()
                .zip(&rich.fonts)
                .map(|(run, font)| {
                    (
                        characters[run.range.clone()].iter().collect(),
                        font.draw.clone(),
                    )
                })
                .collect());
        }
        let text = self
            .plain_text
            .as_ref()
            .ok_or("a text whose font tracks keeps its text")?;
        Ok(vec![(text.to_string(), self.font.draw.clone())])
    }

    fn is_decorated(&self) -> bool {
        !self.decorations.is_empty() || self.rich.as_ref().is_some_and(|rich| rich.is_decorated())
    }

    /// The fragments the decorations are drawn per. Without spans a line is one; with them each stretch of a span on a line is
    /// (a pattern starts again at every one).
    fn decorated_fragments(
        &self,
        layout: &GodotTextLayout,
        oversampling: f32,
    ) -> Result<Vec<draw::DecoratedFragment>, String> {
        let baseline =
            |line: &crate::text_layout::Line| (line.origin.y * oversampling).round() / oversampling;
        let Some(rich) = &self.rich else {
            return Ok(layout
                .lines()
                .iter()
                .filter(|line| !line.after_final_break && !line.range.is_empty())
                .map(|line| draw::DecoratedFragment {
                    fragment: Fragment {
                        left: line.origin.x,
                        right: line.origin.x + line.width,
                        baseline: baseline(line),
                    },
                    decorations: self.decorations.clone(),
                })
                .collect());
        };
        let lines: Vec<std::ops::Range<usize>> = layout
            .lines()
            .iter()
            .map(|line| {
                if line.after_final_break {
                    0..0
                } else {
                    line.range.clone()
                }
            })
            .collect();
        let mut found = Vec::new();
        for piece in fragments(&rich.text.segments, &lines) {
            let runs = layout
                .selection_rects(piece.range.start, piece.range.end)
                .map_err(|error| error.to_string())?;
            let mut extent: Option<(f32, f32)> = None;
            for run in runs.iter().filter(|run| run.line == piece.line) {
                let (left, right) = (run.rect.position.x, run.rect.position.x + run.rect.size.x);
                extent = Some(
                    extent.map_or((left, right), |(from, to)| (from.min(left), to.max(right))),
                );
            }
            let Some((left, right)) = extent else {
                continue;
            };
            let line = layout.line(piece.line).map_err(|error| error.to_string())?;
            found.push(draw::DecoratedFragment {
                fragment: Fragment {
                    left,
                    right,
                    baseline: baseline(line),
                },
                decorations: rich.text.segments[piece.segment].style.decorations.clone(),
            });
        }
        Ok(found)
    }

    fn draw_lines(
        &mut self,
        canvas: Rid,
        origin: Vector2,
        width: f32,
        color: Color,
        oversampling: f32,
    ) -> Result<Vec<Lease>, String> {
        if !origin.x.is_finite() || !origin.y.is_finite() {
            return Err(TextLayoutError::NonFinite.to_string());
        }
        let shaped = self.shaped(width).map_err(|error| error.to_string())?;
        let mut server: Gd<TextServer> = TextServerManager::singleton()
            .get_primary_interface()
            .ok_or("there is no text server")?;
        // `TextParagraph::draw` clips every line to the paragraph's width (the widest line's when it has none).
        let clip_width = if width > 0.0 {
            width
        } else {
            self.paragraph.get_size().x
        };
        let size = self.style.font_size;
        let (ascent, _) = self.font.chrome_extents();
        let decoration_font = draw::decoration_font(
            size,
            ascent,
            self.font
                .draw
                .get_underline_thickness_ex()
                .font_size(size)
                .done(),
        );
        let mut leases = Vec::new();
        // The decorations are placed from the layout, which asks the text server where each fragment's glyphs are; a paragraph with none
        // has no use for it.
        let fragments = if self.is_decorated() {
            let layout = self.layout(origin, width)?;
            self.decorated_fragments(&layout, oversampling)?
        } else {
            Vec::new()
        };
        draw::draw_decorations(
            canvas,
            &fragments,
            decoration_font,
            oversampling,
            draw::Layer::Behind,
            &mut leases,
        );
        // The rids each glyph's font is drawn as: the node's font and, with spans, the fonts of the other runs.
        let mut fonts: Vec<(Rid, Rid)> = std::iter::once(&self.font)
            .chain(self.rich.iter().flat_map(|rich| rich.fonts.iter()))
            .flat_map(|font| {
                font.shape
                    .get_rids()
                    .iter_shared()
                    .zip(font.draw.get_rids().iter_shared())
                    .collect::<Vec<_>>()
            })
            .collect();
        if self.tracks() {
            let found = self.found_draw_fonts(&mut server, &shaped, &fonts)?;
            fonts.extend(found);
        }
        let glyphwise = self.draws_glyphs();
        let drawing = draw::LineDrawing {
            canvas,
            color,
            colors: self.rich.as_ref().map(|rich| &rich.colors),
            oversampling,
            fonts: &fonts,
        };
        // Where each line starts: `TextLayout` places them with this, and the lines after a final hard break (which has nothing to draw)
        // come after the ones drawn.
        let origins = place_lines(
            origin,
            shaped.facts.width,
            shaped.facts.alignment,
            shaped.facts.line_spacing,
            &shaped.facts.lines,
        );
        for (index, (line, line_origin)) in shaped.lines.iter().zip(origins).enumerate() {
            // The baseline is on a device pixel, as a browser draws it.
            let position = Vector2::new(
                line_origin.x,
                (line_origin.y * oversampling).round() / oversampling,
            );
            let clip_left = (origin.x - line_origin.x).max(0.0);
            if glyphwise {
                draw::draw_glyphs(
                    &mut server,
                    position,
                    (clip_left, clip_left + clip_width),
                    &drawing,
                    line,
                )?;
            } else {
                let rid = self
                    .paragraph
                    .get_line_rid(i32::try_from(index).map_err(|error| error.to_string())?);
                server
                    .shaped_text_draw_ex(rid, canvas, position)
                    .clip_l(f64::from(clip_left))
                    .clip_r(f64::from(clip_left + clip_width))
                    .color(color)
                    .oversampling(oversampling)
                    .done();
            }
        }
        draw::draw_decorations(
            canvas,
            &fragments,
            decoration_font,
            oversampling,
            draw::Layer::Over,
            &mut leases,
        );
        Ok(leases)
    }
}
