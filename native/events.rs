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

/// One variant per wire `type`. Focus fields (`relatedTarget`, `focusVisible`) arrive with the
/// keyboard model.
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
    Focus,
    Blur,
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
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
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
    /// Set by `DataTransfer.dropEffect` once drag and drop lands; nothing acts on it before then.
    pub drop_effect: Option<DropEffect>,
}

/// Events waiting for JS, and the single event native is currently blocked on.
pub struct EventQueue {
    next_seq: EventSeq,
    queued: Vec<UiEvent>,
    awaited: Option<EventSeq>,
    outcome: Option<EventOutcome>,
}

impl EventQueue {
    pub fn new() -> Self {
        Self {
            next_seq: 1,
            queued: Vec::new(),
            awaited: None,
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
        let seq = self.enqueue(target, path, Vec::new(), payload, time_stamp, true);
        self.awaited = Some(seq);
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
        assert_eq!(queue.push(1, vec![1], EventPayload::Focus, STAMP), 1);
        assert_eq!(queue.push(1, vec![1], EventPayload::Blur, STAMP), 2);
        assert_eq!(
            queue.push_awaited(2, vec![2], EventPayload::Focus, STAMP),
            3
        );
        let seqs: Vec<_> = queue.drain().iter().map(|event| event.seq).collect();
        assert_eq!(seqs, [1, 2, 3]);
        assert!(queue.is_empty());
    }

    #[test]
    fn only_awaited_events_are_cancelable_and_only_while_awaited() {
        let mut queue = EventQueue::new();
        queue.push(1, vec![1], EventPayload::Focus, STAMP);
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
        let plain = queue.push(1, vec![1], EventPayload::Focus, STAMP);
        assert_eq!(
            queue.resolve(plain, prevented()),
            Err("event 1 is not awaiting a result".to_string())
        );
        assert!(queue.resolve(99, prevented()).is_err());
        let awaited = queue.push_awaited(2, vec![2], EventPayload::Blur, STAMP);
        assert!(queue.resolve(awaited + 1, prevented()).is_err());
    }

    #[test]
    fn resolving_twice_is_an_error_and_keeps_the_first_answer() {
        let mut queue = EventQueue::new();
        let seq = queue.push_awaited(2, vec![2], EventPayload::Focus, STAMP);
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
        let seq = queue.push_awaited(2, vec![2], EventPayload::Focus, STAMP);
        assert_eq!(queue.take_outcome(seq), EventOutcome::default());
        assert!(
            queue.resolve(seq, prevented()).is_err(),
            "no longer awaited"
        );
        // A new awaited event may start once the previous wait ended.
        let next = queue.push_awaited(2, vec![2], EventPayload::Blur, STAMP);
        assert_eq!(next, 2);
    }

    #[test]
    #[should_panic(expected = "an awaited event is already pending")]
    fn two_events_cannot_be_awaited_at_once() {
        let mut queue = EventQueue::new();
        queue.push_awaited(1, vec![1], EventPayload::Focus, STAMP);
        queue.push_awaited(1, vec![1], EventPayload::Blur, STAMP);
    }

    #[test]
    fn retain_keeps_only_matching_payloads() {
        let mut queue = EventQueue::new();
        queue.push(1, vec![1], EventPayload::Focus, STAMP);
        queue.push(1, vec![1], EventPayload::Blur, STAMP);
        queue.push(1, vec![1], EventPayload::PointerLeave(pointer()), STAMP);
        queue.push(1, vec![1], EventPayload::Click(pointer()), STAMP);
        queue.retain(|payload| {
            matches!(payload, EventPayload::Blur | EventPayload::PointerLeave(_))
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
        queue.push(6, vec![6], EventPayload::Focus, STAMP);
        queue.push(6, vec![6], EventPayload::Blur, STAMP);
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
            json!({"seq": 12, "target": 6, "path": [6], "cancelable": false, "timeStamp": STAMP, "type": "focus"}),
            json!({"seq": 13, "target": 6, "path": [6], "cancelable": false, "timeStamp": STAMP, "type": "blur"}),
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
