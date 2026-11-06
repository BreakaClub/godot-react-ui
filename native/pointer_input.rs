//! Pointer input: Godot's mouse, touch and gesture events turned into DOM pointer events (plan
//! section 3.12). `pointer_state.rs` holds the per-pointer records, capture and click counting
//! (all unit tested); this module reads the engine's events, hit tests, queues the events JS
//! receives and runs the default actions.

use godot::classes::{
    InputEventMouseButton, InputEventMouseMotion, InputEventPanGesture, InputEventScreenDrag,
    InputEventScreenTouch,
};
use godot::prelude::*;

use crate::events::{EventPayload, PointerData, PointerType, WheelData};
use crate::focus::{Modality, nearest_focusable};
use crate::pointer::{
    DOM_BUTTON_NONE, DOM_BUTTON_PRIMARY, DOM_BUTTON_SECONDARY, DOM_BUTTONS_PRIMARY,
    MOUSE_POINTER_ID, dom_button_of, shared_button_target, wheel_ticks,
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
        self.update_hover(hit);
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
            // is its element's (rule 1), then a press on a scrollbar thumb drags the thumb (rule 2),
            // then, once drag and drop exists (Phase I9, rule 3), a draggable element; selectable text
            // starts a selection (rule 5).
            let grabbed_thumb = !prevented && self.begin_thumb_drag(hit, self.pointer);
            let selecting = !prevented
                && self.begin_selection_press(
                    hit,
                    detail,
                    !grabbed_thumb && !self.mouse_is_captured(),
                );
            self.run_pointerdown_default(hit, prevented, selecting);
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
    /// asked to capture clicks that element, if the press began inside it. Otherwise press and
    /// release must reach the same element, or two parts of one enabled button (its padding and its
    /// label): crossing to another button or releasing outside the pressed one does not click.
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
        let hit = release_hit.filter(|id| !self.mounted.is_disabled(*id))?;
        if press_target == hit {
            Some(hit)
        } else {
            // Padding and label are different pointer targets, but they activate the same
            // button. Keep pointer event IDs unchanged.
            shared_button_target(&self.mounted, press_target, hit)
        }
    }

    /// A finger went down (or another one did). Returns false when JS left the root outside the
    /// scene tree while handling `pointerdown`.
    fn press_touch(&mut self, id: u32, position: Vector2) -> bool {
        self.modality = Modality::Pointer;
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
            self.begin_touch_pan(id, target, position, prevented);
        }
        // A touch starts no text selection (touch selection handles are a non-goal, plan 2.3).
        self.run_pointerdown_default(hit, prevented, false);
        true
    }

    /// A finger lifted: `pointerup` and `pointerleave`, then `click` if it ended where it began.
    fn release_touch(&mut self, id: u32, position: Vector2) {
        let hit = self.mounted.hit_test(position);
        let capture = self.pointers.get(id).and_then(|record| record.capture);
        let up_target = self.pointers.target_for(id, hit);
        let Some(press) = self.pointers.release(id, DOM_BUTTON_PRIMARY, position, 0) else {
            // A touch native never took (a disabled element, or nothing): nothing to end.
            return;
        };
        if let Some(target) = up_target.filter(|tag| self.mounted.nodes.contains_key(tag)) {
            let up = self.touch_pointer_data(position, id, DOM_BUTTON_PRIMARY, 0, 0);
            self.queue(target, EventPayload::PointerUp(up));
        }
        self.leave_touch(id, position, press.target);
        // A tap that stopped a coasting flick only stopped it.
        let stopped_a_fling = self.touch_stopped_a_fling(id);
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
            self.touch_pan_cancelled(id);
            self.cancel_pointer(id);
        } else if !self.touch_pan_ended(id) {
            // A finger that was panning has no pointer left to release (it was cancelled when the
            // pan began), and its flick, if any, is under way.
            self.release_touch(id, position);
        }
        self.base_mut().accept_event();
    }

    /// A finger moved. Its events go to the element that captured it (its `pointerdown` target
    /// unless an element took the capture), wherever the finger is.
    pub(crate) fn handle_touch_drag(&mut self, drag: &Gd<InputEventScreenDrag>) {
        let Some(id) = touch_pointer_id(drag.get_index()) else {
            return;
        };
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
        self.end_all_touch_pans();
        self.end_thumb_drag();
        self.end_selection_drag();
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
