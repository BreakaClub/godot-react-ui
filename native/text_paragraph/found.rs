//! The fonts to draw the glyphs of fonts the text server found.
//!
//! A text with letter-spacing is shaped with a font that carries the spacing as an embolden strength (`fonts.rs`: the server adds
//! `embolden * size / 64` px to every advance, a fraction of a pixel where its own spacing is whole pixels) and drawn with the font that does
//! not, so the glyphs are not emboldened. The paragraph's fonts are listed in pairs for that (`LineDrawing::fonts`). A font the server
//! finds by itself, on the system, for a character none of the paragraph's fonts has (`TextServerAdvanced::_find_system_fallback`) is not
//! in the list, and it is made for the shaping font: it has that font's embolden (verified: shaping U+0E01 with a font variation of
//! embolden 0, 1.6 and 4 answers three Thonburi fonts with those strengths, a glyph index of 29 in each). Drawn as it is, the glyph is
//! bold, as thick as the spacing is wide.
//!
//! The server finds the same font for the same text with the drawing fonts, with the embolden of those; so the paragraph's text is shaped
//! once more with them, and a glyph of a font the list lacks is matched, by where its cluster starts and its glyph index, to the glyph the
//! second shaping has there. The match is the font to draw it with. Only a paragraph that has such a glyph does this.

use godot::prelude::*;

use crate::text_layout::ShapedGlyph;

/// Whether a glyph of `glyphs` is of a font `known` does not list and that is a font at all (a hex box has none).
pub(super) fn has_found_font<'a>(
    glyphs: impl IntoIterator<Item = &'a ShapedGlyph>,
    known: &[(Rid, Rid)],
) -> bool {
    glyphs.into_iter().any(|glyph| is_found(glyph.font, known))
}

fn is_found(font: Rid, known: &[(Rid, Rid)]) -> bool {
    font != Rid::Invalid && !known.iter().any(|(shaped, _)| *shaped == font)
}

/// For each font of `glyphs` that `known` does not list, the font `untracked` has for the same glyph, as a pair in the order `known`
/// has them: the shaping font and the drawing font. `untracked` is the same text shaped with the drawing fonts. A glyph with no font
/// (a hex box) is not drawn with one, and a font is paired once.
///
/// A font with no match is an error, not a font drawn as it is: it would draw bold, and a match is there unless the server found another
/// font for the drawing fonts than for the shaping ones.
pub(super) fn draw_fonts_of_found<'a>(
    glyphs: impl IntoIterator<Item = &'a ShapedGlyph>,
    known: &[(Rid, Rid)],
    untracked: &[ShapedGlyph],
) -> Result<Vec<(Rid, Rid)>, String> {
    let mut found: Vec<(Rid, Rid)> = Vec::new();
    for glyph in glyphs {
        let font = glyph.font;
        if !is_found(font, known) || found.iter().any(|(shaped, _)| *shaped == font) {
            continue;
        }
        let same = untracked
            .iter()
            .find(|other| other.start == glyph.start && other.index == glyph.index)
            .ok_or_else(|| {
                format!(
                    "the glyph {} of the cluster at {} has no counterpart in the text shaped with the drawing fonts",
                    glyph.index, glyph.start
                )
            })?;
        if same.font == Rid::Invalid {
            return Err(format!(
                "the glyph {} of the cluster at {} has a font when shaped to track and none when shaped to draw",
                glyph.index, glyph.start
            ));
        }
        found.push((font, same.font));
    }
    Ok(found)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn glyph(font: u64, start: i64, index: i64) -> ShapedGlyph {
        ShapedGlyph {
            start,
            repeat: 1,
            advance: 10.0,
            offset: Vector2::ZERO,
            font: if font == 0 {
                Rid::Invalid
            } else {
                Rid::new(font)
            },
            size: 16,
            index,
            flags: 0,
        }
    }

    #[test]
    fn a_font_the_server_found_is_drawn_with_the_font_the_drawing_fonts_found() {
        // Glyph 29 of cluster 2 is in font 50 when shaped to track and in font 60 when shaped to draw.
        let tracked = [glyph(10, 0, 1), glyph(50, 2, 29), glyph(50, 3, 30)];
        let drawn = [glyph(11, 0, 1), glyph(60, 2, 29), glyph(60, 3, 30)];
        let known = [(Rid::new(10), Rid::new(11))];
        assert_eq!(
            draw_fonts_of_found(&tracked, &known, &drawn),
            Ok(vec![(Rid::new(50), Rid::new(60))]),
            "one pair for the font, the face's own font not among them"
        );
    }

    #[test]
    fn a_paragraph_with_no_found_font_pairs_nothing() {
        let tracked = [glyph(10, 0, 1), glyph(0, 1, 0xE000)];
        let known = [(Rid::new(10), Rid::new(11))];
        assert!(!has_found_font(&tracked, &known));
        assert_eq!(draw_fonts_of_found(&tracked, &known, &[]), Ok(Vec::new()));
        assert!(has_found_font(&[glyph(50, 2, 29)], &known));
    }

    #[test]
    fn the_glyph_is_matched_by_its_cluster_and_its_index() {
        // Two glyphs share a cluster; each is matched to the one with its own index.
        let tracked = [glyph(50, 4, 7), glyph(51, 4, 8)];
        let drawn = [glyph(61, 4, 8), glyph(60, 4, 7)];
        assert_eq!(
            draw_fonts_of_found(&tracked, &[], &drawn),
            Ok(vec![
                (Rid::new(50), Rid::new(60)),
                (Rid::new(51), Rid::new(61))
            ])
        );
    }

    #[test]
    fn a_found_font_with_no_counterpart_is_an_error() {
        let tracked = [glyph(50, 2, 29)];
        for drawn in [vec![], vec![glyph(60, 3, 29)], vec![glyph(60, 2, 30)]] {
            assert!(
                draw_fonts_of_found(&tracked, &[], &drawn).is_err(),
                "{drawn:?} is not where the glyph is"
            );
        }
        assert!(
            draw_fonts_of_found(&tracked, &[], &[glyph(0, 2, 29)]).is_err(),
            "a hex box is not a font to draw with"
        );
    }
}
