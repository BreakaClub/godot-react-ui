//! Exposing the mounted tree to assistive technologies through Godot's `AccessibilityServer` (plan
//! section 3.21). The model of what is exposed, and the registry that keeps Godot's elements in step
//! with it, are in `accessibility_model.rs`; this file is the Godot side.
//!
//! How Godot builds the tree, from the engine source this was written against:
//!
//! * The platform adapter (AccessKit) is lazy. `SceneTree::_flush_accessibility_changes` calls
//!   `AccessibilityServer::update_if_active` every frame, and the adapter only invokes the update
//!   callback once an assistive client has asked for the tree. Then `NOTIFICATION_ACCESSIBILITY_UPDATE`
//!   goes to every node queued with `queue_accessibility_update()`; when the adapter activates the
//!   engine queues every node (`Window::_accessibility_activate`), and when it deactivates every node
//!   gets `NOTIFICATION_ACCESSIBILITY_INVALIDATE`.
//! * `SceneTree::is_accessibility_enabled()` is false unless the mode is `always` or a screen reader
//!   is running (`--accessibility always` forces it, which is how the verifier reads the tree without
//!   VoiceOver). While it is false the engine neither updates nor delivers anything, so this file
//!   queues no update either, and the registry stays empty: a commit costs one empty check.
//! * Sub-elements are created under the root's own element (`Node::get_accessibility_element`), with
//!   bounds in the root's local coordinates: a `Control`'s element has the control's transform and
//!   bounds `(0, 0, size)`, and a sub-element without a transform shares its parent's space
//!   (`item_list.cpp:1315-1365`).
//! * An action callback is called deferred with the AccessKit request's data first and the callable's
//!   bound arguments after (`item_list.cpp`'s `_accessibility_action_focus(data, index)`).

use godot::classes::AccessibilityServer;
use godot::classes::accessibility_server::{
    AccessibilityAction, AccessibilityFlags, AccessibilityLiveMode, AccessibilityPopupType,
    AccessibilityRole, AccessibilityScrollUnit,
};
use godot::obj::Singleton;
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::accessibility_model::{
    AxAction, AxBounds, AxNode, AxProps, AxRole, AxScroll, AxScrollAxis, AxSource, Desired,
    ElementServer, MIXED_DESCRIPTION, Registry, props_of, scroll_bars_of, walk,
};
use crate::computed_style::StyleChange;
use crate::diff::Parent;
use crate::events::{AccessibilityActionData, AccessibilityActionKind, EventPayload};
use crate::focus::is_focusable;
use crate::geometry::BoxRect;
use crate::mount::{Mounted, MountedNode};
use crate::props::{DisplaySpec, LiveSpec};
use crate::scroll::{Axis, ScrollDirection, ScrollUnit, Vec2, assistive_scroll_delta};
use crate::text_input_godot::ax_text_field;

mod scroll_bars;

/// The method the action callables call, with the AccessKit request's data, the node's tag and the
/// action's code (`AxAction::code`).
const ACTION_METHOD: &str = "_on_accessibility_action";

/// The accessibility elements this root has made.
#[derive(Default)]
pub(crate) struct Accessibility {
    registry: Registry<Rid>,
    /// The line elements of each text field's text (`text_input_godot/accessibility.rs`).
    pub(crate) text_lines: crate::text_input_godot::TextLines,
}

impl Accessibility {
    /// Note that something that decides what is exposed may have changed.
    pub(crate) fn mark_structure_dirty(&mut self) {
        self.registry.mark_structure_dirty();
    }
}

impl Mounted {
    /// Some scroll container around `tag`, in the paint tree (where `reveal_node` looks), has something
    /// to scroll: the element can be scrolled into view.
    fn in_scrollable_container(&self, tag: u32) -> bool {
        let mut current = self.nodes.get(&tag).and_then(|node| node.paint_parent);
        while let Some(Parent::Node(container)) = current {
            let Some(node) = self.nodes.get(&container) else {
                return false;
            };
            let ranges = node.geometry.scroll_ranges;
            if node.is_scroll_container() && (ranges.x.is_scrollable() || ranges.y.is_scrollable())
            {
                return true;
            }
            current = node.paint_parent;
        }
        false
    }
}

/// Whether `axis` of `node` has anything to scroll. This is the one definition of when an axis has a
/// scroll bar element: it decides what `AxSource::node` reports, and so which bars are created, and which
/// are freed when the geometry changes (`prune_scroll_bar_elements`). A multi-line text input is a scroll
/// container; a single-line one scrolls its text but is not.
fn axis_scrolls(node: &MountedNode, axis: Axis) -> bool {
    node.is_scroll_container() && node.geometry.scroll_ranges.get(axis).is_scrollable()
}

/// One axis of a scroll container, when it has anything to scroll: its position, its range and where
/// its scroll bar's track lies. `rect` is the container's root-local border box; the track is laid out
/// in its padding box, whether or not the bar is drawn (`scrollbar-width: none` hides the drawing, not
/// the axis).
fn scroll_axis(node: &MountedNode, rect: BoxRect, axis: Axis) -> Option<AxScrollAxis> {
    if !axis_scrolls(node, axis) {
        return None;
    }
    let range = node.geometry.scroll_ranges.get(axis);
    let layout = node.scrollbar_layout();
    let bar = match axis {
        Axis::X => layout.x,
        Axis::Y => layout.y,
    }
    .expect("an axis that scrolls has a scroll bar layout (scroll::scrollbars lays out every scrollable axis)");
    let client = node.geometry.padding_box();
    Some(AxScrollAxis {
        position: f64::from(node.scroll.offset.get(axis)),
        min: f64::from(range.min()),
        max: f64::from(range.max()),
        track: AxBounds {
            x: rect.x + client.x + bar.track.origin.x,
            y: rect.y + client.y + bar.track.origin.y,
            width: bar.track.size.x,
            height: bar.track.size.y,
        },
    })
}

impl AxSource for Mounted {
    fn roots(&self) -> Vec<u32> {
        self.roots.iter().flatten().copied().collect()
    }

    fn node(&self, tag: u32) -> Option<AxNode<'_>> {
        let node = self.nodes.get(&tag)?;
        // The root-local rectangle comes from the paint tree: an `absolute` or `fixed` element is
        // located in its paint parent's frame, not its tree parent's. The viewport only seeds the
        // clip, which is not used here.
        let (rect, _) = self.absolute_geometry(tag, BoxRect::default())?;
        Some(AxNode {
            kind: node.kind,
            props: &node.props,
            children: &node.children,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            display_none: node.computed.display == Some(DisplaySpec::None),
            clips_children: node.clips_content(),
            scroll: node.is_scroll_container().then(|| AxScroll {
                x: scroll_axis(node, rect, Axis::X),
                y: scroll_axis(node, rect, Axis::Y),
            }),
            in_scrollable: self.in_scrollable_container(tag),
            text_field: node
                .text_input
                .as_ref()
                .map(|state| ax_text_field(state, (node.scroll.offset.x, node.scroll.offset.y))),
        })
    }
}

/// `AccessibilityServer` as the registry's [`ElementServer`].
struct GodotElements {
    server: Gd<AccessibilityServer>,
    /// The root's own element, which the top-level elements hang from. Invalid when only freeing.
    root: Rid,
}

impl GodotElements {
    /// For creating elements: those with no parent element become children of `root`.
    fn under(root: Rid) -> Self {
        Self {
            server: AccessibilityServer::singleton(),
            root,
        }
    }

    /// For freeing elements, which needs no root.
    fn for_freeing() -> Self {
        Self::under(Rid::Invalid)
    }
}

impl ElementServer for GodotElements {
    type Id = Rid;

    fn create_element(&mut self, parent: Option<Rid>, role: AxRole, index: usize) -> Rid {
        let position =
            i32::try_from(index).expect("an element's position among its siblings fits an i32");
        self.server
            .create_sub_element_ex(parent.unwrap_or(self.root), server_role(role))
            .insert_pos(position)
            .done()
    }

    fn free_element(&mut self, id: Rid) {
        self.server.free_element(id);
    }
}

/// The server's name for each role of the model. Exhaustive: a new model role must be mapped.
fn server_role(role: AxRole) -> AccessibilityRole {
    match role {
        AxRole::Button => AccessibilityRole::BUTTON,
        AxRole::CheckBox => AccessibilityRole::CHECK_BOX,
        AxRole::CheckButton => AccessibilityRole::CHECK_BUTTON,
        AxRole::RadioButton => AccessibilityRole::RADIO_BUTTON,
        AxRole::Container => AccessibilityRole::CONTAINER,
        AxRole::Slider => AccessibilityRole::SLIDER,
        AxRole::ProgressIndicator => AccessibilityRole::PROGRESS_INDICATOR,
        AxRole::StaticText => AccessibilityRole::STATIC_TEXT,
        AxRole::Link => AccessibilityRole::LINK,
        AxRole::List => AccessibilityRole::LIST,
        AxRole::ListItem => AccessibilityRole::LIST_ITEM,
        AxRole::ListBox => AccessibilityRole::LIST_BOX,
        AxRole::ListBoxOption => AccessibilityRole::LIST_BOX_OPTION,
        AxRole::Menu => AccessibilityRole::MENU,
        AxRole::MenuItem => AccessibilityRole::MENU_ITEM,
        AxRole::MenuItemCheckBox => AccessibilityRole::MENU_ITEM_CHECK_BOX,
        AxRole::MenuItemRadio => AccessibilityRole::MENU_ITEM_RADIO,
        AxRole::TabBar => AccessibilityRole::TAB_BAR,
        AxRole::Tab => AccessibilityRole::TAB,
        AxRole::TabPanel => AccessibilityRole::TAB_PANEL,
        AxRole::Dialog => AccessibilityRole::DIALOG,
        AxRole::Image => AccessibilityRole::IMAGE,
        AxRole::Region => AccessibilityRole::REGION,
        AxRole::Tooltip => AccessibilityRole::TOOLTIP,
        AxRole::ScrollView => AccessibilityRole::SCROLL_VIEW,
        AxRole::ScrollBar => AccessibilityRole::SCROLL_BAR,
        AxRole::TextField => AccessibilityRole::TEXT_FIELD,
        AxRole::MultilineTextField => AccessibilityRole::MULTILINE_TEXT_FIELD,
    }
}

fn server_live(live: LiveSpec) -> AccessibilityLiveMode {
    match live {
        LiveSpec::Off => AccessibilityLiveMode::OFF,
        LiveSpec::Polite => AccessibilityLiveMode::POLITE,
        LiveSpec::Assertive => AccessibilityLiveMode::ASSERTIVE,
    }
}

/// The number an assistive technology asked a slider to take: AccessKit sends a float, but a caller
/// that passes an integer (or a string that holds a number) means the same thing.
fn requested_number(data: &Variant) -> Option<f64> {
    let number = data
        .try_to::<f64>()
        .ok()
        .or_else(|| data.try_to::<i64>().ok().map(|integer| integer as f64))
        .or_else(|| {
            data.try_to::<GString>()
                .ok()
                .and_then(|text| text.to_string().trim().parse::<f64>().ok())
        })?;
    number.is_finite().then_some(number)
}

/// How far a scroll action goes. The request carries an `AccessibilityScrollUnit`, or nothing, which
/// the engine reads as its first value, one item (`scroll_container.cpp:451`). `None` is a value that
/// is neither.
fn requested_scroll_unit(data: &Variant) -> Option<ScrollUnit> {
    if data.is_nil() {
        return Some(ScrollUnit::Item);
    }
    let ord = i32::try_from(data.try_to::<i64>().ok()?).ok()?;
    match AccessibilityScrollUnit::try_from_ord(ord)? {
        AccessibilityScrollUnit::ITEM => Some(ScrollUnit::Item),
        AccessibilityScrollUnit::PAGE => Some(ScrollUnit::Page),
        _ => None,
    }
}

/// The offset a set-scroll-offset request asks for: a `Vector2` of `scrollLeft` and `scrollTop`.
fn requested_scroll_offset(data: &Variant) -> Option<Vector2> {
    data.try_to::<Vector2>().ok()
}

impl ReactUiRoot {
    /// Ask the engine for an accessibility update. Does nothing unless accessibility is enabled
    /// (`always`, or a screen reader is running): the engine would not deliver it, and a commit pays
    /// nothing for a tree nobody reads.
    pub(crate) fn request_accessibility_update(&mut self) {
        let enabled = self
            .base()
            .get_tree_or_null()
            .is_some_and(|tree| tree.is_accessibility_enabled());
        if enabled {
            self.base_mut().queue_accessibility_update();
        }
    }

    /// Free the elements the mounted tree no longer exposes, where it exposes them, in the order it
    /// exposes them. Elements can only be freed outside an update, so this runs after a commit (or a
    /// restyle that hid something) rather than in `update_accessibility`. Free while no element
    /// exists, which is whenever no assistive technology has asked for the tree.
    pub(crate) fn prune_accessibility(&mut self) {
        if !self.accessibility.registry.take_structure_dirty() {
            return;
        }
        let desired = Desired::new(walk(&self.mounted));
        self.accessibility
            .registry
            .prune(&mut GodotElements::for_freeing(), &desired);
    }

    /// A node left the mounted tree: free its element, and those under it, now.
    pub(crate) fn forget_accessibility_node(&mut self, tag: u32) {
        if self.accessibility.registry.element(tag).is_none() {
            return;
        }
        self.accessibility
            .registry
            .remove(&mut GodotElements::for_freeing(), tag);
    }

    /// A restyle (hover, focus, a breakpoint) may have hidden or shown a subtree with `display`.
    pub(crate) fn note_accessibility_restyle(&mut self, changes: &[StyleChange]) {
        if self.accessibility.registry.is_empty() {
            return;
        }
        let display_changed = changes.iter().any(|change| {
            let now = self
                .mounted
                .nodes
                .get(&change.tag)
                .and_then(|node| node.computed.display);
            let before = change
                .previous
                .as_ref()
                .and_then(|previous| previous.display);
            now != before
        });
        if display_changed {
            self.accessibility.mark_structure_dirty();
            self.prune_accessibility();
        }
    }

    /// `NOTIFICATION_ACCESSIBILITY_UPDATE`: create the elements the tree is missing and set every
    /// element whose properties changed. The whole mounted tree is walked, which is what Godot asks
    /// of every node (plan 3.21, invariant 6).
    pub(crate) fn update_accessibility(&mut self) {
        let root = self.base().get_accessibility_element();
        if !root.is_valid() {
            // The root is not in a visible window yet: there is nothing to attach elements to.
            return;
        }
        let desired = Desired::new(walk(&self.mounted));
        let misplaced = self
            .accessibility
            .registry
            .grow(&mut GodotElements::under(root), &desired);
        if !misplaced.is_empty() {
            godot_error!(
                "ReactUiRoot: accessibility elements exist for nodes that are hidden, moved or removed \
                 and were not pruned: {misplaced:?}"
            );
        }
        // What every element says, and the scroll bars the scroll containers among them want. The bars are
        // created before any element is compared: a container that gained one lists a new child.
        let mut described = Vec::with_capacity(desired.entries().len());
        let mut bars = Vec::new();
        for entry in desired.entries() {
            let props = props_of(&self.mounted, entry);
            bars.extend(scroll_bars_of(entry.tag, props.scroll));
            described.push((entry.tag, props));
        }
        self.grow_scroll_bar_elements(root, &bars);
        let mut changed = Vec::new();
        for (tag, props) in described {
            if self.accessibility.registry.needs_apply(tag, &props)
                && let Some(element) = self.accessibility.registry.element(tag)
            {
                changed.push((tag, element, props));
            }
        }
        let mut server = AccessibilityServer::singleton();
        for (tag, element, props) in changed {
            self.apply_accessibility(&mut server, element, tag, &props);
            self.accessibility.registry.mark_applied(tag, props);
        }
        self.apply_scroll_bar_elements(&mut server, &bars);
    }

    /// The elements this one names (`aria-activedescendant`, `aria-controls`), which exist by now: every
    /// exposed element was created before any element is set. One that is not in the tree is hidden or
    /// unexposed, which is the caller's mistake, said once per change of the element.
    fn apply_relations(
        &self,
        server: &mut Gd<AccessibilityServer>,
        element: Rid,
        tag: u32,
        props: &AxProps,
    ) {
        for (name, related) in [
            ("aria-activedescendant", props.active_descendant),
            ("aria-controls", props.controls),
        ] {
            let Some(related) = related else {
                continue;
            };
            let Some(target) = self.accessibility.registry.element(related) else {
                godot_error!(
                    "ReactUiRoot: element {tag}'s {name} names element {related}, which is not in the accessibility tree \
                     (it is gone, hidden or has no role)"
                );
                continue;
            };
            if name == "aria-activedescendant" {
                server.update_set_active_descendant(element, target);
            } else {
                server.update_add_related_controls(element, target);
            }
        }
    }

    /// Set everything on one element. A node already sent to the platform is replaced by a new one
    /// that has only a role and a name, so every property is set here, every time.
    fn apply_accessibility(
        &mut self,
        server: &mut Gd<AccessibilityServer>,
        element: Rid,
        tag: u32,
        props: &AxProps,
    ) {
        server.update_set_role(element, server_role(props.role));
        server.update_set_name(element, &props.name);
        let bounds = props.bounds;
        server.update_set_bounds(
            element,
            Rect2::new(
                Vector2::new(bounds.x, bounds.y),
                Vector2::new(bounds.width, bounds.height),
            ),
        );
        if !props.description.is_empty() {
            server.update_set_description(element, &props.description);
        }
        if !props.value.is_empty() {
            server.update_set_value(element, &props.value);
        }
        if !props.placeholder.is_empty() {
            server.update_set_placeholder(element, &props.placeholder);
        }
        if props.popup_list {
            server.update_set_popup_type(element, AccessibilityPopupType::LIST);
        }
        for (flag, value) in [
            (AccessibilityFlags::DISABLED, props.disabled),
            (AccessibilityFlags::READONLY, props.read_only),
            (AccessibilityFlags::REQUIRED, props.required),
            (AccessibilityFlags::MODAL, props.modal),
            (AccessibilityFlags::CLIPS_CHILDREN, props.clips_children),
        ] {
            if value {
                server.update_set_flag(element, flag, true);
            }
        }
        if let Some(checked) = props.checked {
            server.update_set_checked(element, checked);
        }
        if props.mixed {
            server.update_set_state_description(element, MIXED_DESCRIPTION);
        }
        if let Some(selected) = props.selected {
            server.update_set_list_item_selected(element, selected);
        }
        if let Some(expanded) = props.expanded {
            server.update_set_list_item_expanded(element, expanded);
        }
        if let Some(range) = props.range {
            if let Some(now) = range.now {
                server.update_set_num_value(element, now);
            }
            server.update_set_num_range(element, range.min, range.max);
        }
        if let Some(live) = props.live {
            server.update_set_live(element, server_live(live));
        }
        self.apply_relations(server, element, tag, props);
        if let Some(vertical) = props.vertical {
            server.update_set_list_orientation(element, vertical);
        }
        if let Some(scroll) = props.scroll {
            if let Some(x) = scroll.x {
                server.update_set_scroll_x(element, x.position);
                server.update_set_scroll_x_range(element, x.min, x.max);
            }
            if let Some(y) = scroll.y {
                server.update_set_scroll_y(element, y.position);
                server.update_set_scroll_y_range(element, y.min, y.max);
            }
        }
        if let Some(field) = &props.text_field {
            self.apply_text_field_accessibility(server, element, tag, field, props.bounds);
        }
        let root = self.to_gd();
        let callable = |action: AxAction| {
            Callable::from_object_method(&root, ACTION_METHOD)
                .bindv(&varray![i64::from(tag), action.code()])
        };
        let actions = props.actions;
        if actions.click {
            server.update_add_action(
                element,
                AccessibilityAction::CLICK,
                &callable(AxAction::Click),
            );
        }
        if actions.focus {
            server.update_add_action(
                element,
                AccessibilityAction::FOCUS,
                &callable(AxAction::Focus),
            );
            server.update_add_action(
                element,
                AccessibilityAction::BLUR,
                &callable(AxAction::Blur),
            );
        }
        if actions.adjust {
            server.update_add_action(
                element,
                AccessibilityAction::INCREMENT,
                &callable(AxAction::Increment),
            );
            server.update_add_action(
                element,
                AccessibilityAction::DECREMENT,
                &callable(AxAction::Decrement),
            );
            server.update_add_action(
                element,
                AccessibilityAction::SET_VALUE,
                &callable(AxAction::SetValue),
            );
        }
        if actions.scroll_y {
            server.update_add_action(
                element,
                AccessibilityAction::SCROLL_UP,
                &callable(AxAction::ScrollUp),
            );
            server.update_add_action(
                element,
                AccessibilityAction::SCROLL_DOWN,
                &callable(AxAction::ScrollDown),
            );
        }
        if actions.scroll_x {
            server.update_add_action(
                element,
                AccessibilityAction::SCROLL_LEFT,
                &callable(AxAction::ScrollLeft),
            );
            server.update_add_action(
                element,
                AccessibilityAction::SCROLL_RIGHT,
                &callable(AxAction::ScrollRight),
            );
        }
        if actions.scroll_x || actions.scroll_y {
            server.update_add_action(
                element,
                AccessibilityAction::SET_SCROLL_OFFSET,
                &callable(AxAction::SetScrollOffset),
            );
        }
        if actions.scroll_into_view {
            server.update_add_action(
                element,
                AccessibilityAction::SCROLL_INTO_VIEW,
                &callable(AxAction::ScrollIntoView),
            );
        }
    }

    /// The element that holds assistive focus while the root has Godot key focus (the virtual
    /// `get_focused_accessibility_element`): the focused node's element, else its nearest exposed
    /// ancestor's, else the root's own.
    pub(crate) fn focused_accessibility_element(&self) -> Rid {
        let exposed = self.focused.and_then(|tag| {
            self.mounted
                .path_of(tag)
                .into_iter()
                .find_map(|candidate| self.accessibility.registry.element(candidate))
        });
        exposed.unwrap_or_else(|| self.base().get_accessibility_element())
    }

    /// `NOTIFICATION_ACCESSIBILITY_INVALIDATE` and leaving the tree: the engine freed the root's
    /// element and, with it, ours. Forget them without freeing (as `ItemList` does).
    pub(crate) fn forget_accessibility_elements(&mut self) {
        self.accessibility.registry.forget_all();
        self.accessibility.text_lines.clear();
    }

    /// The root is being destroyed outside the tree: free what the engine has not.
    pub(crate) fn release_accessibility_elements(&mut self) {
        let elements = self.accessibility.registry.root_elements();
        self.accessibility.registry.forget_all();
        self.accessibility.text_lines.clear();
        if elements.is_empty() {
            return;
        }
        let mut server = AccessibilityServer::singleton();
        for element in elements {
            if server.has_element(element) {
                server.free_element(element);
            }
        }
    }

    /// An assistive technology acted on node `tag` (the bound callable, called deferred by the
    /// platform adapter). Native performs `click`, `focus` and `blur` the way input would; a slider's
    /// adjustments are queued for JS (`accessibilityaction`), and everything is delivered at once
    /// because this is an input-origin entry point (plan 3.10 rule 1).
    pub(crate) fn handle_accessibility_action(&mut self, data: &Variant, tag: i64, action: i64) {
        let (Ok(tag), Some(action)) = (u32::try_from(tag), AxAction::from_code(action)) else {
            godot_error!(
                "ReactUiRoot: malformed accessibility action (tag {tag}, action {action})"
            );
            return;
        };
        // The interface may have changed between the request and this call; the node is simply gone.
        if !self.mounted.nodes.contains_key(&tag) {
            return;
        }
        match action {
            AxAction::Click => {
                if !self.mounted.is_disabled(tag) {
                    let click = self.synthetic_pointer_data(0, 0);
                    self.queue(tag, EventPayload::Click(click));
                }
            }
            AxAction::Focus => {
                if is_focusable(&self.mounted, tag) {
                    // An assistive technology moves focus like the keyboard does.
                    self.focus_element(tag, true);
                }
            }
            AxAction::Blur => {
                if let Err(error) = self.blur_node_checked(tag) {
                    godot_error!("ReactUiRoot: accessibility blur failed: {error}");
                }
            }
            AxAction::SetTextSelection => self.assistive_set_selection(tag, data),
            AxAction::ReplaceSelectedText => self.assistive_replace_selected(tag, data),
            AxAction::SetValue if self.text_state(tag).is_some() => {
                self.assistive_set_value(tag, data);
            }
            AxAction::Increment => {
                self.queue_adjustment(tag, AccessibilityActionKind::Increment, None)
            }
            AxAction::Decrement => {
                self.queue_adjustment(tag, AccessibilityActionKind::Decrement, None)
            }
            AxAction::SetValue => match requested_number(data) {
                Some(value) => {
                    self.queue_adjustment(tag, AccessibilityActionKind::SetValue, Some(value));
                }
                None => {
                    godot_error!(
                        "ReactUiRoot: accessibility set-value for node {tag} carried no finite number: {data}"
                    );
                }
            },
            AxAction::ScrollUp => self.assistive_scroll(tag, ScrollDirection::Up, data),
            AxAction::ScrollDown => self.assistive_scroll(tag, ScrollDirection::Down, data),
            AxAction::ScrollLeft => self.assistive_scroll(tag, ScrollDirection::Left, data),
            AxAction::ScrollRight => self.assistive_scroll(tag, ScrollDirection::Right, data),
            AxAction::SetScrollOffset => match requested_scroll_offset(data) {
                Some(offset) => {
                    // A scroll container that stopped being one since the request is gone, like a node.
                    if self.is_scroll_container_tag(tag)
                        && let Err(error) =
                            self.scroll_to_checked(tag, f64::from(offset.x), f64::from(offset.y))
                    {
                        godot_error!(
                            "ReactUiRoot: accessibility set-scroll-offset failed: {error}"
                        );
                    }
                }
                None => {
                    godot_error!(
                        "ReactUiRoot: accessibility set-scroll-offset for node {tag} carried no Vector2: {data}"
                    );
                }
            },
            // The request's scroll hint (where in the container to put the element) is not used: this
            // is the least scrolling that shows the element, as `scrollIntoView({block: 'nearest'})`.
            AxAction::ScrollIntoView => {
                if let Err(error) = self.scroll_into_view_checked(tag) {
                    godot_error!("ReactUiRoot: accessibility scroll-into-view failed: {error}");
                }
            }
        }
        self.deliver();
    }

    fn is_scroll_container_tag(&self, tag: u32) -> bool {
        self.mounted
            .nodes
            .get(&tag)
            .is_some_and(|node| node.is_scroll_container())
    }

    /// Scroll up, down, left or right by an item or a page (`data` says which), through `scrollBy`.
    fn assistive_scroll(&mut self, tag: u32, direction: ScrollDirection, data: &Variant) {
        let Some(unit) = requested_scroll_unit(data) else {
            godot_error!(
                "ReactUiRoot: accessibility scroll for node {tag} carried no scroll unit: {data}"
            );
            return;
        };
        let Some(client) = self
            .mounted
            .nodes
            .get(&tag)
            .filter(|node| node.is_scroll_container())
            .map(|node| node.geometry.padding_box())
        else {
            return;
        };
        let delta = assistive_scroll_delta(direction, unit, Vec2::new(client.width, client.height));
        if let Err(error) = self.scroll_by_checked(tag, f64::from(delta.x), f64::from(delta.y)) {
            godot_error!("ReactUiRoot: accessibility scroll failed: {error}");
        }
    }

    fn queue_adjustment(&mut self, tag: u32, action: AccessibilityActionKind, value: Option<f64>) {
        self.queue(
            tag,
            EventPayload::AccessibilityAction(AccessibilityActionData { action, value }),
        );
    }
}
