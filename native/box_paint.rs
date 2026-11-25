//! What a box item draws and how: the key that says whether what it recorded still holds, and the recording itself.
//!
//! A box is drawn in layers, bottom to top, as CSS paints one: the outer shadows (the last listed first), the background colour,
//! the gradient, the inset shadows, the border. On the pixel grid every layer but a gradient is a nine-patch from the masks' atlas
//! (`box_draw.rs`): a fill, a one-colour border, each side of a border whose sides differ in colour, a shadow. A square fill or
//! border is stretched from the atlas's white texels, so it keeps the hard edges it had. A box drawn by `StyleBoxFlat` was a polygon,
//! and the engine never batches polygons: every box cost a draw call of its own, where boxes of masks drawn one after another are
//! one. A box that a transform has put off the pixel grid is drawn from feathered meshes (`box_mesh.rs`) instead, as the masks are
//! baked on the grid.

use std::rc::Rc;

use godot::builtin::Side;
use godot::classes::{RenderingServer, StyleBoxFlat};
use godot::prelude::*;

use crate::border_image::BorderImage;
use crate::box_draw::{self, BoxShape, Lease};
use crate::box_mesh::Feather;
use crate::box_shadow::{ShadowLayer, ShadowList};
use crate::gradient::Gradient;
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

    pub fn has_visible_border(&self) -> bool {
        self.widths
            .iter()
            .zip(&self.colors)
            .any(|(width, color)| *width > 0 && color.a > 0.0)
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

    /// Whether `StyleBoxFlat` cannot draw this border as CSS does: its sides differ in colour (it has one), or they differ in
    /// width round a rounded corner (it reduces a corner's radius by the narrower side, where CSS makes the inner curve an
    /// ellipse).
    pub fn needs_mesh(&self) -> bool {
        self.has_border()
            && (self.shared_color().is_none() || (!self.uniform_width() && self.is_rounded()))
    }
}

/// The shadows and the gradient of a box: what a plain box does not have. Built only for a box that has some, so a plain
/// one holds nothing.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Decoration {
    /// The visible layers in CSS order (the first is on top), their colours concrete.
    pub shadows: Vec<ShadowLayer>,
    pub gradient: Option<Gradient>,
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

/// A box's border image: the registered texture it is cut from and how (`border_image.rs`). Present only while the style names a
/// texture the root has registered; without one the border is drawn as its own style says.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct BorderImageKey {
    pub texture: Rid,
    /// The picture's size in its own pixels.
    pub picture: Vector2,
    pub image: BorderImage,
}

impl BorderImageKey {
    /// How far the image reaches past the border box (top, right, bottom, left), given the border widths it is laid out by.
    fn reach(&self, borders: [i32; 4]) -> [f32; 4] {
        self.image.outsets(borders.map(|width| width as f32))
    }

    /// Record the image's pieces, over what the box drew.
    fn draw(&self, item: Rid, size: Vector2, borders: [i32; 4]) {
        let mut rs = RenderingServer::singleton();
        let pieces = self.image.pieces(
            (self.picture.x, self.picture.y),
            (size.x, size.y),
            borders.map(|width| width as f32),
        );
        for piece in pieces {
            let dest = Rect2::new(
                Vector2::new(piece.dest.x, piece.dest.y),
                Vector2::new(piece.dest.width, piece.dest.height),
            );
            let source = Rect2::new(
                Vector2::new(piece.source.x, piece.source.y),
                Vector2::new(piece.source.width, piece.source.height),
            );
            rs.canvas_item_add_texture_rect_region_ex(item, dest, self.texture, source)
                .done();
        }
    }
}

/// What a box item last drew; equal keys mean the recorded commands are still right.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct BoxKey {
    pub size: Vector2,
    pub background: Color,
    pub border: BorderKey,
    /// `None` for a box with no shadow, ring or gradient: the common case holds nothing.
    pub decoration: Option<Rc<Decoration>>,
    /// `None` for a box with no border image, or whose texture is not registered.
    pub border_image: Option<Rc<BorderImageKey>>,
    /// Only rounded corners are antialiased (`StyleBoxFlat`), and a shadow or gradient is baked for a scale; a plain
    /// square box keeps `Oversampling::NONE` and is not re-recorded when the scale changes.
    pub oversampling: Oversampling,
    /// A box under a transform that moves it off the pixel grid is drawn from feathered meshes (`StyleBoxFlat` antialiases only a rounded
    /// or skewed box, and has one feather length): this is the feather in logical pixels, one device pixel across an edge whichever
    /// way it faces (`Linear2::edge_axes`). `None` for a box on the grid.
    pub feather: Option<Feather>,
    /// The box clips its content with rounded corners (`rounded_clip.rs`): the clip's edge is exact, so the box's own fill and border are
    /// drawn from exact meshes too, and the border's inner edge meets the clipped content where CSS puts both.
    pub clips_round: bool,
}

impl BoxKey {
    /// Whether the box has any visible pixels (background, border, shadow, or gradient).
    pub fn is_visible(&self) -> bool {
        self.background.a > 0.0
            || self.border.has_visible_border()
            || self.decoration.is_some()
            || self.border_image.is_some()
    }

    /// Whether the key's drawing depends on the scale it is drawn at.
    pub fn depends_on_oversampling(border: &BorderKey, decoration: Option<&Decoration>) -> bool {
        border.is_rounded() || border.needs_mesh() || decoration.is_some()
    }

    /// The rectangle the box item covers, which the engine culls against: the border box and, past it, the outer shadows and the
    /// border image's outset.
    pub fn paint_rect(&self) -> Rect2 {
        let shadows = self
            .decoration
            .as_ref()
            .map_or([0.0; 4], |decoration| decoration.reach());
        let outset = self
            .border_image
            .as_ref()
            .map_or([0.0; 4], |image| image.reach(self.border.widths));
        let [top, right, bottom, left] = std::array::from_fn(|side| shadows[side].max(outset[side]));
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

fn set_widths(style: &mut Gd<StyleBoxFlat>, widths: [i32; 4]) {
    style.set_border_width(Side::TOP, widths[TOP]);
    style.set_border_width(Side::RIGHT, widths[RIGHT]);
    style.set_border_width(Side::BOTTOM, widths[BOTTOM]);
    style.set_border_width(Side::LEFT, widths[LEFT]);
}

/// Record a box into its item, which is empty: its layers, then its border image over them (CSS paints it where the border
/// would be, and the border's own paint is not drawn: the key's border colours are transparent). `single_border_draw` is
/// whether the single-draw fault of the verifier is on (a translucent border drawn in one `StyleBoxFlat` call).
pub(crate) fn draw_box(
    item: Rid,
    key: &BoxKey,
    style: &mut Gd<StyleBoxFlat>,
    single_border_draw: bool,
    leases: &mut Vec<Lease>,
) {
    draw_layers(item, key, style, single_border_draw, leases);
    if let Some(image) = &key.border_image {
        image.draw(item, key.size, key.border.widths);
    }
}

/// The fill, shadows, gradient and border of a box, bottom to top as CSS paints them: the outer shadows, the fill, the gradient, the inset
/// shadows, the border. On the pixel grid every layer is a nine-patch from the masks' atlas (`box_draw.rs`), so the boxes drawn one after
/// another are one draw call; under a transform the fill, the gradient and a one-colour border are feathered meshes.
fn draw_layers(
    item: Rid,
    key: &BoxKey,
    style: &mut Gd<StyleBoxFlat>,
    single_border_draw: bool,
    leases: &mut Vec<Lease>,
) {
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

    // The outer shadows, the last listed first: the first listed is on top. Chrome cuts the box out of them only when its
    // background colour lets something through (an opaque one is painted over the shadow, and a cut would leave a gap along
    // its antialiased edge).
    let opaque_fill = key.background.a >= 1.0;
    if let Some(decoration) = decoration {
        for layer in decoration.shadows.iter().rev().filter(|layer| !layer.inset) {
            box_draw::shadow(item, &shape, layer, opaque_fill, leases);
        }
    }

    // A box under a transform is made of meshes whole: the fill, the gradient and the border (the masks are baked on the pixel grid).
    // Only a border of sides of different colours is still cut from masks.
    let meshed = key.feather.is_some();
    let mixed_border = border.has_border() && border.shared_color().is_none();
    if meshed && !has_inset && gradient.is_none() && !mixed_border {
        let ring = border.shared_color();
        let covered = ring.is_some() && border.opaque_sides().iter().all(|&opaque| opaque);
        box_draw::plain(item, &shape, key.background, ring, covered);
        return;
    }

    // The verifier's fault (`Fault::SingleBorderDraw`): a translucent box and its border in one `StyleBoxFlat` call, whose ring fades its
    // inner edge from the fill and so adds a translucent fill a second time along the border.
    if single_border_draw
        && !meshed
        && key.background.a < 1.0
        && gradient.is_none()
        && !has_inset
        && let Some(color) = border.shared_color()
    {
        crate::render_tree::set_corner_radii(style, border.radii);
        style.set_aa_size(key.oversampling.feather());
        style.set_bg_color(key.background);
        style.set_border_color(color);
        set_widths(style, border.widths);
        style.set_draw_center(true);
        style.draw(item, Rect2::new(Vector2::ZERO, key.size));
        return;
    }

    // An opaque border is painted over the fill's edge, which stops half way under it (`BoxShape::fill_box`).
    let covered = border.opaque_sides();
    if meshed {
        if key.background.a > 0.0 {
            box_draw::solid(item, &shape, key.background, covered);
        }
    } else {
        box_draw::fill(item, &shape, key.background, covered, leases);
    }
    if let Some(gradient) = gradient {
        box_draw::gradient(item, &shape, gradient, covered, leases);
    }
    if let Some(decoration) = decoration {
        for layer in decoration.shadows.iter().rev().filter(|layer| layer.inset) {
            box_draw::shadow(item, &shape, layer, false, leases);
        }
    }
    match border.shared_color() {
        Some(color) if meshed => box_draw::ring(item, &shape, color),
        Some(color) => box_draw::one_colour_border(item, &shape, color, leases),
        None if border.has_border() => box_draw::border(item, &shape, border.colors, leases),
        None => {}
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
            border_image: None,
            oversampling: Oversampling::NONE,
            feather: None,
            clips_round: false,
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
            border_image: None,
            oversampling: Oversampling::NONE,
            feather: Some(Feather::from_axes([1.0, 0.0], [0.0, 2.5])),
            clips_round: false,
        };
        let rect = key.paint_rect();
        // A vertex of the band is half the feather from the edge: 1.25 along y here, 0.5 along x, and no more than 1.75 any way.
        assert!(rect.position.x <= -1.75 + 1e-3 && rect.position.y <= -1.75 + 1e-3);
        assert!(rect.size.x >= 100.0 + 3.5 - 1e-3 && rect.size.y >= 50.0 + 3.5 - 1e-3);
    }
}
