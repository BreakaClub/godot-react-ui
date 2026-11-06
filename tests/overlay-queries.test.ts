import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h, createRef, type ReactNode, type RefObject } from 'react';
import { Portal, View, useRootSize, type RootSize, type UIHandle } from '../src';
import { RecordingHost, createTestRoot } from './recording-host';

// ---------------------------------------------------------------------------------------------------
// Document order (UIHandle.compareDocumentOrder)
// ---------------------------------------------------------------------------------------------------

function refs<K extends string>(...names: readonly K[]): Record<K, RefObject<UIHandle | null>> {
  return Object.fromEntries(names.map((name) => [name, createRef<UIHandle>()])) as Record<K, RefObject<UIHandle | null>>;
}

function handleOf(ref: RefObject<UIHandle | null>): UIHandle {
  assert.ok(ref.current, 'the element has no handle: it is not mounted');
  return ref.current;
}

/** `handles` sorted with `compareDocumentOrder`, as the names they were given. */
function order(handles: Record<string, RefObject<UIHandle | null>>): string {
  return Object.entries(handles)
    .map(([name, ref]) => ({ name, handle: handleOf(ref) }))
    .sort((left, right) => left.handle.compareDocumentOrder(right.handle))
    .map((entry) => entry.name)
    .join(',');
}

test('document order is the pre-order of the tree: a parent before its children, siblings in order', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const r = refs('a', 'b', 'c', 'd');
  root.render(h(View, { ref: r.a },
    h(View, { ref: r.b }, h(View, { ref: r.c })),
    h(View, { ref: r.d })));
  // Registration order is the reverse of the document's, to prove the comparison is not index luck.
  assert.equal(order({ d: r.d, c: r.c, b: r.b, a: r.a }), 'a,b,c,d');
  assert.ok(handleOf(r.a).compareDocumentOrder(handleOf(r.c)) < 0, 'a parent comes before its descendant');
  assert.ok(handleOf(r.c).compareDocumentOrder(handleOf(r.d)) < 0, 'a descendant of an earlier sibling comes before the later sibling');
  assert.ok(handleOf(r.d).compareDocumentOrder(handleOf(r.b)) > 0);
  assert.equal(handleOf(r.b).compareDocumentOrder(handleOf(r.b)), 0, 'an element is at the same place as itself');
  root.unmount();
});

test('the overlay layer comes after the whole main layer, wherever its portal sits in the React tree', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const r = refs('first', 'popover', 'inner', 'last');
  root.render(h(View, null,
    h(View, { ref: r.first }, h(Portal, null, h(View, { ref: r.popover }, h(View, { ref: r.inner })))),
    h(View, { ref: r.last })));
  assert.equal(order({ popover: r.popover, last: r.last, inner: r.inner, first: r.first }), 'first,last,popover,inner',
    'the portal content follows `last`, though its React parent `first` comes before it');
  root.unmount();
});

test('a keyed reorder and an insertion in the middle change the order, and the next query sees them', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const r = refs('a', 'b', 'c', 'x');
  const list = (keys: readonly string[]): ReactNode => h(View, null,
    keys.map((key) => h(View, { key, ref: key in r ? r[key as keyof typeof r] : undefined })));
  root.render(list(['a', 'b', 'c']));
  assert.equal(order({ c: r.c, b: r.b, a: r.a }), 'a,b,c');
  // The first query built the answer; the commit below must discard it.
  root.render(list(['c', 'a', 'b']));
  assert.equal(order({ a: r.a, b: r.b, c: r.c }), 'c,a,b', 'a reorder is seen');
  root.render(list(['c', 'x', 'a', 'b']));
  assert.equal(order({ a: r.a, b: r.b, c: r.c, x: r.x }), 'c,x,a,b', 'an element inserted in the middle is seen in the middle');
  root.unmount();
});

test('a handler-only commit keeps the answer and a structural one does not', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const r = refs('a', 'b');
  const tree = (onClick: () => void): ReactNode => h(View, null, h(View, { ref: r.a, onClick }), h(View, { ref: r.b }));
  root.render(tree(() => {}));
  assert.equal(order({ b: r.b, a: r.a }), 'a,b');
  const commits = host.commits.length;
  root.render(tree(() => {}));
  assert.equal(host.commits.length, commits, 'a new handler is not a native commit');
  assert.equal(order({ b: r.b, a: r.a }), 'a,b');
  root.unmount();
});

test('a query reads the committed tree and makes no native call', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const r = refs('a', 'b');
  root.render(h(View, null, h(View, { ref: r.a }), h(View, { ref: r.b })));
  const mark = host.calls.length;
  handleOf(r.a).compareDocumentOrder(handleOf(r.b));
  assert.deepEqual(host.callsSince(mark), []);
  root.unmount();
});

test('comparing with an element that is gone, the root, or another root throws', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const r = refs('a', 'b');
  const tree = (withB: boolean): ReactNode => h(View, null, h(View, { ref: r.a }), withB && h(View, { ref: r.b }));
  root.render(tree(true));
  const a = handleOf(r.a);
  const b = handleOf(r.b);
  root.render(tree(false));
  assert.throws(() => a.compareDocumentOrder(b), /element \d+ is not mounted in this root/, 'the other element is gone');
  assert.throws(() => b.compareDocumentOrder(a), /not mounted/, 'this element is gone');

  const rootHandles: UIHandle[] = [];
  root.addEventListener('click', (event) => { rootHandles.push(event.currentTarget); });
  host.event(0, 'click');
  root.dispatchEvents();
  const rootHandle = rootHandles[0];
  assert.ok(rootHandle);
  assert.throws(() => rootHandle.compareDocumentOrder(a), /the root is not an element/);
  assert.throws(() => a.compareDocumentOrder(rootHandle), /not mounted/, 'the root has no place in the order');

  const otherHost = new RecordingHost();
  const other = createTestRoot(otherHost);
  const o = refs('a');
  other.root.render(h(View, { ref: o.a }));
  // Tags count from 1 in every root, so the two elements share an id: only identity tells them apart.
  assert.equal(handleOf(o.a).id, a.id);
  assert.throws(() => a.compareDocumentOrder(handleOf(o.a)), /not mounted in this root/);
  other.root.unmount();
  root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// Root size (useRootSize)
// ---------------------------------------------------------------------------------------------------

/** A component that records every size it rendered with. */
function sizeProbe(seen: RootSize[]): () => ReactNode {
  return function SizeProbe(): ReactNode {
    seen.push(useRootSize());
    return h(View, { testID: 'probe' });
  };
}

test('a root nobody asks the size of never reads it', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'plain' }));
  host.event(0, 'click');
  root.dispatchEvents();
  assert.ok(!host.calls.includes('getSize'), 'no component used useRootSize, so native was never asked');
  root.unmount();
});

test('useRootSize gives the size native reports and renders again only when it changes', () => {
  const host = new RecordingHost();
  host.resize(800, 600);
  const { root } = createTestRoot(host);
  const seen: RootSize[] = [];
  root.render(h(sizeProbe(seen)));
  assert.deepEqual(seen.at(-1), { width: 800, height: 600 }, 'the first render sees the size');

  const renders = seen.length;
  root.dispatchEvents();
  root.dispatchEvents();
  assert.equal(seen.length, renders, 'a frame in which the size did not change renders nothing');

  host.resize(1000, 500);
  const mark = host.calls.length;
  root.dispatchEvents();
  assert.deepEqual(seen.at(-1), { width: 1000, height: 500 }, 'the next dispatch brings the new size');
  assert.equal(seen.length, renders + 1, 'and renders once');
  assert.equal(host.callsSince(mark).filter((call) => call === 'getSize').length, 1, 'one read per dispatch while something watches');
  const after = seen.at(-1);
  root.dispatchEvents();
  assert.equal(seen.at(-1), after, 'the size is the same object until it changes');
  root.unmount();
});

test('every component that uses the size follows it, and a removed one stops being told', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const first: RootSize[] = [];
  const second: RootSize[] = [];
  const First = sizeProbe(first);
  const Second = sizeProbe(second);
  root.render(h(View, null, h(First), h(Second)));
  host.resize(300, 200);
  root.dispatchEvents();
  assert.deepEqual(first.at(-1), { width: 300, height: 200 });
  assert.deepEqual(second.at(-1), { width: 300, height: 200 });

  root.render(h(View, null, h(First)));
  const secondRenders = second.length;
  host.resize(400, 250);
  root.dispatchEvents();
  assert.deepEqual(first.at(-1), { width: 400, height: 250 });
  assert.equal(second.length, secondRenders, 'an unmounted component is not rendered again');

  root.render(h(View, null));
  const mark = host.calls.length;
  host.resize(500, 300);
  root.dispatchEvents();
  assert.ok(!host.callsSince(mark).includes('getSize'), 'with nothing watching, dispatch reads nothing');
  root.unmount();
});

test('a size read while nothing watches is current, not the last one seen', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const seen: RootSize[] = [];
  const Probe = sizeProbe(seen);
  root.render(h(View, null, h(Probe)));
  root.render(h(View, null));
  host.resize(640, 480);
  const late: RootSize[] = [];
  root.render(h(View, null, h(sizeProbe(late))));
  assert.deepEqual(late[0], { width: 640, height: 480 }, 'the first render of a popover opened between two frames already has the size of now');
  root.unmount();
});

test('a size native cannot mean is an error', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host, { onError: () => {} });
  host.resize(Number.NaN, 100);
  assert.throws(() => root.render(h(sizeProbe([]))), /not a finite, non-negative size/);
  root.unmount();
});
