import assert from 'node:assert/strict';
import test from 'node:test';
import { ModuleRegistry, type RefreshHooks } from '../demo/src/live-compile-modules';
import type { CompileResult } from '../demo/src/live-compile-protocol';
import { RequestCancelled, RequestScope } from '../demo/src/live-compile-scope';

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

/** What the real compiler reports as a file's imports: the specifiers of the `require` calls in the function body it made. */
function importsOf(source: string): string[] {
  return [...new Set([...source.matchAll(/require\('([^']+)'\)/gu)].map(match => match[1] ?? ''))];
}

/** The compiler as the registry asks it: answered later, from a stand-in that makes no change to the source. */
function compile(path: string, source: string, scope: RequestScope): Promise<CompileResult> {
  scope.throwIfCancelled();
  if (source.includes('SYNTAX ERROR')) return Promise.resolve({ ok: false, diagnostics: [{ start: 0, end: 1, line: 0, character: 0, severity: 'error', message: `cannot compile ${path}` }] });
  return Promise.resolve({ ok: true, code: source, imports: importsOf(source), exports: [], diagnostics: [] });
}

const scope = (): RequestScope => new RequestScope();

function registry(files: Record<string, string>, registered: Registered[] = []): ModuleRegistry {
  return new ModuleRegistry({ files: new Map(Object.entries(files)), externals: { library: { answer: 42 } }, compile, refresh: fakeRefresh(registered) });
}

const EXPORT_VALUE = (value: string): string => `Object.defineProperty(exports, 'value', { enumerable: true, get: () => ${value} });`;

test('load evaluates a module and what it requires, and an import is the module\'s namespace', async () => {
  const modules = registry({
    '/a.ts': `const b = require('./b'); const lib = require('library'); ${EXPORT_VALUE('b.value + lib.answer')}`,
    '/b.ts': EXPORT_VALUE('1'),
  });
  const loaded = await modules.load('/a.ts', scope());
  assert.ok(loaded.ok);
  assert.deepEqual(loaded.change.evaluated, ['/b.ts', '/a.ts']);
  assert.equal(modules.exportOf('/a.ts', 'value'), 43);
  assert.equal(modules.isLoaded('/b.ts'), true);
});

test('an edited module that exports more than components has its importers evaluated again', async () => {
  const modules = registry({
    '/a.ts': `const b = require('./b'); ${EXPORT_VALUE('b.value')}`,
    '/b.ts': `${EXPORT_VALUE('1')} exports.component = function Component() {};`,
  });
  assert.ok((await modules.load('/a.ts', scope())).ok);
  const edited = await modules.prepare('/b.ts', `${EXPORT_VALUE('2')} exports.component = function Component() {};`, scope());
  assert.ok(edited.ok);
  // b exports a constant besides its component: an importer may have read it when it ran, so the importer runs again.
  assert.deepEqual(edited.change.evaluated, ['/b.ts', '/a.ts']);
  assert.equal(modules.exportOf('/a.ts', 'value'), 2);
});

test('a module that exports components and nothing else is a boundary: its importers are not evaluated again', async () => {
  const modules = registry({
    '/page.ts': `const widget = require('./widget'); exports.Page = function Page() { return widget.Widget(); };`,
    '/widget.ts': `exports.Widget = function Widget() { return 'old'; };`,
  });
  assert.ok((await modules.load('/page.ts', scope())).ok);
  assert.equal((modules.exportOf('/page.ts', 'Page') as () => string)(), 'old');
  const edited = await modules.prepare('/widget.ts', `exports.Widget = function Widget() { return 'new'; };`, scope());
  assert.ok(edited.ok);
  assert.deepEqual(edited.change.evaluated, ['/widget.ts']);
  // The importer was not run again, and reads the new module through its namespace.
  assert.equal((modules.exportOf('/page.ts', 'Page') as () => string)(), 'new');
});

test('a compile error changes nothing', async () => {
  const modules = registry({ '/a.ts': EXPORT_VALUE('1') });
  assert.ok((await modules.load('/a.ts', scope())).ok);
  const failed = await modules.prepare('/a.ts', 'SYNTAX ERROR', scope());
  assert.equal(failed.ok, false);
  assert.ok(!failed.ok && failed.phase === 'compile' && failed.diagnostics.length === 1);
  assert.equal(modules.exportOf('/a.ts', 'value'), 1);
  assert.equal(modules.sourceOf('/a.ts'), EXPORT_VALUE('1'));
});

test('a module that throws when it runs changes nothing, and registers nothing', async () => {
  const registered: Registered[] = [];
  const modules = registry({
    '/a.ts': `const b = require('./b'); ${EXPORT_VALUE('b.value')}`,
    '/b.ts': `${EXPORT_VALUE('1')} $RefreshReg$(exports, 'b');`,
  }, registered);
  const loaded = await modules.load('/a.ts', scope());
  assert.ok(loaded.ok);
  loaded.change.register();
  assert.equal(registered.length, 1);
  const failed = await modules.prepare('/b.ts', `${EXPORT_VALUE('2')} $RefreshReg$(exports, 'b'); throw new Error('boom');`, scope());
  assert.ok(!failed.ok && failed.phase === 'evaluate' && failed.error.message === 'boom' && failed.path === '/b.ts');
  assert.equal(modules.exportOf('/a.ts', 'value'), 1, 'the importer still reads the module that worked');
  assert.equal(registered.length, 1, 'nothing was registered by the failed evaluation');
});

test('a dependency that throws is named, and the edited module is not left half swapped', async () => {
  const modules = registry({
    '/a.ts': `const b = require('./b'); ${EXPORT_VALUE('b.value')}`,
    '/b.ts': EXPORT_VALUE('1'),
    '/c.ts': `throw new Error('c fails');`,
  });
  assert.ok((await modules.load('/a.ts', scope())).ok);
  const failed = await modules.prepare('/a.ts', `const c = require('./c'); ${EXPORT_VALUE('c.value')}`, scope());
  assert.ok(!failed.ok && failed.phase === 'evaluate' && failed.path === '/c.ts' && failed.error.message === 'c fails');
  assert.equal(modules.exportOf('/a.ts', 'value'), 1);
  assert.equal(modules.isLoaded('/c.ts'), false);
});

test('revert puts the previous modules back, and evaluating their source again makes functions Fast Refresh has not seen', async () => {
  const registered: Registered[] = [];
  const modules = registry({ '/a.ts': `exports.A = function A() {}; $RefreshReg$(exports.A, 'A');` }, registered);
  const loaded = await modules.load('/a.ts', scope());
  assert.ok(loaded.ok);
  loaded.change.register();
  const before = modules.exportOf('/a.ts', 'A');
  const edited = await modules.prepare('/a.ts', `exports.A = function A() { return 1; }; $RefreshReg$(exports.A, 'A');`, scope());
  assert.ok(edited.ok);
  edited.change.register();
  assert.notEqual(modules.exportOf('/a.ts', 'A'), before);
  edited.change.revert();
  assert.equal(modules.exportOf('/a.ts', 'A'), before, 'importers read the previous instance again');
  assert.equal(registered.length, 2, 'and Fast Refresh was told nothing');
  const again = modules.reload('/a.ts');
  assert.ok(again.ok);
  again.change.register();
  assert.equal(registered.length, 3);
  assert.notEqual(registered[2]?.type, before, 'the previous source gives a function of its own, which the family can be given');
  assert.equal(registered[2]?.id, '/a.ts A');
});

test('a cycle of imports loads, and each side reads the other once it has run', async () => {
  const modules = registry({
    '/a.ts': `const b = require('./b'); Object.defineProperty(exports, 'name', { enumerable: true, get: () => 'a' }); Object.defineProperty(exports, 'other', { enumerable: true, get: () => b.name });`,
    '/b.ts': `const a = require('./a'); Object.defineProperty(exports, 'name', { enumerable: true, get: () => 'b' }); Object.defineProperty(exports, 'other', { enumerable: true, get: () => a.name });`,
  });
  assert.ok((await modules.load('/a.ts', scope())).ok);
  assert.equal(modules.exportOf('/a.ts', 'other'), 'b');
  assert.equal(modules.exportOf('/b.ts', 'other'), 'a');
});

test('a module namespace is read-only and lists the module\'s exports', async () => {
  const modules = registry({ '/a.ts': `exports.one = 1; exports.two = 2;`, '/b.ts': `const a = require('./a'); exports.names = Object.keys(a); exports.write = () => { a.one = 5; };` });
  assert.ok((await modules.load('/b.ts', scope())).ok);
  assert.deepEqual(modules.exportOf('/b.ts', 'names'), ['one', 'two']);
  assert.throws(() => (modules.exportOf('/b.ts', 'write') as () => void)(), /read-only/u);
});

test('a specifier the project and the demo do not have is an error that names both', async () => {
  const modules = registry({ '/a.ts': `require('missing-package');`, '/b.ts': `require('./nope');` });
  const bare = await modules.load('/a.ts', scope());
  assert.ok(!bare.ok && bare.phase === 'evaluate' && /missing-package/u.test(bare.error.message));
  const relative = await modules.load('/b.ts', scope());
  assert.ok(!relative.ok && relative.phase === 'evaluate' && /\.\/nope/u.test(relative.error.message));
});

test('relative specifiers find files by extension and directory index, and an alias means an external', async () => {
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
  assert.ok((await modules.load('/p/lab/a.tsx', scope())).ok);
  assert.equal(modules.exportOf('/p/lab/a.tsx', 'sum'), 103);
});

test('a file that has not been loaded only takes the new text', async () => {
  const modules = registry({ '/a.ts': EXPORT_VALUE('1'), '/b.ts': EXPORT_VALUE('2') });
  assert.ok((await modules.load('/a.ts', scope())).ok);
  const edited = await modules.prepare('/b.ts', EXPORT_VALUE('3'), scope());
  assert.ok(edited.ok);
  assert.deepEqual(edited.change.evaluated, []);
  assert.equal(modules.isLoaded('/b.ts'), false);
  assert.equal(modules.sourceOf('/b.ts'), EXPORT_VALUE('3'));
});

test('everything a module requires is compiled before any module runs: a body never waits for the compiler', async () => {
  const trace: string[] = [];
  Object.assign(globalThis, { registryTrace: trace });
  const files = new Map([
    ['/a.ts', `registryTrace.push('run a'); const b = require('./b'); const c = require('./c'); exports.v = b.n + c.n;`],
    ['/b.ts', `registryTrace.push('run b'); const d = require('./d'); exports.n = d.n + 1;`],
    ['/c.ts', `registryTrace.push('run c'); exports.n = 10;`],
    ['/d.ts', `registryTrace.push('run d'); exports.n = 100;`],
  ]);
  const modules = new ModuleRegistry({
    files, externals: {}, refresh: fakeRefresh([]),
    compile: (path, source, requestScope) => { trace.push(`compile ${path}`); return compile(path, source, requestScope); },
  });
  const loaded = await modules.load('/a.ts', scope());
  assert.ok(loaded.ok);
  assert.equal(modules.exportOf('/a.ts', 'v'), 111);
  // The file, then the files it imports together, then theirs: the compiler reports each file's imports.
  assert.deepEqual(trace, ['compile /a.ts', 'compile /b.ts', 'compile /c.ts', 'compile /d.ts', 'run a', 'run b', 'run d', 'run c']);
  Reflect.deleteProperty(globalThis, 'registryTrace');
});

test('a module that is loaded is not compiled again for the module that imports it', async () => {
  const requested: string[] = [];
  const modules = new ModuleRegistry({
    files: new Map([['/a.ts', `const b = require('./b'); exports.v = b.n;`], ['/b.ts', 'exports.n = 1;']]),
    externals: {}, refresh: fakeRefresh([]),
    compile: (path, source, requestScope) => { requested.push(path); return compile(path, source, requestScope); },
  });
  assert.ok((await modules.load('/a.ts', scope())).ok);
  requested.length = 0;
  const edited = await modules.prepare('/a.ts', `const b = require('./b'); exports.v = b.n + 1;`, scope());
  assert.ok(edited.ok);
  assert.deepEqual(requested, ['/a.ts'], 'only the edited file is compiled: b is loaded');
  assert.equal(modules.exportOf('/a.ts', 'v'), 2);
});

test('a scope cancelled while the compiler works fails the prepare as cancelled and evaluates nothing', async () => {
  const trace: string[] = [];
  Object.assign(globalThis, { registryTrace: trace });
  const modules = new ModuleRegistry({
    files: new Map([['/a.ts', `registryTrace.push('run a'); exports.v = 1;`]]),
    externals: {}, refresh: fakeRefresh([]),
    // The service answers, and the work was given up at the same moment: the answer must not be applied.
    compile: (path, source, requestScope) => { const answered = compile(path, source, requestScope); requestScope.cancel(); return answered; },
  });
  await assert.rejects(modules.load('/a.ts', scope()), RequestCancelled);
  assert.deepEqual(trace, [], 'no module body ran');
  assert.equal(modules.isLoaded('/a.ts'), false);
  Reflect.deleteProperty(globalThis, 'registryTrace');
});

test('a scope cancelled while a dependency is being compiled fails the prepare as cancelled and changes nothing', async () => {
  const modules = new ModuleRegistry({
    files: new Map([['/a.ts', EXPORT_VALUE('1')], ['/b.ts', EXPORT_VALUE('2')]]),
    externals: {}, refresh: fakeRefresh([]),
    compile: (path, source, requestScope) => (path === '/b.ts' ? Promise.reject(new RequestCancelled()) : compile(path, source, requestScope)),
  });
  assert.ok((await modules.load('/a.ts', scope())).ok);
  await assert.rejects(modules.prepare('/a.ts', `const b = require('./b'); ${EXPORT_VALUE('b.value')}`, scope()), RequestCancelled);
  assert.equal(modules.exportOf('/a.ts', 'value'), 1, 'the module that worked is still the one importers read');
  assert.equal(modules.isLoaded('/b.ts'), false);
});

test('a dependency that does not compile is the failure of the module that needs it, named, with nothing left half swapped', async () => {
  const modules = registry({ '/a.ts': EXPORT_VALUE('1'), '/b.ts': 'SYNTAX ERROR' });
  assert.ok((await modules.load('/a.ts', scope())).ok);
  const failed = await modules.prepare('/a.ts', `const b = require('./b'); ${EXPORT_VALUE('b.value')}`, scope());
  assert.ok(!failed.ok && failed.phase === 'evaluate' && failed.path === '/b.ts' && /\/b\.ts does not compile: cannot compile \/b\.ts/u.test(failed.error.message), JSON.stringify(failed));
  assert.equal(modules.exportOf('/a.ts', 'value'), 1);
});

test('reload evaluates the code a module last ran from again, with no compile, and a module not loaded has nothing to reload', async () => {
  const requested: string[] = [];
  const modules = new ModuleRegistry({
    files: new Map([['/a.ts', `exports.make = function Make() { return {}; };`], ['/b.ts', 'exports.n = 1;']]),
    externals: {}, refresh: fakeRefresh([]),
    compile: (path, source, requestScope) => { requested.push(path); return compile(path, source, requestScope); },
  });
  assert.ok((await modules.load('/a.ts', scope())).ok);
  const before = modules.exportOf('/a.ts', 'make');
  requested.length = 0;
  const again = modules.reload('/a.ts');
  assert.ok(again.ok);
  assert.deepEqual(again.change.evaluated, ['/a.ts']);
  assert.notEqual(modules.exportOf('/a.ts', 'make'), before, 'a new function: it ran again');
  assert.deepEqual(requested, [], 'and nothing was compiled');
  const none = modules.reload('/b.ts');
  assert.ok(none.ok && none.change.evaluated.length === 0);
});
