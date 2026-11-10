//! Scroll bar elements on Godot's `AccessibilityServer`. What a bar says, and when the
//! registry makes and frees one, is in `accessibility_model/scroll_bars.rs`; this file is the Godot side.
//!
//! Why the elements exist: the macOS adapter ignores the scroll position and range a node sets
//! (`update_set_scroll_x/y`), so VoiceOver reads a scroll view's contents but not where in them it is.
//! A stock `ScrollContainer` (and `TextEdit`) conveys position through child `ScrollBar` elements, which
//! the real tree shows as `AXScrollBar` (value, minimum, maximum, `AXIncrement`, `AXDecrement`).
//!
//! Lifetime, from `accessibility_server_accesskit.cpp`: a bar is a child of its container's element, so
//! the server frees it with the container (`_free_recursive`) and the engine forgets it with the root
//! (`NOTIFICATION_ACCESSIBILITY_INVALIDATE`); `free_element` is refused inside an update, so a bar is made
//! in the update ([`ReactUiRoot::grow_scroll_bar_elements`]) and freed where the geometry that decides
//! whether its axis can still move changes ([`ReactUiRoot::prune_scroll_bar_elements`], called from the
//! geometry pass, never from inside an update). Updating one is not re-creating it: the value and range are
//! set on the element that is there, and only when they differ from what was last set.
//!
//! Nothing here runs unless an assistive technology has asked for the tree: the registry is empty
//! otherwise, `request_accessibility_update` queues nothing, and a scroll only asks for an update.

use godot::classes::AccessibilityServer;
use godot::classes::accessibility_server::AccessibilityAction;
use godot::prelude::*;

use crate::ReactUiRoot;
use crate::accessibility_model::{
    AxRole, AxScrollBar, ScrollBarAction, WantedScrollBar, axis_code, axis_from_code,
    scroll_bar_delta,
};
use crate::scroll::Vec2;

use super::{GodotElements, axis_scrolls, server_role};

/// The method the scroll bars' action callables call, with the request's data first and then the
/// container's tag, the bar's axis (`axis_code`) and the action (`ScrollBarAction::code`).
const SCROLL_BAR_ACTION_METHOD: &str = "_on_accessibility_scroll_bar_action";

/// The server's name for each scroll bar action. Exhaustive: a new action must be mapped.
fn server_action(action: ScrollBarAction) -> AccessibilityAction {
    match action {
        ScrollBarAction::Increment => AccessibilityAction::INCREMENT,
        ScrollBarAction::Decrement => AccessibilityAction::DECREMENT,
    }
}

impl ReactUiRoot {
    /// Inside an update, after the elements have grown: create the bars the scroll containers want.
    /// A bar that exists without being wanted, or wanted without a container element, is a bar that
    /// should have been freed (or a container that should have been made) and was not.
    pub(super) fn grow_scroll_bar_elements(&mut self, root: Rid, wanted: &[WantedScrollBar]) {
        let misplaced = self
            .accessibility
            .registry
            .grow_scroll_bars(&mut GodotElements::under(root), wanted);
        if !misplaced.is_empty() {
            godot_error!(
                "ReactUiRoot: scroll bar elements exist for axes that cannot scroll, or have no \
                 container element, and were not pruned: {misplaced:?}"
            );
        }
    }

    /// Inside an update, after the containers are set: set every bar whose value, range or track
    /// changed. A bar that did not change is not touched (a touched element is sent whole).
    pub(super) fn apply_scroll_bar_elements(
        &mut self,
        server: &mut Gd<AccessibilityServer>,
        wanted: &[WantedScrollBar],
    ) {
        for bar in wanted {
            let registry = &self.accessibility.registry;
            if !registry.scroll_bar_needs_apply(bar.tag, bar.axis, &bar.props) {
                continue;
            }
            let Some(element) = registry.scroll_bar(bar.tag, bar.axis) else {
                continue;
            };
            self.apply_scroll_bar(server, element, bar);
            self.accessibility.registry.mark_scroll_bar_applied(
                bar.tag,
                bar.axis,
                bar.props.clone(),
            );
        }
    }

    /// Set everything on one bar: a node already sent to the platform is replaced by a new one that has
    /// only a role and a name.
    fn apply_scroll_bar(
        &self,
        server: &mut Gd<AccessibilityServer>,
        element: Rid,
        bar: &WantedScrollBar,
    ) {
        let props: &AxScrollBar = &bar.props;
        server.update_set_role(element, server_role(AxRole::ScrollBar));
        let bounds = props.bounds;
        server.update_set_bounds(
            element,
            Rect2::new(
                Vector2::new(bounds.x, bounds.y),
                Vector2::new(bounds.width, bounds.height),
            ),
        );
        server.update_set_num_value(element, props.position);
        server.update_set_num_range(element, props.min, props.max);
        server.update_set_list_orientation(element, props.vertical);
        let root = self.to_gd();
        for action in [ScrollBarAction::Increment, ScrollBarAction::Decrement] {
            let callable =
                Callable::from_object_method(&root, SCROLL_BAR_ACTION_METHOD).bindv(&varray![
                    i64::from(bar.tag),
                    axis_code(bar.axis),
                    action.code()
                ]);
            server.update_add_action(element, server_action(action), &callable);
        }
    }

    /// Free the bars of container `tag` whose axis can no longer move. Called where the container's
    /// geometry changes (outside an update, where `free_element` is allowed) and asks nothing while no
    /// assistive technology has asked for the tree, because then no bar exists.
    pub(crate) fn prune_scroll_bar_elements(&mut self, tag: u32) {
        if !self.accessibility.registry.has_scroll_bars(tag) {
            return;
        }
        let mounted = &self.mounted;
        self.accessibility.registry.prune_scroll_bars(
            &mut GodotElements::for_freeing(),
            tag,
            |axis| {
                mounted
                    .nodes
                    .get(&tag)
                    .is_some_and(|node| axis_scrolls(node, axis))
            },
        );
        // The container lists one child fewer.
        self.request_accessibility_update();
    }

    /// An assistive technology incremented or decremented a scroll bar: scroll the container one arrow
    /// step along the bar's axis, through the same checked path as `scrollBy` and the accessibility scroll
    /// actions, and deliver what that queued at once, because this is an input-origin entry point.
    pub(crate) fn handle_scroll_bar_action(&mut self, tag: i64, axis: i64, action: i64) {
        let (Ok(tag), Some(axis), Some(action)) = (
            u32::try_from(tag),
            axis_from_code(axis),
            ScrollBarAction::from_code(action),
        ) else {
            godot_error!(
                "ReactUiRoot: malformed scroll bar action (tag {tag}, axis {axis}, action {action})"
            );
            return;
        };
        // The interface may have changed between the request and this call: the container, or its
        // ability to scroll along this axis, is simply gone, and so is the bar (it is freed with it).
        let Some(client) = self
            .mounted
            .nodes
            .get(&tag)
            .filter(|node| axis_scrolls(node, axis))
            .map(|node| node.geometry.padding_box())
        else {
            return;
        };
        let delta = scroll_bar_delta(axis, action, Vec2::new(client.width, client.height));
        if let Err(error) = self.scroll_by_checked(tag, f64::from(delta.x), f64::from(delta.y)) {
            godot_error!("ReactUiRoot: scroll bar action failed: {error}");
        }
        self.deliver();
    }
}
