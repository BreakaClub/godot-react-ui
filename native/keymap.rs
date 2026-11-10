//! Godot key events to DOM `key` and `code`. Pure: it reads only the numbers an
//! `InputEventKey` carries, so every rule is unit tested without the engine.

use godot::global::{Key, KeyLocation};
use godot::obj::EngineEnum;

/// DOM `KeyboardEvent.key` for a key event: the character it typed, else its name, else (so that
/// Ctrl+C reads `c`) its printable label, else `Unidentified`.
pub(crate) fn dom_key(keycode: Key, key_label: Key, unicode: u32, shift: bool) -> String {
    // A typed character, even a space (the lowest printable code point is 32).
    const FIRST_PRINTABLE: u32 = 32;
    if unicode >= FIRST_PRINTABLE
        && let Some(character) = char::from_u32(unicode)
    {
        return character.to_string();
    }
    if let Some(name) = named_key(keycode) {
        return name.to_string();
    }
    // Godot labels a key with its capital; DOM reports the character the key produces.
    if let Some(label) = char::from_u32(u32::try_from(key_label.ord()).unwrap_or(0))
        && !label.is_control()
        && key_label != Key::NONE
    {
        return if shift {
            label.to_string()
        } else {
            label.to_lowercase().collect()
        };
    }
    UNIDENTIFIED.to_string()
}

/// DOM `KeyboardEvent.code`: the key's place on the keyboard, from its physical keycode (the logical
/// one for an event that has none, which only synthetic events lack) and, for modifiers, its side.
pub(crate) fn dom_code(physical: Key, keycode: Key, location: KeyLocation) -> &'static str {
    let key = if physical == Key::NONE {
        keycode
    } else {
        physical
    };
    if let Some(code) = lettered_code(key) {
        return code;
    }
    if let Some((_, left, right)) = MODIFIERS.iter().find(|(modifier, _, _)| *modifier == key) {
        return if location == KeyLocation::RIGHT {
            right
        } else {
            left
        };
    }
    PLACED_CODES
        .iter()
        .find(|(candidate, _)| *candidate == key)
        .map_or(UNIDENTIFIED, |(_, code)| code)
}

/// The key a DOM `code` names, the inverse of [`dom_code`] for the keys its tables have. Either side of a modifier is the
/// modifier. `None` for a code the tables do not have (`Unidentified`, `F13`, `IntlBackslash`).
pub(crate) fn key_for_dom_code(code: &str) -> Option<Key> {
    let run = |first: Key, codes: &[&str]| {
        let offset = i32::try_from(codes.iter().position(|candidate| *candidate == code)?).ok()?;
        Key::try_from_ord(first.ord() + offset)
    };
    run(Key::A, &LETTER_CODES)
        .or_else(|| run(Key::KEY_0, &DIGIT_CODES))
        .or_else(|| run(Key::KP_0, &NUMPAD_CODES))
        .or_else(|| {
            MODIFIERS
                .iter()
                .find(|(_, left, right)| *left == code || *right == code)
                .map(|(modifier, _, _)| *modifier)
        })
        .or_else(|| {
            PLACED_CODES
                .iter()
                .find(|(_, candidate)| *candidate == code)
                .map(|(key, _)| *key)
        })
}

/// The key a DOM `key` value names when it is a name and not a character (`ArrowLeft`, `F5`, `Control`), the inverse of
/// [`dom_key`]'s names. `Enter` is the main Enter key and `Tab` is Tab, the first of the keys that share a name.
pub(crate) fn key_for_dom_name(name: &str) -> Option<Key> {
    NAMED_KEYS
        .iter()
        .find(|(_, candidate)| *candidate == name)
        .map(|(key, _)| *key)
}

/// Whether a key only holds a modifier down. Pressing one is not a change of input modality.
pub(crate) fn is_modifier_key(keycode: Key) -> bool {
    MODIFIERS
        .iter()
        .any(|(modifier, _, _)| *modifier == keycode)
}

const UNIDENTIFIED: &str = "Unidentified";

fn named_key(keycode: Key) -> Option<&'static str> {
    NAMED_KEYS
        .iter()
        .find(|(candidate, _)| *candidate == keycode)
        .map(|(_, name)| *name)
}

/// `key` values for keys that type no character.
const NAMED_KEYS: [(Key, &str); 38] = [
    (Key::ENTER, "Enter"),
    (Key::KP_ENTER, "Enter"),
    (Key::TAB, "Tab"),
    (Key::ESCAPE, "Escape"),
    (Key::BACKSPACE, "Backspace"),
    (Key::DELETE, "Delete"),
    (Key::INSERT, "Insert"),
    (Key::HOME, "Home"),
    (Key::END, "End"),
    (Key::PAGEUP, "PageUp"),
    (Key::PAGEDOWN, "PageDown"),
    (Key::LEFT, "ArrowLeft"),
    (Key::RIGHT, "ArrowRight"),
    (Key::UP, "ArrowUp"),
    (Key::DOWN, "ArrowDown"),
    (Key::SHIFT, "Shift"),
    (Key::CTRL, "Control"),
    (Key::ALT, "Alt"),
    (Key::META, "Meta"),
    (Key::CAPSLOCK, "CapsLock"),
    (Key::F1, "F1"),
    (Key::F2, "F2"),
    (Key::F3, "F3"),
    (Key::F4, "F4"),
    (Key::F5, "F5"),
    (Key::F6, "F6"),
    (Key::F7, "F7"),
    (Key::F8, "F8"),
    (Key::F9, "F9"),
    (Key::F10, "F10"),
    (Key::F11, "F11"),
    (Key::F12, "F12"),
    (Key::MENU, "ContextMenu"),
    (Key::PAUSE, "Pause"),
    (Key::PRINT, "PrintScreen"),
    (Key::SCROLLLOCK, "ScrollLock"),
    (Key::NUMLOCK, "NumLock"),
    (Key::BACKTAB, "Tab"),
];

/// A modifier and its `code` on the left and on the right.
const MODIFIERS: [(Key, &str, &str); 4] = [
    (Key::SHIFT, "ShiftLeft", "ShiftRight"),
    (Key::CTRL, "ControlLeft", "ControlRight"),
    (Key::ALT, "AltLeft", "AltRight"),
    (Key::META, "MetaLeft", "MetaRight"),
];

const LETTER_CODES: [&str; 26] = [
    "KeyA", "KeyB", "KeyC", "KeyD", "KeyE", "KeyF", "KeyG", "KeyH", "KeyI", "KeyJ", "KeyK", "KeyL",
    "KeyM", "KeyN", "KeyO", "KeyP", "KeyQ", "KeyR", "KeyS", "KeyT", "KeyU", "KeyV", "KeyW", "KeyX",
    "KeyY", "KeyZ",
];

const DIGIT_CODES: [&str; 10] = [
    "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8",
    "Digit9",
];

const NUMPAD_CODES: [&str; 10] = [
    "Numpad0", "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5", "Numpad6", "Numpad7",
    "Numpad8", "Numpad9",
];

/// Godot's letter, digit and numpad keycodes are runs of consecutive values.
fn lettered_code(key: Key) -> Option<&'static str> {
    let run = |first: Key, codes: &'static [&'static str]| {
        let offset = usize::try_from(key.ord() - first.ord()).ok()?;
        codes.get(offset).copied()
    };
    run(Key::A, &LETTER_CODES)
        .or_else(|| run(Key::KEY_0, &DIGIT_CODES))
        .or_else(|| run(Key::KP_0, &NUMPAD_CODES))
}

/// Every other key with a fixed place on the keyboard.
const PLACED_CODES: [(Key, &str); 46] = [
    (Key::F1, "F1"),
    (Key::F2, "F2"),
    (Key::F3, "F3"),
    (Key::F4, "F4"),
    (Key::F5, "F5"),
    (Key::F6, "F6"),
    (Key::F7, "F7"),
    (Key::F8, "F8"),
    (Key::F9, "F9"),
    (Key::F10, "F10"),
    (Key::F11, "F11"),
    (Key::F12, "F12"),
    (Key::KP_ADD, "NumpadAdd"),
    (Key::KP_SUBTRACT, "NumpadSubtract"),
    (Key::KP_MULTIPLY, "NumpadMultiply"),
    (Key::KP_DIVIDE, "NumpadDivide"),
    (Key::KP_PERIOD, "NumpadDecimal"),
    (Key::KP_ENTER, "NumpadEnter"),
    (Key::ENTER, "Enter"),
    (Key::TAB, "Tab"),
    (Key::SPACE, "Space"),
    (Key::ESCAPE, "Escape"),
    (Key::BACKSPACE, "Backspace"),
    (Key::DELETE, "Delete"),
    (Key::INSERT, "Insert"),
    (Key::HOME, "Home"),
    (Key::END, "End"),
    (Key::PAGEUP, "PageUp"),
    (Key::PAGEDOWN, "PageDown"),
    (Key::LEFT, "ArrowLeft"),
    (Key::RIGHT, "ArrowRight"),
    (Key::UP, "ArrowUp"),
    (Key::DOWN, "ArrowDown"),
    (Key::CAPSLOCK, "CapsLock"),
    (Key::MINUS, "Minus"),
    (Key::EQUAL, "Equal"),
    (Key::BRACKETLEFT, "BracketLeft"),
    (Key::BRACKETRIGHT, "BracketRight"),
    (Key::BACKSLASH, "Backslash"),
    (Key::SEMICOLON, "Semicolon"),
    (Key::APOSTROPHE, "Quote"),
    (Key::QUOTELEFT, "Backquote"),
    (Key::COMMA, "Comma"),
    (Key::PERIOD, "Period"),
    (Key::SLASH, "Slash"),
    (Key::MENU, "ContextMenu"),
];

#[cfg(test)]
mod tests {
    use super::*;

    const NO_UNICODE: u32 = 0;

    fn key(keycode: Key, label: Key, unicode: char, shift: bool) -> String {
        dom_key(keycode, label, unicode as u32, shift)
    }

    #[test]
    fn a_typed_character_is_the_key() {
        assert_eq!(key(Key::A, Key::A, 'a', false), "a");
        assert_eq!(key(Key::A, Key::A, 'A', true), "A");
        assert_eq!(key(Key::SPACE, Key::SPACE, ' ', false), " ");
        assert_eq!(
            key(Key::KEY_1, Key::KEY_1, '!', true),
            "!",
            "the character, not the key"
        );
        assert_eq!(key(Key::A, Key::A, 'é', false), "é");
        assert_eq!(dom_key(Key::NONE, Key::NONE, '😀' as u32, false), "😀");
    }

    #[test]
    fn a_key_that_types_nothing_has_its_dom_name() {
        for (keycode, name) in [
            (Key::ENTER, "Enter"),
            (Key::KP_ENTER, "Enter"),
            (Key::TAB, "Tab"),
            (Key::ESCAPE, "Escape"),
            (Key::BACKSPACE, "Backspace"),
            (Key::DELETE, "Delete"),
            (Key::INSERT, "Insert"),
            (Key::HOME, "Home"),
            (Key::END, "End"),
            (Key::PAGEUP, "PageUp"),
            (Key::PAGEDOWN, "PageDown"),
            (Key::LEFT, "ArrowLeft"),
            (Key::RIGHT, "ArrowRight"),
            (Key::UP, "ArrowUp"),
            (Key::DOWN, "ArrowDown"),
            (Key::SHIFT, "Shift"),
            (Key::CTRL, "Control"),
            (Key::ALT, "Alt"),
            (Key::META, "Meta"),
            (Key::CAPSLOCK, "CapsLock"),
            (Key::F1, "F1"),
            (Key::F12, "F12"),
            (Key::MENU, "ContextMenu"),
            (Key::PAUSE, "Pause"),
            (Key::PRINT, "PrintScreen"),
            (Key::SCROLLLOCK, "ScrollLock"),
            (Key::NUMLOCK, "NumLock"),
        ] {
            assert_eq!(dom_key(keycode, Key::NONE, NO_UNICODE, false), name);
        }
    }

    #[test]
    fn a_chord_reads_as_the_key_it_presses_and_anything_else_is_unidentified() {
        // Ctrl+C: Godot reports no character, but the key's label is C.
        assert_eq!(dom_key(Key::C, Key::C, NO_UNICODE, false), "c");
        assert_eq!(
            dom_key(Key::C, Key::C, NO_UNICODE, true),
            "C",
            "Shift keeps the capital"
        );
        // A control character (Ctrl+C types U+0003) is not a printable key.
        assert_eq!(dom_key(Key::C, Key::C, 3, false), "c");
        assert_eq!(
            dom_key(Key::NONE, Key::NONE, NO_UNICODE, false),
            UNIDENTIFIED
        );
        assert_eq!(
            dom_key(Key::UNKNOWN, Key::NONE, NO_UNICODE, false),
            UNIDENTIFIED
        );
        assert_eq!(
            dom_key(Key::F13, Key::NONE, NO_UNICODE, false),
            UNIDENTIFIED
        );
    }

    #[test]
    fn letters_digits_and_the_numpad_have_their_codes() {
        for (offset, code) in LETTER_CODES.iter().enumerate() {
            let letter = Key::try_from_ord(Key::A.ord() + offset as i32).unwrap();
            assert_eq!(dom_code(letter, Key::NONE, KeyLocation::UNSPECIFIED), *code);
        }
        for (offset, code) in DIGIT_CODES.iter().enumerate() {
            let digit = Key::try_from_ord(Key::KEY_0.ord() + offset as i32).unwrap();
            assert_eq!(dom_code(digit, Key::NONE, KeyLocation::UNSPECIFIED), *code);
        }
        for (offset, code) in NUMPAD_CODES.iter().enumerate() {
            let pad = Key::try_from_ord(Key::KP_0.ord() + offset as i32).unwrap();
            assert_eq!(dom_code(pad, Key::NONE, KeyLocation::UNSPECIFIED), *code);
        }
        assert_eq!(
            dom_code(Key::KP_ADD, Key::NONE, KeyLocation::UNSPECIFIED),
            "NumpadAdd"
        );
        assert_eq!(
            dom_code(Key::KP_ENTER, Key::NONE, KeyLocation::UNSPECIFIED),
            "NumpadEnter"
        );
        assert_eq!(
            dom_code(Key::ENTER, Key::NONE, KeyLocation::UNSPECIFIED),
            "Enter"
        );
    }

    #[test]
    fn modifiers_report_their_side_and_punctuation_its_place() {
        for (modifier, left, right) in [
            (Key::SHIFT, "ShiftLeft", "ShiftRight"),
            (Key::CTRL, "ControlLeft", "ControlRight"),
            (Key::ALT, "AltLeft", "AltRight"),
            (Key::META, "MetaLeft", "MetaRight"),
        ] {
            assert_eq!(dom_code(modifier, Key::NONE, KeyLocation::LEFT), left);
            assert_eq!(dom_code(modifier, Key::NONE, KeyLocation::RIGHT), right);
            assert_eq!(
                dom_code(modifier, Key::NONE, KeyLocation::UNSPECIFIED),
                left,
                "unspecified is the left one"
            );
        }
        for (physical, code) in [
            (Key::SPACE, "Space"),
            (Key::TAB, "Tab"),
            (Key::ESCAPE, "Escape"),
            (Key::BACKSPACE, "Backspace"),
            (Key::LEFT, "ArrowLeft"),
            (Key::MINUS, "Minus"),
            (Key::EQUAL, "Equal"),
            (Key::BRACKETLEFT, "BracketLeft"),
            (Key::BRACKETRIGHT, "BracketRight"),
            (Key::BACKSLASH, "Backslash"),
            (Key::SEMICOLON, "Semicolon"),
            (Key::APOSTROPHE, "Quote"),
            (Key::QUOTELEFT, "Backquote"),
            (Key::COMMA, "Comma"),
            (Key::PERIOD, "Period"),
            (Key::SLASH, "Slash"),
            (Key::MENU, "ContextMenu"),
            (Key::F5, "F5"),
        ] {
            assert_eq!(
                dom_code(physical, Key::NONE, KeyLocation::UNSPECIFIED),
                code
            );
        }
        assert_eq!(
            dom_code(Key::F13, Key::NONE, KeyLocation::UNSPECIFIED),
            UNIDENTIFIED,
            "no DOM code in the table"
        );
    }

    #[test]
    fn the_code_comes_from_the_physical_key_and_falls_back_to_the_logical_one() {
        // A layout that puts Q where Dvorak has the apostrophe: the code names the place.
        assert_eq!(
            dom_code(Key::APOSTROPHE, Key::Q, KeyLocation::UNSPECIFIED),
            "Quote"
        );
        // A synthetic event with no physical key still has a code from its keycode.
        assert_eq!(
            dom_code(Key::NONE, Key::TAB, KeyLocation::UNSPECIFIED),
            "Tab"
        );
        assert_eq!(
            dom_code(Key::NONE, Key::NONE, KeyLocation::UNSPECIFIED),
            UNIDENTIFIED
        );
    }

    #[test]
    fn a_code_names_the_key_that_has_it() {
        for (offset, code) in LETTER_CODES.iter().enumerate() {
            let letter = Key::try_from_ord(Key::A.ord() + offset as i32).unwrap();
            assert_eq!(key_for_dom_code(code), Some(letter), "{code}");
        }
        assert_eq!(key_for_dom_code("Digit0"), Some(Key::KEY_0));
        assert_eq!(key_for_dom_code("Digit9"), Some(Key::KEY_9));
        assert_eq!(key_for_dom_code("Numpad5"), Some(Key::KP_5));
        assert_eq!(key_for_dom_code("MetaLeft"), Some(Key::META));
        assert_eq!(key_for_dom_code("MetaRight"), Some(Key::META));
        assert_eq!(key_for_dom_code("ControlRight"), Some(Key::CTRL));
        assert_eq!(key_for_dom_code("ArrowLeft"), Some(Key::LEFT));
        assert_eq!(key_for_dom_code("Backspace"), Some(Key::BACKSPACE));
        assert_eq!(key_for_dom_code("Slash"), Some(Key::SLASH));
        assert_eq!(key_for_dom_code("F5"), Some(Key::F5));
        assert_eq!(key_for_dom_code("F13"), None);
        assert_eq!(key_for_dom_code("IntlBackslash"), None);
        assert_eq!(key_for_dom_code("Unidentified"), None);
        assert_eq!(key_for_dom_code(""), None);
    }

    #[test]
    fn a_code_and_its_key_go_both_ways() {
        // Every key the tables give a code, except where a code is shared (both Enters and both Tabs are in the table once).
        for (key, code) in PLACED_CODES {
            assert_eq!(
                dom_code(key, Key::NONE, KeyLocation::UNSPECIFIED),
                code,
                "{code}"
            );
            let back = key_for_dom_code(code).unwrap_or_else(|| panic!("no key for {code}"));
            assert_eq!(
                dom_code(back, Key::NONE, KeyLocation::UNSPECIFIED),
                code,
                "{code} comes back as itself"
            );
        }
        for (modifier, left, right) in MODIFIERS {
            assert_eq!(key_for_dom_code(left), Some(modifier));
            assert_eq!(key_for_dom_code(right), Some(modifier));
        }
    }

    #[test]
    fn a_key_name_names_the_key_that_has_it() {
        for (key, name) in NAMED_KEYS {
            let back = key_for_dom_name(name).unwrap_or_else(|| panic!("no key for {name}"));
            assert_eq!(
                dom_key(back, Key::NONE, NO_UNICODE, false),
                name,
                "{key:?}: {name} comes back as itself"
            );
        }
        assert_eq!(key_for_dom_name("Enter"), Some(Key::ENTER));
        assert_eq!(key_for_dom_name("Tab"), Some(Key::TAB));
        assert_eq!(key_for_dom_name("a"), None, "a character is not a name");
        assert_eq!(key_for_dom_name("Dead"), None);
    }

    #[test]
    fn only_the_four_modifiers_leave_the_input_modality_alone() {
        for modifier in [Key::SHIFT, Key::CTRL, Key::ALT, Key::META] {
            assert!(is_modifier_key(modifier));
        }
        for other in [Key::A, Key::TAB, Key::CAPSLOCK, Key::SPACE, Key::ENTER] {
            assert!(!is_modifier_key(other));
        }
    }
}
