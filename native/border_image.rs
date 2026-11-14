//! CSS `border-image`: the style's values, and the geometry that cuts a picture into nine regions and lays them over a
//! box's border area (CSS Backgrounds and Borders 3, "Border Images"). Nothing here touches Godot; `box_paint.rs` turns the
//! pieces into canvas commands.
//!
//! The picture is a texture the root registered (`register_texture`), named by `border-image-source: url(<id>)`; there is no
//! loading from a path or a URL, as for `Image`. Slices are in the picture's own pixels or a percentage of its size. The
//! widths of the destination are a multiple of the border width (CSS's unitless value), pixels, or `auto` (the slice's own
//! size); the outset moves the border image area out from the border box by the same kinds of value. `stretch` and `round`
//! are drawn; `repeat` and `space` are not (Godot has no equivalent of either that CSS would recognise, and a `repeat` that
//! started at the corner instead of the centre would be wrong).

use serde::de::{Deserialize, Deserializer, Error as DeError};
use serde::{Deserialize as DeriveDeserialize, Serialize, Serializer};

/// `border-image-source`: `none`, or the id of a registered texture (`url(id)`, `url("id")` or `url('id')`).
#[derive(Clone, Debug, PartialEq)]
pub enum BorderImageSource {
    None,
    Texture(String),
}

impl BorderImageSource {
    pub fn parse(input: &str) -> Result<BorderImageSource, String> {
        let text = input.trim();
        if text.eq_ignore_ascii_case("none") {
            return Ok(BorderImageSource::None);
        }
        let inner = text
            .strip_prefix("url(")
            .and_then(|rest| rest.strip_suffix(')'))
            .ok_or_else(|| {
                format!(
                    "borderImageSource must be none or url(<registered texture id>), not {input:?} (gradients and paths are not drawn)"
                )
            })?
            .trim();
        let id = inner
            .strip_prefix('"')
            .and_then(|rest| rest.strip_suffix('"'))
            .or_else(|| {
                inner
                    .strip_prefix('\'')
                    .and_then(|rest| rest.strip_suffix('\''))
            })
            .unwrap_or(inner);
        if id.is_empty() {
            return Err("borderImageSource names no texture".into());
        }
        Ok(BorderImageSource::Texture(id.to_owned()))
    }

    /// The registered texture id this source names.
    pub fn texture_id(&self) -> Option<&str> {
        match self {
            BorderImageSource::None => None,
            BorderImageSource::Texture(id) => Some(id),
        }
    }
}

impl<'de> Deserialize<'de> for BorderImageSource {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        BorderImageSource::parse(&text).map_err(D::Error::custom)
    }
}

impl Serialize for BorderImageSource {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            BorderImageSource::None => serializer.serialize_str("none"),
            BorderImageSource::Texture(id) => serializer.serialize_str(&format!("url(\"{id}\")")),
        }
    }
}

/// How the edges and the middle fill their regions of the border image area. CSS's `repeat` and `space` are not built.
#[derive(Clone, Copy, Debug, Default, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum BorderImageRepeat {
    /// One stretched piece.
    #[default]
    Stretch,
    /// Whole tiles at the scale of the border width, each stretched a little so a whole number fit.
    Round,
}

/// A value of `border-image-slice`: pixels of the picture, or a percentage of its size along the side's axis.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum SliceValue {
    Pixels(f32),
    Percent(f32),
}

/// A value of `border-image-width` or `border-image-outset`: CSS's unitless number is a multiple of the border width.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum EdgeValue {
    Multiple(f32),
    Pixels(f32),
    /// `border-image-width` only: the size of the slice.
    Auto,
}

/// The wire form of both: a number, or text (`"25%"`, `"12px"`, `"auto"`).
#[derive(DeriveDeserialize, Serialize)]
#[serde(untagged)]
enum Wire {
    Number(f32),
    Text(String),
}

impl<'de> Deserialize<'de> for SliceValue {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        match Wire::deserialize(deserializer)? {
            Wire::Number(value) => Ok(SliceValue::Pixels(value)),
            Wire::Text(text) => text
                .trim()
                .strip_suffix('%')
                .and_then(|number| number.trim().parse::<f32>().ok())
                .map(SliceValue::Percent)
                .ok_or_else(|| {
                    D::Error::custom(format!(
                        "a border image slice is a number or a percentage like \"25%\", not {text:?}"
                    ))
                }),
        }
    }
}

impl Serialize for SliceValue {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            SliceValue::Pixels(value) => Wire::Number(*value).serialize(serializer),
            SliceValue::Percent(value) => Wire::Text(format!("{value}%")).serialize(serializer),
        }
    }
}

impl<'de> Deserialize<'de> for EdgeValue {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        match Wire::deserialize(deserializer)? {
            Wire::Number(value) => Ok(EdgeValue::Multiple(value)),
            Wire::Text(text) if text.trim() == "auto" => Ok(EdgeValue::Auto),
            Wire::Text(text) => text
                .trim()
                .strip_suffix("px")
                .and_then(|number| number.trim().parse::<f32>().ok())
                .map(EdgeValue::Pixels)
                .ok_or_else(|| {
                    D::Error::custom(format!(
                        "a border image width is a number, a length like \"12px\" or \"auto\", not {text:?}"
                    ))
                }),
        }
    }
}

impl Serialize for EdgeValue {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            EdgeValue::Multiple(value) => Wire::Number(*value).serialize(serializer),
            EdgeValue::Pixels(value) => Wire::Text(format!("{value}px")).serialize(serializer),
            EdgeValue::Auto => Wire::Text("auto".into()).serialize(serializer),
        }
    }
}

/// What the utilities and `borderImageSlice` set, side by side; each side merges on its own across layers
/// (`border-slice-8 hover:border-slice-t-12`).
#[derive(Clone, Copy, Debug, Default, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SliceParts {
    pub top: Option<SliceValue>,
    pub right: Option<SliceValue>,
    pub bottom: Option<SliceValue>,
    pub left: Option<SliceValue>,
    /// Whether the middle is drawn (`fill`). Not drawn when unset, as in CSS.
    pub fill: Option<bool>,
}

/// As [`SliceParts`], for `borderImageWidth` and `borderImageOutset`.
#[derive(Clone, Copy, Debug, Default, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EdgeParts {
    pub top: Option<EdgeValue>,
    pub right: Option<EdgeValue>,
    pub bottom: Option<EdgeValue>,
    pub left: Option<EdgeValue>,
}

macro_rules! merge_fields {
    ($self:ident, $other:ident, $($field:ident),+) => {{
        $(
            if $other.$field.is_some() {
                $self.$field = $other.$field;
            }
        )+
    }};
}

impl SliceParts {
    pub fn merge(&mut self, other: &SliceParts) {
        merge_fields!(self, other, top, right, bottom, left, fill);
    }

    pub fn validate(&self) -> Result<(), String> {
        for (side, value) in [
            ("top", self.top),
            ("right", self.right),
            ("bottom", self.bottom),
            ("left", self.left),
        ] {
            let (SliceValue::Pixels(number) | SliceValue::Percent(number)) = match value {
                Some(value) => value,
                None => continue,
            };
            if !number.is_finite() || number < 0.0 {
                return Err(format!(
                    "borderImageSlice {side} must be a nonnegative number, not {number}"
                ));
            }
        }
        Ok(())
    }
}

impl EdgeParts {
    pub fn merge(&mut self, other: &EdgeParts) {
        merge_fields!(self, other, top, right, bottom, left);
    }

    /// `name` is the property, `allow_auto` whether `auto` is a value of it (`border-image-width` takes it, the outset not).
    pub fn validate(&self, name: &str, allow_auto: bool) -> Result<(), String> {
        for (side, value) in [
            ("top", self.top),
            ("right", self.right),
            ("bottom", self.bottom),
            ("left", self.left),
        ] {
            match value {
                Some(EdgeValue::Multiple(number) | EdgeValue::Pixels(number)) => {
                    if !number.is_finite() || number < 0.0 {
                        return Err(format!(
                            "{name} {side} must be a nonnegative number, not {number}"
                        ));
                    }
                }
                Some(EdgeValue::Auto) if !allow_auto => {
                    return Err(format!("{name} {side} cannot be auto"));
                }
                Some(EdgeValue::Auto) | None => {}
            }
        }
        Ok(())
    }
}

/// A side order of the arrays here: top, right, bottom, left, as the CSS lists them.
const TOP: usize = 0;
const RIGHT: usize = 1;
const BOTTOM: usize = 2;
const LEFT: usize = 3;

/// A rectangle in pixels: the position of its top left and its size.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Quad {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// One drawn rectangle: `source` of the picture (in its pixels) over `dest` of the box (in logical pixels, from the border
/// box's top left).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Piece {
    pub source: Quad,
    pub dest: Quad,
}

/// A border image as a style asks for it, with CSS's initial values for what it leaves out: a slice of 100%, a width of one
/// border width, no outset, `stretch`.
#[derive(Clone, Debug, PartialEq)]
pub struct BorderImage {
    pub texture: String,
    pub slice: SliceParts,
    pub width: EdgeParts,
    pub outset: EdgeParts,
    pub repeat: BorderImageRepeat,
}

/// The slice of a side in picture pixels, never past the picture's size along its axis (CSS reads a larger value as 100%).
fn slice_pixels(value: Option<SliceValue>, along: f32) -> f32 {
    let pixels = match value {
        Some(SliceValue::Pixels(pixels)) => pixels,
        Some(SliceValue::Percent(percent)) => percent / 100.0 * along,
        None => along,
    };
    pixels.clamp(0.0, along)
}

fn edge_pixels(value: Option<EdgeValue>, default: EdgeValue, border: f32, slice: f32) -> f32 {
    match value.unwrap_or(default) {
        EdgeValue::Multiple(multiple) => multiple * border,
        EdgeValue::Pixels(pixels) => pixels,
        EdgeValue::Auto => slice,
    }
}

impl BorderImage {
    /// How far the border image area reaches past the border box on each side, in pixels, given the border widths.
    pub fn outsets(&self, borders: [f32; 4]) -> [f32; 4] {
        let sides = [
            self.outset.top,
            self.outset.right,
            self.outset.bottom,
            self.outset.left,
        ];
        std::array::from_fn(|side| {
            edge_pixels(sides[side], EdgeValue::Multiple(0.0), borders[side], 0.0)
        })
    }

    /// The pieces that draw the border image of a box of `size` with border widths `borders`, from a picture of `picture`
    /// pixels: the eight outer regions, and the middle when `fill` is set. Positions are from the border box's top left, so
    /// an outset gives negative ones.
    pub fn pieces(&self, picture: (f32, f32), size: (f32, f32), borders: [f32; 4]) -> Vec<Piece> {
        let (picture_width, picture_height) = picture;
        let slice = [
            slice_pixels(self.slice.top, picture_height),
            slice_pixels(self.slice.right, picture_width),
            slice_pixels(self.slice.bottom, picture_height),
            slice_pixels(self.slice.left, picture_width),
        ];
        let outset = self.outsets(borders);
        let area = Quad {
            x: -outset[LEFT],
            y: -outset[TOP],
            width: size.0 + outset[LEFT] + outset[RIGHT],
            height: size.1 + outset[TOP] + outset[BOTTOM],
        };
        let widths = [
            self.width.top,
            self.width.right,
            self.width.bottom,
            self.width.left,
        ];
        let mut width: [f32; 4] = std::array::from_fn(|side| {
            edge_pixels(widths[side], EdgeValue::Multiple(1.0), borders[side], slice[side])
        });
        // Widths that do not fit the area shrink together, so the corners keep their proportions (CSS 6.3).
        let scale = [
            (width[LEFT] + width[RIGHT], area.width),
            (width[TOP] + width[BOTTOM], area.height),
        ]
        .into_iter()
        .filter(|(sum, _)| *sum > 0.0)
        .map(|(sum, available)| available / sum)
        .fold(1.0_f32, f32::min);
        if scale < 1.0 {
            width = width.map(|value| value * scale);
        }

        // The lines that cut the picture and the area, in order: the outer edge, the corner's end, the corner's start, the
        // outer edge.
        let source_x = [0.0, slice[LEFT], picture_width - slice[RIGHT], picture_width];
        let source_y = [0.0, slice[TOP], picture_height - slice[BOTTOM], picture_height];
        let dest_x = [
            area.x,
            area.x + width[LEFT],
            area.x + area.width - width[RIGHT],
            area.x + area.width,
        ];
        let dest_y = [
            area.y,
            area.y + width[TOP],
            area.y + area.height - width[BOTTOM],
            area.y + area.height,
        ];
        let region = |xs: &[f32; 4], ys: &[f32; 4], column: usize, row: usize| Quad {
            x: xs[column],
            y: ys[row],
            width: xs[column + 1] - xs[column],
            height: ys[row + 1] - ys[row],
        };

        // How many destination pixels one picture pixel of each edge covers (the edge's width over its slice), which `round`
        // tiles at and the middle borrows.
        let edge_scale = |side: usize| (slice[side] > 0.0).then(|| width[side] / slice[side]);
        let horizontal_scale = edge_scale(TOP).or(edge_scale(BOTTOM)).unwrap_or(1.0);
        let vertical_scale = edge_scale(LEFT).or(edge_scale(RIGHT)).unwrap_or(1.0);
        let top_scale = edge_scale(TOP).unwrap_or(1.0);
        let bottom_scale = edge_scale(BOTTOM).unwrap_or(1.0);
        let left_scale = edge_scale(LEFT).unwrap_or(1.0);
        let right_scale = edge_scale(RIGHT).unwrap_or(1.0);

        // (column, row, the scale a tile has along x and along y).
        let regions: [(usize, usize, f32, f32); 9] = [
            (0, 0, 1.0, 1.0),
            (1, 0, top_scale, top_scale),
            (2, 0, 1.0, 1.0),
            (0, 1, left_scale, left_scale),
            (1, 1, horizontal_scale, vertical_scale),
            (2, 1, right_scale, right_scale),
            (0, 2, 1.0, 1.0),
            (1, 2, bottom_scale, bottom_scale),
            (2, 2, 1.0, 1.0),
        ];
        let mut pieces = Vec::new();
        for (column, row, scale_x, scale_y) in regions {
            let is_middle = column == 1 && row == 1;
            if is_middle && self.slice.fill != Some(true) {
                continue;
            }
            let source = region(&source_x, &source_y, column, row);
            let dest = region(&dest_x, &dest_y, column, row);
            if source.width <= 0.0 || source.height <= 0.0 || dest.width <= 0.0 || dest.height <= 0.0
            {
                continue;
            }
            // Only the edges and the middle repeat, and only along the axis they run on; a corner is one piece.
            let is_corner = column != 1 && row != 1;
            let (across, down) = match (self.repeat, is_corner) {
                (BorderImageRepeat::Round, false) => (
                    if column == 1 {
                        tile_count(dest.width, source.width * scale_x)
                    } else {
                        1
                    },
                    if row == 1 {
                        tile_count(dest.height, source.height * scale_y)
                    } else {
                        1
                    },
                ),
                _ => (1, 1),
            };
            for tile_row in 0..down {
                for tile_column in 0..across {
                    let tile_width = dest.width / across as f32;
                    let tile_height = dest.height / down as f32;
                    pieces.push(Piece {
                        source,
                        dest: Quad {
                            x: dest.x + tile_width * tile_column as f32,
                            y: dest.y + tile_height * tile_row as f32,
                            width: tile_width,
                            height: tile_height,
                        },
                    });
                }
            }
        }
        pieces
    }
}

/// `round`: the whole number of tiles of about `tile` pixels that fills `length`, at least one.
fn tile_count(length: f32, tile: f32) -> u32 {
    if tile <= 0.0 {
        return 1;
    }
    ((length / tile).round() as u32).max(1)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn image(json: &str) -> BorderImage {
        let slice: SliceParts = serde_json::from_str(json).expect("a slice");
        BorderImage {
            texture: "frame".into(),
            slice,
            width: EdgeParts::default(),
            outset: EdgeParts::default(),
            repeat: BorderImageRepeat::Stretch,
        }
    }

    fn quad(x: f32, y: f32, width: f32, height: f32) -> Quad {
        Quad {
            x,
            y,
            width,
            height,
        }
    }

    #[test]
    fn a_source_names_a_registered_texture() {
        assert_eq!(
            BorderImageSource::parse("none").expect("none"),
            BorderImageSource::None
        );
        for text in ["url(frame)", "url(\"frame\")", "url( 'frame' )"] {
            assert_eq!(
                BorderImageSource::parse(text).expect("a url"),
                BorderImageSource::Texture("frame".into()),
                "{text}"
            );
        }
        assert!(BorderImageSource::parse("url()").is_err());
        assert!(BorderImageSource::parse("linear-gradient(red, blue)").is_err());
    }

    #[test]
    fn values_read_from_a_number_or_text() {
        let slice: SliceParts =
            serde_json::from_str(r#"{"top":12,"left":"25%","fill":true}"#).expect("slice");
        assert_eq!(slice.top, Some(SliceValue::Pixels(12.0)));
        assert_eq!(slice.left, Some(SliceValue::Percent(25.0)));
        assert!(serde_json::from_str::<SliceParts>(r#"{"top":"12px"}"#).is_err());
        let edges: EdgeParts =
            serde_json::from_str(r#"{"top":2,"right":"8px","bottom":"auto"}"#).expect("edges");
        assert_eq!(edges.top, Some(EdgeValue::Multiple(2.0)));
        assert_eq!(edges.right, Some(EdgeValue::Pixels(8.0)));
        assert_eq!(edges.bottom, Some(EdgeValue::Auto));
        assert!(serde_json::from_str::<EdgeParts>(r#"{"top":"1em"}"#).is_err());
        assert!(serde_json::from_str::<SliceParts>(r#"{"middle":1}"#).is_err());
    }

    #[test]
    fn layers_merge_side_by_side() {
        let mut slice: SliceParts =
            serde_json::from_str(r#"{"top":8,"right":8,"bottom":8,"left":8}"#).expect("slice");
        slice.merge(&serde_json::from_str(r#"{"top":12,"fill":true}"#).expect("slice"));
        assert_eq!(slice.top, Some(SliceValue::Pixels(12.0)));
        assert_eq!(slice.left, Some(SliceValue::Pixels(8.0)));
        assert_eq!(slice.fill, Some(true));
    }

    #[test]
    fn validation_refuses_negative_numbers_and_an_auto_outset() {
        assert!(
            serde_json::from_str::<SliceParts>(r#"{"top":-1}"#)
                .expect("slice")
                .validate()
                .is_err()
        );
        let auto: EdgeParts = serde_json::from_str(r#"{"top":"auto"}"#).expect("edges");
        assert!(auto.validate("borderImageWidth", true).is_ok());
        assert!(auto.validate("borderImageOutset", false).is_err());
    }

    #[test]
    fn nine_regions_are_cut_and_stretched_over_the_border_width() {
        // A 30x30 picture sliced 10 on each side, over a 100x60 box with 6 px borders: the width is one border width.
        let pieces = image(r#"{"top":10,"right":10,"bottom":10,"left":10}"#).pieces(
            (30.0, 30.0),
            (100.0, 60.0),
            [6.0; 4],
        );
        assert_eq!(pieces.len(), 8, "no middle without fill");
        assert_eq!(
            pieces[0],
            Piece {
                source: quad(0.0, 0.0, 10.0, 10.0),
                dest: quad(0.0, 0.0, 6.0, 6.0)
            }
        );
        assert_eq!(
            pieces[1],
            Piece {
                source: quad(10.0, 0.0, 10.0, 10.0),
                dest: quad(6.0, 0.0, 88.0, 6.0)
            }
        );
        assert_eq!(
            pieces[7],
            Piece {
                source: quad(20.0, 20.0, 10.0, 10.0),
                dest: quad(94.0, 54.0, 6.0, 6.0)
            }
        );
    }

    #[test]
    fn fill_draws_the_middle_over_the_inside() {
        let mut filled = image(r#"{"top":10,"right":10,"bottom":10,"left":10,"fill":true}"#);
        let pieces = filled.pieces((30.0, 30.0), (100.0, 60.0), [6.0; 4]);
        assert_eq!(pieces.len(), 9);
        assert_eq!(
            pieces[4],
            Piece {
                source: quad(10.0, 10.0, 10.0, 10.0),
                dest: quad(6.0, 6.0, 88.0, 48.0)
            }
        );
        filled.slice.fill = Some(false);
        assert_eq!(
            filled.pieces((30.0, 30.0), (100.0, 60.0), [6.0; 4]).len(),
            8
        );
    }

    #[test]
    fn the_default_slice_is_the_whole_picture_so_only_the_corners_remain() {
        let default = image("{}");
        let pieces = default.pieces((30.0, 30.0), (100.0, 60.0), [6.0; 4]);
        assert_eq!(pieces.len(), 4, "the edges have no picture left");
        assert_eq!(pieces[0].source, quad(0.0, 0.0, 30.0, 30.0));
    }

    #[test]
    fn a_slice_past_the_picture_is_the_whole_of_it() {
        let pieces = image(r#"{"top":99,"left":99}"#).pieces((30.0, 20.0), (100.0, 60.0), [4.0; 4]);
        assert_eq!(pieces[0].source, quad(0.0, 0.0, 30.0, 20.0));
    }

    #[test]
    fn widths_that_do_not_fit_shrink_together() {
        let mut wide = image(r#"{"top":10,"right":10,"bottom":10,"left":10}"#);
        wide.width = serde_json::from_str(r#"{"top":"40px","right":"40px","bottom":"40px","left":"40px"}"#)
            .expect("widths");
        // 40 + 40 on a 60 px wide box is 80: every width becomes 30 (a factor of 0.75), and the height 20 + ... fits.
        let pieces = wide.pieces((30.0, 30.0), (60.0, 100.0), [0.0; 4]);
        assert_eq!(pieces[0].dest, quad(0.0, 0.0, 30.0, 30.0));
        // The top edge has no room left and is skipped, so the next piece is the top right corner.
        assert_eq!(pieces[1].dest, quad(30.0, 0.0, 30.0, 30.0));
    }

    #[test]
    fn auto_widths_are_the_slice_and_an_outset_moves_the_area_out() {
        let mut framed = image(r#"{"top":10,"right":10,"bottom":10,"left":10}"#);
        framed.width = serde_json::from_str(r#"{"top":"auto","right":"auto","bottom":"auto","left":"auto"}"#)
            .expect("widths");
        framed.outset = serde_json::from_str(r#"{"top":1,"right":1,"bottom":1,"left":1}"#).expect("outset");
        let pieces = framed.pieces((30.0, 30.0), (100.0, 60.0), [4.0; 4]);
        // The outset is one border width (4 px): the area is 108x68 from (-4, -4), and the corner is the slice's 10 px.
        assert_eq!(pieces[0].dest, quad(-4.0, -4.0, 10.0, 10.0));
        assert_eq!(pieces[7].dest, quad(94.0, 54.0, 10.0, 10.0));
        assert_eq!(framed.outsets([4.0; 4]), [4.0; 4]);
    }

    #[test]
    fn round_tiles_a_whole_number_of_times() {
        let mut rounded = image(r#"{"top":10,"right":10,"bottom":10,"left":10}"#);
        rounded.repeat = BorderImageRepeat::Round;
        // The top edge's picture is 10 wide, drawn at the scale 5/10, so 5 px tiles on a 88 px edge: 88 / 5 = 17.6, rounded to
        // 18 tiles of 88 / 18 px.
        let mut small = rounded.clone();
        small.width = serde_json::from_str(r#"{"top":"5px","right":"5px","bottom":"5px","left":"5px"}"#)
            .expect("widths");
        let pieces = small.pieces((30.0, 30.0), (98.0, 60.0), [0.0; 4]);
        let top: Vec<&Piece> = pieces
            .iter()
            .filter(|piece| piece.dest.y == 0.0 && piece.source.x == 10.0)
            .collect();
        assert_eq!(top.len(), 18);
        assert!((top[0].dest.width - 88.0 / 18.0).abs() < 1e-4);
        assert!((top[17].dest.x + top[17].dest.width - 93.0).abs() < 1e-3);
    }

    #[test]
    fn round_with_the_middle_tiles_both_ways() {
        let mut rounded = image(r#"{"top":10,"right":10,"bottom":10,"left":10,"fill":true}"#);
        rounded.repeat = BorderImageRepeat::Round;
        rounded.width = serde_json::from_str(r#"{"top":"5px","right":"5px","bottom":"5px","left":"5px"}"#)
            .expect("widths");
        let pieces = rounded.pieces((30.0, 30.0), (30.0, 30.0), [0.0; 4]);
        // The inside is 20x20 and the middle's picture 10x10 at half scale: 5 px tiles, 4 by 4.
        let middle = pieces
            .iter()
            .filter(|piece| piece.source == quad(10.0, 10.0, 10.0, 10.0))
            .count();
        assert_eq!(middle, 16);
    }
}
