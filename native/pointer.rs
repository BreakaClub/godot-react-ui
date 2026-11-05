//! Pointer-to-button activation rules and the Godot-to-DOM pointer button mappings.
use godot::global::MouseButtonMask;
use godot::obj::EngineBitfield;

use crate::props::Kind;

/// Chrome reports the mouse as pointer 1. Pointer 0 is reserved for synthetic keyboard activation,
/// as in browsers.
pub(crate) const MOUSE_POINTER_ID: u32 = 1;
pub(crate) const KEYBOARD_POINTER_ID: u32 = 0;
/// DOM `PointerEvent.button`: the primary button, or -1 for events that are not a button change.
pub(crate) const DOM_BUTTON_PRIMARY: i8 = 0;
pub(crate) const DOM_BUTTON_NONE: i8 = -1;

/// DOM `PointerEvent.buttons` bits (UI Events spec): 1 primary, 2 secondary, 4 auxiliary,
/// 8 back, 16 forward.
pub(crate) const DOM_BUTTONS_PRIMARY: u16 = 1;
const DOM_BUTTONS_SECONDARY: u16 = 2;
const DOM_BUTTONS_AUXILIARY: u16 = 4;
const DOM_BUTTONS_BACK: u16 = 8;
const DOM_BUTTONS_FORWARD: u16 = 16;

/// Map Godot's button mask to the DOM `buttons` bitmask. The two agree for left/right/middle (1, 2, 4)
/// but not for the extra buttons (Godot 128 and 256, DOM 8 and 16), so every bit is mapped explicitly.
pub(crate) fn dom_buttons(mask: MouseButtonMask) -> u16 {
    let bits = mask.ord();
    [
        (MouseButtonMask::LEFT, DOM_BUTTONS_PRIMARY),
        (MouseButtonMask::RIGHT, DOM_BUTTONS_SECONDARY),
        (MouseButtonMask::MIDDLE, DOM_BUTTONS_AUXILIARY),
        (MouseButtonMask::MB_XBUTTON1, DOM_BUTTONS_BACK),
        (MouseButtonMask::MB_XBUTTON2, DOM_BUTTONS_FORWARD),
    ]
    .into_iter()
    .filter(|(godot, _)| bits & godot.ord() != 0)
    .fold(0, |buttons, (_, dom)| buttons | dom)
}

/// What the pointer-to-button activation rules need to know about the mounted tree.
pub(crate) trait ButtonTree {
    fn kind_of(&self, tag: u32) -> Option<Kind>;
    /// The parent element, or `None` for a layer's top-level node (or an unmounted tag).
    fn parent_of(&self, tag: u32) -> Option<u32>;
    /// Whether the node itself has the `disabled` prop.
    fn disabled_prop(&self, tag: u32) -> bool;
}

/// Find the nearest button while checking the whole ancestor chain for disabling. Pointer IDs refer
/// to the actual painted leaf; button activation has its own owner. `None` for an unmounted tag.
pub(crate) fn enabled_button_ancestor<T: ButtonTree>(tree: &T, tag: u32) -> Option<u32> {
    tree.kind_of(tag)?;
    let mut button = None;
    let mut current = Some(tag);
    while let Some(node) = current {
        if tree.disabled_prop(node) {
            return None;
        }
        if button.is_none() && tree.kind_of(node) == Some(Kind::Button) {
            button = Some(node);
        }
        current = tree.parent_of(node);
    }
    button
}

pub(crate) fn shared_button_target<T: ButtonTree>(
    tree: &T,
    pressed: u32,
    released: u32,
) -> Option<u32> {
    let button = enabled_button_ancestor(tree, pressed)?;
    (enabled_button_ancestor(tree, released) == Some(button)).then_some(button)
}

#[cfg(test)]
mod input_tests {
    use super::*;
    use std::collections::BTreeMap;

    struct TestNode {
        kind: Kind,
        parent: Option<u32>,
        disabled: bool,
    }

    struct TestTree(BTreeMap<u32, TestNode>);

    impl ButtonTree for TestTree {
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

    /// 1 button > (2 text, 3 view > 4 text); 5 button > 6 text; 7 view.
    fn buttons() -> TestTree {
        let node = |kind, parent| TestNode {
            kind,
            parent,
            disabled: false,
        };
        TestTree(BTreeMap::from([
            (1, node(Kind::Button, None)),
            (2, node(Kind::Text, Some(1))),
            (3, node(Kind::View, Some(1))),
            (4, node(Kind::Text, Some(3))),
            (5, node(Kind::Button, None)),
            (6, node(Kind::Text, Some(5))),
            (7, node(Kind::View, None)),
        ]))
    }

    #[test]
    fn godot_button_masks_map_to_dom_buttons() {
        assert_eq!(dom_buttons(MouseButtonMask::default()), 0);
        assert_eq!(dom_buttons(MouseButtonMask::LEFT), 1);
        assert_eq!(dom_buttons(MouseButtonMask::RIGHT), 2);
        assert_eq!(dom_buttons(MouseButtonMask::MIDDLE), 4);
        assert_eq!(dom_buttons(MouseButtonMask::MB_XBUTTON1), 8);
        assert_eq!(dom_buttons(MouseButtonMask::MB_XBUTTON2), 16);
        let chord = MouseButtonMask::LEFT | MouseButtonMask::MIDDLE | MouseButtonMask::MB_XBUTTON2;
        assert_eq!(dom_buttons(chord), 1 | 4 | 16);
    }

    #[test]
    fn padding_and_descendants_activate_their_shared_button() {
        let tree = buttons();
        assert_eq!(shared_button_target(&tree, 1, 2), Some(1));
        assert_eq!(shared_button_target(&tree, 2, 1), Some(1));
        assert_eq!(shared_button_target(&tree, 2, 4), Some(1));
    }

    #[test]
    fn crossing_buttons_or_releasing_outside_does_not_activate() {
        let tree = buttons();
        assert_eq!(shared_button_target(&tree, 1, 5), None);
        assert_eq!(shared_button_target(&tree, 2, 6), None);
        assert_eq!(shared_button_target(&tree, 2, 7), None);
    }

    #[test]
    fn disabled_button_or_ancestor_cannot_activate() {
        let mut tree = buttons();
        tree.0.get_mut(&1).unwrap().disabled = true;
        assert_eq!(shared_button_target(&tree, 1, 2), None);
        tree.0.get_mut(&5).unwrap().parent = Some(7);
        tree.0.get_mut(&7).unwrap().disabled = true;
        assert_eq!(shared_button_target(&tree, 5, 6), None);
    }

    #[test]
    fn an_unmounted_tag_has_no_button() {
        let tree = buttons();
        assert_eq!(enabled_button_ancestor(&tree, 99), None);
        assert_eq!(shared_button_target(&tree, 1, 99), None);
    }
}
