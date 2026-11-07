//! The offset map of a text with inlays. The paragraph that is shaped, drawn and laid out (its *display* text) is the shown text
//! with each inlay's text spliced in at the offset where it sits; everything the document sees (the selection, copy, the geometry
//! queries, the accessible name) is in offsets of the shown text alone (its *source*). This is the map between them, as the
//! `TextInput`'s IME preedit has one (`EditBuffer::display_text`, `preedit_range`).
//!
//! Offsets are code points, as in `TextServer`; `text_offsets.rs` converts what crosses to JS.
//!
//! A source offset that has inlays at it has two display positions, one on each side of them (the group of inlays at one source
//! offset counts as one): the position *before* the first and the position *after* the last. A display offset inside the group
//! is not a caret position. Nothing here touches Godot.

use std::ops::Range;

/// Which side of the inlays at a source offset a position is on (and, at the end of a soft wrapped line, which line). It is
/// `After` wherever there are none.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(crate) enum Side {
    Before,
    #[default]
    After,
}

/// One inlay in the display text.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Inlay {
    /// The source offset it sits at.
    pub(crate) source: usize,
    /// Where its text starts in the display text.
    pub(crate) display: usize,
    /// Its length in code points.
    pub(crate) len: usize,
}

/// Where a display offset is in the source.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum Located {
    /// A caret position: the source offset and the side of its inlays it is on.
    At { source: usize, side: Side },
    /// Inside the inlays at `source`, which fill the display range `group`: no caret goes here.
    Within { source: usize, group: Range<usize> },
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct OffsetMap {
    /// In display order, which is source order.
    inlays: Vec<Inlay>,
    source_len: usize,
}

impl OffsetMap {
    /// The map of a text of `source_len` code points with `inlays` in it. They must be in order, not overlap, and sit inside the
    /// text.
    pub(crate) fn new(inlays: Vec<Inlay>, source_len: usize) -> Self {
        debug_assert!(
            inlays.windows(2).all(|pair| pair[0].source <= pair[1].source
                && pair[0].display + pair[0].len <= pair[1].display),
            "inlays are in order and do not overlap"
        );
        debug_assert!(inlays.iter().all(|inlay| inlay.source <= source_len));
        Self { inlays, source_len }
    }

    pub(crate) fn has_inlays(&self) -> bool {
        !self.inlays.is_empty()
    }

    /// The length of the display text.
    pub(crate) fn display_len(&self) -> usize {
        self.source_len + self.inlays.iter().map(|inlay| inlay.len).sum::<usize>()
    }

    /// The display offset of source offset `source`, on `side` of the inlays at it.
    pub(crate) fn display_of(&self, source: usize, side: Side) -> usize {
        let mut before = source;
        let mut at = 0;
        for inlay in &self.inlays {
            if inlay.source < source {
                before += inlay.len;
            } else if inlay.source == source {
                at += inlay.len;
            }
        }
        match side {
            Side::Before => before,
            Side::After => before + at,
        }
    }

    /// The display range that source range `source` is shown by: it starts after the inlays at its start and ends before the
    /// ones at its end, so it covers the inlays strictly inside it and none at its ends.
    pub(crate) fn display_range(&self, source: Range<usize>) -> Range<usize> {
        self.display_of(source.start, Side::After)..self.display_of(source.end, Side::Before)
    }

    /// Where display offset `display` is in the source.
    pub(crate) fn locate(&self, display: usize) -> Located {
        let mut shift = 0;
        let mut index = 0;
        while index < self.inlays.len() {
            let first = self.inlays[index];
            let source = first.source;
            // The group: every inlay at this source offset, which are contiguous in the display text.
            let mut end = first.display + first.len;
            let mut next = index + 1;
            while next < self.inlays.len() && self.inlays[next].source == source {
                end = self.inlays[next].display + self.inlays[next].len;
                next += 1;
            }
            if display < first.display {
                break;
            }
            if display == first.display {
                return Located::At {
                    source,
                    side: Side::Before,
                };
            }
            if display < end {
                return Located::Within {
                    source,
                    group: first.display..end,
                };
            }
            shift += end - first.display;
            if display == end {
                return Located::At {
                    source,
                    side: Side::After,
                };
            }
            index = next;
        }
        Located::At {
            source: display - shift,
            side: Side::After,
        }
    }

    /// The source offset nearest `display`: inside a group of inlays, the offset they sit at.
    pub(crate) fn source_of(&self, display: usize) -> usize {
        match self.locate(display) {
            Located::At { source, .. } | Located::Within { source, .. } => source,
        }
    }

    /// The source range a display range covers: what is left of it when the inlays at its ends are taken off.
    pub(crate) fn source_range(&self, display: Range<usize>) -> Range<usize> {
        self.source_of(display.start)..self.source_of(display.end)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// "abcdef" with `X` (one code point) at 0, `YY` at 3 and `Z` and `W` both at 3 after it, `V` at 6:
    /// display "XabcYYZWdefV".
    fn map() -> OffsetMap {
        OffsetMap::new(
            vec![
                Inlay { source: 0, display: 0, len: 1 },
                Inlay { source: 3, display: 4, len: 2 },
                Inlay { source: 3, display: 6, len: 1 },
                Inlay { source: 3, display: 7, len: 1 },
                Inlay { source: 6, display: 11, len: 1 },
            ],
            6,
        )
    }

    #[test]
    fn a_text_without_inlays_is_the_identity() {
        let none = OffsetMap::new(Vec::new(), 5);
        assert!(!none.has_inlays());
        assert_eq!(none.display_len(), 5);
        for offset in 0..=5 {
            for side in [Side::Before, Side::After] {
                assert_eq!(none.display_of(offset, side), offset);
            }
            assert_eq!(none.locate(offset), Located::At { source: offset, side: Side::After });
        }
    }

    #[test]
    fn an_offset_with_inlays_has_a_position_on_each_side_of_them() {
        let map = map();
        assert_eq!(map.display_len(), 12);
        // At 0: X is the whole group.
        assert_eq!(map.display_of(0, Side::Before), 0);
        assert_eq!(map.display_of(0, Side::After), 1);
        // Before 3 is after "abc"; the group YY Z W fills display 4..8, so the sides are 4 and 8.
        assert_eq!(map.display_of(3, Side::Before), 4);
        assert_eq!(map.display_of(3, Side::After), 8);
        // An offset with none is the same on both sides, shifted by the inlays before it.
        assert_eq!(map.display_of(1, Side::Before), 2);
        assert_eq!(map.display_of(1, Side::After), 2);
        assert_eq!(map.display_of(5, Side::After), 10);
        assert_eq!(map.display_of(6, Side::Before), 11);
        assert_eq!(map.display_of(6, Side::After), 12);
    }

    #[test]
    fn locate_inverts_display_of_and_refuses_the_inside_of_a_group() {
        let map = map();
        for source in 0..=6 {
            for side in [Side::Before, Side::After] {
                let display = map.display_of(source, side);
                match map.locate(display) {
                    Located::At { source: found, side: found_side } => {
                        assert_eq!(found, source, "display {display}");
                        let has_inlays = map.display_of(source, Side::Before) != map.display_of(source, Side::After);
                        if has_inlays {
                            assert_eq!(found_side, side, "display {display}");
                        }
                    }
                    Located::Within { .. } => panic!("display {display} is a caret position"),
                }
            }
        }
        // 5 is between YY and Z, 6 between Z and W, 7... each inside the group 4..8.
        for display in [5, 6, 7] {
            assert_eq!(map.locate(display), Located::Within { source: 3, group: 4..8 }, "{display}");
        }
        assert_eq!(map.source_of(5), 3);
        assert_eq!(map.source_of(2), 1);
        assert_eq!(map.source_of(10), 5);
    }

    #[test]
    fn a_range_covers_the_inlays_inside_it_and_none_at_its_ends() {
        let map = map();
        // Source 0..3 starts after X and ends before YYZW: display 1..4.
        assert_eq!(map.display_range(0..3), 1..4);
        // Source 2..4: the whole group is inside.
        assert_eq!(map.display_range(2..4), 3..9);
        // Source 3..4 starts after the group.
        assert_eq!(map.display_range(3..4), 8..9);
        // The whole text covers the inlay at 0 and at 6 not at all.
        assert_eq!(map.display_range(0..6), 1..11);
        // An empty range stays empty (or inverts, which the caller checks): at 3 the ends are different positions.
        let empty = map.display_range(3..3);
        assert!(empty.start >= empty.end, "{empty:?}");
        assert_eq!(map.source_range(1..4), 0..3);
        assert_eq!(map.source_range(3..9), 2..4);
    }

    #[test]
    fn an_inlay_only_text_has_a_display_and_no_source() {
        let map = OffsetMap::new(vec![Inlay { source: 0, display: 0, len: 4 }], 0);
        assert_eq!(map.display_len(), 4);
        assert_eq!(map.display_of(0, Side::Before), 0);
        assert_eq!(map.display_of(0, Side::After), 4);
        assert_eq!(map.locate(2), Located::Within { source: 0, group: 0..4 });
    }
}
