import type {
  Alignment, Dimension, GridAutoFlow, GridLine, GridTemplate, GridTrack, GridTrackSize, Justification, Margin, SelfAlignment,
  SizeLimit, Style,
} from '../types';

/**
 * Tailwind v3's layout utilities that have a meaning under Flexbox, Grid and block layout with Taffy: margins (auto and
 * negative included), sizes and their limits, flex growth, grid tracks and placement, alignment, `order`, `aspect-ratio`,
 * `box-sizing`, `visibility`, the block display values and `overflow-clip`. `layoutUtility` returns the style a class sets,
 * or `undefined` when the class is not one of these, so `utilityStyle` (`src/styles.ts`) can go on to the others.
 */

const SPACING_UNIT = 4;
/** `1rem`: the root font size, which this library does not scale. */
const REM_PX = 16;
const PERCENT = 100;
/** The widths Tailwind's `max-w-screen-*` names, which are its breakpoints. */
const SCREEN_WIDTHS: Readonly<Record<string, number>> = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
const MAX_WIDTHS: Readonly<Record<string, number>> = {
  xs: 320, sm: 384, md: 448, lg: 512, xl: 576, '2xl': 672, '3xl': 768, '4xl': 896, '5xl': 1024, '6xl': 1152, '7xl': 1280,
};
/** `order-first` and `order-last`: Tailwind's `-9999` and `9999`. */
const ORDER_EXTREME = 9999;
const ASPECT_VIDEO = 16 / 9;
/** The largest `order` native takes: a 32-bit signed integer. */
const MAX_ORDER = 2 ** 31 - 1;

/** Tailwind's names for a full viewport on each axis: `screen`, and the small, large and dynamic ones, which are the same here. */
const VIEWPORT_NAMES: Readonly<Record<'w' | 'h', readonly string[]>> = {
  w: ['screen', 'svw', 'lvw', 'dvw'],
  h: ['screen', 'svh', 'lvh', 'dvh'],
};
/** Taffy's grid line is a 16-bit signed integer and a span a 16-bit unsigned one. */
const MAX_GRID_LINE = 2 ** 15 - 1;
const MAX_GRID_SPAN = 2 ** 16 - 1;
/** What a bare `grid-cols-N` can ask for: Taffy's own bound on tracks, which the native side also refuses past. */
const MAX_GRID_COUNT = 1000;
/** Tailwind's scales for the classes that have one: `col-span-1` to `col-span-12`, `col-start-1` to `col-start-13`, `order-1` to `order-12`. */
const MAX_SCALE_SPAN = 12;
const MAX_SCALE_LINE = 13;
const MAX_SCALE_ORDER = 12;

function lookup<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

/** A CSS length in an arbitrary value: `[10px]`, `[1.5rem]`, or `[0]`. */
function parseArbitraryLength(value: string): number | undefined {
  const match = /^\[(\d*\.?\d+)(px|rem)?\]$/.exec(value);
  if (match?.[1] === undefined) return undefined;
  const amount = Number(match[1]);
  if (match[2] === 'px') return amount;
  if (match[2] === 'rem') return amount * REM_PX;
  return amount === 0 ? 0 : undefined;
}

/** A step of Tailwind's spacing scale (`4` is 16 px, `px` one pixel, `1.5` six) or an arbitrary length. */
function parseSpacing(value: string): number | undefined {
  if (value === 'px') return 1;
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value) * SPACING_UNIT;
  return parseArbitraryLength(value);
}

function parseFraction(value: string): `${number}%` | undefined {
  const match = /^(\d+)\/(\d+)$/.exec(value);
  if (match?.[1] === undefined || match[2] === undefined) return undefined;
  const denominator = Number(match[2]);
  const percentage = Number(match[1]) / denominator * PERCENT;
  return denominator === 0 || !Number.isFinite(percentage) ? undefined : `${percentage}%`;
}

/** `[50%]`, `[50vw]` and `[50vh]`. */
function parseArbitraryShare(value: string): `${number}%` | `${number}vw` | `${number}vh` | undefined {
  const match = /^\[(\d*\.?\d+)(%|vw|vh)\]$/.exec(value);
  if (match?.[1] === undefined) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  if (match[2] === '%') return `${amount}%`;
  return match[2] === 'vw' ? `${amount}vw` : `${amount}vh`;
}

function viewportSize(name: string, axis: 'w' | 'h'): '100vw' | '100vh' | undefined {
  if (!VIEWPORT_NAMES[axis].includes(name)) return undefined;
  return axis === 'w' ? '100vw' : '100vh';
}

type SizeFamily = 'w' | 'h' | 'size' | 'min-w' | 'min-h' | 'max-w' | 'max-h';
const SIZE_FAMILIES: readonly SizeFamily[] = ['w', 'h', 'size', 'min-w', 'min-h', 'max-w', 'max-h'];

function isSizeFamily(value: string): value is SizeFamily {
  return SIZE_FAMILIES.some(family => family === value);
}

/**
 * The value of a size utility, as Tailwind's scale gives it: spacing, fractions, `auto`, `full`, `screen` and its
 * viewport variants on the side they belong to, the intrinsic keywords, and arbitrary lengths and shares. A limit
 * (`min-*`, `max-*`) takes `none` (max) and `0`, and cannot take an intrinsic keyword.
 */
function parseSize(family: SizeFamily, value: string): Dimension | undefined {
  const limit = family.startsWith('min-') || family.startsWith('max-');
  const axis = family === 'size' ? undefined : family.endsWith('w') ? 'w' : 'h';
  if (family === 'max-w') {
    const named = lookup(MAX_WIDTHS, value);
    if (named !== undefined) return named;
    if (value.startsWith('screen-')) return lookup(SCREEN_WIDTHS, value.slice('screen-'.length));
  }
  if (value === 'none') return family.startsWith('max-') ? 'auto' : undefined;
  if (value === 'auto') return limit ? undefined : 'auto';
  if (value === 'full') return '100%';
  if (value === 'min') return 'min-content';
  if (value === 'max') return 'max-content';
  if (value === 'fit') return 'fit-content';
  // `screen` and its viewport variants are on Tailwind's `w`, `h`, `min-h` and `max-h` scales, not on `size`, `min-w` or `max-w`.
  if (axis !== undefined && family !== 'min-w' && family !== 'max-w') {
    const viewport = viewportSize(value, axis);
    if (viewport !== undefined) return viewport;
  }
  return parseSpacing(value) ?? parseFraction(value) ?? parseArbitraryShare(value) ?? parseArbitraryKeyword(value);
}

/** `[fit-content]`, `[min-content]` and `[max-content]`: the keywords as an arbitrary value. */
function parseArbitraryKeyword(value: string): 'min-content' | 'max-content' | 'fit-content' | 'auto' | undefined {
  switch (value) {
    case '[min-content]': return 'min-content';
    case '[max-content]': return 'max-content';
    case '[fit-content]': return 'fit-content';
    case '[auto]': return 'auto';
    default: return undefined;
  }
}

function isIntrinsic(value: Dimension): value is 'min-content' | 'max-content' | 'fit-content' {
  return value === 'min-content' || value === 'max-content' || value === 'fit-content';
}

function sizeUtility(family: SizeFamily, value: string): Style | undefined {
  const size = parseSize(family, value);
  if (size === undefined) return undefined;
  if (family === 'size') return { width: size, height: size };
  if (family === 'w') return { width: size };
  if (family === 'h') return { height: size };
  // A limit takes lengths and percentages only (Taffy's `min_size` and `max_size`); the keyword that Tailwind's
  // `min-w-min` and the like mean has no native counterpart, and compiling it to `auto` would be a silent no-op.
  if (isIntrinsic(size)) return undefined;
  const bound: SizeLimit = size;
  switch (family) {
    case 'min-w': return { minWidth: bound };
    case 'min-h': return { minHeight: bound };
    case 'max-w': return { maxWidth: bound };
    case 'max-h': return { maxHeight: bound };
  }
}

/** A margin's value: spacing (negative with a `-`), `auto` (not negative) or an arbitrary length or percentage. */
function parseMargin(value: string, negative: boolean): Margin | undefined {
  if (value === 'auto') return negative ? undefined : 'auto';
  const share = value.startsWith('[') ? parseArbitraryShare(value) : undefined;
  if (share !== undefined) {
    if (!share.endsWith('%')) return undefined;
    const percent = Number.parseFloat(share);
    return negative && percent !== 0 ? `${-percent}%` : `${percent}%`;
  }
  const length = parseSpacing(value);
  if (length === undefined) return undefined;
  return negative && length !== 0 ? -length : length;
}

type Side = 'Top' | 'Right' | 'Bottom' | 'Left';

/** The sides a margin or padding family sets; `s` and `e` are the start and end, which are left and right in a left-to-right layout. */
const SIDES: Readonly<Record<string, readonly Side[]>> = {
  '': ['Top', 'Right', 'Bottom', 'Left'], x: ['Left', 'Right'], y: ['Top', 'Bottom'],
  t: ['Top'], r: ['Right'], b: ['Bottom'], l: ['Left'], s: ['Left'], e: ['Right'],
};

function marginUtility(sides: string, value: string, negative: boolean): Style | undefined {
  const margin = parseMargin(value, negative);
  const targets = lookup(SIDES, sides);
  if (margin === undefined || targets === undefined) return undefined;
  if (sides === '') return { margin };
  const style: Style = {};
  for (const side of targets) Reflect.set(style, `margin${side}`, margin);
  return style;
}

function paddingUtility(sides: string, value: string): Style | undefined {
  const padding = parseSpacing(value);
  const targets = lookup(SIDES, sides);
  if (padding === undefined || targets === undefined) return undefined;
  if (sides === '') return { padding };
  const style: Style = {};
  for (const side of targets) Reflect.set(style, `padding${side}`, padding);
  return style;
}

function gapUtility(axis: string, value: string): Style | undefined {
  const gap = parseSpacing(value);
  if (gap === undefined) return undefined;
  if (axis === 'x') return { columnGap: gap };
  return axis === 'y' ? { rowGap: gap } : { gap };
}

/** A non-negative number in an arbitrary value: Tailwind's `grow-[2]`. */
function parseArbitraryNumber(value: string): number | undefined {
  const match = /^\[(\d*\.?\d+)\]$/.exec(value);
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

function parseNumberToken(token: string | undefined): number | undefined {
  return token !== undefined && /^\d*\.?\d+$/.test(token) ? Number(token) : undefined;
}

function parseBasis(value: string): Dimension | undefined {
  if (value === 'auto') return 'auto';
  if (value === 'full') return '100%';
  return parseSpacing(value) ?? parseFraction(value) ?? parseArbitraryShare(value) ?? parseArbitraryKeyword(value);
}

/**
 * `flex-[2]` is `2 1 0%`; `flex-[2_3]` is `2 3 0%`; `flex-[2_auto]` and `flex-[1_0_10px]` give the basis too. A basis is
 * what an arbitrary size is (`10px`, `50%`, `auto`).
 */
function parseFlexShorthand(inner: string): Style | undefined {
  const [first, second, third, ...extra] = inner.split('_');
  const flexGrow = parseNumberToken(first);
  if (flexGrow === undefined || extra.length > 0) return undefined;
  if (second === undefined) return { flexGrow, flexShrink: 1, flexBasis: '0%' };
  const shrink = parseNumberToken(second);
  if (shrink !== undefined) {
    if (third === undefined) return { flexGrow, flexShrink: shrink, flexBasis: '0%' };
    const flexBasis = parseBasis(third === 'auto' ? third : `[${third}]`);
    return flexBasis === undefined ? undefined : { flexGrow, flexShrink: shrink, flexBasis };
  }
  if (third !== undefined) return undefined;
  const flexBasis = parseBasis(second === 'auto' ? second : `[${second}]`);
  return flexBasis === undefined ? undefined : { flexGrow, flexShrink: 1, flexBasis };
}

// ---- Grid ----

function positiveInteger(value: string, max: number): number | undefined {
  if (!/^[1-9]\d*$/.test(value)) return undefined;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount <= max ? amount : undefined;
}

/** A track size in an arbitrary template: `200px`, `1.5rem`, `1fr`, `30%`, `auto`, `min-content`, `max-content`, or `0`. */
function parseTrackSize(text: string): GridTrackSize | undefined {
  if (text === 'auto' || text === 'min-content' || text === 'max-content') return text;
  const match = /^(\d*\.?\d+)(px|rem|fr|%)?$/.exec(text);
  if (match?.[1] === undefined) return undefined;
  const amount = Number(match[1]);
  switch (match[2]) {
    case 'px': return amount;
    case 'rem': return amount * REM_PX;
    case 'fr': return `${amount}fr`;
    case '%': return `${amount}%`;
    default: return amount === 0 ? 0 : undefined;
  }
}

/** Split `text` at the commas or underscores that are not inside parentheses. */
function splitTopLevel(text: string, separator: ',' | '_'): string[] | undefined {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of text) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (depth < 0) return undefined;
    if (character === separator && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (depth !== 0) return undefined;
  parts.push(current);
  return parts;
}

/** An underscore inside a function's arguments is the space Tailwind cannot put in a class name. */
function spaces(text: string): string {
  return text.replaceAll('_', ' ').trim();
}

function isPercentTrack(size: GridTrackSize | undefined): size is `${number}%` {
  return typeof size === 'string' && /^[\d.]+%$/.test(size);
}

function parseTrack(text: string): GridTrack | undefined {
  const size = parseTrackSize(text);
  if (size !== undefined) return size;
  const minmax = /^minmax\((.+)\)$/.exec(text)?.[1];
  if (minmax !== undefined) {
    const pair = splitTopLevel(minmax, ',');
    const min = pair?.[0] === undefined ? undefined : parseTrackSize(spaces(pair[0]));
    const max = pair?.[1] === undefined ? undefined : parseTrackSize(spaces(pair[1]));
    return pair?.length === 2 && min !== undefined && max !== undefined ? { minmax: [min, max] } : undefined;
  }
  const fitContent = /^fit-content\((.+)\)$/.exec(text)?.[1];
  if (fitContent !== undefined) {
    const limit = parseTrackSize(spaces(fitContent));
    return typeof limit === 'number' || isPercentTrack(limit) ? { fitContent: limit } : undefined;
  }
  const repeat = /^repeat\((.+)\)$/.exec(text)?.[1];
  if (repeat !== undefined) {
    const comma = repeat.indexOf(',');
    if (comma < 0) return undefined;
    const countText = spaces(repeat.slice(0, comma));
    const count = countText === 'auto-fill' || countText === 'auto-fit' ? countText : positiveInteger(countText, MAX_GRID_COUNT);
    const tracks = parseTrackList(repeat.slice(comma + 1).replace(/^_+/, ''));
    return count === undefined || tracks === undefined ? undefined : { repeat: count, tracks };
  }
  return undefined;
}

/** Tracks separated by underscores (Tailwind's spaces in an arbitrary value): `[200px_minmax(0,1fr)_auto]`. */
function parseTrackList(text: string): GridTrack[] | undefined {
  const parts = splitTopLevel(text, '_');
  if (parts === undefined) return undefined;
  const tracks: GridTrack[] = [];
  for (const part of parts) {
    const track = parseTrack(part);
    if (track === undefined) return undefined;
    tracks.push(track);
  }
  return tracks;
}

function parseTemplate(value: string): GridTemplate | undefined {
  if (value === 'none') return [];
  const count = positiveInteger(value, MAX_GRID_COUNT);
  if (count !== undefined) return count;
  const inner = /^\[(.+)\]$/.exec(value)?.[1];
  return inner === undefined ? undefined : parseTrackList(inner);
}

/** `auto-cols-*` and `auto-rows-*`: `auto`, `min`, `max`, `fr` (`minmax(0, 1fr)`), or an arbitrary list. */
function parseAutoTracks(value: string): readonly GridTrack[] | undefined {
  switch (value) {
    case 'auto': return ['auto'];
    case 'min': return ['min-content'];
    case 'max': return ['max-content'];
    case 'fr': return [{ minmax: [0, '1fr'] }];
    default: {
      const inner = /^\[(.+)\]$/.exec(value)?.[1];
      const tracks = inner === undefined ? undefined : parseTrackList(inner);
      return tracks?.some(track => typeof track === 'object' && 'repeat' in track) ? undefined : tracks;
    }
  }
}

const GRID_FLOWS: Readonly<Record<string, GridAutoFlow>> = {
  row: 'row', col: 'column', dense: 'row-dense', 'row-dense': 'row-dense', 'col-dense': 'column-dense',
};

/** The lines a `col-*` or `row-*` class sets, on the axis `prefix` names (`col` or `row`); a start or an end may be negative (`-col-start-1` is `-1`, the last line). */
function placementUtility(prefix: 'col' | 'row', rest: string, negative: boolean): Style | undefined {
  const column = prefix === 'col';
  const set = (start?: GridLine, end?: GridLine, span?: number): Style => {
    const style: Style = {};
    if (start !== undefined) Reflect.set(style, column ? 'gridColumnStart' : 'gridRowStart', start);
    if (end !== undefined) Reflect.set(style, column ? 'gridColumnEnd' : 'gridRowEnd', end);
    if (span !== undefined) Reflect.set(style, column ? 'gridColumnSpan' : 'gridRowSpan', span);
    return style;
  };
  if (negative) {
    const negated = /^(start|end)-(.+)$/.exec(rest);
    const line = negated?.[2] === undefined ? undefined : parseGridLine(negated[2]);
    if (negated?.[1] === undefined || line === undefined) return undefined;
    return negated[1] === 'start' ? set(-line) : set(undefined, -line);
  }
  if (rest === 'auto') return set('auto', 'auto');
  const spanMatch = /^span-(.+)$/.exec(rest)?.[1];
  if (spanMatch === 'full') return set(1, -1);
  if (spanMatch !== undefined) {
    const arbitrary = /^\[(\d+)\]$/.exec(spanMatch)?.[1];
    const span = arbitrary === undefined ? positiveInteger(spanMatch, MAX_SCALE_SPAN) : positiveInteger(arbitrary, MAX_GRID_SPAN);
    return span === undefined ? undefined : set(undefined, undefined, span);
  }
  const edge = /^(start|end)-(.+)$/.exec(rest);
  if (edge?.[1] === undefined || edge[2] === undefined) return undefined;
  const line = edge[2] === 'auto' ? 'auto' : parseGridLine(edge[2]);
  if (line === undefined) return undefined;
  return edge[1] === 'start' ? set(line) : set(undefined, line);
}

/** `3` on Tailwind's scale (1 to 13), or `[3]` and `[-2]` for any other line. */
function parseGridLine(value: string): number | undefined {
  const arbitrary = /^\[(-?[1-9]\d*)\]$/.exec(value)?.[1];
  if (arbitrary === undefined) return positiveInteger(value, MAX_SCALE_LINE);
  const line = Number(arbitrary);
  return Number.isSafeInteger(line) && Math.abs(line) <= MAX_GRID_LINE ? line : undefined;
}

// ---- Alignment ----

/** The values of `content-*`, `justify-*` and the `place-content-*` classes, as Tailwind's CSS spells them. */
const CONTENT_VALUES: Readonly<Record<string, Justification>> = {
  normal: 'normal', center: 'center', start: 'flex-start', end: 'flex-end', between: 'space-between', around: 'space-around',
  evenly: 'space-evenly', stretch: 'stretch',
};
/** `place-content-*` is the CSS shorthand, whose keywords are not flex-relative. */
const PLACE_CONTENT_VALUES: Readonly<Record<string, Justification>> = {
  center: 'center', start: 'start', end: 'end', between: 'space-between', around: 'space-around', evenly: 'space-evenly', stretch: 'stretch',
};
const ITEM_VALUES: Readonly<Record<string, Alignment>> = { start: 'start', end: 'end', center: 'center', stretch: 'stretch' };
const PLACE_ITEM_VALUES: Readonly<Record<string, Alignment>> = { ...ITEM_VALUES, baseline: 'baseline' };
const SELF_VALUES: Readonly<Record<string, SelfAlignment>> = { auto: 'auto', ...ITEM_VALUES };

function alignmentUtility(utility: string): Style | undefined {
  const match = /^(content|justify-items|justify-self|place-content|place-items|place-self)-(.+)$/.exec(utility);
  if (match?.[1] === undefined || match[2] === undefined) return undefined;
  const value = match[2];
  switch (match[1]) {
    case 'content': {
      const alignContent = lookup(CONTENT_VALUES, value);
      return alignContent === undefined ? undefined : { alignContent };
    }
    case 'justify-items': {
      const justifyItems = lookup(ITEM_VALUES, value);
      return justifyItems === undefined ? undefined : { justifyItems };
    }
    case 'justify-self': {
      const justifySelf = lookup(SELF_VALUES, value);
      return justifySelf === undefined ? undefined : { justifySelf };
    }
    case 'place-content': {
      const place = lookup(PLACE_CONTENT_VALUES, value);
      return place === undefined ? undefined : { alignContent: place, justifyContent: place };
    }
    case 'place-items': {
      const place = lookup(PLACE_ITEM_VALUES, value);
      return place === undefined ? undefined : { alignItems: place, justifyItems: place };
    }
    case 'place-self': {
      const place = lookup(SELF_VALUES, value);
      return place === undefined ? undefined : { alignSelf: place, justifySelf: place };
    }
    default: return undefined;
  }
}

function orderUtility(negative: boolean, value: string): Style | undefined {
  // Tailwind negates the numbers: `-order-first` is `order-last`'s 9999.
  if (value === 'first' || value === 'last') {
    const order = value === 'first' ? -ORDER_EXTREME : ORDER_EXTREME;
    return { order: negative ? -order : order };
  }
  if (value === 'none') return { order: 0 };
  const arbitrary = /^\[(-?\d+)\]$/.exec(value)?.[1];
  const order = arbitrary === undefined ? positiveInteger(value, MAX_SCALE_ORDER) : Number(arbitrary);
  if (order === undefined || !Number.isSafeInteger(order) || Math.abs(order) > MAX_ORDER) return undefined;
  return { order: negative && order !== 0 ? -order : order };
}

function aspectUtility(value: string): Style | undefined {
  if (value === 'auto') return { aspectRatio: 'auto' };
  if (value === 'square') return { aspectRatio: 1 };
  if (value === 'video') return { aspectRatio: ASPECT_VIDEO };
  const ratio = /^\[(\d*\.?\d+)(?:\/(\d*\.?\d+))?\]$/.exec(value);
  if (ratio?.[1] === undefined) return undefined;
  const aspectRatio = Number(ratio[1]) / (ratio[2] === undefined ? 1 : Number(ratio[2]));
  return Number.isFinite(aspectRatio) && aspectRatio > 0 ? { aspectRatio } : undefined;
}

const STATIC: Readonly<Record<string, Style>> = {
  block: { display: 'block' },
  'flow-root': { display: 'flow-root' },
  visible: { visibility: 'visible' },
  invisible: { visibility: 'hidden' },
  'overflow-clip': { overflow: 'clip' },
  'overflow-x-clip': { overflowX: 'clip' },
  'overflow-y-clip': { overflowY: 'clip' },
  // `container` is `width: 100%`; `compileToken` (src/styles.ts) adds the `maxWidth` of each breakpoint after it.
  container: { width: '100%' },
  // `sr-only`: a 1 px box that takes no room and clips what it holds, which a screen reader still reads (there is no `clip`).
  'sr-only': { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', borderWidth: 0 },
  'not-sr-only': { position: 'static', width: 'auto', height: 'auto', padding: 0, margin: 0, overflow: 'visible' },
  'box-border': { boxSizing: 'border-box' },
  'box-content': { boxSizing: 'content-box' },
  'self-auto': { alignSelf: 'auto' },
  'justify-normal': { justifyContent: 'normal' },
  'justify-stretch': { justifyContent: 'stretch' },
};

/**
 * The style a layout utility sets, or `undefined` when `utility` is none of them. `utility` has no variants (they were
 * split off before), and a negative one still has its `-`.
 */
export function layoutUtility(utility: string): Style | undefined {
  const fixed = lookup(STATIC, utility);
  if (fixed !== undefined) return fixed;

  const spacing = /^(-?)(m|mx|my|mt|mr|mb|ml|ms|me|p|px|py|pt|pr|pb|pl|ps|pe|gap-x|gap-y|gap)-(.+)$/.exec(utility);
  if (spacing?.[2] !== undefined && spacing[3] !== undefined) {
    const negative = spacing[1] === '-';
    const family = spacing[2];
    if (family.startsWith('m')) return marginUtility(family.slice(1), spacing[3], negative);
    if (negative) return undefined;
    if (family.startsWith('p')) return paddingUtility(family.slice(1), spacing[3]);
    return gapUtility(family.slice('gap'.length + 1), spacing[3]);
  }

  const size = /^(size|w|h|min-w|min-h|max-w|max-h)-(.+)$/.exec(utility);
  if (size?.[1] !== undefined && size[2] !== undefined && isSizeFamily(size[1])) {
    return sizeUtility(size[1], size[2]);
  }
  const basis = /^basis-(.+)$/.exec(utility)?.[1];
  if (basis !== undefined) {
    const flexBasis = parseBasis(basis);
    return flexBasis === undefined ? undefined : { flexBasis };
  }
  const flex = /^flex-\[(.+)\]$/.exec(utility)?.[1];
  if (flex !== undefined) return parseFlexShorthand(flex);
  const growth = /^(grow|shrink)-(\[.+\])$/.exec(utility);
  if (growth?.[1] !== undefined && growth[2] !== undefined) {
    const amount = parseArbitraryNumber(growth[2]);
    if (amount === undefined) return undefined;
    return growth[1] === 'grow' ? { flexGrow: amount } : { flexShrink: amount };
  }

  const order = /^(-?)order-(.+)$/.exec(utility);
  if (order?.[2] !== undefined) return orderUtility(order[1] === '-', order[2]);
  const aspect = /^aspect-(.+)$/.exec(utility)?.[1];
  if (aspect !== undefined) return aspectUtility(aspect);

  const columns = /^grid-cols-(.+)$/.exec(utility)?.[1];
  if (columns !== undefined) {
    const gridTemplateColumns = parseTemplate(columns);
    return gridTemplateColumns === undefined ? undefined : { gridTemplateColumns };
  }
  const rows = /^grid-rows-(.+)$/.exec(utility)?.[1];
  if (rows !== undefined) {
    const gridTemplateRows = parseTemplate(rows);
    return gridTemplateRows === undefined ? undefined : { gridTemplateRows };
  }
  const flow = /^grid-flow-(.+)$/.exec(utility)?.[1];
  if (flow !== undefined) {
    const gridAutoFlow = lookup(GRID_FLOWS, flow);
    return gridAutoFlow === undefined ? undefined : { gridAutoFlow };
  }
  const autoColumns = /^auto-cols-(.+)$/.exec(utility)?.[1];
  if (autoColumns !== undefined) {
    const gridAutoColumns = parseAutoTracks(autoColumns);
    return gridAutoColumns === undefined ? undefined : { gridAutoColumns };
  }
  const autoRows = /^auto-rows-(.+)$/.exec(utility)?.[1];
  if (autoRows !== undefined) {
    const gridAutoRows = parseAutoTracks(autoRows);
    return gridAutoRows === undefined ? undefined : { gridAutoRows };
  }
  const placement = /^(-?)(col|row)-(.+)$/.exec(utility);
  if (placement?.[2] !== undefined && placement[3] !== undefined && (placement[2] === 'col' || placement[2] === 'row')) {
    return placementUtility(placement[2], placement[3], placement[1] === '-');
  }
  return alignmentUtility(utility);
}
