/**
 * The slice manifest: the small JSON file (`font-slices.json`) that lists the font families whose slices can be downloaded, and for each family an
 * index (`noto-sans-sc.index.json`) that says which file holds which characters. The build (`scripts/build-font-slices.mjs`) writes them; the page
 * reads the manifest only when text first needs a character no registered font has, so a page that never shows such text downloads nothing, and
 * the index of a family only when a character is looked up in it. They arrive from the network, so they are validated here, field by field, and one
 * that is not what this module expects is an error that says where, not a lookup that quietly finds nothing.
 */

/** The manifest format this module reads. */
export const FONT_SLICE_MANIFEST_VERSION = 1;

/** A run of code points, both ends included. */
export interface CodepointRange {
  readonly start: number;
  readonly end: number;
}

/** A file the app hosts beside the manifest: where it is, relative to the slice base URL the app configures, and what it must be. */
export interface FontSliceObject {
  /** `<hash>/<name>`. */
  readonly path: string;
  readonly bytes: number;
  /** Hex SHA-256 of the file. */
  readonly sha256: string;
}

/** Where a family's font came from. */
export interface FontSliceOrigin {
  readonly name: string;
  readonly release: string;
  readonly url: string;
  /** The font's own copyright notice. */
  readonly copyright: string;
}

/** A font that the slices belong to. Slices are of one weight and style, which stand in for every weight and style the text asks for. */
export interface FontSliceFamily {
  readonly id: string;
  readonly name: string;
  readonly origin: FontSliceOrigin;
  readonly weight: number;
  readonly style: 'normal' | 'italic';
  /** BCP 47 prefixes, lowercase: the family is preferred for text in a language one of them begins. */
  readonly languages: readonly string[];
  /** Where the family is looked up before the others, whatever the language (the colour emoji are for the pictographs): sorted and not overlapping. */
  readonly first: readonly CodepointRange[];
  /** How many slices the family has, and how many bytes they are in all. */
  readonly slices: number;
  readonly sliceBytes: number;
  /** The blocks of code points in which the family has a character, to the block: a character outside them is not looked up in the family's index. Sorted and not overlapping. */
  readonly coverage: readonly CodepointRange[];
  /** The family's index: its slices and what each holds. */
  readonly index: FontSliceObject;
}

export interface FontSliceManifest {
  readonly version: typeof FONT_SLICE_MANIFEST_VERSION;
  /** The licence the files are under, and the file that has its text, which is published beside the manifest. */
  readonly license: { readonly id: string; readonly file: string; readonly url: string };
  readonly families: readonly FontSliceFamily[];
}

/** One downloadable font file. */
export interface FontSlice extends FontSliceObject {
  readonly id: string;
  /** Sorted and not overlapping. */
  readonly ranges: readonly CodepointRange[];
}

/** The slices of one family. */
export interface FontSliceIndex {
  readonly family: string;
  readonly slices: readonly FontSlice[];
}

const MAXIMUM_CODEPOINT = 0x10ffff;
const HEX = 16;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const RANGE_PATTERN = /^U\+([0-9a-f]+)(?:-([0-9a-f]+))?$/iu;

function fail(what: string, problem: string): never {
  throw new Error(`The font slice manifest is not valid: ${what} ${problem}`);
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail(what, 'is not an object');
  return Object.fromEntries(Object.entries(value));
}

function list(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) return fail(what, 'is not an array');
  return [...value];
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string' || value === '') return fail(what, 'is not a non-empty string');
  return value;
}

function count(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return fail(what, 'is not a non-negative integer');
  return value;
}

/** `U+4e00-4e10,U+4e12` (CSS `unicode-range` syntax) as sorted ranges that do not overlap; the empty string is no ranges. */
export function parseCodepointRanges(source: string, what: string): CodepointRange[] {
  const ranges: CodepointRange[] = [];
  for (const part of source === '' ? [] : source.split(',')) {
    const match = RANGE_PATTERN.exec(part.trim());
    if (match === null) return fail(what, `has "${part}", which is not a code point or a range of them`);
    const start = Number.parseInt(match[1] ?? '', HEX);
    const end = match[2] === undefined ? start : Number.parseInt(match[2], HEX);
    if (end < start || end > MAXIMUM_CODEPOINT) return fail(what, `has "${part}", which is not a range of code points`);
    ranges.push({ start, end });
  }
  ranges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    const current = ranges[index];
    if (previous !== undefined && current !== undefined && current.start <= previous.end) return fail(what, `has ranges that overlap at U+${current.start.toString(HEX)}`);
  }
  return ranges;
}

/** A file's address, size and hash: a relative path that stays inside the base URL. */
function parseObject(value: unknown, what: string): FontSliceObject {
  const object = record(value, what);
  const sha256 = text(object.sha256, `${what} sha256`);
  if (!SHA256_PATTERN.test(sha256)) return fail(`${what} sha256`, 'is not 64 hex digits');
  const path = text(object.path, `${what} path`);
  if (path.startsWith('/') || path.split('/').some(part => part === '..')) return fail(`${what} path`, `"${path}" leaves the slice base URL`);
  const bytes = count(object.bytes, `${what} bytes`);
  if (bytes === 0) return fail(`${what} bytes`, 'is 0');
  return { path, bytes, sha256 };
}

/** Whether sorted, non-overlapping `ranges` hold `codepoint`. */
export function rangesContain(ranges: readonly CodepointRange[], codepoint: number): boolean {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = ranges[middle];
    if (range === undefined) return false;
    if (range.start > codepoint) high = middle - 1;
    else if (range.end < codepoint) low = middle + 1;
    else return true;
  }
  return false;
}

function parseFamily(value: unknown, index: number): FontSliceFamily {
  const what = `family ${index}`;
  const family = record(value, what);
  const style = text(family.style, `${what} style`);
  if (style !== 'normal' && style !== 'italic') return fail(`${what} style`, `is "${style}", not normal or italic`);
  const languages = list(family.languages, `${what} languages`).map((tag, tagIndex) => text(tag, `${what} language ${tagIndex}`).toLowerCase());
  const origin = record(family.origin, `${what} origin`);
  return {
    id: text(family.id, `${what} id`),
    name: text(family.name, `${what} name`),
    origin: {
      name: text(origin.name, `${what} origin name`), release: text(origin.release, `${what} origin release`),
      url: text(origin.url, `${what} origin url`), copyright: text(origin.copyright, `${what} origin copyright`),
    },
    weight: count(family.weight, `${what} weight`),
    style,
    languages,
    first: parseCodepointRanges(typeof family.first === 'string' ? family.first : fail(`${what} first`, 'is not a string'), `${what} first`),
    slices: count(family.slices, `${what} slices`),
    sliceBytes: count(family.sliceBytes, `${what} sliceBytes`),
    coverage: parseCodepointRanges(typeof family.coverage === 'string' ? family.coverage : fail(`${what} coverage`, 'is not a string'), `${what} coverage`),
    index: parseObject(family.index, `${what} index`),
  };
}

/** Check parsed JSON against the manifest format and return it typed. */
export function parseFontSliceManifest(value: unknown): FontSliceManifest {
  const manifest = record(value, 'the manifest');
  if (manifest.version !== FONT_SLICE_MANIFEST_VERSION) return fail('version', `is ${String(manifest.version)}, not ${FONT_SLICE_MANIFEST_VERSION}`);
  const license = record(manifest.license, 'license');
  const families = list(manifest.families, 'families').map(parseFamily);
  if (new Set(families.map(family => family.id)).size !== families.length) return fail('families', 'list a family twice');
  return {
    version: FONT_SLICE_MANIFEST_VERSION,
    license: { id: text(license.id, 'license id'), file: text(license.file, 'license file'), url: text(license.url, 'license url') },
    families,
  };
}

/** Check parsed JSON against the index format and return it typed; `family` is the one the manifest says the file is the index of. */
export function parseFontSliceIndex(value: unknown, family: string): FontSliceIndex {
  const index = record(value, `the index of ${family}`);
  if (index.version !== FONT_SLICE_MANIFEST_VERSION) return fail(`the index of ${family} version`, `is ${String(index.version)}, not ${FONT_SLICE_MANIFEST_VERSION}`);
  if (index.family !== family) return fail(`the index of ${family}`, `is of ${String(index.family)}`);
  const slices = list(index.slices, `the index of ${family} slices`).map((entry, position): FontSlice => {
    const slice = record(entry, `the index of ${family} slice ${position}`);
    const id = text(slice.id, `the index of ${family} slice ${position} id`);
    const what = `slice ${id}`;
    return { id, ...parseObject(slice, what), ranges: parseCodepointRanges(text(slice.ranges, `${what} ranges`), `${what} ranges`) };
  });
  if (new Set(slices.map(slice => slice.id)).size !== slices.length) return fail(`the index of ${family}`, 'lists a slice twice');
  return { family, slices };
}
