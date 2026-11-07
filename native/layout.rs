//! Taffy layout computation with Godot `TextParagraph` leaf measurement, and the layout pass that
//! follows every change to the mounted tree.
use std::time::Instant;

use godot::prelude::*;
use taffy::prelude::{AvailableSpace, NodeId, Size, TaffyTree};
use taffy::tree::OofPositioningArea;

use crate::commit::LAYER_COUNT;
use crate::profile::micros;
use crate::text_paragraph::Offered;
use crate::{ReactUiRoot, TextContext};

pub(crate) fn compute_tree(tree: &mut TaffyTree<TextContext>, root: NodeId, size: Vector2) {
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
                    let measured = match context.as_ref() {
                        None => return Size::ZERO,
                        Some(TextContext::Paragraph(paragraph)) => {
                            let mut paragraph = paragraph.clone();
                            let offered = match (known.width, available.width) {
                                (Some(width), _) | (None, AvailableSpace::Definite(width)) => {
                                    Offered::Definite(width)
                                }
                                (None, AvailableSpace::MinContent) => Offered::MinContent,
                                (None, AvailableSpace::MaxContent) => Offered::MaxContent,
                            };
                            paragraph.measure(offered)
                        }
                        // A text input is the same size whatever it holds and however wide it is
                        // offered (a long value scrolls, it does not widen the field).
                        Some(TextContext::Intrinsic(size)) => *size,
                    };
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
    /// Lay out every layer whose tree changed, update the geometry of the nodes that moved or
    /// resized, drop focus and press from anything that became invisible, re-hit-test the pointer
    /// and paint what changed (plan 3.3, "Layout" to "Events").
    pub(crate) fn flush_layout(&mut self) {
        let layout_passes_before = self.stats.layout_passes;
        self.viewport_size = self.base().get_size();
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
    use super::*;
    use crate::props::StyleSpec;

    fn style(json: &str) -> taffy::Style {
        serde_json::from_str::<StyleSpec>(json)
            .expect("test style must parse")
            .taffy_style()
            .expect("test style must be valid")
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
}
