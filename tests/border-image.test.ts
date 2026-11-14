import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStyle } from '../src/styles';
import type { LonghandStyle, StyleProp } from '../src/types';

// ---- border-image: the inline style, and the tailwindcss-border-image utilities ----

function layersOf(className: string, style?: StyleProp) {
  return compileStyle(className, style).layers;
}

function styleOf(className: string, style?: StyleProp): LonghandStyle {
  const layers = layersOf(className, style);
  assert.equal(layers.length, 1, `${className}: one layer`);
  return layers[0]?.style ?? {};
}

test('the source is none or a registered texture, and the repeat is stretch or round', () => {
  assert.deepEqual(styleOf('border-image-[url(frame)]'), { borderImageSource: 'url(frame)' });
  assert.deepEqual(styleOf('border-image-none'), { borderImageSource: 'none' });
  assert.deepEqual(styleOf('border-repeat-round'), { borderImageRepeat: 'round' });
  assert.deepEqual(styleOf('', { borderImageSource: 'url(frame)', borderImageRepeat: 'stretch' }), {
    borderImageSource: 'url(frame)', borderImageRepeat: 'stretch',
  });
  for (const name of ['border-image-[linear-gradient(red,blue)]', 'border-image-gradient-to-t', 'border-repeat-repeat', 'border-repeat-space']) {
    assert.throws(() => compileStyle(name), /Unsupported/u, name);
  }
});

test('slice utilities set the sides they name, and fill', () => {
  assert.deepEqual(styleOf('border-slice-12').borderImageSlice, { top: 12, right: 12, bottom: 12, left: 12 });
  assert.deepEqual(styleOf('border-slice-x-8 border-slice-t-[25%]').borderImageSlice, { left: 8, right: 8, top: '25%' });
  assert.deepEqual(styleOf('border-slice-y-4').borderImageSlice, { top: 4, bottom: 4 });
  assert.deepEqual(styleOf('border-slice-12 border-slice-fill').borderImageSlice, { top: 12, right: 12, bottom: 12, left: 12, fill: true });
  assert.deepEqual(styleOf('border-slice-fill border-slice-no-fill').borderImageSlice, { fill: false });
  assert.deepEqual(layersOf('border-slice-8 hover:border-slice-t-12'), [
    { style: { borderImageSlice: { top: 8, right: 8, bottom: 8, left: 8 } } },
    { states: ['hover'], style: { borderImageSlice: { top: 12 } } },
  ]);
  for (const name of ['border-slice-12px', 'border-slice-[nope]', 'border-slice-q-4', 'border-slice']) {
    assert.throws(() => compileStyle(name), /Unsupported/u, name);
  }
});

test('width and outset utilities take a multiple, a length, and auto for the width', () => {
  assert.deepEqual(styleOf('border-image-width-2').borderImageWidth, { top: 2, right: 2, bottom: 2, left: 2 });
  assert.deepEqual(styleOf('border-image-width-x-[12px] border-image-width-t-auto').borderImageWidth, {
    left: '12px', right: '12px', top: 'auto',
  });
  assert.deepEqual(styleOf('border-outset-1').borderImageOutset, { top: 1, right: 1, bottom: 1, left: 1 });
  assert.deepEqual(styleOf('border-outset-b-[4px]').borderImageOutset, { bottom: '4px' });
  for (const name of ['border-outset-auto', 'border-image-width-[3em]', 'border-outset-t-[50%]']) {
    assert.throws(() => compileStyle(name), /Unsupported/u, name);
  }
});

test('the CSS shorthand text of an inline style sets all four sides', () => {
  assert.deepEqual(styleOf('', { borderImageSlice: '30' }).borderImageSlice, { top: 30, right: 30, bottom: 30, left: 30, fill: false });
  assert.deepEqual(styleOf('', { borderImageSlice: '10 20% fill' }).borderImageSlice, { top: 10, right: '20%', bottom: 10, left: '20%', fill: true });
  assert.deepEqual(styleOf('', { borderImageSlice: 'fill 1 2 3 4' }).borderImageSlice, { top: 1, right: 2, bottom: 3, left: 4, fill: true });
  assert.deepEqual(styleOf('', { borderImageSlice: 8 }).borderImageSlice, { top: 8, right: 8, bottom: 8, left: 8, fill: false });
  assert.deepEqual(styleOf('', { borderImageWidth: '1 8px auto' }).borderImageWidth, { top: 1, right: '8px', bottom: 'auto', left: '8px' });
  assert.deepEqual(styleOf('', { borderImageOutset: '2px 0' }).borderImageOutset, { top: '2px', right: 0, bottom: '2px', left: 0 });
  // The text after the utilities replaces every side; a utility after the text changes only its own.
  assert.deepEqual(styleOf('border-slice-t-9', { borderImageSlice: '3' }).borderImageSlice, { top: 3, right: 3, bottom: 3, left: 3, fill: false });
  assert.throws(() => compileStyle('', { borderImageSlice: '1 2 3 4 5' }), /borderImageSlice/u);
  assert.throws(() => compileStyle('', { borderImageSlice: '12px' }), /borderImageSlice/u);
  assert.throws(() => compileStyle('', { borderImageOutset: 'auto' }), /borderImageOutset/u);
  assert.throws(() => compileStyle('', { borderImageWidth: '10%' }), /borderImageWidth/u);
});
