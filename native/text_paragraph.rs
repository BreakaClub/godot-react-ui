//! A node's shaped text: Godot's `TextParagraph` configured from the node's text style (`text_style/`), with what CSS adds to it
//! that the paragraph does not do by itself: line boxes with half-leading, letter-spacing in fractions of a pixel, decoration
//! lines, the way a clipped line ends. Everything that reads or draws a node's text goes through [`StyledParagraph`].

mod draw;

use godot::classes::text_server::{JustificationFlag, LineBreakFlag, OverrunBehavior, SpacingType};
use godot::classes::{TextParagraph, TextServer, TextServerManager};
use godot::global::HorizontalAlignment;
use godot::prelude::*;

use crate::fonts::ResolvedFont;
use crate::text_layout::{GodotParagraph, LineExtents, TextLayout};
use crate::text_style::TextDecoration;
use crate::text_style::metrics::LineBox;
use crate::text_style::resolve::{Alignment, LineHeight, ShapingStyle, Wrapping};

/// CSS `tab-size` initial value: a tab advances to the next multiple of this many spaces.
const TAB_SIZE_SPACES: f32 = 8.0;

/// The width Taffy offers a text, as it is measured.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) enum Offered {
    Definite(f32),
    /// The narrowest the text can be: as wide as its widest word (or its widest line if it cannot break).
    MinContent,
    /// The widest the text can be: its longest line.
    MaxContent,
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
        let mut paragraph = TextParagraph::new_gd();
        paragraph.set_break_flags(break_flags(style.wrapping, true));
        paragraph.set_alignment(alignment_of(style.alignment));
        if style.alignment == Alignment::Justify {
            // The last line of a justified paragraph is not stretched.
            paragraph.set_justification_flags(
                JustificationFlag::WORD_BOUND | JustificationFlag::SKIP_LAST_LINE,
            );
        }
        if style.ellipsis {
            paragraph.set_text_overrun_behavior(OverrunBehavior::TRIM_ELLIPSIS);
        }
        if let Some(lines) = style.line_clamp {
            paragraph.set_max_lines_visible(i32::try_from(lines).unwrap_or(i32::MAX));
        }
        if !text.is_empty() {
            assert!(
                paragraph.add_string(text, &font.shape, style.font_size),
                "Godot rejected validated text/font"
            );
        }
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
        Self {
            paragraph,
            font,
            style: style.clone(),
            line_box,
            decorations: Vec::new(),
        }
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
        let width = match offered {
            Offered::Definite(width) => width,
            Offered::MinContent => 0.0,
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

    /// Draw the text with its first line's top left at `origin` in `canvas`, `width` wide, and its decoration lines.
    ///
    /// A paragraph that needs nothing `TextParagraph::draw` does not do is drawn by it. One that does (its glyphs are not
    /// those of the font that shaped it, it has decorations, or its lines are not on whole pixels) is drawn line by line from
    /// its layout, which places the lines as `TextParagraph::draw` does.
    pub(crate) fn draw(
        &mut self,
        canvas: Rid,
        origin: Vector2,
        width: f32,
        color: Color,
        oversampling: f32,
    ) {
        self.paragraph.set_width(width);
        let fractional_lines = self.line_box.is_some_and(|line_box| line_box.gap != 0.0);
        if !self.font.tracked && self.decorations.is_empty() && !fractional_lines {
            self.paragraph
                .draw_ex(canvas, origin)
                .color(color)
                .oversampling(oversampling)
                .done();
            return;
        }
        if let Err(error) = self.draw_lines(canvas, origin, width, color, oversampling) {
            godot_error!("StyledParagraph: cannot draw the text: {error}");
        }
    }

    fn draw_lines(
        &mut self,
        canvas: Rid,
        origin: Vector2,
        width: f32,
        color: Color,
        oversampling: f32,
    ) -> Result<(), String> {
        let source =
            GodotParagraph::lay_out(&self.paragraph, width).map_err(|error| error.to_string())?;
        let layout = TextLayout::new(source, origin, self.extents_of_empty_line())
            .map_err(|error| error.to_string())?;
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
        let (ascent, _) = self.font.extents();
        let decoration_font = draw::decoration_font(
            size,
            ascent,
            self.font
                .draw
                .get_underline_thickness_ex()
                .font_size(size)
                .done(),
        );
        let mut decorated = Vec::new();
        for (index, line) in layout.lines().iter().enumerate() {
            if line.after_final_break || line.range.is_empty() {
                continue;
            }
            let rid = self
                .paragraph
                .get_line_rid(i32::try_from(index).map_err(|error| error.to_string())?);
            let hanging = if self.decorations.is_empty() {
                0.0
            } else {
                draw::trailing_space_width(&server, rid)?
            };
            decorated.push(draw::DecoratedLine {
                origin: line.origin,
                width: (line.width - hanging).max(0.0),
            });
        }
        draw::draw_decorations(
            canvas,
            &self.decorations,
            &decorated,
            decoration_font,
            oversampling,
            draw::Layer::Behind,
        );
        let fonts: Vec<(Rid, Rid)> = self
            .font
            .shape
            .get_rids()
            .iter_shared()
            .zip(self.font.draw.get_rids().iter_shared())
            .collect();
        let drawing = draw::LineDrawing {
            canvas,
            color,
            oversampling,
            fonts: &fonts,
        };
        for (index, line) in layout.lines().iter().enumerate() {
            if line.after_final_break {
                continue;
            }
            let rid = self
                .paragraph
                .get_line_rid(i32::try_from(index).map_err(|error| error.to_string())?);
            // The baseline is on a device pixel, as a browser draws it.
            let position = Vector2::new(
                line.origin.x,
                (line.origin.y * oversampling).round() / oversampling,
            );
            let clip_left = (origin.x - line.origin.x).max(0.0);
            if self.font.tracked {
                draw::draw_glyphs(
                    &mut server,
                    rid,
                    position,
                    (clip_left, clip_left + clip_width),
                    &drawing,
                )?;
            } else {
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
            &self.decorations,
            &decorated,
            decoration_font,
            oversampling,
            draw::Layer::Over,
        );
        Ok(())
    }
}
