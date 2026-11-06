import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h, type ReactNode } from 'react';
import { Text, View, useTextSelection, type UISelection, type UISelectionChangeEvent } from '../src';
import { readSelection } from '../src/native';
import { createTestRoot, RecordingHost } from './recording-host';

function requireNode(root: ReturnType<typeof createTestRoot>['root'], testID: string): number {
  const found = root.findByTestID(testID);
  assert.ok(found, `missing ${testID}`);
  return found.id;
}

function article() {
  return h(View, { className: 'select-text' },
    h(Text, { testID: 'first' }, 'The quick brown fox'),
    h(Text, { testID: 'second' }, 'jumps over the lazy dog'));
}

test('getSelection is undefined with nothing selected and has handles and UTF-16 offsets when something is', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(article());
  assert.equal(root.getSelection(), undefined);

  const first = requireNode(root, 'first');
  const second = requireNode(root, 'second');
  host.selection = {
    anchor: { tag: first, offset: 4 }, focus: { tag: second, offset: 5 }, isCollapsed: false,
    text: 'quick brown fox\njumps',
  };
  const selection = root.getSelection();
  assert.ok(selection);
  assert.equal(selection.anchor.node.testID, 'first');
  assert.equal(selection.anchor.offset, 4);
  assert.equal(selection.focus.node.testID, 'second');
  assert.equal(selection.focus.offset, 5);
  assert.equal(selection.isCollapsed, false);
  assert.equal(selection.text, 'quick brown fox\njumps');
  assert.equal(selection.anchor.node, root.getSelection()?.anchor.node, 'the handle is the element\'s stable one');
  root.unmount();
});

test('clearSelection asks native to clear it', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(article());
  const first = requireNode(root, 'first');
  host.selection = { anchor: { tag: first, offset: 0 }, focus: { tag: first, offset: 3 }, isCollapsed: false, text: 'The' };
  root.clearSelection();
  assert.ok(host.calls.includes('clearSelection'));
  assert.equal(root.getSelection(), undefined);
  root.unmount();
});

test('selectionchange reaches the root listeners, is addressed to the root and does not bubble to elements', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const seen: UISelectionChangeEvent[] = [];
  root.addEventListener('selectionchange', (event) => seen.push(event));
  root.render(article());
  host.event(0, 'selectionchange');
  root.dispatchEvents();
  assert.equal(seen.length, 1);
  const [event] = seen;
  assert.ok(event);
  assert.equal(event.type, 'selectionchange');
  assert.equal(event.target.id, 0, 'it is the root\'s event');
  assert.equal(event.bubbles, false);
  assert.equal(event.cancelable, false);
  root.unmount();
});

/** A component that records every selection it rendered with. */
function selectionProbe(seen: Array<UISelection | undefined>): () => ReactNode {
  return function SelectionProbe(): ReactNode {
    seen.push(useTextSelection());
    return h(View, { testID: 'probe' });
  };
}

test('useTextSelection follows selectionchange, and is the same object until the next change', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const seen: Array<UISelection | undefined> = [];
  root.render(h(View, null, article(), h(selectionProbe(seen))));
  assert.equal(seen.at(-1), undefined, 'nothing is selected at first');

  const renders = seen.length;
  root.dispatchEvents();
  assert.equal(seen.length, renders, 'a frame with no selection change renders nothing');

  const first = requireNode(root, 'first');
  host.selection = { anchor: { tag: first, offset: 4 }, focus: { tag: first, offset: 9 }, isCollapsed: false, text: 'quick' };
  host.event(0, 'selectionchange');
  root.dispatchEvents();
  const selected = seen.at(-1);
  assert.ok(selected);
  assert.equal(selected.text, 'quick');
  assert.equal(selected.anchor.node.testID, 'first');
  assert.equal(seen.length, renders + 1, 'one render for the change');

  root.render(h(View, null, article(), h(selectionProbe(seen))));
  assert.equal(seen.at(-1), selected, 'rendering again without a change reads the same object');

  host.selection = undefined;
  host.event(0, 'selectionchange');
  root.dispatchEvents();
  assert.equal(seen.at(-1), undefined, 'a cleared selection is undefined again');
  root.unmount();
});

test('the selection is read from native once per change, not once per render', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const seen: Array<UISelection | undefined> = [];
  const Probe = selectionProbe(seen);
  root.render(h(View, null, h(Probe), h(Probe)));
  const reads = () => host.calls.filter((call) => call === 'getSelection').length;
  assert.equal(reads(), 1, 'two readers share one read');
  host.event(0, 'selectionchange');
  root.dispatchEvents();
  assert.equal(reads(), 2, 'a change is read once for both');
  root.unmount();
});

test('readSelection rejects a malformed answer instead of passing it on', () => {
  const host = new RecordingHost();
  host.getSelection = () => JSON.stringify({ anchor: { tag: 1, offset: -1 }, focus: { tag: 1, offset: 0 }, isCollapsed: true, text: '' });
  assert.throws(() => readSelection(host), /expected a nonnegative integer/);
  host.getSelection = () => JSON.stringify({ anchor: { tag: 1, offset: 0 }, focus: { tag: 1, offset: 0 }, isCollapsed: 'yes', text: '' });
  assert.throws(() => readSelection(host), /expected a boolean/);
  host.getSelection = () => 'null';
  assert.equal(readSelection(host), undefined);
});
