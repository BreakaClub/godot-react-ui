import { defineKeyframes } from '../animation';
import type { Style } from '../types';

/**
 * Tailwind's `animate-*` utilities with Tailwind's own keyframes and timings (v4's `theme.css`, the same as v3.4 but for
 * `pulse`, whose 0 % and 100 % v4 leaves to the element's own opacity): `animate-spin`, `animate-ping`, `animate-pulse`,
 * `animate-bounce` and `animate-none`. Each sets the whole `animation`, so a later class or variant replaces it
 * (`animate-spin hover:animate-none`).
 */

export type AnimationUtilityStyle = Pick<Style, 'animation'>;

const SPIN = defineKeyframes('spin', { to: { transform: 'rotate(360deg)' } });
const PING = defineKeyframes('ping', {
  '75%': { transform: 'scale(2)', opacity: 0 },
  '100%': { transform: 'scale(2)', opacity: 0 },
});
const PULSE = defineKeyframes('pulse', { '50%': { opacity: 0.5 } });
/** `bounce` falls in with `cubic-bezier(0.8, 0, 1, 1)` and comes back with `cubic-bezier(0, 0, 0.2, 1)`. */
const BOUNCE_DOWN = { cubicBezier: [0.8, 0, 1, 1] } as const;
const BOUNCE_UP = { cubicBezier: [0, 0, 0.2, 1] } as const;
const BOUNCE = defineKeyframes('bounce', {
  '0%': { transform: 'translateY(-25%)', easing: BOUNCE_DOWN },
  '50%': { transform: 'none', easing: BOUNCE_UP },
  '100%': { transform: 'translateY(-25%)', easing: BOUNCE_DOWN },
});

const SPIN_MS = 1000;
const PING_MS = 1000;
const PULSE_MS = 2000;
const BOUNCE_MS = 1000;

const ANIMATIONS: Readonly<Record<string, AnimationUtilityStyle>> = {
  'animate-spin': { animation: { keyframes: SPIN, durationMs: SPIN_MS, easing: 'linear', iterations: 'infinite' } },
  'animate-ping': {
    animation: { keyframes: PING, durationMs: PING_MS, easing: { cubicBezier: [0, 0, 0.2, 1] }, iterations: 'infinite' },
  },
  'animate-pulse': {
    animation: { keyframes: PULSE, durationMs: PULSE_MS, easing: { cubicBezier: [0.4, 0, 0.6, 1] }, iterations: 'infinite' },
  },
  // Tailwind's `bounce 1s infinite`: the animation's own timing function is CSS's initial `ease`, which each keyframe replaces.
  'animate-bounce': { animation: { keyframes: BOUNCE, durationMs: BOUNCE_MS, iterations: 'infinite' } },
  'animate-none': { animation: 'none' },
};

/** The style an `animate-*` class sets, or `undefined` when the class is not one of them. */
export function animationUtility(utility: string): AnimationUtilityStyle | undefined {
  return Object.hasOwn(ANIMATIONS, utility) ? ANIMATIONS[utility] : undefined;
}
