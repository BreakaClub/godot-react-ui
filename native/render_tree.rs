//! The retained render tree: each mounted element owns canvas items that mirror the view tree
//! (plan section 3.8). RID ownership stays inside the native Control; there are no per-element
//! scene nodes.
//!
//! ```text
//! box      transform = location in the parent; modulate alpha = opacity (inherited by everything
//!          below); draws the background and border
//! ├─ content   clips to the padding box when the element clips; draws text; child boxes attach here
//! │  └─ scroll    scroll containers only: transform = minus the scroll offset; child boxes attach here
//! └─ overlay   scroll containers only, drawn after the content: the scrollbar thumbs
//! ```
//!
//! A move changes one transform and an opacity change one modulate; only an element whose own
//! visuals or size changed re-records its commands (`record_box` / `record_content` compare against
//! what they recorded last and do nothing when it still holds).

use std::time::Instant;

use godot::classes::{RenderingServer, StyleBoxFlat, TextParagraph};
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::commit::LAYER_COUNT;
use crate::geometry::BoxRect;
use crate::paint::parse_color;
use crate::profile::{Sample, micros};
use crate::selection_input::{highlight_paint, highlight_rects};

/// The overlay scrollbar thumb colour when no `scrollbar-color` is set: slate-500 at 60 % (plan
/// Appendix A). A paint constant, so it lives with the painting rather than in `scroll.rs`.
pub(crate) const DEFAULT_SCROLLBAR_COLOR: &str = "#64748b99";
/// The selection highlight colour when no `selection-color` is set: blue-500 at 35 % (plan Appendix A).
pub(crate) const DEFAULT_SELECTION_COLOR: &str = "#3b82f659";
/// A thumb's ends are round: half its thickness.
pub(crate) const SCROLLBAR_THUMB_RADIUS_PX: i32 =
    (crate::scroll::SCROLLBAR_THICKNESS_PX / 2.0) as i32;
/// Under a scroll container's box item the overlay draws after the content item, whose index is the
/// default 0 (siblings of equal index have no defined order).
const OVERLAY_DRAW_INDEX: i32 = 1;

/// Layer items and the top-most item are siblings under the Control's canvas item and sort by this
/// index. The overlay layer draws after the main layer; the focus ring above both.
pub(crate) const LAYER_DRAW_INDEX_BASE: i32 = 0;
pub(crate) const TOP_ITEM_DRAW_INDEX: i32 = 2;

/// What a box item last drew; equal keys mean the recorded commands are still right.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct BoxKey {
    pub size: Vector2,
    pub background: Color,
    pub border_color: Color,
    pub border_width: i32,
    pub radius: i32,
}

/// The highlight a content item draws under its text: code points `start..end` (never empty) in `color`
/// (plan 3.17).
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct SelectionPaint {
    pub start: usize,
    pub end: usize,
    pub color: Color,
}

/// What a content item last drew. `generation` changes whenever the text paragraph is rebuilt; the
/// selection is part of the key so that selecting re-records the item (plan 3.8).
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct ContentKey {
    pub generation: u64,
    pub color: Color,
    pub content_width: f32,
    pub origin: Vector2,
    pub selection: Option<SelectionPaint>,
}

/// What a scroll container's overlay last drew: its scrollbar thumbs (horizontal, vertical) in the
/// box's coordinates, and their colour.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct OverlayKey {
    pub thumbs: [Option<Rect2>; 2],
    pub color: Color,
}

fn server() -> Gd<RenderingServer> {
    RenderingServer::singleton()
}

/// The canvas items of one mounted element, plus what they currently show.
pub(crate) struct RenderNode {
    pub(crate) box_item: Rid,
    pub(crate) content_item: Rid,
    /// Scroll containers only: the item child boxes attach to, translated by minus the scroll offset.
    scroll_item: Option<Rid>,
    /// Scroll containers only: draws the scrollbar thumbs over the content.
    overlay_item: Option<Rid>,
    location: Vector2,
    scroll_offset: Vector2,
    opacity: f32,
    clip: Option<Rect2>,
    box_key: Option<BoxKey>,
    content_key: Option<ContentKey>,
    overlay_key: Option<OverlayKey>,
}

impl RenderNode {
    /// Two detached items, the content item below the box item.
    pub(crate) fn new() -> Self {
        let mut rs = server();
        let box_item = rs.canvas_item_create();
        let content_item = rs.canvas_item_create();
        rs.canvas_item_set_parent(content_item, box_item);
        Self {
            box_item,
            content_item,
            scroll_item: None,
            overlay_item: None,
            location: Vector2::ZERO,
            scroll_offset: Vector2::ZERO,
            opacity: 1.0,
            clip: None,
            box_key: None,
            content_key: None,
            overlay_key: None,
        }
    }

    /// The item the element's child boxes attach to: the scroll item of a scroll container, else the
    /// content item.
    pub(crate) fn child_item(&self) -> Rid {
        self.scroll_item.unwrap_or(self.content_item)
    }

    pub(crate) fn has_scroller(&self) -> bool {
        self.scroll_item.is_some()
    }

    /// Give the element its scroll and overlay items (it became a scroll container). The caller moves
    /// the child boxes under `child_item()`.
    pub(crate) fn make_scroller(&mut self) {
        if self.has_scroller() {
            return;
        }
        let mut rs = server();
        let scroll_item = rs.canvas_item_create();
        rs.canvas_item_set_parent(scroll_item, self.content_item);
        let overlay_item = rs.canvas_item_create();
        rs.canvas_item_set_parent(overlay_item, self.box_item);
        rs.canvas_item_set_draw_index(overlay_item, OVERLAY_DRAW_INDEX);
        self.scroll_item = Some(scroll_item);
        self.overlay_item = Some(overlay_item);
        self.scroll_offset = Vector2::ZERO;
        self.overlay_key = None;
    }

    /// Take the scroll and overlay items away (it stopped being a scroll container). The caller has
    /// already moved the child boxes under the content item.
    pub(crate) fn remove_scroller(&mut self) {
        let mut rs = server();
        for item in [self.scroll_item.take(), self.overlay_item.take()]
            .into_iter()
            .flatten()
        {
            rs.free_rid(item);
        }
        self.scroll_offset = Vector2::ZERO;
        self.overlay_key = None;
    }

    /// Scroll the children: one transform, nothing is re-recorded. Returns true if it changed.
    pub(crate) fn set_scroll_offset(&mut self, offset: Vector2) -> bool {
        let Some(scroll_item) = self.scroll_item else {
            return false;
        };
        if self.scroll_offset == offset {
            return false;
        }
        self.scroll_offset = offset;
        server()
            .canvas_item_set_transform(scroll_item, Transform2D::from_angle_origin(0.0, -offset));
        true
    }

    /// Re-record the scrollbar thumbs when `key` differs from what they last drew (`None`: no bars).
    /// Returns true if it did.
    pub(crate) fn record_overlay(
        &mut self,
        key: Option<OverlayKey>,
        style: &mut Gd<StyleBoxFlat>,
    ) -> bool {
        let Some(overlay_item) = self.overlay_item else {
            return false;
        };
        if self.overlay_key == key {
            return false;
        }
        let mut rs = server();
        rs.canvas_item_clear(overlay_item);
        if let Some(key) = key {
            style.set_bg_color(key.color);
            for thumb in key.thumbs.into_iter().flatten() {
                style.draw(overlay_item, thumb);
            }
        }
        self.overlay_key = key;
        true
    }

    /// Attach under `parent` (a parent element's content item or a layer item).
    pub(crate) fn attach(&mut self, parent: Rid) {
        server().canvas_item_set_parent(self.box_item, parent);
    }

    pub(crate) fn detach(&mut self) {
        server().canvas_item_set_parent(self.box_item, Rid::Invalid);
    }

    /// Sibling order: items under one parent draw in ascending index.
    pub(crate) fn set_draw_index(&mut self, index: i32) {
        server().canvas_item_set_draw_index(self.box_item, index);
    }

    /// Returns true when the transform changed.
    pub(crate) fn set_location(&mut self, location: Vector2) -> bool {
        if self.location == location {
            return false;
        }
        self.location = location;
        server().canvas_item_set_transform(
            self.box_item,
            Transform2D::from_angle_origin(0.0, location),
        );
        true
    }

    /// Opacity multiplies into every descendant through the canvas item's inherited modulate.
    pub(crate) fn set_opacity(&mut self, opacity: f32) {
        if self.opacity == opacity {
            return;
        }
        self.opacity = opacity;
        server().canvas_item_set_modulate(self.box_item, Color::from_rgba(1.0, 1.0, 1.0, opacity));
    }

    /// Re-record the box when `key` differs from what it last drew. Returns true if it did.
    pub(crate) fn record_box(&mut self, key: BoxKey, background: &mut Gd<StyleBoxFlat>) -> bool {
        if self.box_key == Some(key) {
            return false;
        }
        let bounds = Rect2::new(Vector2::ZERO, key.size);
        let mut rs = server();
        rs.canvas_item_clear(self.box_item);
        rs.canvas_item_set_custom_rect_ex(self.box_item, true)
            .rect(bounds)
            .done();
        background.set_bg_color(key.background);
        background.set_border_color(key.border_color);
        background.set_border_width_all(key.border_width);
        background.set_corner_radius_all(key.radius);
        background.draw(self.box_item, bounds);
        self.box_key = Some(key);
        true
    }

    /// Forget the recorded box and draw nothing (a zero-size element).
    pub(crate) fn clear_box(&mut self) -> bool {
        if self.box_key.is_none() {
            return false;
        }
        server().canvas_item_clear(self.box_item);
        self.box_key = None;
        true
    }

    /// Clip the content item (and with it every child element) to `clip`, in its own coordinates,
    /// or stop clipping. Returns true if the clip changed.
    pub(crate) fn set_clip(&mut self, clip: Option<Rect2>) -> bool {
        if self.clip == clip {
            return false;
        }
        self.clip = clip;
        self.assert_clip();
        true
    }

    /// `canvas_item_clear` resets an item's clip flag, so every re-record asserts the clip again.
    fn assert_clip(&self) {
        let mut rs = server();
        match self.clip {
            Some(clip) => {
                rs.canvas_item_set_custom_rect_ex(self.content_item, true)
                    .rect(clip)
                    .done();
                rs.canvas_item_set_clip(self.content_item, true);
            }
            None => {
                rs.canvas_item_set_custom_rect_ex(self.content_item, false)
                    .done();
                rs.canvas_item_set_clip(self.content_item, false);
            }
        }
    }

    /// Re-record the content (the selection highlight, then the text over it) when `key` differs from
    /// what it last drew. Returns true if it did. `highlight` gives the rectangles of the key's
    /// selection, in this item's coordinates, and is only called when there is a selection to draw. The
    /// clip is asserted again afterwards.
    pub(crate) fn record_content(
        &mut self,
        key: ContentKey,
        paragraph: Option<&mut Gd<TextParagraph>>,
        highlight: impl FnOnce(&Gd<TextParagraph>, SelectionPaint) -> Vec<Rect2>,
    ) -> bool {
        if self.content_key == Some(key) {
            return false;
        }
        server().canvas_item_clear(self.content_item);
        if let Some(paragraph) = paragraph {
            paragraph.set_width(key.content_width);
            if let Some(selection) = key.selection {
                crate::selection_input::draw_highlight(
                    self.content_item,
                    &highlight(paragraph, selection),
                    selection.color,
                );
            }
            paragraph
                .draw_ex(self.content_item, key.origin)
                .color(key.color)
                .done();
        }
        self.assert_clip();
        self.content_key = Some(key);
        true
    }

    /// Forget the recorded content and draw nothing.
    pub(crate) fn clear_content(&mut self) -> bool {
        if self.content_key.is_none() {
            return false;
        }
        server().canvas_item_clear(self.content_item);
        self.assert_clip();
        self.content_key = None;
        true
    }
}

impl Drop for RenderNode {
    fn drop(&mut self) {
        // RenderingServer::free does not free child RIDs recursively. Every item created here is
        // released explicitly with its owning element.
        let mut rs = server();
        for item in [self.scroll_item, self.overlay_item].into_iter().flatten() {
            rs.free_rid(item);
        }
        rs.free_rid(self.content_item);
        rs.free_rid(self.box_item);
    }
}

/// A bare canvas item under the Control that other items attach to or that draws on its own: a
/// layer's root, or the top-most item for the focus ring.
pub(crate) struct RootItem {
    pub(crate) item: Rid,
}

impl RootItem {
    pub(crate) fn new(parent: Rid, draw_index: i32) -> Self {
        let mut rs = server();
        let item = rs.canvas_item_create();
        rs.canvas_item_set_parent(item, parent);
        rs.canvas_item_set_draw_index(item, draw_index);
        Self { item }
    }

    /// Draw `style` over `rect`, clipped to `clip` (both in the item's coordinates).
    pub(crate) fn draw_clipped(
        &self,
        style: &mut Gd<StyleBoxFlat>,
        rect: Rect2,
        clip: Option<Rect2>,
    ) {
        let mut rs = server();
        rs.canvas_item_clear(self.item);
        rs.canvas_item_set_custom_rect_ex(self.item, true)
            .rect(clip.unwrap_or(rect))
            .done();
        // `clear` resets the clip flag.
        rs.canvas_item_set_clip(self.item, clip.is_some());
        style.draw(self.item, rect);
    }

    pub(crate) fn clear(&self) {
        server().canvas_item_clear(self.item);
    }
}

impl Drop for RootItem {
    fn drop(&mut self) {
        server().free_rid(self.item);
    }
}

impl ReactUiRoot {
    /// Create the layer items and the focus ring's top-most item under the Control's canvas item.
    /// Safe to call repeatedly; the Control's canvas item exists from construction, but items cannot
    /// be created inside `init`, so this runs on the first commit and in `ready`.
    pub(crate) fn ensure_render_roots(&mut self) {
        if !self.layer_items.is_empty() {
            return;
        }
        let parent = self.base().get_canvas_item();
        for layer in 0..LAYER_COUNT {
            let index = LAYER_DRAW_INDEX_BASE
                + i32::try_from(layer).expect("a layer index fits an i32 draw index");
            self.layer_items.push(RootItem::new(parent, index));
        }
        self.ring_item = Some(RootItem::new(parent, TOP_ITEM_DRAW_INDEX));
    }

    pub(crate) fn layer_item(&self, layer: usize) -> Rid {
        self.layer_items[layer].item
    }

    /// Re-record the canvas items of every node whose paint inputs may have changed, and redraw
    /// the focus ring if its rectangle did. Items whose recorded key still holds are left alone, so
    /// an idle frame records nothing.
    pub(crate) fn paint_pass(&mut self) {
        let started = Instant::now();
        let dirty = std::mem::take(&mut self.paint_dirty);
        let mut changed = !dirty.is_empty();
        for tag in dirty {
            let (boxed, contented) = self.paint_node(tag);
            self.stats.box_records += u64::from(boxed);
            self.stats.content_records += u64::from(contented);
            // The scrollbars' look (`scrollbar-width`, `scrollbar-color`) is a paint input too.
            self.paint_scroll_overlay(tag);
        }
        changed |= self.update_focus_ring();
        if changed {
            self.stats.paint_passes += 1;
            self.profiler.record(Sample::Draw {
                cpu_micros: micros(started),
            });
        }
    }

    /// Bring one node's canvas items up to date. Returns whether its box and its content were
    /// re-recorded.
    fn paint_node(&mut self, tag: u32) -> (bool, bool) {
        let motion = self
            .sampled
            .get(&tag)
            .map(|sampled| (sampled.opacity, sampled.background_color));
        let highlight = self.selecting.highlight_of(tag);
        let font = self.font.clone();
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return (false, false);
        };
        let style = &node.computed;
        node.render
            .set_opacity(motion.map_or(style.opacity.unwrap_or(1.0), |(opacity, _)| opacity));
        // The clip applies to everything below, so it holds even when the box itself is empty:
        // a closed accordion clips its children to nothing.
        let clip = node
            .clips_content()
            .then(|| node.geometry.padding_box().godot_rect());
        node.render.set_clip(clip);
        let size = node.geometry.size;
        if size.x <= 0.0 || size.y <= 0.0 {
            return (node.render.clear_box(), node.render.clear_content());
        }
        let style = &node.computed;
        let background = match motion {
            Some((_, [r, g, b, a])) => Color::from_rgba(r, g, b, a),
            None => parse_color(style.background_color.as_deref(), Color::TRANSPARENT_BLACK),
        };
        let box_key = BoxKey {
            size,
            background,
            border_color: parse_color(style.border_color.as_deref(), Color::TRANSPARENT_BLACK),
            border_width: style.border_width.unwrap_or(0.0).round() as i32,
            radius: style.border_radius.unwrap_or(0.0).round() as i32,
        };
        let boxed = node.render.record_box(box_key, &mut node.visual.background);
        let contented = match node.visual.paragraph.as_mut() {
            Some(paragraph) => {
                let key = ContentKey {
                    generation: node.visual.generation,
                    color: parse_color(style.color.as_deref(), Color::WHITE),
                    content_width: node.geometry.content_width(),
                    origin: node.geometry.content_origin(),
                    selection: highlight.map(|range| highlight_paint(style, range)),
                };
                let geometry = node.geometry;
                let computed = &node.computed;
                node.render
                    .record_content(key, Some(paragraph), |paragraph, selection| {
                        let Some(font) = font.as_ref() else {
                            godot_error!(
                                "ReactUiRoot: node {tag} has a selection but the root has no font"
                            );
                            return Vec::new();
                        };
                        highlight_rects(
                            font,
                            paragraph,
                            &geometry,
                            computed,
                            selection.start,
                            selection.end,
                        )
                        .unwrap_or_else(|error| {
                            godot_error!(
                                "ReactUiRoot: cannot place the selection of node {tag}: {error}"
                            );
                            Vec::new()
                        })
                    })
            }
            None => node.render.clear_content(),
        };
        (boxed, contented)
    }

    /// Draw the focus ring over the focused element, above both layers. It is an inset stroke so
    /// it cannot cover adjacent content, clipped by the element's ancestors. Returns whether it
    /// was redrawn or cleared.
    pub(crate) fn update_focus_ring(&mut self) -> bool {
        let viewport = self.viewport_box();
        // The ring marks a keyboard focus only (plan 3.13): a press focuses without it.
        let target = self.focused.filter(|_| self.focus_visible).and_then(|tag| {
            let node = self.mounted.nodes.get(&tag)?;
            let (rect, clip) = self.mounted.absolute_geometry(tag, viewport)?;
            let radius = node.computed.border_radius.unwrap_or(0.0) as i32;
            Some(RingKey {
                rect: rect.godot_rect(),
                clip: clip.map(BoxRect::godot_rect),
                radius,
            })
        });
        if target == self.ring_drawn {
            return false;
        }
        let (Some(item), Some(ring)) = (self.ring_item.as_ref(), self.ring.as_mut()) else {
            return false;
        };
        self.ring_drawn = target;
        match target {
            Some(key) => {
                ring.set_corner_radius_all(key.radius);
                item.draw_clipped(ring, key.rect, key.clip);
            }
            None => item.clear(),
        }
        true
    }
}

/// What the focus ring last drew.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct RingKey {
    rect: Rect2,
    clip: Option<Rect2>,
    radius: i32,
}
