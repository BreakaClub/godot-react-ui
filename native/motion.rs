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

use crate::box_shadow::ShadowList;
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
/// A colour farther than this (the largest channel difference, half of one 8-bit step) from its target is still moving.
const COLOR_MOVING_THRESHOLD: f32 = 0.5 / HEX_COLOR_CHANNEL_MAX;

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
    /// The matrix (CSS `matrix(a, b, c, d, e, f)`, about the origin) the transform presents or is heading to.
    Transform([f32; 6]),
    /// A `box-shadow` list as CSS text.
    Shadows(String),
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

/// Why a style change cannot be animated: the axis it concerns and a message for the author. Under
/// `transition-property: all` a change that cannot animate just jumps, as in CSS, so it is `quiet`: applied
/// without animation and neither rejected nor reported. An explicit list that names the property gets the
/// report.
pub(crate) struct MotionViolation {
    axis: DimensionAxis,
    message: String,
    quiet: bool,
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
            "contentRecords":self.stats.content_records,"paragraphBuilds":self.stats.paragraph_builds,
            "paragraphRepaints":self.stats.paragraph_repaints,"effects":self.effects_activity(),
            "paintTextures":crate::box_draw::cached_textures()})
    }

    /// The opacity, colours and size a node is presenting right now (the text colour is the one its text paints
    /// in, which a transition on an ancestor may be moving).
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
                color_hex(color_components(parse_color(node.computed.background_color.as_deref(), Color::TRANSPARENT_BLACK)))),
            "color":color_hex(color_components(self.presented_text_color(tag).unwrap_or_else(||
                parse_color(node.computed.color.as_deref(), Color::WHITE)))),
            "borderColor":sampled.map(|v|color_hex(v.border_color)).unwrap_or_else(||
                border_color_hex(&node.computed))})
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
            let Some(next) = tree.computed(change.tag) else {
                continue;
            };
            let before = change.starting.as_ref().or_else(|| {
                let node = self.mounted.nodes.get(&change.tag)?;
                node.geometry.laid_out.then_some(change.previous.as_ref()?)
            });
            let Some(previous) = before else {
                continue;
            };
            if let Some(violation) = motion_violations(tree, change.tag, previous, next)
                .into_iter()
                .find(|violation| !violation.quiet)
            {
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
            let before = change
                .starting
                .as_ref()
                .or_else(|| node.geometry.laid_out.then_some(change.previous.as_ref()?));
            let Some(previous) = before else {
                continue;
            };
            let next = &node.computed;
            let Some(transition) = &next.transition else {
                continue;
            };
            if transition.duration_ms == 0.0 {
                continue;
            }
            let violations = motion_violations(&self.mounted, change.tag, previous, next);
            for violation in &violations {
                // A commit is validated before it is mounted, so this is a state change (hover,
                // focus, a breakpoint) that cannot be rejected: apply it without animation.
                if !violation.quiet {
                    godot_error!(
                        "ReactUiRoot: node {} changes without a transition: {}",
                        change.tag,
                        violation.message
                    );
                }
                immediate.insert((change.tag, violation.axis));
            }
            for property in transition.properties.animated() {
                if !property_changed(previous, next, *property) {
                    continue;
                }
                if let Some(axis) = property_axis(*property) {
                    if violations.iter().any(|v| v.axis == axis) {
                        continue;
                    }
                    let old = dimension_value(previous, axis);
                    let new = dimension_value(next, axis);
                    if is_auto(&old) || is_auto(&new) {
                        if effective_interpolate_size(next) != InterpolateSize::AllowKeywords {
                            continue;
                        }
                        intrinsic_changes.push((change.tag, axis, old));
                    }
                }
                changed.push((change.tag, *property, transition.duration_ms));
            }
        }
        // Prime only keyword boundaries; ordinary numeric/color interpolation and
        // interruption/reversal remain entirely inside Stylo.
        for (tag, axis, old) in &intrinsic_changes {
            if !self.intrinsic.contains_key(&(*tag, *axis)) {
                let node = &self.mounted.nodes[tag];
                let current = if node.geometry.laid_out {
                    match axis {
                        DimensionAxis::Width => node.geometry.size.x,
                        DimensionAxis::Height => node.geometry.size.y,
                    }
                } else {
                    let basis = self.parent_basis(*tag);
                    resolve_dimension(
                        old,
                        match axis {
                            DimensionAxis::Width => basis.x,
                            DimensionAxis::Height => basis.y,
                        },
                    )
                    .unwrap_or(0.0)
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
        for (tag, axis, _) in intrinsic_changes {
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
            previous.position != node.computed.position
                || previous.z_index != node.computed.z_index
                // A transformed element is a containing block, and a fixed one below it moves with it.
                || previous.is_transformed() != node.computed.is_transformed()
                || previous.inside_transform != node.computed.inside_transform
        }) {
            self.paint_reeval.insert(tag);
        }
        // A change of `order` lists the node's siblings again before the next layout.
        if change
            .previous
            .as_ref()
            .is_some_and(|previous| previous.order != node.computed.order)
            && let Some(parent) = node.parent
        {
            self.order_dirty.insert(parent);
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
            TextStyle::of(
                computed,
                computed.overflow_x.is_some_and(OverflowSpec::clips),
            )
        };
        let now = text_style(&node.computed);
        let previous_text = change.previous.as_ref().map(text_style);
        let shaping_changed = previous_text
            .as_ref()
            .is_none_or(|previous| previous.shaping != now.shaping);
        let decorations_changed = previous_text
            .as_ref()
            .is_some_and(|previous| previous.decorations != now.decorations);
        let has_text = node.props.text.is_some() || node.props.spans.is_some() || node.visual.paragraph.is_some();
        if node.computed.transition.is_some() {
            self.motion_nodes.insert(tag);
        } else {
            self.motion_nodes.remove(&tag);
            self.sampled.remove(&tag);
        }
        self.paint_dirty.insert(tag);
        // The spans of a text resolve against the node's colour and decorations (a span with no colour of its own has the node's
        // for its `currentcolor`), so a text with spans takes the paragraph again when those change; one that is shaped as it was
        // is only painted again.
        let spanned = node.props.spans.is_some();
        let color_changed = change
            .previous
            .as_ref()
            .is_some_and(|previous| previous.color != node.computed.color);
        if (shaping_changed || (spanned && (decorations_changed || color_changed)))
            && has_text
            && rebuilt.insert(tag)
        {
            self.refresh_paragraph(tag);
        } else if decorations_changed && !spanned {
            // Only the lines drawn over the text differ: the text is not shaped again, but it is drawn again.
            if let Some(paragraph) = node.visual.paragraph.as_mut() {
                paragraph.set_decorations(now.decorations);
                self.paragraph_generation += 1;
                node.visual.generation = self.paragraph_generation;
            }
        }
        if change.previous.as_ref().is_none_or(|previous| {
            crate::transform_state::transform_changed(previous, &self.mounted.nodes[&tag].computed)
        }) {
            self.refresh_transform(tag);
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

    /// A node that gains a `transition` in the same change that changes a value, or starts from a
    /// `@starting-style` (`starting:` variant), must animate from that before-change style. Tell
    /// Stylo that initial style first; the after-change style is then written on top of it.
    fn sync_gained_transitions(&mut self, changes: &[StyleChange]) {
        let now = self.clock_seconds();
        let mut synced = false;
        for change in changes {
            let Some(node) = self.mounted.nodes.get(&change.tag) else {
                continue;
            };
            if node.computed.transition.is_none() {
                continue;
            }
            let initial = change.starting.as_ref().or_else(|| {
                let previous = change.previous.as_ref()?;
                previous.transition.is_none().then_some(previous)
            });
            let Some(initial) = initial else {
                continue;
            };
            self.style_engine
                .update(
                    change.tag,
                    initial,
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
        let mut transformed = Vec::new();
        for (tag, value) in &self.sampled {
            let Some(node) = self.mounted.nodes.get_mut(tag) else {
                continue;
            };
            if node.transform.is_some() || !value.transform.0.is_empty() {
                transformed.push(*tag);
            }
            let mut style = node
                .computed
                .taffy_style()
                .expect("computed styles are built from validated layers");
            match (value.width.to_taffy(), value.height.to_taffy()) {
                (Ok(width), Ok(height)) => {
                    if let Some(width) = width {
                        style.size.width = width;
                    }
                    if let Some(height) = height {
                        style.size.height = height;
                    }
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
        // The sample of a transform moves the element's canvas item and nothing else.
        for tag in transformed {
            self.refresh_transform(tag);
        }
        self.refresh_inherited_text_paint();
    }

    /// The text colour a node paints in while a transition moves it: its own sample if it transitions `color`,
    /// else the nearest ancestor's it inherits (every node between them has the same computed colour, so none
    /// set its own). `None` when no transition is moving the colour it paints in.
    pub(crate) fn presented_text_color(&self, tag: u32) -> Option<Color> {
        if self.sampled.is_empty() {
            return None;
        }
        let own = &self.mounted.nodes.get(&tag)?.computed.color;
        let mut current = tag;
        loop {
            let node = self.mounted.nodes.get(&current)?;
            if let Some(sample) = self.sampled.get(&current)
                && transitions_color(&node.computed)
            {
                let [r, g, b, a] = sample.color;
                return Some(Color::from_rgba(r, g, b, a));
            }
            let Some(Parent::Node(parent)) = node.parent else {
                return None;
            };
            if &self.mounted.nodes.get(&parent)?.computed.color != own {
                return None;
            }
            current = parent;
        }
    }

    /// The text below a node whose colour is moving follows it (CSS inheritance of an animated value), so it is
    /// painted again while the colour moves and once more when it stops. Nothing runs while no colour moves.
    fn refresh_inherited_text_paint(&mut self) {
        let moving: BTreeSet<u32> = self
            .sampled
            .iter()
            .filter(|(tag, sample)| {
                self.mounted.nodes.get(*tag).is_some_and(|node| {
                    transitions_color(&node.computed)
                        && color_distance(
                            sample.color,
                            color_components(parse_color(
                                node.computed.color.as_deref(),
                                Color::WHITE,
                            )),
                        ) > COLOR_MOVING_THRESHOLD
                })
            })
            .map(|(tag, _)| *tag)
            .collect();
        let affected: Vec<u32> = moving.union(&self.moving_text_colors).copied().collect();
        for tag in affected {
            let Some(node) = self.mounted.nodes.get(&tag) else {
                continue;
            };
            let colour = node.computed.color.as_ref();
            let mut stack: Vec<u32> = node.children.clone();
            while let Some(child) = stack.pop() {
                let Some(node) = self.mounted.nodes.get(&child) else {
                    continue;
                };
                // A descendant that set its own colour, and what is below it, does not follow.
                if node.computed.color.as_ref() != colour {
                    continue;
                }
                if node.visual.paragraph.is_some() {
                    self.paint_dirty.insert(child);
                }
                stack.extend(node.children.iter().copied());
            }
        }
        self.moving_text_colors = moving;
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
            TransitionProperty::Color => MotionValue::Color(
                sample
                    .map(|v| color_hex(v.color))
                    .unwrap_or_else(|| text_color_hex(&node.computed)),
            ),
            TransitionProperty::BorderColor => MotionValue::Color(
                sample
                    .map(|v| color_hex(v.border_color))
                    .unwrap_or_else(|| border_color_hex(&node.computed)),
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
            TransitionProperty::Transform => {
                MotionValue::Transform(self.transform_numbers(tag, true))
            }
            TransitionProperty::BoxShadow => MotionValue::Shadows(
                sample
                    .map(|v| v.box_shadow.to_css())
                    .unwrap_or_else(|| resolved_box_shadow(&node.computed).to_css()),
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
            TransitionProperty::Color => MotionValue::Color(text_color_hex(style)),
            TransitionProperty::BorderColor => MotionValue::Color(border_color_hex(style)),
            TransitionProperty::Filter => MotionValue::Filter(resolved_filter(style).to_css()),
            TransitionProperty::BackdropFilter => {
                MotionValue::Filter(resolved_backdrop_filter(style).to_css())
            }
            TransitionProperty::Transform => {
                MotionValue::Transform(self.transform_numbers(tag, false))
            }
            TransitionProperty::BoxShadow => {
                MotionValue::Shadows(resolved_box_shadow(style).to_css())
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

/// The largest difference in a channel between two colours.
fn color_distance(left: [f32; 4], right: [f32; 4]) -> f32 {
    left.iter()
        .zip(right)
        .map(|(left, right)| (left - right).abs())
        .fold(0.0, f32::max)
}

/// Whether a node's transition animates its text colour.
fn transitions_color(style: &StyleSpec) -> bool {
    style.transition.as_ref().is_some_and(|transition| {
        transition
            .properties
            .animated()
            .contains(&TransitionProperty::Color)
    })
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
        | TransitionProperty::Color
        | TransitionProperty::BorderColor
        | TransitionProperty::Filter
        | TransitionProperty::BackdropFilter
        | TransitionProperty::Transform
        | TransitionProperty::BoxShadow => None,
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
/// The pixels a size is, if it is a length or a percentage of `basis`; `auto` and the intrinsic keywords have
/// none of their own.
fn resolve_dimension(value: &Dimension, basis: f32) -> Option<f32> {
    match value {
        Dimension::Num(value) => Some(*value),
        Dimension::Text(_) => value.percent().map(|fraction| fraction * basis),
    }
}

/// The text colour of a style as `#rrggbbaa` (white when nothing set one, as paint does).
fn text_color_hex(style: &StyleSpec) -> String {
    color_hex(color_components(parse_color(
        style.color.as_deref(),
        Color::WHITE,
    )))
}

fn border_color_hex(style: &StyleSpec) -> String {
    color_hex(color_components(parse_color(
        style.border_color.as_deref(),
        Color::TRANSPARENT_BLACK,
    )))
}
fn property_changed(old: &StyleSpec, new: &StyleSpec, property: TransitionProperty) -> bool {
    match property {
        TransitionProperty::Width => old.width != new.width,
        TransitionProperty::Height => old.height != new.height,
        TransitionProperty::Opacity => old.opacity != new.opacity,
        TransitionProperty::BackgroundColor => old.background_color != new.background_color,
        TransitionProperty::Color => old.color != new.color,
        TransitionProperty::BorderColor => old.border_color != new.border_color,
        TransitionProperty::Filter => resolved_filter(old) != resolved_filter(new),
        TransitionProperty::BackdropFilter => {
            resolved_backdrop_filter(old) != resolved_backdrop_filter(new)
        }
        TransitionProperty::Transform => crate::transform_state::transform_changed(old, new),
        TransitionProperty::BoxShadow => resolved_box_shadow(old) != resolved_box_shadow(new),
    }
}

/// The `box-shadow` list of a style with `currentcolor` shadows resolved to its text colour.
pub(crate) fn resolved_box_shadow(style: &StyleSpec) -> ShadowList {
    style
        .box_shadow_list()
        .resolve_current_color(current_color(style))
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

/// Every reason `previous` to `next` cannot be animated by this prototype's motion engine: direct
/// pixel/percentage transitions, and intrinsic transitions on a flex main axis that can grow or shrink.
fn motion_violations<T: StyleTree>(
    tree: &T,
    tag: u32,
    previous: &StyleSpec,
    next: &ComputedStyle,
) -> Vec<MotionViolation> {
    let mut violations = Vec::new();
    let Some(transition) = next.transition.as_ref() else {
        return violations;
    };
    if transition.duration_ms == 0.0 {
        return violations;
    }
    let quiet = transition.properties.is_all();
    for property in transition.properties.animated() {
        let Some(axis) = property_axis(*property) else {
            continue;
        };
        if !property_changed(previous, next, *property) {
            continue;
        }
        let before = dimension_value(previous, axis);
        let after = dimension_value(next, axis);
        // Pixels and a percentage interpolate in CSS (through calc), but not through Taffy here. An intrinsic
        // keyword on either side does not interpolate in CSS either, so that one just jumps.
        if matches!(
            (&before, &after),
            (Dimension::Num(_), Dimension::Text(_)) | (Dimension::Text(_), Dimension::Num(_))
        ) && (before.percent().is_some() || after.percent().is_some())
        {
            violations.push(MotionViolation {
                axis,
                message: format!(
                    "node {tag}: {axis:?} transitions between pixels and percentages require a calc-aware layout tree; this prototype supports same-unit numeric transitions and native allow-keywords transitions"
                ),
                quiet,
            });
            continue;
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
        let flex_parent = matches!(parent_style.display, None | Some(DisplaySpec::Flex));
        if flex_parent
            && main_axis
            && (next.flex_grow.unwrap_or(0.0) != 0.0
                || next.flex_shrink.unwrap_or(1.0) != 0.0
                || previous.flex_grow.unwrap_or(0.0) != 0.0
                || previous.flex_shrink.unwrap_or(1.0) != 0.0)
        {
            violations.push(MotionViolation {
                axis,
                message: format!(
                    "node {tag}: intrinsic {axis:?} transitions on a flex main axis require flexGrow:0 and flexShrink:0; animating a used size must not apply flex distribution twice"
                ),
                quiet,
            });
        }
    }
    violations
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::computed_style::StyleInputs;
    use crate::props::TransitionSpec;
    use crate::transition::TransitionProperties;

    /// A parent (tag 1) and a child (tag 2), as the tree `motion_violations` consults.
    struct Pair {
        computed: BTreeMap<u32, ComputedStyle>,
        children: Vec<u32>,
    }

    impl StyleTree for Pair {
        fn style_parent(&self, tag: u32) -> Option<u32> {
            (tag == 2).then_some(1)
        }

        fn style_children(&self, _tag: u32) -> &[u32] {
            &self.children
        }

        fn style_inputs(&self, _tag: u32) -> StyleInputs<'_> {
            unreachable!("violations only read computed styles")
        }

        fn computed(&self, tag: u32) -> Option<&ComputedStyle> {
            self.computed.get(&tag)
        }

        fn store_computed(&mut self, tag: u32, computed: ComputedStyle) -> Option<ComputedStyle> {
            self.computed.insert(tag, computed)
        }
    }

    fn spec(json: &str) -> StyleSpec {
        serde_json::from_str(json).expect("test style must parse")
    }

    fn transition(properties: &str) -> String {
        format!(r#""transition":{{"properties":{properties},"durationMs":200}}"#)
    }

    /// The violations of changing the child from `before` to `after`, under `parent` and the child's transition.
    fn violations(
        parent: &str,
        properties: &str,
        before: &str,
        after: &str,
    ) -> Vec<MotionViolation> {
        let child = |extra: &str| spec(&format!(r#"{{{},{extra}}}"#, transition(properties)));
        let tree = Pair {
            computed: BTreeMap::from([
                (1, ComputedStyle(spec(parent))),
                (2, ComputedStyle(child(after))),
            ]),
            children: vec![2],
        };
        let previous = child(before);
        let next = tree.computed[&2].clone();
        motion_violations(&tree, 2, &previous, &next)
    }

    #[test]
    fn an_explicit_property_that_cannot_animate_is_reported_and_all_jumps_quietly() {
        let explicit = violations("{}", r#"["width"]"#, r#""width":100"#, r#""width":"50%""#);
        assert_eq!(explicit.len(), 1);
        assert!(!explicit[0].quiet, "naming the property asks for it");
        assert!(explicit[0].message.contains("pixels and percentages"));

        let all = violations("{}", r#""all""#, r#""width":100"#, r#""width":"50%""#);
        assert_eq!(
            all.len(),
            1,
            "it still cannot animate, so it is applied at once"
        );
        assert!(all[0].quiet, "but transition-all does not report it");

        // Both axes at once are both found, so both jump.
        let both = violations(
            "{}",
            r#""all""#,
            r#""width":100,"height":100"#,
            r#""width":"50%","height":"50%""#,
        );
        assert_eq!(both.len(), 2);
    }

    #[test]
    fn an_intrinsic_keyword_on_either_side_just_jumps_in_css_and_here() {
        for (before, after) in [
            (r#""width":100"#, r#""width":"fit-content""#),
            (r#""width":"min-content""#, r#""width":100"#),
            (r#""width":"max-content""#, r#""width":"50%""#),
        ] {
            assert!(
                violations("{}", r#"["width"]"#, before, after).is_empty(),
                "{before} -> {after}"
            );
        }
    }

    #[test]
    fn an_intrinsic_flex_main_axis_is_reported_for_a_list_and_quiet_for_all() {
        let growing = r#""interpolateSize":"allow-keywords","flexGrow":1"#;
        let list = violations(
            r#"{"flexDirection":"row"}"#,
            r#"["width"]"#,
            &format!(r#""width":"auto",{growing}"#),
            &format!(r#""width":100,{growing}"#),
        );
        assert_eq!(list.len(), 1);
        assert!(!list[0].quiet);
        assert!(list[0].message.contains("flex main axis"));

        let all = violations(
            r#"{"flexDirection":"row"}"#,
            r#""all""#,
            &format!(r#""width":"auto",{growing}"#),
            &format!(r#""width":100,{growing}"#),
        );
        assert_eq!((all.len(), all[0].quiet), (1, true));

        // A grid or a block parent has no flex main axis to apply twice.
        for parent in [r#"{"display":"grid"}"#, r#"{"display":"block"}"#] {
            assert!(
                violations(
                    parent,
                    r#"["width"]"#,
                    &format!(r#""width":"auto",{growing}"#),
                    &format!(r#""width":100,{growing}"#),
                )
                .is_empty(),
                "{parent}"
            );
        }
    }

    #[test]
    fn colours_are_properties_motion_can_name() {
        let spec = TransitionSpec {
            properties: TransitionProperties::List(vec![
                TransitionProperty::Color,
                TransitionProperty::BorderColor,
            ]),
            duration_ms: 100.0,
            delay_ms: None,
            easing: None,
        };
        let old = StyleSpec {
            color: Some("#fff".into()),
            border_color: Some("#000".into()),
            ..StyleSpec::default()
        };
        let new = StyleSpec {
            color: Some("#fff".into()),
            border_color: Some("#f00".into()),
            ..StyleSpec::default()
        };
        let moved: Vec<_> = spec
            .properties
            .animated()
            .iter()
            .filter(|property| property_changed(&old, &new, **property))
            .collect();
        assert_eq!(moved, vec![&TransitionProperty::BorderColor]);
    }

    #[test]
    fn every_transition_property_is_animatable_or_a_compile_error() {
        // An exhaustive match: a property a track adds fails to compile here until it is placed, and the list it
        // belongs to (`TransitionProperty::ANIMATABLE`) is then checked.
        fn animatable(property: TransitionProperty) -> bool {
            match property {
                TransitionProperty::Width
                | TransitionProperty::Height
                | TransitionProperty::Opacity
                | TransitionProperty::BackgroundColor
                | TransitionProperty::Color
                | TransitionProperty::BorderColor
                | TransitionProperty::Filter
                | TransitionProperty::BackdropFilter
                | TransitionProperty::Transform
                | TransitionProperty::BoxShadow => {
                    TransitionProperty::ANIMATABLE.contains(&property)
                }
            }
        }
        assert!(TransitionProperty::ANIMATABLE.into_iter().all(animatable));
        let names: BTreeSet<_> = TransitionProperty::ANIMATABLE
            .iter()
            .map(|property| property.css_name())
            .collect();
        assert_eq!(
            names.len(),
            TransitionProperty::ANIMATABLE.len(),
            "css names are distinct"
        );
    }
}
