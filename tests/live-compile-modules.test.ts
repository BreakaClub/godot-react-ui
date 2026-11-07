import assert from 'node:assert/strict';
import test from 'node:test';
import { ModuleRegistry, type RefreshHooks } from '../demo/src/live-compile-modules';
import type { CompileResult } from '../demo/src/live-compile-protocol';

// The module registry of the live code editor (demo/src/live-compile-modules.ts) against a compiler that is the identity: the "source"
// of each test file is already the function body the real compiler would make, so what is tested is the registry's own work: what a
// module sees of the others, what an edit changes, and what a failed edit leaves.

interface Registered {
  readonly id: string;
  readonly type: unknown;
}

function fakeRefresh(registered: Registered[]): RefreshHooks {
  return {
    createSignature: () => () => undefined,
    register: (type, id) => { registered.push({ id, type }); },
    // The Fast Refresh runtime's own rule is a capitalised function name; so is this stand-in's.
    isLikelyComponentType: type => typeof type === 'function' && /^[A-Z]/u.test(type.name),
  };
}

function compile(path: string, source: string): CompileResult {
  if (source.includes('SYNTAX ERROR')) return { ok: false, diagnostics: [{ start: 0, end: 1, line: 0, character: 0, severity: 'error', message: `cannot compile ${path}` }] };
  return { ok: true, code: source, imports: [], exports: [], diagnostics: [] };
}

function registry(files: Record<string, string>, registered: Registered[] = []): ModuleRegistry {
  return new ModuleRegistry({ files: new Map(Object.entries(files)), externals: { library: { answer: 42 } }, compile, refresh: fakeRefresh(registered) });
}

const EXPORT_VALUE = (value: string): string => `Object.defineProperty(exports, 'value', { enumerable: true, get: () => ${value} });`;

test('load evaluates a module and what it requires, and an import is the module\'s namespace', () => {
  const modules = registry({
    '/a.ts': `const b = require('./b'); const lib = require('library'); ${EXPORT_VALUE('b.value + lib.answer')}`,
    '/b.ts': EXPORT_VALUE('1'),
  });
  const loaded = modules.load('/a.ts');
  assert.ok(loaded.ok);
  assert.deepEqual(loaded.change.evaluated, ['/b.ts', '/a.ts']);
  assert.equal(modules.exportOf('/a.ts', 'value'), 43);
  assert.equal(modules.isLoaded('/b.ts'), true);
});

test('an edited module that exports more than components has its importers evaluated again', () => {
  const modules = registry({
    '/a.ts': `const b = require('./b'); ${EXPORT_VALUE('b.value')}`,
    '/b.ts': `${EXPORT_VALUE('1')} exports.component = function Component() {};`,
  });
  assert.ok(modules.load('/a.ts').ok);
  const edited = modules.prepare('/b.ts', `${EXPORT_VALUE('2')} exports.component = function Component() {};`);
  assert.ok(edited.ok);
  // b exports a constant besides its component: an importer may have read it when it ran, so the importer runs again.
  assert.deepEqual(edited.change.evaluated, ['/b.ts', '/a.ts']);
  assert.equal(modules.exportOf('/a.ts', 'value'), 2);
});

test('a module that exports components and nothing else is a boundary: its importers are not evaluated again', () => {
  const modules = registry({
    '/page.ts': `const widget = require('./widget'); exports.Page = function Page() { return widget.Widget(); };`,
    '/widget.ts': `exports.Widget = function Widget() { return 'old'; };`,
  });
  assert.ok(modules.load('/page.ts').ok);
  assert.equal((modules.exportOf('/page.ts', 'Page') as () => string)(), 'old');
  const edited = modules.prepare('/widget.ts', `exports.Widget = function Widget() { return 'new'; };`);
  assert.ok(edited.ok);
  assert.deepEqual(edited.change.evaluated, ['/widget.ts']);
  // The importer was not run again, and reads the new module through its namespace.
  assert.equal((modules.exportOf('/page.ts', 'Page') as () => string)(), 'new');
});

test('a compile error changes nothing', () => {
  const modules = registry({ '/a.ts': EXPORT_VALUE('1') });
  assert.ok(modules.load('/a.ts').ok);
  const failed = modules.prepare('/a.ts', 'SYNTAX ERROR');
  assert.equal(failed.ok, false);
  assert.ok(!failed.ok && failed.phase === 'compile' && failed.diagnostics.length === 1);
  assert.equal(modules.exportOf('/a.ts', 'value'), 1);
  assert.equal(modules.sourceOf('/a.ts'), EXPORT_VALUE('1'));
});

test('a module that throws when it runs changes nothing, and registers nothing', () => {
  const registered: Registered[] = [];
  const modules = registry({
    '/a.ts': `const b = require('./b'); ${EXPORT_VALUE('b.value')}`,
    '/b.ts': `${EXPORT_VALUE('1')} $RefreshReg$(exports, 'b');`,
  }, registered);
  const loaded = modules.load('/a.ts');
  assert.ok(loaded.ok);
  loaded.change.register();
  assert.equal(registered.length, 1);
  const failed = modules.prepare('/b.ts', `${EXPORT_VALUE('2')} $RefreshReg$(exports, 'b'); throw new Error('boom');`);
  assert.ok(!failed.ok && failed.phase === 'evaluate' && failed.error.message === 'boom' && failed.path === '/b.ts');
  assert.equal(modules.exportOf('/a.ts', 'value'), 1, 'the importer still reads the module that worked');
  assert.equal(registered.length, 1, 'nothing was registered by the failed evaluation');
});

test('a dependency that throws is named, and the edited module is not left half swapped', () => {
  const modules = registry({
    '/a.ts': `const b = require('./b'); ${EXPORT_VALUE('b.value')}`,
    '/b.ts': EXPORT_VALUE('1'),
    '/c.ts': `throw new Error('c fails');`,
  });
  assert.ok(modules.load('/a.ts').ok);
  const failed = modules.prepare('/a.ts', `const c = require('./c'); ${EXPORT_VALUE('c.value')}`);
  assert.ok(!failed.ok && failed.phase === 'evaluate' && failed.path === '/c.ts' && failed.error.message === 'c fails');
  assert.equal(modules.exportOf('/a.ts', 'value'), 1);
  assert.equal(modules.isLoaded('/c.ts'), false);
});

test('revert puts the previous modules back, and evaluating their source again makes functions Fast Refresh has not seen', () => {
  const registered: Registered[] = [];
  const modules = registry({ '/a.ts': `exports.A = function A() {}; $RefreshReg$(exports.A, 'A');` }, registered);
  const loaded = modules.load('/a.ts');
  assert.ok(loaded.ok);
  loaded.change.register();
  const before = modules.exportOf('/a.ts', 'A');
  const edited = modules.prepare('/a.ts', `exports.A = function A() { return 1; }; $RefreshReg$(exports.A, 'A');`);
  assert.ok(edited.ok);
  edited.change.register();
  assert.notEqual(modules.exportOf('/a.ts', 'A'), before);
  edited.change.revert();
  assert.equal(modules.exportOf('/a.ts', 'A'), before, 'importers read the previous instance again');
  assert.equal(registered.length, 2, 'and Fast Refresh was told nothing');
  const again = modules.prepare('/a.ts', modules.sourceOf('/a.ts'));
  assert.ok(again.ok);
  again.change.register();
  assert.equal(registered.length, 3);
  assert.notEqual(registered[2]?.type, before, 'the previous source gives a function of its own, which the family can be given');
  assert.equal(registered[2]?.id, '/a.ts A');
});

test('a cycle of imports loads, and each side reads the other once it has run', () => {
  const modules = registry({
    '/a.ts': `const b = require('./b'); Object.defineProperty(exports, 'name', { enumerable: true, get: () => 'a' }); Object.defineProperty(exports, 'other', { enumerable: true, get: () => b.name });`,
    '/b.ts': `const a = require('./a'); Object.defineProperty(exports, 'name', { enumerable: true, get: () => 'b' }); Object.defineProperty(exports, 'other', { enumerable: true, get: () => a.name });`,
  });
  assert.ok(modules.load('/a.ts').ok);
  assert.equal(modules.exportOf('/a.ts', 'other'), 'b');
  assert.equal(modules.exportOf('/b.ts', 'other'), 'a');
});

test('a module namespace is read-only and lists the module\'s exports', () => {
  const modules = registry({ '/a.ts': `exports.one = 1; exports.two = 2;`, '/b.ts': `const a = require('./a'); exports.names = Object.keys(a); exports.write = () => { a.one = 5; };` });
  assert.ok(modules.load('/b.ts').ok);
  assert.deepEqual(modules.exportOf('/b.ts', 'names'), ['one', 'two']);
  assert.throws(() => (modules.exportOf('/b.ts', 'write') as () => void)(), /read-only/u);
});

test('a specifier the project and the demo do not have is an error that names both', () => {
  const modules = registry({ '/a.ts': `require('missing-package');`, '/b.ts': `require('./nope');` });
  const bare = modules.load('/a.ts');
  assert.ok(!bare.ok && bare.phase === 'evaluate' && /missing-package/u.test(bare.error.message));
  const relative = modules.load('/b.ts');
  assert.ok(!relative.ok && relative.phase === 'evaluate' && /\.\/nope/u.test(relative.error.message));
});

test('relative specifiers find files by extension and directory index, and an alias means an external', () => {
  const modules = new ModuleRegistry({
    files: new Map([
      ['/p/lab/a.tsx', `const data = require('./data'); const dir = require('../dir'); const src = require('../../src'); exports.sum = data.n + dir.n + src.answer;`],
      ['/p/lab/data.ts', 'exports.n = 1;'],
      ['/p/dir/index.ts', 'exports.n = 2;'],
    ]),
    externals: { library: { answer: 100 } },
    aliases: { '../../src': 'library' },
    compile,
    refresh: fakeRefresh([]),
  });
  assert.ok(modules.load('/p/lab/a.tsx').ok);
  assert.equal(modules.exportOf('/p/lab/a.tsx', 'sum'), 103);
});

test('a file that has not been loaded only takes the new text', () => {
  const modules = registry({ '/a.ts': EXPORT_VALUE('1'), '/b.ts': EXPORT_VALUE('2') });
  assert.ok(modules.load('/a.ts').ok);
  const edited = modules.prepare('/b.ts', EXPORT_VALUE('3'));
  assert.ok(edited.ok);
  assert.deepEqual(edited.change.evaluated, []);
  assert.equal(modules.isLoaded('/b.ts'), false);
  assert.equal(modules.sourceOf('/b.ts'), EXPORT_VALUE('3'));
});
