import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { brotliDecompressSync } from 'node:zlib';
import { objectKey } from '../deploy/release-layout.mjs';
import { LICENSE_FILE, MANIFEST_FILE, FAMILIES, buildManifest, objectPath, sha256Hex, sliceFileName, type FamilyIndex } from '../scripts/font-slices/manifest.mjs';
import { exportFontSlices, exportedFontSliceProblems, fontSlicesBuilt } from '../scripts/font-slices/paths.mjs';
import { fontSliceKeysOf, planFontSlices } from '../scripts/font-slices/release.mjs';

// What a deploy does with the font slices (scripts/font-slices/release.mjs and paths.mjs, docs/tracks/font-slices.md), against a small slice build laid out
// as the real one is: the manifest and licence, and `o/<hash>/<name>` for the indexes and the slices.

function temporary(): string {
  return mkdtempSync(join(tmpdir(), 'font-slices-deploy-test-'));
}

const ORIGINS = Object.fromEntries(FAMILIES.map(family => [family.language, { name: 'Test font', release: '1', url: 'https://example/font', copyright: '(c) test' }]));

interface Built {
  readonly directory: string;
  readonly manifestText: string;
  readonly sliceFiles: string[];
}

/** A slice build: one slice for Simplified Chinese and one for Japanese, an index for each family. */
function buildDirectory(root: string): Built {
  const directory = join(root, 'dist');
  const slices = [{ id: 'sc-000', language: 'sc', codepoints: [0x4e00, 0x4e01] }, { id: 'jp-000', language: 'jp', codepoints: [0x3042] }].map(slice => {
    const bytes = Buffer.from(`woff2 ${slice.id} `.repeat(30));
    return { ...slice, source: 'tail', bytes: bytes.length, sha256: sha256Hex(bytes), glyphs: slice.codepoints.length, data: bytes };
  });
  const { manifest, indexes } = buildManifest({ origins: ORIGINS, tools: {}, slices });
  const sliceFiles: string[] = [];
  const put = (path: string, content: Buffer | string): string => {
    const file = join(directory, 'o', ...path.split('/'));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    return file;
  };
  for (const slice of slices) sliceFiles.push(put(objectPath(slice.sha256, sliceFileName(slice.id)), slice.data));
  for (const entry of indexes) put(objectPath(entry.sha256, entry.name), entry.text);
  const manifestText = `${JSON.stringify(manifest, null, 1)}\n`;
  writeFileSync(join(directory, MANIFEST_FILE), manifestText);
  writeFileSync(join(directory, LICENSE_FILE), 'The SIL Open Font License\n');
  return { directory, manifestText, sliceFiles };
}

/** The release export beside it: carries the manifest and the licence, as a Web export does. */
function exportDirectory(root: string, built: Built): string {
  const output = join(root, 'export');
  mkdirSync(output, { recursive: true });
  exportFontSlices({ output, release: true, directory: built.directory });
  return output;
}

test('the plan lists every slice and index once, an index with its brotli copy, and reads each file against the manifest', async () => {
  const root = temporary();
  try {
    const built = buildDirectory(root);
    const output = exportDirectory(root, built);
    const plan = await planFontSlices({ exportDirectory: output, cacheDirectory: join(root, 'cache'), directory: built.directory });
    assert.equal(plan.slices, 2);
    assert.equal(plan.indexes, FAMILIES.length);
    assert.equal(plan.objects.length, 2 + FAMILIES.length * 2, 'two slices, and an index and its brotli copy for each family');
    assert.equal(new Set(plan.objects.map(object => object.key)).size, plan.objects.length);
    const kinds = Object.fromEntries(['slice', 'index', 'index-br'].map(kind => [kind, plan.objects.filter(object => object.kind === kind)]));
    assert.ok(kinds.slice?.every(object => object.contentType === 'font/woff2'));
    assert.ok(kinds.index?.every(object => object.contentType === 'application/json; charset=utf-8'));
    for (const copy of kinds['index-br'] ?? []) {
      const original = (kinds.index ?? []).find(object => object.key === copy.key.replace(/\.br$/u, ''));
      assert.ok(original, `${copy.key} is the brotli copy of an index`);
      assert.deepEqual(brotliDecompressSync(readFileSync(copy.file)), readFileSync(original.file));
      assert.equal(copy.contentType, 'application/octet-stream');
    }
    assert.equal(plan.sliceBytes, built.sliceFiles.reduce((total, file) => total + readFileSync(file).length, 0));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a deploy refuses slices that are not what the manifest names, and a release that does not carry the manifest or the licence', async () => {
  const cacheOf = (root: string): string => join(root, 'cache');
  const refused = async (change: (built: Built, output: string) => void, expected: RegExp): Promise<void> => {
    const root = temporary();
    try {
      const built = buildDirectory(root);
      const output = exportDirectory(root, built);
      change(built, output);
      await assert.rejects(planFontSlices({ exportDirectory: output, cacheDirectory: cacheOf(root), directory: built.directory }), expected);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
  await refused((built) => { writeFileSync(built.sliceFiles[0] ?? '', Buffer.from('not the font')); }, /is not the \d+ bytes the manifest names/u);
  await refused((built) => { const file = built.sliceFiles[0] ?? ''; const bytes = readFileSync(file); bytes[0] = (bytes[0] ?? 0) ^ 1; writeFileSync(file, bytes); }, /SHA-256 differs/u);
  await refused((built) => { rmSync(built.sliceFiles[1] ?? ''); }, /is not the \d+ bytes the manifest names/u);
  await refused((_, output) => { rmSync(join(output, MANIFEST_FILE)); }, /has no font-slices\.json/u);
  await refused((_, output) => { rmSync(join(output, LICENSE_FILE)); }, /without their licence/u);
  await refused((_, output) => { writeFileSync(join(output, MANIFEST_FILE), `${readFileSync(join(output, MANIFEST_FILE), 'utf8')} `); }, /is not the one .* holds/u);
});

test('the keys a release already holds are read from its font slice manifest and indexes', () => {
  const slices = [{ id: 'sc-000', language: 'sc', source: 'tail', codepoints: [0x4e00], bytes: 10, sha256: 'a'.repeat(64), glyphs: 1 }];
  const { manifest, indexes } = buildManifest({ origins: ORIGINS, tools: {}, slices });
  const reads: string[] = [];
  const objectsByKey = new Map<string, FamilyIndex>(indexes.map(entry => [objectKey(entry.sha256.slice(0, 32), 'identity'), entry.index]));
  const keys = fontSliceKeysOf(manifest, key => { reads.push(key); return objectsByKey.get(key) ?? null; });
  assert.ok(keys.includes(objectKey('a'.repeat(32), 'identity')), 'the slice');
  for (const entry of indexes) {
    assert.ok(keys.includes(objectKey(entry.sha256.slice(0, 32), 'identity')), `${entry.name}`);
    assert.ok(keys.includes(objectKey(entry.sha256.slice(0, 32), 'br')), `${entry.name} brotli copy`);
  }
  assert.equal(reads.length, FAMILIES.length, 'each index is read once');
});

test('an export carries the slice manifest and licence, and is refused when it no longer matches the slice build', () => {
  const root = temporary();
  try {
    const built = buildDirectory(root);
    const output = join(root, 'export');
    mkdirSync(output);
    assert.equal(fontSlicesBuilt(built.directory), true);
    assert.deepEqual(exportedFontSliceProblems(output, built.directory), [`the export has no ${MANIFEST_FILE}, and the slices are built`]);
    assert.equal(exportFontSlices({ output, release: true, directory: built.directory }), true);
    assert.equal(readFileSync(join(output, MANIFEST_FILE), 'utf8'), built.manifestText);
    assert.equal(readFileSync(join(output, LICENSE_FILE), 'utf8'), 'The SIL Open Font License\n');
    assert.deepEqual(exportedFontSliceProblems(output, built.directory), []);
    writeFileSync(join(built.directory, MANIFEST_FILE), `${built.manifestText} `);
    assert.match(exportedFontSliceProblems(output, built.directory).join(), /not the one the slice build last made/u);

    const missing = join(root, 'nothing-built');
    assert.equal(fontSlicesBuilt(missing), false);
    assert.throws(() => exportFontSlices({ output, release: true, directory: missing }), /run `node scripts\/build-font-slices\.mjs` first/u);
    assert.equal(existsSync(join(output, MANIFEST_FILE)), false, 'a copy left by an earlier export is taken out, so the receipt describes what is there');
    assert.equal(exportFontSlices({ output, release: false, directory: missing }), false, 'a debug export without the slices is allowed, with a note');
    assert.deepEqual(exportedFontSliceProblems(output, missing), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
