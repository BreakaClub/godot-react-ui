//! Runtime verification of `text_layout.rs` against a running Godot. Compiled only with
//! `--features probe` (`pnpm build:native --probe`); default builds do not contain it.
//!
//! The geometry's own logic is unit-tested against a fake paragraph. What only the engine can answer is
//! checked here, on real `TextParagraph`s built the way the renderer builds them
//! (`paint::build_paragraph`): the carets, selection runs, hit tests and word breaks of the text server,
//! the line placement against what `TextParagraph::draw` puts on the canvas, and the adapters under a
//! real `EditBuffer`. [`ReactUiTextLayoutProbe`] is a `Control` that draws one case at a time (text,
//! optionally with the geometry drawn over it) and answers [`ReactUiTextLayoutProbe::verify`] with a JSON
//! report. `demo/src/text-layout-probe.ts` owns it and `demo/src/verify-text-layout.ts` reads the report,
//! reads back pixels for the draw-parity check and saves the captures.
//!
//! Every case is checked with left, centre and right alignment, in a panel of its own. The probe takes
//! no input of any kind: it only reads geometry and draws.

mod cases;
mod checks;
mod ink;

use godot::classes::control::MouseFilter;
use godot::classes::text_server::LineBreakFlag;
use godot::classes::{Control, Font, IControl, Image, TextParagraph, ThemeDb};
use godot::global::HorizontalAlignment;
use godot::prelude::*;

use crate::computed_style::ComputedStyle;
use crate::paint::build_paragraph;
use crate::props::{StyleSpec, TextAlignSpec};
use crate::text_layout::{
    GodotParagraph, GodotTextLayout, LineExtents, TextAlignment, TextDirection, TextLayout,
};
use cases::{CASES, CaseSpec};
use checks::Report;

/// The font size of every case.
const FONT_SIZE: i32 = 22;
const PAGE_MARGIN: f32 = 16.0;
const PANEL_PADDING: f32 = 12.0;
const PANEL_GAP: f32 = 10.0;
const TITLE_BASELINE: f32 = 20.0;
const TITLE_HEIGHT: f32 = 30.0;
const TITLE_FONT_SIZE: i32 = 14;
const CARET_WIDTH: f32 = 1.0;
const OUTLINE_WIDTH: f32 = 1.0;
const SELECTION_COLOR: Color = Color::from_rgba(0.25, 0.5, 1.0, 0.35);
const TEXT_COLOR: Color = Color::from_rgba(0.0, 0.0, 0.0, 1.0);
const PANEL_COLOR: Color = Color::from_rgba(1.0, 1.0, 1.0, 1.0);
const TITLE_COLOR: Color = Color::from_rgba(0.2, 0.2, 0.25, 1.0);
const CONTENT_OUTLINE_COLOR: Color = Color::from_rgba(0.6, 0.6, 0.6, 1.0);
const LINE_OUTLINE_COLOR: Color = Color::from_rgba(0.55, 0.75, 1.0, 1.0);
/// The caret half that follows the grapheme before the offset (Godot's "leading" caret).
const LEADING_CARET_COLOR: Color = Color::from_rgba(0.85, 0.1, 0.1, 1.0);
/// The caret half that precedes the grapheme at the offset ("trailing").
const TRAILING_CARET_COLOR: Color = Color::from_rgba(0.1, 0.65, 0.2, 1.0);
const CURSOR_WIDTH: f32 = 2.0;
const CURSOR_COLOR: Color = Color::from_rgba(0.9, 0.0, 0.8, 1.0);

const ALIGNMENTS: [TextAlignment; 3] = [
    TextAlignment::Left,
    TextAlignment::Center,
    TextAlignment::Right,
];

fn alignment_name(alignment: TextAlignment) -> &'static str {
    match alignment {
        TextAlignment::Left => "left",
        TextAlignment::Center => "center",
        TextAlignment::Right => "right",
    }
}

/// One paragraph in one alignment, laid out where it is drawn.
struct Panel {
    alignment: TextAlignment,
    /// The white box the paragraph sits in.
    outer: Rect2,
    /// Where the paragraph is drawn.
    origin: Vector2,
    paragraph: Gd<TextParagraph>,
    layout: GodotTextLayout,
}

/// A paragraph configured as `paint::build_paragraph` configures one. That function builds none for an
/// empty text (the renderer draws nothing for it), so for an empty case the same settings are applied to
/// an empty paragraph, as a text input's empty value will need.
fn paragraph_for(font: &Gd<Font>, text: &str, alignment: TextAlignment) -> Gd<TextParagraph> {
    let text_align = match alignment {
        TextAlignment::Left => TextAlignSpec::Left,
        TextAlignment::Center => TextAlignSpec::Center,
        TextAlignment::Right => TextAlignSpec::Right,
    };
    let computed = ComputedStyle(StyleSpec {
        text_align: Some(text_align),
        font_size: Some(FONT_SIZE),
        ..StyleSpec::default()
    });
    build_paragraph(font, text, &computed).unwrap_or_else(|| {
        let mut paragraph = TextParagraph::new_gd();
        paragraph.set_break_flags(
            LineBreakFlag::MANDATORY | LineBreakFlag::WORD_BOUND | LineBreakFlag::ADAPTIVE,
        );
        paragraph.set_alignment(match alignment {
            TextAlignment::Left => HorizontalAlignment::LEFT,
            TextAlignment::Center => HorizontalAlignment::CENTER,
            TextAlignment::Right => HorizontalAlignment::RIGHT,
        });
        paragraph
    })
}

/// The three panels of a case, stacked below the page title.
fn build_panels(font: &Gd<Font>, spec: &CaseSpec) -> Result<Vec<Panel>, String> {
    let text = spec.text();
    let empty_line = LineExtents {
        ascent: font.get_ascent_ex().font_size(FONT_SIZE).done(),
        descent: font.get_descent_ex().font_size(FONT_SIZE).done(),
    };
    let mut top = PAGE_MARGIN + TITLE_HEIGHT;
    let mut panels = Vec::new();
    for alignment in ALIGNMENTS {
        let paragraph = paragraph_for(font, &text, alignment);
        let source = GodotParagraph::lay_out(&paragraph, spec.width).map_err(|e| e.to_string())?;
        let origin = Vector2::new(PAGE_MARGIN + PANEL_PADDING, top + PANEL_PADDING);
        let layout = TextLayout::new(source, origin, empty_line).map_err(|e| e.to_string())?;
        let bottom = layout
            .lines()
            .last()
            .map_or(origin.y, |line| line.top() + line.height());
        let outer = Rect2::new(
            Vector2::new(PAGE_MARGIN, top),
            Vector2::new(
                spec.box_width() + 2.0 * PANEL_PADDING,
                bottom - origin.y + 2.0 * PANEL_PADDING,
            ),
        );
        top = outer.position.y + outer.size.y + PANEL_GAP;
        panels.push(Panel {
            alignment,
            outer,
            origin,
            paragraph,
            layout,
        });
    }
    Ok(panels)
}

/// Draws the cases of `text_layout.rs` and reports what the text server says about them.
#[derive(GodotClass)]
#[class(base = Control)]
pub struct ReactUiTextLayoutProbe {
    base: Base<Control>,
    font: Option<Gd<Font>>,
    case: usize,
    overlays: bool,
}

#[godot_api]
impl IControl for ReactUiTextLayoutProbe {
    fn init(base: Base<Control>) -> Self {
        Self {
            base,
            font: None,
            case: 0,
            overlays: false,
        }
    }

    fn ready(&mut self) {
        // The font the renderer's root takes (`ReactUiRoot::ready`).
        self.font = self
            .base()
            .get_theme_default_font()
            .or_else(|| ThemeDb::singleton().get_fallback_font());
        // No input of any kind reaches the probe.
        self.base_mut().set_mouse_filter(MouseFilter::IGNORE);
    }

    fn draw(&mut self) {
        let Some(font) = self.font.clone() else {
            return;
        };
        let Some(spec) = CASES.get(self.case) else {
            return;
        };
        let panels = match build_panels(&font, spec) {
            Ok(panels) => panels,
            Err(error) => {
                godot_error!(
                    "text layout probe: {} cannot be laid out: {error}",
                    spec.name
                );
                return;
            }
        };
        let canvas = self.base().get_canvas_item();
        self.base()
            .draw_string_ex(
                &font,
                Vector2::new(PAGE_MARGIN, PAGE_MARGIN + TITLE_BASELINE),
                &GString::from(spec.name),
            )
            .font_size(TITLE_FONT_SIZE)
            .modulate(TITLE_COLOR)
            .done();
        let boundaries = spec.boundaries();
        for panel in &panels {
            self.base_mut().draw_rect(panel.outer, PANEL_COLOR);
            if self.overlays {
                self.draw_underlay(spec, panel, &boundaries);
            }
            panel
                .paragraph
                .draw_ex(canvas, panel.origin)
                .color(TEXT_COLOR)
                .done();
            if self.overlays {
                self.draw_overlay(spec, panel, &boundaries);
            }
        }
    }
}

impl ReactUiTextLayoutProbe {
    /// What goes under the text: the content box, the line boxes and the selection.
    fn draw_underlay(&mut self, spec: &CaseSpec, panel: &Panel, boundaries: &[usize]) {
        let content = Rect2::new(
            Vector2::new(panel.origin.x, panel.outer.position.y + PANEL_PADDING),
            Vector2::new(spec.box_width(), panel.outer.size.y - 2.0 * PANEL_PADDING),
        );
        self.outline(content, CONTENT_OUTLINE_COLOR);
        for line in panel.layout.lines() {
            self.outline(line.rect(), LINE_OUTLINE_COLOR);
        }
        let (from, to) = spec.selected;
        match panel
            .layout
            .selection_rects(boundaries[from], boundaries[to])
        {
            Ok(runs) => {
                for run in runs {
                    self.base_mut().draw_rect(run.rect, SELECTION_COLOR);
                }
            }
            Err(error) => {
                godot_error!("text layout probe: selection of {}: {error}", spec.name);
            }
        }
    }

    /// What goes over the text: every grapheme boundary's carets and the cursor.
    fn draw_overlay(&mut self, spec: &CaseSpec, panel: &Panel, boundaries: &[usize]) {
        for offset in boundaries {
            match panel.layout.carets(*offset) {
                Ok(carets) => {
                    if let Some(caret) = carets.leading {
                        self.base_mut()
                            .draw_rect(caret.rect(CARET_WIDTH), LEADING_CARET_COLOR);
                    }
                    if let Some(caret) = carets.trailing {
                        self.base_mut()
                            .draw_rect(caret.rect(CARET_WIDTH), TRAILING_CARET_COLOR);
                    }
                }
                Err(error) => {
                    godot_error!(
                        "text layout probe: carets of {} at {offset}: {error}",
                        spec.name
                    );
                }
            }
        }
        match panel
            .layout
            .caret(boundaries[spec.caret], TextDirection::Ltr)
        {
            Ok(caret) => self
                .base_mut()
                .draw_rect(caret.rect(CURSOR_WIDTH), CURSOR_COLOR),
            Err(error) => {
                godot_error!("text layout probe: cursor of {}: {error}", spec.name);
            }
        }
    }

    fn outline(&mut self, rect: Rect2, color: Color) {
        self.base_mut()
            .draw_rect_ex(rect, color)
            .filled(false)
            .width(OUTLINE_WIDTH)
            .done();
    }
}

#[godot_api]
impl ReactUiTextLayoutProbe {
    /// The number of cases.
    #[func]
    fn case_count(&self) -> i64 {
        i64::try_from(CASES.len()).expect("the case table is small")
    }

    #[func]
    fn case_name(&self, index: i64) -> GString {
        usize::try_from(index)
            .ok()
            .and_then(|index| CASES.get(index))
            .map_or_else(GString::new, |spec| GString::from(spec.name))
    }

    /// Draw a case, with the geometry over it or without. Returns whether the case exists.
    #[func]
    fn show_case(&mut self, index: i64, overlays: bool) -> bool {
        let Some(index) = usize::try_from(index)
            .ok()
            .filter(|index| *index < CASES.len())
        else {
            return false;
        };
        self.case = index;
        self.overlays = overlays;
        self.base_mut().queue_redraw();
        true
    }

    /// Every geometry check on every case, as a JSON report (`{"checks": [...]}`).
    #[func]
    fn verify(&mut self) -> GString {
        let mut report = Report::default();
        match self.font.clone() {
            Some(font) => {
                for spec in CASES {
                    checks::verify_case(&mut report, &font, spec);
                }
                checks::verify_globally(&mut report, &font);
            }
            None => report.fail_globally("probe", "the probe has no font (it was not ready)"),
        }
        GString::from(&report.to_json())
    }

    /// The draw-parity check on the case being shown without overlays: the pixels `image` (the
    /// viewport's) holds against the line boxes. A JSON report like [`Self::verify`].
    #[func]
    fn check_ink(&self, image: Gd<Image>) -> GString {
        let mut report = Report::default();
        match (&self.font, CASES.get(self.case)) {
            (Some(font), Some(spec)) => {
                ink::check_case(&mut report, font, spec, &image, self.base().get_size());
            }
            _ => report.fail_globally("probe", "no case is shown"),
        }
        GString::from(&report.to_json())
    }
}
