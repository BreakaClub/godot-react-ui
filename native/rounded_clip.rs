//! Rounded clipping: an element that clips its content (`overflow` other than `visible`) and has rounded corners clips its
//! content and its children to its rounded padding box, as CSS does, for paint and for hit testing.
//!
//! Paint: the content item is given a parent, the mask item, which draws the rounded padding box and is a `CLIP_ONLY` canvas
//! group (Godot's `CanvasItem.clip_children`): the renderer copies the screen under the group into the back buffer, draws the
//! content over the copy there, and then draws the mask's shape with what the back buffer holds, so the content shows inside the
//! shape and in proportion to its antialiased edge, and what was on the screen shows outside it. The rectangular clip of the
//! content item stays (it bounds what is drawn and culled), so the rounded clip only ever takes away. It is one extra copy and
//! one extra pass of the content's area a frame, on the GPU, for each rounded clip on screen; a square clip costs nothing more
//! than it did. The mask's shape is drawn in the element's own frame, so a rotated or skewed rounded clip is exact (a square one
//! under a rotation is still the bounding box of the rotated rectangle, `transform_state.rs`).
//!
//! Godot's canvas groups do not nest, and inside one a copy of the screen (a `backdrop-filter`) reads the group's own buffer. So a
//! rounded clip gives way, and clips to its rectangle, when it is inside a filter group or another rounded clip, or when an element
//! inside it has a `filter` or a `backdrop-filter` (which keeps its effect). The snapshot says so and why (`roundedClip: "rect"`,
//! `roundedClipReason`); it is not logged, because everything is still drawn, only with square inner corners, and nested rounded
//! scroll lists and cards are ordinary layouts (a filter that cannot be drawn is an error, `filter_render.rs`). Hit testing is rounded
//! in every case.

use std::collections::{BTreeMap, BTreeSet};


use crate::ReactUiRoot;
use crate::box_paint::BorderKey;
use crate::diff::Parent;
use crate::mount::MountedNode;
use crate::props::OverflowSpec;
use crate::render_tree::MaskKey;
use crate::rrect::RRect;

/// The rounded clips of a root.
#[derive(Default)]
pub(crate) struct RoundedClips {
    /// Elements that clip with rounded corners, drawn rounded or not.
    wanted: BTreeSet<u32>,
    /// Those of them whose clip is drawn rounded (a mask).
    masked: BTreeSet<u32>,
    /// Why each of the others gave way and is drawn as its rectangle, for the snapshot (`roundedClipReason`). It is not logged:
    /// nested rounded scroll lists and cards are ordinary layouts, and everything in them is still drawn.
    gave_way: BTreeMap<u32, String>,
}

/// Why a rounded clip is drawn as its rectangle.
enum GivesWay {
    /// The element itself, or a paint ancestor, has a filter group.
    Filter(u32),
    /// A paint ancestor clips with rounded corners.
    RoundedAncestor(u32),
    /// A paint descendant has a filter or a backdrop filter.
    EffectInside(u32),
}

impl GivesWay {
    fn describe(&self, tag: u32) -> String {
        match *self {
            GivesWay::Filter(other) if other == tag => "it has a filter".to_string(),
            GivesWay::Filter(other) => format!("it is inside node {other}, which has a filter"),
            GivesWay::RoundedAncestor(other) => {
                format!("it is inside node {other}, which clips with rounded corners too")
            }
            GivesWay::EffectInside(other) => {
                format!("node {other} inside it has a filter or a backdrop-filter")
            }
        }
    }
}

impl MountedNode {
    /// The rounded padding box this element clips to, in its own logical pixels, with the widths and radii rounded to whole
    /// pixels as its border is drawn; `None` when it does not clip or its padding box has square corners. Only an `overflow` the
    /// author set makes a clip rounded: a `TextInput`'s own clip of its text (which it has whatever its `overflow`) stays its
    /// rectangle, so a form of rounded fields costs no canvas groups.
    pub(crate) fn rounded_clip(&self) -> Option<RRect> {
        let authored = [self.computed.overflow_x, self.computed.overflow_y]
            .into_iter()
            .flatten()
            .any(OverflowSpec::clips);
        if !authored || !self.clips_content() {
            return None;
        }
        let border = BorderKey::new(
            self.computed.border_widths(),
            [godot::prelude::Color::TRANSPARENT_BLACK; 4],
            self.computed.border_radii(),
        );
        let size = self.geometry.size;
        let padding = RRect::from_box(size.x, size.y, border.radii.map(|radius| radius as f32))
            .padding_box(border.widths.map(|width| width as f32));
        (padding.is_rounded() && padding.width() > 0.0 && padding.height() > 0.0).then_some(padding)
    }
}

impl ReactUiRoot {
    /// Note whether `tag` clips with rounded corners; the paint pass settles how it is drawn ([`Self::settle_rounded_clips`]).
    pub(crate) fn note_rounded_clip(&mut self, tag: u32, rounded: bool) {
        if rounded {
            self.rounded_clips.wanted.insert(tag);
        } else if self.rounded_clips.wanted.remove(&tag) {
            self.rounded_clips.gave_way.remove(&tag);
        }
    }

    pub(crate) fn forget_rounded_clip(&mut self, tag: u32) {
        self.rounded_clips.wanted.remove(&tag);
        self.rounded_clips.masked.remove(&tag);
        self.rounded_clips.gave_way.remove(&tag);
    }

    /// Whether `tag`'s clip is drawn rounded now: `Some(true)` as a mask, `Some(false)` as its rectangle because it gave way, `None`
    /// when it has no rounded clip.
    pub(crate) fn rounded_clip_drawn(&self, tag: u32) -> Option<bool> {
        self.rounded_clips
            .wanted
            .contains(&tag)
            .then(|| self.rounded_clips.masked.contains(&tag))
    }

    /// Why `tag`'s rounded clip is drawn as its rectangle, if it is.
    pub(crate) fn rounded_clip_reason(&self, tag: u32) -> Option<&str> {
        self.rounded_clips.gave_way.get(&tag).map(String::as_str)
    }

    /// How many rounded clips are drawn as masks.
    pub(crate) fn masked_clip_count(&self) -> usize {
        self.rounded_clips.masked.len()
    }

    /// Give each rounded clip its mask, or take it away where the clip gives way. Runs after the paint pass's effects are settled,
    /// and costs a walk up the paint tree per rounded clip and per effect; a tree with no rounded clip does nothing. Returns
    /// whether a mask was drawn again.
    pub(crate) fn settle_rounded_clips(&mut self) -> bool {
        if self.rounded_clips.wanted.is_empty() && self.rounded_clips.masked.is_empty() {
            return false;
        }
        // The rounded clips that hold an effect: every rounded ancestor of every effect.
        let mut holding_effect: BTreeSet<u32> = BTreeSet::new();
        let effects: Vec<u32> = self.effect_elements().collect();
        for effect in &effects {
            for ancestor in self.paint_ancestors(*effect) {
                if self.rounded_clips.wanted.contains(&ancestor) {
                    holding_effect.insert(ancestor);
                }
            }
        }
        let mut changed = false;
        let wanted: Vec<u32> = self.rounded_clips.wanted.iter().copied().collect();
        for tag in wanted {
            let gives_way = self.gives_way(tag, &holding_effect, &effects);
            let key = match gives_way {
                Some(reason) => {
                    self.rounded_clips.gave_way.insert(tag, reason.describe(tag));
                    None
                }
                None => {
                    self.rounded_clips.gave_way.remove(&tag);
                    self.mask_key(tag)
                }
            };
            let Some(node) = self.mounted.nodes.get_mut(&tag) else {
                continue;
            };
            if node.render.set_mask(key) {
                self.stats.mask_records += 1;
                changed = true;
            }
            if key.is_some() {
                self.rounded_clips.masked.insert(tag);
            } else {
                self.rounded_clips.masked.remove(&tag);
            }
        }
        // A clip that stopped being rounded lost its mask in its own paint (`paint_node`).
        let stale: Vec<u32> = self
            .rounded_clips
            .masked
            .difference(&self.rounded_clips.wanted)
            .copied()
            .collect();
        for tag in stale {
            self.rounded_clips.masked.remove(&tag);
            if let Some(node) = self.mounted.nodes.get_mut(&tag)
                && node.render.set_mask(None)
            {
                self.stats.mask_records += 1;
                changed = true;
            }
        }
        changed
    }

    fn gives_way(&self, tag: u32, holding_effect: &BTreeSet<u32>, effects: &[u32]) -> Option<GivesWay> {
        if self.has_filter_group(tag) {
            return Some(GivesWay::Filter(tag));
        }
        for ancestor in self.paint_ancestors(tag) {
            if self.has_filter_group(ancestor) {
                return Some(GivesWay::Filter(ancestor));
            }
            if self.rounded_clips.wanted.contains(&ancestor) {
                return Some(GivesWay::RoundedAncestor(ancestor));
            }
        }
        if holding_effect.contains(&tag) {
            let inside = effects
                .iter()
                .copied()
                .find(|effect| self.paint_ancestors(*effect).any(|ancestor| ancestor == tag))
                .expect("a clip that holds an effect has one inside it");
            return Some(GivesWay::EffectInside(inside));
        }
        None
    }

    /// The paint ancestors of `tag`, nearest first.
    fn paint_ancestors(&self, tag: u32) -> impl Iterator<Item = u32> + '_ {
        std::iter::successors(Some(tag), |current| {
            match self.mounted.nodes.get(current)?.paint_parent? {
                Parent::Node(parent) => Some(parent),
                Parent::Layer(_) => None,
            }
        })
        .skip(1)
    }

    fn mask_key(&self, tag: u32) -> Option<MaskKey> {
        let node = self.mounted.nodes.get(&tag)?;
        node.rounded_clip()?;
        let border = BorderKey::new(
            node.computed.border_widths(),
            [godot::prelude::Color::TRANSPARENT_BLACK; 4],
            node.computed.border_radii(),
        );
        Some(MaskKey {
            size: node.geometry.size,
            borders: border.widths,
            radii: border.radii,
            oversampling: self.node_oversampling(tag),
            feather: self.node_box_feather(tag),
        })
    }
}
