//! Diagnostics: the whole mounted tree as JSON, and single-node queries. Whole-tree by design (plan
//! section 4.5); nothing on a commit path calls this.
use godot::prelude::*;
use serde_json::{Value, json};

use crate::ReactUiRoot;
use crate::commit::LAYER_COUNT;
use crate::focus::Modality;
use crate::geometry::{BoxRect, intersect_clip};
use crate::pointer_state::PointerKind;

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
            "textInput": null,
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
            let mut stack: Vec<(u32, usize, Vector2, Option<BoxRect>)> = self.mounted.paint_roots
                [layer]
                .iter()
                .enumerate()
                .map(|(index, tag)| (*tag, index, Vector2::ZERO, Some(viewport)))
                .collect();
            while let Some((tag, paint_index, parent_origin, inherited_clip)) = stack.pop() {
                let node = &self.mounted.nodes[&tag];
                let origin = parent_origin + node.geometry.location;
                let rect = BoxRect {
                    x: origin.x,
                    y: origin.y,
                    width: node.geometry.size.x,
                    height: node.geometry.size.y,
                };
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
                    "presentation": self.presentation_json(tag),
                    "scroll": self.scroll_state_json(tag),
                    "textInput": self.text_input_snapshot_json(tag),
                }));
                let content_clip = if node.clips_content() {
                    let local = node.geometry.padding_box();
                    intersect_clip(
                        inherited_clip,
                        Some(BoxRect {
                            x: origin.x + local.x,
                            y: origin.y + local.y,
                            width: local.width,
                            height: local.height,
                        }),
                    )
                } else {
                    inherited_clip
                };
                // What a scroll container paints is shifted by its scroll offset; its own box is not.
                let content_origin = origin - crate::scroll_input::to_vector(node.scroll.offset);
                for (index, child) in node.paint_children.iter().enumerate() {
                    stack.push((*child, index, content_origin, content_clip));
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
            "transitions": self.transitions.values().collect::<Vec<_>>(),
        })
    }

    /// The root-local rectangle of one node as JSON, or `null` if it is not mounted.
    pub(crate) fn node_rect_json(&self, tag: u32) -> Value {
        match self.mounted.absolute_geometry(tag, self.viewport_box()) {
            Some((rect, _)) => json!(rect),
            None => Value::Null,
        }
    }
}
