// Proves why the DOM-bound virtualizers are out: react-window v2 imports fine but its List renders a host <div> and reads the
// element's ownerDocument/ResizeObserver/getComputedStyle; react-virtuoso and @legendapp/list import react-dom at load. Records
// the exact first failure of each, from real attempts (a cheap `tagName`/`components` route is tried where the library offers one).
//
//   node_modules/.bin/tsx experiments/code-editor/frameworks/virtual/probe-dom-virtualizers.tsx
import { createElement as h, forwardRef, type ReactElement } from 'react';
import { Text, View } from '../../../../src';
import { mount } from '../../harness/host';

function line(error: unknown): string {
  return error instanceof Error ? `${error.constructor.name}: ${error.message.split('\n')[0]} @ ${String(error.stack).split('\n').find((l) => l.includes('node_modules') && !l.includes('react-reconciler'))?.trim().replace(/^.*node_modules\//, '') ?? '?'}` : String(error);
}

function Row(props: { index: number; style: object }): ReactElement {
  return h(Text, null, `row ${props.index}`);
}

async function main(): Promise<void> {
  const reactWindow = require('react-window');
  console.log('react-window exports:', Object.keys(reactWindow).join(','));
  // 1. as shipped: the default tagName 'div'
  try {
    const rendered = await mount(h(reactWindow.List, { rowComponent: Row, rowCount: 1000, rowHeight: 20, rowProps: {}, style: { height: 400 } }));
    console.log('List (tagName div): errors', rendered.errors.map((e) => e.message.split('\n')[0]));
    rendered.unmount();
  } catch (error) { console.log('List (default tagName div) THROWS:', line(error)); }
  // 2. the cheap route: tagName = a component that renders our View, ignoring the element ref
  const Container = forwardRef<unknown, { style?: object; children?: unknown }>(function Container(props, ref) {
    void ref;
    return h(View, { className: 'overflow-y-scroll', style: { height: 400 } }, props.children as never);
  });
  try {
    const rendered = await mount(h(reactWindow.List, { tagName: Container, rowComponent: Row, rowCount: 1000, rowHeight: 20, rowProps: {}, style: { height: 400 } }));
    console.log('List (tagName = our View wrapper): errors', rendered.errors.map((e) => e.message.split('\n')[0]), '| text nodes', rendered.nodes().filter((n) => n.kind === 'text').length);
    rendered.unmount();
  } catch (error) { console.log('List (tagName = our View wrapper) THROWS:', line(error)); }

  for (const name of ['react-virtuoso', '@legendapp/list/react']) {
    try { require(name); console.log(name, 'import OK'); } catch (error) { console.log(name, 'import FAILS:', line(error)); }
  }
}
main().catch((error) => { console.error('probe failed:', error); process.exitCode = 1; });
