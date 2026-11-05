mod events;
mod geometry;
mod layout;
mod motion;
mod paint;
mod pointer;
mod profile;
#[cfg(feature = "probe")]
mod probe;
mod protocol;
mod render_items;
mod style_engine;

use std::collections::BTreeMap;
use std::time::Instant;

use godot::classes::control::{FocusMode, MouseFilter};
use godot::classes::notify::ControlNotification;
use godot::classes::text_server::LineBreakFlag;
use godot::classes::{
    Control, Font, IControl, InputEvent, InputEventKey, InputEventMouseButton,
    InputEventMouseMotion, InputEventWithModifiers, StyleBoxFlat, TextParagraph, ThemeDb, Time,
};
use godot::global::{HorizontalAlignment, Key, MouseButton, MouseButtonMask};
use godot::prelude::*;
use serde::Serialize;
use serde_json::json;
use taffy::prelude::{NodeId, Size, TaffyTree};

use events::{
    DropEffect, EventOutcome, EventPayload, EventQueue, Modifiers, PointerData, PointerType,
};
use geometry::{BoxRect, intersect_clip, intersects};
use layout::compute_tree;
use motion::{IntrinsicTrack, TransitionRecord, validate_motion_changes};
use paint::{parse_color, with_opacity};
use pointer::{
    DOM_BUTTON_NONE, DOM_BUTTON_PRIMARY, DOM_BUTTONS_PRIMARY, KEYBOARD_POINTER_ID,
    MOUSE_POINTER_ID, dom_buttons, enabled_button_ancestor, shared_button_target,
};
use profile::{Profiler, Sample, micros};
use protocol::{Command, Kind, Model, OverflowSpec, StyleSpec, TextAlignSpec, TransitionProperty};
use render_items::RenderItems;
use std::collections::BTreeSet;
use style_engine::{DimensionAxis, DimensionOverrides, StyleEngine, StyleFrame};

const DEFAULT_FONT_SIZE: i32 = 16;
const MILLISECONDS_PER_SECOND: f64 = 1000.0;
const MICROSECONDS_PER_MILLISECOND: f64 = 1000.0;
/// Click counting arrives with the full pointer model; until then every mouse `click` is the first.
const SINGLE_CLICK_DETAIL: u32 = 1;
const CORNER_DETAIL: i32 = 12;
const FOCUS_RING_WIDTH: i32 = 2;
const FOCUS_RING_COLOR: Color = Color::from_rgba(0.49, 0.66, 1.0, 1.0);

struct ReactUiExtension;
#[gdextension]
unsafe impl ExtensionLibrary for ReactUiExtension {}

#[derive(Clone)]
struct TextContext {
    paragraph: Gd<TextParagraph>,
}

struct Visual {
    background: Gd<StyleBoxFlat>,
    paragraph: Option<Gd<TextParagraph>>,
    text_color: Color,
    background_color: Color,
    border_color: Color,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct Stats {
    layout_passes: u64,
    batches: u64,
    node_count: usize,
    paint_passes: u64,
    layout_micros: u64,
    animation_frames: u64,
}

/// A single Godot Control owns the native layout tree and all drawing resources.
/// JS only exchanges validated batched mutations and queued input events.
#[derive(GodotClass)]
#[class(base=Control)]
pub struct ReactUiRoot {
    base: Base<Control>,
    model: Model,
    tree: TaffyTree<TextContext>,
    handles: BTreeMap<u32, NodeId>,
    visuals: BTreeMap<u32, Visual>,
    rects: BTreeMap<u32, BoxRect>,
    paint_order: Vec<u32>,
    opacities: BTreeMap<u32, f32>,
    events: EventQueue,
    /// Nonzero while native is inside an `events_ready` emission; nested input only queues.
    dispatch_depth: u32,
    font: Option<Gd<Font>>,
    viewport_size: Vector2,
    hovered: Option<u32>,
    focused: Option<u32>,
    pressed: Option<u32>,
    pointer: Vector2,
    pointer_known: bool,
    pointer_buttons: u16,
    pointer_modifiers: Modifiers,
    focus_ring: Option<Gd<StyleBoxFlat>>,
    stats: Stats,
    clock_ms: f64,
    profiler: Profiler,
    style_engine: StyleEngine,
    style_frame: StyleFrame,
    intrinsic: BTreeMap<(u32, DimensionAxis), IntrinsicTrack>,
    overrides: BTreeMap<u32, DimensionOverrides>,
    transitions: BTreeMap<(u32, TransitionProperty), TransitionRecord>,
    content_generation: u64,
    clips: BTreeMap<u32, Option<BoxRect>>,
    content_clips: BTreeMap<u32, Option<BoxRect>>,
    items: BTreeMap<u32, RenderItems>,
    focus_items: Option<RenderItems>,
    geometry_micros: u64,
    last_layout_micros: u64,
    phase_layout_micros: u64,
    phase_geometry_micros: u64,
}

#[godot_api]
impl IControl for ReactUiRoot {
    fn init(base: Base<Control>) -> Self {
        let mut tree = TaffyTree::new();
        let root = tree
            .new_leaf(taffy::Style::default())
            .expect("new root layout node");
        Self {
            base,
            model: Model::default(),
            tree,
            handles: BTreeMap::from([(0, root)]),
            visuals: BTreeMap::new(),
            rects: BTreeMap::new(),
            paint_order: Vec::new(),
            opacities: BTreeMap::new(),
            events: EventQueue::new(),
            dispatch_depth: 0,
            font: None,
            viewport_size: Vector2::ZERO,
            hovered: None,
            focused: None,
            pressed: None,
            pointer: Vector2::ZERO,
            pointer_known: false,
            pointer_buttons: 0,
            pointer_modifiers: Modifiers::default(),
            focus_ring: None,
            stats: Stats::default(),
            clock_ms: 0.0,
            profiler: Profiler::default(),
            style_engine: StyleEngine::new(),
            style_frame: StyleFrame::default(),
            intrinsic: BTreeMap::new(),
            overrides: BTreeMap::new(),
            transitions: BTreeMap::new(),
            content_generation: 0,
            clips: BTreeMap::new(),
            content_clips: BTreeMap::new(),
            items: BTreeMap::new(),
            focus_items: None,
            geometry_micros: 0,
            last_layout_micros: 0,
            phase_layout_micros: 0,
            phase_geometry_micros: 0,
        }
    }

    fn ready(&mut self) {
        self.base_mut().set_process(false);
        self.base_mut().set_mouse_filter(MouseFilter::STOP);
        self.base_mut().set_focus_mode(FocusMode::ALL);
        self.base_mut().set_clip_contents(true);
        self.font = self
            .base()
            .get_theme_default_font()
            .or_else(|| ThemeDb::singleton().get_fallback_font());
        // A React tree may be committed before this Control enters the scene tree.
        // Recreate its text resources now that a theme font is available.
        self.visuals.clear();
        let mut ring = StyleBoxFlat::new_gd();
        ring.set_draw_center(false);
        ring.set_border_width_all(FOCUS_RING_WIDTH);
        ring.set_border_color(FOCUS_RING_COLOR);
        self.focus_ring = Some(ring);
        self.focus_items = Some(RenderItems::new(self.base().get_canvas_item()));
        self.sync_model(self.model.clone());
        self.style_frame = self
            .style_engine
            .sync_model(
                &self.model,
                &self.overrides,
                &BTreeSet::new(),
                self.clock_ms / MILLISECONDS_PER_SECOND,
            )
            .expect("validated initial CSS tree");
        self.apply_presentation();
        self.flush_layout();
        self.base_mut().grab_focus();
    }

    fn on_notification(&mut self, what: ControlNotification) {
        match what {
            ControlNotification::RESIZED if self.font.is_some() => {
                self.flush_layout();
                self.refresh_intrinsic_targets();
            }
            ControlNotification::PREDELETE => {
                self.items.clear();
                self.focus_items = None;
            }
            ControlNotification::MOUSE_EXIT => {
                self.pointer_known = false;
                self.update_hover(None);
            }
            ControlNotification::FOCUS_EXIT => {
                self.set_focus(None);
                self.pressed = None;
            }
            ControlNotification::ENTER_TREE if self.font.is_some() => {
                self.apply_presentation();
                self.flush_layout();
                self.refresh_intrinsic_targets();
                let active = self.style_frame.active || !self.intrinsic.is_empty();
                self.base_mut().set_process(active);
            }
            ControlNotification::EXIT_TREE => {
                // Leaving the tree is a pause, not destruction. Keep the native
                // clock, Stylo transitions and presentation overrides for reentry.
                self.events.retain(|payload| {
                    matches!(payload, EventPayload::Blur | EventPayload::PointerLeave(_))
                });
                self.update_hover(None);
                self.set_focus(None);
                self.pressed = None;
                self.pointer_known = false;
                self.base_mut().set_process(false);
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
        self.tick_motion(delta);
    }

    fn draw(&mut self) {
        let draw_started = Instant::now();
        let canvas = self.base().get_canvas_item();
        for (id, items) in &self.items {
            if !self.rects.contains_key(id) {
                items.clear();
            }
        }
        let mut draw_index = 0;
        for id in &self.paint_order {
            let rect = self.rects[id];
            if rect.width <= 0.0 || rect.height <= 0.0 {
                if let Some(items) = self.items.get(id) {
                    items.clear();
                }
                continue;
            }
            let Some(visual) = self.visuals.get_mut(id) else {
                continue;
            };
            let opacity = self.opacities[id];
            visual
                .background
                .set_bg_color(with_opacity(visual.background_color, opacity));
            visual
                .background
                .set_border_color(with_opacity(visual.border_color, opacity));
            let items = self
                .items
                .entry(*id)
                .or_insert_with(|| RenderItems::new(canvas));
            render_items::prepare(
                items.paint,
                draw_index,
                rect.godot_rect(),
                self.clips[id].map(BoxRect::godot_rect),
            );
            draw_index += 1;
            visual.background.draw(items.paint, rect.godot_rect());
            render_items::prepare(
                items.text,
                draw_index,
                rect.godot_rect(),
                self.content_clips[id].map(BoxRect::godot_rect),
            );
            draw_index += 1;
            if let Some(paragraph) = visual.paragraph.as_mut() {
                let layout = self
                    .tree
                    .layout(self.handles[id])
                    .expect("mounted layout exists");
                let left = layout.border.left + layout.padding.left;
                let top = layout.border.top + layout.padding.top;
                let content_width =
                    (rect.width - left - layout.border.right - layout.padding.right).max(0.0);
                paragraph.set_width(content_width);
                paragraph
                    .draw_ex(items.text, Vector2::new(rect.x + left, rect.y + top))
                    .color(with_opacity(visual.text_color, opacity))
                    .done();
            }
        }
        if let Some(items) = &self.focus_items {
            items.clear();
        }
        if let Some(id) = self.focused
            && let Some(rect) = self.rects.get(&id)
            && let Some(ring) = self.focus_ring.as_mut()
        {
            // Focus is an inset stroke so it cannot cover adjacent content.
            ring.set_corner_radius_all(
                self.model.nodes[&id].style.border_radius.unwrap_or(0.0) as i32
            );
            if let Some(items) = &self.focus_items {
                render_items::prepare(
                    items.paint,
                    draw_index,
                    rect.godot_rect(),
                    self.clips[&id].map(BoxRect::godot_rect),
                );
                ring.draw(items.paint, rect.godot_rect());
            }
        }
        self.stats.paint_passes += 1;
        self.profiler.record(Sample::Draw {
            cpu_micros: micros(draw_started),
        });
    }
}

#[godot_api]
impl ReactUiRoot {
    /// Emitted from input callbacks while events are queued. The JS owner connects a callable that
    /// drains them synchronously and answers `preventDefault()` through `resolve_event`.
    #[signal]
    fn events_ready();

    #[func]
    fn apply_batch(&mut self, json: GString) -> GString {
        let total_started = Instant::now();
        let phase = Instant::now();
        let commands: Vec<Command> = match serde_json::from_str(&json.to_string()) {
            Ok(value) => value,
            Err(error) => return GString::from(&format!("Invalid mutation JSON: {error}")),
        };
        let parse_micros = micros(phase);
        let phase = Instant::now();
        let mut staged = self.model.clone();
        let clone_micros = micros(phase);
        let phase = Instant::now();
        if let Err(error) = staged
            .apply(&commands)
            .and_then(|()| validate_motion_changes(&self.model, &staged))
        {
            return GString::from(&error);
        }
        let validate_micros = micros(phase);
        let phase = Instant::now();
        self.phase_layout_micros = 0;
        self.phase_geometry_micros = 0;
        self.publish_model(staged);
        let sync_micros =
            micros(phase).saturating_sub(self.phase_layout_micros + self.phase_geometry_micros);
        self.stats.batches += 1;
        self.stats.node_count = self.model.nodes.len() - 1;
        self.profiler.record(Sample::Batch {
            parse_micros,
            clone_micros,
            validate_micros,
            sync_micros,
            layout_micros: self.phase_layout_micros,
            geometry_micros: self.phase_geometry_micros,
            total_micros: micros(total_started),
        });
        GString::new()
    }

    #[func]
    fn set_profiling(&mut self, enabled: bool) {
        self.profiler.enable(enabled);
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
        let nodes: Vec<_> = self
            .model
            .nodes
            .values()
            .map(|node| {
                json!({
                    "id":node.id, "kind":node.kind, "text":node.text, "parent":node.parent,
                    "children":node.children, "style":node.style,
                    "rect":self.rects.get(&node.id).copied().unwrap_or_default(),
                    "clipRect":self.clips.get(&node.id).copied().flatten(),
                    "presentation":self.presentation_json(node.id)
                })
            })
            .collect();
        json!({"nodes":nodes,"stats":self.stats,"width":self.viewport_size.x,
            "height":self.viewport_size.y,"hovered":self.hovered,"focused":self.focused,
            "pressed":self.pressed,"clockMs":self.clock_ms,"transitions":self.transitions.values().collect::<Vec<_>>()})
        .to_string()
        .as_str()
        .into()
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
    fn sync_model(&mut self, staged: Model) {
        let layout_changed = self.model.nodes.len() != staged.nodes.len()
            || staged.nodes.iter().any(|(id, node)| {
                self.model.nodes.get(id).is_none_or(|old| {
                    old.text != node.text
                        || old.style.font_size != node.style.font_size
                        || old.style.text_align != node.style.text_align
                        || old.children != node.children
                        || old.style.taffy_style().expect("validated previous style")
                            != node.style.taffy_style().expect("validated next style")
                })
            });
        if layout_changed {
            self.content_generation += 1;
        }
        let removed: Vec<u32> = self
            .handles
            .keys()
            .filter(|id| !staged.nodes.contains_key(id))
            .copied()
            .collect();
        for id in removed {
            let handle = self.handles.remove(&id).expect("enumerated handle");
            self.tree.remove(handle).expect("known Taffy handle");
            self.visuals.remove(&id);
            self.items.remove(&id);
        }
        for (id, node) in &staged.nodes {
            let style = node
                .style
                .taffy_style()
                .expect("style validated before native mutation");
            let handle = match self.handles.get(id) {
                Some(handle) => *handle,
                None => {
                    let handle = self.tree.new_leaf(style.clone()).expect("valid new layout");
                    self.handles.insert(*id, handle);
                    handle
                }
            };
            let authored_layout_changed = self.model.nodes.get(id).is_none_or(|old| {
                old.style
                    .taffy_style()
                    .expect("validated previous style")
                    != style
            });
            if *id != 0
                && authored_layout_changed
                && self.tree.style(handle).expect("known handle") != &style
            {
                self.tree.set_style(handle, style).expect("known handle");
            }
            let old = self.model.nodes.get(id);
            let needs_visual = !self.visuals.contains_key(id)
                || old.is_none_or(|old| old.style != node.style || old.text != node.text);
            if needs_visual && *id != 0 {
                let text_changed = !self.visuals.contains_key(id)
                    || old.is_none_or(|old| {
                        old.text != node.text
                            || old.style.font_size != node.style.font_size
                            || old.style.text_align != node.style.text_align
                    });
                let previous_paragraph = self
                    .visuals
                    .get(id)
                    .and_then(|visual| visual.paragraph.clone());
                let mut visual =
                    self.make_visual(&node.style, if text_changed { &node.text } else { "" });
                if text_changed {
                    let context = visual
                        .paragraph
                        .clone()
                        .map(|paragraph| TextContext { paragraph });
                    self.tree
                        .set_node_context(handle, context)
                        .expect("known handle");
                } else {
                    visual.paragraph = previous_paragraph;
                }
                self.visuals.insert(*id, visual);
            }
        }
        let changed: Vec<u32> = staged
            .nodes
            .iter()
            .filter_map(|(id, node)| {
                if self
                    .model
                    .nodes
                    .get(id)
                    .is_none_or(|old| old.children != node.children)
                {
                    Some(*id)
                } else {
                    None
                }
            })
            .collect();
        // Detach every changed parent first; then reparent with the final topology.
        for id in &changed {
            self.tree
                .set_children(self.handles[id], &[])
                .expect("known handle");
        }
        for id in changed {
            let children: Vec<_> = staged.nodes[&id]
                .children
                .iter()
                .map(|child| self.handles[child])
                .collect();
            self.tree
                .set_children(self.handles[&id], &children)
                .expect("validated acyclic topology");
        }
        self.model = staged;
        self.intrinsic
            .retain(|(id, _), _| self.model.nodes.contains_key(id));
        self.overrides
            .retain(|id, _| self.model.nodes.contains_key(id));
        self.transitions
            .retain(|(id, _), _| self.model.nodes.contains_key(id));
        if self
            .focused
            .is_some_and(|id| !self.model.nodes.contains_key(&id) || self.disabled(id))
        {
            self.set_focus(None);
        }
        if self
            .pressed
            .is_some_and(|id| !self.model.nodes.contains_key(&id) || self.disabled(id))
        {
            self.pressed = None;
        }
    }

    fn make_visual(&self, style: &StyleSpec, text: &str) -> Visual {
        let opacity = 1.0;
        let mut background = StyleBoxFlat::new_gd();
        background.set_bg_color(parse_color(
            style.background_color.as_deref(),
            Color::TRANSPARENT_BLACK,
            opacity,
        ));
        background.set_border_color(parse_color(
            style.border_color.as_deref(),
            Color::TRANSPARENT_BLACK,
            opacity,
        ));
        background.set_border_width_all(style.border_width.unwrap_or(0.0).round() as i32);
        background.set_corner_radius_all(style.border_radius.unwrap_or(0.0).round() as i32);
        background.set_corner_detail(CORNER_DETAIL);
        let paragraph = if !text.is_empty() {
            self.font.as_ref().map(|font| {
                let mut paragraph = TextParagraph::new_gd();
                // Match Godot Label AUTOWRAP_WORD_SMART: grapheme fallback only for
                // words wider than the line, not an unconditional break per glyph.
                paragraph.set_break_flags(
                    LineBreakFlag::MANDATORY | LineBreakFlag::WORD_BOUND | LineBreakFlag::ADAPTIVE,
                );
                paragraph.set_alignment(match style.text_align {
                    Some(TextAlignSpec::Center) => HorizontalAlignment::CENTER,
                    Some(TextAlignSpec::Right) => HorizontalAlignment::RIGHT,
                    _ => HorizontalAlignment::LEFT,
                });
                assert!(
                    paragraph.add_string(text, font, style.font_size.unwrap_or(DEFAULT_FONT_SIZE)),
                    "Godot rejected validated text/font"
                );
                paragraph
            })
        } else {
            None
        };
        Visual {
            background,
            paragraph,
            text_color: parse_color(style.color.as_deref(), Color::WHITE, opacity),
            background_color: parse_color(
                style.background_color.as_deref(),
                Color::TRANSPARENT_BLACK,
                opacity,
            ),
            border_color: parse_color(
                style.border_color.as_deref(),
                Color::TRANSPARENT_BLACK,
                opacity,
            ),
        }
    }

    fn flush_layout(&mut self) {
        let layout_passes_before = self.stats.layout_passes;
        self.viewport_size = self.base().get_size();
        let root = self.handles[&0];
        let mut root_style = self.model.nodes[&0]
            .style
            .taffy_style()
            .expect("validated root style");
        root_style.size = Size {
            width: taffy::prelude::length(self.viewport_size.x),
            height: taffy::prelude::length(self.viewport_size.y),
        };
        if self.tree.style(root).expect("root exists") != &root_style {
            self.tree.set_style(root, root_style).expect("root exists");
        }
        if self.tree.dirty(root).expect("root exists") {
            let start = Instant::now();
            compute_tree(&mut self.tree, root, self.viewport_size);
            self.stats.layout_micros = start.elapsed().as_micros() as u64;
            self.stats.layout_passes += 1;
        }
        self.last_layout_micros = if self.stats.layout_passes > layout_passes_before {
            self.stats.layout_micros
        } else {
            0
        };
        let geometry_started = Instant::now();
        self.rects.clear();
        self.clips.clear();
        self.content_clips.clear();
        self.paint_order.clear();
        self.opacities.clear();
        self.collect_rects(
            0,
            Vector2::ZERO,
            1.0,
            Some(BoxRect {
                x: 0.0,
                y: 0.0,
                width: self.viewport_size.x,
                height: self.viewport_size.y,
            }),
        );
        if self.focused.is_some_and(|id| !self.visible_for_input(id)) {
            self.set_focus(None);
        }
        if self.pressed.is_some_and(|id| !self.visible_for_input(id)) {
            self.pressed = None;
        }
        let hit = if self.pointer_known {
            self.hit_test(self.pointer)
        } else {
            None
        };
        self.update_hover(hit);
        self.geometry_micros = micros(geometry_started);
        self.phase_layout_micros += self.last_layout_micros;
        self.phase_geometry_micros += self.geometry_micros;
        self.base_mut().queue_redraw();
    }

    fn collect_rects(
        &mut self,
        id: u32,
        origin: Vector2,
        parent_opacity: f32,
        inherited_clip: Option<BoxRect>,
    ) {
        let node = &self.model.nodes[&id];
        if node.style.display == Some(protocol::DisplaySpec::None) {
            return;
        }
        let layout = self
            .tree
            .layout(self.handles[&id])
            .expect("known mounted handle");
        let position = origin + Vector2::new(layout.location.x, layout.location.y);
        self.rects.insert(
            id,
            BoxRect {
                x: position.x,
                y: position.y,
                width: layout.size.width,
                height: layout.size.height,
            },
        );
        self.clips.insert(id, inherited_clip);
        let own_clip = if node.style.overflow == Some(OverflowSpec::Hidden) {
            let box_rect = self.rects[&id];
            Some(BoxRect {
                x: box_rect.x + layout.border.left,
                y: box_rect.y + layout.border.top,
                width: (box_rect.width - layout.border.left - layout.border.right).max(0.0),
                height: (box_rect.height - layout.border.top - layout.border.bottom).max(0.0),
            })
        } else {
            None
        };
        let content_clip = intersect_clip(inherited_clip, own_clip);
        self.content_clips.insert(id, content_clip);
        let sampled_opacity = self
            .style_frame
            .values
            .get(&id)
            .map(|value| value.opacity)
            .unwrap_or(node.style.opacity.unwrap_or(1.0));
        let opacity = parent_opacity * sampled_opacity;
        self.opacities.insert(id, opacity);
        if id != 0 {
            self.paint_order.push(id);
        }
        let children = node.children.clone();
        for child in children {
            self.collect_rects(child, position, opacity, content_clip);
        }
    }

    fn hit_test(&self, point: Vector2) -> Option<u32> {
        if point.x < 0.0
            || point.y < 0.0
            || point.x >= self.viewport_size.x
            || point.y >= self.viewport_size.y
        {
            return None;
        }
        self.paint_order
            .iter()
            .rev()
            .find(|id| {
                self.rects[id].contains(point)
                    && self.clips[id].is_none_or(|clip| clip.contains(point))
            })
            .copied()
    }

    fn visible_for_input(&self, id: u32) -> bool {
        self.rects.get(&id).is_some_and(|rect| {
            rect.width > 0.0
                && rect.height > 0.0
                && self
                    .clips
                    .get(&id)
                    .copied()
                    .flatten()
                    .is_none_or(|clip| intersects(*rect, clip))
        })
    }

    fn disabled(&self, mut id: u32) -> bool {
        loop {
            let node = &self.model.nodes[&id];
            if node.style.disabled == Some(true) {
                return true;
            }
            match node.parent {
                Some(parent) => id = parent,
                None => return false,
            }
        }
    }

    fn button_ancestor(&self, id: u32) -> Option<u32> {
        enabled_button_ancestor(&self.model, id)
    }

    fn queue(&mut self, target: u32, payload: EventPayload) {
        self.events.push(target, payload, event_time_ms());
    }

    /// Everything that still describes the pointer when an event is not itself input: the last
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
            x: self.pointer.x,
            y: self.pointer.y,
            // Canvas coordinates replace these root-local copies with the engine's own transform.
            viewport_x: self.pointer.x,
            viewport_y: self.pointer.y,
            pointer_id,
            pointer_type,
            button,
            buttons,
            detail,
            related_target,
            modifiers: self.pointer_modifiers,
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
        self.pointer = position;
        self.pointer_known = true;
        self.pointer_buttons = dom_buttons(mask);
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
        let seq = self.events.push_awaited(target, payload, event_time_ms());
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

    /// Mouse, button and key handling. Events are queued here and delivered by the caller.
    fn handle_input(&mut self, event: Gd<InputEvent>) {
        if let Ok(motion) = event.clone().try_cast::<InputEventMouseMotion>() {
            self.track_mouse(
                motion.get_position(),
                motion.get_button_mask(),
                modifiers_of(&motion),
            );
            let hit = self.hit_test(self.pointer);
            self.update_hover(hit);
            if let Some(id) = hit {
                let data = self.mouse_pointer_data(DOM_BUTTON_NONE, 0, None);
                self.queue(id, EventPayload::PointerMove(data));
            }
        } else if let Ok(button) = event.clone().try_cast::<InputEventMouseButton>() {
            if button.get_button_index() != MouseButton::LEFT {
                return;
            }
            self.track_mouse(
                button.get_position(),
                button.get_button_mask(),
                modifiers_of(&button),
            );
            let hit = self.hit_test(self.pointer);
            self.update_hover(hit);
            if button.is_pressed() {
                if !self.press_primary(hit) {
                    return;
                }
            } else {
                self.release_primary(hit);
            }
            self.base_mut().accept_event();
        } else if let Ok(key) = event.try_cast::<InputEventKey>() {
            if key.is_echo() {
                return;
            }
            self.pointer_modifiers = modifiers_of(&key);
            let code = key.get_keycode();
            if code == Key::TAB && key.is_pressed() {
                self.advance_focus(key.is_shift_pressed());
                self.base_mut().accept_event();
            } else if (code == Key::ENTER || code == Key::KP_ENTER || code == Key::SPACE)
                && let Some(id) = self.focused.filter(|id| !self.disabled(*id))
            {
                if key.is_pressed() {
                    self.pressed = Some(id);
                    let data = self.synthetic_pointer_data(DOM_BUTTONS_PRIMARY, 0);
                    self.queue(id, EventPayload::PointerDown(data));
                } else {
                    let data = self.synthetic_pointer_data(0, 0);
                    self.queue(id, EventPayload::PointerUp(data));
                    if self.pressed == Some(id) {
                        self.queue(id, EventPayload::Click(data));
                    }
                    self.pressed = None;
                }
                self.base_mut().accept_event();
            }
        }
    }

    /// Primary button press. Returns false when JS left the root outside the scene tree while
    /// handling `pointerdown`: nothing native may run afterwards (plan 3.3 rule 4).
    fn press_primary(&mut self, hit: Option<u32>) -> bool {
        self.pressed = hit.filter(|id| !self.disabled(*id));
        let mut prevented = false;
        if let Some(id) = self.pressed {
            let data = self.mouse_pointer_data(DOM_BUTTON_PRIMARY, 0, None);
            prevented = self
                .dispatch_cancelable(id, EventPayload::PointerDown(data))
                .default_prevented;
            if !self.base().is_inside_tree() {
                return false;
            }
        }
        // JS may have removed the element it just handled the press on; the default action is
        // skipped then (plan 3.3 rule 3). Everything else looks the target up again.
        let target_removed = hit.is_some_and(|id| !self.model.nodes.contains_key(&id));
        if !prevented && !target_removed {
            // Default action: the nearest enabled button takes focus.
            self.base_mut().grab_focus();
            let focus = hit.and_then(|id| self.button_ancestor(id));
            self.set_focus(focus);
        }
        true
    }

    fn release_primary(&mut self, hit: Option<u32>) {
        if let Some(id) = hit.filter(|id| !self.disabled(*id)) {
            let up = self.mouse_pointer_data(DOM_BUTTON_PRIMARY, 0, None);
            self.queue(id, EventPayload::PointerUp(up));
            let click = self.pressed.and_then(|pressed| {
                if pressed == id {
                    Some(id)
                } else {
                    // Padding and label are different pointer targets, but they
                    // activate the same button. Keep pointer event IDs unchanged.
                    shared_button_target(&self.model, pressed, id)
                }
            });
            if let Some(target) = click {
                let data = self.mouse_pointer_data(DOM_BUTTON_PRIMARY, SINGLE_CLICK_DETAIL, None);
                self.queue(target, EventPayload::Click(data));
            }
        }
        self.pressed = None;
    }

    /// One `pointerleave` for the element left and one `pointerenter` for the element entered, each
    /// naming the other. JS expands them into the per-element DOM chains.
    fn update_hover(&mut self, next: Option<u32>) {
        if self.hovered == next {
            return;
        }
        let previous = self.hovered;
        self.hovered = next;
        if let Some(id) = previous {
            let data = self.mouse_pointer_data(DOM_BUTTON_NONE, 0, next);
            self.queue(id, EventPayload::PointerLeave(data));
        }
        if let Some(id) = next {
            let data = self.mouse_pointer_data(DOM_BUTTON_NONE, 0, previous);
            self.queue(id, EventPayload::PointerEnter(data));
        }
    }

    fn set_focus(&mut self, next: Option<u32>) {
        if self.focused == next {
            return;
        }
        if let Some(id) = self.focused {
            self.queue(id, EventPayload::Blur);
        }
        self.focused = next;
        if let Some(id) = next {
            self.queue(id, EventPayload::Focus);
        }
        self.base_mut().queue_redraw();
    }

    fn advance_focus(&mut self, backwards: bool) {
        let buttons: Vec<u32> = self
            .paint_order
            .iter()
            .copied()
            .filter(|id| {
                self.model.nodes[id].kind == Kind::Button
                    && !self.disabled(*id)
                    && self.clips[id].is_none_or(|clip| intersects(self.rects[id], clip))
            })
            .collect();
        if buttons.is_empty() {
            self.set_focus(None);
            return;
        }
        let current = self
            .focused
            .and_then(|id| buttons.iter().position(|candidate| *candidate == id));
        let index = match (current, backwards) {
            (Some(index), false) => (index + 1) % buttons.len(),
            (Some(index), true) => (index + buttons.len() - 1) % buttons.len(),
            (None, false) => 0,
            (None, true) => buttons.len() - 1,
        };
        self.set_focus(Some(buttons[index]));
    }
}

fn modifiers_of(event: &InputEventWithModifiers) -> Modifiers {
    Modifiers {
        shift_key: event.is_shift_pressed(),
        ctrl_key: event.is_ctrl_pressed(),
        alt_key: event.is_alt_pressed(),
        meta_key: event.is_meta_pressed(),
    }
}

/// Milliseconds on the engine tick clock, the time base of every event's `timeStamp`.
fn event_time_ms() -> f64 {
    Time::singleton().get_ticks_usec() as f64 / MICROSECONDS_PER_MILLISECOND
}
