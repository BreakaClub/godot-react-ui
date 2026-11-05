//! Validated transport model. No Godot objects or callbacks cross this boundary.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use taffy::geometry::{Rect, Size};
use taffy::style::{
    AlignItems, Display, FlexDirection, FlexWrap, JustifyContent, LengthPercentage,
    LengthPercentageAuto,
};
use taffy::style_helpers::{auto, fr, length, minmax};

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    View,
    Text,
    Button,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "op", rename_all = "lowercase", deny_unknown_fields)]
pub enum Command {
    Create { id: u32, kind: Kind },
    Style { id: u32, style: Box<StyleSpec> },
    Text { id: u32, text: String },
    Children { id: u32, children: Vec<u32> },
    Remove { id: u32 },
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum Dimension {
    Num(f32),
    Text(String),
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DisplaySpec {
    Flex,
    Grid,
    None,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FlexDirectionSpec {
    Row,
    Column,
    RowReverse,
    ColumnReverse,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FlexWrapSpec {
    Nowrap,
    Wrap,
    WrapReverse,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AlignSpec {
    Start,
    End,
    Center,
    Stretch,
    Baseline,
    FlexStart,
    FlexEnd,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
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
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TextAlignSpec {
    Left,
    Center,
    Right,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
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
    pub gap: Option<f32>,
    pub row_gap: Option<f32>,
    pub column_gap: Option<f32>,
    pub padding: Option<f32>,
    pub padding_top: Option<f32>,
    pub padding_right: Option<f32>,
    pub padding_bottom: Option<f32>,
    pub padding_left: Option<f32>,
    pub margin: Option<f32>,
    pub margin_top: Option<f32>,
    pub margin_right: Option<f32>,
    pub margin_bottom: Option<f32>,
    pub margin_left: Option<f32>,
    pub align_items: Option<AlignSpec>,
    pub align_self: Option<AlignSpec>,
    pub justify_content: Option<JustifySpec>,
    pub grid_template_columns: Option<u16>,
    pub background_color: Option<String>,
    pub color: Option<String>,
    pub font_size: Option<i32>,
    pub border_radius: Option<f32>,
    pub border_width: Option<f32>,
    pub border_color: Option<String>,
    pub opacity: Option<f32>,
    pub disabled: Option<bool>,
    pub text_align: Option<TextAlignSpec>,
}

impl Dimension {
    fn value(&self) -> Result<ParsedDimension, String> {
        match self {
            Self::Num(value) if value.is_finite() && *value >= 0.0 => {
                Ok(ParsedDimension::Length(*value))
            }
            Self::Num(_) => Err("dimension must be a finite nonnegative number".into()),
            Self::Text(value) if value == "auto" => Ok(ParsedDimension::Auto),
            Self::Text(value) => {
                let percent = value
                    .strip_suffix('%')
                    .and_then(|number| number.parse::<f32>().ok())
                    .filter(|number| number.is_finite() && *number >= 0.0)
                    .ok_or_else(|| {
                        format!(
                            "invalid dimension {value:?}; expected auto or a nonnegative percentage"
                        )
                    })?;
                Ok(ParsedDimension::Percent(percent / 100.0))
            }
        }
    }
}

enum ParsedDimension {
    Length(f32),
    Percent(f32),
    Auto,
}

fn dimension(value: &Option<Dimension>) -> Result<taffy::style::Dimension, String> {
    Ok(match value.as_ref().map(Dimension::value).transpose()? {
        Some(ParsedDimension::Length(value)) => taffy::style::Dimension::length(value),
        Some(ParsedDimension::Percent(value)) => taffy::style::Dimension::percent(value),
        Some(ParsedDimension::Auto) | None => auto(),
    })
}

fn bound(value: &Option<Dimension>) -> Result<LengthPercentageAuto, String> {
    Ok(match value.as_ref().map(Dimension::value).transpose()? {
        Some(ParsedDimension::Length(value)) => LengthPercentageAuto::length(value),
        Some(ParsedDimension::Percent(value)) => LengthPercentageAuto::percent(value),
        Some(ParsedDimension::Auto) | None => auto(),
    })
}

fn align(value: AlignSpec) -> AlignItems {
    match value {
        AlignSpec::Start => AlignItems::START,
        AlignSpec::End => AlignItems::END,
        AlignSpec::Center => AlignItems::CENTER,
        AlignSpec::Stretch => AlignItems::STRETCH,
        AlignSpec::Baseline => AlignItems::BASELINE,
        AlignSpec::FlexStart => AlignItems::FLEX_START,
        AlignSpec::FlexEnd => AlignItems::FLEX_END,
    }
}

fn justify(value: JustifySpec) -> JustifyContent {
    match value {
        JustifySpec::Start => JustifyContent::START,
        JustifySpec::End => JustifyContent::END,
        JustifySpec::Center => JustifyContent::CENTER,
        JustifySpec::SpaceBetween => JustifyContent::SPACE_BETWEEN,
        JustifySpec::SpaceAround => JustifyContent::SPACE_AROUND,
        JustifySpec::SpaceEvenly => JustifyContent::SPACE_EVENLY,
        JustifySpec::FlexStart => JustifyContent::FLEX_START,
        JustifySpec::FlexEnd => JustifyContent::FLEX_END,
    }
}

impl StyleSpec {
    pub fn validate(&self) -> Result<(), String> {
        for (name, value) in [
            ("width", &self.width),
            ("height", &self.height),
            ("minWidth", &self.min_width),
            ("minHeight", &self.min_height),
            ("maxWidth", &self.max_width),
            ("maxHeight", &self.max_height),
            ("flexBasis", &self.flex_basis),
        ] {
            if let Some(value) = value {
                value.value().map_err(|error| format!("{name}: {error}"))?;
            }
        }
        for (name, value) in [
            ("flexGrow", self.flex_grow),
            ("flexShrink", self.flex_shrink),
            ("gap", self.gap),
            ("rowGap", self.row_gap),
            ("columnGap", self.column_gap),
            ("padding", self.padding),
            ("paddingTop", self.padding_top),
            ("paddingRight", self.padding_right),
            ("paddingBottom", self.padding_bottom),
            ("paddingLeft", self.padding_left),
            ("borderRadius", self.border_radius),
            ("borderWidth", self.border_width),
        ] {
            if value.is_some_and(|value| !value.is_finite() || value < 0.0) {
                return Err(format!("{name} must be a finite nonnegative number"));
            }
        }
        for (name, value) in [
            ("margin", self.margin),
            ("marginTop", self.margin_top),
            ("marginRight", self.margin_right),
            ("marginBottom", self.margin_bottom),
            ("marginLeft", self.margin_left),
        ] {
            if value.is_some_and(|value| !value.is_finite()) {
                return Err(format!("{name} must be finite"));
            }
        }
        if self
            .opacity
            .is_some_and(|value| !value.is_finite() || !(0.0..=1.0).contains(&value))
        {
            return Err("opacity must be between 0 and 1".into());
        }
        if self.font_size.is_some_and(|value| value <= 0) {
            return Err("fontSize must be a positive integer".into());
        }
        if self.grid_template_columns == Some(0) {
            return Err("gridTemplateColumns must be a positive integer".into());
        }
        for (name, value) in [
            ("backgroundColor", &self.background_color),
            ("color", &self.color),
            ("borderColor", &self.border_color),
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

    pub fn taffy_style(&self) -> Result<taffy::Style, String> {
        self.validate()?;
        let padding = self.padding.unwrap_or(0.0);
        let margin = self.margin.unwrap_or(0.0);
        let border = LengthPercentage::length(self.border_width.unwrap_or(0.0));
        Ok(taffy::Style {
            display: match self.display.unwrap_or(DisplaySpec::Flex) {
                DisplaySpec::Flex => Display::Flex,
                DisplaySpec::Grid => Display::Grid,
                DisplaySpec::None => Display::None,
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
                width: LengthPercentage::length(self.column_gap.or(self.gap).unwrap_or(0.0)),
                height: LengthPercentage::length(self.row_gap.or(self.gap).unwrap_or(0.0)),
            },
            padding: Rect {
                left: LengthPercentage::length(self.padding_left.unwrap_or(padding)),
                right: LengthPercentage::length(self.padding_right.unwrap_or(padding)),
                top: LengthPercentage::length(self.padding_top.unwrap_or(padding)),
                bottom: LengthPercentage::length(self.padding_bottom.unwrap_or(padding)),
            },
            margin: Rect {
                left: LengthPercentageAuto::length(self.margin_left.unwrap_or(margin)),
                right: LengthPercentageAuto::length(self.margin_right.unwrap_or(margin)),
                top: LengthPercentageAuto::length(self.margin_top.unwrap_or(margin)),
                bottom: LengthPercentageAuto::length(self.margin_bottom.unwrap_or(margin)),
            },
            border: Rect {
                left: border,
                right: border,
                top: border,
                bottom: border,
            },
            align_items: self.align_items.map(align).unwrap_or(AlignItems::STRETCH),
            align_self: self.align_self.map(align),
            justify_content: self
                .justify_content
                .map(justify)
                .unwrap_or(JustifyContent::FLEX_START),
            grid_template_columns: self
                .grid_template_columns
                .map(|count| vec![minmax(length(0.0), fr(1.0)); usize::from(count)])
                .unwrap_or_default(),
            ..taffy::Style::default()
        })
    }
}

#[derive(Clone, Debug)]
pub struct ModelNode {
    pub id: u32,
    pub kind: Kind,
    pub style: StyleSpec,
    pub text: String,
    pub children: Vec<u32>,
    pub parent: Option<u32>,
}

impl ModelNode {
    fn new(id: u32, kind: Kind) -> Self {
        Self {
            id,
            kind,
            style: StyleSpec::default(),
            text: String::new(),
            children: Vec::new(),
            parent: None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct Model {
    pub nodes: BTreeMap<u32, ModelNode>,
    pub used_ids: BTreeSet<u32>,
}

impl Default for Model {
    fn default() -> Self {
        Self {
            nodes: BTreeMap::from([(0, ModelNode::new(0, Kind::View))]),
            used_ids: BTreeSet::from([0]),
        }
    }
}

impl Model {
    /// The caller stages a clone and only publishes it when this succeeds.
    pub fn apply(&mut self, commands: &[Command]) -> Result<(), String> {
        for (index, command) in commands.iter().enumerate() {
            self.apply_one(command)
                .map_err(|error| format!("command {index}: {error}"))?;
        }
        self.validate_tree()
    }

    fn node_mut(&mut self, id: u32) -> Result<&mut ModelNode, String> {
        self.nodes
            .get_mut(&id)
            .ok_or_else(|| format!("node {id} does not exist"))
    }

    fn apply_one(&mut self, command: &Command) -> Result<(), String> {
        match command {
            Command::Create { id, kind } => {
                if !self.used_ids.insert(*id) {
                    return Err(format!("node ID {id} has already been used"));
                }
                self.nodes.insert(*id, ModelNode::new(*id, *kind));
            }
            Command::Style { id, style } => {
                style.validate()?;
                self.node_mut(*id)?.style = style.as_ref().clone();
            }
            Command::Text { id, text } => self.node_mut(*id)?.text = text.clone(),
            Command::Children { id, children } => {
                if !self.nodes.contains_key(id) {
                    return Err(format!("node {id} does not exist"));
                }
                let mut unique = BTreeSet::new();
                for child in children {
                    if *child == 0 {
                        return Err("the viewport root cannot be reparented".into());
                    }
                    if !self.nodes.contains_key(child) {
                        return Err(format!("child {child} does not exist"));
                    }
                    if !unique.insert(*child) {
                        return Err(format!("child {child} occurs more than once"));
                    }
                    let mut ancestor = Some(*id);
                    while let Some(current) = ancestor {
                        if current == *child {
                            return Err(format!(
                                "parenting {child} under {id} would create a cycle"
                            ));
                        }
                        ancestor = self.nodes.get(&current).and_then(|node| node.parent);
                    }
                }
                let previous = std::mem::take(&mut self.node_mut(*id)?.children);
                for child in previous {
                    self.node_mut(child)?.parent = None;
                }
                for child in children {
                    let previous_parent = self.nodes.get(child).and_then(|node| node.parent);
                    if let Some(previous_parent) = previous_parent {
                        self.node_mut(previous_parent)?
                            .children
                            .retain(|candidate| candidate != child);
                    }
                    self.node_mut(*child)?.parent = Some(*id);
                }
                self.node_mut(*id)?.children = children.clone();
            }
            Command::Remove { id } => {
                if *id == 0 {
                    return Err("the viewport root cannot be removed".into());
                }
                let parent = self
                    .nodes
                    .get(id)
                    .ok_or_else(|| format!("node {id} does not exist"))?
                    .parent;
                if let Some(parent) = parent {
                    self.node_mut(parent)?.children.retain(|child| child != id);
                }
                let mut pending = vec![*id];
                while let Some(current) = pending.pop() {
                    let node = self
                        .nodes
                        .remove(&current)
                        .ok_or_else(|| format!("node {current} does not exist"))?;
                    pending.extend(node.children);
                }
            }
        }
        Ok(())
    }

    fn validate_tree(&self) -> Result<(), String> {
        for node in self.nodes.values() {
            if node.kind == Kind::Text && !node.children.is_empty() {
                return Err(format!("text node {} cannot have children", node.id));
            }
            if !node.text.is_empty() && !node.children.is_empty() {
                return Err(format!(
                    "node {} cannot contain both native text and children",
                    node.id
                ));
            }
            for child in &node.children {
                if self.nodes.get(child).and_then(|child| child.parent) != Some(node.id) {
                    return Err(format!("inconsistent parent for node {child}"));
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn commands(json: &str) -> Vec<Command> {
        serde_json::from_str(json).expect("test commands must parse")
    }

    #[test]
    fn stages_invalid_batch_without_changing_live_model() {
        let live = Model::default();
        let mut staged = live.clone();
        let result = staged.apply(&commands(
            r#"[{"op":"create","id":1,"kind":"view"},{"op":"children","id":0,"children":[99]}]"#,
        ));
        assert!(result.is_err());
        assert_eq!(live.nodes.len(), 1);
        assert!(!live.used_ids.contains(&1));
    }

    #[test]
    fn rejects_cycles_and_duplicate_children() {
        let mut model = Model::default();
        model.apply(&commands(r#"[{"op":"create","id":1,"kind":"view"},{"op":"create","id":2,"kind":"view"},{"op":"children","id":0,"children":[1]},{"op":"children","id":1,"children":[2]}]"#)).unwrap();
        assert!(
            model
                .clone()
                .apply(&commands(r#"[{"op":"children","id":2,"children":[1]}]"#))
                .unwrap_err()
                .contains("cycle")
        );
        assert!(
            model
                .clone()
                .apply(&commands(r#"[{"op":"children","id":0,"children":[1,1]}]"#))
                .is_err()
        );
    }

    #[test]
    fn reparenting_updates_both_sides_and_removal_preserves_used_ids() {
        let mut model = Model::default();
        model.apply(&commands(r#"[{"op":"create","id":1,"kind":"view"},{"op":"create","id":2,"kind":"button"},{"op":"create","id":3,"kind":"text"},{"op":"children","id":1,"children":[3]},{"op":"children","id":0,"children":[1,2]},{"op":"children","id":2,"children":[3]}]"#)).unwrap();
        assert!(model.nodes[&1].children.is_empty());
        assert_eq!(model.nodes[&3].parent, Some(2));
        model
            .apply(&commands(r#"[{"op":"remove","id":2}]"#))
            .unwrap();
        assert_eq!(model.nodes[&0].children, vec![1]);
        assert!(!model.nodes.contains_key(&3));
        assert!(
            model
                .apply(&commands(r#"[{"op":"create","id":3,"kind":"text"}]"#))
                .is_err()
        );
    }

    #[test]
    fn rejects_unknown_styles_and_invalid_values() {
        assert!(serde_json::from_str::<StyleSpec>(r#"{"imaginaryProperty":12}"#).is_err());
        assert!(serde_json::from_str::<StyleSpec>(r#"{"display":"banana"}"#).is_err());
        for json in [
            r#"{"width":"-2%"}"#,
            r#"{"padding":-1}"#,
            r#"{"fontSize":0}"#,
            r#"{"color":"red"}"#,
            r#"{"opacity":2}"#,
            r#"{"gridTemplateColumns":0}"#,
        ] {
            assert!(
                serde_json::from_str::<StyleSpec>(json)
                    .unwrap()
                    .validate()
                    .is_err(),
                "{json}"
            );
        }
    }

    #[test]
    fn validates_leaf_shape_after_all_commands() {
        let mut model = Model::default();
        model.apply(&commands(r#"[{"op":"create","id":1,"kind":"button"},{"op":"text","id":1,"text":"before"},{"op":"create","id":2,"kind":"text"},{"op":"children","id":1,"children":[2]},{"op":"text","id":1,"text":""}]"#)).unwrap();
        assert!(
            model
                .clone()
                .apply(&commands(r#"[{"op":"text","id":1,"text":"invalid"}]"#))
                .is_err()
        );
        assert!(
            model
                .clone()
                .apply(&commands(r#"[{"op":"children","id":2,"children":[1]}]"#))
                .is_err()
        );
    }

    #[test]
    fn flex_and_grid_use_native_taffy_geometry() {
        use taffy::prelude::*;
        let mut tree: TaffyTree<()> = TaffyTree::new();
        let style: StyleSpec = serde_json::from_str(
            r#"{"display":"grid","gridTemplateColumns":2,"width":240,"gap":20,"padding":10}"#,
        )
        .unwrap();
        let child_style: StyleSpec = serde_json::from_str(r#"{"height":30}"#).unwrap();
        let first = tree.new_leaf(child_style.taffy_style().unwrap()).unwrap();
        let second = tree.new_leaf(child_style.taffy_style().unwrap()).unwrap();
        let root = tree
            .new_with_children(style.taffy_style().unwrap(), &[first, second])
            .unwrap();
        tree.compute_layout(root, Size::MAX_CONTENT).unwrap();
        let first_layout = tree.layout(first).unwrap();
        let second_layout = tree.layout(second).unwrap();
        assert_eq!(first_layout.location.x, 10.0);
        assert_eq!(first_layout.size.width, 100.0);
        assert_eq!(second_layout.location.x, 130.0);
        assert_eq!(tree.layout(root).unwrap().size.height, 50.0);
    }
}
