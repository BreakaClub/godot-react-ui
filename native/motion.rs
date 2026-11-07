//! Native transition bookkeeping: Stylo sampling, intrinsic `0 <-> auto` tracks and
//! presentation overrides for `ReactUiRoot`, keyed by tag.
//!
//! Only nodes whose computed style has a `transition` (the "motion nodes") are mirrored into Stylo
//! and sampled; every other node's presentation is its computed style. A style change reaches this
//! module as a [`StyleChange`]: from a commit, from a hover/focus/active state change, or from a
//! viewport resize across a breakpoint.
use std::collections::{BTreeMap, BTreeSet};
use std::time::Instant;

use godot::prelude::*;
use serde::Serialize;
use serde_json::json;
use taffy::prelude::Size;

use crate::computed_style::{ComputedStyle, StyleChange, StyleTree};
use crate::diff::Parent;
use crate::filter::FilterList;
use crate::layout::compute_tree;
use crate::paint::parse_color;
use crate::profile::{Sample, micros};
use crate::props::{
    Dimension, DisplaySpec, FlexDirectionSpec, InterpolateSize, OverflowSpec, StyleSpec,
    TransitionProperty,
};
use crate::style_engine::{DimensionAxis, DimensionOverrides, blocked_properties, current_color};
use crate::text_style::TextStyle;
use crate::{MILLISECONDS_PER_SECOND, ReactUiRoot, TextContext};

const HEX_COLOR_CHANNEL_MAX: f32 = 255.0;
const PERCENTAGE_SCALE: f32 = 100.0;

#[derive(Clone)]
pub(crate) struct IntrinsicTrack {
    target_px: f32,
    content_generation: u64,
    parent_basis: Vector2,
    measured_width: f32,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub(crate) enum MotionValue {
    Number(f32),
    Color(String),
    /// A filter list as CSS text.
    Filter(String),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TransitionRecord {
    id: u32,
    property: TransitionProperty,
    current: MotionValue,
    target: MotionValue,
    started_at_ms: f64,
    duration_ms: f64,
}

/// Why a style change cannot be animated: the axis it concerns and a message for the author.
pub(crate) struct MotionViolation {
    axis: DimensionAxis,
    message: String,
}

impl ReactUiRoot {
    pub(crate) fn clock_seconds(&self) -> f64 {
        self.clock_ms / MILLISECONDS_PER_SECOND
    }

    /// Whether native still has motion to advance: a Stylo transition or an intrinsic track.
    pub(crate) fn motion_active(&self) -> bool {
        self.style_engine.is_animating() || !self.intrinsic.is_empty()
    }

    pub(crate) fn activity_json(&self) -> serde_json::Value {
        json!({"batches":self.stats.batches,"layoutPasses":self.stats.layout_passes,
            "paintPasses":self.stats.paint_passes,"animationFrames":self.stats.animation_frames,
            "animating":self.motion_active(),"trackedTransitions":self.transitions.len(),"clockMs":self.clock_ms,
            "drawSerial":self.stats.paint_passes,"nodeCount":self.stats.node_count,
            "mutations":self.stats.mutations,"nodesUpdated":self.stats.nodes_updated,
            "nodesRestyled":self.stats.nodes_restyled,"boxRecords":self.stats.box_records,
            "contentRecords":self.stats.content_records,"effects":self.effects_activity()})
    }

    /// The opacity, background colour and size a node is presenting right now.
    pub(crate) fn presentation_json(&self, tag: u32) -> serde_json::Value {
        let node = &self.mounted.nodes[&tag];
        let sampled = self.sampled.get(&tag);
        let layout_style = self
            .tree
            .style(node.layout)
            .expect("snapshot layout node exists");
        json!({"width":node.geometry.size.x,"height":node.geometry.size.y,
            "widthIsAuto":layout_style.size.width.is_auto(),"heightIsAuto":layout_style.size.height.is_auto(),
            "opacity":sampled.map(|v|v.opacity).unwrap_or(node.computed.opacity.unwrap_or(1.0)),
            "backgroundColor":sampled.map(|v|color_hex(v.background_color)).unwrap_or_else(||
                color_hex(color_components(parse_color(node.computed.background_color.as_deref(), Color::TRANSPARENT_BLACK))))})
    }

    /// The size of the box a node's percentages resolve against: its parent's content box.
    fn parent_basis(&self, tag: u32) -> Vector2 {
        let Some(Parent::Node(parent)) = self.mounted.nodes[&tag].parent else {
            return self.viewport_size;
        };
        let geometry = &self.mounted.nodes[&parent].geometry;
        Vector2::new(
            (geometry.size.x
                - geometry.padding.left
                - geometry.padding.right
                - geometry.border.left
                - geometry.border.right)
                .max(0.0),
            (geometry.size.y
                - geometry.padding.top
                - geometry.padding.bottom
                - geometry.border.top
                - geometry.border.bottom)
                .max(0.0),
        )
    }

    /// Drop everything motion keeps for a deleted node.
    pub(crate) fn forget_motion(&mut self, tag: u32) {
        self.intrinsic.retain(|(id, _), _| *id != tag);
        self.overrides.remove(&tag);
        self.transitions.retain(|(id, _), _| *id != tag);
        self.motion_nodes.remove(&tag);
        self.sampled.remove(&tag);
    }

    /// Reject a style change motion cannot animate, before the commit that causes it is mounted.
    pub(crate) fn validate_motion<T: StyleTree>(
        &self,
        tree: &T,
        changes: &[StyleChange],
    ) -> Result<(), String> {
        for change in changes {
            let (Some(previous), Some(node)) =
                (&change.previous, self.mounted.nodes.get(&change.tag))
            else {
                continue;
            };
            let Some(next) = tree.computed(change.tag) else {
                continue;
            };
            if !node.geometry.laid_out {
                continue;
            }
            if let Some(violation) = motion_violation(tree, change.tag, previous, next) {
                return Err(violation.message);
            }
        }
        Ok(())
    }

    /// Publish a set of computed-style changes: update the Taffy styles, paragraphs and Stylo
    /// document, start the transitions they cause, then lay out and paint. Every path that changes
    /// a node's computed style (hover/focus, resize) ends here.
    pub(crate) fn publish_style_changes(&mut self, changes: &[StyleChange]) {
        self.publish(changes, false);
        self.settle_selection(false);
        self.note_accessibility_restyle(changes);
    }

    /// Publish a commit. `structure_changed` says some child list changed, which needs a layout
    /// and paint pass even when no node's computed style did (a keyed reorder, a removal).
    pub(crate) fn publish_commit(&mut self, changes: &[StyleChange], structure_changed: bool) {
        self.publish(changes, structure_changed);
    }

    fn publish(&mut self, changes: &[StyleChange], structure_changed: bool) {
        let pending_text = std::mem::take(&mut self.pending_text);
        if changes.is_empty() && pending_text.is_empty() && !structure_changed {
            return;
        }
        self.stats.nodes_restyled += changes.len() as u64;
        self.note_selection_restyle(changes);
        self.sync_gained_transitions(changes);
        let mut changed = Vec::new();
        let mut intrinsic_changes = Vec::new();
        let mut immediate: BTreeSet<(u32, DimensionAxis)> = BTreeSet::new();
        for change in changes {
            let Some(node) = self.mounted.nodes.get(&change.tag) else {
                continue;
            };
            let Some(previous) = &change.previous else {
                continue;
            };
            let next = &node.computed;
            let Some(transition) = &next.transition else {
                continue;
            };
            if transition.duration_ms == 0.0 || !node.geometry.laid_out {
                continue;
            }
            let violation = motion_violation(&self.mounted, change.tag, previous, next);
            if let Some(violation) = &violation {
                // A commit is validated before it is mounted, so this is a state change (hover,
                // focus, a breakpoint) that cannot be rejected: apply it without animation.
                godot_error!(
                    "ReactUiRoot: node {} changes without a transition: {}",
                    change.tag,
                    violation.message
                );
                immediate.insert((change.tag, violation.axis));
            }
            for property in &transition.properties {
                if !property_changed(previous, next, *property) {
                    continue;
                }
                if let Some(axis) = property_axis(*property) {
                    if violation.as_ref().is_some_and(|v| v.axis == axis) {
                        continue;
                    }
                    let old = dimension_value(previous, axis);
                    let new = dimension_value(next, axis);
                    if is_auto(&old) || is_auto(&new) {
                        if effective_interpolate_size(next) != InterpolateSize::AllowKeywords {
                            continue;
                        }
                        intrinsic_changes.push((change.tag, axis));
                    }
                }
                changed.push((change.tag, *property, transition.duration_ms));
            }
        }
        // Prime only keyword boundaries; ordinary numeric/color interpolation and
        // interruption/reversal remain entirely inside Stylo.
        for (tag, axis) in &intrinsic_changes {
            if !self.intrinsic.contains_key(&(*tag, *axis)) {
                let size = self.mounted.nodes[tag].geometry.size;
                let current = match axis {
                    DimensionAxis::Width => size.x,
                    DimensionAxis::Height => size.y,
                };
                self.style_engine
                    .prime_dimension(*tag, *axis, current, self.clock_seconds())
                    .expect("validated intrinsic prime");
            }
        }

        let mut rebuilt = BTreeSet::new();
        for change in changes {
            self.apply_authored_style(change, &mut rebuilt);
        }
        for tag in pending_text {
            if rebuilt.insert(tag) {
                self.refresh_paragraph(tag);
            }
        }

        // New content is present in native measurement contexts, but no geometry has been
        // published or drawn from this target-only state.
        for (tag, axis) in intrinsic_changes {
            let target_px = self.measure_endpoint(tag, axis);
            set_override(&mut self.overrides, tag, axis, Some(target_px));
            let parent_basis = self.parent_basis(tag);
            let measured_width = self.mounted.nodes[&tag].geometry.size.x;
            self.intrinsic.insert(
                (tag, axis),
                IntrinsicTrack {
                    target_px,
                    content_generation: self.content_generation,
                    parent_basis,
                    measured_width,
                },
            );
        }
        let tags = self.style_engine_tags(changes);
        self.update_style_engine(&tags, &immediate);
        self.apply_presentation();
        self.flush_layout();
        for (tag, property, duration_ms) in changed {
            let current = self.current_motion_value(tag, property);
            let target = self.target_motion_value(tag, property);
            if current != target {
                self.transitions.insert(
                    (tag, property),
                    TransitionRecord {
                        id: tag,
                        property,
                        current,
                        target,
                        started_at_ms: self.clock_ms,
                        duration_ms,
                    },
                );
            }
        }
        self.refresh_intrinsic_targets();
        self.finish_transitions();
        self.update_process();
    }

    /// Bring one node's Taffy style, paragraph and motion membership in line with its new computed
    /// style. The Taffy style changes only if the authored layout did, so a node mid-transition
    /// keeps its presented size through an unrelated change.
    fn apply_authored_style(&mut self, change: &StyleChange, rebuilt: &mut BTreeSet<u32>) {
        let tag = change.tag;
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return;
        };
        let authored = node
            .computed
            .taffy_style()
            .expect("computed styles are built from validated layers");
        let previous_authored = change.previous.as_ref().map(|previous| {
            previous
                .taffy_style()
                .expect("a stored computed style was valid")
        });
        if change.previous.as_ref().is_none_or(|previous| {
            previous.overflow_x != node.computed.overflow_x
                || previous.overflow_y != node.computed.overflow_y
                || previous.pointer_events != node.computed.pointer_events
        }) {
            self.hit_stale = true;
        }
        if change.previous.as_ref().is_none_or(|previous| {
            previous.position != node.computed.position || previous.z_index != node.computed.z_index
        }) {
            self.paint_reeval.insert(tag);
        }
        let layout_changed = previous_authored.as_ref() != Some(&authored);
        if layout_changed {
            self.tree
                .set_style(node.layout, authored)
                .expect("a mounted node has a layout node");
            self.layout_dirty.insert(tag);
            self.content_generation += 1;
        }
        let text_style = |computed: &ComputedStyle| {
            TextStyle::of(computed, computed.overflow_x.is_some_and(OverflowSpec::clips))
        };
        let now = text_style(&node.computed);
        let previous_text = change.previous.as_ref().map(text_style);
        let shaping_changed = previous_text
            .as_ref()
            .is_none_or(|previous| previous.shaping != now.shaping);
        let decorations_changed = previous_text
            .as_ref()
            .is_some_and(|previous| previous.decorations != now.decorations);
        let has_text = node.props.text.is_some() || node.visual.paragraph.is_some();
        if node.computed.transition.is_some() {
            self.motion_nodes.insert(tag);
        } else {
            self.motion_nodes.remove(&tag);
            self.sampled.remove(&tag);
        }
        self.paint_dirty.insert(tag);
        if shaping_changed && has_text && rebuilt.insert(tag) {
            self.refresh_paragraph(tag);
        } else if decorations_changed {
            // Only the lines drawn over the text differ: the text is not shaped again, but it is drawn again.
            if let Some(paragraph) = node.visual.paragraph.as_mut() {
                paragraph.set_decorations(now.decorations);
                self.paragraph_generation += 1;
                node.visual.generation = self.paragraph_generation;
            }
        }
    }

    /// The changed nodes Stylo must hear about. Stylo only animates a node whose style has a
    /// `transition`, so it is told about a node only while the node has one or has just lost one
    /// (which cancels what was running). Every other restyle (a colour change on a thousand plain
    /// cells) would cost Stylo a write per node and a traversal of every sibling of each, for
    /// nothing.
    fn style_engine_tags(&self, changes: &[StyleChange]) -> Vec<u32> {
        changes
            .iter()
            .filter(|change| {
                self.mounted.nodes.get(&change.tag).is_some_and(|node| {
                    node.computed.transition.is_some()
                        || change
                            .previous
                            .as_ref()
                            .is_some_and(|previous| previous.transition.is_some())
                })
            })
            .map(|change| change.tag)
            .collect()
    }

    /// A node that gains a `transition` in the same change that changes a value must animate from
    /// the value it had. Stylo was not told about the node while it had no transition, so tell it
    /// that previous style first; the change itself is then written on top of it.
    fn sync_gained_transitions(&mut self, changes: &[StyleChange]) {
        let now = self.clock_seconds();
        let mut synced = false;
        for change in changes {
            let (Some(previous), Some(node)) =
                (&change.previous, self.mounted.nodes.get(&change.tag))
            else {
                continue;
            };
            if previous.transition.is_some() || node.computed.transition.is_none() {
                continue;
            }
            self.style_engine
                .update(
                    change.tag,
                    previous,
                    self.overrides.get(&change.tag),
                    &BTreeSet::new(),
                    now,
                )
                .expect("validated style update");
            synced = true;
        }
        if synced {
            self.style_engine
                .resolve(now)
                .expect("monotonic native CSS clock");
        }
    }

    /// Write the changed nodes' styles into Stylo, run its pass, and sample every motion node.
    /// `immediate` axes change at once instead of transitioning.
    fn update_style_engine(&mut self, tags: &[u32], immediate: &BTreeSet<(u32, DimensionAxis)>) {
        let now = self.clock_seconds();
        for tag in tags {
            let Some(node) = self.mounted.nodes.get(tag) else {
                continue;
            };
            self.style_engine
                .update(
                    *tag,
                    &node.computed,
                    self.overrides.get(tag),
                    &blocked_properties(*tag, immediate),
                    now,
                )
                .expect("validated style update");
        }
        self.style_engine
            .resolve(now)
            .expect("monotonic native CSS clock");
        if !immediate.is_empty() {
            // Reenable configured transitions only after the immediate target has become the
            // current computed value; reenabling alone cannot restart it.
            let reenable = immediate.iter().map(|(tag, _)| *tag).collect();
            self.style_engine.reenable_transitions(&reenable);
            self.style_engine
                .resolve(now)
                .expect("monotonic native CSS clock");
        }
        self.resample_motion();
    }

    /// Read the sampled style of every motion node from Stylo.
    fn resample_motion(&mut self) {
        self.sampled
            .retain(|tag, _| self.motion_nodes.contains(tag));
        for tag in &self.motion_nodes {
            let sampled = self
                .style_engine
                .sampled(*tag)
                .expect("a motion node is mounted in the style engine");
            self.sampled.insert(*tag, sampled);
        }
    }

    /// Apply the sampled size, colour and opacity of the motion nodes to Taffy and the paint
    /// resources. Only a motion node is ever presented differently from its computed style.
    pub(crate) fn apply_presentation(&mut self) {
        for (tag, value) in &self.sampled {
            let Some(node) = self.mounted.nodes.get_mut(tag) else {
                continue;
            };
            let mut style = node
                .computed
                .taffy_style()
                .expect("computed styles are built from validated layers");
            match (value.width.to_taffy(), value.height.to_taffy()) {
                (Ok(width), Ok(height)) => {
                    style.size.width = width;
                    style.size.height = height;
                }
                (Err(error), _) | (_, Err(error)) => {
                    godot_error!("ReactUiRoot: node {tag} keeps its authored size: {error}");
                }
            }
            if self.tree.style(node.layout).expect("mounted layout node") != &style {
                self.tree
                    .set_style(node.layout, style)
                    .expect("mounted layout node");
                self.layout_dirty.insert(*tag);
            }
            self.paint_dirty.insert(*tag);
        }
    }

    fn current_motion_value(&self, tag: u32, property: TransitionProperty) -> MotionValue {
        let node = &self.mounted.nodes[&tag];
        let sample = self.sampled.get(&tag);
        let basis = self.parent_basis(tag);
        match property {
            TransitionProperty::Width => MotionValue::Number(
                sample
                    .and_then(|v| v.width.resolve(basis.x))
                    .unwrap_or(node.geometry.size.x),
            ),
            TransitionProperty::Height => MotionValue::Number(
                sample
                    .and_then(|v| v.height.resolve(basis.y))
                    .unwrap_or(node.geometry.size.y),
            ),
            TransitionProperty::Opacity => MotionValue::Number(
                sample
                    .map(|v| v.opacity)
                    .unwrap_or(node.computed.opacity.unwrap_or(1.0)),
            ),
            TransitionProperty::BackgroundColor => MotionValue::Color(
                sample
                    .map(|v| color_hex(v.background_color))
                    .unwrap_or_else(|| {
                        color_hex(color_components(parse_color(
                            node.computed.background_color.as_deref(),
                            Color::TRANSPARENT_BLACK,
                        )))
                    }),
            ),
            TransitionProperty::Filter => MotionValue::Filter(
                sample
                    .map(|v| v.filter.to_css())
                    .unwrap_or_else(|| resolved_filter(&node.computed).to_css()),
            ),
            TransitionProperty::BackdropFilter => MotionValue::Filter(
                sample
                    .map(|v| v.backdrop_filter.to_css())
                    .unwrap_or_else(|| resolved_backdrop_filter(&node.computed).to_css()),
            ),
        }
    }

    fn target_motion_value(&self, tag: u32, property: TransitionProperty) -> MotionValue {
        let node = &self.mounted.nodes[&tag];
        let style = &node.computed;
        match property {
            TransitionProperty::Width | TransitionProperty::Height => {
                let axis = property_axis(property).expect("dimension property");
                let value = self
                    .intrinsic
                    .get(&(tag, axis))
                    .map(|track| track.target_px)
                    .unwrap_or_else(|| {
                        let basis = self.parent_basis(tag);
                        resolve_dimension(
                            &dimension_value(style, axis),
                            match axis {
                                DimensionAxis::Width => basis.x,
                                DimensionAxis::Height => basis.y,
                            },
                        )
                        .unwrap_or(match axis {
                            DimensionAxis::Width => node.geometry.size.x,
                            DimensionAxis::Height => node.geometry.size.y,
                        })
                    });
                MotionValue::Number(value)
            }
            TransitionProperty::Opacity => MotionValue::Number(style.opacity.unwrap_or(1.0)),
            TransitionProperty::BackgroundColor => MotionValue::Color(color_hex(color_components(
                parse_color(style.background_color.as_deref(), Color::TRANSPARENT_BLACK),
            ))),
            TransitionProperty::Filter => MotionValue::Filter(resolved_filter(style).to_css()),
            TransitionProperty::BackdropFilter => {
                MotionValue::Filter(resolved_backdrop_filter(style).to_css())
            }
        }
    }

    /// The size an intrinsic dimension would settle at, measured in a clone of the layout tree.
    /// This is the one remaining whole-tree cost on a commit path (plan section 8).
    fn measure_endpoint(&self, tag: u32, axis: DimensionAxis) -> f32 {
        let mut probe = self.tree.clone();
        // TaffyTree::clone would otherwise retain the same mutable Godot paragraph
        // resources. Duplicate shaping buffers so measuring an endpoint never
        // changes visible text wrapping or the presentation tree's geometry.
        // A text input's context is a plain size, which the clone carries as it is.
        for node in self.mounted.nodes.values() {
            if let Some(paragraph) = node.visual.paragraph.as_ref() {
                let duplicate = paragraph.duplicate();
                probe
                    .set_node_context(node.layout, Some(TextContext::Paragraph(duplicate)))
                    .expect("known probe handle");
            }
        }
        let node = &self.mounted.nodes[&tag];
        let handle = node.layout;
        let mut style = probe.style(handle).expect("known probe style").clone();
        let authored = node
            .computed
            .taffy_style()
            .expect("validated intrinsic target");
        match axis {
            DimensionAxis::Width => style.size.width = authored.size.width,
            DimensionAxis::Height => style.size.height = authored.size.height,
        }
        probe
            .set_style(handle, style)
            .expect("known intrinsic target");
        let root = self.layer_roots[node.layer];
        let mut root_style = probe.style(root).expect("known probe root").clone();
        root_style.size = Size {
            width: taffy::prelude::length(self.viewport_size.x),
            height: taffy::prelude::length(self.viewport_size.y),
        };
        probe.set_style(root, root_style).expect("known probe root");
        compute_tree(&mut probe, root, self.viewport_size);
        let size = probe.unrounded_layout(handle).size;
        match axis {
            DimensionAxis::Width => size.width,
            DimensionAxis::Height => size.height,
        }
    }

    pub(crate) fn refresh_intrinsic_targets(&mut self) {
        let keys: Vec<_> = self.intrinsic.keys().copied().collect();
        let mut retargeted = Vec::new();
        for (tag, axis) in keys {
            let laid_out = self
                .mounted
                .nodes
                .get(&tag)
                .is_some_and(|node| node.geometry.laid_out);
            if !laid_out {
                self.intrinsic.remove(&(tag, axis));
                set_override(&mut self.overrides, tag, axis, None);
                self.transitions.remove(&(tag, axis_property(axis)));
                retargeted.push(tag);
                continue;
            }
            let parent_basis = self.parent_basis(tag);
            let measured_width = self.mounted.nodes[&tag].geometry.size.x;
            let track = &self.intrinsic[&(tag, axis)];
            if track.content_generation == self.content_generation
                && track.parent_basis == parent_basis
                && (axis != DimensionAxis::Height || track.measured_width == measured_width)
            {
                continue;
            }
            let target_px = self.measure_endpoint(tag, axis);
            let old_target = track.target_px;
            self.intrinsic.insert(
                (tag, axis),
                IntrinsicTrack {
                    target_px,
                    content_generation: self.content_generation,
                    parent_basis,
                    measured_width,
                },
            );
            if old_target != target_px {
                set_override(&mut self.overrides, tag, axis, Some(target_px));
                if let Some(record) = self.transitions.get_mut(&(tag, axis_property(axis))) {
                    record.target = MotionValue::Number(target_px);
                    record.started_at_ms = self.clock_ms;
                }
                retargeted.push(tag);
            }
        }
        if !retargeted.is_empty() {
            self.update_style_engine(&retargeted, &BTreeSet::new());
            self.apply_presentation();
            self.flush_layout();
        }
    }

    fn finish_transitions(&mut self) {
        let mut completed = BTreeSet::new();
        for ((tag, axis), track) in &self.intrinsic {
            let Some(sample) = self.sampled.get(tag) else {
                continue;
            };
            let value = match axis {
                DimensionAxis::Width => sample.width.as_px(),
                DimensionAxis::Height => sample.height.as_px(),
            };
            // Intrinsic overrides are pure pixel tracks. Exact full-precision
            // equality restores this axis independently of unrelated CSS motion.
            if value == Some(track.target_px) {
                completed.insert((*tag, *axis));
            }
        }
        for (tag, axis) in &completed {
            self.intrinsic.remove(&(*tag, *axis));
            set_override(&mut self.overrides, *tag, *axis, None);
            self.transitions.remove(&(*tag, axis_property(*axis)));
        }
        if !completed.is_empty() {
            let tags: Vec<u32> = completed.iter().map(|(tag, _)| *tag).collect();
            self.update_style_engine(&tags, &completed);
            self.apply_presentation();
            self.flush_layout();
        }
        let keys: Vec<_> = self.transitions.keys().copied().collect();
        for (tag, property) in keys {
            if !self.mounted.nodes.contains_key(&tag) {
                self.transitions.remove(&(tag, property));
                continue;
            }
            let current = self.current_motion_value(tag, property);
            let target = self.target_motion_value(tag, property);
            if !self.style_engine.is_animating() && self.intrinsic.is_empty() {
                self.transitions.remove(&(tag, property));
            } else if let Some(record) = self.transitions.get_mut(&(tag, property)) {
                record.current = current;
                record.target = target;
            }
        }
    }

    pub(crate) fn tick_motion(&mut self, delta: f64) {
        let started = Instant::now();
        self.phase_layout_micros = 0;
        self.phase_geometry_micros = 0;
        self.clock_ms += delta * MILLISECONDS_PER_SECOND;
        self.stats.animation_frames += 1;
        let phase = Instant::now();
        self.style_engine
            .resolve(self.clock_seconds())
            .expect("monotonic native CSS clock");
        self.resample_motion();
        self.apply_presentation();
        let style_micros = micros(phase);
        self.flush_layout();
        let phase = Instant::now();
        let previous_layout_micros = self.phase_layout_micros;
        let previous_geometry_micros = self.phase_geometry_micros;
        self.refresh_intrinsic_targets();
        self.finish_transitions();
        let measure_micros = micros(phase).saturating_sub(
            self.phase_layout_micros - previous_layout_micros + self.phase_geometry_micros
                - previous_geometry_micros,
        );
        self.profiler.record(Sample::Frame {
            style_micros,
            measure_micros,
            layout_micros: self.phase_layout_micros,
            geometry_micros: self.phase_geometry_micros,
            animation_micros: micros(started),
        });
        self.update_process();
    }

    /// The one decision of whether the root needs `process()` frames: native motion is running, a flick
    /// is coasting or a finger is panning (`ScrollInputState::wants_frames`), or a drag needs a timer
    /// or edge auto-scroll (`drag_wants_frames`), and the root is in the scene tree. A running drag also
    /// turns on `input`, which is how Escape reaches it. Everything that starts or ends such work calls
    /// this; nothing else turns processing on or off except [`Self::pause_process`].
    pub(crate) fn update_process(&mut self) {
        let inside = self.base().is_inside_tree();
        let active = (self.motion_active()
            || self.scrolling.wants_frames()
            || self.drag_wants_frames()
            || self.text_input_wants_frames()
            || self.effects_want_frames())
            && inside;
        let listening = self.drag_in_progress() && inside;
        self.base_mut().set_process(active);
        self.base_mut().set_process_input(listening);
    }

    /// Stop `process()` frames while the root leaves the scene tree. (`is_inside_tree()` is still
    /// true while `EXIT_TREE` is delivered, so `update_process` cannot make this decision.) Re-entry
    /// calls `update_process`, which resumes whatever is still running.
    pub(crate) fn pause_process(&mut self) {
        self.base_mut().set_process(false);
        self.base_mut().set_process_input(false);
    }
}

fn color_components(color: Color) -> [f32; 4] {
    [color.r, color.g, color.b, color.a]
}

pub(crate) fn color_hex(color: [f32; 4]) -> String {
    format!(
        "#{:02x}{:02x}{:02x}{:02x}",
        (color[0].clamp(0.0, 1.0) * HEX_COLOR_CHANNEL_MAX).round() as u8,
        (color[1].clamp(0.0, 1.0) * HEX_COLOR_CHANNEL_MAX).round() as u8,
        (color[2].clamp(0.0, 1.0) * HEX_COLOR_CHANNEL_MAX).round() as u8,
        (color[3].clamp(0.0, 1.0) * HEX_COLOR_CHANNEL_MAX).round() as u8
    )
}
fn axis_property(axis: DimensionAxis) -> TransitionProperty {
    match axis {
        DimensionAxis::Width => TransitionProperty::Width,
        DimensionAxis::Height => TransitionProperty::Height,
    }
}
fn property_axis(property: TransitionProperty) -> Option<DimensionAxis> {
    match property {
        TransitionProperty::Width => Some(DimensionAxis::Width),
        TransitionProperty::Height => Some(DimensionAxis::Height),
        TransitionProperty::Opacity
        | TransitionProperty::BackgroundColor
        | TransitionProperty::Filter
        | TransitionProperty::BackdropFilter => None,
    }
}
fn dimension_value(style: &StyleSpec, axis: DimensionAxis) -> Dimension {
    match axis {
        DimensionAxis::Width => style.width.clone(),
        DimensionAxis::Height => style.height.clone(),
    }
    .unwrap_or_else(|| Dimension::Text("auto".into()))
}
fn is_auto(value: &Dimension) -> bool {
    matches!(value,Dimension::Text(text) if text=="auto")
}
fn resolve_dimension(value: &Dimension, basis: f32) -> Option<f32> {
    match value {
        Dimension::Num(value) => Some(*value),
        Dimension::Text(value) if value == "auto" => None,
        Dimension::Text(value) => Some(
            value
                .trim_end_matches('%')
                .parse::<f32>()
                .expect("validated percentage")
                * basis
                / PERCENTAGE_SCALE,
        ),
    }
}
fn property_changed(old: &StyleSpec, new: &StyleSpec, property: TransitionProperty) -> bool {
    match property {
        TransitionProperty::Width => old.width != new.width,
        TransitionProperty::Height => old.height != new.height,
        TransitionProperty::Opacity => old.opacity != new.opacity,
        TransitionProperty::BackgroundColor => old.background_color != new.background_color,
        TransitionProperty::Filter => resolved_filter(old) != resolved_filter(new),
        TransitionProperty::BackdropFilter => {
            resolved_backdrop_filter(old) != resolved_backdrop_filter(new)
        }
    }
}

/// The `filter` list of a style with `currentcolor` shadows resolved to its text colour.
pub(crate) fn resolved_filter(style: &StyleSpec) -> FilterList {
    style
        .filter_list()
        .resolve_current_color(current_color(style))
}

pub(crate) fn resolved_backdrop_filter(style: &StyleSpec) -> FilterList {
    style
        .backdrop_filter_list()
        .resolve_current_color(current_color(style))
}
fn set_override(
    overrides: &mut BTreeMap<u32, DimensionOverrides>,
    id: u32,
    axis: DimensionAxis,
    value: Option<f32>,
) {
    let entry = overrides.entry(id).or_default();
    match axis {
        DimensionAxis::Width => entry.width = value,
        DimensionAxis::Height => entry.height = value,
    }
    if entry.width.is_none() && entry.height.is_none() {
        overrides.remove(&id);
    }
}

fn effective_interpolate_size(style: &ComputedStyle) -> InterpolateSize {
    style
        .interpolate_size
        .unwrap_or(InterpolateSize::NumericOnly)
}

/// The first reason `previous` to `next` cannot be animated by this prototype's motion engine, if
/// any: direct pixel/percentage transitions, and intrinsic transitions on a flex main axis that
/// can grow or shrink.
fn motion_violation<T: StyleTree>(
    tree: &T,
    tag: u32,
    previous: &StyleSpec,
    next: &ComputedStyle,
) -> Option<MotionViolation> {
    let transition = next.transition.as_ref()?;
    if transition.duration_ms == 0.0 {
        return None;
    }
    for property in &transition.properties {
        let Some(axis) = property_axis(*property) else {
            continue;
        };
        if !property_changed(previous, next, *property) {
            continue;
        }
        let before = dimension_value(previous, axis);
        let after = dimension_value(next, axis);
        if matches!((&before,&after), (Dimension::Num(_),Dimension::Text(value)) | (Dimension::Text(value),Dimension::Num(_)) if value != "auto")
        {
            return Some(MotionViolation {
                axis,
                message: format!(
                    "node {tag}: {axis:?} transitions between pixels and percentages require a calc-aware layout tree; this prototype supports same-unit numeric transitions and native allow-keywords transitions"
                ),
            });
        }
        if !is_auto(&before) && !is_auto(&after) {
            continue;
        }
        if effective_interpolate_size(next) != InterpolateSize::AllowKeywords {
            continue;
        }
        let Some(parent) = tree.style_parent(tag) else {
            continue;
        };
        let Some(parent_style) = tree.computed(parent) else {
            continue;
        };
        let row = matches!(
            parent_style.flex_direction,
            Some(FlexDirectionSpec::Row | FlexDirectionSpec::RowReverse)
        );
        let main_axis =
            (row && axis == DimensionAxis::Width) || (!row && axis == DimensionAxis::Height);
        if parent_style.display != Some(DisplaySpec::Grid)
            && main_axis
            && (next.flex_grow.unwrap_or(0.0) != 0.0
                || next.flex_shrink.unwrap_or(1.0) != 0.0
                || previous.flex_grow.unwrap_or(0.0) != 0.0
                || previous.flex_shrink.unwrap_or(1.0) != 0.0)
        {
            return Some(MotionViolation {
                axis,
                message: format!(
                    "node {tag}: intrinsic {axis:?} transitions on a flex main axis require flexGrow:0 and flexShrink:0; animating a used size must not apply flex distribution twice"
                ),
            });
        }
    }
    None
}
