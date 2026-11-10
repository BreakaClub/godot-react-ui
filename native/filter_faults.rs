//! Negative controls for the filters verifier.
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
// Two faults are only read inside code that exists in the faults build.
#[cfg_attr(not(feature = "filter-faults"), allow(dead_code))]
pub(crate) enum Fault {
    /// The backdrop's copy is asked of the item that draws the blur, not a separate item before it
    /// (stacked panels then read stale mip levels).
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
    /// Every renderer places the level's texels by the copy region, as only Compatibility does. On Mobile and Forward+ the
    /// engine normalises by the whole target, so on a target that does not halve exactly the blur lands in the wrong place.
    RegionChain,
    /// The Compatibility mipmap primer is one pair of items under the first layer's root, once for the tree, as it was.
    /// A mip-less backdrop drawn after it and before a group clears the flag it set.
    RootPrimer,
    /// An element's backdrop is drawn inside its own filter group (a child of the box item, below the wrapper).
    BackdropInWrapper,
    /// What an element's effect kept (material, shape, copy rectangle) is kept when its canvas items go, and the next
    /// items get none of it.
    KeepEffectState,
    /// An element held back by a filter group is forgotten, so nothing looks at it again when the group goes.
    BlockedForgotten,
    /// The group's mipmap region is biased uncut, so a negative origin truncates the engine's region a pixel too far.
    TruncatedBias,
    /// A rectangle in the group's frame is the transformed corner and the size's absolute value, not the covering box.
    CornerRect,
    /// The root reads the viewport's transform only when something else makes it look (no frame while an effect exists).
    StaleViewport,
    /// Every group walks its whole subtree again whenever anything changes anywhere.
    WalkEverySubtree,
    /// A filtered element with an opacity of 0 keeps its group visible and pays for it.
    VisibleAtZeroOpacity,
    /// Changed text does not tell the groups above it to measure again.
    TextUnnoticed,
    /// Forward+ is planned with the dual filter's variance (the model before it was measured).
    DualFilterOnForwardPlus,
    /// The root-to-target transform is the viewport's `get_final_transform`, which for a window includes the map from the
    /// target to the screen (a window in `viewport` content-scale mode).
    WindowTransform,
    /// A root that is back in the tree keeps the transform its plans were made for, so an effect that was committed while
    /// it was outside is never planned.
    KeepTransformOutOfTree,
    /// Hit testing ignores an element's transform: the point is tested against the layout box, not the turned or scaled one
    /// (negative controls; the transforms section shares this build).
    TransformHitFlat,
    /// The bounding box of a turned or scaled rectangle is the untransformed rectangle moved by the map's translation, so
    /// `getRect()` of a rotated element is its layout size.
    TransformRectUnbounded,
    /// The focus ring of a turned element is drawn on its bounding box, not in its own frame.
    TransformRingFlat,
    /// Text, rounded corners and scroll bar ends are rasterised at the viewport's scale whatever transform scales them.
    TransformRasterUnscaled,
    /// A transformed element is not the containing block of the absolute elements below it (only a positioned one is).
    TransformNoContainingBlock,
    /// The feather of a box under a transform is one length sized for the axis the transform stretches most (as `StyleBoxFlat`
    /// has it) and not one per axis, so it is narrower than a pixel on the squeezed axis and a straight edge there comes out
    /// hard.
    TransformFeatherUniform,
    /// A box under a transform is left to `StyleBoxFlat`, which antialiases only a rounded or skewed one and has one feather
    /// length: a box with square corners comes out as a staircase.
    TransformBoxesHard,
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
            Fault::RegionChain => "region-chain",
            Fault::RootPrimer => "root-primer",
            Fault::BackdropInWrapper => "backdrop-in-wrapper",
            Fault::KeepEffectState => "keep-effect-state",
            Fault::BlockedForgotten => "blocked-forgotten",
            Fault::TruncatedBias => "truncated-bias",
            Fault::CornerRect => "corner-rect",
            Fault::StaleViewport => "stale-viewport",
            Fault::WalkEverySubtree => "walk-every-subtree",
            Fault::VisibleAtZeroOpacity => "visible-at-zero-opacity",
            Fault::TextUnnoticed => "text-unnoticed",
            Fault::DualFilterOnForwardPlus => "dual-filter-on-forward-plus",
            Fault::KeepTransformOutOfTree => "keep-transform-out-of-tree",
            Fault::WindowTransform => "window-transform",
            Fault::TransformHitFlat => "transform-hit-flat",
            Fault::TransformRectUnbounded => "transform-rect-unbounded",
            Fault::TransformRingFlat => "transform-ring-flat",
            Fault::TransformRasterUnscaled => "transform-raster-unscaled",
            Fault::TransformNoContainingBlock => "transform-no-containing-block",
            Fault::TransformFeatherUniform => "transform-feather-uniform",
            Fault::TransformBoxesHard => "transform-boxes-hard",
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
