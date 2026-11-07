//! Transition declarations: which properties a node animates, for how long and with what timing, and how
//! the separate `transition-*` utility classes (`transition-colors`, `duration-200`, `ease-in-out`) merge
//! across style layers the way CSS's `transition-property`, `-duration`, `-delay` and `-timing-function`
//! longhands do. Nothing here touches Godot or Stylo; Stylo does the interpolation (`style_engine.rs`).

use serde::{Deserialize as DeriveDeserialize, Serialize};

use crate::props::{TransitionProperty, TransitionSpec};

/// How many control values a CSS `cubic-bezier()` has: x1, y1, x2, y2.
const BEZIER_VALUES: usize = 4;

/// A timing function: one of CSS's keywords, or a `cubic-bezier(x1, y1, x2, y2)` (what Tailwind's `ease-in`,
/// `ease-out` and `ease-in-out` are: `cubic-bezier(0.4, 0, 1, 1)` and the like, not CSS's keywords of the same
/// names).
#[derive(Clone, Copy, Debug, PartialEq, DeriveDeserialize, Serialize)]
#[serde(from = "EasingWire", into = "EasingWire")]
pub enum Easing {
    Linear,
    Ease,
    EaseIn,
    EaseOut,
    EaseInOut,
    CubicBezier([f32; BEZIER_VALUES]),
}

#[derive(Clone, Copy, DeriveDeserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum EasingKeyword {
    Linear,
    Ease,
    EaseIn,
    EaseOut,
    EaseInOut,
}

#[derive(Clone, Copy, DeriveDeserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CubicBezierWire {
    cubic_bezier: [f32; BEZIER_VALUES],
}

/// The wire shape of [`Easing`]: a keyword string, or `{"cubicBezier":[x1,y1,x2,y2]}`.
#[derive(Clone, Copy, DeriveDeserialize, Serialize)]
#[serde(untagged)]
enum EasingWire {
    Keyword(EasingKeyword),
    Curve(CubicBezierWire),
}

impl From<EasingWire> for Easing {
    fn from(wire: EasingWire) -> Self {
        match wire {
            EasingWire::Keyword(EasingKeyword::Linear) => Easing::Linear,
            EasingWire::Keyword(EasingKeyword::Ease) => Easing::Ease,
            EasingWire::Keyword(EasingKeyword::EaseIn) => Easing::EaseIn,
            EasingWire::Keyword(EasingKeyword::EaseOut) => Easing::EaseOut,
            EasingWire::Keyword(EasingKeyword::EaseInOut) => Easing::EaseInOut,
            EasingWire::Curve(curve) => Easing::CubicBezier(curve.cubic_bezier),
        }
    }
}

impl From<Easing> for EasingWire {
    fn from(easing: Easing) -> Self {
        match easing {
            Easing::Linear => EasingWire::Keyword(EasingKeyword::Linear),
            Easing::Ease => EasingWire::Keyword(EasingKeyword::Ease),
            Easing::EaseIn => EasingWire::Keyword(EasingKeyword::EaseIn),
            Easing::EaseOut => EasingWire::Keyword(EasingKeyword::EaseOut),
            Easing::EaseInOut => EasingWire::Keyword(EasingKeyword::EaseInOut),
            Easing::CubicBezier(values) => EasingWire::Curve(CubicBezierWire {
                cubic_bezier: values,
            }),
        }
    }
}

impl Easing {
    /// CSS's initial `transition-timing-function`.
    pub const INITIAL: Easing = Easing::Ease;

    /// The CSS text Stylo parses.
    pub fn css(self) -> String {
        match self {
            Easing::Linear => "linear".into(),
            Easing::Ease => "ease".into(),
            Easing::EaseIn => "ease-in".into(),
            Easing::EaseOut => "ease-out".into(),
            Easing::EaseInOut => "ease-in-out".into(),
            Easing::CubicBezier([x1, y1, x2, y2]) => {
                format!("cubic-bezier({x1}, {y1}, {x2}, {y2})")
            }
        }
    }

    /// CSS requires a curve's x values in `0..=1` (time must not run backwards); y may overshoot.
    pub fn validate(self) -> Result<(), String> {
        let Easing::CubicBezier([x1, y1, x2, y2]) = self else {
            return Ok(());
        };
        if ![x1, y1, x2, y2].iter().all(|value| value.is_finite()) {
            return Err("easing.cubicBezier must hold four finite numbers".into());
        }
        if !(0.0..=1.0).contains(&x1) || !(0.0..=1.0).contains(&x2) {
            return Err("easing.cubicBezier x values must be between 0 and 1".into());
        }
        Ok(())
    }
}

/// What `transition-property` names: every animatable property (`all`, CSS's initial value), none, or a list.
#[derive(Clone, Debug, PartialEq, DeriveDeserialize, Serialize)]
#[serde(untagged)]
pub enum TransitionProperties {
    Keyword(PropertiesKeyword),
    List(Vec<TransitionProperty>),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, DeriveDeserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PropertiesKeyword {
    All,
    None,
}

impl TransitionProperties {
    /// The properties this animates. `all` is the whole of [`TransitionProperty::ANIMATABLE`].
    pub fn animated(&self) -> &[TransitionProperty] {
        match self {
            TransitionProperties::Keyword(PropertiesKeyword::All) => {
                &TransitionProperty::ANIMATABLE
            }
            TransitionProperties::Keyword(PropertiesKeyword::None) => &[],
            TransitionProperties::List(list) => list,
        }
    }

    /// Whether this is `all`: a property that cannot animate then jumps quietly (as in CSS) instead of being
    /// reported, which is what an explicit list asking for it gets.
    pub fn is_all(&self) -> bool {
        *self == TransitionProperties::Keyword(PropertiesKeyword::All)
    }
}

/// The four `transition-*` longhands as separate utility classes set them. Each field set in a later layer
/// replaces only itself, so `transition-colors hover:duration-500` keeps the colours and takes the longer time
/// while hovered (as the CSS does), and `duration-200` on its own animates everything (`all` is the initial
/// property list).
#[derive(Clone, Debug, Default, PartialEq, DeriveDeserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TransitionParts {
    pub properties: Option<TransitionProperties>,
    pub duration_ms: Option<f64>,
    pub delay_ms: Option<f64>,
    pub easing: Option<Easing>,
}

impl TransitionParts {
    /// Overwrite every longhand `other` sets.
    pub fn merge(&mut self, other: &TransitionParts) {
        let TransitionParts {
            properties,
            duration_ms,
            delay_ms,
            easing,
        } = other;
        if properties.is_some() {
            self.properties = properties.clone();
        }
        if duration_ms.is_some() {
            self.duration_ms = *duration_ms;
        }
        if delay_ms.is_some() {
            self.delay_ms = *delay_ms;
        }
        if easing.is_some() {
            self.easing = *easing;
        }
    }

    /// The longhands a full `transition` declaration sets, so a utility after it changes one of them.
    pub fn from_spec(spec: &TransitionSpec) -> TransitionParts {
        TransitionParts {
            properties: Some(spec.properties.clone()),
            duration_ms: Some(spec.duration_ms),
            delay_ms: spec.delay_ms,
            easing: spec.easing,
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if let Some(TransitionProperties::List(list)) = &self.properties
            && list.is_empty()
        {
            return Err("transitionParts.properties must not be empty".into());
        }
        for (name, value) in [("durationMs", self.duration_ms), ("delayMs", self.delay_ms)] {
            if value.is_some_and(|value| !value.is_finite() || value < 0.0) {
                return Err(format!(
                    "transitionParts.{name} must be a finite nonnegative number"
                ));
            }
        }
        self.easing.map_or(Ok(()), Easing::validate)
    }

    /// The transition these longhands declare, with CSS's initial values for the ones nothing set. `None`
    /// when nothing can animate: `transition-property: none`, or no duration and no delay (a transition with
    /// both zero never runs, so the node need not be a motion node at all).
    pub fn resolve(&self) -> Option<TransitionSpec> {
        let properties = self
            .properties
            .clone()
            .unwrap_or(TransitionProperties::Keyword(PropertiesKeyword::All));
        if properties == TransitionProperties::Keyword(PropertiesKeyword::None) {
            return None;
        }
        let duration_ms = self.duration_ms.unwrap_or(0.0);
        let delay_ms = self.delay_ms.unwrap_or(0.0);
        if duration_ms == 0.0 && delay_ms == 0.0 {
            return None;
        }
        Some(TransitionSpec {
            properties,
            duration_ms,
            delay_ms: (delay_ms != 0.0).then_some(delay_ms),
            easing: Some(self.easing.unwrap_or(Easing::INITIAL)),
        })
    }
}

/// Merge one layer's `transition` and `transition_parts` over the values so far. A full `transition` replaces
/// everything before it, and the longhands a utility sets after it change only themselves: the full one is
/// first read back as longhands, so the order of a layer's declarations is the CSS cascade's.
pub fn merge_transition(
    transition: &mut Option<TransitionSpec>,
    parts: &mut Option<TransitionParts>,
    other_transition: &Option<TransitionSpec>,
    other_parts: &Option<TransitionParts>,
) {
    if let Some(other_transition) = other_transition {
        *transition = Some(other_transition.clone());
        *parts = None;
    }
    if let Some(other_parts) = other_parts {
        let mut merged = match transition.take() {
            Some(spec) => TransitionParts::from_spec(&spec),
            None => parts.take().unwrap_or_default(),
        };
        merged.merge(other_parts);
        *parts = Some(merged);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn spec(json: &str) -> TransitionSpec {
        serde_json::from_str(json).expect("test transition must parse")
    }

    fn parts(json: &str) -> TransitionParts {
        serde_json::from_str(json).expect("test transition parts must parse")
    }

    #[test]
    fn easing_reads_a_keyword_or_a_curve_and_writes_the_same() {
        for (json, easing) in [
            (r#""linear""#, Easing::Linear),
            (r#""ease-in-out""#, Easing::EaseInOut),
            (
                r#"{"cubicBezier":[0.4,0,0.2,1]}"#,
                Easing::CubicBezier([0.4, 0.0, 0.2, 1.0]),
            ),
        ] {
            let parsed: Easing = serde_json::from_str(json).unwrap();
            assert_eq!(parsed, easing, "{json}");
            assert_eq!(
                serde_json::from_str::<Easing>(&serde_json::to_string(&parsed).unwrap()).unwrap(),
                easing
            );
        }
        for bad in [
            r#""ease-in-quad""#,
            r#"{"cubicBezier":[0.4,0,0.2]}"#,
            r#"{"cubicBezier":[0.4,0,0.2,1],"extra":1}"#,
        ] {
            assert!(serde_json::from_str::<Easing>(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn a_curve_is_css_text_stylo_parses_and_x_stays_in_range() {
        assert_eq!(
            Easing::CubicBezier([0.4, 0.0, 0.2, 1.0]).css(),
            "cubic-bezier(0.4, 0, 0.2, 1)"
        );
        assert_eq!(Easing::EaseInOut.css(), "ease-in-out");
        assert!(
            Easing::CubicBezier([0.4, -2.0, 0.2, 3.0])
                .validate()
                .is_ok()
        );
        assert!(
            Easing::CubicBezier([1.5, 0.0, 0.2, 1.0])
                .validate()
                .is_err()
        );
        assert!(
            Easing::CubicBezier([0.4, 0.0, -0.1, 1.0])
                .validate()
                .is_err()
        );
        assert!(
            Easing::CubicBezier([0.4, f32::NAN, 0.2, 1.0])
                .validate()
                .is_err()
        );
    }

    #[test]
    fn properties_read_a_list_or_a_keyword() {
        let all: TransitionProperties = serde_json::from_str(r#""all""#).unwrap();
        assert!(all.is_all());
        assert_eq!(all.animated(), &TransitionProperty::ANIMATABLE);
        let none: TransitionProperties = serde_json::from_str(r#""none""#).unwrap();
        assert!(none.animated().is_empty());
        let list: TransitionProperties =
            serde_json::from_str(r#"["width","borderColor"]"#).unwrap();
        assert!(!list.is_all());
        assert_eq!(
            list.animated(),
            &[TransitionProperty::Width, TransitionProperty::BorderColor]
        );
        assert!(serde_json::from_str::<TransitionProperties>(r#""some""#).is_err());
        assert!(serde_json::from_str::<TransitionProperties>(r#"["margin"]"#).is_err());
    }

    #[test]
    fn longhands_set_later_change_only_themselves() {
        let mut transition = None;
        let mut merged = None;
        merge_transition(
            &mut transition,
            &mut merged,
            &None,
            &Some(parts(
                r#"{"properties":["color","backgroundColor"],"durationMs":150,"easing":{"cubicBezier":[0.4,0,0.2,1]}}"#,
            )),
        );
        merge_transition(
            &mut transition,
            &mut merged,
            &None,
            &Some(parts(r#"{"durationMs":500}"#)),
        );
        let resolved = merged.unwrap().resolve().unwrap();
        assert_eq!(resolved.duration_ms, 500.0);
        assert_eq!(
            resolved.properties.animated(),
            &[
                TransitionProperty::Color,
                TransitionProperty::BackgroundColor
            ]
        );
        assert_eq!(
            resolved.easing,
            Some(Easing::CubicBezier([0.4, 0.0, 0.2, 1.0]))
        );
    }

    #[test]
    fn a_full_transition_replaces_the_longhands_and_longhands_after_it_edit_it() {
        let mut transition = None;
        let mut merged = Some(parts(r#"{"durationMs":900,"delayMs":50}"#));
        merge_transition(
            &mut transition,
            &mut merged,
            &Some(spec(
                r#"{"properties":["width"],"durationMs":200,"easing":"linear"}"#,
            )),
            &None,
        );
        assert_eq!(
            merged, None,
            "a full declaration forgets the longhands before it"
        );
        assert_eq!(transition.as_ref().unwrap().duration_ms, 200.0);
        // And the same layer's longhand after it is read on top of the full declaration.
        merge_transition(
            &mut transition,
            &mut merged,
            &None,
            &Some(parts(r#"{"delayMs":30}"#)),
        );
        assert_eq!(transition, None);
        let resolved = merged.unwrap().resolve().unwrap();
        assert_eq!(
            (resolved.duration_ms, resolved.delay_ms, resolved.easing),
            (200.0, Some(30.0), Some(Easing::Linear))
        );
        assert_eq!(resolved.properties.animated(), &[TransitionProperty::Width]);
    }

    #[test]
    fn unset_longhands_take_css_initial_values() {
        // `duration-200` alone animates everything with the `ease` timing function.
        let resolved = parts(r#"{"durationMs":200}"#).resolve().unwrap();
        assert!(resolved.properties.is_all());
        assert_eq!(resolved.easing, Some(Easing::Ease));
        assert_eq!(resolved.delay_ms, None);
        // Nothing runs without a duration or a delay, and `none` runs nothing.
        assert_eq!(parts(r#"{"easing":"linear"}"#).resolve(), None);
        assert_eq!(parts(r#"{"durationMs":0}"#).resolve(), None);
        assert_eq!(
            parts(r#"{"properties":"none","durationMs":200}"#).resolve(),
            None
        );
        // `transition-none` then `duration-200` stays none.
        let mut merged = parts(r#"{"properties":"none"}"#);
        merged.merge(&parts(r#"{"durationMs":200}"#));
        assert_eq!(merged.resolve(), None);
        // A delay alone is a transition that jumps after the delay.
        assert_eq!(
            parts(r#"{"delayMs":75}"#).resolve().unwrap().delay_ms,
            Some(75.0)
        );
    }

    #[test]
    fn longhands_are_validated() {
        assert!(parts(r#"{"durationMs":-1}"#).validate().is_err());
        assert!(parts(r#"{"delayMs":-1}"#).validate().is_err());
        assert!(parts(r#"{"properties":[]}"#).validate().is_err());
        assert!(
            parts(r#"{"easing":{"cubicBezier":[2,0,0,1]}}"#)
                .validate()
                .is_err()
        );
        assert!(
            parts(r#"{"properties":"all","durationMs":0}"#)
                .validate()
                .is_ok()
        );
        assert!(
            serde_json::from_str::<TransitionParts>(r#"{"duration":200}"#).is_err(),
            "unknown keys are refused"
        );
    }
}
