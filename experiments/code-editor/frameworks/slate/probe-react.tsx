// Proves how far slate-react gets in godot-react-ui: the bare import fails on react-dom; with react-dom stubbed, withReact,
// the <Slate> provider and hooks render through our renderer, and what <Editable> needs from the DOM (first failure, from
// a real attempt). The reading of slate-react's DOM use is in the report (file:line from node_modules/slate-react/dist/index.js).
//
//   node_modules/.bin/tsx experiments/code-editor/frameworks/slate/probe-react.tsx
import { createElement as h, type ReactElement } from 'react';
import { createEditor } from 'slate';
import { Text, View } from '../../../../src';
import { mount } from '../../harness/host';
import { installAlias } from './alias.cjs';

async function main(): Promise<void> {
  try { require('slate-react'); console.log('bare import OK (unexpected)'); } catch (error) { console.log('bare import of slate-react FAILS:', (error instanceof Error ? error.message : String(error)).split('\n')[0]); }
  installAlias('react-dom', require.resolve('./react-dom-stub.cjs'));
  const slateReact = require('slate-react');
  console.log('with react-dom stubbed, import OK (touches globals; see import-probe.cjs); exports include:', ['Slate', 'Editable', 'withReact', 'useSlate', 'useSlateSelector', 'ReactEditor'].filter((k) => k in slateReact).join(','));

  let editor;
  try { editor = slateReact.withReact(createEditor()); console.log('withReact(createEditor()) OK'); } catch (error) { console.log('withReact THROWS:', error instanceof Error ? error.message : error); return; }
  const initialValue = [{ type: 'code-line', children: [{ text: 'const a = 1;' }] }, { type: 'code-line', children: [{ text: 'export default a;' }] }];

  function Lines(): ReactElement {
    const current = slateReact.useSlate();
    return h(View, null, ...current.children.map((line: { children: { text: string }[] }, index: number) => h(Text, { key: index }, line.children.map((leaf) => leaf.text).join(''))));
  }
  try {
    const rendered = await mount(h(slateReact.Slate, { editor, initialValue }, h(Lines)));
    console.log('<Slate> provider + useSlate through our renderer: errors', rendered.errors.map((e) => e.message));
    console.log(rendered.outline());
    rendered.unmount();
  } catch (error) { console.log('<Slate> mount THROWS:', error instanceof Error ? error.stack?.split('\n').filter((line) => line.includes('slate-')).slice(0, 4).join(' | ') : error); }

  try {
    const rendered = await mount(h(slateReact.Slate, { editor, initialValue }, h(slateReact.Editable, { renderLeaf: (p: { attributes: object; children: unknown }) => h(Text, p.attributes, p.children) })));
    console.log('<Editable> errors', rendered.errors.map((e) => e.message.split('\n')[0]));
    rendered.unmount();
  } catch (error) { console.log('<Editable> mount THROWS:', error instanceof Error ? error.stack?.split('\n').slice(0, 3).join(' | ') : error); }
}
main().catch((error) => { console.error('probe failed:', error); process.exitCode = 1; });
