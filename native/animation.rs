//! CSS animations: what a `@keyframes` rule and an `animation` declaration say, validated, and the CSS text Stylo
//! parses from them. Nothing here touches Godot or Stylo: `style_engine.rs` registers the rules in the retained Blitz
//! document's stylesheet and writes the `animation-*` longhands of a node, and Stylo runs the animation (timing,
//! iterations, direction, fill, pause) on the native clock exactly as it runs a transition.
//!
//! A keyframes rule travels with the style that uses it (the renderer compiles `defineKeyframes` and inline frames into
//! it), so it needs no registration of its own; native names it after a hash of its CSS, so two rules that an author
//! gave the same name never collide, and one rule used by a thousand nodes is registered once.

use std::fmt::Write as _;

use serde::{Deserialize as DeriveDeserialize, Serialize};

use crate::box_shadow::ShadowList;
use crate::filter::{FilterFunction, FilterKind, FilterList};
use crate::props::{Dimension, ParsedSize, TransitionProperty};
use crate::transform::TransformList;
use crate::transition::Easing;

const PERCENT: f64 = 100.0;
/// The offset of a rule's first and last keyframe (`from` and `to`).
const FIRST_OFFSET: f64 = 0.0;
const LAST_OFFSET: f64 = 1.0;
/// FNV-1a, 64 bit (http://www.isthe.com/chongo/tech/comp/fnv/): a hash that is the same on every platform and build,
/// so a rule's name is too.
const FNV_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;
/// The longest author name kept in the CSS identifier (the hash makes it unique; the name is for reading).
const MAX_NAME_IN_IDENT: usize = 32;

/// What one keyframe sets: the properties native animates (the same set as transitions, `TransitionProperty`). A size is
/// pixels or a percentage; the intrinsic keywords and viewport units do not interpolate here.
#[derive(Clone, Debug, Default, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KeyframeStyle {
    pub width: Option<Dimension>,
    pub height: Option<Dimension>,
    pub opacity: Option<f32>,
    pub background_color: Option<String>,
    pub color: Option<String>,
    pub border_color: Option<String>,
    pub filter: Option<FilterList>,
    pub backdrop_filter: Option<FilterList>,
    pub transform: Option<TransformList>,
    pub box_shadow: Option<ShadowList>,
}

/// One keyframe: where it is in an iteration (0 to 1) and, optionally, the timing function from it to the next one
/// (CSS's `animation-timing-function` inside a keyframe).
#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KeyframeSpec {
    pub offset: f64,
    pub style: KeyframeStyle,
    pub easing: Option<Easing>,
}

/// A `@keyframes` rule: the author's name (for diagnostics; the CSS identifier is [`KeyframesSpec::ident`]) and the
/// keyframes in ascending offset order.
#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KeyframesSpec {
    pub name: String,
    pub frames: Vec<KeyframeSpec>,
}

/// `animation-iteration-count`.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum Iterations {
    Count(f64),
    Keyword(InfiniteKeyword),
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum InfiniteKeyword {
    Infinite,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AnimationDirection {
    Normal,
    Reverse,
    Alternate,
    AlternateReverse,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FillMode {
    None,
    Forwards,
    Backwards,
    Both,
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PlayState {
    Running,
    Paused,
}

/// One animation of an element's `animation` list. What is not set is CSS's initial value: no delay, `ease`, one
/// iteration, `normal`, fill `none`, `running`.
#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AnimationSpec {
    pub keyframes: KeyframesSpec,
    pub duration_ms: f64,
    /// May be negative: the animation starts that far into its run (CSS).
    pub delay_ms: Option<f64>,
    pub easing: Option<Easing>,
    pub iterations: Option<Iterations>,
    pub direction: Option<AnimationDirection>,
    pub fill_mode: Option<FillMode>,
    pub play_state: Option<PlayState>,
}

impl KeyframeStyle {
    /// The properties this keyframe sets.
    pub fn properties(&self) -> impl Iterator<Item = TransitionProperty> + '_ {
        let KeyframeStyle {
            width,
            height,
            opacity,
            background_color,
            color,
            border_color,
            filter,
            backdrop_filter,
            transform,
            box_shadow,
        } = self;
        [
            (width.is_some(), TransitionProperty::Width),
            (height.is_some(), TransitionProperty::Height),
            (opacity.is_some(), TransitionProperty::Opacity),
            (background_color.is_some(), TransitionProperty::BackgroundColor),
            (color.is_some(), TransitionProperty::Color),
            (border_color.is_some(), TransitionProperty::BorderColor),
            (filter.is_some(), TransitionProperty::Filter),
            (backdrop_filter.is_some(), TransitionProperty::BackdropFilter),
            (transform.is_some(), TransitionProperty::Transform),
            (box_shadow.is_some(), TransitionProperty::BoxShadow),
        ]
        .into_iter()
        .filter_map(|(set, property)| set.then_some(property))
    }

    fn validate(&self) -> Result<(), String> {
        for (name, size) in [("width", &self.width), ("height", &self.height)] {
            if let Some(size) = size {
                match size.value().map_err(|error| format!("{name}: {error}"))? {
                    ParsedSize::Length(_) | ParsedSize::Percent(_) => {}
                    _ => {
                        return Err(format!(
                            "{name} in a keyframe is pixels or a percentage (auto, the intrinsic keywords and viewport units do not interpolate)"
                        ));
                    }
                }
            }
        }
        if self
            .opacity
            .is_some_and(|opacity| !(0.0..=1.0).contains(&opacity))
        {
            return Err("opacity in a keyframe must be between 0 and 1".into());
        }
        for (name, color) in [
            ("backgroundColor", &self.background_color),
            ("color", &self.color),
            ("borderColor", &self.border_color),
        ] {
            if let Some(color) = color {
                crate::paint::validate_hex(color).map_err(|error| format!("{name} {error}"))?;
            }
        }
        // A keyframe is computed by Stylo for the element, but its shadows reach native as CSS text with every colour
        // concrete, as a transition's do; `currentcolor` would be the scratch document's.
        let shadow_colours = self
            .box_shadow
            .iter()
            .flat_map(|list| list.0.iter().map(|layer| layer.color))
            .chain(
                [&self.filter, &self.backdrop_filter]
                    .into_iter()
                    .flatten()
                    .flat_map(|list| list.0.iter())
                    .filter_map(|function| match function {
                        FilterFunction::DropShadow(shadow) => Some(shadow.color),
                        _ => None,
                    }),
            );
        for colour in shadow_colours {
            if colour.is_none() {
                return Err(
                    "a shadow in a keyframe needs a colour of its own (currentcolor is not supported in keyframes)".into(),
                );
            }
        }
        if let Some(filter) = &self.filter {
            filter
                .validate(FilterKind::Filter)
                .map_err(|error| format!("filter: {error}"))?;
        }
        if let Some(filter) = &self.backdrop_filter {
            filter
                .validate(FilterKind::Backdrop)
                .map_err(|error| format!("backdropFilter: {error}"))?;
        }
        Ok(())
    }

    /// The declarations of this keyframe, each with its property, as CSS text with every value concrete.
    fn declarations(&self) -> Vec<(TransitionProperty, String)> {
        let mut declarations = Vec::new();
        if let Some(width) = &self.width {
            declarations.push((TransitionProperty::Width, dimension_css(width)));
        }
        if let Some(height) = &self.height {
            declarations.push((TransitionProperty::Height, dimension_css(height)));
        }
        if let Some(opacity) = self.opacity {
            declarations.push((TransitionProperty::Opacity, opacity.to_string()));
        }
        if let Some(color) = &self.background_color {
            declarations.push((TransitionProperty::BackgroundColor, color.clone()));
        }
        if let Some(color) = &self.color {
            declarations.push((TransitionProperty::Color, color.clone()));
        }
        if let Some(color) = &self.border_color {
            declarations.push((TransitionProperty::BorderColor, color.clone()));
        }
        if let Some(filter) = &self.filter {
            declarations.push((TransitionProperty::Filter, filter.to_css()));
        }
        if let Some(filter) = &self.backdrop_filter {
            declarations.push((TransitionProperty::BackdropFilter, filter.to_css()));
        }
        if let Some(transform) = &self.transform {
            declarations.push((TransitionProperty::Transform, transform.css().to_string()));
        }
        if let Some(shadows) = &self.box_shadow {
            declarations.push((TransitionProperty::BoxShadow, shadows.to_css()));
        }
        declarations
    }
}

/// A size as the CSS text the style engine writes (pixels are numbers on the wire).
pub(crate) fn dimension_css(value: &Dimension) -> String {
    match value {
        Dimension::Num(value) => format!("{value}px"),
        Dimension::Text(value) => value.clone(),
    }
}

impl KeyframesSpec {
    pub fn validate(&self) -> Result<(), String> {
        if self.name.is_empty()
            || !self
                .name
                .chars()
                .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
        {
            return Err(format!(
                "keyframes name {:?} must be letters, digits, '-' and '_'",
                self.name
            ));
        }
        if self.frames.is_empty() {
            return Err(format!("keyframes {:?} has no keyframes", self.name));
        }
        let mut previous = f64::NEG_INFINITY;
        for (index, frame) in self.frames.iter().enumerate() {
            let context = |error: String| format!("keyframes {:?} frame {index}: {error}", self.name);
            if !frame.offset.is_finite() || !(FIRST_OFFSET..=LAST_OFFSET).contains(&frame.offset) {
                return Err(context("offset must be between 0 and 1".into()));
            }
            if frame.offset <= previous {
                return Err(context("offsets must increase".into()));
            }
            previous = frame.offset;
            frame.style.validate().map_err(context)?;
            frame
                .easing
                .map_or(Ok(()), Easing::validate)
                .map_err(context)?;
        }
        // A size that is animated is given at both ends, in one unit: an end it leaves out would be the element's own size,
        // which can be `auto` (no interpolation) or the other unit (a calc() layout cannot resolve).
        for (name, axis) in [
            ("width", TransitionProperty::Width),
            ("height", TransitionProperty::Height),
        ] {
            let size = |style: &KeyframeStyle| match axis {
                TransitionProperty::Width => style.width.clone(),
                _ => style.height.clone(),
            };
            let sizes: Vec<(f64, Dimension)> = self
                .frames
                .iter()
                .filter_map(|frame| size(&frame.style).map(|value| (frame.offset, value)))
                .collect();
            if sizes.is_empty() {
                continue;
            }
            let ends = sizes.first().is_some_and(|(offset, _)| *offset == FIRST_OFFSET)
                && sizes.last().is_some_and(|(offset, _)| *offset == LAST_OFFSET);
            if !ends {
                return Err(format!(
                    "keyframes {:?} animates {name}, so it must set {name} at 0% and at 100%",
                    self.name
                ));
            }
            let pixels = |value: &Dimension| matches!(value, Dimension::Num(_));
            if !(sizes.iter().all(|(_, value)| pixels(value))
                || sizes.iter().all(|(_, value)| !pixels(value)))
            {
                return Err(format!(
                    "keyframes {:?} mixes pixels and percentages in {name}, which layout cannot interpolate",
                    self.name
                ));
            }
        }
        Ok(())
    }

    /// Whether any keyframe sets `property`.
    pub fn animates(&self, property: TransitionProperty) -> bool {
        self.frames
            .iter()
            .any(|frame| frame.style.properties().any(|set| set == property))
    }

    /// The rule for one element: its keyframes, with every property the rule animates given at 0 % and at 100 %. Where the
    /// author left an end out, CSS takes the element's own value there; `base` gives it (CSS text) and it is written into
    /// the rule. Stylo would take it from the element's style as it is when the animation is updated, which already holds
    /// the animated value, so a pause would jump (Stylo `servo/animation.rs`, `ComputedKeyframe::generate_for_keyframes` is
    /// given the animating style as `base_style`). The identifier is a hash of the rule, so elements with the same own
    /// values share one rule.
    pub fn resolve(&self, base: &dyn Fn(TransitionProperty) -> String) -> ResolvedKeyframes {
        let animated: Vec<TransitionProperty> = TransitionProperty::ANIMATABLE
            .into_iter()
            .filter(|property| self.animates(*property))
            .collect();
        let mut body = String::new();
        let mut write_frame = |offset: f64, declared: &[(TransitionProperty, String)], easing: Option<Easing>| {
            let _ = write!(body, "{}% {{ ", offset * PERCENT);
            for (property, value) in declared {
                let _ = write!(body, "{}: {value}; ", property.css_name());
            }
            if offset == FIRST_OFFSET || offset == LAST_OFFSET {
                for property in &animated {
                    if !declared.iter().any(|(set, _)| set == property) {
                        let _ = write!(body, "{}: {}; ", property.css_name(), base(*property));
                    }
                }
            }
            if let Some(easing) = easing {
                let _ = write!(body, "animation-timing-function: {}; ", easing.css());
            }
            body.push_str("} ");
        };
        if self.frames.first().is_none_or(|frame| frame.offset != FIRST_OFFSET) {
            write_frame(FIRST_OFFSET, &[], None);
        }
        for frame in &self.frames {
            write_frame(frame.offset, &frame.style.declarations(), frame.easing);
        }
        if self.frames.last().is_none_or(|frame| frame.offset != LAST_OFFSET) {
            write_frame(LAST_OFFSET, &[], None);
        }
        let mut hash = FNV_OFFSET_BASIS;
        for byte in body.bytes() {
            hash ^= u64::from(byte);
            hash = hash.wrapping_mul(FNV_PRIME);
        }
        let name: String = self.name.chars().take(MAX_NAME_IN_IDENT).collect();
        let ident = format!("grui-{name}-{hash:016x}");
        ResolvedKeyframes {
            rule_css: format!("@keyframes {ident} {{ {body}}}"),
            ident,
        }
    }
}

/// A keyframes rule as it is registered for an element: the CSS identifier and the whole `@keyframes` rule.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ResolvedKeyframes {
    pub ident: String,
    pub rule_css: String,
}

impl AnimationSpec {
    pub fn validate(&self) -> Result<(), String> {
        self.keyframes.validate()?;
        let name = &self.keyframes.name;
        if !self.duration_ms.is_finite() || self.duration_ms < 0.0 {
            return Err(format!(
                "animation {name:?}: durationMs must be a finite nonnegative number"
            ));
        }
        if self.delay_ms.is_some_and(|delay| !delay.is_finite()) {
            return Err(format!("animation {name:?}: delayMs must be finite"));
        }
        if let Some(Iterations::Count(count)) = self.iterations
            && (!count.is_finite() || count < 0.0)
        {
            return Err(format!(
                "animation {name:?}: iterations is a finite nonnegative number or 'infinite'"
            ));
        }
        self.easing
            .map_or(Ok(()), Easing::validate)
            .map_err(|error| format!("animation {name:?}: {error}"))
    }
}

/// The `animation-*` longhands of an `animation` list, as the CSS text the style engine writes; `None`'s values are
/// CSS's initial ones.
pub(crate) struct AnimationLonghands {
    pub name: String,
    pub duration: String,
    pub delay: String,
    pub timing_function: String,
    pub iteration_count: String,
    pub direction: String,
    pub fill_mode: String,
    pub play_state: String,
}

impl AnimationLonghands {
    /// `idents` are the animations' rules as [`KeyframesSpec::resolve`] named them, one per animation.
    pub fn of(animations: &[AnimationSpec], idents: &[String]) -> AnimationLonghands {
        if animations.is_empty() {
            return AnimationLonghands {
                name: "none".into(),
                duration: "0s".into(),
                delay: "0s".into(),
                timing_function: Easing::INITIAL.css(),
                iteration_count: "1".into(),
                direction: "normal".into(),
                fill_mode: "none".into(),
                play_state: "running".into(),
            };
        }
        let list = |value: &dyn Fn(&AnimationSpec) -> String| {
            animations.iter().map(value).collect::<Vec<_>>().join(", ")
        };
        AnimationLonghands {
            name: idents.join(", "),
            duration: list(&|animation| format!("{}ms", animation.duration_ms)),
            delay: list(&|animation| format!("{}ms", animation.delay_ms.unwrap_or(0.0))),
            timing_function: list(&|animation| animation.easing.unwrap_or(Easing::INITIAL).css()),
            iteration_count: list(&|animation| match animation.iterations {
                None => "1".into(),
                Some(Iterations::Count(count)) => count.to_string(),
                Some(Iterations::Keyword(InfiniteKeyword::Infinite)) => "infinite".into(),
            }),
            direction: list(&|animation| {
                match animation.direction.unwrap_or(AnimationDirection::Normal) {
                    AnimationDirection::Normal => "normal",
                    AnimationDirection::Reverse => "reverse",
                    AnimationDirection::Alternate => "alternate",
                    AnimationDirection::AlternateReverse => "alternate-reverse",
                }
                .into()
            }),
            fill_mode: list(&|animation| {
                match animation.fill_mode.unwrap_or(FillMode::None) {
                    FillMode::None => "none",
                    FillMode::Forwards => "forwards",
                    FillMode::Backwards => "backwards",
                    FillMode::Both => "both",
                }
                .into()
            }),
            play_state: list(&|animation| {
                match animation.play_state.unwrap_or(PlayState::Running) {
                    PlayState::Running => "running",
                    PlayState::Paused => "paused",
                }
                .into()
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn animation(json: &str) -> AnimationSpec {
        serde_json::from_str(json).expect("test animation must parse")
    }

    const SPIN: &str = r#"{"keyframes":{"name":"spin","frames":[{"offset":1,"style":{"transform":"rotate(360deg)"}}]},
        "durationMs":1000,"easing":"linear","iterations":"infinite"}"#;

    /// The element's own values, as the style engine gives them: no transform, full opacity.
    fn own(property: TransitionProperty) -> String {
        match property {
            TransitionProperty::Opacity => "1".into(),
            _ => "none".into(),
        }
    }

    #[test]
    fn a_spin_is_valid_and_writes_the_rule_and_longhands_stylo_reads() {
        let spin = animation(SPIN);
        spin.validate().unwrap();
        let ResolvedKeyframes { ident, rule_css } = spin.keyframes.resolve(&own);
        assert!(ident.starts_with("grui-spin-"), "{ident}");
        assert_eq!(
            rule_css,
            format!("@keyframes {ident} {{ 0% {{ transform: none; }} 100% {{ transform: rotate(360deg); }} }}")
        );
        let longhands = AnimationLonghands::of(std::slice::from_ref(&spin), std::slice::from_ref(&ident));
        assert_eq!(longhands.name, ident);
        assert_eq!(longhands.duration, "1000ms");
        assert_eq!(longhands.timing_function, "linear");
        assert_eq!(longhands.iteration_count, "infinite");
        assert!(spin.keyframes.animates(TransitionProperty::Transform));
        assert!(!spin.keyframes.animates(TransitionProperty::Opacity));
    }

    #[test]
    fn the_identifier_follows_the_keyframes_not_only_the_name() {
        let a = animation(SPIN);
        let mut b = a.clone();
        b.keyframes.frames[0].style.transform = Some(TransformList::parse("rotate(180deg)").unwrap());
        assert_ne!(a.keyframes.resolve(&own).ident, b.keyframes.resolve(&own).ident);
        assert_eq!(a.keyframes.resolve(&own), animation(SPIN).keyframes.resolve(&own));
        // An element whose own value differs gets its own rule.
        let turned = |property: TransitionProperty| match property {
            TransitionProperty::Transform => "rotate(10deg)".into(),
            other => own(other),
        };
        assert_ne!(a.keyframes.resolve(&own).ident, a.keyframes.resolve(&turned).ident);
    }

    #[test]
    fn per_keyframe_easing_is_written_into_its_keyframe() {
        let bounce = animation(
            r#"{"keyframes":{"name":"bounce","frames":[
                {"offset":0,"style":{"transform":"translateY(-25%)"},"easing":{"cubicBezier":[0.8,0,1,1]}},
                {"offset":0.5,"style":{"transform":"none"},"easing":{"cubicBezier":[0,0,0.2,1]}},
                {"offset":1,"style":{"transform":"translateY(-25%)"},"easing":{"cubicBezier":[0.8,0,1,1]}}]},
              "durationMs":1000,"iterations":"infinite"}"#,
        );
        bounce.validate().unwrap();
        let css = bounce.keyframes.resolve(&own).rule_css;
        assert!(
            css.contains("50% { transform: none; animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }"),
            "{css}"
        );
    }

    #[test]
    fn invalid_animations_are_refused_with_a_reason() {
        let refused = |json: &str, needle: &str| {
            let error = animation(json).validate().unwrap_err();
            assert!(error.contains(needle), "{error}");
        };
        let frames = |frames: &str| {
            format!(r#"{{"keyframes":{{"name":"x","frames":{frames}}},"durationMs":100}}"#)
        };
        refused(&frames("[]"), "has no keyframes");
        refused(
            &frames(r#"[{"offset":0.5,"style":{}},{"offset":0.5,"style":{}}]"#),
            "offsets must increase",
        );
        refused(&frames(r#"[{"offset":2,"style":{}}]"#), "between 0 and 1");
        refused(
            &frames(r#"[{"offset":0,"style":{"width":"auto"}},{"offset":1,"style":{"width":10}}]"#),
            "pixels or a percentage",
        );
        refused(
            &frames(r#"[{"offset":1,"style":{"width":10}}]"#),
            "at 0% and at 100%",
        );
        refused(
            &frames(r#"[{"offset":0,"style":{"width":10}},{"offset":1,"style":{"width":"50%"}}]"#),
            "mixes pixels and percentages",
        );
        refused(
            &frames(r#"[{"offset":1,"style":{"boxShadow":"0 0 4px"}}]"#),
            "needs a colour",
        );
        refused(&frames(r#"[{"offset":1,"style":{"backgroundColor":"red"}}]"#), "backgroundColor");
        refused(
            r#"{"keyframes":{"name":"has space","frames":[{"offset":1,"style":{}}]},"durationMs":1}"#,
            "must be letters",
        );
        refused(
            r#"{"keyframes":{"name":"x","frames":[{"offset":1,"style":{}}]},"durationMs":1,"iterations":-1}"#,
            "iterations",
        );
        assert!(
            serde_json::from_str::<AnimationSpec>(
                r#"{"keyframes":{"name":"x","frames":[{"offset":1,"style":{"margin":1}}]},"durationMs":1}"#
            )
            .is_err(),
            "a property native does not animate is an unknown key"
        );
    }

    #[test]
    fn the_longhands_of_none_are_css_initial_values() {
        let none = AnimationLonghands::of(&[], &[]);
        assert_eq!(none.name, "none");
        assert_eq!(none.play_state, "running");
    }
}
