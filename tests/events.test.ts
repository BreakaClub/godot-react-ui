import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h } from 'react';
import { View, type UIFocusEvent, type UIKeyboardEvent, type UIPointerEvent, type UIWheelEvent } from '../src';
import { EventPhase, exclusiveAncestry } from '../src/events';
import { createTestRoot, RecordingHost } from './recording-host';

const MAX_EVENT_DRAIN_ROUNDS = 64;

function requireNode(root: ReturnType<typeof createTestRoot>['root'], testID: string): number {
  const found = root.findByTestID(testID);
  assert.ok(found, `missing ${testID}`);
  return found.id;
}

/** outer > middle > inner, each logging its capture and bubble handlers with their phase. */
function nested(log: string[], options: { stopInMiddleCapture?: boolean } = {}) {
  const record = (name: string, phase: string) => (event: UIPointerEvent) => {
    log.push(`${name}:${phase}:${event.eventPhase}:${event.currentTarget.testID}`);
    if (options.stopInMiddleCapture && name === 'middle' && phase === 'capture') event.stopPropagation();
  };
  const level = (name: string, children?: ReturnType<typeof h>) => h(View, {
    testID: name, onPointerDownCapture: record(name, 'capture'), onPointerDown: record(name, 'bubble'),
  }, children);
  return level('outer', level('middle', level('inner')));
}

test('capture runs outermost to target, then bubble runs target to outermost, then root listeners', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  root.addEventListener('pointerdown', (event) => {
    log.push(`root:${event.eventPhase}:${event.currentTarget.id}:${event.target.testID}`);
  });
  root.render(nested(log));
  host.event(requireNode(root, 'inner'), 'pointerdown');
  root.dispatchEvents();
  assert.deepEqual(log, [
    `outer:capture:${EventPhase.Capturing}:outer`,
    `middle:capture:${EventPhase.Capturing}:middle`,
    `inner:capture:${EventPhase.AtTarget}:inner`,
    `inner:bubble:${EventPhase.AtTarget}:inner`,
    `middle:bubble:${EventPhase.Bubbling}:middle`,
    `outer:bubble:${EventPhase.Bubbling}:outer`,
    `root:${EventPhase.Bubbling}:0:inner`,
  ]);
  root.unmount();
});

test('stopPropagation in a capture handler stops later capture, all bubble and root listeners', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  let rootCalls = 0;
  root.addEventListener('pointerdown', () => { rootCalls += 1; });
  root.render(nested(log, { stopInMiddleCapture: true }));
  host.event(requireNode(root, 'inner'), 'pointerdown');
  root.dispatchEvents();
  assert.deepEqual(log, [
    `outer:capture:${EventPhase.Capturing}:outer`,
    `middle:capture:${EventPhase.Capturing}:middle`,
  ]);
  assert.equal(rootCalls, 0);
  root.unmount();
});

test('preventDefault is reported for a cancelable event and ignored for a non-cancelable one', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const seen: Array<{ cancelable: boolean; prevented: boolean; isPrevented: boolean }> = [];
  root.render(h(View, {
    testID: 'target',
    onPointerDown(event) {
      event.preventDefault();
      seen.push({ cancelable: event.cancelable, prevented: event.defaultPrevented, isPrevented: event.isDefaultPrevented() });
    },
    onPointerUp(event) {
      event.preventDefault();
      seen.push({ cancelable: event.cancelable, prevented: event.defaultPrevented, isPrevented: event.isDefaultPrevented() });
    },
  }));
  const target = requireNode(root, 'target');
  const down = host.pointerEvent(target, 'pointerdown', { cancelable: true });
  host.events.push(down, host.pointerEvent(target, 'pointerup'));
  root.dispatchEvents();
  assert.deepEqual(seen, [
    { cancelable: true, prevented: true, isPrevented: true },
    { cancelable: false, prevented: false, isPrevented: false },
  ]);
  assert.deepEqual(host.resolutions, [{ seq: down.seq, defaultPrevented: true, dropEffect: '' }],
    'only the cancelable event is resolved');
  root.unmount();
});

test('a cancelable event nobody prevents is resolved as not prevented', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'target' }));
  const down = host.pointerEvent(requireNode(root, 'target'), 'pointerdown', { cancelable: true });
  host.events.push(down);
  root.dispatchEvents();
  assert.deepEqual(host.resolutions, [{ seq: down.seq, defaultPrevented: false, dropEffect: '' }]);
  root.unmount();
});

/** parent > a, b; and a separate sibling `other`. Logs enter/leave per element. */
function hoverTree(log: string[]) {
  const watch = (name: string, extra: Record<string, string> = {}) => ({
    testID: name,
    onPointerEnter: (event: UIPointerEvent) => log.push(`${name}:enter:${event.relatedTarget?.testID ?? 'none'}:${event.target.testID}`),
    onPointerLeave: (event: UIPointerEvent) => log.push(`${name}:leave:${event.relatedTarget?.testID ?? 'none'}:${event.target.testID}`),
    ...extra,
  });
  return h(View, null,
    h(View, watch('parent', { className: 'bg-slate-100 hover:bg-slate-200' }), h(View, watch('a')), h(View, watch('b'))),
    h(View, watch('other')));
}

test('enter and leave reach only the elements the pointer crosses, outermost first on enter', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  root.render(hoverTree(log));
  const [parent, a, b, other] = ['parent', 'a', 'b', 'other'].map((id) => requireNode(root, id));
  assert.ok(parent !== undefined && a !== undefined && b !== undefined && other !== undefined);
  // Hover paint is native state now; JavaScript only ever sees the events, so no enter or leave
  // below may cause a commit.
  const commits = host.commits.length;

  // Arriving from outside the root: related is null, so every ancestor is entered.
  host.event(a, 'pointerenter', { relatedTarget: null });
  root.dispatchEvents();
  assert.deepEqual(log.splice(0), ['parent:enter:none:parent', 'a:enter:none:a']);

  // Child to sibling: the shared parent is neither left nor re-entered, and keeps its hover paint.
  host.event(a, 'pointerleave', { relatedTarget: b });
  host.event(b, 'pointerenter', { relatedTarget: a });
  root.dispatchEvents();
  assert.deepEqual(log.splice(0), ['a:leave:b:a', 'b:enter:a:b']);

  // To an unrelated element: leave deepest first, up to the root; enter outermost first.
  host.event(b, 'pointerleave', { relatedTarget: other });
  host.event(other, 'pointerenter', { relatedTarget: b });
  root.dispatchEvents();
  assert.deepEqual(log.splice(0), ['b:leave:other:b', 'parent:leave:other:parent', 'other:enter:b:other']);

  // Leaving the root altogether.
  host.event(other, 'pointerleave', { relatedTarget: null });
  root.dispatchEvents();
  assert.deepEqual(log.splice(0), ['other:leave:none:other']);
  assert.equal(host.commits.length, commits, 'no enter or leave caused a commit');
  root.unmount();
});

test('a related element that no longer exists is treated as no related element', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  root.render(hoverTree(log));
  const b = requireNode(root, 'b');
  host.event(b, 'pointerenter', { relatedTarget: 9999 });
  root.dispatchEvents();
  assert.deepEqual(log, ['parent:enter:none:parent', 'b:enter:none:b']);
  root.unmount();
});

test('touch pointers dispatch enter and leave but never set hover', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  root.render(hoverTree(log));
  const a = requireNode(root, 'a');
  host.event(a, 'pointerenter', { pointerType: 'touch', pointerId: 2 });
  root.dispatchEvents();
  assert.deepEqual(log, ['parent:enter:none:parent', 'a:enter:none:a']);
  root.unmount();
});

test('handlers receive pointer data, modifiers and the native timestamp', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const seen: UIPointerEvent[] = [];
  const focused: UIFocusEvent[] = [];
  root.render(h(View, {
    testID: 'target', onClick: (event) => seen.push(event), onFocus: (event) => focused.push(event),
  }));
  const target = requireNode(root, 'target');
  host.event(target, 'click', {
    x: 12.5, y: 30, viewportX: 112.5, viewportY: 130, pointerId: 0, pointerType: '', button: 0,
    buttons: 0, detail: 0, shiftKey: true, metaKey: true, timeStamp: 77.25,
  });
  host.event(target, 'focus');
  root.dispatchEvents();
  const [click] = seen;
  assert.ok(click);
  assert.equal(click.type, 'click');
  assert.equal(click.bubbles, true);
  assert.equal(click.pointerType, '', 'keyboard activation is a click without a pointer type');
  assert.equal(click.pointerId, 0);
  assert.equal(click.detail, 0);
  assert.deepEqual([click.x, click.y, click.viewportX, click.viewportY], [12.5, 30, 112.5, 130]);
  assert.deepEqual([click.shiftKey, click.ctrlKey, click.altKey, click.metaKey], [true, false, false, true]);
  assert.equal(click.timeStamp, 77.25);
  assert.equal(click.target.id, target);
  assert.equal(click.relatedTarget, null);
  assert.equal(focused[0]?.type, 'focus');
  root.unmount();
});

test('a handler that calls dispatchEvents again does not recurse; the outer loop delivers the rest', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  let target = -1;
  root.render(h(View, {
    testID: 'target',
    onClick(event) {
      log.push(`click:${event.detail}:start`);
      if (event.detail === 1) {
        host.event(target, 'click', { detail: 2 });
        root.dispatchEvents();
        log.push('click:1:after-nested-dispatch');
      }
      log.push(`click:${event.detail}:end`);
    },
  }));
  target = requireNode(root, 'target');
  host.event(target, 'click', { detail: 1 });
  root.dispatchEvents();
  assert.deepEqual(log, [
    'click:1:start', 'click:1:after-nested-dispatch', 'click:1:end', 'click:2:start', 'click:2:end',
  ]);
  root.unmount();
});

test('a throwing handler still resolves its event, lets the loop finish, then rethrows', () => {
  const host = new RecordingHost();
  const reported: Error[] = [];
  const { root } = createTestRoot(host, { onError: (error) => reported.push(error) });
  const log: string[] = [];
  root.render(h(View, null,
    h(View, {
      testID: 'bad',
      onPointerDown(event) { event.preventDefault(); throw new Error('boom'); },
      onPointerUp() { throw new Error('second'); },
    }),
    h(View, { testID: 'good', onClick: () => log.push('good') })));
  const down = host.pointerEvent(requireNode(root, 'bad'), 'pointerdown', { cancelable: true });
  host.events.push(down, host.pointerEvent(requireNode(root, 'bad'), 'pointerup'),
    host.pointerEvent(requireNode(root, 'good'), 'click'));
  assert.throws(() => root.dispatchEvents(), /boom/);
  assert.deepEqual(host.resolutions, [{ seq: down.seq, defaultPrevented: true, dropEffect: '' }],
    'native receives the state reached before the throw');
  assert.deepEqual(log, ['good'], 'later events were still dispatched');
  assert.deepEqual(reported.map((error) => error.message), ['second'], 'later failures are reported, not dropped');
  // The failure is consumed: the next dispatch works.
  host.event(requireNode(root, 'good'), 'click');
  root.dispatchEvents();
  assert.deepEqual(log, ['good', 'good']);
  root.unmount();
});

test('a rejected resolveEvent surfaces as an error after the loop', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'target' }));
  host.resolveError = 'event 1 is not awaiting a result';
  host.events.push(host.pointerEvent(requireNode(root, 'target'), 'pointerdown', { cancelable: true }));
  assert.throws(() => root.dispatchEvents(), /resolveEvent rejected event 1: event 1 is not awaiting a result/);
  root.unmount();
});

test('the native owner subscription drives dispatch, and unmount unsubscribes exactly once', () => {
  const host = new RecordingHost();
  const { root, subscription } = createTestRoot(host);
  let clicks = 0;
  root.render(h(View, { testID: 'target', onClick: () => { clicks += 1; } }));
  assert.ok(subscription.listener, 'createRoot subscribes');
  host.event(requireNode(root, 'target'), 'click');
  subscription.fire();
  assert.equal(clicks, 1, 'eventsReady dispatches synchronously');
  assert.equal(subscription.unsubscribed, 0);
  root.unmount();
  assert.equal(subscription.unsubscribed, 1);
  assert.equal(subscription.listener, undefined);
  root.unmount();
  assert.equal(subscription.unsubscribed, 1, 'unmount is idempotent');
  host.event(0, 'click');
  root.dispatchEvents();
  assert.equal(clicks, 1, 'an unmounted root dispatches nothing');
});

test('unmounting from inside a handler finishes the batch without dispatching to removed elements', () => {
  const host = new RecordingHost();
  const { root, subscription } = createTestRoot(host);
  const log: string[] = [];
  root.render(h(View, null,
    h(View, { testID: 'first', onPointerDown: (event) => { event.preventDefault(); root.unmount(); } }),
    h(View, { testID: 'second', onPointerUp: () => log.push('second') })));
  const down = host.pointerEvent(requireNode(root, 'first'), 'pointerdown', { cancelable: true });
  host.events.push(down, host.pointerEvent(requireNode(root, 'second'), 'pointerup'));
  root.dispatchEvents();
  assert.deepEqual(log, [], 'the unmounted element received nothing');
  assert.deepEqual(host.resolutions, [{ seq: down.seq, defaultPrevented: true, dropEffect: '' }],
    'native still gets its answer');
  assert.equal(subscription.unsubscribed, 1);
  assert.equal(host.nodes.size, 1, 'every native node was removed');
});

test('the drain loop throws after MAX_EVENT_DRAIN_ROUNDS instead of spinning', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  let handled = 0;
  root.render(h(View, { testID: 'target', onClick: () => { handled += 1; } }));
  const target = requireNode(root, 'target');
  let drains = 0;
  host.produceEvents = () => {
    drains += 1;
    return [host.pointerEvent(target, 'click')];
  };
  assert.throws(() => root.dispatchEvents(), new RegExp(`after ${MAX_EVENT_DRAIN_ROUNDS} rounds`));
  assert.equal(drains, MAX_EVENT_DRAIN_ROUNDS, 'each round drained once');
  assert.equal(handled, MAX_EVENT_DRAIN_ROUNDS, 'every drained event was still dispatched');
  host.produceEvents = undefined;
  host.event(target, 'click');
  root.dispatchEvents();
  assert.equal(handled, MAX_EVENT_DRAIN_ROUNDS + 1, 'the guard resets after throwing');
  root.unmount();
});

test('wheel events run capture then bubble, carry their deltas and report preventDefault', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  const seen: UIWheelEvent[] = [];
  root.render(h(View, {
    testID: 'outer', onWheelCapture: () => log.push('outer:capture'),
    onWheel: () => log.push('outer:bubble'),
  }, h(View, {
    testID: 'inner',
    onWheel(event) {
      log.push('inner:bubble');
      seen.push(event);
      if (event.deltaY < 0) event.preventDefault();
    },
  })));
  const inner = requireNode(root, 'inner');
  const down = host.wheelEvent(inner, { deltaX: -0.5, deltaY: 2, shiftKey: true, viewportX: 110, viewportY: 220 });
  const up = host.wheelEvent(inner, { deltaY: -1 });
  host.events.push(down, up);
  root.dispatchEvents();
  assert.deepEqual(log, [
    'outer:capture', 'inner:bubble', 'outer:bubble', 'outer:capture', 'inner:bubble', 'outer:bubble',
  ]);
  const [first, second] = seen;
  assert.ok(first && second);
  assert.equal(first.type, 'wheel');
  assert.equal(first.bubbles, true);
  assert.equal(first.cancelable, true, 'native awaits the answer to a wheel event');
  assert.deepEqual([first.deltaX, first.deltaY, first.shiftKey, first.viewportX, first.viewportY], [-0.5, 2, true, 110, 220]);
  assert.deepEqual(host.resolutions, [
    { seq: down.seq, defaultPrevented: false, dropEffect: '' },
    { seq: up.seq, defaultPrevented: true, dropEffect: '' },
  ], 'native keeps an unprevented wheel for the game and consumes a prevented one');
  root.unmount();
});

test('wheel events over empty space reach root listeners', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'element', onWheel: () => { throw new Error('the element must not see it'); } }));
  const seen: number[] = [];
  root.addEventListener('wheel', (event) => {
    seen.push(event.deltaY);
    event.preventDefault();
  });
  const wheel = host.wheelEvent(0, { deltaY: 3 });
  host.events.push(wheel);
  root.dispatchEvents();
  assert.deepEqual(seen, [3]);
  assert.deepEqual(host.resolutions, [{ seq: wheel.seq, defaultPrevented: true, dropEffect: '' }]);
  root.unmount();
});

test('a wheel event without its deltas is rejected at the boundary', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'target' }));
  const target = requireNode(root, 'target');
  const { deltaY: _removed, ...incomplete } = host.wheelEvent(target);
  host.drainEvents = () => JSON.stringify([incomplete]);
  assert.throws(() => root.dispatchEvents(), /Invalid native event\.deltaY/);
  root.unmount();
});

test('the click family and pointercancel reach their handlers, bubble, and skip disabled elements', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  const seen: UIPointerEvent[] = [];
  const note = (name: string) => (event: UIPointerEvent) => {
    log.push(`${name}:${event.currentTarget.testID}`);
    seen.push(event);
  };
  root.render(h(View, {
    testID: 'outer', onDoubleClick: note('dblclick'), onAuxClick: note('auxclick'), onContextMenu: note('contextmenu'),
    onPointerCancelCapture: note('cancel-capture'), onPointerCancel: note('cancel'),
  }, h(View, { testID: 'inner' }), h(View, { testID: 'off', disabled: true })));
  const inner = requireNode(root, 'inner');
  const off = requireNode(root, 'off');
  host.events.push(
    host.pointerEvent(inner, 'dblclick', { button: 0, detail: 2 }),
    host.pointerEvent(inner, 'auxclick', { button: 2, detail: 1 }),
    host.pointerEvent(inner, 'contextmenu', { button: 2, buttons: 2, detail: 0 }),
    host.pointerEvent(inner, 'pointercancel', { pointerType: 'touch', pointerId: 3, buttons: 0 }),
    // A disabled element and the elements inside it receive no click events.
    host.pointerEvent(off, 'dblclick'), host.pointerEvent(off, 'auxclick'), host.pointerEvent(off, 'contextmenu'),
    // A cancel is not a click: it still reaches a disabled element, so a press that began there can end.
    host.pointerEvent(off, 'pointercancel'),
  );
  root.dispatchEvents();
  assert.deepEqual(log, [
    'dblclick:outer', 'auxclick:outer', 'contextmenu:outer', 'cancel-capture:outer', 'cancel:outer', 'cancel-capture:outer', 'cancel:outer',
  ]);
  const [dblclick, auxclick, contextmenu, cancel] = seen;
  assert.ok(dblclick && auxclick && contextmenu && cancel);
  assert.equal(dblclick.type, 'dblclick');
  assert.equal(dblclick.detail, 2);
  assert.equal(dblclick.target.testID, 'inner', 'the handler on an ancestor sees the element the event began on');
  assert.equal(auxclick.button, 2);
  assert.equal(contextmenu.type, 'contextmenu');
  assert.equal(contextmenu.buttons, 2);
  assert.deepEqual([cancel.type, cancel.pointerType, cancel.pointerId, cancel.cancelable], ['pointercancel', 'touch', 3, false]);
  root.unmount();
});

test('handles capture pointers through native, which validates, and report the failures', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const handles: Array<{ capture(pointerId: number): void; release(pointerId: number): void; has(pointerId: number): boolean }> = [];
  root.render(h(View, null,
    h(View, {
      testID: 'knob',
      onPointerDown(event) {
        const { currentTarget } = event;
        handles.push({
          capture: (id) => currentTarget.setPointerCapture(id),
          release: (id) => currentTarget.releasePointerCapture(id),
          has: (id) => currentTarget.hasPointerCapture(id),
        });
      },
    }),
    h(View, { testID: 'other' })));
  const knob = requireNode(root, 'knob');
  const other = requireNode(root, 'other');
  host.pointersDown.add(1);
  host.event(knob, 'pointerdown');
  root.dispatchEvents();
  const [handle] = handles;
  assert.ok(handle);
  assert.equal(handle.has(1), false);
  handle.capture(1);
  assert.equal(handle.has(1), true);
  assert.deepEqual(host.calls.filter((call) => call.endsWith('PointerCapture')), [
    'hasPointerCapture', 'setPointerCapture', 'hasPointerCapture',
  ]);
  assert.equal(host.captures.get(1), knob);
  // Another element's handle sees no capture and cannot release this one.
  const otherHandle = root.findByTestID('other');
  assert.ok(otherHandle);
  host.releasePointerCapture(other, 1);
  assert.equal(host.captures.get(1), knob);
  handle.release(1);
  assert.equal(handle.has(1), false);
  // Native's refusal is an error, and nothing changed.
  assert.throws(() => handle.capture(9), /setPointerCapture failed: pointer 9 is not active/);
  assert.equal(host.captures.has(9), false);
  root.unmount();
});

test('key events run capture then bubble, carry their key and report preventDefault', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  const seen: UIKeyboardEvent[] = [];
  root.render(h(View, {
    testID: 'outer', onKeyDownCapture: () => log.push('outer:capture'), onKeyDown: () => log.push('outer:bubble'),
    onKeyUp: () => log.push('outer:keyup'),
  }, h(View, {
    testID: 'inner', tabIndex: 0,
    onKeyDown(event) {
      log.push(`inner:${event.key}:${event.code}:${event.repeat}`);
      seen.push(event);
      if (event.key === 'Tab') event.preventDefault();
    },
  })));
  const inner = requireNode(root, 'inner');
  const a = host.keyEvent(inner, 'keydown', { key: 'a', code: 'KeyA', shiftKey: true });
  const repeat = host.keyEvent(inner, 'keydown', { key: 'a', code: 'KeyA', repeat: true });
  const tab = host.keyEvent(inner, 'keydown', { key: 'Tab', code: 'Tab' });
  const release = host.keyEvent(inner, 'keyup', { key: 'a', code: 'KeyA' });
  host.events.push(a, repeat, tab, release);
  root.dispatchEvents();
  assert.deepEqual(log, [
    'outer:capture', 'inner:a:KeyA:false', 'outer:bubble',
    'outer:capture', 'inner:a:KeyA:true', 'outer:bubble',
    'outer:capture', 'inner:Tab:Tab:false', 'outer:bubble',
    'outer:keyup',
  ]);
  const [first, second] = seen;
  assert.ok(first && second);
  assert.equal(first.type, 'keydown');
  assert.equal(first.cancelable, true, 'native awaits the answer to a keydown');
  assert.equal(first.shiftKey, true);
  assert.equal(second.repeat, true, 'a held key repeats as keydown with repeat set');
  assert.deepEqual(host.resolutions, [
    { seq: a.seq, defaultPrevented: false, dropEffect: '' },
    { seq: repeat.seq, defaultPrevented: false, dropEffect: '' },
    { seq: tab.seq, defaultPrevented: true, dropEffect: '' },
  ], 'native keeps an unprevented key for its default action and the game, and skips them for a prevented one');
  root.unmount();
});

test('a key with no focused element goes to root listeners only', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'element', onKeyDown: () => { throw new Error('nothing is focused'); } }));
  const pressed: string[] = [];
  root.addEventListener('keydown', (event) => {
    pressed.push(`${event.key}:${event.target.id}`);
    event.preventDefault();
  });
  const key = host.keyEvent(0, 'keydown', { key: 'w', code: 'KeyW' });
  host.events.push(key);
  root.dispatchEvents();
  assert.deepEqual(pressed, ['w:0']);
  assert.deepEqual(host.resolutions, [{ seq: key.seq, defaultPrevented: true, dropEffect: '' }]);
  root.unmount();
});

test('focus and blur name the element on the other side and whether the focus is a keyboard focus', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  const seen: UIFocusEvent[] = [];
  const watch = (name: string) => ({
    testID: name, tabIndex: 0 as const,
    onFocus: (event: UIFocusEvent) => { log.push(`${name}:focus:${event.relatedTarget?.testID ?? 'none'}:${event.focusVisible}`); seen.push(event); },
    onBlur: (event: UIFocusEvent) => log.push(`${name}:blur:${event.relatedTarget?.testID ?? 'none'}:${event.focusVisible}`),
  });
  root.render(h(View, null, h(View, watch('a')), h(View, watch('b'))));
  const a = requireNode(root, 'a');
  const b = requireNode(root, 'b');
  host.events.push(host.focusEvent(a, 'focus', null, true));
  host.events.push(host.focusEvent(a, 'blur', b, true), host.focusEvent(b, 'focus', a, true));
  // A focus whose other side is already gone is a focus with no related element.
  host.events.push(host.focusEvent(b, 'blur', 9999, false));
  root.dispatchEvents();
  assert.deepEqual(log, ['a:focus:none:true', 'a:blur:b:true', 'b:focus:a:true', 'b:blur:none:false']);
  assert.equal(seen[0]?.bubbles, true, 'focus bubbles, as React\'s onFocus does');
  root.unmount();
});

test('handles focus and blur through native, which says why it refuses', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const handles: { focus(options?: { focusVisible?: boolean }): void; blur(): void }[] = [];
  const collect = (event: UIPointerEvent) => { handles.push(event.currentTarget); };
  root.render(h(View, null,
    h(View, { testID: 'card', tabIndex: 0, onPointerDown: collect }),
    h(View, { testID: 'plain', onPointerDown: collect })));
  const card = requireNode(root, 'card');
  const plain = requireNode(root, 'plain');
  host.focusable.add(card);
  host.event(card, 'pointerdown');
  host.event(plain, 'pointerdown');
  root.dispatchEvents();
  const [cardHandle, plainHandle] = handles;
  assert.ok(cardHandle && plainHandle);
  cardHandle.focus();
  cardHandle.focus({ focusVisible: true });
  cardHandle.focus({ focusVisible: false });
  assert.deepEqual(host.focusRequests.map((request) => request.focusVisible), [-1, 1, 0],
    'by default focus follows the input modality; an option forces it either way');
  assert.equal(host.focused, card);
  cardHandle.blur();
  assert.equal(host.focused, null);
  assert.throws(() => plainHandle.focus(), /focus failed: node \d+ cannot take focus/);
  root.unmount();
});

test('events addressed to the root reach root listeners only', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  const log: string[] = [];
  root.render(h(View, { testID: 'element', onPointerDown: () => log.push('element') }));
  const remove = root.addEventListener('pointerdown', (event) => {
    log.push(`root:${event.eventPhase}:${event.target.id}:${event.currentTarget.id}`);
  });
  host.event(0, 'pointerdown');
  root.dispatchEvents();
  assert.deepEqual(log, [`root:${EventPhase.AtTarget}:0:0`]);
  remove();
  host.event(0, 'pointerdown');
  root.dispatchEvents();
  assert.equal(log.length, 1, 'a removed listener is not called');
  root.unmount();
});

test('invalid native events are rejected at the boundary and do not wedge dispatching', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'target' }));
  const malformed = JSON.stringify([{ seq: 1, target: 1, path: [1], cancelable: false, timeStamp: 0, type: 'pointerdown' }]);
  const drain = host.drainEvents.bind(host);
  let first = true;
  host.drainEvents = () => {
    if (!first) return drain();
    first = false;
    return malformed;
  };
  assert.throws(() => root.dispatchEvents(), /Invalid native event\.x/);
  root.dispatchEvents();
  root.unmount();
});

test('exclusiveAncestry keeps the part of a path that the related path does not share', () => {
  const root = { name: 'root' };
  const parent = { name: 'parent' };
  const a = { name: 'a' };
  const b = { name: 'b' };
  assert.deepEqual(exclusiveAncestry([a, parent, root], [b, parent, root]), [a]);
  assert.deepEqual(exclusiveAncestry([a, parent, root], []), [a, parent, root]);
  assert.deepEqual(exclusiveAncestry([a, parent, root], [parent, root]), [a]);
  assert.deepEqual(exclusiveAncestry([parent, root], [a, parent, root]), []);
  assert.deepEqual(exclusiveAncestry([a], [a]), []);
  assert.deepEqual(exclusiveAncestry([], [a]), []);
});
