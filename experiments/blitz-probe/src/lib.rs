use blitz_dom::DocumentConfig;
use blitz_html::HtmlDocument;
use blitz_traits::shell::Viewport;

const START_HEIGHT: f32 = 40.0;
const TARGET_HEIGHT: f32 = 120.0;
const GEOMETRY_TOLERANCE: f32 = 0.5;
const HTML: &str = r#"<!doctype html><html><head><style>
html, body { margin: 0; padding: 0; }
#panel { width: 200px; height: 40px; transition: height 1s linear; }
#inside { height: 120px; }
#after { width: 200px; height: 20px; }
</style></head><body><div id="panel"><div id="inside"></div></div><div id="after"></div></body></html>"#;

fn document() -> HtmlDocument {
    let mut config = DocumentConfig::default();
    config.viewport = Some(Viewport {
        window_size: (640, 480),
        ..Viewport::default()
    });
    HtmlDocument::from_html(HTML, config)
}

fn height(doc: &HtmlDocument, element: &str) -> f32 {
    let id = doc
        .get_element_by_id(element)
        .expect("fixture element exists");
    doc.get_node(id)
        .expect("fixture node exists")
        .final_layout()
        .size
        .height
}

fn top(doc: &HtmlDocument, element: &str) -> f32 {
    let id = doc
        .get_element_by_id(element)
        .expect("fixture element exists");
    doc.get_node(id)
        .expect("fixture node exists")
        .final_layout()
        .location
        .y
}

fn set_height(doc: &mut HtmlDocument, value: &str) {
    let id = doc
        .get_element_by_id("panel")
        .expect("fixture panel exists");
    doc.mutate().set_style_property(id, "height", value);
}

fn near(actual: f32, expected: f32, label: &str) {
    assert!(
        (actual - expected).abs() <= GEOMETRY_TOLERANCE,
        "{label}: expected {expected}, observed {actual}"
    );
}

/// Headless Stylo→Taffy proof: time is provided by the host, not an OS event loop.
pub fn run_probe() -> String {
    let mut doc = document();
    doc.resolve(0.0);
    near(height(&doc, "panel"), START_HEIGHT, "initial height");
    set_height(&mut doc, "120px");
    doc.resolve(0.0);
    near(
        height(&doc, "panel"),
        START_HEIGHT,
        "transition starts at previous height",
    );
    doc.resolve(0.5);
    let midpoint = height(&doc, "panel");
    near(midpoint, 80.0, "numeric size midpoint");
    near(
        top(&doc, "after"),
        80.0,
        "sibling reflows during size transition",
    );
    doc.resolve(1.1);
    near(
        height(&doc, "panel"),
        TARGET_HEIGHT,
        "numeric size endpoint",
    );

    let mut reverse = document();
    reverse.resolve(0.0);
    set_height(&mut reverse, "120px");
    reverse.resolve(0.0);
    reverse.resolve(0.5);
    set_height(&mut reverse, "40px");
    reverse.resolve(0.5);
    near(
        height(&reverse, "panel"),
        80.0,
        "reversal retains current presentation",
    );
    reverse.resolve(0.75);
    let reverse_midpoint = height(&reverse, "panel");
    near(reverse_midpoint, 60.0, "CSS reversal shortening");
    reverse.resolve(1.1);
    near(height(&reverse, "panel"), START_HEIGHT, "reversal endpoint");

    let mut intrinsic = document();
    intrinsic.resolve(0.0);
    set_height(&mut intrinsic, "auto");
    intrinsic.resolve(0.0);
    let intrinsic_at_start = height(&intrinsic, "panel");
    // This records an upstream feature gap, not a smooth-auto success criterion.
    near(
        intrinsic_at_start,
        TARGET_HEIGHT,
        "auto changes discretely in pinned Stylo",
    );

    let mut removed = document();
    removed.resolve(0.0);
    set_height(&mut removed, "120px");
    removed.resolve(0.0);
    let id = removed
        .get_element_by_id("panel")
        .expect("fixture panel exists");
    removed.mutate().remove_and_drop_node(id);
    removed.resolve(0.25);
    assert!(
        !removed.is_animating(),
        "removed node must not retain animation ticks"
    );

    format!(
        r#"{{"numericMidpoint":{midpoint},"reverseMidpoint":{reverse_midpoint},"autoAtStart":{intrinsic_at_start},"removedAnimationCleared":true}}"#
    )
}

/// The same minimal entry point can be linked as an Emscripten side module.
#[unsafe(no_mangle)]
pub extern "C" fn blitz_transition_probe() -> i32 {
    println!("BLITZ_TRANSITION_PROBE {}", run_probe());
    0
}

#[cfg(test)]
mod tests {
    #[test]
    fn transition_and_layout_contracts() {
        super::run_probe();
    }
}
