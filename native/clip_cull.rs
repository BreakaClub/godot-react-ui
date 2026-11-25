//! Clip culling: the items of an element whose painting, its own and everything painted under it, lies wholly outside the clips of
//! its paint ancestors are hidden (`stacking::clip_culled`), so the engine does not draw them. The engine culls each canvas item
//! against the viewport only: the rows of a list scrolled out of view, still on screen but outside the list's clip, were each
//! drawn and their pixels thrown away by the scissor, at the cost of a draw call and its state changes apiece.
//!
//! The pass runs once a frame, when the rendering server is about to draw (`frame_pre_draw`, which it emits before it forgets what
//! changed, so the visibility set here draws in this frame and asks for no other), and only if something it reads changed since the
//! last one: geometry, the paint structure, a scroll offset, a transform, or what an element draws. So everything a frame changed, by
//! input, by a commit or by the motion clock, is culled in that same frame, and an idle frame does nothing. Hit testing, focus and
//! accessibility read the mounted tree, not the items, and are unaffected.

use godot::classes::RenderingServer;
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::stacking;

/// The rendering server's signal before it draws a frame.
const FRAME_PRE_DRAW: &str = "frame_pre_draw";

impl ReactUiRoot {
    /// Hide the items of the elements nothing of which shows inside their ancestors' clips, and draw the others again, if anything
    /// the culling reads changed since the last pass.
    pub(crate) fn settle_clip_culling(&mut self) {
        if !self.cull_stale {
            return;
        }
        self.cull_stale = false;
        let culled = stacking::clip_culled(&self.mounted);
        for (tag, node) in &mut self.mounted.nodes {
            node.render.set_clip_culled(culled.contains(tag));
        }
        self.stats.clip_culled = culled.len();
        self.stats.cull_passes += 1;
    }

    /// Run the culling before every frame the rendering server draws while the root is in the tree.
    pub(crate) fn connect_pre_draw(&mut self) {
        if self.pre_draw.is_some() {
            return;
        }
        let mut root = self.to_gd();
        // Linked to the root, so the engine drops the connection if the root is freed without leaving the tree first.
        let callable = self
            .to_gd()
            .linked_callable("settle_clip_culling", move |_| {
                root.bind_mut().settle_clip_culling();
            });
        RenderingServer::singleton().connect(FRAME_PRE_DRAW, &callable);
        self.pre_draw = Some(callable);
    }

    pub(crate) fn disconnect_pre_draw(&mut self) {
        if let Some(callable) = self.pre_draw.take() {
            RenderingServer::singleton().disconnect(FRAME_PRE_DRAW, &callable);
        }
    }
}
