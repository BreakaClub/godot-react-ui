//! `Image` elements: the textures and materials a root registers (`register_texture`, `register_material`), how a picture is
//! placed in an image's content box (`object-fit`), and what an image item records.
//!
//! An image draws in an item of its own under its box item (`RenderNode::record_image`), so its background and border are drawn
//! under the picture, a registered material applies to the picture alone, and the clips of its paint ancestors apply to it as
//! to any child. The picture is laid out as a replaced element: its region's size is the leaf's intrinsic size and, unless the
//! author set an `aspect-ratio`, its proportions are the box's (`intrinsic_aspect`), so a width alone gives the height.
use std::collections::HashMap;

use godot::classes::{Material, RenderingServer, Texture2D};
use godot::prelude::*;

use crate::props::{ImageFitSpec, ImageSliceSpec, PropsSpec};

/// The textures and materials one root's images name, by the ids JS gave them. Per root, as its font faces are.
#[derive(Default)]
pub(crate) struct ImageBook {
    textures: HashMap<String, Gd<Texture2D>>,
    materials: HashMap<String, Gd<Material>>,
}

impl ImageBook {
    pub(crate) fn register_texture(
        &mut self,
        id: &str,
        texture: Gd<Texture2D>,
    ) -> Result<(), String> {
        if id.is_empty() {
            return Err("a texture id must not be empty".into());
        }
        self.textures.insert(id.to_owned(), texture);
        Ok(())
    }

    /// Whether `id` was registered.
    pub(crate) fn unregister_texture(&mut self, id: &str) -> bool {
        self.textures.remove(id).is_some()
    }

    pub(crate) fn register_material(
        &mut self,
        id: &str,
        material: Gd<Material>,
    ) -> Result<(), String> {
        if id.is_empty() {
            return Err("a material id must not be empty".into());
        }
        self.materials.insert(id.to_owned(), material);
        Ok(())
    }

    /// Whether `id` was registered.
    pub(crate) fn unregister_material(&mut self, id: &str) -> bool {
        self.materials.remove(id).is_some()
    }

    pub(crate) fn texture(&self, id: &str) -> Option<&Gd<Texture2D>> {
        self.textures.get(id)
    }

    pub(crate) fn material(&self, id: &str) -> Option<&Gd<Material>> {
        self.materials.get(id)
    }

    /// The part of its texture an image shows, in the texture's pixels: `sourceRect`, or the whole texture. `None` while its
    /// `source` is not registered.
    pub(crate) fn region(&self, props: &PropsSpec) -> Option<Rect2> {
        let texture = self.texture(props.source.as_deref()?)?;
        Some(match props.source_rect {
            Some(rect) => Rect2::new(
                Vector2::new(rect.x, rect.y),
                Vector2::new(rect.width, rect.height),
            ),
            None => Rect2::new(Vector2::ZERO, texture.get_size()),
        })
    }
}

/// The proportions a layout gives an image whose author set no `aspect-ratio`: its picture's, as a replaced element's are.
pub(crate) fn intrinsic_aspect(region: Option<Rect2>) -> Option<f32> {
    region
        .filter(|region| region.size.x > 0.0 && region.size.y > 0.0)
        .map(|region| region.size.x / region.size.y)
}

/// `style` with the picture's proportions as its aspect ratio when the author set none.
pub(crate) fn with_intrinsic_aspect(mut style: taffy::Style, aspect: Option<f32>) -> taffy::Style {
    if style.aspect_ratio.is_none() {
        style.aspect_ratio = aspect;
    }
    style
}

/// Where a picture is drawn and which part of it, both before any flip.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Placed {
    /// In the image's own coordinates, never outside its content box.
    pub(crate) dest: Rect2,
    /// In the texture's pixels, inside the region.
    pub(crate) source: Rect2,
}

/// Place `region` in `content` as CSS `object-fit` does, cutting what falls outside the box from the source rather than
/// clipping the item, so nothing needs a clip of its own. `Tile` is drawn by the engine's tiling and is `fill` here. `None` when
/// nothing would be drawn.
pub(crate) fn place(fit: ImageFitSpec, content: Rect2, region: Rect2) -> Option<Placed> {
    if content.size.x <= 0.0
        || content.size.y <= 0.0
        || region.size.x <= 0.0
        || region.size.y <= 0.0
    {
        return None;
    }
    let contain = (content.size.x / region.size.x).min(content.size.y / region.size.y);
    let scale = match fit {
        ImageFitSpec::Fill | ImageFitSpec::Tile => {
            return Some(Placed {
                dest: content,
                source: region,
            });
        }
        ImageFitSpec::Contain => contain,
        ImageFitSpec::Cover => (content.size.x / region.size.x).max(content.size.y / region.size.y),
        ImageFitSpec::None => 1.0,
        ImageFitSpec::ScaleDown => contain.min(1.0),
    };
    let size = region.size * scale;
    let position = content.position + (content.size - size) * 0.5;
    let full = Rect2::new(position, size);
    let dest = full.intersect(content)?;
    if dest.size.x <= 0.0 || dest.size.y <= 0.0 {
        return None;
    }
    let source = Rect2::new(
        region.position + (dest.position - full.position) / scale,
        dest.size / scale,
    );
    Some(Placed { dest, source })
}

/// Mirror `source`, a part of `region`, about the region's centre on the axes that are flipped: the part of the picture a
/// flipped placement shows.
fn mirrored(source: Rect2, region: Rect2, flip_x: bool, flip_y: bool) -> Rect2 {
    let mut position = source.position;
    if flip_x {
        position.x = region.position.x + region.size.x
            - (source.position.x - region.position.x)
            - source.size.x;
    }
    if flip_y {
        position.y = region.position.y + region.size.y
            - (source.position.y - region.position.y)
            - source.size.y;
    }
    Rect2::new(position, source.size)
}

/// `dest` as the rectangle to draw it with, flipped on the axes that are: the same position with a negative size. The engine draws a
/// rectangle with a negative size over the same place, its size made positive and the picture mirrored on that axis
/// (`RendererCanvasCull::canvas_item_add_texture_rect_region`, `CANVAS_RECT_FLIP_H`), which is how `TextureRect` flips. Moving the
/// position by the size as well drew the picture one box further on, outside its box.
fn flipped(dest: Rect2, flip_x: bool, flip_y: bool) -> Rect2 {
    let mut size = dest.size;
    if flip_x {
        size.x = -size.x;
    }
    if flip_y {
        size.y = -size.y;
    }
    Rect2::new(dest.position, size)
}

/// What an image with `props` and this content box draws: `None` while its `source` is not registered. An unregistered `material`
/// draws the picture without one, as an unregistered font family shapes with the theme font.
pub(crate) fn key_for(book: &ImageBook, props: &PropsSpec, content: Rect2) -> Option<ImageKey> {
    let texture = book.texture(props.source.as_deref()?)?;
    let region = book.region(props)?;
    let material = props
        .material
        .as_deref()
        .and_then(|id| book.material(id))
        .map_or(Rid::Invalid, |material| material.get_rid());
    Some(ImageKey {
        texture: texture.get_rid(),
        material,
        content,
        region,
        fit: props.fit.unwrap_or_default(),
        slice: props.slice,
        tint: crate::paint::parse_color(props.tint_color.as_deref(), Color::WHITE),
        flip_x: props.flip_x == Some(true),
        flip_y: props.flip_y == Some(true),
    })
}

/// What an image item last drew. Equal keys mean its commands are still right.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ImageKey {
    pub(crate) texture: Rid,
    /// `Rid::Invalid` without a material.
    pub(crate) material: Rid,
    pub(crate) content: Rect2,
    pub(crate) region: Rect2,
    pub(crate) fit: ImageFitSpec,
    pub(crate) slice: Option<ImageSliceSpec>,
    pub(crate) tint: Color,
    pub(crate) flip_x: bool,
    pub(crate) flip_y: bool,
}

impl ImageKey {
    /// Record the picture into `item`, which is empty.
    pub(crate) fn draw(&self, item: Rid) {
        let mut rs = RenderingServer::singleton();
        if let Some(slice) = self.slice {
            // A nine-slice is drawn over the whole content box (validation allows it only with `fit: fill`).
            rs.canvas_item_add_nine_patch_ex(
                item,
                self.content,
                self.region,
                self.texture,
                Vector2::new(slice.left, slice.top),
                Vector2::new(slice.right, slice.bottom),
            )
            .draw_center(slice.fill != Some(false))
            .modulate(self.tint)
            .done();
            return;
        }
        if self.fit == ImageFitSpec::Tile {
            // The engine repeats the texture at its own size from the rectangle's top left (validation keeps `sourceRect` and
            // flips away from a tiled image).
            rs.canvas_item_add_texture_rect_ex(item, self.content, self.texture)
                .tile(true)
                .modulate(self.tint)
                .done();
            return;
        }
        let Some(placed) = place(self.fit, self.content, self.region) else {
            return;
        };
        let dest = flipped(placed.dest, self.flip_x, self.flip_y);
        let source = mirrored(placed.source, self.region, self.flip_x, self.flip_y);
        rs.canvas_item_add_texture_rect_region_ex(item, dest, self.texture, source)
            .modulate(self.tint)
            .done();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(x: f32, y: f32, width: f32, height: f32) -> Rect2 {
        Rect2::new(Vector2::new(x, y), Vector2::new(width, height))
    }

    #[test]
    fn fill_stretches_the_whole_region_over_the_box() {
        let placed = place(
            ImageFitSpec::Fill,
            rect(2.0, 3.0, 100.0, 50.0),
            rect(0.0, 0.0, 10.0, 10.0),
        )
        .unwrap();
        assert_eq!(placed.dest, rect(2.0, 3.0, 100.0, 50.0));
        assert_eq!(placed.source, rect(0.0, 0.0, 10.0, 10.0));
    }

    #[test]
    fn contain_fits_inside_and_centres_on_the_long_axis() {
        let placed = place(
            ImageFitSpec::Contain,
            rect(0.0, 0.0, 200.0, 100.0),
            rect(0.0, 0.0, 50.0, 50.0),
        )
        .unwrap();
        assert_eq!(placed.dest, rect(50.0, 0.0, 100.0, 100.0));
        assert_eq!(placed.source, rect(0.0, 0.0, 50.0, 50.0));
    }

    #[test]
    fn cover_fills_the_box_and_cuts_the_overflow_from_the_source() {
        // A square picture in a 2:1 box: scaled by 4 to 200 wide, 200 tall, centred, so the middle 25 rows of 50 show.
        let placed = place(
            ImageFitSpec::Cover,
            rect(0.0, 0.0, 200.0, 100.0),
            rect(10.0, 0.0, 50.0, 50.0),
        )
        .unwrap();
        assert_eq!(placed.dest, rect(0.0, 0.0, 200.0, 100.0));
        assert_eq!(placed.source, rect(10.0, 12.5, 50.0, 25.0));
    }

    #[test]
    fn none_keeps_its_size_and_scale_down_never_enlarges() {
        let none = place(
            ImageFitSpec::None,
            rect(0.0, 0.0, 100.0, 100.0),
            rect(0.0, 0.0, 20.0, 40.0),
        )
        .unwrap();
        assert_eq!(none.dest, rect(40.0, 30.0, 20.0, 40.0));
        let down = place(
            ImageFitSpec::ScaleDown,
            rect(0.0, 0.0, 100.0, 100.0),
            rect(0.0, 0.0, 20.0, 40.0),
        )
        .unwrap();
        assert_eq!(down, none);
        let shrunk = place(
            ImageFitSpec::ScaleDown,
            rect(0.0, 0.0, 10.0, 10.0),
            rect(0.0, 0.0, 20.0, 40.0),
        )
        .unwrap();
        assert_eq!(shrunk.dest, rect(2.5, 0.0, 5.0, 10.0));
    }

    #[test]
    fn none_larger_than_the_box_shows_its_middle() {
        let placed = place(
            ImageFitSpec::None,
            rect(0.0, 0.0, 10.0, 10.0),
            rect(0.0, 0.0, 30.0, 10.0),
        )
        .unwrap();
        assert_eq!(placed.dest, rect(0.0, 0.0, 10.0, 10.0));
        assert_eq!(placed.source, rect(10.0, 0.0, 10.0, 10.0));
    }

    #[test]
    fn an_empty_box_or_region_draws_nothing() {
        assert_eq!(
            place(
                ImageFitSpec::Fill,
                rect(0.0, 0.0, 0.0, 10.0),
                rect(0.0, 0.0, 1.0, 1.0)
            ),
            None
        );
        assert_eq!(
            place(
                ImageFitSpec::Contain,
                rect(0.0, 0.0, 10.0, 10.0),
                rect(0.0, 0.0, 0.0, 1.0)
            ),
            None
        );
    }

    #[test]
    fn a_flip_shows_the_mirrored_part_of_the_region() {
        // The right-hand 10 of a 30-wide region is the left-hand 10 once flipped.
        let region = rect(5.0, 0.0, 30.0, 10.0);
        assert_eq!(
            mirrored(rect(25.0, 0.0, 10.0, 10.0), region, true, false),
            rect(5.0, 0.0, 10.0, 10.0)
        );
        assert_eq!(
            mirrored(rect(25.0, 2.0, 10.0, 3.0), region, false, true),
            rect(25.0, 5.0, 10.0, 3.0)
        );
    }

    #[test]
    fn a_flipped_picture_is_drawn_over_its_own_box() {
        // The engine draws a rectangle with a negative size where its position is, mirrored: the position stays.
        let dest = rect(10.0, 20.0, 48.0, 32.0);
        assert_eq!(flipped(dest, false, false), dest);
        assert_eq!(
            flipped(dest, true, false),
            Rect2::new(Vector2::new(10.0, 20.0), Vector2::new(-48.0, 32.0))
        );
        assert_eq!(
            flipped(dest, false, true),
            Rect2::new(Vector2::new(10.0, 20.0), Vector2::new(48.0, -32.0))
        );
        assert_eq!(
            flipped(dest, true, true),
            Rect2::new(Vector2::new(10.0, 20.0), Vector2::new(-48.0, -32.0))
        );
    }

    #[test]
    fn the_intrinsic_aspect_is_the_regions() {
        assert_eq!(
            intrinsic_aspect(Some(rect(0.0, 0.0, 30.0, 10.0))),
            Some(3.0)
        );
        assert_eq!(intrinsic_aspect(Some(rect(0.0, 0.0, 30.0, 0.0))), None);
        assert_eq!(intrinsic_aspect(None), None);
    }
}
