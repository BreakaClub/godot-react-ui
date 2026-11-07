// The text styles lab (demo/src/text-styles-data.ts) as plain HTML with the CSS Tailwind 3.4.17 makes of its classes
// (scripts/text-styles-reference.css), rendered by headless Chrome through Puppeteer, to compare with what the library draws
// (docs/tracks/utilities-text.md).
//
//   node --import tsx scripts/text-styles-reference.mjs [--out=<dir>] [--page=<id>[,<id>]] [--smoothing=antialiased]
//       Renders each page to <dir>/chrome-<page>-dpr<N>.png and writes <dir>/chrome-<page>-dpr<N>.json with, for each text, its
//       box and its lines (the left end and width of the glyphs, the top and the baseline), for the two windows the native
//       verifier has: 1120 x 800 at device pixel ratio 1, and 560 x 400 at ratio 2 (content scale two). With
//       `--smoothing=antialiased` the page sets `-webkit-font-smoothing: antialiased`, which switches off the dilation macOS
//       applies to glyphs, and the files are named chrome-aa-<page>-dpr<N>.
//   node --import tsx scripts/text-styles-reference.mjs --golden
//       Writes demo/src/text-styles-golden.ts and scripts/text-styles-golden.json: the numbers Chrome reports for every text (box,
//       lines, the text a copy gives, where each character of the selection texts is). The native and Web verifiers hold the
//       library to them; do not edit by hand.
//   node --import tsx scripts/text-styles-reference.mjs --diff --native=<dir> [--chrome=<dir>] [--out=<dir>]
//       Compares the native verifier's captures (<dir>/text-styles-<page>-dpr<N>.png) with Chrome's (default smoothing and
//       antialiased), per channel and in how much ink each draws, and writes <out>/<page>-dpr<N>.png (Chrome, Chrome antialiased,
//       ours and their difference side by side) and <out>/report.json.
//   node --import tsx scripts/text-styles-reference.mjs --compare=<out.png> <label>=<image> ...
//       Puts the images side by side, each under its label, in one PNG.
//
// Input is none: the pages are static. No real OS input is generated and no window opens (headless).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
// tsx loads the TypeScript data module as CommonJS, whose named exports an ES module reads through the default.
import textData from '../demo/src/text-styles-data.ts';

const { DEMO_FACES, PAGES, textClassName } = textData;
const SMOOTHING = ['default', 'antialiased'];

rejectUnknownArguments(process.argv.slice(2).filter(value => value.startsWith('-')), { flags: ['--golden', '--diff'], prefixes: ['--out=', '--compare=', '--page=', '--smoothing=', '--native=', '--chrome='] });
const root = resolve(import.meta.dirname, '..');
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const VIEWPORTS = [['dpr1', 1120, 800, 1], ['dpr2', 560, 400, 2]];
const SETTLE_MS = 200;
/** The family names of the faces, as scripts/text-styles-reference.css uses them. */
const FAMILY_NAMES = { sans: 'OpenSans', serif: 'PTSerif', mono: 'JetBrainsMono' };

async function fontFaces() {
  const faces = [];
  for (const face of DEMO_FACES) {
    const bytes = await readFile(resolve(root, 'demo/fonts', face.file));
    const weight = typeof face.weight === 'number' ? `${face.weight}` : `${face.weight[0]} ${face.weight[1]}`;
    faces.push(`@font-face{font-family:${FAMILY_NAMES[face.family]};font-style:${face.style};font-weight:${weight};src:url(data:font/ttf;base64,${bytes.toString('base64')})}`);
  }
  // The theme font stands in as the one weight a static font has: the variable Open Sans held to 600, which is what Godot's
  // default font is (Open Sans SemiBold).
  const sans = await readFile(resolve(root, 'demo/fonts/OpenSans-Variable.ttf'));
  faces.push(`@font-face{font-family:ThemeFont;font-weight:600 600;src:url(data:font/ttf;base64,${sans.toString('base64')})}`);
  return faces.join('\n');
}

const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

function pageHtml(page, faces, css, smoothing) {
  const cells = page.samples.map(sample => {
    const text = `<div id="${sample.id}" class="${textClassName(sample)}"${sample.themeFont ? ' style="font-family:ThemeFont"' : ''} data-text="${escapeHtml(sample.text)}"></div>`;
    const wrapped = sample.parentClassName === undefined ? text : `<div class="flex flex-col ${sample.parentClassName}">${text}</div>`;
    return `<div class="${sample.cellClassName ?? 'flex flex-col'}">${wrapped}</div>`;
  }).join('\n');
  // Chrome's text-decoration-skip-ink breaks an underline around descenders; the library draws it whole.
  return `<!doctype html><meta charset="utf-8"><style>${faces}
*, ::before, ::after { box-sizing: border-box; margin: 0; }
body { margin: 0; display: flex; background: #dbe5d6; text-decoration-skip-ink: none;${smoothing === 'antialiased' ? ' -webkit-font-smoothing: antialiased;' : ''} }
${css}</style>
<div id="page" class="${page.className}">${cells}</div>`;
}

/** Runs in the page: where each text's lines are. */
async function measureTexts(ids, selectionIds) {
  const out = {};
  // The texts go in first, and the faces load after: a face the page has not used yet is not loaded, and the measures would be
  // the fallback font's. (`document.fonts.ready` alone resolves at once while nothing is on the page.)
  for (const id of ids) {
    const element = document.getElementById(id);
    element.textContent = element.dataset.text;
  }
  await Promise.all([...document.fonts].map(face => face.load()));
  await document.fonts.ready;
  for (const id of ids) {
    const element = document.getElementById(id);
    const box = element.getBoundingClientRect();
    // The baseline of the first line: the bottom edge of an empty inline-block, which sits on the baseline.
    const marker = document.createElement('span');
    marker.style.cssText = 'display:inline-block;width:0;height:0';
    element.insertBefore(marker, element.firstChild);
    const baseline = marker.getBoundingClientRect().bottom;
    marker.remove();
    const text = element.firstChild;
    const characters = [...element.textContent];
    const lines = [];
    const range = document.createRange();
    let offset = 0;
    for (const character of characters) {
      range.setStart(text, offset);
      range.setEnd(text, offset + character.length);
      const rects = [...range.getClientRects()].filter(rect => rect.width > 0 || !/\s/.test(character));
      offset += character.length;
      const rect = rects[0];
      if (rect === undefined) continue;
      let line = lines.at(-1);
      if (line === undefined || Math.abs(line.top - rect.top) > 1) {
        line = { top: rect.top, bottom: rect.bottom, left: Infinity, right: -Infinity, characters: 0 };
        lines.push(line);
      }
      line.characters += 1;
      if (!/\s/.test(character)) {
        line.left = Math.min(line.left, rect.left);
        line.right = Math.max(line.right, rect.right);
      }
    }
    // What copying the whole text puts on the clipboard: the selection's text (the transformed text, not the source).
    const selection = window.getSelection();
    selection.selectAllChildren(element);
    const copy = selection.toString();
    selection.removeAllRanges();
    // Where each character of a selection text is: its left and right edge, and its line.
    const chars = [];
    if (selectionIds.includes(id)) {
      let at = 0;
      for (const character of characters) {
        range.setStart(text, at);
        range.setEnd(text, at + character.length);
        at += character.length;
        const rect = range.getClientRects()[0];
        const lineIndex = lines.findIndex(line => Math.abs(line.top - rect.top) <= 1);
        chars.push([rect.left, rect.right, lineIndex]);
      }
    }
    out[id] = {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      lines: lines.filter(line => Number.isFinite(line.left)).map(line => ({
        x: line.left, width: line.right - line.left, top: line.top, baseline: baseline + (line.top - lines[0].top),
      })),
      copy,
      ...(chars.length > 0 ? { chars } : {}),
    };
  }
  return out;
}

async function render(outDirectory, only, smoothing = 'default') {
  await mkdir(outDirectory, { recursive: true });
  const faces = await fontFaces();
  const css = await readFile(resolve(root, 'scripts/text-styles-reference.css'), 'utf8');
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  try {
    for (const [name, width, height, scale] of VIEWPORTS) {
      for (const pageData of PAGES.filter(candidate => only === undefined || only.includes(candidate.id))) {
        const page = await browser.newPage();
        await page.setViewport({ width, height, deviceScaleFactor: scale });
        await page.setContent(pageHtml(pageData, faces, css, smoothing));
        await page.evaluate(() => document.fonts.ready);
        const samples = await page.evaluate(measureTexts, pageData.samples.map(sample => sample.id), pageData.samples.filter(sample => sample.selection === true).map(sample => sample.id));
        // The text is set by the measurement (it keeps its white space as written); let the layout settle before the picture.
        await new Promise(done => setTimeout(done, SETTLE_MS));
        const rect = await page.evaluate(() => { const { x, y, width, height } = document.getElementById('page').getBoundingClientRect(); return { x, y, width, height }; });
        const prefix = smoothing === 'antialiased' ? 'chrome-aa' : 'chrome';
        await page.screenshot({ path: resolve(outDirectory, `${prefix}-${pageData.id}-${name}.png`) });
        await writeFile(resolve(outDirectory, `${prefix}-${pageData.id}-${name}.json`), JSON.stringify({ page: pageData.id, window: name, scale, viewport: { width, height }, pageRect: rect, samples }, null, 1));
        if (rect.height > height) console.warn(`page ${pageData.id} is ${rect.height} px tall in a ${height} px window (${name})`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

async function compare(output, entries, crop) {
  await mkdir(dirname(output), { recursive: true });
  const figures = [];
  for (const entry of entries) {
    const [label, path] = [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)];
    const image = `<img src="data:image/png;base64,${(await readFile(path)).toString('base64')}">`;
    // A crop shows the top left corner only (the page), at the pictures' own size.
    figures.push(`<figure>${crop === undefined ? image : `<div class="crop" style="width:${crop.width}px;height:${crop.height}px">${image}</div>`}<figcaption>${escapeHtml(label)}</figcaption></figure>`);
  }
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run'] });
  try {
    const page = await browser.newPage();
    // Each picture is shown at the width of the first, so a 2x capture and a 1x capture line up.
    await page.setViewport({ width: 800, height: 600 });
    await page.setContent(`<!doctype html><style>body{margin:0;background:#111;color:#ddd;font:14px system-ui;display:flex;gap:8px;padding:8px;align-items:flex-start}
      figure{margin:0}img{display:block;height:auto}.crop{overflow:hidden}figcaption{padding:4px 0}</style>${figures.join('')}`);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    const first = await page.evaluate(() => document.images[0].naturalWidth);
    await page.evaluate(width => { for (const image of document.images) image.style.width = `${width}px`; }, first);
    const size = await page.evaluate(() => ({ width: Math.ceil(document.body.scrollWidth), height: Math.ceil(document.body.scrollHeight) }));
    await page.setViewport({ width: size.width, height: size.height });
    await page.screenshot({ path: output });
  } finally {
    await browser.close();
  }
}

const GOLDEN_TS = resolve(root, 'demo/src/text-styles-golden.ts');
const GOLDEN_JSON = resolve(root, 'scripts/text-styles-golden.json');
/** The two windows' layouts must agree: CSS pixels do not depend on the pixel ratio. */
const LAYOUT_TOLERANCE_PX = 0.02;

async function golden(outDirectory) {
  await render(outDirectory, undefined);
  const texts = {};
  for (const page of PAGES) {
    const one = JSON.parse(await readFile(resolve(outDirectory, `chrome-${page.id}-dpr1.json`), 'utf8'));
    const two = JSON.parse(await readFile(resolve(outDirectory, `chrome-${page.id}-dpr2.json`), 'utf8'));
    for (const sample of page.samples) {
      const a = one.samples[sample.id];
      const b = two.samples[sample.id];
      const numbers = value => JSON.stringify(value, (_, entry) => (typeof entry === 'number' ? Math.round(entry / LAYOUT_TOLERANCE_PX) : entry));
      if (numbers(a.box) !== numbers(b.box) || numbers(a.lines) !== numbers(b.lines)) {
        throw new Error(`${sample.id}: Chrome lays the text out differently at ratio 2 (${JSON.stringify(a.box)} against ${JSON.stringify(b.box)})`);
      }
      texts[sample.id] = { page: page.id, ...a };
    }
  }
  const rounded = JSON.parse(JSON.stringify(texts, (_, value) => (typeof value === 'number' ? Math.round(value * 1000) / 1000 : value)));
  await writeFile(GOLDEN_JSON, `${JSON.stringify(rounded, null, 1)}\n`);
  await writeFile(GOLDEN_TS, `// Generated by \`node --import tsx scripts/text-styles-reference.mjs --golden\` from headless Chrome: what the browser reports for the
// text styles lab's CSS (demo/src/text-styles-data.ts). The native verifier holds the library to these numbers; do not edit by hand.
export interface GoldenLine { readonly x: number; readonly width: number; readonly top: number; readonly baseline: number }

export interface GoldenText {
  readonly page: string;
  /** \`getBoundingClientRect()\` of the text's element. */
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly lines: readonly GoldenLine[];
  /** What copying the whole text gives. */
  readonly copy: string;
  /** For the selection texts: each character's left and right edge and its line. */
  readonly chars?: readonly (readonly [number, number, number])[];
}

export const GOLDEN_TEXTS: Readonly<Record<string, GoldenText>> = ${JSON.stringify(rounded, null, 2)};
`);
  console.log(`wrote ${GOLDEN_TS} and ${GOLDEN_JSON}: ${Object.keys(rounded).length} texts`);
}

/** Levels (of 255) above which a pixel counts as visibly different. */
const VISIBLE_LEVELS = 24;
/** A pixel with at least this much ink (of 255) is part of a glyph for the measures of how dark the strokes are. */
const INK_FLOOR = 8;
/** A cell is compared with this much around it, in logical pixels. */
const CELL_MARGIN = 2;

/** Runs in the page: decode PNGs and measure what each text's cell holds. */
async function measureImages(inputs) {
  const decode = url => new Promise((done, fail) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      done(context.getImageData(0, 0, canvas.width, canvas.height));
    };
    image.onerror = () => fail(new Error('cannot decode'));
    image.src = url;
  });
  const luma = (data, index) => 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
  const { scale, cells, variants, floor, visible } = inputs;
  const images = {};
  for (const [name, url] of Object.entries(variants)) images[name] = await decode(url);
  const width = images.chrome.width;
  const measure = (image, cell) => {
    let mass = 0;
    const darks = [];
    for (let y = cell.y0; y < cell.y1; y++) {
      for (let x = cell.x0; x < cell.x1; x++) {
        const dark = 255 - luma(image.data, (y * width + x) * 4);
        mass += dark / 255;
        if (dark >= floor) darks.push(dark);
      }
    }
    darks.sort((a, b) => a - b);
    return { ink: mass / (scale * scale), peak: darks.length === 0 ? 0 : darks[Math.floor(darks.length * 0.95)], pixels: darks.length };
  };
  const compare = (a, b, cell) => {
    let worst = 0;
    let total = 0;
    let over = 0;
    let count = 0;
    for (let y = cell.y0; y < cell.y1; y++) {
      for (let x = cell.x0; x < cell.x1; x++) {
        const index = (y * width + x) * 4;
        let biggest = 0;
        for (let channel = 0; channel < 3; channel++) biggest = Math.max(biggest, Math.abs(a.data[index + channel] - b.data[index + channel]));
        worst = Math.max(worst, biggest);
        total += biggest;
        over += biggest > visible ? 1 : 0;
        count += 1;
      }
    }
    return { worst, mean: total / count, over, count };
  };
  const results = {};
  for (const [id, cell] of Object.entries(cells)) {
    const entry = { chrome: measure(images.chrome, cell), ours: measure(images.ours, cell) };
    if (images.antialiased !== undefined) entry.antialiased = measure(images.antialiased, cell);
    entry.oursAgainstChrome = compare(images.ours, images.chrome, cell);
    if (images.antialiased !== undefined) entry.oursAgainstAntialiased = compare(images.ours, images.antialiased, cell);
    results[id] = entry;
  }
  // The difference picture, times four, against Chrome's default.
  const out = document.createElement('canvas');
  out.width = width;
  out.height = images.chrome.height;
  const diff = new ImageData(width, out.height);
  for (let index = 0; index < diff.data.length; index += 4) {
    let biggest = 0;
    for (let channel = 0; channel < 3; channel++) biggest = Math.max(biggest, Math.abs(images.ours.data[index + channel] - images.chrome.data[index + channel]));
    diff.data[index] = diff.data[index + 1] = diff.data[index + 2] = Math.min(255, biggest * 4);
    diff.data[index + 3] = 255;
  }
  out.getContext('2d').putImageData(diff, 0, 0);
  return { results, diffPng: out.toDataURL('image/png').split(',')[1] };
}

const dataUrl = async path => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;

async function diff(nativeDirectory, chromeDirectory, outDirectory) {
  await mkdir(outDirectory, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run'] });
  const report = {};
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><body></body>');
    for (const [name, , , scale] of VIEWPORTS) {
      for (const pageData of PAGES) {
        const stem = `${pageData.id}-${name}`;
        const chromeJson = JSON.parse(await readFile(resolve(chromeDirectory, `chrome-${stem}.json`), 'utf8'));
        const cells = {};
        for (const sample of pageData.samples) {
          const { box } = chromeJson.samples[sample.id];
          cells[sample.id] = {
            x0: Math.max(0, Math.floor((box.x - CELL_MARGIN) * scale)), y0: Math.max(0, Math.floor((box.y - CELL_MARGIN) * scale)),
            x1: Math.ceil((box.x + box.width + CELL_MARGIN) * scale), y1: Math.ceil((box.y + box.height + CELL_MARGIN) * scale),
          };
        }
        let ours;
        try {
          ours = await dataUrl(resolve(nativeDirectory, `text-styles-${stem}.png`));
        } catch {
          console.warn(`no native capture for ${stem}; left out`);
          continue;
        }
        const variants = { chrome: await dataUrl(resolve(chromeDirectory, `chrome-${stem}.png`)), ours };
        try { variants.antialiased = await dataUrl(resolve(chromeDirectory, `chrome-aa-${stem}.png`)); } catch { /* the antialiased pictures are optional */ }
        const { results, diffPng } = await page.evaluate(measureImages, { scale, cells, variants, floor: INK_FLOOR, visible: VISIBLE_LEVELS });
        report[stem] = results;
        const sideBySide = resolve(outDirectory, `${stem}.png`);
        await writeFile(resolve(outDirectory, `.diff-${stem}.png`), Buffer.from(diffPng, 'base64'));
        const labels = [`Chrome (${stem})`, 'Chrome, antialiased', 'ours', 'difference x4 against Chrome'];
        const files = [resolve(chromeDirectory, `chrome-${stem}.png`), resolve(chromeDirectory, `chrome-aa-${stem}.png`), resolve(nativeDirectory, `text-styles-${stem}.png`), resolve(outDirectory, `.diff-${stem}.png`)];
        const entries = [];
        for (const [index, file] of files.entries()) {
          try { await readFile(file); entries.push(`${labels[index]}=${file}`); } catch { /* the antialiased picture is optional */ }
        }
        // Only the page is of interest: the rest of the window is the backdrop.
        const crop = { width: Math.ceil((chromeJson.pageRect.x + chromeJson.pageRect.width) * scale) + 8, height: Math.ceil((chromeJson.pageRect.y + chromeJson.pageRect.height) * scale) + 8 };
        await compare(sideBySide, entries, crop);
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(resolve(outDirectory, 'report.json'), JSON.stringify(report, null, 1));
  console.log(summary(report));
}

/** The ink each renderer puts down, summed over all the texts of a window, and how far ours is from Chrome's, both smoothings. */
function summary(report) {
  const header = ['window', 'texts', 'ink Chrome', 'ink aa', 'ink ours', 'ours/Chrome', 'ours/aa', 'p95 Chrome', 'p95 aa', 'p95 ours', 'mean|d| Chrome', '>24lv Chrome', 'mean|d| aa', '>24lv aa'];
  const rows = [header];
  // One row for all the pages of a window size, after the rows of the pages.
  const groups = [...Object.entries(report), ...VIEWPORTS.map(([name]) => [`ALL ${name}`, Object.fromEntries(Object.entries(report).filter(([stem]) => stem.endsWith(`-${name}`)).flatMap(([stem, results]) => Object.entries(results).map(([id, entry]) => [`${stem}/${id}`, entry])))])];
  for (const [stem, results] of groups) {
    const entries = Object.values(results);
    if (entries.length === 0) continue;
    const sum = pick => entries.reduce((total, entry) => total + (entry[pick]?.ink ?? 0), 0);
    const peak = pick => entries.reduce((total, entry) => total + (entry[pick]?.peak ?? 0), 0) / entries.length;
    const mean = pick => entries.reduce((total, entry) => total + (entry[pick]?.mean ?? 0), 0) / entries.length;
    const over = pick => entries.reduce((total, entry) => total + (entry[pick]?.over ?? 0), 0) / entries.reduce((total, entry) => total + (entry[pick]?.count ?? 1), 0);
    rows.push([stem, String(entries.length), sum('chrome').toFixed(0), sum('antialiased').toFixed(0), sum('ours').toFixed(0), (sum('ours') / sum('chrome')).toFixed(3), (sum('ours') / sum('antialiased')).toFixed(3),
      peak('chrome').toFixed(0), peak('antialiased').toFixed(0), peak('ours').toFixed(0), mean('oursAgainstChrome').toFixed(2), `${(over('oursAgainstChrome') * 100).toFixed(2)} %`,
      mean('oursAgainstAntialiased').toFixed(2), `${(over('oursAgainstAntialiased') * 100).toFixed(2)} %`]);
  }
  const widths = header.map((_, column) => Math.max(...rows.map(row => row[column].length)));
  return rows.map(row => row.map((cell, column) => cell.padStart(widths[column])).join('  ')).join('\n');
}

const flags = ['golden', 'diff'].filter(name => process.argv.includes(`--${name}`));
const compareTo = argument('compare');
if (compareTo !== undefined) {
  await compare(resolve(compareTo), process.argv.slice(2).filter(value => !value.startsWith('-')));
} else if (flags.includes('golden')) {
  await golden(resolve(argument('out') ?? resolve(root, 'artifacts/utilities-text-reference')));
} else if (flags.includes('diff')) {
  const nativeDirectory = argument('native');
  if (nativeDirectory === undefined) throw new Error('--diff needs --native=<directory of the native captures>');
  await diff(resolve(nativeDirectory), resolve(argument('chrome') ?? resolve(root, 'artifacts/utilities-text-reference')), resolve(argument('out') ?? resolve(root, 'artifacts/utilities-text-compare')));
} else {
  const only = argument('page')?.split(',');
  await render(resolve(argument('out') ?? resolve(root, 'artifacts/utilities-text-reference')), only, argument('smoothing') === 'antialiased' ? 'antialiased' : 'default');
}
