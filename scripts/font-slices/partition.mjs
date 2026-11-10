// The partition of a font's characters into slices: which code points go in which slice file. Pure, so it is tested
// without a font; `scripts/build-font-slices.mjs` supplies the font's code points and slices the fonts by the plan this returns.
//
// A language's slices are of two kinds. **Google's** are the ranges Google Fonts serves for the same family (`google-ranges.json`, recorded once
// from its stylesheet): the characters ordered by how often they are used together on the web, so the first slices cover most text and a page
// needs a few of them. They are intersected with the font's code points, because the font Google serves has fewer characters than the Noto
// Sans CJK subset OTF this build slices (the SC font here has 30,890 code points, Google's slices cover 13,637 of them). The characters no
// Google slice covers (rare ideographs, extension A, symbols) are **tail** slices: the rest in code point order, a fixed number to a slice.
// Together they cover every code point of the font exactly once, so a character the font has is always a character some slice has.

/** How many code points a tail slice holds: about what a Google slice holds (223 in the busiest), so a tail slice is about as heavy as one. */
export const TAIL_SLICE_CODEPOINTS = 256;

const MAXIMUM_CODEPOINT = 0x10ffff;

/** `U+4e00-4e10, U+4e12` as sorted, merged `[start, end]` pairs (inclusive). Throws on anything that is not that syntax. */
export function parseUnicodeRange(text) {
  const pairs = [];
  for (const part of text.split(',')) {
    const match = /^\s*U\+([0-9a-f]+)(?:-([0-9a-f]+))?\s*$/iu.exec(part);
    if (match === null) throw new Error(`Not a unicode-range item: "${part}"`);
    const start = Number.parseInt(match[1] ?? '', 16);
    const end = match[2] === undefined ? start : Number.parseInt(match[2], 16);
    if (end < start || end > MAXIMUM_CODEPOINT) throw new Error(`Not a code point range: "${part}"`);
    pairs.push([start, end]);
  }
  return mergePairs(pairs);
}

function mergePairs(pairs) {
  const sorted = [...pairs].sort((left, right) => left[0] - right[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last !== undefined && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** The sorted, distinct code points of ranges. */
export function codepointsOf(pairs) {
  const codepoints = [];
  for (const [start, end] of pairs) for (let codepoint = start; codepoint <= end; codepoint += 1) codepoints.push(codepoint);
  return codepoints;
}

/** Sorted, distinct code points as the `[start, end]` pairs that hold them. */
export function rangesOf(codepoints) {
  const pairs = [];
  for (const codepoint of codepoints) {
    const last = pairs.at(-1);
    if (last !== undefined && codepoint === last[1] + 1) last[1] = codepoint;
    else if (last === undefined || codepoint > last[1]) pairs.push([codepoint, codepoint]);
    else throw new Error(`Code points are not sorted and distinct at U+${codepoint.toString(16)}`);
  }
  return pairs;
}

/** Pairs in the syntax of a CSS `unicode-range`, without the spaces: `U+4e00-4e10,U+4e12`. */
export function formatRanges(pairs) {
  return pairs.map(([start, end]) => (start === end ? `U+${start.toString(16)}` : `U+${start.toString(16)}-${end.toString(16)}`)).join(',');
}

function padded(number) {
  return String(number).padStart(3, '0');
}

/**
 * The slices of one language.
 *
 * `faces` are Google's, as `google-ranges.json` records them (`{ name, index, ranges }`); `codepoints` are the font's, sorted and distinct. Returns the
 * slices in the order the manifest lists them: Google's numbered slices by number, then its named ones (`latin`, `cyrillic`) in file order, then the
 * tail. A slice is `{ id, source, codepoints, included }` where `source` is `google-<index>`, `google-<name>` or `tail`, `codepoints` are the ones the slice is
 * looked up for (no code point is in two slices) and `included` the ones its font file holds: the same, unless `shared` keeps every code point Google lists
 * in a slice in that slice's file. A Google slice the font has no code point of is left out. `overlapping` counts the code points Google lists in two of its
 * slices, which the earlier one keeps.
 */
export function planSlices({ language, codepoints, faces, tailSize = TAIL_SLICE_CODEPOINTS, shared = false }) {
  if (!Number.isInteger(tailSize) || tailSize < 1) throw new Error(`The tail slice size must be a positive integer, not ${String(tailSize)}`);
  const present = new Set(codepoints);
  if (present.size !== codepoints.length) throw new Error(`${language}: the font's code points repeat`);
  const claimed = new Map();
  const slices = [];
  let overlapping = 0;
  const ordered = [...faces].sort((left, right) => {
    if ((left.index === null) !== (right.index === null)) return left.index === null ? 1 : -1;
    return (left.index ?? 0) - (right.index ?? 0);
  });
  for (const face of ordered) {
    const label = face.index === null ? face.name : padded(face.index);
    if (label === null) throw new Error(`${language}: a Google slice has neither a name nor a number`);
    const listed = codepointsOf(parseUnicodeRange(face.ranges)).filter(codepoint => present.has(codepoint));
    // Google's own subsets overlap a little (U+0301 is in slice 119 and in `cyrillic`): the earlier slice keeps the code point.
    const own = listed.filter(codepoint => !claimed.has(codepoint));
    overlapping += listed.length - own.length;
    for (const codepoint of own) claimed.set(codepoint, label);
    // A family whose slices share code points on purpose (an emoji slice holds the joiner and the parts of the sequences it draws, so that they shape in one
    // font) puts all it lists in the font file; it is still looked up through the one slice that keeps the code point.
    if (own.length > 0) {
      slices.push({ id: `${language}-${label}`, source: face.index === null ? `google-${face.name}` : `google-${face.index}`, codepoints: own, included: shared ? listed : own });
    }
  }
  const rest = codepoints.filter(codepoint => !claimed.has(codepoint));
  for (let from = 0; from < rest.length; from += tailSize) {
    const own = rest.slice(from, from + tailSize);
    slices.push({ id: `${language}-t${padded(from / tailSize)}`, source: 'tail', codepoints: own, included: own });
  }
  const covered = slices.reduce((total, slice) => total + slice.codepoints.length, 0);
  if (covered !== codepoints.length) throw new Error(`${language}: the slices cover ${covered} code points of the font's ${codepoints.length}`);
  return { slices, overlapping };
}
