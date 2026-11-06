//! Pasting on the Web (plan 3.18, Phase I7C).
//!
//! `DisplayServer::clipboard_get` cannot be asked for the browser's clipboard on the Web: the
//! engine starts `navigator.clipboard.readText()` and returns the text its *previous* call read
//! (`DisplayServerWeb::clipboard_get`, `godot_js_display_clipboard_get`). The browser's `paste`
//! event would refresh that text, but the engine's key listeners `preventDefault()` every
//! `keydown`, so the shortcut never makes the browser paste and the event never comes. A paste
//! therefore inserted the clipboard as of one paste earlier, however long ago the clipboard had
//! changed (docs/tracks/text-input.md records the measurement).
//!
//! The answer to `readText()` is a promise, so the paste is finished when the browser answers: the
//! root asks through the engine's `JavaScriptBridge` and gives the promise two callbacks, which
//! the bridge calls with an array of the promise's arguments (`JavaScriptObjectImpl::callback`).
//! Every other platform answers at once and is not asked this way.

use std::collections::VecDeque;

use godot::classes::{Engine, Os};
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::text_input::EditCommand;

/// The engine singleton that reaches the browser (`javascript_bridge_singleton.cpp`).
const JAVASCRIPT_BRIDGE: &str = "JavaScriptBridge";
/// `OS.has_feature` for the Web platform.
const WEB_FEATURE: &str = "web";
/// The `ReactUiRoot` methods the promise's callbacks call.
const ON_TEXT: &str = "_on_web_clipboard_text";
const ON_REFUSED: &str = "_on_web_clipboard_refused";

/// The browser reads in flight.
#[derive(Default)]
pub(crate) struct WebClipboard {
    /// The two JavaScript functions a promise's `then` takes. A wrapper that is freed while its
    /// callback runs frees what the bridge is still using, so they are made on the first read and
    /// live as long as the root.
    callbacks: Option<(Variant, Variant)>,
    /// The input each read was for, oldest first: a read's answer pastes into that input if it
    /// still has the focus.
    waiting: VecDeque<u32>,
}

impl ReactUiRoot {
    /// `ui_paste` with the buffer asking for the clipboard: paste it into `tag`, now where the
    /// platform answers at once, when the browser answers on the Web.
    pub(super) fn paste_from_clipboard(&mut self, tag: u32) {
        if !Os::singleton().has_feature(WEB_FEATURE) {
            let text = crate::clipboard::read();
            self.run_text_command(tag, EditCommand::PasteText(text));
            return;
        }
        match self.read_web_clipboard() {
            Ok(()) => self.text_inputs.web_clipboard.waiting.push_back(tag),
            Err(error) => {
                godot_error!("ReactUiRoot: cannot paste: {error}");
            }
        }
    }

    /// Start `navigator.clipboard.readText()` and give its promise the callbacks.
    fn read_web_clipboard(&mut self) -> Result<(), String> {
        let mut bridge = Engine::singleton()
            .get_singleton(JAVASCRIPT_BRIDGE)
            .ok_or("the engine has no JavaScriptBridge")?;
        let (on_text, on_refused) = match &self.text_inputs.web_clipboard.callbacks {
            Some(callbacks) => callbacks.clone(),
            None => {
                let this = self.to_gd();
                let mut create = |method: &str| {
                    let callable = Callable::from_object_method(&this, method);
                    bridge.call("create_callback", &[callable.to_variant()])
                };
                let callbacks = (create(ON_TEXT), create(ON_REFUSED));
                self.text_inputs.web_clipboard.callbacks = Some(callbacks.clone());
                callbacks
            }
        };
        let navigator = object_of(
            bridge.call("get_interface", &[GString::from("navigator").to_variant()]),
            "window.navigator",
        )?;
        let mut clipboard = object_of(navigator.get("clipboard"), "navigator.clipboard")?;
        let mut promise = object_of(
            clipboard.call("readText", &[]),
            "navigator.clipboard.readText()",
        )?;
        promise.call("then", &[on_text, on_refused]);
        Ok(())
    }

    /// The browser's clipboard text arrived (`arguments` is the promise's value, one string).
    pub(crate) fn finish_web_paste(&mut self, arguments: &VarArray) {
        let Some(tag) = self.text_inputs.web_clipboard.waiting.pop_front() else {
            godot_error!(
                "ReactUiRoot: the browser answered a clipboard read that nobody asked for"
            );
            return;
        };
        let Some(Ok(text)) = arguments.get(0).map(|value| value.try_to::<GString>()) else {
            godot_error!("ReactUiRoot: the browser's clipboard text is not a string: {arguments}");
            return;
        };
        // The paste is for the input that asked; if focus moved while the browser answered, it
        // is no longer wanted.
        if self.focused != Some(tag) || self.text_state(tag).is_none() {
            return;
        }
        self.run_text_command(tag, EditCommand::PasteText(text.to_string()));
        // The browser's answer is input, like the key that asked: JS hears of it now.
        self.deliver();
    }

    /// The browser refused the read (no permission, a page that is not focused, no user gesture).
    pub(crate) fn refuse_web_paste(&mut self, arguments: &VarArray) {
        self.text_inputs.web_clipboard.waiting.pop_front();
        godot_error!("ReactUiRoot: the browser refused to read the clipboard: {arguments}");
    }
}

/// `value` as an object, or why the browser did not give one.
fn object_of(value: Variant, what: &str) -> Result<Gd<Object>, String> {
    value
        .try_to::<Gd<Object>>()
        .map_err(|_| format!("{what} is not an object ({value})"))
}
