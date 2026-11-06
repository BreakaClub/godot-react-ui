//! The accessibility tree as data: which mounted elements are exposed, with what role, name, state
//! and bounds, and the registry that keeps Godot's accessibility elements in step with it (plan
//! section 3.21, Appendix D).
//!
//! Nothing here touches Godot. [`walk`] reads a [`AxSource`] (the mounted tree) and lists the
//! exposed elements in document order, each under its nearest exposed ancestor. [`props_of`] says
//! everything one of them tells an assistive technology. [`Registry`] mirrors the elements that
//! exist and, given an [`ElementServer`] (Godot's `AccessibilityServer`), frees the ones the tree no
//! longer wants ([`Registry::prune`]) and creates the missing ones in place ([`Registry::grow`]).
//!
//! Two properties of `AccessibilityServer` shape the split, both read from
//! `drivers/accesskit/accessibility_server_accesskit.cpp`:
//!
//! * `free_element` is refused inside `NOTIFICATION_ACCESSIBILITY_UPDATE` (`in_accessibility_update`),
//!   while `create_sub_element` is allowed there. So the registry is pruned outside an update (after a
//!   commit) and grown inside one.
//! * Any `update_set_*` call on an element whose node was already sent starts a fresh node that has
//!   only a role and a name, so an element is either set completely or not touched in an update.
//!   [`Registry::needs_apply`] says which, by comparing against what was last applied.

use std::collections::HashMap;

use crate::diff::diff_children;
use crate::props::{CheckedSpec, Kind, LiveSpec, OrientationSpec, PropsSpec, RoleSpec};

/// The `AccessibilityServer` roles this crate creates, named as the server names them.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum AxRole {
    Button,
    CheckBox,
    /// The server's name for a switch.
    CheckButton,
    RadioButton,
    Container,
    Slider,
    ProgressIndicator,
    StaticText,
    Link,
    List,
    ListItem,
    ListBox,
    ListBoxOption,
    Menu,
    MenuItem,
    MenuItemCheckBox,
    MenuItemRadio,
    TabBar,
    Tab,
    TabPanel,
    Dialog,
    Image,
    Region,
    Tooltip,
    /// A scroll container with no `role` of its own (Godot's `ScrollContainer`).
    ScrollView,
    /// A single-line `TextInput` (Godot's `LineEdit`).
    TextField,
    /// A `TextInput` with `multiline` (Godot's `TextEdit`).
    MultilineTextField,
}

/// What an element's children are to the accessibility tree.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Content {
    /// The children are exposed in their own right, under this element.
    Expose,
    /// The children are presentational and the element is named from their text (ARIA "name from
    /// content" together with "children presentational"): a button's label is its name, and the
    /// `Text` inside it is not a second element.
    Fold,
    /// The children are presentational and add nothing to the name: a slider, a progress bar, an image.
    Opaque,
}

/// What a role makes of an element.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Resolved {
    pub(crate) role: AxRole,
    /// The element opens a list popup (`combobox`, as Godot's `OptionButton` does).
    pub(crate) popup_list: bool,
    /// A checkbox, switch, radio or menu item check box or radio: it reports a checked state.
    pub(crate) toggle: bool,
    /// The element activates: it offers the `click` action.
    pub(crate) activates: bool,
    /// The role has a numeric value in a range.
    pub(crate) ranged: bool,
    /// A `TextInput`: it has text, a selection and edit actions.
    pub(crate) text_field: bool,
    content: Content,
}

impl Resolved {
    const fn new(role: AxRole, content: Content) -> Self {
        Self {
            role,
            popup_list: false,
            toggle: false,
            activates: false,
            ranged: false,
            text_field: false,
            content,
        }
    }

    const fn editable_text(multiline: bool) -> Self {
        let role = if multiline {
            AxRole::MultilineTextField
        } else {
            AxRole::TextField
        };
        let mut resolved = Self::new(role, Content::Opaque);
        resolved.text_field = true;
        resolved
    }

    const fn activating(mut self) -> Self {
        self.activates = true;
        self
    }

    const fn toggling(mut self) -> Self {
        self.toggle = true;
        self.activates = true;
        self
    }
}

/// The role of an element: its explicit `role`, else the implicit one of its kind. `None` means the
/// element is not exposed itself (its children attach to the nearest exposed ancestor).
///
/// A `TextInput` is a text field whatever its `role` says (as an HTML `<input>` is), unless the role
/// takes it out of the tree (`none`, `presentation`). A `View` with `role="textbox"` is still not
/// exposed: it has no text, selection or editing for an assistive technology to use, and exposing it
/// would claim a field the user cannot read or edit.
pub(crate) fn resolve_role(kind: Kind, props: &PropsSpec) -> Option<Resolved> {
    if kind == Kind::TextInput {
        return match props.role {
            Some(RoleSpec::None | RoleSpec::Presentation) => None,
            _ => Some(Resolved::editable_text(props.is_multiline())),
        };
    }
    let Some(role) = props.role else {
        return match kind {
            Kind::Button => Some(Resolved::new(AxRole::Button, Content::Fold).activating()),
            Kind::Text if props.exposure().has_text => {
                Some(Resolved::new(AxRole::StaticText, Content::Fold))
            }
            Kind::Text | Kind::View | Kind::TextInput => None,
        };
    };
    Some(match role {
        RoleSpec::None | RoleSpec::Presentation | RoleSpec::TextBox => return None,
        RoleSpec::Button => Resolved::new(AxRole::Button, Content::Fold).activating(),
        RoleSpec::Checkbox => Resolved::new(AxRole::CheckBox, Content::Fold).toggling(),
        RoleSpec::Switch => Resolved::new(AxRole::CheckButton, Content::Fold).toggling(),
        RoleSpec::Radio => Resolved::new(AxRole::RadioButton, Content::Fold).toggling(),
        RoleSpec::RadioGroup | RoleSpec::Group => Resolved::new(AxRole::Container, Content::Expose),
        RoleSpec::Slider => Resolved {
            ranged: true,
            ..Resolved::new(AxRole::Slider, Content::Opaque)
        },
        RoleSpec::ProgressBar => Resolved {
            ranged: true,
            ..Resolved::new(AxRole::ProgressIndicator, Content::Opaque)
        },
        RoleSpec::Text => Resolved::new(AxRole::StaticText, Content::Fold),
        RoleSpec::Link => Resolved::new(AxRole::Link, Content::Fold).activating(),
        RoleSpec::List => Resolved::new(AxRole::List, Content::Expose),
        RoleSpec::ListItem => Resolved::new(AxRole::ListItem, Content::Expose),
        RoleSpec::ListBox => Resolved::new(AxRole::ListBox, Content::Expose),
        RoleSpec::Option => Resolved::new(AxRole::ListBoxOption, Content::Fold).activating(),
        // Godot's `OptionButton`: a button that opens a list.
        RoleSpec::ComboBox => Resolved {
            popup_list: true,
            ..Resolved::new(AxRole::Button, Content::Fold).activating()
        },
        RoleSpec::Menu => Resolved::new(AxRole::Menu, Content::Expose),
        RoleSpec::MenuItem => Resolved::new(AxRole::MenuItem, Content::Fold).activating(),
        RoleSpec::MenuItemCheckbox => {
            Resolved::new(AxRole::MenuItemCheckBox, Content::Fold).toggling()
        }
        RoleSpec::MenuItemRadio => Resolved::new(AxRole::MenuItemRadio, Content::Fold).toggling(),
        RoleSpec::TabList => Resolved::new(AxRole::TabBar, Content::Expose),
        RoleSpec::Tab => Resolved::new(AxRole::Tab, Content::Fold).activating(),
        RoleSpec::TabPanel => Resolved::new(AxRole::TabPanel, Content::Expose),
        RoleSpec::Dialog => Resolved::new(AxRole::Dialog, Content::Expose),
        RoleSpec::Img => Resolved::new(AxRole::Image, Content::Opaque),
        RoleSpec::Region => Resolved::new(AxRole::Region, Content::Expose),
        RoleSpec::Tooltip => Resolved::new(AxRole::Tooltip, Content::Expose),
    })
}

/// A scroll container with something to scroll, role aside: the roles `resolve_role` leaves unexposed
/// (an unroled `View`) become scroll views, and the position and range of each axis that can move go
/// to the platform with the scroll actions.
fn scroll_view_role(node: &AxNode<'_>) -> Option<Resolved> {
    (node.props.role.is_none() && node.kind == Kind::View && node.scroll.is_some())
        .then(|| Resolved::new(AxRole::ScrollView, Content::Expose))
}

/// One axis of a scroll container that has something to scroll: where it is and where it can go. A
/// reversed axis (`column-reverse`, `row-reverse`) has a negative `min` and a `max` of zero, as
/// `scrollTop` does in the DOM.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct AxScrollAxis {
    pub(crate) position: f64,
    pub(crate) min: f64,
    pub(crate) max: f64,
}

/// A scroll container's scroll position and range. An axis that cannot move (its content fits, or it
/// is not a scrolling axis) is `None`, so what is reported is what an assistive technology can do.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct AxScroll {
    pub(crate) x: Option<AxScrollAxis>,
    pub(crate) y: Option<AxScrollAxis>,
}

/// A mounted element as the accessibility tree reads it.
pub(crate) struct AxNode<'a> {
    pub(crate) kind: Kind,
    pub(crate) props: &'a PropsSpec,
    pub(crate) children: &'a [u32],
    /// The border box's root-local position and size. Out-of-flow elements (`absolute`, `fixed`) are
    /// located in their paint parent's frame, not their tree parent's, so the source resolves this
    /// through the paint tree (`stacking::absolute_geometry`) instead of the walk adding up parents.
    pub(crate) x: f32,
    pub(crate) y: f32,
    pub(crate) width: f32,
    pub(crate) height: f32,
    /// `display: none`, or `hidden` (Suspense): no box, nothing to read.
    pub(crate) display_none: bool,
    pub(crate) clips_children: bool,
    /// `Some` for a scroll container (`overflow` is `scroll` or `auto` on an axis), whether or not it
    /// has anything to scroll right now.
    pub(crate) scroll: Option<AxScroll>,
    /// Some scroll container around the element, in the paint tree, has something to scroll: the
    /// element can be asked to scroll itself into view.
    pub(crate) in_scrollable: bool,
    /// `Some` for a `TextInput`.
    pub(crate) text_field: Option<AxTextField>,
}

/// What an assistive technology reads in a text field, from the edit buffer.
#[derive(Clone, Debug, Default, PartialEq)]
pub(crate) struct AxTextField {
    pub(crate) multiline: bool,
    /// The `readOnly` prop: the text can be read and selected, not edited.
    pub(crate) read_only: bool,
    /// The text drawn: the value with the IME's preedit spliced in, a bullet for each character of a
    /// secure input's value (what `LineEdit` shapes, and so what its text elements read).
    pub(crate) text: String,
    /// The input is showing its placeholder: it has no text and no preedit.
    pub(crate) placeholder_shown: bool,
    /// The anchor and the focus of the selection (the caret when they are equal), in code points of
    /// `text`: the unit `AccessibilityServer::update_set_text_selection` counts characters in. While
    /// an IME composes the selection is collapsed after the preedit's conversion start.
    pub(crate) selection: (usize, usize),
    /// How far the text is scrolled, which places its lines.
    pub(crate) scroll: (f32, f32),
}

/// The line of a text field that holds `offset`, for `update_set_text_selection`, which wants the
/// element of the line the character is on. `lines` are the lines' code point ranges in text order.
/// A line owns its start and not its end (the end is the next line's start, where a caret stands at
/// the start of the next line), and the last line owns the end of the text too.
pub(crate) fn line_for_offset(lines: &[std::ops::Range<usize>], offset: usize) -> Option<usize> {
    lines
        .iter()
        .position(|range| range.start <= offset && offset < range.end)
        .or_else(|| lines.len().checked_sub(1))
}

/// The mounted tree, as far as the accessibility tree needs it.
pub(crate) trait AxSource {
    /// The top-level elements of every layer, main layer first (the overlay draws above it).
    fn roots(&self) -> Vec<u32>;
    fn node(&self, tag: u32) -> Option<AxNode<'_>>;
}

/// One exposed element, without the strings: enough to place it in the tree and to compute
/// [`props_of`] later.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct AxEntry {
    pub(crate) tag: u32,
    /// The nearest exposed ancestor; `None` hangs the element on the root's own element.
    pub(crate) parent: Option<u32>,
    pub(crate) resolved: Resolved,
    /// The element or an ancestor is disabled (`disabled` or `aria-disabled`).
    disabled: bool,
    /// The element or an ancestor has the `disabled` prop, which also keeps it from taking focus.
    real_disabled: bool,
}

/// Every exposed element in document order. A hidden (`aria-hidden`) or `display: none` element
/// takes its whole subtree out; a `role="none"`, `presentation` or unroled `View` is skipped and its
/// children attach to the nearest exposed ancestor; an element whose children are presentational
/// ([`Content::Fold`], [`Content::Opaque`]) exposes none of them.
pub(crate) fn walk(source: &impl AxSource) -> Vec<AxEntry> {
    let mut entries = Vec::new();
    for tag in source.roots() {
        visit(source, tag, None, false, false, &mut entries);
    }
    entries
}

fn visit(
    source: &impl AxSource,
    tag: u32,
    parent: Option<u32>,
    parent_disabled: bool,
    parent_real_disabled: bool,
    entries: &mut Vec<AxEntry>,
) {
    let Some(node) = source.node(tag) else {
        return;
    };
    if node.display_none || node.props.aria_hidden == Some(true) {
        return;
    }
    let real_disabled = parent_real_disabled || node.props.is_disabled();
    let disabled = parent_disabled || real_disabled || node.props.aria_disabled == Some(true);
    let resolved = resolve_role(node.kind, node.props).or_else(|| scroll_view_role(&node));
    let child_parent = if let Some(resolved) = resolved {
        entries.push(AxEntry {
            tag,
            parent,
            resolved,
            disabled,
            real_disabled,
        });
        if resolved.content != Content::Expose {
            return;
        }
        Some(tag)
    } else {
        parent
    };
    for child in node.children {
        visit(
            source,
            *child,
            child_parent,
            disabled,
            real_disabled,
            entries,
        );
    }
}

/// A root-local rectangle.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct AxBounds {
    pub(crate) x: f32,
    pub(crate) y: f32,
    pub(crate) width: f32,
    pub(crate) height: f32,
}

/// A numeric range: `now` is absent for an indeterminate progress bar.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct AxRange {
    pub(crate) now: Option<f64>,
    pub(crate) min: f64,
    pub(crate) max: f64,
}

/// The `aria-valuemin` and `aria-valuemax` defaults of `slider` and `progressbar` (WAI-ARIA 1.2).
const DEFAULT_RANGE_MIN: f64 = 0.0;
const DEFAULT_RANGE_MAX: f64 = 100.0;

/// What the element can be asked to do. Native performs `click`, `focus` and `blur` itself (as the
/// keyboard and `focus()` do); `adjust` is `increment`, `decrement` and `set value`, which JS answers.
/// Scrolling is native too, as the wheel and `scrollBy` are: `scroll_y` is scroll up and down, `scroll_x`
/// left and right (each with `set scroll offset`), and `scroll_into_view` is on the contents of a
/// scroll container.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(crate) struct AxActions {
    pub(crate) click: bool,
    pub(crate) focus: bool,
    pub(crate) adjust: bool,
    /// A text field's `set text selection`, offered unless it is disabled.
    pub(crate) set_selection: bool,
    /// A text field's `replace selected text` and `set value`: offered unless it is disabled or `readOnly`.
    pub(crate) edit: bool,
    pub(crate) scroll_x: bool,
    pub(crate) scroll_y: bool,
    pub(crate) scroll_into_view: bool,
}

/// Everything the accessibility tree says about one element. Equal values need no update.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct AxProps {
    pub(crate) role: AxRole,
    pub(crate) popup_list: bool,
    pub(crate) name: String,
    pub(crate) description: String,
    /// Static text's content, or a ranged element's `aria-valuetext`.
    pub(crate) value: String,
    pub(crate) placeholder: String,
    pub(crate) bounds: AxBounds,
    pub(crate) disabled: bool,
    pub(crate) read_only: bool,
    pub(crate) required: bool,
    pub(crate) modal: bool,
    pub(crate) clips_children: bool,
    /// A toggle's state. The server's checked state is a boolean, so `mixed` is reported as unchecked
    /// together with the state description "mixed" ([`MIXED_DESCRIPTION`]).
    pub(crate) checked: Option<bool>,
    pub(crate) mixed: bool,
    pub(crate) selected: Option<bool>,
    pub(crate) expanded: Option<bool>,
    pub(crate) range: Option<AxRange>,
    pub(crate) live: Option<LiveSpec>,
    /// `Some(true)` is vertical.
    pub(crate) vertical: Option<bool>,
    /// A scroll container's position and range, whatever its role.
    pub(crate) scroll: Option<AxScroll>,
    /// A text field's text and selection.
    pub(crate) text_field: Option<AxTextField>,
    pub(crate) actions: AxActions,
}

/// The state description of a checkbox that is neither checked nor unchecked. `AccessibilityServer`
/// reports a checked state as a boolean (`update_set_checked(id, bool)`), so the third state travels
/// as text.
pub(crate) const MIXED_DESCRIPTION: &str = "mixed";

/// The text an element contributes to the name of the element that folds it in: its `aria-label` if
/// it has one, else its own text, else what its children contribute. Hidden subtrees add nothing.
fn collect_text(source: &impl AxSource, tag: u32, parts: &mut Vec<String>) {
    let Some(node) = source.node(tag) else {
        return;
    };
    if node.display_none || node.props.aria_hidden == Some(true) {
        return;
    }
    if let Some(label) = node
        .props
        .aria_label
        .as_deref()
        .filter(|label| !label.is_empty())
    {
        parts.push(label.to_string());
        return;
    }
    if node.kind == Kind::Text {
        if let Some(text) = node.props.text.as_deref().filter(|text| !text.is_empty()) {
            parts.push(text.to_string());
        }
        return;
    }
    for child in node.children {
        collect_text(source, *child, parts);
    }
}

fn text_of_children(source: &impl AxSource, node: &AxNode<'_>) -> String {
    let mut parts = Vec::new();
    for child in node.children {
        collect_text(source, *child, &mut parts);
    }
    parts.join(" ")
}

/// Everything the accessibility tree says about `entry`, read from `source` as it is now.
pub(crate) fn props_of(source: &impl AxSource, entry: &AxEntry) -> AxProps {
    let node = source
        .node(entry.tag)
        .expect("an entry names a node of the source it was walked from");
    let props = node.props;
    let resolved = entry.resolved;
    let label = props.aria_label.clone().unwrap_or_default();
    let (name, mut value) = match (resolved.role, resolved.content) {
        // Static text's content is its value, as Godot's `Label` reports it.
        (AxRole::StaticText, _) if node.kind == Kind::Text => {
            (label, props.text.clone().unwrap_or_default())
        }
        (AxRole::StaticText, _) => (label, text_of_children(source, &node)),
        (_, Content::Fold) if label.is_empty() => (text_of_children(source, &node), String::new()),
        _ => (label, String::new()),
    };
    if resolved.role != AxRole::StaticText {
        value = props.aria_value_text.clone().unwrap_or_default();
    }
    let mut name = name;
    let mut placeholder = props.aria_placeholder.clone().unwrap_or_default();
    if let Some(field) = node.text_field.as_ref().filter(|_| resolved.text_field) {
        // The text is in the field's text elements, not in a value. A field with no name is named by
        // its placeholder, as `LineEdit` does (`_get_accessibility_name`).
        value = String::new();
        let shown = props.placeholder.clone().unwrap_or_default();
        if name.is_empty() {
            name = shown.clone();
        }
        if !field.placeholder_shown {
            placeholder = String::new();
        } else if placeholder.is_empty() {
            placeholder = shown;
        }
    }
    let range = resolved.ranged.then(|| AxRange {
        now: props.aria_value_now,
        min: props.aria_value_min.unwrap_or(DEFAULT_RANGE_MIN),
        max: props.aria_value_max.unwrap_or(DEFAULT_RANGE_MAX),
    });
    let checked = props.aria_checked;
    AxProps {
        role: resolved.role,
        popup_list: resolved.popup_list,
        name,
        description: props.aria_description.clone().unwrap_or_default(),
        value,
        placeholder,
        bounds: AxBounds {
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
        },
        disabled: entry.disabled,
        read_only: props.aria_read_only == Some(true)
            || node
                .text_field
                .as_ref()
                .is_some_and(|field| field.read_only),
        required: props.aria_required == Some(true),
        modal: props.aria_modal == Some(true),
        clips_children: node.clips_children,
        checked: resolved
            .toggle
            .then(|| checked == Some(CheckedSpec::Checked)),
        mixed: resolved.toggle && checked == Some(CheckedSpec::Mixed),
        selected: props.aria_selected,
        expanded: props.aria_expanded,
        range,
        live: props.aria_live,
        vertical: props
            .aria_orientation
            .map(|orientation| orientation == OrientationSpec::Vertical),
        scroll: node.scroll,
        text_field: node.text_field.clone().filter(|_| resolved.text_field),
        actions: AxActions {
            click: resolved.activates && !entry.disabled,
            focus: (matches!(node.kind, Kind::Button | Kind::TextInput)
                || props.tab_index.is_some())
                && !entry.real_disabled,
            adjust: resolved.ranged && resolved.role == AxRole::Slider && !entry.disabled,
            set_selection: resolved.text_field && !entry.disabled,
            edit: resolved.text_field
                && !entry.disabled
                && node
                    .text_field
                    .as_ref()
                    .is_some_and(|field| !field.read_only),
            scroll_x: node.scroll.is_some_and(|scroll| scroll.x.is_some()),
            scroll_y: node.scroll.is_some_and(|scroll| scroll.y.is_some()),
            scroll_into_view: node.in_scrollable,
        },
    }
}

/// What assistive technologies can ask an element to do, as the callable bound to an action says it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum AxAction {
    Click,
    Focus,
    Blur,
    Increment,
    Decrement,
    SetValue,
    ScrollUp,
    ScrollDown,
    ScrollLeft,
    ScrollRight,
    SetScrollOffset,
    ScrollIntoView,
    /// A text field's selection: the data is `{start_char, end_char}`.
    SetTextSelection,
    /// A text field's selected text replaced by the data, a string.
    ReplaceSelectedText,
}

impl AxAction {
    const CLICK: i64 = 0;
    const FOCUS: i64 = 1;
    const BLUR: i64 = 2;
    const INCREMENT: i64 = 3;
    const DECREMENT: i64 = 4;
    const SET_VALUE: i64 = 5;
    const SCROLL_UP: i64 = 6;
    const SCROLL_DOWN: i64 = 7;
    const SCROLL_LEFT: i64 = 8;
    const SCROLL_RIGHT: i64 = 9;
    const SET_SCROLL_OFFSET: i64 = 10;
    const SCROLL_INTO_VIEW: i64 = 11;
    const SET_TEXT_SELECTION: i64 = 12;
    const REPLACE_SELECTED_TEXT: i64 = 13;

    /// The number bound into the action's callable.
    pub(crate) fn code(self) -> i64 {
        match self {
            AxAction::Click => Self::CLICK,
            AxAction::Focus => Self::FOCUS,
            AxAction::Blur => Self::BLUR,
            AxAction::Increment => Self::INCREMENT,
            AxAction::Decrement => Self::DECREMENT,
            AxAction::SetValue => Self::SET_VALUE,
            AxAction::ScrollUp => Self::SCROLL_UP,
            AxAction::ScrollDown => Self::SCROLL_DOWN,
            AxAction::ScrollLeft => Self::SCROLL_LEFT,
            AxAction::ScrollRight => Self::SCROLL_RIGHT,
            AxAction::SetScrollOffset => Self::SET_SCROLL_OFFSET,
            AxAction::ScrollIntoView => Self::SCROLL_INTO_VIEW,
            AxAction::SetTextSelection => Self::SET_TEXT_SELECTION,
            AxAction::ReplaceSelectedText => Self::REPLACE_SELECTED_TEXT,
        }
    }

    pub(crate) fn from_code(code: i64) -> Option<Self> {
        match code {
            Self::CLICK => Some(AxAction::Click),
            Self::FOCUS => Some(AxAction::Focus),
            Self::BLUR => Some(AxAction::Blur),
            Self::INCREMENT => Some(AxAction::Increment),
            Self::DECREMENT => Some(AxAction::Decrement),
            Self::SET_VALUE => Some(AxAction::SetValue),
            Self::SCROLL_UP => Some(AxAction::ScrollUp),
            Self::SCROLL_DOWN => Some(AxAction::ScrollDown),
            Self::SCROLL_LEFT => Some(AxAction::ScrollLeft),
            Self::SCROLL_RIGHT => Some(AxAction::ScrollRight),
            Self::SET_SCROLL_OFFSET => Some(AxAction::SetScrollOffset),
            Self::SCROLL_INTO_VIEW => Some(AxAction::ScrollIntoView),
            Self::SET_TEXT_SELECTION => Some(AxAction::SetTextSelection),
            Self::REPLACE_SELECTED_TEXT => Some(AxAction::ReplaceSelectedText),
            _ => None,
        }
    }
}

/// The elements wanted, in document order, and who is whose child.
pub(crate) struct Desired {
    entries: Vec<AxEntry>,
    children: HashMap<Option<u32>, Vec<u32>>,
    /// Each tag's position in `entries`.
    index: HashMap<u32, usize>,
}

impl Desired {
    pub(crate) fn new(entries: Vec<AxEntry>) -> Self {
        let mut children: HashMap<Option<u32>, Vec<u32>> = HashMap::new();
        let mut index = HashMap::with_capacity(entries.len());
        for (position, entry) in entries.iter().enumerate() {
            children.entry(entry.parent).or_default().push(entry.tag);
            index.insert(entry.tag, position);
        }
        Self {
            entries,
            children,
            index,
        }
    }

    pub(crate) fn entries(&self) -> &[AxEntry] {
        &self.entries
    }

    fn entry(&self, tag: u32) -> Option<&AxEntry> {
        self.index
            .get(&tag)
            .map(|position| &self.entries[*position])
    }

    fn children_of(&self, parent: Option<u32>) -> &[u32] {
        self.children.get(&parent).map_or(&[], Vec::as_slice)
    }
}

/// Godot's `AccessibilityServer`, as far as the registry needs it.
pub(crate) trait ElementServer {
    type Id: Copy;
    /// A new element for `role` as child number `index` of `parent` (the root's own element when
    /// `parent` is `None`).
    fn create_element(&mut self, parent: Option<Self::Id>, role: AxRole, index: usize) -> Self::Id;
    /// Free an element and, with it, every element under it. Refused inside an accessibility update.
    fn free_element(&mut self, id: Self::Id);
}

struct Slot<Id> {
    id: Id,
    parent: Option<u32>,
    children: Vec<u32>,
    /// What was last set on the element; `None` until it has been set.
    applied: Option<AxProps>,
    /// A child was added or removed since the element was last set: its node must be sent again to
    /// list the new children.
    children_changed: bool,
}

/// Which accessibility elements exist, by tag, and how they nest.
pub(crate) struct Registry<Id> {
    slots: HashMap<u32, Slot<Id>>,
    /// The elements directly under the root's own element, in order.
    roots: Vec<u32>,
    /// Something that decides what is exposed may have changed since the last [`Registry::prune`].
    structure_dirty: bool,
}

impl<Id> Default for Registry<Id> {
    fn default() -> Self {
        Self {
            slots: HashMap::new(),
            roots: Vec::new(),
            structure_dirty: false,
        }
    }
}

impl<Id: Copy> Registry<Id> {
    /// No element exists, which is the case whenever no assistive technology has asked for the tree.
    pub(crate) fn is_empty(&self) -> bool {
        self.slots.is_empty()
    }

    pub(crate) fn element(&self, tag: u32) -> Option<Id> {
        self.slots.get(&tag).map(|slot| slot.id)
    }

    /// Note that what is exposed, or where, may have changed. Free while nothing exists.
    pub(crate) fn mark_structure_dirty(&mut self) {
        if !self.slots.is_empty() {
            self.structure_dirty = true;
        }
    }

    /// Returns whether a prune is due, and clears the note.
    pub(crate) fn take_structure_dirty(&mut self) -> bool {
        std::mem::take(&mut self.structure_dirty)
    }

    /// Forget every element without freeing it: the engine freed them with their parent element
    /// (`NOTIFICATION_ACCESSIBILITY_INVALIDATE`, leaving the tree).
    pub(crate) fn forget_all(&mut self) {
        self.slots.clear();
        self.roots.clear();
        self.structure_dirty = false;
    }

    /// The elements directly under the root's own element, for freeing them with it.
    pub(crate) fn root_elements(&self) -> Vec<Id> {
        self.roots
            .iter()
            .filter_map(|tag| self.element(*tag))
            .collect()
    }

    fn children_of(&self, parent: Option<u32>) -> &[u32] {
        match parent {
            None => &self.roots,
            Some(tag) => self.slots.get(&tag).map_or(&[], |slot| &slot.children),
        }
    }

    fn children_of_mut(&mut self, parent: Option<u32>) -> Option<&mut Vec<u32>> {
        match parent {
            None => Some(&mut self.roots),
            Some(tag) => self.slots.get_mut(&tag).map(|slot| &mut slot.children),
        }
    }

    /// Free the element for `tag` and everything under it, if it exists. Outside an update only.
    pub(crate) fn remove<S: ElementServer<Id = Id>>(&mut self, server: &mut S, tag: u32) {
        let Some(slot) = self.slots.get(&tag) else {
            return;
        };
        let (id, parent) = (slot.id, slot.parent);
        if let Some(siblings) = self.children_of_mut(parent) {
            siblings.retain(|sibling| *sibling != tag);
        }
        if let Some(slot) = parent.and_then(|tag| self.slots.get_mut(&tag)) {
            slot.children_changed = true;
        }
        server.free_element(id);
        self.forget_subtree(tag);
    }

    fn forget_subtree(&mut self, tag: u32) {
        let mut stack = vec![tag];
        while let Some(tag) = stack.pop() {
            if let Some(slot) = self.slots.remove(&tag) {
                stack.extend(slot.children);
            }
        }
    }

    /// Free every element that is not where the tree wants it: gone, hidden, moved to another
    /// parent, or out of order among its siblings (the elements that can stay do, by the longest
    /// increasing subsequence). The missing ones are created by [`Registry::grow`]. Outside an
    /// update only.
    pub(crate) fn prune<S: ElementServer<Id = Id>>(&mut self, server: &mut S, desired: &Desired) {
        self.prune_children(server, None, desired);
    }

    fn prune_children<S: ElementServer<Id = Id>>(
        &mut self,
        server: &mut S,
        parent: Option<u32>,
        desired: &Desired,
    ) {
        let diff = diff_children(self.children_of(parent), desired.children_of(parent));
        for (_, tag) in diff.removes {
            self.remove(server, tag);
        }
        for tag in self.children_of(parent).to_vec() {
            self.prune_children(server, Some(tag), desired);
        }
    }

    /// Create the elements the tree wants and the registry lacks, each at its place among its
    /// siblings. Allowed inside an update. Returns the tags of elements that exist but are not where
    /// the tree wants them (or are not wanted at all): [`Registry::prune`] should have freed them,
    /// so each is a bug in whoever changed what is exposed without pruning.
    pub(crate) fn grow<S: ElementServer<Id = Id>>(
        &mut self,
        server: &mut S,
        desired: &Desired,
    ) -> Vec<u32> {
        let mut misplaced = Vec::new();
        self.grow_children(server, None, desired, &mut misplaced);
        misplaced.extend(
            self.slots
                .keys()
                .filter(|tag| !desired.index.contains_key(tag)),
        );
        misplaced.sort_unstable();
        misplaced.dedup();
        misplaced
    }

    fn grow_children<S: ElementServer<Id = Id>>(
        &mut self,
        server: &mut S,
        parent: Option<u32>,
        desired: &Desired,
        misplaced: &mut Vec<u32>,
    ) {
        let parent_id = parent.and_then(|tag| self.element(tag));
        for (index, tag) in desired.children_of(parent).iter().enumerate() {
            if self.slots.contains_key(tag) {
                if self.children_of(parent).get(index) != Some(tag) {
                    misplaced.push(*tag);
                    continue;
                }
            } else {
                let entry = desired
                    .entry(*tag)
                    .expect("a wanted child is one of the wanted entries");
                let id = server.create_element(parent_id, entry.resolved.role, index);
                if let Some(siblings) = self.children_of_mut(parent) {
                    siblings.insert(index.min(siblings.len()), *tag);
                }
                if let Some(slot) = parent.and_then(|tag| self.slots.get_mut(&tag)) {
                    slot.children_changed = true;
                }
                self.slots.insert(
                    *tag,
                    Slot {
                        id,
                        parent,
                        children: Vec::new(),
                        applied: None,
                        children_changed: false,
                    },
                );
            }
            self.grow_children(server, Some(*tag), desired, misplaced);
        }
    }

    /// Whether the element for `tag` must be set completely: it has never been, its properties
    /// differ from what was set, or its children changed.
    pub(crate) fn needs_apply(&self, tag: u32, props: &AxProps) -> bool {
        self.slots
            .get(&tag)
            .is_some_and(|slot| slot.children_changed || slot.applied.as_ref() != Some(props))
    }

    pub(crate) fn mark_applied(&mut self, tag: u32, props: AxProps) {
        if let Some(slot) = self.slots.get_mut(&tag) {
            slot.applied = Some(props);
            slot.children_changed = false;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// One mounted node as test data.
    struct TestNode {
        kind: Kind,
        props: PropsSpec,
        children: Vec<u32>,
        /// Root-local position, then size.
        rect: [f32; 4],
        display_none: bool,
        scroll: Option<AxScroll>,
        in_scrollable: bool,
        text_field: Option<AxTextField>,
    }

    /// A mounted tree as test data.
    struct Tree {
        nodes: HashMap<u32, TestNode>,
        roots: Vec<u32>,
    }

    impl Tree {
        fn new(roots: &[u32]) -> Self {
            Self {
                nodes: HashMap::new(),
                roots: roots.to_vec(),
            }
        }

        fn add(&mut self, tag: u32, kind: Kind, props: PropsSpec, children: &[u32]) -> &mut Self {
            self.nodes.insert(
                tag,
                TestNode {
                    kind,
                    props,
                    children: children.to_vec(),
                    rect: [0.0, 0.0, 10.0, 10.0],
                    display_none: false,
                    scroll: None,
                    in_scrollable: false,
                    text_field: None,
                },
            );
            self
        }

        fn place(&mut self, tag: u32, rect: [f32; 4]) -> &mut Self {
            self.nodes.get_mut(&tag).expect("placed node exists").rect = rect;
            self
        }

        /// A tree of one root node.
        fn single(kind: Kind, props: PropsSpec) -> Self {
            let mut tree = Self::new(&[1]);
            tree.add(1, kind, props, &[]);
            tree
        }
    }

    impl AxSource for Tree {
        fn roots(&self) -> Vec<u32> {
            self.roots.clone()
        }

        fn node(&self, tag: u32) -> Option<AxNode<'_>> {
            let node = self.nodes.get(&tag)?;
            Some(AxNode {
                kind: node.kind,
                props: &node.props,
                children: &node.children,
                x: node.rect[0],
                y: node.rect[1],
                width: node.rect[2],
                height: node.rect[3],
                display_none: node.display_none,
                clips_children: false,
                scroll: node.scroll,
                in_scrollable: node.in_scrollable,
                text_field: node.text_field.clone(),
            })
        }
    }

    fn props(json: &str) -> PropsSpec {
        serde_json::from_str(json).expect("test props parse")
    }

    fn text(string: &str) -> PropsSpec {
        PropsSpec {
            text: Some(string.to_string()),
            ..PropsSpec::default()
        }
    }

    fn entries(tree: &Tree) -> Vec<(u32, Option<u32>, AxRole)> {
        walk(tree)
            .iter()
            .map(|entry| (entry.tag, entry.parent, entry.resolved.role))
            .collect()
    }

    #[test]
    fn implicit_roles_are_buttons_and_text_with_content() {
        let mut tree = Tree::new(&[1]);
        tree.add(1, Kind::View, PropsSpec::default(), &[2, 3, 4])
            .add(2, Kind::Button, PropsSpec::default(), &[])
            .add(3, Kind::Text, text("Hello"), &[])
            .add(4, Kind::Text, PropsSpec::default(), &[]);
        assert_eq!(
            entries(&tree),
            vec![(2, None, AxRole::Button), (3, None, AxRole::StaticText)],
            "a bare View and an empty Text are not exposed"
        );
    }

    #[test]
    fn explicit_roles_follow_appendix_d() {
        let cases = [
            ("button", AxRole::Button),
            ("checkbox", AxRole::CheckBox),
            ("switch", AxRole::CheckButton),
            ("radio", AxRole::RadioButton),
            ("radiogroup", AxRole::Container),
            ("group", AxRole::Container),
            ("slider", AxRole::Slider),
            ("progressbar", AxRole::ProgressIndicator),
            ("text", AxRole::StaticText),
            ("link", AxRole::Link),
            ("list", AxRole::List),
            ("listitem", AxRole::ListItem),
            ("listbox", AxRole::ListBox),
            ("option", AxRole::ListBoxOption),
            ("combobox", AxRole::Button),
            ("menu", AxRole::Menu),
            ("menuitem", AxRole::MenuItem),
            ("menuitemcheckbox", AxRole::MenuItemCheckBox),
            ("menuitemradio", AxRole::MenuItemRadio),
            ("tablist", AxRole::TabBar),
            ("tab", AxRole::Tab),
            ("tabpanel", AxRole::TabPanel),
            ("dialog", AxRole::Dialog),
            ("img", AxRole::Image),
            ("region", AxRole::Region),
            ("tooltip", AxRole::Tooltip),
        ];
        for (name, expected) in cases {
            let json = format!(r#"{{"role":"{name}"}}"#);
            let resolved = resolve_role(Kind::View, &props(&json))
                .unwrap_or_else(|| panic!("role {name} is exposed"));
            assert_eq!(resolved.role, expected, "{name}");
        }
        assert!(
            resolve_role(Kind::View, &props(r#"{"role":"combobox"}"#))
                .unwrap()
                .popup_list
        );
        for name in ["none", "presentation"] {
            let json = format!(r#"{{"role":"{name}"}}"#);
            assert!(
                resolve_role(Kind::Button, &props(&json)).is_none(),
                "{name}"
            );
        }
        assert!(
            resolve_role(Kind::View, &props(r#"{"role":"textbox"}"#)).is_none(),
            "text fields wait for TextInput (I7)"
        );
    }

    #[test]
    fn role_none_passes_its_children_up_and_aria_hidden_removes_the_subtree() {
        let mut tree = Tree::new(&[1]);
        tree.add(1, Kind::View, props(r#"{"role":"group"}"#), &[2, 4])
            .add(2, Kind::View, props(r#"{"role":"none"}"#), &[3])
            .add(3, Kind::Button, PropsSpec::default(), &[])
            .add(4, Kind::View, props(r#"{"ariaHidden":true}"#), &[5])
            .add(5, Kind::Button, PropsSpec::default(), &[]);
        assert_eq!(
            entries(&tree),
            vec![(1, None, AxRole::Container), (3, Some(1), AxRole::Button)]
        );
    }

    #[test]
    fn display_none_removes_the_subtree() {
        let mut tree = Tree::new(&[1]);
        tree.add(1, Kind::View, props(r#"{"role":"group"}"#), &[2])
            .add(2, Kind::Button, PropsSpec::default(), &[]);
        tree.nodes.get_mut(&2).unwrap().display_none = true;
        assert_eq!(entries(&tree), vec![(1, None, AxRole::Container)]);
    }

    #[test]
    fn a_button_is_named_from_its_text_and_its_children_are_not_exposed() {
        let mut tree = Tree::new(&[1]);
        tree.add(1, Kind::Button, PropsSpec::default(), &[2, 3, 5])
            .add(2, Kind::View, PropsSpec::default(), &[])
            .add(3, Kind::Text, text("Save"), &[])
            .add(5, Kind::View, PropsSpec::default(), &[6, 7])
            .add(6, Kind::Text, text("changes"), &[])
            .add(
                7,
                Kind::Text,
                props(r#"{"text":"hidden","ariaHidden":true}"#),
                &[],
            );
        assert_eq!(entries(&tree), vec![(1, None, AxRole::Button)]);
        let entry = walk(&tree)[0];
        assert_eq!(props_of(&tree, &entry).name, "Save changes");
    }

    #[test]
    fn aria_label_wins_over_content_and_labels_a_group() {
        let mut tree = Tree::new(&[1, 3]);
        tree.add(
            1,
            Kind::Button,
            props(r#"{"ariaLabel":"Close dialog"}"#),
            &[2],
        )
        .add(2, Kind::Text, text("X"), &[])
        .add(
            3,
            Kind::View,
            props(r#"{"role":"radiogroup","ariaLabel":"Size"}"#),
            &[],
        );
        let walked = walk(&tree);
        assert_eq!(props_of(&tree, &walked[0]).name, "Close dialog");
        assert_eq!(props_of(&tree, &walked[1]).name, "Size");
    }

    #[test]
    fn an_inner_label_names_the_button_it_is_in() {
        let mut tree = Tree::new(&[1]);
        tree.add(1, Kind::Button, PropsSpec::default(), &[2, 3])
            .add(
                2,
                Kind::View,
                props(r#"{"role":"img","ariaLabel":"Star"}"#),
                &[4],
            )
            .add(3, Kind::Text, text("Favourite"), &[])
            .add(4, Kind::Text, text("ignored behind the label"), &[]);
        assert_eq!(props_of(&tree, &walk(&tree)[0]).name, "Star Favourite");
    }

    #[test]
    fn static_text_carries_its_content_as_a_value() {
        let mut tree = Tree::new(&[1, 2]);
        tree.add(1, Kind::Text, text("Hello"), &[])
            .add(2, Kind::View, props(r#"{"role":"text"}"#), &[3, 4])
            .add(3, Kind::Text, text("a"), &[])
            .add(4, Kind::Text, text("b"), &[]);
        let walked = walk(&tree);
        let hello = props_of(&tree, &walked[0]);
        assert_eq!((hello.name.as_str(), hello.value.as_str()), ("", "Hello"));
        let joined = props_of(&tree, &walked[1]);
        assert_eq!(joined.value, "a b");
        assert_eq!(walked.len(), 2, "role text folds its children");
    }

    #[test]
    fn toggles_report_checked_and_mixed() {
        let mut tree = Tree::new(&[1, 2, 3, 4]);
        tree.add(
            1,
            Kind::Button,
            props(r#"{"role":"checkbox","ariaChecked":true}"#),
            &[],
        )
        .add(
            2,
            Kind::Button,
            props(r#"{"role":"checkbox","ariaChecked":false}"#),
            &[],
        )
        .add(
            3,
            Kind::Button,
            props(r#"{"role":"checkbox","ariaChecked":"mixed"}"#),
            &[],
        )
        .add(4, Kind::Button, props(r#"{"role":"switch"}"#), &[]);
        let all: Vec<AxProps> = walk(&tree)
            .iter()
            .map(|entry| props_of(&tree, entry))
            .collect();
        assert_eq!((all[0].checked, all[0].mixed), (Some(true), false));
        assert_eq!((all[1].checked, all[1].mixed), (Some(false), false));
        assert_eq!((all[2].checked, all[2].mixed), (Some(false), true));
        assert_eq!(
            (all[3].checked, all[3].mixed),
            (Some(false), false),
            "absent means unchecked"
        );
        let plain = Tree::single(Kind::Button, props(r#"{"ariaChecked":true}"#));
        assert_eq!(
            props_of(&plain, &walk(&plain)[0]).checked,
            None,
            "a plain button is not a toggle"
        );
    }

    #[test]
    fn a_slider_has_a_range_a_value_text_and_the_adjust_actions() {
        let mut tree = Tree::new(&[1, 2, 3]);
        tree.add(
            1,
            Kind::View,
            props(
                r#"{"role":"slider","tabIndex":0,"ariaLabel":"Volume","ariaValueMin":10,
                "ariaValueMax":20,"ariaValueNow":14,"ariaValueText":"14 percent","ariaOrientation":"vertical"}"#,
            ),
            &[],
        )
        .add(2, Kind::View, props(r#"{"role":"progressbar"}"#), &[])
        .add(3, Kind::View, props(r#"{"role":"slider","disabled":true,"tabIndex":0}"#), &[]);
        let all: Vec<AxProps> = walk(&tree)
            .iter()
            .map(|entry| props_of(&tree, entry))
            .collect();
        assert_eq!(
            all[0].range,
            Some(AxRange {
                now: Some(14.0),
                min: 10.0,
                max: 20.0
            })
        );
        assert_eq!(all[0].value, "14 percent");
        assert_eq!(all[0].vertical, Some(true));
        assert_eq!(all[0].name, "Volume");
        assert_eq!(
            all[0].actions,
            AxActions {
                focus: true,
                adjust: true,
                ..AxActions::default()
            }
        );
        assert_eq!(
            all[1].range,
            Some(AxRange {
                now: None,
                min: 0.0,
                max: 100.0
            }),
            "an indeterminate progress bar has no value and the default range"
        );
        assert!(!all[1].actions.adjust, "a progress bar is read-only");
        assert!(all[2].disabled && !all[2].actions.adjust && !all[2].actions.focus);
    }

    #[test]
    fn actions_follow_the_role_and_the_disabled_state() {
        let mut tree = Tree::new(&[1, 3, 5]);
        tree.add(
            1,
            Kind::View,
            props(r#"{"disabled":true,"role":"group"}"#),
            &[2],
        )
        .add(2, Kind::Button, PropsSpec::default(), &[])
        .add(3, Kind::Button, PropsSpec::default(), &[])
        .add(
            5,
            Kind::View,
            props(r#"{"role":"group","ariaDisabled":true}"#),
            &[6],
        )
        .add(6, Kind::Button, PropsSpec::default(), &[]);
        let all: Vec<(u32, AxProps)> = walk(&tree)
            .iter()
            .map(|entry| (entry.tag, props_of(&tree, entry)))
            .collect();
        let by_tag = |tag: u32| {
            &all.iter()
                .find(|(candidate, _)| *candidate == tag)
                .unwrap()
                .1
        };
        assert_eq!(
            by_tag(2).actions,
            AxActions::default(),
            "inside a disabled element"
        );
        assert!(by_tag(2).disabled);
        assert_eq!(
            by_tag(3).actions,
            AxActions {
                click: true,
                focus: true,
                ..AxActions::default()
            }
        );
        assert!(!by_tag(1).actions.click, "a group is not activated");
        let aria_disabled = by_tag(6);
        assert!(aria_disabled.disabled && !aria_disabled.actions.click);
        assert!(
            aria_disabled.actions.focus,
            "aria-disabled elements stay focusable"
        );
        let focusable_view = Tree::single(Kind::View, props(r#"{"role":"group","tabIndex":-1}"#));
        assert!(
            props_of(&focusable_view, &walk(&focusable_view)[0])
                .actions
                .focus
        );
    }

    #[test]
    fn bounds_are_the_sources_root_local_rect_and_state_flags_come_through() {
        let mut tree = Tree::new(&[1]);
        tree.add(1, Kind::View, props(r#"{"role":"group"}"#), &[2])
            .add(
                2,
                Kind::View,
                props(
                    r#"{"role":"listitem","ariaSelected":false,"ariaExpanded":true,"ariaReadOnly":true,
                    "ariaRequired":true,"ariaModal":true,"ariaLive":"polite","ariaDescription":"d"}"#,
                ),
                &[],
            )
            // The source reports root-local rectangles, whatever the tree and paint parents are.
            .place(1, [100.0, 50.0, 400.0, 300.0])
            .place(2, [110.0, 70.0, 30.0, 40.0]);
        let walked = walk(&tree);
        let inner = props_of(&tree, &walked[1]);
        assert_eq!(
            inner.bounds,
            AxBounds {
                x: 110.0,
                y: 70.0,
                width: 30.0,
                height: 40.0
            }
        );
        assert_eq!(inner.selected, Some(false));
        assert_eq!(inner.expanded, Some(true));
        assert!(inner.read_only && inner.required && inner.modal);
        assert_eq!(inner.live, Some(LiveSpec::Polite));
        assert_eq!(inner.description, "d");
        assert_eq!(props_of(&tree, &walked[0]).selected, None);
    }

    #[test]
    fn actions_round_trip_through_their_codes() {
        for action in [
            AxAction::Click,
            AxAction::Focus,
            AxAction::Blur,
            AxAction::Increment,
            AxAction::Decrement,
            AxAction::SetValue,
            AxAction::ScrollUp,
            AxAction::ScrollDown,
            AxAction::ScrollLeft,
            AxAction::ScrollRight,
            AxAction::SetScrollOffset,
            AxAction::ScrollIntoView,
            AxAction::SetTextSelection,
            AxAction::ReplaceSelectedText,
        ] {
            assert_eq!(AxAction::from_code(action.code()), Some(action));
        }
        assert_eq!(AxAction::from_code(-1), None);
        assert_eq!(AxAction::from_code(14), None);
    }

    // ---- Scroll containers ------------------------------------------------------------------------

    fn axis(position: f64, min: f64, max: f64) -> Option<AxScrollAxis> {
        Some(AxScrollAxis { position, min, max })
    }

    /// A tree of a scroll container (1) holding a button (2) and a bare text row (3).
    fn scroller(scroll: AxScroll, role: &str) -> Tree {
        let mut tree = Tree::new(&[1]);
        tree.add(1, Kind::View, props(role), &[2, 3])
            .add(2, Kind::Button, PropsSpec::default(), &[])
            .add(3, Kind::Text, text("Row"), &[]);
        tree.nodes.get_mut(&1).unwrap().scroll = Some(scroll);
        for tag in [2, 3] {
            tree.nodes.get_mut(&tag).unwrap().in_scrollable =
                scroll.x.is_some() || scroll.y.is_some();
        }
        tree
    }

    fn props_at(tree: &Tree, tag: u32) -> AxProps {
        let entry = *walk(tree)
            .iter()
            .find(|entry| entry.tag == tag)
            .expect("the tag is exposed");
        props_of(tree, &entry)
    }

    #[test]
    fn an_unroled_scroll_container_is_a_scroll_view_that_exposes_its_children() {
        let tree = scroller(
            AxScroll {
                x: None,
                y: axis(0.0, 0.0, 120.0),
            },
            "{}",
        );
        assert_eq!(
            entries(&tree),
            vec![
                (1, None, AxRole::ScrollView),
                (2, Some(1), AxRole::Button),
                (3, Some(1), AxRole::StaticText),
            ],
            "the container is exposed in its own right and the rows attach to it"
        );
        // A bare View that does not scroll still is not exposed.
        let mut plain = Tree::new(&[1]);
        plain.add(1, Kind::View, PropsSpec::default(), &[2]).add(
            2,
            Kind::Button,
            PropsSpec::default(),
            &[],
        );
        assert_eq!(entries(&plain), vec![(2, None, AxRole::Button)]);
    }

    #[test]
    fn a_role_of_its_own_wins_over_scroll_view_and_none_still_hides_the_container() {
        let scroll = AxScroll {
            x: None,
            y: axis(10.0, 0.0, 120.0),
        };
        let listbox = scroller(scroll, r#"{"role":"listbox"}"#);
        assert_eq!(entries(&listbox)[0], (1, None, AxRole::ListBox));
        assert_eq!(
            props_at(&listbox, 1).scroll,
            Some(scroll),
            "the position and range are reported whatever the role"
        );
        assert!(props_at(&listbox, 1).actions.scroll_y);
        let hidden = scroller(scroll, r#"{"role":"none"}"#);
        assert_eq!(
            entries(&hidden)[0],
            (2, None, AxRole::Button),
            "an author's role=none keeps the container out of the tree"
        );
    }

    #[test]
    fn a_scroll_view_reports_the_position_and_range_of_the_axes_that_can_move() {
        let scroll = AxScroll {
            x: axis(4.0, 0.0, 30.0),
            y: axis(60.0, 0.0, 120.0),
        };
        let tree = scroller(scroll, "{}");
        let view = props_at(&tree, 1);
        assert_eq!(view.role, AxRole::ScrollView);
        assert_eq!(view.scroll, Some(scroll));
        assert!(view.actions.scroll_x && view.actions.scroll_y);
        assert!(
            !view.actions.scroll_into_view,
            "the container is not inside a scroll container of its own"
        );

        let vertical_only = scroller(
            AxScroll {
                x: None,
                y: axis(0.0, 0.0, 120.0),
            },
            "{}",
        );
        let actions = props_at(&vertical_only, 1).actions;
        assert!(actions.scroll_y && !actions.scroll_x);

        let reversed = scroller(
            AxScroll {
                x: None,
                y: axis(-80.0, -120.0, 0.0),
            },
            "{}",
        );
        assert_eq!(
            props_at(&reversed, 1).scroll.and_then(|scroll| scroll.y),
            axis(-80.0, -120.0, 0.0),
            "a reversed axis keeps its negative range"
        );
    }

    #[test]
    fn a_scroll_view_with_nothing_to_scroll_offers_no_scrolling() {
        let tree = scroller(AxScroll::default(), "{}");
        let view = props_at(&tree, 1);
        assert_eq!(view.role, AxRole::ScrollView);
        assert_eq!(view.scroll, Some(AxScroll::default()));
        assert_eq!(view.actions, AxActions::default());
        assert!(
            !props_at(&tree, 2).actions.scroll_into_view,
            "its contents are all in view already"
        );
    }

    #[test]
    fn the_contents_of_a_scrollable_container_can_be_scrolled_into_view() {
        let tree = scroller(
            AxScroll {
                x: None,
                y: axis(0.0, 0.0, 120.0),
            },
            "{}",
        );
        assert!(props_at(&tree, 2).actions.scroll_into_view);
        assert!(props_at(&tree, 3).actions.scroll_into_view);
        assert!(
            props_at(&tree, 2).scroll.is_none(),
            "only the container has a position"
        );
    }

    #[test]
    fn a_new_scroll_position_or_range_is_a_change_of_the_container_element() {
        let at = |position: f64| {
            scroller(
                AxScroll {
                    x: None,
                    y: axis(position, 0.0, 120.0),
                },
                "{}",
            )
        };
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(1, None), (2, Some(1)), (3, Some(1))]),
        );
        let before = at(0.0);
        for tag in [1, 2, 3] {
            registry.mark_applied(tag, props_at(&before, tag));
        }
        let after = at(40.0);
        assert!(
            registry.needs_apply(1, &props_at(&after, 1)),
            "a new scroll position is a change of the container's element"
        );
        for tag in [2, 3] {
            // The source moves the rows' bounds with the scroll (they are root-local), so in a real tree
            // they are set again too; this tree keeps them still, and an element that is equal is
            // left alone.
            assert!(!registry.needs_apply(tag, &props_at(&after, tag)));
        }
        let wider = scroller(
            AxScroll {
                x: None,
                y: axis(0.0, 0.0, 200.0),
            },
            "{}",
        );
        assert!(
            registry.needs_apply(1, &props_at(&wider, 1)),
            "a longer range is a change too"
        );
    }

    // ---- Registry ---------------------------------------------------------------------------------

    /// A server that keeps its tree the way `AccessibilityServer` does: a parent's child list, an
    /// insert position, recursive freeing, and a refusal to free inside an update.
    #[derive(Default)]
    struct FakeServer {
        next: u32,
        children: HashMap<u32, Vec<u32>>,
        parent: HashMap<u32, u32>,
        in_update: bool,
        created: usize,
        freed: usize,
    }

    const ROOT: u32 = 0;

    impl FakeServer {
        fn new() -> Self {
            let mut server = Self {
                next: 1,
                ..Self::default()
            };
            server.children.insert(ROOT, Vec::new());
            server
        }

        fn subtree_tags(&self, id: u32, ids: &HashMap<u32, u32>) -> Vec<u32> {
            self.children[&id]
                .iter()
                .flat_map(|child| {
                    let tag = ids[child];
                    let mut shape = vec![tag];
                    let below = self.subtree_tags(*child, ids);
                    if !below.is_empty() {
                        shape.push(u32::MAX);
                        shape.extend(below);
                        shape.push(u32::MAX - 1);
                    }
                    shape
                })
                .collect()
        }
    }

    impl ElementServer for FakeServer {
        type Id = u32;

        fn create_element(&mut self, parent: Option<u32>, _role: AxRole, index: usize) -> u32 {
            let id = self.next;
            self.next += 1;
            let parent = parent.unwrap_or(ROOT);
            let siblings = self.children.get_mut(&parent).expect("parent exists");
            siblings.insert(index.min(siblings.len()), id);
            self.children.insert(id, Vec::new());
            self.parent.insert(id, parent);
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

    /// The server's tree as nested tags, with markers for descending and ascending.
    fn shape_of(registry: &Registry<u32>, server: &FakeServer) -> Vec<u32> {
        let ids: HashMap<u32, u32> = registry
            .slots
            .iter()
            .map(|(tag, slot)| (slot.id, *tag))
            .collect();
        server.subtree_tags(ROOT, &ids)
    }

    fn shape_wanted(desired: &Desired, parent: Option<u32>) -> Vec<u32> {
        let mut shape = Vec::new();
        for tag in desired.children_of(parent) {
            shape.push(*tag);
            let below = shape_wanted(desired, Some(*tag));
            if !below.is_empty() {
                shape.push(u32::MAX);
                shape.extend(below);
                shape.push(u32::MAX - 1);
            }
        }
        shape
    }

    /// One accessibility update after a commit: prune outside, then grow inside.
    fn sync(registry: &mut Registry<u32>, server: &mut FakeServer, desired: &Desired) {
        registry.prune(server, desired);
        server.in_update = true;
        let misplaced = registry.grow(server, desired);
        server.in_update = false;
        assert_eq!(misplaced, Vec::<u32>::new());
        assert_eq!(shape_of(registry, server), shape_wanted(desired, None));
    }

    #[test]
    fn grow_creates_the_whole_tree_in_document_order() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        let desired = desired_of(&[
            (1, None),
            (2, Some(1)),
            (3, Some(1)),
            (4, None),
            (5, Some(4)),
        ]);
        sync(&mut registry, &mut server, &desired);
        assert_eq!(server.created, 5);
        assert!(!registry.is_empty());
    }

    #[test]
    fn a_second_sync_of_the_same_tree_changes_nothing() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        let desired = desired_of(&[(1, None), (2, Some(1)), (3, None)]);
        sync(&mut registry, &mut server, &desired);
        let before = (server.created, server.freed);
        sync(&mut registry, &mut server, &desired);
        assert_eq!((server.created, server.freed), before);
    }

    #[test]
    fn inserting_a_sibling_creates_only_it_and_marks_the_parent() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(1, None), (2, Some(1)), (4, Some(1))]),
        );
        let props = sample_props();
        for tag in [1, 2, 4] {
            registry.mark_applied(tag, props.clone());
        }
        assert!(!registry.needs_apply(1, &props));
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(1, None), (2, Some(1)), (3, Some(1)), (4, Some(1))]),
        );
        assert_eq!((server.created, server.freed), (4, 0));
        assert!(
            registry.needs_apply(1, &props),
            "the parent lists a new child"
        );
        assert!(!registry.needs_apply(2, &props) && !registry.needs_apply(4, &props));
        assert!(
            registry.needs_apply(3, &props),
            "a new element has never been set"
        );
    }

    #[test]
    fn removing_a_child_frees_it_and_marks_the_parent() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(1, None), (2, Some(1)), (3, Some(2))]),
        );
        let props = sample_props();
        for tag in [1, 2, 3] {
            registry.mark_applied(tag, props.clone());
        }
        sync(&mut registry, &mut server, &desired_of(&[(1, None)]));
        assert_eq!(server.freed, 2, "the child and the element under it");
        assert!(registry.element(2).is_none() && registry.element(3).is_none());
        assert!(registry.needs_apply(1, &props));
    }

    #[test]
    fn changed_properties_need_an_apply_and_equal_ones_do_not() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        sync(&mut registry, &mut server, &desired_of(&[(1, None)]));
        let props = sample_props();
        registry.mark_applied(1, props.clone());
        assert!(!registry.needs_apply(1, &props));
        let renamed = AxProps {
            name: "other".into(),
            ..props.clone()
        };
        assert!(registry.needs_apply(1, &renamed));
        let moved = AxProps {
            bounds: AxBounds {
                x: props.bounds.x + 4.0,
                ..props.bounds
            },
            ..props
        };
        assert!(registry.needs_apply(1, &moved));
    }

    #[test]
    fn reparenting_and_hiding_free_and_recreate() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(1, None), (2, Some(1)), (3, None)]),
        );
        // 2 moves under 3; 1 disappears.
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(3, None), (2, Some(3))]),
        );
        assert_eq!(
            shape_of(&registry, &server),
            vec![3, u32::MAX, 2, u32::MAX - 1]
        );
    }

    #[test]
    fn a_reorder_recreates_only_what_the_longest_increasing_subsequence_leaves() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(1, None), (2, None), (3, None), (4, None), (5, None)]),
        );
        let before = server.created;
        // Move 5 to the front: one removal, one insertion.
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(5, None), (1, None), (2, None), (3, None), (4, None)]),
        );
        assert_eq!((server.created - before, server.freed), (1, 1));
    }

    #[test]
    fn grow_reports_an_element_the_prune_did_not_remove() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(1, None), (2, None)]),
        );
        server.in_update = true;
        let misplaced = registry.grow(&mut server, &desired_of(&[(1, None)]));
        assert_eq!(
            misplaced,
            vec![2],
            "2 is no longer wanted and nobody pruned it"
        );
    }

    #[test]
    fn forget_all_drops_the_registry_without_freeing() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(1, None), (2, Some(1))]),
        );
        registry.forget_all();
        assert!(registry.is_empty());
        assert_eq!(server.freed, 0);
        assert!(registry.root_elements().is_empty());
    }

    #[test]
    fn structure_dirt_is_only_recorded_while_elements_exist() {
        let mut registry: Registry<u32> = Registry::default();
        registry.mark_structure_dirty();
        assert!(
            !registry.take_structure_dirty(),
            "nothing exists, so nothing can be stale"
        );
        let mut server = FakeServer::new();
        sync(&mut registry, &mut server, &desired_of(&[(1, None)]));
        registry.mark_structure_dirty();
        assert!(registry.take_structure_dirty());
        assert!(!registry.take_structure_dirty());
    }

    #[test]
    fn removing_a_tag_frees_its_subtree_once() {
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        sync(
            &mut registry,
            &mut server,
            &desired_of(&[(1, None), (2, Some(1)), (3, Some(2))]),
        );
        registry.remove(&mut server, 2);
        registry.remove(&mut server, 3);
        registry.remove(&mut server, 99);
        assert_eq!(server.freed, 2);
        assert!(registry.element(1).is_some());
    }

    /// Random edits to a forest: after each, prune then grow must leave the server's tree equal to
    /// the wanted one.
    #[test]
    fn random_edits_always_converge() {
        let mut seed = 0x2545_f491_4f6c_dd1d_u64;
        let mut random = move |bound: usize| {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            usize::try_from(seed % u64::try_from(bound).unwrap()).unwrap()
        };
        let mut registry = Registry::default();
        let mut server = FakeServer::new();
        for _ in 0..300 {
            let count = 1 + random(12);
            let mut tags: Vec<u32> = (1..=20).collect();
            for index in (1..tags.len()).rev() {
                tags.swap(index, random(index + 1));
            }
            tags.truncate(count);
            let mut shape: Vec<(u32, Option<u32>)> = Vec::new();
            for (index, tag) in tags.iter().enumerate() {
                let parent = if index == 0 || random(3) == 0 {
                    None
                } else {
                    Some(tags[random(index)])
                };
                shape.push((*tag, parent));
            }
            // Document order: a node comes before its children, which `desired_of` does not need but
            // `grow` does for a parent's slot to exist, so order parents first.
            let mut ordered: Vec<(u32, Option<u32>)> = Vec::new();
            fn emit(
                shape: &[(u32, Option<u32>)],
                parent: Option<u32>,
                out: &mut Vec<(u32, Option<u32>)>,
            ) {
                for (tag, candidate) in shape {
                    if *candidate == parent {
                        out.push((*tag, *candidate));
                        emit(shape, Some(*tag), out);
                    }
                }
            }
            emit(&shape, None, &mut ordered);
            sync(&mut registry, &mut server, &desired_of(&ordered));
        }
    }

    fn sample_props() -> AxProps {
        let mut tree = Tree::single(Kind::Button, PropsSpec::default());
        tree.place(1, [1.0, 2.0, 3.0, 4.0]);
        props_of(&tree, &walk(&tree)[0])
    }

    fn text_input_props(json: &str) -> PropsSpec {
        props(json)
    }

    /// The properties of every exposed element of `tree`, in document order.
    fn all_props(tree: &Tree) -> Vec<AxProps> {
        walk(tree)
            .iter()
            .map(|entry| props_of(tree, entry))
            .collect()
    }

    fn field(text: &str, selection: (usize, usize)) -> AxTextField {
        AxTextField {
            text: text.to_string(),
            selection,
            placeholder_shown: text.is_empty(),
            ..AxTextField::default()
        }
    }

    fn text_input(props: PropsSpec, field: AxTextField) -> Tree {
        let mut tree = Tree::single(Kind::TextInput, props);
        tree.nodes.get_mut(&1).unwrap().text_field = Some(field);
        tree
    }

    #[test]
    fn a_text_input_is_a_text_field_and_a_multi_line_one_a_text_area() {
        let single = text_input(text_input_props("{}"), field("abc", (3, 3)));
        assert_eq!(entries(&single), vec![(1, None, AxRole::TextField)]);
        let multi = text_input(
            text_input_props(r#"{"multiline":true}"#),
            field("a\nb", (0, 0)),
        );
        assert_eq!(entries(&multi), vec![(1, None, AxRole::MultilineTextField)]);
        // The role prop cannot make it something else, only take it out of the tree.
        let textbox = text_input(text_input_props(r#"{"role":"textbox"}"#), field("", (0, 0)));
        assert_eq!(entries(&textbox), vec![(1, None, AxRole::TextField)]);
        let removed = text_input(
            text_input_props(r#"{"role":"presentation"}"#),
            field("", (0, 0)),
        );
        assert!(entries(&removed).is_empty());
        // A `View` with `role="textbox"` has nothing to read or edit and stays unexposed.
        let view = Tree::single(Kind::View, props(r#"{"role":"textbox"}"#));
        assert!(entries(&view).is_empty());
    }

    #[test]
    fn a_text_field_reads_its_text_and_selection_not_a_value() {
        let tree = text_input(
            text_input_props(
                r#"{"ariaLabel":"Name","ariaDescription":"As on your card","placeholder":"Ada"}"#,
            ),
            field("hello", (1, 4)),
        );
        let all = all_props(&tree);
        let field_props = &all[0];
        assert_eq!(field_props.name, "Name");
        assert_eq!(field_props.description, "As on your card");
        assert_eq!(field_props.value, "", "the text is in the text elements");
        assert_eq!(
            field_props.placeholder, "",
            "a placeholder is read only while it shows"
        );
        assert_eq!(field_props.text_field.as_ref().unwrap().text, "hello");
        assert_eq!(field_props.text_field.as_ref().unwrap().selection, (1, 4));
        assert!(!field_props.read_only);
    }

    #[test]
    fn an_empty_field_with_no_name_is_named_by_its_placeholder() {
        let tree = text_input(
            text_input_props(r#"{"placeholder":"Search"}"#),
            field("", (0, 0)),
        );
        let all = all_props(&tree);
        assert_eq!(
            all[0].name, "Search",
            "as LineEdit names a field with no name"
        );
        assert_eq!(all[0].placeholder, "Search");
        let typed = text_input(
            text_input_props(r#"{"placeholder":"Search"}"#),
            field("a", (1, 1)),
        );
        let all = all_props(&typed);
        assert_eq!(all[0].name, "Search", "the placeholder still names it");
        assert_eq!(all[0].placeholder, "", "but is no longer shown");
    }

    #[test]
    fn a_text_field_offers_focus_selection_and_editing_unless_it_cannot() {
        let editable = all_props(&text_input(text_input_props("{}"), field("a", (0, 0))));
        assert_eq!(
            editable[0].actions,
            AxActions {
                focus: true,
                set_selection: true,
                edit: true,
                ..AxActions::default()
            }
        );
        let read_only = AxTextField {
            read_only: true,
            ..field("a", (0, 0))
        };
        let frozen = all_props(&text_input(
            text_input_props(r#"{"readOnly":true}"#),
            read_only,
        ));
        assert!(frozen[0].read_only);
        assert_eq!(
            frozen[0].actions,
            AxActions {
                focus: true,
                set_selection: true,
                ..AxActions::default()
            },
            "a read-only field is read and selected, not edited"
        );
        let disabled = all_props(&text_input(
            text_input_props(r#"{"disabled":true}"#),
            field("a", (0, 0)),
        ));
        assert_eq!(disabled[0].actions, AxActions::default());
        assert!(disabled[0].disabled);
    }

    #[test]
    fn a_change_of_text_selection_or_scroll_is_a_change_to_apply() {
        let base = text_input(text_input_props("{}"), field("abc", (3, 3)));
        let before = all_props(&base).remove(0);
        for changed in [
            field("abcd", (3, 3)),
            field("abc", (0, 3)),
            AxTextField {
                scroll: (12.0, 0.0),
                ..field("abc", (3, 3))
            },
        ] {
            let after = all_props(&text_input(text_input_props("{}"), changed)).remove(0);
            assert_ne!(before, after);
        }
    }

    #[test]
    fn a_selection_endpoint_belongs_to_the_line_it_starts_on() {
        // "ab\ncd" shaped as two lines: the first owns "ab\n", the second "cd" and the end of the text.
        let lines = [0..3, 3..5];
        assert_eq!(line_for_offset(&lines, 0), Some(0));
        assert_eq!(line_for_offset(&lines, 2), Some(0), "before the break");
        assert_eq!(
            line_for_offset(&lines, 3),
            Some(1),
            "the start of the next line"
        );
        assert_eq!(
            line_for_offset(&lines, 5),
            Some(1),
            "the end of the text is on the last line"
        );
        // A blank line in the middle and an empty line after a final break.
        let blanks = [0..3, 3..4, 4..6, 6..6];
        assert_eq!(line_for_offset(&blanks, 3), Some(1));
        assert_eq!(
            line_for_offset(&blanks, 6),
            Some(3),
            "the line after a final break"
        );
        assert_eq!(line_for_offset(&[], 0), None);
        assert_eq!(
            line_for_offset(std::slice::from_ref(&(0..0)), 0),
            Some(0),
            "an empty text has its one line"
        );
    }

    #[test]
    fn the_text_actions_have_codes_of_their_own() {
        assert_ne!(
            AxAction::SetTextSelection.code(),
            AxAction::ReplaceSelectedText.code()
        );
        assert_ne!(AxAction::SetTextSelection.code(), AxAction::SetValue.code());
    }
}
