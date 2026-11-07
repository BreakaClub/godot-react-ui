//! Baking the pieces of a patterned decoration that rectangles cannot draw: Chrome's wave and its round dots, antialiased the way
//! Chrome antialiases them, so the picture matches pixel for pixel rather than looking alike.
//!
//! Chrome (Skia) draws these with 4 samples per pixel, at the offsets below (read off the corners of dashes, whose coverage came
//! out as 0, 1/4, 1/2, 3/4 and 1). A pixel's alpha is the share of its samples inside the stroke, a sample being inside when its
//! distance to the stroke's centre line is at most half the stroke's width. That model agrees with Chrome for 93 to 97 % of the
//! pixels inside a wave and differs by one sample at a few crest and trough tips, where Skia's stroker is slightly tighter
//! (`docs/tracks/rich-text.md`).

use super::Wave;

/// The sample offsets inside a device pixel, as (x, y) fractions.
const SAMPLES: [(f32, f32); 4] = [
    (0.375, 0.125),
    (0.875, 0.375),
    (0.125, 0.625),
    (0.625, 0.875),
];
/// How finely a period is cut into straight pieces to measure distances to.
const SEGMENTS_PER_PERIOD: usize = 96;
/// A period count is searched for up to this many periods whose total length is whole device pixels.
const MAX_TILE_PERIODS: usize = 8;
const WHOLE_PIXEL_TOLERANCE: f32 = 1e-3;
/// The best-fit circle of a round dot is smaller than the dot's diameter by this much on a side, in device px (Chrome's dots).
const DOT_INSET: f32 = 0.17;
/// Extra empty rows and columns round a baked picture.
const PADDING: usize = 1;

/// A baked picture: one alpha byte per device pixel.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Raster {
    pub(crate) width: usize,
    pub(crate) height: usize,
    pub(crate) alpha: Vec<u8>,
}

impl Raster {
    fn new(width: usize, height: usize) -> Self {
        Self {
            width,
            height,
            alpha: vec![0; width * height],
        }
    }

    fn set(&mut self, x: usize, y: usize, covered: usize) {
        // Whole quarters of 255, so one sample is 64, two 128, three 191, four 255.
        self.alpha[y * self.width + x] = ((covered * 255 + 2) / SAMPLES.len()) as u8;
    }

    /// The alpha at a pixel.
    #[cfg(test)]
    pub(crate) fn at(&self, x: usize, y: usize) -> u8 {
        self.alpha[y * self.width + x]
    }
}

/// How many periods to bake so that the picture is a whole number of device pixels wide, and how wide that is: one period for a
/// whole-pixel one, more when the pixel ratio is fractional (two at 1.5 for an odd period). When no count under the limit is
/// whole, one period rounded to the nearest pixel.
fn periods_for(period_px: f32) -> (usize, usize) {
    for periods in 1..=MAX_TILE_PERIODS {
        let width = period_px * periods as f32;
        if (width - width.round()).abs() < WHOLE_PIXEL_TOLERANCE * periods as f32 {
            return (periods, width.round() as usize);
        }
    }
    (1, period_px.round() as usize)
}

/// The size of a baked wave, which depends on nothing but the wave and the scale.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct WaveLayout {
    pub(crate) periods: usize,
    pub(crate) width: usize,
    pub(crate) height: usize,
    /// Rows from the picture's top to the row that holds the centre line.
    pub(crate) rows_above: usize,
}

pub(crate) fn wave_layout(wave: &Wave, scale: f32) -> WaveLayout {
    let (periods, width) = periods_for(wave.period * scale);
    let rows_above =
        (wave.amplitude() * scale + wave.width * scale / 2.0).ceil() as usize + PADDING;
    WaveLayout {
        periods,
        width,
        height: rows_above * 2 + 1,
        rows_above,
    }
}

/// The row a wave's centre line (in device pixels, from the item's top) is in, and how many of `parts_per_pixel` parts of a pixel it is
/// down that row. The fraction is taken from the floor: `f32::fract` keeps the sign, which for a line above the item's top (an
/// overline on the first line of a text) put the wave a row too high.
pub(crate) fn split_center(center: f32, parts_per_pixel: f32) -> (f32, u32) {
    let floor = center.floor();
    let parts = ((center - floor) * parts_per_pixel).round();
    // A fraction that rounds up to a whole pixel is the next row's.
    if parts >= parts_per_pixel {
        (floor + 1.0, 0)
    } else {
        (floor, parts as u32)
    }
}

/// A baked wave, to be tiled along the line: `periods` periods in a picture `width` pixels wide. The picture's rows start
/// `rows_above` above the row that holds the centre line.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct WaveTile {
    pub(crate) raster: Raster,
    pub(crate) periods: usize,
    pub(crate) rows_above: usize,
}

/// The distance from `(x, y)` to the nearest of the polyline's pieces, the polyline repeating every `period` along x.
fn distance_to_wave(points: &[(f32, f32)], period: f32, x: f32, y: f32) -> f32 {
    let mut nearest = f32::INFINITY;
    let cycle = (x / period).floor();
    for shift in [-1.0, 0.0, 1.0] {
        let offset = (cycle + shift) * period;
        for pair in points.windows(2) {
            let (ax, ay) = (pair[0].0 + offset, pair[0].1);
            let (bx, by) = (pair[1].0 + offset, pair[1].1);
            let (dx, dy) = (bx - ax, by - ay);
            let along = (((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)).clamp(0.0, 1.0);
            let (px, py) = (ax + along * dx, ay + along * dy);
            nearest = nearest.min(((x - px).powi(2) + (y - py).powi(2)).sqrt());
        }
    }
    nearest
}

/// Bake `wave` at `scale` device pixels per CSS px. `center_fraction` is the fraction of a device pixel the centre line is below its
/// row's top (the line is on a half pixel at scale one for whole strokes), which the picture keeps so the wave lands where
/// Chrome's does.
pub(crate) fn wave_tile(wave: &Wave, scale: f32, center_fraction: f32) -> WaveTile {
    let period = wave.period * scale;
    let WaveLayout {
        periods,
        width,
        height,
        rows_above,
    } = wave_layout(wave, scale);
    let half_stroke = wave.width * scale / 2.0;
    // The pieces of one period, with the centre line at `rows_above + center_fraction` from the picture's top.
    let center = rows_above as f32 + center_fraction;
    let points: Vec<(f32, f32)> = (0..=SEGMENTS_PER_PERIOD)
        .map(|k| {
            let (x, y) = wave.point(k as f32 / SEGMENTS_PER_PERIOD as f32);
            (x * scale, center + y * scale)
        })
        .collect();
    let mut raster = Raster::new(width, height);
    for y in 0..height {
        for x in 0..width {
            let covered = SAMPLES
                .iter()
                .filter(|(dx, dy)| {
                    distance_to_wave(&points, period, x as f32 + dx, y as f32 + dy) <= half_stroke
                })
                .count();
            raster.set(x, y, covered);
        }
    }
    WaveTile {
        raster,
        periods,
        rows_above,
    }
}

/// Bake a round dot of `diameter` device pixels, centred in its picture.
pub(crate) fn dot(diameter: f32) -> Raster {
    let radius = (diameter / 2.0 - DOT_INSET).max(0.5);
    let size = diameter.ceil() as usize + 2 * PADDING;
    let center = size as f32 / 2.0;
    let mut raster = Raster::new(size, size);
    for y in 0..size {
        for x in 0..size {
            let covered = SAMPLES
                .iter()
                .filter(|(dx, dy)| {
                    ((x as f32 + dx - center).powi(2) + (y as f32 + dy - center).powi(2)).sqrt()
                        <= radius
                })
                .count();
            raster.set(x, y, covered);
        }
    }
    raster
}
