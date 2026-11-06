//! How a Gaussian blur is drawn from the render target's back-buffer mipmaps (plan Phase V1, D40 and
//! `docs/tracks/filters.md`). Nothing here touches Godot.
//!
//! Godot generates a chain of ever blurrier, half-size copies of the back buffer
//! (`render_target_gen_back_buffer_mipmaps`). Sampling one of them directly shows the texels: a hard edge
//! at level 3 is an 18.9 px wide ramp of straight facets whatever radius was asked for. Instead the
//! shader reads the largest level whose own blur is still below the one asked for, and finishes the
//! difference with a Gaussian-weighted reconstruction of that level, so the result is smooth and has the
//! requested standard deviation. The level, the kernel's width and how far the copy rectangle must reach
//! are decided here, from numbers measured on the engine's chain (see the constants).

/// The first downsampling step of the engine's 13-tap dual filter, which `copy_effects.cpp:300-306`
/// runs with its tap offsets two *source* texels apart, is the one-dimensional kernel
/// `[1, 3, 4, 4, 3, 1] / 16` at texel centres -2.5 to +2.5 from the destination centre: a variance of
/// 1.75 source texels squared. Measured on the Compatibility and the Mobile renderer (identical to one
/// 8-bit step) by `experiments/filters-engine/exp1.gd` against this module's model.
pub const CHAIN_VARIANCE_PER_STEP: f32 = 1.75;
/// The kernel's weights over the previous level's texels, for the model: `DOWNSAMPLE[i]` weighs source
/// texel `2 * j + i - 2` for destination texel `j`.
#[cfg(test)]
pub const DOWNSAMPLE: [f32; 6] = [
    1.0 / 16.0,
    3.0 / 16.0,
    4.0 / 16.0,
    4.0 / 16.0,
    3.0 / 16.0,
    1.0 / 16.0,
];

/// The smallest standard deviation, in texels of the level read, of the reconstruction kernel. Below
/// about 0.5 the Gaussian-weighted samples of a level no longer form a smooth partition of unity (the
/// residual is `2 * exp(-2 * pi^2 * k^2)`: 0.7 % at 0.5, 0.08 % at 0.6). Chosen as 0.6 so the model's
/// error is below one 8-bit step at every radius.
pub const KERNEL_MIN_TEXELS: f32 = 0.6;
/// The widest the kernel gets, in texels. It is the shader's tap budget: `3 * KERNEL_MAX_TEXELS` taps to
/// each side, in bilinear pairs. A target too small for its radius clamps here (the render target keeps
/// fewer mip levels), and the clamp is reported.
pub const KERNEL_MAX_TEXELS: f32 = 3.0;
/// The shader's arrays hold this many bilinear fetch pairs per axis: `ceil(3 * KERNEL_MAX_TEXELS) + 1`.
pub const MAX_PAIRS: u32 = 10;
/// Below this standard deviation (render-target pixels) a blur is not drawn: it changes no pixel by a
/// visible amount (an edge's 10 to 90 width is 0.64 px).
pub const MIN_SIGMA_PX: f32 = 0.25;
/// A level's texels hold stale data in a band this many texels wide inside the copied region's border
/// (the dual filter reads outside the region, and levels above 0 are not cleared). Measured as the
/// smallest inflation of the copy rectangle that leaves a sample clean: 16 px at level 2, 24 at level
/// 3, 48 at level 4 (`exp3.gd`), that is three texels, rounded up with a margin.
pub const CONTAMINATION_TEXELS: f32 = 3.5;
/// The most levels the Compatibility renderer drops from the top of the chain: it keeps levels down to
/// about 32 px (`texture_storage.cpp:2773`, "limit mipmaps so smallest is 32x32").
const COMPATIBILITY_DROPPED_LEVELS: u32 = 4;

/// Which renderer's back buffer is read: they keep a different number of mip levels (their filters
/// agree).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RendererKind {
    /// `gl_compatibility`, and the Web export.
    Compatibility,
    /// `mobile` and `forward_plus` (RenderingDevice).
    RenderingDevice,
}

impl RendererKind {
    /// The name `RenderingServer.get_current_rendering_method()` returns.
    pub fn from_method(method: &str) -> RendererKind {
        match method {
            "gl_compatibility" => RendererKind::Compatibility,
            _ => RendererKind::RenderingDevice,
        }
    }
}

/// `Image::get_image_required_mipmaps`: the halvings until the larger side reaches one texel.
fn halvings(width: u32, height: u32) -> u32 {
    width.max(height).max(1).ilog2()
}

/// The highest mip level of the render target's back buffer that holds a blurred copy, for a target of
/// `width` x `height` pixels: Compatibility drops the smallest four levels, keeping at least the base;
/// the RenderingDevice back buffer keeps all but the 1 x 1 level.
pub fn max_level(width: u32, height: u32, renderer: RendererKind) -> u32 {
    let required = halvings(width, height);
    match renderer {
        RendererKind::Compatibility => required.saturating_sub(COMPATIBILITY_DROPPED_LEVELS + 1),
        RendererKind::RenderingDevice => required.saturating_sub(1),
    }
}

/// The variance, in pixels squared of the base level, that level `level` of the chain has.
pub fn chain_variance(level: u32) -> f32 {
    CHAIN_VARIANCE_PER_STEP * (4.0f32.powi(level as i32) - 1.0) / 3.0
}

/// How one blur is drawn: which level, how wide the reconstruction, and how far the copy reaches.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct BlurPlan {
    /// The mip level the shader samples.
    pub level: u32,
    /// Standard deviation of the Gaussian weights, in texels of that level.
    pub kernel_texels: f32,
    /// Bilinear fetch pairs per axis (each pair is two texels).
    pub pairs: u32,
    /// The standard deviation the plan really gives, in render-target pixels. Less than the request
    /// when the target has too few levels.
    pub achieved_px: f32,
    /// Whether the request was beyond what the target's mip levels reach.
    pub clamped: bool,
}

impl BlurPlan {
    /// Texel size of the level in pixels (the alignment the copy region needs).
    pub fn texel_px(&self) -> u32 {
        1 << self.level
    }

    /// How far, in pixels, a sample may read beyond the area it draws: the kernel's reach plus the
    /// stale band at the region's border, and one more texel for the rounding of the region.
    pub fn reach_px(&self) -> u32 {
        let texels = f64::from(self.pairs) + f64::from(CONTAMINATION_TEXELS) + 1.0;
        (texels * f64::from(self.texel_px())).ceil() as u32
    }
}

/// Choose the level for a blur of `sigma_px` render-target pixels with `max_level` levels available.
///
/// The level is the highest whose own blur plus the minimum reconstruction fits inside the radius; the
/// remaining variance is the Gaussian's. `None` for a radius too small to draw.
pub fn plan(sigma_px: f32, max_level: u32) -> Option<BlurPlan> {
    if !sigma_px.is_finite() || sigma_px < MIN_SIGMA_PX {
        return None;
    }
    let mut level = 0;
    for candidate in 1..=max_level {
        let texel = (1u32 << candidate) as f32;
        if chain_variance(candidate) + (KERNEL_MIN_TEXELS * texel).powi(2) <= sigma_px * sigma_px {
            level = candidate;
        }
    }
    let texel = (1u32 << level) as f32;
    let wanted = (sigma_px * sigma_px - chain_variance(level))
        .max(0.0)
        .sqrt()
        / texel;
    let floor = if level == 0 {
        MIN_SIGMA_PX
    } else {
        KERNEL_MIN_TEXELS
    };
    let kernel_texels = wanted.clamp(floor, KERNEL_MAX_TEXELS);
    let clamped = wanted > KERNEL_MAX_TEXELS;
    let pairs = (3.0 * kernel_texels).ceil() as u32 + 1;
    let achieved_px = (chain_variance(level) + (kernel_texels * texel).powi(2)).sqrt();
    Some(BlurPlan {
        level,
        kernel_texels,
        pairs: pairs.min(MAX_PAIRS),
        achieved_px,
        clamped,
    })
}

/// Where the texels of one level are, along one axis: `index0 = scale * index_level + offset`, with texel
/// indices measured to their centres (a pixel at `x` has index `x - 0.5`). For a region whose size is a
/// multiple of `2^level` it is the textbook `2^level` and `2^(level - 1) - 0.5`; for any other, the
/// engine's integer halving of the region (`copy_effects.cpp:276-279`) makes each step map the destination
/// quad onto a source region of `S[n-1]` texels rather than exactly `2 * S[n]`, so the map is stretched by
/// `S[n-1] / S[n]` and shifted. A 600 x 900 target's level 3 has 112 rows that cover 900, not 896, pixels.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ChainMap {
    pub scale: f32,
    pub offset: f32,
}

/// The map for `level` of the chain generated for the region `[origin, origin + size)` of a target, along
/// one axis, replaying the engine's integer arithmetic.
pub fn chain_map(origin: i32, size: i32, level: u32) -> ChainMap {
    let (mut origin_prev, mut size_prev) = (origin, size.max(1));
    // index0 = scale * index_n + offset, built up from n = 0.
    let (mut scale, mut offset) = (1.0f64, 0.0f64);
    for _ in 0..level {
        let (origin_n, size_n) = (origin_prev >> 1, (size_prev >> 1).max(1));
        // The destination quad [origin_n, origin_n + size_n) is drawn from the source region
        // [origin_prev, origin_prev + size_prev): texel i (centre i - origin_n + 0.5 into the quad) samples the
        // source at origin_prev + size_prev * (i - origin_n + 0.5) / size_n texels from the edge.
        let ratio = f64::from(size_prev) / f64::from(size_n);
        let step_offset = f64::from(origin_prev) + ratio * (0.5 - f64::from(origin_n)) - 0.5;
        // index_{n-1} = ratio * index_n + step_offset.
        offset += scale * step_offset;
        scale *= ratio;
        origin_prev = origin_n;
        size_prev = size_n;
    }
    ChainMap {
        scale: scale as f32,
        offset: offset as f32,
    }
}

/// An integer rectangle in render-target pixels.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PixelRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl PixelRect {
    pub fn right(&self) -> i32 {
        self.x + self.width
    }

    pub fn bottom(&self) -> i32 {
        self.y + self.height
    }

    pub fn is_empty(&self) -> bool {
        self.width <= 0 || self.height <= 0
    }

    pub fn intersection(&self, other: &PixelRect) -> PixelRect {
        let x = self.x.max(other.x);
        let y = self.y.max(other.y);
        PixelRect {
            x,
            y,
            width: (self.right().min(other.right()) - x).max(0),
            height: (self.bottom().min(other.bottom()) - y).max(0),
        }
    }

    pub fn grown(&self, by: i32) -> PixelRect {
        PixelRect {
            x: self.x - by,
            y: self.y - by,
            width: self.width + 2 * by,
            height: self.height + 2 * by,
        }
    }
}

/// The region to copy and generate mipmaps for, to draw `area` (render-target pixels) with `plan` on a
/// target of `target` pixels: `area` grown by the plan's reach, aligned outwards to the level's texel
/// size, then cut to the target.
///
/// The alignment is not optional. `gaussian_blur` halves the region's position and size with a
/// truncating shift at every level (`copy_effects.cpp:276-279`), so a region whose position or size is
/// not a multiple of the texel size skews that level's sampling grid by up to half a texel: a blur read
/// at level 3 came out shifted by 3 px (`exp4.gd`, 0.198 error against 0.006 aligned).
/// A region cut by the target's far edge is the engine's own full-extent case and stays consistent.
pub fn copy_region(area: PixelRect, plan: &BlurPlan, target: (i32, i32)) -> PixelRect {
    let texel = plan.texel_px() as i32;
    let grown = area.grown(plan.reach_px() as i32);
    let left = grown.x.div_euclid(texel) * texel;
    let top = grown.y.div_euclid(texel) * texel;
    let right = (grown.right() + texel - 1).div_euclid(texel) * texel;
    let bottom = (grown.bottom() + texel - 1).div_euclid(texel) * texel;
    PixelRect {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    }
    .intersection(&PixelRect {
        x: 0,
        y: 0,
        width: target.0,
        height: target.1,
    })
}

#[cfg(test)]
mod model {
    //! A CPU model of the engine's back-buffer chain and the shader's kernel on a vertical hard edge,
    //! which is all a one-dimensional profile needs. It reproduces the GPU's profiles to 0.003 (an 8-bit
    //! step is 0.004): `experiments/filters-engine/exp1.gd` measured levels 1 to 4 on the Compatibility
    //! and levels 1 to 7 on the Mobile renderer.

    use super::*;

    /// The levels of a step edge `0 | 1` at pixel `edge` in a row of `width` pixels.
    pub fn chain(width: usize, edge: usize, levels: u32) -> Vec<Vec<f32>> {
        let mut out = vec![
            (0..width)
                .map(|x| if x < edge { 0.0 } else { 1.0 })
                .collect::<Vec<f32>>(),
        ];
        for _ in 0..levels {
            let source = out.last().expect("the base level exists");
            let next = (0..source.len() / 2)
                .map(|j| {
                    DOWNSAMPLE
                        .iter()
                        .enumerate()
                        .map(|(i, weight)| {
                            let index = (2 * j + i).saturating_sub(2).min(source.len() - 1);
                            weight * source[index]
                        })
                        .sum()
                })
                .collect();
            out.push(next);
        }
        out
    }

    /// The shader's output at base-level pixel position `x` (a continuous coordinate, pixel centres at
    /// +0.5): Gaussian weights of `plan.kernel_texels` over the samples of `plan.level`, renormalised.
    pub fn sample(levels: &[Vec<f32>], plan: &BlurPlan, x: f32) -> f32 {
        let texels = &levels[plan.level as usize];
        let size = (1u32 << plan.level) as f32;
        let u = x / size - 0.5;
        let first = u.floor() as i32;
        let reach = plan.pairs as i32;
        let (mut sum, mut total) = (0.0f32, 0.0f32);
        for j in first - reach..=first + reach + 1 {
            let weight = (-0.5 * ((u - j as f32) / plan.kernel_texels).powi(2)).exp();
            let index = j.clamp(0, texels.len() as i32 - 1) as usize;
            sum += weight * texels[index];
            total += weight;
        }
        sum / total
    }

    pub fn normal_cdf(z: f32) -> f32 {
        // Abramowitz and Stegun 7.1.26, |error| < 1.5e-7.
        let x = z / std::f32::consts::SQRT_2;
        let t = 1.0 / (1.0 + 0.327_591_1 * x.abs());
        let poly = ((((1.061_405_4 * t - 1.453_152) * t + 1.421_413_7) * t - 0.284_496_74) * t
            + 0.254_829_6)
            * t;
        let erf = (1.0 - poly * (-x * x).exp()).copysign(x);
        0.5 * (1.0 + erf)
    }

    /// The 10 to 90 percent width of a rising profile sampled at unit pixel spacing.
    pub fn width_10_90(profile: &[f32]) -> f32 {
        let crossing = |level: f32| {
            profile.windows(2).enumerate().find_map(|(i, pair)| {
                (pair[0] < level && pair[1] >= level)
                    .then(|| i as f32 + (level - pair[0]) / (pair[1] - pair[0]))
            })
        };
        crossing(0.9).expect("a rising profile") - crossing(0.1).expect("a rising profile")
    }
}

#[cfg(test)]
mod tests {
    use super::model::*;
    use super::*;

    /// 10 to 90 percent width of a unit Gaussian's edge, in standard deviations.
    const WIDTH_10_90_SIGMAS: f32 = 2.563_103;
    /// The widest strip the model needs: edge in the middle, room for a 100 px blur and the chain.
    const STRIP: usize = 2048;
    const EDGE: usize = 1024;

    fn profile(sigma_px: f32, max: u32) -> (BlurPlan, Vec<f32>, Vec<f32>) {
        let plan = plan(sigma_px, max).expect("a drawable radius");
        let levels = chain(STRIP, EDGE, plan.level);
        let span = (4.0 * sigma_px) as usize + 40;
        let xs: Vec<f32> = (EDGE - span..EDGE + span).map(|x| x as f32 + 0.5).collect();
        let measured: Vec<f32> = xs.iter().map(|x| sample(&levels, &plan, *x)).collect();
        let ideal: Vec<f32> = xs
            .iter()
            .map(|x| normal_cdf((x - EDGE as f32) / sigma_px))
            .collect();
        (plan, measured, ideal)
    }

    #[test]
    fn mip_levels_follow_the_target_and_renderer() {
        // 1120 x 800: ten halvings. Compatibility keeps levels 0 to 5, the RenderingDevice back buffer 0 to 9.
        assert_eq!(max_level(1120, 800, RendererKind::Compatibility), 5);
        assert_eq!(max_level(1120, 800, RendererKind::RenderingDevice), 9);
        // The measured 640 x 360 chain has levels 0 to 4 on Compatibility.
        assert_eq!(max_level(640, 360, RendererKind::Compatibility), 4);
        assert_eq!(max_level(600, 900, RendererKind::Compatibility), 4);
        assert_eq!(max_level(16, 16, RendererKind::Compatibility), 0);
        assert_eq!(max_level(1, 1, RendererKind::RenderingDevice), 0);
    }

    #[test]
    fn chain_variances_are_the_measured_kernel_summed_over_the_levels() {
        // The kernel's own variance about its centre (texel centres -2.5 to +2.5).
        let step: f32 = DOWNSAMPLE
            .iter()
            .enumerate()
            .map(|(i, weight)| weight * (i as f32 - 2.5).powi(2))
            .sum();
        assert!((step - CHAIN_VARIANCE_PER_STEP).abs() < 1e-6);
        assert!((DOWNSAMPLE.iter().sum::<f32>() - 1.0).abs() < 1e-6);
        // Step k works on texels 2^k wide, so it adds 4^k times the first step's variance.
        let mut total = 0.0;
        for level in 1..=6u32 {
            total += CHAIN_VARIANCE_PER_STEP * 4.0f32.powi(level as i32 - 1);
            assert!(
                (chain_variance(level) - total).abs() < 1e-3 * total,
                "level {level}"
            );
        }
        for (level, sigma) in [(1, 1.32), (2, 2.96), (3, 6.06), (4, 12.2), (5, 24.4)] {
            assert!(
                (chain_variance(level).sqrt() - sigma).abs() < 0.05,
                "level {level}"
            );
        }
    }

    #[test]
    fn a_radius_below_a_quarter_pixel_draws_nothing_and_small_radii_read_the_base_level() {
        assert_eq!(plan(0.2, 5), None);
        assert_eq!(plan(f32::NAN, 5), None);
        let small = plan(1.0, 5).unwrap();
        assert_eq!(small.level, 0);
        assert!(
            (small.kernel_texels - 1.0).abs() < 1e-5,
            "level 0 texels are pixels"
        );
    }

    #[test]
    fn the_modelled_edge_is_gaussian_at_every_radius_the_lab_checks() {
        // The lab's radii at device pixel ratio one and the same at two, on a 1120 x 800 target.
        for css in [2.0f32, 4.0, 8.0, 12.0, 16.0, 24.0, 40.0, 64.0] {
            for ratio in [1.0f32, 2.0] {
                let sigma = css * ratio;
                let max = if ratio == 1.0 { 5 } else { 6 };
                let (plan, measured, ideal) = profile(sigma, max);
                assert!(!plan.clamped, "{css} px at {ratio}x");
                let worst = measured
                    .iter()
                    .zip(&ideal)
                    .map(|(a, b)| (a - b).abs())
                    .fold(0.0f32, f32::max);
                assert!(
                    worst < 0.0082,
                    "{css} px at {ratio}x: worst error {worst} at {plan:?}"
                );
                let ratio_width = width_10_90(&measured) / (WIDTH_10_90_SIGMAS * sigma);
                assert!(
                    (ratio_width - 1.0).abs() < 0.02,
                    "{css} px at {ratio}x: width ratio {ratio_width}"
                );
            }
        }
    }

    #[test]
    fn the_modelled_edge_changes_smoothly_across_a_radius_sweep() {
        // A probe 12 px from the edge, radius swept in 1 % steps: no step may be far from the ideal's.
        let mut previous: Option<(f32, f32)> = None;
        let mut worst = 0.0f32;
        let mut sigma = 3.0f32;
        while sigma < 70.0 {
            let plan = plan(sigma, 5).unwrap();
            let levels = chain(STRIP, EDGE, plan.level);
            let value = sample(&levels, &plan, EDGE as f32 + 12.5);
            if let Some((before_sigma, before)) = previous {
                let ideal = normal_cdf(12.5 / sigma) - normal_cdf(12.5 / before_sigma);
                worst = worst.max(((value - before) - ideal).abs());
            }
            previous = Some((sigma, value));
            sigma *= 1.01;
        }
        assert!(
            worst < 0.01,
            "worst deviation of a 1 % step from the ideal step: {worst}"
        );
    }

    #[test]
    fn the_chain_map_is_the_textbook_one_for_regions_that_halve_exactly() {
        for level in 0..=5u32 {
            let texel = (1u32 << level) as f32;
            for (origin, size) in [(0, 1120), (64, 512), (0, 800), (96, 704)] {
                let map = chain_map(origin, size, level);
                assert!((map.scale - texel).abs() < 1e-4, "level {level}: {map:?}");
                assert!(
                    (map.offset - (0.5 * texel - 0.5)).abs() < 1e-3,
                    "level {level}: {map:?}"
                );
            }
        }
    }

    #[test]
    fn the_chain_map_is_stretched_where_the_engine_halves_an_odd_region() {
        // 900 rows: 450, 225, 112 (the 225 is odd), so level 3 stretches by 225 / 112 over the last step.
        let map = chain_map(0, 900, 3);
        assert!((map.scale - 8.0 * 225.0 / 224.0).abs() < 1e-3, "{map:?}");
        // A texel 25 rows down is 0.9 px further down than the textbook map puts it: the verifier's portrait defect.
        let at = |map: ChainMap, index: f32| map.scale * index + map.offset;
        let textbook = chain_map(0, 896, 3);
        assert!(
            (at(map, 25.0) - at(textbook, 25.0) - 0.9).abs() < 0.1,
            "{map:?} against {textbook:?}"
        );
    }

    #[test]
    fn a_small_target_clamps_the_radius_and_says_so() {
        // 600 x 900 on Compatibility: levels 0 to 4. A 64 px blur needs 3.9 texels at level 4.
        let plan = plan(64.0, 4).unwrap();
        assert!(plan.clamped);
        assert!(
            plan.achieved_px < 64.0 && plan.achieved_px > 30.0,
            "{plan:?}"
        );
        assert_eq!(plan.pairs, MAX_PAIRS);
        assert!(!super::plan(24.0, 4).unwrap().clamped);
    }

    #[test]
    fn the_copy_region_is_aligned_to_the_level_and_cut_to_the_target() {
        let plan = plan(24.0, 5).unwrap();
        assert_eq!(plan.level, 4);
        let area = PixelRect {
            x: 301,
            y: 103,
            width: 497,
            height: 211,
        };
        let region = copy_region(area, &plan, (1120, 800));
        assert_eq!(region.x % 16, 0);
        assert_eq!(region.y % 16, 0);
        assert_eq!(region.width % 16, 0);
        assert_eq!(region.height % 16, 0);
        let reach = plan.reach_px() as i32;
        assert!(
            region.x <= area.x - reach && region.right() >= area.right() + reach,
            "{region:?}"
        );
        // Cut by the target: the cut keeps the origin aligned; the far edge is the target's own.
        let near_edge = copy_region(
            PixelRect {
                x: 1000,
                y: 700,
                width: 200,
                height: 200,
            },
            &plan,
            (1120, 800),
        );
        assert_eq!((near_edge.right(), near_edge.bottom()), (1120, 800));
        assert_eq!(near_edge.x % 16, 0);
        // Wholly outside the target: nothing to copy.
        assert!(
            copy_region(
                PixelRect {
                    x: 3000,
                    y: 0,
                    width: 10,
                    height: 10
                },
                &plan,
                (1120, 800)
            )
            .is_empty()
        );
    }
}
