//! Diagnostics: the whole mounted tree as JSON, and single-node queries. Whole-tree by design (plan
//! section 4.5); nothing on a commit path calls this.
use serde_json::{Value, json};

use crate::ReactUiRoot;
use crate::commit::LAYER_COUNT;
use crate::focus::Modality;
use crate::geometry::{BoxRect, intersect_clip};
use crate::pointer_state::PointerKind;
use crate::transform::Affine2;

/// A computed style as JSON without the properties nothing set.
fn style_json(style: &crate::computed_style::ComputedStyle) -> Value {
    let mut value = serde_json::to_value(&style.0).expect("styles serialize");
    if let Value::Object(map) = &mut value {
        map.retain(|_, entry| !entry.is_null());
    }
    value
}

impl ReactUiRoot {
    /// Every node with its geometry (root-local), computed style and presentation. Node 0 stands
    /// for the main layer's root, as it did in protocol v1; the overlay layer's top-level nodes
    /// report a null parent and `layer: 1`. `parent` and `children` are the React tree's;
    /// `paintParent` and `paintIndex` (back to front among what its paint parent paints) are the
    /// paint tree's, which `rect` and `clipRect` follow, and `documentIndex` is the pre-order place.
    pub(crate) fn snapshot_json(&self) -> Value {
        let viewport = self.viewport_box();
        let mut nodes = vec![json!({
            "id": 0, "kind": "view", "text": "", "parent": null, "layer": 0,
            "children": self.mounted.roots[0], "style": {}, "props": {}, "scroll": null,
            "textInput": null, "effects": null,
            "paintParent": null, "paintIndex": 0, "documentIndex": -1,
            "rect": viewport, "clipRect": viewport,
            "presentation": {
                "width": viewport.width, "height": viewport.height,
                "widthIsAuto": false, "heightIsAuto": false,
                "opacity": 1.0, "backgroundColor": "#00000000",
            },
        })];
        let document_index: std::collections::HashMap<u32, usize> = self
            .mounted
            .document_order()
            .into_iter()
            .enumerate()
            .map(|(index, tag)| (tag, index))
            .collect();
        for layer in 0..LAYER_COUNT {
            let mut stack: Vec<(u32, usize, Affine2, Option<BoxRect>)> = self.mounted.paint_roots
                [layer]
                .iter()
                .enumerate()
                .map(|(index, tag)| (*tag, index, Affine2::IDENTITY, Some(viewport)))
                .collect();
            while let Some((tag, paint_index, parent_frame, inherited_clip)) = stack.pop() {
                let node = &self.mounted.nodes[&tag];
                // The element's own frame in the root: its transform, then its location in the parent's frame.
                let frame = node
                    .transform
                    .map_or(Affine2::IDENTITY, |transform| transform.placement.affine)
                    .then(&Affine2::translation(node.geometry.location))
                    .then(&parent_frame);
                // The bounding box of what is drawn, as `getBoundingClientRect()` reports it.
                let rect = frame.bounds_of(BoxRect {
                    x: 0.0,
                    y: 0.0,
                    width: node.geometry.size.x,
                    height: node.geometry.size.y,
                });
                let as_node = |parent: Option<crate::diff::Parent>| match parent {
                    Some(crate::diff::Parent::Node(parent)) => Some(parent),
                    Some(crate::diff::Parent::Layer(0)) => Some(0),
                    Some(crate::diff::Parent::Layer(_)) | None => None,
                };
                let parent = as_node(node.parent);
                nodes.push(json!({
                    "id": tag, "kind": node.kind, "layer": node.layer,
                    "text": node.props.text.as_deref().unwrap_or(""),
                    "parent": parent, "children": node.children,
                    "paintParent": as_node(node.paint_parent), "paintIndex": paint_index,
                    "documentIndex": document_index.get(&tag),
                    "style": style_json(&node.computed),
                    "props": node.props,
                    "rect": rect, "clipRect": inherited_clip,
                    "transform": node.transform.map(|transform| transform.placement.affine.to_array()),
                    "presentation": self.presentation_json(tag),
                    "scroll": self.scroll_state_json(tag),
                    "textInput": self.text_input_snapshot_json(tag),
                    "effects": self.effects_json(tag),
                }));
                let content_clip = if node.clips_content() {
                    intersect_clip(
                        inherited_clip,
                        Some(frame.bounds_of(node.geometry.padding_box())),
                    )
                } else {
                    inherited_clip
                };
                // What a scroll container paints is shifted by its scroll offset; its own box is not.
                let content_frame =
                    Affine2::translation(-crate::scroll_input::to_vector(node.scroll.offset))
                        .then(&frame);
                for (index, child) in node.paint_children.iter().enumerate() {
                    stack.push((*child, index, content_frame, content_clip));
                }
            }
        }
        nodes.sort_by_key(|node| node["id"].as_u64());
        let pointers: Vec<Value> = self
            .pointers
            .iter()
            .map(|(id, record)| {
                json!({
                    "id": id,
                    "type": match record.kind {
                        PointerKind::Mouse => "mouse",
                        PointerKind::Touch => "touch",
                    },
                    "x": record.position.x, "y": record.position.y,
                    "buttons": record.buttons, "down": record.is_down(),
                    "capture": record.capture.map(|capture| json!({
                        "target": capture.target, "implicit": capture.implicit,
                    })),
                })
            })
            .collect();
        let mut stats = serde_json::to_value(&self.stats).expect("stats serialize");
        stats["commits"] = json!(self.stats.batches);
        json!({
            "nodes": nodes, "stats": stats,
            "width": self.viewport_size.x, "height": self.viewport_size.y,
            "hovered": self.hovered, "focused": self.focused, "pressed": self.pressed,
            "focusVisible": self.focus_visible,
            "modality": match self.modality {
                Modality::Keyboard => "keyboard",
                Modality::Pointer => "pointer",
            },
            "pointers": pointers,
            "drag": self.drag_snapshot_json(),
            "clockMs": self.clock_ms,
            "oversampling": self.oversampling.factor(),
            "transitions": self.transitions.values().collect::<Vec<_>>(),
        })
    }

    /// The root-local rectangle of one node as JSON (node 0 is the root: the viewport, as the snapshot reports it), or `null` if
    /// it is not mounted.
    pub(crate) fn node_rect_json(&self, tag: u32) -> Value {
        match crate::stacking::rect_of(&self.mounted, tag, self.viewport_box()) {
            Some(rect) => json!(rect),
            None => Value::Null,
        }
    }
}
