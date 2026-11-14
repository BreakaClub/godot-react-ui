import { borderImageUtility, mergeBorderImage, type BorderImageKeys, type BorderImageUtilityStyle } from './border-image';
import type {
  BoxShadowParts, GradientDirection, HexColor, LonghandStyle, ShadowPartLayer, Style,
} from '../types';

/**
 * Tailwind v3 (3.4.17) utilities that paint a box beyond its fill: box shadows and rings, outlines, borders and corners by
 * side, and linear gradients. `utilityStyle` in `styles.ts` asks `paintUtility` first; the parts it returns are merged
 * per variable across variants by `mergePaint`, the way `filterParts` are (`blur-sm hover:brightness-110`).
 */

/** What `styles.ts` shares with this module, passed in so the two do not import each other. */
export interface PaintHelpers {
  /** A palette colour (`red-500`), a hex colour (`[#f00]`), either with an opacity modifier (`red-500/50`). */
  parseColor(value: string): HexColor | undefined;
  /** `px`, `[3px]` or a number times `scale`. */
  parsePixels(value: string, scale?: number): number | undefined;
  /** The `rounded-*` scale. */
  radii: Readonly<Record<string, number>>;
}

/** What a paint utility sets: styles, and the two composed families. */
export type PaintStyle = Omit<Style, keyof BorderImageUtilityStyle> & Pick<LonghandStyle, 'boxShadowParts' | 'gradientParts'> & BorderImageUtilityStyle;

const PERCENT = 100;
/** The steps of Tailwind's `ringWidth`, `ringOffsetWidth`, `outlineWidth` and `outlineOffset` scales, and `borderWidth`. */
const WIDTH_STEPS = [0, 1, 2, 4, 8];
const RING_DEFAULT_WIDTH = 3;
/** `outline-none`: Tailwind's `outline: 2px solid transparent; outline-offset: 2px`. */
const OUTLINE_NONE_WIDTH = 2;
const OUTLINE_NONE_OFFSET = 2;
/** The positions Tailwind names for gradient stops: 0% to 100% in steps of 5. */
const POSITION_STEP = 5;
const TRANSPARENT: HexColor = '#00000000';

const black = (alpha: number): string => `rgba(0, 0, 0, ${alpha})`;

/** Tailwind v3's `boxShadow` scale, layer by layer (`rgb(0 0 0 / 0.1)` is `rgba(0, 0, 0, 0.1)`). */
const SHADOWS: Readonly<Record<string, readonly ShadowPartLayer[] | 'none'>> = {
  sm: [{ x: 0, y: 1, blur: 2, spread: 0, color: black(0.05) }],
  DEFAULT: [
    { x: 0, y: 1, blur: 3, spread: 0, color: black(0.1) },
    { x: 0, y: 1, blur: 2, spread: -1, color: black(0.1) },
  ],
  md: [
    { x: 0, y: 4, blur: 6, spread: -1, color: black(0.1) },
    { x: 0, y: 2, blur: 4, spread: -2, color: black(0.1) },
  ],
  lg: [
    { x: 0, y: 10, blur: 15, spread: -3, color: black(0.1) },
    { x: 0, y: 4, blur: 6, spread: -4, color: black(0.1) },
  ],
  xl: [
    { x: 0, y: 20, blur: 25, spread: -5, color: black(0.1) },
    { x: 0, y: 8, blur: 10, spread: -6, color: black(0.1) },
  ],
  '2xl': [{ x: 0, y: 25, blur: 50, spread: -12, color: black(0.25) }],
  inner: [{ x: 0, y: 2, blur: 4, spread: 0, color: black(0.05), inset: true }],
  none: 'none',
};

const GRADIENT_DIRECTIONS: readonly GradientDirection[] = ['to-t', 'to-tr', 'to-r', 'to-br', 'to-b', 'to-bl', 'to-l', 'to-tl'];

type Side = 'Top' | 'Right' | 'Bottom' | 'Left';
type Corner = 'TopLeft' | 'TopRight' | 'BottomRight' | 'BottomLeft';
const SIDES: Readonly<Record<string, readonly Side[]>> = {
  t: ['Top'], r: ['Right'], b: ['Bottom'], l: ['Left'], x: ['Left', 'Right'], y: ['Top', 'Bottom'],
};
const CORNERS: Readonly<Record<string, readonly Corner[]>> = {
  t: ['TopLeft', 'TopRight'], r: ['TopRight', 'BottomRight'], b: ['BottomRight', 'BottomLeft'], l: ['TopLeft', 'BottomLeft'],
  tl: ['TopLeft'], tr: ['TopRight'], br: ['BottomRight'], bl: ['BottomLeft'],
};

function lookup<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

/** `[6px]` or `[0]`, a length in px (an arbitrary value, `_` standing for a space elsewhere). */
function arbitraryLength(value: string): number | undefined {
  const match = /^\[(-?\d*\.?\d+)(px)?\]$/i.exec(value);
  if (match?.[1] === undefined) return undefined;
  const amount = Number(match[1]);
  return match[2] !== undefined || amount === 0 ? amount : undefined;
}

/** One of Tailwind's width steps (`2` is 2 px) or an arbitrary length. */
function stepWidth(value: string): number | undefined {
  if (/^\d+$/.test(value)) return WIDTH_STEPS.includes(Number(value)) ? Number(value) : undefined;
  const length = arbitraryLength(value);
  return length !== undefined && length >= 0 ? length : undefined;
}

/** The text inside `[...]` with `_` as a space, as Tailwind reads an arbitrary value. */
function arbitraryText(value: string): string | undefined {
  const inner = /^\[(.+)\]$/.exec(value)?.[1];
  return inner?.replaceAll('_', ' ');
}

/** The colours a shadow may be written with: hex, `rgb()`, `rgba()` and the three keywords native knows. */
const SHADOW_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([^()]*\)|black|white|transparent|currentcolor)$/i;

/** A box-shadow list in an arbitrary value: `0 4px 12px rgba(0,0,0,0.3)`, layers separated by commas. */
function parseShadowLayers(text: string): ShadowPartLayer[] | undefined {
  const layers: ShadowPartLayer[] = [];
  let depth = 0;
  let start = 0;
  const parts: string[] = [];
  for (let index = 0; index <= text.length; index += 1) {
    const character = text[index];
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (index === text.length || (character === ',' && depth === 0)) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  for (const part of parts) {
    const tokens: string[] = [];
    let token = '';
    depth = 0;
    for (const character of part.trim()) {
      if (character === '(') depth += 1;
      if (character === ')') depth -= 1;
      if (/\s/.test(character) && depth === 0) {
        if (token !== '') tokens.push(token);
        token = '';
      } else {
        token += character;
      }
    }
    if (token !== '') tokens.push(token);
    const lengths: number[] = [];
    let color: string | undefined;
    let inset = false;
    for (const entry of tokens) {
      const length = /^(-?\d*\.?\d+)(px)?$/i.exec(entry);
      if (entry.toLowerCase() === 'inset' && !inset) {
        inset = true;
      } else if (length?.[1] !== undefined && (length[2] !== undefined || Number(length[1]) === 0)) {
        lengths.push(Number(length[1]));
      } else if (color === undefined && SHADOW_COLOR.test(entry)) {
        color = entry;
      } else {
        return undefined;
      }
    }
    if (lengths.length < 2 || lengths.length > 4 || (lengths[2] ?? 0) < 0) return undefined;
    const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
    layers.push({ x, y, blur, spread, color: color ?? 'currentcolor', ...(inset ? { inset } : {}) });
  }
  return layers.length > 0 ? layers : undefined;
}

function shadowUtility(utility: string, helpers: PaintHelpers): PaintStyle | undefined {
  if (utility !== 'shadow' && !utility.startsWith('shadow-')) return undefined;
  const value = utility === 'shadow' ? 'DEFAULT' : utility.slice('shadow-'.length);
  const named = lookup(SHADOWS, value);
  if (named !== undefined) return { boxShadowParts: { shadow: named } };
  const color = helpers.parseColor(value);
  if (color !== undefined) return { boxShadowParts: { shadowColor: color } };
  const layers = parseShadowLayers(arbitraryText(value) ?? '');
  return layers === undefined ? undefined : { boxShadowParts: { shadow: layers } };
}

function ringUtility(utility: string, helpers: PaintHelpers): PaintStyle | undefined {
  if (utility !== 'ring' && !utility.startsWith('ring-')) return undefined;
  const parts = (set: BoxShadowParts): PaintStyle => ({ boxShadowParts: set });
  if (utility === 'ring') return parts({ ringWidth: RING_DEFAULT_WIDTH });
  const value = utility.slice('ring-'.length);
  if (value === 'inset') return parts({ ringInset: true });
  if (value.startsWith('offset-')) {
    const offset = value.slice('offset-'.length);
    const width = stepWidth(offset);
    if (width !== undefined) return parts({ ringOffsetWidth: width });
    const color = helpers.parseColor(offset);
    return color === undefined ? undefined : parts({ ringOffsetColor: color });
  }
  const width = stepWidth(value);
  if (width !== undefined) return parts({ ringWidth: width });
  const color = helpers.parseColor(value);
  return color === undefined ? undefined : parts({ ringColor: color });
}

function outlineUtility(utility: string, helpers: PaintHelpers): Style | undefined {
  const negative = utility.startsWith('-');
  const name = negative ? utility.slice(1) : utility;
  if (name !== 'outline' && !name.startsWith('outline-')) return undefined;
  if (name.startsWith('outline-offset-')) {
    const value = name.slice('outline-offset-'.length);
    const offset = stepWidth(value);
    if (offset === undefined) return undefined;
    return { outlineOffset: negative && offset !== 0 ? -offset : offset };
  }
  if (negative) return undefined;
  if (name === 'outline') return { outlineStyle: 'solid' };
  const value = name.slice('outline-'.length);
  if (value === 'none') {
    return { outlineStyle: 'solid', outlineWidth: OUTLINE_NONE_WIDTH, outlineColor: TRANSPARENT, outlineOffset: OUTLINE_NONE_OFFSET };
  }
  const width = stepWidth(value);
  if (width !== undefined) return { outlineWidth: width };
  const color = helpers.parseColor(value);
  return color === undefined ? undefined : { outlineColor: color };
}

function borderUtility(utility: string, helpers: PaintHelpers): Style | undefined {
  if (utility === 'border-solid') return { borderStyle: 'solid' };
  if (utility === 'border-none') return { borderStyle: 'none' };
  const match = /^border-(t|r|b|l|x|y)(?:-(.+))?$/.exec(utility);
  const sides = match?.[1] === undefined ? undefined : lookup(SIDES, match[1]);
  if (sides === undefined) return undefined;
  const value = match?.[2];
  const style: Style = {};
  if (value === undefined) {
    for (const side of sides) Reflect.set(style, `border${side}Width`, 1);
    return style;
  }
  const width = helpers.parsePixels(value, 1);
  if (width !== undefined) {
    if (!Number.isFinite(width) || width < 0) return undefined;
    for (const side of sides) Reflect.set(style, `border${side}Width`, width);
    return style;
  }
  const color = helpers.parseColor(value);
  if (color === undefined) return undefined;
  for (const side of sides) Reflect.set(style, `border${side}Color`, color);
  return style;
}

function roundedUtility(utility: string, helpers: PaintHelpers): Style | undefined {
  const match = /^rounded-(t|r|b|l|tl|tr|br|bl)(?:-(.+))?$/.exec(utility);
  const corners = match?.[1] === undefined ? undefined : lookup(CORNERS, match[1]);
  if (corners === undefined) return undefined;
  const size = match?.[2];
  const radius = size === undefined ? helpers.radii.DEFAULT : lookup(helpers.radii, size) ?? helpers.parsePixels(size, 1);
  if (radius === undefined || !Number.isFinite(radius) || radius < 0) return undefined;
  const style: Style = {};
  for (const corner of corners) Reflect.set(style, `border${corner}Radius`, radius);
  return style;
}

/** `10%`: a gradient stop position from Tailwind's scale, or an arbitrary `[12%]`. */
function stopPosition(value: string): number | undefined {
  const named = /^(\d+)%$/.exec(value);
  if (named?.[1] !== undefined) {
    const percent = Number(named[1]);
    return percent <= PERCENT && percent % POSITION_STEP === 0 ? percent : undefined;
  }
  const arbitrary = /^\[(\d*\.?\d+)%\]$/.exec(value);
  return arbitrary?.[1] === undefined ? undefined : Number(arbitrary[1]);
}

function gradientUtility(utility: string, helpers: PaintHelpers): PaintStyle | undefined {
  const direction = /^bg-gradient-(to-(?:t|tr|r|br|b|bl|l|tl))$/.exec(utility)?.[1];
  const named = GRADIENT_DIRECTIONS.find(candidate => candidate === direction);
  if (named !== undefined) return { gradientParts: { direction: named } };
  if (utility === 'bg-none') return { backgroundImage: 'none' };
  if (utility.startsWith('bg-[')) {
    const image = arbitraryText(utility.slice('bg-'.length));
    return image?.startsWith('linear-gradient(') ? { backgroundImage: image } : undefined;
  }
  const stop = /^(from|via|to)-(.+)$/.exec(utility);
  const which = stop?.[1];
  const value = stop?.[2];
  if ((which !== 'from' && which !== 'via' && which !== 'to') || value === undefined) return undefined;
  const position = stopPosition(value);
  if (position !== undefined) {
    const positions = { from: { fromPosition: position }, via: { viaPosition: position }, to: { toPosition: position } };
    return { gradientParts: positions[which] };
  }
  const color = helpers.parseColor(value);
  if (color === undefined) return undefined;
  const colors = { from: { from: color }, via: { via: color }, to: { to: color } };
  return { gradientParts: colors[which] };
}

/** The style a paint utility sets, or `undefined` when the class is not one of them. */
export function paintUtility(utility: string, helpers: PaintHelpers): PaintStyle | undefined {
  return shadowUtility(utility, helpers)
    ?? ringUtility(utility, helpers)
    ?? outlineUtility(utility, helpers)
    ?? borderUtility(utility, helpers)
    ?? roundedUtility(utility, helpers)
    ?? borderImageUtility(utility)
    ?? gradientUtility(utility, helpers);
}

const SIDE_WIDTHS = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'] as const;
const SIDE_COLORS = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'] as const;
const CORNER_RADII = [
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
] as const;

/**
 * Merge what a style sets of the composed paint properties into `target`, the way native merges layers: an explicit
 * `boxShadow` or `backgroundImage` replaces the utilities' parts and forgets them, parts set after it take the property
 * back, and a shorthand (`borderWidth`, `borderColor`, `borderRadius`) set after sides or corners resets them. Returns the
 * rest of the style, for the caller to copy over.
 */
export function mergePaint<T extends Readonly<PaintStyle>>(target: LonghandStyle, source: T): Omit<T, 'boxShadow' | 'boxShadowParts' | 'backgroundImage' | 'gradientParts' | BorderImageKeys> {
  const {
    boxShadow, boxShadowParts, backgroundImage, gradientParts, borderImageSlice, borderImageWidth, borderImageOutset,
    borderImageSliceParts, borderImageWidthParts, borderImageOutsetParts, ...rest
  } = source;
  mergeBorderImage(target, {
    borderImageSlice, borderImageWidth, borderImageOutset, borderImageSliceParts, borderImageWidthParts, borderImageOutsetParts,
  });
  if (boxShadow !== undefined) {
    target.boxShadow = boxShadow;
    delete target.boxShadowParts;
  }
  if (boxShadowParts !== undefined) {
    delete target.boxShadow;
    target.boxShadowParts = { ...target.boxShadowParts, ...boxShadowParts };
  }
  if (backgroundImage !== undefined) {
    target.backgroundImage = backgroundImage;
    delete target.gradientParts;
  }
  if (gradientParts !== undefined) {
    delete target.backgroundImage;
    target.gradientParts = { ...target.gradientParts, ...gradientParts };
  }
  const shorthands: readonly [string, readonly (keyof LonghandStyle)[]][] = [
    ['borderWidth', SIDE_WIDTHS], ['borderColor', SIDE_COLORS], ['borderRadius', CORNER_RADII],
  ];
  for (const [shorthand, longhands] of shorthands) {
    if (Reflect.get(rest, shorthand) === undefined) continue;
    for (const longhand of longhands) Reflect.deleteProperty(target, longhand);
  }
  return rest;
}
