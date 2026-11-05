mod profile;
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
    InputEventMouseMotion, StyleBoxFlat, TextParagraph, ThemeDb,
};
use godot::global::{HorizontalAlignment, Key, MouseButton};
use godot::prelude::*;
use serde::Serialize;
use serde_json::json;
use taffy::prelude::{AvailableSpace, NodeId, Size, TaffyTree};

use profile::{Profiler, Sample};
use protocol::{
    Command, Dimension, InterpolateSize, Kind, Model, OverflowSpec, StyleSpec, TextAlignSpec,
    TransitionProperty,
};
use render_items::RenderItems;
use std::collections::BTreeSet;
use style_engine::{DimensionAxis, DimensionOverrides, StyleEngine, StyleFrame};

const DEFAULT_FONT_SIZE: i32 = 16;
const MILLISECONDS_PER_SECOND: f64 = 1000.0;
const HEX_COLOR_CHANNEL_MAX: f32 = 255.0;
const PERCENTAGE_SCALE: f32 = 100.0;
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

#[derive(Default, Clone, Copy, Serialize)]
struct BoxRect {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
}

impl BoxRect {
    fn contains(&self, point: Vector2) -> bool {
        point.x >= self.x
            && point.y >= self.y
            && point.x < self.x + self.width
            && point.y < self.y + self.height
    }
    fn godot_rect(self) -> Rect2 {
        Rect2::new(
            Vector2::new(self.x, self.y),
            Vector2::new(self.width, self.height),
        )
    }
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

#[derive(Serialize)]
struct UiEvent {
    id: u32,
    #[serde(rename = "type")]
    event_type: &'static str,
    x: f32,
    y: f32,
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
    events: Vec<UiEvent>,
    font: Option<Gd<Font>>,
    viewport_size: Vector2,
    hovered: Option<u32>,
    focused: Option<u32>,
    pressed: Option<u32>,
    pointer: Vector2,
    pointer_known: bool,
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
            events: Vec::new(),
            font: None,
            viewport_size: Vector2::ZERO,
            hovered: None,
            focused: None,
            pressed: None,
            pointer: Vector2::ZERO,
            pointer_known: false,
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
                self.events
                    .retain(|event| matches!(event.event_type, "blur" | "pointerleave"));
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
        if let Ok(motion) = event.clone().try_cast::<InputEventMouseMotion>() {
            self.pointer = motion.get_position();
            self.pointer_known = true;
            let hit = self.hit_test(self.pointer);
            self.update_hover(hit);
            if let Some(id) = hit {
                self.emit(id, "pointermove");
            }
        } else if let Ok(button) = event.clone().try_cast::<InputEventMouseButton>() {
            if button.get_button_index() != MouseButton::LEFT {
                return;
            }
            self.pointer = button.get_position();
            self.pointer_known = true;
            let hit = self.hit_test(self.pointer);
            self.update_hover(hit);
            if button.is_pressed() {
                self.base_mut().grab_focus();
                self.pressed = hit.filter(|id| !self.disabled(*id));
                let focus = hit.and_then(|id| self.button_ancestor(id));
                self.set_focus(focus);
                if let Some(id) = self.pressed {
                    self.emit(id, "pointerdown");
                }
            } else {
                if let Some(id) = hit.filter(|id| !self.disabled(*id)) {
                    self.emit(id, "pointerup");
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
                        self.emit(target, "click");
                    }
                }
                self.pressed = None;
            }
            self.base_mut().accept_event();
        } else if let Ok(key) = event.try_cast::<InputEventKey>() {
            if key.is_echo() {
                return;
            }
            let code = key.get_keycode();
            if code == Key::TAB && key.is_pressed() {
                self.advance_focus(key.is_shift_pressed());
                self.base_mut().accept_event();
            } else if (code == Key::ENTER || code == Key::KP_ENTER || code == Key::SPACE)
                && let Some(id) = self.focused.filter(|id| !self.disabled(*id))
            {
                if key.is_pressed() {
                    self.pressed = Some(id);
                    self.emit(id, "pointerdown");
                } else {
                    self.emit(id, "pointerup");
                    if self.pressed == Some(id) {
                        self.emit(id, "click");
                    }
                    self.pressed = None;
                }
                self.base_mut().accept_event();
            }
        }
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
        let events = std::mem::take(&mut self.events);
        serde_json::to_string(&events)
            .expect("finite input coordinates")
            .as_str()
            .into()
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
            self.tree
                .compute_layout_with_measure(
                    root,
                    Size {
                        width: AvailableSpace::Definite(self.viewport_size.x),
                        height: AvailableSpace::Definite(self.viewport_size.y),
                    },
                    |inputs, _, context, style| {
                        taffy::compute_leaf_layout(
                            inputs,
                            style,
                            |_, _| 0.0,
                            |known, available| {
                                let Some(context) = context.as_ref() else {
                                    return Size::ZERO;
                                };
                                let mut paragraph = context.paragraph.clone();
                                let width = known.width.unwrap_or(match available.width {
                                    AvailableSpace::Definite(width) => width,
                                    AvailableSpace::MinContent => 0.0,
                                    AvailableSpace::MaxContent => -1.0,
                                });
                                paragraph.set_width(width);
                                let measured = paragraph.get_size();
                                Size {
                                    width: known.width.unwrap_or(measured.x),
                                    height: known.height.unwrap_or(measured.y),
                                }
                            },
                        )
                    },
                )
                .expect("validated native layout tree");
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

    fn emit(&mut self, id: u32, event_type: &'static str) {
        self.events.push(UiEvent {
            id,
            event_type,
            x: self.pointer.x,
            y: self.pointer.y,
        });
    }

    fn update_hover(&mut self, next: Option<u32>) {
        if self.hovered == next {
            return;
        }
        if let Some(id) = self.hovered {
            self.emit(id, "pointerleave");
        }
        self.hovered = next;
        if let Some(id) = next {
            self.emit(id, "pointerenter");
        }
    }

    fn set_focus(&mut self, next: Option<u32>) {
        if self.focused == next {
            return;
        }
        if let Some(id) = self.focused {
            self.emit(id, "blur");
        }
        self.focused = next;
        if let Some(id) = next {
            self.emit(id, "focus");
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

fn parse_color(value: Option<&str>, default: Color, opacity: f32) -> Color {
    let mut color = value.and_then(Color::from_html).unwrap_or(default);
    color.a *= opacity;
    color
}

fn with_opacity(mut color: Color, opacity: f32) -> Color {
    color.a *= opacity;
    color
}

/// Find the nearest button while checking the whole ancestor chain for disabling.
/// Pointer IDs refer to the actual painted leaf; button activation has its own owner.
fn enabled_button_ancestor(model: &Model, mut id: u32) -> Option<u32> {
    let mut button = None;
    loop {
        let node = &model.nodes[&id];
        if node.style.disabled == Some(true) {
            return None;
        }
        if button.is_none() && node.kind == Kind::Button {
            button = Some(id);
        }
        match node.parent {
            Some(parent) => id = parent,
            None => return button,
        }
    }
}

fn shared_button_target(model: &Model, pressed: u32, released: u32) -> Option<u32> {
    let button = enabled_button_ancestor(model, pressed)?;
    (enabled_button_ancestor(model, released) == Some(button)).then_some(button)
}

#[cfg(test)]
mod input_tests {
    use super::*;

    fn buttons() -> Model {
        let commands: Vec<Command> = serde_json::from_str(
            r#"[
            {"op":"create","id":1,"kind":"button"},
            {"op":"create","id":2,"kind":"text"},
            {"op":"create","id":3,"kind":"view"},
            {"op":"create","id":4,"kind":"text"},
            {"op":"create","id":5,"kind":"button"},
            {"op":"create","id":6,"kind":"text"},
            {"op":"create","id":7,"kind":"view"},
            {"op":"children","id":3,"children":[4]},
            {"op":"children","id":1,"children":[2,3]},
            {"op":"children","id":5,"children":[6]},
            {"op":"children","id":0,"children":[1,5,7]}
        ]"#,
        )
        .expect("valid input fixture");
        let mut model = Model::default();
        model.apply(&commands).expect("valid button hierarchy");
        model
    }

    #[test]
    fn padding_and_descendants_activate_their_shared_button() {
        let model = buttons();
        assert_eq!(shared_button_target(&model, 1, 2), Some(1));
        assert_eq!(shared_button_target(&model, 2, 1), Some(1));
        assert_eq!(shared_button_target(&model, 2, 4), Some(1));
    }

    #[test]
    fn crossing_buttons_or_releasing_outside_does_not_activate() {
        let model = buttons();
        assert_eq!(shared_button_target(&model, 1, 5), None);
        assert_eq!(shared_button_target(&model, 2, 6), None);
        assert_eq!(shared_button_target(&model, 2, 7), None);
    }

    #[test]
    fn disabled_button_or_ancestor_cannot_activate() {
        let mut model = buttons();
        let commands: Vec<Command> =
            serde_json::from_str(r#"[{"op":"style","id":1,"style":{"disabled":true}}]"#)
                .expect("valid disabled style");
        model.apply(&commands).expect("valid disabled button");
        assert_eq!(shared_button_target(&model, 1, 2), None);
        let commands: Vec<Command> =
            serde_json::from_str(r#"[{"op":"style","id":0,"style":{"disabled":true}}]"#)
                .expect("valid disabled ancestor");
        model.apply(&commands).expect("valid disabled root");
        assert_eq!(shared_button_target(&model, 5, 6), None);
    }
}

#[derive(Clone)]
struct IntrinsicTrack {
    target_px: f32,
    content_generation: u64,
    parent_basis: Vector2,
    measured_width: f32,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
enum MotionValue {
    Number(f32),
    Color(String),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TransitionRecord {
    id: u32,
    property: TransitionProperty,
    current: MotionValue,
    target: MotionValue,
    started_at_ms: f64,
    duration_ms: f64,
}

impl ReactUiRoot {
    fn activity_json(&self) -> serde_json::Value {
        json!({"batches":self.stats.batches,"layoutPasses":self.stats.layout_passes,
            "paintPasses":self.stats.paint_passes,"animationFrames":self.stats.animation_frames,
            "animating":self.style_frame.active || !self.intrinsic.is_empty(),"trackedTransitions":self.transitions.len(),"clockMs":self.clock_ms,
            "drawSerial":self.stats.paint_passes,"nodeCount":self.stats.node_count})
    }

    fn presentation_json(&self, id: u32) -> serde_json::Value {
        let rect = self.rects.get(&id).copied().unwrap_or_default();
        let style = &self.model.nodes[&id].style;
        let value = self.style_frame.values.get(&id);
        let layout_style = self
            .tree
            .style(self.handles[&id])
            .expect("snapshot layout node exists");
        json!({"width":rect.width,"height":rect.height,
            "widthIsAuto":layout_style.size.width.is_auto(),"heightIsAuto":layout_style.size.height.is_auto(),
            "opacity":value.map(|v|v.opacity).unwrap_or(style.opacity.unwrap_or(1.0)),
            "backgroundColor":value.map(|v|color_hex(v.background_color)).unwrap_or_else(||
                color_hex(color_components(parse_color(style.background_color.as_deref(), Color::TRANSPARENT_BLACK, 1.0))))})
    }

    fn parent_basis(&self, id: u32) -> Vector2 {
        let Some(parent) = self.model.nodes[&id].parent else {
            return self.viewport_size;
        };
        let Some(rect) = self.rects.get(&parent) else {
            return self.viewport_size;
        };
        let layout = self
            .tree
            .layout(self.handles[&parent])
            .expect("known parent layout");
        Vector2::new(
            (rect.width
                - layout.padding.left
                - layout.padding.right
                - layout.border.left
                - layout.border.right)
                .max(0.0),
            (rect.height
                - layout.padding.top
                - layout.padding.bottom
                - layout.border.top
                - layout.border.bottom)
                .max(0.0),
        )
    }

    fn apply_presentation(&mut self) {
        for (id, value) in &self.style_frame.values {
            let Some(node) = self.model.nodes.get(id) else {
                continue;
            };
            if *id == 0 {
                continue;
            }
            let mut style = node.style.taffy_style().expect("validated authored style");
            style.size.width = value
                .width
                .to_taffy()
                .expect("mixed units rejected before mutation");
            style.size.height = value
                .height
                .to_taffy()
                .expect("mixed units rejected before mutation");
            let handle = self.handles[id];
            if self.tree.style(handle).expect("known presentation node") != &style {
                self.tree
                    .set_style(handle, style)
                    .expect("known presentation node");
            }
            if let Some(visual) = self.visuals.get_mut(id) {
                visual.background_color = Color::from_rgba(
                    value.background_color[0],
                    value.background_color[1],
                    value.background_color[2],
                    value.background_color[3],
                );
            }
        }
    }

    fn publish_model(&mut self, staged: Model) {
        let mut changed = Vec::new();
        let mut intrinsic_changes = Vec::new();
        for (id, node) in &staged.nodes {
            let Some(previous) = self.model.nodes.get(id) else {
                continue;
            };
            let Some(transition) = &node.style.transition else {
                continue;
            };
            if transition.duration_ms == 0.0 || !self.rects.contains_key(id) {
                continue;
            }
            for property in &transition.properties {
                if property_changed(&previous.style, &node.style, *property) {
                    if let Some(axis) = property_axis(*property) {
                        let old = dimension_value(&previous.style, axis);
                        let new = dimension_value(&node.style, axis);
                        if is_auto(&old) || is_auto(&new) {
                            if effective_interpolate_size(&staged, *id)
                                != InterpolateSize::AllowKeywords
                            {
                                continue;
                            }
                            intrinsic_changes.push((*id, axis));
                        }
                    }
                    changed.push((*id, *property, transition.duration_ms));
                }
            }
        }
        // Prime only keyword boundaries; ordinary numeric/color interpolation and
        // interruption/reversal remain entirely inside Stylo.
        for (id, axis) in &intrinsic_changes {
            if !self.intrinsic.contains_key(&(*id, *axis)) {
                let rect = self.rects[id];
                let current = match axis {
                    DimensionAxis::Width => rect.width,
                    DimensionAxis::Height => rect.height,
                };
                self.style_engine
                    .prime_dimension(*id, *axis, current, self.clock_ms / MILLISECONDS_PER_SECOND)
                    .expect("validated intrinsic prime");
            }
        }
        self.sync_model(staged);
        // New content is present in native measurement contexts, but no geometry
        // has been published or drawn from this target-only state.
        for (id, axis) in intrinsic_changes {
            let target_px = self.measure_endpoint(id, axis);
            set_override(&mut self.overrides, id, axis, Some(target_px));
            self.intrinsic.insert(
                (id, axis),
                IntrinsicTrack {
                    target_px,
                    content_generation: self.content_generation,
                    parent_basis: self.parent_basis(id),
                    measured_width: self.rects.get(&id).map(|rect| rect.width).unwrap_or(0.0),
                },
            );
        }
        self.style_frame = self
            .style_engine
            .sync_model(
                &self.model,
                &self.overrides,
                &BTreeSet::new(),
                self.clock_ms / MILLISECONDS_PER_SECOND,
            )
            .expect("validated CSS transaction");
        self.apply_presentation();
        self.flush_layout();
        for (id, property, duration_ms) in changed {
            let current = self.current_motion_value(id, property);
            let target = self.target_motion_value(id, property);
            if current != target {
                self.transitions.insert(
                    (id, property),
                    TransitionRecord {
                        id,
                        property,
                        current,
                        target,
                        started_at_ms: self.clock_ms,
                        duration_ms,
                    },
                );
            }
        }
        self.refresh_intrinsic_targets();
        self.finish_transitions();
        let active = (self.style_frame.active || !self.intrinsic.is_empty())
            && self.base().is_inside_tree();
        self.base_mut().set_process(active);
    }

    fn current_motion_value(&self, id: u32, property: TransitionProperty) -> MotionValue {
        let node = &self.model.nodes[&id];
        let sample = self.style_frame.values.get(&id);
        let basis = self.parent_basis(id);
        match property {
            TransitionProperty::Width => MotionValue::Number(
                sample
                    .and_then(|v| v.width.resolve(basis.x))
                    .unwrap_or(self.rects[&id].width),
            ),
            TransitionProperty::Height => MotionValue::Number(
                sample
                    .and_then(|v| v.height.resolve(basis.y))
                    .unwrap_or(self.rects[&id].height),
            ),
            TransitionProperty::Opacity => MotionValue::Number(
                sample
                    .map(|v| v.opacity)
                    .unwrap_or(node.style.opacity.unwrap_or(1.0)),
            ),
            TransitionProperty::BackgroundColor => MotionValue::Color(
                sample
                    .map(|v| color_hex(v.background_color))
                    .unwrap_or_else(|| {
                        color_hex(color_components(parse_color(
                            node.style.background_color.as_deref(),
                            Color::TRANSPARENT_BLACK,
                            1.0,
                        )))
                    }),
            ),
        }
    }

    fn target_motion_value(&self, id: u32, property: TransitionProperty) -> MotionValue {
        let style = &self.model.nodes[&id].style;
        match property {
            TransitionProperty::Width | TransitionProperty::Height => {
                let axis = property_axis(property).expect("dimension property");
                let value = self
                    .intrinsic
                    .get(&(id, axis))
                    .map(|track| track.target_px)
                    .unwrap_or_else(|| {
                        let basis = self.parent_basis(id);
                        resolve_dimension(
                            &dimension_value(style, axis),
                            match axis {
                                DimensionAxis::Width => basis.x,
                                DimensionAxis::Height => basis.y,
                            },
                        )
                        .unwrap_or_else(|| match axis {
                            DimensionAxis::Width => self.rects[&id].width,
                            DimensionAxis::Height => self.rects[&id].height,
                        })
                    });
                MotionValue::Number(value)
            }
            TransitionProperty::Opacity => MotionValue::Number(style.opacity.unwrap_or(1.0)),
            TransitionProperty::BackgroundColor => {
                MotionValue::Color(color_hex(color_components(parse_color(
                    style.background_color.as_deref(),
                    Color::TRANSPARENT_BLACK,
                    1.0,
                ))))
            }
        }
    }

    fn measure_endpoint(&self, id: u32, axis: DimensionAxis) -> f32 {
        let mut probe = self.tree.clone();
        // TaffyTree::clone would otherwise retain the same mutable Godot paragraph
        // resources. Duplicate shaping buffers so measuring an endpoint never
        // changes visible text wrapping or the presentation tree's geometry.
        for (node_id, handle) in &self.handles {
            if let Some(paragraph) = self
                .visuals
                .get(node_id)
                .and_then(|visual| visual.paragraph.as_ref())
            {
                let duplicate = paragraph
                    .duplicate()
                    .expect("TextParagraph duplicate is available");
                probe
                    .set_node_context(
                        *handle,
                        Some(TextContext {
                            paragraph: duplicate,
                        }),
                    )
                    .expect("known probe handle");
            }
        }
        let handle = self.handles[&id];
        let mut style = probe.style(handle).expect("known probe style").clone();
        let authored = self.model.nodes[&id]
            .style
            .taffy_style()
            .expect("validated intrinsic target");
        match axis {
            DimensionAxis::Width => style.size.width = authored.size.width,
            DimensionAxis::Height => style.size.height = authored.size.height,
        }
        probe
            .set_style(handle, style)
            .expect("known intrinsic target");
        let root = self.handles[&0];
        let mut root_style = probe.style(root).expect("known probe root").clone();
        root_style.size = Size {
            width: taffy::prelude::length(self.viewport_size.x),
            height: taffy::prelude::length(self.viewport_size.y),
        };
        probe.set_style(root, root_style).expect("known probe root");
        compute_tree(&mut probe, root, self.viewport_size);
        let size = probe.unrounded_layout(handle).size;
        match axis {
            DimensionAxis::Width => size.width,
            DimensionAxis::Height => size.height,
        }
    }

    fn refresh_intrinsic_targets(&mut self) {
        let keys: Vec<_> = self.intrinsic.keys().copied().collect();
        let mut changed = false;
        for (id, axis) in keys {
            if !self.rects.contains_key(&id) {
                self.intrinsic.remove(&(id, axis));
                set_override(&mut self.overrides, id, axis, None);
                self.transitions.remove(&(id, axis_property(axis)));
                changed = true;
                continue;
            }
            let parent_basis = self.parent_basis(id);
            let measured_width = self.rects[&id].width;
            let track = &self.intrinsic[&(id, axis)];
            if track.content_generation == self.content_generation
                && track.parent_basis == parent_basis
                && (axis != DimensionAxis::Height || track.measured_width == measured_width)
            {
                continue;
            }
            let target_px = self.measure_endpoint(id, axis);
            let old_target = track.target_px;
            self.intrinsic.insert(
                (id, axis),
                IntrinsicTrack {
                    target_px,
                    content_generation: self.content_generation,
                    parent_basis,
                    measured_width,
                },
            );
            if old_target != target_px {
                set_override(&mut self.overrides, id, axis, Some(target_px));
                if let Some(record) = self.transitions.get_mut(&(id, axis_property(axis))) {
                    record.target = MotionValue::Number(target_px);
                    record.started_at_ms = self.clock_ms;
                }
                changed = true;
            }
        }
        if changed {
            self.style_frame = self
                .style_engine
                .sync_model(
                    &self.model,
                    &self.overrides,
                    &BTreeSet::new(),
                    self.clock_ms / MILLISECONDS_PER_SECOND,
                )
                .expect("validated intrinsic retarget");
            self.apply_presentation();
            self.flush_layout();
        }
    }

    fn finish_transitions(&mut self) {
        let mut completed = BTreeSet::new();
        for ((id, axis), track) in &self.intrinsic {
            let Some(sample) = self.style_frame.values.get(id) else {
                continue;
            };
            let value = match axis {
                DimensionAxis::Width => sample.width.as_px(),
                DimensionAxis::Height => sample.height.as_px(),
            };
            // Intrinsic overrides are pure pixel tracks. Exact full-precision
            // equality restores this axis independently of unrelated CSS motion.
            if value == Some(track.target_px) {
                completed.insert((*id, *axis));
            }
        }
        for (id, axis) in &completed {
            self.intrinsic.remove(&(*id, *axis));
            set_override(&mut self.overrides, *id, *axis, None);
            self.transitions.remove(&(*id, axis_property(*axis)));
        }
        if !completed.is_empty() {
            self.style_frame = self
                .style_engine
                .sync_model(
                    &self.model,
                    &self.overrides,
                    &completed,
                    self.clock_ms / MILLISECONDS_PER_SECOND,
                )
                .expect("restore authored intrinsic dimensions");
            self.apply_presentation();
            self.flush_layout();
        }
        let keys: Vec<_> = self.transitions.keys().copied().collect();
        for (id, property) in keys {
            if !self.rects.contains_key(&id) {
                self.transitions.remove(&(id, property));
                continue;
            }
            let current = self.current_motion_value(id, property);
            let target = self.target_motion_value(id, property);
            if !self.style_frame.active && self.intrinsic.is_empty() {
                self.transitions.remove(&(id, property));
            } else if let Some(record) = self.transitions.get_mut(&(id, property)) {
                record.current = current;
                record.target = target;
            }
        }
    }

    fn tick_motion(&mut self, delta: f64) {
        let started = Instant::now();
        self.phase_layout_micros = 0;
        self.phase_geometry_micros = 0;
        self.clock_ms += delta * MILLISECONDS_PER_SECOND;
        self.stats.animation_frames += 1;
        let phase = Instant::now();
        self.style_frame = self
            .style_engine
            .sample(self.clock_ms / MILLISECONDS_PER_SECOND)
            .expect("monotonic native CSS clock");
        self.apply_presentation();
        let style_micros = micros(phase);
        self.flush_layout();
        let phase = Instant::now();
        let previous_layout_micros = self.phase_layout_micros;
        let previous_geometry_micros = self.phase_geometry_micros;
        self.refresh_intrinsic_targets();
        self.finish_transitions();
        let measure_micros = micros(phase).saturating_sub(
            self.phase_layout_micros - previous_layout_micros + self.phase_geometry_micros
                - previous_geometry_micros,
        );
        self.profiler.record(Sample::Frame {
            style_micros,
            measure_micros,
            layout_micros: self.phase_layout_micros,
            geometry_micros: self.phase_geometry_micros,
            animation_micros: micros(started),
        });
        let active = (self.style_frame.active || !self.intrinsic.is_empty())
            && self.base().is_inside_tree();
        self.base_mut().set_process(active);
    }
}

fn micros(start: Instant) -> u64 {
    start.elapsed().as_micros() as u64
}
fn color_components(color: Color) -> [f32; 4] {
    [color.r, color.g, color.b, color.a]
}
fn color_hex(color: [f32; 4]) -> String {
    format!(
        "#{:02x}{:02x}{:02x}{:02x}",
        (color[0].clamp(0.0, 1.0) * HEX_COLOR_CHANNEL_MAX).round() as u8,
        (color[1].clamp(0.0, 1.0) * HEX_COLOR_CHANNEL_MAX).round() as u8,
        (color[2].clamp(0.0, 1.0) * HEX_COLOR_CHANNEL_MAX).round() as u8,
        (color[3].clamp(0.0, 1.0) * HEX_COLOR_CHANNEL_MAX).round() as u8
    )
}
fn axis_property(axis: DimensionAxis) -> TransitionProperty {
    match axis {
        DimensionAxis::Width => TransitionProperty::Width,
        DimensionAxis::Height => TransitionProperty::Height,
    }
}
fn property_axis(property: TransitionProperty) -> Option<DimensionAxis> {
    match property {
        TransitionProperty::Width => Some(DimensionAxis::Width),
        TransitionProperty::Height => Some(DimensionAxis::Height),
        _ => None,
    }
}
fn dimension_value(style: &StyleSpec, axis: DimensionAxis) -> Dimension {
    match axis {
        DimensionAxis::Width => style.width.clone(),
        DimensionAxis::Height => style.height.clone(),
    }
    .unwrap_or_else(|| Dimension::Text("auto".into()))
}
fn is_auto(value: &Dimension) -> bool {
    matches!(value,Dimension::Text(text) if text=="auto")
}
fn resolve_dimension(value: &Dimension, basis: f32) -> Option<f32> {
    match value {
        Dimension::Num(value) => Some(*value),
        Dimension::Text(value) if value == "auto" => None,
        Dimension::Text(value) => Some(
            value
                .trim_end_matches('%')
                .parse::<f32>()
                .expect("validated percentage")
                * basis
                / PERCENTAGE_SCALE,
        ),
    }
}
fn property_changed(old: &StyleSpec, new: &StyleSpec, property: TransitionProperty) -> bool {
    match property {
        TransitionProperty::Width => old.width != new.width,
        TransitionProperty::Height => old.height != new.height,
        TransitionProperty::Opacity => old.opacity != new.opacity,
        TransitionProperty::BackgroundColor => old.background_color != new.background_color,
    }
}
fn set_override(
    overrides: &mut BTreeMap<u32, DimensionOverrides>,
    id: u32,
    axis: DimensionAxis,
    value: Option<f32>,
) {
    let entry = overrides.entry(id).or_default();
    match axis {
        DimensionAxis::Width => entry.width = value,
        DimensionAxis::Height => entry.height = value,
    }
    if entry.width.is_none() && entry.height.is_none() {
        overrides.remove(&id);
    }
}
fn validate_motion_changes(previous: &Model, staged: &Model) -> Result<(), String> {
    for (id, node) in &staged.nodes {
        let Some(old) = previous.nodes.get(id) else {
            continue;
        };
        let Some(transition) = &node.style.transition else {
            continue;
        };
        if transition.duration_ms == 0.0 {
            continue;
        }
        for property in &transition.properties {
            let Some(axis) = property_axis(*property) else {
                continue;
            };
            if !property_changed(&old.style, &node.style, *property) {
                continue;
            }
            let before = dimension_value(&old.style, axis);
            let after = dimension_value(&node.style, axis);
            if matches!((&before,&after), (Dimension::Num(_),Dimension::Text(value)) | (Dimension::Text(value),Dimension::Num(_)) if value != "auto")
            {
                return Err(format!(
                    "node {id}: {:?} transitions between pixels and percentages require a calc-aware layout tree; this prototype supports same-unit numeric transitions and native allow-keywords transitions",
                    axis
                ));
            }
            if !is_auto(&before) && !is_auto(&after) {
                continue;
            }
            if effective_interpolate_size(staged, *id) != InterpolateSize::AllowKeywords {
                continue;
            }
            if let Some(parent) = node.parent {
                let parent_style = &staged.nodes[&parent].style;
                let row = matches!(
                    parent_style.flex_direction,
                    Some(
                        protocol::FlexDirectionSpec::Row | protocol::FlexDirectionSpec::RowReverse
                    )
                );
                let main_axis = (row && axis == DimensionAxis::Width)
                    || (!row && axis == DimensionAxis::Height);
                if parent_style.display != Some(protocol::DisplaySpec::Grid)
                    && main_axis
                    && (node.style.flex_grow.unwrap_or(0.0) != 0.0
                        || node.style.flex_shrink.unwrap_or(1.0) != 0.0
                        || old.style.flex_grow.unwrap_or(0.0) != 0.0
                        || old.style.flex_shrink.unwrap_or(1.0) != 0.0)
                {
                    return Err(format!(
                        "node {id}: intrinsic {:?} transitions on a flex main axis require flexGrow:0 and flexShrink:0; animating a used size must not apply flex distribution twice",
                        axis
                    ));
                }
            }
        }
    }
    Ok(())
}
fn intersect_clip(a: Option<BoxRect>, b: Option<BoxRect>) -> Option<BoxRect> {
    match (a, b) {
        (None, value) | (value, None) => value,
        (Some(a), Some(b)) => {
            let x = a.x.max(b.x);
            let y = a.y.max(b.y);
            Some(BoxRect {
                x,
                y,
                width: ((a.x + a.width).min(b.x + b.width) - x).max(0.0),
                height: ((a.y + a.height).min(b.y + b.height) - y).max(0.0),
            })
        }
    }
}
fn intersects(a: BoxRect, b: BoxRect) -> bool {
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}
fn compute_tree(tree: &mut TaffyTree<TextContext>, root: NodeId, size: Vector2) {
    tree.compute_layout_with_measure(
        root,
        Size {
            width: AvailableSpace::Definite(size.x),
            height: AvailableSpace::Definite(size.y),
        },
        |inputs, _, context, style| {
            taffy::compute_leaf_layout(
                inputs,
                style,
                |_, _| 0.0,
                |known, available| {
                    let Some(context) = context.as_ref() else {
                        return Size::ZERO;
                    };
                    let mut paragraph = context.paragraph.clone();
                    paragraph.set_width(known.width.unwrap_or(match available.width {
                        AvailableSpace::Definite(width) => width,
                        AvailableSpace::MinContent => 0.0,
                        AvailableSpace::MaxContent => -1.0,
                    }));
                    let measured = paragraph.get_size();
                    Size {
                        width: known.width.unwrap_or(measured.x),
                        height: known.height.unwrap_or(measured.y),
                    }
                },
            )
        },
    )
    .expect("validated measurement tree");
}

fn effective_interpolate_size(model: &Model, mut id: u32) -> InterpolateSize {
    loop {
        let node = &model.nodes[&id];
        if let Some(value) = node.style.interpolate_size {
            return value;
        }
        match node.parent {
            Some(parent) => id = parent,
            None => return InterpolateSize::NumericOnly,
        }
    }
}
