//! Touch text selection in the mounted tree (plan D71, `docs/tracks/touch-selection.md`): the glue between the Godot-free gesture and
//! chrome model (`touch_selection.rs`), the document selection (`selection_input.rs`), the text inputs' own selections
//! (`text_input_godot/`), the touch pipeline (`pointer_input.rs`, `scroll_input.rs`) and the canvas items that draw the handles and the
//! edit menu.
//!
//! A finger that goes down on selectable text, or on a text input, may become a long press: it is one if it stays within the slop for
//! [`TOUCH_SELECT_HOLD_MS`]. The word under it is then selected, its pointer events end with `pointercancel` as a drag's do, and the
//! finger, still down, extends the selection from the word. A finger that moves first is a pan or a tap, which is what it was.
//!
//! A selection made by a touch has handles at its ends and a menu beside it, the root's own chrome: drawn into one top-most item, hit
//! tested before the mounted tree, and no element's. Dragging a handle moves that end of the selection (one character at a time, never
//! collapsing it, and flipping when it crosses the other end) and scrolls the containers around the finger at their edges, as a drag
//! does. The chrome follows the text when it scrolls, and goes when the selection does or when a tap lands anywhere else.

use std::cmp::Ordering;

use godot::builtin::{Color, Corner, Rect2, Vector2};
use godot::classes::{Font, RenderingServer, StyleBoxFlat};
use godot::prelude::*;
use serde_json::{Value, json};

use crate::geometry::BoxRect;
use crate::paint::parse_color;
use crate::props::Kind;
use crate::render_tree::{DEFAULT_SELECTION_COLOR, GHOST_DRAW_INDEX, Oversampling, RootItem};
use crate::scroll::{Rect, TOUCH_SLOP_PX, Vec2, autoscroll_velocity, exceeds_slop};
use crate::scroll_input::{to_scroll, to_vector};
use crate::selection::SelectionPoint;
use crate::text_input::EditCommand;
use crate::text_layout::TextDirection;
use crate::text_span::offsets::Side;
use crate::touch_selection::{
    Area, ChromeHit, ChromeLayout, Edge, HANDLE_BALL_RADIUS_PX, Handle, HandleEnd, Hold,
    MENU_DIVIDER_WIDTH_PX, MENU_FONT_SIZE_PX, MENU_HEIGHT_PX, MENU_RADIUS_PX, MenuAction,
    MenuContext, dragged_point, grab_offset, layout_menu, menu_actions,
};
use crate::{ReactUiRoot, event_time_ms};

/// The chrome draws above the drag ghost.
const TOUCH_CHROME_DRAW_INDEX: i32 = GHOST_DRAW_INDEX + 1;

/// The menu's paint: slate-900 with white labels, slate-700 where a finger presses a segment and between segments.
const MENU_BACKGROUND: &str = "#0f172a";
const MENU_LABEL: &str = "#ffffff";
const MENU_PRESSED: &str = "#334155";
const MENU_DIVIDER: &str = "#475569";
/// The soft shadow under the menu, in logical pixels.
const MENU_SHADOW_COLOR: Color = Color::from_rgba(0.0, 0.0, 0.0, 0.3);
const MENU_SHADOW_SIZE_PX: i32 = 6;
const MENU_SHADOW_OFFSET_Y_PX: f32 = 2.0;
/// A segment's divider stops this far short of the menu's top and bottom edges.
const MENU_DIVIDER_INSET_PX: f32 = 9.0;
/// The ring round a handle's ball, so it shows over any background.
const HANDLE_RING_COLOR: Color = Color::from_rgba(1.0, 1.0, 1.0, 0.95);
const HANDLE_RING_WIDTH_PX: i32 = 1;
/// How far inside a clip a selection end still counts as in view (an end exactly at a container's edge is).
const VISIBLE_TOLERANCE_PX: f32 = 1.0;

/// What the selection a touch made lives in.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Owner {
    /// The document's selection of `Text`.
    Document,
    /// The selection inside the text input with this tag.
    Input(u32),
}

/// The end of a selection a gesture holds still.
#[derive(Clone, Copy, Debug, PartialEq)]
enum Fixed {
    Document(SelectionPoint),
    Input(usize),
}

/// The word a long press selected, which the finger that is still down extends from.
#[derive(Clone, Copy, Debug, PartialEq)]
enum Word {
    Document(SelectionPoint, SelectionPoint),
    Input(usize, usize),
}

/// What a finger that began on the chrome, or as a long press, is doing.
#[derive(Clone, Copy, Debug, PartialEq)]
enum Gesture {
    /// The long press has selected a word and the finger is still down: where it goes, the selection grows from the word.
    Extending { pointer: u32, word: Word },
    /// A finger dragging a handle: the end that stays, and where the handle was against the finger when it went down.
    Handle {
        pointer: u32,
        fixed: Fixed,
        grab: Vec2,
    },
    /// A finger on a menu segment: the action runs if it lifts over it.
    Menu { pointer: u32, action: MenuAction },
}

impl Gesture {
    fn pointer(self) -> u32 {
        match self {
            Gesture::Extending { pointer, .. }
            | Gesture::Handle { pointer, .. }
            | Gesture::Menu { pointer, .. } => pointer,
        }
    }

    /// Whether the gesture changes the selection (the menu steps aside while it does).
    fn moves_selection(self) -> bool {
        !matches!(self, Gesture::Menu { .. })
    }
}

/// A finger down on selectable text that may become a long press.
#[derive(Clone, Copy, Debug)]
struct PendingHold {
    hold: Hold,
    hit: u32,
}

/// A press in the text input that holds the touch selection: the caret goes where the finger lifts, if it was a tap, so a swipe
/// (a scroll of the text) keeps the selection.
#[derive(Clone, Copy, Debug)]
struct DeferredCaret {
    pointer: u32,
    tag: u32,
    position: Vector2,
    detail: u32,
}

/// What the chrome item last drew; equal keys mean the recorded commands are still right.
#[derive(Clone, Debug, PartialEq)]
struct Painted {
    layout: ChromeLayout,
    color: Color,
    pressed: Option<ChromeHit>,
    oversampling: Oversampling,
}

/// Everything touch selection keeps beside the selections themselves.
#[derive(Default)]
pub(crate) struct TouchSelectionState {
    hold: Option<PendingHold>,
    gesture: Option<Gesture>,
    /// Where the finger of the gesture is now, root-local.
    finger: Vector2,
    owner: Option<Owner>,
    /// What is on screen, for the hit test of the next press.
    layout: Option<ChromeLayout>,
    painted: Option<Painted>,
    item: Option<RootItem>,
    shape_style: Option<Gd<StyleBoxFlat>>,
    menu_style: Option<Gd<StyleBoxFlat>>,
    /// Copy was pressed: the menu stays away until the selection changes.
    menu_dismissed: bool,
    /// A pan or a flick is scrolling: the menu stays away until it stops.
    scroll_suppressed: bool,
    deferred_caret: Option<DeferredCaret>,
    /// Where the first finger went down while a touch selection existed, to tell a tap that clears it from a pan.
    tap_origin: Option<(u32, Vec2)>,
}

impl TouchSelectionState {
    /// Free the canvas items (the root is being freed).
    pub(crate) fn release(&mut self) {
        self.item = None;
        self.painted = None;
        self.layout = None;
    }
}

/// What is selected, where its ends are and what the menu may offer.
struct Subject {
    start: (Edge, bool),
    end: (Edge, bool),
    color: Color,
    context: MenuContext,
}

impl ReactUiRoot {
    // ---- Queries --------------------------------------------------------------------------------------

    /// Whether the chrome of a touch selection covers `point` (root-local): the root receives a pointer there even over nothing.
    pub(crate) fn touch_chrome_hit(&self, point: Vector2) -> bool {
        self.touch_selection
            .layout
            .as_ref()
            .is_some_and(|layout| layout.hit(to_scroll(point)).is_some())
    }

    /// Whether a touch selection of the document exists: a touch press does not clear it, a tap does (plan D71).
    pub(crate) fn touch_selection_holds_document(&self) -> bool {
        self.touch_selection.owner == Some(Owner::Document)
    }

    /// Whether the root needs `process()` frames for touch selection: a hold to time out, a finger at a container's edge, or a menu
    /// waiting for a scroll to stop.
    pub(crate) fn touch_selection_wants_frames(&self) -> bool {
        self.touch_selection.hold.is_some()
            || self.touch_selection.scroll_suppressed
            || (self
                .touch_selection
                .gesture
                .is_some_and(Gesture::moves_selection)
                && !self.touch_autoscroll().is_empty())
    }

    // ---- Presses --------------------------------------------------------------------------------------

    /// A finger went down. Returns whether it went down on the chrome of a touch selection, which is the root's own: no element hears of
    /// it.
    pub(crate) fn touch_chrome_press(&mut self, id: u32, position: Vector2) -> bool {
        let Some(layout) = self.touch_selection.layout.as_ref() else {
            return false;
        };
        let Some(hit) = layout.hit(to_scroll(position)) else {
            return false;
        };
        let gesture = match hit {
            ChromeHit::Menu(action) => Gesture::Menu {
                pointer: id,
                action,
            },
            ChromeHit::Handle(end) => {
                let Some(handle) = layout.handle(end).copied() else {
                    return false;
                };
                let Some(fixed) = self.fixed_end_for(end) else {
                    return false;
                };
                Gesture::Handle {
                    pointer: id,
                    fixed,
                    grab: grab_offset(&handle, to_scroll(position)),
                }
            }
        };
        self.touch_selection.gesture = Some(gesture);
        self.touch_selection.finger = position;
        self.sync_touch_chrome();
        true
    }

    /// A finger went down on `hit` and nothing took it: if that is selectable text, a text input, it may become a long press.
    pub(crate) fn touch_selection_arm_hold(
        &mut self,
        id: u32,
        position: Vector2,
        hit: Option<u32>,
    ) {
        self.touch_selection.hold = None;
        if self.touch_selection.owner.is_some() {
            self.touch_selection.tap_origin = Some((id, to_scroll(position)));
        }
        let Some(hit) = hit.filter(|tag| self.touch_selectable(*tag)) else {
            return;
        };
        self.touch_selection.hold = Some(PendingHold {
            hold: Hold::new(id, to_scroll(position), event_time_ms()),
            hit,
        });
        self.update_process();
    }

    /// Whether a long press on `tag` selects text: selectable `Text`, or a text input that is not secure and not composing.
    fn touch_selectable(&self, tag: u32) -> bool {
        let Some(node) = self.mounted.nodes.get(&tag) else {
            return false;
        };
        match node.kind {
            Kind::Text => self.is_selectable_text(tag),
            Kind::TextInput => {
                !self.mounted.is_disabled(tag)
                    && node.text_input.as_ref().is_some_and(|state| {
                        !state.buffer.config().secure && state.buffer.composition().is_none()
                    })
            }
            Kind::View | Kind::Button => false,
        }
    }

    /// A press on the text input that holds the touch selection waits for the finger to lift (see [`DeferredCaret`]). Returns whether it
    /// waits.
    pub(crate) fn touch_defers_caret(
        &mut self,
        id: u32,
        hit: Option<u32>,
        position: Vector2,
        detail: u32,
    ) -> bool {
        let Some(tag) = hit else {
            return false;
        };
        if self.touch_selection.owner != Some(Owner::Input(tag)) || self.focused != Some(tag) {
            return false;
        }
        self.touch_selection.deferred_caret = Some(DeferredCaret {
            pointer: id,
            tag,
            position,
            detail,
        });
        true
    }

    // ---- Moves ----------------------------------------------------------------------------------------

    /// A finger moved. Returns whether a touch selection gesture took the movement: a long press that has selected a word, a handle, a
    /// menu segment. A finger that was waiting to be a long press stops waiting once it leaves the slop, and goes on as a pan or a tap.
    pub(crate) fn touch_selection_moved(&mut self, id: u32, position: Vector2) -> bool {
        if let Some(pending) = self.touch_selection.hold
            && pending.hold.pointer == id
        {
            if pending.hold.is_broken_by(to_scroll(position)) {
                self.touch_selection.hold = None;
            }
            return false;
        }
        let Some(gesture) = self
            .touch_selection
            .gesture
            .filter(|gesture| gesture.pointer() == id)
        else {
            return false;
        };
        self.touch_selection.finger = position;
        match gesture {
            Gesture::Extending { .. } | Gesture::Handle { .. } => self.apply_finger(),
            // The segment looks pressed only while the finger is over it.
            Gesture::Menu { .. } => self.sync_touch_chrome(),
        }
        true
    }

    /// Move the selection to where the finger of the gesture is.
    fn apply_finger(&mut self) {
        let Some(gesture) = self.touch_selection.gesture else {
            return;
        };
        let (Some(owner), finger) = (self.touch_selection.owner, self.touch_selection.finger)
        else {
            return;
        };
        match gesture {
            Gesture::Extending { word, .. } => self.extend_from_word(owner, word, finger),
            Gesture::Handle { fixed, grab, .. } => {
                let target = dragged_point(to_scroll(finger), grab);
                self.move_selection_end(owner, fixed, to_vector(target));
            }
            Gesture::Menu { .. } => {}
        }
    }

    /// The finger of a long press is at `finger`: the selection runs from the word to it, whichever side of the word it is on.
    fn extend_from_word(&mut self, owner: Owner, word: Word, finger: Vector2) {
        match (owner, word) {
            (Owner::Document, Word::Document(start, end)) => {
                let Some(document) = self.current_selection_document() else {
                    return;
                };
                let hit = self.mounted.hit_test(finger);
                let Some(point) = self.drag_point(&document, hit, finger) else {
                    return;
                };
                let (anchor, focus) =
                    match (document.compare(point, start), document.compare(point, end)) {
                        (Some(Ordering::Less | Ordering::Equal), _) => (end, point),
                        (_, Some(Ordering::Greater | Ordering::Equal)) => (start, point),
                        _ => (start, end),
                    };
                if anchor == focus {
                    return;
                }
                if let Err(error) = self.select_points(&document, anchor, focus) {
                    godot_error!("ReactUiRoot: cannot extend the selection: {error}");
                }
            }
            (Owner::Input(tag), Word::Input(start, end)) => {
                let Ok(offset) = self.text_offset_at(tag, finger) else {
                    return;
                };
                let (anchor, focus) = if offset <= start {
                    (end, offset)
                } else if offset >= end {
                    (start, offset)
                } else {
                    (start, end)
                };
                self.set_input_selection(tag, anchor, focus);
            }
            _ => {}
        }
    }

    /// Move the end of the selection that is not `fixed` to the text at `target` (root-local). A move that would collapse the selection
    /// does nothing: the handles keep at least one character selected, and cross each other where the text goes the other way.
    fn move_selection_end(&mut self, owner: Owner, fixed: Fixed, target: Vector2) {
        match (owner, fixed) {
            (Owner::Document, Fixed::Document(fixed)) => {
                let Some(document) = self.current_selection_document() else {
                    return;
                };
                let hit = self.mounted.hit_test(target);
                let Some(point) = self.drag_point(&document, hit, target) else {
                    return;
                };
                if point == fixed {
                    return;
                }
                if let Err(error) = self.select_points(&document, fixed, point) {
                    godot_error!("ReactUiRoot: cannot move the handle: {error}");
                }
            }
            (Owner::Input(tag), Fixed::Input(fixed)) => {
                let Ok(offset) = self.text_offset_at(tag, target) else {
                    return;
                };
                if offset != fixed {
                    self.set_input_selection(tag, fixed, offset);
                }
            }
            _ => {}
        }
    }

    /// Select `anchor..focus` in text input `tag`, if that is not the selection already.
    fn set_input_selection(&mut self, tag: u32, anchor: usize, focus: usize) {
        let Some(state) = self.text_state(tag) else {
            return;
        };
        if (state.buffer.anchor(), state.buffer.focus()) != (anchor, focus) {
            self.run_internal_command(tag, EditCommand::SetSelection { anchor, focus });
        }
    }

    // ---- Releases -------------------------------------------------------------------------------------

    /// A finger lifted. Returns whether a touch selection gesture owned it (nothing else hears of it); a finger that was only waiting to
    /// be a long press stops waiting and is somebody else's.
    pub(crate) fn touch_selection_released(&mut self, id: u32, position: Vector2) -> bool {
        if self
            .touch_selection
            .hold
            .is_some_and(|pending| pending.hold.pointer == id)
        {
            self.touch_selection.hold = None;
            return false;
        }
        let Some(gesture) = self
            .touch_selection
            .gesture
            .filter(|gesture| gesture.pointer() == id)
        else {
            return false;
        };
        self.touch_selection.gesture = None;
        match gesture {
            Gesture::Menu { action, .. } => {
                let over = self
                    .touch_selection
                    .layout
                    .as_ref()
                    .and_then(|layout| layout.menu.as_ref())
                    .and_then(|menu| menu.action_at(to_scroll(position)))
                    == Some(action);
                if over {
                    self.run_menu_action(action);
                }
            }
            Gesture::Extending { .. } | Gesture::Handle { .. } => {
                // The soft keyboard went away with the finger's first touch of the canvas, and comes back with its lift.
                if let Some(Owner::Input(tag)) = self.touch_selection.owner {
                    self.show_virtual_keyboard(tag);
                }
            }
        }
        self.sync_touch_chrome();
        true
    }

    /// The OS cancelled a touch, or the root lost the window's focus: a gesture ends where it is.
    pub(crate) fn touch_selection_cancelled(&mut self, id: u32) {
        if self
            .touch_selection
            .hold
            .is_some_and(|pending| pending.hold.pointer == id)
        {
            self.touch_selection.hold = None;
        }
        if self
            .touch_selection
            .gesture
            .is_some_and(|gesture| gesture.pointer() == id)
        {
            self.touch_selection.gesture = None;
            self.sync_touch_chrome();
        }
        self.touch_selection.forget_finger(id);
        self.update_process();
    }

    /// Every finger is gone (the root left the tree or the window lost focus).
    pub(crate) fn touch_selection_cancel_all(&mut self) {
        self.touch_selection.hold = None;
        self.touch_selection.deferred_caret = None;
        self.touch_selection.tap_origin = None;
        if self.touch_selection.gesture.take().is_some() {
            self.sync_touch_chrome();
        }
    }

    /// A finger lifted after a tap in the tree (it neither panned nor dragged nor began a gesture): `pointer` ended at `position`. A tap
    /// that goes anywhere but a handle or the menu ends the touch selection; the caret a deferred press owes goes where the finger lifted.
    pub(crate) fn touch_selection_tapped(&mut self, pointer: u32, position: Vector2) {
        if let Some(deferred) = self
            .touch_selection
            .deferred_caret
            .take_if(|deferred| deferred.pointer == pointer)
        {
            self.text_input_pointer_down(
                Some(deferred.tag),
                deferred.position,
                deferred.detail,
                false,
                false,
            );
        }
        let Some((_, origin)) = self
            .touch_selection
            .tap_origin
            .take_if(|(id, _)| *id == pointer)
        else {
            return;
        };
        if exceeds_slop(to_scroll(position) - origin, TOUCH_SLOP_PX) {
            return;
        }
        if self.touch_selection.owner == Some(Owner::Document) {
            self.touch_selection.owner = None;
            self.clear_selection_command();
            self.release_key_focus_without_element();
        }
        self.sync_touch_chrome();
    }

    /// Whatever the finger `id` left is forgotten (it lifted, by a path that does not tap).
    pub(crate) fn touch_selection_lifted(&mut self, id: u32) {
        self.touch_selection.forget_finger(id);
    }

    /// A mouse press makes a mouse's selection or none: the touch selection and its chrome are gone.
    pub(crate) fn touch_selection_mouse_pressed(&mut self) {
        if self.touch_selection.owner.take().is_some() {
            self.touch_selection.gesture = None;
            self.sync_touch_chrome();
        }
    }

    // ---- The long press -------------------------------------------------------------------------------

    /// One frame: a hold that has elapsed selects its word, and a finger at the edge of a scroll container scrolls it. Called from
    /// `process`, which is not an input callback, so what it queued is delivered here.
    pub(crate) fn tick_touch_selection(&mut self, delta: f64) {
        if self
            .touch_selection
            .hold
            .is_some_and(|pending| pending.hold.is_due(event_time_ms()))
        {
            self.fire_hold();
        }
        let dt = delta as f32;
        for (tag, velocity) in self.touch_autoscroll() {
            let step = Vec2::new(velocity.x * dt, velocity.y * dt);
            self.move_container(tag, |state, ranges| state.scroll_by(ranges, step));
            // What is under the finger changed with the scroll.
            self.apply_finger();
        }
        if self.touch_selection.scroll_suppressed && !self.scrolling.wants_frames() {
            self.touch_selection.scroll_suppressed = false;
            self.sync_touch_chrome();
        }
        self.deliver();
        self.update_process();
    }

    /// The hold elapsed: select the word under the finger, if there is one.
    fn fire_hold(&mut self) {
        let Some(PendingHold { hold, hit }) = self.touch_selection.hold.take() else {
            return;
        };
        let id = hold.pointer;
        // JS may have taken the pointer, or removed the element, since the finger went down.
        let still_down = self.pointers.get(id).is_some_and(|record| record.is_down())
            && !self.pointers.captured_by_js(id);
        if !still_down || !self.mounted.nodes.contains_key(&hit) {
            return;
        }
        let position = to_vector(hold.origin());
        let selected = match self.mounted.nodes.get(&hit).map(|node| node.kind) {
            Some(Kind::Text) => self.select_word_of_text(hit, position),
            Some(Kind::TextInput) => self.select_word_of_input(hit, position),
            Some(Kind::View | Kind::Button) | None => Ok(None),
        };
        let word = match selected {
            Ok(Some(word)) => word,
            // White space or punctuation, or the layout is gone: nothing to select, and the touch goes on as it was.
            Ok(None) => return,
            Err(error) => {
                godot_error!("ReactUiRoot: cannot select the word under the finger: {error}");
                return;
            }
        };
        // The long press takes the finger: its pointer events end, and what could have become a pan will not.
        self.scrolling.pans.remove(&id);
        self.scrolling.stopped_flings.remove(&id);
        self.touch_selection.deferred_caret = None;
        self.cancel_pointer(id);
        self.touch_selection.gesture = Some(Gesture::Extending { pointer: id, word });
        self.touch_selection.finger = position;
        self.touch_selection.menu_dismissed = false;
        self.sync_touch_chrome();
    }

    /// Select the word of `Text` `tag` that `position` is over.
    fn select_word_of_text(&mut self, tag: u32, position: Vector2) -> Result<Option<Word>, String> {
        let Some(document) = self.current_selection_document() else {
            return Err("the selection document cannot be built".to_owned());
        };
        if !document.node(tag).is_some_and(|node| node.selectable) {
            return Ok(None);
        }
        let Some(layout) = self.text_layout_of(tag)? else {
            return Ok(None);
        };
        let local = self
            .mounted
            .to_local(tag, self.viewport_box(), position)
            .ok_or_else(|| format!("node {tag} has no geometry, or a matrix with no inverse"))?;
        let Some((start, end)) = layout
            .word_under(local)
            .map_err(|error| error.to_string())?
        else {
            return Ok(None);
        };
        // The layout counts the node's inlays too; the selection counts its text.
        let (start, end) = match self.offset_map_of(tag) {
            Some(map) => {
                let range = map.source_range(start..end);
                (range.start, range.end)
            }
            None => (start, end),
        };
        let first = SelectionPoint { tag, offset: start };
        let last = SelectionPoint { tag, offset: end };
        self.select_points(&document, first, last)
            .map_err(|error| error.to_string())?;
        self.touch_selection.owner = Some(Owner::Document);
        // Starting a selection takes Godot key focus for the root, so `ui_copy` reaches it (plan 3.11).
        if self.base().is_inside_tree() && !self.base().has_focus() {
            self.base_mut().grab_focus();
        }
        Ok(Some(Word::Document(first, last)))
    }

    /// Select the word of text input `tag` that `position` is over.
    fn select_word_of_input(
        &mut self,
        tag: u32,
        position: Vector2,
    ) -> Result<Option<Word>, String> {
        // The press focused it; JS may have moved focus since.
        if self.focused != Some(tag) {
            return Ok(None);
        }
        let local = self
            .mounted
            .to_local(tag, self.viewport_box(), position)
            .ok_or_else(|| format!("node {tag} has no geometry, or a matrix with no inverse"))?;
        let scrolled = self
            .mounted
            .nodes
            .get(&tag)
            .map_or(Vector2::ZERO, |node| to_vector(node.scroll.offset));
        let layout = self.buffer_layout(tag).map_err(|error| error.to_string())?;
        let Some((start, end)) = layout
            .word_under(local + scrolled)
            .map_err(|error| error.to_string())?
        else {
            return Ok(None);
        };
        self.run_internal_command(
            tag,
            EditCommand::SetSelection {
                anchor: start,
                focus: end,
            },
        );
        self.touch_selection.owner = Some(Owner::Input(tag));
        Ok(Some(Word::Input(start, end)))
    }

    // ---- Autoscroll -----------------------------------------------------------------------------------

    /// The scroll containers the finger of a selecting gesture presses against (within the edge band of their visible area, on an axis
    /// that can still move that way), with their velocities in pixels per second: the containers around the element under it, and the
    /// text input being selected in, whose text scrolls to follow its caret and which a single-line input is not a container for.
    fn touch_autoscroll(&self) -> Vec<(u32, Vec2)> {
        let Some(gesture) = self
            .touch_selection
            .gesture
            .filter(|gesture| gesture.moves_selection())
        else {
            return Vec::new();
        };
        let finger = match gesture {
            Gesture::Handle { grab, .. } => {
                to_vector(dragged_point(to_scroll(self.touch_selection.finger), grab))
            }
            Gesture::Extending { .. } | Gesture::Menu { .. } => self.touch_selection.finger,
        };
        let mut tags = self
            .mounted
            .hit_test(finger)
            .map(|start| self.scroll_path(start))
            .unwrap_or_default();
        if let Some(Owner::Input(tag)) = self.touch_selection.owner
            && !tags.contains(&tag)
        {
            tags.push(tag);
        }
        let viewport = self.viewport_box();
        tags.into_iter()
            .filter_map(|tag| {
                let node = self.mounted.nodes.get(&tag)?;
                let in_frame = self.mounted.to_local(tag, viewport, finger)?;
                let client = node.geometry.padding_box();
                let visible = Rect::new(client.x, client.y, client.width, client.height);
                let velocity = autoscroll_velocity(
                    to_scroll(in_frame),
                    visible,
                    &node.geometry.scroll_ranges,
                    node.scroll.offset,
                );
                (velocity != Vec2::ZERO).then_some((tag, velocity))
            })
            .collect()
    }

    /// Something scrolled: the chrome follows the text, and the menu steps aside while a pan or a flick is under way.
    pub(crate) fn touch_selection_scrolled(&mut self) {
        if self.touch_selection.owner.is_none() {
            return;
        }
        if self.scrolling.wants_frames() {
            self.touch_selection.scroll_suppressed = true;
            self.update_process();
        }
        self.sync_touch_chrome();
    }

    // ---- The edit menu --------------------------------------------------------------------------------

    fn run_menu_action(&mut self, action: MenuAction) {
        match (self.touch_selection.owner, action) {
            (Some(Owner::Document), MenuAction::Copy) => {
                self.copy_selection();
                // The selection stays, so it shows what was copied; the menu has done its work.
                self.touch_selection.menu_dismissed = true;
            }
            (Some(Owner::Document), MenuAction::SelectAll) => {
                self.select_all_text();
                self.touch_selection.menu_dismissed = false;
            }
            (Some(Owner::Input(tag)), MenuAction::Copy) => {
                self.run_text_command(tag, EditCommand::Copy);
                self.touch_selection.menu_dismissed = true;
            }
            (Some(Owner::Input(tag)), MenuAction::Cut) => {
                self.run_text_command(tag, EditCommand::Cut);
            }
            (Some(Owner::Input(tag)), MenuAction::Paste) => {
                self.run_text_command(tag, EditCommand::Paste);
            }
            (Some(Owner::Input(tag)), MenuAction::SelectAll) => {
                self.run_internal_command(tag, EditCommand::SelectAll);
                self.touch_selection.menu_dismissed = false;
            }
            // A document has nothing to cut or paste into: the menu does not offer them.
            (Some(Owner::Document), MenuAction::Cut | MenuAction::Paste) | (None, _) => {}
        }
        // The soft keyboard went away with the finger's first touch of the canvas, and comes back with its lift.
        if let Some(Owner::Input(tag)) = self.touch_selection.owner {
            self.show_virtual_keyboard(tag);
        }
    }

    // ---- What is selected, and where ------------------------------------------------------------------

    /// The end the dragged handle `end` leaves where it is.
    fn fixed_end_for(&mut self, end: HandleEnd) -> Option<Fixed> {
        match self.touch_selection.owner? {
            Owner::Document => {
                let document = self.current_selection_document()?;
                let ranges = self.selecting.selection.ranges(&document).ok()?;
                let (first, last) = (ranges.first()?, ranges.last()?);
                Some(Fixed::Document(match end {
                    HandleEnd::Start => SelectionPoint {
                        tag: last.tag,
                        offset: last.end,
                    },
                    HandleEnd::End => SelectionPoint {
                        tag: first.tag,
                        offset: first.start,
                    },
                }))
            }
            Owner::Input(tag) => {
                let range = self.text_state(tag)?.buffer.selection_range();
                Some(Fixed::Input(match end {
                    HandleEnd::Start => range.end,
                    HandleEnd::End => range.start,
                }))
            }
        }
    }

    /// Where the selection's ends are, or `None` when the selection a touch made is gone (and the owner with it).
    fn touch_subject(&mut self) -> Option<Subject> {
        let owner = self.touch_selection.owner?;
        let subject = match owner {
            Owner::Document => self.document_subject(),
            Owner::Input(tag) => self.input_subject(tag),
        };
        if subject.is_none() {
            self.touch_selection.owner = None;
            self.touch_selection.gesture = None;
        }
        subject
    }

    fn document_subject(&mut self) -> Option<Subject> {
        if !self.selecting.selection.is_active() || self.selecting.selection.is_collapsed() {
            return None;
        }
        let document = self.selection_document_or_report()?;
        let ranges = self.selecting.selection.ranges(&document).ok()?;
        let (first, last) = (ranges.first()?, ranges.last()?);
        let selectable: Vec<_> = document.selectable_nodes().collect();
        let all_selected = selectable.first().is_some_and(|node| node.tag == first.tag)
            && first.start == 0
            && selectable.last().is_some_and(|node| node.tag == last.tag)
            && selectable.last().is_some_and(|node| node.len == last.end);
        let start = self
            .text_edge(
                SelectionPoint {
                    tag: first.tag,
                    offset: first.start,
                },
                Side::After,
            )
            .or_report("start")?;
        let end = self
            .text_edge(
                SelectionPoint {
                    tag: last.tag,
                    offset: last.end,
                },
                Side::Before,
            )
            .or_report("end")?;
        Some(Subject {
            start,
            end,
            color: self.handle_color_of(first.tag),
            context: MenuContext {
                editable: false,
                copyable: true,
                has_selection: true,
                all_selected,
            },
        })
    }

    fn input_subject(&mut self, tag: u32) -> Option<Subject> {
        if self.focused != Some(tag) {
            return None;
        }
        let state = self.text_state(tag)?;
        if !state.buffer.has_selection() || state.buffer.composition().is_some() {
            return None;
        }
        let range = state.buffer.selection_range();
        let config = state.buffer.config();
        let context = MenuContext {
            editable: !config.read_only,
            copyable: !config.secure,
            has_selection: true,
            all_selected: range.start == 0 && range.end == state.buffer.text().len(),
        };
        let start = self
            .input_edge(tag, range.start, Side::After)
            .or_report("start")?;
        let end = self
            .input_edge(tag, range.end, Side::Before)
            .or_report("end")?;
        Some(Subject {
            start,
            end,
            color: self.handle_color_of(tag),
            context,
        })
    }

    /// The handles take the selection's own colour, opaque.
    fn handle_color_of(&self, tag: u32) -> Color {
        let color = self
            .mounted
            .nodes
            .get(&tag)
            .and_then(|node| node.computed.selection_color.as_deref())
            .unwrap_or(DEFAULT_SELECTION_COLOR);
        let mut color = parse_color(Some(color), Color::TRANSPARENT_BLACK);
        color.a = 1.0;
        color
    }

    /// The line of `Text` `point.tag` that holds `point`, as a stem in root-local pixels, and whether it is in view.
    fn text_edge(&self, point: SelectionPoint, side: Side) -> Result<(Edge, bool), String> {
        let tag = point.tag;
        let node = self
            .text_node(tag)
            .ok_or_else(|| format!("node {tag} is not a Text"))?;
        let layout = self
            .text_layout_of(tag)?
            .ok_or_else(|| format!("node {tag} has no paragraph"))?;
        let paragraph = node
            .visual
            .paragraph
            .as_ref()
            .ok_or_else(|| format!("node {tag} has no paragraph"))?;
        let display = self
            .offset_map_of(tag)
            .map_or(point.offset, |map| map.display_of(point.offset, side));
        let display_text = paragraph.rich_text().map_or(
            node.visual
                .shown_text(node.props.text.as_deref())
                .unwrap_or(""),
            |rich| rich.display.as_str(),
        );
        let carets = Self::carets_at(&layout, display_text, display, side)?;
        let caret = carets.primary(TextDirection::Ltr);
        let line = layout
            .line(carets.line)
            .map_err(|error| error.to_string())?;
        let rect = self.text_rect_to_root(
            tag,
            Rect2::new(
                Vector2::new(caret.x, line.top()),
                Vector2::new(0.0, line.height()),
            ),
        )?;
        self.edge_in_view(tag, rect)
    }

    /// The line of text input `tag` that holds `offset`, as a stem in root-local pixels, and whether it is in view.
    fn input_edge(&self, tag: u32, offset: usize, side: Side) -> Result<(Edge, bool), String> {
        let state = self
            .text_state(tag)
            .ok_or_else(|| format!("node {tag} is not a text input"))?;
        let layout = self
            .display_layout(tag)
            .map_err(|error| error.to_string())?;
        let text = state.buffer.value();
        let carets = Self::carets_at(&layout, &text, offset, side)?;
        let caret = carets.primary(state.input_direction);
        let line = layout
            .line(carets.line)
            .map_err(|error| error.to_string())?;
        let scrolled = self
            .mounted
            .nodes
            .get(&tag)
            .map_or(Vector2::ZERO, |node| to_vector(node.scroll.offset));
        let affine = self
            .mounted
            .absolute_affine(tag, self.viewport_box())
            .ok_or_else(|| format!("node {tag} is not placed"))?;
        let rect = affine.bounds_of(BoxRect {
            x: caret.x - scrolled.x,
            y: line.top() - scrolled.y,
            width: 0.0,
            height: line.height(),
        });
        self.edge_in_view(tag, rect)
    }

    /// `rect` (a stem, zero wide) of node `tag`'s text as an [`Edge`], and whether its middle is inside every clip around the node, the
    /// node's own box and the root.
    fn edge_in_view(&self, tag: u32, rect: BoxRect) -> Result<(Edge, bool), String> {
        let edge = Edge {
            x: rect.x,
            top: rect.y,
            bottom: rect.y + rect.height,
        };
        let (own, clip) = self
            .mounted
            .absolute_geometry(tag, self.viewport_box())
            .ok_or_else(|| format!("node {tag} is not placed"))?;
        let middle = Vector2::new(edge.x, (edge.top + edge.bottom) / 2.0);
        let inside = |area: BoxRect| {
            middle.x >= area.x - VISIBLE_TOLERANCE_PX
                && middle.x <= area.x + area.width + VISIBLE_TOLERANCE_PX
                && middle.y >= area.y - VISIBLE_TOLERANCE_PX
                && middle.y <= area.y + area.height + VISIBLE_TOLERANCE_PX
        };
        // A text input clips its text to its own box; `Text` is no wider than its box.
        let visible = inside(self.viewport_box()) && inside(own) && clip.is_none_or(inside);
        Ok((edge, visible))
    }

    // ---- The chrome -----------------------------------------------------------------------------------

    /// Place and draw the handles and the menu for the selection a touch made, or take them away when it is gone. Does nothing, and
    /// costs nothing, while no touch selection exists.
    pub(crate) fn sync_touch_chrome(&mut self) {
        if self.touch_selection.owner.is_none() && self.touch_selection.painted.is_none() {
            return;
        }
        let placed = self.touch_subject().map(|subject| {
            let layout = self.chrome_layout_for(&subject);
            (layout, subject.color)
        });
        self.paint_touch_chrome(placed);
    }

    fn chrome_layout_for(&self, subject: &Subject) -> ChromeLayout {
        let handle =
            |end: HandleEnd, (edge, visible): (Edge, bool)| visible.then_some(Handle { end, edge });
        let start = handle(HandleEnd::Start, subject.start);
        let end = handle(HandleEnd::End, subject.end);
        let menu_wanted = !self.touch_selection.menu_dismissed
            && !self.touch_selection.scroll_suppressed
            && !self
                .touch_selection
                .gesture
                .is_some_and(Gesture::moves_selection);
        let menu = if menu_wanted {
            let actions = menu_actions(subject.context);
            let labels: Vec<(MenuAction, f32)> = actions
                .iter()
                .map(|action| (*action, self.menu_label_width(*action)))
                .collect();
            let visible: Vec<Edge> = start
                .iter()
                .chain(end.iter())
                .map(|handle| handle.edge)
                .collect();
            let viewport = self.viewport_box();
            layout_menu(
                &labels,
                &visible,
                Area::new(viewport.x, viewport.y, viewport.width, viewport.height),
            )
        } else {
            None
        };
        ChromeLayout { start, end, menu }
    }

    fn menu_label_width(&self, action: MenuAction) -> f32 {
        self.font.as_ref().map_or(0.0, |font| {
            font.get_string_size_ex(action.label())
                .font_size(MENU_FONT_SIZE_PX)
                .done()
                .x
        })
    }

    /// What the finger on the menu is pressing, while it is over that segment.
    fn pressed_chrome(&self, layout: &ChromeLayout) -> Option<ChromeHit> {
        let Some(Gesture::Menu { action, .. }) = self.touch_selection.gesture else {
            return None;
        };
        let over = layout
            .menu
            .as_ref()
            .and_then(|menu| menu.action_at(to_scroll(self.touch_selection.finger)));
        (over == Some(action)).then_some(ChromeHit::Menu(action))
    }

    fn paint_touch_chrome(&mut self, placed: Option<(ChromeLayout, Color)>) {
        let Some((layout, color)) = placed else {
            self.touch_selection.layout = None;
            if self.touch_selection.painted.take().is_some()
                && let Some(item) = self.touch_selection.item.as_ref()
            {
                item.clear();
            }
            return;
        };
        let pressed = self.pressed_chrome(&layout);
        let oversampling = self.oversampling();
        let painted = Painted {
            layout: layout.clone(),
            color,
            pressed,
            oversampling,
        };
        self.touch_selection.layout = Some(layout);
        if self.touch_selection.painted.as_ref() == Some(&painted) {
            return;
        }
        self.draw_chrome(&painted);
        self.touch_selection.painted = Some(painted);
    }

    fn draw_chrome(&mut self, painted: &Painted) {
        let Some(mut font) = self.font.clone() else {
            return;
        };
        let parent = self.base().get_canvas_item();
        let state = &mut self.touch_selection;
        let item = state
            .item
            .get_or_insert_with(|| RootItem::new(parent, TOUCH_CHROME_DRAW_INDEX))
            .item;
        RenderingServer::singleton().canvas_item_clear(item);
        let feather = painted.oversampling.feather();
        let mut shape = state
            .shape_style
            .get_or_insert_with(StyleBoxFlat::new_gd)
            .clone();
        shape.set_aa_size(feather);
        let rect_of = |area: Area| {
            Rect2::new(
                Vector2::new(area.x, area.y),
                Vector2::new(area.width, area.height),
            )
        };
        // The handles: a stem along the selection's edge and a ball past its end.
        for handle in painted.layout.handles() {
            shape.set_corner_radius_all(0);
            shape.set_border_width_all(0);
            shape.set_bg_color(painted.color);
            shape.draw(item, rect_of(handle.stem()));
            let centre = handle.ball_centre();
            shape.set_corner_radius_all(HANDLE_BALL_RADIUS_PX as i32);
            shape.set_border_width_all(HANDLE_RING_WIDTH_PX);
            shape.set_border_color(HANDLE_RING_COLOR);
            shape.draw(
                item,
                Rect2::new(
                    Vector2::new(
                        centre.x - HANDLE_BALL_RADIUS_PX,
                        centre.y - HANDLE_BALL_RADIUS_PX,
                    ),
                    Vector2::new(2.0 * HANDLE_BALL_RADIUS_PX, 2.0 * HANDLE_BALL_RADIUS_PX),
                ),
            );
        }
        let Some(menu) = painted.layout.menu.as_ref() else {
            return;
        };
        let mut body = state
            .menu_style
            .get_or_insert_with(StyleBoxFlat::new_gd)
            .clone();
        body.set_aa_size(feather);
        body.set_bg_color(parse_color(Some(MENU_BACKGROUND), Color::TRANSPARENT_BLACK));
        body.set_corner_radius_all(MENU_RADIUS_PX as i32);
        body.set_shadow_color(MENU_SHADOW_COLOR);
        body.set_shadow_size(MENU_SHADOW_SIZE_PX);
        body.set_shadow_offset(Vector2::new(0.0, MENU_SHADOW_OFFSET_Y_PX));
        body.draw(item, rect_of(menu.area));
        let count = menu.items.len();
        for (index, (action, area)) in menu.items.iter().enumerate() {
            if painted.pressed == Some(ChromeHit::Menu(*action)) {
                // Only the corners that are the menu's own are round.
                shape.set_border_width_all(0);
                shape.set_bg_color(parse_color(Some(MENU_PRESSED), Color::TRANSPARENT_BLACK));
                for corner in [Corner::TOP_LEFT, Corner::BOTTOM_LEFT] {
                    shape.set_corner_radius(
                        corner,
                        if index == 0 { MENU_RADIUS_PX as i32 } else { 0 },
                    );
                }
                for corner in [Corner::TOP_RIGHT, Corner::BOTTOM_RIGHT] {
                    shape.set_corner_radius(
                        corner,
                        if index + 1 == count {
                            MENU_RADIUS_PX as i32
                        } else {
                            0
                        },
                    );
                }
                shape.draw(item, rect_of(*area));
            }
            if index > 0 {
                shape.set_corner_radius_all(0);
                shape.set_border_width_all(0);
                shape.set_bg_color(parse_color(Some(MENU_DIVIDER), Color::TRANSPARENT_BLACK));
                shape.draw(
                    item,
                    Rect2::new(
                        Vector2::new(
                            area.x - MENU_DIVIDER_WIDTH_PX / 2.0,
                            area.y + MENU_DIVIDER_INSET_PX,
                        ),
                        Vector2::new(
                            MENU_DIVIDER_WIDTH_PX,
                            MENU_HEIGHT_PX - 2.0 * MENU_DIVIDER_INSET_PX,
                        ),
                    ),
                );
            }
            draw_label(&mut font, item, action.label(), *area, painted.oversampling);
        }
    }

    // ---- JS ---------------------------------------------------------------------------------------------

    /// The chrome as it is on screen, for `getTouchSelection()`: `null` when no touch selection shows one, else the owner, what the
    /// finger is doing, each handle (its stem, ball and the square it is grabbed by) and the menu (its box and the box and name of each
    /// action).
    pub(crate) fn touch_selection_json(&self) -> Value {
        let rect = |area: Area| json!({ "x": area.x, "y": area.y, "width": area.width, "height": area.height });
        let Some(layout) = self.touch_selection.layout.as_ref() else {
            return Value::Null;
        };
        let handles: Vec<Value> = layout
            .handles()
            .map(|handle| {
                let ball = handle.ball_centre();
                let end = match handle.end {
                    HandleEnd::Start => "start",
                    HandleEnd::End => "end",
                };
                json!({
                    "end": end,
                    "stem": rect(handle.stem()),
                    "ball": { "x": ball.x, "y": ball.y, "radius": HANDLE_BALL_RADIUS_PX },
                    "target": rect(handle.target()),
                })
            })
            .collect();
        let menu = layout.menu.as_ref().map(|menu| {
            json!({
                "area": rect(menu.area),
                "items": menu.items.iter().map(|(action, area)| json!({
                    "action": action.name(), "label": action.label(), "rect": rect(*area),
                })).collect::<Vec<_>>(),
            })
        });
        let owner = match self.touch_selection.owner {
            Some(Owner::Document) => json!({ "kind": "document" }),
            Some(Owner::Input(tag)) => json!({ "kind": "input", "tag": tag }),
            None => Value::Null,
        };
        let gesture = match self.touch_selection.gesture {
            None => "idle",
            Some(Gesture::Extending { .. }) => "extending",
            Some(Gesture::Handle { .. }) => "handle",
            Some(Gesture::Menu { .. }) => "menu",
        };
        json!({ "owner": owner, "gesture": gesture, "handles": handles, "menu": menu })
    }
}

impl TouchSelectionState {
    /// The finger `id` is gone: what waited for its lift is forgotten.
    fn forget_finger(&mut self, id: u32) {
        if self
            .deferred_caret
            .is_some_and(|deferred| deferred.pointer == id)
        {
            self.deferred_caret = None;
        }
        if self.tap_origin.is_some_and(|(pointer, _)| pointer == id) {
            self.tap_origin = None;
        }
    }
}

/// Draw `label` centred in `area` in the menu's label colour.
fn draw_label(font: &mut Gd<Font>, item: Rid, label: &str, area: Area, oversampling: Oversampling) {
    let width = font
        .get_string_size_ex(label)
        .font_size(MENU_FONT_SIZE_PX)
        .done()
        .x;
    let ascent = font.get_ascent_ex().font_size(MENU_FONT_SIZE_PX).done();
    let descent = font.get_descent_ex().font_size(MENU_FONT_SIZE_PX).done();
    let baseline = area.y + (area.height + ascent - descent) / 2.0;
    let left = area.x + (area.width - width) / 2.0;
    font.draw_string_ex(item, Vector2::new(left, baseline), label)
        .font_size(MENU_FONT_SIZE_PX)
        .modulate(parse_color(Some(MENU_LABEL), Color::WHITE))
        .oversampling(oversampling.factor())
        .done();
}

/// A placement that failed is an `ERROR` line and no handle: never a guessed position.
trait OrReport<T> {
    fn or_report(self, end: &str) -> Option<T>;
}

impl<T> OrReport<T> for Result<T, String> {
    fn or_report(self, end: &str) -> Option<T> {
        match self {
            Ok(value) => Some(value),
            Err(error) => {
                godot_error!("ReactUiRoot: cannot place the {end} handle: {error}");
                None
            }
        }
    }
}
