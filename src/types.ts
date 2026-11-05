/** Native protocol v1. Values are logical pixels; percentage strings are fractions of the parent. */
export type Dimension = number | 'auto' | `${number}%`;
export type Alignment = 'start' | 'end' | 'center' | 'stretch' | 'baseline' | 'flex-start' | 'flex-end';
export type Justification = 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'flex-start' | 'flex-end';
export type HexColor = `#${string}`;
export type TransitionProperty = 'width' | 'height' | 'opacity' | 'backgroundColor';
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
  disabled?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  transition?: Transition;
  interpolateSize?: 'numeric-only' | 'allow-keywords';
  overflow?: 'visible' | 'hidden';
}

export type StyleProp = Style | readonly StyleProp[] | false | null | undefined;

export interface StyleState {
  /** Active root-local logical viewport width, rather than host-window pixels. */
  width: number;
  hover?: boolean;
  active?: boolean;
  focus?: boolean;
  disabled?: boolean;
}
