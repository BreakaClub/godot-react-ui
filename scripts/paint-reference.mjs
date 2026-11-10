// The paint lab (demo/src/paint-lab.tsx) as plain HTML with the classes as a developer writes them, compiled by Tailwind v3.4.17's
// own compiler and rendered by headless Chrome through Puppeteer, to hold the library's raster against.
//
//   node --import tsx scripts/paint-reference.mjs --render [--out=<dir>]
//       Renders each page of the lab to <dir>/chrome-<page>-dpr1.png and -dpr2.png (the stage alone: 296 x 392 CSS pixels at device pixel
//       ratio 1 and 2). Tailwind is installed once into artifacts/utilities-paint-tailwind/ (npm, network).
//   node --import tsx scripts/paint-reference.mjs --compare --native=<dir> [--chrome=<dir>] [--out=<dir>] [--prefix=<name>] [--json=<file>] [--ratios=1,2] [--flat]
//       Reads <native>/<prefix>-<page>.png (ratio 1) and <native>/<prefix>-dpr2-<page>.png (ratio 2), as the native `paint` section names
//       them (with --flat, <prefix>-<page>.png for every ratio, as the Web verifier names the captures of one viewport), holds each against
//       Chrome's, and writes <out>/compare-<prefix>-<page>-dpr<n>.png (ours, Chrome's, the difference times eight) and a report of the
//       per-channel differences: overall and for each box. Prints the table.
//
// Input is Chrome's own; no real OS input is generated.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
// tsx loads the TypeScript data module as CommonJS, whose named exports an ES module reads through the default.
import paintData from '../demo/src/paint-data.ts';

const { PAINT_PAGES, PAINT_STAGE } = paintData;

rejectUnknownArguments(process.argv.slice(2), { prefixes: ['--out=', '--native=', '--chrome=', '--prefix=', '--json=', '--ratios='], flags: ['--render', '--compare', '--flat'] });
const root = resolve(import.meta.dirname, '..');
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const RATIOS = [1, 2];
const TAILWIND_VERSION = '3.4.17';
const TAILWIND_DIRECTORY = resolve(root, 'artifacts/utilities-paint-tailwind');
const SETTLE_MS = 300;
/** The difference panel shows each level of difference this many levels brighter. */
const DIFFERENCE_GAIN = 8;
/** A pixel counts as different from this many levels (of 255) on some channel. */
const THRESHOLDS = [4, 8, 16, 32];

async function tailwindCompiler() {
  if (!existsSync(resolve(TAILWIND_DIRECTORY, 'node_modules/tailwindcss/package.json'))) {
    await mkdir(TAILWIND_DIRECTORY, { recursive: true });
    await writeFile(resolve(TAILWIND_DIRECTORY, 'package.json'), '{"private":true}\n');
    execFileSync('npm', ['install', '--no-audit', '--no-fund', '--silent', `tailwindcss@${TAILWIND_VERSION}`], { cwd: TAILWIND_DIRECTORY, stdio: 'inherit' });
  }
  const require = createRequire(resolve(TAILWIND_DIRECTORY, 'package.json'));
  const version = require('tailwindcss/package.json').version;
  if (version !== TAILWIND_VERSION) throw new Error(`The reference needs Tailwind ${TAILWIND_VERSION}, found ${version} in ${TAILWIND_DIRECTORY}`);
  return { postcss: require('postcss'), tailwind: require('tailwindcss') };
}

const css = style => Object.entries(style).map(([name, value]) => `${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}:${value}`).join(';');

/** A box of the page as HTML: the classes as written, placed in pixels. */
function cellHtml(cell) {
  const place = { position: 'absolute', left: `${cell.left}px`, top: `${cell.top}px`, width: `${cell.width}px`, height: `${cell.height}px`, ...(cell.inline ?? {}) };
  return `<div data-cell="${cell.id}" class="${cell.className}" style="${css(place)}"></div>`;
}

function pageHtml(entry) {
  const shapes = (entry.shapes ?? []).map(shape => `<div style="${css({
    position: 'absolute', left: `${shape.left}px`, top: `${shape.top}px`, width: `${shape.width}px`, height: `${shape.height}px`,
    backgroundColor: shape.colour, ...(shape.radius === undefined ? {} : { borderRadius: `${shape.radius}px` }),
  })}"></div>`).join('');
  return `<div id="stage" style="${css({
    position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: `${PAINT_STAGE.width}px`, height: `${PAINT_STAGE.height}px`, backgroundColor: entry.base,
  })}">${shapes}${entry.cells.map(cellHtml).join('')}</div>`;
}

/** The library has no preflight: a box starts with no border, a transparent border colour, border-box sizing and a white text colour. */
const BASE_CSS = `
*, ::before, ::after { box-sizing: border-box; margin: 0; border-width: 0; border-style: solid; border-color: transparent; }
html, body { margin: 0; background: #808080; color: #ffffff; }
`;

// `@tailwind base` carries the `*, ::before, ::after { --tw-ring-offset-width: 0px; ... }` defaults the ring, gradient, filter and transform utilities read:
// without them `ring-1` and `bg-gradient-to-r from-*` are invalid in Chrome and draw nothing. Preflight itself (the reset) is off.
async function compileCss(tools, html) {
  const result = await tools.postcss([tools.tailwind({ content: [{ raw: html, extension: 'html' }], corePlugins: { preflight: false } })])
    .process('@tailwind base; @tailwind utilities;', { from: undefined });
  return result.css;
}

async function render(outDirectory) {
  await mkdir(outDirectory, { recursive: true });
  const tools = await tailwindCompiler();
  const everything = PAINT_PAGES.map(pageHtml).join('');
  const stylesheet = await compileCss(tools, everything);
  await writeFile(resolve(outDirectory, 'tailwind.css'), stylesheet);
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  try {
    for (const ratio of RATIOS) {
      const page = await browser.newPage();
      await page.setViewport({ width: PAINT_STAGE.width, height: PAINT_STAGE.height, deviceScaleFactor: ratio });
      for (const entry of PAINT_PAGES) {
        await page.setContent(`<!doctype html><meta charset="utf-8"><style>${BASE_CSS}${stylesheet}</style>${pageHtml(entry)}`);
        await new Promise(done => setTimeout(done, SETTLE_MS));
        await page.screenshot({ path: resolve(outDirectory, `chrome-${entry.name}-dpr${ratio}.png`), clip: { x: 0, y: 0, width: PAINT_STAGE.width, height: PAINT_STAGE.height } });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

/** The comparison, run inside Chrome: it decodes both PNGs (no image library is needed) and measures every box. */
function compareInPage({ ours, chrome, ratio, stage, cells, gain, thresholds }) {
  const decode = async url => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  };
  const crop = (image, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height, 0, 0, width, height);
    return { canvas, data: context.getImageData(0, 0, width, height) };
  };
  const measure = (a, b, width, rect) => {
    const histogram = [0, 1, 2].map(() => new Float64Array(256));
    const over = thresholds.map(() => 0);
    let pixels = 0;
    for (let y = rect.top; y < rect.bottom; y += 1) {
      for (let x = rect.left; x < rect.right; x += 1) {
        const index = (y * width + x) * 4;
        let worst = 0;
        for (let channel = 0; channel < 3; channel += 1) {
          const difference = Math.abs(a.data.data[index + channel] - b.data.data[index + channel]);
          histogram[channel][difference] += 1;
          worst = Math.max(worst, difference);
        }
        thresholds.forEach((threshold, slot) => { if (worst > threshold) over[slot] += 1; });
        pixels += 1;
      }
    }
    const percentile = (counts, share) => {
      let seen = 0;
      for (let level = 0; level < 256; level += 1) {
        seen += counts[level];
        if (seen >= pixels * share) return level;
      }
      return 255;
    };
    const mean = counts => counts.reduce((sum, count, level) => sum + count * level, 0) / pixels;
    const max = counts => { for (let level = 255; level >= 0; level -= 1) if (counts[level] > 0) return level; return 0; };
    return {
      pixels,
      mean: histogram.map(mean).map(value => Math.round(value * 1000) / 1000),
      p99: histogram.map(counts => percentile(counts, 0.99)),
      max: histogram.map(max),
      over: Object.fromEntries(thresholds.map((threshold, slot) => [`over${threshold}`, over[slot]])),
    };
  };
  return (async () => {
    const width = stage.width * ratio;
    const height = stage.height * ratio;
    const [oursImage, chromeImage] = await Promise.all([decode(ours), decode(chrome)]);
    const a = crop(oursImage, width, height);
    const b = crop(chromeImage, width, height);
    const whole = measure(a, b, width, { left: 0, top: 0, right: width, bottom: height });
    const boxes = cells.map(cell => {
      const margin = cell.margin * ratio;
      const rect = {
        left: Math.max(0, Math.floor(cell.left * ratio - margin)), top: Math.max(0, Math.floor(cell.top * ratio - margin)),
        right: Math.min(width, Math.ceil((cell.left + cell.width) * ratio + margin)), bottom: Math.min(height, Math.ceil((cell.top + cell.height) * ratio + margin)),
      };
      return { id: cell.id, className: cell.className, ...measure(a, b, width, rect) };
    });
    const difference = document.createElement('canvas');
    difference.width = width;
    difference.height = height;
    const context = difference.getContext('2d');
    const output = context.createImageData(width, height);
    for (let index = 0; index < a.data.data.length; index += 4) {
      for (let channel = 0; channel < 3; channel += 1) output.data[index + channel] = Math.min(255, Math.abs(a.data.data[index + channel] - b.data.data[index + channel]) * gain);
      output.data[index + 3] = 255;
    }
    context.putImageData(output, 0, 0);
    return { whole, boxes, difference: difference.toDataURL('image/png'), cropped: a.canvas.toDataURL('image/png') };
  })();
}

/** How far past a box its shadows and rings can show, for the area measured round it. */
function marginOf(cell) {
  const reach = /shadow-2xl|shadow-\[0_8px_16px/u.test(cell.className) ? 80 : /shadow-xl|ring-8|outline-8/u.test(cell.className) ? 56 : 36;
  return reach;
}

async function compare(nativeDirectory, chromeDirectory, outDirectory, prefix, jsonPath, ratios, flat) {
  await mkdir(outDirectory, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
  const report = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });
    await page.setContent('<!doctype html><meta charset="utf-8">');
    const dataUrl = async path => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
    for (const ratio of ratios) {
      for (const entry of PAINT_PAGES) {
        const nativePath = resolve(nativeDirectory, ratio === 1 || flat ? `${prefix}-${entry.name}.png` : `${prefix}-dpr2-${entry.name}.png`);
        const chromePath = resolve(chromeDirectory, `chrome-${entry.name}-dpr${ratio}.png`);
        if (!existsSync(nativePath)) { console.log(`missing ${nativePath}`); continue; }
        const ours = await dataUrl(nativePath);
        const chrome = await dataUrl(chromePath);
        const cells = entry.cells.map(cell => ({ id: cell.id, className: cell.className, left: cell.left, top: cell.top, width: cell.width, height: cell.height, margin: marginOf(cell) }));
        const result = await page.evaluate(compareInPage, { ours, chrome, ratio, stage: PAINT_STAGE, cells, gain: DIFFERENCE_GAIN, thresholds: THRESHOLDS });
        const { difference, cropped, ...numbers } = result;
        report.push({ page: entry.name, ratio, ...numbers });
        // Side by side: ours, Chrome's, the difference.
        const panels = [['ours', cropped], ['Chrome', chrome], [`difference x${DIFFERENCE_GAIN}`, difference]];
        const scale = ratio === 1 ? 2 : 1;
        await page.setViewport({ width: Math.ceil(3 * PAINT_STAGE.width * ratio * scale + 40), height: Math.ceil(PAINT_STAGE.height * ratio * scale + 50) });
        await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#111;color:#ddd;font:12px system-ui;display:flex;gap:8px;padding:8px}
          figure{margin:0}img{display:block;width:${PAINT_STAGE.width * ratio * scale}px;image-rendering:pixelated}figcaption{padding:2px 0}</style>
          ${panels.map(([label, url]) => `<figure><figcaption>${entry.name} at ratio ${ratio}: ${label}${label === 'ours' ? ` (mean ${numbers.whole.mean.join(' ')}, max ${numbers.whole.max.join(' ')})` : ''}</figcaption><img src="${url}"></figure>`).join('')}`);
        await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
        await page.screenshot({ path: resolve(outDirectory, `compare-${prefix}-${entry.name}-dpr${ratio}.png`) });
      }
    }
  } finally {
    await browser.close();
  }
  if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  const pad = (text, width) => String(text).padEnd(width);
  for (const ratio of ratios) {
    console.log(`\ndevice pixel ratio ${ratio}: per-channel level differences (of 255), r g b`);
    console.log(`${pad('page', 22)}${pad('mean', 22)}${pad('p99', 14)}${pad('max', 14)}pixels over 8 / 16 / 32`);
    for (const row of report.filter(entry => entry.ratio === ratio)) {
      const { whole } = row;
      console.log(`${pad(row.page, 22)}${pad(whole.mean.join(' '), 22)}${pad(whole.p99.join(' '), 14)}${pad(whole.max.join(' '), 14)}${whole.over.over8} / ${whole.over.over16} / ${whole.over.over32} of ${whole.pixels}`);
    }
  }
}

if (process.argv.includes('--render')) {
  await render(resolve(argument('out') ?? resolve(root, 'artifacts/utilities-paint-chrome')));
} else if (process.argv.includes('--compare')) {
  const native = argument('native');
  if (native === undefined) throw new Error('--compare needs --native=<directory of the captures>');
  await compare(resolve(native), resolve(argument('chrome') ?? resolve(root, 'artifacts/utilities-paint-chrome')),
    resolve(argument('out') ?? resolve(root, 'artifacts/utilities-paint-compare')), argument('prefix') ?? 'paint', argument('json'),
    (argument('ratios') ?? '1,2').split(',').map(Number), process.argv.includes('--flat'));
} else {
  throw new Error('Pass --render or --compare');
}
