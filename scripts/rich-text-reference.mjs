// The rich text lab (demo/src/rich-text-data.ts) as plain HTML, rendered by headless Chrome through Puppeteer, to compare with what the
// library draws. A sample is nested `<span>`s with the CSS its classes make (written here from the library's
// own compiled styles, so a class means the same thing to both); an inlay is a plain span, so every other glyph lands where it does
// in the library. Chrome's text is drawn with `-webkit-font-smoothing: antialiased`, which is how the library draws it, so a difference in a pixel is a difference in what is drawn, not in how text is smoothed.
//
//   node --import tsx scripts/rich-text-reference.mjs [--out=<dir>] [--page=<id>[,<id>]]
//       Renders each page to <dir>/chrome-<page>-dpr<N>.png and writes <dir>/chrome-<page>-dpr<N>.json with, for each text, its box, its
//       lines (left and right ends of the glyphs, top, baseline), where each character of the source is (left, right, line) and where
//       each inlay is, for the windows the verifiers have: 1120 x 800 at device pixel ratio 1 and 560 x 400 at ratio 2 (the native ones), and
//       1120 x 800 at ratio 2 (`web-dpr2`: the Web verifier's retina window keeps the logical size and doubles the pixels, so its capture is
//       2240 x 1600; glass-reference.mjs calls it `web-retina-landscape`).
//   node --import tsx scripts/rich-text-reference.mjs --golden
//       Writes demo/src/rich-text-golden.ts and scripts/rich-text-golden.json: the numbers Chrome reports for every text. The native
//       and Web verifiers hold the library to them; do not edit by hand.
//   node --import tsx scripts/rich-text-reference.mjs --diff --native=<dir> [--chrome=<dir>] [--out=<dir>]
//       Compares the verifier's captures (<dir>/rich-text-<page>-<window>.png, a window being dpr1, dpr2 or web-dpr2) with Chrome's per channel, per
//       text, and writes <out>/<page>-<window>.png (Chrome, ours and their difference side by side) and <out>/report.json. A capture is compared
//       whole and at its own size; the Web ones are `artifacts/web-interaction-verification/{landscape,retina-landscape}`.
//
// Input is none: the pages are static. No real OS input is generated and no window opens (headless).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
// tsx loads the TypeScript modules as CommonJS, whose named exports an ES module reads through the default.
import richData from '../demo/src/rich-text-data.ts';
import textData from '../demo/src/text-styles-data.ts';
import stylesModule from '../src/styles.ts';

const { PAGES, PAGE_CLASS, classesOf } = richData;
const { DEMO_FACES } = textData;
const { compileStyle } = stylesModule;

rejectUnknownArguments(process.argv.slice(2).filter(value => value.startsWith('-')), { flags: ['--golden', '--diff'], prefixes: ['--out=', '--page=', '--native=', '--chrome='] });
const root = resolve(import.meta.dirname, '..');
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const VIEWPORTS = [['dpr1', 1120, 800, 1], ['dpr2', 560, 400, 2], ['web-dpr2', 1120, 800, 2]];
const SETTLE_MS = 200;
const FAMILY_NAMES = { sans: 'OpenSans', serif: 'PTSerif', mono: 'JetBrainsMono' };
/** A cell is compared with this much around it, in logical pixels. */
const CELL_MARGIN = 3;
/** Levels (of 255) above which a pixel counts as visibly different. */
const VISIBLE_LEVELS = 24;

// ---- The CSS of a class ------------------------------------------------------------------------------------------------------

/** The CSS a style key makes, for the keys the samples use; anything else is an error: a sample must not rely on a property no one wrote down. */
function declaration(key, value) {
  const px = number => `${number}px`;
  switch (key) {
    case 'display': return `display:${value}`;
    case 'flexDirection': return `flex-direction:${value}`;
    case 'rowGap': return `row-gap:${px(value)}`;
    case 'columnGap': return `column-gap:${px(value)}`;
    case 'paddingTop': return `padding-top:${px(value)}`;
    case 'paddingRight': return `padding-right:${px(value)}`;
    case 'paddingBottom': return `padding-bottom:${px(value)}`;
    case 'paddingLeft': return `padding-left:${px(value)}`;
    case 'width': return `width:${typeof value === 'number' ? px(value) : value}`;
    case 'alignSelf': return `align-self:${value === 'flex-start' ? 'flex-start' : value}`;
    case 'userSelect': return `user-select:${value}`;
    case 'backgroundColor': return `background-color:${value}`;
    case 'color': return `color:${value}`;
    case 'fontFamily': return `font-family:${FAMILY_NAMES[value] ?? value}`;
    case 'fontSize': return `font-size:${px(value)}`;
    case 'lineHeight': return `line-height:${typeof value === 'number' ? px(value) : value}`;
    case 'whiteSpace': return `white-space:${value}`;
    case 'fontWeight': return `font-weight:${value}`;
    case 'fontStyle': return `font-style:${value}`;
    case 'textDecorationLine': return `text-decoration-line:${value}`;
    case 'textDecorationColor': return `text-decoration-color:${value}`;
    case 'textDecorationStyle': return `text-decoration-style:${value}`;
    case 'textDecorationThickness': return `text-decoration-thickness:${typeof value === 'number' ? px(value) : value}`;
    case 'textUnderlineOffset': return `text-underline-offset:${typeof value === 'number' ? px(value) : value}`;
    default: throw new Error(`The reference has no CSS for the style key ${key} (${JSON.stringify(value)})`);
  }
}

/** The inline style a class string makes, from the library's own compiled layers (all unconditional here). */
function cssOf(className) {
  const merged = {};
  for (const layer of compileStyle(className ?? '').layers) {
    if (layer.minWidth !== undefined || layer.states !== undefined) throw new Error(`A conditional class in ${className}`);
    Object.assign(merged, layer.style);
  }
  return Object.entries(merged).map(([key, value]) => declaration(key, value)).join(';');
}

// ---- The page -----------------------------------------------------------------------------------------------------------------

const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function runsHtml(runs) {
  return runs.map(run => {
    if (typeof run === 'string') return escapeHtml(run);
    const style = cssOf(run.className);
    return `<span${run.inlay === true ? ' data-inlay="1"' : ''}${style === '' ? '' : ` style="${style}"`}>${runsHtml(run.runs)}</span>`;
  }).join('');
}

async function fontFaces() {
  const faces = [];
  for (const face of DEMO_FACES) {
    const bytes = await readFile(resolve(root, 'demo/fonts', face.file));
    const weight = typeof face.weight === 'number' ? `${face.weight}` : `${face.weight[0]} ${face.weight[1]}`;
    faces.push(`@font-face{font-family:${FAMILY_NAMES[face.family]};font-style:${face.style};font-weight:${weight};src:url(data:font/ttf;base64,${bytes.toString('base64')})}`);
  }
  return faces.join('\n');
}

function pageHtml(page, faces) {
  const samples = page.samples.map(sample => `<div id="${sample.id}" style="${cssOf(sample.className)}">${runsHtml(sample.runs)}</div>`).join('\n');
  // Chrome's text-decoration-skip-ink breaks an underline around descenders; the library draws it whole. The body is the backdrop the demo has behind its labs.
  return `<!doctype html><meta charset="utf-8"><style>${faces}
*, ::before, ::after { box-sizing: border-box; margin: 0; }
body { margin: 0; display: flex; background: #dbe5d6; text-decoration-skip-ink: none; -webkit-font-smoothing: antialiased; }
</style>
<div id="page" style="${cssOf(PAGE_CLASS)}">${samples}</div>`;
}

/** Runs in the page: where each text, its lines, its characters and its inlays are. */
async function measureTexts(ids) {
  await Promise.all([...document.fonts].map(face => face.load()));
  await document.fonts.ready;
  const out = {};
  for (const id of ids) {
    const element = document.getElementById(id);
    const box = element.getBoundingClientRect();
    const marker = document.createElement('span');
    marker.style.cssText = 'display:inline-block;width:0;height:0';
    element.insertBefore(marker, element.firstChild);
    const baseline = marker.getBoundingClientRect().bottom;
    marker.remove();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const lines = [];
    const chars = [];
    const inlays = [];
    let source = 0;
    let lastInlay = false;
    const lineOf = rect => {
      let index = lines.findIndex(line => Math.abs(line.top - rect.top) <= 1);
      if (index < 0) {
        lines.push({ top: rect.top, left: Infinity, right: -Infinity });
        index = lines.length - 1;
      }
      return index;
    };
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const generated = node.parentElement.closest('[data-inlay]') !== null;
      const text = node.data;
      let offset = 0;
      let first = true;
      for (const character of text) {
        range.setStart(node, offset);
        range.setEnd(node, offset + character.length);
        offset += character.length;
        const rect = [...range.getClientRects()][0];
        if (rect === undefined) {
          if (!generated) source += character.length;
          continue;
        }
        const line = lineOf(rect);
        if (!/\s/.test(character)) {
          lines[line].left = Math.min(lines[line].left, rect.left);
          lines[line].right = Math.max(lines[line].right, rect.right);
        }
        if (generated) {
          if (first || !lastInlay) inlays.push({ at: source, text: '', left: rect.left, right: rect.right, line });
          const entry = inlays.at(-1);
          entry.text += character;
          entry.right = rect.right;
          lastInlay = true;
        } else {
          chars.push([source, rect.left, rect.right, line]);
          source += character.length;
          lastInlay = false;
        }
        first = false;
      }
      if (!generated) lastInlay = false;
    }
    const selection = window.getSelection();
    selection.selectAllChildren(element);
    // The selection's text includes the inlays in a browser; the library's leaves them out.
    const copy = selection.toString();
    selection.removeAllRanges();
    out[id] = {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      lines: lines.filter(line => Number.isFinite(line.left)).map(line => ({ x: line.left, width: line.right - line.left, top: line.top, baseline: baseline + (line.top - lines[0].top) })),
      chars,
      inlays,
      copy,
    };
  }
  return out;
}

async function render(outDirectory, only) {
  await mkdir(outDirectory, { recursive: true });
  for (const page of PAGES) for (const sample of page.samples) classesOf(sample.runs).forEach(cssOf);
  const faces = await fontFaces();
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  try {
    for (const [name, width, height, scale] of VIEWPORTS) {
      for (const pageData of PAGES.filter(candidate => candidate.chrome !== false && (only === undefined || only.includes(candidate.id)))) {
        const page = await browser.newPage();
        await page.setViewport({ width, height, deviceScaleFactor: scale });
        await page.setContent(pageHtml(pageData, faces));
        await page.evaluate(() => document.fonts.ready);
        const samples = await page.evaluate(measureTexts, pageData.samples.map(sample => sample.id));
        await new Promise(done => setTimeout(done, SETTLE_MS));
        const rect = await page.evaluate(() => { const { x, y, width, height } = document.getElementById('page').getBoundingClientRect(); return { x, y, width, height }; });
        await page.screenshot({ path: resolve(outDirectory, `chrome-${pageData.id}-${name}.png`) });
        await writeFile(resolve(outDirectory, `chrome-${pageData.id}-${name}.json`), JSON.stringify({ page: pageData.id, window: name, scale, viewport: { width, height }, pageRect: rect, samples }, null, 1));
        if (rect.height > height) console.warn(`page ${pageData.id} is ${rect.height} px tall in a ${height} px window (${name})`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

// ---- The golden numbers -------------------------------------------------------------------------------------------------------

const GOLDEN_TS = resolve(root, 'demo/src/rich-text-golden.ts');
const GOLDEN_JSON = resolve(root, 'scripts/rich-text-golden.json');
/** The two windows' layouts must agree: CSS pixels do not depend on the pixel ratio. */
const LAYOUT_TOLERANCE_PX = 0.02;

async function golden(outDirectory) {
  await render(outDirectory, undefined);
  const texts = {};
  for (const page of PAGES.filter(candidate => candidate.chrome !== false)) {
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
  await writeFile(GOLDEN_TS, `// Generated by \`node --import tsx scripts/rich-text-reference.mjs --golden\` from headless Chrome: what the browser reports for the
// rich text lab's samples (demo/src/rich-text-data.ts). The native verifier holds the library to these numbers; do not edit by hand.
export interface GoldenLine { readonly x: number; readonly width: number; readonly top: number; readonly baseline: number }

export interface GoldenInlay { readonly at: number; readonly text: string; readonly left: number; readonly right: number; readonly line: number }

export interface GoldenText {
  readonly page: string;
  /** \`getBoundingClientRect()\` of the text's element. */
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly lines: readonly GoldenLine[];
  /** Each character of the source text (an inlay's left out): its UTF-16 offset, its left and right edge and its line. */
  readonly chars: readonly (readonly [number, number, number, number])[];
  readonly inlays: readonly GoldenInlay[];
  /** What copying the whole element gives in a browser, which includes the inlays. */
  readonly copy: string;
}

export const GOLDEN_TEXTS: Readonly<Record<string, GoldenText>> = ${JSON.stringify(rounded, null, 2)};
`);
  console.log(`wrote ${GOLDEN_TS} and ${GOLDEN_JSON}: ${Object.keys(rounded).length} texts`);
}

// ---- The picture comparison ---------------------------------------------------------------------------------------------------

/** Runs in the page: decode PNGs and compare what each cell holds, per channel. */
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
  const { cells, variants, visible } = inputs;
  const chrome = await decode(variants.chrome);
  const ours = await decode(variants.ours);
  const width = chrome.width;
  const results = {};
  for (const [id, cell] of Object.entries(cells)) {
    const differences = [];
    let worst = 0;
    let total = 0;
    let over = 0;
    let ink = { chrome: 0, ours: 0 };
    for (let y = cell.y0; y < cell.y1; y++) {
      for (let x = cell.x0; x < cell.x1; x++) {
        const index = (y * width + x) * 4;
        let biggest = 0;
        for (let channel = 0; channel < 3; channel++) {
          biggest = Math.max(biggest, Math.abs(chrome.data[index + channel] - ours.data[index + channel]));
          ink.chrome += 255 - chrome.data[index + channel];
          ink.ours += 255 - ours.data[index + channel];
        }
        worst = Math.max(worst, biggest);
        total += biggest;
        over += biggest > visible ? 1 : 0;
        differences.push(biggest);
      }
    }
    differences.sort((a, b) => a - b);
    results[id] = {
      worst, mean: total / differences.length, p99: differences[Math.floor(differences.length * 0.99)], over, count: differences.length,
      inkRatio: ink.chrome === 0 ? 1 : ink.ours / ink.chrome,
    };
  }
  const out = document.createElement('canvas');
  out.width = width;
  out.height = chrome.height;
  const diff = new ImageData(width, out.height);
  for (let index = 0; index < diff.data.length; index += 4) {
    let biggest = 0;
    for (let channel = 0; channel < 3; channel++) biggest = Math.max(biggest, Math.abs(ours.data[index + channel] - chrome.data[index + channel]));
    diff.data[index] = diff.data[index + 1] = diff.data[index + 2] = Math.min(255, biggest * 4);
    diff.data[index + 3] = 255;
  }
  out.getContext('2d').putImageData(diff, 0, 0);
  return { results, diffPng: out.toDataURL('image/png').split(',')[1] };
}

const dataUrl = async path => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;

/** Puts the images side by side, each under its label, in one PNG, cropped to the page. */
async function sideBySide(output, entries, crop) {
  await mkdir(dirname(output), { recursive: true });
  const figures = [];
  for (const entry of entries) {
    const [label, path] = [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)];
    const image = `<img src="data:image/png;base64,${(await readFile(path)).toString('base64')}">`;
    figures.push(`<figure><div class="crop" style="width:${crop.width}px;height:${crop.height}px">${image}</div><figcaption>${escapeHtml(label)}</figcaption></figure>`);
  }
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    await page.setContent(`<!doctype html><style>body{margin:0;background:#111;color:#ddd;font:14px system-ui;display:flex;gap:8px;padding:8px;align-items:flex-start}
      figure{margin:0}img{display:block}.crop{overflow:hidden}figcaption{padding:4px 0}</style>${figures.join('')}`);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    const size = await page.evaluate(() => ({ width: Math.ceil(document.body.scrollWidth), height: Math.ceil(document.body.scrollHeight) }));
    await page.setViewport({ width: size.width, height: size.height });
    await page.screenshot({ path: output });
  } finally {
    await browser.close();
  }
}

/** The samples whose text is invisible: only what is drawn round it is in the picture. */
const decorationOnly = id => /^(deco|over|through)-/u.test(id) && id !== 'deco-visible';

async function diff(nativeDirectory, chromeDirectory, outDirectory) {
  await mkdir(outDirectory, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run'] });
  const report = {};
  const windows = {};
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><body></body>');
    for (const [name, , , scale] of VIEWPORTS) {
      for (const pageData of PAGES.filter(candidate => candidate.chrome !== false)) {
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
        const oursPath = resolve(nativeDirectory, `rich-text-${stem}.png`);
        let ours;
        try {
          ours = await dataUrl(oursPath);
        } catch {
          console.warn(`no native capture for ${stem}; left out`);
          continue;
        }
        const { results, diffPng } = await page.evaluate(measureImages, { cells, variants: { chrome: await dataUrl(resolve(chromeDirectory, `chrome-${stem}.png`)), ours }, visible: VISIBLE_LEVELS });
        report[stem] = results;
        windows[stem] = name;
        const diffPath = resolve(outDirectory, `.diff-${stem}.png`);
        await writeFile(diffPath, Buffer.from(diffPng, 'base64'));
        const crop = { width: Math.ceil((chromeJson.pageRect.x + chromeJson.pageRect.width) * scale) + 8, height: Math.ceil((chromeJson.pageRect.y + chromeJson.pageRect.height) * scale) + 8 };
        await sideBySide(resolve(outDirectory, `${stem}.png`), [`Chrome (${stem})=${resolve(chromeDirectory, `chrome-${stem}.png`)}`, `ours=${oursPath}`, `difference x4 against Chrome=${diffPath}`], crop);
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(resolve(outDirectory, 'report.json'), JSON.stringify(report, null, 1));
  console.log(summary(report, windows));
}

/** One row per text kind and window: how far the pictures are, per channel, over all the texts of the kind. */
function summary(report, windows) {
  const rows = [['group', 'texts', 'worst', 'mean|d|', 'p99', 'share >24 levels', 'ink ours/Chrome']];
  for (const [name] of VIEWPORTS) {
    for (const [label, pick] of [['decoration only', decorationOnly], ['text', id => !decorationOnly(id)]]) {
      const entries = Object.entries(report).filter(([stem]) => windows[stem] === name).flatMap(([, results]) => Object.entries(results)).filter(([id]) => pick(id)).map(([, entry]) => entry);
      if (entries.length === 0) continue;
      const count = entries.reduce((total, entry) => total + entry.count, 0);
      rows.push([`${label} ${name}`, String(entries.length), String(Math.max(...entries.map(entry => entry.worst))),
        (entries.reduce((total, entry) => total + entry.mean * entry.count, 0) / count).toFixed(3),
        String(Math.max(...entries.map(entry => entry.p99))), `${(entries.reduce((total, entry) => total + entry.over, 0) / count * 100).toFixed(3)} %`,
        (entries.reduce((total, entry) => total + entry.inkRatio, 0) / entries.length).toFixed(3)]);
    }
  }
  const widths = rows[0].map((_, column) => Math.max(...rows.map(row => row[column].length)));
  return rows.map(row => row.map((cell, column) => cell.padStart(widths[column])).join('  ')).join('\n');
}

const flags = ['golden', 'diff'].filter(name => process.argv.includes(`--${name}`));
if (flags.includes('golden')) {
  await golden(resolve(argument('out') ?? resolve(root, 'artifacts/rich-text-reference')));
} else if (flags.includes('diff')) {
  const nativeDirectory = argument('native');
  if (nativeDirectory === undefined) throw new Error('--diff needs --native=<directory of the native captures>');
  await diff(resolve(nativeDirectory), resolve(argument('chrome') ?? resolve(root, 'artifacts/rich-text-reference')), resolve(argument('out') ?? resolve(root, 'artifacts/rich-text-compare')));
} else {
  await render(resolve(argument('out') ?? resolve(root, 'artifacts/rich-text-reference')), argument('page')?.split(','));
}
