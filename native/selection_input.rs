//! Text selection in the mounted tree (plan section 3.17): the glue between the Godot-free selection
//! model (`selection.rs`, `text_offsets.rs`), the text geometry over Godot's paragraphs
//! (`text_layout.rs`), the pointer and key handlers, the content items that paint the highlight and the
//! event queue.
//!
//! The document selection is one `TextSelection` per root. A [`Document`] (the `Text` nodes in document
//! order, with their length and whether `userSelect` lets them be selected) and a [`GodotTextLayout`] are
//! built when a gesture, a key or a query needs them and dropped when it is answered; neither is kept, and
//! neither is built on a commit path (plan 3.2 invariant 6). A commit calls [`ReactUiRoot::selection_node_changed`]
//! for each `Text` whose text changed or which was removed, which is proportional to the change.
//!
//! What each node paints is the code point range it has selected (`SelectionState::ranges`); the content
//! item records it under the paragraph, so the highlight scrolls with its content and is clipped by the
//! containers around it for free. A change of the selection marks the nodes whose range changed dirty.
//!
//! Gestures (mouse only; plan 3.12 rule 5, after capture, scrollbar thumbs and drag): a primary press on
//! selectable text collapses the selection at the pointer, a double click selects the word, a triple
//! click the node's text and Shift extends the current selection; moving the mouse with the button down
//! extends it. A pointer that is not over selectable text extends to the start of the first selectable
//! text after it in reading order, or to the end of the last one ([`drag_target`]). A press that starts no
//! selection clears the current one.

use std::collections::BTreeMap;

use godot::builtin::{Rect2, Vector2};
use godot::classes::{Engine, InputEventKey, Os, RenderingServer};
use godot::global::Key;
use godot::prelude::*;
use serde_json::{Value, json};

use crate::computed_style::{ComputedStyle, StyleChange, StyleTree};
use crate::geometry::BoxRect;
use crate::keyboard_input::as_keyboard_event;
use crate::mount::NodeGeometry;
use crate::paint::parse_color;
use crate::pointer::MOUSE_POINTER_ID;
use crate::props::{CursorSpec, DisplaySpec, Kind, UserSelectSpec};
use crate::render_tree::{DEFAULT_SELECTION_COLOR, SelectionPaint};
use crate::selection::{Document, SelectableNode, SelectionError, SelectionPoint, TextSelection};
use crate::text_layout::{GodotParagraph, GodotTextLayout, TextLayout, TextLayoutError};
use crate::text_offsets::code_point_to_utf16;
use crate::text_paragraph::StyledParagraph;
use crate::{ReactUiRoot, event_time_ms};

/// The clicks that select a word and a whole node's text (`PointerData::detail`; further clicks of one
/// sequence keep selecting the node).
const WORD_CLICK_DETAIL: u32 = 2;
const NODE_CLICK_DETAIL: u32 = 3;

/// The code points `(start, end)` a node has selected; never empty.
type Highlight = (usize, usize);

/// Everything text selection keeps beside the model.
#[derive(Default)]
pub(crate) struct SelectionState {
    selection: TextSelection,
    /// The primary button went down on selectable text and is still down: moving the mouse extends the
    /// selection.
    dragging: bool,
    /// What each node paints, kept in step with `selection` by `sync_highlights`.
    highlights: BTreeMap<u32, Highlight>,
    /// A commit or a restyle cleared the selection and the repaint and the `selectionchange` it owes
    /// have not been made (`settle_selection`).
    cleared_by_change: bool,
}

impl SelectionState {
    /// Whether there is a selection (a collapsed one counts: it is where Shift+click extends from).
    pub(crate) fn is_active(&self) -> bool {
        self.selection.is_active()
    }

    /// The code points `tag` paints selected.
    pub(crate) fn highlight_of(&self, tag: u32) -> Option<Highlight> {
        self.highlights.get(&tag).copied()
    }

    /// A `Text` node's text changed, or the node was removed, or its `userSelect` or `display` changed.
    /// A selection that covers it is cleared at once, and so is what every node paints of it: the
    /// commit's own paint pass runs before `settle_selection`, and would otherwise draw the old ranges
    /// over the new text (a range past the end of a text that got shorter is a layout error). Returns
    /// the nodes that painted a highlight, which must repaint without it.
    fn node_changed(&mut self, tag: u32) -> Vec<u32> {
        if !self.selection.node_changed(tag) {
            return Vec::new();
        }
        self.cleared_by_change = true;
        std::mem::take(&mut self.highlights).into_keys().collect()
    }
}

/// Where a pointer that is not over selectable text puts the focus of a drag.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum DragTarget {
    /// The pointer is inside the node's box: hit test it.
    Inside(u32),
    /// The pointer is before the node in reading order: the start of its text.
    StartOf(u32),
    /// The pointer is after every selectable node: the end of the last one's text.
    EndOf(u32),
}

/// Where a node's box lies against a pointer, in reading order (top to bottom, then left to right on a
/// line).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Placement {
    Before,
    Inside,
    After,
}

fn placement(rect: BoxRect, point: Vector2) -> Placement {
    let on_line = rect.y <= point.y && point.y < rect.y + rect.height;
    if !on_line {
        return if point.y < rect.y {
            Placement::After
        } else {
            Placement::Before
        };
    }
    if point.x < rect.x {
        Placement::After
    } else if point.x >= rect.x + rect.width {
        Placement::Before
    } else {
        Placement::Inside
    }
}

/// Where to put the focus of a drag whose pointer is at `point`, given the root-local boxes of the
/// selectable nodes in document order: inside the first box that holds the pointer, else at the start of
/// the first box that lies after it, else at the end of the last box. `None` if there are no boxes.
/// Browsers do the same for a pointer in the gap between blocks: the selection reaches what the pointer
/// has passed, not what it has not.
pub(crate) fn drag_target(nodes: &[(u32, BoxRect)], point: Vector2) -> Option<DragTarget> {
    let mut first_after = None;
    for (tag, rect) in nodes {
        match placement(*rect, point) {
            Placement::Inside => return Some(DragTarget::Inside(*tag)),
            Placement::After => {
                first_after.get_or_insert(*tag);
            }
            Placement::Before => {}
        }
    }
    match first_after {
        Some(tag) => Some(DragTarget::StartOf(tag)),
        None => nodes.last().map(|(tag, _)| DragTarget::EndOf(*tag)),
    }
}

/// The layout of `paragraph` as it is drawn into its node's content item. Build one per gesture or
/// paint and drop it (`text_layout.rs`).
fn lay_out(
    paragraph: &StyledParagraph,
    geometry: &NodeGeometry,
) -> Result<GodotTextLayout, TextLayoutError> {
    let source = GodotParagraph::lay_out(paragraph.paragraph(), geometry.content_width())?;
    TextLayout::new(
        source,
        geometry.content_origin(),
        paragraph.extents_of_empty_line(),
    )
}

/// The rectangles that highlight code points `start..end` of `paragraph`, in its content item's
/// coordinates. Called by the content item when it re-records.
pub(crate) fn highlight_rects(
    paragraph: &StyledParagraph,
    geometry: &NodeGeometry,
    start: usize,
    end: usize,
) -> Result<Vec<Rect2>, TextLayoutError> {
    let layout = lay_out(paragraph, geometry)?;
    Ok(layout
        .selection_rects(start, end)?
        .into_iter()
        .map(|run| run.rect)
        .collect())
}

/// The highlight a node's content item paints for `range`, in the node's `selection-color`.
pub(crate) fn highlight_paint(style: &ComputedStyle, range: Highlight) -> SelectionPaint {
    SelectionPaint {
        start: range.0,
        end: range.1,
        color: parse_color(
            Some(
                style
                    .selection_color
                    .as_deref()
                    .unwrap_or(DEFAULT_SELECTION_COLOR),
            ),
            Color::TRANSPARENT_BLACK,
        ),
    }
}

/// Draw `rects` as one highlight into `item`.
pub(crate) fn draw_highlight(item: Rid, rects: &[Rect2], color: Color) {
    let mut server = RenderingServer::singleton();
    for rect in rects {
        server.canvas_item_add_rect(item, *rect, color);
    }
}

impl ReactUiRoot {
    // ---- The document ------------------------------------------------------------------------------

    /// The `Text` nodes in document order, with their length in code points and whether the pointer may
    /// select them: `userSelect: text`, outside any `Button`, and not in a `display: none` subtree.
    fn selection_document(&self) -> Result<Document, SelectionError> {
        let mut nodes = Vec::new();
        for roots in &self.mounted.roots {
            // (tag, whether an ancestor or the node hides it from selection)
            let mut stack: Vec<(u32, bool)> = roots.iter().rev().map(|tag| (*tag, false)).collect();
            while let Some((tag, inherited_block)) = stack.pop() {
                let Some(node) = self.mounted.nodes.get(&tag) else {
                    continue;
                };
                let blocked = inherited_block
                    || node.kind == Kind::Button
                    || node.computed.display == Some(DisplaySpec::None);
                if node.kind == Kind::Text {
                    nodes.push(SelectableNode {
                        tag,
                        len: node
                            .visual
                            .shown_text(node.props.text.as_deref())
                            .map_or(0, |text| text.chars().count()),
                        selectable: !blocked
                            && node.computed.user_select == Some(UserSelectSpec::Text),
                    });
                }
                stack.extend(node.children.iter().rev().map(|child| (*child, blocked)));
            }
        }
        Document::new(nodes)
    }

    /// [`ReactUiRoot::selection_document`], with an error (a tag listed twice: a bug) logged.
    fn selection_document_or_report(&self) -> Option<Document> {
        match self.selection_document() {
            Ok(document) => Some(document),
            Err(error) => {
                godot_error!("ReactUiRoot: cannot build the selection document: {error}");
                None
            }
        }
    }

    /// The document, with a selection that no longer describes it cleared first (a node it covered
    /// stopped being selectable or its text shrank: see `TextSelection::clear_if_stale`).
    fn current_selection_document(&mut self) -> Option<Document> {
        let document = self.selection_document_or_report()?;
        if self.selecting.selection.clear_if_stale(&document) {
            self.selecting.dragging = false;
            self.selection_changed(None);
            // The selection held key focus (S3); with it gone, and no element focused, so does nothing.
            self.release_key_focus_without_element();
        }
        Some(document)
    }

    /// The text of node `tag`, as the document measured it: the text the node shows, which is what is selected and copied.
    fn selection_text_of(&self, tag: u32) -> Option<&str> {
        self.mounted
            .nodes
            .get(&tag)
            .and_then(|node| node.visual.shown_text(node.props.text.as_deref()))
    }

    /// Whether `tag` is a `Text` the pointer may select and that is not inside a `Button`. Used for the
    /// cursor, where building the document would be too much for a pointer move.
    pub(crate) fn is_selectable_text(&self, tag: u32) -> bool {
        let Some(node) = self.mounted.nodes.get(&tag) else {
            return false;
        };
        if node.kind != Kind::Text || node.computed.user_select != Some(UserSelectSpec::Text) {
            return false;
        }
        let mut current = self.mounted.style_parent(tag);
        while let Some(ancestor) = current {
            if self
                .mounted
                .nodes
                .get(&ancestor)
                .is_some_and(|node| node.kind == Kind::Button)
            {
                return false;
            }
            current = self.mounted.style_parent(ancestor);
        }
        true
    }

    /// The cursor over element `tag` when nothing set one: `text` over selectable text and text inputs,
    /// else `default` (plan 3.20).
    pub(crate) fn unset_cursor_of(&self, tag: u32) -> CursorSpec {
        // A text input shows the text cursor too (plan 3.20).
        let is_text_input = self
            .mounted
            .nodes
            .get(&tag)
            .is_some_and(|node| node.kind == Kind::TextInput);
        if is_text_input || self.is_selectable_text(tag) {
            CursorSpec::Text
        } else {
            CursorSpec::Default
        }
    }

    // ---- Geometry ----------------------------------------------------------------------------------

    /// The layout of node `tag`'s paragraph, or `None` for a node with no text (it has no paragraph).
    fn text_layout_of(&self, tag: u32) -> Result<Option<GodotTextLayout>, String> {
        let node = self
            .mounted
            .nodes
            .get(&tag)
            .ok_or_else(|| format!("node {tag} is not mounted"))?;
        let Some(paragraph) = node.visual.paragraph.as_ref() else {
            return Ok(None);
        };
        lay_out(paragraph, &node.geometry)
            .map(Some)
            .map_err(|error| format!("node {tag}: {error}"))
    }

    /// The lines of node `tag`'s text as they are drawn, in root-local coordinates, for a verifier to compare with another
    /// renderer's: the text shown, and for each line its code point range, the left end and the baseline of its glyphs, its
    /// ascent, descent and width. `null` for a node that is not mounted or shows no text.
    pub(crate) fn text_lines_json(&self, tag: u32) -> serde_json::Value {
        let layout = match self.text_layout_of(tag) {
            Ok(Some(layout)) => layout,
            Ok(None) => return serde_json::Value::Null,
            Err(error) => {
                godot_error!("ReactUiRoot: cannot lay out the text of node {tag}: {error}");
                return serde_json::Value::Null;
            }
        };
        let Some((rect, _)) = self.mounted.absolute_geometry(tag, self.viewport_box()) else {
            return serde_json::Value::Null;
        };
        let lines: Vec<serde_json::Value> = layout
            .lines()
            .iter()
            .map(|line| {
                serde_json::json!({
                    "start": line.range.start,
                    "end": line.range.end,
                    "x": rect.x + line.origin.x,
                    "baseline": rect.y + line.origin.y,
                    "ascent": line.ascent,
                    "descent": line.descent,
                    "width": line.width,
                })
            })
            .collect();
        let shown = self
            .selection_text_of(tag)
            .map(str::to_owned)
            .unwrap_or_default();
        serde_json::json!({ "text": shown, "lines": lines })
    }

    /// The selection point under `position` (root-local) in text node `tag`: its layout's hit test, and
    /// the layout so a double click can ask it for the word.
    fn selection_point_at(
        &self,
        document: &Document,
        tag: u32,
        position: Vector2,
    ) -> Result<(SelectionPoint, Option<GodotTextLayout>), String> {
        let len = document
            .node(tag)
            .map(|node| node.len)
            .ok_or_else(|| format!("node {tag} is not in the selection document"))?;
        let Some(layout) = self.text_layout_of(tag)? else {
            return Ok((SelectionPoint { tag, offset: 0 }, None));
        };
        if layout.text_len() != len {
            return Err(format!(
                "node {tag}: the layout has {} code points but the document counted {len}",
                layout.text_len()
            ));
        }
        // The text is laid out in the element's own frame: a rotated paragraph is hit where it is drawn.
        let local = self
            .mounted
            .to_local(tag, self.viewport_box(), position)
            .ok_or_else(|| format!("node {tag} has no geometry, or a matrix with no inverse"))?;
        let offset = layout
            .hit_test(local)
            .map_err(|error| format!("node {tag}: {error}"))?;
        Ok((SelectionPoint { tag, offset }, Some(layout)))
    }

    // ---- Selection changes ---------------------------------------------------------------------------

    /// The model changed (or was just cleared): repaint the nodes whose highlight changed and queue
    /// `selectionchange`. `document` is the one the model was changed against; `None` for a selection
    /// that was cleared.
    fn selection_changed(&mut self, document: Option<&Document>) {
        self.sync_highlights(document);
        self.sync_web_selected_text(document);
        self.events.push_selection_change(event_time_ms());
    }

    /// Keep `window.__godotReactSelectedText` in step with the active selection on the Web so the
    /// page's synchronous `keydown` (`Ctrl+C` / `Cmd+C`) and `copy` listeners can write to the
    /// browser clipboard inside the user gesture.
    pub(crate) fn sync_web_selected_text(&self, document: Option<&Document>) {
        if !Os::singleton().has_feature("web") {
            return;
        }
        let text = if let Some(tag) = self.focused_text_input() {
            self.text_state(tag)
                .filter(|state| !state.buffer.config().secure && state.buffer.has_selection())
                .map(|state| {
                    state.buffer.text()[state.buffer.selection_range()]
                        .iter()
                        .collect::<String>()
                })
                .unwrap_or_default()
        } else if self.selecting.selection.is_active() && !self.selecting.selection.is_collapsed() {
            let owned;
            let doc = match document {
                Some(doc) => Some(doc),
                None => {
                    owned = self.selection_document_or_report();
                    owned.as_ref()
                }
            };
            doc.and_then(|doc| {
                self.selecting
                    .selection
                    .selected_text(doc, |tag| self.selection_text_of(tag))
                    .ok()
            })
            .unwrap_or_default()
        } else {
            String::new()
        };
        let Some(mut bridge) = Engine::singleton().get_singleton("JavaScriptBridge") else {
            return;
        };
        let Ok(mut window) = bridge
            .call("get_interface", &[GString::from("window").to_variant()])
            .try_to::<Gd<Object>>()
        else {
            return;
        };
        window.set(
            "__godotReactSelectedText",
            &GString::from(text.as_str()).to_variant(),
        );
    }

    fn sync_highlights(&mut self, document: Option<&Document>) {
        let next: BTreeMap<u32, Highlight> = match document {
            None => BTreeMap::new(),
            Some(document) => match self.selecting.selection.ranges(document) {
                Ok(ranges) => ranges
                    .into_iter()
                    .map(|range| (range.tag, (range.start, range.end)))
                    .collect(),
                Err(error) => {
                    // Every change to a covered node clears the selection first, so this is a bug.
                    godot_error!("ReactUiRoot: the selection no longer fits the document: {error}");
                    self.selecting.selection.clear();
                    BTreeMap::new()
                }
            },
        };
        let previous = std::mem::replace(&mut self.selecting.highlights, next);
        let changed: Vec<u32> = previous
            .iter()
            .filter(|(tag, range)| self.selecting.highlights.get(tag) != Some(range))
            .map(|(tag, _)| *tag)
            .chain(
                self.selecting
                    .highlights
                    .iter()
                    .filter(|(tag, range)| previous.get(tag) != Some(range))
                    .map(|(tag, _)| *tag),
            )
            .collect();
        self.paint_dirty.extend(changed);
        self.paint_pass();
    }

    /// A `Text` node's text changed, or the node was removed (called while a commit is applied), or its
    /// `userSelect` changed: a selection that covers it is cleared. The repaint and the event follow in
    /// [`ReactUiRoot::settle_selection`], once the commit has settled.
    pub(crate) fn selection_node_changed(&mut self, tag: u32) {
        let repaint = self.selecting.node_changed(tag);
        self.paint_dirty.extend(repaint);
    }

    /// Finish what [`ReactUiRoot::selection_node_changed`] started. `structure_changed` says the commit
    /// changed a child list: a selectable node may then have been inserted or moved between the ends, or
    /// an end may have stopped being selectable (its ancestor became a `Button` or `display: none`), and
    /// no node names that, so the selection is checked against a fresh document
    /// (`TextSelection::clear_if_stale`). That is whole-tree work, done only while a selection exists
    /// and only for a commit that changed a child list.
    pub(crate) fn settle_selection(&mut self, structure_changed: bool) {
        if structure_changed
            && self.selecting.selection.is_active()
            && let Some(document) = self.selection_document_or_report()
            && self.selecting.selection.clear_if_stale(&document)
        {
            self.selecting.cleared_by_change = true;
        }
        if !std::mem::take(&mut self.selecting.cleared_by_change) {
            return;
        }
        self.selecting.dragging = false;
        self.selection_changed(None);
        // The selection held Godot key focus for the keys that copy and select all (S3): a commit or a
        // restyle that cleared it leaves no reason to keep it unless an element is focused.
        self.release_key_focus_without_element();
    }

    /// A selection covers a node whose `userSelect` just changed, or that stopped being shown: it is
    /// cleared (a covered node is a selectable one, so only a change that makes it unselectable matters).
    pub(crate) fn note_selection_restyle(&mut self, changes: &[StyleChange]) {
        if !self.selecting.selection.is_active() {
            return;
        }
        for change in changes {
            let Some(previous) = &change.previous else {
                continue;
            };
            let Some(node) = self.mounted.nodes.get(&change.tag) else {
                continue;
            };
            if previous.user_select != node.computed.user_select
                || previous.display != node.computed.display
            {
                self.selection_node_changed(change.tag);
            }
        }
    }

    /// `clear_selection()` from JS.
    pub(crate) fn clear_selection_command(&mut self) {
        self.selecting.dragging = false;
        if self.selecting.selection.clear() {
            self.selection_changed(None);
        }
    }

    // ---- Pointer ---------------------------------------------------------------------------------

    /// Whether the mouse's pointer is captured by an element (`setPointerCapture`): the press belongs to
    /// that element, not to a text selection (plan 3.12 rule 1).
    pub(crate) fn mouse_is_captured(&self) -> bool {
        self.pointers.captured_by_js(MOUSE_POINTER_ID)
    }

    /// The default action of an un-prevented primary mouse press on `hit` that is not a scrollbar thumb
    /// grab or a captured pointer (`allowed`): selectable text starts or extends the selection and the
    /// root takes key focus. Returns whether the press now holds a selection (so that the press keeps
    /// it); a press that does not clears it ([`ReactUiRoot::clear_selection_command`]).
    pub(crate) fn begin_selection_press(
        &mut self,
        hit: Option<u32>,
        detail: u32,
        allowed: bool,
    ) -> bool {
        if !allowed {
            return false;
        }
        let Some(tag) = hit.filter(|tag| self.mounted.nodes.contains_key(tag)) else {
            return false;
        };
        let Some(document) = self.current_selection_document() else {
            return false;
        };
        if !document.node(tag).is_some_and(|node| node.selectable) {
            return false;
        }
        let (point, layout) = match self.selection_point_at(&document, tag, self.pointer) {
            Ok(found) => found,
            Err(error) => {
                godot_error!("ReactUiRoot: cannot place the selection: {error}");
                return false;
            }
        };
        let selection = &mut self.selecting.selection;
        let result = if self.pointer_modifiers.shift_key {
            selection.extend(&document, point)
        } else if detail == WORD_CLICK_DETAIL {
            let word = match layout
                .as_ref()
                .map(|layout| layout.word_range_at(point.offset))
            {
                Some(Ok(word)) => word,
                Some(Err(error)) => {
                    godot_error!("ReactUiRoot: cannot find the word at the pointer: {error}");
                    return false;
                }
                None => (0, 0),
            };
            selection.select_word(&document, point, &|_: u32, _: usize| word)
        } else if detail >= NODE_CLICK_DETAIL {
            selection.select_node(&document, tag)
        } else {
            selection.collapse(&document, point)
        };
        match result {
            Ok(changed) => {
                if changed {
                    self.selection_changed(Some(&document));
                }
            }
            Err(error) => {
                godot_error!("ReactUiRoot: cannot select at the pointer: {error}");
                return false;
            }
        }
        self.selecting.dragging = true;
        // Starting a selection takes Godot key focus for the root without focusing an element, so
        // `ui_copy` reaches it (plan 3.11).
        if self.base().is_inside_tree() && !self.base().has_focus() {
            self.base_mut().grab_focus();
        }
        true
    }

    /// The mouse moved with the primary button down on selectable text: the focus follows the pointer.
    pub(crate) fn selection_drag_moved(&mut self, hit: Option<u32>) {
        if !self.selecting.dragging {
            return;
        }
        let Some(document) = self.current_selection_document() else {
            return;
        };
        let position = self.pointer;
        let over_text = hit.filter(|tag| document.node(*tag).is_some_and(|node| node.selectable));
        let target = match over_text {
            Some(tag) => Some(DragTarget::Inside(tag)),
            None => {
                let boxes: Vec<(u32, BoxRect)> = document
                    .selectable_nodes()
                    .filter_map(|node| {
                        self.mounted
                            .absolute_geometry(node.tag, self.viewport_box())
                            .map(|(rect, _)| (node.tag, rect))
                    })
                    .collect();
                drag_target(&boxes, position)
            }
        };
        let point = match target {
            None => return,
            Some(DragTarget::Inside(tag)) => {
                match self.selection_point_at(&document, tag, position) {
                    Ok((point, _)) => point,
                    Err(error) => {
                        godot_error!("ReactUiRoot: cannot extend the selection: {error}");
                        return;
                    }
                }
            }
            Some(DragTarget::StartOf(tag)) => SelectionPoint { tag, offset: 0 },
            Some(DragTarget::EndOf(tag)) => SelectionPoint {
                tag,
                offset: document.node(tag).map_or(0, |node| node.len),
            },
        };
        match self.selecting.selection.extend(&document, point) {
            Ok(true) => self.selection_changed(Some(&document)),
            Ok(false) => {}
            Err(error) => {
                godot_error!("ReactUiRoot: cannot extend the selection: {error}");
            }
        }
    }

    /// The primary button went up, or the pointer was cancelled: the selection stays, the drag ends.
    pub(crate) fn end_selection_drag(&mut self) {
        self.selecting.dragging = false;
    }

    // ---- Keyboard --------------------------------------------------------------------------------

    /// The default action of a key press for the document selection: `ui_copy` copies it and
    /// `ui_text_select_all` selects all selectable text. Also accepts both `Ctrl` and `Meta` (`Cmd`)
    /// with `Key::C` and `Key::A` so `Ctrl+C` and `Cmd+C` work on every platform and in every browser.
    /// Returns whether it acted, which decides if the key is consumed (plan 3.11). A focused
    /// `TextInput` (Phase I7) owns these keys for its own text and must be excluded here.
    pub(crate) fn run_selection_key(&mut self, key: &Gd<InputEventKey>, echo: bool) -> bool {
        if echo {
            return false;
        }
        let key = as_keyboard_event(key);
        let keycode = key.get_keycode();
        let (ctrl, alt, shift, meta) = (
            key.is_ctrl_pressed(),
            key.is_alt_pressed(),
            key.is_shift_pressed(),
            key.is_meta_pressed(),
        );
        if key.is_action_ex("ui_copy").exact_match(true).done()
            || is_selection_chord(keycode, ctrl, alt, shift, meta, Key::C)
        {
            return self.copy_selection();
        }
        if key
            .is_action_ex("ui_text_select_all")
            .exact_match(true)
            .done()
            || is_selection_chord(keycode, ctrl, alt, shift, meta, Key::A)
        {
            return self.select_all_text();
        }
        false
    }

    /// Put the selected text on the clipboard, the selected nodes' text joined by `\n`. Returns whether
    /// there was anything to copy.
    fn copy_selection(&mut self) -> bool {
        if !self.selecting.selection.is_active() {
            return false;
        }
        let Some(document) = self.current_selection_document() else {
            return false;
        };
        let text = match self
            .selecting
            .selection
            .selected_text(&document, |tag| self.selection_text_of(tag))
        {
            Ok(text) => text,
            Err(error) => {
                godot_error!("ReactUiRoot: cannot copy the selection: {error}");
                return false;
            }
        };
        if text.is_empty() {
            return false;
        }
        crate::clipboard::write(&text);
        true
    }

    /// Select all selectable text. Returns whether there is any.
    fn select_all_text(&mut self) -> bool {
        let Some(document) = self.current_selection_document() else {
            return false;
        };
        match self.selecting.selection.select_all(&document) {
            Ok(changed) => {
                if changed {
                    self.selection_changed(Some(&document));
                }
            }
            Err(error) => {
                godot_error!("ReactUiRoot: cannot select all: {error}");
                return false;
            }
        }
        self.selecting.selection.is_active()
    }

    // ---- Queries -----------------------------------------------------------------------------------

    /// The selection as JSON for `get_selection()`: `null` for none, else
    /// `{"anchor": {"tag", "offset"}, "focus": {"tag", "offset"}, "isCollapsed", "text"}` with offsets in
    /// UTF-16 code units, the unit JS counts string positions in.
    pub(crate) fn selection_json(&mut self) -> Value {
        if !self.selecting.selection.is_active() {
            return Value::Null;
        }
        let Some(document) = self.current_selection_document() else {
            return Value::Null;
        };
        let (Some(anchor), Some(focus)) = (
            self.selecting.selection.anchor(),
            self.selecting.selection.focus(),
        ) else {
            return Value::Null;
        };
        let point = |point: SelectionPoint| -> Result<Value, String> {
            let text = self
                .selection_text_of(point.tag)
                .ok_or_else(|| format!("node {} has no text", point.tag))?;
            let offset = code_point_to_utf16(text.chars(), point.offset)
                .map_err(|error| format!("node {}: {error}", point.tag))?;
            Ok(json!({"tag": point.tag, "offset": offset}))
        };
        let text = self
            .selecting
            .selection
            .selected_text(&document, |tag| self.selection_text_of(tag))
            .map_err(|error| error.to_string());
        match (point(anchor), point(focus), text) {
            (Ok(anchor), Ok(focus), Ok(text)) => json!({
                "anchor": anchor, "focus": focus,
                "isCollapsed": self.selecting.selection.is_collapsed(), "text": text,
            }),
            (anchor, focus, text) => {
                let error = [anchor.err(), focus.err(), text.err()]
                    .into_iter()
                    .flatten()
                    .collect::<Vec<_>>()
                    .join("; ");
                godot_error!("ReactUiRoot: cannot describe the selection: {error}");
                Value::Null
            }
        }
    }

    /// Whether a primary press must not release Godot key focus: a selection holds it for the keys
    /// that copy and select (plan 3.11).
    pub(crate) fn selection_holds_key_focus(&self) -> bool {
        self.selecting.is_active()
    }
}

/// Whether a key press with `keycode` and modifiers `(ctrl, alt, shift, meta)` is the `Ctrl` or
/// `Meta` (`Cmd`) chord for `target` (`Key::C` for copy, `Key::A` for select all).
fn is_selection_chord(
    keycode: Key,
    ctrl: bool,
    alt: bool,
    shift: bool,
    meta: bool,
    target: Key,
) -> bool {
    keycode == target && (ctrl || meta) && !alt && !shift
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(x: f32, y: f32, width: f32, height: f32) -> BoxRect {
        BoxRect {
            x,
            y,
            width,
            height,
        }
    }

    const FIRST: u32 = 1;
    const SECOND: u32 = 2;
    const THIRD: u32 = 3;

    /// Three paragraphs stacked down the page, 100 wide, 40 tall, 10 apart.
    fn column() -> Vec<(u32, BoxRect)> {
        vec![
            (FIRST, rect(10.0, 10.0, 100.0, 40.0)),
            (SECOND, rect(10.0, 60.0, 100.0, 40.0)),
            (THIRD, rect(10.0, 110.0, 100.0, 40.0)),
        ]
    }

    #[test]
    fn a_pointer_inside_a_box_targets_that_box() {
        assert_eq!(
            drag_target(&column(), Vector2::new(50.0, 80.0)),
            Some(DragTarget::Inside(SECOND))
        );
    }

    #[test]
    fn a_pointer_in_the_gap_between_blocks_targets_the_start_of_the_next() {
        assert_eq!(
            drag_target(&column(), Vector2::new(50.0, 55.0)),
            Some(DragTarget::StartOf(SECOND))
        );
    }

    #[test]
    fn a_pointer_above_everything_targets_the_start_of_the_first() {
        assert_eq!(
            drag_target(&column(), Vector2::new(50.0, 2.0)),
            Some(DragTarget::StartOf(FIRST))
        );
    }

    #[test]
    fn a_pointer_below_everything_targets_the_end_of_the_last() {
        assert_eq!(
            drag_target(&column(), Vector2::new(50.0, 400.0)),
            Some(DragTarget::EndOf(THIRD))
        );
    }

    #[test]
    fn on_a_line_a_pointer_left_of_a_box_is_before_it_and_right_of_it_after() {
        let row = vec![
            (FIRST, rect(10.0, 10.0, 50.0, 20.0)),
            (SECOND, rect(80.0, 10.0, 50.0, 20.0)),
        ];
        // In the gap between the two on their line: the start of the second.
        assert_eq!(
            drag_target(&row, Vector2::new(70.0, 20.0)),
            Some(DragTarget::StartOf(SECOND))
        );
        // Left of both: the start of the first.
        assert_eq!(
            drag_target(&row, Vector2::new(2.0, 20.0)),
            Some(DragTarget::StartOf(FIRST))
        );
        // Right of both on their line: the end of the last.
        assert_eq!(
            drag_target(&row, Vector2::new(300.0, 20.0)),
            Some(DragTarget::EndOf(SECOND))
        );
    }

    #[test]
    fn the_right_and_bottom_edges_are_outside_a_box() {
        let boxes = vec![(FIRST, rect(0.0, 0.0, 10.0, 10.0))];
        assert_eq!(
            drag_target(&boxes, Vector2::new(10.0, 5.0)),
            Some(DragTarget::EndOf(FIRST))
        );
        assert_eq!(
            drag_target(&boxes, Vector2::new(5.0, 10.0)),
            Some(DragTarget::EndOf(FIRST))
        );
        assert_eq!(
            drag_target(&boxes, Vector2::new(9.9, 9.9)),
            Some(DragTarget::Inside(FIRST))
        );
    }

    #[test]
    fn with_nothing_selectable_there_is_no_target() {
        assert_eq!(drag_target(&[], Vector2::new(5.0, 5.0)), None);
    }

    /// A selection over the first and second nodes, and what they paint of it.
    fn selected_state() -> SelectionState {
        let document = Document::new(vec![
            SelectableNode {
                tag: FIRST,
                len: 4,
                selectable: true,
            },
            SelectableNode {
                tag: SECOND,
                len: 6,
                selectable: true,
            },
            SelectableNode {
                tag: THIRD,
                len: 5,
                selectable: true,
            },
        ])
        .expect("distinct tags");
        let mut state = SelectionState::default();
        let anchor = SelectionPoint {
            tag: FIRST,
            offset: 0,
        };
        let focus = SelectionPoint {
            tag: SECOND,
            offset: 6,
        };
        state
            .selection
            .select(&document, anchor, focus)
            .expect("valid ends");
        state.highlights = BTreeMap::from([(FIRST, (0, 4)), (SECOND, (0, 6))]);
        state
    }

    #[test]
    fn a_changed_covered_node_drops_the_highlights_with_the_selection() {
        // "1000" becoming "999": the commit paints before the selection is settled, so a highlight that
        // outlived the model would be placed on the shorter text.
        let mut state = selected_state();
        let repaint = state.node_changed(FIRST);
        assert!(!state.is_active(), "the selection is cleared");
        assert!(
            state.cleared_by_change,
            "and settling it sends the selectionchange"
        );
        assert_eq!(
            state.highlight_of(FIRST),
            None,
            "the changed node paints nothing of it"
        );
        assert_eq!(state.highlight_of(SECOND), None, "nor does any other");
        assert_eq!(
            repaint,
            [FIRST, SECOND],
            "every node that painted one repaints"
        );
    }

    #[test]
    fn a_change_outside_the_selection_leaves_it_and_its_highlights_alone() {
        let mut state = selected_state();
        let repaint = state.node_changed(THIRD);
        assert!(state.is_active() && !state.cleared_by_change);
        assert_eq!(state.highlight_of(FIRST), Some((0, 4)));
        assert!(repaint.is_empty());
    }

    #[test]
    fn selection_chord_accepts_both_ctrl_and_meta_without_alt_or_shift() {
        assert!(is_selection_chord(Key::C, true, false, false, false, Key::C));
        assert!(is_selection_chord(Key::C, false, false, false, true, Key::C));
        assert!(is_selection_chord(Key::A, true, false, false, false, Key::A));
        assert!(is_selection_chord(Key::A, false, false, false, true, Key::A));
        assert!(!is_selection_chord(Key::C, false, false, false, false, Key::C));
        assert!(!is_selection_chord(Key::C, true, true, false, false, Key::C));
        assert!(!is_selection_chord(Key::C, true, false, true, false, Key::C));
        assert!(!is_selection_chord(Key::X, true, false, false, false, Key::C));
    }
}
