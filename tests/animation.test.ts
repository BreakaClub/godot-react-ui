import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileAnimations, defineKeyframes } from '../src/animation';
import { compileStyle } from '../src/styles';

test('defineKeyframes compiles a block into sorted, frozen keyframes', () => {
  const glow = defineKeyframes('glow', { to: { opacity: 1 }, from: { opacity: 0.4 }, '50%': { opacity: 0.8, easing: 'ease-in' } });
  assert.deepEqual(glow.frames.map(frame => frame.offset), [0, 0.5, 1]);
  assert.deepEqual(glow.frames[1], { offset: 0.5, style: { opacity: 0.8 }, easing: 'ease-in' });
  assert.ok(Object.isFrozen(glow) && Object.isFrozen(glow.frames) && Object.isFrozen(glow.frames[0]));
});

test('defineKeyframes refuses what CSS would not parse', () => {
  assert.throws(() => defineKeyframes('a b', { to: {} }), /letters, digits/);
  assert.throws(() => defineKeyframes('x', {}), /no keyframes/);
  assert.throws(() => defineKeyframes('x', { '120%': {} }), /from 0% to 100%/);
  assert.throws(() => defineKeyframes('x', { from: {}, '0%': {} }), /two keyframes are at 0%/);
});

test('an animation names a rule or writes it inline, and none is an empty list', () => {
  const spin = defineKeyframes('spin', { to: { transform: 'rotate(360deg)' } });
  const [named] = compileAnimations({ keyframes: spin, durationMs: 1000, iterations: 'infinite' });
  assert.deepEqual(named, { keyframes: { name: 'spin', frames: spin.frames }, durationMs: 1000, iterations: 'infinite' });
  assert.ok(!('kind' in (named?.keyframes ?? {})), 'native receives the rule without the marker');
  const [inline] = compileAnimations({ keyframes: { '50%': { opacity: 0.5 } }, durationMs: 2000 });
  assert.equal(inline?.keyframes.name, 'inline');
  assert.deepEqual(compileAnimations('none'), []);
});

test('the animate utilities carry Tailwind\'s keyframes and timings, and a later one replaces the list', () => {
  const [spin] = compileStyle('animate-spin').layers[0]?.style.animation ?? [];
  assert.equal(spin?.durationMs, 1000);
  assert.equal(spin?.easing, 'linear');
  assert.equal(spin?.iterations, 'infinite');
  assert.deepEqual(spin?.keyframes.frames, [{ offset: 1, style: { transform: 'rotate(360deg)' } }]);
  const [bounce] = compileStyle('animate-bounce').layers[0]?.style.animation ?? [];
  assert.equal(bounce?.easing, undefined, 'bounce keeps CSS\'s initial ease; its keyframes set their own');
  assert.deepEqual(bounce?.keyframes.frames.map(frame => frame.easing), [
    { cubicBezier: [0.8, 0, 1, 1] }, { cubicBezier: [0, 0, 0.2, 1] }, { cubicBezier: [0.8, 0, 1, 1] },
  ]);
  const [ping] = compileStyle('animate-ping').layers[0]?.style.animation ?? [];
  assert.deepEqual(ping?.keyframes.frames.map(frame => frame.offset), [0.75, 1]);
  const [pulse] = compileStyle('animate-pulse').layers[0]?.style.animation ?? [];
  assert.equal(pulse?.durationMs, 2000);
  assert.deepEqual(compileStyle('animate-spin animate-none').layers[0]?.style.animation, []);
  assert.deepEqual(compileStyle('animate-spin hover:animate-none').layers[1], { states: ['hover'], style: { animation: [] } });
  assert.throws(() => compileStyle('animate-wiggle'), /Unsupported/);
});
