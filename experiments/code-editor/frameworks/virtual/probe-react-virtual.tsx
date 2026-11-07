// Proves: @tanstack/react-virtual (3.14.26) cannot even be imported in godot-react-ui as shipped (top-level
// `import { flushSync } from 'react-dom'`), and runs unchanged once react-dom resolves to a one-line stub, with the same
// adapter options as probe-virtual-core.tsx. Also shows which layout-effect hook it picks without a `document`.
//
//   node_modules/.bin/tsx experiments/code-editor/frameworks/virtual/probe-react-virtual.tsx
import { createElement as h, memo, useMemo, type ReactElement } from 'react';
import { Text, View } from '../../../../src';
import { ScrollView } from '../../../../src/kit';
import { mountScrolling, settle } from '../lib/scroll-host';
import { installAlias } from './alias.cjs';
import { GodotScrollSource, godotScrollOptions } from './godot-virtual';

const ROWS = 1000;
const ROW_HEIGHT = 20;
const lines = Array.from({ length: ROWS }, (_, index) => `${String(index + 1).padStart(4, ' ')}  line ${index}`);

type ReactVirtualModule = typeof import('@tanstack/react-virtual');
let reactVirtual: ReactVirtualModule | undefined;
let virtualizerSeen: ReturnType<ReactVirtualModule['useVirtualizer']> | undefined;
let source: GodotScrollSource | undefined;

const Row = memo(function Row(props: { text: string }): ReactElement {
  return h(Text, { style: { height: ROW_HEIGHT } }, props.text);
});

function List(): ReactElement {
  if (reactVirtual === undefined) throw new Error('react-virtual not loaded');
  const scrollSource = useMemo(() => new GodotScrollSource(), []);
  source = scrollSource;
  const v = reactVirtual.useVirtualizer({
    count: ROWS, estimateSize: () => ROW_HEIGHT, overscan: 5, initialRect: { width: 600, height: 400 },
    ...godotScrollOptions(scrollSource),
  });
  virtualizerSeen = v;
  const items = v.getVirtualItems();
  const first = items[0];
  const last = items[items.length - 1];
  return h(ScrollView, {
    ref: scrollSource.attach, onScroll: scrollSource.onScroll, testID: 'scroller', focusable: false, className: 'w-[600px] h-[400px]',
  },
  h(View, { key: 'before', className: 'shrink-0', style: { height: first === undefined ? 0 : first.start } }),
  ...items.map((item) => h(Row, { key: item.key, text: lines[item.index] ?? '' })),
  h(View, { key: 'after', className: 'shrink-0', style: { height: last === undefined ? v.getTotalSize() : v.getTotalSize() - last.end } }));
}

function rows(texts: string[]): string {
  const numbers = texts.map((t) => Number.parseInt(t.trim(), 10)).filter((n) => Number.isFinite(n));
  return numbers.length === 0 ? 'none' : `${numbers[0]}..${numbers[numbers.length - 1]} (${numbers.length})`;
}

async function main(): Promise<void> {
  console.log('document defined:', typeof document, '| window:', typeof window);
  try {
    require('@tanstack/react-virtual');
    console.log('bare import: OK (unexpected)');
  } catch (error) {
    console.log('bare import FAILS:', (error instanceof Error ? error.message : String(error)).split('\n')[0]);
  }
  installAlias('react-dom', require.resolve('./react-dom-stub.cjs'));
  reactVirtual = require('@tanstack/react-virtual');
  console.log('with react-dom -> stub: import OK; exports', Object.keys(reactVirtual ?? {}).slice(0, 8).join(', '), '...');

  const m = await mountScrolling(h(List, null), (host) => {
    host.defineContainer('scroller', {
      clientWidth: 600, clientHeight: 400, contentHeight: () => virtualizerSeen?.getTotalSize() ?? 0,
    });
  });
  console.log('errors', m.errors.map((e) => e.message));
  console.log('initial: nodes', m.nodeCount(), 'rows', rows(m.texts()), 'commits', m.commitCount(), 'bytes', m.commitBytes());

  let mark = m.commitCount();
  m.host.userScrollTo(m.root, 'scroller', 5000);
  await settle();
  console.log('scroll to 5000: rows', rows(m.texts()), 'nodes', m.nodeCount(), 'commits +', m.commitCount() - mark, 'bytes', m.commitBytes(mark));

  mark = m.commitCount();
  m.host.userScrollTo(m.root, 'scroller', 5020);
  await settle();
  console.log('one-row step: rows', rows(m.texts()), 'commits +', m.commitCount() - mark, 'bytes', m.commitBytes(mark));

  const requestsBefore = m.host.scrollRequests.length;
  virtualizerSeen?.scrollToIndex(700, { align: 'start' });
  console.log('scrollToIndex(700) -> handle.scrollTo', m.host.scrollRequests.slice(requestsBefore));
  m.root.dispatchEvents();
  await settle();
  console.log('after delivery: rows', rows(m.texts()), 'scrollOffset', virtualizerSeen?.scrollOffset);

  m.unmount();
  await settle();
  console.log('errors at the end', m.errors.map((e) => e.message), '| scrollToCalls', source?.scrollToCalls.length);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
