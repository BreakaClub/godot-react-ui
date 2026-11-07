import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mock, test } from 'node:test';
import {
  createFontSliceLoader, familiesFor, installFontSlices, languageSubtags, parseFontSliceIndex, parseFontSliceManifest,
  type FontSlice, type FontSliceFailure, type FontSliceFetch, type FontSliceHost, type FontSliceLoader, type FontSliceOptions,
} from '../src/font-slices';
import { SliceLookup } from '../src/font-slices/lookup';

// The runtime half of the font slices (docs/tracks/font-slices.md) against a fake network and a fake root: what it fetches and when, what it does
// not fetch twice, what it does when a request fails. The files it fetches are made here with the hashes the manifest pins.

const sha256 = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');

interface World {
  readonly fetch: FontSliceFetch;
  /** Every URL requested, in order. */
  readonly requested: string[];
  /** URLs whose answer is replaced: a status, or `hang` for a request that never answers. */
  readonly broken: Map<string, number | 'hang'>;
  /** Bytes served for a URL in place of the real ones. */
  readonly replaced: Map<string, Uint8Array>;
  readonly inFlight: { now: number; peak: number };
  /** Resolves a request that is held, by URL. */
  readonly held: Set<string>;
  release(url: string): void;
}

const BASE = 'https://slices.example/o/';
const MANIFEST_URL = 'https://slices.example/font-slices.json';

function fileBytes(label: string): Uint8Array {
  return new TextEncoder().encode(`font file ${label}`.padEnd(64, '.'));
}

/**
 * SC holds U+4E00..U+4E0F and U+1F600 in slice sc-1 and U+4E10..U+4E1F in sc-2; JP holds U+4E00..U+4E0F in jp-1 and U+3042 in jp-2; KR holds U+AC00; the
 * colour emoji hold U+1F600..U+1F60F in emoji-1 and are looked up first for U+1F000..U+1FAFF.
 */
function makeWorld(): World & { manifest: string; slice(id: string): { path: string; bytes: Uint8Array } } {
  const slices = [
    { family: 'noto-sans-sc', id: 'sc-1', ranges: 'U+4e00-4e0f,U+1f600' },
    { family: 'noto-sans-sc', id: 'sc-2', ranges: 'U+4e10-4e1f' },
    { family: 'noto-sans-jp', id: 'jp-1', ranges: 'U+4e00-4e0f' },
    { family: 'noto-sans-jp', id: 'jp-2', ranges: 'U+3042' },
    { family: 'noto-sans-kr', id: 'kr-1', ranges: 'U+ac00' },
    { family: 'noto-color-emoji', id: 'emoji-1', ranges: 'U+1f600-1f60f' },
  ].map(slice => {
    const bytes = fileBytes(slice.id);
    const hash = sha256(bytes);
    return { ...slice, bytes, hash, path: `${hash.slice(0, 32)}/${slice.id}.woff2` };
  });
  const files = new Map<string, Uint8Array>();
  const families = ['noto-sans-sc', 'noto-sans-tc', 'noto-sans-jp', 'noto-sans-kr', 'noto-color-emoji'].map(id => {
    const own = slices.filter(slice => slice.family === id);
    const text = `${JSON.stringify({
      version: 1, family: id,
      slices: own.map(slice => ({ id: slice.id, path: slice.path, bytes: slice.bytes.length, glyphs: 1, sha256: slice.hash, partition: 'test', ranges: slice.ranges })),
    })}\n`;
    const bytes = new TextEncoder().encode(text);
    const hash = sha256(bytes);
    const path = `${hash.slice(0, 32)}/${id}.index.json`;
    files.set(`${BASE}${path}`, bytes);
    return {
      id, name: id, origin: { name: 'Test font', release: '1', url: 'https://example/font', copyright: 'Test' }, first: id === 'noto-color-emoji' ? 'U+1f000-1faff' : '', weight: 400, style: 'normal', coverage: own.map(slice => slice.ranges).join(','), slices: own.length, sliceBytes: own.reduce((total, slice) => total + slice.bytes.length, 0),
      languages: { 'noto-sans-sc': ['zh-hans', 'zh'], 'noto-sans-tc': ['zh-hant', 'zh-tw'], 'noto-sans-jp': ['ja'], 'noto-sans-kr': ['ko'], 'noto-color-emoji': [] }[id],
      index: { path, bytes: bytes.length, sha256: hash },
    };
  });
  for (const slice of slices) files.set(`${BASE}${slice.path}`, slice.bytes);
  const manifest = `${JSON.stringify({ version: 1, license: { id: 'OFL-1.1', file: 'OFL.txt', url: 'https://example/ofl' }, families })}\n`;
  files.set(MANIFEST_URL, new TextEncoder().encode(manifest));

  const requested: string[] = [];
  const broken = new Map<string, number | 'hang'>();
  const replaced = new Map<string, Uint8Array>();
  const inFlight = { now: 0, peak: 0 };
  const held = new Set<string>();
  const waiting = new Map<string, () => void>();
  const fetchFake: FontSliceFetch = async (url, init) => {
    requested.push(url);
    inFlight.now += 1;
    inFlight.peak = Math.max(inFlight.peak, inFlight.now);
    try {
      const mode = broken.get(url);
      if (mode === 'hang') {
        await new Promise<void>((_, reject) => { init.signal.addEventListener('abort', () => { reject(new Error('aborted')); }); });
      }
      if (held.has(url)) {
        await new Promise<void>(resolve => { waiting.set(url, resolve); });
      }
      const bytes = replaced.get(url) ?? files.get(url);
      const status = typeof mode === 'number' ? mode : bytes === undefined ? 404 : 200;
      const served = bytes ?? new Uint8Array();
      const copy = new ArrayBuffer(served.byteLength);
      new Uint8Array(copy).set(served);
      return {
        ok: status === 200,
        status,
        statusText: status === 200 ? 'OK' : 'Not Found',
        arrayBuffer: () => Promise.resolve(copy),
      };
    } finally {
      inFlight.now -= 1;
    }
  };
  return {
    fetch: fetchFake, requested, broken, replaced, inFlight, held, manifest,
    release: url => { waiting.get(url)?.(); waiting.delete(url); },
    slice: id => {
      const found = slices.find(slice => slice.id === id);
      assert.ok(found, id);
      return { path: found.path, bytes: found.bytes };
    },
  };
}

interface Rig {
  readonly world: ReturnType<typeof makeWorld>;
  readonly loader: FontSliceLoader;
  readonly added: string[];
  /** How many fonts each call of the host's `addFontFallbacks` was given. */
  readonly batches: number[];
  readonly failures: FontSliceFailure[];
  readonly clock: { now: number };
}

function rig(extra: Partial<FontSliceOptions<string>> = {}, refuse: (font: string) => string = () => ''): Rig {
  const world = makeWorld();
  const added: string[] = [];
  const batches: number[] = [];
  const failures: FontSliceFailure[] = [];
  const clock = { now: 1_000_000 };
  const loader = createFontSliceLoader<string>(
    {
      addFontFallbacks: fonts => {
        const refusal = fonts.map(refuse).find(candidate => candidate !== '') ?? '';
        if (refusal === '') added.push(...fonts);
        batches.push(fonts.length);
        return refusal;
      },
    },
    {
      manifestUrl: MANIFEST_URL,
      sliceBaseUrl: BASE,
      fetch: world.fetch,
      makeFont: (bytes: ArrayBuffer, slice: FontSlice) => `${slice.id}:${bytes.byteLength}`,
      onFailure: failure => { failures.push(failure); },
      now: () => clock.now,
      language: 'zh-CN',
      ...extra,
    },
  );
  return { world, loader, added, batches, failures, clock };
}

const urlOf = (world: Rig['world'], id: string): string => `${BASE}${world.slice(id).path}`;

test('a page that asks for nothing fetches nothing', async () => {
  const { world, loader } = rig();
  await loader.whenIdle();
  assert.deepEqual(world.requested, []);
  assert.deepEqual(loader.status(), {
    manifest: 'unrequested', indexesLoaded: [], slicesLoading: 0, slicesLoaded: [], slicesFailed: [], requests: 0, bytesFetched: 0,
    addMilliseconds: [], codepointsServed: 0, codepointsUnmapped: 0, failures: [],
  });
});

test('the first characters fetch the manifest, the family index, then the slice that holds them, and add it as a fallback', async () => {
  const { world, loader, added, failures } = rig();
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(world.requested.length, 3);
  assert.equal(world.requested[0], MANIFEST_URL);
  assert.ok(world.requested[1]?.endsWith('noto-sans-sc.index.json'), world.requested[1]);
  assert.equal(world.requested[2], urlOf(world, 'sc-1'));
  assert.deepEqual(added, [`sc-1:${world.slice('sc-1').bytes.length}`]);
  assert.deepEqual(failures, []);
  const status = loader.status();
  assert.equal(status.manifest, 'ready');
  assert.deepEqual(status.indexesLoaded, ['noto-sans-sc']);
  assert.deepEqual(status.slicesLoaded, [world.slice('sc-1').path]);
  assert.equal(status.requests, 3);
  assert.equal(status.codepointsServed, 1);
  assert.equal(status.addMilliseconds.length, 1, 'the one call that added the font was timed');
  assert.ok((status.addMilliseconds[0] ?? -1) >= 0);
});

test('characters asked for again, or by two requests at once, fetch each file once', async () => {
  const { world, loader, added } = rig();
  loader.request([0x4e01]);
  loader.request([0x4e02, 0x4e03]);
  loader.request([0x4e01]);
  await loader.whenIdle();
  loader.request([0x4e04, 0x4e01]);
  await loader.whenIdle();
  assert.equal(world.requested.filter(url => url === MANIFEST_URL).length, 1);
  assert.equal(world.requested.filter(url => url.endsWith('.index.json')).length, 1);
  assert.equal(world.requested.filter(url => url === urlOf(world, 'sc-1')).length, 1);
  assert.equal(added.length, 1);
});

test('characters in different slices fetch each slice, together, and the fonts that arrive together are added together', async () => {
  const { world, loader, added, batches } = rig();
  loader.request([0x4e01, 0x4e11]);
  await loader.whenIdle();
  assert.deepEqual(added.map(font => font.split(':')[0]).sort(), ['sc-1', 'sc-2']);
  assert.equal(world.requested.length, 4);
  assert.deepEqual(batches, [2], 'one call for both, so the text is shaped again once');
});

test('a font that arrives after the batch window has passed is added on its own', async () => {
  const { loader, batches } = rig();
  loader.request([0x4e01]);
  await loader.whenIdle();
  loader.request([0x4e11]);
  await loader.whenIdle();
  assert.deepEqual(batches, [1, 1]);
});

test('the language chooses the family that has the character, and the next family when the first lacks it', async () => {
  const japanese = rig({ language: 'ja-JP' });
  japanese.loader.request([0x4e01, 0x3042]);
  await japanese.loader.whenIdle();
  assert.deepEqual(japanese.added.map(font => font.split(':')[0]).sort(), ['jp-1', 'jp-2']);
  assert.ok(!japanese.world.requested.some(url => url.includes('noto-sans-sc.index')), 'no Chinese index is read for Japanese text');

  const chinese = rig({ language: 'zh-CN' });
  chinese.loader.request([0x4e01]);
  await chinese.loader.whenIdle();
  assert.deepEqual(chinese.added.map(font => font.split(':')[0]), ['sc-1']);

  // Hangul in Japanese text: the families before Korean do not cover it, so their indexes are not read.
  const hangul = rig({ language: 'ja' });
  hangul.loader.request([0xac00]);
  await hangul.loader.whenIdle();
  assert.deepEqual(hangul.added.map(font => font.split(':')[0]), ['kr-1']);
  assert.deepEqual(hangul.loader.status().indexesLoaded, ['noto-sans-kr'], 'only the index that can hold the character is read');
});

test('a family that is first for a range is looked up before the language\'s, so an emoji is the colour one though a CJK font has a glyph for it', async () => {
  const { world, loader, added } = rig({ language: 'zh-CN' });
  loader.request([0x1f600, 0x4e01]);
  await loader.whenIdle();
  assert.deepEqual(added.map(font => font.split(':')[0]).sort(), ['emoji-1', 'sc-1']);
  assert.ok(world.requested.some(url => url.endsWith('noto-color-emoji.index.json')));
  // Outside its first range the colour family is last: a character both hold goes to the text family.
  const text = rig({ language: 'zh-CN' });
  text.loader.request([0x4e01]);
  await text.loader.whenIdle();
  assert.deepEqual(text.added.map(font => font.split(':')[0]), ['sc-1']);
  assert.ok(!text.world.requested.some(url => url.includes('noto-color-emoji')), 'the emoji index is not read for text');
});

test('a character no family has is reported as unmapped and not asked for again', async () => {
  const { world, loader, failures } = rig();
  loader.request([0x1f9ff]);
  await loader.whenIdle();
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.kind, 'unmapped');
  assert.deepEqual(failures[0]?.codepoints, [0x1f9ff]);
  assert.match(failures[0]?.message ?? '', /U\+1F9FF/u);
  const requests = world.requested.length;
  loader.request([0x1f9ff]);
  await loader.whenIdle();
  assert.equal(world.requested.length, requests);
  assert.equal(failures.length, 1);
  assert.equal(loader.status().codepointsUnmapped, 1);
});

test('with no handler, a failure goes to the console: a warning for a character no font has, an error for anything else', async () => {
  const warn = mock.method(console, 'warn', () => {});
  const error = mock.method(console, 'error', () => {});
  try {
    const unmapped = rig({ onFailure: undefined });
    unmapped.loader.request([0x1f9ff]);
    await unmapped.loader.whenIdle();
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0]?.arguments[0]), /^Font slices: no font slice has U\+1F9FF/u);
    assert.equal(error.mock.callCount(), 0);
    const broken = rig({ onFailure: undefined });
    broken.world.broken.set(MANIFEST_URL, 500);
    broken.loader.request([0x4e01]);
    await broken.loader.whenIdle();
    assert.equal(error.mock.callCount(), 1);
    assert.match(String(error.mock.calls[0]?.arguments[0]), /^Font slices: the font slice manifest .* 500/u);
  } finally {
    warn.mock.restore();
    error.mock.restore();
  }
});

test('a manifest that cannot be fetched is reported, nothing else is fetched, and the next request after the retry window tries again', async () => {
  const { world, loader, failures, added, clock } = rig();
  world.broken.set(MANIFEST_URL, 500);
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.kind, 'manifest');
  assert.match(failures[0]?.message ?? '', /500/u);
  assert.equal(world.requested.length, 1);
  assert.equal(loader.status().manifest, 'failed');
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(world.requested.length, 1, 'within the window the address is left alone');
  clock.now += 31_000;
  world.broken.delete(MANIFEST_URL);
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(added.length, 1);
  assert.equal(loader.status().manifest, 'ready');
});

test('a manifest that is not valid is reported with where', async () => {
  const { world, loader, failures } = rig();
  world.replaced.set(MANIFEST_URL, new TextEncoder().encode('{"version":2}'));
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(failures[0]?.kind, 'manifest');
  assert.match(failures[0]?.message ?? '', /version is 2, not 1/u);
});

test('a slice that cannot be fetched stays boxes, is reported, and is tried again after the window', async () => {
  const { world, loader, failures, added, clock } = rig();
  const url = urlOf(world, 'sc-1');
  world.broken.set(url, 404);
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.kind, 'slice');
  assert.equal(failures[0]?.sliceId, 'sc-1');
  assert.equal(failures[0]?.url, url);
  assert.deepEqual(added, []);
  assert.deepEqual(loader.status().slicesFailed, [world.slice('sc-1').path]);
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(world.requested.filter(candidate => candidate === url).length, 1, 'left alone inside the window');
  clock.now += 31_000;
  world.broken.delete(url);
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(added.length, 1, 'the characters that failed are asked for again');
  assert.equal(failures.length, 1);
  assert.equal(loader.status().codepointsServed, 1);
});

test('a slice that is not the file the manifest names is refused: wrong size, wrong hash', async () => {
  const size = rig();
  size.world.replaced.set(urlOf(size.world, 'sc-1'), new Uint8Array(10));
  size.loader.request([0x4e01]);
  await size.loader.whenIdle();
  assert.equal(size.failures[0]?.kind, 'slice');
  assert.match(size.failures[0]?.message ?? '', /10 bytes, the manifest says 64/u);
  assert.deepEqual(size.added, []);

  const hash = rig();
  hash.world.replaced.set(urlOf(hash.world, 'sc-1'), new Uint8Array(64).fill(7));
  hash.loader.request([0x4e01]);
  await hash.loader.whenIdle();
  assert.equal(hash.failures[0]?.kind, 'slice');
  assert.match(hash.failures[0]?.message ?? '', /SHA-256/u);
  assert.deepEqual(hash.added, []);
});

test('a slice the engine cannot read, or refuses, is reported as a font failure', async () => {
  const unreadable = rig({ makeFont: () => { throw new Error('Godot could not read the font'); } });
  unreadable.loader.request([0x4e01]);
  await unreadable.loader.whenIdle();
  assert.equal(unreadable.failures[0]?.kind, 'font');
  assert.match(unreadable.failures[0]?.message ?? '', /Godot could not read the font/u);

  const refused = rig({}, () => 'the root has no theme font');
  refused.loader.request([0x4e01]);
  await refused.loader.whenIdle();
  assert.equal(refused.failures[0]?.kind, 'font');
  assert.match(refused.failures[0]?.message ?? '', /no theme font/u);
  assert.deepEqual(refused.loader.status().slicesLoaded, []);
});

test('a host that throws is reported like one that refuses, and the slices do not stay loading', async () => {
  const world = makeWorld();
  const failures: FontSliceFailure[] = [];
  const loader = createFontSliceLoader<string>(
    { addFontFallbacks: () => { throw new Error('the root is gone'); } },
    { manifestUrl: MANIFEST_URL, sliceBaseUrl: BASE, fetch: world.fetch, language: 'zh-CN', makeFont: (bytes, slice) => `${slice.id}:${bytes.byteLength}`, onFailure: failure => { failures.push(failure); } },
  );
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(failures[0]?.kind, 'font');
  assert.match(failures[0]?.message ?? '', /the root is gone/u);
  assert.equal(loader.status().slicesLoading, 0);
  assert.deepEqual(loader.status().slicesFailed, [world.slice('sc-1').path]);
});

test('a request that never answers is given up on after the timeout', async () => {
  const { world, loader, failures } = rig({ timeoutMs: 20 });
  world.broken.set(MANIFEST_URL, 'hang');
  loader.request([0x4e01]);
  await loader.whenIdle();
  assert.equal(failures[0]?.kind, 'manifest');
  assert.match(failures[0]?.message ?? '', /did not arrive within 20 ms/u);
});

test('disposing aborts what is in flight and adds nothing afterwards', async () => {
  const { world, loader, added, failures } = rig();
  const url = urlOf(world, 'sc-1');
  world.held.add(url);
  loader.request([0x4e01]);
  while (!world.requested.includes(url)) await new Promise(resolve => setTimeout(resolve, 1));
  loader.dispose();
  world.release(url);
  await loader.whenIdle();
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.deepEqual(added, []);
  assert.ok(failures.every(failure => failure.kind === 'slice'), JSON.stringify(failures));
  loader.request([0x4e02]);
  assert.equal(world.requested.filter(candidate => candidate === MANIFEST_URL).length, 1, 'a disposed loader asks for nothing');
});

test('no more slices are fetched at once than the limit', async () => {
  const { world, loader, added } = rig({ maxConcurrent: 1 });
  loader.request([0x4e01, 0x4e11]);
  await loader.whenIdle();
  assert.equal(added.length, 2);
  assert.equal(world.inFlight.peak, 1);
});

test('text that still has no glyph after its slice is in is reported as a font failure, once', async () => {
  const { loader, failures } = rig();
  loader.request([0x4e01]);
  await loader.whenIdle();
  loader.request([0x4e02]);
  await loader.whenIdle();
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.kind, 'font');
  assert.match(failures[0]?.message ?? '', /sc-1 is loaded but text still has no glyph for U\+4E02/u);
  loader.request([0x4e02]);
  await loader.whenIdle();
  assert.equal(failures.length, 1);
});

test('onChange is told when the status moves, and a handler that throws is reported and does not stop the loader', async () => {
  let changes = 0;
  const first = rig({ onChange: () => { changes += 1; } });
  first.loader.request([0x4e01]);
  await first.loader.whenIdle();
  assert.ok(changes >= 4, `the manifest, the index, the slice queued and the font added each moved the status (${changes})`);
  const error = mock.method(console, 'error', () => {});
  try {
    const second = rig({ onChange: () => { throw new Error('the view is gone'); } });
    second.loader.request([0x4e01]);
    await second.loader.whenIdle();
    assert.equal(second.added.length, 1, 'the font was still added');
    assert.ok(error.mock.calls.some(call => /onChange handler threw: the view is gone/u.test(String(call.arguments[0]))));
  } finally {
    error.mock.restore();
  }
});

test('a base URL without a trailing slash is refused', () => {
  assert.throws(() => rig({ sliceBaseUrl: 'https://slices.example/o' }), /must end with a slash/u);
});

test('the installed loader asks for what the host reports, and stops listening when disposed', async () => {
  const world = makeWorld();
  let listener: ((codepoints: readonly number[]) => void) | undefined;
  const added: string[] = [];
  const host: FontSliceHost<string> = {
    addFontFallbacks: fonts => { added.push(...fonts); return ''; },
    subscribeToMissingGlyphs: next => { listener = next; return () => { listener = undefined; }; },
  };
  const loader = installFontSlices(host, {
    manifestUrl: MANIFEST_URL, sliceBaseUrl: BASE, fetch: world.fetch, language: 'zh-CN', makeFont: (bytes, slice) => `${slice.id}:${bytes.byteLength}`,
  });
  assert.equal(world.requested.length, 0);
  listener?.([0x4e01]);
  await loader.whenIdle();
  assert.equal(added.length, 1);
  loader.dispose();
  assert.equal(listener, undefined);
});

test('the manifest and an index are read only when they are exactly what the format says', () => {
  const valid = {
    version: 1, license: { id: 'OFL-1.1', file: 'f', url: 'u' },
    families: [{ id: 'a', name: 'A', origin: { name: 'n', release: '1', url: 'u', copyright: 'c' }, weight: 400, style: 'normal', languages: ['ZH'], first: '', slices: 1, sliceBytes: 5, coverage: 'U+4e00-4e0f', index: { path: 'ab/a.index.json', bytes: 5, sha256: 'a'.repeat(64) } }],
  };
  assert.deepEqual(parseFontSliceManifest(valid).families[0]?.languages, ['zh'], 'tags are lowercased');
  for (const [mutate, expected] of [
    [(m: Record<string, unknown>) => { m.version = 2; }, /version is 2/u],
    [(m: Record<string, unknown>) => { m.families = 'none'; }, /families is not an array/u],
    [(m: Record<string, unknown>) => { delete m.license; }, /license is not an object/u],
  ] as const) {
    const copy: Record<string, unknown> = JSON.parse(JSON.stringify(valid));
    mutate(copy);
    assert.throws(() => parseFontSliceManifest(copy), expected);
  }
  const escaping = JSON.parse(JSON.stringify(valid));
  escaping.families[0].index.path = '../other/a.index.json';
  assert.throws(() => parseFontSliceManifest(escaping), /leaves the slice base URL/u);
  const badHash = JSON.parse(JSON.stringify(valid));
  badHash.families[0].index.sha256 = 'xyz';
  assert.throws(() => parseFontSliceManifest(badHash), /not 64 hex digits/u);

  const slice = { id: 's', path: 'ab/s.woff2', bytes: 9, glyphs: 1, sha256: 'b'.repeat(64), partition: 'p', ranges: 'U+4e00-4e0f,U+4e20' };
  const index = parseFontSliceIndex({ version: 1, family: 'a', slices: [slice] }, 'a');
  assert.deepEqual(index.slices[0]?.ranges, [{ start: 0x4e00, end: 0x4e0f }, { start: 0x4e20, end: 0x4e20 }]);
  assert.throws(() => parseFontSliceIndex({ version: 1, family: 'b', slices: [slice] }, 'a'), /is of b/u);
  assert.throws(() => parseFontSliceIndex({ version: 1, family: 'a', slices: [{ ...slice, ranges: 'U+4e00-4e0f,U+4e08' }] }, 'a'), /overlap/u);
  assert.throws(() => parseFontSliceIndex({ version: 1, family: 'a', slices: [{ ...slice, ranges: 'nonsense' }] }, 'a'), /not a code point or a range/u);
  assert.throws(() => parseFontSliceIndex({ version: 1, family: 'a', slices: [slice, slice] }, 'a'), /lists a slice twice/u);
});

test('a lookup finds the slice by bisection and refuses an index in which two slices hold a character', () => {
  const object = { bytes: 1, sha256: 'a'.repeat(64) };
  const lookup = new SliceLookup({
    family: 'a',
    slices: [
      { id: 'x', path: 'x', ...object, ranges: [{ start: 10, end: 19 }, { start: 100, end: 100 }] },
      { id: 'y', path: 'y', ...object, ranges: [{ start: 20, end: 29 }] },
    ],
  });
  assert.equal(lookup.sliceOf(10)?.id, 'x');
  assert.equal(lookup.sliceOf(19)?.id, 'x');
  assert.equal(lookup.sliceOf(20)?.id, 'y');
  assert.equal(lookup.sliceOf(100)?.id, 'x');
  assert.equal(lookup.sliceOf(9), undefined);
  assert.equal(lookup.sliceOf(30), undefined);
  assert.equal(lookup.sliceOf(101), undefined);
  assert.throws(() => new SliceLookup({
    family: 'a',
    slices: [{ id: 'x', path: 'x', ...object, ranges: [{ start: 10, end: 20 }] }, { id: 'y', path: 'y', ...object, ranges: [{ start: 20, end: 30 }] }],
  }), /both x and y/u);
});

test('the families a language prefers come first, the rest in the manifest order', () => {
  const family = (id: string, languages: string[]) => ({ id, name: id, origin: { name: id, release: '1', url: 'u', copyright: 'c' }, weight: 400, style: 'normal' as const, languages, first: [], slices: 1, sliceBytes: 1, coverage: [], index: { path: 'p', bytes: 1, sha256: 'a'.repeat(64) } });
  const families = [family('sc', ['zh-hans', 'zh-cn', 'zh']), family('tc', ['zh-hant', 'zh-tw', 'zh-hk']), family('jp', ['ja']), family('kr', ['ko'])];
  const order = (language: string | undefined): string => familiesFor(families, language).map(candidate => candidate.id).join(' ');
  assert.equal(order('zh-TW'), 'tc sc jp kr');
  assert.equal(order('zh-Hant-HK'), 'tc sc jp kr');
  assert.equal(order('zh-Hans-CN'), 'sc tc jp kr');
  assert.equal(order('zh'), 'sc tc jp kr', 'a bare zh is Simplified');
  assert.equal(order('zh_TW'), 'tc sc jp kr', 'a POSIX locale is read as the tag');
  assert.equal(order('ja-JP'), 'jp sc tc kr');
  assert.equal(order('ko-KR'), 'kr sc tc jp');
  assert.equal(order('en-US'), 'sc tc jp kr', 'a language no family prefers keeps the manifest order');
  assert.equal(order(undefined), 'sc tc jp kr');
  assert.deepEqual(languageSubtags('ja_JP.UTF-8'), ['ja', 'jp']);
});
