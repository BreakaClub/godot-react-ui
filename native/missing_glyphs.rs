//! Characters no font has, noticed when a text is shaped.
//!
//! A text that has a character none of its fonts has is drawn with the engine's hex box. The root notices such characters as it builds a paragraph, so that
//! something can find a font for them: natively a system font FreeType can read (`system_fonts.rs`), on the Web a font file the page downloads
//! (`src/font-slices`). Nothing is noticed unless somebody asked, and the characters are looked at only when a paragraph is built, so a tree whose text every
//! font covers costs a scan of each text for characters outside ASCII.
//!
//! This module is the bookkeeping, with no engine call in it: the caller says whether a font has a character. Which characters were found, which are new,
//! and which nodes have them (they are shaped again when a font arrives).

use std::collections::{BTreeMap, BTreeSet, HashMap};

/// The first code point that is not ASCII. Every font has ASCII, and a text that has nothing else is not looked at.
const FIRST_NON_ASCII: u32 = 0x80;

/// Whether a shaper leaves `codepoint` out and no font needs a glyph for it (Unicode's Default_Ignorable_Code_Point, which `TextServer` has no query for):
/// the soft hyphen, joiners and the marks around them, bidirectional controls, the invisible operators, variation selectors, the byte order mark, tags.
pub(crate) fn is_ignorable(codepoint: u32) -> bool {
    matches!(
        codepoint,
        0xAD | 0x34F
            | 0x61C
            | 0x115F..=0x1160
            | 0x17B4..=0x17B5
            | 0x180B..=0x180F
            | 0x200B..=0x200F
            | 0x202A..=0x202E
            | 0x2060..=0x206F
            | 0x3164
            | 0xFE00..=0xFE0F
            | 0xFEFF
            | 0xFFA0
            | 0xFFF0..=0xFFF8
            | 0x1BCA0..=0x1BCA3
            | 0x1D173..=0x1D17A
            | 0xE0000..=0xE0FFF
    )
}

/// What is known of the characters of the paragraphs a root has built.
#[derive(Default)]
pub(crate) struct MissingGlyphs {
    /// Whether anything wants to know: a script that listens, or a platform with system fonts to look in.
    enabled: bool,
    /// Whether each character has a glyph in the font it was asked of, by the font's identity: asked once, until the fonts change.
    covered: HashMap<(i64, u32), bool>,
    /// The font book's epoch the answers in `covered` are for.
    epoch: u64,
    /// Characters found missing that nobody has been told of yet, in the order found.
    pending: Vec<u32>,
    /// What each text node is missing, so that the nodes can be shaped again once a font that has the characters is added.
    nodes: BTreeMap<u32, BTreeSet<u32>>,
}

impl MissingGlyphs {
    pub(crate) fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub(crate) fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
        if !enabled {
            self.pending.clear();
            self.nodes.clear();
        }
    }

    /// The fonts may be other than they were when the answers were got: they are asked again.
    pub(crate) fn fonts_changed(&mut self, epoch: u64) {
        if epoch != self.epoch {
            self.epoch = epoch;
            self.covered.clear();
        }
    }

    /// Node `tag`'s paragraph is being built again: what it was missing is found out afresh.
    pub(crate) fn forget_node(&mut self, tag: u32) {
        self.nodes.remove(&tag);
    }

    /// Look at the characters of `text`, which node `tag` shows (or none: a text that belongs to no node) in the font `font`. `has_glyph` is asked for each
    /// character outside ASCII that the font has not been asked about; a character it says no font has is remembered for the node and, if it is new
    /// to `reported` (what the caller has told of since the fonts last changed), becomes pending.
    pub(crate) fn note(
        &mut self,
        tag: Option<u32>,
        text: &str,
        font: i64,
        mut has_glyph: impl FnMut(u32) -> bool,
        mut already_told: impl FnMut(u32) -> bool,
    ) {
        if !self.enabled || text.is_ascii() {
            return;
        }
        for character in text.chars() {
            let codepoint = u32::from(character);
            if codepoint < FIRST_NON_ASCII || is_ignorable(codepoint) {
                continue;
            }
            let has = *self
                .covered
                .entry((font, codepoint))
                .or_insert_with(|| has_glyph(codepoint));
            if has {
                continue;
            }
            if let Some(tag) = tag {
                self.nodes.entry(tag).or_default().insert(codepoint);
            }
            if !already_told(codepoint) && !self.pending.contains(&codepoint) {
                self.pending.push(codepoint);
            }
        }
    }

    pub(crate) fn has_pending(&self) -> bool {
        !self.pending.is_empty()
    }

    /// The characters found since the last call, once each.
    pub(crate) fn take_pending(&mut self) -> Vec<u32> {
        std::mem::take(&mut self.pending)
    }

    /// The nodes that are missing a character, to be shaped again when a font that may have it is added.
    pub(crate) fn nodes(&self) -> Vec<u32> {
        self.nodes.keys().copied().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn enabled() -> MissingGlyphs {
        let mut missing = MissingGlyphs::default();
        missing.set_enabled(true);
        missing
    }

    /// A font that has ASCII, Latin-1 and nothing else.
    fn latin_only(codepoint: u32) -> bool {
        codepoint < 0x100
    }

    #[test]
    fn nothing_is_noticed_until_somebody_asked() {
        let mut missing = MissingGlyphs::default();
        missing.note(
            Some(1),
            "日本",
            7,
            |_| unreachable!("no font is asked"),
            |_| false,
        );
        assert!(!missing.has_pending());
        assert!(missing.nodes().is_empty());
    }

    #[test]
    fn a_text_of_ascii_asks_no_font_anything() {
        let mut missing = enabled();
        missing.note(
            Some(1),
            "Hamburgefonstiv 0123",
            7,
            |_| unreachable!(),
            |_| false,
        );
        assert!(!missing.has_pending());
    }

    #[test]
    fn a_character_no_font_has_is_pending_once_and_remembered_for_its_node() {
        let mut missing = enabled();
        missing.note(Some(4), "a日b日c本", 7, latin_only, |_| false);
        assert_eq!(missing.take_pending(), vec![0x65E5, 0x672C]);
        assert_eq!(missing.nodes(), vec![4]);
        // Taken: the next paragraph with the same characters is pending again only if the caller has not told of them.
        missing.note(Some(5), "日", 7, latin_only, |_| true);
        assert!(!missing.has_pending(), "already told");
        assert_eq!(missing.nodes(), vec![4, 5]);
    }

    #[test]
    fn what_a_font_has_is_asked_once_per_font() {
        let mut missing = enabled();
        let mut asked = Vec::new();
        missing.note(
            Some(1),
            "é日é日",
            7,
            |codepoint| {
                asked.push(codepoint);
                latin_only(codepoint)
            },
            |_| false,
        );
        missing.note(
            Some(2),
            "é日",
            7,
            |_| unreachable!("answered before"),
            |_| false,
        );
        assert_eq!(asked, vec![0xE9, 0x65E5]);
        // Another font is another question; so are the same fonts after they changed.
        missing.note(Some(3), "日", 8, |_| true, |_| false);
        assert_eq!(missing.nodes(), vec![1, 2]);
        missing.fonts_changed(1);
        let mut again = 0;
        missing.note(
            Some(3),
            "日",
            7,
            |_| {
                again += 1;
                true
            },
            |_| false,
        );
        assert_eq!(again, 1);
    }

    #[test]
    fn characters_a_shaper_leaves_out_are_not_missing() {
        let mut missing = enabled();
        missing.note(
            Some(1),
            "a\u{200D}b\u{FE0F}\u{00AD}\u{FEFF}",
            7,
            |_| false,
            |_| false,
        );
        assert!(
            !missing.has_pending(),
            "joiners, selectors and the soft hyphen need no glyph"
        );
        assert!(
            is_ignorable(0x200B)
                && is_ignorable(0xE0100)
                && !is_ignorable(0x4E2D)
                && !is_ignorable(0x1F600)
        );
    }

    #[test]
    fn a_node_built_again_forgets_what_it_was_missing() {
        let mut missing = enabled();
        missing.note(Some(9), "日", 7, latin_only, |_| false);
        assert_eq!(missing.nodes(), vec![9]);
        missing.forget_node(9);
        missing.note(Some(9), "plain", 7, latin_only, |_| false);
        assert!(missing.nodes().is_empty());
    }

    #[test]
    fn turning_it_off_forgets_everything() {
        let mut missing = enabled();
        missing.note(Some(9), "日", 7, latin_only, |_| false);
        missing.set_enabled(false);
        assert!(!missing.has_pending());
        assert!(missing.nodes().is_empty());
    }
}
