import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { rejectUnknownArguments } from './arguments.mjs';
import { FAMILIES, LICENSE_FILE, MANIFEST_FILE, buildManifest, manifestProblems, objectPath, sha256Hex, sliceFileName } from './font-slices/manifest.mjs';
import { planSlices } from './font-slices/partition.mjs';

// Builds the font slices the Web fallback downloads when text needs characters no registered font has:
// Noto Sans SC, TC, JP and KR, cut into woff2 files by unicode-range, content-addressed, with the manifest that maps characters to them.
//
//   node scripts/build-font-slices.mjs                 download (checked by sha256), slice, write artifacts/font-slices/dist
//   node scripts/build-font-slices.mjs --out=<dir>     write the result to <dir> (the determinism check builds twice and compares)
//   node scripts/build-font-slices.mjs --jobs=<n>      how many languages are sliced at once (default 2)
//
// Nothing here is a checked-in binary. The Noto Sans release is downloaded from its GitHub release page and each archive, and each file taken
// out of it, must match the size and sha256 `font-slices/sources.json` pins. fontTools runs isolated (`python3 -I`) in a virtual environment under
// artifacts/ at the versions `font-slices/requirements.txt` pins; the downloads and the extracted files are data in directories of their own,
// and no interpreter runs from inside them. The output is a function of the pinned inputs: the same files give the same hashes.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
rejectUnknownArguments(argv, { flags: [], prefixes: ['--out=', '--jobs='], engine: false });
const workRoot = join(root, 'artifacts', 'font-slices');
const outArgument = argv.find(argument => argument.startsWith('--out='))?.slice('--out='.length);
const outDirectory = resolve(outArgument ?? join(workRoot, 'dist'));
const jobsArgument = argv.find(argument => argument.startsWith('--jobs='))?.slice('--jobs='.length);
const jobs = jobsArgument === undefined ? 2 : Number(jobsArgument);
if (!Number.isInteger(jobs) || jobs < 1) throw new Error('--jobs= needs a positive integer');

const sourcesPath = join(root, 'scripts', 'font-slices', 'sources.json');
const sources = JSON.parse(readFileSync(sourcesPath, 'utf8'));
const googleRanges = JSON.parse(readFileSync(join(root, 'scripts', 'font-slices', 'google-ranges.json'), 'utf8'));
const requirements = readFileSync(join(root, 'scripts', 'font-slices', 'requirements.txt'), 'utf8').trim().split('\n');
const sliceScript = join(root, 'scripts', 'font-slices', 'slice.py');
const downloadDirectory = join(workRoot, 'downloads', 'noto');
const emojiDownloadDirectory = join(workRoot, 'downloads', 'emoji');
const venvDirectory = join(workRoot, 'venv');
const workDirectory = join(workRoot, 'work');
const python = join(venvDirectory, 'bin', 'python');
const DOWNLOAD_TIMEOUT_MS = 15 * 60 * 1000;

function log(message) {
  console.log(`[font-slices] ${message}`);
}

function fileSha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.slice(0, 3).join(' ')} failed (exit ${result.status}):\n${result.stderr || result.stdout}`);
  return result.stdout;
}

/** Fetch a file into `directory` unless a copy that matches its pinned size and hash is already there. Every download has a directory of its own. */
async function ensureDownload(pin, directory) {
  mkdirSync(directory, { recursive: true });
  const target = join(directory, pin.file);
  const matches = path => existsSync(path) && statSync(path).size === pin.bytes && fileSha256(path) === pin.sha256;
  if (matches(target)) return target;
  if (existsSync(target)) {
    log(`${pin.file} does not match its pin (a partial download?); fetching it again`);
    rmSync(target);
  }
  log(`Downloading ${pin.url} (${(pin.bytes / 1048576).toFixed(1)} MiB)`);
  const response = await fetch(pin.url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${pin.url}: ${response.status}`);
  const partial = `${target}.partial`;
  writeFileSync(partial, Buffer.from(await response.arrayBuffer()));
  if (!matches(partial)) {
    const got = `${statSync(partial).size} bytes, sha256 ${fileSha256(partial)}`;
    rmSync(partial);
    throw new Error(`${pin.url} is not the file the pin names: expected ${pin.bytes} bytes, sha256 ${pin.sha256}; got ${got}`);
  }
  renameSync(partial, target);
  return target;
}

/** The virtual environment fontTools and brotli live in, at exactly the pinned versions. */
function ensureEnvironment() {
  if (!existsSync(python)) {
    log(`Creating the virtual environment ${venvDirectory}`);
    run('python3', ['-I', '-m', 'venv', venvDirectory]);
    run(python, ['-I', '-m', 'pip', 'install', '--disable-pip-version-check', '--quiet', ...requirements]);
  }
  const found = JSON.parse(run(python, ['-I', sliceScript, 'versions']));
  for (const requirement of requirements) {
    const [name, version] = requirement.split('==');
    if (found[name] !== version) {
      throw new Error(`${venvDirectory} has ${name} ${String(found[name])}, the pin is ${version}. Delete ${venvDirectory} and run this again.`);
    }
  }
  return found;
}

/** Extract the font and the licence of an archive into a directory of their own, and check each against its pin. */
function extractArchive(archive, archivePath) {
  const directory = join(workDirectory, 'extract', archive.language);
  rmSync(directory, { recursive: true, force: true });
  run(python, ['-I', sliceScript, 'extract', archivePath, directory, archive.font.member, archive.license.member]);
  for (const part of [archive.font, archive.license]) {
    const path = join(directory, part.member);
    if (statSync(path).size !== part.bytes || fileSha256(path) !== part.sha256) {
      throw new Error(`${archive.file}: ${part.member} is not the file the pin names (sha256 ${fileSha256(path)}, expected ${part.sha256})`);
    }
  }
  return { font: join(directory, archive.font.member), license: join(directory, archive.license.member) };
}

/** Run `tasks` (functions returning promises), at most `limit` at once; rejects with the first failure. */
async function runLimited(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function sliceLanguage(planPath) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(python, ['-I', sliceScript, 'slice', planPath], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) reject(new Error(`slice.py ${planPath} failed (exit ${String(code)})`));
      else resolvePromise(output.trim().split('\n').map(line => JSON.parse(line)));
    });
  });
}

/** What the Worker's stored copy of a text weighs: brotli 11 with the largest window every browser accepts. */
function brotliSize(text) {
  const WINDOW_BITS = 24;
  return brotliCompressSync(Buffer.from(text), { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY, [zlibConstants.BROTLI_PARAM_LGWIN]: WINDOW_BITS } }).length;
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

/** Sample sentences: what a page with a line of text in each language needs. Written for this, not copied from anywhere. */
const SAMPLES = {
  sc: '你好，世界。今天天气很好，我们一起去公园玩吧。',
  tc: '你好，世界。今天天氣很好，我們一起去公園玩吧。',
  jp: 'こんにちは、世界。今日はいい天気ですね。公園へ行きましょう。',
  kr: '안녕하세요, 세계. 오늘은 날씨가 좋네요. 공원에 갑시다.',
  emoji: '😀🌈👍🚀❤🎉',
};

async function main() {
  const versions = ensureEnvironment();
  rmSync(workDirectory, { recursive: true, force: true });
  mkdirSync(workDirectory, { recursive: true });

  const planned = [];
  const licenses = new Set();
  const origins = {};
  const upstreamLicenses = [];
  /** Cut a font into slices: its code points, the partition Google serves for its family, the plan of files to write. */
  function plan({ language, fontPath, licensePath, origin }) {
    const family = FAMILIES.find(candidate => candidate.language === language);
    if (family === undefined) throw new Error(`No family is declared for ${language}`);
    const cmapPath = join(workDirectory, `${language}.cmap.json`);
    run(python, ['-I', sliceScript, 'cmap', fontPath, cmapPath]);
    const { codepoints, glyphs, copyright } = JSON.parse(readFileSync(cmapPath, 'utf8'));
    const faces = googleRanges.families[language]?.faces;
    if (faces === undefined) throw new Error(`google-ranges.json has no slices for ${language}`);
    const { slices, overlapping } = planSlices({ language, codepoints, faces, shared: family.shared, ...family.tailSize === undefined ? {} : { tailSize: family.tailSize } });
    log(`${language}: ${codepoints.length} code points, ${glyphs} glyphs, ${slices.length} slices (${slices.filter(slice => slice.source === 'tail').length} tail; ${overlapping} code points are in two of Google's slices)`);
    planned.push({ language, fontPath, slices });
    origins[language] = { ...origin, copyright };
    upstreamLicenses.push(readFileSync(licensePath, 'utf8'));
  }
  for (const archive of sources.archives) {
    const archivePath = await ensureDownload(archive, downloadDirectory);
    const extracted = extractArchive(archive, archivePath);
    licenses.add(archive.license.sha256);
    plan({ language: archive.language, fontPath: extracted.font, licensePath: extracted.license, origin: { name: sources.family, release: sources.version, url: sources.release.page } });
  }
  {
    const emoji = sources.emoji;
    const fontPath = await ensureDownload(emoji.font, emojiDownloadDirectory);
    const licensePath = await ensureDownload(emoji.license, emojiDownloadDirectory);
    licenses.add(emoji.license.sha256);
    plan({ language: 'emoji', fontPath, licensePath, origin: { name: emoji.family, release: emoji.version, url: emoji.release.page } });
  }
  if (licenses.size !== 1) throw new Error('The fonts carry different licence files; the build writes one');

  // Slice every language: one plan file each, run `jobs` at a time.
  const sliceDirectory = join(workDirectory, 'slices');
  const results = await runLimited(planned.map(({ language, fontPath, slices }) => async () => {
    const planPath = join(workDirectory, `${language}.plan.json`);
    const out = join(sliceDirectory, language);
    writeFileSync(planPath, JSON.stringify({ font: fontPath, out, slices: slices.map(slice => ({ file: `${slice.id}.woff2`, codepoints: slice.included })) }));
    const started = Date.now();
    const made = await sliceLanguage(planPath);
    log(`${language}: ${made.length} slices written in ${((Date.now() - started) / 1000).toFixed(0)} s`);
    return made;
  }), jobs);

  const made = [];
  planned.forEach(({ language, slices }, languageIndex) => {
    const byFile = new Map(results[languageIndex].map(entry => [entry.file, entry]));
    for (const slice of slices) {
      const entry = byFile.get(`${slice.id}.woff2`);
      if (entry === undefined) throw new Error(`slice.py wrote no ${slice.id}.woff2`);
      const bytes = readFileSync(join(sliceDirectory, language, `${slice.id}.woff2`));
      made.push({ ...slice, language, bytes: bytes.length, sha256: sha256Hex(bytes), glyphs: entry.glyphs, data: bytes });
    }
  });
  // The manifest lists the languages in the families' order, and the slices of one in the order the partition made them.
  made.sort((left, right) => FAMILIES.findIndex(family => family.language === left.language) - FAMILIES.findIndex(family => family.language === right.language));

  const { manifest, indexes } = buildManifest({
    origins,
    tools: { fonttools: versions.fonttools, brotli: versions.brotli },
    slices: made,
  });
  const problems = manifestProblems(manifest, family => indexes.find(entry => entry.family.id === family.id)?.index ?? { family: '', slices: [] });
  if (problems.length > 0) throw new Error(`The manifest is not consistent:\n  ${problems.slice(0, 20).join('\n  ')}`);

  // Written whole into a directory beside the output, then moved: a failed build leaves the last good output as it was.
  const staging = `${outDirectory}.partial`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(join(staging, 'o'), { recursive: true });
  for (const slice of made) {
    const path = join(staging, 'o', objectPath(slice.sha256, sliceFileName(slice.id)));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, slice.data);
  }
  for (const entry of indexes) {
    const path = join(staging, 'o', objectPath(entry.sha256, entry.name));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, entry.text);
  }
  const [upstream] = upstreamLicenses;
  if (upstream === undefined || upstreamLicenses.some(text => text !== upstream)) throw new Error('The fonts do not carry one licence text');
  writeFileSync(join(staging, LICENSE_FILE), licenseText(upstream, origins));
  writeFileSync(join(staging, MANIFEST_FILE), `${JSON.stringify(manifest, null, 1)}\n`);
  rmSync(outDirectory, { recursive: true, force: true });
  renameSync(staging, outDirectory);

  report(made, manifest, indexes);
  log(`Wrote ${outDirectory}`);
}

/** The licence file the slices ship with: the notices the OFL asks for, for each font, then the upstream licence file as it is. */
function licenseText(upstream, origins) {
  const fonts = [
    `${sources.family}, version ${sources.version} (${sources.release.page}), the subset OTF files for Simplified Chinese (Noto Sans SC), Traditional Chinese (Noto Sans TC),`,
    'Japanese (Noto Sans JP) and Korean (Noto Sans KR).',
    origins.sc?.copyright ?? '',
    '',
    `${sources.emoji.family}, version ${sources.emoji.version} (${sources.emoji.release.page}), the colour emoji font.`,
    origins.emoji?.copyright ?? '',
  ];
  return [
    ...fonts,
    '',
    'The font files served beside this notice are Modified Versions of those Font Software as the SIL Open Font License defines them: each holds',
    'only some of the glyphs of its font, is not hinted (the Noto Sans files), and is packed as WOFF2. They keep the Font Software\'s names and licensing',
    'records and are licensed under the same SIL Open Font License, Version 1.1, reproduced below as the upstream releases have it (both carry the same text).',
    '',
    '--------------------------------------------------------------------------------',
    '',
    upstream,
  ].join('\n');
}

function report(made, manifest, indexes) {
  const sizes = made.map(slice => slice.bytes).sort((left, right) => left - right);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const lines = [];
  const output = { slices: made.length, bytes: total, median: percentile(sizes, 0.5), p90: percentile(sizes, 0.9), largest: sizes.at(-1), smallest: sizes[0], languages: {}, samples: {} };
  for (const family of FAMILIES) {
    const own = made.filter(slice => slice.language === family.language);
    const ownSizes = own.map(slice => slice.bytes).sort((left, right) => left - right);
    const core = own.filter(slice => slice.source !== 'tail');
    output.languages[family.language] = {
      slices: own.length, core: core.length, tail: own.length - core.length, bytes: ownSizes.reduce((sum, size) => sum + size, 0),
      median: percentile(ownSizes, 0.5), largest: ownSizes.at(-1),
      codepoints: own.reduce((sum, slice) => sum + slice.codepoints.length, 0),
      indexBytes: indexes.find(entry => entry.family.language === family.language)?.bytes ?? 0,
      indexBrotli: brotliSize(indexes.find(entry => entry.family.language === family.language)?.text ?? ''),
    };
    const sample = SAMPLES[family.language];
    const needed = new Set();
    for (const character of new Set(sample)) {
      const codepoint = character.codePointAt(0) ?? 0;
      const slice = own.find(candidate => candidate.codepoints.includes(codepoint));
      if (slice !== undefined) needed.add(slice);
    }
    output.samples[family.language] = { text: sample, slices: [...needed].map(slice => slice.id), bytes: [...needed].reduce((sum, slice) => sum + slice.bytes, 0) };
  }
  lines.push(`${made.length} slices, ${(total / 1048576).toFixed(2)} MiB in all; each ${sizes[0]} to ${sizes.at(-1)} bytes, median ${output.median}, 90th percentile ${output.p90}`);
  for (const [language, entry] of Object.entries(output.languages)) {
    lines.push(`  ${language}: ${entry.slices} slices (${entry.core} Google, ${entry.tail} tail), ${entry.codepoints} code points, ${(entry.bytes / 1048576).toFixed(2)} MiB, median ${entry.median}, largest ${entry.largest}`
      + `; its index is ${(entry.indexBytes / 1024).toFixed(0)} KiB, ${(entry.indexBrotli / 1024).toFixed(0)} KiB in brotli`);
  }
  for (const [language, sample] of Object.entries(output.samples)) {
    lines.push(`  a line of ${language} text ("${sample.text}") needs ${sample.slices.length} slices: ${sample.slices.join(' ')}, ${(sample.bytes / 1024).toFixed(0)} KiB`);
  }
  const manifestText = `${JSON.stringify(manifest, null, 1)}\n`;
  output.manifestBytes = Buffer.byteLength(manifestText);
  output.manifestBrotli = brotliSize(manifestText);
  lines.push(`  the manifest is ${output.manifestBytes} bytes, ${output.manifestBrotli} in brotli`);
  for (const line of lines) log(line);
  writeFileSync(join(workRoot, 'report.json'), `${JSON.stringify(output, null, 1)}\n`);
}

await main().catch(error => {
  console.error(`[font-slices] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
