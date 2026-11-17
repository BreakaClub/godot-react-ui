//! CSS `linear-gradient()` and `conic-gradient()`: parsing, the Tailwind utilities that compose one (v3's
//! `bg-gradient-to-r` and v4's `bg-conic`, with `from-* via-* to-*`), the gradient line CSS defines for a box, colour-stop
//! resolution and the ramp the renderer draws it from. Nothing here touches Godot.
//!
//! A gradient is drawn as a mesh over the box whose vertices carry the position along the gradient (along the line, or
//! round the centre), sampled from a one-pixel-high ramp texture baked here (`ramp`). The ramp is baked as CSS
//! interpolates: in sRGB or, with `in oklab`, in Oklab, with premultiplied alpha (CSS Images 4, "color interpolation";
//! CSS Color 4 section 12), so a fade to `transparent` does not go through grey.

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
const DEGREES_PER_TURN: f32 = 360.0;
/// `center`: where a conic gradient is when it names no position, as a fraction of the box on each axis.
const CENTRE_FRACTION: f32 = 0.5;
/// Tailwind v4's initial `--tw-gradient-from`, `-via` and `-to` (`#0000`) and positions (0 %, 50 %, 100 %).
const V4_UNSET_STOP: Rgba = [0.0, 0.0, 0.0, 0.0];
const V4_FROM_POSITION: f32 = 0.0;
const V4_VIA_POSITION: f32 = 50.0;
const V4_TO_POSITION: f32 = 100.0;

/// The colour space a gradient interpolates in (CSS `<color-interpolation-method>`): sRGB, the default for the hex and
/// `rgb()` colours this library takes, or Oklab, which Tailwind v4's gradient utilities ask for.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ColorSpace {
    #[default]
    Srgb,
    Oklab,
}

impl ColorSpace {
    fn parse(text: &str) -> Result<ColorSpace, String> {
        match text.trim() {
            "srgb" => Ok(ColorSpace::Srgb),
            "oklab" => Ok(ColorSpace::Oklab),
            other => Err(format!(
                "a gradient interpolates in srgb or oklab here, not {other:?}"
            )),
        }
    }

    fn css(self) -> &'static str {
        match self {
            ColorSpace::Srgb => "srgb",
            ColorSpace::Oklab => "oklab",
        }
    }
}

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
    pub space: ColorSpace,
    pub stops: Vec<ColorStop>,
}

/// A coordinate of a conic gradient's centre: a fraction of the box (`50%`, `center`) or logical pixels from its left or top.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Coordinate {
    Fraction(f32),
    Pixels(f32),
}

impl Coordinate {
    /// Where this is along an axis `length` long, in the unit `scale` makes a logical pixel.
    pub fn resolve(self, length: f32, scale: f32) -> f32 {
        match self {
            Coordinate::Fraction(fraction) => fraction * length,
            Coordinate::Pixels(pixels) => pixels * scale,
        }
    }
}

/// A stop of a conic gradient: a colour and, if it names one, its position as a fraction of a turn (`90deg` and `25%` are
/// both 0.25).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AngularStop {
    pub color: Rgba,
    pub position: Option<f32>,
}

/// `conic-gradient([from <angle>] [at <position>] [in <space>], <stops>)`: colours round a centre, starting from the
/// `from` angle (clockwise from up, as CSS's angles are) and running one turn.
#[derive(Clone, Debug, PartialEq)]
pub struct ConicGradient {
    pub from_degrees: f32,
    pub at: [Coordinate; 2],
    pub space: ColorSpace,
    pub stops: Vec<AngularStop>,
}

/// A gradient image: linear or conic.
#[derive(Clone, Debug, PartialEq)]
pub enum Gradient {
    Linear(LinearGradient),
    Conic(ConicGradient),
}

impl Gradient {
    pub fn parse(input: &str) -> Result<Gradient, String> {
        let lowered = input.trim().to_ascii_lowercase();
        if lowered.starts_with("conic-gradient(") {
            ConicGradient::parse(input).map(Gradient::Conic)
        } else {
            LinearGradient::parse(input).map(Gradient::Linear)
        }
    }

    pub fn to_css(&self) -> String {
        match self {
            Gradient::Linear(gradient) => gradient.to_css(),
            Gradient::Conic(gradient) => gradient.to_css(),
        }
    }
}

/// CSS's fix-up of stop positions (CSS Images 3 section 3.5.3): the first defaults to 0 and the last to 1, a position that goes
/// back is moved up to the largest before it, and a run with none is spread evenly between the stops on either side.
fn fix_up(mut positions: Vec<Option<f32>>) -> Vec<f32> {
    let count = positions.len();
    if count == 0 {
        return Vec::new();
    }
    positions[0].get_or_insert(0.0);
    positions[count - 1].get_or_insert(1.0);
    let mut largest = f32::NEG_INFINITY;
    for position in positions.iter_mut().flatten() {
        largest = largest.max(*position);
        *position = largest;
    }
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
    positions
        .into_iter()
        .map(|position| position.expect("every stop has a position now"))
        .collect()
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
        let positions = self
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
        self.stops
            .iter()
            .zip(fix_up(positions))
            .map(|(stop, t)| ResolvedStop {
                t,
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
        if self.space != ColorSpace::Srgb {
            let _ = write!(css, " in {}", self.space.css());
        }
        for stop in &self.stops {
            write_color(&mut css, stop.color);
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
                "expected `none`, linear-gradient(...) or conic-gradient(...), found {input:?} (radial and repeating gradients and url() images are not supported)"
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
        let (direction, space) = match arguments.peek() {
            Some(first) => {
                // `<direction> in <space>`, `in <space> <direction>`, or either alone.
                let (direction_text, space) = split_interpolation(first)?;
                match direction_text.map(parse_direction).transpose()?.flatten() {
                    Some(direction) => {
                        arguments.next();
                        (direction, space)
                    }
                    None if space.is_some() => {
                        if direction_text.is_some() {
                            return Err(format!("{first:?} is not a direction"));
                        }
                        arguments.next();
                        (Direction::Angle(DEFAULT_ANGLE_DEGREES), space)
                    }
                    None => (Direction::Angle(DEFAULT_ANGLE_DEGREES), None),
                }
            }
            None => return Err("linear-gradient() needs at least two colour stops".into()),
        };
        let mut stops = Vec::new();
        for argument in arguments {
            parse_stop(argument, &mut stops)?;
        }
        if stops.len() < 2 {
            return Err("linear-gradient() needs at least two colour stops".into());
        }
        Ok(LinearGradient {
            direction,
            space: space.unwrap_or_default(),
            stops,
        })
    }
}

impl ConicGradient {
    /// The stops with CSS's fix-up applied, as fractions of a turn from the `from` angle.
    pub fn resolve(&self) -> Vec<ResolvedStop> {
        let positions = self.stops.iter().map(|stop| stop.position).collect();
        self.stops
            .iter()
            .zip(fix_up(positions))
            .map(|(stop, t)| ResolvedStop {
                t,
                color: stop.color,
            })
            .collect()
    }

    /// The centre in a box `width x height` whose top left is at `(x, y)`, in the unit `scale` makes a logical pixel.
    pub fn centre(&self, x: f32, y: f32, width: f32, height: f32, scale: f32) -> (f32, f32) {
        (
            x + self.at[0].resolve(width, scale),
            y + self.at[1].resolve(height, scale),
        )
    }

    /// The `from` angle in radians.
    pub fn start_radians(&self) -> f32 {
        self.from_degrees.to_radians()
    }

    /// CSS text (every colour concrete) that parses back to this gradient.
    pub fn to_css(&self) -> String {
        let coordinate = |value: Coordinate| match value {
            Coordinate::Fraction(fraction) => format!("{}%", fraction * PERCENT),
            Coordinate::Pixels(pixels) => format!("{pixels}px"),
        };
        let mut css = format!(
            "conic-gradient(from {}deg at {} {}",
            self.from_degrees,
            coordinate(self.at[0]),
            coordinate(self.at[1])
        );
        if self.space != ColorSpace::Srgb {
            let _ = write!(css, " in {}", self.space.css());
        }
        for stop in &self.stops {
            write_color(&mut css, stop.color);
            if let Some(position) = stop.position {
                let _ = write!(css, " {}%", position * PERCENT);
            }
        }
        css.push(')');
        css
    }

    /// Parse `conic-gradient(...)`.
    pub fn parse(input: &str) -> Result<ConicGradient, String> {
        let input = input.trim();
        let lowered = input.to_ascii_lowercase();
        let open = "conic-gradient".len();
        if !lowered.starts_with("conic-gradient(") {
            return Err(format!("expected conic-gradient(...), found {input:?}"));
        }
        let close = matching_paren(&lowered, open)
            .filter(|close| close + 1 == lowered.len())
            .ok_or_else(|| {
                format!("conic-gradient( is not closed by the last character: {input:?}")
            })?;
        let arguments = split_top_level(&lowered[open + 1..close]);
        let mut arguments = arguments.into_iter().map(str::trim).peekable();
        let mut gradient = ConicGradient {
            from_degrees: 0.0,
            at: [Coordinate::Fraction(CENTRE_FRACTION); 2],
            space: ColorSpace::Srgb,
            stops: Vec::new(),
        };
        if let Some(first) = arguments.peek()
            && first
                .split_whitespace()
                .next()
                .is_some_and(|word| matches!(word, "from" | "at" | "in"))
        {
            parse_conic_prelude(first, &mut gradient)?;
            arguments.next();
        }
        for argument in arguments {
            parse_angular_stop(argument, &mut gradient.stops)?;
        }
        if gradient.stops.len() < 2 {
            return Err("conic-gradient() needs at least two colour stops".into());
        }
        Ok(gradient)
    }
}

/// `from <angle>`, `at <position>` and `in <space>`, each at most once, in any order.
fn parse_conic_prelude(argument: &str, gradient: &mut ConicGradient) -> Result<(), String> {
    let words: Vec<&str> = argument.split_whitespace().collect();
    let mut index = 0;
    let mut seen = [false; 3];
    while index < words.len() {
        let keyword = words[index];
        let slot = match keyword {
            "from" => 0,
            "at" => 1,
            "in" => 2,
            other => return Err(format!("conic-gradient(): unexpected {other:?} in {argument:?}")),
        };
        if std::mem::replace(&mut seen[slot], true) {
            return Err(format!("conic-gradient(): {keyword} is given twice in {argument:?}"));
        }
        let end = words[index + 1..]
            .iter()
            .position(|word| matches!(*word, "from" | "at" | "in"))
            .map_or(words.len(), |offset| index + 1 + offset);
        let values = &words[index + 1..end];
        match keyword {
            "from" => {
                let [angle] = values else {
                    return Err(format!("conic-gradient(): `from` takes one angle, in {argument:?}"));
                };
                gradient.from_degrees = parse_angle(angle)?;
            }
            "at" => gradient.at = parse_centre(values)?,
            _ => {
                let [space] = values else {
                    return Err(format!("conic-gradient(): `in` takes one colour space, in {argument:?}"));
                };
                gradient.space = ColorSpace::parse(space)?;
            }
        }
        index = end;
    }
    Ok(())
}

/// A `<position>` of one or two values: keywords, percentages or lengths in px (CSS Values 4; the three- and four-value forms
/// with offsets from an edge are not taken).
fn parse_centre(values: &[&str]) -> Result<[Coordinate; 2], String> {
    let horizontal = |word: &str| match word {
        "left" => Some(Coordinate::Fraction(0.0)),
        "right" => Some(Coordinate::Fraction(1.0)),
        _ => None,
    };
    let vertical = |word: &str| match word {
        "top" => Some(Coordinate::Fraction(0.0)),
        "bottom" => Some(Coordinate::Fraction(1.0)),
        _ => None,
    };
    let value = |word: &str| -> Result<Coordinate, String> {
        if word == "center" {
            return Ok(Coordinate::Fraction(CENTRE_FRACTION));
        }
        match word.strip_suffix('%') {
            Some(number) => parse_number(number).map(|value| Coordinate::Fraction(value / PERCENT)),
            None => parse_length(word).map(Coordinate::Pixels).map_err(|_| {
                format!("a position is a keyword, a percentage or a length in px, found {word:?}")
            }),
        }
    };
    match values {
        [one] => Ok(match (horizontal(one), vertical(one)) {
            (Some(x), _) => [x, Coordinate::Fraction(CENTRE_FRACTION)],
            (_, Some(y)) => [Coordinate::Fraction(CENTRE_FRACTION), y],
            _ => [value(one)?, Coordinate::Fraction(CENTRE_FRACTION)],
        }),
        [first, second] => {
            // Keywords may come in either order (`top left`); otherwise the first is the horizontal one.
            if vertical(first).is_some() || horizontal(second).is_some() {
                let y = vertical(first).map_or_else(|| value(first), Ok)?;
                let x = horizontal(second).map_or_else(|| value(second), Ok)?;
                Ok([x, y])
            } else {
                let x = horizontal(first).map_or_else(|| value(first), Ok)?;
                let y = vertical(second).map_or_else(|| value(second), Ok)?;
                Ok([x, y])
            }
        }
        _ => Err(format!(
            "conic-gradient(): `at` takes a position of one or two values, found {values:?}"
        )),
    }
}

/// One stop of a conic gradient, or two when it names two positions (`red 10% 30%`, `red 0deg 90deg`).
fn parse_angular_stop(argument: &str, stops: &mut Vec<AngularStop>) -> Result<(), String> {
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
        stops.push(AngularStop {
            color,
            position: None,
        });
    }
    for position in positions {
        let turn = match position.strip_suffix('%') {
            Some(number) => parse_number(number)? / PERCENT,
            None => {
                parse_angle(position).map_err(|_| {
                    format!("a conic colour stop position is a percentage or an angle, found {position:?}")
                })? / DEGREES_PER_TURN
            }
        };
        stops.push(AngularStop {
            color,
            position: Some(turn),
        });
    }
    Ok(())
}

/// The colour of a stop as CSS text, after a comma.
fn write_color(css: &mut String, [r, g, b, a]: Rgba) {
    let _ = write!(
        css,
        ", rgba({}, {}, {}, {a})",
        (r * CHANNEL_MAX).round(),
        (g * CHANNEL_MAX).round(),
        (b * CHANNEL_MAX).round(),
    );
}

/// The words of a gradient's first argument with its `in <space>` taken out: what is left (`None` when nothing is) and
/// the space, if it named one.
fn split_interpolation(argument: &str) -> Result<(Option<&str>, Option<ColorSpace>), String> {
    let Some(at) = argument
        .match_indices("in ")
        .map(|(index, _)| index)
        .find(|index| *index == 0 || argument.as_bytes()[index - 1] == b' ')
    else {
        return Ok((Some(argument), None));
    };
    let after = &argument[at + "in ".len()..];
    let mut words = after.split_whitespace();
    let space = ColorSpace::parse(words.next().unwrap_or(""))?;
    let rest_after = words.collect::<Vec<_>>().join(" ");
    let before = argument[..at].trim();
    let left = match (before.is_empty(), rest_after.is_empty()) {
        (true, true) => None,
        (false, true) => Some(before),
        (true, false) => {
            // Text after the space name: only a direction written after it, which a caller re-reads from the argument.
            let start = argument.len() - after.trim_start().len()
                + after.trim_start().find(char::is_whitespace).unwrap_or(0);
            Some(argument[start..].trim())
        }
        (false, false) => {
            return Err(format!(
                "{argument:?}: the interpolation method goes before or after the rest, not inside it"
            ));
        }
    };
    Ok((left, Some(space)))
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
    Gradient(Gradient),
}

impl BackgroundImage {
    pub fn parse(input: &str) -> Result<BackgroundImage, String> {
        if input.trim().eq_ignore_ascii_case("none") {
            Ok(BackgroundImage::None)
        } else {
            Gradient::parse(input).map(BackgroundImage::Gradient)
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

/// Tailwind v4's `bg-conic` (`from 0deg`), `bg-conic-<angle>` and `-bg-conic-<angle>`, with the interpolation of its
/// modifier (`in oklab` unless `/srgb`).
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConicPart {
    pub from_degrees: f32,
    pub space: ColorSpace,
}

/// What Tailwind's separate gradient utilities set, merged per field across layers (`from-blue-500 hover:from-blue-600`
/// keeps the direction and the other stops on hover). Colours are `#rgb`, `#rrggbb` or `#rrggbbaa`; positions are
/// percentages (`from-10%` is 10). `direction` (v3's `bg-gradient-to-*`) and `conic` (v4's `bg-conic*`) are the two kinds
/// of image the stops are for; setting one forgets the other, as each sets `background-image` in Tailwind.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GradientParts {
    pub direction: Option<PartDirection>,
    pub conic: Option<ConicPart>,
    pub from: Option<String>,
    pub from_position: Option<f32>,
    pub via: Option<String>,
    pub via_position: Option<f32>,
    pub to: Option<String>,
    pub to_position: Option<f32>,
}

impl GradientParts {
    pub fn merge(&mut self, other: &GradientParts) {
        if other.direction.is_some() {
            self.conic = None;
        }
        if other.conic.is_some() {
            self.direction = None;
        }
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
            conic,
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
        if self
            .conic
            .is_some_and(|conic| !conic.from_degrees.is_finite())
        {
            return Err("gradient conic fromDegrees must be finite".into());
        }
        Ok(())
    }

    /// The gradient the utilities make: v4's conic one when `conic` is set (`to_conic`), else v3's linear one.
    pub fn to_gradient(&self) -> Option<Gradient> {
        match self.conic {
            Some(conic) => self.to_conic(conic).map(Gradient::Conic),
            None => self.to_linear().map(Gradient::Linear),
        }
    }

    /// Tailwind v4's `conic-gradient(var(--tw-gradient-stops))`: the stops exist once a `from-*`, `via-*` or `to-*` colour set
    /// them, an unset colour is `#0000`, and the positions are 0 %, 50 % (`via`) and 100 % unless set
    /// (`theme.css`'s `@property --tw-gradient-*` initial values).
    fn to_conic(&self, conic: ConicPart) -> Option<ConicGradient> {
        if self.from.is_none() && self.via.is_none() && self.to.is_none() {
            return None;
        }
        let color = |text: Option<&str>| -> Option<Rgba> {
            match text {
                Some(text) => parse_color_token(text).ok().flatten(),
                None => Some(V4_UNSET_STOP),
            }
        };
        let fraction = |value: Option<f32>, initial: f32| Some(value.unwrap_or(initial) / PERCENT);
        let mut stops = vec![AngularStop {
            color: color(self.from.as_deref())?,
            position: fraction(self.from_position, V4_FROM_POSITION),
        }];
        if self.via.is_some() {
            stops.push(AngularStop {
                color: color(self.via.as_deref())?,
                position: fraction(self.via_position, V4_VIA_POSITION),
            });
        }
        stops.push(AngularStop {
            color: color(self.to.as_deref())?,
            position: fraction(self.to_position, V4_TO_POSITION),
        });
        Some(ConicGradient {
            from_degrees: conic.from_degrees,
            at: [Coordinate::Fraction(CENTRE_FRACTION); 2],
            space: conic.space,
            stops,
        })
    }

    /// Tailwind v3's `linear-gradient(<direction>, var(--tw-gradient-stops))`, where the stops exist once `from-*` or
    /// `via-*` set them, and the end fades to the last colour made transparent when `to-*` names none. `None` for a
    /// gradient that is invalid in CSS (a direction with no `from-*`).
    fn to_linear(&self) -> Option<LinearGradient> {
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
        Some(LinearGradient {
            direction,
            space: ColorSpace::Srgb,
            stops,
        })
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

/// The matrices of Oklab (Björn Ottosson, "A perceptual color space for image processing", 2020, the reference
/// implementation's `linear_srgb_to_oklab` and `oklab_to_linear_srgb`): linear sRGB to the cone response, and the cube roots
/// of that to Lab, then back.
const LINEAR_SRGB_TO_LMS: [[f32; 3]; 3] = [
    [0.412_221_46, 0.536_332_55, 0.051_445_995],
    [0.211_903_5, 0.680_699_5, 0.107_396_96],
    [0.088_302_46, 0.281_718_85, 0.629_978_7],
];
const LMS_TO_OKLAB: [[f32; 3]; 3] = [
    [0.210_454_26, 0.793_617_8, -0.004_072_047],
    [1.977_998_5, -2.428_592_2, 0.450_593_7],
    [0.025_904_037, 0.782_771_77, -0.808_675_77],
];
const OKLAB_TO_LMS: [[f32; 3]; 3] = [
    [1.0, 0.396_337_78, 0.215_803_76],
    [1.0, -0.105_561_346, -0.063_854_17],
    [1.0, -0.089_484_18, -1.291_485_5],
];
const LMS_TO_LINEAR_SRGB: [[f32; 3]; 3] = [
    [4.076_741_7, -3.307_711_6, 0.230_969_94],
    [-1.268_438, 2.609_757_4, -0.341_319_38],
    [-0.004_196_086_3, -0.703_418_6, 1.707_614_7],
];
/// The sRGB transfer function (IEC 61966-2-1): the linear segment below these, the power curve above.
const SRGB_LINEAR_LIMIT: f32 = 0.040_45;
const LINEAR_SRGB_LIMIT: f32 = 0.003_130_8;
const SRGB_LINEAR_SLOPE: f32 = 12.92;
const SRGB_OFFSET: f32 = 0.055;
const SRGB_GAMMA: f32 = 2.4;

fn apply(matrix: &[[f32; 3]; 3], [x, y, z]: [f32; 3]) -> [f32; 3] {
    matrix.map(|row| row[0] * x + row[1] * y + row[2] * z)
}

fn to_linear(channel: f32) -> f32 {
    if channel.abs() <= SRGB_LINEAR_LIMIT {
        channel / SRGB_LINEAR_SLOPE
    } else {
        channel.signum() * ((channel.abs() + SRGB_OFFSET) / (1.0 + SRGB_OFFSET)).powf(SRGB_GAMMA)
    }
}

fn from_linear(channel: f32) -> f32 {
    if channel.abs() <= LINEAR_SRGB_LIMIT {
        channel * SRGB_LINEAR_SLOPE
    } else {
        channel.signum() * ((1.0 + SRGB_OFFSET) * channel.abs().powf(1.0 / SRGB_GAMMA) - SRGB_OFFSET)
    }
}

pub(crate) fn srgb_to_oklab([r, g, b]: [f32; 3]) -> [f32; 3] {
    let lms = apply(&LINEAR_SRGB_TO_LMS, [r, g, b].map(to_linear));
    apply(&LMS_TO_OKLAB, lms.map(f32::cbrt))
}

pub(crate) fn oklab_to_srgb(lab: [f32; 3]) -> [f32; 3] {
    let lms = apply(&OKLAB_TO_LMS, lab).map(|value| value * value * value);
    apply(&LMS_TO_LINEAR_SRGB, lms).map(from_linear)
}

/// A colour in the space a gradient interpolates in, premultiplied.
fn into_space(color: Rgba, space: ColorSpace) -> Rgba {
    let [r, g, b, a] = color;
    let [x, y, z] = match space {
        ColorSpace::Srgb => [r, g, b],
        ColorSpace::Oklab => srgb_to_oklab([r, g, b]),
    };
    premultiply([x, y, z, a])
}

/// A premultiplied colour of `space` back as straight sRGB.
fn out_of_space(premultiplied: Rgba, space: ColorSpace) -> Rgba {
    let alpha = premultiplied[3];
    if alpha <= 0.0 {
        return [0.0, 0.0, 0.0, 0.0];
    }
    let straight = [
        premultiplied[0] / alpha,
        premultiplied[1] / alpha,
        premultiplied[2] / alpha,
    ];
    let [r, g, b] = match space {
        ColorSpace::Srgb => straight,
        ColorSpace::Oklab => oklab_to_srgb(straight),
    };
    [r, g, b, alpha]
}

/// The colour of the gradient at `t`, interpolated premultiplied in `space` between the stops, straight sRGB again.
fn color_at(stops: &[ResolvedStop], t: f32, space: ColorSpace) -> Rgba {
    let first = stops.first().expect("a gradient has stops");
    let last = stops.last().expect("a gradient has stops");
    let premultiplied = if t <= first.t {
        into_space(first.color, space)
    } else if t >= last.t {
        into_space(last.color, space)
    } else {
        // The last segment that starts at or before `t`, so a hard stop at `t` gives the colour after it.
        let index = stops
            .windows(2)
            .rposition(|pair| pair[0].t <= t && t < pair[1].t)
            .expect("t lies between the first and last stop");
        let (from, to) = (stops[index], stops[index + 1]);
        let span = to.t - from.t;
        let amount = if span > 0.0 { (t - from.t) / span } else { 1.0 };
        let (a, b) = (into_space(from.color, space), into_space(to.color, space));
        std::array::from_fn(|channel| a[channel] + (b[channel] - a[channel]) * amount)
    };
    out_of_space(premultiplied, space)
}

/// The ramp: `texels` RGBA8 texels, texel `i` holding the colour at `(i + 0.5) / texels` of the line. A fully
/// transparent texel takes the colour of the nearest visible one, so that the texture filter does not darken the edge
/// of a fade.
pub fn ramp(stops: &[ResolvedStop], texels: usize, space: ColorSpace) -> Vec<u8> {
    let colors: Vec<Rgba> = (0..texels)
        .map(|index| color_at(stops, (index as f32 + 0.5) / texels as f32, space))
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
            "linear-gradient(in hsl, #f00, #00f)",
            "linear-gradient(to right in oklch, #f00, #00f)",
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
        let bytes = ramp(&gradient.resolve(100.0), 64, ColorSpace::Srgb);
        // Halfway: the same red at half alpha (straight interpolation would have gone to a dark red).
        let middle = &bytes[32 * 4..32 * 4 + 4];
        assert_eq!(&middle[..3], &[255, 0, 0]);
        assert!((i32::from(middle[3]) - 127).abs() <= 3, "{}", middle[3]);
        // Between two opaque colours it is a plain blend.
        let gradient = parse("linear-gradient(90deg, #000000, #ffffff)");
        let bytes = ramp(&gradient.resolve(100.0), 64, ColorSpace::Srgb);
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
        let bytes = ramp(&gradient.resolve(100.0), 64, ColorSpace::Srgb);
        assert_eq!(&bytes[..4], &[255, 0, 0, 255]);
        assert_eq!(&bytes[31 * 4..31 * 4 + 4], &[255, 0, 0, 255]);
        assert_eq!(&bytes[32 * 4..32 * 4 + 4], &[0, 0, 255, 255]);
        assert_eq!(&bytes[63 * 4..63 * 4 + 4], &[0, 0, 255, 255]);
    }

    #[test]
    fn a_fully_transparent_run_borrows_the_colour_of_the_visible_texels() {
        let gradient = parse("linear-gradient(90deg, transparent 50%, #00ff00)");
        let bytes = ramp(&gradient.resolve(100.0), 64, ColorSpace::Srgb);
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
        let gradient = parts.to_linear().expect("a gradient");
        assert_eq!(gradient.direction, Direction::Angle(90.0));
        assert_eq!(gradient.stops.len(), 2);
        close(gradient.stops[1].color[3], 0.0);
        close(gradient.stops[1].color[0], gradient.stops[0].color[0]);
        // via makes the end fade from the via colour; to names it.
        parts.via = Some("#ef4444".into());
        let gradient = parts.to_linear().expect("a gradient");
        assert_eq!(gradient.stops.len(), 3);
        close(gradient.stops[2].color[3], 0.0);
        close(gradient.stops[2].color[0], gradient.stops[1].color[0]);
        parts.to = Some("#10b981".into());
        parts.via_position = Some(30.0);
        parts.to_position = Some(90.0);
        let gradient = parts.to_linear().expect("a gradient");
        assert_eq!(gradient.stops[1].position, Some(Position::Fraction(0.3)));
        assert_eq!(gradient.stops[2].position, Some(Position::Fraction(0.9)));
        close(gradient.stops[2].color[3], 1.0);
        // No from: Tailwind's value is invalid, and nothing is drawn.
        let mut no_from = parts.clone();
        no_from.from = None;
        assert!(no_from.to_linear().is_none());
        let mut no_direction = parts.clone();
        no_direction.direction = None;
        assert!(no_direction.to_linear().is_none());
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

    fn conic(css: &str) -> ConicGradient {
        ConicGradient::parse(css).unwrap_or_else(|error| panic!("{css}: {error}"))
    }

    #[test]
    fn conic_gradients_parse_from_at_in_and_angular_stops() {
        let plain = conic("conic-gradient(#f00, #00f)");
        assert_eq!(plain.from_degrees, 0.0);
        assert_eq!(plain.at, [Coordinate::Fraction(0.5); 2]);
        assert_eq!(plain.space, ColorSpace::Srgb);
        let full = conic("conic-gradient(from 90deg at 25% 10px in oklab, #f00 0deg, #0f0 25%, #00f 0.75turn 1turn)");
        assert_eq!(full.from_degrees, 90.0);
        assert_eq!(full.at, [Coordinate::Fraction(0.25), Coordinate::Pixels(10.0)]);
        assert_eq!(full.space, ColorSpace::Oklab);
        let positions: Vec<Option<f32>> = full.stops.iter().map(|stop| stop.position).collect();
        assert_eq!(positions, vec![Some(0.0), Some(0.25), Some(0.75), Some(1.0)]);
        // Any order of the prelude, keyword positions in either order.
        let keywords = conic("conic-gradient(in srgb at top left from 0.5turn, #f00, #00f)");
        assert_eq!(keywords.from_degrees, 180.0);
        assert_eq!(keywords.at, [Coordinate::Fraction(0.0), Coordinate::Fraction(0.0)]);
        assert_eq!(conic("conic-gradient(at bottom, #f00, #00f)").at, [Coordinate::Fraction(0.5), Coordinate::Fraction(1.0)]);
        for bad in [
            "conic-gradient(#f00)",
            "conic-gradient(from 10px, #f00, #00f)",
            "conic-gradient(from 1deg from 2deg, #f00, #00f)",
            "conic-gradient(at 1 2 3, #f00, #00f)",
            "conic-gradient(in hsl, #f00, #00f)",
            "conic-gradient(#f00 10px, #00f)",
            "repeating-conic-gradient(#f00, #00f)",
        ] {
            assert!(Gradient::parse(bad).is_err(), "{bad}");
        }
        assert_eq!(conic(&full.to_css()), full, "{}", full.to_css());
        assert_eq!(
            BackgroundImage::parse("conic-gradient(#f00, #00f)").expect("conic"),
            BackgroundImage::Gradient(Gradient::Conic(plain))
        );
    }

    #[test]
    fn linear_gradients_take_an_interpolation_method() {
        assert_eq!(parse("linear-gradient(in oklab, #f00, #00f)").space, ColorSpace::Oklab);
        let both = parse("linear-gradient(to right in oklab, #f00, #00f)");
        assert_eq!((both.direction, both.space), (Direction::Angle(90.0), ColorSpace::Oklab));
        let before = parse("linear-gradient(in oklab 45deg, #f00, #00f)");
        assert_eq!((before.direction, before.space), (Direction::Angle(45.0), ColorSpace::Oklab));
        assert_eq!(parse(&both.to_css()), both);
    }

    #[test]
    fn oklab_round_trips_and_interpolates_as_css_color_4_does() {
        for color in [[1.0, 0.0, 0.0], [0.2, 0.5, 0.9], [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]] {
            let back = oklab_to_srgb(srgb_to_oklab(color));
            for (a, b) in color.iter().zip(back) {
                assert!((a - b).abs() < 1e-4, "{color:?} -> {back:?}");
            }
        }
        // White is L 1, a 0, b 0; red is (0.628, 0.225, 0.126) (CSS Color 4's own example values).
        let white = srgb_to_oklab([1.0, 1.0, 1.0]);
        assert!((white[0] - 1.0).abs() < 1e-3 && white[1].abs() < 1e-3 && white[2].abs() < 1e-3);
        let red = srgb_to_oklab([1.0, 0.0, 0.0]);
        assert!((red[0] - 0.628).abs() < 2e-3 && (red[1] - 0.2249).abs() < 2e-3 && (red[2] - 0.1258).abs() < 2e-3, "{red:?}");
        // Halfway from red to blue in Oklab is Chrome's #8c53a3... about (140, 83, 163); in sRGB it is (128, 0, 128).
        let stops = parse("linear-gradient(90deg, #ff0000, #0000ff)").resolve(100.0);
        let srgb = ramp(&stops, 2, ColorSpace::Srgb);
        let oklab = ramp(&stops, 2, ColorSpace::Oklab);
        assert!(oklab[4] > srgb[4] && oklab[5] > srgb[5], "{oklab:?} {srgb:?}");
        let middle = color_at(&stops, 0.5, ColorSpace::Oklab);
        let bytes = middle.map(|channel| (channel * CHANNEL_MAX).round() as i32);
        assert!((bytes[0] - 140).abs() <= 2 && (bytes[1] - 83).abs() <= 2 && (bytes[2] - 163).abs() <= 2, "{bytes:?}");
    }

    #[test]
    fn tailwind_v4_conic_utilities_make_its_gradient() {
        let parts = GradientParts {
            conic: Some(ConicPart { from_degrees: 90.0, space: ColorSpace::Oklab }),
            from: Some("#ff0000".into()),
            ..GradientParts::default()
        };
        let Some(Gradient::Conic(gradient)) = parts.to_gradient() else {
            panic!("a conic gradient");
        };
        assert_eq!(gradient.from_degrees, 90.0);
        assert_eq!(gradient.space, ColorSpace::Oklab);
        // v4: an unset stop is #0000 and the positions are 0% and 100%.
        assert_eq!(gradient.stops.len(), 2);
        assert_eq!(gradient.stops[1].color, [0.0, 0.0, 0.0, 0.0]);
        assert_eq!(gradient.stops[0].position, Some(0.0));
        assert_eq!(gradient.stops[1].position, Some(1.0));
        let mut with_via = parts.clone();
        with_via.via = Some("#00ff00".into());
        let Some(Gradient::Conic(gradient)) = with_via.to_gradient() else {
            panic!("a conic gradient");
        };
        assert_eq!(gradient.stops[1].position, Some(0.5));
        // No colour at all is no image.
        let bare = GradientParts { conic: parts.conic, ..GradientParts::default() };
        assert!(bare.to_gradient().is_none());
        // bg-gradient-to-r after bg-conic is linear again, and the other way round.
        let mut merged = parts.clone();
        merged.merge(&GradientParts { direction: Some(PartDirection::ToR), ..GradientParts::default() });
        assert!(matches!(merged.to_gradient(), Some(Gradient::Linear(_))));
        merged.merge(&GradientParts { conic: parts.conic, ..GradientParts::default() });
        assert!(matches!(merged.to_gradient(), Some(Gradient::Conic(_))));
    }
}
