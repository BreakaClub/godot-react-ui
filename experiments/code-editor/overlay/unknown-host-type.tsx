// Proves what our renderer does with a host element type it does not know ('div', 'pre', 'textarea', 'style'),
// which is the first thing any DOM-targeted library hits. Reports the error (or the committed kind) for each.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/unknown-host-type.tsx
import { createElement as h } from 'react';
import { Text, View } from '../../../src';
import { mount } from '../harness/host';

async function attempt(label: string, element: Parameters<typeof mount>[0]) {
  console.log(`--- ${label}`);
  try {
    const rendered = await mount(element);
    console.log(rendered.outline() || '(empty outline)');
    console.log('root errors:', rendered.errors.map((error) => error.message));
    console.log('commits:', rendered.host.commits.length, 'kinds created:', rendered.host.commits.flatMap((c) => c.payload.created.map((n) => n.kind)));
    rendered.unmount();
  } catch (error) {
    console.log('mount threw:', error instanceof Error ? error.message : error);
  }
}

async function main() {
  await attempt("h('div') with no props", h('div', null));
  await attempt("h('div') with a Text child inside a View", h(View, null, h('div', null, h(Text, null, 'x'))));
  await attempt("h('pre', {style: {whiteSpace: 'pre'}})", h('pre', { style: { whiteSpace: 'pre' } }));
  await attempt("h('span', null, 'raw string')", h('span', null, 'raw string'));
  await attempt("h('textarea', {value:'x', onChange(){}})", h('textarea', { value: 'x', onChange() {} }));
}
main();
