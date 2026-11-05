//! RID ownership stays inside the native Control; no per-element scene nodes.
use godot::classes::RenderingServer;
use godot::prelude::*;

pub struct RenderItems {
    pub paint: Rid,
    pub text: Rid,
}

impl RenderItems {
    pub fn new(parent: Rid) -> Self {
        let mut server = RenderingServer::singleton();
        let paint = server.canvas_item_create();
        let text = server.canvas_item_create();
        server.canvas_item_set_parent(paint, parent);
        server.canvas_item_set_parent(text, parent);
        Self { paint, text }
    }

    pub fn clear(&self) {
        let mut server = RenderingServer::singleton();
        server.canvas_item_clear(self.paint);
        server.canvas_item_clear(self.text);
    }
}

impl Drop for RenderItems {
    fn drop(&mut self) {
        // RenderingServer::free does not free child RIDs recursively. Every item
        // created here is released explicitly with its owning native root/node.
        let mut server = RenderingServer::singleton();
        server.free_rid(self.paint);
        server.free_rid(self.text);
    }
}

pub fn prepare(item: Rid, index: i32, bounds: Rect2, clip: Option<Rect2>) {
    let mut server = RenderingServer::singleton();
    server.canvas_item_clear(item);
    server.canvas_item_set_draw_index(item, index);
    server
        .canvas_item_set_custom_rect_ex(item, true)
        .rect(clip.unwrap_or(bounds))
        .done();
    // Item::clear resets clip; restore after every command-list rebuild.
    server.canvas_item_set_clip(item, clip.is_some());
}
