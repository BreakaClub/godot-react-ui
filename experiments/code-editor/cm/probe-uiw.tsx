// @uiw/react-codemirror through our renderer, two ways: as shipped (a <div> host element), and with a View-based container
// (the hook's `useCodeMirror` is exported, so a caller can bring its own container): which step fails and why.
import { createElement as h, useEffect, useRef } from 'react';
import { View } from '../../../src';
import { mount } from '../harness/host';
import CodeMirror, { useCodeMirror } from '@uiw/react-codemirror';

function Own() {
  const container = useRef<unknown>(null);
  const { setContainer, view, state } = useCodeMirror({ value: 'const a = 1;', container: container.current as HTMLDivElement | null });
  useEffect(() => { console.log('useCodeMirror effect: view', view === undefined ? 'undefined' : 'created', 'state', state === undefined ? 'undefined' : 'created'); }, [view, state]);
  return h(View, { ref: (node: unknown) => { container.current = node; setContainer(node as HTMLDivElement | null); } });
}

async function main() {
  for (const [label, element] of [['as shipped', h(CodeMirror, { value: 'const a = 1;' })], ['useCodeMirror with a View container', h(Own)]] as const) {
    try {
      const rendered = await mount(element);
      console.log(`${label}: outline\n${rendered.outline()}\n  errors: ${rendered.errors.map((e) => e.message.split('\n')[0]).join(' | ') || 'none'}`);
      rendered.unmount();
    } catch (error) {
      console.log(`${label}: THREW ${(error as Error).message.split('\n')[0]}`);
    }
  }
}
main();
