import type {
  BorderImageEdgeParts, BorderImageEdgeValue, BorderImageRepeat, BorderImageSliceParts, BorderImageSliceValue, BorderImageSource,
  LonghandStyle,
} from '../types';

/**
 * CSS `border-image` and the utilities of the `tailwindcss-border-image` plugin that build it (`border-image-[url(frame)]`,
 * `border-slice-12`, `border-slice-fill`, `border-image-width-4`, `border-outset-2`, `border-repeat-round`). The picture is a texture
 * the root registered, named in `url(...)`; the slice, width and outset reach native as one object each, merged side by side across
 * layers (`border-slice-8 hover:border-slice-t-12`), where the CSS shorthand text of an inline style sets all four sides.
 */

/** What a border image utility sets: a plain style, or the sides of one of the three four-sided values. */
export interface BorderImageUtilityStyle {
  borderImageSource?: BorderImageSource;
  borderImageRepeat?: BorderImageRepeat;
  /** The CSS shorthand text of an inline style (`'30 40% fill'`, `'2 8px auto'`, `'0 4px'`), or a number for all four sides. */
  borderImageSlice?: string | number;
  borderImageWidth?: string | number;
  borderImageOutset?: string | number;
  /** What a utility sets: only the sides it names. */
  borderImageSliceParts?: BorderImageSliceParts;
  borderImageWidthParts?: BorderImageEdgeParts;
  borderImageOutsetParts?: BorderImageEdgeParts;
}

type Side = 'top' | 'right' | 'bottom' | 'left';
const SIDE_NAMES: Readonly<Record<string, readonly Side[]>> = {
  t: ['top'], r: ['right'], b: ['bottom'], l: ['left'], x: ['left', 'right'], y: ['top', 'bottom'],
};
const SIDE_ORDER: readonly Side[] = ['top', 'right', 'bottom', 'left'];

/** The keys the module reads from a style and writes into the compiled one; `mergePaint` leaves them out of the rest. */
export type BorderImageKeys =
  | 'borderImageSlice' | 'borderImageWidth' | 'borderImageOutset'
  | 'borderImageSliceParts' | 'borderImageWidthParts' | 'borderImageOutsetParts';

const NUMBER = /^(\d*\.?\d+)$/;
const PERCENT = /^(\d*\.?\d+)%$/;
const LENGTH = /^(\d*\.?\d+)px$/;

function sliceValue(token: string): BorderImageSliceValue | undefined {
  if (NUMBER.test(token)) return Number(token);
  const percent = PERCENT.exec(token);
  return percent?.[1] === undefined ? undefined : `${Number(percent[1])}%`;
}

function edgeValue(token: string, allowAuto: boolean): BorderImageEdgeValue | undefined {
  if (NUMBER.test(token)) return Number(token);
  if (token === 'auto') return allowAuto ? 'auto' : undefined;
  const length = LENGTH.exec(token);
  return length?.[1] === undefined ? undefined : `${Number(length[1])}px`;
}

/** The four values of a CSS shorthand of one to four values (top, right, bottom, left, as `margin`). */
function expandFour<T>(values: readonly T[]): readonly [T, T, T, T] | undefined {
  const [top, right, bottom, left] = values;
  if (top === undefined) return undefined;
  switch (values.length) {
    case 1: return [top, top, top, top];
    case 2: return right === undefined ? undefined : [top, right, top, right];
    case 3: return right === undefined || bottom === undefined ? undefined : [top, right, bottom, right];
    case 4: return right === undefined || bottom === undefined || left === undefined ? undefined : [top, right, bottom, left];
    default: return undefined;
  }
}

/** `border-image-slice`: one to four numbers or percentages, and `fill` before or after them. */
export function parseSliceText(property: string, text: string): BorderImageSliceParts {
  const tokens = text.trim().split(/\s+/).filter(token => token !== '');
  const fill = tokens.includes('fill');
  const values = tokens.filter(token => token !== 'fill').map(sliceValue);
  const four = values.every(value => value !== undefined) ? expandFour(values) : undefined;
  if (four === undefined || tokens.filter(token => token === 'fill').length > 1) {
    throw new Error(`${property}: expected one to four numbers or percentages and optionally "fill", got "${text}"`);
  }
  return { top: four[0], right: four[1], bottom: four[2], left: four[3], fill };
}

/** `border-image-width` (`allowAuto`) and `border-image-outset`: one to four numbers (a multiple of the border width) or lengths in px. */
export function parseEdgeText(property: string, text: string, allowAuto: boolean): BorderImageEdgeParts {
  const values = text.trim().split(/\s+/).filter(token => token !== '').map(token => edgeValue(token, allowAuto));
  const four = values.every(value => value !== undefined) ? expandFour(values) : undefined;
  if (four === undefined) {
    const allowed = allowAuto ? 'numbers, lengths in px and "auto"' : 'numbers and lengths in px';
    throw new Error(`${property}: expected one to four ${allowed}, got "${text}"`);
  }
  return { top: four[0], right: four[1], bottom: four[2], left: four[3] };
}

function setSides<T>(sides: readonly Side[], value: T): Partial<Record<Side, T>> {
  const parts: Partial<Record<Side, T>> = {};
  for (const side of sides) parts[side] = value;
  return parts;
}

function isUrlSource(text: string): text is BorderImageSource {
  return text.startsWith('url(') && text.endsWith(')');
}

/** The sides a utility's side letter names (`t`, `x`, ...), all four when it has none. */
function sidesOf(letter: string | undefined): readonly Side[] {
  return letter !== undefined && Object.hasOwn(SIDE_NAMES, letter) ? SIDE_NAMES[letter] ?? SIDE_ORDER : SIDE_ORDER;
}

/** The style a border image utility sets, or `undefined` when the class is not one. */
export function borderImageUtility(utility: string): BorderImageUtilityStyle | undefined {
  if (utility === 'border-image-none') return { borderImageSource: 'none' };
  if (utility.startsWith('border-image-[')) {
    const url = /^border-image-\[(url\(.+\))\]$/.exec(utility)?.[1];
    return url !== undefined && isUrlSource(url) ? { borderImageSource: url } : undefined;
  }
  const repeat = /^border-repeat-(stretch|round)$/.exec(utility)?.[1];
  if (repeat === 'stretch' || repeat === 'round') return { borderImageRepeat: repeat };
  if (utility === 'border-slice-fill') return { borderImageSliceParts: { fill: true } };
  if (utility === 'border-slice-no-fill') return { borderImageSliceParts: { fill: false } };

  const slice = /^border-slice(?:-(t|r|b|l|x|y))?-(.+)$/.exec(utility);
  if (slice?.[2] !== undefined) {
    const value = sliceValue(arbitrary(slice[2]));
    const sides = sidesOf(slice[1]);
    return value === undefined ? undefined : { borderImageSliceParts: setSides(sides, value) };
  }
  const width = /^border-image-width(?:-(t|r|b|l|x|y))?-(.+)$/.exec(utility);
  if (width?.[2] !== undefined) {
    const value = edgeValue(arbitrary(width[2]), true);
    const sides = sidesOf(width[1]);
    return value === undefined ? undefined : { borderImageWidthParts: setSides(sides, value) };
  }
  const outset = /^border-outset(?:-(t|r|b|l|x|y))?-(.+)$/.exec(utility);
  if (outset?.[2] !== undefined) {
    const value = edgeValue(arbitrary(outset[2]), false);
    const sides = sidesOf(outset[1]);
    return value === undefined ? undefined : { borderImageOutsetParts: setSides(sides, value) };
  }
  return undefined;
}

/** `[25%]` is `25%`: Tailwind's arbitrary value. */
function arbitrary(value: string): string {
  return /^\[(.+)\]$/.exec(value)?.[1] ?? value;
}

/**
 * Merge a style's border image values into `target`, which holds them as objects: the shorthand text of an inline style sets all
 * four sides (and `fill`, off unless written), what a utility sets changes only its sides, so a later layer's `border-slice-t-12`
 * keeps the other three.
 */
export function mergeBorderImage(target: LonghandStyle, source: Readonly<BorderImageUtilityStyle>): void {
  const merge = <T extends object>(current: T | undefined, parts: T): T => ({ ...current, ...parts });
  if (source.borderImageSlice !== undefined) {
    target.borderImageSlice = merge(target.borderImageSlice, parseSliceText('borderImageSlice', String(source.borderImageSlice)));
  }
  if (source.borderImageSliceParts !== undefined) {
    target.borderImageSlice = merge(target.borderImageSlice, source.borderImageSliceParts);
  }
  if (source.borderImageWidth !== undefined) {
    target.borderImageWidth = merge(target.borderImageWidth, parseEdgeText('borderImageWidth', String(source.borderImageWidth), true));
  }
  if (source.borderImageWidthParts !== undefined) {
    target.borderImageWidth = merge(target.borderImageWidth, source.borderImageWidthParts);
  }
  if (source.borderImageOutset !== undefined) {
    target.borderImageOutset = merge(target.borderImageOutset, parseEdgeText('borderImageOutset', String(source.borderImageOutset), false));
  }
  if (source.borderImageOutsetParts !== undefined) {
    target.borderImageOutset = merge(target.borderImageOutset, source.borderImageOutsetParts);
  }
}
