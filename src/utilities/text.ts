import type { HexColor, LineHeight, Style } from '../types';

/**
 * Tailwind v3 (3.4.17) text utilities: weight, style, family, size with its paired line height, leading, tracking, case,
 * decoration, overflow, wrapping, numerals. Each class compiles to the longhand a CSS property of the same name would set;
 * native resolves them (`native/computed_style.rs`) and shapes the text (`native/text_paragraph.rs`).
 *
 * Values are read from `tailwindcss/stubs/config.full.js` of 3.4.17: `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`,
 * `textDecorationThickness`, `textUnderlineOffset` and `lineClamp`. A rem is 16 px, as in the browser's default.
 */

const PIXELS_PER_REM = 16;
/** Tailwind's `fontSize` scale: the size in px and the paired `line-height` (a px length, or a unitless factor for `5xl` and up). */
const FONT_SIZES: Readonly<Record<string, readonly [number, LineHeight]>> = {
  xs: [12, 16], sm: [14, 20], base: [16, 24], lg: [18, 28], xl: [20, 28],
  '2xl': [24, 32], '3xl': [30, 36], '4xl': [36, 40], '5xl': [48, '1'], '6xl': [60, '1'],
  '7xl': [72, '1'], '8xl': [96, '1'], '9xl': [128, '1'],
};
const FONT_WEIGHTS: Readonly<Record<string, number>> = {
  thin: 100, extralight: 200, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
};
const LINE_HEIGHTS: Readonly<Record<string, LineHeight>> = {
  none: '1', tight: '1.25', snug: '1.375', normal: '1.5', relaxed: '1.625', loose: '2',
  3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40,
};
const LETTER_SPACINGS: Readonly<Record<string, `${number}em`>> = {
  tighter: '-0.05em', tight: '-0.025em', normal: '0em', wide: '0.025em', wider: '0.05em', widest: '0.1em',
};
/** `decoration-<n>` and `underline-offset-<n>`: Tailwind's steps, in px. */
const LINE_STEPS: readonly number[] = [0, 1, 2, 4, 8];
const MAX_LINE_CLAMP = 6;
const FONT_FAMILIES: readonly string[] = ['sans', 'serif', 'mono'];
/** The weight CSS gives to the keyword `bold`, and to `normal`. */
export const NORMAL_WEIGHT = 400;
export const BOLD_WEIGHT = 700;
/** CSS accepts any `font-weight` number from 1 to 1000. */
const MIN_FONT_WEIGHT = 1;
const MAX_FONT_WEIGHT = 1000;

const STATIC_TEXT_UTILITIES: Readonly<Record<string, Style>> = {
  italic: { fontStyle: 'italic' }, 'not-italic': { fontStyle: 'normal' },
  uppercase: { textTransform: 'uppercase' }, lowercase: { textTransform: 'lowercase' },
  capitalize: { textTransform: 'capitalize' }, 'normal-case': { textTransform: 'none' },
  underline: { textDecorationLine: 'underline' }, overline: { textDecorationLine: 'overline' },
  'line-through': { textDecorationLine: 'line-through' }, 'no-underline': { textDecorationLine: 'none' },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  'text-ellipsis': { textOverflow: 'ellipsis' }, 'text-clip': { textOverflow: 'clip' },
  'whitespace-normal': { whiteSpace: 'normal' }, 'whitespace-nowrap': { whiteSpace: 'nowrap' },
  'whitespace-pre': { whiteSpace: 'pre' }, 'whitespace-pre-line': { whiteSpace: 'pre-line' },
  'whitespace-pre-wrap': { whiteSpace: 'pre-wrap' }, 'whitespace-break-spaces': { whiteSpace: 'break-spaces' },
  'break-normal': { overflowWrap: 'normal', wordBreak: 'normal' },
  'break-words': { overflowWrap: 'break-word' },
  'break-all': { wordBreak: 'break-all' },
  'break-keep': { wordBreak: 'keep-all' },
  'text-start': { textAlign: 'start' }, 'text-end': { textAlign: 'end' }, 'text-justify': { textAlign: 'justify' },
  // Tailwind composes `font-variant-numeric` from five variables; each is a longhand here, so they compose the same way.
  'normal-nums': {
    numericFigure: 'normal', numericSpacing: 'normal', numericFraction: 'normal', ordinal: false, slashedZero: false,
  },
  ordinal: { ordinal: true }, 'slashed-zero': { slashedZero: true },
  'lining-nums': { numericFigure: 'lining' }, 'oldstyle-nums': { numericFigure: 'oldstyle' },
  'proportional-nums': { numericSpacing: 'proportional' }, 'tabular-nums': { numericSpacing: 'tabular' },
  'diagonal-fractions': { numericFraction: 'diagonal' }, 'stacked-fractions': { numericFraction: 'stacked' },
  'line-clamp-none': { lineClamp: 'none', overflow: 'visible' },
  // `-webkit-font-smoothing: antialiased` is how Chrome and this renderer draw text on every platform (greyscale coverage); it
  // changes nothing here, so it compiles to no style. `subpixel-antialiased` would claim LCD coverage and is not accepted.
  antialiased: {},
};

function finite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

/** `13px`, `1.25rem` or `0` as px, from an arbitrary value's inside. */
function parseCssLength(value: string): number | undefined {
  const match = /^(-?\d*\.?\d+)(px|rem)?$/i.exec(value);
  if (match?.[1] === undefined) return undefined;
  const amount = Number(match[1]);
  if (match[2] === undefined) return amount === 0 ? 0 : undefined;
  return match[2].toLowerCase() === 'rem' ? amount * PIXELS_PER_REM : amount;
}

/** The inside of `[...]`. */
function arbitrary(value: string): string | undefined {
  const match = /^\[(.+)\]$/.exec(value);
  return match?.[1];
}

/** A `line-height` from an arbitrary value (`1.4`, `22px`, `1.5rem`, `150%`, `1.2em`). */
function parseLineHeight(inside: string): LineHeight | undefined {
  if (/^\d*\.?\d+$/.test(inside)) return Number(inside) > 0 ? `${Number(inside)}` : undefined;
  if (/^\d*\.?\d+%$/.test(inside)) return `${Number(inside.slice(0, -1))}%`;
  if (/^\d*\.?\d+em$/i.test(inside)) return `${Number(inside.slice(0, -2))}em`;
  const length = parseCssLength(inside);
  return finite(length) && length > 0 ? length : undefined;
}

/** `text-<size>` and `text-<size>/<leading>`: Tailwind's font sizes with their line heights. */
function fontSizeUtility(value: string): Style | undefined {
  const slash = value.indexOf('/');
  const sizeName = slash < 0 ? value : value.slice(0, slash);
  const modifier = slash < 0 ? undefined : value.slice(slash + 1);
  let size: number | undefined;
  let pairedLeading: LineHeight | undefined;
  const named = Object.hasOwn(FONT_SIZES, sizeName) ? FONT_SIZES[sizeName] : undefined;
  if (named !== undefined) {
    [size, pairedLeading] = named;
  } else {
    const inside = arbitrary(sizeName);
    size = inside === undefined ? undefined : parseCssLength(inside);
  }
  if (!finite(size) || size <= 0 || !Number.isSafeInteger(size)) return undefined;
  if (modifier === undefined) return pairedLeading === undefined ? { fontSize: size } : { fontSize: size, lineHeight: pairedLeading };
  // The modifier is a `lineHeight` theme key (`6`, `loose`) or an arbitrary value.
  const inside = arbitrary(modifier);
  const leading = inside === undefined
    ? (Object.hasOwn(LINE_HEIGHTS, modifier) ? LINE_HEIGHTS[modifier] : undefined)
    : parseLineHeight(inside);
  return leading === undefined ? undefined : { fontSize: size, lineHeight: leading };
}

/** `font-<weight name>`, `font-[600]`, `font-sans`, `font-['Open_Sans']`. */
function fontUtility(value: string): Style | undefined {
  if (Object.hasOwn(FONT_WEIGHTS, value)) return { fontWeight: FONT_WEIGHTS[value] };
  if (FONT_FAMILIES.includes(value)) return { fontFamily: value };
  const inside = arbitrary(value);
  if (inside === undefined) return undefined;
  // Tailwind tells a weight from a family by the value's type: a number is a weight.
  if (/^\d+$/.test(inside)) {
    const weight = Number(inside);
    return weight >= MIN_FONT_WEIGHT && weight <= MAX_FONT_WEIGHT ? { fontWeight: weight } : undefined;
  }
  // Underscores stand for spaces in an arbitrary value; quotes around one family name are dropped.
  const family = inside.replaceAll('_', ' ').replace(/^(['"])(.*)\1$/, '$2').trim();
  return family === '' ? undefined : { fontFamily: family };
}

function leadingUtility(value: string): Style | undefined {
  if (Object.hasOwn(LINE_HEIGHTS, value)) return { lineHeight: LINE_HEIGHTS[value] };
  const inside = arbitrary(value);
  const lineHeight = inside === undefined ? undefined : parseLineHeight(inside);
  return lineHeight === undefined ? undefined : { lineHeight };
}

function trackingUtility(value: string): Style | undefined {
  if (Object.hasOwn(LETTER_SPACINGS, value)) return { letterSpacing: LETTER_SPACINGS[value] };
  const inside = arbitrary(value);
  if (inside === undefined) return undefined;
  const em = /^(-?\d*\.?\d+)em$/i.exec(inside);
  if (em?.[1] !== undefined) return { letterSpacing: `${Number(em[1])}em` };
  const length = parseCssLength(inside);
  return finite(length) ? { letterSpacing: length } : undefined;
}

/** The colour of `decoration-<colour>`; the caller gives the palette parser, which lives with the other colours. */
export type ColourParser = (value: string) => HexColor | undefined;

function decorationUtility(value: string, parseColour: ColourParser): Style | undefined {
  if (value === 'auto' || value === 'from-font') return { textDecorationThickness: value };
  if (/^\d+$/.test(value) && LINE_STEPS.includes(Number(value))) return { textDecorationThickness: Number(value) };
  const inside = arbitrary(value);
  const length = inside === undefined ? undefined : parseCssLength(inside);
  if (finite(length) && length >= 0) return { textDecorationThickness: length };
  const colour = parseColour(value);
  return colour === undefined ? undefined : { textDecorationColor: colour };
}

function underlineOffsetUtility(value: string): Style | undefined {
  if (value === 'auto') return { textUnderlineOffset: 'auto' };
  if (/^\d+$/.test(value) && LINE_STEPS.includes(Number(value))) return { textUnderlineOffset: Number(value) };
  const inside = arbitrary(value);
  const length = inside === undefined ? undefined : parseCssLength(inside);
  return finite(length) ? { textUnderlineOffset: length } : undefined;
}

/**
 * The style a text utility sets, or `undefined` when `utility` is not one of them. `parseColour` resolves
 * `decoration-<colour>` against the colours of the other utilities.
 */
export function textUtility(utility: string, parseColour: ColourParser): Style | undefined {
  if (Object.hasOwn(STATIC_TEXT_UTILITIES, utility)) return STATIC_TEXT_UTILITIES[utility];
  const dash = utility.indexOf('-');
  if (dash < 0) return undefined;
  const prefix = utility.slice(0, dash);
  const value = utility.slice(dash + 1);
  switch (prefix) {
    case 'text': return fontSizeUtility(value);
    case 'font': return fontUtility(value);
    case 'leading': return leadingUtility(value);
    case 'tracking': return trackingUtility(value);
    case 'decoration': return decorationUtility(value, parseColour);
    default: break;
  }
  if (utility.startsWith('underline-offset-')) return underlineOffsetUtility(utility.slice('underline-offset-'.length));
  if (utility.startsWith('line-clamp-')) {
    const lines = utility.slice('line-clamp-'.length);
    if (/^[1-9]\d*$/.test(lines) && Number(lines) <= MAX_LINE_CLAMP) return { lineClamp: Number(lines), overflow: 'hidden' };
  }
  return undefined;
}

/** The numeric weight of a `fontWeight` style value: keywords are CSS's `normal` (400) and `bold` (700). */
export function fontWeightNumber(weight: NonNullable<Style['fontWeight']>): number {
  if (weight === 'normal') return NORMAL_WEIGHT;
  if (weight === 'bold') return BOLD_WEIGHT;
  return weight;
}
