//! The user agent's own style: what a browser's stylesheet gives an element before any author style does, and what the library gives the same kinds of element.
//!
//! A [`Kind::Button`] centres its content, as a browser's `<button>` does: the content box is a flex column whose content sits in the middle on both axes, and a
//! label that wraps stays centred (`text-align: center`, which inherits, so the lines of a `Text` inside the button, and of a `View` of `Text`s, are centred too).
//! Each is an ordinary computed property, so an author's `className` or `style` replaces it as it replaces any other: `items-start`, `justify-between`, `flex-row`,
//! `text-left`. The author's layers are merged over this style (`computed_style::resolve`), at the same specificity a UA stylesheet loses to every author rule.
//!
//! What a browser's `button` also has, and this does not: padding (1 x 6 px), a 2 px outset border, a grey background and a system font are the app's look (the
//! library draws none of them for a `View` either); `box-sizing: border-box` is every element's here; `cursor: default` is every element's default;
//! `display: inline-block` is what a flex item is. Chrome gives `align-items` and `justify-content` no declaration at all: the centring is the layout of the
//! button's anonymous inner box, which this expresses with the two properties.

use crate::props::{AlignSpec, JustifySpec, Kind, StyleSpec, TextAlignSpec};

/// Give `spec`, which holds only what `kind`'s parent passes on, the user agent's style for `kind`.
pub(crate) fn apply(kind: Kind, spec: &mut StyleSpec) {
    match kind {
        Kind::Button => {
            spec.align_items = Some(AlignSpec::Center);
            spec.justify_content = Some(JustifySpec::Center);
            spec.text_align = Some(TextAlignSpec::Center);
        }
        Kind::View | Kind::Text | Kind::TextInput | Kind::Image => {}
    }
}
