//! UTF-16 code unit offsets (what JS sees) against code point indices (what Godot `String`,
//! `TextServer` and the edit buffer use), plan section 3.17. This is the only module that converts
//! between the two: every offset that crosses to or from JS goes through it.
//!
//! A JS string is a sequence of UTF-16 code units, so a character above U+FFFF (an emoji, say) is two
//! units, a surrogate pair. A code point index counts it once. The two agree for every string whose
//! characters are all in the Basic Multilingual Plane. Neither counts grapheme clusters: a ZWJ emoji
//! sequence or a letter with a combining mark is several code points and several units.
//!
//! Public API (all `pub(crate)`; the text is any `IntoIterator<Item = char>`, so a `&str` is passed as
//! `text.chars()` and a `&[char]` as `text.iter().copied()`):
//!
//! - [`utf16_length`]: the length JS reports (`string.length`).
//! - [`utf16_to_code_point`]: a JS offset to a code point index.
//! - [`code_point_to_utf16`]: a code point index to a JS offset.
//! - [`utf16_range_to_code_points`] and [`code_point_range_to_utf16`]: the same for a
//!   `(start, end)` pair, with the order preserved (a backward selection stays backward).
//!
//! Offsets are validated, never clamped: an offset past the end of the text, and a JS offset that falls
//! between the two halves of a surrogate pair, are [`OffsetError`]s. The offset equal to the length is
//! the end of the text and is valid. (A lone surrogate cannot be represented in a Rust `char`, so a JS
//! string that holds one reaches native text already replaced; this module never sees it.)

/// An offset that does not name a position in the text.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum OffsetError {
    /// A UTF-16 offset past the end of the text.
    Utf16OutOfRange { offset: usize, length: usize },
    /// A UTF-16 offset between the high and low halves of a surrogate pair.
    SplitsSurrogatePair { offset: usize },
    /// A code point index past the end of the text.
    CodePointOutOfRange { index: usize, length: usize },
}

impl std::fmt::Display for OffsetError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OffsetError::Utf16OutOfRange { offset, length } => write!(
                formatter,
                "UTF-16 offset {offset} is past the end of a text of {length} code units"
            ),
            OffsetError::SplitsSurrogatePair { offset } => write!(
                formatter,
                "UTF-16 offset {offset} is between the two halves of a surrogate pair"
            ),
            OffsetError::CodePointOutOfRange { index, length } => write!(
                formatter,
                "code point index {index} is past the end of a text of {length} code points"
            ),
        }
    }
}

/// The text's length in UTF-16 code units, which is `string.length` in JS.
pub(crate) fn utf16_length(text: impl IntoIterator<Item = char>) -> usize {
    text.into_iter().map(char::len_utf16).sum()
}

/// The code point index that the UTF-16 `offset` names.
///
/// Errors if `offset` is past the end of the text or inside a surrogate pair.
pub(crate) fn utf16_to_code_point(
    text: impl IntoIterator<Item = char>,
    offset: usize,
) -> Result<usize, OffsetError> {
    let mut units = 0;
    let mut code_points = 0;
    for character in text {
        if units == offset {
            return Ok(code_points);
        }
        let next_units = units + character.len_utf16();
        if offset < next_units {
            // `units < offset < next_units` can only happen inside a two-unit character.
            return Err(OffsetError::SplitsSurrogatePair { offset });
        }
        units = next_units;
        code_points += 1;
    }
    if units == offset {
        Ok(code_points)
    } else {
        Err(OffsetError::Utf16OutOfRange {
            offset,
            length: units,
        })
    }
}

/// The UTF-16 offset of the code point `index`. Errors if `index` is past the end of the text.
pub(crate) fn code_point_to_utf16(
    text: impl IntoIterator<Item = char>,
    index: usize,
) -> Result<usize, OffsetError> {
    let mut units = 0;
    let mut code_points = 0;
    for character in text {
        if code_points == index {
            return Ok(units);
        }
        units += character.len_utf16();
        code_points += 1;
    }
    if code_points == index {
        Ok(units)
    } else {
        Err(OffsetError::CodePointOutOfRange {
            index,
            length: code_points,
        })
    }
}

/// Convert a `(start, end)` pair of UTF-16 offsets to code point indices. The order of the pair is
/// kept; neither end is checked against the other.
pub(crate) fn utf16_range_to_code_points<T>(
    text: T,
    start: usize,
    end: usize,
) -> Result<(usize, usize), OffsetError>
where
    T: IntoIterator<Item = char> + Clone,
{
    Ok((
        utf16_to_code_point(text.clone(), start)?,
        utf16_to_code_point(text, end)?,
    ))
}

/// Convert a `(start, end)` pair of code point indices to UTF-16 offsets. The order of the pair is
/// kept; neither end is checked against the other.
pub(crate) fn code_point_range_to_utf16<T>(
    text: T,
    start: usize,
    end: usize,
) -> Result<(usize, usize), OffsetError>
where
    T: IntoIterator<Item = char> + Clone,
{
    Ok((
        code_point_to_utf16(text.clone(), start)?,
        code_point_to_utf16(text, end)?,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// "a", a grinning face (U+1F600, two units), "b": 3 code points, 4 units.
    const ASTRAL: &str = "a\u{1F600}b";
    /// A family emoji: man, ZWJ, woman, ZWJ, girl. Five code points, eight units, one grapheme.
    const FAMILY: &str = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}";
    /// "e" followed by a combining acute accent: two code points, two units, one grapheme.
    const COMBINING: &str = "e\u{0301}";

    fn to_code_point(text: &str, offset: usize) -> Result<usize, OffsetError> {
        utf16_to_code_point(text.chars(), offset)
    }

    fn to_utf16(text: &str, index: usize) -> Result<usize, OffsetError> {
        code_point_to_utf16(text.chars(), index)
    }

    #[test]
    fn ascii_offsets_are_identical() {
        let text = "hello";
        assert_eq!(utf16_length(text.chars()), 5);
        for index in 0..=5 {
            assert_eq!(to_utf16(text, index), Ok(index));
            assert_eq!(to_code_point(text, index), Ok(index));
        }
    }

    #[test]
    fn bmp_accents_are_one_unit_each() {
        let text = "caf\u{00E9} \u{00FC}ber \u{4E2D}\u{6587}";
        assert_eq!(utf16_length(text.chars()), text.chars().count());
        for index in 0..=text.chars().count() {
            assert_eq!(to_utf16(text, index), Ok(index));
            assert_eq!(to_code_point(text, index), Ok(index));
        }
    }

    #[test]
    fn an_astral_character_is_two_units() {
        assert_eq!(utf16_length(ASTRAL.chars()), 4);
        assert_eq!(ASTRAL.chars().count(), 3);

        // Code point index -> UTF-16 offset.
        assert_eq!(to_utf16(ASTRAL, 0), Ok(0));
        assert_eq!(to_utf16(ASTRAL, 1), Ok(1));
        assert_eq!(to_utf16(ASTRAL, 2), Ok(3));
        assert_eq!(to_utf16(ASTRAL, 3), Ok(4));

        // UTF-16 offset -> code point index.
        assert_eq!(to_code_point(ASTRAL, 0), Ok(0));
        assert_eq!(to_code_point(ASTRAL, 1), Ok(1));
        assert_eq!(to_code_point(ASTRAL, 3), Ok(2));
        assert_eq!(to_code_point(ASTRAL, 4), Ok(3));
    }

    #[test]
    fn an_offset_inside_a_surrogate_pair_is_an_error_not_a_clamp() {
        assert_eq!(
            to_code_point(ASTRAL, 2),
            Err(OffsetError::SplitsSurrogatePair { offset: 2 })
        );
    }

    #[test]
    fn every_inside_offset_of_consecutive_pairs_is_rejected() {
        let text = "\u{1F600}\u{1F601}";
        assert_eq!(to_code_point(text, 0), Ok(0));
        assert_eq!(
            to_code_point(text, 1),
            Err(OffsetError::SplitsSurrogatePair { offset: 1 })
        );
        assert_eq!(to_code_point(text, 2), Ok(1));
        assert_eq!(
            to_code_point(text, 3),
            Err(OffsetError::SplitsSurrogatePair { offset: 3 })
        );
        assert_eq!(to_code_point(text, 4), Ok(2));
    }

    #[test]
    fn a_zwj_sequence_is_five_code_points_and_eight_units() {
        assert_eq!(FAMILY.chars().count(), 5);
        assert_eq!(utf16_length(FAMILY.chars()), 8);

        // man (2 units), ZWJ (1), woman (2), ZWJ (1), girl (2): boundaries at 0 2 3 5 6 8.
        let expected_units = [0, 2, 3, 5, 6, 8];
        for (index, units) in expected_units.into_iter().enumerate() {
            assert_eq!(to_utf16(FAMILY, index), Ok(units));
            assert_eq!(to_code_point(FAMILY, units), Ok(index));
        }
        // 1, 4 and 7 are the middles of the three surrogate pairs.
        for inside in [1, 4, 7] {
            assert_eq!(
                to_code_point(FAMILY, inside),
                Err(OffsetError::SplitsSurrogatePair { offset: inside })
            );
        }
    }

    #[test]
    fn a_combining_mark_counts_as_its_own_code_point() {
        assert_eq!(COMBINING.chars().count(), 2);
        assert_eq!(utf16_length(COMBINING.chars()), 2);
        // Offsets between the base and the mark are valid: grapheme boundaries are not this
        // module's business.
        assert_eq!(to_code_point(COMBINING, 1), Ok(1));
        assert_eq!(to_utf16(COMBINING, 1), Ok(1));
    }

    #[test]
    fn the_empty_string_has_one_valid_offset() {
        assert_eq!(utf16_length("".chars()), 0);
        assert_eq!(to_code_point("", 0), Ok(0));
        assert_eq!(to_utf16("", 0), Ok(0));
        assert_eq!(
            to_code_point("", 1),
            Err(OffsetError::Utf16OutOfRange {
                offset: 1,
                length: 0
            })
        );
        assert_eq!(
            to_utf16("", 1),
            Err(OffsetError::CodePointOutOfRange {
                index: 1,
                length: 0
            })
        );
    }

    #[test]
    fn the_end_of_the_text_is_valid_and_one_past_it_is_not() {
        assert_eq!(to_code_point(ASTRAL, 4), Ok(3));
        assert_eq!(
            to_code_point(ASTRAL, 5),
            Err(OffsetError::Utf16OutOfRange {
                offset: 5,
                length: 4
            })
        );
        assert_eq!(to_utf16(ASTRAL, 3), Ok(4));
        assert_eq!(
            to_utf16(ASTRAL, 4),
            Err(OffsetError::CodePointOutOfRange {
                index: 4,
                length: 3
            })
        );
    }

    #[test]
    fn a_huge_offset_is_out_of_range_without_overflow() {
        assert_eq!(
            to_code_point("ab", usize::MAX),
            Err(OffsetError::Utf16OutOfRange {
                offset: usize::MAX,
                length: 2
            })
        );
        assert_eq!(
            to_utf16("ab", usize::MAX),
            Err(OffsetError::CodePointOutOfRange {
                index: usize::MAX,
                length: 2
            })
        );
    }

    #[test]
    fn round_trips_hold_at_every_code_point_boundary() {
        let text = "a\u{1F600}e\u{0301}\u{1F468}\u{200D}\u{1F469}b \u{4E2D}";
        let count = text.chars().count();
        for index in 0..=count {
            let units = to_utf16(text, index).expect("every index up to the length is valid");
            assert_eq!(to_code_point(text, units), Ok(index));
        }
    }

    #[test]
    fn a_char_slice_converts_like_a_str() {
        let characters: Vec<char> = ASTRAL.chars().collect();
        assert_eq!(utf16_length(characters.iter().copied()), 4);
        assert_eq!(code_point_to_utf16(characters.iter().copied(), 2), Ok(3));
        assert_eq!(utf16_to_code_point(characters.iter().copied(), 3), Ok(2));
    }

    #[test]
    fn ranges_convert_both_ends_and_keep_their_order() {
        assert_eq!(utf16_range_to_code_points(ASTRAL.chars(), 1, 4), Ok((1, 3)));
        // A backward range (focus before anchor) stays backward.
        assert_eq!(utf16_range_to_code_points(ASTRAL.chars(), 4, 1), Ok((3, 1)));
        assert_eq!(code_point_range_to_utf16(ASTRAL.chars(), 3, 1), Ok((4, 1)));
    }

    #[test]
    fn a_range_fails_if_either_end_is_invalid() {
        assert_eq!(
            utf16_range_to_code_points(ASTRAL.chars(), 0, 2),
            Err(OffsetError::SplitsSurrogatePair { offset: 2 })
        );
        assert_eq!(
            utf16_range_to_code_points(ASTRAL.chars(), 9, 1),
            Err(OffsetError::Utf16OutOfRange {
                offset: 9,
                length: 4
            })
        );
        assert_eq!(
            code_point_range_to_utf16(ASTRAL.chars(), 0, 4),
            Err(OffsetError::CodePointOutOfRange {
                index: 4,
                length: 3
            })
        );
    }

    #[test]
    fn errors_display_their_numbers() {
        let message = OffsetError::SplitsSurrogatePair { offset: 2 }.to_string();
        assert!(message.contains('2') && message.contains("surrogate"));
        let message = OffsetError::Utf16OutOfRange {
            offset: 9,
            length: 4,
        }
        .to_string();
        assert!(message.contains('9') && message.contains('4'));
        let message = OffsetError::CodePointOutOfRange {
            index: 7,
            length: 3,
        }
        .to_string();
        assert!(message.contains('7') && message.contains('3'));
    }
}
