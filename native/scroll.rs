//! Scroll math for scroll containers (plan section 3.16): ranges and clamping, wheel / pan / keyboard
//! conversions, chaining, touch-pan arbitration, momentum, overlay scrollbar geometry and drag
//! auto-scroll. Nothing here touches the engine or the mounted tree: the integrating phase (I5) feeds
//! it layout results and input and applies the offsets it returns. Mirrors Godot's `ScrollContainer`
//! (`scene/gui/scroll_container.cpp`) where the plan says so; every deliberate difference is noted at
//! the item and recorded in `docs/tracks/scroll-drag-core.md`.
//!
//! # Public API (what Phases I5 and I9 call)
//!
//! Values: [`Vec2`], [`Rect`], [`Axis`].
//!
//! Ranges and state (3.16):
//! - [`ScrollRange::new`]`(magnitude, reversed)` from Taffy's `Layout::scroll_width()` /
//!   `scroll_height()` (a magnitude) and `scrollable_overflow_rect.is_reversed()`; [`ScrollRanges`]
//!   holds both axes. Normal axes allow `0..=magnitude`, reversed axes `-magnitude..=0`.
//! - [`ScrollState`] is the per-tag `{ offset, velocity }`; [`ScrollState::reclamp`] after layout,
//!   [`ScrollState::scroll_to`] / [`ScrollState::scroll_by`] for commands.
//!
//! Input conversion and chaining:
//! - [`wheel_factor`] (a Godot `factor` of 0 means 1), [`ScrollInput::wheel`] (Shift swaps axes) and
//!   [`ScrollInput::pan`] (no swap) build an input in wheel ticks (decision D13); [`ScrollInput::Pixels`]
//!   carries pixels.
//! - [`ticks_to_pixels`] converts ticks for a single container; [`scroll_chain`] walks an ordered list of [`ScrollLink`]s (innermost first), moves each by what it
//!   can, passes the remainder on and stops after an `overscroll-behavior: contain` link. The
//!   [`ChainOutcome::moved`] flag decides Godot's `accept_event`.
//! - [`scroll_key`] / [`key_scroll_delta`] handle arrows, Page, Home / End, Space and Shift+Space.
//! - [`scroll_reveal_delta`] is the minimal scroll that brings a rectangle into view.
//!
//! Touch pan (3.12 gesture arbitration rule 4) and momentum:
//! - [`exceeds_slop`], [`dominant_axis`], [`TouchAction`] and [`pan_owner`] decide whether a touch
//!   movement becomes a pan and which container owns it.
//! - [`VelocityTracker`] estimates the release velocity the way `ScrollContainer` does, and
//!   [`momentum_step`] advances the deceleration one frame.
//!
//! Scrollbars and auto-scroll:
//! - [`scrollbars`] lays out the overlay thumbs; [`Scrollbar::hit`] classifies a press and
//!   [`ThumbDrag`] maps a thumb drag back to an offset.
//! - [`autoscroll_velocity`] is the drag auto-scroll speed near a container's edges (3.19).

use std::ops::{Add, Sub};

use crate::transform::Linear2;

/// `ScrollBar::PAGE_DIVISOR` (`scene/gui/scroll_bar.h:116`): a wheel tick scrolls a page divided by
/// this, and a keyboard arrow step is the same ("item" unit, `scroll_container.cpp:451-478`).
pub(crate) const SCROLL_PAGE_DIVISOR: f32 = 8.0;

/// The deceleration of a flick, in pixels per second per second: `ScrollContainer` subtracts
/// `1000 * delta` from each axis' speed every frame (`scroll_container.cpp:605` and `:613`).
pub(crate) const MOMENTUM_DECELERATION_PX_PER_S2: f32 = 1000.0;
/// The release velocity is re-sampled on a frame that had motion, or once this many seconds have
/// passed without motion (`time_since_motion > 0.1`, `scroll_container.cpp:626`). Letting go of a
/// finger that stopped moving for longer than this therefore flings nothing.
pub(crate) const MOMENTUM_SAMPLE_INTERVAL_S: f32 = 0.1;

/// Logical pixels a touch may travel before it stops being a tap or a hold (plan Appendix A: Android's
/// 8 dp; Godot's own scroll deadzone defaults to 0, `scroll_container.cpp:951`).
pub(crate) const TOUCH_SLOP_PX: f32 = 8.0;

/// Overlay scrollbar sizes (plan Appendix A).
pub(crate) const SCROLLBAR_THICKNESS_PX: f32 = 6.0;
pub(crate) const SCROLLBAR_MARGIN_PX: f32 = 2.0;
pub(crate) const SCROLLBAR_MIN_THUMB_PX: f32 = 24.0;

/// Drag auto-scroll (plan Appendix A; tune with evidence): within this many pixels of a container's
/// edge the container scrolls, ramping linearly up to the full speed at the edge itself
/// (`drag_input.rs`).
pub(crate) const AUTOSCROLL_EDGE_PX: f32 = 32.0;
pub(crate) const AUTOSCROLL_SPEED_PX_PER_SECOND: f32 = 600.0;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Axis {
    X,
    Y,
}

pub(crate) const AXES: [Axis; 2] = [Axis::X, Axis::Y];

/// A 2D value: an offset, a delta, a velocity, a size or a point, in root-local logical pixels.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct Vec2 {
    pub(crate) x: f32,
    pub(crate) y: f32,
}

impl Vec2 {
    pub(crate) const ZERO: Self = Self { x: 0.0, y: 0.0 };

    pub(crate) const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    pub(crate) fn get(self, axis: Axis) -> f32 {
        match axis {
            Axis::X => self.x,
            Axis::Y => self.y,
        }
    }

    pub(crate) fn set(&mut self, axis: Axis, value: f32) {
        match axis {
            Axis::X => self.x = value,
            Axis::Y => self.y = value,
        }
    }

    pub(crate) fn length(self) -> f32 {
        self.x.hypot(self.y)
    }

    pub(crate) fn swapped(self) -> Self {
        Self::new(self.y, self.x)
    }
}

impl Add for Vec2 {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y)
    }
}

impl Sub for Vec2 {
    type Output = Self;
    fn sub(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y)
    }
}

/// An axis-aligned rectangle, `origin` being its top-left corner.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct Rect {
    pub(crate) origin: Vec2,
    pub(crate) size: Vec2,
}

impl Rect {
    pub(crate) const fn new(x: f32, y: f32, width: f32, height: f32) -> Self {
        Self {
            origin: Vec2::new(x, y),
            size: Vec2::new(width, height),
        }
    }

    /// The edge nearest the origin on `axis`.
    pub(crate) fn start(&self, axis: Axis) -> f32 {
        self.origin.get(axis)
    }

    /// The edge farthest from the origin on `axis`.
    pub(crate) fn end(&self, axis: Axis) -> f32 {
        self.origin.get(axis) + self.size.get(axis)
    }

    /// Edges are inclusive so a pointer on the last pixel row still counts as inside.
    pub(crate) fn contains(&self, point: Vec2) -> bool {
        AXES.iter()
            .all(|&axis| point.get(axis) >= self.start(axis) && point.get(axis) <= self.end(axis))
    }
}

// ---------------------------------------------------------------------------------------------
// Ranges and state
// ---------------------------------------------------------------------------------------------

/// The offsets one axis can take. A normal axis allows `0..=magnitude`; a reversed axis
/// (`row-reverse` / `column-reverse`, where content starts at the far edge) allows
/// `-magnitude..=0` (plan 3.16). Positive deltas always move the offset towards `max`, so wheel down
/// and right are positive for both.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct ScrollRange {
    min: f32,
    max: f32,
}

impl ScrollRange {
    /// An axis that cannot scroll.
    pub(crate) const NONE: Self = Self { min: 0.0, max: 0.0 };

    /// `magnitude` is `Layout::scroll_width()` or `scroll_height()` (taffy
    /// `tree/layout.rs:797-825`: always the non-negative size of the reachable range, also for a
    /// reversed axis) and `reversed` is the matching flag of `scrollable_overflow_rect.is_reversed()`.
    /// A zero, negative or non-finite magnitude gives an axis that cannot scroll.
    pub(crate) fn new(magnitude: f32, reversed: bool) -> Self {
        if !(magnitude.is_finite() && magnitude > 0.0) {
            return Self::NONE;
        }
        if reversed {
            Self {
                min: -magnitude,
                max: 0.0,
            }
        } else {
            Self {
                min: 0.0,
                max: magnitude,
            }
        }
    }

    pub(crate) fn min(&self) -> f32 {
        self.min
    }

    pub(crate) fn max(&self) -> f32 {
        self.max
    }

    /// The size of the reachable range, as `Layout::scroll_width()` reports it.
    pub(crate) fn magnitude(&self) -> f32 {
        self.max - self.min
    }

    pub(crate) fn is_scrollable(&self) -> bool {
        self.max > self.min
    }

    pub(crate) fn clamp(&self, offset: f32) -> f32 {
        offset.clamp(self.min, self.max)
    }

    /// Whether `offset` can still move towards `max` (`toward_max`) or `min`.
    pub(crate) fn can_move(&self, offset: f32, toward_max: bool) -> bool {
        if toward_max {
            offset < self.max
        } else {
            offset > self.min
        }
    }

    /// How far along the range `offset` is, from the physical start edge (`min`) at 0 to the end
    /// edge (`max`) at 1. This is the thumb position for both normal and reversed axes: a reversed
    /// axis starts scrolled to its far edge, so its thumb starts at the far end of the track.
    pub(crate) fn fraction(&self, offset: f32) -> f32 {
        if self.is_scrollable() {
            ((offset - self.min) / self.magnitude()).clamp(0.0, 1.0)
        } else {
            0.0
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct ScrollRanges {
    pub(crate) x: ScrollRange,
    pub(crate) y: ScrollRange,
}

impl Default for ScrollRanges {
    fn default() -> Self {
        Self::NONE
    }
}

impl ScrollRanges {
    pub(crate) const NONE: Self = Self {
        x: ScrollRange::NONE,
        y: ScrollRange::NONE,
    };

    pub(crate) fn get(&self, axis: Axis) -> ScrollRange {
        match axis {
            Axis::X => self.x,
            Axis::Y => self.y,
        }
    }

    /// Clamp both axes of `offset`.
    pub(crate) fn clamp(&self, offset: Vec2) -> Vec2 {
        Vec2::new(self.x.clamp(offset.x), self.y.clamp(offset.y))
    }
}

/// A scroll container's per-tag state: where it is scrolled and how fast it is still coasting
/// (pixels per second, positive towards `max`).
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct ScrollState {
    pub(crate) offset: Vec2,
    pub(crate) velocity: Vec2,
}

impl ScrollState {
    /// Re-clamp after layout changed the ranges. An axis that was clamped loses its momentum.
    /// Returns whether the offset changed.
    pub(crate) fn reclamp(&mut self, ranges: &ScrollRanges) -> bool {
        let mut changed = false;
        for axis in AXES {
            let clamped = ranges.get(axis).clamp(self.offset.get(axis));
            if clamped != self.offset.get(axis) {
                self.offset.set(axis, clamped);
                self.velocity.set(axis, 0.0);
                changed = true;
            }
        }
        changed
    }

    /// Scroll to `target`, clamped. Returns how far the offset actually moved.
    pub(crate) fn scroll_to(&mut self, ranges: &ScrollRanges, target: Vec2) -> Vec2 {
        let before = self.offset;
        self.offset = ranges.clamp(target);
        self.offset - before
    }

    /// Scroll by `delta` pixels, clamped. Returns how far the offset actually moved.
    pub(crate) fn scroll_by(&mut self, ranges: &ScrollRanges, delta: Vec2) -> Vec2 {
        self.scroll_to(ranges, self.offset + delta)
    }

    /// Stop any coasting (a new touch, a programmatic scroll).
    pub(crate) fn stop_momentum(&mut self) {
        self.velocity = Vec2::ZERO;
    }
}

// ---------------------------------------------------------------------------------------------
// Wheel, pan and keyboard input
// ---------------------------------------------------------------------------------------------

/// `InputEventMouseButton.factor` is documented as "May be 0 if not supported"
/// (`doc/classes/InputEventMouseButton.xml`), which for a discrete wheel notch means one notch.
/// Callers normalise the raw factor with this before turning a wheel button into ticks, because
/// `pointer::wheel_ticks` multiplies by whatever it is given.
pub(crate) fn wheel_factor(raw: f32) -> f32 {
    if raw == 0.0 { 1.0 } else { raw }
}

/// The pixels `ticks` wheel ticks scroll a container with client size `client`: a page divided by
/// [`SCROLL_PAGE_DIVISOR`] per tick on each axis (`scroll_container.cpp:190-226`; a trackpad pan's
/// `page * delta / PAGE_DIVISOR` is the same, `:311-318`). The renderer scrolls through
/// [`scroll_chain`], which does this per container; this is for a caller with a single container
/// (the accessibility scroll actions, Phase I10).
#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn ticks_to_pixels(ticks: Vec2, client: Vec2) -> Vec2 {
    Vec2::new(
        ticks.x * (client.x / SCROLL_PAGE_DIVISOR),
        ticks.y * (client.y / SCROLL_PAGE_DIVISOR),
    )
}

/// What a scroll gesture asks for.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) enum ScrollInput {
    /// Wheel ticks, positive down and right (decision D13). Each container turns them into pixels as
    /// `ScrollContainer` does: `client size / SCROLL_PAGE_DIVISOR` per tick
    /// (`scroll_container.cpp:190-226`). Trackpad pans scale the same way (`:311-318`).
    Ticks(Vec2),
    Pixels(Vec2),
}

impl ScrollInput {
    /// A mouse wheel. Shift requests horizontal scrolling for vertical wheel inputs (decision D13 /
    /// `scroll_container.cpp:187`).
    ///
    /// Browsers (Godot Web export) and macOS Cocoa already map Shift + vertical wheel to horizontal
    /// deltas (`deltaX`), emitting `MouseButton::WHEEL_LEFT` / `WHEEL_RIGHT` (`ticks.x != 0`) with
    /// `shift_pressed = true`. If ticks are already horizontal, swapping them would mistakenly turn
    /// them back into vertical ticks and prevent horizontal containers (like carousels) from scrolling.
    /// Only swap when ticks are purely vertical (`ticks.x == 0`, as on Windows desktop).
    ///
    /// Not mirrored: `ScrollContainer` also sends a vertical tick to the horizontal bar when the
    /// vertical bar is hidden (`:189`, `:210`). The DOM does not, and chaining gives the tick to an
    /// ancestor instead.
    pub(crate) fn wheel(ticks: Vec2, shift: bool) -> Self {
        Self::Ticks(if shift && ticks.x == 0.0 {
            ticks.swapped()
        } else {
            ticks
        })
    }

    /// A trackpad pan gesture. `ScrollContainer` ignores Shift for pans.
    pub(crate) fn pan(ticks: Vec2) -> Self {
        Self::Ticks(ticks)
    }

    fn amount(self) -> Vec2 {
        match self {
            Self::Ticks(amount) | Self::Pixels(amount) => amount,
        }
    }

    /// Pixels per unit of the input on `axis` for a container with `client` size.
    fn pixels_per_unit(self, client: Vec2, axis: Axis) -> f32 {
        match self {
            Self::Ticks(_) => client.get(axis) / SCROLL_PAGE_DIVISOR,
            Self::Pixels(_) => 1.0,
        }
    }
}

/// `overscroll-behavior` (plan 4.2): `contain` ends scroll chaining at the container.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum OverscrollBehavior {
    Auto,
    Contain,
}

/// One scroll container on the path from the event target outwards. Build the list from the
/// containers the event passes through (nearest first), copy the result's offsets back into the
/// per-tag state.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct ScrollLink {
    /// The container's client (padding box) size: the page of each axis.
    pub(crate) client: Vec2,
    pub(crate) ranges: ScrollRanges,
    pub(crate) offset: Vec2,
    pub(crate) overscroll: OverscrollBehavior,
    /// How the container's own axes are turned on screen (the linear part of the map that draws it), when a
    /// transform turns, scales or skews it. An input is in screen axes and is taken in the container's: a
    /// wheel down over a container turned a quarter scrolls it along its own x. `None` for the usual container,
    /// which takes the input as it is.
    pub(crate) frame: Option<Linear2>,
}

impl ScrollLink {
    /// `amount`, in screen axes, in the container's own. Pixels map through the inverse exactly (a finger drags
    /// the content one to one whatever the scale); ticks are a fraction of the container's page, so only their
    /// direction maps: the columns of the map are made unit length first.
    fn localize(&self, input: ScrollInput, amount: Vec2) -> Vec2 {
        let Some(frame) = self.frame else {
            return amount;
        };
        let frame = match input {
            ScrollInput::Pixels(_) => frame,
            ScrollInput::Ticks(_) => unit_columns(frame),
        };
        frame.inverse().map_or(amount, |inverse| {
            let mapped = inverse.apply(godot::prelude::Vector2::new(amount.x, amount.y));
            Vec2::new(mapped.x, mapped.y)
        })
    }

    /// A velocity or distance in screen pixels, in the container's own axes.
    pub(crate) fn localize_pixels(&self, amount: Vec2) -> Vec2 {
        self.localize(ScrollInput::Pixels(amount), amount)
    }

    /// The inverse of [`Self::localize`].
    fn globalize(&self, input: ScrollInput, amount: Vec2) -> Vec2 {
        let Some(frame) = self.frame else {
            return amount;
        };
        let frame = match input {
            ScrollInput::Pixels(_) => frame,
            ScrollInput::Ticks(_) => unit_columns(frame),
        };
        let mapped = frame.apply(godot::prelude::Vector2::new(amount.x, amount.y));
        Vec2::new(mapped.x, mapped.y)
    }
}

/// `frame` with each column scaled to unit length, which is its direction without its scale.
fn unit_columns(frame: Linear2) -> Linear2 {
    let x = frame.a.hypot(frame.b);
    let y = frame.c.hypot(frame.d);
    if x == 0.0 || y == 0.0 {
        return frame;
    }
    Linear2 {
        a: frame.a / x,
        b: frame.b / x,
        c: frame.c / y,
        d: frame.d / y,
    }
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ChainOutcome {
    /// Whether any container moved. This decides Godot's `accept_event` (`scroll_container.cpp:231`).
    pub(crate) moved: bool,
    /// For each link, how far its offset moved in pixels.
    pub(crate) moved_by: Vec<Vec2>,
    /// What nobody could take, in the input's own units.
    pub(crate) remainder: Vec2,
    /// The link whose `overscroll-behavior: contain` kept the remainder from going further. `None`
    /// when the chain ended because the input was used up, or because there were no more links.
    pub(crate) stopped_by: Option<usize>,
}

/// Scroll chaining. Each link, nearest first, consumes what its ranges allow on each axis and the
/// remainder goes to the next one; a `contain` link ends the chain after taking its share (on both
/// axes: this model has one `overscrollBehavior`, and a scroll container is one on every axis).
///
/// Deliberate difference from browsers: the remainder of a partly consumed input spills over into
/// the next container in the same call (as Android's nested scrolling does) instead of waiting for
/// the next input to find the first container at its limit. Wheel ticks are small, so the two only
/// differ for a large flick.
pub(crate) fn scroll_chain(links: &mut [ScrollLink], input: ScrollInput) -> ChainOutcome {
    let mut remaining = input.amount();
    let mut moved_by = vec![Vec2::ZERO; links.len()];
    let mut stopped_by = None;

    for (index, link) in links.iter_mut().enumerate() {
        if remaining == Vec2::ZERO {
            break;
        }
        // The container takes the input in its own axes, and what it leaves goes on in the screen's.
        let mut local = link.localize(input, remaining);
        for axis in AXES {
            let request = local.get(axis);
            let unit = input.pixels_per_unit(link.client, axis);
            // An empty client scrolls nothing: everything passes on.
            if request == 0.0 || unit <= 0.0 {
                continue;
            }
            let from = link.offset.get(axis);
            let wanted = from + request * unit;
            let to = link.ranges.get(axis).clamp(wanted);
            link.offset.set(axis, to);
            moved_by[index].set(axis, to - from);
            // Compare instead of subtracting so a fully consumed input leaves exactly zero.
            local.set(
                axis,
                if to == wanted {
                    0.0
                } else {
                    (wanted - to) / unit
                },
            );
        }
        remaining = link.globalize(input, local);
        if link.overscroll == OverscrollBehavior::Contain && remaining != Vec2::ZERO {
            stopped_by = Some(index);
            break;
        }
    }

    ChainOutcome {
        moved: moved_by.iter().any(|moved| *moved != Vec2::ZERO),
        moved_by,
        remainder: remaining,
        stopped_by,
    }
}

/// The keys that scroll, already told apart from text editing by the caller (never inside a text
/// input, never with Ctrl, Alt or Meta held).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ScrollKey {
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    PageUp,
    PageDown,
    Home,
    End,
    Space,
}

/// How far `key` scrolls `link`, in pixels (not clamped). Arrows step a page / `SCROLL_PAGE_DIVISOR`
/// and Page keys a page: the two units of `ScrollContainer`'s accessibility scroll actions
/// (`scroll_container.cpp:451-478`), the engine's only keyboard scroll step. Space pages down and
/// Shift+Space up. Home and End go to the physical top and bottom edges (the range's `min` and `max`,
/// for reversed axes too). Like browsers, vertical keys only scroll the vertical axis.
pub(crate) fn key_scroll_delta(key: ScrollKey, shift: bool, link: &ScrollLink) -> Vec2 {
    let line = |axis: Axis| link.client.get(axis) / SCROLL_PAGE_DIVISOR;
    let page = |axis: Axis| link.client.get(axis);
    match key {
        ScrollKey::ArrowUp => Vec2::new(0.0, -line(Axis::Y)),
        ScrollKey::ArrowDown => Vec2::new(0.0, line(Axis::Y)),
        ScrollKey::ArrowLeft => Vec2::new(-line(Axis::X), 0.0),
        ScrollKey::ArrowRight => Vec2::new(line(Axis::X), 0.0),
        ScrollKey::PageUp => Vec2::new(0.0, -page(Axis::Y)),
        ScrollKey::PageDown => Vec2::new(0.0, page(Axis::Y)),
        ScrollKey::Space if shift => Vec2::new(0.0, -page(Axis::Y)),
        ScrollKey::Space => Vec2::new(0.0, page(Axis::Y)),
        ScrollKey::Home => Vec2::new(0.0, link.ranges.y.min() - link.offset.y),
        ScrollKey::End => Vec2::new(0.0, link.ranges.y.max() - link.offset.y),
    }
}

/// Which way an assistive technology scrolls a container: the on-screen direction, so down is
/// towards `max` for a reversed axis too.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ScrollDirection {
    Up,
    Down,
    Left,
    Right,
}

/// How far an assistive technology scrolls (`AccessibilityScrollUnit`): one step (an item, a line) or a
/// page.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ScrollUnit {
    Item,
    Page,
}

/// How far an assistive technology's scroll action moves a container whose client size is `client`,
/// in pixels (not clamped). The same distances as the arrow and Page keys, and as `ScrollContainer`'s
/// own accessibility actions (`scroll_container.cpp:451-478`): an item is a page divided by
/// [`SCROLL_PAGE_DIVISOR`].
pub(crate) fn assistive_scroll_delta(
    direction: ScrollDirection,
    unit: ScrollUnit,
    client: Vec2,
) -> Vec2 {
    let distance = |axis: Axis| match unit {
        ScrollUnit::Item => client.get(axis) / SCROLL_PAGE_DIVISOR,
        ScrollUnit::Page => client.get(axis),
    };
    match direction {
        ScrollDirection::Up => Vec2::new(0.0, -distance(Axis::Y)),
        ScrollDirection::Down => Vec2::new(0.0, distance(Axis::Y)),
        ScrollDirection::Left => Vec2::new(-distance(Axis::X), 0.0),
        ScrollDirection::Right => Vec2::new(distance(Axis::X), 0.0),
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct KeyScrollOutcome {
    /// Whether a container moved; the keydown default action was taken.
    pub(crate) moved: bool,
    /// The link that moved.
    pub(crate) link: Option<usize>,
    pub(crate) moved_by: Vec2,
}

/// Keyboard scrolling: the first link (nearest first) that the key moves takes it, so a container
/// already at its limit hands the key to its ancestor; a `contain` link ends the search.
pub(crate) fn scroll_key(
    links: &mut [ScrollLink],
    key: ScrollKey,
    shift: bool,
) -> KeyScrollOutcome {
    for (index, link) in links.iter_mut().enumerate() {
        let wanted = link.offset + key_scroll_delta(key, shift, link);
        let to = link.ranges.clamp(wanted);
        let moved_by = to - link.offset;
        if moved_by != Vec2::ZERO {
            link.offset = to;
            return KeyScrollOutcome {
                moved: true,
                link: Some(index),
                moved_by,
            };
        }
        if link.overscroll == OverscrollBehavior::Contain {
            break;
        }
    }
    KeyScrollOutcome {
        moved: false,
        link: None,
        moved_by: Vec2::ZERO,
    }
}

/// The smallest scroll delta that brings `target` into a container whose client size is `client`,
/// with `target` given relative to the client's top-left corner (so a rectangle that is already
/// inside has non-negative edges). Mirrors `ScrollContainer::ensure_control_visible`
/// (`scroll_container.cpp:377`, minus the scrollbar margins: ours overlay the content). A target
/// larger than the client shows its far edge, as the engine does. Add the result to the offset, then
/// clamp.
pub(crate) fn scroll_reveal_delta(target: Rect, client: Vec2) -> Vec2 {
    let delta = |axis: Axis| {
        target
            .start(axis)
            .min(0.0)
            .max(target.end(axis) - client.get(axis))
    };
    Vec2::new(delta(Axis::X), delta(Axis::Y))
}

// ---------------------------------------------------------------------------------------------
// Touch pan arbitration
// ---------------------------------------------------------------------------------------------

/// Whether a touch moved far enough from where it began to stop being a tap or a hold. Euclidean and
/// strict, like Godot's drag threshold (`viewport.cpp:2052`).
pub(crate) fn exceeds_slop(displacement: Vec2, slop: f32) -> bool {
    displacement.length() > slop
}

/// The axis a movement is mostly along. A tie goes to the vertical axis, the common scroll direction.
pub(crate) fn dominant_axis(displacement: Vec2) -> Axis {
    if displacement.x.abs() > displacement.y.abs() {
        Axis::X
    } else {
        Axis::Y
    }
}

/// CSS `touch-action` as the plan supports it (4.2).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TouchAction {
    Auto,
    None,
    PanX,
    PanY,
}

/// The axes a touch may pan along.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct PanAllowed {
    pub(crate) x: bool,
    pub(crate) y: bool,
}

impl PanAllowed {
    pub(crate) const ALL: Self = Self { x: true, y: true };

    pub(crate) fn allows(self, axis: Axis) -> bool {
        match axis {
            Axis::X => self.x,
            Axis::Y => self.y,
        }
    }

    pub(crate) fn intersect(self, other: Self) -> Self {
        Self {
            x: self.x && other.x,
            y: self.y && other.y,
        }
    }
}

impl TouchAction {
    pub(crate) fn allowed(self) -> PanAllowed {
        match self {
            Self::Auto => PanAllowed::ALL,
            Self::None => PanAllowed { x: false, y: false },
            Self::PanX => PanAllowed { x: true, y: false },
            Self::PanY => PanAllowed { x: false, y: true },
        }
    }
}

/// An element on the path from the touched element outwards. `touch_action` is its own computed
/// value; `scroller` is present when it is a scroll container.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct PanCandidate {
    pub(crate) touch_action: TouchAction,
    pub(crate) scroller: Option<PanScroller>,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct PanScroller {
    pub(crate) ranges: ScrollRanges,
    pub(crate) offset: Vec2,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct PanOwner {
    /// Index into the candidate path.
    pub(crate) index: usize,
    /// The effective `touch-action` at the owner: apply the pan only on these axes.
    pub(crate) allowed: PanAllowed,
}

/// Plan 3.12 rule 4: after a touch moved beyond the slop by `displacement` (the finger's movement
/// since it went down), which container pans, if any. Walks the path from the touched element
/// outwards, intersecting `touch-action` as it goes (a `pan-y` child inside a `none` parent does not
/// pan). The owner is the first scroll container that can still move opposite to the finger along
/// the dominant axis while the intersection allows that axis. `None` means the touch is not a pan:
/// the intersection forbids the axis (the element wants the pointer events) or nothing can scroll
/// that way.
pub(crate) fn pan_owner(path: &[PanCandidate], displacement: Vec2) -> Option<PanOwner> {
    let axis = dominant_axis(displacement);
    // The content follows the finger, so the offset moves opposite to it.
    let toward_max = displacement.get(axis) < 0.0;
    let mut allowed = PanAllowed::ALL;
    for (index, candidate) in path.iter().enumerate() {
        allowed = allowed.intersect(candidate.touch_action.allowed());
        if !allowed.allows(axis) {
            return None;
        }
        let can_scroll = candidate.scroller.is_some_and(|scroller| {
            scroller
                .ranges
                .get(axis)
                .can_move(scroller.offset.get(axis), toward_max)
        });
        if can_scroll {
            return Some(PanOwner { index, allowed });
        }
    }
    None
}

// ---------------------------------------------------------------------------------------------
// Momentum
// ---------------------------------------------------------------------------------------------

/// Estimates the velocity a touch pan is released with, sampled the way `ScrollContainer` does while
/// a finger is down (`scroll_container.cpp:279-301` for the accumulation and `:626-632` for the
/// sampling). Feed it the scroll delta of every pan movement (the finger's movement, negated) and
/// call [`VelocityTracker::frame`] once per frame while the finger is down.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct VelocityTracker {
    accum: Vec2,
    last_accum: Vec2,
    speed: Vec2,
    /// Seconds since the last movement; exactly 0 until the first frame after one.
    time_since_motion: f32,
}

impl VelocityTracker {
    pub(crate) fn new() -> Self {
        Self::default()
    }

    /// A pan movement of `scroll_delta` pixels (`drag_accum -= motion`).
    pub(crate) fn motion(&mut self, scroll_delta: Vec2) {
        self.accum = self.accum + scroll_delta;
        self.time_since_motion = 0.0;
    }

    /// One frame of `dt` seconds passed. A non-positive `dt` is not a frame.
    pub(crate) fn frame(&mut self, dt: f32) {
        if dt <= 0.0 {
            return;
        }
        if self.time_since_motion == 0.0 || self.time_since_motion > MOMENTUM_SAMPLE_INTERVAL_S {
            let diff = self.accum - self.last_accum;
            self.speed = Vec2::new(diff.x / dt, diff.y / dt);
            self.last_accum = self.accum;
        }
        self.time_since_motion += dt;
    }

    /// The velocity to coast with after release. Zero (both axes) means do not coast.
    pub(crate) fn release(&self) -> Vec2 {
        self.speed
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct MomentumStep {
    /// How far the offset moved this frame, in pixels.
    pub(crate) moved_by: Vec2,
    /// True once every axis has stopped; the caller stops asking for frames.
    pub(crate) finished: bool,
}

/// Advance a flick by one frame of `dt` seconds. Per axis this is `ScrollContainer`'s step
/// (`scroll_container.cpp:570-624`): move by `velocity * dt`; an axis that runs past a limit is
/// clamped and stops; otherwise its speed drops by [`MOMENTUM_DECELERATION_PX_PER_S2`]` * dt` and it
/// stops when that would reverse it. The whole flick finishes when every axis has stopped.
///
/// Differs from the engine in one respect: a stopped axis keeps a zero velocity. The engine writes
/// `sign * (speed - decel)` back even when that is negative, so an axis that stopped before the other
/// one reverses direction and creeps back.
pub(crate) fn momentum_step(
    state: &mut ScrollState,
    ranges: &ScrollRanges,
    dt: f32,
) -> MomentumStep {
    let before = state.offset;
    let mut finished = true;
    for axis in AXES {
        let range = ranges.get(axis);
        let velocity = state.velocity.get(axis);
        let position = state.offset.get(axis) + velocity * dt;
        // Strict comparisons, as the engine's: landing exactly on a limit keeps going one more frame.
        let hit_limit = position < range.min() || position > range.max();
        let speed = velocity.abs() - MOMENTUM_DECELERATION_PX_PER_S2 * dt;
        state.offset.set(axis, range.clamp(position));
        if hit_limit || speed < 0.0 {
            state.velocity.set(axis, 0.0);
        } else {
            state.velocity.set(axis, speed.copysign(velocity));
            finished = false;
        }
    }
    MomentumStep {
        moved_by: state.offset - before,
        finished,
    }
}

// ---------------------------------------------------------------------------------------------
// Overlay scrollbars
// ---------------------------------------------------------------------------------------------

/// Which part of a scrollbar a press landed on.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ScrollbarHit {
    Thumb,
    /// On the track before the thumb: page towards the start (what `ScrollBar` does, `:134-139`).
    TrackBefore,
    /// On the track after the thumb.
    TrackAfter,
}

/// One overlay scrollbar, in the container's local coordinates (origin at the top-left of the
/// client area, not scrolled).
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Scrollbar {
    pub(crate) axis: Axis,
    pub(crate) track: Rect,
    pub(crate) thumb: Rect,
    range: ScrollRange,
}

impl Scrollbar {
    pub(crate) fn hit(&self, point: Vec2) -> Option<ScrollbarHit> {
        if self.thumb.contains(point) {
            Some(ScrollbarHit::Thumb)
        } else if self.track.contains(point) {
            if point.get(self.axis) < self.thumb.start(self.axis) {
                Some(ScrollbarHit::TrackBefore)
            } else {
                Some(ScrollbarHit::TrackAfter)
            }
        } else {
            None
        }
    }

    /// Room the thumb has to travel along the track.
    fn travel(&self) -> f32 {
        self.track.size.get(self.axis) - self.thumb.size.get(self.axis)
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct Scrollbars {
    pub(crate) x: Option<Scrollbar>,
    pub(crate) y: Option<Scrollbar>,
}

/// Lay out the overlay scrollbars of a container with client size `client`: a thumb of
/// [`SCROLLBAR_THICKNESS_PX`] along the right (vertical) and bottom (horizontal) edge, inset by
/// [`SCROLLBAR_MARGIN_PX`]. A bar exists only for a scrollable axis. When both exist the tracks stop
/// short of the corner so they do not overlap. The thumb's length is the visible share of the
/// content (`client / (client + magnitude)`, the proportion `ScrollBar::get_grabber_size` uses),
/// never shorter than [`SCROLLBAR_MIN_THUMB_PX`] unless the track itself is. Callers skip this for
/// `scrollbarWidth: none`.
pub(crate) fn scrollbars(client: Vec2, ranges: &ScrollRanges, offset: Vec2) -> Scrollbars {
    let both = ranges.x.is_scrollable() && ranges.y.is_scrollable();
    let bar = |axis: Axis| -> Option<Scrollbar> {
        let range = ranges.get(axis);
        if !range.is_scrollable() {
            return None;
        }
        let across = match axis {
            Axis::X => Axis::Y,
            Axis::Y => Axis::X,
        };
        let corner = if both {
            SCROLLBAR_THICKNESS_PX + SCROLLBAR_MARGIN_PX
        } else {
            0.0
        };
        let length = (client.get(axis) - 2.0 * SCROLLBAR_MARGIN_PX - corner).max(0.0);
        let page = client.get(axis);
        let thumb_length = (length * page / (page + range.magnitude()))
            .max(SCROLLBAR_MIN_THUMB_PX)
            .min(length);
        let across_start = client.get(across) - SCROLLBAR_MARGIN_PX - SCROLLBAR_THICKNESS_PX;
        let thumb_start =
            SCROLLBAR_MARGIN_PX + (length - thumb_length) * range.fraction(offset.get(axis));

        let make = |start: f32, along: f32| {
            let mut rect = Rect::default();
            rect.origin.set(axis, start);
            rect.origin.set(across, across_start);
            rect.size.set(axis, along);
            rect.size.set(across, SCROLLBAR_THICKNESS_PX);
            rect
        };
        Some(Scrollbar {
            axis,
            track: make(SCROLLBAR_MARGIN_PX, length),
            thumb: make(thumb_start, thumb_length),
            range,
        })
    };
    Scrollbars {
        x: bar(Axis::X),
        y: bar(Axis::Y),
    }
}

/// A thumb being dragged with the mouse. The thumb follows the pointer one to one, like
/// `ScrollBar`'s drag (`scroll_bar.cpp:186-196`): the offset moves by the pointer's travel as a share
/// of the room the thumb has.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct ThumbDrag {
    bar: Scrollbar,
    pointer_at_press: f32,
    offset_at_press: f32,
    fraction_at_press: f32,
}

impl ThumbDrag {
    /// Start dragging `bar`'s thumb with the pointer at `pointer` while the container is scrolled to
    /// `offset` (along the bar's axis).
    pub(crate) fn begin(bar: Scrollbar, pointer: Vec2, offset: f32) -> Self {
        Self {
            bar,
            pointer_at_press: pointer.get(bar.axis),
            offset_at_press: bar.range.clamp(offset),
            fraction_at_press: bar.range.fraction(offset),
        }
    }

    /// The offset (along the bar's axis) for the pointer now at `pointer`, clamped to the range.
    pub(crate) fn offset_at(&self, pointer: Vec2) -> f32 {
        let range = self.bar.range;
        let travel = self.bar.travel();
        if travel <= 0.0 {
            // The thumb fills its track: there is nowhere to drag it.
            return self.offset_at_press;
        }
        let moved = (pointer.get(self.bar.axis) - self.pointer_at_press) / travel;
        let fraction = (self.fraction_at_press + moved).clamp(0.0, 1.0);
        range.clamp(range.min() + fraction * range.magnitude())
    }
}

// ---------------------------------------------------------------------------------------------
// Drag auto-scroll
// ---------------------------------------------------------------------------------------------

/// The auto-scroll velocity (pixels per second, signed like offsets) for a drag whose pointer is at
/// `pointer`, for the container whose visible area is `viewport` (same coordinate space). Zero
/// unless the pointer is inside `viewport`; per axis, within [`AUTOSCROLL_EDGE_PX`] of the nearer
/// edge the speed ramps linearly from zero at that distance to [`AUTOSCROLL_SPEED_PX_PER_SECOND`] at
/// the edge, towards that edge. An axis that cannot move that way stays zero. (`ScrollContainer`
/// scrolls in proportion to the depth into its border as well, `scroll_container.cpp:544-566`.)
pub(crate) fn autoscroll_velocity(
    pointer: Vec2,
    viewport: Rect,
    ranges: &ScrollRanges,
    offset: Vec2,
) -> Vec2 {
    if !viewport.contains(pointer) {
        return Vec2::ZERO;
    }
    let mut velocity = Vec2::ZERO;
    for axis in AXES {
        let to_start = pointer.get(axis) - viewport.start(axis);
        let to_end = viewport.end(axis) - pointer.get(axis);
        let toward_max = to_end < to_start;
        let distance = to_start.min(to_end);
        if distance >= AUTOSCROLL_EDGE_PX {
            continue;
        }
        if !ranges.get(axis).can_move(offset.get(axis), toward_max) {
            continue;
        }
        let speed =
            AUTOSCROLL_SPEED_PX_PER_SECOND * (AUTOSCROLL_EDGE_PX - distance) / AUTOSCROLL_EDGE_PX;
        velocity.set(axis, if toward_max { speed } else { -speed });
    }
    velocity
}

#[cfg(test)]
mod tests {
    use super::*;

    const CLIENT: Vec2 = Vec2::new(400.0, 800.0);
    /// A wheel tick on a client 800 high moves 100 px (800 / 8).
    const TICK_Y_PX: f32 = 100.0;
    const TICK_X_PX: f32 = 50.0;
    const FRAME_S: f32 = 1.0 / 60.0;
    /// Remainders pass through a division and a multiplication, so compare with a tolerance.
    const PIXEL_TOLERANCE: f32 = 0.001;

    fn assert_close(actual: f32, expected: f32) {
        assert!(
            (actual - expected).abs() < PIXEL_TOLERANCE,
            "{actual} is not {expected}"
        );
    }

    fn ranges(x: f32, y: f32) -> ScrollRanges {
        ScrollRanges {
            x: ScrollRange::new(x, false),
            y: ScrollRange::new(y, false),
        }
    }

    fn link(ranges: ScrollRanges, offset: Vec2) -> ScrollLink {
        ScrollLink {
            client: CLIENT,
            ranges,
            offset,
            overscroll: OverscrollBehavior::Auto,
            frame: None,
        }
    }

    fn contained(mut link: ScrollLink) -> ScrollLink {
        link.overscroll = OverscrollBehavior::Contain;
        link
    }

    // --- ranges and state ---

    #[test]
    fn normal_and_reversed_axes_have_mirrored_ranges() {
        let normal = ScrollRange::new(300.0, false);
        assert_eq!((normal.min(), normal.max()), (0.0, 300.0));
        let reversed = ScrollRange::new(300.0, true);
        assert_eq!((reversed.min(), reversed.max()), (-300.0, 0.0));
        assert_eq!(normal.magnitude(), reversed.magnitude());
        assert_eq!(normal.clamp(400.0), 300.0);
        assert_eq!(normal.clamp(-5.0), 0.0);
        assert_eq!(reversed.clamp(5.0), 0.0);
        assert_eq!(reversed.clamp(-400.0), -300.0);
    }

    #[test]
    fn a_missing_or_invalid_magnitude_cannot_scroll() {
        for magnitude in [0.0, -4.0, f32::NAN, f32::INFINITY] {
            for reversed in [false, true] {
                let range = ScrollRange::new(magnitude, reversed);
                assert_eq!(range, ScrollRange::NONE, "{magnitude} reversed={reversed}");
                assert!(!range.is_scrollable());
                assert_eq!(range.clamp(10.0), 0.0);
            }
        }
    }

    #[test]
    fn can_move_follows_the_range_in_both_directions() {
        let normal = ScrollRange::new(100.0, false);
        assert!(normal.can_move(0.0, true));
        assert!(!normal.can_move(0.0, false));
        assert!(!normal.can_move(100.0, true));
        assert!(normal.can_move(100.0, false));
        let reversed = ScrollRange::new(100.0, true);
        assert!(reversed.can_move(0.0, false));
        assert!(!reversed.can_move(0.0, true));
        assert!(reversed.can_move(-100.0, true));
        assert!(!reversed.can_move(-100.0, false));
    }

    #[test]
    fn fraction_runs_from_the_physical_start_for_both_directions() {
        let normal = ScrollRange::new(200.0, false);
        assert_eq!(normal.fraction(0.0), 0.0);
        assert_eq!(normal.fraction(50.0), 0.25);
        assert_eq!(normal.fraction(999.0), 1.0);
        // A reversed axis starts at offset 0, which is its far end.
        let reversed = ScrollRange::new(200.0, true);
        assert_eq!(reversed.fraction(0.0), 1.0);
        assert_eq!(reversed.fraction(-50.0), 0.75);
        assert_eq!(reversed.fraction(-200.0), 0.0);
        assert_eq!(ScrollRange::NONE.fraction(0.0), 0.0);
    }

    #[test]
    fn reclamp_pulls_the_offset_in_and_drops_the_momentum_of_a_clamped_axis() {
        let mut state = ScrollState {
            offset: Vec2::new(90.0, 500.0),
            velocity: Vec2::new(30.0, 40.0),
        };
        // Layout shrank the vertical range to 300 and left the horizontal one alone.
        assert!(state.reclamp(&ranges(200.0, 300.0)));
        assert_eq!(state.offset, Vec2::new(90.0, 300.0));
        assert_eq!(state.velocity, Vec2::new(30.0, 0.0));
        assert!(!state.reclamp(&ranges(200.0, 300.0)), "already in range");
    }

    #[test]
    fn reclamp_handles_a_reversed_axis_that_lost_its_range() {
        let mut state = ScrollState {
            offset: Vec2::new(0.0, -120.0),
            velocity: Vec2::ZERO,
        };
        let shrunk = ScrollRanges {
            x: ScrollRange::NONE,
            y: ScrollRange::new(50.0, true),
        };
        assert!(state.reclamp(&shrunk));
        assert_eq!(state.offset, Vec2::new(0.0, -50.0));
    }

    #[test]
    fn scroll_to_and_by_clamp_and_report_the_real_movement() {
        let mut state = ScrollState::default();
        let ranges = ranges(0.0, 100.0);
        assert_eq!(
            state.scroll_to(&ranges, Vec2::new(30.0, 60.0)),
            Vec2::new(0.0, 60.0),
            "x has no range"
        );
        assert_eq!(
            state.scroll_by(&ranges, Vec2::new(0.0, 70.0)),
            Vec2::new(0.0, 40.0)
        );
        assert_eq!(state.offset, Vec2::new(0.0, 100.0));
        assert_eq!(state.scroll_by(&ranges, Vec2::new(0.0, 5.0)), Vec2::ZERO);
        state.velocity = Vec2::new(1.0, 2.0);
        state.stop_momentum();
        assert_eq!(state.velocity, Vec2::ZERO);
    }

    // --- wheel and pan ---

    #[test]
    fn a_wheel_factor_of_zero_means_one_notch() {
        assert_eq!(wheel_factor(0.0), 1.0);
        assert_eq!(wheel_factor(1.0), 1.0);
        assert_eq!(wheel_factor(0.3), 0.3);
        assert_eq!(wheel_factor(-2.0), -2.0);
    }

    #[test]
    fn ticks_convert_to_a_page_over_the_divisor_per_axis() {
        assert_eq!(
            ticks_to_pixels(Vec2::new(1.0, 1.0), CLIENT),
            Vec2::new(TICK_X_PX, TICK_Y_PX)
        );
        assert_eq!(
            ticks_to_pixels(Vec2::new(-2.0, 0.5), CLIENT),
            Vec2::new(-2.0 * TICK_X_PX, 0.5 * TICK_Y_PX)
        );
        assert_eq!(ticks_to_pixels(Vec2::new(3.0, 3.0), Vec2::ZERO), Vec2::ZERO);
    }

    #[test]
    fn a_wheel_tick_scrolls_the_client_size_over_the_page_divisor() {
        let mut links = [link(ranges(200.0, 1000.0), Vec2::ZERO)];
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert!(outcome.moved);
        assert_eq!(links[0].offset, Vec2::new(0.0, TICK_Y_PX));
        assert_eq!(outcome.moved_by, vec![Vec2::new(0.0, TICK_Y_PX)]);
        assert_eq!(outcome.remainder, Vec2::ZERO);

        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(2.0, -0.5), false));
        assert!(outcome.moved);
        assert_eq!(
            links[0].offset,
            Vec2::new(2.0 * TICK_X_PX, TICK_Y_PX - 0.5 * TICK_Y_PX)
        );
    }

    #[test]
    fn shift_swaps_the_wheel_axes_but_not_a_pan() {
        let ticks = Vec2::new(0.0, 1.0);
        assert_eq!(
            ScrollInput::wheel(ticks, true),
            ScrollInput::Ticks(Vec2::new(1.0, 0.0))
        );
        assert_eq!(ScrollInput::wheel(ticks, false), ScrollInput::Ticks(ticks));
        assert_eq!(ScrollInput::pan(ticks), ScrollInput::Ticks(ticks));

        let mut links = [link(ranges(200.0, 1000.0), Vec2::ZERO)];
        scroll_chain(&mut links, ScrollInput::wheel(ticks, true));
        assert_eq!(links[0].offset, Vec2::new(TICK_X_PX, 0.0));

        // Browsers (Godot Web export) and macOS Cocoa already convert Shift+wheel into horizontal
        // deltas (WHEEL_LEFT/WHEEL_RIGHT, ticks.x != 0) with shift_pressed = true.
        // Holding shift on an already-horizontal input must remain horizontal, scrolling horizontal-only containers.
        let horizontal_ticks = Vec2::new(1.0, 0.0);
        assert_eq!(
            ScrollInput::wheel(horizontal_ticks, true),
            ScrollInput::Ticks(horizontal_ticks)
        );
        let mut carousel_links = [link(ranges(200.0, 0.0), Vec2::ZERO)];
        scroll_chain(&mut carousel_links, ScrollInput::wheel(horizontal_ticks, true));
        assert_eq!(carousel_links[0].offset, Vec2::new(TICK_X_PX, 0.0));
    }

    #[test]
    fn a_pan_scales_like_a_wheel_tick() {
        let mut wheel = [link(ranges(200.0, 1000.0), Vec2::ZERO)];
        let mut pan = wheel;
        scroll_chain(&mut wheel, ScrollInput::wheel(Vec2::new(0.25, 0.75), false));
        scroll_chain(&mut pan, ScrollInput::pan(Vec2::new(0.25, 0.75)));
        assert_eq!(wheel[0].offset, pan[0].offset);
        assert_eq!(pan[0].offset, Vec2::new(0.25 * TICK_X_PX, 0.75 * TICK_Y_PX));
    }

    #[test]
    fn a_wheel_on_a_container_at_its_limit_moves_nothing() {
        let mut links = [link(ranges(0.0, 300.0), Vec2::new(0.0, 300.0))];
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert!(!outcome.moved, "this is what leaves the wheel for the game");
        assert_eq!(outcome.remainder, Vec2::new(0.0, 1.0));
        assert_eq!(outcome.stopped_by, None);
    }

    #[test]
    fn a_reversed_axis_scrolls_between_minus_range_and_zero() {
        let reversed = ScrollRanges {
            x: ScrollRange::NONE,
            y: ScrollRange::new(250.0, true),
        };
        let mut links = [link(reversed, Vec2::ZERO)];
        // Wheel down at offset 0 (the far edge): nothing further to reveal that way.
        assert!(!scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false)).moved);
        // Wheel up moves towards -range, by the same tick.
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, -1.0), false));
        assert!(outcome.moved);
        assert_eq!(links[0].offset, Vec2::new(0.0, -TICK_Y_PX));
        scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, -5.0), false));
        assert_eq!(links[0].offset.y, -250.0, "clamped at -range");
        // And back down.
        scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert_eq!(links[0].offset.y, -250.0 + TICK_Y_PX);
    }

    // --- chaining ---

    #[test]
    fn the_nearest_container_takes_the_input_and_an_ancestor_gets_only_the_rest() {
        let inner_range = ranges(0.0, 40.0);
        let outer_range = ranges(0.0, 1000.0);
        let mut links = [
            link(inner_range, Vec2::ZERO),
            link(outer_range, Vec2::new(0.0, 10.0)),
        ];
        // One tick is 100 px; the inner container can take 40 of them.
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert!(outcome.moved);
        assert_eq!(links[0].offset.y, 40.0);
        assert_close(links[1].offset.y, 70.0); // 10 + the 60 px the inner one could not take
        assert_eq!(outcome.moved_by[0], Vec2::new(0.0, 40.0));
        assert_close(outcome.moved_by[1].y, 60.0);
        assert_eq!(outcome.remainder, Vec2::ZERO);
    }

    #[test]
    fn a_container_already_at_its_limit_passes_everything_on() {
        let mut links = [
            link(ranges(0.0, 40.0), Vec2::new(0.0, 40.0)),
            link(ranges(0.0, 1000.0), Vec2::ZERO),
        ];
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert_eq!(links[0].offset.y, 40.0);
        assert_eq!(links[1].offset.y, TICK_Y_PX);
        assert_eq!(
            outcome.moved_by,
            vec![Vec2::ZERO, Vec2::new(0.0, TICK_Y_PX)]
        );
    }

    #[test]
    fn each_axis_chains_on_its_own() {
        // The inner list scrolls only vertically, the outer carousel only horizontally.
        let mut links = [
            link(ranges(0.0, 500.0), Vec2::ZERO),
            link(ranges(500.0, 0.0), Vec2::ZERO),
        ];
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(1.0, 1.0), false));
        assert_eq!(links[0].offset, Vec2::new(0.0, TICK_Y_PX));
        assert_eq!(links[1].offset, Vec2::new(TICK_X_PX, 0.0));
        assert!(outcome.moved);
        assert_eq!(outcome.remainder, Vec2::ZERO);
    }

    #[test]
    fn chaining_converts_the_remainder_between_containers_of_different_size() {
        // A tick is 100 px on the 800-high inner client; the outer client is 160 high (20 px a tick).
        let mut small = link(ranges(0.0, 1000.0), Vec2::ZERO);
        small.client = Vec2::new(400.0, 160.0);
        let mut links = [link(ranges(0.0, 25.0), Vec2::ZERO), small];
        // Two ticks: the inner takes 25 px (a quarter of a tick), 1.75 ticks remain.
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 2.0), false));
        assert_eq!(links[0].offset.y, 25.0);
        assert_close(links[1].offset.y, 1.75 * 20.0);
        assert_eq!(outcome.remainder, Vec2::ZERO);
    }

    #[test]
    fn contain_stops_the_chain_after_the_container_takes_its_share() {
        let mut links = [
            contained(link(ranges(0.0, 40.0), Vec2::ZERO)),
            link(ranges(0.0, 1000.0), Vec2::ZERO),
        ];
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert_eq!(links[0].offset.y, 40.0);
        assert_eq!(links[1].offset.y, 0.0, "the ancestor never hears of it");
        assert_eq!(outcome.stopped_by, Some(0));
        assert!(outcome.moved);
        assert_close(outcome.remainder.y, 0.6);
        assert_eq!(outcome.remainder.x, 0.0);
    }

    #[test]
    fn contain_also_stops_an_input_the_container_cannot_use_at_all() {
        // A contained list at its end swallows the chain: nothing moves, the ancestor stays put, so
        // the wheel is not accepted for scrolling but also does not leak to the page behind.
        let mut links = [
            contained(link(ranges(0.0, 40.0), Vec2::new(0.0, 40.0))),
            link(ranges(0.0, 1000.0), Vec2::ZERO),
        ];
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert!(!outcome.moved);
        assert_eq!(links[1].offset.y, 0.0);
        assert_eq!(outcome.stopped_by, Some(0));
        // A horizontal tick over the same vertical-only container is contained too.
        let mut links = [
            contained(link(ranges(0.0, 40.0), Vec2::ZERO)),
            link(ranges(500.0, 0.0), Vec2::ZERO),
        ];
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(1.0, 0.0), false));
        assert!(!outcome.moved);
        assert_eq!(links[1].offset.x, 0.0);
    }

    #[test]
    fn contain_does_not_matter_when_the_container_took_everything() {
        let mut links = [contained(link(ranges(0.0, 1000.0), Vec2::ZERO))];
        let outcome = scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert!(outcome.moved);
        assert_eq!(
            outcome.stopped_by, None,
            "the chain ended because nothing remained"
        );
    }

    #[test]
    fn pixel_input_ignores_the_client_size() {
        let mut links = [link(ranges(0.0, 1000.0), Vec2::ZERO)];
        scroll_chain(&mut links, ScrollInput::Pixels(Vec2::new(0.0, 12.5)));
        assert_eq!(links[0].offset.y, 12.5);
    }

    #[test]
    fn an_empty_client_passes_the_input_on_instead_of_dividing_by_nothing() {
        let mut empty = link(ranges(0.0, 100.0), Vec2::ZERO);
        empty.client = Vec2::ZERO;
        let mut links = [empty, link(ranges(0.0, 1000.0), Vec2::ZERO)];
        scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert_eq!(links[0].offset.y, 0.0);
        assert_eq!(links[1].offset.y, TICK_Y_PX);
    }

    #[test]
    fn an_empty_chain_or_zero_input_moves_nothing() {
        let outcome = scroll_chain(&mut [], ScrollInput::wheel(Vec2::new(0.0, 1.0), false));
        assert!(!outcome.moved);
        assert_eq!(outcome.remainder, Vec2::new(0.0, 1.0));
        let mut links = [link(ranges(0.0, 100.0), Vec2::ZERO)];
        assert!(!scroll_chain(&mut links, ScrollInput::Pixels(Vec2::ZERO)).moved);
    }

    #[test]
    fn chaining_works_through_a_reversed_container() {
        let reversed = ScrollRanges {
            x: ScrollRange::NONE,
            y: ScrollRange::new(30.0, true),
        };
        let mut links = [
            link(reversed, Vec2::ZERO),
            link(ranges(0.0, 1000.0), Vec2::ZERO),
        ];
        // Wheel up: the reversed list reveals its 30 px, the page above it gets the other 70.
        scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, -1.0), false));
        assert_eq!(links[0].offset.y, -30.0);
        assert_eq!(links[1].offset.y, 0.0, "the page cannot go above 0");
        // Wheel down from the middle of the reversed list: it takes it, the page does not.
        links[0].offset.y = -20.0;
        scroll_chain(&mut links, ScrollInput::wheel(Vec2::new(0.0, 0.1), false));
        assert_close(links[0].offset.y, -10.0);
        assert_eq!(links[1].offset.y, 0.0);
    }

    // --- keyboard ---

    fn key(key: ScrollKey, shift: bool, link: &ScrollLink) -> Vec2 {
        key_scroll_delta(key, shift, link)
    }

    #[test]
    fn arrows_step_an_eighth_of_a_page_and_page_keys_a_whole_page() {
        let target = link(ranges(300.0, 3000.0), Vec2::new(100.0, 1000.0));
        assert_eq!(
            key(ScrollKey::ArrowDown, false, &target),
            Vec2::new(0.0, 100.0)
        );
        assert_eq!(
            key(ScrollKey::ArrowUp, false, &target),
            Vec2::new(0.0, -100.0)
        );
        assert_eq!(
            key(ScrollKey::ArrowRight, false, &target),
            Vec2::new(50.0, 0.0)
        );
        assert_eq!(
            key(ScrollKey::ArrowLeft, false, &target),
            Vec2::new(-50.0, 0.0)
        );
        assert_eq!(
            key(ScrollKey::PageDown, false, &target),
            Vec2::new(0.0, 800.0)
        );
        assert_eq!(
            key(ScrollKey::PageUp, false, &target),
            Vec2::new(0.0, -800.0)
        );
    }

    #[test]
    fn an_assistive_scroll_moves_an_item_or_a_page_in_the_direction_asked() {
        assert_eq!(
            CLIENT,
            Vec2::new(400.0, 800.0),
            "the distances below are of this client"
        );
        let delta = |direction, unit| assistive_scroll_delta(direction, unit, CLIENT);
        assert_eq!(
            delta(ScrollDirection::Down, ScrollUnit::Item),
            Vec2::new(0.0, 100.0)
        );
        assert_eq!(
            delta(ScrollDirection::Up, ScrollUnit::Item),
            Vec2::new(0.0, -100.0)
        );
        assert_eq!(
            delta(ScrollDirection::Right, ScrollUnit::Item),
            Vec2::new(50.0, 0.0)
        );
        assert_eq!(
            delta(ScrollDirection::Left, ScrollUnit::Item),
            Vec2::new(-50.0, 0.0)
        );
        assert_eq!(
            delta(ScrollDirection::Down, ScrollUnit::Page),
            Vec2::new(0.0, 800.0)
        );
        assert_eq!(
            delta(ScrollDirection::Left, ScrollUnit::Page),
            Vec2::new(-400.0, 0.0)
        );
        // The keyboard's steps are the same distances.
        let target = link(ranges(300.0, 3000.0), Vec2::ZERO);
        assert_eq!(
            delta(ScrollDirection::Down, ScrollUnit::Item),
            key(ScrollKey::ArrowDown, false, &target)
        );
        assert_eq!(
            delta(ScrollDirection::Down, ScrollUnit::Page),
            key(ScrollKey::PageDown, false, &target)
        );
    }

    #[test]
    fn space_pages_down_and_shift_space_pages_up() {
        let target = link(ranges(0.0, 3000.0), Vec2::new(0.0, 1000.0));
        assert_eq!(key(ScrollKey::Space, false, &target), Vec2::new(0.0, 800.0));
        assert_eq!(key(ScrollKey::Space, true, &target), Vec2::new(0.0, -800.0));
        // Shift changes nothing for the other keys.
        assert_eq!(
            key(ScrollKey::PageDown, true, &target),
            Vec2::new(0.0, 800.0)
        );
    }

    #[test]
    fn home_and_end_go_to_the_physical_edges_for_both_directions() {
        let normal = link(ranges(0.0, 3000.0), Vec2::new(0.0, 1000.0));
        assert_eq!(
            key(ScrollKey::Home, false, &normal),
            Vec2::new(0.0, -1000.0)
        );
        assert_eq!(key(ScrollKey::End, false, &normal), Vec2::new(0.0, 2000.0));
        let reversed = link(
            ScrollRanges {
                x: ScrollRange::NONE,
                y: ScrollRange::new(3000.0, true),
            },
            Vec2::new(0.0, -1000.0),
        );
        // Home is the physical top, which is the far end of a reversed axis' range.
        assert_eq!(
            key(ScrollKey::Home, false, &reversed),
            Vec2::new(0.0, -2000.0)
        );
        assert_eq!(
            key(ScrollKey::End, false, &reversed),
            Vec2::new(0.0, 1000.0)
        );
    }

    #[test]
    fn a_key_scrolls_the_nearest_container_it_can_move() {
        let mut links = [
            link(ranges(0.0, 3000.0), Vec2::new(0.0, 3000.0)),
            link(ranges(0.0, 3000.0), Vec2::ZERO),
        ];
        // The inner container is at its bottom, so PageDown goes to its ancestor.
        let outcome = scroll_key(&mut links, ScrollKey::PageDown, false);
        assert!(outcome.moved);
        assert_eq!(outcome.link, Some(1));
        assert_eq!(outcome.moved_by, Vec2::new(0.0, 800.0));
        assert_eq!(links[0].offset.y, 3000.0);
        assert_eq!(links[1].offset.y, 800.0);
    }

    #[test]
    fn a_page_key_is_clamped_to_what_is_left() {
        let mut links = [link(ranges(0.0, 500.0), Vec2::ZERO)];
        let outcome = scroll_key(&mut links, ScrollKey::PageDown, false);
        assert_eq!(links[0].offset.y, 500.0);
        assert_eq!(outcome.moved_by, Vec2::new(0.0, 500.0));
    }

    #[test]
    fn vertical_keys_leave_a_horizontal_only_container_alone() {
        let mut links = [link(ranges(500.0, 0.0), Vec2::ZERO)];
        for pressed in [
            ScrollKey::ArrowDown,
            ScrollKey::PageDown,
            ScrollKey::Space,
            ScrollKey::End,
        ] {
            let outcome = scroll_key(&mut links, pressed, false);
            assert!(!outcome.moved, "{pressed:?}");
        }
        assert!(scroll_key(&mut links, ScrollKey::ArrowRight, false).moved);
        assert_eq!(links[0].offset.x, TICK_X_PX);
    }

    #[test]
    fn a_contained_container_keeps_the_key_from_its_ancestors() {
        let mut links = [
            contained(link(ranges(0.0, 3000.0), Vec2::new(0.0, 3000.0))),
            link(ranges(0.0, 3000.0), Vec2::ZERO),
        ];
        let outcome = scroll_key(&mut links, ScrollKey::PageDown, false);
        assert!(!outcome.moved);
        assert_eq!(links[1].offset.y, 0.0);
        assert!(!scroll_key(&mut [], ScrollKey::Home, false).moved);
    }

    // --- reveal ---

    #[test]
    fn revealing_scrolls_the_least_that_shows_the_target() {
        let client = Vec2::new(200.0, 100.0);
        // Already inside: nothing to do.
        assert_eq!(
            scroll_reveal_delta(Rect::new(10.0, 10.0, 50.0, 20.0), client),
            Vec2::ZERO
        );
        // Below and to the right: scroll just enough for its far edges.
        assert_eq!(
            scroll_reveal_delta(Rect::new(180.0, 90.0, 50.0, 30.0), client),
            Vec2::new(30.0, 20.0)
        );
        // Above and to the left: scroll back to its near edges.
        assert_eq!(
            scroll_reveal_delta(Rect::new(-40.0, -15.0, 20.0, 10.0), client),
            Vec2::new(-40.0, -15.0)
        );
        // Taller than the client: shows its far edge, as ensure_control_visible does.
        assert_eq!(
            scroll_reveal_delta(Rect::new(0.0, -10.0, 20.0, 300.0), client),
            Vec2::new(0.0, 190.0)
        );
    }

    // --- touch pan arbitration ---

    #[test]
    fn the_slop_is_euclidean_and_strict() {
        assert!(!exceeds_slop(Vec2::new(5.0, 6.0), 8.0), "7.8 px");
        assert!(
            !exceeds_slop(Vec2::new(8.0, 0.0), 8.0),
            "exactly the slop is still a hold"
        );
        assert!(exceeds_slop(Vec2::new(6.0, 6.0), 8.0), "8.49 px");
        assert!(exceeds_slop(Vec2::new(0.0, -9.0), 8.0));
        assert!(!exceeds_slop(Vec2::ZERO, TOUCH_SLOP_PX));
    }

    #[test]
    fn the_dominant_axis_is_the_larger_movement_and_ties_are_vertical() {
        assert_eq!(dominant_axis(Vec2::new(12.0, 3.0)), Axis::X);
        assert_eq!(dominant_axis(Vec2::new(-12.0, 3.0)), Axis::X);
        assert_eq!(dominant_axis(Vec2::new(3.0, -12.0)), Axis::Y);
        assert_eq!(dominant_axis(Vec2::new(9.0, 9.0)), Axis::Y);
        assert_eq!(dominant_axis(Vec2::ZERO), Axis::Y);
    }

    #[test]
    fn touch_action_values_allow_the_axes_css_says() {
        let allowed = |action: TouchAction| (action.allowed().x, action.allowed().y);
        assert_eq!(allowed(TouchAction::Auto), (true, true));
        assert_eq!(allowed(TouchAction::None), (false, false));
        assert_eq!(allowed(TouchAction::PanX), (true, false));
        assert_eq!(allowed(TouchAction::PanY), (false, true));
    }

    #[test]
    fn touch_actions_intersect() {
        let both = TouchAction::PanX
            .allowed()
            .intersect(TouchAction::PanY.allowed());
        assert_eq!(both, TouchAction::None.allowed());
        assert_eq!(
            TouchAction::Auto
                .allowed()
                .intersect(TouchAction::PanX.allowed()),
            TouchAction::PanX.allowed()
        );
        assert_eq!(
            TouchAction::PanY
                .allowed()
                .intersect(TouchAction::PanY.allowed()),
            TouchAction::PanY.allowed()
        );
    }

    fn candidate(touch_action: TouchAction, scroller: Option<PanScroller>) -> PanCandidate {
        PanCandidate {
            touch_action,
            scroller,
        }
    }

    fn scroller(x: f32, y: f32, offset: Vec2) -> Option<PanScroller> {
        Some(PanScroller {
            ranges: ranges(x, y),
            offset,
        })
    }

    #[test]
    fn a_vertical_pan_goes_to_the_nearest_container_that_can_scroll_that_way() {
        let path = [
            candidate(TouchAction::Auto, None),
            candidate(TouchAction::Auto, scroller(0.0, 500.0, Vec2::ZERO)),
            candidate(TouchAction::Auto, scroller(0.0, 500.0, Vec2::ZERO)),
        ];
        // Finger up (negative y) scrolls down, towards max.
        let owner = pan_owner(&path, Vec2::new(1.0, -20.0));
        assert_eq!(
            owner,
            Some(PanOwner {
                index: 1,
                allowed: PanAllowed::ALL
            })
        );
    }

    #[test]
    fn a_container_at_its_limit_in_the_pan_direction_hands_the_pan_outwards() {
        let path = [
            candidate(
                TouchAction::Auto,
                scroller(0.0, 500.0, Vec2::new(0.0, 500.0)),
            ),
            candidate(TouchAction::Auto, scroller(0.0, 500.0, Vec2::ZERO)),
        ];
        // Finger up: the inner one is at the bottom, the outer one scrolls.
        assert_eq!(
            pan_owner(&path, Vec2::new(0.0, -20.0)).map(|owner| owner.index),
            Some(1)
        );
        // Finger down: the inner one can still scroll back up.
        assert_eq!(
            pan_owner(&path, Vec2::new(0.0, 20.0)).map(|owner| owner.index),
            Some(0)
        );
    }

    #[test]
    fn nothing_scrolls_that_way_means_no_pan() {
        let path = [candidate(
            TouchAction::Auto,
            scroller(0.0, 500.0, Vec2::ZERO),
        )];
        // A horizontal swipe over a vertical-only container.
        assert_eq!(pan_owner(&path, Vec2::new(-20.0, 2.0)), None);
        // Finger down at the top: nothing above.
        assert_eq!(pan_owner(&path, Vec2::new(0.0, 20.0)), None);
        assert_eq!(pan_owner(&[], Vec2::new(0.0, 20.0)), None);
    }

    #[test]
    fn touch_action_none_keeps_the_touch_for_the_element() {
        let path = [
            candidate(TouchAction::None, None),
            candidate(TouchAction::Auto, scroller(0.0, 500.0, Vec2::ZERO)),
        ];
        assert_eq!(pan_owner(&path, Vec2::new(0.0, -20.0)), None);
    }

    #[test]
    fn touch_action_applies_along_the_path_up_to_the_owner_only() {
        // pan-y on the target and a scroller above it with auto: vertical pans, horizontal does not.
        let path = [
            candidate(TouchAction::PanY, None),
            candidate(TouchAction::Auto, scroller(500.0, 500.0, Vec2::ZERO)),
        ];
        let owner = pan_owner(&path, Vec2::new(0.0, -20.0));
        assert_eq!(
            owner,
            Some(PanOwner {
                index: 1,
                allowed: TouchAction::PanY.allowed()
            })
        );
        assert_eq!(pan_owner(&path, Vec2::new(-20.0, 0.0)), None);
        // Restrictions above the owner do not matter: the owner pans before they are reached.
        let path = [
            candidate(TouchAction::Auto, scroller(0.0, 500.0, Vec2::ZERO)),
            candidate(TouchAction::None, None),
        ];
        assert_eq!(
            pan_owner(&path, Vec2::new(0.0, -20.0)).map(|owner| owner.index),
            Some(0)
        );
    }

    #[test]
    fn restrictions_accumulate_when_the_pan_chains_to_an_outer_container() {
        let path = [
            candidate(
                TouchAction::Auto,
                scroller(0.0, 500.0, Vec2::new(0.0, 500.0)),
            ),
            candidate(TouchAction::PanX, scroller(0.0, 500.0, Vec2::ZERO)),
        ];
        // The inner container is at its bottom; the outer one forbids vertical panning.
        assert_eq!(pan_owner(&path, Vec2::new(0.0, -20.0)), None);
    }

    #[test]
    fn a_horizontal_pan_uses_the_horizontal_range_and_sign() {
        let path = [candidate(
            TouchAction::Auto,
            scroller(300.0, 0.0, Vec2::new(300.0, 0.0)),
        )];
        // Finger moved right: content follows, so the offset shrinks; it can.
        assert_eq!(
            pan_owner(&path, Vec2::new(20.0, 3.0)).map(|owner| owner.index),
            Some(0)
        );
        // Finger moved left needs room towards max, and there is none.
        assert_eq!(pan_owner(&path, Vec2::new(-20.0, 3.0)), None);
    }

    #[test]
    fn a_reversed_container_pans_towards_minus_range() {
        let reversed = Some(PanScroller {
            ranges: ScrollRanges {
                x: ScrollRange::NONE,
                y: ScrollRange::new(300.0, true),
            },
            offset: Vec2::ZERO,
        });
        let path = [candidate(TouchAction::Auto, reversed)];
        // At offset 0 a reversed axis can only go down to -range: finger down scrolls that way.
        assert_eq!(
            pan_owner(&path, Vec2::new(0.0, 20.0)).map(|owner| owner.index),
            Some(0)
        );
        assert_eq!(pan_owner(&path, Vec2::new(0.0, -20.0)), None);
    }

    // --- momentum ---

    #[test]
    fn the_velocity_is_the_movement_of_the_last_frame_with_motion() {
        let mut tracker = VelocityTracker::new();
        tracker.motion(Vec2::new(0.0, 10.0));
        tracker.frame(FRAME_S);
        assert_eq!(tracker.release(), Vec2::new(0.0, 10.0 / FRAME_S));
        // Two movements inside one frame add up.
        tracker.motion(Vec2::new(0.0, 4.0));
        tracker.motion(Vec2::new(0.0, 2.0));
        tracker.frame(FRAME_S);
        assert_eq!(tracker.release(), Vec2::new(0.0, 6.0 / FRAME_S));
    }

    #[test]
    fn the_velocity_is_kept_until_the_finger_has_been_still_for_a_tenth_of_a_second() {
        let mut tracker = VelocityTracker::new();
        tracker.motion(Vec2::new(0.0, 10.0));
        tracker.frame(FRAME_S);
        let flick = tracker.release();
        assert_ne!(flick, Vec2::ZERO);
        // Still for 90 ms: the last sample stands.
        let mut elapsed = 0.0;
        while elapsed + FRAME_S <= 0.09 {
            tracker.frame(FRAME_S);
            elapsed += FRAME_S;
        }
        assert_eq!(tracker.release(), flick);
        // Past 100 ms the sampler sees no movement and the flick is gone.
        for _ in 0..3 {
            tracker.frame(FRAME_S);
        }
        assert_eq!(tracker.release(), Vec2::ZERO);
    }

    #[test]
    fn a_non_positive_frame_time_is_not_a_frame() {
        let mut tracker = VelocityTracker::new();
        tracker.motion(Vec2::new(5.0, 0.0));
        tracker.frame(0.0);
        tracker.frame(-1.0);
        assert_eq!(tracker.release(), Vec2::ZERO);
        tracker.frame(FRAME_S);
        assert_eq!(tracker.release(), Vec2::new(5.0 / FRAME_S, 0.0));
    }

    fn coast(state: &mut ScrollState, ranges: &ScrollRanges) -> usize {
        let mut frames = 0;
        loop {
            frames += 1;
            if momentum_step(state, ranges, FRAME_S).finished {
                return frames;
            }
            assert!(frames < 10_000, "momentum never terminated");
        }
    }

    #[test]
    fn a_flick_decelerates_to_a_stop() {
        let mut state = ScrollState {
            offset: Vec2::new(0.0, 100.0),
            velocity: Vec2::new(0.0, 500.0),
        };
        let frames = coast(&mut state, &ranges(0.0, 10_000.0));
        // 500 px/s losing 1000 px/s per second lasts half a second and covers v^2 / (2a) = 125 px
        // (a little more here: each frame moves by the speed it started with).
        assert!((29..=32).contains(&frames), "{frames} frames");
        let travelled = state.offset.y - 100.0;
        assert!(
            (120.0..=135.0).contains(&travelled),
            "travelled {travelled}"
        );
        assert_eq!(state.velocity, Vec2::ZERO);
    }

    #[test]
    fn a_flick_stops_at_the_limit_it_runs_into() {
        let mut state = ScrollState {
            offset: Vec2::new(0.0, 90.0),
            velocity: Vec2::new(0.0, 2000.0),
        };
        // 33 px of flick would carry it past the limit 10 px away, so this frame ends it there.
        let step = momentum_step(&mut state, &ranges(0.0, 100.0), FRAME_S);
        assert_eq!(state.offset.y, 100.0);
        assert_eq!(step.moved_by, Vec2::new(0.0, 10.0));
        assert!(step.finished);
        assert_eq!(state.velocity, Vec2::ZERO);
    }

    #[test]
    fn a_flick_towards_the_start_clamps_at_zero_and_a_reversed_axis_at_its_own_limits() {
        let mut state = ScrollState {
            offset: Vec2::new(0.0, 5.0),
            velocity: Vec2::new(0.0, -3000.0),
        };
        assert!(momentum_step(&mut state, &ranges(0.0, 100.0), FRAME_S).finished);
        assert_eq!(state.offset.y, 0.0);

        let reversed = ScrollRanges {
            x: ScrollRange::NONE,
            y: ScrollRange::new(100.0, true),
        };
        let mut state = ScrollState {
            offset: Vec2::new(0.0, -95.0),
            velocity: Vec2::new(0.0, -3000.0),
        };
        assert!(momentum_step(&mut state, &reversed, FRAME_S).finished);
        assert_eq!(state.offset.y, -100.0);
        let mut state = ScrollState {
            offset: Vec2::new(0.0, -40.0),
            velocity: Vec2::new(0.0, 3000.0),
        };
        assert!(momentum_step(&mut state, &reversed, FRAME_S).finished);
        assert_eq!(state.offset.y, 0.0, "a reversed axis tops out at 0");
    }

    #[test]
    fn landing_exactly_on_a_limit_does_not_stop_the_flick_until_it_would_pass_it() {
        // The engine's comparisons are strict, so a frame that ends exactly on the limit goes on
        // (0.05 s at 200 px/s is exactly the 10 px left).
        let range = ranges(0.0, 100.0);
        let mut state = ScrollState {
            offset: Vec2::new(0.0, 90.0),
            velocity: Vec2::new(0.0, 200.0),
        };
        let step = momentum_step(&mut state, &range, 0.05);
        assert_eq!(state.offset.y, 100.0);
        assert!(!step.finished, "exactly on the limit is not past it");
        assert!(state.velocity.y > 0.0);
        let step = momentum_step(&mut state, &range, 0.05);
        assert_eq!(state.offset.y, 100.0);
        assert!(step.finished, "the next frame would pass it");
    }

    #[test]
    fn the_two_axes_coast_independently_and_the_flick_ends_with_the_last() {
        let mut state = ScrollState {
            offset: Vec2::new(10.0, 10.0),
            velocity: Vec2::new(100.0, 800.0),
        };
        let range = ranges(10_000.0, 10_000.0);
        let mut x_rested_at = None;
        let mut frame = 0;
        loop {
            frame += 1;
            let step = momentum_step(&mut state, &range, FRAME_S);
            match x_rested_at {
                // The stopped axis must not creep back (the engine's sign quirk).
                Some(resting) => assert_eq!(state.offset.x, resting, "frame {frame}"),
                None if state.velocity.x == 0.0 => x_rested_at = Some(state.offset.x),
                None => {}
            }
            if step.finished {
                break;
            }
            assert!(frame < 1000, "momentum never terminated");
        }
        // 100 px/s is gone after a tenth of a second; 800 px/s takes eight times as long and covers
        // v^2 / (2a) = 320 px.
        assert!(x_rested_at.is_some(), "the slower axis stopped first");
        assert!(frame > 40, "{frame} frames");
        assert!(
            (325.0..=345.0).contains(&state.offset.y),
            "y {}",
            state.offset.y
        );
    }

    #[test]
    fn no_velocity_finishes_at_once() {
        let mut state = ScrollState::default();
        let step = momentum_step(&mut state, &ranges(100.0, 100.0), FRAME_S);
        assert!(step.finished);
        assert_eq!(step.moved_by, Vec2::ZERO);
    }

    #[test]
    fn momentum_terminates_for_any_start_speed() {
        for speed in [1.0_f32, 17.0, 250.0, 4_000.0, 90_000.0] {
            for direction in [-1.0_f32, 1.0] {
                let mut state = ScrollState {
                    offset: Vec2::new(0.0, 500.0),
                    velocity: Vec2::new(0.0, direction * speed),
                };
                coast(&mut state, &ranges(0.0, 1000.0));
                assert!((0.0..=1000.0).contains(&state.offset.y));
            }
        }
    }

    // --- scrollbars ---

    fn thumb_of(bar: Option<Scrollbar>) -> Rect {
        bar.expect("scrollbar present").thumb
    }

    #[test]
    fn only_a_scrollable_axis_gets_a_bar() {
        let bars = scrollbars(Vec2::new(400.0, 300.0), &ranges(0.0, 300.0), Vec2::ZERO);
        assert!(bars.x.is_none());
        assert!(bars.y.is_some());
        assert_eq!(
            scrollbars(CLIENT, &ScrollRanges::NONE, Vec2::ZERO),
            Scrollbars::default()
        );
    }

    #[test]
    fn a_vertical_thumb_sits_on_the_right_edge_and_is_the_visible_share_of_the_track() {
        // Client 400 x 300 with 300 more to scroll: half the content is visible.
        let client = Vec2::new(400.0, 300.0);
        let bars = scrollbars(client, &ranges(0.0, 300.0), Vec2::ZERO);
        let bar = bars.y.expect("vertical bar");
        let track_length = 300.0 - 2.0 * SCROLLBAR_MARGIN_PX;
        assert_eq!(
            bar.track,
            Rect::new(
                400.0 - SCROLLBAR_MARGIN_PX - SCROLLBAR_THICKNESS_PX,
                SCROLLBAR_MARGIN_PX,
                SCROLLBAR_THICKNESS_PX,
                track_length
            )
        );
        assert_eq!(
            bar.thumb.size,
            Vec2::new(SCROLLBAR_THICKNESS_PX, track_length / 2.0)
        );
        assert_eq!(
            bar.thumb.origin,
            Vec2::new(bar.track.origin.x, SCROLLBAR_MARGIN_PX)
        );
        // Scrolled to the end, the thumb touches the end of the track.
        let end = thumb_of(scrollbars(client, &ranges(0.0, 300.0), Vec2::new(0.0, 300.0)).y);
        assert_eq!(end.end(Axis::Y), bar.track.end(Axis::Y));
        // Halfway, it is centred in the room it has.
        let middle = thumb_of(scrollbars(client, &ranges(0.0, 300.0), Vec2::new(0.0, 150.0)).y);
        assert_eq!(
            middle.origin.y,
            SCROLLBAR_MARGIN_PX + (track_length - middle.size.y) / 2.0
        );
    }

    #[test]
    fn a_horizontal_thumb_sits_on_the_bottom_edge() {
        let client = Vec2::new(300.0, 200.0);
        let bar = scrollbars(client, &ranges(900.0, 0.0), Vec2::new(450.0, 0.0))
            .x
            .expect("horizontal bar");
        assert_eq!(
            bar.track.origin.y,
            200.0 - SCROLLBAR_MARGIN_PX - SCROLLBAR_THICKNESS_PX
        );
        assert_eq!(
            bar.track.size,
            Vec2::new(300.0 - 2.0 * SCROLLBAR_MARGIN_PX, SCROLLBAR_THICKNESS_PX)
        );
        // A quarter of the content is visible and the offset is the middle of the range.
        let length = 300.0 - 2.0 * SCROLLBAR_MARGIN_PX;
        assert_eq!(bar.thumb.size.x, (length / 4.0).max(SCROLLBAR_MIN_THUMB_PX));
        assert_eq!(
            bar.thumb.origin.x,
            SCROLLBAR_MARGIN_PX + (length - bar.thumb.size.x) / 2.0
        );
    }

    #[test]
    fn the_thumb_never_gets_smaller_than_the_minimum_or_larger_than_its_track() {
        let tiny = thumb_of(
            scrollbars(
                Vec2::new(400.0, 300.0),
                &ranges(0.0, 1_000_000.0),
                Vec2::ZERO,
            )
            .y,
        );
        assert_eq!(tiny.size.y, SCROLLBAR_MIN_THUMB_PX);
        // A track shorter than the minimum thumb is filled by the thumb.
        let short = scrollbars(Vec2::new(400.0, 20.0), &ranges(0.0, 100.0), Vec2::ZERO)
            .y
            .expect("bar");
        assert_eq!(short.thumb.size.y, short.track.size.y);
        // Even a client smaller than the margins gives a valid, empty bar.
        let squeezed = scrollbars(Vec2::new(400.0, 3.0), &ranges(0.0, 100.0), Vec2::ZERO)
            .y
            .expect("bar");
        assert_eq!(squeezed.track.size.y, 0.0);
        assert_eq!(squeezed.thumb.size.y, 0.0);
    }

    #[test]
    fn both_bars_leave_the_corner_free() {
        let client = Vec2::new(400.0, 300.0);
        let bars = scrollbars(client, &ranges(400.0, 300.0), Vec2::ZERO);
        let (x, y) = (bars.x.expect("x"), bars.y.expect("y"));
        let corner = SCROLLBAR_THICKNESS_PX + SCROLLBAR_MARGIN_PX;
        assert_eq!(x.track.size.x, 400.0 - 2.0 * SCROLLBAR_MARGIN_PX - corner);
        assert_eq!(y.track.size.y, 300.0 - 2.0 * SCROLLBAR_MARGIN_PX - corner);
        assert!(
            x.track.end(Axis::X) <= y.track.start(Axis::X),
            "no overlap in x"
        );
        assert!(
            y.track.end(Axis::Y) <= x.track.start(Axis::Y),
            "no overlap in y"
        );
    }

    #[test]
    fn a_reversed_axis_starts_with_its_thumb_at_the_far_end() {
        let client = Vec2::new(400.0, 300.0);
        let reversed = ScrollRanges {
            x: ScrollRange::NONE,
            y: ScrollRange::new(300.0, true),
        };
        let at_origin = scrollbars(client, &reversed, Vec2::ZERO).y.expect("bar");
        assert_eq!(at_origin.thumb.end(Axis::Y), at_origin.track.end(Axis::Y));
        let scrolled = scrollbars(client, &reversed, Vec2::new(0.0, -300.0))
            .y
            .expect("bar");
        assert_eq!(scrolled.thumb.start(Axis::Y), scrolled.track.start(Axis::Y));
    }

    #[test]
    fn a_press_is_classified_as_thumb_or_track_side() {
        let client = Vec2::new(400.0, 300.0);
        let bar = scrollbars(client, &ranges(0.0, 300.0), Vec2::new(0.0, 100.0))
            .y
            .expect("bar");
        let x = bar.track.origin.x + 1.0;
        let thumb = bar.thumb;
        assert_eq!(
            bar.hit(Vec2::new(x, thumb.origin.y + 1.0)),
            Some(ScrollbarHit::Thumb)
        );
        assert_eq!(
            bar.hit(Vec2::new(x, thumb.end(Axis::Y) - 1.0)),
            Some(ScrollbarHit::Thumb)
        );
        assert_eq!(
            bar.hit(Vec2::new(x, thumb.origin.y - 1.0)),
            Some(ScrollbarHit::TrackBefore)
        );
        assert_eq!(
            bar.hit(Vec2::new(x, thumb.end(Axis::Y) + 1.0)),
            Some(ScrollbarHit::TrackAfter)
        );
        assert_eq!(
            bar.hit(Vec2::new(x - 20.0, thumb.origin.y + 1.0)),
            None,
            "beside the bar"
        );
        assert_eq!(bar.hit(Vec2::new(x, -1.0)), None, "above the track");
    }

    #[test]
    fn dragging_the_thumb_moves_the_offset_in_proportion_to_the_room_it_has() {
        let client = Vec2::new(400.0, 300.0);
        let range = ranges(0.0, 300.0);
        let bar = scrollbars(client, &range, Vec2::ZERO).y.expect("bar");
        let travel = bar.track.size.y - bar.thumb.size.y;
        let press = Vec2::new(bar.thumb.origin.x + 2.0, bar.thumb.origin.y + 5.0);
        let drag = ThumbDrag::begin(bar, press, 0.0);
        assert_eq!(drag.offset_at(press), 0.0);
        // Half the thumb's room is half the range.
        let half = Vec2::new(press.x + 30.0, press.y + travel / 2.0);
        assert!((drag.offset_at(half) - 150.0).abs() < 0.001);
        // The whole room, and beyond it, stop at the range's end; the other way at its start.
        assert_eq!(drag.offset_at(Vec2::new(press.x, press.y + travel)), 300.0);
        assert_eq!(
            drag.offset_at(Vec2::new(press.x, press.y + 10_000.0)),
            300.0
        );
        assert_eq!(drag.offset_at(Vec2::new(press.x, press.y - 10_000.0)), 0.0);
    }

    #[test]
    fn dragging_starts_from_where_the_content_is_scrolled_not_from_the_thumb_centre() {
        let client = Vec2::new(400.0, 300.0);
        let range = ranges(0.0, 300.0);
        let bar = scrollbars(client, &range, Vec2::new(0.0, 100.0))
            .y
            .expect("bar");
        let travel = bar.track.size.y - bar.thumb.size.y;
        let press = Vec2::new(bar.thumb.origin.x, bar.thumb.origin.y + 3.0);
        let drag = ThumbDrag::begin(bar, press, 100.0);
        assert!(
            (drag.offset_at(press) - 100.0).abs() < 0.001,
            "no jump on press"
        );
        let moved = Vec2::new(press.x, press.y + travel / 3.0);
        assert!((drag.offset_at(moved) - 200.0).abs() < 0.01);
    }

    #[test]
    fn dragging_a_reversed_thumb_moves_towards_minus_range() {
        let client = Vec2::new(400.0, 300.0);
        let reversed = ScrollRanges {
            x: ScrollRange::NONE,
            y: ScrollRange::new(300.0, true),
        };
        let bar = scrollbars(client, &reversed, Vec2::ZERO).y.expect("bar");
        let travel = bar.track.size.y - bar.thumb.size.y;
        let press = Vec2::new(bar.thumb.origin.x, bar.thumb.origin.y + 1.0);
        let drag = ThumbDrag::begin(bar, press, 0.0);
        // Dragging the thumb up the track scrolls to the reversed axis' far content.
        assert!((drag.offset_at(Vec2::new(press.x, press.y - travel / 2.0)) + 150.0).abs() < 0.001);
        assert_eq!(drag.offset_at(Vec2::new(press.x, press.y - travel)), -300.0);
        assert_eq!(drag.offset_at(Vec2::new(press.x, press.y + 50.0)), 0.0);
    }

    #[test]
    fn a_thumb_that_fills_its_track_cannot_be_dragged() {
        let client = Vec2::new(400.0, 20.0);
        let range = ranges(0.0, 100.0);
        let bar = scrollbars(client, &range, Vec2::new(0.0, 40.0))
            .y
            .expect("bar");
        let press = Vec2::new(bar.thumb.origin.x, bar.thumb.origin.y + 1.0);
        let drag = ThumbDrag::begin(bar, press, 40.0);
        assert_eq!(drag.offset_at(Vec2::new(press.x, press.y + 500.0)), 40.0);
    }

    // --- autoscroll ---

    const VIEWPORT: Rect = Rect::new(100.0, 100.0, 300.0, 200.0);

    fn auto(pointer: Vec2, ranges: ScrollRanges, offset: Vec2) -> Vec2 {
        autoscroll_velocity(pointer, VIEWPORT, &ranges, offset)
    }

    #[test]
    fn auto_scroll_is_zero_away_from_the_edges() {
        let middle = Vec2::new(250.0, 200.0);
        assert_eq!(
            auto(middle, ranges(500.0, 500.0), Vec2::new(10.0, 10.0)),
            Vec2::ZERO
        );
        // Exactly the edge distance in is outside the ramp.
        let at_ramp_start = Vec2::new(100.0 + AUTOSCROLL_EDGE_PX, 200.0);
        assert_eq!(
            auto(at_ramp_start, ranges(500.0, 500.0), Vec2::new(10.0, 10.0)).x,
            0.0
        );
    }

    #[test]
    fn auto_scroll_ramps_up_towards_the_edge_and_points_at_it() {
        let range = ranges(500.0, 500.0);
        let offset = Vec2::new(100.0, 100.0);
        // Top edge: full speed upwards on the edge itself, half at half the zone.
        assert_eq!(
            auto(Vec2::new(250.0, 100.0), range, offset),
            Vec2::new(0.0, -AUTOSCROLL_SPEED_PX_PER_SECOND)
        );
        assert_eq!(
            auto(
                Vec2::new(250.0, 100.0 + AUTOSCROLL_EDGE_PX / 2.0),
                range,
                offset
            )
            .y,
            -AUTOSCROLL_SPEED_PX_PER_SECOND / 2.0
        );
        // Bottom and right edges scroll towards max.
        assert_eq!(
            auto(Vec2::new(250.0, 300.0), range, offset).y,
            AUTOSCROLL_SPEED_PX_PER_SECOND
        );
        assert_eq!(
            auto(Vec2::new(400.0, 200.0), range, offset).x,
            AUTOSCROLL_SPEED_PX_PER_SECOND
        );
        assert_eq!(
            auto(Vec2::new(100.0, 200.0), range, offset).x,
            -AUTOSCROLL_SPEED_PX_PER_SECOND
        );
        // A corner scrolls both axes.
        assert_eq!(
            auto(Vec2::new(400.0, 300.0), range, offset),
            Vec2::new(
                AUTOSCROLL_SPEED_PX_PER_SECOND,
                AUTOSCROLL_SPEED_PX_PER_SECOND
            )
        );
    }

    #[test]
    fn auto_scroll_does_not_push_a_container_that_cannot_move_that_way() {
        // At the top already: the top edge does nothing, the bottom edge still scrolls.
        let range = ranges(0.0, 500.0);
        assert_eq!(auto(Vec2::new(250.0, 100.0), range, Vec2::ZERO), Vec2::ZERO);
        assert_eq!(
            auto(Vec2::new(250.0, 300.0), range, Vec2::ZERO).y,
            AUTOSCROLL_SPEED_PX_PER_SECOND
        );
        // No horizontal range: the left edge does nothing at all.
        assert_eq!(auto(Vec2::new(100.0, 200.0), range, Vec2::ZERO), Vec2::ZERO);
        // A reversed axis at offset 0 can only go up (towards -range).
        let reversed = ScrollRanges {
            x: ScrollRange::NONE,
            y: ScrollRange::new(500.0, true),
        };
        assert_eq!(
            auto(Vec2::new(250.0, 300.0), reversed, Vec2::ZERO),
            Vec2::ZERO
        );
        assert_eq!(
            auto(Vec2::new(250.0, 100.0), reversed, Vec2::ZERO).y,
            -AUTOSCROLL_SPEED_PX_PER_SECOND
        );
    }

    #[test]
    fn auto_scroll_only_applies_inside_the_viewport() {
        let range = ranges(500.0, 500.0);
        assert_eq!(
            auto(Vec2::new(250.0, 99.0), range, Vec2::new(0.0, 100.0)),
            Vec2::ZERO
        );
        assert_eq!(auto(Vec2::new(401.0, 200.0), range, Vec2::ZERO), Vec2::ZERO);
    }

    #[test]
    fn auto_scroll_picks_the_nearer_edge_of_a_tiny_viewport() {
        let tiny = Rect::new(0.0, 0.0, 40.0, 40.0);
        let range = ranges(0.0, 500.0);
        let near_bottom =
            autoscroll_velocity(Vec2::new(20.0, 30.0), tiny, &range, Vec2::new(0.0, 100.0));
        assert!(near_bottom.y > 0.0);
        let near_top =
            autoscroll_velocity(Vec2::new(20.0, 10.0), tiny, &range, Vec2::new(0.0, 100.0));
        assert!(near_top.y < 0.0);
    }
}
