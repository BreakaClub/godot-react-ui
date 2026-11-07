import { transformUtility } from './utilities/transform';
import type {
  CompiledStyle, Cursor, Dimension, FilterParts, HexColor, Inset, LonghandStyle, PseudoState, Style, StyleLayer, StyleProp,
} from './types';

const SPACING_UNIT = 4;
const TOKEN_CACHE_LIMIT = 2048;
/**
 * Bound on the interned compiled styles and the per-class-string cache. Overflowing clears the table:
 * later equal inputs then compile to a new object, which costs one redundant prop diff, never a wrong
 * result (`diffNativeProps` also compares styles by content).
 */
const INTERN_LIMIT = 4096;
const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
const TEXT_SIZES: Readonly<Record<string, number>> = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
  '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60,
};
const RADII: Readonly<Record<string, number>> = {
  none: 0, sm: 2, DEFAULT: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24,
  // Native StyleBoxFlat clamps this to the available box, giving a pill/circle.
  full: 9999,
};
const MAX_WIDTHS: Readonly<Record<string, number>> = {
  xs: 320, sm: 384, md: 448, lg: 512, xl: 576,
  '2xl': 672, '3xl': 768, '4xl': 896, '5xl': 1024, '6xl': 1152, '7xl': 1280,
};

// Hex equivalents of the Tailwind v3 palette (tailwindcss 3.4.17, lib/public/colors.js), all 22 colours. Native paint accepts
// sRGB hex, not Tailwind v4's CSS oklch expressions.
export const colors: Readonly<Record<string, HexColor>> = Object.freeze({
  transparent: '#00000000', white: '#ffffff', black: '#000000',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b',
  'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b',
  'slate-900': '#0f172a', 'slate-950': '#020617',
  'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db', 'gray-400': '#9ca3af', 'gray-500': '#6b7280',
  'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937',
  'gray-900': '#111827', 'gray-950': '#030712',
  'zinc-50': '#fafafa', 'zinc-100': '#f4f4f5', 'zinc-200': '#e4e4e7',
  'zinc-300': '#d4d4d8', 'zinc-400': '#a1a1aa', 'zinc-500': '#71717a',
  'zinc-600': '#52525b', 'zinc-700': '#3f3f46', 'zinc-800': '#27272a',
  'zinc-900': '#18181b', 'zinc-950': '#09090b',
  'neutral-50': '#fafafa', 'neutral-100': '#f5f5f5', 'neutral-200': '#e5e5e5',
  'neutral-300': '#d4d4d4', 'neutral-400': '#a3a3a3', 'neutral-500': '#737373',
  'neutral-600': '#525252', 'neutral-700': '#404040', 'neutral-800': '#262626',
  'neutral-900': '#171717', 'neutral-950': '#0a0a0a',
  'stone-50': '#fafaf9', 'stone-100': '#f5f5f4', 'stone-200': '#e7e5e4',
  'stone-300': '#d6d3d1', 'stone-400': '#a8a29e', 'stone-500': '#78716c',
  'stone-600': '#57534e', 'stone-700': '#44403c', 'stone-800': '#292524',
  'stone-900': '#1c1917', 'stone-950': '#0c0a09',
  'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca',
  'red-300': '#fca5a5', 'red-400': '#f87171', 'red-500': '#ef4444',
  'red-600': '#dc2626', 'red-700': '#b91c1c', 'red-800': '#991b1b',
  'red-900': '#7f1d1d', 'red-950': '#450a0a',
  'orange-50': '#fff7ed', 'orange-100': '#ffedd5', 'orange-200': '#fed7aa',
  'orange-300': '#fdba74', 'orange-400': '#fb923c', 'orange-500': '#f97316',
  'orange-600': '#ea580c', 'orange-700': '#c2410c', 'orange-800': '#9a3412',
  'orange-900': '#7c2d12', 'orange-950': '#431407',
  'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a',
  'amber-300': '#fcd34d', 'amber-400': '#fbbf24', 'amber-500': '#f59e0b',
  'amber-600': '#d97706', 'amber-700': '#b45309', 'amber-800': '#92400e',
  'amber-900': '#78350f', 'amber-950': '#451a03',
  'yellow-50': '#fefce8', 'yellow-100': '#fef9c3', 'yellow-200': '#fef08a',
  'yellow-300': '#fde047', 'yellow-400': '#facc15', 'yellow-500': '#eab308',
  'yellow-600': '#ca8a04', 'yellow-700': '#a16207', 'yellow-800': '#854d0e',
  'yellow-900': '#713f12', 'yellow-950': '#422006',
  'lime-50': '#f7fee7', 'lime-100': '#ecfccb', 'lime-200': '#d9f99d',
  'lime-300': '#bef264', 'lime-400': '#a3e635', 'lime-500': '#84cc16',
  'lime-600': '#65a30d', 'lime-700': '#4d7c0f', 'lime-800': '#3f6212',
  'lime-900': '#365314', 'lime-950': '#1a2e05',
  'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0',
  'green-300': '#86efac', 'green-400': '#4ade80', 'green-500': '#22c55e',
  'green-600': '#16a34a', 'green-700': '#15803d', 'green-800': '#166534',
  'green-900': '#14532d', 'green-950': '#052e16',
  'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-200': '#a7f3d0',
  'emerald-300': '#6ee7b7', 'emerald-400': '#34d399', 'emerald-500': '#10b981',
  'emerald-600': '#059669', 'emerald-700': '#047857', 'emerald-800': '#065f46',
  'emerald-900': '#064e3b', 'emerald-950': '#022c22',
  'teal-50': '#f0fdfa', 'teal-100': '#ccfbf1', 'teal-200': '#99f6e4',
  'teal-300': '#5eead4', 'teal-400': '#2dd4bf', 'teal-500': '#14b8a6',
  'teal-600': '#0d9488', 'teal-700': '#0f766e', 'teal-800': '#115e59',
  'teal-900': '#134e4a', 'teal-950': '#042f2e',
  'cyan-50': '#ecfeff', 'cyan-100': '#cffafe', 'cyan-200': '#a5f3fc',
  'cyan-300': '#67e8f9', 'cyan-400': '#22d3ee', 'cyan-500': '#06b6d4',
  'cyan-600': '#0891b2', 'cyan-700': '#0e7490', 'cyan-800': '#155e75',
  'cyan-900': '#164e63', 'cyan-950': '#083344',
  'sky-50': '#f0f9ff', 'sky-100': '#e0f2fe', 'sky-200': '#bae6fd',
  'sky-300': '#7dd3fc', 'sky-400': '#38bdf8', 'sky-500': '#0ea5e9',
  'sky-600': '#0284c7', 'sky-700': '#0369a1', 'sky-800': '#075985',
  'sky-900': '#0c4a6e', 'sky-950': '#082f49',
  'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe',
  'blue-300': '#93c5fd', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6',
  'blue-600': '#2563eb', 'blue-700': '#1d4ed8', 'blue-800': '#1e40af',
  'blue-900': '#1e3a8a', 'blue-950': '#172554',
  'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-200': '#c7d2fe',
  'indigo-300': '#a5b4fc', 'indigo-400': '#818cf8', 'indigo-500': '#6366f1',
  'indigo-600': '#4f46e5', 'indigo-700': '#4338ca', 'indigo-800': '#3730a3',
  'indigo-900': '#312e81', 'indigo-950': '#1e1b4b',
  'violet-50': '#f5f3ff', 'violet-100': '#ede9fe', 'violet-200': '#ddd6fe',
  'violet-300': '#c4b5fd', 'violet-400': '#a78bfa', 'violet-500': '#8b5cf6',
  'violet-600': '#7c3aed', 'violet-700': '#6d28d9', 'violet-800': '#5b21b6',
  'violet-900': '#4c1d95', 'violet-950': '#2e1065',
  'purple-50': '#faf5ff', 'purple-100': '#f3e8ff', 'purple-200': '#e9d5ff',
  'purple-300': '#d8b4fe', 'purple-400': '#c084fc', 'purple-500': '#a855f7',
  'purple-600': '#9333ea', 'purple-700': '#7e22ce', 'purple-800': '#6b21a8',
  'purple-900': '#581c87', 'purple-950': '#3b0764',
  'fuchsia-50': '#fdf4ff', 'fuchsia-100': '#fae8ff', 'fuchsia-200': '#f5d0fe',
  'fuchsia-300': '#f0abfc', 'fuchsia-400': '#e879f9', 'fuchsia-500': '#d946ef',
  'fuchsia-600': '#c026d3', 'fuchsia-700': '#a21caf', 'fuchsia-800': '#86198f',
  'fuchsia-900': '#701a75', 'fuchsia-950': '#4a044e',
  'pink-50': '#fdf2f8', 'pink-100': '#fce7f3', 'pink-200': '#fbcfe8',
  'pink-300': '#f9a8d4', 'pink-400': '#f472b6', 'pink-500': '#ec4899',
  'pink-600': '#db2777', 'pink-700': '#be185d', 'pink-800': '#9d174d',
  'pink-900': '#831843', 'pink-950': '#500724',
  'rose-50': '#fff1f2', 'rose-100': '#ffe4e6', 'rose-200': '#fecdd3',
  'rose-300': '#fda4af', 'rose-400': '#fb7185', 'rose-500': '#f43f5e',
  'rose-600': '#e11d48', 'rose-700': '#be123c', 'rose-800': '#9f1239',
  'rose-900': '#881337', 'rose-950': '#4c0519',
});

/** Tailwind v3's `blur-*` scale, in CSS pixels. `DEFAULT` is the bare `blur` utility. */
const BLUR_SCALE: Readonly<Record<string, number>> = {
  none: 0, sm: 4, DEFAULT: 8, md: 12, lg: 16, xl: 24, '2xl': 40, '3xl': 64,
};
/** The percentages Tailwind v3 names for each factor utility (`brightness-110` is 1.1). */
const BRIGHTNESS_STEPS = [0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200];
const CONTRAST_STEPS = [0, 50, 75, 100, 125, 150, 200];
const SATURATE_STEPS = [0, 50, 100, 150, 200];
const BACKDROP_OPACITY_STEPS = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100];
const HUE_ROTATE_STEPS = [0, 15, 30, 60, 90, 180];
const PERCENT = 100;
const DEGREES_PER_TURN = 360;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const DEGREES_PER_GRAD = 0.9;
/**
 * Tailwind v3's `drop-shadow-*` scale. Tailwind composes two shadows for most sizes; one is drawn, with the
 * larger offset and blur and the two alphas added, which is close to the sum of the two.
 */
const DROP_SHADOWS: Readonly<Record<string, { x: number; y: number; blur: number; alpha: number } | 'none'>> = {
  sm: { x: 0, y: 1, blur: 1, alpha: 0.05 },
  DEFAULT: { x: 0, y: 1, blur: 2, alpha: 0.16 },
  md: { x: 0, y: 4, blur: 3, alpha: 0.13 },
  lg: { x: 0, y: 10, blur: 8, alpha: 0.14 },
  xl: { x: 0, y: 20, blur: 13, alpha: 0.11 },
  '2xl': { x: 0, y: 25, blur: 25, alpha: 0.15 },
  none: 'none',
};

/** The `cursor-*` utilities: each Tailwind name is the CSS keyword it sets. */
const CURSORS: readonly Cursor[] = [
  'default', 'pointer', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'crosshair', 'wait', 'progress',
  'help', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize',
];

const STATIC_UTILITIES: Readonly<Record<string, Style>> = {
  ...Object.fromEntries(CURSORS.map((cursor): [string, Style] => [`cursor-${cursor}`, { cursor }])),
  'pointer-events-auto': { pointerEvents: 'auto' }, 'pointer-events-none': { pointerEvents: 'none' },
  'select-none': { userSelect: 'none' }, 'select-text': { userSelect: 'text' },
  static: { position: 'static' }, relative: { position: 'relative' },
  absolute: { position: 'absolute' }, fixed: { position: 'fixed' },
  'overflow-hidden': { overflow: 'hidden' }, 'overflow-visible': { overflow: 'visible' },
  'overflow-scroll': { overflow: 'scroll' }, 'overflow-auto': { overflow: 'auto' },
  'overflow-x-hidden': { overflowX: 'hidden' }, 'overflow-x-visible': { overflowX: 'visible' },
  'overflow-x-scroll': { overflowX: 'scroll' }, 'overflow-x-auto': { overflowX: 'auto' },
  'overflow-y-hidden': { overflowY: 'hidden' }, 'overflow-y-visible': { overflowY: 'visible' },
  'overflow-y-scroll': { overflowY: 'scroll' }, 'overflow-y-auto': { overflowY: 'auto' },
  'overscroll-auto': { overscrollBehavior: 'auto' }, 'overscroll-contain': { overscrollBehavior: 'contain' },
  'scrollbar-auto': { scrollbarWidth: 'auto' }, 'scrollbar-none': { scrollbarWidth: 'none' },
  'touch-auto': { touchAction: 'auto' }, 'touch-none': { touchAction: 'none' },
  'touch-pan-x': { touchAction: 'pan-x' }, 'touch-pan-y': { touchAction: 'pan-y' },
  flex: { display: 'flex' }, grid: { display: 'grid' }, hidden: { display: 'none' },
  'flex-row': { flexDirection: 'row' }, 'flex-col': { flexDirection: 'column' },
  'flex-row-reverse': { flexDirection: 'row-reverse' },
  'flex-col-reverse': { flexDirection: 'column-reverse' },
  'flex-wrap': { flexWrap: 'wrap' }, 'flex-nowrap': { flexWrap: 'nowrap' },
  'flex-wrap-reverse': { flexWrap: 'wrap-reverse' },
  'flex-1': { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  'flex-auto': { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' },
  'flex-initial': { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
  'flex-none': { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  grow: { flexGrow: 1 }, 'grow-0': { flexGrow: 0 },
  shrink: { flexShrink: 1 }, 'shrink-0': { flexShrink: 0 },
  'items-start': { alignItems: 'flex-start' }, 'items-end': { alignItems: 'flex-end' },
  'items-center': { alignItems: 'center' }, 'items-stretch': { alignItems: 'stretch' },
  'items-baseline': { alignItems: 'baseline' },
  'self-start': { alignSelf: 'flex-start' }, 'self-end': { alignSelf: 'flex-end' },
  'self-center': { alignSelf: 'center' }, 'self-stretch': { alignSelf: 'stretch' },
  'self-baseline': { alignSelf: 'baseline' },
  'justify-start': { justifyContent: 'flex-start' }, 'justify-end': { justifyContent: 'flex-end' },
  'justify-center': { justifyContent: 'center' }, 'justify-between': { justifyContent: 'space-between' },
  'justify-around': { justifyContent: 'space-around' }, 'justify-evenly': { justifyContent: 'space-evenly' },
  'text-left': { textAlign: 'left' }, 'text-center': { textAlign: 'center' }, 'text-right': { textAlign: 'right' },
  border: { borderWidth: 1 }, rounded: { borderRadius: RADII.DEFAULT },
};

const STATE_VARIANTS: Readonly<Record<string, PseudoState>> = {
  hover: 'hover', active: 'active', focus: 'focus', 'focus-visible': 'focusVisible',
  'focus-within': 'focusWithin', disabled: 'disabled', starting: 'starting',
};

interface CompiledToken {
  style: Readonly<UtilityStyle>;
  minWidth: number;
  states: readonly PseudoState[];
}
const tokenCache = new Map<string, CompiledToken>();

function lookup<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

function parsePixels(value: string, scale = SPACING_UNIT): number | undefined {
  if (value === 'px') return 1;
  const arbitrary = /^\[(\d+(?:\.\d+)?)px\]$/.exec(value);
  if (arbitrary?.[1] !== undefined) return Number(arbitrary[1]);
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value) * scale;
  return undefined;
}

function parseDimension(value: string): Dimension | undefined {
  if (value === 'auto') return 'auto';
  if (value === 'full') return '100%';
  const percentage = /^\[(\d+(?:\.\d+)?)%\]$/.exec(value);
  if (percentage?.[1] !== undefined) {
    const number = Number(percentage[1]);
    return Number.isFinite(number) ? `${number}%` : undefined;
  }
  const fraction = /^(\d+)\/(\d+)$/.exec(value);
  if (fraction?.[1] !== undefined && fraction[2] !== undefined) {
    const denominator = Number(fraction[2]);
    const percentage = Number(fraction[1]) / denominator * 100;
    if (denominator === 0 || !Number.isFinite(percentage)) return undefined;
    return `${percentage}%`;
  }
  return parsePixels(value);
}

/** The largest `zIndex` native accepts: a 32-bit signed integer. */
const MAX_Z_INDEX = 2 ** 31 - 1;

function parseInset(value: string, negative: boolean): Inset | undefined {
  const dimension = parseDimension(value);
  if (dimension === undefined) return undefined;
  if (dimension === 'auto') return negative ? undefined : 'auto';
  if (typeof dimension === 'number') return negative && dimension !== 0 ? -dimension : dimension;
  if (!negative) return dimension;
  const percent = Number(dimension.slice(0, -1));
  return percent === 0 ? '0%' : `${-percent}%`;
}

function parseZIndex(value: string, negative: boolean): number | undefined {
  const arbitrary = /^\[(-?\d+)\]$/.exec(value);
  const digits = arbitrary?.[1] ?? (/^\d+$/.test(value) ? value : undefined);
  if (value === 'auto') return negative ? undefined : 0;
  if (digits === undefined) return undefined;
  const parsed = Number(digits);
  if (!Number.isSafeInteger(parsed) || Math.abs(parsed) > MAX_Z_INDEX) return undefined;
  return negative && parsed !== 0 ? -parsed : parsed;
}

/** The largest value of an alpha byte, and how many hex digits a colour channel takes. */
const ALPHA_BYTE_MAX = 255;
const CHANNEL_DIGITS = 2;

/**
 * Tailwind's opacity modifier: a colour with `/50` (a percentage, 0 to 100) or `/[0.37]` or `/[37%]` after it, as
 * `bg-white/20` and `border-white/30`. The colour must be opaque (a name, or a 3 or 6 digit arbitrary value); the result is
 * the 8 digit hex native reads.
 */
function withOpacityModifier(color: HexColor, modifier: string): HexColor | undefined {
  const percent = /^\d+$/.test(modifier) && Number(modifier) <= PERCENT ? Number(modifier) / PERCENT : undefined;
  const alpha = percent ?? parseArbitraryAmount(modifier);
  if (alpha === undefined || alpha > 1) return undefined;
  const digits = color.slice(1);
  const opaque = digits.length === 3 ? [...digits].map(digit => digit + digit).join('') : digits;
  if (opaque.length !== 6) return undefined;
  const byte = Math.round(alpha * ALPHA_BYTE_MAX).toString(16).padStart(CHANNEL_DIGITS, '0');
  return `#${opaque}${byte}`;
}

function parseColor(value: string): HexColor | undefined {
  const named = lookup(colors, value);
  if (named !== undefined) return named;
  const arbitrary = /^\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\]$/.exec(value);
  if (arbitrary?.[1] !== undefined) return `#${arbitrary[1]}`;
  // `name/20`, `[#ff0000]/50`: the modifier follows the last slash, and no colour contains one.
  const slash = value.lastIndexOf('/');
  if (slash > 0) {
    const base = parseColor(value.slice(0, slash));
    return base === undefined ? undefined : withOpacityModifier(base, value.slice(slash + 1));
  }
  return undefined;
}

/** What a class sets: a style, and for filter utilities the one function they set (see `FilterParts`). */
type UtilityStyle = Style & Pick<LonghandStyle, 'filterParts' | 'backdropFilterParts' | 'transformParts'>;

/** A number, or a percentage as a fraction, inside `[...]`. */
function parseArbitraryAmount(value: string): number | undefined {
  const match = /^\[(\d*\.?\d+)(%?)\]$/.exec(value);
  if (match?.[1] === undefined) return undefined;
  const amount = Number(match[1]);
  return match[2] === '%' ? amount / PERCENT : amount;
}

/** `[6px]` or `[0]`, in CSS pixels. */
function parseArbitraryLength(value: string): number | undefined {
  const match = /^\[(\d*\.?\d+)(px)?\]$/i.exec(value);
  if (match?.[1] === undefined) return undefined;
  const amount = Number(match[1]);
  return match[2] !== undefined || amount === 0 ? amount : undefined;
}

/** `[3deg]`, `[0.25turn]`, `[1rad]`, `[100grad]` or `[0]`, in degrees. */
function parseArbitraryAngle(value: string): number | undefined {
  const match = /^\[(-?\d*\.?\d+)(deg|turn|rad|grad)?\]$/i.exec(value);
  if (match?.[1] === undefined) return undefined;
  const amount = Number(match[1]);
  switch (match[2]?.toLowerCase()) {
    case 'deg': return amount;
    case 'turn': return amount * DEGREES_PER_TURN;
    case 'rad': return amount * DEGREES_PER_RADIAN;
    case 'grad': return amount * DEGREES_PER_GRAD;
    default: return amount === 0 ? 0 : undefined;
  }
}

/** `[0_4px_4px_rgba(0,0,0,0.25)]`: lengths and a colour, separated by underscores. */
function parseArbitraryShadow(value: string): { x: number; y: number; blur: number; color: string } | undefined {
  const inner = /^\[(.+)\]$/.exec(value)?.[1];
  if (inner === undefined) return undefined;
  const lengths: number[] = [];
  let color: string | undefined;
  let depth = 0;
  let token = '';
  const flush = (): boolean => {
    if (token === '') return true;
    const length = /^(-?\d*\.?\d+)(px)?$/i.exec(token);
    if (length?.[1] !== undefined && (length[2] !== undefined || Number(length[1]) === 0)) {
      lengths.push(Number(length[1]));
    } else if (color === undefined) {
      color = token.replaceAll('_', ' ');
    } else {
      return false;
    }
    token = '';
    return true;
  };
  for (const character of inner) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === '_' && depth === 0) {
      if (!flush()) return undefined;
    } else {
      token += character;
    }
  }
  if (!flush() || color === undefined || (lengths.length !== 2 && lengths.length !== 3)) return undefined;
  const [x, y, blur = 0] = lengths;
  if (x === undefined || y === undefined) return undefined;
  return { x, y, blur, color };
}

function percentStep(value: string, steps: readonly number[]): number | undefined {
  if (/^\d+$/.test(value) && steps.includes(Number(value))) return Number(value) / PERCENT;
  return parseArbitraryAmount(value);
}

/**
 * One filter function of Tailwind v3's filter or backdrop-filter utilities (`blur-md`, `brightness-110`,
 * `backdrop-saturate-150`, `-hue-rotate-15`, `drop-shadow-lg`, arbitrary `[...]` values). A utility sets one
 * function, so utilities compose across variants: `blur-sm hover:brightness-110` keeps the blur on hover.
 */
function filterUtility(utility: string): UtilityStyle | undefined {
  if (utility === 'filter' || utility === 'backdrop-filter') return {};
  if (utility === 'filter-none') return { filter: 'none' };
  if (utility === 'backdrop-filter-none') return { backdropFilter: 'none' };
  const match = /^(-?)(backdrop-)?(blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia|drop-shadow)(?:-(.+))?$/.exec(utility);
  if (match?.[3] === undefined) return undefined;
  const negative = match[1] === '-';
  const backdrop = match[2] !== undefined;
  const name = match[3];
  const value = match[4] ?? '';
  if (negative && name !== 'hue-rotate') return undefined;
  const parts: FilterParts = {};
  const unit = (amount: number | undefined): number | undefined =>
    amount !== undefined && amount >= 0 && amount <= 1 ? amount : undefined;
  switch (name) {
    case 'blur': {
      const radius = value === '' ? BLUR_SCALE.DEFAULT : lookup(BLUR_SCALE, value) ?? parseArbitraryLength(value);
      if (radius === undefined) return undefined;
      parts.blur = radius;
      break;
    }
    case 'brightness': case 'contrast': case 'saturate': {
      const steps = name === 'brightness' ? BRIGHTNESS_STEPS : name === 'contrast' ? CONTRAST_STEPS : SATURATE_STEPS;
      const amount = percentStep(value, steps);
      if (amount === undefined) return undefined;
      parts[name] = amount;
      break;
    }
    case 'grayscale': case 'invert': case 'sepia': {
      const amount = value === '' ? 1 : value === '0' ? 0 : unit(parseArbitraryAmount(value));
      if (amount === undefined) return undefined;
      parts[name] = amount;
      break;
    }
    case 'opacity': {
      if (!backdrop) return undefined;
      const amount = unit(percentStep(value, BACKDROP_OPACITY_STEPS));
      if (amount === undefined) return undefined;
      parts.opacity = amount;
      break;
    }
    case 'hue-rotate': {
      const degrees = /^\d+$/.test(value) && HUE_ROTATE_STEPS.includes(Number(value)) ? Number(value) : parseArbitraryAngle(value);
      if (degrees === undefined) return undefined;
      parts.hueRotate = negative && degrees !== 0 ? -degrees : degrees;
      break;
    }
    case 'drop-shadow': {
      if (backdrop) return undefined;
      const named = lookup(DROP_SHADOWS, value === '' ? 'DEFAULT' : value);
      if (named === 'none') {
        parts.dropShadow = 'none';
      } else if (named !== undefined) {
        parts.dropShadow = { x: named.x, y: named.y, blur: named.blur, color: `rgba(0, 0, 0, ${named.alpha})` };
      } else {
        const shadow = parseArbitraryShadow(value);
        if (shadow === undefined) return undefined;
        parts.dropShadow = shadow;
      }
      break;
    }
    default:
      return undefined;
  }
  return backdrop ? { backdropFilterParts: parts } : { filterParts: parts };
}

function utilityStyle(utility: string): UtilityStyle | undefined {
  const staticStyle = lookup(STATIC_UTILITIES, utility);
  if (staticStyle !== undefined) return staticStyle;

  const filtered = filterUtility(utility);
  if (filtered !== undefined) return filtered;

  const transformed = transformUtility(utility);
  if (transformed !== undefined) return transformed;

  const spacing = /^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap-x|gap-y|gap)-(.+)$/.exec(utility);
  if (spacing?.[1] !== undefined && spacing[2] !== undefined) {
    const value = parsePixels(spacing[2]);
    if (value === undefined || !Number.isFinite(value)) return undefined;
    switch (spacing[1]) {
      case 'p': return { padding: value };
      case 'px': return { paddingLeft: value, paddingRight: value };
      case 'py': return { paddingTop: value, paddingBottom: value };
      case 'pt': return { paddingTop: value };
      case 'pr': return { paddingRight: value };
      case 'pb': return { paddingBottom: value };
      case 'pl': return { paddingLeft: value };
      case 'm': return { margin: value };
      case 'mx': return { marginLeft: value, marginRight: value };
      case 'my': return { marginTop: value, marginBottom: value };
      case 'mt': return { marginTop: value };
      case 'mr': return { marginRight: value };
      case 'mb': return { marginBottom: value };
      case 'ml': return { marginLeft: value };
      case 'gap': return { gap: value };
      case 'gap-x': return { columnGap: value };
      case 'gap-y': return { rowGap: value };
    }
  }

  const inset = /^(-?)(inset-x|inset-y|inset|top|right|bottom|left)-(.+)$/.exec(utility);
  if (inset?.[2] !== undefined && inset[3] !== undefined) {
    const value = parseInset(inset[3], inset[1] === '-');
    if (value === undefined) return undefined;
    switch (inset[2]) {
      case 'inset': return { inset: value };
      case 'inset-x': return { left: value, right: value };
      case 'inset-y': return { top: value, bottom: value };
      case 'top': return { top: value };
      case 'right': return { right: value };
      case 'bottom': return { bottom: value };
      case 'left': return { left: value };
    }
  }
  const zIndex = /^(-?)z-(.+)$/.exec(utility);
  if (zIndex?.[2] !== undefined) {
    const value = parseZIndex(zIndex[2], zIndex[1] === '-');
    return value === undefined ? undefined : { zIndex: value };
  }

  const dimension = /^(w|h|min-w|min-h|max-w|max-h|basis)-(.+)$/.exec(utility);
  if (dimension?.[1] !== undefined && dimension[2] !== undefined) {
    const namedMaxWidth = dimension[1] === 'max-w' ? lookup(MAX_WIDTHS, dimension[2]) : undefined;
    const value = namedMaxWidth ?? parseDimension(dimension[2]);
    if (value === undefined || (typeof value === 'number' && !Number.isFinite(value))) return undefined;
    switch (dimension[1]) {
      case 'w': return { width: value };
      case 'h': return { height: value };
      case 'min-w': return { minWidth: value };
      case 'min-h': return { minHeight: value };
      case 'max-w': return { maxWidth: value };
      case 'max-h': return { maxHeight: value };
      case 'basis': return { flexBasis: value };
    }
  }

  if (utility.startsWith('grid-cols-')) {
    const value = utility.slice('grid-cols-'.length);
    if (/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))) return { gridTemplateColumns: Number(value) };
  }
  if (utility.startsWith('rounded-')) {
    const name = utility.slice('rounded-'.length);
    const radius = lookup(RADII, name) ?? parsePixels(name, 1);
    if (radius !== undefined && Number.isFinite(radius)) return { borderRadius: radius };
  }
  if (utility.startsWith('opacity-')) {
    const value = utility.slice('opacity-'.length);
    if (/^\d+$/.test(value) && Number(value) <= 100) return { opacity: Number(value) / 100 };
  }

  if (utility.startsWith('scrollbar-')) {
    const color = parseColor(utility.slice('scrollbar-'.length));
    if (color !== undefined) return { scrollbarColor: color };
  }
  if (utility.startsWith('selection-')) {
    const color = parseColor(utility.slice('selection-'.length));
    if (color !== undefined) return { selectionColor: color };
  }
  if (utility.startsWith('caret-')) {
    const color = parseColor(utility.slice('caret-'.length));
    if (color !== undefined) return { caretColor: color };
  }
  if (utility.startsWith('placeholder-')) {
    const color = parseColor(utility.slice('placeholder-'.length));
    if (color !== undefined) return { placeholderColor: color };
  }

  for (const prefix of ['bg-', 'text-', 'border-']) {
    if (!utility.startsWith(prefix)) continue;
    const value = utility.slice(prefix.length);
    const color = parseColor(value);
    if (color !== undefined) {
      if (prefix === 'bg-') return { backgroundColor: color };
      if (prefix === 'text-') return { color };
      return { borderColor: color };
    }
    if (prefix === 'text-') {
      const fontSize = lookup(TEXT_SIZES, value) ?? (/^\[\d+px\]$/.test(value) ? parsePixels(value, 1) : undefined);
      if (fontSize !== undefined && fontSize > 0 && Number.isSafeInteger(fontSize)) return { fontSize };
    }
    if (prefix === 'border-') {
      const width = parsePixels(value, 1);
      if (width !== undefined && Number.isFinite(width)) return { borderWidth: width };
    }
  }
  return undefined;
}

function compileToken(token: string): CompiledToken {
  const cached = tokenCache.get(token);
  if (cached !== undefined) return cached;
  const parts = token.split(':');
  const utility = parts.pop();
  if (!utility) throw new Error(`Invalid utility class "${token}"`);
  let minWidth = 0;
  const states: PseudoState[] = [];
  for (const variant of parts) {
    if (variant === 'sm' || variant === 'md' || variant === 'lg' || variant === 'xl' || variant === '2xl') {
      minWidth = Math.max(minWidth, BREAKPOINTS[variant]);
    } else {
      const state = lookup(STATE_VARIANTS, variant);
      if (state === undefined) throw new Error(`Unsupported style variant "${variant}" in "${token}"`);
      if (!states.includes(state)) states.push(state);
    }
  }
  const style = utilityStyle(utility);
  if (style === undefined) throw new Error(`Unsupported utility class "${token}"`);
  const compiled: CompiledToken = { style: Object.freeze(style), minWidth, states: Object.freeze(states) };
  if (tokenCache.size >= TOKEN_CACHE_LIMIT) tokenCache.clear();
  tokenCache.set(token, compiled);
  return compiled;
}

function isStyleArray(style: StyleProp): style is readonly StyleProp[] {
  return Array.isArray(style);
}

/** Expand shorthands into the longhands native understands, in the order they enter a layer. */
function mergeLonghands(target: LonghandStyle, source: Readonly<UtilityStyle>): void {
  const {
    padding, margin, gap, overflow, inset, transition, filter, filterParts, backdropFilter, backdropFilterParts,
    transform, transformParts, ...properties
  } = source;
  if (padding !== undefined) {
    target.paddingTop = padding;
    target.paddingRight = padding;
    target.paddingBottom = padding;
    target.paddingLeft = padding;
  }
  if (margin !== undefined) {
    target.marginTop = margin;
    target.marginRight = margin;
    target.marginBottom = margin;
    target.marginLeft = margin;
  }
  if (gap !== undefined) {
    target.rowGap = gap;
    target.columnGap = gap;
  }
  if (overflow !== undefined) {
    target.overflowX = overflow;
    target.overflowY = overflow;
  }
  if (inset !== undefined) {
    target.top = inset;
    target.right = inset;
    target.bottom = inset;
    target.left = inset;
  }
  // An explicit list replaces what utilities set before it; a function set after it takes back the composed
  // list, where only the functions set since count (native merges layers the same way).
  if (filter !== undefined) {
    target.filter = filter;
    delete target.filterParts;
  }
  if (filterParts !== undefined) {
    delete target.filter;
    target.filterParts = { ...target.filterParts, ...filterParts };
  }
  if (backdropFilter !== undefined) {
    target.backdropFilter = backdropFilter;
    delete target.backdropFilterParts;
  }
  if (backdropFilterParts !== undefined) {
    delete target.backdropFilter;
    target.backdropFilterParts = { ...target.backdropFilterParts, ...backdropFilterParts };
  }
  // A transform list replaces what utilities set before it; a value set after it takes back the composed list.
  if (transform !== undefined) {
    target.transform = transform;
    delete target.transformParts;
  }
  if (transformParts !== undefined) {
    delete target.transform;
    target.transformParts = { ...target.transformParts, ...transformParts };
  }
  // The compiled style is interned and frozen, so it must not share objects with the caller's style.
  if (transition !== undefined) target.transition = { ...transition, properties: [...transition.properties] };
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) Reflect.set(target, key, value);
  }
}

/** JSON with sorted object keys, so equal styles built in a different order intern together. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** The style with its keys in sorted order and no undefined values, so payload text is stable. */
function sortedStyle(style: Readonly<LonghandStyle>): LonghandStyle {
  const sorted: LonghandStyle = {};
  for (const key of Object.keys(style).sort()) {
    const value: unknown = Reflect.get(style, key);
    if (value !== undefined) Reflect.set(sorted, key, value);
  }
  return sorted;
}

/** Freeze a compiled style all the way down; nothing may mutate an interned object. */
function deepFreeze<T extends object>(value: T): Readonly<T> {
  Object.freeze(value);
  for (const entry of Object.values(value)) {
    if (typeof entry === 'object' && entry !== null && !Object.isFrozen(entry)) deepFreeze(entry);
  }
  return value;
}

const interned = new Map<string, CompiledStyle>();
const classOnly = new Map<string, CompiledStyle>();
const keys = new WeakMap<CompiledStyle, string>();

/** The canonical content key of a compiled style: equal keys mean equal layers. */
export function styleKey(style: CompiledStyle): string {
  const key = keys.get(style);
  if (key === undefined) throw new Error('styleKey needs a style from compileStyle');
  return key;
}

interface PendingLayer { minWidth: number; states: readonly PseudoState[]; style: LonghandStyle }

function sameStates(left: readonly PseudoState[], right: readonly PseudoState[]): boolean {
  return left.length === right.length && left.every((state, index) => state === right[index]);
}

/**
 * Compile a class string and inline style to the ordered layers native resolves. Each class token
 * is a layer with its breakpoint and state conditions; inline styles (nested arrays allowed) are
 * unconditional layers after them. Adjacent layers with the same conditions merge, which preserves
 * the cascade. Unknown classes throw even when their conditions are inactive, so a hover or resize
 * cannot expose a typo later.
 */
export function compileStyle(className = '', inlineStyle?: StyleProp): CompiledStyle {
  const classKey = inlineStyle ? undefined : className;
  if (classKey !== undefined) {
    const cached = classOnly.get(classKey);
    if (cached !== undefined) return cached;
  }
  const pending: PendingLayer[] = [];
  function add(minWidth: number, states: readonly PseudoState[], style: Readonly<UtilityStyle>): void {
    let layer = pending.at(-1);
    if (layer === undefined || layer.minWidth !== minWidth || !sameStates(layer.states, states)) {
      layer = { minWidth, states, style: {} };
      pending.push(layer);
    }
    mergeLonghands(layer.style, style);
  }
  for (const token of className.split(/\s+/)) {
    if (!token) continue;
    const compiled = compileToken(token);
    add(compiled.minWidth, compiled.states, compiled.style);
  }
  const addInline = (style: StyleProp): void => {
    if (!style) return;
    if (isStyleArray(style)) {
      for (const entry of style) addInline(entry);
    } else {
      add(0, [], style);
    }
  };
  addInline(inlineStyle);

  const layers: StyleLayer[] = [];
  for (const layer of pending) {
    if (Object.keys(layer.style).length === 0) continue;
    layers.push({
      ...(layer.minWidth > 0 ? { minWidth: layer.minWidth } : {}),
      ...(layer.states.length > 0 ? { states: [...layer.states] } : {}),
      style: sortedStyle(layer.style),
    });
  }
  const key = canonicalJson(layers);
  let result = interned.get(key);
  if (result === undefined) {
    if (interned.size >= INTERN_LIMIT) interned.clear();
    result = deepFreeze({ layers });
    interned.set(key, result);
    keys.set(result, key);
  }
  if (classKey !== undefined) {
    if (classOnly.size >= INTERN_LIMIT) classOnly.clear();
    classOnly.set(classKey, result);
  }
  return result;
}

export const StyleSheet = {
  /** Styles are reusable immutable objects. No native registration or browser CSS is implied. */
  create<T extends Record<string, Style>>(styles: T): T {
    for (const style of Object.values(styles)) {
      if (style.transition) {
        Object.freeze(style.transition.properties);
        Object.freeze(style.transition);
      }
      Object.freeze(style);
    }
    return Object.freeze(styles);
  },
};
