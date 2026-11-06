//! Input events queued by the native root and delivered to the JS renderer.
//!
//! JS drains the queue through `drain_events`. An event that native is waiting on (`awaited`) is
//! marked `cancelable`: JS reports `preventDefault()` back through `resolve_event` before the
//! `events_ready` signal returns (`docs/INTERACTION_PLAN.md` section 3.3). Every event carries the
//! propagation `path` native computed when it queued the event (plan 3.10 rule 8). No Godot types
//! appear here so the whole protocol can be unit tested.
use serde::Serialize;

/// Monotonically increasing per root, starting at 1.
pub type EventSeq = u64;

/// DOM `PointerEvent.pointerType`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum PointerType {
    #[serde(rename = "mouse")]
    Mouse,
    #[serde(rename = "touch")]
    Touch,
    /// Synthetic keyboard activation: browsers report an empty pointer type for a `click` that
    /// Enter or Space produced.
    #[serde(rename = "")]
    Synthetic,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Modifiers {
    pub shift_key: bool,
    pub ctrl_key: bool,
    pub alt_key: bool,
    pub meta_key: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PointerData {
    /// Root-local logical pixels.
    pub x: f32,
    pub y: f32,
    /// Canvas coordinates, which is what game code receives in `_unhandled_input`.
    pub viewport_x: f32,
    pub viewport_y: f32,
    pub pointer_id: u32,
    pub pointer_type: PointerType,
    /// DOM `button`, or -1 when the event does not come from a button change.
    pub button: i8,
    /// DOM `buttons` bitmask.
    pub buttons: u16,
    /// Click count.
    pub detail: u32,
    /// Enter and leave events only; the element being entered from or left towards.
    pub related_target: Option<u32>,
    #[serde(flatten)]
    pub modifiers: Modifiers,
}

/// A wheel tick or trackpad pan: the pointer's state plus how far it scrolled. Deltas are in wheel
/// ticks, one per notch of a discrete wheel and scaled by Godot's `factor` or pan `delta` for smooth
/// devices; positive is down and right, as in the DOM. Scroll containers turn ticks into pixels
/// the way Godot's `ScrollContainer` does (plan 3.16).
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WheelData {
    #[serde(flatten)]
    pub pointer: PointerData,
    pub delta_x: f32,
    pub delta_y: f32,
}

/// A scroll container's position and size: DOM `scrollLeft`, `scrollTop`, `scrollWidth`,
/// `scrollHeight`, `clientWidth` and `clientHeight` (plan 4.3). The client size is the padding box,
/// the scroll size the client size plus the range the content can move; the offsets of a reversed
/// axis are zero or negative, as in the DOM.
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrollData {
    pub scroll_left: f32,
    pub scroll_top: f32,
    pub scroll_width: f32,
    pub scroll_height: f32,
    pub client_width: f32,
    pub client_height: f32,
}

/// A key press or release (plan 3.14): `key` and `code` follow the DOM (`keymap.rs`), `repeat` is
/// true for the echoes Godot sends while a key is held.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyData {
    pub key: String,
    pub code: &'static str,
    pub repeat: bool,
    /// True while an IME composition is in progress (text input arrives with Phase I7).
    pub is_composing: bool,
    #[serde(flatten)]
    pub modifiers: Modifiers,
}

/// `focus` and `blur`: the element on the other side of the change, and whether the focus (the
/// element's, for `blur`) is a keyboard focus, which `:focus-visible` and the focus ring follow.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusData {
    pub related_target: Option<u32>,
    pub focus_visible: bool,
}

/// A drag-and-drop event (plan 3.19, 4.3): the pointer's state with `button` -1 and `buttons` 1 while it
/// is held, and the drag it belongs to. `related_target` (in `pointer`) is the other side of a
/// `dragenter` or `dragleave`.
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DragData {
    #[serde(flatten)]
    pub pointer: PointerData,
    /// Counts the drags a root has started; JS keeps one `DataTransfer` store for each. Every event
    /// of one drag carries the same id.
    pub session_id: u32,
}

/// `dragend`: how the drag ended. A drag that ended without a drop, or was cancelled, has the effect
/// `none`; `ended_outside_root` is true only for a release beyond the root (plan 3.19).
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DragEndData {
    #[serde(flatten)]
    pub drag: DragData,
    pub drop_effect: DropEffect,
    pub ended_outside_root: bool,
}

/// What an assistive technology can ask of a slider that has no pointer or key gesture (plan 3.21).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AccessibilityActionKind {
    Increment,
    Decrement,
    SetValue,
}

/// `accessibilityaction`: an assistive technology acted on the element's accessibility node. `value`
/// is the number `setValue` asked for, and `null` for the other actions.
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilityActionData {
    pub action: AccessibilityActionKind,
    pub value: Option<f64>,
}

/// One variant per wire `type`.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum EventPayload {
    PointerDown(PointerData),
    PointerMove(PointerData),
    PointerUp(PointerData),
    PointerEnter(PointerData),
    PointerLeave(PointerData),
    /// The OS or the root ended the pointer's contact: no `pointerup` and no `click` follow.
    PointerCancel(PointerData),
    Click(PointerData),
    /// The second `click` of a sequence.
    #[serde(rename = "dblclick")]
    DoubleClick(PointerData),
    /// A `click` of a button other than the primary one.
    AuxClick(PointerData),
    /// The secondary button was pressed.
    ContextMenu(PointerData),
    Wheel(WheelData),
    /// A scroll container moved. Not cancelable and not bubbling; coalesced per container
    /// (`EventQueue::push_scroll`).
    Scroll(ScrollData),
    KeyDown(KeyData),
    KeyUp(KeyData),
    Focus(FocusData),
    Blur(FocusData),
    AccessibilityAction(AccessibilityActionData),
    /// The text selection of the document changed (plan 3.17). Addressed to the root listeners
    /// (target 0, empty path), not cancelable, no payload: JS asks the root for `getSelection()`.
    /// Coalesced while waiting (`EventQueue::push_selection_change`). `TextInput` selection changes
    /// (Phase I7) go to their input and carry the input's offsets.
    #[serde(rename = "selectionchange")]
    DocumentSelectionChange,
    /// Cancelable, at the dragged element: preventing it keeps the drag from starting.
    DragStart(DragData),
    /// At the dragged element, on every move and scroll under a held pointer.
    Drag(DragData),
    DragEnter(DragData),
    DragLeave(DragData),
    /// Cancelable: preventing it, with a `dropEffect` other than `none`, accepts a drop here.
    DragOver(DragData),
    /// Cancelable: preventing it reports the effect the drop had.
    Drop(DragData),
    /// At the dragged element, last.
    DragEnd(DragEndData),
}

impl EventPayload {
    /// The wire `type` of an event that a prevented answer must come with a `dropEffect` for, or
    /// `None` for every other event.
    fn needs_drop_effect_when_prevented(&self) -> Option<&'static str> {
        match self {
            EventPayload::DragOver(_) => Some("dragover"),
            EventPayload::Drop(_) => Some("drop"),
            EventPayload::PointerDown(_)
            | EventPayload::PointerMove(_)
            | EventPayload::PointerUp(_)
            | EventPayload::PointerEnter(_)
            | EventPayload::PointerLeave(_)
            | EventPayload::PointerCancel(_)
            | EventPayload::Click(_)
            | EventPayload::DoubleClick(_)
            | EventPayload::AuxClick(_)
            | EventPayload::ContextMenu(_)
            | EventPayload::Wheel(_)
            | EventPayload::Scroll(_)
            | EventPayload::KeyDown(_)
            | EventPayload::KeyUp(_)
            | EventPayload::Focus(_)
            | EventPayload::Blur(_)
            | EventPayload::AccessibilityAction(_)
            | EventPayload::DocumentSelectionChange
            | EventPayload::DragStart(_)
            | EventPayload::Drag(_)
            | EventPayload::DragEnter(_)
            | EventPayload::DragLeave(_)
            | EventPayload::DragEnd(_) => None,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiEvent {
    pub seq: EventSeq,
    /// 0 addresses root listeners only.
    pub target: u32,
    /// The target and then its ancestors up to its layer's top-level node; empty for target 0.
    pub path: Vec<u32>,
    /// Enter and leave events only: the same path for `relatedTarget`, so JS can find the elements
    /// the pointer actually crossed.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub related_path: Vec<u32>,
    /// True only while native is awaiting `resolve_event` for this `seq`.
    pub cancelable: bool,
    /// Milliseconds on the engine tick clock at queue time.
    pub time_stamp: f64,
    #[serde(flatten)]
    pub payload: EventPayload,
}

/// HTML `DataTransfer.dropEffect`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DropEffect {
    None,
    Copy,
    Move,
    Link,
}

impl DropEffect {
    /// The empty string means JS did not set an effect.
    pub fn parse(value: &str) -> Result<Option<DropEffect>, String> {
        match value {
            "" => Ok(None),
            "none" => Ok(Some(DropEffect::None)),
            "copy" => Ok(Some(DropEffect::Copy)),
            "move" => Ok(Some(DropEffect::Move)),
            "link" => Ok(Some(DropEffect::Link)),
            other => Err(format!("unknown drop effect {other:?}")),
        }
    }
}

/// What JS reported for an awaited event. The default is "not prevented".
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct EventOutcome {
    pub default_prevented: bool,
    /// What `DataTransfer` settled on for a `dragover` or `drop` (plan 3.19): the effect an accepted
    /// drop would have, or `none`.
    pub drop_effect: Option<DropEffect>,
}

/// Events waiting for JS, and the single event native is currently blocked on.
pub struct EventQueue {
    next_seq: EventSeq,
    queued: Vec<UiEvent>,
    awaited: Option<EventSeq>,
    /// The awaited event's `type`, when its answer must carry a `dropEffect` if it prevents the event.
    awaited_needs_effect: Option<&'static str>,
    outcome: Option<EventOutcome>,
}

impl EventQueue {
    pub fn new() -> Self {
        Self {
            next_seq: 1,
            queued: Vec::new(),
            awaited: None,
            awaited_needs_effect: None,
            outcome: None,
        }
    }

    /// Queue an event nobody waits for.
    pub fn push(
        &mut self,
        target: u32,
        path: Vec<u32>,
        payload: EventPayload,
        time_stamp: f64,
    ) -> EventSeq {
        self.enqueue(target, path, Vec::new(), payload, time_stamp, false)
    }

    /// Queue a `scroll` event for container `target`. A `scroll` still waiting for JS is updated in
    /// place instead (it keeps its place and sequence number): JS sees where the container is when it
    /// looks, once, not every step on the way (plan 3.16, "coalesced per container per frame").
    pub fn push_scroll(
        &mut self,
        target: u32,
        path: Vec<u32>,
        data: ScrollData,
        time_stamp: f64,
    ) -> EventSeq {
        if let Some(pending) = self.queued.iter_mut().find(|event| {
            event.target == target && matches!(event.payload, EventPayload::Scroll(_))
        }) {
            pending.payload = EventPayload::Scroll(data);
            pending.time_stamp = time_stamp;
            return pending.seq;
        }
        self.enqueue(
            target,
            path,
            Vec::new(),
            EventPayload::Scroll(data),
            time_stamp,
            false,
        )
    }

    /// Queue a `selectionchange` for the root's listeners. One still waiting for JS is updated in place:
    /// JS reads the selection when it looks, so a drag that moved the focus fifty times costs one event
    /// per delivery.
    pub fn push_selection_change(&mut self, time_stamp: f64) -> EventSeq {
        if let Some(pending) = self
            .queued
            .iter_mut()
            .find(|event| matches!(event.payload, EventPayload::DocumentSelectionChange))
        {
            pending.time_stamp = time_stamp;
            return pending.seq;
        }
        self.enqueue(
            0,
            Vec::new(),
            Vec::new(),
            EventPayload::DocumentSelectionChange,
            time_stamp,
            false,
        )
    }

    /// Queue an enter or leave event that also names the path of the element on the other side.
    pub fn push_crossing(
        &mut self,
        target: u32,
        path: Vec<u32>,
        related_path: Vec<u32>,
        payload: EventPayload,
        time_stamp: f64,
    ) -> EventSeq {
        self.enqueue(target, path, related_path, payload, time_stamp, false)
    }

    /// Queue an event whose outcome the caller will read with `take_outcome` after delivery.
    pub fn push_awaited(
        &mut self,
        target: u32,
        path: Vec<u32>,
        payload: EventPayload,
        time_stamp: f64,
    ) -> EventSeq {
        assert!(
            self.awaited.is_none(),
            "an awaited event is already pending; nested dispatch is queued as non-cancelable"
        );
        let needs_effect = payload.needs_drop_effect_when_prevented();
        let seq = self.enqueue(target, path, Vec::new(), payload, time_stamp, true);
        self.awaited = Some(seq);
        self.awaited_needs_effect = needs_effect;
        self.outcome = None;
        seq
    }

    fn enqueue(
        &mut self,
        target: u32,
        path: Vec<u32>,
        related_path: Vec<u32>,
        payload: EventPayload,
        time_stamp: f64,
        cancelable: bool,
    ) -> EventSeq {
        let seq = self.next_seq;
        self.next_seq += 1;
        self.queued.push(UiEvent {
            seq,
            target,
            path,
            related_path,
            cancelable,
            time_stamp,
            payload,
        });
        seq
    }

    pub fn drain(&mut self) -> Vec<UiEvent> {
        std::mem::take(&mut self.queued)
    }

    /// Record JS's answer. Only the awaited event can be resolved, and only once.
    pub fn resolve(&mut self, seq: EventSeq, outcome: EventOutcome) -> Result<(), String> {
        if self.awaited != Some(seq) {
            return Err(format!("event {seq} is not awaiting a result"));
        }
        if self.outcome.is_some() {
            return Err(format!("event {seq} was already resolved"));
        }
        // A `dragover` or `drop` that JS prevented without saying which effect it accepted would leave
        // native guessing; it is JS's bug, so it is reported and the event counts as not prevented.
        if outcome.default_prevented
            && outcome.drop_effect.is_none()
            && let Some(kind) = self.awaited_needs_effect
        {
            return Err(format!(
                "event {seq} is a {kind}, which was prevented without a dropEffect"
            ));
        }
        self.outcome = Some(outcome);
        Ok(())
    }

    /// Stop awaiting `seq` and return what JS reported, or "not prevented" if it never resolved.
    /// An event still queued stops being cancelable: JS can no longer answer it.
    pub fn take_outcome(&mut self, seq: EventSeq) -> EventOutcome {
        if self.awaited != Some(seq) {
            return EventOutcome::default();
        }
        self.awaited = None;
        self.awaited_needs_effect = None;
        for event in &mut self.queued {
            if event.seq == seq {
                event.cancelable = false;
            }
        }
        self.outcome.take().unwrap_or_default()
    }

    pub fn retain(&mut self, keep: impl Fn(&EventPayload) -> bool) {
        self.queued.retain(|event| keep(&event.payload));
    }

    pub fn is_empty(&self) -> bool {
        self.queued.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};

    const STAMP: f64 = 12.5;

    fn pointer() -> PointerData {
        PointerData {
            x: 10.5,
            y: 20.25,
            viewport_x: 10.5,
            viewport_y: 20.25,
            pointer_id: 1,
            pointer_type: PointerType::Mouse,
            button: 0,
            buttons: 1,
            detail: 1,
            related_target: None,
            modifiers: Modifiers {
                shift_key: true,
                ..Modifiers::default()
            },
        }
    }

    fn focus() -> FocusData {
        FocusData {
            related_target: Some(3),
            focus_visible: true,
        }
    }

    fn key(repeat: bool) -> KeyData {
        KeyData {
            key: "a".to_string(),
            code: "KeyA",
            repeat,
            is_composing: false,
            modifiers: Modifiers {
                ctrl_key: true,
                ..Modifiers::default()
            },
        }
    }

    fn prevented() -> EventOutcome {
        EventOutcome {
            default_prevented: true,
            drop_effect: None,
        }
    }

    fn wire(event: &UiEvent) -> Value {
        serde_json::to_value(event).expect("event serializes")
    }

    #[test]
    fn sequence_numbers_start_at_one_and_increase() {
        let mut queue = EventQueue::new();
        assert_eq!(
            queue.push(1, vec![1], EventPayload::Focus(focus()), STAMP),
            1
        );
        assert_eq!(
            queue.push(1, vec![1], EventPayload::Blur(focus()), STAMP),
            2
        );
        assert_eq!(
            queue.push_awaited(2, vec![2], EventPayload::Focus(focus()), STAMP),
            3
        );
        let seqs: Vec<_> = queue.drain().iter().map(|event| event.seq).collect();
        assert_eq!(seqs, [1, 2, 3]);
        assert!(queue.is_empty());
    }

    #[test]
    fn only_awaited_events_are_cancelable_and_only_while_awaited() {
        let mut queue = EventQueue::new();
        queue.push(1, vec![1], EventPayload::Focus(focus()), STAMP);
        let seq = queue.push_awaited(2, vec![2], EventPayload::PointerDown(pointer()), STAMP);
        let drained = queue.drain();
        assert!(!drained[0].cancelable);
        assert!(drained[1].cancelable, "JS can answer the awaited event");
        assert!(queue.resolve(seq, prevented()).is_ok());
        assert_eq!(queue.take_outcome(seq), prevented());
    }

    #[test]
    fn an_awaited_event_nobody_drained_stops_being_cancelable() {
        let mut queue = EventQueue::new();
        let seq = queue.push_awaited(2, vec![2], EventPayload::PointerDown(pointer()), STAMP);
        // No JS listener ran; the event is delivered later by the per-frame drain.
        assert_eq!(queue.take_outcome(seq), EventOutcome::default());
        let drained = queue.drain();
        assert!(!drained[0].cancelable, "JS must never resolve it");
        assert!(queue.resolve(seq, prevented()).is_err());
    }

    #[test]
    fn resolving_an_event_that_is_not_awaited_is_an_error() {
        let mut queue = EventQueue::new();
        let plain = queue.push(1, vec![1], EventPayload::Focus(focus()), STAMP);
        assert_eq!(
            queue.resolve(plain, prevented()),
            Err("event 1 is not awaiting a result".to_string())
        );
        assert!(queue.resolve(99, prevented()).is_err());
        let awaited = queue.push_awaited(2, vec![2], EventPayload::Blur(focus()), STAMP);
        assert!(queue.resolve(awaited + 1, prevented()).is_err());
    }

    #[test]
    fn resolving_twice_is_an_error_and_keeps_the_first_answer() {
        let mut queue = EventQueue::new();
        let seq = queue.push_awaited(2, vec![2], EventPayload::Focus(focus()), STAMP);
        assert!(queue.resolve(seq, prevented()).is_ok());
        assert_eq!(
            queue.resolve(seq, EventOutcome::default()),
            Err("event 1 was already resolved".to_string())
        );
        assert_eq!(queue.take_outcome(seq), prevented());
    }

    #[test]
    fn take_outcome_without_resolve_is_not_prevented_and_clears_the_wait() {
        let mut queue = EventQueue::new();
        let seq = queue.push_awaited(2, vec![2], EventPayload::Focus(focus()), STAMP);
        assert_eq!(queue.take_outcome(seq), EventOutcome::default());
        assert!(
            queue.resolve(seq, prevented()).is_err(),
            "no longer awaited"
        );
        // A new awaited event may start once the previous wait ended.
        let next = queue.push_awaited(2, vec![2], EventPayload::Blur(focus()), STAMP);
        assert_eq!(next, 2);
    }

    #[test]
    #[should_panic(expected = "an awaited event is already pending")]
    fn two_events_cannot_be_awaited_at_once() {
        let mut queue = EventQueue::new();
        queue.push_awaited(1, vec![1], EventPayload::Focus(focus()), STAMP);
        queue.push_awaited(1, vec![1], EventPayload::Blur(focus()), STAMP);
    }

    #[test]
    fn retain_keeps_only_matching_payloads() {
        let mut queue = EventQueue::new();
        queue.push(1, vec![1], EventPayload::Focus(focus()), STAMP);
        queue.push(1, vec![1], EventPayload::Blur(focus()), STAMP);
        queue.push(1, vec![1], EventPayload::PointerLeave(pointer()), STAMP);
        queue.push(1, vec![1], EventPayload::Click(pointer()), STAMP);
        queue.retain(|payload| {
            matches!(
                payload,
                EventPayload::Blur(_) | EventPayload::PointerLeave(_)
            )
        });
        let types: Vec<_> = queue
            .drain()
            .iter()
            .map(|event| wire(event)["type"].as_str().expect("type").to_string())
            .collect();
        assert_eq!(types, ["blur", "pointerleave"]);
    }

    #[test]
    fn drop_effects_parse_and_reject_unknown_names() {
        assert_eq!(DropEffect::parse(""), Ok(None));
        assert_eq!(DropEffect::parse("none"), Ok(Some(DropEffect::None)));
        assert_eq!(DropEffect::parse("copy"), Ok(Some(DropEffect::Copy)));
        assert_eq!(DropEffect::parse("move"), Ok(Some(DropEffect::Move)));
        assert_eq!(DropEffect::parse("link"), Ok(Some(DropEffect::Link)));
        assert!(DropEffect::parse("Move").is_err());
    }

    fn pointer_wire(
        kind: &str,
        cancelable: bool,
        seq: u64,
        target: u32,
        data: &PointerData,
    ) -> Value {
        json!({
            "seq": seq, "target": target, "path": [target], "cancelable": cancelable, "timeStamp": STAMP,
            "type": kind,
            "x": data.x, "y": data.y, "viewportX": data.viewport_x, "viewportY": data.viewport_y,
            "pointerId": data.pointer_id, "pointerType": "mouse", "button": data.button,
            "buttons": data.buttons, "detail": data.detail, "relatedTarget": data.related_target,
            "shiftKey": true, "ctrlKey": false, "altKey": false, "metaKey": false
        })
    }

    #[test]
    fn every_variant_serializes_to_the_documented_wire_shape() {
        let mut queue = EventQueue::new();
        let data = pointer();
        let moved = PointerData {
            button: -1,
            detail: 0,
            ..pointer()
        };
        let entered = PointerData {
            related_target: Some(7),
            ..moved
        };
        queue.push_awaited(5, vec![5], EventPayload::PointerDown(data), STAMP);
        let mut events: Vec<Value> = queue.drain().iter().map(wire).collect();
        queue.take_outcome(1);
        queue.push(5, vec![5], EventPayload::PointerMove(moved), STAMP);
        queue.push(5, vec![5], EventPayload::PointerUp(data), STAMP);
        queue.push_crossing(
            5,
            vec![5],
            vec![7, 1],
            EventPayload::PointerEnter(entered),
            STAMP,
        );
        queue.push(5, vec![5], EventPayload::PointerLeave(moved), STAMP);
        queue.push(5, vec![5], EventPayload::Click(data), STAMP);
        queue.push(5, vec![5], EventPayload::DoubleClick(data), STAMP);
        queue.push(5, vec![5], EventPayload::AuxClick(data), STAMP);
        queue.push(5, vec![5], EventPayload::ContextMenu(data), STAMP);
        queue.push(5, vec![5], EventPayload::PointerCancel(moved), STAMP);
        queue.push_awaited(
            5,
            vec![5],
            EventPayload::Wheel(WheelData {
                pointer: moved,
                delta_x: -1.5,
                delta_y: 2.0,
            }),
            STAMP,
        );
        events.extend(queue.drain().iter().map(wire));
        queue.take_outcome(11);
        queue.push_awaited(6, vec![6], EventPayload::KeyDown(key(true)), STAMP);
        events.extend(queue.drain().iter().map(wire));
        queue.take_outcome(12);
        queue.push(6, vec![6], EventPayload::KeyUp(key(false)), STAMP);
        queue.push(6, vec![6], EventPayload::Focus(focus()), STAMP);
        queue.push(6, vec![6], EventPayload::Blur(focus()), STAMP);
        events.extend(queue.drain().iter().map(wire));
        let mut entered_wire = pointer_wire("pointerenter", false, 4, 5, &entered);
        entered_wire["relatedPath"] = json!([7, 1]);
        // A wheel event is awaited (cancelable) and carries its deltas beside the pointer fields.
        let mut wheel_wire = pointer_wire("wheel", true, 11, 5, &moved);
        wheel_wire["deltaX"] = json!(-1.5);
        wheel_wire["deltaY"] = json!(2.0);
        let expected = [
            pointer_wire("pointerdown", true, 1, 5, &data),
            pointer_wire("pointermove", false, 2, 5, &moved),
            pointer_wire("pointerup", false, 3, 5, &data),
            entered_wire,
            pointer_wire("pointerleave", false, 5, 5, &moved),
            pointer_wire("click", false, 6, 5, &data),
            pointer_wire("dblclick", false, 7, 5, &data),
            pointer_wire("auxclick", false, 8, 5, &data),
            pointer_wire("contextmenu", false, 9, 5, &data),
            pointer_wire("pointercancel", false, 10, 5, &moved),
            wheel_wire,
            // A key event is awaited (cancelable) and carries its key beside the modifiers.
            json!({"seq": 12, "target": 6, "path": [6], "cancelable": true, "timeStamp": STAMP, "type": "keydown",
                   "key": "a", "code": "KeyA", "repeat": true, "isComposing": false,
                   "shiftKey": false, "ctrlKey": true, "altKey": false, "metaKey": false}),
            json!({"seq": 13, "target": 6, "path": [6], "cancelable": false, "timeStamp": STAMP, "type": "keyup",
                   "key": "a", "code": "KeyA", "repeat": false, "isComposing": false,
                   "shiftKey": false, "ctrlKey": true, "altKey": false, "metaKey": false}),
            json!({"seq": 14, "target": 6, "path": [6], "cancelable": false, "timeStamp": STAMP, "type": "focus",
                   "relatedTarget": 3, "focusVisible": true}),
            json!({"seq": 15, "target": 6, "path": [6], "cancelable": false, "timeStamp": STAMP, "type": "blur",
                   "relatedTarget": 3, "focusVisible": true}),
        ];
        assert_eq!(events, expected);
        assert_eq!(events[3]["relatedTarget"], json!(7));
        assert_eq!(events[3]["relatedPath"], json!([7, 1]));
        assert_eq!(events[4]["relatedTarget"], Value::Null);
        assert!(
            events[4].get("relatedPath").is_none(),
            "only crossing events name the other side's path"
        );
    }

    fn scroll_data(top: f32) -> ScrollData {
        ScrollData {
            scroll_left: 0.0,
            scroll_top: top,
            scroll_width: 300.0,
            scroll_height: 900.0,
            client_width: 300.0,
            client_height: 400.0,
        }
    }

    #[test]
    fn a_scroll_event_has_the_documented_wire_shape() {
        let mut queue = EventQueue::new();
        queue.push_scroll(4, vec![4, 1], scroll_data(120.0), STAMP);
        let event = wire(&queue.drain()[0]);
        assert_eq!(
            event,
            json!({"seq": 1, "target": 4, "path": [4, 1], "cancelable": false, "timeStamp": STAMP,
                   "type": "scroll", "scrollLeft": 0.0, "scrollTop": 120.0, "scrollWidth": 300.0,
                   "scrollHeight": 900.0, "clientWidth": 300.0, "clientHeight": 400.0})
        );
    }

    #[test]
    fn scroll_events_coalesce_per_container_and_only_while_waiting() {
        let mut queue = EventQueue::new();
        let first = queue.push_scroll(4, vec![4], scroll_data(10.0), STAMP);
        queue.push(9, vec![9], EventPayload::Click(pointer()), STAMP);
        let other = queue.push_scroll(5, vec![5], scroll_data(7.0), STAMP);
        // Two more steps of container 4 replace the waiting event in place.
        assert_eq!(
            queue.push_scroll(4, vec![4], scroll_data(20.0), STAMP + 1.0),
            first
        );
        assert_eq!(
            queue.push_scroll(4, vec![4], scroll_data(30.0), STAMP + 2.0),
            first
        );
        let drained = queue.drain();
        assert_eq!(drained.len(), 3, "one scroll per container, plus the click");
        assert_eq!(drained[0].seq, first);
        assert_eq!(drained[0].payload, EventPayload::Scroll(scroll_data(30.0)));
        assert_eq!(drained[0].time_stamp, STAMP + 2.0);
        assert!(matches!(drained[1].payload, EventPayload::Click(_)));
        assert_eq!(drained[2].seq, other);
        // Once delivered, the next step is a new event.
        let later = queue.push_scroll(4, vec![4], scroll_data(40.0), STAMP + 3.0);
        assert!(later > other);
        assert_eq!(queue.drain().len(), 1);
    }

    #[test]
    fn a_selection_change_goes_to_the_root_and_coalesces_while_waiting() {
        let mut queue = EventQueue::new();
        let first = queue.push_selection_change(STAMP);
        queue.push(9, vec![9], EventPayload::Click(pointer()), STAMP);
        assert_eq!(queue.push_selection_change(STAMP + 1.0), first);
        let drained = queue.drain();
        assert_eq!(drained.len(), 2, "one selectionchange, plus the click");
        assert_eq!(
            wire(&drained[0]),
            json!({"seq": first, "target": 0, "path": [], "cancelable": false,
                   "timeStamp": STAMP + 1.0, "type": "selectionchange"})
        );
        // Once delivered, the next change is a new event.
        assert!(queue.push_selection_change(STAMP + 2.0) > first);
        assert_eq!(queue.drain().len(), 1);
    }

    #[test]
    fn an_accessibility_action_serializes_with_its_value_or_null() {
        let mut queue = EventQueue::new();
        for (action, value) in [
            (AccessibilityActionKind::Increment, None),
            (AccessibilityActionKind::Decrement, None),
            (AccessibilityActionKind::SetValue, Some(42.5)),
        ] {
            queue.push(
                5,
                vec![5, 1],
                EventPayload::AccessibilityAction(AccessibilityActionData { action, value }),
                STAMP,
            );
        }
        let events: Vec<Value> = queue.drain().iter().map(wire).collect();
        let expected = |seq: u64, action: &str, value: Value| {
            json!({"seq": seq, "target": 5, "path": [5, 1], "cancelable": false, "timeStamp": STAMP,
                   "type": "accessibilityaction", "action": action, "value": value})
        };
        assert_eq!(
            events,
            vec![
                expected(1, "increment", Value::Null),
                expected(2, "decrement", Value::Null),
                expected(3, "setValue", json!(42.5)),
            ]
        );
    }

    fn drag_data(session_id: u32) -> DragData {
        DragData {
            pointer: PointerData {
                button: -1,
                buttons: 1,
                detail: 0,
                related_target: Some(9),
                ..pointer()
            },
            session_id,
        }
    }

    #[test]
    fn drag_events_have_the_documented_wire_shape() {
        let mut queue = EventQueue::new();
        let data = drag_data(4);
        let mut events: Vec<Value> = Vec::new();
        // The events native waits for are cancelable while it waits; each answer ends the wait.
        for payload in [
            EventPayload::DragStart(data),
            EventPayload::DragOver(data),
            EventPayload::Drop(data),
        ] {
            let seq = queue.push_awaited(6, vec![6, 1], payload, STAMP);
            events.extend(queue.drain().iter().map(wire));
            queue.take_outcome(seq);
        }
        queue.push(5, vec![5, 1], EventPayload::Drag(data), STAMP);
        queue.push(6, vec![6, 1], EventPayload::DragEnter(data), STAMP);
        queue.push(6, vec![6, 1], EventPayload::DragLeave(data), STAMP);
        queue.push(
            5,
            vec![5, 1],
            EventPayload::DragEnd(DragEndData {
                drag: data,
                drop_effect: DropEffect::Move,
                ended_outside_root: true,
            }),
            STAMP,
        );
        events.extend(queue.drain().iter().map(wire));
        let types: Vec<_> = events
            .iter()
            .map(|event| event["type"].as_str().expect("type"))
            .collect();
        assert_eq!(
            types,
            [
                "dragstart",
                "dragover",
                "drop",
                "drag",
                "dragenter",
                "dragleave",
                "dragend"
            ]
        );
        let cancelable: Vec<_> = events
            .iter()
            .map(|event| event["cancelable"].as_bool().expect("cancelable"))
            .collect();
        assert_eq!(cancelable, [true, true, true, false, false, false, false]);
        for event in &events {
            assert_eq!(event["sessionId"], json!(4), "{event}");
            assert_eq!(event["button"], json!(-1));
            assert_eq!(event["buttons"], json!(1));
            assert_eq!(event["relatedTarget"], json!(9));
            assert_eq!(event["viewportX"], json!(10.5));
            assert_eq!(event["shiftKey"], json!(true));
        }
        assert_eq!(events[0]["path"], json!([6, 1]));
        assert_eq!(events[6]["dropEffect"], json!("move"));
        assert_eq!(events[6]["endedOutsideRoot"], json!(true));
        for event in &events[..6] {
            assert!(event.get("dropEffect").is_none() && event.get("endedOutsideRoot").is_none());
        }
    }

    fn effect_outcome(effect: Option<DropEffect>) -> EventOutcome {
        EventOutcome {
            default_prevented: true,
            drop_effect: effect,
        }
    }

    #[test]
    fn a_prevented_dragover_or_drop_must_name_its_effect() {
        for payload in [
            EventPayload::DragOver(drag_data(1)),
            EventPayload::Drop(drag_data(1)),
        ] {
            let kind = if matches!(payload, EventPayload::DragOver(_)) {
                "dragover"
            } else {
                "drop"
            };
            let mut queue = EventQueue::new();
            let seq = queue.push_awaited(6, vec![6], payload, STAMP);
            assert_eq!(
                queue.resolve(seq, effect_outcome(None)),
                Err(format!(
                    "event {seq} is a {kind}, which was prevented without a dropEffect"
                ))
            );
            // The rejected answer left nothing behind: JS can still answer properly.
            assert!(
                queue
                    .resolve(seq, effect_outcome(Some(DropEffect::Copy)))
                    .is_ok()
            );
            assert_eq!(
                queue.take_outcome(seq),
                effect_outcome(Some(DropEffect::Copy))
            );
            // Not prevented needs no effect, and an effect of `none` is an answer (refused).
            let seq = queue.push_awaited(6, vec![6], payload_like(kind), STAMP);
            assert!(queue.resolve(seq, EventOutcome::default()).is_ok());
            queue.take_outcome(seq);
            let seq = queue.push_awaited(6, vec![6], payload_like(kind), STAMP);
            assert!(
                queue
                    .resolve(seq, effect_outcome(Some(DropEffect::None)))
                    .is_ok()
            );
        }
    }

    fn payload_like(kind: &str) -> EventPayload {
        match kind {
            "dragover" => EventPayload::DragOver(drag_data(1)),
            _ => EventPayload::Drop(drag_data(1)),
        }
    }

    #[test]
    fn other_prevented_events_need_no_effect() {
        let mut queue = EventQueue::new();
        for payload in [
            EventPayload::DragStart(drag_data(1)),
            EventPayload::PointerDown(pointer()),
            EventPayload::KeyDown(key(false)),
        ] {
            let seq = queue.push_awaited(6, vec![6], payload, STAMP);
            assert!(queue.resolve(seq, effect_outcome(None)).is_ok());
            queue.take_outcome(seq);
        }
    }

    #[test]
    fn drop_effects_serialize_as_their_wire_names() {
        for (effect, name) in [
            (DropEffect::None, "none"),
            (DropEffect::Copy, "copy"),
            (DropEffect::Move, "move"),
            (DropEffect::Link, "link"),
        ] {
            assert_eq!(
                serde_json::to_value(effect).expect("serializes"),
                json!(name)
            );
            assert_eq!(DropEffect::parse(name), Ok(Some(effect)));
        }
    }

    #[test]
    fn touch_pointers_report_the_touch_pointer_type() {
        let data = PointerData {
            pointer_id: 2,
            pointer_type: PointerType::Touch,
            ..pointer()
        };
        let mut queue = EventQueue::new();
        queue.push(3, vec![3, 1], EventPayload::PointerDown(data), STAMP);
        let event = wire(&queue.drain()[0]);
        assert_eq!(event["pointerType"], json!("touch"));
        assert_eq!(event["pointerId"], json!(2));
    }

    #[test]
    fn synthetic_keyboard_activation_has_an_empty_pointer_type() {
        let data = PointerData {
            pointer_id: 0,
            pointer_type: PointerType::Synthetic,
            detail: 0,
            ..pointer()
        };
        let mut queue = EventQueue::new();
        queue.push(3, vec![3], EventPayload::Click(data), STAMP);
        let event = wire(&queue.drain()[0]);
        assert_eq!(event["pointerType"], json!(""));
        assert_eq!(event["pointerId"], json!(0));
        assert_eq!(event["detail"], json!(0));
    }
}
