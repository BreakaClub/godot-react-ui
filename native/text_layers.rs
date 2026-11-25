//! Texts after boxes. The engine batches consecutive draws of one kind, one texture and one clip: a list of rows painted as CSS paints
//! them (the row's box, its text, the next row's box, its text) alternates the masks' atlas and the font's texture, and every row costs
//! two draw calls. Painted as all the boxes and then all the texts, the same rows are two draw calls in all.
//!
//! That order paints the same pixels when no text is covered by anything painted after it in the CSS order. So the texts are moved
//! only where that holds: the paint tree is cut into sequences at the elements whose own state applies to everything below them (a
//! clip, a scroll offset, an opacity, a transform, a filter or a backdrop: a text moved out of one would lose it), each sequence is
//! the things drawn under one such element (or a layer) in paint order, and a text of a sequence is moved to the end of it when
//! nothing that stays where it is, and is drawn after it, overlaps it (`movable`). The texts that move keep their order among
//! themselves, in a text layer drawn after everything else under the sequence's element (`RenderNode::ensure_text_layer`). An element
//! that cuts a sequence is, in the one it is in, one thing drawn: the rectangle of all it and its paint children draw.
//!
//! The pass runs before each frame, after the clip culling and when it does (`clip_cull.rs`); a culled element draws nothing and is
//! not part of any sequence, and its text goes back to its element, which hides it.

use std::collections::{HashMap, HashSet};

use godot::prelude::*;

use crate::ReactUiRoot;
use crate::commit::LAYER_COUNT;
use crate::geometry::{BoxRect, intersects};
use crate::props::Kind;
use crate::render_tree::{RootItem, TEXT_LAYER_DRAW_INDEX, TextHoist};
use crate::stacking::{self, Extent, PaintTree};

/// One thing drawn in a sequence, in the frame its element's children are located in (or its layer's).
#[derive(Clone, Copy)]
pub(crate) enum Paint {
    /// Something that stays where it is drawn: a box, an outline, or all of an element that is a sequence of its own.
    Stays(BoxRect),
    /// An element's text, which may move to the end of the sequence; `offset` is the element's corner.
    Text {
        tag: u32,
        rect: BoxRect,
        offset: Vector2,
    },
}

/// The side of a cell of the grid `movable` looks for overlaps in, in logical pixels: about a row of a list.
const CELL_PX: f32 = 128.0;
/// A rectangle over more cells than this is kept apart and checked against every text: a sequence's few large blocks.
const MOST_CELLS: i64 = 4096;

/// The rectangles of the things that stay, by the grid cells they cover.
#[derive(Default)]
struct Staying {
    cells: HashMap<(i32, i32), Vec<BoxRect>>,
    large: Vec<BoxRect>,
}

impl Staying {
    fn cells_of(rect: BoxRect) -> Option<(i32, i32, i32, i32)> {
        let x0 = (rect.x / CELL_PX).floor();
        let y0 = (rect.y / CELL_PX).floor();
        let x1 = ((rect.x + rect.width) / CELL_PX).floor();
        let y1 = ((rect.y + rect.height) / CELL_PX).floor();
        let count = (x1 - x0 + 1.0) as i64 * (y1 - y0 + 1.0) as i64;
        (count <= MOST_CELLS).then_some((x0 as i32, y0 as i32, x1 as i32, y1 as i32))
    }

    fn insert(&mut self, rect: BoxRect) {
        match Self::cells_of(rect) {
            Some((x0, y0, x1, y1)) => {
                for x in x0..=x1 {
                    for y in y0..=y1 {
                        self.cells.entry((x, y)).or_default().push(rect);
                    }
                }
            }
            None => self.large.push(rect),
        }
    }

    fn overlaps(&self, rect: BoxRect) -> bool {
        if self.large.iter().any(|other| intersects(*other, rect)) {
            return true;
        }
        match Self::cells_of(rect) {
            Some((x0, y0, x1, y1)) => (x0..=x1).any(|x| {
                (y0..=y1).any(|y| {
                    self.cells
                        .get(&(x, y))
                        .is_some_and(|rects| rects.iter().any(|other| intersects(*other, rect)))
                })
            }),
            None => self
                .cells
                .values()
                .flatten()
                .any(|other| intersects(*other, rect)),
        }
    }
}

/// The texts of `paints` that can be drawn after everything else of it, as indexes in paint order: those that nothing staying and
/// drawn after them overlaps. Decided from the last paint back, so a text that stays covers the texts before it as a box would.
pub(crate) fn movable(paints: &[Paint]) -> Vec<usize> {
    let mut staying = Staying::default();
    let mut moved = Vec::new();
    for (index, paint) in paints.iter().enumerate().rev() {
        match *paint {
            Paint::Stays(rect) => staying.insert(rect),
            Paint::Text { rect, .. } => {
                if staying.overlaps(rect) {
                    staying.insert(rect);
                } else {
                    moved.push(index);
                }
            }
        }
    }
    moved.reverse();
    moved
}

/// What a sequence is drawn under.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
enum SequenceRoot {
    Layer(usize),
    Node(u32),
}

struct Sequence {
    root: SequenceRoot,
    paints: Vec<Paint>,
}

/// A rectangle that stands for an extent with no bound: past any frame's coordinates.
const EVERYWHERE: BoxRect = BoxRect {
    x: -1.0e9,
    y: -1.0e9,
    width: 2.0e9,
    height: 2.0e9,
};

fn moved_by(rect: BoxRect, offset: Vector2) -> BoxRect {
    BoxRect {
        x: rect.x + offset.x,
        y: rect.y + offset.y,
        ..rect
    }
}

fn box_rect(rect: Rect2) -> BoxRect {
    BoxRect {
        x: rect.position.x,
        y: rect.position.y,
        width: rect.size.x,
        height: rect.size.y,
    }
}

/// The text layers of the layers' roots: under each layer's item, after the layer's elements.
#[derive(Default)]
pub(crate) struct RootTextLayers {
    items: [Option<RootItem>; LAYER_COUNT],
}

impl RootTextLayers {
    pub(crate) fn release(&mut self) {
        self.items = Default::default();
    }
}

impl ReactUiRoot {
    /// Move every text that can be drawn after the boxes of its sequence to the end of it, and every other back to its element.
    pub(crate) fn settle_text_layers(&mut self) {
        let mut sequences = Vec::new();
        for layer in 0..LAYER_COUNT {
            let mut sequence = Sequence {
                root: SequenceRoot::Layer(layer),
                paints: Vec::new(),
            };
            for tag in self.mounted.paint_roots[layer].clone() {
                self.collect_paints(tag, Vector2::ZERO, &mut sequence, &mut sequences);
            }
            sequences.push(sequence);
        }
        let mut moves: HashMap<u32, (SequenceRoot, Vector2, i32)> = HashMap::new();
        for sequence in &sequences {
            for (order, index) in movable(&sequence.paints).into_iter().enumerate() {
                if let Paint::Text { tag, offset, .. } = sequence.paints[index] {
                    let order = i32::try_from(order).expect("a sequence's texts fit an i32 draw index");
                    moves.insert(tag, (sequence.root, offset, order));
                }
            }
        }
        let used: HashSet<SequenceRoot> = moves.values().map(|(root, _, _)| *root).collect();
        let mut layers: HashMap<SequenceRoot, Rid> = HashMap::new();
        for root in &used {
            let layer = match *root {
                SequenceRoot::Layer(layer) => {
                    let parent = self.layer_item(layer);
                    self.root_text_layers.items[layer]
                        .get_or_insert_with(|| RootItem::new(parent, TEXT_LAYER_DRAW_INDEX))
                        .item
                }
                SequenceRoot::Node(tag) => self
                    .mounted
                    .nodes
                    .get_mut(&tag)
                    .expect("a sequence's element is mounted")
                    .render
                    .ensure_text_layer(),
            };
            layers.insert(*root, layer);
        }
        let mut moved = 0;
        for (tag, node) in &mut self.mounted.nodes {
            let hoist = moves.get(tag).map(|(root, offset, order)| TextHoist {
                layer: layers[root],
                offset: *offset,
                order: *order,
            });
            moved += usize::from(hoist.is_some());
            node.render.hoist_text(hoist);
        }
        // The layers that hold no text any more go, after their texts left them.
        for (tag, node) in &mut self.mounted.nodes {
            if node.render.has_text_layer() && !used.contains(&SequenceRoot::Node(*tag)) {
                node.render.drop_text_layer();
            }
        }
        for layer in 0..LAYER_COUNT {
            if !used.contains(&SequenceRoot::Layer(layer)) {
                self.root_text_layers.items[layer] = None;
            }
        }
        self.stats.texts_moved = moved;
    }

    /// Add what `tag` and its paint children draw to `sequence`, `origin` being the corner of the frame `tag` is located in, in the
    /// sequence's frame. An element that cuts a sequence adds one rectangle to it and starts a sequence of its own in `sequences`.
    fn collect_paints(
        &self,
        tag: u32,
        origin: Vector2,
        sequence: &mut Sequence,
        sequences: &mut Vec<Sequence>,
    ) {
        let Some(node) = self.mounted.nodes.get(&tag) else {
            return;
        };
        let Some(frame) = self.mounted.frame(tag) else {
            return;
        };
        // A culled element, or one whose matrix has no inverse, draws nothing.
        if node.render.is_clip_culled() || frame.placement.is_some_and(|placement| placement.inverse.is_none()) {
            return;
        }
        let cuts = frame.clip.is_some()
            || frame.scroll.is_some()
            || frame.placement.is_some()
            || node.render.opacity() < 1.0
            || node.render.has_effect_items()
            || node.kind == Kind::TextInput;
        if cuts {
            match stacking::subtree_extent(&self.mounted, tag) {
                Extent::Empty => {}
                Extent::Within(rect) => sequence.paints.push(Paint::Stays(moved_by(rect, origin))),
                Extent::Unbounded => sequence.paints.push(Paint::Stays(EVERYWHERE)),
            }
            let mut inner = Sequence {
                root: SequenceRoot::Node(tag),
                paints: Vec::new(),
            };
            for child in &node.paint_children {
                self.collect_paints(*child, Vector2::ZERO, &mut inner, sequences);
            }
            sequences.push(inner);
            return;
        }
        let at = origin + frame.location;
        let own = moved_by(box_rect(node.render.own_paint_rect(frame.size)), at);
        sequence.paints.push(Paint::Stays(own));
        if node.render.has_text()
            && let Some(text) = node.text_rect()
        {
            sequence.paints.push(Paint::Text {
                tag,
                rect: moved_by(box_rect(text), at),
                offset: at,
            });
        }
        for child in &node.paint_children {
            self.collect_paints(*child, at, sequence, sequences);
        }
        // The outline is drawn after the children.
        if node.render.has_outline() {
            sequence.paints.push(Paint::Stays(own));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(x: f32, y: f32, width: f32, height: f32) -> BoxRect {
        BoxRect {
            x,
            y,
            width,
            height,
        }
    }

    fn text(tag: u32, rect: BoxRect) -> Paint {
        Paint::Text {
            tag,
            rect,
            offset: Vector2::ZERO,
        }
    }

    #[test]
    fn the_texts_of_rows_that_do_not_overlap_all_move() {
        // Each row: its box, then its text inside it.
        let paints: Vec<Paint> = (0..5)
            .flat_map(|row| {
                let y = row as f32 * 40.0;
                [Paint::Stays(rect(0.0, y, 200.0, 36.0)), text(row, rect(8.0, y + 8.0, 100.0, 20.0))]
            })
            .collect();
        assert_eq!(movable(&paints), vec![1, 3, 5, 7, 9]);
    }

    #[test]
    fn a_text_under_something_drawn_after_it_stays_and_covers_the_texts_before_it() {
        let paints = vec![
            text(1, rect(0.0, 0.0, 50.0, 20.0)),
            // Overlaps the first text, not the badge below.
            text(2, rect(40.0, 0.0, 50.0, 20.0)),
            // A badge drawn over the second text.
            Paint::Stays(rect(80.0, 5.0, 30.0, 10.0)),
            text(3, rect(0.0, 100.0, 50.0, 20.0)),
        ];
        // The second text stays under the badge; the first, which it overlaps, must then stay under it too.
        assert_eq!(movable(&paints), vec![3]);
    }

    #[test]
    fn a_large_block_after_a_text_keeps_it_and_one_before_it_does_not() {
        let block = rect(-1000.0, -1000.0, 1_000_000.0, 1_000_000.0);
        assert_eq!(movable(&[text(1, rect(0.0, 0.0, 10.0, 10.0)), Paint::Stays(block)]), Vec::<usize>::new());
        assert_eq!(movable(&[Paint::Stays(block), text(1, rect(0.0, 0.0, 10.0, 10.0))]), vec![1]);
        assert_eq!(movable(&[text(1, rect(0.0, 0.0, 10.0, 10.0)), Paint::Stays(EVERYWHERE)]), Vec::<usize>::new());
    }

    #[test]
    fn touching_is_not_overlapping() {
        let paints = vec![
            text(1, rect(0.0, 0.0, 128.0, 20.0)),
            Paint::Stays(rect(128.0, 0.0, 50.0, 20.0)),
            Paint::Stays(rect(0.0, 20.0, 128.0, 20.0)),
        ];
        assert_eq!(movable(&paints), vec![0]);
    }
}
