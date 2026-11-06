//! Scroll bar elements (plan D42): each axis of a scroll container that can move has an element of its
//! own, a child of the container's element, as Godot's `ScrollContainer` and `TextEdit` have (their
//! `ScrollBar` children, read from the real macOS tree in `docs/tracks/scroll-bars.md`).
//!
//! The container's scroll properties (`update_set_scroll_x/y`, plan D38) stay, for platforms that read
//! them. The macOS adapter does not, so a screen reader there learns where it is in a scroll view from
//! this element: a role of `SCROLL_BAR`, the scroll offset as its value, the reachable offsets as its
//! range, an orientation, and `increment` and `decrement` actions that scroll.
//!
//! Godot-free, like the rest of the model. A bar is kept in the slot of the container it belongs to,
//! keyed by its axis, so it has the lifetime of the container's element by construction: the registry
//! forgets it with the slot (`forget_subtree`, `forget_all`) and the server frees it with its parent.
//! It follows the server's two rules:
//!
//! * `free_element` is refused inside an accessibility update, so a bar is created in the update
//!   ([`Registry::grow_scroll_bars`]) and freed outside it, where the geometry that decides whether the
//!   axis can still move changes ([`Registry::prune_scroll_bars`]).
//! * A parent's child list is sent only when the parent is sent, so creating or freeing a bar marks the
//!   container's slot to be set again.
//!
//! Order: a bar is the container's child after the container's exposed content, the horizontal one
//! before the vertical one, as the stock controls list them. Content is inserted at its index among
//! the content, so it stays before the bars.

use crate::scroll::{AXES, Axis, ScrollDirection, ScrollUnit, Vec2, assistive_scroll_delta};

use super::{AxBounds, AxRole, AxScroll, AxScrollAxis, ElementServer, Registry};

/// What an assistive technology can ask a scroll bar to do: `AXIncrement` and `AXDecrement` on macOS.
/// The stock `ScrollBar` also takes a set-value, which VoiceOver does not use on a scroll bar; this
/// library offers the two that a screen reader uses to move through a scroll view.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ScrollBarAction {
    Increment,
    Decrement,
}

impl ScrollBarAction {
    const INCREMENT: i64 = 0;
    const DECREMENT: i64 = 1;

    /// The number bound into the action's callable.
    pub(crate) fn code(self) -> i64 {
        match self {
            ScrollBarAction::Increment => Self::INCREMENT,
            ScrollBarAction::Decrement => Self::DECREMENT,
        }
    }

    pub(crate) fn from_code(code: i64) -> Option<Self> {
        match code {
            Self::INCREMENT => Some(ScrollBarAction::Increment),
            Self::DECREMENT => Some(ScrollBarAction::Decrement),
            _ => None,
        }
    }
}

const AXIS_X: i64 = 0;
const AXIS_Y: i64 = 1;

/// The number bound into a scroll bar's callable for its axis.
pub(crate) fn axis_code(axis: Axis) -> i64 {
    match axis {
        Axis::X => AXIS_X,
        Axis::Y => AXIS_Y,
    }
}

pub(crate) fn axis_from_code(code: i64) -> Option<Axis> {
    match code {
        AXIS_X => Some(Axis::X),
        AXIS_Y => Some(Axis::Y),
        _ => None,
    }
}

/// How far a scroll bar's action moves its container, in pixels (not clamped): the arrow key's step,
/// a page divided by [`crate::scroll::SCROLL_PAGE_DIVISOR`] (`key_scroll_delta`; the container's own
/// item-sized accessibility scroll is the same), towards the end of the axis for an increment and
/// towards its start for a decrement. Down and right are towards `max` on a reversed axis too.
pub(crate) fn scroll_bar_delta(axis: Axis, action: ScrollBarAction, client: Vec2) -> Vec2 {
    let direction = match (axis, action) {
        (Axis::X, ScrollBarAction::Increment) => ScrollDirection::Right,
        (Axis::X, ScrollBarAction::Decrement) => ScrollDirection::Left,
        (Axis::Y, ScrollBarAction::Increment) => ScrollDirection::Down,
        (Axis::Y, ScrollBarAction::Decrement) => ScrollDirection::Up,
    };
    assistive_scroll_delta(direction, ScrollUnit::Item, client)
}

/// Everything the accessibility tree says about one scroll bar. Equal values need no update.
///
/// The value and range are the container's reachable offsets, not Godot's `ScrollBar` convention
/// (total content size as the maximum, which its value never reaches): the value is the offset
/// (`scrollTop`, `scrollLeft`) and ends at the maximum, so a screen reader that reads the value as a
/// share of the range reads the end of the content as the whole of it. The element has no name; the
/// stock bars have none either, and the platform names the role and, from the orientation, the axis.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct AxScrollBar {
    /// The bar runs along the vertical axis.
    pub(crate) vertical: bool,
    /// The bar's track, root-local.
    pub(crate) bounds: AxBounds,
    pub(crate) position: f64,
    pub(crate) min: f64,
    pub(crate) max: f64,
}

impl AxScrollBar {
    fn of(axis: Axis, data: &AxScrollAxis) -> Self {
        Self {
            vertical: axis == Axis::Y,
            bounds: data.track,
            position: data.position,
            min: data.min,
            max: data.max,
        }
    }
}

/// A scroll bar element the tree wants: the axis of container `tag`, and what it says.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct WantedScrollBar {
    pub(crate) tag: u32,
    pub(crate) axis: Axis,
    pub(crate) props: AxScrollBar,
}

/// The bars an element's scroll state asks for: one for each axis that can move, horizontal first. An
/// exposed element that is a scroll container has them whatever its role, as it has the scroll
/// properties and actions of plan D38 whatever its role: a `ScrollContainer` and a `TextEdit` both do
/// in the stock tree.
pub(crate) fn scroll_bars_of(tag: u32, scroll: Option<AxScroll>) -> Vec<WantedScrollBar> {
    let Some(scroll) = scroll else {
        return Vec::new();
    };
    AXES.into_iter()
        .filter_map(|axis| {
            let data = match axis {
                Axis::X => scroll.x,
                Axis::Y => scroll.y,
            }?;
            Some(WantedScrollBar {
                tag,
                axis,
                props: AxScrollBar::of(axis, &data),
            })
        })
        .collect()
}

/// One bar the registry has made.
struct BarSlot<Id> {
    id: Id,
    /// What was last set on the element; `None` until it has been set.
    applied: Option<AxScrollBar>,
}

/// The bars of one container, by axis.
pub(super) struct ScrollBarSlots<Id> {
    x: Option<BarSlot<Id>>,
    y: Option<BarSlot<Id>>,
}

impl<Id> Default for ScrollBarSlots<Id> {
    fn default() -> Self {
        Self { x: None, y: None }
    }
}

impl<Id> ScrollBarSlots<Id> {
    fn get(&self, axis: Axis) -> Option<&BarSlot<Id>> {
        match axis {
            Axis::X => self.x.as_ref(),
            Axis::Y => self.y.as_ref(),
        }
    }

    fn get_mut(&mut self, axis: Axis) -> Option<&mut BarSlot<Id>> {
        match axis {
            Axis::X => self.x.as_mut(),
            Axis::Y => self.y.as_mut(),
        }
    }

    fn put(&mut self, axis: Axis, bar: BarSlot<Id>) {
        match axis {
            Axis::X => self.x = Some(bar),
            Axis::Y => self.y = Some(bar),
        }
    }

    fn take(&mut self, axis: Axis) -> Option<BarSlot<Id>> {
        match axis {
            Axis::X => self.x.take(),
            Axis::Y => self.y.take(),
        }
    }

    /// How many bars sit before the one for `axis`.
    fn before(&self, axis: Axis) -> usize {
        AXES.into_iter()
            .take_while(|candidate| *candidate != axis)
            .filter(|candidate| self.get(*candidate).is_some())
            .count()
    }

    fn any(&self) -> bool {
        self.x.is_some() || self.y.is_some()
    }
}

impl<Id: Copy> Registry<Id> {
    /// The element of the bar for `axis` of container `tag`, if it has been made.
    pub(crate) fn scroll_bar(&self, tag: u32, axis: Axis) -> Option<Id> {
        self.slots
            .get(&tag)
            .and_then(|slot| slot.bars.get(axis))
            .map(|bar| bar.id)
    }

    /// Whether container `tag` has any bar element, which is the whole cost of asking when none does.
    pub(crate) fn has_scroll_bars(&self, tag: u32) -> bool {
        self.slots.get(&tag).is_some_and(|slot| slot.bars.any())
    }

    /// Create the bars the tree wants and the registry lacks, each under its container's element
    /// after the container's content and the bars before it. Allowed inside an update, and run after
    /// [`Registry::grow`], so the content exists. Returns the bars that are not where the tree wants
    /// them: wanted, with no element for their container, or existing and not wanted. Freeing is
    /// refused inside an update, so [`Registry::prune_scroll_bars`] should have freed the second kind.
    pub(crate) fn grow_scroll_bars<S: ElementServer<Id = Id>>(
        &mut self,
        server: &mut S,
        wanted: &[WantedScrollBar],
    ) -> Vec<(u32, Axis)> {
        let mut misplaced = Vec::new();
        for bar in wanted {
            let Some(slot) = self.slots.get_mut(&bar.tag) else {
                misplaced.push((bar.tag, bar.axis));
                continue;
            };
            if slot.bars.get(bar.axis).is_some() {
                continue;
            }
            let position = slot.children.len() + slot.bars.before(bar.axis);
            let id = server.create_element(Some(slot.id), AxRole::ScrollBar, position);
            slot.bars.put(bar.axis, BarSlot { id, applied: None });
            slot.children_changed = true;
        }
        for (tag, slot) in &self.slots {
            for axis in AXES {
                let wanted_here = wanted.iter().any(|bar| bar.tag == *tag && bar.axis == axis);
                if slot.bars.get(axis).is_some() && !wanted_here {
                    misplaced.push((*tag, axis));
                }
            }
        }
        misplaced.sort_by_key(|(tag, axis)| (*tag, axis_code(*axis)));
        misplaced.dedup();
        misplaced
    }

    /// Free the bars of container `tag` for the axes that `scrolls` says can no longer move. Outside
    /// an update only.
    pub(crate) fn prune_scroll_bars<S: ElementServer<Id = Id>>(
        &mut self,
        server: &mut S,
        tag: u32,
        scrolls: impl Fn(Axis) -> bool,
    ) {
        let Some(slot) = self.slots.get_mut(&tag) else {
            return;
        };
        for axis in AXES {
            if scrolls(axis) {
                continue;
            }
            if let Some(bar) = slot.bars.take(axis) {
                server.free_element(bar.id);
                slot.children_changed = true;
            }
        }
    }

    /// Whether the bar for `axis` of `tag` must be set completely: it has never been, or what it says
    /// differs from what was set. False for a bar that does not exist.
    pub(crate) fn scroll_bar_needs_apply(&self, tag: u32, axis: Axis, props: &AxScrollBar) -> bool {
        self.slots
            .get(&tag)
            .and_then(|slot| slot.bars.get(axis))
            .is_some_and(|bar| bar.applied.as_ref() != Some(props))
    }

    pub(crate) fn mark_scroll_bar_applied(&mut self, tag: u32, axis: Axis, props: AxScrollBar) {
        if let Some(bar) = self
            .slots
            .get_mut(&tag)
            .and_then(|slot| slot.bars.get_mut(axis))
        {
            bar.applied = Some(props);
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::super::{AxEntry, Content, Desired, Resolved};
    use super::*;
    use crate::scroll::{
        OverscrollBehavior, ScrollKey, ScrollLink, ScrollRanges, key_scroll_delta,
    };

    const ROOT: u32 = 0;

    /// A server that keeps its tree the way `AccessibilityServer` does: a parent's child list with an
    /// insert position that must lie inside it, recursive freeing, and a refusal to free inside an update.
    #[derive(Default)]
    struct Server {
        next: u32,
        children: HashMap<u32, Vec<u32>>,
        parent: HashMap<u32, u32>,
        roles: HashMap<u32, AxRole>,
        in_update: bool,
        created: usize,
        freed: usize,
    }

    impl Server {
        fn new() -> Self {
            let mut server = Self {
                next: 1,
                ..Self::default()
            };
            server.children.insert(ROOT, Vec::new());
            server
        }

        fn below(&self, id: u32) -> Vec<(u32, AxRole)> {
            self.children[&id]
                .iter()
                .map(|child| (*child, self.roles[child]))
                .collect()
        }
    }

    impl ElementServer for Server {
        type Id = u32;

        fn create_element(&mut self, parent: Option<u32>, role: AxRole, index: usize) -> u32 {
            let id = self.next;
            self.next += 1;
            let parent = parent.unwrap_or(ROOT);
            let siblings = self.children.get_mut(&parent).expect("parent exists");
            assert!(
                index <= siblings.len(),
                "an insert position lies in the child list"
            );
            siblings.insert(index, id);
            self.children.insert(id, Vec::new());
            self.parent.insert(id, parent);
            self.roles.insert(id, role);
            self.created += 1;
            id
        }

        fn free_element(&mut self, id: u32) {
            assert!(!self.in_update, "free_element is refused inside an update");
            let parent = self.parent.remove(&id).expect("freed element exists");
            self.children
                .get_mut(&parent)
                .unwrap()
                .retain(|child| *child != id);
            let mut stack = vec![id];
            while let Some(id) = stack.pop() {
                stack.extend(self.children.remove(&id).expect("element exists"));
                self.roles.remove(&id);
                self.freed += 1;
            }
        }
    }

    fn desired_of(shape: &[(u32, Option<u32>)]) -> Desired {
        let role = Resolved::new(AxRole::Container, Content::Expose);
        Desired::new(
            shape
                .iter()
                .map(|(tag, parent)| AxEntry {
                    tag: *tag,
                    parent: *parent,
                    resolved: role,
                    disabled: false,
                    real_disabled: false,
                })
                .collect(),
        )
    }

    /// The registry and server after one update that grew `shape` and then the bars: the server
    /// refuses to free while it runs.
    fn update(
        registry: &mut Registry<u32>,
        server: &mut Server,
        shape: &[(u32, Option<u32>)],
        bars: &[WantedScrollBar],
    ) -> Vec<(u32, Axis)> {
        server.in_update = true;
        let desired = desired_of(shape);
        assert_eq!(registry.grow(server, &desired), Vec::<u32>::new());
        let misplaced = registry.grow_scroll_bars(server, bars);
        server.in_update = false;
        misplaced
    }

    fn wanted(tag: u32, axis: Axis, position: f64) -> WantedScrollBar {
        WantedScrollBar {
            tag,
            axis,
            props: AxScrollBar {
                vertical: axis == Axis::Y,
                bounds: AxBounds {
                    x: 1.0,
                    y: 2.0,
                    width: 6.0,
                    height: 80.0,
                },
                position,
                min: 0.0,
                max: 120.0,
            },
        }
    }

    /// Container 1 with content 2, 3 and 4.
    const CONTAINER: [(u32, Option<u32>); 4] =
        [(1, None), (2, Some(1)), (3, Some(1)), (4, Some(1))];

    fn container_children(server: &Server, registry: &Registry<u32>) -> Vec<(u32, AxRole)> {
        server.below(registry.element(1).expect("the container exists"))
    }

    #[test]
    fn each_wanted_axis_gets_one_element_after_the_content_horizontal_first() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        let bars = [wanted(1, Axis::X, 0.0), wanted(1, Axis::Y, 0.0)];
        assert_eq!(
            update(&mut registry, &mut server, &CONTAINER, &bars),
            vec![]
        );
        assert_eq!(server.created, 6, "the container, three rows and two bars");
        let roles: Vec<AxRole> = container_children(&server, &registry)
            .iter()
            .map(|(_, role)| *role)
            .collect();
        assert_eq!(
            roles,
            [
                AxRole::Container,
                AxRole::Container,
                AxRole::Container,
                AxRole::ScrollBar,
                AxRole::ScrollBar
            ],
            "the content first, then a bar for x and a bar for y"
        );
        let (x, y) = (
            registry.scroll_bar(1, Axis::X).unwrap(),
            registry.scroll_bar(1, Axis::Y).unwrap(),
        );
        let ids: Vec<u32> = container_children(&server, &registry)
            .iter()
            .map(|(id, _)| *id)
            .collect();
        assert_eq!(&ids[3..], [x, y]);
        assert!(registry.has_scroll_bars(1) && !registry.has_scroll_bars(2));
        assert!(
            registry.slots[&1].children_changed,
            "the container lists new children"
        );
    }

    #[test]
    fn a_bar_made_after_the_content_marks_the_container_to_be_sent_again() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        update(&mut registry, &mut server, &CONTAINER, &[]);
        // The container was set once its content had grown: nothing about it is pending.
        registry.slots.get_mut(&1).unwrap().children_changed = false;
        update(
            &mut registry,
            &mut server,
            &CONTAINER,
            &[wanted(1, Axis::Y, 0.0)],
        );
        assert!(
            registry.slots[&1].children_changed,
            "a parent's child list is sent only when the parent is, so the new bar needs the container set again"
        );
    }

    #[test]
    fn a_bar_is_created_once_and_a_second_update_changes_nothing() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        let bars = [wanted(1, Axis::Y, 0.0)];
        update(&mut registry, &mut server, &CONTAINER, &bars);
        let before = (
            server.created,
            server.freed,
            registry.scroll_bar(1, Axis::Y),
        );
        // The position changes on every scroll; the element is not made again.
        let scrolled = [wanted(1, Axis::Y, 40.0)];
        assert_eq!(
            update(&mut registry, &mut server, &CONTAINER, &scrolled),
            vec![]
        );
        assert_eq!(
            (
                server.created,
                server.freed,
                registry.scroll_bar(1, Axis::Y)
            ),
            before
        );
    }

    #[test]
    fn an_axis_that_starts_to_scroll_later_is_made_after_the_content_and_before_the_later_axis() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        update(
            &mut registry,
            &mut server,
            &CONTAINER,
            &[wanted(1, Axis::Y, 0.0)],
        );
        let y = registry.scroll_bar(1, Axis::Y).unwrap();
        let both = [wanted(1, Axis::X, 0.0), wanted(1, Axis::Y, 0.0)];
        update(&mut registry, &mut server, &CONTAINER, &both);
        let x = registry.scroll_bar(1, Axis::X).unwrap();
        let ids: Vec<u32> = container_children(&server, &registry)
            .iter()
            .map(|(id, _)| *id)
            .collect();
        assert_eq!(
            &ids[3..],
            [x, y],
            "x went in front of the y bar that was there"
        );
        assert_eq!(server.created, 6);
    }

    #[test]
    fn content_added_after_the_bars_goes_in_before_them() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        let bars = [wanted(1, Axis::X, 0.0), wanted(1, Axis::Y, 0.0)];
        update(&mut registry, &mut server, &CONTAINER, &bars);
        let longer = [
            (1, None),
            (2, Some(1)),
            (3, Some(1)),
            (4, Some(1)),
            (5, Some(1)),
        ];
        assert_eq!(update(&mut registry, &mut server, &longer, &bars), vec![]);
        let roles: Vec<AxRole> = container_children(&server, &registry)
            .iter()
            .map(|(_, role)| *role)
            .collect();
        assert_eq!(
            &roles[3..],
            [AxRole::Container, AxRole::ScrollBar, AxRole::ScrollBar],
            "the new row is the last row, still before the bars"
        );
        assert_eq!(server.created, 7, "only the row was made");
    }

    #[test]
    fn a_new_value_or_range_needs_an_apply_and_an_equal_one_does_not() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        let bar = wanted(1, Axis::Y, 0.0);
        update(
            &mut registry,
            &mut server,
            &CONTAINER,
            std::slice::from_ref(&bar),
        );
        assert!(
            registry.scroll_bar_needs_apply(1, Axis::Y, &bar.props),
            "a new element has never been set"
        );
        registry.mark_scroll_bar_applied(1, Axis::Y, bar.props.clone());
        assert!(!registry.scroll_bar_needs_apply(1, Axis::Y, &bar.props));
        let scrolled = wanted(1, Axis::Y, 40.0).props;
        assert!(
            registry.scroll_bar_needs_apply(1, Axis::Y, &scrolled),
            "the value moved"
        );
        let longer = AxScrollBar {
            max: 200.0,
            ..bar.props.clone()
        };
        assert!(
            registry.scroll_bar_needs_apply(1, Axis::Y, &longer),
            "the range grew"
        );
        let moved = AxScrollBar {
            bounds: AxBounds {
                x: 5.0,
                ..bar.props.bounds
            },
            ..bar.props.clone()
        };
        assert!(
            registry.scroll_bar_needs_apply(1, Axis::Y, &moved),
            "the track moved"
        );
        assert!(
            !registry.scroll_bar_needs_apply(1, Axis::X, &bar.props),
            "there is no x bar to set"
        );
        assert!(!registry.scroll_bar_needs_apply(9, Axis::Y, &bar.props));
    }

    #[test]
    fn an_axis_that_stops_scrolling_frees_its_bar_alone_and_marks_the_container() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        let bars = [wanted(1, Axis::X, 0.0), wanted(1, Axis::Y, 0.0)];
        update(&mut registry, &mut server, &CONTAINER, &bars);
        registry.slots.get_mut(&1).unwrap().children_changed = false;
        let x = registry.scroll_bar(1, Axis::X).unwrap();
        registry.prune_scroll_bars(&mut server, 1, |axis| axis == Axis::X);
        assert_eq!(server.freed, 1);
        assert_eq!(registry.scroll_bar(1, Axis::Y), None);
        assert_eq!(
            registry.scroll_bar(1, Axis::X),
            Some(x),
            "the other axis keeps its element"
        );
        assert!(
            registry.slots[&1].children_changed,
            "the container lists one child fewer"
        );
        // Pruning again, or a container that has no bars, frees nothing.
        registry.prune_scroll_bars(&mut server, 1, |axis| axis == Axis::X);
        registry.prune_scroll_bars(&mut server, 2, |_| false);
        registry.prune_scroll_bars(&mut server, 99, |_| false);
        assert_eq!(server.freed, 1);
        // The axis can start again: a new element, in its place.
        update(&mut registry, &mut server, &CONTAINER, &bars);
        assert_eq!(server.created, 7);
        assert!(registry.scroll_bar(1, Axis::Y).is_some_and(|id| id != x));
    }

    #[test]
    fn a_container_that_stops_scrolling_on_both_axes_loses_both_bars() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        let bars = [wanted(1, Axis::X, 0.0), wanted(1, Axis::Y, 0.0)];
        update(&mut registry, &mut server, &CONTAINER, &bars);
        registry.prune_scroll_bars(&mut server, 1, |_| false);
        assert_eq!(server.freed, 2);
        assert!(!registry.has_scroll_bars(1));
        assert_eq!(
            container_children(&server, &registry).len(),
            3,
            "only the content is left"
        );
    }

    #[test]
    fn removing_the_container_takes_its_bars_with_it_without_freeing_them_twice() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        let bars = [wanted(1, Axis::X, 0.0), wanted(1, Axis::Y, 0.0)];
        update(&mut registry, &mut server, &CONTAINER, &bars);
        registry.remove(&mut server, 1);
        assert_eq!(
            server.freed, 6,
            "the container, its rows and its bars, once each"
        );
        assert!(registry.is_empty());
        assert_eq!(registry.scroll_bar(1, Axis::X), None);
        assert!(!registry.has_scroll_bars(1));
    }

    #[test]
    fn pruning_the_registry_frees_the_bars_of_a_container_the_tree_no_longer_wants() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        let shape = [(1, None), (2, None)];
        let bars = [wanted(1, Axis::Y, 0.0), wanted(2, Axis::Y, 0.0)];
        update(&mut registry, &mut server, &shape, &bars);
        registry.prune(&mut server, &desired_of(&[(2, None)]));
        assert_eq!(server.freed, 2, "container 1 and its bar");
        assert!(
            registry.scroll_bar(1, Axis::Y).is_none() && registry.scroll_bar(2, Axis::Y).is_some()
        );
    }

    #[test]
    fn forgetting_every_element_forgets_the_bars_and_frees_nothing() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        update(
            &mut registry,
            &mut server,
            &CONTAINER,
            &[wanted(1, Axis::Y, 0.0)],
        );
        registry.forget_all();
        assert!(registry.is_empty() && !registry.has_scroll_bars(1));
        assert_eq!(server.freed, 0);
    }

    #[test]
    fn grow_reports_a_bar_the_prune_did_not_free_and_a_bar_with_no_container() {
        let mut registry = Registry::default();
        let mut server = Server::new();
        update(
            &mut registry,
            &mut server,
            &CONTAINER,
            &[wanted(1, Axis::X, 0.0), wanted(1, Axis::Y, 0.0)],
        );
        let misplaced = update(
            &mut registry,
            &mut server,
            &CONTAINER,
            &[wanted(1, Axis::Y, 0.0), wanted(7, Axis::X, 0.0)],
        );
        assert_eq!(
            misplaced,
            vec![(1, Axis::X), (7, Axis::X)],
            "the x bar is no longer wanted and nobody freed it; container 7 has no element"
        );
        assert_eq!(server.freed, 0, "grow frees nothing");
    }

    #[test]
    fn bars_come_from_the_axes_that_can_move_horizontal_first() {
        let axis = |position: f64, max: f64| {
            Some(AxScrollAxis {
                position,
                min: 0.0,
                max,
                track: AxBounds {
                    x: 1.0,
                    y: 2.0,
                    width: 3.0,
                    height: 4.0,
                },
            })
        };
        assert_eq!(scroll_bars_of(1, None), vec![]);
        assert_eq!(
            scroll_bars_of(1, Some(AxScroll { x: None, y: None })),
            vec![],
            "a scroll container with nothing to scroll has no bars"
        );
        let both = scroll_bars_of(
            4,
            Some(AxScroll {
                x: axis(5.0, 30.0),
                y: axis(60.0, 120.0),
            }),
        );
        assert_eq!(
            both.iter()
                .map(|bar| (bar.tag, bar.axis, bar.props.vertical))
                .collect::<Vec<_>>(),
            [(4, Axis::X, false), (4, Axis::Y, true)]
        );
        assert_eq!(
            (both[0].props.position, both[0].props.max),
            (5.0, 30.0),
            "each bar reads its own axis"
        );
        let vertical = scroll_bars_of(
            4,
            Some(AxScroll {
                x: None,
                y: axis(0.0, 9.0),
            }),
        );
        assert_eq!(vertical.len(), 1);
        assert_eq!(vertical[0].axis, Axis::Y);
        assert_eq!(
            vertical[0].props.bounds.width, 3.0,
            "the track is the axis' track"
        );
    }

    #[test]
    fn increment_and_decrement_step_as_the_arrow_keys_do() {
        let client = Vec2::new(320.0, 96.0);
        let link = ScrollLink {
            client,
            ranges: ScrollRanges::NONE,
            offset: Vec2::ZERO,
            overscroll: OverscrollBehavior::Auto,
            frame: None,
        };
        let cases = [
            (Axis::Y, ScrollBarAction::Increment, ScrollKey::ArrowDown),
            (Axis::Y, ScrollBarAction::Decrement, ScrollKey::ArrowUp),
            (Axis::X, ScrollBarAction::Increment, ScrollKey::ArrowRight),
            (Axis::X, ScrollBarAction::Decrement, ScrollKey::ArrowLeft),
        ];
        for (axis, action, key) in cases {
            assert_eq!(
                scroll_bar_delta(axis, action, client),
                key_scroll_delta(key, false, &link),
                "{axis:?} {action:?} is {key:?}"
            );
        }
        assert_eq!(
            scroll_bar_delta(Axis::Y, ScrollBarAction::Increment, client),
            Vec2::new(0.0, 12.0),
            "an eighth of the client height, along the bar's axis only"
        );
    }

    #[test]
    fn actions_and_axes_round_trip_through_their_codes() {
        for action in [ScrollBarAction::Increment, ScrollBarAction::Decrement] {
            assert_eq!(ScrollBarAction::from_code(action.code()), Some(action));
        }
        for axis in AXES {
            assert_eq!(axis_from_code(axis_code(axis)), Some(axis));
        }
        assert_eq!(ScrollBarAction::from_code(2), None);
        assert_eq!(ScrollBarAction::from_code(-1), None);
        assert_eq!(axis_from_code(2), None);
        assert_eq!(axis_from_code(-1), None);
    }
}
