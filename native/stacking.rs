//! Paint parents, paint order, hit testing and absolute geometry over them. Nothing here touches Godot's engine: the mounting layer implements the two traits over its
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
//!
//! A transformed element (`transform.rs`) is drawn through its [`Placement`]: its local frame, the border box
//! corner at the origin, is mapped by the matrix (about the element's `transform-origin`) and then located.
//! Hit testing maps the point back through the inverse, so a rotated element is hit where it is drawn and a
//! singular matrix (`scale(0)`) is hit nowhere, with everything inside it. `absolute_geometry` reports the
//! bounding box of what is drawn, as `getBoundingClientRect()` does; [`absolute_affine`] reports the map itself
//! for what needs to turn a root-local point into one of the element's. Clips stay axis aligned (the
//! engine's `canvas_item_set_clip` takes the bounding box of the transformed rectangle), so an `overflow`
//! clip under a rotation is the bounding box of the rotated clip rectangle here as in the drawing; hit testing
//! is exact because it clips in the element's own frame.
//!
//! A scroll container shifts what it paints: its paint children are located in its frame less its
//! scroll offset (the `scroll` canvas item's transform). Because that follows the paint
//! parent, an absolute element scrolls with a positioned scroll container that is its containing
//! block, and does not scroll with one that is merely between the two (CSS's rule).

use std::collections::BTreeSet;

use godot::prelude::Vector2;

use crate::ROOT_TARGET;

use crate::diff::Parent;
use crate::filter_faults::{self as faults, Fault};
use crate::geometry::{BoxRect, intersect_clip, intersects};
use crate::props::PositionSpec;
use crate::transform::{Affine2, Placement};

/// What the stacking rules read from one element's computed style.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Stacking {
    pub(crate) position: PositionSpec,
    pub(crate) z_index: i32,
    /// The element has a `transform`: like a positioned element it is the containing block of the absolute
    /// elements below it, and unlike one it is also the containing block of the fixed ones.
    pub(crate) transformed: bool,
    /// Some ancestor is transformed, so a `fixed` element is positioned like an `absolute` one.
    pub(crate) inside_transform: bool,
}

impl Stacking {
    /// Whether the element is the containing block of the absolute elements below it.
    fn is_containing_block(&self) -> bool {
        self.position.is_positioned()
            || (self.transformed && !faults::active(Fault::TransformNoContainingBlock))
    }
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
    let stacking = tree.stacking(tag)?;
    match stacking.position {
        PositionSpec::Static | PositionSpec::Relative => Some(parent),
        PositionSpec::Fixed if !stacking.inside_transform => {
            Some(Parent::Layer(layer_of(tree, tag)?))
        }
        // A fixed element below a transform is positioned against the nearest containing block, as an absolute
        // one is (Taffy has no fixed positioning relative to anything but the root).
        PositionSpec::Absolute | PositionSpec::Fixed => {
            let mut current = parent;
            loop {
                match current {
                    Parent::Layer(_) => return Some(current),
                    Parent::Node(node) => {
                        if tree.stacking(node)?.is_containing_block() {
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

/// What hit testing and geometry read about a scroll container.
#[derive(Clone, Copy)]
pub(crate) struct ScrollFrame {
    /// How far the paint children are scrolled: their frame is the element's less this.
    pub(crate) offset: Vector2,
    /// The overlay scrollbar thumbs (horizontal, vertical) a pointer can grab, in the element's own
    /// coordinates and not scrolled. A thumb is drawn over the content, so it is hit before it.
    pub(crate) thumbs: [Option<BoxRect>; 2],
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
    /// Set for a scroll container.
    pub(crate) scroll: Option<ScrollFrame>,
    /// Set for an element with a transform that does something: where its local frame is drawn relative
    /// to `location`.
    pub(crate) placement: Option<Placement>,
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
    let mut local = point_in_parent - frame.location;
    if let Some(placement) = frame.placement {
        // A matrix with no inverse draws nothing, so nothing in it is hit.
        if !faults::active(Fault::TransformHitFlat) {
            local = placement.inverse?.apply(local);
        }
    }
    let scrolled = frame.scroll.map_or(Vector2::ZERO, |scroll| scroll.offset);
    if let Some(scroll) = frame.scroll
        && frame.pointer_target
        && scroll
            .thumbs
            .iter()
            .flatten()
            .any(|thumb| thumb.contains(local))
    {
        return Some(tag);
    }
    if frame.clip.is_none_or(|clip| clip.contains(local)) {
        for child in tree.paint_children(tag).iter().rev() {
            if let Some(hit) = hit_node(tree, *child, local + scrolled) {
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

/// Which position of an element in a scroll container [`absolute_geometry`] reports.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ScrollMode {
    /// Where the element is drawn: scrolled content has moved, and a scroll container clips it.
    Drawn,
    /// Where it would be if scrolling could bring it into view, for deciding whether input could ever
    /// reach it (Tab stops, keeping focus). Scroll offsets and scroll containers' clips, and the
    /// viewport's, are ignored from the outermost scroll container inwards, but that container must
    /// itself be on screen; clips below it still apply.
    Reachable,
}

/// The root-local rectangle `get_node_rect` (and so a handle's `getRect()`) reports for `tag`: `viewport` for the root itself
/// (`ROOT_TARGET`, which stands for the main layer's root and is no mounted node; the snapshot reports the same rectangle for
/// it), where a mounted node is drawn, and `None` for any other tag.
pub(crate) fn rect_of<T: PaintTree>(tree: &T, tag: u32, viewport: BoxRect) -> Option<BoxRect> {
    if tag == ROOT_TARGET {
        return Some(viewport);
    }
    absolute_geometry(tree, tag, viewport, ScrollMode::Drawn).map(|(rect, _)| rect)
}

/// Where a frame is in the root: while no element above has a transform it is a translation, and the
/// walk does only the additions it always did; the first placement turns it into an affine map.
#[derive(Clone, Copy)]
enum Chain {
    Translated(Vector2),
    Mapped(Affine2),
}

impl Chain {
    /// The frame of an element located at `location` in this frame, with its `placement`.
    fn enter(self, location: Vector2, placement: Option<Placement>) -> Chain {
        match (self, placement) {
            (Chain::Translated(origin), None) => Chain::Translated(origin + location),
            (parent, placement) => {
                let own = placement.map_or(Affine2::IDENTITY, |placement| placement.affine);
                Chain::Mapped(
                    own.then(&Affine2::translation(location))
                        .then(&parent.affine()),
                )
            }
        }
    }

    /// The frame its paint children are located in when the element is scrolled by `offset`.
    fn scrolled(self, offset: Vector2) -> Chain {
        match self {
            Chain::Translated(origin) => Chain::Translated(origin - offset),
            Chain::Mapped(affine) => Chain::Mapped(Affine2::translation(-offset).then(&affine)),
        }
    }

    fn affine(self) -> Affine2 {
        match self {
            Chain::Translated(origin) => Affine2::translation(origin),
            Chain::Mapped(affine) => affine,
        }
    }

    /// The root-local bounding box of `rect`, given in this frame.
    fn bounds_of(self, rect: BoxRect) -> BoxRect {
        match self {
            Chain::Translated(origin) => BoxRect {
                x: origin.x + rect.x,
                y: origin.y + rect.y,
                ..rect
            },
            Chain::Mapped(affine) => affine.bounds_of(rect),
        }
    }
}

/// Where `tag` is drawn: the map from its own frame (border box corner at the origin) to the root, its size,
/// and the clip its paint ancestors impose, or `None` if `tag` is not attached. Cost proportional to depth.
/// See [`ScrollMode`].
struct AbsoluteFrame {
    chain: Chain,
    /// The frame its paint parent's children are located in (the parent's border box, scrolled).
    parent: Chain,
    size: Vector2,
    clip: Option<BoxRect>,
}

fn absolute_frame<T: PaintTree>(
    tree: &T,
    tag: u32,
    viewport: BoxRect,
    mode: ScrollMode,
) -> Option<AbsoluteFrame> {
    let mut path = vec![tag];
    loop {
        match tree.paint_parent(*path.last()?)? {
            Parent::Layer(_) => break,
            Parent::Node(parent) => path.push(parent),
        }
    }
    path.reverse();
    let mut frame_of_parent = Chain::Translated(Vector2::ZERO);
    let mut clip = Some(viewport);
    for (position, current) in path.iter().enumerate() {
        let frame = tree.frame(*current)?;
        let own = frame_of_parent.enter(frame.location, frame.placement);
        if position + 1 == path.len() {
            return Some(AbsoluteFrame {
                chain: own,
                parent: frame_of_parent,
                size: frame.size,
                clip,
            });
        }
        let border_box = BoxRect {
            x: 0.0,
            y: 0.0,
            width: frame.size.x,
            height: frame.size.y,
        };
        if mode == ScrollMode::Reachable && frame.scroll.is_some() {
            // From here inwards scrolling decides what is in view. The container has to be in view
            // itself; an empty clip says it is not.
            let container = own.bounds_of(border_box);
            if clip.is_some_and(|clip| !intersects(container, clip)) {
                return Some(AbsoluteFrame {
                    chain: own,
                    parent: frame_of_parent,
                    size: frame.size,
                    clip: Some(NOWHERE),
                });
            }
            clip = None;
            frame_of_parent = own;
            continue;
        }
        if let Some(local) = frame.clip {
            clip = intersect_clip(clip, Some(own.bounds_of(local)));
        }
        frame_of_parent = match (mode, frame.scroll) {
            (ScrollMode::Drawn, Some(scroll)) => own.scrolled(scroll.offset),
            _ => own,
        };
    }
    None
}

/// The root-local rectangle of `tag` and the clip its paint ancestors impose on it (starting from
/// `viewport`), or `None` if `tag` is not attached. The rectangle is the bounding box of what is drawn:
/// a rotated element reports the box round it, as `getBoundingClientRect()` does. Cost proportional to
/// depth. See [`ScrollMode`].
pub(crate) fn absolute_geometry<T: PaintTree>(
    tree: &T,
    tag: u32,
    viewport: BoxRect,
    mode: ScrollMode,
) -> Option<(BoxRect, Option<BoxRect>)> {
    let found = absolute_frame(tree, tag, viewport, mode)?;
    let rect = found.chain.bounds_of(BoxRect {
        x: 0.0,
        y: 0.0,
        width: found.size.x,
        height: found.size.y,
    });
    Some((rect, found.clip))
}

/// The map from the frame `tag`'s paint parent locates its children in to the root: what an item that is a
/// sibling of `tag`'s (a filter's group) is in. `None` if `tag` is not attached.
pub(crate) fn absolute_parent_affine<T: PaintTree>(
    tree: &T,
    tag: u32,
    viewport: BoxRect,
) -> Option<Affine2> {
    absolute_frame(tree, tag, viewport, ScrollMode::Drawn).map(|found| found.parent.affine())
}

/// The map from `tag`'s own frame (the corner of its border box is the origin) to the root, where it is
/// drawn now, with its size: what a caller needs to turn a root-local point into one of the element's
/// (`inverse`), or one of the element's into the root's. `None` if `tag` is not attached.
pub(crate) fn absolute_affine<T: PaintTree>(
    tree: &T,
    tag: u32,
    viewport: BoxRect,
) -> Option<(Affine2, Vector2)> {
    let found = absolute_frame(tree, tag, viewport, ScrollMode::Drawn)?;
    Some((found.chain.affine(), found.size))
}

/// A clip nothing intersects.
const NOWHERE: BoxRect = BoxRect {
    x: 0.0,
    y: 0.0,
    width: 0.0,
    height: 0.0,
};

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
        scroll: Option<ScrollFrame>,
        placement: Option<Placement>,
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
                        transformed: false,
                        inside_transform: false,
                    },
                    clips: false,
                    pointer_target: true,
                    location: Vector2::new(at.0, at.1),
                    size: Vector2::new(size.0, size.1),
                    parent: Some(parent),
                    children: Vec::new(),
                    paint_parent: None,
                    paint_children: Vec::new(),
                    scroll: None,
                    placement: None,
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

        /// Make `tag` a scroll container (it clips) scrolled by `offset`, with the given thumbs.
        fn scrolls(&mut self, tag: u32, offset: (f32, f32), thumbs: [Option<BoxRect>; 2]) {
            self.clip(tag);
            self.nodes.get_mut(&tag).unwrap().scroll = Some(ScrollFrame {
                offset: Vector2::new(offset.0, offset.1),
                thumbs,
            });
        }

        fn z(&mut self, tag: u32, z_index: i32) {
            self.nodes.get_mut(&tag).unwrap().stacking.z_index = z_index;
        }

        /// Give `tag` the transform `css` (about the middle of its box), as the mounting layer evaluates it.
        fn transform(&mut self, tag: u32, css: &str) {
            let node = self.nodes.get_mut(&tag).unwrap();
            let list = crate::transform::TransformList::parse(css).unwrap();
            node.placement = crate::transform::evaluate(list.computed(), None, node.size)
                .unwrap()
                .placement
                .into();
            node.stacking.transformed = true;
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
                scroll: node.scroll,
                placement: node.placement,
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
        let (rect, clip) = absolute_geometry(&tree, 3, VIEWPORT, ScrollMode::Drawn).unwrap();
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
        let (_, clip) = absolute_geometry(&tree, 2, VIEWPORT, ScrollMode::Drawn).unwrap();
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
        let (rect, clip) = absolute_geometry(&tree, 3, VIEWPORT, ScrollMode::Drawn).unwrap();
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

    // --- transforms ---

    fn rect_of_drawn(tree: &TestTree, tag: u32) -> (f32, f32, f32, f32) {
        let (rect, _) = drawn(tree, tag);
        (rect.x, rect.y, rect.width, rect.height)
    }

    #[test]
    fn a_rotated_element_is_hit_where_it_is_drawn_and_its_bounding_box_corners_miss() {
        let mut tree = TestTree::new();
        // 200 x 40 at (100, 100), turned a quarter about its middle (200, 120): it now stands 40 wide and 200 tall.
        tree.add(TOP, 1, Static, (100.0, 100.0), (200.0, 40.0));
        tree.transform(1, "rotate(90deg)");
        tree.settle();
        let (x, y, width, height) = rect_of_drawn(&tree, 1);
        assert!(
            (x - 180.0).abs() < 1e-3 && (y - 20.0).abs() < 1e-3,
            "{x} {y}"
        );
        assert!((width - 40.0).abs() < 1e-3 && (height - 200.0).abs() < 1e-3);
        assert_eq!(tree.hit(200.0, 30.0), Some(1), "the turned top end");
        assert_eq!(tree.hit(200.0, 210.0), Some(1), "the turned bottom end");
        assert_eq!(
            tree.hit(120.0, 120.0),
            None,
            "where it was, it no longer is"
        );
        // 45 degrees: the box round a 200 x 40 bar is 170 square; its corners are empty.
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (100.0, 100.0), (200.0, 40.0));
        tree.transform(1, "rotate(45deg)");
        tree.settle();
        let (x, y, width, height) = rect_of_drawn(&tree, 1);
        assert!((width - 169.7056).abs() < 1e-2 && (height - 169.7056).abs() < 1e-2);
        assert_eq!(tree.hit(200.0, 120.0), Some(1), "the middle");
        // A rotated rectangle touches its bounding box at its four corners only: the box's own corners are empty.
        for (corner_x, corner_y) in [
            (x + 1.0, y + 1.0),
            (x + width - 1.0, y + 1.0),
            (x + 1.0, y + height - 1.0),
            (x + width - 1.0, y + height - 1.0),
        ] {
            assert_eq!(tree.hit(corner_x, corner_y), None, "{corner_x} {corner_y}");
        }
        // Along the bar's axis, clockwise from the middle, it is hit; across it past half its thickness it is not.
        let along = 90.0 * std::f32::consts::FRAC_1_SQRT_2;
        assert_eq!(tree.hit(200.0 + along, 120.0 + along), Some(1));
        assert_eq!(tree.hit(200.0 - along, 120.0 - along), Some(1));
        let across = std::f32::consts::FRAC_1_SQRT_2;
        assert_eq!(
            tree.hit(200.0 - 15.0 * across, 120.0 + 15.0 * across),
            Some(1)
        );
        assert_eq!(tree.hit(200.0 - 30.0 * across, 120.0 + 30.0 * across), None);
    }

    #[test]
    fn a_collapsed_matrix_hits_nothing_with_nothing_in_it() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (0.0, 0.0), (100.0, 100.0));
        tree.add(Parent::Node(1), 2, Static, (10.0, 10.0), (20.0, 20.0));
        tree.transform(1, "scale(0)");
        tree.settle();
        assert_eq!(tree.hit(50.0, 50.0), None);
        assert_eq!(tree.hit(15.0, 15.0), None, "nor its child");
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (0.0, 0.0), (100.0, 100.0));
        tree.transform(1, "rotateY(90deg)");
        tree.settle();
        assert_eq!(tree.hit(50.0, 50.0), None, "edge on");
    }

    #[test]
    fn nested_transforms_multiply_per_element_and_children_are_hit_in_the_parents_turned_frame() {
        let mut tree = TestTree::new();
        // The parent is scaled by two about its middle (100, 100): it covers (-... ) 0..200 -> -100..300 in x and y.
        tree.add(TOP, 1, Static, (0.0, 0.0), (200.0, 200.0));
        tree.transform(1, "scale(2)");
        // Its child sits at (150, 0) in the parent's frame, 40 x 40, and is turned a quarter about its middle.
        tree.add(Parent::Node(1), 2, Static, (150.0, 0.0), (40.0, 40.0));
        tree.transform(2, "rotate(90deg)");
        tree.settle();
        // The child's centre (170, 20) is at 2 * (170 - 100) + 100 = 240, 2 * (20 - 100) + 100 = -60 on screen.
        let (x, y, width, height) = rect_of_drawn(&tree, 2);
        assert!(
            (x - 200.0).abs() < 1e-2
                && (y - -100.0).abs() < 1e-2
                && (width - 80.0).abs() < 1e-2
                && (height - 80.0).abs() < 1e-2,
            "{x} {y} {width} {height}"
        );
        assert_eq!(tree.hit(240.0, -60.0), Some(2));
        assert_eq!(tree.hit(100.0, 100.0), Some(1));
        assert_eq!(
            tree.hit(-90.0, -90.0),
            Some(1),
            "the scaled parent reaches past its layout box"
        );
    }

    #[test]
    fn an_overflow_clip_in_a_turned_frame_is_exact_for_hits_and_a_box_for_geometry() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (200.0, 200.0), (100.0, 100.0));
        tree.clip(1);
        tree.transform(1, "rotate(45deg)");
        // A child that sticks out of the clip on the right.
        tree.add(Parent::Node(1), 2, Static, (60.0, 40.0), (100.0, 20.0));
        tree.settle();
        // The child's tip (150, 50) in the parent's frame: out of the clip, so not hit; the part inside is.
        let place = |at: Vector2| {
            Vector2::new(200.0, 200.0) + tree.nodes[&1].placement.unwrap().affine.apply(at)
        };
        let tip = place(Vector2::new(150.0, 50.0));
        let inside = place(Vector2::new(80.0, 50.0));
        assert_eq!(tree.hit(tip.x, tip.y), None);
        assert_eq!(tree.hit(inside.x, inside.y), Some(2));
        let (_, clip) = drawn(&tree, 2);
        let clip = clip.expect("the parent clips");
        // The clip is the box round the turned padding box, as the engine's.
        assert!(
            (clip.width - 141.42).abs() < 0.1 && (clip.height - 141.42).abs() < 0.1,
            "{} x {}",
            clip.width,
            clip.height
        );
    }

    #[test]
    fn a_scroll_container_in_a_turned_frame_scrolls_its_content_in_its_own_axes() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (0.0, 0.0), (100.0, 100.0));
        tree.scrolls(1, (0.0, 30.0), [None, None]);
        tree.transform(1, "rotate(90deg)");
        tree.add(Parent::Node(1), 2, Static, (0.0, 50.0), (100.0, 20.0));
        tree.settle();
        // The row is at y 50 in the container, 20 once scrolled; turned a quarter about (50, 50) that is x = 50 + (50 - 30)... check
        // by drawing: the container's point (50, 30) goes to (50 - (30 - 50), 50 + (50 - 50)) = (70, 50).
        let at = tree.nodes[&1]
            .placement
            .unwrap()
            .affine
            .apply(Vector2::new(50.0, 30.0));
        assert!(
            (at.x - 70.0).abs() < 1e-3 && (at.y - 50.0).abs() < 1e-3,
            "{at:?}"
        );
        assert_eq!(tree.hit(at.x, at.y), Some(2));
    }

    #[test]
    fn a_transformed_element_is_the_containing_block_of_absolute_and_fixed_elements_below_it() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (10.0, 10.0), (100.0, 100.0));
        tree.transform(1, "rotate(0deg)");
        tree.add(Parent::Node(1), 2, Static, (0.0, 0.0), (50.0, 50.0));
        tree.add(Parent::Node(2), 3, Absolute, (5.0, 5.0), (10.0, 10.0));
        tree.add(Parent::Node(2), 4, Fixed, (6.0, 6.0), (10.0, 10.0));
        tree.nodes.get_mut(&4).unwrap().stacking.inside_transform = true;
        tree.settle();
        assert_eq!(
            tree.nodes[&3].paint_parent,
            Some(Parent::Node(1)),
            "absolute: the transformed ancestor"
        );
        assert_eq!(
            tree.nodes[&4].paint_parent,
            Some(Parent::Node(1)),
            "fixed: the same"
        );
        // Without the transform they go where they went.
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (10.0, 10.0), (100.0, 100.0));
        tree.add(Parent::Node(1), 2, Absolute, (5.0, 5.0), (10.0, 10.0));
        tree.add(Parent::Node(1), 3, Fixed, (6.0, 6.0), (10.0, 10.0));
        tree.settle();
        assert_eq!(tree.nodes[&2].paint_parent, Some(TOP));
        assert_eq!(tree.nodes[&3].paint_parent, Some(TOP));
    }

    #[test]
    fn an_untransformed_walk_gives_the_numbers_it_always_did() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (0.1, 0.2), (10.3, 20.7));
        tree.add(Parent::Node(1), 2, Static, (0.3, 0.7), (4.1, 5.9));
        tree.settle();
        let (x, y, width, height) = rect_of_drawn(&tree, 2);
        assert_eq!((x, y), (0.1 + 0.3, 0.2 + 0.7));
        assert_eq!(
            (width, height),
            (4.1, 5.9),
            "the size is not recomputed from corners"
        );
    }

    #[test]
    fn an_element_that_is_not_attached_has_no_paint_parent_or_geometry() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Relative, (0.0, 0.0), (10.0, 10.0));
        tree.add(Parent::Node(1), 2, Absolute, (0.0, 0.0), (10.0, 10.0));
        tree.nodes.get_mut(&2).unwrap().parent = None;
        tree.settle();
        assert_eq!(paint_parent(&tree, 2), None);
        assert!(absolute_geometry(&tree, 2, VIEWPORT, ScrollMode::Drawn).is_none());
        assert!(absolute_geometry(&tree, 99, VIEWPORT, ScrollMode::Drawn).is_none());
    }

    #[test]
    fn the_root_has_the_viewport_for_a_rectangle_and_an_unknown_tag_has_none() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Relative, (5.0, 6.0), (10.0, 20.0));
        tree.settle();
        let fields = |rect: BoxRect| (rect.x, rect.y, rect.width, rect.height);
        let root = rect_of(&tree, ROOT_TARGET, VIEWPORT).expect("the root has a rectangle");
        assert_eq!(fields(root), fields(VIEWPORT));
        let node = rect_of(&tree, 1, VIEWPORT).expect("a mounted node has a rectangle");
        assert_eq!(fields(node), (5.0, 6.0, 10.0, 20.0));
        assert!(rect_of(&tree, 99, VIEWPORT).is_none());
    }

    // ---- Scroll containers ------------------------------------------------------------------------

    fn drawn(tree: &TestTree, tag: u32) -> (BoxRect, Option<BoxRect>) {
        absolute_geometry(tree, tag, VIEWPORT, ScrollMode::Drawn).unwrap()
    }

    fn reachable(tree: &TestTree, tag: u32) -> (BoxRect, Option<BoxRect>) {
        absolute_geometry(tree, tag, VIEWPORT, ScrollMode::Reachable).unwrap()
    }

    /// A 100 x 100 scroller at (10, 20) holding a 100 x 400 column of four 100 x 100 rows, scrolled by 150.
    fn scrolled_column(offset: f32) -> TestTree {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (10.0, 20.0), (100.0, 100.0));
        tree.scrolls(1, (0.0, offset), [None, None]);
        for row in 0..4 {
            tree.add(
                Parent::Node(1),
                10 + row,
                Static,
                (0.0, row as f32 * 100.0),
                (100.0, 100.0),
            );
        }
        tree.settle();
        tree
    }

    #[test]
    fn a_pointer_reaches_the_row_that_the_scroll_offset_put_under_it() {
        let tree = scrolled_column(150.0);
        // The viewport of the scroller shows content y 150..250: row 11 (100..200) then row 12.
        assert_eq!(
            tree.hit(60.0, 20.0 + 10.0),
            Some(11),
            "top of the scroller: content y 160"
        );
        assert_eq!(
            tree.hit(60.0, 20.0 + 90.0),
            Some(12),
            "bottom: content y 240"
        );
        let unscrolled = scrolled_column(0.0);
        assert_eq!(unscrolled.hit(60.0, 20.0 + 10.0), Some(10));
        // Outside the scroller's clip nothing scrolled shows through.
        assert_eq!(tree.hit(60.0, 20.0 + 110.0), None);
        // Horizontal offsets work the same way.
        let mut wide = TestTree::new();
        wide.add(TOP, 1, Static, (0.0, 0.0), (100.0, 50.0));
        wide.scrolls(1, (120.0, 0.0), [None, None]);
        wide.add(Parent::Node(1), 2, Static, (0.0, 0.0), (100.0, 50.0));
        wide.add(Parent::Node(1), 3, Static, (100.0, 0.0), (100.0, 50.0));
        wide.settle();
        assert_eq!(
            wide.hit(10.0, 10.0),
            Some(3),
            "content x 130 is in the second page"
        );
    }

    #[test]
    fn drawn_geometry_follows_the_scroll_and_clips_to_the_container() {
        let tree = scrolled_column(150.0);
        let (rect, clip) = drawn(&tree, 12);
        assert_eq!((rect.x, rect.y), (10.0, 20.0 + 200.0 - 150.0));
        let clip = clip.unwrap();
        assert_eq!(
            (clip.x, clip.y, clip.width, clip.height),
            (10.0, 20.0, 100.0, 100.0),
            "the scroller's own box does not scroll"
        );
        let (scroller, _) = drawn(&tree, 1);
        assert_eq!((scroller.x, scroller.y), (10.0, 20.0));
        // A row scrolled out of view has a rect outside its clip.
        let (rect, clip) = drawn(&tree, 10);
        assert!(!intersects(rect, clip.unwrap()));
    }

    #[test]
    fn nested_scrollers_add_their_offsets() {
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Static, (0.0, 0.0), (200.0, 200.0));
        tree.scrolls(1, (0.0, 30.0), [None, None]);
        tree.add(Parent::Node(1), 2, Static, (0.0, 100.0), (200.0, 100.0));
        tree.scrolls(2, (0.0, 20.0), [None, None]);
        tree.add(Parent::Node(2), 3, Static, (0.0, 40.0), (50.0, 50.0));
        tree.settle();
        let (rect, _) = drawn(&tree, 3);
        assert_eq!(rect.y, 100.0 - 30.0 + 40.0 - 20.0);
    }

    #[test]
    fn an_absolute_box_scrolls_with_a_positioned_scroller_that_is_its_containing_block_only() {
        // A positioned scroller: its absolute child is painted by it, so it scrolls.
        let mut tree = TestTree::new();
        tree.add(TOP, 1, Relative, (0.0, 0.0), (100.0, 100.0));
        tree.scrolls(1, (0.0, 40.0), [None, None]);
        tree.add(Parent::Node(1), 2, Absolute, (10.0, 60.0), (20.0, 20.0));
        // A static scroller inside a positioned, non-scrolling block: the absolute child belongs to
        // the block, so scrolling the static one does not move it.
        tree.add(TOP, 3, Relative, (200.0, 0.0), (100.0, 100.0));
        tree.add(Parent::Node(3), 4, Static, (0.0, 0.0), (100.0, 100.0));
        tree.scrolls(4, (0.0, 40.0), [None, None]);
        tree.add(Parent::Node(4), 5, Absolute, (10.0, 60.0), (20.0, 20.0));
        tree.settle();
        assert_eq!(tree.nodes[&2].paint_parent, Some(Parent::Node(1)));
        assert_eq!(
            drawn(&tree, 2).0.y,
            60.0 - 40.0,
            "scrolls with its positioned scroller"
        );
        assert_eq!(tree.hit(15.0, 25.0), Some(2));
        assert_eq!(tree.nodes[&5].paint_parent, Some(Parent::Node(3)));
        assert_eq!(drawn(&tree, 5).0.y, 60.0, "stays with its containing block");
        assert_eq!(
            tree.hit(215.0, 65.0),
            Some(5),
            "and is not clipped by the static scroller"
        );
    }

    #[test]
    fn a_scrollbar_thumb_is_hit_before_the_content_it_covers() {
        let mut tree = scrolled_column(0.0);
        let thumb = BoxRect {
            x: 92.0,
            y: 2.0,
            width: 6.0,
            height: 40.0,
        };
        tree.scrolls(1, (0.0, 0.0), [None, Some(thumb)]);
        assert_eq!(
            tree.hit(10.0 + 95.0, 20.0 + 20.0),
            Some(1),
            "the thumb is the scroller's"
        );
        assert_eq!(
            tree.hit(10.0 + 85.0, 20.0 + 20.0),
            Some(10),
            "left of it is the row"
        );
        assert_eq!(tree.hit(10.0 + 95.0, 20.0 + 60.0), Some(10), "below it too");
        // The thumb does not scroll with the content.
        tree.scrolls(1, (0.0, 150.0), [None, Some(thumb)]);
        assert_eq!(tree.hit(10.0 + 95.0, 20.0 + 20.0), Some(1));
        // A scroller that takes no pointers has no grabbable thumb.
        tree.nodes.get_mut(&1).unwrap().pointer_target = false;
        assert_eq!(tree.hit(10.0 + 95.0, 20.0 + 20.0), Some(11));
    }

    #[test]
    fn reachable_geometry_ignores_scrolling_but_not_what_hides_an_element_for_good() {
        // An element 3000 px down a scroller is reachable by scrolling although it is nowhere on screen.
        let mut tree = scrolled_column(0.0);
        tree.add(Parent::Node(1), 20, Static, (0.0, 3000.0), (100.0, 100.0));
        tree.settle();
        let (rect, clip) = reachable(&tree, 20);
        assert!(
            clip.is_none_or(|clip| intersects(rect, clip)),
            "reachable by scrolling"
        );
        let (rect, clip) = drawn(&tree, 20);
        assert!(
            !intersects(rect, clip.unwrap()),
            "but it is not drawn in view"
        );

        // A clipping box inside the scroller still hides what is beyond it: a collapsed section.
        tree.add(Parent::Node(1), 21, Static, (0.0, 50.0), (100.0, 0.0));
        tree.clip(21);
        tree.add(Parent::Node(21), 22, Static, (0.0, 0.0), (100.0, 30.0));
        tree.settle();
        let (rect, clip) = reachable(&tree, 22);
        assert!(
            !intersects(rect, clip.unwrap()),
            "a zero-height clip hides its child"
        );

        // A scroller that is itself off screen is not reachable inside.
        let mut away = TestTree::new();
        away.add(TOP, 1, Static, (900.0, 900.0), (100.0, 100.0));
        away.scrolls(1, (0.0, 0.0), [None, None]);
        away.add(Parent::Node(1), 2, Static, (0.0, 0.0), (50.0, 50.0));
        away.settle();
        let (rect, clip) = reachable(&away, 2);
        assert!(!intersects(rect, clip.unwrap()));
    }
}
