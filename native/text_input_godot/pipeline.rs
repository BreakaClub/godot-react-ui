//! Running a command on a text input: the key that asked for it, `beforeinput`, the edit, and the
//! `input` and `selectionchange` events that follow (plan 3.18), and the commands JS gives
//! (`set_text_and_selection`, `set_text_selection`, `get_text_input_state`).
//!
//! The order of one key press is fixed:
//!
//! 1. the key resolves to a command (`keys.rs`);
//! 2. `check_allowed` says whether the input's modes forbid it, and JS hears nothing of a command
//!    that cannot run;
//! 3. `beforeinput` goes to JS, cancelable, and native waits for the answer (a prevented command
//!    changes nothing and still consumes the key);
//! 4. the edit buffer applies the command against layouts of the buffer's own text;
//! 5. `input` is delivered, so that JS can answer it with `setTextAndSelection` before native sends
//!    anything that describes the text; then
//! 6. `selectionchange` is sent if the selection now differs from the last one JS was told of,
//!    read after JS had its say. A reverted edit therefore sends no stale numbers.

use godot::classes::InputEventKey;
use godot::prelude::*;
use serde_json::{Value, json};

use super::keys::{KeyRequest, request_for, typed_text};
use super::shaping::{display_string, dominant_direction};
use super::{TextInputError, TextInputState};
use crate::ReactUiRoot;
use crate::events::{
    BeforeInputData, CompositionData, EventPayload, InputData, Modifiers, SelectionChangeData,
};
use crate::props::Kind;
use crate::text_input::{
    BoundaryLists, ClipboardEffect, CompositionEvent, EditCommand, EditEnvironment, EditResult,
    SetTextOutcome,
};
use crate::text_layout::TextDirection;
use crate::text_offsets::{code_point_range_to_utf16, utf16_range_to_code_points};

/// What a command from JS that carries an `eventCount` did.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TextCommandOutcome {
    Applied,
    /// The user typed since JS read the count, so the command was ignored (plan 3.18).
    Stale,
}

/// Whether applying `command` asks the injected boundaries (graphemes and words) or line layout
/// anything. A command that does not is applied without shaping the text.
fn needs_boundaries(command: &EditCommand, multiline: bool) -> bool {
    match command {
        EditCommand::SelectWordAt(_)
        | EditCommand::DeleteGrapheme(_)
        | EditCommand::DeleteWord(_)
        | EditCommand::MoveGrapheme { .. }
        | EditCommand::MoveWord { .. } => true,
        // A single-line input's line is its text, which needs no layout; a multi-line one asks.
        EditCommand::DeleteToLineEdge(_)
        | EditCommand::MoveLineEdge { .. }
        | EditCommand::MoveLine { .. }
        | EditCommand::MovePage { .. } => multiline,
        EditCommand::InsertText(_)
        | EditCommand::InsertLineBreak
        | EditCommand::ReplaceText(_)
        | EditCommand::PasteText(_)
        | EditCommand::Paste
        | EditCommand::Copy
        | EditCommand::Cut
        | EditCommand::Undo
        | EditCommand::Redo
        | EditCommand::SelectAll
        | EditCommand::SetSelection { .. }
        | EditCommand::MoveDocumentEdge { .. }
        | EditCommand::UpdateComposition { .. }
        | EditCommand::CancelComposition => false,
    }
}

impl ReactUiRoot {
    pub(crate) fn text_state(&self, tag: u32) -> Option<&TextInputState> {
        self.mounted
            .nodes
            .get(&tag)
            .and_then(|node| node.text_input.as_ref())
    }

    pub(crate) fn text_state_mut(&mut self, tag: u32) -> Option<&mut TextInputState> {
        self.mounted
            .nodes
            .get_mut(&tag)
            .and_then(|node| node.text_input.as_mut())
    }

    /// The focused element, if it is a text input that can be typed into or selected in.
    pub(crate) fn focused_text_input(&self) -> Option<u32> {
        self.focused.filter(|tag| self.text_state(*tag).is_some())
    }

    /// Whether the IME is composing in the focused text input, which `keydown.isComposing` reports.
    pub(crate) fn text_input_is_composing(&self) -> bool {
        self.focused_text_input()
            .and_then(|tag| self.text_state(tag))
            .is_some_and(|state| state.buffer.composition().is_some())
    }

    /// The default action of a `keydown` aimed at the focused text input. Returns whether native
    /// acted on the key, which keeps it from the game.
    pub(crate) fn text_input_key_down(
        &mut self,
        tag: u32,
        key: &Gd<InputEventKey>,
        modifiers: Modifiers,
    ) -> bool {
        self.note_window_active();
        let Some(config) = self.text_state(tag).map(|state| state.buffer.config()) else {
            return false;
        };
        let request = match self.text_inputs.actions.action_of(key, config.multiline) {
            Some(action) => request_for(action, modifiers.shift_key, config),
            None => match typed_text(
                key.get_unicode(),
                modifiers.ctrl_key,
                modifiers.alt_key,
                modifiers.meta_key,
            ) {
                Some(text) => KeyRequest::Edit(EditCommand::InsertText(text)),
                None => return false,
            },
        };
        self.restart_caret_blink(tag);
        match request {
            KeyRequest::Submit => true,
            KeyRequest::SwapInputDirection => {
                self.swap_input_direction(tag);
                true
            }
            KeyRequest::Edit(command) => self.run_text_command(tag, command),
        }
    }

    /// Whether the focused text input `tag` has an action for `key`, which is what `text_input_key_down` acts on, asked without acting.
    /// A key that only types text has no action; the keys asked about before they come are chords (`key_claims.rs`).
    pub(crate) fn text_input_claims_key(&self, tag: u32, key: &Gd<InputEventKey>) -> bool {
        let Some(config) = self.text_state(tag).map(|state| state.buffer.config()) else {
            return false;
        };
        self.text_inputs
            .actions
            .action_of(key, config.multiline)
            .is_some()
    }

    fn swap_input_direction(&mut self, tag: u32) {
        if let Some(state) = self.text_state_mut(tag) {
            state.input_direction = match state.input_direction {
                TextDirection::Ltr => TextDirection::Rtl,
                TextDirection::Rtl => TextDirection::Ltr,
            };
            state.generation += 1;
        }
        self.repaint_text_input(tag);
    }

    /// Run `command` on the text input `tag` as the user's: `beforeinput` first (for the commands
    /// that edit), then the edit, then the events. Returns whether the key that asked for it is
    /// consumed.
    pub(crate) fn run_text_command(&mut self, tag: u32, command: EditCommand) -> bool {
        let Some(state) = self.text_state(tag) else {
            return false;
        };
        if state.buffer.check_allowed(&command).is_some() {
            // The mode forbids it, so JS hears nothing of it. A character typed into a read-only
            // input is not the input's key, but a Backspace is (`LineEdit` consumes it).
            return !matches!(command, EditCommand::InsertText(_));
        }
        if let Some(input_type) = command.input_type() {
            let before = BeforeInputData {
                input_type: input_type.as_str(),
                data: command.data().map(str::to_string),
            };
            let prevented = self
                .dispatch_cancelable(tag, EventPayload::BeforeInput(before))
                .default_prevented;
            // JS may have unmounted the root or removed the input, or made it read-only.
            if !self.base().is_inside_tree() || self.text_state(tag).is_none() {
                return true;
            }
            if prevented {
                return true;
            }
            let still_allowed = self
                .text_state(tag)
                .is_some_and(|state| state.buffer.check_allowed(&command).is_none());
            if !still_allowed {
                return true;
            }
        }
        let result = match self.apply_text_command(tag, command) {
            Ok(result) => result,
            Err(error) => {
                godot_error!("ReactUiRoot: text input {tag}: {error}");
                return true;
            }
        };
        self.finish_text_command(tag, result);
        true
    }

    /// Apply `command` to the buffer of `tag` against layouts of the buffer's text, without events.
    pub(crate) fn apply_text_command(
        &mut self,
        tag: u32,
        command: EditCommand,
    ) -> Result<EditResult, TextInputError> {
        let (config, direction) = {
            let state = self.text_state(tag).ok_or(TextInputError::NotShaped)?;
            (state.buffer.config(), state.input_direction)
        };
        let layout = if needs_boundaries(&command, config.multiline) {
            Some(self.buffer_layout(tag)?)
        } else {
            None
        };
        let boundaries = match &layout {
            Some(layout) => layout.boundaries()?,
            // Never asked: `apply` checks the text a list was built for only when it is queried.
            None => BoundaryLists::new(vec![0], Vec::new())?,
        };
        let page_height = self
            .input_frame(tag)
            .map_or(0.0, |frame| frame.content_height);
        let lines = match (&layout, config.multiline) {
            (Some(layout), true) => Some(layout.line_layout(direction, page_height)?),
            _ => None,
        };
        let environment = EditEnvironment::new(&boundaries);
        let environment = match &lines {
            Some(lines) => environment.with_layout(lines),
            None => environment,
        };
        let state = self.text_state_mut(tag).ok_or(TextInputError::NotShaped)?;
        Ok(state.buffer.apply(command, &environment)?)
    }

    /// Everything that follows a command that ran: the clipboard, re-shaping, scrolling to the caret,
    /// drawing, and the events (`input` before `selectionchange`, plan 3.18).
    pub(super) fn finish_text_command(&mut self, tag: u32, result: EditResult) {
        match &result.clipboard {
            Some(ClipboardEffect::Write(text)) => {
                crate::clipboard::write(text.as_str());
            }
            Some(ClipboardEffect::Read) => {
                self.paste_from_clipboard(tag);
                return;
            }
            None => {}
        }
        let reshaped = result.text_changed || result.composition != CompositionEvent::None;
        if result.text_changed {
            self.follow_input_direction(tag, &result);
        }
        if reshaped {
            self.reshape_display(tag);
        }
        self.settle_text_input(tag, reshaped);
        self.queue_composition_events(tag, result.composition);
        if result.text_changed {
            self.queue_input_event(tag, &result);
            // JS may answer `input` with `setTextAndSelection` (a transformed or rejected value),
            // so the selection is read, and `selectionchange` sent, only after it had its say. A
            // command that changed no text has no answer to wait for; its events go with the
            // caller's delivery.
            self.deliver();
        }
        self.report_selection(tag);
    }

    /// After a change: lay out again if the text changed (the scroll ranges), scroll the caret into
    /// view, restart its blink and draw.
    pub(crate) fn settle_text_input(&mut self, tag: u32, reshaped: bool) {
        self.restart_caret_blink(tag);
        if reshaped {
            self.flush_layout();
        } else {
            self.paint_dirty.insert(tag);
            self.paint_pass();
        }
        self.reveal_text_caret(tag);
        self.update_ime_position(tag);
    }

    /// `LineEdit` types the next character in the dominant direction of what it just inserted.
    fn follow_input_direction(&mut self, tag: u32, result: &EditResult) {
        let Some(inserted) = result.data.as_deref().filter(|text| !text.is_empty()) else {
            return;
        };
        let Some(state) = self.text_state(tag) else {
            return;
        };
        if state.buffer.config().secure {
            return;
        }
        let caret = state.buffer.focus();
        let length = inserted.chars().count();
        let Some(start) = caret.checked_sub(length) else {
            return;
        };
        // The text the buffer holds now, shaped on its own (the display paragraph is stale).
        let Some(font) = self.font.as_ref() else {
            return;
        };
        let (font_size, multiline) = match state.shaped.as_ref() {
            Some(shaped) => (shaped.font_size, state.buffer.config().multiline),
            None => return,
        };
        let text = display_string(state);
        let paragraph = super::shaping::shape(font, &text, font_size, multiline);
        if let Some(direction) = dominant_direction(&paragraph, start..caret)
            && let Some(state) = self.text_state_mut(tag)
        {
            state.input_direction = direction;
        }
    }

    fn queue_input_event(&mut self, tag: u32, result: &EditResult) {
        let Some(state) = self.text_state(tag) else {
            return;
        };
        let Some(input_type) = result.input_type else {
            godot_error!("ReactUiRoot: text input {tag} changed its text with no input type");
            return;
        };
        let (selection_start, selection_end) = state.buffer.selection_utf16();
        let data = InputData {
            input_type: input_type.as_str(),
            data: result.data.clone(),
            value: state.buffer.value(),
            selection_start,
            selection_end,
            event_count: result.event_count,
        };
        self.queue(tag, EventPayload::Input(data));
    }

    fn queue_composition_events(&mut self, tag: u32, composition: CompositionEvent) {
        let data = self
            .text_state(tag)
            .and_then(|state| state.buffer.composition())
            .map(|composition| composition.text().iter().collect::<String>())
            .unwrap_or_default();
        let payload = CompositionData { data };
        match composition {
            CompositionEvent::None => {}
            CompositionEvent::Start => {
                self.queue(
                    tag,
                    EventPayload::CompositionStart(CompositionData {
                        data: String::new(),
                    }),
                );
                self.queue(tag, EventPayload::CompositionUpdate(payload));
            }
            CompositionEvent::Update => self.queue(tag, EventPayload::CompositionUpdate(payload)),
            CompositionEvent::End => self.queue(tag, EventPayload::CompositionEnd(payload)),
        }
    }

    /// Queue `selectionchange` if the selection is not where JS last heard it was.
    pub(crate) fn report_selection(&mut self, tag: u32) {
        let Some(state) = self.text_state_mut(tag) else {
            return;
        };
        let now = state.buffer.selection_utf16();
        if now == state.reported_selection {
            self.sync_web_selected_text(None);
            self.sync_touch_chrome();
            return;
        };
        state.reported_selection = now;
        self.sync_web_selected_text(None);
        self.sync_touch_chrome();
        self.queue(
            tag,
            EventPayload::SelectionChange(SelectionChangeData {
                selection_start: now.0,
                selection_end: now.1,
            }),
        );
    }

    // ---- Commands from JS -------------------------------------------------------------------

    /// `setTextAndSelection(eventCount, value, start, end)` (plan 3.18, 4.4). `start` and `end` are
    /// UTF-16 offsets into `value`, both -1 for the caret at the end. A stale `event_count` is
    /// ignored, not an error. No `input` event follows a programmatic change; the selection's
    /// `selectionchange` is queued for the next delivery.
    pub(crate) fn set_text_and_selection_checked(
        &mut self,
        tag: u32,
        event_count: i64,
        value: &str,
        start: i64,
        end: i64,
    ) -> Result<TextCommandOutcome, String> {
        let event_count = u64::try_from(event_count)
            .map_err(|_| format!("eventCount {event_count} is negative"))?;
        let multiline = self
            .text_state(tag)
            .map(|state| state.buffer.config().multiline)
            .ok_or_else(|| format!("node {tag} is not a text input"))?;
        let value = super::sanitize_value(value, multiline);
        let selection = match (start, end) {
            (-1, -1) => None,
            (start, end) if start >= 0 && end >= start => {
                let (start, end) = (start as usize, end as usize);
                Some(
                    utf16_range_to_code_points(value.chars(), start, end)
                        .map_err(|error| format!("selection: {error}"))
                        .map(|(start, end)| start..end)?,
                )
            }
            (start, end) => {
                return Err(format!(
                    "selection {start}..{end} is not -1..-1 or a range with 0 <= start <= end"
                ));
            }
        };
        let state = self
            .text_state_mut(tag)
            .ok_or_else(|| format!("node {tag} is not a text input"))?;
        let outcome = state
            .buffer
            .set_text_and_selection(event_count, &value, selection)
            .map_err(|error| TextInputError::from(error).to_string())?;
        let SetTextOutcome::Applied(result) = outcome else {
            return Ok(TextCommandOutcome::Stale);
        };
        self.queue_composition_events(tag, result.composition);
        self.reshape_display(tag);
        self.settle_text_input(tag, true);
        self.report_selection(tag);
        // An on-screen keyboard on the Web types into an element of the page that holds the text it last saw.
        self.sync_virtual_keyboard_element(tag, true);
        Ok(TextCommandOutcome::Applied)
    }

    /// `setSelectionRange(start, end, direction)`: UTF-16 offsets into the current text, `backward`
    /// putting the caret at `start`. Does not touch the undo history, unlike `setTextAndSelection`.
    pub(crate) fn set_text_selection_checked(
        &mut self,
        tag: u32,
        start: i64,
        end: i64,
        backward: bool,
    ) -> Result<(), String> {
        let state = self
            .text_state(tag)
            .ok_or_else(|| format!("node {tag} is not a text input"))?;
        let (Ok(start), Ok(end)) = (usize::try_from(start), usize::try_from(end)) else {
            return Err(format!("selection {start}..{end} must not be negative"));
        };
        if start > end {
            return Err(format!("selection {start}..{end} starts after it ends"));
        }
        let (start, end) =
            utf16_range_to_code_points(state.buffer.text().iter().copied(), start, end)
                .map_err(|error| format!("selection: {error}"))?;
        let (anchor, focus) = if backward { (end, start) } else { (start, end) };
        let result = self
            .apply_text_command(tag, EditCommand::SetSelection { anchor, focus })
            .map_err(|error| error.to_string())?;
        self.finish_programmatic_selection(tag, result);
        Ok(())
    }

    fn finish_programmatic_selection(&mut self, tag: u32, result: EditResult) {
        let reshaped = result.composition != CompositionEvent::None;
        if reshaped {
            self.reshape_display(tag);
        }
        self.queue_composition_events(tag, result.composition);
        self.settle_text_input(tag, reshaped);
        self.report_selection(tag);
    }

    // ---- Queries ----------------------------------------------------------------------------

    /// `getTextInputState(tag)`: the value and selection (UTF-16) as JS reads them, the event count
    /// a `setTextAndSelection` must carry, and whether an IME is composing. `null` for anything that
    /// is not a text input.
    pub(crate) fn text_input_state_json(&self, tag: u32) -> Value {
        let Some(node) = self
            .mounted
            .nodes
            .get(&tag)
            .filter(|node| node.kind == Kind::TextInput)
        else {
            return Value::Null;
        };
        let Some(state) = node.text_input.as_ref() else {
            return Value::Null;
        };
        let (selection_start, selection_end) = state.buffer.selection_utf16();
        let backward = state.buffer.focus() < state.buffer.anchor();
        let preedit = state.buffer.composition().map(|composition| {
            let text: String = composition.text().iter().collect();
            let selected = composition.selection();
            let converting = code_point_range_to_utf16(
                composition.text().iter().copied(),
                selected.start,
                selected.end,
            )
            .unwrap_or((0, 0));
            json!({"text": text, "selectionStart": converting.0, "selectionEnd": converting.1})
        });
        json!({
            "value": state.buffer.value(),
            "selectionStart": selection_start,
            "selectionEnd": selection_end,
            "selectionDirection": if backward { "backward" } else { "forward" },
            "eventCount": state.buffer.event_count(),
            "composing": state.buffer.composition().is_some(),
            "preedit": preedit,
            "scrollLeft": node.scroll.offset.x,
            "scrollTop": node.scroll.offset.y,
            "caretVisible": state.blink.visible,
            "inputDirection": match state.input_direction {
                TextDirection::Ltr => "ltr",
                TextDirection::Rtl => "rtl",
            },
        })
    }

    /// A text input's state for the snapshot: `getTextInputState`'s, and what is drawn (the display
    /// text, whether the placeholder shows, the caret's rectangle). `null` for any other node.
    pub(crate) fn text_input_snapshot_json(&self, tag: u32) -> Value {
        let mut value = self.text_input_state_json(tag);
        if let (Value::Object(map), Some(state)) = (&mut value, self.text_state(tag)) {
            map.insert("displayText".to_string(), json!(display_string(state)));
            map.insert(
                "showingPlaceholder".to_string(),
                json!(
                    state.buffer.text().is_empty()
                        && state.buffer.composition().is_none()
                        && state
                            .shaped
                            .as_ref()
                            .is_some_and(|shaped| shaped.placeholder.is_some())
                ),
            );
            map.insert("caret".to_string(), self.text_input_caret_json(tag));
        }
        value
    }

    /// What the text input draws as the caret, in root-local pixels, for diagnostics: the rectangle
    /// of its primary caret, or `null` while it cannot be laid out.
    pub(crate) fn text_input_caret_json(&self, tag: u32) -> Value {
        let Some(affine) = self.mounted.absolute_affine(tag, self.viewport_box()) else {
            return Value::Null;
        };
        let Some(state) = self.text_state(tag) else {
            return Value::Null;
        };
        let Ok(layout) = self.display_layout(tag) else {
            return Value::Null;
        };
        let offset = state.caret_display_offset();
        let Ok(caret) = layout.caret(offset, state.input_direction) else {
            return Value::Null;
        };
        let scroll = self.mounted.nodes.get(&tag).map_or(Vector2::ZERO, |node| {
            crate::scroll_input::to_vector(node.scroll.offset)
        });
        // Root-local, and the bounding box of the caret when the field is turned.
        let drawn = affine.bounds_of(crate::geometry::BoxRect {
            x: caret.x - scroll.x,
            y: caret.top - scroll.y,
            width: super::CARET_WIDTH_PX,
            height: caret.height,
        });
        json!({
            "x": drawn.x, "y": drawn.y, "width": drawn.width, "height": drawn.height,
        })
    }
}
