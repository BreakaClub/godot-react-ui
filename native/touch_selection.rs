//! Touch text selection without the engine: the long press that starts it, the
//! two handles that move its ends and the edit menu beside them. Nothing here touches Godot or the mounted tree; the integrating
//! code (`touch_selection_input.rs`) feeds it positions and times, measured label widths and where the selection's ends are, and
//! draws and acts on what it answers.
//!
//! The numbers are what a mobile browser does, which this copies.

use crate::scroll::{TOUCH_SLOP_PX, Vec2, exceeds_slop};

/// How long a finger stays down, nearly still, on selectable text before the word under it is selected. iOS's
/// `UILongPressGestureRecognizer.minimumPressDuration` is 0.5 s and Android's `ViewConfiguration.DEFAULT_LONG_PRESS_TIMEOUT` is
/// 500 ms (the two defaults; a person can lengthen it on Android). The touch drag's hold (`drag::TOUCH_DRAG_HOLD_MS`) is the same
/// value for the same reason, and is a separate constant because the two gestures are decided separately: inside a draggable element
/// the drag owns the hold.
pub(crate) const TOUCH_SELECT_HOLD_MS: f64 = 500.0;

/// A handle's stem, the selection edge it marks, in logical pixels.
pub(crate) const HANDLE_STEM_WIDTH_PX: f32 = 2.0;
/// The ball at the end of a handle's stem: the start handle's is above the first line, the end handle's below the last.
pub(crate) const HANDLE_BALL_RADIUS_PX: f32 = 6.0;
/// The square a finger may grab a handle in, centred on its ball: the minimum touch target of both platforms' guidelines (44 pt on
/// iOS, 48 dp on Android; the smaller of the two).
pub(crate) const HANDLE_TOUCH_TARGET_PX: f32 = 44.0;

pub(crate) const MENU_HEIGHT_PX: f32 = 38.0;
/// Space either side of a label inside its segment of the menu.
pub(crate) const MENU_ITEM_PADDING_PX: f32 = 14.0;
pub(crate) const MENU_RADIUS_PX: f32 = 10.0;
/// Clear space between a handle's ball and the menu.
pub(crate) const MENU_GAP_PX: f32 = 6.0;
/// The menu never comes nearer than this to the edge of the root.
pub(crate) const MENU_EDGE_MARGIN_PX: f32 = 8.0;
pub(crate) const MENU_FONT_SIZE_PX: i32 = 14;
pub(crate) const MENU_DIVIDER_WIDTH_PX: f32 = 1.0;

/// A rectangle in root-local logical pixels.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Area {
    pub(crate) x: f32,
    pub(crate) y: f32,
    pub(crate) width: f32,
    pub(crate) height: f32,
}

impl Area {
    pub(crate) const fn new(x: f32, y: f32, width: f32, height: f32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }

    /// Edges: the left and top are inside, the right and bottom are not, as for every other hit rectangle.
    pub(crate) fn contains(&self, point: Vec2) -> bool {
        point.x >= self.x
            && point.y >= self.y
            && point.x < self.x + self.width
            && point.y < self.y + self.height
    }

    #[cfg(test)]
    pub(crate) fn centre(&self) -> Vec2 {
        Vec2::new(self.x + self.width / 2.0, self.y + self.height / 2.0)
    }
}

// ---- The long press -------------------------------------------------------------------------------------------------

/// A finger that went down on selectable text and may be a long press: it is one if it is still within the slop when the hold
/// has elapsed. Movement beyond the slop makes it a pan or a tap, never a selection.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Hold {
    pub(crate) pointer: u32,
    origin: Vec2,
    deadline_ms: f64,
}

impl Hold {
    pub(crate) fn new(pointer: u32, origin: Vec2, now_ms: f64) -> Self {
        Self {
            pointer,
            origin,
            deadline_ms: now_ms + TOUCH_SELECT_HOLD_MS,
        }
    }

    pub(crate) fn origin(&self) -> Vec2 {
        self.origin
    }

    #[cfg(test)]
    pub(crate) fn deadline_ms(&self) -> f64 {
        self.deadline_ms
    }

    /// Whether the hold has elapsed at `now_ms`.
    pub(crate) fn is_due(&self, now_ms: f64) -> bool {
        now_ms >= self.deadline_ms
    }

    /// Whether the finger, now at `position`, has left the slop: the hold is over.
    pub(crate) fn is_broken_by(&self, position: Vec2) -> bool {
        exceeds_slop(position - self.origin, TOUCH_SLOP_PX)
    }
}

// ---- The handles ----------------------------------------------------------------------------------------------------

/// Which end of the selection, in reading order, a handle marks.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum HandleEnd {
    Start,
    End,
}

/// Where a selection end is, as the line it is on: the stem's x and its top and bottom.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Edge {
    pub(crate) x: f32,
    pub(crate) top: f32,
    pub(crate) bottom: f32,
}

impl Edge {
    /// The middle of the stem: the point of the text a drag of the handle moves.
    pub(crate) fn middle(&self) -> Vec2 {
        Vec2::new(self.x, (self.top + self.bottom) / 2.0)
    }
}

/// One handle: the stem along the selection's edge and the ball that sticks out of the selection at its end.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Handle {
    pub(crate) end: HandleEnd,
    pub(crate) edge: Edge,
}

impl Handle {
    pub(crate) fn stem(&self) -> Area {
        Area::new(
            self.edge.x - HANDLE_STEM_WIDTH_PX / 2.0,
            self.edge.top,
            HANDLE_STEM_WIDTH_PX,
            self.edge.bottom - self.edge.top,
        )
    }

    pub(crate) fn ball_centre(&self) -> Vec2 {
        let y = match self.end {
            HandleEnd::Start => self.edge.top - HANDLE_BALL_RADIUS_PX,
            HandleEnd::End => self.edge.bottom + HANDLE_BALL_RADIUS_PX,
        };
        Vec2::new(self.edge.x, y)
    }

    /// What a finger may grab it by.
    pub(crate) fn target(&self) -> Area {
        let centre = self.ball_centre();
        Area::new(
            centre.x - HANDLE_TOUCH_TARGET_PX / 2.0,
            centre.y - HANDLE_TOUCH_TARGET_PX / 2.0,
            HANDLE_TOUCH_TARGET_PX,
            HANDLE_TOUCH_TARGET_PX,
        )
    }
}

/// Where the text a dragged handle controls is, for a finger at `finger`: the point the handle marks, kept at the distance from the
/// finger it had when the finger went down on it (`grab`), so the end does not jump to the fingertip.
pub(crate) fn dragged_point(finger: Vec2, grab: Vec2) -> Vec2 {
    finger + grab
}

/// From the finger that went down on `handle` at `touch` to the point the handle marks.
pub(crate) fn grab_offset(handle: &Handle, touch: Vec2) -> Vec2 {
    handle.edge.middle() - touch
}

// ---- The menu -------------------------------------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum MenuAction {
    Cut,
    Copy,
    Paste,
    SelectAll,
}

impl MenuAction {
    pub(crate) fn label(self) -> &'static str {
        match self {
            MenuAction::Cut => "Cut",
            MenuAction::Copy => "Copy",
            MenuAction::Paste => "Paste",
            MenuAction::SelectAll => "Select All",
        }
    }

    /// The name the actions have in the geometry JS and the verifiers read.
    pub(crate) fn name(self) -> &'static str {
        match self {
            MenuAction::Cut => "cut",
            MenuAction::Copy => "copy",
            MenuAction::Paste => "paste",
            MenuAction::SelectAll => "selectAll",
        }
    }
}

/// What the selection allows, for the menu to offer.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct MenuContext {
    /// The selection is in a text input that can be edited (not read-only).
    pub(crate) editable: bool,
    /// Its text may be copied: not a secure input.
    pub(crate) copyable: bool,
    /// The selection covers characters (a collapsed one has nothing to cut or copy).
    pub(crate) has_selection: bool,
    /// All of what Select All would select is selected already.
    pub(crate) all_selected: bool,
}

/// The actions the menu offers, in the order both platforms use: Cut, Copy, Paste, Select All. Cut and Paste are for an editable text
/// input; Copy needs characters that may be copied; Select All is left out when everything is selected.
pub(crate) fn menu_actions(context: MenuContext) -> Vec<MenuAction> {
    let mut actions = Vec::new();
    if context.editable && context.copyable && context.has_selection {
        actions.push(MenuAction::Cut);
    }
    if context.copyable && context.has_selection {
        actions.push(MenuAction::Copy);
    }
    if context.editable {
        actions.push(MenuAction::Paste);
    }
    if !context.all_selected {
        actions.push(MenuAction::SelectAll);
    }
    actions
}

/// The menu placed: its box and the segment of each action.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct MenuLayout {
    pub(crate) area: Area,
    pub(crate) items: Vec<(MenuAction, Area)>,
}

impl MenuLayout {
    /// The action whose segment holds `point`.
    pub(crate) fn action_at(&self, point: Vec2) -> Option<MenuAction> {
        self.items
            .iter()
            .find(|(_, area)| area.contains(point))
            .map(|(action, _)| *action)
    }
}

/// Place a menu of `labels` (each action with the width its label measured) over the selection whose visible ends are `ends`: centred
/// on them, above the start handle's ball, or below the end handle's when there is no room above, and inside `bounds` (the root) with
/// a margin. `None` when no action is offered or no end is visible.
pub(crate) fn layout_menu(
    labels: &[(MenuAction, f32)],
    ends: &[Edge],
    bounds: Area,
) -> Option<MenuLayout> {
    if labels.is_empty() || ends.is_empty() {
        return None;
    }
    let width: f32 = labels
        .iter()
        .map(|(_, label)| label + 2.0 * MENU_ITEM_PADDING_PX)
        .sum();
    let top = ends.iter().map(|edge| edge.top).fold(f32::MAX, f32::min);
    let bottom = ends.iter().map(|edge| edge.bottom).fold(f32::MIN, f32::max);
    let left = ends.iter().map(|edge| edge.x).fold(f32::MAX, f32::min);
    let right = ends.iter().map(|edge| edge.x).fold(f32::MIN, f32::max);
    let clearance = 2.0 * HANDLE_BALL_RADIUS_PX + MENU_GAP_PX;
    let above = top - clearance - MENU_HEIGHT_PX;
    let below = bottom + clearance;
    let lowest = bounds.y + bounds.height - MENU_EDGE_MARGIN_PX - MENU_HEIGHT_PX;
    let highest = bounds.y + MENU_EDGE_MARGIN_PX;
    let y = if above >= highest {
        above
    } else if below <= lowest {
        below
    } else {
        // Neither side has room (a selection as tall as the root): over the selection, as near the top as the margin lets it.
        highest.min(lowest)
    };
    let x = ((left + right) / 2.0 - width / 2.0)
        .min(bounds.x + bounds.width - MENU_EDGE_MARGIN_PX - width)
        // A menu wider than the root cannot be centred: it starts at the margin and runs off the far edge, which the root clips.
        .max(bounds.x + MENU_EDGE_MARGIN_PX);
    let mut cursor = x;
    let items = labels
        .iter()
        .map(|(action, label)| {
            let segment = label + 2.0 * MENU_ITEM_PADDING_PX;
            let area = Area::new(cursor, y, segment, MENU_HEIGHT_PX);
            cursor += segment;
            (*action, area)
        })
        .collect();
    Some(MenuLayout {
        area: Area::new(x, y, width, MENU_HEIGHT_PX),
        items,
    })
}

// ---- What is on screen ------------------------------------------------------------------------------------------------

/// What a finger that goes down at a point has gone down on.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ChromeHit {
    Handle(HandleEnd),
    Menu(MenuAction),
}

/// The handles and the menu as they are placed now.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ChromeLayout {
    pub(crate) start: Option<Handle>,
    pub(crate) end: Option<Handle>,
    pub(crate) menu: Option<MenuLayout>,
}

impl ChromeLayout {
    pub(crate) fn handles(&self) -> impl Iterator<Item = &Handle> {
        self.start.iter().chain(self.end.iter())
    }

    /// What is at `point`: a handle first (its target square may overlap the menu's margin), then a menu segment.
    pub(crate) fn hit(&self, point: Vec2) -> Option<ChromeHit> {
        if let Some(handle) = self
            .handles()
            .find(|handle| handle.target().contains(point))
        {
            return Some(ChromeHit::Handle(handle.end));
        }
        self.menu
            .as_ref()
            .and_then(|menu| menu.action_at(point))
            .map(ChromeHit::Menu)
    }

    pub(crate) fn handle(&self, end: HandleEnd) -> Option<&Handle> {
        match end {
            HandleEnd::Start => self.start.as_ref(),
            HandleEnd::End => self.end.as_ref(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ROOT: Area = Area::new(0.0, 0.0, 400.0, 800.0);

    fn at(x: f32, y: f32) -> Vec2 {
        Vec2::new(x, y)
    }

    fn edge(x: f32, top: f32) -> Edge {
        Edge {
            x,
            top,
            bottom: top + 20.0,
        }
    }

    fn labels(actions: &[MenuAction]) -> Vec<(MenuAction, f32)> {
        actions.iter().map(|action| (*action, 40.0)).collect()
    }

    #[test]
    fn a_hold_is_due_after_the_long_press_time_and_not_before() {
        let hold = Hold::new(2, at(100.0, 100.0), 1000.0);
        assert!(!hold.is_due(1000.0 + TOUCH_SELECT_HOLD_MS - 1.0));
        assert!(hold.is_due(1000.0 + TOUCH_SELECT_HOLD_MS));
        assert_eq!(hold.deadline_ms(), 1000.0 + TOUCH_SELECT_HOLD_MS);
    }

    #[test]
    fn a_hold_is_broken_only_by_leaving_the_slop() {
        let hold = Hold::new(2, at(100.0, 100.0), 0.0);
        assert!(!hold.is_broken_by(at(100.0 + TOUCH_SLOP_PX, 100.0)));
        assert!(hold.is_broken_by(at(100.0 + TOUCH_SLOP_PX + 1.0, 100.0)));
        // The slop is round, as the pan's is: a diagonal of the slop on each axis is out.
        assert!(hold.is_broken_by(at(106.0, 106.0)));
    }

    #[test]
    fn the_start_handle_hangs_above_its_line_and_the_end_handle_below() {
        let start = Handle {
            end: HandleEnd::Start,
            edge: edge(50.0, 100.0),
        };
        let end = Handle {
            end: HandleEnd::End,
            edge: edge(150.0, 100.0),
        };
        assert_eq!(start.ball_centre(), at(50.0, 100.0 - HANDLE_BALL_RADIUS_PX));
        assert_eq!(end.ball_centre(), at(150.0, 120.0 + HANDLE_BALL_RADIUS_PX));
        assert_eq!(start.stem().width, HANDLE_STEM_WIDTH_PX);
        assert_eq!(start.stem().height, 20.0);
    }

    #[test]
    fn a_handle_is_grabbed_by_a_target_around_its_ball() {
        let end = Handle {
            end: HandleEnd::End,
            edge: edge(150.0, 100.0),
        };
        let ball = end.ball_centre();
        let half = HANDLE_TOUCH_TARGET_PX / 2.0;
        assert!(end.target().contains(ball));
        assert!(end.target().contains(at(ball.x - half, ball.y - half)));
        assert!(!end.target().contains(at(ball.x + half, ball.y)));
        assert!(!end.target().contains(at(ball.x, ball.y - half - 1.0)));
    }

    #[test]
    fn a_dragged_handle_keeps_its_distance_from_the_finger() {
        let end = Handle {
            end: HandleEnd::End,
            edge: edge(150.0, 100.0),
        };
        // The finger went down 14 below and 3 right of the middle of the stem.
        let grab = grab_offset(&end, at(153.0, 124.0));
        assert_eq!(grab, at(-3.0, -14.0));
        assert_eq!(
            dragged_point(at(153.0, 124.0), grab),
            end.edge.middle(),
            "no jump when the finger has not moved"
        );
        assert_eq!(
            dragged_point(at(200.0, 150.0), grab),
            at(197.0, 136.0),
            "and it follows the finger"
        );
    }

    #[test]
    fn a_read_only_selection_offers_copy_and_select_all_and_an_editable_one_cut_and_paste_too() {
        let selected = MenuContext {
            editable: false,
            copyable: true,
            has_selection: true,
            all_selected: false,
        };
        assert_eq!(
            menu_actions(selected),
            [MenuAction::Copy, MenuAction::SelectAll]
        );
        assert_eq!(
            menu_actions(MenuContext {
                editable: true,
                ..selected
            }),
            [
                MenuAction::Cut,
                MenuAction::Copy,
                MenuAction::Paste,
                MenuAction::SelectAll
            ]
        );
    }

    #[test]
    fn the_menu_leaves_out_what_the_selection_does_not_allow() {
        let editable = MenuContext {
            editable: true,
            copyable: true,
            has_selection: true,
            all_selected: false,
        };
        // Everything selected: no Select All.
        assert_eq!(
            menu_actions(MenuContext {
                all_selected: true,
                ..editable
            }),
            [MenuAction::Cut, MenuAction::Copy, MenuAction::Paste]
        );
        // A secure input's text may not be copied or cut.
        assert_eq!(
            menu_actions(MenuContext {
                copyable: false,
                ..editable
            }),
            [MenuAction::Paste, MenuAction::SelectAll]
        );
        // A caret only: nothing to cut or copy.
        assert_eq!(
            menu_actions(MenuContext {
                has_selection: false,
                ..editable
            }),
            [MenuAction::Paste, MenuAction::SelectAll]
        );
        // Nothing to offer: read-only, a caret, everything selected.
        assert!(
            menu_actions(MenuContext {
                editable: false,
                copyable: true,
                has_selection: false,
                all_selected: true,
            })
            .is_empty()
        );
    }

    #[test]
    fn the_menu_sits_above_the_start_handle_centred_on_the_selection() {
        let menu = layout_menu(
            &labels(&[MenuAction::Copy, MenuAction::SelectAll]),
            &[edge(100.0, 300.0), edge(200.0, 300.0)],
            ROOT,
        )
        .expect("a menu");
        let width = 2.0 * (40.0 + 2.0 * MENU_ITEM_PADDING_PX);
        assert_eq!(menu.area.width, width);
        assert_eq!(menu.area.x, 150.0 - width / 2.0, "centred on the ends");
        assert_eq!(
            menu.area.y,
            300.0 - 2.0 * HANDLE_BALL_RADIUS_PX - MENU_GAP_PX - MENU_HEIGHT_PX,
            "clear of the start handle's ball"
        );
        // Its segments tile it, in order.
        assert_eq!(menu.items[0].1.x, menu.area.x);
        assert_eq!(menu.items[1].1.x, menu.area.x + menu.items[0].1.width);
        assert_eq!(
            menu.action_at(at(menu.area.x + 1.0, menu.area.y + 1.0)),
            Some(MenuAction::Copy)
        );
        assert_eq!(
            menu.action_at(at(menu.area.x + width - 1.0, menu.area.y + 1.0)),
            Some(MenuAction::SelectAll)
        );
        assert_eq!(
            menu.action_at(at(menu.area.x - 1.0, menu.area.y + 1.0)),
            None
        );
    }

    #[test]
    fn the_menu_goes_below_the_end_handle_when_there_is_no_room_above() {
        let menu = layout_menu(
            &labels(&[MenuAction::Copy]),
            &[edge(100.0, 10.0), edge(200.0, 10.0)],
            ROOT,
        )
        .expect("a menu");
        assert_eq!(
            menu.area.y,
            30.0 + 2.0 * HANDLE_BALL_RADIUS_PX + MENU_GAP_PX,
            "below the end handle's ball"
        );
    }

    #[test]
    fn the_menu_stays_inside_the_root_with_a_margin() {
        let near_left = layout_menu(
            &labels(&[MenuAction::Copy, MenuAction::SelectAll]),
            &[edge(5.0, 300.0)],
            ROOT,
        )
        .expect("a menu");
        assert_eq!(near_left.area.x, MENU_EDGE_MARGIN_PX);
        let near_right = layout_menu(
            &labels(&[MenuAction::Copy, MenuAction::SelectAll]),
            &[edge(398.0, 300.0)],
            ROOT,
        )
        .expect("a menu");
        assert_eq!(
            near_right.area.x + near_right.area.width,
            ROOT.width - MENU_EDGE_MARGIN_PX
        );
    }

    #[test]
    fn a_selection_as_tall_as_the_root_gets_the_menu_over_it_at_the_top() {
        let tall = Edge {
            x: 100.0,
            top: 5.0,
            bottom: 795.0,
        };
        let menu = layout_menu(&labels(&[MenuAction::Copy]), &[tall], ROOT).expect("a menu");
        assert_eq!(menu.area.y, MENU_EDGE_MARGIN_PX);
    }

    #[test]
    fn nothing_offered_or_nothing_visible_is_no_menu() {
        assert_eq!(layout_menu(&[], &[edge(100.0, 300.0)], ROOT), None);
        assert_eq!(layout_menu(&labels(&[MenuAction::Copy]), &[], ROOT), None);
    }

    #[test]
    fn a_press_finds_a_handle_before_the_menu_and_the_menu_before_nothing() {
        let start = Handle {
            end: HandleEnd::Start,
            edge: edge(100.0, 300.0),
        };
        let end = Handle {
            end: HandleEnd::End,
            edge: edge(200.0, 300.0),
        };
        let menu = layout_menu(
            &labels(&[MenuAction::Copy, MenuAction::SelectAll]),
            &[start.edge, end.edge],
            ROOT,
        )
        .expect("a menu");
        let copy_centre = menu.items[0].1.centre();
        let layout = ChromeLayout {
            start: Some(start),
            end: Some(end),
            menu: Some(menu),
        };
        assert_eq!(
            layout.hit(end.ball_centre()),
            Some(ChromeHit::Handle(HandleEnd::End))
        );
        assert_eq!(
            layout.hit(start.ball_centre()),
            Some(ChromeHit::Handle(HandleEnd::Start))
        );
        assert_eq!(
            layout.hit(copy_centre),
            Some(ChromeHit::Menu(MenuAction::Copy))
        );
        assert_eq!(layout.hit(at(5.0, 5.0)), None);
        assert_eq!(layout.handle(HandleEnd::End), Some(&end));
    }
}
