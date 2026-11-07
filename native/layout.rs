//! Taffy layout computation with Godot `TextParagraph` leaf measurement, and the layout pass that
//! follows every change to the mounted tree.
use std::time::Instant;

use godot::prelude::*;
use taffy::prelude::{AvailableSpace, NodeId, Size, TaffyTree};
use taffy::tree::OofPositioningArea;

use crate::commit::LAYER_COUNT;
use crate::diff::Parent;
use crate::profile::micros;
use crate::text_paragraph::Offered;
use crate::{ReactUiRoot, TextContext};

/// What a layout node holds that Taffy measures (the node context of a leaf).
pub(crate) trait LeafContext {
    /// The size of the leaf's content when it is offered `offered` width.
    fn content_size(&mut self, offered: Offered) -> Vector2;

    /// Whether replacing `previous` with this context leaves every layout as it is: this one has given the layout, for every question
    /// `previous` was asked, the answer `previous` gave.
    fn gives_layout_what(&mut self, previous: &Self) -> bool;
}

impl LeafContext for TextContext {
    fn content_size(&mut self, offered: Offered) -> Vector2 {
        match self {
            TextContext::Paragraph(paragraph) => paragraph.size_at(offered),
            // A text input is the same size whatever it holds and however wide it is offered (a long value scrolls, it does not widen
            // the field).
            TextContext::Intrinsic(size) => *size,
        }
    }

    fn gives_layout_what(&mut self, previous: &Self) -> bool {
        match (self, previous) {
            (TextContext::Paragraph(next), TextContext::Paragraph(previous)) => {
                next.measures_like(previous)
            }
            (TextContext::Intrinsic(next), TextContext::Intrinsic(previous)) => next == previous,
            (TextContext::Paragraph(_), TextContext::Intrinsic(_))
            | (TextContext::Intrinsic(_), TextContext::Paragraph(_)) => false,
        }
    }
}

/// Give a layout node a new context. Returns whether a layout may come out differently.
///
/// Taffy lays out again the node and all its ancestors whenever a context is set, and with the nine answers it keeps for a node that
/// measures the node's siblings again (see `text_measure.rs`). A text that is shaped again whose answers are those of the one it replaces,
/// to every question the layout has put, cannot change the layout, so it is swapped in without Taffy being told anything: a status bar
/// whose "Ln 99, Col 67" becomes "Ln 99, Col 68" lays nothing out.
pub(crate) fn replace_context<C: LeafContext>(
    tree: &mut TaffyTree<C>,
    node: NodeId,
    next: Option<C>,
) -> bool {
    if let Some(mut next) = next {
        if let Some(current) = tree.get_node_context_mut(node)
            && next.gives_layout_what(current)
        {
            *current = next;
            return false;
        }
        tree.set_node_context(node, Some(next))
            .expect("a mounted node has a layout node");
    } else {
        tree.set_node_context(node, None)
            .expect("a mounted node has a layout node");
    }
    true
}

pub(crate) fn compute_tree<C: LeafContext>(tree: &mut TaffyTree<C>, root: NodeId, size: Vector2) {
    tree.compute_layout_with_measure(
        root,
        Size {
            width: AvailableSpace::Definite(size.x),
            height: AvailableSpace::Definite(size.y),
        },
        |inputs, _, context, style| {
            let mut output = taffy::compute_leaf_layout(
                inputs,
                style,
                |_, _| 0.0,
                |known, available| {
                    let Some(context) = context else {
                        return Size::ZERO;
                    };
                    let offered = match (known.width, available.width) {
                        (Some(width), _) | (None, AvailableSpace::Definite(width)) => {
                            Offered::Definite(width)
                        }
                        (None, AvailableSpace::MinContent) => Offered::MinContent,
                        (None, AvailableSpace::MaxContent) => Offered::MaxContent,
                    };
                    let measured = context.content_size(offered);
                    Size {
                        width: known.width.unwrap_or(measured.x),
                        height: known.height.unwrap_or(measured.y),
                    }
                },
            );
            // Taffy lays a childless node out as a leaf (this function). A node keeps the list of the
            // out-of-flow boxes it was the containing block of, and replaces it only in the positioning
            // pass (`compute_oof_layout`, taffy `src/compute/oof.rs`), which a leaf's output skips because
            // it has no positioning area. A popover's layer root, or a card that held only an absolute
            // child, would keep naming the boxes deleted when it lost its last child, and the pass that
            // rounds layouts would panic on the first of them. An empty container marks its output the
            // same way (taffy `src/compute/flexbox.rs`, empty container).
            output.oof_positioning_area = Some(OofPositioningArea {
                size: Size::ZERO,
                offset: taffy::geometry::Point::ZERO,
            });
            output
        },
    )
    .expect("validated measurement tree");
}

impl ReactUiRoot {
    /// The layout nodes of a parent's children in document order, and the node itself.
    fn layout_children(&self, parent: Parent) -> Option<(NodeId, Vec<u32>)> {
        match parent {
            Parent::Layer(layer) => {
                Some((self.layer_roots[layer], self.mounted.roots[layer].clone()))
            }
            Parent::Node(tag) => {
                let node = self.mounted.nodes.get(&tag)?;
                Some((node.layout, node.children.clone()))
            }
        }
    }

    /// Put a parent's layout child list back in document order. Taffy lists children in the order they are laid
    /// out, so `order` is applied by listing them sorted (`apply_layout_order`); the mounted tree changes its
    /// children by their document index, so it calls this first.
    pub(crate) fn restore_layout_order(&mut self, parent: Parent) {
        if !self.ordered_parents.remove(&parent) {
            return;
        }
        let Some((handle, children)) = self.layout_children(parent) else {
            return;
        };
        let nodes: Vec<NodeId> = children
            .iter()
            .map(|tag| self.mounted.nodes[tag].layout)
            .collect();
        self.tree
            .set_children(handle, &nodes)
            .expect("the layout nodes are mounted");
    }

    /// List a parent's children to Taffy in their `order` (CSS `order`: lower first, ties in document order),
    /// which flex and grid layout then follow. Painting and hit testing keep document order.
    fn apply_layout_order(&mut self, parent: Parent) {
        let Some((handle, children)) = self.layout_children(parent) else {
            return;
        };
        let order_of = |tag: &u32| self.mounted.nodes[tag].computed.order.unwrap_or(0);
        if children.iter().all(|tag| order_of(tag) == 0) {
            self.restore_layout_order(parent);
            return;
        }
        let mut sorted = children.clone();
        sorted.sort_by_key(order_of);
        let nodes: Vec<NodeId> = sorted
            .iter()
            .map(|tag| self.mounted.nodes[tag].layout)
            .collect();
        self.tree
            .set_children(handle, &nodes)
            .expect("the layout nodes are mounted");
        self.ordered_parents.insert(parent);
        // Their places changed, whatever their own styles did.
        self.layout_dirty.extend(children);
    }

    /// Lay out every layer whose tree changed, update the geometry of the nodes that moved or
    /// resized, drop focus and press from anything that became invisible, re-hit-test the pointer
    /// and paint what changed (plan 3.3, "Layout" to "Events").
    pub(crate) fn flush_layout(&mut self) {
        let layout_passes_before = self.stats.layout_passes;
        self.viewport_size = self.base().get_size();
        for parent in std::mem::take(&mut self.order_dirty) {
            self.apply_layout_order(parent);
        }
        for root in self.layer_roots {
            let root_style = taffy::Style {
                size: Size {
                    width: taffy::prelude::length(self.viewport_size.x),
                    height: taffy::prelude::length(self.viewport_size.y),
                },
                ..taffy::Style::default()
            };
            if self.tree.style(root).expect("layer root exists") != &root_style {
                self.tree
                    .set_style(root, root_style)
                    .expect("layer root exists");
            }
        }
        for layer in 0..LAYER_COUNT {
            let root = self.layer_roots[layer];
            if self.tree.dirty(root).expect("layer root exists") {
                let start = Instant::now();
                compute_tree(&mut self.tree, root, self.viewport_size);
                self.stats.layout_micros = start.elapsed().as_micros() as u64;
                self.stats.layout_passes += 1;
            }
        }
        self.last_layout_micros = if self.stats.layout_passes > layout_passes_before {
            self.stats.layout_micros
        } else {
            0
        };
        let geometry_started = Instant::now();
        self.settle_paint_structure();
        self.update_geometry();
        self.reveal_carets_after_layout();
        let viewport = self.viewport_box();
        if self
            .focused
            .is_some_and(|tag| !self.mounted.visible_for_input(tag, viewport))
        {
            self.set_focus(None, false);
            self.release_key_focus_without_element();
        }
        if self
            .pressed
            .is_some_and(|tag| !self.mounted.visible_for_input(tag, viewport))
        {
            self.pressed = None;
            self.refresh_interaction();
        }
        // The element under the pointer can only have changed if something that decides it did, and
        // finding it walks the siblings at every level, so a flush that moved nothing skips it.
        // The hover is frozen while a drag runs (I9-3); the end of the drag catches it up.
        if std::mem::take(&mut self.hit_stale) && !self.drag_in_progress() {
            let hit = if self.pointer_known {
                self.mounted.hit_test(self.pointer)
            } else {
                None
            };
            self.update_hover(hit);
        }
        self.geometry_micros = micros(geometry_started);
        self.phase_layout_micros += self.last_layout_micros;
        self.phase_geometry_micros += self.geometry_micros;
        self.paint_pass();
        // Bounds are part of the accessibility tree.
        self.request_accessibility_update();
    }
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;
    use std::rc::Rc;

    use super::*;
    use crate::props::StyleSpec;
    use crate::text_measure::MeasuredText;
    use crate::text_measure::counting::{Counted, counted};

    fn style(json: &str) -> taffy::Style {
        serde_json::from_str::<StyleSpec>(json)
            .expect("test style must parse")
            .taffy_style()
            .expect("test style must be valid")
    }

    /// A text leaf for layout tests: it answers from a `MeasuredText` over a counting sizer, and counts how often the layout asked it.
    struct Leaf {
        text: MeasuredText<Counted>,
        asked_by_layout: Rc<Cell<usize>>,
    }

    impl LeafContext for Leaf {
        fn content_size(&mut self, offered: Offered) -> Vector2 {
            self.asked_by_layout.set(self.asked_by_layout.get() + 1);
            self.text.size_at(offered)
        }

        fn gives_layout_what(&mut self, previous: &Self) -> bool {
            self.text.measures_like(&previous.text)
        }
    }

    /// The counts of one text: how often the layout asked, and how often the text was really measured.
    #[derive(Clone)]
    struct Counts {
        asked_by_layout: Rc<Cell<usize>>,
        measured: Rc<Cell<usize>>,
    }

    impl Counts {
        fn take(&self) -> (usize, usize) {
            (self.asked_by_layout.replace(0), self.measured.replace(0))
        }
    }

    fn leaf(width: f32) -> (Leaf, Counts) {
        let (text, measured) = counted(width);
        let asked_by_layout = Rc::new(Cell::new(0));
        let counts = Counts {
            asked_by_layout: Rc::clone(&asked_by_layout),
            measured,
        };
        (
            Leaf {
                text,
                asked_by_layout,
            },
            counts,
        )
    }

    /// A layer root that held only out-of-flow boxes (a closed popover and its backdrop), and a card whose
    /// only child was absolute, are laid out again after those boxes are removed and deleted, as the
    /// mounting layer does. Without the positioning area set in `compute_tree` Taffy panics in the
    /// rounding pass (see `props::tests::taffy_keeps_a_stale_hoisted_list_...`).
    #[test]
    fn a_container_that_loses_its_last_out_of_flow_child_lays_out_again() {
        let mut tree: TaffyTree<TextContext> = TaffyTree::new();
        let item = tree.new_leaf(style(r#"{"height":20}"#)).unwrap();
        let popover = tree
            .new_with_children(
                style(r#"{"position":"absolute","left":10,"top":10,"width":50}"#),
                &[item],
            )
            .unwrap();
        let backdrop = tree
            .new_leaf(style(
                r#"{"position":"absolute","left":0,"top":0,"right":0,"bottom":0}"#,
            ))
            .unwrap();
        let badge = tree
            .new_leaf(style(
                r#"{"position":"absolute","left":3,"top":4,"width":5,"height":5}"#,
            ))
            .unwrap();
        let card = tree
            .new_with_children(
                style(r#"{"position":"relative","width":80,"height":30}"#),
                &[badge],
            )
            .unwrap();
        let root = tree
            .new_with_children(
                style(r#"{"width":200,"height":100}"#),
                &[card, backdrop, popover],
            )
            .unwrap();
        let size = Vector2::new(200.0, 100.0);
        compute_tree(&mut tree, root, size);
        assert_eq!(tree.layout(popover).unwrap().location.x, 10.0);
        assert_eq!(tree.layout(badge).unwrap().location.y, 4.0);

        // The popover and its backdrop go (the root keeps its card); then the card loses its badge.
        tree.remove_child_at_index(root, 2).unwrap();
        tree.remove_child_at_index(root, 1).unwrap();
        tree.remove_child_at_index(card, 0).unwrap();
        for node in [item, popover, backdrop, badge] {
            tree.remove(node).unwrap();
        }
        compute_tree(&mut tree, root, size);
        assert_eq!(tree.layout(card).unwrap().size.width, 80.0);

        // And a root whose every child was out of flow.
        let lone = tree
            .new_leaf(style(
                r#"{"position":"absolute","left":1,"top":1,"width":5,"height":5}"#,
            ))
            .unwrap();
        let only = tree
            .new_with_children(style(r#"{"width":50,"height":50}"#), &[lone])
            .unwrap();
        compute_tree(&mut tree, only, size);
        tree.remove_child_at_index(only, 0).unwrap();
        tree.remove(lone).unwrap();
        compute_tree(&mut tree, only, size);
        assert_eq!(tree.layout(only).unwrap().size.height, 50.0);
    }

    /// The status bar of the code editor, inside the two rows that make the panel as wide as its content: a row of four texts that the layout
    /// asks eleven different questions each time it runs, which is more than the nine answers Taffy keeps for a node.
    struct StatusBar {
        tree: TaffyTree<Leaf>,
        root: NodeId,
        /// "Ln 99, Col 67".
        position: NodeId,
        /// The counts of the position text now in the tree.
        position_counts: Counts,
        /// The counts of the other three texts, which no test replaces.
        file_counts: Counts,
        run_counts: Counts,
        check_counts: Counts,
    }

    const POSITION_WIDTH: f32 = 94.0;
    const SCREEN: Vector2 = Vector2::new(1120.0, 800.0);

    fn status_bar() -> StatusBar {
        let mut tree: TaffyTree<Leaf> = TaffyTree::new();
        let text = |tree: &mut TaffyTree<Leaf>, json: &str, width: f32| {
            let node = tree.new_leaf(style(json)).unwrap();
            let (context, counts) = leaf(width);
            tree.set_node_context(node, Some(context)).unwrap();
            (node, counts)
        };
        let (position, position_counts) = text(&mut tree, r#"{"flexShrink":0}"#, POSITION_WIDTH);
        let (file, file_counts) = text(&mut tree, r#"{"flexShrink":0}"#, 79.0);
        let (run, run_counts) = text(
            &mut tree,
            r#"{"minWidth":0,"flexGrow":1,"flexShrink":1,"flexBasis":0,"overflowX":"hidden","overflowY":"hidden"}"#,
            200.0,
        );
        let (check, check_counts) = text(&mut tree, r#"{}"#, 79.0);
        let button = tree
            .new_with_children(
                style(r#"{"flexShrink":0,"paddingLeft":8,"paddingRight":8}"#),
                &[check],
            )
            .unwrap();
        let status = tree
            .new_with_children(
                style(
                    r#"{"flexDirection":"row","alignItems":"center","columnGap":12,"paddingLeft":12,"paddingRight":12,"paddingTop":4,"paddingBottom":4,"borderTopWidth":1}"#,
                ),
                &[position, file, run, button],
            )
            .unwrap();
        let editor = tree
            .new_leaf(style(
                r#"{"position":"relative","flexGrow":1,"flexShrink":1,"flexBasis":0,"minWidth":0,"minHeight":0}"#,
            ))
            .unwrap();
        let panel = tree
            .new_with_children(
                style(r#"{"flexGrow":1,"flexShrink":1,"flexBasis":0,"minWidth":0,"minHeight":0}"#),
                &[editor, status],
            )
            .unwrap();
        let row = style(r#"{"flexDirection":"row"}"#);
        let inner = tree.new_with_children(row.clone(), &[panel]).unwrap();
        let outer = tree.new_with_children(row, &[inner]).unwrap();
        let root = tree
            .new_with_children(style(r#"{"width":1120,"height":800}"#), &[outer])
            .unwrap();
        compute_tree(&mut tree, root, SCREEN);
        let bar = StatusBar {
            tree,
            root,
            position,
            position_counts,
            file_counts,
            run_counts,
            check_counts,
        };
        bar.take_counts();
        bar
    }

    impl StatusBar {
        /// How often each text was asked by the layout and measured, since the last call: position, file, run, check.
        fn take_counts(&self) -> [(usize, usize); 4] {
            [
                self.position_counts.take(),
                self.file_counts.take(),
                self.run_counts.take(),
                self.check_counts.take(),
            ]
        }

        /// Shape the position text again, `width` wide, and lay out if that needs it. Returns whether it did.
        fn reshape_position(&mut self, width: f32) -> bool {
            let (context, counts) = leaf(width);
            self.position_counts = counts;
            let needs_layout = replace_context(&mut self.tree, self.position, Some(context));
            assert_eq!(
                needs_layout,
                self.tree.dirty(self.root).unwrap(),
                "the layout is dirty exactly when the context said it may change"
            );
            if needs_layout {
                compute_tree(&mut self.tree, self.root, SCREEN);
            }
            needs_layout
        }
    }

    /// "Ln 99, Col 67" becomes "Ln 99, Col 68", which is as wide in a monospace font. Nothing is laid out and nothing is measured for the
    /// layout, though the status bar is a dirty row's worth of texts.
    #[test]
    fn a_text_shaped_again_to_the_same_size_lays_nothing_out() {
        let mut bar = status_bar();
        assert!(!bar.reshape_position(POSITION_WIDTH));
        let [position, file, run, check] = bar.take_counts();
        assert_eq!(position.0, 0, "the layout asked nobody anything");
        assert_eq!((file, run, check), ((0, 0), (0, 0), (0, 0)));
        // The new text was put the questions the old one had been asked, to know that.
        assert!(position.1 > 0, "it measured itself to vouch for the layout");
    }

    /// "Col 9" becomes "Col 10", which is a character wider. The row lays out again and Taffy asks its unchanged texts again, because the
    /// eleven questions it put to each of them last time have pushed each other out of the nine places it keeps; but they answer from what
    /// they remember, and the text that changed is the only one that is measured.
    #[test]
    fn a_text_that_changes_size_measures_itself_and_not_its_neighbours() {
        let mut bar = status_bar();
        assert!(bar.reshape_position(POSITION_WIDTH + 7.0));
        let [position, file, run, check] = bar.take_counts();
        assert!(position.1 > 0, "the text that changed is measured");
        assert!(
            file.0 > 0,
            "the layout does ask an unchanged text again: this tree is one in which Taffy's cache is too small for the questions"
        );
        assert_eq!(file.1, 0, "the unchanged text answers from memory");
        assert_eq!(check.1, 0, "so does the one in the button");
        // The run text has the width the position text gave up, a question it was not asked before.
        assert!(
            run.1 <= 1,
            "at most the width it was newly offered: {run:?}"
        );
    }

    /// A text that came out of a layout with its answers forgotten (it was asked about more widths than it keeps) cannot vouch for the
    /// layout, and the layout runs again.
    #[test]
    fn a_text_that_cannot_say_what_it_was_asked_lays_out_again() {
        let mut bar = status_bar();
        for width in 1..=100 {
            bar.tree
                .get_node_context_mut(bar.position)
                .unwrap()
                .text
                .size_at(Offered::Definite(1000.0 + width as f32));
        }
        assert!(bar.reshape_position(POSITION_WIDTH));
    }
}
