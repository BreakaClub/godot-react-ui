import assert from 'node:assert/strict';
import { brotliCompressSync } from 'node:zlib';
import test from 'node:test';
import worker from '../deploy/cloudflare-worker';
import { objectKey, POINTER_KEY, releaseKey, type ReleaseManifest } from '../deploy/release-layout.mjs';
import { hashBytes } from '../scripts/release-bundle.mjs';

// The Worker behind react.breaka.club (deploy/cloudflare-worker.ts) against an in-memory bucket.

const PREFIX = 'react-demo/v2';
const ORIGIN = 'https://react.breaka.club';
const RELEASE = 'abcdef012345';
const OLD_RELEASE = '0123456789ab';
const ROLLED_BACK_RELEASE = '13579bdf0246';

const html = Buffer.from('<!doctype html><base href="/r/abcdef012345/"><script src="index.js"></script>');
const script = Buffer.from('console.log("engine");'.repeat(200));
const wasm = Buffer.alloc(4000, 7);
const pack = Buffer.alloc(9000, 3);
const image = Buffer.from('png');

interface Stored { readonly bytes: Buffer }

function file(path: string, type: string, bytes: Buffer, compress: boolean): ReleaseManifest['files'][number] & { readonly encoded: Buffer | undefined } {
  const encoded = compress ? brotliCompressSync(bytes) : undefined;
  return { path, hash: hashBytes(bytes), type, size: bytes.length, encodings: encoded === undefined ? {} : { br: encoded.length }, encoded };
}

const files = [
  { ...file('index.html', 'text/html; charset=utf-8', html, false), bytes: html },
  { ...file('index.js', 'text/javascript; charset=utf-8', script, true), bytes: script },
  { ...file('index.wasm', 'application/wasm', wasm, true), bytes: wasm },
  { ...file('index.pck', 'application/octet-stream', pack, true), bytes: pack },
  { ...file('index.png', 'image/png', image, false), bytes: image },
];

function manifestOf(id: string): ReleaseManifest {
  return { version: 1, id, createdAt: '2026-11-07T00:00:00.000Z', source: {}, files: files.map(({ path, hash, type, size, encodings }) => ({ path, hash, type, size, encodings })) };
}

function bucket(options: { pointer?: unknown; releases?: readonly string[]; dropObjects?: readonly string[]; extra?: Readonly<Record<string, Buffer>> } = {}) {
  const objects = new Map<string, Stored>();
  const put = (key: string, bytes: Buffer): void => { objects.set(`${PREFIX}/${key}`, { bytes }); };
  if (options.pointer !== undefined) put(POINTER_KEY, Buffer.from(JSON.stringify(options.pointer)));
  for (const id of options.releases ?? [RELEASE]) put(releaseKey(id), Buffer.from(JSON.stringify(manifestOf(id))));
  for (const item of files) {
    if (options.dropObjects?.includes(item.path)) continue;
    put(objectKey(item.hash, 'identity'), item.bytes);
    if (item.encoded !== undefined) put(objectKey(item.hash, 'br'), item.encoded);
  }
  for (const [key, bytes] of Object.entries(options.extra ?? {})) put(key, bytes);
  const reads: string[] = [];
  return {
    reads,
    env: {
      REACT_DEMO_R2_PREFIX: PREFIX,
      ASSET_UPLOADS_BUCKET: {
        async get(key: string) {
          reads.push(key);
          const stored = objects.get(key);
          if (stored === undefined) return null;
          const body = new Response(stored.bytes).body;
          if (body === null) throw new Error('A response built from bytes has a body');
          return { size: stored.bytes.length, body, text: async () => stored.bytes.toString('utf8') };
        },
      },
    },
  };
}

const pointer = { version: 1, release: RELEASE, deployedAt: '2026-11-07T00:00:00.000Z', history: [{ release: RELEASE, deployedAt: '2026-11-07T00:00:00.000Z' }] };

function request(path: string, headers: Record<string, string> = {}, method = 'GET'): Request {
  return new Request(`${ORIGIN}${path}`, { method, headers });
}

async function bytesOf(response: Response): Promise<Buffer> {
  return Buffer.from(await response.arrayBuffer());
}

function find(path: string): (typeof files)[number] {
  const found = files.find(item => item.path === path);
  if (found === undefined) throw new Error(`The fixture has no ${path}`);
  return found;
}

test('the bare root goes to the lab navigator, and every response carries the cross-origin isolation headers', async () => {
  const { env } = bucket({ pointer });
  const redirect = await worker.fetch(request('/'), env);
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('location'), '/?demo=navigator');
  const responses = [
    redirect,
    await worker.fetch(request('/?demo=navigator'), env),
    await worker.fetch(request(`/r/${RELEASE}/index.js`), env),
    await worker.fetch(request(`/r/${RELEASE}/index.pck`), env),
    await worker.fetch(request(`/r/${RELEASE}/missing.js`), env),
    await worker.fetch(request('/nothing-here'), env),
    await worker.fetch(request('/', {}, 'POST'), env),
    await worker.fetch(request(`/o/${find('index.js').hash}/index.js`, { 'if-none-match': `"${find('index.js').hash}"` }), env),
  ];
  assert.deepEqual(responses.map(response => response.status), [302, 200, 200, 302, 404, 404, 405, 304]);
  for (const response of responses) {
    assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.equal(response.headers.get('cross-origin-embedder-policy'), 'require-corp');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
  }
});

test('the document is the current release\'s page, revalidated on every visit and answered 304 when it has not changed', async () => {
  const { env } = bucket({ pointer });
  for (const path of ['/?demo=navigator', '/index.html', '/?lab=glass']) {
    const response = await worker.fetch(request(path), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal(response.headers.get('content-encoding'), null);
    assert.deepEqual(await bytesOf(response), html);
  }
  const etag = (await worker.fetch(request('/?demo=navigator'), env)).headers.get('etag');
  assert.equal(etag, `"${find('index.html').hash}"`);
  const conditional = await worker.fetch(request('/?demo=navigator', { 'if-none-match': etag ?? '' }), env);
  assert.equal(conditional.status, 304);
  assert.equal((await bytesOf(conditional)).length, 0);
  assert.equal(conditional.headers.get('cache-control'), 'no-cache');
  assert.equal((await worker.fetch(request('/?demo=navigator', { 'if-none-match': '"something-else"' }), env)).status, 200);
});

test('the pointer decides the release: moving it moves the site, and an old release is still there for a page that has it open', async () => {
  const first = bucket({ pointer, releases: [RELEASE, OLD_RELEASE] });
  assert.equal((await worker.fetch(request(`/r/${OLD_RELEASE}/index.js`), first.env)).status, 200, 'a release other than the current one is served');
  const rolledBack = bucket({ pointer: { ...pointer, release: ROLLED_BACK_RELEASE }, releases: [RELEASE, ROLLED_BACK_RELEASE] });
  assert.equal((await worker.fetch(request('/'), rolledBack.env)).status, 302);
  assert.equal((await worker.fetch(request('/?demo=navigator'), rolledBack.env)).status, 200);
  const manifestKey = `${PREFIX}/${releaseKey(ROLLED_BACK_RELEASE)}`;
  assert.equal(rolledBack.reads.filter(key => key === manifestKey).length, 1, 'it read the manifest of the release the pointer names');
  assert.equal((await worker.fetch(request(`/r/${ROLLED_BACK_RELEASE}/index.js`), rolledBack.env)).status, 200);
  assert.equal(rolledBack.reads.filter(key => key === manifestKey).length, 1, 'a release never changes, so its manifest is read once');
  assert.equal((await worker.fetch(request('/?demo=navigator'), rolledBack.env)).status, 200);
  assert.equal(rolledBack.reads.filter(key => key === `${PREFIX}/${POINTER_KEY}`).length, 2, 'the pointer is read for every visit to the document, and for nothing else');
});

test('a file is sent brotli-compressed as stored when the browser accepts br, with the headers that make that right', async () => {
  const { env } = bucket({ pointer });
  const stored = find('index.js');
  const encoded = await worker.fetch(request(`/r/${RELEASE}/index.js`, { 'accept-encoding': 'gzip, deflate, br, zstd' }), env);
  assert.equal(encoded.status, 200);
  assert.equal(encoded.headers.get('content-encoding'), 'br');
  assert.equal(encoded.headers.get('vary'), 'Accept-Encoding');
  assert.equal(encoded.headers.get('cache-control'), 'public, max-age=31536000, immutable, no-transform', 'the edge is told to leave the stored encoding alone');
  assert.equal(encoded.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal(encoded.headers.get('etag'), `"${stored.hash}-br"`);
  assert.equal(encoded.headers.get('content-length'), String(stored.encoded?.length));
  assert.deepEqual(await bytesOf(encoded), stored.encoded, 'the stored copy, byte for byte');

  const plain = await worker.fetch(request(`/r/${RELEASE}/index.js`, { 'accept-encoding': 'gzip' }), env);
  assert.equal(plain.headers.get('content-encoding'), null);
  assert.equal(plain.headers.get('cache-control'), 'public, max-age=31536000, immutable', 'bytes sent as they are may be compressed by the edge');
  assert.equal(plain.headers.get('content-length'), null, 'so they carry no length of their own');
  assert.equal(plain.headers.get('etag'), `"${stored.hash}"`);
  assert.equal(plain.headers.get('vary'), 'Accept-Encoding');
  assert.deepEqual(await bytesOf(plain), script);
  for (const header of [undefined, 'br;q=0', 'identity', '*;q=0']) {
    const refused = await worker.fetch(request(`/r/${RELEASE}/index.js`, header === undefined ? {} : { 'accept-encoding': header }), env);
    assert.equal(refused.headers.get('content-encoding'), null, `Accept-Encoding ${header ?? '(none)'} does not take br`);
  }
  assert.equal((await worker.fetch(request(`/r/${RELEASE}/index.js`, { 'accept-encoding': '*' }), env)).headers.get('content-encoding'), 'br', '* covers br');
  const image = await worker.fetch(request(`/r/${RELEASE}/index.png`, { 'accept-encoding': 'br' }), env);
  assert.equal(image.headers.get('content-encoding'), null, 'an image has no compressed copy');
  assert.deepEqual(await bytesOf(image), find('index.png').bytes);
});

test('the browser\'s own Accept-Encoding decides, not the one Cloudflare rewrote before the Worker saw it', async () => {
  const { env } = bucket({ pointer });
  // Cloudflare hands a Worker `br, gzip` whatever the browser sent, and keeps the browser's header in `request.cf.clientAcceptEncoding`.
  const rewritten = (original: string): Request => {
    const incoming = request(`/r/${RELEASE}/index.js`, { 'accept-encoding': 'br, gzip' });
    Object.defineProperty(incoming, 'cf', { value: { clientAcceptEncoding: original } });
    return incoming;
  };
  assert.equal((await worker.fetch(rewritten('gzip, deflate, br, zstd'), env)).headers.get('content-encoding'), 'br');
  for (const original of ['gzip', 'identity', 'deflate']) {
    const response = await worker.fetch(rewritten(original), env);
    assert.equal(response.headers.get('content-encoding'), null, `a browser that sent "${original}" is not sent br`);
    assert.deepEqual(await bytesOf(response), script);
  }
});

test('a conditional request for an immutable file is answered 304 for the encoding the validator names', async () => {
  const { env } = bucket({ pointer });
  const stored = find('index.js');
  assert.equal((await worker.fetch(request(`/r/${RELEASE}/index.js`, { 'accept-encoding': 'br', 'if-none-match': `"${stored.hash}-br"` }), env)).status, 304);
  assert.equal((await worker.fetch(request(`/r/${RELEASE}/index.js`, { 'accept-encoding': 'br', 'if-none-match': `"${stored.hash}"` }), env)).status, 200, 'the identity validator does not match the br copy');
});

test('the large binaries redirect to their content address, which serves them for a year, so an unchanged binary is not fetched again', async () => {
  const { env } = bucket({ pointer });
  for (const [path, item] of [['index.pck', find('index.pck')], ['index.wasm', find('index.wasm')]] as const) {
    const redirect = await worker.fetch(request(`/r/${RELEASE}/${path}`), env);
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get('location'), `/o/${item.hash}/${path}`);
    assert.equal(redirect.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const content = await worker.fetch(request(redirect.headers.get('location') ?? ''), env);
    assert.equal(content.status, 200);
    assert.equal(content.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.equal(content.headers.get('content-type'), path.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
    const encoded = await worker.fetch(request(redirect.headers.get('location') ?? '', { 'accept-encoding': 'br' }), env);
    assert.equal(encoded.headers.get('content-encoding'), 'br');
    assert.deepEqual(await bytesOf(encoded), item.encoded);
    assert.deepEqual(await bytesOf(content), item.bytes);
  }
  // A script does not redirect: a worker started from a redirected script would take the other URL as its base.
  assert.equal((await worker.fetch(request(`/r/${RELEASE}/index.js`), env)).status, 200);
});

test('HEAD answers the headers of the GET with no body', async () => {
  const { env } = bucket({ pointer });
  const get = await worker.fetch(request(`/r/${RELEASE}/index.js`, { 'accept-encoding': 'br' }), env);
  const head = await worker.fetch(request(`/r/${RELEASE}/index.js`, { 'accept-encoding': 'br' }, 'HEAD'), env);
  assert.equal(head.status, 200);
  assert.equal((await bytesOf(head)).length, 0);
  for (const name of ['content-type', 'content-encoding', 'etag', 'cache-control', 'content-length']) assert.equal(head.headers.get(name), get.headers.get(name), name);
});

test('what is not a release file is a 404 and never reaches the bucket as a path outside a release', async () => {
  const { env, reads } = bucket({ pointer });
  for (const path of [
    `/r/${RELEASE}/nope.js`, `/r/${RELEASE}`, '/r/short/index.js', '/r/ABCDEF012345/index.js', `/r/${RELEASE}/../current.json`, '/o/short/index.js', `/o/${find('index.js').hash}`,
    `/o/${find('index.js').hash}/a/b`, '/index.pck', '/current.json', '/releases/x.json',
  ]) {
    const response = await worker.fetch(request(path), env);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('cache-control'), 'no-store', 'a 404 is not cached');
  }
  assert.ok(reads.every(key => !key.includes('..')), 'no traversal reached the bucket');
  const missingRelease = await worker.fetch(request('/r/ffffffffffff/index.js'), env);
  assert.equal(missingRelease.status, 404);
});

test('a site with no pointer says so (503), and a release that does not hold together is a logged 500, never a 404', async () => {
  const messages: string[] = [];
  const original = console.error;
  console.error = (message: unknown) => { messages.push(String(message)); };
  try {
    assert.equal((await worker.fetch(request('/?demo=navigator'), bucket().env)).status, 503);
    const dangling = bucket({ pointer: { ...pointer, release: 'ffffffffffff' } });
    assert.equal((await worker.fetch(request('/?demo=navigator'), dangling.env)).status, 500);
    const lost = bucket({ pointer, dropObjects: ['index.js'] });
    assert.equal((await worker.fetch(request(`/r/${RELEASE}/index.js`), lost.env)).status, 500);
    const corrupt = bucket({ pointer: { release: 'not an id' } });
    assert.equal((await worker.fetch(request('/?demo=navigator'), corrupt.env)).status, 500);
  } finally {
    console.error = original;
  }
  assert.equal(messages.length, 3);
  assert.match(messages[0] ?? '', /pointer names release ffffffffffff/u);
  assert.match(messages[1] ?? '', /does not have object/u);
  assert.match(messages[2] ?? '', /Invalid release data/u);
});

test('font slices are objects like any other: by hash, as font/woff2, for a year, to any page that is cross-origin isolated, with an index brotli-compressed', async () => {
  const slice = Buffer.from('wOF2'.repeat(500));
  const index = Buffer.from(JSON.stringify({ version: 1, family: 'noto-sans-sc', slices: [] }).repeat(40));
  const encodedIndex = brotliCompressSync(index);
  const { env } = bucket({
    pointer,
    extra: {
      [objectKey(hashBytes(slice), 'identity')]: slice,
      [objectKey(hashBytes(index), 'identity')]: index,
      [objectKey(hashBytes(index), 'br')]: encodedIndex,
    },
  });
  const font = await worker.fetch(request(`/o/${hashBytes(slice)}/noto-sans-sc-004.woff2`, { 'accept-encoding': 'gzip, deflate, br' }), env);
  assert.equal(font.status, 200);
  assert.equal(font.headers.get('content-type'), 'font/woff2');
  assert.equal(font.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(font.headers.get('content-encoding'), null, 'a font is not served in a second encoding');
  assert.equal(font.headers.get('cross-origin-resource-policy'), 'cross-origin');
  assert.equal(font.headers.get('cross-origin-embedder-policy'), 'require-corp');
  assert.deepEqual(await bytesOf(font), slice);

  const named = await worker.fetch(request(`/o/${hashBytes(index)}/noto-sans-sc.index.json`, { 'accept-encoding': 'br' }), env);
  assert.equal(named.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(named.headers.get('content-encoding'), 'br');
  assert.deepEqual(await bytesOf(named), encodedIndex);
  const plain = await worker.fetch(request(`/o/${hashBytes(index)}/noto-sans-sc.index.json`, { 'accept-encoding': 'identity' }), env);
  assert.equal(plain.headers.get('content-encoding'), null);
  assert.deepEqual(await bytesOf(plain), index);
});
