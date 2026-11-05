//! Native transition bookkeeping: Stylo sampling, intrinsic `0 <-> auto` tracks and
//! presentation overrides for `ReactUiRoot`.
use std::collections::{BTreeMap, BTreeSet};
use std::time::Instant;

use godot::prelude::*;
use serde::Serialize;
use serde_json::json;
use taffy::prelude::Size;

use crate::layout::compute_tree;
use crate::paint::parse_color;
use crate::profile::{Sample, micros};
use crate::protocol::{self, Dimension, InterpolateSize, Model, StyleSpec, TransitionProperty};
use crate::style_engine::{DimensionAxis, DimensionOverrides};
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
enum MotionValue {
    Number(f32),
    Color(String),
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

impl ReactUiRoot {
    pub(crate) fn activity_json(&self) -> serde_json::Value {
        json!({"batches":self.stats.batches,"layoutPasses":self.stats.layout_passes,
            "paintPasses":self.stats.paint_passes,"animationFrames":self.stats.animation_frames,
            "animating":self.style_frame.active || !self.intrinsic.is_empty(),"trackedTransitions":self.transitions.len(),"clockMs":self.clock_ms,
            "drawSerial":self.stats.paint_passes,"nodeCount":self.stats.node_count})
    }

    pub(crate) fn presentation_json(&self, id: u32) -> serde_json::Value {
        let rect = self.rects.get(&id).copied().unwrap_or_default();
        let style = &self.model.nodes[&id].style;
        let value = self.style_frame.values.get(&id);
        let layout_style = self
            .tree
            .style(self.handles[&id])
            .expect("snapshot layout node exists");
        json!({"width":rect.width,"height":rect.height,
            "widthIsAuto":layout_style.size.width.is_auto(),"heightIsAuto":layout_style.size.height.is_auto(),
            "opacity":value.map(|v|v.opacity).unwrap_or(style.opacity.unwrap_or(1.0)),
            "backgroundColor":value.map(|v|color_hex(v.background_color)).unwrap_or_else(||
                color_hex(color_components(parse_color(style.background_color.as_deref(), Color::TRANSPARENT_BLACK, 1.0))))})
    }

    fn parent_basis(&self, id: u32) -> Vector2 {
        let Some(parent) = self.model.nodes[&id].parent else {
            return self.viewport_size;
        };
        let Some(rect) = self.rects.get(&parent) else {
            return self.viewport_size;
        };
        let layout = self
            .tree
            .layout(self.handles[&parent])
            .expect("known parent layout");
        Vector2::new(
            (rect.width
                - layout.padding.left
                - layout.padding.right
                - layout.border.left
                - layout.border.right)
                .max(0.0),
            (rect.height
                - layout.padding.top
                - layout.padding.bottom
                - layout.border.top
                - layout.border.bottom)
                .max(0.0),
        )
    }

    pub(crate) fn apply_presentation(&mut self) {
        for (id, value) in &self.style_frame.values {
            let Some(node) = self.model.nodes.get(id) else {
                continue;
            };
            if *id == 0 {
                continue;
            }
            let mut style = node.style.taffy_style().expect("validated authored style");
            style.size.width = value
                .width
                .to_taffy()
                .expect("mixed units rejected before mutation");
            style.size.height = value
                .height
                .to_taffy()
                .expect("mixed units rejected before mutation");
            let handle = self.handles[id];
            if self.tree.style(handle).expect("known presentation node") != &style {
                self.tree
                    .set_style(handle, style)
                    .expect("known presentation node");
            }
            if let Some(visual) = self.visuals.get_mut(id) {
                visual.background_color = Color::from_rgba(
                    value.background_color[0],
                    value.background_color[1],
                    value.background_color[2],
                    value.background_color[3],
                );
            }
        }
    }

    pub(crate) fn publish_model(&mut self, staged: Model) {
        let mut changed = Vec::new();
        let mut intrinsic_changes = Vec::new();
        for (id, node) in &staged.nodes {
            let Some(previous) = self.model.nodes.get(id) else {
                continue;
            };
            let Some(transition) = &node.style.transition else {
                continue;
            };
            if transition.duration_ms == 0.0 || !self.rects.contains_key(id) {
                continue;
            }
            for property in &transition.properties {
                if property_changed(&previous.style, &node.style, *property) {
                    if let Some(axis) = property_axis(*property) {
                        let old = dimension_value(&previous.style, axis);
                        let new = dimension_value(&node.style, axis);
                        if is_auto(&old) || is_auto(&new) {
                            if effective_interpolate_size(&staged, *id)
                                != InterpolateSize::AllowKeywords
                            {
                                continue;
                            }
                            intrinsic_changes.push((*id, axis));
                        }
                    }
                    changed.push((*id, *property, transition.duration_ms));
                }
            }
        }
        // Prime only keyword boundaries; ordinary numeric/color interpolation and
        // interruption/reversal remain entirely inside Stylo.
        for (id, axis) in &intrinsic_changes {
            if !self.intrinsic.contains_key(&(*id, *axis)) {
                let rect = self.rects[id];
                let current = match axis {
                    DimensionAxis::Width => rect.width,
                    DimensionAxis::Height => rect.height,
                };
                self.style_engine
                    .prime_dimension(*id, *axis, current, self.clock_ms / MILLISECONDS_PER_SECOND)
                    .expect("validated intrinsic prime");
            }
        }
        self.sync_model(staged);
        // New content is present in native measurement contexts, but no geometry
        // has been published or drawn from this target-only state.
        for (id, axis) in intrinsic_changes {
            let target_px = self.measure_endpoint(id, axis);
            set_override(&mut self.overrides, id, axis, Some(target_px));
            self.intrinsic.insert(
                (id, axis),
                IntrinsicTrack {
                    target_px,
                    content_generation: self.content_generation,
                    parent_basis: self.parent_basis(id),
                    measured_width: self.rects.get(&id).map(|rect| rect.width).unwrap_or(0.0),
                },
            );
        }
        self.style_frame = self
            .style_engine
            .sync_model(
                &self.model,
                &self.overrides,
                &BTreeSet::new(),
                self.clock_ms / MILLISECONDS_PER_SECOND,
            )
            .expect("validated CSS transaction");
        self.apply_presentation();
        self.flush_layout();
        for (id, property, duration_ms) in changed {
            let current = self.current_motion_value(id, property);
            let target = self.target_motion_value(id, property);
            if current != target {
                self.transitions.insert(
                    (id, property),
                    TransitionRecord {
                        id,
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
        let active = (self.style_frame.active || !self.intrinsic.is_empty())
            && self.base().is_inside_tree();
        self.base_mut().set_process(active);
    }

    fn current_motion_value(&self, id: u32, property: TransitionProperty) -> MotionValue {
        let node = &self.model.nodes[&id];
        let sample = self.style_frame.values.get(&id);
        let basis = self.parent_basis(id);
        match property {
            TransitionProperty::Width => MotionValue::Number(
                sample
                    .and_then(|v| v.width.resolve(basis.x))
                    .unwrap_or(self.rects[&id].width),
            ),
            TransitionProperty::Height => MotionValue::Number(
                sample
                    .and_then(|v| v.height.resolve(basis.y))
                    .unwrap_or(self.rects[&id].height),
            ),
            TransitionProperty::Opacity => MotionValue::Number(
                sample
                    .map(|v| v.opacity)
                    .unwrap_or(node.style.opacity.unwrap_or(1.0)),
            ),
            TransitionProperty::BackgroundColor => MotionValue::Color(
                sample
                    .map(|v| color_hex(v.background_color))
                    .unwrap_or_else(|| {
                        color_hex(color_components(parse_color(
                            node.style.background_color.as_deref(),
                            Color::TRANSPARENT_BLACK,
                            1.0,
                        )))
                    }),
            ),
        }
    }

    fn target_motion_value(&self, id: u32, property: TransitionProperty) -> MotionValue {
        let style = &self.model.nodes[&id].style;
        match property {
            TransitionProperty::Width | TransitionProperty::Height => {
                let axis = property_axis(property).expect("dimension property");
                let value = self
                    .intrinsic
                    .get(&(id, axis))
                    .map(|track| track.target_px)
                    .unwrap_or_else(|| {
                        let basis = self.parent_basis(id);
                        resolve_dimension(
                            &dimension_value(style, axis),
                            match axis {
                                DimensionAxis::Width => basis.x,
                                DimensionAxis::Height => basis.y,
                            },
                        )
                        .unwrap_or_else(|| match axis {
                            DimensionAxis::Width => self.rects[&id].width,
                            DimensionAxis::Height => self.rects[&id].height,
                        })
                    });
                MotionValue::Number(value)
            }
            TransitionProperty::Opacity => MotionValue::Number(style.opacity.unwrap_or(1.0)),
            TransitionProperty::BackgroundColor => {
                MotionValue::Color(color_hex(color_components(parse_color(
                    style.background_color.as_deref(),
                    Color::TRANSPARENT_BLACK,
                    1.0,
                ))))
            }
        }
    }

    fn measure_endpoint(&self, id: u32, axis: DimensionAxis) -> f32 {
        let mut probe = self.tree.clone();
        // TaffyTree::clone would otherwise retain the same mutable Godot paragraph
        // resources. Duplicate shaping buffers so measuring an endpoint never
        // changes visible text wrapping or the presentation tree's geometry.
        for (node_id, handle) in &self.handles {
            if let Some(paragraph) = self
                .visuals
                .get(node_id)
                .and_then(|visual| visual.paragraph.as_ref())
            {
                let duplicate = paragraph
                    .duplicate()
                    .expect("TextParagraph duplicate is available");
                probe
                    .set_node_context(
                        *handle,
                        Some(TextContext {
                            paragraph: duplicate,
                        }),
                    )
                    .expect("known probe handle");
            }
        }
        let handle = self.handles[&id];
        let mut style = probe.style(handle).expect("known probe style").clone();
        let authored = self.model.nodes[&id]
            .style
            .taffy_style()
            .expect("validated intrinsic target");
        match axis {
            DimensionAxis::Width => style.size.width = authored.size.width,
            DimensionAxis::Height => style.size.height = authored.size.height,
        }
        probe
            .set_style(handle, style)
            .expect("known intrinsic target");
        let root = self.handles[&0];
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
        let mut changed = false;
        for (id, axis) in keys {
            if !self.rects.contains_key(&id) {
                self.intrinsic.remove(&(id, axis));
                set_override(&mut self.overrides, id, axis, None);
                self.transitions.remove(&(id, axis_property(axis)));
                changed = true;
                continue;
            }
            let parent_basis = self.parent_basis(id);
            let measured_width = self.rects[&id].width;
            let track = &self.intrinsic[&(id, axis)];
            if track.content_generation == self.content_generation
                && track.parent_basis == parent_basis
                && (axis != DimensionAxis::Height || track.measured_width == measured_width)
            {
                continue;
            }
            let target_px = self.measure_endpoint(id, axis);
            let old_target = track.target_px;
            self.intrinsic.insert(
                (id, axis),
                IntrinsicTrack {
                    target_px,
                    content_generation: self.content_generation,
                    parent_basis,
                    measured_width,
                },
            );
            if old_target != target_px {
                set_override(&mut self.overrides, id, axis, Some(target_px));
                if let Some(record) = self.transitions.get_mut(&(id, axis_property(axis))) {
                    record.target = MotionValue::Number(target_px);
                    record.started_at_ms = self.clock_ms;
                }
                changed = true;
            }
        }
        if changed {
            self.style_frame = self
                .style_engine
                .sync_model(
                    &self.model,
                    &self.overrides,
                    &BTreeSet::new(),
                    self.clock_ms / MILLISECONDS_PER_SECOND,
                )
                .expect("validated intrinsic retarget");
            self.apply_presentation();
            self.flush_layout();
        }
    }

    fn finish_transitions(&mut self) {
        let mut completed = BTreeSet::new();
        for ((id, axis), track) in &self.intrinsic {
            let Some(sample) = self.style_frame.values.get(id) else {
                continue;
            };
            let value = match axis {
                DimensionAxis::Width => sample.width.as_px(),
                DimensionAxis::Height => sample.height.as_px(),
            };
            // Intrinsic overrides are pure pixel tracks. Exact full-precision
            // equality restores this axis independently of unrelated CSS motion.
            if value == Some(track.target_px) {
                completed.insert((*id, *axis));
            }
        }
        for (id, axis) in &completed {
            self.intrinsic.remove(&(*id, *axis));
            set_override(&mut self.overrides, *id, *axis, None);
            self.transitions.remove(&(*id, axis_property(*axis)));
        }
        if !completed.is_empty() {
            self.style_frame = self
                .style_engine
                .sync_model(
                    &self.model,
                    &self.overrides,
                    &completed,
                    self.clock_ms / MILLISECONDS_PER_SECOND,
                )
                .expect("restore authored intrinsic dimensions");
            self.apply_presentation();
            self.flush_layout();
        }
        let keys: Vec<_> = self.transitions.keys().copied().collect();
        for (id, property) in keys {
            if !self.rects.contains_key(&id) {
                self.transitions.remove(&(id, property));
                continue;
            }
            let current = self.current_motion_value(id, property);
            let target = self.target_motion_value(id, property);
            if !self.style_frame.active && self.intrinsic.is_empty() {
                self.transitions.remove(&(id, property));
            } else if let Some(record) = self.transitions.get_mut(&(id, property)) {
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
        self.style_frame = self
            .style_engine
            .sample(self.clock_ms / MILLISECONDS_PER_SECOND)
            .expect("monotonic native CSS clock");
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
        let active = (self.style_frame.active || !self.intrinsic.is_empty())
            && self.base().is_inside_tree();
        self.base_mut().set_process(active);
    }
}

fn color_components(color: Color) -> [f32; 4] {
    [color.r, color.g, color.b, color.a]
}
fn color_hex(color: [f32; 4]) -> String {
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
        _ => None,
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
    }
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
pub(crate) fn validate_motion_changes(previous: &Model, staged: &Model) -> Result<(), String> {
    for (id, node) in &staged.nodes {
        let Some(old) = previous.nodes.get(id) else {
            continue;
        };
        let Some(transition) = &node.style.transition else {
            continue;
        };
        if transition.duration_ms == 0.0 {
            continue;
        }
        for property in &transition.properties {
            let Some(axis) = property_axis(*property) else {
                continue;
            };
            if !property_changed(&old.style, &node.style, *property) {
                continue;
            }
            let before = dimension_value(&old.style, axis);
            let after = dimension_value(&node.style, axis);
            if matches!((&before,&after), (Dimension::Num(_),Dimension::Text(value)) | (Dimension::Text(value),Dimension::Num(_)) if value != "auto")
            {
                return Err(format!(
                    "node {id}: {:?} transitions between pixels and percentages require a calc-aware layout tree; this prototype supports same-unit numeric transitions and native allow-keywords transitions",
                    axis
                ));
            }
            if !is_auto(&before) && !is_auto(&after) {
                continue;
            }
            if effective_interpolate_size(staged, *id) != InterpolateSize::AllowKeywords {
                continue;
            }
            if let Some(parent) = node.parent {
                let parent_style = &staged.nodes[&parent].style;
                let row = matches!(
                    parent_style.flex_direction,
                    Some(
                        protocol::FlexDirectionSpec::Row | protocol::FlexDirectionSpec::RowReverse
                    )
                );
                let main_axis = (row && axis == DimensionAxis::Width)
                    || (!row && axis == DimensionAxis::Height);
                if parent_style.display != Some(protocol::DisplaySpec::Grid)
                    && main_axis
                    && (node.style.flex_grow.unwrap_or(0.0) != 0.0
                        || node.style.flex_shrink.unwrap_or(1.0) != 0.0
                        || old.style.flex_grow.unwrap_or(0.0) != 0.0
                        || old.style.flex_shrink.unwrap_or(1.0) != 0.0)
                {
                    return Err(format!(
                        "node {id}: intrinsic {:?} transitions on a flex main axis require flexGrow:0 and flexShrink:0; animating a used size must not apply flex distribution twice",
                        axis
                    ));
                }
            }
        }
    }
    Ok(())
}

fn effective_interpolate_size(model: &Model, mut id: u32) -> InterpolateSize {
    loop {
        let node = &model.nodes[&id];
        if let Some(value) = node.style.interpolate_size {
            return value;
        }
        match node.parent {
            Some(parent) => id = parent,
            None => return InterpolateSize::NumericOnly,
        }
    }
}
