use super::raster::{dot, wave_tile};
use super::*;
use crate::text_style::spec::DecorationThickness;

fn decoration(style: DecorationStyleSpec, thickness: DecorationThickness, offset: Option<f32>) -> TextDecoration {
    TextDecoration {
        lines: crate::text_style::DecorationLines { underline: true, ..Default::default() },
        color: "#ff0000".into(),
        style,
        thickness,
        underline_offset: offset,
    }
}

/// JetBrains Mono at 14 px, as the references use it.
fn font(size: f32) -> DecorationFont {
    DecorationFont { size, ascent: (1.02 * size).round(), underline_thickness: 0.05 * size }
}

fn fragment(left: f32, right: f32) -> Fragment {
    Fragment { left, right, baseline: 100.0 }
}

fn rects(shapes: &[Shape]) -> Vec<(f32, f32, f32, f32)> {
    shapes
        .iter()
        .map(|shape| match shape {
            Shape::Rect(rect) => (rect.x, rect.y - 100.0, rect.width, rect.height),
            other => panic!("not a rectangle: {other:?}"),
        })
        .collect()
}

#[test]
fn the_wave_has_chromes_period_control_distance_and_amplitude() {
    // Chrome 156: P = 3 + 2 floor(2w), d = 1.5 + floor(3w); the centre line's peak to peak is sqrt(3) (w + 1/2).
    for (width, period, control, peak_to_peak) in [
        (1.0, 7.0, 4.5, 2.598),
        (2.0, 11.0, 7.5, 4.330),
        (3.0, 15.0, 10.5, 6.062),
        (4.0, 19.0, 13.5, 7.794),
        (6.0, 27.0, 19.5, 11.258),
        (8.0, 35.0, 25.5, 14.722),
    ] {
        let wave = Wave::new(width);
        assert_eq!((wave.period, wave.control), (period, control), "w {width}");
        assert!((2.0 * wave.amplitude() - peak_to_peak).abs() < 2e-3, "w {width}: {}", 2.0 * wave.amplitude());
    }
    // `auto` at 16 px is a 1.6 px stroke with the period of Chrome's 9 px.
    assert_eq!(Wave::new(1.6).period, 9.0);
    assert_eq!(Wave::new(1.2).period, 7.0);
    assert_eq!(Wave::new(2.4).period, 11.0);
    assert_eq!(Wave::new(4.8).period, 21.0);
}

#[test]
fn the_wave_follows_the_centre_line_chrome_measured() {
    // T = 2 at scale one, centre line 4.5 below the baseline: at x = 0.5 .. 10.5 the line is at these heights.
    let wave = Wave::new(2.0);
    let expected = [5.139, 6.123, 6.626, 6.527, 5.763, 4.500, 3.237, 2.473, 2.374, 2.877, 3.861];
    for (k, expected) in expected.iter().enumerate() {
        let x = k as f32 + 0.5;
        // Find t with x(t) = x by bisection: x(t) increases with t.
        let (mut low, mut high) = (0.0_f32, 1.0_f32);
        for _ in 0..40 {
            let middle = (low + high) / 2.0;
            if wave.point(middle).0 < x {
                low = middle;
            } else {
                high = middle;
            }
        }
        let y = 4.5 + wave.point(low).1;
        assert!((y - expected).abs() < 2e-3, "x {x}: {y} against {expected}");
    }
}

#[test]
fn the_centre_line_is_below_the_solid_lines_lower_edge() {
    // Whole strokes: a half pixel and a whole one below; the underline of T = 1 starts 1 below the baseline.
    for (width, centre) in [(1.0, 3.5), (2.0, 4.5), (3.0, 6.5), (4.0, 7.5), (6.0, 10.5)] {
        let wave = Wave::new(width);
        let gap = (width / 2.0).ceil().max(1.0);
        assert_eq!(wave.center_below(gap, 1.0), centre, "w {width}");
        assert_eq!(wave.center_below(gap, 2.0), centre, "w {width} at scale two");
    }
    // With `text-underline-offset: 4px` it is 4 + w + 1.5.
    assert_eq!(Wave::new(2.0).center_below(4.0, 1.0), 7.5);
}

#[test]
fn a_baked_wave_has_chromes_ink_rows_and_only_whole_quarter_coverages() {
    // Rows with any ink, relative to the baseline, at scale one: T = 1 -> 1..=5, 2 -> 1..=7, 3 -> 2..=10 (Chrome 156).
    for (width, first, last) in [(1.0, 1, 5), (2.0, 1, 7), (3.0, 2, 10)] {
        let wave = Wave::new(width);
        let gap = (width / 2.0).ceil().max(1.0);
        let center = wave.center_below(gap, 1.0);
        let fraction = center.fract();
        let tile = wave_tile(&wave, 1.0, fraction);
        let top_row = center.floor() as i32 - tile.rows_above as i32;
        let rows: Vec<i32> = (0..tile.raster.height)
            .filter(|row| (0..tile.raster.width).any(|x| tile.raster.at(x, *row) > 0))
            .map(|row| top_row + row as i32)
            .collect();
        assert_eq!((rows.first().copied(), rows.last().copied()), (Some(first), Some(last)), "w {width}");
        assert!(tile.raster.alpha.iter().all(|alpha| [0, 64, 128, 191, 255].contains(alpha)));
        assert_eq!(tile.raster.width, (wave.period as usize) * tile.periods);
    }
}

#[test]
fn a_baked_wave_repeats_every_period_and_a_fractional_ratio_bakes_whole_pixels() {
    let wave = Wave::new(2.0);
    let one = wave_tile(&wave, 1.0, 0.5);
    let two = wave_tile(&wave, 1.0, 0.5);
    assert_eq!(one, two, "baking is deterministic");
    assert_eq!(one.periods, 1);
    // An odd period at 1.5 is 10.5 px: two periods make 21 whole pixels.
    let odd = wave_tile(&Wave::new(1.0), 1.5, 0.0);
    assert_eq!((odd.periods, odd.raster.width), (2, 21));
    // At scale two the same wave is twice as wide and as tall, and the stroke twice as thick.
    let wide = wave_tile(&wave, 2.0, 0.0);
    assert_eq!(wide.raster.width, 22);
    assert!(wide.rows_above >= 2 * one.rows_above - 2);
}

#[test]
fn a_round_dot_is_centred_and_symmetric() {
    let dot = dot(6.0);
    let size = dot.width;
    assert_eq!(dot.height, size);
    assert!(dot.alpha.iter().any(|alpha| *alpha == 255), "its middle is solid");
    assert_eq!(dot.at(0, 0), 0, "its corner is empty");
    let rows: usize = (0..size).filter(|y| (0..size).any(|x| dot.at(x, *y) > 0)).count();
    assert!((6..=8).contains(&rows), "a 6 px dot covers about 6 rows, not {rows}");
}

#[test]
fn dashes_and_gaps_are_fitted_as_blink_does() {
    // L = 192 CSS px, Chrome's counts and gaps.
    for (dash, nominal, count, gap) in [
        (3.0, 2.0, 39, 1.974),
        (6.0, 4.0, 20, 3.789),
        (6.0, 3.0, 22, 2.857),
        (8.0, 4.0, 16, 4.267),
        (12.0, 6.0, 11, 6.0),
    ] {
        let fit = fit_gap(192.0, dash, nominal);
        assert_eq!(fit.count, count, "dash {dash}");
        assert!((fit.gap - gap).abs() < 2e-3, "dash {dash}: {}", fit.gap);
    }
    // Round dots at L = 182: T = 4 makes 23 at a pitch of 8.09.
    let dots = fit_gap(182.0, 4.0, 4.0);
    assert_eq!(dots.count, 23);
    assert!((4.0 + dots.gap - 8.09).abs() < 0.01, "{}", dots.gap);
    // Too short for two: one dash; the first starts at the left end and the last ends at the right.
    assert_eq!(fit_gap(5.0, 6.0, 4.0), Fit { count: 1, gap: 0.0 });
    let fit = fit_gap(100.0, 6.0, 3.0);
    assert!((fit.count as f32 * 6.0 + (fit.count - 1) as f32 * fit.gap - 100.0).abs() < 1e-3);
}

#[test]
fn double_is_two_bands_a_pixel_apart() {
    // Rows below the baseline at scale one: T = 1 -> 1 and 3; 2 -> 1..=2 and 4..=5; 3 -> 2..=4 and 6..=8.
    for (thickness, first, second) in [(1.0, 1.0, 3.0), (2.0, 1.0, 4.0), (3.0, 2.0, 6.0), (4.0, 2.0, 7.0), (6.0, 3.0, 10.0)] {
        let shapes = shapes(
            &decoration(DecorationStyleSpec::Double, DecorationThickness::Px(thickness), None),
            LineKind::Underline,
            font(14.0),
            1.0,
            fragment(10.0, 90.0),
        );
        let found = rects(&shapes);
        assert_eq!(found.len(), 2);
        assert_eq!((found[0].1, found[0].3), (first, thickness), "T {thickness}");
        assert_eq!((found[1].1, found[1].3), (second, thickness), "T {thickness}");
        assert_eq!((found[0].0, found[0].2), (10.0, 80.0));
    }
    // `text-underline-offset: 4px` puts the first line's top on row 4 whatever the thickness.
    let offset = shapes(
        &decoration(DecorationStyleSpec::Double, DecorationThickness::Px(3.0), Some(4.0)),
        LineKind::Underline,
        font(14.0),
        1.0,
        fragment(0.0, 40.0),
    );
    assert_eq!(rects(&offset)[0].1, 4.0);
    // `auto` at 16 px: rows 1 and 4; at 12 px 1 and 3; at 24 px 2..=3 and 5..=6.
    for (size, first, second, height) in [(16.0, 1.0, 4.0, 1.0), (12.0, 1.0, 3.0, 1.0), (24.0, 2.0, 5.0, 2.0)] {
        let auto = shapes(
            &decoration(DecorationStyleSpec::Double, DecorationThickness::Auto, None),
            LineKind::Underline,
            font(size),
            1.0,
            fragment(0.0, 40.0),
        );
        let found = rects(&auto);
        assert_eq!((found[0].1, found[1].1, found[0].3), (first, second, height), "{size} px");
    }
}

#[test]
fn dashes_are_butt_rectangles_on_the_solid_rows_from_the_floored_ends() {
    let shapes = shapes(
        &decoration(DecorationStyleSpec::Dashed, DecorationThickness::Px(2.0), None),
        LineKind::Underline,
        font(14.0),
        1.0,
        fragment(7.5, 199.9),
    );
    let found = rects(&shapes);
    // L = floor(199.9) - floor(7.5) = 192: Chrome fits 20 dashes of 6 with gaps of 3.789, from x = 7.
    assert_eq!(found.len(), 20);
    assert_eq!((found[0].0, found[0].2), (7.0, 6.0));
    assert!(found.iter().all(|rect| rect.1 == 1.0 && rect.3 == 2.0));
    let last = found.last().unwrap();
    assert!((last.0 + last.2 - 199.0).abs() <= 0.51, "ends at the floored right end: {}", last.0 + last.2);
}

#[test]
fn dotted_lines_are_squares_to_three_pixels_and_round_dots_from_four() {
    let squares = shapes(
        &decoration(DecorationStyleSpec::Dotted, DecorationThickness::Px(3.0), None),
        LineKind::Underline,
        font(14.0),
        1.0,
        fragment(0.0, 20.0),
    );
    let found = rects(&squares);
    // Pitch 2T = 6: dots at 0, 6, 12 and 18, the last cut by the end at 20.
    assert_eq!(found.iter().map(|rect| (rect.0, rect.2)).collect::<Vec<_>>(), [(0.0, 3.0), (6.0, 3.0), (12.0, 3.0), (18.0, 2.0)]);
    let round = shapes(
        &decoration(DecorationStyleSpec::Dotted, DecorationThickness::Px(4.0), None),
        LineKind::Underline,
        font(14.0),
        1.0,
        fragment(0.0, 182.0),
    );
    match &round[..] {
        [Shape::Dots(plan)] => {
            assert_eq!(plan.centers.len(), 23);
            assert_eq!(plan.diameter, 4.0);
            assert!((plan.centers[0] - 2.0).abs() < 1e-4, "the first dot touches the left end");
            assert!((plan.centers[22] - 180.0).abs() < 1e-3, "the last touches the right end: {}", plan.centers[22]);
            assert_eq!(plan.center_y, 100.0 + 2.0 + 2.0);
        }
        other => panic!("{other:?}"),
    }
}

#[test]
fn a_wavy_line_starts_at_the_left_edge_on_a_device_pixel_and_ends_at_the_right() {
    let shapes = shapes(
        &decoration(DecorationStyleSpec::Wavy, DecorationThickness::Px(2.0), None),
        LineKind::Underline,
        font(14.0),
        2.0,
        fragment(10.3, 50.0),
    );
    match &shapes[..] {
        [Shape::Wave(plan)] => {
            assert_eq!(plan.left, 10.5, "the left end is rounded to a device pixel");
            assert_eq!(plan.right, 50.0);
            assert_eq!(plan.center, 104.5);
            assert_eq!(plan.wave.width, 2.0);
        }
        other => panic!("{other:?}"),
    }
}

#[test]
fn a_fractional_thickness_rounds_half_up_to_a_whole_pixel_and_zero_draws_nothing() {
    let line = |thickness: f32| {
        shapes(
            &decoration(DecorationStyleSpec::Dashed, DecorationThickness::Px(thickness), None),
            LineKind::Underline,
            font(14.0),
            1.0,
            fragment(0.0, 60.0),
        )
    };
    for (given, whole) in [(0.5, 1.0), (1.5, 2.0), (2.5, 3.0), (3.5, 4.0)] {
        assert_eq!(rects(&line(given))[0].3, whole, "{given}");
    }
    assert!(line(0.0).is_empty());
}

#[test]
fn a_solid_style_is_the_band_the_decorator_gives() {
    let shapes = shapes(
        &decoration(DecorationStyleSpec::Solid, DecorationThickness::Px(2.0), None),
        LineKind::Underline,
        font(14.0),
        1.0,
        fragment(3.0, 53.5),
    );
    assert_eq!(rects(&shapes), [(3.0, 1.0, 50.5, 2.0)]);
}
