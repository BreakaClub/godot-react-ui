//! Taffy layout computation with Godot `TextParagraph` leaf measurement, and the layout pass that
//! follows every change to the mounted tree.
use std::time::Instant;

use godot::prelude::*;
use taffy::prelude::{AvailableSpace, NodeId, Size, TaffyTree};

use crate::commit::LAYER_COUNT;
use crate::profile::micros;
use crate::{ReactUiRoot, TextContext};

pub(crate) fn compute_tree(tree: &mut TaffyTree<TextContext>, root: NodeId, size: Vector2) {
    tree.compute_layout_with_measure(
        root,
        Size {
            width: AvailableSpace::Definite(size.x),
            height: AvailableSpace::Definite(size.y),
        },
        |inputs, _, context, style| {
            taffy::compute_leaf_layout(
                inputs,
                style,
                |_, _| 0.0,
                |known, available| {
                    let Some(context) = context.as_ref() else {
                        return Size::ZERO;
                    };
                    let mut paragraph = context.paragraph.clone();
                    paragraph.set_width(known.width.unwrap_or(match available.width {
                        AvailableSpace::Definite(width) => width,
                        AvailableSpace::MinContent => 0.0,
                        AvailableSpace::MaxContent => -1.0,
                    }));
                    let measured = paragraph.get_size();
                    Size {
                        width: known.width.unwrap_or(measured.x),
                        height: known.height.unwrap_or(measured.y),
                    }
                },
            )
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
        self.update_geometry();
        let viewport = self.viewport_box();
        if self
            .focused
            .is_some_and(|tag| !self.mounted.visible_for_input(tag, viewport))
        {
            self.set_focus(None, false);
        }
        if self
            .pressed
            .is_some_and(|tag| !self.mounted.visible_for_input(tag, viewport))
        {
            self.pressed = None;
            self.refresh_interaction();
        }
        let hit = if self.pointer_known {
            self.mounted.hit_test(self.pointer)
        } else {
            None
        };
        self.update_hover(hit);
        self.geometry_micros = micros(geometry_started);
        self.phase_layout_micros += self.last_layout_micros;
        self.phase_geometry_micros += self.geometry_micros;
        self.paint_pass();
    }
}
