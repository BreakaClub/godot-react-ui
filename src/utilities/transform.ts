import type { LonghandStyle, Style, TransformParts } from '../types';

/**
 * Tailwind v3's transform utilities (tailwindcss 3.4.17, `corePlugins.js` and `stubs/config.full.js`):
 * `translate-x-*`, `translate-y-*`, `rotate-*`, `skew-x-*`, `skew-y-*`, `scale-*`, `scale-x-*`, `scale-y-*`
 * (all with negative forms), `origin-*`, `transform`, `transform-cpu`, `transform-gpu` and `transform-none`.
 *
 * A utility sets one value, so utilities compose across variants as Tailwind's do through its CSS variables:
 * `-translate-x-1/2 hover:scale-105` keeps the translate on hover. Native composes the values into
 * Tailwind's list, `translate rotate skewX skewY scaleX scaleY`, each at its default when nothing set it.
 */
export type TransformUtilityStyle = Pick<Style, 'transform' | 'transformOrigin'> & Pick<LonghandStyle, 'transformParts'>;

/** One spacing step is 0.25rem, and a rem is 16px (this library's `p-4` is 16px). */
const SPACING_UNIT = 4;
const PERCENT = 100;
/** The keys of Tailwind's default `spacing` scale (`translate` takes these, `px`, fractions and `full`). */
const SPACING_KEYS: ReadonlySet<string> = new Set([
  '0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16',
  '20', '24', '28', '32', '36', '40', '44', '48', '52', '56', '60', '64', '72', '80', '96',
]);
/** Tailwind's default `translate` fractions, as percentages. */
const FRACTIONS: Readonly<Record<string, string>> = {
  '1/2': '50%', '1/3': '33.333333%', '2/3': '66.666667%', '1/4': '25%', '2/4': '50%', '3/4': '75%', full: '100%',
};
/** Tailwind's default `rotate` scale, in degrees. */
const ROTATE_STEPS: ReadonlySet<string> = new Set(['0', '1', '2', '3', '6', '12', '45', '90', '180']);
/** Tailwind's default `skew` scale, in degrees. */
const SKEW_STEPS: ReadonlySet<string> = new Set(['0', '1', '2', '3', '6', '12']);
/** Tailwind's default `scale` scale: the percentage a step names. */
const SCALE_STEPS: ReadonlySet<string> = new Set(['0', '50', '75', '90', '95', '100', '105', '110', '125', '150']);
/** Tailwind's default `transformOrigin` keywords, as the CSS they set. */
const ORIGINS: Readonly<Record<string, string>> = {
  center: 'center', top: 'top', 'top-right': 'top right', right: 'right', 'bottom-right': 'bottom right',
  bottom: 'bottom', 'bottom-left': 'bottom left', left: 'left', 'top-left': 'top left',
};
/** What an arbitrary value may contain: numbers, units, `calc()` operators and spaces (written as underscores). */
const ARBITRARY_CHARACTERS = /^[\w.%+\-*/(),\s]+$/;
const LENGTH = /^-?\d*\.?\d+(?:px|rem|%)?$/;
const ANGLE = /^-?\d*\.?\d+(?:deg|grad|rad|turn)$/;

function lookup<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

/** The text inside `[...]` with Tailwind's underscores read as spaces, or `undefined` if it is not arbitrary or unsafe. */
function arbitrary(value: string): string | undefined {
  const inner = /^\[(.+)\]$/.exec(value)?.[1];
  if (inner === undefined) return undefined;
  const text = inner.replaceAll('_', ' ').trim();
  return ARBITRARY_CHARACTERS.test(text) ? text : undefined;
}

function negate(value: string): string {
  if (/^-?0*\.?0+(?:px|rem|%|deg|grad|rad|turn)?$/.test(value)) return value.replace(/^-/, '');
  if (value.startsWith('-')) return value.slice(1);
  if (LENGTH.test(value) || ANGLE.test(value)) return `-${value}`;
  return `calc(${value} * -1)`;
}

function signed(value: string, negative: boolean): string {
  return negative ? negate(value) : value;
}

/** A `translate` value: the scale's step in px, `px`, a fraction or `full`, or an arbitrary length or percentage. */
function translateValue(value: string): string | undefined {
  if (value === 'px') return '1px';
  if (SPACING_KEYS.has(value)) return `${Number(value) * SPACING_UNIT}px`;
  const fraction = lookup(FRACTIONS, value);
  if (fraction !== undefined) return fraction;
  const text = arbitrary(value);
  return text !== undefined && (LENGTH.test(text) || text.startsWith('calc(')) ? text : undefined;
}

function angleValue(value: string, steps: ReadonlySet<string>): string | undefined {
  if (steps.has(value)) return `${value}deg`;
  const text = arbitrary(value);
  return text !== undefined && (ANGLE.test(text) || text === '0') ? text : undefined;
}

function scaleValue(value: string, negative: boolean): number | undefined {
  let amount: number | undefined;
  if (SCALE_STEPS.has(value)) {
    amount = Number(value) / PERCENT;
  } else {
    const match = /^\[(-?\d*\.?\d+)(%?)\]$/.exec(value);
    if (match?.[1] !== undefined) amount = match[2] === '%' ? Number(match[1]) / PERCENT : Number(match[1]);
  }
  if (amount === undefined || !Number.isFinite(amount)) return undefined;
  return negative && amount !== 0 ? -amount : amount;
}

function originValue(value: string): string | undefined {
  const named = lookup(ORIGINS, value);
  if (named !== undefined) return named;
  const text = arbitrary(value);
  return text !== undefined && !text.includes('(') ? text : undefined;
}

export function transformUtility(utility: string): TransformUtilityStyle | undefined {
  switch (utility) {
    // Tailwind's `transform` and `transform-cpu` set the composed list, `transform-gpu` the same with a 3D
    // translate (the picture is the same), `transform-none` no list.
    case 'transform': case 'transform-cpu': return { transformParts: { gpu: false } };
    case 'transform-gpu': return { transformParts: { gpu: true } };
    case 'transform-none': return { transform: 'none' };
    default: break;
  }
  const match = /^(-?)(translate-x|translate-y|rotate|skew-x|skew-y|scale-x|scale-y|scale|origin)-(.+)$/.exec(utility);
  if (match?.[2] === undefined || match[3] === undefined) return undefined;
  const negative = match[1] === '-';
  const name = match[2];
  const value = match[3];
  if (name === 'origin') {
    if (negative) return undefined;
    const origin = originValue(value);
    return origin === undefined ? undefined : { transformOrigin: origin };
  }
  const parts: TransformParts = {};
  switch (name) {
    case 'translate-x': case 'translate-y': {
      const amount = translateValue(value);
      if (amount === undefined) return undefined;
      parts[name === 'translate-x' ? 'translateX' : 'translateY'] = signed(amount, negative);
      break;
    }
    case 'rotate': {
      const angle = angleValue(value, ROTATE_STEPS);
      if (angle === undefined) return undefined;
      parts.rotate = signed(angle, negative);
      break;
    }
    case 'skew-x': case 'skew-y': {
      const angle = angleValue(value, SKEW_STEPS);
      if (angle === undefined) return undefined;
      parts[name === 'skew-x' ? 'skewX' : 'skewY'] = signed(angle, negative);
      break;
    }
    case 'scale': case 'scale-x': case 'scale-y': {
      const factor = scaleValue(value, negative);
      if (factor === undefined) return undefined;
      if (name !== 'scale-y') parts.scaleX = factor;
      if (name !== 'scale-x') parts.scaleY = factor;
      break;
    }
    default:
      return undefined;
  }
  return { transformParts: parts };
}
