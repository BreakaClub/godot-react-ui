import type { Easing, LonghandStyle, TransitionParts, TransitionProperty } from '../types';
import { TRANSITION_PROPERTIES } from '../types';

/**
 * Tailwind v3's transition utilities (`transition`, `transition-colors`, `transition-opacity`, `transition-none`,
 * `transition-all`, `duration-*`, `delay-*`, `ease-*`) with Tailwind's own timing: `transition` is 150 ms with
 * `cubic-bezier(0.4, 0, 0.2, 1)`, and `ease-in` is `cubic-bezier(0.4, 0, 1, 1)`, not CSS's `ease-in` keyword.
 *
 * Each class sets one or more of the CSS longhands (`transition-property`, `-duration`, `-delay`, `-timing-function`) and
 * nothing else, so they compose across variants and layers as the CSS does (`transition-colors hover:duration-500`), and
 * `duration-200` alone animates every property, since `all` is the property list's initial value.
 *
 * The properties come from `TRANSITION_PROPERTIES` (`src/types.ts`), the one list of what native can animate: a Tailwind
 * list names CSS properties (`color, background-color, ..., box-shadow, transform`), and the ones that list does not hold
 * are left out of it, so a property that gains native support is animated by every class that names it as soon as it is
 * added there.
 */

export type TransitionUtilityStyle = Pick<LonghandStyle, 'transitionParts'>;

/** Tailwind's `transitionDuration.DEFAULT`, which each of the `transition*` classes sets with the timing function. */
const DEFAULT_DURATION_MS = 150;
/** Tailwind's `transitionTimingFunction.DEFAULT`, which is also its `ease-in-out`. */
const EASE_IN_OUT: Easing = { cubicBezier: [0.4, 0, 0.2, 1] };
const EASINGS: Readonly<Record<string, Easing>> = {
  linear: 'linear',
  in: { cubicBezier: [0.4, 0, 1, 1] },
  out: { cubicBezier: [0, 0, 0.2, 1] },
  'in-out': EASE_IN_OUT,
};
/** The steps Tailwind names for `duration-*` and `delay-*`. */
const TIME_STEPS_MS = [0, 75, 100, 150, 200, 300, 500, 700, 1000];
const MS_PER_SECOND = 1000;

/** What `transition`, `transition-colors`, `transition-opacity`, `transition-shadow` and `transition-transform` name, as CSS properties. */
const TRANSITION_GROUPS: Readonly<Record<string, readonly string[]>> = {
  '': [
    'color', 'background-color', 'border-color', 'text-decoration-color', 'fill', 'stroke', 'opacity', 'box-shadow', 'transform',
    'filter', 'backdrop-filter',
  ],
  colors: ['color', 'background-color', 'border-color', 'text-decoration-color', 'fill', 'stroke'],
  opacity: ['opacity'],
  shadow: ['box-shadow'],
  transform: ['transform'],
};

function kebab(property: string): string {
  return property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

const NATIVE_BY_CSS: ReadonlyMap<string, TransitionProperty> = new Map(
  TRANSITION_PROPERTIES.map((property): [string, TransitionProperty] => [kebab(property), property]),
);

/** The properties of a group that native animates, in the group's order; empty when it animates none of them. */
export function animatedProperties(group: string): TransitionProperty[] {
  const properties: TransitionProperty[] = [];
  const names = Object.hasOwn(TRANSITION_GROUPS, group) ? TRANSITION_GROUPS[group] : undefined;
  for (const name of names ?? []) {
    const property = NATIVE_BY_CSS.get(name);
    if (property !== undefined) properties.push(property);
  }
  return properties;
}

/** Whether `group` (`shadow`, `transform`, ...) is a Tailwind transition group, even when native animates none of it. */
export function isTransitionGroup(group: string): boolean {
  return Object.hasOwn(TRANSITION_GROUPS, group);
}

/** `250ms` and `0.3s` in an arbitrary value, in milliseconds. */
function parseArbitraryTime(value: string): number | undefined {
  const match = /^\[(\d*\.?\d+)(ms|s)\]$/.exec(value);
  if (match?.[1] === undefined) return undefined;
  const amount = Number(match[1]) * (match[2] === 's' ? MS_PER_SECOND : 1);
  return Number.isFinite(amount) ? amount : undefined;
}

function parseTime(value: string): number | undefined {
  if (/^\d+$/.test(value) && TIME_STEPS_MS.includes(Number(value))) return Number(value);
  return parseArbitraryTime(value);
}

/** `[cubic-bezier(0.4,0,0.2,1)]`: four numbers, the x pair between 0 and 1 (CSS's rule for a timing function). */
function parseArbitraryEasing(value: string): Easing | undefined {
  const inner = /^\[cubic-bezier\(([^)]*)\)\]$/.exec(value)?.[1];
  if (inner === undefined) return undefined;
  const numbers = inner.split(',').map(part => part.replaceAll('_', ' ').trim());
  const [x1, y1, x2, y2] = numbers.map(part => (/^-?\d*\.?\d+$/.test(part) ? Number(part) : Number.NaN));
  if (numbers.length !== 4 || x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return undefined;
  if (![x1, y1, x2, y2].every(Number.isFinite) || x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return undefined;
  return { cubicBezier: [x1, y1, x2, y2] };
}

/**
 * The longhands a transition class sets, or `undefined` when the class is none of them (or names only properties native
 * cannot animate yet).
 */
export function transitionUtility(utility: string): TransitionUtilityStyle | undefined {
  const parts = ((): TransitionParts | undefined => {
    if (utility === 'transition-none') return { properties: 'none' };
    if (utility === 'transition-all') return { properties: 'all', durationMs: DEFAULT_DURATION_MS, easing: EASE_IN_OUT };
    const group = /^transition(?:-(.+))?$/.exec(utility);
    if (group !== null) {
      const properties = animatedProperties(group[1] ?? '');
      return properties.length === 0 ? undefined : { properties, durationMs: DEFAULT_DURATION_MS, easing: EASE_IN_OUT };
    }
    const duration = /^duration-(.+)$/.exec(utility)?.[1];
    if (duration !== undefined) {
      const durationMs = parseTime(duration);
      return durationMs === undefined ? undefined : { durationMs };
    }
    const delay = /^delay-(.+)$/.exec(utility)?.[1];
    if (delay !== undefined) {
      const delayMs = parseTime(delay);
      return delayMs === undefined ? undefined : { delayMs };
    }
    const ease = /^ease-(.+)$/.exec(utility)?.[1];
    if (ease !== undefined) {
      const easing = Object.hasOwn(EASINGS, ease) ? EASINGS[ease] : parseArbitraryEasing(ease);
      return easing === undefined ? undefined : { easing };
    }
    return undefined;
  })();
  return parts === undefined ? undefined : { transitionParts: parts };
}
