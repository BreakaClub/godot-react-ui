//! Grid styles: the explicit and implicit tracks of a grid container and the lines a grid item is placed on, as
//! they arrive from the utility classes (`grid-cols-3`, `grid-rows-[auto_1fr]`, `auto-cols-fr`, `col-span-2`,
//! `col-start-3`, `grid-flow-col`) and as inline styles, converted to Taffy's types.
//!
//! A track is typed rather than CSS text: a number is pixels, a string is `"<n>fr"`, `"<n>%"`, `"auto"`,
//! `"min-content"` or `"max-content"`, and `{minmax: [min, max]}`, `{fitContent: size}` and
//! `{repeat: count, tracks: [...]}` are the functions. This is the same convention as [`Dimension`]
//! (`crate::props`), whose lengths are numbers and percentages are strings.

use serde::{Deserialize as DeriveDeserialize, Serialize};
use taffy::geometry::{Line, MinMax};
use taffy::style::{
    GridAutoFlow, GridPlacement, GridTemplateComponent, GridTemplateRepetition,
    MaxTrackSizingFunction, MinTrackSizingFunction, RepetitionCount, TrackSizingFunction,
};
use taffy::style_helpers::{line, span};

/// How many tracks one `repeat()` may make and a template may hold in all. Taffy clamps to its own bound
/// (`MAX_GRID_TRACKS`, 1000) silently; a template past it is refused here instead.
const MAX_TRACKS: usize = 1000;

/// The size of a track as a number of pixels or text with a unit.
#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum TrackSize {
    Px(f32),
    Text(String),
}

/// What a [`TrackSize`] says.
#[derive(Clone, Copy, Debug, PartialEq)]
enum Bound {
    Length(f32),
    Percent(f32),
    Fraction(f32),
    Auto,
    MinContent,
    MaxContent,
}

impl TrackSize {
    fn bound(&self) -> Result<Bound, String> {
        match self {
            TrackSize::Px(value) if value.is_finite() && *value >= 0.0 => Ok(Bound::Length(*value)),
            TrackSize::Px(_) => Err("a track size must be a finite nonnegative number".into()),
            TrackSize::Text(text) => match text.as_str() {
                "auto" => Ok(Bound::Auto),
                "min-content" => Ok(Bound::MinContent),
                "max-content" => Ok(Bound::MaxContent),
                _ => {
                    let number = |suffix: &str| {
                        text.strip_suffix(suffix)
                            .and_then(|digits| digits.parse::<f32>().ok())
                            .filter(|value| value.is_finite() && *value >= 0.0)
                    };
                    if let Some(value) = number("fr") {
                        Ok(Bound::Fraction(value))
                    } else if let Some(value) = number("%") {
                        Ok(Bound::Percent(value / 100.0))
                    } else {
                        Err(format!(
                            "invalid track size {text:?}; expected a number, <n>fr, <n>%, auto, min-content or max-content"
                        ))
                    }
                }
            },
        }
    }

    /// As the minimum of a track: a flexible size cannot be one (CSS).
    fn min_function(&self) -> Result<MinTrackSizingFunction, String> {
        match self.bound()? {
            Bound::Length(value) => Ok(MinTrackSizingFunction::length(value)),
            Bound::Percent(value) => Ok(MinTrackSizingFunction::percent(value)),
            Bound::Auto => Ok(MinTrackSizingFunction::auto()),
            Bound::MinContent => Ok(MinTrackSizingFunction::min_content()),
            Bound::MaxContent => Ok(MinTrackSizingFunction::max_content()),
            Bound::Fraction(_) => {
                Err("a flexible (fr) size cannot be the minimum of minmax()".into())
            }
        }
    }

    fn max_function(&self) -> Result<MaxTrackSizingFunction, String> {
        Ok(match self.bound()? {
            Bound::Length(value) => MaxTrackSizingFunction::length(value),
            Bound::Percent(value) => MaxTrackSizingFunction::percent(value),
            Bound::Fraction(value) => MaxTrackSizingFunction::fr(value),
            Bound::Auto => MaxTrackSizingFunction::auto(),
            Bound::MinContent => MaxTrackSizingFunction::min_content(),
            Bound::MaxContent => MaxTrackSizingFunction::max_content(),
        })
    }

    /// Whether this is a length or a percentage, which `fit-content()` and an auto-repeated track need.
    fn is_length_percentage(&self) -> bool {
        matches!(self.bound(), Ok(Bound::Length(_) | Bound::Percent(_)))
    }
}

/// How many times a `repeat()` repeats its tracks.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(untagged)]
pub enum RepeatCount {
    Times(u16),
    Auto(AutoRepeat),
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AutoRepeat {
    AutoFill,
    AutoFit,
}

#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct MinMaxTrack {
    pub minmax: [TrackSize; 2],
}

#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FitContentTrack {
    pub fit_content: TrackSize,
}

#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RepeatTrack {
    pub repeat: RepeatCount,
    pub tracks: Vec<GridTrackSpec>,
}

/// One entry of a `grid-template-columns`, `grid-template-rows`, `grid-auto-columns` or `grid-auto-rows`.
#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum GridTrackSpec {
    Size(TrackSize),
    MinMax(MinMaxTrack),
    FitContent(FitContentTrack),
    Repeat(RepeatTrack),
}

impl GridTrackSpec {
    /// A single track, not a `repeat()`.
    fn function(&self) -> Result<TrackSizingFunction, String> {
        Ok(match self {
            GridTrackSpec::Size(size) => match size.bound()? {
                // A bare `1fr` is `minmax(auto, 1fr)`; any other size is the same at both ends.
                Bound::Fraction(value) => MinMax {
                    min: MinTrackSizingFunction::auto(),
                    max: MaxTrackSizingFunction::fr(value),
                },
                _ => MinMax {
                    min: size.min_function()?,
                    max: size.max_function()?,
                },
            },
            GridTrackSpec::MinMax(MinMaxTrack { minmax: [min, max] }) => MinMax {
                min: min.min_function()?,
                max: max.max_function()?,
            },
            GridTrackSpec::FitContent(FitContentTrack { fit_content }) => {
                let limit = match fit_content.bound()? {
                    Bound::Length(value) => MaxTrackSizingFunction::fit_content_px(value),
                    Bound::Percent(value) => MaxTrackSizingFunction::fit_content_percent(value),
                    _ => return Err("fit-content() takes a length or a percentage".into()),
                };
                MinMax {
                    min: MinTrackSizingFunction::auto(),
                    max: limit,
                }
            }
            GridTrackSpec::Repeat(_) => {
                return Err("repeat() cannot be nested or used here".into());
            }
        })
    }

    /// Whether the track has a length or percentage as its minimum or maximum, which CSS requires of every
    /// track in an `auto-fill` or `auto-fit` repetition and of every other track beside one.
    fn is_fixed(&self) -> bool {
        match self {
            GridTrackSpec::Size(size) => size.is_length_percentage(),
            GridTrackSpec::MinMax(MinMaxTrack { minmax: [min, max] }) => {
                min.is_length_percentage() || max.is_length_percentage()
            }
            GridTrackSpec::FitContent(_) => false,
            GridTrackSpec::Repeat(repeat) => repeat.tracks.iter().all(Self::is_fixed),
        }
    }

    fn validate(&self) -> Result<(), String> {
        match self {
            GridTrackSpec::Repeat(RepeatTrack { repeat, tracks }) => {
                if tracks.is_empty() {
                    return Err("repeat() needs at least one track".into());
                }
                if let RepeatCount::Times(times) = repeat {
                    if *times == 0 {
                        return Err("repeat() needs a positive count".into());
                    }
                    if usize::from(*times) * tracks.len() > MAX_TRACKS {
                        return Err(format!("repeat() makes more than {MAX_TRACKS} tracks"));
                    }
                }
                if matches!(repeat, RepeatCount::Auto(_)) && !tracks.iter().all(Self::is_fixed) {
                    return Err(
                        "auto-fill and auto-fit need every track to have a length or percentage size"
                            .into(),
                    );
                }
                tracks.iter().try_for_each(|track| {
                    if matches!(track, GridTrackSpec::Repeat(_)) {
                        Err("repeat() cannot be nested".to_string())
                    } else {
                        track.function().map(|_| ())
                    }
                })
            }
            single => single.function().map(|_| ()),
        }
    }

    fn is_fixed_or_auto_repeat(&self) -> bool {
        self.is_auto_repeat() || self.is_fixed()
    }

    fn is_auto_repeat(&self) -> bool {
        matches!(
            self,
            GridTrackSpec::Repeat(RepeatTrack {
                repeat: RepeatCount::Auto(_),
                ..
            })
        )
    }
}

/// `grid-template-columns` and `grid-template-rows`: a count of equal columns or rows (`grid-cols-3` is
/// `repeat(3, minmax(0, 1fr))`), or an explicit list. An empty list is `none`.
#[derive(Clone, Debug, DeriveDeserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum GridTemplateSpec {
    Count(u16),
    Tracks(Vec<GridTrackSpec>),
}

impl GridTemplateSpec {
    pub fn validate(&self) -> Result<(), String> {
        match self {
            GridTemplateSpec::Count(0) => Err("a track count must be a positive integer".into()),
            GridTemplateSpec::Count(_) => Ok(()),
            GridTemplateSpec::Tracks(tracks) => {
                validate_tracks(tracks)?;
                let auto_repeats = tracks.iter().filter(|track| track.is_auto_repeat()).count();
                if auto_repeats > 1 {
                    return Err("a template has at most one auto-fill or auto-fit repeat".into());
                }
                if auto_repeats == 1 && !tracks.iter().all(GridTrackSpec::is_fixed_or_auto_repeat) {
                    return Err(
                        "an auto-fill or auto-fit repeat needs every other track to have a length or percentage size"
                            .into(),
                    );
                }
                Ok(())
            }
        }
    }

    pub fn components(&self) -> Result<Vec<GridTemplateComponent<String>>, String> {
        match self {
            GridTemplateSpec::Count(count) => Ok(vec![GridTemplateComponent::Repeat(
                GridTemplateRepetition {
                    count: RepetitionCount::Count(*count),
                    tracks: vec![MinMax {
                        min: MinTrackSizingFunction::length(0.0),
                        max: MaxTrackSizingFunction::fr(1.0),
                    }],
                    line_names: Vec::new(),
                },
            )]),
            GridTemplateSpec::Tracks(tracks) => tracks
                .iter()
                .map(|track| match track {
                    GridTrackSpec::Repeat(RepeatTrack { repeat, tracks }) => {
                        Ok(GridTemplateComponent::Repeat(GridTemplateRepetition {
                            count: match repeat {
                                RepeatCount::Times(times) => RepetitionCount::Count(*times),
                                RepeatCount::Auto(AutoRepeat::AutoFill) => {
                                    RepetitionCount::AutoFill
                                }
                                RepeatCount::Auto(AutoRepeat::AutoFit) => RepetitionCount::AutoFit,
                            },
                            tracks: tracks
                                .iter()
                                .map(GridTrackSpec::function)
                                .collect::<Result<_, _>>()?,
                            line_names: Vec::new(),
                        }))
                    }
                    single => Ok(GridTemplateComponent::Single(single.function()?)),
                })
                .collect(),
        }
    }
}

fn validate_tracks(tracks: &[GridTrackSpec]) -> Result<(), String> {
    if tracks.len() > MAX_TRACKS {
        return Err(format!("a template of more than {MAX_TRACKS} tracks"));
    }
    tracks.iter().try_for_each(GridTrackSpec::validate)
}

/// `grid-auto-columns` and `grid-auto-rows`: the pattern of the tracks the grid makes when items need more
/// than the template has.
pub fn validate_auto_tracks(tracks: &[GridTrackSpec]) -> Result<(), String> {
    validate_tracks(tracks)?;
    if tracks
        .iter()
        .any(|track| matches!(track, GridTrackSpec::Repeat(_)))
    {
        return Err("repeat() is for the template, not for implicit tracks".into());
    }
    Ok(())
}

pub fn auto_tracks(tracks: &[GridTrackSpec]) -> Result<Vec<TrackSizingFunction>, String> {
    tracks.iter().map(GridTrackSpec::function).collect()
}

/// `grid-auto-flow`.
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum GridAutoFlowSpec {
    Row,
    Column,
    RowDense,
    ColumnDense,
}

impl From<GridAutoFlowSpec> for GridAutoFlow {
    fn from(flow: GridAutoFlowSpec) -> Self {
        match flow {
            GridAutoFlowSpec::Row => GridAutoFlow::Row,
            GridAutoFlowSpec::Column => GridAutoFlow::Column,
            GridAutoFlowSpec::RowDense => GridAutoFlow::RowDense,
            GridAutoFlowSpec::ColumnDense => GridAutoFlow::ColumnDense,
        }
    }
}

/// One edge of a grid item's area: the `auto` keyword, or a line number (1 is the first line, -1 the last
/// of the explicit grid; there is no line 0).
#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(untagged)]
pub enum GridLineSpec {
    Auto(AutoKeyword),
    Number(i16),
}

#[derive(Clone, Copy, Debug, DeriveDeserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AutoKeyword {
    Auto,
}

impl GridLineSpec {
    pub fn validate(self) -> Result<(), String> {
        match self {
            GridLineSpec::Number(0) => Err("a grid line number must not be 0".into()),
            _ => Ok(()),
        }
    }

    fn placement(self) -> GridPlacement<String> {
        match self {
            GridLineSpec::Auto(AutoKeyword::Auto) => GridPlacement::Auto,
            GridLineSpec::Number(number) => line(number),
        }
    }
}

/// A grid item's area on one axis. `col-span-3` sets `span` alone and `col-start-2` the start alone, as in
/// Tailwind's CSS where `col-span-3` is `grid-column: span 3 / span 3` and a start or end line set by any
/// other class overrides its own side whichever class comes first: here an explicit line beats the span,
/// and a span on both sides leaves the start, as the CSS grid spec does ("remove the span contributed by the
/// end line").
pub fn placement(
    start: Option<GridLineSpec>,
    end: Option<GridLineSpec>,
    span_tracks: Option<u16>,
) -> Line<GridPlacement<String>> {
    let spanned = || span_tracks.map(span::<GridPlacement<String>>);
    let start = start.map(GridLineSpec::placement).or_else(spanned);
    let end = end.map(GridLineSpec::placement).or_else(spanned);
    let end = match (&start, end) {
        (Some(GridPlacement::Span(_)), Some(GridPlacement::Span(_))) => None,
        (_, end) => end,
    };
    Line {
        start: start.unwrap_or(GridPlacement::Auto),
        end: end.unwrap_or(GridPlacement::Auto),
    }
}

#[cfg(test)]
mod tests {
    use taffy::prelude::{AvailableSpace, Size, TaffyTree};

    use super::*;

    fn tracks(json: &str) -> Vec<GridTrackSpec> {
        serde_json::from_str(json).expect("test tracks must parse")
    }

    fn template(json: &str) -> GridTemplateSpec {
        serde_json::from_str(json).expect("test template must parse")
    }

    #[test]
    fn tracks_parse_as_numbers_text_and_functions() {
        let parsed = tracks(
            r#"[200, "1fr", "50%", "auto", {"minmax":[0,"1fr"]}, {"fitContent":120},
                {"repeat":2,"tracks":[10,"2fr"]}, {"repeat":"auto-fill","tracks":[{"minmax":[80,"1fr"]}]}]"#,
        );
        assert_eq!(parsed.len(), 8);
        assert!(validate_tracks(&parsed).is_ok());
        for bad in [
            r#"["2gr"]"#,
            r#"[-1]"#,
            r#"[{"minmax":["1fr",0]}]"#,
            r#"[{"fitContent":"1fr"}]"#,
            r#"[{"repeat":0,"tracks":[1]}]"#,
            r#"[{"repeat":2,"tracks":[]}]"#,
            r#"[{"repeat":"auto-fill","tracks":["1fr"]}]"#,
            r#"[{"repeat":2,"tracks":[{"repeat":2,"tracks":[1]}]}]"#,
            r#"[{"repeat":1001,"tracks":[1]}]"#,
        ] {
            let parsed = tracks(bad);
            assert!(validate_tracks(&parsed).is_err(), "{bad}");
        }
        assert!(serde_json::from_str::<Vec<GridTrackSpec>>(r#"[{"minmax":[1]}]"#).is_err());
        assert!(serde_json::from_str::<Vec<GridTrackSpec>>(r#"[{"span":2}]"#).is_err());
    }

    #[test]
    fn a_template_is_a_count_or_a_list_and_none_is_an_empty_list() {
        assert_eq!(template("3"), GridTemplateSpec::Count(3));
        assert!(template("0").validate().is_err());
        assert_eq!(template("[]"), GridTemplateSpec::Tracks(Vec::new()));
        assert!(template("[]").validate().is_ok());
        assert!(template("[]").components().unwrap().is_empty());
        assert_eq!(template("4").components().unwrap().len(), 1);
        assert!(
            template(r#"["auto",{"repeat":"auto-fit","tracks":[100]}]"#)
                .validate()
                .is_err(),
            "an auto repetition beside a track with no fixed size is refused"
        );
        assert!(
            template(r#"[50,{"repeat":"auto-fit","tracks":[100]}]"#)
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn lines_and_spans_resolve_as_the_cascade_of_the_classes_would() {
        let start = Some(GridLineSpec::Number(2));
        let end = Some(GridLineSpec::Number(-1));
        assert_eq!(
            placement(None, None, Some(3)),
            Line {
                start: GridPlacement::Span(3),
                end: GridPlacement::Auto
            },
            "col-span-3 alone is span 3 / auto"
        );
        assert_eq!(
            placement(start, None, Some(3)),
            Line {
                start: line(2),
                end: GridPlacement::Span(3)
            },
            "col-start-2 col-span-3 (either order) is 2 / span 3"
        );
        assert_eq!(
            placement(None, end, Some(3)),
            Line {
                start: GridPlacement::Span(3),
                end: line(-1)
            }
        );
        assert_eq!(
            placement(start, end, Some(3)),
            Line {
                start: line(2),
                end: line(-1)
            },
            "explicit lines beat the span"
        );
        assert_eq!(
            placement(Some(GridLineSpec::Auto(AutoKeyword::Auto)), None, Some(2)),
            Line {
                start: GridPlacement::Auto,
                end: GridPlacement::Span(2)
            }
        );
        assert_eq!(placement(None, None, None), Line::default());
        assert!(GridLineSpec::Number(0).validate().is_err());
        assert!(GridLineSpec::Number(-3).validate().is_ok());
    }

    #[test]
    fn taffy_lays_out_the_converted_template() {
        let mut tree: TaffyTree<()> = TaffyTree::new();
        let items: Vec<_> = (0..3)
            .map(|index| {
                tree.new_leaf(taffy::Style {
                    size: Size {
                        width: taffy::style::Dimension::auto(),
                        height: taffy::style::Dimension::length(10.0),
                    },
                    grid_column: if index == 0 {
                        placement(None, None, Some(2))
                    } else {
                        Line::default()
                    },
                    ..taffy::Style::default()
                })
                .unwrap()
            })
            .collect();
        let grid = tree
            .new_with_children(
                taffy::Style {
                    display: taffy::Display::Grid,
                    grid_template_columns: template(r#"[40, "1fr", {"minmax":[0,"2fr"]}]"#)
                        .components()
                        .unwrap(),
                    size: Size {
                        width: taffy::style::Dimension::length(220.0),
                        height: taffy::style::Dimension::auto(),
                    },
                    ..taffy::Style::default()
                },
                &items,
            )
            .unwrap();
        tree.compute_layout(
            grid,
            Size {
                width: AvailableSpace::MaxContent,
                height: AvailableSpace::MaxContent,
            },
        )
        .unwrap();
        // 220 = 40 + 60 + 120; the first item spans the 40 and 60 tracks.
        let widths: Vec<f32> = items
            .iter()
            .map(|item| tree.layout(*item).unwrap().size.width)
            .collect();
        assert_eq!(widths, vec![100.0, 120.0, 40.0]);
    }
}
