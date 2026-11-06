//! HTML-style drag and drop (plan section 3.19) as a state machine, `Idle -> Pending -> Dragging ->
//! Ended`, with no engine, tree or clock behind it: hit testing and event delivery are injected through
//! [`DragEnvironment`], and time arrives as the `now_ms` of every call. Phase I9 owns the integration
//! (which pointers feed it, how events become `UiEvent`s, the ghost, the cursor, edge auto-scroll).
//!
//! # Public API (what Phase I9 calls)
//!
//! - [`DragMachine::new`]`(`[`DragConfig::new`]`(viewport.get_drag_threshold()))`; keep one per root.
//! - [`DragMachine::handle`]`(now_ms, `[`DragInput`]`, &mut env)` for every input that may concern a
//!   drag: a primary-button or touch press (`PointerDown`, carrying the nearest `draggable` element if
//!   there is one), pointer moves, the hold-timer [`DragInput::HoldTick`], release, OS cancel, Escape,
//!   the root leaving the tree and [`DragInput::Refresh`] (the scroll position changed under a stationary
//!   pointer). It returns a [`DragStep`]: whether the drag consumed the input and what happened.
//! - [`DragMachine::next_deadline_ms`] tells the owner's per-frame activity decision when the next
//!   `HoldTick` is due (a touch waiting to become a drag); `None` means no timer is needed.
//! - Accessors for the ghost, the cursor and auto-scroll: [`DragMachine::state`], `origin`, `position`,
//!   `source`, `target`, `pointer` and [`DragMachine::allowed_effect`] (the drop effect the current target
//!   accepted; `None` shows the forbidden cursor, `Some` the can-drop one).
//! - [`DragReply::from_outcome`] turns what `resolve_event` reported for a drag event into the typed
//!   reply the environment returns, rejecting a `dragover` or `drop` that was prevented without a
//!   `dropEffect`.
//!
//! # Event sequence
//!
//! `dragstart` (cancelable; prevented means no drag and the pointer carries on as plain pointer events)
//! then `pointercancel`; then for the start, every move and every [`DragInput::Refresh`]: `drag` on the
//! source; on a target change `dragenter` on the new target and then `dragleave` on the old one (the
//! HTML order); `dragover` (cancelable) on the target. A prevented `dragover` accepts the drop with the
//! `dropEffect` JS settled on (`none` refuses). Release: `drop` (cancelable) if the current target
//! accepted, else `dragleave` on the target; then `dragend` with the final effect (a prevented `drop`'s
//! effect, else `none`) and `endedOutsideRoot` (the release was outside the root). Escape, an OS cancel
//! and the root leaving cancel with `dragleave` and `dragend` (effect `none`, not outside).
//!
//! # Re-entrancy
//!
//! `emit` runs JS, which can unmount anything, including the root (plan 3.10). The machine therefore
//! never holds a borrow of the owner: keep it in an `Option` on the root, `take()` it, call `handle`
//! with an environment that borrows the rest of the root, and put it back only if the root is still
//! mounted. After `emit`, the source and target tags may no longer exist; the environment skips an
//! event whose target is gone (a `dragend` for a removed source is simply not delivered). A source that
//! is gone before `dragstart` is refused: JS would have no data store for the rest of the drag.

use crate::events::{DropEffect, EventOutcome};
use crate::scroll::{TOUCH_SLOP_PX, Vec2, exceeds_slop};

/// How long a touch must stay within the slop to become a drag (plan Appendix A: mobile
/// long-press-to-drag; tune with evidence).
pub(crate) const TOUCH_DRAG_HOLD_MS: f64 = 500.0;

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct DragConfig {
    /// A mouse press becomes a drag once it has moved further than this from where it began: Godot's
    /// `Viewport.get_drag_threshold()` (default 10), compared as the engine does (Euclidean, strict,
    /// `scene/main/viewport.cpp:2051-2052`).
    pub(crate) mouse_threshold_px: f32,
    pub(crate) touch_slop_px: f32,
    pub(crate) touch_hold_ms: f64,
}

impl DragConfig {
    /// `mouse_threshold_px` comes from the viewport; the touch values are the plan's constants.
    pub(crate) fn new(mouse_threshold_px: f32) -> Self {
        Self {
            mouse_threshold_px,
            touch_slop_px: TOUCH_SLOP_PX,
            touch_hold_ms: TOUCH_DRAG_HOLD_MS,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DragPointerKind {
    Mouse,
    Touch,
}

/// The pointer that began the gesture.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct DragPointer {
    pub(crate) id: u32,
    pub(crate) kind: DragPointerKind,
}

/// What lies under a position, as the environment's hit test reports it. The test ignores
/// `pointerEvents: none` elements and the drag ghost.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DragHit {
    /// Beyond the root: a release here is `endedOutsideRoot`.
    Outside,
    /// Inside the root, over no element.
    Inside,
    Element(u32),
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) enum DragInput {
    /// A primary-button or touch press. `source` is the nearest `draggable` element at or above the
    /// press target, or `None` when the press is not inside one (the machine then ignores the gesture).
    PointerDown {
        pointer: DragPointer,
        position: Vec2,
        source: Option<u32>,
    },
    PointerMove {
        pointer_id: u32,
        position: Vec2,
    },
    /// The owner's hold timer fired (see [`DragMachine::next_deadline_ms`]).
    HoldTick,
    PointerUp {
        pointer_id: u32,
        position: Vec2,
    },
    /// The OS cancelled the pointer.
    PointerCancel {
        pointer_id: u32,
    },
    Escape,
    /// The root left the tree.
    RootExit,
    /// What lies under the stationary pointer may have changed (a scroll, a layout change): hit test
    /// again at the last position.
    Refresh,
}

/// One event of the drag sequence for the environment to deliver. `source` is the dragged element on
/// every event (JS finds the session's `DataTransfer` from it); `position` is root-local.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct DragEvent {
    pub(crate) source: u32,
    pub(crate) pointer: DragPointer,
    pub(crate) position: Vec2,
    pub(crate) kind: DragEventKind,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) enum DragEventKind {
    /// The pointer is cancelled for the pointer-event stream: no `pointerup` and no `click` follow.
    PointerCancel,
    /// Cancelable, dispatched at the source.
    DragStart,
    /// Dispatched at the source.
    Drag,
    DragEnter {
        target: u32,
        related_target: Option<u32>,
    },
    DragLeave {
        target: u32,
        related_target: Option<u32>,
    },
    /// Cancelable. Prevented accepts the drop with the effect JS settled on.
    DragOver { target: u32 },
    /// Cancelable. `drop_effect` is the effect the last `dragover` accepted.
    Drop {
        target: u32,
        drop_effect: DropEffect,
    },
    /// Dispatched at the source with the final effect.
    DragEnd {
        drop_effect: DropEffect,
        ended_outside_root: bool,
    },
}

impl DragEvent {
    pub(crate) fn is_cancelable(&self) -> bool {
        match self.kind {
            DragEventKind::DragStart
            | DragEventKind::DragOver { .. }
            | DragEventKind::Drop { .. } => true,
            DragEventKind::PointerCancel
            | DragEventKind::Drag
            | DragEventKind::DragEnter { .. }
            | DragEventKind::DragLeave { .. }
            | DragEventKind::DragEnd { .. } => false,
        }
    }
}

/// What JS answered for an event.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DragReply {
    /// Not cancelable, or `preventDefault()` was not called.
    Default,
    /// `preventDefault()` was called. For `dragover` and `drop` the effect is what the handler's
    /// `DataTransfer` settled on after `effectAllowed` was applied (`none` refuses); for `dragstart`
    /// it is [`DropEffect::None`].
    Prevented(DropEffect),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DragReplyError {
    /// A prevented `dragover` or `drop` reported no `dropEffect`. JS's `DataTransfer` always has one,
    /// so this is a bug on the JS side, to be reported as a `resolve_event` error.
    MissingDropEffect,
}

impl DragReply {
    /// Validate the `resolve_event` arguments for `event`.
    pub(crate) fn from_outcome(
        event: &DragEvent,
        outcome: EventOutcome,
    ) -> Result<Self, DragReplyError> {
        if !outcome.default_prevented {
            return Ok(Self::Default);
        }
        match event.kind {
            DragEventKind::DragOver { .. } | DragEventKind::Drop { .. } => outcome
                .drop_effect
                .map(Self::Prevented)
                .ok_or(DragReplyError::MissingDropEffect),
            DragEventKind::DragStart
            | DragEventKind::PointerCancel
            | DragEventKind::Drag
            | DragEventKind::DragEnter { .. }
            | DragEventKind::DragLeave { .. }
            | DragEventKind::DragEnd { .. } => Ok(Self::Prevented(DropEffect::None)),
        }
    }
}

/// What the machine needs from its owner. Both calls are synchronous, as the event dispatch is.
pub(crate) trait DragEnvironment {
    /// The element under `position` that can be a drop target, in root-local pixels.
    fn hit_test(&mut self, position: Vec2) -> DragHit;
    /// Deliver `event` to JS and report its answer; [`DragReply::Default`] for events nobody can
    /// prevent.
    fn emit(&mut self, event: DragEvent) -> DragReply;
    /// Whether element `tag` is still mounted. JS may have removed the source between the press and
    /// the moment the gesture qualifies as a drag.
    fn exists(&mut self, tag: u32) -> bool;
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DragState {
    Idle,
    /// A press inside a draggable element that has not become a drag yet.
    Pending,
    Dragging,
    /// The gesture is over (a drag finished or was cancelled, or a press turned out not to be a drag).
    /// The next press starts afresh.
    Ended,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DragEndReason {
    /// A `drop` event was dispatched.
    Dropped,
    /// Released with no accepting target.
    Released,
    Escape,
    PointerCancel,
    RootExit,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct DragEnded {
    pub(crate) reason: DragEndReason,
    /// What `dragend` carried.
    pub(crate) drop_effect: DropEffect,
    pub(crate) ended_outside_root: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DragOutcome {
    /// `dragstart` was accepted and `pointercancel` sent: the pointer belongs to the drag now. The
    /// owner stops any pan, selection or click for it.
    Started,
    /// `dragstart` was prevented: the pointer carries on as plain pointer events.
    Refused,
    /// A touch moved beyond the slop before the hold elapsed: not a drag. Pan or pointer handling
    /// takes over.
    Declined,
    Ended(DragEnded),
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct DragStep {
    /// The input belonged to a drag (or to the aftermath of one), so the owner must not deliver it as
    /// a pointer event, start a click, or pass an Escape key on.
    pub(crate) consumed: bool,
    /// In order; usually zero or one (a touch whose hold elapsed unseen starts and then continues).
    pub(crate) outcomes: Vec<DragOutcome>,
}

#[derive(Clone, Copy, Debug)]
struct Pending {
    pointer: DragPointer,
    source: u32,
    origin: Vec2,
    position: Vec2,
    down_ms: f64,
}

#[derive(Clone, Copy, Debug)]
struct Dragging {
    pointer: DragPointer,
    source: u32,
    origin: Vec2,
    position: Vec2,
    hit: DragHit,
    target: Option<u32>,
    /// The effect the current target accepted with its latest `dragover`.
    allowed: Option<DropEffect>,
}

#[derive(Clone, Copy, Debug)]
struct Ended {
    /// The pointer that is still down, if it is.
    held: Option<u32>,
    /// Its remaining events belong to the drag that ended (the pointer was cancelled at the start).
    swallow: bool,
}

#[derive(Clone, Copy, Debug)]
enum Phase {
    Idle,
    Pending(Pending),
    Dragging(Dragging),
    Ended(Ended),
}

/// The drag-and-drop state machine. See the module documentation.
pub(crate) struct DragMachine {
    config: DragConfig,
    phase: Phase,
}

impl DragMachine {
    pub(crate) fn new(config: DragConfig) -> Self {
        Self {
            config,
            phase: Phase::Idle,
        }
    }

    pub(crate) fn set_config(&mut self, config: DragConfig) {
        self.config = config;
    }

    pub(crate) fn state(&self) -> DragState {
        match self.phase {
            Phase::Idle => DragState::Idle,
            Phase::Pending(_) => DragState::Pending,
            Phase::Dragging(_) => DragState::Dragging,
            Phase::Ended(_) => DragState::Ended,
        }
    }

    /// The pointer of a pending or running drag.
    pub(crate) fn pointer(&self) -> Option<DragPointer> {
        match self.phase {
            Phase::Pending(pending) => Some(pending.pointer),
            Phase::Dragging(dragging) => Some(dragging.pointer),
            Phase::Idle | Phase::Ended(_) => None,
        }
    }

    /// The dragged element.
    pub(crate) fn source(&self) -> Option<u32> {
        match self.phase {
            Phase::Pending(pending) => Some(pending.source),
            Phase::Dragging(dragging) => Some(dragging.source),
            Phase::Idle | Phase::Ended(_) => None,
        }
    }

    /// Where the press began (the ghost's grab point).
    pub(crate) fn origin(&self) -> Option<Vec2> {
        match self.phase {
            Phase::Pending(pending) => Some(pending.origin),
            Phase::Dragging(dragging) => Some(dragging.origin),
            Phase::Idle | Phase::Ended(_) => None,
        }
    }

    /// The pointer's last position.
    pub(crate) fn position(&self) -> Option<Vec2> {
        match self.phase {
            Phase::Pending(pending) => Some(pending.position),
            Phase::Dragging(dragging) => Some(dragging.position),
            Phase::Idle | Phase::Ended(_) => None,
        }
    }

    /// The element the pointer is over while dragging.
    pub(crate) fn target(&self) -> Option<u32> {
        match self.phase {
            Phase::Dragging(dragging) => dragging.target,
            Phase::Idle | Phase::Pending(_) | Phase::Ended(_) => None,
        }
    }

    /// The drop effect the current target accepted with its latest `dragover`: the last allowed
    /// effect. `None` when the drag is over no target, or the target did not accept; a target change
    /// forgets the previous target's answer until the new target's `dragover` replies.
    pub(crate) fn allowed_effect(&self) -> Option<DropEffect> {
        match self.phase {
            Phase::Dragging(dragging) => dragging.allowed,
            Phase::Idle | Phase::Pending(_) | Phase::Ended(_) => None,
        }
    }

    /// When the next [`DragInput::HoldTick`] is due on the engine tick clock: the moment a touch
    /// waiting to become a drag has been held long enough.
    pub(crate) fn next_deadline_ms(&self) -> Option<f64> {
        match self.phase {
            Phase::Pending(pending) => match pending.pointer.kind {
                DragPointerKind::Touch => Some(pending.down_ms + self.config.touch_hold_ms),
                DragPointerKind::Mouse => None,
            },
            Phase::Idle | Phase::Dragging(_) | Phase::Ended(_) => None,
        }
    }

    /// Feed one input at engine time `now_ms`. A touch whose hold has elapsed starts dragging before
    /// the input is looked at, so the outcome never depends on whether the owner's timer ran first.
    pub(crate) fn handle<E: DragEnvironment>(
        &mut self,
        now_ms: f64,
        input: DragInput,
        env: &mut E,
    ) -> DragStep {
        let mut outcomes = Vec::new();
        let mut phase = std::mem::replace(&mut self.phase, Phase::Idle);
        if !matches!(input, DragInput::PointerDown { .. }) {
            phase = self.tick(phase, now_ms, env, &mut outcomes);
        }
        let (phase, consumed) = match input {
            DragInput::PointerDown {
                pointer,
                position,
                source,
            } => Self::pointer_down(phase, now_ms, pointer, position, source),
            DragInput::PointerMove {
                pointer_id,
                position,
            } => self.pointer_move(phase, pointer_id, position, env, &mut outcomes),
            DragInput::HoldTick => (phase, false),
            DragInput::PointerUp {
                pointer_id,
                position,
            } => Self::pointer_up(phase, pointer_id, position, env, &mut outcomes),
            DragInput::PointerCancel { pointer_id } => {
                Self::pointer_cancel(phase, pointer_id, env, &mut outcomes)
            }
            DragInput::Escape => Self::escape(phase, env, &mut outcomes),
            DragInput::RootExit => Self::root_exit(phase, env, &mut outcomes),
            DragInput::Refresh => Self::refresh(phase, env),
        };
        self.phase = phase;
        DragStep { consumed, outcomes }
    }

    fn hold_elapsed(&self, pending: &Pending, now_ms: f64) -> bool {
        match pending.pointer.kind {
            DragPointerKind::Touch => now_ms - pending.down_ms >= self.config.touch_hold_ms,
            DragPointerKind::Mouse => false,
        }
    }

    /// A pending touch whose hold elapsed becomes a drag where it stands.
    fn tick<E: DragEnvironment>(
        &self,
        phase: Phase,
        now_ms: f64,
        env: &mut E,
        outcomes: &mut Vec<DragOutcome>,
    ) -> Phase {
        match phase {
            Phase::Pending(pending) if self.hold_elapsed(&pending, now_ms) => {
                Self::start(pending, pending.position, env, outcomes)
            }
            Phase::Idle | Phase::Pending(_) | Phase::Dragging(_) | Phase::Ended(_) => phase,
        }
    }

    fn pointer_down(
        phase: Phase,
        now_ms: f64,
        pointer: DragPointer,
        position: Vec2,
        source: Option<u32>,
    ) -> (Phase, bool) {
        match phase {
            // A new gesture can begin only when no pointer of the last one is still down.
            Phase::Idle | Phase::Ended(Ended { held: None, .. }) => {
                let phase = match source {
                    Some(source) => Phase::Pending(Pending {
                        pointer,
                        source,
                        origin: position,
                        position,
                        down_ms: now_ms,
                    }),
                    None => Phase::Idle,
                };
                (phase, false)
            }
            // Another pointer, while a gesture is underway: one pointer drags at a time.
            Phase::Pending(_) | Phase::Dragging(_) | Phase::Ended(Ended { held: Some(_), .. }) => {
                (phase, false)
            }
        }
    }

    fn pointer_move<E: DragEnvironment>(
        &self,
        phase: Phase,
        pointer_id: u32,
        position: Vec2,
        env: &mut E,
        outcomes: &mut Vec<DragOutcome>,
    ) -> (Phase, bool) {
        match phase {
            Phase::Pending(mut pending) if pending.pointer.id == pointer_id => {
                pending.position = position;
                let displacement = position - pending.origin;
                match pending.pointer.kind {
                    DragPointerKind::Mouse
                        if displacement.length() > self.config.mouse_threshold_px =>
                    {
                        let phase = Self::start(pending, position, env, outcomes);
                        (phase, matches!(phase, Phase::Dragging(_)))
                    }
                    DragPointerKind::Touch
                        if exceeds_slop(displacement, self.config.touch_slop_px) =>
                    {
                        outcomes.push(DragOutcome::Declined);
                        let ended = Ended {
                            held: Some(pointer_id),
                            swallow: false,
                        };
                        (Phase::Ended(ended), false)
                    }
                    DragPointerKind::Mouse | DragPointerKind::Touch => {
                        (Phase::Pending(pending), false)
                    }
                }
            }
            Phase::Dragging(mut dragging) if dragging.pointer.id == pointer_id => {
                Self::update(&mut dragging, position, env);
                (Phase::Dragging(dragging), true)
            }
            Phase::Ended(ended) if ended.held == Some(pointer_id) => (phase, ended.swallow),
            Phase::Idle | Phase::Pending(_) | Phase::Dragging(_) | Phase::Ended(_) => {
                (phase, false)
            }
        }
    }

    fn pointer_up<E: DragEnvironment>(
        phase: Phase,
        pointer_id: u32,
        position: Vec2,
        env: &mut E,
        outcomes: &mut Vec<DragOutcome>,
    ) -> (Phase, bool) {
        match phase {
            Phase::Pending(pending) if pending.pointer.id == pointer_id => (Phase::Idle, false),
            Phase::Dragging(dragging) if dragging.pointer.id == pointer_id => {
                (Self::release(dragging, position, env, outcomes), true)
            }
            Phase::Ended(ended) if ended.held == Some(pointer_id) => (Phase::Idle, ended.swallow),
            Phase::Idle | Phase::Pending(_) | Phase::Dragging(_) | Phase::Ended(_) => {
                (phase, false)
            }
        }
    }

    fn pointer_cancel<E: DragEnvironment>(
        phase: Phase,
        pointer_id: u32,
        env: &mut E,
        outcomes: &mut Vec<DragOutcome>,
    ) -> (Phase, bool) {
        match phase {
            Phase::Pending(pending) if pending.pointer.id == pointer_id => (Phase::Idle, false),
            Phase::Dragging(dragging) if dragging.pointer.id == pointer_id => {
                Self::cancel(dragging, DragEndReason::PointerCancel, env, outcomes);
                let ended = Ended {
                    held: None,
                    swallow: false,
                };
                (Phase::Ended(ended), true)
            }
            Phase::Ended(ended) if ended.held == Some(pointer_id) => (Phase::Idle, ended.swallow),
            Phase::Idle | Phase::Pending(_) | Phase::Dragging(_) | Phase::Ended(_) => {
                (phase, false)
            }
        }
    }

    /// Escape cancels a running drag and is accepted; with no drag running it is not the drag's.
    fn escape<E: DragEnvironment>(
        phase: Phase,
        env: &mut E,
        outcomes: &mut Vec<DragOutcome>,
    ) -> (Phase, bool) {
        match phase {
            Phase::Dragging(dragging) => {
                Self::cancel(dragging, DragEndReason::Escape, env, outcomes);
                // The finger or button is still down, but its events ended with the drag.
                let ended = Ended {
                    held: Some(dragging.pointer.id),
                    swallow: true,
                };
                (Phase::Ended(ended), true)
            }
            Phase::Idle | Phase::Pending(_) | Phase::Ended(_) => (phase, false),
        }
    }

    fn root_exit<E: DragEnvironment>(
        phase: Phase,
        env: &mut E,
        outcomes: &mut Vec<DragOutcome>,
    ) -> (Phase, bool) {
        if let Phase::Dragging(dragging) = phase {
            Self::cancel(dragging, DragEndReason::RootExit, env, outcomes);
        }
        (Phase::Idle, false)
    }

    fn refresh<E: DragEnvironment>(phase: Phase, env: &mut E) -> (Phase, bool) {
        match phase {
            Phase::Dragging(mut dragging) => {
                let position = dragging.position;
                Self::update(&mut dragging, position, env);
                (Phase::Dragging(dragging), false)
            }
            Phase::Idle | Phase::Pending(_) | Phase::Ended(_) => (phase, false),
        }
    }

    /// `dragstart`, then (unless prevented) `pointercancel` and the first update.
    fn start<E: DragEnvironment>(
        pending: Pending,
        position: Vec2,
        env: &mut E,
        outcomes: &mut Vec<DragOutcome>,
    ) -> Phase {
        // A source that was removed after the press cannot be dragged: JS would never hear `dragstart`,
        // so it would have no data store for the drag's other events. It is refused as a prevented
        // `dragstart` is, and the pointer carries on as plain pointer events.
        if !env.exists(pending.source) {
            outcomes.push(DragOutcome::Refused);
            return Phase::Ended(Ended {
                held: Some(pending.pointer.id),
                swallow: false,
            });
        }
        let mut dragging = Dragging {
            pointer: pending.pointer,
            source: pending.source,
            origin: pending.origin,
            position,
            hit: DragHit::Inside,
            target: None,
            allowed: None,
        };
        match env.emit(dragging.event(DragEventKind::DragStart)) {
            DragReply::Prevented(_) => {
                outcomes.push(DragOutcome::Refused);
                Phase::Ended(Ended {
                    held: Some(pending.pointer.id),
                    swallow: false,
                })
            }
            DragReply::Default => {
                env.emit(dragging.event(DragEventKind::PointerCancel));
                outcomes.push(DragOutcome::Started);
                Self::update(&mut dragging, position, env);
                Phase::Dragging(dragging)
            }
        }
    }

    /// The pointer is at `position`: `drag` on the source, enter / leave on a target change,
    /// `dragover` on the target.
    fn update<E: DragEnvironment>(dragging: &mut Dragging, position: Vec2, env: &mut E) {
        dragging.position = position;
        dragging.hit = env.hit_test(position);
        let target = match dragging.hit {
            DragHit::Element(target) => Some(target),
            DragHit::Inside | DragHit::Outside => None,
        };
        env.emit(dragging.event(DragEventKind::Drag));
        if target != dragging.target {
            let previous = dragging.target;
            if let Some(entered) = target {
                env.emit(dragging.event(DragEventKind::DragEnter {
                    target: entered,
                    related_target: previous,
                }));
            }
            if let Some(left) = previous {
                env.emit(dragging.event(DragEventKind::DragLeave {
                    target: left,
                    related_target: target,
                }));
            }
            dragging.target = target;
            dragging.allowed = None;
        }
        if let Some(target) = target {
            dragging.allowed = match env.emit(dragging.event(DragEventKind::DragOver { target })) {
                DragReply::Default => None,
                DragReply::Prevented(effect) => accepted_effect(effect),
            };
        }
    }

    /// The button or finger came up at `position`.
    fn release<E: DragEnvironment>(
        mut dragging: Dragging,
        position: Vec2,
        env: &mut E,
        outcomes: &mut Vec<DragOutcome>,
    ) -> Phase {
        // The last update may predate the release (no motion event came with it).
        if position != dragging.position {
            Self::update(&mut dragging, position, env);
        }
        let ended_outside_root = dragging.hit == DragHit::Outside;
        let (reason, drop_effect) = match (dragging.target, dragging.allowed) {
            (Some(target), Some(allowed)) => {
                let reply = env.emit(dragging.event(DragEventKind::Drop {
                    target,
                    drop_effect: allowed,
                }));
                let effect = match reply {
                    DragReply::Default => DropEffect::None,
                    DragReply::Prevented(effect) => effect,
                };
                (DragEndReason::Dropped, effect)
            }
            (target, _) => {
                if let Some(left) = target {
                    env.emit(dragging.event(DragEventKind::DragLeave {
                        target: left,
                        related_target: None,
                    }));
                }
                (DragEndReason::Released, DropEffect::None)
            }
        };
        env.emit(dragging.event(DragEventKind::DragEnd {
            drop_effect,
            ended_outside_root,
        }));
        outcomes.push(DragOutcome::Ended(DragEnded {
            reason,
            drop_effect,
            ended_outside_root,
        }));
        Phase::Ended(Ended {
            held: None,
            swallow: false,
        })
    }

    /// Escape, an OS cancel or the root leaving: `dragleave` on the target and `dragend` with no
    /// effect. `endedOutsideRoot` is false because nothing was released anywhere: a game must not read
    /// a cancelled drag as a drop into the world.
    fn cancel<E: DragEnvironment>(
        dragging: Dragging,
        reason: DragEndReason,
        env: &mut E,
        outcomes: &mut Vec<DragOutcome>,
    ) {
        if let Some(left) = dragging.target {
            env.emit(dragging.event(DragEventKind::DragLeave {
                target: left,
                related_target: None,
            }));
        }
        env.emit(dragging.event(DragEventKind::DragEnd {
            drop_effect: DropEffect::None,
            ended_outside_root: false,
        }));
        outcomes.push(DragOutcome::Ended(DragEnded {
            reason,
            drop_effect: DropEffect::None,
            ended_outside_root: false,
        }));
    }
}

impl Dragging {
    fn event(&self, kind: DragEventKind) -> DragEvent {
        DragEvent {
            source: self.source,
            pointer: self.pointer,
            position: self.position,
            kind,
        }
    }
}

/// A `dragover` that was prevented accepts the drop unless the effect it settled on is `none`.
fn accepted_effect(effect: DropEffect) -> Option<DropEffect> {
    match effect {
        DropEffect::None => None,
        DropEffect::Copy | DropEffect::Move | DropEffect::Link => Some(effect),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SOURCE: u32 = 7;
    const ELEMENT_A: u32 = 10;
    const ELEMENT_B: u32 = 20;
    const THRESHOLD_PX: f32 = 10.0;
    const MOUSE: DragPointer = DragPointer {
        id: 1,
        kind: DragPointerKind::Mouse,
    };
    const TOUCH: DragPointer = DragPointer {
        id: 2,
        kind: DragPointerKind::Touch,
    };
    const T0: f64 = 1000.0;
    const START_SEQUENCE: [&str; 5] = [
        "dragstart",
        "pointercancel",
        "drag",
        "dragenter:10<-none",
        "dragover:10",
    ];

    fn at(x: f32) -> Vec2 {
        Vec2::new(x, 0.0)
    }

    /// x < 0 is beyond the root, 0..100 element A, 100..200 element B, 200..300 the root's empty
    /// background, 300 and beyond outside again.
    fn hit_by_x(position: Vec2) -> DragHit {
        match position.x {
            x if x < 0.0 => DragHit::Outside,
            x if x < 100.0 => DragHit::Element(ELEMENT_A),
            x if x < 200.0 => DragHit::Element(ELEMENT_B),
            x if x < 300.0 => DragHit::Inside,
            _ => DragHit::Outside,
        }
    }

    struct Script {
        hit: fn(Vec2) -> DragHit,
        start_prevented: bool,
        /// Targets whose `dragover` is prevented, with the effect they settle on.
        accepting: Vec<(u32, DropEffect)>,
        drop_reply: DragReply,
        /// Elements JS has removed since the press.
        removed: Vec<u32>,
        events: Vec<DragEvent>,
    }

    impl Script {
        fn new() -> Self {
            Self {
                hit: hit_by_x,
                start_prevented: false,
                accepting: vec![(ELEMENT_A, DropEffect::Move), (ELEMENT_B, DropEffect::Copy)],
                drop_reply: DragReply::Prevented(DropEffect::Move),
                removed: Vec::new(),
                events: Vec::new(),
            }
        }

        fn accepting_nothing() -> Self {
            Self {
                accepting: Vec::new(),
                ..Self::new()
            }
        }

        /// The events since the last call, compactly.
        fn take(&mut self) -> Vec<String> {
            std::mem::take(&mut self.events).iter().map(label).collect()
        }
    }

    fn name(target: Option<u32>) -> String {
        target.map_or_else(|| "none".to_owned(), |tag| tag.to_string())
    }

    fn label(event: &DragEvent) -> String {
        match event.kind {
            DragEventKind::PointerCancel => "pointercancel".to_owned(),
            DragEventKind::DragStart => "dragstart".to_owned(),
            DragEventKind::Drag => "drag".to_owned(),
            DragEventKind::DragEnter {
                target,
                related_target,
            } => format!("dragenter:{target}<-{}", name(related_target)),
            DragEventKind::DragLeave {
                target,
                related_target,
            } => format!("dragleave:{target}->{}", name(related_target)),
            DragEventKind::DragOver { target } => format!("dragover:{target}"),
            DragEventKind::Drop {
                target,
                drop_effect,
            } => format!("drop:{target}:{drop_effect:?}"),
            DragEventKind::DragEnd {
                drop_effect,
                ended_outside_root,
            } => format!(
                "dragend:{drop_effect:?}:{}",
                if ended_outside_root {
                    "outside"
                } else {
                    "inside"
                }
            ),
        }
    }

    impl DragEnvironment for Script {
        fn hit_test(&mut self, position: Vec2) -> DragHit {
            (self.hit)(position)
        }

        fn emit(&mut self, event: DragEvent) -> DragReply {
            let reply = match event.kind {
                DragEventKind::DragStart if self.start_prevented => {
                    DragReply::Prevented(DropEffect::None)
                }
                DragEventKind::DragOver { target } => self
                    .accepting
                    .iter()
                    .find(|(accepting, _)| *accepting == target)
                    .map_or(DragReply::Default, |(_, effect)| {
                        DragReply::Prevented(*effect)
                    }),
                DragEventKind::Drop { .. } => self.drop_reply,
                DragEventKind::DragStart
                | DragEventKind::PointerCancel
                | DragEventKind::Drag
                | DragEventKind::DragEnter { .. }
                | DragEventKind::DragLeave { .. }
                | DragEventKind::DragEnd { .. } => DragReply::Default,
            };
            self.events.push(event);
            reply
        }

        fn exists(&mut self, tag: u32) -> bool {
            !self.removed.contains(&tag)
        }
    }

    fn machine() -> DragMachine {
        DragMachine::new(DragConfig::new(THRESHOLD_PX))
    }

    fn press(
        machine: &mut DragMachine,
        env: &mut Script,
        pointer: DragPointer,
        x: f32,
    ) -> DragStep {
        machine.handle(
            T0,
            DragInput::PointerDown {
                pointer,
                position: at(x),
                source: Some(SOURCE),
            },
            env,
        )
    }

    fn move_to(machine: &mut DragMachine, env: &mut Script, id: u32, x: f32) -> DragStep {
        machine.handle(
            T0,
            DragInput::PointerMove {
                pointer_id: id,
                position: at(x),
            },
            env,
        )
    }

    fn release_at(machine: &mut DragMachine, env: &mut Script, id: u32, x: f32) -> DragStep {
        machine.handle(
            T0,
            DragInput::PointerUp {
                pointer_id: id,
                position: at(x),
            },
            env,
        )
    }

    /// A mouse drag that has started over element A, with its events cleared.
    fn dragging_over_a() -> (DragMachine, Script) {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 62.0);
        assert_eq!(machine.state(), DragState::Dragging);
        env.take();
        (machine, env)
    }

    fn ended(
        reason: DragEndReason,
        drop_effect: DropEffect,
        ended_outside_root: bool,
    ) -> DragOutcome {
        DragOutcome::Ended(DragEnded {
            reason,
            drop_effect,
            ended_outside_root,
        })
    }

    // --- mouse: pending and start ---

    #[test]
    fn a_mouse_press_becomes_a_drag_past_the_threshold() {
        let mut machine = machine();
        let mut env = Script::new();
        let step = press(&mut machine, &mut env, MOUSE, 50.0);
        assert_eq!(machine.state(), DragState::Pending);
        assert_eq!(step.outcomes, vec![]);
        assert!(!step.consumed);
        assert_eq!(machine.source(), Some(SOURCE));
        assert_eq!(machine.origin(), Some(at(50.0)));

        let step = move_to(&mut machine, &mut env, MOUSE.id, 55.0);
        assert_eq!(machine.state(), DragState::Pending);
        assert!(!step.consumed, "a small move is still a plain pointer move");
        assert_eq!(env.take(), Vec::<String>::new());

        let step = move_to(&mut machine, &mut env, MOUSE.id, 62.0);
        assert_eq!(step.outcomes, vec![DragOutcome::Started]);
        assert!(step.consumed);
        assert_eq!(machine.state(), DragState::Dragging);
        assert_eq!(env.take(), START_SEQUENCE);
        assert_eq!(machine.target(), Some(ELEMENT_A));
        assert_eq!(machine.allowed_effect(), Some(DropEffect::Move));
        assert_eq!(machine.position(), Some(at(62.0)));
        assert_eq!(
            machine.origin(),
            Some(at(50.0)),
            "the grab point stays where the press was"
        );
        assert_eq!(machine.pointer(), Some(MOUSE));
    }

    #[test]
    fn the_threshold_is_euclidean_and_strict() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, MOUSE, 50.0);
        // 6 and 8 make exactly 10: not beyond.
        let step = machine.handle(
            T0,
            DragInput::PointerMove {
                pointer_id: MOUSE.id,
                position: Vec2::new(56.0, 8.0),
            },
            &mut env,
        );
        assert_eq!(machine.state(), DragState::Pending);
        assert!(step.outcomes.is_empty());
        let step = machine.handle(
            T0,
            DragInput::PointerMove {
                pointer_id: MOUSE.id,
                position: Vec2::new(57.0, 8.0),
            },
            &mut env,
        );
        assert_eq!(step.outcomes, vec![DragOutcome::Started]);
    }

    #[test]
    fn the_threshold_is_the_one_passed_in() {
        let mut machine = DragMachine::new(DragConfig::new(3.0));
        let mut env = Script::new();
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 54.0);
        assert_eq!(machine.state(), DragState::Dragging);
        machine.set_config(DragConfig::new(100.0));
        assert_eq!(
            machine.state(),
            DragState::Dragging,
            "running drags are not affected"
        );
    }

    #[test]
    fn a_press_outside_any_draggable_is_ignored() {
        let mut machine = machine();
        let mut env = Script::new();
        let step = machine.handle(
            T0,
            DragInput::PointerDown {
                pointer: MOUSE,
                position: at(50.0),
                source: None,
            },
            &mut env,
        );
        assert_eq!(machine.state(), DragState::Idle);
        assert!(!step.consumed);
        let step = move_to(&mut machine, &mut env, MOUSE.id, 300.0);
        assert_eq!(machine.state(), DragState::Idle);
        assert!(!step.consumed);
        assert!(env.take().is_empty());
        assert_eq!(machine.next_deadline_ms(), None);
    }

    #[test]
    fn releasing_a_pending_mouse_press_is_a_plain_click() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 53.0);
        let step = release_at(&mut machine, &mut env, MOUSE.id, 53.0);
        assert_eq!(machine.state(), DragState::Idle);
        assert!(
            !step.consumed,
            "the pointer-event stream carries on to its click"
        );
        assert!(step.outcomes.is_empty());
        assert!(env.take().is_empty());
    }

    #[test]
    fn the_hold_timer_means_nothing_to_a_mouse() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, MOUSE, 50.0);
        assert_eq!(machine.next_deadline_ms(), None);
        let step = machine.handle(T0 + 10_000.0, DragInput::HoldTick, &mut env);
        assert_eq!(machine.state(), DragState::Pending);
        assert!(step.outcomes.is_empty());
    }

    // --- dragstart prevented ---

    #[test]
    fn a_prevented_dragstart_leaves_the_pointer_as_plain_pointer_events() {
        let mut machine = machine();
        let mut env = Script::new();
        env.start_prevented = true;
        press(&mut machine, &mut env, MOUSE, 50.0);
        let step = move_to(&mut machine, &mut env, MOUSE.id, 70.0);
        assert_eq!(step.outcomes, vec![DragOutcome::Refused]);
        assert!(!step.consumed, "the move still reaches JS as pointermove");
        assert_eq!(
            env.take(),
            ["dragstart"],
            "no pointercancel, no drag events"
        );
        assert_eq!(machine.state(), DragState::Ended);
        // The rest of the gesture is not a drag's.
        let step = move_to(&mut machine, &mut env, MOUSE.id, 150.0);
        assert!(!step.consumed);
        let step = release_at(&mut machine, &mut env, MOUSE.id, 150.0);
        assert!(!step.consumed);
        assert!(step.outcomes.is_empty());
        assert!(env.take().is_empty());
        assert_eq!(machine.state(), DragState::Idle);
    }

    #[test]
    fn a_source_removed_before_the_threshold_is_refused_and_no_event_is_sent() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, MOUSE, 50.0);
        env.removed.push(SOURCE);
        let step = move_to(&mut machine, &mut env, MOUSE.id, 70.0);
        assert_eq!(step.outcomes, vec![DragOutcome::Refused]);
        assert!(!step.consumed, "the move still reaches JS as pointermove");
        assert!(
            env.take().is_empty(),
            "JS never hears dragstart, so it is sent no drag event either, not even pointercancel"
        );
        assert_eq!(machine.state(), DragState::Ended);
        assert_eq!(machine.allowed_effect(), None);
        // The rest of the gesture is plain pointer events, and the release is a click's.
        let step = move_to(&mut machine, &mut env, MOUSE.id, 150.0);
        assert!(!step.consumed && step.outcomes.is_empty());
        let step = release_at(&mut machine, &mut env, MOUSE.id, 150.0);
        assert!(!step.consumed && step.outcomes.is_empty());
        assert!(env.take().is_empty());
        assert_eq!(machine.state(), DragState::Idle);
    }

    #[test]
    fn a_source_removed_while_a_touch_waited_out_its_hold_is_refused() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, TOUCH, 50.0);
        env.removed.push(SOURCE);
        let step = machine.handle(T0 + TOUCH_DRAG_HOLD_MS, DragInput::HoldTick, &mut env);
        assert_eq!(step.outcomes, vec![DragOutcome::Refused]);
        assert!(env.take().is_empty());
        assert_eq!(machine.state(), DragState::Ended);
        assert_eq!(machine.next_deadline_ms(), None, "the hold timer is done");
        let step = release_at(&mut machine, &mut env, TOUCH.id, 50.0);
        assert!(!step.consumed, "the lift is a tap's, not a drop's");
        assert_eq!(machine.state(), DragState::Idle);
    }

    #[test]
    fn a_source_removed_after_dragstart_does_not_end_the_drag() {
        let (mut machine, mut env) = dragging_over_a();
        env.removed.push(SOURCE);
        let step = move_to(&mut machine, &mut env, MOUSE.id, 150.0);
        assert!(step.consumed);
        assert_eq!(machine.state(), DragState::Dragging);
    }

    // --- dragging: events ---

    #[test]
    fn a_move_to_another_element_enters_it_then_leaves_the_old_one() {
        let (mut machine, mut env) = dragging_over_a();
        let step = move_to(&mut machine, &mut env, MOUSE.id, 150.0);
        assert!(step.consumed);
        assert_eq!(
            env.take(),
            [
                "drag",
                "dragenter:20<-10",
                "dragleave:10->20",
                "dragover:20"
            ]
        );
        assert_eq!(machine.target(), Some(ELEMENT_B));
        assert_eq!(machine.allowed_effect(), Some(DropEffect::Copy));
    }

    #[test]
    fn a_move_within_an_element_sends_drag_and_dragover_only() {
        let (mut machine, mut env) = dragging_over_a();
        move_to(&mut machine, &mut env, MOUSE.id, 70.0);
        assert_eq!(env.take(), ["drag", "dragover:10"]);
    }

    #[test]
    fn leaving_every_element_leaves_without_a_dragover_and_forgets_the_allowed_effect() {
        let (mut machine, mut env) = dragging_over_a();
        move_to(&mut machine, &mut env, MOUSE.id, 250.0);
        assert_eq!(env.take(), ["drag", "dragleave:10->none"]);
        assert_eq!(machine.target(), None);
        assert_eq!(machine.allowed_effect(), None);
        // Back onto an element enters it afresh.
        move_to(&mut machine, &mut env, MOUSE.id, 150.0);
        assert_eq!(env.take(), ["drag", "dragenter:20<-none", "dragover:20"]);
    }

    #[test]
    fn the_allowed_effect_follows_each_targets_own_answer() {
        let mut machine = machine();
        let mut env = Script::new();
        env.accepting = vec![(ELEMENT_A, DropEffect::Copy)];
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 62.0);
        assert_eq!(machine.allowed_effect(), Some(DropEffect::Copy));
        // B does not accept: A's answer must not survive the target change.
        move_to(&mut machine, &mut env, MOUSE.id, 150.0);
        assert_eq!(machine.target(), Some(ELEMENT_B));
        assert_eq!(machine.allowed_effect(), None);
        // And a target that stops accepting while the pointer stays over it.
        env.accepting = vec![(ELEMENT_B, DropEffect::Link)];
        move_to(&mut machine, &mut env, MOUSE.id, 160.0);
        assert_eq!(machine.allowed_effect(), Some(DropEffect::Link));
        env.accepting.clear();
        move_to(&mut machine, &mut env, MOUSE.id, 170.0);
        assert_eq!(machine.allowed_effect(), None);
    }

    #[test]
    fn a_dragover_prevented_with_effect_none_refuses_the_drop() {
        let mut machine = machine();
        let mut env = Script::new();
        env.accepting = vec![(ELEMENT_A, DropEffect::None)];
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 62.0);
        assert_eq!(machine.allowed_effect(), None);
    }

    #[test]
    fn the_source_can_be_a_target() {
        // The hit test knows nothing of the source: it is just another element.
        let mut machine = machine();
        let mut env = Script::new();
        env.hit = |_| DragHit::Element(SOURCE);
        env.accepting = vec![(SOURCE, DropEffect::Move)];
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 70.0);
        assert_eq!(machine.target(), Some(SOURCE));
        assert_eq!(machine.allowed_effect(), Some(DropEffect::Move));
    }

    #[test]
    fn every_event_names_the_source_the_pointer_and_the_position() {
        let (mut machine, mut env) = dragging_over_a();
        move_to(&mut machine, &mut env, MOUSE.id, 150.0);
        assert!(!env.events.is_empty());
        for event in &env.events {
            assert_eq!(event.source, SOURCE);
            assert_eq!(event.pointer, MOUSE);
            assert_eq!(event.position, at(150.0));
        }
    }

    #[test]
    fn only_dragstart_dragover_and_drop_are_cancelable() {
        let cancelable = |kind| {
            DragEvent {
                source: SOURCE,
                pointer: MOUSE,
                position: Vec2::ZERO,
                kind,
            }
            .is_cancelable()
        };
        assert!(cancelable(DragEventKind::DragStart));
        assert!(cancelable(DragEventKind::DragOver { target: 1 }));
        assert!(cancelable(DragEventKind::Drop {
            target: 1,
            drop_effect: DropEffect::Move
        }));
        assert!(!cancelable(DragEventKind::PointerCancel));
        assert!(!cancelable(DragEventKind::Drag));
        assert!(!cancelable(DragEventKind::DragEnter {
            target: 1,
            related_target: None
        }));
        assert!(!cancelable(DragEventKind::DragLeave {
            target: 1,
            related_target: None
        }));
        assert!(!cancelable(DragEventKind::DragEnd {
            drop_effect: DropEffect::None,
            ended_outside_root: false
        }));
    }

    #[test]
    fn a_refresh_hit_tests_again_at_the_last_position() {
        let (mut machine, mut env) = dragging_over_a();
        // The list scrolled: what is under the stationary pointer is now element B.
        env.hit = |_| DragHit::Element(ELEMENT_B);
        let step = machine.handle(T0, DragInput::Refresh, &mut env);
        assert!(!step.consumed);
        assert_eq!(
            env.take(),
            [
                "drag",
                "dragenter:20<-10",
                "dragleave:10->20",
                "dragover:20"
            ]
        );
        assert_eq!(machine.position(), Some(at(62.0)));
        // Nothing changed under it: drag and dragover again, no enter or leave.
        machine.handle(T0, DragInput::Refresh, &mut env);
        assert_eq!(env.take(), ["drag", "dragover:20"]);
        // Refresh outside a drag does nothing.
        let mut idle = self::machine();
        idle.handle(T0, DragInput::Refresh, &mut env);
        assert!(env.take().is_empty());
    }

    // --- release ---

    #[test]
    fn releasing_over_an_accepting_target_drops_and_ends_with_the_effect() {
        let (mut machine, mut env) = dragging_over_a();
        let step = release_at(&mut machine, &mut env, MOUSE.id, 62.0);
        assert!(step.consumed, "no pointerup and no click");
        assert_eq!(env.take(), ["drop:10:Move", "dragend:Move:inside"]);
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::Dropped, DropEffect::Move, false)]
        );
        assert_eq!(machine.state(), DragState::Ended);
        assert_eq!(machine.source(), None);
    }

    #[test]
    fn a_drop_that_is_not_prevented_ends_with_no_effect() {
        let (mut machine, mut env) = dragging_over_a();
        env.drop_reply = DragReply::Default;
        let step = release_at(&mut machine, &mut env, MOUSE.id, 62.0);
        assert_eq!(env.take(), ["drop:10:Move", "dragend:None:inside"]);
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::Dropped, DropEffect::None, false)]
        );
    }

    #[test]
    fn a_drop_handler_can_settle_on_another_effect() {
        let (mut machine, mut env) = dragging_over_a();
        env.drop_reply = DragReply::Prevented(DropEffect::Copy);
        let step = release_at(&mut machine, &mut env, MOUSE.id, 62.0);
        assert_eq!(env.take(), ["drop:10:Move", "dragend:Copy:inside"]);
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::Dropped, DropEffect::Copy, false)]
        );
    }

    #[test]
    fn a_drop_that_is_never_allowed_sends_dragleave_then_dragend_none() {
        let mut machine = machine();
        let mut env = Script::accepting_nothing();
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 62.0);
        move_to(&mut machine, &mut env, MOUSE.id, 150.0);
        env.take();
        let step = release_at(&mut machine, &mut env, MOUSE.id, 150.0);
        assert_eq!(env.take(), ["dragleave:20->none", "dragend:None:inside"]);
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::Released, DropEffect::None, false)]
        );
        assert!(step.consumed);
    }

    #[test]
    fn a_release_over_an_element_that_refused_does_not_drop_on_it() {
        let mut machine = machine();
        let mut env = Script::new();
        env.accepting = vec![(ELEMENT_A, DropEffect::None)];
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 62.0);
        env.take();
        release_at(&mut machine, &mut env, MOUSE.id, 62.0);
        assert_eq!(env.take(), ["dragleave:10->none", "dragend:None:inside"]);
    }

    #[test]
    fn a_release_over_the_empty_background_is_still_inside_the_root() {
        let (mut machine, mut env) = dragging_over_a();
        move_to(&mut machine, &mut env, MOUSE.id, 250.0);
        env.take();
        let step = release_at(&mut machine, &mut env, MOUSE.id, 250.0);
        assert_eq!(env.take(), ["dragend:None:inside"]);
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::Released, DropEffect::None, false)]
        );
    }

    #[test]
    fn a_release_outside_the_root_says_so_and_never_drops() {
        let (mut machine, mut env) = dragging_over_a();
        move_to(&mut machine, &mut env, MOUSE.id, 350.0);
        assert_eq!(env.take(), ["drag", "dragleave:10->none"]);
        let step = release_at(&mut machine, &mut env, MOUSE.id, 350.0);
        assert_eq!(env.take(), ["dragend:None:outside"]);
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::Released, DropEffect::None, true)]
        );
    }

    #[test]
    fn a_release_that_moved_since_the_last_motion_updates_first() {
        let (mut machine, mut env) = dragging_over_a();
        // No motion event arrived for the last stretch: the release itself carries the position.
        let step = release_at(&mut machine, &mut env, MOUSE.id, 150.0);
        assert_eq!(
            env.take(),
            [
                "drag",
                "dragenter:20<-10",
                "dragleave:10->20",
                "dragover:20",
                "drop:20:Copy",
                "dragend:Move:inside"
            ]
        );
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::Dropped, DropEffect::Move, false)]
        );
    }

    #[test]
    fn a_release_outside_that_moved_since_the_last_motion_ends_outside() {
        let (mut machine, mut env) = dragging_over_a();
        release_at(&mut machine, &mut env, MOUSE.id, 400.0);
        assert_eq!(
            env.take(),
            ["drag", "dragleave:10->none", "dragend:None:outside"]
        );
    }

    // --- cancel paths ---

    #[test]
    fn escape_cancels_the_drag_and_is_accepted() {
        let (mut machine, mut env) = dragging_over_a();
        let step = machine.handle(T0, DragInput::Escape, &mut env);
        assert!(step.consumed);
        assert_eq!(env.take(), ["dragleave:10->none", "dragend:None:inside"]);
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::Escape, DropEffect::None, false)]
        );
        assert_eq!(machine.state(), DragState::Ended);
        // The button is still down: its remaining events are swallowed, and releasing drops nothing.
        let step = move_to(&mut machine, &mut env, MOUSE.id, 150.0);
        assert!(step.consumed);
        let step = release_at(&mut machine, &mut env, MOUSE.id, 150.0);
        assert!(step.consumed);
        assert!(step.outcomes.is_empty());
        assert!(env.take().is_empty());
        assert_eq!(machine.state(), DragState::Idle);
    }

    #[test]
    fn escape_outside_a_drag_is_not_the_drags() {
        let mut machine = machine();
        let mut env = Script::new();
        assert!(!machine.handle(T0, DragInput::Escape, &mut env).consumed);
        press(&mut machine, &mut env, MOUSE, 50.0);
        let step = machine.handle(T0, DragInput::Escape, &mut env);
        assert!(!step.consumed);
        assert_eq!(
            machine.state(),
            DragState::Pending,
            "a pending press survives Escape"
        );
        assert!(env.take().is_empty());
    }

    #[test]
    fn escape_over_no_target_sends_only_dragend() {
        let (mut machine, mut env) = dragging_over_a();
        move_to(&mut machine, &mut env, MOUSE.id, 250.0);
        env.take();
        machine.handle(T0, DragInput::Escape, &mut env);
        assert_eq!(env.take(), ["dragend:None:inside"]);
    }

    #[test]
    fn the_root_leaving_the_tree_cancels_and_resets() {
        let (mut machine, mut env) = dragging_over_a();
        let step = machine.handle(T0, DragInput::RootExit, &mut env);
        assert!(!step.consumed);
        assert_eq!(env.take(), ["dragleave:10->none", "dragend:None:inside"]);
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::RootExit, DropEffect::None, false)]
        );
        assert_eq!(machine.state(), DragState::Idle);
        // Pending and ended gestures are dropped without events.
        let mut env = Script::new();
        press(&mut machine, &mut env, MOUSE, 50.0);
        machine.handle(T0, DragInput::RootExit, &mut env);
        assert_eq!(machine.state(), DragState::Idle);
        assert!(env.take().is_empty());
    }

    #[test]
    fn an_os_cancel_ends_the_drag_for_good() {
        let (mut machine, mut env) = dragging_over_a();
        let step = machine.handle(
            T0,
            DragInput::PointerCancel {
                pointer_id: MOUSE.id,
            },
            &mut env,
        );
        assert!(step.consumed);
        assert_eq!(env.take(), ["dragleave:10->none", "dragend:None:inside"]);
        assert_eq!(
            step.outcomes,
            vec![ended(DragEndReason::PointerCancel, DropEffect::None, false)]
        );
        // The pointer is gone, so a new press can begin at once.
        assert_eq!(machine.state(), DragState::Ended);
        press(&mut machine, &mut env, MOUSE, 50.0);
        assert_eq!(machine.state(), DragState::Pending);
    }

    #[test]
    fn an_os_cancel_of_a_pending_press_resets() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, TOUCH, 50.0);
        let step = machine.handle(
            T0,
            DragInput::PointerCancel {
                pointer_id: TOUCH.id,
            },
            &mut env,
        );
        assert_eq!(machine.state(), DragState::Idle);
        assert!(!step.consumed);
        assert_eq!(machine.next_deadline_ms(), None);
    }

    // --- inputs a state does not care about ---

    #[test]
    fn an_idle_machine_ignores_every_input() {
        let mut machine = machine();
        let mut env = Script::new();
        let inputs = [
            DragInput::PointerMove {
                pointer_id: MOUSE.id,
                position: at(50.0),
            },
            DragInput::HoldTick,
            DragInput::PointerUp {
                pointer_id: MOUSE.id,
                position: at(50.0),
            },
            DragInput::PointerCancel {
                pointer_id: MOUSE.id,
            },
            DragInput::Escape,
            DragInput::RootExit,
            DragInput::Refresh,
        ];
        for input in inputs {
            let step = machine.handle(T0, input, &mut env);
            assert!(!step.consumed, "{input:?}");
            assert!(step.outcomes.is_empty(), "{input:?}");
            assert_eq!(machine.state(), DragState::Idle, "{input:?}");
        }
        assert!(env.take().is_empty());
        assert_eq!(machine.pointer(), None);
        assert_eq!(machine.source(), None);
        assert_eq!(machine.origin(), None);
        assert_eq!(machine.position(), None);
        assert_eq!(machine.target(), None);
        assert_eq!(machine.allowed_effect(), None);
    }

    #[test]
    fn a_pending_press_ignores_other_pointers_and_refreshes() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, MOUSE, 50.0);
        for input in [
            DragInput::Refresh,
            DragInput::PointerMove {
                pointer_id: TOUCH.id,
                position: at(500.0),
            },
            DragInput::PointerUp {
                pointer_id: TOUCH.id,
                position: at(500.0),
            },
            DragInput::PointerCancel {
                pointer_id: TOUCH.id,
            },
        ] {
            let step = machine.handle(T0, input, &mut env);
            assert!(!step.consumed, "{input:?}");
            assert!(step.outcomes.is_empty(), "{input:?}");
            assert_eq!(machine.state(), DragState::Pending, "{input:?}");
        }
        assert!(env.take().is_empty());
        assert_eq!(machine.target(), None, "nothing is dragged over yet");
        assert_eq!(machine.allowed_effect(), None);
    }

    #[test]
    fn a_running_drag_ignores_the_hold_timer() {
        let (mut machine, mut env) = dragging_over_a();
        let step = machine.handle(T0 + 60_000.0, DragInput::HoldTick, &mut env);
        assert!(!step.consumed);
        assert!(step.outcomes.is_empty());
        assert_eq!(machine.state(), DragState::Dragging);
        assert!(env.take().is_empty());
        assert_eq!(machine.next_deadline_ms(), None);
    }

    #[test]
    fn an_ended_gesture_resets_on_the_root_leaving_or_its_pointer_being_cancelled() {
        let mut env = Script::new();
        env.start_prevented = true;
        let ended_gesture = |env: &mut Script| {
            let mut machine = machine();
            press(&mut machine, env, MOUSE, 50.0);
            move_to(&mut machine, env, MOUSE.id, 70.0);
            assert_eq!(machine.state(), DragState::Ended);
            env.take();
            machine
        };
        let mut machine = ended_gesture(&mut env);
        assert!(!machine.handle(T0, DragInput::RootExit, &mut env).consumed);
        assert_eq!(machine.state(), DragState::Idle);
        let mut machine = ended_gesture(&mut env);
        let step = machine.handle(
            T0,
            DragInput::PointerCancel {
                pointer_id: MOUSE.id,
            },
            &mut env,
        );
        assert!(
            !step.consumed,
            "a refused drag's pointer events were never swallowed"
        );
        assert_eq!(machine.state(), DragState::Idle);
        let mut machine = ended_gesture(&mut env);
        assert!(!machine.handle(T0, DragInput::Escape, &mut env).consumed);
        assert!(!machine.handle(T0, DragInput::Refresh, &mut env).consumed);
        assert_eq!(machine.state(), DragState::Ended);
        assert!(env.take().is_empty());
    }

    #[test]
    fn a_cancelled_pointer_that_was_swallowed_stays_swallowed_until_it_is_gone() {
        let (mut machine, mut env) = dragging_over_a();
        machine.handle(T0, DragInput::Escape, &mut env);
        env.take();
        // The OS now cancels the pointer that Escape left held: swallowed, then the gesture is over.
        let step = machine.handle(
            T0,
            DragInput::PointerCancel {
                pointer_id: MOUSE.id,
            },
            &mut env,
        );
        assert!(step.consumed);
        assert_eq!(machine.state(), DragState::Idle);
        assert!(env.take().is_empty());
    }

    // --- one pointer at a time ---

    #[test]
    fn other_pointers_are_ignored_while_a_gesture_is_underway() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, MOUSE, 50.0);
        // A touch lands during the pending press.
        press(&mut machine, &mut env, TOUCH, 150.0);
        assert_eq!(machine.pointer(), Some(MOUSE));
        assert!(!move_to(&mut machine, &mut env, TOUCH.id, 190.0).consumed);
        assert!(!release_at(&mut machine, &mut env, TOUCH.id, 190.0).consumed);
        assert_eq!(machine.state(), DragState::Pending);
        // Same while dragging.
        move_to(&mut machine, &mut env, MOUSE.id, 62.0);
        env.take();
        press(&mut machine, &mut env, TOUCH, 150.0);
        assert!(!move_to(&mut machine, &mut env, TOUCH.id, 160.0).consumed);
        assert!(!release_at(&mut machine, &mut env, TOUCH.id, 160.0).consumed);
        assert!(
            !machine
                .handle(
                    T0,
                    DragInput::PointerCancel {
                        pointer_id: TOUCH.id
                    },
                    &mut env
                )
                .consumed
        );
        assert_eq!(machine.state(), DragState::Dragging);
        assert!(env.take().is_empty());
        assert_eq!(machine.pointer(), Some(MOUSE));
    }

    #[test]
    fn a_new_press_is_ignored_until_the_old_pointer_is_up() {
        let mut machine = machine();
        let mut env = Script::new();
        env.start_prevented = true;
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 70.0);
        assert_eq!(machine.state(), DragState::Ended);
        // The mouse button is still down (refused drag): another pointer does not start a gesture.
        press(&mut machine, &mut env, TOUCH, 150.0);
        assert_eq!(machine.state(), DragState::Ended);
        release_at(&mut machine, &mut env, MOUSE.id, 70.0);
        assert_eq!(machine.state(), DragState::Idle);
        press(&mut machine, &mut env, TOUCH, 150.0);
        assert_eq!(machine.state(), DragState::Pending);
    }

    #[test]
    fn a_finished_drag_lets_the_next_press_start_afresh() {
        let (mut machine, mut env) = dragging_over_a();
        release_at(&mut machine, &mut env, MOUSE.id, 62.0);
        env.take();
        assert_eq!(machine.state(), DragState::Ended);
        // Not on a draggable: back to idle.
        machine.handle(
            T0,
            DragInput::PointerDown {
                pointer: MOUSE,
                position: at(50.0),
                source: None,
            },
            &mut env,
        );
        assert_eq!(machine.state(), DragState::Idle);
        // On a draggable: a second drag runs the whole sequence again.
        press(&mut machine, &mut env, MOUSE, 50.0);
        move_to(&mut machine, &mut env, MOUSE.id, 62.0);
        assert_eq!(env.take(), START_SEQUENCE);
    }

    // --- touch ---

    #[test]
    fn a_touch_held_still_becomes_a_drag_when_the_hold_elapses() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, TOUCH, 50.0);
        assert_eq!(machine.next_deadline_ms(), Some(T0 + TOUCH_DRAG_HOLD_MS));
        // Jitter inside the slop does not matter.
        machine.handle(
            T0 + 100.0,
            DragInput::PointerMove {
                pointer_id: TOUCH.id,
                position: at(54.0),
            },
            &mut env,
        );
        let step = machine.handle(T0 + TOUCH_DRAG_HOLD_MS - 1.0, DragInput::HoldTick, &mut env);
        assert_eq!(machine.state(), DragState::Pending);
        assert!(step.outcomes.is_empty());
        let step = machine.handle(T0 + TOUCH_DRAG_HOLD_MS, DragInput::HoldTick, &mut env);
        assert_eq!(step.outcomes, vec![DragOutcome::Started]);
        assert_eq!(machine.state(), DragState::Dragging);
        assert_eq!(env.take(), START_SEQUENCE);
        assert_eq!(
            machine.position(),
            Some(at(54.0)),
            "dragging starts where the finger stands"
        );
        assert_eq!(machine.next_deadline_ms(), None);
        // From now on moves drag.
        let step = machine.handle(
            T0 + 700.0,
            DragInput::PointerMove {
                pointer_id: TOUCH.id,
                position: at(150.0),
            },
            &mut env,
        );
        assert!(step.consumed);
        assert_eq!(
            env.take(),
            [
                "drag",
                "dragenter:20<-10",
                "dragleave:10->20",
                "dragover:20"
            ]
        );
    }

    #[test]
    fn a_touch_that_moves_past_the_slop_before_the_hold_is_not_a_drag() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, TOUCH, 50.0);
        let step = machine.handle(
            T0 + 200.0,
            DragInput::PointerMove {
                pointer_id: TOUCH.id,
                position: at(59.0),
            },
            &mut env,
        );
        assert_eq!(step.outcomes, vec![DragOutcome::Declined]);
        assert!(
            !step.consumed,
            "pan or pointer handling decides what the move is"
        );
        assert_eq!(machine.state(), DragState::Ended);
        assert_eq!(machine.next_deadline_ms(), None);
        // Even held still for ever afterwards, it never becomes a drag.
        let step = machine.handle(T0 + 5000.0, DragInput::HoldTick, &mut env);
        assert!(step.outcomes.is_empty());
        let step = machine.handle(
            T0 + 5001.0,
            DragInput::PointerMove {
                pointer_id: TOUCH.id,
                position: at(60.0),
            },
            &mut env,
        );
        assert!(!step.consumed);
        assert!(env.take().is_empty());
        let step = machine.handle(
            T0 + 5002.0,
            DragInput::PointerUp {
                pointer_id: TOUCH.id,
                position: at(60.0),
            },
            &mut env,
        );
        assert!(!step.consumed);
        assert_eq!(machine.state(), DragState::Idle);
    }

    #[test]
    fn the_slop_is_the_distance_from_where_the_touch_began() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, TOUCH, 50.0);
        // Wandering back and forth stays within 8 px of the origin.
        for x in [55.0, 48.0, 57.0, 52.0, 58.0] {
            machine.handle(
                T0 + 50.0,
                DragInput::PointerMove {
                    pointer_id: TOUCH.id,
                    position: at(x),
                },
                &mut env,
            );
            assert_eq!(machine.state(), DragState::Pending, "x = {x}");
        }
    }

    #[test]
    fn lifting_a_touch_before_the_hold_is_a_tap() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, TOUCH, 50.0);
        let step = machine.handle(
            T0 + 120.0,
            DragInput::PointerUp {
                pointer_id: TOUCH.id,
                position: at(50.0),
            },
            &mut env,
        );
        assert_eq!(machine.state(), DragState::Idle);
        assert!(!step.consumed);
        assert!(step.outcomes.is_empty());
        assert!(env.take().is_empty());
        assert_eq!(machine.next_deadline_ms(), None);
    }

    #[test]
    fn an_input_after_the_deadline_sees_the_drag_the_timer_would_have_started() {
        // The tick never ran; the finger moves far at 600 ms. The hold elapsed first, so it drags.
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, TOUCH, 50.0);
        let step = machine.handle(
            T0 + 600.0,
            DragInput::PointerMove {
                pointer_id: TOUCH.id,
                position: at(150.0),
            },
            &mut env,
        );
        assert_eq!(step.outcomes, vec![DragOutcome::Started]);
        assert!(step.consumed);
        // dragstart at the place it was held, then the move.
        let events = env
            .events
            .iter()
            .map(|event| (label(event), event.position))
            .collect::<Vec<_>>();
        assert_eq!(events[0], ("dragstart".to_owned(), at(50.0)));
        assert_eq!(events[1].0, "pointercancel");
        assert_eq!(events.last().expect("events").0, "dragover:20");
        assert_eq!(events.last().expect("events").1, at(150.0));
        assert_eq!(machine.target(), Some(ELEMENT_B));
    }

    #[test]
    fn a_release_after_the_deadline_starts_and_ends_the_drag_in_place() {
        let mut machine = machine();
        let mut env = Script::new();
        press(&mut machine, &mut env, TOUCH, 50.0);
        let step = machine.handle(
            T0 + 900.0,
            DragInput::PointerUp {
                pointer_id: TOUCH.id,
                position: at(50.0),
            },
            &mut env,
        );
        assert_eq!(
            step.outcomes,
            vec![
                DragOutcome::Started,
                ended(DragEndReason::Dropped, DropEffect::Move, false)
            ]
        );
        assert_eq!(
            env.take(),
            [
                "dragstart",
                "pointercancel",
                "drag",
                "dragenter:10<-none",
                "dragover:10",
                "drop:10:Move",
                "dragend:Move:inside"
            ]
        );
    }

    #[test]
    fn a_touch_with_a_prevented_dragstart_stays_a_plain_touch() {
        let mut machine = machine();
        let mut env = Script::new();
        env.start_prevented = true;
        press(&mut machine, &mut env, TOUCH, 50.0);
        let step = machine.handle(T0 + TOUCH_DRAG_HOLD_MS, DragInput::HoldTick, &mut env);
        assert_eq!(step.outcomes, vec![DragOutcome::Refused]);
        assert_eq!(machine.state(), DragState::Ended);
        assert_eq!(machine.next_deadline_ms(), None);
        assert_eq!(env.take(), ["dragstart"]);
    }

    // --- replies ---

    fn event_of(kind: DragEventKind) -> DragEvent {
        DragEvent {
            source: SOURCE,
            pointer: MOUSE,
            position: Vec2::ZERO,
            kind,
        }
    }

    fn outcome(default_prevented: bool, drop_effect: Option<DropEffect>) -> EventOutcome {
        EventOutcome {
            default_prevented,
            drop_effect,
        }
    }

    #[test]
    fn an_event_that_was_not_prevented_replies_default_whatever_the_effect() {
        let dragover = event_of(DragEventKind::DragOver { target: 1 });
        assert_eq!(
            DragReply::from_outcome(&dragover, outcome(false, Some(DropEffect::Move))),
            Ok(DragReply::Default)
        );
        assert_eq!(
            DragReply::from_outcome(&dragover, outcome(false, None)),
            Ok(DragReply::Default)
        );
    }

    #[test]
    fn a_prevented_dragover_or_drop_must_say_which_effect() {
        let dragover = event_of(DragEventKind::DragOver { target: 1 });
        let drop = event_of(DragEventKind::Drop {
            target: 1,
            drop_effect: DropEffect::Copy,
        });
        for event in [dragover, drop] {
            assert_eq!(
                DragReply::from_outcome(&event, outcome(true, Some(DropEffect::Link))),
                Ok(DragReply::Prevented(DropEffect::Link))
            );
            assert_eq!(
                DragReply::from_outcome(&event, outcome(true, Some(DropEffect::None))),
                Ok(DragReply::Prevented(DropEffect::None))
            );
            assert_eq!(
                DragReply::from_outcome(&event, outcome(true, None)),
                Err(DragReplyError::MissingDropEffect)
            );
        }
    }

    #[test]
    fn a_prevented_dragstart_needs_no_effect() {
        let start = event_of(DragEventKind::DragStart);
        assert_eq!(
            DragReply::from_outcome(&start, outcome(true, None)),
            Ok(DragReply::Prevented(DropEffect::None))
        );
    }

    #[test]
    fn only_a_real_effect_is_accepted() {
        assert_eq!(accepted_effect(DropEffect::None), None);
        assert_eq!(accepted_effect(DropEffect::Copy), Some(DropEffect::Copy));
        assert_eq!(accepted_effect(DropEffect::Move), Some(DropEffect::Move));
        assert_eq!(accepted_effect(DropEffect::Link), Some(DropEffect::Link));
    }
}
