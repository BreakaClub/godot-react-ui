import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStyle, resolveStyles, StyleSheet, styleKey } from '../src/styles';
import type { Style, StyleProp } from '../src/types';
import { checkFixture } from './fixtures';

test('spacing expands shorthands in composition order', () => {
  assert.deepEqual(resolveStyles('p-6 px-3 pl-1 gap-4 gap-y-2'), {
    paddingTop: 24, paddingRight: 12, paddingBottom: 24, paddingLeft: 4,
    rowGap: 8, columnGap: 16,
  });
  assert.equal(resolveStyles('pl-8 p-2').paddingLeft, 8);
  assert.equal(resolveStyles('p-6 pl-8', { padding: 2 }).paddingLeft, 2);
});

test('responsive grid recomposes in logical pixels and drops old state', () => {
  const classes = 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4';
  assert.equal(resolveStyles(classes, undefined, { width: 600 }).gridTemplateColumns, 2);
  assert.equal(resolveStyles(classes, undefined, { width: 768 }).gridTemplateColumns, 3);
  assert.equal(resolveStyles(classes, undefined, { width: 1120 }).gridTemplateColumns, 4);
  assert.equal(resolveStyles(classes, undefined, { width: 600 }).gridTemplateColumns, 2);
  assert.equal(resolveStyles('hidden md:flex', undefined, { width: 1120 }).display, 'flex');
});

test('state variants combine and restore base paint', () => {
  const classes = 'bg-white hover:bg-indigo-50 md:hover:bg-indigo-100 active:bg-indigo-600 disabled:opacity-50';
  assert.equal(resolveStyles(classes, undefined, { width: 600, hover: true }).backgroundColor, '#eef2ff');
  assert.equal(resolveStyles(classes, undefined, { width: 1000, hover: true }).backgroundColor, '#e0e7ff');
  assert.equal(resolveStyles(classes, undefined, { width: 1000, hover: true, active: true }).backgroundColor, '#4f46e5');
  assert.equal(resolveStyles(classes, undefined, { width: 1000 }).backgroundColor, '#ffffff');
  assert.equal(resolveStyles(classes, undefined, { width: 1000, disabled: true }).opacity, 0.5);
});

test('supported arbitrary values remain typed native values', () => {
  assert.deepEqual(resolveStyles('w-[50%] h-[123px] min-w-0 max-w-xl text-[23px] bg-[#1234] rounded-[9px]'), {
    width: '50%', height: 123, minWidth: 0, maxWidth: 576,
    fontSize: 23, backgroundColor: '#1234', borderRadius: 9,
  });
  assert.equal(resolveStyles('w-1/2').width, '50%');
  assert.equal(resolveStyles('w-auto').width, 'auto');
});

test('stylesheets preserve identity, freeze definitions and compose nested arrays', () => {
  const source = { card: { padding: 24, backgroundColor: '#fff' as const } };
  const sheet = StyleSheet.create(source);
  assert.equal(sheet, source);
  assert.equal(sheet.card, source.card);
  assert.ok(Object.isFrozen(sheet));
  assert.ok(Object.isFrozen(sheet.card));
  assert.deepEqual(resolveStyles('p-1', [sheet.card, false, null, [undefined, { paddingLeft: 8 }]]), {
    paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 8, backgroundColor: '#fff',
  });
});

test('unsupported styles fail before interaction instead of silently disappearing', () => {
  for (const utility of [
    'hover:shadow-xl', 'md:bg-missing-500', 'dark:bg-white', 'p-[calc(1px)]',
    'w-[NaN%]', 'w-1/0', 'text-[0px]', 'text-[1.5px]', 'bg-[#12]',
    'grid-cols-0', 'opacity-101', 'hover:', 'p-Infinity',
    'toString', 'bg-toString', 'max-w-constructor', `w-[${'9'.repeat(400)}%]`,
  ]) {
    assert.throws(() => resolveStyles(utility, undefined, { width: 0 }), /Unsupported|Invalid/);
  }
  assert.throws(() => resolveStyles('', undefined, { width: Number.NaN }), /finite/);
});

// ---- compileStyle (Phase F2): ordered layers for native resolution ----

function layersOf(className: string, style?: StyleProp) {
  return compileStyle(className, style).layers;
}

test('compileStyle expands shorthands in composition order into one unconditional layer', () => {
  assert.deepEqual(layersOf('p-6 px-3 pl-1 gap-4 gap-y-2'), [{
    style: {
      columnGap: 16, paddingBottom: 24, paddingLeft: 4, paddingRight: 12, paddingTop: 24, rowGap: 8,
    },
  }]);
  assert.equal(layersOf('pl-8 p-2')[0]?.style.paddingLeft, 8);
  assert.equal(layersOf('p-6 pl-8', { padding: 2 })[0]?.style.paddingLeft, 2);
  assert.deepEqual(layersOf('overflow-hidden')[0]?.style, { overflowX: 'hidden', overflowY: 'hidden' });
  assert.deepEqual(layersOf('overflow-x-hidden overflow-y-visible')[0]?.style, { overflowX: 'hidden', overflowY: 'visible' });
  assert.deepEqual(layersOf('overflow-hidden overflow-y-visible')[0]?.style, { overflowX: 'hidden', overflowY: 'visible' });
  assert.deepEqual(layersOf('', { margin: 4, marginLeft: 1 })[0]?.style, {
    marginBottom: 4, marginLeft: 1, marginRight: 4, marginTop: 4,
  });
});

test('compileStyle keeps breakpoints and states as layer conditions, merging only equal conditions', () => {
  assert.deepEqual(layersOf('grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4'), [
    { style: { columnGap: 12, display: 'grid', gridTemplateColumns: 2, rowGap: 12 } },
    { minWidth: 768, style: { gridTemplateColumns: 3 } },
    { minWidth: 1024, style: { gridTemplateColumns: 4 } },
  ]);
  assert.deepEqual(layersOf('bg-white hover:bg-indigo-50 md:hover:bg-indigo-100 active:hover:bg-indigo-600 disabled:opacity-50'), [
    { style: { backgroundColor: '#ffffff' } },
    { states: ['hover'], style: { backgroundColor: '#eef2ff' } },
    { minWidth: 768, states: ['hover'], style: { backgroundColor: '#e0e7ff' } },
    { states: ['active', 'hover'], style: { backgroundColor: '#4f46e5' } },
    { states: ['disabled'], style: { opacity: 0.5 } },
  ]);
  // A later unconditional class after a conditional one is a new layer, so the cascade is kept.
  assert.deepEqual(layersOf('bg-white p-1 hover:bg-slate-100 p-2'), [
    { style: { backgroundColor: '#ffffff', paddingBottom: 4, paddingLeft: 4, paddingRight: 4, paddingTop: 4 } },
    { states: ['hover'], style: { backgroundColor: '#f1f5f9' } },
    { style: { paddingBottom: 8, paddingLeft: 8, paddingRight: 8, paddingTop: 8 } },
  ]);
  assert.deepEqual(layersOf('focus:border-indigo-500 focus-visible:border-indigo-600 focus-within:bg-slate-50').map((layer) => layer.states), [
    ['focus'], ['focusVisible'], ['focusWithin'],
  ]);
  assert.deepEqual(layersOf('hover:hover:bg-white')[0]?.states, ['hover'], 'repeated variants collapse');
  assert.equal(layersOf('md:lg:w-4')[0]?.minWidth, 1024, 'the widest breakpoint wins');
});

test('compileStyle appends inline styles, nested arrays included, after the classes', () => {
  const inline = { backgroundColor: '#fff' as const, paddingLeft: 8 };
  assert.deepEqual(layersOf('p-1', [false, null, [undefined, inline]]), [{
    style: { backgroundColor: '#fff', paddingBottom: 4, paddingLeft: 8, paddingRight: 4, paddingTop: 4 },
  }]);
  assert.deepEqual(layersOf('hover:w-4', { height: 3 }), [
    { states: ['hover'], style: { width: 16 } },
    { style: { height: 3 } },
  ]);
  assert.deepEqual(layersOf('', { width: undefined }), [], 'undefined values are not styles');
  assert.deepEqual(layersOf(''), []);
  assert.deepEqual(compileStyle(undefined, undefined).layers, []);
});

test('compileStyle covers every utility family with typed native values', () => {
  const expectations: Record<string, Record<string, unknown>> = {
    'flex-row': { flexDirection: 'row' }, 'flex-col-reverse': { flexDirection: 'column-reverse' },
    'flex-wrap': { flexWrap: 'wrap' }, 'flex-1': { flexBasis: 0, flexGrow: 1, flexShrink: 1 },
    'flex-none': { flexBasis: 'auto', flexGrow: 0, flexShrink: 0 }, grow: { flexGrow: 1 }, 'shrink-0': { flexShrink: 0 },
    'items-center': { alignItems: 'center' }, 'self-end': { alignSelf: 'flex-end' },
    'justify-between': { justifyContent: 'space-between' }, 'text-right': { textAlign: 'right' },
    hidden: { display: 'none' }, grid: { display: 'grid' }, 'grid-cols-3': { gridTemplateColumns: 3 },
    'w-full': { width: '100%' }, 'w-1/2': { width: '50%' }, 'w-auto': { width: 'auto' }, 'h-8': { height: 32 },
    'min-w-0': { minWidth: 0 }, 'max-w-xl': { maxWidth: 576 }, 'max-h-[40px]': { maxHeight: 40 }, 'basis-1/4': { flexBasis: '25%' },
    'px-4': { paddingLeft: 16, paddingRight: 16 }, 'my-2': { marginBottom: 8, marginTop: 8 }, 'gap-x-2': { columnGap: 8 },
    'rounded-xl': { borderRadius: 12 }, rounded: { borderRadius: 4 }, 'rounded-[9px]': { borderRadius: 9 },
    border: { borderWidth: 1 }, 'border-2': { borderWidth: 2 }, 'border-slate-200': { borderColor: '#e2e8f0' },
    'opacity-45': { opacity: 0.45 }, 'bg-indigo-600': { backgroundColor: '#4f46e5' }, 'bg-[#1234]': { backgroundColor: '#1234' },
    'text-white': { color: '#ffffff' }, 'text-lg': { fontSize: 18 }, 'text-[23px]': { fontSize: 23 },
  };
  for (const [className, style] of Object.entries(expectations)) {
    assert.deepEqual(layersOf(className), [{ style }], className);
  }
});

test('compileStyle interns equal inputs and freezes the result', () => {
  const first = compileStyle('p-1 m-2', { width: 1 });
  assert.equal(compileStyle('m-2 p-1', { width: 1 }), first, 'key order does not matter for equal layers');
  assert.equal(compileStyle('p-1 m-2', [{ width: 1 }]), first);
  assert.equal(compileStyle('p-1 m-2', { width: 1 }), first, 'repeat calls return the identical object');
  assert.notEqual(compileStyle('p-1 m-2', { width: 2 }), first);
  assert.equal(compileStyle('p-1'), compileStyle(' p-1  '), 'whitespace is not part of the style');
  assert.equal(compileStyle('hover:p-1').layers.length, 1);
  assert.equal(styleKey(first), styleKey(compileStyle('m-2 p-1', { width: 1 })));
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first.layers) && Object.isFrozen(first.layers[0]));
  assert.ok(Object.isFrozen(first.layers[0]?.style));
  assert.throws(() => styleKey({ layers: [] }), /needs a style from compileStyle/);
});

test('compileStyle never shares or freezes the caller\'s objects', () => {
  const transition = { properties: ['height' as const], durationMs: 100 };
  const style: Style = { height: 4, transition };
  const compiled = compileStyle('', style);
  assert.notEqual(compiled.layers[0]?.style.transition, transition);
  assert.deepEqual(compiled.layers[0]?.style.transition, transition);
  assert.ok(Object.isFrozen(compiled.layers[0]?.style.transition));
  assert.ok(!Object.isFrozen(transition) && !Object.isFrozen(transition.properties) && !Object.isFrozen(style));
});

test('compileStyle rejects unknown classes even when they could never apply, and styles that are props', () => {
  for (const utility of [
    'hover:shadow-xl', 'md:bg-missing-500', 'dark:bg-white', 'p-[calc(1px)]', 'w-[NaN%]', 'w-1/0',
    'text-[0px]', 'text-[1.5px]', 'bg-[#12]', 'grid-cols-0', 'opacity-101', 'hover:', 'p-Infinity',
    'toString', 'bg-toString', 'max-w-constructor', `w-[${'9'.repeat(400)}%]`, 'focus-visible:', 'focus-visble:p-1',
  ]) {
    assert.throws(() => compileStyle(utility), /Unsupported|Invalid/, utility);
  }
  assert.throws(() => compileStyle('', { disabled: true }), /disabled prop/);
});

test('compiled styles match the native contract fixture, which the Rust tests parse and validate', () => {
  const inputs: Array<{ className: string; style?: StyleProp }> = [
    { className: 'flex-row items-center justify-between gap-4 p-6 bg-white rounded-xl border border-slate-200' },
    { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full min-h-0' },
    { className: 'hover:bg-indigo-700 active:bg-indigo-800 focus:border-indigo-500 focus-visible:border-indigo-600 focus-within:bg-slate-50 disabled:opacity-50' },
    { className: 'md:hover:bg-indigo-100 w-[50%] h-[123px] max-w-xl text-[23px] text-center bg-[#1234] rounded-[9px] w-1/2' },
    {
      className: 'overflow-hidden shrink-0',
      style: [{ height: 'auto', padding: 4, interpolateSize: 'allow-keywords', transition: {
        properties: ['height', 'backgroundColor', 'opacity'], durationMs: 600, delayMs: 20, easing: 'ease-in-out',
      } }],
    },
  ];
  const fixture = inputs.map((input) => ({ ...input, compiled: compileStyle(input.className, input.style) }));
  checkFixture('compiled-styles.json', fixture);
});
