//! Diagnostics: the whole mounted tree as JSON, and single-node queries. Whole-tree by design (plan
//! section 4.5); nothing on a commit path calls this.
use godot::prelude::*;
use serde_json::{Value, json};

use crate::ReactUiRoot;
use crate::commit::LAYER_COUNT;
use crate::geometry::{BoxRect, intersect_clip};

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
    /// report a null parent and `layer: 1`.
    pub(crate) fn snapshot_json(&self) -> Value {
        let viewport = self.viewport_box();
        let mut nodes = vec![json!({
            "id": 0, "kind": "view", "text": "", "parent": null, "layer": 0,
            "children": self.mounted.roots[0], "style": {}, "props": {},
            "rect": viewport, "clipRect": viewport,
            "presentation": {
                "width": viewport.width, "height": viewport.height,
                "widthIsAuto": false, "heightIsAuto": false,
                "opacity": 1.0, "backgroundColor": "#00000000",
            },
        })];
        for layer in 0..LAYER_COUNT {
            let mut stack: Vec<(u32, Vector2, Option<BoxRect>)> = self.mounted.roots[layer]
                .iter()
                .map(|tag| (*tag, Vector2::ZERO, Some(viewport)))
                .collect();
            while let Some((tag, parent_origin, inherited_clip)) = stack.pop() {
                let node = &self.mounted.nodes[&tag];
                let origin = parent_origin + node.geometry.location;
                let rect = BoxRect {
                    x: origin.x,
                    y: origin.y,
                    width: node.geometry.size.x,
                    height: node.geometry.size.y,
                };
                let parent = match node.parent {
                    Some(crate::diff::Parent::Node(parent)) => Some(parent),
                    Some(crate::diff::Parent::Layer(0)) => Some(0),
                    Some(crate::diff::Parent::Layer(_)) | None => None,
                };
                nodes.push(json!({
                    "id": tag, "kind": node.kind, "layer": node.layer,
                    "text": node.props.text.as_deref().unwrap_or(""),
                    "parent": parent, "children": node.children,
                    "style": style_json(&node.computed),
                    "props": node.props,
                    "rect": rect, "clipRect": inherited_clip,
                    "presentation": self.presentation_json(tag),
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
                for child in &node.children {
                    stack.push((*child, origin, content_clip));
                }
            }
        }
        nodes.sort_by_key(|node| node["id"].as_u64());
        let mut stats = serde_json::to_value(&self.stats).expect("stats serialize");
        stats["commits"] = json!(self.stats.batches);
        json!({
            "nodes": nodes, "stats": stats,
            "width": self.viewport_size.x, "height": self.viewport_size.y,
            "hovered": self.hovered, "focused": self.focused, "pressed": self.pressed,
            "focusVisible": self.focus_visible,
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
