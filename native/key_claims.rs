//! Whether the root would act on a key, asked before the key comes.
//!
//! On the Web the browser decides what a key does when its event has been dispatched, a frame before the engine hands the key to the
//! root. A key the root has no use for should go to the browser (Cmd+R reloads), and one it does use must not: so the page asks, at the
//! moment the key goes down, and this answers from the state the root is in then. The answer is the one the key handlers give, because it
//! is asked of the same tables they use (`text_input_godot/keys.rs`, `selection_input.rs::selection_key_of`, `keyboard_input.rs`), not of
//! a list kept beside them.
//!
//! The key arrives as a DOM key (`code`, `key` and the modifiers), which is what the page's `keydown` has, and is turned back into the
//! `InputEventKey` the engine would have made of it, so the same tables can be asked.

use godot::classes::{InputEvent, InputEventKey};
use godot::global::Key;
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::events::Modifiers;
use crate::keyboard_input::is_activation_key;
use crate::keymap::{key_for_dom_code, key_for_dom_name};
use crate::pointer::ButtonTree;
use crate::props::Kind;
use crate::selection_input::{SelectionKey, selection_key_of};

/// A key as a page's `keydown` has it.
pub(crate) struct DomKey<'a> {
    /// The physical key (`KeyA`, `Slash`).
    pub code: &'a str,
    /// The character the layout made, else the key's name (`ArrowLeft`, `F5`).
    pub key: &'a str,
    pub modifiers: Modifiers,
}

impl DomKey<'_> {
    /// The keycode (the key the layout made) and the physical keycode (the key's place) the engine would give this key, or `None` for
    /// one that names no key it knows. A name is looked up first; then a character, which Godot names by its capital; then the place.
    pub(crate) fn keycodes(&self) -> Option<(Key, Key)> {
        let physical = key_for_dom_code(self.code);
        let logical = key_for_dom_name(self.key)
            .or_else(|| character_key(self.key))
            .or(physical)?;
        Some((logical, physical.unwrap_or(logical)))
    }

    /// The key press the engine would have made of this key.
    fn to_event(&self) -> Option<Gd<InputEventKey>> {
        let (keycode, physical) = self.keycodes()?;
        let mut event = InputEventKey::new_gd();
        event.set_pressed(true);
        event.set_keycode(keycode);
        event.set_physical_keycode(physical);
        event.set_key_label(keycode);
        event.set_shift_pressed(self.modifiers.shift_key);
        event.set_ctrl_pressed(self.modifiers.ctrl_key);
        event.set_alt_pressed(self.modifiers.alt_key);
        event.set_meta_pressed(self.modifiers.meta_key);
        event.set_device(InputEvent::DEVICE_ID_KEYBOARD);
        Some(event)
    }
}

/// The key a single character is: its capital, as Godot names letters (`a` is `Key::A`), and the character itself where it has none.
fn character_key(key: &str) -> Option<Key> {
    let mut characters = key.chars();
    let character = characters.next()?;
    if characters.next().is_some() {
        return None;
    }
    let mut capitals = character.to_uppercase();
    let capital = match (capitals.next(), capitals.next()) {
        (Some(capital), None) => capital,
        _ => character,
    };
    Key::try_from_ord(i32::try_from(u32::from(capital)).ok()?)
}

/// Who the keyboard goes to in the root's viewport.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum KeyboardHolder {
    /// No control: a key goes to the game's own handling.
    Nobody,
    /// This root.
    This,
    /// Another root, which answers for itself.
    AnotherRoot,
    /// A control this library knows nothing about (a `LineEdit` of the game's), which uses whatever it uses.
    Foreign,
}

impl ReactUiRoot {
    fn keyboard_holder(&self) -> KeyboardHolder {
        let Some(owner) = self
            .base()
            .get_viewport()
            .and_then(|viewport| viewport.gui_get_focus_owner())
        else {
            return KeyboardHolder::Nobody;
        };
        if owner.instance_id() == self.to_gd().instance_id() {
            KeyboardHolder::This
        } else if owner.try_cast::<ReactUiRoot>().is_ok() {
            KeyboardHolder::AnotherRoot
        } else {
            KeyboardHolder::Foreign
        }
    }

    /// Whether the key must reach the engine because the root uses it, for the keys a browser also has a use for (chords): a focused text
    /// input's actions, copy and select all of the document's selection, Enter and Space on a focused button. A control of the game's
    /// that holds the keyboard is assumed to use every key, since nothing here knows what it uses; with no control holding it, or another
    /// root, this root uses none. What the focused element and its ancestors declare, and what the app claimed, are JavaScript's to add
    /// (`src/renderer.ts`, `claimsKey`).
    pub(crate) fn key_chord_claimed(&self, key: &DomKey<'_>) -> bool {
        match self.keyboard_holder() {
            KeyboardHolder::Nobody | KeyboardHolder::AnotherRoot => false,
            KeyboardHolder::Foreign => true,
            KeyboardHolder::This => key.to_event().is_some_and(|event| self.uses_key(&event)),
        }
    }

    /// The part of the question that is about this root's state: the order of `key_down_default`.
    fn uses_key(&self, event: &Gd<InputEventKey>) -> bool {
        if let Some(input) = self.focused_text_input() {
            return self.text_input_claims_key(input, event);
        }
        match selection_key_of(event) {
            Some(SelectionKey::Copy) => {
                self.selecting.selection.is_active() && !self.selecting.selection.is_collapsed()
            }
            Some(SelectionKey::SelectAll) => true,
            None => {
                is_activation_key(event.get_keycode())
                    && self.focused.is_some_and(|id| {
                        self.mounted.kind_of(id) == Some(Kind::Button)
                            && !self.mounted.is_disabled(id)
                    })
            }
        }
    }

    /// The tags of the focused element and its ancestors, the element first.
    pub(crate) fn focused_path_tags(&self) -> Vec<u32> {
        self.focused
            .map(|tag| self.mounted.path_of(tag))
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dom<'a>(code: &'a str, key: &'a str) -> DomKey<'a> {
        DomKey {
            code,
            key,
            modifiers: Modifiers::default(),
        }
    }

    #[test]
    fn a_letter_is_its_capital_and_its_place() {
        assert_eq!(dom("KeyR", "r").keycodes(), Some((Key::R, Key::R)));
        assert_eq!(dom("KeyR", "R").keycodes(), Some((Key::R, Key::R)));
        assert_eq!(dom("KeyA", "a").keycodes(), Some((Key::A, Key::A)));
    }

    #[test]
    fn a_layout_moves_the_key_and_not_the_place() {
        // AZERTY: the key at W's place types z.
        assert_eq!(dom("KeyW", "z").keycodes(), Some((Key::Z, Key::W)));
        // Dvorak: the key at the apostrophe's place types q.
        assert_eq!(
            dom("Quote", "q").keycodes(),
            Some((Key::Q, Key::APOSTROPHE))
        );
    }

    #[test]
    fn a_name_is_looked_up_before_a_character() {
        assert_eq!(
            dom("ArrowLeft", "ArrowLeft").keycodes(),
            Some((Key::LEFT, Key::LEFT))
        );
        assert_eq!(dom("F5", "F5").keycodes(), Some((Key::F5, Key::F5)));
        assert_eq!(
            dom("Backspace", "Backspace").keycodes(),
            Some((Key::BACKSPACE, Key::BACKSPACE))
        );
        assert_eq!(dom("Space", " ").keycodes(), Some((Key::SPACE, Key::SPACE)));
        assert_eq!(
            dom("MetaLeft", "Meta").keycodes(),
            Some((Key::META, Key::META))
        );
    }

    #[test]
    fn a_key_the_layout_gave_another_character_is_still_found_by_its_place() {
        // Option+A on a Mac types å, which is no key; the place is.
        assert_eq!(
            dom("KeyA", "å").keycodes(),
            Some((Key::try_from_ord(0xC5).unwrap(), Key::A))
        );
        // A dead key names no character at all.
        assert_eq!(
            dom("Quote", "Dead").keycodes(),
            Some((Key::APOSTROPHE, Key::APOSTROPHE))
        );
    }

    #[test]
    fn digits_and_punctuation_are_their_own_keys() {
        assert_eq!(
            dom("Digit1", "1").keycodes(),
            Some((Key::KEY_1, Key::KEY_1))
        );
        assert_eq!(dom("Slash", "/").keycodes(), Some((Key::SLASH, Key::SLASH)));
        // Shift makes the character, and the place stays.
        assert_eq!(
            dom("Slash", "?").keycodes(),
            Some((Key::QUESTION, Key::SLASH))
        );
        assert_eq!(
            dom("BracketLeft", "[").keycodes(),
            Some((Key::BRACKETLEFT, Key::BRACKETLEFT))
        );
    }

    #[test]
    fn a_key_the_engine_has_no_name_for_is_none() {
        assert_eq!(dom("Unidentified", "Unidentified").keycodes(), None);
        assert_eq!(dom("", "").keycodes(), None);
        // A place the tables do not have still has the character it types.
        assert_eq!(
            dom("IntlBackslash", "<").keycodes(),
            Some((Key::LESS, Key::LESS))
        );
    }

    #[test]
    fn a_character_with_no_single_capital_is_itself() {
        // `ß` capitalises to two letters.
        assert_eq!(character_key("ß"), Key::try_from_ord(0xDF));
        assert_eq!(character_key("ab"), None);
        assert_eq!(character_key(""), None);
    }
}
