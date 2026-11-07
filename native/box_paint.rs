//! What a box item draws and how: the key that says whether what it recorded still holds, and the recording itself.
//!
//! A box with a uniform border and a plain fill is drawn by one `StyleBoxFlat`, as it always was. Anything else is drawn in
//! layers, bottom to top, as CSS paints a box: the outer shadows (the last listed first), the background colour, the
//! gradient, the inset shadows, the border. A border whose sides differ in colour, and one whose widths differ round a
//! rounded corner, is drawn from meshes (`box_mesh.rs`); a `StyleBoxFlat` cannot join them as CSS does. So is every box that a
//! transform has put off the pixel grid: `StyleBoxFlat` antialiases only a rounded or skewed box, and with one feather length, which
//! is a pixel wide across an edge only on the axis a transform stretches most.

use std::rc::Rc;

use godot::builtin::Side;
use godot::classes::StyleBoxFlat;
use godot::prelude::*;

use crate::box_draw::{self, BoxShape, Lease};
use crate::box_mesh::Feather;
use crate::box_shadow::{ShadowLayer, ShadowList};
use crate::gradient::LinearGradient;
use crate::props::StyleSpec;
use crate::render_tree::Oversampling;
use crate::style_engine::current_color;

/// The sides of a box in the order CSS lists them, as indexes into [`BorderKey`]'s arrays.
const TOP: usize = 0;
const RIGHT: usize = 1;
const BOTTOM: usize = 2;
const LEFT: usize = 3;

/// A box's border as it is drawn: whole logical pixels (what `StyleBoxFlat` takes), each side's own colour, each corner's
/// own radius.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct BorderKey {
    /// Top, right, bottom, left.
    pub widths: [i32; 4],
    /// Top, right, bottom, left. A side with no width has the colour transparent, so it does not tell keys apart.
    pub colors: [Color; 4],
    /// Top left, top right, bottom right, bottom left.
    pub radii: [i32; 4],
}

impl BorderKey {
    pub fn new(widths: [f32; 4], colors: [Color; 4], radii: [f32; 4]) -> BorderKey {
        let widths = widths.map(|width| width.round() as i32);
        let mut colors = colors;
        for (color, width) in colors.iter_mut().zip(widths) {
            if width <= 0 {
                *color = Color::TRANSPARENT_BLACK;
            }
        }
        BorderKey {
            widths,
            colors,
            radii: radii.map(|radius| radius.round() as i32),
        }
    }

    pub fn has_border(&self) -> bool {
        self.widths.iter().any(|width| *width > 0)
    }

    /// The sides whose border is opaque: painted over the fill's edge, it hides the edge's antialiasing.
    pub fn opaque_sides(&self) -> [bool; 4] {
        std::array::from_fn(|side| self.widths[side] > 0 && self.colors[side].a >= 1.0)
    }

    pub fn is_rounded(&self) -> bool {
        self.radii.iter().any(|radius| *radius > 0)
    }

    fn uniform_width(&self) -> bool {
        self.widths.iter().all(|width| *width == self.widths[0])
    }

    /// The colour every side that has a width shares, if they share one.
    fn shared_color(&self) -> Option<Color> {
        let mut drawn = self
            .widths
            .iter()
            .zip(&self.colors)
            .filter(|(width, _)| **width > 0)
            .map(|(_, color)| *color);
        let first = drawn.next()?;
        drawn.all(|color| color == first).then_some(first)
    }

    fn any_translucent(&self) -> bool {
        self.widths
            .iter()
            .zip(&self.colors)
            .any(|(width, color)| *width > 0 && color.a < 1.0)
    }

    /// Whether `StyleBoxFlat` cannot draw this border as CSS does: its sides differ in colour (it has one), or they differ in
    /// width round a rounded corner (it reduces a corner's radius by the narrower side, where CSS makes the inner curve an
    /// ellipse).
    pub fn needs_mesh(&self) -> bool {
        self.has_border()
            && (self.shared_color().is_none() || (!self.uniform_width() && self.is_rounded()))
    }
}

/// Whether the corner radii of a box of `size` fill one of its sides, or more (CSS then scales them to fit: `rounded-full` on a
/// pill or a circle, `rounded-t-full`). `StyleBoxFlat` draws such a corner up to a pixel larger than CSS does, because it fits the
/// radii to the rectangle it antialiases (one feather wider), so a box like that is filled from an exact mesh instead.
pub(crate) fn radii_fill_a_side(size: Vector2, radii: [i32; 4]) -> bool {
    let [top_left, top_right, bottom_right, bottom_left] = radii.map(|radius| radius as f32);
    let fits = |sum: f32, side: f32| sum >= side - FEATHER_SLACK_PX;
    fits(top_left + top_right, size.x)
        || fits(bottom_left + bottom_right, size.x)
        || fits(top_left + bottom_left, size.y)
        || fits(top_right + bottom_right, size.y)
}

/// A side may be this much shorter than the radii on it before they count as filling it: the width of `StyleBoxFlat`'s feather.
const FEATHER_SLACK_PX: f32 = 1.0;

/// Whether a box's fill is drawn from an exact mesh instead of by `StyleBoxFlat`: when its radii fill a side, and when other
/// layers lie against its rounded edge. Shadows, rings, gradients and mitred borders are exact coverage masks and meshes, and
/// `StyleBoxFlat`'s corner arcs sit up to half a pixel from them, which would leave a seam of whatever is behind the box between
/// its fill and a ring, or a fringe of the fill outside a mitred border. A box with square corners is exact either way.
pub(crate) fn fill_from_mesh(
    size: Vector2,
    border: &BorderKey,
    decoration: Option<&Decoration>,
) -> bool {
    radii_fill_a_side(size, border.radii)
        || border.is_rounded() && (decoration.is_some() || border.needs_mesh())
}

/// The shadows and the gradient of a box: what a plain box does not have. Built only for a box that has some, so a plain
/// one holds nothing.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Decoration {
    /// The visible layers in CSS order (the first is on top), their colours concrete.
    pub shadows: Vec<ShadowLayer>,
    pub gradient: Option<LinearGradient>,
}

impl Decoration {
    /// How far the outer shadows reach past the border box (top, right, bottom, left), in logical pixels.
    pub fn reach(&self) -> [f32; 4] {
        ShadowList(self.shadows.clone()).reach()
    }

    fn has_inset(&self) -> bool {
        self.shadows.iter().any(|layer| layer.inset)
    }
}

/// The decoration of a style. `shadows` replaces the style's own `box-shadow` when the element is mid-transition (the
/// value Stylo sampled).
pub(crate) fn decoration_of(
    style: &StyleSpec,
    shadows: Option<&ShadowList>,
) -> Option<Rc<Decoration>> {
    if shadows.is_none_or(ShadowList::is_empty) && !style.has_box_decoration() {
        return None;
    }
    let list = match shadows {
        Some(list) => list.clone(),
        None => style
            .box_shadow_list()
            .resolve_current_color(current_color(style)),
    };
    let shadows: Vec<ShadowLayer> = list.0.into_iter().filter(ShadowLayer::is_visible).collect();
    let gradient = style.background_gradient();
    if shadows.is_empty() && gradient.is_none() {
        return None;
    }
    Some(Rc::new(Decoration { shadows, gradient }))
}

/// What a box item last drew; equal keys mean the recorded commands are still right.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct BoxKey {
    pub size: Vector2,
    pub background: Color,
    pub border: BorderKey,
    /// `None` for a box with no shadow, ring or gradient: the common case holds nothing.
    pub decoration: Option<Rc<Decoration>>,
    /// Only rounded corners are antialiased (`StyleBoxFlat`), and a shadow or gradient is baked for a scale; a plain
    /// square box keeps `Oversampling::NONE` and is not re-recorded when the scale changes.
    pub oversampling: Oversampling,
    /// A box under a transform that moves it off the pixel grid is drawn from feathered meshes (`StyleBoxFlat` antialiases only a rounded
    /// or skewed box, and has one feather length): this is the feather in logical pixels, one device pixel across an edge whichever
    /// way it faces (`Linear2::edge_axes`). `None` for a box on the grid.
    pub feather: Option<Feather>,
}

impl BoxKey {
    /// Whether the key's drawing depends on the scale it is drawn at.
    pub fn depends_on_oversampling(border: &BorderKey, decoration: Option<&Decoration>) -> bool {
        border.is_rounded() || border.needs_mesh() || decoration.is_some()
    }

    /// The rectangle the box item covers, which the engine culls against: the border box and, past it, the outer shadows.
    pub fn paint_rect(&self) -> Rect2 {
        let [top, right, bottom, left] = self
            .decoration
            .as_ref()
            .map_or([0.0; 4], |decoration| decoration.reach());
        // A vertex of the feather's band is half the feather away from the true edge, along its normal, and the feather across any
        // normal is at most the two axes' together.
        let reach = self.feather.map_or(Vector2::ZERO, |feather| {
            Vector2::splat((feather.x() + feather.y()) / 2.0)
        });
        Rect2::new(
            Vector2::new(-left - reach.x, -top - reach.y),
            Vector2::new(
                self.size.x + left + right + reach.x * 2.0,
                self.size.y + top + bottom + reach.y * 2.0,
            ),
        )
    }
}

/// Set the `StyleBoxFlat`'s corners and antialiasing.
fn shape_style(style: &mut Gd<StyleBoxFlat>, key: &BoxKey) {
    crate::render_tree::set_corner_radii(style, key.border.radii);
    style.set_aa_size(key.oversampling.feather());
}

fn set_widths(style: &mut Gd<StyleBoxFlat>, widths: [i32; 4]) {
    style.set_border_width(Side::TOP, widths[TOP]);
    style.set_border_width(Side::RIGHT, widths[RIGHT]);
    style.set_border_width(Side::BOTTOM, widths[BOTTOM]);
    style.set_border_width(Side::LEFT, widths[LEFT]);
}

/// Whether a box is drawn in layers (the fill, the gradient, the inset shadows, the border, each in its own call) rather than by
/// one `StyleBoxFlat` call. A gradient and an inset shadow lie between the fill and the border; a border over a translucent
/// fill is drawn after it (`StyleBoxFlat` with a centre fades the ring's inner edge from the fill and would add a translucent
/// fill a second time along the ring: the fault `single_border_draw` puts that back); a mitred border is made of meshes.
fn is_layered(
    border: &BorderKey,
    translucent_fill: bool,
    has_inset: bool,
    has_gradient: bool,
    mesh_fill: bool,
    single_border_draw: bool,
) -> bool {
    let translucent = translucent_fill || border.any_translucent();
    has_inset
        || has_gradient
        || mesh_fill
        || border.has_border() && (translucent && !single_border_draw || border.needs_mesh())
}

/// Record a box into its item, which is empty. `faults` is whether the single-draw fault of the verifier is on (a
/// translucent border drawn in one `StyleBoxFlat` call).
pub(crate) fn draw_box(
    item: Rid,
    key: &BoxKey,
    style: &mut Gd<StyleBoxFlat>,
    single_border_draw: bool,
    leases: &mut Vec<Lease>,
) {
    let bounds = Rect2::new(Vector2::ZERO, key.size);
    let border = &key.border;
    let decoration = key.decoration.as_deref();
    let gradient = decoration.and_then(|decoration| decoration.gradient.as_ref());
    let has_inset = decoration.is_some_and(Decoration::has_inset);
    let shape = BoxShape::new(
        key.size,
        border.widths,
        border.radii,
        key.oversampling.factor(),
    )
    .with_feather(key.feather);
    shape_style(style, key);

    // The outer shadows, the last listed first: the first listed is on top. Chrome cuts the box out of them only when its
    // background colour lets something through (an opaque one is painted over the shadow, and a cut would leave a gap along
    // its antialiased edge).
    let opaque_fill = key.background.a >= 1.0;
    if let Some(decoration) = decoration {
        for layer in decoration.shadows.iter().rev().filter(|layer| !layer.inset) {
            box_draw::shadow(item, &shape, layer, opaque_fill, leases);
        }
    }

    // A box under a transform is made of meshes whole: the fill, the gradient and the border (`StyleBoxFlat` has one feather length and
    // no antialiasing on a square corner). Only a border of sides of different colours is still cut from masks.
    let meshed = key.feather.is_some();
    let mixed_border = border.has_border() && border.shared_color().is_none();
    if meshed && !has_inset && gradient.is_none() && !mixed_border {
        let ring = border.shared_color();
        let covered = ring.is_some() && border.opaque_sides().iter().all(|&opaque| opaque);
        box_draw::plain(item, &shape, key.background, ring, covered);
        return;
    }

    // One call draws the fill and the border when nothing has to come between them.
    let mesh_fill = meshed || fill_from_mesh(key.size, border, decoration);
    let mesh_border = if meshed {
        mixed_border
    } else {
        border.needs_mesh() || mesh_fill && border.has_border()
    };
    let split = is_layered(
        border,
        key.background.a < 1.0,
        has_inset,
        gradient.is_some(),
        mesh_fill,
        single_border_draw,
    );
    if !split {
        style.set_bg_color(key.background);
        style.set_border_color(border.shared_color().unwrap_or(Color::TRANSPARENT_BLACK));
        set_widths(style, border.widths);
        style.set_draw_center(true);
        style.draw(item, bounds);
        return;
    }

    // The fill over the whole border box, the gradient over it, the inset shadows over that, then the border: CSS paints a
    // translucent border over the fill (and `StyleBoxFlat` with a centre would add the fill a second time along the ring).
    if mesh_fill {
        if key.background.a > 0.0 {
            box_draw::solid(item, &shape, key.background, border.opaque_sides());
        }
    } else if key.background.a > 0.0 || gradient.is_none() {
        style.set_bg_color(key.background);
        set_widths(style, [0; 4]);
        style.set_draw_center(true);
        style.draw(item, bounds);
    }
    if let Some(gradient) = gradient {
        box_draw::gradient(item, &shape, gradient, border.opaque_sides(), leases);
    }
    if let Some(decoration) = decoration {
        for layer in decoration.shadows.iter().rev().filter(|layer| layer.inset) {
            box_draw::shadow(item, &shape, layer, false, leases);
        }
    }
    if mesh_border {
        box_draw::border(item, &shape, border.colors, leases);
    } else if let Some(color) = border.shared_color() {
        if meshed {
            box_draw::ring(item, &shape, color);
        } else {
            style.set_border_color(color);
            set_widths(style, border.widths);
            style.set_draw_center(false);
            style.draw(item, bounds);
            style.set_draw_center(true);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const RED: Color = Color::from_rgba(1.0, 0.0, 0.0, 1.0);
    const BLUE: Color = Color::from_rgba(0.0, 0.0, 1.0, 1.0);

    #[test]
    fn a_uniform_border_needs_no_mesh() {
        let uniform = BorderKey::new([1.0; 4], [RED; 4], [8.0; 4]);
        assert!(!uniform.needs_mesh());
        // One colour on the sides that have a width, whatever the others say.
        let top_only = BorderKey::new([4.0, 0.0, 0.0, 0.0], [RED, BLUE, BLUE, BLUE], [0.0; 4]);
        assert!(!top_only.needs_mesh());
        assert_eq!(
            top_only.colors[RIGHT],
            Color::TRANSPARENT_BLACK,
            "a side with no width has no colour in the key"
        );
        // Unequal widths with square corners are `StyleBoxFlat`'s to draw.
        assert!(!BorderKey::new([1.0, 2.0, 3.0, 4.0], [RED; 4], [0.0; 4]).needs_mesh());
    }

    #[test]
    fn mixed_colours_and_unequal_widths_round_a_corner_need_a_mesh() {
        assert!(BorderKey::new([2.0; 4], [RED, BLUE, RED, RED], [0.0; 4]).needs_mesh());
        // A bottom border alone under rounded corners: the inner curve of a bottom corner is an ellipse.
        assert!(BorderKey::new([0.0, 0.0, 3.0, 0.0], [RED; 4], [8.0; 4]).needs_mesh());
        assert!(
            !BorderKey::new([0.0; 4], [RED; 4], [8.0; 4]).needs_mesh(),
            "no border, no mesh"
        );
    }

    #[test]
    fn a_box_is_drawn_in_layers_when_something_lies_between_its_fill_and_its_border() {
        let border = BorderKey::new([1.0; 4], [RED; 4], [8.0; 4]);
        let none = BorderKey::new([0.0; 4], [RED; 4], [8.0; 4]);
        // The arguments: the border, a translucent fill, an inset shadow, a gradient, a pill's corners, the single-draw fault.
        let layered = |border: &BorderKey, flags: [bool; 5]| {
            is_layered(border, flags[0], flags[1], flags[2], flags[3], flags[4])
        };
        // A plain box is one call, with or without a border.
        assert!(!layered(&border, [false; 5]));
        assert!(
            !layered(&none, [true, false, false, false, false]),
            "a translucent fill with no border is one call"
        );
        // A gradient and an inset shadow need layers with no border at all.
        assert!(layered(&none, [false, false, true, false, false]));
        assert!(layered(&none, [false, true, false, false, false]));
        assert!(layered(&border, [false, true, false, false, false]));
        // A pill's corners are filled from a mesh.
        assert!(layered(&none, [false, false, false, true, false]));
        // A border over a translucent fill is a ring over the fill, unless the fault puts the single call back.
        assert!(layered(&border, [true, false, false, false, false]));
        assert!(!layered(&border, [true, false, false, false, true]));
        let mixed = BorderKey::new([2.0; 4], [RED, BLUE, RED, RED], [0.0; 4]);
        assert!(layered(&mixed, [false; 5]));
    }

    #[test]
    fn radii_that_fill_a_side_are_known() {
        let size = Vector2::new(64.0, 56.0);
        assert!(radii_fill_a_side(size, [9999; 4]), "rounded-full");
        assert!(
            radii_fill_a_side(size, [9999, 9999, 0, 0]),
            "rounded-t-full"
        );
        assert!(
            radii_fill_a_side(Vector2::new(64.0, 64.0), [32; 4]),
            "a circle that fits exactly"
        );
        assert!(!radii_fill_a_side(size, [8; 4]), "rounded-lg");
        assert!(
            !radii_fill_a_side(size, [24, 24, 0, 0]),
            "rounded-t-3xl on 64 wide leaves 16 straight"
        );
        assert!(!radii_fill_a_side(Vector2::new(1000.0, 500.0), [16; 4]));
    }

    #[test]
    fn a_fill_is_exact_where_other_exact_layers_lie_against_its_rounded_edge() {
        let size = Vector2::new(64.0, 56.0);
        let ring: StyleSpec =
            serde_json::from_str(r#"{"boxShadowParts":{"ringWidth":2}}"#).expect("style");
        let ring = decoration_of(&ring, None);
        let rounded = BorderKey::new([0.0; 4], [RED; 4], [8.0; 4]);
        let square = BorderKey::new([0.0; 4], [RED; 4], [0.0; 4]);
        assert!(
            !fill_from_mesh(size, &rounded, None),
            "a plain rounded box is StyleBoxFlat's"
        );
        assert!(
            fill_from_mesh(size, &rounded, ring.as_deref()),
            "a ring lies against the rounded edge"
        );
        assert!(
            !fill_from_mesh(size, &square, ring.as_deref()),
            "square corners are exact either way"
        );
        let mixed = BorderKey::new([2.0; 4], [RED, BLUE, RED, RED], [8.0; 4]);
        assert!(
            fill_from_mesh(size, &mixed, None),
            "a mitred border is a mesh"
        );
        let uniform = BorderKey::new([2.0; 4], [RED; 4], [8.0; 4]);
        assert!(
            !fill_from_mesh(size, &uniform, None),
            "a uniform border is StyleBoxFlat's, fill and border alike"
        );
    }

    #[test]
    fn an_opaque_border_covers_the_fills_edge_by_half_its_width() {
        let translucent = Color::from_rgba(1.0, 1.0, 1.0, 0.5);
        let border = BorderKey::new([4.0, 4.0, 0.0, 2.0], [RED, translucent, RED, RED], [8.0; 4]);
        assert_eq!(border.opaque_sides(), [true, false, false, true]);
        let shape =
            box_draw::BoxShape::new(Vector2::new(100.0, 60.0), border.widths, border.radii, 2.0);
        // At scale two the borders are 8, 8, 0 and 4 device pixels: half of the top's and the left's, nothing of the others.
        let fill = shape.fill_box(border.opaque_sides());
        assert_eq!(
            (fill.x0, fill.y0, fill.x1, fill.y1),
            (2.0, 4.0, 200.0, 120.0)
        );
    }

    #[test]
    fn a_translucent_side_is_known() {
        let translucent = Color::from_rgba(1.0, 1.0, 1.0, 0.3);
        assert!(BorderKey::new([1.0; 4], [translucent; 4], [0.0; 4]).any_translucent());
        assert!(
            !BorderKey::new(
                [0.0, 1.0, 0.0, 0.0],
                [translucent, RED, translucent, translucent],
                [0.0; 4]
            )
            .any_translucent()
        );
    }

    #[test]
    fn a_plain_style_has_no_decoration_and_a_ring_has() {
        let plain: StyleSpec = serde_json::from_str(r#"{"opacity":1}"#).expect("style");
        assert!(decoration_of(&plain, None).is_none());
        assert!(decoration_of(&plain, Some(&ShadowList::default())).is_none());
        let ring: StyleSpec =
            serde_json::from_str(r#"{"boxShadowParts":{"ringWidth":2}}"#).expect("style");
        let decoration = decoration_of(&ring, None).expect("a ring");
        assert_eq!(
            decoration.shadows.len(),
            1,
            "the zero-width ring offset draws nothing"
        );
        assert_eq!(decoration.reach(), [2.0; 4]);
        // A sampled value replaces the style's own.
        let sampled = ShadowList::parse("0 0 0 6px #000000").expect("a shadow");
        assert_eq!(
            decoration_of(&ring, Some(&sampled))
                .expect("a ring")
                .reach(),
            [6.0; 4]
        );
    }

    #[test]
    fn the_paint_rect_includes_the_outer_shadows() {
        let style: StyleSpec =
            serde_json::from_str(r##"{"boxShadow":"0 10px 20px -4px #00000040"}"##).expect("style");
        let key = BoxKey {
            size: Vector2::new(100.0, 50.0),
            background: Color::WHITE,
            border: BorderKey::new([0.0; 4], [Color::WHITE; 4], [0.0; 4]),
            decoration: decoration_of(&style, None),
            oversampling: Oversampling::NONE,
            feather: None,
        };
        let rect = key.paint_rect();
        // sigma 10, three sigmas 30, spread -4: 26 around, moved down 10.
        assert!(rect.position.x <= -26.0 + 1e-3 && rect.position.y <= -16.0 + 1e-3);
        assert!(rect.size.x >= 100.0 + 52.0 - 1e-3 && rect.size.y >= 50.0 + 52.0 - 1e-3);
    }

    #[test]
    fn the_paint_rect_reaches_the_feather_of_a_box_under_a_transform() {
        let key = BoxKey {
            size: Vector2::new(100.0, 50.0),
            background: Color::WHITE,
            border: BorderKey::new([0.0; 4], [Color::WHITE; 4], [4.0; 4]),
            decoration: None,
            oversampling: Oversampling::NONE,
            feather: Some(Feather::from_axes([1.0, 0.0], [0.0, 2.5])),
        };
        let rect = key.paint_rect();
        // A vertex of the band is half the feather from the edge: 1.25 along y here, 0.5 along x, and no more than 1.75 any way.
        assert!(rect.position.x <= -1.75 + 1e-3 && rect.position.y <= -1.75 + 1e-3);
        assert!(rect.size.x >= 100.0 + 3.5 - 1e-3 && rect.size.y >= 50.0 + 3.5 - 1e-3);
    }
}
