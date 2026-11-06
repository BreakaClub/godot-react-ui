/** Style values are logical pixels; percentage strings are fractions of the parent. */
export type Dimension = number | 'auto' | `${number}%`;
export type Alignment = 'start' | 'end' | 'center' | 'stretch' | 'baseline' | 'flex-start' | 'flex-end';
export type Justification = 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'flex-start' | 'flex-end';
export type HexColor = `#${string}`;
export type TransitionProperty = 'width' | 'height' | 'opacity' | 'backgroundColor';
export type Overflow = 'visible' | 'hidden';
/** `fixed` is relative to the layer, `absolute` to the nearest positioned ancestor, `relative` to its own flow position. */
export type Position = 'static' | 'relative' | 'absolute' | 'fixed';
/** Pixels or a percentage of the containing block (either may be negative), or `auto`. */
export type Inset = number | 'auto' | `${number}%`;
/** `none` stops an element itself being the target of a pointer; its children still can be. */
export type PointerEvents = 'auto' | 'none';
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
  borderRadius?: number;
  borderWidth?: number;
  opacity?: number;
  textAlign?: 'left' | 'center' | 'right';
  transition?: Transition;
  interpolateSize?: 'numeric-only' | 'allow-keywords';
  /** Shorthand for `overflowX` and `overflowY`. */
  overflow?: Overflow;
  overflowX?: Overflow;
  overflowY?: Overflow;
  /** Inherited. */
  pointerEvents?: PointerEvents;
  /** Inherited. */
  cursor?: Cursor;
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
}

/**
 * What native receives: every shorthand (`padding`, `margin`, `gap`, `overflow`) is expanded to its
 * longhands by the style compiler, so merging layers is a plain ordered overwrite.
 */
export type LonghandStyle = Omit<Style, 'padding' | 'margin' | 'gap' | 'overflow' | 'inset'>;

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
 * `Text` have implicit roles. JavaScript-only until Phase I10 sends it to native.
 */
export type UIRole =
  | 'button' | 'checkbox' | 'switch' | 'radio' | 'radiogroup' | 'group' | 'slider' | 'progressbar'
  | 'textbox' | 'text' | 'link' | 'list' | 'listitem' | 'listbox' | 'option' | 'combobox'
  | 'menu' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'tablist' | 'tab' | 'tabpanel'
  | 'dialog' | 'img' | 'region' | 'tooltip' | 'none' | 'presentation';

/**
 * `role` and the `aria-*` props of plan section 4.2, plus `aria-orientation` (which section 4.2 has
 * no native field for yet). They are JavaScript-only: `nativeProps` drops them and native's
 * `PropsSpec` rejects unknown keys, so they stay out of `NATIVE_PROP_KEYS` until Phase I10 adds the
 * native fields and maps them.
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
