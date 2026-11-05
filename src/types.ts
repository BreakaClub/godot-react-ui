/** Style values are logical pixels; percentage strings are fractions of the parent. */
export type Dimension = number | 'auto' | `${number}%`;
export type Alignment = 'start' | 'end' | 'center' | 'stretch' | 'baseline' | 'flex-start' | 'flex-end';
export type Justification = 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'flex-start' | 'flex-end';
export type HexColor = `#${string}`;
export type TransitionProperty = 'width' | 'height' | 'opacity' | 'backgroundColor';
export type Overflow = 'visible' | 'hidden';
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
  /** Removed with the v1 renderer in Phase F3: `disabled` is a prop of the element, not a style. */
  disabled?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  transition?: Transition;
  interpolateSize?: 'numeric-only' | 'allow-keywords';
  /** Shorthand for `overflowX` and `overflowY`. */
  overflow?: Overflow;
  overflowX?: Overflow;
  overflowY?: Overflow;
}

/**
 * What native receives: every shorthand (`padding`, `margin`, `gap`, `overflow`) is expanded to its
 * longhands by the style compiler, so merging layers is a plain ordered overwrite.
 */
export type LonghandStyle = Omit<Style, 'padding' | 'margin' | 'gap' | 'overflow' | 'disabled'>;

export type StyleProp = Style | readonly StyleProp[] | false | null | undefined;

export interface StyleState {
  /** Active root-local logical viewport width, rather than host-window pixels. */
  width: number;
  hover?: boolean;
  active?: boolean;
  focus?: boolean;
  focusVisible?: boolean;
  focusWithin?: boolean;
  disabled?: boolean;
}

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
