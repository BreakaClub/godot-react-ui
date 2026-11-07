import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { brotliDecompressSync } from 'node:zlib';
import {
  acceptsEncoding, contentTypeOf, isCompressible, objectKey, parsePointer, parseReleaseManifest, redirectsToObject, releaseKey,
} from '../deploy/release-layout.mjs';
import { buildRelease, hashBytes, injectBase, releaseIdOf } from '../scripts/release-bundle.mjs';
import { objectKeysOf, pointerAfter, rollbackTarget } from '../scripts/release-pointer.mjs';

// The release layout, the staging of a release, and the pointer's bookkeeping (deploy/release-layout.mjs, scripts/release-bundle.mjs,
// scripts/release-pointer.mjs; docs/tracks/web-load.md).

function temporaryDirectory(): string {
  return mkdtempSync(join(tmpdir(), 'web-release-test-'));
}

const PAGE = '<!doctype html>\n<html>\n  <head>\n    <meta charset="utf-8">\n    <link rel="icon" href="data:,">\n  </head>\n  <body><script src="index.js"></script></body>\n</html>\n';

function exportDirectory(directory: string, overrides: Record<string, string | Buffer> = {}): string {
  const source = join(directory, 'export');
  mkdirSync(source, { recursive: true });
  const files: Record<string, string | Buffer> = {
    'index.html': PAGE,
    'index.js': 'engine();\n'.repeat(500),
    'index.wasm': Buffer.alloc(20_000, 5),
    'index.pck': Buffer.from('pack '.repeat(4000)),
    'index.png': Buffer.from([137, 80, 78, 71, 1, 2, 3, 4]),
    'build-receipt.json': '{"mode":"release"}',
    ...overrides,
  };
  for (const [name, content] of Object.entries(files)) writeFileSync(join(source, name), content);
  return source;
}

test('Accept-Encoding allows br when it names it with a quality above 0, or covers it with *', () => {
  assert.equal(acceptsEncoding('gzip, deflate, br, zstd', 'br'), true);
  assert.equal(acceptsEncoding('br;q=1.0, gzip;q=0.8', 'br'), true);
  assert.equal(acceptsEncoding('BR', 'br'), true);
  assert.equal(acceptsEncoding('gzip', 'br'), false);
  assert.equal(acceptsEncoding('br;q=0', 'br'), false);
  assert.equal(acceptsEncoding('br;q=0, *', 'br'), false, 'naming it with 0 beats the wildcard');
  assert.equal(acceptsEncoding('*', 'br'), true);
  assert.equal(acceptsEncoding('gzip, *;q=0.1', 'br'), true);
  assert.equal(acceptsEncoding('*;q=0', 'br'), false);
  assert.equal(acceptsEncoding('identity', 'br'), false);
  assert.equal(acceptsEncoding('br;q=oops', 'br'), false, 'a malformed quality is ignored, not guessed');
  assert.equal(acceptsEncoding(null, 'br'), false);
  assert.equal(acceptsEncoding('', 'br'), false);
});

test('files have the types the engine needs, the binaries redirect, and the images are not recompressed', () => {
  assert.equal(contentTypeOf('index.wasm'), 'application/wasm');
  assert.equal(contentTypeOf('godot_react_ui.web.wasm'), 'application/wasm');
  assert.equal(contentTypeOf('index.audio.worklet.js'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeOf('index.pck'), 'application/octet-stream');
  assert.equal(contentTypeOf('unknown.bin'), 'application/octet-stream');
  assert.deepEqual(['index.wasm', 'index.side.wasm', 'index.pck'].map(redirectsToObject), [true, true, true]);
  assert.deepEqual(['index.js', 'index.audio.worklet.js', 'index.html', 'index.png'].map(redirectsToObject), [false, false, false, false], 'scripts stay under the release: a worker takes its base from its script');
  assert.equal(isCompressible('index.png'), false);
  assert.equal(isCompressible('index.pck'), true);
  assert.equal(objectKey('abc', 'identity'), 'objects/abc');
  assert.equal(objectKey('abc', 'br'), 'objects/abc.br');
  assert.equal(releaseKey('0123456789ab'), 'releases/0123456789ab.json');
});

test('the base tag goes right after the charset, once, and sends relative URLs into the release', () => {
  const injected = injectBase(PAGE, '0123456789ab');
  assert.match(injected, /<meta charset="utf-8">\n {4}<base href="\/r\/0123456789ab\/">\n {4}<link rel="icon"/u);
  assert.equal((injected.match(/<base /gu) ?? []).length, 1);
  assert.match(injectBase('<html><head><title>x</title></head></html>', '0123456789ab'), /<head>\n {4}<base href="\/r\/0123456789ab\/"><title>/u);
  assert.throws(() => injectBase(injected, '0123456789ab'), /already has a <base>/u);
  assert.throws(() => injectBase('<p>no head</p>', '0123456789ab'), /neither a charset declaration nor a <head>/u);
});

test('a release is named by what is in it: the same files are the same release in any order, and any change is a new one', () => {
  const files = [{ path: 'a', hash: '1' }, { path: 'b', hash: '2' }];
  assert.equal(releaseIdOf(files), releaseIdOf([...files].reverse()));
  assert.match(releaseIdOf(files), /^[0-9a-f]{12}$/u);
  assert.notEqual(releaseIdOf(files), releaseIdOf([{ path: 'a', hash: '1' }, { path: 'b', hash: '3' }]));
  assert.notEqual(releaseIdOf(files), releaseIdOf([{ path: 'a', hash: '1' }, { path: 'c', hash: '2' }]), 'a path counts as well as bytes');
});

test('staging a release names every file by its hash, compresses what gains, leaves the receipt out and puts the id in the page', async () => {
  const directory = temporaryDirectory();
  try {
    const source = exportDirectory(directory);
    const cache = join(directory, 'cache');
    const { manifest, objects } = await buildRelease({ sourceDirectory: source, cacheDirectory: cache, createdAt: '2026-11-07T00:00:00.000Z', source: { engine: 'breaka' } });
    assert.deepEqual(manifest.files.map(file => file.path), ['index.html', 'index.js', 'index.pck', 'index.png', 'index.wasm'], 'sorted, and the receipt is not published');
    assert.equal(parseReleaseManifest(JSON.parse(JSON.stringify(manifest))).id, manifest.id, 'the Worker accepts the manifest as written');
    const byPath = new Map(manifest.files.map(file => [file.path, file]));
    assert.equal(byPath.get('index.wasm')?.hash, hashBytes(readFileSync(join(source, 'index.wasm'))));
    assert.equal(byPath.get('index.wasm')?.type, 'application/wasm');
    for (const path of ['index.js', 'index.wasm', 'index.pck']) {
      const file = byPath.get(path);
      assert.ok(file?.encodings.br !== undefined && file.encodings.br < file.size * 0.95, `${path} has a brotli copy that is smaller`);
    }
    assert.equal(byPath.get('index.png')?.encodings.br, undefined, 'an image is stored as it is');
    assert.equal(byPath.get('index.html')?.encodings.br, undefined, 'the document is small and the edge compresses it');

    const keys = objects.map(object => object.key);
    assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(new Set(keys), new Set(objectKeysOf(manifest)), 'the objects staged are the objects the manifest names');
    const wasm = byPath.get('index.wasm');
    const copy = objects.find(object => wasm !== undefined && object.key === objectKey(wasm.hash, 'br'));
    assert.ok(copy);
    assert.deepEqual(brotliDecompressSync(readFileSync(copy.file)), readFileSync(join(source, 'index.wasm')), 'the copy decodes to the file');

    const documentFile = byPath.get('index.html');
    const document = objects.find(object => documentFile !== undefined && object.key === objectKey(documentFile.hash, 'identity'));
    assert.ok(document);
    assert.equal(readFileSync(document.file, 'utf8'), injectBase(PAGE, manifest.id));
    assert.equal(documentFile?.hash, hashBytes(readFileSync(document.file)), 'the document is addressed by the bytes that are served');

    // The same export is the same release; a changed binary is another release but shares the objects that did not change.
    const again = await buildRelease({ sourceDirectory: source, cacheDirectory: cache, createdAt: '2027-01-01T00:00:00.000Z' });
    assert.equal(again.manifest.id, manifest.id);
    const changed = await buildRelease({ sourceDirectory: exportDirectory(join(directory, 'two'), { 'index.pck': Buffer.from('other '.repeat(4000)) }), cacheDirectory: cache });
    assert.notEqual(changed.manifest.id, manifest.id);
    const shared = objectKeysOf(manifest).filter(key => objectKeysOf(changed.manifest).includes(key));
    assert.ok(shared.includes(objectKey(wasm?.hash ?? '', 'br')), 'an unchanged binary is the same object in both releases');
    assert.ok(!shared.includes(objectKey(byPath.get('index.pck')?.hash ?? '', 'br')));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('a release export with a directory in it, or no document, is refused rather than published half-understood', async () => {
  const directory = temporaryDirectory();
  try {
    const nested = exportDirectory(join(directory, 'nested'));
    mkdirSync(join(nested, 'extra'));
    await assert.rejects(buildRelease({ sourceDirectory: nested, cacheDirectory: join(directory, 'cache') }), /has a directory \(extra\)/u);
    const bare = join(directory, 'bare');
    mkdirSync(bare);
    writeFileSync(join(bare, 'index.js'), 'x');
    await assert.rejects(buildRelease({ sourceDirectory: bare, cacheDirectory: join(directory, 'cache') }), /no index\.html/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('manifests and pointers are checked before they are trusted', () => {
  const file = { path: 'index.html', hash: 'a'.repeat(32), type: 'text/html', size: 1, encodings: {} };
  const manifest = { version: 1, id: '0123456789ab', createdAt: 'now', source: {}, files: [file] };
  assert.equal(parseReleaseManifest(manifest).id, '0123456789ab');
  assert.throws(() => parseReleaseManifest({ ...manifest, version: 2 }), /version 2 is not 1/u);
  assert.throws(() => parseReleaseManifest({ ...manifest, id: 'XYZ' }), /release id "XYZ"/u);
  assert.throws(() => parseReleaseManifest({ ...manifest, files: [file, file] }), /a path is listed twice/u);
  assert.throws(() => parseReleaseManifest({ ...manifest, files: [{ ...file, hash: 'short' }] }), /hash "short"/u);
  assert.throws(() => parseReleaseManifest({ ...manifest, files: [{ ...file, encodings: { gzip: 1 } }] }), /encoding "gzip"/u);
  assert.throws(() => parseReleaseManifest({ ...manifest, files: [{ ...file, path: 'index.js' }] }), /no index\.html/u);
  assert.throws(() => parseReleaseManifest({ ...manifest, files: [{ ...file, size: -1 }] }), /size is not a non-negative integer/u);
  assert.throws(() => parseReleaseManifest(null), /not an object/u);
  const pointer = { version: 1, release: '0123456789ab', deployedAt: 'now', history: [{ release: '0123456789ab', deployedAt: 'now' }] };
  assert.equal(parsePointer(pointer).release, '0123456789ab');
  assert.throws(() => parsePointer({ ...pointer, release: '../etc' }), /current release/u);
  assert.throws(() => parsePointer({ ...pointer, history: 'x' }), /history is not an array/u);
  assert.throws(() => parsePointer({ ...pointer, history: [{ release: 'nope', deployedAt: 'now' }] }), /history 0 release "nope"/u);
});

test('publishing and rolling back move the pointer without losing a release', () => {
  const first = pointerAfter({ previous: null, release: 'aaaaaaaaaaaa', now: 't1', workerSha256: 'w1' });
  assert.deepEqual(first, { version: 1, release: 'aaaaaaaaaaaa', deployedAt: 't1', workerSha256: 'w1', history: [{ release: 'aaaaaaaaaaaa', deployedAt: 't1' }] });
  const second = pointerAfter({ previous: first, release: 'bbbbbbbbbbbb', now: 't2' });
  assert.equal(second.workerSha256, 'w1', 'a deploy that does not say keeps the Worker hash');
  assert.deepEqual(second.history.map(entry => entry.release), ['bbbbbbbbbbbb', 'aaaaaaaaaaaa']);
  assert.equal(rollbackTarget(second), 'aaaaaaaaaaaa', 'no id: the release before the current one');
  const back = pointerAfter({ previous: second, release: rollbackTarget(second), now: 't3' });
  assert.deepEqual(back.history.map(entry => entry.release), ['aaaaaaaaaaaa', 'bbbbbbbbbbbb'], 'each release once, the one now shown first');
  assert.equal(rollbackTarget(back), 'bbbbbbbbbbbb', 'rolling back again goes forward again');
  const third = pointerAfter({ previous: back, release: 'cccccccccccc', now: 't4' });
  assert.equal(rollbackTarget(third, 'bbbbbbbbbbbb'), 'bbbbbbbbbbbb');
  assert.throws(() => rollbackTarget(third, 'dddddddddddd'), /not in the pointer's history/u);
  assert.throws(() => rollbackTarget(third, 'cccccccccccc'), /already current/u);
  assert.throws(() => rollbackTarget(first), /only one release/u);
  assert.throws(() => rollbackTarget(null), /no pointer/u);
  let crowded = pointerAfter({ previous: null, release: '000000000000', now: 't0' });
  for (let index = 1; index < 30; index++) crowded = pointerAfter({ previous: crowded, release: index.toString(16).padStart(12, '0'), now: `t${index}` });
  assert.equal(crowded.history.length, 20, 'the history is bounded');
  assert.equal(crowded.history[0]?.release, '00000000001d');
});
