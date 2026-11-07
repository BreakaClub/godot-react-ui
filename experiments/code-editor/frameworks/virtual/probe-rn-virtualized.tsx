// Tries to run React Native's own VirtualizedList (@react-native/virtualized-lists 0.88.1) inside godot-react-ui.
// The package ships Flow source, so it is (1) Flow-stripped with flow-remove-types inside an esbuild bundle (in memory), and
// (2) given a `react-native` alias module (rn-shim.tsx) backed by our View/ScrollView. Rows use getItemLayout (fixed 20 px), since
// godot-react-ui has no onLayout. Reports what window renders and what a scroll does.
//
//   node_modules/.bin/tsx experiments/code-editor/frameworks/virtual/probe-rn-virtualized.tsx
import { createElement as h, type ReactElement } from 'react';
import Module from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';
import { Text } from '../../../../src';
import { mountScrolling, settle } from '../lib/scroll-host';
import { installAlias } from './alias.cjs';
import { GodotRnScroll } from './rn-shim';

const ROWS = 1000;
const ROW_HEIGHT = 20;
const here = __dirname;
const flowRemoveTypes: (source: string, options: { all: boolean; pretty: boolean }) => { toString(): string } = require('flow-remove-types');

async function bundleVirtualizedLists(): Promise<unknown> {
  const root = path.join(here, 'node_modules', '@react-native', 'virtualized-lists');
  const result = await esbuild.build({
    entryPoints: [path.join(root, 'index.js')], bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
    // `__DEV__` is a global Metro defines; the package reads it at load.
    define: { __DEV__: 'false' },
    // StateSafePureComponent defines `state` with Object.defineProperty; Metro/Babel compile class fields as assignments, esbuild
    // defines them ([[Define]]) unless told otherwise, and the two collide ("Cannot redefine property: state").
    tsconfigRaw: { compilerOptions: { useDefineForClassFields: false, jsx: 'react' } },
    external: ['react', 'react-native', 'react-native/react-private-interface'],
    nodePaths: [path.join(here, 'node_modules')],
    plugins: [{
      name: 'flow',
      setup(build) {
        build.onLoad({ filter: /virtualized-lists[\\/].*\.js$/ }, (args) => {
          const source = fs.readFileSync(args.path, 'utf8');
          return { contents: flowRemoveTypes(source, { all: true, pretty: true }).toString(), loader: 'tsx', resolveDir: path.dirname(args.path) };
        });
      },
    }],
  });
  const code = result.outputFiles[0]?.text ?? '';
  const filename = path.join(here, 'virtualized-lists.bundle.js'); // never written; only the module's resolution base
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = (Module as unknown as { _nodeModulePaths(dir: string): string[] })._nodeModulePaths(here);
  (loaded as unknown as { _compile(code: string, filename: string): void })._compile(code, filename);
  console.log(`bundled + Flow-stripped in memory: ${(code.length / 1024).toFixed(0)} KiB, warnings ${result.warnings.length}`);
  return loaded.exports;
}

async function main(): Promise<void> {
  installAlias('react-native', require.resolve('./rn-shim'));
  installAlias('react-native/react-private-interface', require.resolve('./rn-shim'));
  const lists = await bundleVirtualizedLists() as { default: { VirtualizedList: React.ComponentType<Record<string, unknown>> } };
  const VirtualizedList = lists.default.VirtualizedList;
  console.log('VirtualizedList loaded:', typeof VirtualizedList);

  const data = Array.from({ length: ROWS }, (_, index) => `${index + 1}`.padStart(4, ' ') + `  line ${index}`);
  let listRef: { scrollToIndex(params: { index: number; animated?: boolean }): void } | null = null;
  function List(): ReactElement {
    return h(VirtualizedList, {
      ref: (value: typeof listRef) => { listRef = value; },
      data, getItemCount: (items: string[]) => items.length, getItem: (items: string[], index: number) => items[index],
      keyExtractor: (_: string, index: number) => String(index),
      getItemLayout: (_: unknown, index: number) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index }),
      renderItem: ({ item }: { item: string }) => h(Text, { style: { height: ROW_HEIGHT } }, item),
      renderScrollComponent: (props: Record<string, unknown>) => h(GodotRnScroll, { ...props, testID: 'scroller', style: { width: 600, height: 400 } }),
      initialNumToRender: 20, windowSize: 5, maxToRenderPerBatch: 20, updateCellsBatchingPeriod: 1,
    });
  }
  let contentHeight = ROWS * ROW_HEIGHT;
  const m = await mountScrolling(h(List), (host) => {
    host.defineContainer('scroller', { clientWidth: 600, clientHeight: 400, contentHeight: () => contentHeight });
  });
  await settle(6);
  const numbers = () => m.texts().map((t) => Number.parseInt(t.trim(), 10)).filter(Number.isFinite);
  const span = () => { const n = numbers(); return n.length ? `${n[0]}..${n[n.length - 1]} (${n.length} rows)` : 'none'; };
  console.log('render errors', m.errors.map((e) => e.message.split('\n')[0]));
  console.log('initial:', span(), '| nodes', m.nodeCount(), '| commits', m.commitCount(), 'bytes', m.commitBytes());

  let mark = m.commitCount();
  m.host.userScrollTo(m.root, 'scroller', 5000);
  await settle(8);
  console.log('after scroll to 5000:', span(), '| nodes', m.nodeCount(), '| commits +', m.commitCount() - mark, 'bytes', m.commitBytes(mark));

  mark = m.commitCount();
  m.host.userScrollTo(m.root, 'scroller', 5020);
  await settle(8);
  console.log('after a one-row step:', span(), '| commits +', m.commitCount() - mark, 'bytes', m.commitBytes(mark));

  const requestsBefore = m.host.scrollRequests.length;
  listRef?.scrollToIndex({ index: 700, animated: false });
  console.log('scrollToIndex(700) -> handle requests', m.host.scrollRequests.slice(requestsBefore));
  m.root.dispatchEvents();
  await settle(8);
  console.log('after delivery:', span());
  m.unmount();
  await settle();
  console.log('errors at the end', m.errors.map((e) => e.message.split('\n')[0]));
  contentHeight = 0;
}
main().catch((error) => { console.error('probe failed:', error); process.exitCode = 1; });
