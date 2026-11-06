//! Keeping the Web's soft keyboard element in step with the text (plan 3.18, docs/tracks/text-input-fixes.md).
//!
//! The engine's on-screen keyboard on the Web is a hidden DOM `<input>` or `<textarea>` (`GodotDisplayVK`,
//! `library_godot_display.js`). Its value is set once, by `virtual_keyboard_show`, and from then on every `input`
//! event on it sends the element's *whole* value to the focused Control as `_set_text`. So the element's value is the
//! truth of the keyboard, and any change native makes to the text that the keyboard did not make (a field cleared on
//! submit, an edit JS put back, `maxLength` cutting what was typed) leaves the element holding the old text: the next
//! key arrives as "old text + key", and the field gets its old text back.
//!
//! `virtual_keyboard_show` again would set the value, but it hides the element first (`GodotDisplayVK.show` calls
//! `hide()`, which blurs it and clears it) and focuses it again, which a touch browser only lets a user gesture do:
//! the keyboard would flicker away and might not return. So the value and the selection are written to the element
//! itself, through the page the root already reaches with `JavaScriptBridge` (the clipboard does the same): setting
//! a DOM element's `value` raises no `input` event, so nothing is sent back.
//!
//! The element is found as the page's `document.activeElement` while the soft keyboard is up (the engine focuses it
//! when it shows it), and recognised by the styles `GodotDisplayVK` gives it. Anything else that has the focus is
//! left alone.

use godot::classes::display_server::Feature;
use godot::classes::{DisplayServer, Engine, Os};
use godot::prelude::*;

use crate::ReactUiRoot;

/// The engine singleton that reaches the browser (`javascript_bridge_singleton.cpp`).
const JAVASCRIPT_BRIDGE: &str = "JavaScriptBridge";
/// `OS.has_feature` for the Web platform.
const WEB_FEATURE: &str = "web";
/// What `GodotDisplayVK` gives the element it shows (`library_godot_display.js`, `create` and `show`): it sits behind
/// the canvas and is displayed as a block while the keyboard is up. A page's own field has neither.
const KEYBOARD_ELEMENT_Z_INDEX: &str = "-1";
const KEYBOARD_ELEMENT_DISPLAY: &str = "block";

impl ReactUiRoot {
    /// Make the soft keyboard element hold the text of the focused input `tag`, and (with `selection`) its
    /// selection. Does nothing where there is no soft keyboard element: another platform, a keyboard that is not up,
    /// an input that is read-only (it has no keyboard) or one that is not focused. A failure is an `ERROR` line.
    pub(crate) fn sync_virtual_keyboard_element(&mut self, tag: u32, selection: bool) {
        if self.focused != Some(tag) || !Os::singleton().has_feature(WEB_FEATURE) {
            return;
        }
        if !DisplayServer::singleton().has_feature(Feature::VIRTUAL_KEYBOARD) {
            return;
        }
        let Some(state) = self.text_state(tag) else {
            return;
        };
        if state.buffer.config().read_only {
            return;
        }
        let value = state.buffer.value();
        let (start, end) = state.buffer.selection_utf16();
        // Between a `_set_text` and the Right presses that follow it, the selection native holds is the 0 that
        // `ReplaceText` leaves, not where the keyboard's caret is. An edit refused in that time (a second key within
        // the frame) was restored to the selection from before it, which is that 0, and written to the element, whose
        // caret then stood at the start of the text and put the next key there. The element's caret is left where
        // setting its value put it, at the end, which is where the keys of a text typed in a hurry are.
        let selection = selection && !self.text_inputs.keyboard_presses_pending;
        let wanted_selection = selection.then_some((start, end));
        if let Err(error) = write_keyboard_element(&value, wanted_selection) {
            godot_error!("ReactUiRoot: text input {tag}: cannot update the soft keyboard: {error}");
        }
    }
}

/// Write `value` (and `selection`, UTF-16 offsets) to the soft keyboard element if there is one up and it differs.
fn write_keyboard_element(value: &str, selection: Option<(usize, usize)>) -> Result<(), String> {
    let mut bridge = Engine::singleton()
        .get_singleton(JAVASCRIPT_BRIDGE)
        .ok_or("the engine has no JavaScriptBridge")?;
    let document = object_of(
        bridge.call("get_interface", &[GString::from("document").to_variant()]),
        "window.document",
    )?;
    // `null` when nothing in the page has the focus.
    let Ok(mut element) = document.get("activeElement").try_to::<Gd<Object>>() else {
        return Ok(());
    };
    let style = object_of(element.get("style"), "the focused element's style")?;
    let is_keyboard_element = string_of(&style.get("zIndex")).as_deref()
        == Some(KEYBOARD_ELEMENT_Z_INDEX)
        && string_of(&style.get("display")).as_deref() == Some(KEYBOARD_ELEMENT_DISPLAY);
    if !is_keyboard_element {
        return Ok(());
    }
    let differs = string_of(&element.get("value")).is_none_or(|current| current != value);
    if differs {
        element.set("value", &GString::from(value).to_variant());
    }
    // Setting the value puts the element's caret at its end; a selection is only written where the caller says the
    // native one moved.
    if let Some((start, end)) = selection {
        let offset = |units: usize| i64::try_from(units).unwrap_or(i64::MAX).to_variant();
        element.call("setSelectionRange", &[offset(start), offset(end)]);
    }
    Ok(())
}

/// A JavaScript string property, or `None` for anything else (an absent style, a number).
fn string_of(value: &Variant) -> Option<String> {
    value.try_to::<GString>().ok().map(|text| text.to_string())
}

/// `value` as an object, or why the browser did not give one.
fn object_of(value: Variant, what: &str) -> Result<Gd<Object>, String> {
    value
        .try_to::<Gd<Object>>()
        .map_err(|_| format!("{what} is not an object ({value})"))
}
