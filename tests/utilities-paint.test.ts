import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStyle } from '../src/styles';
import type { BoxShadowParts, GradientParts, LonghandStyle, StyleProp } from '../src/types';
import { checkFixture } from './fixtures';

// ---- shadows, rings, outlines, borders and corners by side, gradients (utilities-paint) ----

function layersOf(className: string, style?: StyleProp) {
  return compileStyle(className, style).layers;
}

function styleOf(className: string, style?: StyleProp): LonghandStyle {
  const layers = layersOf(className, style);
  assert.equal(layers.length, 1, `${className}: one layer`);
  return layers[0]?.style ?? {};
}

function shadowParts(className: string): BoxShadowParts | undefined {
  return styleOf(className).boxShadowParts;
}

function gradientParts(className: string): GradientParts | undefined {
  return styleOf(className).gradientParts;
}

const black = (alpha: number) => `rgba(0, 0, 0, ${alpha})`;

test('Tailwind v3 shadow scale, layer by layer', () => {
  assert.deepEqual(shadowParts('shadow-sm'), { shadow: [{ x: 0, y: 1, blur: 2, spread: 0, color: black(0.05) }] });
  assert.deepEqual(shadowParts('shadow'), { shadow: [
    { x: 0, y: 1, blur: 3, spread: 0, color: black(0.1) },
    { x: 0, y: 1, blur: 2, spread: -1, color: black(0.1) },
  ] });
  assert.deepEqual(shadowParts('shadow-md'), { shadow: [
    { x: 0, y: 4, blur: 6, spread: -1, color: black(0.1) },
    { x: 0, y: 2, blur: 4, spread: -2, color: black(0.1) },
  ] });
  assert.deepEqual(shadowParts('shadow-lg'), { shadow: [
    { x: 0, y: 10, blur: 15, spread: -3, color: black(0.1) },
    { x: 0, y: 4, blur: 6, spread: -4, color: black(0.1) },
  ] });
  assert.deepEqual(shadowParts('shadow-xl'), { shadow: [
    { x: 0, y: 20, blur: 25, spread: -5, color: black(0.1) },
    { x: 0, y: 8, blur: 10, spread: -6, color: black(0.1) },
  ] });
  assert.deepEqual(shadowParts('shadow-2xl'), { shadow: [{ x: 0, y: 25, blur: 50, spread: -12, color: black(0.25) }] });
  assert.deepEqual(shadowParts('shadow-inner'), { shadow: [{ x: 0, y: 2, blur: 4, spread: 0, color: black(0.05), inset: true }] });
  assert.deepEqual(shadowParts('shadow-none'), { shadow: 'none' });
});

test('shadow colours take the opacity modifier and replace the colour of the size utility', () => {
  assert.deepEqual(shadowParts('shadow-red-500'), { shadowColor: '#ef4444' });
  assert.deepEqual(shadowParts('shadow-indigo-500/50'), { shadowColor: '#6366f180' });
  assert.deepEqual(shadowParts('shadow-[#ff000040]'), { shadowColor: '#ff000040' });
  assert.deepEqual(styleOf('shadow-lg shadow-black/25').boxShadowParts?.shadowColor, '#00000040');
});

test('arbitrary shadows: lengths, colours, several layers and inset', () => {
  assert.deepEqual(shadowParts('shadow-[0_4px_12px_rgba(0,0,0,0.3)]'), { shadow: [
    { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0,0,0,0.3)' },
  ] });
  assert.deepEqual(shadowParts('shadow-[inset_0_1px_0_#ffffff33,0_2px_4px_-1px_#00000066]'), { shadow: [
    { x: 0, y: 1, blur: 0, spread: 0, color: '#ffffff33', inset: true },
    { x: 0, y: 2, blur: 4, spread: -1, color: '#00000066' },
  ] });
  assert.deepEqual(shadowParts('shadow-[2px_3px_black]'), { shadow: [{ x: 2, y: 3, blur: 0, spread: 0, color: 'black' }] });
  assert.deepEqual(shadowParts('shadow-[0_0_20px_5px_rgb(99_102_241_/_0.5)]'), { shadow: [
    { x: 0, y: 0, blur: 20, spread: 5, color: 'rgb(99 102 241 / 0.5)' },
  ] });
});

test('ring utilities set the variables Tailwind composes', () => {
  assert.deepEqual(shadowParts('ring'), { ringWidth: 3 });
  for (const width of [0, 1, 2, 4, 8]) assert.deepEqual(shadowParts(`ring-${width}`), { ringWidth: width }, `ring-${width}`);
  assert.deepEqual(shadowParts('ring-[5px]'), { ringWidth: 5 });
  assert.deepEqual(shadowParts('ring-inset'), { ringInset: true });
  assert.deepEqual(shadowParts('ring-indigo-500'), { ringColor: '#6366f1' });
  assert.deepEqual(shadowParts('ring-black/5'), { ringColor: '#0000000d' });
  assert.deepEqual(shadowParts('ring-offset-2'), { ringOffsetWidth: 2 });
  assert.deepEqual(shadowParts('ring-offset-[3px]'), { ringOffsetWidth: 3 });
  assert.deepEqual(shadowParts('ring-offset-slate-900'), { ringOffsetColor: '#0f172a' });
  assert.deepEqual(shadowParts('ring-2 ring-offset-2 ring-inset ring-sky-400'), {
    ringWidth: 2, ringOffsetWidth: 2, ringInset: true, ringColor: '#38bdf8',
  });
});

test('shadows and rings compose across variants and merge per variable', () => {
  assert.deepEqual(layersOf('shadow-sm ring-1 ring-black/5 focus:ring-2 focus:ring-indigo-500'), [
    { style: { boxShadowParts: { shadow: [{ x: 0, y: 1, blur: 2, spread: 0, color: black(0.05) }], ringWidth: 1, ringColor: '#0000000d' } } },
    { states: ['focus'], style: { boxShadowParts: { ringWidth: 2, ringColor: '#6366f1' } } },
  ]);
  assert.deepEqual(layersOf('hover:shadow-lg')[0], { states: ['hover'], style: { boxShadowParts: { shadow: [
    { x: 0, y: 10, blur: 15, spread: -3, color: black(0.1) },
    { x: 0, y: 4, blur: 6, spread: -4, color: black(0.1) },
  ] } } });
  // An explicit boxShadow replaces what the classes composed; a utility in a later layer takes the composed value back.
  assert.deepEqual(layersOf('shadow-md ring-2', { boxShadow: '0 0 0 1px red' }), [
    { style: { boxShadow: '0 0 0 1px red' } },
  ]);
  assert.deepEqual(layersOf('', [{ boxShadow: 'none' }]), [{ style: { boxShadow: 'none' } }]);
});

test('outline utilities', () => {
  assert.deepEqual(styleOf('outline'), { outlineStyle: 'solid' });
  assert.deepEqual(styleOf('outline-none'), { outlineStyle: 'solid', outlineWidth: 2, outlineColor: '#00000000', outlineOffset: 2 });
  for (const width of [0, 1, 2, 4, 8]) assert.deepEqual(styleOf(`outline-${width}`), { outlineWidth: width }, `outline-${width}`);
  assert.deepEqual(styleOf('outline-[3px]'), { outlineWidth: 3 });
  assert.deepEqual(styleOf('outline-offset-2'), { outlineOffset: 2 });
  assert.deepEqual(styleOf('-outline-offset-2'), { outlineOffset: -2 });
  assert.deepEqual(styleOf('outline-offset-[6px]'), { outlineOffset: 6 });
  assert.deepEqual(styleOf('outline-blue-500'), { outlineColor: '#3b82f6' });
  assert.deepEqual(styleOf('outline-white/50'), { outlineColor: '#ffffff80' });
  assert.deepEqual(styleOf('outline outline-2 outline-offset-2 outline-indigo-600'), {
    outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2, outlineColor: '#4f46e5',
  });
  assert.deepEqual(layersOf('focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'), [
    { states: ['focusVisible'], style: { outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2 } },
  ]);
});

test('borders by side: widths, colours, styles', () => {
  assert.deepEqual(styleOf('border-t'), { borderTopWidth: 1 });
  assert.deepEqual(styleOf('border-r'), { borderRightWidth: 1 });
  assert.deepEqual(styleOf('border-b'), { borderBottomWidth: 1 });
  assert.deepEqual(styleOf('border-l'), { borderLeftWidth: 1 });
  assert.deepEqual(styleOf('border-x'), { borderLeftWidth: 1, borderRightWidth: 1 });
  assert.deepEqual(styleOf('border-y'), { borderTopWidth: 1, borderBottomWidth: 1 });
  for (const width of [0, 2, 4, 8]) assert.deepEqual(styleOf(`border-t-${width}`), { borderTopWidth: width }, `border-t-${width}`);
  assert.deepEqual(styleOf('border-x-2'), { borderLeftWidth: 2, borderRightWidth: 2 });
  assert.deepEqual(styleOf('border-l-[3px]'), { borderLeftWidth: 3 });
  assert.deepEqual(styleOf('border-t-red-500'), { borderTopColor: '#ef4444' });
  assert.deepEqual(styleOf('border-y-white/30'), { borderTopColor: '#ffffff4d', borderBottomColor: '#ffffff4d' });
  assert.deepEqual(styleOf('border-b-[#123456]'), { borderBottomColor: '#123456' });
  assert.deepEqual(styleOf('border-solid'), { borderStyle: 'solid' });
  assert.deepEqual(styleOf('border-none'), { borderStyle: 'none' });
  // The all-sides utilities are the ones that were there.
  assert.deepEqual(styleOf('border'), { borderWidth: 1 });
  assert.deepEqual(styleOf('border-2'), { borderWidth: 2 });
  assert.deepEqual(styleOf('border-0'), { borderWidth: 0 });
  assert.deepEqual(styleOf('border-slate-200'), { borderColor: '#e2e8f0' });
  for (const name of ['border-dashed', 'border-dotted', 'border-double', 'border-hidden', 'border-t-dashed', 'border-s', 'border-t-[3]', 'border-q-2']) {
    assert.throws(() => compileStyle(name), /Unsupported/u, name);
  }
});

test('a side set after the shorthand beats it; a shorthand set later resets the sides (the order of the classes)', () => {
  assert.deepEqual(styleOf('border border-t-4'), { borderTopWidth: 4, borderWidth: 1 });
  assert.deepEqual(styleOf('border-t-4 border-2'), { borderWidth: 2 }, 'a later shorthand sets every side again');
  assert.deepEqual(styleOf('border-t-4', { borderWidth: 2 }), { borderWidth: 2 }, 'an inline shorthand beats a class');
  assert.deepEqual(styleOf('border-2', { borderTopWidth: 6 }), { borderTopWidth: 6, borderWidth: 2 });
  assert.deepEqual(styleOf('border-red-500 border-b-blue-500'), { borderColor: '#ef4444', borderBottomColor: '#3b82f6' });
  assert.deepEqual(styleOf('rounded-t-lg rounded-md'), { borderRadius: 6 });
  assert.deepEqual(layersOf('border-2 hover:border-t-4'), [
    { style: { borderWidth: 2 } },
    { states: ['hover'], style: { borderTopWidth: 4 } },
  ]);
});

test('rounded by side and corner', () => {
  assert.deepEqual(styleOf('rounded-t'), { borderTopLeftRadius: 4, borderTopRightRadius: 4 });
  assert.deepEqual(styleOf('rounded-t-lg'), { borderTopLeftRadius: 8, borderTopRightRadius: 8 });
  assert.deepEqual(styleOf('rounded-r-xl'), { borderTopRightRadius: 12, borderBottomRightRadius: 12 });
  assert.deepEqual(styleOf('rounded-b-2xl'), { borderBottomRightRadius: 16, borderBottomLeftRadius: 16 });
  assert.deepEqual(styleOf('rounded-l-none'), { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 });
  assert.deepEqual(styleOf('rounded-tl-3xl'), { borderTopLeftRadius: 24 });
  assert.deepEqual(styleOf('rounded-tr-sm'), { borderTopRightRadius: 2 });
  assert.deepEqual(styleOf('rounded-br-md'), { borderBottomRightRadius: 6 });
  assert.deepEqual(styleOf('rounded-bl-full'), { borderBottomLeftRadius: 9999 });
  assert.deepEqual(styleOf('rounded-t-[9px]'), { borderTopLeftRadius: 9, borderTopRightRadius: 9 });
  assert.deepEqual(styleOf('rounded-lg rounded-t-none'), { borderRadius: 8, borderTopLeftRadius: 0, borderTopRightRadius: 0 });
  for (const name of ['rounded-s-lg', 'rounded-t-huge', 'rounded-x-lg', 'rounded-tl-[3]']) {
    assert.throws(() => compileStyle(name), /Unsupported/u, name);
  }
});

test('gradients: direction, stops, positions and opacity', () => {
  for (const direction of ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl']) {
    assert.deepEqual(gradientParts(`bg-gradient-to-${direction}`), { direction: `to-${direction}` }, direction);
  }
  assert.deepEqual(gradientParts('from-blue-500'), { from: '#3b82f6' });
  assert.deepEqual(gradientParts('via-purple-500'), { via: '#a855f7' });
  assert.deepEqual(gradientParts('to-pink-500'), { to: '#ec4899' });
  assert.deepEqual(gradientParts('from-black/50'), { from: '#00000080' });
  assert.deepEqual(gradientParts('from-transparent'), { from: '#00000000' });
  assert.deepEqual(gradientParts('to-[#12345678]'), { to: '#12345678' });
  assert.deepEqual(gradientParts('from-10%'), { fromPosition: 10 });
  assert.deepEqual(gradientParts('via-30%'), { viaPosition: 30 });
  assert.deepEqual(gradientParts('to-90%'), { toPosition: 90 });
  assert.deepEqual(gradientParts('from-[12%]'), { fromPosition: 12 });
  assert.deepEqual(gradientParts('bg-gradient-to-r from-indigo-500 via-sky-500 via-30% to-emerald-400'), {
    direction: 'to-r', from: '#6366f1', via: '#0ea5e9', viaPosition: 30, to: '#34d399',
  });
  assert.deepEqual(layersOf('bg-gradient-to-br from-red-500 hover:from-red-600'), [
    { style: { gradientParts: { direction: 'to-br', from: '#ef4444' } } },
    { states: ['hover'], style: { gradientParts: { from: '#dc2626' } } },
  ]);
  assert.deepEqual(styleOf('bg-none'), { backgroundImage: 'none' });
  assert.deepEqual(styleOf('bg-gradient-to-r from-red-500 bg-none'), { backgroundImage: 'none' }, 'bg-none after the parts: the explicit value');
  assert.deepEqual(styleOf('bg-none from-red-500'), { gradientParts: { from: '#ef4444' } }, 'a part after bg-none takes the gradient back');
  assert.deepEqual(styleOf('bg-[linear-gradient(135deg,#ff0000_0%,#0000ff_100%)]'), {
    backgroundImage: 'linear-gradient(135deg,#ff0000 0%,#0000ff 100%)',
  });
  assert.deepEqual(styleOf('bg-[linear-gradient(to_right,red,blue)]').backgroundImage, 'linear-gradient(to right,red,blue)');
  assert.deepEqual(styleOf('', { backgroundImage: 'linear-gradient(90deg, #f00, #00f)' }), { backgroundImage: 'linear-gradient(90deg, #f00, #00f)' });
  for (const name of ['from-7%', 'from-110%', 'bg-gradient-to-x', 'bg-[url(a.png)]', 'from-nope', 'bg-gradient', 'via-[12]']) {
    assert.throws(() => compileStyle(name), /Unsupported/u, name);
  }
});

test('shadow classes that name nothing are rejected when compiled, active or not', () => {
  for (const name of [
    'shadow-huge', 'shadow-[0]', 'shadow-[1px]', 'shadow-[1px_2px_3px_4px_5px_red]', 'shadow-[1px_2px_-3px_red]', 'shadow-[1px_2px_notacolour]',
    'ring-3', 'ring-[3]', 'ring-offset', 'ring-offset-3', 'ring-opacity-50', 'outline-dashed', 'outline-3', 'outline-offset-3', '-outline-3',
    'hover:shadow-missing', 'focus:ring-nope',
  ]) {
    assert.throws(() => compileStyle(name), /Unsupported utility class/u, name);
  }
});

test('equal paint inputs intern to the identical compiled style', () => {
  assert.equal(compileStyle('shadow-lg ring-1'), compileStyle('shadow-lg  ring-1'));
  assert.equal(compileStyle('bg-gradient-to-r from-red-500'), compileStyle('from-red-500 bg-gradient-to-r'));
  assert.notEqual(compileStyle('ring-1'), compileStyle('ring-2'));
  assert.ok(Object.isFrozen(compileStyle('shadow-lg').layers[0]?.style.boxShadowParts), 'the parts of an interned style are frozen');
});

test('box-shadow is a transition property', () => {
  const compiled = compileStyle('shadow-sm hover:shadow-lg', { transition: { properties: ['boxShadow'], durationMs: 150 } });
  assert.equal(compiled.layers.at(-1)?.style.transition?.properties[0], 'boxShadow');
});

test('compiled paint styles match the native contract fixture, which the Rust tests parse and validate', () => {
  const inputs: Array<{ className: string; style?: StyleProp }> = [
    { className: 'rounded-xl bg-white shadow-sm ring-1 ring-black/5 focus:ring-2 focus:ring-indigo-500 hover:shadow-lg' },
    { className: 'shadow-lg shadow-indigo-500/30 ring-2 ring-offset-2 ring-offset-slate-900 ring-inset' },
    { className: 'shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_#ffffff33] shadow-inner' },
    { className: 'border-t-4 border-indigo-500 border-b border-b-slate-200 rounded-t-xl rounded-bl-md' },
    { className: 'border-2 border-y-red-500 border-x-blue-500 rounded-tl-none rounded-br-full border-solid' },
    { className: 'outline outline-2 outline-offset-2 outline-blue-500 focus-visible:outline-4 -outline-offset-2' },
    { className: 'outline-none focus-visible:outline-2 focus-visible:outline-indigo-500' },
    { className: 'bg-gradient-to-br from-sky-500 from-10% via-indigo-500 via-40% to-purple-600 to-90% hover:from-sky-400' },
    { className: 'bg-gradient-to-r from-transparent to-black/60' },
    { className: 'rounded-lg', style: { backgroundImage: 'linear-gradient(45deg, #ff0000 0%, rgba(0, 0, 255, 0.5) 60%, transparent)', boxShadow: '0 0 0 3px #3b82f680, inset 0 2px 4px #00000040' } },
    { className: 'border-none bg-none', style: { borderTopLeftRadius: 4, borderBottomWidth: 2, borderTopColor: '#ff0000', outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 1, outlineColor: '#00ff00' } },
    { className: 'rounded-md shadow-sm', style: { transition: { properties: ['boxShadow', 'backgroundColor'], durationMs: 200, easing: 'ease-out' } } },
  ];
  const fixture = inputs.map((input) => ({ ...input, compiled: compileStyle(input.className, input.style) }));
  checkFixture('paint-styles.json', fixture);
});
