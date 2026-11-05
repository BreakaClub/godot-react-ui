//! Pointer-to-button activation rules and the Godot-to-DOM pointer button mappings.
use godot::global::MouseButtonMask;
use godot::obj::EngineBitfield;

use crate::protocol::{Kind, Model};

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

/// Find the nearest button while checking the whole ancestor chain for disabling.
/// Pointer IDs refer to the actual painted leaf; button activation has its own owner.
pub(crate) fn enabled_button_ancestor(model: &Model, mut id: u32) -> Option<u32> {
    let mut button = None;
    loop {
        let node = &model.nodes[&id];
        if node.style.disabled == Some(true) {
            return None;
        }
        if button.is_none() && node.kind == Kind::Button {
            button = Some(id);
        }
        match node.parent {
            Some(parent) => id = parent,
            None => return button,
        }
    }
}

pub(crate) fn shared_button_target(model: &Model, pressed: u32, released: u32) -> Option<u32> {
    let button = enabled_button_ancestor(model, pressed)?;
    (enabled_button_ancestor(model, released) == Some(button)).then_some(button)
}

#[cfg(test)]
mod input_tests {
    use super::*;
    use crate::protocol::Command;

    fn buttons() -> Model {
        let commands: Vec<Command> = serde_json::from_str(
            r#"[
            {"op":"create","id":1,"kind":"button"},
            {"op":"create","id":2,"kind":"text"},
            {"op":"create","id":3,"kind":"view"},
            {"op":"create","id":4,"kind":"text"},
            {"op":"create","id":5,"kind":"button"},
            {"op":"create","id":6,"kind":"text"},
            {"op":"create","id":7,"kind":"view"},
            {"op":"children","id":3,"children":[4]},
            {"op":"children","id":1,"children":[2,3]},
            {"op":"children","id":5,"children":[6]},
            {"op":"children","id":0,"children":[1,5,7]}
        ]"#,
        )
        .expect("valid input fixture");
        let mut model = Model::default();
        model.apply(&commands).expect("valid button hierarchy");
        model
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
        let model = buttons();
        assert_eq!(shared_button_target(&model, 1, 2), Some(1));
        assert_eq!(shared_button_target(&model, 2, 1), Some(1));
        assert_eq!(shared_button_target(&model, 2, 4), Some(1));
    }

    #[test]
    fn crossing_buttons_or_releasing_outside_does_not_activate() {
        let model = buttons();
        assert_eq!(shared_button_target(&model, 1, 5), None);
        assert_eq!(shared_button_target(&model, 2, 6), None);
        assert_eq!(shared_button_target(&model, 2, 7), None);
    }

    #[test]
    fn disabled_button_or_ancestor_cannot_activate() {
        let mut model = buttons();
        let commands: Vec<Command> =
            serde_json::from_str(r#"[{"op":"style","id":1,"style":{"disabled":true}}]"#)
                .expect("valid disabled style");
        model.apply(&commands).expect("valid disabled button");
        assert_eq!(shared_button_target(&model, 1, 2), None);
        let commands: Vec<Command> =
            serde_json::from_str(r#"[{"op":"style","id":0,"style":{"disabled":true}}]"#)
                .expect("valid disabled ancestor");
        model.apply(&commands).expect("valid disabled root");
        assert_eq!(shared_button_target(&model, 5, 6), None);
    }
}
