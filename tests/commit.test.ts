import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCommit, LAYER_ROOT_TAG, type CommitNode, type CommitPayload } from '../src/commit';
import type { NativeKind, NativeProps } from '../src/props';
import { compileStyle } from '../src/styles';
import { checkFixture } from './fixtures';

/** What React persistent mode hands the walk: immutable instances sharing unchanged children. */
interface TestInstance extends CommitNode<TestInstance> {
  readonly note?: string;
}

function instance(
  tag: number, kind: NativeKind, native: NativeProps, children: readonly TestInstance[] = [], note?: string,
): TestInstance {
  return { tag, kind, native, children, ...(note === undefined ? {} : { note }) };
}

/** Index every node of a tree by tag, as the renderer's committed map does. */
function index(roots: readonly TestInstance[], into = new Map<number, TestInstance>()): Map<number, TestInstance> {
  for (const root of roots) {
    into.set(root.tag, root);
    index(root.children, into);
  }
  return into;
}

function commitAll(
  committed: Map<number, TestInstance>, rootTags: number[], roots: readonly TestInstance[],
) {
  const built = buildCommit(committed, rootTags, roots);
  for (const [tag, node] of built.updates) committed.set(tag, node);
  return built;
}

const CELL_COUNT = 2000;
const GRID_COLUMNS_STYLE = compileStyle('grid grid-cols-10 gap-1');
const CELL_STYLE = compileStyle('bg-indigo-100 p-1');

/** root(1) > section(2) > grid(3) > CELL_COUNT cells, i.e. a leaf at depth 4. */
function bigTree(grid?: readonly TestInstance[]) {
  const cells = grid ?? Array.from({ length: CELL_COUNT }, (_, cellIndex) =>
    instance(10 + cellIndex, 'view', { style: CELL_STYLE, testID: `cell-${cellIndex}` }));
  const gridNode = instance(3, 'view', { style: GRID_COLUMNS_STYLE }, cells);
  const section = instance(2, 'view', {}, [gridNode]);
  return instance(1, 'view', {}, [section]);
}

/** persistent mode: change one cell and clone every ancestor, sharing everything else. */
function withCellChanged(root: TestInstance, cellIndex: number, native: NativeProps): TestInstance {
  const section = root.children[0];
  const grid = section?.children[0];
  assert.ok(section && grid);
  const cells = grid.children.map((cell, position) => (position === cellIndex ? { ...cell, native } : cell));
  return { ...root, children: [{ ...section, children: [{ ...grid, children: cells }] }] };
}

test('an unchanged tree produces no payload and visits nothing below the root', () => {
  const root = bigTree();
  const committed = new Map<number, TestInstance>();
  const first = commitAll(committed, [], [root]);
  assert.equal(first.payload?.created.length, CELL_COUNT + 3);
  const again = buildCommit(committed, first.rootTags, [root]);
  assert.equal(again.payload, undefined);
  assert.equal(again.visited, 0);
  assert.equal(again.updates.size, 0);
  assert.deepEqual(again.rootTags, [1]);
});

test('one changed leaf in a 2,000-node tree is one updated entry and a visit per ancestor', () => {
  const committed = new Map<number, TestInstance>();
  const root = bigTree();
  commitAll(committed, [], [root]);
  const next = withCellChanged(root, 1234, { style: compileStyle('bg-emerald-100 p-1'), testID: 'cell-1234' });
  const built = buildCommit(committed, [1], [next]);
  assert.equal(built.visited, 4, 'root, section, grid and the cell: the depth of the changed leaf');
  assert.deepEqual(built.payload?.created, []);
  assert.deepEqual(built.payload?.children, [], 'no child list changed');
  assert.equal(built.payload?.updated.length, 1);
  assert.deepEqual(built.payload?.updated[0], {
    tag: 10 + 1234, props: { style: compileStyle('bg-emerald-100 p-1') },
  });
  assert.equal(built.updates.size, 4);
  assert.ok(JSON.stringify(built.payload).length < 400, 'the payload is a few hundred bytes, not 2,000 nodes');
});

test('the same single-leaf change costs the same at 50 and at 2,000 nodes', () => {
  const sizes = new Map<number, { visited: number; payloadSize: number; entries: number }>();
  for (const count of [50, CELL_COUNT]) {
    const cells = Array.from({ length: count }, (_, cellIndex) =>
      instance(10 + cellIndex, 'view', { style: CELL_STYLE }));
    const root = bigTree(cells);
    const committed = new Map<number, TestInstance>();
    commitAll(committed, [], [root]);
    const built = buildCommit(committed, [1], [withCellChanged(root, 7, { style: compileStyle('bg-rose-100') })]);
    const payload = built.payload;
    assert.ok(payload);
    sizes.set(count, {
      visited: built.visited,
      payloadSize: JSON.stringify(payload).length,
      entries: payload.created.length + payload.updated.length + payload.children.length,
    });
  }
  assert.deepEqual(sizes.get(50), sizes.get(CELL_COUNT));
});

test('a handler-only change visits the clone but produces no payload entry', () => {
  const committed = new Map<number, TestInstance>();
  const leaf = instance(5, 'view', { testID: 'leaf' }, [], 'handler A');
  const root = instance(1, 'view', {}, [leaf]);
  commitAll(committed, [], [root]);
  const handlerChanged = instance(1, 'view', {}, [instance(5, 'view', { testID: 'leaf' }, [], 'handler B')]);
  const built = buildCommit(committed, [1], [handlerChanged]);
  assert.equal(built.payload, undefined, 'no native call is needed');
  assert.equal(built.visited, 2);
  assert.equal(built.updates.get(5)?.note, 'handler B', 'the committed instance is replaced so events see the new handler');
});

test('a keyed reorder rewrites only the parent\'s child list', () => {
  const committed = new Map<number, TestInstance>();
  const a = instance(2, 'view', { testID: 'a' });
  const b = instance(3, 'view', { testID: 'b' });
  const c = instance(4, 'view', { testID: 'c' });
  const root = instance(1, 'view', {}, [a, b, c]);
  commitAll(committed, [], [root]);
  const built = buildCommit(committed, [1], [instance(1, 'view', {}, [c, a, b])]);
  assert.deepEqual(built.payload, { created: [], updated: [], children: [{ tag: 1, children: [4, 2, 3] }] });
  assert.equal(built.visited, 1, 'the unchanged children are skipped by identity');
});

test('removing and adding children rewrites the parent list; the removed instance is never visited', () => {
  const committed = new Map<number, TestInstance>();
  const a = instance(2, 'view', {});
  const b = instance(3, 'view', {});
  commitAll(committed, [], [instance(1, 'view', {}, [a, b])]);
  const removed = buildCommit(committed, [1], [instance(1, 'view', {}, [b])]);
  assert.deepEqual(removed.payload?.children, [{ tag: 1, children: [3] }]);
  assert.equal(removed.visited, 1);
  const added = buildCommit(committed, [1], [instance(1, 'view', {}, [a, b, instance(9, 'text', { text: 'new' })])]);
  assert.deepEqual(added.payload?.created, [{ tag: 9, kind: 'text', props: { text: 'new' } }]);
  assert.deepEqual(added.payload?.children, [{ tag: 1, children: [2, 3, 9] }]);
});

test('reparenting rewrites both parents\' lists and nothing else', () => {
  const committed = new Map<number, TestInstance>();
  const moved = instance(5, 'view', { testID: 'moved' });
  const left = instance(2, 'view', {}, [moved]);
  const right = instance(3, 'view', {});
  commitAll(committed, [], [instance(1, 'view', {}, [left, right])]);
  const built = buildCommit(committed, [1], [instance(1, 'view', {}, [instance(2, 'view', {}), instance(3, 'view', {}, [moved])])]);
  assert.deepEqual(built.payload?.created, []);
  assert.deepEqual(built.payload?.updated, []);
  assert.deepEqual(built.payload?.children, [{ tag: 2, children: [] }, { tag: 3, children: [5] }]);
  assert.equal(built.updates.has(5), false, 'the moved instance itself is unchanged');
});

test('a new subtree creates every node with full props and lists the children of each', () => {
  const committed = new Map<number, TestInstance>();
  const tree = instance(1, 'view', {}, [
    instance(2, 'view', { style: compileStyle('p-1') }, [instance(3, 'text', { text: 'hi', testID: 't' })]),
  ]);
  const built = buildCommit(committed, [], [tree]);
  assert.deepEqual(built.payload, {
    created: [
      { tag: 1, kind: 'view', props: {} },
      { tag: 2, kind: 'view', props: { style: compileStyle('p-1') } },
      { tag: 3, kind: 'text', props: { text: 'hi', testID: 't' } },
    ],
    updated: [],
    children: [{ tag: 1, children: [2] }, { tag: 2, children: [3] }, { tag: LAYER_ROOT_TAG, children: [1] }],
  });
  assert.equal(built.visited, 3);
  assert.deepEqual(built.rootTags, [1]);
});

test('the layer\'s own list changes with its top-level nodes, and only then', () => {
  const committed = new Map<number, TestInstance>();
  const a = instance(1, 'view', {});
  const b = instance(2, 'view', {});
  commitAll(committed, [], [a]);
  assert.deepEqual(buildCommit(committed, [1], [a]).payload, undefined);
  assert.deepEqual(buildCommit(committed, [1], [a, b]).payload?.children, [{ tag: 0, children: [1, 2] }]);
  assert.deepEqual(buildCommit(committed, [1], []).payload?.children, [{ tag: 0, children: [] }]);
});

test('structural mistakes fail loudly instead of reaching native', () => {
  const committed = new Map<number, TestInstance>();
  const duplicate = instance(2, 'view', {});
  assert.throws(() => buildCommit(committed, [], [instance(1, 'view', {}, [duplicate, duplicate])]), /twice/);
  const kindChanged = new Map([[1, instance(1, 'view', {})]]);
  assert.throws(() => buildCommit(kindChanged, [1], [instance(1, 'text', {})]), /changed kind from view to text/);
});

test('a rejected commit leaves the committed map alone, and the next walk starts from it', () => {
  const committed = new Map<number, TestInstance>();
  const leaf = instance(2, 'text', { text: 'Good' });
  commitAll(committed, [], [instance(1, 'view', {}, [leaf])]);
  const rejected = buildCommit(committed, [1], [instance(1, 'view', {}, [instance(2, 'text', { text: 'Rejected' })])]);
  assert.equal(rejected.payload?.updated.length, 1);
  // The renderer discards `updates` on a native error; nothing was written to `committed`.
  assert.equal(committed.get(2)?.native.text, 'Good');
  const recovered = buildCommit(committed, [1], [instance(1, 'view', {}, [instance(2, 'text', { text: 'Recovered' })])]);
  assert.deepEqual(recovered.payload?.updated, [{ tag: 2, props: { text: 'Recovered' } }]);
});

test('commit payloads match the native contract fixture, which the Rust tests parse and validate', () => {
  const committed = new Map<number, TestInstance>();
  const first = buildCommit(committed, [], [
    instance(1, 'view', { style: compileStyle('p-4 md:p-8 hover:bg-slate-100') }, [
      instance(2, 'text', { text: 'Title', style: compileStyle('text-lg text-white'), testID: 'title' }),
      instance(3, 'button', { disabled: true, testID: 'go', style: compileStyle('rounded-lg px-4 disabled:opacity-50') }, [
        instance(4, 'text', { text: 'Go' }),
      ]),
    ]),
  ]);
  assert.ok(first.payload);
  for (const [tag, node] of first.updates) committed.set(tag, node);
  const title = first.updates.get(2);
  const go = first.updates.get(3);
  const root = first.updates.get(1);
  assert.ok(title && go && root);
  const second = buildCommit(committed, first.rootTags, [
    instance(1, 'view', { style: compileStyle('p-4 md:p-8 hover:bg-slate-100') }, [
      instance(2, 'text', { text: 'Renamed', style: compileStyle('text-lg text-white') }),
      instance(3, 'button', { testID: 'go', style: compileStyle('rounded-lg px-4 disabled:opacity-50'), hidden: true }, go.children),
      instance(5, 'view', { style: compileStyle('w-4') }),
    ]),
  ]);
  const payloads: CommitPayload[] = [];
  assert.ok(second.payload);
  payloads.push(first.payload, second.payload);
  checkFixture('commit-payloads.json', payloads);
});
