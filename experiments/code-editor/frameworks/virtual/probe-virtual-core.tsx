// Proves: @tanstack/virtual-core (via the adapter in godot-virtual.ts) windows a 1,000-row list inside a godot-react-ui
// scroll container (kit ScrollView), follows `scroll` events, writes `scrollTo` through the handle, and what it costs.
//
//   node_modules/.bin/tsx experiments/code-editor/frameworks/virtual/probe-virtual-core.tsx
import { createElement as h, memo, type ReactElement } from 'react';
import { Text, View } from '../../../../src';
import { ScrollView } from '../../../../src/kit';
import { mountScrolling, settle } from '../lib/scroll-host';
import { useGodotVirtualizer, type GodotVirtualizer } from './godot-virtual';

const ROWS = 1000;
const ROW_HEIGHT = 20;
const VIEWPORT_HEIGHT = 400;
const VIEWPORT_WIDTH = 600;
const OVERSCAN = 5;
const lines = Array.from({ length: ROWS }, (_, index) => `${String(index + 1).padStart(4, ' ')}  const value${index} = compute(${index});`);

let latest: GodotVirtualizer | undefined;
let rowRenders = 0;

interface ListProps { initialRect: boolean; tokensPerRow: number; }

const Row = memo(function Row(props: { text: string; tokens: number }): ReactElement {
  rowRenders += 1;
  if (props.tokens <= 1) return h(Text, { style: { height: ROW_HEIGHT } }, props.text);
  // A coloured row has to be a flex row of Texts: <Text> children are strings only, so there are no inline runs.
  const size = Math.ceil(props.text.length / props.tokens);
  const parts: string[] = [];
  for (let at = 0; at < props.text.length; at += size) parts.push(props.text.slice(at, at + size));
  return h(View, { className: 'flex-row shrink-0', style: { height: ROW_HEIGHT } },
    ...parts.map((part, index) => h(Text, { key: index, style: { color: index % 2 === 0 ? '#c678dd' : '#98c379' } }, part)));
});

function List({ initialRect, tokensPerRow }: ListProps): ReactElement {
  const v = useGodotVirtualizer({
    count: ROWS, estimateSize: () => ROW_HEIGHT, overscan: OVERSCAN,
    ...(initialRect ? { initialRect: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT } } : {}),
  });
  latest = v;
  const first = v.items[0];
  const last = v.items[v.items.length - 1];
  const before = first === undefined ? 0 : first.start;
  const after = last === undefined ? v.totalSize : v.totalSize - last.end;
  return h(ScrollView, {
    ref: v.containerRef, onScroll: v.onScroll, testID: 'scroller', focusable: false,
    className: 'w-[600px] h-[400px]',
  },
  h(View, { key: 'before', className: 'shrink-0', style: { height: before } }),
  ...v.items.map((item) => h(Row, { key: item.key, text: lines[item.index] ?? '', tokens: tokensPerRow })),
  h(View, { key: 'after', className: 'shrink-0', style: { height: after } }));
}

function firstAndLast(texts: string[]): string {
  // rows are `${n}  const ...`; with several tokens the first token starts with the number
  const numbers = texts.map((text) => Number.parseInt(text.trim(), 10)).filter((n) => Number.isFinite(n));
  return numbers.length === 0 ? 'none' : `${numbers[0]}..${numbers[numbers.length - 1]} (${numbers.length} rows)`;
}

async function scenario(label: string, props: ListProps): Promise<void> {
  console.log(`\n=== ${label}`);
  latest = undefined; rowRenders = 0;
  const m = await mountScrolling(h(List, props), (host) => {
    host.defineContainer('scroller', {
      clientWidth: VIEWPORT_WIDTH, clientHeight: VIEWPORT_HEIGHT, contentHeight: () => latest?.totalSize ?? 0,
    });
  });
  const v = (): GodotVirtualizer => { if (latest === undefined) throw new Error('not rendered'); return latest; };
  const mark = () => ({ commits: m.commitCount(), renders: v().renders.count, rows: rowRenders });
  console.log('errors', m.errors.map((e) => e.message));
  const rowTexts = () => m.texts().filter((t) => /^\s*\d+\s/.test(t) || props.tokensPerRow > 1);
  console.log('initial: nodes', m.nodeCount(), 'texts', m.nodeCount('text'), 'view', m.nodeCount('view'), 'rows', firstAndLast(m.texts().filter((t) => /^\s*\d{1,4}  /.test(t))),
    '| commits', m.commitCount(), 'bytes', m.commitBytes(), 'hook renders', v().renders.count);
  console.log('initial scrollTo writes', v().source.scrollToCalls, 'getScrollState calls', m.host.calls.filter((c) => c === 'getScrollState').length);

  // 1. the user scrolls (wheel/drag/bar): native moves the container and queues one scroll event
  let before = mark(); let bytesFrom = m.commitCount();
  m.host.userScrollTo(m.root, 'scroller', 5000);
  await settle();
  console.log('after user scroll to 5000: rows', firstAndLast(m.texts().filter((t) => /^\s*\d{1,4}  /.test(t))), 'nodes', m.nodeCount(),
    '| commits +', m.commitCount() - before.commits, 'bytes', m.commitBytes(bytesFrom), 'hook renders +', v().renders.count - before.renders,
    'Row renders +', rowRenders - before.rows, 'isScrolling', v().virtualizer.isScrolling, 'scrollOffset', v().virtualizer.scrollOffset);

  // 2. one small step (20 px = one row): the cost of the common case
  before = mark(); bytesFrom = m.commitCount();
  m.host.userScrollTo(m.root, 'scroller', 5020);
  await settle();
  console.log('after one-row step (5020): rows', firstAndLast(m.texts().filter((t) => /^\s*\d{1,4}  /.test(t))),
    '| commits +', m.commitCount() - before.commits, 'bytes', m.commitBytes(bytesFrom), 'Row renders +', rowRenders - before.rows);

  // 3. a step inside the overscan: does it commit at all?
  before = mark(); bytesFrom = m.commitCount();
  m.host.userScrollTo(m.root, 'scroller', 5025);
  await settle();
  if (label.startsWith('1 Text per row, initialRect')) console.log('  last commit payload:', JSON.stringify(m.host.commits[m.host.commits.length - 1]?.payload).slice(0, 600));
  console.log('after 5 px step (5025): commits +', m.commitCount() - before.commits, 'bytes', m.commitBytes(bytesFrom), 'hook renders +', v().renders.count - before.renders);

  // 4. scrollToIndex writes through the handle; the emulated native then queues the scroll event
  before = mark(); bytesFrom = m.commitCount();
  const requestsBefore = m.host.scrollRequests.length;
  v().virtualizer.scrollToIndex(700, { align: 'start' });
  console.log('scrollToIndex(700) -> handle.scrollTo requests', m.host.scrollRequests.slice(requestsBefore), '(before the event is delivered)');
  m.root.dispatchEvents();
  await settle();
  console.log('after scrollToIndex(700) delivered: rows', firstAndLast(m.texts().filter((t) => /^\s*\d{1,4}  /.test(t))), 'scrollOffset', v().virtualizer.scrollOffset,
    '| commits +', m.commitCount() - before.commits, 'bytes', m.commitBytes(bytesFrom));

  // 5. align end and the last row, clamped by the container
  v().virtualizer.scrollToIndex(ROWS - 1, { align: 'end' });
  m.root.dispatchEvents();
  await settle();
  console.log('after scrollToIndex(last,end): rows', firstAndLast(m.texts().filter((t) => /^\s*\d{1,4}  /.test(t))), 'scrollOffset', v().virtualizer.scrollOffset,
    'max', ROWS * ROW_HEIGHT - VIEWPORT_HEIGHT);

  // 5b. behavior: 'smooth' has no equivalent (scrollTo is instant): virtual-core must still land and stop its frame loop
  v().source.scrollToCalls.length = 0;
  v().virtualizer.scrollToIndex(300, { align: 'start', behavior: 'smooth' });
  m.root.dispatchEvents();
  await settle(10);
  console.log('scrollToIndex(300, smooth): handle writes', JSON.stringify(v().source.scrollToCalls), '-> scrollOffset', v().virtualizer.scrollOffset, '(target 6000)');

  // 6. a burst: five moves before JS runs coalesce to one event (native does that)
  before = mark();
  const queuedBefore = m.host.scrollEventsQueued; const deliveredBefore = m.host.scrollEventsDelivered;
  for (const top of [100, 200, 300, 400, 500]) m.host.moveTo(m.host.tagOf('scroller'), top);
  m.root.dispatchEvents();
  await settle();
  console.log('burst of 5 moves: queued', m.host.scrollEventsQueued - queuedBefore, 'delivered', m.host.scrollEventsDelivered - deliveredBefore,
    'final rows', firstAndLast(m.texts().filter((t) => /^\s*\d{1,4}  /.test(t))), 'scrollOffset', v().virtualizer.scrollOffset);

  // 7. isScrolling resets on the timer
  await new Promise((resolve) => setTimeout(resolve, 250));
  console.log('isScrolling after 250 ms idle:', v().virtualizer.isScrolling);

  // 8. the container grows from 400 to 800 px (a window resize, a split moved). Native fires no scroll event for that:
  //    settle_scroll (native/scroll_input.rs) queues one only when the re-clamp moved the offset.
  if (label.startsWith('1 Text per row, initialRect')) {
    m.host.defineContainer('scroller', { clientWidth: VIEWPORT_WIDTH, clientHeight: 800, contentHeight: () => v().totalSize });
    await settle();
    const rowsAfterResize = firstAndLast(m.texts().filter((t) => /^\s*\d{1,4}  /.test(t)));
    console.log('after the container grew to 800 px with no scroll event: rows', rowsAfterResize, '(expect 41 visible + overscan if it had been told)');
    m.host.userScrollTo(m.root, 'scroller', 520);
    await settle();
    console.log('after the next scroll event (it carries clientHeight 800): rows', firstAndLast(m.texts().filter((t) => /^\s*\d{1,4}  /.test(t))));
  }

  m.unmount();
  await settle();
  console.log('errors at the end', m.errors.map((e) => e.message));
  void rowTexts;
}

async function main(): Promise<void> {
  await scenario('1 Text per row, initialRect given', { initialRect: true, tokensPerRow: 1 });
  await scenario('1 Text per row, NO initialRect (size comes from getScrollState at ref time)', { initialRect: false, tokensPerRow: 1 });
  await scenario('6 Texts per row (a coloured line), initialRect given', { initialRect: true, tokensPerRow: 6 });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
