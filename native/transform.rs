//! CSS transforms: the `transform` and `transform-origin` properties, evaluated to the 2D affine map the
//! canvas draws with.
//!
//! Stylo owns the CSS: it parses `transform`, `transform-origin` and `calc()`, resolves units and
//! interpolates transform lists, so none of that is written again here. A value is parsed once into
//! Stylo's computed type ([`TransformList`], [`TransformOriginSpec`]); the matrix is evaluated against
//! the element's border box whenever that box or the value changes, never per frame for an element that
//! does not animate. An element without a transform costs a `None`.
//!
//! The matrix is 4 x 4 (Stylo's `Matrix3D`, row vectors, `m41` is the x translation) so that a
//! perspective projection can be added without redoing any of this. Today the canvas has no W
//! (`gl_Position = screen_transform * vec4(vertex, 0.0, 1.0)` and an item's transform is a
//! `Transform2D`), so a matrix is drawn as its x, y and offset terms with z dropped, which is what
//! `transform-style: flat` and an orthographic `rotateX(..)` or `rotateY(..)` look like in a browser.
//! A `perspective()` function, or a `matrix3d()` with a projective row, is refused when the style is
//! validated, with a message that says so; it is never flattened silently.

use std::cell::RefCell;
use std::collections::HashMap;
use std::fmt::Write as _;

use blitz_dom::{BaseDocument, DocumentConfig, NodeId, StyleThreading, qual_name};
use euclid::default::{Point2D, Rect, Size2D, Transform3D};
use godot::prelude::Vector2;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use style::values::animated::{Animate, Procedure};
use style::values::computed::Length;
use style::values::computed::transform::{
    Matrix3D, Transform as ComputedTransform, TransformOperation, TransformOrigin as ComputedOrigin,
};
use style::values::generics::transform::ToMatrix;

use crate::geometry::BoxRect;
use crate::props::StyleSpec;

/// The message for every refusal of a projective transform. Perspective needs a render target per
/// element, which a separate piece of work measures; until it lands the style is refused, not drawn flat.
pub const PERSPECTIVE_UNSUPPORTED: &str = "perspective is not implemented yet: perspective() and a matrix3d() with a projective row are refused (rotateX(), rotateY() and translateZ() without perspective are drawn orthographically)";

/// A 2D matrix whose determinant is below this in magnitude has no inverse worth taking: the element is
/// edge on or collapsed (`rotateY(90deg)` leaves 6e-17 in float, `scale(0)` leaves 0). Nothing is drawn
/// and nothing is hit, as in a browser.
const SINGULAR_DETERMINANT: f32 = 1e-9;
/// How many parsed values the per-thread cache keeps before it starts again.
const PARSE_CACHE_LIMIT: usize = 512;
/// Distinguishes "the value was refused" from "the value computed to the previous one": the sentinel is
/// written first, and a refused value leaves it in place.
const TRANSFORM_SENTINEL: &str = "rotate(0.123456deg)";
const ORIGIN_SENTINEL: &str = "0.123456px 0.654321px";
/// The initial `transform-origin`: the middle of the border box.
pub const DEFAULT_ORIGIN: &str = "50% 50%";
/// Length units a transform may use. `em`, `ex`, `ch`, `lh` and the viewport units would resolve against the
/// parser's scratch element, not the real one, so they are refused instead of being quietly wrong. `rem` is
/// the root's 16 px, as in Tailwind.
const ALLOWED_UNITS: [&str; 14] = [
    "px", "rem", "%", "cm", "mm", "q", "in", "pt", "pc", "deg", "grad", "rad", "turn", "s",
];
/// The transform functions this library draws (CSS Transforms 1 and 2 without `perspective()`).
const FUNCTIONS: [&str; 20] = [
    "translate",
    "translatex",
    "translatey",
    "translatez",
    "translate3d",
    "rotate",
    "rotatex",
    "rotatey",
    "rotatez",
    "rotate3d",
    "scale",
    "scalex",
    "scaley",
    "scalez",
    "scale3d",
    "skew",
    "skewx",
    "skewy",
    "matrix",
    "matrix3d",
];

// ---------------------------------------------------------------------------------------------
// 2D affine maps
// ---------------------------------------------------------------------------------------------

/// The linear part of a 2D affine map: `(x, y)` goes to `(a x + c y, b x + d y)`, CSS `matrix(a, b, c, d, ..)`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Linear2 {
    pub a: f32,
    pub b: f32,
    pub c: f32,
    pub d: f32,
}

impl Linear2 {
    pub(crate) const IDENTITY: Linear2 = Linear2 {
        a: 1.0,
        b: 0.0,
        c: 0.0,
        d: 1.0,
    };

    pub(crate) fn determinant(&self) -> f32 {
        self.a * self.d - self.b * self.c
    }

    pub(crate) fn apply(&self, v: Vector2) -> Vector2 {
        Vector2::new(self.a * v.x + self.c * v.y, self.b * v.x + self.d * v.y)
    }

    pub(crate) fn inverse(&self) -> Option<Linear2> {
        let det = self.determinant();
        if !det.is_finite() || det.abs() < SINGULAR_DETERMINANT {
            return None;
        }
        Some(Linear2 {
            a: self.d / det,
            b: -self.b / det,
            c: -self.c / det,
            d: self.a / det,
        })
    }

    /// The larger of the lengths the unit x and y vectors are stretched to: the factor glyphs must be
    /// rasterised at to stay sharp under this map.
    pub(crate) fn scale_factor(&self) -> f32 {
        self.a.hypot(self.b).max(self.c.hypot(self.d))
    }

    /// The map that applies `self` first, then `next`.
    pub(crate) fn then(&self, next: &Linear2) -> Linear2 {
        Linear2 {
            a: next.a * self.a + next.c * self.b,
            b: next.b * self.a + next.d * self.b,
            c: next.a * self.c + next.c * self.d,
            d: next.b * self.c + next.d * self.d,
        }
    }
}

/// A 2D affine map: [`Linear2`] and a translation `(e, f)`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Affine2 {
    pub linear: Linear2,
    pub e: f32,
    pub f: f32,
}

impl Affine2 {
    pub(crate) const IDENTITY: Affine2 = Affine2 {
        linear: Linear2::IDENTITY,
        e: 0.0,
        f: 0.0,
    };

    pub(crate) fn translation(by: Vector2) -> Affine2 {
        Affine2 {
            linear: Linear2::IDENTITY,
            e: by.x,
            f: by.y,
        }
    }

    pub(crate) fn apply(&self, point: Vector2) -> Vector2 {
        let moved = self.linear.apply(point);
        Vector2::new(moved.x + self.e, moved.y + self.f)
    }

    /// The map that applies `self` first, then `next`.
    pub(crate) fn then(&self, next: &Affine2) -> Affine2 {
        let moved = next.apply(Vector2::new(self.e, self.f));
        Affine2 {
            linear: self.linear.then(&next.linear),
            e: moved.x,
            f: moved.y,
        }
    }

    pub(crate) fn inverse(&self) -> Option<Affine2> {
        let linear = self.linear.inverse()?;
        let moved = linear.apply(Vector2::new(self.e, self.f));
        Some(Affine2 {
            linear,
            e: -moved.x,
            f: -moved.y,
        })
    }

    pub(crate) fn is_identity(&self) -> bool {
        *self == Affine2::IDENTITY
    }

    /// Whether the map only moves things: no rotation, scale or skew.
    pub(crate) fn is_translation(&self) -> bool {
        self.linear == Linear2::IDENTITY
    }

    /// The axis-aligned bounding box of `rect` under this map: what `getBoundingClientRect()` reports.
    pub(crate) fn bounds_of(&self, rect: BoxRect) -> BoxRect {
        // A translation moves the box and keeps its size exactly.
        if self.linear == Linear2::IDENTITY {
            return BoxRect {
                x: rect.x + self.e,
                y: rect.y + self.f,
                ..rect
            };
        }
        let corners = [
            Vector2::new(rect.x, rect.y),
            Vector2::new(rect.x + rect.width, rect.y),
            Vector2::new(rect.x, rect.y + rect.height),
            Vector2::new(rect.x + rect.width, rect.y + rect.height),
        ]
        .map(|corner| self.apply(corner));
        let (mut min, mut max) = (corners[0], corners[0]);
        for corner in &corners[1..] {
            min = Vector2::new(min.x.min(corner.x), min.y.min(corner.y));
            max = Vector2::new(max.x.max(corner.x), max.y.max(corner.y));
        }
        BoxRect {
            x: min.x,
            y: min.y,
            width: max.x - min.x,
            height: max.y - min.y,
        }
    }

    /// The six numbers of CSS `matrix(a, b, c, d, e, f)`.
    pub(crate) fn to_array(self) -> [f32; 6] {
        [
            self.linear.a,
            self.linear.b,
            self.linear.c,
            self.linear.d,
            self.e,
            self.f,
        ]
    }

    /// Godot's `Transform2D`: columns x and y of the basis, then the origin.
    pub(crate) fn to_godot(self) -> godot::prelude::Transform2D {
        godot::prelude::Transform2D::from_cols(
            Vector2::new(self.linear.a, self.linear.b),
            Vector2::new(self.linear.c, self.linear.d),
            Vector2::new(self.e, self.f),
        )
    }
}

// ---------------------------------------------------------------------------------------------
// Parsing through Stylo
// ---------------------------------------------------------------------------------------------

/// A throwaway Stylo document with one element: a value is written to the element and read back
/// computed, which is how Stylo parses, resolves units and `calc()`, and validates. It is the same engine
/// the transitions run in, so a value means one thing in both.
struct Scratch {
    document: BaseDocument,
    node: NodeId,
}

impl Scratch {
    fn new() -> Self {
        let config = DocumentConfig {
            ua_stylesheets: Vec::new(),
            style_threading: StyleThreading::Sequential,
            ..DocumentConfig::default()
        };
        let mut document = BaseDocument::new(config);
        let root = document.root_node().id;
        let node;
        {
            let mut mutator = document.mutate();
            let html = mutator.create_element(qual_name!("html", html), Vec::new());
            mutator.append_children(root, &[html]);
            node = mutator.create_element(qual_name!("div", html), Vec::new());
            mutator.append_children(html, &[node]);
        }
        Scratch { document, node }
    }

    /// Write `sentinel`, then `value`, and read the computed result with `read`. `None` if Stylo refused
    /// `value` (the sentinel is still in place and `read` of it equals `sentinel_read`).
    fn compute<T: PartialEq>(
        &mut self,
        property: &str,
        sentinel: &str,
        value: &str,
        read: impl Fn(&style::properties::ComputedValues) -> T,
    ) -> Option<T> {
        {
            let mut mutator = self.document.mutate();
            mutator.set_style_property(self.node, property, sentinel);
        }
        self.document.resolve_stylist(0.0);
        let sentinel_read = self.read(&read)?;
        {
            let mut mutator = self.document.mutate();
            mutator.set_style_property(self.node, property, value);
        }
        self.document.resolve_stylist(0.0);
        let computed = self.read(&read)?;
        (computed != sentinel_read || value.trim() == sentinel).then_some(computed)
    }

    fn read<T>(&self, read: impl Fn(&style::properties::ComputedValues) -> T) -> Option<T> {
        let node = self.document.get_node(self.node)?;
        let styles = node.primary_styles()?;
        Some(read(&**styles))
    }
}

thread_local! {
    static SCRATCH: RefCell<Option<Scratch>> = const { RefCell::new(None) };
    static TRANSFORM_CACHE: RefCell<HashMap<String, Result<ComputedTransform, String>>> =
        RefCell::new(HashMap::new());
    static ORIGIN_CACHE: RefCell<HashMap<String, Result<ComputedOrigin, String>>> =
        RefCell::new(HashMap::new());
}

fn with_scratch<R>(use_scratch: impl FnOnce(&mut Scratch) -> R) -> R {
    SCRATCH.with(|cell| {
        let mut slot = cell.borrow_mut();
        use_scratch(slot.get_or_insert_with(Scratch::new))
    })
}

/// Stylo's computed `transform` for `css`, or why it is refused.
fn compute_transform(css: &str) -> Result<ComputedTransform, String> {
    if let Some(cached) = TRANSFORM_CACHE.with(|cache| cache.borrow().get(css).cloned()) {
        return cached;
    }
    let result = scan_transform(css).and_then(|()| {
        with_scratch(|scratch| {
            scratch.compute("transform", TRANSFORM_SENTINEL, css, |style| {
                style.get_box().transform.clone()
            })
        })
        .ok_or_else(|| format!("transform: cannot parse {css:?} as a CSS transform"))
        .and_then(|transform| {
            refuse_projective(&transform)?;
            Ok(transform)
        })
    });
    TRANSFORM_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        if cache.len() >= PARSE_CACHE_LIMIT {
            cache.clear();
        }
        cache.insert(css.to_string(), result.clone());
    });
    result
}

fn compute_origin(css: &str) -> Result<ComputedOrigin, String> {
    if let Some(cached) = ORIGIN_CACHE.with(|cache| cache.borrow().get(css).cloned()) {
        return cached;
    }
    let result = scan_units(css).and_then(|()| {
        with_scratch(|scratch| {
            scratch.compute("transform-origin", ORIGIN_SENTINEL, css, |style| {
                style.get_box().transform_origin.clone()
            })
        })
        .ok_or_else(|| format!("transformOrigin: cannot parse {css:?} as a CSS transform-origin"))
    });
    ORIGIN_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        if cache.len() >= PARSE_CACHE_LIMIT {
            cache.clear();
        }
        cache.insert(css.to_string(), result.clone());
    });
    result
}

/// The checks that give a clearer message than Stylo's refusal: unknown and projective functions, then units.
fn scan_transform(css: &str) -> Result<(), String> {
    let mut depth = 0;
    let mut word = String::new();
    for character in css.chars() {
        match character {
            '(' => {
                if depth == 0 {
                    let name = word.to_ascii_lowercase();
                    if name == "perspective" {
                        return Err(format!("transform: {PERSPECTIVE_UNSUPPORTED}"));
                    }
                    if !FUNCTIONS.contains(&name.as_str()) {
                        return Err(format!(
                            "transform: {word}() is not a transform function this library draws"
                        ));
                    }
                }
                depth += 1;
                word.clear();
            }
            ')' => {
                depth -= 1;
                word.clear();
            }
            character if character.is_ascii_alphanumeric() || character == '-' => {
                if depth == 0 {
                    word.push(character);
                }
            }
            _ => word.clear(),
        }
    }
    scan_units(css)
}

/// Refuse a unit that would resolve against the wrong element.
fn scan_units(css: &str) -> Result<(), String> {
    let bytes = css.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if !bytes[index].is_ascii_digit() && !(bytes[index] == b'.' && next_is_digit(bytes, index))
        {
            // Identifiers (function names, keywords) are skipped whole, so `translate3d` is not a number.
            if bytes[index].is_ascii_alphabetic() {
                while index < bytes.len()
                    && (bytes[index].is_ascii_alphanumeric() || bytes[index] == b'-')
                {
                    index += 1;
                }
            } else {
                index += 1;
            }
            continue;
        }
        while index < bytes.len() && (bytes[index].is_ascii_digit() || bytes[index] == b'.') {
            index += 1;
        }
        // An exponent: `e` or `E`, an optional sign and digits.
        if index < bytes.len() && matches!(bytes[index], b'e' | b'E') {
            let mut probe = index + 1;
            if probe < bytes.len() && matches!(bytes[probe], b'+' | b'-') {
                probe += 1;
            }
            if probe < bytes.len() && bytes[probe].is_ascii_digit() {
                index = probe;
                while index < bytes.len() && bytes[index].is_ascii_digit() {
                    index += 1;
                }
            }
        }
        let start = index;
        if index < bytes.len() && bytes[index] == b'%' {
            index += 1;
        } else {
            while index < bytes.len() && bytes[index].is_ascii_alphabetic() {
                index += 1;
            }
        }
        let unit = css[start..index].to_ascii_lowercase();
        if !unit.is_empty() && !ALLOWED_UNITS.contains(&unit.as_str()) {
            return Err(format!(
                "{css:?}: the unit {unit:?} is not supported in a transform (use px, rem, % or an absolute length; em and viewport units would not resolve against this element)"
            ));
        }
    }
    Ok(())
}

fn next_is_digit(bytes: &[u8], index: usize) -> bool {
    bytes.get(index + 1).is_some_and(u8::is_ascii_digit)
}

/// Refuse what the canvas cannot draw: `perspective()` and a `matrix3d()` that projects.
fn refuse_projective(transform: &ComputedTransform) -> Result<(), String> {
    for operation in transform.0.iter() {
        match operation {
            TransformOperation::Perspective(_) => {
                return Err(format!("transform: {PERSPECTIVE_UNSUPPORTED}"));
            }
            TransformOperation::Matrix3D(matrix) if is_projective(matrix) => {
                return Err(format!("transform: {PERSPECTIVE_UNSUPPORTED}"));
            }
            _ => {}
        }
    }
    Ok(())
}

/// Whether a matrix has a perspective row: `m14`, `m24`, `m34` not zero or `m44` not one.
fn is_projective(matrix: &Matrix3D) -> bool {
    matrix.m14 != 0.0 || matrix.m24 != 0.0 || matrix.m34 != 0.0 || matrix.m44 != 1.0
}

// ---------------------------------------------------------------------------------------------
// The values a style holds
// ---------------------------------------------------------------------------------------------

/// Stylo's computed `transform` list, which the style engine samples and [`evaluate`] reads.
pub(crate) type ComputedTransformValue = ComputedTransform;

/// A `transform` value: the CSS text on the wire, parsed once into Stylo's computed list.
#[derive(Clone, Debug)]
pub struct TransformList {
    css: String,
    computed: ComputedTransform,
}

impl PartialEq for TransformList {
    fn eq(&self, other: &Self) -> bool {
        self.css == other.css
    }
}

impl Default for TransformList {
    fn default() -> Self {
        TransformList::none()
    }
}

impl TransformList {
    pub fn none() -> Self {
        TransformList {
            css: "none".into(),
            computed: ComputedTransform::none(),
        }
    }

    /// Parse CSS `transform` syntax. Refuses perspective and units that would resolve against another
    /// element, with a message saying so.
    pub fn parse(css: &str) -> Result<TransformList, String> {
        let css = css.trim();
        if css.eq_ignore_ascii_case("none") {
            return Ok(TransformList::none());
        }
        Ok(TransformList {
            css: css.to_string(),
            computed: compute_transform(css)?,
        })
    }

    pub fn is_none(&self) -> bool {
        self.computed.0.is_empty()
    }

    pub fn css(&self) -> &str {
        &self.css
    }

    pub(crate) fn computed(&self) -> &ComputedTransform {
        &self.computed
    }
}

impl<'de> Deserialize<'de> for TransformList {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        TransformList::parse(&text).map_err(serde::de::Error::custom)
    }
}

impl Serialize for TransformList {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.css)
    }
}

/// A `transform-origin` value, parsed the same way.
#[derive(Clone, Debug)]
pub struct TransformOriginSpec {
    css: String,
    computed: ComputedOrigin,
}

impl PartialEq for TransformOriginSpec {
    fn eq(&self, other: &Self) -> bool {
        self.css == other.css
    }
}

impl Default for TransformOriginSpec {
    fn default() -> Self {
        TransformOriginSpec::parse(DEFAULT_ORIGIN).expect("the initial transform-origin parses")
    }
}

impl TransformOriginSpec {
    pub fn parse(css: &str) -> Result<TransformOriginSpec, String> {
        let css = css.trim();
        Ok(TransformOriginSpec {
            css: css.to_string(),
            computed: compute_origin(css)?,
        })
    }

    pub fn css(&self) -> &str {
        &self.css
    }

    /// The origin in pixels from the border box's top-left corner, with the z offset.
    fn resolve(&self, size: Vector2) -> (f64, f64, f64) {
        (
            f64::from(self.computed.horizontal.resolve(Length::new(size.x)).px()),
            f64::from(self.computed.vertical.resolve(Length::new(size.y)).px()),
            f64::from(self.computed.depth.px()),
        )
    }
}

/// The middle of the box: the origin of an element nothing gave one.
fn middle_origin(size: Vector2) -> (f64, f64, f64) {
    (f64::from(size.x) / 2.0, f64::from(size.y) / 2.0, 0.0)
}

impl<'de> Deserialize<'de> for TransformOriginSpec {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        TransformOriginSpec::parse(&text).map_err(serde::de::Error::custom)
    }
}

impl Serialize for TransformOriginSpec {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.css)
    }
}

/// The values Tailwind's separate transform utilities set (`-translate-x-1/2`, `hover:scale-105`, `rotate-45`,
/// `skew-y-6`, `transform-gpu`). Each merges on its own across layers, so `-translate-x-1/2 hover:scale-105`
/// keeps the translate on hover, where an inline `transform` replaces the whole list. The composed list is
/// Tailwind's: translate, rotate, skewX, skewY, scaleX, scaleY, each at its default when no utility set it.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TransformParts {
    /// A CSS length or percentage (`16px`, `-50%`).
    pub translate_x: Option<String>,
    pub translate_y: Option<String>,
    /// A CSS angle (`45deg`).
    pub rotate: Option<String>,
    pub skew_x: Option<String>,
    pub skew_y: Option<String>,
    pub scale_x: Option<f32>,
    pub scale_y: Option<f32>,
    /// `transform-gpu` composes `translate3d(x, y, 0)` for the first function (the picture is the same).
    pub gpu: Option<bool>,
}

impl TransformParts {
    /// Overwrite the values `other` sets.
    pub fn merge(&mut self, other: &TransformParts) {
        macro_rules! overwrite {
            ($($field:ident),+ $(,)?) => {{
                let TransformParts { $($field),+ } = other;
                $(
                    if $field.is_some() {
                        self.$field = $field.clone();
                    }
                )+
            }};
        }
        overwrite!(
            translate_x,
            translate_y,
            rotate,
            skew_x,
            skew_y,
            scale_x,
            scale_y,
            gpu,
        );
    }

    /// The list in Tailwind's fixed order, as CSS text.
    pub fn to_css(&self) -> String {
        let translate_x = self.translate_x.as_deref().unwrap_or("0px");
        let translate_y = self.translate_y.as_deref().unwrap_or("0px");
        let rotate = self.rotate.as_deref().unwrap_or("0deg");
        let skew_x = self.skew_x.as_deref().unwrap_or("0deg");
        let skew_y = self.skew_y.as_deref().unwrap_or("0deg");
        let mut css = String::new();
        if self.gpu == Some(true) {
            let _ = write!(css, "translate3d({translate_x}, {translate_y}, 0px)");
        } else {
            let _ = write!(css, "translate({translate_x}, {translate_y})");
        }
        let _ = write!(
            css,
            " rotate({rotate}) skewX({skew_x}) skewY({skew_y}) scaleX({}) scaleY({})",
            self.scale_x.unwrap_or(1.0),
            self.scale_y.unwrap_or(1.0)
        );
        css
    }

    pub fn to_list(&self) -> Result<TransformList, String> {
        TransformList::parse(&self.to_css())
    }
}

impl StyleSpec {
    /// Whether the style sets a transform at all: the check that lets an element without one skip all
    /// transform work.
    pub fn has_transform(&self) -> bool {
        self.transform.is_some() || self.transform_parts.is_some()
    }

    /// The `transform` this style resolves to: an explicit one, or the utilities' composed list.
    pub fn transform_list(&self) -> TransformList {
        match (&self.transform, &self.transform_parts) {
            (Some(list), _) => list.clone(),
            (None, Some(parts)) => parts
                .to_list()
                .expect("transform parts are validated with the style"),
            (None, None) => TransformList::none(),
        }
    }

    /// The `transform-origin` this style resolves to.
    pub fn transform_origin_spec(&self) -> TransformOriginSpec {
        self.transform_origin.clone().unwrap_or_default()
    }
}

// ---------------------------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------------------------

/// Where an element's local frame (the border box corner at the origin) sits relative to its location:
/// a point `p` of the element is drawn at `location + affine(p)`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Placement {
    pub affine: Affine2,
    /// `None` when the matrix is singular: the element is not drawn and nothing hits it.
    pub inverse: Option<Affine2>,
}

/// A transform evaluated for one border box: the full matrix, origin included, and what the canvas draws.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct NodeTransform {
    /// The 4 x 4 matrix about the origin, as CSS defines it. The canvas uses [`Self::placement`]; a
    /// perspective pass would use this.
    #[allow(dead_code)]
    pub matrix: Matrix3D,
    pub placement: Placement,
}

fn cast(value: f64) -> f32 {
    value.clamp(f64::from(f32::MIN), f64::from(f32::MAX)) as f32
}

fn to_f32(matrix: &Transform3D<f64>) -> Matrix3D {
    Matrix3D {
        m11: cast(matrix.m11),
        m12: cast(matrix.m12),
        m13: cast(matrix.m13),
        m14: cast(matrix.m14),
        m21: cast(matrix.m21),
        m22: cast(matrix.m22),
        m23: cast(matrix.m23),
        m24: cast(matrix.m24),
        m31: cast(matrix.m31),
        m32: cast(matrix.m32),
        m33: cast(matrix.m33),
        m34: cast(matrix.m34),
        m41: cast(matrix.m41),
        m42: cast(matrix.m42),
        m43: cast(matrix.m43),
        m44: cast(matrix.m44),
    }
}

fn to_f64(matrix: &Matrix3D) -> Transform3D<f64> {
    Transform3D::new(
        f64::from(matrix.m11),
        f64::from(matrix.m12),
        f64::from(matrix.m13),
        f64::from(matrix.m14),
        f64::from(matrix.m21),
        f64::from(matrix.m22),
        f64::from(matrix.m23),
        f64::from(matrix.m24),
        f64::from(matrix.m31),
        f64::from(matrix.m32),
        f64::from(matrix.m33),
        f64::from(matrix.m34),
        f64::from(matrix.m41),
        f64::from(matrix.m42),
        f64::from(matrix.m43),
        f64::from(matrix.m44),
    )
}

/// The matrix of a list of operations against `reference`, applying the last function first (CSS).
fn list_matrix(
    operations: &[TransformOperation],
    reference: &Rect<Length>,
) -> Result<Transform3D<f64>, String> {
    let mut transform = Transform3D::<f64>::identity();
    for operation in operations {
        transform = operation_matrix(operation, reference)?.then(&transform);
    }
    Ok(transform)
}

/// One operation's matrix. Stylo hands a transition between lists it cannot match function by function
/// (`rotate(45deg)` to `translateX(10%)`) as `InterpolateMatrix`, which needs the box to resolve: both
/// lists are evaluated, and Stylo's own matrix interpolation (decomposition) mixes them. Where the
/// matrices cannot be decomposed the result is discrete, the first until halfway (CSS Transforms 1).
fn operation_matrix(
    operation: &TransformOperation,
    reference: &Rect<Length>,
) -> Result<Transform3D<f64>, String> {
    match operation {
        TransformOperation::InterpolateMatrix {
            from_list,
            to_list,
            progress,
        } => {
            let from = to_f32(&list_matrix(&from_list.0, reference)?);
            let to = to_f32(&list_matrix(&to_list.0, reference)?);
            let mixed = from.animate(
                &to,
                Procedure::Interpolate {
                    progress: f64::from(progress.0),
                },
            );
            Ok(to_f64(&mixed.unwrap_or(if progress.0 < 0.5 {
                from
            } else {
                to
            })))
        }
        TransformOperation::AccumulateMatrix {
            from_list,
            to_list,
            count,
        } => {
            let from = to_f32(&list_matrix(&from_list.0, reference)?);
            let to = to_f32(&list_matrix(&to_list.0, reference)?);
            let mixed = from.animate(
                &to,
                Procedure::Accumulate {
                    count: u64::try_from(*count).unwrap_or(0),
                },
            );
            Ok(to_f64(&mixed.unwrap_or(to)))
        }
        other => other
            .to_3d_matrix(Some(reference))
            .map_err(|()| "a transform function has a value that needs layout to resolve".into()),
    }
}

/// The matrix of `transform` about `origin` for a border box of `size`, and what the canvas draws of it.
pub(crate) fn evaluate(
    transform: &ComputedTransform,
    origin: Option<&TransformOriginSpec>,
    size: Vector2,
) -> Result<NodeTransform, String> {
    let reference = Rect::new(
        Point2D::new(Length::new(0.0), Length::new(0.0)),
        Size2D::new(Length::new(size.x), Length::new(size.y)),
    );
    let matrix = list_matrix(&transform.0, &reference)?;
    let (x, y, z) = origin.map_or_else(|| middle_origin(size), |origin| origin.resolve(size));
    // Move the origin to the zero point, apply the matrix, move it back.
    let about = Transform3D::translation(-x, -y, -z)
        .then(&matrix)
        .then(&Transform3D::translation(x, y, z));
    let matrix = to_f32(&about);
    if is_projective(&matrix) {
        return Err(format!("transform: {PERSPECTIVE_UNSUPPORTED}"));
    }
    let affine = Affine2 {
        linear: Linear2 {
            a: matrix.m11,
            b: matrix.m12,
            c: matrix.m21,
            d: matrix.m22,
        },
        e: matrix.m41,
        f: matrix.m42,
    };
    if ![
        affine.linear.a,
        affine.linear.b,
        affine.linear.c,
        affine.linear.d,
        affine.e,
        affine.f,
    ]
    .iter()
    .all(|value| value.is_finite())
    {
        return Err("transform: the matrix has a value that is not finite".into());
    }
    Ok(NodeTransform {
        matrix,
        placement: Placement {
            affine,
            inverse: affine.inverse(),
        },
    })
}

impl NodeTransform {
    /// Identity transforms are not kept: an element whose matrix does nothing is an element without one.
    pub(crate) fn is_identity(&self) -> bool {
        self.placement.affine.is_identity()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CLOSE: f32 = 1e-4;

    fn near(actual: f32, expected: f32) {
        assert!(
            (actual - expected).abs() <= CLOSE,
            "expected {expected}, got {actual}"
        );
    }

    fn near_point(actual: Vector2, expected: (f32, f32)) {
        near(actual.x, expected.0);
        near(actual.y, expected.1);
    }

    /// The affine map of `css` about `origin` for a box of `width` x `height`.
    fn placement_of(css: &str, origin: &str, width: f32, height: f32) -> Affine2 {
        let list = TransformList::parse(css).expect(css);
        let origin = TransformOriginSpec::parse(origin).expect(origin);
        evaluate(list.computed(), Some(&origin), Vector2::new(width, height))
            .expect(css)
            .placement
            .affine
    }

    fn at_center(css: &str) -> Affine2 {
        placement_of(css, DEFAULT_ORIGIN, 100.0, 50.0)
    }

    #[test]
    fn affine_maps_compose_invert_and_bound() {
        let rotate = Affine2 {
            linear: Linear2 {
                a: 0.0,
                b: 1.0,
                c: -1.0,
                d: 0.0,
            },
            e: 0.0,
            f: 0.0,
        };
        let shift = Affine2::translation(Vector2::new(10.0, 0.0));
        // `then` applies the first map first: rotate (1, 0) to (0, 1), then shift to (10, 1).
        near_point(
            rotate.then(&shift).apply(Vector2::new(1.0, 0.0)),
            (10.0, 1.0),
        );
        near_point(
            shift.then(&rotate).apply(Vector2::new(1.0, 0.0)),
            (0.0, 11.0),
        );
        let both = rotate.then(&shift);
        let back = both.inverse().expect("a rotation has an inverse");
        near_point(back.apply(both.apply(Vector2::new(3.0, 7.0))), (3.0, 7.0));
        // A quarter turn of a 40 x 10 box is 10 x 40.
        let bounds = rotate.bounds_of(BoxRect {
            x: 0.0,
            y: 0.0,
            width: 40.0,
            height: 10.0,
        });
        near(bounds.width, 10.0);
        near(bounds.height, 40.0);
        near(bounds.x, -10.0);
        let singular = Linear2 {
            a: 1.0,
            b: 2.0,
            c: 2.0,
            d: 4.0,
        };
        assert!(singular.inverse().is_none());
    }

    #[test]
    fn rotate_turns_about_the_centre_by_default() {
        // CSS y is down: rotate(90deg) takes (1, 0) to (0, 1), clockwise on screen.
        let affine = at_center("rotate(90deg)");
        // The centre (50, 25) is fixed; the top-left corner (0, 0) goes to (75, -25).
        near_point(affine.apply(Vector2::new(50.0, 25.0)), (50.0, 25.0));
        near_point(affine.apply(Vector2::new(0.0, 0.0)), (75.0, -25.0));
        near_point(affine.apply(Vector2::new(100.0, 0.0)), (75.0, 75.0));
    }

    #[test]
    fn the_origin_moves_the_fixed_point() {
        let affine = placement_of("rotate(90deg)", "top left", 100.0, 50.0);
        near_point(affine.apply(Vector2::new(0.0, 0.0)), (0.0, 0.0));
        near_point(affine.apply(Vector2::new(100.0, 0.0)), (0.0, 100.0));
        let affine = placement_of("scale(2)", "10px 20%", 100.0, 50.0);
        near_point(affine.apply(Vector2::new(10.0, 10.0)), (10.0, 10.0));
        near_point(affine.apply(Vector2::new(20.0, 20.0)), (30.0, 30.0));
        let affine = placement_of("scale(2)", "right bottom", 100.0, 50.0);
        near_point(affine.apply(Vector2::new(100.0, 50.0)), (100.0, 50.0));
    }

    #[test]
    fn percentages_are_of_the_elements_own_box() {
        let affine = at_center("translate(50%, -100%)");
        near_point(affine.apply(Vector2::new(0.0, 0.0)), (50.0, -50.0));
        let affine = at_center("translateX(-50%) translateY(25%)");
        near_point(affine.apply(Vector2::new(0.0, 0.0)), (-50.0, 12.5));
        // Lengths in every absolute unit, and rem as 16 px.
        let affine = at_center("translate(1in, 2rem)");
        near_point(affine.apply(Vector2::new(0.0, 0.0)), (96.0, 32.0));
        let affine = at_center("translate(calc(50% + 10px), calc(100% - 5px))");
        near_point(affine.apply(Vector2::new(0.0, 0.0)), (60.0, 45.0));
    }

    #[test]
    fn functions_compose_with_the_last_applied_first() {
        // `translate(10px, 0) scale(2)` scales the element about its origin, then moves it.
        let affine = at_center("translate(10px, 0) scale(2)");
        near_point(affine.apply(Vector2::new(50.0, 25.0)), (60.0, 25.0));
        near_point(affine.apply(Vector2::new(100.0, 25.0)), (160.0, 25.0));
        // The other order moves it by 20 (the translation is scaled).
        let affine = at_center("scale(2) translate(10px, 0)");
        near_point(affine.apply(Vector2::new(50.0, 25.0)), (70.0, 25.0));
    }

    #[test]
    fn skews_scales_and_raw_matrices_match_css() {
        let affine = placement_of("skewX(45deg)", "0 0", 100.0, 50.0);
        // x' = x + tan(45deg) y
        near_point(affine.apply(Vector2::new(0.0, 50.0)), (50.0, 50.0));
        let affine = placement_of("skewY(45deg)", "0 0", 100.0, 50.0);
        near_point(affine.apply(Vector2::new(100.0, 0.0)), (100.0, 100.0));
        let affine = placement_of("skew(45deg, 0)", "0 0", 100.0, 50.0);
        near_point(affine.apply(Vector2::new(0.0, 50.0)), (50.0, 50.0));
        let affine = at_center("scale(2, 3)");
        near_point(affine.apply(Vector2::new(100.0, 50.0)), (150.0, 100.0));
        let affine = placement_of("matrix(1, 2, 3, 4, 5, 6)", "0 0", 10.0, 10.0);
        near_point(affine.apply(Vector2::new(1.0, 1.0)), (9.0, 12.0));
        let affine = placement_of(
            "matrix3d(1,2,0,0, 3,4,0,0, 0,0,1,0, 5,6,0,1)",
            "0 0",
            10.0,
            10.0,
        );
        near_point(affine.apply(Vector2::new(1.0, 1.0)), (9.0, 12.0));
        let affine = placement_of("rotate3d(0, 0, 1, 90deg)", "0 0", 10.0, 10.0);
        near_point(affine.apply(Vector2::new(1.0, 0.0)), (0.0, 1.0));
    }

    #[test]
    fn rotate_x_and_y_are_drawn_orthographically() {
        // Without perspective a rotation about y squeezes x by cos and drops z.
        let affine = placement_of("rotateY(60deg)", "0 0", 100.0, 50.0);
        near_point(affine.apply(Vector2::new(100.0, 50.0)), (50.0, 50.0));
        let affine = placement_of("rotateX(60deg)", "0 0", 100.0, 50.0);
        near_point(affine.apply(Vector2::new(100.0, 50.0)), (100.0, 25.0));
        // translateZ does nothing without perspective.
        let affine = at_center("translateZ(40px) translate3d(5px, 6px, 7px)");
        near_point(affine.apply(Vector2::new(0.0, 0.0)), (5.0, 6.0));
    }

    #[test]
    fn nested_flattening_is_per_element_not_of_the_product() {
        // Chrome flattens each element into its own plane: the child's rotateX is dropped to 2D before the
        // parent's rotateY applies, which the product of the two 4 x 4 matrices would not give.
        let child = placement_of("rotateX(60deg)", "0 0", 100.0, 100.0);
        let parent = placement_of("rotateY(60deg)", "0 0", 100.0, 100.0);
        let flattened = child.then(&parent).apply(Vector2::new(100.0, 100.0));
        near_point(flattened, (50.0, 50.0));
        let product = placement_of("rotateY(60deg) rotateX(60deg)", "0 0", 100.0, 100.0)
            .apply(Vector2::new(100.0, 100.0));
        assert!(
            (product.x - flattened.x).abs() > 1.0 || (product.y - flattened.y).abs() > 1.0,
            "the product would have drawn it differently: {product:?}"
        );
    }

    #[test]
    fn perspective_is_refused_with_a_message_that_says_so() {
        for css in [
            "perspective(500px)",
            "perspective(500px) rotateY(30deg)",
            "translateX(1px) PERSPECTIVE(100px)",
            "matrix3d(1,0,0,0.001, 0,1,0,0, 0,0,1,0, 0,0,0,1)",
            "matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,-0.002, 0,0,0,1)",
            "matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,2)",
        ] {
            let error = TransformList::parse(css).expect_err(css);
            assert!(
                error.contains("perspective is not implemented yet"),
                "{css}: {error}"
            );
        }
        // A matrix3d that is a plain 3D rotation is fine.
        assert!(TransformList::parse("matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 3,4,5,1)").is_ok());
    }

    #[test]
    fn refusals_name_the_problem() {
        let unknown = TransformList::parse("wobble(3px)").expect_err("unknown function");
        assert!(unknown.contains("wobble()"), "{unknown}");
        let unit = TransformList::parse("translateX(2em)").expect_err("em");
        assert!(unit.contains("\"em\""), "{unit}");
        let unit = TransformList::parse("translate(10vw, 0)").expect_err("vw");
        assert!(unit.contains("\"vw\""), "{unit}");
        let garbage = TransformList::parse("rotate(45)").expect_err("a unitless angle");
        assert!(garbage.contains("cannot parse"), "{garbage}");
        assert!(
            TransformList::parse("rotate(0)").is_ok(),
            "a zero angle may be unitless"
        );
        assert!(
            TransformList::parse("translateX(1e1px)").is_ok(),
            "an exponent is not a unit"
        );
        assert!(TransformOriginSpec::parse("2em 3em").is_err());
        assert!(TransformOriginSpec::parse("sideways").is_err());
    }

    #[test]
    fn parsing_is_case_insensitive_and_none_is_none() {
        assert!(TransformList::parse("NONE").expect("none").is_none());
        assert!(TransformList::parse("  none ").expect("none").is_none());
        let affine = at_center("TranslateX(10PX) ROTATE(0DEG)");
        near_point(affine.apply(Vector2::new(0.0, 0.0)), (10.0, 0.0));
    }

    #[test]
    fn a_collapsed_matrix_has_no_inverse() {
        for css in ["scale(0)", "rotateY(90deg)", "scaleX(0)"] {
            let list = TransformList::parse(css).expect(css);
            let value = evaluate(list.computed(), None, Vector2::new(100.0, 50.0)).expect(css);
            assert!(value.placement.inverse.is_none(), "{css}");
        }
    }

    #[test]
    fn parts_compose_in_tailwinds_order_with_its_defaults() {
        let parts = TransformParts {
            scale_x: Some(1.5),
            scale_y: Some(1.5),
            translate_x: Some("-50%".into()),
            rotate: Some("45deg".into()),
            ..TransformParts::default()
        };
        assert_eq!(
            parts.to_css(),
            "translate(-50%, 0px) rotate(45deg) skewX(0deg) skewY(0deg) scaleX(1.5) scaleY(1.5)"
        );
        assert!(parts.to_list().is_ok());
        let identity = TransformParts::default();
        let list = identity.to_list().expect("the identity list");
        let value = evaluate(list.computed(), None, Vector2::new(10.0, 10.0)).expect("identity");
        assert!(value.is_identity());
        let gpu = TransformParts {
            gpu: Some(true),
            translate_x: Some("4px".into()),
            ..TransformParts::default()
        };
        assert!(
            gpu.to_css()
                .starts_with("translate3d(4px, 0px, 0px) rotate(0deg)")
        );
        assert!(gpu.to_list().is_ok());
        let mut merged = parts.clone();
        merged.merge(&TransformParts {
            translate_x: Some("8px".into()),
            gpu: Some(false),
            ..TransformParts::default()
        });
        assert_eq!(merged.translate_x.as_deref(), Some("8px"));
        assert_eq!(
            merged.rotate.as_deref(),
            Some("45deg"),
            "a part not set stays"
        );
        assert_eq!(merged.gpu, Some(false));
    }

    #[test]
    fn the_wire_form_is_css_text_and_a_bad_value_fails_the_parse() {
        let list: TransformList =
            serde_json::from_str(r#""rotate(10deg) scale(2)""#).expect("parse");
        assert_eq!(
            serde_json::to_string(&list).unwrap(),
            r#""rotate(10deg) scale(2)""#
        );
        let error = serde_json::from_str::<TransformList>(r#""perspective(10px)""#)
            .expect_err("refused at parse");
        assert!(error.to_string().contains("not implemented yet"), "{error}");
        assert!(serde_json::from_str::<TransformOriginSpec>(r#""left top""#).is_ok());
    }

    #[test]
    fn a_transform_that_cannot_be_matched_is_resolved_against_the_box() {
        // Stylo hands a transition between unmatched lists to us as an interpolated matrix of both lists, whose
        // percentages need the box. Build the operation Stylo would and check the middle.
        use style::values::computed::Percentage;
        use style::values::generics::transform::GenericTransform;
        let from = TransformList::parse("rotate(0deg)").unwrap();
        let to = TransformList::parse("translateX(50%)").unwrap();
        let operation = TransformOperation::InterpolateMatrix {
            from_list: GenericTransform(from.computed().0.clone()),
            to_list: GenericTransform(to.computed().0.clone()),
            progress: Percentage(0.5),
        };
        let list = GenericTransform(vec![operation].into());
        let value = evaluate(&list, None, Vector2::new(100.0, 40.0)).expect("interpolated");
        near_point(
            value.placement.affine.apply(Vector2::new(0.0, 0.0)),
            (25.0, 0.0),
        );
        let wider = evaluate(&list, None, Vector2::new(300.0, 40.0)).expect("interpolated");
        near_point(
            wider.placement.affine.apply(Vector2::new(0.0, 0.0)),
            (75.0, 0.0),
        );
    }
}
