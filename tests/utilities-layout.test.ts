import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStyle } from '../src/styles';
import { TRANSITION_PROPERTIES } from '../src/types';
import type { Style, StyleProp } from '../src/types';
import { LAYOUT_PAGES, PAGE_CLASS, CAPTION_CLASS, CELL_CLASS, pageBoxes } from '../demo/src/layout-utilities-data';
import { LAYOUT_REFERENCE } from '../demo/src/layout-utilities-reference';
import { checkFixture } from './fixtures';

// ---- Layout and transition utilities (track utilities-layout-motion) ----

function layersOf(className: string, style?: StyleProp) {
  return compileStyle(className, style).layers;
}

/** The one layer an unconditional class string compiles to. */
function styleOf(className: string) {
  const layers = layersOf(className);
  assert.equal(layers.length, 1, className);
  return layers[0]?.style;
}

function assertUnsupported(utilities: readonly string[], message?: RegExp): void {
  for (const utility of utilities) {
    assert.throws(() => compileStyle(utility), message ?? /Unsupported utility class/, utility);
  }
}

test('margins take auto, negative values and percentages, on every side', () => {
  assert.deepEqual(styleOf('mx-auto'), { marginLeft: 'auto', marginRight: 'auto' });
  assert.deepEqual(styleOf('m-auto'), { marginBottom: 'auto', marginLeft: 'auto', marginRight: 'auto', marginTop: 'auto' });
  assert.deepEqual(styleOf('my-auto ml-auto'), { marginBottom: 'auto', marginLeft: 'auto', marginTop: 'auto' });
  assert.deepEqual(styleOf('-mt-2'), { marginTop: -8 });
  assert.deepEqual(styleOf('-mx-1'), { marginLeft: -4, marginRight: -4 });
  assert.deepEqual(styleOf('-m-px'), { marginBottom: -1, marginLeft: -1, marginRight: -1, marginTop: -1 });
  assert.deepEqual(styleOf('-mb-0.5'), { marginBottom: -2 });
  assert.deepEqual(styleOf('-mt-0'), { marginTop: 0 });
  assert.deepEqual(styleOf('mt-[3px]'), { marginTop: 3 });
  assert.deepEqual(styleOf('-mt-[3px]'), { marginTop: -3 });
  assert.deepEqual(styleOf('ml-[1.5rem]'), { marginLeft: 24 });
  assert.deepEqual(styleOf('m-[10%]'), { marginBottom: '10%', marginLeft: '10%', marginRight: '10%', marginTop: '10%' });
  assert.deepEqual(styleOf('-ml-[5%]'), { marginLeft: '-5%' });
  // Start and end are the left and right of a left-to-right layout.
  assert.deepEqual(styleOf('ms-4 me-2'), { marginLeft: 16, marginRight: 8 });
  assert.deepEqual(styleOf('-ms-1'), { marginLeft: -4 });
  assert.deepEqual(styleOf('ps-4 pe-2'), { paddingLeft: 16, paddingRight: 8 });
  // A later class overrides an earlier one, the shorthand included.
  assert.deepEqual(styleOf('m-4 mx-auto'), { marginBottom: 16, marginLeft: 'auto', marginRight: 'auto', marginTop: 16 });
  assert.deepEqual(layersOf('', { margin: 'auto', marginTop: -4 })[0]?.style, {
    marginBottom: 'auto', marginLeft: 'auto', marginRight: 'auto', marginTop: -4,
  });
  assertUnsupported(['-m-auto', '-mx-auto', 'm-foo', '-m-', 'mt-[3]', 'mt-[3em]', 'mt-[-3px]', '-p-4', '-gap-2', 'mx-[10vw]']);
});

test('spacing utilities keep their values and take arbitrary rem lengths', () => {
  assert.deepEqual(styleOf('p-4 gap-x-2 gap-y-[1rem]'), {
    columnGap: 8, paddingBottom: 16, paddingLeft: 16, paddingRight: 16, paddingTop: 16, rowGap: 16,
  });
  assert.deepEqual(styleOf('px-px py-0.5'), { paddingBottom: 2, paddingLeft: 1, paddingRight: 1, paddingTop: 2 });
  assert.deepEqual(styleOf('gap-px'), { columnGap: 1, rowGap: 1 });
});

test('sizes take the keywords, viewport shares and fractions Tailwind names', () => {
  assert.deepEqual(styleOf('w-screen h-screen'), { height: '100vh', width: '100vw' });
  assert.deepEqual(styleOf('w-dvw h-svh'), { height: '100vh', width: '100vw' });
  assert.deepEqual(styleOf('min-h-screen max-h-screen'), { maxHeight: '100vh', minHeight: '100vh' });
  assert.deepEqual(styleOf('min-h-dvh'), { minHeight: '100vh' });
  assert.deepEqual(styleOf('w-fit h-fit'), { height: 'fit-content', width: 'fit-content' });
  assert.deepEqual(styleOf('w-min h-max'), { height: 'max-content', width: 'min-content' });
  assert.deepEqual(styleOf('w-[50vw] h-[25vh]'), { height: '25vh', width: '50vw' });
  assert.deepEqual(styleOf('w-[fit-content]'), { width: 'fit-content' });
  assert.deepEqual(styleOf('size-8'), { height: 32, width: 32 });
  assert.deepEqual(styleOf('size-1/2'), { height: '50%', width: '50%' });
  assert.deepEqual(styleOf('size-full size-px'), { height: 1, width: 1 });
  assert.deepEqual(styleOf('size-auto'), { height: 'auto', width: 'auto' });
  assert.deepEqual(styleOf('size-fit'), { height: 'fit-content', width: 'fit-content' });
  assert.deepEqual(styleOf('min-w-0 min-h-full'), { minHeight: '100%', minWidth: 0 });
  assert.deepEqual(styleOf('min-w-[10rem] max-w-[50%]'), { maxWidth: '50%', minWidth: 160 });
  assert.deepEqual(styleOf('max-w-none max-h-none'), { maxHeight: 'auto', maxWidth: 'auto' });
  assert.deepEqual(styleOf('max-w-screen-md'), { maxWidth: 768 });
  assert.deepEqual(styleOf('max-w-xs max-w-7xl'), { maxWidth: 1280 });
  assert.deepEqual(styleOf('w-1/2 h-2/3 basis-1/4'), { flexBasis: '25%', height: `${2 / 3 * 100}%`, width: '50%' });
  assert.deepEqual(styleOf('basis-auto'), { flexBasis: 'auto' });
  assert.deepEqual(styleOf('basis-full'), { flexBasis: '100%' });
  assert.deepEqual(styleOf('basis-[120px]'), { flexBasis: 120 });
  // A limit cannot take an intrinsic keyword (Taffy's minimum and maximum take lengths and percentages), and says what to use.
  for (const utility of ['min-w-min', 'min-w-max', 'min-w-fit', 'max-w-min', 'max-w-fit', 'min-h-fit', 'max-h-max', 'max-h-min']) {
    assertUnsupported([utility], new RegExp(`Unsupported utility class "${utility}": .*size the box itself with`));
  }
  assertUnsupported(['w-screen-md', 'w-svw-x', 'h-screen-x', 'max-w-screen', 'max-w-auto', 'min-w-none', 'min-w-auto', 'w-[10]', 'w-[1em]']);
  assertUnsupported(['max-w-prose'], /65ch/);
  assertUnsupported(['w-[calc(100%-4px)]'], /calc\(\) is not supported/);
});

test('flex growth and the flex shorthand take arbitrary numbers', () => {
  assert.deepEqual(styleOf('grow-[2] shrink-[0.5]'), { flexGrow: 2, flexShrink: 0.5 });
  assert.deepEqual(styleOf('flex-[3]'), { flexBasis: '0%', flexGrow: 3, flexShrink: 1 });
  assert.deepEqual(styleOf('flex-[2_3]'), { flexBasis: '0%', flexGrow: 2, flexShrink: 3 });
  assert.deepEqual(styleOf('flex-[2_auto]'), { flexBasis: 'auto', flexGrow: 2, flexShrink: 1 });
  assert.deepEqual(styleOf('flex-[1_0_10px]'), { flexBasis: 10, flexGrow: 1, flexShrink: 0 });
  assert.deepEqual(styleOf('flex-[1_1_50%]'), { flexBasis: '50%', flexGrow: 1, flexShrink: 1 });
  assertUnsupported(['grow-[-1]', 'grow-2', 'shrink-[a]', 'flex-[]', 'flex-[1_2_3_4]', 'flex-[x]', 'flex-[1_2_3]']);
});

test('grid templates take counts, none and arbitrary track lists', () => {
  assert.deepEqual(styleOf('grid-cols-3'), { gridTemplateColumns: 3 });
  assert.deepEqual(styleOf('grid-rows-2'), { gridTemplateRows: 2 });
  assert.deepEqual(styleOf('grid-cols-none grid-rows-none'), { gridTemplateColumns: [], gridTemplateRows: [] });
  assert.deepEqual(styleOf('grid-cols-[200px_1fr_auto]'), { gridTemplateColumns: [200, '1fr', 'auto'] });
  assert.deepEqual(styleOf('grid-cols-[minmax(0,1fr)_2fr_30%]'), { gridTemplateColumns: [{ minmax: [0, '1fr'] }, '2fr', '30%'] });
  assert.deepEqual(styleOf('grid-cols-[minmax(900px,_1fr)_100px]'), { gridTemplateColumns: [{ minmax: [900, '1fr'] }, 100] });
  assert.deepEqual(styleOf('grid-rows-[min-content_max-content_fit-content(20px)]'), {
    gridTemplateRows: ['min-content', 'max-content', { fitContent: 20 }],
  });
  assert.deepEqual(styleOf('grid-cols-[repeat(auto-fill,minmax(120px,1fr))]'), {
    gridTemplateColumns: [{ repeat: 'auto-fill', tracks: [{ minmax: [120, '1fr'] }] }],
  });
  assert.deepEqual(styleOf('grid-cols-[50px_repeat(2,_100px_1fr)]'), {
    gridTemplateColumns: [50, { repeat: 2, tracks: [100, '1fr'] }],
  });
  assert.deepEqual(styleOf('grid-cols-[1.5rem_0]'), { gridTemplateColumns: [24, 0] });
  assert.deepEqual(styleOf('auto-cols-fr auto-rows-min'), { gridAutoColumns: [{ minmax: [0, '1fr'] }], gridAutoRows: ['min-content'] });
  assert.deepEqual(styleOf('auto-cols-auto auto-rows-max'), { gridAutoColumns: ['auto'], gridAutoRows: ['max-content'] });
  assert.deepEqual(styleOf('auto-rows-[100px_200px]'), { gridAutoRows: [100, 200] });
  assert.deepEqual(styleOf('grid-flow-row grid-flow-col'), { gridAutoFlow: 'column' });
  assert.deepEqual(styleOf('grid-flow-dense'), { gridAutoFlow: 'row-dense' });
  assert.deepEqual(styleOf('grid-flow-row-dense'), { gridAutoFlow: 'row-dense' });
  assert.deepEqual(styleOf('grid-flow-col-dense'), { gridAutoFlow: 'column-dense' });
  assertUnsupported(['grid-cols-0', 'grid-cols-[]', 'grid-cols-[2gr]', 'grid-cols-[minmax(1fr)]', 'grid-cols-[repeat(0,1fr)]',
    'grid-cols-[repeat(2)]', 'grid-cols-[minmax(0,1fr]', 'auto-cols-[repeat(2,1fr)]', 'auto-cols-foo', 'grid-flow-foo', 'grid-cols-1001',
    'grid-cols-[fit-content(1fr)]']);
  assertUnsupported(['grid-cols-subgrid', 'grid-rows-subgrid'], /Taffy has no subgrid/);
});

test('grid placement sets a span apart from the lines, so a line wins whichever class comes first', () => {
  assert.deepEqual(styleOf('col-span-2'), { gridColumnSpan: 2 });
  assert.deepEqual(styleOf('row-span-3'), { gridRowSpan: 3 });
  assert.deepEqual(styleOf('col-start-3 col-end-5'), { gridColumnEnd: 5, gridColumnStart: 3 });
  assert.deepEqual(styleOf('row-start-2 row-end-auto'), { gridRowEnd: 'auto', gridRowStart: 2 });
  assert.deepEqual(styleOf('col-span-full'), { gridColumnEnd: -1, gridColumnStart: 1 });
  assert.deepEqual(styleOf('row-span-full'), { gridRowEnd: -1, gridRowStart: 1 });
  assert.deepEqual(styleOf('col-auto'), { gridColumnEnd: 'auto', gridColumnStart: 'auto' });
  assert.deepEqual(styleOf('col-start-auto'), { gridColumnStart: 'auto' });
  assert.deepEqual(styleOf('col-start-[-2] col-span-[14]'), { gridColumnSpan: 14, gridColumnStart: -2 });
  // A start or an end can be negative, which counts from the last line of the explicit grid.
  assert.deepEqual(styleOf('-col-start-1 -row-end-3'), { gridColumnStart: -1, gridRowEnd: -3 });
  assertUnsupported(['-col-span-2', '-col-start-auto', '-col-auto']);
  assert.deepEqual(styleOf('col-start-2 col-span-3'), styleOf('col-span-3 col-start-2'));
  assert.deepEqual(layersOf('col-span-1 md:col-span-2 lg:col-start-1'), [
    { style: { gridColumnSpan: 1 } },
    { minWidth: 768, style: { gridColumnSpan: 2 } },
    { minWidth: 1024, style: { gridColumnStart: 1 } },
  ]);
  assertUnsupported(['col-span-0', 'col-span-13', 'col-start-14', 'col-start-0', 'col-start-[0]', 'col-span', 'col-foo', 'row-end-14']);
});

test('alignment utilities set the Tailwind CSS values, and the place-* shorthands set both axes', () => {
  assert.deepEqual(styleOf('content-start content-end'), { alignContent: 'flex-end' });
  for (const [utility, alignContent] of Object.entries({
    'content-normal': 'normal', 'content-center': 'center', 'content-start': 'flex-start', 'content-end': 'flex-end',
    'content-between': 'space-between', 'content-around': 'space-around', 'content-evenly': 'space-evenly', 'content-stretch': 'stretch',
  })) {
    assert.deepEqual(styleOf(utility), { alignContent }, utility);
  }
  for (const value of ['start', 'end', 'center', 'stretch']) {
    assert.deepEqual(styleOf(`justify-items-${value}`), { justifyItems: value }, value);
    assert.deepEqual(styleOf(`justify-self-${value}`), { justifySelf: value }, value);
    assert.deepEqual(styleOf(`place-self-${value}`), { alignSelf: value, justifySelf: value }, value);
    assert.deepEqual(styleOf(`place-items-${value}`), { alignItems: value, justifyItems: value }, value);
  }
  assert.deepEqual(styleOf('justify-self-auto'), { justifySelf: 'auto' });
  assert.deepEqual(styleOf('place-self-auto'), { alignSelf: 'auto', justifySelf: 'auto' });
  assert.deepEqual(styleOf('self-auto'), { alignSelf: 'auto' });
  assert.deepEqual(styleOf('place-items-baseline'), { alignItems: 'baseline', justifyItems: 'baseline' });
  assert.deepEqual(styleOf('place-content-start'), { alignContent: 'start', justifyContent: 'start' });
  assert.deepEqual(styleOf('place-content-between'), { alignContent: 'space-between', justifyContent: 'space-between' });
  assert.deepEqual(styleOf('place-content-stretch'), { alignContent: 'stretch', justifyContent: 'stretch' });
  assert.deepEqual(styleOf('justify-normal'), { justifyContent: 'normal' });
  assert.deepEqual(styleOf('justify-stretch'), { justifyContent: 'stretch' });
  // The ones that already existed keep their values.
  assert.deepEqual(styleOf('justify-start items-start self-start'), { alignItems: 'flex-start', alignSelf: 'flex-start', justifyContent: 'flex-start' });
  assertUnsupported(['content-foo', 'justify-items-auto', 'justify-items-baseline', 'place-items-auto', 'place-content-auto', 'items-auto']);
  assertUnsupported(['content-baseline', 'place-content-baseline'], /no baseline content alignment/);
});

test('order, aspect ratio and box sizing', () => {
  assert.deepEqual(styleOf('order-1'), { order: 1 });
  assert.deepEqual(styleOf('order-12 -order-3'), { order: -3 });
  assert.deepEqual(styleOf('order-first'), { order: -9999 });
  assert.deepEqual(styleOf('order-last'), { order: 9999 });
  assert.deepEqual(styleOf('order-none'), { order: 0 });
  assert.deepEqual(styleOf('order-[20]'), { order: 20 });
  assert.deepEqual(styleOf('order-[-4]'), { order: -4 });
  // Tailwind negates the numbers, so `-order-first` is the 9999 of `order-last`.
  assert.deepEqual(styleOf('-order-first'), { order: 9999 });
  assert.deepEqual(styleOf('-order-last'), { order: -9999 });
  assert.deepEqual(styleOf('-order-none'), { order: 0 });
  assertUnsupported(['order-13', 'order-0', 'order-', 'order-[1.5]', 'order-foo']);
  assert.deepEqual(styleOf('aspect-square'), { aspectRatio: 1 });
  assert.deepEqual(styleOf('aspect-video'), { aspectRatio: 16 / 9 });
  assert.deepEqual(styleOf('aspect-auto'), { aspectRatio: 'auto' });
  assert.deepEqual(styleOf('aspect-[4/3]'), { aspectRatio: 4 / 3 });
  assert.deepEqual(styleOf('aspect-[1.5]'), { aspectRatio: 1.5 });
  assertUnsupported(['aspect-[0/3]', 'aspect-[4/0]', 'aspect-wide', 'aspect-4/3', 'aspect-[a/b]']);
  assert.deepEqual(styleOf('box-border'), { boxSizing: 'border-box' });
  assert.deepEqual(styleOf('box-content'), { boxSizing: 'content-box' });
});

test('visibility, clipping and the block display values', () => {
  assert.deepEqual(styleOf('invisible'), { visibility: 'hidden' });
  assert.deepEqual(layersOf('invisible hover:visible'), [{ style: { visibility: 'hidden' } }, { states: ['hover'], style: { visibility: 'visible' } }]);
  assert.deepEqual(styleOf('overflow-clip'), { overflowX: 'clip', overflowY: 'clip' });
  assert.deepEqual(styleOf('overflow-x-clip overflow-y-hidden'), { overflowX: 'clip', overflowY: 'hidden' });
  assert.deepEqual(styleOf('block'), { display: 'block' });
  assert.deepEqual(styleOf('flow-root'), { display: 'flow-root' });
  assert.deepEqual(styleOf('flex'), { display: 'flex' });
  assert.deepEqual(styleOf('start-2 end-1/2'), { left: 8, right: '50%' });
  assert.deepEqual(styleOf('-start-4'), { left: -16 });
  assertUnsupported(['collapse'], /use invisible to keep the layout/);
});

test('container is full width with each breakpoint\'s width as the limit, and sr-only is a 1 px clipped box', () => {
  assert.deepEqual(layersOf('container'), [
    { style: { width: '100%' } },
    { minWidth: 640, style: { maxWidth: 640 } },
    { minWidth: 768, style: { maxWidth: 768 } },
    { minWidth: 1024, style: { maxWidth: 1024 } },
    { minWidth: 1280, style: { maxWidth: 1280 } },
    { minWidth: 1536, style: { maxWidth: 1536 } },
  ]);
  // Behind a breakpoint it starts there, and a later class still overrides (mx-auto and a limit of the author's own).
  assert.deepEqual(layersOf('md:container')[0], { minWidth: 768, style: { maxWidth: 768, width: '100%' } });
  assert.deepEqual(layersOf('container mx-auto max-w-xl').at(-1), { style: { marginLeft: 'auto', marginRight: 'auto', maxWidth: 576 } });
  assert.deepEqual(styleOf('sr-only'), {
    borderWidth: 0, height: 1, marginBottom: -1, marginLeft: -1, marginRight: -1, marginTop: -1, overflowX: 'hidden', overflowY: 'hidden',
    paddingBottom: 0, paddingLeft: 0, paddingRight: 0, paddingTop: 0, position: 'absolute', width: 1,
  });
  assert.equal(styleOf('not-sr-only')?.position, 'static');
});

test('the utilities with no honest mapping say what to use instead', () => {
  const hints: Record<string, RegExp> = {
    'space-y-4': /use gap-y-<n> \(or gap-<n>\) on the container/,
    'space-x-2': /use gap-x-<n>/,
    'space-y-reverse': /gap-y/,
    'divide-y': /border-t/,
    'divide-x-2': /border-t \(or border-l\)/,
    'divide-gray-200': /border-t/,
    inline: /no inline layout.*use block or flex/,
    'inline-block': /use block or flex/,
    'inline-flex': /use flex$/,
    'inline-grid': /use grid$/,
    contents: /remove the wrapper element/,
    'table-cell': /use grid/,
    'float-right': /use flex with ml-auto/,
    'clear-both': /no floats/,
    'columns-3': /use grid-cols-<n>/,
    sticky: /use relative, absolute or fixed/,
    isolate: /stacking context/,
  };
  for (const [utility, hint] of Object.entries(hints)) {
    assertUnsupported([utility], new RegExp(`Unsupported utility class "${utility}": .*${hint.source}`));
  }
  // The hint follows the whole token, variants included, so a class behind a breakpoint is explained the same way.
  assertUnsupported(['md:space-y-4'], /Unsupported utility class "md:space-y-4": .*gap-y/);
  // A class that is only a typo has no hint to give.
  assert.throws(() => compileStyle('spacey-4'), (error: unknown) => error instanceof Error && error.message === 'Unsupported utility class "spacey-4"');
});

// ---- Transitions ----

test('transition classes set the longhands with Tailwind\'s timing', () => {
  const standard = { cubicBezier: [0.4, 0, 0.2, 1] };
  assert.deepEqual(styleOf('transition'), {
    transitionParts: {
      durationMs: 150, easing: standard,
      properties: ['color', 'backgroundColor', 'borderColor', 'opacity', 'filter', 'backdropFilter'],
    },
  });
  assert.deepEqual(styleOf('transition-colors'), {
    transitionParts: { durationMs: 150, easing: standard, properties: ['color', 'backgroundColor', 'borderColor'] },
  });
  assert.deepEqual(styleOf('transition-opacity'), { transitionParts: { durationMs: 150, easing: standard, properties: ['opacity'] } });
  assert.deepEqual(styleOf('transition-all'), { transitionParts: { durationMs: 150, easing: standard, properties: 'all' } });
  assert.deepEqual(styleOf('transition-none'), { transitionParts: { properties: 'none' } });
  for (const duration of [0, 75, 100, 150, 200, 300, 500, 700, 1000]) {
    assert.deepEqual(styleOf(`duration-${duration}`), { transitionParts: { durationMs: duration } }, `duration-${duration}`);
    assert.deepEqual(styleOf(`delay-${duration}`), { transitionParts: { delayMs: duration } }, `delay-${duration}`);
  }
  assert.deepEqual(styleOf('duration-[250ms]'), { transitionParts: { durationMs: 250 } });
  assert.deepEqual(styleOf('duration-[0.3s]'), { transitionParts: { durationMs: 300 } });
  assert.deepEqual(styleOf('delay-[1.5s]'), { transitionParts: { delayMs: 1500 } });
  assert.deepEqual(styleOf('ease-linear'), { transitionParts: { easing: 'linear' } });
  assert.deepEqual(styleOf('ease-in'), { transitionParts: { easing: { cubicBezier: [0.4, 0, 1, 1] } } });
  assert.deepEqual(styleOf('ease-out'), { transitionParts: { easing: { cubicBezier: [0, 0, 0.2, 1] } } });
  assert.deepEqual(styleOf('ease-in-out'), { transitionParts: { easing: standard } });
  assert.deepEqual(styleOf('ease-[cubic-bezier(0.17,0.67,0.83,0.67)]'), { transitionParts: { easing: { cubicBezier: [0.17, 0.67, 0.83, 0.67] } } });
  assert.deepEqual(styleOf('ease-[cubic-bezier(0,_-0.5,1,1.5)]'), { transitionParts: { easing: { cubicBezier: [0, -0.5, 1, 1.5] } } });
  assertUnsupported(['duration-250', 'duration-', 'duration-[250]', 'duration-[-5ms]', 'delay-80', 'ease-bounce', 'ease-[cubic-bezier(2,0,0,1)]',
    'ease-[cubic-bezier(0,0,1)]', 'ease-[cubic-bezier(0,0,1,1,1)]', 'ease-[cubic-bezier(a,0,1,1)]', 'transition-foo', 'transition-colors-x']);
  // These name a property native does not animate, so they say so instead of compiling to nothing.
  assertUnsupported(['transition-shadow', 'transition-transform'], /not a property this build animates/);
});

test('transition classes compose across layers and variants, longhand by longhand', () => {
  const layers = layersOf('transition-colors duration-200 hover:duration-500 hover:ease-linear');
  assert.deepEqual(layers, [
    {
      style: {
        transitionParts: {
          durationMs: 200, easing: { cubicBezier: [0.4, 0, 0.2, 1] }, properties: ['color', 'backgroundColor', 'borderColor'],
        },
      },
    },
    { states: ['hover'], style: { transitionParts: { durationMs: 500, easing: 'linear' } } },
  ]);
  // duration alone is a complete declaration: `all`, the initial property list, is what it animates.
  assert.deepEqual(styleOf('duration-200'), { transitionParts: { durationMs: 200 } });
  // Within one layer a later longhand edits an earlier one, and a full inline `transition` replaces them.
  assert.deepEqual(styleOf('transition-none duration-300'), { transitionParts: { durationMs: 300, properties: 'none' } });
  assert.deepEqual(layersOf('transition duration-300', { transition: { properties: ['width'], durationMs: 100 } })[0]?.style, {
    transition: { durationMs: 100, properties: ['width'] },
  });
  assert.deepEqual(layersOf('', [{ transition: { properties: 'all', durationMs: 120, easing: 'linear' } }, { width: 3 }])[0]?.style, {
    transition: { durationMs: 120, easing: 'linear', properties: 'all' }, width: 3,
  });
  // The interned style does not share the caller's arrays or objects.
  const transition = { properties: ['width' as const], durationMs: 50, easing: { cubicBezier: [0, 0, 1, 1] as const } };
  const compiled = compileStyle('', { transition });
  assert.notEqual(compiled.layers[0]?.style.transition?.properties, transition.properties);
  assert.deepEqual(compiled.layers[0]?.style.transition, transition);
});

test('the transition classes name only properties native animates, and all of its list is reachable', () => {
  const named = new Set<string>();
  for (const utility of ['transition', 'transition-colors', 'transition-opacity']) {
    const parts = styleOf(utility)?.transitionParts;
    assert.ok(parts && Array.isArray(parts.properties), utility);
    for (const property of parts.properties) {
      assert.ok(TRANSITION_PROPERTIES.includes(property), `${utility} names ${property}`);
      named.add(property);
    }
  }
  // Every animatable property but the geometry ones is in Tailwind's default `transition`, which does not animate sizes.
  assert.deepEqual([...TRANSITION_PROPERTIES].filter((property) => !named.has(property)), ['width', 'height']);
});

test('compiled layout and transition styles match the native contract fixture, which the Rust tests parse and validate', () => {
  const classNames = [
    'mx-auto -mt-2 m-[10%] ms-4',
    'w-screen h-fit min-h-screen max-w-screen-md basis-1/3 size-8',
    'grid grid-cols-[200px_minmax(0,1fr)_auto] grid-rows-2 auto-cols-fr auto-rows-[100px_200px] grid-flow-col-dense gap-2',
    'grid-cols-[repeat(auto-fill,minmax(120px,1fr))] grid-cols-none',
    'col-span-2 col-start-3 row-span-full row-end-auto',
    'content-between justify-items-center justify-self-end place-self-stretch self-auto justify-stretch',
    'order-2 -order-1 aspect-video box-content invisible overflow-clip block flow-root',
    'transition-colors duration-200 ease-in-out hover:duration-500 delay-75',
    'transition-all duration-300',
    'duration-150 ease-[cubic-bezier(0.1,0.2,0.3,0.4)] transition-none',
    'md:grid-cols-3 md:col-span-2 lg:w-[50vw]',
  ];
  const fixture = classNames.map((className) => ({ className, compiled: compileStyle(className) }));
  checkFixture('utilities-layout-styles.json', fixture);
  const inline: Style = {
    margin: 'auto', width: 'min-content', gridTemplateColumns: [{ minmax: [0, '1fr'] }], alignSelf: 'auto',
    transition: { properties: 'all', durationMs: 90, easing: { cubicBezier: [0.5, 0, 0.5, 1] } },
  };
  checkFixture('utilities-layout-inline-style.json', compileStyle('', inline));
});

// ---- The lab as data, for Taffy against Chrome (native/utility_layouts.rs) ----

test('the layout lab compiles to the fixture the Rust tests lay out and compare with Chrome\'s rectangles', () => {
  const compiled: Record<string, unknown> = {};
  const addClasses = (className: string): void => {
    compiled[className] = compileStyle(className);
  };
  [PAGE_CLASS, CAPTION_CLASS, CELL_CLASS].forEach(addClasses);
  for (const page of LAYOUT_PAGES) pageBoxes(page).forEach((box) => addClasses(box.className));
  const fixture = {
    pageClass: PAGE_CLASS, captionClass: CAPTION_CLASS, cellClass: CELL_CLASS, compiled,
    pages: LAYOUT_PAGES.map((page) => ({ name: page.name, cases: page.cases })),
    reference: LAYOUT_REFERENCE,
  };
  checkFixture('layout-utilities-lab.json', fixture);
  // Every box of every page has a Chrome rectangle at both window sizes, and the pages have no id twice.
  const ids = LAYOUT_PAGES.flatMap((page) => pageBoxes(page).map((box) => box.id));
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const [size, rects] of Object.entries(LAYOUT_REFERENCE)) {
    for (const id of ids) assert.ok(rects[id], `${size} has a rectangle for ${id}`);
  }
});
