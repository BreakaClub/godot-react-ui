//! The native drag ghost (plan sections 3.8 and 3.19): a translucent copy of the dragged element, drawn
//! in a top-most canvas item above both layers and the focus ring, following the pointer.
//!
//! The copy is a second render tree (`RenderNode`s) whose items replay the box and content commands the
//! source's own items last recorded: the same `BoxKey` and `ContentKey`, the same transforms, clips,
//! opacities and scroll offsets, over the same paint resources. It is a snapshot, as a browser's drag
//! image is: it is taken when the drag is about to start, before any `dragstart` handler can restyle
//! the source, and it does not follow later changes to the source (or its removal). Scrollbar thumbs
//! are not copied. A text input's text (or its placeholder) is copied, without a selection, an IME preedit
//! or a caret: it is drawn from its own paragraph, which the root hands in ready. The root `Control` clips everything it draws, so the ghost is cut off at the root's
//! edge like the rest of the UI.

use std::collections::HashMap;

use godot::prelude::*;

use crate::geometry::BoxRect;
use crate::mount::Mounted;
use crate::render_tree::{ContentKey, GHOST_DRAW_INDEX, RenderNode, RootItem};
use crate::text_input_godot::GhostText;

/// How opaque the ghost is (plan Appendix A: a browser-like ghost), multiplied into whatever
/// opacity the copied elements already have.
pub(crate) const DRAG_GHOST_OPACITY: f32 = 0.6;

/// The copy of one dragged element, alive from just before `dragstart` until the drag ends.
pub(crate) struct DragGhost {
    /// The item that moves; the copy's elements attach below it.
    root: RootItem,
    /// Owned so their canvas items live as long as the ghost (dropping a node frees them).
    nodes: Vec<RenderNode>,
    /// From the pointer to the copy's top-left corner: the grab offset, negated.
    offset: Vector2,
    size: Vector2,
    /// The pointer position the ghost was last placed for.
    pointer: Vector2,
    shown: bool,
}

impl DragGhost {
    /// Copy `source` and everything it paints as it is drawn now, hidden until [`Self::show`].
    /// `grab` is where the pointer went down (root-local), so the copy keeps the same place under the
    /// pointer. `None` for an element that is not mounted or has no size (nothing to show).
    pub(crate) fn capture(
        mounted: &mut Mounted,
        canvas_parent: Rid,
        viewport: BoxRect,
        source: u32,
        grab: Vector2,
        texts: &HashMap<u32, GhostText>,
    ) -> Option<Self> {
        let (rect, _) = mounted.absolute_geometry(source, viewport)?;
        if rect.width <= 0.0 || rect.height <= 0.0 {
            return None;
        }
        let root = RootItem::new(canvas_parent, GHOST_DRAW_INDEX);
        root.set_visible(false);
        root.set_opacity(DRAG_GHOST_OPACITY);
        let mut nodes = Vec::new();
        // (element, the item its copy attaches to, its place among its siblings, is it the source)
        let mut pending = vec![(source, root.item, 0usize, true)];
        while let Some((tag, parent, rank, is_source)) = pending.pop() {
            let Some(node) = mounted.nodes.get_mut(&tag) else {
                continue;
            };
            let recorded = node.render.recorded();
            let mut copy = RenderNode::new();
            copy.attach(parent);
            // The source sits at the ghost's origin; the item's own position places the whole copy.
            if !is_source {
                copy.set_location(recorded.location);
            }
            copy.set_draw_index(i32::try_from(rank).expect("a paint list fits an i32 draw index"));
            copy.set_opacity(recorded.opacity);
            copy.set_clip(recorded.clip);
            if let Some(key) = recorded.box_key {
                copy.record_box(key, &mut node.visual.background);
            }
            if let (Some(key), Some(paragraph)) =
                (recorded.content_key, node.visual.paragraph.as_mut())
            {
                // No selection highlight: the press that starts a drag clears the document's selection, and
                // the ghost has no font to place one with.
                let key = ContentKey {
                    selection: None,
                    ..key
                };
                copy.record_content(key, Some(paragraph), |_, _| Vec::new());
            }
            if let Some(offset) = recorded.scroll_offset {
                copy.make_scroller();
                copy.set_scroll_offset(offset);
                if let Some(text) = texts.get(&tag) {
                    text.record(&mut copy);
                }
            }
            let children = copy.child_item();
            for (rank, child) in node.paint_children.iter().enumerate() {
                pending.push((*child, children, rank, false));
            }
            nodes.push(copy);
        }
        Some(Self {
            root,
            nodes,
            offset: Vector2::new(rect.x, rect.y) - grab,
            size: Vector2::new(rect.width, rect.height),
            pointer: grab,
            shown: false,
        })
    }

    /// Place the copy for a pointer at `pointer` (root-local).
    pub(crate) fn move_to(&mut self, pointer: Vector2) {
        self.pointer = pointer;
        self.root.set_position(pointer + self.offset);
    }

    /// Show the copy where the pointer is.
    pub(crate) fn show(&mut self, pointer: Vector2) {
        self.move_to(pointer);
        if !self.shown {
            self.shown = true;
            self.root.set_visible(true);
        }
    }

    pub(crate) fn is_shown(&self) -> bool {
        self.shown
    }

    /// The root-local rectangle the copy covers now.
    pub(crate) fn rect(&self) -> Rect2 {
        Rect2::new(self.pointer + self.offset, self.size)
    }

    /// How many canvas-item boxes the copy holds (one per copied element).
    pub(crate) fn node_count(&self) -> usize {
        self.nodes.len()
    }
}
