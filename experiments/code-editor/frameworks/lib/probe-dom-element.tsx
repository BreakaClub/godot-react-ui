// Proves: what a DOM-first React library sees when it renders a lowercase host element ('div', 'section', 'span') or a
// raw string child through godot-react-ui. Friction record: the message for an unknown host type.
//
//   node_modules/.bin/tsx experiments/code-editor/frameworks/lib/probe-dom-element.tsx
import { createElement as h, type ReactElement } from 'react';
import { Text, View } from '../../../../src';
import { mount } from '../../harness/host';

async function attempt(label: string, element: ReactElement): Promise<void> {
  try {
    const rendered = await mount(element);
    console.log(`${label}: mounted, errors`, rendered.errors.map((e) => e.message));
    rendered.unmount();
  } catch (error) {
    const stack = error instanceof Error ? String(error.stack).split('\n').slice(0, 4).join(' | ') : String(error);
    console.log(`${label}: THROWS ${stack}`);
  }
}

async function main(): Promise<void> {
  await attempt("h('div')", h('div', null));
  await attempt("h('section', null, h('div'))", h('section', null, h('div')));
  await attempt("h('span', null, 'text')", h('span', null, 'text'));
  await attempt("raw string inside <View>", h(View, null, 'x'));
  await attempt("<Text> with a nested <Text> (every React Native code highlighter does this)", h(Text, null, h(Text, { style: { color: '#f00' } }, 'a'), 'b'));
  await attempt("<Text> containing only a <Text> (no sibling string)", h(Text, null, h(Text, null, 'a')));
  await attempt("<Text> with an array of strings", h(Text, null, ['a', 'b', 'c']));
  await attempt("<Text> with a string and a number", h(Text, null, 'a', 1));
  await attempt("<Text> with null/false/undefined children and one string", h(Text, null, null, false, undefined, 'a'));
  await attempt("<Text> with an empty string", h(Text, null, ''));
}
main();
