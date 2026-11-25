//! Drawing what `StyleBoxFlat` cannot into a box's canvas item: box shadows and rings, gradient fills, borders whose sides
//! differ in colour, outlines. The shapes and masks come from the pure modules (`rrect.rs`, `shadow_mask.rs`,
//! `box_mesh.rs`, `gradient.rs`); this one turns them into canvas commands and keeps the textures they need.
//!
//! Everything here is recorded in device pixels, under a transform of one over the oversampling (`begin` and `end`), so
//! a texel is a device pixel and nothing is resampled. A feather is one device pixel wide whatever the scale. There is no
//! per-element material: a shadow is a nine-patch of a baked mask tinted by the shadow's colour, a gradient a mesh
//! sampling a one-pixel-high ramp. Masks and ramps are cached by what they depend on, shared by every box that uses them and
//! freed when the last one stops (`Lease`).
//!
//! Masks are packed into shared atlas pages (`atlas.rs`), so that every box drawn from masks reads one texture: the engine draws
//! consecutive nine-patches of one texture in one draw call, where a texture of its own for each mask (or a `StyleBoxFlat`, whose
//! polygons are never batched) cost a call per box. A page is a picture in memory and a texture of the same size; a mask is written
//! into the picture when it is baked and the textures of the pages that changed are uploaded once a frame, before the engine draws
//! (`flush_pages`, from the root's `frame_pre_draw`). A mask too large for a page has a texture of its own, as a ramp does.

use std::cell::RefCell;
use std::collections::HashMap;

use godot::classes::image::Format;
use godot::classes::rendering_server::{CanvasItemTextureFilter, CanvasItemTextureRepeat};
use godot::classes::{Image, RenderingServer};
use godot::prelude::*;

use crate::box_mesh::{self, Feather, Mesh};
use crate::box_shadow::{SHADOW_SIGMAS, SIGMA_PER_BLUR, ShadowLayer};
use crate::filter::Rgba;
use crate::gradient::{ColorSpace, ConicGradient, Gradient, LinearGradient, ResolvedStop, ramp, ramp_texels};
use crate::atlas::{Region, ShelfPacker};
use crate::rrect::{BOTTOM, LEFT, RIGHT, RRect, TOP};
use crate::shadow_mask::{self, MaskSpec, Shape};

/// A key's lengths are rounded to 1/64 of a device pixel.
const KEY_UNITS_PER_PIXEL: f32 = 64.0;
/// A mask's centre patch must lie wholly in the hole: the margin it is stretched across holds this many pixels more than the
/// reach of the shadow's shape.
const MASK_SLACK_PX: f32 = 2.0;
const FEATHER_PX: f32 = 1.0;
/// An atlas page is this many texels square: 4 MiB as RGBA8, in memory and again as a texture.
const PAGE_TEXELS: u32 = 1024;
/// A mask this large or larger on either axis, gutter included, has a texture of its own: half a page, so a page holds at least
/// four of the largest.
const LARGEST_PACKED_TEXELS: u32 = PAGE_TEXELS / 2;
/// The mask's edge texels are repeated this far round it in its page, so linear filtering at the edge of its region reads the
/// mask and not its neighbour.
const GUTTER_TEXELS: u32 = 1;
const RGBA: usize = 4;

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
    space: ColorSpace,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
enum CacheKey {
    Mask(MaskKey),
    Ramp(RampKey),
    /// A picture the text decorations bake (`text_decoration/raster.rs`): what it depends on, as numbers.
    Baked(Vec<u32>),
    /// Opaque white texels in the atlas, which a square fill or a square border's bars are stretched from.
    White,
}

struct Entry {
    texture: Rid,
    refs: u32,
    width: usize,
    height: usize,
    /// Where a packed mask is: its page and its region there, gutter included. `None` for a texture of its own.
    packed: Option<(usize, Region)>,
}

impl Entry {
    /// The texels of the texture the picture is, in it: its region less the gutter, or the whole texture.
    fn source(&self) -> Rect2 {
        let size = Vector2::new(self.width as f32, self.height as f32);
        match self.packed {
            Some((_, region)) => Rect2::new(
                Vector2::new(
                    (region.x + GUTTER_TEXELS) as f32,
                    (region.y + GUTTER_TEXELS) as f32,
                ),
                size,
            ),
            None => Rect2::new(Vector2::ZERO, size),
        }
    }
}

/// An atlas page: its picture in memory, the texture it is uploaded to, and where its masks are.
struct Page {
    texture: Rid,
    pixels: Vec<u8>,
    packer: ShelfPacker,
    /// The picture changed since it was last uploaded.
    dirty: bool,
}

#[derive(Default)]
struct Cache {
    entries: HashMap<CacheKey, Entry>,
    /// A page that has emptied is `None` until one is needed again (an entry names its page by index).
    pages: Vec<Option<Page>>,
}

impl Cache {
    /// Put an RGBA picture in a page, opening one if none has room, and return the page's index, its texture and the region.
    fn pack(&mut self, bytes: &[u8], width: usize, height: usize) -> (usize, Rid, Region) {
        let gutter = GUTTER_TEXELS as usize;
        let (outer_width, outer_height) = (width + 2 * gutter, height + 2 * gutter);
        let size = (
            u32::try_from(outer_width).expect("a packed mask is narrower than a page"),
            u32::try_from(outer_height).expect("a packed mask is shorter than a page"),
        );
        let placed = self.pages.iter_mut().enumerate().find_map(|(index, page)| {
            let page = page.as_mut()?;
            page.packer.allocate(size.0, size.1).map(|region| (index, region))
        });
        let (index, region) = match placed {
            Some(placed) => placed,
            None => {
                let index = self.pages.iter().position(Option::is_none).unwrap_or_else(|| {
                    self.pages.push(None);
                    self.pages.len() - 1
                });
                let side = PAGE_TEXELS as usize;
                let pixels = vec![0; side * side * RGBA];
                let texture = server().texture_2d_create(&page_image(&pixels));
                let mut packer = ShelfPacker::new(PAGE_TEXELS, PAGE_TEXELS);
                let region = packer
                    .allocate(size.0, size.1)
                    .expect("a mask under half a page fits an empty page");
                self.pages[index] = Some(Page {
                    texture,
                    pixels,
                    packer,
                    dirty: false,
                });
                (index, region)
            }
        };
        let page = self.pages[index].as_mut().expect("the page was just found or made");
        // The picture, with its edge texels repeated across the gutter round it.
        let stride = PAGE_TEXELS as usize * RGBA;
        for row in 0..outer_height {
            let source_row = row.saturating_sub(gutter).min(height - 1);
            for column in 0..outer_width {
                let source_column = column.saturating_sub(gutter).min(width - 1);
                let from = (source_row * width + source_column) * RGBA;
                let to = (region.y as usize + row) * stride + (region.x as usize + column) * RGBA;
                page.pixels[to..to + RGBA].copy_from_slice(&bytes[from..from + RGBA]);
            }
        }
        page.dirty = true;
        (index, page.texture, region)
    }

    /// Give a packed mask's region back, and the page if that emptied it.
    fn unpack(&mut self, index: usize, region: Region) {
        let Some(page) = self.pages[index].as_mut() else {
            panic!("a packed mask's page {index} is gone");
        };
        page.packer.free(region);
        if page.packer.is_empty()
            && let Some(page) = self.pages[index].take()
        {
            server().free_rid(page.texture);
        }
    }
}

/// The picture of an atlas page, as an image the rendering server takes.
fn page_image(pixels: &[u8]) -> Gd<Image> {
    let side = i32::try_from(PAGE_TEXELS).expect("a page's side fits an i32");
    Image::create_from_data(side, side, false, Format::RGBA8, &PackedByteArray::from(pixels))
        .expect("an atlas page is a valid image")
}

/// Upload the atlas pages whose pictures changed since the last time. The root calls this before every frame the engine draws.
pub(crate) fn flush_pages() {
    CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        for page in cache.pages.iter_mut().flatten().filter(|page| page.dirty) {
            server().texture_2d_update(page.texture, &page_image(&page.pixels), 0);
            page.dirty = false;
        }
    });
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
                match entry.packed {
                    Some((page, region)) => cache.unpack(page, region),
                    None => server().free_rid(entry.texture),
                }
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
                packed: None,
            },
        );
        (Lease(key), texture, width, height)
    })
}

/// A mask's texture for `key`, made by `make` (RGBA8 bytes and their size) if no box holds one, packed into an atlas page when it is
/// small enough, with the texels of that texture it is and a lease on it.
fn acquire_packed(
    key: CacheKey,
    make: impl FnOnce() -> (Vec<u8>, usize, usize),
) -> (Lease, Rid, Rect2) {
    let cached = CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        let entry = cache.entries.get_mut(&key)?;
        entry.refs += 1;
        Some((entry.texture, entry.source()))
    });
    if let Some((texture, source)) = cached {
        return (Lease(key), texture, source);
    }
    let (bytes, width, height) = make();
    let largest = (LARGEST_PACKED_TEXELS - 2 * GUTTER_TEXELS) as usize;
    if width > largest || height > largest {
        let (lease, texture, width, height) = acquire(key, || (bytes, width, height));
        return (
            lease,
            texture,
            Rect2::new(Vector2::ZERO, Vector2::new(width as f32, height as f32)),
        );
    }
    CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        let (page, texture, region) = cache.pack(&bytes, width, height);
        let entry = Entry {
            texture,
            refs: 1,
            width,
            height,
            packed: Some((page, region)),
        };
        let source = entry.source();
        cache.entries.insert(key.clone(), entry);
        (Lease(key), texture, source)
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

/// How many pictures the cache holds, masks and ramps (a measure for the verifier: boxes of one shape share one).
pub(crate) fn cached_textures() -> usize {
    CACHE.with(|cache| cache.borrow().entries.len())
}

/// How many textures those pictures are in: the atlas pages, and the pictures with a texture of their own.
pub(crate) fn texture_count() -> usize {
    CACHE.with(|cache| {
        let cache = cache.borrow();
        cache.pages.iter().flatten().count()
            + cache.entries.values().filter(|entry| entry.packed.is_none()).count()
    })
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
    pub(crate) fn feather_of(&self, rect: &RRect) -> Feather {
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
    /// The fill, moved in by these widths (top, right, bottom, left, device pixels) under an opaque border.
    Fill {
        inset: [f32; 4],
    },
    /// The whole border, in one colour.
    Border,
}

/// Draw the mask of a shape, tinted by `color`. A mask is baked once for what it depends on and drawn as a nine-patch
/// whose corners are the mask's own pixels and whose middle is stretched, so it fits a box of any size: the pixels past
/// a corner's reach are the same along an edge, and the middle of the mask is empty (the hole).
fn mask(item: Rid, shape: &BoxShape, cut: Cut, color: Rgba, leases: &mut Vec<Lease>) {
    let scale = shape.scale;
    // The radii as CSS fits them to the box: `rounded-full` on a pill reaches half its height, not 9999 pixels.
    let radius = shape
        .border_box()
        .corners
        .iter()
        .map(|corner| corner.x.max(corner.y))
        .fold(0.0, f32::max);
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
        Cut::Fill { inset } => {
            let deepest = inset.iter().copied().fold(0.0, f32::max);
            (Shape::Fill { inset }, 0.0, radius + deepest)
        }
        Cut::Border => (Shape::Border, 0.0, radius + border),
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
            Shape::Fill { inset } => {
                let [top, right, bottom, left] = quantized_all(inset);
                [4, top, right, bottom, left, 0]
            }
            Shape::Border => [5, 0, 0, 0, 0, 0],
        },
        width: quantized(baked_width),
        height: quantized(baked_height),
        radii: quantized_all(shape.radii),
        borders: quantized_all(shape.borders),
        margin,
    });
    let (lease, texture, source) = acquire_packed(key, || {
        let baked = shadow_mask::bake(&spec);
        let bytes = baked
            .alpha
            .iter()
            .flat_map(|alpha| [u8::MAX, u8::MAX, u8::MAX, *alpha])
            .collect();
        (bytes, baked.width, baked.height)
    });
    leases.push(lease);
    let (texture_width, texture_height) = (source.size.x, source.size.y);
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
                texture_width
            },
            if stretch_y {
                shape.height + 2.0 * margin
            } else {
                texture_height
            },
        ),
    );
    let patch = Vector2::new(
        if stretch_x { depth + margin } else { 0.0 },
        if stretch_y { depth + margin } else { 0.0 },
    );
    server()
        .canvas_item_add_nine_patch_ex(item, dest, source, texture, patch, patch)
        // The middle of a box that is stretched both ways is inside the hole of every mask but a fill's, which it is the inside of.
        .draw_center(matches!(cut, Cut::Fill { .. }) || !(stretch_x && stretch_y))
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

/// Where along a texture one pixel high (a ramp) each vertex of a mesh is: a function of the position (a linear gradient's line),
/// or one value per vertex (a conic gradient's turn, which a vertex at the centre of two sectors has twice).
enum Along<'a> {
    Position(&'a dyn Fn(f32, f32) -> f32),
    PerVertex(&'a [f32]),
}

/// A texture a mesh samples, and where along it each vertex is.
type Sampled<'a> = (Rid, Along<'a>);

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
        Some((texture, along)) => {
            let coordinates: Vec<Vector2> = match along {
                Along::Position(position) => mesh
                    .points
                    .iter()
                    .map(|point| Vector2::new(position(point.x, point.y), RAMP_ROW))
                    .collect(),
                Along::PerVertex(values) => {
                    assert_eq!(values.len(), mesh.points.len(), "a coordinate per vertex");
                    values.iter().map(|value| Vector2::new(*value, RAMP_ROW)).collect()
                }
            };
            let uvs = PackedVector2Array::from(coordinates);
            rs.canvas_item_add_triangle_array_ex(item, &indices, &points, &colors)
                .uvs(&uvs)
                .texture(texture)
                .done();
        }
        None => rs.canvas_item_add_triangle_array(item, &indices, &points, &colors),
    }
}

/// The middle of a ramp's one row of texels, where a mesh samples it.
const RAMP_ROW: f32 = 0.5;

/// A ramp texture for `stops` with `texels` texels, interpolated in `space`, from the cache.
fn ramp_texture(stops: &[ResolvedStop], texels: usize, space: ColorSpace, leases: &mut Vec<Lease>) -> Rid {
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
        space,
    });
    let (lease, texture, _, _) = acquire(key, || (ramp(stops, texels, space), texels, 1));
    leases.push(lease);
    texture
}

/// Fill the border box with the gradient. It is laid out over the padding box (CSS `background-origin`) and drawn under the border
/// (`background-clip: border-box`); beyond the padding box a linear one holds its end colours where CSS would tile the image (a
/// conic one has a colour for every angle, so it reaches the border box as it is).
pub(crate) fn gradient(
    item: Rid,
    shape: &BoxShape,
    gradient: &Gradient,
    covered: [bool; 4],
    leases: &mut Vec<Lease>,
) {
    match gradient {
        Gradient::Linear(linear) => linear_gradient(item, shape, linear, covered, leases),
        Gradient::Conic(conic) => conic_gradient(item, shape, conic, covered, leases),
    }
}

fn linear_gradient(
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
    let texture = ramp_texture(&stops, ramp_texels(line.length), gradient.space, leases);
    let fill_box = shape.fill_box(covered);
    let mesh = box_mesh::fill(&fill_box, shape.feather_of(&fill_box));
    begin(item, shape.scale);
    add_mesh(
        item,
        &mesh,
        Color::WHITE,
        Some((texture, Along::Position(&|x, y| line.t(x, y)))),
    );
    end(item);
}

/// A conic gradient: the fill's mesh cut into sectors round the centre (`box_mesh::sectors`), each vertex at its turn along a ramp
/// of one turn, as long as the circle through the farthest corner is round, in device pixels.
fn conic_gradient(
    item: Rid,
    shape: &BoxShape,
    gradient: &ConicGradient,
    covered: [bool; 4],
    leases: &mut Vec<Lease>,
) {
    let padding = shape.padding_box();
    if padding.width() <= 0.0 || padding.height() <= 0.0 {
        return;
    }
    let centre = gradient.centre(
        padding.x0,
        padding.y0,
        padding.width(),
        padding.height(),
        shape.scale,
    );
    let fill_box = shape.fill_box(covered);
    let radius = [
        (fill_box.x0, fill_box.y0),
        (fill_box.x1, fill_box.y0),
        (fill_box.x1, fill_box.y1),
        (fill_box.x0, fill_box.y1),
    ]
    .into_iter()
    .map(|(x, y)| (x - centre.0).hypot(y - centre.1))
    .fold(0.0, f32::max);
    let stops = gradient.resolve();
    let texture = ramp_texture(
        &stops,
        ramp_texels(std::f32::consts::TAU * radius),
        gradient.space,
        leases,
    );
    let mesh = box_mesh::fill(&fill_box, shape.feather_of(&fill_box));
    let cut = box_mesh::sectors(
        &mesh,
        centre,
        gradient.start_radians(),
        box_mesh::sector_count(radius),
    );
    begin(item, shape.scale);
    add_mesh(
        item,
        &cut.mesh,
        Color::WHITE,
        Some((texture, Along::PerVertex(&cut.t))),
    );
    end(item);
}

/// The shape of a rounded clip: the padding box, opaque white with the box's own feather. A `CLIP_ONLY` canvas group shows what is
/// below it where this is drawn, in proportion to its alpha, so the clip's edge is antialiased as the box's inner edge is.
pub(crate) fn clip_mask(item: Rid, shape: &BoxShape) {
    let padding = shape.padding_box();
    let mesh = box_mesh::fill(&padding, shape.feather_of(&padding));
    begin(item, shape.scale);
    add_mesh(item, &mesh, Color::WHITE, None);
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

/// The side of the atlas's block of white texels. Every texel of it, its gutter too, is white, so it reads white wherever it is
/// sampled and a rectangle stretched from it has the hard edges of the rectangle itself.
const WHITE_TEXELS: usize = 4;

/// The atlas's white texels and a lease on them.
fn white(leases: &mut Vec<Lease>) -> (Rid, Rect2) {
    let (lease, texture, source) = acquire_packed(CacheKey::White, || {
        (vec![u8::MAX; WHITE_TEXELS * WHITE_TEXELS * RGBA], WHITE_TEXELS, WHITE_TEXELS)
    });
    leases.push(lease);
    (texture, source)
}

/// A rectangle of one colour, stretched from the atlas's white texels: a nine-patch with no margins, so it batches with the masks.
fn white_rect(item: Rid, (texture, source): (Rid, Rect2), rect: Rect2, color: Color) {
    if rect.size.x <= 0.0 || rect.size.y <= 0.0 {
        return;
    }
    server()
        .canvas_item_add_nine_patch_ex(item, rect, source, texture, Vector2::ZERO, Vector2::ZERO)
        .modulate(color)
        .done();
}

/// Fill the box with one colour: a mask of its fill box (the border box, moved half way under an opaque border on the `covered`
/// sides, `BoxShape::fill_box`), or for square corners the atlas's white texels stretched over the fill box.
pub(crate) fn fill(
    item: Rid,
    shape: &BoxShape,
    color: Color,
    covered: [bool; 4],
    leases: &mut Vec<Lease>,
) {
    if color.a <= 0.0 {
        return;
    }
    let fill_box = shape.fill_box(covered);
    if fill_box.is_rounded() {
        let inset = std::array::from_fn(|side| {
            if covered[side] {
                shape.borders[side] * 0.5
            } else {
                0.0
            }
        });
        mask(
            item,
            shape,
            Cut::Fill { inset },
            [color.r, color.g, color.b, color.a],
            leases,
        );
        return;
    }
    let white = white(leases);
    begin(item, shape.scale);
    white_rect(
        item,
        white,
        Rect2::new(
            Vector2::new(fill_box.x0, fill_box.y0),
            Vector2::new(fill_box.width(), fill_box.height()),
        ),
        color,
    );
    end(item);
}

/// The whole border in one colour: a mask of the ring between the border box and the padding box, or for square corners four bars of
/// the atlas's white texels, the top and bottom across the box and the sides between them, so no pixel is covered twice.
pub(crate) fn one_colour_border(item: Rid, shape: &BoxShape, color: Color, leases: &mut Vec<Lease>) {
    if color.a <= 0.0 {
        return;
    }
    if shape.border_box().is_rounded() {
        mask(
            item,
            shape,
            Cut::Border,
            [color.r, color.g, color.b, color.a],
            leases,
        );
        return;
    }
    let white = white(leases);
    let [top, right, bottom, left] = shape.borders;
    let (width, height) = (shape.width, shape.height);
    // Borders wider than the box together are cut where they meet, as the padding box is then empty.
    let top = top.min(height);
    let bottom = bottom.min(height - top);
    let between = height - top - bottom;
    let left = left.min(width);
    let right = right.min(width - left);
    begin(item, shape.scale);
    for rect in [
        Rect2::new(Vector2::ZERO, Vector2::new(width, top)),
        Rect2::new(Vector2::new(0.0, height - bottom), Vector2::new(width, bottom)),
        Rect2::new(Vector2::new(0.0, top), Vector2::new(left, between)),
        Rect2::new(Vector2::new(width - right, top), Vector2::new(right, between)),
    ] {
        white_rect(item, white, rect, color);
    }
    end(item);
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
