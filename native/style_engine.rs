//! A retained Stylo style tree, sampled by the native owner's clock.
//!
//! Blitz supplies CSS parsing, transition creation, easing and reversal semantics.
//! This module deliberately never calls `BaseDocument::resolve`: layout and text
//! measurement remain in the owner's Taffy/Godot pipeline.

use std::collections::{BTreeSet, HashMap};

use blitz_dom::{BaseDocument, DocumentConfig, NodeId, StyleThreading, qual_name};
use style::values::computed::length::CSSPixelLength;
use style::values::computed::{LengthPercentage, Size};

use crate::box_shadow::{ShadowLayer, ShadowList};
use crate::commit::LAYER_COUNT;
use crate::diff::Parent;
use crate::filter::{DropShadow, FilterFunction, FilterList, Rgba};
use crate::paint::parse_color;
use crate::props::{Dimension, DisplaySpec, Easing, StyleSpec, TransitionProperty, TransitionSpec};
use crate::transform::ComputedTransformValue;
use crate::transition::TransitionProperties;

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

    pub(crate) fn property(self) -> TransitionProperty {
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
    /// `min-content`, `max-content` or `fit-content`: nothing to interpolate, so the authored size stands.
    Intrinsic,
}

impl SampledDimension {
    pub fn is_auto(&self) -> bool {
        matches!(self, Self::Auto)
    }

    pub fn as_px(&self) -> Option<f32> {
        match self {
            Self::Auto | Self::Intrinsic => None,
            Self::LengthPercentage(value) => value.to_length().map(|length| length.px()),
        }
    }

    pub fn as_percentage(&self) -> Option<f32> {
        match self {
            Self::Auto | Self::Intrinsic => None,
            Self::LengthPercentage(value) => value.to_percentage().map(|percentage| percentage.0),
        }
    }

    pub fn resolve(&self, parent_basis: f32) -> Option<f32> {
        match self {
            Self::Auto | Self::Intrinsic => None,
            Self::LengthPercentage(value) => {
                Some(value.resolve(CSSPixelLength::new(parent_basis)).px())
            }
        }
    }

    /// The size to lay out with, or `None` to keep the authored one (an intrinsic keyword has no pixels of
    /// its own; Stylo cannot interpolate it, so it never animates).
    pub fn to_taffy(&self) -> Result<Option<taffy::Dimension>, String> {
        if matches!(self, Self::Intrinsic) {
            Ok(None)
        } else if self.is_auto() {
            Ok(Some(taffy::style_helpers::auto()))
        } else if let Some(px) = self.as_px() {
            Ok(Some(taffy::Dimension::length(px)))
        } else if let Some(percentage) = self.as_percentage() {
            Ok(Some(taffy::Dimension::percent(percentage)))
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
    /// The text colour and the border colour, in the same form.
    pub color: [f32; 4],
    pub border_color: [f32; 4],
    /// The sampled `filter` and `backdrop-filter`, per function (Stylo interpolates a list function by
    /// function and a missing function from its identity), with every shadow colour concrete.
    pub filter: FilterList,
    pub backdrop_filter: FilterList,
    /// The sampled `transform`: Stylo's computed list, which mid-transition may hold an interpolated matrix of
    /// two lists that did not match. It is evaluated against the element's box ([`crate::transform::evaluate`]).
    pub transform: ComputedTransformValue,

    /// The sampled `box-shadow`, layer by layer (Stylo pads the shorter of two lists with transparent shadows), with every
    /// colour concrete.
    pub box_shadow: ShadowList,
}

#[derive(Clone, Debug, PartialEq)]
struct AppliedStyle {
    width: Dimension,
    height: Dimension,
    opacity: f32,
    background_color: String,
    color: String,
    border_color: String,
    /// The resolved lists as CSS text (`none` for no filter); `currentcolor` is already the element's
    /// colour.
    filter: String,
    backdrop_filter: String,
    /// The resolved list as CSS text (`none` for no transform).
    transform: String,
    /// The resolved `box-shadow` as CSS text (`none` for no shadow).
    box_shadow: String,
    hidden: bool,
    transition: Option<TransitionSpec>,
}

/// The text colour nothing set: white, this library's default (`paint::parse_color` callers pass white too).
const DEFAULT_COLOR: &str = "#ffffff";

/// The element's text colour, which a `drop-shadow()` without a colour uses (this library's default is
/// white).
pub(crate) fn current_color(style: &StyleSpec) -> Rgba {
    let color = parse_color(style.color.as_deref(), godot::prelude::Color::WHITE);
    [color.r, color.g, color.b, color.a]
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
            color: style.color.clone().unwrap_or_else(|| DEFAULT_COLOR.into()),
            border_color: style
                .border_color
                .clone()
                .unwrap_or_else(|| "#00000000".into()),
            filter: style
                .filter_list()
                .resolve_current_color(current_color(style))
                .to_css(),
            backdrop_filter: style
                .backdrop_filter_list()
                .resolve_current_color(current_color(style))
                .to_css(),
            transform: style.transform_list().css().to_string(),
            box_shadow: style
                .box_shadow_list()
                .resolve_current_color(current_color(style))
                .to_css(),
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

/// The retained Stylo document, keyed by mounted tag. Only the properties that can animate (size,
/// opacity, background colour) and `display` are mirrored into it; layout, text and the tree of
/// element boxes stay with Taffy and Godot.
pub struct StyleEngine {
    document: BaseDocument,
    nodes: HashMap<u32, NodeId>,
    layer_roots: [NodeId; LAYER_COUNT],
    applied: HashMap<u32, AppliedStyle>,
    last_time: f64,
}

impl Default for StyleEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl StyleEngine {
    pub fn new() -> Self {
        // `backdrop-filter` parses only with this preference on; it is off in Servo's defaults.
        stylo_static_prefs::set_pref!("layout.css.backdrop-filter.enabled", true);
        let config = DocumentConfig {
            // Only explicitly supplied inline styles participate. No browser UA
            // dimensions or font styles are allowed to alter the native model.
            ua_stylesheets: Vec::new(),
            style_threading: StyleThreading::Sequential,
            ..DocumentConfig::default()
        };
        let mut document = BaseDocument::new(config);
        let document_root = document.root_node().id;
        let html;
        let layer_roots;
        {
            let mut mutator = document.mutate();
            html = mutator.create_element(qual_name!("html", html), Vec::new());
            mutator.append_children(document_root, &[html]);
            layer_roots = std::array::from_fn(|_| {
                let layer = mutator.create_element(qual_name!("div", html), Vec::new());
                mutator.append_children(html, &[layer]);
                layer
            });
        }
        Self {
            document,
            nodes: HashMap::new(),
            layer_roots,
            applied: HashMap::new(),
            last_time: 0.0,
        }
    }

    fn native_parent(&self, parent: Parent) -> NodeId {
        match parent {
            Parent::Layer(layer) => self.layer_roots[layer],
            Parent::Node(tag) => self.nodes[&tag],
        }
    }

    /// Create the (detached) Stylo node for a newly mounted tag.
    pub fn insert(&mut self, tag: u32) {
        let node = self
            .document
            .mutate()
            .create_element(qual_name!("div", html), Vec::new());
        let previous = self.nodes.insert(tag, node);
        assert!(previous.is_none(), "tag {tag} is mounted once");
    }

    /// Make `children` the ordered children of `parent`. Surviving nodes are reparented here
    /// before deleted branches are removed (Blitz's `replace_children` detaches but does not free).
    pub fn set_children(&mut self, parent: Parent, children: &[u32]) {
        let native_parent = self.native_parent(parent);
        let children: Vec<_> = children.iter().map(|child| self.nodes[child]).collect();
        let current = self
            .document
            .get_node(native_parent)
            .expect("mapped Stylo node");
        if current.children.as_slice() != children.as_slice() {
            self.document
                .mutate()
                .replace_children(native_parent, &children);
        }
    }

    /// Detach a deleted tag's node. Detach rather than freeing the SlotMap entry: blitz-dom's Stylo
    /// bridge converts NodeId(u64) through OpaqueNode(usize), which truncates the upper 32-bit
    /// SlotMap version to v1 on 32-bit wasm32. Keeping slots at v1 preserves OpaqueNode -> NodeId
    /// round-tripping on WebAssembly while still marking removed nodes out-of-document so
    /// resolve_stylist cancels their active transitions.
    pub fn remove(&mut self, tag: u32) {
        let native = self
            .nodes
            .remove(&tag)
            .expect("a deleted tag has a Stylo node");
        if self.document.get_node(native).is_some() {
            self.document.mutate().remove_node(native);
        }
        self.applied.remove(&tag);
    }

    /// Publish a node's authored style (and any native intrinsic pixel target). `blocked` suppresses
    /// only the indicated dimension transitions for this update: it is used to restore canonical
    /// auto after a pixel endpoint is reached (opacity and background transitions continue
    /// undisturbed) and to apply a change that motion cannot animate immediately.
    pub fn update(
        &mut self,
        tag: u32,
        style: &StyleSpec,
        overrides: Option<&DimensionOverrides>,
        blocked: &BTreeSet<TransitionProperty>,
        now: f64,
    ) -> Result<(), String> {
        self.validate_time(now)?;
        if overrides.is_some_and(|value| {
            value
                .width
                .into_iter()
                .chain(value.height)
                .any(|value| !value.is_finite() || value < 0.0)
        }) {
            return Err(format!(
                "intrinsic override for node {tag} must be finite and nonnegative"
            ));
        }
        if !self.nodes.contains_key(&tag) {
            return Err(format!("style update refers to missing node {tag}"));
        }
        let next = AppliedStyle::from_authored(style, overrides);
        self.write_style(tag, &next, blocked);
        self.applied.insert(tag, next);
        Ok(())
    }

    /// Re-enable the configured transitions of `tags` once an immediate update has become their
    /// current computed value; re-enabling alone cannot restart the suppressed transition.
    pub fn reenable_transitions(&mut self, tags: &BTreeSet<u32>) {
        for tag in tags {
            let style = &self.applied[tag];
            let properties = transition_properties(style.transition.as_ref(), &BTreeSet::new());
            self.document.mutate().set_style_property(
                self.nodes[tag],
                "transition-property",
                &properties,
            );
        }
    }

    /// Seed an auto dimension with its current native pixel value before assigning
    /// an intrinsic pixel target. This does not modify the caller's authored style.
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

    /// Run Stylo's style pass at `now`: start, advance and finish the transitions.
    pub fn resolve(&mut self, now: f64) -> Result<(), String> {
        self.validate_time(now)?;
        self.document.resolve_stylist(now);
        Ok(())
    }

    /// Whether any transition is pending or running.
    pub fn is_animating(&self) -> bool {
        self.document.is_animating()
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
        if previous.is_none_or(|previous| previous.color != next.color) {
            mutator.set_style_property(native_id, "color", &next.color);
        }
        if previous.is_none_or(|previous| previous.border_color != next.border_color) {
            mutator.set_style_property(native_id, "border-color", &next.border_color);
        }
        if previous.is_none_or(|previous| previous.filter != next.filter) {
            mutator.set_style_property(native_id, "filter", &next.filter);
        }
        if previous.is_none_or(|previous| previous.backdrop_filter != next.backdrop_filter) {
            mutator.set_style_property(native_id, "backdrop-filter", &next.backdrop_filter);
        }
        if previous.is_none_or(|previous| previous.transform != next.transform) {
            mutator.set_style_property(native_id, "transform", &next.transform);
        }
        if previous.is_none_or(|previous| previous.box_shadow != next.box_shadow) {
            mutator.set_style_property(native_id, "box-shadow", &next.box_shadow);
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
                .unwrap_or(Easing::INITIAL);
            mutator.set_style_property(native_id, "transition-duration", &format!("{duration}ms"));
            mutator.set_style_property(native_id, "transition-delay", &format!("{delay}ms"));
            mutator.set_style_property(native_id, "transition-timing-function", &easing.css());
        }
    }

    /// The current computed (sampled) size, opacity and background colour of one node.
    pub fn sampled(&self, tag: u32) -> Result<SampledStyle, String> {
        let native_id = *self
            .nodes
            .get(&tag)
            .ok_or_else(|| format!("missing Stylo node {tag}"))?;
        let node = self
            .document
            .get_node(native_id)
            .ok_or_else(|| format!("missing mounted Stylo node {tag}"))?;
        let primary = node.primary_styles();
        let undisplayed;
        let computed = if let Some(primary) = primary.as_ref() {
            &***primary
        } else {
            undisplayed = self
                .document
                .resolve_undisplayed_style(native_id)
                .ok_or_else(|| format!("Stylo did not compute mounted node {tag}"))?;
            &*undisplayed
        };
        let position = computed.get_position();
        let current_color = computed.get_inherited_text().color;
        let background = computed
            .get_background()
            .background_color
            .resolve_to_absolute(&current_color)
            .into_srgb_legacy();
        let border = computed
            .get_border()
            .border_top_color
            .resolve_to_absolute(&current_color)
            .into_srgb_legacy();
        let effects = computed.get_effects();
        Ok(SampledStyle {
            width: sampled_dimension(&position.width)?,
            height: sampled_dimension(&position.height)?,
            opacity: effects.opacity,
            background_color: *background.raw_components(),
            color: *current_color.into_srgb_legacy().raw_components(),
            border_color: *border.raw_components(),
            filter: sampled_filters(&effects.filter.0, &current_color)?,
            backdrop_filter: sampled_filters(&effects.backdrop_filter.0, &current_color)?,
            transform: computed.get_box().transform.clone(),
            box_shadow: sampled_box_shadows(&effects.box_shadow.0, &current_color),
        })
    }
}

/// Stylo's computed `box-shadow` layers as ours: lengths in CSS pixels, colours resolved against the element's text colour.
fn sampled_box_shadows(
    shadows: &[style::values::computed::BoxShadow],
    current_color: &style::color::AbsoluteColor,
) -> ShadowList {
    ShadowList(
        shadows
            .iter()
            .map(|shadow| ShadowLayer {
                x: shadow.base.horizontal.px(),
                y: shadow.base.vertical.px(),
                blur: shadow.base.blur.0.px(),
                spread: shadow.spread.px(),
                color: Some(
                    *shadow
                        .base
                        .color
                        .resolve_to_absolute(current_color)
                        .into_srgb_legacy()
                        .raw_components(),
                ),
                inset: shadow.inset,
            })
            .collect(),
    )
}

/// Stylo's computed filter functions as ours: lengths in CSS pixels, angles in degrees, shadow colours
/// resolved against the element's text colour.
fn sampled_filters(
    filters: &[style::values::computed::Filter],
    current_color: &style::color::AbsoluteColor,
) -> Result<FilterList, String> {
    use style::values::computed::Filter;
    let mut out = Vec::with_capacity(filters.len());
    for filter in filters {
        out.push(match filter {
            Filter::Blur(radius) => FilterFunction::Blur(radius.0.px()),
            Filter::Brightness(amount) => FilterFunction::Brightness(amount.0),
            Filter::Contrast(amount) => FilterFunction::Contrast(amount.0),
            Filter::Grayscale(amount) => FilterFunction::Grayscale(amount.0),
            Filter::HueRotate(angle) => FilterFunction::HueRotate(angle.degrees()),
            Filter::Invert(amount) => FilterFunction::Invert(amount.0),
            Filter::Opacity(amount) => FilterFunction::Opacity(amount.0),
            Filter::Saturate(amount) => FilterFunction::Saturate(amount.0),
            Filter::Sepia(amount) => FilterFunction::Sepia(amount.0),
            Filter::DropShadow(shadow) => FilterFunction::DropShadow(DropShadow {
                x: shadow.horizontal.px(),
                y: shadow.vertical.px(),
                blur: shadow.blur.0.px(),
                color: Some(
                    *shadow
                        .color
                        .resolve_to_absolute(current_color)
                        .into_srgb_legacy()
                        .raw_components(),
                ),
            }),
            Filter::Url(_) => return Err("a url() filter reached the style engine".into()),
        });
    }
    Ok(FilterList(out))
}

fn sampled_dimension(value: &Size) -> Result<SampledDimension, String> {
    match value {
        Size::Auto => Ok(SampledDimension::Auto),
        Size::LengthPercentage(value) => Ok(SampledDimension::LengthPercentage(value.0.clone())),
        Size::MinContent | Size::MaxContent | Size::FitContent => Ok(SampledDimension::Intrinsic),
        other => Err(format!("unsupported sampled dimension {other:?}")),
    }
}

fn dimension_css(value: &Dimension) -> String {
    match value {
        Dimension::Num(value) => format!("{value}px"),
        Dimension::Text(value) => value.clone(),
    }
}

pub(crate) fn blocked_properties(
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
    // `all` is written out as the properties it means, so what Stylo animates is exactly what native reads
    // back, and a blocked one can be left out.
    let properties: Vec<_> = TransitionProperties::animated(&transition.properties)
        .iter()
        .filter(|property| !blocked.contains(property))
        .map(|property| property.css_name())
        .collect();
    if properties.is_empty() {
        "none".into()
    } else {
        properties.join(", ")
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::filter::FilterFunction;

    const TOLERANCE: f32 = 0.01;

    /// A flat scene: every styled tag is a child of layer 0, in tag order, and every `sync` writes
    /// each tag's style, runs Stylo and reads every tag back, like a full-tree publish did.
    struct Scene {
        engine: StyleEngine,
        styles: BTreeMap<u32, StyleSpec>,
        overrides: BTreeMap<u32, DimensionOverrides>,
    }

    struct Frame {
        values: BTreeMap<u32, SampledStyle>,
        active: bool,
    }

    fn style(json: &str) -> StyleSpec {
        serde_json::from_str(json).expect("fixture style")
    }

    fn animated(height: &str) -> StyleSpec {
        style(&format!(
            r##"{{"height":{height},"backgroundColor":"#000000","opacity":1,
                "transition":{{"properties":["height","opacity","backgroundColor"],"durationMs":1000,"easing":"linear"}}}}"##
        ))
    }

    impl Scene {
        fn new(height: &str) -> Self {
            Scene {
                engine: StyleEngine::new(),
                styles: BTreeMap::from([(1, animated(height))]),
                overrides: BTreeMap::new(),
            }
        }

        fn node(&mut self, tag: u32) -> &mut StyleSpec {
            self.styles.get_mut(&tag).expect("fixture node")
        }

        fn sync(&mut self, now: f64) -> Frame {
            self.sync_immediate(&BTreeSet::new(), now)
        }

        fn sync_immediate(
            &mut self,
            immediate: &BTreeSet<(u32, DimensionAxis)>,
            now: f64,
        ) -> Frame {
            let tags: Vec<u32> = self.styles.keys().copied().collect();
            for tag in &tags {
                if !self.engine.nodes.contains_key(tag) {
                    self.engine.insert(*tag);
                }
            }
            self.engine.set_children(Parent::Layer(0), &tags);
            let gone: Vec<u32> = self
                .engine
                .nodes
                .keys()
                .copied()
                .filter(|tag| !self.styles.contains_key(tag))
                .collect();
            for tag in gone {
                self.engine.remove(tag);
            }
            for (tag, spec) in &self.styles {
                let blocked = blocked_properties(*tag, immediate);
                self.engine
                    .update(*tag, spec, self.overrides.get(tag), &blocked, now)
                    .expect("style update");
            }
            self.engine.resolve(now).expect("style pass");
            if !immediate.is_empty() {
                let tags = immediate.iter().map(|(tag, _)| *tag).collect();
                self.engine.reenable_transitions(&tags);
                self.engine.resolve(now).expect("re-enabled style pass");
            }
            self.frame()
        }

        fn sample(&mut self, now: f64) -> Frame {
            self.engine.resolve(now).expect("monotonic clock");
            self.frame()
        }

        fn frame(&self) -> Frame {
            Frame {
                values: self
                    .styles
                    .keys()
                    .map(|tag| (*tag, self.engine.sampled(*tag).expect("sampled style")))
                    .collect(),
                active: self.engine.is_animating(),
            }
        }
    }

    fn near(actual: f32, expected: f32) {
        assert!(
            (actual - expected).abs() <= TOLERANCE,
            "expected {expected}, observed {actual}"
        );
    }

    #[test]
    fn stylo_samples_numeric_color_and_opacity_transitions() {
        let mut scene = Scene::new("40");
        scene.sync(0.0);
        scene.node(1).height = Some(Dimension::Num(120.0));
        scene.node(1).opacity = Some(0.0);
        scene.node(1).background_color = Some("#ffffff".into());
        scene.sync(0.0);
        let middle = scene.sample(0.5);
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
        let end = scene.sample(1.1);
        near(
            end.values[&1].height.as_px().expect("numeric height"),
            120.0,
        );
        assert!(!end.active);
    }

    #[test]
    fn stylo_preserves_current_value_and_css_reversal_shortening() {
        let mut scene = Scene::new("40");
        scene.sync(0.0);
        scene.node(1).height = Some(Dimension::Num(120.0));
        scene.sync(0.0);
        near(
            scene.sample(0.5).values[&1].height.as_px().expect("height"),
            80.0,
        );
        scene.node(1).height = Some(Dimension::Num(40.0));
        near(
            scene.sync(0.5).values[&1].height.as_px().expect("height"),
            80.0,
        );
        near(
            scene.sample(0.75).values[&1]
                .height
                .as_px()
                .expect("height"),
            60.0,
        );
        assert!(!scene.sample(1.1).active);
    }

    #[test]
    fn native_intrinsic_override_can_restore_authored_auto_without_restarting() {
        let mut scene = Scene::new(r#""auto""#);
        scene.sync(0.0);
        scene
            .engine
            .prime_dimension(1, DimensionAxis::Height, 40.0, 0.0)
            .expect("prime measured auto");
        scene.overrides.insert(
            1,
            DimensionOverrides {
                height: Some(120.0),
                ..DimensionOverrides::default()
            },
        );
        scene.sync(0.0);
        near(
            scene.sample(0.5).values[&1].height.as_px().expect("height"),
            80.0,
        );
        scene.sample(1.1);
        scene.overrides.clear();
        let restored = scene.sync_immediate(&BTreeSet::from([(1, DimensionAxis::Height)]), 1.1);
        assert!(restored.values[&1].height.is_auto());
        assert!(!restored.active);
        assert!(
            matches!(scene.styles[&1].height, Some(Dimension::Text(ref value)) if value == "auto")
        );
    }

    #[test]
    fn intrinsic_axis_restores_auto_while_unrelated_paint_keeps_animating() {
        let mut scene = Scene::new(r#""auto""#);
        scene.styles.insert(
            2,
            style(
                r##"{"opacity":1,"backgroundColor":"#000000",
                    "transition":{"properties":["opacity","backgroundColor"],"durationMs":2000,"easing":"linear"}}"##,
            ),
        );
        scene.sync(0.0);
        scene
            .engine
            .prime_dimension(1, DimensionAxis::Height, 40.0, 0.0)
            .expect("prime measured auto");
        scene.overrides.insert(
            1,
            DimensionOverrides {
                height: Some(120.0),
                ..DimensionOverrides::default()
            },
        );
        scene.styles.insert(
            2,
            style(
                r##"{"opacity":0,"backgroundColor":"#ffffff",
                    "transition":{"properties":["opacity","backgroundColor"],"durationMs":2000,"easing":"linear"}}"##,
            ),
        );
        scene.sync(0.0);

        let height_finished = scene.sample(1.1);
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

        scene.overrides.clear();
        let restored = scene.sync_immediate(&BTreeSet::from([(1, DimensionAxis::Height)]), 1.1);
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

        scene.styles.insert(
            1,
            style(
                r##"{"height":"auto","backgroundColor":"#00ff00","opacity":1,
                    "transition":{"properties":["height","opacity","backgroundColor"],"durationMs":1000,"easing":"linear"}}"##,
            ),
        );
        let paint_update = scene.sync(1.2);
        assert!(paint_update.values[&1].height.is_auto());
        assert!(paint_update.active);
        let later = scene.sample(1.5);
        assert!(later.values[&1].height.is_auto());
        near(later.values[&2].opacity, 0.25);
        assert!(later.active);
        let finished = scene.sample(2.3);
        assert!(finished.values[&1].height.is_auto());
        assert!(!finished.active);
        assert!(
            matches!(scene.styles[&1].height, Some(Dimension::Text(ref value)) if value == "auto")
        );
    }

    #[test]
    fn mixed_pixel_percentage_samples_keep_stylo_calc_semantics() {
        let mut scene = Scene::new("40");
        scene.sync(0.0);
        scene.node(1).height = Some(Dimension::Text("50%".into()));
        scene.sync(0.0);
        let frame = scene.sample(0.5);
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
        let mut scene = Scene::new("40");
        scene
            .node(1)
            .transition
            .as_mut()
            .expect("fixture transition")
            .delay_ms = Some(500.0);
        scene.sync(0.0);
        scene.node(1).height = Some(Dimension::Num(120.0));
        scene.sync(0.0);
        let pending = scene.sample(0.25);
        assert!(pending.active);
        near(pending.values[&1].height.as_px().expect("height"), 40.0);
        near(
            scene.sample(1.0).values[&1].height.as_px().expect("height"),
            80.0,
        );
        assert!(!scene.sample(1.6).active);
    }

    #[test]
    fn dropping_an_animating_node_clears_stylo_ticks() {
        let mut scene = Scene::new("40");
        scene.sync(0.0);
        scene.node(1).height = Some(Dimension::Num(120.0));
        scene.sync(0.0);
        scene.styles.remove(&1);
        let frame = scene.sync(0.2);
        assert!(!frame.active);
        assert!(!frame.values.contains_key(&1));

        // Subsequent nodes created after removals must keep SlotMap v1 so blitz-dom's 32-bit usize
        // OpaqueNode conversion on wasm32 round-trips to the live NodeId.
        scene.styles.insert(
            2,
            style(
                r##"{"height":40,"transition":{"properties":["height"],"durationMs":1000,"easing":"linear"}}"##,
            ),
        );
        scene.sync(0.2);
        let native_id = scene.engine.nodes[&2];
        let wasm32_opaque_roundtrip =
            blitz_traits::node_id::NodeId::from_u64(u64::from(native_id.as_u64() as u32));
        assert_eq!(
            scene
                .engine
                .document
                .get_node(wasm32_opaque_roundtrip)
                .map(|node| node.id),
            Some(native_id)
        );
        scene.node(2).height = Some(Dimension::Num(120.0));
        scene.sync(0.2);
        let middle = scene.sample(0.7);
        assert!(middle.active);
        near(middle.values[&2].height.as_px().expect("height"), 80.0);
    }

    #[test]
    fn reparenting_keeps_a_running_transition() {
        // A keyed move re-lists the children of one parent; the moved node keeps animating.
        let mut scene = Scene::new("40");
        scene.styles.insert(2, animated("40"));
        scene.sync(0.0);
        scene.node(1).height = Some(Dimension::Num(120.0));
        scene.sync(0.0);
        scene.engine.set_children(Parent::Layer(0), &[2, 1]);
        scene.engine.resolve(0.5).expect("style pass");
        near(
            scene
                .engine
                .sampled(1)
                .expect("sampled")
                .height
                .as_px()
                .expect("height"),
            80.0,
        );
        assert!(scene.engine.is_animating());
    }

    /// Stylo interpolates `filter` and `backdrop-filter` per function and pads a missing function with its
    /// identity (the CSS Filter Effects rules); `FilterList::interpolate` is the reference, and the end state
    /// is exact. Transitions of filters run entirely in Stylo on the native clock.
    #[test]
    fn filter_lists_transition_per_function_and_end_exactly() {
        let mut scene = Scene::new("10");
        *scene.node(1) = style(
            r##"{"filter":"blur(0px)","backdropFilter":"blur(2px) saturate(1)",
                "transition":{"properties":["filter","backdropFilter"],"durationMs":1000,"easing":"linear"}}"##,
        );
        scene.sync(0.0);
        scene.node(1).filter = Some(FilterList::parse("blur(8px) brightness(1.5)").unwrap());
        scene.node(1).backdrop_filter = Some(FilterList::parse("blur(10px) saturate(2)").unwrap());
        let from_filter = FilterList::parse("blur(0px)").unwrap();
        let to_filter = FilterList::parse("blur(8px) brightness(1.5)").unwrap();
        let from_backdrop = FilterList::parse("blur(2px) saturate(1)").unwrap();
        let to_backdrop = FilterList::parse("blur(10px) saturate(2)").unwrap();
        let started = scene.sync(0.0);
        assert_eq!(
            started.values[&1].filter,
            from_filter.interpolate(&to_filter, 0.0).unwrap(),
            "a transition starts from where it was, the new function at its identity"
        );
        for progress in [0.25f32, 0.5, 0.75] {
            let frame = scene.sample(f64::from(progress));
            let sampled = &frame.values[&1];
            let expected = from_filter.interpolate(&to_filter, progress).unwrap();
            assert_eq!(
                sampled.filter.0.len(),
                expected.0.len(),
                "the missing brightness is padded from its identity"
            );
            for (got, want) in sampled.filter.0.iter().zip(&expected.0) {
                match (got, want) {
                    (FilterFunction::Blur(a), FilterFunction::Blur(b))
                    | (FilterFunction::Brightness(a), FilterFunction::Brightness(b)) => {
                        near(*a, *b)
                    }
                    other => panic!("unexpected pair {other:?}"),
                }
            }
            let expected = from_backdrop.interpolate(&to_backdrop, progress).unwrap();
            for (got, want) in sampled.backdrop_filter.0.iter().zip(&expected.0) {
                match (got, want) {
                    (FilterFunction::Blur(a), FilterFunction::Blur(b))
                    | (FilterFunction::Saturate(a), FilterFunction::Saturate(b)) => near(*a, *b),
                    other => panic!("unexpected pair {other:?}"),
                }
            }
        }
        let settled = scene.sample(1.0);
        assert_eq!(
            settled.values[&1].filter, to_filter,
            "the end state is exact"
        );
        assert_eq!(settled.values[&1].backdrop_filter, to_backdrop);
        assert!(!settled.active, "and nothing is left animating");
    }

    fn transform_of(css: &str) -> crate::transform::TransformList {
        crate::transform::TransformList::parse(css).expect("a valid transform")
    }

    /// The matrix of a sampled transform against a 200 x 100 box, as the renderer evaluates it.
    fn matrix_at(frame: &Frame, tag: u32) -> [f32; 6] {
        crate::transform::evaluate(
            &frame.values[&tag].transform,
            None,
            godot::prelude::Vector2::new(200.0, 100.0),
        )
        .expect("evaluates")
        .placement
        .affine
        .to_array()
    }

    /// Stylo interpolates a matched list function by function (CSS Transforms 1) and an unmatched one by decomposing the
    /// matrices; both come back as a computed list the renderer evaluates against the box. The samples are Stylo's,
    /// the checks are the numbers the specification gives.
    #[test]
    fn transforms_transition_by_function_and_by_decomposition_and_end_exactly() {
        let mut scene = Scene::new("10");
        *scene.node(1) = style(
            r##"{"transition":{"properties":["transform"],"durationMs":1000,"easing":"linear"}}"##,
        );
        scene.node(1).transform = Some(transform_of("rotate(0deg) scale(1)"));
        scene.sync(0.0);
        scene.node(1).transform = Some(transform_of("rotate(90deg) scale(2)"));
        let started = scene.sync(0.0);
        let [a, b, ..] = matrix_at(&started, 1);
        assert!(
            (a - 1.0).abs() < 1e-4 && b.abs() < 1e-4,
            "starts where it was"
        );
        // Halfway: rotate(45deg) scale(1.5), whose x axis is 1.5 * (cos 45, sin 45).
        let middle = scene.sample(0.5);
        let [a, b, c, d, ..] = matrix_at(&middle, 1);
        let expected = 1.5 * std::f32::consts::FRAC_1_SQRT_2;
        assert!(
            (a - expected).abs() < 1e-3 && (b - expected).abs() < 1e-3,
            "{a} {b}"
        );
        assert!(
            (c + expected).abs() < 1e-3 && (d - expected).abs() < 1e-3,
            "{c} {d}"
        );
        assert!(middle.active);
        let end = scene.sample(1.0);
        let [a, b, c, d, ..] = matrix_at(&end, 1);
        assert!(
            a.abs() < 1e-5 && (b - 2.0).abs() < 1e-5 && (c + 2.0).abs() < 1e-5 && d.abs() < 1e-5
        );
        assert!(!end.active, "nothing is left animating");

        // Lists that do not match: rotate to a percentage translate. The percentage is of the box, which only the
        // renderer knows, so Stylo hands back both lists and a progress; halfway is the decomposition's midpoint.
        let mut scene = Scene::new("10");
        *scene.node(1) = style(
            r##"{"transition":{"properties":["transform"],"durationMs":1000,"easing":"linear"}}"##,
        );
        scene.node(1).transform = Some(transform_of("rotate(0deg)"));
        scene.sync(0.0);
        scene.node(1).transform = Some(transform_of("translateX(50%)"));
        scene.sync(0.0);
        let middle = scene.sample(0.5);
        let [a, b, c, d, e, _] = matrix_at(&middle, 1);
        assert!(
            (a - 1.0).abs() < 1e-4 && b.abs() < 1e-4 && c.abs() < 1e-4 && (d - 1.0).abs() < 1e-4
        );
        // 50% of 200 is 100 px, halfway is 50 px; the origin is the middle and the matrix is unrotated, so e is the shift.
        assert!((e - 50.0).abs() < 1e-3, "{e}");
        let end = scene.sample(1.0);
        assert!((matrix_at(&end, 1)[4] - 100.0).abs() < 1e-4);
    }

    #[test]
    fn a_transform_from_none_interpolates_from_the_identity_of_each_function() {
        let mut scene = Scene::new("10");
        *scene.node(1) = style(
            r##"{"transition":{"properties":["transform"],"durationMs":1000,"easing":"linear"}}"##,
        );
        scene.sync(0.0);
        scene.node(1).transform = Some(transform_of("translateX(40px) scale(3)"));
        scene.sync(0.0);
        let middle = scene.sample(0.5);
        let [a, _, _, d, e, _] = matrix_at(&middle, 1);
        assert!((a - 2.0).abs() < 1e-4 && (d - 2.0).abs() < 1e-4, "{a} {d}");
        // The translate is 20 px; scale 2 about the middle (100, 50) shifts the origin of the map by minus (100, 50).
        assert!((e - (20.0 - 100.0)).abs() < 1e-3, "{e}");
    }

    #[test]
    fn transforms_transition_with_opacity_background_and_height_and_ping_pong_in_a_loop() {
        let mut scene = Scene::new("80");
        *scene.node(1) = style(
            r##"{"height":80,"opacity":0.2,"backgroundColor":"#000000","transform":"translateY(40px) scale(0.5)",
                "transition":{"properties":["height","opacity","backgroundColor","transform"],"durationMs":1000,"easing":"linear"}}"##,
        );
        // Prime initial @starting-style / resting state at t = 0, then transition to target at t = 0.
        scene.sync(0.0);
        scene.node(1).height = Some(Dimension::Num(160.0));
        scene.node(1).opacity = Some(1.0);
        scene.node(1).background_color = Some("#ffffff".into());
        scene.node(1).transform = Some(transform_of("translateY(0px) scale(1.5)"));
        scene.sync(0.0);

        let middle = scene.sample(0.5);
        assert!(middle.active);
        near(middle.values[&1].height.as_px().expect("height"), 120.0);
        near(middle.values[&1].opacity, 0.6);
        for channel in &middle.values[&1].background_color[..3] {
            assert!(
                *channel > 0.2 && *channel < 0.8,
                "color interpolated: {channel}"
            );
        }
        let [a, _, _, d, _, f] = matrix_at(&middle, 1);
        near(a, 1.0);
        near(d, 1.0);
        near(f, 20.0);

        let forward_end = scene.sample(1.0);
        assert!(!forward_end.active);
        near(
            forward_end.values[&1].height.as_px().expect("height"),
            160.0,
        );
        near(forward_end.values[&1].opacity, 1.0);
        let [a, _, _, d, _, _] = matrix_at(&forward_end, 1);
        near(a, 1.5);
        near(d, 1.5);

        // Next leg of a loop: reverse back to the first state and sample halfway.
        scene.node(1).height = Some(Dimension::Num(80.0));
        scene.node(1).opacity = Some(0.2);
        scene.node(1).background_color = Some("#000000".into());
        scene.node(1).transform = Some(transform_of("translateY(40px) scale(0.5)"));
        scene.sync(1.0);
        let back_middle = scene.sample(1.5);
        assert!(back_middle.active);
        near(
            back_middle.values[&1].height.as_px().expect("height"),
            120.0,
        );
        near(back_middle.values[&1].opacity, 0.6);
        let [a, _, _, d, _, f] = matrix_at(&back_middle, 1);
        near(a, 1.0);
        near(d, 1.0);
        near(f, 20.0);
    }

    /// Stylo interpolates `box-shadow` layer by layer, pads the shorter list with transparent shadows and ends exactly on
    /// the target: a hover that changes `shadow-sm` to `shadow-lg` is a transition of one native property.
    #[test]
    fn box_shadows_transition_layer_by_layer_and_end_exactly() {
        let mut scene = Scene::new("10");
        *scene.node(1) = style(
            r##"{"boxShadow":"0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                "transition":{"properties":["boxShadow"],"durationMs":1000,"easing":"linear"}}"##,
        );
        scene.sync(0.0);
        let target = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)";
        scene.node(1).box_shadow = Some(ShadowList::parse(target).unwrap());
        let started = scene.sync(0.0);
        assert_eq!(
            started.values[&1].box_shadow.0.len(),
            2,
            "the new layer is there from the start"
        );
        near(started.values[&1].box_shadow.0[0].y, 1.0);
        near(started.values[&1].box_shadow.0[1].color.unwrap()[3], 0.0);
        let halfway = scene.sample(0.5);
        let layers = &halfway.values[&1].box_shadow.0;
        near(layers[0].y, 5.5);
        near(layers[0].blur, 8.5);
        near(layers[0].spread, -1.5);
        near(layers[0].color.unwrap()[3], 0.075);
        near(layers[1].y, 2.0);
        near(layers[1].blur, 3.0);
        near(layers[1].spread, -2.0);
        near(layers[1].color.unwrap()[3], 0.05);
        let settled = scene.sample(1.0);
        assert_eq!(
            settled.values[&1].box_shadow,
            ShadowList::parse(target).unwrap(),
            "the end state is exact"
        );
        assert!(!settled.active, "and nothing is left animating");
    }
}
