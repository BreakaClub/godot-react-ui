//! The draw-parity check: the pixels `TextParagraph::draw` puts on the canvas against the line boxes
//! `text_layout.rs` computed. The line origins are a replica of the engine's own arithmetic, so the
//! only oracle that is not the same arithmetic is the ink. The case is drawn without overlays, black on
//! white, and each line's ink must sit inside its box and nearly span it.

use godot::classes::image::Format;
use godot::classes::{Font, Image};
use godot::prelude::*;

use super::cases::CaseSpec;
use super::checks::Report;
use super::{FONT_SIZE, Panel, alignment_name, build_panels};

/// Pixels darker than this (average of red, green and blue, 0 to 255) are ink.
const INK_THRESHOLD: u32 = 128;
/// Glyphs overhang their line box a little: an italic's slant, an accent over the ascent.
const HORIZONTAL_OVERHANG_PX: f32 = 2.0;
/// Emoji glyphs are taller than the font's ascent and descent.
const VERTICAL_OVERHANG_PX: f32 = 6.0;
/// The part of a line, up from its baseline, whose ink is compared across the box: the x-height band,
/// which holds the body of most glyphs and none of the neighbouring line's accents or descenders.
const BODY_BAND_OF_ASCENT: f32 = 0.4;
/// The negative control only runs where alignment moved a line at least this far.
const CONTROL_MIN_SHIFT_PX: f32 = 30.0;
/// A line's ink starts within this many font sizes of its box's left edge, and ends within it of the right
/// (a space at either end has no ink).
const SPAN_SLACK_IN_FONT_SIZES: f32 = 1.0;

/// The bounding box of ink in a region, in pixels (`right` and `bottom` inclusive).
#[derive(Clone, Copy, Debug)]
struct InkBox {
    left: usize,
    top: usize,
    right: usize,
    bottom: usize,
}

struct Pixels<'a> {
    data: &'a [u8],
    width: usize,
    height: usize,
}

impl Pixels<'_> {
    fn is_ink(&self, x: usize, y: usize) -> bool {
        let at = (y * self.width + x) * 4;
        match self.data.get(at..at + 3) {
            Some(rgb) => {
                rgb.iter().map(|channel| u32::from(*channel)).sum::<u32>() / 3 < INK_THRESHOLD
            }
            None => false,
        }
    }

    /// The ink in the pixel rectangle `x0..x1` by `y0..y1`, clipped to the image.
    fn ink_in(&self, x0: usize, x1: usize, y0: usize, y1: usize) -> Option<InkBox> {
        let mut found: Option<InkBox> = None;
        for y in y0..y1.min(self.height) {
            for x in x0..x1.min(self.width) {
                if self.is_ink(x, y) {
                    found = Some(match found {
                        None => InkBox {
                            left: x,
                            top: y,
                            right: x,
                            bottom: y,
                        },
                        Some(ink) => InkBox {
                            left: ink.left.min(x),
                            top: ink.top.min(y),
                            right: ink.right.max(x),
                            bottom: ink.bottom.max(y),
                        },
                    });
                }
            }
        }
        found
    }
}

/// A float pixel position as a pixel index (never below 0).
fn pixel(value: f32) -> usize {
    value.max(0.0).round() as usize
}

pub(super) fn check_case(
    report: &mut Report,
    font: &Gd<Font>,
    spec: &CaseSpec,
    image: &Gd<Image>,
    viewport: Vector2,
) {
    let panels = match build_panels(font, spec) {
        Ok(panels) => panels,
        Err(error) => {
            report.fail(spec.name, "-", "draw-parity", error);
            return;
        }
    };
    let mut image = image.clone();
    image.convert(Format::RGBA8);
    let (width, height) = (
        usize::try_from(image.get_width()).unwrap_or(0),
        usize::try_from(image.get_height()).unwrap_or(0),
    );
    let data = image.get_data();
    let pixels = Pixels {
        data: data.as_slice(),
        width,
        height,
    };
    // The page is drawn in logical units; the image may be larger by the display's scale.
    let scale = if viewport.x > 0.0 {
        width as f32 / viewport.x
    } else {
        0.0
    };
    for panel in &panels {
        let alignment = alignment_name(panel.alignment);
        let lines = boxes(panel);
        match panel_ink(spec, panel.outer, &lines, &pixels, scale) {
            Ok(detail) => report.pass(spec.name, alignment, "draw-parity", detail),
            Err(detail) => report.fail(spec.name, alignment, "draw-parity", detail),
        }
        // Negative control: the same comparison against the left-aligned panel's boxes (moved down to
        // this panel) must fail wherever alignment moved a line far enough to tell. With no ink there is
        // nothing for the comparison to disagree with.
        if spec.parts.is_empty() {
            continue;
        }
        let Some(left) = panels
            .first()
            .filter(|left| left.alignment != panel.alignment)
        else {
            continue;
        };
        let left_boxes = boxes(left);
        let shift_y = panel.origin.y - left.origin.y;
        let widest_shift = lines
            .iter()
            .zip(&left_boxes)
            .map(|(aligned, flush)| (aligned.origin.x - flush.origin.x).abs())
            .fold(0.0, f32::max);
        if widest_shift <= CONTROL_MIN_SHIFT_PX {
            continue;
        }
        let wrong: Vec<LineBox> = left_boxes
            .iter()
            .map(|flush| LineBox {
                origin: flush.origin + Vector2::new(0.0, shift_y),
                ..*flush
            })
            .collect();
        match panel_ink(spec, panel.outer, &wrong, &pixels, scale) {
            Err(detail) => report.pass(
                spec.name,
                alignment,
                "draw-parity-control",
                format!("boxes {widest_shift}px off are rejected: {detail}"),
            ),
            Ok(_) => report.fail(
                spec.name,
                alignment,
                "draw-parity-control",
                format!("boxes {widest_shift}px from the ink were accepted: the check cannot fail"),
            ),
        }
    }
}

/// A shaped line's box as the pixel check sees it.
#[derive(Clone, Copy)]
struct LineBox {
    /// The left end of the glyphs, on the baseline.
    origin: Vector2,
    ascent: f32,
    width: f32,
    height: f32,
}

impl LineBox {
    fn top(&self) -> f32 {
        self.origin.y - self.ascent
    }
}

/// The boxes of the lines the paragraph shaped (the layout's empty line after a final break has no ink).
fn boxes(panel: &Panel) -> Vec<LineBox> {
    panel
        .layout
        .lines()
        .iter()
        .filter(|line| !line.after_final_break)
        .map(|line| LineBox {
            origin: line.origin,
            ascent: line.ascent,
            width: line.width,
            height: line.height(),
        })
        .collect()
}

fn panel_ink(
    spec: &CaseSpec,
    outer: Rect2,
    lines: &[LineBox],
    pixels: &Pixels<'_>,
    scale: f32,
) -> Result<String, String> {
    if scale <= 0.0 || pixels.width == 0 {
        return Err("the image is empty".to_owned());
    }
    let (x0, x1) = (
        pixel(outer.position.x * scale),
        pixel((outer.position.x + outer.size.x) * scale),
    );
    let (y0, y1) = (
        pixel(outer.position.y * scale),
        pixel((outer.position.y + outer.size.y) * scale),
    );
    let mut failures = Vec::new();
    let mut lines_with_ink = 0;
    let overhang_x = HORIZONTAL_OVERHANG_PX * scale;
    // All the ink of the panel is inside the lines' boxes.
    match (pixels.ink_in(x0, x1, y0, y1), lines.first(), lines.last()) {
        (Some(ink), Some(first), Some(last)) => {
            let (top, bottom) = (
                (first.top() - VERTICAL_OVERHANG_PX) * scale,
                (last.top() + last.height + VERTICAL_OVERHANG_PX) * scale,
            );
            if (ink.top as f32) < top || (ink.bottom as f32) > bottom {
                failures.push(format!(
                    "ink rows {}..{} are outside the lines' {top:.0}..{bottom:.0}",
                    ink.top, ink.bottom
                ));
            }
        }
        (None, ..) if spec.parts.is_empty() => {}
        (None, ..) => failures.push("the panel has no ink".to_owned()),
        (Some(_), None, _) | (Some(_), _, None) => failures.push("ink with no line".to_owned()),
    }
    for (index, line) in lines.iter().enumerate() {
        let body_top = line.origin.y - BODY_BAND_OF_ASCENT * line.ascent;
        let Some(ink) = pixels.ink_in(
            x0,
            x1,
            pixel(body_top * scale),
            pixel(line.origin.y * scale) + 1,
        ) else {
            continue;
        };
        lines_with_ink += 1;
        let (left, right) = (line.origin.x * scale, (line.origin.x + line.width) * scale);
        let slack = SPAN_SLACK_IN_FONT_SIZES * FONT_SIZE as f32 * scale;
        let (ink_left, ink_right) = (ink.left as f32, ink.right as f32 + 1.0);
        if ink_left < left - overhang_x || ink_right > right + overhang_x {
            failures.push(format!(
                "line {index}: ink {ink_left:.0}..{ink_right:.0} is outside its box {left:.0}..{right:.0}"
            ));
        }
        if ink_left > left + slack || ink_right < right - slack {
            failures.push(format!(
                "line {index}: ink {ink_left:.0}..{ink_right:.0} does not span its box {left:.0}..{right:.0}"
            ));
        }
    }
    if failures.is_empty() {
        Ok(format!(
            "{lines_with_ink} of {} lines have ink, all in their boxes",
            lines.len()
        ))
    } else {
        Err(failures.join("; "))
    }
}
