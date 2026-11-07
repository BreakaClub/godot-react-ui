//! Drawing what `StyleBoxFlat` cannot into a box's canvas item: box shadows and rings, gradient fills, borders whose sides
//! differ in colour, outlines. The shapes and masks come from the pure modules (`rrect.rs`, `shadow_mask.rs`,
//! `box_mesh.rs`, `gradient.rs`); this one turns them into canvas commands and keeps the textures they need.
//!
//! Everything here is recorded in device pixels, under a transform of one over the oversampling (`begin` and `end`), so
//! a texel is a device pixel and nothing is resampled. A feather is one device pixel wide whatever the scale. There is no
//! per-element material: a shadow is a nine-patch of a baked mask tinted by the shadow's colour, a gradient a mesh
//! sampling a one-pixel-high ramp. Masks and ramps are cached by what they depend on, shared by every box that uses them and
//! freed when the last one stops (`Lease`).

use std::cell::RefCell;
use std::collections::HashMap;

use godot::classes::image::Format;
use godot::classes::rendering_server::{CanvasItemTextureFilter, CanvasItemTextureRepeat};
use godot::classes::{Image, RenderingServer};
use godot::prelude::*;

use crate::box_mesh::{self, Feather, Mesh};
use crate::box_shadow::{SHADOW_SIGMAS, SIGMA_PER_BLUR, ShadowLayer};
use crate::filter::Rgba;
use crate::gradient::{LinearGradient, ramp, ramp_texels};
use crate::rrect::{BOTTOM, LEFT, RIGHT, RRect, TOP};
use crate::shadow_mask::{self, MaskSpec, Shape};

/// A key's lengths are rounded to 1/64 of a device pixel.
const KEY_UNITS_PER_PIXEL: f32 = 64.0;
/// A mask's centre patch must lie wholly in the hole: the margin it is stretched across holds this many pixels more than the
/// reach of the shadow's shape.
const MASK_SLACK_PX: f32 = 2.0;
const FEATHER_PX: f32 = 1.0;

fn server() -> Gd<RenderingServer> {
    RenderingServer::singleton()
}

fn quantized(value: f32) -> i32 {
    (value * KEY_UNITS_PER_PIXEL).round() as i32
}

fn quantized_all<const N: usize>(values: [f32; N]) -> [i32; N] {
    values.map(quantized)
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct MaskKey {
    /// Which shape (`Shape` variant) and its numbers.
    shape: [i32; 6],
    width: i32,
    height: i32,
    radii: [i32; 4],
    borders: [i32; 4],
    margin: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct RampKey {
    /// Each stop's position and colour, as bits.
    stops: Vec<[u32; 5]>,
    texels: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
enum CacheKey {
    Mask(MaskKey),
    Ramp(RampKey),
    /// A picture the text decorations bake (`text_decoration/raster.rs`): what it depends on, as numbers.
    Baked(Vec<u32>),
}

struct Entry {
    texture: Rid,
    refs: u32,
    width: usize,
    height: usize,
}

#[derive(Default)]
struct Cache {
    entries: HashMap<CacheKey, Entry>,
}

thread_local! {
    static CACHE: RefCell<Cache> = RefCell::new(Cache::default());
}

/// A box's hold on a cached texture: the texture lives while any box holds it.
pub(crate) struct Lease(CacheKey);

impl Drop for Lease {
    fn drop(&mut self) {
        CACHE.with(|cache| {
            let mut cache = cache.borrow_mut();
            let Some(entry) = cache.entries.get_mut(&self.0) else {
                return;
            };
            entry.refs -= 1;
            if entry.refs == 0
                && let Some(entry) = cache.entries.remove(&self.0)
            {
                server().free_rid(entry.texture);
            }
        });
    }
}

/// The texture for `key`, made by `make` (RGBA8 bytes and their size) if no box holds one, and a lease on it.
fn acquire(
    key: CacheKey,
    make: impl FnOnce() -> (Vec<u8>, usize, usize),
) -> (Lease, Rid, usize, usize) {
    CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        if let Some(entry) = cache.entries.get_mut(&key) {
            entry.refs += 1;
            return (Lease(key), entry.texture, entry.width, entry.height);
        }
        let (bytes, width, height) = make();
        let image = Image::create_from_data(
            i32::try_from(width).expect("a texture's width fits an i32"),
            i32::try_from(height).expect("a texture's height fits an i32"),
            false,
            Format::RGBA8,
            &PackedByteArray::from(bytes),
        )
        .expect("a baked texture is a valid image");
        let texture = server().texture_2d_create(&image);
        cache.entries.insert(
            key.clone(),
            Entry {
                texture,
                refs: 1,
                width,
                height,
            },
        );
        (Lease(key), texture, width, height)
    })
}

/// The texture of a baked alpha picture for `key`, made by `make` if no one holds one, and a lease on it. The picture is white
/// with the alpha it was baked with, so it is tinted by the colour it is drawn in.
pub(crate) fn acquire_baked(
    key: Vec<u32>,
    make: impl FnOnce() -> crate::text_decoration::raster::Raster,
) -> (Lease, Rid, usize, usize) {
    acquire(CacheKey::Baked(key), || {
        let raster = make();
        let mut bytes = Vec::with_capacity(raster.alpha.len() * 4);
        for alpha in &raster.alpha {
            bytes.extend_from_slice(&[u8::MAX, u8::MAX, u8::MAX, *alpha]);
        }
        (bytes, raster.width, raster.height)
    })
}

/// How many textures the cache holds (a measure for the verifier: a tree with nothing to draw holds none).
pub(crate) fn cached_textures() -> usize {
    CACHE.with(|cache| cache.borrow().entries.len())
}

/// A box in device pixels.
#[derive(Clone, Copy, Debug)]
pub(crate) struct BoxShape {
    /// Device pixels per logical pixel.
    pub scale: f32,
    pub width: f32,
    pub height: f32,
    /// Top left, top right, bottom right, bottom left.
    pub radii: [f32; 4],
    /// Top, right, bottom, left.
    pub borders: [f32; 4],
    /// The feather of every edge, in device pixels, when a transform has put the box off the pixel grid; `None` for a box on it, whose
    /// rounded edges are one device pixel and whose square ones are hard (see [`BoxShape::feather_of`]).
    pub feather: Option<Feather>,
}

impl BoxShape {
    pub fn new(size: Vector2, borders: [i32; 4], radii: [i32; 4], scale: f32) -> BoxShape {
        BoxShape {
            scale,
            width: size.x * scale,
            height: size.y * scale,
            radii: radii.map(|radius| radius as f32 * scale),
            borders: borders.map(|width| width as f32 * scale),
            feather: None,
        }
    }

    /// The same box with the feather a transform needs (`feather` is in logical pixels, as a [`BoxKey`](crate::box_paint::BoxKey)
    /// holds it).
    pub fn with_feather(self, feather: Option<Feather>) -> BoxShape {
        BoxShape {
            feather: feather.map(|feather| feather.scaled(self.scale)),
            ..self
        }
    }

    pub fn border_box(&self) -> RRect {
        RRect::from_box(self.width, self.height, self.radii)
    }

    pub fn padding_box(&self) -> RRect {
        self.border_box().padding_box(self.borders)
    }

    /// The box a fill (or a gradient) covers when an opaque border is painted over its edge on the `covered` sides: the border box
    /// moved in by half those borders' widths. Blink shrinks a background the same way (`kBackgroundBleedShrinkBackground`), so that
    /// the fill's antialiased edge, which would lie under the border's own, is not seen outside it as a fringe of the fill's colour.
    pub fn fill_box(&self, covered: [bool; 4]) -> RRect {
        let halves = std::array::from_fn(|side| {
            if covered[side] {
                self.borders[side] * 0.5
            } else {
                0.0
            }
        });
        self.border_box().padding_box(halves)
    }

    /// The feather of a shape: under a transform, the box's own (one length on each axis); on the pixel grid, one device pixel where
    /// it has curves and none where its edges are on pixels.
    fn feather_of(&self, rect: &RRect) -> Feather {
        match self.feather {
            Some(feather) => feather,
            None if rect.is_rounded() => Feather::isotropic(FEATHER_PX),
            None => Feather::NONE,
        }
    }
}

/// Start recording in device pixels, with the texture state the shapes below need.
pub(crate) fn begin(item: Rid, scale: f32) {
    let mut rs = server();
    // The canvas item's own state: a project that defaults to nearest filtering or repeating textures does not change
    // how a ramp or a mask is read.
    rs.canvas_item_set_default_texture_filter(item, CanvasItemTextureFilter::LINEAR);
    rs.canvas_item_set_default_texture_repeat(item, CanvasItemTextureRepeat::DISABLED);
    let unit = 1.0 / scale;
    rs.canvas_item_add_set_transform(
        item,
        Transform2D::from_cols(
            Vector2::new(unit, 0.0),
            Vector2::new(0.0, unit),
            Vector2::ZERO,
        ),
    );
}

/// Go back to logical pixels.
pub(crate) fn end(item: Rid) {
    server().canvas_item_add_set_transform(item, Transform2D::IDENTITY);
}

/// What a mask is a mask of, in logical pixels, as the callers know it.
#[derive(Clone, Copy, Debug)]
enum Cut {
    /// A shadow layer, and whether the box's fill is opaque (the shadow then runs under the fill's edge).
    Shadow(ShadowLayer, bool),
    Outline {
        inner: f32,
        outer: f32,
    },
    Side {
        side: usize,
        extend: bool,
    },
}

/// Draw the mask of a shape, tinted by `color`. A mask is baked once for what it depends on and drawn as a nine-patch
/// whose corners are the mask's own pixels and whose middle is stretched, so it fits a box of any size: the pixels past
/// a corner's reach are the same along an edge, and the middle of the mask is empty (the hole).
fn mask(item: Rid, shape: &BoxShape, cut: Cut, color: Rgba, leases: &mut Vec<Lease>) {
    let scale = shape.scale;
    let radius = shape.radii.iter().copied().fold(0.0, f32::max);
    let border = shape.borders.iter().copied().fold(0.0, f32::max);
    // The mask's shape in device pixels, how far outside the border box it reaches, and how deep inside the box it still
    // depends on the corners.
    let (mask_shape, reach, depth) = match cut {
        Cut::Shadow(layer, under_fill) => {
            let offset = (layer.x * scale, layer.y * scale);
            let spread = layer.spread * scale;
            let sigma = layer.blur * SIGMA_PER_BLUR * scale;
            let reach = if layer.inset {
                0.0
            } else {
                layer.reach().iter().copied().fold(0.0, f32::max) * scale
            };
            let depth = radius
                + SHADOW_SIGMAS * sigma
                + offset.0.abs().max(offset.1.abs())
                + spread.abs()
                + border;
            let shape = if layer.inset {
                Shape::Inset {
                    offset,
                    spread,
                    sigma,
                }
            } else {
                Shape::Outer {
                    offset,
                    spread,
                    sigma,
                    under_fill,
                }
            };
            (shape, reach, depth)
        }
        Cut::Outline { inner, outer } => {
            let (inner, outer) = (inner * scale, outer * scale);
            (
                Shape::Ring { inner, outer },
                outer.max(inner).max(0.0),
                radius + inner.abs() + outer.abs(),
            )
        }
        Cut::Side { side, extend } => (Shape::Side { side, extend }, 0.0, radius + border),
    };
    let margin = if reach > 0.0 {
        reach.ceil() as usize + 1
    } else {
        0
    };
    let depth = (depth + MASK_SLACK_PX).ceil();
    let stretch_x = shape.width >= 2.0 * depth + 1.0;
    let stretch_y = shape.height >= 2.0 * depth + 1.0;
    let baked_width = if stretch_x {
        2.0 * depth + 1.0
    } else {
        shape.width
    };
    let baked_height = if stretch_y {
        2.0 * depth + 1.0
    } else {
        shape.height
    };
    let spec = MaskSpec {
        shape: mask_shape,
        width: baked_width,
        height: baked_height,
        radii: shape.radii,
        borders: shape.borders,
        margin,
    };
    let key = CacheKey::Mask(MaskKey {
        shape: match mask_shape {
            Shape::Outer {
                offset,
                spread,
                sigma,
                under_fill,
            } => [
                0,
                quantized(offset.0),
                quantized(offset.1),
                quantized(spread),
                quantized(sigma),
                i32::from(under_fill),
            ],
            Shape::Inset {
                offset,
                spread,
                sigma,
            } => [
                1,
                quantized(offset.0),
                quantized(offset.1),
                quantized(spread),
                quantized(sigma),
                0,
            ],
            Shape::Ring { inner, outer } => [2, quantized(inner), quantized(outer), 0, 0, 0],
            Shape::Side { side, extend } => [3, side as i32, i32::from(extend), 0, 0, 0],
        },
        width: quantized(baked_width),
        height: quantized(baked_height),
        radii: quantized_all(shape.radii),
        borders: quantized_all(shape.borders),
        margin,
    });
    let (lease, texture, texture_width, texture_height) = acquire(key, || {
        let baked = shadow_mask::bake(&spec);
        let bytes = baked
            .alpha
            .iter()
            .flat_map(|alpha| [u8::MAX, u8::MAX, u8::MAX, *alpha])
            .collect();
        (bytes, baked.width, baked.height)
    });
    leases.push(lease);
    begin(item, scale);
    let margin = margin as f32;
    // Where the mask goes and how its margins map: a stretched axis keeps `depth + margin` pixels at each end and
    // stretches the one between; the other is drawn at the size it was baked.
    let dest = Rect2::new(
        Vector2::new(-margin, -margin),
        Vector2::new(
            if stretch_x {
                shape.width + 2.0 * margin
            } else {
                texture_width as f32
            },
            if stretch_y {
                shape.height + 2.0 * margin
            } else {
                texture_height as f32
            },
        ),
    );
    let patch = Vector2::new(
        if stretch_x { depth + margin } else { 0.0 },
        if stretch_y { depth + margin } else { 0.0 },
    );
    server()
        .canvas_item_add_nine_patch_ex(
            item,
            dest,
            Rect2::new(
                Vector2::ZERO,
                Vector2::new(texture_width as f32, texture_height as f32),
            ),
            texture,
            patch,
            patch,
        )
        // The middle of a box that is stretched both ways is inside the hole.
        .draw_center(!(stretch_x && stretch_y))
        .modulate(Color::from_rgba(color[0], color[1], color[2], color[3]))
        .done();
    end(item);
}

/// Draw one shadow layer: the mask of its shape, tinted by its colour. `opaque_fill` is whether the box's background colour is
/// opaque: an outer shadow is then not cut out of the box's edge (see `Shape::Outer`).
pub(crate) fn shadow(
    item: Rid,
    shape: &BoxShape,
    layer: &ShadowLayer,
    opaque_fill: bool,
    leases: &mut Vec<Lease>,
) {
    let color = layer.color.expect("a drawn shadow has a concrete colour");
    mask(item, shape, Cut::Shadow(*layer, opaque_fill), color, leases);
}

/// A texture a mesh samples, and where along it a vertex is (the horizontal coordinate; a ramp is one pixel high).
type Sampled<'a> = (Rid, &'a dyn Fn(f32, f32) -> f32);

fn add_mesh(item: Rid, mesh: &Mesh, color: Color, texture: Option<Sampled>) {
    if mesh.is_empty() || color.a <= 0.0 {
        return;
    }
    let indices = PackedInt32Array::from(
        mesh.indices
            .iter()
            .map(|index| i32::try_from(*index).expect("a mesh index fits an i32"))
            .collect::<Vec<i32>>(),
    );
    let points = PackedVector2Array::from(
        mesh.points
            .iter()
            .map(|point| Vector2::new(point.x, point.y))
            .collect::<Vec<Vector2>>(),
    );
    let colors = PackedColorArray::from(
        mesh.points
            .iter()
            .map(|point| Color::from_rgba(color.r, color.g, color.b, color.a * point.alpha))
            .collect::<Vec<Color>>(),
    );
    let mut rs = server();
    match texture {
        Some((texture, position)) => {
            let uvs = PackedVector2Array::from(
                mesh.points
                    .iter()
                    .map(|point| Vector2::new(position(point.x, point.y), 0.5))
                    .collect::<Vec<Vector2>>(),
            );
            rs.canvas_item_add_triangle_array_ex(item, &indices, &points, &colors)
                .uvs(&uvs)
                .texture(texture)
                .done();
        }
        None => rs.canvas_item_add_triangle_array(item, &indices, &points, &colors),
    }
}

/// Fill the border box with the gradient. It is laid out over the padding box (CSS `background-origin`) and drawn
/// under the border (`background-clip: border-box`); beyond the padding box it holds its end colours where CSS would tile
/// the image.
pub(crate) fn gradient(
    item: Rid,
    shape: &BoxShape,
    gradient: &LinearGradient,
    covered: [bool; 4],
    leases: &mut Vec<Lease>,
) {
    let padding = shape.padding_box();
    if padding.width() <= 0.0 || padding.height() <= 0.0 {
        return;
    }
    let line = gradient.line(padding.x0, padding.y0, padding.width(), padding.height());
    if line.length <= 0.0 {
        return;
    }
    // A stop in pixels is in logical pixels.
    let stops = gradient.resolve(line.length / shape.scale);
    let texels = ramp_texels(line.length);
    let key = CacheKey::Ramp(RampKey {
        stops: stops
            .iter()
            .map(|stop| {
                [
                    stop.t.to_bits(),
                    stop.color[0].to_bits(),
                    stop.color[1].to_bits(),
                    stop.color[2].to_bits(),
                    stop.color[3].to_bits(),
                ]
            })
            .collect(),
        texels,
    });
    let (lease, texture, _, _) = acquire(key, || (ramp(&stops, texels), texels, 1));
    leases.push(lease);
    let fill_box = shape.fill_box(covered);
    let mesh = box_mesh::fill(&fill_box, shape.feather_of(&fill_box));
    begin(item, shape.scale);
    add_mesh(
        item,
        &mesh,
        Color::WHITE,
        Some((texture, &|x, y| line.t(x, y))),
    );
    end(item);
}

/// Fill the border box with one colour, from an exact mesh: the shape CSS draws for corners that fill a side (a pill, a circle). An
/// opaque border on the `covered` sides is painted over the fill's edge (see [`BoxShape::fill_box`]).
pub(crate) fn solid(item: Rid, shape: &BoxShape, color: Color, covered: [bool; 4]) {
    let fill_box = shape.fill_box(covered);
    let mesh = box_mesh::fill(&fill_box, shape.feather_of(&fill_box));
    begin(item, shape.scale);
    add_mesh(item, &mesh, color, None);
    end(item);
}

/// The ring between the border box and the padding box in one colour, from an exact mesh: a border whose sides differ in width
/// round a rounded corner (an elliptical inner curve), or any border of a box a transform has put off the pixel grid.
pub(crate) fn ring(item: Rid, shape: &BoxShape, color: Color) {
    let outer = shape.border_box();
    let mesh = box_mesh::ring(&outer, &shape.padding_box(), shape.feather_of(&outer));
    begin(item, shape.scale);
    add_mesh(item, &mesh, color, None);
    end(item);
}

/// A plain box (one fill, one border colour, nothing between them) from exact meshes: the fill, then the ring over it as CSS paints
/// them. Under an opaque border (`covered`) the fill stops beneath the ring's inner edge, so no fringe of it shows past the outer one.
pub(crate) fn plain(
    item: Rid,
    shape: &BoxShape,
    background: Color,
    border: Option<Color>,
    covered: bool,
) {
    let outer = shape.border_box();
    let inner = shape.padding_box();
    let feather = shape.feather_of(&outer);
    begin(item, shape.scale);
    if covered {
        add_mesh(
            item,
            &box_mesh::fill_under_ring(&outer, &inner, feather),
            background,
            None,
        );
    } else {
        add_mesh(item, &box_mesh::fill(&outer, feather), background, None);
    }
    if let Some(color) = border {
        add_mesh(item, &box_mesh::ring(&outer, &inner, feather), color, None);
    }
    end(item);
}

/// The border, a side at a time in its own colour, joined along the mitres. `colors` are top, right, bottom, left.
pub(crate) fn border(item: Rid, shape: &BoxShape, colors: [Color; 4], leases: &mut Vec<Lease>) {
    // The top and bottom are drawn first and run under the left and right, which antialias the mitre over them; that needs the left
    // and the right to be opaque (a translucent one would show the top's overlap through itself).
    let opaque = |side: usize| colors[side].a >= 1.0 || shape.borders[side] <= 0.0;
    let extend = opaque(LEFT) && opaque(RIGHT);
    for side in [TOP, BOTTOM, RIGHT, LEFT] {
        if shape.borders[side] > 0.0 {
            let color = colors[side];
            let cut = Cut::Side {
                side,
                extend: extend && (side == TOP || side == BOTTOM),
            };
            mask(
                item,
                shape,
                cut,
                [color.r, color.g, color.b, color.a],
                leases,
            );
        }
    }
}

/// An outline: the ring `offset` outside the border box (inside when negative), `width` wide, following its corners.
pub(crate) fn outline(
    item: Rid,
    shape: &BoxShape,
    width: f32,
    offset: f32,
    color: Color,
    leases: &mut Vec<Lease>,
) {
    let cut = Cut::Outline {
        inner: offset,
        outer: offset + width,
    };
    mask(
        item,
        shape,
        cut,
        [color.r, color.g, color.b, color.a],
        leases,
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    fn shape(radius: i32) -> BoxShape {
        BoxShape::new(Vector2::new(100.0, 50.0), [2; 4], [radius; 4], 2.0)
    }

    /// A box on the pixel grid keeps the feather it always had: one device pixel round a curve and none along edges that sit on pixels.
    #[test]
    fn a_box_on_the_grid_keeps_its_feathers() {
        let rounded = shape(8);
        let square = shape(0);
        assert_eq!(
            rounded.feather_of(&rounded.border_box()),
            Feather::isotropic(FEATHER_PX)
        );
        assert_eq!(square.feather_of(&square.border_box()), Feather::NONE);
    }

    /// Under a transform the feather is the transform's, whatever the corners, in the shape's device pixels (the key holds it in
    /// logical pixels).
    #[test]
    fn a_box_under_a_transform_has_the_feather_it_was_given_in_its_own_pixels() {
        let feather = Feather::from_axes([0.5, 0.0], [0.0, 1.25]);
        for radius in [0, 8] {
            let moved = shape(radius).with_feather(Some(feather));
            assert_eq!(moved.feather_of(&moved.border_box()), feather.scaled(2.0));
            assert_eq!(moved.feather_of(&moved.padding_box()), feather.scaled(2.0));
        }
        assert_eq!(shape(8).with_feather(None).feather, None);
    }
}
