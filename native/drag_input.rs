//! Drag and drop in the mounted tree (plan sections 3.12 rule 3 and 3.19): the glue between the
//! Godot-free state machine (`drag.rs`) and the engine's input, the mounted tree, the event queue, the
//! cursor, the ghost (`drag_ghost.rs`) and edge auto-scroll.
//!
//! # Who feeds the machine
//!
//! - A primary press or a touch that JS did not prevent and did not capture, and that is not on a scrollbar
//!   thumb, is offered to the machine with the nearest `draggable` element (`begin_drag_gesture`). Touches
//!   offer theirs before `begin_touch_pan` registers a pan: both then wait, and whichever decides first
//!   (the hold elapsing, or the first movement beyond the slop) wins.
//! - Every move, release and cancel of a pointer goes to the machine first, and is dropped from the pointer
//!   events when the machine consumed it (`drag_pointer_moved`, `drag_pointer_released`,
//!   `cancel_pointer`). Escape arrives through `input` while a drag runs, so the root needs no key focus.
//! - `process` feeds the machine's two timers: the hold of a touch (`DragMachine::next_deadline_ms`) and the
//!   re-hit-test after anything scrolled under the stationary pointer (`DragInput::Refresh`), and applies
//!   edge auto-scroll.
//!
//! # Re-entrancy
//!
//! Every event the machine emits runs JS, which can commit, remove the source or the target, or unmount
//! the root. The machine is therefore taken out of the root while it handles an input
//! (`ReactUiRoot::drag_input`), the environment re-checks that an event's elements still exist, and
//! afterwards the root may have left the tree, which cancels the drag.

use godot::classes::control::CursorShape;
use godot::classes::{InputEvent, InputEventKey};
use godot::global::Key;
use godot::prelude::*;
use serde_json::{Value, json};

use crate::drag::{
    DragConfig, DragEndReason, DragEnded, DragEnvironment, DragEvent, DragEventKind, DragHit,
    DragInput, DragMachine, DragOutcome, DragPointer, DragPointerKind, DragReply, DragState,
    DragStep,
};
use crate::drag_ghost::DragGhost;
use crate::events::{DragData, DragEndData, EventPayload, PointerData, PointerType};
use crate::pointer::{DOM_BUTTON_NONE, DOM_BUTTONS_PRIMARY, MOUSE_POINTER_ID};
use crate::props::{DragPreviewSpec, Kind};
use crate::scroll::{Rect, Vec2, autoscroll_velocity};
use crate::scroll_input::{to_scroll, to_vector};
use crate::{ROOT_TARGET, ReactUiRoot, event_time_ms};

/// `Viewport.gui_drag_threshold`'s default (`scene/main/viewport.h:413`), used until the first press asks the
/// viewport for the real value.
const DEFAULT_DRAG_THRESHOLD_PX: f32 = 10.0;

/// Where the pointer that may become a drag went down, and which pointer it is.
#[derive(Clone, Copy, Debug)]
struct Grab {
    pointer: DragPointer,
    origin: Vec2,
}

/// What the root keeps beside the state machine (plan 3.19).
pub(crate) struct DragRuntime {
    /// `None` only while the machine handles an input: it is taken so the JS handlers it triggers can
    /// reach the rest of the root.
    machine: Option<DragMachine>,
    /// Drags started so far; the latest is `session`, the id every event of the running drag carries.
    sessions: u32,
    session: u32,
    grab: Option<Grab>,
    ghost: Option<DragGhost>,
    /// Something scrolled since the machine last looked under the pointer; `process` tells it.
    refresh_pending: bool,
    /// How the last drag ended, for the snapshot.
    last_end: Option<DragEnded>,
}

impl Default for DragRuntime {
    fn default() -> Self {
        Self {
            machine: Some(DragMachine::new(DragConfig::new(DEFAULT_DRAG_THRESHOLD_PX))),
            sessions: 0,
            session: 0,
            grab: None,
            ghost: None,
            refresh_pending: false,
            last_end: None,
        }
    }
}

/// What the machine can ask of the root while it handles one input.
struct RootEnvironment<'a> {
    root: &'a mut ReactUiRoot,
}

impl DragEnvironment for RootEnvironment<'_> {
    fn hit_test(&mut self, position: Vec2) -> DragHit {
        self.root.drag_hit_test(to_vector(position))
    }

    fn emit(&mut self, event: DragEvent) -> DragReply {
        self.root.emit_drag_event(event)
    }
}

fn pointer_type_of(pointer: DragPointer) -> PointerType {
    match pointer.kind {
        DragPointerKind::Mouse => PointerType::Mouse,
        DragPointerKind::Touch => PointerType::Touch,
    }
}

impl ReactUiRoot {
    // ---- State ------------------------------------------------------------------------------------

    /// A drag has begun and not ended: its pointer is held and `dragstart` was accepted. (False while the
    /// machine is handling an input; see [`Self::drag_in_progress`].)
    pub(crate) fn drag_running(&self) -> bool {
        self.drag
            .machine
            .as_ref()
            .is_some_and(|machine| machine.state() == DragState::Dragging)
    }

    /// Like [`Self::drag_running`], and also true while the machine is handling an input (it may be
    /// emitting a drag event, whose handlers run with the machine out of the root).
    pub(crate) fn drag_in_progress(&self) -> bool {
        self.drag
            .machine
            .as_ref()
            .is_none_or(|machine| machine.state() == DragState::Dragging)
    }

    /// The nearest `draggable` element at or above `tag`, if neither it nor an ancestor is disabled.
    fn nearest_draggable(&self, tag: u32) -> Option<u32> {
        if self.mounted.is_disabled(tag) {
            return None;
        }
        self.mounted.path_of(tag).into_iter().find(|ancestor| {
            self.mounted
                .nodes
                .get(ancestor)
                .is_some_and(|node| node.props.is_draggable())
        })
    }

    // ---- Input ------------------------------------------------------------------------------------

    /// Hand `input` to the machine and settle what it did: the ghost, the hover after a drag, and the
    /// frames the root needs. A root that JS took out of the tree while handling a drag event cancels the
    /// drag.
    pub(crate) fn drag_input(&mut self, input: DragInput) -> DragStep {
        let nothing = || DragStep {
            consumed: false,
            outcomes: Vec::new(),
        };
        let Some(mut machine) = self.drag.machine.take() else {
            return nothing();
        };
        // An idle machine ignores everything but a press: most mouse motion ends here.
        if machine.state() == DragState::Idle && !matches!(input, DragInput::PointerDown { .. }) {
            self.drag.machine = Some(machine);
            return nothing();
        }
        let step = machine.handle(event_time_ms(), input, &mut RootEnvironment { root: self });
        self.drag.machine = Some(machine);
        if !self.base().is_inside_tree()
            && self
                .drag
                .machine
                .as_ref()
                .is_some_and(|machine| machine.state() != DragState::Idle)
        {
            self.drag_input(DragInput::RootExit);
        }
        self.settle_drag(&step);
        step
    }

    fn settle_drag(&mut self, step: &DragStep) {
        let mut resync_hover = false;
        for outcome in &step.outcomes {
            match outcome {
                DragOutcome::Ended(ended) => {
                    self.drag.last_end = Some(*ended);
                    resync_hover = true;
                }
                DragOutcome::Started | DragOutcome::Refused | DragOutcome::Declined => {}
            }
        }
        // The ghost follows a running drag and is gone with any other state; the machine decides.
        let dragging = self.drag.machine.as_ref().and_then(|machine| {
            (machine.state() == DragState::Dragging)
                .then(|| machine.position())
                .flatten()
        });
        match dragging {
            Some(position) => {
                if let Some(ghost) = self.drag.ghost.as_mut() {
                    ghost.show(to_vector(position));
                }
            }
            None => self.drag.ghost = None,
        }
        // The hover froze when the drag began: catch up with where the mouse is now.
        let mouse_was_dragging = self
            .drag
            .grab
            .is_some_and(|grab| grab.pointer.kind == DragPointerKind::Mouse);
        if resync_hover && mouse_was_dragging && self.pointer_known && self.base().is_inside_tree()
        {
            let hit = self.mounted.hit_test(self.pointer);
            self.update_hover(hit);
        }
        self.update_process();
    }

    /// A primary press or touch that JS left alone: if it is inside a `draggable` element, it may become
    /// a drag (plan 3.12 rule 3). Nothing happens for a pointer an element captured on purpose. Returns
    /// whether the press is inside a draggable element, which keeps the text inside it from starting a
    /// selection (a press that moves on drags the element, and one that does not is a click).
    pub(crate) fn begin_drag_gesture(
        &mut self,
        pointer: DragPointer,
        position: Vector2,
        hit: Option<u32>,
    ) -> bool {
        if self.pointers.captured_by_js(pointer.id) {
            return false;
        }
        // A text input keeps its own press: it places the caret and extends the selection as the pointer
        // moves, whatever draggable element it sits in (and it is never dragged itself), as an HTML
        // `<input>` does. The press cannot also be the start of a drag.
        if hit.is_some_and(|tag| {
            self.mounted
                .nodes
                .get(&tag)
                .is_some_and(|node| node.kind == Kind::TextInput)
        }) {
            return false;
        }
        let Some(source) = hit.and_then(|tag| self.nearest_draggable(tag)) else {
            return false;
        };
        if let Some(viewport) = self.base().get_viewport()
            && let Some(machine) = self.drag.machine.as_mut()
        {
            machine.set_config(DragConfig::new(viewport.get_drag_threshold() as f32));
        }
        self.drag_input(DragInput::PointerDown {
            pointer,
            position: to_scroll(position),
            source: Some(source),
        });
        // The machine watches one pointer at a time: a second finger is ignored, and must not move the
        // grab point of the gesture that is underway.
        if self
            .drag
            .machine
            .as_ref()
            .and_then(|machine| machine.pointer())
            == Some(pointer)
        {
            self.drag.grab = Some(Grab {
                pointer,
                origin: to_scroll(position),
            });
        }
        true
    }

    /// A held pointer moved. Returns whether the drag took the movement (it then reaches no pointer
    /// event, hover or pan).
    pub(crate) fn drag_pointer_moved(&mut self, pointer_id: u32, position: Vector2) -> bool {
        self.drag_input(DragInput::PointerMove {
            pointer_id,
            position: to_scroll(position),
        })
        .consumed
    }

    /// A held pointer was released at `position`. Returns whether the drag took the release (a drop
    /// happened or a cancelled drag ended: no `pointerup`, no `click`).
    pub(crate) fn drag_pointer_released(&mut self, pointer_id: u32, position: Vector2) -> bool {
        let consumed = self
            .drag_input(DragInput::PointerUp {
                pointer_id,
                position: to_scroll(position),
            })
            .consumed;
        // The hover froze while the mouse was held for a drag, and stays so after a cancelled drag's
        // swallowed release (a drop's own outcome already caught it up).
        if consumed && pointer_id == MOUSE_POINTER_ID && self.pointer_known {
            let hit = self.mounted.hit_test(self.pointer);
            self.update_hover(hit);
        }
        consumed
    }

    /// The window lost the pointer's focus: a drag it was making is cancelled, like any press.
    pub(crate) fn cancel_dragging_pointer(&mut self) {
        let pointer = self
            .drag
            .machine
            .as_ref()
            .and_then(|machine| machine.pointer());
        if let Some(pointer) = pointer {
            self.drag_input(DragInput::PointerCancel {
                pointer_id: pointer.id,
            });
        }
    }

    /// The root left the scene tree: a running drag is cancelled.
    pub(crate) fn cancel_drag_for_exit(&mut self) {
        self.drag_input(DragInput::RootExit);
    }

    /// Escape while a drag runs cancels it and is accepted (plan 3.19). Called from `input`, which is
    /// only enabled while a drag runs, so the root needs no key focus.
    pub(crate) fn drag_escape(&mut self, event: &Gd<InputEvent>) {
        let Ok(key) = event.clone().try_cast::<InputEventKey>() else {
            return;
        };
        if !key.is_pressed() || key.get_keycode() != Key::ESCAPE {
            return;
        }
        if self.drag_input(DragInput::Escape).consumed {
            if let Some(mut viewport) = self.base().get_viewport() {
                viewport.set_input_as_handled();
            }
            // `input` is an input-origin entry point: the cancelled drag's events go out now.
            self.deliver();
        }
    }

    /// Something scrolled: the machine looks under the stationary pointer again at the next frame.
    pub(crate) fn drag_scrolled(&mut self) {
        if self.drag_in_progress() {
            self.drag.refresh_pending = true;
            self.update_process();
        }
    }

    // ---- Frames -----------------------------------------------------------------------------------

    /// Whether the drag needs `process()` frames: a touch waits for its hold to elapse, a scroll waits to
    /// be looked at, or the pointer is near the edge of a container that can scroll.
    pub(crate) fn drag_wants_frames(&self) -> bool {
        let Some(machine) = self.drag.machine.as_ref() else {
            return false;
        };
        self.drag.refresh_pending
            || machine.next_deadline_ms().is_some()
            || !self.drag_autoscroll().is_empty()
    }

    /// One frame of drag work: start a touch drag whose hold elapsed, scroll the containers the pointer
    /// presses against, then let the machine see what lies under the pointer now. Called from `process`,
    /// which is not an input callback: the events this emits are delivered here (the cancelable ones
    /// already were), as the machine's own timers are the only reason a drag moves without input.
    pub(crate) fn tick_drag(&mut self, delta: f64) {
        let due = self
            .drag
            .machine
            .as_ref()
            .and_then(|machine| machine.next_deadline_ms())
            .is_some_and(|deadline| event_time_ms() >= deadline);
        if due {
            self.drag_input(DragInput::HoldTick);
        }
        let dt = delta as f32;
        for (tag, velocity) in self.drag_autoscroll() {
            let step = Vec2::new(velocity.x * dt, velocity.y * dt);
            self.move_container(tag, |state, ranges| state.scroll_by(ranges, step));
        }
        if std::mem::take(&mut self.drag.refresh_pending) && self.drag_running() {
            self.drag_input(DragInput::Refresh);
        }
        self.deliver();
        self.update_process();
    }

    /// The scroll containers around the element under the dragged pointer that the pointer presses
    /// against (within the edge band of their visible area, on an axis that can still move that way),
    /// with their velocities in pixels per second. Empty unless a drag is running.
    fn drag_autoscroll(&self) -> Vec<(u32, Vec2)> {
        let Some(machine) = self.drag.machine.as_ref() else {
            return Vec::new();
        };
        let Some(position) = machine
            .position()
            .filter(|_| machine.state() == DragState::Dragging)
        else {
            return Vec::new();
        };
        let Some(start) = self.mounted.hit_test(to_vector(position)) else {
            return Vec::new();
        };
        let viewport = self.viewport_box();
        self.scroll_path(start)
            .into_iter()
            .filter_map(|tag| {
                let node = self.mounted.nodes.get(&tag)?;
                let (rect, _) = self.mounted.absolute_geometry(tag, viewport)?;
                let client = node.geometry.padding_box();
                let visible = Rect::new(
                    rect.x + client.x,
                    rect.y + client.y,
                    client.width,
                    client.height,
                );
                let velocity = autoscroll_velocity(
                    position,
                    visible,
                    &node.geometry.scroll_ranges,
                    node.scroll.offset,
                );
                (velocity != Vec2::ZERO).then_some((tag, velocity))
            })
            .collect()
    }

    // ---- Cursor -----------------------------------------------------------------------------------

    /// The cursor a running drag overrides the element's own with: can-drop over a target that accepted
    /// the drop, forbidden anywhere else (Appendix A). Godot asks for the cursor before it hands the
    /// motion to `gui_input`, so it shows what the previous motion decided.
    pub(crate) fn drag_cursor(&self) -> Option<CursorShape> {
        let machine = self.drag.machine.as_ref()?;
        (machine.state() == DragState::Dragging).then(|| {
            if machine.allowed_effect().is_some() {
                CursorShape::CAN_DROP
            } else {
                CursorShape::FORBIDDEN
            }
        })
    }

    // ---- The machine's environment ----------------------------------------------------------------

    /// What lies under `point` for a dragged pointer: beyond the root, over nothing, or an element. The
    /// ghost is not in the mounted tree, and `pointer-events: none` elements are skipped by the hit test.
    fn drag_hit_test(&self, point: Vector2) -> DragHit {
        let size = self.viewport_size;
        if point.x < 0.0 || point.y < 0.0 || point.x >= size.x || point.y >= size.y {
            return DragHit::Outside;
        }
        self.mounted
            .hit_test(point)
            .map_or(DragHit::Inside, DragHit::Element)
    }

    /// The pointer state a drag event carries: no button changed, the primary button held until the
    /// drop or the end.
    fn drag_data(&self, event: &DragEvent, related: Option<u32>) -> DragData {
        let buttons = match event.kind {
            DragEventKind::Drop { .. } | DragEventKind::DragEnd { .. } => 0,
            DragEventKind::PointerCancel
            | DragEventKind::DragStart
            | DragEventKind::Drag
            | DragEventKind::DragEnter { .. }
            | DragEventKind::DragLeave { .. }
            | DragEventKind::DragOver { .. } => DOM_BUTTONS_PRIMARY,
        };
        let pointer = PointerData {
            related_target: related,
            ..self.pointer_data_at(
                to_vector(event.position),
                event.pointer.id,
                pointer_type_of(event.pointer),
                DOM_BUTTON_NONE,
                buttons,
            )
        };
        DragData {
            pointer,
            session_id: self.drag.session,
        }
    }

    /// Deliver one event of the drag to JS. An event whose element JS has removed since the machine
    /// looked is dropped; a `dragend` whose source is gone goes to the root instead, so JS can still end
    /// the drag's data store.
    fn emit_drag_event(&mut self, event: DragEvent) -> DragReply {
        let alive = |root: &Self, tag: u32| root.mounted.nodes.contains_key(&tag);
        let (target, payload) = match event.kind {
            DragEventKind::PointerCancel => {
                // The drag took the pointer: JS hears `pointercancel`, and no pan or click follows.
                self.cancel_dragged_pointer(event.pointer);
                return DragReply::Default;
            }
            DragEventKind::DragStart => {
                self.begin_drag_session(event.source);
                (
                    event.source,
                    EventPayload::DragStart(self.drag_data(&event, None)),
                )
            }
            DragEventKind::Drag => (
                event.source,
                EventPayload::Drag(self.drag_data(&event, None)),
            ),
            DragEventKind::DragEnter {
                target,
                related_target,
            } => {
                let related = related_target.filter(|tag| alive(self, *tag));
                (
                    target,
                    EventPayload::DragEnter(self.drag_data(&event, related)),
                )
            }
            DragEventKind::DragLeave {
                target,
                related_target,
            } => {
                let related = related_target.filter(|tag| alive(self, *tag));
                (
                    target,
                    EventPayload::DragLeave(self.drag_data(&event, related)),
                )
            }
            DragEventKind::DragOver { target } => {
                (target, EventPayload::DragOver(self.drag_data(&event, None)))
            }
            DragEventKind::Drop { target, .. } => {
                (target, EventPayload::Drop(self.drag_data(&event, None)))
            }
            DragEventKind::DragEnd {
                drop_effect,
                ended_outside_root,
            } => {
                let end = DragEndData {
                    drag: self.drag_data(&event, None),
                    drop_effect,
                    ended_outside_root,
                };
                (event.source, EventPayload::DragEnd(end))
            }
        };
        let target = if alive(self, target) {
            target
        } else if matches!(event.kind, DragEventKind::DragEnd { .. }) {
            ROOT_TARGET
        } else {
            return DragReply::Default;
        };
        if event.is_cancelable() {
            let outcome = self.dispatch_cancelable(target, payload);
            DragReply::from_outcome(&event, outcome)
                .expect("the event queue rejects a prevented dragover or drop without an effect")
        } else {
            self.queue(target, payload);
            DragReply::Default
        }
    }

    /// A drag is about to start: number it, and copy the source for the ghost before any `dragstart`
    /// handler can restyle it.
    fn begin_drag_session(&mut self, source: u32) {
        self.drag.sessions += 1;
        self.drag.session = self.drag.sessions;
        self.drag.ghost = None;
        let wants_ghost =
            self.mounted.nodes.get(&source).is_some_and(|node| {
                node.props.drag_preview_or_default() == DragPreviewSpec::Native
            });
        let Some(grab) = self.drag.grab.filter(|_| wants_ghost) else {
            return;
        };
        let canvas = self.base().get_canvas_item();
        let viewport = self.viewport_box();
        let texts = self.text_input_ghost_texts(source);
        self.drag.ghost = DragGhost::capture(
            &mut self.mounted,
            canvas,
            viewport,
            source,
            to_vector(grab.origin),
            &texts,
        );
    }

    /// The machine cancelled the pointer's stream because a drag started: the pointer's events end with
    /// `pointercancel`, and a touch is no longer a candidate for panning.
    fn cancel_dragged_pointer(&mut self, pointer: DragPointer) {
        self.cancel_pointer(pointer.id);
        if pointer.kind == DragPointerKind::Touch {
            self.touch_pan_cancelled(pointer.id);
        }
    }

    // ---- Diagnostics ------------------------------------------------------------------------------

    /// The drag as the snapshot reports it (plan 4.5): its state, elements, the effect the target
    /// accepted, the ghost, and how the last drag ended.
    pub(crate) fn drag_snapshot_json(&self) -> Value {
        let ended = self.drag.last_end.map(|ended| {
            json!({
                "reason": end_reason_name(ended.reason),
                "dropEffect": ended.drop_effect,
                "endedOutsideRoot": ended.ended_outside_root,
            })
        });
        let ghost = self
            .drag
            .ghost
            .as_ref()
            .filter(|ghost| ghost.is_shown())
            .map(|ghost| {
                let rect = ghost.rect();
                json!({
                    "x": rect.position.x, "y": rect.position.y,
                    "width": rect.size.x, "height": rect.size.y,
                    "elements": ghost.node_count(),
                })
            });
        let Some(machine) = self.drag.machine.as_ref() else {
            // Only a JS handler of a drag event can ask while the machine is out of the root.
            return json!({
                "state": "busy", "session": self.drag.session, "source": null, "target": null,
                "pointer": null, "origin": null, "position": null, "allowedEffect": null,
                "ghost": ghost, "lastEnd": ended,
            });
        };
        let state = match machine.state() {
            DragState::Idle => "idle",
            DragState::Pending => "pending",
            DragState::Dragging => "dragging",
            DragState::Ended => "ended",
        };
        json!({
            "state": state,
            "session": self.drag.session,
            "source": machine.source(),
            "target": machine.target(),
            "pointer": machine.pointer().map(|pointer| pointer.id),
            "origin": machine.origin().map(|origin| json!({"x": origin.x, "y": origin.y})),
            "position": machine.position().map(|position| json!({"x": position.x, "y": position.y})),
            "allowedEffect": machine.allowed_effect(),
            "ghost": ghost,
            "lastEnd": ended,
        })
    }
}

/// The mouse, as the machine's pointer.
pub(crate) const MOUSE_DRAG_POINTER: DragPointer = DragPointer {
    id: MOUSE_POINTER_ID,
    kind: DragPointerKind::Mouse,
};

/// A touch, as the machine's pointer.
pub(crate) fn touch_drag_pointer(id: u32) -> DragPointer {
    DragPointer {
        id,
        kind: DragPointerKind::Touch,
    }
}

/// How a drag ended, by the name the snapshot reports.
fn end_reason_name(reason: DragEndReason) -> &'static str {
    match reason {
        DragEndReason::Dropped => "dropped",
        DragEndReason::Released => "released",
        DragEndReason::Escape => "escape",
        DragEndReason::PointerCancel => "pointercancel",
        DragEndReason::RootExit => "rootexit",
    }
}
