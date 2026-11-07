//! The mounting layer: the mounted tree keyed by tag, the application of a commit's
//! [`MountingTransaction`], incremental geometry and hit testing (plan section 3.7).
//!
//! `Mounted` is the one owner of per-tag state: props, computed style, layout handle, paint
//! resources, canvas items and geometry. It replaces v1's `Model`, `handles`, `visuals`, `rects`,
//! `clips`, `content_clips`, `paint_order`, `opacities` and `items`. A commit costs what it
//! changed: nothing here walks the whole tree except the named exceptions (Tab order, snapshots).

use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::time::Instant;

use godot::classes::StyleBoxFlat;
use godot::prelude::*;
use taffy::prelude::NodeId;

use crate::commit::{self, CommitPayload, LAYER_COUNT, MountedTree, ValidatedCommit};
use crate::computed_style::{
    BreakpointIndex, ComputedStyle, InteractionState, PseudoStates, StyleChange, StyleInputs,
    StyleTree, chain, restyle, states_used,
};
use crate::diff::{Insertion, MountingTransaction, Parent, Removal};
use crate::focus::FocusTree;
use crate::geometry::{BoxRect, intersects};
use crate::pointer::ButtonTree;
use crate::profile::{Sample, micros};
use crate::props::{
    CursorSpec, Kind, OverflowSpec, PositionSpec, PropsSpec, ScrollbarWidthSpec, Viewport,
};
use crate::render_tree::RenderNode;
use crate::scroll::{self, ScrollRange, ScrollRanges, ScrollState, Scrollbars};
use crate::scroll_input::to_vector;
use crate::stacking::{self, Frame, PaintTree, ScrollFrame, ScrollMode, Stacking, StackingTree};
use crate::text_input::EditConfig;
use crate::text_input_godot::TextInputState;
use crate::text_paragraph::StyledParagraph;
use crate::text_style::TextStyle;
use crate::text_style::flow::shown_text;
use crate::transform::{Affine2, NodeTransform};
use crate::{CORNER_DETAIL, ReactUiRoot};

/// The four sides of a box edge, as Taffy resolves them.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct Edges {
    pub(crate) left: f32,
    pub(crate) top: f32,
    pub(crate) right: f32,
    pub(crate) bottom: f32,
}

/// Where Taffy put a node, in the frame of its paint parent (its tree parent unless it is out of flow,
/// `stacking.rs`), and the edges that position its content.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct NodeGeometry {
    pub(crate) location: Vector2,
    pub(crate) size: Vector2,
    pub(crate) border: Edges,
    pub(crate) padding: Edges,
    /// How far each scrolling axis can move (`ScrollRange::NONE` for an axis that does not scroll):
    /// Taffy's `scroll_width()` / `scroll_height()` and whether the axis is reversed (plan 3.16).
    pub(crate) scroll_ranges: ScrollRanges,
    /// False until the first geometry pass has seen this node.
    pub(crate) laid_out: bool,
}

impl NodeGeometry {
    /// The padding box in the node's own coordinates: where an `overflow: hidden` node clips.
    pub(crate) fn padding_box(&self) -> BoxRect {
        BoxRect {
            x: self.border.left,
            y: self.border.top,
            width: (self.size.x - self.border.left - self.border.right).max(0.0),
            height: (self.size.y - self.border.top - self.border.bottom).max(0.0),
        }
    }

    /// The width text wraps to: the border box less border and padding.
    pub(crate) fn content_width(&self) -> f32 {
        (self.size.x
            - self.border.left
            - self.padding.left
            - self.border.right
            - self.padding.right)
            .max(0.0)
    }

    /// Where content starts inside the border box.
    pub(crate) fn content_origin(&self) -> Vector2 {
        Vector2::new(
            self.border.left + self.padding.left,
            self.border.top + self.padding.top,
        )
    }
}

/// Godot paint resources of one element.
pub(crate) struct Visual {
    pub(crate) background: Gd<StyleBoxFlat>,
    pub(crate) paragraph: Option<StyledParagraph>,
    /// Changes whenever `paragraph` is rebuilt or redecorated, so the content item knows to re-record.
    pub(crate) generation: u64,
    /// The text as shown when it is not the `text` prop: transformed, and with its white space collapsed. The shown text is what
    /// is shaped, selected and copied.
    pub(crate) shown: Option<String>,
}

impl Visual {
    pub(crate) fn new() -> Self {
        let mut background = StyleBoxFlat::new_gd();
        background.set_corner_detail(CORNER_DETAIL);
        Self {
            background,
            paragraph: None,
            generation: 0,
            shown: None,
        }
    }

    /// The text this node shows, given the `text` prop.
    pub(crate) fn shown_text<'a>(&'a self, text: Option<&'a str>) -> Option<&'a str> {
        self.shown.as_deref().or(text)
    }
}

pub(crate) struct MountedNode {
    pub(crate) kind: Kind,
    pub(crate) layer: usize,
    pub(crate) props: PropsSpec,
    /// The tree parent: events, inheritance, layout and document order follow it.
    pub(crate) parent: Option<Parent>,
    pub(crate) children: Vec<u32>,
    /// Who paints and hit-tests this node, and whose frame `geometry.location` is in. It differs from
    /// `parent` for an absolute element whose containing block is further up, and for a fixed one.
    pub(crate) paint_parent: Option<Parent>,
    /// The nodes this one paints, back to front.
    pub(crate) paint_children: Vec<u32>,
    pub(crate) computed: ComputedStyle,
    pub(crate) layout: NodeId,
    pub(crate) visual: Visual,
    pub(crate) render: RenderNode,
    pub(crate) geometry: NodeGeometry,
    /// Where a scroll container is scrolled and how fast it is still coasting. Per tag, so it
    /// survives the clones React makes, and re-clamped after every layout. Zero for anything that
    /// is not a scroll container.
    pub(crate) scroll: ScrollState,
    /// The pseudo-states this node's style layers condition on.
    pub(crate) uses_states: PseudoStates,
    /// A text input's text, selection, history and shaping; `Some` exactly for `Kind::TextInput`.
    pub(crate) text_input: Option<TextInputState>,
    /// The element's transform evaluated for its border box (the sampled one while it animates), or
    /// `None` for one without a transform or whose transform does nothing: nothing is computed for those.
    pub(crate) transform: Option<NodeTransform>,
    /// The scale text and rounded corners are rasterised at on top of the viewport's, for the transforms on the element
    /// and above it (`transform_state.rs`). `None` until the element has been placed.
    pub(crate) raster: Option<crate::transform_state::Raster>,
}

#[derive(Default)]
pub(crate) struct Mounted {
    pub(crate) nodes: HashMap<u32, MountedNode>,
    /// Each layer's top-level children, in order.
    pub(crate) roots: [Vec<u32>; LAYER_COUNT],
    /// What each layer paints directly, back to front.
    pub(crate) paint_roots: [Vec<u32>; LAYER_COUNT],
    /// Every node whose computed `position` is `absolute` or `fixed`: the nodes whose paint parent can
    /// differ from their tree parent, and the only ones re-examined when the tree or a position changes.
    pub(crate) out_of_flow: BTreeSet<u32>,
    /// Every tag the root ever created: tags are never reused.
    pub(crate) used: BTreeSet<u32>,
    pub(crate) breakpoints: BreakpointIndex,
    /// The hover, active and focus chains style resolution tests layers against.
    pub(crate) interaction: InteractionState,
    /// `testID` to the tags carrying it; the lowest tag (the first created) answers a lookup.
    pub(crate) test_ids: BTreeMap<String, BTreeSet<u32>>,
}

impl MountedTree for Mounted {
    fn kind(&self, tag: u32) -> Option<Kind> {
        self.nodes.get(&tag).map(|node| node.kind)
    }

    fn layer(&self, tag: u32) -> Option<usize> {
        self.nodes.get(&tag).map(|node| node.layer)
    }

    fn parent(&self, tag: u32) -> Option<Parent> {
        self.nodes.get(&tag).and_then(|node| node.parent)
    }

    fn children(&self, parent: Parent) -> &[u32] {
        match parent {
            Parent::Layer(layer) => &self.roots[layer],
            Parent::Node(tag) => self.nodes.get(&tag).map_or(&[], |node| &node.children),
        }
    }

    fn props(&self, tag: u32) -> Option<&PropsSpec> {
        self.nodes.get(&tag).map(|node| &node.props)
    }

    fn was_created(&self, tag: u32) -> bool {
        self.used.contains(&tag)
    }
}

impl StyleTree for Mounted {
    fn style_parent(&self, tag: u32) -> Option<u32> {
        match self.nodes.get(&tag)?.parent? {
            Parent::Node(parent) => Some(parent),
            Parent::Layer(_) => None,
        }
    }

    fn style_children(&self, tag: u32) -> &[u32] {
        self.nodes.get(&tag).map_or(&[], |node| &node.children)
    }

    fn style_inputs(&self, tag: u32) -> StyleInputs<'_> {
        let node = &self.nodes[&tag];
        StyleInputs {
            layers: node.props.style.as_ref(),
            hidden: node.props.is_hidden(),
            states: self.interaction.states_of(tag, node.props.is_disabled()),
        }
    }

    fn computed(&self, tag: u32) -> Option<&ComputedStyle> {
        self.nodes.get(&tag).map(|node| &node.computed)
    }

    fn store_computed(&mut self, tag: u32, computed: ComputedStyle) -> Option<ComputedStyle> {
        let node = self.nodes.get_mut(&tag)?;
        Some(std::mem::replace(&mut node.computed, computed))
    }
}

impl FocusTree for Mounted {
    fn tab_index_of(&self, tag: u32) -> Option<i32> {
        self.nodes.get(&tag).and_then(|node| node.props.tab_index)
    }
}

impl StackingTree for Mounted {
    fn tree_parent(&self, tag: u32) -> Option<Parent> {
        self.nodes.get(&tag)?.parent
    }

    fn tree_children(&self, parent: Parent) -> &[u32] {
        MountedTree::children(self, parent)
    }

    fn stacking(&self, tag: u32) -> Option<Stacking> {
        let computed = &self.nodes.get(&tag)?.computed;
        Some(Stacking {
            position: computed.position.unwrap_or(PositionSpec::Static),
            z_index: computed.z_index.unwrap_or(0),
            transformed: computed.is_transformed(),
            inside_transform: computed.inside_transform,
        })
    }
}

impl PaintTree for Mounted {
    fn layer_count(&self) -> usize {
        LAYER_COUNT
    }

    fn paint_roots(&self, layer: usize) -> &[u32] {
        &self.paint_roots[layer]
    }

    fn paint_children(&self, tag: u32) -> &[u32] {
        self.nodes
            .get(&tag)
            .map_or(&[], |node| &node.paint_children)
    }

    fn paint_parent(&self, tag: u32) -> Option<Parent> {
        self.nodes.get(&tag)?.paint_parent
    }

    fn frame(&self, tag: u32) -> Option<Frame> {
        let node = self.nodes.get(&tag)?;
        Some(Frame {
            location: node.geometry.location,
            size: node.geometry.size,
            clip: node.clips_content().then(|| node.geometry.padding_box()),
            pointer_target: node.computed.is_pointer_target(),
            scroll: node.scroll_frame(),
            placement: node.transform.map(|transform| transform.placement),
        })
    }
}

impl ButtonTree for Mounted {
    fn kind_of(&self, tag: u32) -> Option<Kind> {
        self.nodes.get(&tag).map(|node| node.kind)
    }

    fn parent_of(&self, tag: u32) -> Option<u32> {
        self.style_parent(tag)
    }

    fn disabled_prop(&self, tag: u32) -> bool {
        self.nodes
            .get(&tag)
            .is_some_and(|node| node.props.is_disabled())
    }
}

impl Mounted {
    /// `tag` and its ancestors up to its layer's top-level node; empty if `tag` is not mounted.
    pub(crate) fn path_of(&self, tag: u32) -> Vec<u32> {
        if !self.nodes.contains_key(&tag) {
            return Vec::new();
        }
        chain(self, tag)
    }

    /// Whether `tag` or any ancestor has the `disabled` prop. An unmounted tag counts as disabled:
    /// nothing can be done to it.
    pub(crate) fn is_disabled(&self, tag: u32) -> bool {
        if !self.nodes.contains_key(&tag) {
            return true;
        }
        let mut current = Some(tag);
        while let Some(node) = current {
            if self.disabled_prop(node) {
                return true;
            }
            current = self.style_parent(node);
        }
        false
    }

    /// The root-local rectangle of `tag` as drawn and the clip its paint ancestors impose on it, or
    /// `None` if it is not mounted. Computed by walking up the paint parents: cost proportional to
    /// depth. Scrolled content is where its scroll offsets put it.
    pub(crate) fn absolute_geometry(
        &self,
        tag: u32,
        viewport: BoxRect,
    ) -> Option<(BoxRect, Option<BoxRect>)> {
        stacking::absolute_geometry(self, tag, viewport, ScrollMode::Drawn)
    }

    /// The map from `tag`'s own frame (the corner of its border box is the origin) to the root, where it is drawn
    /// now, or `None` if it is not mounted. A point of the root goes into the element's frame through the
    /// inverse; a point of the element's goes to the root through the map.
    pub(crate) fn absolute_affine(&self, tag: u32, viewport: BoxRect) -> Option<Affine2> {
        stacking::absolute_affine(self, tag, viewport).map(|(affine, _)| affine)
    }

    /// The map from the frame `tag`'s paint parent locates its children in (scrolled) to the root.
    pub(crate) fn absolute_parent_affine(&self, tag: u32, viewport: BoxRect) -> Option<Affine2> {
        stacking::absolute_parent_affine(self, tag, viewport)
    }

    /// `point` (root-local) in the frame of `tag` (the corner of its border box is the origin): where an element's
    /// own coordinates, a text layout's for one, meet a pointer. `None` if `tag` is not mounted or is drawn with a
    /// matrix that has no inverse.
    pub(crate) fn to_local(&self, tag: u32, viewport: BoxRect, point: Vector2) -> Option<Vector2> {
        Some(self.absolute_affine(tag, viewport)?.inverse()?.apply(point))
    }

    /// `point`, in the frame of `tag`, in the root.
    pub(crate) fn to_root(&self, tag: u32, viewport: BoxRect, point: Vector2) -> Option<Vector2> {
        Some(self.absolute_affine(tag, viewport)?.apply(point))
    }

    /// Whether `tag` has an area an event could reach, now or by scrolling: Tab stops and keeping
    /// focus ask this, and an element scrolled out of its container's view still counts
    /// (`ScrollMode::Reachable`).
    pub(crate) fn visible_for_input(&self, tag: u32, viewport: BoxRect) -> bool {
        // A `visibility: hidden` element has its area but cannot be focused.
        self.nodes
            .get(&tag)
            .is_some_and(|node| !node.computed.is_invisible())
            && stacking::absolute_geometry(self, tag, viewport, ScrollMode::Reachable).is_some_and(
                |(rect, clip)| {
                    rect.width > 0.0
                        && rect.height > 0.0
                        && clip.is_none_or(|clip| intersects(rect, clip))
                },
            )
    }

    /// The topmost element at `point` (root-local), descending the paint tree in reverse paint order,
    /// the overlay layer first (`stacking::hit_test`).
    pub(crate) fn hit_test(&self, point: Vector2) -> Option<u32> {
        stacking::hit_test(self, point)
    }

    /// The cursor to show at `point`: the computed `cursor` of the element a pointer there would
    /// reach; `unset(tag)` if nothing set one for it (`default`, or `text` over selectable text, plan
    /// 3.20); `default` over nothing.
    pub(crate) fn cursor_at(
        &self,
        point: Vector2,
        unset: impl FnOnce(u32) -> CursorSpec,
    ) -> CursorSpec {
        let Some(tag) = self.hit_test(point) else {
            return CursorSpec::Default;
        };
        self.nodes
            .get(&tag)
            .and_then(|node| node.computed.cursor)
            .unwrap_or_else(|| unset(tag))
    }

    /// Every element in document order (pre-order, main layer first). Whole-tree by design: Tab
    /// order and snapshots.
    pub(crate) fn document_order(&self) -> Vec<u32> {
        let mut order = Vec::with_capacity(self.nodes.len());
        for roots in &self.roots {
            let mut stack: Vec<u32> = roots.iter().rev().copied().collect();
            while let Some(tag) = stack.pop() {
                order.push(tag);
                if let Some(node) = self.nodes.get(&tag) {
                    stack.extend(node.children.iter().rev());
                }
            }
        }
        order
    }

    pub(crate) fn find_by_test_id(&self, test_id: &str) -> Option<u32> {
        self.test_ids.get(test_id)?.first().copied()
    }

    fn index_test_id(&mut self, tag: u32, previous: Option<&str>, next: Option<&str>) {
        if previous == next {
            return;
        }
        if let Some(previous) = previous
            && let Some(tags) = self.test_ids.get_mut(previous)
        {
            tags.remove(&tag);
            if tags.is_empty() {
                self.test_ids.remove(previous);
            }
        }
        if let Some(next) = next {
            self.test_ids
                .entry(next.to_string())
                .or_default()
                .insert(tag);
        }
    }
}

impl MountedNode {
    /// Whether this element clips its children to its padding box: one clip rectangle, so an element
    /// that clips on one axis clips on both.
    pub(crate) fn clips_content(&self) -> bool {
        self.kind == Kind::TextInput
            || self.computed.overflow_x.is_some_and(OverflowSpec::clips)
            || self.computed.overflow_y.is_some_and(OverflowSpec::clips)
    }

    /// Whether what this element's items draw depends on the oversampling of the viewport (`render_tree::Oversampling`):
    /// text, whose glyphs are rasterised at it; rounded corners, whose antialiasing feather is one device pixel; a
    /// shadow, a gradient, a mitred border or an outline, which are drawn in device pixels; and a scroll container's bars,
    /// which have round ends. A change of scale paints exactly these again.
    pub(crate) fn paints_at_oversampling(&self) -> bool {
        match self.kind {
            Kind::Text | Kind::TextInput => true,
            Kind::View | Kind::Button => {
                self.computed
                    .border_radii()
                    .iter()
                    .any(|radius| radius.round() > 0.0)
                    || self.render.drawn_at_scale()
                    || self.render.has_scroller()
                    // A square box a transform moves off the pixel grid is drawn from feathered triangles.
                    || self.raster.is_some_and(|raster| raster.soften_squares)
            }
        }
    }

    /// Whether this element is a scroll container: `overflow` is `scroll` or `auto` on an axis, or it
    /// is a multi-line text input, whose text scrolls vertically like any container's content (wheel,
    /// touch pans and thumb dragging reach it; chaining hands what it cannot take to the container
    /// around it). A single-line input scrolls its text to follow the caret but is not one: a wheel
    /// over it belongs to whatever scrolls behind it.
    pub(crate) fn is_scroll_container(&self) -> bool {
        self.computed.overflow_x.is_some_and(OverflowSpec::scrolls)
            || self.computed.overflow_y.is_some_and(OverflowSpec::scrolls)
            || self
                .text_input
                .as_ref()
                .is_some_and(|state| state.buffer.config().multiline)
    }

    /// Whether this element has a `scroll` item to move its content with: every scroll container,
    /// and every text input (a single-line input scrolls horizontally to follow its caret).
    pub(crate) fn has_scroll_item(&self) -> bool {
        self.kind == Kind::TextInput || self.is_scroll_container()
    }

    /// The ranges Taffy's layout allows: the magnitude of each scrolling axis with its reversed flag
    /// (`Layout::scroll_width()` is unsigned, also for a reversed axis). An axis whose `overflow`
    /// does not scroll has none, however far its content reaches.
    fn scroll_ranges_of(&self, layout: &taffy::Layout) -> ScrollRanges {
        if let Some(state) = &self.text_input {
            // The text is no layout child, so its reach is its own: the shaped text and the caret.
            return crate::text_input_godot::scroll_ranges(
                state,
                self.computed.text_align,
                Vector2::new(layout.size.width, layout.size.height),
                Edges {
                    left: layout.border.left,
                    top: layout.border.top,
                    right: layout.border.right,
                    bottom: layout.border.bottom,
                },
                Edges {
                    left: layout.padding.left,
                    top: layout.padding.top,
                    right: layout.padding.right,
                    bottom: layout.padding.bottom,
                },
            );
        }
        let reversed = layout.scrollable_overflow_rect.is_reversed();
        let range = |overflow: Option<OverflowSpec>, magnitude: f32, reversed: bool| {
            if overflow.is_some_and(OverflowSpec::scrolls) {
                ScrollRange::new(magnitude, reversed)
            } else {
                ScrollRange::NONE
            }
        };
        ScrollRanges {
            x: range(self.computed.overflow_x, layout.scroll_width(), reversed.x),
            y: range(self.computed.overflow_y, layout.scroll_height(), reversed.y),
        }
    }

    /// The overlay scrollbars as they are now, in the client (padding box) area's coordinates; none
    /// for a container with `scrollbar-width: none` or nothing to scroll.
    pub(crate) fn scrollbars(&self) -> Scrollbars {
        if self.computed.scrollbar_width == Some(ScrollbarWidthSpec::None) {
            return Scrollbars::default();
        }
        self.scrollbar_layout()
    }

    /// Where the scrollbars lie, whether or not they are drawn (`scrollbar-width: none` hides the
    /// drawing, not the axis): the layout of every axis that can scroll, in the client area's
    /// coordinates. The accessibility tree's scroll bar elements cover these tracks.
    pub(crate) fn scrollbar_layout(&self) -> Scrollbars {
        if !self.is_scroll_container() {
            return Scrollbars::default();
        }
        let client = self.geometry.padding_box();
        scroll::scrollbars(
            scroll::Vec2::new(client.width, client.height),
            &self.geometry.scroll_ranges,
            self.scroll.offset,
        )
    }

    /// What hit testing and geometry need of a scroll container, or `None` for any other element.
    fn scroll_frame(&self) -> Option<ScrollFrame> {
        if !self.is_scroll_container() {
            return None;
        }
        let client = self.geometry.padding_box();
        let origin = Vector2::new(client.x, client.y);
        let bars = self.scrollbars();
        let thumb = |bar: Option<scroll::Scrollbar>| {
            bar.map(|bar| BoxRect {
                x: origin.x + bar.thumb.origin.x,
                y: origin.y + bar.thumb.origin.y,
                width: bar.thumb.size.x,
                height: bar.thumb.size.y,
            })
        };
        Some(ScrollFrame {
            offset: to_vector(self.scroll.offset),
            thumbs: [thumb(bars.x), thumb(bars.y)],
        })
    }
}

/// What a commit's style resolution would produce, computed before anything is mounted.
struct DryRun {
    changes: Vec<StyleChange>,
    computed: HashMap<u32, ComputedStyle>,
}

/// The mounted tree as the commit would leave it, for resolving styles before the commit is
/// applied: new props, new parents and new child lists from the validated payload, everything else
/// from the mounted tree. Computed styles it resolves stay in `computed`.
pub(crate) struct StyleOverlay<'a> {
    mounted: &'a Mounted,
    props: HashMap<u32, &'a PropsSpec>,
    lists: HashMap<Parent, &'a Vec<u32>>,
    new_parent: HashMap<u32, Parent>,
    pub(crate) computed: HashMap<u32, ComputedStyle>,
}

impl<'a> StyleOverlay<'a> {
    fn new(mounted: &'a Mounted, validated: &'a ValidatedCommit) -> Self {
        let mut props: HashMap<u32, &PropsSpec> = HashMap::new();
        for create in &validated.created {
            props.insert(create.tag, &create.props);
        }
        for update in &validated.updated {
            props.insert(update.tag, &update.props);
        }
        let lists: HashMap<Parent, &Vec<u32>> = validated
            .lists
            .iter()
            .map(|(parent, list)| (*parent, list))
            .collect();
        let new_parent = validated
            .lists
            .iter()
            .flat_map(|(parent, list)| list.iter().map(|child| (*child, *parent)))
            .collect();
        Self {
            mounted,
            props,
            lists,
            new_parent,
            computed: HashMap::new(),
        }
    }

    fn props_of(&self, tag: u32) -> &PropsSpec {
        match self.props.get(&tag) {
            Some(props) => props,
            None => &self.mounted.nodes[&tag].props,
        }
    }
}

impl StyleTree for StyleOverlay<'_> {
    fn style_parent(&self, tag: u32) -> Option<u32> {
        let parent = match self.new_parent.get(&tag) {
            Some(parent) => Some(*parent),
            None => self.mounted.nodes.get(&tag).and_then(|node| node.parent),
        };
        match parent? {
            Parent::Node(parent) => Some(parent),
            Parent::Layer(_) => None,
        }
    }

    fn style_children(&self, tag: u32) -> &[u32] {
        match self.lists.get(&Parent::Node(tag)) {
            Some(list) => list,
            None => self
                .mounted
                .nodes
                .get(&tag)
                .map_or(&[], |node| &node.children),
        }
    }

    fn style_inputs(&self, tag: u32) -> StyleInputs<'_> {
        let props = self.props_of(tag);
        StyleInputs {
            layers: props.style.as_ref(),
            hidden: props.is_hidden(),
            states: self.mounted.interaction.states_of(tag, props.is_disabled()),
        }
    }

    fn computed(&self, tag: u32) -> Option<&ComputedStyle> {
        match self.computed.get(&tag) {
            Some(computed) => Some(computed),
            None => self.mounted.nodes.get(&tag).map(|node| &node.computed),
        }
    }

    fn store_computed(&mut self, tag: u32, computed: ComputedStyle) -> Option<ComputedStyle> {
        let previous = self
            .mounted
            .nodes
            .get(&tag)
            .map(|node| node.computed.clone());
        self.computed.insert(tag, computed).or(previous)
    }
}

impl ReactUiRoot {
    /// Apply one layer's commit payload: validate all of it, plan, check motion, then mount. Any
    /// error returns before the mounted tree changes (plan 3.2 invariant 4).
    pub(crate) fn run_commit(
        &mut self,
        layer: usize,
        payload: &CommitPayload,
        parse_micros: u64,
    ) -> Result<(), String> {
        let started = Instant::now();
        let validated = commit::validate(payload, layer, &self.mounted).map_err(|error| error.0)?;
        let transaction = commit::plan(&validated, &self.mounted);
        let dry_run = self.dry_run_styles(&validated, &transaction)?;
        let validate_micros = micros(started);

        let mount_started = Instant::now();
        self.phase_layout_micros = 0;
        self.phase_geometry_micros = 0;
        self.stats.nodes_created += validated.created.len() as u64;
        self.stats.nodes_updated += validated.updated.len() as u64;
        self.stats.nodes_deleted += transaction.deletes.len() as u64;
        self.stats.mutations += (transaction.removes.len()
            + transaction.deletes.len()
            + transaction.creates.len()
            + transaction.updates.len()
            + transaction.inserts.len()) as u64;
        self.deletions.clear();

        let touched = self.apply_transaction(layer, &transaction);
        for (tag, computed) in dry_run.computed {
            if let Some(node) = self.mounted.nodes.get_mut(&tag) {
                node.computed = computed;
            }
        }
        self.settle_structure(&touched);
        self.publish_commit(&dry_run.changes, !touched.is_empty());
        self.settle_selection(!touched.is_empty());
        self.refresh_interaction();
        self.apply_auto_focus(&validated);
        self.settle_key_focus();
        // What is exposed may have changed in any way a commit can change the tree; pruning is a
        // no-op until an assistive technology has asked for the tree (plan 3.21).
        self.accessibility.mark_structure_dirty();
        self.prune_accessibility();
        self.request_accessibility_update();
        self.stats.batches += 1;
        self.stats.node_count = self.mounted.nodes.len();
        let mount_micros = micros(mount_started)
            .saturating_sub(self.phase_layout_micros + self.phase_geometry_micros);
        self.profiler.record(Sample::Batch {
            parse_micros,
            validate_micros,
            mount_micros,
            layout_micros: self.phase_layout_micros,
            geometry_micros: self.phase_geometry_micros,
            total_micros: micros(started) + parse_micros,
        });
        Ok(())
    }

    /// Resolve every changed node's computed style as the commit would leave the tree, and reject
    /// a style change motion cannot animate.
    fn dry_run_styles(
        &self,
        validated: &ValidatedCommit,
        transaction: &MountingTransaction,
    ) -> Result<DryRun, String> {
        let mut overlay = StyleOverlay::new(&self.mounted, validated);
        let mut dirty: BTreeSet<u32> = validated.created.iter().map(|c| c.tag).collect();
        dirty.extend(validated.updated.iter().map(|update| update.tag));
        // A node that moved has new inherited inputs.
        dirty.extend(
            transaction
                .inserts
                .iter()
                .map(|insertion| insertion.tag)
                .filter(|tag| self.mounted.nodes.contains_key(tag)),
        );
        let viewport = Viewport {
            width: self.viewport_size.x,
            height: self.viewport_size.y,
        };
        let changes = restyle(&mut overlay, dirty, viewport);
        self.validate_motion(&overlay, &changes)?;
        Ok(DryRun {
            changes,
            computed: overlay.computed,
        })
    }

    /// Remove, Delete, Create, Update, Insert (plan 3.7). Returns the parents whose child lists
    /// changed. Computed styles, paragraphs and the style engine are settled afterwards.
    fn apply_transaction(
        &mut self,
        layer: usize,
        transaction: &MountingTransaction,
    ) -> BTreeSet<Parent> {
        let mut touched = BTreeSet::new();
        for removal in &transaction.removes {
            self.remove_child(removal);
            touched.insert(removal.parent);
        }
        for tag in &transaction.deletes {
            self.delete_node(*tag);
        }
        for create in &transaction.creates {
            self.create_node(create.tag, create.kind, layer, &create.props);
        }
        for update in &transaction.updates {
            self.update_props(update.tag, &update.props);
        }
        for insertion in &transaction.inserts {
            self.insert_child(insertion);
            touched.insert(insertion.parent);
        }
        touched
    }

    fn remove_child(&mut self, removal: &Removal) {
        self.restore_layout_order(removal.parent);
        self.order_dirty.insert(removal.parent);
        let handle = match removal.parent {
            Parent::Layer(layer) => {
                let tag = self.mounted.roots[layer].remove(removal.index);
                assert_eq!(
                    tag, removal.tag,
                    "a planned removal names the tag at its index"
                );
                self.layer_roots[layer]
            }
            Parent::Node(parent) => {
                let parent = self
                    .mounted
                    .nodes
                    .get_mut(&parent)
                    .expect("a planned removal names a mounted parent");
                let tag = parent.children.remove(removal.index);
                assert_eq!(
                    tag, removal.tag,
                    "a planned removal names the tag at its index"
                );
                parent.layout
            }
        };
        self.tree
            .remove_child_at_index(handle, removal.index)
            .expect("the layout child list mirrors the mounted one");
        if let Some(node) = self.mounted.nodes.get_mut(&removal.tag) {
            node.parent = None;
            node.render.detach();
            // Whoever painted it no longer does; a later insertion settles its new paint parent.
            if let Some(painter) = node.paint_parent.take() {
                self.paint_dirty_parents.insert(painter);
            }
        }
        self.hit_stale = true;
        if let Parent::Node(parent) = removal.parent {
            self.layout_dirty.insert(parent);
        }
    }

    fn insert_child(&mut self, insertion: &Insertion) {
        self.restore_layout_order(insertion.parent);
        self.order_dirty.insert(insertion.parent);
        let (parent_layout, parent_item) = match insertion.parent {
            Parent::Layer(layer) => (self.layer_roots[layer], self.layer_item(layer)),
            Parent::Node(parent) => {
                let parent = &self.mounted.nodes[&parent];
                (parent.layout, parent.render.child_item())
            }
        };
        let child = self
            .mounted
            .nodes
            .get_mut(&insertion.tag)
            .expect("a planned insertion names a mounted node");
        self.tree
            .insert_child_at_index(parent_layout, insertion.index, child.layout)
            .expect("the planned index is within the layout child list");
        child.parent = Some(insertion.parent);
        // Painted by the tree parent until the paint structure is settled (`settle_paint_structure`),
        // which moves an out-of-flow element to its containing block.
        child.paint_parent = Some(insertion.parent);
        child.render.attach(parent_item);
        self.paint_reeval.insert(insertion.tag);
        self.paint_dirty_parents.insert(insertion.parent);
        self.hit_stale = true;
        match insertion.parent {
            Parent::Layer(layer) => {
                self.mounted.roots[layer].insert(insertion.index, insertion.tag)
            }
            Parent::Node(parent) => {
                self.mounted
                    .nodes
                    .get_mut(&parent)
                    .expect("a planned insertion names a mounted parent")
                    .children
                    .insert(insertion.index, insertion.tag);
                self.layout_dirty.insert(parent);
            }
        }
        self.layout_dirty.insert(insertion.tag);
    }

    fn create_node(&mut self, tag: u32, kind: Kind, layer: usize, props: &PropsSpec) {
        let layout = self
            .tree
            .new_leaf(taffy::Style::default())
            .expect("a new layout leaf");
        let node = MountedNode {
            kind,
            layer,
            props: props.clone(),
            parent: None,
            children: Vec::new(),
            paint_parent: None,
            paint_children: Vec::new(),
            computed: ComputedStyle::default(),
            layout,
            visual: Visual::new(),
            render: RenderNode::new(),
            geometry: NodeGeometry::default(),
            scroll: ScrollState::default(),
            uses_states: states_used(props.style.as_ref()),
            text_input: (kind == Kind::TextInput).then(|| {
                TextInputState::new(
                    EditConfig {
                        multiline: props.is_multiline(),
                        read_only: props.read_only == Some(true),
                        secure: props.secure == Some(true),
                        max_length: props.max_length.map(|length| length as usize),
                    },
                    props.default_value.as_deref().unwrap_or(""),
                )
            }),
            transform: None,
            raster: None,
        };
        self.mounted.breakpoints.register(tag, props.style.as_ref());
        self.mounted
            .index_test_id(tag, None, props.test_id.as_deref());
        self.mounted.used.insert(tag);
        self.mounted.nodes.insert(tag, node);
        self.style_engine.insert(tag);
        self.layout_dirty.insert(tag);
        self.paint_dirty.insert(tag);
        if props.text.is_some() || kind == Kind::TextInput {
            self.pending_text.insert(tag);
        }
    }

    fn update_props(&mut self, tag: u32, props: &PropsSpec) {
        let node = self
            .mounted
            .nodes
            .get_mut(&tag)
            .expect("a planned update names a mounted node");
        let previous = std::mem::replace(&mut node.props, props.clone());
        if previous.style != node.props.style {
            node.uses_states = states_used(node.props.style.as_ref());
            self.mounted
                .breakpoints
                .unregister(tag, previous.style.as_ref());
            self.mounted.breakpoints.register(tag, props.style.as_ref());
        }
        self.mounted
            .index_test_id(tag, previous.test_id.as_deref(), props.test_id.as_deref());
        if previous.text != props.text {
            self.pending_text.insert(tag);
            self.selection_node_changed(tag);
        }
        if self.sync_text_input_props(tag, &previous) {
            self.pending_text.insert(tag);
        }
        self.paint_dirty.insert(tag);
    }

    fn delete_node(&mut self, tag: u32) {
        let node = self
            .mounted
            .nodes
            .remove(&tag)
            .expect("a planned deletion names a mounted node");
        self.tree
            .remove(node.layout)
            .expect("a deleted node has a layout node");
        self.mounted
            .breakpoints
            .unregister(tag, node.props.style.as_ref());
        self.mounted
            .index_test_id(tag, node.props.test_id.as_deref(), None);
        self.forget_motion(tag);
        self.forget_transform(tag);
        self.forget_accessibility_node(tag);
        self.layout_dirty.remove(&tag);
        self.paint_dirty.remove(&tag);
        self.paint_reeval.remove(&tag);
        self.mounted.out_of_flow.remove(&tag);
        self.forget_scroll(tag);
        self.forget_effects(tag);
        self.selection_node_changed(tag);
        self.paint_dirty_parents.remove(&Parent::Node(tag));
        if let Some(painter) = node.paint_parent {
            self.paint_dirty_parents.insert(painter);
        }
        self.hit_stale = true;
        // Nothing may keep pointing at a deleted element; JS drops events for tags it no longer has.
        if self.focused == Some(tag) && node.text_input.is_some() {
            // Its IME window and on-screen keyboard close with it; the node is gone, so nothing is
            // left to blur.
            self.end_platform_text_session();
        }
        if self.text_inputs.drag.is_some_and(|drag| drag.tag == tag) {
            self.text_inputs.drag = None;
        }
        if self.hovered == Some(tag) {
            self.hovered = None;
        }
        if self.pressed == Some(tag) {
            self.pressed = None;
        }
        if self.focused == Some(tag) {
            self.focused = None;
            // Godot key focus goes back once the commit has settled (`settle_key_focus`): the tree is
            // half applied now, and the release sends the root a `FOCUS_EXIT`.
            self.key_focus_release_due = true;
        }
        // A capture on it ends, and a press that targeted it no longer clicks.
        self.pointers.forget_target(tag);
        self.pending_style_removals.push(tag);
        self.deletions.push(tag);
        // `node.render` drops here and frees the canvas items.
    }

    /// After the transaction: the style engine's tree, and the paint lists of the parents whose child
    /// lists changed (`settle_paint_structure` orders them).
    fn settle_structure(&mut self, touched: &BTreeSet<Parent>) {
        for parent in touched {
            let children: Vec<u32> = match parent {
                Parent::Layer(layer) => self.mounted.roots[*layer].clone(),
                Parent::Node(tag) => match self.mounted.nodes.get(tag) {
                    Some(node) => node.children.clone(),
                    None => continue,
                },
            };
            self.paint_dirty_parents.insert(*parent);
            self.style_engine.set_children(*parent, &children);
        }
        for tag in std::mem::take(&mut self.pending_style_removals) {
            self.style_engine.remove(tag);
        }
    }

    /// Settle who paints what (plan 3.8): re-examine the nodes whose tree parent, `position` or
    /// `zIndex` changed and every out-of-flow node (an ancestor's change of place or of `position`
    /// can move their containing block; their number, not the tree's size, is the cost), move the
    /// canvas items of those that changed paint parent, and re-order the paint list of every paint
    /// parent affected, giving its items their draw index. Runs before geometry, which reads the
    /// paint lists.
    pub(crate) fn settle_paint_structure(&mut self) {
        if self.paint_reeval.is_empty() && self.paint_dirty_parents.is_empty() {
            return;
        }
        let explicit = std::mem::take(&mut self.paint_reeval);
        let implicit: Vec<u32> = self.mounted.out_of_flow.iter().copied().collect();
        for tag in explicit.iter().copied().chain(implicit) {
            let Some(node) = self.mounted.nodes.get(&tag) else {
                continue;
            };
            let position = node.computed.position.unwrap_or(PositionSpec::Static);
            if position.is_out_of_flow() {
                self.mounted.out_of_flow.insert(tag);
            } else {
                self.mounted.out_of_flow.remove(&tag);
            }
            let desired = stacking::paint_parent(&self.mounted, tag);
            let current = self.mounted.nodes[&tag].paint_parent;
            if desired != current {
                self.move_paint_item(tag, desired);
                if let Some(previous) = current {
                    self.paint_dirty_parents.insert(previous);
                }
            }
            // Its z-index or position may have changed where it sorts, wherever it is painted.
            if explicit.contains(&tag)
                && let Some(painter) = desired
            {
                self.paint_dirty_parents.insert(painter);
            }
        }
        for parent in std::mem::take(&mut self.paint_dirty_parents) {
            if let Parent::Node(tag) = parent
                && !self.mounted.nodes.contains_key(&tag)
            {
                continue;
            }
            let list = stacking::painted_by(&self.mounted, parent, &self.mounted.out_of_flow);
            for (index, child) in list.iter().enumerate() {
                if let Some(node) = self.mounted.nodes.get_mut(child) {
                    node.render.set_draw_index(
                        i32::try_from(index).expect("a paint list fits an i32 draw index"),
                    );
                }
            }
            match parent {
                Parent::Layer(layer) => self.mounted.paint_roots[layer] = list,
                Parent::Node(tag) => {
                    if let Some(node) = self.mounted.nodes.get_mut(&tag) {
                        node.paint_children = list;
                    }
                    // What a filtered element paints changed: it measures its subtree again.
                    self.effects.note_changed(tag);
                }
            }
            self.hit_stale = true;
        }
    }

    /// Re-parent a node's canvas items under the content item (or layer item) of its new paint parent.
    fn move_paint_item(&mut self, tag: u32, painter: Option<Parent>) {
        let item = painter.map(|painter| match painter {
            Parent::Layer(layer) => self.layer_item(layer),
            Parent::Node(node) => self.mounted.nodes[&node].render.child_item(),
        });
        let node = self
            .mounted
            .nodes
            .get_mut(&tag)
            .expect("a re-parented node is mounted");
        match item {
            Some(item) => node.render.attach(item),
            None => node.render.detach(),
        }
        node.paint_parent = painter;
        self.hit_stale = true;
        self.effects.note_changed(tag);
    }

    /// Rebuild a node's text paragraph from its props and computed style. Returns whether the text
    /// or its shaping changed (and so layout and paint are dirty).
    pub(crate) fn refresh_paragraph(&mut self, tag: u32) -> bool {
        if self.font.is_none() {
            return false;
        }
        if self
            .mounted
            .nodes
            .get(&tag)
            .is_some_and(|node| node.kind == Kind::TextInput)
        {
            return self.refresh_text_input(tag);
        }
        let Some(node) = self.mounted.nodes.get(&tag) else {
            return false;
        };
        let style = TextStyle::of(
            &node.computed,
            node.computed.overflow_x.is_some_and(OverflowSpec::clips),
        );
        let source = node.props.text.as_deref().unwrap_or("");
        let shown =
            shown_text(source, style.shaping.transform, style.shaping.white_space).into_owned();
        let shown_override = (shown != source).then(|| shown.clone());
        let font = self
            .fonts
            .resolve(&style.shaping)
            .expect("a root with a theme font resolves every font request");
        let paragraph = (!shown.is_empty()).then(|| {
            let mut paragraph = StyledParagraph::build(&shown, &style.shaping, font);
            paragraph.set_decorations(style.decorations);
            paragraph
        });
        let node = self
            .mounted
            .nodes
            .get_mut(&tag)
            .expect("the node was found above");
        let had = node.visual.paragraph.is_some();
        let shown_changed = node.visual.shown_text(node.props.text.as_deref())
            != Some(shown.as_str())
            && node.visual.paragraph.is_some();
        node.visual.paragraph = paragraph;
        node.visual.shown = shown_override;
        self.paragraph_generation += 1;
        node.visual.generation = self.paragraph_generation;
        let context = node
            .visual
            .paragraph
            .clone()
            .map(crate::TextContext::Paragraph);
        let has = context.is_some();
        self.tree
            .set_node_context(node.layout, context)
            .expect("a mounted node has a layout node");
        self.layout_dirty.insert(tag);
        self.paint_dirty.insert(tag);
        self.content_generation += 1;
        if shown_changed {
            // A restyle (`uppercase` on hover) can change what the node shows without changing its text prop.
            self.selection_node_changed(tag);
        }
        had || has
    }

    /// The text nodes that name a font family: the ones a newly registered face can change.
    pub(crate) fn refresh_font_users(&mut self) {
        let users: Vec<u32> = self
            .mounted
            .nodes
            .iter()
            .filter(|(_, node)| {
                node.computed.font_family.is_some()
                    && (node.props.text.is_some() || node.kind == Kind::TextInput)
            })
            .map(|(tag, _)| *tag)
            .collect();
        if users.is_empty() || self.font.is_none() {
            return;
        }
        for tag in users {
            self.refresh_paragraph(tag);
        }
        self.flush_layout();
    }

    /// Recompute the geometry of the nodes whose layout may have changed (plan 3.7): compare each
    /// child of an ancestor of a dirty node, or of a node whose size changed, with what is stored;
    /// a changed location only moves the node's item.
    pub(crate) fn update_geometry(&mut self) {
        let mut dirty_paths: BTreeSet<u32> = BTreeSet::new();
        for tag in std::mem::take(&mut self.layout_dirty) {
            let mut current = Some(tag);
            while let Some(node) = current {
                if !self.mounted.nodes.contains_key(&node) || !dirty_paths.insert(node) {
                    break;
                }
                current = self.mounted.style_parent(node);
            }
        }
        for layer in 0..LAYER_COUNT {
            self.update_children_geometry(Parent::Layer(layer), &dirty_paths);
        }
        // An out-of-flow node is located in its containing block, which a change anywhere between the
        // two can move without any layout flag on the path from the tree's root, so each is compared on
        // every pass. This loop is over the out-of-flow nodes only (plan 3.2 invariant 6, named here).
        let out_of_flow: Vec<u32> = self.mounted.out_of_flow.iter().copied().collect();
        for tag in out_of_flow {
            if self.update_node_geometry(tag, &dirty_paths) {
                self.update_children_geometry(Parent::Node(tag), &dirty_paths);
            }
        }
    }

    fn update_children_geometry(&mut self, parent: Parent, dirty_paths: &BTreeSet<u32>) {
        let count = self.mounted.children(parent).len();
        for index in 0..count {
            let tag = self.mounted.children(parent)[index];
            if self.update_node_geometry(tag, dirty_paths) {
                self.update_children_geometry(Parent::Node(tag), dirty_paths);
            }
        }
    }

    /// Returns whether the node's children must be compared too.
    fn update_node_geometry(&mut self, tag: u32, dirty_paths: &BTreeSet<u32>) -> bool {
        // A node that just became (or stopped being) a scroll container gets (or loses) its scroll
        // item before anything is placed under it.
        self.sync_scroll_container(tag);
        let node = self
            .mounted
            .nodes
            .get_mut(&tag)
            .expect("a child list names mounted nodes");
        let layout = self
            .tree
            .layout(node.layout)
            .expect("a mounted node has a layout node");
        let geometry = NodeGeometry {
            location: Vector2::new(layout.location.x, layout.location.y),
            size: Vector2::new(layout.size.width, layout.size.height),
            border: Edges {
                left: layout.border.left,
                top: layout.border.top,
                right: layout.border.right,
                bottom: layout.border.bottom,
            },
            padding: Edges {
                left: layout.padding.left,
                top: layout.padding.top,
                right: layout.padding.right,
                bottom: layout.padding.bottom,
            },
            scroll_ranges: node.scroll_ranges_of(layout),
            laid_out: true,
        };
        let previous = node.geometry;
        let on_dirty_path = dirty_paths.contains(&tag);
        if geometry == previous {
            return on_dirty_path;
        }
        node.geometry = geometry;
        self.hit_stale = true;
        self.effects.note_changed(tag);
        node.render.set_location(geometry.location);
        let shape_changed = !previous.laid_out
            || previous.size != geometry.size
            || previous.border != geometry.border
            || previous.padding != geometry.padding;
        if shape_changed {
            // Percentages in a transform, and its origin, are of the border box.
            self.refresh_transform(tag);
            self.paint_dirty.insert(tag);
            // A text input's lines are wrapped to its box: new lines, new text elements.
            self.discard_text_accessibility(tag);
            self.note_text_input_box_changed(tag);
        }
        if shape_changed || previous.scroll_ranges != geometry.scroll_ranges {
            // The client area or the content's reach changed: the offset may no longer be reachable,
            // and the scrollbars' proportions changed.
            self.settle_scroll(tag);
            // An axis that can no longer move has no scroll bar element any more.
            self.prune_scroll_bar_elements(tag);
        }
        shape_changed || on_dirty_path
    }

    pub(crate) fn viewport_box(&self) -> BoxRect {
        BoxRect {
            x: 0.0,
            y: 0.0,
            width: self.viewport_size.x,
            height: self.viewport_size.y,
        }
    }
}
