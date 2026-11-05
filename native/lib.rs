mod protocol;

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

use protocol::{Command, Kind, Model, StyleSpec, TextAlignSpec};

const DEFAULT_FONT_SIZE: i32 = 16;
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
        }
    }

    fn ready(&mut self) {
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
        self.sync_model(self.model.clone());
        self.flush_layout();
        self.base_mut().grab_focus();
    }

    fn on_notification(&mut self, what: ControlNotification) {
        match what {
            ControlNotification::RESIZED if self.font.is_some() => self.flush_layout(),
            ControlNotification::MOUSE_EXIT => {
                self.pointer_known = false;
                self.update_hover(None);
            }
            ControlNotification::FOCUS_EXIT => {
                self.set_focus(None);
                self.pressed = None;
            }
            ControlNotification::EXIT_TREE => {
                self.hovered = None;
                self.focused = None;
                self.pressed = None;
                self.events.clear();
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

    fn draw(&mut self) {
        let canvas = self.base().get_canvas_item();
        for id in &self.paint_order {
            let rect = self.rects[id];
            if rect.width <= 0.0 || rect.height <= 0.0 {
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
            visual.background.draw(canvas, rect.godot_rect());
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
                    .draw_ex(canvas, Vector2::new(rect.x + left, rect.y + top))
                    .color(with_opacity(visual.text_color, opacity))
                    .done();
            }
        }
        if let Some(id) = self.focused
            && let Some(rect) = self.rects.get(&id)
            && let Some(ring) = self.focus_ring.as_mut()
        {
            // Focus is an inset stroke so it cannot cover adjacent content.
            ring.set_corner_radius_all(
                self.model.nodes[&id].style.border_radius.unwrap_or(0.0) as i32
            );
            ring.draw(canvas, rect.godot_rect());
        }
        self.stats.paint_passes += 1;
    }
}

#[godot_api]
impl ReactUiRoot {
    #[func]
    fn apply_batch(&mut self, json: GString) -> GString {
        let commands: Vec<Command> = match serde_json::from_str(&json.to_string()) {
            Ok(value) => value,
            Err(error) => return GString::from(&format!("Invalid mutation JSON: {error}")),
        };
        let mut staged = self.model.clone();
        if let Err(error) = staged.apply(&commands) {
            return GString::from(&error);
        }
        self.sync_model(staged);
        self.stats.batches += 1;
        self.stats.node_count = self.model.nodes.len() - 1;
        self.flush_layout();
        GString::new()
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
                    "rect":self.rects.get(&node.id).copied().unwrap_or_default()
                })
            })
            .collect();
        json!({"nodes":nodes,"stats":self.stats,"width":self.viewport_size.x,
            "height":self.viewport_size.y,"hovered":self.hovered,"focused":self.focused,
            "pressed":self.pressed})
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
            if *id != 0 && self.tree.style(handle).expect("known handle") != &style {
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
        self.rects.clear();
        self.paint_order.clear();
        self.opacities.clear();
        self.collect_rects(0, Vector2::ZERO, 1.0);
        if self.focused.is_some_and(|id| !self.rects.contains_key(&id)) {
            self.set_focus(None);
        }
        if self.pressed.is_some_and(|id| !self.rects.contains_key(&id)) {
            self.pressed = None;
        }
        let hit = if self.pointer_known {
            self.hit_test(self.pointer)
        } else {
            None
        };
        self.update_hover(hit);
        self.base_mut().queue_redraw();
    }

    fn collect_rects(&mut self, id: u32, origin: Vector2, parent_opacity: f32) {
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
        let opacity = parent_opacity * node.style.opacity.unwrap_or(1.0);
        self.opacities.insert(id, opacity);
        if id != 0 {
            self.paint_order.push(id);
        }
        let children = node.children.clone();
        for child in children {
            self.collect_rects(child, position, opacity);
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
            .find(|id| self.rects[id].contains(point))
            .copied()
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
            .filter(|id| self.model.nodes[id].kind == Kind::Button && !self.disabled(*id))
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
