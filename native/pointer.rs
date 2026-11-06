//! Pointer-to-button activation rules and the Godot-to-DOM pointer mappings (buttons, wheel,
//! cursor shapes).
use godot::classes::control::CursorShape;
use godot::global::{MouseButton, MouseButtonMask};
use godot::obj::EngineBitfield;

use crate::props::{CursorSpec, Kind};

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

/// The scroll a Godot wheel button reports as `(delta_x, delta_y)` in wheel ticks, with the DOM's
/// signs: down and right are positive (`ScrollContainer` scrolls by `+page / 8 * factor` for
/// `WHEEL_DOWN` and `WHEEL_RIGHT`, `scene/gui/scroll_container.cpp:190-226`). `None` for any other
/// button. `factor` is `InputEventMouseButton.factor`, 1 for a discrete wheel.
pub(crate) fn wheel_ticks(button: MouseButton, factor: f32) -> Option<(f32, f32)> {
    if button == MouseButton::WHEEL_UP {
        Some((0.0, -factor))
    } else if button == MouseButton::WHEEL_DOWN {
        Some((0.0, factor))
    } else if button == MouseButton::WHEEL_LEFT {
        Some((-factor, 0.0))
    } else if button == MouseButton::WHEEL_RIGHT {
        Some((factor, 0.0))
    } else {
        None
    }
}

/// Appendix A: the Godot cursor each CSS cursor maps to.
pub(crate) fn cursor_shape(cursor: CursorSpec) -> CursorShape {
    match cursor {
        CursorSpec::Default => CursorShape::ARROW,
        CursorSpec::Pointer => CursorShape::POINTING_HAND,
        CursorSpec::Text => CursorShape::IBEAM,
        CursorSpec::Move => CursorShape::MOVE,
        // Godot has one grabbing-hand cursor for both.
        CursorSpec::Grab | CursorSpec::Grabbing => CursorShape::DRAG,
        CursorSpec::NotAllowed => CursorShape::FORBIDDEN,
        CursorSpec::Crosshair => CursorShape::CROSS,
        CursorSpec::Wait => CursorShape::WAIT,
        CursorSpec::Progress => CursorShape::BUSY,
        CursorSpec::Help => CursorShape::HELP,
        CursorSpec::EwResize => CursorShape::HSIZE,
        CursorSpec::NsResize => CursorShape::VSIZE,
        CursorSpec::NeswResize => CursorShape::BDIAGSIZE,
        CursorSpec::NwseResize => CursorShape::FDIAGSIZE,
    }
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
    use godot::obj::EngineEnum;
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
    fn wheel_buttons_scroll_with_dom_signs_and_scale_by_factor() {
        assert_eq!(wheel_ticks(MouseButton::WHEEL_UP, 1.0), Some((0.0, -1.0)));
        assert_eq!(wheel_ticks(MouseButton::WHEEL_DOWN, 1.0), Some((0.0, 1.0)));
        assert_eq!(wheel_ticks(MouseButton::WHEEL_LEFT, 0.5), Some((-0.5, 0.0)));
        assert_eq!(wheel_ticks(MouseButton::WHEEL_RIGHT, 2.5), Some((2.5, 0.0)));
        assert_eq!(wheel_ticks(MouseButton::LEFT, 1.0), None);
        assert_eq!(wheel_ticks(MouseButton::RIGHT, 1.0), None);
    }

    #[test]
    fn every_css_cursor_maps_to_its_godot_cursor() {
        let expected = [
            (CursorSpec::Default, CursorShape::ARROW, 0),
            (CursorSpec::Pointer, CursorShape::POINTING_HAND, 2),
            (CursorSpec::Text, CursorShape::IBEAM, 1),
            (CursorSpec::Move, CursorShape::MOVE, 13),
            (CursorSpec::Grab, CursorShape::DRAG, 6),
            (CursorSpec::Grabbing, CursorShape::DRAG, 6),
            (CursorSpec::NotAllowed, CursorShape::FORBIDDEN, 8),
            (CursorSpec::Crosshair, CursorShape::CROSS, 3),
            (CursorSpec::Wait, CursorShape::WAIT, 4),
            (CursorSpec::Progress, CursorShape::BUSY, 5),
            (CursorSpec::Help, CursorShape::HELP, 16),
            (CursorSpec::EwResize, CursorShape::HSIZE, 10),
            (CursorSpec::NsResize, CursorShape::VSIZE, 9),
            (CursorSpec::NeswResize, CursorShape::BDIAGSIZE, 11),
            (CursorSpec::NwseResize, CursorShape::FDIAGSIZE, 12),
        ];
        for (css, godot, ordinal) in expected {
            // The ordinals are `Control.CursorShape` in the Godot docs; they pin the enum names to
            // the values GDExtension passes across the boundary.
            assert_eq!(cursor_shape(css), godot);
            assert_eq!(godot.ord(), ordinal, "{css:?}");
        }
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
