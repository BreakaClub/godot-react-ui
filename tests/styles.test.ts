import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStyle, sameStyleProp, StyleSheet, styleKey } from '../src/styles';
import type { Style, StyleProp } from '../src/types';
import { checkFixture } from './fixtures';

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
    'text-white': { color: '#ffffff' }, 'text-lg': { fontSize: 18, lineHeight: 28 }, 'text-[23px]': { fontSize: 23 },
    'pointer-events-none': { pointerEvents: 'none' }, 'pointer-events-auto': { pointerEvents: 'auto' },
    'cursor-pointer': { cursor: 'pointer' }, 'cursor-not-allowed': { cursor: 'not-allowed' },
    'cursor-ew-resize': { cursor: 'ew-resize' }, 'cursor-nwse-resize': { cursor: 'nwse-resize' },
  };
  for (const [className, style] of Object.entries(expectations)) {
    assert.deepEqual(layersOf(className), [{ style }], className);
  }
});

test('every cursor keyword has a utility, and only those', () => {
  for (const cursor of [
    'default', 'pointer', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'crosshair', 'wait', 'progress',
    'help', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize',
  ]) {
    assert.deepEqual(layersOf(`cursor-${cursor}`), [{ style: { cursor } }], cursor);
  }
  for (const utility of ['cursor-zoom-in', 'cursor-auto', 'pointer-events-all', 'pointer-events']) {
    assert.throws(() => compileStyle(utility), /Unsupported/, utility);
  }
  assert.deepEqual(layersOf('hover:cursor-pointer pointer-events-none'), [
    { states: ['hover'], style: { cursor: 'pointer' } },
    { style: { pointerEvents: 'none' } },
  ]);
});

test('position, inset and z-index utilities and styles compile to native longhands', () => {
  for (const position of ['static', 'relative', 'absolute', 'fixed']) {
    assert.deepEqual(layersOf(position), [{ style: { position } }], position);
  }
  assert.deepEqual(layersOf('absolute top-4 left-1/2 -right-2 bottom-px')[0]?.style, {
    bottom: 1, left: '50%', position: 'absolute', right: -8, top: 16,
  });
  assert.deepEqual(layersOf('inset-0')[0]?.style, { bottom: 0, left: 0, right: 0, top: 0 });
  assert.deepEqual(layersOf('inset-x-0 inset-y-2')[0]?.style, { bottom: 8, left: 0, right: 0, top: 8 });
  assert.deepEqual(layersOf('inset-0 top-auto left-[12px] right-full -bottom-1/4')[0]?.style, {
    bottom: '-25%', left: 12, right: '100%', top: 'auto',
  });
  assert.deepEqual(layersOf('-top-0 -left-[50%]')[0]?.style, { left: '-50%', top: 0 });
  assert.deepEqual(layersOf('z-0')[0]?.style, { zIndex: 0 });
  assert.deepEqual(layersOf('z-50 z-[7]')[0]?.style, { zIndex: 7 });
  assert.deepEqual(layersOf('-z-10')[0]?.style, { zIndex: -10 });
  assert.deepEqual(layersOf('z-[-3]')[0]?.style, { zIndex: -3 });
  assert.deepEqual(layersOf('z-auto')[0]?.style, { zIndex: 0 });
  // Inline styles use the same longhands; `inset` is the shorthand the compiler expands.
  assert.deepEqual(layersOf('', { position: 'fixed', inset: 0, left: 5, zIndex: 2 })[0]?.style, {
    bottom: 0, left: 5, position: 'fixed', right: 0, top: 0, zIndex: 2,
  });
  assert.deepEqual(layersOf('md:absolute hover:-top-2'), [
    { minWidth: 768, style: { position: 'absolute' } },
    { states: ['hover'], style: { top: -8 } },
  ]);
  for (const utility of [
    'sticky', 'top', 'top-', 'top-foo', '-top-auto', 'inset-x', 'left-1/0', 'z-', 'z-foo', '-z-auto', 'z-1.5',
    'z-[1.5]', `z-${'9'.repeat(30)}`, 'z-2147483648', 'z-[-2147483649]', 'zindex-1', 'position-absolute',
  ]) {
    assert.throws(() => compileStyle(utility), /Unsupported/, utility);
  }
  assert.deepEqual(layersOf('z-2147483647')[0]?.style, { zIndex: 2147483647 });
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

test('stylesheets preserve identity, freeze definitions and compile like inline styles', () => {
  const source = { card: { padding: 24, backgroundColor: '#fff' as const } };
  const sheet = StyleSheet.create(source);
  assert.equal(sheet, source);
  assert.equal(sheet.card, source.card);
  assert.ok(Object.isFrozen(sheet));
  assert.ok(Object.isFrozen(sheet.card));
  assert.deepEqual(layersOf('p-1', [sheet.card, false, null, [undefined, { paddingLeft: 8 }]]), [{
    style: { backgroundColor: '#fff', paddingBottom: 24, paddingLeft: 8, paddingRight: 24, paddingTop: 24 },
  }]);
});

test('compileStyle rejects unknown classes even when they could never apply', () => {
  for (const utility of [
    'hover:shadow-huge', 'md:bg-missing-500', 'dark:bg-white', 'p-[calc(1px)]', 'w-[NaN%]', 'w-1/0',
    'text-[0px]', 'text-[1.5px]', 'bg-[#12]', 'grid-cols-0', 'opacity-101', 'hover:', 'p-Infinity',
    'toString', 'bg-toString', 'max-w-constructor', `w-[${'9'.repeat(400)}%]`, 'focus-visible:', 'focus-visble:p-1',
  ]) {
    assert.throws(() => compileStyle(utility), /Unsupported|Invalid/, utility);
  }
});

test('compiled styles match the native contract fixture, which the Rust tests parse and validate', () => {
  const inputs: Array<{ className: string; style?: StyleProp }> = [
    { className: 'flex-row items-center justify-between gap-4 p-6 bg-white rounded-xl border border-slate-200' },
    { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full min-h-0' },
    { className: 'hover:bg-indigo-700 active:bg-indigo-800 focus:border-indigo-500 focus-visible:border-indigo-600 focus-within:bg-slate-50 disabled:opacity-50' },
    { className: 'md:hover:bg-indigo-100 w-[50%] h-[123px] max-w-xl text-[23px] text-center bg-[#1234] rounded-[9px] w-1/2' },
    { className: 'pointer-events-none hover:cursor-pointer cursor-ew-resize pointer-events-auto' },
    { className: 'relative absolute fixed top-4 -left-2 right-1/2 bottom-auto inset-x-0 z-10 -z-5 md:static' },
    { className: 'overflow-y-auto overflow-x-scroll overscroll-contain scrollbar-none scrollbar-[#64748b99] touch-pan-y' },
    { className: 'overflow-auto overscroll-auto scrollbar-auto scrollbar-slate-400 touch-none' },
    { className: 'select-text selection-[#3b82f659] hover:select-none md:selection-rose-400' },
    {
      className: 'uppercase',
      style: { WebkitTextStrokeWidth: 3, WebkitTextStrokeColor: '#ffffff', paintOrder: 'stroke' },
    },
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

test('every Tailwind v3 colour and shade compiles', () => {
  const names = [
    'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green',
    'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
  ];
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  for (const name of names) {
    for (const shade of shades) {
      assert.match(String(layersOf(`bg-${name}-${shade}`)[0]?.style.backgroundColor), /^#[0-9a-f]{6}$/, `bg-${name}-${shade}`);
    }
  }
  assert.equal(layersOf('text-sky-800')[0]?.style.color, '#075985');
  assert.throws(() => compileStyle('bg-sky-55'), /Unsupported utility class "bg-sky-55"/);
});

test('colour utilities take Tailwind\'s opacity modifier and compile to an 8 digit hex', () => {
  const style = (className: string) => layersOf(className)[0]?.style;
  assert.deepEqual(style('bg-white/20'), { backgroundColor: '#ffffff33' });
  assert.deepEqual(style('bg-black/50'), { backgroundColor: '#00000080' });
  assert.deepEqual(style('border-white/30'), { borderColor: '#ffffff4d' });
  assert.deepEqual(style('text-slate-900/70'), { color: '#0f172ab3' });
  assert.deepEqual(style('bg-[#f0a]/40'), { backgroundColor: '#ff00aa66' });
  assert.deepEqual(style('bg-[#ec4899]/[0.25]'), { backgroundColor: '#ec489940' });
  assert.deepEqual(style('bg-white/[37%]'), { backgroundColor: '#ffffff5e' });
  assert.deepEqual(style('bg-white/0'), { backgroundColor: '#ffffff00' });
  assert.deepEqual(style('bg-white/100'), { backgroundColor: '#ffffffff' });
  // A modifier composes with a state, and the state's colour keeps its own.
  assert.deepEqual(layersOf('bg-white/20 hover:bg-white/40'), [
    { style: { backgroundColor: '#ffffff33' } },
    { states: ['hover'], style: { backgroundColor: '#ffffff66' } },
  ]);
  // A colour that already has alpha, an out of range amount and a stray slash are not colours.
  for (const utility of ['bg-white/101', 'bg-white/20/30', 'bg-transparent/50', 'bg-[#1234]/50', 'bg-[#ffffff80]/50', 'bg-white/', 'bg-/20', 'bg-white/[1.5]', 'bg-white/x', 'bg-nope/20']) {
    assert.throws(() => compileStyle(utility), /Unsupported/, utility);
  }
  // The modifier works on every colour of the palette, not only the ones the test above names.
  for (const name of ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']) {
    assert.match(String(style(`bg-${name}-500/50`)?.backgroundColor), /^#[0-9a-f]{6}80$/u, `bg-${name}-500/50`);
  }
});

test('selection utilities compile to the longhands native reads', () => {
  const style = (className: string) => layersOf(className)[0]?.style;
  assert.deepEqual(style('select-none'), { userSelect: 'none' });
  assert.deepEqual(style('select-text'), { userSelect: 'text' });
  assert.deepEqual(style('selection-[#3b82f659]'), { selectionColor: '#3b82f659' });
  assert.deepEqual(style('selection-rose-400'), { selectionColor: '#fb7185' });
  // Later classes win, and conditions apply like any other utility.
  assert.deepEqual(layersOf('select-text hover:select-none'), [
    { style: { userSelect: 'text' } }, { states: ['hover'], style: { userSelect: 'none' } },
  ]);
  assert.deepEqual(layersOf('', { userSelect: 'text', selectionColor: '#0f0' })[0]?.style, { userSelect: 'text', selectionColor: '#0f0' });
  assert.throws(() => compileStyle('select-all'), /Unsupported utility class "select-all"/);
  assert.throws(() => compileStyle('selection-nope'), /Unsupported utility class "selection-nope"/);
});

test('scroll utilities compile to the longhands native reads', () => {
  const style = (className: string) => layersOf(className)[0]?.style;
  assert.deepEqual(style('overflow-scroll'), { overflowX: 'scroll', overflowY: 'scroll' });
  assert.deepEqual(style('overflow-auto'), { overflowX: 'auto', overflowY: 'auto' });
  assert.deepEqual(style('overflow-x-auto overflow-y-hidden'), { overflowX: 'auto', overflowY: 'hidden' });
  assert.deepEqual(style('overflow-x-scroll'), { overflowX: 'scroll' });
  assert.deepEqual(style('overflow-y-scroll'), { overflowY: 'scroll' });
  assert.deepEqual(style('overflow-hidden overflow-y-auto'), { overflowX: 'hidden', overflowY: 'auto' });
  assert.deepEqual(style('overscroll-contain'), { overscrollBehavior: 'contain' });
  assert.deepEqual(style('overscroll-auto'), { overscrollBehavior: 'auto' });
  assert.deepEqual(style('scrollbar-none'), { scrollbarWidth: 'none' });
  assert.deepEqual(style('scrollbar-auto'), { scrollbarWidth: 'auto' });
  assert.deepEqual(style('scrollbar-[#64748b99]'), { scrollbarColor: '#64748b99' });
  assert.deepEqual(style('scrollbar-slate-500'), { scrollbarColor: '#64748b' });
  assert.deepEqual(style('caret-indigo-500'), { caretColor: '#6366f1' });
  assert.deepEqual(style('caret-[#ff00aa]'), { caretColor: '#ff00aa' });
  assert.deepEqual(style('placeholder-slate-400'), { placeholderColor: '#94a3b8' });
  assert.deepEqual(layersOf('focus:caret-rose-500'), [{ states: ['focus'], style: { caretColor: '#f43f5e' } }]);
  assert.throws(() => style('caret-notacolour'), /Unsupported utility class/);
  for (const [token, action] of [
    ['touch-auto', 'auto'], ['touch-none', 'none'], ['touch-pan-x', 'pan-x'], ['touch-pan-y', 'pan-y'],
  ] as const) {
    assert.deepEqual(style(token), { touchAction: action });
  }
  // Conditions apply to them like any other utility.
  assert.deepEqual(layersOf('md:overflow-y-auto'), [{ minWidth: 768, style: { overflowY: 'auto' } }]);
  assert.deepEqual(layersOf('', { overflow: 'scroll', overscrollBehavior: 'contain', touchAction: 'pan-x' })[0]?.style, {
    overflowX: 'scroll', overflowY: 'scroll', overscrollBehavior: 'contain', touchAction: 'pan-x',
  });
  // And an unknown one still throws, so a typo cannot hide.
  assert.throws(() => compileStyle('overflow-overlay'), /Unsupported utility class "overflow-overlay"/);
  assert.throws(() => compileStyle('overscroll-none'), /Unsupported utility class "overscroll-none"/);
  assert.throws(() => compileStyle('scrollbar-thin'), /Unsupported utility class "scrollbar-thin"/);
  assert.throws(() => compileStyle('touch-manipulation'), /Unsupported utility class "touch-manipulation"/);
});

// ---- sameStyleProp: an inline style a render writes again ----

test('sameStyleProp: styles made of the same entries are the same, whatever object or order they come in', () => {
  const style: Style = { left: 4, top: 8 };
  assert.ok(sameStyleProp(style, style));
  assert.ok(sameStyleProp({ left: 4, top: 8 }, { top: 8, left: 4 }));
  assert.ok(sameStyleProp([{ left: 4 }, [{ top: 8 }]], [{ left: 4 }, [{ top: 8 }]]));
  // Entries that are data themselves are compared by what they hold.
  const transition = (duration: number): Style => ({ transition: { properties: ['opacity'], durationMs: duration } });
  assert.ok(sameStyleProp(transition(200), transition(200)));
  assert.ok(!sameStyleProp(transition(200), transition(300)));
  assert.ok(sameStyleProp({ gridTemplateColumns: [1, 'auto'] }, { gridTemplateColumns: [1, 'auto'] }));
  assert.ok(!sameStyleProp({ gridTemplateColumns: [1, 'auto'] }, { gridTemplateColumns: [1, 'auto', 2] }));
});

test('sameStyleProp: any change of an entry, a key or the nesting is a different style', () => {
  assert.ok(!sameStyleProp({ left: 4 }, { left: 5 }));
  assert.ok(!sameStyleProp({ left: 4 }, { left: 4, top: 0 }));
  assert.ok(!sameStyleProp({ left: 4, top: 0 }, { left: 4 }));
  assert.ok(!sameStyleProp({ left: 4 }, { top: 4 }));
  assert.ok(!sameStyleProp({ left: 4 }, [{ left: 4 }]));
  assert.ok(!sameStyleProp([{ left: 4 }], { left: 4 }));
  assert.ok(!sameStyleProp({ left: 0 }, { left: -0 }), 'Object.is tells 0 from -0, as a compile would');
  assert.ok(!sameStyleProp({ left: undefined }, {}));
  assert.ok(!sameStyleProp({ left: 1 }, undefined));
});

test('sameStyleProp: false, null, undefined and a list of them style nothing, and are the same', () => {
  for (const none of [false, null, undefined, [], [false], [[undefined], null]] as StyleProp[]) {
    for (const other of [false, null, undefined, [], [false]] as StyleProp[]) assert.ok(sameStyleProp(none, other));
    assert.ok(!sameStyleProp(none, { left: 1 }));
    assert.ok(!sameStyleProp({ left: 1 }, none));
  }
});
