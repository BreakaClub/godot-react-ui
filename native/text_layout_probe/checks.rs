//! The geometry checks: what the text server and the engine say, against what `text_layout.rs`
//! answers and against facts known about the case without asking Godot (its graphemes and words).

use std::fmt::Display;

use godot::classes::text_server::Orientation;
use godot::classes::{Font, TextParagraph, TextServerManager};
use godot::global::HorizontalAlignment;
use godot::prelude::*;
use serde::Serialize;

use super::cases::{CaseSpec, Flow, expected_word_range, expected_words};
use super::{Panel, alignment_name, build_panels};
use crate::text_input::{
    Direction, EditBuffer, EditCommand, EditConfig, EditEnvironment, EditError,
};
use crate::text_layout::{
    Caret, GodotParagraph, GodotTextLayout, Line, LineExtents, TextDirection, TextLayout,
    TextLayoutError, Unsupported,
};

/// Failures listed per check; the rest are only counted.
const MAX_REPORTED_FAILURES: usize = 6;
/// Two x positions this close are the same place (the server's carets are floats of integer-ish
/// advances).
const SAME_X_TOLERANCE: f32 = 0.5;
/// How far the engine's own aggregate size may differ from the sum of the lines' ascent and descent:
/// `get_size` sums sizes the server rounds up.
const SIZE_TOLERANCE_PER_LINE: f32 = 1.0;
/// A point this far outside a line is outside it, whatever the font.
const FAR_OUTSIDE: f32 = 1000.0;
/// How far inside its grapheme a caret is probed: less than half of the narrowest glyph's advance.
const PROBE_INSET_PX: f32 = 1.0;
/// Grapheme pairs are all tried up to this many boundaries; larger cases use a stride.
const MAX_SELECTION_BOUNDARIES: usize = 120;
/// A width a test paragraph wraps at, and one it does not.
const NARROW_PX: f32 = 50.0;
const WIDE_PX: f32 = 1000.0;
/// The line spacing the spacing check sets.
const LINE_SPACING_PX: f32 = 6.0;
/// The lines a page move goes in the adapter checks.
const PAGE_LINES: f32 = 3.0;

/// One check's result: a summary when it passed, the first failures when it did not.
type Outcome = Result<String, String>;

#[derive(Serialize)]
pub(super) struct Check {
    case: String,
    alignment: &'static str,
    name: &'static str,
    ok: bool,
    detail: String,
}

#[derive(Default)]
pub(super) struct Report {
    checks: Vec<Check>,
}

impl Report {
    fn record(
        &mut self,
        case: &str,
        alignment: &'static str,
        name: &'static str,
        outcome: Outcome,
    ) {
        let (ok, detail) = match outcome {
            Ok(detail) => (true, detail),
            Err(detail) => (false, detail),
        };
        self.checks.push(Check {
            case: case.to_owned(),
            alignment,
            name,
            ok,
            detail,
        });
    }

    pub(super) fn pass(
        &mut self,
        case: &str,
        alignment: &'static str,
        name: &'static str,
        detail: String,
    ) {
        self.record(case, alignment, name, Ok(detail));
    }

    pub(super) fn fail(
        &mut self,
        case: &str,
        alignment: &'static str,
        name: &'static str,
        detail: String,
    ) {
        self.record(case, alignment, name, Err(detail));
    }

    pub(super) fn fail_globally(&mut self, name: &'static str, detail: &str) {
        self.record("(all)", "-", name, Err(detail.to_owned()));
    }

    pub(super) fn to_json(&self) -> String {
        serde_json::json!({ "checks": self.checks }).to_string()
    }
}

/// Failures of one check: the first few kept, all counted.
struct Failures {
    messages: Vec<String>,
    count: usize,
}

impl Failures {
    fn new() -> Self {
        Self {
            messages: Vec::new(),
            count: 0,
        }
    }

    fn add(&mut self, message: impl FnOnce() -> String) {
        if self.messages.len() < MAX_REPORTED_FAILURES {
            self.messages.push(message());
        }
        self.count += 1;
    }

    fn require(&mut self, condition: bool, message: impl FnOnce() -> String) {
        if !condition {
            self.add(message);
        }
    }

    fn finish(self, summary: impl FnOnce() -> String) -> Outcome {
        if self.count == 0 {
            Ok(summary())
        } else {
            let extra = self.count - self.messages.len();
            let more = if extra > 0 {
                format!(" (+{extra} more)")
            } else {
                String::new()
            };
            Err(format!("{}{more}", self.messages.join("; ")))
        }
    }
}

fn described(error: impl Display) -> String {
    error.to_string()
}

/// The facts of one panel the checks share.
struct Scope<'a> {
    spec: &'a CaseSpec,
    panel: &'a Panel,
    /// Grapheme boundaries the case is made of.
    boundaries: Vec<usize>,
    text: Vec<char>,
}

impl Scope<'_> {
    fn layout(&self) -> &GodotTextLayout {
        &self.panel.layout
    }

    fn len(&self) -> usize {
        self.text.len()
    }
}

/// Every check that is about one panel.
pub(super) fn verify_case(report: &mut Report, font: &Gd<Font>, spec: &CaseSpec) {
    let panels = match build_panels(font, spec) {
        Ok(panels) => panels,
        Err(error) => {
            report.fail(spec.name, "-", "layout-builds", error);
            return;
        }
    };
    for panel in &panels {
        let scope = Scope {
            spec,
            panel,
            boundaries: spec.boundaries(),
            text: spec.text().chars().collect(),
        };
        let alignment = alignment_name(panel.alignment);
        let mut run = |name: &'static str, check: fn(&Scope<'_>) -> Outcome| {
            report.record(spec.name, alignment, name, check(&scope));
        };
        run("layout-builds", |scope| {
            Ok(format!(
                "{} lines for {} code points",
                scope.layout().lines().len(),
                scope.len()
            ))
        });
        run("line-geometry", line_geometry);
        run("grapheme-boundaries", grapheme_boundaries);
        run("grapheme-steps", grapheme_steps);
        run("word-ranges", word_ranges);
        run("word-range-at", word_range_at);
        run("caret-geometry", caret_geometry);
        run("hit-test-round-trip", hit_test_round_trip);
        run("hit-test-inside-grapheme", hit_test_inside_grapheme);
        run("hit-test-outside", hit_test_outside);
        run("selection-additive", selection_additive);
        run("selection-extent", selection_extent);
        run("adapter-grapheme-moves", adapter_grapheme_moves);
        run("adapter-word-moves", adapter_word_moves);
        run("adapter-line-moves", adapter_line_moves);
        run("adapter-delete-and-select", adapter_delete_and_select);
        run("engine-hit-test-claims", engine_hit_test_claims);
    }
}

// ---- lines ----

/// The line boxes against what the paragraph itself reports: each line's ascent, descent and width
/// (what `draw` places by), their sum against `get_size`, and the first line at the origin.
fn line_geometry(scope: &Scope<'_>) -> Outcome {
    let layout = scope.layout();
    let paragraph = &scope.panel.paragraph;
    let mut failures = Failures::new();
    let shaped: Vec<&Line> = layout
        .lines()
        .iter()
        .filter(|line| !line.after_final_break)
        .collect();
    failures.require(
        i64::try_from(shaped.len()).ok() == Some(i64::from(paragraph.get_line_count())),
        || {
            format!(
                "{} lines against the paragraph's {}",
                shaped.len(),
                paragraph.get_line_count()
            )
        },
    );
    if scope.len() == 0 {
        // No glyphs: the paragraph reports nothing to compare, the layout uses the font's extents.
        failures.require(shaped.len() == 1, || {
            "empty text must be one line".to_owned()
        });
        return failures.finish(|| "the empty line".to_owned());
    }
    for (index, line) in shaped.iter().enumerate() {
        let engine_index = i32::try_from(index).map_err(described)?;
        let (ascent, descent, width) = (
            paragraph.get_line_ascent(engine_index),
            paragraph.get_line_descent(engine_index),
            paragraph.get_line_width(engine_index),
        );
        failures.require(
            (line.ascent, line.descent, line.width) == (ascent, descent, width),
            || {
                format!(
                    "line {index}: {:?} against the paragraph's {:?}",
                    (line.ascent, line.descent, line.width),
                    (ascent, descent, width)
                )
            },
        );
    }
    let size = paragraph.get_size();
    if let (Some(first), Some(last)) = (shaped.first(), shaped.last()) {
        let height = last.origin.y + last.descent - first.top();
        failures.require(
            (height - size.y).abs() <= SIZE_TOLERANCE_PER_LINE * shaped.len() as f32,
            || format!("lines are {height} tall, the paragraph says {}", size.y),
        );
        failures.require(first.top() == scope.panel.origin.y, || {
            format!(
                "first line top {} is not the origin {}",
                first.top(),
                scope.panel.origin.y
            )
        });
        let widest = shaped.iter().map(|line| line.width).fold(0.0, f32::max);
        failures.require(widest == size.x, || {
            format!("widest line {widest}, the paragraph says {}", size.x)
        });
    }
    failures.finish(|| {
        format!(
            "{} lines, {}x{} as the paragraph says",
            shaped.len(),
            size.x,
            size.y
        )
    })
}

// ---- graphemes and words ----

fn grapheme_boundaries(scope: &Scope<'_>) -> Outcome {
    let actual = scope.layout().grapheme_boundaries();
    if actual == scope.boundaries {
        Ok(format!("{} boundaries", actual.len()))
    } else {
        Err(format!(
            "the server's boundaries {actual:?} are not the case's {:?}",
            scope.boundaries
        ))
    }
}

/// Stepping between boundaries and snapping to the nearest, against the boundaries the case is made of.
fn grapheme_steps(scope: &Scope<'_>) -> Outcome {
    let layout = scope.layout();
    let mut failures = Failures::new();
    failures.require(layout.text_len() == scope.len(), || {
        format!(
            "text_len {} for {} code points",
            layout.text_len(),
            scope.len()
        )
    });
    failures.require(layout.origin() == scope.panel.origin, || {
        format!("origin {:?} is not where the panel draws", layout.origin())
    });
    for offset in 0..=scope.len() {
        let next = scope
            .boundaries
            .iter()
            .copied()
            .find(|boundary| *boundary > offset);
        let previous = scope
            .boundaries
            .iter()
            .rev()
            .copied()
            .find(|boundary| *boundary < offset);
        failures.require(layout.next_grapheme(offset) == Ok(next), || {
            format!(
                "next_grapheme({offset}) is {:?}, expected {next:?}",
                layout.next_grapheme(offset)
            )
        });
        failures.require(layout.previous_grapheme(offset) == Ok(previous), || {
            format!(
                "previous_grapheme({offset}) is {:?}, expected {previous:?}",
                layout.previous_grapheme(offset)
            )
        });
        // The nearest boundary, the lower one if two are as near.
        let nearest = scope
            .boundaries
            .iter()
            .copied()
            .min_by_key(|boundary| (boundary.abs_diff(offset), *boundary))
            .unwrap_or(0);
        failures.require(layout.nearest_grapheme(offset) == Ok(nearest), || {
            format!(
                "nearest_grapheme({offset}) is {:?}, expected {nearest}",
                layout.nearest_grapheme(offset)
            )
        });
    }
    failures.finish(|| format!("{} offsets", scope.len() + 1))
}

fn word_ranges(scope: &Scope<'_>) -> Outcome {
    let expected = expected_words(&scope.text);
    let actual = scope.layout().word_ranges().map_err(described)?;
    if actual != expected {
        return Err(format!("words {actual:?}, expected {expected:?}"));
    }
    // The same call, made directly: the layout must not have lost or reordered anything.
    let server = TextServerManager::singleton()
        .get_primary_interface()
        .ok_or("no text server")?;
    let raw = server.shaped_text_get_word_breaks(scope.panel.paragraph.get_rid());
    let flat: Vec<usize> = actual
        .iter()
        .flat_map(|(start, end)| [*start, *end])
        .collect();
    let raw: Vec<usize> = raw
        .as_slice()
        .iter()
        .map(|offset| usize::try_from(*offset).map_err(described))
        .collect::<Result<_, _>>()?;
    if flat != raw {
        return Err(format!(
            "layout words {flat:?} against the server's {raw:?}"
        ));
    }
    Ok(format!("{} words", actual.len()))
}

fn word_range_at(scope: &Scope<'_>) -> Outcome {
    let layout = scope.layout();
    let words = expected_words(&scope.text);
    let lists = layout.boundaries().map_err(described)?;
    let mut failures = Failures::new();
    for offset in 0..=scope.len() {
        let expected = expected_word_range(&words, scope.len(), offset);
        let range = layout.word_range_at(offset).map_err(described)?;
        failures.require(range == expected, || {
            format!("word_range_at({offset}) = {range:?}, expected {expected:?}")
        });
        let from_lists = crate::text_input::TextBoundaries::word_range(&lists, &scope.text, offset)
            .map_err(described)?;
        failures.require(from_lists == expected, || {
            format!("the boundary lists answer {from_lists:?} at {offset}, expected {expected:?}")
        });
        let at = layout.word_at(offset).map_err(described)?;
        let in_word = words
            .iter()
            .find(|(start, end)| *start <= offset && offset <= *end)
            .copied();
        failures.require(at == in_word, || {
            format!("word_at({offset}) = {at:?}, expected {in_word:?}")
        });
    }
    failures.finish(|| format!("{} offsets", scope.len() + 1))
}

// ---- carets and hit tests ----

fn caret_geometry(scope: &Scope<'_>) -> Outcome {
    let layout = scope.layout();
    let mut failures = Failures::new();
    let mut count = 0;
    for offset in &scope.boundaries {
        let carets = layout.carets(*offset).map_err(described)?;
        let line = layout.line(carets.line).map_err(described)?;
        failures.require(
            carets.line == layout.line_of(*offset).map_err(described)?,
            || format!("carets of {offset} are on line {}", carets.line),
        );
        for caret in [carets.leading, carets.trailing].into_iter().flatten() {
            count += 1;
            let inside_line = caret.top >= line.top() - SAME_X_TOLERANCE
                && caret.top + caret.height <= line.top() + line.height() + SAME_X_TOLERANCE
                && caret.height > 0.0;
            failures.require(inside_line, || {
                format!(
                    "offset {offset}: caret {:?} is outside line {} ({}..{})",
                    (caret.top, caret.height),
                    carets.line,
                    line.top(),
                    line.top() + line.height()
                )
            });
            let across = caret.x >= line.origin.x - SAME_X_TOLERANCE
                && caret.x <= line.origin.x + line.width + SAME_X_TOLERANCE;
            failures.require(across, || {
                format!(
                    "offset {offset}: caret x {} is outside line {} ({}..{})",
                    caret.x,
                    carets.line,
                    line.origin.x,
                    line.origin.x + line.width
                )
            });
        }
    }
    failures.finish(|| format!("{count} carets"))
}

/// `hit_test(caret.center) == offset` for every grapheme boundary. In text of one direction every caret
/// must. Where the directions meet, a visual position is the end of one run and the start of the other,
/// so it is two offsets at one x, and the server's hit test (which has no affinity) answers one of them
/// for both carets: those carets are counted as aliases (their x is another offset's caret x), and
/// [`hit_test_inside_grapheme`] shows the other offset is still reachable.
fn hit_test_round_trip(scope: &Scope<'_>) -> Outcome {
    let layout = scope.layout();
    let mixed = scope.spec.flow == Flow::Mixed;
    let mut failures = Failures::new();
    let (mut round_trips, mut aliases, mut total) = (0, 0, 0);
    for offset in &scope.boundaries {
        let carets = layout.carets(*offset).map_err(described)?;
        for caret in [carets.leading, carets.trailing].into_iter().flatten() {
            total += 1;
            let hit = layout.hit(caret.center()).map_err(described)?;
            failures.require(layout.hit_test(caret.center()) == Ok(hit.offset), || {
                format!("hit_test and hit disagree at offset {offset}")
            });
            if hit.offset == *offset && hit.line == carets.line {
                round_trips += 1;
                continue;
            }
            let other = layout
                .carets_on_line(hit.line, hit.offset)
                .map_err(described)?;
            let shares_the_place = hit.line == carets.line
                && [other.leading, other.trailing]
                    .into_iter()
                    .flatten()
                    .any(|other| (other.x - caret.x).abs() < SAME_X_TOLERANCE);
            if mixed && shares_the_place {
                aliases += 1;
            } else {
                failures.add(|| {
                    format!(
                        "offset {offset}: caret at ({}, {}) hit {hit:?}",
                        caret.x,
                        caret.center().y
                    )
                });
            }
        }
    }
    failures.finish(|| {
        format!("{round_trips} of {total} carets round trip, {aliases} alias another offset")
    })
}

/// The point on a caret's line just inside the grapheme the caret belongs to: a leading caret follows
/// its grapheme (which is left of it in left-to-right text, right of it in right-to-left), a trailing
/// caret precedes it.
fn point_inside_grapheme(caret: Caret, leading: bool) -> Vector2 {
    let toward_the_grapheme = match (leading, caret.direction) {
        (true, Some(TextDirection::Ltr)) | (false, Some(TextDirection::Rtl)) => -1.0,
        (true, Some(TextDirection::Rtl)) | (false, Some(TextDirection::Ltr)) => 1.0,
        // A caret inside a grapheme has no side.
        (_, None) => 0.0,
    };
    Vector2::new(
        caret.x + toward_the_grapheme * PROBE_INSET_PX,
        caret.center().y,
    )
}

/// Every caret, probed just inside its own grapheme, hits its own offset, in text of any direction:
/// every offset is reachable by the pointer, even where two offsets share a visual position.
fn hit_test_inside_grapheme(scope: &Scope<'_>) -> Outcome {
    let layout = scope.layout();
    let mut failures = Failures::new();
    let mut total = 0;
    for offset in &scope.boundaries {
        let carets = layout.carets(*offset).map_err(described)?;
        for (caret, leading) in [(carets.leading, true), (carets.trailing, false)] {
            let Some(caret) = caret else {
                continue;
            };
            total += 1;
            let point = point_inside_grapheme(caret, leading);
            let hit = layout.hit(point).map_err(described)?;
            failures.require(hit.offset == *offset && hit.line == carets.line, || {
                format!(
                    "offset {offset}: the {} caret probed at ({}, {}) hit {hit:?}",
                    if leading { "leading" } else { "trailing" },
                    point.x,
                    point.y
                )
            });
        }
    }
    failures.finish(|| format!("{total} carets"))
}

/// Points outside the text: above, below, far left and far right of every line.
fn hit_test_outside(scope: &Scope<'_>) -> Outcome {
    let layout = scope.layout();
    let mut failures = Failures::new();
    let lines = layout.lines();
    let top = scope.panel.origin.y - FAR_OUTSIDE;
    let hit = layout
        .hit(Vector2::new(scope.panel.origin.x, top))
        .map_err(described)?;
    failures.require(hit.line == 0, || {
        format!("a point above the text hit {hit:?}")
    });
    let bottom = lines.last().map_or(0.0, |line| line.top() + line.height());
    let hit = layout
        .hit(Vector2::new(scope.panel.origin.x, bottom + FAR_OUTSIDE))
        .map_err(described)?;
    failures.require(hit.line == lines.len() - 1, || {
        format!("a point below the text hit {hit:?}")
    });
    if scope.spec.flow != Flow::Mixed {
        for (index, line) in lines.iter().enumerate() {
            let y = line.top() + line.height() / 2.0;
            let (left, right) = if line.direction == TextDirection::Rtl {
                (line.last_offset, line.first_offset)
            } else {
                (line.first_offset, line.last_offset)
            };
            for (x, expected, side) in [
                (scope.panel.origin.x - FAR_OUTSIDE, left, "left"),
                (
                    scope.panel.origin.x + scope.spec.box_width() + FAR_OUTSIDE,
                    right,
                    "right",
                ),
            ] {
                let hit = layout.hit(Vector2::new(x, y)).map_err(described)?;
                failures.require(hit.offset == expected && hit.line == index, || {
                    format!("far {side} of line {index} hit {hit:?}, expected offset {expected}")
                });
            }
        }
    }
    failures.finish(|| format!("{} lines", lines.len()))
}

/// The engine's own `TextParagraph::hit_test` is not usable for a pointer; the documentation of
/// `text_layout.rs` says why. The claims, checked: it answers the end of the text for a point above the
/// first line, and it ignores a line's alignment offset (so for centred or right-aligned text it
/// disagrees with the carets, which are where the glyphs are drawn).
fn engine_hit_test_claims(scope: &Scope<'_>) -> Outcome {
    if scope.len() == 0 {
        return Ok("nothing to hit".to_owned());
    }
    let paragraph = &scope.panel.paragraph;
    let above = paragraph.hit_test(Vector2::new(1.0, -10.0));
    let end = paragraph.get_range().y;
    if i64::from(above) != i64::from(end) {
        return Err(format!(
            "TextParagraph.hit_test above the first line answered {above}, not the end {end}"
        ));
    }
    let layout = scope.layout();
    // A point right of a line that ends in a line break answers the offset after the break, which is
    // on the next line.
    let mut past_break = 0;
    for line in layout.lines().iter().filter(|line| !line.range.is_empty()) {
        if matches!(scope.text.get(line.range.end - 1), Some('\n' | '\r')) {
            let local = Vector2::new(
                FAR_OUTSIDE,
                line.top() + line.height() / 2.0 - scope.panel.origin.y,
            );
            let answer = paragraph.hit_test(local);
            if usize::try_from(answer).ok() != Some(line.range.end) {
                return Err(format!(
                    "TextParagraph.hit_test right of a line ending in a break answered {answer}, not the offset after it ({})",
                    line.range.end
                ));
            }
            past_break += 1;
        }
    }
    let mut misses = 0;
    for offset in &scope.boundaries {
        let caret = layout
            .caret(*offset, TextDirection::Ltr)
            .map_err(described)?;
        let local = caret.center() - scope.panel.origin;
        if usize::try_from(paragraph.hit_test(local)).ok() != Some(*offset) {
            misses += 1;
        }
    }
    let aligned = layout
        .lines()
        .iter()
        .any(|line| line.origin.x != scope.panel.origin.x);
    if aligned && misses == 0 {
        return Err(
            "the engine's hit_test did not disagree with the carets of aligned text".to_owned(),
        );
    }
    Ok(format!(
        "above the first line it answers the end ({end}); right of {past_break} lines ending in a break it answers the next line's start; at the carets' own positions it is wrong for {misses} of {} offsets{}",
        scope.boundaries.len(),
        if aligned {
            ""
        } else {
            " (no line is offset by alignment here)"
        }
    ))
}

// ---- selection ----

/// A line's selected span, merged where runs touch.
type Span = (usize, f32, f32);

fn spans(layout: &GodotTextLayout, start: usize, end: usize) -> Result<Vec<Span>, String> {
    let mut merged: Vec<Span> = Vec::new();
    let mut runs = layout.selection_rects(start, end).map_err(described)?;
    runs.sort_by(|a, b| {
        (a.line, a.rect.position.x)
            .partial_cmp(&(b.line, b.rect.position.x))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    for run in runs {
        let (left, right) = (run.rect.position.x, run.rect.position.x + run.rect.size.x);
        match merged.last_mut() {
            Some(last) if last.0 == run.line && left <= last.2 + SAME_X_TOLERANCE => {
                last.2 = last.2.max(right);
            }
            _ => merged.push((run.line, left, right)),
        }
    }
    Ok(merged)
}

fn same_spans(a: &[Span], b: &[Span]) -> bool {
    a.len() == b.len()
        && a.iter().zip(b).all(|(a, b)| {
            a.0 == b.0
                && (a.1 - b.1).abs() < SAME_X_TOLERANCE
                && (a.2 - b.2).abs() < SAME_X_TOLERANCE
        })
}

/// The boundaries pairs are drawn from: all of them, or every few for a long case.
fn selection_boundaries(scope: &Scope<'_>) -> Vec<usize> {
    let stride = scope
        .boundaries
        .len()
        .div_ceil(MAX_SELECTION_BOUNDARIES)
        .max(1);
    let mut chosen: Vec<usize> = scope.boundaries.iter().step_by(stride).copied().collect();
    if chosen.last() != scope.boundaries.last() {
        chosen.extend(scope.boundaries.last().copied());
    }
    chosen
}

/// Selecting `a..b` covers what selecting `a..c` and `c..b` cover, for every `a < c < b`; and the
/// per-grapheme runs add up to the whole.
fn selection_additive(scope: &Scope<'_>) -> Outcome {
    let layout = scope.layout();
    let chosen = selection_boundaries(scope);
    let mut failures = Failures::new();
    let mut pairs = 0;
    for (index, start) in chosen.iter().enumerate() {
        for (middle_index, middle) in chosen.iter().enumerate().skip(index + 1) {
            for end in chosen.iter().skip(middle_index + 1) {
                let whole = spans(layout, *start, *end)?;
                let mut halves = spans(layout, *start, *middle)?;
                halves.extend(spans(layout, *middle, *end)?);
                halves.sort_by(|a, b| {
                    (a.0, a.1)
                        .partial_cmp(&(b.0, b.1))
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
                let mut joined: Vec<Span> = Vec::new();
                for half in halves {
                    match joined.last_mut() {
                        Some(last) if last.0 == half.0 && half.1 <= last.2 + SAME_X_TOLERANCE => {
                            last.2 = last.2.max(half.2);
                        }
                        _ => joined.push(half),
                    }
                }
                pairs += 1;
                failures.require(same_spans(&whole, &joined), || {
                    format!("{start}..{end} is {whole:?} but {start}..{middle} + {middle}..{end} is {joined:?}")
                });
            }
        }
    }
    // The graphemes one by one.
    let whole = spans(layout, 0, scope.len())?;
    let mut singles: Vec<Span> = Vec::new();
    for pair in scope.boundaries.windows(2) {
        singles.extend(spans(layout, pair[0], pair[1])?);
    }
    singles.sort_by(|a, b| {
        (a.0, a.1)
            .partial_cmp(&(b.0, b.1))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let mut joined: Vec<Span> = Vec::new();
    for single in singles {
        match joined.last_mut() {
            Some(last) if last.0 == single.0 && single.1 <= last.2 + SAME_X_TOLERANCE => {
                last.2 = last.2.max(single.2);
            }
            _ => joined.push(single),
        }
    }
    failures.require(same_spans(&whole, &joined), || {
        format!("the whole text is {whole:?} but its graphemes add up to {joined:?}")
    });
    failures.finish(|| format!("{pairs} triples and the per-grapheme sum"))
}

/// In text of one direction a selection on a line is one run, from the caret of its first offset to the
/// caret of its last: the selection query and the caret query are separate code in the server.
fn selection_extent(scope: &Scope<'_>) -> Outcome {
    if scope.spec.flow == Flow::Mixed {
        return Ok("skipped: text of both directions has several runs per line".to_owned());
    }
    let layout = scope.layout();
    let chosen = selection_boundaries(scope);
    let mut failures = Failures::new();
    let mut runs = 0;
    for (index, start) in chosen.iter().enumerate() {
        for end in chosen.iter().skip(index + 1) {
            let actual = spans(layout, *start, *end)?;
            let mut expected: Vec<Span> = Vec::new();
            for (line_index, line) in layout.lines().iter().enumerate() {
                let from = (*start).max(line.range.start);
                let to = (*end).min(line.range.end);
                if from >= to {
                    continue;
                }
                let edge = |offset: usize| -> Result<f32, String> {
                    let carets = layout
                        .carets_on_line(line_index, offset)
                        .map_err(described)?;
                    carets
                        .trailing
                        .or(carets.leading)
                        .map(|caret| caret.x)
                        .ok_or_else(|| format!("no caret for {offset} on line {line_index}"))
                };
                let (a, b) = (edge(from)?, edge(to)?);
                // A run of only the zero-width line break has no extent.
                if (a - b).abs() >= SAME_X_TOLERANCE {
                    expected.push((line_index, a.min(b), a.max(b)));
                }
            }
            runs += expected.len();
            failures.require(same_spans(&actual, &expected), || {
                format!("{start}..{end} selects {actual:?}, the carets say {expected:?}")
            });
        }
    }
    failures.finish(|| format!("{runs} runs over {} boundaries", chosen.len()))
}

// ---- adapters under the edit buffer ----

const MULTILINE: EditConfig = EditConfig {
    multiline: true,
    read_only: false,
    secure: false,
    max_length: None,
};

/// A buffer holding the case's text with the caret at `offset`.
fn buffer_at(
    scope: &Scope<'_>,
    offset: usize,
    environment: &EditEnvironment<'_>,
) -> Result<EditBuffer, String> {
    let mut buffer = EditBuffer::with_text(MULTILINE, &scope.spec.text());
    apply(
        &mut buffer,
        EditCommand::SetSelection {
            anchor: offset,
            focus: offset,
        },
        environment,
    )?;
    Ok(buffer)
}

fn apply(
    buffer: &mut EditBuffer,
    command: EditCommand,
    environment: &EditEnvironment<'_>,
) -> Result<(), String> {
    buffer
        .apply(command.clone(), environment)
        .map(|_| ())
        .map_err(|error: EditError| format!("{command:?}: {error}"))
}

/// Runs `check` for every grapheme boundary with the adapters built from the panel's layout.
fn with_adapters(
    scope: &Scope<'_>,
    mut check: impl FnMut(usize, &EditEnvironment<'_>, &mut Failures) -> Result<(), String>,
) -> Outcome {
    let layout = scope.layout();
    let boundaries = layout.boundaries().map_err(described)?;
    let line_height = layout.lines().first().map_or(0.0, Line::height);
    let lines = layout
        .line_layout(TextDirection::Ltr, PAGE_LINES * line_height)
        .map_err(described)?;
    let environment = EditEnvironment::new(&boundaries).with_layout(&lines);
    let mut failures = Failures::new();
    for offset in &scope.boundaries {
        if let Err(error) = check(*offset, &environment, &mut failures) {
            failures.add(|| format!("at {offset}: {error}"));
        }
    }
    failures.finish(|| format!("{} offsets", scope.boundaries.len()))
}

fn adapter_grapheme_moves(scope: &Scope<'_>) -> Outcome {
    let len = scope.len();
    with_adapters(scope, |offset, environment, failures| {
        let index = scope
            .boundaries
            .iter()
            .position(|boundary| *boundary == offset)
            .ok_or("not a boundary")?;
        for (direction, expected) in [
            (
                Direction::Forward,
                scope.boundaries.get(index + 1).copied().unwrap_or(len),
            ),
            (
                Direction::Backward,
                index
                    .checked_sub(1)
                    .map_or(0, |before| scope.boundaries[before]),
            ),
        ] {
            let mut buffer = buffer_at(scope, offset, environment)?;
            apply(
                &mut buffer,
                EditCommand::MoveGrapheme {
                    direction,
                    extend: false,
                },
                environment,
            )?;
            failures.require(buffer.focus() == expected, || {
                format!(
                    "{direction:?} grapheme from {offset} went to {}, expected {expected}",
                    buffer.focus()
                )
            });
        }
        Ok(())
    })
}

fn adapter_word_moves(scope: &Scope<'_>) -> Outcome {
    let len = scope.len();
    let words = expected_words(&scope.text);
    with_adapters(scope, |offset, environment, failures| {
        let forward = words
            .iter()
            .map(|(_, end)| *end)
            .find(|end| *end > offset)
            .unwrap_or(len);
        let backward = words
            .iter()
            .rev()
            .map(|(start, _)| *start)
            .find(|start| *start < offset)
            .unwrap_or(0);
        for (direction, expected) in [
            (Direction::Forward, forward),
            (Direction::Backward, backward),
        ] {
            let mut buffer = buffer_at(scope, offset, environment)?;
            apply(
                &mut buffer,
                EditCommand::MoveWord {
                    direction,
                    extend: false,
                },
                environment,
            )?;
            failures.require(buffer.focus() == expected, || {
                format!(
                    "{direction:?} word from {offset} went to {}, expected {expected}",
                    buffer.focus()
                )
            });
        }
        Ok(())
    })
}

fn adapter_line_moves(scope: &Scope<'_>) -> Outcome {
    let layout = scope.layout();
    let len = scope.len();
    let line_height = layout.lines().first().map_or(0.0, Line::height);
    let lines = layout
        .line_layout(TextDirection::Ltr, PAGE_LINES * line_height)
        .map_err(described)?;
    let page_lines = crate::text_input::LineLayout::page_lines(&lines);
    let count = layout.lines().len();
    with_adapters(scope, |offset, environment, failures| {
        let line = layout.line_of(offset).map_err(described)?;
        let moves = [
            (
                EditCommand::MoveLine {
                    direction: Direction::Forward,
                    extend: false,
                },
                "down",
                (line + 1 < count).then_some(line + 1),
                len,
            ),
            (
                EditCommand::MoveLine {
                    direction: Direction::Backward,
                    extend: false,
                },
                "up",
                line.checked_sub(1),
                0,
            ),
            (
                EditCommand::MovePage {
                    direction: Direction::Forward,
                    extend: false,
                },
                "page down",
                (line + page_lines)
                    .min(count - 1)
                    .checked_sub(line)
                    .filter(|moved| *moved > 0)
                    .map(|moved| line + moved),
                len,
            ),
            (
                EditCommand::MovePage {
                    direction: Direction::Backward,
                    extend: false,
                },
                "page up",
                line.checked_sub(page_lines.min(line))
                    .filter(|target| *target < line),
                0,
            ),
        ];
        for (command, name, target_line, edge) in moves {
            let mut buffer = buffer_at(scope, offset, environment)?;
            apply(&mut buffer, command, environment)?;
            let focus = buffer.focus();
            match target_line {
                Some(target) => {
                    let landed = layout.line_of(focus).map_err(described)?;
                    failures.require(landed == target, || {
                        format!("{name} from {offset} (line {line}) landed on line {landed} at {focus}, expected line {target}")
                    });
                    failures.require(scope.boundaries.contains(&focus), || {
                        format!("{name} from {offset} landed inside a grapheme at {focus}")
                    });
                }
                None => failures.require(focus == edge, || {
                    format!("{name} from {offset} past the last line should go to {edge}, went to {focus}")
                }),
            }
        }
        for (direction, expected) in [
            (
                Direction::Backward,
                layout.line(line).map_err(described)?.first_offset,
            ),
            (
                Direction::Forward,
                layout.line(line).map_err(described)?.last_offset,
            ),
        ] {
            let mut buffer = buffer_at(scope, offset, environment)?;
            apply(
                &mut buffer,
                EditCommand::MoveLineEdge {
                    direction,
                    extend: false,
                },
                environment,
            )?;
            failures.require(buffer.focus() == expected, || {
                format!(
                    "{direction:?} line edge from {offset} went to {}, expected {expected}",
                    buffer.focus()
                )
            });
        }
        Ok(())
    })
}

fn adapter_delete_and_select(scope: &Scope<'_>) -> Outcome {
    let len = scope.len();
    let words = expected_words(&scope.text);
    with_adapters(scope, |offset, environment, failures| {
        let index = scope
            .boundaries
            .iter()
            .position(|boundary| *boundary == offset)
            .ok_or("not a boundary")?;
        // Backspace removes the grapheme before the caret, Delete the one after it.
        if let Some(before) = index.checked_sub(1).map(|before| scope.boundaries[before]) {
            let mut buffer = buffer_at(scope, offset, environment)?;
            apply(
                &mut buffer,
                EditCommand::DeleteGrapheme(Direction::Backward),
                environment,
            )?;
            let mut expected = scope.text.clone();
            expected.drain(before..offset);
            failures.require(buffer.text() == expected, || {
                format!("backspace at {offset} should remove {before}..{offset}, left {} code points of {len}", buffer.text().len())
            });
        }
        if let Some(after) = scope.boundaries.get(index + 1).copied() {
            let mut buffer = buffer_at(scope, offset, environment)?;
            apply(
                &mut buffer,
                EditCommand::DeleteGrapheme(Direction::Forward),
                environment,
            )?;
            let mut expected = scope.text.clone();
            expected.drain(offset..after);
            failures.require(buffer.text() == expected, || {
                format!("delete at {offset} should remove {offset}..{after}, left {} code points of {len}", buffer.text().len())
            });
        }
        let mut buffer = buffer_at(scope, offset, environment)?;
        apply(&mut buffer, EditCommand::SelectWordAt(offset), environment)?;
        let (start, end) = expected_word_range(&words, len, offset);
        failures.require(buffer.selection_range() == (start..end), || {
            format!(
                "double click at {offset} selected {:?}, expected {start}..{end}",
                buffer.selection_range()
            )
        });
        Ok(())
    })
}

// ---- once, not per panel ----

/// What does not depend on a case: paragraphs the layout refuses, and one it notices changing.
pub(super) fn verify_globally(report: &mut Report, font: &Gd<Font>) {
    let paragraph = |text: &str| {
        let mut paragraph = TextParagraph::new_gd();
        paragraph.add_string(text, font, 16);
        paragraph
    };
    let mut refuses =
        |name: &'static str, mutate: &dyn Fn(&mut Gd<TextParagraph>), expected: Unsupported| {
            let mut subject = paragraph("a paragraph");
            mutate(&mut subject);
            match GodotParagraph::lay_out(&subject, 100.0) {
                Err(TextLayoutError::Unsupported(found)) if found == expected => {
                    report.pass("(all)", "-", name, format!("refused as {found:?}"));
                }
                Err(error) => report.fail(
                    "(all)",
                    "-",
                    name,
                    format!("refused as {error}, expected {expected:?}"),
                ),
                Ok(_) => report.fail("(all)", "-", name, "was laid out".to_owned()),
            }
        };
    refuses(
        "unsupported-vertical",
        &|p| p.set_orientation(Orientation::VERTICAL),
        Unsupported::VerticalOrientation,
    );
    refuses(
        "unsupported-fill",
        &|p| p.set_alignment(HorizontalAlignment::FILL),
        Unsupported::FillAlignment,
    );
    refuses(
        "unsupported-max-lines",
        &|p| p.set_max_lines_visible(1),
        Unsupported::MaxLinesVisible,
    );
    refuses(
        "unsupported-dropcap",
        &|p| {
            p.set_dropcap("D", font, 32);
        },
        Unsupported::DropCap,
    );
    // The width a measurement left on the paragraph is not the width the layout is of: `lay_out` sets it.
    let mut measured = paragraph("one two three four five six seven eight");
    measured.set_width(NARROW_PX);
    let narrow_lines = measured.get_line_count();
    let outcome = GodotParagraph::lay_out(&measured, WIDE_PX).and_then(|source| {
        TextLayout::new(
            source,
            Vector2::ZERO,
            LineExtents {
                ascent: 1.0,
                descent: 1.0,
            },
        )
    });
    match outcome {
        Ok(layout) if layout.lines().len() == 1 && narrow_lines > 1 => report.pass(
            "(all)",
            "-",
            "lay-out-sets-width",
            format!("{narrow_lines} lines at the measured width, 1 at {WIDE_PX}"),
        ),
        Ok(layout) => report.fail(
            "(all)",
            "-",
            "lay-out-sets-width",
            format!(
                "{} lines at {WIDE_PX} (the measured width gave {narrow_lines})",
                layout.lines().len()
            ),
        ),
        Err(error) => report.fail("(all)", "-", "lay-out-sets-width", described(error)),
    }
    // Line spacing: the lines are as far apart as the paragraph's own height says.
    let mut spaced = paragraph("first line\nsecond line\nthird line");
    spaced.set_line_spacing(LINE_SPACING_PX);
    let outcome = GodotParagraph::lay_out(&spaced, -1.0).and_then(|source| {
        TextLayout::new(
            source,
            Vector2::ZERO,
            LineExtents {
                ascent: 1.0,
                descent: 1.0,
            },
        )
    });
    match outcome {
        Ok(layout) => {
            let (first, last) = (layout.lines().first(), layout.lines().last());
            let height = match (first, last) {
                (Some(first), Some(last)) => last.top() + last.height() - first.top(),
                _ => 0.0,
            };
            let engine = spaced.get_size().y;
            // The trailing line break has no line in the paragraph; the layout's extra line is not counted.
            let shaped = layout.lines().iter().filter(|line| !line.after_final_break);
            let measured = shaped.clone().map(Line::height).sum::<f32>()
                + LINE_SPACING_PX * (shaped.count() - 1) as f32;
            let detail = format!(
                "lines and spacing add up to {measured}, the placed lines span {height}, the paragraph says {engine}"
            );
            if (measured - engine).abs() <= SIZE_TOLERANCE_PER_LINE * 3.0
                && (height - measured).abs() < SAME_X_TOLERANCE
            {
                report.pass("(all)", "-", "line-spacing", detail);
            } else {
                report.fail("(all)", "-", "line-spacing", detail);
            }
        }
        Err(error) => report.fail("(all)", "-", "line-spacing", described(error)),
    }
    // A layout of a paragraph whose width then changes says so instead of answering for old lines.
    let mut subject = paragraph("a paragraph that wraps when it is narrow enough");
    let outcome = GodotParagraph::lay_out(&subject, 200.0).and_then(|source| {
        TextLayout::new(
            source,
            Vector2::ZERO,
            LineExtents {
                ascent: 1.0,
                descent: 1.0,
            },
        )
    });
    match outcome {
        Ok(layout) => {
            subject.set_width(120.0);
            match layout.carets(3) {
                Err(TextLayoutError::Stale { .. }) => report.pass(
                    "(all)",
                    "-",
                    "stale-width",
                    "a width change is noticed".to_owned(),
                ),
                other => report.fail(
                    "(all)",
                    "-",
                    "stale-width",
                    format!("expected Stale, got {other:?}"),
                ),
            }
        }
        Err(error) => report.fail("(all)", "-", "stale-width", described(error)),
    }
}
