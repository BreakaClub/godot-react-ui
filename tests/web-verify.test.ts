import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import { isolateBrowserClipboard } from '../scripts/web-clipboard.mjs';
import { presetTemplate, webContentInputs, webSourcePaths } from '../scripts/web-content.mjs';
import { startExportServer } from '../scripts/web-server.mjs';
import { passedLine, servedAssetProblems, startVerificationServer, writeEvidence } from '../scripts/web-verify.mjs';

// Which server a Web verifier talks to and what it is shown (docs/tracks/verifier-integrity.md, findings 2, 3 and 7).

const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

/** An export directory with the given files, and the receipt list that describes them. */
function exportDirectory(files: Record<string, string>): { root: string; listed: Array<{ name: string; bytes: number; sha256: string }> } {
  const root = mkdtempSync(join(tmpdir(), 'web-export-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text);
  return { root, listed: Object.entries(files).map(([name, text]) => ({ name, bytes: Buffer.byteLength(text), sha256: sha(text) })) };
}

const EXPORT = { 'index.html': '<html>demo</html>', 'index.pck': 'pack bytes', 'godot_react_ui.web.wasm': 'side module A' };

test('a verifier\'s own server takes a free port, so two verifiers never share one', async () => {
  const { root } = exportDirectory(EXPORT);
  const first = await startExportServer({ root });
  const second = await startExportServer({ root });
  try {
    assert.notEqual(first.port, second.port);
    const response = await fetch(new URL('index.html', first.url));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), EXPORT['index.html']);
    assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin', 'the page can be cross-origin isolated');
    assert.equal((await fetch(new URL('missing.js', first.url))).status, 404);
    assert.equal((await fetch(new URL('..%2fsecret', first.url))).status, 403);
  } finally {
    await first.close();
    await second.close();
  }
});

test('served files are compared with the export by hash: a changed, a missing and a refused file are each named', async () => {
  const expected = exportDirectory(EXPORT);
  const same = await startExportServer({ root: expected.root });
  const stale = exportDirectory({ 'index.html': EXPORT['index.html'], 'index.pck': EXPORT['index.pck'], 'godot_react_ui.web.wasm': 'side module B (an older build)' });
  const older = await startExportServer({ root: stale.root });
  try {
    assert.deepEqual(await servedAssetProblems(same.url, expected.listed), []);
    // Same pack, another side module: the pack check alone passes this.
    const problems = await servedAssetProblems(older.url, expected.listed);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /^godot_react_ui\.web\.wasm differs from the export/);
    const missing = await servedAssetProblems(older.url, [...expected.listed, { name: 'index.js', bytes: 1, sha256: sha('x') }]);
    assert.ok(missing.some(problem => problem === 'index.js is answered with status 404'), missing.join('\n'));
  } finally {
    await same.close();
    await older.close();
  }
  const nothing = await servedAssetProblems('http://127.0.0.1:1/', expected.listed);
  assert.match(nothing[0] ?? '', /could not be fetched/);
});

/** The engine as `startVerificationServer` needs it: where the export is, its mode and its name. */
function engineFor(root: string): Parameters<typeof startVerificationServer>[0] {
  return { name: 'breaka', root, artifactPath: (...names: string[]) => join(root, ...names), webMode: () => 'debug' };
}

function exportWithReceipt(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'web-verify-'));
  const directory = join(root, 'web-debug');
  mkdirSync(directory);
  const { listed } = ((): { listed: Array<{ name: string; bytes: number; sha256: string }> } => {
    for (const [name, text] of Object.entries(files)) writeFileSync(join(directory, name), text);
    return { listed: Object.entries(files).map(([name, text]) => ({ name, bytes: Buffer.byteLength(text), sha256: sha(text) })) };
  })();
  writeFileSync(join(directory, 'build-receipt.json'), JSON.stringify({ files: listed }));
  return root;
}

/** A directory with no font slice build in it: the verifier's slice check has nothing to compare an export with. */
const NO_FONT_SLICES = join(tmpdir(), 'web-verify-no-font-slices');

test('with no URL named the verifier serves the export itself and nothing else can answer', async () => {
  const root = exportWithReceipt(EXPORT);
  const messages: string[] = [];
  const served = await startVerificationServer(engineFor(root), { env: {}, log: message => messages.push(message), fontSlices: NO_FONT_SLICES });
  try {
    assert.equal(served.own, true);
    assert.match(served.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.equal((await fetch(new URL('index.pck', served.url))).status, 200);
    assert.match(messages.join('\n'), /free port/);
  } finally {
    await served.close();
  }
});

test('a URL that is named must serve the checked export, file for file, or the verifier refuses to open a browser', async () => {
  const root = exportWithReceipt(EXPORT);
  const right = await startExportServer({ root: join(root, 'web-debug') });
  const wrongRoot = exportWithReceipt({ ...EXPORT, 'godot_react_ui.web.wasm': 'side module of another checkout' });
  const wrong = await startExportServer({ root: join(wrongRoot, 'web-debug') });
  try {
    const accepted = await startVerificationServer(engineFor(root), { env: { GODOT_REACT_WEB_URL: right.url }, log: () => {}, fontSlices: NO_FONT_SLICES });
    assert.equal(accepted.own, false);
    assert.equal(accepted.url, right.url);
    await assert.rejects(
      startVerificationServer(engineFor(root), { env: { GODOT_REACT_WEB_URL: wrong.url }, log: () => {}, fontSlices: NO_FONT_SLICES }),
      /does not serve the breaka export .* godot_react_ui\.web\.wasm differs from the export/,
    );
  } finally {
    await right.close();
    await wrong.close();
  }
});

test('the preset names the engine template of each mode, and a missing preset is an error', () => {
  const presets = '[preset.0]\nname="Web"\n\n[preset.0.options]\ncustom_template/debug="/t/debug.zip"\ncustom_template/release="/t/release.zip"\n\n[preset.1]\nname="Web (stock)"\n\n[preset.1.options]\ncustom_template/debug="/s/debug.zip"\n';
  assert.equal(presetTemplate(presets, 'Web', 'release'), '/t/release.zip');
  assert.equal(presetTemplate(presets, 'Web (stock)', 'debug'), '/s/debug.zip');
  assert.equal(presetTemplate(presets, 'Web (stock)', 'release'), undefined);
  assert.throws(() => presetTemplate(presets, 'Elsewhere', 'debug'), /No export preset named "Elsewhere"/);
});

test('the sources of an export are what git lists as source, with the generated and ignored left out', () => {
  const root = mkdtempSync(join(tmpdir(), 'web-sources-'));
  const git = (...args: string[]): void => { execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root, stdio: 'ignore' }); };
  git('init', '-q');
  for (const directory of ['src', 'demo/src', 'demo/typings', 'demo/gen/godot', 'demo/.godot/GodotJS', 'demo/node_modules/x', 'scripts']) mkdirSync(join(root, directory), { recursive: true });
  writeFileSync(join(root, '.gitignore'), 'node_modules/\ndemo/.godot/\n');
  const sources: Record<string, string> = {
    'src/index.ts': 'a', 'demo/src/main.ts': 'b', 'demo/web-shell.html': 'c', 'demo/export_presets.cfg': '[preset.0]\nname="Web"\n\n[preset.0.options]\ncustom_template/debug="TEMPLATE"\n',
    'demo/typings/godot.d.ts': 'typings', 'demo/gen/godot/x.gen.ts': 'wrapper', 'demo/.godot/GodotJS/main.js': 'compiled', 'demo/node_modules/x/i.js': 'dep',
    'package.json': '{}', 'pnpm-lock.yaml': 'lock', 'scripts/build.mjs': 'build', 'scripts/other.mjs': 'not an input', 'README.md': 'not an input',
  };
  for (const [name, text] of Object.entries(sources)) writeFileSync(join(root, name), text);
  git('add', 'src', 'demo/src', 'demo/web-shell.html', 'demo/export_presets.cfg', 'demo/typings', 'package.json', 'scripts/build.mjs', '.gitignore');
  git('commit', '-q', '-m', 'sources');
  writeFileSync(join(root, 'demo/src/untracked.ts'), 'new file, not yet added');
  assert.deepEqual(webSourcePaths(root), ['demo/export_presets.cfg', 'demo/src/main.ts', 'demo/src/untracked.ts', 'demo/web-shell.html', 'package.json', 'pnpm-lock.yaml', 'scripts/build.mjs', 'src/index.ts']);
  // A tracked file that is deleted from the working tree is not an input and not an error.
  execFileSync('rm', [join(root, 'demo/web-shell.html')]);
  assert.ok(!webSourcePaths(root).includes('demo/web-shell.html'));

  const template = join(root, 'template.zip');
  writeFileSync(template, 'engine template');
  writeFileSync(join(root, 'demo/export_presets.cfg'), `[preset.0]\nname="Web"\n\n[preset.0.options]\ncustom_template/debug="${template}"\n`);
  const before = webContentInputs({ root, presetName: 'Web', mode: 'debug' });
  assert.deepEqual(before.features, ['debug']);
  assert.ok(Object.keys(before.inputs).includes(`template:${template}`));
  assert.equal(webContentInputs({ root, presetName: 'Web', mode: 'debug' }).digest, before.digest, 'the same sources hash the same');
  writeFileSync(join(root, 'demo/src/main.ts'), 'b, edited');
  assert.notEqual(webContentInputs({ root, presetName: 'Web', mode: 'debug' }).digest, before.digest, 'a script edit changes it');
  writeFileSync(join(root, 'demo/src/main.ts'), 'b');
  writeFileSync(template, 'another engine template');
  assert.notEqual(webContentInputs({ root, presetName: 'Web', mode: 'debug' }).digest, before.digest, 'so does the engine template');
});

test('the browser clipboard is swapped for one kept in the page, before the page\'s scripts run', async () => {
  let installed: (() => void) | undefined;
  const page = { evaluateOnNewDocument: async (script: () => void) => { installed = script; } };
  await isolateBrowserClipboard(page as unknown as Parameters<typeof isolateBrowserClipboard>[0]);
  assert.ok(installed);
  // Run the installed script in a context that has a `Navigator` whose `clipboard` is the machine's.
  const context = vm.createContext({ __name: <T>(value: T): T => value });
  vm.runInContext('globalThis.Navigator = function Navigator() {}; Object.defineProperty(Navigator.prototype, "clipboard", { configurable: true, get() { throw new Error("the machine\'s clipboard was touched"); } }); globalThis.navigator = new Navigator();', context);
  vm.runInContext(`(${installed.toString()})()`, context);
  const clipboard = vm.runInContext('navigator.clipboard', context) as { writeText(text: string): Promise<void>; readText(): Promise<string> };
  assert.equal(await clipboard.readText(), '');
  await clipboard.writeText('copied by the verifier');
  assert.equal(await clipboard.readText(), 'copied by the verifier');
  assert.equal(vm.runInContext('navigator.clipboard', context), clipboard, 'one object: a scenario that wraps readText wraps the page\'s');
});

// A named server that never answers must not hang the verifier (it used to: the fetch had no deadline).

async function listen(handler: Parameters<typeof createServer>[1]): Promise<{ url: string; stop: () => void }> {
  const server = createServer(handler);
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/`, stop: () => { server.closeAllConnections(); server.close(); } };
}

test('a named server that accepts the connection and never answers is a problem found within the deadline, not a hang', async () => {
  const silent = await listen(() => {});
  try {
    const started = Date.now();
    const problems = await servedAssetProblems(silent.url, [{ name: 'index.html', bytes: 5, sha256: sha('hello') }], fetch, 200);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /^index\.html could not be fetched \(/);
    assert.ok(Date.now() - started < 10_000, 'the check ended at its deadline');
  } finally {
    silent.stop();
  }
});

test('a named server that stalls in the middle of a file is a problem too, and the files after it are still checked', async () => {
  const stalling = await listen((request, response) => {
    if (request.url === '/stalls.js') {
      response.writeHead(200, { 'content-length': '100' });
      response.write('x');
      return;
    }
    response.writeHead(200).end('fine');
  });
  try {
    const problems = await servedAssetProblems(stalling.url, [
      { name: 'stalls.js', bytes: 100, sha256: sha('x') }, { name: 'fine.js', bytes: 4, sha256: sha('fine') },
    ], fetch, 200);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /^stalls\.js could not be fetched/);
  } finally {
    stalling.stop();
  }
});

// The evidence and the pass line every Web verifier leaves (scripts/verify-world-web.mjs gained them).

test('the evidence of a Web run is report.json with its finish time and browser.log with one line per console message', async () => {
  const { root } = exportDirectory({ 'placeholder.txt': 'x' });
  const report = { passed: true, assertions: [{}, {}], captures: ['a.png'], console: [{ type: 'log', text: 'ready' }, { type: 'warning', text: 'slow' }] };
  await writeEvidence(root, report, () => new Date('2026-11-07T00:00:00Z'));
  assert.equal(JSON.parse(readFileSync(join(root, 'report.json'), 'utf8')).finishedAt, '2026-11-07T00:00:00.000Z');
  assert.equal(readFileSync(join(root, 'browser.log'), 'utf8'), '[log] ready\n[warning] slow\n');
});

test('only a run that passed prints a pass line, and it carries the counts and the report', () => {
  const report = { passed: true, assertions: [{}, {}, {}], captures: ['a.png', 'b.png'] };
  const line = passedLine('GODOT_REACT_WEB_WORLD_VERIFY_PASSED', report, '/evidence');
  assert.ok(line?.startsWith('GODOT_REACT_WEB_WORLD_VERIFY_PASSED {'));
  assert.deepEqual(JSON.parse((line ?? '').slice('GODOT_REACT_WEB_WORLD_VERIFY_PASSED '.length)), { assertions: 3, captures: 2, report: '/evidence/report.json' });
  assert.equal(passedLine('GODOT_REACT_WEB_WORLD_VERIFY_PASSED', { ...report, passed: false }, '/evidence'), undefined);
});

test('the demo server sends the bare address to its landing and nothing else; a verifier\'s server has none (the bare page is the playground)', async () => {
  const { root } = exportDirectory(EXPORT);
  const demo = await startExportServer({ root, landing: '?demo=navigator' });
  const verifier = await startExportServer({ root });
  try {
    const bare = await fetch(demo.url, { redirect: 'manual' });
    assert.equal(bare.status, 302);
    assert.equal(bare.headers.get('location'), '/?demo=navigator');
    const withQuery = await fetch(new URL('?lab=glass', demo.url), { redirect: 'manual' });
    assert.equal(withQuery.status, 200, 'an address that already says what to open is served as it is');
    assert.equal(await withQuery.text(), EXPORT['index.html']);
    assert.equal((await fetch(new URL('index.pck', demo.url), { redirect: 'manual' })).status, 200, 'files are not redirected');
    const followed = await fetch(demo.url);
    assert.equal(followed.status, 200);
    assert.equal(followed.url, new URL('?demo=navigator', demo.url).href);
    const plain = await fetch(verifier.url, { redirect: 'manual' });
    assert.equal(plain.status, 200, 'the verifiers\' server serves the bare address itself');
    assert.equal(await plain.text(), EXPORT['index.html']);
  } finally {
    await demo.close();
    await verifier.close();
  }
});

test('the verifier serves the font slices at /o/ and refuses an export whose slice manifest is not the build\'s', async () => {
  const slices = mkdtempSync(join(tmpdir(), 'web-verify-slices-'));
  mkdirSync(join(slices, 'o', 'abc'), { recursive: true });
  writeFileSync(join(slices, 'font-slices.json'), '{"built":true}');
  writeFileSync(join(slices, 'o', 'abc', 'noto-sans-sc-000.woff2'), 'wOF2 bytes');
  const without = exportWithReceipt(EXPORT);
  await assert.rejects(startVerificationServer(engineFor(without), { env: {}, log: () => {}, fontSlices: slices }), /have no font-slices\.json|has no font-slices\.json/);

  const matching = exportWithReceipt({ ...EXPORT, 'font-slices.json': '{"built":true}' });
  const served = await startVerificationServer(engineFor(matching), { env: {}, log: () => {}, fontSlices: slices });
  try {
    const slice = await fetch(new URL('o/abc/noto-sans-sc-000.woff2', served.url));
    assert.equal(slice.status, 200);
    assert.equal(slice.headers.get('content-type'), 'font/woff2');
    assert.equal(await slice.text(), 'wOF2 bytes');
    assert.equal((await fetch(new URL('o/abc/missing.woff2', served.url))).status, 404);
  } finally {
    await served.close();
  }
  const stale = exportWithReceipt({ ...EXPORT, 'font-slices.json': '{"built":"earlier"}' });
  await assert.rejects(startVerificationServer(engineFor(stale), { env: {}, log: () => {}, fontSlices: slices }), /not the one the slice build last made/);
});
