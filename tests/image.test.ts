import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h } from 'react';
import { Image, View, createRoot, registerMaterial, registerTexture, type ImageHost } from '../src';
import { diffNativeProps, NATIVE_PROP_KEYS, nativeProps } from '../src/props';
import { NO_SUBSCRIPTION, RecordingHost } from './recording-host';

test('an image sends its picture props, and alt makes it an img with a label', () => {
  const native = nativeProps('image', {
    source: 'oak', fit: 'cover', sourceRect: { x: 0, y: 4, width: 8, height: 8 }, tintColor: '#ff000080',
    material: 'paper', flipX: true, flipY: false, alt: 'An oak',
  }, false);
  assert.deepEqual(native, {
    source: 'oak', fit: 'cover', sourceRect: { x: 0, y: 4, width: 8, height: 8 }, tintColor: '#ff000080',
    material: 'paper', flipX: true, role: 'img', ariaLabel: 'An oak',
  });
  for (const key of Object.keys(native)) assert.ok((NATIVE_PROP_KEYS as readonly string[]).includes(key), key);
  // An explicit role or label wins over alt; an empty alt is a decorative picture, with no role.
  assert.deepEqual(nativeProps('image', { source: 'oak', alt: 'An oak', role: 'none' }, false), {
    source: 'oak', role: 'none', ariaLabel: 'An oak',
  });
  assert.deepEqual(nativeProps('image', { source: 'oak', alt: '' }, false), { source: 'oak' });
});

test('image props on any other element are refused, naming the prop', () => {
  for (const kind of ['view', 'text', 'button', 'textinput'] as const) {
    for (const props of [{ source: 'x' }, { fit: 'contain' as const }, { tintColor: '#fff' }, { alt: 'x' }, { flipX: true }]) {
      const name = Object.keys(props)[0];
      assert.throws(() => nativeProps(kind, kind === 'text' ? { ...props, children: '' } : props, false),
        new RegExp(`${String(name)} is only valid on Image, not on a ${kind} element`));
    }
  }
  assert.throws(() => nativeProps('image', { slice: { top: 1, right: Number.NaN, bottom: 1, left: 1 } }, false), /slice.right/);
  assert.throws(() => nativeProps('image', { sourceRect: { x: 0, y: 0, width: Infinity, height: 1 } }, false), /sourceRect.width/);
});

test('slice and sourceRect are compared by value, so a render that writes them again sends nothing', () => {
  const props = () => nativeProps('image', {
    source: 'paper', slice: { top: 4, right: 4, bottom: 4, left: 4 }, sourceRect: { x: 1, y: 2, width: 3, height: 4 },
  }, false);
  assert.equal(diffNativeProps(props(), props()), null);
  const moved = nativeProps('image', {
    source: 'paper', slice: { top: 4, right: 4, bottom: 4, left: 4, fill: false }, sourceRect: { x: 1, y: 2, width: 3, height: 4 },
  }, false);
  assert.deepEqual(diffNativeProps(props(), moved), { slice: { top: 4, right: 4, bottom: 4, left: 4, fill: false } });
  assert.deepEqual(diffNativeProps(props(), nativeProps('image', { source: 'other' }, false)), {
    source: 'other', slice: null, sourceRect: null,
  });
});

test('an <Image> mounts as one childless image node, and refuses children', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  root.render(h(View, null, h(Image, { testID: 'oak', source: 'oak', fit: 'contain', className: 'w-16' })));
  const created = host.commits.at(-1)?.payload.created.find((node) => node.kind === 'image');
  assert.ok(created);
  assert.equal(created.props.source, 'oak');
  assert.equal(created.props.fit, 'contain');
  assert.ok(created.props.style);
  const image = root.findByTestID('oak');
  assert.ok(image);
  assert.deepEqual(image.children, []);
  // The props type has no children; a cast stands in for the JavaScript caller the error is for.
  const withChild = { source: 'oak', children: h(View) } as unknown as Parameters<typeof Image>[0];
  assert.throws(() => root.render(h(View, null, h(Image, withChild))), /An <Image> has no children/);
  root.unmount();
});

test('the registration helpers report the reason native gives', () => {
  const calls: string[] = [];
  const host: ImageHost<string, string> = {
    registerTexture: (id, texture) => (calls.push(`texture ${id} ${texture}`), id === '' ? 'a texture id must not be empty' : ''),
    unregisterTexture: () => true,
    registerMaterial: (id, material) => (calls.push(`material ${id} ${material}`), ''),
    unregisterMaterial: () => true,
  };
  registerTexture(host, 'oak', 'Texture2D');
  registerMaterial(host, 'paper', 'ShaderMaterial');
  assert.throws(() => registerTexture(host, '', 'Texture2D'), /Cannot register the texture : a texture id must not be empty/);
  assert.deepEqual(calls, ['texture oak Texture2D', 'material paper ShaderMaterial', 'texture  Texture2D']);
});

test('an image whose source arrives after it mounted is updated with the source', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const scene = (source: string | undefined) => h(View, null, h(Image, { testID: 'later', source, style: { width: 10, height: 10 } }));
  root.render(scene(undefined));
  root.render(scene('oak'));
  const image = root.findByTestID('later');
  assert.ok(image);
  const payload = host.commits.at(-1)?.payload;
  assert.deepEqual(payload?.updated, [{ tag: image.id, props: { source: 'oak' } }]);
  root.unmount();
});
