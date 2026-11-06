import assert from 'node:assert/strict';
import test from 'node:test';
import { readNodeRect, readSnapshot, type NativeEffectsLayout } from '../src/native';
import { RecordingHost } from './recording-host';

// What src/native.ts accepts of a native snapshot and a node rectangle: the shapes native/snapshot.rs and native/render_tree.rs emit.

/** The host's snapshot with `change` applied to its parsed JSON. */
function snapshotWith(change: (json: { nodes: Array<Record<string, unknown>>; stats: Record<string, unknown> }) => void): RecordingHost {
  const host = new RecordingHost();
  const original = host.getSnapshot.bind(host);
  host.getSnapshot = () => {
    const json: { nodes: Array<Record<string, unknown>>; stats: Record<string, unknown> } = JSON.parse(original());
    change(json);
    return JSON.stringify(json);
  };
  return host;
}

const LAYOUTS: readonly NativeEffectsLayout[] = ['plain', 'backdrop', 'group', 'both', 'both-in-wrapper'];

for (const layout of LAYOUTS) {
  test(`a node whose effects hang as "${layout}" is read as such`, () => {
    const host = snapshotWith((json) => {
      const [root] = json.nodes;
      assert.ok(root, 'the snapshot has the root node');
      root.effects = { backdrop: null, filter: null, layout };
    });
    assert.equal(readSnapshot(host).nodes[0]?.effects?.layout, layout);
  });
}

test('an effects layout native does not emit is refused, not passed through as a string', () => {
  const host = snapshotWith((json) => {
    const [root] = json.nodes;
    assert.ok(root, 'the snapshot has the root node');
    root.effects = { backdrop: null, filter: null, layout: 'both-in-shell' };
  });
  assert.throws(() => readSnapshot(host), /Invalid native effects layout: both-in-shell/);
});

test('the commit counters native reports, `commits` and `animationFrames` included, are read and required', () => {
  const host = snapshotWith((json) => {
    json.stats.commits = 7;
    json.stats.animationFrames = 3;
  });
  const { stats } = readSnapshot(host);
  assert.equal(stats.commits, 7);
  assert.equal(stats.animationFrames, 3);

  const missing = snapshotWith((json) => {
    delete json.stats.animationFrames;
  });
  assert.throws(() => readSnapshot(missing), /stats\.animationFrames/);
});

test('the root, node 0, has a rectangle like any mounted node, and a tag native does not know has none', () => {
  const host = new RecordingHost();
  host.mainRoot.rect = { x: 0, y: 0, width: 1120, height: 800 };
  assert.deepEqual(readNodeRect(host, 0), { x: 0, y: 0, width: 1120, height: 800 });
  assert.equal(readNodeRect(host, 99), undefined);
});
