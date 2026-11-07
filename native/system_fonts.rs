//! Finding a system font that has a character no font of the root has (docs/tracks/font-slices.md), on the platforms that have system fonts.
//!
//! The text server already looks for one: when a font allows it (`Font.allow_system_fallback`) and the platform reports `system_fonts`, shaping asks the
//! platform for the font of a character (`OS::get_system_font_path_for_text`). A character is reported here only when that failed, and for Han on macOS 26
//! it fails: CoreText answers with `PingFangUI.ttc`, whose outlines are an `hvgl` table FreeType cannot open, so no glyph is found and the text is hex
//! boxes (docs/tracks/missing-glyph.md). The platform's answer is not all there is: there are families FreeType does read. A list of them is tried, in the
//! order the system's language prefers, and a font is made and kept only for a character it has, so a face is read from disk (Hiragino Sans GB is
//! 23.5 MB) when text needs it and not at start.

use std::collections::BTreeSet;

use godot::classes::{Font, Os, SystemFont};
use godot::prelude::*;

/// `OS.has_feature` for platforms that can name the fonts they have: macOS, Windows, Linux, Android and iOS. The Web cannot (`src/font-slices`).
const SYSTEM_FONTS_FEATURE: &str = "system_fonts";

/// Families whose files FreeType opens and that have Han characters, for Simplified Chinese. The first four are the ones this track found by shaping a
/// character in every family `OS.get_system_fonts()` lists on macOS 26 (Hiragino Sans GB, Heiti SC, Songti SC, Arial Unicode MS), and the common ones of
/// Windows (Microsoft YaHei, SimSun) and Linux (Noto Sans CJK, WenQuanYi, Droid Sans Fallback). Only macOS was tried.
const SIMPLIFIED: &[&str] = &[
    "Hiragino Sans GB",
    "Heiti SC",
    "Songti SC",
    "Microsoft YaHei",
    "SimSun",
    "Noto Sans CJK SC",
    "Noto Sans SC",
    "WenQuanYi Micro Hei",
    "Droid Sans Fallback",
    "Arial Unicode MS",
];
const TRADITIONAL: &[&str] = &[
    "Heiti TC",
    "Hiragino Sans CNS",
    "Microsoft JhengHei",
    "PMingLiU",
    "Noto Sans CJK TC",
    "Noto Sans TC",
];
const JAPANESE: &[&str] = &[
    "Hiragino Sans",
    "Hiragino Kaku Gothic ProN",
    "Yu Gothic",
    "Meiryo",
    "MS Gothic",
    "Noto Sans CJK JP",
    "Noto Sans JP",
    "TakaoPGothic",
    "IPAexGothic",
];
const KOREAN: &[&str] = &[
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "Noto Sans CJK KR",
    "Noto Sans KR",
    "NanumGothic",
    "UnDotum",
    "AppleGothic",
];

/// Whether `codepoint` is one of the characters the candidate families are for: Han, kana, Hangul, bopomofo, and the punctuation and forms of those scripts.
/// Opening a family means reading its file (tens of megabytes), so a character no such family can have (a private use character, Thai) is not asked of them:
/// the engine's own lookup is the only one that can help it.
pub(crate) fn is_cjk(codepoint: u32) -> bool {
    matches!(
        codepoint,
        0x1100..=0x11FF
            | 0x2E80..=0x2FDF
            | 0x3000..=0x30FF
            | 0x3100..=0x4DBF
            | 0x4E00..=0x9FFF
            | 0xA960..=0xA97F
            | 0xAC00..=0xD7FF
            | 0xF900..=0xFAFF
            | 0xFE30..=0xFE4F
            | 0xFF00..=0xFFEF
            | 0x20000..=0x3FFFF
    )
}

/// Whether this platform has system fonts to look in.
pub(crate) fn available() -> bool {
    Os::singleton().has_feature(SYSTEM_FONTS_FEATURE)
}

/// The candidate families for a system language (`OS.get_locale()`: `ja_JP`, `zh_TW`, `en_US`): the language's own family list first, then the others in
/// the order Han text with no language is looked up in on the Web (Simplified, Traditional, Japanese, Korean). Simplified Chinese is the default, as a
/// browser with no `lang` chooses for Han.
pub(crate) fn candidates_for_locale(locale: &str) -> Vec<&'static str> {
    let lower = locale.to_lowercase().replace('-', "_");
    let mut order: Vec<&[&'static str]> = vec![SIMPLIFIED, TRADITIONAL, JAPANESE, KOREAN];
    let first = if lower.starts_with("ja") {
        Some(JAPANESE)
    } else if lower.starts_with("ko") {
        Some(KOREAN)
    } else if lower.starts_with("zh_tw")
        || lower.starts_with("zh_hk")
        || lower.starts_with("zh_mo")
        || lower.contains("hant")
    {
        Some(TRADITIONAL)
    } else {
        None
    };
    if let Some(first) = first {
        order.retain(|group| !std::ptr::eq(*group, first));
        order.insert(0, first);
    }
    let mut seen = BTreeSet::new();
    order
        .into_iter()
        .flatten()
        .copied()
        .filter(|family| seen.insert(*family))
        .collect()
}

/// The system fonts that were tried for the characters no font has, and the characters no family has.
pub(crate) struct SystemFallback {
    candidates: Vec<String>,
    /// Characters no candidate has: not looked for again.
    unresolvable: BTreeSet<u32>,
    /// The families the system has, lowercase, read the first time a character needed one (`OS.get_system_fonts()`).
    installed: Option<BTreeSet<String>>,
    /// The families a font was made of, because it has characters the root was missing: not made again.
    adopted: BTreeSet<String>,
}

impl SystemFallback {
    pub(crate) fn for_system_language() -> Self {
        let locale = Os::singleton().get_locale().to_string();
        Self::with_candidates(
            candidates_for_locale(&locale)
                .into_iter()
                .map(String::from)
                .collect(),
        )
    }

    fn with_candidates(candidates: Vec<String>) -> Self {
        Self {
            candidates,
            unresolvable: BTreeSet::new(),
            installed: None,
            adopted: BTreeSet::new(),
        }
    }

    /// Replace the candidates; the characters that no family had are looked for again, in the new list.
    pub(crate) fn set_candidates(&mut self, families: Vec<String>) {
        self.candidates = families;
        self.unresolvable.clear();
    }

    /// The system fonts that have `missing` characters: each family of the list that the system has, and that has one of them not yet had, is made into a
    /// font and returned. A family whose file FreeType cannot open has none and is let go. A character no family has is remembered.
    ///
    /// Only families the system lists are asked for. A name the system does not have is not a harmless miss: on macOS CoreText answers a lookup of
    /// an unknown family by asking the downloadable font service whether it is one, which blocks the calling thread until the service answers (it did
    /// not, in a process with no window: the root hung in `CTFontDescriptorCopyAttribute` asking for "Microsoft YaHei").
    pub(crate) fn resolve(&mut self, missing: &[u32]) -> Vec<Gd<Font>> {
        let installed = self.installed.get_or_insert_with(|| {
            Os::singleton()
                .get_system_fonts()
                .as_slice()
                .iter()
                .map(|family| family.to_string().to_lowercase())
                .collect()
        });
        let mut remaining: Vec<u32> = missing
            .iter()
            .copied()
            .filter(|codepoint| !self.unresolvable.contains(codepoint))
            .collect();
        // What no candidate can have is not asked of them.
        self.unresolvable.extend(
            remaining
                .iter()
                .copied()
                .filter(|codepoint| !is_cjk(*codepoint)),
        );
        remaining.retain(|codepoint| is_cjk(*codepoint));
        let mut found: Vec<Gd<Font>> = Vec::new();
        for family in &self.candidates {
            if remaining.is_empty() {
                break;
            }
            if self.adopted.contains(family) || !installed.contains(&family.to_lowercase()) {
                continue;
            }
            let mut font = SystemFont::new_gd();
            font.set_font_names(&PackedStringArray::from([GString::from(family.as_str())]));
            // The fallback of a fallback is the engine's own search, which is what found nothing.
            font.set_allow_system_fallback(false);
            let has: Vec<u32> = remaining
                .iter()
                .copied()
                .filter(|codepoint| font.has_char(*codepoint))
                .collect();
            if has.is_empty() {
                continue;
            }
            remaining.retain(|codepoint| !has.contains(codepoint));
            self.adopted.insert(family.clone());
            found.push(font.upcast());
        }
        self.unresolvable.extend(remaining);
        found
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn first(locale: &str) -> &'static str {
        candidates_for_locale(locale)[0]
    }

    #[test]
    fn the_system_language_chooses_which_family_is_tried_first() {
        assert_eq!(first("en_US"), "Hiragino Sans GB");
        assert_eq!(first("zh_CN"), "Hiragino Sans GB");
        assert_eq!(first("zh_TW"), "Heiti TC");
        assert_eq!(first("zh-HK"), "Heiti TC");
        assert_eq!(first("zh_Hant_TW"), "Heiti TC");
        assert_eq!(first("ja_JP"), "Hiragino Sans");
        assert_eq!(first("ko_KR"), "Apple SD Gothic Neo");
        assert_eq!(first(""), "Hiragino Sans GB");
    }

    #[test]
    fn only_the_scripts_the_families_are_for_are_asked_of_them() {
        for codepoint in [
            0x4E2D, 0x3042, 0x30AB, 0xD55C, 0x3105, 0xFF0C, 0x3002, 0x20000,
        ] {
            assert!(is_cjk(codepoint), "U+{codepoint:04X}");
        }
        for codepoint in [0x41, 0xE9, 0xE000, 0xF8FF, 0x0E01, 0x0639, 0x1F600, 0x2603] {
            assert!(!is_cjk(codepoint), "U+{codepoint:04X}");
        }
    }

    #[test]
    fn every_family_is_a_candidate_whatever_the_language_and_none_twice() {
        for locale in ["en_US", "ja_JP", "ko_KR", "zh_TW"] {
            let candidates = candidates_for_locale(locale);
            let distinct: BTreeSet<&str> = candidates.iter().copied().collect();
            assert_eq!(distinct.len(), candidates.len(), "{locale}: a family twice");
            for group in [SIMPLIFIED, TRADITIONAL, JAPANESE, KOREAN] {
                for family in group {
                    assert!(distinct.contains(family), "{locale}: {family} is not tried");
                }
            }
        }
    }

    #[test]
    fn a_language_keeps_the_others_in_the_order_the_web_looks_in() {
        let japanese = candidates_for_locale("ja_JP");
        let position = |family: &str| japanese.iter().position(|candidate| *candidate == family);
        assert!(position("Hiragino Sans") < position("Hiragino Sans GB"));
        assert!(position("Hiragino Sans GB") < position("Heiti TC"));
        assert!(position("Heiti TC") < position("Apple SD Gothic Neo"));
    }
}
