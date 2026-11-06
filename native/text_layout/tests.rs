//! Unit tests for the text layout. The paragraph is a fake that follows the text server's rules on a
//! monospace font (the algorithms of `shaped_text_get_carets`, `shaped_text_get_selection` and
//! `shaped_text_hit_test_position`, for one glyph per grapheme), so what is tested here is the layout's
//! own logic: line placement, line ownership of offsets, snapping, the adapters. What the real server
//! answers is checked by the probe build against a running Godot (`pnpm verify:text-layout`).

use super::*;
use crate::text_input::{
    Direction, EditBuffer, EditCommand, EditConfig, EditEnvironment, TextBoundaries,
};

/// Advance of one grapheme in the fake font.
const CELL: f32 = 10.0;
const ASCENT: f32 = 8.0;
const DESCENT: f32 = 3.0;
const HEIGHT: f32 = ASCENT + DESCENT;
/// What the tests give as the measure of an empty line, different from the fake font's.
const EMPTY_LINE: LineExtents = LineExtents {
    ascent: 7.0,
    descent: 2.0,
};
const ORIGIN: Vector2 = Vector2::new(5.0, 20.0);
const COMBINING_ACUTE: char = '\u{0301}';
/// Hebrew letters, which the fake shapes right to left.
const ALEF: char = '\u{05D0}';
const BET: char = '\u{05D1}';
const GIMEL: char = '\u{05D2}';

// ---- the fake paragraph ----

#[derive(Clone, Copy)]
struct Cluster {
    start: usize,
    end: usize,
    advance: f32,
    rtl: bool,
    hard_break: bool,
}

struct FakeLine {
    start: usize,
    end: usize,
    /// In logical order.
    clusters: Vec<Cluster>,
    rtl: bool,
}

impl FakeLine {
    fn new(clusters: Vec<Cluster>) -> Self {
        let start = clusters.first().map_or(0, |cluster| cluster.start);
        let end = clusters.last().map_or(0, |cluster| cluster.end);
        let rtl = !clusters.is_empty() && clusters.iter().all(|cluster| cluster.rtl);
        Self {
            start,
            end,
            clusters,
            rtl,
        }
    }

    fn width(&self) -> f32 {
        self.clusters.iter().map(|cluster| cluster.advance).sum()
    }

    fn visual(&self) -> Vec<Cluster> {
        let mut clusters = self.clusters.clone();
        if self.rtl {
            clusters.reverse();
        }
        clusters
    }

    fn metrics(&self) -> (f32, f32) {
        if self.clusters.is_empty() {
            (0.0, 0.0)
        } else {
            (ASCENT, DESCENT)
        }
    }
}

/// Text in clusters of one cell each (a combining acute joins the cluster before it, a line feed is a
/// zero-width hard break), wrapped by counting clusters per line, in `width / CELL` columns.
struct FakeParagraph {
    text: Vec<char>,
    width: f32,
    alignment: TextAlignment,
    line_spacing: f32,
    lines: Vec<FakeLine>,
}

fn is_hebrew(character: char) -> bool {
    ('\u{05D0}'..='\u{05EA}').contains(&character)
}

impl FakeParagraph {
    fn new(text: &str, width: f32, alignment: TextAlignment) -> Self {
        let text: Vec<char> = text.chars().collect();
        let mut clusters: Vec<Cluster> = Vec::new();
        for (index, character) in text.iter().enumerate() {
            match clusters.last_mut() {
                Some(last) if *character == COMBINING_ACUTE && !last.hard_break => {
                    last.end = index + 1;
                }
                _ => clusters.push(Cluster {
                    start: index,
                    end: index + 1,
                    advance: if *character == '\n' { 0.0 } else { CELL },
                    rtl: is_hebrew(*character),
                    hard_break: *character == '\n',
                }),
            }
        }
        let columns = if width > 0.0 {
            ((width / CELL).floor() as usize).max(1)
        } else {
            usize::MAX
        };
        let mut lines = Vec::new();
        let mut current: Vec<Cluster> = Vec::new();
        let mut visible = 0;
        for cluster in clusters {
            if !cluster.hard_break && visible == columns {
                lines.push(FakeLine::new(std::mem::take(&mut current)));
                visible = 0;
            }
            current.push(cluster);
            if cluster.hard_break {
                lines.push(FakeLine::new(std::mem::take(&mut current)));
                visible = 0;
            } else {
                visible += 1;
            }
        }
        if !current.is_empty() || lines.is_empty() {
            lines.push(FakeLine::new(current));
        }
        Self {
            text,
            width,
            alignment,
            line_spacing: 0.0,
            lines,
        }
    }

    fn with_spacing(mut self, line_spacing: f32) -> Self {
        self.line_spacing = line_spacing;
        self
    }

    fn line(&self, index: usize) -> Result<&FakeLine, TextLayoutError> {
        self.lines
            .get(index)
            .ok_or(TextLayoutError::LineOutOfRange {
                line: index,
                count: self.lines.len(),
            })
    }
}

impl ParagraphSource for FakeParagraph {
    fn facts(&self) -> Result<ParagraphFacts, TextLayoutError> {
        Ok(ParagraphFacts {
            width: self.width,
            alignment: self.alignment,
            line_spacing: self.line_spacing,
            text_len: self.text.len(),
            lines: self
                .lines
                .iter()
                .map(|line| {
                    let (ascent, descent) = line.metrics();
                    LineFacts {
                        start: line.start,
                        end: line.end,
                        ascent,
                        descent,
                        width: line.width(),
                        direction: if line.rtl {
                            TextDirection::Rtl
                        } else {
                            TextDirection::Ltr
                        },
                    }
                })
                .collect(),
            ends_with_hard_break: self
                .lines
                .last()
                .and_then(|line| line.clusters.last())
                .is_some_and(|cluster| cluster.hard_break),
        })
    }

    fn character_breaks(&self) -> Result<Vec<usize>, TextLayoutError> {
        Ok(self
            .lines
            .iter()
            .flat_map(|line| line.clusters.iter().map(|cluster| cluster.end))
            .collect())
    }

    fn word_breaks(&self) -> Result<Vec<usize>, TextLayoutError> {
        let mut breaks = Vec::new();
        let mut start = None;
        for (index, character) in self.text.iter().enumerate() {
            match (character.is_whitespace(), start) {
                (false, None) => start = Some(index),
                (true, Some(word_start)) => {
                    breaks.extend([word_start, index]);
                    start = None;
                }
                (false, Some(_)) | (true, None) => {}
            }
        }
        if let Some(word_start) = start {
            breaks.extend([word_start, self.text.len()]);
        }
        Ok(breaks)
    }

    /// `TextServer::shaped_text_get_carets` for one glyph per cluster.
    fn carets(&self, line: usize, offset: usize) -> Result<ServerCarets, TextLayoutError> {
        let line = self.line(line)?;
        let half = (ASCENT + DESCENT) / 2.0;
        let mut carets = ServerCarets {
            leading: None,
            trailing: None,
        };
        let mut off = 0.0;
        for cluster in line.visual() {
            let direction = if cluster.rtl {
                TextDirection::Rtl
            } else {
                TextDirection::Ltr
            };
            if offset == cluster.start {
                carets.trailing = Some(ServerCaret {
                    x: if cluster.rtl {
                        off + cluster.advance
                    } else {
                        off
                    },
                    top: -ASCENT,
                    height: if cluster.start == line.start {
                        half * 2.0
                    } else {
                        half
                    },
                    direction: Some(direction),
                });
            }
            if offset == cluster.end {
                carets.leading = Some(ServerCaret {
                    x: if cluster.rtl {
                        off
                    } else {
                        off + cluster.advance
                    },
                    top: if cluster.end == line.end {
                        -ASCENT
                    } else {
                        -ASCENT + half
                    },
                    height: if cluster.end == line.end {
                        half * 2.0
                    } else {
                        half
                    },
                    direction: Some(direction),
                });
            }
            if offset > cluster.start && offset < cluster.end {
                let char_advance = cluster.advance / (cluster.end - cluster.start) as f32;
                let x = if cluster.rtl {
                    off + char_advance * (cluster.end - offset) as f32
                } else {
                    off + char_advance * (offset - cluster.start) as f32
                };
                let caret = ServerCaret {
                    x,
                    top: -ASCENT,
                    height: half * 2.0,
                    direction: None,
                };
                carets.leading = Some(caret);
                carets.trailing = Some(caret);
            }
            off += cluster.advance;
        }
        Ok(carets)
    }

    /// `TextServer::shaped_text_get_selection` for one glyph per cluster, with its run merging.
    fn selection(
        &self,
        line: usize,
        start: usize,
        end: usize,
    ) -> Result<Vec<(f32, f32)>, TextLayoutError> {
        let line = self.line(line)?;
        let mut runs: Vec<(f32, f32)> = Vec::new();
        let mut push = |from: f32, to: f32| match runs.last_mut() {
            Some(last) if (last.1 - from).abs() < 0.001 => last.1 = to,
            _ => runs.push((from, to)),
        };
        let mut off = 0.0;
        for cluster in line.visual() {
            if cluster.start < end && cluster.end > start {
                let char_advance = cluster.advance / (cluster.end - cluster.start) as f32;
                let advance = cluster.advance;
                let covers_start = cluster.start >= start;
                let covers_end = cluster.end <= end;
                if covers_start && covers_end {
                    push(off, off + advance);
                } else if covers_start {
                    if cluster.rtl {
                        push(
                            off + char_advance * (cluster.end - end) as f32,
                            off + advance,
                        );
                    } else {
                        push(off, off + char_advance * (end - cluster.start) as f32);
                    }
                } else if covers_end {
                    if cluster.rtl {
                        push(off, off + char_advance * (cluster.end - start) as f32);
                    } else {
                        push(
                            off + char_advance * (start - cluster.start) as f32,
                            off + advance,
                        );
                    }
                } else if cluster.rtl {
                    push(
                        off + char_advance * (cluster.end - end) as f32,
                        off + char_advance * (cluster.end - start) as f32,
                    );
                } else {
                    push(
                        off + char_advance * (start - cluster.start) as f32,
                        off + char_advance * (end - cluster.start) as f32,
                    );
                }
            }
            off += cluster.advance;
        }
        Ok(runs)
    }

    /// `TextServer::shaped_text_hit_test_position` for one glyph per cluster.
    fn hit_test_position(&self, line: usize, x: f32) -> Result<Option<usize>, TextLayoutError> {
        let line = self.line(line)?;
        let visual = line.visual();
        let (Some(first), Some(last)) = (visual.first(), visual.last()) else {
            return Ok(Some(0));
        };
        if x.floor() <= 0.0 {
            return Ok(Some(if first.rtl { first.end } else { first.start }));
        }
        if x.ceil() >= line.width() {
            return Ok(Some(if last.rtl { last.start } else { last.end }));
        }
        let mut off = 0.0;
        for cluster in visual {
            let advance = cluster.advance;
            let count = cluster.end - cluster.start;
            if x >= off && x < off + advance && count > 1 {
                let char_advance = advance / count as f32;
                let mut sub = off;
                for part in 0..count {
                    if x >= sub && x < sub + char_advance / 2.0 {
                        return Ok(Some(if cluster.rtl {
                            cluster.end - part
                        } else {
                            cluster.start + part
                        }));
                    }
                    if x >= sub + char_advance / 2.0 && x < sub + char_advance {
                        return Ok(Some(if cluster.rtl {
                            cluster.start + (count - 1) - part
                        } else {
                            cluster.end - (count - 1) + part
                        }));
                    }
                    sub += char_advance;
                }
            }
            if x >= off && x < off + advance / 2.0 {
                return Ok(Some(if cluster.rtl {
                    cluster.end
                } else {
                    cluster.start
                }));
            }
            if x >= off + advance / 2.0 && x < off + advance {
                return Ok(Some(if cluster.rtl {
                    cluster.start
                } else {
                    cluster.end
                }));
            }
            off += advance;
        }
        Ok(None)
    }
}

fn layout(text: &str, width: f32, alignment: TextAlignment) -> TextLayout<FakeParagraph> {
    TextLayout::new(
        FakeParagraph::new(text, width, alignment),
        ORIGIN,
        EMPTY_LINE,
    )
    .expect("the fake paragraph is valid")
}

fn chars(text: &str) -> Vec<char> {
    text.chars().collect()
}

const ALIGNMENTS: [TextAlignment; 3] = [
    TextAlignment::Left,
    TextAlignment::Center,
    TextAlignment::Right,
];

// ---- line placement (TextParagraph::draw) ----

fn facts(width: f32, direction: TextDirection) -> LineFacts {
    LineFacts {
        start: 0,
        end: 0,
        ascent: ASCENT,
        descent: DESCENT,
        width,
        direction,
    }
}

fn origins(
    width: f32,
    alignment: TextAlignment,
    spacing: f32,
    lines: &[LineFacts],
) -> Vec<(f32, f32)> {
    place_lines(ORIGIN, width, alignment, spacing, lines)
        .iter()
        .map(|origin| (origin.x, origin.y))
        .collect()
}

#[test]
fn baselines_follow_ascent_then_descent_and_spacing() {
    let lines = [
        facts(30.0, TextDirection::Ltr),
        facts(55.0, TextDirection::Ltr),
    ];
    // The first baseline is the top plus the ascent; the next is that plus the descent, the
    // spacing and the next ascent.
    assert_eq!(
        origins(100.0, TextAlignment::Left, 4.0, &lines),
        [(5.0, 28.0), (5.0, 43.0)]
    );
}

#[test]
fn centre_and_right_alignment_offset_each_line_by_its_own_width() {
    let lines = [
        facts(30.0, TextDirection::Ltr),
        facts(55.0, TextDirection::Ltr),
    ];
    // floor((100 - 30) / 2) = 35 and floor((100 - 55) / 2) = 22.
    assert_eq!(
        origins(100.0, TextAlignment::Center, 0.0, &lines),
        [(40.0, 28.0), (27.0, 39.0)]
    );
    assert_eq!(
        origins(100.0, TextAlignment::Right, 0.0, &lines),
        [(75.0, 28.0), (50.0, 39.0)]
    );
}

#[test]
fn a_width_that_is_not_positive_aligns_against_the_widest_line() {
    let lines = [
        facts(30.0, TextDirection::Ltr),
        facts(55.0, TextDirection::Ltr),
    ];
    for width in [0.0, -1.0] {
        assert_eq!(
            origins(width, TextAlignment::Center, 0.0, &lines),
            [(17.0, 28.0), (5.0, 39.0)]
        );
        assert_eq!(
            origins(width, TextAlignment::Right, 0.0, &lines),
            [(30.0, 28.0), (5.0, 39.0)]
        );
    }
}

#[test]
fn a_line_wider_than_the_box_overflows_by_direction_and_alignment() {
    let ltr = [facts(55.0, TextDirection::Ltr)];
    let rtl = [facts(55.0, TextDirection::Rtl)];
    // Centred, a left-to-right line starts at the left edge and a right-to-left one ends at the
    // right edge; right-aligned, both end there.
    assert_eq!(origins(40.0, TextAlignment::Center, 0.0, &ltr)[0].0, 5.0);
    assert_eq!(origins(40.0, TextAlignment::Center, 0.0, &rtl)[0].0, -10.0);
    assert_eq!(origins(40.0, TextAlignment::Right, 0.0, &ltr)[0].0, -10.0);
    assert_eq!(origins(40.0, TextAlignment::Right, 0.0, &rtl)[0].0, -10.0);
    assert_eq!(origins(40.0, TextAlignment::Left, 0.0, &rtl)[0].0, 5.0);
}

// ---- building the layout ----

#[test]
fn lines_carry_the_drawn_geometry() {
    let layout = layout("hello world foo", 60.0, TextAlignment::Left);
    let lines = layout.lines();
    assert_eq!(lines.len(), 3);
    assert_eq!(lines[0].range, 0..6);
    assert_eq!(lines[1].range, 6..12);
    assert_eq!(lines[2].range, 12..15);
    assert_eq!(lines[1].origin, Vector2::new(5.0, 20.0 + HEIGHT + ASCENT));
    assert_eq!(
        lines[1].rect(),
        Rect2::new(Vector2::new(5.0, 20.0 + HEIGHT), Vector2::new(60.0, HEIGHT))
    );
    assert_eq!(lines[2].rect().size.x, 30.0);
}

#[test]
fn a_line_that_is_followed_by_another_does_not_own_its_range_end() {
    let layout = layout("hello world foo", 60.0, TextAlignment::Left);
    let offsets: Vec<(usize, usize)> = layout
        .lines()
        .iter()
        .map(|line| (line.first_offset, line.last_offset))
        .collect();
    // The soft wraps put the offsets 6 and 12 on the lines after them; the last line owns the end.
    assert_eq!(offsets, [(0, 5), (6, 11), (12, 15)]);
    assert_eq!(layout.line_of(5), Ok(0));
    assert_eq!(layout.line_of(6), Ok(1));
    assert_eq!(layout.line_of(12), Ok(2));
    assert_eq!(layout.line_of(15), Ok(2));
}

#[test]
fn a_hard_break_ends_its_line_before_the_break_and_the_next_line_starts_after_it() {
    let layout = layout("ab\n\ncd", -1.0, TextAlignment::Left);
    let offsets: Vec<(usize, usize)> = layout
        .lines()
        .iter()
        .map(|line| (line.first_offset, line.last_offset))
        .collect();
    assert_eq!(offsets, [(0, 2), (3, 3), (4, 6)]);
    assert_eq!(layout.line_of(2), Ok(0));
    assert_eq!(layout.line_of(3), Ok(1));
    assert_eq!(layout.line_of(4), Ok(2));
}

#[test]
fn a_last_offset_is_a_grapheme_boundary_even_when_the_last_grapheme_has_several_code_points() {
    // A wrapped line whose last grapheme is "e" + acute: the line's last offset is before both.
    let text = format!("abcd{}ef", "e\u{301}");
    let layout = layout(&text, 50.0, TextAlignment::Left);
    assert_eq!(layout.lines()[0].range, 0..6);
    assert_eq!(layout.lines()[0].last_offset, 4);
}

#[test]
fn the_end_after_a_final_hard_break_is_on_an_empty_line_below() {
    let layout = layout("ab\n", -1.0, TextAlignment::Left);
    assert_eq!(layout.lines().len(), 2);
    let after = &layout.lines()[1];
    assert!(after.after_final_break);
    assert_eq!(after.range, 3..3);
    assert_eq!((after.first_offset, after.last_offset), (3, 3));
    assert_eq!(layout.lines()[0].last_offset, 2);
    assert_eq!(layout.line_of(3), Ok(1));
    // Same height as the line above it, directly below.
    assert_eq!(after.height(), HEIGHT);
    assert_eq!(after.top(), ORIGIN.y + HEIGHT);
    let carets = layout.carets(3).unwrap();
    assert_eq!(carets.line, 1);
    let caret = carets.primary(TextDirection::Ltr);
    assert_eq!(
        (caret.x, caret.top, caret.height),
        (ORIGIN.x, ORIGIN.y + HEIGHT, HEIGHT)
    );
}

#[test]
fn an_empty_line_follows_the_alignment() {
    for (alignment, expected_x) in [
        (TextAlignment::Left, ORIGIN.x),
        (TextAlignment::Center, ORIGIN.x + 50.0),
        (TextAlignment::Right, ORIGIN.x + 100.0),
    ] {
        let layout = layout("ab\n", 100.0, alignment);
        assert_eq!(
            layout.carets(3).unwrap().primary(TextDirection::Ltr).x,
            expected_x
        );
    }
}

#[test]
fn empty_text_is_one_line_measured_by_the_given_extents() {
    let layout = layout("", 100.0, TextAlignment::Center);
    assert_eq!(layout.text_len(), 0);
    assert_eq!(layout.lines().len(), 1);
    let line = &layout.lines()[0];
    assert_eq!((line.ascent, line.descent), (7.0, 2.0));
    assert_eq!(line.origin, Vector2::new(ORIGIN.x + 50.0, ORIGIN.y + 7.0));
    assert_eq!((line.first_offset, line.last_offset), (0, 0));
    assert_eq!(layout.grapheme_boundaries(), [0]);
    let caret = layout.caret(0, TextDirection::Ltr).unwrap();
    assert_eq!(
        (caret.x, caret.top, caret.height),
        (ORIGIN.x + 50.0, ORIGIN.y, 9.0)
    );
    assert_eq!(layout.hit_test(Vector2::new(500.0, 500.0)), Ok(0));
    assert_eq!(layout.selection_rects(0, 0), Ok(Vec::new()));
}

#[test]
fn a_layout_is_not_built_from_data_that_breaks_the_invariants() {
    struct Broken(ParagraphFacts, Vec<usize>);
    impl ParagraphSource for Broken {
        fn facts(&self) -> Result<ParagraphFacts, TextLayoutError> {
            Ok(self.0.clone())
        }
        fn character_breaks(&self) -> Result<Vec<usize>, TextLayoutError> {
            Ok(self.1.clone())
        }
        fn word_breaks(&self) -> Result<Vec<usize>, TextLayoutError> {
            Ok(vec![3, 1])
        }
        fn carets(&self, _: usize, _: usize) -> Result<ServerCarets, TextLayoutError> {
            unreachable!("not asked")
        }
        fn selection(
            &self,
            _: usize,
            _: usize,
            _: usize,
        ) -> Result<Vec<(f32, f32)>, TextLayoutError> {
            unreachable!("not asked")
        }
        fn hit_test_position(&self, _: usize, _: f32) -> Result<Option<usize>, TextLayoutError> {
            unreachable!("not asked")
        }
    }
    let good = FakeParagraph::new("abc", -1.0, TextAlignment::Left)
        .facts()
        .unwrap();
    let build = |facts: ParagraphFacts, breaks: Vec<usize>| {
        TextLayout::new(Broken(facts, breaks), ORIGIN, EMPTY_LINE).err()
    };
    let line_ranges = Some(TextLayoutError::MalformedServerData(
        ServerDataProblem::LineRanges,
    ));
    let grapheme_breaks = Some(TextLayoutError::MalformedServerData(
        ServerDataProblem::GraphemeBreaks,
    ));

    assert_eq!(build(good.clone(), vec![1, 2, 3]), None);
    let mut short = good.clone();
    short.text_len = 4;
    assert_eq!(build(short, vec![1, 2, 3]), line_ranges);
    let mut gap = good.clone();
    gap.lines[0].start = 1;
    assert_eq!(build(gap, vec![1, 2, 3]), line_ranges);
    let mut none = good.clone();
    none.lines.clear();
    assert_eq!(build(none, vec![1, 2, 3]), line_ranges);
    assert_eq!(build(good.clone(), vec![1, 3]), None);
    assert_eq!(build(good.clone(), vec![1, 1, 3]), grapheme_breaks);
    assert_eq!(build(good.clone(), vec![1, 2]), grapheme_breaks);
    assert_eq!(build(good.clone(), vec![1, 2, 4]), grapheme_breaks);
    assert_eq!(
        TextLayout::new(
            FakeParagraph::new("abc", -1.0, TextAlignment::Left),
            Vector2::new(f32::NAN, 0.0),
            EMPTY_LINE
        )
        .err(),
        Some(TextLayoutError::NonFinite)
    );
}

// ---- hit test and carets ----

fn assert_every_boundary_round_trips(layout: &TextLayout<FakeParagraph>, input: TextDirection) {
    for offset in layout.grapheme_boundaries() {
        let carets = layout.carets(*offset).unwrap();
        let caret = carets.primary(input);
        let hit = layout.hit(caret.center()).unwrap();
        assert_eq!(
            hit.offset,
            *offset,
            "the caret of offset {offset} at {:?} hit {hit:?}",
            caret.center()
        );
        assert_eq!(hit.line, layout.line_of(*offset).unwrap());
        assert_eq!(carets.line, hit.line);
    }
}

#[test]
fn the_centre_of_every_caret_hits_its_own_offset_at_every_alignment() {
    let text = format!("hello wor{}ld foo\nbar\n", "e\u{301}");
    for alignment in ALIGNMENTS {
        for width in [-1.0, 0.0, 60.0, 200.0] {
            assert_every_boundary_round_trips(&layout(&text, width, alignment), TextDirection::Ltr);
        }
    }
}

#[test]
fn right_to_left_lines_round_trip_too() {
    let text = format!("{ALEF}{BET}{GIMEL}{ALEF}{BET}{GIMEL}{ALEF}");
    for alignment in ALIGNMENTS {
        for width in [-1.0, 40.0, 100.0] {
            let layout = layout(&text, width, alignment);
            assert!(
                layout
                    .lines()
                    .iter()
                    .all(|line| line.direction == TextDirection::Rtl)
            );
            assert_every_boundary_round_trips(&layout, TextDirection::Rtl);
        }
    }
}

#[test]
fn carets_are_in_the_drawn_coordinates() {
    // Centred in 100 px, "abc" is 30 px wide: it starts at 5 + 35. The caret before "b" is 10 px in.
    let layout = layout("abc", 100.0, TextAlignment::Center);
    let carets = layout.carets(1).unwrap();
    let (leading, trailing) = (carets.leading.unwrap(), carets.trailing.unwrap());
    assert_eq!(leading.x, 5.0 + 35.0 + 10.0);
    assert_eq!(trailing.x, leading.x);
    // The baseline is 28; the lower half is the leading caret's and the upper half the trailing one's.
    assert_eq!((trailing.top, trailing.height), (20.0, 5.5));
    assert_eq!((leading.top, leading.height), (25.5, 5.5));
    // The caret at the start of the text is one full-height trailing caret; at the end, one leading.
    let start = layout.carets(0).unwrap();
    assert_eq!(
        (start.leading, start.trailing.map(|caret| caret.height)),
        (None, Some(HEIGHT))
    );
    let end = layout.carets(3).unwrap();
    assert_eq!(
        (end.trailing, end.leading.map(|caret| caret.height)),
        (None, Some(HEIGHT))
    );
}

#[test]
fn the_end_of_a_wrapped_row_has_a_caret_on_that_row_as_well_as_the_next_rows_start() {
    let layout = layout("hello world foo", 60.0, TextAlignment::Left);
    // Offset 6 is on the second row, at its start; the first row's own end is the same offset.
    assert_eq!(layout.carets(6).unwrap().line, 1);
    assert_eq!(
        layout.carets(6).unwrap().primary(TextDirection::Ltr).x,
        ORIGIN.x
    );
    let end_of_row = layout.carets_on_line(0, 6).unwrap();
    assert_eq!(end_of_row.line, 0);
    assert_eq!(end_of_row.trailing, None);
    let caret = end_of_row.primary(TextDirection::Ltr);
    assert_eq!(
        (caret.x, caret.top - layout.lines()[0].top()),
        (ORIGIN.x + 60.0, 0.0)
    );
    // An offset is only on the rows whose text it touches.
    assert_eq!(
        layout.carets_on_line(0, 7).err(),
        Some(TextLayoutError::OffsetNotOnLine { line: 0, offset: 7 })
    );
    assert_eq!(
        layout.carets_on_line(5, 0).err(),
        Some(TextLayoutError::LineOutOfRange { line: 5, count: 3 })
    );
}

#[test]
fn a_caret_rect_has_the_width_the_caller_draws() {
    let caret = layout("abc", -1.0, TextAlignment::Left)
        .caret(1, TextDirection::Ltr)
        .unwrap();
    assert_eq!(
        caret.rect(2.0),
        Rect2::new(Vector2::new(15.0, 25.5), Vector2::new(2.0, 5.5))
    );
    assert_eq!(caret.center(), Vector2::new(15.0, 28.25));
}

#[test]
fn the_primary_caret_goes_the_way_the_input_does_where_directions_meet() {
    let leading = Caret {
        x: 30.0,
        top: 0.0,
        height: 5.0,
        direction: Some(TextDirection::Ltr),
    };
    let trailing = Caret {
        x: 60.0,
        top: 0.0,
        height: 5.0,
        direction: Some(TextDirection::Rtl),
    };
    let carets = Carets {
        line: 0,
        leading: Some(leading),
        trailing: Some(trailing),
    };
    assert_eq!(carets.primary(TextDirection::Ltr), leading);
    assert_eq!(carets.primary(TextDirection::Rtl), trailing);
    // A caret alone is the one, whatever the input direction; a neutral one serves both.
    let alone = Carets {
        line: 0,
        leading: Some(leading),
        trailing: None,
    };
    assert_eq!(alone.primary(TextDirection::Rtl), leading);
    let neutral = Carets {
        line: 0,
        leading: Some(Caret {
            direction: None,
            ..leading
        }),
        trailing: Some(trailing),
    };
    assert_eq!(neutral.primary(TextDirection::Rtl).x, 30.0);
}

#[test]
fn a_point_outside_the_text_hits_the_nearest_line_and_its_end() {
    let layout = layout("hello world foo", 60.0, TextAlignment::Left);
    // Above the first line and left of everything: the start. Below the last and right of it: the end.
    assert_eq!(
        layout.hit(Vector2::new(-50.0, -50.0)),
        Ok(Hit { offset: 0, line: 0 })
    );
    assert_eq!(
        layout.hit(Vector2::new(900.0, 900.0)),
        Ok(Hit {
            offset: 15,
            line: 2
        })
    );
    // Right of a wrapped line: its last offset, which is on that line, not the next line's start.
    assert_eq!(
        layout.hit(Vector2::new(900.0, 25.0)),
        Ok(Hit { offset: 5, line: 0 })
    );
    assert_eq!(
        layout.hit(Vector2::new(900.0, 40.0)),
        Ok(Hit {
            offset: 11,
            line: 1
        })
    );
    // Left of a wrapped line: its first offset.
    assert_eq!(
        layout.hit(Vector2::new(-50.0, 40.0)),
        Ok(Hit { offset: 6, line: 1 })
    );
}

#[test]
fn a_point_right_of_a_line_that_ends_in_a_hard_break_stays_before_the_break() {
    let layout = layout("ab\ncd", -1.0, TextAlignment::Left);
    // The server answers the offset after the line feed, which is the next line's.
    assert_eq!(
        layout.hit(Vector2::new(900.0, 25.0)),
        Ok(Hit { offset: 2, line: 0 })
    );
    assert_eq!(
        layout.hit(Vector2::new(900.0, 40.0)),
        Ok(Hit { offset: 5, line: 1 })
    );
}

#[test]
fn the_gap_between_two_lines_belongs_to_the_line_above() {
    let layout = TextLayout::new(
        FakeParagraph::new("ab\ncd", -1.0, TextAlignment::Left).with_spacing(6.0),
        ORIGIN,
        EMPTY_LINE,
    )
    .unwrap();
    let first_bottom = layout.lines()[0].origin.y + DESCENT;
    assert_eq!(layout.lines()[1].top(), first_bottom + 6.0);
    assert_eq!(
        layout
            .hit(Vector2::new(7.0, first_bottom + 3.0))
            .unwrap()
            .line,
        0
    );
    assert_eq!(
        layout
            .hit(Vector2::new(7.0, first_bottom + 6.0))
            .unwrap()
            .line,
        1
    );
}

#[test]
fn a_hit_inside_a_grapheme_snaps_to_the_nearer_boundary() {
    // "e" + acute is one 10 px grapheme: the server's mid-grapheme answer is offset 1, which is not a
    // boundary. Left of the middle snaps to the start, right of it to the end.
    let layout = layout("ae\u{301}b", -1.0, TextAlignment::Left);
    assert_eq!(layout.grapheme_boundaries(), [0, 1, 3, 4]);
    let y = 22.0;
    assert_eq!(layout.hit_test(Vector2::new(5.0 + 10.0 + 3.0, y)), Ok(1));
    assert_eq!(layout.hit_test(Vector2::new(5.0 + 10.0 + 7.0, y)), Ok(3));
    assert_eq!(layout.hit_test(Vector2::new(5.0 + 10.0 + 4.0, y)), Ok(1));
    assert_eq!(layout.hit_test(Vector2::new(5.0 + 10.0 + 6.0, y)), Ok(3));
}

#[test]
fn offset_at_takes_a_line_and_a_layout_x() {
    let layout = layout("hello world foo", 60.0, TextAlignment::Left);
    assert_eq!(layout.offset_at(1, 5.0 + 22.0), Ok(8));
    assert_eq!(layout.offset_at(1, 5.0 + 1000.0), Ok(11));
    assert_eq!(layout.offset_at(2, -1000.0), Ok(12));
    assert_eq!(
        layout.offset_at(3, 0.0),
        Err(TextLayoutError::LineOutOfRange { line: 3, count: 3 })
    );
    assert_eq!(
        layout.offset_at(0, f32::INFINITY),
        Err(TextLayoutError::NonFinite)
    );
}

#[test]
fn invalid_input_is_an_error_not_a_clamp() {
    let layout = layout("abc", -1.0, TextAlignment::Left);
    let past = TextLayoutError::OffsetOutOfRange { offset: 4, len: 3 };
    assert_eq!(layout.line_of(4), Err(past));
    assert_eq!(layout.carets(4).err(), Some(past));
    assert_eq!(layout.caret(4, TextDirection::Ltr).err(), Some(past));
    assert_eq!(layout.selection_rects(0, 4), Err(past));
    assert_eq!(layout.previous_grapheme(4), Err(past));
    assert_eq!(layout.next_grapheme(4), Err(past));
    assert_eq!(layout.nearest_grapheme(4), Err(past));
    assert_eq!(layout.word_at(4), Err(past));
    assert_eq!(layout.word_range_at(4), Err(past));
    assert_eq!(
        layout.selection_rects(2, 1),
        Err(TextLayoutError::InvalidRange { start: 2, end: 1 })
    );
    assert_eq!(
        layout.hit_test(Vector2::new(f32::NAN, 0.0)),
        Err(TextLayoutError::NonFinite)
    );
    assert_eq!(
        layout.hit_test(Vector2::new(0.0, f32::NEG_INFINITY)),
        Err(TextLayoutError::NonFinite)
    );
    assert_eq!(
        layout.line(1).err(),
        Some(TextLayoutError::LineOutOfRange { line: 1, count: 1 })
    );
}

// ---- selection ----

fn rects(
    layout: &TextLayout<FakeParagraph>,
    start: usize,
    end: usize,
) -> Vec<(usize, f32, f32, f32, f32)> {
    layout
        .selection_rects(start, end)
        .unwrap()
        .iter()
        .map(|run| {
            (
                run.line,
                run.rect.position.x,
                run.rect.position.y,
                run.rect.size.x,
                run.rect.size.y,
            )
        })
        .collect()
}

#[test]
fn a_selection_is_one_rect_per_line_it_touches_at_the_drawn_position() {
    let layout = layout("hello world foo", 60.0, TextAlignment::Left);
    assert_eq!(rects(&layout, 2, 5), [(0, 25.0, 20.0, 30.0, HEIGHT)]);
    assert_eq!(
        rects(&layout, 3, 14),
        [
            (0, 35.0, 20.0, 30.0, HEIGHT),
            (1, 5.0, 31.0, 60.0, HEIGHT),
            (2, 5.0, 42.0, 20.0, HEIGHT),
        ]
    );
    // A selection that ends where a line ends does not reach into the next one.
    assert_eq!(rects(&layout, 4, 6), [(0, 45.0, 20.0, 20.0, HEIGHT)]);
    assert_eq!(layout.selection_rects(3, 3), Ok(Vec::new()));
}

#[test]
fn selection_rects_move_with_the_alignment() {
    // "abc" centred in 100 px starts at 5 + 35.
    assert_eq!(
        rects(&layout("abc", 100.0, TextAlignment::Center), 1, 3),
        [(0, 5.0 + 35.0 + 10.0, 20.0, 20.0, HEIGHT)]
    );
    assert_eq!(
        rects(&layout("abc", 100.0, TextAlignment::Right), 0, 1),
        [(0, 5.0 + 70.0, 20.0, 10.0, HEIGHT)]
    );
}

#[test]
fn a_selection_inside_a_grapheme_is_part_of_its_cell() {
    let layout = layout("ae\u{301}b", -1.0, TextAlignment::Left);
    assert_eq!(rects(&layout, 1, 2), [(0, 15.0, 20.0, 5.0, HEIGHT)]);
    assert_eq!(rects(&layout, 1, 3), [(0, 15.0, 20.0, 10.0, HEIGHT)]);
}

#[test]
fn a_right_to_left_selection_covers_the_mirrored_cells() {
    // Logical a b c; shown c b a from the left: offsets 0..1 (a) are the rightmost cell.
    let text = format!("{ALEF}{BET}{GIMEL}");
    let layout = layout(&text, -1.0, TextAlignment::Left);
    assert_eq!(rects(&layout, 0, 1), [(0, 25.0, 20.0, 10.0, HEIGHT)]);
    assert_eq!(rects(&layout, 1, 3), [(0, 5.0, 20.0, 20.0, HEIGHT)]);
}

#[test]
fn the_zero_width_line_break_adds_no_rect() {
    let layout = layout("ab\ncd", -1.0, TextAlignment::Left);
    assert_eq!(rects(&layout, 2, 3), []);
    assert_eq!(
        rects(&layout, 1, 4),
        [(0, 15.0, 20.0, 10.0, HEIGHT), (1, 5.0, 31.0, 10.0, HEIGHT)]
    );
}

#[test]
fn a_selection_over_lines_is_the_sum_of_its_halves() {
    // Splitting a range anywhere gives the same runs, joined where they meet.
    let layout = layout("hello world foo", 60.0, TextAlignment::Left);
    let whole = rects(&layout, 2, 13);
    for split in 3..13 {
        let mut halves = rects(&layout, 2, split);
        halves.extend(rects(&layout, split, 13));
        let total_width: f32 = halves.iter().map(|run| run.3).sum();
        let whole_width: f32 = whole.iter().map(|run| run.3).sum();
        assert_eq!(total_width, whole_width, "split at {split}");
    }
}

// ---- graphemes ----

#[test]
fn graphemes_step_between_boundaries_from_any_offset() {
    let layout = layout("ae\u{301}b", -1.0, TextAlignment::Left);
    assert_eq!(layout.grapheme_boundaries(), [0, 1, 3, 4]);
    assert_eq!(layout.next_grapheme(0), Ok(Some(1)));
    assert_eq!(layout.next_grapheme(1), Ok(Some(3)));
    assert_eq!(layout.next_grapheme(2), Ok(Some(3)));
    assert_eq!(layout.next_grapheme(4), Ok(None));
    assert_eq!(layout.previous_grapheme(4), Ok(Some(3)));
    assert_eq!(layout.previous_grapheme(3), Ok(Some(1)));
    assert_eq!(layout.previous_grapheme(2), Ok(Some(1)));
    assert_eq!(layout.previous_grapheme(0), Ok(None));
    assert_eq!(layout.nearest_grapheme(0), Ok(0));
    assert_eq!(layout.nearest_grapheme(2), Ok(1));
    assert_eq!(layout.nearest_grapheme(3), Ok(3));
}

#[test]
fn between_two_boundaries_the_nearest_is_the_lower_one() {
    // Five code points in one grapheme, as a ZWJ sequence is: 1 is 1 from 0 and 4 from 5; 3 is nearer 5.
    let layout = layout(
        "\u{1F468}\u{301}\u{301}\u{301}\u{301}",
        -1.0,
        TextAlignment::Left,
    );
    assert_eq!(layout.grapheme_boundaries(), [0, 5]);
    assert_eq!(layout.nearest_grapheme(1), Ok(0));
    assert_eq!(layout.nearest_grapheme(2), Ok(0));
    assert_eq!(layout.nearest_grapheme(3), Ok(5));
    let even = self::layout("e\u{301}", -1.0, TextAlignment::Left);
    assert_eq!(even.nearest_grapheme(1), Ok(0));
}

// ---- words ----

#[test]
fn words_are_the_servers_runs_and_the_double_click_word_is_the_first_that_touches_the_offset() {
    let layout = layout("hello world  foo", -1.0, TextAlignment::Left);
    assert_eq!(layout.word_ranges().unwrap(), [(0, 5), (6, 11), (13, 16)]);
    assert_eq!(layout.word_at(0), Ok(Some((0, 5))));
    assert_eq!(layout.word_at(5), Ok(Some((0, 5))));
    assert_eq!(layout.word_at(6), Ok(Some((6, 11))));
    assert_eq!(layout.word_at(12), Ok(None));
    assert_eq!(layout.word_at(16), Ok(Some((13, 16))));
}

#[test]
fn word_range_at_follows_the_text_boundaries_contract_at_every_offset() {
    for text in ["hello world  foo", "  ab cd  ", "x", "   ", ""] {
        let layout = layout(text, -1.0, TextAlignment::Left);
        let lists = layout.boundaries().unwrap();
        let text_chars = chars(text);
        for offset in 0..=text_chars.len() {
            let range = layout.word_range_at(offset).unwrap();
            assert_eq!(
                range,
                lists.word_range(&text_chars, offset).unwrap(),
                "{text:?} at {offset}"
            );
            assert!(range.0 <= offset && offset <= range.1);
        }
    }
}

#[test]
fn boundaries_answer_what_the_edit_buffer_asks() {
    let layout = layout("hello e\u{301}x world", -1.0, TextAlignment::Left);
    let boundaries = layout.boundaries().unwrap();
    let text = chars("hello e\u{301}x world");
    assert_eq!(boundaries.next_grapheme(&text, 6), Ok(8));
    assert_eq!(boundaries.previous_grapheme(&text, 8), Ok(6));
    assert_eq!(boundaries.next_word(&text, 0), Ok(5));
    assert_eq!(boundaries.previous_word(&text, 12), Ok(10));
    assert_eq!(boundaries.previous_word(&text, 10), Ok(6));
    // Built for a text of another length, the lists say so.
    assert_eq!(
        boundaries.next_grapheme(&text[..5], 0),
        Err(EditError::TextMismatch {
            built_for: text.len(),
            buffer: 5
        })
    );
}

#[test]
fn malformed_word_breaks_are_reported() {
    struct OddWords(FakeParagraph, Vec<usize>);
    impl ParagraphSource for OddWords {
        fn facts(&self) -> Result<ParagraphFacts, TextLayoutError> {
            self.0.facts()
        }
        fn character_breaks(&self) -> Result<Vec<usize>, TextLayoutError> {
            self.0.character_breaks()
        }
        fn word_breaks(&self) -> Result<Vec<usize>, TextLayoutError> {
            Ok(self.1.clone())
        }
        fn carets(&self, line: usize, offset: usize) -> Result<ServerCarets, TextLayoutError> {
            self.0.carets(line, offset)
        }
        fn selection(
            &self,
            line: usize,
            start: usize,
            end: usize,
        ) -> Result<Vec<(f32, f32)>, TextLayoutError> {
            self.0.selection(line, start, end)
        }
        fn hit_test_position(&self, line: usize, x: f32) -> Result<Option<usize>, TextLayoutError> {
            self.0.hit_test_position(line, x)
        }
    }
    let malformed = TextLayoutError::MalformedServerData(ServerDataProblem::WordBreaks);
    for breaks in [vec![0], vec![2, 1], vec![0, 2, 1, 3], vec![0, 9]] {
        let layout = TextLayout::new(
            OddWords(
                FakeParagraph::new("abc d", -1.0, TextAlignment::Left),
                breaks,
            ),
            ORIGIN,
            EMPTY_LINE,
        )
        .unwrap();
        assert_eq!(layout.word_ranges().err(), Some(malformed));
        assert_eq!(layout.boundaries().err(), Some(malformed));
    }
}

// ---- the LineLayout adapter ----

fn page_layout(layout: &TextLayout<FakeParagraph>) -> ParagraphLines<'_, FakeParagraph> {
    // Two and a bit lines of 11 px fit.
    layout
        .line_layout(TextDirection::Ltr, 2.0 * HEIGHT + 5.0)
        .unwrap()
}

#[test]
fn line_layout_meets_the_contract_for_every_offset_and_line() {
    for text in [
        "hello world foo bar baz",
        "ab\n\ncd\n",
        "",
        "x",
        "ab\ncd e\u{301}f gh",
    ] {
        for width in [-1.0, 40.0, 70.0] {
            let layout = layout(text, width, TextAlignment::Left);
            let lines = page_layout(&layout);
            let len = layout.text_len();
            assert!(lines.line_count() >= 1);
            for line in 0..lines.line_count() {
                let (first, last) = lines.line_range(line).unwrap();
                assert!(first <= last && last <= len, "{text:?} line {line}");
                // Both ends are on the line they are the ends of.
                assert_eq!(lines.line_of(first), Ok(line));
                assert_eq!(lines.line_of(last), Ok(line));
                // An x is answered with an offset on that line.
                for x in [-20.0, 0.0, 13.0, 31.0, 5000.0] {
                    let offset = lines.offset_at(line, x).unwrap();
                    assert!(
                        first <= offset && offset <= last,
                        "{text:?} line {line} x {x}: {offset}"
                    );
                }
            }
            for offset in 0..=len {
                let line = lines.line_of(offset).unwrap();
                assert!(line < lines.line_count());
                lines.x_of(offset).unwrap();
            }
        }
    }
}

#[test]
fn line_layout_positions_are_from_the_left_of_the_text() {
    let layout = layout("hello world foo", 100.0, TextAlignment::Right);
    let lines = layout.line_layout(TextDirection::Ltr, 40.0).unwrap();
    // "hello worl" fills the first 100 px line; "d foo" is 50 px, right aligned from x = 50.
    assert_eq!(lines.x_of(0), Ok(0.0));
    assert_eq!(lines.x_of(10), Ok(50.0));
    assert_eq!(lines.x_of(12), Ok(70.0));
    assert_eq!(lines.offset_at(1, 70.0), Ok(12));
    assert_eq!(lines.offset_at(1, 0.0), Ok(10));
}

#[test]
fn a_page_is_the_lines_that_fit_and_at_least_one() {
    let layout = layout("a\nb\nc\nd\ne", -1.0, TextAlignment::Left);
    assert_eq!(
        layout
            .line_layout(TextDirection::Ltr, 3.0 * HEIGHT)
            .unwrap()
            .page_lines(),
        3
    );
    assert_eq!(
        layout
            .line_layout(TextDirection::Ltr, 3.5 * HEIGHT)
            .unwrap()
            .page_lines(),
        3
    );
    assert_eq!(
        layout
            .line_layout(TextDirection::Ltr, 1.0)
            .unwrap()
            .page_lines(),
        1
    );
    assert_eq!(
        layout
            .line_layout(TextDirection::Ltr, 0.0)
            .unwrap()
            .page_lines(),
        1
    );
    assert_eq!(
        layout
            .line_layout(TextDirection::Ltr, -50.0)
            .unwrap()
            .page_lines(),
        1
    );
    assert_eq!(
        layout.line_layout(TextDirection::Ltr, f32::NAN).err(),
        Some(TextLayoutError::NonFinite)
    );
    // Spacing between lines is part of the pitch.
    let spaced = TextLayout::new(
        FakeParagraph::new("a\nb\nc\nd", -1.0, TextAlignment::Left).with_spacing(9.0),
        ORIGIN,
        EMPTY_LINE,
    )
    .unwrap();
    assert_eq!(
        spaced
            .line_layout(TextDirection::Ltr, 2.0 * (HEIGHT + 9.0))
            .unwrap()
            .page_lines(),
        2
    );
}

#[test]
fn line_layout_errors_map_to_the_edit_errors() {
    let layout = layout("abc", -1.0, TextAlignment::Left);
    let lines = page_layout(&layout);
    assert_eq!(
        lines.line_of(4),
        Err(EditError::OffsetOutOfRange { offset: 4, len: 3 })
    );
    assert_eq!(
        lines.x_of(4),
        Err(EditError::OffsetOutOfRange { offset: 4, len: 3 })
    );
    assert_eq!(
        lines.line_range(1),
        Err(EditError::InvalidLayout(LayoutProblem::LineOutOfRange {
            line: 1,
            count: 1
        }))
    );
    assert_eq!(
        lines.offset_at(1, 0.0),
        Err(EditError::InvalidLayout(LayoutProblem::LineOutOfRange {
            line: 1,
            count: 1
        }))
    );
    assert_eq!(
        lines.edit_error(TextLayoutError::Stale {
            built_for: 3,
            now: 5
        }),
        EditError::TextMismatch {
            built_for: 3,
            buffer: 5
        }
    );
    assert_eq!(
        lines.edit_error(TextLayoutError::NoCaret { line: 0, offset: 2 }),
        EditError::InvalidLayout(LayoutProblem::OffsetOutsideLine { line: 0, offset: 2 })
    );
}

// ---- the adapters under the edit buffer ----

const MULTILINE: EditConfig = EditConfig {
    multiline: true,
    read_only: false,
    secure: false,
    max_length: None,
};

/// An edit buffer for `text` and the layout of that text, wrapped at `width`.
fn editing(text: &str, width: f32) -> (EditBuffer, TextLayout<FakeParagraph>) {
    (
        EditBuffer::with_text(MULTILINE, text),
        layout(text, width, TextAlignment::Left),
    )
}

fn apply(buffer: &mut EditBuffer, layout: &TextLayout<FakeParagraph>, command: EditCommand) {
    let boundaries = layout.boundaries().unwrap();
    let lines = page_layout(layout);
    let environment = EditEnvironment::new(&boundaries).with_layout(&lines);
    buffer
        .apply(command, &environment)
        .expect("the adapters satisfy the contracts the buffer checks");
}

fn place(buffer: &mut EditBuffer, layout: &TextLayout<FakeParagraph>, offset: usize) {
    apply(
        buffer,
        layout,
        EditCommand::SetSelection {
            anchor: offset,
            focus: offset,
        },
    );
}

#[test]
fn the_edit_buffer_accepts_the_adapters_for_vertical_and_line_movement() {
    let (mut buffer, layout) = editing("hello world foo bar baz", 60.0);
    // Rows: "hello " 0..6, "world " 6..12, "foo ba" 12..18, "r baz" 18..23.
    place(&mut buffer, &layout, 8);
    let down = EditCommand::MoveLine {
        direction: Direction::Forward,
        extend: false,
    };
    let up = EditCommand::MoveLine {
        direction: Direction::Backward,
        extend: false,
    };
    apply(&mut buffer, &layout, down.clone());
    assert_eq!(buffer.focus(), 14);
    apply(&mut buffer, &layout, down.clone());
    assert_eq!(buffer.focus(), 20);
    apply(&mut buffer, &layout, up.clone());
    apply(&mut buffer, &layout, up.clone());
    assert_eq!(buffer.focus(), 8);
    // End and Home work on the row; End stops before the row's last character.
    apply(
        &mut buffer,
        &layout,
        EditCommand::MoveLineEdge {
            direction: Direction::Forward,
            extend: false,
        },
    );
    assert_eq!(buffer.focus(), 11);
    apply(
        &mut buffer,
        &layout,
        EditCommand::MoveLineEdge {
            direction: Direction::Backward,
            extend: false,
        },
    );
    assert_eq!(buffer.focus(), 6);
    // A page is two lines.
    apply(
        &mut buffer,
        &layout,
        EditCommand::MovePage {
            direction: Direction::Forward,
            extend: false,
        },
    );
    assert_eq!(buffer.focus(), 18);
}

#[test]
fn the_edit_buffer_keeps_the_desired_x_through_a_short_line() {
    let (mut buffer, layout) = editing("abcdef\nab\nabcdef", -1.0);
    place(&mut buffer, &layout, 5);
    let down = EditCommand::MoveLine {
        direction: Direction::Forward,
        extend: false,
    };
    apply(&mut buffer, &layout, down.clone());
    // The short line ends before the column; the next one comes back to it.
    assert_eq!(buffer.focus(), 9);
    apply(&mut buffer, &layout, down);
    assert_eq!(buffer.focus(), 15);
}

#[test]
fn the_edit_buffer_moves_and_deletes_by_the_servers_graphemes_and_words() {
    let text = "hello e\u{301}x world";
    let (mut buffer, layout) = editing(text, -1.0);
    place(&mut buffer, &layout, 8);
    apply(
        &mut buffer,
        &layout,
        EditCommand::MoveGrapheme {
            direction: Direction::Backward,
            extend: false,
        },
    );
    assert_eq!(buffer.focus(), 6);
    apply(
        &mut buffer,
        &layout,
        EditCommand::MoveWord {
            direction: Direction::Forward,
            extend: false,
        },
    );
    assert_eq!(buffer.focus(), 9);
    place(&mut buffer, &layout, 8);
    apply(
        &mut buffer,
        &layout,
        EditCommand::DeleteGrapheme(Direction::Backward),
    );
    assert_eq!(buffer.value(), "hello x world");
    let (mut buffer, layout) = editing(text, -1.0);
    apply(&mut buffer, &layout, EditCommand::SelectWordAt(7));
    assert_eq!(buffer.selection_range(), 6..9);
}

#[test]
fn the_caret_after_a_trailing_line_break_is_a_line_the_buffer_can_move_to_and_from() {
    let (mut buffer, layout) = editing("ab\n", -1.0);
    apply(
        &mut buffer,
        &layout,
        EditCommand::MoveLine {
            direction: Direction::Backward,
            extend: false,
        },
    );
    assert_eq!(buffer.focus(), 0);
    apply(
        &mut buffer,
        &layout,
        EditCommand::MoveLine {
            direction: Direction::Forward,
            extend: false,
        },
    );
    assert_eq!(buffer.focus(), 3);
}
