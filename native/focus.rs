//! Which elements can take focus and the order Tab visits them (plan section 3.13).
//!
//! Focusable: a `Button`, or any element with a `tabIndex` (`0` or `-1`), unless it or an ancestor
//! is disabled. Tabbable: focusable, and not `tabIndex` `-1`, and visible. Tab order is document
//! order (pre-order of the mounted tree), never paint order. Nothing here touches Godot; the mounting
//! layer implements [`FocusTree`] and says which elements are visible.

use crate::pointer::ButtonTree;
use crate::props::Kind;

/// How the user last gave input. A focus is a keyboard focus (`:focus-visible`, the focus ring) if
/// it came from Tab, or from `focus()` while the modality is `Keyboard`; a press makes it `Pointer`
/// and a (non-modifier) key makes it `Keyboard` again. It starts as `Keyboard`: before any pointer
/// input, programmatic focus such as `autoFocus` shows the ring, as in browsers.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Modality {
    Keyboard,
    Pointer,
}

/// What focus rules need to know about the mounted tree, beyond what button activation does.
pub(crate) trait FocusTree: ButtonTree {
    /// The element's `tabIndex` prop (`0` or `-1`), if it has one.
    fn tab_index_of(&self, tag: u32) -> Option<i32>;
}

/// Whether an element with no disabled ancestor could take focus: a button, or one with a `tabIndex`.
fn takes_focus<T: FocusTree>(tree: &T, tag: u32) -> bool {
    tree.kind_of(tag) == Some(Kind::Button) || tree.tab_index_of(tag).is_some()
}

/// `tag` itself or its nearest ancestor that can take focus, which is where a press focuses. `None`
/// if nothing in the chain can, or `tag` or any ancestor is disabled (a disabled subtree takes no
/// focus), or `tag` is not mounted.
pub(crate) fn nearest_focusable<T: FocusTree>(tree: &T, tag: u32) -> Option<u32> {
    tree.kind_of(tag)?;
    let mut found = None;
    let mut current = Some(tag);
    while let Some(node) = current {
        if tree.disabled_prop(node) {
            return None;
        }
        if found.is_none() && takes_focus(tree, node) {
            found = Some(node);
        }
        current = tree.parent_of(node);
    }
    found
}

/// Whether `tag` can be focused by `focus()`, a press or autoFocus.
pub(crate) fn is_focusable<T: FocusTree>(tree: &T, tag: u32) -> bool {
    nearest_focusable(tree, tag) == Some(tag)
}

/// Whether Tab stops on `tag`: focusable and not `tabIndex` `-1`. Visibility is the caller's.
pub(crate) fn is_tabbable<T: FocusTree>(tree: &T, tag: u32) -> bool {
    is_focusable(tree, tag) && tree.tab_index_of(tag) != Some(-1)
}

/// The tab stops among `document_order` for which `visible` holds, in document order.
pub(crate) fn tab_stops<T: FocusTree>(
    tree: &T,
    document_order: &[u32],
    visible: impl Fn(u32) -> bool,
) -> Vec<u32> {
    document_order
        .iter()
        .copied()
        .filter(|tag| is_tabbable(tree, *tag) && visible(*tag))
        .collect()
}

/// Where Tab (or Shift+Tab, `backwards`) goes from `current`: the next tab stop after it in
/// document order, wrapping past the last to the first (and the reverse). From nothing, or from an
/// element that is not in `document_order`, forward goes to the first stop and backward to the last.
/// `current` need not itself be a stop: a focused `tabIndex={-1}` element continues from its place.
pub(crate) fn next_tab_stop(
    document_order: &[u32],
    stops: &[u32],
    current: Option<u32>,
    backwards: bool,
) -> Option<u32> {
    let index_of = |tag: u32| {
        document_order
            .iter()
            .position(|candidate| *candidate == tag)
    };
    let from = current.and_then(index_of);
    let first = stops.first().copied();
    let last = stops.last().copied();
    match (from, backwards) {
        (None, false) => first,
        (None, true) => last,
        (Some(from), false) => stops
            .iter()
            .copied()
            .find(|stop| index_of(*stop).is_some_and(|index| index > from))
            .or(first),
        (Some(from), true) => stops
            .iter()
            .copied()
            .rev()
            .find(|stop| index_of(*stop).is_some_and(|index| index < from))
            .or(last),
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;

    struct Node {
        kind: Kind,
        parent: Option<u32>,
        disabled: bool,
        tab_index: Option<i32>,
    }

    struct Tree(BTreeMap<u32, Node>);

    impl ButtonTree for Tree {
        fn kind_of(&self, tag: u32) -> Option<Kind> {
            self.0.get(&tag).map(|node| node.kind)
        }
        fn parent_of(&self, tag: u32) -> Option<u32> {
            self.0.get(&tag).and_then(|node| node.parent)
        }
        fn disabled_prop(&self, tag: u32) -> bool {
            self.0.get(&tag).is_some_and(|node| node.disabled)
        }
    }

    impl FocusTree for Tree {
        fn tab_index_of(&self, tag: u32) -> Option<i32> {
            self.0.get(&tag).and_then(|node| node.tab_index)
        }
    }

    fn node(kind: Kind, parent: Option<u32>) -> Node {
        Node {
            kind,
            parent,
            disabled: false,
            tab_index: None,
        }
    }

    /// 1 view > (2 button, 3 view[tabIndex 0] > 4 text, 5 view[tabIndex -1], 6 button[disabled],
    /// 7 view[tabIndex 0, disabled] > 8 button, 9 button[tabIndex -1], 10 view); 11 button.
    fn tree() -> Tree {
        let mut nodes = BTreeMap::from([
            (1, node(Kind::View, None)),
            (2, node(Kind::Button, Some(1))),
            (3, node(Kind::View, Some(1))),
            (4, node(Kind::Text, Some(3))),
            (5, node(Kind::View, Some(1))),
            (6, node(Kind::Button, Some(1))),
            (7, node(Kind::View, Some(1))),
            (8, node(Kind::Button, Some(7))),
            (9, node(Kind::Button, Some(1))),
            (10, node(Kind::View, Some(1))),
            (11, node(Kind::Button, None)),
        ]);
        nodes.get_mut(&3).unwrap().tab_index = Some(0);
        nodes.get_mut(&5).unwrap().tab_index = Some(-1);
        nodes.get_mut(&6).unwrap().disabled = true;
        nodes.get_mut(&7).unwrap().tab_index = Some(0);
        nodes.get_mut(&7).unwrap().disabled = true;
        nodes.get_mut(&9).unwrap().tab_index = Some(-1);
        Tree(nodes)
    }

    const DOCUMENT_ORDER: [u32; 11] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    #[test]
    fn buttons_and_elements_with_a_tab_index_are_focusable_unless_disabled() {
        let tree = tree();
        for focusable in [2, 3, 5, 9, 11] {
            assert!(is_focusable(&tree, focusable), "{focusable}");
        }
        for not_focusable in [1, 4, 10] {
            assert!(
                !is_focusable(&tree, not_focusable),
                "{not_focusable} takes no focus"
            );
        }
        assert!(!is_focusable(&tree, 6), "a disabled button");
        assert!(
            !is_focusable(&tree, 7),
            "a disabled element with a tabIndex"
        );
        assert!(
            !is_focusable(&tree, 8),
            "a button inside a disabled element"
        );
        assert!(!is_focusable(&tree, 99), "an unmounted tag");
    }

    #[test]
    fn a_press_focuses_the_nearest_focusable_ancestor_or_self() {
        let tree = tree();
        assert_eq!(nearest_focusable(&tree, 2), Some(2));
        assert_eq!(
            nearest_focusable(&tree, 4),
            Some(3),
            "text inside a tabIndex element"
        );
        assert_eq!(nearest_focusable(&tree, 5), Some(5));
        assert_eq!(
            nearest_focusable(&tree, 10),
            None,
            "a plain element in a plain parent"
        );
        assert_eq!(nearest_focusable(&tree, 1), None);
        assert_eq!(
            nearest_focusable(&tree, 8),
            None,
            "a disabled ancestor takes the whole subtree out"
        );
        assert_eq!(nearest_focusable(&tree, 6), None);
        assert_eq!(nearest_focusable(&tree, 99), None);
    }

    #[test]
    fn tab_index_minus_one_is_focusable_but_not_tabbable() {
        let tree = tree();
        assert!(is_tabbable(&tree, 2));
        assert!(is_tabbable(&tree, 3));
        assert!(!is_tabbable(&tree, 5), "tabIndex -1 on a view");
        assert!(!is_tabbable(&tree, 9), "tabIndex -1 on a button");
        assert!(!is_tabbable(&tree, 6), "disabled");
    }

    #[test]
    fn tab_stops_are_in_document_order_and_skip_what_is_not_visible() {
        let tree = tree();
        assert_eq!(tab_stops(&tree, &DOCUMENT_ORDER, |_| true), vec![2, 3, 11]);
        assert_eq!(
            tab_stops(&tree, &DOCUMENT_ORDER, |tag| tag != 3),
            vec![2, 11],
            "an element that is not visible is not a stop"
        );
        // Document order, not any other: a reordered list gives the reordered stops.
        assert_eq!(tab_stops(&tree, &[11, 3, 2], |_| true), vec![11, 3, 2]);
    }

    #[test]
    fn tab_moves_forward_and_wraps_and_shift_tab_does_the_reverse() {
        let order = DOCUMENT_ORDER;
        let stops = [2, 3, 11];
        let forward = |current| next_tab_stop(&order, &stops, current, false);
        let backward = |current| next_tab_stop(&order, &stops, current, true);
        assert_eq!(forward(None), Some(2));
        assert_eq!(forward(Some(2)), Some(3));
        assert_eq!(forward(Some(3)), Some(11));
        assert_eq!(forward(Some(11)), Some(2), "wraps past the last");
        assert_eq!(backward(None), Some(11));
        assert_eq!(backward(Some(11)), Some(3));
        assert_eq!(backward(Some(3)), Some(2));
        assert_eq!(backward(Some(2)), Some(11), "wraps before the first");
    }

    #[test]
    fn tab_continues_from_the_place_of_an_element_that_is_not_a_stop() {
        let order = DOCUMENT_ORDER;
        let stops = [2, 3, 11];
        // 5 (tabIndex -1) sits between 3 and 11 in document order.
        assert_eq!(next_tab_stop(&order, &stops, Some(5), false), Some(11));
        assert_eq!(next_tab_stop(&order, &stops, Some(5), true), Some(3));
        // A focused element that left the tree has no place: start from an end.
        assert_eq!(next_tab_stop(&order, &stops, Some(99), false), Some(2));
        assert_eq!(next_tab_stop(&order, &stops, Some(99), true), Some(11));
    }

    #[test]
    fn a_lone_stop_wraps_to_itself_and_no_stops_goes_nowhere() {
        let order = DOCUMENT_ORDER;
        assert_eq!(next_tab_stop(&order, &[3], Some(3), false), Some(3));
        assert_eq!(next_tab_stop(&order, &[3], Some(3), true), Some(3));
        assert_eq!(next_tab_stop(&order, &[], Some(3), false), None);
        assert_eq!(next_tab_stop(&order, &[], None, true), None);
    }
}
