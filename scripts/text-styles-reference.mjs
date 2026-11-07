// The text styles lab (demo/src/text-styles-data.ts) as plain HTML with the CSS Tailwind 3.4.17 makes of its classes
// (scripts/text-styles-reference.css), rendered by headless Chrome through Puppeteer, to compare with what the library draws
// (docs/tracks/utilities-text.md).
//
//   node --import tsx scripts/text-styles-reference.mjs [--out=<dir>] [--page=<id>[,<id>]]
//       Renders each page to <dir>/chrome-<page>-dpr<N>.png and writes <dir>/chrome-<page>-dpr<N>.json with, for each text, its
//       box and its lines (the left end and width of the glyphs, the top and the baseline), for the two windows the native
//       verifier has: 1120 x 800 at device pixel ratio 1, and 560 x 400 at ratio 2 (content scale two).
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

rejectUnknownArguments(process.argv.slice(2).filter(value => value.startsWith('-')), { prefixes: ['--out=', '--compare=', '--page='] });
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

function pageHtml(page, faces, css) {
  const cells = page.samples.map(sample => {
    const text = `<div id="${sample.id}" class="${textClassName(sample)}"${sample.themeFont ? ' style="font-family:ThemeFont"' : ''} data-text="${escapeHtml(sample.text)}"></div>`;
    const wrapped = sample.parentClassName === undefined ? text : `<div class="flex flex-col ${sample.parentClassName}">${text}</div>`;
    return `<div class="${sample.cellClassName ?? 'flex flex-col'}">${wrapped}</div>`;
  }).join('\n');
  // Chrome's text-decoration-skip-ink breaks an underline around descenders; the library draws it whole.
  return `<!doctype html><meta charset="utf-8"><style>${faces}
*, ::before, ::after { box-sizing: border-box; margin: 0; }
body { margin: 0; display: flex; background: #dbe5d6; text-decoration-skip-ink: none; }
${css}</style>
<div id="page" class="${page.className}">${cells}</div>`;
}

/** Runs in the page: where each text's lines are. */
function measureTexts(ids) {
  const out = {};
  for (const id of ids) {
    const element = document.getElementById(id);
    element.textContent = element.dataset.text;
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
    out[id] = {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      lines: lines.filter(line => Number.isFinite(line.left)).map(line => ({
        x: line.left, width: line.right - line.left, top: line.top, baseline: baseline + (line.top - lines[0].top),
      })),
    };
  }
  return out;
}

async function render(outDirectory, only) {
  await mkdir(outDirectory, { recursive: true });
  const faces = await fontFaces();
  const css = await readFile(resolve(root, 'scripts/text-styles-reference.css'), 'utf8');
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  try {
    for (const [name, width, height, scale] of VIEWPORTS) {
      for (const pageData of PAGES.filter(candidate => only === undefined || only.includes(candidate.id))) {
        const page = await browser.newPage();
        await page.setViewport({ width, height, deviceScaleFactor: scale });
        await page.setContent(pageHtml(pageData, faces, css));
        await page.evaluate(() => document.fonts.ready);
        const samples = await page.evaluate(measureTexts, pageData.samples.map(sample => sample.id));
        // The text is set by the measurement (it keeps its white space as written); let the layout settle before the picture.
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

async function compare(output, entries) {
  await mkdir(dirname(output), { recursive: true });
  const figures = [];
  for (const entry of entries) {
    const [label, path] = [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)];
    figures.push(`<figure><img src="data:image/png;base64,${(await readFile(path)).toString('base64')}"><figcaption>${escapeHtml(label)}</figcaption></figure>`);
  }
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run'] });
  try {
    const page = await browser.newPage();
    // Each picture is shown at the width of the first, so a 2x capture and a 1x capture line up.
    await page.setViewport({ width: 800, height: 600 });
    await page.setContent(`<!doctype html><style>body{margin:0;background:#111;color:#ddd;font:14px system-ui;display:flex;gap:8px;padding:8px;align-items:flex-start}
      figure{margin:0}img{display:block;height:auto}figcaption{padding:4px 0}</style>${figures.join('')}`);
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

const compareTo = argument('compare');
if (compareTo !== undefined) {
  await compare(resolve(compareTo), process.argv.slice(2).filter(value => !value.startsWith('-')));
} else {
  const only = argument('page')?.split(',');
  await render(resolve(argument('out') ?? resolve(root, 'artifacts/utilities-text-reference')), only);
}
