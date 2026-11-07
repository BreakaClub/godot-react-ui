use super::*;
use crate::text_style::spec::DecorationThickness;

fn spans(json: &str) -> Vec<SpanSpec> {
    serde_json::from_str(json).expect("spans")
}

fn base(json: &str) -> StyleSpec {
    let mut style: StyleSpec = serde_json::from_str(json).expect("a style");
    settle(&mut style);
    style
}

fn rich(text: &str, json: &str) -> RichText {
    resolve(&base("{}"), text, text, None, &spans(json)).expect("resolves")
}

fn segment_at(rich: &RichText, display: usize) -> Option<&Segment> {
    rich.segments
        .iter()
        .find(|segment| segment.range.contains(&display))
}

fn pieces(rich: &RichText) -> Vec<(String, bool, Option<String>)> {
    let display: Vec<char> = rich.display.chars().collect();
    rich.segments
        .iter()
        .map(|segment| {
            (
                display[segment.range.clone()].iter().collect::<String>(),
                segment.inlay,
                segment.style.color.clone(),
            )
        })
        .collect()
}

#[test]
fn spans_cut_the_text_into_segments_that_tile_the_display() {
    let rich = rich(
        "const x = 1;",
        r##"[{"start":6,"end":7,"style":{"color":"#c678dd"}},{"start":10,"end":11,"style":{"color":"#ef4444"}}]"##,
    );
    assert_eq!(rich.display, "const x = 1;");
    assert_eq!(
        pieces(&rich),
        [
            ("const ".to_string(), false, None),
            ("x".to_string(), false, Some("#c678dd".to_string())),
            (" = ".to_string(), false, None),
            ("1".to_string(), false, Some("#ef4444".to_string())),
            (";".to_string(), false, None),
        ]
    );
    let tiled: usize = rich
        .segments
        .iter()
        .map(|segment| segment.range.len())
        .sum();
    assert_eq!(tiled, 12);
    assert!(!rich.map.has_inlays());
    assert_eq!(
        segment_at(&rich, 7).map(|segment| segment.range.clone()),
        Some(7..10)
    );
    assert_eq!(segment_at(&rich, 12), None);
}

#[test]
fn a_child_inherits_colour_font_and_decoration_from_its_span() {
    let rich = rich(
        "abcdefgh",
        r##"[{"start":2,"end":8,"style":{"color":"#ff0000","fontWeight":700,"textDecorationLine":"underline","textDecorationStyle":"wavy"},
            "children":[{"start":4,"end":6,"style":{"fontStyle":"italic","color":"#00ff00"}}]}]"##,
    );
    let at = |display: usize| segment_at(&rich, display).expect("a segment").style.clone();
    // Before the span: the node's own look.
    assert_eq!(at(0).color, None);
    assert!(at(0).decorations.is_empty());
    // In the span.
    assert_eq!(at(2).color.as_deref(), Some("#ff0000"));
    assert_eq!(at(2).font.weight, Some(700));
    assert_eq!(at(2).decorations.len(), 1);
    assert_eq!(at(2).decorations[0].style, DecorationStyleSpec::Wavy);
    assert_eq!(
        at(2).decorations[0].color,
        "#ff0000",
        "currentcolor is the span's own"
    );
    // In its child: its own colour and a slant, the weight and the underline of its parent (in the parent's colour).
    let child = at(4);
    assert_eq!(child.color.as_deref(), Some("#00ff00"));
    assert!(child.font.italic);
    assert_eq!(child.font.weight, Some(700));
    assert_eq!(child.decorations.len(), 1);
    assert_eq!(child.decorations[0].color, "#ff0000");
    // After the child, still in the span.
    assert_eq!(at(6).color.as_deref(), Some("#ff0000"));
    assert!(!at(6).font.italic);
}

#[test]
fn a_decoration_the_node_has_is_on_every_segment_and_a_span_adds_to_it() {
    let node = base(
        r##"{"color":"#ffffff","textDecorationLine":"line-through","textDecorationColor":"#999999"}"##,
    );
    let rich = resolve(
        &node,
        "abc",
        "abc",
        None,
        &spans(r##"[{"start":1,"end":2,"style":{"textDecorationLine":"underline","textDecorationThickness":3}}]"##),
    )
    .expect("resolves");
    let counts: Vec<usize> = rich
        .segments
        .iter()
        .map(|segment| segment.style.decorations.len())
        .collect();
    assert_eq!(counts, [1, 2, 1]);
    let own = &rich.segments[1].style.decorations[1];
    assert!(own.lines.underline && !own.lines.line_through);
    assert_eq!(own.thickness, DecorationThickness::Px(3.0));
    assert_eq!(
        own.color, "#ffffff",
        "currentcolor of a span with no colour is the node's"
    );
    let plain = resolve(&node, "abc", "abc", None, &[]).expect("plain");
    assert_eq!(plain.segments.len(), 1);
    assert_eq!(
        plain.segments[0].style.decorations, node.text_decorations,
        "the node's own line is on its text"
    );
}

#[test]
fn backgrounds_fill_their_span_outermost_first() {
    let rich = rich(
        "abcdef",
        r##"[{"start":1,"end":5,"style":{"backgroundColor":"#ffff00"},
            "children":[{"start":2,"end":3,"style":{"backgroundColor":"#00ffff"}}]}]"##,
    );
    assert_eq!(
        rich.backgrounds,
        [
            Background {
                range: 1..5,
                color: "#ffff00".into()
            },
            Background {
                range: 2..3,
                color: "#00ffff".into()
            },
        ]
    );
}

#[test]
fn an_inlay_is_in_the_display_and_not_in_the_source() {
    let rich = rich(
        "let x = 1",
        r##"[{"start":5,"end":5,"inlay":": number","style":{"color":"#64748b"}},{"start":9,"end":9,"inlay":" // one"}]"##,
    );
    assert_eq!(rich.display, "let x: number = 1 // one");
    assert_eq!(rich.map.display_len(), rich.display.chars().count());
    assert_eq!(rich.map.display_of(5, offsets::Side::Before), 5);
    assert_eq!(rich.map.display_of(5, offsets::Side::After), 13);
    assert_eq!(
        pieces(&rich),
        [
            ("let x".to_string(), false, None),
            (": number".to_string(), true, Some("#64748b".to_string())),
            (" = 1".to_string(), false, None),
            (" // one".to_string(), true, None),
        ]
    );
    // An inlay in a span takes the span's look and its own on top.
    let inside = super::tests::rich(
        "ab",
        r##"[{"start":0,"end":2,"style":{"color":"#ff0000","fontStyle":"italic"},"children":[{"start":1,"end":1,"inlay":"?","style":{"fontWeight":700}}]}]"##,
    );
    assert_eq!(inside.display, "a?b");
    let hint = &inside.segments[1];
    assert!(hint.inlay);
    assert_eq!(hint.style.color.as_deref(), Some("#ff0000"));
    assert!(hint.style.font.italic);
    assert_eq!(hint.style.font.weight, Some(700));
}

#[test]
fn font_runs_merge_adjacent_segments_that_share_a_font() {
    let rich = rich(
        "aaabbbccc",
        r##"[{"start":0,"end":3,"style":{"color":"#ff0000"}},{"start":3,"end":6,"style":{"fontWeight":700}},{"start":6,"end":9,"style":{"color":"#00ff00"}}]"##,
    );
    let runs: Vec<(Range<usize>, Option<u16>)> = rich
        .font_runs
        .iter()
        .map(|run| (run.range.clone(), run.font.weight))
        .collect();
    assert_eq!(runs, [(0..3, None), (3..6, Some(700)), (6..9, None)]);
    assert_eq!(rich.font_runs.len(), 3);
    // Colours alone do not change the font: one run, one shaped string.
    let colours = super::tests::rich(
        "abc",
        r##"[{"start":1,"end":2,"style":{"color":"#ff0000"}}]"##,
    );
    assert_eq!(colours.font_runs.len(), 1);
}

#[test]
fn offsets_are_utf16_units_on_the_wire_and_code_points_after() {
    // "a😀b": the emoji is two UTF-16 units and one code point; a span over "b" is 3..4 on the wire.
    let rich = rich(
        "a😀b",
        r##"[{"start":3,"end":4,"style":{"color":"#ff0000"}}]"##,
    );
    assert_eq!(
        pieces(&rich)[1],
        ("b".to_string(), false, Some("#ff0000".to_string()))
    );
    assert_eq!(rich.segments[1].range, 2..3);
    assert!(
        validate_spans(
            &spans(r##"[{"start":2,"end":3,"style":{"color":"#ff0000"}}]"##),
            "a😀b"
        )
        .is_err()
    );
    assert!(
        validate_spans(
            &spans(r##"[{"start":1,"end":3,"style":{"color":"#ff0000"}}]"##),
            "a😀b"
        )
        .is_ok()
    );
}

#[test]
fn spans_follow_the_text_through_white_space_collapsing() {
    // Source "a   b" is shown "a b"; a span over "b" (4..5) is shown 2..3.
    let positions = [0, 1, 2, 2, 2, 3];
    let rich = resolve(
        &base("{}"),
        "a   b",
        "a b",
        Some(&positions),
        &spans(r##"[{"start":4,"end":5,"style":{"color":"#ff0000"}}]"##),
    )
    .expect("resolves");
    assert_eq!(rich.display, "a b");
    assert_eq!(
        rich.segments.last().map(|segment| segment.range.clone()),
        Some(2..3)
    );
    // A span inside the collapsed run has nothing left to style.
    let gone = resolve(
        &base("{}"),
        "a   b",
        "a b",
        Some(&positions),
        &spans(r##"[{"start":2,"end":4,"style":{"color":"#ff0000"}}]"##),
    )
    .expect("resolves");
    assert_eq!(gone.segments.len(), 1);
}

#[test]
fn validation_names_the_span_and_what_is_wrong() {
    let error = |json: &str, text: &str| validate_spans(&spans(json), text).expect_err(json);
    assert!(
        error(
            r##"[{"start":3,"end":2,"style":{"color":"#ff0000"}}]"##,
            "abcd"
        )
        .contains("spans[0] starts at 3 after it ends at 2")
    );
    assert!(
        error(
            r##"[{"start":0,"end":9,"style":{"color":"#ff0000"}}]"##,
            "abcd"
        )
        .contains("past the end of its parent (4)")
    );
    assert!(error(r##"[{"start":0,"end":3,"style":{"color":"#ff0000"}},{"start":2,"end":4,"style":{"color":"#ff0000"}}]"##, "abcd").contains("spans[1] starts at 2"));
    assert!(error(r##"[{"start":0,"end":3,"style":{"color":"#ff0000"},"children":[{"start":1,"end":4,"style":{"color":"#ff0000"}}]}]"##, "abcd").contains("spans[0].children[0] ends at 4"));
    assert!(
        error(r##"[{"start":1,"end":2,"inlay":"x"}]"##, "abcd").contains("must sit at one offset")
    );
    assert!(error(r##"[{"start":1,"end":1,"inlay":""}]"##, "abcd").contains("no text"));
    assert!(
        error(
            r##"[{"start":1,"end":1,"inlay":"x","children":[{"start":1,"end":1,"inlay":"y"}]}]"##,
            "abcd"
        )
        .contains("cannot have children")
    );
    assert!(
        error(
            r##"[{"start":1,"end":1,"style":{"color":"#ff0000"}}]"##,
            "abcd"
        )
        .contains("is empty")
    );
    assert!(
        error(r##"[{"start":0,"end":1,"style":{"color":"red"}}]"##, "abcd")
            .contains("spans[0].style: color must be a hex color")
    );
    assert!(error(r##"[{"start":0,"end":5}]"##, "abcd").contains("past the end of its parent (4)"));
    let deep = (0..40).fold(
        r##"[{"start":0,"end":1,"inlay":"x"}]"##.to_string(),
        |inner, _| {
            format!(r##"[{{"start":0,"end":1,"style":{{"color":"#ff0000"}},"children":{inner}}}]"##)
        },
    );
    assert!(
        validate_spans(&spans(&deep), "a")
            .expect_err("too deep")
            .contains("nest deeper")
    );
}

#[test]
fn validation_accepts_what_js_sends() {
    let ok = |json: &str, text: &str| validate_spans(&spans(json), text).expect(json);
    ok("[]", "");
    // Inlays at the same offset, at the ends, around a span that starts there, and in a zero-width span.
    ok(
        r##"[{"start":0,"end":0,"inlay":"a"},{"start":0,"end":0,"inlay":"b"},{"start":0,"end":2,"style":{"color":"#ff0000"}},{"start":2,"end":2,"inlay":"c"}]"##,
        "xy",
    );
    ok(
        r##"[{"start":1,"end":1,"style":{"color":"#ff0000"},"children":[{"start":1,"end":1,"inlay":"hint"}]}]"##,
        "xy",
    );
    ok(r##"[{"start":0,"end":0,"inlay":"only an inlay"}]"##, "");
}

#[test]
fn a_style_the_span_may_not_have_is_refused_when_the_commit_is_parsed() {
    let refused = serde_json::from_str::<Vec<SpanSpec>>(
        r##"[{"start":0,"end":1,"style":{"paddingTop":4}}]"##,
    );
    assert!(
        refused
            .expect_err("padding")
            .to_string()
            .contains("unknown field `paddingTop`")
    );
    let refused = serde_json::from_str::<Vec<SpanSpec>>(r##"[{"start":0,"end":1,"colour":"x"}]"##);
    assert!(refused.is_err());
}

/// A fake shaped line: the glyph clusters of `text`, one per character, as `(start, end)` display offsets.
fn fake_glyphs(display: &str) -> Vec<(usize, usize)> {
    (0..display.chars().count())
        .map(|start| (start, start + 1))
        .collect()
}

#[test]
fn a_glyph_takes_the_colour_of_the_segment_its_cluster_starts_in() {
    let rich = rich(
        "const x = 1;",
        r##"[{"start":6,"end":7,"style":{"color":"#c678dd"}},{"start":10,"end":11,"style":{"color":"#ef4444"}}]"##,
    );
    let colors = plan::ColorRuns::of(&rich, str::to_owned);
    assert!(colors.any());
    let picked: Vec<Option<&str>> = fake_glyphs(&rich.display)
        .iter()
        .map(|(start, _)| colors.at(*start).map(String::as_str))
        .collect();
    let expected: Vec<Option<&str>> = "const x = 1;"
        .chars()
        .enumerate()
        .map(|(index, _)| match index {
            6 => Some("#c678dd"),
            10 => Some("#ef4444"),
            _ => None,
        })
        .collect();
    assert_eq!(picked, expected);
    assert!(!plan::ColorRuns::of(&super::tests::rich("abc", "[]"), str::to_owned).any());
}

#[test]
fn a_ligature_cluster_takes_the_colour_of_its_first_character() {
    // "=>" shaped as one glyph (start 6, end 8) over a colour change at 7 is drawn in the colour of its start.
    let rich = rich(
        "a => b",
        r##"[{"start":3,"end":4,"style":{"color":"#00ff00"}}]"##,
    );
    let colors = plan::ColorRuns::of(&rich, str::to_owned);
    assert_eq!(colors.at(2), None);
    assert_eq!(colors.at(3).map(String::as_str), Some("#00ff00"));
    assert_eq!(colors.at(4), None);
}

#[test]
fn decorations_are_cut_at_the_lines_and_at_the_span_boundaries() {
    // "ab cd ef" on two lines (0..6, 6..8); the underline span covers "b cd e" (1..7) and has a coloured child on "cd".
    let rich = rich(
        "ab cd ef",
        r##"[{"start":1,"end":7,"style":{"textDecorationLine":"underline"},"children":[{"start":3,"end":5,"style":{"color":"#ff0000"}}]}]"##,
    );
    let found = plan::fragments(&rich.segments, &[0..6, 6..8]);
    let summary: Vec<(usize, Range<usize>)> = found
        .iter()
        .map(|fragment| (fragment.line, fragment.range.clone()))
        .collect();
    // On line 0: "b " (1..3), "cd" (3..5), " " (5..6); on line 1: "e" (6..7). The undecorated "a" and "f" have none.
    assert_eq!(summary, [(0, 1..3), (0, 3..5), (0, 5..6), (1, 6..7)]);
    assert!(
        plan::fragments(&rich.segments, &[0..0]).is_empty(),
        "an empty line has no fragment"
    );
    let plain = super::tests::rich("ab", "[]");
    assert!(
        plan::fragments(&plain.segments, &[0..2]).is_empty(),
        "no decoration, no fragment"
    );
}
