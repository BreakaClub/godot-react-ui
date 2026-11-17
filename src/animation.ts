import type {
  Animation, CompiledAnimation, Keyframe, KeyframeBlock, KeyframeRules, KeyframeSelector, Keyframes, KeyframeStyle,
} from './types';

/**
 * CSS animations as styles declare them: `defineKeyframes` compiles a `@keyframes` block once into a frozen rule, and
 * `compileAnimations` turns a style's `animation` into the list native receives. The keyframes travel with the style that
 * uses them, so there is nothing to register on a root; native names a rule after its contents, so two rules with one name
 * never collide and a rule used by many elements is registered once. Native validates every value again (`native/animation.rs`).
 */

const PERCENT = 100;
/** `from` and `to`. */
const FIRST_OFFSET = 0;
const LAST_OFFSET = 1;
/** What a rule written inline in a style is called. */
const INLINE_NAME = 'inline';
const NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

function selectorOffset(selector: string): number {
  if (selector === 'from') return FIRST_OFFSET;
  if (selector === 'to') return LAST_OFFSET;
  const match = /^(\d*\.?\d+)%$/.exec(selector);
  const percent = match?.[1] === undefined ? Number.NaN : Number(match[1]);
  if (!Number.isFinite(percent) || percent < 0 || percent > PERCENT) {
    throw new Error(`Keyframe selector ${JSON.stringify(selector)} must be from, to or a percentage from 0% to 100%`);
  }
  return percent / PERCENT;
}

function isSelector(key: string): key is KeyframeSelector {
  return key === 'from' || key === 'to' || key.endsWith('%');
}

function compileFrames(name: string, rules: KeyframeRules): readonly Keyframe[] {
  const frames: Keyframe[] = [];
  for (const [selector, block] of Object.entries(rules)) {
    if (block === undefined) continue;
    if (!isSelector(selector)) throw new Error(`Keyframes ${JSON.stringify(name)}: ${JSON.stringify(selector)} is not a keyframe selector`);
    const offset = selectorOffset(selector);
    if (frames.some(frame => frame.offset === offset)) {
      throw new Error(`Keyframes ${JSON.stringify(name)}: two keyframes are at ${offset * PERCENT}%`);
    }
    const { easing, ...style }: KeyframeBlock = block;
    const own: KeyframeStyle = { ...style };
    frames.push(Object.freeze({ offset, style: Object.freeze(own), ...(easing === undefined ? {} : { easing }) }));
  }
  if (frames.length === 0) throw new Error(`Keyframes ${JSON.stringify(name)} has no keyframes`);
  frames.sort((left, right) => left.offset - right.offset);
  return Object.freeze(frames);
}

/**
 * A `@keyframes` rule: `defineKeyframes('glow', { from: { opacity: 0.4 }, to: { opacity: 1 } })`. Use it in a style's
 * `animation: { keyframes: glow, durationMs: 1200, iterations: 'infinite' }`; one rule serves every element that names it.
 */
export function defineKeyframes(name: string, rules: KeyframeRules): Keyframes {
  if (!NAME_PATTERN.test(name)) throw new Error(`Keyframes name ${JSON.stringify(name)} must be letters, digits, '-' and '_'`);
  return Object.freeze({ kind: 'keyframes', name, frames: compileFrames(name, rules) });
}

function isKeyframes(keyframes: Keyframes | KeyframeRules): keyframes is Keyframes {
  return 'kind' in keyframes && keyframes.kind === 'keyframes';
}

function compileAnimation(animation: Animation): CompiledAnimation {
  const keyframes = isKeyframes(animation.keyframes)
    ? { name: animation.keyframes.name, frames: animation.keyframes.frames }
    : { name: INLINE_NAME, frames: compileFrames(INLINE_NAME, animation.keyframes) };
  const { durationMs, delayMs, easing, iterations, direction, fillMode, playState } = animation;
  return {
    keyframes,
    durationMs,
    ...(delayMs === undefined ? {} : { delayMs }),
    ...(easing === undefined ? {} : { easing }),
    ...(iterations === undefined ? {} : { iterations }),
    ...(direction === undefined ? {} : { direction }),
    ...(fillMode === undefined ? {} : { fillMode }),
    ...(playState === undefined ? {} : { playState }),
  };
}

function isAnimationList(animation: Animation | readonly Animation[]): animation is readonly Animation[] {
  return Array.isArray(animation);
}

/** A style's `animation` as native receives it: a list, empty for `none`. */
export function compileAnimations(animation: Animation | readonly Animation[] | 'none'): readonly CompiledAnimation[] {
  if (animation === 'none') return [];
  return isAnimationList(animation) ? animation.map(compileAnimation) : [compileAnimation(animation)];
}
