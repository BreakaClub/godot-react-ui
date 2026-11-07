import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rejectUnknownArguments } from '../arguments.mjs';

// Records the unicode-range partition that Google Fonts serves for Noto Sans SC, TC, JP and KR, and Noto Color Emoji, into `google-ranges.json`
// (docs/tracks/font-slices.md). It is run by a person, once, when the partition is to be taken again; the build never fetches it.
//
//   node scripts/font-slices/record-google-ranges.mjs --write     fetch the four stylesheets and write google-ranges.json
//   node scripts/font-slices/record-google-ranges.mjs             fetch and print a summary, write nothing
//
// The stylesheet that `fonts.googleapis.com/css2` answers is one `@font-face` per slice, each with the `unicode-range` its slice covers; the
// partition is Google's (it orders the characters by how often they are used together on the web, so the first slices cover most text). A browser
// asks for the stylesheet with its own User-Agent; woff2-capable browsers get the sliced form, which is why one is sent.

const here = dirname(fileURLToPath(import.meta.url));
rejectUnknownArguments(process.argv.slice(2), { flags: ['--write'] });
const write = process.argv.includes('--write');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const FAMILIES = [
  { language: 'sc', family: 'Noto Sans SC' },
  { language: 'tc', family: 'Noto Sans TC' },
  { language: 'jp', family: 'Noto Sans JP' },
  { language: 'kr', family: 'Noto Sans KR' },
  { language: 'emoji', family: 'Noto Color Emoji' },
];
const FETCH_TIMEOUT_MS = 30_000;
const FACE_PATTERN = /(?:\/\*\s*([^*]+?)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/gu;

function cssUrl(family) {
  return `https://fonts.googleapis.com/css2?family=${family.replaceAll(' ', '+')}:wght@400&display=swap`;
}

/** The faces of a stylesheet: `name` is the comment before a named one (`latin`), `index` the number in a numbered one's file name (`...woff2` after a `.N`). */
export function parseStylesheet(css) {
  const faces = [];
  for (const match of css.matchAll(FACE_PATTERN)) {
    const [, comment, body] = match;
    const file = /src:\s*url\((https:\/\/fonts\.gstatic\.com\/s\/[^)]+?)\)\s*format\('woff2'\)/u.exec(body ?? '');
    const ranges = /unicode-range:\s*([^;]+);/u.exec(body ?? '');
    if (file === null || ranges === null) throw new Error(`A @font-face block has no woff2 source or unicode-range: ${match[0].slice(0, 200)}`);
    const numbered = /\.(\d+)\.woff2$/u.exec(file[1] ?? '');
    if ((comment === undefined) === (numbered === null)) {
      throw new Error(`A slice is both named and numbered, or neither: ${file[1]} (comment ${String(comment)})`);
    }
    faces.push({
      name: comment === undefined ? null : comment,
      index: numbered === null ? null : Number(numbered[1]),
      ranges: (ranges[1] ?? '').trim(),
    });
  }
  return faces;
}

/** One face per line: the file is read in review, and a diff of a new partition shows which slices moved. */
function formatted(value) {
  const families = Object.entries(value.families).map(([language, family]) => {
    const faces = family.faces.map(face => `    ${JSON.stringify(face)}`).join(',\n');
    return `  ${JSON.stringify(language)}: {\n   "family": ${JSON.stringify(family.family)},\n   "stylesheet": ${JSON.stringify(family.stylesheet)},\n   "directory": ${JSON.stringify(family.directory)},\n   "faces": [\n${faces}\n   ]\n  }`;
  });
  const header = ['source', 'userAgent', 'retrieved'].map(key => ` ${JSON.stringify(key)}: ${JSON.stringify(value[key])}`).join(',\n');
  return `{\n${header},\n "families": {\n${families.join(',\n')}\n }\n}`;
}

const recorded = { source: 'https://fonts.googleapis.com/css2', userAgent: USER_AGENT, retrieved: new Date().toISOString().slice(0, 10), families: {} };
for (const { language, family } of FAMILIES) {
  const url = cssUrl(family);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const css = await response.text();
  const faces = parseStylesheet(css);
  const directory = /fonts\.gstatic\.com\/s\/([a-z0-9]+)\/(v\d+)\//u.exec(css);
  if (directory === null) throw new Error(`${url}: no gstatic directory in the stylesheet`);
  recorded.families[language] = { family, stylesheet: url, directory: `${directory[1]}/${directory[2]}`, faces };
  console.log(`${language}: ${family}, ${faces.length} slices (${faces.filter(face => face.name !== null).length} named), ${directory[1]}/${directory[2]}`);
}
if (write) {
  const target = join(here, 'google-ranges.json');
  writeFileSync(target, `${formatted(recorded)}\n`);
  console.log(`Wrote ${target}`);
}
