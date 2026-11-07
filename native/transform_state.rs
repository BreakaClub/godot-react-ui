//! The root's side of transforms: keeping each element's evaluated transform (`transform.rs`) in step with
//! its style, the sample Stylo takes while it transitions, and its border box.
//!
//! An element's transform is recomputed when one of three things changes: its computed style, its border
//! box (percentages and the origin are of it), or, while it animates, the sample. None of them re-records or
//! lays out anything; the element's canvas item takes a new transform. An element with no transform is a
//! `None` and nothing here runs for it beyond the check.

use std::collections::BTreeSet;

use godot::global::godot_error;

use crate::ReactUiRoot;
use crate::diff::Parent;
use crate::render_tree::Oversampling;
use crate::transform::{Linear2, NodeTransform, evaluate};

/// Text is rasterised at a size, so a transform that scales it needs the glyphs drawn at the scale to stay sharp
/// (`docs/tracks/transforms.md`, "Sharpness"). The scale is rounded up to a multiple of this so that a hover at
/// `scale-105` and one at `scale-110` share a glyph cache (one per size and level is kept, 256 KiB to 4 MiB each).
const RASTER_SCALE_STEP: f32 = 0.125;
/// The smallest raster scale: text shrunk below a quarter is not sharper for being drawn smaller.
const RASTER_SCALE_MIN: f32 = 0.25;

/// What transforms add to the root's state beyond each element's evaluated value.
#[derive(Default)]
pub(crate) struct TransformRoot {
    /// Elements that have a transform that does something. While none does, nothing here costs anything.
    transformed: BTreeSet<u32>,
    /// Elements whose sampled transform is not yet the style's: a transition is running. Under one the text keeps the
    /// raster it had, as a browser's compositor keeps a layer's, and is drawn again at the new scale once it
    /// settles.
    animating: BTreeSet<u32>,
    /// Elements that clip (`overflow`) in a frame a transform rotates or skews, already reported.
    turned_clips: BTreeSet<u32>,
}

/// `scale` as the factor to rasterise at: rounded up to a step, and not below the minimum.
fn raster_factor(scale: f32) -> f32 {
    if !scale.is_finite() || scale <= 0.0 {
        return 1.0;
    }
    ((scale / RASTER_SCALE_STEP).ceil() * RASTER_SCALE_STEP).max(RASTER_SCALE_MIN)
}

impl ReactUiRoot {
    /// The transform `tag` presents now, or `None` when it has none that does something. `sampled` says to read the
    /// value Stylo is animating, where there is one, and not the style's.
    pub(crate) fn evaluated_transform(&self, tag: u32, sampled: bool) -> Option<NodeTransform> {
        let node = self.mounted.nodes.get(&tag)?;
        let animated = sampled.then(|| self.sampled.get(&tag)).flatten();
        let authored;
        let list = match animated {
            Some(sample) => &sample.transform,
            None => {
                if !node.computed.has_transform() {
                    return None;
                }
                authored = node.computed.transform_list();
                authored.computed()
            }
        };
        if list.0.is_empty() {
            return None;
        }
        match evaluate(
            list,
            node.computed.transform_origin.as_ref(),
            node.geometry.size,
        ) {
            Ok(value) => (!value.is_identity()).then_some(value),
            Err(error) => {
                godot_error!("ReactUiRoot: node {tag} keeps no transform: {error}");
                None
            }
        }
    }

    /// Bring one element's transform up to date with its style, its border box and the sample. Returns whether it
    /// changed; if it did the canvas item moves, and hit testing, rectangles and everything that follows a
    /// geometry change are told.
    pub(crate) fn refresh_transform(&mut self, tag: u32) -> bool {
        let next = self.evaluated_transform(tag, true);
        let animating = self.transform_is_animating(tag);
        let animation_changed = if animating {
            self.transform_root.animating.insert(tag)
        } else {
            self.transform_root.animating.remove(&tag)
        };
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return false;
        };
        let changed = node.transform != next;
        if changed {
            let turned_before = node
                .transform
                .is_some_and(|transform| !transform.placement.affine.linear.keeps_axes());
            node.transform = next;
            node.render
                .set_placement(next.map(|transform| transform.placement));
            if next.is_some() {
                self.transform_root.transformed.insert(tag);
            } else {
                self.transform_root.transformed.remove(&tag);
            }
            self.hit_stale = true;
            self.effects.note_changed(tag);
            let turned_now =
                next.is_some_and(|transform| !transform.placement.affine.linear.keeps_axes());
            if turned_now && !turned_before {
                self.report_turned_clips(tag);
            }
        }
        // The text under it is drawn again at the new scale once the transition has settled, not on every frame of it.
        if (changed || animation_changed) && !self.transform_chain_animating(tag) {
            self.settle_raster(tag);
        }
        changed
    }

    /// Whether the sampled transform of `tag` is not yet the style's: a transition is running on it.
    fn transform_is_animating(&self, tag: u32) -> bool {
        let Some(sample) = self.sampled.get(&tag) else {
            return false;
        };
        let Some(node) = self.mounted.nodes.get(&tag) else {
            return false;
        };
        if sample.transform.0.is_empty() && !node.computed.has_transform() {
            return false;
        }
        sample.transform != *node.computed.transform_list().computed()
    }

    /// Whether `tag` or a paint ancestor of it has a transform transition running.
    fn transform_chain_animating(&self, tag: u32) -> bool {
        if self.transform_root.animating.is_empty() {
            return false;
        }
        let mut current = Some(tag);
        while let Some(node) = current {
            if self.transform_root.animating.contains(&node) {
                return true;
            }
            current = match self
                .mounted
                .nodes
                .get(&node)
                .and_then(|node| node.paint_parent)
            {
                Some(Parent::Node(parent)) => Some(parent),
                Some(Parent::Layer(_)) | None => None,
            };
        }
        false
    }

    /// The oversampling `tag`'s text, rounded corners and scroll bar ends are drawn at: the viewport's times the scale a
    /// transform puts on them (so a `scale-150` label is sharp, not a magnified small raster), as it was when the
    /// transforms above it last settled.
    pub(crate) fn node_oversampling(&self, tag: u32) -> Oversampling {
        let base = self.oversampling();
        if self.transform_root.transformed.is_empty() {
            return base;
        }
        match self
            .mounted
            .nodes
            .get(&tag)
            .and_then(|node| node.raster_scale)
        {
            Some(scale) if scale != 1.0 => Oversampling::from_factor(base.factor() * scale),
            _ => base,
        }
    }

    /// Give `tag` the raster scale of the frame it is drawn in, if it has none yet (a node mounted under a transform).
    pub(crate) fn ensure_raster_scale(&mut self, tag: u32) {
        if self.transform_root.transformed.is_empty() {
            return;
        }
        let missing = self
            .mounted
            .nodes
            .get(&tag)
            .is_some_and(|node| node.raster_scale.is_none());
        if !missing || self.transform_chain_animating(tag) {
            return;
        }
        let scale = self
            .mounted
            .absolute_affine(tag, self.viewport_box())
            .map_or(1.0, |affine| raster_factor(affine.linear.scale_factor()));
        if let Some(node) = self.mounted.nodes.get_mut(&tag) {
            node.raster_scale = Some(scale);
        }
    }

    /// Recompute the raster scale of `tag` and everything it paints. What drew at another scale is drawn again.
    fn settle_raster(&mut self, tag: u32) {
        let parent = self
            .mounted
            .absolute_parent_affine(tag, self.viewport_box())
            .map_or(Linear2::IDENTITY, |affine| affine.linear);
        let mut stack = vec![(tag, parent)];
        while let Some((current, parent_linear)) = stack.pop() {
            let Some(node) = self.mounted.nodes.get_mut(&current) else {
                continue;
            };
            let linear = node
                .transform
                .map_or(Linear2::IDENTITY, |transform| {
                    transform.placement.affine.linear
                })
                .then(&parent_linear);
            let scale = raster_factor(linear.scale_factor());
            if node.raster_scale != Some(scale) {
                node.raster_scale = Some(scale);
                if node.paints_at_oversampling() {
                    self.paint_dirty.insert(current);
                }
            }
            for child in &node.paint_children {
                stack.push((*child, linear));
            }
        }
    }

    /// One `ERROR` per element that clips its content (`overflow`) in a frame that `tag`'s transform now rotates or
    /// skews: the engine clips to the bounding box of the rotated rectangle, so content past the rotated shape but
    /// inside its box shows. It is not hidden or redrawn; it is said.
    fn report_turned_clips(&mut self, tag: u32) {
        let mut stack = vec![tag];
        while let Some(current) = stack.pop() {
            let Some(node) = self.mounted.nodes.get(&current) else {
                continue;
            };
            if node.clips_content() && self.transform_root.turned_clips.insert(current) {
                godot_error!(
                    "ReactUiRoot: node {current} clips its content (overflow) in a frame that a transform rotates or skews. Godot clips to the bounding box of the rotated rectangle, so content outside the rotated shape but inside its box is drawn (hit testing is exact). Translate, scale, mirror and quarter-turn clips are exact; rotate the content of the clip, not the clip."
                );
            }
            stack.extend(node.paint_children.iter().copied());
        }
    }

    /// An element that clips in a frame that is already turned (it was mounted or began to clip after the rotation).
    pub(crate) fn note_clip_in_turned_frame(&mut self, tag: u32) {
        if self.transform_root.transformed.is_empty()
            || self.transform_root.turned_clips.contains(&tag)
        {
            return;
        }
        let turned = self
            .mounted
            .absolute_affine(tag, self.viewport_box())
            .is_some_and(|affine| !affine.linear.keeps_axes());
        if turned {
            self.transform_root.turned_clips.insert(tag);
            godot_error!(
                "ReactUiRoot: node {tag} clips its content (overflow) in a frame that a transform rotates or skews. Godot clips to the bounding box of the rotated rectangle, so content outside the rotated shape but inside its box is drawn (hit testing is exact). Translate, scale, mirror and quarter-turn clips are exact; rotate the content of the clip, not the clip."
            );
        }
    }

    /// Forget what is kept for a deleted element.
    pub(crate) fn forget_transform(&mut self, tag: u32) {
        self.transform_root.transformed.remove(&tag);
        self.transform_root.animating.remove(&tag);
        self.transform_root.turned_clips.remove(&tag);
    }

    /// The six numbers of the matrix `tag` presents (`sampled`) or is heading to, about its origin, for the
    /// transition records; the identity for an element with no transform.
    pub(crate) fn transform_numbers(&self, tag: u32, sampled: bool) -> [f32; 6] {
        self.evaluated_transform(tag, sampled)
            .map_or(crate::transform::Affine2::IDENTITY, |value| {
                value.placement.affine
            })
            .to_array()
    }
}

/// Whether two styles' transforms differ in anything an element must be re-evaluated for.
pub(crate) fn transform_changed(
    old: &crate::props::StyleSpec,
    new: &crate::props::StyleSpec,
) -> bool {
    old.transform_origin != new.transform_origin
        || old.has_transform() != new.has_transform()
        || (new.has_transform() && old.transform_list() != new.transform_list())
}
