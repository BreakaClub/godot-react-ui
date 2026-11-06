//! Scrolling in the mounted tree (plan section 3.16): the glue between the Godot-free scroll math
//! (`scroll.rs`, `pan.rs`) and the mounted tree, the render tree and the event queue.
//!
//! A scroll container's offset is per-tag state (`MountedNode::scroll`). Changing it moves one canvas
//! item (the `scroll` item's transform), redraws the overlay scrollbars, queues a coalesced `scroll`
//! event and re-finds what is under the pointer. It never touches Taffy, a computed style or React:
//! nothing is laid out, restyled or re-recorded because content scrolled.
//!
//! The entry points are the wheel (`pointer_input.rs`), the keyboard (`keyboard_input.rs`), touch pans
//! and scrollbar thumb drags (`pointer_input.rs`), momentum (`process`), the commands JS calls
//! (`scroll_to`, `scroll_by`, `scroll_into_view`) and focus. All of them end in [`ReactUiRoot::scrolled`].

use std::collections::{BTreeMap, BTreeSet};

use godot::classes::StyleBoxFlat;
use godot::prelude::*;
use serde_json::{Value, json};

use crate::diff::Parent;
use crate::events::ScrollData;
use crate::paint::parse_color;
use crate::pan::PanGesture;
use crate::props::{OverscrollBehaviorSpec, TouchActionSpec};
use crate::render_tree::{DEFAULT_SCROLLBAR_COLOR, OverlayKey, SCROLLBAR_THUMB_RADIUS_PX};
use crate::scroll::{
    Axis, OverscrollBehavior, PanAllowed, PanCandidate, PanOwner, PanScroller, Rect, ScrollInput,
    ScrollKey, ScrollLink, ScrollRanges, ScrollState, Scrollbar, ScrollbarHit, ThumbDrag,
    TouchAction, Vec2, dominant_axis, momentum_step, pan_owner, scroll_chain, scroll_key,
    scroll_reveal_delta,
};
use crate::{ReactUiRoot, event_time_ms};

pub(crate) fn to_scroll(value: Vector2) -> Vec2 {
    Vec2::new(value.x, value.y)
}

pub(crate) fn to_vector(value: Vec2) -> Vector2 {
    Vector2::new(value.x, value.y)
}

/// A touch that went down on an element and may turn into a pan (plan 3.12 rule 4).
pub(crate) struct TouchPan {
    pub(crate) gesture: PanGesture,
    /// The element the finger went down on: the pan path starts here.
    target: u32,
    /// The scroll container that owns the pan, once it has started.
    owner: Option<u32>,
}

/// A scrollbar thumb the mouse is dragging.
pub(crate) struct ThumbGrab {
    tag: u32,
    axis: Axis,
    drag: ThumbDrag,
}

/// Everything scrolling keeps beside the per-tag offsets.
#[derive(Default)]
pub(crate) struct ScrollInputState {
    /// Containers that are still coasting after a flick, with a non-zero velocity.
    pub(crate) coasting: BTreeSet<u32>,
    /// Touches that may become, or are, pans, by pointer id.
    pub(crate) pans: BTreeMap<u32, TouchPan>,
    /// The thumb the primary mouse button is dragging.
    pub(crate) thumb: Option<ThumbGrab>,
    /// Touches that went down while a flick was coasting. They stopped it and do not click, as a tap
    /// that stops a fling does not in browsers.
    pub(crate) stopped_flings: BTreeSet<u32>,
}

impl ScrollInputState {
    /// Whether a frame is needed for scrolling: a flick coasts, or a finger that is panning needs its
    /// release velocity sampled. This is the scrolling half of the root's one `process()` decision.
    pub(crate) fn wants_frames(&self) -> bool {
        !self.coasting.is_empty() || self.pans.values().any(|pan| pan.gesture.owner().is_some())
    }
}

fn overscroll_of(spec: Option<OverscrollBehaviorSpec>) -> OverscrollBehavior {
    match spec {
        Some(OverscrollBehaviorSpec::Contain) => OverscrollBehavior::Contain,
        Some(OverscrollBehaviorSpec::Auto) | None => OverscrollBehavior::Auto,
    }
}

fn touch_action_of(spec: Option<TouchActionSpec>) -> TouchAction {
    match spec {
        Some(TouchActionSpec::None) => TouchAction::None,
        Some(TouchActionSpec::PanX) => TouchAction::PanX,
        Some(TouchActionSpec::PanY) => TouchAction::PanY,
        Some(TouchActionSpec::Auto) | None => TouchAction::Auto,
    }
}

impl ReactUiRoot {
    /// The scroll containers that could take a scroll aimed at `start`: `start` and its paint
    /// ancestors (the containing-block chain, which is what scrolls an element), innermost first. A
    /// container with nothing to scroll on either axis is left out: it neither moves nor, whatever
    /// its `overscroll-behavior`, keeps the scroll from reaching the container behind it.
    fn scroll_path(&self, start: u32) -> Vec<u32> {
        let mut path = Vec::new();
        let mut current = Some(start);
        while let Some(tag) = current {
            let Some(node) = self.mounted.nodes.get(&tag) else {
                break;
            };
            let ranges = node.geometry.scroll_ranges;
            if node.is_scroll_container() && (ranges.x.is_scrollable() || ranges.y.is_scrollable())
            {
                path.push(tag);
            }
            current = match node.paint_parent {
                Some(Parent::Node(parent)) => Some(parent),
                Some(Parent::Layer(_)) | None => None,
            };
        }
        path
    }

    fn scroll_link(&self, tag: u32) -> Option<ScrollLink> {
        let node = self.mounted.nodes.get(&tag)?;
        let client = node.geometry.padding_box();
        Some(ScrollLink {
            client: Vec2::new(client.width, client.height),
            ranges: node.geometry.scroll_ranges,
            offset: node.scroll.offset,
            overscroll: overscroll_of(node.computed.overscroll_behavior),
        })
    }

    /// The containers of `scroll_path(start)` with their links, innermost first.
    fn scroll_links(&self, start: u32) -> (Vec<u32>, Vec<ScrollLink>) {
        self.scroll_path(start)
            .into_iter()
            .filter_map(|tag| self.scroll_link(tag).map(|link| (tag, link)))
            .unzip()
    }

    /// Write the offsets a chain computed back into the containers it moved and report them. Returns
    /// the containers whose offset changed.
    fn adopt_links(&mut self, tags: &[u32], links: &[ScrollLink]) -> Vec<u32> {
        let mut moved = Vec::new();
        for (tag, link) in tags.iter().zip(links) {
            let Some(node) = self.mounted.nodes.get_mut(tag) else {
                continue;
            };
            if node.scroll.offset != link.offset {
                node.scroll.offset = link.offset;
                // Anything that scrolls it by hand ends a flick it was still coasting through.
                node.scroll.stop_momentum();
                self.scrolling.coasting.remove(tag);
                moved.push(*tag);
            }
        }
        moved
    }

    /// Scroll for a wheel tick or pan gesture aimed at the element under the pointer: each container
    /// from the innermost out takes what it can and the rest goes to the next one (`overscroll-behavior:
    /// contain` ends the chain). Returns whether the scroll was taken, which decides whether the
    /// engine's event is consumed (plan 3.11): a container moved, or one with `contain` kept the
    /// scroll it could not take, so that it does not reach the game behind it either.
    pub(crate) fn scroll_chain_from(&mut self, start: Option<u32>, input: ScrollInput) -> bool {
        let Some(start) = start else {
            return false;
        };
        let (tags, mut links) = self.scroll_links(start);
        if links.is_empty() {
            return false;
        }
        let outcome = scroll_chain(&mut links, input);
        let moved = self.adopt_links(&tags, &links);
        self.scrolled(&moved);
        outcome.moved || outcome.stopped_by.is_some()
    }

    /// A key scrolls the first container, from the focused element outwards, that it can move.
    pub(crate) fn scroll_by_key(&mut self, focused: u32, key: ScrollKey, shift: bool) -> bool {
        let (tags, mut links) = self.scroll_links(focused);
        if links.is_empty() {
            return false;
        }
        let outcome = scroll_key(&mut links, key, shift);
        let moved = self.adopt_links(&tags, &links);
        self.scrolled(&moved);
        outcome.moved
    }

    /// One or more containers' offsets changed because of input, a command or a flick: move their
    /// content, redraw their bars, queue their `scroll` events, then re-find what is under a mouse
    /// that did not move and keep the focus ring on its element.
    pub(crate) fn scrolled(&mut self, tags: &[u32]) {
        if tags.is_empty() {
            return;
        }
        for tag in tags {
            self.scroll_changed(*tag);
        }
        if self.pointer_known {
            let hit = self.mounted.hit_test(self.pointer);
            self.update_hover(hit);
        }
        self.update_focus_ring();
    }

    /// The part of a scroll that belongs to the container alone (`scrolled` does the rest once per
    /// input): the item's transform, the bars and the event. Also what a layout re-clamp does.
    fn scroll_changed(&mut self, tag: u32) {
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return;
        };
        let offset = to_vector(node.scroll.offset);
        node.render.set_scroll_offset(offset);
        self.stats.scroll_updates += 1;
        self.hit_stale = true;
        self.paint_scroll_overlay(tag);
        self.queue_scroll_event(tag);
    }

    fn scroll_data(&self, tag: u32) -> Option<ScrollData> {
        let node = self.mounted.nodes.get(&tag)?;
        node.is_scroll_container().then_some(())?;
        let client = node.geometry.padding_box();
        let ranges = node.geometry.scroll_ranges;
        Some(ScrollData {
            scroll_left: node.scroll.offset.x,
            scroll_top: node.scroll.offset.y,
            scroll_width: client.width + ranges.x.magnitude(),
            scroll_height: client.height + ranges.y.magnitude(),
            client_width: client.width,
            client_height: client.height,
        })
    }

    fn queue_scroll_event(&mut self, tag: u32) {
        let Some(data) = self.scroll_data(tag) else {
            return;
        };
        let path = self.mounted.path_of(tag);
        self.events.push_scroll(tag, path, data, event_time_ms());
    }

    /// Give a node its scroll and overlay items, or take them away, to match its `overflow`
    /// (plan 3.8). The paint children move between the content item and the scroll item with it.
    pub(crate) fn sync_scroll_container(&mut self, tag: u32) {
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return;
        };
        let wants = node.is_scroll_container();
        if wants == node.render.has_scroller() {
            return;
        }
        if wants {
            node.render.make_scroller();
        }
        let item = if wants {
            node.render.child_item()
        } else {
            node.render.content_item
        };
        let children = node.paint_children.clone();
        for child in children {
            if let Some(child) = self.mounted.nodes.get_mut(&child) {
                child.render.attach(item);
            }
        }
        if !wants {
            if let Some(node) = self.mounted.nodes.get_mut(&tag) {
                node.render.remove_scroller();
                node.scroll = ScrollState::default();
            }
            self.forget_scroll(tag);
        }
        self.hit_stale = true;
    }

    /// Re-clamp a scroll container's offset after layout changed its ranges or its size, and redraw
    /// its bars. A clamp that moved the content is a scroll like any other.
    pub(crate) fn settle_scroll(&mut self, tag: u32) {
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return;
        };
        if !node.render.has_scroller() {
            return;
        }
        let ranges = node.geometry.scroll_ranges;
        if node.scroll.reclamp(&ranges) {
            if node.scroll.velocity == Vec2::ZERO {
                self.scrolling.coasting.remove(&tag);
            }
            self.scroll_changed(tag);
        } else {
            self.paint_scroll_overlay(tag);
        }
    }

    /// Draw the scrollbar thumbs of one container when they changed. Returns whether it recorded.
    pub(crate) fn paint_scroll_overlay(&mut self, tag: u32) -> bool {
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return false;
        };
        if !node.render.has_scroller() {
            return false;
        }
        let client = node.geometry.padding_box();
        let origin = Vector2::new(client.x, client.y);
        let bars = node.scrollbars();
        let thumb = |bar: Option<Scrollbar>| {
            bar.map(|bar| {
                Rect2::new(
                    origin + to_vector(bar.thumb.origin),
                    to_vector(bar.thumb.size),
                )
            })
        };
        let thumbs = [thumb(bars.x), thumb(bars.y)];
        let key = thumbs.iter().any(Option::is_some).then(|| OverlayKey {
            thumbs,
            color: parse_color(
                node.computed.scrollbar_color.as_deref(),
                parse_color(Some(DEFAULT_SCROLLBAR_COLOR), Color::TRANSPARENT_BLACK),
            ),
        });
        let style = self.scrollbar_style.get_or_insert_with(|| {
            let mut style = StyleBoxFlat::new_gd();
            style.set_corner_radius_all(SCROLLBAR_THUMB_RADIUS_PX);
            style
        });
        let recorded = node.render.record_overlay(key, style);
        if recorded {
            self.stats.overlay_records += 1;
        }
        recorded
    }

    /// Forget what scrolling keeps for a container that is gone or stopped being one.
    pub(crate) fn forget_scroll(&mut self, tag: u32) {
        self.scrolling.coasting.remove(&tag);
        if self
            .scrolling
            .thumb
            .as_ref()
            .is_some_and(|grab| grab.tag == tag)
        {
            self.scrolling.thumb = None;
        }
        self.update_process();
    }

    // ---- Touch pans -------------------------------------------------------------------------------

    /// A finger went down on `target`: it may become a pan. A touch that stops a coasting flick is
    /// remembered so it does not click.
    pub(crate) fn begin_touch_pan(
        &mut self,
        id: u32,
        target: u32,
        position: Vector2,
        prevented: bool,
    ) {
        if self.stop_all_momentum() {
            self.scrolling.stopped_flings.insert(id);
        }
        // An un-prevented primary pointerdown starts gestures (plan 3.12).
        if !prevented {
            self.scrolling.pans.insert(
                id,
                TouchPan {
                    gesture: PanGesture::new(to_scroll(position)),
                    target,
                    owner: None,
                },
            );
        }
    }

    /// A new touch stops every coasting container. Returns whether any was coasting.
    fn stop_all_momentum(&mut self) -> bool {
        let coasting = std::mem::take(&mut self.scrolling.coasting);
        for tag in &coasting {
            if let Some(node) = self.mounted.nodes.get_mut(tag) {
                node.scroll.stop_momentum();
            }
        }
        self.update_process();
        !coasting.is_empty()
    }

    /// Which container would own a pan that began on `target` and has moved `displacement`, and the
    /// owner. The path runs from `target` outwards; it ends at a container with `overscroll-behavior:
    /// contain`, which keeps the gesture even where it cannot move (it owns a pan that scrolls nothing),
    /// so the container behind it does not move.
    fn arbitrate_pan(&self, target: u32, displacement: Vec2) -> Option<(u32, PanOwner)> {
        let mut tags = Vec::new();
        let mut candidates = Vec::new();
        let mut contained_at = None;
        let mut current = Some(target);
        while let Some(tag) = current {
            let Some(node) = self.mounted.nodes.get(&tag) else {
                break;
            };
            let ranges = node.geometry.scroll_ranges;
            let scroller = (node.is_scroll_container()
                && (ranges.x.is_scrollable() || ranges.y.is_scrollable()))
            .then_some(PanScroller {
                ranges,
                offset: node.scroll.offset,
            });
            candidates.push(PanCandidate {
                touch_action: touch_action_of(node.computed.touch_action),
                scroller,
            });
            tags.push(tag);
            if scroller.is_some()
                && overscroll_of(node.computed.overscroll_behavior) == OverscrollBehavior::Contain
            {
                contained_at = Some(candidates.len() - 1);
                break;
            }
            current = match node.paint_parent {
                Some(Parent::Node(parent)) => Some(parent),
                Some(Parent::Layer(_)) | None => None,
            };
        }
        if let Some(owner) = pan_owner(&candidates, displacement) {
            return Some((tags[owner.index], owner));
        }
        let index = contained_at?;
        let allowed = candidates[..=index]
            .iter()
            .fold(PanAllowed::ALL, |allowed, candidate| {
                allowed.intersect(candidate.touch_action.allowed())
            });
        allowed
            .allows(dominant_axis(displacement))
            .then_some((tags[index], PanOwner { index, allowed }))
    }

    /// A finger that went down on an element moved. Returns whether the touch is a pan, which owns
    /// the finger: its pointer events have ended with `pointercancel` and the move is consumed.
    pub(crate) fn touch_pan_moved(&mut self, id: u32, position: Vector2) -> bool {
        let Some(mut pan) = self.scrolling.pans.remove(&id) else {
            return false;
        };
        let mut owner_tag = None;
        let step = pan.gesture.moved(to_scroll(position), |displacement| {
            let (tag, owner) = self.arbitrate_pan(pan.target, displacement)?;
            owner_tag = Some(tag);
            Some(owner)
        });
        if step.started.is_some() {
            pan.owner = owner_tag;
            // The pan takes the touch: JS is told it is cancelled, and nothing follows it.
            self.cancel_pointer(id);
            self.scrolling.stopped_flings.remove(&id);
        }
        let panning = pan.gesture.owner().is_some();
        if step.scroll != Vec2::ZERO
            && let Some(owner) = pan.owner
        {
            self.scroll_owner_by(owner, step.scroll);
        }
        self.scrolling.pans.insert(id, pan);
        self.update_process();
        panning
    }

    /// Scroll the owner of a pan by `pixels`. A pan latches to its owner: what the owner cannot take is
    /// dropped (plan 3.12 / `pan.rs`).
    fn scroll_owner_by(&mut self, owner: u32, pixels: Vec2) {
        let Some(link) = self.scroll_link(owner) else {
            return;
        };
        let mut links = [link];
        scroll_chain(&mut links, ScrollInput::Pixels(pixels));
        let moved = self.adopt_links(&[owner], &links);
        self.scrolled(&moved);
    }

    /// A finger lifted. Returns whether it was a pan (the lift is then consumed with no `pointerup`,
    /// the pointer having been cancelled). A pan that was moving at the end of the touch coasts.
    pub(crate) fn touch_pan_ended(&mut self, id: u32) -> bool {
        let Some(pan) = self.scrolling.pans.remove(&id) else {
            return false;
        };
        let Some(owner) = pan.owner.filter(|_| pan.gesture.owner().is_some()) else {
            self.update_process();
            return false;
        };
        let velocity = pan.gesture.release();
        if velocity != Vec2::ZERO
            && let Some(node) = self.mounted.nodes.get_mut(&owner)
        {
            node.scroll.velocity = velocity;
            self.scrolling.coasting.insert(owner);
        }
        self.update_process();
        true
    }

    /// The OS cancelled a touch, or the root left the tree: the pan ends where it is, with no coast.
    pub(crate) fn touch_pan_cancelled(&mut self, id: u32) {
        self.scrolling.pans.remove(&id);
        self.scrolling.stopped_flings.remove(&id);
        self.update_process();
    }

    /// Whether a touch started while a flick was coasting, so its release must not click.
    pub(crate) fn touch_stopped_a_fling(&mut self, id: u32) -> bool {
        self.scrolling.stopped_flings.remove(&id)
    }

    pub(crate) fn end_all_touch_pans(&mut self) {
        self.scrolling.pans.clear();
        self.scrolling.stopped_flings.clear();
        self.update_process();
    }

    // ---- Momentum ---------------------------------------------------------------------------------

    /// One frame of scrolling work: sample the velocity of the fingers that are panning and advance
    /// every flick that is still coasting.
    pub(crate) fn tick_scroll(&mut self, delta: f64) {
        let dt = delta as f32;
        for pan in self.scrolling.pans.values_mut() {
            pan.gesture.frame(dt);
        }
        let coasting: Vec<u32> = self.scrolling.coasting.iter().copied().collect();
        let mut moved = Vec::new();
        for tag in coasting {
            let Some(node) = self.mounted.nodes.get_mut(&tag) else {
                self.scrolling.coasting.remove(&tag);
                continue;
            };
            let ranges = node.geometry.scroll_ranges;
            let step = momentum_step(&mut node.scroll, &ranges, dt);
            if step.moved_by != Vec2::ZERO {
                moved.push(tag);
            }
            if step.finished {
                self.scrolling.coasting.remove(&tag);
            }
        }
        self.scrolled(&moved);
        self.update_process();
    }

    // ---- Scrollbar thumbs -------------------------------------------------------------------------

    /// The scrollbar thumb of container `tag` at `point` (root-local), if there is one.
    fn thumb_at(&self, tag: u32, point: Vector2) -> Option<(Scrollbar, Vec2)> {
        let node = self.mounted.nodes.get(&tag)?;
        let (rect, _) = self.mounted.absolute_geometry(tag, self.viewport_box())?;
        let client = node.geometry.padding_box();
        let local = Vec2::new(point.x - rect.x - client.x, point.y - rect.y - client.y);
        let bars = node.scrollbars();
        [bars.x, bars.y]
            .into_iter()
            .flatten()
            .find(|bar| bar.hit(local) == Some(ScrollbarHit::Thumb))
            .map(|bar| (bar, local))
    }

    /// The primary button went down on `hit`: if that is a scrollbar thumb, dragging it scrolls (plan
    /// 3.12 rule 2). Returns whether a drag began.
    pub(crate) fn begin_thumb_drag(&mut self, hit: Option<u32>, point: Vector2) -> bool {
        let Some(tag) = hit else {
            return false;
        };
        let Some((bar, local)) = self.thumb_at(tag, point) else {
            return false;
        };
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return false;
        };
        node.scroll.stop_momentum();
        let offset = node.scroll.offset.get(bar.axis);
        self.scrolling.coasting.remove(&tag);
        self.scrolling.thumb = Some(ThumbGrab {
            tag,
            axis: bar.axis,
            drag: ThumbDrag::begin(bar, local, offset),
        });
        true
    }

    /// The mouse moved with the thumb held: the content follows. Returns false when no thumb is held.
    /// A drag ends with the button's release, a cancel (the window losing focus, the root leaving the
    /// tree) or the container going away; it does not read the motion's button mask, which synthetic
    /// input need not set.
    pub(crate) fn thumb_drag_moved(&mut self) -> bool {
        let Some(grab) = self.scrolling.thumb.as_ref() else {
            return false;
        };
        let tag = grab.tag;
        let axis = grab.axis;
        let Some(node) = self.mounted.nodes.get(&tag) else {
            self.scrolling.thumb = None;
            return false;
        };
        let Some((rect, _)) = self.mounted.absolute_geometry(tag, self.viewport_box()) else {
            return true;
        };
        let client = node.geometry.padding_box();
        let local = Vec2::new(
            self.pointer.x - rect.x - client.x,
            self.pointer.y - rect.y - client.y,
        );
        let along = grab.drag.offset_at(local);
        let mut target = node.scroll.offset;
        target.set(axis, along);
        self.scroll_container_to(tag, target);
        true
    }

    /// The primary button went up. Returns whether it ended a thumb drag (which does not click).
    pub(crate) fn end_thumb_drag(&mut self) -> bool {
        self.scrolling.thumb.take().is_some()
    }

    // ---- Commands ---------------------------------------------------------------------------------

    /// Move a scroll container by `apply` (a clamped `scroll_to` or `scroll_by`, which returns how far
    /// it moved), ending any flick it was coasting through.
    fn move_container(
        &mut self,
        tag: u32,
        apply: impl FnOnce(&mut ScrollState, &ScrollRanges) -> Vec2,
    ) {
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return;
        };
        node.scroll.stop_momentum();
        let ranges = node.geometry.scroll_ranges;
        let moved = apply(&mut node.scroll, &ranges);
        self.scrolling.coasting.remove(&tag);
        if moved != Vec2::ZERO {
            self.scrolled(&[tag]);
        }
    }

    fn scroll_container_to(&mut self, tag: u32, target: Vec2) {
        self.move_container(tag, |state, ranges| state.scroll_to(ranges, target));
    }

    fn scroll_container(&self, tag: u32) -> Result<&crate::mount::MountedNode, String> {
        let node = self
            .mounted
            .nodes
            .get(&tag)
            .ok_or_else(|| format!("node {tag} is not mounted"))?;
        if !node.is_scroll_container() {
            return Err(format!(
                "node {tag} is not a scroll container: overflowX and overflowY are not scroll or auto"
            ));
        }
        Ok(node)
    }

    /// `element.scrollTo(left, top)`: offsets as in the DOM (zero or negative on a reversed axis),
    /// clamped to the range. An error leaves everything as it was.
    pub(crate) fn scroll_to_checked(
        &mut self,
        tag: u32,
        left: f64,
        top: f64,
    ) -> Result<(), String> {
        let target = finite_pair(left, top, "scrollTo")?;
        self.scroll_container(tag)?;
        self.scroll_container_to(tag, target);
        Ok(())
    }

    /// `element.scrollBy(dx, dy)`.
    pub(crate) fn scroll_by_checked(&mut self, tag: u32, dx: f64, dy: f64) -> Result<(), String> {
        let delta = finite_pair(dx, dy, "scrollBy")?;
        self.scroll_container(tag)?;
        self.move_container(tag, |state, ranges| state.scroll_by(ranges, delta));
        Ok(())
    }

    /// `element.scrollIntoView()`: the least scrolling of each scroll container around `tag`, from
    /// the innermost out, that shows it (as much of it as fits). An element in no scroll container is
    /// fine, and moves nothing.
    pub(crate) fn scroll_into_view_checked(&mut self, tag: u32) -> Result<(), String> {
        if !self.mounted.nodes.contains_key(&tag) {
            return Err(format!("node {tag} is not mounted"));
        }
        self.reveal_node(tag);
        Ok(())
    }

    /// Scroll the containers around `tag` just far enough to show it. Returns whether any moved.
    pub(crate) fn reveal_node(&mut self, tag: u32) -> bool {
        let Some(node) = self.mounted.nodes.get(&tag) else {
            return false;
        };
        // The element's rectangle in the frame its paint parent's children are located in (the
        // parent's border box, not scrolled).
        let mut rect = Rect::new(
            node.geometry.location.x,
            node.geometry.location.y,
            node.geometry.size.x,
            node.geometry.size.y,
        );
        let mut current = node.paint_parent;
        let mut moved = Vec::new();
        while let Some(Parent::Node(container_tag)) = current {
            let Some(container) = self.mounted.nodes.get(&container_tag) else {
                break;
            };
            let mut offset = container.scroll.offset;
            if container.is_scroll_container() {
                let client = container.geometry.padding_box();
                let visible = Rect::new(
                    rect.origin.x - offset.x - client.x,
                    rect.origin.y - offset.y - client.y,
                    rect.size.x,
                    rect.size.y,
                );
                let delta = scroll_reveal_delta(visible, Vec2::new(client.width, client.height));
                if delta != Vec2::ZERO {
                    let ranges = container.geometry.scroll_ranges;
                    let target = ranges.clamp(offset + delta);
                    if target != offset {
                        if let Some(container) = self.mounted.nodes.get_mut(&container_tag) {
                            container.scroll.stop_momentum();
                            container.scroll.offset = target;
                        }
                        self.scrolling.coasting.remove(&container_tag);
                        offset = target;
                        moved.push(container_tag);
                    }
                }
            }
            // The same rectangle in the frame of the container's own paint parent.
            let Some(container) = self.mounted.nodes.get(&container_tag) else {
                break;
            };
            rect.origin = rect.origin - offset + to_scroll(container.geometry.location);
            current = container.paint_parent;
        }
        let any = !moved.is_empty();
        self.scrolled(&moved);
        any
    }

    /// A container's scroll state for `get_scroll_state`: DOM `scrollLeft`, `scrollTop`,
    /// `scrollWidth`, `scrollHeight`, `clientWidth`, `clientHeight`, the range each offset can take
    /// (a reversed axis' range is negative) and where the scrollbar thumbs are drawn. `null` for a node
    /// that is not a scroll container.
    pub(crate) fn scroll_state_json(&self, tag: u32) -> Value {
        let (Some(data), Some(node)) = (self.scroll_data(tag), self.mounted.nodes.get(&tag)) else {
            return Value::Null;
        };
        let ranges = node.geometry.scroll_ranges;
        // The scrollbar thumbs as drawn, root-local, for the verifiers (null when hidden or unattached).
        let thumbs = self
            .mounted
            .absolute_geometry(tag, self.viewport_box())
            .map(|(rect, _)| {
                let client = node.geometry.padding_box();
                let bars = node.scrollbars();
                let thumb = |bar: Option<Scrollbar>| {
                    bar.map(|bar| {
                        json!({
                            "x": rect.x + client.x + bar.thumb.origin.x,
                            "y": rect.y + client.y + bar.thumb.origin.y,
                            "width": bar.thumb.size.x, "height": bar.thumb.size.y,
                        })
                    })
                };
                json!({"x": thumb(bars.x), "y": thumb(bars.y)})
            });
        json!({
            "scrollLeft": data.scroll_left, "scrollTop": data.scroll_top,
            "scrollWidth": data.scroll_width, "scrollHeight": data.scroll_height,
            "clientWidth": data.client_width, "clientHeight": data.client_height,
            "minScrollLeft": ranges.x.min(), "maxScrollLeft": ranges.x.max(),
            "minScrollTop": ranges.y.min(), "maxScrollTop": ranges.y.max(),
            "thumbs": thumbs,
        })
    }
}

/// Two numbers from JS that must be finite.
fn finite_pair(x: f64, y: f64, method: &str) -> Result<Vec2, String> {
    if !x.is_finite() || !y.is_finite() {
        return Err(format!("{method} needs finite numbers, not {x} and {y}"));
    }
    Ok(Vec2::new(x as f32, y as f32))
}
