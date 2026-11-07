/** Style values are logical pixels; percentage strings are fractions of the parent. */
export type Dimension = number | 'auto' | `${number}%`;
export type Alignment = 'start' | 'end' | 'center' | 'stretch' | 'baseline' | 'flex-start' | 'flex-end';
export type Justification = 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'flex-start' | 'flex-end';
export type HexColor = `#${string}`;
export type TransitionProperty = 'width' | 'height' | 'opacity' | 'backgroundColor' | 'filter' | 'backdropFilter';
/**
 * `scroll` and `auto` make the axis scroll. They behave the same: the scrollbars overlay the content,
 * take no layout space, and a bar is drawn only while there is something to scroll to.
 */
export type Overflow = 'visible' | 'hidden' | 'scroll' | 'auto';
/** `contain` ends scroll chaining at the element: a scroll it cannot take does not reach the container behind it. */
export type OverscrollBehavior = 'auto' | 'contain';
/** `none` hides a scroll container's overlay scrollbars; it still scrolls. */
export type ScrollbarWidth = 'auto' | 'none';
/**
 * Which pans a touch that starts on the element may become. `none` leaves the touch to the element's pointer
 * events; `pan-x` and `pan-y` allow one axis. It is intersected along the path from the touched element to
 * the scroll container that would pan.
 */
export type TouchAction = 'auto' | 'none' | 'pan-x' | 'pan-y';
/** `fixed` is relative to the layer, `absolute` to the nearest positioned ancestor, `relative` to its own flow position. */
export type Position = 'static' | 'relative' | 'absolute' | 'fixed';
/** Pixels or a percentage of the containing block (either may be negative), or `auto`. */
export type Inset = number | 'auto' | `${number}%`;
/** `none` stops an element itself being the target of a pointer; its children still can be. */
export type PointerEvents = 'auto' | 'none';
/** `text` lets the pointer select an element's text (and, inherited, the text below it); the default is `none`. */
export type UserSelect = 'none' | 'text';
/**
 * CSS `font-weight`: a number from 1 to 1000 (Tailwind's names are 100 to 900), or `normal` (400) or `bold` (700). Inherited.
 * The nearest registered face is used (CSS font matching), and a bold request with no face of weight 600 or more is emboldened.
 */
export type FontWeight = number | 'normal' | 'bold';
/** Inherited. `italic` uses an italic face of the family when one is registered, else slants the upright one. */
export type FontStyle = 'normal' | 'italic';
/**
 * CSS `line-height`, inherited. A number is px (every length in a `Style` is), `normal` is the font's own metrics, and a string
 * is CSS's other forms: `'1.5'` a unitless factor of each element's own font size (inherited as the factor), `'1.5em'` and
 * `'150%'` lengths of this element's font size (inherited as px). Lines are placed with half-leading above and below, as a
 * browser does, including the first.
 */
export type LineHeight = number | 'normal' | `${number}` | `${number}em` | `${number}%`;
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
/** `none`, or one to three of the lines (CSS `text-decoration-line`). */
export type TextDecorationLine =
  | 'none' | 'underline' | 'overline' | 'line-through' | 'underline overline' | 'underline line-through'
  | 'overline line-through' | 'underline overline line-through';
export type TextOverflow = 'clip' | 'ellipsis';
export type WhiteSpace = 'normal' | 'nowrap' | 'pre' | 'pre-line' | 'pre-wrap' | 'break-spaces';
export type WordBreak = 'normal' | 'break-all' | 'keep-all';
export type OverflowWrap = 'normal' | 'break-word' | 'anywhere';
export type NumericFigure = 'normal' | 'lining' | 'oldstyle';
export type NumericSpacing = 'normal' | 'proportional' | 'tabular';
export type NumericFraction = 'normal' | 'diagonal' | 'stacked';
export type Cursor =
  | 'default' | 'pointer' | 'text' | 'move' | 'grab' | 'grabbing' | 'not-allowed' | 'crosshair'
  | 'wait' | 'progress' | 'help' | 'ew-resize' | 'ns-resize' | 'nesw-resize' | 'nwse-resize';
export interface Transition {
  properties: readonly TransitionProperty[];
  durationMs: number;
  delayMs?: number;
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/** Layout and paint properties understood by the native Taffy renderer. */
export interface Style {
  width?: Dimension;
  height?: Dimension;
  minWidth?: Dimension;
  minHeight?: Dimension;
  maxWidth?: Dimension;
  maxHeight?: Dimension;
  display?: 'flex' | 'grid' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: Dimension;
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  alignItems?: Alignment;
  alignSelf?: Alignment;
  justifyContent?: Justification;
  gridTemplateColumns?: number;
  backgroundColor?: HexColor;
  color?: HexColor;
  borderColor?: HexColor;
  fontSize?: number;
  /**
   * Inherited. A family registered with `ReactUiRoot.registerFontFace` (`sans`, `serif`, `mono` or any name), or a comma
   * separated list of them: the first registered one is used. A name nothing registered uses the root's theme font.
   */
  fontFamily?: string;
  /** Inherited. */
  fontWeight?: FontWeight;
  /** Inherited. */
  fontStyle?: FontStyle;
  /** Inherited. See `LineHeight`. */
  lineHeight?: LineHeight;
  /**
   * Inherited. Added after every character, the last of a line included, as CSS does. A number is px; `'0.05em'` is a length
   * of this element's font size (inherited as px). Fractions of a pixel are exact (`docs/tracks/utilities-text.md`).
   */
  letterSpacing?: number | `${number}em`;
  /** Inherited. The text is shown, selected and copied transformed. */
  textTransform?: TextTransform;
  /** Propagates to the in-flow text below the element it is set on, which draws it in the colour and thickness set there. */
  textDecorationLine?: TextDecorationLine;
  /** The colour of the decoration lines; the element's own text colour when not set. */
  textDecorationColor?: HexColor;
  /** px, or `auto` (the font's underline thickness) or `from-font` (the same). */
  textDecorationThickness?: number | 'auto' | 'from-font';
  /** Inherited. px below the baseline's natural underline position, or `auto` (the font's own). */
  textUnderlineOffset?: number | 'auto';
  /** Not inherited. `ellipsis` replaces what a line cannot show, when the element clips (`overflow` not `visible`). */
  textOverflow?: TextOverflow;
  /** Inherited. */
  whiteSpace?: WhiteSpace;
  /** Inherited. */
  wordBreak?: WordBreak;
  /** Inherited. */
  overflowWrap?: OverflowWrap;
  /** Not inherited. At most this many lines show, the last ending in an ellipsis; `none` (or unset) shows them all. */
  lineClamp?: number | 'none';
  /** Inherited. OpenType `lnum` and `onum`. */
  numericFigure?: NumericFigure;
  /** Inherited. OpenType `pnum` and `tnum`. */
  numericSpacing?: NumericSpacing;
  /** Inherited. OpenType `frac` (`diagonal`) and `afrc` (`stacked`). */
  numericFraction?: NumericFraction;
  /** Inherited. OpenType `ordn`. */
  ordinal?: boolean;
  /** Inherited. OpenType `zero`. */
  slashedZero?: boolean;
  borderRadius?: number;
  borderWidth?: number;
  opacity?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';
  transition?: Transition;
  interpolateSize?: 'numeric-only' | 'allow-keywords';
  /** Shorthand for `overflowX` and `overflowY`. `scroll` and `auto` make a scroll container. */
  overflow?: Overflow;
  overflowX?: Overflow;
  overflowY?: Overflow;
  overscrollBehavior?: OverscrollBehavior;
  scrollbarWidth?: ScrollbarWidth;
  /** Inherited. The colour of a scroll container's overlay scrollbar thumbs. */
  scrollbarColor?: HexColor;
  /** Inherited. The colour of a text input's caret; its text colour when not set. */
  caretColor?: HexColor;
  /** Inherited. The colour of a text input's placeholder; its text colour at half alpha when not set. */
  placeholderColor?: HexColor;
  touchAction?: TouchAction;
  /** Inherited. */
  pointerEvents?: PointerEvents;
  /** Inherited. */
  cursor?: Cursor;
  /**
   * Inherited. `text` lets the mouse select the text of `Text` elements (click, double click, triple click, drag,
   * Shift+click) and copy it; the default is `none`. Text inside a `Button` is never selectable.
   */
  userSelect?: UserSelect;
  /** Inherited. The colour of the selection highlight (`#RRGGBBAA` for a translucent one). */
  selectionColor?: HexColor;
  position?: Position;
  /** Offsets from the containing block's edges for `relative`, `absolute` and `fixed` elements. */
  top?: Inset;
  right?: Inset;
  bottom?: Inset;
  left?: Inset;
  /** Shorthand for `top`, `right`, `bottom` and `left`. */
  inset?: Inset;
  /**
   * Orders an element among the siblings its paint parent paints (React Native's `zIndex`: it applies to
   * every element, creates no stacking context, and an `absolute` element competes with its containing
   * block's children, not with its own siblings).
   */
  zIndex?: number;
  /**
   * CSS filter functions applied to the element and everything inside it: `blur(<px>)`, `brightness()`,
   * `contrast()`, `grayscale()`, `hue-rotate()`, `invert()`, `opacity()`, `saturate()`, `sepia()` and one
   * `drop-shadow()` (not before a `blur()`), or `none`. Lengths are px. It replaces whatever filter utility
   * classes set, where `blur-sm hover:brightness-110` composes. A filter inside another filter, or a
   * `backdropFilter` inside a filter, is an error (Godot's canvas groups do not nest).
   */
  filter?: string;
  /**
   * The same functions, applied to what is behind the element (the render target as drawn so far: React
   * siblings, the main layer under a `Portal`, and Godot content behind the root) inside the element's
   * rounded border box: frosted glass. There is no `drop-shadow()` here.
   */
  backdropFilter?: string;
}

/** The functions Tailwind's separate filter utilities set; each merges on its own across variants. */
export interface FilterParts {
  /** CSS pixels. */
  blur?: number;
  brightness?: number;
  contrast?: number;
  grayscale?: number;
  /** Degrees. */
  hueRotate?: number;
  invert?: number;
  /** `backdropFilter` only (Tailwind's `backdrop-opacity-*`; `opacity-*` is the element's own opacity). */
  opacity?: number;
  saturate?: number;
  sepia?: number;
  /** `filter` only. `'none'` removes a shadow a lower layer set. */
  dropShadow?: { x: number; y: number; blur: number; color: string } | 'none';
}

/**
 * What native receives: every shorthand (`padding`, `margin`, `gap`, `overflow`) is expanded to its
 * longhands by the style compiler, so merging layers is a plain ordered overwrite.
 */
export type LonghandStyle = Omit<Style, 'padding' | 'margin' | 'gap' | 'overflow' | 'inset' | 'fontWeight'> & {
  /** The weight as a number: `normal` and `bold` are resolved by the compiler. */
  fontWeight?: number;
  /** What filter utilities (`blur-sm`, `hover:brightness-110`) set, per function (see `FilterParts`). */
  filterParts?: FilterParts;
  backdropFilterParts?: FilterParts;
};

export type StyleProp = Style | readonly StyleProp[] | false | null | undefined;

/** The conditions a style layer can depend on besides the viewport width (plan 3.6). */
export type PseudoState = 'hover' | 'active' | 'focus' | 'focusVisible' | 'focusWithin' | 'disabled';

/** One compiled class or inline style; native applies it when its conditions hold. */
export interface StyleLayer {
  readonly minWidth?: number;
  readonly states?: readonly PseudoState[];
  readonly style: Readonly<LonghandStyle>;
}

/**
 * A class string and inline style compiled to ordered layers. Equal inputs return the identical
 * (interned, frozen) object, so a prop diff can compare styles by identity.
 */
export interface CompiledStyle {
  readonly layers: readonly StyleLayer[];
}

/**
 * The `role` values the accessibility tree understands (plan Appendix D). `Button`, `TextInput` and
 * `Text` have implicit roles. Sent to native as the `role` prop; `none` and `presentation` keep an
 * element out of the tree.
 */
export type UIRole =
  | 'button' | 'checkbox' | 'switch' | 'radio' | 'radiogroup' | 'group' | 'slider' | 'progressbar'
  | 'textbox' | 'text' | 'link' | 'list' | 'listitem' | 'listbox' | 'option' | 'combobox'
  | 'menu' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'tablist' | 'tab' | 'tabpanel'
  | 'dialog' | 'img' | 'region' | 'tooltip' | 'none' | 'presentation';

/**
 * `role` and the `aria-*` props of plan section 4.2, plus `aria-orientation` (Phase I10 adds the
 * native `ariaOrientation` field for it). `nativeProps` maps each JSX name to the camelCase native
 * field (`aria-valuenow` to `ariaValueNow`) and native applies them to the accessibility tree.
 */
export interface UIAriaProps {
  role?: UIRole;
  'aria-label'?: string;
  'aria-description'?: string;
  'aria-valuetext'?: string;
  'aria-placeholder'?: string;
  'aria-hidden'?: boolean;
  'aria-disabled'?: boolean;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-readonly'?: boolean;
  'aria-required'?: boolean;
  'aria-modal'?: boolean;
  /** `'mixed'` is the third state of a checkbox. */
  'aria-checked'?: boolean | 'mixed';
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-orientation'?: 'horizontal' | 'vertical';
}
