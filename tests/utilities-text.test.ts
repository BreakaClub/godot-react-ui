import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStyle } from '../src/styles';
import type { StyleProp } from '../src/types';

function style(className: string, inline?: StyleProp) {
  const layers = compileStyle(className, inline).layers;
  assert.ok(layers.length <= 1, `${className} is one layer`);
  return layers[0]?.style ?? {};
}

test('font weight classes set the numbers Tailwind names', () => {
  const weights = {
    thin: 100, extralight: 200, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
  };
  for (const [name, weight] of Object.entries(weights)) {
    assert.deepEqual(style(`font-${name}`), { fontWeight: weight }, name);
  }
  assert.deepEqual(style('font-[650]'), { fontWeight: 650 });
  // The inline keywords are resolved by the compiler, so native only ever reads a number.
  assert.deepEqual(style('', { fontWeight: 'bold' }), { fontWeight: 700 });
  assert.deepEqual(style('font-black', { fontWeight: 'normal' }), { fontWeight: 400 });
  assert.deepEqual(style('', { fontWeight: 300 }), { fontWeight: 300 });
  for (const utility of ['font-heavy', 'font-[0]', 'font-[1001]', 'font-', 'font']) {
    assert.throws(() => compileStyle(utility), /Unsupported/, utility);
  }
});

test('font style and family classes', () => {
  assert.deepEqual(style('italic'), { fontStyle: 'italic' });
  assert.deepEqual(style('italic not-italic'), { fontStyle: 'normal' });
  assert.deepEqual(style('font-sans'), { fontFamily: 'sans' });
  assert.deepEqual(style('font-serif'), { fontFamily: 'serif' });
  assert.deepEqual(style('font-mono'), { fontFamily: 'mono' });
  // An arbitrary value is a family unless it is a number; underscores are spaces and one pair of quotes goes.
  assert.deepEqual(style("font-['Open_Sans']"), { fontFamily: 'Open Sans' });
  assert.deepEqual(style('font-[Inter]'), { fontFamily: 'Inter' });
  assert.deepEqual(style('font-[Inter,sans]'), { fontFamily: 'Inter,sans' });
  assert.deepEqual(style('', { fontFamily: 'Inter', fontStyle: 'italic' }), { fontFamily: 'Inter', fontStyle: 'italic' });
  assert.throws(() => compileStyle("font-['']"), /Unsupported/);
});

test('text sizes carry Tailwind\'s paired line height, and the slash modifier replaces it', () => {
  assert.deepEqual(style('text-xs'), { fontSize: 12, lineHeight: 16 });
  assert.deepEqual(style('text-sm'), { fontSize: 14, lineHeight: 20 });
  assert.deepEqual(style('text-base'), { fontSize: 16, lineHeight: 24 });
  assert.deepEqual(style('text-lg'), { fontSize: 18, lineHeight: 28 });
  assert.deepEqual(style('text-xl'), { fontSize: 20, lineHeight: 28 });
  assert.deepEqual(style('text-2xl'), { fontSize: 24, lineHeight: 32 });
  assert.deepEqual(style('text-3xl'), { fontSize: 30, lineHeight: 36 });
  assert.deepEqual(style('text-4xl'), { fontSize: 36, lineHeight: 40 });
  // From 5xl up the pair is a unitless 1.
  for (const [name, size] of [['5xl', 48], ['6xl', 60], ['7xl', 72], ['8xl', 96], ['9xl', 128]] as const) {
    assert.deepEqual(style(`text-${name}`), { fontSize: size, lineHeight: '1' }, name);
  }
  assert.deepEqual(style('text-sm/6'), { fontSize: 14, lineHeight: 24 });
  assert.deepEqual(style('text-sm/loose'), { fontSize: 14, lineHeight: '2' });
  assert.deepEqual(style('text-lg/[17px]'), { fontSize: 18, lineHeight: 17 });
  assert.deepEqual(style('text-xs/[1.4]'), { fontSize: 12, lineHeight: '1.4' });
  // An arbitrary size is only a size; Tailwind pairs no line height with it.
  assert.deepEqual(style('text-[13px]'), { fontSize: 13 });
  assert.deepEqual(style('text-[1.25rem]'), { fontSize: 20 });
  assert.deepEqual(style('text-[13px]/5'), { fontSize: 13, lineHeight: 20 });
  // A later line height replaces the pair; a later size keeps the line height of the earlier utility.
  assert.deepEqual(style('text-sm leading-tight'), { fontSize: 14, lineHeight: '1.25' });
  assert.deepEqual(style('leading-tight text-sm'), { fontSize: 14, lineHeight: 20 });
  for (const utility of ['text-sm/11', 'text-10xl', 'text-sm/', 'text-[0px]', 'text-[13.5px]', 'text-[13em]']) {
    assert.throws(() => compileStyle(utility), /Unsupported/, utility);
  }
  // Colours still resolve under the same prefix.
  assert.deepEqual(style('text-sm text-slate-900'), { color: '#0f172a', fontSize: 14, lineHeight: 20 });
  assert.deepEqual(style('text-[#ff0000]'), { color: '#ff0000' });
});

test('leading classes', () => {
  const factors = { none: '1', tight: '1.25', snug: '1.375', normal: '1.5', relaxed: '1.625', loose: '2' };
  for (const [name, factor] of Object.entries(factors)) {
    assert.deepEqual(style(`leading-${name}`), { lineHeight: factor }, name);
  }
  for (let step = 3; step <= 10; step += 1) {
    assert.deepEqual(style(`leading-${step}`), { lineHeight: step * 4 }, String(step));
  }
  assert.deepEqual(style('leading-[1.4]'), { lineHeight: '1.4' });
  assert.deepEqual(style('leading-[22px]'), { lineHeight: 22 });
  assert.deepEqual(style('leading-[1.5rem]'), { lineHeight: 24 });
  assert.deepEqual(style('leading-[150%]'), { lineHeight: '150%' });
  assert.deepEqual(style('leading-[1.2em]'), { lineHeight: '1.2em' });
  assert.deepEqual(style('', { lineHeight: 'normal' }), { lineHeight: 'normal' });
  for (const utility of ['leading-2', 'leading-11', 'leading-[0]', 'leading-[-1]', 'leading-[abc]', 'leading-']) {
    assert.throws(() => compileStyle(utility), /Unsupported/, utility);
  }
});

test('tracking classes', () => {
  const spacings = { tighter: '-0.05em', tight: '-0.025em', normal: '0em', wide: '0.025em', wider: '0.05em', widest: '0.1em' };
  for (const [name, spacing] of Object.entries(spacings)) {
    assert.deepEqual(style(`tracking-${name}`), { letterSpacing: spacing }, name);
  }
  assert.deepEqual(style('tracking-[0.05em]'), { letterSpacing: '0.05em' });
  assert.deepEqual(style('tracking-[1px]'), { letterSpacing: 1 });
  assert.deepEqual(style('tracking-[-0.5px]'), { letterSpacing: -0.5 });
  assert.deepEqual(style('tracking-[-0.02em]'), { letterSpacing: '-0.02em' });
  assert.deepEqual(style('tracking-[0.1rem]'), { letterSpacing: 1.6 });
  assert.deepEqual(style('', { letterSpacing: 0.5 }), { letterSpacing: 0.5 });
  for (const utility of ['tracking-loose', 'tracking-[1]', 'tracking-[abc]', 'tracking-']) {
    assert.throws(() => compileStyle(utility), /Unsupported/, utility);
  }
});

test('case classes', () => {
  assert.deepEqual(style('uppercase'), { textTransform: 'uppercase' });
  assert.deepEqual(style('lowercase'), { textTransform: 'lowercase' });
  assert.deepEqual(style('capitalize'), { textTransform: 'capitalize' });
  assert.deepEqual(style('uppercase normal-case'), { textTransform: 'none' });
});

test('decoration classes', () => {
  assert.deepEqual(style('underline'), { textDecorationLine: 'underline' });
  assert.deepEqual(style('overline'), { textDecorationLine: 'overline' });
  assert.deepEqual(style('line-through'), { textDecorationLine: 'line-through' });
  assert.deepEqual(style('underline no-underline'), { textDecorationLine: 'none' });
  // Tailwind's four utilities set one property, so the later one replaces the earlier.
  assert.deepEqual(style('underline line-through'), { textDecorationLine: 'line-through' });
  assert.deepEqual(style('', { textDecorationLine: 'underline line-through' }), { textDecorationLine: 'underline line-through' });
  assert.deepEqual(style('decoration-red-500'), { textDecorationColor: '#ef4444' });
  assert.deepEqual(style('decoration-red-500/50'), { textDecorationColor: '#ef444480' });
  assert.deepEqual(style('decoration-[#3b82f6]'), { textDecorationColor: '#3b82f6' });
  for (const step of [0, 1, 2, 4, 8]) {
    assert.deepEqual(style(`decoration-${step}`), { textDecorationThickness: step }, String(step));
    assert.deepEqual(style(`underline-offset-${step}`), { textUnderlineOffset: step }, String(step));
  }
  assert.deepEqual(style('decoration-auto'), { textDecorationThickness: 'auto' });
  assert.deepEqual(style('decoration-from-font'), { textDecorationThickness: 'from-font' });
  assert.deepEqual(style('decoration-[3px]'), { textDecorationThickness: 3 });
  assert.deepEqual(style('underline-offset-auto'), { textUnderlineOffset: 'auto' });
  assert.deepEqual(style('underline-offset-[3px]'), { textUnderlineOffset: 3 });
  for (const utility of ['decoration-3', 'underline-offset-3', 'decoration-nope', 'decoration-zigzag', 'underline-offset-', 'decoration-[3]']) {
    assert.throws(() => compileStyle(utility), /Unsupported/, utility);
  }
});

test('overflow, wrapping and alignment classes', () => {
  assert.deepEqual(style('truncate'), { overflowX: 'hidden', overflowY: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
  assert.deepEqual(style('text-ellipsis'), { textOverflow: 'ellipsis' });
  assert.deepEqual(style('text-ellipsis text-clip'), { textOverflow: 'clip' });
  for (let lines = 1; lines <= 6; lines += 1) {
    assert.deepEqual(style(`line-clamp-${lines}`), { lineClamp: lines, overflowX: 'hidden', overflowY: 'hidden' }, String(lines));
  }
  assert.deepEqual(style('line-clamp-none'), { lineClamp: 'none', overflowX: 'visible', overflowY: 'visible' });
  for (const name of ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces']) {
    assert.deepEqual(style(`whitespace-${name}`), { whiteSpace: name }, name);
  }
  assert.deepEqual(style('break-normal'), { overflowWrap: 'normal', wordBreak: 'normal' });
  assert.deepEqual(style('break-words'), { overflowWrap: 'break-word' });
  assert.deepEqual(style('break-all'), { wordBreak: 'break-all' });
  assert.deepEqual(style('break-keep'), { wordBreak: 'keep-all' });
  assert.deepEqual(style('text-start'), { textAlign: 'start' });
  assert.deepEqual(style('text-end'), { textAlign: 'end' });
  assert.deepEqual(style('text-justify'), { textAlign: 'justify' });
  assert.deepEqual(style('text-left text-center text-right'), { textAlign: 'right' });
  for (const utility of ['line-clamp-0', 'line-clamp-7', 'whitespace-wrap', 'break-nothing', 'text-balance']) {
    assert.throws(() => compileStyle(utility), /Unsupported/, utility);
  }
});

test('numeral classes set one longhand each, so they compose', () => {
  assert.deepEqual(style('tabular-nums lining-nums'), { numericFigure: 'lining', numericSpacing: 'tabular' });
  assert.deepEqual(style('oldstyle-nums proportional-nums'), { numericFigure: 'oldstyle', numericSpacing: 'proportional' });
  assert.deepEqual(style('diagonal-fractions'), { numericFraction: 'diagonal' });
  assert.deepEqual(style('stacked-fractions'), { numericFraction: 'stacked' });
  assert.deepEqual(style('ordinal slashed-zero'), { ordinal: true, slashedZero: true });
  assert.deepEqual(style('tabular-nums normal-nums'), {
    numericFigure: 'normal', numericFraction: 'normal', numericSpacing: 'normal', ordinal: false, slashedZero: false,
  });
  assert.deepEqual(compileStyle('lining-nums hover:oldstyle-nums').layers, [
    { style: { numericFigure: 'lining' } },
    { states: ['hover'], style: { numericFigure: 'oldstyle' } },
  ]);
});

test('antialiased compiles to no style and subpixel-antialiased is not accepted', () => {
  assert.deepEqual(compileStyle('antialiased').layers, []);
  assert.deepEqual(style('antialiased font-bold'), { fontWeight: 700 });
  assert.throws(() => compileStyle('subpixel-antialiased'), /Unsupported/);
});

test('text utilities take states and breakpoints like any other', () => {
  const layers = compileStyle('font-normal hover:font-bold md:text-lg underline').layers;
  assert.deepEqual(layers, [
    { style: { fontWeight: 400 } },
    { states: ['hover'], style: { fontWeight: 700 } },
    { minWidth: 768, style: { fontSize: 18, lineHeight: 28 } },
    { style: { textDecorationLine: 'underline' } },
  ]);
});
