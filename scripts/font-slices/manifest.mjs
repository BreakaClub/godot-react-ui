import { createHash } from 'node:crypto';
import { codepointsOf, formatRanges, parseUnicodeRange, rangesOf } from './partition.mjs';

// The slice manifest: what the library reads to find the slice that covers a character. The build writes it, the deploy
// script reads it to know which objects a release needs, and `src/font-slices/manifest.ts` parses it in the page. This module is the producer's side:
// it assembles the manifest and checks that one is consistent.
//
// There are two kinds of file. `font-slices.json` is the manifest proper, a few kilobytes: the licence, and for each family its name, the languages
// it is preferred for and the address of its index. A **family index** (`noto-sans-sc.index.json`) lists the family's slices with their hash, size and
// code point ranges, which is most of the bytes (the ranges of a frequency partition are sparse: 45,000 of them across the four families, 112 KiB
// even in brotli), so a page reads only the index of the family its text is in: about a quarter of the cost, and none of it until text needs a slice.
// Indexes and slices are content-addressed objects; the manifest is a release file.

export const MANIFEST_VERSION = 1;
/** The length of the hash in an object's path: the same address the release layout gives an object (`deploy/release-layout.mjs`). */
export const OBJECT_HASH_LENGTH = 32;
export const MANIFEST_FILE = 'font-slices.json';
export const LICENSE_FILE = 'OFL-Noto.txt';

/**
 * The families, in the order a text no language prefers is served from (a browser with no `lang` chooses Simplified Chinese for Han text, so does this).
 * `languages` are BCP 47 prefixes, lowercase: a family is preferred for a language when one of them begins it (`zh-tw` is Traditional, `zh-hans-cn`
 * is Simplified, a bare `zh` is Simplified). Hong Kong and Macau are Traditional here: Noto Sans HK is a fifth set of glyph forms this build does not make.
 *
 * `first` is where a family comes before the others whatever the language: the colour emoji are looked up first for the pictographs of the supplementary
 * plane (U+1F000 to U+1FAFF), where the CJK fonts also have monochrome glyphs for some of them, as a browser draws them. `shared` keeps the code points
 * Google lists in a slice in that slice's file (an emoji slice holds the joiner and the parts of the sequences it draws, so they shape in one font), and
 * `tailSize` is how many code points a tail slice holds where a character weighs more than an ideograph does.
 */
export const FAMILIES = [
  { language: 'sc', id: 'noto-sans-sc', name: 'Noto Sans SC', languages: ['zh-hans', 'zh-cn', 'zh-sg', 'zh-my', 'zh'], first: '', shared: false },
  { language: 'tc', id: 'noto-sans-tc', name: 'Noto Sans TC', languages: ['zh-hant', 'zh-tw', 'zh-hk', 'zh-mo', 'yue'], first: '', shared: false },
  { language: 'jp', id: 'noto-sans-jp', name: 'Noto Sans JP', languages: ['ja'], first: '', shared: false },
  { language: 'kr', id: 'noto-sans-kr', name: 'Noto Sans KR', languages: ['ko'], first: '', shared: false },
  { language: 'emoji', id: 'noto-color-emoji', name: 'Noto Color Emoji', languages: [], first: 'U+1f000-1faff', shared: true, tailSize: 48 },
];

export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** The address of an object inside the slice directory: `<hash>/<name>`, the tail of the `/o/<hash>/<name>` URL the Worker serves. */
export function objectPath(sha256, name) {
  return `${sha256.slice(0, OBJECT_HASH_LENGTH)}/${name}`;
}

/** The file name of a slice, `noto-sans-sc-004.woff2`. */
export function sliceFileName(sliceId) {
  return `noto-sans-${sliceId}.woff2`;
}

/** The file name of a family's index, `noto-sans-sc.index.json`. */
export function indexFileName(familyId) {
  return `${familyId}.index.json`;
}

/** The size of the blocks a family's coverage is told in. */
export const COVERAGE_BLOCK = 0x100;

/**
 * Where a family has characters, to the block: the ranges of the `COVERAGE_BLOCK` blocks that hold at least one. The page reads it to leave a family's index
 * unread when none of the characters it is looking for can be in the family (Hangul in Japanese text is only in the Korean family). A set of ranges that
 * is exact is large (the Traditional, Japanese and Korean fonts hold scattered subsets of the ideographs, 5,000 ranges each); one that is told by block is
 * a few dozen and tells the same for Hangul, kana and the scripts that matter here.
 */
export function coverageOf(codepoints) {
  const blocks = [...new Set(codepoints.map(codepoint => Math.floor(codepoint / COVERAGE_BLOCK)))].sort((left, right) => left - right);
  return formatRanges(rangesOf(blocks).map(([first, last]) => [first * COVERAGE_BLOCK, (last + 1) * COVERAGE_BLOCK - 1]));
}

function familyOf(language) {
  const family = FAMILIES.find(candidate => candidate.language === language);
  if (family === undefined) throw new Error(`No family serves the language ${language}`);
  return family;
}

function originOf(origins, family) {
  const origin = origins[family.language];
  if (origin === undefined) throw new Error(`No origin is given for ${family.language}`);
  return { name: origin.name, release: origin.release, url: origin.url, copyright: origin.copyright };
}

/** An index as text: one slice to a line, so a review of a new partition diffs by slice. */
export function indexText(index) {
  const lines = index.slices.map(slice => `  ${JSON.stringify(slice)}`).join(',\n');
  return `{\n "version": ${index.version},\n "family": ${JSON.stringify(index.family)},\n "slices": [\n${lines}\n ]\n}\n`;
}

/**
 * Assemble the manifest and the family indexes. `slices` are `{ id, language, source, codepoints, bytes, sha256, glyphs }` for every slice file made, in the
 * order to list them; `origins` says where each family's font came from, by language: `{ name, release, url, copyright }` (the copyright is the font's own
 * notice, name record 0); `tools` the versions that made the files. Returns the manifest and, for each family, its index file's name, text and hash.
 */
export function buildManifest({ origins, tools, slices }) {
  const indexes = FAMILIES.map(family => {
    const own = slices.filter(slice => familyOf(slice.language).id === family.id);
    const index = {
      version: MANIFEST_VERSION,
      family: family.id,
      slices: own.map(slice => ({
        id: slice.id,
        path: objectPath(slice.sha256, sliceFileName(slice.id)),
        bytes: slice.bytes,
        glyphs: slice.glyphs,
        sha256: slice.sha256,
        partition: slice.source,
        ranges: formatRanges(rangesOf(slice.codepoints)),
      })),
    };
    const text = indexText(index);
    const sha256 = sha256Hex(Buffer.from(text));
    const coverage = coverageOf(own.flatMap(slice => slice.codepoints));
    return { family, index, text, sha256, name: indexFileName(family.id), bytes: Buffer.byteLength(text), sliceBytes: own.reduce((total, slice) => total + slice.bytes, 0), coverage };
  });
  const manifest = {
    version: MANIFEST_VERSION,
    license: { id: 'OFL-1.1', file: LICENSE_FILE, url: 'https://openfontlicense.org/' },
    tools,
    families: indexes.map(({ family, index, sha256, name, bytes, sliceBytes, coverage }) => ({
      id: family.id,
      name: family.name,
      origin: originOf(origins, family),
      weight: 400,
      style: 'normal',
      languages: family.languages,
      first: family.first,
      slices: index.slices.length,
      sliceBytes,
      coverage,
      index: { path: objectPath(sha256, name), bytes, sha256 },
    })),
  };
  return { manifest, indexes };
}

/** What is wrong with a manifest and its indexes, as sentences; empty when they are consistent. `indexOf(family)` returns the parsed index of a family. */
export function manifestProblems(manifest, indexOf) {
  const problems = [];
  if (manifest.version !== MANIFEST_VERSION) problems.push(`version ${String(manifest.version)} is not ${MANIFEST_VERSION}`);
  const familyIds = new Set();
  const paths = new Set();
  for (const family of manifest.families) {
    if (familyIds.has(family.id)) problems.push(`family ${family.id} is listed twice`);
    familyIds.add(family.id);
    const index = indexOf(family);
    if (index.family !== family.id) problems.push(`the index of ${family.id} is of ${index.family}`);
    if (index.slices.length !== family.slices) problems.push(`${family.id}: the manifest says ${family.slices} slices, the index has ${index.slices.length}`);
    if (index.slices.reduce((total, slice) => total + slice.bytes, 0) !== family.sliceBytes) problems.push(`${family.id}: the slices' sizes do not add up to ${family.sliceBytes}`);
    if (!family.index.path.startsWith(`${family.index.sha256.slice(0, OBJECT_HASH_LENGTH)}/`)) problems.push(`${family.id}: the index path is not under its own hash`);
    const held = coverageOf(index.slices.flatMap(slice => codepointsOf(parseUnicodeRange(slice.ranges))));
    if (held !== family.coverage) problems.push(`${family.id}: its coverage is not where its slices' characters are`);
    const ids = new Set();
    const owner = new Map();
    for (const slice of index.slices) {
      if (ids.has(slice.id)) problems.push(`slice ${slice.id} is listed twice`);
      ids.add(slice.id);
      if (paths.has(slice.path)) problems.push(`path ${slice.path} is listed twice`);
      paths.add(slice.path);
      if (!/^[0-9a-f]{64}$/u.test(slice.sha256)) problems.push(`slice ${slice.id}: sha256 is not 64 hex digits`);
      if (!slice.path.startsWith(`${slice.sha256.slice(0, OBJECT_HASH_LENGTH)}/`)) problems.push(`slice ${slice.id}: its path is not under its own hash`);
      if (!Number.isSafeInteger(slice.bytes) || slice.bytes <= 0) problems.push(`slice ${slice.id}: bytes is ${String(slice.bytes)}`);
      for (const [start, end] of parseUnicodeRange(slice.ranges)) {
        for (let codepoint = start; codepoint <= end; codepoint += 1) {
          const other = owner.get(codepoint);
          if (other !== undefined && other !== slice.id) {
            problems.push(`U+${codepoint.toString(16)} is in both ${other} and ${slice.id}`);
            break;
          }
          owner.set(codepoint, slice.id);
        }
      }
    }
  }
  return problems;
}

/** Every object a manifest and its indexes name: each index and each slice, as `{ path, bytes, sha256 }`. `indexOf(family)` returns the parsed index. */
export function manifestObjects(manifest, indexOf) {
  return manifest.families.flatMap(family => [
    { path: family.index.path, bytes: family.index.bytes, sha256: family.index.sha256 },
    ...indexOf(family).slices.map(slice => ({ path: slice.path, bytes: slice.bytes, sha256: slice.sha256 })),
  ]);
}
