//! One touch's pan gesture (plan 3.12 gesture arbitration, rule 4, and 3.16): from the finger going
//! down to the moment it turns into a scroll, is declined, or lifts. Nothing here touches the engine
//! or the mounted tree: the integrating code (`scroll_input.rs`) builds the candidate path when the
//! touch first moves beyond the slop and applies the scroll this returns.
//!
//! The decision is made once, at the first movement beyond [`TOUCH_SLOP_PX`], as browsers decide a
//! gesture's owner when it starts: a touch that is declined stays pointer events until it lifts, and
//! a touch that pans stays with its owner until it lifts (it *latches*; a container that reaches its
//! end mid-gesture does not hand the rest of the gesture to its ancestor). Wheel and pan-gesture
//! input chain instead, event by event (`scroll::scroll_chain`).

use crate::scroll::{PanOwner, TOUCH_SLOP_PX, Vec2, VelocityTracker, exceeds_slop};

#[derive(Clone, Copy, Debug, PartialEq)]
enum Phase {
    /// The finger has not moved beyond the slop; it is still a tap or a hold.
    Pending,
    /// It moved beyond the slop and nothing could pan: it stays a pointer for the rest of the touch.
    Declined,
    Panning(PanOwner),
}

/// What one movement of the finger asks of the caller.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct PanMove {
    /// The touch has just become a pan owned by this container: send `pointercancel` before applying
    /// anything, and stop sending pointer events for the touch.
    pub(crate) started: Option<PanOwner>,
    /// The touch has just been declined: nothing can pan it, so it stays pointer events.
    pub(crate) declined: bool,
    /// How far to scroll the owner, in pixels, on the axes its `touch-action` allows (positive moves
    /// the offset towards the end of its range). Zero until the pan has started.
    pub(crate) scroll: Vec2,
}

impl PanMove {
    const IDLE: Self = Self {
        started: None,
        declined: false,
        scroll: Vec2::ZERO,
    };
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct PanGesture {
    origin: Vec2,
    last: Vec2,
    phase: Phase,
    tracker: VelocityTracker,
}

impl PanGesture {
    /// A finger went down at `origin`.
    pub(crate) fn new(origin: Vec2) -> Self {
        Self {
            origin,
            last: origin,
            phase: Phase::Pending,
            tracker: VelocityTracker::new(),
        }
    }

    /// The owner of the pan, once it started.
    pub(crate) fn owner(&self) -> Option<PanOwner> {
        match self.phase {
            Phase::Panning(owner) => Some(owner),
            Phase::Pending | Phase::Declined => None,
        }
    }

    /// The finger moved to `position`. `arbitrate` runs once, at the first movement beyond the slop,
    /// with the displacement from where the finger went down (`scroll::pan_owner` over the path).
    ///
    /// The distance travelled up to the slop is not scrolled: the content starts to follow the finger
    /// from where the pan began, as browsers and Android do, so it does not jump.
    pub(crate) fn moved(
        &mut self,
        position: Vec2,
        arbitrate: impl FnOnce(Vec2) -> Option<PanOwner>,
    ) -> PanMove {
        match self.phase {
            Phase::Pending => {
                if !exceeds_slop(position - self.origin, TOUCH_SLOP_PX) {
                    return PanMove::IDLE;
                }
                match arbitrate(position - self.origin) {
                    Some(owner) => {
                        self.phase = Phase::Panning(owner);
                        self.last = position;
                        PanMove {
                            started: Some(owner),
                            ..PanMove::IDLE
                        }
                    }
                    None => {
                        self.phase = Phase::Declined;
                        PanMove {
                            declined: true,
                            ..PanMove::IDLE
                        }
                    }
                }
            }
            Phase::Declined => PanMove::IDLE,
            Phase::Panning(owner) => {
                let movement = position - self.last;
                self.last = position;
                // The content follows the finger, so the offset moves the other way; an axis the
                // owner's `touch-action` forbids does not move at all.
                let scroll = Vec2::new(
                    if owner.allowed.x { -movement.x } else { 0.0 },
                    if owner.allowed.y { -movement.y } else { 0.0 },
                );
                self.tracker.motion(scroll);
                PanMove {
                    scroll,
                    ..PanMove::IDLE
                }
            }
        }
    }

    /// One frame passed while the finger is down: the release velocity is sampled on it.
    pub(crate) fn frame(&mut self, dt: f32) {
        self.tracker.frame(dt);
    }

    /// The velocity to coast with after the finger lifts (pixels per second, positive towards the
    /// end of the range). Zero unless the touch panned.
    pub(crate) fn release(&self) -> Vec2 {
        match self.phase {
            Phase::Panning(_) => self.tracker.release(),
            Phase::Pending | Phase::Declined => Vec2::ZERO,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scroll::PanAllowed;

    const FRAME_S: f32 = 1.0 / 60.0;

    fn owner(allowed: PanAllowed) -> PanOwner {
        PanOwner { index: 1, allowed }
    }

    fn at(x: f32, y: f32) -> Vec2 {
        Vec2::new(x, y)
    }

    #[test]
    fn a_touch_inside_the_slop_is_not_arbitrated() {
        let mut gesture = PanGesture::new(at(100.0, 100.0));
        let step = gesture.moved(at(105.0, 103.0), |_| panic!("inside the slop: no decision"));
        assert_eq!(step, PanMove::IDLE);
        assert_eq!(gesture.owner(), None);
    }

    #[test]
    fn the_slop_is_strict_and_the_decision_is_made_once_with_the_displacement() {
        let mut gesture = PanGesture::new(at(0.0, 0.0));
        // Exactly the slop along an axis: still a tap.
        assert_eq!(
            gesture.moved(at(0.0, TOUCH_SLOP_PX), |_| panic!("not beyond")),
            PanMove::IDLE
        );
        let mut asked = Vec::new();
        let step = gesture.moved(at(0.0, TOUCH_SLOP_PX + 1.0), |displacement| {
            asked.push(displacement);
            Some(owner(PanAllowed::ALL))
        });
        assert_eq!(asked, vec![at(0.0, TOUCH_SLOP_PX + 1.0)]);
        assert_eq!(step.started, Some(owner(PanAllowed::ALL)));
        assert_eq!(
            step.scroll,
            Vec2::ZERO,
            "the slop is consumed, not scrolled"
        );
        // Later movements never arbitrate again.
        gesture.moved(at(0.0, 40.0), |_| panic!("decided"));
    }

    #[test]
    fn a_declined_touch_stays_declined_whatever_it_does_next() {
        let mut gesture = PanGesture::new(at(0.0, 0.0));
        let step = gesture.moved(at(30.0, 0.0), |_| None);
        assert!(step.declined && step.started.is_none());
        for position in [at(30.0, 60.0), at(0.0, 0.0), at(200.0, 200.0)] {
            assert_eq!(
                gesture.moved(position, |_| panic!("decided once")),
                PanMove::IDLE
            );
        }
        assert_eq!(gesture.owner(), None);
        assert_eq!(gesture.release(), Vec2::ZERO);
    }

    #[test]
    fn a_pan_scrolls_opposite_to_the_finger_incrementally_and_only_on_allowed_axes() {
        let mut gesture = PanGesture::new(at(50.0, 50.0));
        gesture.moved(at(50.0, 70.0), |_| Some(owner(PanAllowed::ALL)));
        // The finger moves up 12 and left 3 since the pan began: the content follows, so the offset
        // grows by 12 and 3.
        let step = gesture.moved(at(47.0, 58.0), |_| panic!("decided"));
        assert_eq!(step.scroll, at(3.0, 12.0));
        let step = gesture.moved(at(47.0, 60.0), |_| panic!("decided"));
        assert_eq!(step.scroll, at(0.0, -2.0), "dragging back scrolls back");

        let vertical_only = PanAllowed { x: false, y: true };
        let mut gesture = PanGesture::new(at(50.0, 50.0));
        gesture.moved(at(50.0, 70.0), |_| Some(owner(vertical_only)));
        let step = gesture.moved(at(20.0, 58.0), |_| panic!("decided"));
        assert_eq!(
            step.scroll,
            at(0.0, 12.0),
            "pan-y takes no horizontal movement"
        );
    }

    #[test]
    fn release_velocity_is_what_the_last_frames_saw_and_zero_without_a_pan() {
        let mut gesture = PanGesture::new(at(0.0, 0.0));
        gesture.moved(at(0.0, 20.0), |_| Some(owner(PanAllowed::ALL)));
        gesture.moved(at(0.0, 10.0), |_| panic!("decided"));
        gesture.frame(FRAME_S);
        // 10 px of scroll in one frame.
        let velocity = gesture.release();
        assert!(
            (velocity.y - 10.0 / FRAME_S).abs() < 0.01 && velocity.x == 0.0,
            "{velocity:?}"
        );
        let mut tap = PanGesture::new(at(0.0, 0.0));
        tap.frame(FRAME_S);
        assert_eq!(tap.release(), Vec2::ZERO);
    }
}
