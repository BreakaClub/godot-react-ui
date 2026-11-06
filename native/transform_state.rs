//! The root's side of transforms: keeping each element's evaluated transform (`transform.rs`) in step with
//! its style, the sample Stylo takes while it transitions, and its border box.
//!
//! An element's transform is recomputed when one of three things changes: its computed style, its border
//! box (percentages and the origin are of it), or, while it animates, the sample. None of them re-records or
//! lays out anything; the element's canvas item takes a new transform. An element with no transform is a
//! `None` and nothing here runs for it beyond the check.

use godot::global::godot_error;

use crate::ReactUiRoot;
use crate::transform::{NodeTransform, evaluate};

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

    /// Bring one element's transform up to date with its style, its border box and the sample. Returns whether
    /// it changed; if it did the canvas item moves, and hit testing, rectangles and everything that follows a
    /// geometry change are told.
    pub(crate) fn refresh_transform(&mut self, tag: u32) -> bool {
        let next = self.evaluated_transform(tag, true);
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return false;
        };
        if node.transform == next {
            return false;
        }
        node.transform = next;
        node.render
            .set_placement(next.map(|transform| transform.placement));
        self.hit_stale = true;
        self.effects.note_changed(tag);
        true
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
