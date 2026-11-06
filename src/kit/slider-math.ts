import { Key } from './keys';

/** PageUp and PageDown move this many steps (the Authoring Practices leave the amount open; Radix uses 10). */
export const PAGE_STEPS = 10;
/** `(max - min) / step` is a float; a quotient this close below a whole number is that whole number. */
const STEP_EPSILON = 1e-9;
/** `Number.prototype.toFixed` accepts 0 to 100 digits (ECMA-262, 21.1.3.3). */
const MAX_FIXED_DIGITS = 100;

export interface SliderBounds {
  readonly min: number;
  /** The largest value the thumb can reach: `max` rounded down to a whole number of steps from `min`. */
  readonly max: number;
  readonly step: number;
  /** Digits after the point that a value on the grid can need, for rounding away float noise. */
  readonly decimals: number;
}

/** Digits after the point in the shortest decimal form of `value` (`1e-7` has 7). */
function decimalCount(value: number): number {
  const [mantissa = '', exponent = '0'] = String(value).split('e');
  const fraction = mantissa.split('.')[1]?.length ?? 0;
  return Math.max(0, fraction - Number(exponent));
}

function roundToDigits(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * The value grid of a slider: `min`, `min + step`, ... as far as `max`. The grid starts at `min`
 * (so `min: 1, step: 2` has 1, 3, 5), as in HTML. When `max` is not on the grid the largest grid value
 * below it is the slider's end, so the thumb can reach both ends of the track.
 */
export function sliderBounds(min: number, max: number, step: number): SliderBounds {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step)) {
    throw new Error(`Slider min, max and step must be finite numbers, not ${min}, ${max} and ${step}`);
  }
  if (!(step > 0)) throw new Error(`Slider step must be positive, not ${step}`);
  if (!(max > min)) throw new Error(`Slider max (${max}) must be greater than min (${min})`);
  const steps = Math.floor((max - min) / step + STEP_EPSILON);
  if (steps < 1) throw new Error(`Slider step ${step} is larger than max - min (${max - min})`);
  const decimals = Math.min(MAX_FIXED_DIGITS, Math.max(decimalCount(step), decimalCount(min)));
  return { min, max: roundToDigits(min + steps * step, decimals), step, decimals };
}

/** `value` held to the ends, without moving it onto the grid. */
export function clampToBounds(value: number, bounds: SliderBounds): number {
  return clamp(value, bounds.min, bounds.max);
}

/** The grid value nearest `raw`, within the bounds. */
export function snapToStep(raw: number, bounds: SliderBounds): number {
  const clamped = clamp(raw, bounds.min, bounds.max);
  const steps = Math.round((clamped - bounds.min) / bounds.step);
  return Math.min(roundToDigits(bounds.min + steps * bounds.step, bounds.decimals), bounds.max);
}

/** Where `value` sits between the ends: 0 at `min`, 1 at `max`. */
export function fractionOf(value: number, bounds: SliderBounds): number {
  return (clampToBounds(value, bounds) - bounds.min) / (bounds.max - bounds.min);
}

export function valueAtFraction(fraction: number, bounds: SliderBounds): number {
  return snapToStep(bounds.min + fraction * (bounds.max - bounds.min), bounds);
}

/**
 * The value a key asks for, or `undefined` for a key the slider does not use. Right and Up increase,
 * Left and Down decrease, whatever the orientation (Authoring Practices, slider).
 */
export function valueForKey(key: string, current: number, bounds: SliderBounds): number | undefined {
  switch (key) {
    case Key.ArrowRight: case Key.ArrowUp: return snapToStep(current + bounds.step, bounds);
    case Key.ArrowLeft: case Key.ArrowDown: return snapToStep(current - bounds.step, bounds);
    case Key.PageUp: return snapToStep(current + PAGE_STEPS * bounds.step, bounds);
    case Key.PageDown: return snapToStep(current - PAGE_STEPS * bounds.step, bounds);
    case Key.Home: return bounds.min;
    case Key.End: return bounds.max;
    default: return undefined;
  }
}

/** A track along one axis, in root-local pixels, and how a pointer on it maps to a value. */
export interface PointerAxis {
  /** The track's near edge (left, or top) and its length. */
  readonly start: number;
  readonly length: number;
  /** The thumb's length along the axis. The thumb lies inside the track, so its centre travels `length - thumbLength`. */
  readonly thumbLength: number;
  /** Values grow toward the near edge instead of away from it (a vertical slider: up is more). */
  readonly reversed: boolean;
}

/**
 * The fraction of the way along the track that puts the thumb's centre under `pointer`, held to 0..1
 * so a pointer beyond either end of the track gives that end. A track no longer than its thumb has no
 * travel and is always 0.
 */
export function fractionAtPointer(pointer: number, axis: PointerAxis): number {
  const travel = axis.length - axis.thumbLength;
  if (!(travel > 0)) return 0;
  const along = axis.reversed
    ? axis.start + axis.length - axis.thumbLength / 2 - pointer
    : pointer - axis.start - axis.thumbLength / 2;
  return clamp(along / travel, 0, 1);
}
