import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DataTransfer, DragDataStore, defaultDropEffect, isDropEffect, isEffectAllowed, negotiateDropEffect,
  DROP_EFFECTS, EFFECTS_ALLOWED,
  type DropEffect, type EffectAllowed,
} from '../src/data-transfer';

/** A store taken through `dragstart` with the given data and `effectAllowed`. */
function startedDrag(effectAllowed: string = 'uninitialized', data: Record<string, string> = { 'text/plain': 'card 7' }) {
  const store = new DragDataStore();
  const transfer = store.dispatch('dragstart', (started) => {
    for (const [format, value] of Object.entries(data)) started.setData(format, value);
    started.effectAllowed = effectAllowed;
    return started;
  });
  return { store, transfer };
}

// --- standalone DataTransfer ---

test('a standalone DataTransfer is read/write with effectAllowed none, like new DataTransfer()', () => {
  const transfer = new DataTransfer();
  assert.deepEqual([...transfer.types], []);
  assert.equal(transfer.effectAllowed, 'none');
  assert.equal(transfer.dropEffect, 'none');
  transfer.setData('text/plain', 'hello');
  assert.equal(transfer.getData('text/plain'), 'hello');
  transfer.effectAllowed = 'copyMove';
  assert.equal(transfer.effectAllowed, 'copyMove');
});

test('format names are case-insensitive and text / url are aliases of two MIME types', () => {
  const transfer = new DataTransfer();
  transfer.setData('Text', 'a');
  transfer.setData('URL', 'https://example.com/\nhttps://example.org/');
  transfer.setData('Application/X-Card', 'b');
  assert.deepEqual([...transfer.types], ['text/plain', 'text/uri-list', 'application/x-card']);
  assert.equal(transfer.getData('TEXT/PLAIN'), 'a');
  assert.equal(transfer.getData('text'), 'a');
  assert.equal(transfer.getData('application/x-card'), 'b');
  assert.equal(transfer.getData('APPLICATION/x-card'), 'b');
});

test("getData('url') returns the first URL of a uri-list and getData('text/uri-list') the whole list", () => {
  const transfer = new DataTransfer();
  const list = '# bookmarks\r\n\r\nhttps://example.com/a\r\nhttps://example.com/b';
  transfer.setData('text/uri-list', list);
  assert.equal(transfer.getData('url'), 'https://example.com/a');
  assert.equal(transfer.getData('URL'), 'https://example.com/a');
  assert.equal(transfer.getData('text/uri-list'), list);
  transfer.setData('url', '# only a comment\n');
  assert.equal(transfer.getData('url'), '');
});

test('setData replaces an item of the same format and the new one goes last', () => {
  const transfer = new DataTransfer();
  transfer.setData('a/one', '1');
  transfer.setData('a/two', '2');
  transfer.setData('a/one', 'one again');
  assert.deepEqual([...transfer.types], ['a/two', 'a/one']);
  assert.equal(transfer.getData('a/one'), 'one again');
  transfer.setData('text', 'x');
  transfer.setData('text/plain', 'y');
  assert.deepEqual([...transfer.types], ['a/two', 'a/one', 'text/plain'], 'the alias replaced the same item');
});

test('getData of a missing format is an empty string', () => {
  const transfer = new DataTransfer();
  assert.equal(transfer.getData('text/plain'), '');
  assert.equal(transfer.getData(''), '');
});

test('clearData removes one format, resolving the aliases, or all of them', () => {
  const transfer = new DataTransfer();
  transfer.setData('text/plain', 'a');
  transfer.setData('text/uri-list', 'https://example.com/');
  transfer.setData('a/one', '1');
  transfer.clearData('Text');
  assert.deepEqual([...transfer.types], ['text/uri-list', 'a/one']);
  transfer.clearData('url');
  assert.deepEqual([...transfer.types], ['a/one']);
  transfer.clearData('absent/format');
  assert.deepEqual([...transfer.types], ['a/one']);
  transfer.clearData(undefined);
  assert.deepEqual([...transfer.types], []);
  transfer.setData('a/one', '1');
  transfer.clearData();
  assert.deepEqual([...transfer.types], []);
});

test('types is frozen and keeps its identity until the items change', () => {
  const transfer = new DataTransfer();
  transfer.setData('a/one', '1');
  const types = transfer.types;
  assert.ok(Object.isFrozen(types));
  assert.equal(transfer.types, types);
  transfer.setData('a/two', '2');
  assert.notEqual(transfer.types, types);
  assert.deepEqual([...types], ['a/one'], 'the old array is not mutated');
  const second = transfer.types;
  transfer.clearData('absent');
  assert.notEqual(transfer.types, second, 'a clear invalidates it, even one that removes nothing');
});

test('effectAllowed accepts only its nine values and ignores anything else', () => {
  const transfer = new DataTransfer();
  for (const value of EFFECTS_ALLOWED) {
    transfer.effectAllowed = value;
    assert.equal(transfer.effectAllowed, value);
  }
  transfer.effectAllowed = 'move';
  for (const bogus of ['', 'Move', 'copy move', 'everything', 'null']) {
    transfer.effectAllowed = bogus;
    assert.equal(transfer.effectAllowed, 'move', JSON.stringify(bogus));
  }
});

test('dropEffect accepts only its four values and ignores anything else', () => {
  const transfer = new DataTransfer();
  for (const value of DROP_EFFECTS) {
    transfer.dropEffect = value;
    assert.equal(transfer.dropEffect, value);
  }
  transfer.dropEffect = 'link';
  for (const bogus of ['', 'Copy', 'copyMove', 'all', 'uninitialized']) {
    transfer.dropEffect = bogus;
    assert.equal(transfer.dropEffect, 'link', JSON.stringify(bogus));
  }
});

test('the guards agree with the value lists', () => {
  for (const effect of DROP_EFFECTS) assert.ok(isDropEffect(effect));
  for (const effect of EFFECTS_ALLOWED) assert.ok(isEffectAllowed(effect));
  assert.ok(!isDropEffect('all'));
  assert.ok(!isEffectAllowed('link '));
  assert.ok(!isDropEffect(undefined));
  assert.ok(!isEffectAllowed(7));
});

// --- the drag data store's modes ---

test('dragstart is read/write: data and effectAllowed can be set, and read back', () => {
  const store = new DragDataStore();
  assert.equal(store.mode, 'protected', 'between events');
  store.dispatch('dragstart', (transfer) => {
    assert.equal(store.mode, 'read-write');
    transfer.setData('text/plain', 'card 7');
    transfer.effectAllowed = 'move';
    assert.equal(transfer.getData('text/plain'), 'card 7');
    assert.equal(transfer.effectAllowed, 'move');
    assert.deepEqual([...transfer.types], ['text/plain']);
  });
  assert.equal(store.mode, 'protected');
  assert.equal(store.allowedEffects, 'move');
});

test('a new drag starts with effectAllowed uninitialized', () => {
  const store = new DragDataStore();
  store.dispatch('dragstart', (transfer) => assert.equal(transfer.effectAllowed, 'uninitialized'));
});

test('protected events see the formats but never the data, and cannot add any', () => {
  const protectedEvents: Array<'drag' | 'dragenter' | 'dragleave'> = ['drag', 'dragenter', 'dragleave'];
  for (const type of protectedEvents) {
    const { store } = startedDrag('move', { 'text/plain': 'secret', 'a/one': '1' });
    store.dispatch(type, (transfer) => {
      assert.equal(store.mode, 'protected', type);
      assert.deepEqual([...transfer.types], ['text/plain', 'a/one'], type);
      assert.equal(transfer.getData('text/plain'), '', type);
      assert.equal(transfer.getData('text'), '', type);
      transfer.setData('a/two', '2');
      transfer.clearData('a/one');
      transfer.clearData();
      transfer.effectAllowed = 'copy';
      assert.deepEqual([...transfer.types], ['text/plain', 'a/one'], `${type}: nothing changed`);
      assert.equal(transfer.effectAllowed, 'move', type);
    });
  }
});

test('dragover is protected too', () => {
  const { store } = startedDrag('move');
  store.dispatchDragOver((transfer) => {
    assert.equal(store.mode, 'protected');
    assert.equal(transfer.getData('text/plain'), '');
    transfer.setData('a/new', 'x');
    transfer.effectAllowed = 'copy';
    assert.deepEqual([...transfer.types], ['text/plain']);
    assert.equal(transfer.effectAllowed, 'move');
    return false;
  });
});

test('drop is read-only: the data can be read and nothing can be changed', () => {
  const { store } = startedDrag('move', { 'text/plain': 'card 7', 'text/uri-list': 'https://example.com/' });
  store.dispatchDrop((transfer) => {
    assert.equal(store.mode, 'read-only');
    assert.equal(transfer.getData('text/plain'), 'card 7');
    assert.equal(transfer.getData('url'), 'https://example.com/');
    transfer.setData('a/new', 'x');
    transfer.clearData('text/plain');
    transfer.clearData();
    transfer.effectAllowed = 'copy';
    assert.deepEqual([...transfer.types], ['text/plain', 'text/uri-list']);
    assert.equal(transfer.getData('text/plain'), 'card 7');
    assert.equal(transfer.effectAllowed, 'move');
    return true;
  });
});

test('dragend is protected', () => {
  const { store } = startedDrag('move');
  store.dispatchDragEnd('move', (transfer) => {
    assert.equal(store.mode, 'protected');
    assert.equal(transfer.getData('text/plain'), '');
    assert.deepEqual([...transfer.types], ['text/plain']);
  });
});

test('a transfer kept after its event falls back to the store protected mode', () => {
  const { store, transfer } = startedDrag('move');
  transfer.setData('a/late', 'x');
  assert.deepEqual([...transfer.types], ['text/plain'], 'dragstart is over');
  assert.equal(transfer.getData('text/plain'), '');
  store.dispatchDrop(() => true);
  transfer.setData('a/late', 'x');
  assert.deepEqual([...transfer.types], ['text/plain']);
});

test('the mode is restored when a handler throws', () => {
  const store = new DragDataStore();
  assert.throws(
    () => store.dispatch('dragstart', () => { throw new Error('handler failed'); }),
    /handler failed/,
  );
  assert.equal(store.mode, 'protected');
  assert.throws(
    () => store.dispatchDrop(() => { throw new Error('drop failed'); }),
    /drop failed/,
  );
  assert.equal(store.mode, 'protected');
});

test('each event gets its own transfer, so dropEffect is not shared between events', () => {
  const { store } = startedDrag('copyMove');
  const seen: DataTransfer[] = [];
  store.dispatchDragOver((transfer) => { seen.push(transfer); transfer.dropEffect = 'move'; return true; });
  store.dispatchDragOver((transfer) => { seen.push(transfer); return false; });
  assert.notEqual(seen[0], seen[1]);
  assert.equal(seen[0]?.dropEffect, 'move');
  assert.equal(seen[1]?.dropEffect, 'copy', 'a fresh dragover starts from the default again');
});

// --- the initial dropEffect ---

test('dropEffect starts none on dragstart, drag and dragleave', () => {
  const { store } = startedDrag('move');
  store.dispatch('dragstart', (transfer) => assert.equal(transfer.dropEffect, 'none'));
  store.dispatch('drag', (transfer) => assert.equal(transfer.dropEffect, 'none'));
  store.dispatch('dragleave', (transfer) => assert.equal(transfer.dropEffect, 'none'));
});

test('dropEffect starts from effectAllowed on dragenter and dragover', () => {
  const expected: Record<EffectAllowed, DropEffect> = {
    none: 'none', copy: 'copy', move: 'move', link: 'link',
    copyLink: 'copy', copyMove: 'copy', all: 'copy', linkMove: 'link', uninitialized: 'copy',
  };
  for (const effectAllowed of EFFECTS_ALLOWED) {
    assert.equal(defaultDropEffect(effectAllowed), expected[effectAllowed], effectAllowed);
    const { store } = startedDrag(effectAllowed);
    store.dispatch('dragenter', (transfer) => assert.equal(transfer.dropEffect, expected[effectAllowed], `enter ${effectAllowed}`));
    store.dispatchDragOver((transfer) => {
      assert.equal(transfer.dropEffect, expected[effectAllowed], `over ${effectAllowed}`);
      return false;
    });
  }
});

// --- negotiation ---

test('the permitted effects for each effectAllowed', () => {
  const permits: Record<EffectAllowed, DropEffect[]> = {
    none: [],
    copy: ['copy'],
    link: ['link'],
    move: ['move'],
    copyLink: ['copy', 'link'],
    copyMove: ['copy', 'move'],
    linkMove: ['link', 'move'],
    all: ['copy', 'link', 'move'],
    uninitialized: ['copy', 'link', 'move'],
  };
  for (const effectAllowed of EFFECTS_ALLOWED) {
    for (const effect of ['copy', 'link', 'move'] as const) {
      const expected = permits[effectAllowed].includes(effect) ? effect : 'none';
      assert.equal(negotiateDropEffect(effectAllowed, effect), expected, `${effectAllowed} / ${effect}`);
    }
    assert.equal(negotiateDropEffect(effectAllowed, 'none'), 'none', `${effectAllowed} / none`);
  }
});

test('a prevented dragover gives the dropEffect the source allows', () => {
  const { store } = startedDrag('copyMove');
  assert.equal(store.dispatchDragOver((transfer) => { transfer.dropEffect = 'move'; return true; }), 'move');
  assert.equal(store.currentOperation, 'move');
  assert.equal(store.dispatchDragOver((transfer) => { transfer.dropEffect = 'copy'; return true; }), 'copy');
});

test('a prevented dragover with a dropEffect the source forbids is not a drop', () => {
  const { store } = startedDrag('move');
  const result = store.dispatchDragOver((transfer) => { transfer.dropEffect = 'copy'; return true; });
  assert.equal(result, 'none');
  assert.equal(store.currentOperation, 'none');
});

test('a prevented dragover that sets no effect accepts the default for effectAllowed', () => {
  assert.equal(startedDrag('move').store.dispatchDragOver(() => true), 'move');
  assert.equal(startedDrag('linkMove').store.dispatchDragOver(() => true), 'link');
  assert.equal(startedDrag('uninitialized').store.dispatchDragOver(() => true), 'copy');
  assert.equal(startedDrag('none').store.dispatchDragOver(() => true), 'none', 'the source allows nothing');
});

test('a dragover that is not prevented refuses the drop whatever dropEffect says', () => {
  const { store } = startedDrag('all');
  store.dispatchDragOver(() => true);
  assert.equal(store.currentOperation, 'copy');
  assert.equal(store.dispatchDragOver((transfer) => { transfer.dropEffect = 'move'; return false; }), 'none');
  assert.equal(store.currentOperation, 'none', 'the refusal replaces the earlier acceptance');
});

test('a handler that sets dropEffect none while preventing refuses the drop', () => {
  const { store } = startedDrag('all');
  assert.equal(store.dispatchDragOver((transfer) => { transfer.dropEffect = 'none'; return true; }), 'none');
});

test('drop starts with the operation of the last dragover', () => {
  const { store } = startedDrag('all');
  store.dispatchDragOver((transfer) => { transfer.dropEffect = 'link'; return true; });
  store.dispatchDrop((transfer) => {
    assert.equal(transfer.dropEffect, 'link');
    return true;
  });
});

test('a prevented drop reports the dropEffect it ends with, an unprevented one none', () => {
  const kept = startedDrag('all').store;
  kept.dispatchDragOver((transfer) => { transfer.dropEffect = 'move'; return true; });
  assert.equal(kept.dispatchDrop(() => true), 'move');
  assert.equal(kept.currentOperation, 'move');

  const changed = startedDrag('all').store;
  changed.dispatchDragOver((transfer) => { transfer.dropEffect = 'move'; return true; });
  assert.equal(changed.dispatchDrop((transfer) => { transfer.dropEffect = 'copy'; return true; }), 'copy');

  const ignored = startedDrag('all').store;
  ignored.dispatchDragOver((transfer) => { transfer.dropEffect = 'move'; return true; });
  assert.equal(ignored.dispatchDrop(() => false), 'none');
  assert.equal(ignored.currentOperation, 'none');
});

// --- lifecycle ---

test('dragend carries the effect native reports and then ends the association', () => {
  const { store, transfer } = startedDrag('move', { 'text/plain': 'card 7', 'a/one': '1' });
  store.dispatchDragOver(() => true);
  let seen: DropEffect | undefined;
  store.dispatchDragEnd('none', (ending) => { seen = ending.dropEffect; });
  assert.equal(seen, 'none', 'native decides, whatever the last dragover said');
  assert.equal(store.isAssociated, false);
  // Every transfer of the drag is now empty and inert.
  assert.deepEqual([...transfer.types], []);
  assert.equal(transfer.getData('text/plain'), '');
  assert.equal(transfer.effectAllowed, 'none');
  transfer.setData('a/late', 'x');
  transfer.effectAllowed = 'copy';
  assert.deepEqual([...transfer.types], []);
  assert.equal(transfer.effectAllowed, 'none');
});

test('dragend disposes the store even if a handler throws', () => {
  const { store } = startedDrag('move');
  assert.throws(() => store.dispatchDragEnd('move', () => { throw new Error('boom'); }), /boom/);
  assert.equal(store.isAssociated, false);
});

test('a refused or cancelled drag disposes the store explicitly', () => {
  const { store, transfer } = startedDrag('move');
  store.dispose();
  assert.equal(store.isAssociated, false);
  assert.deepEqual([...transfer.types], []);
  assert.equal(transfer.effectAllowed, 'none');
});

test('dispatching on a disposed store is a bug and throws', () => {
  const store = new DragDataStore();
  store.dispose();
  assert.throws(() => store.dispatch('dragstart', () => undefined), /disposed/);
  assert.throws(() => store.dispatchDragOver(() => true), /disposed/);
  assert.throws(() => store.dispatchDrop(() => true), /disposed/);
  assert.throws(() => store.dispatchDragEnd('none', () => undefined), /disposed/);
});

test('a whole drag: start, over two targets, drop, end', () => {
  const log: string[] = [];
  const store = new DragDataStore();
  const prevented = store.dispatch('dragstart', (transfer) => {
    transfer.setData('text/plain', 'card 7');
    transfer.setData('application/x-card', JSON.stringify({ id: 7 }));
    transfer.effectAllowed = 'move';
    log.push(`start ${transfer.types.join(',')}`);
    return false;
  });
  assert.equal(prevented, false);

  store.dispatch('drag', (transfer) => log.push(`drag ${transfer.dropEffect}`));
  store.dispatch('dragenter', (transfer) => log.push(`enter ${transfer.dropEffect}`));
  // Column A accepts nothing, column B accepts moves.
  log.push(`over A ${store.dispatchDragOver(() => false)}`);
  store.dispatch('dragleave', () => log.push('leave A'));
  store.dispatch('dragenter', () => log.push('enter B'));
  log.push(`over B ${store.dispatchDragOver((transfer) => { transfer.dropEffect = 'move'; return true; })}`);
  log.push(`drop ${store.dispatchDrop((transfer) => {
    log.push(`read ${transfer.getData('application/x-card')}`);
    return true;
  })}`);
  store.dispatchDragEnd('move', (transfer) => log.push(`end ${transfer.dropEffect}`));

  assert.deepEqual(log, [
    'start text/plain,application/x-card',
    'drag none',
    'enter move',
    'over A none',
    'leave A',
    'enter B',
    'over B move',
    'read {"id":7}',
    'drop move',
    'end move',
  ]);
});
