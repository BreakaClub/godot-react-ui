// Proves what happens when react-simple-code-editor (a DOM library) is rendered through our renderer AS IS,
// first with a string-returning highlighter and then with a ReactNode-returning one.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/rsce-asis.tsx
import { createElement as h } from 'react';
import Editor from 'react-simple-code-editor';
import { mount } from '../harness/host';

async function attempt(label: string, element: Parameters<typeof mount>[0]) {
  console.log(`--- ${label}`);
  try {
    const rendered = await mount(element);
    console.log(rendered.outline() || '(empty outline)');
    console.log('errors:', rendered.errors.map((error) => error.message));
    rendered.unmount();
  } catch (error) {
    console.log('mount threw:', error instanceof Error ? error.message : error);
  }
}

async function main() {
  const code = 'const a = 1;\nconst b = 2;';
  await attempt('string highlighter', h(Editor, { value: code, onValueChange: () => {}, highlight: (c: string) => c }));
  await attempt('ReactNode highlighter', h(Editor, { value: code, onValueChange: () => {}, highlight: (c: string) => h('span', null, c) }));
}
main();
