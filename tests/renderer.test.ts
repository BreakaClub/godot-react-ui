import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createElement as h, createContext, createRef, Suspense,
  useContext, useEffect, useState, type ReactNode,
} from 'react';
import { Button, Text, View, createRoot, type UIHandle } from '../src';
import type { NativeHost } from '../src/native';
import { NO_SUBSCRIPTION, RecordingHost } from './recording-host';

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
  assert.equal(text.style.color, '#ffffff');
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
  assert.equal(host.batches.at(-1)?.filter((entry) => entry.op === 'create').length, 0);
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
  assert.equal(host.batches.flat().filter((entry) => entry.op === 'create').length, 1);
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
  host.event(child, 'pointerenter');
  root.dispatchEvents();
  assert.equal(root.findByTestID('button')?.style.backgroundColor, '#334155');
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

test('native boundary rejects invalid data and surfaces failed batches', () => {
  const malformed: NativeHost = {
    applyBatch: () => '', drainEvents: () => '[]', getSnapshot: () => '{"nodes":[]}',
    resolveEvent: () => '',
  };
  assert.throws(() => createRoot(malformed, { subscribeToEvents: NO_SUBSCRIPTION }), /Invalid native/);
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION });
  root.render(h(Text, { testID: 'text' }, 'Good'));
  host.rejectNextBatch = true;
  assert.throws(() => root.render(h(Text, { testID: 'text' }, 'Rejected')), /deliberate transport failure/);
  assert.equal(root.findByTestID('text')?.text, 'Good', 'Rejected batch preserves the native tree');
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
  const before = host.batches.length;
  root.render(h(Text, {testID: 'profiled'}, 'After'));
  const report = root.takeProfile();
  assert.equal(report.counters.batches, host.batches.length - before);
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
