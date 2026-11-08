//! Pointer input: Godot's mouse, touch and gesture events turned into DOM pointer events (plan
//! section 3.12). `pointer_state.rs` holds the per-pointer records, capture and click counting
//! (all unit tested); this module reads the engine's events, hit tests, queues the events JS
//! receives and runs the default actions.

use godot::classes::{
    InputEventMouseButton, InputEventMouseMotion, InputEventPanGesture, InputEventScreenDrag,
    InputEventScreenTouch,
};
use godot::prelude::*;

use crate::drag_input::{MOUSE_DRAG_POINTER, touch_drag_pointer};
use crate::events::{EventPayload, PointerData, PointerType, WheelData};
use crate::focus::{Modality, nearest_focusable};
use crate::pointer::{
    DOM_BUTTON_NONE, DOM_BUTTON_PRIMARY, DOM_BUTTON_SECONDARY, DOM_BUTTONS_PRIMARY,
    MOUSE_POINTER_ID, click_target_of, dom_button_of, wheel_ticks,
};
use crate::pointer_state::{Capture, PointerKind, Press, touch_pointer_id};
use crate::scroll::{ScrollInput, Vec2, wheel_factor};
use crate::{ROOT_TARGET, ReactUiRoot, event_time_ms, modifiers_of};

/// The click count at which a `dblclick` follows the `click`.
const DOUBLE_CLICK_DETAIL: u32 = 2;

/// What produced a `wheel` event: a mouse wheel notch, or a trackpad's pan gesture. Both are in wheel
/// ticks (decision D13); only the wheel's Shift key swaps the axes (`scroll_container.cpp:187`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum WheelSource {
    Wheel,
    PanGesture,
}

impl ReactUiRoot {
    pub(crate) fn handle_mouse_motion(&mut self, motion: &Gd<InputEventMouseMotion>) {
        self.track_mouse(
            motion.get_position(),
            motion.get_button_mask(),
            modifiers_of(motion),
        );
        // A scrollbar thumb being dragged owns the mouse: the content follows, and neither the hover
        // nor JS hears of the movement.
        if self.thumb_drag_moved() {
            return;
        }
        // A pointer that is dragging something owns the mouse as well: the drag hears the movement,
        // and neither the hover nor the pointer events do.
        if self.drag_pointer_moved(MOUSE_POINTER_ID, self.pointer) {
            return;
        }
        // A selection being dragged in a text input follows the pointer; the movement still reaches JS.
        self.text_input_pointer_move();
        let hit = self.mounted.hit_test(self.pointer);
        self.update_hover(hit);
        self.pointers.moved(
            MOUSE_POINTER_ID,
            PointerKind::Mouse,
            self.pointer,
            self.pointer_buttons,
        );
        // A text selection being dragged out follows the pointer (plan 3.12 rule 5).
        self.selection_drag_moved(hit);
        // A captured pointer's moves belong to the capturing element wherever the pointer is.
        if let Some(target) = self.pointers.target_for(MOUSE_POINTER_ID, hit) {
            let data = self.mouse_pointer_data(DOM_BUTTON_NONE, 0, None);
            self.queue(target, EventPayload::PointerMove(data));
        }
    }

    /// A press or release of any mouse button, or a wheel tick.
    pub(crate) fn handle_mouse_button(&mut self, button: &Gd<InputEventMouseButton>) {
        // A platform that reports no factor means one notch (`scroll::wheel_factor`).
        if let Some((delta_x, delta_y)) =
            wheel_ticks(button.get_button_index(), wheel_factor(button.get_factor()))
        {
            // Godot sends a press and a release for every wheel tick; the tick is the press.
            if button.is_pressed() {
                self.track_mouse(
                    button.get_position(),
                    button.get_button_mask(),
                    modifiers_of(button),
                );
                self.dispatch_wheel(delta_x, delta_y, WheelSource::Wheel);
            }
            return;
        }
        let Some(dom_button) = dom_button_of(button.get_button_index()) else {
            return;
        };
        self.track_mouse(
            button.get_position(),
            button.get_button_mask(),
            modifiers_of(button),
        );
        // While a drag runs the primary button's release ends it (a drop, or the end of a cancelled
        // drag: no `pointerup`, no `click`) and no other button does anything.
        if dom_button == DOM_BUTTON_PRIMARY {
            if !button.is_pressed() && self.drag_pointer_released(MOUSE_POINTER_ID, self.pointer) {
                self.base_mut().accept_event();
                return;
            }
        } else if self.drag_running() {
            self.base_mut().accept_event();
            return;
        }
        let hit = self.mounted.hit_test(self.pointer);
        self.update_hover(hit);
        if button.is_pressed() {
            if !self.press_mouse(dom_button, hit) {
                return;
            }
        } else {
            self.release_mouse(dom_button, hit);
        }
        self.base_mut().accept_event();
    }

    /// A trackpad scroll arrives as a pan gesture rather than wheel buttons; JS sees both as `wheel`.
    /// The delta is in the same ticks `ScrollContainer` scales by page / 8.
    pub(crate) fn handle_pan(&mut self, pan: &Gd<InputEventPanGesture>) {
        self.track_position(pan.get_position(), modifiers_of(pan));
        let delta = pan.get_delta();
        self.dispatch_wheel(delta.x, delta.y, WheelSource::PanGesture);
    }

    /// Hand a wheel tick or pan at the tracked pointer position to JS as a cancelable `wheel`. Unless
    /// JS prevents it, its default action scrolls the scroll containers around the element under the
    /// pointer, chaining outwards (plan 3.16). The event is consumed when JS prevented it or something
    /// scrolled; otherwise it goes on to the game's `_unhandled_input` (plan 3.11).
    fn dispatch_wheel(&mut self, delta_x: f32, delta_y: f32, source: WheelSource) {
        let hit = self.mounted.hit_test(self.pointer);
        // The hover is frozen while a drag runs (I9-3); the drag looks under the pointer itself.
        if !self.drag_in_progress() {
            self.update_hover(hit);
        }
        let pointer = self.mouse_pointer_data(DOM_BUTTON_NONE, 0, None);
        let wheel = WheelData {
            pointer,
            delta_x,
            delta_y,
        };
        let prevented = self
            .dispatch_cancelable(hit.unwrap_or(ROOT_TARGET), EventPayload::Wheel(wheel))
            .default_prevented;
        // JS may have changed the tree, or left it: nothing computed before is trusted (plan 3.3).
        if !self.base().is_inside_tree() {
            return;
        }
        let scrolled = !prevented && {
            let ticks = Vec2::new(delta_x, delta_y);
            let input = match source {
                WheelSource::Wheel => ScrollInput::wheel(ticks, self.pointer_modifiers.shift_key),
                WheelSource::PanGesture => ScrollInput::pan(ticks),
            };
            let target = self.mounted.hit_test(self.pointer);
            self.scroll_chain_from(target, input)
        };
        if (prevented || scrolled) && self.base().is_inside_tree() {
            self.base_mut().accept_event();
        }
    }

    /// Press of mouse button `button`. Returns false when JS left the root outside the scene tree
    /// while handling `pointerdown`: nothing native may run afterwards (plan 3.3 rule 4).
    fn press_mouse(&mut self, button: i8, hit: Option<u32>) -> bool {
        let primary = button == DOM_BUTTON_PRIMARY;
        self.modality = Modality::Pointer;
        // A button pressed while another is down goes where the capture says.
        let target = self
            .pointers
            .target_for(MOUSE_POINTER_ID, hit)
            .filter(|id| !self.mounted.is_disabled(*id));
        let detail = self
            .clicks
            .press(PointerKind::Mouse, button, self.pointer, event_time_ms());
        if primary {
            self.pressed = target;
            self.pressed_by_keyboard = false;
        }
        let mut prevented = false;
        if let Some(id) = target {
            self.pointers.press(
                MOUSE_POINTER_ID,
                PointerKind::Mouse,
                button,
                self.pointer,
                self.pointer_buttons,
                Press { target: id, detail },
            );
            let data = self.mouse_pointer_data(button, 0, None);
            if primary {
                // The `active` style applies from the moment of the press, before handlers run.
                self.refresh_interaction();
                prevented = self
                    .dispatch_cancelable(id, EventPayload::PointerDown(data))
                    .default_prevented;
                if !self.base().is_inside_tree() {
                    return false;
                }
            } else {
                // Nothing native follows a secondary press, so there is nothing to prevent.
                self.queue(id, EventPayload::PointerDown(data));
                if button == DOM_BUTTON_SECONDARY {
                    self.queue(id, EventPayload::ContextMenu(data));
                }
            }
        }
        if primary {
            // Gesture arbitration after an un-prevented `pointerdown` (plan 3.12): a pointer JS captured
            // is its element's (rule 1), then a press on a scrollbar thumb drags the thumb (rule 2), then a
            // press inside a draggable element may become a drag once it moves (rule 3, which also keeps
            // the text inside it from starting a selection, as in browsers); selectable text starts a
            // selection (rule 5).
            let grabbed_thumb =
                !prevented && !self.mouse_is_captured() && self.begin_thumb_drag(hit, self.pointer);
            let draggable = !prevented
                && !grabbed_thumb
                && self.begin_drag_gesture(MOUSE_DRAG_POINTER, self.pointer, hit);
            let selecting = !prevented
                && self.begin_selection_press(
                    hit,
                    detail,
                    !grabbed_thumb && !draggable && !self.mouse_is_captured(),
                );
            self.run_pointerdown_default(hit, prevented, selecting);
            // An un-prevented press in a text input places the caret and may start a selection in it; it
            // is never a document selection (a text input is not selectable text), so the press has
            // cleared that one above. It comes last in the arbitration (plan 3.12): a press on the
            // input's scrollbar thumb is the thumb's, and a draggable element around the input does not
            // take it either (`begin_drag_gesture` declines a press on a text input).
            if !prevented && !grabbed_thumb {
                self.text_input_pointer_down(
                    hit,
                    self.pointer,
                    detail,
                    self.pointer_modifiers.shift_key,
                    !self.mouse_is_captured(),
                );
            }
        }
        true
    }

    /// Release of mouse button `button`: `pointerup`, then `click` (primary) or `auxclick`, then
    /// `dblclick` after the second `click` of a sequence.
    fn release_mouse(&mut self, button: i8, hit: Option<u32>) {
        let primary = button == DOM_BUTTON_PRIMARY;
        // The target is resolved before the release, which ends the capture with the last button.
        let up_target = self
            .pointers
            .target_for(MOUSE_POINTER_ID, hit)
            .filter(|id| !self.mounted.is_disabled(*id));
        let capture = self
            .pointers
            .get(MOUSE_POINTER_ID)
            .and_then(|record| record.capture);
        let press =
            self.pointers
                .release(MOUSE_POINTER_ID, button, self.pointer, self.pointer_buttons);
        if let Some(target) = up_target {
            let data = self.mouse_pointer_data(button, 0, None);
            self.queue(target, EventPayload::PointerUp(data));
        }
        // Letting go of a scrollbar thumb is not a click on the container.
        let dragged_thumb = primary && self.end_thumb_drag();
        if primary {
            self.end_selection_drag();
            self.text_input_pointer_up(hit);
        }
        if let Some(press) = press
            && !dragged_thumb
            && let Some(target) = self.click_target(press.target, hit, capture)
        {
            let data = self.mouse_pointer_data(button, press.detail, None);
            if primary {
                self.queue(target, EventPayload::Click(data));
                if press.detail == DOUBLE_CLICK_DETAIL {
                    self.queue(target, EventPayload::DoubleClick(data));
                }
            } else {
                self.queue(target, EventPayload::AuxClick(data));
            }
        }
        if primary {
            self.pressed = None;
            self.refresh_interaction();
        }
    }

    /// The element a click is dispatched to, if the press and release make one. A pointer an element
    /// asked to capture clicks that element, if the press began inside it. Otherwise it is the nearest
    /// common inclusive ancestor of the press target and the element the pointer was released over
    /// (`pointer::click_target_of`), mouse and touch alike: a press on a row's text that lifts on the
    /// row's padding clicks the row. A release over nothing (which includes beyond the root, where
    /// nothing is hit) or on a disabled element clicks nothing.
    fn click_target(
        &self,
        press_target: u32,
        release_hit: Option<u32>,
        capture: Option<Capture>,
    ) -> Option<u32> {
        if let Some(Capture {
            target,
            implicit: false,
        }) = capture
        {
            return self
                .mounted
                .path_of(press_target)
                .contains(&target)
                .then_some(target);
        }
        click_target_of(&self.mounted, press_target, release_hit?)
    }

    /// A finger went down (or another one did). Returns false when JS left the root outside the
    /// scene tree while handling `pointerdown`.
    fn press_touch(&mut self, id: u32, position: Vector2) -> bool {
        self.modality = Modality::Pointer;
        // The handles and the menu of a touch selection are the root's own: a finger on them is no element's.
        if self.touch_chrome_press(id, position) {
            return true;
        }
        let hit = self.mounted.hit_test(position);
        let target = hit.filter(|tag| !self.mounted.is_disabled(*tag));
        let detail = self.clicks.press(
            PointerKind::Touch,
            DOM_BUTTON_PRIMARY,
            position,
            event_time_ms(),
        );
        let mut prevented = false;
        if let Some(target) = target {
            // A touch arrives from outside every element: JS crosses the whole path, and never sets
            // `hover` (no sticky hover).
            let enter = self.touch_pointer_data(position, id, DOM_BUTTON_NONE, 0, 0);
            self.queue_crossing(target, None, EventPayload::PointerEnter(enter));
            self.pointers.press(
                id,
                PointerKind::Touch,
                DOM_BUTTON_PRIMARY,
                position,
                DOM_BUTTONS_PRIMARY,
                Press { target, detail },
            );
            self.refresh_interaction();
            let down =
                self.touch_pointer_data(position, id, DOM_BUTTON_PRIMARY, DOM_BUTTONS_PRIMARY, 0);
            prevented = self
                .dispatch_cancelable(target, EventPayload::PointerDown(down))
                .default_prevented;
            if !self.base().is_inside_tree() {
                return false;
            }
            // Inside a draggable element a touch held still becomes a drag; one that moves first is
            // declined and goes on to pan or stay pointer events (plan 3.12 rules 3 and 4). A touch that
            // only stopped a coasting flick starts nothing.
            if !prevented {
                self.touch_selection_note_press(id, position);
            }
            let flicking = !self.scrolling.coasting.is_empty();
            let draggable = !prevented
                && !flicking
                && self.begin_drag_gesture(touch_drag_pointer(id), position, hit);
            // A finger JS took (`setPointerCapture` in a `pointerdown` handler) is its element's, not a
            // pan's, as a prevented press is (plan 3.12 rule 1, D33).
            let captured = self.pointers.captured_by_js(id);
            let may_pan = !prevented && !captured;
            self.begin_touch_pan(id, target, position, may_pan);
            // Selectable text and a text input held still become a selection of the word under the finger (plan D71); a draggable
            // element's hold is the drag's.
            if !prevented && !captured && !draggable && !flicking {
                self.touch_selection_arm_hold(id, position, hit);
            }
        }
        // A touch selection survives the press: a pan scrolls it and keeps it, and a tap clears it when the finger lifts (plan D71).
        self.run_pointerdown_default(hit, prevented, self.touch_selection_holds_document());
        if !prevented && !self.touch_defers_caret(id, hit, position, detail) {
            self.text_input_pointer_down(hit, position, detail, false, false);
        }
        true
    }

    /// A finger lifted: `pointerup` and `pointerleave`, then `click` if it ended where it began.
    fn release_touch(&mut self, id: u32, position: Vector2) {
        let hit = self.mounted.hit_test(position);
        let capture = self.pointers.get(id).and_then(|record| record.capture);
        let up_target = self.pointers.target_for(id, hit);
        // A tap that stopped a coasting flick only stopped it. The record is spent by this lift whether
        // or not the touch has a press left: its target may have been removed under the finger.
        let stopped_a_fling = self.touch_stopped_a_fling(id);
        let Some(press) = self.pointers.release(id, DOM_BUTTON_PRIMARY, position, 0) else {
            // A touch native never took (a disabled element, or nothing), or one whose target was
            // removed: nothing to end.
            return;
        };
        if let Some(target) = up_target.filter(|tag| self.mounted.nodes.contains_key(tag)) {
            let up = self.touch_pointer_data(position, id, DOM_BUTTON_PRIMARY, 0, 0);
            self.queue(target, EventPayload::PointerUp(up));
        }
        self.leave_touch(id, position, press.target);
        // The caret a press in a selected text input waited to place goes where the finger lifted, and a tap ends the touch selection.
        if !stopped_a_fling {
            self.touch_selection_tapped(id, position);
        }
        self.text_input_pointer_up(hit);
        if !stopped_a_fling && let Some(target) = self.click_target(press.target, hit, capture) {
            let data = self.touch_pointer_data(position, id, DOM_BUTTON_PRIMARY, 0, press.detail);
            self.queue(target, EventPayload::Click(data));
            if press.detail == DOUBLE_CLICK_DETAIL {
                self.queue(target, EventPayload::DoubleClick(data));
            }
        }
        self.refresh_interaction();
    }

    /// `pointerleave` for the elements a touch entered when it went down.
    fn leave_touch(&mut self, id: u32, position: Vector2, entered: u32) {
        if self.mounted.nodes.contains_key(&entered) {
            let leave = self.touch_pointer_data(position, id, DOM_BUTTON_NONE, 0, 0);
            self.queue_crossing(entered, None, EventPayload::PointerLeave(leave));
        }
    }

    fn touch_pointer_data(
        &self,
        position: Vector2,
        id: u32,
        button: i8,
        buttons: u16,
        detail: u32,
    ) -> PointerData {
        PointerData {
            detail,
            ..self.pointer_data_at(position, id, PointerType::Touch, button, buttons)
        }
    }

    pub(crate) fn handle_touch(&mut self, touch: &Gd<InputEventScreenTouch>) {
        let Some(id) = touch_pointer_id(touch.get_index()) else {
            return;
        };
        let position = touch.get_position();
        if touch.is_pressed() {
            if !self.press_touch(id, position) {
                return;
            }
        } else if touch.is_canceled() {
            self.touch_selection_cancelled(id);
            self.touch_pan_cancelled(id);
            self.cancel_pointer(id);
        } else if self.touch_selection_released(id, position) {
            // A finger that selected, or dragged a handle, or pressed the menu, ended with it.
        } else if !self.drag_pointer_released(id, position) && !self.touch_pan_ended(id) {
            // A finger that was dragging ended with its drop. A finger that was panning has no
            // pointer left to release (it was cancelled when the pan began), and its flick, if any,
            // is under way.
            self.release_touch(id, position);
        }
        if !touch.is_pressed() {
            self.touch_selection_lifted(id);
        }
        self.base_mut().accept_event();
    }

    /// A finger moved. Its events go to the element that captured it (its `pointerdown` target
    /// unless an element took the capture), wherever the finger is.
    pub(crate) fn handle_touch_drag(&mut self, drag: &Gd<InputEventScreenDrag>) {
        let Some(id) = touch_pointer_id(drag.get_index()) else {
            return;
        };
        // A finger that selected a word by a long press, or drags a handle, is the selection's. One still waiting to be a long press
        // stops waiting once it leaves the slop, and is what it was.
        if self.touch_selection_moved(id, drag.get_position()) {
            self.base_mut().accept_event();
            return;
        }
        // A finger that is dragging something is the drag's. One that moved too far before the hold
        // elapsed is declined by the drag, and the pan below decides what it is.
        if self.drag_pointer_moved(id, drag.get_position()) {
            self.base_mut().accept_event();
            return;
        }
        // A touch that has become a pan scrolls its container and sends the element no more events.
        if self.touch_pan_moved(id, drag.get_position()) {
            self.base_mut().accept_event();
            return;
        }
        if !self.pointers.get(id).is_some_and(|record| record.is_down()) {
            // A touch native never took.
            return;
        }
        let position = drag.get_position();
        let hit = self.mounted.hit_test(position);
        self.pointers
            .moved(id, PointerKind::Touch, position, DOM_BUTTONS_PRIMARY);
        if let Some(target) = self.pointers.target_for(id, hit) {
            let data =
                self.touch_pointer_data(position, id, DOM_BUTTON_NONE, DOM_BUTTONS_PRIMARY, 0);
            self.queue(target, EventPayload::PointerMove(data));
        }
        self.base_mut().accept_event();
    }

    /// End pointer `id`'s contact without a release: `pointercancel` (and, for a touch,
    /// `pointerleave`) to the element that was receiving its events; no `pointerup` or `click`
    /// follows. Does nothing for a pointer that is not down.
    pub(crate) fn cancel_pointer(&mut self, id: u32) {
        // A gesture or a drag this pointer was making ends with it (a no-op while the drag machine is
        // itself cancelling the pointer for a drag that began).
        self.drag_input(crate::drag::DragInput::PointerCancel { pointer_id: id });
        let Some((kind, position)) = self
            .pointers
            .get(id)
            .map(|record| (record.kind, record.position))
        else {
            return;
        };
        let entered = self
            .pointers
            .get(id)
            .and_then(|record| record.press_of(DOM_BUTTON_PRIMARY))
            .map(|press| press.target);
        let Some(target) = self.pointers.cancel(id) else {
            return;
        };
        let data = match kind {
            PointerKind::Mouse => {
                self.pointer_data(id, PointerType::Mouse, DOM_BUTTON_NONE, 0, 0, None)
            }
            PointerKind::Touch => self.touch_pointer_data(position, id, DOM_BUTTON_NONE, 0, 0),
        };
        if self.mounted.nodes.contains_key(&target) {
            self.queue(target, EventPayload::PointerCancel(data));
        }
        if kind == PointerKind::Touch
            && let Some(entered) = entered
        {
            self.leave_touch(id, position, entered);
        }
        if kind == PointerKind::Mouse {
            self.pressed = None;
            self.pressed_by_keyboard = false;
            self.end_thumb_drag();
            self.end_selection_drag();
        }
        self.refresh_interaction();
    }

    /// Cancel every pointer that is down (the root left the scene tree, or the window lost focus), and
    /// every pan of a finger that already stopped being one.
    pub(crate) fn cancel_all_pointers(&mut self) {
        for id in self.pointers.active_ids() {
            self.cancel_pointer(id);
        }
        // The pointer of a running drag is no longer in the table; it ends the drag all the same.
        self.cancel_dragging_pointer();
        self.end_all_touch_pans();
        self.end_thumb_drag();
        self.end_selection_drag();
        self.touch_selection_cancel_all();
    }

    /// The default action of a primary `pointerdown`, mouse or touch: the nearest enabled button
    /// takes focus, and pressing anything else clears element focus. A press that did not start (or
    /// extend) a text selection, `keeps_selection`, clears the current one. Skipped if JS prevented the
    /// event or removed the element it was handling (plan 3.3 rule 3). Whatever JS decided, the
    /// root then holds key focus only if an element is focused or a selection is.
    fn run_pointerdown_default(
        &mut self,
        hit: Option<u32>,
        prevented: bool,
        keeps_selection: bool,
    ) {
        let target_removed = hit.is_some_and(|id| !self.mounted.nodes.contains_key(&id));
        if !prevented && !target_removed {
            let focus = hit.and_then(|id| nearest_focusable(&self.mounted, id));
            if focus.is_some() {
                self.base_mut().grab_focus();
            }
            self.set_focus(focus, false);
            if !keeps_selection {
                self.clear_selection_command();
            }
        }
        self.release_key_focus_without_element();
    }

    /// The root holds Godot key focus only for a focused element, a text selection (which needs the
    /// keys that copy and select all), or an owner that asked for it with `grabFocus()` (until the
    /// next press). Godot grants focus to a focusable Control for every left press that reaches it,
    /// before any handler runs (`viewport.cpp:1976-1990`), so a press that leaves no element focused
    /// and no selection hands it back: keys then go to the game (plan 3.11).
    pub(crate) fn release_key_focus_without_element(&mut self) {
        if self.focused.is_none() && !self.selection_holds_key_focus() && self.base().has_focus() {
            self.base_mut().release_focus();
        }
    }

    /// The end of a commit: if it removed the focused element (a dialog closing from its own button's
    /// click is the usual way) and nothing took focus since, the root gives Godot key focus back, as it
    /// does when a press or `blur()` leaves no element focused (plan 3.11, D11). A commit that did not
    /// remove focus leaves key focus alone: an owner may have asked for it with `grabFocus()`.
    pub(crate) fn settle_key_focus(&mut self) {
        if std::mem::take(&mut self.key_focus_release_due) {
            self.release_key_focus_without_element();
        }
    }

    /// `element.setPointerCapture(pointerId)`: the element receives the pointer's events until it
    /// is released, the pointer goes up or is cancelled, or the element is removed.
    pub(crate) fn set_pointer_capture_checked(
        &mut self,
        tag: u32,
        pointer_id: u32,
    ) -> Result<(), String> {
        let mounted = self.mounted.nodes.contains_key(&tag);
        self.pointers
            .set_capture(pointer_id, tag, mounted)
            .map_err(|error| error.to_string())
    }
}
