import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { selectEngine, type Engine } from '../scripts/engine.mjs';
import {
  collectContentInputs, collectInputs, compareInputs, describeBinding, exportFileProblems, findProblem, installFile, prepareTarget, readStamp, requireBuild, requireExport, stampFor, writeStamp, type BuildInputs, type BuildStamp,
} from '../scripts/freshness.mjs';
import { WEB_LIBRARY_NAME, writeGdextension } from '../scripts/live-compile-build.mjs';
import { nativeSourceInputs, nativeVariant } from '../scripts/native-binding.mjs';
import { ensureStockTypings } from '../scripts/typings.mjs';

// The freshness guard (scripts/freshness.mjs, docs/tracks/freshness.md): a build records the content of what it was
// made from, and a run compares that with the working tree. These tests build a small repository in a temporary
// directory, so no cargo, Godot or window is involved.

const OLD = new Date('2026-01-01T00:00:00Z');
const NEWER = new Date('2026-06-01T00:00:00Z');
const FIX = 'pnpm build:native --engine=breaka';

interface Repo {
  root: string;
  apiFiles: string[];
  write(path: string, content: string, mtime?: Date): string;
  inputs(features?: string[]): BuildInputs;
}

function write(root: string, path: string, content: string, mtime?: Date): string {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  if (mtime !== undefined) utimesSync(file, mtime, mtime);
  return file;
}

/** The files a cargo build of the crate reads, in the layout of the real repository. */
function makeRepo(): Repo {
  const root = mkdtempSync(join(tmpdir(), 'freshness-'));
  for (const [path, content] of Object.entries({
    'Cargo.toml': '[package]\nname = "godot-react-ui"\n',
    'Cargo.lock': '# lock\n',
    'rust-toolchain.toml': '[toolchain]\nchannel = "1.99.1"\n',
    '.cargo/config.toml': '[env]\n',
    'native/lib.rs': 'fn main() {}\n',
    'native/props.rs': 'fn props() {}\n',
    'native/PROTOCOL.md': 'prose\n',
    'native/api/README.md': 'prose\n',
    'native/api/extension_api.json': '{"breaka":1}',
    'native/api/gdextension_interface.json': '{"breaka":2}',
    'native/api/stock-4.7.2/extension_api.json': '{"stock":1}',
    'native/api/stock-4.7.2/gdextension_interface.json': '{"stock":2}',
  })) write(root, path, content, OLD);
  const apiFiles = ['extension_api.json', 'gdextension_interface.json'].map(name => join(root, 'native/api', name));
  return {
    root, apiFiles,
    write: (path, content, mtime) => write(root, path, content, mtime),
    inputs: (features = []) => collectInputs({ root, apiFiles, features }),
  };
}

/** A built library next to the stamp for `inputs`, as a build script leaves them. */
function install(repo: Repo, inputs: BuildInputs, options: { engine?: string; probe?: boolean } = {}): { library: string; stamp: BuildStamp } {
  const library = write(repo.root, 'bin/libgodot_react_ui.dylib', `library built from ${inputs.digest}`);
  return { library, stamp: stampFor({ library, engine: options.engine ?? 'breaka', probe: options.probe ?? false, inputs }) };
}

function check(repo: Repo, built: { library: string; stamp: unknown }, current: BuildInputs, overrides: { engine?: string; probe?: boolean } = {}): string | undefined {
  return findProblem({
    library: built.library, stamp: built.stamp, engine: overrides.engine ?? 'breaka', probe: overrides.probe ?? false, current,
    subject: 'installed libgodot_react_ui.dylib',
  });
}

test('a digest follows content, never modification times', () => {
  const repo = makeRepo();
  const before = repo.inputs();
  // A touch (new mtime, same bytes) changes nothing.
  repo.write('native/lib.rs', 'fn main() {}\n', NEWER);
  assert.equal(repo.inputs().digest, before.digest);
  // Other bytes under the file's old mtime are still other bytes.
  repo.write('native/lib.rs', 'fn main() { mutant(); }\n', OLD);
  const after = repo.inputs();
  assert.notEqual(after.digest, before.digest);
  const difference = compareInputs(before, after);
  assert.deepEqual(difference.changed, ['native/lib.rs']);
  assert.equal(difference.same, false);
});

test('documentation and the other profile\'s API dump are not inputs; manifests and the profile\'s dump are', () => {
  const repo = makeRepo();
  const before = repo.inputs();
  repo.write('native/PROTOCOL.md', 'other prose\n');
  repo.write('native/api/README.md', 'other prose\n');
  repo.write('native/api/stock-4.7.2/extension_api.json', '{"stock":99}');
  repo.write('native/.DS_Store', 'noise');
  assert.equal(repo.inputs().digest, before.digest);
  for (const path of ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', '.cargo/config.toml', 'native/api/extension_api.json', 'native/api/gdextension_interface.json']) {
    assert.ok(Object.hasOwn(before.inputs, path), `${path} is an input`);
  }
  assert.ok(!Object.keys(before.inputs).some(path => path.endsWith('.md') || path.includes('stock-4.7.2')));
  const manifest = repo.inputs();
  repo.write('Cargo.lock', '# another lock\n');
  assert.deepEqual(compareInputs(manifest, repo.inputs()).changed, ['Cargo.lock']);
  repo.write('build.rs', 'fn main() {}\n');
  assert.deepEqual(compareInputs(manifest, repo.inputs()).added, ['build.rs']);
});

test('a new, changed or deleted source file is named in the comparison', () => {
  const repo = makeRepo();
  const before = repo.inputs();
  repo.write('native/scroll.rs', 'fn scroll() {}\n');
  repo.write('native/props.rs', 'fn props() { changed(); }\n');
  rmSync(join(repo.root, 'native/lib.rs'));
  const difference = compareInputs(before, repo.inputs());
  assert.deepEqual([difference.added, difference.changed, difference.removed], [['native/scroll.rs'], ['native/props.rs'], ['native/lib.rs']]);
});

test('cargo features are inputs: a probe build is not fresh for a default run', () => {
  const repo = makeRepo();
  const probe = repo.inputs(['probe']);
  const standard = repo.inputs([]);
  assert.notEqual(probe.digest, standard.digest);
  assert.deepEqual(repo.inputs(['web', 'probe']).features, ['probe', 'web'], 'features are compared as a sorted set');
  const built = install(repo, probe, { probe: true });
  const problem = findProblem({ library: built.library, stamp: built.stamp, engine: 'breaka', probe: true, current: standard, subject: 'installed libgodot_react_ui.dylib' });
  assert.match(problem ?? '', /cargo features differ: built with \[probe\], wanted \[\]/u);
});

test('the filters negative-controls build is a feature set of its own: a default run refuses it and a faults run a default build', () => {
  const repo = makeRepo();
  const faults = repo.inputs(['filter-faults']);
  const standard = repo.inputs([]);
  assert.notEqual(faults.digest, standard.digest);
  assert.match(check(repo, install(repo, faults), standard) ?? '', /cargo features differ: built with \[filter-faults\], wanted \[\]/u);
  assert.match(check(repo, install(repo, standard), faults) ?? '', /cargo features differ: built with \[\], wanted \[filter-faults\]/u);
  assert.equal(check(repo, install(repo, faults), faults), undefined, 'a faults build is fresh for a faults run');
  // The native variants pick the feature, the target directory and the rebuild command for it: one of each, none per profile.
  assert.deepEqual(nativeVariant({ faults: true }).features, ['filter-faults']);
  assert.deepEqual(nativeVariant().features, []);
  assert.notEqual(nativeSourceInputs({ faults: true }).digest, nativeSourceInputs().digest);
  assert.match(nativeVariant({ faults: true }).target, /target\/faults$/u);
  assert.match(nativeVariant({ probe: true }).target, /target\/probe$/u);
  assert.equal(nativeVariant({ faults: true }).fix, 'pnpm build:native --faults');
  assert.throws(() => nativeVariant({ probe: true, faults: true }), /separate builds/u);
});

test('a build of the current sources is accepted, however old or new its files are', () => {
  const repo = makeRepo();
  const inputs = repo.inputs();
  const built = install(repo, inputs);
  assert.equal(check(repo, built, inputs), undefined);
  repo.write('native/lib.rs', 'fn main() {}\n', NEWER);
  assert.equal(check(repo, built, repo.inputs()), undefined);
  assert.doesNotThrow(() => requireBuild({ ...built, engine: 'breaka', probe: false, current: repo.inputs(), subject: 'installed lib', fix: FIX }));
});

test('a changed source makes the build stale, and the refusal names the file and the command that fixes it', () => {
  const repo = makeRepo();
  const built = install(repo, repo.inputs());
  repo.write('native/props.rs', 'fn props() { newer(); }\n');
  assert.throws(
    () => requireBuild({ ...built, engine: 'breaka', probe: false, current: repo.inputs(), subject: 'installed libgodot_react_ui.dylib', fix: FIX }),
    /The installed libgodot_react_ui\.dylib is stale: it was built from different sources than the working tree \(changed: native\/props\.rs\)\. Run `pnpm build:native --engine=breaka` first\./u,
  );
});

test('a source restored to old content with its old mtime is stale against the mutant build, which cargo cannot see', () => {
  const repo = makeRepo();
  const original = 'fn main() {}\n';
  // The negative control: edit, build (the mutant), then put the file back with the mtime it had before the edit.
  repo.write('native/lib.rs', 'fn main() { mutant(); }\n', NEWER);
  const mutant = install(repo, repo.inputs());
  repo.write('native/lib.rs', original, OLD);
  // By modification time the restored file is older than the build, which is all cargo looks at...
  assert.ok(statSync(join(repo.root, 'native/lib.rs')).mtimeMs < statSync(mutant.library).mtimeMs, 'the restored file looks older than the build');
  // ...and the digest still sees that the build is of other content.
  const problem = check(repo, mutant, repo.inputs());
  assert.match(problem ?? '', /stale.*changed: native\/lib\.rs/u);
  // A build of the restored content, made afterwards, is accepted.
  const rebuilt = install(repo, repo.inputs());
  assert.equal(check(repo, rebuilt, repo.inputs()), undefined);
});

test('a build for the other profile, or a probe build, is refused whatever its sources', () => {
  const repo = makeRepo();
  const inputs = repo.inputs();
  const stock = install(repo, inputs, { engine: 'stock' });
  assert.match(check(repo, stock, inputs) ?? '', /is the stock profile's, not the breaka profile's/u);
  const probe = install(repo, inputs, { probe: true });
  assert.match(check(repo, probe, inputs) ?? '', /is the breaka profile's probe build, not the breaka profile's\./u);
  const standard = install(repo, inputs);
  assert.match(check(repo, standard, inputs, { probe: true }) ?? '', /is the breaka profile's, not the breaka profile's probe build/u);
});

test('a missing library, a missing or unreadable stamp, a stamp without a digest and a replaced library are all refused', () => {
  const repo = makeRepo();
  const inputs = repo.inputs();
  const built = install(repo, inputs);
  assert.match(check(repo, { library: built.library, stamp: undefined }, inputs) ?? '', /No breaka build of libgodot_react_ui\.dylib is available/u);
  assert.match(check(repo, { library: join(repo.root, 'bin/missing.dylib'), stamp: built.stamp }, inputs) ?? '', /No breaka build of missing\.dylib is available/u);

  const stampPath = join(repo.root, 'bin/react_ui.build.json');
  assert.equal(readStamp(stampPath), undefined);
  writeFileSync(stampPath, '{"engine": "breaka", ');
  assert.equal(readStamp(stampPath), undefined, 'a truncated stamp is no stamp');

  const { digest: _digest, inputs: _inputs, features: _features, ...beforeTheGuard } = built.stamp;
  assert.match(check(repo, { library: built.library, stamp: beforeTheGuard }, inputs) ?? '', /records no source digest \(it was built before the freshness guard\)/u);

  write(repo.root, 'bin/libgodot_react_ui.dylib', 'another library');
  assert.match(check(repo, built, inputs) ?? '', /was replaced after it was built/u);
});

test('writing a stamp leaves only the stamp, and it reads back', () => {
  const repo = makeRepo();
  const built = install(repo, repo.inputs());
  const stampPath = join(repo.root, 'bin/react_ui.build.json');
  writeStamp(stampPath, built.stamp);
  assert.deepEqual(readStamp(stampPath), built.stamp);
  assert.deepEqual(readdirSync(join(repo.root, 'bin')).sort(), ['libgodot_react_ui.dylib', 'react_ui.build.json']);
});

test('cargo\'s target is cleaned unless its own stamp vouches for the current sources', () => {
  const repo = makeRepo();
  const stampPath = join(repo.root, 'target/react_ui.build.json');
  const library = write(repo.root, 'target/release/libgodot_react_ui.dylib', 'cargo output');
  const cleans: boolean[] = [];
  const prepare = (current: BuildInputs): string | undefined => prepareTarget({
    stampPath, library, engine: 'breaka', probe: false, current, subject: 'breaka library built in target',
    clean: reason => { cleans.push(existsSync(stampPath)); assert.match(reason, /^(No breaka build|The breaka library built in target is stale)/u); },
  });

  // No stamp (the first build after the guard, or an interrupted one): cargo's cache cannot be trusted.
  assert.match(prepare(repo.inputs()) ?? '', /No breaka build of libgodot_react_ui\.dylib is available/u);
  assert.deepEqual(cleans, [false]);

  // A build of these sources was stamped: cargo's own check is trusted, nothing is cleaned.
  const first = repo.inputs();
  writeStamp(stampPath, stampFor({ library, engine: 'breaka', probe: false, inputs: first }));
  assert.equal(prepare(first), undefined);
  assert.deepEqual(cleans, [false]);

  // The sources moved on: the stamp goes first, then the clean, so an interrupted build leaves nothing vouching for it.
  repo.write('native/lib.rs', 'fn main() { edited(); }\n');
  assert.match(prepare(repo.inputs()) ?? '', /stale.*changed: native\/lib\.rs/u);
  assert.deepEqual(cleans, [false, false]);
  assert.equal(existsSync(stampPath), false);

  // The mutant was built and stamped; restoring the old content with the old mtime is again "the sources moved on".
  const mutant = repo.inputs();
  writeStamp(stampPath, stampFor({ library, engine: 'breaka', probe: false, inputs: mutant }));
  repo.write('native/lib.rs', 'fn main() {}\n', OLD);
  assert.match(prepare(repo.inputs()) ?? '', /stale.*changed: native\/lib\.rs/u);
  assert.equal(cleans.length, 3);
});

test('a Web export is accepted only with a receipt whose side module is a build of the current sources', () => {
  const repo = makeRepo();
  const inputs = repo.inputs(['web']);
  const directory = join(repo.root, 'artifacts/web-debug');
  const wasm = write(repo.root, 'artifacts/web-debug/godot_react_ui.web.wasm', 'side module');
  const receiptPath = join(directory, 'build-receipt.json');
  const options = { directory, receiptName: 'build-receipt.json', libraryName: 'godot_react_ui.web.wasm', engine: 'breaka', probe: false, subject: 'Web export artifacts/web-debug', fix: 'pnpm build:web --engine=breaka' };

  assert.throws(() => requireExport({ ...options, current: inputs }), /No breaka Web export artifacts\/web-debug exists.*Run `pnpm build:web --engine=breaka` first/u);

  writeFileSync(receiptPath, JSON.stringify({ engine: 'breaka', modules: [] }));
  assert.throws(() => requireExport({ ...options, current: inputs }), /No breaka build of godot_react_ui\.web\.wasm is available/u);

  writeFileSync(receiptPath, JSON.stringify({ engine: 'breaka', extension: stampFor({ library: wasm, engine: 'breaka', probe: false, inputs }) }));
  assert.doesNotThrow(() => requireExport({ ...options, current: inputs }));

  repo.write('Cargo.toml', '[package]\nname = "godot-react-ui"\nversion = "0.2.0"\n');
  assert.throws(() => requireExport({ ...options, current: repo.inputs(['web']) }), /Web export artifacts\/web-debug is stale.*changed: Cargo\.toml/u);
});

test('a Web export is also stale when its pack, shell or engine template were made from other sources, or its files are not the exported ones', () => {
  const repo = makeRepo();
  const inputs = repo.inputs(['web']);
  const directory = join(repo.root, 'artifacts/web-debug');
  const wasm = write(repo.root, 'artifacts/web-debug/godot_react_ui.web.wasm', 'side module');
  write(repo.root, 'artifacts/web-debug/index.pck', 'pack made from main.ts v1');
  write(repo.root, 'src/index.ts', 'library v1');
  write(repo.root, 'demo/src/main.ts', 'main v1');
  write(repo.root, 'demo/web-shell.html', 'shell v1');
  const sources = ['src/index.ts', 'demo/src/main.ts', 'demo/web-shell.html'];
  const contentNow = (extra: Record<string, string> = { 'template:/t.zip': 'template v1' }): BuildInputs => collectContentInputs({ root: repo.root, paths: sources, extra, features: ['debug'] });
  const options = {
    directory, receiptName: 'build-receipt.json', libraryName: 'godot_react_ui.web.wasm', engine: 'breaka', probe: false,
    subject: 'Web export artifacts/web-debug', fix: 'pnpm build:web --engine=breaka',
  };
  const listed = (name: string) => ({ name, bytes: statSync(join(directory, name)).size, sha256: createHash('sha256').update(readFileSync(join(directory, name))).digest('hex') });
  const receipt = (content?: BuildInputs): string => JSON.stringify({
    engine: 'breaka', extension: stampFor({ library: wasm, engine: 'breaka', probe: false, inputs }), content,
    files: ['index.pck', 'godot_react_ui.web.wasm'].map(listed),
  });
  const receiptPath = join(directory, 'build-receipt.json');

  // An export made before the guard has no content record: refused once, with the command that records one.
  writeFileSync(receiptPath, receipt());
  assert.throws(() => requireExport({ ...options, current: inputs, content: contentNow() }), /records no digest of the pack, shell and template.*Run `pnpm build:web --export-only --engine=breaka` first/u);

  writeFileSync(receiptPath, receipt(contentNow()));
  assert.doesNotThrow(() => requireExport({ ...options, current: inputs, content: contentNow() }));

  // A script, the shell or the template changed after the export: the pack the browser would run is old.
  write(repo.root, 'demo/src/main.ts', 'main v2');
  assert.throws(() => requireExport({ ...options, current: inputs, content: contentNow() }), /pack, shell or engine template were made from different sources.*changed: demo\/src\/main\.ts.*--export-only/u);
  write(repo.root, 'demo/src/main.ts', 'main v1');
  write(repo.root, 'demo/web-shell.html', 'shell v2');
  assert.throws(() => requireExport({ ...options, current: inputs, content: contentNow() }), /changed: demo\/web-shell\.html/u);
  write(repo.root, 'demo/web-shell.html', 'shell v1');
  assert.throws(() => requireExport({ ...options, current: inputs, content: contentNow({ 'template:/t.zip': 'template v2' }) }), /changed: template:\/t\.zip/u);

  // The files in the directory are the ones exported, not another export's.
  assert.deepEqual(exportFileProblems(directory, JSON.parse(receipt(contentNow()))), []);
  write(repo.root, 'artifacts/web-debug/index.pck', 'pack made from main.ts v2, in another export');
  assert.throws(() => requireExport({ ...options, current: inputs, content: contentNow() }), /is not the export its receipt describes \(index\.pck differs from the export\)/u);
  rmSync(join(directory, 'index.pck'));
  assert.deepEqual(exportFileProblems(directory, { files: [{ name: 'index.pck', bytes: 1, sha256: 'x' }] }), ['index.pck is missing']);
});

test('the native build hashes the one 4.7.2 dump pair for every profile, and the Web build its profile\'s own', () => {
  const breaka = selectEngine([], {});
  const stock = selectEngine(['--engine=stock'], {});
  const dumps = (inputs: BuildInputs): string[] => Object.keys(inputs.inputs).filter(path => path.startsWith('native/api/'));
  const stockDumps = ['native/api/stock-4.7.2/extension_api.json', 'native/api/stock-4.7.2/gdextension_interface.json'];
  assert.deepEqual(dumps(nativeSourceInputs()), stockDumps, 'the native build is bound to 4.7.2, whichever engine runs it');
  assert.deepEqual(dumps(breaka.webSourceInputs()), ['native/api/extension_api.json', 'native/api/gdextension_interface.json']);
  assert.deepEqual(dumps(stock.webSourceInputs()), stockDumps);
  assert.notEqual(breaka.webSourceInputs().digest, stock.webSourceInputs().digest);
  assert.deepEqual(nativeVariant().features, []);
  assert.deepEqual(nativeVariant({ probe: true }).features, ['probe']);
  assert.deepEqual(breaka.webFeatures(), ['web']);
  assert.deepEqual(breaka.webFeatures({ probe: true }), ['web', 'probe']);
  assert.notEqual(breaka.webSourceInputs().digest, nativeSourceInputs().digest);
});

test('the stock typecheck refuses a stale stock library by name and never builds or generates anything', () => {
  const refusal = 'The native library built in target is stale: ... Run `pnpm build:native` first.';
  // `godot` is a path that cannot run: reaching the editor (the generation) would fail differently.
  const engine: Engine = {
    ...selectEngine(['--engine=stock'], { GODOT: '/nonexistent/godot' }),
    requireBuiltLibrary(): void { throw new Error(refusal); },
  };
  assert.throws(() => ensureStockTypings(engine), error => error instanceof Error && error.message === refusal);
});

// A script that runs an installed build must check it first; a new one that forgets would run unguarded again. This lists
// every script that selects an engine and the guard it must call, and fails for one that is not listed.
const GUARDS: Record<string, readonly string[]> = {
  // The Web side module of live-compile: a build per profile, stamped with its profile and installed beside the native library; the Web export lists it or none (tests/stock-web.test.ts).
  'build-live-compile-web.mjs': ['beginBuild(', 'identity: { engine: engine.name }'],
  'build-web.mjs': ['beginWebBuild(', 'requireInstalledWasm('],
  'dev.mjs': ['prepareNative('],
  // The default profile's editor writes the tracked typings with the live-compile manifest out of the project (the shared helper, which puts it back).
  'generate-types.mjs': ['prepareNative(', 'generateStockTypings(', 'withoutLiveCompileManifest('],
  // Reads the captures a verifier left and lays them out: it runs no build, so there is nothing to guard.
  'navigator-captures.mjs': [],
  'probe-web.mjs': ['requireFreshWebExport('],
  // Drive the code panel under a V8 profiler (docs/tracks/keystroke-profile.md) and compare builds of it (docs/tracks/keystroke-speed.md): they
  // run the installed library like a verifier does, and a variant is only taken from a build that is fresh.
  // Captures the labs in the navigator in headless Chrome from the Web export (docs/tracks/lab-clarity.md): the export is checked; the sheets and compare commands read only the files it left.
  'lab-captures.mjs': ['requireFreshWebExport('],
  'keystroke-ab.mjs': ['prepareNative('],
  'profile-keystrokes.mjs': ['prepareNative('],
  'run.mjs': ['prepareNative('],
  'serve-web.mjs': ['requireFreshWebExport('],
  'test-types.mjs': ['ensureStockTypings('],
  // Takes pictures of the lab from the Web export it is given: the export must be the current one.
  'transform-lab-web-capture.mjs': ['requireFreshWebExport('],
  'verify-a11y.mjs': ['prepareNative('],
  'verify-interaction-web.mjs': ['requireFreshWebExport('],
  'verify-live-compile-web.mjs': ['requireFreshWebExport('],
  'verify-motion-web.mjs': ['requireFreshWebExport('],
  'verify-text-layout.mjs': ['prepareNative('],
  'verify-web.mjs': ['requireFreshWebExport('],
  'verify-world-web.mjs': ['requireFreshWebExport('],
  'verify-world.mjs': ['prepareNative('],
  'verify.mjs': ['prepareNative('],
};

test('every script that selects an engine is guarded against a stale build', () => {
  const scripts = join(__dirname, '..', 'scripts');
  const selecting = readdirSync(scripts).filter(name => name.endsWith('.mjs') && name !== 'engine.mjs'
    && readFileSync(join(scripts, name), 'utf8').includes('selectEngine('));
  assert.deepEqual(selecting.sort(), Object.keys(GUARDS).sort(), 'list a new script here with the guard it calls');
  for (const [name, calls] of Object.entries(GUARDS)) {
    const source = readFileSync(join(scripts, name), 'utf8');
    for (const call of calls) assert.ok(source.includes(call), `${name} must call ${call}`);
  }
});

// ---- A stamp says what the build is bound to ------------------------------------------------------------------------------------------------------------

test('a stamp is bound to a profile (a Web side module) or to a Godot API (a native build), one of the two', () => {
  const repo = makeRepo();
  const inputs = repo.inputs();
  const library = write(repo.root, 'bin/lib.dylib', 'library');
  const binding = { api: '4.7.2', dump: 'cd'.repeat(32) };
  const native = stampFor({ library, binding, probe: false, inputs });
  assert.deepEqual(native.binding, binding);
  assert.equal(Object.hasOwn(native, 'engine'), false);
  const web = stampFor({ library, engine: 'stock', probe: false, inputs });
  assert.equal(web.engine, 'stock');
  assert.equal(Object.hasOwn(web, 'binding'), false);
  assert.throws(() => stampFor({ library, probe: false, inputs } as never), /one of the two/u);
  assert.throws(() => stampFor({ library, engine: 'stock', binding, probe: false, inputs } as never), /one of the two/u);
  assert.equal(describeBinding(binding), 'Godot API 4.7.2 (dump cdcdcdcdcdcd)');
});

test('a build is checked against the identity it was asked for: a Web module against a profile, a native build against a binding, never one for the other', () => {
  const repo = makeRepo();
  const inputs = repo.inputs();
  const library = write(repo.root, 'bin/lib.dylib', 'library');
  const binding = { api: '4.7.2', dump: 'cd'.repeat(32) };
  const common = { library, probe: false, current: inputs, subject: 'installed lib.dylib' };
  const bound = stampFor({ library, binding, probe: false, inputs });
  assert.equal(findProblem({ ...common, stamp: bound, binding }), undefined);
  assert.match(findProblem({ ...common, stamp: bound, binding: { ...binding, api: '4.8.0' } }) ?? '', /bound to Godot API 4\.7\.2 \(dump cdcdcdcdcdcd\), not bound to Godot API 4\.8\.0/u);
  assert.match(findProblem({ ...common, stamp: bound, binding: { ...binding, dump: 'ef'.repeat(32) } }) ?? '', /dump cdcdcdcdcdcd\), not bound to Godot API 4\.7\.2 \(dump efefefefefef/u);
  assert.match(findProblem({ ...common, stamp: bound, engine: 'stock' }) ?? '', /is bound to Godot API 4\.7\.2 \(dump cdcdcdcdcdcd\), not the stock profile's\./u, 'a native stamp is not a profile\'s build');
  const profile = stampFor({ library, engine: 'stock', probe: false, inputs });
  assert.equal(findProblem({ ...common, stamp: profile, engine: 'stock' }), undefined);
  assert.match(findProblem({ ...common, stamp: profile, binding }) ?? '', /is the stock profile's build, made before native builds were bound to one Godot API, not bound to Godot API 4\.7\.2/u);
  assert.match(findProblem({ ...common, stamp: undefined, binding }) ?? '', /^No build of lib\.dylib bound to Godot API 4\.7\.2 \(dump cdcdcdcdcdcd\) is available/u);
});

// ---- The install -----------------------------------------------------------------------------------------------------------------------------------------------

test('an install replaces the file by a rename: a process that has the old library open keeps reading the old library', () => {
  const root = mkdtempSync(join(tmpdir(), 'install-'));
  const destination = write(root, 'install/lib.dylib', 'old library, mapped by a running Godot');
  const source = write(root, 'target/lib.dylib', 'new library');
  const mapped = openSync(destination, 'r');
  try {
    const before = statSync(destination).ino;
    installFile(source, destination);
    assert.equal(readFileSync(destination, 'utf8'), 'new library');
    assert.notEqual(statSync(destination).ino, before, 'the directory entry now names another file');
    assert.equal(readFileSync(mapped, 'utf8'), 'old library, mapped by a running Godot', 'the open file is untouched (copyFileSync over it would have rewritten it in place)');
  } finally {
    closeSync(mapped);
  }
  assert.deepEqual(readdirSync(join(root, 'install')), ['lib.dylib'], 'no staged file is left behind');
});

test('an install of a file that is not the one its stamp describes installs nothing', () => {
  const root = mkdtempSync(join(tmpdir(), 'install-'));
  const destination = write(root, 'install/lib.dylib', 'old');
  const source = write(root, 'target/lib.dylib', 'new, but another build finished under the stamp');
  assert.throws(() => installFile(source, destination, { sha256: '0'.repeat(64) }), /not the file its stamp describes/u);
  assert.equal(readFileSync(destination, 'utf8'), 'old');
  assert.deepEqual(readdirSync(join(root, 'install')), ['lib.dylib']);
  installFile(source, join(root, 'made/for/it/lib.dylib'));
  assert.equal(readFileSync(join(root, 'made/for/it/lib.dylib'), 'utf8'), 'new, but another build finished under the stamp');
});

test('the live-compile manifest is rewritten only when it differs, and by a rename a reader never sees half of', () => {
  const root = mkdtempSync(join(tmpdir(), 'manifest-'));
  const manifest = join(root, 'live_compile.gdextension');
  writeGdextension({ installDirectory: root });
  const first = statSync(manifest).ino;
  assert.doesNotMatch(readFileSync(manifest, 'utf8'), /web\./u);
  writeGdextension({ installDirectory: root });
  assert.equal(statSync(manifest).ino, first, 'the same manifest is not rewritten');
  // A Web library is listed when the caller names one, whether or not a file of that name is installed: the Web export decides (liveCompileWebPlan).
  write(root, `bin/${WEB_LIBRARY_NAME}`, 'web side module');
  writeGdextension({ installDirectory: root });
  assert.equal(statSync(manifest).ino, first, 'an installed Web module alone does not change the manifest');
  writeGdextension({ installDirectory: root, webLibrary: WEB_LIBRARY_NAME });
  assert.notEqual(statSync(manifest).ino, first);
  assert.match(readFileSync(manifest, 'utf8'), new RegExp(`web\\.release\\.threads\\.wasm32 = "res://addons/live-compile/bin/${WEB_LIBRARY_NAME}"`, 'u'));
  assert.deepEqual(readdirSync(root).filter(name => name.endsWith('.tmp')), []);
});
