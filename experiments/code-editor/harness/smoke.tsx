import { createElement as h } from 'react';
import { Text, View } from '../../../src';
import { mount } from './host';

async function main() {
  const rendered = await mount(h(View, null, h(Text, null, 'hello'), h(Text, { style: { color: '#f00' } }, 'world')));
  console.log(rendered.outline());
  console.log('errors', rendered.errors.length, 'commit bytes', rendered.commitBytes());
  rendered.unmount();
}
main();
