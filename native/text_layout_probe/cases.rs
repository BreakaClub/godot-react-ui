//! The paragraphs the probe verifies, and what is known about them without asking Godot: where their
//! grapheme boundaries are (each case is written as the graphemes it is made of) and where their
//! words are (white space and ASCII punctuation separate them).

/// Man, ZWJ, woman, ZWJ, girl: five code points, one grapheme.
const FAMILY: &str = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}";
/// Regional indicators A and U (the Australian flag): two code points, one grapheme.
const FLAG: &str = "\u{1F1E6}\u{1F1FA}";
/// A waving hand and a skin tone modifier: two code points, one grapheme.
const WAVE: &str = "\u{1F44B}\u{1F3FD}";
/// A keycap: digit one, variation selector 16, combining enclosing keycap.
const KEYCAP: &str = "1\u{FE0F}\u{20E3}";
const HEBREW_WORDS: &str = "\u{05E9}\u{05DC}\u{05D5}\u{05DD} \u{05E2}\u{05D5}\u{05DC}\u{05DD}";
const HEBREW_ALEF_BET_GIMEL: &str = "\u{05D0}\u{05D1}\u{05D2}";
const HEBREW_DALET_HE: &str = "\u{05D3}\u{05D4}";

/// Part of a case's text.
#[derive(Clone, Copy)]
pub(super) enum Part {
    /// Every code point of the text is a grapheme of its own.
    Each(&'static str),
    /// The text is exactly one grapheme, however many code points.
    Single(&'static str),
}

/// The direction the text reads in, which decides what the geometry checks may demand: where one
/// direction meets the other a visual position can belong to two offsets.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Flow {
    Ltr,
    Rtl,
    Mixed,
}

/// The width of the box a paragraph that does not wrap is shown in.
const UNWRAPPED_BOX_WIDTH: f32 = 520.0;

pub(super) struct CaseSpec {
    pub(super) name: &'static str,
    pub(super) parts: &'static [Part],
    /// The width the paragraph wraps to (and aligns within); not positive for a paragraph that does not
    /// wrap, which aligns within its widest line.
    pub(super) width: f32,
    pub(super) flow: Flow,
    /// The selection the capture shows, as grapheme indices.
    pub(super) selected: (usize, usize),
    /// The grapheme the capture's caret is before.
    pub(super) caret: usize,
}

impl CaseSpec {
    /// The width of the box the paragraph is shown in.
    pub(super) fn box_width(&self) -> f32 {
        if self.width > 0.0 {
            self.width
        } else {
            UNWRAPPED_BOX_WIDTH
        }
    }

    /// The graphemes, in order.
    pub(super) fn graphemes(&self) -> Vec<String> {
        let mut graphemes = Vec::new();
        for part in self.parts {
            match part {
                Part::Each(text) => graphemes.extend(text.chars().map(String::from)),
                Part::Single(text) => graphemes.push((*text).to_owned()),
            }
        }
        graphemes
    }

    pub(super) fn text(&self) -> String {
        self.graphemes().concat()
    }

    /// Every grapheme boundary in code points: 0 first and the length last.
    pub(super) fn boundaries(&self) -> Vec<usize> {
        let mut boundaries = vec![0];
        let mut offset = 0;
        for grapheme in self.graphemes() {
            offset += grapheme.chars().count();
            boundaries.push(offset);
        }
        boundaries
    }
}

pub(super) const CASES: &[CaseSpec] = &[
    CaseSpec {
        name: "latin-wrapped",
        parts: &[Part::Each(
            "The quick brown fox jumps over the lazy dog, then naps in the warm sun by the river bank.",
        )],
        width: 300.0,
        flow: Flow::Ltr,
        selected: (14, 52),
        caret: 33,
    },
    CaseSpec {
        name: "unwrapped-lines",
        parts: &[Part::Each("short\na much longer second line\nmid")],
        width: -1.0,
        flow: Flow::Ltr,
        selected: (3, 20),
        caret: 8,
    },
    CaseSpec {
        name: "latin-short",
        parts: &[Part::Each("Hello, world: caret geometry")],
        width: 520.0,
        flow: Flow::Ltr,
        selected: (3, 17),
        caret: 12,
    },
    CaseSpec {
        name: "combining",
        parts: &[
            Part::Each("Caf"),
            Part::Single("e\u{301}"),
            Part::Each(" na"),
            Part::Single("i\u{308}"),
            Part::Each("ve r"),
            Part::Single("e\u{301}"),
            Part::Each("sum"),
            Part::Single("e\u{301}"),
            Part::Each(" Zo"),
            Part::Single("e\u{308}"),
            Part::Each(" a"),
            Part::Single("a\u{316}\u{301}\u{323}"),
            Part::Each(" ok"),
        ],
        width: 300.0,
        flow: Flow::Ltr,
        selected: (2, 12),
        caret: 4,
    },
    CaseSpec {
        name: "emoji",
        parts: &[
            Part::Each("Hi "),
            Part::Single(FAMILY),
            Part::Each(" ok "),
            Part::Single(FLAG),
            Part::Each(" "),
            Part::Single(WAVE),
            Part::Each(" "),
            Part::Single(KEYCAP),
            Part::Each(" end of line"),
        ],
        width: 300.0,
        flow: Flow::Ltr,
        selected: (2, 12),
        caret: 4,
    },
    CaseSpec {
        name: "hebrew",
        parts: &[
            Part::Each(HEBREW_WORDS),
            Part::Each(" "),
            Part::Each(HEBREW_WORDS),
            Part::Each(" "),
            Part::Each(HEBREW_WORDS),
        ],
        width: 220.0,
        flow: Flow::Rtl,
        selected: (3, 15),
        caret: 8,
    },
    CaseSpec {
        name: "bidi-mixed",
        parts: &[
            Part::Each("abc "),
            Part::Each(HEBREW_ALEF_BET_GIMEL),
            Part::Each(" def 123 "),
            Part::Each(HEBREW_DALET_HE),
            Part::Each(" end"),
        ],
        width: 520.0,
        flow: Flow::Mixed,
        selected: (2, 12),
        caret: 5,
    },
    CaseSpec {
        name: "bidi-wrapped",
        parts: &[
            Part::Each("abc "),
            Part::Each(HEBREW_ALEF_BET_GIMEL),
            Part::Each(" def 123 "),
            Part::Each(HEBREW_DALET_HE),
            Part::Each(" end abc "),
            Part::Each(HEBREW_ALEF_BET_GIMEL),
            Part::Each(" def 123 "),
            Part::Each(HEBREW_DALET_HE),
            Part::Each(" end"),
        ],
        width: 200.0,
        flow: Flow::Mixed,
        selected: (6, 26),
        caret: 12,
    },
    CaseSpec {
        name: "hard-breaks",
        parts: &[Part::Each(
            "First line\nsecond\n\nfourth after a blank line\n",
        )],
        width: 520.0,
        flow: Flow::Ltr,
        selected: (6, 24),
        caret: 41,
    },
    CaseSpec {
        name: "crlf",
        parts: &[
            Part::Each("one"),
            Part::Single("\r\n"),
            Part::Each("two"),
            Part::Single("\r\n"),
        ],
        width: 520.0,
        flow: Flow::Ltr,
        selected: (1, 6),
        caret: 3,
    },
    CaseSpec {
        name: "empty",
        parts: &[],
        width: 520.0,
        flow: Flow::Ltr,
        selected: (0, 0),
        caret: 0,
    },
];

/// The words of `text` the way `shaped_text_get_word_breaks` splits them (its default flags): runs of
/// characters that are neither white space nor ASCII punctuation (an underscore is not punctuation
/// there, `text_server_adv.cpp` skips `0x005f`).
pub(super) fn expected_words(text: &[char]) -> Vec<(usize, usize)> {
    let separates = |character: char| {
        character.is_whitespace() || (character.is_ascii_punctuation() && character != '_')
    };
    let mut words = Vec::new();
    let mut start = None;
    for (index, character) in text.iter().enumerate() {
        match (separates(*character), start) {
            (false, None) => start = Some(index),
            (true, Some(word_start)) => {
                words.push((word_start, index));
                start = None;
            }
            (false, Some(_)) | (true, None) => {}
        }
    }
    if let Some(word_start) = start {
        words.push((word_start, text.len()));
    }
    words
}

/// The `TextBoundaries::word_range` contract, independently of `BoundaryLists`: the word with
/// `start <= offset < end`, else the one with `end == offset`, else the gap around the offset.
pub(super) fn expected_word_range(
    words: &[(usize, usize)],
    text_len: usize,
    offset: usize,
) -> (usize, usize) {
    if let Some(word) = words
        .iter()
        .find(|(start, end)| *start <= offset && offset < *end)
        .or_else(|| words.iter().find(|(_, end)| *end == offset))
    {
        return *word;
    }
    let before = words
        .iter()
        .filter(|(_, end)| *end <= offset)
        .map(|(_, end)| *end)
        .max()
        .unwrap_or(0);
    let after = words
        .iter()
        .filter(|(start, _)| *start >= offset)
        .map(|(start, _)| *start)
        .min()
        .unwrap_or(text_len);
    (before, after)
}
