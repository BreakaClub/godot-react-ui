import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as library from '../src';
import { View, createRoot } from '../src';
import { LiveSession } from '../demo/src/live-compile-session';
import { installRefreshHook, performRefresh, refreshHooks } from '../demo/src/live-compile-refresh';
import type { Project } from '../demo/src/live-compile-project';
import { cliHost, NEEDS_CLI } from './live-compile-cli-host';
import { NO_SUBSCRIPTION, RecordingHost } from './recording-host';

// A live session rendered inside a tree the caller owns (`LiveSession.Lab`), against the real transpiler (the godot-tsc package's `godot-tsc-cli`
// process), the real React, the library's reconciler and the production Fast Refresh family proxy. The cases are the ones a family
// proxy that re-renders only from the root gets wrong: a component React skips because its props did not change, and an element a
// parent kept. Needs `godot-tsc-cli` (tests/live-compile-cli-host.ts).

const LAB_PATH = '/project/lab/memo-lab.tsx';
const ROW_PATH = '/project/lab/row.tsx';
const TILE_PATH = '/project/lab/tile.tsx';
const TILE_BODY_PATH = '/project/lab/tile-body.tsx';

const LAB_SOURCE = `import { useMemo, useState } from 'react';
import { Button, Text, View } from 'godot-react-ui';
import { Row } from './row';
import { Tile } from './tile';

function Heavy() {
  return <Text testID="heavy">Heavy v1</Text>;
}

export function MemoLab() {
  const [clicks, setClicks] = useState(0);
  const heavy = useMemo(() => <Heavy />, []);
  return (
    <View testID="memo-lab">
      {heavy}
      <Row label="row" />
      <Tile label="tile" />
      <Button testID="parent-click" onClick={() => setClicks(clicks + 1)}><Text>{\`parent \${clicks}\`}</Text></Button>
    </View>
  );
}
`;

const ROW_SOURCE = `import { memo, useState } from 'react';
import { Button, Text } from 'godot-react-ui';

export const Row = memo(function Row({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  return <Button testID="row" onClick={() => setCount(count + 1)}><Text>{\`\${label} v1 \${count}\`}</Text></Button>;
});
`;

// A memo'd component whose body is in another module: the module that makes the wrapper is not the one that is edited.
const TILE_SOURCE = `import { memo } from 'react';
import { TileBody } from './tile-body';

export const Tile = memo(TileBody);
`;

const TILE_BODY_SOURCE = `import { useState } from 'react';
import { Button, Text } from 'godot-react-ui';

export function TileBody({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  return <Button testID="tile" onClick={() => setCount(count + 1)}><Text>{\`\${label} v1 \${count}\`}</Text></Button>;
}
`;

const host = cliHost();

const project: Project = {
  version: 1,
  libDir: '/libs',
  files: [
    { path: LAB_PATH, text: LAB_SOURCE }, { path: ROW_PATH, text: ROW_SOURCE }, { path: TILE_PATH, text: TILE_SOURCE }, { path: TILE_BODY_PATH, text: TILE_BODY_SOURCE },
  ],
  labs: { memo: { config: '/project/tsconfig.memo.json', sources: [LAB_PATH, ROW_PATH, TILE_PATH, TILE_BODY_PATH] } },
};

installRefreshHook();
const fakeHost = new RecordingHost();
const uiRoot = createRoot(fakeHost, { subscribeToEvents: NO_SUBSCRIPTION, onError: () => {} });
const session = new LiveSession({
  host, project, labId: 'memo', exportName: 'MemoLab', root: uiRoot, embedded: true,
  externals: { react: React, 'react/jsx-runtime': jsxRuntime, 'godot-react-ui': library },
  aliases: {}, refresh: refreshHooks, performRefresh, now: () => 0,
});

function textOf(testID: string): string {
  const tag = fakeHost.findByTestId(testID);
  assert.ok(tag > 0, `${testID} is on the page`);
  const collect = (id: number): string => {
    const entry = fakeHost.nodes.get(id);
    return (entry?.text ?? '') + (entry?.children ?? []).map(collect).join('');
  };
  return collect(tag);
}

function press(testID: string): void {
  fakeHost.event(fakeHost.findByTestId(testID), 'click');
  uiRoot.dispatchEvents();
}

test('the lab renders inside the caller\'s tree', { skip: NEEDS_CLI }, async () => {
  await session.open();
  uiRoot.render(React.createElement(View, { testID: 'stage' }, React.createElement(session.Lab)));
  assert.equal(textOf('heavy'), 'Heavy v1');
  assert.equal(textOf('row'), 'row v1 0');
  assert.ok(fakeHost.findByTestId('stage') > 0 && fakeHost.findByTestId('memo-lab') > 0, 'the lab is under the caller\'s stage');
  press('row');
  press('row');
  press('parent-click');
  assert.equal(textOf('row'), 'row v1 2');
  assert.equal(textOf('parent-click'), 'parent 1');
});

test('an edit is on the page when update returns, and state is kept', { skip: NEEDS_CLI }, async () => {
  const report = await session.update(LAB_PATH, LAB_SOURCE.replace('parent ${clicks}', 'parent! ${clicks}'));
  assert.equal(report.outcome, 'swapped', report.error);
  assert.equal(textOf('parent-click'), 'parent! 1', 'committed before update returned: no frame, no microtask in between');
  assert.equal(textOf('row'), 'row v1 2', 'and the memo\'d row kept its count');
});

test('an element the parent kept (useMemo) runs the new code of its component', { skip: NEEDS_CLI }, async () => {
  const report = await session.update(LAB_PATH, LAB_SOURCE.replace('Heavy v1', 'Heavy v2'));
  assert.equal(report.outcome, 'swapped', report.error);
  assert.equal(textOf('heavy'), 'Heavy v2', 'a subtree React would skip still shows the edited component');
  assert.equal(textOf('parent-click'), 'parent 1', 'the parent kept its state');
});

test('a memo\'d component that React would skip runs the new code, and keeps its state', { skip: NEEDS_CLI }, async () => {
  const report = await session.update(ROW_PATH, ROW_SOURCE.replace(' v1 ', ' v2 '));
  assert.equal(report.outcome, 'swapped', report.error);
  assert.equal(textOf('row'), 'row v2 2', 'the memo\'d row shows the edited text with its count');
  press('row');
  assert.equal(textOf('row'), 'row v2 3');
});

test('a memo whose body another module defines shows the body\'s new code, and keeps its state', { skip: NEEDS_CLI }, async () => {
  press('tile');
  press('tile');
  press('tile');
  assert.equal(textOf('tile'), 'tile v1 3');
  const report = await session.update(TILE_BODY_PATH, TILE_BODY_SOURCE.replace(' v1 ', ' v2 '));
  assert.equal(report.outcome, 'swapped', report.error);
  assert.deepEqual(report.evaluated, [TILE_BODY_PATH], 'only the edited module ran again: the memo is in an importer that was not');
  assert.equal(textOf('tile'), 'tile v2 3');
});

test('a changed hook order inside a memo\'d component starts its state again and does not crash', { skip: NEEDS_CLI }, async () => {
  const reordered = ROW_SOURCE.replace(' v1 ', ' v3 ').replace('const [count, setCount] = useState(0);', 'const [extra] = useState(0);\n  const [count, setCount] = useState(0);');
  const report = await session.update(ROW_PATH, reordered);
  assert.equal(report.outcome, 'swapped', report.error);
  assert.equal(textOf('row'), 'row v3 0');
  press('row');
  assert.equal(textOf('row'), 'row v3 1');
});
