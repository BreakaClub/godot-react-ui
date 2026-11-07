import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h } from 'react';

// The renderer registers with `__REACT_DEVTOOLS_GLOBAL_HOOK__` when a page installed one before the first root, as every React renderer does
// (src/renderer.ts, `injectIntoDevTools`): React DevTools and React Fast Refresh (the live code editor) work through that hook. Own file: the
// registration happens once for the process, at its first `createRoot`, so what this sees is that first root's.

interface Injected {
  readonly bundleType: number;
  readonly version: string;
  readonly rendererPackageName: string;
  readonly scheduleRefresh?: unknown;
  readonly setRefreshHandler?: unknown;
}

const injected: Injected[] = [];
const commits: unknown[] = [];
Object.defineProperty(globalThis, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
  configurable: true,
  value: {
    supportsFiber: true,
    isDisabled: false,
    renderers: new Map(),
    inject(internals: Injected): number {
      injected.push(internals);
      return injected.length;
    },
    onCommitFiberRoot(_id: number, root: unknown) { commits.push(root); },
    onScheduleFiberRoot() {},
    onCommitFiberUnmount() {},
  },
});

test('the first root registers the renderer with the DevTools hook, and a commit reaches it', async () => {
  const { View, createRoot } = await import('../src');
  const { RecordingHost, NO_SUBSCRIPTION } = await import('./recording-host');
  assert.equal(injected.length, 0, 'nothing registers before a root exists: the hook can be installed any time before it');
  const root = createRoot(new RecordingHost(), { subscribeToEvents: NO_SUBSCRIPTION });
  assert.equal(injected.length, 1);
  assert.equal(injected[0]?.rendererPackageName, 'godot-react-ui');
  assert.equal(injected[0]?.bundleType, 1, 'a development bundle: the one with the refresh entry points');
  assert.match(injected[0]?.version ?? '', /^19\./u);
  assert.equal(typeof injected[0]?.scheduleRefresh, 'function');
  assert.equal(typeof injected[0]?.setRefreshHandler, 'function');
  root.render(h(View, { testID: 'page' }));
  assert.ok(commits.length > 0, 'a commit is reported to the hook');
  createRoot(new RecordingHost(), { subscribeToEvents: NO_SUBSCRIPTION });
  assert.equal(injected.length, 1, 'later roots do not register again');
});
