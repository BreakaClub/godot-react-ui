import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createElement as h, createContext, createRef, Suspense,
  useContext, useEffect, useState, type ReactNode,
} from 'react';
import { Button, Portal, Text, View, compileStyle, createRoot, type UIHandle } from '../src';
import type { NativeHost } from '../src/native';
import { createTestRoot, NO_SUBSCRIPTION, RecordingHost } from './recording-host';

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for React scheduler');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('real React hooks, context, refs and effects survive events, then clean up on unmount', async () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const title = createContext('default');
  const buttonRef = createRef<UIHandle>();
  const effects: string[] = [];

  function Counter() {
    const [count, setCount] = useState(0);
    const prefix = useContext(title);
    useEffect(() => {
      effects.push(`mount:${count}`);
      return () => { effects.push(`cleanup:${count}`); };
    }, [count]);
    return h(Button, {
      ref: buttonRef, testID: 'counter', onClick: () => setCount((value) => value + 1),
      className: 'text-white text-lg',
    }, `${prefix}: ${count}`);
  }

  root.render(h(title.Provider, { value: 'Count' }, h(Counter)));
  await waitFor(() => effects.includes('mount:0'));
  const button = root.findByTestID('counter');
  assert.ok(button);
  assert.equal(buttonRef.current?.id, button.id);
  assert.deepEqual(buttonRef.current?.getRect(), button.rect);
  assert.ok([...host.nodes.values()].some((entry) => entry.text === 'Count: 0'));
  const text = [...host.nodes.values()].find((entry) => entry.text === 'Count: 0');
  assert.ok(text);
  // The label inherits the button's colour natively, so the colour travels once, on the button.
  assert.equal(text.parent, button.id);
  assert.deepEqual(root.findByTestID('counter')?.props.style, compileStyle('text-white text-lg'));
  host.event(button.id, 'click');
  root.dispatchEvents();
  await waitFor(() => [...host.nodes.values()].some((entry) => entry.text === 'Count: 1'));
  await waitFor(() => effects.includes('mount:1'));
  assert.deepEqual(effects.slice(0, 3), ['mount:0', 'cleanup:0', 'mount:1']);
  root.unmount();
  assert.equal(buttonRef.current, null);
  assert.equal(host.nodes.size, 1);
  assert.ok(effects.includes('cleanup:1'));
  root.unmount();
  assert.throws(() => root.render(h(Text, null, 'invalid')), /unmounted/);
});

test('keyed reorder moves existing native IDs and replaces children in order', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  function list(ids: string[]) {
    return h(View, { testID: 'list' }, ids.map((id) => h(Text, { key: id, testID: id }, id)));
  }
  root.render(list(['a', 'b', 'c']));
  const a = root.findByTestID('a');
  const b = root.findByTestID('b');
  const c = root.findByTestID('c');
  assert.ok(a && b && c);
  root.render(list(['c', 'a', 'b']));
  assert.deepEqual(root.findByTestID('list')?.children, [c.id, a.id, b.id]);
  assert.equal(host.commits.at(-1)?.payload.created.length, 0);
  root.render(list(['b']));
  assert.deepEqual(root.findByTestID('list')?.children, [b.id]);
  assert.ok(!host.nodes.has(a.id) && !host.nodes.has(c.id));
  root.unmount();
  assert.equal(host.nodes.size, 1);
});

test('interpolated button labels become a single shaped text leaf', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  root.render(h(Button, { testID: 'label' }, 'Add ', 5));
  const button = root.findByTestID('label');
  assert.ok(button);
  assert.equal(button.children.length, 1);
  assert.equal(host.nodes.get(button.children[0] ?? -1)?.text, 'Add 5');
  root.unmount();
});

test('speculative suspended trees allocate no native nodes before commit', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const never = new Promise<void>(() => {});
  function Suspend(): ReactNode { throw never; }
  root.render(h(Suspense, { fallback: h(Text, { testID: 'fallback' }, 'Loading') },
    h(View, { testID: 'abandoned' }, h(Text, null, 'Must not allocate')),
    h(Suspend)));
  assert.ok(root.findByTestID('fallback'));
  assert.equal(root.findByTestID('abandoned'), undefined);
  assert.equal(host.nodes.size, 2);
  assert.equal(host.commits.flatMap((commit) => commit.payload.created).length, 1);
  root.unmount();
});

test('bubbling, stopPropagation, disabled controls and pseudo styles use real host instances', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const received: string[] = [];
  root.render(h(View, { onClick: () => received.push('parent'), className: 'text-white' },
    h(Button, {
      testID: 'button', className: 'bg-slate-800 hover:bg-slate-700',
      onClick(event) {
        received.push(`button:${event.target.id}:${event.currentTarget.id}`);
        event.stopPropagation();
        assert.equal(event.isPropagationStopped(), true);
      },
    }, 'Click')));
  const button = root.findByTestID('button');
  assert.ok(button);
  const child = button.children[0];
  assert.ok(child !== undefined);
  // Hover is native state: it reaches JS as an event but changes no native prop, so nothing is
  // committed and no style is recomputed in JavaScript.
  const commitsBeforeHover = host.commits.length;
  host.event(child, 'pointerenter');
  root.dispatchEvents();
  assert.equal(host.commits.length, commitsBeforeHover);
  host.event(child, 'click');
  root.dispatchEvents();
  assert.deepEqual(received, [`button:${child}:${button.id}`]);
  root.render(h(Button, { testID: 'disabled', disabled: true, onClick: () => received.push('disabled') }, 'No'));
  const disabled = root.findByTestID('disabled');
  assert.ok(disabled);
  host.event(disabled.id, 'click');
  root.dispatchEvents();
  assert.equal(received.length, 1);
  root.unmount();
});

test('native boundary rejects invalid data and surfaces failed commits', () => {
  const malformed: NativeHost = {
    commit: () => '', takeCommitDeletions: () => ({ size: () => 0, get: () => 0 }),
    drainEvents: () => '[]', getSnapshot: () => '{"nodes":[]}',
    getNodeRect: () => 'null', findByTestId: () => -1, resolveEvent: () => '',
    setPointerCapture: () => '', releasePointerCapture: () => '', hasPointerCapture: () => false,
    focusNode: () => '', blurNode: () => '',
  };
  assert.throws(() => createRoot(malformed, { subscribeToEvents: NO_SUBSCRIPTION }), /Invalid native/);
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  root.render(h(Text, { testID: 'text' }, 'Good'));
  host.rejectNextCommit = true;
  assert.throws(() => root.render(h(Text, { testID: 'text' }, 'Rejected')), /deliberate transport failure/);
  assert.equal(root.findByTestID('text')?.text, 'Good', 'A rejected commit preserves the native tree');
  root.render(h(Text, {testID: 'text'}, 'Recovered'));
  assert.equal(root.findByTestID('text')?.text, 'Recovered', 'React can commit after the surfaced rejection');
  root.unmount();
});

test('profiling observes real commits, drains samples, and is inert when disabled', () => {
  const host = new RecordingHost();
  let clockCalls = 0;
  const root = createRoot(host, {subscribeToEvents: NO_SUBSCRIPTION, now: () => ++clockCalls});
  root.render(h(Text, {testID: 'profiled'}, 'Before'));
  assert.equal(clockCalls, 0, 'Disabled instrumentation must not read its clock');
  root.setProfiling(true);
  const before = host.commits.length;
  root.render(h(Text, {testID: 'profiled'}, 'After'));
  const report = root.takeProfile();
  assert.equal(report.counters.batches, host.commits.length - before);
  const flush = report.samples.find(sample => sample.kind === 'flush');
  assert.ok(flush && flush.kind === 'flush');
  assert.equal(flush.visitedNodes, 1);
  assert.equal(flush.commandCount, 1, 'Only the changed text crosses the boundary');
  assert.ok(flush.jsonChars > 0 && flush.jsonEncodeMs > 0 && flush.nativeCallMs > 0);
  assert.ok(report.samples.some(sample => sample.kind === 'reconcile'));
  assert.equal(root.takeProfile().samples.length, 0, 'Samples are drained without retaining old trees');
  root.setProfiling(false);
  const previousClockCalls = clockCalls;
  root.render(h(Text, null, 'Unprofiled'));
  assert.equal(clockCalls, previousClockCalls);
  root.unmount();
});

// ---- Phase F3: the persistent renderer ----

test('render makes no native call: an abandoned render costs nothing across the boundary', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const marks = host.calls.length;
  const never = new Promise<void>(() => {});
  function Suspend(): ReactNode { throw never; }
  // The suspended tree creates instances during render that are never committed.
  root.render(h(Suspense, { fallback: h(Text, null, 'Loading') }, h(View, null, h(Text, null, 'x')), h(Suspend)));
  assert.deepEqual(host.callsSince(marks), ['commit', 'takeCommitDeletions'],
    'only the single commit of the fallback (and its deletion query) crossed');
  assert.equal(host.commits.length, 1);
  root.unmount();
});

test('a re-render that changes nothing native, or only a handler, makes no native call', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const tree = (onClick: () => void) => h(View, { testID: 'box', className: 'p-2' },
    h(Button, { testID: 'go', onClick }, 'Go'));
  root.render(tree(() => {}));
  const marks = host.calls.length;
  root.render(tree(() => {}));
  assert.deepEqual(host.callsSince(marks), [], 'new handlers are JavaScript-only');
  root.unmount();
});

test('hover is native state: a pointer enter or leave makes no commit and no style call', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'card', className: 'bg-white hover:bg-slate-100' }));
  const card = root.findByTestID('card');
  assert.ok(card);
  const marks = host.calls.length;
  host.event(card.id, 'pointerenter');
  host.event(card.id, 'pointerleave');
  root.dispatchEvents();
  assert.deepEqual([...new Set(host.callsSince(marks))], ['drainEvents'], 'events were drained and nothing else crossed');
  root.unmount();
});

test('public handles are stable across clones and report the committed testID', async () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const ref = createRef<UIHandle>();
  const list = (title: string) => h(View, null, h(Text, { ref, testID: title }, title));
  root.render(list('first'));
  const handle = ref.current;
  assert.ok(handle);
  assert.equal(handle.testID, 'first');
  root.render(list('second'));
  assert.equal(ref.current, handle, 'the same handle for the same node');
  assert.equal(handle.testID, 'second', 'it reads the latest committed props');
  assert.deepEqual(handle.getRect(), root.findByTestID('second')?.rect);
  root.render(h(View));
  assert.equal(ref.current, null);
  assert.equal(handle.getRect(), undefined, 'a deleted node has no rectangle');
  root.unmount();
  assert.equal(host.nodes.size, 1);
});

test('deleted tags leave the committed map: events for them are dropped, not dispatched', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  root.render(h(View, null, h(Button, { testID: 'doomed', onClick: () => log.push('doomed') }, 'x')));
  const doomed = root.findByTestID('doomed');
  assert.ok(doomed);
  const queued = host.pointerEvent(doomed.id, 'click');
  root.render(h(View));
  host.events.push(queued);
  root.dispatchEvents();
  assert.deepEqual(log, [], 'native queued the click before JS removed the node');
  root.unmount();
});

test('raw strings must be rendered inside <Text>', () => {
  const host = new RecordingHost();
  const reported: Error[] = [];
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION, onError: (error) => reported.push(error) });
  assert.throws(() => root.render(h(View, null, 'raw')), /Text strings must be rendered within a <Text>/);
  root.unmount();
});

test('Portal commits to the overlay layer and unmounts with its owner', () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  const tree = (open: boolean) => h(View, { testID: 'main' },
    h(Text, null, 'page'),
    open && h(Portal, null, h(View, { testID: 'popover' }, h(Text, null, 'menu'))));
  root.render(tree(false));
  assert.equal(host.commits.every((commit) => commit.layer === 0), true);
  root.render(tree(true));
  const overlayCommit = host.commits.at(-1);
  assert.equal(overlayCommit?.layer, 1, 'the portal content is a commit of its own layer');
  const popover = root.findByTestID('popover');
  assert.ok(popover);
  assert.equal(popover.layer, 1);
  assert.equal(root.findByTestID('main')?.layer, 0);
  assert.deepEqual(host.layerRoots[1], [popover.id]);
  root.render(tree(false));
  assert.equal(root.findByTestID('popover'), undefined, 'closing the portal deletes its nodes');
  assert.deepEqual(host.layerRoots[1], []);
  root.render(tree(true));
  root.unmount();
  assert.equal(host.nodes.size, 1);
  assert.deepEqual(host.layerRoots, [[], []]);
});

test('hiding a subtree for Suspense is a prop, and showing it again resets the prop', async () => {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  let release: () => void = () => {};
  let ready = true;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  function Gate(): ReactNode {
    if (!ready) throw gate;
    return h(Text, { testID: 'content' }, 'content');
  }
  const tree = () => h(Suspense, { fallback: h(Text, { testID: 'fallback' }, 'wait') }, h(View, { testID: 'wrapper' }, h(Gate)));
  root.render(tree());
  assert.ok(root.findByTestID('wrapper'));
  ready = false;
  root.render(tree());
  assert.equal(root.findByTestID('wrapper')?.props.hidden, true, 'the existing content is hidden, not deleted');
  assert.ok(root.findByTestID('fallback'));
  ready = true;
  release();
  await waitFor(() => root.findByTestID('wrapper')?.props.hidden === undefined);
  assert.equal(root.findByTestID('fallback'), undefined);
  root.unmount();
});
