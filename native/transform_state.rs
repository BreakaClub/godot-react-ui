//! The root's side of transforms: keeping each element's evaluated transform (`transform.rs`) in step with
//! its style, the sample Stylo takes while it transitions, and its border box.
//!
//! An element's transform is recomputed when one of three things changes: its computed style, its border
//! box (percentages and the origin are of it), or, while it animates, the sample. None of them re-records or
//! lays out anything; the element's canvas item takes a new transform. An element with no transform is a
//! `None` and nothing here runs for it beyond the check.

use std::collections::BTreeSet;

use godot::global::godot_error;

use godot::prelude::Vector2;

use crate::ReactUiRoot;
use crate::diff::Parent;
use crate::filter_faults::{self as faults, Fault};
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

/// What a transform makes of how an element is rasterised, from the accumulated linear map of its frame.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Raster {
    /// The factor text, rounded corners and scroll bar ends are rasterised at, on top of the viewport's: the larger column of
    /// the map, rounded up (so a glyph is at least as fine as the stretched axis wants).
    pub scale: f32,
    /// A box with square corners is drawn from feathered triangles (`square_box.rs`), because `StyleBoxFlat` antialiases only a
    /// rounded or skewed box and its edges are not on pixels once the map is more than a move.
    pub soften_squares: bool,
    /// How long, along the element's own x and y, that box's feather is for it to be one device pixel across its edges there, in
    /// units of one viewport device pixel ([`Linear2::edge_feather`]). The triangles can be feathered per axis; `StyleBoxFlat` cannot
    /// (one `anti_aliasing_size`), so a rounded corner keeps the feather of [`Self::scale`], exact on the stretched axis (see
    /// "Against Chrome" in `docs/tracks/transforms.md` for what widening it for the squeezed one costs).
    pub edge_feather: Vector2,
}

impl Raster {
    pub(crate) fn of(linear: &Linear2) -> Raster {
        // A collapsed map paints nothing, so what its feather is does not matter.
        let (x, y) = linear.edge_feather().unwrap_or((1.0, 1.0));
        Raster {
            scale: raster_factor(linear.scale_factor()),
            soften_squares: *linear != Linear2::IDENTITY,
            edge_feather: Vector2::new(x, y),
        }
    }
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
        if self.transform_root.transformed.is_empty()
            || faults::active(Fault::TransformRasterUnscaled)
        {
            return base;
        }
        match self.mounted.nodes.get(&tag).and_then(|node| node.raster) {
            Some(raster) if raster.scale != 1.0 => {
                Oversampling::from_factor(base.factor() * raster.scale)
            }
            _ => base,
        }
    }

    /// The feather, along the element's own x and y, of `tag`'s box if it has square corners and is to be drawn from feathered
    /// triangles ([`Raster::soften_squares`]); `None` when it is not.
    pub(crate) fn node_square_feather(&self, tag: u32) -> Option<Vector2> {
        if self.transform_root.transformed.is_empty() || faults::active(Fault::TransformSquaresHard)
        {
            return None;
        }
        let raster = self.mounted.nodes.get(&tag)?.raster?;
        if !raster.soften_squares {
            return None;
        }
        let device_pixel = self.oversampling().feather();
        // The fault is the feather of one length, sized by the stretched axis, as `StyleBoxFlat` has it.
        Some(if faults::active(Fault::TransformFeatherUniform) {
            Vector2::splat(device_pixel / raster.scale)
        } else {
            raster.edge_feather * device_pixel
        })
    }

    /// Give `tag` the raster of the frame it is drawn in, if it has none yet (a node mounted under a transform).
    pub(crate) fn ensure_raster(&mut self, tag: u32) {
        if self.transform_root.transformed.is_empty() {
            return;
        }
        let missing = self
            .mounted
            .nodes
            .get(&tag)
            .is_some_and(|node| node.raster.is_none());
        if !missing || self.transform_chain_animating(tag) {
            return;
        }
        let raster = self
            .mounted
            .absolute_affine(tag, self.viewport_box())
            .map(|affine| Raster::of(&affine.linear));
        if let Some(node) = self.mounted.nodes.get_mut(&tag) {
            node.raster = raster;
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
            let raster = Raster::of(&linear);
            if node.raster != Some(raster) {
                node.raster = Some(raster);
                // What is drawn from it (text, a feather, the choice of how a square box is drawn) is re-recorded if its key says
                // it changed; most nodes' keys do not.
                self.paint_dirty.insert(current);
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

#[cfg(test)]
mod tests {
    use godot::prelude::Vector2;

    use super::*;
    use crate::transform::{TransformList, evaluate};

    fn raster_of(css: &str) -> Raster {
        let list = TransformList::parse(css).expect(css);
        let value = evaluate(list.computed(), None, Vector2::new(100.0, 50.0)).expect(css);
        Raster::of(&value.placement.affine.linear)
    }

    #[test]
    fn an_untransformed_frame_is_one_to_one_and_keeps_square_boxes_on_the_pixel_grid() {
        let raster = Raster::of(&Linear2::IDENTITY);
        assert_eq!(raster.scale, 1.0);
        assert_eq!(raster.edge_feather, Vector2::new(1.0, 1.0));
        assert!(!raster.soften_squares);
    }

    #[test]
    fn a_turned_or_scaled_frame_softens_square_boxes_and_a_turn_keeps_a_pixel_a_pixel() {
        for css in [
            "rotate(30deg)",
            "rotate(-77deg)",
            "scale(0.5) rotate(45deg)",
        ] {
            let raster = raster_of(css);
            assert!(raster.soften_squares, "{css}");
        }
        let turned = raster_of("rotate(30deg)");
        assert!(
            (turned.edge_feather.x - 1.0).abs() < 1e-5
                && (turned.edge_feather.y - 1.0).abs() < 1e-5
        );
        let doubled = raster_of("scale(2)");
        assert!(
            (doubled.edge_feather.x - 0.5).abs() < 1e-5
                && (doubled.edge_feather.y - 0.5).abs() < 1e-5
        );
    }

    /// `rotateX(50deg)` squeezes y to 0.643 and leaves x: the box's feather is a pixel on each axis, which is longer than a pixel's
    /// length on y, where a feather of one length sized for x is 0.64 of a pixel and a straight edge comes out hard.
    #[test]
    fn a_squeezed_axis_gets_a_longer_feather_and_the_stretched_one_keeps_its_own() {
        let raster = raster_of("rotateX(50deg)");
        let squeeze = 50.0_f32.to_radians().cos();
        assert!(
            (raster.edge_feather.x - 1.0).abs() < 1e-5,
            "{:?}",
            raster.edge_feather
        );
        assert!(
            (raster.edge_feather.y - 1.0 / squeeze).abs() < 1e-4,
            "{:?}",
            raster.edge_feather
        );
        // The raster of text is still the stretched axis's.
        assert_eq!(raster.scale, 1.0);
    }

    #[test]
    fn a_collapsed_map_has_a_harmless_feather() {
        let raster = Raster::of(&Linear2 {
            a: 0.0,
            b: 0.0,
            c: 0.0,
            d: 0.0,
        });
        assert_eq!(raster.edge_feather, Vector2::new(1.0, 1.0));
    }
}
