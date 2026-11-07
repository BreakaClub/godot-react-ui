import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFontSliceIndex, parseFontSliceManifest } from '../src/font-slices';
import {
  FAMILIES, buildManifest, coverageOf, manifestObjects, manifestProblems, objectPath, sha256Hex, sliceFileName, type FamilyIndex,
} from '../scripts/font-slices/manifest.mjs';
import {
  TAIL_SLICE_CODEPOINTS, codepointsOf, formatRanges, parseUnicodeRange, planSlices, rangesOf, type GoogleFace,
} from '../scripts/font-slices/partition.mjs';

// The build side of the font slices (scripts/font-slices/partition.mjs and manifest.mjs, docs/tracks/font-slices.md): the partition of a font's
// characters into slices, and the manifest that names them, which the page (src/font-slices) must be able to read.

test('a unicode-range is parsed as CSS writes it, merged and sorted, and printed back the same', () => {
  assert.deepEqual(parseUnicodeRange('U+4e00-4e10, U+4e12, u+20'), [[0x20, 0x20], [0x4e00, 0x4e10], [0x4e12, 0x4e12]]);
  assert.deepEqual(parseUnicodeRange('U+10-12,U+13-15,U+11'), [[0x10, 0x15]], 'adjacent and overlapping ranges merge');
  assert.equal(formatRanges(parseUnicodeRange('U+4e12, U+4e00-4e10')), 'U+4e00-4e10,U+4e12');
  for (const text of ['4e00', 'U+', 'U+zz', 'U+5-3', 'U+110000', '']) assert.throws(() => parseUnicodeRange(text), /Not a/u, text);
  assert.deepEqual(rangesOf([1, 2, 3, 7, 9, 10]), [[1, 3], [7, 7], [9, 10]]);
  assert.deepEqual(codepointsOf([[1, 3], [7, 7]]), [1, 2, 3, 7]);
  assert.throws(() => rangesOf([3, 2]), /not sorted/u);
});

const FACES: GoogleFace[] = [
  { name: null, index: 1, ranges: 'U+4e00-4e03' },
  { name: 'latin', index: null, ranges: 'U+41-42, U+4e03' },
  { name: null, index: 0, ranges: 'U+4e04-4e05, U+9999' },
  { name: null, index: 2, ranges: 'U+7777' },
];

test('a language\'s slices are Google\'s intersected with the font, then the rest in order', () => {
  const font = [0x41, 0x42, 0x43, 0x4e00, 0x4e01, 0x4e02, 0x4e03, 0x4e04, 0x4e05, 0x4e06, 0x5000, 0x5001, 0x5002];
  const { slices, overlapping } = planSlices({ language: 'xx', codepoints: font, faces: FACES, tailSize: 2 });
  assert.deepEqual(slices.map(slice => [slice.id, slice.source]), [
    ['xx-000', 'google-0'], ['xx-001', 'google-1'], ['xx-latin', 'google-latin'], ['xx-t000', 'tail'], ['xx-t001', 'tail'], ['xx-t002', 'tail'],
  ], 'numbered slices by number, the named after them, then the tail; slice 2 has nothing the font has and is left out');
  assert.deepEqual(slices[0]?.codepoints, [0x4e04, 0x4e05], 'a code point Google lists that the font lacks (U+9999) is not in the slice');
  assert.deepEqual(slices[1]?.codepoints, [0x4e00, 0x4e01, 0x4e02, 0x4e03]);
  assert.deepEqual(slices[2]?.codepoints, [0x41, 0x42], 'U+4E03 is in slice 1 and in latin: the earlier slice keeps it');
  assert.equal(overlapping, 1);
  assert.deepEqual(slices[3]?.codepoints, [0x43, 0x4e06], 'the tail is what no Google slice has, in code point order, tailSize to a slice');
  assert.deepEqual(slices[4]?.codepoints, [0x5000, 0x5001]);
  assert.deepEqual(slices[5]?.codepoints, [0x5002], 'the last tail slice holds what is left');
  const all = slices.flatMap(slice => slice.codepoints).sort((left, right) => left - right);
  assert.deepEqual(all, [...font].sort((left, right) => left - right), 'every code point is in a slice once');
});

test('the slices cover every code point of the font exactly once', () => {
  const font = Array.from({ length: 1000 }, (_, index) => 0x4e00 + index * 3);
  const { slices } = planSlices({ language: 'xx', codepoints: font, faces: FACES });
  const all = slices.flatMap(slice => slice.codepoints);
  assert.equal(all.length, font.length);
  assert.deepEqual([...new Set(all)].sort((left, right) => left - right), font);
  assert.ok(slices.filter(slice => slice.source === 'tail').every(slice => slice.codepoints.length <= TAIL_SLICE_CODEPOINTS));
  assert.throws(() => planSlices({ language: 'xx', codepoints: [1, 1], faces: [] }), /repeat/u);
  assert.throws(() => planSlices({ language: 'xx', codepoints: [1], faces: [], tailSize: 0 }), /positive integer/u);
});

const ORIGINS = Object.fromEntries(FAMILIES.map(family => [family.language, { name: 'Test font', release: '1', url: 'https://example/font', copyright: '(c) test' }]));

function present<T>(value: T | undefined): T {
  assert.ok(value !== undefined, 'a value the test relies on is missing');
  return value;
}

function made(id: string, language: string, codepoints: number[]) {
  const bytes = Buffer.from(`${id} ${codepoints.join(',')}`);
  return { id, language, source: 'tail', codepoints, bytes: bytes.length, sha256: sha256Hex(bytes), glyphs: codepoints.length };
}

test('a manifest the build writes is consistent, and the page reads it', () => {
  const slices = [
    made('sc-000', 'sc', [0x4e00, 0x4e01, 0x4e05]), made('sc-t000', 'sc', [0x5000, 0x5001]),
    made('tc-000', 'tc', [0x4e00]), made('jp-000', 'jp', [0x3042, 0x3044]), made('kr-000', 'kr', [0xac00, 0xac01]),
  ];
  const { manifest, indexes } = buildManifest({ origins: ORIGINS, tools: { fonttools: '4' }, slices });
  const indexOf = (family: { id: string }): FamilyIndex => present(indexes.find(entry => entry.family.id === family.id)).index;
  assert.deepEqual(manifestProblems(manifest, indexOf), []);
  assert.deepEqual(manifest.families.map(family => family.id), FAMILIES.map(family => family.id));
  assert.equal(manifest.families[0]?.slices, 2);
  assert.equal(manifest.families[0]?.coverage, 'U+4e00-4eff,U+5000-50ff', 'coverage is told by block of 256');

  // The page parses what the build wrote.
  const parsed = parseFontSliceManifest(JSON.parse(JSON.stringify(manifest)));
  assert.equal(parsed.families.length, FAMILIES.length);
  assert.deepEqual(parsed.families[0]?.coverage, [{ start: 0x4e00, end: 0x4eff }, { start: 0x5000, end: 0x50ff }]);
  for (const entry of indexes) {
    const index = parseFontSliceIndex(JSON.parse(entry.text), entry.family.id);
    assert.equal(index.slices.length, entry.index.slices.length);
  }
  const first = parseFontSliceIndex(JSON.parse(present(indexes[0]).text), 'noto-sans-sc').slices[0];
  assert.deepEqual(first?.ranges, [{ start: 0x4e00, end: 0x4e01 }, { start: 0x4e05, end: 0x4e05 }]);
  assert.equal(first?.path, objectPath(present(slices[0]).sha256, sliceFileName('sc-000')));

  // The deploy lists every object once: each slice and each index.
  const objects = manifestObjects(manifest, indexOf);
  assert.equal(objects.length, slices.length + FAMILIES.length);
  assert.equal(new Set(objects.map(object => object.path)).size, objects.length);
});

test('a manifest that does not hold together is reported, each problem by name', () => {
  const slices = [made('sc-000', 'sc', [0x4e00, 0x4e01]), made('sc-t000', 'sc', [0x4e02])];
  const { manifest, indexes } = buildManifest({ origins: ORIGINS, tools: {}, slices });
  const problemsWith = (change: (indexes: FamilyIndex[]) => void): string[] => {
    const copy = structuredClone(indexes.map(entry => entry.index));
    change(copy);
    return manifestProblems(manifest, family => copy.find(index => index.family === family.id) ?? { version: 1, family: '', slices: [] });
  };
  const sliceOf = (copy: FamilyIndex[], position: number) => present(present(copy[0]).slices[position]);
  assert.match(problemsWith(copy => { sliceOf(copy, 1).ranges = 'U+4e01'; }).join('\n'), /U\+4e01 is in both sc-000 and sc-t000/u);
  assert.match(problemsWith(copy => { sliceOf(copy, 1).path = 'ffff/x.woff2'; }).join('\n'), /not under its own hash/u);
  assert.match(problemsWith(copy => { sliceOf(copy, 1).sha256 = 'zz'; }).join('\n'), /not 64 hex digits/u);
  assert.match(problemsWith(copy => { present(copy[0]).slices.pop(); }).join('\n'), /the manifest says 2 slices, the index has 1/u);
  assert.match(problemsWith(copy => { sliceOf(copy, 0).bytes += 1; }).join('\n'), /do not add up/u);
  assert.match(problemsWith(copy => { sliceOf(copy, 1).ranges = 'U+9000'; }).join('\n'), /coverage is not where/u);
  assert.match(problemsWith(copy => { sliceOf(copy, 1).id = 'sc-000'; }).join('\n'), /listed twice/u);
});

test('coverage is the blocks of 256 code points a family has a character in', () => {
  assert.equal(coverageOf([0x41, 0x7e, 0x100, 0x4e00, 0x4e01, 0x9fa5, 0xac00]), 'U+0-1ff,U+4e00-4eff,U+9f00-9fff,U+ac00-acff');
  assert.equal(coverageOf([]), '');
});
