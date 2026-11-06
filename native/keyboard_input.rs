//! Keyboard input and focus movement: Godot's key events become DOM `keydown` and `keyup`, Tab moves
//! focus along `focus.rs`'s tab stops, Enter and Space activate a focused button, and JS can move
//! focus itself (plan sections 3.13 and 3.14).

use std::collections::BTreeSet;

use godot::classes::InputEventKey;
use godot::global::Key;
use godot::prelude::*;

use crate::commit::ValidatedCommit;
use crate::events::{EventPayload, KeyData, Modifiers};
use crate::focus::{Modality, is_focusable, next_tab_stop, tab_stops};
use crate::keymap::{dom_code, dom_key, is_modifier_key};
use crate::pointer::ButtonTree;
use crate::props::Kind;
use crate::scroll::ScrollKey;
use crate::{ROOT_TARGET, ReactUiRoot, modifiers_of};

/// What JS asks of `focus_node` for the keyboard focus look: follow the input modality, never, always.
const FOCUS_VISIBLE_BY_MODALITY: i64 = -1;
const FOCUS_VISIBLE_NEVER: i64 = 0;
const FOCUS_VISIBLE_ALWAYS: i64 = 1;

/// The keys that press a focused button.
fn is_activation_key(keycode: Key) -> bool {
    keycode == Key::ENTER || keycode == Key::KP_ENTER || keycode == Key::SPACE
}

/// What the release of `keycode` does to a button a key is pressing (`activation_key`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum KeyRelease {
    /// Some other key: the press goes on.
    Unrelated,
    /// The press ends and the button is clicked.
    Click,
    /// The press ends and JS prevented the `keyup`, which keeps the click.
    EndsWithoutClick,
}

fn key_release(activation_key: Option<Key>, keycode: Key, prevented: bool) -> KeyRelease {
    match (activation_key == Some(keycode), prevented) {
        (false, _) => KeyRelease::Unrelated,
        (true, false) => KeyRelease::Click,
        (true, true) => KeyRelease::EndsWithoutClick,
    }
}

/// The keys that scroll the focused element's scroll container (plan 3.16).
fn scroll_key_of(keycode: Key) -> Option<ScrollKey> {
    match keycode {
        Key::UP => Some(ScrollKey::ArrowUp),
        Key::DOWN => Some(ScrollKey::ArrowDown),
        Key::LEFT => Some(ScrollKey::ArrowLeft),
        Key::RIGHT => Some(ScrollKey::ArrowRight),
        Key::PAGEUP => Some(ScrollKey::PageUp),
        Key::PAGEDOWN => Some(ScrollKey::PageDown),
        Key::HOME => Some(ScrollKey::Home),
        Key::END => Some(ScrollKey::End),
        Key::SPACE => Some(ScrollKey::Space),
        _ => None,
    }
}

impl ReactUiRoot {
    /// A key press, echo or release: dispatched to the focused element (or to root listeners when
    /// none is focused) before native acts, and consumed (kept from the game) only if JS prevented
    /// it or a native default action ran (plan 3.11).
    pub(crate) fn handle_key(&mut self, key: &Gd<InputEventKey>) {
        let keycode = key.get_keycode();
        let pressed = key.is_pressed();
        let echo = key.is_echo();
        let modifiers = modifiers_of(key);
        self.pointer_modifiers = modifiers;
        if pressed && !is_modifier_key(keycode) {
            self.modality = Modality::Keyboard;
        }
        let data = KeyData {
            key: dom_key(
                keycode,
                key.get_key_label(),
                key.get_unicode(),
                modifiers.shift_key,
            ),
            code: dom_code(key.get_physical_keycode(), keycode, key.get_location()),
            repeat: echo,
            is_composing: self.text_input_is_composing(),
            modifiers,
        };
        let target = self
            .focused
            .filter(|tag| self.mounted.nodes.contains_key(tag))
            .unwrap_or(ROOT_TARGET);
        let payload = if pressed {
            EventPayload::KeyDown(data)
        } else {
            EventPayload::KeyUp(data)
        };
        let prevented = self.dispatch_cancelable(target, payload).default_prevented;
        // JS may have taken the root out of the tree, or the focused element out of the mounted
        // tree: everything below looks it up again (plan 3.3 rules 3 and 4).
        if !self.base().is_inside_tree() {
            return;
        }
        let consumed = if pressed {
            prevented || self.key_down_default(key, keycode, echo, modifiers)
        } else {
            // The key that pressed a button is up whatever JS made of its `keyup`; preventing it only
            // keeps the click. So the release is always handled, and a prevented one is consumed anyway.
            let released = self.key_up_default(keycode, prevented);
            prevented || released
        };
        if consumed {
            self.base_mut().accept_event();
        }
    }

    /// Copy and select all act on the document's text selection; Tab moves focus; a focused text input
    /// takes every other key as text; Enter and Space press a focused button; the scrolling keys scroll
    /// the focused element's scroll container. Returns whether native acted.
    fn key_down_default(
        &mut self,
        key: &Gd<InputEventKey>,
        keycode: Key,
        echo: bool,
        modifiers: Modifiers,
    ) -> bool {
        // The keys that copy the document's text selection and select all of it (`ui_copy`,
        // `ui_text_select_all`); a chord, so none of the keys below take it. A focused text input owns
        // these keys for its own text (`text_input_key_down`).
        if self.focused_text_input().is_none() && self.run_selection_key(key, echo) {
            return true;
        }
        if keycode == Key::TAB {
            // Ctrl, Alt and Meta with Tab belong to the platform and the game.
            if modifiers.ctrl_key || modifiers.alt_key || modifiers.meta_key {
                return false;
            }
            return self.advance_focus(modifiers.shift_key);
        }
        // A text input has its own use for every key, so its keys move the caret rather than scroll.
        if let Some(input) = self.focused_text_input() {
            return self.text_input_key_down(input, key, modifiers);
        }
        if is_activation_key(keycode) {
            if echo && self.activation_key.is_some() {
                // The repeats of a held key belong to the press it started.
                return true;
            }
            let pressable = self.focused.filter(|id| {
                self.mounted.kind_of(*id) == Some(Kind::Button) && !self.mounted.is_disabled(*id)
            });
            if let Some(id) = pressable {
                if echo {
                    return false;
                }
                self.pressed = Some(id);
                self.pressed_by_keyboard = true;
                self.activation_key = Some(keycode);
                self.refresh_interaction();
                return true;
            }
            // Space on anything that is not a button to press scrolls, like the other keys below.
        }
        // Scrolling belongs to the focused element: with none, keys are the game's (plan 3.11). A
        // chord with Ctrl, Alt or Meta is a shortcut for the platform or the game.
        let Some(scroll_key) = scroll_key_of(keycode) else {
            return false;
        };
        if modifiers.ctrl_key || modifiers.alt_key || modifiers.meta_key {
            return false;
        }
        match self
            .focused
            .filter(|tag| self.mounted.nodes.contains_key(tag))
        {
            Some(focused) => self.scroll_by_key(focused, scroll_key, modifiers.shift_key),
            None => false,
        }
    }

    /// Releasing the key that pressed a button ends the press and clicks the button, unless JS
    /// `prevented` the `keyup`, which keeps the click only: the press is over either way. No pointer
    /// events are made up: the `click` has pointer 0, no pointer type and no click count. Returns whether
    /// the key was the one that pressed a button.
    fn key_up_default(&mut self, keycode: Key, prevented: bool) -> bool {
        let release = key_release(self.activation_key, keycode, prevented);
        if release == KeyRelease::Unrelated {
            return false;
        }
        self.activation_key = None;
        let pressed = self.pressed.take();
        self.pressed_by_keyboard = false;
        if release == KeyRelease::Click
            && let Some(id) = pressed
                .filter(|id| self.focused == Some(*id) && self.mounted.nodes.contains_key(id))
        {
            let data = self.synthetic_pointer_data(0, 0);
            self.queue(id, EventPayload::Click(data));
        }
        self.refresh_interaction();
        true
    }

    /// Move focus to the next (or previous) tab stop, wrapping. Returns whether focus moved, which
    /// is what decides if the key press is consumed.
    pub(crate) fn advance_focus(&mut self, backwards: bool) -> bool {
        let before = self.focused;
        let order = self.mounted.document_order();
        let viewport = self.viewport_box();
        let stops = tab_stops(&self.mounted, &order, |tag| {
            self.mounted.visible_for_input(tag, viewport)
        });
        let next = next_tab_stop(&order, &stops, self.focused, backwards);
        // Tab to something scrolled out of view brings it into view (plan 3.16).
        if let Some(next) = next {
            self.reveal_node(next);
        }
        self.set_focus(next, true);
        // With nothing to tab to, focus left the element it was on and nothing holds it now.
        self.release_key_focus_without_element();
        self.focused != before
    }

    /// `element.focus()` from JS: the element takes element focus and the root takes Godot key focus
    /// (a keyboard that reaches nothing would be no use). `focus_visible` is -1 to follow the input
    /// modality, 0 for never, 1 for always. A non-focusable element is an error.
    pub(crate) fn focus_node_checked(
        &mut self,
        tag: u32,
        focus_visible: i64,
    ) -> Result<(), String> {
        let visible = match focus_visible {
            FOCUS_VISIBLE_BY_MODALITY => self.modality == Modality::Keyboard,
            FOCUS_VISIBLE_NEVER => false,
            FOCUS_VISIBLE_ALWAYS => true,
            other => return Err(format!("focusVisible {other} is not -1, 0 or 1")),
        };
        if !self.mounted.nodes.contains_key(&tag) {
            return Err(format!("node {tag} is not mounted"));
        }
        if !is_focusable(&self.mounted, tag) {
            let reason = if self.mounted.is_disabled(tag) {
                "it or an ancestor is disabled"
            } else {
                "it is not a button and has no tabIndex"
            };
            return Err(format!("node {tag} cannot take focus: {reason}"));
        }
        self.focus_element(tag, visible);
        Ok(())
    }

    /// `element.blur()` from JS: nothing happens unless `tag` holds focus.
    pub(crate) fn blur_node_checked(&mut self, tag: u32) -> Result<(), String> {
        if !self.mounted.nodes.contains_key(&tag) {
            return Err(format!("node {tag} is not mounted"));
        }
        if self.focused == Some(tag) {
            self.set_focus(None, false);
            self.release_key_focus_without_element();
        }
        Ok(())
    }

    /// Focus `tag` and give the root Godot key focus if it is in the scene tree (if it is not, key
    /// focus is taken when it enters).
    pub(crate) fn focus_element(&mut self, tag: u32, visible: bool) {
        if self.base().is_inside_tree() {
            self.base_mut().grab_focus();
        }
        // Programmatic and automatic focus bring the element into view, as `focus()` does in browsers.
        self.reveal_node(tag);
        self.set_focus(Some(tag), visible);
    }

    /// `autoFocus`: the first element this commit created that asked for focus and can take it, in
    /// document order (plan 3.13). The whole-tree walk only happens when something asked.
    pub(crate) fn apply_auto_focus(&mut self, validated: &ValidatedCommit) {
        let asking: BTreeSet<u32> = validated
            .created
            .iter()
            .filter(|created| created.props.is_auto_focus())
            .map(|created| created.tag)
            .collect();
        if asking.is_empty() {
            return;
        }
        let viewport = self.viewport_box();
        let first = self.mounted.document_order().into_iter().find(|tag| {
            asking.contains(tag)
                && is_focusable(&self.mounted, *tag)
                && self.mounted.visible_for_input(*tag, viewport)
        });
        if let Some(tag) = first {
            self.focus_element(tag, self.modality == Modality::Keyboard);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_key_that_pressed_a_button_ends_the_press_and_clicks() {
        assert_eq!(
            key_release(Some(Key::SPACE), Key::SPACE, false),
            KeyRelease::Click
        );
    }

    #[test]
    fn a_prevented_keyup_still_ends_the_press_but_keeps_the_click() {
        assert_eq!(
            key_release(Some(Key::ENTER), Key::ENTER, true),
            KeyRelease::EndsWithoutClick,
            "the button must not stay pressed because JS prevented the keyup"
        );
    }

    #[test]
    fn another_key_or_no_press_leaves_things_alone() {
        assert_eq!(
            key_release(Some(Key::SPACE), Key::ENTER, false),
            KeyRelease::Unrelated
        );
        assert_eq!(
            key_release(Some(Key::SPACE), Key::ENTER, true),
            KeyRelease::Unrelated
        );
        assert_eq!(key_release(None, Key::SPACE, false), KeyRelease::Unrelated);
    }
}
