import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h, useSyncExternalStore } from 'react';
import { Text, createRoot } from '../src';
import { NO_SUBSCRIPTION, RecordingHost } from './recording-host';

// `UIRoot.flushSync`: a state update made outside an event is committed when the call returns, not with the next frame's microtasks.

function mount() {
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION, onError: () => {} });
  let value = 'one';
  const listeners = new Set<() => void>();
  const set = (next: string): void => {
    value = next;
    for (const listener of [...listeners]) listener();
  };
  function Label() {
    const text = useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => value);
    return h(Text, { testID: 'label' }, text);
  }
  root.render(h(Label));
  const read = (): string => host.nodes.get(host.findByTestId('label'))?.text ?? '';
  return { root, set, read };
}

test('an update made inside flushSync is on the page when it returns', () => {
  const { root, set, read } = mount();
  assert.equal(read(), 'one');
  const returned = root.flushSync(() => { set('two'); return 7; });
  assert.equal(read(), 'two');
  assert.equal(returned, 7, 'and the work\'s result is returned');
});

test('the same update made outside it waits', () => {
  const { set, read } = mount();
  set('two');
  assert.equal(read(), 'one', 'the update is scheduled, not committed');
});

test('flushSync on an unmounted root throws', () => {
  const { root } = mount();
  root.unmount();
  assert.throws(() => root.flushSync(() => 1), /unmounted/u);
});
