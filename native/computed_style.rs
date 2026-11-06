//! Native style resolution: a node's computed style from its style layers, inheritance and the
//! conditions that hold for it (plan section 3.6).
//!
//! A computed style is the parent's inherited properties, then every layer whose conditions hold,
//! in order. Conditions are a minimum viewport width and pseudo-states (hover, active, focus,
//! focus-visible, focus-within, disabled). Nothing here touches Godot; the mounting layer
//! implements [`StyleTree`] over its mounted nodes and feeds [`restyle`] the nodes whose inputs
//! changed.

use std::collections::{BTreeMap, BTreeSet};
use std::ops::{Bound, Deref};

use crate::props::{
    CursorSpec, DisplaySpec, InterpolateSize, PointerEventsSpec, PseudoState, StyleLayer,
    StyleLayers, StyleSpec, TextAlignSpec,
};

/// The pseudo-states that hold for one node, as a small bit set.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct PseudoStates(u8);

impl PseudoStates {
    pub const NONE: PseudoStates = PseudoStates(0);

    fn bit(state: PseudoState) -> u8 {
        match state {
            PseudoState::Hover => 1 << 0,
            PseudoState::Active => 1 << 1,
            PseudoState::Focus => 1 << 2,
            PseudoState::FocusVisible => 1 << 3,
            PseudoState::FocusWithin => 1 << 4,
            PseudoState::Disabled => 1 << 5,
        }
    }

    pub fn with(self, state: PseudoState) -> PseudoStates {
        PseudoStates(self.0 | Self::bit(state))
    }

    pub fn contains(self, state: PseudoState) -> bool {
        self.0 & Self::bit(state) != 0
    }

    pub fn from_slice(states: &[PseudoState]) -> PseudoStates {
        states
            .iter()
            .fold(PseudoStates::NONE, |set, state| set.with(*state))
    }

    #[cfg(test)]
    pub fn is_empty(self) -> bool {
        self.0 == 0
    }

    pub fn intersects(self, other: PseudoStates) -> bool {
        self.0 & other.0 != 0
    }
}

/// What the layers' conditions are tested against for one node.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct StyleConditions {
    /// Logical viewport width in pixels.
    pub viewport_width: f32,
    pub states: PseudoStates,
}

/// A fully resolved style: inherited values, then the layers that apply. Properties nothing set
/// stay `None`; readers apply the defaults (white 16 px text, transparent paint, flex column).
#[derive(Clone, Debug, Default, PartialEq)]
pub struct ComputedStyle(pub StyleSpec);

impl Deref for ComputedStyle {
    type Target = StyleSpec;

    fn deref(&self) -> &StyleSpec {
        &self.0
    }
}

/// The properties a node passes on to its children: `color`, `fontSize`, `textAlign`,
/// `interpolateSize`, `pointerEvents` and `cursor` (plan 3.6). Later phases add the text,
/// selection and scrollbar properties.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct InheritedStyle {
    pub color: Option<String>,
    pub font_size: Option<i32>,
    pub text_align: Option<TextAlignSpec>,
    pub interpolate_size: Option<InterpolateSize>,
    pub pointer_events: Option<PointerEventsSpec>,
    pub cursor: Option<CursorSpec>,
}

impl ComputedStyle {
    pub fn inherited(&self) -> InheritedStyle {
        InheritedStyle {
            color: self.0.color.clone(),
            font_size: self.0.font_size,
            text_align: self.0.text_align,
            interpolate_size: self.0.interpolate_size,
            pointer_events: self.0.pointer_events,
            cursor: self.0.cursor,
        }
    }

    /// Whether this element can itself be the target of a pointer. `pointer-events: none` only
    /// removes the element: its children are tested on their own computed value.
    pub fn is_pointer_target(&self) -> bool {
        self.0.pointer_events != Some(PointerEventsSpec::None)
    }

    /// The cursor shown over this element; `default` when nothing set one.
    pub fn cursor_or_default(&self) -> CursorSpec {
        self.0.cursor.unwrap_or(CursorSpec::Default)
    }
}

fn applies(layer: &StyleLayer, conditions: &StyleConditions) -> bool {
    layer
        .min_width
        .is_none_or(|width| conditions.viewport_width >= width)
        && layer
            .states
            .iter()
            .all(|state| conditions.states.contains(*state))
}

/// The computed style of a node with `layers`, `hidden` (Suspense) and the given parent values.
pub fn resolve(
    layers: Option<&StyleLayers>,
    hidden: bool,
    inherited: &InheritedStyle,
    conditions: &StyleConditions,
) -> ComputedStyle {
    let mut spec = StyleSpec {
        color: inherited.color.clone(),
        font_size: inherited.font_size,
        text_align: inherited.text_align,
        interpolate_size: inherited.interpolate_size,
        pointer_events: inherited.pointer_events,
        cursor: inherited.cursor,
        ..StyleSpec::default()
    };
    if let Some(layers) = layers {
        for layer in &layers.layers {
            if applies(layer, conditions) {
                spec.merge(&layer.style);
            }
        }
    }
    if hidden {
        spec.display = Some(DisplaySpec::None);
    }
    ComputedStyle(spec)
}

/// Every pseudo-state some layer of `layers` conditions on. A node whose state changed only needs
/// restyling if it uses that state.
pub fn states_used(layers: Option<&StyleLayers>) -> PseudoStates {
    layers.map_or(PseudoStates::NONE, |layers| {
        layers
            .layers
            .iter()
            .flat_map(|layer| layer.states.iter())
            .fold(PseudoStates::NONE, |set, state| set.with(*state))
    })
}

/// The hover, active and focus facts native tracks, from which each node's states follow.
/// Each chain lists a target and then its ancestors.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct InteractionState {
    /// The hovered element and its ancestors (mouse only; touch never hovers).
    pub hover: Vec<u32>,
    /// The pressed element and its ancestors.
    pub active: Vec<u32>,
    pub focused: Option<u32>,
    /// The focused element and its ancestors.
    pub focus_within: Vec<u32>,
    pub focus_visible: bool,
}

impl InteractionState {
    /// The states that hold for `tag`. `focus` and `focusVisible` apply to the focused element
    /// only; `focusWithin` also to its ancestors; `hover` and `active` to the target and all its
    /// ancestors (CSS semantics).
    pub fn states_of(&self, tag: u32, disabled: bool) -> PseudoStates {
        let mut states = PseudoStates::NONE;
        if self.hover.contains(&tag) {
            states = states.with(PseudoState::Hover);
        }
        if self.active.contains(&tag) {
            states = states.with(PseudoState::Active);
        }
        if self.focused == Some(tag) {
            states = states.with(PseudoState::Focus);
            if self.focus_visible {
                states = states.with(PseudoState::FocusVisible);
            }
        }
        if self.focus_within.contains(&tag) {
            states = states.with(PseudoState::FocusWithin);
        }
        if disabled {
            states = states.with(PseudoState::Disabled);
        }
        states
    }
}

/// The nodes that use a `minWidth` threshold, so a resize restyles only those.
#[derive(Debug, Default)]
pub struct BreakpointIndex {
    /// Keyed by the bit pattern of the (finite, nonnegative) threshold, which orders like the
    /// float itself.
    thresholds: BTreeMap<u32, BTreeSet<u32>>,
}

impl BreakpointIndex {
    pub fn register(&mut self, tag: u32, layers: Option<&StyleLayers>) {
        for width in Self::widths(layers) {
            self.thresholds.entry(width).or_default().insert(tag);
        }
    }

    /// Remove `tag` from every threshold `layers` used.
    pub fn unregister(&mut self, tag: u32, layers: Option<&StyleLayers>) {
        for width in Self::widths(layers) {
            if let Some(nodes) = self.thresholds.get_mut(&width) {
                nodes.remove(&tag);
                if nodes.is_empty() {
                    self.thresholds.remove(&width);
                }
            }
        }
    }

    /// The nodes with a layer whose condition `width >= minWidth` differs between the two widths.
    pub fn crossed(&self, old_width: f32, new_width: f32) -> BTreeSet<u32> {
        let low = old_width.min(new_width);
        let high = old_width.max(new_width);
        if !(low.is_finite() && high.is_finite()) || low >= high {
            return BTreeSet::new();
        }
        // `width >= t` is true for both widths when t <= low and false for both when t > high, so
        // exactly the thresholds with low < t <= high are crossed.
        let lower = threshold_key(low.max(0.0));
        let upper = threshold_key(high.max(0.0));
        if lower >= upper {
            return BTreeSet::new();
        }
        self.thresholds
            .range((Bound::Excluded(lower), Bound::Included(upper)))
            .flat_map(|(_, nodes)| nodes.iter().copied())
            .collect()
    }

    fn widths(layers: Option<&StyleLayers>) -> BTreeSet<u32> {
        layers.map_or_else(BTreeSet::new, |layers| {
            layers
                .layers
                .iter()
                .filter_map(|layer| layer.min_width)
                .map(threshold_key)
                .collect()
        })
    }

    #[cfg(test)]
    pub fn is_empty(&self) -> bool {
        self.thresholds.is_empty()
    }
}

fn threshold_key(width: f32) -> u32 {
    width.to_bits()
}

/// What [`restyle`] needs to know about the mounted tree and what it writes back.
pub trait StyleTree {
    /// The parent element, or `None` for a layer's top-level node.
    fn style_parent(&self, tag: u32) -> Option<u32>;
    fn style_children(&self, tag: u32) -> &[u32];
    fn style_inputs(&self, tag: u32) -> StyleInputs<'_>;
    fn computed(&self, tag: u32) -> Option<&ComputedStyle>;
    /// Store a node's new computed style and return the previous one.
    fn store_computed(&mut self, tag: u32, computed: ComputedStyle) -> Option<ComputedStyle>;
}

/// The per-node inputs to [`resolve`] other than inheritance and the viewport.
#[derive(Clone, Copy, Debug)]
pub struct StyleInputs<'a> {
    pub layers: Option<&'a StyleLayers>,
    pub hidden: bool,
    pub states: PseudoStates,
}

/// A node whose computed style changed (or was computed for the first time).
#[derive(Clone, Debug, PartialEq)]
pub struct StyleChange {
    pub tag: u32,
    pub previous: Option<ComputedStyle>,
}

/// Recompute the computed styles of `dirty` nodes, top-down, and of the descendants whose
/// inherited inputs changed as a result. A node whose computed style did not change stops the
/// recursion: its children are not visited unless they were dirty themselves. Returns the nodes
/// whose computed style changed, in the order they were resolved.
pub fn restyle<T: StyleTree>(
    tree: &mut T,
    dirty: impl IntoIterator<Item = u32>,
    viewport_width: f32,
) -> Vec<StyleChange> {
    // Ordered by depth so a parent is always resolved before any of its descendants.
    let mut pending: BTreeSet<(usize, u32)> = dirty
        .into_iter()
        .map(|tag| (depth(tree, tag), tag))
        .collect();
    let mut changes = Vec::new();
    while let Some((depth, tag)) = pending.pop_first() {
        let inherited = tree
            .style_parent(tag)
            .and_then(|parent| tree.computed(parent))
            .map(ComputedStyle::inherited)
            .unwrap_or_default();
        let inputs = tree.style_inputs(tag);
        let conditions = StyleConditions {
            viewport_width,
            states: inputs.states,
        };
        let next = resolve(inputs.layers, inputs.hidden, &inherited, &conditions);
        if tree.computed(tag) == Some(&next) {
            continue;
        }
        let inherited_changed = tree
            .computed(tag)
            .is_none_or(|previous| previous.inherited() != next.inherited());
        let previous = tree.store_computed(tag, next);
        changes.push(StyleChange { tag, previous });
        if inherited_changed {
            pending.extend(
                tree.style_children(tag)
                    .iter()
                    .map(|child| (depth + 1, *child)),
            );
        }
    }
    changes
}

/// The distance from `tag` to its layer's top-level node (which has depth 0).
pub fn depth<T: StyleTree>(tree: &T, tag: u32) -> usize {
    let mut depth = 0;
    let mut current = tag;
    while let Some(parent) = tree.style_parent(current) {
        depth += 1;
        current = parent;
    }
    depth
}

/// `tag` followed by its ancestors, up to its layer's top-level node.
pub fn chain<T: StyleTree>(tree: &T, tag: u32) -> Vec<u32> {
    let mut chain = vec![tag];
    let mut current = tag;
    while let Some(parent) = tree.style_parent(current) {
        chain.push(parent);
        current = parent;
    }
    chain
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use super::*;

    const WIDE: f32 = 1120.0;
    const NARROW: f32 = 600.0;
    const MD: f32 = 768.0;

    fn layers(json: &str) -> StyleLayers {
        let layers: StyleLayers = serde_json::from_str(json).expect("test layers must parse");
        layers.validate().expect("test layers must be valid");
        layers
    }

    fn conditions(width: f32, states: &[PseudoState]) -> StyleConditions {
        StyleConditions {
            viewport_width: width,
            states: PseudoStates::from_slice(states),
        }
    }

    fn computed(layers: &StyleLayers, width: f32, states: &[PseudoState]) -> ComputedStyle {
        resolve(
            Some(layers),
            false,
            &InheritedStyle::default(),
            &conditions(width, states),
        )
    }

    #[test]
    fn layers_apply_in_order_and_later_layers_override() {
        let layers = layers(
            r##"{"layers":[
                {"style":{"backgroundColor":"#111","paddingLeft":4}},
                {"style":{"backgroundColor":"#222"}},
                {"style":{"paddingLeft":8,"color":"#333"}}
            ]}"##,
        );
        let style = computed(&layers, NARROW, &[]);
        assert_eq!(style.background_color.as_deref(), Some("#222"));
        assert_eq!(style.padding_left, Some(8.0));
        assert_eq!(style.color.as_deref(), Some("#333"));
        assert_eq!(style.width, None, "properties nothing sets stay unset");
    }

    #[test]
    fn breakpoint_layers_apply_from_their_minimum_width() {
        let layers = layers(
            r##"{"layers":[
                {"style":{"gridTemplateColumns":2}},
                {"minWidth":768,"style":{"gridTemplateColumns":3}},
                {"minWidth":1024,"style":{"gridTemplateColumns":4}}
            ]}"##,
        );
        assert_eq!(
            computed(&layers, NARROW, &[]).grid_template_columns,
            Some(2)
        );
        assert_eq!(computed(&layers, MD, &[]).grid_template_columns, Some(3));
        assert_eq!(computed(&layers, WIDE, &[]).grid_template_columns, Some(4));
        assert_eq!(
            computed(&layers, NARROW, &[]).grid_template_columns,
            Some(2)
        );
        assert_eq!(
            computed(&layers, MD - 0.5, &[]).grid_template_columns,
            Some(2),
            "the threshold is inclusive"
        );
    }

    #[test]
    fn state_layers_need_every_listed_state_and_breakpoints_combine_with_states() {
        let layers = layers(
            r##"{"layers":[
                {"style":{"backgroundColor":"#fff"}},
                {"states":["hover"],"style":{"backgroundColor":"#eef"}},
                {"minWidth":768,"states":["hover"],"style":{"backgroundColor":"#ddf"}},
                {"states":["hover","active"],"style":{"backgroundColor":"#44f"}},
                {"states":["disabled"],"style":{"opacity":0.5}}
            ]}"##,
        );
        let background = |width, states: &[PseudoState]| {
            computed(&layers, width, states).background_color.clone()
        };
        assert_eq!(background(NARROW, &[]).as_deref(), Some("#fff"));
        assert_eq!(
            background(NARROW, &[PseudoState::Hover]).as_deref(),
            Some("#eef")
        );
        assert_eq!(
            background(WIDE, &[PseudoState::Hover]).as_deref(),
            Some("#ddf")
        );
        assert_eq!(
            background(WIDE, &[PseudoState::Hover, PseudoState::Active]).as_deref(),
            Some("#44f")
        );
        assert_eq!(
            background(WIDE, &[PseudoState::Active]).as_deref(),
            Some("#fff")
        );
        assert_eq!(
            computed(&layers, WIDE, &[PseudoState::Disabled]).opacity,
            Some(0.5)
        );
        assert_eq!(computed(&layers, WIDE, &[]).opacity, None);
    }

    #[test]
    fn hidden_nodes_take_no_space() {
        let layers = layers(r#"{"layers":[{"style":{"display":"grid"}}]}"#);
        let hidden = resolve(
            Some(&layers),
            true,
            &InheritedStyle::default(),
            &conditions(WIDE, &[]),
        );
        assert_eq!(hidden.display, Some(DisplaySpec::None));
        assert_eq!(
            computed(&layers, WIDE, &[]).display,
            Some(DisplaySpec::Grid)
        );
    }

    #[test]
    fn inherited_properties_flow_down_and_can_be_overridden() {
        let inherited = InheritedStyle {
            color: Some("#fff".into()),
            font_size: Some(18),
            text_align: Some(TextAlignSpec::Center),
            interpolate_size: Some(InterpolateSize::AllowKeywords),
            pointer_events: Some(PointerEventsSpec::None),
            cursor: Some(CursorSpec::Pointer),
        };
        let none = StyleLayers::default();
        let child = resolve(Some(&none), false, &inherited, &conditions(WIDE, &[]));
        assert_eq!(child.color.as_deref(), Some("#fff"));
        assert_eq!(child.font_size, Some(18));
        assert_eq!(child.text_align, Some(TextAlignSpec::Center));
        assert_eq!(child.interpolate_size, Some(InterpolateSize::AllowKeywords));
        assert_eq!(child.pointer_events, Some(PointerEventsSpec::None));
        assert_eq!(child.cursor, Some(CursorSpec::Pointer));
        let own = layers(r##"{"layers":[{"style":{"color":"#000","fontSize":12}}]}"##);
        let overridden = resolve(Some(&own), false, &inherited, &conditions(WIDE, &[]));
        assert_eq!(overridden.color.as_deref(), Some("#000"));
        assert_eq!(overridden.font_size, Some(12));
        assert_eq!(overridden.text_align, Some(TextAlignSpec::Center));
        // A child may take pointer events back inside an element that has none.
        let auto = layers(r#"{"layers":[{"style":{"pointerEvents":"auto","cursor":"text"}}]}"#);
        let reclaimed = resolve(Some(&auto), false, &inherited, &conditions(WIDE, &[]));
        assert!(reclaimed.is_pointer_target());
        assert_eq!(reclaimed.cursor_or_default(), CursorSpec::Text);
        assert!(
            !child.is_pointer_target(),
            "the inherited value applies unless overridden"
        );
        assert_eq!(
            resolve(
                None,
                false,
                &InheritedStyle::default(),
                &conditions(WIDE, &[])
            )
            .cursor_or_default(),
            CursorSpec::Default
        );
        // Layout and paint properties are not inherited.
        let parent =
            layers(r##"{"layers":[{"style":{"backgroundColor":"#123","paddingTop":9}}]}"##);
        let parent = computed(&parent, WIDE, &[]);
        let below = resolve(None, false, &parent.inherited(), &conditions(WIDE, &[]));
        assert_eq!(below.background_color, None);
        assert_eq!(below.padding_top, None);
    }

    #[test]
    fn focus_applies_to_the_focused_element_and_focus_within_to_its_ancestors() {
        // grandparent 1 > parent 2 > focused 3, and an unrelated sibling 4 under 1.
        let state = InteractionState {
            focused: Some(3),
            focus_within: vec![3, 2, 1],
            focus_visible: true,
            ..InteractionState::default()
        };
        let focus_only = |tag| {
            let states = state.states_of(tag, false);
            (
                states.contains(PseudoState::Focus),
                states.contains(PseudoState::FocusVisible),
                states.contains(PseudoState::FocusWithin),
            )
        };
        assert_eq!(focus_only(3), (true, true, true));
        assert_eq!(focus_only(2), (false, false, true));
        assert_eq!(focus_only(1), (false, false, true));
        assert_eq!(focus_only(4), (false, false, false));
        let pointer_focus = InteractionState {
            focus_visible: false,
            ..state.clone()
        };
        let states = pointer_focus.states_of(3, false);
        assert!(states.contains(PseudoState::Focus));
        assert!(
            !states.contains(PseudoState::FocusVisible),
            "mouse focus is not focus-visible"
        );
    }

    #[test]
    fn hover_and_active_apply_to_the_target_and_its_ancestors() {
        let state = InteractionState {
            hover: vec![3, 2, 1],
            active: vec![2, 1],
            ..InteractionState::default()
        };
        let has = |tag, which| state.states_of(tag, false).contains(which);
        assert!(
            has(3, PseudoState::Hover) && has(2, PseudoState::Hover) && has(1, PseudoState::Hover)
        );
        assert!(!has(4, PseudoState::Hover));
        assert!(
            !has(3, PseudoState::Active)
                && has(2, PseudoState::Active)
                && has(1, PseudoState::Active)
        );
        assert!(state.states_of(5, true).contains(PseudoState::Disabled));
        assert!(!state.states_of(5, false).contains(PseudoState::Disabled));
    }

    #[test]
    fn states_used_reports_only_the_conditions_a_node_has() {
        let layers = layers(
            r##"{"layers":[
                {"style":{}},
                {"states":["hover","focusWithin"],"style":{}},
                {"minWidth":10,"states":["disabled"],"style":{}}
            ]}"##,
        );
        let used = states_used(Some(&layers));
        assert!(used.contains(PseudoState::Hover));
        assert!(used.contains(PseudoState::FocusWithin));
        assert!(used.contains(PseudoState::Disabled));
        assert!(!used.contains(PseudoState::Active));
        assert!(states_used(None).is_empty());
        let changed = PseudoStates::NONE.with(PseudoState::Active);
        assert!(!used.intersects(changed));
        assert!(used.intersects(changed.with(PseudoState::Hover)));
    }

    #[test]
    fn the_breakpoint_index_finds_exactly_the_nodes_a_resize_crosses() {
        let mut index = BreakpointIndex::default();
        let both =
            layers(r#"{"layers":[{"minWidth":768,"style":{}},{"minWidth":1024,"style":{}}]}"#);
        let small = layers(r#"{"layers":[{"minWidth":640,"style":{}}]}"#);
        let plain = layers(r#"{"layers":[{"style":{}}]}"#);
        index.register(1, Some(&both));
        index.register(2, Some(&small));
        index.register(3, Some(&plain));
        let set = |tags: &[u32]| tags.iter().copied().collect::<BTreeSet<u32>>();
        assert_eq!(
            index.crossed(NARROW, 630.0),
            set(&[]),
            "600 -> 630 crosses nothing used"
        );
        assert_eq!(index.crossed(500.0, 700.0), set(&[2]), "crossing 640");
        assert_eq!(
            index.crossed(WIDE, NARROW),
            set(&[1, 2]),
            "1120 -> 600 crosses 640, 768 and 1024"
        );
        assert_eq!(index.crossed(NARROW, WIDE), set(&[1, 2]));
        assert_eq!(
            index.crossed(700.0, 800.0),
            set(&[1]),
            "700 -> 800 crosses only 768"
        );
        assert_eq!(index.crossed(100.0, 2000.0), set(&[1, 2]));
        assert_eq!(index.crossed(MD, MD), set(&[]));
        assert_eq!(
            index.crossed(767.5, MD),
            set(&[1]),
            "the threshold is inclusive"
        );
        assert_eq!(index.crossed(MD, 767.5), set(&[1]));
        index.unregister(1, Some(&both));
        assert_eq!(index.crossed(100.0, 2000.0), set(&[2]));
        index.unregister(2, Some(&small));
        assert!(index.is_empty());
        assert_eq!(index.crossed(100.0, 2000.0), set(&[]));
    }

    /// A tag-keyed tree of nodes with layers, for `restyle`.
    struct TestTree {
        nodes: BTreeMap<u32, TestNode>,
        /// Every tag whose inputs `restyle` read, in order.
        resolved: RefCell<Vec<u32>>,
    }

    struct TestNode {
        parent: Option<u32>,
        children: Vec<u32>,
        layers: StyleLayers,
        hidden: bool,
        states: PseudoStates,
        computed: Option<ComputedStyle>,
    }

    impl StyleTree for TestTree {
        fn style_parent(&self, tag: u32) -> Option<u32> {
            self.nodes[&tag].parent
        }
        fn style_children(&self, tag: u32) -> &[u32] {
            &self.nodes[&tag].children
        }
        fn style_inputs(&self, tag: u32) -> StyleInputs<'_> {
            self.resolved.borrow_mut().push(tag);
            let node = &self.nodes[&tag];
            StyleInputs {
                layers: Some(&node.layers),
                hidden: node.hidden,
                states: node.states,
            }
        }
        fn computed(&self, tag: u32) -> Option<&ComputedStyle> {
            self.nodes[&tag].computed.as_ref()
        }
        fn store_computed(&mut self, tag: u32, computed: ComputedStyle) -> Option<ComputedStyle> {
            self.nodes
                .get_mut(&tag)
                .expect("known node")
                .computed
                .replace(computed)
        }
    }

    impl TestTree {
        /// `1 > 2 > 3` and `1 > 4`, with the given layers per tag.
        fn new(styles: &[(u32, &str)]) -> Self {
            let mut nodes = BTreeMap::new();
            for (tag, parent) in [(1, None), (2, Some(1)), (3, Some(2)), (4, Some(1))] {
                let json = styles
                    .iter()
                    .find(|(candidate, _)| *candidate == tag)
                    .map_or(r#"{"layers":[]}"#, |(_, json)| *json);
                nodes.insert(
                    tag,
                    TestNode {
                        parent,
                        children: Vec::new(),
                        layers: layers(json),
                        hidden: false,
                        states: PseudoStates::NONE,
                        computed: None,
                    },
                );
            }
            for (child, parent) in [(2, 1), (3, 2), (4, 1)] {
                nodes.get_mut(&parent).expect("parent").children.push(child);
            }
            TestTree {
                nodes,
                resolved: RefCell::new(Vec::new()),
            }
        }

        fn take_resolved(&self) -> Vec<u32> {
            std::mem::take(&mut *self.resolved.borrow_mut())
        }
    }

    fn tags(changes: &[StyleChange]) -> Vec<u32> {
        changes.iter().map(|change| change.tag).collect()
    }

    #[test]
    fn first_resolution_styles_every_dirty_node_parent_first() {
        let mut tree = TestTree::new(&[
            (
                1,
                r##"{"layers":[{"style":{"color":"#abc","fontSize":20}}]}"##,
            ),
            (3, r##"{"layers":[{"style":{"fontSize":10}}]}"##),
        ]);
        // Passed deepest first; the result is still top-down.
        let changes = restyle(&mut tree, [3, 4, 2, 1], WIDE);
        assert_eq!(tags(&changes), vec![1, 2, 4, 3]);
        assert!(changes.iter().all(|change| change.previous.is_none()));
        let color = |tag: u32| tree.nodes[&tag].computed.as_ref().unwrap().color.clone();
        assert_eq!(color(1).as_deref(), Some("#abc"));
        assert_eq!(
            color(3).as_deref(),
            Some("#abc"),
            "color reaches the grandchild"
        );
        assert_eq!(
            tree.nodes[&3].computed.as_ref().unwrap().font_size,
            Some(10)
        );
        assert_eq!(
            tree.nodes[&4].computed.as_ref().unwrap().font_size,
            Some(20)
        );
    }

    #[test]
    fn restyle_stops_where_the_inherited_inputs_are_unchanged() {
        let mut tree = TestTree::new(&[
            (1, r##"{"layers":[{"style":{"color":"#abc"}}]}"##),
            (
                2,
                r##"{"layers":[{"style":{"backgroundColor":"#111"},"states":[]},{"states":["hover"],"style":{"backgroundColor":"#222"}}]}"##,
            ),
        ]);
        restyle(&mut tree, [1, 2, 3, 4], WIDE);
        tree.take_resolved();

        // Node 2 changes a paint property only: its children's inputs are unchanged.
        tree.nodes.get_mut(&2).unwrap().states = PseudoStates::NONE.with(PseudoState::Hover);
        let changes = restyle(&mut tree, [2], WIDE);
        assert_eq!(tags(&changes), vec![2]);
        assert_eq!(
            changes[0]
                .previous
                .as_ref()
                .unwrap()
                .background_color
                .as_deref(),
            Some("#111")
        );
        assert_eq!(tree.take_resolved(), vec![2], "no descendant was visited");

        // Nothing changed: nothing is reported.
        assert!(restyle(&mut tree, [2], WIDE).is_empty());
        assert_eq!(tree.take_resolved(), vec![2]);
    }

    #[test]
    fn an_inherited_change_reaches_descendants_until_one_overrides_it() {
        let mut tree = TestTree::new(&[
            (
                1,
                r##"{"layers":[{"style":{"color":"#aaa"}},{"states":["hover"],"style":{"color":"#bbb"}}]}"##,
            ),
            (2, r##"{"layers":[{"style":{"color":"#ccc"}}]}"##),
        ]);
        restyle(&mut tree, [1, 2, 3, 4], WIDE);
        tree.take_resolved();
        tree.nodes.get_mut(&1).unwrap().states = PseudoStates::NONE.with(PseudoState::Hover);
        let changes = restyle(&mut tree, [1], WIDE);
        // 4 inherits the new color. 2 overrides it, so its computed style is unchanged and the
        // recursion stops: 3, which only inherits from 2, is never visited.
        assert_eq!(tags(&changes), vec![1, 4]);
        assert_eq!(
            tree.nodes[&4].computed.as_ref().unwrap().color.as_deref(),
            Some("#bbb")
        );
        let mut visited = tree.take_resolved();
        visited.sort_unstable();
        assert_eq!(visited, vec![1, 2, 4]);
    }

    #[test]
    fn a_viewport_change_restyles_only_the_nodes_that_use_a_breakpoint() {
        let md = r##"{"layers":[{"style":{"gridTemplateColumns":2}},{"minWidth":768,"style":{"gridTemplateColumns":3}}]}"##;
        let mut tree = TestTree::new(&[(2, md), (4, r#"{"layers":[{"style":{"width":10}}]}"#)]);
        let mut index = BreakpointIndex::default();
        for tag in [2, 4] {
            index.register(tag, Some(&tree.nodes[&tag].layers));
        }
        restyle(&mut tree, [1, 2, 3, 4], WIDE);
        tree.take_resolved();
        let affected = index.crossed(WIDE, NARROW);
        assert_eq!(affected.into_iter().collect::<Vec<_>>(), vec![2]);
        let changes = restyle(&mut tree, [2], NARROW);
        assert_eq!(tags(&changes), vec![2]);
        assert_eq!(
            tree.nodes[&2]
                .computed
                .as_ref()
                .unwrap()
                .grid_template_columns,
            Some(2)
        );
        assert_eq!(tree.take_resolved(), vec![2]);
    }

    #[test]
    fn hiding_a_node_restyles_it_as_display_none() {
        let mut tree = TestTree::new(&[]);
        restyle(&mut tree, [1, 2, 3, 4], WIDE);
        tree.nodes.get_mut(&2).unwrap().hidden = true;
        let changes = restyle(&mut tree, [2], WIDE);
        assert_eq!(tags(&changes), vec![2]);
        assert_eq!(
            tree.nodes[&2].computed.as_ref().unwrap().display,
            Some(DisplaySpec::None)
        );
    }

    #[test]
    fn depth_and_chain_follow_the_parent_links() {
        let tree = TestTree::new(&[]);
        assert_eq!(depth(&tree, 1), 0);
        assert_eq!(depth(&tree, 3), 2);
        assert_eq!(chain(&tree, 3), vec![3, 2, 1]);
        assert_eq!(chain(&tree, 4), vec![4, 1]);
    }
}
