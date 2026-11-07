// Reproduction: OUR renderer finding. A style key outside `Style` (a DOM-era key such as whiteSpace, fontStyle) is not rejected by
// the JS side. The element mounts, the key travels in the commit, and the real native side (StyleSpec has deny_unknown_fields)
// would refuse the WHOLE commit. A class name, by contrast, throws immediately in JS. The asymmetry is the gap.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/style-passthrough.tsx
import { createElement as h } from 'react';
import { Text, View } from '../../../src';
import { compileStyle } from '../../../src/styles';
import { mount } from '../harness/host';
import { nativeStyleKeys, rejectedStyleKeys } from './lib/native-style-check';

async function main() {
  console.log('native StyleSpec keys read from native/props.rs:', nativeStyleKeys().size);
  const style = { whiteSpace: 'pre', fontStyle: 'italic', padding: '1em', color: 'rgb(1,2,3)' } as never;
  try {
    const compiled = compileStyle('', style);
    console.log('compileStyle accepted it:', JSON.stringify(compiled));
  } catch (error) {
    console.log('compileStyle threw:', (error as Error).message);
  }
  const rendered = await mount(h(View, null, h(Text, { style }, 'x')));
  console.log('mount: root errors =', rendered.errors.length, '(JS and the recording host accepted it)');
  console.log('keys native would reject (key: nodes):', Object.fromEntries(rejectedStyleKeys(rendered.nodes())));
  console.log('payload:', JSON.stringify(rendered.host.commits[0]?.payload.created.find((n) => n.kind === 'text')?.props));
  rendered.unmount();
  try {
    await mount(h(View, { className: 'npm__textarea' }));
  } catch (error) {
    console.log('unknown className throws at once:', (error as Error).message);
  }
}
main();
