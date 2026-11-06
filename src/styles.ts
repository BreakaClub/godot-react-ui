import type {
  CompiledStyle, Cursor, Dimension, HexColor, Inset, LonghandStyle, PseudoState, Style, StyleLayer, StyleProp,
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

// Hex equivalents of the familiar Tailwind v3 palette. Native paint accepts sRGB hex,
// not Tailwind v4's CSS oklch expressions. This is intentionally a documented subset.
export const colors: Readonly<Record<string, HexColor>> = Object.freeze({
  transparent: '#00000000', white: '#ffffff', black: '#000000',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b',
  'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b',
  'slate-900': '#0f172a', 'slate-950': '#020617',
  'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-200': '#c7d2fe',
  'indigo-300': '#a5b4fc', 'indigo-400': '#818cf8', 'indigo-500': '#6366f1',
  'indigo-600': '#4f46e5', 'indigo-700': '#4338ca', 'indigo-800': '#3730a3',
  'indigo-900': '#312e81', 'indigo-950': '#1e1b4b',
  'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-200': '#a7f3d0',
  'emerald-300': '#6ee7b7', 'emerald-400': '#34d399', 'emerald-500': '#10b981',
  'emerald-600': '#059669', 'emerald-700': '#047857', 'emerald-800': '#065f46',
  'emerald-900': '#064e3b', 'emerald-950': '#022c22',
  'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a',
  'amber-300': '#fcd34d', 'amber-400': '#fbbf24', 'amber-500': '#f59e0b',
  'amber-600': '#d97706', 'amber-700': '#b45309', 'amber-800': '#92400e',
  'amber-900': '#78350f', 'amber-950': '#451a03',
  'rose-50': '#fff1f2', 'rose-100': '#ffe4e6', 'rose-200': '#fecdd3',
  'rose-300': '#fda4af', 'rose-400': '#fb7185', 'rose-500': '#f43f5e',
  'rose-600': '#e11d48', 'rose-700': '#be123c', 'rose-800': '#9f1239',
  'rose-900': '#881337', 'rose-950': '#4c0519',
});

/** The `cursor-*` utilities: each Tailwind name is the CSS keyword it sets. */
const CURSORS: readonly Cursor[] = [
  'default', 'pointer', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'crosshair', 'wait', 'progress',
  'help', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize',
];

const STATIC_UTILITIES: Readonly<Record<string, Style>> = {
  ...Object.fromEntries(CURSORS.map((cursor): [string, Style] => [`cursor-${cursor}`, { cursor }])),
  'pointer-events-auto': { pointerEvents: 'auto' }, 'pointer-events-none': { pointerEvents: 'none' },
  static: { position: 'static' }, relative: { position: 'relative' },
  absolute: { position: 'absolute' }, fixed: { position: 'fixed' },
  'overflow-hidden': { overflow: 'hidden' }, 'overflow-visible': { overflow: 'visible' },
  'overflow-x-hidden': { overflowX: 'hidden' }, 'overflow-x-visible': { overflowX: 'visible' },
  'overflow-y-hidden': { overflowY: 'hidden' }, 'overflow-y-visible': { overflowY: 'visible' },
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
  'focus-within': 'focusWithin', disabled: 'disabled',
};

interface CompiledToken {
  style: Readonly<Style>;
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

function parseColor(value: string): HexColor | undefined {
  const named = lookup(colors, value);
  if (named !== undefined) return named;
  const arbitrary = /^\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\]$/.exec(value);
  if (arbitrary?.[1] !== undefined) return `#${arbitrary[1]}`;
  return undefined;
}

function utilityStyle(utility: string): Style | undefined {
  const staticStyle = lookup(STATIC_UTILITIES, utility);
  if (staticStyle !== undefined) return staticStyle;

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
function mergeLonghands(target: LonghandStyle, source: Readonly<Style>): void {
  const { padding, margin, gap, overflow, inset, transition, ...properties } = source;
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
  function add(minWidth: number, states: readonly PseudoState[], style: Readonly<Style>): void {
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
