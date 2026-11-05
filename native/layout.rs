//! Taffy layout computation with Godot `TextParagraph` leaf measurement.
use godot::prelude::*;
use taffy::prelude::{AvailableSpace, NodeId, Size, TaffyTree};

use crate::TextContext;

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
