//! A text input and the platform around it (plan 3.18): what happens when it gains and loses focus,
//! the IME window and its composition, the on-screen keyboard, and the clipboard. It mirrors
//! `LineEdit`: `_edit`/`unedit` (`line_edit.cpp:56-110`), `_update_ime_window_position` (`:133-147`),
//! `NOTIFICATION_OS_IME_UPDATE` (`:1694-1715`), `show_virtual_keyboard` (`:2255-2265`) and `_set_text`
//! (`:2126-2142`).
//!
//! On the Web, the IME and the virtual keyboard are mutually exclusive: the engine reports
//! `FEATURE_IME` only when `html/experimental_virtual_keyboard` is off, and `FEATURE_VIRTUAL_KEYBOARD`
//! only when it is on and the browser has touch (`platform/web/display_server_web.cpp:1227-1231`,
//! `library_godot_display.js:39-41`). Each call here is made only when its feature exists.

use godot::classes::display_server::{Feature, VirtualKeyboardType};
use godot::classes::{DisplayServer, Window};
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::pointer::DOM_BUTTON_PRIMARY;
use crate::props::KeyboardTypeSpec;
use crate::text_input::EditCommand;

/// The id of the main window, which a root in the main window's scene tree is in.
const MAIN_WINDOW_ID: i32 = 0;

fn keyboard_type(
    spec: Option<KeyboardTypeSpec>,
    multiline: bool,
    secure: bool,
) -> VirtualKeyboardType {
    match spec {
        Some(KeyboardTypeSpec::Default) => VirtualKeyboardType::DEFAULT,
        Some(KeyboardTypeSpec::Multiline) => VirtualKeyboardType::MULTILINE,
        Some(KeyboardTypeSpec::Number) => VirtualKeyboardType::NUMBER,
        Some(KeyboardTypeSpec::Decimal) => VirtualKeyboardType::NUMBER_DECIMAL,
        Some(KeyboardTypeSpec::Phone) => VirtualKeyboardType::PHONE,
        Some(KeyboardTypeSpec::Email) => VirtualKeyboardType::EMAIL_ADDRESS,
        Some(KeyboardTypeSpec::Url) => VirtualKeyboardType::URL,
        Some(KeyboardTypeSpec::Password) => VirtualKeyboardType::PASSWORD,
        None if secure => VirtualKeyboardType::PASSWORD,
        None if multiline => VirtualKeyboardType::MULTILINE,
        None => VirtualKeyboardType::DEFAULT,
    }
}

impl ReactUiRoot {
    /// Run `call`, an engine call that may notify this node before it returns.
    ///
    /// The Web game runs on the browser's main thread, where the engine's IME and virtual keyboard
    /// calls move DOM focus (`GodotIME.ime_active(false)` and `GodotDisplayVK` call
    /// `canvas.focus()` and `HTMLElement.focus()`). The canvas's capturing `focus` and `blur`
    /// listeners run during that call, on the same thread, and reach the engine's
    /// `window_event_callback`, which sends `NOTIFICATION_WM_WINDOW_FOCUS_IN` or `_OUT` to every
    /// node (`display_server_web.cpp` `_send_window_event_callback`, `library_godot_display.js`
    /// `godot_js_display_notification_cb`). Reached while this method's `&mut self` is live, that
    /// notification panics at `bind_mut` ("already bound"). Holding the base guard marks the borrow
    /// inaccessible for the duration of `call`, which is what makes a re-entrant call legal: the
    /// guard is the same one `self.base_mut().grab_focus()` takes.
    fn call_engine<R>(&mut self, call: impl FnOnce() -> R) -> R {
        let _reentrancy = self.base_mut();
        call()
    }

    fn window_id(&self) -> i32 {
        self.base()
            .get_window()
            .map_or(MAIN_WINDOW_ID, |window| window.get_window_id())
    }

    /// The OS window gained or lost focus: the caret is drawn (and blinks) only while it has it.
    pub(crate) fn text_input_window_focus(&mut self, focused: bool) {
        if self.text_inputs.window_unfocused == !focused {
            return;
        }
        self.text_inputs.window_unfocused = !focused;
        if let Some(tag) = self.focused_text_input() {
            if let Some(state) = self.text_state_mut(tag) {
                state.blink.restart();
            }
            self.repaint_text_input(tag);
        }
        self.update_process();
    }

    /// A key or a press reached the root, so its window is the active one whatever the OS last said
    /// (a window that cannot become the key window, as a verifier's is not, never hears of gaining
    /// focus, and the activation click of an inactive window is delivered).
    pub(crate) fn note_window_active(&mut self) {
        self.text_input_window_focus(true);
    }

    /// Focus moved from `previous` to `next`, either of which may be a text input.
    pub(crate) fn text_input_focus_changed(&mut self, previous: Option<u32>, next: Option<u32>) {
        if let Some(tag) = previous.filter(|tag| self.text_state(*tag).is_some()) {
            self.text_input_blurred(tag);
        }
        if let Some(tag) = next.filter(|tag| self.text_state(*tag).is_some()) {
            self.text_input_focused(tag);
        }
        // The focused input's caret blinks, which needs frames.
        self.update_process();
    }

    fn text_input_blurred(&mut self, tag: u32) {
        self.text_inputs.drag = None;
        // An unfinished composition is committed with the focus, as `LineEdit::unedit` applies it
        // (`apply_ime`) and a browser commits it on blur: the preedit becomes an insertion at the caret, through
        // `beforeinput` like any other, which JS can refuse (and then the preedit is gone). The platform session
        // ends below and takes the OS's own copy of the marked text with it, so nothing is inserted twice.
        //
        // Blur happens in the middle of many things (a commit that disabled the input, a press, Tab, the root
        // losing key focus), and `beforeinput` waits for JS, which is only for input-origin entry points
        // (plan 3.3). The composition ends here, so the input is in a settled state, and the insertion is made
        // from the next frame (`commit_blurred_preedits`).
        let preedit = self.text_state(tag).and_then(|state| {
            state
                .buffer
                .composition()
                .map(|composition| composition.text().iter().collect::<String>())
        });
        if let Some(preedit) = preedit {
            self.run_internal_command(tag, EditCommand::CancelComposition);
            self.text_inputs.blurred_preedits.push((tag, preedit));
        }
        self.end_platform_text_session();
        self.repaint_text_input(tag);
    }

    /// Insert the preedits of the inputs that lost focus while composing (see [`Self::text_input_blurred`]). An
    /// input that is gone, or read-only, takes nothing; `beforeinput` can prevent the insertion.
    pub(crate) fn commit_blurred_preedits(&mut self) {
        for (tag, preedit) in std::mem::take(&mut self.text_inputs.blurred_preedits) {
            if self.text_state(tag).is_none() {
                continue;
            }
            self.run_text_command(tag, EditCommand::InsertText(preedit));
        }
    }

    /// Whether a pointer is down on `tag` right now: the press that is focusing it, if it is being focused. A
    /// pointer that was used last (`modality`) says nothing of this: `focus()` from a click handler happens with
    /// the pointer up, long after the press.
    fn pointer_is_down_on(&self, tag: u32) -> bool {
        self.pointers.iter().any(|(_, record)| {
            record
                .press_of(DOM_BUTTON_PRIMARY)
                .is_some_and(|press| press.target == tag)
        })
    }

    fn text_input_focused(&mut self, tag: u32) {
        let pointer_press = self.pointer_is_down_on(tag);
        let Some(select_on_focus) = self
            .mounted
            .nodes
            .get(&tag)
            .map(|node| node.props.select_on_focus == Some(true))
        else {
            return;
        };
        if let Some(state) = self.text_state_mut(tag) {
            state.blink.restart();
            state.selected_by_focusing_press = false;
        }
        if select_on_focus {
            self.run_internal_command(tag, EditCommand::SelectAll);
            if let Some(state) = self.text_state_mut(tag) {
                // The click that focused it must not collapse the selection when it is released.
                state.selected_by_focusing_press = pointer_press;
            }
        }
        self.begin_platform_text_session(tag);
        self.reveal_text_caret(tag);
        self.repaint_text_input(tag);
    }

    /// The IME and the on-screen keyboard open for the focused input (`LineEdit::_edit`).
    fn begin_platform_text_session(&mut self, tag: u32) {
        self.update_ime_position(tag);
        self.show_virtual_keyboard(tag);
    }

    /// The IME and the on-screen keyboard close (`LineEdit::unedit`, `_close_ime_window`).
    pub(crate) fn end_platform_text_session(&mut self) {
        if !self.base().is_inside_tree() {
            return;
        }
        let window_id = self.window_id();
        let mut display = DisplayServer::singleton();
        let has_ime = display.has_feature(Feature::IME);
        let has_virtual_keyboard = display.has_feature(Feature::VIRTUAL_KEYBOARD);
        self.call_engine(|| {
            if has_ime {
                display
                    .window_set_ime_position_ex(Vector2i::ZERO)
                    .window_id(window_id)
                    .done();
                display
                    .window_set_ime_active_ex(false)
                    .window_id(window_id)
                    .done();
            }
            if has_virtual_keyboard {
                display.virtual_keyboard_hide();
            }
        });
    }

    /// Put the IME window at the caret of the input (`LineEdit::_update_ime_window_position`): the
    /// caret's left edge and the bottom of its line, in the OS window's coordinates.
    pub(crate) fn update_ime_position(&mut self, tag: u32) {
        if self.focused != Some(tag) || !self.base().is_inside_tree() {
            return;
        }
        let mut display = DisplayServer::singleton();
        // A read-only input takes no composition (as `LineEdit::_edit` does nothing for one that is not
        // editable), so the platform's IME stays off for it: it would swallow keys into a preedit that is
        // ignored.
        let read_only = self
            .text_state(tag)
            .is_some_and(|state| state.buffer.config().read_only);
        if read_only || !display.has_feature(Feature::IME) {
            return;
        }
        let window_id = self.window_id();
        self.call_engine(|| {
            display
                .window_set_ime_active_ex(true)
                .window_id(window_id)
                .done();
        });
        let caret = match self.text_input_caret_position(tag) {
            Ok(caret) => caret,
            Err(error) => {
                godot_error!("ReactUiRoot: text input {tag}: cannot place the IME window: {error}");
                return;
            }
        };
        let in_viewport = self.base().get_global_position() + caret;
        let on_screen = match self.base().get_window() {
            Some(window) => screen_transform(&window) * in_viewport,
            None => in_viewport,
        };
        self.call_engine(|| {
            display
                .window_set_ime_position_ex(Vector2i::new(on_screen.x as i32, on_screen.y as i32))
                .window_id(window_id)
                .done();
        });
    }

    /// Ask the platform for its on-screen keyboard for the input (`LineEdit::show_virtual_keyboard`):
    /// the text, its type, the `maxLength`, and the selection. The browser's hidden DOM input takes
    /// the selection in UTF-16 units, and a keyboard that cannot be shown here is simply not shown.
    pub(crate) fn show_virtual_keyboard(&mut self, tag: u32) {
        let mut display = DisplayServer::singleton();
        if !display.has_feature(Feature::VIRTUAL_KEYBOARD) || self.focused != Some(tag) {
            return;
        }
        let (Some(node), Some(state)) = (self.mounted.nodes.get(&tag), self.text_state(tag)) else {
            return;
        };
        let config = state.buffer.config();
        if config.read_only {
            return;
        }
        let value = state.buffer.value();
        let (start, end) = state.buffer.selection_utf16();
        let rect = self
            .mounted
            .absolute_geometry(tag, self.viewport_box())
            .map_or(Rect2::default(), |(rect, _)| rect.godot_rect());
        let kind = keyboard_type(node.props.keyboard_type, config.multiline, config.secure);
        let max_length = node
            .props
            .max_length
            .and_then(|length| i32::try_from(length).ok())
            .unwrap_or(-1);
        let (start, end) = (
            i32::try_from(start).unwrap_or(i32::MAX),
            i32::try_from(end).unwrap_or(i32::MAX),
        );
        self.call_engine(|| {
            display
                .virtual_keyboard_show_ex(value.as_str())
                .position(rect)
                .type_(kind)
                .max_length(max_length)
                .cursor_start(start)
                .cursor_end(end)
                .done();
        });
    }

    /// Run `command` the way a user's input does, but without `beforeinput`: the commands native
    /// itself issues (the pointer's, the focus's), whose events follow.
    pub(crate) fn run_internal_command(&mut self, tag: u32, command: EditCommand) {
        match self.apply_text_command(tag, command) {
            Ok(result) => self.finish_text_command(tag, result),
            Err(error) => {
                godot_error!("ReactUiRoot: text input {tag}: {error}");
            }
        }
    }

    /// The OS reported a change of the IME's composition (`NOTIFICATION_OS_IME_UPDATE`): show its
    /// preedit in the focused input, or end the composition when it is empty.
    pub(crate) fn text_input_ime_update(&mut self) {
        let Some(tag) = self.focused_text_input() else {
            return;
        };
        let display = DisplayServer::singleton();
        let text = display.ime_get_text().to_string();
        // The window the IME writes to is not focused: a preedit would be shown in a field that
        // cannot be typed into (`line_edit.cpp:1701`).
        if self.text_inputs.window_unfocused && !text.is_empty() {
            return;
        }
        let selection = display.ime_get_selection();
        let length = text.chars().count();
        let start = usize::try_from(selection.x).unwrap_or(0).min(length);
        let converted = usize::try_from(selection.y).unwrap_or(0);
        let end = start.saturating_add(converted).min(length);
        let composing = self
            .text_state(tag)
            .is_some_and(|state| state.buffer.composition().is_some());
        if text.is_empty() && !composing {
            return;
        }
        self.restart_caret_blink(tag);
        self.run_composition(
            tag,
            EditCommand::UpdateComposition {
                text,
                selection: start..end,
            },
        );
    }

    /// Apply an IME command and send what follows. An IME is not a key press, so JS can neither see
    /// nor prevent the preedit, only the `composition*` events and the value that is committed.
    fn run_composition(&mut self, tag: u32, command: EditCommand) {
        if self
            .text_state(tag)
            .is_some_and(|state| state.buffer.check_allowed(&command).is_some())
        {
            return;
        }
        self.run_internal_command(tag, command);
    }

    /// The virtual keyboard's whole text arrived (`Viewport::_push_text_input` calls `_set_text` on the
    /// key-focus Control, `scene/main/viewport.cpp:2856-2868`): replace the focused input's text and
    /// put the caret at 0, after which the engine presses Right once per character the keyboard's
    /// caret is past (`platform/web/display_server_web.cpp:801-823`). It is an `insertReplacementText`
    /// edit that JS can prevent. `emit_signal` is `LineEdit`'s `text_changed` flag, which means
    /// nothing here: JS always learns of a change through `input`.
    pub(crate) fn set_text_from_virtual_keyboard(&mut self, text: &str) {
        let Some(tag) = self.focused_text_input() else {
            return;
        };
        self.restart_caret_blink(tag);
        let multiline = self
            .text_state(tag)
            .is_some_and(|state| state.buffer.config().multiline);
        let text = super::sanitize_value(text, multiline);
        self.run_text_command(tag, EditCommand::ReplaceText(text));
    }
}

/// The transform from the window's viewport to the OS window's coordinates.
fn screen_transform(window: &Gd<Window>) -> Transform2D {
    window.get_screen_transform()
}
