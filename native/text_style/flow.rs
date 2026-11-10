//! The text an element shows, from the text its props hold: `text-transform`, then `white-space` (CSS Text 3, "Text Transformation"
//! and "White Space Processing"). The shown text is what is shaped, selected and copied: Chrome copies the transformed text, not
//! the source, and a collapsed run of spaces copies as one.

use std::borrow::Cow;

use super::spec::{TextTransformSpec, WhiteSpaceSpec};

/// The text shown for `source` under the transform and the white space of its element. Borrowed when nothing changes, which is
/// every unstyled text.
#[cfg(test)]
pub fn shown_text(
    source: &str,
    transform: TextTransformSpec,
    white_space: WhiteSpaceSpec,
) -> Cow<'_, str> {
    shown_text_mapped(source, transform, white_space).text
}

/// The shown text, and where the characters of the source went: what a range of the source (the spans of a `Text`) is in the
/// text shown.
pub struct Shown<'a> {
    pub text: Cow<'a, str>,
    /// For each character index `i` of the source, and for its end (so one more than the source has characters): how many
    /// characters of the shown text the source characters before `i` made. A character that makes none (a collapsed space)
    /// leaves the next position where it was; one that makes several (`ß` in capitals) moves it on by that many. `None` when
    /// every character stays at its index.
    pub positions: Option<Vec<usize>>,
}

/// [`shown_text`], with where the source's characters went.
pub fn shown_text_mapped(
    source: &str,
    transform: TextTransformSpec,
    white_space: WhiteSpaceSpec,
) -> Shown<'_> {
    let (transformed, transform_positions) = transform_case(source, transform);
    let (collapsed, collapse_positions) = collapse_white_space(&transformed, white_space);
    let positions = match (transform_positions, collapse_positions) {
        (None, None) => None,
        (Some(only), None) | (None, Some(only)) => Some(only),
        (Some(first), Some(second)) => {
            Some(first.iter().map(|position| second[*position]).collect())
        }
    };
    Shown {
        text: match collapsed {
            Some(collapsed) => Cow::Owned(collapsed),
            None => transformed,
        },
        positions,
    }
}

/// Positions from the number of characters each source character made; `None` when each made one.
fn positions_of(counts: impl Iterator<Item = usize>) -> Option<Vec<usize>> {
    let mut total = 0;
    let mut positions = vec![0];
    let mut identity = true;
    for count in counts {
        identity &= count == 1;
        total += count;
        positions.push(total);
    }
    (!identity).then_some(positions)
}

fn transform_case(
    source: &str,
    transform: TextTransformSpec,
) -> (Cow<'_, str>, Option<Vec<usize>>) {
    let (transformed, positions) = match transform {
        TextTransformSpec::None => return (Cow::Borrowed(source), None),
        TextTransformSpec::Uppercase => {
            let upper = source.to_uppercase();
            let positions = positions_of(source.chars().map(|c| c.to_uppercase().count()));
            (upper, positions)
        }
        TextTransformSpec::Lowercase => {
            let lower = source.to_lowercase();
            let positions = positions_of(source.chars().map(|c| c.to_lowercase().count()));
            (lower, positions)
        }
        TextTransformSpec::Capitalize => {
            let (capitalized, counts) = capitalize_counted(source);
            (capitalized, positions_of(counts.into_iter()))
        }
    };
    (owned_if_changed(source, transformed), positions)
}

fn owned_if_changed(source: &str, transformed: String) -> Cow<'_, str> {
    if transformed == source {
        Cow::Borrowed(source)
    } else {
        Cow::Owned(transformed)
    }
}

/// Characters that continue a word when a letter follows them and one precedes them: the apostrophes of "don't" and the middle
/// dot of "l·l". Chrome's `capitalize` (read off its output) goes no further than those: a
/// full stop, a hyphen or a colon starts a new word ("e.g." is "E.G."), though Unicode's word boundaries would keep "e.g" whole.
const WORD_JOINERS: [char; 3] = ['\'', '\u{2019}', '\u{b7}'];

/// `text-transform: capitalize`: the first cased letter of each word is titlecased. A word is a run of letters, digits and
/// underscores, with a joiner between two letters inside it. Also how many characters each source character made.
fn capitalize_counted(source: &str) -> (String, Vec<usize>) {
    let characters: Vec<char> = source.chars().collect();
    let mut shown = String::with_capacity(source.len());
    let mut counts = Vec::with_capacity(characters.len());
    let mut in_word = false;
    for (index, &character) in characters.iter().enumerate() {
        let continues = character.is_alphanumeric()
            || character == '_'
            || (in_word
                && WORD_JOINERS.contains(&character)
                && characters
                    .get(index + 1)
                    .is_some_and(|next| next.is_alphabetic()));
        if !continues {
            in_word = false;
            shown.push(character);
            counts.push(1);
        } else if in_word {
            shown.push(character);
            counts.push(1);
        } else {
            in_word = true;
            counts.push(push_titlecase(&mut shown, character));
        }
    }
    (shown, counts)
}

/// The titlecase of a letter: its uppercase, except where that is several letters (`ß` is `Ss`, not `SS`). Returns how many
/// characters it pushed.
fn push_titlecase(into: &mut String, character: char) -> usize {
    let mut upper = character.to_uppercase();
    let mut pushed = 0;
    if let Some(first) = upper.next() {
        into.push(first);
        pushed += 1;
        for lower in upper.flat_map(char::to_lowercase) {
            into.push(lower);
            pushed += 1;
        }
    }
    pushed
}

/// Whether CSS collapses this character: a space, a tab, or a segment break.
fn is_collapsible(character: char) -> bool {
    matches!(character, ' ' | '\t' | '\n' | '\r')
}

/// The collapsed text, or `None` when collapsing changes nothing, and where the characters went (as [`Shown::positions`]).
fn collapse_white_space(
    text: &str,
    white_space: WhiteSpaceSpec,
) -> (Option<String>, Option<Vec<usize>>) {
    match white_space {
        WhiteSpaceSpec::Pre | WhiteSpaceSpec::PreWrap | WhiteSpaceSpec::BreakSpaces => (None, None),
        WhiteSpaceSpec::Normal | WhiteSpaceSpec::Nowrap => collapse(text, false),
        WhiteSpaceSpec::PreLine => collapse(text, true),
    }
}

/// Collapse each run of collapsible characters to one space; with `keep_breaks` a run that holds a line feed becomes that line
/// feed alone (the spaces around a segment break are removed). A collapsed run at the start or the end of the text is removed.
/// The first character of a run makes what the run becomes; the others make nothing.
fn collapse(text: &str, keep_breaks: bool) -> (Option<String>, Option<Vec<usize>>) {
    if !text.chars().any(is_collapsible) {
        return (None, None);
    }
    let mut shown = String::with_capacity(text.len());
    let mut counts: Vec<usize> = Vec::with_capacity(text.len());
    let mut characters = text.chars().peekable();
    while let Some(character) = characters.next() {
        if !is_collapsible(character) {
            shown.push(character);
            counts.push(1);
            continue;
        }
        let mut breaks = usize::from(character == '\n');
        let mut run = 1;
        while let Some(next) = characters.next_if(|next| is_collapsible(*next)) {
            breaks += usize::from(next == '\n');
            run += 1;
        }
        let at_start = shown.is_empty();
        let at_end = characters.peek().is_none();
        let made = if keep_breaks && breaks > 0 {
            // Every line feed of the run survives, with no space beside it; a run at either end keeps its breaks too.
            shown.extend(std::iter::repeat_n('\n', breaks));
            breaks
        } else if !at_start && !at_end {
            shown.push(' ');
            1
        } else {
            0
        };
        counts.push(made);
        counts.extend(std::iter::repeat_n(0, run - 1));
    }
    if shown == text {
        return (None, None);
    }
    (Some(shown), positions_of(counts.into_iter()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use TextTransformSpec as Case;
    use WhiteSpaceSpec as Space;

    fn shown(source: &str, transform: Case, white_space: Space) -> String {
        shown_text(source, transform, white_space).into_owned()
    }

    #[test]
    fn untouched_text_is_borrowed() {
        assert!(matches!(
            shown_text("Hello", Case::None, Space::PreWrap),
            Cow::Borrowed(_)
        ));
        assert!(matches!(
            shown_text("hello", Case::Lowercase, Space::PreWrap),
            Cow::Borrowed(_)
        ));
        assert!(matches!(
            shown_text("a b", Case::None, Space::Normal),
            Cow::Borrowed(_)
        ));
        assert!(matches!(
            shown_text("a  b", Case::None, Space::Normal),
            Cow::Owned(_)
        ));
    }

    #[test]
    fn upper_and_lower_case_use_the_full_unicode_mappings() {
        assert_eq!(shown("Straße", Case::Uppercase, Space::Pre), "STRASSE");
        assert_eq!(shown("ΑΣ ΣΑΣ", Case::Lowercase, Space::Pre), "ας σας");
        assert_eq!(
            shown("İstanbul", Case::Lowercase, Space::Pre),
            "i\u{307}stanbul"
        );
    }

    #[test]
    fn capitalize_titlecases_the_first_letter_of_each_word() {
        let capitalized = |text: &str| shown(text, Case::Capitalize, Space::Pre);
        assert_eq!(capitalized("the quick brown fox"), "The Quick Brown Fox");
        assert_eq!(capitalized("don't stop"), "Don't Stop");
        assert_eq!(
            capitalized("e.g. this"),
            "E.G. This",
            "a full stop starts a word in Chrome"
        );
        assert_eq!(
            capitalized("a'b 'c d_1x a_b _c"),
            "A'b 'C D_1x A_b _c",
            "Chrome's output for apostrophes, underscores and digits"
        );
        assert_eq!(capitalized("a\u{b7}b \u{b7}c a:b"), "A\u{b7}b \u{b7}C A:B");
        assert_eq!(capitalized("hello-world"), "Hello-World");
        assert_eq!(capitalized("3rd place"), "3rd Place");
        assert_eq!(capitalized("ÉCOLE élève"), "ÉCOLE Élève");
        assert_eq!(capitalized("ßa"), "Ssa");
        assert_eq!(capitalized("x:"), "X:");
        assert_eq!(capitalized("a1b 1c"), "A1b 1c", "a digit is part of a word");
        assert_eq!(capitalized("  spaced  out "), "  Spaced  Out ");
    }

    #[test]
    fn normal_white_space_collapses_runs_and_trims_the_ends() {
        assert_eq!(
            shown("  a   b\t\tc\n\nd  ", Case::None, Space::Normal),
            "a b c d"
        );
        assert_eq!(shown("a\r\nb", Case::None, Space::Nowrap), "a b");
        assert_eq!(shown("   ", Case::None, Space::Normal), "");
        assert_eq!(
            shown("a\u{a0}\u{a0}b", Case::None, Space::Normal),
            "a\u{a0}\u{a0}b",
            "no-break spaces are not collapsible"
        );
    }

    #[test]
    fn pre_line_keeps_line_feeds_and_collapses_the_rest() {
        assert_eq!(shown("a   b \n  c", Case::None, Space::PreLine), "a b\nc");
        assert_eq!(shown("a \n\n b", Case::None, Space::PreLine), "a\n\nb");
        assert_eq!(shown("a\r\nb", Case::None, Space::PreLine), "a\nb");
        assert_eq!(shown("\n a", Case::None, Space::PreLine), "\na");
    }

    #[test]
    fn preserving_modes_leave_the_text_alone() {
        for space in [Space::Pre, Space::PreWrap, Space::BreakSpaces] {
            assert_eq!(
                shown("  a  b\n c ", Case::None, space),
                "  a  b\n c ",
                "{space:?}"
            );
        }
    }

    fn positions(source: &str, transform: Case, white_space: Space) -> Option<Vec<usize>> {
        shown_text_mapped(source, transform, white_space).positions
    }

    #[test]
    fn text_that_keeps_its_length_has_no_map() {
        assert_eq!(positions("Hello", Case::Uppercase, Space::Pre), None);
        assert_eq!(positions("a b", Case::None, Space::Normal), None);
        assert_eq!(positions("a  b", Case::Lowercase, Space::Pre), None);
    }

    #[test]
    fn a_collapsed_run_makes_what_it_becomes_at_its_first_character() {
        // "a   b": the three spaces make one, at the first of them.
        assert_eq!(
            positions("a   b", Case::None, Space::Normal),
            Some(vec![0, 1, 2, 2, 2, 3])
        );
        // A run at the start or the end makes nothing.
        assert_eq!(
            positions("  a ", Case::None, Space::Normal),
            Some(vec![0, 0, 0, 1, 1])
        );
        // pre-line keeps the line feed of a run and the spaces around it go.
        assert_eq!(
            positions("a \n b", Case::None, Space::PreLine),
            Some(vec![0, 1, 2, 2, 2, 3])
        );
    }

    #[test]
    fn a_letter_that_becomes_several_moves_what_follows_it() {
        assert_eq!(
            positions("aßb", Case::Uppercase, Space::Pre),
            Some(vec![0, 1, 3, 4])
        );
        assert_eq!(
            positions("ßa", Case::Capitalize, Space::Pre),
            Some(vec![0, 2, 3])
        );
        assert_eq!(
            positions("İ", Case::Lowercase, Space::Pre),
            Some(vec![0, 2])
        );
    }

    #[test]
    fn transform_and_collapse_maps_compose() {
        // "ß  b" in capitals and collapsed: "SS B" is made from ß (2), the first space (1), the second (0) and b (1).
        let shown = shown_text_mapped("ß  b", Case::Uppercase, Space::Normal);
        assert_eq!(shown.text, "SS B");
        assert_eq!(shown.positions, Some(vec![0, 2, 3, 3, 4]));
    }

    #[test]
    fn case_and_white_space_compose() {
        assert_eq!(
            shown("  hello   world ", Case::Capitalize, Space::Normal),
            "Hello World"
        );
    }
}
