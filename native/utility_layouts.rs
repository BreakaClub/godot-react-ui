//! The layout utilities against Taffy, with the geometry CSS gives them (the Chrome comparison in
//! `demo/src/verify-layout-utilities.ts` checks the same against a browser). Each test builds a small tree from
//! style JSON as the TypeScript compiler writes it, so a class and its layout are tied together, and the compiled
//! output of the whole class list (`tests/fixtures/utilities-layout-styles.json`) must parse, validate and convert.

use serde::Deserialize as DeriveDeserialize;
use taffy::prelude::{AvailableSpace, NodeId, Size, TaffyTree};

use crate::computed_style::{InheritedStyle, PseudoStates, StyleConditions, resolve};
use crate::props::{StyleLayers, StyleSpec, Viewport};

fn style(json: &str) -> taffy::Style {
    serde_json::from_str::<StyleSpec>(json)
        .expect("test style must parse")
        .taffy_style()
        .expect("test style must be valid")
}

struct Scene {
    tree: TaffyTree<()>,
}

impl Scene {
    fn new() -> Self {
        Scene {
            tree: TaffyTree::new(),
        }
    }

    fn leaf(&mut self, json: &str) -> NodeId {
        self.tree.new_leaf(style(json)).unwrap()
    }

    fn node(&mut self, json: &str, children: &[NodeId]) -> NodeId {
        self.tree.new_with_children(style(json), children).unwrap()
    }

    fn compute(&mut self, root: NodeId, width: f32, height: f32) {
        self.tree
            .compute_layout(
                root,
                Size {
                    width: AvailableSpace::Definite(width),
                    height: AvailableSpace::Definite(height),
                },
            )
            .unwrap();
    }

    /// `[x, y, width, height]` of a node, relative to its parent.
    fn rect(&self, node: NodeId) -> [f32; 4] {
        let layout = self.tree.layout(node).unwrap();
        [
            layout.location.x,
            layout.location.y,
            layout.size.width,
            layout.size.height,
        ]
    }
}

#[test]
fn auto_margins_centre_push_and_split_the_free_space() {
    let mut scene = Scene::new();
    // `mx-auto` in a column: the free cross space splits evenly.
    let centred =
        scene.leaf(r#"{"width":50,"height":10,"marginLeft":"auto","marginRight":"auto"}"#);
    // `ml-auto` in a row: the free main space goes before the item.
    let first = scene.leaf(r#"{"width":50,"height":10}"#);
    let pushed = scene.leaf(r#"{"width":50,"height":10,"marginLeft":"auto"}"#);
    let row = scene.node(r#"{"flexDirection":"row"}"#, &[first, pushed]);
    // `my-auto` in a row: vertically centred.
    let middle = scene.leaf(r#"{"width":20,"height":10,"marginTop":"auto","marginBottom":"auto"}"#);
    let tall = scene.node(r#"{"flexDirection":"row","height":50}"#, &[middle]);
    let root = scene.node(r#"{"width":200,"height":300}"#, &[centred, row, tall]);
    scene.compute(root, 200.0, 300.0);
    assert_eq!(scene.rect(centred), [75.0, 0.0, 50.0, 10.0]);
    assert_eq!(scene.rect(pushed)[0], 150.0);
    assert_eq!(scene.rect(first)[0], 0.0);
    assert_eq!(scene.rect(middle)[1], 20.0);
}

#[test]
fn negative_and_percentage_margins_move_the_box_and_its_neighbours() {
    let mut scene = Scene::new();
    let first = scene.leaf(r#"{"height":30}"#);
    // `-mt-2`: the next sibling starts 8 px into the first.
    let second = scene.leaf(r#"{"height":30,"marginTop":-8}"#);
    // `m-[10%]`: a tenth of the container's width on every side.
    let third = scene.leaf(r#"{"height":10,"marginLeft":"10%","marginTop":"10%"}"#);
    let root = scene.node(r#"{"width":200}"#, &[first, second, third]);
    scene.compute(root, 200.0, 400.0);
    assert_eq!(scene.rect(second)[1], 22.0);
    assert_eq!(scene.rect(third)[0], 20.0);
    assert_eq!(
        scene.rect(third)[1],
        22.0 + 30.0 + 20.0,
        "a percentage margin is of the width"
    );
    // A negative margin on the main axis widens the line: -mx-1 on both sides of a full-width item.
    let wide = scene.leaf(r#"{"height":5,"marginLeft":-4,"marginRight":-4}"#);
    let container = scene.node(
        r#"{"width":100,"paddingLeft":10,"paddingRight":10}"#,
        &[wide],
    );
    scene.compute(container, 100.0, 100.0);
    assert_eq!(scene.rect(wide), [6.0, 0.0, 88.0, 5.0]);
}

#[test]
fn min_width_zero_lets_a_flex_item_shrink_below_its_content_and_auto_does_not() {
    let mut scene = Scene::new();
    let content = scene.leaf(r#"{"width":200,"height":10,"flexShrink":0}"#);
    let unshrinkable = scene.node(r#"{"flexDirection":"row"}"#, &[content]);
    let row = scene.node(r#"{"flexDirection":"row","width":100}"#, &[unshrinkable]);
    scene.compute(row, 100.0, 100.0);
    assert_eq!(
        scene.rect(unshrinkable)[2],
        200.0,
        "min-width: auto is the content's width"
    );

    let content = scene.leaf(r#"{"width":200,"height":10,"flexShrink":0}"#);
    let shrinkable = scene.node(r#"{"flexDirection":"row","minWidth":0}"#, &[content]);
    let row = scene.node(r#"{"flexDirection":"row","width":100}"#, &[shrinkable]);
    scene.compute(row, 100.0, 100.0);
    assert_eq!(scene.rect(shrinkable)[2], 100.0, "min-w-0 lets it give way");

    // And `overflow-clip` is not a scroll container, so it keeps the automatic minimum; `overflow-hidden` is one.
    for (overflow, expected) in [("clip", 200.0), ("hidden", 100.0)] {
        let content = scene.leaf(r#"{"width":200,"height":10,"flexShrink":0}"#);
        let item = scene.node(
            &format!(r#"{{"flexDirection":"row","overflowX":"{overflow}"}}"#),
            &[content],
        );
        let row = scene.node(r#"{"flexDirection":"row","width":100}"#, &[item]);
        scene.compute(row, 100.0, 100.0);
        assert_eq!(scene.rect(item)[2], expected, "overflow-{overflow}");
    }
}

#[test]
fn intrinsic_widths_fit_the_content() {
    // Three items of 30, 40 and 50 px in a wrapping row, with a 5 px gap: min-content is the widest item,
    // max-content all of them and the gaps, fit-content the room there is within those.
    let widths = |keyword: &str, available: f32| {
        let mut scene = Scene::new();
        let items: Vec<_> = [30, 40, 50]
            .iter()
            .map(|width| {
                scene.leaf(&format!(
                    r#"{{"width":{width},"height":10,"flexShrink":0}}"#
                ))
            })
            .collect();
        let container = scene.node(
            &format!(r#"{{"flexDirection":"row","flexWrap":"wrap","rowGap":5,"columnGap":5,"width":"{keyword}"}}"#),
            &items,
        );
        let root = scene.node(r#"{"alignItems":"flex-start"}"#, &[container]);
        scene.compute(root, available, 400.0);
        scene.rect(container)[2]
    };
    assert_eq!(widths("min-content", 300.0), 50.0);
    assert_eq!(widths("max-content", 300.0), 130.0);
    assert_eq!(widths("fit-content", 300.0), 130.0, "room for all of it");
    assert_eq!(
        widths("fit-content", 90.0),
        90.0,
        "as much as there is, once it is less than the content"
    );
    assert_eq!(
        widths("fit-content", 20.0),
        50.0,
        "never less than the narrowest"
    );
}

#[test]
fn a_size_limit_cannot_be_an_intrinsic_keyword_and_says_why() {
    let error = serde_json::from_str::<StyleSpec>(r#"{"minWidth":"min-content"}"#)
        .unwrap()
        .validate()
        .unwrap_err();
    assert!(
        error.contains("minWidth") && error.contains("cannot limit"),
        "{error}"
    );
    assert!(
        serde_json::from_str::<StyleSpec>(r#"{"width":"calc(1px)"}"#)
            .unwrap()
            .validate()
            .is_err()
    );
}

#[test]
fn a_box_sized_by_the_viewport_must_be_resolved_before_layout() {
    let spec = serde_json::from_str::<StyleSpec>(r#"{"width":"50vw","height":"100vh"}"#).unwrap();
    spec.validate().unwrap();
    assert!(
        spec.taffy_style().unwrap_err().contains("viewport unit"),
        "layout never sees vw or vh"
    );
    let mut resolved = spec;
    resolved.resolve_viewport_units(Viewport {
        width: 400.0,
        height: 300.0,
    });
    let mut scene = Scene::new();
    let leaf = scene
        .tree
        .new_leaf(resolved.taffy_style().unwrap())
        .unwrap();
    let root = scene.node(r#"{}"#, &[leaf]);
    scene.compute(root, 400.0, 300.0);
    assert_eq!(scene.rect(leaf)[2..], [200.0, 300.0]);
}

#[test]
fn grid_templates_place_spans_and_flow() {
    let mut scene = Scene::new();
    // `grid-cols-[100px_1fr_auto]` with a 40 px auto item in the third track and a 2-column span.
    let a = scene.leaf(r#"{"height":10,"gridColumnSpan":2}"#);
    let b = scene.leaf(r#"{"height":10,"width":40}"#);
    let c = scene.leaf(r#"{"height":10,"gridColumnStart":2}"#);
    let grid = scene.node(
        r#"{"display":"grid","width":300,"gridTemplateColumns":[100,"1fr","auto"],"rowGap":4,"columnGap":10}"#,
        &[a, b, c],
    );
    scene.compute(grid, 300.0, 100.0);
    // The 40 px item is the auto track's content: columns are 100, 300 - 100 - 40 - 20 = 140, 40.
    assert_eq!(
        scene.rect(a),
        [0.0, 0.0, 250.0, 10.0],
        "col-span-2 covers the first two tracks and the gap"
    );
    assert_eq!(
        scene.rect(b)[0..2],
        [260.0, 0.0],
        "the next free cell is the third track"
    );
    assert_eq!(
        scene.rect(c)[0..2],
        [110.0, 14.0],
        "col-start-2 begins at the second line, on the next row"
    );

    // A line beats a span whichever class named it: `col-start-2 col-span-2` is lines 2 to 4.
    let mut scene = Scene::new();
    let item = scene.leaf(r#"{"height":10,"gridColumnStart":2,"gridColumnSpan":2}"#);
    let grid = scene.node(
        r#"{"display":"grid","width":300,"gridTemplateColumns":3}"#,
        &[item],
    );
    scene.compute(grid, 300.0, 100.0);
    assert_eq!(scene.rect(item)[0..3], [100.0, 0.0, 200.0]);

    // `grid-flow-col` fills columns down the template's rows first.
    let mut scene = Scene::new();
    let items: Vec<_> = (0..4).map(|_| scene.leaf(r#"{"height":10}"#)).collect();
    let grid = scene.node(
        r#"{"display":"grid","width":200,"gridTemplateRows":2,"gridAutoFlow":"column","gridAutoColumns":[50]}"#,
        &items,
    );
    scene.compute(grid, 200.0, 100.0);
    assert_eq!(scene.rect(items[1])[0..2], [0.0, 10.0]);
    assert_eq!(scene.rect(items[2])[0..2], [50.0, 0.0]);
    assert_eq!(scene.rect(items[3])[0..2], [50.0, 10.0]);

    // `auto-rows-[40px]` sizes the rows the template did not name.
    let mut scene = Scene::new();
    let items: Vec<_> = (0..4).map(|_| scene.leaf(r#"{}"#)).collect();
    let grid = scene.node(
        r#"{"display":"grid","width":200,"gridTemplateColumns":2,"gridAutoRows":[40]}"#,
        &items,
    );
    scene.compute(grid, 200.0, 100.0);
    assert_eq!(scene.rect(items[2])[0..4], [0.0, 40.0, 100.0, 40.0]);
}

#[test]
fn grid_repetition_fills_the_container() {
    let mut scene = Scene::new();
    let items: Vec<_> = (0..5).map(|_| scene.leaf(r#"{"height":10}"#)).collect();
    let grid = scene.node(
        r#"{"display":"grid","width":350,"gridTemplateColumns":[{"repeat":"auto-fill","tracks":[{"minmax":[100,"1fr"]}]}]}"#,
        &items,
    );
    scene.compute(grid, 350.0, 100.0);
    // 350 / 100 = 3 columns, each a third.
    assert!(
        (scene.rect(items[1])[0] - 350.0 / 3.0).abs() <= 1.0,
        "layout is rounded to whole pixels"
    );
    assert_eq!(scene.rect(items[3])[0..2], [0.0, 10.0]);
}

#[test]
fn alignment_utilities_place_lines_items_and_self() {
    let mut scene = Scene::new();
    // `content-between` on a wrapping row spreads the two lines to the ends.
    let items: Vec<_> = (0..2)
        .map(|_| scene.leaf(r#"{"width":60,"height":10,"flexShrink":0}"#))
        .collect();
    let wrapped = scene.node(
        r#"{"flexDirection":"row","flexWrap":"wrap","width":100,"height":100,"alignContent":"space-between"}"#,
        &items,
    );
    scene.compute(wrapped, 100.0, 100.0);
    assert_eq!(scene.rect(items[0])[1], 0.0);
    assert_eq!(scene.rect(items[1])[1], 90.0);

    // `place-items-center` and `justify-self-end` / `self-end` in a grid cell.
    let mut scene = Scene::new();
    let centred = scene.leaf(r#"{"width":20,"height":10}"#);
    let ended =
        scene.leaf(r#"{"width":20,"height":10,"justifySelf":"end","alignSelf":"flex-end"}"#);
    let grid = scene.node(
        r#"{"display":"grid","width":100,"height":60,"gridTemplateColumns":2,"alignItems":"center","justifyItems":"center"}"#,
        &[centred, ended],
    );
    scene.compute(grid, 100.0, 60.0);
    assert_eq!(scene.rect(centred)[0..2], [15.0, 25.0]);
    assert_eq!(scene.rect(ended)[0..2], [80.0, 50.0]);

    // `self-auto` takes the container's `align-items` back.
    let mut scene = Scene::new();
    let auto = scene.leaf(r#"{"width":10,"height":10,"alignSelf":"auto"}"#);
    let row = scene.node(
        r#"{"flexDirection":"row","height":40,"alignItems":"flex-end"}"#,
        &[auto],
    );
    scene.compute(row, 100.0, 40.0);
    assert_eq!(scene.rect(auto)[1], 30.0);
}

#[test]
fn aspect_ratio_and_box_sizing() {
    let mut scene = Scene::new();
    let square = scene.leaf(r#"{"width":60,"aspectRatio":1}"#);
    let video = scene.leaf(r#"{"width":160,"aspectRatio":1.7777778}"#);
    let content_box = scene.leaf(
        r#"{"width":100,"height":20,"boxSizing":"content-box","paddingLeft":10,"paddingRight":10,"borderWidth":2}"#,
    );
    let border_box = scene
        .leaf(r#"{"width":100,"height":20,"paddingLeft":10,"paddingRight":10,"borderWidth":2}"#);
    let root = scene.node(
        r#"{"alignItems":"flex-start"}"#,
        &[square, video, content_box, border_box],
    );
    scene.compute(root, 300.0, 600.0);
    assert_eq!(scene.rect(square)[3], 60.0);
    assert!((scene.rect(video)[3] - 90.0).abs() < 0.01);
    assert_eq!(
        scene.rect(content_box)[2],
        124.0,
        "box-content adds the padding and the border"
    );
    assert_eq!(scene.rect(border_box)[2], 100.0);
}

#[test]
fn block_and_flow_root_display_collapse_margins() {
    let mut scene = Scene::new();
    let first = scene.leaf(r#"{"height":10,"marginBottom":10}"#);
    let second = scene.leaf(r#"{"height":10,"marginTop":20}"#);
    let block = scene.node(r#"{"display":"block"}"#, &[first, second]);
    scene.compute(block, 100.0, 100.0);
    assert_eq!(
        scene.rect(second)[1],
        30.0,
        "adjoining block margins collapse to the larger"
    );
    assert_eq!(scene.rect(first)[2], 100.0, "a block child fills the width");

    let mut scene = Scene::new();
    let first = scene.leaf(r#"{"height":10,"marginBottom":10}"#);
    let second = scene.leaf(r#"{"height":10,"marginTop":20}"#);
    let flex = scene.node(r#"{}"#, &[first, second]);
    scene.compute(flex, 100.0, 100.0);
    assert_eq!(
        scene.rect(second)[1],
        40.0,
        "flex items' margins never collapse"
    );

    // `flow-root` contains its child's margin.
    let mut scene = Scene::new();
    let child = scene.leaf(r#"{"height":10,"marginTop":20}"#);
    let root_box = scene.node(r#"{"display":"flow-root"}"#, &[child]);
    scene.compute(root_box, 100.0, 100.0);
    assert_eq!(scene.rect(root_box)[3], 30.0);
}

/// The class list `tests/utilities-layout.test.ts` compiles, as the JS compiler wrote it.
#[derive(DeriveDeserialize)]
struct Case {
    #[serde(rename = "className")]
    class_name: String,
    compiled: StyleLayers,
}

fn conditions(width: f32) -> StyleConditions {
    StyleConditions {
        viewport: Viewport {
            width,
            height: 800.0,
        },
        states: PseudoStates::NONE,
    }
}

#[test]
fn the_js_compilers_layout_and_transition_output_parses_validates_and_converts() {
    let cases: Vec<Case> = serde_json::from_str(include_str!(
        "../tests/fixtures/utilities-layout-styles.json"
    ))
    .expect("the fixture parses with deny_unknown_fields");
    assert!(cases.len() >= 10);
    for case in &cases {
        case.compiled
            .validate()
            .unwrap_or_else(|error| panic!("{}: {error}", case.class_name));
        for width in [400.0, 1200.0] {
            let computed = resolve(
                Some(&case.compiled),
                false,
                &InheritedStyle::default(),
                &conditions(width),
            );
            computed
                .taffy_style()
                .unwrap_or_else(|error| panic!("{} at {width}: {error}", case.class_name));
            computed.validate().unwrap();
        }
    }
    let inline: StyleLayers = serde_json::from_str(include_str!(
        "../tests/fixtures/utilities-layout-inline-style.json"
    ))
    .expect("the inline style fixture parses");
    inline.validate().unwrap();
}

#[test]
fn the_fixture_resolves_to_the_layout_and_transition_the_classes_name() {
    let cases: Vec<Case> = serde_json::from_str(include_str!(
        "../tests/fixtures/utilities-layout-styles.json"
    ))
    .unwrap();
    let computed = |class_name: &str, width: f32| {
        let case = cases
            .iter()
            .find(|case| case.class_name.starts_with(class_name))
            .unwrap_or_else(|| panic!("fixture case {class_name}"));
        resolve(
            Some(&case.compiled),
            false,
            &InheritedStyle::default(),
            &conditions(width),
        )
    };
    // `transition-colors duration-200 ease-in-out hover:duration-500 delay-75`: not hovered, 200 ms after 75.
    let colors = computed("transition-colors", 400.0);
    let transition = colors.transition.as_ref().expect("a transition");
    assert_eq!(transition.duration_ms, 200.0);
    assert_eq!(transition.delay_ms, Some(75.0));
    assert!(!transition.properties.is_all());
    // `transition-all duration-300`: every animatable property.
    let all = computed("transition-all", 400.0);
    assert!(all.transition.as_ref().unwrap().properties.is_all());
    // `duration-150 ease-[..] transition-none`: none wins whatever the duration, as in CSS.
    assert_eq!(computed("duration-150", 400.0).transition, None);
    // `md:grid-cols-3 md:col-span-2 lg:w-[50vw]` at two viewport widths.
    let narrow = computed("md:grid-cols-3", 400.0);
    assert_eq!(narrow.grid_template_columns, None);
    let wide = computed("md:grid-cols-3", 1200.0);
    assert!(wide.grid_template_columns.is_some());
    assert_eq!(wide.grid_column_span, Some(2));
    assert_eq!(wide.width, Some(crate::props::Dimension::Num(600.0)));
}

/// The layout lab (`demo/src/layout-utilities-data.ts`) compiled by the JS class compiler, with Chrome's rectangle for every box.
mod lab {
    use std::collections::{BTreeMap, HashMap};

    use serde::Deserialize as DeriveDeserialize;
    use taffy::prelude::{AvailableSpace, NodeId, Size, TaffyTree};

    use crate::computed_style::{ComputedStyle, InheritedStyle, resolve};
    use crate::props::{StyleLayers, Viewport};

    use super::conditions_for;

    #[derive(DeriveDeserialize)]
    struct LabBox {
        id: String,
        #[serde(rename = "className")]
        class_name: String,
        #[serde(default)]
        children: Vec<LabBox>,
    }

    #[derive(DeriveDeserialize)]
    struct LabCase {
        title: String,
        /// Why the library is known to differ from Chrome here; the case is left out of the comparison.
        #[serde(default)]
        known: Option<String>,
        stage: LabBox,
    }

    #[derive(DeriveDeserialize)]
    struct LabPage {
        name: String,
        cases: Vec<LabCase>,
    }

    #[derive(DeriveDeserialize)]
    struct Lab {
        #[serde(rename = "pageClass")]
        page_class: String,
        #[serde(rename = "captionClass")]
        caption_class: String,
        #[serde(rename = "cellClass")]
        cell_class: String,
        compiled: BTreeMap<String, StyleLayers>,
        pages: Vec<LabPage>,
        reference: BTreeMap<String, BTreeMap<String, [f32; 4]>>,
    }

    /// The tree a page makes, as the library mounts it: every node's Taffy style from its resolved computed style, and its
    /// children listed in their `order`.
    struct Built {
        tree: TaffyTree<()>,
        boxes: Vec<(String, NodeId)>,
        /// The boxes of the cases that are known to differ from Chrome.
        known: Vec<String>,
    }

    impl LabBox {
        fn ids(&self) -> Vec<&str> {
            std::iter::once(self.id.as_str())
                .chain(self.children.iter().flat_map(LabBox::ids))
                .collect()
        }
    }

    fn build_box(
        built: &mut Built,
        lab: &Lab,
        entry: &LabBox,
        inherited: &InheritedStyle,
        viewport: Viewport,
    ) -> (NodeId, ComputedStyle) {
        let computed = resolve(
            Some(&lab.compiled[&entry.class_name]),
            false,
            inherited,
            &conditions_for(viewport),
        );
        let below = computed.inherited();
        let mut children: Vec<(NodeId, ComputedStyle)> = entry
            .children
            .iter()
            .map(|child| build_box(built, lab, child, &below, viewport))
            .collect();
        children.sort_by_key(|(_, style)| style.order.unwrap_or(0));
        let nodes: Vec<NodeId> = children.iter().map(|(node, _)| *node).collect();
        let node = built
            .tree
            .new_with_children(computed.taffy_style().unwrap(), &nodes)
            .unwrap();
        built.boxes.push((entry.id.clone(), node));
        (node, computed)
    }

    fn build_page(lab: &Lab, page: &LabPage, viewport: Viewport) -> (Built, NodeId) {
        let mut built = Built {
            tree: TaffyTree::new(),
            boxes: Vec::new(),
            known: Vec::new(),
        };
        let inherited = InheritedStyle::default();
        let class_node =
            |built: &mut Built, class_name: &str, inherited: &InheritedStyle, children: &[NodeId]| {
                let computed = resolve(
                    Some(&lab.compiled[class_name]),
                    false,
                    inherited,
                    &conditions_for(viewport),
                );
                built
                    .tree
                    .new_with_children(computed.taffy_style().unwrap(), children)
                    .unwrap()
            };
        let page_style = resolve(
            Some(&lab.compiled[&lab.page_class]),
            false,
            &inherited,
            &conditions_for(viewport),
        );
        let below = page_style.inherited();
        let cells: Vec<NodeId> = page
            .cases
            .iter()
            .map(|entry| {
                let caption = class_node(&mut built, &lab.caption_class, &below, &[]);
                let (stage, _) = build_box(&mut built, lab, &entry.stage, &below, viewport);
                assert!(!entry.title.is_empty());
                built.known.extend(
                    entry
                        .known
                        .iter()
                        .flat_map(|_| entry.stage.ids())
                        .map(str::to_string),
                );
                class_node(&mut built, &lab.cell_class, &below, &[caption, stage])
            })
            .collect();
        let page_node = built
            .tree
            .new_with_children(page_style.taffy_style().unwrap(), &cells)
            .unwrap();
        // The layer root of `ReactUiRoot::flush_layout`: Taffy's default style, as big as the viewport.
        let root = built
            .tree
            .new_with_children(
                taffy::Style {
                    size: Size {
                        width: taffy::prelude::length(viewport.width),
                        height: taffy::prelude::length(viewport.height),
                    },
                    ..taffy::Style::default()
                },
                &[page_node],
            )
            .unwrap();
        (built, root)
    }

    /// Absolute rectangle of every node under `node`, whose parent is at `origin`.
    fn absolute(
        tree: &TaffyTree<()>,
        node: NodeId,
        origin: (f32, f32),
        into: &mut HashMap<NodeId, [f32; 4]>,
    ) {
        let layout = tree.layout(node).unwrap();
        let here = (origin.0 + layout.location.x, origin.1 + layout.location.y);
        into.insert(
            node,
            [here.0, here.1, layout.size.width, layout.size.height],
        );
        for child in tree.children(node).unwrap() {
            absolute(tree, child, here, into);
        }
    }

    const EDGE_TOLERANCE: f32 = 0.5;

    /// Every box of every page, at both window sizes, within half a pixel of Chrome on each edge. A difference names the box, its
    /// classes and both rectangles.
    #[test]
    fn taffy_lays_the_lab_out_as_chrome_does() {
        let lab: Lab =
            serde_json::from_str(include_str!("../tests/fixtures/layout-utilities-lab.json"))
                .expect("the lab fixture parses");
        let mut checked = 0;
        let mut mismatches = Vec::new();
        for (size, reference) in &lab.reference {
            let (width, height) = size.split_once('x').expect("a WxH key");
            let viewport = Viewport {
                width: width.parse().unwrap(),
                height: height.parse().unwrap(),
            };
            for page in &lab.pages {
                let (mut built, root) = build_page(&lab, page, viewport);
                built
                    .tree
                    .compute_layout(
                        root,
                        Size {
                            width: AvailableSpace::Definite(viewport.width),
                            height: AvailableSpace::Definite(viewport.height),
                        },
                    )
                    .unwrap();
                let mut rects = HashMap::new();
                absolute(&built.tree, root, (0.0, 0.0), &mut rects);
                for (id, node) in &built.boxes {
                    if built.known.contains(id) {
                        continue;
                    }
                    let actual = rects[node];
                    let expected = reference[id];
                    // A `display: none` box has no place in Chrome (it reports the origin), only no size.
                    if expected[2] == 0.0 && expected[3] == 0.0 {
                        checked += 1;
                        if actual[2] != 0.0 || actual[3] != 0.0 {
                            mismatches.push(format!("{size} {} [{id}]: taffy {actual:?} should have no size", page.name));
                        }
                        continue;
                    }
                    let edges = |rect: [f32; 4]| [rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]];
                    let difference = edges(actual)
                        .into_iter()
                        .zip(edges(expected))
                        .map(|(left, right)| (left - right).abs())
                        .fold(0.0, f32::max);
                    checked += 1;
                    if difference > EDGE_TOLERANCE + 0.001 {
                        mismatches.push(format!(
                            "{size} {} [{id}]: taffy {actual:?} chrome {expected:?}",
                            page.name
                        ));
                    }
                }
            }
        }
        assert!(checked > 500, "{checked} boxes checked");
        assert!(
            mismatches.is_empty(),
            "{} of {checked} boxes differ from Chrome:\n{}",
            mismatches.len(),
            mismatches.join("\n")
        );
    }
}

fn conditions_for(viewport: Viewport) -> StyleConditions {
    StyleConditions {
        viewport,
        states: PseudoStates::NONE,
    }
}

/// A pin on a known difference (`known` in `demo/src/layout-utilities-data.ts`, "flex-1 in a column of unknown height"): Tailwind's
/// `flex-1` is `1 1 0%`, and Chrome takes a percentage basis against a container with no height as the content, which an empty
/// box with a `height` of its own does not have, so it lays both boxes out at nothing. Taffy resolves it as a length and shares the
/// container's height out by the boxes' own heights, as it does for a basis of `0px`. The case differs only where the container's
/// height is unknown; with a known height (`sizes.flex-1-definite`) the engines agree. When Taffy changes this the assertion fails and
/// the known case can go.
#[test]
fn flex_one_in_a_column_of_unknown_height_is_not_chromes() {
    let heights = |basis: &str| {
        let mut scene = Scene::new();
        let a = scene.leaf(&format!(r#"{{"height":16,"flexGrow":1,"flexShrink":1,"flexBasis":{basis}}}"#));
        let b = scene.leaf(&format!(r#"{{"height":24,"flexGrow":1,"flexShrink":1,"flexBasis":{basis}}}"#));
        let column = scene.node(r#"{"width":240}"#, &[a, b]);
        let root = scene.node(r#"{"alignItems":"flex-start"}"#, &[column]);
        scene.compute(root, 400.0, 400.0);
        [scene.rect(a)[3], scene.rect(b)[3], scene.rect(column)[3]]
    };
    assert_eq!(heights(r#""0%""#), [20.0, 20.0, 40.0]);
    assert_eq!(heights("0"), [20.0, 20.0, 40.0]);
}
