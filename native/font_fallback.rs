//! Fonts for the characters no font has, found when the text that has them first appears (docs/tracks/font-slices.md).
//!
//! The root notices the characters of a paragraph that none of its fonts has (`missing_glyphs.rs`) as it builds the paragraph. What happens next depends on
//! where the root is:
//! - Where the platform has system fonts (macOS, Windows, Linux, Android, iOS) the engine has looked for one for the character already, and it is noticed
//!   because that failed. The families FreeType can read are tried (`system_fonts.rs`), the one that has the character is added behind the root's fonts,
//!   and the text that has the character is shaped again. Nothing is read from disk until a character needs it.
//! - On the Web there are no system fonts. The owner's script is told of the characters (`missing_glyphs_ready`, `take_missing_codepoints`); it fetches a
//!   font that has them (`src/font-slices`) and hands it over (`add_font_fallbacks`), and the text is shaped again.
//!
//! Neither costs anything where nobody asked: a root with no system fonts and no listening script notices nothing.

use std::collections::BTreeSet;

use godot::classes::{Font, TextServerManager};
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::missing_glyphs::MissingGlyphs;
use crate::system_fonts::{self, SystemFallback};

/// The most rounds of "add a font, shape again, find more missing" before the root gives up: a font that has a character cannot make another missing, so one
/// round suffices, and this is the bound on a bug.
const MAXIMUM_ROUNDS: usize = 8;

/// What the root keeps for the fonts of characters no font has.
#[derive(Default)]
pub(crate) struct Fallbacks {
    missing: MissingGlyphs,
    /// The system fonts, where the platform has them; made when the root is ready.
    system: Option<SystemFallback>,
    /// Whether the owner's script listens for characters (it can supply a font, which a platform without system fonts needs).
    script_listens: bool,
    /// Characters the script has not been told of: what `take_missing_codepoints` returns.
    for_script: Vec<u32>,
    /// Whether `missing_glyphs_ready` has been emitted for `for_script` and not yet answered by a `take_missing_codepoints`.
    signalled: bool,
    /// Characters the script was told of: a paragraph shaped again after a font was added does not tell it again, and a new text does.
    told: BTreeSet<u32>,
    /// Whether text is being shaped again because a font was added, which is not news to the script.
    reshaping: bool,
}

impl Fallbacks {
    /// The root is ready: where the platform has system fonts, they are looked in.
    pub(crate) fn start(&mut self) {
        if system_fonts::available() && self.system.is_none() {
            self.system = Some(SystemFallback::for_system_language());
        }
        self.refresh_enabled();
    }

    fn refresh_enabled(&mut self) {
        self.missing
            .set_enabled(self.system.is_some() || self.script_listens);
    }

    /// The owner's script asks to be told (or no longer asks) of the characters no font has.
    pub(crate) fn listen(&mut self, listens: bool) {
        self.script_listens = listens;
        if !listens {
            self.for_script.clear();
            self.signalled = false;
        }
        self.refresh_enabled();
    }

    /// The characters for the script, once; the next ones emit `missing_glyphs_ready` again.
    pub(crate) fn take_for_script(&mut self) -> PackedInt32Array {
        self.signalled = false;
        std::mem::take(&mut self.for_script)
            .into_iter()
            .filter_map(|codepoint| i32::try_from(codepoint).ok())
            .collect()
    }

    /// Replace the system families that are tried; none turns the system fonts off, and the characters no family had are looked for again.
    pub(crate) fn set_candidates(&mut self, families: Vec<String>) {
        if families.is_empty() {
            self.system = None;
        } else if let Some(system) = self.system.as_mut() {
            system.set_candidates(families);
        } else if system_fonts::available() {
            let mut system = SystemFallback::for_system_language();
            system.set_candidates(families);
            self.system = Some(system);
        }
        self.refresh_enabled();
    }
}

impl ReactUiRoot {
    /// Look at the characters of `text`, which node `tag` shows, shaped with `font` at `size`: those no font has are remembered, to be dealt with when the
    /// root settles (`settle_missing_glyphs`). A character the script was told of already is told again for a new text and not for a text shaped again
    /// because a font was added.
    pub(crate) fn note_missing_glyphs(
        &mut self,
        tag: Option<u32>,
        text: &str,
        font: &Gd<Font>,
        size: i32,
    ) {
        if !self.fallbacks.missing.is_enabled() || text.is_ascii() {
            return;
        }
        let epoch = self.fonts.epoch();
        self.fallbacks.missing.fonts_changed(epoch);
        let has_system_fonts = self.fallbacks.system.is_some();
        let told = &self.fallbacks.told;
        let told_again = !self.fallbacks.reshaping;
        self.fallbacks.missing.note(
            tag,
            text,
            font.instance_id().to_i64(),
            |codepoint| font_has_glyph(font, size, codepoint, has_system_fonts),
            |codepoint| !told_again && told.contains(&codepoint),
        );
    }

    /// Node `tag`'s paragraph is built again: what it was missing is found out afresh.
    pub(crate) fn forget_missing_glyphs(&mut self, tag: u32) {
        self.fallbacks.missing.forget_node(tag);
    }

    /// Deal with the characters found missing since the last time: look for a system font that has them, where there are system fonts, and tell the script of
    /// the rest. Called where a paragraph may have been built (the end of a commit, of an input event, of registering a face).
    pub(crate) fn settle_missing_glyphs(&mut self) {
        for _ in 0..MAXIMUM_ROUNDS {
            if !self.fallbacks.missing.has_pending() {
                break;
            }
            let found = self.fallbacks.missing.take_pending();
            let mut unresolved = found.clone();
            if let Some(system) = self.fallbacks.system.as_mut() {
                let fonts = system.resolve(&found);
                if !fonts.is_empty() {
                    // The characters the new fonts have are not missing any more; the rest are looked for again by the shaping that follows.
                    self.add_fallbacks_and_reshape(&fonts);
                    unresolved = self.fallbacks.missing.take_pending();
                }
            }
            if self.fallbacks.script_listens && !unresolved.is_empty() {
                for codepoint in unresolved {
                    self.fallbacks.told.insert(codepoint);
                    if !self.fallbacks.for_script.contains(&codepoint) {
                        self.fallbacks.for_script.push(codepoint);
                    }
                }
            }
        }
        if !self.fallbacks.for_script.is_empty() && !self.fallbacks.signalled {
            self.fallbacks.signalled = true;
            self.signals().missing_glyphs_ready().emit();
        }
    }

    /// Add `fonts` behind the fonts text is shaped with and shape the text that was missing characters again. Returns whether there was anything to add.
    pub(crate) fn add_fallbacks_and_reshape(&mut self, fonts: &[Gd<Font>]) -> bool {
        if !self.fonts.add_fallbacks(fonts) {
            return false;
        }
        self.font = self.fonts.theme_font();
        let nodes = self.fallbacks.missing.nodes();
        self.fallbacks.reshaping = true;
        for tag in nodes {
            self.refresh_paragraph(tag);
        }
        self.fallbacks.reshaping = false;
        self.flush_layout();
        true
    }
}

/// Whether `font` has a glyph for `codepoint` when text is shaped with it at `size`: the font and its fallbacks have the character, or, on a platform with
/// system fonts, the text server finds a system font for it, which a one character text shaped in `font` shows (a glyph with a font; none without).
fn font_has_glyph(font: &Gd<Font>, size: i32, codepoint: u32, has_system_fonts: bool) -> bool {
    if font.has_char(codepoint) {
        return true;
    }
    if !has_system_fonts {
        return false;
    }
    let Some(character) = char::from_u32(codepoint) else {
        return false;
    };
    let Some(mut server) = TextServerManager::singleton().get_primary_interface() else {
        return false;
    };
    let shaped = server.create_shaped_text();
    let mut text = [0_u8; 4];
    let has = server
        .shaped_text_add_string_ex(
            shaped,
            &*character.encode_utf8(&mut text),
            &font.get_rids(),
            i64::from(size),
        )
        .done()
        && server
            .shaped_text_get_glyphs(shaped)
            .iter_shared()
            .any(|glyph| {
                glyph
                    .get_or_nil("font_rid")
                    .try_to::<Rid>()
                    .is_ok_and(|rid| rid.is_valid())
            });
    server.free_rid(shaped);
    has
}
