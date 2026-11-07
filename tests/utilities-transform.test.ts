import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStyle } from '../src/styles';
import type { StyleProp, TransformParts } from '../src/types';

// ---- transform utilities (tailwindcss 3.4.17): one value per utility, merged per value, composed natively ----

function layersOf(className: string, style?: StyleProp) {
  return compileStyle(className, style).layers;
}

function partsOf(className: string): TransformParts | undefined {
  return layersOf(className)[0]?.style.transformParts;
}

test('translate takes the spacing scale in px, px, fractions, full and arbitrary lengths, and negates them', () => {
  assert.deepEqual(partsOf('translate-x-4'), { translateX: '16px' });
  assert.deepEqual(partsOf('translate-y-0.5'), { translateY: '2px' });
  assert.deepEqual(partsOf('translate-x-px'), { translateX: '1px' });
  assert.deepEqual(partsOf('translate-x-96'), { translateX: '384px' });
  assert.deepEqual(partsOf('translate-x-1/2'), { translateX: '50%' });
  assert.deepEqual(partsOf('translate-y-2/3'), { translateY: '66.666667%' });
  assert.deepEqual(partsOf('translate-x-full'), { translateX: '100%' });
  assert.deepEqual(partsOf('-translate-x-1/2'), { translateX: '-50%' });
  assert.deepEqual(partsOf('-translate-y-full'), { translateY: '-100%' });
  assert.deepEqual(partsOf('-translate-x-4'), { translateX: '-16px' });
  assert.deepEqual(partsOf('-translate-x-px'), { translateX: '-1px' });
  assert.deepEqual(partsOf('-translate-x-0'), { translateX: '0px' }, 'no negative zero');
  assert.deepEqual(partsOf('translate-x-[10px]'), { translateX: '10px' });
  assert.deepEqual(partsOf('-translate-x-[10px]'), { translateX: '-10px' });
  assert.deepEqual(partsOf('translate-y-[37.5%]'), { translateY: '37.5%' });
  assert.deepEqual(partsOf('translate-x-[calc(100%_-_8px)]'), { translateX: 'calc(100% - 8px)' });
  assert.deepEqual(partsOf('-translate-x-[calc(100%_-_8px)]'), { translateX: 'calc(calc(100% - 8px) * -1)' });
});

test('rotate, skew and scale take their Tailwind scales and arbitrary values', () => {
  for (const step of [0, 1, 2, 3, 6, 12, 45, 90, 180]) assert.deepEqual(partsOf(`rotate-${step}`), { rotate: `${step}deg` });
  assert.deepEqual(partsOf('-rotate-45'), { rotate: '-45deg' });
  assert.deepEqual(partsOf('-rotate-0'), { rotate: '0deg' });
  assert.deepEqual(partsOf('rotate-[17deg]'), { rotate: '17deg' });
  assert.deepEqual(partsOf('-rotate-[0.25turn]'), { rotate: '-0.25turn' });
  assert.deepEqual(partsOf('rotate-[1rad]'), { rotate: '1rad' });
  assert.deepEqual(partsOf('skew-x-6'), { skewX: '6deg' });
  assert.deepEqual(partsOf('-skew-y-12'), { skewY: '-12deg' });
  assert.deepEqual(partsOf('skew-x-[10deg]'), { skewX: '10deg' });
  assert.deepEqual(partsOf('scale-105'), { scaleX: 1.05, scaleY: 1.05 });
  assert.deepEqual(partsOf('scale-0'), { scaleX: 0, scaleY: 0 });
  assert.deepEqual(partsOf('scale-x-150'), { scaleX: 1.5 });
  assert.deepEqual(partsOf('scale-y-50'), { scaleY: 0.5 });
  assert.deepEqual(partsOf('-scale-x-100'), { scaleX: -1 });
  assert.deepEqual(partsOf('-scale-100'), { scaleX: -1, scaleY: -1 });
  assert.deepEqual(partsOf('scale-[1.7]'), { scaleX: 1.7, scaleY: 1.7 });
  assert.deepEqual(partsOf('scale-x-[170%]'), { scaleX: 1.7 });
});

test('transform-origin takes Tailwind keywords and arbitrary values', () => {
  const origins: Record<string, string> = {
    'origin-center': 'center', 'origin-top': 'top', 'origin-top-right': 'top right', 'origin-right': 'right',
    'origin-bottom-right': 'bottom right', 'origin-bottom': 'bottom', 'origin-bottom-left': 'bottom left',
    'origin-left': 'left', 'origin-top-left': 'top left',
  };
  for (const [name, css] of Object.entries(origins)) assert.deepEqual(layersOf(name), [{ style: { transformOrigin: css } }], name);
  assert.deepEqual(layersOf('origin-[10px_20px]'), [{ style: { transformOrigin: '10px 20px' } }]);
  assert.deepEqual(layersOf('origin-[50%_0]'), [{ style: { transformOrigin: '50% 0' } }]);
});

test('transform, transform-cpu, transform-gpu and transform-none', () => {
  assert.deepEqual(layersOf('transform'), [{ style: { transformParts: { gpu: false } } }]);
  assert.deepEqual(layersOf('transform-cpu'), [{ style: { transformParts: { gpu: false } } }]);
  assert.deepEqual(layersOf('transform-gpu'), [{ style: { transformParts: { gpu: true } } }]);
  assert.deepEqual(layersOf('transform-none'), [{ style: { transform: 'none' } }]);
});

test('values nothing in Tailwind names are rejected when compiled, active or not', () => {
  for (const name of [
    'translate-x-13', 'translate-x-auto', 'translate-x', 'translate-z-4', 'rotate-30', 'rotate-[30]', 'rotate-[1px]', 'skew-x-45',
    'scale-111', 'scale-x', 'scale-[a]', '-origin-top', 'origin-middle', 'origin-[calc(1px)]', 'translate-x-[2em]x', 'hover:rotate-31',
    'skew-12', 'translate-x-[url(x)]',
  ]) {
    assert.throws(() => compileStyle(name), /Unsupported utility class/u, name);
  }
});

test('separate utilities compose across variants and merge per value', () => {
  assert.deepEqual(layersOf('-translate-x-1/2 hover:scale-105'), [
    { style: { transformParts: { translateX: '-50%' } } },
    { states: ['hover'], style: { transformParts: { scaleX: 1.05, scaleY: 1.05 } } },
  ]);
  // Same conditions merge into one layer, value by value, the later class winning.
  assert.deepEqual(layersOf('-translate-x-1/2 rotate-45 translate-x-4 scale-x-110'), [
    { style: { transformParts: { translateX: '16px', rotate: '45deg', scaleX: 1.1 } } },
  ]);
  assert.deepEqual(layersOf('md:rotate-12 focus:skew-x-6')[0], { minWidth: 768, style: { transformParts: { rotate: '12deg' } } });
  // The origin is a property of its own, set by `origin-*` and replaced by an inline one (an inline style is one more
  // unconditional layer, which merges with the class layer before it).
  assert.deepEqual(layersOf('rotate-6 origin-top-left', { transformOrigin: 'bottom right' }), [
    { style: { transformOrigin: 'bottom right', transformParts: { rotate: '6deg' } } },
  ]);
});

test('an explicit transform replaces the list; a later utility takes the composed list back', () => {
  // An inline transform is a later layer than every class, so it replaces what the classes composed.
  assert.deepEqual(layersOf('-translate-x-1/2 hover:scale-105', { transform: 'rotate(10deg)' }), [
    { style: { transformParts: { translateX: '-50%' } } },
    { states: ['hover'], style: { transformParts: { scaleX: 1.05, scaleY: 1.05 } } },
    { style: { transform: 'rotate(10deg)' } },
  ]);
  assert.deepEqual(layersOf('rotate-45 transform-none'), [{ style: { transform: 'none' } }], 'transform-none after rotate-45: none');
  assert.deepEqual(layersOf('transform-none rotate-45'), [{ style: { transformParts: { rotate: '45deg' } } }], 'rotate-45 after transform-none: the list');
  assert.deepEqual(layersOf('', { transform: 'translate(10px, 5%) rotate(2deg)' }), [{ style: { transform: 'translate(10px, 5%) rotate(2deg)' } }]);
});

test('equal transform inputs intern to the identical compiled style', () => {
  assert.equal(compileStyle('-translate-x-1/2 hover:scale-105'), compileStyle('-translate-x-1/2  hover:scale-105'));
  assert.equal(compileStyle('', { transform: 'rotate(5deg)' }), compileStyle('', { transform: 'rotate(5deg)' }));
  assert.notEqual(compileStyle('rotate-6'), compileStyle('rotate-12'));
  const compiled = compileStyle('rotate-6');
  assert.ok(Object.isFrozen(compiled.layers[0]?.style.transformParts), 'the parts of an interned style are frozen');
});
