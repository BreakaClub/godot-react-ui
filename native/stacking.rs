//! Paint parents, paint order, hit testing and absolute geometry over them (plan sections 3.8 and
//! 3.15). Nothing here touches Godot's engine: the mounting layer implements the two traits over its
//! mounted nodes and the tests over a plain structure.
//!
//! The tree React describes (the *tree*) decides events, inheritance, Tab order and layout. What is
//! drawn and hit is the *paint tree*, which differs from it only for out-of-flow elements:
//!
//! - `static` and `relative` elements are painted by their parent;
//! - `absolute` elements by their containing block, the nearest positioned ancestor, else the
//!   layer's root;
//! - `fixed` elements by the layer's root.
//!
//! An element's geometry (`location`, in its paint parent's frame) is what Taffy reports: for an
//! absolute element Taffy locates it in its containing block's border box, which is exactly the frame
//! of its paint parent (the test `an_absolute_grandchild_is_located_in_its_containing_block_not_its_parent`
//! in `props.rs` records this). So a clip or a scroll offset on an element in between does not apply
//! to an element that is not painted under it, which is CSS's rule.
//!
//! Siblings of one paint parent are painted in ascending (`zIndex`, document order), where `zIndex`
//! defaults to 0 and applies to every element, as in React Native.

use std::collections::BTreeSet;

use godot::prelude::Vector2;

use crate::diff::Parent;
use crate::geometry::{BoxRect, intersect_clip};
use crate::props::PositionSpec;

/// What the stacking rules read from one element's computed style.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Stacking {
    pub(crate) position: PositionSpec,
    pub(crate) z_index: i32,
}

/// The React tree and the styles that decide where each element is painted.
pub(crate) trait StackingTree {
    /// The tree parent of `tag`, or `None` for an element that is not attached.
    fn tree_parent(&self, tag: u32) -> Option<Parent>;
    fn tree_children(&self, parent: Parent) -> &[u32];
    fn stacking(&self, tag: u32) -> Option<Stacking>;
}

/// The layer `tag` belongs to.
fn layer_of<T: StackingTree>(tree: &T, tag: u32) -> Option<usize> {
    let mut parent = tree.tree_parent(tag)?;
    loop {
        match parent {
            Parent::Layer(layer) => return Some(layer),
            Parent::Node(node) => parent = tree.tree_parent(node)?,
        }
    }
}

/// Who paints `tag`: its parent unless it is out of flow (see the module docs). `None` if `tag` is not
/// attached to a layer.
pub(crate) fn paint_parent<T: StackingTree>(tree: &T, tag: u32) -> Option<Parent> {
    let parent = tree.tree_parent(tag)?;
    match tree.stacking(tag)?.position {
        PositionSpec::Static | PositionSpec::Relative => Some(parent),
        PositionSpec::Fixed => Some(Parent::Layer(layer_of(tree, tag)?)),
        PositionSpec::Absolute => {
            let mut current = parent;
            loop {
                match current {
                    Parent::Layer(_) => return Some(current),
                    Parent::Node(node) => {
                        if tree.stacking(node)?.position.is_positioned() {
                            return Some(current);
                        }
                        current = tree.tree_parent(node)?;
                    }
                }
            }
        }
    }
}

/// Where `tag` stands in document order (pre-order of the tree): its child index at every level, from
/// the layer's top-level list down. Two elements compare as their keys do.
fn document_key<T: StackingTree>(tree: &T, tag: u32) -> Vec<usize> {
    let mut key = Vec::new();
    let mut current = tag;
    while let Some(parent) = tree.tree_parent(current) {
        let index = tree
            .tree_children(parent)
            .iter()
            .position(|sibling| *sibling == current)
            .expect("an attached element is in its parent's child list");
        key.push(index);
        match parent {
            Parent::Layer(_) => break,
            Parent::Node(node) => current = node,
        }
    }
    key.reverse();
    key
}

/// The elements `parent` paints, back to front: the tree children it paints plus the out-of-flow
/// elements (`out_of_flow`, every element whose position is `absolute` or `fixed`) whose containing
/// block it is, in ascending (`zIndex`, document order).
pub(crate) fn painted_by<T: StackingTree>(
    tree: &T,
    parent: Parent,
    out_of_flow: &BTreeSet<u32>,
) -> Vec<u32> {
    let mut candidates: Vec<u32> = tree
        .tree_children(parent)
        .iter()
        .copied()
        .filter(|tag| paint_parent(tree, *tag) == Some(parent))
        .collect();
    let in_tree = candidates.len();
    for tag in out_of_flow {
        if tree.tree_parent(*tag) != Some(parent) && paint_parent(tree, *tag) == Some(parent) {
            candidates.push(*tag);
        }
    }
    let z = |tag: u32| tree.stacking(tag).map_or(0, |stacking| stacking.z_index);
    if candidates.len() == in_tree {
        // Children of one parent are already in document order, and the sort is stable.
        candidates.sort_by_key(|tag| z(*tag));
    } else {
        let mut keyed: Vec<(i32, Vec<usize>, u32)> = candidates
            .into_iter()
            .map(|tag| (z(tag), document_key(tree, tag), tag))
            .collect();
        keyed.sort();
        candidates = keyed.into_iter().map(|(_, _, tag)| tag).collect();
    }
    candidates
}

/// What hit testing and geometry read about one element, in the frame of its paint parent.
#[derive(Clone, Copy)]
pub(crate) struct Frame {
    pub(crate) location: Vector2,
    pub(crate) size: Vector2,
    /// Where the element clips its paint children, in its own coordinates, if it clips.
    pub(crate) clip: Option<BoxRect>,
    /// Whether the element itself can be the target of a pointer.
    pub(crate) pointer_target: bool,
}

/// The paint tree and the geometry of its elements.
pub(crate) trait PaintTree {
    fn layer_count(&self) -> usize;
    fn paint_roots(&self, layer: usize) -> &[u32];
    fn paint_children(&self, tag: u32) -> &[u32];
    fn paint_parent(&self, tag: u32) -> Option<Parent>;
    fn frame(&self, tag: u32) -> Option<Frame>;
}

/// The topmost element at `point` (root-local), descending the paint tree in reverse paint order,
/// the overlay layer before the main one. A clipping element only hands the point to its paint
/// children inside its clip. An element with `pointer-events: none` is never the answer, but its
/// paint children still can be (CSS semantics).
pub(crate) fn hit_test<T: PaintTree>(tree: &T, point: Vector2) -> Option<u32> {
    for layer in (0..tree.layer_count()).rev() {
        for tag in tree.paint_roots(layer).iter().rev() {
            if let Some(hit) = hit_node(tree, *tag, point) {
                return Some(hit);
            }
        }
    }
    None
}

fn hit_node<T: PaintTree>(tree: &T, tag: u32, point_in_parent: Vector2) -> Option<u32> {
    let frame = tree.frame(tag)?;
    let local = point_in_parent - frame.location;
    if frame.clip.is_none_or(|clip| clip.contains(local)) {
        for child in tree.paint_children(tag).iter().rev() {
            if let Some(hit) = hit_node(tree, *child, local) {
                return Some(hit);
            }
        }
    }
    let border_box = BoxRect {
        x: 0.0,
        y: 0.0,
        width: frame.size.x,
        height: frame.size.y,
    };
    (frame.pointer_target && border_box.contains(local)).then_some(tag)
}

/// The root-local rectangle of `tag` and the clip its paint ancestors impose on it (starting from
/// `viewport`), or `None` if `tag` is not attached. Cost proportional to depth.
pub(crate) fn absolute_geometry<T: PaintTree>(
    tree: &T,
    tag: u32,
    viewport: BoxRect,
) -> Option<(BoxRect, Option<BoxRect>)> {
    let mut path = vec![tag];
    loop {
        match tree.paint_parent(*path.last()?)? {
            Parent::Layer(_) => break,
            Parent::Node(parent) => path.push(parent),
        }
    }
    path.reverse();
    let mut origin = Vector2::ZERO;
    let mut clip = Some(viewport);
    for (position, current) in path.iter().enumerate() {
        let frame = tree.frame(*current)?;
        origin += frame.location;
        if position + 1 == path.len() {
            let rect = BoxRect {
                x: origin.x,
                y: origin.y,
                width: frame.size.x,
                height: frame.size.y,
            };
            return Some((rect, clip));
        }
        if let Some(local) = frame.clip {
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

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;

    const LAYERS: usize = 2;
    const MAIN: usize = 0;
    const OVERLAY: usize = 1;
    const VIEWPORT: BoxRect = BoxRect {
        x: 0.0,
        y: 0.0,
        width: 500.0,
        height: 500.0,
    };

    struct TestNode {
        stacking: Stacking,
        clips: bool,
        pointer_target: bool,
        location: Vector2,
        size: Vector2,
        parent: Option<Parent>,
        children: Vec<u32>,
        paint_parent: Option<Parent>,
        paint_children: Vec<u32>,
    }

    /// A tree built the way React would, then settled the way the mounting layer settles it.
    struct TestTree {
        nodes: BTreeMap<u32, TestNode>,
        roots: [Vec<u32>; LAYERS],
        paint_roots: [Vec<u32>; LAYERS],
    }

    impl TestTree {
        fn new() -> Self {
            Self {
                nodes: BTreeMap::new(),
                roots: [Vec::new(), Vec::new()],
                paint_roots: [Vec::new(), Vec::new()],
            }
        }

        /// `location` is in the frame of the element's paint parent, as Taffy reports it.
        fn add(
            &mut self,
            parent: Parent,
            tag: u32,
            position: PositionSpec,
            at: (f32, f32),
            size: (f32, f32),
        ) {
            self.nodes.insert(
                tag,
                TestNode {
                    stacking: Stacking {
                        position,
                        z_index: 0,
                    },
                    clips: false,
                    pointer_target: true,
                    location: Vector2::new(at.0, at.1),
                    size: Vector2::new(size.0, size.1),
                    parent: Some(parent),
                    children: Vec::new(),
                    paint_parent: None,
                    paint_children: Vec::new(),
                },
            );
            match parent {
                Parent::Layer(layer) => self.roots[layer].push(tag),
                Parent::Node(node) => self.nodes.get_mut(&node).unwrap().children.push(tag),
            }
        }

        fn clip(&mut self, tag: u32) {
            self.nodes.get_mut(&tag).unwrap().clips = true;
        }

        fn z(&mut self, tag: u32, z_index: i32) {
            self.nodes.get_mut(&tag).unwrap().stacking.z_index = z_index;
        }

        fn out_of_flow(&self) -> BTreeSet<u32> {
            self.nodes
                .iter()
                .filter(|(_, node)| node.stacking.position.is_out_of_flow())
                .map(|(tag, _)| *tag)
                .collect()
        }

        /// What `Mounted::settle_paint_structure` does for the elements that changed, done for all.
        fn settle(&mut self) {
            let out_of_flow = self.out_of_flow();
            let tags: Vec<u32> = self.nodes.keys().copied().collect();
            let parents: Vec<(u32, Option<Parent>)> = tags
                .iter()
                .map(|tag| (*tag, paint_parent(&*self, *tag)))
                .collect();
            for (tag, parent) in parents {
                self.nodes.get_mut(&tag).unwrap().paint_parent = parent;
            }
            let mut owners: Vec<Parent> = (0..LAYERS).map(Parent::Layer).collect();
            owners.extend(tags.iter().map(|tag| Parent::Node(*tag)));
            for owner in owners {
                let list = painted_by(&*self, owner, &out_of_flow);
                match owner {
                    Parent::Layer(layer) => self.paint_roots[layer] = list,
                    Parent::Node(tag) => self.nodes.get_mut(&tag).unwrap().paint_children = list,
                }
            }
        }

        fn hit(&self, x: f32, y: f32) -> Option<u32> {
            hit_test(self, Vector2::new(x, y))
        }
    }

    impl StackingTree for TestTree {
        fn tree_parent(&self, tag: u32) -> Option<Parent> {
            self.nodes.get(&tag)?.parent
        }

        fn tree_children(&self, parent: Parent) -> &[u32] {
            match parent {
                Parent::Layer(layer) => &self.roots[layer],
                Parent::Node(tag) => &self.nodes[&tag].children,
            }
        }

        fn stacking(&self, tag: u32) -> Option<Stacking> {
            self.nodes.get(&tag).map(|node| node.stacking)
        }
    }

    impl PaintTree for TestTree {
        fn layer_count(&self) -> usize {
            LAYERS
        }

        fn paint_roots(&self, layer: usize) -> &[u32] {
            &self.paint_roots[layer]
        }

        fn paint_children(&self, tag: u32) -> &[u32] {
            &self.nodes[&tag].paint_children
        }

        fn paint_parent(&self, tag: u32) -> Option<Parent> {
            self.nodes.get(&tag)?.paint_parent
        }

        fn frame(&self, tag: u32) -> Option<Frame> {
            let node = self.nodes.get(&tag)?;
            Some(Frame {
                location: node.location,
                size: node.size,
                clip: node.clips.then_some(BoxRect {
                    x: 0.0,
                    y: 0.0,
                    width: node.size.x,
                    height: node.size.y,
                }),
                pointer_target: node.pointer_target,
            })
        }
    }

    use PositionSpec::{Absolute, Fixed, Relative, Static};

    const TOP: Parent = Parent::Layer(MAIN);

    #[test]
    fn an_absolute_element_is_painted_by_its_nearest_positioned_ancestor() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Relative, (0.0, 0.0), (200.0, 200.0));
        tree.add(Parent::Node(1), 2, Static, (50.0, 50.0), (50.0, 50.0));
        tree.add(Parent::Node(2), 3, Absolute, (120.0, 120.0), (40.0, 40.0));
        tree.add(Parent::Node(2), 4, Relative, (0.0, 0.0), (10.0, 10.0));
        tree.add(Parent::Node(4), 5, Absolute, (1.0, 1.0), (5.0, 5.0));
        tree.add(TOP, 6, Static, (300.0, 0.0), (50.0, 50.0));
        tree.add(Parent::Node(6), 7, Absolute, (1.0, 1.0), (5.0, 5.0));
        tree.add(Parent::Node(6), 8, Fixed, (2.0, 2.0), (5.0, 5.0));
        tree.settle();
        assert_eq!(
            tree.nodes[&3].paint_parent,
            Some(Parent::Node(1)),
            "past a static parent"
        );
        assert_eq!(
            tree.nodes[&5].paint_parent,
            Some(Parent::Node(4)),
            "a relative parent is one"
        );
        assert_eq!(
            tree.nodes[&7].paint_parent,
            Some(TOP),
            "no positioned ancestor: the layer root"
        );
        assert_eq!(
            tree.nodes[&8].paint_parent,
            Some(TOP),
            "fixed: the layer root"
        );
        assert_eq!(
            tree.nodes[&2].paint_parent,
            Some(Parent::Node(1)),
            "in flow: the parent"
        );
        // A tree child that someone else paints is not among its tree parent's paint children.
        assert_eq!(tree.nodes[&2].paint_children, vec![4]);
        assert_eq!(tree.nodes[&1].paint_children, vec![2, 3]);
        assert_eq!(tree.paint_roots[MAIN], vec![1, 6, 7, 8]);
    }

    #[test]
    fn absolute_escapes_an_overflow_hidden_parent_whose_containing_block_is_outside_it() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Relative, (0.0, 0.0), (300.0, 300.0));
        tree.add(Parent::Node(1), 2, Static, (50.0, 50.0), (50.0, 50.0));
        tree.clip(2);
        // Located in the relative grandparent (the containing block) and nowhere near the hidden parent.
        tree.add(Parent::Node(2), 3, Absolute, (120.0, 120.0), (40.0, 40.0));
        tree.settle();
        assert_eq!(
            tree.hit(130.0, 130.0),
            Some(3),
            "not clipped by its hidden parent"
        );
        let (rect, clip) = absolute_geometry(&tree, 3, VIEWPORT).unwrap();
        assert_eq!(
            (rect.x, rect.y, rect.width, rect.height),
            (120.0, 120.0, 40.0, 40.0)
        );
        let clip = clip.unwrap();
        assert_eq!(
            (clip.x, clip.y, clip.width, clip.height),
            (0.0, 0.0, 500.0, 500.0),
            "only the viewport clips it"
        );
        // The hidden parent still clips what it paints.
        tree.add(Parent::Node(2), 4, Relative, (30.0, 30.0), (50.0, 50.0));
        tree.settle();
        assert_eq!(tree.hit(50.0 + 40.0, 50.0 + 40.0), Some(4));
        assert_eq!(
            tree.hit(50.0 + 60.0, 50.0 + 60.0),
            Some(1),
            "outside the hidden parent's box: its paint child is clipped"
        );
    }

    #[test]
    fn absolute_inside_a_relative_overflow_hidden_parent_is_clipped() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Relative, (10.0, 10.0), (100.0, 100.0));
        tree.clip(1);
        tree.add(Parent::Node(1), 2, Absolute, (80.0, 80.0), (60.0, 60.0));
        tree.settle();
        assert_eq!(tree.nodes[&2].paint_parent, Some(Parent::Node(1)));
        assert_eq!(
            tree.hit(10.0 + 90.0, 10.0 + 90.0),
            Some(2),
            "inside the parent's box"
        );
        assert_eq!(
            tree.hit(10.0 + 120.0, 10.0 + 120.0),
            None,
            "the part outside the parent is clipped"
        );
        let (_, clip) = absolute_geometry(&tree, 2, VIEWPORT).unwrap();
        let clip = clip.unwrap();
        assert_eq!(
            (clip.x, clip.y, clip.width, clip.height),
            (10.0, 10.0, 100.0, 100.0)
        );
    }

    #[test]
    fn fixed_is_never_clipped_by_ancestors() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Relative, (10.0, 10.0), (50.0, 50.0));
        tree.clip(1);
        tree.add(Parent::Node(1), 2, Static, (0.0, 0.0), (50.0, 50.0));
        tree.clip(2);
        // Located in the layer root: far outside both clipping ancestors.
        tree.add(Parent::Node(2), 3, Fixed, (300.0, 300.0), (40.0, 40.0));
        tree.settle();
        assert_eq!(tree.hit(310.0, 310.0), Some(3));
        let (rect, clip) = absolute_geometry(&tree, 3, VIEWPORT).unwrap();
        assert_eq!((rect.x, rect.y), (300.0, 300.0));
        let clip = clip.unwrap();
        assert_eq!(
            (clip.x, clip.y, clip.width, clip.height),
            (0.0, 0.0, 500.0, 500.0)
        );
    }

    #[test]
    fn siblings_are_painted_by_z_index_then_document_order() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Relative, (0.0, 0.0), (100.0, 100.0));
        for (tag, z) in [(2, 0), (3, 5), (4, -1), (5, 5), (6, 0)] {
            tree.add(Parent::Node(1), tag, Static, (0.0, 0.0), (10.0, 10.0));
            tree.z(tag, z);
        }
        tree.settle();
        assert_eq!(tree.nodes[&1].paint_children, vec![4, 2, 6, 3, 5]);
        // The topmost sibling is hit first.
        assert_eq!(tree.hit(5.0, 5.0), Some(5));
        tree.z(5, -9);
        tree.settle();
        assert_eq!(tree.nodes[&1].paint_children, vec![5, 4, 2, 6, 3]);
        assert_eq!(tree.hit(5.0, 5.0), Some(3));
    }

    #[test]
    fn an_absolute_descendant_takes_its_place_among_the_containing_blocks_children_by_document_order()
     {
        let mut tree = TestTree::new();
        // P (relative) children: a, b (with an absolute child x), c. Document order: a, b, x, c.
        tree.add(TOP, 1, Relative, (0.0, 0.0), (100.0, 100.0));
        tree.add(Parent::Node(1), 2, Static, (0.0, 0.0), (10.0, 10.0));
        tree.add(Parent::Node(1), 3, Static, (0.0, 0.0), (10.0, 10.0));
        tree.add(Parent::Node(3), 4, Absolute, (0.0, 0.0), (10.0, 10.0));
        tree.add(Parent::Node(1), 5, Static, (0.0, 0.0), (10.0, 10.0));
        tree.settle();
        assert_eq!(tree.nodes[&1].paint_children, vec![2, 3, 4, 5]);
        // zIndex only reorders among the elements one parent paints: a negative one goes behind them all,
        // and a positive one in front, wherever in the tree the element is.
        tree.z(4, -1);
        tree.settle();
        assert_eq!(tree.nodes[&1].paint_children, vec![4, 2, 3, 5]);
        tree.z(4, 2);
        tree.settle();
        assert_eq!(tree.nodes[&1].paint_children, vec![2, 3, 5, 4]);
        // Its tree parent no longer paints it.
        assert!(tree.nodes[&3].paint_children.is_empty());
    }

    #[test]
    fn the_overlay_layer_is_above_the_main_layer() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (0.0, 0.0), (100.0, 100.0));
        tree.add(
            Parent::Layer(OVERLAY),
            2,
            Absolute,
            (50.0, 50.0),
            (100.0, 100.0),
        );
        tree.settle();
        assert_eq!(
            tree.hit(60.0, 60.0),
            Some(2),
            "the overlay covers the main layer"
        );
        assert_eq!(
            tree.hit(10.0, 10.0),
            Some(1),
            "and leaves the rest of it reachable"
        );
        assert_eq!(tree.hit(140.0, 140.0), Some(2));
        assert_eq!(tree.hit(400.0, 400.0), None);
        // An overlay element that takes no pointers lets them through to the main layer.
        tree.nodes.get_mut(&2).unwrap().pointer_target = false;
        assert_eq!(tree.hit(60.0, 60.0), Some(1));
        // The layers are ordered first: an overlay element is above every main one, whatever their zIndex.
        tree.nodes.get_mut(&2).unwrap().pointer_target = true;
        tree.z(1, 100);
        tree.settle();
        assert_eq!(tree.hit(60.0, 60.0), Some(2));
    }

    #[test]
    fn an_element_that_is_not_attached_has_no_paint_parent_or_geometry() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Relative, (0.0, 0.0), (10.0, 10.0));
        tree.add(Parent::Node(1), 2, Absolute, (0.0, 0.0), (10.0, 10.0));
        tree.nodes.get_mut(&2).unwrap().parent = None;
        tree.settle();
        assert_eq!(paint_parent(&tree, 2), None);
        assert!(absolute_geometry(&tree, 2, VIEWPORT).is_none());
        assert!(absolute_geometry(&tree, 99, VIEWPORT).is_none());
    }
}
