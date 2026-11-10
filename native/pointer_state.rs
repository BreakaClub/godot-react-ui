//! Per-pointer state: one record per active pointer id, pointer capture and click counting.
//! Nothing here touches the engine's scene or input singletons, so every rule is unit
//! tested; `pointer_input.rs` feeds it from Godot's events.

use std::collections::BTreeMap;

use godot::prelude::Vector2;

/// Browsers report the mouse as pointer 1; touches follow, from this id up, one per finger that is down.
/// Pointer 0 is reserved for synthetic keyboard activation (`pointer::KEYBOARD_POINTER_ID`).
pub(crate) const TOUCH_POINTER_ID_BASE: u32 = 2;
/// A press continues a click sequence if it follows the previous one within this long. The common OS
/// double-click default; Godot exposes no interval API.
pub(crate) const CLICK_COUNT_INTERVAL_MS: f64 = 500.0;
/// ... and lands within this many logical pixels of the sequence's first press.
pub(crate) const CLICK_COUNT_SLOP_PX: f32 = 4.0;

/// The kind of device a pointer is. Pen input is reported as a mouse.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum PointerKind {
    Mouse,
    Touch,
}

/// The pointer id of each finger that is down, by its Godot touch index.
///
/// A touch index is whatever the platform calls the finger, not a small count: Godot's Web
/// platform passes the browser's `Touch.identifier` through as the index
/// (`platform/web/js/libs/library_godot_input.js`, as an `i32`), and Safari on an iPad gives
/// identifiers that are large, and negative once read as an `i32`. So a finger is given the
/// lowest free pointer id when it goes down, keeps it until it lifts, and any index is accepted.
#[derive(Debug, Default)]
pub(crate) struct TouchIds {
    by_index: BTreeMap<i32, u32>,
}

impl TouchIds {
    /// The pointer id of the finger going down at `index`: the one it already has, or the lowest free one.
    pub(crate) fn press(&mut self, index: i32) -> u32 {
        if let Some(&id) = self.by_index.get(&index) {
            return id;
        }
        let mut id = TOUCH_POINTER_ID_BASE;
        while self.by_index.values().any(|&taken| taken == id) {
            id += 1;
        }
        self.by_index.insert(index, id);
        id
    }

    /// The pointer id of the finger at `index`, or `None` if no finger is down there.
    pub(crate) fn get(&self, index: i32) -> Option<u32> {
        self.by_index.get(&index).copied()
    }

    /// The finger at `index` has lifted (or was cancelled): its pointer id is free again.
    pub(crate) fn lift(&mut self, index: i32) {
        self.by_index.remove(&index);
    }
}

/// Where a pointer's events go regardless of what lies under it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Capture {
    pub(crate) target: u32,
    /// Touch pointers are captured to their `pointerdown` target without asking; a mouse is captured
    /// only when an element calls `setPointerCapture`.
    pub(crate) implicit: bool,
}

/// A button that is down: the element its press targeted and the click count of the press (what its
/// `click` will carry as `detail`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Press {
    pub(crate) target: u32,
    pub(crate) detail: u32,
}

/// One pointer that is down, or (for the mouse) was last seen at `position`.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct PointerRecord {
    pub(crate) kind: PointerKind,
    /// Root-local logical pixels.
    pub(crate) position: Vector2,
    /// DOM `buttons`.
    pub(crate) buttons: u16,
    /// For each DOM button currently down, its press.
    presses: BTreeMap<i8, Press>,
    pub(crate) capture: Option<Capture>,
}

impl PointerRecord {
    fn new(kind: PointerKind, position: Vector2) -> Self {
        Self {
            kind,
            position,
            buttons: 0,
            presses: BTreeMap::new(),
            capture: None,
        }
    }

    /// The press of `button`, if that button is down.
    pub(crate) fn press_of(&self, button: i8) -> Option<Press> {
        self.presses.get(&button).copied()
    }

    /// Whether any button (or the touch contact) is down.
    pub(crate) fn is_down(&self) -> bool {
        !self.presses.is_empty()
    }
}

/// Why a capture request was refused. DOM throws `NotFoundError` and `InvalidStateError`; JS turns
/// these into errors of its own.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum CaptureError {
    /// The element is not mounted.
    NoSuchElement(u32),
    /// The pointer is not down: only a pressed pointer can be captured.
    PointerNotActive(u32),
}

impl std::fmt::Display for CaptureError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CaptureError::NoSuchElement(tag) => write!(formatter, "node {tag} is not mounted"),
            CaptureError::PointerNotActive(id) => write!(
                formatter,
                "pointer {id} is not active: only a pointer that is down can be captured"
            ),
        }
    }
}

/// Every pointer native knows about, by pointer id.
#[derive(Default)]
pub(crate) struct PointerTable {
    records: BTreeMap<u32, PointerRecord>,
}

impl PointerTable {
    pub(crate) fn get(&self, id: u32) -> Option<&PointerRecord> {
        self.records.get(&id)
    }

    pub(crate) fn iter(&self) -> impl Iterator<Item = (u32, &PointerRecord)> {
        self.records.iter().map(|(id, record)| (*id, record))
    }

    /// The element each touch that is down pressed, for the `active` style.
    pub(crate) fn touch_targets(&self) -> Vec<u32> {
        self.iter()
            .filter(|(_, record)| record.kind == PointerKind::Touch)
            .filter_map(|(_, record)| record.press_of(0).map(|press| press.target))
            .collect()
    }

    /// The pointer ids that are down, in id order.
    pub(crate) fn active_ids(&self) -> Vec<u32> {
        self.iter()
            .filter(|(_, record)| record.is_down())
            .map(|(id, _)| id)
            .collect()
    }

    /// Note where a pointer is. The mouse record is created on first sight; touches are created by
    /// [`PointerTable::press`].
    pub(crate) fn moved(&mut self, id: u32, kind: PointerKind, position: Vector2, buttons: u16) {
        let record = self
            .records
            .entry(id)
            .or_insert_with(|| PointerRecord::new(kind, position));
        record.position = position;
        record.buttons = buttons;
    }

    /// Record the press of `button` on `press.target`. A touch contact is captured to its target
    /// from the start. `buttons` is the DOM mask after the press.
    pub(crate) fn press(
        &mut self,
        id: u32,
        kind: PointerKind,
        button: i8,
        position: Vector2,
        buttons: u16,
        press: Press,
    ) {
        let record = self
            .records
            .entry(id)
            .or_insert_with(|| PointerRecord::new(kind, position));
        record.position = position;
        record.buttons = buttons;
        record.presses.insert(button, press);
        if kind == PointerKind::Touch && record.capture.is_none() {
            record.capture = Some(Capture {
                target: press.target,
                implicit: true,
            });
        }
    }

    /// Record the release of `button`; returns its press. When the last button is released the
    /// capture ends with the press (a mouse record stays, a touch record goes).
    pub(crate) fn release(
        &mut self,
        id: u32,
        button: i8,
        position: Vector2,
        buttons: u16,
    ) -> Option<Press> {
        let record = self.records.get_mut(&id)?;
        record.position = position;
        record.buttons = buttons;
        let press = record.presses.remove(&button);
        if !record.is_down() {
            record.capture = None;
            if record.kind == PointerKind::Touch {
                self.records.remove(&id);
            }
        }
        press
    }

    /// End a pointer's contact without a release (`pointercancel`): every press and the capture
    /// go. Returns the element that was receiving its events, if it was down.
    pub(crate) fn cancel(&mut self, id: u32) -> Option<u32> {
        let record = self.records.get_mut(&id)?;
        let target = record
            .capture
            .map(|capture| capture.target)
            .or_else(|| record.presses.values().next().map(|press| press.target));
        let was_down = record.is_down();
        record.presses.clear();
        record.buttons = 0;
        record.capture = None;
        if record.kind == PointerKind::Touch {
            self.records.remove(&id);
        }
        target.filter(|_| was_down)
    }

    /// The element that receives pointer `id`'s events: its capture, else `hit`.
    pub(crate) fn target_for(&self, id: u32, hit: Option<u32>) -> Option<u32> {
        self.records
            .get(&id)
            .and_then(|record| record.capture)
            .map(|capture| capture.target)
            .or(hit)
    }

    /// `element.setPointerCapture(id)`. `is_mounted` says whether `element` exists.
    pub(crate) fn set_capture(
        &mut self,
        id: u32,
        element: u32,
        is_mounted: bool,
    ) -> Result<(), CaptureError> {
        if !is_mounted {
            return Err(CaptureError::NoSuchElement(element));
        }
        match self.records.get_mut(&id) {
            Some(record) if record.is_down() => {
                record.capture = Some(Capture {
                    target: element,
                    implicit: false,
                });
                Ok(())
            }
            _ => Err(CaptureError::PointerNotActive(id)),
        }
    }

    /// `element.releasePointerCapture(id)`: only the capturing element can release, and an element
    /// that is not capturing does nothing (as in DOM). A released touch falls back to no capture
    /// rather than its implicit one: the page asked for it.
    pub(crate) fn release_capture(&mut self, id: u32, element: u32) {
        if let Some(record) = self.records.get_mut(&id)
            && record
                .capture
                .is_some_and(|capture| capture.target == element)
        {
            record.capture = None;
        }
    }

    /// Whether an element asked for pointer `id` (`setPointerCapture`), as opposed to a touch's own
    /// implicit capture to its `pointerdown` target. A pointer JS took starts no gesture of native's
    /// (no pan, no scrollbar thumb drag, no drag and drop, no selection).
    pub(crate) fn captured_by_js(&self, id: u32) -> bool {
        self.get(id)
            .and_then(|record| record.capture)
            .is_some_and(|capture| !capture.implicit)
    }

    pub(crate) fn has_capture(&self, id: u32, element: u32) -> bool {
        self.get(id)
            .and_then(|record| record.capture)
            .is_some_and(|capture| capture.target == element)
    }

    /// An element was deleted: nothing may keep pointing at it. A capture on it ends and a press
    /// that targeted it stays down with no target. Returns the pointers whose capture it ended.
    pub(crate) fn forget_target(&mut self, element: u32) -> Vec<u32> {
        let mut released = Vec::new();
        for (id, record) in &mut self.records {
            if record
                .capture
                .is_some_and(|capture| capture.target == element)
            {
                record.capture = None;
                released.push(*id);
            }
            record.presses.retain(|_, press| press.target != element);
        }
        // A touch with nothing left pressed is over; the mouse record stays to remember where it is.
        self.records
            .retain(|_, record| record.kind == PointerKind::Mouse || record.is_down());
        released
    }
}

/// The last press of a click sequence.
#[derive(Clone, Copy, Debug)]
struct PressSample {
    kind: PointerKind,
    button: i8,
    /// Where the sequence began.
    origin: Vector2,
    time_ms: f64,
    count: u32,
}

/// Counts consecutive presses of one button of one kind of pointer (`detail` on `click`).
#[derive(Default)]
pub(crate) struct ClickCounter {
    last: Option<PressSample>,
}

impl ClickCounter {
    /// The click count of a press of `button` at `position` and `time_ms`: one more than the
    /// previous press if that was the same button of the same kind of pointer, at most
    /// [`CLICK_COUNT_INTERVAL_MS`] earlier and within [`CLICK_COUNT_SLOP_PX`] of where the sequence
    /// began; otherwise 1.
    pub(crate) fn press(
        &mut self,
        kind: PointerKind,
        button: i8,
        position: Vector2,
        time_ms: f64,
    ) -> u32 {
        let continued = self.last.filter(|last| {
            let elapsed = time_ms - last.time_ms;
            last.kind == kind
                && last.button == button
                && (0.0..=CLICK_COUNT_INTERVAL_MS).contains(&elapsed)
                && last.origin.distance_to(position) <= CLICK_COUNT_SLOP_PX
        });
        let sample = match continued {
            Some(last) => PressSample {
                time_ms,
                count: last.count + 1,
                ..last
            },
            None => PressSample {
                kind,
                button,
                origin: position,
                time_ms,
                count: 1,
            },
        };
        self.last = Some(sample);
        sample.count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MOUSE: u32 = 1;
    const PRIMARY: i8 = 0;
    const SECONDARY: i8 = 2;
    const BUTTONS_PRIMARY: u16 = 1;
    const BUTTONS_BOTH: u16 = 3;
    const ORIGIN: Vector2 = Vector2::new(100.0, 100.0);

    fn at(x: f32, y: f32) -> Vector2 {
        Vector2::new(x, y)
    }

    fn press(target: u32) -> Press {
        Press { target, detail: 1 }
    }

    #[test]
    fn touch_ids_give_each_finger_down_the_lowest_free_id_whatever_its_index() {
        let mut ids = TouchIds::default();
        // Safari's identifiers, read as an i32, can be large or negative.
        let first = ids.press(-1_441_129_248);
        let second = ids.press(i32::MAX);
        assert_eq!(first, TOUCH_POINTER_ID_BASE);
        assert_eq!(second, TOUCH_POINTER_ID_BASE + 1);
        assert_eq!(ids.press(-1_441_129_248), first, "a finger already down keeps its id");
        assert_eq!(ids.get(i32::MAX), Some(second));
        assert_eq!(ids.get(7), None, "no finger is down at 7");
        ids.lift(-1_441_129_248);
        assert_eq!(ids.get(-1_441_129_248), None);
        assert_eq!(ids.press(0), TOUCH_POINTER_ID_BASE, "a lifted finger's id is free again");
        assert_eq!(ids.press(-1), TOUCH_POINTER_ID_BASE + 2);
    }

    #[test]
    fn clicks_in_a_sequence_count_up_and_a_slow_or_distant_press_starts_again() {
        let mut counter = ClickCounter::default();
        let press = |counter: &mut ClickCounter, position, time| {
            counter.press(PointerKind::Mouse, PRIMARY, position, time)
        };
        assert_eq!(press(&mut counter, ORIGIN, 0.0), 1);
        assert_eq!(press(&mut counter, ORIGIN, 100.0), 2);
        assert_eq!(press(&mut counter, ORIGIN, 200.0), 3);
        // Exactly the interval apart still continues; a millisecond more does not.
        assert_eq!(
            press(&mut counter, ORIGIN, 200.0 + CLICK_COUNT_INTERVAL_MS),
            4
        );
        assert_eq!(
            press(&mut counter, ORIGIN, 201.0 + 2.0 * CLICK_COUNT_INTERVAL_MS),
            1
        );
        // The slop is measured from where the sequence began, not from the previous press.
        let start = 10_000.0;
        assert_eq!(press(&mut counter, ORIGIN, start), 1);
        assert_eq!(
            press(&mut counter, at(103.0, 100.0), start + 10.0),
            2,
            "inside the slop"
        );
        assert_eq!(
            press(&mut counter, at(106.0, 100.0), start + 20.0),
            1,
            "6 px from the origin: new sequence"
        );
        assert_eq!(
            press(&mut counter, at(106.0, 100.0), start + 30.0),
            2,
            "the new sequence began at 106"
        );
    }

    #[test]
    fn another_button_or_kind_of_pointer_or_a_clock_that_ran_backwards_starts_a_sequence() {
        let mut counter = ClickCounter::default();
        assert_eq!(counter.press(PointerKind::Mouse, PRIMARY, ORIGIN, 0.0), 1);
        assert_eq!(
            counter.press(PointerKind::Mouse, SECONDARY, ORIGIN, 10.0),
            1
        );
        assert_eq!(
            counter.press(PointerKind::Mouse, PRIMARY, ORIGIN, 20.0),
            1,
            "the right press interrupted it"
        );
        assert_eq!(counter.press(PointerKind::Touch, PRIMARY, ORIGIN, 30.0), 1);
        assert_eq!(counter.press(PointerKind::Touch, PRIMARY, ORIGIN, 40.0), 2);
        assert_eq!(
            counter.press(PointerKind::Touch, PRIMARY, ORIGIN, 10.0),
            1,
            "time never goes backwards"
        );
    }

    #[test]
    fn a_mouse_press_and_release_leave_the_record_and_a_touch_release_removes_it() {
        let mut table = PointerTable::default();
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(7),
        );
        assert_eq!(table.active_ids(), vec![MOUSE]);
        assert_eq!(
            table.get(MOUSE).and_then(|record| record.press_of(PRIMARY)),
            Some(press(7))
        );
        assert_eq!(
            table.release(MOUSE, PRIMARY, at(120.0, 100.0), 0),
            Some(press(7))
        );
        assert!(table.active_ids().is_empty());
        assert_eq!(
            table.get(MOUSE).map(|record| record.position),
            Some(at(120.0, 100.0)),
            "the mouse stays known"
        );

        let touch = TOUCH_POINTER_ID_BASE + 0;
        table.press(
            touch,
            PointerKind::Touch,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(9),
        );
        assert_eq!(
            table.get(touch).and_then(|record| record.capture),
            Some(Capture {
                target: 9,
                implicit: true
            })
        );
        assert_eq!(table.release(touch, PRIMARY, ORIGIN, 0), Some(press(9)));
        assert!(table.get(touch).is_none(), "a finished touch has no record");
    }

    #[test]
    fn several_buttons_keep_their_own_targets_and_the_capture_ends_with_the_last_release() {
        let mut table = PointerTable::default();
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(7),
        );
        table.press(
            MOUSE,
            PointerKind::Mouse,
            SECONDARY,
            ORIGIN,
            BUTTONS_BOTH,
            press(8),
        );
        assert_eq!(table.set_capture(MOUSE, 5, true), Ok(()));
        assert_eq!(table.release(MOUSE, PRIMARY, ORIGIN, 2), Some(press(7)));
        assert!(table.has_capture(MOUSE, 5), "one button is still down");
        assert_eq!(table.release(MOUSE, SECONDARY, ORIGIN, 0), Some(press(8)));
        assert!(
            !table.has_capture(MOUSE, 5),
            "the last release ends the capture"
        );
        assert_eq!(
            table.release(MOUSE, SECONDARY, ORIGIN, 0),
            None,
            "a button that was not down"
        );
    }

    #[test]
    fn capture_needs_a_mounted_element_and_a_pointer_that_is_down() {
        let mut table = PointerTable::default();
        assert_eq!(
            table.set_capture(MOUSE, 5, true),
            Err(CaptureError::PointerNotActive(MOUSE))
        );
        table.moved(MOUSE, PointerKind::Mouse, ORIGIN, 0);
        assert_eq!(
            table.set_capture(MOUSE, 5, true),
            Err(CaptureError::PointerNotActive(MOUSE)),
            "a pointer that has only moved is not active"
        );
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(7),
        );
        assert_eq!(
            table.set_capture(MOUSE, 5, false),
            Err(CaptureError::NoSuchElement(5))
        );
        assert!(
            !table.has_capture(MOUSE, 5),
            "a refused request changes nothing"
        );
        assert_eq!(table.set_capture(MOUSE, 5, true), Ok(()));
        assert!(table.has_capture(MOUSE, 5));
        assert!(!table.has_capture(MOUSE, 6));
        assert!(!table.has_capture(99, 5));
        assert_eq!(
            CaptureError::PointerNotActive(4).to_string(),
            "pointer 4 is not active: only a pointer that is down can be captured"
        );
        assert_eq!(
            CaptureError::NoSuchElement(9).to_string(),
            "node 9 is not mounted"
        );
    }

    #[test]
    fn captured_events_go_to_the_capturing_element_wherever_the_pointer_is() {
        let mut table = PointerTable::default();
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(7),
        );
        assert_eq!(
            table.target_for(MOUSE, Some(3)),
            Some(3),
            "no capture: whatever is under the pointer"
        );
        assert_eq!(table.target_for(MOUSE, None), None);
        table.set_capture(MOUSE, 5, true).unwrap();
        assert_eq!(table.target_for(MOUSE, Some(3)), Some(5));
        assert_eq!(
            table.target_for(MOUSE, None),
            Some(5),
            "even where nothing is"
        );
        assert_eq!(
            table.target_for(2, Some(3)),
            Some(3),
            "other pointers are unaffected"
        );
    }

    #[test]
    fn only_a_capture_an_element_asked_for_counts_as_js_taking_the_pointer() {
        let mut table = PointerTable::default();
        let touch = TOUCH_POINTER_ID_BASE + 0;
        assert!(
            !table.captured_by_js(MOUSE),
            "an unknown pointer is nobody's"
        );
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(7),
        );
        assert!(
            !table.captured_by_js(MOUSE),
            "a pressed mouse is not captured"
        );
        table.press(
            touch,
            PointerKind::Touch,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(9),
        );
        assert!(
            table.has_capture(touch, 9) && !table.captured_by_js(touch),
            "a touch's implicit capture to its pointerdown target is not JS's: that touch may still pan"
        );
        table.set_capture(touch, 9, true).unwrap();
        table.set_capture(MOUSE, 7, true).unwrap();
        assert!(
            table.captured_by_js(touch) && table.captured_by_js(MOUSE),
            "setPointerCapture is, even on the element the touch is implicitly captured to"
        );
        table.release_capture(touch, 9);
        assert!(
            !table.captured_by_js(touch),
            "and releasing it gives the pointer back"
        );
        table.release(MOUSE, PRIMARY, ORIGIN, 0);
        assert!(
            !table.captured_by_js(MOUSE),
            "the capture ends with the press"
        );
    }

    #[test]
    fn only_the_capturing_element_can_release_and_a_touch_is_captured_implicitly() {
        let mut table = PointerTable::default();
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(7),
        );
        table.set_capture(MOUSE, 5, true).unwrap();
        table.release_capture(MOUSE, 6);
        assert!(
            table.has_capture(MOUSE, 5),
            "another element cannot release it"
        );
        table.release_capture(MOUSE, 5);
        assert!(!table.has_capture(MOUSE, 5));
        table.release_capture(MOUSE, 5);

        let touch = TOUCH_POINTER_ID_BASE + 1;
        table.press(
            touch,
            PointerKind::Touch,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(9),
        );
        assert_eq!(
            table.target_for(touch, Some(4)),
            Some(9),
            "a touch follows its pointerdown target"
        );
        table.set_capture(touch, 5, true).unwrap();
        assert_eq!(
            table.target_for(touch, Some(4)),
            Some(5),
            "an explicit capture replaces the implicit one"
        );
        assert_eq!(
            table.get(touch).and_then(|record| record.capture),
            Some(Capture {
                target: 5,
                implicit: false
            })
        );
    }

    #[test]
    fn cancel_ends_every_press_and_reports_who_was_receiving() {
        let mut table = PointerTable::default();
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(7),
        );
        table.set_capture(MOUSE, 5, true).unwrap();
        assert_eq!(
            table.cancel(MOUSE),
            Some(5),
            "the capture target receives the cancel"
        );
        assert!(table.active_ids().is_empty());
        assert_eq!(
            table.cancel(MOUSE),
            None,
            "a pointer that is not down has nothing to cancel"
        );
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(7),
        );
        assert_eq!(
            table.cancel(MOUSE),
            Some(7),
            "without capture, the press target"
        );

        let touch = TOUCH_POINTER_ID_BASE + 0;
        table.press(
            touch,
            PointerKind::Touch,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(9),
        );
        assert_eq!(table.cancel(touch), Some(9));
        assert!(table.get(touch).is_none());
        assert_eq!(table.cancel(1234), None);
    }

    #[test]
    fn presses_keep_their_click_count_and_touches_report_their_targets() {
        let mut table = PointerTable::default();
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            Press {
                target: 7,
                detail: 3,
            },
        );
        assert_eq!(
            table.release(MOUSE, PRIMARY, ORIGIN, 0),
            Some(Press {
                target: 7,
                detail: 3
            })
        );
        assert!(table.touch_targets().is_empty(), "the mouse is not a touch");
        let first = TOUCH_POINTER_ID_BASE + 0;
        let second = TOUCH_POINTER_ID_BASE + 1;
        table.press(
            first,
            PointerKind::Touch,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(9),
        );
        table.press(
            second,
            PointerKind::Touch,
            PRIMARY,
            at(1.0, 1.0),
            BUTTONS_PRIMARY,
            press(4),
        );
        assert_eq!(table.touch_targets(), vec![9, 4]);
        assert_eq!(table.active_ids(), vec![first, second]);
        table.release(first, PRIMARY, ORIGIN, 0);
        assert_eq!(table.touch_targets(), vec![4]);
    }

    #[test]
    fn deleting_an_element_ends_its_captures_and_presses() {
        let mut table = PointerTable::default();
        table.press(
            MOUSE,
            PointerKind::Mouse,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(7),
        );
        table.press(
            MOUSE,
            PointerKind::Mouse,
            SECONDARY,
            ORIGIN,
            BUTTONS_BOTH,
            press(8),
        );
        table.set_capture(MOUSE, 8, true).unwrap();
        let touch = TOUCH_POINTER_ID_BASE + 0;
        table.press(
            touch,
            PointerKind::Touch,
            PRIMARY,
            ORIGIN,
            BUTTONS_PRIMARY,
            press(8),
        );
        let mut released = table.forget_target(8);
        released.sort_unstable();
        assert_eq!(released, vec![MOUSE, touch]);
        assert_eq!(
            table
                .get(MOUSE)
                .and_then(|record| record.press_of(SECONDARY)),
            None
        );
        assert_eq!(
            table.get(MOUSE).and_then(|record| record.press_of(PRIMARY)),
            Some(press(7))
        );
        assert!(table.forget_target(8).is_empty());
        assert!(
            table.get(touch).is_none(),
            "a touch with nothing left pressed is over"
        );
        assert!(table.get(MOUSE).is_some(), "the mouse record stays");
    }
}
