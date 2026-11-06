//! Negative controls for the filters verifier (`docs/tracks/filters.md`, "Negative controls").
//!
//! Each [`Fault`] puts back one of the mistakes the filters (and the glass showcase) were built to avoid, at the one place the fix
//! lives, so the verifier can show the check that guards the fix fails without it. A fault is switched on
//! by the environment variable [`FAULT_ENV`] naming it, read at the fault's own site every time, so the
//! `filters-faults` verifier section can turn faults on and off in one process with
//! `OS.setEnvironment`.
//!
//! The faults exist only in a build made with `--features filter-faults` (`pnpm build:native --faults`).
//! In every other build [`active`] is a constant `false` and each site compiles to its fixed code.

/// The environment variable that names the fault that is on.
#[cfg(feature = "filter-faults")]
pub(crate) const FAULT_ENV: &str = "GODOT_REACT_FILTER_FAULT";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Fault {
    /// The backdrop's copy is asked of the item that draws the blur, not a separate item before it
    /// (stacked panels then read stale mip levels, D40 b).
    MergedCopy,
    /// The copy rectangle is not aligned outward to the blur level's texel size. Not a regression guard:
    /// with the shader placing texels by the region's own origin the residual is small, and the verifier
    /// measures how small.
    UnalignedRegion,
    /// The Compatibility primer that makes a group's mip levels readable is not made.
    NoPrimer,
    /// A copy or group rectangle is computed once and not followed when the element moves or scrolls.
    StaleRects,
    /// A filter group is left to the engine to fit (`fit_empty`, no command of its own): the culler clears
    /// it every frame, dropping the clip owner its composite needs to be cut by an ancestor's clip.
    FitEmptyGroup,
    /// The level's texels are placed by the textbook `2^level` map instead of the engine's own integer
    /// halving of the region, which differs for a target that is not a multiple of `2^level`.
    TextbookChain,
    /// A filter or backdrop-filter inside a filter is drawn, with the wrong colours, and not reported.
    NoNestingCheck,
    /// A filter group's composite multiplies by the inherited opacity again, as the stock composite does
    /// (an ancestor's opacity then applies twice).
    DoubleModulate,
    /// A translucent box with a border is drawn in one `StyleBoxFlat` call, whose ring-inner antialiasing adds the
    /// translucent fill a second time along the border (a dotted hairline at one pixel, doubled at two).
    SingleBorderDraw,
    /// A drop-shadow's offset and reach are not part of the area the composite draws, so it is cut at
    /// the element's box.
    ShadowBoxOnly,
}

#[cfg(feature = "filter-faults")]
impl Fault {
    pub(crate) const fn name(self) -> &'static str {
        match self {
            Fault::MergedCopy => "merged-copy",
            Fault::UnalignedRegion => "unaligned-region",
            Fault::NoPrimer => "no-primer",
            Fault::StaleRects => "stale-rects",
            Fault::FitEmptyGroup => "fit-empty-group",
            Fault::TextbookChain => "textbook-chain",
            Fault::NoNestingCheck => "no-nesting-check",
            Fault::DoubleModulate => "double-modulate",
            Fault::ShadowBoxOnly => "shadow-box-only",
            Fault::SingleBorderDraw => "single-border-draw",
        }
    }
}

/// Whether `fault` is on.
#[cfg(feature = "filter-faults")]
pub(crate) fn active(fault: Fault) -> bool {
    std::env::var(FAULT_ENV).is_ok_and(|name| name == fault.name())
}

/// Whether `fault` is on: never, in a build without the faults.
#[cfg(not(feature = "filter-faults"))]
pub(crate) const fn active(_fault: Fault) -> bool {
    false
}
