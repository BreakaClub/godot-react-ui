import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStyle } from '../src/styles';

const style = (className: string) => compileStyle(className).layers[0]?.style;

test('bg-conic is Tailwind v4\'s: from 0deg in oklab, an angle in whole degrees, a colour space modifier', () => {
  assert.deepEqual(style('bg-conic')?.gradientParts, { conic: { fromDegrees: 0, space: 'oklab' } });
  assert.deepEqual(style('bg-conic-90')?.gradientParts, { conic: { fromDegrees: 90, space: 'oklab' } });
  assert.deepEqual(style('-bg-conic-45/srgb')?.gradientParts, { conic: { fromDegrees: -45, space: 'srgb' } });
  assert.deepEqual(style('bg-conic from-red-500 to-blue-500')?.gradientParts, {
    conic: { fromDegrees: 0, space: 'oklab' }, from: '#ef4444', to: '#3b82f6',
  });
  for (const unsupported of ['bg-conic/oklch', '-bg-conic', 'bg-conic-[from_45deg]', 'bg-radial', 'bg-[radial-gradient(#fff,#000)]']) {
    assert.throws(() => compileStyle(unsupported), /Unsupported/, unsupported);
  }
});

test('a linear direction and a conic one replace each other, keeping the stops', () => {
  assert.deepEqual(style('bg-conic from-red-500 bg-gradient-to-r')?.gradientParts, { direction: 'to-r', from: '#ef4444' });
  assert.deepEqual(style('bg-gradient-to-r from-red-500 bg-conic-30')?.gradientParts, {
    conic: { fromDegrees: 30, space: 'oklab' }, from: '#ef4444',
  });
  assert.deepEqual(style('bg-[conic-gradient(#fff,#000)]')?.backgroundImage, 'conic-gradient(#fff,#000)');
});

test('the glimmer\'s light compiles to a v4 conic gradient with its stops where the classes put them', () => {
  assert.deepEqual(style('absolute bg-conic from-transparent from-70% via-sky-300 via-90% to-transparent')?.gradientParts, {
    conic: { fromDegrees: 0, space: 'oklab' },
    from: '#00000000', fromPosition: 70, via: '#7dd3fc', viaPosition: 90, to: '#00000000',
  });
});
