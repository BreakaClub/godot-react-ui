//! The static text selection model: an anchor and a focus, each a node `tag` and a
//! code point offset in that node's text, over an ordered list of text nodes. Nothing here touches
//! Godot, a layout or the DOM; the selection input feeds it from pointer gestures and reads ranges back for
//! painting, copying and `root.getSelection()`.
//!
//! Offsets here are code point indices (what `TextServer` returns). Convert to and from JS's UTF-16
//! offsets with `text_offsets.rs` against the node's text at the boundary.
//!
//! # Public API
//!
//! - [`SelectableNode`] and [`Document`]: the nodes that hold text, in document order (pre-order of the
//!   mounted tree), each with its length in code points and whether `userSelect` lets it be selected.
//!   Nodes with `userSelect: none` belong in the list, because a range that spans them has to skip
//!   them. Build a `Document` when a gesture starts and rebuild it when the tree changes; it is a
//!   snapshot, and [`Document::new`] rejects a repeated tag. [`Document::node`] and
//!   [`Document::selectable_nodes`] read it back; a pointer that is not over selectable text is placed
//!   by geometry (`selection_input::drag_target`), not by the document.
//! - [`SelectionPoint`]: `(tag, offset)`. An endpoint must be in a selectable node and within its
//!   length.
//! - [`TextSelection`]: the model. Every mutator validates its arguments before changing anything,
//!   and returns `Ok(true)` if the anchor or the focus changed (the `selectionchange` condition).
//!   - [`TextSelection::collapse`]: a click.
//!   - [`TextSelection::extend`]: a drag, or Shift+click. Moves the focus and keeps the anchor; with no
//!     selection it collapses at the point.
//!   - [`TextSelection::select_word`]: a double click. The word bounds are injected through
//!     [`WordRanges`] (a closure `Fn(tag, offset) -> (start, end)` works).
//!   - [`TextSelection::select_node`]: a triple click.
//!   - [`TextSelection::select_all`]: `ui_text_select_all`, first selectable node to last.
//!   - [`TextSelection::select`]: any anchor and focus, for gestures the others do not cover (a word
//!     drag sets the anchor to a word edge).
//!   - [`TextSelection::clear`], and [`TextSelection::node_changed`] to call when a node's text changes
//!     or the node is removed: the selection is cleared if that node was inside it.
//!   - [`TextSelection::clear_if_stale`] re-checks the selection against a fresh `Document`, for tree
//!     changes that do not name a node (a selectable node inserted or reordered inside the range).
//!   - [`TextSelection::ranges`]: the per-node `[start, end)` ranges to paint, in document order.
//!   - [`TextSelection::selected_text`]: the text to copy, the ranges joined by `\n`.
//!   - Accessors: [`TextSelection::anchor`], [`TextSelection::focus`], [`TextSelection::is_active`],
//!     [`TextSelection::is_collapsed`], [`TextSelection::covers`].
//!
//! # Rules
//!
//! - Endpoints are ordered by document order, then offset; the anchor may come after the focus.
//! - A node with `userSelect: none` between the two endpoints is skipped: no range, no text.
//! - A selection that covers no characters (a collapsed caret, or only the ends of two nodes) has no
//!   ranges; empty ranges are never returned.
//! - "Covered" nodes are the selectable nodes from the first endpoint's to the last's, inclusive. A
//!   change to any covered node clears the selection, including a collapsed one, because its offset may
//!   no longer be valid.

use std::collections::{BTreeMap, BTreeSet};

/// A position in a node's text: a code point offset, `0..=len`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct SelectionPoint {
    pub(crate) tag: u32,
    pub(crate) offset: usize,
}

/// One text node of the document, in document order.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct SelectableNode {
    pub(crate) tag: u32,
    /// The node's text length in code points.
    pub(crate) len: usize,
    /// Whether the computed `userSelect` is `text`. A selection may start, end and extend only in a
    /// selectable node; a range that spans a node that is not selectable skips it.
    pub(crate) selectable: bool,
}

/// What cannot be selected, and why. Nothing has changed when one is returned.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum SelectionError {
    /// The document lists a tag twice.
    DuplicateNode(u32),
    /// The tag is not in the document.
    UnknownNode(u32),
    /// The node has `userSelect: none`, so it cannot hold an endpoint.
    NotSelectable(u32),
    /// An offset past the end of the node's text.
    OffsetOutOfRange { tag: u32, offset: usize, len: usize },
    /// The injected word bounds were not `start <= offset <= end <= len`.
    InvalidWordRange {
        tag: u32,
        offset: usize,
        start: usize,
        end: usize,
    },
    /// `selected_text` was not given the text of a node in the selection.
    MissingText(u32),
    /// The text given for a node is shorter than the range selected in it.
    TextTooShort { tag: u32, end: usize, len: usize },
}

impl std::fmt::Display for SelectionError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SelectionError::DuplicateNode(tag) => {
                write!(formatter, "node {tag} appears twice in the document")
            }
            SelectionError::UnknownNode(tag) => {
                write!(formatter, "node {tag} is not in the document")
            }
            SelectionError::NotSelectable(tag) => {
                write!(formatter, "node {tag} has userSelect: none")
            }
            SelectionError::OffsetOutOfRange { tag, offset, len } => write!(
                formatter,
                "offset {offset} is past the end of node {tag}'s text ({len} code points)"
            ),
            SelectionError::InvalidWordRange {
                tag,
                offset,
                start,
                end,
            } => write!(
                formatter,
                "word bounds {start}..{end} for offset {offset} in node {tag} do not contain the offset or leave the text"
            ),
            SelectionError::MissingText(tag) => {
                write!(formatter, "no text was given for selected node {tag}")
            }
            SelectionError::TextTooShort { tag, end, len } => write!(
                formatter,
                "node {tag}'s text has {len} code points but the selection ends at {end}"
            ),
        }
    }
}

/// The word bounds of a node's text, from `TextServer.shaped_text_get_word_breaks` in the renderer
/// and from fixtures in tests.
pub(crate) trait WordRanges {
    /// The `(start, end)` code point range of the word at `offset` in node `tag`. It must contain
    /// `offset` (`start <= offset <= end`) and lie inside the text. At the boundary between two words
    /// either is acceptable; for a point in white space return the white space run, or an empty range
    /// at the point if the text has no words.
    fn word_range(&self, tag: u32, offset: usize) -> (usize, usize);
}

impl<F: Fn(u32, usize) -> (usize, usize)> WordRanges for F {
    fn word_range(&self, tag: u32, offset: usize) -> (usize, usize) {
        self(tag, offset)
    }
}

/// The text nodes in document order. See the module documentation.
#[derive(Clone, Debug)]
pub(crate) struct Document {
    nodes: Vec<SelectableNode>,
    /// Tag to index in `nodes`.
    positions: BTreeMap<u32, usize>,
}

impl Document {
    pub(crate) fn new(nodes: Vec<SelectableNode>) -> Result<Self, SelectionError> {
        let mut positions = BTreeMap::new();
        for (position, node) in nodes.iter().enumerate() {
            if positions.insert(node.tag, position).is_some() {
                return Err(SelectionError::DuplicateNode(node.tag));
            }
        }
        Ok(Self { nodes, positions })
    }

    /// The node `tag` in the document, or `None` if the document does not list it.
    pub(crate) fn node(&self, tag: u32) -> Option<&SelectableNode> {
        self.positions
            .get(&tag)
            .map(|position| &self.nodes[*position])
    }

    /// The nodes a selection may start, end and extend in, in document order.
    pub(crate) fn selectable_nodes(&self) -> impl Iterator<Item = &SelectableNode> {
        self.nodes.iter().filter(|node| node.selectable)
    }

    /// Where `left` is against `right` in reading order: by the place of their nodes in the document, then by offset. `None` if either
    /// node is not in the document.
    pub(crate) fn compare(
        &self,
        left: SelectionPoint,
        right: SelectionPoint,
    ) -> Option<std::cmp::Ordering> {
        let left_position = *self.positions.get(&left.tag)?;
        let right_position = *self.positions.get(&right.tag)?;
        Some((left_position, left.offset).cmp(&(right_position, right.offset)))
    }

    fn position(&self, tag: u32) -> Result<usize, SelectionError> {
        self.positions
            .get(&tag)
            .copied()
            .ok_or(SelectionError::UnknownNode(tag))
    }

    /// The document position of the node holding `point`, if `point` is a valid endpoint: a node in
    /// the document that is selectable, at an offset within its text.
    fn check_endpoint(&self, point: SelectionPoint) -> Result<usize, SelectionError> {
        let position = self.position(point.tag)?;
        let node = &self.nodes[position];
        if !node.selectable {
            return Err(SelectionError::NotSelectable(point.tag));
        }
        if point.offset > node.len {
            return Err(SelectionError::OffsetOutOfRange {
                tag: point.tag,
                offset: point.offset,
                len: node.len,
            });
        }
        Ok(position)
    }

    /// The tags of the selectable nodes from `first` to `last` (document positions), inclusive.
    fn covered(&self, first: usize, last: usize) -> BTreeSet<u32> {
        self.nodes[first..=last]
            .iter()
            .filter(|node| node.selectable)
            .map(|node| node.tag)
            .collect()
    }
}

/// The part of one node's text that is selected: code points `start..end`, never empty.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct NodeRange {
    pub(crate) tag: u32,
    pub(crate) start: usize,
    pub(crate) end: usize,
}

/// The two endpoints and the nodes between them.
#[derive(Clone, Debug, PartialEq, Eq)]
struct Anchored {
    anchor: SelectionPoint,
    focus: SelectionPoint,
    /// The selectable nodes from the first endpoint's to the last's, inclusive: the nodes whose
    /// change invalidates the selection. Kept here so that a removed node, which is no longer in the
    /// document, can still be recognised.
    covered: BTreeSet<u32>,
}

/// The current selection, or none.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct TextSelection {
    state: Option<Anchored>,
}

impl TextSelection {
    pub(crate) fn anchor(&self) -> Option<SelectionPoint> {
        self.state.as_ref().map(|state| state.anchor)
    }

    pub(crate) fn focus(&self) -> Option<SelectionPoint> {
        self.state.as_ref().map(|state| state.focus)
    }

    /// Whether there is a selection at all, collapsed or not.
    pub(crate) fn is_active(&self) -> bool {
        self.state.is_some()
    }

    /// Whether there is a selection and its anchor and focus are the same point.
    pub(crate) fn is_collapsed(&self) -> bool {
        self.state
            .as_ref()
            .is_some_and(|state| state.anchor == state.focus)
    }

    /// Whether `tag` is one of the selectable nodes from the first endpoint's to the last's.
    pub(crate) fn covers(&self, tag: u32) -> bool {
        self.state
            .as_ref()
            .is_some_and(|state| state.covered.contains(&tag))
    }

    /// Set the anchor and the focus. Both must be valid endpoints of `document`.
    pub(crate) fn select(
        &mut self,
        document: &Document,
        anchor: SelectionPoint,
        focus: SelectionPoint,
    ) -> Result<bool, SelectionError> {
        let anchor_position = document.check_endpoint(anchor)?;
        let focus_position = document.check_endpoint(focus)?;
        let covered = document.covered(
            anchor_position.min(focus_position),
            anchor_position.max(focus_position),
        );
        let changed = self.anchor() != Some(anchor) || self.focus() != Some(focus);
        self.state = Some(Anchored {
            anchor,
            focus,
            covered,
        });
        Ok(changed)
    }

    /// A click: a collapsed selection at `point`.
    pub(crate) fn collapse(
        &mut self,
        document: &Document,
        point: SelectionPoint,
    ) -> Result<bool, SelectionError> {
        self.select(document, point, point)
    }

    /// A drag or Shift+click: move the focus to `point`, keeping the anchor. With no selection this
    /// collapses at `point`.
    pub(crate) fn extend(
        &mut self,
        document: &Document,
        point: SelectionPoint,
    ) -> Result<bool, SelectionError> {
        let anchor = self.anchor().unwrap_or(point);
        self.select(document, anchor, point)
    }

    /// A double click: select the word at `point`, anchor at its start and focus at its end.
    pub(crate) fn select_word(
        &mut self,
        document: &Document,
        point: SelectionPoint,
        words: &impl WordRanges,
    ) -> Result<bool, SelectionError> {
        let position = document.check_endpoint(point)?;
        let len = document.nodes[position].len;
        let (start, end) = words.word_range(point.tag, point.offset);
        if start > point.offset || point.offset > end || end > len {
            return Err(SelectionError::InvalidWordRange {
                tag: point.tag,
                offset: point.offset,
                start,
                end,
            });
        }
        self.select(
            document,
            SelectionPoint {
                tag: point.tag,
                offset: start,
            },
            SelectionPoint {
                tag: point.tag,
                offset: end,
            },
        )
    }

    /// A triple click: select the whole text of node `tag`.
    pub(crate) fn select_node(
        &mut self,
        document: &Document,
        tag: u32,
    ) -> Result<bool, SelectionError> {
        let position = document.position(tag)?;
        let node = document.nodes[position];
        self.select(
            document,
            SelectionPoint { tag, offset: 0 },
            SelectionPoint {
                tag,
                offset: node.len,
            },
        )
    }

    /// Select all selectable text: from the start of the first selectable node to the end of the last.
    /// A document with no selectable node has nothing to select, so this clears.
    pub(crate) fn select_all(&mut self, document: &Document) -> Result<bool, SelectionError> {
        let mut selectable = document.nodes.iter().filter(|node| node.selectable);
        let Some(first) = selectable.next() else {
            return Ok(self.clear());
        };
        let last = selectable.next_back().unwrap_or(first);
        self.select(
            document,
            SelectionPoint {
                tag: first.tag,
                offset: 0,
            },
            SelectionPoint {
                tag: last.tag,
                offset: last.len,
            },
        )
    }

    /// Drop the selection. Returns whether there was one.
    pub(crate) fn clear(&mut self) -> bool {
        self.state.take().is_some()
    }

    /// A node's text changed, or the node was removed. Clears the selection if the node was inside
    /// it; returns whether it did.
    pub(crate) fn node_changed(&mut self, tag: u32) -> bool {
        if self.covers(tag) {
            self.clear()
        } else {
            false
        }
    }

    /// Check the selection against `document` and clear it if it no longer describes the same
    /// nodes: an endpoint is missing, no longer selectable or past the end of its text, or the
    /// selectable nodes between the endpoints are not the ones recorded. Returns whether it cleared.
    pub(crate) fn clear_if_stale(&mut self, document: &Document) -> bool {
        let Some(state) = &self.state else {
            return false;
        };
        let fresh = match (
            document.check_endpoint(state.anchor),
            document.check_endpoint(state.focus),
        ) {
            (Ok(anchor), Ok(focus)) => {
                document.covered(anchor.min(focus), anchor.max(focus)) == state.covered
            }
            (Err(_), _) | (_, Err(_)) => false,
        };
        if fresh { false } else { self.clear() }
    }

    /// The endpoints in document order with their document positions, `(first, last)`.
    fn ordered(
        &self,
        document: &Document,
    ) -> Result<Option<[(usize, SelectionPoint); 2]>, SelectionError> {
        let Some(state) = &self.state else {
            return Ok(None);
        };
        let mut ends = [
            (document.check_endpoint(state.anchor)?, state.anchor),
            (document.check_endpoint(state.focus)?, state.focus),
        ];
        ends.sort_by_key(|(position, point)| (*position, point.offset));
        Ok(Some(ends))
    }

    /// The selected part of each selectable node, in document order, skipping nodes that are not
    /// selectable and ranges with no characters. Empty for no selection and for a collapsed one.
    /// Fails if an endpoint is no longer valid in `document` (the caller should have cleared the
    /// selection when the node changed).
    pub(crate) fn ranges(&self, document: &Document) -> Result<Vec<NodeRange>, SelectionError> {
        let Some([(first, start), (last, end)]) = self.ordered(document)? else {
            return Ok(Vec::new());
        };
        Ok(document
            .nodes
            .iter()
            .enumerate()
            .take(last + 1)
            .skip(first)
            .filter(|(_, node)| node.selectable)
            .filter_map(|(position, node)| {
                let range_start = if position == first { start.offset } else { 0 };
                let range_end = if position == last {
                    end.offset
                } else {
                    node.len
                };
                (range_start < range_end).then_some(NodeRange {
                    tag: node.tag,
                    start: range_start,
                    end: range_end,
                })
            })
            .collect())
    }

    /// The text to copy: each range's characters, ranges joined by `\n`. `text_of` returns a node's
    /// text, which must be the text the `document` lengths were taken from.
    pub(crate) fn selected_text<'a>(
        &self,
        document: &Document,
        text_of: impl Fn(u32) -> Option<&'a str>,
    ) -> Result<String, SelectionError> {
        let mut pieces = Vec::new();
        for range in self.ranges(document)? {
            let text = text_of(range.tag).ok_or(SelectionError::MissingText(range.tag))?;
            let piece: String = text
                .chars()
                .skip(range.start)
                .take(range.end - range.start)
                .collect();
            let available = text.chars().count();
            if available < range.end {
                return Err(SelectionError::TextTooShort {
                    tag: range.tag,
                    end: range.end,
                    len: available,
                });
            }
            pieces.push(piece);
        }
        Ok(pieces.join("\n"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ALPHA: u32 = 1;
    /// `userSelect: none`.
    const BETA: u32 = 2;
    const GAMMA: u32 = 3;
    const DELTA: u32 = 4;
    const UNKNOWN: u32 = 99;

    const ALPHA_TEXT: &str = "alpha one";
    const BETA_TEXT: &str = "beta";
    const GAMMA_TEXT: &str = "gamma two";
    const DELTA_TEXT: &str = "delta";

    fn node(tag: u32, text: &str, selectable: bool) -> SelectableNode {
        SelectableNode {
            tag,
            len: text.chars().count(),
            selectable,
        }
    }

    /// alpha, beta (not selectable), gamma, delta.
    fn document() -> Document {
        Document::new(vec![
            node(ALPHA, ALPHA_TEXT, true),
            node(BETA, BETA_TEXT, false),
            node(GAMMA, GAMMA_TEXT, true),
            node(DELTA, DELTA_TEXT, true),
        ])
        .expect("the fixture has distinct tags")
    }

    #[test]
    fn points_compare_by_their_node_in_the_document_then_by_offset() {
        let point = |tag, offset| SelectionPoint { tag, offset };
        let document = document();
        assert_eq!(
            document.compare(point(ALPHA, 9), point(GAMMA, 0)),
            Some(std::cmp::Ordering::Less)
        );
        assert_eq!(
            document.compare(point(DELTA, 0), point(ALPHA, 5)),
            Some(std::cmp::Ordering::Greater)
        );
        assert_eq!(
            document.compare(point(GAMMA, 2), point(GAMMA, 2)),
            Some(std::cmp::Ordering::Equal)
        );
        assert_eq!(
            document.compare(point(GAMMA, 2), point(GAMMA, 3)),
            Some(std::cmp::Ordering::Less)
        );
        assert_eq!(document.compare(point(UNKNOWN, 0), point(GAMMA, 0)), None);
    }

    fn text_of(tag: u32) -> Option<&'static str> {
        match tag {
            ALPHA => Some(ALPHA_TEXT),
            BETA => Some(BETA_TEXT),
            GAMMA => Some(GAMMA_TEXT),
            DELTA => Some(DELTA_TEXT),
            _ => None,
        }
    }

    fn at(tag: u32, offset: usize) -> SelectionPoint {
        SelectionPoint { tag, offset }
    }

    fn range(tag: u32, start: usize, end: usize) -> NodeRange {
        NodeRange { tag, start, end }
    }

    /// Words are runs of non-space characters and gaps are runs of space; the run is the one of the
    /// character at `offset` (the one before it at the end of the text).
    fn words(tag: u32, offset: usize) -> (usize, usize) {
        let characters: Vec<char> = text_of(tag).unwrap_or_default().chars().collect();
        let is_word = |index: usize| {
            characters
                .get(index)
                .is_some_and(|character| !character.is_whitespace())
        };
        let probe = if offset < characters.len() {
            offset
        } else {
            offset.saturating_sub(1)
        };
        let word_run = is_word(probe);
        let mut start = offset;
        while start > 0 && is_word(start - 1) == word_run {
            start -= 1;
        }
        let mut end = offset;
        while end < characters.len() && is_word(end) == word_run {
            end += 1;
        }
        (start, end)
    }

    #[test]
    fn a_document_rejects_a_repeated_tag() {
        let result = Document::new(vec![
            node(ALPHA, ALPHA_TEXT, true),
            node(ALPHA, ALPHA_TEXT, true),
        ]);
        assert_eq!(result.unwrap_err(), SelectionError::DuplicateNode(ALPHA));
    }

    #[test]
    fn a_document_answers_for_its_nodes_and_lists_the_selectable_ones_in_order() {
        let document = document();
        assert_eq!(document.node(BETA), Some(&node(BETA, BETA_TEXT, false)));
        assert_eq!(document.node(UNKNOWN), None);
        let selectable: Vec<u32> = document.selectable_nodes().map(|node| node.tag).collect();
        assert_eq!(selectable, vec![ALPHA, GAMMA, DELTA]);
    }

    #[test]
    fn a_new_selection_is_inactive() {
        let selection = TextSelection::default();
        assert!(!selection.is_active());
        assert!(!selection.is_collapsed());
        assert_eq!(selection.anchor(), None);
        assert_eq!(selection.focus(), None);
        assert!(!selection.covers(ALPHA));
        assert_eq!(selection.ranges(&document()), Ok(Vec::new()));
        assert_eq!(
            selection.selected_text(&document(), text_of),
            Ok(String::new())
        );
    }

    #[test]
    fn collapse_sets_both_endpoints_and_reports_the_change_once() {
        let document = document();
        let mut selection = TextSelection::default();
        assert_eq!(selection.collapse(&document, at(ALPHA, 3)), Ok(true));
        assert_eq!(selection.anchor(), Some(at(ALPHA, 3)));
        assert_eq!(selection.focus(), Some(at(ALPHA, 3)));
        assert!(selection.is_active() && selection.is_collapsed());
        assert!(selection.covers(ALPHA));
        assert!(!selection.covers(GAMMA));
        // The same click again changes nothing, so no `selectionchange`.
        assert_eq!(selection.collapse(&document, at(ALPHA, 3)), Ok(false));
        assert_eq!(selection.collapse(&document, at(ALPHA, 4)), Ok(true));
        // A collapsed caret has nothing to paint or copy.
        assert_eq!(selection.ranges(&document), Ok(Vec::new()));
    }

    #[test]
    fn collapse_accepts_the_start_and_the_end_of_a_node() {
        let document = document();
        let mut selection = TextSelection::default();
        assert_eq!(selection.collapse(&document, at(ALPHA, 0)), Ok(true));
        assert_eq!(selection.collapse(&document, at(ALPHA, 9)), Ok(true));
    }

    #[test]
    fn extend_keeps_the_anchor_and_moves_the_focus_within_a_node() {
        let document = document();
        let mut selection = TextSelection::default();
        selection.collapse(&document, at(ALPHA, 2)).unwrap();
        assert_eq!(selection.extend(&document, at(ALPHA, 6)), Ok(true));
        assert_eq!(selection.anchor(), Some(at(ALPHA, 2)));
        assert_eq!(selection.focus(), Some(at(ALPHA, 6)));
        assert!(!selection.is_collapsed());
        assert_eq!(selection.ranges(&document), Ok(vec![range(ALPHA, 2, 6)]));
        assert_eq!(
            selection.selected_text(&document, text_of),
            Ok("pha ".to_string())
        );
        // Dragging back past the anchor reverses the range; the anchor still does not move.
        assert_eq!(selection.extend(&document, at(ALPHA, 0)), Ok(true));
        assert_eq!(selection.anchor(), Some(at(ALPHA, 2)));
        assert_eq!(selection.ranges(&document), Ok(vec![range(ALPHA, 0, 2)]));
        // Extending to where the focus already is changes nothing.
        assert_eq!(selection.extend(&document, at(ALPHA, 0)), Ok(false));
    }

    #[test]
    fn extend_with_no_selection_collapses_at_the_point() {
        let document = document();
        let mut selection = TextSelection::default();
        assert_eq!(selection.extend(&document, at(GAMMA, 4)), Ok(true));
        assert_eq!(selection.anchor(), Some(at(GAMMA, 4)));
        assert_eq!(selection.focus(), Some(at(GAMMA, 4)));
    }

    #[test]
    fn a_forward_range_across_nodes_skips_the_node_that_is_not_selectable() {
        let document = document();
        let mut selection = TextSelection::default();
        selection.collapse(&document, at(ALPHA, 6)).unwrap();
        selection.extend(&document, at(GAMMA, 5)).unwrap();
        assert_eq!(
            selection.ranges(&document),
            Ok(vec![range(ALPHA, 6, 9), range(GAMMA, 0, 5)])
        );
        // Beta is between the endpoints, but covered only counts nodes that contribute.
        assert!(selection.covers(ALPHA) && selection.covers(GAMMA));
        assert!(!selection.covers(BETA) && !selection.covers(DELTA));
        assert_eq!(
            selection.selected_text(&document, text_of),
            Ok("one\ngamma".to_string())
        );
    }

    #[test]
    fn a_backward_range_gives_the_same_ranges_in_document_order() {
        let document = document();
        let mut selection = TextSelection::default();
        selection.collapse(&document, at(DELTA, 2)).unwrap();
        selection.extend(&document, at(ALPHA, 6)).unwrap();
        assert_eq!(selection.anchor(), Some(at(DELTA, 2)));
        assert_eq!(selection.focus(), Some(at(ALPHA, 6)));
        assert_eq!(
            selection.ranges(&document),
            Ok(vec![
                range(ALPHA, 6, 9),
                range(GAMMA, 0, 9),
                range(DELTA, 0, 2)
            ])
        );
        assert_eq!(
            selection.selected_text(&document, text_of),
            Ok("one\ngamma two\nde".to_string())
        );
    }

    #[test]
    fn empty_edge_ranges_are_left_out() {
        let document = document();
        let mut selection = TextSelection::default();
        // From the very end of alpha to the very start of gamma: no character is selected.
        selection.collapse(&document, at(ALPHA, 9)).unwrap();
        selection.extend(&document, at(GAMMA, 0)).unwrap();
        assert_eq!(selection.ranges(&document), Ok(Vec::new()));
        assert!(!selection.is_collapsed());
        // Into gamma by two characters: only the real part is returned.
        selection.extend(&document, at(GAMMA, 2)).unwrap();
        assert_eq!(selection.ranges(&document), Ok(vec![range(GAMMA, 0, 2)]));
    }

    #[test]
    fn a_node_with_no_text_contributes_no_range_but_is_covered() {
        let document = Document::new(vec![
            node(ALPHA, ALPHA_TEXT, true),
            node(BETA, "", true),
            node(GAMMA, GAMMA_TEXT, true),
        ])
        .unwrap();
        let mut selection = TextSelection::default();
        selection
            .select(&document, at(ALPHA, 0), at(GAMMA, 9))
            .unwrap();
        assert_eq!(
            selection.ranges(&document),
            Ok(vec![range(ALPHA, 0, 9), range(GAMMA, 0, 9)])
        );
        assert!(selection.covers(BETA));
    }

    #[test]
    fn select_word_uses_the_injected_bounds() {
        let document = document();
        let mut selection = TextSelection::default();
        // "alpha one": a double click in "one" (offset 7).
        assert_eq!(
            selection.select_word(&document, at(ALPHA, 7), &words),
            Ok(true)
        );
        assert_eq!(selection.anchor(), Some(at(ALPHA, 6)));
        assert_eq!(selection.focus(), Some(at(ALPHA, 9)));
        assert_eq!(
            selection.selected_text(&document, text_of),
            Ok("one".to_string())
        );
        // The bounds can come from a closure.
        let first_three = |_: u32, _: usize| (0, 3);
        assert_eq!(
            selection.select_word(&document, at(ALPHA, 1), &first_three),
            Ok(true)
        );
        assert_eq!(selection.ranges(&document), Ok(vec![range(ALPHA, 0, 3)]));
    }

    #[test]
    fn select_word_in_a_gap_selects_the_gap() {
        let document = document();
        let mut selection = TextSelection::default();
        selection
            .select_word(&document, at(ALPHA, 5), &words)
            .unwrap();
        assert_eq!(selection.ranges(&document), Ok(vec![range(ALPHA, 5, 6)]));
    }

    #[test]
    fn select_word_rejects_bounds_that_do_not_contain_the_point() {
        let document = document();
        let mut selection = TextSelection::default();
        selection.collapse(&document, at(DELTA, 1)).unwrap();
        let before = selection.clone();
        let wrong_side = |_: u32, _: usize| (5, 7);
        assert_eq!(
            selection.select_word(&document, at(ALPHA, 2), &wrong_side),
            Err(SelectionError::InvalidWordRange {
                tag: ALPHA,
                offset: 2,
                start: 5,
                end: 7
            })
        );
        let past_the_end = |_: u32, _: usize| (0, 10);
        assert_eq!(
            selection.select_word(&document, at(ALPHA, 2), &past_the_end),
            Err(SelectionError::InvalidWordRange {
                tag: ALPHA,
                offset: 2,
                start: 0,
                end: 10
            })
        );
        assert_eq!(selection, before, "a rejected word select changes nothing");
    }

    #[test]
    fn select_node_selects_the_whole_text() {
        let document = document();
        let mut selection = TextSelection::default();
        assert_eq!(selection.select_node(&document, GAMMA), Ok(true));
        assert_eq!(selection.anchor(), Some(at(GAMMA, 0)));
        assert_eq!(selection.focus(), Some(at(GAMMA, 9)));
        assert_eq!(selection.ranges(&document), Ok(vec![range(GAMMA, 0, 9)]));
        assert_eq!(selection.select_node(&document, GAMMA), Ok(false));
        assert_eq!(
            selection.select_node(&document, BETA),
            Err(SelectionError::NotSelectable(BETA))
        );
        assert_eq!(
            selection.select_node(&document, UNKNOWN),
            Err(SelectionError::UnknownNode(UNKNOWN))
        );
    }

    #[test]
    fn select_all_runs_from_the_first_selectable_node_to_the_last() {
        let document = document();
        let mut selection = TextSelection::default();
        assert_eq!(selection.select_all(&document), Ok(true));
        assert_eq!(selection.anchor(), Some(at(ALPHA, 0)));
        assert_eq!(selection.focus(), Some(at(DELTA, 5)));
        assert_eq!(
            selection.ranges(&document),
            Ok(vec![
                range(ALPHA, 0, 9),
                range(GAMMA, 0, 9),
                range(DELTA, 0, 5)
            ])
        );
        assert_eq!(
            selection.selected_text(&document, text_of),
            Ok("alpha one\ngamma two\ndelta".to_string())
        );
    }

    #[test]
    fn select_all_skips_unselectable_nodes_at_both_ends() {
        let document = Document::new(vec![
            node(BETA, BETA_TEXT, false),
            node(GAMMA, GAMMA_TEXT, true),
            node(DELTA, DELTA_TEXT, false),
        ])
        .unwrap();
        let mut selection = TextSelection::default();
        selection.select_all(&document).unwrap();
        assert_eq!(selection.anchor(), Some(at(GAMMA, 0)));
        assert_eq!(selection.focus(), Some(at(GAMMA, 9)));
    }

    #[test]
    fn select_all_with_one_selectable_node_selects_it() {
        let document = Document::new(vec![node(GAMMA, GAMMA_TEXT, true)]).unwrap();
        let mut selection = TextSelection::default();
        assert_eq!(selection.select_all(&document), Ok(true));
        assert_eq!(selection.ranges(&document), Ok(vec![range(GAMMA, 0, 9)]));
    }

    #[test]
    fn select_all_with_nothing_selectable_clears() {
        let document = Document::new(vec![node(BETA, BETA_TEXT, false)]).unwrap();
        let mut selection = TextSelection::default();
        assert_eq!(selection.select_all(&document), Ok(false));
        assert!(!selection.is_active());

        let full = self::document();
        selection.collapse(&full, at(ALPHA, 1)).unwrap();
        assert_eq!(selection.select_all(&document), Ok(true));
        assert!(!selection.is_active());
    }

    #[test]
    fn endpoints_are_validated_and_a_rejected_call_changes_nothing() {
        let document = document();
        let mut selection = TextSelection::default();
        selection.collapse(&document, at(ALPHA, 2)).unwrap();
        let before = selection.clone();

        assert_eq!(
            selection.collapse(&document, at(BETA, 0)),
            Err(SelectionError::NotSelectable(BETA))
        );
        assert_eq!(
            selection.extend(&document, at(UNKNOWN, 0)),
            Err(SelectionError::UnknownNode(UNKNOWN))
        );
        assert_eq!(
            selection.extend(&document, at(GAMMA, 10)),
            Err(SelectionError::OffsetOutOfRange {
                tag: GAMMA,
                offset: 10,
                len: 9
            })
        );
        assert_eq!(selection, before);
    }

    #[test]
    fn extend_fails_if_the_anchor_node_is_gone_from_the_document() {
        let mut selection = TextSelection::default();
        selection.collapse(&document(), at(ALPHA, 2)).unwrap();
        let without_alpha = Document::new(vec![node(GAMMA, GAMMA_TEXT, true)]).unwrap();
        assert_eq!(
            selection.extend(&without_alpha, at(GAMMA, 1)),
            Err(SelectionError::UnknownNode(ALPHA))
        );
        assert!(selection.is_active(), "the caller decides what to do");
    }

    #[test]
    fn clear_reports_whether_there_was_a_selection() {
        let document = document();
        let mut selection = TextSelection::default();
        assert!(!selection.clear());
        selection.collapse(&document, at(ALPHA, 1)).unwrap();
        assert!(selection.clear());
        assert!(!selection.is_active());
        assert!(!selection.clear());
    }

    #[test]
    fn a_text_change_in_a_covered_node_clears_the_selection() {
        let document = document();
        let mut selection = TextSelection::default();
        selection.collapse(&document, at(ALPHA, 6)).unwrap();
        selection.extend(&document, at(DELTA, 2)).unwrap();
        // Gamma is in the middle of the range.
        assert!(selection.node_changed(GAMMA));
        assert!(!selection.is_active());
    }

    #[test]
    fn a_change_to_an_endpoint_node_clears_the_selection() {
        let document = document();
        for endpoint in [ALPHA, DELTA] {
            let mut selection = TextSelection::default();
            selection.collapse(&document, at(ALPHA, 6)).unwrap();
            selection.extend(&document, at(DELTA, 2)).unwrap();
            assert!(selection.node_changed(endpoint));
            assert!(!selection.is_active());
        }
    }

    #[test]
    fn a_change_outside_the_range_or_to_a_skipped_node_keeps_the_selection() {
        let document = document();
        let mut selection = TextSelection::default();
        selection.collapse(&document, at(ALPHA, 6)).unwrap();
        selection.extend(&document, at(GAMMA, 2)).unwrap();
        // Delta is after the range; beta is inside it but skipped (not selectable); 99 is unknown.
        assert!(!selection.node_changed(DELTA));
        assert!(!selection.node_changed(BETA));
        assert!(!selection.node_changed(UNKNOWN));
        assert!(selection.is_active());
    }

    #[test]
    fn a_removed_node_clears_a_selection_that_covered_it() {
        // The removed node is no longer in any document: the selection remembers it.
        let document = document();
        let mut selection = TextSelection::default();
        selection
            .select(&document, at(ALPHA, 0), at(DELTA, 5))
            .unwrap();
        assert!(selection.node_changed(GAMMA));
        assert!(!selection.is_active());
    }

    #[test]
    fn a_change_to_the_node_of_a_collapsed_caret_clears_it() {
        let document = document();
        let mut selection = TextSelection::default();
        selection.collapse(&document, at(GAMMA, 4)).unwrap();
        assert!(!selection.node_changed(ALPHA));
        assert!(selection.node_changed(GAMMA));
        assert!(!selection.is_active());
    }

    #[test]
    fn clear_if_stale_keeps_a_selection_the_document_still_describes() {
        let document = document();
        let mut selection = TextSelection::default();
        selection
            .select(&document, at(ALPHA, 2), at(DELTA, 2))
            .unwrap();
        assert!(!selection.clear_if_stale(&document));
        assert!(selection.is_active());
        assert!(!TextSelection::default().clear_if_stale(&document));
    }

    #[test]
    fn clear_if_stale_clears_after_a_node_is_inserted_into_the_range() {
        let mut selection = TextSelection::default();
        selection
            .select(&document(), at(ALPHA, 2), at(DELTA, 2))
            .unwrap();
        let with_new_node = Document::new(vec![
            node(ALPHA, ALPHA_TEXT, true),
            node(BETA, BETA_TEXT, false),
            node(5, "inserted", true),
            node(GAMMA, GAMMA_TEXT, true),
            node(DELTA, DELTA_TEXT, true),
        ])
        .unwrap();
        assert!(selection.clear_if_stale(&with_new_node));
        assert!(!selection.is_active());
    }

    #[test]
    fn clear_if_stale_clears_when_an_endpoint_is_missing_or_out_of_range() {
        let mut selection = TextSelection::default();
        selection.collapse(&document(), at(ALPHA, 9)).unwrap();
        let shorter = Document::new(vec![node(ALPHA, "alpha", true)]).unwrap();
        assert!(selection.clear_if_stale(&shorter));

        selection.collapse(&document(), at(ALPHA, 2)).unwrap();
        let gone = Document::new(vec![node(GAMMA, GAMMA_TEXT, true)]).unwrap();
        assert!(selection.clear_if_stale(&gone));

        selection.collapse(&document(), at(ALPHA, 2)).unwrap();
        let hidden = Document::new(vec![node(ALPHA, ALPHA_TEXT, false)]).unwrap();
        assert!(selection.clear_if_stale(&hidden));
    }

    #[test]
    fn ranges_fail_if_an_endpoint_is_stale_in_the_document() {
        let mut selection = TextSelection::default();
        selection.collapse(&document(), at(ALPHA, 2)).unwrap();
        let gone = Document::new(vec![node(GAMMA, GAMMA_TEXT, true)]).unwrap();
        assert_eq!(
            selection.ranges(&gone),
            Err(SelectionError::UnknownNode(ALPHA))
        );
    }

    #[test]
    fn selected_text_counts_code_points_not_utf16_units() {
        let text = "a\u{1F600}b";
        let document = Document::new(vec![node(ALPHA, text, true)]).unwrap();
        let mut selection = TextSelection::default();
        selection
            .select(&document, at(ALPHA, 1), at(ALPHA, 2))
            .unwrap();
        assert_eq!(
            selection.selected_text(&document, |_| Some(text)),
            Ok("\u{1F600}".to_string())
        );
    }

    #[test]
    fn selected_text_reports_missing_and_short_text() {
        let document = document();
        let mut selection = TextSelection::default();
        selection
            .select(&document, at(ALPHA, 0), at(GAMMA, 3))
            .unwrap();
        assert_eq!(
            selection.selected_text(&document, |tag| (tag == ALPHA).then_some(ALPHA_TEXT)),
            Err(SelectionError::MissingText(GAMMA))
        );
        assert_eq!(
            selection.selected_text(&document, |tag| match tag {
                ALPHA => Some("alp"),
                GAMMA => Some(GAMMA_TEXT),
                _ => None,
            }),
            Err(SelectionError::TextTooShort {
                tag: ALPHA,
                end: 9,
                len: 3
            })
        );
    }

    #[test]
    fn errors_display_the_tag() {
        assert!(SelectionError::UnknownNode(7).to_string().contains('7'));
        assert!(SelectionError::NotSelectable(8).to_string().contains('8'));
        assert!(SelectionError::DuplicateNode(9).to_string().contains('9'));
        assert!(
            SelectionError::OffsetOutOfRange {
                tag: 3,
                offset: 12,
                len: 4
            }
            .to_string()
            .contains("12")
        );
        assert!(SelectionError::MissingText(5).to_string().contains('5'));
        assert!(
            SelectionError::TextTooShort {
                tag: 6,
                end: 14,
                len: 2
            }
            .to_string()
            .contains("14")
        );
        assert!(
            SelectionError::InvalidWordRange {
                tag: 1,
                offset: 2,
                start: 30,
                end: 31
            }
            .to_string()
            .contains("30")
        );
    }
}
