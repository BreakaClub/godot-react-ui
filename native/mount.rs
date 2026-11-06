//! The mounting layer: the mounted tree keyed by tag, the application of a commit's
//! [`MountingTransaction`], incremental geometry and hit testing (plan section 3.7).
//!
//! `Mounted` is the one owner of per-tag state: props, computed style, layout handle, paint
//! resources, canvas items and geometry. It replaces v1's `Model`, `handles`, `visuals`, `rects`,
//! `clips`, `content_clips`, `paint_order`, `opacities` and `items`. A commit costs what it
//! changed: nothing here walks the whole tree except the named exceptions (Tab order, snapshots).

use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::time::Instant;

use godot::classes::{StyleBoxFlat, TextParagraph};
use godot::prelude::*;
use taffy::prelude::NodeId;

use crate::commit::{self, CommitPayload, LAYER_COUNT, MountedTree, ValidatedCommit};
use crate::computed_style::{
    BreakpointIndex, ComputedStyle, InteractionState, PseudoStates, StyleChange, StyleInputs,
    StyleTree, chain, restyle, states_used,
};
use crate::diff::{Insertion, MountingTransaction, Parent, Removal};
use crate::geometry::{BoxRect, intersect_clip, intersects};
use crate::pointer::ButtonTree;
use crate::profile::{Sample, micros};
use crate::props::{CursorSpec, Kind, PropsSpec};
use crate::render_tree::RenderNode;
use crate::{CORNER_DETAIL, ReactUiRoot};

/// The four sides of a box edge, as Taffy resolves them.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct Edges {
    pub(crate) left: f32,
    pub(crate) top: f32,
    pub(crate) right: f32,
    pub(crate) bottom: f32,
}

/// Where Taffy put a node, relative to its parent, and the edges that position its content.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct NodeGeometry {
    pub(crate) location: Vector2,
    pub(crate) size: Vector2,
    pub(crate) border: Edges,
    pub(crate) padding: Edges,
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
    pub(crate) paragraph: Option<Gd<TextParagraph>>,
    /// Changes whenever `paragraph` is rebuilt, so the content item knows to re-record.
    pub(crate) generation: u64,
}

impl Visual {
    pub(crate) fn new() -> Self {
        let mut background = StyleBoxFlat::new_gd();
        background.set_corner_detail(CORNER_DETAIL);
        Self {
            background,
            paragraph: None,
            generation: 0,
        }
    }
}

pub(crate) struct MountedNode {
    pub(crate) kind: Kind,
    pub(crate) layer: usize,
    pub(crate) props: PropsSpec,
    pub(crate) parent: Option<Parent>,
    pub(crate) children: Vec<u32>,
    pub(crate) computed: ComputedStyle,
    pub(crate) layout: NodeId,
    pub(crate) visual: Visual,
    pub(crate) render: RenderNode,
    pub(crate) geometry: NodeGeometry,
    /// The pseudo-states this node's style layers condition on.
    pub(crate) uses_states: PseudoStates,
}

#[derive(Default)]
pub(crate) struct Mounted {
    pub(crate) nodes: HashMap<u32, MountedNode>,
    /// Each layer's top-level children, in order.
    pub(crate) roots: [Vec<u32>; LAYER_COUNT],
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

    /// The root-local rectangle of `tag` and the clip its ancestors impose on it, or `None` if it
    /// is not mounted. Both are computed by walking up the parents: cost proportional to depth.
    pub(crate) fn absolute_geometry(
        &self,
        tag: u32,
        viewport: BoxRect,
    ) -> Option<(BoxRect, Option<BoxRect>)> {
        let mut path = self.path_of(tag);
        if path.is_empty() {
            return None;
        }
        path.reverse();
        let mut origin = Vector2::ZERO;
        let mut clip = Some(viewport);
        for (position, current) in path.iter().enumerate() {
            let node = &self.nodes[current];
            origin += node.geometry.location;
            if position + 1 == path.len() {
                let rect = BoxRect {
                    x: origin.x,
                    y: origin.y,
                    width: node.geometry.size.x,
                    height: node.geometry.size.y,
                };
                return Some((rect, clip));
            }
            if node.clips_content() {
                let local = node.geometry.padding_box();
                clip = intersect_clip(
                    clip,
                    Some(BoxRect {
                        x: origin.x + local.x,
                        y: origin.y + local.y,
                        width: local.width,
                        height: local.height,
                    }),
                );
            }
        }
        None
    }

    /// Whether `tag` has a visible area an event could reach.
    pub(crate) fn visible_for_input(&self, tag: u32, viewport: BoxRect) -> bool {
        self.absolute_geometry(tag, viewport)
            .is_some_and(|(rect, clip)| {
                rect.width > 0.0
                    && rect.height > 0.0
                    && clip.is_none_or(|clip| intersects(rect, clip))
            })
    }

    /// The topmost element at `point` (root-local), descending the hierarchy in reverse paint
    /// order. A clipping element only hands the point to its children inside its padding box. An
    /// element with `pointer-events: none` is never the answer, but its children still can be
    /// (CSS semantics, plan 3.7).
    pub(crate) fn hit_test(&self, point: Vector2) -> Option<u32> {
        for layer in (0..LAYER_COUNT).rev() {
            for tag in self.roots[layer].iter().rev() {
                if let Some(hit) = self.hit_node(*tag, point) {
                    return Some(hit);
                }
            }
        }
        None
    }

    fn hit_node(&self, tag: u32, point_in_parent: Vector2) -> Option<u32> {
        let node = self.nodes.get(&tag)?;
        let local = point_in_parent - node.geometry.location;
        let descend = !node.clips_content() || node.geometry.padding_box().contains(local);
        if descend {
            for child in node.children.iter().rev() {
                if let Some(hit) = self.hit_node(*child, local) {
                    return Some(hit);
                }
            }
        }
        let border_box = BoxRect {
            x: 0.0,
            y: 0.0,
            width: node.geometry.size.x,
            height: node.geometry.size.y,
        };
        (node.computed.is_pointer_target() && border_box.contains(local)).then_some(tag)
    }

    /// The cursor to show at `point`: the computed `cursor` of the element a pointer there would
    /// reach, or `default` over nothing.
    pub(crate) fn cursor_at(&self, point: Vector2) -> CursorSpec {
        self.hit_test(point)
            .and_then(|tag| self.nodes.get(&tag))
            .map_or(CursorSpec::Default, |node| {
                node.computed.cursor_or_default()
            })
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
    /// Whether this element clips its children to its padding box.
    pub(crate) fn clips_content(&self) -> bool {
        use crate::props::OverflowSpec::Hidden;
        self.computed.overflow_x == Some(Hidden) || self.computed.overflow_y == Some(Hidden)
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
        self.refresh_interaction();
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
        let changes = restyle(&mut overlay, dirty, self.viewport_size.x);
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
        }
        self.hit_stale = true;
        if let Parent::Node(parent) = removal.parent {
            self.layout_dirty.insert(parent);
        }
    }

    fn insert_child(&mut self, insertion: &Insertion) {
        let (parent_layout, parent_item) = match insertion.parent {
            Parent::Layer(layer) => (self.layer_roots[layer], self.layer_item(layer)),
            Parent::Node(parent) => {
                let parent = &self.mounted.nodes[&parent];
                (parent.layout, parent.render.content_item)
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
        child.render.attach(parent_item);
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
            computed: ComputedStyle::default(),
            layout,
            visual: Visual::new(),
            render: RenderNode::new(),
            geometry: NodeGeometry::default(),
            uses_states: states_used(props.style.as_ref()),
        };
        self.mounted.breakpoints.register(tag, props.style.as_ref());
        self.mounted
            .index_test_id(tag, None, props.test_id.as_deref());
        self.mounted.used.insert(tag);
        self.mounted.nodes.insert(tag, node);
        self.style_engine.insert(tag);
        self.layout_dirty.insert(tag);
        self.paint_dirty.insert(tag);
        if props.text.is_some() {
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
        self.layout_dirty.remove(&tag);
        self.paint_dirty.remove(&tag);
        self.hit_stale = true;
        // Nothing may keep pointing at a deleted element; JS drops events for tags it no longer has.
        if self.hovered == Some(tag) {
            self.hovered = None;
        }
        if self.pressed == Some(tag) {
            self.pressed = None;
        }
        if self.focused == Some(tag) {
            self.focused = None;
        }
        self.pending_style_removals.push(tag);
        self.deletions.push(tag);
        // `node.render` drops here and frees the canvas items.
    }

    /// After the transaction: sibling order in the render tree and the style engine's tree.
    fn settle_structure(&mut self, touched: &BTreeSet<Parent>) {
        for parent in touched {
            let children: Vec<u32> = match parent {
                Parent::Layer(layer) => self.mounted.roots[*layer].clone(),
                Parent::Node(tag) => match self.mounted.nodes.get(tag) {
                    Some(node) => node.children.clone(),
                    None => continue,
                },
            };
            for (index, child) in children.iter().enumerate() {
                if let Some(node) = self.mounted.nodes.get_mut(child) {
                    node.render.set_draw_index(
                        i32::try_from(index).expect("a child list fits an i32 draw index"),
                    );
                }
            }
            self.style_engine.set_children(*parent, &children);
        }
        for tag in std::mem::take(&mut self.pending_style_removals) {
            self.style_engine.remove(tag);
        }
    }

    /// Rebuild a node's text paragraph from its props and computed style. Returns whether the text
    /// or its shaping changed (and so layout and paint are dirty).
    pub(crate) fn refresh_paragraph(&mut self, tag: u32) -> bool {
        let Some(font) = self.font.clone() else {
            return false;
        };
        let Some(node) = self.mounted.nodes.get_mut(&tag) else {
            return false;
        };
        let text = node.props.text.as_deref().unwrap_or("");
        let paragraph = crate::paint::build_paragraph(&font, text, &node.computed);
        let had = node.visual.paragraph.is_some();
        node.visual.paragraph = paragraph;
        self.paragraph_generation += 1;
        node.visual.generation = self.paragraph_generation;
        let context = node
            .visual
            .paragraph
            .clone()
            .map(|paragraph| crate::TextContext { paragraph });
        let has = context.is_some();
        self.tree
            .set_node_context(node.layout, context)
            .expect("a mounted node has a layout node");
        self.layout_dirty.insert(tag);
        self.paint_dirty.insert(tag);
        self.content_generation += 1;
        had || has
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
            laid_out: true,
        };
        let previous = node.geometry;
        let on_dirty_path = dirty_paths.contains(&tag);
        if geometry == previous {
            return on_dirty_path;
        }
        node.geometry = geometry;
        self.hit_stale = true;
        node.render.set_location(geometry.location);
        let shape_changed = !previous.laid_out
            || previous.size != geometry.size
            || previous.border != geometry.border
            || previous.padding != geometry.padding;
        if shape_changed {
            self.paint_dirty.insert(tag);
        }
        shape_changed || on_dirty_path
    }

    /// Document-order list of the tabbable buttons that are visible.
    pub(crate) fn visible_enabled_buttons(&self) -> Vec<u32> {
        let viewport = self.viewport_box();
        self.mounted
            .document_order()
            .into_iter()
            .filter(|tag| {
                self.mounted.kind_of(*tag) == Some(Kind::Button)
                    && !self.mounted.is_disabled(*tag)
                    && self.mounted.visible_for_input(*tag, viewport)
            })
            .collect()
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
