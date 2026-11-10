//! Typed native props: what a React element contributes to the mounted tree, with the style
//! layers that native resolves.
//!
//! Nothing here touches Godot. A prop set arrives as JSON inside a commit payload, is parsed into
//! these types with `deny_unknown_fields`, merged over the node's previous props and validated
//! before any mounted state changes.

use std::collections::BTreeSet;

use serde::de::{Deserialize, Deserializer};
use serde::{Deserialize as DeriveDeserialize, Serialize};
use taffy::geometry::{Point, Rect, Size};
use taffy::style::{
    AlignContent, AlignItems, BoxSizing, Display, FlexDirection, FlexWrap, JustifyContent,
    LengthPercentage, LengthPercentageAuto, Overflow, Position,
};
use taffy::style_helpers::auto;

use crate::box_shadow::{ShadowList, ShadowParts};
use crate::filter::{FilterKind, FilterList, FilterParts};
use crate::gradient::{BackgroundImage, GradientParts};
use crate::grid_style::{
    AutoKeyword, GridAutoFlowSpec, GridLineSpec, GridTemplateSpec, GridTrackSpec, auto_tracks,
    placement, validate_auto_tracks,
};
use crate::text_span::{SpanSpec, validate_spans};
use crate::text_style::spec::{MAX_FONT_WEIGHT, MIN_FONT_WEIGHT};
use crate::text_style::{
    DecorationLines, DecorationStyleSpec, DecorationThicknessSpec, FontStyleSpec,
    LetterSpacingSpec, LineClampSpec, LineHeightSpec, NumericFigureSpec, NumericFractionSpec,
    NumericSpacingSpec, OverflowWrapSpec, TextDecoration, TextOverflowSpec, TextTransformSpec,
    UnderlineOffsetSpec, WhiteSpaceSpec, WordBreakSpec,
};
use crate::transform::{TransformList, TransformOriginSpec, TransformParts};
pub use crate::transition::Easing;
use crate::transition::{
    PropertiesKeyword, TransitionParts, TransitionProperties, merge_transition,
};

/// The `tabIndex` values allowed: `0` in the tab order, `-1` focusable only.
pub const TAB_INDICES: [i32; 2] = [0, -1];

/// What a node is.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    View,
    Text,
    Button,
    /// A text field. Its text lives in a native edit buffer, not in props.
    TextInput,
    /// A picture: a texture the root registered (`register_texture`), drawn into the element's content box.
    Image,
}

impl Kind {
    /// `Text` carries its string in the `text` prop (React Native's rule), a `TextInput` its text
    /// in its edit buffer, and an `Image` its picture in `source`, so none of them has children.
    pub(crate) fn allows_children(self) -> bool {
        match self {
            Kind::View | Kind::Button => true,
            Kind::Text | Kind::TextInput | Kind::Image => false,
        }
    }
}

/// How an image's picture fills its content box: CSS `object-fit`, plus `tile` (Godot's `TextureRect` tile mode),
/// which repeats the picture at its own size from the top left.
#[derive(Clone, Copy, Debug, Default, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ImageFitSpec {
    /// Stretched to the box, ignoring its proportions (CSS's initial `object-fit`).
    #[default]
    Fill,
    /// As large as fits inside the box, keeping its proportions, centred.
    Contain,
    /// As small as covers the box, keeping its proportions, centred and cut by the box.
    Cover,
    /// At its own size, centred and cut by the box.
    None,
    /// `none` or `contain`, whichever is smaller.
    ScaleDown,
    /// Repeated at its own size from the box's top left, cut by the box.
    Tile,
}

/// A nine-slice (CSS `border-image-slice`, Godot's `NinePatchRect`): the margins, in the picture's own pixels, that keep
/// their size at the corners while the middle stretches. `fill: false` leaves the middle empty.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ImageSliceSpec {
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
    pub left: f32,
    pub fill: Option<bool>,
}

/// The part of a texture an image shows, in the texture's pixels (an atlas region).
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ImageRectSpec {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum Dimension {
    Num(f32),
    Text(String),
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DisplaySpec {
    Flex,
    Grid,
    /// CSS block layout (Taffy's): children stack, vertical margins collapse, a block child fills the width.
    Block,
    /// As `Block`, and it contains its floats and its margins (a block formatting context).
    #[serde(rename = "flow-root")]
    FlowRoot,
    None,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FlexDirectionSpec {
    Row,
    Column,
    RowReverse,
    ColumnReverse,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FlexWrapSpec {
    Nowrap,
    Wrap,
    WrapReverse,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AlignSpec {
    Start,
    End,
    Center,
    Stretch,
    Baseline,
    FlexStart,
    FlexEnd,
    /// Only `alignSelf` and `justifySelf` take it: the container's `alignItems` or `justifyItems` decides.
    Auto,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum JustifySpec {
    Start,
    End,
    Center,
    SpaceBetween,
    SpaceAround,
    SpaceEvenly,
    FlexStart,
    FlexEnd,
    Stretch,
    /// CSS `normal`: `stretch` for a grid's tracks and `flex-start` for flex items.
    Normal,
}

/// `visibility`: `hidden` paints nothing and takes no pointer but keeps its layout. It is inherited, and a
/// child may be `visible` inside a `hidden` parent.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum VisibilitySpec {
    Visible,
    Hidden,
}

/// `box-sizing`: whether `width`, `height` and their limits include the padding and border.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum BoxSizingSpec {
    BorderBox,
    ContentBox,
}

/// `aspect-ratio`: width over height, or `auto` for none.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum AspectRatioSpec {
    Ratio(f32),
    Auto(AutoKeyword),
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TextAlignSpec {
    Left,
    Center,
    Right,
    Justify,
    /// `left`, as there is no `direction` to make it otherwise.
    Start,
    /// `right`, likewise.
    End,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub enum TransitionProperty {
    Width,
    Height,
    Opacity,
    BackgroundColor,
    /// The text colour, which children inherit: their text follows it while it animates.
    Color,
    BorderColor,
    /// Interpolated per function, a missing function from its identity (CSS Filter Effects).
    Filter,
    BackdropFilter,
    /// Interpolated by Stylo: function by function when the lists match, else by decomposing the matrices
    /// (CSS Transforms 1). Sampled natively on the clock; nothing is re-recorded per frame.
    Transform,
    /// Interpolated layer by layer, a missing layer from a transparent one (CSS Backgrounds 3, "box-shadow").
    BoxShadow,
}

impl TransitionProperty {
    /// Every property `transition-property: all` animates. A property a track adds to this enum goes here too
    /// (`transitions_name_every_property` fails to compile until the new variant is placed).
    pub const ANIMATABLE: [TransitionProperty; 10] = [
        TransitionProperty::Width,
        TransitionProperty::Height,
        TransitionProperty::Opacity,
        TransitionProperty::BackgroundColor,
        TransitionProperty::Color,
        TransitionProperty::BorderColor,
        TransitionProperty::Filter,
        TransitionProperty::BackdropFilter,
        TransitionProperty::Transform,
        TransitionProperty::BoxShadow,
    ];

    /// The CSS property Stylo animates for it.
    pub(crate) fn css_name(self) -> &'static str {
        match self {
            TransitionProperty::Width => "width",
            TransitionProperty::Height => "height",
            TransitionProperty::Opacity => "opacity",
            TransitionProperty::BackgroundColor => "background-color",
            TransitionProperty::Color => "color",
            TransitionProperty::BorderColor => "border-color",
            TransitionProperty::Filter => "filter",
            TransitionProperty::BackdropFilter => "backdrop-filter",
            TransitionProperty::Transform => "transform",
            TransitionProperty::BoxShadow => "box-shadow",
        }
    }
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum InterpolateSize {
    NumericOnly,
    AllowKeywords,
}

/// `border-style` and `outline-style`, the two values this library draws: `none` takes the border's width away (CSS: a
/// border with no style has no width) and draws no outline, `solid` is the default. Dashed, dotted and the rest are not drawn.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LineStyleSpec {
    None,
    Solid,
}

/// CSS `overflow` for one axis. `scroll` and `auto` make the axis a scroll container's; they behave
/// the same here because the scrollbars overlay the content and take no layout space, so
/// a bar is drawn only while there is something to scroll to.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OverflowSpec {
    Visible,
    Hidden,
    /// Clips like `Hidden`, but is not a scroll container: a flex item's automatic minimum size stays its
    /// content's, and nothing can scroll it.
    Clip,
    Scroll,
    Auto,
}

impl OverflowSpec {
    /// Whether this axis scrolls (the user, a command or focus can move its content).
    pub(crate) fn scrolls(self) -> bool {
        matches!(self, OverflowSpec::Scroll | OverflowSpec::Auto)
    }

    /// Whether content past the padding box is clipped on this axis.
    pub(crate) fn clips(self) -> bool {
        self != OverflowSpec::Visible
    }
}

/// CSS `overscroll-behavior`: `contain` ends scroll chaining at the element, for wheel, pan gestures
/// and touch. One value covers both axes.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OverscrollBehaviorSpec {
    Auto,
    Contain,
}

/// CSS `scrollbar-width`: `none` hides the overlay scrollbars of a scroll container (it still scrolls).
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ScrollbarWidthSpec {
    Auto,
    None,
}

/// CSS `touch-action`, the supported subset: which pans the browser (here, native) may take from
/// a touch that starts on the element. Each element on the path from the touched one to the scroller
/// that would pan restricts it further (`scroll::pan_owner`).
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TouchActionSpec {
    Auto,
    None,
    PanX,
    PanY,
}

/// CSS `position`, without `sticky` (a non-goal). `relative`, `absolute` and `fixed` make
/// an element positioned: a containing block for the absolute descendants below it.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PositionSpec {
    Static,
    Relative,
    Absolute,
    Fixed,
}

impl PositionSpec {
    /// `absolute` and `fixed` take the element out of the flow of its parent, and out of its parent's
    /// paint order when its containing block is another element.
    pub(crate) fn is_out_of_flow(self) -> bool {
        matches!(self, PositionSpec::Absolute | PositionSpec::Fixed)
    }

    /// Whether the element is a containing block for the absolute elements below it.
    pub(crate) fn is_positioned(self) -> bool {
        self != PositionSpec::Static
    }
}

/// CSS `pointer-events`: `none` makes an element itself never the target of a pointer; its
/// children can still be (hit testing).
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PointerEventsSpec {
    Auto,
    None,
}

/// CSS `user-select`, the supported subset: `text` lets the pointer select the text of an element
/// and of the elements below it that do not say otherwise; the default, `none`, does not.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UserSelectSpec {
    None,
    Text,
}

/// CSS `cursor`, the supported subset; `pointer.rs` maps each to a Godot `CursorShape`.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum CursorSpec {
    Default,
    Pointer,
    Text,
    Move,
    Grab,
    Grabbing,
    NotAllowed,
    Crosshair,
    Wait,
    Progress,
    Help,
    EwResize,
    NsResize,
    NeswResize,
    NwseResize,
}

/// The `role` prop. `none` and `presentation` keep an element out of the
/// accessibility tree; every other value names what the element is. Wire names are the ARIA role
/// names, all lowercase.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RoleSpec {
    Button,
    Checkbox,
    Switch,
    Radio,
    RadioGroup,
    Group,
    Slider,
    ProgressBar,
    TextBox,
    Text,
    Link,
    List,
    ListItem,
    ListBox,
    Option,
    ComboBox,
    Menu,
    MenuItem,
    MenuItemCheckbox,
    MenuItemRadio,
    TabList,
    Tab,
    TabPanel,
    Dialog,
    Img,
    Region,
    Tooltip,
    None,
    Presentation,
}

/// `aria-checked`: `true`, `false` or the string `"mixed"`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CheckedSpec {
    Unchecked,
    Checked,
    Mixed,
}

impl<'de> Deserialize<'de> for CheckedSpec {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(DeriveDeserialize)]
        #[serde(untagged)]
        enum Wire {
            Flag(bool),
            Word(String),
        }
        match Wire::deserialize(deserializer)? {
            Wire::Flag(true) => Ok(CheckedSpec::Checked),
            Wire::Flag(false) => Ok(CheckedSpec::Unchecked),
            Wire::Word(word) if word == "mixed" => Ok(CheckedSpec::Mixed),
            Wire::Word(word) => Err(serde::de::Error::custom(format!(
                "ariaChecked must be true, false or \"mixed\", not {word:?}"
            ))),
        }
    }
}

impl Serialize for CheckedSpec {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            CheckedSpec::Unchecked => serializer.serialize_bool(false),
            CheckedSpec::Checked => serializer.serialize_bool(true),
            CheckedSpec::Mixed => serializer.serialize_str("mixed"),
        }
    }
}

/// `aria-live`.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LiveSpec {
    Off,
    Polite,
    Assertive,
}

/// `dragPreview`: what follows the pointer while a `draggable` element is dragged.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DragPreviewSpec {
    /// A translucent copy of the element, drawn in the top-most item.
    Native,
    /// Nothing: the handlers draw their own feedback.
    None,
}

/// `aria-orientation`.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OrientationSpec {
    Horizontal,
    Vertical,
}

#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TransitionSpec {
    pub properties: TransitionProperties,
    pub duration_ms: f64,
    pub delay_ms: Option<f64>,
    pub easing: Option<Easing>,
}

impl TransitionSpec {
    pub fn validate(&self) -> Result<(), String> {
        match &self.properties {
            TransitionProperties::List(list) => {
                if list.is_empty() {
                    return Err("transition.properties must not be empty".into());
                }
                let mut unique = BTreeSet::new();
                if list.iter().any(|property| !unique.insert(*property)) {
                    return Err("transition.properties must not contain duplicates".into());
                }
            }
            TransitionProperties::Keyword(PropertiesKeyword::None) => {
                return Err("transition.properties must not be none; leave transition out".into());
            }
            TransitionProperties::Keyword(PropertiesKeyword::All) => {}
        }
        if !self.duration_ms.is_finite() || self.duration_ms < 0.0 {
            return Err("transition.durationMs must be a finite nonnegative number".into());
        }
        if self
            .delay_ms
            .is_some_and(|delay| !delay.is_finite() || delay < 0.0)
        {
            return Err("transition.delayMs must be a finite nonnegative number".into());
        }
        self.easing.map_or(Ok(()), Easing::validate)
    }
}

/// The style layers' conditions. `focus` and `focusVisible` apply to the focused element only,
/// `focusWithin` to it and its ancestors, `hover` and `active` to the target and its ancestors,
/// `disabled` to a node whose own `disabled` prop is true, and `starting` to a node's
/// `@starting-style` before-change style on mount or when shown from `display: none`.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub enum PseudoState {
    Hover,
    Active,
    Focus,
    FocusVisible,
    FocusWithin,
    Disabled,
    Starting,
}

/// One compiled class or inline style: applied when the viewport is at least `min_width` wide and
/// every listed state holds. Layers apply in order, later layers overriding earlier ones.
#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StyleLayer {
    #[serde(default)]
    pub min_width: Option<f32>,
    #[serde(default)]
    pub states: Vec<PseudoState>,
    pub style: StyleSpec,
}

#[derive(Clone, Debug, Default, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StyleLayers {
    pub layers: Vec<StyleLayer>,
}

impl StyleLayers {
    pub fn validate(&self) -> Result<(), String> {
        for (index, layer) in self.layers.iter().enumerate() {
            if layer
                .min_width
                .is_some_and(|width| !width.is_finite() || width < 0.0)
            {
                return Err(format!(
                    "style.layers[{index}].minWidth must be a finite nonnegative number"
                ));
            }
            layer
                .style
                .validate()
                .map_err(|error| format!("style.layers[{index}]: {error}"))?;
        }
        Ok(())
    }
}

/// Style longhands. Shorthands (`padding`, `margin`, `gap`, `overflow`) are expanded by the JS
/// compiler so merging layers is a plain ordered overwrite. `disabled` is a prop, not a style.
#[derive(Clone, Debug, Default, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StyleSpec {
    pub width: Option<Dimension>,
    pub height: Option<Dimension>,
    pub min_width: Option<Dimension>,
    pub min_height: Option<Dimension>,
    pub max_width: Option<Dimension>,
    pub max_height: Option<Dimension>,
    pub display: Option<DisplaySpec>,
    pub flex_direction: Option<FlexDirectionSpec>,
    pub flex_wrap: Option<FlexWrapSpec>,
    pub flex_grow: Option<f32>,
    pub flex_shrink: Option<f32>,
    pub flex_basis: Option<Dimension>,
    pub row_gap: Option<f32>,
    pub column_gap: Option<f32>,
    pub padding_top: Option<f32>,
    pub padding_right: Option<f32>,
    pub padding_bottom: Option<f32>,
    pub padding_left: Option<f32>,
    /// Pixels, a percentage of the containing block's width, or `auto`; either number may be negative.
    pub margin_top: Option<Inset>,
    pub margin_right: Option<Inset>,
    pub margin_bottom: Option<Inset>,
    pub margin_left: Option<Inset>,
    pub align_items: Option<AlignSpec>,
    pub align_self: Option<AlignSpec>,
    pub justify_content: Option<JustifySpec>,
    pub align_content: Option<JustifySpec>,
    pub justify_items: Option<AlignSpec>,
    pub justify_self: Option<AlignSpec>,
    /// The position among the siblings in layout (not in painting or hit testing).
    pub order: Option<i32>,
    pub aspect_ratio: Option<AspectRatioSpec>,
    pub box_sizing: Option<BoxSizingSpec>,
    /// Inherited.
    pub visibility: Option<VisibilitySpec>,
    pub grid_template_columns: Option<GridTemplateSpec>,
    pub grid_template_rows: Option<GridTemplateSpec>,
    pub grid_auto_flow: Option<GridAutoFlowSpec>,
    pub grid_auto_columns: Option<Vec<GridTrackSpec>>,
    pub grid_auto_rows: Option<Vec<GridTrackSpec>>,
    /// A grid item's area: lines and a span per axis, which `placement` resolves as the CSS cascade of
    /// Tailwind's `col-span-*`, `col-start-*` and `col-end-*` does (an explicit line beats the span).
    pub grid_column_start: Option<GridLineSpec>,
    pub grid_column_end: Option<GridLineSpec>,
    pub grid_column_span: Option<u16>,
    pub grid_row_start: Option<GridLineSpec>,
    pub grid_row_end: Option<GridLineSpec>,
    pub grid_row_span: Option<u16>,
    pub background_color: Option<String>,
    pub color: Option<String>,
    pub font_size: Option<i32>,
    /// Inherited. A comma separated list of families, as written.
    pub font_family: Option<String>,
    /// Inherited. A CSS weight, 1 to 1000; the compiler turns the keywords into numbers.
    pub font_weight: Option<u16>,
    /// Inherited.
    pub font_style: Option<FontStyleSpec>,
    /// Inherited. See [`LineHeightSpec`]; a computed value is px, a unitless factor, or `normal`.
    pub line_height: Option<LineHeightSpec>,
    /// Inherited. A computed value is px.
    pub letter_spacing: Option<LetterSpacingSpec>,
    /// Inherited.
    pub text_transform: Option<TextTransformSpec>,
    /// Not inherited: the lines this element decorates its text with; they propagate through
    /// [`StyleSpec::text_decorations`].
    pub text_decoration_line: Option<DecorationLines>,
    pub text_decoration_color: Option<String>,
    /// Not inherited; propagates with the decoration it belongs to ([`TextDecoration::style`]).
    pub text_decoration_style: Option<DecorationStyleSpec>,
    pub text_decoration_thickness: Option<DecorationThicknessSpec>,
    /// Inherited.
    pub text_underline_offset: Option<UnderlineOffsetSpec>,
    /// Not inherited.
    pub text_overflow: Option<TextOverflowSpec>,
    /// Inherited. Unset behaves as `pre-wrap` (React Native's `Text`), so existing text is unchanged.
    pub white_space: Option<WhiteSpaceSpec>,
    /// Inherited.
    pub word_break: Option<WordBreakSpec>,
    /// Inherited.
    pub overflow_wrap: Option<OverflowWrapSpec>,
    /// Not inherited.
    pub line_clamp: Option<LineClampSpec>,
    /// Inherited, as are the four numeral longhands below.
    pub numeric_figure: Option<NumericFigureSpec>,
    pub numeric_spacing: Option<NumericSpacingSpec>,
    pub numeric_fraction: Option<NumericFractionSpec>,
    pub ordinal: Option<bool>,
    pub slashed_zero: Option<bool>,
    /// Computed only (never on the wire): the decorations that apply to this element's text, those it
    /// inherited from the elements above it and its own.
    #[serde(skip)]
    pub text_decorations: Vec<TextDecoration>,
    /// The shorthands set all four corners, sides or colours; a longhand set in the same layer or a later one wins over
    /// them for its own (see [`StyleSpec::merge`]).
    pub border_radius: Option<f32>,
    pub border_width: Option<f32>,
    pub border_color: Option<String>,
    pub border_style: Option<LineStyleSpec>,
    pub border_top_left_radius: Option<f32>,
    pub border_top_right_radius: Option<f32>,
    pub border_bottom_right_radius: Option<f32>,
    pub border_bottom_left_radius: Option<f32>,
    pub border_top_width: Option<f32>,
    pub border_right_width: Option<f32>,
    pub border_bottom_width: Option<f32>,
    pub border_left_width: Option<f32>,
    pub border_top_color: Option<String>,
    pub border_right_color: Option<String>,
    pub border_bottom_color: Option<String>,
    pub border_left_color: Option<String>,
    /// An outline is drawn when its style is `solid` (the default style is `none`); setting any outline longhand takes the
    /// element's native focus ring away, which is an outline in a browser too.
    pub outline_style: Option<LineStyleSpec>,
    pub outline_width: Option<f32>,
    pub outline_color: Option<String>,
    pub outline_offset: Option<f32>,
    pub opacity: Option<f32>,
    pub text_align: Option<TextAlignSpec>,
    pub transition: Option<TransitionSpec>,
    /// The `transition-*` longhands the utility classes set (`transition-colors`, `duration-200`, `ease-in-out`);
    /// each merges on its own across layers, and the computed style resolves them into `transition`.
    pub transition_parts: Option<TransitionParts>,
    pub interpolate_size: Option<InterpolateSize>,
    pub overflow_x: Option<OverflowSpec>,
    pub overflow_y: Option<OverflowSpec>,
    pub overscroll_behavior: Option<OverscrollBehaviorSpec>,
    pub scrollbar_width: Option<ScrollbarWidthSpec>,
    /// Inherited. The overlay scrollbar thumb's colour; a scroll container paints
    /// [`DEFAULT_SCROLLBAR_COLOR`](crate::render_tree::DEFAULT_SCROLLBAR_COLOR) when nothing set one.
    pub scrollbar_color: Option<String>,
    /// Inherited. The colour of a text input's caret; the text colour when nothing set one.
    pub caret_color: Option<String>,
    /// Inherited. The colour of a text input's placeholder; the text colour at half alpha when
    /// nothing set one.
    pub placeholder_color: Option<String>,
    pub touch_action: Option<TouchActionSpec>,
    pub pointer_events: Option<PointerEventsSpec>,
    pub cursor: Option<CursorSpec>,
    /// Inherited. Whether the pointer can select an element's text; `none` when nothing set it.
    pub user_select: Option<UserSelectSpec>,
    /// Inherited. The selection highlight's colour; selected text paints
    /// [`DEFAULT_SELECTION_COLOR`](crate::render_tree::DEFAULT_SELECTION_COLOR) when nothing set one.
    pub selection_color: Option<String>,
    pub position: Option<PositionSpec>,
    pub top: Option<Inset>,
    pub right: Option<Inset>,
    pub bottom: Option<Inset>,
    pub left: Option<Inset>,
    /// Orders an element among the siblings that share its paint parent; React Native's
    /// `zIndex`, which applies to every element and creates no stacking context.
    pub z_index: Option<i32>,
    /// An explicit `filter` list (CSS text on the wire). It replaces what the utilities composed, and
    /// a utility set in a later layer replaces it, as in CSS where each sets the whole property.
    pub filter: Option<FilterList>,
    /// The functions Tailwind's separate utilities set (`blur-sm`, `hover:brightness-110`); each merges
    /// on its own across layers. See [`merge_filter`].
    pub filter_parts: Option<FilterParts>,
    /// As `filter`, for what is behind the element. Drawn only for a visible element.
    pub backdrop_filter: Option<FilterList>,
    pub backdrop_filter_parts: Option<FilterParts>,
    /// An explicit `transform` (CSS text on the wire, like `filter`): it replaces what the utilities composed,
    /// and a utility set in a later layer takes the property back to the composed list.
    pub transform: Option<TransformList>,
    /// The values Tailwind's separate utilities set (`-translate-x-1/2`, `hover:scale-105`); each merges on
    /// its own across layers. See [`merge_transform`].
    pub transform_parts: Option<TransformParts>,
    /// CSS `transform-origin` (text on the wire): where the transform is about, in the border box. The middle
    /// when nothing set one.
    pub transform_origin: Option<TransformOriginSpec>,
    /// Computed, never authored: some ancestor is transformed (`transform` other than `none`). A transformed element
    /// is the containing block of its absolute and fixed descendants, so `fixed` here is laid out and painted like
    /// `absolute` (Taffy's `fixed` has no containing-block override), and a static transformed element is laid out
    /// as `relative` so Taffy gives it its absolute descendants. Inherited like a property: see
    /// `InheritedStyle::inside_transform`.
    #[serde(skip)]
    pub inside_transform: bool,
    /// An explicit `box-shadow` list (CSS text on the wire), which replaces what the utilities composed, as `filter` does.
    pub box_shadow: Option<ShadowList>,
    /// The variables of Tailwind's `shadow-*` and `ring-*` utilities; each merges on its own across layers.
    pub box_shadow_parts: Option<ShadowParts>,
    /// An explicit `background-image` (`none` or a `linear-gradient()`).
    pub background_image: Option<BackgroundImage>,
    /// The variables of Tailwind's `bg-gradient-to-*`, `from-*`, `via-*` and `to-*`.
    pub gradient_parts: Option<GradientParts>,
}

/// Merge a layer's explicit value and its utilities' parts the way `merge_filter` does: the explicit value replaces
/// the whole property and forgets the parts set before it; parts set after it take the property back to the composed value.
fn merge_listed<L: Clone, P: Clone + Default>(
    list: &mut Option<L>,
    parts: &mut Option<P>,
    other_list: &Option<L>,
    other_parts: &Option<P>,
    merge: impl FnOnce(&mut P, &P),
) {
    if let Some(other_list) = other_list {
        *list = Some(other_list.clone());
        *parts = None;
    } else if let Some(other_parts) = other_parts {
        *list = None;
        merge(parts.get_or_insert_with(P::default), other_parts);
    }
}

/// Merge one layer's `transform` and `transform_parts` over the values so far, as [`merge_filter`] does
/// for filters: an explicit list replaces the property and forgets the values utilities set before it, and
/// a value set after it takes the property back to the composed list. This is what the Tailwind classes do
/// in CSS (each utility sets its own variable and `transform`), so `-translate-x-1/2 hover:scale-105`
/// keeps the translate on hover and `style={{transform}}` replaces both.
fn merge_transform(
    list: &mut Option<TransformList>,
    parts: &mut Option<TransformParts>,
    other_list: &Option<TransformList>,
    other_parts: &Option<TransformParts>,
) {
    if let Some(other_list) = other_list {
        *list = Some(other_list.clone());
        *parts = None;
    } else if let Some(other_parts) = other_parts {
        *list = None;
        parts
            .get_or_insert_with(TransformParts::default)
            .merge(other_parts);
    }
}

/// Merge one layer's `filter` and `filter_parts` over the values so far. An explicit list replaces the
/// whole property and forgets the functions utilities set before it; a function set after it takes the
/// property back to the composed list, where only the functions set since count. This is what the
/// Tailwind classes do in CSS (each utility sets its own variable *and* `filter`), so
/// `blur-sm hover:brightness-110` keeps the blur on hover and `style={{filter}}` replaces both.
fn merge_filter(
    list: &mut Option<FilterList>,
    parts: &mut Option<FilterParts>,
    other_list: &Option<FilterList>,
    other_parts: &Option<FilterParts>,
) {
    if let Some(other_list) = other_list {
        *list = Some(other_list.clone());
        *parts = None;
    } else if let Some(other_parts) = other_parts {
        *list = None;
        parts
            .get_or_insert_with(FilterParts::default)
            .merge(other_parts);
    }
}

/// An inset (`top`, `right`, `bottom`, `left`): pixels or a percentage of the containing block, either
/// of which may be negative, or `auto`.
#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum Inset {
    Num(f32),
    Text(String),
}

impl Inset {
    pub(crate) fn value(&self) -> Result<ParsedDimension, String> {
        match self {
            Self::Num(value) if value.is_finite() => Ok(ParsedDimension::Length(*value)),
            Self::Num(_) => Err("inset must be a finite number".into()),
            Self::Text(value) if value == "auto" => Ok(ParsedDimension::Auto),
            Self::Text(value) => {
                let percent = value
                    .strip_suffix('%')
                    .and_then(|number| number.parse::<f32>().ok())
                    .filter(|number| number.is_finite())
                    .ok_or_else(|| {
                        format!("invalid inset {value:?}; expected auto, a number or a percentage")
                    })?;
                Ok(ParsedDimension::Percent(percent / 100.0))
            }
        }
    }
}

pub(crate) fn inset(value: &Option<Inset>) -> Result<LengthPercentageAuto, String> {
    Ok(match value.as_ref().map(Inset::value).transpose()? {
        Some(ParsedDimension::Length(value)) => LengthPercentageAuto::length(value),
        Some(ParsedDimension::Percent(value)) => LengthPercentageAuto::percent(value),
        Some(ParsedDimension::Auto) | None => auto(),
    })
}

pub(crate) enum ParsedDimension {
    Length(f32),
    Percent(f32),
    Auto,
}

/// What a size (`width`, `height`, `flexBasis` and the limits) says: a [`ParsedDimension`], an intrinsic
/// keyword, or a share of the viewport.
pub(crate) enum ParsedSize {
    Length(f32),
    Percent(f32),
    Auto,
    MinContent,
    MaxContent,
    FitContent,
    /// A fraction of the viewport's width (`50vw` is 0.5).
    ViewportWidth(f32),
    ViewportHeight(f32),
}

/// A fraction of the viewport's size, which a style resolves to pixels before layout
/// ([`StyleSpec::resolve_viewport_units`]).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Viewport {
    pub width: f32,
    pub height: f32,
}

impl Dimension {
    pub(crate) fn value(&self) -> Result<ParsedSize, String> {
        match self {
            Self::Num(value) if value.is_finite() && *value >= 0.0 => {
                Ok(ParsedSize::Length(*value))
            }
            Self::Num(_) => Err("dimension must be a finite nonnegative number".into()),
            Self::Text(value) => match value.as_str() {
                "auto" => Ok(ParsedSize::Auto),
                "min-content" => Ok(ParsedSize::MinContent),
                "max-content" => Ok(ParsedSize::MaxContent),
                "fit-content" => Ok(ParsedSize::FitContent),
                _ => {
                    let number = |suffix: &str| {
                        value
                            .strip_suffix(suffix)
                            .and_then(|digits| digits.parse::<f32>().ok())
                            .filter(|number| number.is_finite() && *number >= 0.0)
                    };
                    if let Some(percent) = number("%") {
                        Ok(ParsedSize::Percent(percent / 100.0))
                    } else if let Some(percent) = number("vw") {
                        Ok(ParsedSize::ViewportWidth(percent / 100.0))
                    } else if let Some(percent) = number("vh") {
                        Ok(ParsedSize::ViewportHeight(percent / 100.0))
                    } else {
                        Err(format!(
                            "invalid dimension {value:?}; expected auto, min-content, max-content, fit-content, a nonnegative percentage or a nonnegative vw or vh"
                        ))
                    }
                }
            },
        }
    }

    /// Whether this is an intrinsic keyword, which Taffy accepts for a size and not for its limits.
    pub(crate) fn is_keyword(&self) -> bool {
        matches!(
            self.value(),
            Ok(ParsedSize::MinContent | ParsedSize::MaxContent | ParsedSize::FitContent)
        )
    }

    /// The percentage as a fraction, if this is one.
    pub(crate) fn percent(&self) -> Option<f32> {
        match self.value() {
            Ok(ParsedSize::Percent(fraction)) => Some(fraction),
            _ => None,
        }
    }

    /// The pixels a viewport share is, for a viewport this big.
    fn resolved(&self, viewport: Viewport) -> Option<Dimension> {
        match self.value() {
            Ok(ParsedSize::ViewportWidth(fraction)) => {
                Some(Dimension::Num(fraction * viewport.width))
            }
            Ok(ParsedSize::ViewportHeight(fraction)) => {
                Some(Dimension::Num(fraction * viewport.height))
            }
            _ => None,
        }
    }
}

const UNRESOLVED_VIEWPORT_UNIT: &str =
    "a viewport unit reached layout unresolved (computed styles resolve vw and vh first)";

pub(crate) fn dimension(value: &Option<Dimension>) -> Result<taffy::style::Dimension, String> {
    Ok(match value.as_ref().map(Dimension::value).transpose()? {
        Some(ParsedSize::Length(value)) => taffy::style::Dimension::length(value),
        Some(ParsedSize::Percent(value)) => taffy::style::Dimension::percent(value),
        Some(ParsedSize::MinContent) => taffy::style::Dimension::min_content(),
        Some(ParsedSize::MaxContent) => taffy::style::Dimension::max_content(),
        Some(ParsedSize::FitContent) => taffy::style::Dimension::fit_content(),
        Some(ParsedSize::ViewportWidth(_) | ParsedSize::ViewportHeight(_)) => {
            return Err(UNRESOLVED_VIEWPORT_UNIT.into());
        }
        Some(ParsedSize::Auto) | None => auto(),
    })
}

/// A lower or upper limit of a size. Taffy's limits take no intrinsic keyword (`min_size` and `max_size` are
/// `LengthPercentageAuto`), so `min-content` and the like are refused instead of being read as `auto`.
pub(crate) fn bound(value: &Option<Dimension>) -> Result<LengthPercentageAuto, String> {
    Ok(match value.as_ref().map(Dimension::value).transpose()? {
        Some(ParsedSize::Length(value)) => LengthPercentageAuto::length(value),
        Some(ParsedSize::Percent(value)) => LengthPercentageAuto::percent(value),
        Some(ParsedSize::MinContent | ParsedSize::MaxContent | ParsedSize::FitContent) => {
            return Err("an intrinsic size keyword cannot limit a size (Taffy's minimum and maximum take lengths and percentages); use width or height".into());
        }
        Some(ParsedSize::ViewportWidth(_) | ParsedSize::ViewportHeight(_)) => {
            return Err(UNRESOLVED_VIEWPORT_UNIT.into());
        }
        Some(ParsedSize::Auto) | None => auto(),
    })
}

/// A margin: its pixels, percentage or `auto` (an unset one is zero).
pub(crate) fn margin(value: &Option<Inset>) -> Result<LengthPercentageAuto, String> {
    Ok(match value.as_ref().map(Inset::value).transpose()? {
        Some(ParsedDimension::Length(value)) => LengthPercentageAuto::length(value),
        Some(ParsedDimension::Percent(value)) => LengthPercentageAuto::percent(value),
        Some(ParsedDimension::Auto) => auto(),
        None => LengthPercentageAuto::length(0.0),
    })
}

/// Taffy's alignment for a value; `None` for `auto`, which is "whatever the container's items say" and which
/// only the `self` properties accept.
pub(crate) fn align(value: AlignSpec) -> Option<AlignItems> {
    Some(match value {
        AlignSpec::Start => AlignItems::START,
        AlignSpec::End => AlignItems::END,
        AlignSpec::Center => AlignItems::CENTER,
        AlignSpec::Stretch => AlignItems::STRETCH,
        AlignSpec::Baseline => AlignItems::BASELINE,
        AlignSpec::FlexStart => AlignItems::FLEX_START,
        AlignSpec::FlexEnd => AlignItems::FLEX_END,
        AlignSpec::Auto => return None,
    })
}

pub(crate) fn justify(value: JustifySpec) -> JustifyContent {
    match value {
        JustifySpec::Start => JustifyContent::START,
        JustifySpec::End => JustifyContent::END,
        JustifySpec::Center => JustifyContent::CENTER,
        JustifySpec::SpaceBetween => JustifyContent::SPACE_BETWEEN,
        JustifySpec::SpaceAround => JustifyContent::SPACE_AROUND,
        JustifySpec::SpaceEvenly => JustifyContent::SPACE_EVENLY,
        JustifySpec::FlexStart => JustifyContent::FLEX_START,
        JustifySpec::FlexEnd => JustifyContent::FLEX_END,
        JustifySpec::Stretch => JustifyContent::STRETCH,
        JustifySpec::Normal => JustifyContent::NORMAL,
    }
}

fn overflow(value: Option<OverflowSpec>) -> Overflow {
    // Taffy fca167c style::Overflow and flexbox/grid automatic-minimum-size resolution
    // distinguish Hidden (zero minimum) from Visible (content minimum). Rendering owns clipping
    // separately; this preserves CSS layout semantics.
    match value.unwrap_or(OverflowSpec::Visible) {
        OverflowSpec::Visible => Overflow::Visible,
        OverflowSpec::Hidden => Overflow::Hidden,
        OverflowSpec::Clip => Overflow::Clip,
        // Taffy has no `auto`. `Scroll` reserves a scrollbar's width, and the style's `scrollbar_width`
        // is zero (its default; we never set it), so it lays out exactly as `Hidden` does, which is what
        // overlay scrollbars need (taffy `style/mod.rs`, the doc of `Overflow::Scroll`).
        OverflowSpec::Scroll | OverflowSpec::Auto => Overflow::Scroll,
    }
}

impl StyleSpec {
    /// Overwrite every field `other` sets. The exhaustive destructuring makes adding a field to
    /// `StyleSpec` without merging it a compile error.
    pub fn merge(&mut self, other: &StyleSpec) {
        macro_rules! overwrite {
            ($($field:ident),+ $(,)?) => {{
                let StyleSpec {
                    $($field,)+
                    transition,
                    transition_parts,
                    filter,
                    filter_parts,
                    backdrop_filter,
                    backdrop_filter_parts,
                    transform,
                    transform_parts,
                    inside_transform: _,
                    // Computed from the layers, never merged from one.
                    text_decorations: _,
                    box_shadow,
                    box_shadow_parts,
                    background_image,
                    gradient_parts,
                } = other;
                // A shorthand set by a later layer sets every side, corner or colour again; the longhands the same layer
                // sets are applied after it, so they win (Tailwind's `border border-t-4` is a 4 px top whatever the order).
                if other.border_width.is_some() {
                    self.border_top_width = None;
                    self.border_right_width = None;
                    self.border_bottom_width = None;
                    self.border_left_width = None;
                }
                if other.border_color.is_some() {
                    self.border_top_color = None;
                    self.border_right_color = None;
                    self.border_bottom_color = None;
                    self.border_left_color = None;
                }
                if other.border_radius.is_some() {
                    self.border_top_left_radius = None;
                    self.border_top_right_radius = None;
                    self.border_bottom_right_radius = None;
                    self.border_bottom_left_radius = None;
                }
                $(
                    if $field.is_some() {
                        self.$field = $field.clone();
                    }
                )+
                merge_transition(
                    &mut self.transition,
                    &mut self.transition_parts,
                    transition,
                    transition_parts,
                );
                merge_filter(&mut self.filter, &mut self.filter_parts, filter, filter_parts);
                merge_filter(
                    &mut self.backdrop_filter,
                    &mut self.backdrop_filter_parts,
                    backdrop_filter,
                    backdrop_filter_parts,
                );
                merge_transform(
                    &mut self.transform,
                    &mut self.transform_parts,
                    transform,
                    transform_parts,
);
                merge_listed(
                    &mut self.box_shadow,
                    &mut self.box_shadow_parts,
                    box_shadow,
                    box_shadow_parts,
                    ShadowParts::merge,
                );
                merge_listed(
                    &mut self.background_image,
                    &mut self.gradient_parts,
                    background_image,
                    gradient_parts,
                    GradientParts::merge,
                );
            }};
        }
        overwrite!(
            width,
            height,
            min_width,
            min_height,
            max_width,
            max_height,
            display,
            flex_direction,
            flex_wrap,
            flex_grow,
            flex_shrink,
            flex_basis,
            row_gap,
            column_gap,
            padding_top,
            padding_right,
            padding_bottom,
            padding_left,
            margin_top,
            margin_right,
            margin_bottom,
            margin_left,
            align_items,
            align_self,
            justify_content,
            align_content,
            justify_items,
            justify_self,
            order,
            aspect_ratio,
            box_sizing,
            visibility,
            grid_template_columns,
            grid_template_rows,
            grid_auto_flow,
            grid_auto_columns,
            grid_auto_rows,
            grid_column_start,
            grid_column_end,
            grid_column_span,
            grid_row_start,
            grid_row_end,
            grid_row_span,
            background_color,
            color,
            font_size,
            font_family,
            font_weight,
            font_style,
            line_height,
            letter_spacing,
            text_transform,
            text_decoration_line,
            text_decoration_color,
            text_decoration_style,
            text_decoration_thickness,
            text_underline_offset,
            text_overflow,
            white_space,
            word_break,
            overflow_wrap,
            line_clamp,
            numeric_figure,
            numeric_spacing,
            numeric_fraction,
            ordinal,
            slashed_zero,
            border_radius,
            border_width,
            border_color,
            border_style,
            border_top_left_radius,
            border_top_right_radius,
            border_bottom_right_radius,
            border_bottom_left_radius,
            border_top_width,
            border_right_width,
            border_bottom_width,
            border_left_width,
            border_top_color,
            border_right_color,
            border_bottom_color,
            border_left_color,
            outline_style,
            outline_width,
            outline_color,
            outline_offset,
            opacity,
            text_align,
            interpolate_size,
            overflow_x,
            overflow_y,
            overscroll_behavior,
            scrollbar_width,
            scrollbar_color,
            caret_color,
            placeholder_color,
            touch_action,
            pointer_events,
            cursor,
            user_select,
            selection_color,
            position,
            top,
            right,
            bottom,
            left,
            z_index,
            transform_origin,
        );
    }

    /// The sizes that can be a share of the viewport.
    fn viewport_sized(&mut self) -> [&mut Option<Dimension>; 7] {
        [
            &mut self.width,
            &mut self.height,
            &mut self.min_width,
            &mut self.min_height,
            &mut self.max_width,
            &mut self.max_height,
            &mut self.flex_basis,
        ]
    }

    /// Whether a size is in `vw` or `vh`, so the style must be resolved again when the viewport changes.
    pub fn uses_viewport_units(&self) -> bool {
        self.clone()
            .viewport_sized()
            .into_iter()
            .flatten()
            .any(|size| {
                matches!(
                    size.value(),
                    Ok(ParsedSize::ViewportWidth(_) | ParsedSize::ViewportHeight(_))
                )
            })
    }

    /// Replace every `vw` and `vh` size with the pixels it is for this viewport. Layout takes no viewport
    /// units; a computed style is resolved before it reaches it, and again when the viewport resizes.
    pub fn resolve_viewport_units(&mut self, viewport: Viewport) {
        for size in self.viewport_sized() {
            if let Some(pixels) = size.as_ref().and_then(|size| size.resolved(viewport)) {
                *size = Some(pixels);
            }
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if let Some(transition) = &self.transition {
            transition.validate()?;
        }
        if let Some(parts) = &self.transition_parts {
            parts.validate()?;
        }
        for (name, value) in [
            ("width", &self.width),
            ("height", &self.height),
            ("flexBasis", &self.flex_basis),
        ] {
            if let Some(value) = value {
                value.value().map_err(|error| format!("{name}: {error}"))?;
            }
        }
        for (name, value) in [
            ("minWidth", &self.min_width),
            ("minHeight", &self.min_height),
            ("maxWidth", &self.max_width),
            ("maxHeight", &self.max_height),
        ] {
            if let Some(value) = value {
                value.value().map_err(|error| format!("{name}: {error}"))?;
                if value.is_keyword() {
                    return Err(format!(
                        "{name}: min-content, max-content and fit-content size a box; they cannot limit one (use width or height)"
                    ));
                }
            }
        }
        for (name, value) in [
            ("top", &self.top),
            ("right", &self.right),
            ("bottom", &self.bottom),
            ("left", &self.left),
        ] {
            if let Some(value) = value {
                value.value().map_err(|error| format!("{name}: {error}"))?;
            }
        }
        for (name, value) in [
            ("flexGrow", self.flex_grow),
            ("flexShrink", self.flex_shrink),
            ("rowGap", self.row_gap),
            ("columnGap", self.column_gap),
            ("paddingTop", self.padding_top),
            ("paddingRight", self.padding_right),
            ("paddingBottom", self.padding_bottom),
            ("paddingLeft", self.padding_left),
            ("borderRadius", self.border_radius),
            ("borderWidth", self.border_width),
            ("borderTopLeftRadius", self.border_top_left_radius),
            ("borderTopRightRadius", self.border_top_right_radius),
            ("borderBottomRightRadius", self.border_bottom_right_radius),
            ("borderBottomLeftRadius", self.border_bottom_left_radius),
            ("borderTopWidth", self.border_top_width),
            ("borderRightWidth", self.border_right_width),
            ("borderBottomWidth", self.border_bottom_width),
            ("borderLeftWidth", self.border_left_width),
            ("outlineWidth", self.outline_width),
        ] {
            if value.is_some_and(|value| !value.is_finite() || value < 0.0) {
                return Err(format!("{name} must be a finite nonnegative number"));
            }
        }
        for (name, value) in [
            ("marginTop", &self.margin_top),
            ("marginRight", &self.margin_right),
            ("marginBottom", &self.margin_bottom),
            ("marginLeft", &self.margin_left),
        ] {
            if let Some(value) = value {
                value.value().map_err(|error| format!("{name}: {error}"))?;
            }
        }
        for (name, value) in [
            ("alignItems", self.align_items),
            ("justifyItems", self.justify_items),
        ] {
            if value == Some(AlignSpec::Auto) {
                return Err(format!(
                    "{name} does not take auto (alignSelf and justifySelf do)"
                ));
            }
        }
        if let Some(AspectRatioSpec::Ratio(ratio)) = self.aspect_ratio
            && (!ratio.is_finite() || ratio <= 0.0)
        {
            return Err("aspectRatio must be a positive finite number or auto".into());
        }
        for (name, template) in [
            ("gridTemplateColumns", &self.grid_template_columns),
            ("gridTemplateRows", &self.grid_template_rows),
        ] {
            if let Some(template) = template {
                template
                    .validate()
                    .map_err(|error| format!("{name}: {error}"))?;
            }
        }
        for (name, tracks) in [
            ("gridAutoColumns", &self.grid_auto_columns),
            ("gridAutoRows", &self.grid_auto_rows),
        ] {
            if let Some(tracks) = tracks {
                validate_auto_tracks(tracks).map_err(|error| format!("{name}: {error}"))?;
            }
        }
        for (name, line) in [
            ("gridColumnStart", self.grid_column_start),
            ("gridColumnEnd", self.grid_column_end),
            ("gridRowStart", self.grid_row_start),
            ("gridRowEnd", self.grid_row_end),
        ] {
            if let Some(line) = line {
                line.validate()
                    .map_err(|error| format!("{name}: {error}"))?;
            }
        }
        for (name, span) in [
            ("gridColumnSpan", self.grid_column_span),
            ("gridRowSpan", self.grid_row_span),
        ] {
            if span == Some(0) {
                return Err(format!("{name} must be a positive integer"));
            }
        }
        if self
            .opacity
            .is_some_and(|value| !value.is_finite() || !(0.0..=1.0).contains(&value))
        {
            return Err("opacity must be between 0 and 1".into());
        }
        for (name, list, parts, kind) in [
            (
                "filter",
                &self.filter,
                &self.filter_parts,
                FilterKind::Filter,
            ),
            (
                "backdropFilter",
                &self.backdrop_filter,
                &self.backdrop_filter_parts,
                FilterKind::Backdrop,
            ),
        ] {
            if let Some(list) = list {
                list.validate(kind)
                    .map_err(|error| format!("{name}: {error}"))?;
            }
            if let Some(parts) = parts {
                parts
                    .validate(kind)
                    .map_err(|error| format!("{name}: {error}"))?;
            }
        }
        if let Some(parts) = &self.transform_parts {
            parts
                .to_list()
                .map_err(|error| format!("transform: {error}"))?;
        }
        if self.outline_offset.is_some_and(|value| !value.is_finite()) {
            return Err("outlineOffset must be finite".into());
        }
        if let Some(list) = &self.box_shadow {
            list.validate()
                .map_err(|error| format!("boxShadow: {error}"))?;
        }
        if let Some(parts) = &self.box_shadow_parts {
            parts
                .validate()
                .map_err(|error| format!("boxShadow: {error}"))?;
        }
        if let Some(parts) = &self.gradient_parts {
            parts
                .validate()
                .map_err(|error| format!("backgroundImage: {error}"))?;
        }
        if self.font_size.is_some_and(|value| value <= 0) {
            return Err("fontSize must be a positive integer".into());
        }
        if self
            .font_weight
            .is_some_and(|weight| !(MIN_FONT_WEIGHT..=MAX_FONT_WEIGHT).contains(&weight))
        {
            return Err(format!(
                "fontWeight must be between {MIN_FONT_WEIGHT} and {MAX_FONT_WEIGHT}"
            ));
        }
        if self
            .font_family
            .as_deref()
            .is_some_and(|family| crate::text_style::resolve::family_list(family).is_empty())
        {
            return Err("fontFamily must name a family".into());
        }
        self.validate_text()?;
        for (name, value) in [
            ("backgroundColor", &self.background_color),
            ("color", &self.color),
            ("borderColor", &self.border_color),
            ("borderTopColor", &self.border_top_color),
            ("borderRightColor", &self.border_right_color),
            ("borderBottomColor", &self.border_bottom_color),
            ("borderLeftColor", &self.border_left_color),
            ("outlineColor", &self.outline_color),
            ("scrollbarColor", &self.scrollbar_color),
            ("selectionColor", &self.selection_color),
            ("caretColor", &self.caret_color),
            ("placeholderColor", &self.placeholder_color),
            ("textDecorationColor", &self.text_decoration_color),
        ] {
            if let Some(value) = value {
                let Some(hex) = value.strip_prefix('#') else {
                    return Err(format!("{name} must be a hex color"));
                };
                if !matches!(hex.len(), 3 | 4 | 6 | 8)
                    || !hex.bytes().all(|byte| byte.is_ascii_hexdigit())
                {
                    return Err(format!("{name} must be #RGB, #RGBA, #RRGGBB, or #RRGGBBAA"));
                }
            }
        }
        Ok(())
    }

    /// The Taffy style of a resolved (computed) style.
    pub fn taffy_style(&self) -> Result<taffy::Style, String> {
        self.validate()?;
        let [top, right, bottom, left] = self.border_widths().map(LengthPercentage::length);
        Ok(taffy::Style {
            overflow: Point {
                x: overflow(self.overflow_x),
                y: overflow(self.overflow_y),
            },
            position: match self.position.unwrap_or(PositionSpec::Static) {
                // A transformed element is the containing block of what is absolutely positioned inside it, which
                // Taffy gives to a positioned one. Its insets stay unset: a static element is not moved by them.
                PositionSpec::Static if self.is_transformed() => Position::Relative,
                PositionSpec::Static => Position::Static,
                PositionSpec::Relative => Position::Relative,
                PositionSpec::Absolute => Position::Absolute,
                PositionSpec::Fixed if self.inside_transform => Position::Absolute,
                PositionSpec::Fixed => Position::Fixed,
            },
            inset: if self.position.unwrap_or(PositionSpec::Static) == PositionSpec::Static {
                Rect {
                    left: auto(),
                    right: auto(),
                    top: auto(),
                    bottom: auto(),
                }
            } else {
                Rect {
                    left: inset(&self.left)?,
                    right: inset(&self.right)?,
                    top: inset(&self.top)?,
                    bottom: inset(&self.bottom)?,
                }
            },
            display: match self.display.unwrap_or(DisplaySpec::Flex) {
                DisplaySpec::Flex => Display::Flex,
                DisplaySpec::Grid => Display::Grid,
                DisplaySpec::Block => Display::Block,
                DisplaySpec::FlowRoot => Display::FlowRoot,
                DisplaySpec::None => Display::None,
            },
            box_sizing: match self.box_sizing.unwrap_or(BoxSizingSpec::BorderBox) {
                BoxSizingSpec::BorderBox => BoxSizing::BorderBox,
                BoxSizingSpec::ContentBox => BoxSizing::ContentBox,
            },
            aspect_ratio: match self.aspect_ratio {
                Some(AspectRatioSpec::Ratio(ratio)) => Some(ratio),
                Some(AspectRatioSpec::Auto(AutoKeyword::Auto)) | None => None,
            },
            size: Size {
                width: dimension(&self.width)?,
                height: dimension(&self.height)?,
            },
            min_size: Size {
                width: bound(&self.min_width)?,
                height: bound(&self.min_height)?,
            },
            max_size: Size {
                width: bound(&self.max_width)?,
                height: bound(&self.max_height)?,
            },
            flex_direction: match self.flex_direction.unwrap_or(FlexDirectionSpec::Column) {
                FlexDirectionSpec::Row => FlexDirection::Row,
                FlexDirectionSpec::Column => FlexDirection::Column,
                FlexDirectionSpec::RowReverse => FlexDirection::RowReverse,
                FlexDirectionSpec::ColumnReverse => FlexDirection::ColumnReverse,
            },
            flex_wrap: match self.flex_wrap.unwrap_or(FlexWrapSpec::Nowrap) {
                FlexWrapSpec::Nowrap => FlexWrap::NoWrap,
                FlexWrapSpec::Wrap => FlexWrap::Wrap,
                FlexWrapSpec::WrapReverse => FlexWrap::WrapReverse,
            },
            flex_grow: self.flex_grow.unwrap_or(0.0),
            flex_shrink: self.flex_shrink.unwrap_or(1.0),
            flex_basis: dimension(&self.flex_basis)?,
            gap: Size {
                width: LengthPercentage::length(self.column_gap.unwrap_or(0.0)),
                height: LengthPercentage::length(self.row_gap.unwrap_or(0.0)),
            },
            padding: Rect {
                left: LengthPercentage::length(self.padding_left.unwrap_or(0.0)),
                right: LengthPercentage::length(self.padding_right.unwrap_or(0.0)),
                top: LengthPercentage::length(self.padding_top.unwrap_or(0.0)),
                bottom: LengthPercentage::length(self.padding_bottom.unwrap_or(0.0)),
            },
            margin: Rect {
                left: margin(&self.margin_left)?,
                right: margin(&self.margin_right)?,
                top: margin(&self.margin_top)?,
                bottom: margin(&self.margin_bottom)?,
            },
            border: Rect {
                left,
                right,
                top,
                bottom,
            },
            align_items: self
                .align_items
                .and_then(align)
                .unwrap_or(AlignItems::STRETCH),
            align_self: self.align_self.and_then(align),
            justify_items: self
                .justify_items
                .and_then(align)
                .unwrap_or(AlignItems::NORMAL),
            justify_self: self.justify_self.and_then(align),
            // `normal`, CSS's initial value: flex items pack at the start, and a grid's `auto` tracks stretch.
            justify_content: self
                .justify_content
                .map(justify)
                .unwrap_or(JustifyContent::NORMAL),
            align_content: self
                .align_content
                .map(justify)
                .unwrap_or(AlignContent::NORMAL),
            grid_template_columns: template_components(&self.grid_template_columns)?,
            grid_template_rows: template_components(&self.grid_template_rows)?,
            grid_auto_flow: self.grid_auto_flow.map(Into::into).unwrap_or_default(),
            grid_auto_columns: self
                .grid_auto_columns
                .as_deref()
                .map(auto_tracks)
                .transpose()?
                .unwrap_or_default(),
            grid_auto_rows: self
                .grid_auto_rows
                .as_deref()
                .map(auto_tracks)
                .transpose()?
                .unwrap_or_default(),
            grid_column: placement(
                self.grid_column_start,
                self.grid_column_end,
                self.grid_column_span,
            ),
            grid_row: placement(self.grid_row_start, self.grid_row_end, self.grid_row_span),
            ..taffy::Style::default()
        })
    }
}

fn template_components(
    template: &Option<GridTemplateSpec>,
) -> Result<Vec<taffy::style::GridTemplateComponent<String>>, String> {
    template
        .as_ref()
        .map(GridTemplateSpec::components)
        .transpose()
        .map(Option::unwrap_or_default)
}

/// `keyboardType`: which on-screen keyboard a text input asks for, one to one with
/// `DisplayServer.VirtualKeyboardType`.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum KeyboardTypeSpec {
    Default,
    Multiline,
    Number,
    Decimal,
    Phone,
    Email,
    Url,
    Password,
}

/// Everything a React element asks of native besides its place in the tree. Every field is
/// optional; an absent field is the default.
#[derive(Clone, Debug, Default, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PropsSpec {
    pub style: Option<StyleLayers>,
    pub text: Option<String>,
    /// `Text` only: the styled ranges and inlays of `text` (nested `Text` in JS), see [`crate::text_span`].
    pub spans: Option<Vec<SpanSpec>>,
    pub disabled: Option<bool>,
    /// Set by Suspense while a boundary shows its fallback; the node and its subtree take no space.
    pub hidden: Option<bool>,
    #[serde(rename = "testID")]
    pub test_id: Option<String>,
    /// `0` makes the element focusable and tabbable, `-1` focusable but skipped by Tab.
    /// Buttons are focusable and tabbable without it.
    pub tab_index: Option<i32>,
    /// Focus this element when it is first mounted (the first such element of a commit, in document
    /// order).
    pub auto_focus: Option<bool>,
    /// A press on this element (or inside it, unless a nearer element is `draggable` too) that moves
    /// beyond the drag threshold, or a touch held in place, starts a drag.
    pub draggable: Option<bool>,
    /// What follows the pointer while this element is dragged; `native` when absent.
    pub drag_preview: Option<DragPreviewSpec>,
    /// Accessibility. `Button`, `Text` and `TextInput` have implicit
    /// roles; every other element is exposed only if it has an explicit one.
    pub role: Option<RoleSpec>,
    pub aria_label: Option<String>,
    pub aria_description: Option<String>,
    pub aria_value_text: Option<String>,
    pub aria_placeholder: Option<String>,
    /// Removes the element and its subtree from the accessibility tree.
    pub aria_hidden: Option<bool>,
    pub aria_disabled: Option<bool>,
    pub aria_expanded: Option<bool>,
    pub aria_selected: Option<bool>,
    pub aria_read_only: Option<bool>,
    pub aria_required: Option<bool>,
    pub aria_modal: Option<bool>,
    pub aria_checked: Option<CheckedSpec>,
    pub aria_value_min: Option<f64>,
    pub aria_value_max: Option<f64>,
    pub aria_value_now: Option<f64>,
    pub aria_live: Option<LiveSpec>,
    pub aria_orientation: Option<OrientationSpec>,
    /// The option a combobox is on while focus stays in its input (`aria-activedescendant`), and the
    /// element it controls (`aria-controls`, its list). Native has no DOM ids, so each names an element
    /// by its tag; the tag must be that of an element exposed in the accessibility tree when it is built.
    pub aria_active_descendant: Option<u32>,
    pub aria_controls: Option<u32>,
    /// `TextInput` only. The text a text input starts with; later changes are ignored, as
    /// in the DOM (the buffer owns the text, `setTextAndSelection` replaces it).
    pub default_value: Option<String>,
    pub placeholder: Option<String>,
    /// Fixed when the input is created.
    pub multiline: Option<bool>,
    pub read_only: Option<bool>,
    pub secure: Option<bool>,
    pub select_on_focus: Option<bool>,
    /// The height of a multi-line input in lines.
    pub rows: Option<u32>,
    /// The most UTF-16 code units the user may type into the input.
    pub max_length: Option<u32>,
    pub keyboard_type: Option<KeyboardTypeSpec>,
    /// `Image` only: the id of a texture the root registered (`register_texture`). An image whose id is not
    /// registered draws nothing and takes no size of its own.
    pub source: Option<String>,
    pub fit: Option<ImageFitSpec>,
    pub slice: Option<ImageSliceSpec>,
    pub source_rect: Option<ImageRectSpec>,
    /// A hex colour the picture is multiplied by (`modulate`).
    pub tint_color: Option<String>,
    /// The id of a material the root registered (`register_material`), drawn with the picture only.
    pub material: Option<String>,
    pub flip_x: Option<bool>,
    pub flip_y: Option<bool>,
}

/// A change to one prop inside a commit payload. JSON `null` resets the prop to its default and an
/// absent key leaves it alone, which `Option<Option<T>>` cannot express through serde.
#[derive(Clone, Debug, Default, PartialEq)]
pub enum Patch<T> {
    #[default]
    Keep,
    Reset,
    Set(T),
}

impl<'de, T: Deserialize<'de>> Deserialize<'de> for Patch<T> {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Ok(match Option::<T>::deserialize(deserializer)? {
            Some(value) => Patch::Set(value),
            None => Patch::Reset,
        })
    }
}

impl<T: Clone> Patch<T> {
    fn apply(&self, previous: &Option<T>) -> Option<T> {
        match self {
            Patch::Keep => previous.clone(),
            Patch::Reset => None,
            Patch::Set(value) => Some(value.clone()),
        }
    }
}

/// The same shape as [`PropsSpec`] where each field may also be `null` (reset).
#[derive(Clone, Debug, Default, DeriveDeserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PropsDiff {
    #[serde(default)]
    pub style: Patch<StyleLayers>,
    #[serde(default)]
    pub text: Patch<String>,
    #[serde(default)]
    pub spans: Patch<Vec<SpanSpec>>,
    #[serde(default)]
    pub disabled: Patch<bool>,
    #[serde(default)]
    pub hidden: Patch<bool>,
    #[serde(default, rename = "testID")]
    pub test_id: Patch<String>,
    #[serde(default)]
    pub tab_index: Patch<i32>,
    #[serde(default)]
    pub auto_focus: Patch<bool>,
    #[serde(default)]
    pub draggable: Patch<bool>,
    #[serde(default)]
    pub drag_preview: Patch<DragPreviewSpec>,
    #[serde(default)]
    pub role: Patch<RoleSpec>,
    #[serde(default)]
    pub aria_label: Patch<String>,
    #[serde(default)]
    pub aria_description: Patch<String>,
    #[serde(default)]
    pub aria_value_text: Patch<String>,
    #[serde(default)]
    pub aria_placeholder: Patch<String>,
    #[serde(default)]
    pub aria_hidden: Patch<bool>,
    #[serde(default)]
    pub aria_disabled: Patch<bool>,
    #[serde(default)]
    pub aria_expanded: Patch<bool>,
    #[serde(default)]
    pub aria_selected: Patch<bool>,
    #[serde(default)]
    pub aria_read_only: Patch<bool>,
    #[serde(default)]
    pub aria_required: Patch<bool>,
    #[serde(default)]
    pub aria_modal: Patch<bool>,
    #[serde(default)]
    pub aria_checked: Patch<CheckedSpec>,
    #[serde(default)]
    pub aria_value_min: Patch<f64>,
    #[serde(default)]
    pub aria_value_max: Patch<f64>,
    #[serde(default)]
    pub aria_value_now: Patch<f64>,
    #[serde(default)]
    pub aria_live: Patch<LiveSpec>,
    #[serde(default)]
    pub aria_orientation: Patch<OrientationSpec>,
    #[serde(default)]
    pub aria_active_descendant: Patch<u32>,
    #[serde(default)]
    pub aria_controls: Patch<u32>,
    #[serde(default)]
    pub default_value: Patch<String>,
    #[serde(default)]
    pub placeholder: Patch<String>,
    #[serde(default)]
    pub multiline: Patch<bool>,
    #[serde(default)]
    pub read_only: Patch<bool>,
    #[serde(default)]
    pub secure: Patch<bool>,
    #[serde(default)]
    pub select_on_focus: Patch<bool>,
    #[serde(default)]
    pub rows: Patch<u32>,
    #[serde(default)]
    pub max_length: Patch<u32>,
    #[serde(default)]
    pub keyboard_type: Patch<KeyboardTypeSpec>,
    #[serde(default)]
    pub source: Patch<String>,
    #[serde(default)]
    pub fit: Patch<ImageFitSpec>,
    #[serde(default)]
    pub slice: Patch<ImageSliceSpec>,
    #[serde(default)]
    pub source_rect: Patch<ImageRectSpec>,
    #[serde(default)]
    pub tint_color: Patch<String>,
    #[serde(default)]
    pub material: Patch<String>,
    #[serde(default)]
    pub flip_x: Patch<bool>,
    #[serde(default)]
    pub flip_y: Patch<bool>,
}

impl PropsSpec {
    /// `previous` with `diff` applied. The result is not validated; see [`PropsSpec::validate`].
    pub fn with_diff(&self, diff: &PropsDiff) -> PropsSpec {
        PropsSpec {
            style: diff.style.apply(&self.style),
            text: diff.text.apply(&self.text),
            spans: diff.spans.apply(&self.spans),
            disabled: diff.disabled.apply(&self.disabled),
            hidden: diff.hidden.apply(&self.hidden),
            test_id: diff.test_id.apply(&self.test_id),
            tab_index: diff.tab_index.apply(&self.tab_index),
            auto_focus: diff.auto_focus.apply(&self.auto_focus),
            draggable: diff.draggable.apply(&self.draggable),
            drag_preview: diff.drag_preview.apply(&self.drag_preview),
            role: diff.role.apply(&self.role),
            aria_label: diff.aria_label.apply(&self.aria_label),
            aria_description: diff.aria_description.apply(&self.aria_description),
            aria_value_text: diff.aria_value_text.apply(&self.aria_value_text),
            aria_placeholder: diff.aria_placeholder.apply(&self.aria_placeholder),
            aria_hidden: diff.aria_hidden.apply(&self.aria_hidden),
            aria_disabled: diff.aria_disabled.apply(&self.aria_disabled),
            aria_expanded: diff.aria_expanded.apply(&self.aria_expanded),
            aria_selected: diff.aria_selected.apply(&self.aria_selected),
            aria_read_only: diff.aria_read_only.apply(&self.aria_read_only),
            aria_required: diff.aria_required.apply(&self.aria_required),
            aria_modal: diff.aria_modal.apply(&self.aria_modal),
            aria_checked: diff.aria_checked.apply(&self.aria_checked),
            aria_value_min: diff.aria_value_min.apply(&self.aria_value_min),
            aria_value_max: diff.aria_value_max.apply(&self.aria_value_max),
            aria_value_now: diff.aria_value_now.apply(&self.aria_value_now),
            aria_live: diff.aria_live.apply(&self.aria_live),
            aria_orientation: diff.aria_orientation.apply(&self.aria_orientation),
            aria_active_descendant: diff
                .aria_active_descendant
                .apply(&self.aria_active_descendant),
            aria_controls: diff.aria_controls.apply(&self.aria_controls),
            default_value: diff.default_value.apply(&self.default_value),
            placeholder: diff.placeholder.apply(&self.placeholder),
            multiline: diff.multiline.apply(&self.multiline),
            read_only: diff.read_only.apply(&self.read_only),
            secure: diff.secure.apply(&self.secure),
            select_on_focus: diff.select_on_focus.apply(&self.select_on_focus),
            rows: diff.rows.apply(&self.rows),
            max_length: diff.max_length.apply(&self.max_length),
            keyboard_type: diff.keyboard_type.apply(&self.keyboard_type),
            source: diff.source.apply(&self.source),
            fit: diff.fit.apply(&self.fit),
            slice: diff.slice.apply(&self.slice),
            source_rect: diff.source_rect.apply(&self.source_rect),
            tint_color: diff.tint_color.apply(&self.tint_color),
            material: diff.material.apply(&self.material),
            flip_x: diff.flip_x.apply(&self.flip_x),
            flip_y: diff.flip_y.apply(&self.flip_y),
        }
    }

    pub fn validate(&self, kind: Kind) -> Result<(), String> {
        if let Some(style) = &self.style {
            style.validate()?;
        }
        if self.text.is_some() && kind != Kind::Text {
            return Err("text is only valid on text nodes".into());
        }
        if let Some(spans) = &self.spans {
            if kind != Kind::Text {
                return Err("spans is only valid on text nodes".into());
            }
            validate_spans(spans, self.text.as_deref().unwrap_or(""))
                .map_err(|error| format!("spans: {error}"))?;
        }
        if let Some(index) = self.tab_index
            && !TAB_INDICES.contains(&index)
        {
            return Err(format!("tabIndex must be 0 or -1, not {index}"));
        }
        self.validate_text_input(kind)?;
        self.validate_image(kind)?;
        self.validate_accessibility()
    }

    /// The image props belong to `Image` nodes; their numbers are finite and their sizes and margins nonnegative.
    fn validate_image(&self, kind: Kind) -> Result<(), String> {
        if kind != Kind::Image {
            for (name, present) in [
                ("source", self.source.is_some()),
                ("fit", self.fit.is_some()),
                ("slice", self.slice.is_some()),
                ("sourceRect", self.source_rect.is_some()),
                ("tintColor", self.tint_color.is_some()),
                ("material", self.material.is_some()),
                ("flipX", self.flip_x.is_some()),
                ("flipY", self.flip_y.is_some()),
            ] {
                if present {
                    return Err(format!("{name} is only valid on images"));
                }
            }
            return Ok(());
        }
        for (name, id) in [("source", &self.source), ("material", &self.material)] {
            if id.as_deref() == Some("") {
                return Err(format!("{name} must be a registered id, not an empty string"));
            }
        }
        if let Some(slice) = self.slice {
            for (side, value) in [
                ("top", slice.top),
                ("right", slice.right),
                ("bottom", slice.bottom),
                ("left", slice.left),
            ] {
                if !value.is_finite() || value < 0.0 {
                    return Err(format!("slice.{side} must be a nonnegative number, not {value}"));
                }
            }
            if !matches!(self.fit, None | Some(ImageFitSpec::Fill)) {
                return Err("slice draws the picture over the whole box; it is only valid with fit: fill".into());
            }
        }
        let flipped = self.flip_x == Some(true) || self.flip_y == Some(true);
        if flipped && self.slice.is_some() {
            return Err("flipX and flipY are not valid with slice".into());
        }
        // The engine tiles a whole texture from the box's top left (`canvas_item_add_texture_rect` with `tile`).
        if self.fit == Some(ImageFitSpec::Tile) {
            if self.source_rect.is_some() {
                return Err("sourceRect is not valid with fit: tile".into());
            }
            if flipped {
                return Err("flipX and flipY are not valid with fit: tile".into());
            }
        }
        if let Some(rect) = self.source_rect {
            for (field, value) in [("x", rect.x), ("y", rect.y)] {
                if !value.is_finite() || value < 0.0 {
                    return Err(format!("sourceRect.{field} must be a nonnegative number, not {value}"));
                }
            }
            for (field, value) in [("width", rect.width), ("height", rect.height)] {
                if !value.is_finite() || value <= 0.0 {
                    return Err(format!("sourceRect.{field} must be a positive number, not {value}"));
                }
            }
        }
        if let Some(color) = &self.tint_color {
            // The same rule the style colours follow (`StyleSpec::validate`).
            let valid = color.strip_prefix('#').is_some_and(|hex| {
                matches!(hex.len(), 3 | 4 | 6 | 8) && hex.bytes().all(|byte| byte.is_ascii_hexdigit())
            });
            if !valid {
                return Err(format!("tintColor must be #RGB, #RGBA, #RRGGBB, or #RRGGBBAA, not {color}"));
            }
        }
        Ok(())
    }

    /// The text input props belong to `TextInput` nodes, and `rows` to multi-line ones.
    fn validate_text_input(&self, kind: Kind) -> Result<(), String> {
        if kind != Kind::TextInput {
            for (name, present) in [
                ("defaultValue", self.default_value.is_some()),
                ("placeholder", self.placeholder.is_some()),
                ("multiline", self.multiline.is_some()),
                ("readOnly", self.read_only.is_some()),
                ("secure", self.secure.is_some()),
                ("selectOnFocus", self.select_on_focus.is_some()),
                ("rows", self.rows.is_some()),
                ("maxLength", self.max_length.is_some()),
                ("keyboardType", self.keyboard_type.is_some()),
            ] {
                if present {
                    return Err(format!("{name} is only valid on text inputs"));
                }
            }
            return Ok(());
        }
        match self.rows {
            Some(0) => return Err("rows must be a positive integer".into()),
            Some(_) if !self.is_multiline() => {
                return Err("rows is only valid with multiline".into());
            }
            _ => {}
        }
        Ok(())
    }

    /// Whether `multiline` is set. It cannot change after the input is created.
    pub fn is_multiline(&self) -> bool {
        self.multiline == Some(true)
    }

    /// `multiline` is fixed at creation (the edit buffer's line model depends on it), so an update that
    /// changes it is rejected.
    pub fn validate_update(&self, previous: &PropsSpec, kind: Kind) -> Result<(), String> {
        if kind == Kind::TextInput && self.is_multiline() != previous.is_multiline() {
            return Err("multiline cannot change after a text input is created".into());
        }
        Ok(())
    }

    /// The numeric `aria-value*` props are finite, a range runs from its minimum up, and the elements
    /// `aria-activedescendant` and `aria-controls` name are tags of elements (tag 0 is a layer).
    fn validate_accessibility(&self) -> Result<(), String> {
        for (name, tag) in [
            ("ariaActiveDescendant", self.aria_active_descendant),
            ("ariaControls", self.aria_controls),
        ] {
            if tag == Some(0) {
                return Err(format!("{name} must be the tag of an element, not 0"));
            }
        }
        for (name, value) in [
            ("ariaValueMin", self.aria_value_min),
            ("ariaValueMax", self.aria_value_max),
            ("ariaValueNow", self.aria_value_now),
        ] {
            if value.is_some_and(|value| !value.is_finite()) {
                return Err(format!("{name} must be a finite number"));
            }
        }
        if let (Some(min), Some(max)) = (self.aria_value_min, self.aria_value_max)
            && min > max
        {
            return Err(format!(
                "ariaValueMin ({min}) must not be greater than ariaValueMax ({max})"
            ));
        }
        Ok(())
    }

    /// The element asks to be focused when it is first mounted.
    pub fn is_auto_focus(&self) -> bool {
        self.auto_focus == Some(true)
    }

    pub fn is_disabled(&self) -> bool {
        self.disabled == Some(true)
    }

    /// The element can be dragged (`draggable`).
    pub fn is_draggable(&self) -> bool {
        self.draggable == Some(true)
    }

    /// What follows the pointer while the element is dragged: the native ghost unless `dragPreview`
    /// says `none`.
    pub fn drag_preview_or_default(&self) -> DragPreviewSpec {
        self.drag_preview.unwrap_or(DragPreviewSpec::Native)
    }

    pub fn is_hidden(&self) -> bool {
        self.hidden == Some(true)
    }

    /// Everything that decides whether an element is in the accessibility tree and where: when it
    /// changes, the tree's structure may have. Other accessibility props only change
    /// what an exposed element says.
    pub(crate) fn exposure(&self) -> Exposure {
        Exposure {
            role: self.role,
            hidden: self.aria_hidden == Some(true),
            has_text: self.text.as_deref().is_some_and(|text| !text.is_empty()),
        }
    }
}

/// See [`PropsSpec::exposure`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Exposure {
    pub(crate) role: Option<RoleSpec>,
    pub(crate) hidden: bool,
    pub(crate) has_text: bool,
}

/// Parse a JSON props diff and merge it over `previous`, validating the result for `kind`. This is
/// the one-step form of what a commit payload does for each updated node (`commit::validate`
/// parses the whole payload at once), kept for tests.
#[cfg(test)]
pub fn merge_diff(previous: &PropsSpec, kind: Kind, diff_json: &str) -> Result<PropsSpec, String> {
    let diff: PropsDiff =
        serde_json::from_str(diff_json).map_err(|error| format!("invalid props diff: {error}"))?;
    let merged = previous.with_diff(&diff);
    merged.validate(kind)?;
    Ok(merged)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ALL_FIELDS_JSON: &str = r##"{
        "width":1,"height":2,"minWidth":3,"minHeight":4,"maxWidth":5,"maxHeight":6,
        "display":"grid","flexDirection":"row","flexWrap":"wrap","flexGrow":1,"flexShrink":2,
        "flexBasis":7,"rowGap":8,"columnGap":9,"paddingTop":1,"paddingRight":2,"paddingBottom":3,
        "paddingLeft":4,"marginTop":-1,"marginRight":"auto","marginBottom":"5%","marginLeft":4,
        "alignItems":"center","alignSelf":"end","justifyContent":"space-between",
        "alignContent":"stretch","justifyItems":"center","justifySelf":"auto","order":-2,
        "aspectRatio":1.5,"boxSizing":"content-box","visibility":"hidden",
        "gridTemplateColumns":3,"gridTemplateRows":["auto",{"minmax":[0,"1fr"]}],
        "gridAutoFlow":"column-dense","gridAutoColumns":["min-content"],"gridAutoRows":[40],
        "gridColumnStart":2,"gridColumnEnd":"auto","gridColumnSpan":2,
        "gridRowStart":-1,"gridRowEnd":3,"gridRowSpan":1,
        "backgroundColor":"#fff","color":"#000","fontSize":12,
        "borderRadius":4,"borderWidth":1,"borderColor":"#123","opacity":0.5,"textAlign":"right",
        "transition":{"properties":["width"],"durationMs":10},"interpolateSize":"allow-keywords",
        "overflowX":"hidden","overflowY":"hidden","pointerEvents":"none","cursor":"ew-resize",
        "overscrollBehavior":"contain","scrollbarWidth":"none","scrollbarColor":"#64748b99",
        "touchAction":"pan-y","userSelect":"text","selectionColor":"#3b82f659",
        "caretColor":"#f00","placeholderColor":"#94a3b8",
        "position":"absolute","top":1,"right":"10%","bottom":-2,"left":"auto","zIndex":-3
    }"##;

    fn style(json: &str) -> StyleSpec {
        serde_json::from_str(json).expect("test style must parse")
    }

    #[test]
    fn rejects_unknown_styles_and_invalid_values() {
        assert!(serde_json::from_str::<StyleSpec>(r#"{"imaginaryProperty":12}"#).is_err());
        assert!(serde_json::from_str::<StyleSpec>(r#"{"display":"banana"}"#).is_err());
        // Shorthands and `disabled` are no longer style fields; the compiler expands the former and
        // `disabled` is a prop.
        for json in [
            r#"{"padding":4}"#,
            r#"{"margin":4}"#,
            r#"{"gap":4}"#,
            r#"{"overflow":"hidden"}"#,
            r#"{"disabled":true}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
        for json in [
            r#"{"width":"-2%"}"#,
            r#"{"paddingLeft":-1}"#,
            r#"{"fontSize":0}"#,
            r#"{"color":"red"}"#,
            r#"{"opacity":2}"#,
            r#"{"gridTemplateColumns":0}"#,
        ] {
            assert!(style(json).validate().is_err(), "{json}");
        }
    }

    #[test]
    fn transition_contract_round_trips_typed_values() {
        let json = r#"{
            "transition": {
                "properties": ["height", "backgroundColor"],
                "durationMs": 240.5,
                "delayMs": 20,
                "easing": "ease-in-out"
            },
            "interpolateSize": "allow-keywords",
            "overflowX": "hidden",
            "overflowY": "hidden"
        }"#;
        let style: StyleSpec = serde_json::from_str(json).unwrap();
        style.validate().unwrap();
        let transition = style.transition.as_ref().unwrap();
        assert_eq!(
            transition.properties.animated(),
            [
                TransitionProperty::Height,
                TransitionProperty::BackgroundColor
            ]
        );
        assert_eq!(transition.easing, Some(Easing::EaseInOut));
        assert_eq!(style.interpolate_size, Some(InterpolateSize::AllowKeywords));
        assert_eq!(style.overflow_x, Some(OverflowSpec::Hidden));
        let round_trip: StyleSpec =
            serde_json::from_str(&serde_json::to_string(&style).unwrap()).unwrap();
        assert_eq!(round_trip, style);
        let immediate = self::style(r#"{"transition":{"properties":["opacity"],"durationMs":0}}"#);
        immediate.validate().unwrap();
        assert_eq!(immediate.transition.unwrap().easing, None);
    }

    #[test]
    fn rejects_invalid_transition_shapes_and_timings() {
        for json in [
            r#"{"transition":{"properties":["translate"],"durationMs":100}}"#,
            r#"{"transition":{"properties":["width"],"durationMs":100,"easing":"spring"}}"#,
            r#"{"transition":{"properties":["width"],"durationMs":100,"repeat":2}}"#,
            r#"{"interpolateSize":"always"}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
        for json in [
            r#"{"transition":{"properties":[],"durationMs":100}}"#,
            r#"{"transition":{"properties":["height","height"],"durationMs":100}}"#,
            r#"{"transition":{"properties":["height"],"durationMs":-1}}"#,
            r#"{"transition":{"properties":["height"],"durationMs":100,"delayMs":-1}}"#,
        ] {
            assert!(style(json).validate().is_err(), "{json}");
        }
        for invalid in [f64::INFINITY, f64::NEG_INFINITY, f64::NAN] {
            let mut transition = TransitionSpec {
                properties: TransitionProperties::List(vec![TransitionProperty::Width]),
                duration_ms: invalid,
                delay_ms: None,
                easing: None,
            };
            assert!(transition.validate().is_err());
            transition.duration_ms = 100.0;
            transition.delay_ms = Some(invalid);
            assert!(transition.validate().is_err());
        }
    }

    #[test]
    fn scroll_properties_parse_every_documented_value_and_reject_others() {
        for (json, expected) in [
            ("visible", OverflowSpec::Visible),
            ("hidden", OverflowSpec::Hidden),
            ("scroll", OverflowSpec::Scroll),
            ("auto", OverflowSpec::Auto),
        ] {
            let parsed = style(&format!(r#"{{"overflowX":"{json}","overflowY":"{json}"}}"#));
            assert_eq!(parsed.overflow_x, Some(expected));
            assert_eq!(parsed.overflow_y, Some(expected));
        }
        assert!(OverflowSpec::Scroll.scrolls() && OverflowSpec::Auto.scrolls());
        assert!(!OverflowSpec::Hidden.scrolls() && !OverflowSpec::Visible.scrolls());
        assert!(
            OverflowSpec::Hidden.clips()
                && OverflowSpec::Scroll.clips()
                && OverflowSpec::Auto.clips()
        );
        assert!(!OverflowSpec::Visible.clips());
        for (json, expected) in [
            ("auto", OverscrollBehaviorSpec::Auto),
            ("contain", OverscrollBehaviorSpec::Contain),
        ] {
            let parsed = style(&format!(r#"{{"overscrollBehavior":"{json}"}}"#));
            assert_eq!(parsed.overscroll_behavior, Some(expected));
        }
        for (json, expected) in [
            ("auto", ScrollbarWidthSpec::Auto),
            ("none", ScrollbarWidthSpec::None),
        ] {
            let parsed = style(&format!(r#"{{"scrollbarWidth":"{json}"}}"#));
            assert_eq!(parsed.scrollbar_width, Some(expected));
        }
        for (json, expected) in [
            ("auto", TouchActionSpec::Auto),
            ("none", TouchActionSpec::None),
            ("pan-x", TouchActionSpec::PanX),
            ("pan-y", TouchActionSpec::PanY),
        ] {
            let parsed = style(&format!(r#"{{"touchAction":"{json}"}}"#));
            assert_eq!(parsed.touch_action, Some(expected));
        }
        for json in [
            r#"{"overflowX":"overlay"}"#,
            r#"{"overscrollBehavior":"none"}"#,
            r#"{"scrollbarWidth":"thin"}"#,
            r#"{"touchAction":"manipulation"}"#,
            r#"{"touchAction":"pan_x"}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
        style(r##"{"scrollbarColor":"#64748b99"}"##)
            .validate()
            .unwrap();
        assert!(style(r#"{"scrollbarColor":"slate"}"#).validate().is_err());
    }

    /// Overlay scrollbars take no layout space: `scroll` and `auto` lay out like `hidden` (the
    /// content-based automatic minimum size is zero), and the scroll container's Taffy style stays
    /// a `Scroll` with no scrollbar width. Their range comes from Taffy's own layout.
    #[test]
    fn scroll_and_auto_overflow_lay_out_like_hidden_and_report_a_scroll_range() {
        fn tall_item_layout(overflow: OverflowSpec) -> (f32, f32) {
            use taffy::prelude::TaffyMaxContent;
            let mut tree: taffy::TaffyTree<()> = taffy::TaffyTree::new();
            let content = tree
                .new_leaf(
                    style(r#"{"width":150,"height":400,"flexShrink":0}"#)
                        .taffy_style()
                        .unwrap(),
                )
                .unwrap();
            let container_style = StyleSpec {
                width: Some(Dimension::Num(100.0)),
                height: Some(Dimension::Num(100.0)),
                overflow_x: Some(overflow),
                overflow_y: Some(overflow),
                ..StyleSpec::default()
            };
            let container = tree
                .new_with_children(container_style.taffy_style().unwrap(), &[content])
                .unwrap();
            tree.compute_layout(container, Size::MAX_CONTENT).unwrap();
            let layout = tree.layout(container).unwrap();
            assert_eq!((layout.size.width, layout.size.height), (100.0, 100.0));
            (layout.scroll_width(), layout.scroll_height())
        }
        for overflow in [
            OverflowSpec::Hidden,
            OverflowSpec::Scroll,
            OverflowSpec::Auto,
        ] {
            assert_eq!(tall_item_layout(overflow), (50.0, 300.0), "{overflow:?}");
        }
        let scroller = StyleSpec {
            overflow_y: Some(OverflowSpec::Auto),
            ..StyleSpec::default()
        };
        assert_eq!(scroller.taffy_style().unwrap().overflow.y, Overflow::Scroll);
        assert_eq!(scroller.taffy_style().unwrap().scrollbar_width, 0.0);
    }

    /// A reversed main axis puts the content's start at the far edge, which Taffy reports as a
    /// reversed scrollable overflow with a positive magnitude (what `ScrollRange::new` takes).
    #[test]
    fn a_column_reverse_scroll_container_reports_a_reversed_vertical_range() {
        use taffy::prelude::TaffyMaxContent;
        let mut tree: taffy::TaffyTree<()> = taffy::TaffyTree::new();
        let content = tree
            .new_leaf(
                style(r#"{"width":50,"height":400,"flexShrink":0}"#)
                    .taffy_style()
                    .unwrap(),
            )
            .unwrap();
        let container = tree
            .new_with_children(
                style(r#"{"width":100,"height":100,"flexDirection":"column-reverse","overflowY":"auto"}"#)
                    .taffy_style()
                    .unwrap(),
                &[content],
            )
            .unwrap();
        tree.compute_layout(container, Size::MAX_CONTENT).unwrap();
        let layout = tree.layout(container).unwrap();
        assert!(layout.scrollable_overflow_rect.is_reversed().y);
        assert!(!layout.scrollable_overflow_rect.is_reversed().x);
        assert_eq!(layout.scroll_height(), 300.0);
    }

    #[test]
    fn user_select_and_selection_color_parse_and_validate() {
        for (json, expected) in [
            ("none", UserSelectSpec::None),
            ("text", UserSelectSpec::Text),
        ] {
            let parsed = style(&format!(r#"{{"userSelect":"{json}"}}"#));
            assert_eq!(parsed.user_select, Some(expected), "{json}");
        }
        for json in [
            r#"{"userSelect":"all"}"#,
            r#"{"userSelect":"auto"}"#,
            r#"{"userSelect":"Text"}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
        style(r##"{"selectionColor":"#3b82f659"}"##)
            .validate()
            .unwrap();
        assert!(style(r#"{"selectionColor":"blue"}"#).validate().is_err());
        assert!(
            style(r##"{"selectionColor":"#12345"}"##)
                .validate()
                .is_err()
        );
    }

    #[test]
    fn pointer_events_and_cursor_parse_every_documented_value_and_reject_others() {
        for (json, expected) in [
            ("auto", PointerEventsSpec::Auto),
            ("none", PointerEventsSpec::None),
        ] {
            let parsed = style(&format!(r#"{{"pointerEvents":"{json}"}}"#));
            assert_eq!(parsed.pointer_events, Some(expected));
        }
        let cursors = [
            ("default", CursorSpec::Default),
            ("pointer", CursorSpec::Pointer),
            ("text", CursorSpec::Text),
            ("move", CursorSpec::Move),
            ("grab", CursorSpec::Grab),
            ("grabbing", CursorSpec::Grabbing),
            ("not-allowed", CursorSpec::NotAllowed),
            ("crosshair", CursorSpec::Crosshair),
            ("wait", CursorSpec::Wait),
            ("progress", CursorSpec::Progress),
            ("help", CursorSpec::Help),
            ("ew-resize", CursorSpec::EwResize),
            ("ns-resize", CursorSpec::NsResize),
            ("nesw-resize", CursorSpec::NeswResize),
            ("nwse-resize", CursorSpec::NwseResize),
        ];
        for (json, expected) in cursors {
            let parsed = style(&format!(r#"{{"cursor":"{json}"}}"#));
            assert_eq!(parsed.cursor, Some(expected), "{json}");
            let round_trip = serde_json::to_string(&parsed).unwrap();
            assert!(
                round_trip.contains(&format!(r#""cursor":"{json}""#)),
                "{round_trip}"
            );
        }
        for json in [
            r#"{"pointerEvents":"visiblePainted"}"#,
            r#"{"pointerEvents":"None"}"#,
            r#"{"cursor":"zoom-in"}"#,
            r#"{"cursor":"Pointer"}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
    }

    #[test]
    fn position_insets_and_z_index_parse_and_validate() {
        for (json, expected) in [
            ("static", PositionSpec::Static),
            ("relative", PositionSpec::Relative),
            ("absolute", PositionSpec::Absolute),
            ("fixed", PositionSpec::Fixed),
        ] {
            let parsed = style(&format!(r#"{{"position":"{json}"}}"#));
            assert_eq!(parsed.position, Some(expected), "{json}");
        }
        assert!(PositionSpec::Absolute.is_out_of_flow() && PositionSpec::Fixed.is_out_of_flow());
        assert!(!PositionSpec::Relative.is_out_of_flow() && !PositionSpec::Static.is_out_of_flow());
        assert!(PositionSpec::Relative.is_positioned() && !PositionSpec::Static.is_positioned());
        // Insets may be negative, percentages or auto; `sticky` and the z-index of a fraction are not accepted.
        for json in [
            r#"{"top":-12}"#,
            r#"{"left":"-50%"}"#,
            r#"{"right":"auto"}"#,
            r#"{"bottom":"25.5%"}"#,
            r#"{"zIndex":-1}"#,
            r#"{"zIndex":50}"#,
        ] {
            let parsed = style(json);
            parsed
                .validate()
                .unwrap_or_else(|error| panic!("{json}: {error}"));
            parsed
                .taffy_style()
                .unwrap_or_else(|error| panic!("{json}: {error}"));
        }
        for json in [
            r#"{"position":"sticky"}"#,
            r#"{"position":"Absolute"}"#,
            r#"{"zIndex":1.5}"#,
            r#"{"zIndex":"1"}"#,
            r#"{"inset":0}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
        for json in [
            r#"{"top":"12px"}"#,
            r#"{"left":"fifty%"}"#,
            r#"{"right":"%"}"#,
        ] {
            assert!(style(json).validate().is_err(), "{json}");
        }
        assert_eq!(
            style(r#"{"zIndex":-3}"#).z_index,
            Some(-3),
            "a negative z-index survives parsing"
        );
    }

    /// Which frame is the `location` of an absolute node expressed in? Taffy at the
    /// pinned revision (`oof.rs`, "its `location` is relative to the containing block's border box")
    /// lays an absolute box out in its containing block and reports `location` there, not in its parent,
    /// so the mounting layer's frames follow the paint-parent rule and need no correction. This test
    /// records the observed rule, with a static parent that is neither the containing block nor at the
    /// containing block's origin.
    #[test]
    fn an_absolute_grandchild_is_located_in_its_containing_block_not_its_parent() {
        use taffy::prelude::*;

        let mut tree: TaffyTree<()> = TaffyTree::new();
        let make = |tree: &mut TaffyTree<()>, json: &str, children: &[NodeId]| {
            tree.new_with_children(style(json).taffy_style().unwrap(), children)
                .unwrap()
        };
        // root (500 x 400, not positioned)
        //  └─ block (relative, 300 x 300 at 50, 40, border 5, padding 7): the containing block
        //      └─ parent (static, 100 x 100, margin 20 from the block's content box)
        //          └─ child (absolute, left 11, top 13, 30 x 30)
        let child = make(
            &mut tree,
            r#"{"position":"absolute","left":11,"top":13,"width":30,"height":30}"#,
            &[],
        );
        let parent = make(
            &mut tree,
            r#"{"width":100,"height":100,"marginLeft":20,"marginTop":20}"#,
            &[child],
        );
        let block = make(
            &mut tree,
            r#"{"position":"relative","width":300,"height":300,"marginLeft":50,"marginTop":40,
                "borderWidth":5,"paddingTop":7,"paddingLeft":7}"#,
            &[parent],
        );
        let root = make(&mut tree, r#"{"width":500,"height":400}"#, &[block]);
        tree.compute_layout(root, Size::MAX_CONTENT).unwrap();

        let block_layout = tree.layout(block).unwrap();
        let parent_layout = tree.layout(parent).unwrap();
        let child_layout = tree.layout(child).unwrap();
        assert_eq!(
            (block_layout.location.x, block_layout.location.y),
            (50.0, 40.0)
        );
        // The static parent sits in the block's content box (border and padding) plus its own margin.
        assert_eq!(
            (parent_layout.location.x, parent_layout.location.y),
            (32.0, 32.0)
        );
        // The absolute box is placed by its insets from the containing block's padding box: 11 + border 5
        // from the block's border-box edge. The parent's offset (32, 32) is not in it.
        assert_eq!(
            (child_layout.location.x, child_layout.location.y),
            (16.0, 18.0)
        );
        assert_eq!(
            (child_layout.size.width, child_layout.size.height),
            (30.0, 30.0)
        );
    }

    /// With no positioned ancestor the containing block is the layer root; `fixed` always is, even
    /// inside a positioned ancestor.
    #[test]
    fn an_absolute_box_without_a_positioned_ancestor_and_a_fixed_one_use_the_root() {
        use taffy::prelude::*;

        let mut tree: TaffyTree<()> = TaffyTree::new();
        let make = |tree: &mut TaffyTree<()>, json: &str, children: &[NodeId]| {
            tree.new_with_children(style(json).taffy_style().unwrap(), children)
                .unwrap()
        };
        let absolute = make(
            &mut tree,
            r#"{"position":"absolute","right":10,"bottom":10,"width":30,"height":30}"#,
            &[],
        );
        let fixed = make(
            &mut tree,
            r#"{"position":"fixed","left":0,"top":0,"width":20,"height":20}"#,
            &[],
        );
        let relative = make(
            &mut tree,
            r#"{"position":"relative","width":100,"height":100,"marginLeft":60,"marginTop":60}"#,
            &[fixed],
        );
        let wrapper = make(
            &mut tree,
            r#"{"width":200,"height":200,"marginLeft":70,"marginTop":30}"#,
            &[absolute, relative],
        );
        let root = make(&mut tree, r#"{"width":500,"height":400}"#, &[wrapper]);
        tree.compute_layout(root, Size::MAX_CONTENT).unwrap();

        let absolute_layout = tree.layout(absolute).unwrap();
        assert_eq!(
            (absolute_layout.location.x, absolute_layout.location.y),
            (500.0 - 10.0 - 30.0, 400.0 - 10.0 - 30.0),
            "anchored to the root's right and bottom, not the wrapper's"
        );
        let fixed_layout = tree.layout(fixed).unwrap();
        assert_eq!(
            (fixed_layout.location.x, fixed_layout.location.y),
            (0.0, 0.0),
            "fixed ignores the relative ancestor"
        );
    }

    /// Evidence for the workaround in `layout::compute_tree`: at the pinned Taffy revision a node keeps its
    /// list of hoisted (out-of-flow) boxes when it loses every child, because a childless node is laid out
    /// as a leaf, whose output has no positioning area, so `compute_oof_layout` returns before replacing the
    /// list; the rounding pass then reads the deleted boxes. When a Taffy update fixes this, this test fails:
    /// delete it and the workaround.
    #[test]
    #[should_panic(expected = "invalid SlotMap key used")]
    fn taffy_keeps_a_stale_hoisted_list_when_its_container_loses_every_child() {
        use taffy::prelude::*;

        let mut tree: TaffyTree<()> = TaffyTree::new();
        let make = |tree: &mut TaffyTree<()>, json: &str, children: &[NodeId]| {
            tree.new_with_children(style(json).taffy_style().unwrap(), children)
                .unwrap()
        };
        let item = make(&mut tree, r#"{"height":20}"#, &[]);
        let popover = make(
            &mut tree,
            r#"{"position":"absolute","left":10,"top":10,"width":50}"#,
            &[item],
        );
        let backdrop = make(
            &mut tree,
            r#"{"position":"absolute","left":0,"top":0,"right":0,"bottom":0}"#,
            &[],
        );
        let root = make(
            &mut tree,
            r#"{"width":200,"height":100}"#,
            &[backdrop, popover],
        );
        tree.compute_layout(root, Size::MAX_CONTENT).unwrap();
        assert_eq!(tree.layout(popover).unwrap().location.x, 10.0);

        tree.remove_child_at_index(root, 1).unwrap();
        tree.remove_child_at_index(root, 0).unwrap();
        for node in [item, popover, backdrop] {
            tree.remove(node).unwrap();
        }
        tree.compute_layout(root, Size::MAX_CONTENT).unwrap();
        assert_eq!(tree.layout(root).unwrap().size.width, 200.0);
    }

    #[test]
    fn hidden_overflow_releases_the_flex_content_minimum() {
        use taffy::prelude::*;

        fn item_width(overflow: OverflowSpec) -> f32 {
            let mut tree: TaffyTree<()> = TaffyTree::new();
            let content_style = style(r#"{"width":200,"height":20}"#);
            let content = tree.new_leaf(content_style.taffy_style().unwrap()).unwrap();
            let item_style = StyleSpec {
                overflow_x: Some(overflow),
                overflow_y: Some(overflow),
                ..StyleSpec::default()
            };
            let item = tree
                .new_with_children(item_style.taffy_style().unwrap(), &[content])
                .unwrap();
            let root_style = style(r#"{"width":100,"height":40,"flexDirection":"row"}"#);
            let root = tree
                .new_with_children(root_style.taffy_style().unwrap(), &[item])
                .unwrap();
            tree.compute_layout(root, Size::MAX_CONTENT).unwrap();
            tree.layout(item).unwrap().size.width
        }

        assert_eq!(item_width(OverflowSpec::Visible), 200.0);
        assert_eq!(item_width(OverflowSpec::Hidden), 100.0);
    }

    #[test]
    fn flex_and_grid_use_native_taffy_geometry() {
        use taffy::prelude::*;
        let mut tree: TaffyTree<()> = TaffyTree::new();
        let grid = style(
            r#"{"display":"grid","gridTemplateColumns":2,"width":240,"rowGap":20,"columnGap":20,
                "paddingTop":10,"paddingRight":10,"paddingBottom":10,"paddingLeft":10}"#,
        );
        let child_style = style(r#"{"height":30}"#);
        let first = tree.new_leaf(child_style.taffy_style().unwrap()).unwrap();
        let second = tree.new_leaf(child_style.taffy_style().unwrap()).unwrap();
        let root = tree
            .new_with_children(grid.taffy_style().unwrap(), &[first, second])
            .unwrap();
        tree.compute_layout(root, Size::MAX_CONTENT).unwrap();
        let first_layout = tree.layout(first).unwrap();
        let second_layout = tree.layout(second).unwrap();
        assert_eq!(first_layout.location.x, 10.0);
        assert_eq!(first_layout.size.width, 100.0);
        assert_eq!(second_layout.location.x, 130.0);
        assert_eq!(tree.layout(root).unwrap().size.height, 50.0);
    }

    #[test]
    fn merging_overwrites_exactly_the_fields_the_other_style_sets() {
        // Every field of the all-fields fixture lands in an empty style, so a field added to
        // `StyleSpec` but missed by `merge` fails here (the destructuring in `merge` already makes
        // that a compile error).
        let everything = style(ALL_FIELDS_JSON);
        let mut merged = StyleSpec::default();
        merged.merge(&everything);
        assert_eq!(merged, everything);

        let mut base = style(r##"{"width":10,"backgroundColor":"#111","paddingLeft":4}"##);
        base.merge(&style(r##"{"width":"50%","color":"#222"}"##));
        assert_eq!(
            base,
            style(r##"{"width":"50%","backgroundColor":"#111","paddingLeft":4,"color":"#222"}"##)
        );
        let before = base.clone();
        base.merge(&StyleSpec::default());
        assert_eq!(base, before, "an empty layer changes nothing");
    }

    #[test]
    fn layout_properties_parse_and_the_invalid_ones_are_refused_before_mounting() {
        for json in [
            r#"{"marginLeft":"auto","marginTop":-8,"marginBottom":"-5%"}"#,
            r#"{"width":"fit-content","height":"min-content","flexBasis":"max-content"}"#,
            r#"{"width":"100vw","minHeight":"100vh","maxWidth":"50vw"}"#,
            r#"{"alignSelf":"auto","justifySelf":"auto","justifyItems":"start","alignContent":"normal"}"#,
            r#"{"aspectRatio":"auto"}"#,
            r#"{"display":"block"}"#,
            r#"{"display":"flow-root","overflowX":"clip"}"#,
            r#"{"gridTemplateColumns":[],"gridTemplateRows":[100,"1fr",{"repeat":2,"tracks":["auto"]}]}"#,
            r#"{"gridColumnStart":"auto","gridColumnEnd":-1,"gridRowSpan":3}"#,
        ] {
            let parsed = style(json);
            parsed
                .validate()
                .unwrap_or_else(|error| panic!("{json}: {error}"));
            // The viewport sizes are layout's only once resolved.
            let mut resolved = parsed.clone();
            resolved.resolve_viewport_units(Viewport {
                width: 10.0,
                height: 10.0,
            });
            resolved
                .taffy_style()
                .unwrap_or_else(|error| panic!("{json}: {error}"));
        }
        for (json, mentions) in [
            (r#"{"marginLeft":"calc(1px)"}"#, "marginLeft"),
            (r#"{"marginTop":"min-content"}"#, "marginTop"),
            (r#"{"minWidth":"max-content"}"#, "minWidth"),
            (r#"{"maxHeight":"fit-content"}"#, "maxHeight"),
            (r#"{"width":"-5vw"}"#, "width"),
            (r#"{"alignItems":"auto"}"#, "alignItems"),
            (r#"{"justifyItems":"auto"}"#, "justifyItems"),
            (r#"{"aspectRatio":0}"#, "aspectRatio"),
            (r#"{"aspectRatio":-1}"#, "aspectRatio"),
            (r#"{"gridTemplateColumns":0}"#, "gridTemplateColumns"),
            (r#"{"gridTemplateRows":["2gr"]}"#, "gridTemplateRows"),
            (
                r#"{"gridAutoColumns":[{"repeat":2,"tracks":[10]}]}"#,
                "gridAutoColumns",
            ),
            (r#"{"gridColumnStart":0}"#, "gridColumnStart"),
            (r#"{"gridRowSpan":0}"#, "gridRowSpan"),
        ] {
            let error = style(json).validate().unwrap_err();
            assert!(error.contains(mentions), "{json}: {error}");
        }
        for json in [
            r#"{"visibility":"collapse"}"#,
            r#"{"boxSizing":"padding-box"}"#,
            r#"{"gridAutoFlow":"dense"}"#,
            r#"{"gridColumnStart":"span 2"}"#,
            r#"{"display":"inline"}"#,
            r#"{"order":1.5}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
    }

    #[test]
    fn auto_margins_and_negative_ones_reach_taffy_and_an_unset_one_is_zero() {
        let taffy = style(r#"{"marginLeft":"auto","marginTop":-8,"marginBottom":"25%"}"#)
            .taffy_style()
            .unwrap();
        assert!(taffy.margin.left.is_auto());
        assert_eq!(taffy.margin.top, LengthPercentageAuto::length(-8.0));
        assert_eq!(taffy.margin.bottom, LengthPercentageAuto::percent(0.25));
        assert_eq!(taffy.margin.right, LengthPercentageAuto::length(0.0));
    }

    #[test]
    fn style_layers_parse_with_conditions_and_reject_unknown_keys() {
        let layers: StyleLayers = serde_json::from_str(
            r##"{"layers":[
                {"style":{"backgroundColor":"#fff"}},
                {"minWidth":768,"states":["hover","focusVisible"],"style":{"width":50}}
            ]}"##,
        )
        .unwrap();
        layers.validate().unwrap();
        assert_eq!(layers.layers[0].min_width, None);
        assert!(layers.layers[0].states.is_empty());
        assert_eq!(layers.layers[1].min_width, Some(768.0));
        assert_eq!(
            layers.layers[1].states,
            vec![PseudoState::Hover, PseudoState::FocusVisible]
        );
        assert!(
            serde_json::from_str::<StyleLayers>(r#"{"layers":[{"style":{},"extra":1}]}"#).is_err()
        );
        assert!(
            serde_json::from_str::<StyleLayers>(
                r#"{"layers":[{"states":["pressed"],"style":{}}]}"#
            )
            .is_err()
        );
        let negative: StyleLayers =
            serde_json::from_str(r#"{"layers":[{"minWidth":-1,"style":{}}]}"#).unwrap();
        assert!(negative.validate().is_err());
        let invalid_inner: StyleLayers =
            serde_json::from_str(r#"{"layers":[{"style":{"opacity":3}}]}"#).unwrap();
        assert!(
            invalid_inner
                .validate()
                .unwrap_err()
                .contains("style.layers[0]")
        );
    }

    /// The JS style compiler's output (`tests/fixtures/compiled-styles.json`, checked by
    /// `tests/styles.test.ts`) must be exactly what this crate accepts.
    #[test]
    fn the_js_compilers_output_parses_and_validates() {
        #[derive(DeriveDeserialize)]
        struct Case {
            #[serde(rename = "className")]
            class_name: String,
            compiled: StyleLayers,
        }
        let cases: Vec<Case> =
            serde_json::from_str(include_str!("../tests/fixtures/compiled-styles.json"))
                .expect("the fixture parses with deny_unknown_fields");
        assert!(cases.len() >= 5);
        for case in &cases {
            case.compiled
                .validate()
                .unwrap_or_else(|error| panic!("{}: {error}", case.class_name));
            for layer in &case.compiled.layers {
                layer
                    .style
                    .taffy_style()
                    .unwrap_or_else(|error| panic!("{}: {error}", case.class_name));
            }
        }
        // The cascade survives the round trip: resolving the last case's layers with no
        // conditions gives the overflow, transition and padding the class and inline style set.
        let last = &cases[cases.len() - 1].compiled;
        let mut merged = StyleSpec::default();
        for layer in &last.layers {
            merged.merge(&layer.style);
        }
        assert_eq!(merged.overflow_x, Some(OverflowSpec::Hidden));
        assert_eq!(merged.padding_left, Some(4.0));
        assert_eq!(merged.height, Some(Dimension::Text("auto".into())));
        assert_eq!(
            merged.transition.map(|transition| transition.duration_ms),
            Some(600.0)
        );
    }

    #[test]
    fn diff_distinguishes_keep_reset_and_set() {
        let previous = PropsSpec {
            style: Some(StyleLayers::default()),
            text: Some("old".into()),
            disabled: Some(true),
            hidden: None,
            test_id: Some("id".into()),
            tab_index: Some(0),
            auto_focus: None,
            ..PropsSpec::default()
        };
        // Absent keys are kept, null resets, a value sets.
        let merged = merge_diff(
            &previous,
            Kind::Text,
            r#"{"text":"new","disabled":null,"hidden":true}"#,
        )
        .unwrap();
        assert_eq!(merged.text.as_deref(), Some("new"));
        assert_eq!(merged.disabled, None);
        assert_eq!(merged.hidden, Some(true));
        assert_eq!(merged.test_id.as_deref(), Some("id"));
        assert_eq!(merged.style, previous.style);
        let unchanged = merge_diff(&previous, Kind::Text, "{}").unwrap();
        assert_eq!(unchanged, previous);
        let cleared = merge_diff(&previous, Kind::Text, r#"{"style":null,"testID":null}"#).unwrap();
        assert_eq!(cleared.style, None);
        assert_eq!(cleared.test_id, None);
    }

    #[test]
    fn tab_index_and_auto_focus_merge_reset_and_validate() {
        let previous = PropsSpec {
            tab_index: Some(0),
            ..PropsSpec::default()
        };
        let merged =
            merge_diff(&previous, Kind::View, r#"{"tabIndex":-1,"autoFocus":true}"#).unwrap();
        assert_eq!(merged.tab_index, Some(-1));
        assert!(merged.is_auto_focus());
        let reset =
            merge_diff(&merged, Kind::View, r#"{"tabIndex":null,"autoFocus":null}"#).unwrap();
        assert_eq!(reset.tab_index, None);
        assert!(!reset.is_auto_focus());
        for json in [
            r#"{"tabIndex":1}"#,
            r#"{"tabIndex":-2}"#,
            r#"{"tabIndex":100}"#,
        ] {
            let error = merge_diff(&previous, Kind::View, json).unwrap_err();
            assert!(
                error.starts_with("tabIndex must be 0 or -1"),
                "{json}: {error}"
            );
        }
        assert!(merge_diff(&previous, Kind::View, r#"{"tabIndex":"0"}"#).is_err());
        assert!(merge_diff(&previous, Kind::Button, r#"{"autoFocus":1}"#).is_err());
        // Any kind may take a tabIndex or ask for focus.
        for kind in [Kind::View, Kind::Text, Kind::Button] {
            assert!(merge_diff(&previous, kind, r#"{"tabIndex":0,"autoFocus":true}"#).is_ok());
        }
    }

    #[test]
    fn draggable_and_drag_preview_merge_reset_and_validate() {
        let previous = PropsSpec::default();
        assert!(!previous.is_draggable());
        assert_eq!(previous.drag_preview_or_default(), DragPreviewSpec::Native);
        let merged = merge_diff(
            &previous,
            Kind::View,
            r#"{"draggable":true,"dragPreview":"none"}"#,
        )
        .unwrap();
        assert!(merged.is_draggable());
        assert_eq!(merged.drag_preview_or_default(), DragPreviewSpec::None);
        // Keys that are absent from a diff keep their value; null resets them.
        let kept = merge_diff(&merged, Kind::View, r#"{"testID":"x"}"#).unwrap();
        assert!(kept.is_draggable() && kept.drag_preview == Some(DragPreviewSpec::None));
        let reset = merge_diff(
            &merged,
            Kind::View,
            r#"{"draggable":null,"dragPreview":null}"#,
        )
        .unwrap();
        assert!(!reset.is_draggable());
        assert_eq!(reset.drag_preview_or_default(), DragPreviewSpec::Native);
        // `draggable: false` is a valid value that is not draggable.
        let explicit = merge_diff(&merged, Kind::View, r#"{"draggable":false}"#).unwrap();
        assert!(!explicit.is_draggable());
        for json in [
            r#"{"dragPreview":"sheet"}"#,
            r#"{"dragPreview":"Native"}"#,
            r#"{"dragPreview":1}"#,
            r#"{"draggable":"true"}"#,
            r#"{"draggable":1}"#,
        ] {
            assert!(merge_diff(&previous, Kind::View, json).is_err(), "{json}");
        }
        // Any kind may be dragged.
        for kind in [Kind::View, Kind::Text, Kind::Button] {
            assert!(merge_diff(&previous, kind, r#"{"draggable":true}"#).is_ok());
        }
    }

    #[test]
    fn accessibility_props_parse_merge_reset_and_serialize() {
        let previous = PropsSpec::default();
        let merged = merge_diff(
            &previous,
            Kind::View,
            r#"{"role":"slider","ariaLabel":"Volume","ariaDescription":"d","ariaValueText":"loud",
            "ariaPlaceholder":"p","ariaHidden":true,"ariaDisabled":true,"ariaExpanded":false,
            "ariaSelected":true,"ariaReadOnly":true,"ariaRequired":true,"ariaModal":true,
            "ariaChecked":"mixed","ariaValueMin":0,"ariaValueMax":10,"ariaValueNow":3.5,
            "ariaLive":"assertive","ariaOrientation":"vertical",
            "ariaActiveDescendant":7,"ariaControls":9}"#,
        )
        .unwrap();
        assert_eq!(merged.role, Some(RoleSpec::Slider));
        assert_eq!(merged.aria_label.as_deref(), Some("Volume"));
        assert_eq!(merged.aria_expanded, Some(false), "false is not absent");
        assert_eq!(merged.aria_checked, Some(CheckedSpec::Mixed));
        assert_eq!(merged.aria_value_now, Some(3.5));
        assert_eq!(merged.aria_live, Some(LiveSpec::Assertive));
        assert_eq!(merged.aria_orientation, Some(OrientationSpec::Vertical));
        assert_eq!(merged.aria_active_descendant, Some(7));
        assert_eq!(merged.aria_controls, Some(9));
        assert!(merged.exposure().hidden);
        // Absent keys are kept, null resets.
        let reset = merge_diff(
            &merged,
            Kind::View,
            r#"{"role":null,"ariaChecked":null,"ariaValueNow":null,"ariaLabel":"Other",
            "ariaActiveDescendant":null}"#,
        )
        .unwrap();
        assert_eq!(reset.role, None);
        assert_eq!(reset.aria_checked, None);
        assert_eq!(reset.aria_value_now, None);
        assert_eq!(reset.aria_active_descendant, None, "null resets");
        assert_eq!(reset.aria_controls, Some(9), "an absent key is kept");
        assert_eq!(reset.aria_label.as_deref(), Some("Other"));
        assert_eq!(reset.aria_value_max, Some(10.0));
        assert!(!PropsSpec::default().exposure().hidden);
        // What a snapshot reports is what was sent.
        let json = serde_json::to_value(&merged).unwrap();
        assert_eq!(json["ariaChecked"], serde_json::json!("mixed"));
        assert_eq!(json["role"], serde_json::json!("slider"));
        let checked = merge_diff(&previous, Kind::Button, r#"{"ariaChecked":true}"#).unwrap();
        assert_eq!(
            serde_json::to_value(&checked).unwrap()["ariaChecked"],
            serde_json::json!(true)
        );
    }

    #[test]
    fn every_role_name_parses_and_round_trips() {
        let names = [
            "button",
            "checkbox",
            "switch",
            "radio",
            "radiogroup",
            "group",
            "slider",
            "progressbar",
            "textbox",
            "text",
            "link",
            "list",
            "listitem",
            "listbox",
            "option",
            "combobox",
            "menu",
            "menuitem",
            "menuitemcheckbox",
            "menuitemradio",
            "tablist",
            "tab",
            "tabpanel",
            "dialog",
            "img",
            "region",
            "tooltip",
            "none",
            "presentation",
        ];
        for name in names {
            let role: RoleSpec = serde_json::from_value(serde_json::json!(name)).unwrap();
            assert_eq!(serde_json::to_value(role).unwrap(), serde_json::json!(name));
        }
        for invalid in ["Button", "heading", "", "radio-group"] {
            assert!(
                serde_json::from_value::<RoleSpec>(serde_json::json!(invalid)).is_err(),
                "{invalid:?}"
            );
        }
    }

    #[test]
    fn invalid_accessibility_props_are_rejected() {
        let empty = PropsSpec::default();
        for json in [
            r#"{"role":"heading"}"#,
            r#"{"ariaChecked":"yes"}"#,
            r#"{"ariaChecked":1}"#,
            r#"{"ariaLive":"loud"}"#,
            r#"{"ariaOrientation":"diagonal"}"#,
            r#"{"ariaHidden":"true"}"#,
            r#"{"ariaValueNow":"3"}"#,
            r#"{"ariaActiveDescendant":"7"}"#,
            r#"{"ariaActiveDescendant":-1}"#,
            r#"{"ariaActiveDescendant":0}"#,
            r#"{"ariaControls":0}"#,
            r#"{"ariaControls":1.5}"#,
            r#"{"ariaLabel":3}"#,
            r#"{"ariaImaginary":true}"#,
            r#"{"aria-label":"x"}"#,
        ] {
            assert!(merge_diff(&empty, Kind::View, json).is_err(), "{json}");
        }
        let error =
            merge_diff(&empty, Kind::View, r#"{"ariaValueMin":5,"ariaValueMax":1}"#).unwrap_err();
        assert!(
            error.contains("ariaValueMin (5) must not be greater than ariaValueMax (1)"),
            "{error}"
        );
        // A range is checked against the merged props, not just the diff.
        let with_max = merge_diff(&empty, Kind::View, r#"{"ariaValueMax":1}"#).unwrap();
        assert!(merge_diff(&with_max, Kind::View, r#"{"ariaValueMin":2}"#).is_err());
        assert!(merge_diff(&with_max, Kind::View, r#"{"ariaValueMin":1}"#).is_ok());
        // Any kind may carry any accessibility prop.
        for kind in [Kind::View, Kind::Text, Kind::Button] {
            assert!(merge_diff(&empty, kind, r#"{"role":"group","ariaLabel":""}"#).is_ok());
        }
    }

    #[test]
    fn diff_results_are_validated_for_the_kind() {
        let empty = PropsSpec::default();
        assert!(merge_diff(&empty, Kind::View, r#"{"text":"x"}"#).is_err());
        assert!(merge_diff(&empty, Kind::Button, r#"{"text":"x"}"#).is_err());
        assert!(merge_diff(&empty, Kind::Text, r#"{"text":"x"}"#).is_ok());
        assert!(merge_diff(&empty, Kind::View, r#"{"imaginary":1}"#).is_err());
        assert!(merge_diff(&empty, Kind::View, r#"{"disabled":"yes"}"#).is_err());
        assert!(
            merge_diff(
                &empty,
                Kind::View,
                r#"{"style":{"layers":[{"style":{"fontSize":0}}]}}"#
            )
            .is_err()
        );
        assert!(merge_diff(&empty, Kind::View, "not json").is_err());
    }

    #[test]
    fn text_input_props_are_valid_on_text_inputs_only() {
        let empty = PropsSpec::default();
        let all = r#"{"defaultValue":"abc","placeholder":"p","multiline":true,"readOnly":true,"secure":true,
            "selectOnFocus":true,"rows":4,"maxLength":12,"keyboardType":"email"}"#;
        let merged = merge_diff(&empty, Kind::TextInput, all).unwrap();
        assert_eq!(merged.default_value.as_deref(), Some("abc"));
        assert_eq!(merged.keyboard_type, Some(KeyboardTypeSpec::Email));
        assert!(merged.is_multiline());
        assert_eq!(merged.max_length, Some(12));
        for field in [
            r#"{"defaultValue":"x"}"#,
            r#"{"placeholder":"x"}"#,
            r#"{"multiline":true}"#,
            r#"{"readOnly":true}"#,
            r#"{"secure":true}"#,
            r#"{"selectOnFocus":true}"#,
            r#"{"rows":2}"#,
            r#"{"maxLength":2}"#,
            r#"{"keyboardType":"url"}"#,
        ] {
            for kind in [Kind::View, Kind::Text, Kind::Button] {
                let error = merge_diff(&empty, kind, field).unwrap_err();
                assert!(
                    error.contains("only valid on text inputs"),
                    "{field}: {error}"
                );
            }
        }
        // Resets work like any other prop.
        assert_eq!(
            merge_diff(&merged, Kind::TextInput, r#"{"placeholder":null}"#)
                .unwrap()
                .placeholder,
            None
        );
    }

    #[test]
    fn image_props_are_valid_on_images_only_and_checked() {
        let empty = PropsSpec::default();
        let all = r##"{"source":"oak","fit":"cover","sourceRect":{"x":0,"y":4,"width":8,"height":8},
            "tintColor":"#ff000080","material":"paper","flipX":true,"flipY":false}"##;
        let merged = merge_diff(&empty, Kind::Image, all).unwrap();
        assert_eq!(merged.source.as_deref(), Some("oak"));
        assert_eq!(merged.fit, Some(ImageFitSpec::Cover));
        assert_eq!(merged.flip_x, Some(true));
        let sliced = merge_diff(
            &empty,
            Kind::Image,
            r#"{"source":"paper","slice":{"top":4,"right":4,"bottom":4,"left":4,"fill":false}}"#,
        )
        .unwrap();
        assert_eq!(sliced.slice.map(|slice| slice.fill), Some(Some(false)));
        for field in [
            r#"{"source":"x"}"#,
            r#"{"fit":"contain"}"#,
            r#"{"slice":{"top":1,"right":1,"bottom":1,"left":1}}"#,
            r#"{"sourceRect":{"x":0,"y":0,"width":1,"height":1}}"#,
            r##"{"tintColor":"#fff"}"##,
            r#"{"material":"m"}"#,
            r#"{"flipX":true}"#,
            r#"{"flipY":true}"#,
        ] {
            for kind in [Kind::View, Kind::Text, Kind::Button, Kind::TextInput] {
                let error = merge_diff(&empty, kind, field).unwrap_err();
                assert!(error.contains("only valid on images"), "{field}: {error}");
            }
        }
        for (field, expected) in [
            (r#"{"source":""}"#, "registered id"),
            (r#"{"fit":"stretch"}"#, "unknown variant"),
            (r#"{"slice":{"top":-1,"right":0,"bottom":0,"left":0}}"#, "slice.top"),
            (r#"{"fit":"contain","slice":{"top":1,"right":1,"bottom":1,"left":1}}"#, "fit: fill"),
            (r#"{"flipX":true,"slice":{"top":1,"right":1,"bottom":1,"left":1}}"#, "not valid with slice"),
            (r#"{"sourceRect":{"x":0,"y":0,"width":0,"height":1}}"#, "sourceRect.width"),
            (r#"{"fit":"tile","sourceRect":{"x":0,"y":0,"width":1,"height":1}}"#, "fit: tile"),
            (r#"{"fit":"tile","flipY":true}"#, "fit: tile"),
            (r#"{"tintColor":"red"}"#, "tintColor"),
        ] {
            let error = merge_diff(&empty, Kind::Image, field).unwrap_err();
            assert!(error.contains(expected), "{field}: {error}");
        }
        // Images have no children; resets work like any other prop.
        assert!(!Kind::Image.allows_children());
        assert_eq!(
            merge_diff(&merged, Kind::Image, r#"{"source":null}"#).unwrap().source,
            None
        );
    }

    #[test]
    fn rows_must_be_positive_and_need_a_text_area_and_the_keyboard_must_exist() {
        let empty = PropsSpec::default();
        assert!(merge_diff(&empty, Kind::TextInput, r#"{"multiline":true,"rows":1}"#).is_ok());
        assert!(merge_diff(&empty, Kind::TextInput, r#"{"multiline":true,"rows":0}"#).is_err());
        assert!(merge_diff(&empty, Kind::TextInput, r#"{"rows":3}"#).is_err());
        assert!(merge_diff(&empty, Kind::TextInput, r#"{"multiline":false,"rows":3}"#).is_err());
        assert!(merge_diff(&empty, Kind::TextInput, r#"{"maxLength":0}"#).is_ok());
        assert!(merge_diff(&empty, Kind::TextInput, r#"{"maxLength":-1}"#).is_err());
        assert!(merge_diff(&empty, Kind::TextInput, r#"{"rows":1.5,"multiline":true}"#).is_err());
        for name in [
            "default",
            "multiline",
            "number",
            "decimal",
            "phone",
            "email",
            "url",
            "password",
        ] {
            let json = format!(r#"{{"keyboardType":"{name}"}}"#);
            assert!(merge_diff(&empty, Kind::TextInput, &json).is_ok(), "{name}");
        }
        assert!(merge_diff(&empty, Kind::TextInput, r#"{"keyboardType":"emoji"}"#).is_err());
    }

    #[test]
    fn a_text_input_cannot_change_between_single_and_multi_line() {
        let single = merge_diff(&PropsSpec::default(), Kind::TextInput, "{}").unwrap();
        let multi = merge_diff(&single, Kind::TextInput, r#"{"multiline":true}"#).unwrap();
        assert!(multi.validate_update(&single, Kind::TextInput).is_err());
        assert!(single.validate_update(&multi, Kind::TextInput).is_err());
        assert!(multi.validate_update(&multi, Kind::TextInput).is_ok());
        // `multiline: false` and no `multiline` are the same input.
        let explicit = merge_diff(&single, Kind::TextInput, r#"{"multiline":false}"#).unwrap();
        assert!(explicit.validate_update(&single, Kind::TextInput).is_ok());
        // Other kinds have nothing to check.
        assert!(multi.validate_update(&single, Kind::View).is_ok());
    }

    #[test]
    fn caret_and_placeholder_colours_are_hex_colours() {
        assert!(
            style(r##"{"caretColor":"#4f46e5","placeholderColor":"#94a3b8"}"##)
                .validate()
                .is_ok()
        );
        assert!(style(r#"{"caretColor":"indigo"}"#).validate().is_err());
        assert!(style(r##"{"placeholderColor":"#12"}"##).validate().is_err());
    }

    /// The mounting layer merges layers with `StyleSpec::merge`; this is what `-translate-x-1/2 hover:scale-105` and
    /// `style={{transform}}` come to.
    #[test]
    fn transform_utilities_merge_per_value_and_an_explicit_transform_replaces_them() {
        let mut base = style(r#"{"transformParts":{"translateX":"-50%"}}"#);
        base.merge(&style(
            r#"{"transformParts":{"scaleX":1.05,"scaleY":1.05}}"#,
        ));
        let list = base.transform_list();
        assert_eq!(
            list.css(),
            "translate(-50%, 0px) rotate(0deg) skewX(0deg) skewY(0deg) scaleX(1.05) scaleY(1.05)",
            "the hover layer keeps the translate"
        );
        base.merge(&style(r#"{"transform":"rotate(10deg)"}"#));
        assert_eq!(
            base.transform_list().css(),
            "rotate(10deg)",
            "an inline transform replaces both"
        );
        assert!(base.transform_parts.is_none());
        base.merge(&style(r#"{"transformParts":{"rotate":"45deg"}}"#));
        assert_eq!(
            base.transform_list().css(),
            "translate(0px, 0px) rotate(45deg) skewX(0deg) skewY(0deg) scaleX(1) scaleY(1)",
            "a value set after it takes back the composed list, where only what was set since counts"
        );
        base.merge(&style(r#"{"transformOrigin":"top left"}"#));
        assert_eq!(base.transform_origin_spec().css(), "top left");
    }

    #[test]
    fn a_style_with_perspective_or_garbage_in_a_transform_does_not_parse() {
        for json in [
            r#"{"transform":"perspective(500px) rotateY(30deg)"}"#,
            r#"{"transform":"matrix3d(1,0,0,0.001,0,1,0,0,0,0,1,0,0,0,0,1)"}"#,
            r#"{"transform":"wobble(1)"}"#,
            r#"{"transformOrigin":"1em 2em"}"#,
            r#"{"transformParts":{"scaleX":2},"transform":"rotate(5deg)","bogus":1}"#,
        ] {
            assert!(serde_json::from_str::<StyleSpec>(json).is_err(), "{json}");
        }
        let error = serde_json::from_str::<StyleSpec>(r#"{"transform":"perspective(500px)"}"#)
            .expect_err("refused")
            .to_string();
        assert!(
            error.contains("perspective is not implemented yet"),
            "{error}"
        );
        // A part with a bad value is refused when the style is validated.
        assert!(
            style(r#"{"transformParts":{"translateX":"2em"}}"#)
                .validate()
                .is_err()
        );
        assert!(
            style(r#"{"transformParts":{"rotate":"45"}}"#)
                .validate()
                .is_err()
        );
        assert!(
            style(r#"{"transformParts":{"translateX":"-50%","rotate":"45deg","gpu":true}}"#)
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn a_transformed_element_gives_taffy_the_containing_block_css_gives_it() {
        use taffy::prelude::*;
        // `position` is static, so Taffy would not make it the containing block of its absolute child.
        let build = |transform: &str| {
            let mut tree: TaffyTree<()> = TaffyTree::new();
            let child = tree
                .new_leaf(
                    style(r#"{"position":"absolute","left":11,"top":13,"width":30,"height":30}"#)
                        .taffy_style()
                        .unwrap(),
                )
                .unwrap();
            let parent = tree
                .new_with_children(
                    style(&format!(
                        r#"{{"width":100,"height":100,"marginLeft":20,"marginTop":20{transform}}}"#
                    ))
                    .taffy_style()
                    .unwrap(),
                    &[child],
                )
                .unwrap();
            let root = tree
                .new_with_children(
                    style(r#"{"width":500,"height":400}"#)
                        .taffy_style()
                        .unwrap(),
                    &[parent],
                )
                .unwrap();
            tree.compute_layout(root, Size::MAX_CONTENT).unwrap();
            (
                tree.layout(child).unwrap().location,
                tree.layout(parent).unwrap().location,
            )
        };
        let (plain, _) = build("");
        assert_eq!((plain.x, plain.y), (11.0, 13.0), "against the root");
        let (inside, parent) = build(r#","transform":"rotate(5deg)""#);
        assert_eq!(
            (parent.x, parent.y),
            (20.0, 20.0),
            "layout ignores the transform"
        );
        assert_eq!(
            (inside.x, inside.y),
            (11.0, 13.0),
            "in the transformed parent's frame"
        );
        // A fixed element below a transform is laid out like an absolute one.
        let mut fixed = style(r#"{"position":"fixed"}"#);
        fixed.inside_transform = true;
        assert_eq!(fixed.taffy_style().unwrap().position, Position::Absolute);
        assert_eq!(
            style(r#"{"position":"fixed"}"#)
                .taffy_style()
                .unwrap()
                .position,
            Position::Fixed
        );
        // And a static transformed element does not take its insets as offsets.
        let moved = style(r#"{"left":50,"top":50,"transform":"scale(2)"}"#)
            .taffy_style()
            .unwrap();
        assert_eq!(moved.position, Position::Relative);
        assert_eq!(moved.inset.left, auto());
    }
}
