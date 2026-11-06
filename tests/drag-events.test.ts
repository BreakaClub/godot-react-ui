import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h } from 'react';
import { View, type UIDragEndEvent, type UIDragEvent } from '../src';
import { DragSessions } from '../src/drag';
import type { NativeDragEvent } from '../src/native';
import { createTestRoot, RecordingHost } from './recording-host';

const SESSION = 7;

function requireNode(root: ReturnType<typeof createTestRoot>['root'], testID: string): number {
  const found = root.findByTestID(testID);
  assert.ok(found, `missing ${testID}`);
  return found.id;
}

/** Native's `dragover` wire for a session; the fake host numbers it and marks it cancelable. */
function resolutionOf(host: RecordingHost, seq: number): { defaultPrevented: boolean; dropEffect: string } {
  const found = host.resolutions.find((entry) => entry.seq === seq);
  assert.ok(found, `event ${seq} was resolved`);
  return { defaultPrevented: found.defaultPrevented, dropEffect: found.dropEffect };
}

test('a drag runs its events through a DataTransfer store: dragstart writes, dragover is protected, drop reads', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  root.render(h(View, null,
    h(View, {
      testID: 'source', draggable: true,
      onDragStart(event: UIDragEvent<'dragstart'>) {
        event.dataTransfer.setData('text/plain', 'card-3');
        event.dataTransfer.effectAllowed = 'move';
        log.push(`start:${event.dataTransfer.effectAllowed}:${event.dataTransfer.dropEffect}`);
      },
      onDrag(event: UIDragEvent<'drag'>) { log.push(`drag:${event.dataTransfer.getData('text/plain') === ''}`); },
      onDragEnd(event: UIDragEndEvent) {
        log.push(`end:${event.dropEffect}:${event.endedOutsideRoot}:${event.dataTransfer.dropEffect}`);
      },
    }),
    h(View, {
      testID: 'target',
      onDragEnter(event: UIDragEvent<'dragenter'>) { log.push(`enter:${event.relatedTarget?.testID ?? 'none'}`); },
      onDragOver(event: UIDragEvent<'dragover'>) {
        log.push(`over:${event.dataTransfer.types.join()}:${event.dataTransfer.getData('text/plain') === ''}:${event.dataTransfer.dropEffect}`);
        event.preventDefault();
      },
      onDrop(event: UIDragEvent<'drop'>) {
        log.push(`drop:${event.dataTransfer.getData('text/plain')}:${event.dataTransfer.dropEffect}`);
        event.preventDefault();
      },
    })));
  const source = requireNode(root, 'source');
  const target = requireNode(root, 'target');
  const start = host.dragEvent(source, 'dragstart', SESSION);
  const enter = host.dragEvent(target, 'dragenter', SESSION, { relatedTarget: source });
  const over = host.dragEvent(target, 'dragover', SESSION);
  const drop = host.dragEvent(target, 'drop', SESSION);
  host.events.push(
    start, host.dragEvent(source, 'drag', SESSION), enter, over, drop,
    host.dragEvent(source, 'dragend', SESSION, { dropEffect: 'move' }),
  );
  root.dispatchEvents();
  assert.deepEqual(log, [
    'start:move:none',
    'drag:true',
    'enter:source',
    'over:text/plain:true:move',
    'drop:card-3:move',
    'end:move:false:move',
  ]);
  assert.deepEqual(resolutionOf(host, start.seq), { defaultPrevented: false, dropEffect: '' });
  assert.deepEqual(resolutionOf(host, over.seq), { defaultPrevented: true, dropEffect: 'move' },
    'a prevented dragover reports the effect its source permits');
  assert.deepEqual(resolutionOf(host, drop.seq), { defaultPrevented: true, dropEffect: 'move' });
  root.unmount();
});

test('dragover negotiates: an effect the source does not allow, or no prevention, refuses the drop', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, null,
    h(View, {
      testID: 'source', draggable: true,
      onDragStart(event: UIDragEvent<'dragstart'>) { event.dataTransfer.effectAllowed = 'copy'; },
    }),
    h(View, {
      testID: 'wants-move',
      onDragOver(event: UIDragEvent<'dragover'>) { event.dataTransfer.dropEffect = 'move'; event.preventDefault(); },
    }),
    h(View, {
      testID: 'wants-copy',
      onDragOver(event: UIDragEvent<'dragover'>) { event.dataTransfer.dropEffect = 'copy'; event.preventDefault(); },
    }),
    h(View, { testID: 'ignores' })));
  host.events.push(host.dragEvent(requireNode(root, 'source'), 'dragstart', SESSION));
  const move = host.dragEvent(requireNode(root, 'wants-move'), 'dragover', SESSION);
  const copy = host.dragEvent(requireNode(root, 'wants-copy'), 'dragover', SESSION);
  const ignored = host.dragEvent(requireNode(root, 'ignores'), 'dragover', SESSION);
  host.events.push(move, copy, ignored);
  root.dispatchEvents();
  assert.deepEqual(resolutionOf(host, move.seq), { defaultPrevented: true, dropEffect: 'none' },
    'the source allows only copy, so a move is refused');
  assert.deepEqual(resolutionOf(host, copy.seq), { defaultPrevented: true, dropEffect: 'copy' });
  assert.deepEqual(resolutionOf(host, ignored.seq), { defaultPrevented: false, dropEffect: 'none' },
    'an element that does not prevent dragover is not a target');
  root.unmount();
});

test('preventing dragstart stops the drag and forgets its store', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const errors: string[] = [];
  root.render(h(View, {
    testID: 'source', draggable: true, onDragStart(event: UIDragEvent<'dragstart'>) { event.preventDefault(); },
  }));
  const source = requireNode(root, 'source');
  const start = host.dragEvent(source, 'dragstart', SESSION);
  host.events.push(start);
  root.dispatchEvents();
  assert.deepEqual(resolutionOf(host, start.seq), { defaultPrevented: true, dropEffect: '' });
  // Native sends nothing else for a refused drag; one that did would find no store.
  host.events.push(host.dragEvent(source, 'drag', SESSION));
  try {
    root.dispatchEvents();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  assert.deepEqual(errors, [`UI internal error: drag for drag ${SESSION}, which has no data store`]);
  root.unmount();
});

test('dragend ends the store: a transfer a handler kept is empty and inert afterwards', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const kept: UIDragEvent[] = [];
  root.render(h(View, {
    testID: 'source', draggable: true,
    onDragStart(event: UIDragEvent<'dragstart'>) {
      event.dataTransfer.setData('text', 'hello');
      kept.push(event);
    },
  }));
  const source = requireNode(root, 'source');
  host.events.push(host.dragEvent(source, 'dragstart', SESSION), host.dragEvent(source, 'dragend', SESSION));
  root.dispatchEvents();
  const transfer = kept[0]?.dataTransfer;
  assert.ok(transfer);
  assert.deepEqual([...transfer.types], []);
  assert.equal(transfer.effectAllowed, 'none');
  transfer.setData('text', 'late');
  assert.deepEqual([...transfer.types], [], 'a finished drag takes no data');
  // The next drag starts from nothing.
  host.events.push(host.dragEvent(source, 'dragstart', SESSION + 1));
  root.dispatchEvents();
  root.unmount();
});

test('dragend reaches root listeners when the dragged element was removed during the drag', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const seen: string[] = [];
  root.addEventListener('dragend', (event) => {
    seen.push(`${event.target.id}:${event.endedOutsideRoot}:${event.dropEffect}:${event.x},${event.y}:${event.viewportX},${event.viewportY}`);
  });
  root.render(h(View, null, h(View, { testID: 'source', draggable: true })));
  const source = requireNode(root, 'source');
  host.events.push(host.dragEvent(source, 'dragstart', SESSION));
  root.dispatchEvents();
  root.render(h(View, null));
  assert.equal(host.nodes.has(source), false, 'the dragged element is gone');
  host.events.push(host.dragEvent(0, 'dragend', SESSION, { endedOutsideRoot: true, x: 1500, y: 40, viewportX: 1550, viewportY: 70 }));
  root.dispatchEvents();
  assert.deepEqual(seen, ['0:true:none:1500,40:1550,70'],
    'the root hears the end, with the release point and where it lies in the viewport');
  root.unmount();
});

test('drag events for an element that is gone are dropped, and an unanswered store goes with the root', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  root.render(h(View, null,
    h(View, { testID: 'source', draggable: true }),
    h(View, { testID: 'target', onDragOver: () => log.push('over') })));
  const source = requireNode(root, 'source');
  const target = requireNode(root, 'target');
  host.events.push(host.dragEvent(source, 'dragstart', SESSION));
  root.dispatchEvents();
  root.render(h(View, null, h(View, { testID: 'source', draggable: true })));
  const over = host.dragEvent(target, 'dragover', SESSION);
  host.events.push(over);
  root.dispatchEvents();
  assert.deepEqual(log, [], 'the removed target heard nothing');
  assert.deepEqual(resolutionOf(host, over.seq), { defaultPrevented: false, dropEffect: '' }, 'native still gets an answer');
  root.unmount();
});

test('a handler that throws still lets dragover answer, and the failure is reported', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, null,
    h(View, { testID: 'source', draggable: true }),
    h(View, {
      testID: 'target',
      onDragOver(event: UIDragEvent<'dragover'>) { event.preventDefault(); throw new Error('boom'); },
    })));
  host.events.push(host.dragEvent(requireNode(root, 'source'), 'dragstart', SESSION));
  const over = host.dragEvent(requireNode(root, 'target'), 'dragover', SESSION);
  host.events.push(over);
  assert.throws(() => root.dispatchEvents(), /boom/);
  assert.deepEqual(resolutionOf(host, over.seq), { defaultPrevented: true, dropEffect: 'copy' },
    'native is answered with the state reached before the throw');
  root.unmount();
});

test('a drag event needs its store: DragSessions refuses one it never saw start', () => {
  const sessions = new DragSessions();
  const native: NativeDragEvent = {
    seq: 1, target: 1, path: [1], cancelable: false, timeStamp: 0, type: 'drag', x: 0, y: 0, viewportX: 0, viewportY: 0,
    pointerId: 1, pointerType: 'mouse', button: -1, buttons: 1, detail: 0, shiftKey: false, ctrlKey: false, altKey: false,
    metaKey: false, relatedTarget: null, sessionId: 3,
  };
  const dispatched = sessions.dispatch(native, [], null, { handle: { id: 0 } as never, listeners: { emit() {} } as never });
  assert.match(dispatched.failure?.message ?? '', /drag 3, which has no data store/);
  assert.equal(sessions.size, 0);
});

test('draggable and dragPreview cross to native as props and change by diff', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'a', draggable: true, dragPreview: 'none' }));
  const tag = requireNode(root, 'a');
  assert.deepEqual(host.nodes.get(tag)?.props, { testID: 'a', draggable: true, dragPreview: 'none' });
  root.render(h(View, { testID: 'a', draggable: true }));
  assert.deepEqual(host.commits.at(-1)?.payload.updated, [{ tag, props: { dragPreview: null } }]);
  root.render(h(View, { testID: 'a' }));
  assert.deepEqual(host.commits.at(-1)?.payload.updated, [{ tag, props: { draggable: null } }]);
  root.unmount();
});
