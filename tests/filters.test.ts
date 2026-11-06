import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStyle } from '../src/styles';
import type { FilterParts, StyleProp } from '../src/types';

// ---- filter and backdrop-filter utilities (Phase V1): one function per utility, merged per function ----

function layersOf(className: string, style?: StyleProp) {
  return compileStyle(className, style).layers;
}

function partsOf(className: string, key: 'filterParts' | 'backdropFilterParts' = 'filterParts'): FilterParts | undefined {
  return layersOf(className)[0]?.style[key];
}

test('Tailwind v3 blur scale, plain and backdrop, and arbitrary values', () => {
  const scale: Record<string, number> = {
    'blur-none': 0, 'blur-sm': 4, blur: 8, 'blur-md': 12, 'blur-lg': 16, 'blur-xl': 24, 'blur-2xl': 40, 'blur-3xl': 64,
  };
  for (const [name, radius] of Object.entries(scale)) {
    assert.deepEqual(partsOf(name), { blur: radius }, name);
    assert.deepEqual(partsOf(`backdrop-${name}`, 'backdropFilterParts'), { blur: radius }, `backdrop-${name}`);
  }
  assert.deepEqual(partsOf('blur-[6px]'), { blur: 6 });
  assert.deepEqual(partsOf('backdrop-blur-[2.5px]', 'backdropFilterParts'), { blur: 2.5 });
  assert.deepEqual(partsOf('blur-[0]'), { blur: 0 });
});

test('factor utilities take the steps Tailwind names and arbitrary amounts', () => {
  assert.deepEqual(partsOf('brightness-110'), { brightness: 1.1 });
  assert.deepEqual(partsOf('brightness-0'), { brightness: 0 });
  assert.deepEqual(partsOf('contrast-125'), { contrast: 1.25 });
  assert.deepEqual(partsOf('saturate-150'), { saturate: 1.5 });
  assert.deepEqual(partsOf('backdrop-saturate-150', 'backdropFilterParts'), { saturate: 1.5 });
  assert.deepEqual(partsOf('brightness-[1.75]'), { brightness: 1.75 });
  assert.deepEqual(partsOf('contrast-[.75]'), { contrast: 0.75 });
  assert.deepEqual(partsOf('saturate-[180%]'), { saturate: 1.8 });
  assert.deepEqual(partsOf('grayscale'), { grayscale: 1 });
  assert.deepEqual(partsOf('grayscale-0'), { grayscale: 0 });
  assert.deepEqual(partsOf('invert'), { invert: 1 });
  assert.deepEqual(partsOf('sepia-[0.4]'), { sepia: 0.4 });
  assert.deepEqual(partsOf('backdrop-sepia', 'backdropFilterParts'), { sepia: 1 });
  assert.deepEqual(partsOf('backdrop-opacity-50', 'backdropFilterParts'), { opacity: 0.5 });
  assert.deepEqual(partsOf('backdrop-opacity-[.35]', 'backdropFilterParts'), { opacity: 0.35 });
});

test('hue-rotate takes degrees, a leading minus, and CSS angle units', () => {
  assert.deepEqual(partsOf('hue-rotate-15'), { hueRotate: 15 });
  assert.deepEqual(partsOf('-hue-rotate-15'), { hueRotate: -15 });
  assert.deepEqual(partsOf('-hue-rotate-0'), { hueRotate: 0 });
  assert.deepEqual(partsOf('hue-rotate-[0.25turn]'), { hueRotate: 90 });
  assert.deepEqual(partsOf('hue-rotate-[3deg]'), { hueRotate: 3 });
  assert.ok(Math.abs((partsOf('hue-rotate-[1rad]')?.hueRotate ?? 0) - 57.29578) < 1e-4);
  assert.deepEqual(partsOf('-backdrop-hue-rotate-30', 'backdropFilterParts'), { hueRotate: -30 });
});

test('drop shadows: the named scale, none, and arbitrary shadows', () => {
  assert.deepEqual(partsOf('drop-shadow-md'), { dropShadow: { x: 0, y: 4, blur: 3, color: 'rgba(0, 0, 0, 0.13)' } });
  assert.deepEqual(partsOf('drop-shadow-none'), { dropShadow: 'none' });
  assert.deepEqual(partsOf('drop-shadow'), { dropShadow: { x: 0, y: 1, blur: 2, color: 'rgba(0, 0, 0, 0.16)' } });
  assert.deepEqual(partsOf('drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]'), {
    dropShadow: { x: 0, y: 4, blur: 4, color: 'rgba(0,0,0,0.25)' },
  });
  assert.deepEqual(partsOf('drop-shadow-[2px_3px_#ff000080]'), { dropShadow: { x: 2, y: 3, blur: 0, color: '#ff000080' } });
});

test('utilities that name no function are rejected when compiled, active or not', () => {
  for (const name of [
    'blur-7', 'brightness-111', 'contrast-300', 'grayscale-50', 'hue-rotate-[3]', 'opacity-blur', 'backdrop-drop-shadow-md',
    'backdrop-opacity', 'backdrop-opacity-55', '-blur-sm', 'drop-shadow-[1px]', 'saturate-[-1]', 'sepia-[2]', 'hover:blur-9',
  ]) {
    assert.throws(() => compileStyle(name), /Unsupported utility class/u, name);
  }
});

test('separate utilities compose across variants and merge per function', () => {
  assert.deepEqual(layersOf('blur-sm hover:brightness-110'), [
    { style: { filterParts: { blur: 4 } } },
    { states: ['hover'], style: { filterParts: { brightness: 1.1 } } },
  ]);
  // Same conditions merge into one layer, function by function, the later class winning.
  assert.deepEqual(layersOf('blur-sm brightness-110 blur-lg'), [{ style: { filterParts: { blur: 16, brightness: 1.1 } } }]);
  // The filter and the backdrop filter are separate properties.
  assert.deepEqual(layersOf('blur-sm backdrop-blur-lg'), [{ style: { backdropFilterParts: { blur: 16 }, filterParts: { blur: 4 } } }]);
  assert.deepEqual(layersOf('md:backdrop-blur-xl focus:blur-none')[0], { minWidth: 768, style: { backdropFilterParts: { blur: 24 } } });
});

test('an explicit filter replaces the list; a later utility takes the composed list back', () => {
  // An inline filter is a later layer than every class, so it replaces what the classes composed.
  assert.deepEqual(layersOf('blur-sm hover:brightness-110', { filter: 'grayscale(1)' }), [
    { style: { filterParts: { blur: 4 } } },
    { states: ['hover'], style: { filterParts: { brightness: 1.1 } } },
    { style: { filter: 'grayscale(1)' } },
  ]);
  assert.deepEqual(layersOf('blur-sm filter-none'), [{ style: { filter: 'none' } }], 'filter-none after blur-sm: the explicit list wins');
  assert.deepEqual(layersOf('filter-none blur-sm'), [{ style: { filterParts: { blur: 4 } } }], 'blur-sm after filter-none: the composed list');
  assert.deepEqual(layersOf('backdrop-blur-sm backdrop-filter-none'), [{ style: { backdropFilter: 'none' } }]);
  assert.deepEqual(layersOf('', { backdropFilter: 'blur(8px) saturate(150%)' }), [{ style: { backdropFilter: 'blur(8px) saturate(150%)' } }]);
  // `filter` and `backdrop-filter` need no class in Tailwind v3: they compile to nothing.
  assert.deepEqual(layersOf('filter backdrop-filter'), []);
});

test('equal filter inputs intern to the identical compiled style', () => {
  assert.equal(compileStyle('blur-sm hover:brightness-110'), compileStyle('blur-sm  hover:brightness-110'));
  assert.equal(compileStyle('', { filter: 'blur(4px)' }), compileStyle('', { filter: 'blur(4px)' }));
  assert.notEqual(compileStyle('', { filter: 'blur(4px)' }), compileStyle('', { filter: 'blur(8px)' }));
  const compiled = compileStyle('blur-sm');
  assert.ok(Object.isFrozen(compiled.layers[0]?.style.filterParts), 'the parts of an interned style are frozen');
});

test('units in arbitrary values are case-insensitive, as they are in CSS', () => {
  assert.deepEqual(partsOf('blur-[6PX]'), { blur: 6 });
  assert.deepEqual(partsOf('backdrop-blur-[2.5Px]', 'backdropFilterParts'), { blur: 2.5 });
  assert.deepEqual(partsOf('hue-rotate-[90DEG]'), { hueRotate: 90 });
  assert.deepEqual(partsOf('-hue-rotate-[0.25TURN]'), { hueRotate: -90 });
  assert.deepEqual(partsOf('hue-rotate-[200Grad]'), { hueRotate: 180 });
  assert.deepEqual(partsOf('drop-shadow-[0_4PX_8Px_rgba(0,0,0,0.25)]'), { dropShadow: { x: 0, y: 4, blur: 8, color: 'rgba(0,0,0,0.25)' } });
  assert.throws(() => compileStyle('blur-[6em]'), /Unsupported utility/);
});
