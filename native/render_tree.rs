//! The retained render tree: each mounted element owns canvas items that mirror the view tree
//! (plan section 3.8). RID ownership stays inside the native Control; there are no per-element
//! scene nodes.
//!
//! ```text
//! box      transform = location in the parent; modulate alpha = opacity (inherited by everything
//!          below); draws the background and border
//! ├─ content   clips to the padding box when the element clips; draws text; child boxes attach here
//! │  └─ scroll    scroll containers only: transform = minus the scroll offset; child boxes attach here
//! │     ├─ text   text inputs only: the selection, the text and the preedit's underline
//! │     └─ caret  text inputs only: the caret, drawn over the text so that blinking redraws nothing else
//! └─ overlay   scroll containers only, drawn after the content: the scrollbar thumbs
//! ```
//!
//! A move changes one transform and an opacity change one modulate; only an element whose own
//! visuals or size changed re-records its commands (`record_box` / `record_content` compare against
//! what they recorded last and do nothing when it still holds).
//!
//! An element with a `backdrop-filter` has two more items, both children of the box item drawn before
//! its background (`behind`): a copy of the render target, then the blurred backdrop. An element with a
//! `filter` has a canvas group between its paint parent and its box item, inside a bare shell item that also
//! holds what must be drawn right before the group and outside it: the backdrop of the same element, and on
//! Compatibility the probe that makes the group's mipmaps readable. Each exists only while the filter does
//! (`filter_render.rs` decides).

use std::time::Instant;

use godot::classes::rendering_server::CanvasGroupMode;
use godot::classes::{RenderingServer, StyleBoxFlat};
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::commit::LAYER_COUNT;
use crate::filter_faults::{self as faults, Fault};
use crate::geometry::BoxRect;
use crate::paint::parse_color;
use crate::profile::{Sample, micros};
use crate::props::Kind;
use crate::selection_input::{highlight_paint, highlight_rects};
use crate::square_box;
use crate::text_paragraph::StyledParagraph;
use crate::transform::{Affine2, Placement};

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
/// The drag ghost draws above the focus ring (plan 3.8: both use a top-most item); equal indices have
/// no defined order.
pub(crate) const GHOST_DRAW_INDEX: i32 = TOP_ITEM_DRAW_INDEX + 1;

/// TextServer keys its glyph caches by oversampling in 26.6 fixed point: `CLAMP(level, 0.1, 100.0) * 64`, truncated
/// (`modules/text_server_adv/text_server_adv.cpp`, `_reference_oversampling_level`, and `_font_draw_glyph`, which
/// draws at `level / 64.0`). A level kept in these units is exactly the one TextServer rasterises at, and two of them
/// are equal exactly when they share a glyph cache.
const OVERSAMPLING_UNITS_PER_FACTOR: f32 = 64.0;
/// The range TextServer clamps a requested oversampling to.
const OVERSAMPLING_MIN_FACTOR: f32 = 0.1;
const OVERSAMPLING_MAX_FACTOR: f32 = 100.0;

/// How many device pixels one logical pixel covers where this root draws: the font oversampling of the viewport it is
/// in (the same value Godot's own controls draw their text at, `Viewport::get_oversampling`; see
/// `docs/tracks/hidpi.md`). Everything this root records through the `RenderingServer` outside `NOTIFICATION_DRAW`
/// has to be given it, because TextServer and `StyleBoxFlat` read it from a global that only `CanvasItem::_draw` sets.
///
/// It is part of every key whose commands depend on it, so a change of scale re-records exactly those items.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Oversampling(u32);

impl Oversampling {
    /// One device pixel per logical pixel.
    pub(crate) const NONE: Self = Self(OVERSAMPLING_UNITS_PER_FACTOR as u32);

    /// The level TextServer rasterises at for the viewport's `factor`.
    pub(crate) fn from_factor(factor: f32) -> Self {
        let clamped = factor.clamp(OVERSAMPLING_MIN_FACTOR, OVERSAMPLING_MAX_FACTOR);
        Self((clamped * OVERSAMPLING_UNITS_PER_FACTOR) as u32)
    }

    /// Device pixels per logical pixel, exactly: dividing by a power of two loses nothing, so TextServer reads
    /// the same level back.
    pub(crate) fn factor(self) -> f32 {
        self.0 as f32 / OVERSAMPLING_UNITS_PER_FACTOR
    }

    /// The `StyleBoxFlat` antialiasing feather that is one device pixel wide. `StyleBoxFlat::draw` divides
    /// `anti_aliasing_size` by the oversampling of the item being drawn, and outside `NOTIFICATION_DRAW` that
    /// is 1, so a feather of one logical pixel would be `factor()` device pixels and blur every rounded edge.
    pub(crate) fn feather(self) -> f32 {
        1.0 / self.factor()
    }
}

/// What a box item last drew; equal keys mean the recorded commands are still right.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct BoxKey {
    pub size: Vector2,
    pub background: Color,
    pub border_color: Color,
    pub border_width: i32,
    pub radius: i32,
    /// The scale the antialiasing feather of a rounded corner is sized for (`StyleBoxFlat`, one feather length). Square corners are
    /// not antialiased by it, so any other box keeps `Oversampling::NONE` and is not re-recorded when the scale changes.
    pub oversampling: Oversampling,
    /// A box with square corners that a transform has moved off the pixel grid is drawn from feathered triangles
    /// (`square_box.rs`), because `StyleBoxFlat` antialiases only a rounded or skewed box: this is their feather along the box's own x
    /// and y (`Raster::edge_feather`), one device pixel across an edge on each axis. `None` for any other box.
    pub square_feather: Option<Vector2>,
}

impl BoxKey {
    /// Whether the fill or the border lets what is behind show through.
    fn is_translucent(&self) -> bool {
        self.background.a < 1.0 || self.border_color.a < 1.0
    }
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
    pub oversampling: Oversampling,
}

/// What a text input's text item last drew. Equal keys mean the recorded commands are still right.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct EditTextKey {
    /// Changes whenever the display text is shaped again.
    pub generation: u64,
    pub origin: Vector2,
    pub content_width: f32,
    /// `HorizontalAlignment::ord()` the paragraph was laid out with.
    pub alignment: i32,
    pub color: Color,
    /// `Some` while the placeholder is drawn instead of the text, in its colour.
    pub placeholder: Option<Color>,
    pub selection_color: Color,
    /// The selected display offsets, when non-empty.
    pub selection: Option<(usize, usize)>,
    /// The IME preedit's display offsets and the part of it being converted.
    pub preedit: Option<((usize, usize), (usize, usize))>,
    pub oversampling: Oversampling,
}

/// What a text input's caret item last drew: the rectangles, in the scroll item's coordinates.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct CaretKey {
    pub rects: Vec<Rect2>,
    pub color: Color,
}

/// What a scroll container's overlay last drew: its scrollbar thumbs (horizontal, vertical) in the
/// box's coordinates, and their colour.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct OverlayKey {
    pub thumbs: [Option<Rect2>; 2],
    pub color: Color,
    /// The thumbs have round ends, so their antialiasing depends on the scale.
    pub oversampling: Oversampling,
}

fn server() -> Gd<RenderingServer> {
    RenderingServer::singleton()
}

/// What an element's items currently show: enough for the drag ghost to draw a copy.
#[derive(Clone, Copy, Debug)]
pub(crate) struct Recorded {
    pub(crate) location: Vector2,
    pub(crate) opacity: f32,
    pub(crate) clip: Option<Rect2>,
    pub(crate) box_key: Option<BoxKey>,
    pub(crate) content_key: Option<ContentKey>,
    /// A scroll container's offset; `None` for an element that does not scroll.
    pub(crate) scroll_offset: Option<Vector2>,
    /// The element's transform, if it has one that does something.
    pub(crate) placement: Option<Placement>,
}

/// The two items of a `backdrop-filter`, children of the box item that draw before its background.
/// They are two items, not one, on purpose: the copy must be its own item for the renderer to
/// regenerate the mipmaps for it (plan D40 b, `docs/tracks/filters.md`).
pub(crate) struct BackdropItems {
    /// Copies the render target's region into the back buffer.
    pub(crate) copy: Rid,
    /// Draws the element's shape with the material that reads the back buffer.
    pub(crate) draw: Rid,
}

/// The canvas group of a `filter`, between the paint parent and the box item.
pub(crate) struct GroupItems {
    /// The bare item that takes the box item's place in the paint parent: its `behind` children (the element's backdrop,
    /// the probe) are drawn, outside the group, right before the wrapper. It has no transform of its own.
    pub(crate) shell: Rid,
    /// The group: draws its children into the back buffer, then composites with the material. It draws its
    /// own rectangle, which is the area the composite covers: a group with no commands of its own
    /// (`fit_empty`) is `clear()`ed by the culler every frame, and `clear()` drops the item's clip owner
    /// (`renderer_canvas_render.h:459`), so its composite would ignore an ancestor's clip.
    pub(crate) wrapper: Rid,
    /// An invisible child whose rectangle, with the wrapper's own, sets the region the renderer generates
    /// mipmaps for; the caller aligns it (see `blur::copy_region`).
    pub(crate) bounds: Rid,
    /// Compatibility only: a one pixel copy and a one pixel draw with a mip-reading material, before the group.
    probe: Option<ProbeItems>,
}

/// See [`GroupItems::probe`].
struct ProbeItems {
    copy: Rid,
    draw: Rid,
}

/// Draw index of the copy item and of the backdrop item among the box item's (or the shell's) `behind` children, then of
/// the probe's pair. The wrapper is the shell's one child that is not `behind`.
const COPY_DRAW_INDEX: i32 = 0;
const BACKDROP_DRAW_INDEX: i32 = 1;
const PROBE_COPY_DRAW_INDEX: i32 = 2;
const PROBE_DRAW_INDEX: i32 = 3;
/// The engine does not draw an item whose accumulated modulate alpha is below this (`renderer_canvas_cull.cpp`, `_cull_canvas_item`).
/// Its box item is then culled, but a group around it is not: it still clears the back buffer and composites nothing.
const OPACITY_CULLED_BELOW: f32 = 0.007;

/// The canvas items of one mounted element, plus what they currently show.
pub(crate) struct RenderNode {
    pub(crate) box_item: Rid,
    pub(crate) content_item: Rid,
    /// Where the element's outermost item is attached and its sibling index, remembered so the group
    /// of a `filter` can take the box item's place in the tree and give it back.
    parent: Rid,
    draw_index: i32,
    pub(crate) backdrop: Option<BackdropItems>,
    pub(crate) group: Option<GroupItems>,
    /// Scroll containers only: the item child boxes attach to, translated by minus the scroll offset.
    scroll_item: Option<Rid>,
    /// Scroll containers only: draws the scrollbar thumbs over the content.
    overlay_item: Option<Rid>,
    /// Text inputs only: the items the text and the caret are drawn in, under the scroll item.
    edit_items: Option<EditItems>,
    location: Vector2,
    /// The element's transform (`transform.rs`): the box item draws at `location` plus this.
    placement: Option<Placement>,
    /// Whether the box item (or the shell of its group) is hidden because the matrix has no inverse.
    transform_hidden: bool,
    scroll_offset: Vector2,
    opacity: f32,
    clip: Option<Rect2>,
    box_key: Option<BoxKey>,
    content_key: Option<ContentKey>,
    overlay_key: Option<OverlayKey>,
    edit_text_key: Option<EditTextKey>,
    caret_key: Option<CaretKey>,
}

/// The two items a text input draws in: the text under the caret, so a blink never redraws the text.
struct EditItems {
    text: Rid,
    caret: Rid,
}

/// Siblings under the scroll item of a text input draw in ascending index: text, then caret.
const EDIT_TEXT_DRAW_INDEX: i32 = 0;
const EDIT_CARET_DRAW_INDEX: i32 = 1;

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
            parent: Rid::Invalid,
            draw_index: 0,
            backdrop: None,
            group: None,
            scroll_item: None,
            overlay_item: None,
            edit_items: None,
            location: Vector2::ZERO,
            placement: None,
            transform_hidden: false,
            scroll_offset: Vector2::ZERO,
            opacity: 1.0,
            clip: None,
            box_key: None,
            content_key: None,
            overlay_key: None,
            edit_text_key: None,
            caret_key: None,
        }
    }

    /// What the element's items show now.
    pub(crate) fn recorded(&self) -> Recorded {
        Recorded {
            location: self.location,
            opacity: self.opacity,
            clip: self.clip,
            box_key: self.box_key,
            content_key: self.content_key,
            scroll_offset: self.scroll_item.map(|_| self.scroll_offset),
            placement: self.placement,
        }
    }

    /// What the box item (and the backdrop's draw item, where it hangs on the shell) is transformed by:
    /// the element's own map, then its location.
    fn item_transform(&self) -> Transform2D {
        self.placement
            .map_or(Affine2::IDENTITY, |placement| placement.affine)
            .then(&Affine2::translation(self.location))
            .to_godot()
    }

    /// Draw or hide the outermost item: hidden by an opacity the engine draws nothing at (a group only), or
    /// by a matrix with no inverse (an element edge on or scaled to nothing), which the engine would invert.
    fn refresh_visibility(&self) {
        let mut rs = server();
        match &self.group {
            Some(group) => rs.canvas_item_set_visible(
                group.shell,
                self.group_visible() && !self.transform_hidden,
            ),
            None => rs.canvas_item_set_visible(self.box_item, !self.transform_hidden),
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

    /// Give a text input its text and caret items under the scroll item, which it must have.
    pub(crate) fn make_edit_items(&mut self) {
        if self.edit_items.is_some() {
            return;
        }
        let Some(scroll_item) = self.scroll_item else {
            return;
        };
        let mut rs = server();
        let text = rs.canvas_item_create();
        rs.canvas_item_set_parent(text, scroll_item);
        rs.canvas_item_set_draw_index(text, EDIT_TEXT_DRAW_INDEX);
        let caret = rs.canvas_item_create();
        rs.canvas_item_set_parent(caret, scroll_item);
        rs.canvas_item_set_draw_index(caret, EDIT_CARET_DRAW_INDEX);
        self.edit_items = Some(EditItems { text, caret });
        self.edit_text_key = None;
        self.caret_key = None;
    }

    /// Re-record the text, selection and preedit underline when `key` differs from what they last
    /// drew; `draw` records into the item. Returns true if it did.
    pub(crate) fn record_edit_text(&mut self, key: EditTextKey, draw: impl FnOnce(Rid)) -> bool {
        let Some(items) = &self.edit_items else {
            return false;
        };
        if self.edit_text_key.as_ref() == Some(&key) {
            return false;
        }
        server().canvas_item_clear(items.text);
        draw(items.text);
        self.edit_text_key = Some(key);
        true
    }

    /// Draw nothing in the text and caret items. Returns true if either had something.
    pub(crate) fn clear_edit_items(&mut self) -> bool {
        let Some(items) = &self.edit_items else {
            return false;
        };
        if self.edit_text_key.is_none() && self.caret_key.is_none() {
            return false;
        }
        let mut rs = server();
        rs.canvas_item_clear(items.text);
        rs.canvas_item_clear(items.caret);
        self.edit_text_key = None;
        self.caret_key = None;
        true
    }

    /// Re-record the caret when `key` differs from what it last drew (`None`: no caret).
    pub(crate) fn record_edit_caret(
        &mut self,
        key: Option<CaretKey>,
        draw: impl FnOnce(Rid, &CaretKey),
    ) -> bool {
        let Some(items) = &self.edit_items else {
            return false;
        };
        if self.caret_key == key {
            return false;
        }
        server().canvas_item_clear(items.caret);
        if let Some(key) = &key {
            draw(items.caret, key);
        }
        self.caret_key = key;
        true
    }

    /// Take the scroll and overlay items away (it stopped being a scroll container). The caller has
    /// already moved the child boxes under the content item.
    pub(crate) fn remove_scroller(&mut self) {
        let mut rs = server();
        if let Some(items) = self.edit_items.take() {
            rs.free_rid(items.text);
            rs.free_rid(items.caret);
        }
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
            style.set_aa_size(key.oversampling.feather());
            for thumb in key.thumbs.into_iter().flatten() {
                style.draw(overlay_item, thumb);
            }
        }
        self.overlay_key = key;
        true
    }

    /// The item that sits in the paint parent: the shell of a `filter`'s group, else the box item.
    fn outer_item(&self) -> Rid {
        self.group
            .as_ref()
            .map_or(self.box_item, |group| group.shell)
    }

    /// Where the backdrop's items hang: below the box item, so they are behind its background, unless the element has a
    /// group, which would then hold them (`canvas_group_owner` ignores a screen read inside a group). Then they are on the
    /// shell, outside the group, and carry what the box item would have given them: its place and its opacity.
    fn backdrop_parent(&self) -> Rid {
        match &self.group {
            Some(group) if !faults::active(Fault::BackdropInWrapper) => group.shell,
            _ => self.box_item,
        }
    }

    /// Whether the backdrop's items are on the shell.
    fn backdrop_on_shell(&self) -> bool {
        self.group.is_some() && self.backdrop_parent() != self.box_item
    }

    /// Put the backdrop's items where [`Self::backdrop_parent`] says, with the place and the opacity of the element if
    /// they are not below the box item.
    fn arrange_backdrop(&mut self) {
        let Some(items) = &self.backdrop else {
            return;
        };
        let on_shell = self.backdrop_on_shell();
        let parent = self.backdrop_parent();
        let mut rs = server();
        for item in [items.copy, items.draw] {
            rs.canvas_item_set_parent(item, parent);
            rs.canvas_item_set_draw_behind_parent(item, true);
        }
        rs.canvas_item_set_draw_index(items.copy, COPY_DRAW_INDEX);
        rs.canvas_item_set_draw_index(items.draw, BACKDROP_DRAW_INDEX);
        let (transform, opacity) = if on_shell {
            (self.item_transform(), self.opacity)
        } else {
            (Transform2D::IDENTITY, 1.0)
        };
        rs.canvas_item_set_transform(items.draw, transform);
        rs.canvas_item_set_modulate(items.draw, Color::from_rgba(1.0, 1.0, 1.0, opacity));
    }

    /// Attach under `parent` (a parent element's content item or a layer item).
    pub(crate) fn attach(&mut self, parent: Rid) {
        self.parent = parent;
        server().canvas_item_set_parent(self.outer_item(), parent);
    }

    pub(crate) fn detach(&mut self) {
        self.parent = Rid::Invalid;
        server().canvas_item_set_parent(self.outer_item(), Rid::Invalid);
    }

    /// Sibling order: items under one parent draw in ascending index.
    pub(crate) fn set_draw_index(&mut self, index: i32) {
        self.draw_index = index;
        server().canvas_item_set_draw_index(self.outer_item(), index);
    }

    /// Give the element its `backdrop-filter` items. Returns them (they exist already if it had them).
    pub(crate) fn ensure_backdrop(&mut self) -> &BackdropItems {
        if self.backdrop.is_none() {
            let mut rs = server();
            let copy = rs.canvas_item_create();
            let draw = rs.canvas_item_create();
            self.backdrop = Some(BackdropItems { copy, draw });
            drop(rs);
            self.arrange_backdrop();
        }
        self.backdrop
            .as_ref()
            .expect("the backdrop items were just made")
    }

    /// Take the `backdrop-filter` items away. Returns whether there were any.
    pub(crate) fn remove_backdrop(&mut self) -> bool {
        let Some(items) = self.backdrop.take() else {
            return false;
        };
        let mut rs = server();
        rs.free_rid(items.copy);
        rs.free_rid(items.draw);
        true
    }

    /// Give the element the canvas group of its `filter`, in the box item's place under the paint
    /// parent, and keep its mode and its probe as `blur_mipmaps` and `probe` say. The group adds no
    /// margin of its own (`clear_margin`/`fit_margin` 0); `set_group_rects` says what it covers. `probe` is the material of
    /// the Compatibility probe, or `None` where none is needed.
    pub(crate) fn ensure_group(&mut self, blur_mipmaps: bool, probe: Option<Rid>) -> &GroupItems {
        if self.group.is_none() {
            let mut rs = server();
            let shell = rs.canvas_item_create();
            let wrapper = rs.canvas_item_create();
            let bounds = rs.canvas_item_create();
            rs.canvas_item_set_parent(bounds, wrapper);
            rs.canvas_item_add_rect(
                bounds,
                Rect2::new(Vector2::ZERO, Vector2::ONE),
                Color::TRANSPARENT_BLACK,
            );
            rs.canvas_item_set_parent(wrapper, shell);
            rs.canvas_item_set_parent(shell, self.parent);
            rs.canvas_item_set_draw_index(shell, self.draw_index);
            rs.canvas_item_set_parent(self.box_item, wrapper);
            self.group = Some(GroupItems {
                shell,
                wrapper,
                bounds,
                probe: None,
            });
            drop(rs);
            self.refresh_visibility();
            // The backdrop, if there is one, leaves the box item for the shell.
            self.arrange_backdrop();
        }
        // The probe follows the mode.
        let group = self.group.as_mut().expect("the group was just made");
        match (probe, group.probe.is_some()) {
            (Some(material), false) => {
                let mut rs = server();
                let copy = rs.canvas_item_create();
                let draw = rs.canvas_item_create();
                for (item, index) in [(copy, PROBE_COPY_DRAW_INDEX), (draw, PROBE_DRAW_INDEX)] {
                    rs.canvas_item_set_parent(item, group.shell);
                    rs.canvas_item_set_draw_behind_parent(item, true);
                    rs.canvas_item_set_draw_index(item, index);
                }
                rs.canvas_item_set_copy_to_backbuffer(
                    copy,
                    true,
                    Rect2::new(Vector2::ZERO, Vector2::ONE),
                );
                rs.canvas_item_add_rect(
                    draw,
                    Rect2::new(Vector2::ZERO, Vector2::ONE),
                    Color::WHITE,
                );
                rs.canvas_item_set_material(draw, material);
                group.probe = Some(ProbeItems { copy, draw });
            }
            (None, true) => {
                if let Some(old) = group.probe.take() {
                    let mut rs = server();
                    rs.free_rid(old.copy);
                    rs.free_rid(old.draw);
                }
            }
            _ => {}
        }
        // The mode is asserted each time: `blur_mipmaps` follows the shader kind.
        server()
            .canvas_item_set_canvas_group_mode_ex(group.wrapper, CanvasGroupMode::TRANSPARENT)
            .clear_margin(0.0)
            .fit_empty(faults::active(Fault::FitEmptyGroup))
            .fit_margin(0.0)
            .blur_mipmaps(blur_mipmaps)
            .done();
        self.group.as_ref().expect("the group was just made")
    }

    /// Whether the group has a Compatibility probe.
    pub(crate) fn has_probe(&self) -> bool {
        self.group
            .as_ref()
            .is_some_and(|group| group.probe.is_some())
    }

    /// Whether the group is not drawn because the element's own opacity is too low for the engine to draw anything of it.
    pub(crate) fn group_hidden(&self) -> bool {
        self.group.is_some() && !self.group_visible()
    }

    fn group_visible(&self) -> bool {
        self.opacity >= OPACITY_CULLED_BELOW || faults::active(Fault::VisibleAtZeroOpacity)
    }

    /// How the element's effect items hang, for the snapshot.
    pub(crate) fn layout_name(&self) -> &'static str {
        match (&self.group, &self.backdrop) {
            (None, None) => "plain",
            (None, Some(_)) => "backdrop",
            (Some(_), None) => "group",
            (Some(_), Some(_)) if self.backdrop_on_shell() => "both",
            (Some(_), Some(_)) => "both-in-wrapper",
        }
    }

    /// The rectangle the group's composite covers (`draw`, which also clips to the ancestors: see
    /// [`GroupItems::wrapper`]) and the larger rectangle its mipmaps are generated for (`region`), both in
    /// the group's frame, and the pixel the probe is drawn at (`None`: the probe is not drawn, the group is off the target).
    /// Does nothing without a group.
    pub(crate) fn set_group_rects(&mut self, draw: Rect2, region: Rect2, probe: Option<Vector2>) {
        let Some(group) = &self.group else {
            return;
        };
        let mut rs = server();
        rs.canvas_item_clear(group.wrapper);
        // A group with no command of its own is the engine's to fit and clear each frame (`GroupItems::wrapper`).
        if !faults::active(Fault::FitEmptyGroup) {
            rs.canvas_item_add_rect(group.wrapper, draw, Color::WHITE);
        }
        rs.canvas_item_set_custom_rect_ex(group.wrapper, true)
            .rect(draw)
            .done();
        rs.canvas_item_set_custom_rect_ex(group.bounds, true)
            .rect(region)
            .done();
        if let Some(items) = &group.probe {
            // The engine draws an item only if its rectangle meets the viewport: the probe is placed on a pixel the group
            // covers on the target, and hidden with the group when there is none.
            rs.canvas_item_set_visible(items.copy, probe.is_some());
            rs.canvas_item_set_visible(items.draw, probe.is_some());
            if let Some(at) = probe {
                rs.canvas_item_set_transform(items.draw, Transform2D::from_angle_origin(0.0, at));
            }
        }
    }

    /// Take the group away, putting the box item back in its place. Returns whether there was one.
    pub(crate) fn remove_group(&mut self) -> bool {
        let Some(group) = self.group.take() else {
            return false;
        };
        let mut rs = server();
        rs.canvas_item_set_parent(self.box_item, self.parent);
        rs.canvas_item_set_draw_index(self.box_item, self.draw_index);
        rs.canvas_item_set_visible(self.box_item, !self.transform_hidden);
        if let Some(probe) = group.probe {
            rs.free_rid(probe.copy);
            rs.free_rid(probe.draw);
        }
        rs.free_rid(group.bounds);
        rs.free_rid(group.wrapper);
        // The backdrop goes back below the box item before the shell it hung on is freed.
        drop(rs);
        self.arrange_backdrop();
        server().free_rid(group.shell);
        true
    }

    /// Returns true when the transform changed.
    pub(crate) fn set_location(&mut self, location: Vector2) -> bool {
        if self.location == location {
            return false;
        }
        self.location = location;
        self.apply_item_transform();
        true
    }

    /// Set the element's transform (`None`: it has none). Returns true when it changed. A move of an animated
    /// element is this one call: nothing is re-recorded.
    pub(crate) fn set_placement(&mut self, placement: Option<Placement>) -> bool {
        if self.placement == placement {
            return false;
        }
        self.placement = placement;
        self.apply_item_transform();
        let hidden = placement.is_some_and(|placement| placement.inverse.is_none());
        if hidden != self.transform_hidden {
            self.transform_hidden = hidden;
            self.refresh_visibility();
        }
        true
    }

    /// Put the box item (and the backdrop's draw item, where it hangs on the shell) where `location` and
    /// `placement` say.
    fn apply_item_transform(&self) {
        let transform = self.item_transform();
        let mut rs = server();
        rs.canvas_item_set_transform(self.box_item, transform);
        if self.backdrop_on_shell()
            && let Some(items) = &self.backdrop
        {
            rs.canvas_item_set_transform(items.draw, transform);
        }
    }

    /// Opacity multiplies into every descendant through the canvas item's inherited modulate.
    pub(crate) fn set_opacity(&mut self, opacity: f32) {
        if self.opacity == opacity {
            return;
        }
        self.opacity = opacity;
        let mut rs = server();
        rs.canvas_item_set_modulate(self.box_item, Color::from_rgba(1.0, 1.0, 1.0, opacity));
        if self.backdrop_on_shell()
            && let Some(items) = &self.backdrop
        {
            rs.canvas_item_set_modulate(items.draw, Color::from_rgba(1.0, 1.0, 1.0, opacity));
        }
        drop(rs);
        // At an opacity the engine draws nothing at, a group would still clear the back buffer and generate its mipmaps.
        if self.group.is_some() {
            self.refresh_visibility();
        }
    }

    /// Re-record the box when `key` differs from what it last drew. Returns true if it did.
    pub(crate) fn record_box(&mut self, key: BoxKey, background: &mut Gd<StyleBoxFlat>) -> bool {
        if self.box_key == Some(key) {
            return false;
        }
        let bounds = Rect2::new(Vector2::ZERO, key.size);
        let mut rs = server();
        rs.canvas_item_clear(self.box_item);
        if let Some(feather) = key.square_feather {
            // The feather reaches half its width past the edge.
            let reach = feather / 2.0;
            rs.canvas_item_set_custom_rect_ex(self.box_item, true)
                .rect(Rect2::new(
                    bounds.position - reach,
                    bounds.size + reach * 2.0,
                ))
                .done();
            drop(rs);
            self.record_square(&key, feather);
            self.box_key = Some(key);
            return true;
        }
        rs.canvas_item_set_custom_rect_ex(self.box_item, true)
            .rect(bounds)
            .done();
        background.set_bg_color(key.background);
        background.set_corner_radius_all(key.radius);
        background.set_aa_size(key.oversampling.feather());
        if key.border_width > 0 && key.is_translucent() && !faults::active(Fault::SingleBorderDraw)
        {
            // `StyleBoxFlat::draw` with a centre fades the ring's inner edge from the fill colour to the border colour
            // (`style_box_flat.cpp:479` and the "ring inner border" gradient after it), which adds the fill a second
            // time along the ring when it is translucent: a one pixel border came out dotted at a device pixel ratio of
            // one and doubled at two. CSS paints the background under the whole border box and the border over it, which
            // is also what this does: the fill alone, then a ring with no centre.
            background.set_draw_center(true);
            background.set_border_width_all(0);
            background.draw(self.box_item, bounds);
            background.set_draw_center(false);
            background.set_border_color(key.border_color);
            background.set_border_width_all(key.border_width);
            background.draw(self.box_item, bounds);
            background.set_draw_center(true);
        } else {
            background.set_border_color(key.border_color);
            background.set_border_width_all(key.border_width);
            background.draw(self.box_item, bounds);
        }
        self.box_key = Some(key);
        true
    }

    /// Draw a box with square corners from feathered triangles: the fill, then the border ring over it, as CSS paints them. Under
    /// an opaque border the fill stops beneath the ring's inner edge, so no fringe of it shows past the outer one.
    fn record_square(&self, key: &BoxKey, feather: Vector2) {
        let outer = square_box::Rect::from_size(key.size);
        let width = key.border_width as f32;
        let ring = key.border_width > 0 && key.border_color.a > 0.0;
        let inner = outer.inset(width);
        if key.background.a > 0.0 {
            let fill = if ring && key.border_color.a >= 1.0 {
                square_box::under_border(outer, inner, feather)
            } else {
                square_box::fill(outer, feather)
            };
            square_box::draw(self.box_item, &fill, key.background);
        }
        if ring {
            square_box::draw(
                self.box_item,
                &square_box::ring(outer, inner, feather),
                key.border_color,
            );
        }
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
        paragraph: Option<&mut StyledParagraph>,
        highlight: impl FnOnce(&StyledParagraph, SelectionPaint) -> Vec<Rect2>,
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
            paragraph.draw(
                self.content_item,
                key.origin,
                key.content_width,
                key.color,
                key.oversampling.factor(),
            );
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
        self.remove_backdrop();
        self.remove_group();
        let mut rs = server();
        if let Some(items) = self.edit_items.take() {
            rs.free_rid(items.text);
            rs.free_rid(items.caret);
        }
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

    /// Draw `style` over `rect`, clipped to `clip` (both in the item's coordinates). With `transform`, `rect` is in
    /// the frame it maps from and the picture is drawn through it, still under the item's clip: the item's
    /// coordinates are the root's, and an element's ring turns with the element.
    pub(crate) fn draw_clipped(
        &self,
        style: &mut Gd<StyleBoxFlat>,
        rect: Rect2,
        clip: Option<Rect2>,
        transform: Option<Affine2>,
    ) {
        let mut rs = server();
        rs.canvas_item_clear(self.item);
        // The clip bounds what is drawn; without one the item's rectangle is the drawing's, in the item's frame.
        let drawn = transform.map_or(rect, |transform| {
            let bounds = transform.bounds_of(crate::geometry::BoxRect {
                x: rect.position.x,
                y: rect.position.y,
                width: rect.size.x,
                height: rect.size.y,
            });
            bounds.godot_rect()
        });
        rs.canvas_item_set_custom_rect_ex(self.item, true)
            .rect(clip.unwrap_or(drawn))
            .done();
        // `clear` resets the clip flag.
        rs.canvas_item_set_clip(self.item, clip.is_some());
        if let Some(transform) = transform {
            rs.canvas_item_add_set_transform(self.item, transform.to_godot());
        }
        style.draw(self.item, rect);
    }

    pub(crate) fn clear(&self) {
        server().canvas_item_clear(self.item);
    }

    /// Move the item (and everything attached to it).
    pub(crate) fn set_position(&self, position: Vector2) {
        server()
            .canvas_item_set_transform(self.item, Transform2D::from_angle_origin(0.0, position));
    }

    /// Multiply the alpha of everything below the item.
    pub(crate) fn set_opacity(&self, opacity: f32) {
        server().canvas_item_set_modulate(self.item, Color::from_rgba(1.0, 1.0, 1.0, opacity));
    }

    pub(crate) fn set_visible(&self, visible: bool) {
        server().canvas_item_set_visible(self.item, visible);
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

    /// The oversampling this root draws at: the level of the last `sync_oversampling`. Every paint path reads it from
    /// here, so a pass draws everything at one level and costs no engine call per node.
    pub(crate) fn oversampling(&self) -> Oversampling {
        self.oversampling
    }

    /// Read the level the root's viewport asks for now. If it is not the level the items were drawn at, mark
    /// every node that draws differently at another level as needing a paint, and return true.
    pub(crate) fn sync_oversampling(&mut self) -> bool {
        let level = self.viewport_oversampling();
        if level == self.oversampling {
            return false;
        }
        self.oversampling = level;
        for (tag, node) in &self.mounted.nodes {
            if node.paints_at_oversampling() {
                self.paint_dirty.insert(*tag);
            }
        }
        true
    }

    /// The viewport's scale changed with no commit, layout or restyle to carry it to the screen (a window moved to
    /// another display, the owner changed `content_scale_factor` or the window's pixel size together, a
    /// `SubViewport` was resized behind a fixed 2D override): paint what depends on it. The engine asks
    /// every `CanvasItem` of the viewport to redraw when the viewport's size or oversampling changes
    /// (`Viewport::_set_size` calls `update_canvas_items`), so this runs on the `DRAW` notification and does nothing when
    /// the level is the one already drawn.
    pub(crate) fn repaint_for_oversampling(&mut self) {
        if self.font.is_some() && self.sync_oversampling() {
            self.paint_pass();
        }
    }

    /// Re-record the canvas items of every node whose paint inputs may have changed, and redraw
    /// the focus ring if its rectangle did. Items whose recorded key still holds are left alone, so
    /// an idle frame records nothing.
    pub(crate) fn paint_pass(&mut self) {
        let started = Instant::now();
        self.sync_oversampling();
        let dirty = std::mem::take(&mut self.paint_dirty);
        let mut changed = !dirty.is_empty();
        for tag in dirty {
            let (boxed, contented) = self.paint_node(tag);
            self.stats.box_records += u64::from(boxed);
            self.stats.content_records += u64::from(contented);
            if contented && !faults::active(Fault::TextUnnoticed) {
                // The text was set to the content's width, so its size may be new: a filtered element that contains it
                // measures its subtree again.
                self.effects.note_changed(tag);
            }
            self.stats.content_records += u64::from(self.paint_text_input(tag));
            // The scrollbars' look (`scrollbar-width`, `scrollbar-color`) is a paint input too.
            self.paint_scroll_overlay(tag);
            self.sync_effects(tag);
        }
        // An effect appearing or going makes the others check whether they sit inside a filter group.
        self.settle_effect_resyncs();
        self.refresh_effect_rects();
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
        self.ensure_raster(tag);
        let oversampling = self.node_oversampling(tag);
        let square_feather = self.node_square_feather(tag);
        let motion = self.sampled.get(&tag).map(|sampled| {
            (
                sampled.opacity,
                sampled.background_color,
                sampled.border_color,
            )
        });
        let text_color = self.presented_text_color(tag);
        let highlight = self.selecting.highlight_of(tag);
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return (false, false);
        };
        let style = &node.computed;
        node.render
            .set_opacity(motion.map_or(style.opacity.unwrap_or(1.0), |(opacity, _, _)| opacity));
        // The clip applies to everything below, so it holds even when the box itself is empty:
        // a closed accordion clips its children to nothing.
        let clip = node
            .clips_content()
            .then(|| node.geometry.padding_box().godot_rect());
        let clip_changed = node.render.set_clip(clip);
        if clip_changed && clip.is_some() {
            self.note_clip_in_turned_frame(tag);
        }
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return (false, false);
        };
        let size = node.geometry.size;
        // `visibility: hidden` paints nothing of the element's own (its children, which may be visible, still
        // paint, clipped as before) and keeps its place in layout.
        if size.x <= 0.0 || size.y <= 0.0 || node.computed.is_invisible() {
            return (node.render.clear_box(), node.render.clear_content());
        }
        let style = &node.computed;
        let background = match motion {
            Some((_, [r, g, b, a], _)) => Color::from_rgba(r, g, b, a),
            None => parse_color(style.background_color.as_deref(), Color::TRANSPARENT_BLACK),
        };
        let border_color = match motion {
            Some((_, _, [r, g, b, a])) => Color::from_rgba(r, g, b, a),
            None => parse_color(style.border_color.as_deref(), Color::TRANSPARENT_BLACK),
        };
        let radius = style.border_radius.unwrap_or(0.0).round() as i32;
        let box_key = BoxKey {
            size,
            background,
            border_color,
            border_width: style.border_width.unwrap_or(0.0).round() as i32,
            radius,
            oversampling: if radius > 0 {
                oversampling
            } else {
                Oversampling::NONE
            },
            square_feather: if radius == 0 { square_feather } else { None },
        };
        let boxed = node.render.record_box(box_key, &mut node.visual.background);
        // A text input draws its own text in the items under its scroll item (`paint_text_input`).
        if node.kind == Kind::TextInput {
            return (boxed, false);
        }
        let contented = match node.visual.paragraph.as_mut() {
            Some(paragraph) => {
                let key = ContentKey {
                    generation: node.visual.generation,
                    color: text_color
                        .unwrap_or_else(|| parse_color(style.color.as_deref(), Color::WHITE)),
                    content_width: node.geometry.content_width(),
                    origin: node.geometry.content_origin(),
                    selection: highlight.map(|range| highlight_paint(style, range)),
                    oversampling,
                };
                let geometry = node.geometry;
                node.render
                    .record_content(key, Some(paragraph), |paragraph, selection| {
                        highlight_rects(paragraph, &geometry, selection.start, selection.end)
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
            // Under a rotation, scale or skew the ring is the border box in the element's own frame, drawn
            // through the map that draws the element, so it turns with it; the clip stays the bounding box
            // the engine clips to.
            let (rect, transform) = match self.mounted.absolute_affine(tag, viewport) {
                Some(affine)
                    if !affine.is_translation() && !faults::active(Fault::TransformRingFlat) =>
                {
                    (
                        Rect2::new(
                            Vector2::ZERO,
                            Vector2::new(rect_size(node)[0], rect_size(node)[1]),
                        ),
                        Some(affine),
                    )
                }
                _ => (rect.godot_rect(), None),
            };
            Some(RingKey {
                rect,
                transform,
                clip: clip.map(BoxRect::godot_rect),
                radius,
                oversampling: if radius > 0 {
                    self.node_oversampling(tag)
                } else {
                    Oversampling::NONE
                },
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
                ring.set_aa_size(key.oversampling.feather());
                item.draw_clipped(ring, key.rect, key.clip, key.transform);
            }
            None => item.clear(),
        }
        true
    }
}

fn rect_size(node: &crate::mount::MountedNode) -> [f32; 2] {
    [node.geometry.size.x, node.geometry.size.y]
}

/// What the focus ring last drew.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct RingKey {
    rect: Rect2,
    /// How the element is drawn when that is more than a move: `rect` is then its border box in its own frame.
    transform: Option<Affine2>,
    clip: Option<Rect2>,
    radius: i32,
    /// Only a rounded ring is antialiased, as for `BoxKey`.
    oversampling: Oversampling,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_device_pixel_per_logical_pixel_is_level_sixty_four() {
        assert_eq!(Oversampling::NONE, Oversampling::from_factor(1.0));
        assert_eq!(Oversampling::NONE.factor(), 1.0);
        assert_eq!(Oversampling::NONE.feather(), 1.0);
    }

    #[test]
    fn a_level_is_what_text_server_keys_its_glyph_cache_by() {
        // `CLAMP(level, 0.1, 100.0) * 64`, truncated (`_reference_oversampling_level`).
        assert_eq!(Oversampling::from_factor(2.0).0, 128);
        assert_eq!(Oversampling::from_factor(1.5).0, 96);
        assert_eq!(Oversampling::from_factor(1.333).0, 85);
        assert_eq!(Oversampling::from_factor(0.0).0, 6);
        assert_eq!(Oversampling::from_factor(1000.0).0, 6400);
    }

    #[test]
    fn text_server_reads_back_the_level_it_was_given() {
        // `_font_draw_glyph` turns the factor it is passed into a level again; a level that did not survive
        // the trip would draw at a different one than the key says.
        for units in 6..=6400_u32 {
            let level = Oversampling(units);
            assert_eq!(Oversampling::from_factor(level.factor()), level, "{units}");
        }
    }

    #[test]
    fn the_feather_is_one_device_pixel_whatever_the_scale() {
        for factor in [1.0_f32, 1.25, 1.5, 2.0, 3.0, 4.0] {
            let level = Oversampling::from_factor(factor);
            assert!(
                (level.feather() * level.factor() - 1.0).abs() < 1e-6,
                "{factor}"
            );
        }
        assert_eq!(Oversampling::from_factor(2.0).feather(), 0.5);
    }
}
