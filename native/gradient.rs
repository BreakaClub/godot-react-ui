//! CSS `linear-gradient()`: parsing, the Tailwind utilities that compose one (`bg-gradient-to-r from-* via-* to-*`),
//! the gradient line CSS defines for a box, colour-stop resolution and the ramp the renderer draws it from.
//! Nothing here touches Godot.
//!
//! A gradient is drawn as a mesh over the box whose vertices carry the position along the gradient line, sampled from a
//! one-pixel-high ramp texture baked here (`ramp`). The ramp is baked as CSS interpolates: in sRGB, with premultiplied
//! alpha (CSS Images 4, "color interpolation"), so a fade to `transparent` does not go through grey.

use std::fmt::Write as _;

use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::filter::{
    Rgba, matching_paren, parse_angle, parse_color_token, parse_length, parse_number, tokens,
};

const PERCENT: f32 = 100.0;
const CHANNEL_MAX: f32 = 255.0;
/// A ramp has at least this many texels, however short the gradient line.
const MIN_RAMP_TEXELS: usize = 16;
/// The largest texture width a Compatibility context is guaranteed to have (WebGL 2 allows at least 2048; native
/// drivers 8192 or more). A longer line is resampled by the texture filter.
const MAX_RAMP_TEXELS: usize = 4096;
/// `to bottom`: the direction of a gradient that names none.
const DEFAULT_ANGLE_DEGREES: f32 = 180.0;

/// Where a gradient is headed.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Direction {
    /// Degrees clockwise from `to top` (CSS: `0deg` points up, `90deg` right).
    Angle(f32),
    /// `to bottom right` and its kin: the gradient line is perpendicular to the diagonal between the other two
    /// corners, so that the 50 % line goes through them (CSS Images 3 section 3.1.1). `right` and `bottom` say
    /// which corner it heads for.
    Corner { right: bool, bottom: bool },
}

/// A colour stop's position along the gradient line.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Position {
    /// A fraction of the line (`50%` is 0.5).
    Fraction(f32),
    /// Logical pixels along the line.
    Pixels(f32),
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ColorStop {
    pub color: Rgba,
    pub position: Option<Position>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LinearGradient {
    pub direction: Direction,
    pub stops: Vec<ColorStop>,
}

/// A stop after CSS's fix-up: a position as a fraction of the line (0 to 1 for a stop on the line, outside for one past
/// its ends) and a colour.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ResolvedStop {
    pub t: f32,
    pub color: Rgba,
}

/// The gradient line of a box: the point at 0 %, the unit direction and the length that spans 0 % to 100 %.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Line {
    pub start: (f32, f32),
    pub direction: (f32, f32),
    pub length: f32,
}

impl Line {
    /// The position of a point along the line as a fraction of its length (0 at the start, 1 at the end).
    pub fn t(&self, x: f32, y: f32) -> f32 {
        ((x - self.start.0) * self.direction.0 + (y - self.start.1) * self.direction.1)
            / self.length
    }
}

impl LinearGradient {
    /// The gradient line for a box `width x height` whose top left corner is at `(x, y)` (CSS Images 3 section 3.1.1:
    /// through the box's centre, as long as it takes for the corners to be 0 % and 100 %).
    pub fn line(&self, x: f32, y: f32, width: f32, height: f32) -> Line {
        let direction = match self.direction {
            Direction::Angle(degrees) => {
                let (sin, cos) = degrees.to_radians().sin_cos();
                (sin, -cos)
            }
            Direction::Corner { right, bottom } => {
                // Perpendicular to the diagonal that does not go to the corner: (height, width) for the
                // bottom right, with the signs of the corner.
                let norm = width.hypot(height);
                if norm > 0.0 {
                    (
                        if right { height } else { -height } / norm,
                        if bottom { width } else { -width } / norm,
                    )
                } else {
                    (0.0, 1.0)
                }
            }
        };
        let length = width * direction.0.abs() + height * direction.1.abs();
        let centre = (x + width * 0.5, y + height * 0.5);
        Line {
            start: (
                centre.0 - direction.0 * length * 0.5,
                centre.1 - direction.1 * length * 0.5,
            ),
            direction,
            length,
        }
    }

    /// The stops with CSS's fix-up applied (CSS Images 3 section 3.5.3) for a gradient line `length` logical pixels long.
    pub fn resolve(&self, length: f32) -> Vec<ResolvedStop> {
        let count = self.stops.len();
        let mut positions: Vec<Option<f32>> = self
            .stops
            .iter()
            .map(|stop| {
                stop.position.map(|position| match position {
                    Position::Fraction(fraction) => fraction,
                    Position::Pixels(pixels) if length > 0.0 => pixels / length,
                    Position::Pixels(_) => 0.0,
                })
            })
            .collect();
        if count == 0 {
            return Vec::new();
        }
        positions[0].get_or_insert(0.0);
        positions[count - 1].get_or_insert(1.0);
        // A stop that goes back is moved up to the largest position before it.
        let mut largest = f32::NEG_INFINITY;
        for position in positions.iter_mut().flatten() {
            largest = largest.max(*position);
            *position = largest;
        }
        // A run of stops with no position is spread evenly between the stops on either side.
        let mut index = 0;
        while index < count {
            if positions[index].is_some() {
                index += 1;
                continue;
            }
            let before = index - 1;
            let after = (index..count)
                .find(|candidate| positions[*candidate].is_some())
                .expect("the last stop has a position");
            let from = positions[before].expect("the stop before a run has a position");
            let to = positions[after].expect("the stop after a run has a position");
            let steps = (after - before) as f32;
            for (offset, slot) in positions[index..after].iter_mut().enumerate() {
                *slot = Some(from + (to - from) * (offset as f32 + 1.0) / steps);
            }
            index = after;
        }
        self.stops
            .iter()
            .zip(positions)
            .map(|(stop, position)| ResolvedStop {
                t: position.expect("every stop has a position now"),
                color: stop.color,
            })
            .collect()
    }

    /// CSS text (every colour concrete) that parses back to this gradient.
    pub fn to_css(&self) -> String {
        let mut css = String::from("linear-gradient(");
        match self.direction {
            Direction::Angle(degrees) => {
                let _ = write!(css, "{degrees}deg");
            }
            Direction::Corner { right, bottom } => {
                let _ = write!(
                    css,
                    "to {} {}",
                    if bottom { "bottom" } else { "top" },
                    if right { "right" } else { "left" }
                );
            }
        }
        for stop in &self.stops {
            let [r, g, b, a] = stop.color;
            let _ = write!(
                css,
                ", rgba({}, {}, {}, {a})",
                (r * CHANNEL_MAX).round(),
                (g * CHANNEL_MAX).round(),
                (b * CHANNEL_MAX).round(),
            );
            match stop.position {
                Some(Position::Fraction(fraction)) => {
                    let _ = write!(css, " {}%", fraction * PERCENT);
                }
                Some(Position::Pixels(pixels)) => {
                    let _ = write!(css, " {pixels}px");
                }
                None => {}
            }
        }
        css.push(')');
        css
    }

    /// Parse `linear-gradient(...)`.
    pub fn parse(input: &str) -> Result<LinearGradient, String> {
        let input = input.trim();
        let lowered = input.to_ascii_lowercase();
        if !lowered.starts_with("linear-gradient(") {
            return Err(format!(
                "expected `none` or linear-gradient(...), found {input:?} (radial, conic and repeating gradients and url() images are not supported)"
            ));
        }
        let open = "linear-gradient".len();
        let close = matching_paren(&lowered, open)
            .filter(|close| close + 1 == lowered.len())
            .ok_or_else(|| {
                format!("linear-gradient( is not closed by the last character: {input:?}")
            })?;
        let arguments = split_top_level(&lowered[open + 1..close]);
        let mut arguments = arguments.into_iter().map(str::trim).peekable();
        let direction = match arguments.peek() {
            Some(first) => match parse_direction(first)? {
                Some(direction) => {
                    arguments.next();
                    direction
                }
                None => Direction::Angle(DEFAULT_ANGLE_DEGREES),
            },
            None => return Err("linear-gradient() needs at least two colour stops".into()),
        };
        let mut stops = Vec::new();
        for argument in arguments {
            parse_stop(argument, &mut stops)?;
        }
        if stops.len() < 2 {
            return Err("linear-gradient() needs at least two colour stops".into());
        }
        Ok(LinearGradient { direction, stops })
    }
}

/// Split at the commas that are not inside parentheses.
fn split_top_level(text: &str) -> Vec<&str> {
    let mut parts = Vec::new();
    let mut depth = 0usize;
    let mut start = 0;
    for (index, character) in text.char_indices() {
        match character {
            '(' => depth += 1,
            ')' => depth = depth.saturating_sub(1),
            ',' if depth == 0 => {
                parts.push(&text[start..index]);
                start = index + 1;
            }
            _ => {}
        }
    }
    parts.push(&text[start..]);
    parts
}

/// The first argument as a direction: an angle, or `to <side or corner>`. `None` when it is a colour stop.
fn parse_direction(argument: &str) -> Result<Option<Direction>, String> {
    if let Some(sides) = argument.strip_prefix("to ") {
        let mut up = false;
        let mut down = false;
        let mut left = false;
        let mut right = false;
        for word in sides.split_whitespace() {
            match word {
                "top" => up = true,
                "bottom" => down = true,
                "left" => left = true,
                "right" => right = true,
                other => return Err(format!("`to {sides}`: unknown side {other:?}")),
            }
        }
        return match (up, down, left, right) {
            (true, false, false, false) => Ok(Some(Direction::Angle(0.0))),
            (false, false, false, true) => Ok(Some(Direction::Angle(90.0))),
            (false, true, false, false) => Ok(Some(Direction::Angle(180.0))),
            (false, false, true, false) => Ok(Some(Direction::Angle(270.0))),
            (true, false, true, false) => Ok(Some(Direction::Corner {
                right: false,
                bottom: false,
            })),
            (true, false, false, true) => Ok(Some(Direction::Corner {
                right: true,
                bottom: false,
            })),
            (false, true, false, true) => Ok(Some(Direction::Corner {
                right: true,
                bottom: true,
            })),
            (false, true, true, false) => Ok(Some(Direction::Corner {
                right: false,
                bottom: true,
            })),
            _ => Err(format!("`to {sides}` is not a side or a corner")),
        };
    }
    let first = argument.split_whitespace().next().unwrap_or("");
    if first.ends_with("deg")
        || first.ends_with("grad")
        || first.ends_with("rad")
        || first.ends_with("turn")
    {
        if argument.split_whitespace().count() != 1 {
            return Err(format!("expected an angle alone, found {argument:?}"));
        }
        return parse_angle(first).map(|degrees| Some(Direction::Angle(degrees)));
    }
    Ok(None)
}

/// One colour stop, or two when it names two positions (`red 10% 30%`).
fn parse_stop(argument: &str, stops: &mut Vec<ColorStop>) -> Result<(), String> {
    let parts = tokens(argument);
    let Some((color, positions)) = parts.split_first() else {
        return Err("an empty colour stop".into());
    };
    let color = parse_color_token(color)?
        .ok_or("currentcolor is not supported in a gradient (use the colour)")?;
    if positions.len() > 2 {
        return Err(format!(
            "a colour stop has a colour and at most two positions: {argument:?}"
        ));
    }
    if positions.is_empty() {
        stops.push(ColorStop {
            color,
            position: None,
        });
    }
    for position in positions {
        stops.push(ColorStop {
            color,
            position: Some(parse_position(position)?),
        });
    }
    Ok(())
}

fn parse_position(token: &str) -> Result<Position, String> {
    match token.strip_suffix('%') {
        Some(number) => parse_number(number).map(|value| Position::Fraction(value / PERCENT)),
        None => parse_length(token).map(Position::Pixels).map_err(|_| {
            format!("a colour stop position is a percentage or a length in px, found {token:?}")
        }),
    }
}

impl<'de> Deserialize<'de> for LinearGradient {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        LinearGradient::parse(&text).map_err(serde::de::Error::custom)
    }
}

impl Serialize for LinearGradient {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_css())
    }
}

/// A value of `backgroundImage`: `none`, or a gradient.
#[derive(Clone, Debug, PartialEq)]
pub enum BackgroundImage {
    None,
    Gradient(LinearGradient),
}

impl BackgroundImage {
    pub fn parse(input: &str) -> Result<BackgroundImage, String> {
        if input.trim().eq_ignore_ascii_case("none") {
            Ok(BackgroundImage::None)
        } else {
            LinearGradient::parse(input).map(BackgroundImage::Gradient)
        }
    }
}

impl<'de> Deserialize<'de> for BackgroundImage {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        BackgroundImage::parse(&text).map_err(serde::de::Error::custom)
    }
}

impl Serialize for BackgroundImage {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            BackgroundImage::None => serializer.serialize_str("none"),
            BackgroundImage::Gradient(gradient) => serializer.serialize_str(&gradient.to_css()),
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Utilities (Tailwind): bg-gradient-to-*, from-*, via-*, to-*.
// ---------------------------------------------------------------------------------------------

/// The direction utilities (`bg-gradient-to-tr`).
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PartDirection {
    ToT,
    ToTr,
    ToR,
    ToBr,
    ToB,
    ToBl,
    ToL,
    ToTl,
}

impl PartDirection {
    fn direction(self) -> Direction {
        match self {
            PartDirection::ToT => Direction::Angle(0.0),
            PartDirection::ToTr => Direction::Corner {
                right: true,
                bottom: false,
            },
            PartDirection::ToR => Direction::Angle(90.0),
            PartDirection::ToBr => Direction::Corner {
                right: true,
                bottom: true,
            },
            PartDirection::ToB => Direction::Angle(180.0),
            PartDirection::ToBl => Direction::Corner {
                right: false,
                bottom: true,
            },
            PartDirection::ToL => Direction::Angle(270.0),
            PartDirection::ToTl => Direction::Corner {
                right: false,
                bottom: false,
            },
        }
    }
}

/// What Tailwind's separate gradient utilities set, merged per field across layers (`from-blue-500 hover:from-blue-600`
/// keeps the direction and the other stops on hover). Colours are `#rgb`, `#rrggbb` or `#rrggbbaa`; positions are
/// percentages (`from-10%` is 10).
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GradientParts {
    pub direction: Option<PartDirection>,
    pub from: Option<String>,
    pub from_position: Option<f32>,
    pub via: Option<String>,
    pub via_position: Option<f32>,
    pub to: Option<String>,
    pub to_position: Option<f32>,
}

impl GradientParts {
    pub fn merge(&mut self, other: &GradientParts) {
        macro_rules! overwrite {
            ($($field:ident),+ $(,)?) => {{
                let GradientParts { $($field),+ } = other;
                $(
                    if $field.is_some() {
                        self.$field = $field.clone();
                    }
                )+
            }};
        }
        overwrite!(
            direction,
            from,
            from_position,
            via,
            via_position,
            to,
            to_position
        );
    }

    pub fn validate(&self) -> Result<(), String> {
        for (name, color) in [("from", &self.from), ("via", &self.via), ("to", &self.to)] {
            if let Some(color) = color {
                parse_color_token(color).map_err(|error| format!("gradient {name}: {error}"))?;
            }
        }
        for (name, position) in [
            ("from", self.from_position),
            ("via", self.via_position),
            ("to", self.to_position),
        ] {
            if position.is_some_and(|position| !position.is_finite()) {
                return Err(format!("gradient {name} position must be finite"));
            }
        }
        Ok(())
    }

    /// The gradient the utilities make: Tailwind's `linear-gradient(<direction>, var(--tw-gradient-stops))`, where the
    /// stops exist once `from-*` or `via-*` set them, and the end fades to the last colour made transparent when
    /// `to-*` names none. `None` for a gradient that is invalid in CSS (a direction with no `from-*`).
    pub fn to_gradient(&self) -> Option<LinearGradient> {
        let direction = self.direction?.direction();
        // `via-*` alone leaves `--tw-gradient-from` unset, which makes the whole value invalid.
        let from = self.from.as_deref()?;
        let color = |text: &str| -> Option<Rgba> { parse_color_token(text).ok().flatten() };
        let from_color = color(from)?;
        let via_color = self.via.as_deref().and_then(color);
        let transparent = |color: Rgba| [color[0], color[1], color[2], 0.0];
        // `to` defaults to the colour before it made transparent: `via` if there is one, else `from`.
        let to_color = match self.to.as_deref() {
            Some(text) => color(text)?,
            None => transparent(via_color.unwrap_or(from_color)),
        };
        let position =
            |value: Option<f32>| value.map(|percent| Position::Fraction(percent / PERCENT));
        let mut stops = vec![ColorStop {
            color: from_color,
            position: position(self.from_position),
        }];
        if let Some(via_color) = via_color {
            stops.push(ColorStop {
                color: via_color,
                position: position(self.via_position),
            });
        }
        stops.push(ColorStop {
            color: to_color,
            position: position(self.to_position),
        });
        Some(LinearGradient { direction, stops })
    }
}

// ---------------------------------------------------------------------------------------------
// The ramp
// ---------------------------------------------------------------------------------------------

/// How many texels a ramp for a gradient line this many device pixels long has: the next power of two, so the ramp
/// resolves a hard stop to about a pixel and a box that grows keeps one ramp until it crosses a power of two.
pub fn ramp_texels(length_device_px: f32) -> usize {
    let wanted = length_device_px.ceil().max(1.0) as usize;
    wanted
        .next_power_of_two()
        .clamp(MIN_RAMP_TEXELS, MAX_RAMP_TEXELS)
}

fn premultiply(color: Rgba) -> Rgba {
    [
        color[0] * color[3],
        color[1] * color[3],
        color[2] * color[3],
        color[3],
    ]
}

/// The colour of the gradient at `t`, interpolated premultiplied between the stops, straight again.
fn color_at(stops: &[ResolvedStop], t: f32) -> Rgba {
    let first = stops.first().expect("a gradient has stops");
    let last = stops.last().expect("a gradient has stops");
    let premultiplied = if t <= first.t {
        premultiply(first.color)
    } else if t >= last.t {
        premultiply(last.color)
    } else {
        // The last segment that starts at or before `t`, so a hard stop at `t` gives the colour after it.
        let index = stops
            .windows(2)
            .rposition(|pair| pair[0].t <= t && t < pair[1].t)
            .expect("t lies between the first and last stop");
        let (from, to) = (stops[index], stops[index + 1]);
        let span = to.t - from.t;
        let amount = if span > 0.0 { (t - from.t) / span } else { 1.0 };
        let (a, b) = (premultiply(from.color), premultiply(to.color));
        std::array::from_fn(|channel| a[channel] + (b[channel] - a[channel]) * amount)
    };
    let alpha = premultiplied[3];
    if alpha > 0.0 {
        [
            premultiplied[0] / alpha,
            premultiplied[1] / alpha,
            premultiplied[2] / alpha,
            alpha,
        ]
    } else {
        [0.0, 0.0, 0.0, 0.0]
    }
}

/// The ramp: `texels` RGBA8 texels, texel `i` holding the colour at `(i + 0.5) / texels` of the line. A fully
/// transparent texel takes the colour of the nearest visible one, so that the texture filter does not darken the edge
/// of a fade.
pub fn ramp(stops: &[ResolvedStop], texels: usize) -> Vec<u8> {
    let colors: Vec<Rgba> = (0..texels)
        .map(|index| color_at(stops, (index as f32 + 0.5) / texels as f32))
        .collect();
    let visible: Vec<usize> = (0..texels)
        .filter(|index| colors[*index][3] > 0.0)
        .collect();
    let mut bytes = Vec::with_capacity(texels * 4);
    for (index, color) in colors.iter().enumerate() {
        let mut rgb = [color[0], color[1], color[2]];
        if color[3] <= 0.0
            && let Some(nearest) = visible
                .iter()
                .min_by_key(|candidate| candidate.abs_diff(index))
        {
            rgb = [
                colors[*nearest][0],
                colors[*nearest][1],
                colors[*nearest][2],
            ];
        }
        for value in [rgb[0], rgb[1], rgb[2], color[3]] {
            bytes.push((value.clamp(0.0, 1.0) * CHANNEL_MAX).round() as u8);
        }
    }
    bytes
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f32, b: f32) {
        assert!((a - b).abs() < 1e-3, "{a} != {b}");
    }

    fn parse(css: &str) -> LinearGradient {
        LinearGradient::parse(css).unwrap_or_else(|error| panic!("{css}: {error}"))
    }

    #[test]
    fn parses_angles_sides_and_corners() {
        assert_eq!(
            parse("linear-gradient(90deg, #f00, #00f)").direction,
            Direction::Angle(90.0)
        );
        assert_eq!(
            parse("linear-gradient(0.25turn, #f00, #00f)").direction,
            Direction::Angle(90.0)
        );
        assert_eq!(
            parse("linear-gradient(to left, #f00, #00f)").direction,
            Direction::Angle(270.0)
        );
        assert_eq!(
            parse("linear-gradient(to top left, #f00, #00f)").direction,
            Direction::Corner {
                right: false,
                bottom: false
            }
        );
        assert_eq!(
            parse("linear-gradient(to right bottom, #f00, #00f)").direction,
            Direction::Corner {
                right: true,
                bottom: true
            }
        );
        assert_eq!(
            parse("linear-gradient(#f00, #00f)").direction,
            Direction::Angle(180.0)
        );
        assert_eq!(
            parse("LINEAR-GRADIENT(To Right, #F00, #00F)").direction,
            Direction::Angle(90.0)
        );
    }

    #[test]
    fn parses_colours_with_commas_positions_and_double_positions() {
        let gradient =
            parse("linear-gradient(45deg, rgba(255, 0, 0, 0.5) 10%, #00f 20px 30px, transparent)");
        assert_eq!(gradient.stops.len(), 4);
        assert_eq!(gradient.stops[0].color, [1.0, 0.0, 0.0, 0.5]);
        assert_eq!(gradient.stops[0].position, Some(Position::Fraction(0.1)));
        assert_eq!(gradient.stops[1].position, Some(Position::Pixels(20.0)));
        assert_eq!(gradient.stops[2].position, Some(Position::Pixels(30.0)));
        assert_eq!(gradient.stops[3].position, None);
        assert_eq!(gradient.stops[3].color, [0.0, 0.0, 0.0, 0.0]);
    }

    #[test]
    fn rejects_what_it_cannot_draw() {
        for css in [
            "radial-gradient(#f00, #00f)",
            "repeating-linear-gradient(#f00, #00f)",
            "url(a.png)",
            "linear-gradient(#f00)",
            "linear-gradient(to middle, #f00, #00f)",
            "linear-gradient(#f00, #00f",
            "linear-gradient(currentcolor, #00f)",
            "linear-gradient(red 10% 20% 30%, #00f)",
            "linear-gradient(#f00 3em, #00f)",
        ] {
            assert!(LinearGradient::parse(css).is_err(), "{css}");
        }
        assert_eq!(
            BackgroundImage::parse("none").expect("none"),
            BackgroundImage::None
        );
    }

    #[test]
    fn serialises_to_css_that_parses_back() {
        let gradient =
            parse("linear-gradient(to bottom right, #ff0000 10%, rgba(0, 0, 255, 0.5) 20px)");
        assert_eq!(parse(&gradient.to_css()), gradient);
    }

    #[test]
    fn the_line_of_an_angle_spans_the_corners() {
        // 90deg on a 200 x 100 box: left to right, the full width.
        let line = parse("linear-gradient(90deg, #f00, #00f)").line(0.0, 0.0, 200.0, 100.0);
        close(line.length, 200.0);
        close(line.start.0, 0.0);
        close(line.start.1, 50.0);
        close(line.t(100.0, 0.0), 0.5);
        // 45deg on a square: the diagonal.
        let line = parse("linear-gradient(45deg, #f00, #00f)").line(0.0, 0.0, 100.0, 100.0);
        close(line.length, 100.0 * std::f32::consts::SQRT_2);
        close(line.t(0.0, 100.0), 0.0);
        close(line.t(100.0, 0.0), 1.0);
    }

    #[test]
    fn a_corner_gradient_puts_the_fifty_percent_line_through_the_other_corners() {
        // to bottom right on 200 x 100: the top right and bottom left corners are both at 50 %.
        let line =
            parse("linear-gradient(to bottom right, #f00, #00f)").line(0.0, 0.0, 200.0, 100.0);
        close(line.t(200.0, 0.0), 0.5);
        close(line.t(0.0, 100.0), 0.5);
        close(line.t(0.0, 0.0), 0.0);
        close(line.t(200.0, 100.0), 1.0);
        let line = parse("linear-gradient(to top left, #f00, #00f)").line(10.0, 20.0, 200.0, 100.0);
        close(line.t(10.0 + 200.0, 20.0 + 100.0), 0.0);
        close(line.t(10.0, 20.0), 1.0);
        close(line.t(10.0 + 200.0, 20.0), 0.5);
    }

    #[test]
    fn stops_are_fixed_up_as_css_says() {
        let gradient = parse("linear-gradient(90deg, #000, #111, #222, #333 80%, #444)");
        let positions: Vec<f32> = gradient.resolve(100.0).iter().map(|stop| stop.t).collect();
        for (actual, expected) in positions.iter().zip([0.0, 0.2666667, 0.5333333, 0.8, 1.0]) {
            close(*actual, expected);
        }
        // A stop that goes back is moved up to the largest before it: a hard stop.
        let gradient = parse("linear-gradient(90deg, #000 50%, #fff 30%)");
        let positions: Vec<f32> = gradient.resolve(100.0).iter().map(|stop| stop.t).collect();
        assert_eq!(positions, vec![0.5, 0.5]);
        // Pixel positions are fractions of the line.
        let gradient = parse("linear-gradient(90deg, #000 25px, #fff)");
        close(gradient.resolve(200.0)[0].t, 0.125);
    }

    #[test]
    fn the_ramp_interpolates_premultiplied_so_a_fade_keeps_its_colour() {
        let gradient = parse("linear-gradient(90deg, #ff0000, transparent)");
        let bytes = ramp(&gradient.resolve(100.0), 64);
        // Halfway: the same red at half alpha (straight interpolation would have gone to a dark red).
        let middle = &bytes[32 * 4..32 * 4 + 4];
        assert_eq!(&middle[..3], &[255, 0, 0]);
        assert!((i32::from(middle[3]) - 127).abs() <= 3, "{}", middle[3]);
        // Between two opaque colours it is a plain blend.
        let gradient = parse("linear-gradient(90deg, #000000, #ffffff)");
        let bytes = ramp(&gradient.resolve(100.0), 64);
        assert!(
            (i32::from(bytes[32 * 4]) - 128).abs() <= 3,
            "{}",
            bytes[32 * 4]
        );
        assert_eq!(bytes[32 * 4 + 3], 255);
    }

    #[test]
    fn a_hard_stop_is_a_step_and_the_ends_hold_their_colour() {
        let gradient = parse("linear-gradient(90deg, #ff0000 50%, #0000ff 50%)");
        let bytes = ramp(&gradient.resolve(100.0), 64);
        assert_eq!(&bytes[..4], &[255, 0, 0, 255]);
        assert_eq!(&bytes[31 * 4..31 * 4 + 4], &[255, 0, 0, 255]);
        assert_eq!(&bytes[32 * 4..32 * 4 + 4], &[0, 0, 255, 255]);
        assert_eq!(&bytes[63 * 4..63 * 4 + 4], &[0, 0, 255, 255]);
    }

    #[test]
    fn a_fully_transparent_run_borrows_the_colour_of_the_visible_texels() {
        let gradient = parse("linear-gradient(90deg, transparent 50%, #00ff00)");
        let bytes = ramp(&gradient.resolve(100.0), 64);
        assert_eq!(bytes[3], 0);
        assert_eq!(&bytes[..3], &[0, 255, 0]);
    }

    #[test]
    fn ramps_are_powers_of_two_in_a_range() {
        assert_eq!(ramp_texels(1.0), MIN_RAMP_TEXELS);
        assert_eq!(ramp_texels(100.0), 128);
        assert_eq!(ramp_texels(128.0), 128);
        assert_eq!(ramp_texels(129.0), 256);
        assert_eq!(ramp_texels(1.0e9), MAX_RAMP_TEXELS);
    }

    #[test]
    fn utilities_make_tailwinds_gradient() {
        let mut parts = GradientParts {
            direction: Some(PartDirection::ToR),
            from: Some("#3b82f6".into()),
            ..GradientParts::default()
        };
        // from alone fades to the same colour, transparent.
        let gradient = parts.to_gradient().expect("a gradient");
        assert_eq!(gradient.direction, Direction::Angle(90.0));
        assert_eq!(gradient.stops.len(), 2);
        close(gradient.stops[1].color[3], 0.0);
        close(gradient.stops[1].color[0], gradient.stops[0].color[0]);
        // via makes the end fade from the via colour; to names it.
        parts.via = Some("#ef4444".into());
        let gradient = parts.to_gradient().expect("a gradient");
        assert_eq!(gradient.stops.len(), 3);
        close(gradient.stops[2].color[3], 0.0);
        close(gradient.stops[2].color[0], gradient.stops[1].color[0]);
        parts.to = Some("#10b981".into());
        parts.via_position = Some(30.0);
        parts.to_position = Some(90.0);
        let gradient = parts.to_gradient().expect("a gradient");
        assert_eq!(gradient.stops[1].position, Some(Position::Fraction(0.3)));
        assert_eq!(gradient.stops[2].position, Some(Position::Fraction(0.9)));
        close(gradient.stops[2].color[3], 1.0);
        // No from: Tailwind's value is invalid, and nothing is drawn.
        let mut no_from = parts.clone();
        no_from.from = None;
        assert!(no_from.to_gradient().is_none());
        let mut no_direction = parts.clone();
        no_direction.direction = None;
        assert!(no_direction.to_gradient().is_none());
    }

    #[test]
    fn parts_merge_per_field() {
        let mut parts = GradientParts {
            direction: Some(PartDirection::ToBr),
            from: Some("#000000".into()),
            to: Some("#ffffff".into()),
            ..GradientParts::default()
        };
        parts.merge(&GradientParts {
            from: Some("#111111".into()),
            ..GradientParts::default()
        });
        assert_eq!(parts.direction, Some(PartDirection::ToBr));
        assert_eq!(parts.from.as_deref(), Some("#111111"));
        assert_eq!(parts.to.as_deref(), Some("#ffffff"));
    }
}
