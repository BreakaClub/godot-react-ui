mod accessibility;
mod accessibility_model;
mod blur;
mod clipboard;
mod commit;
mod computed_style;
mod diff;
mod drag;
mod drag_ghost;
mod drag_input;
mod events;
mod filter;
mod filter_faults;
mod filter_render;
mod focus;
mod geometry;
mod keyboard_input;
mod keymap;
mod layout;
mod motion;
mod mount;
mod paint;
mod pan;
mod pointer;
mod pointer_input;
mod pointer_state;
#[cfg(feature = "probe")]
mod probe;
mod profile;
mod props;
mod render_tree;
mod scroll;
mod scroll_input;
mod selection;
mod selection_input;
mod snapshot;
mod stacking;
mod style_engine;
mod text_input;
// `<TextInput>` on the mounted tree: key, pointer, IME and virtual keyboard input, painting.
mod text_input_godot;
// Caret, hit-test and selection geometry over Godot's `TextParagraph`; text selection (Phase I6) and text
// inputs (Phase I7) use it. The few items neither calls carry their own `allow(dead_code)`.
mod text_layout;
#[cfg(feature = "probe")]
mod text_layout_probe;
// UTF-16 offsets against code point indices: text selection sends them to JS, text inputs both ways.
mod text_offsets;
mod transform;
mod transform_state;

use std::collections::{BTreeMap, BTreeSet};
use std::time::Instant;

use godot::classes::control::{FocusMode, MouseFilter};
use godot::classes::notify::ControlNotification;
use godot::classes::{
    Control, Font, IControl, InputEvent, InputEventKey, InputEventMouseButton,
    InputEventMouseMotion, InputEventPanGesture, InputEventScreenDrag, InputEventScreenTouch,
    InputEventWithModifiers, StyleBoxFlat, TextParagraph, ThemeDb, Time,
};
use godot::global::{Key, MouseButtonMask};
use godot::obj::EngineEnum;
use godot::prelude::*;
use serde::Serialize;
use serde_json::json;
use taffy::prelude::{NodeId, TaffyTree};

use accessibility::Accessibility;
use commit::{CommitPayload, LAYER_COUNT};
use computed_style::{InteractionState, PseudoStates, restyle};
use diff::Parent;
use drag_input::DragRuntime;
use events::{
    DropEffect, EventOutcome, EventPayload, EventQueue, FocusData, Modifiers, PointerData,
    PointerType,
};
use filter_render::Effects;
use focus::Modality;
use motion::{IntrinsicTrack, TransitionRecord};
use mount::Mounted;
use pointer::{
    DOM_BUTTON_NONE, DOM_BUTTON_PRIMARY, KEYBOARD_POINTER_ID, MOUSE_POINTER_ID, cursor_shape,
    dom_buttons,
};
use pointer_state::{ClickCounter, PointerTable};
use profile::{Profiler, micros};
use props::{PseudoState, TransitionProperty};
use render_tree::{Oversampling, RingKey, RootItem};
use scroll_input::ScrollInputState;
use selection_input::SelectionState;
use style_engine::{DimensionAxis, DimensionOverrides, SampledStyle, StyleEngine};
use text_input_godot::TextInputRoot;

const DEFAULT_FONT_SIZE: i32 = 16;
const MILLISECONDS_PER_SECOND: f64 = 1000.0;
const MICROSECONDS_PER_MILLISECOND: f64 = 1000.0;
/// The event target that addresses root listeners only (events with an empty path).
const ROOT_TARGET: u32 = 0;
const CORNER_DETAIL: i32 = 12;
const FOCUS_RING_WIDTH: i32 = 2;
const FOCUS_RING_COLOR: Color = Color::from_rgba(0.49, 0.66, 1.0, 1.0);

struct ReactUiExtension;
#[gdextension]
unsafe impl ExtensionLibrary for ReactUiExtension {}

/// What Taffy measures a leaf with (the node context of a layout node).
#[derive(Clone)]
enum TextContext {
    /// A `Text` node: its shaped paragraph, wrapped to the width Taffy offers.
    Paragraph(Gd<TextParagraph>),
    /// A `TextInput`: a size that never depends on its value (plan 3.18), so typing does not lay out.
    Intrinsic(Vector2),
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct Stats {
    layout_passes: u64,
    /// Successful commits (protocol v1 called them batches).
    batches: u64,
    node_count: usize,
    paint_passes: u64,
    layout_micros: u64,
    animation_frames: u64,
    nodes_created: u64,
    nodes_updated: u64,
    nodes_deleted: u64,
    /// Nodes whose computed style changed (from a commit, a hover, press or focus change, or a
    /// breakpoint crossing) and were published.
    nodes_restyled: u64,
    /// Removes, deletes, creates, updates and inserts the mounting layer applied.
    mutations: u64,
    /// Canvas-item command lists re-recorded: a box (background and border) or a content (text).
    box_records: u64,
    content_records: u64,
    /// Scroll containers whose offset changed (input, a command, a flick or a layout re-clamp), and
    /// scrollbar overlays re-recorded. Scrolling changes these and nothing above.
    scroll_updates: u64,
    overlay_records: u64,
}

/// A single Godot Control owns the mounted tree, the native layout tree and all drawing resources.
/// JS exchanges one validated commit per layer and queued input events with it.
#[derive(GodotClass)]
#[class(base=Control)]
pub struct ReactUiRoot {
    base: Base<Control>,
    mounted: Mounted,
    tree: TaffyTree<TextContext>,
    layer_roots: [NodeId; LAYER_COUNT],
    layer_items: Vec<RootItem>,
    ring_item: Option<RootItem>,
    ring: Option<Gd<StyleBoxFlat>>,
    ring_drawn: Option<RingKey>,
    /// Draws every scroll container's scrollbar thumbs; created with the first one.
    scrollbar_style: Option<Gd<StyleBoxFlat>>,
    /// Coasting flicks, panning fingers and the scrollbar thumb being dragged (`scroll_input.rs`).
    scrolling: ScrollInputState,
    /// The canvas items, materials and rectangles of `filter` and `backdrop-filter` (`filter_render.rs`).
    effects: Effects,
    /// The document's text selection, the gesture that is extending it and what each node paints of
    /// it (`selection_input.rs`).
    selecting: SelectionState,
    /// The drag-and-drop machine, its session and its ghost (`drag_input.rs`).
    drag: DragRuntime,
    /// Nodes whose layout inputs changed since the last geometry pass.
    layout_dirty: BTreeSet<u32>,
    /// Nodes whose canvas items may need re-recording.
    paint_dirty: BTreeSet<u32>,
    /// Nodes whose paint parent or sort position must be re-examined: a new tree parent, a changed
    /// `position` or `zIndex` (`settle_paint_structure`).
    paint_reeval: BTreeSet<u32>,
    /// Paint parents whose paint list must be rebuilt.
    paint_dirty_parents: BTreeSet<Parent>,
    /// Something that decides which element is under the pointer changed since the last hit test:
    /// a node moved or resized, the tree's structure changed, or an element started or stopped
    /// clipping its children or being a pointer target (`pointer-events`).
    hit_stale: bool,
    /// Nodes whose text paragraph must be rebuilt.
    pending_text: BTreeSet<u32>,
    pending_style_removals: Vec<u32>,
    /// Tags deleted by the last successful commit.
    deletions: Vec<u32>,
    paragraph_generation: u64,
    events: EventQueue,
    /// Nonzero while native is inside an `events_ready` emission; nested input only queues.
    dispatch_depth: u32,
    font: Option<Gd<Font>>,
    viewport_size: Vector2,
    /// The viewport width the computed styles were last resolved for.
    styled_width: f32,
    hovered: Option<u32>,
    focused: Option<u32>,
    pressed: Option<u32>,
    pressed_by_keyboard: bool,
    /// The key that pressed a focused button, while it is held.
    activation_key: Option<Key>,
    /// A commit removed the focused element: once it has settled the root hands Godot key focus back
    /// unless something else took focus meanwhile (`settle_key_focus`).
    key_focus_release_due: bool,
    /// How the user last gave input (plan 3.13).
    modality: Modality,
    focus_visible: bool,
    /// Where the mouse is, which of its buttons are down and which modifiers are held.
    pointer: Vector2,
    pointer_known: bool,
    pointer_buttons: u16,
    pointer_modifiers: Modifiers,
    /// Every pointer that is down, with its capture (plan 3.12), and the click counts.
    pointers: PointerTable,
    clicks: ClickCounter,
    stats: Stats,
    /// The accessibility elements this root has made for assistive technologies (plan 3.21).
    accessibility: Accessibility,
    /// What text inputs share: the selection drag in progress, the window's focus, the `InputMap`
    /// actions their keys are (`text_input_godot.rs`).
    text_inputs: TextInputRoot,
    clock_ms: f64,
    profiler: Profiler,
    style_engine: StyleEngine,
    /// Nodes whose computed style has a `transition`, and their latest Stylo samples.
    motion_nodes: BTreeSet<u32>,
    sampled: BTreeMap<u32, SampledStyle>,
    intrinsic: BTreeMap<(u32, DimensionAxis), IntrinsicTrack>,
    overrides: BTreeMap<u32, DimensionOverrides>,
    transitions: BTreeMap<(u32, TransitionProperty), TransitionRecord>,
    content_generation: u64,
    geometry_micros: u64,
    last_layout_micros: u64,
    phase_layout_micros: u64,
    phase_geometry_micros: u64,
    /// The oversampling every item was last drawn at (`render_tree::Oversampling`).
    oversampling: Oversampling,
}

#[godot_api]
impl IControl for ReactUiRoot {
    fn init(base: Base<Control>) -> Self {
        let mut tree = TaffyTree::new();
        let layer_roots = std::array::from_fn(|_| {
            tree.new_leaf(taffy::Style::default())
                .expect("new layer root layout node")
        });
        Self {
            base,
            mounted: Mounted::default(),
            tree,
            layer_roots,
            layer_items: Vec::new(),
            ring_item: None,
            ring: None,
            ring_drawn: None,
            scrollbar_style: None,
            scrolling: ScrollInputState::default(),
            effects: Effects::default(),
            selecting: SelectionState::default(),
            drag: DragRuntime::default(),
            layout_dirty: BTreeSet::new(),
            paint_dirty: BTreeSet::new(),
            paint_reeval: BTreeSet::new(),
            paint_dirty_parents: BTreeSet::new(),
            hit_stale: false,
            pending_text: BTreeSet::new(),
            pending_style_removals: Vec::new(),
            deletions: Vec::new(),
            paragraph_generation: 0,
            events: EventQueue::new(),
            dispatch_depth: 0,
            font: None,
            viewport_size: Vector2::ZERO,
            styled_width: 0.0,
            hovered: None,
            focused: None,
            pressed: None,
            pressed_by_keyboard: false,
            activation_key: None,
            key_focus_release_due: false,
            modality: Modality::Keyboard,
            focus_visible: false,
            pointer: Vector2::ZERO,
            pointer_known: false,
            pointer_buttons: 0,
            pointer_modifiers: Modifiers::default(),
            pointers: PointerTable::default(),
            clicks: ClickCounter::default(),
            stats: Stats::default(),
            accessibility: Accessibility::default(),
            text_inputs: TextInputRoot::default(),
            clock_ms: 0.0,
            profiler: Profiler::default(),
            style_engine: StyleEngine::new(),
            motion_nodes: BTreeSet::new(),
            sampled: BTreeMap::new(),
            intrinsic: BTreeMap::new(),
            overrides: BTreeMap::new(),
            transitions: BTreeMap::new(),
            content_generation: 0,
            geometry_micros: 0,
            last_layout_micros: 0,
            phase_layout_micros: 0,
            phase_geometry_micros: 0,
            oversampling: Oversampling::NONE,
        }
    }

    fn ready(&mut self) {
        self.update_process();
        self.base_mut().set_mouse_filter(MouseFilter::STOP);
        // Click focus only: Godot's own Tab navigation must never hand the root key focus (plan
        // 3.11). `grab_focus` still works, which is how the owner and a focused element take it.
        self.base_mut().set_focus_mode(FocusMode::CLICK);
        self.base_mut().set_clip_contents(true);
        // MOUSE_FILTER_STOP would otherwise mark every wheel event handled; whether one is consumed
        // is decided by JS and, from Phase I5, by scrolling (plan 3.11).
        self.base_mut().set_force_pass_scroll_events(true);
        // A filter's rectangles are in render-target pixels, so they follow the root's own transform.
        self.base_mut().set_notify_transform(true);
        self.font = self
            .base()
            .get_theme_default_font()
            .or_else(|| ThemeDb::singleton().get_fallback_font());
        let mut ring = StyleBoxFlat::new_gd();
        ring.set_draw_center(false);
        ring.set_border_width_all(FOCUS_RING_WIDTH);
        ring.set_border_color(FOCUS_RING_COLOR);
        self.ring = Some(ring);
        self.ensure_render_roots();
        // A React tree may be committed before this Control enters the scene tree. Build its text
        // paragraphs now that a theme font is available.
        let with_text: Vec<u32> = self
            .mounted
            .nodes
            .iter()
            .filter(|(_, node)| node.props.text.is_some())
            .map(|(tag, _)| *tag)
            .collect();
        self.pending_text.extend(with_text);
        self.sync_viewport();
        let pending = std::mem::take(&mut self.pending_text);
        for tag in pending {
            self.refresh_paragraph(tag);
        }
        self.apply_presentation();
        self.flush_layout();
        // The root takes key focus only when an element is focused, or when its owner calls
        // `grabFocus()` (plan 3.11). An element focused by a commit before the root entered the
        // tree (`autoFocus`) could not take it then.
        if self.focused.is_some() {
            self.base_mut().grab_focus();
        }
    }

    fn on_notification(&mut self, what: ControlNotification) {
        match what {
            ControlNotification::RESIZED if self.font.is_some() => {
                self.sync_viewport();
                self.flush_layout();
                self.refresh_intrinsic_targets();
            }
            // The viewport asks every canvas item to redraw when its oversampling changes.
            ControlNotification::DRAW => self.repaint_for_oversampling(),
            ControlNotification::ACCESSIBILITY_UPDATE => self.update_accessibility(),
            // The IME reports a change of its composition to every node (`scene_tree.cpp:922-932`).
            ControlNotification::OS_IME_UPDATE => self.text_input_ime_update(),
            ControlNotification::WM_WINDOW_FOCUS_IN => self.text_input_window_focus(true),
            // The engine freed the root's element, and ours with it.
            ControlNotification::ACCESSIBILITY_INVALIDATE => self.forget_accessibility_elements(),
            ControlNotification::TRANSFORM_CHANGED => self.refresh_effect_rects(),
            ControlNotification::PREDELETE => {
                self.release_accessibility_elements();
                self.mounted.nodes.clear();
                self.effects.release();
                self.layer_items.clear();
                self.ring_item = None;
            }
            ControlNotification::MOUSE_EXIT => {
                self.pointer_known = false;
                // The hover is frozen while a drag runs (I9-3): leaving the root with the button down is
                // part of the drag, and its end catches the hover up.
                if !self.drag_in_progress() {
                    self.update_hover(None);
                }
            }
            ControlNotification::FOCUS_EXIT => {
                self.set_focus(None, false);
                // A key press can only end with its key release, which no longer reaches the root.
                // A mouse press is routed by the viewport's mouse focus and ends with the button
                // release whatever holds key focus; native itself releases key focus when a press
                // lands on something that cannot take it, and that press must still click.
                if self.pressed_by_keyboard {
                    self.pressed = None;
                    self.pressed_by_keyboard = false;
                    self.activation_key = None;
                }
                self.refresh_interaction();
            }
            ControlNotification::WM_WINDOW_FOCUS_OUT => {
                self.text_input_window_focus(false);
                // The engine drops mouse focus when the window loses OS focus and sends the Control
                // a synthetic release that never reaches `gui_input` (internal-device events skip
                // `_gui_input`), so a press that was in flight would stay pressed forever. JS is
                // told with `pointercancel`, which also ends any capture.
                self.cancel_all_pointers();
                self.pressed = None;
                self.pressed_by_keyboard = false;
                self.activation_key = None;
                self.refresh_interaction();
            }
            ControlNotification::ENTER_TREE if self.font.is_some() => {
                self.apply_presentation();
                self.flush_layout();
                self.refresh_intrinsic_targets();
                // The root may have come from another viewport, at another scale.
                self.repaint_for_oversampling();
                self.update_process();
            }
            ControlNotification::EXIT_TREE => {
                // The engine frees the root's element, and ours with it, when the root leaves.
                self.forget_accessibility_elements();
                // Leaving the tree is a pause, not destruction. Keep the native
                // clock, Stylo transitions and presentation overrides for reentry.
                self.events.retain(|payload| {
                    matches!(
                        payload,
                        EventPayload::Blur(_)
                            | EventPayload::PointerLeave(_)
                            | EventPayload::PointerCancel(_)
                    )
                });
                // A running drag is cancelled with the root; its `dragleave` and `dragend` are queued
                // after the filter above so JS can end the drag's data.
                self.cancel_drag_for_exit();
                self.update_hover(None);
                self.set_focus(None, false);
                self.cancel_all_pointers();
                self.pressed = None;
                self.refresh_interaction();
                self.pointer_known = false;
                self.pause_process();
            }
            _ => {}
        }
    }

    fn gui_input(&mut self, event: Gd<InputEvent>) {
        self.handle_input(event);
        // Whatever the handling queued without waiting for JS goes out now, in the same
        // synchronous emission, so JS never sees an input event a frame late.
        self.deliver();
    }

    fn process(&mut self, delta: f64) {
        // A frame is asked for while an effect exists, to follow a viewport transform nothing tells the root about.
        if self.effects_want_frames() {
            self.refresh_effect_rects();
        }
        // Frames come for motion, for a flick that is coasting, for a finger that is panning, or for a
        // drag (a touch waiting out its hold, edge auto-scroll, a scroll to look at again), any
        // combination of them (`update_process`); each advances only if it has work, so a flick does
        // not tick the animation clock.
        if self.motion_active() {
            self.tick_motion(delta);
        }
        if self.scrolling.wants_frames() {
            self.tick_scroll(delta);
        }
        if self.drag_wants_frames() {
            self.tick_drag(delta);
        }
        if self.text_input_wants_frames() {
            self.tick_text_input(delta);
        }
        self.update_process();
    }

    /// While a drag runs the root hears every input event first, so Escape cancels it whether or not
    /// the root holds key focus (plan 3.19). `update_process` turns this on only for a running drag.
    fn input(&mut self, event: Gd<InputEvent>) {
        self.drag_escape(&event);
    }

    /// Godot routes a pointer to this Control only where an element would receive it, so empty
    /// space and `pointer-events: none` regions reach whatever lies underneath (plan 3.11). Called
    /// during routing; it reads the mounted tree and changes nothing.
    fn has_point(&self, point: Vector2) -> bool {
        self.mounted.hit_test(point).is_some()
    }

    fn get_cursor_shape(&self, at_position: Vector2) -> i32 {
        // A drag overrides the element's cursor with can-drop or forbidden (Appendix A).
        self.drag_cursor()
            .unwrap_or_else(|| {
                cursor_shape(
                    self.mounted
                        .cursor_at(at_position, |tag| self.unset_cursor_of(tag)),
                )
            })
            .ord()
    }

    /// Which accessibility element holds assistive focus while the root has key focus.
    fn get_focused_accessibility_element(&self) -> Rid {
        self.focused_accessibility_element()
    }
}

#[godot_api]
impl ReactUiRoot {
    /// The font oversampling of the viewport the root is in, which is what Godot's own controls draw their text at
    /// (`CanvasItem::_redraw_callback`). A `Window` carries its content scale factor, a stretch mode's scale and an
    /// oversampling override in it; a `SubViewport` has its own, so a root inside one is not scaled by the window around it.
    pub(crate) fn viewport_oversampling(&self) -> Oversampling {
        self.base()
            .get_viewport()
            .map_or(Oversampling::NONE, |viewport| {
                Oversampling::from_factor(viewport.get_oversampling())
            })
    }

    /// Emitted from input callbacks while events are queued. The JS owner connects a callable that
    /// drains them synchronously and answers `preventDefault()` through `resolve_event`.
    #[signal]
    fn events_ready();

    /// Apply one layer's commit payload (plan section 4.1): validate all of it, then mount it. An
    /// empty return is success; anything else describes why nothing changed.
    #[func]
    fn commit(&mut self, layer: i64, payload_json: GString) -> GString {
        let parse_started = Instant::now();
        let Ok(layer) = usize::try_from(layer) else {
            return GString::from(&format!("layer {layer} is negative"));
        };
        let payload: CommitPayload = match serde_json::from_str(&payload_json.to_string()) {
            Ok(payload) => payload,
            Err(error) => return GString::from(&format!("Invalid commit JSON: {error}")),
        };
        let parse_micros = micros(parse_started);
        self.ensure_render_roots();
        match self.run_commit(layer, &payload, parse_micros) {
            Ok(()) => GString::new(),
            Err(error) => GString::from(&error),
        }
    }

    /// The tags the last successful commit deleted, for JS to forget.
    #[func]
    fn take_commit_deletions(&mut self) -> PackedInt64Array {
        std::mem::take(&mut self.deletions)
            .into_iter()
            .map(i64::from)
            .collect()
    }

    #[func]
    fn set_profiling(&mut self, enabled: bool) {
        self.profiler.enable(enabled);
    }

    /// Keep the clipboard that copy, cut and paste use in this process's memory (`true`, empty) or return to the
    /// machine's (`false`). A verifier run isolates it so a test cannot overwrite what the person copied
    /// (`native/clipboard.rs`); a normal run never calls this.
    #[func]
    fn isolate_clipboard(isolated: bool) {
        clipboard::isolate(isolated);
    }

    /// The clipboard's text: the machine's, or the isolated one a verifier run reads back.
    #[func]
    fn clipboard_text() -> GString {
        GString::from(&clipboard::read())
    }

    /// Put text on the clipboard as a copy would: the machine's, or the isolated one.
    #[func]
    fn set_clipboard_text(text: GString) {
        clipboard::write(&text.to_string());
    }

    #[func]
    fn get_activity(&self) -> GString {
        self.activity_json().to_string().as_str().into()
    }

    #[func]
    fn take_profile(&mut self) -> GString {
        let (samples, dropped) = self.profiler.take();
        json!({"samples":samples,"dropped":dropped,"counters":self.activity_json()})
            .to_string()
            .as_str()
            .into()
    }

    #[func]
    fn get_snapshot(&self) -> GString {
        self.snapshot_json().to_string().as_str().into()
    }

    /// `element.setPointerCapture(pointer_id)`: the element receives the pointer's events (wherever
    /// the pointer is) until `release_pointer_capture`, the pointer goes up or is cancelled, or the
    /// element is removed. An empty return is success; otherwise nothing changed (plan 4.4).
    #[func]
    fn set_pointer_capture(&mut self, tag: i64, pointer_id: i64) -> GString {
        let result = ids(tag, pointer_id)
            .and_then(|(tag, pointer_id)| self.set_pointer_capture_checked(tag, pointer_id));
        match result {
            Ok(()) => GString::new(),
            Err(error) => GString::from(&error),
        }
    }

    /// `element.releasePointerCapture(pointer_id)`: only the capturing element can release; any other
    /// call does nothing, as in DOM.
    #[func]
    fn release_pointer_capture(&mut self, tag: i64, pointer_id: i64) -> GString {
        match ids(tag, pointer_id) {
            Ok((tag, pointer_id)) => {
                self.pointers.release_capture(pointer_id, tag);
                GString::new()
            }
            Err(error) => GString::from(&error),
        }
    }

    /// Whether `tag` is capturing pointer `pointer_id`.
    #[func]
    fn has_pointer_capture(&self, tag: i64, pointer_id: i64) -> bool {
        ids(tag, pointer_id)
            .is_ok_and(|(tag, pointer_id)| self.pointers.has_capture(pointer_id, tag))
    }

    /// `element.focus()`: focus `tag` and give the root Godot key focus. `focus_visible` is -1 to follow
    /// the input modality, 0 for never, 1 for always. An empty return is success; otherwise nothing
    /// changed (a node that is not mounted or cannot take focus).
    #[func]
    fn focus_node(&mut self, tag: i64, focus_visible: i64) -> GString {
        let result = u32::try_from(tag)
            .map_err(|_| format!("tag {tag} is not a u32"))
            .and_then(|tag| self.focus_node_checked(tag, focus_visible));
        match result {
            Ok(()) => GString::new(),
            Err(error) => GString::from(&error),
        }
    }

    /// `element.blur()`: nothing happens unless `tag` holds focus.
    #[func]
    fn blur_node(&mut self, tag: i64) -> GString {
        let result = u32::try_from(tag)
            .map_err(|_| format!("tag {tag} is not a u32"))
            .and_then(|tag| self.blur_node_checked(tag));
        match result {
            Ok(()) => GString::new(),
            Err(error) => GString::from(&error),
        }
    }

    /// An assistive technology acted on node `tag`'s accessibility element. The element's action
    /// callables are bound to this method, so the platform adapter calls it (deferred) with the
    /// request's data first, then the tag and the action code bound by `accessibility.rs`.
    #[func]
    fn _on_accessibility_action(&mut self, data: Variant, tag: i64, action: i64) {
        self.handle_accessibility_action(&data, tag, action);
    }

    /// An assistive technology acted on one of node `tag`'s scroll bar elements (plan D42). The bar's
    /// action callables are bound to this method with the tag, the bar's axis and the action's code
    /// (`accessibility_model/scroll_bars.rs`); the request carries no data for an increment or a decrement.
    #[func]
    fn _on_accessibility_scroll_bar_action(
        &mut self,
        _data: Variant,
        tag: i64,
        axis: i64,
        action: i64,
    ) {
        self.handle_scroll_bar_action(tag, axis, action);
    }

    /// `element.scrollTo(left, top)`: scroll a scroll container to these offsets (as `scrollLeft` and
    /// `scrollTop`: zero or negative on a reversed axis), clamped to its range. An empty return is
    /// success; an error says why nothing changed (not mounted, not a scroll container, not finite).
    #[func]
    fn scroll_to(&mut self, tag: i64, left: f64, top: f64) -> GString {
        let result = u32::try_from(tag)
            .map_err(|_| format!("tag {tag} is not a u32"))
            .and_then(|tag| self.scroll_to_checked(tag, left, top));
        match result {
            Ok(()) => GString::new(),
            Err(error) => GString::from(&error),
        }
    }

    /// `element.scrollBy(dx, dy)`: like `scroll_to`, relative to where the container is.
    #[func]
    fn scroll_by(&mut self, tag: i64, dx: f64, dy: f64) -> GString {
        let result = u32::try_from(tag)
            .map_err(|_| format!("tag {tag} is not a u32"))
            .and_then(|tag| self.scroll_by_checked(tag, dx, dy));
        match result {
            Ok(()) => GString::new(),
            Err(error) => GString::from(&error),
        }
    }

    /// `element.scrollIntoView()`: scroll the containers around `tag`, innermost first, just far
    /// enough to show it. An empty return is success (also when nothing needed to move).
    #[func]
    fn scroll_into_view(&mut self, tag: i64) -> GString {
        let result = u32::try_from(tag)
            .map_err(|_| format!("tag {tag} is not a u32"))
            .and_then(|tag| self.scroll_into_view_checked(tag));
        match result {
            Ok(()) => GString::new(),
            Err(error) => GString::from(&error),
        }
    }

    /// A scroll container's position, size and range as JSON (`scrollLeft`, `scrollTop`,
    /// `scrollWidth`, `scrollHeight`, `clientWidth`, `clientHeight`, and the `minScrollLeft`,
    /// `maxScrollLeft`, `minScrollTop`, `maxScrollTop` it can take), or `null` if `tag` is not mounted
    /// or not a scroll container.
    #[func]
    fn get_scroll_state(&self, tag: i64) -> GString {
        let json = match u32::try_from(tag) {
            Ok(tag) => self.scroll_state_json(tag),
            Err(_) => serde_json::Value::Null,
        };
        json.to_string().as_str().into()
    }

    /// The document's text selection as JSON, or `null` for none: `{"anchor": {"tag", "offset"},
    /// "focus": {"tag", "offset"}, "isCollapsed", "text"}`, offsets in UTF-16 code units (plan 3.17).
    #[func]
    fn get_selection(&mut self) -> GString {
        self.selection_json().to_string().as_str().into()
    }

    /// Drop the document's text selection (queues `selectionchange` if there was one). Does not touch
    /// Godot key focus: the owner may have asked for it.
    #[func]
    fn clear_selection(&mut self) {
        self.clear_selection_command();
    }

    /// `setTextAndSelection(eventCount, value, start, end)` on a text input (plan 3.18, 4.4): replace its
    /// text and selection, unless the user typed since JS read `eventCount`. `start` and `end` are UTF-16
    /// offsets into `value`, both -1 for the caret at the end. Returns "" when it was applied, "stale"
    /// when it was ignored for its count, else why nothing changed.
    #[func]
    fn set_text_and_selection(
        &mut self,
        tag: i64,
        event_count: i64,
        value: GString,
        start: i64,
        end: i64,
    ) -> GString {
        let result = u32::try_from(tag)
            .map_err(|_| format!("tag {tag} is not a u32"))
            .and_then(|tag| {
                self.set_text_and_selection_checked(
                    tag,
                    event_count,
                    &value.to_string(),
                    start,
                    end,
                )
            });
        match result {
            Ok(text_input_godot::TextCommandOutcome::Applied) => GString::new(),
            Ok(text_input_godot::TextCommandOutcome::Stale) => {
                GString::from(text_input_godot::STALE_COMMAND)
            }
            Err(error) => GString::from(&error),
        }
    }

    /// `setSelectionRange(start, end, direction)` on a text input: UTF-16 offsets into its text,
    /// `backward` putting the caret at `start`. An empty return is success.
    #[func]
    fn set_text_selection(&mut self, tag: i64, start: i64, end: i64, backward: bool) -> GString {
        let result = u32::try_from(tag)
            .map_err(|_| format!("tag {tag} is not a u32"))
            .and_then(|tag| self.set_text_selection_checked(tag, start, end, backward));
        match result {
            Ok(()) => GString::new(),
            Err(error) => GString::from(&error),
        }
    }

    /// A text input's value, selection (UTF-16), event count and composition as JSON, or `null` for a
    /// node that is not a mounted text input.
    #[func]
    fn get_text_input_state(&self, tag: i64) -> GString {
        let json = match u32::try_from(tag) {
            Ok(tag) => self.text_input_state_json(tag),
            Err(_) => serde_json::Value::Null,
        };
        json.to_string().as_str().into()
    }

    /// The accessibility elements of the rows of a text input's text, in order, once the platform has read the
    /// tree: the elements a `set text selection` request names (`text_input_godot/accessibility.rs`). A verifier
    /// uses them to make the request the platform adapter makes.
    #[func]
    fn get_text_line_elements(&self, tag: i64) -> Array<Rid> {
        let rows = u32::try_from(tag)
            .map(|tag| self.text_line_elements(tag))
            .unwrap_or_default();
        rows.into_iter().collect()
    }

    /// The virtual keyboard's hook (`scene/main/viewport.cpp:2856-2868`): the engine calls a method
    /// of this name on the Control that holds key focus with the keyboard's whole text.
    #[func]
    fn _set_text(&mut self, text: GString, _emit_signal: bool) {
        self.set_text_from_virtual_keyboard(&text.to_string());
        self.deliver();
    }

    /// The browser's clipboard text, which `navigator.clipboard.readText()` resolved to: the
    /// `JavaScriptBridge` calls this with the promise's value in an array (`web_clipboard.rs`).
    #[func]
    fn _on_web_clipboard_text(&mut self, arguments: VarArray) {
        self.finish_web_paste(&arguments);
    }

    /// The browser's refusal of that read, which the `JavaScriptBridge` calls the same way.
    #[func]
    fn _on_web_clipboard_refused(&mut self, arguments: VarArray) {
        self.refuse_web_paste(&arguments);
    }

    /// The root-local rectangle of a node as JSON, or `null` if no such node is mounted.
    #[func]
    fn get_node_rect(&self, tag: i64) -> GString {
        let json = match u32::try_from(tag) {
            Ok(tag) => self.node_rect_json(tag),
            Err(_) => serde_json::Value::Null,
        };
        json.to_string().as_str().into()
    }

    /// The tag of the first node created with `test_id`, or -1.
    #[func]
    fn find_by_test_id(&self, test_id: GString) -> i64 {
        self.mounted
            .find_by_test_id(&test_id.to_string())
            .map_or(-1, i64::from)
    }

    #[func]
    fn drain_events(&mut self) -> GString {
        serde_json::to_string(&self.events.drain())
            .expect("finite input coordinates")
            .as_str()
            .into()
    }

    /// Report JS's answer for the event native is currently awaiting. An empty return is success.
    /// `drop_effect` is "" (not set), "none", "copy", "move" or "link".
    #[func]
    fn resolve_event(
        &mut self,
        seq: i64,
        default_prevented: bool,
        drop_effect: GString,
    ) -> GString {
        let result = u64::try_from(seq)
            .map_err(|_| format!("event sequence {seq} is negative"))
            .and_then(|seq| {
                let drop_effect = DropEffect::parse(&drop_effect.to_string())?;
                self.events.resolve(
                    seq,
                    EventOutcome {
                        default_prevented,
                        drop_effect,
                    },
                )
            });
        match result {
            Ok(()) => GString::new(),
            Err(error) => GString::from(&error),
        }
    }
}

impl ReactUiRoot {
    /// Read the Control's size and restyle the nodes whose breakpoints it crossed.
    fn sync_viewport(&mut self) {
        let size = self.base().get_size();
        let previous_width = self.styled_width;
        self.viewport_size = size;
        self.styled_width = size.x;
        let crossed = self.mounted.breakpoints.crossed(previous_width, size.x);
        if !crossed.is_empty() {
            let changes = restyle(&mut self.mounted, crossed, size.x);
            self.publish_style_changes(&changes);
        }
    }

    /// Recompute which nodes are hovered, active and focused, and restyle those whose pseudo-state
    /// changed and whose style uses it. Hover, press and focus never touch React.
    pub(crate) fn refresh_interaction(&mut self) {
        // Disabling or removing an element takes focus and the press away from it.
        if let Some(tag) = self.focused
            && self.mounted.nodes.contains_key(&tag)
            && self.mounted.is_disabled(tag)
        {
            self.set_focus(None, false);
            self.release_key_focus_without_element();
        }
        if self.pressed.is_some_and(|tag| {
            !self.mounted.nodes.contains_key(&tag) || self.mounted.is_disabled(tag)
        }) {
            self.pressed = None;
        }
        let hover = self
            .hovered
            .map(|tag| self.mounted.path_of(tag))
            .unwrap_or_default();
        let pressed_chain = self
            .pressed
            .map(|tag| self.mounted.path_of(tag))
            .unwrap_or_default();
        // A mouse press stays active only while the pointer is inside it; a key press stays active
        // until the key is released; a touch stays active while it is down (it never hovers).
        let mut active: Vec<u32> = if self.pressed_by_keyboard {
            pressed_chain
        } else {
            pressed_chain
                .into_iter()
                .filter(|tag| hover.contains(tag))
                .collect()
        };
        for target in self.pointers.touch_targets() {
            for tag in self.mounted.path_of(target) {
                if !active.contains(&tag) {
                    active.push(tag);
                }
            }
        }
        let focus_within = self
            .focused
            .map(|tag| self.mounted.path_of(tag))
            .unwrap_or_default();
        let next = InteractionState {
            hover,
            active,
            focused: self
                .focused
                .filter(|tag| self.mounted.nodes.contains_key(tag)),
            focus_within,
            focus_visible: self.focus_visible && self.focused.is_some(),
        };
        if next == self.mounted.interaction {
            return;
        }
        let previous = std::mem::replace(&mut self.mounted.interaction, next);
        let next = &self.mounted.interaction;
        // A node needs restyling only if its style conditions on the state that changed for it.
        let mut dirty = BTreeSet::new();
        let mut consider = |tags: Vec<u32>, states: &[PseudoState]| {
            let changed = PseudoStates::from_slice(states);
            for tag in tags {
                if self
                    .mounted
                    .nodes
                    .get(&tag)
                    .is_some_and(|node| node.uses_states.intersects(changed))
                {
                    dirty.insert(tag);
                }
            }
        };
        let moved = |before: &[u32], after: &[u32]| -> Vec<u32> {
            before
                .iter()
                .filter(|tag| !after.contains(tag))
                .chain(after.iter().filter(|tag| !before.contains(tag)))
                .copied()
                .collect()
        };
        consider(moved(&previous.hover, &next.hover), &[PseudoState::Hover]);
        consider(
            moved(&previous.active, &next.active),
            &[PseudoState::Active],
        );
        consider(
            moved(&previous.focus_within, &next.focus_within),
            &[PseudoState::FocusWithin],
        );
        if previous.focused != next.focused || previous.focus_visible != next.focus_visible {
            consider(
                previous.focused.into_iter().chain(next.focused).collect(),
                &[PseudoState::Focus, PseudoState::FocusVisible],
            );
        }
        if dirty.is_empty() {
            return;
        }
        let changes = restyle(&mut self.mounted, dirty, self.styled_width);
        self.publish_style_changes(&changes);
    }

    fn queue(&mut self, target: u32, payload: EventPayload) {
        let path = self.mounted.path_of(target);
        self.events.push(target, path, payload, event_time_ms());
    }

    /// The pointer state an event carries, for a pointer at `position` (root-local), with no click
    /// count and no related element. Canvas coordinates are what game code receives in
    /// `_unhandled_input`: this Control's place in its viewport applied to the root-local position.
    fn pointer_data_at(
        &self,
        position: Vector2,
        pointer_id: u32,
        pointer_type: PointerType,
        button: i8,
        buttons: u16,
    ) -> PointerData {
        let in_viewport = self.base().get_global_transform_with_canvas() * position;
        PointerData {
            x: position.x,
            y: position.y,
            viewport_x: in_viewport.x,
            viewport_y: in_viewport.y,
            pointer_id,
            pointer_type,
            button,
            buttons,
            detail: 0,
            related_target: None,
            modifiers: self.pointer_modifiers,
        }
    }

    /// Everything that still describes the mouse when an event is not itself input: the last
    /// position, buttons and modifiers native saw.
    fn pointer_data(
        &self,
        pointer_id: u32,
        pointer_type: PointerType,
        button: i8,
        buttons: u16,
        detail: u32,
        related_target: Option<u32>,
    ) -> PointerData {
        PointerData {
            detail,
            related_target,
            ..self.pointer_data_at(self.pointer, pointer_id, pointer_type, button, buttons)
        }
    }

    fn mouse_pointer_data(
        &self,
        button: i8,
        detail: u32,
        related_target: Option<u32>,
    ) -> PointerData {
        self.pointer_data(
            MOUSE_POINTER_ID,
            PointerType::Mouse,
            button,
            self.pointer_buttons,
            detail,
            related_target,
        )
    }

    /// Keyboard activation keeps its synthetic pointer events until the keyboard model replaces them.
    fn synthetic_pointer_data(&self, buttons: u16, detail: u32) -> PointerData {
        self.pointer_data(
            KEYBOARD_POINTER_ID,
            PointerType::Synthetic,
            DOM_BUTTON_PRIMARY,
            buttons,
            detail,
            None,
        )
    }

    fn track_mouse(&mut self, position: Vector2, mask: MouseButtonMask, modifiers: Modifiers) {
        self.track_position(position, modifiers);
        self.pointer_buttons = dom_buttons(mask);
    }

    /// Remember where the mouse is and which modifiers are down.
    fn track_position(&mut self, position: Vector2, modifiers: Modifiers) {
        self.pointer = position;
        self.pointer_known = true;
        self.pointer_modifiers = modifiers;
    }

    /// Queue an event and block until JS has dispatched it and reported `preventDefault()`.
    /// Everything native knew before this call may be stale when it returns (plan 3.3 rule 3).
    fn dispatch_cancelable(&mut self, target: u32, payload: EventPayload) -> EventOutcome {
        if self.dispatch_depth > 0 || !self.base().is_inside_tree() {
            // Nested input (JS pushed an event from a handler) cannot be answered synchronously:
            // the outer JS drain loop delivers it without a way to prevent its default.
            self.queue(target, payload);
            return EventOutcome::default();
        }
        let path = self.mounted.path_of(target);
        let seq = self
            .events
            .push_awaited(target, path, payload, event_time_ms());
        self.deliver();
        self.events.take_outcome(seq)
    }

    /// Synchronously hand every queued event to JS through `events_ready`. Only input-origin entry
    /// points may call this (plan 3.3 rule 1); events queued anywhere else wait for the next
    /// delivery or the owner's per-frame `dispatchEvents()`.
    fn deliver(&mut self) {
        if self.dispatch_depth > 0 || self.events.is_empty() || !self.base().is_inside_tree() {
            return;
        }
        self.dispatch_depth += 1;
        self.signals().events_ready().emit();
        self.dispatch_depth -= 1;
    }

    /// Mouse, touch and key handling. Events are queued here and delivered by the caller.
    fn handle_input(&mut self, event: Gd<InputEvent>) {
        // Godot translates touches to mouse events and mouse events to touches, marking the copies
        // with this device id (`core/input/input.cpp:926`, `core/input/input_event.h`). The real
        // events are handled, so a touch is one touch pointer and never also a mouse press.
        if event.get_device() == InputEvent::DEVICE_ID_EMULATION {
            return;
        }
        if let Ok(motion) = event.clone().try_cast::<InputEventMouseMotion>() {
            self.handle_mouse_motion(&motion);
        } else if let Ok(button) = event.clone().try_cast::<InputEventMouseButton>() {
            self.handle_mouse_button(&button);
        } else if let Ok(pan) = event.clone().try_cast::<InputEventPanGesture>() {
            self.handle_pan(&pan);
        } else if let Ok(touch) = event.clone().try_cast::<InputEventScreenTouch>() {
            self.handle_touch(&touch);
        } else if let Ok(drag) = event.clone().try_cast::<InputEventScreenDrag>() {
            self.handle_touch_drag(&drag);
        } else if let Ok(key) = event.try_cast::<InputEventKey>() {
            self.handle_key(&key);
        }
    }

    /// One `pointerleave` for the element left and one `pointerenter` for the element entered, each
    /// naming the other. JS expands them into the per-element DOM chains.
    pub(crate) fn update_hover(&mut self, next: Option<u32>) {
        if self.hovered == next {
            return;
        }
        let previous = self.hovered;
        self.hovered = next;
        if let Some(id) = previous {
            let data = self.mouse_pointer_data(DOM_BUTTON_NONE, 0, next);
            self.queue_crossing(id, next, EventPayload::PointerLeave(data));
        }
        if let Some(id) = next {
            let data = self.mouse_pointer_data(DOM_BUTTON_NONE, 0, previous);
            self.queue_crossing(id, previous, EventPayload::PointerEnter(data));
        }
        self.refresh_interaction();
    }

    fn queue_crossing(&mut self, target: u32, related: Option<u32>, payload: EventPayload) {
        let path = self.mounted.path_of(target);
        let related_path = related
            .map(|tag| self.mounted.path_of(tag))
            .unwrap_or_default();
        self.events
            .push_crossing(target, path, related_path, payload, event_time_ms());
    }

    /// Move focus, queueing `blur` (to the element losing it) and `focus` (to the one gaining it),
    /// each naming the other. `visible` says whether the new focus is a keyboard focus
    /// (`:focus-visible` and the focus ring); focusing the focused element again only updates that.
    pub(crate) fn set_focus(&mut self, next: Option<u32>, visible: bool) {
        let visible = visible && next.is_some();
        if self.focused == next {
            if self.focus_visible != visible {
                self.focus_visible = visible;
                self.refresh_interaction();
                self.paint_pass();
            }
            return;
        }
        self.request_accessibility_update();
        let previous = self
            .focused
            .filter(|id| self.mounted.nodes.contains_key(id));
        if let Some(id) = previous {
            let blur = FocusData {
                related_target: next,
                focus_visible: self.focus_visible,
            };
            self.queue(id, EventPayload::Blur(blur));
        }
        self.focused = next;
        self.focus_visible = visible;
        if let Some(id) = next {
            let focus = FocusData {
                related_target: previous,
                focus_visible: visible,
            };
            self.queue(id, EventPayload::Focus(focus));
        }
        self.refresh_interaction();
        self.text_input_focus_changed(previous, next);
        // The focus ring is drawn by the paint pass, but focus does not always restyle anything
        // (only elements with a `focus:` class do), and a restyle is what normally leads to a
        // pass. Without this the ring would wait for the next unrelated paint.
        self.paint_pass();
    }
}

/// An element tag and a pointer id from JS, which sends both as `i64`.
fn ids(tag: i64, pointer_id: i64) -> Result<(u32, u32), String> {
    let tag = u32::try_from(tag).map_err(|_| format!("tag {tag} is not a u32"))?;
    let pointer_id =
        u32::try_from(pointer_id).map_err(|_| format!("pointer id {pointer_id} is not a u32"))?;
    Ok((tag, pointer_id))
}

pub(crate) fn modifiers_of(event: &InputEventWithModifiers) -> Modifiers {
    Modifiers {
        shift_key: event.is_shift_pressed(),
        ctrl_key: event.is_ctrl_pressed(),
        alt_key: event.is_alt_pressed(),
        meta_key: event.is_meta_pressed(),
    }
}

/// Milliseconds on the engine tick clock, the time base of every event's `timeStamp`.
pub(crate) fn event_time_ms() -> f64 {
    Time::singleton().get_ticks_usec() as f64 / MICROSECONDS_PER_MILLISECOND
}
