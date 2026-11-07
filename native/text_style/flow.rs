//! The text an element shows, from the text its props hold: `text-transform`, then `white-space` (CSS Text 3, "Text Transformation"
//! and "White Space Processing"). The shown text is what is shaped, selected and copied: Chrome copies the transformed text, not
//! the source (`docs/tracks/utilities-text.md`, "Case"), and a collapsed run of spaces copies as one.

use std::borrow::Cow;

use super::spec::{TextTransformSpec, WhiteSpaceSpec};

/// The text shown for `source` under the transform and the white space of its element. Borrowed when nothing changes, which is
/// every unstyled text.
pub fn shown_text(
    source: &str,
    transform: TextTransformSpec,
    white_space: WhiteSpaceSpec,
) -> Cow<'_, str> {
    let transformed = transform_case(source, transform);
    match collapse_white_space(&transformed, white_space) {
        Some(collapsed) => Cow::Owned(collapsed),
        None => transformed,
    }
}

fn transform_case(source: &str, transform: TextTransformSpec) -> Cow<'_, str> {
    match transform {
        TextTransformSpec::None => Cow::Borrowed(source),
        TextTransformSpec::Uppercase => owned_if_changed(source, source.to_uppercase()),
        TextTransformSpec::Lowercase => owned_if_changed(source, source.to_lowercase()),
        TextTransformSpec::Capitalize => owned_if_changed(source, capitalize(source)),
    }
}

fn owned_if_changed(source: &str, transformed: String) -> Cow<'_, str> {
    if transformed == source {
        Cow::Borrowed(source)
    } else {
        Cow::Owned(transformed)
    }
}

/// Characters that continue a word when a letter follows them and precedes them: the apostrophes of "don't" and the dots of
/// "e.g." (Unicode word boundaries WB6 and WB7, MidLetter and MidNumLet).
const WORD_JOINERS: [char; 4] = ['\'', '\u{2019}', '.', ':'];

/// `text-transform: capitalize`: the first cased letter of each word is titlecased. A word is a run of letters and digits,
/// with a joiner between two letters inside it.
fn capitalize(source: &str) -> String {
    let characters: Vec<char> = source.chars().collect();
    let mut shown = String::with_capacity(source.len());
    let mut in_word = false;
    for (index, &character) in characters.iter().enumerate() {
        let continues = character.is_alphanumeric()
            || (in_word
                && WORD_JOINERS.contains(&character)
                && characters
                    .get(index + 1)
                    .is_some_and(|next| next.is_alphabetic()));
        if !continues {
            in_word = false;
            shown.push(character);
        } else if in_word {
            shown.push(character);
        } else {
            in_word = true;
            push_titlecase(&mut shown, character);
        }
    }
    shown
}

/// The titlecase of a letter: its uppercase, except where that is several letters (`ß` is `Ss`, not `SS`).
fn push_titlecase(into: &mut String, character: char) {
    let mut upper = character.to_uppercase();
    if let Some(first) = upper.next() {
        into.push(first);
        into.extend(upper.flat_map(char::to_lowercase));
    }
}

/// Whether CSS collapses this character: a space, a tab, or a segment break.
fn is_collapsible(character: char) -> bool {
    matches!(character, ' ' | '\t' | '\n' | '\r')
}

/// The collapsed text, or `None` when collapsing changes nothing.
fn collapse_white_space(text: &str, white_space: WhiteSpaceSpec) -> Option<String> {
    match white_space {
        WhiteSpaceSpec::Pre | WhiteSpaceSpec::PreWrap | WhiteSpaceSpec::BreakSpaces => None,
        WhiteSpaceSpec::Normal | WhiteSpaceSpec::Nowrap => collapse(text, false),
        WhiteSpaceSpec::PreLine => collapse(text, true),
    }
}

/// Collapse each run of collapsible characters to one space; with `keep_breaks` a run that holds a line feed becomes that line
/// feed alone (the spaces around a segment break are removed). A collapsed run at the start or the end of the text is removed.
fn collapse(text: &str, keep_breaks: bool) -> Option<String> {
    if !text.chars().any(is_collapsible) {
        return None;
    }
    let mut shown = String::with_capacity(text.len());
    let mut characters = text.chars().peekable();
    while let Some(character) = characters.next() {
        if !is_collapsible(character) {
            shown.push(character);
            continue;
        }
        let mut breaks = usize::from(character == '\n');
        while let Some(next) = characters.next_if(|next| is_collapsible(*next)) {
            breaks += usize::from(next == '\n');
        }
        let at_start = shown.is_empty();
        let at_end = characters.peek().is_none();
        if keep_breaks && breaks > 0 {
            // Every line feed of the run survives, with no space beside it; a run at either end keeps its breaks too.
            shown.extend(std::iter::repeat_n('\n', breaks));
        } else if !at_start && !at_end {
            shown.push(' ');
        }
    }
    (shown != text).then_some(shown)
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
        assert_eq!(capitalized("e.g. this"), "E.g. This");
        assert_eq!(capitalized("hello-world"), "Hello-World");
        assert_eq!(capitalized("3rd place"), "3rd Place");
        assert_eq!(capitalized("ÉCOLE élève"), "ÉCOLE Élève");
        assert_eq!(capitalized("ßa"), "Ssa");
        assert_eq!(capitalized("x:"), "X:");
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

    #[test]
    fn case_and_white_space_compose() {
        assert_eq!(
            shown("  hello   world ", Case::Capitalize, Space::Normal),
            "Hello World"
        );
    }
}
