//! A retained Stylo style tree, sampled by the native owner's clock.
//!
//! Blitz supplies CSS parsing, transition creation, easing and reversal semantics.
//! This module deliberately never calls `BaseDocument::resolve`: layout and text
//! measurement remain in the owner's Taffy/Godot pipeline.

use std::collections::{BTreeMap, BTreeSet};

use blitz_dom::{BaseDocument, DocumentConfig, NodeId, StyleThreading, qual_name};
use style::values::computed::length::CSSPixelLength;
use style::values::computed::{LengthPercentage, Size};

use crate::protocol::{
    Dimension, DisplaySpec, Easing, Model, StyleSpec, TransitionProperty, TransitionSpec,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum DimensionAxis {
    Width,
    Height,
}

impl DimensionAxis {
    pub fn css_name(self) -> &'static str {
        match self {
            Self::Width => "width",
            Self::Height => "height",
        }
    }

    fn property(self) -> TransitionProperty {
        match self {
            Self::Width => TransitionProperty::Width,
            Self::Height => TransitionProperty::Height,
        }
    }
}

/// Explicit native intrinsic endpoints, separate from authored auto/% values.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct DimensionOverrides {
    pub width: Option<f32>,
    pub height: Option<f32>,
}

/// Own the computed length-percentage, including Stylo's calc expression.
///
/// Copying `stylo_taffy::dimension()` into a high-level TaffyTree is insufficient:
/// mixed px/% transitions produce raw calc pointers, while TaffyTree's calc
/// resolver returns zero. Keeping the owned Stylo value avoids dangling pointers
/// and permits diagnostic resolution against an explicit basis. The current
/// native layout path rejects mixed-unit transitions until a current-layout
/// calc resolver is integrated.
#[derive(Clone, Debug, PartialEq)]
pub enum SampledDimension {
    Auto,
    LengthPercentage(LengthPercentage),
}

impl SampledDimension {
    pub fn is_auto(&self) -> bool {
        matches!(self, Self::Auto)
    }

    pub fn as_px(&self) -> Option<f32> {
        match self {
            Self::Auto => None,
            Self::LengthPercentage(value) => value.to_length().map(|length| length.px()),
        }
    }

    pub fn as_percentage(&self) -> Option<f32> {
        match self {
            Self::Auto => None,
            Self::LengthPercentage(value) => value.to_percentage().map(|percentage| percentage.0),
        }
    }

    pub fn resolve(&self, parent_basis: f32) -> Option<f32> {
        match self {
            Self::Auto => None,
            Self::LengthPercentage(value) => {
                Some(value.resolve(CSSPixelLength::new(parent_basis)).px())
            }
        }
    }

    pub fn to_taffy(&self) -> Result<taffy::Dimension, String> {
        if self.is_auto() {
            Ok(taffy::style_helpers::auto())
        } else if let Some(px) = self.as_px() {
            Ok(taffy::Dimension::length(px))
        } else if let Some(percentage) = self.as_percentage() {
            Ok(taffy::Dimension::percent(percentage))
        } else {
            // TaffyTree does not resolve Stylo calc pointers. Resolving against
            // the previous frame's parent size would silently introduce lag when
            // that containing block is changing. The owner preflights this
            // unsupported transition before mutating either tree.
            Err("mixed pixel/percentage transitions require a current-layout calc resolver; use same-unit dimensions or the native intrinsic keyword bridge".into())
        }
    }
}

#[derive(Clone, Debug)]
pub struct SampledStyle {
    pub width: SampledDimension,
    pub height: SampledDimension,
    pub opacity: f32,
    /// Non-premultiplied sRGB, matching Godot Color components.
    pub background_color: [f32; 4],
}

#[derive(Default)]
pub struct StyleFrame {
    /// Only mounted nodes have sampled styles; detached nodes retain authored data.
    pub values: BTreeMap<u32, SampledStyle>,
    /// Actual pending/running Stylo animations, not a guessed duration timer.
    pub active: bool,
}

#[derive(Clone, Debug, PartialEq)]
struct AppliedStyle {
    width: Dimension,
    height: Dimension,
    opacity: f32,
    background_color: String,
    hidden: bool,
    transition: Option<TransitionSpec>,
}

impl AppliedStyle {
    fn from_authored(style: &StyleSpec, overrides: Option<&DimensionOverrides>) -> Self {
        Self {
            width: overrides
                .and_then(|value| value.width)
                .map(Dimension::Num)
                .unwrap_or_else(|| {
                    style
                        .width
                        .clone()
                        .unwrap_or_else(|| Dimension::Text("auto".into()))
                }),
            height: overrides
                .and_then(|value| value.height)
                .map(Dimension::Num)
                .unwrap_or_else(|| {
                    style
                        .height
                        .clone()
                        .unwrap_or_else(|| Dimension::Text("auto".into()))
                }),
            opacity: style.opacity.unwrap_or(1.0),
            background_color: style
                .background_color
                .clone()
                .unwrap_or_else(|| "#00000000".into()),
            hidden: style.display == Some(DisplaySpec::None),
            transition: style.transition.clone(),
        }
    }

    fn set_dimension(&mut self, axis: DimensionAxis, value: Dimension) {
        match axis {
            DimensionAxis::Width => self.width = value,
            DimensionAxis::Height => self.height = value,
        }
    }
}

pub struct StyleEngine {
    document: BaseDocument,
    nodes: BTreeMap<u32, NodeId>,
    applied: BTreeMap<u32, AppliedStyle>,
    mounted: BTreeSet<u32>,
    last_time: f64,
}

impl Default for StyleEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl StyleEngine {
    pub fn new() -> Self {
        let config = DocumentConfig {
            // Only explicitly supplied inline styles participate. No browser UA
            // dimensions or font styles are allowed to alter the native model.
            ua_stylesheets: Vec::new(),
            style_threading: StyleThreading::Sequential,
            ..DocumentConfig::default()
        };
        let mut document = BaseDocument::new(config);
        let document_root = document.root_node().id;
        let root;
        {
            let mut mutator = document.mutate();
            root = mutator.create_element(qual_name!("html", html), Vec::new());
            mutator.append_children(document_root, &[root]);
        }
        Self {
            document,
            nodes: BTreeMap::from([(0, root)]),
            applied: BTreeMap::new(),
            mounted: BTreeSet::from([0]),
            last_time: 0.0,
        }
    }

    /// Publish validated authored styles plus any native intrinsic pixel targets.
    ///
    /// `immediate` suppresses only the indicated dimension transitions for this
    /// update. This is used when restoring canonical auto after the pixel endpoint
    /// is reached; opacity/background transitions continue undisturbed.
    pub fn sync_model(
        &mut self,
        model: &Model,
        overrides: &BTreeMap<u32, DimensionOverrides>,
        immediate: &BTreeSet<(u32, DimensionAxis)>,
        now: f64,
    ) -> Result<StyleFrame, String> {
        self.validate_time(now)?;
        for (id, value) in overrides {
            if !model.nodes.contains_key(id) {
                return Err(format!("intrinsic override refers to missing node {id}"));
            }
            if value
                .width
                .into_iter()
                .chain(value.height)
                .any(|value| !value.is_finite() || value < 0.0)
            {
                return Err(format!(
                    "intrinsic override for node {id} must be finite and nonnegative"
                ));
            }
        }
        for (id, _) in immediate {
            if !model.nodes.contains_key(id) {
                return Err(format!(
                    "immediate style update refers to missing node {id}"
                ));
            }
        }

        for id in model.nodes.keys() {
            if !self.nodes.contains_key(id) {
                let node = self
                    .document
                    .mutate()
                    .create_element(qual_name!("div", html), Vec::new());
                self.nodes.insert(*id, node);
            }
        }

        // Reparent surviving nodes before deleting removed branches. Blitz's
        // replace_children detaches, but does not free, existing children.
        for (id, node) in &model.nodes {
            let native_id = self.nodes[id];
            let children: Vec<_> = node
                .children
                .iter()
                .map(|child| self.nodes[child])
                .collect();
            let current = self
                .document
                .get_node(native_id)
                .expect("mapped Stylo node");
            if current.children.as_slice() != children.as_slice() {
                self.document
                    .mutate()
                    .replace_children(native_id, &children);
            }
        }
        let removed: Vec<_> = self
            .nodes
            .keys()
            .copied()
            .filter(|id| !model.nodes.contains_key(id))
            .collect();
        for id in removed {
            let native_id = self.nodes.remove(&id).expect("enumerated Stylo node");
            // Detach rather than freeing the SlotMap entry: blitz-dom's Stylo bridge
            // converts NodeId(u64) through OpaqueNode(usize), which truncates the
            // upper 32-bit SlotMap version to v1 on 32-bit wasm32. Keeping slots at
            // v1 preserves OpaqueNode -> NodeId round-tripping on WebAssembly while
            // still marking removed nodes out-of-document so resolve_stylist cancels
            // their active transitions.
            if self.document.get_node(native_id).is_some() {
                self.document.mutate().remove_node(native_id);
            }
            self.applied.remove(&id);
        }

        self.mounted.clear();
        let mut pending = vec![0];
        while let Some(id) = pending.pop() {
            self.mounted.insert(id);
            pending.extend(model.nodes[&id].children.iter().copied());
        }

        for (id, node) in &model.nodes {
            let next = AppliedStyle::from_authored(&node.style, overrides.get(id));
            let blocked = blocked_properties(*id, immediate);
            self.write_style(*id, &next, &blocked);
            self.applied.insert(*id, next);
        }
        self.document.resolve_stylist(now);

        if !immediate.is_empty() {
            // Reenable configured transitions only after the immediate target has
            // become the current computed value; reenabling alone cannot restart it.
            for id in immediate.iter().map(|(id, _)| *id).collect::<BTreeSet<_>>() {
                let style = &self.applied[&id];
                let properties = transition_properties(style.transition.as_ref(), &BTreeSet::new());
                self.document.mutate().set_style_property(
                    self.nodes[&id],
                    "transition-property",
                    &properties,
                );
            }
            self.document.resolve_stylist(now);
        }
        self.collect_frame()
    }

    /// Seed an auto dimension with its current native pixel value before assigning
    /// an intrinsic pixel target. This does not modify the caller's authored model.
    pub fn prime_dimension(
        &mut self,
        id: u32,
        axis: DimensionAxis,
        px: f32,
        now: f64,
    ) -> Result<(), String> {
        self.validate_time(now)?;
        if !px.is_finite() || px < 0.0 {
            return Err("primed dimension must be finite and nonnegative".into());
        }
        let native_id = *self
            .nodes
            .get(&id)
            .ok_or_else(|| format!("cannot prime missing Stylo node {id}"))?;
        let mut applied = self
            .applied
            .get(&id)
            .cloned()
            .ok_or_else(|| format!("cannot prime unstyled node {id}"))?;
        let blocked = BTreeSet::from([axis.property()]);
        let properties = transition_properties(applied.transition.as_ref(), &blocked);
        {
            let mut mutator = self.document.mutate();
            mutator.set_style_property(native_id, "transition-property", &properties);
            mutator.set_style_property(native_id, axis.css_name(), &format!("{px}px"));
        }
        self.document.resolve_stylist(now);
        applied.set_dimension(axis, Dimension::Num(px));
        let properties = transition_properties(applied.transition.as_ref(), &BTreeSet::new());
        self.document
            .mutate()
            .set_style_property(native_id, "transition-property", &properties);
        self.applied.insert(id, applied);
        Ok(())
    }

    pub fn sample(&mut self, now: f64) -> Result<StyleFrame, String> {
        self.validate_time(now)?;
        self.document.resolve_stylist(now);
        self.collect_frame()
    }

    fn validate_time(&mut self, now: f64) -> Result<(), String> {
        if !now.is_finite() || now < self.last_time {
            return Err(format!(
                "Stylo clock must be finite and monotonic: {} -> {now}",
                self.last_time
            ));
        }
        self.last_time = now;
        Ok(())
    }

    fn write_style(
        &mut self,
        id: u32,
        next: &AppliedStyle,
        blocked: &BTreeSet<TransitionProperty>,
    ) {
        let previous = self.applied.get(&id);
        let native_id = self.nodes[&id];
        let mut mutator = self.document.mutate();
        if previous.is_none_or(|previous| previous.width != next.width) {
            mutator.set_style_property(native_id, "width", &dimension_css(&next.width));
        }
        if previous.is_none_or(|previous| previous.height != next.height) {
            mutator.set_style_property(native_id, "height", &dimension_css(&next.height));
        }
        if previous.is_none_or(|previous| previous.opacity != next.opacity) {
            mutator.set_style_property(native_id, "opacity", &next.opacity.to_string());
        }
        if previous.is_none_or(|previous| previous.background_color != next.background_color) {
            mutator.set_style_property(native_id, "background-color", &next.background_color);
        }
        if previous.is_none_or(|previous| previous.hidden != next.hidden) {
            mutator.set_style_property(
                native_id,
                "display",
                if next.hidden { "none" } else { "block" },
            );
        }
        // Always write the property list: prime_dimension may have temporarily
        // filtered it, even when the authored TransitionSpec did not change.
        mutator.set_style_property(
            native_id,
            "transition-property",
            &transition_properties(next.transition.as_ref(), blocked),
        );
        if previous.is_none_or(|previous| previous.transition != next.transition) {
            let duration = next
                .transition
                .as_ref()
                .map_or(0.0, |transition| transition.duration_ms);
            let delay = next
                .transition
                .as_ref()
                .and_then(|transition| transition.delay_ms)
                .unwrap_or(0.0);
            let easing = next
                .transition
                .as_ref()
                .and_then(|transition| transition.easing)
                .unwrap_or(Easing::Ease);
            mutator.set_style_property(native_id, "transition-duration", &format!("{duration}ms"));
            mutator.set_style_property(native_id, "transition-delay", &format!("{delay}ms"));
            mutator.set_style_property(native_id, "transition-timing-function", easing_css(easing));
        }
    }

    fn collect_frame(&self) -> Result<StyleFrame, String> {
        let mut values = BTreeMap::new();
        for id in &self.mounted {
            let native_id = self.nodes[id];
            let node = self
                .document
                .get_node(native_id)
                .ok_or_else(|| format!("missing mounted Stylo node {id}"))?;
            let primary = node.primary_styles();
            let undisplayed;
            let computed = if let Some(primary) = primary.as_ref() {
                &***primary
            } else {
                undisplayed = self
                    .document
                    .resolve_undisplayed_style(native_id)
                    .ok_or_else(|| format!("Stylo did not compute mounted node {id}"))?;
                &*undisplayed
            };
            let position = computed.get_position();
            let current_color = computed.get_inherited_text().color;
            let background = computed
                .get_background()
                .background_color
                .resolve_to_absolute(&current_color)
                .into_srgb_legacy();
            values.insert(
                *id,
                SampledStyle {
                    width: sampled_dimension(&position.width)?,
                    height: sampled_dimension(&position.height)?,
                    opacity: computed.get_effects().opacity,
                    background_color: *background.raw_components(),
                },
            );
        }
        Ok(StyleFrame {
            values,
            active: self.document.is_animating(),
        })
    }
}

fn sampled_dimension(value: &Size) -> Result<SampledDimension, String> {
    match value {
        Size::Auto => Ok(SampledDimension::Auto),
        Size::LengthPercentage(value) => Ok(SampledDimension::LengthPercentage(value.0.clone())),
        other => Err(format!("unsupported sampled dimension {other:?}")),
    }
}

fn dimension_css(value: &Dimension) -> String {
    match value {
        Dimension::Num(value) => format!("{value}px"),
        Dimension::Text(value) => value.clone(),
    }
}

fn blocked_properties(
    id: u32,
    immediate: &BTreeSet<(u32, DimensionAxis)>,
) -> BTreeSet<TransitionProperty> {
    immediate
        .iter()
        .filter_map(|(candidate, axis)| (*candidate == id).then_some(axis.property()))
        .collect()
}

fn transition_properties(
    transition: Option<&TransitionSpec>,
    blocked: &BTreeSet<TransitionProperty>,
) -> String {
    let Some(transition) = transition else {
        return "none".into();
    };
    let properties: Vec<_> = transition
        .properties
        .iter()
        .filter(|property| !blocked.contains(property))
        .map(|property| match property {
            TransitionProperty::Width => "width",
            TransitionProperty::Height => "height",
            TransitionProperty::Opacity => "opacity",
            TransitionProperty::BackgroundColor => "background-color",
        })
        .collect();
    if properties.is_empty() {
        "none".into()
    } else {
        properties.join(", ")
    }
}

fn easing_css(easing: Easing) -> &'static str {
    match easing {
        Easing::Linear => "linear",
        Easing::Ease => "ease",
        Easing::EaseIn => "ease-in",
        Easing::EaseOut => "ease-out",
        Easing::EaseInOut => "ease-in-out",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::Command;

    const TOLERANCE: f32 = 0.01;

    fn model(height: &str) -> Model {
        let mut model = Model::default();
        apply(
            &mut model,
            &format!(
                r##"[
            {{"op":"create","id":1,"kind":"view"}},
            {{"op":"style","id":1,"style":{{"height":{height},"backgroundColor":"#000000","opacity":1,"transition":{{"properties":["height","opacity","backgroundColor"],"durationMs":1000,"easing":"linear"}}}}}},
            {{"op":"children","id":0,"children":[1]}}
        ]"##
            ),
        );
        model
    }

    fn apply(model: &mut Model, json: &str) {
        let commands: Vec<Command> = serde_json::from_str(json).expect("fixture JSON");
        model.apply(&commands).expect("fixture model");
    }

    fn sync(engine: &mut StyleEngine, model: &Model, now: f64) -> StyleFrame {
        engine
            .sync_model(model, &BTreeMap::new(), &BTreeSet::new(), now)
            .expect("style sync")
    }

    fn near(actual: f32, expected: f32) {
        assert!(
            (actual - expected).abs() <= TOLERANCE,
            "expected {expected}, observed {actual}"
        );
    }

    #[test]
    fn stylo_samples_numeric_color_and_opacity_transitions() {
        let mut engine = StyleEngine::new();
        let mut model = model("40");
        sync(&mut engine, &model, 0.0);
        model.nodes.get_mut(&1).expect("fixture node").style.height = Some(Dimension::Num(120.0));
        model.nodes.get_mut(&1).expect("fixture node").style.opacity = Some(0.0);
        model
            .nodes
            .get_mut(&1)
            .expect("fixture node")
            .style
            .background_color = Some("#ffffff".into());
        sync(&mut engine, &model, 0.0);
        let middle = engine.sample(0.5).expect("midpoint");
        near(
            middle.values[&1].height.as_px().expect("numeric height"),
            80.0,
        );
        near(middle.values[&1].opacity, 0.5);
        for channel in &middle.values[&1].background_color[..3] {
            assert!(
                *channel > 0.0 && *channel < 1.0,
                "color must be an actual interpolated sample"
            );
        }
        assert!(middle.active);
        let end = engine.sample(1.1).expect("endpoint");
        near(
            end.values[&1].height.as_px().expect("numeric height"),
            120.0,
        );
        assert!(!end.active);
    }

    #[test]
    fn stylo_preserves_current_value_and_css_reversal_shortening() {
        let mut engine = StyleEngine::new();
        let mut model = model("40");
        sync(&mut engine, &model, 0.0);
        model.nodes.get_mut(&1).expect("fixture node").style.height = Some(Dimension::Num(120.0));
        sync(&mut engine, &model, 0.0);
        near(
            engine.sample(0.5).expect("midpoint").values[&1]
                .height
                .as_px()
                .expect("height"),
            80.0,
        );
        model.nodes.get_mut(&1).expect("fixture node").style.height = Some(Dimension::Num(40.0));
        near(
            sync(&mut engine, &model, 0.5).values[&1]
                .height
                .as_px()
                .expect("height"),
            80.0,
        );
        near(
            engine.sample(0.75).expect("reversal").values[&1]
                .height
                .as_px()
                .expect("height"),
            60.0,
        );
        assert!(!engine.sample(1.1).expect("end").active);
    }

    #[test]
    fn native_intrinsic_override_can_restore_authored_auto_without_restarting() {
        let mut engine = StyleEngine::new();
        let model = model(r#""auto""#);
        sync(&mut engine, &model, 0.0);
        engine
            .prime_dimension(1, DimensionAxis::Height, 40.0, 0.0)
            .expect("prime measured auto");
        let mut overrides = BTreeMap::from([(
            1,
            DimensionOverrides {
                height: Some(120.0),
                ..DimensionOverrides::default()
            },
        )]);
        engine
            .sync_model(&model, &overrides, &BTreeSet::new(), 0.0)
            .expect("intrinsic target");
        near(
            engine.sample(0.5).expect("midpoint").values[&1]
                .height
                .as_px()
                .expect("height"),
            80.0,
        );
        engine.sample(1.1).expect("end");
        overrides.clear();
        let restored = engine
            .sync_model(
                &model,
                &overrides,
                &BTreeSet::from([(1, DimensionAxis::Height)]),
                1.1,
            )
            .expect("restore auto");
        assert!(restored.values[&1].height.is_auto());
        assert!(!restored.active);
        assert!(
            matches!(model.nodes[&1].style.height, Some(Dimension::Text(ref value)) if value == "auto")
        );
    }

    #[test]
    fn intrinsic_axis_restores_auto_while_unrelated_paint_keeps_animating() {
        let mut engine = StyleEngine::new();
        let mut model = model(r#""auto""#);
        apply(
            &mut model,
            r##"[
                {"op":"create","id":2,"kind":"view"},
                {"op":"style","id":2,"style":{
                    "opacity":1,"backgroundColor":"#000000",
                    "transition":{"properties":["opacity","backgroundColor"],"durationMs":2000,"easing":"linear"}
                }},
                {"op":"children","id":0,"children":[1,2]}
            ]"##,
        );
        sync(&mut engine, &model, 0.0);
        engine
            .prime_dimension(1, DimensionAxis::Height, 40.0, 0.0)
            .expect("prime measured auto");
        let mut overrides = BTreeMap::from([(
            1,
            DimensionOverrides {
                height: Some(120.0),
                ..DimensionOverrides::default()
            },
        )]);
        apply(
            &mut model,
            r##"[{"op":"style","id":2,"style":{
                "opacity":0,"backgroundColor":"#ffffff",
                "transition":{"properties":["opacity","backgroundColor"],"durationMs":2000,"easing":"linear"}
            }}]"##,
        );
        engine
            .sync_model(&model, &overrides, &BTreeSet::new(), 0.0)
            .expect("start independent size and paint transitions");

        let height_finished = engine
            .sample(1.1)
            .expect("height endpoint before paint endpoint");
        near(
            height_finished.values[&1]
                .height
                .as_px()
                .expect("height endpoint"),
            120.0,
        );
        near(height_finished.values[&2].opacity, 0.45);
        assert!(
            height_finished.active,
            "unrelated paint must still need ticks"
        );

        overrides.clear();
        let restored = engine
            .sync_model(
                &model,
                &overrides,
                &BTreeSet::from([(1, DimensionAxis::Height)]),
                1.1,
            )
            .expect("restore only the completed intrinsic axis");
        assert!(restored.values[&1].height.is_auto());
        assert!(restored.active, "restoring height must not cancel paint");
        near(
            restored.values[&2].opacity,
            height_finished.values[&2].opacity,
        );
        assert_eq!(
            restored.values[&2].background_color, height_finished.values[&2].background_color,
            "restoring height must not restart or resample paint at a different time"
        );

        apply(
            &mut model,
            r##"[{"op":"style","id":1,"style":{
                "height":"auto","backgroundColor":"#00ff00","opacity":1,
                "transition":{"properties":["height","opacity","backgroundColor"],"durationMs":1000,"easing":"linear"}
            }}]"##,
        );
        let paint_update = sync(&mut engine, &model, 1.2);
        assert!(paint_update.values[&1].height.is_auto());
        assert!(paint_update.active);
        let later = engine
            .sample(1.5)
            .expect("paint continues after auto restoration");
        assert!(later.values[&1].height.is_auto());
        near(later.values[&2].opacity, 0.25);
        assert!(later.active);
        let finished = engine.sample(2.3).expect("all paint finished");
        assert!(finished.values[&1].height.is_auto());
        assert!(!finished.active);
        assert!(
            matches!(model.nodes[&1].style.height, Some(Dimension::Text(ref value)) if value == "auto")
        );
    }

    #[test]
    fn mixed_pixel_percentage_samples_keep_stylo_calc_semantics() {
        let mut engine = StyleEngine::new();
        let mut model = model("40");
        sync(&mut engine, &model, 0.0);
        model.nodes.get_mut(&1).expect("fixture node").style.height =
            Some(Dimension::Text("50%".into()));
        sync(&mut engine, &model, 0.0);
        let frame = engine.sample(0.5).expect("mixed unit midpoint");
        let height = &frame.values[&1].height;
        assert!(height.as_px().is_none());
        assert!(height.as_percentage().is_none());
        near(height.resolve(200.0).expect("resolved calc"), 70.0);
        near(
            height.resolve(400.0).expect("resized containing block"),
            120.0,
        );
    }

    #[test]
    fn pending_css_delay_keeps_the_native_clock_active() {
        let mut engine = StyleEngine::new();
        let mut model = model("40");
        model
            .nodes
            .get_mut(&1)
            .expect("fixture node")
            .style
            .transition
            .as_mut()
            .expect("fixture transition")
            .delay_ms = Some(500.0);
        sync(&mut engine, &model, 0.0);
        model.nodes.get_mut(&1).expect("fixture node").style.height = Some(Dimension::Num(120.0));
        sync(&mut engine, &model, 0.0);
        let pending = engine.sample(0.25).expect("delay");
        assert!(pending.active);
        near(pending.values[&1].height.as_px().expect("height"), 40.0);
        near(
            engine.sample(1.0).expect("midpoint").values[&1]
                .height
                .as_px()
                .expect("height"),
            80.0,
        );
        assert!(!engine.sample(1.6).expect("endpoint").active);
    }

    #[test]
    fn dropping_an_animating_node_clears_stylo_ticks() {
        let mut engine = StyleEngine::new();
        let mut model = model("40");
        sync(&mut engine, &model, 0.0);
        model.nodes.get_mut(&1).expect("fixture node").style.height = Some(Dimension::Num(120.0));
        sync(&mut engine, &model, 0.0);
        apply(&mut model, r#"[{"op":"remove","id":1}]"#);
        let frame = sync(&mut engine, &model, 0.2);
        assert!(!frame.active);
        assert!(!frame.values.contains_key(&1));

        // Subsequent nodes created after removals must keep SlotMap v1 so blitz-dom's
        // 32-bit usize OpaqueNode conversion on wasm32 round-trips to the live NodeId.
        apply(
            &mut model,
            r##"[
                {"op":"create","id":2,"kind":"view"},
                {"op":"style","id":2,"style":{"height":40,"transition":{"properties":["height"],"durationMs":1000,"easing":"linear"}}},
                {"op":"children","id":0,"children":[2]}
            ]"##,
        );
        sync(&mut engine, &model, 0.2);
        let native_id = engine.nodes[&2];
        let wasm32_opaque_roundtrip =
            blitz_traits::node_id::NodeId::from_u64(u64::from(native_id.as_u64() as u32));
        assert_eq!(
            engine
                .document
                .get_node(wasm32_opaque_roundtrip)
                .map(|node| node.id),
            Some(native_id)
        );
        model.nodes.get_mut(&2).expect("remounted node").style.height =
            Some(Dimension::Num(120.0));
        sync(&mut engine, &model, 0.2);
        let middle = engine.sample(0.7).expect("remounted midpoint");
        assert!(middle.active);
        near(middle.values[&2].height.as_px().expect("height"), 80.0);
    }
}
