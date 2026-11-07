// The transforms lab (demo/src/transform-lab.tsx) as plain HTML with the CSS a browser developer would write, rendered by
// headless Chrome through Puppeteer, to compare against what the library draws (docs/tracks/transforms.md, "Against Chrome").
//
//   node --import tsx scripts/transform-reference.mjs --render [--out=<dir>]
//       Renders each shape case to <dir>/chrome-<case>-dpr1.png (a 1120 x 800 window) and -dpr2.png (the 560 x 400 logical window
//       of a content scale of two, at twice the pixels), as the native verifier has them, and writes <dir>/reference.json: the
//       bounding rectangle of each case's card and its text, for the text-free comparison.
//   node --import tsx scripts/transform-reference.mjs --golden
//       Writes demo/src/transform-golden.ts: the rectangle Chrome reports for each shape case, and the matrix (about the origin)
//       of each transition case at the fractions the verifier samples. The native verifier holds the library to them.
//   node --import tsx scripts/transform-reference.mjs --diff --native=<dir> [--chrome=<dir>] [--out=<dir>]
//       Compares the native verifier's captures (<dir>/transforms-<case>-dpr<k>.png) with Chrome's per channel and writes
//       <out>/<case>-dpr<k>.png (Chrome, ours and their difference side by side) and <out>/report.json.
//
// Input is Chrome's own; no real OS input is generated.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
// tsx loads the TypeScript data module as CommonJS, whose named exports an ES module reads through the default.
import transformData from '../demo/src/transform-data.ts';

const {
  BEHAVIOUR, CARD, CHILD, SHAPE_CASES, STAGE, TRANSITION_CASES, TRANSITION_SAMPLES,
} = transformData;

rejectUnknownArguments(process.argv.slice(2), { flags: ['--render', '--golden', '--diff'], prefixes: ['--out=', '--native=', '--chrome='] });
const root = resolve(import.meta.dirname, '..');
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
// The windows the native verifier has: landscape at ratio one, and its content-scale-two window (half the logical size).
const WINDOWS = [['dpr1', 1120, 800, 1], ['dpr2', 560, 400, 2]];
const SETTLE_MS = 300;
/** A text rectangle is grown by this (logical pixels) before the shape comparison leaves it out. */
const TEXT_MASK_MARGIN = 3;
/** Levels (of 255) above which a pixel counts as visibly different. */
const VISIBLE_LEVELS = 24;

// The font the engine draws its default theme with (`thirdparty/fonts/Inter_Regular.woff2`), so a glyph differs only in how it is
// rasterised, not in what it is. `GODOT_INTER_FONT` names the file when the engine source is elsewhere.
const fontPath = process.env.GODOT_INTER_FONT ?? resolve(homedir(), 'Development/godot/thirdparty/fonts/Inter_Regular.woff2');
const fontData = (await readFile(fontPath)).toString('base64');

// Tailwind's text sizes, as the lab's classes mean them.
const css = `
@font-face { font-family: 'Engine Inter'; src: url(data:font/woff2;base64,${fontData}) format('woff2'); }
*, ::before, ::after { box-sizing: border-box; margin: 0; }
body { margin: 0; font-family: 'Engine Inter', sans-serif; background: white; }
.text-xl { font-size: 20px; line-height: 28px; } .text-sm { font-size: 14px; line-height: 20px; }
.card { position: absolute; display: flex; flex-direction: column; }
`;

function cardMarkup(spec) {
  const origin = spec.origin === undefined ? '' : `transform-origin:${spec.origin};`;
  const child = spec.child === undefined ? '' : `<div id="child" style="position:absolute;left:${CHILD.left}px;top:${CHILD.top}px;width:${CHILD.width}px;height:${CHILD.height}px;border-radius:${CHILD.radius}px;border:${CHILD.border}px solid ${CHILD.borderColor};background:${CHILD.fill};transform:${spec.child.transform};${spec.child.origin === undefined ? '' : `transform-origin:${spec.child.origin};`}"></div>`;
  return `<div id="card" class="card" style="left:${CARD.left}px;top:${CARD.top}px;width:${CARD.width}px;height:${CARD.height}px;border-radius:${CARD.radius}px;border:${CARD.border}px solid ${CARD.borderColor};background:${CARD.fill};padding:${CARD.padding}px;transform:${spec.transform};${origin}">
    <span id="title" class="text-xl" style="color:${CARD.ink}">${CARD.title}</span><span id="body" class="text-sm" style="color:${CARD.ink}">${CARD.body}</span>${child}</div>`;
}

function stageMarkup(inner) {
  return `<!doctype html><meta charset="utf-8"><style>${css}</style>
<div id="stage" style="position:relative;width:${STAGE.width}px;height:${STAGE.height}px;background:${STAGE.background}">${inner}</div>`;
}

const rectOf = box => ({ x: box.x, y: box.y, width: box.width, height: box.height });

/** The rectangles of a case in Chrome: the card's bounding box and each line of text (transformed, so boxes round them). */
async function measure(page) {
  return page.evaluate(() => {
    const rect = box => ({ x: box.x, y: box.y, width: box.width, height: box.height });
    const text = [];
    for (const id of ['title', 'body']) {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById(id));
      for (const box of range.getClientRects()) text.push(rect(box));
    }
    return { card: rect(document.getElementById('card').getBoundingClientRect()), text };
  });
}

async function render(outDirectory) {
  await mkdir(outDirectory, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  const reference = {};
  try {
    for (const [suffix, width, height, scale] of WINDOWS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: scale });
      for (const spec of SHAPE_CASES) {
        await page.setContent(stageMarkup(cardMarkup(spec)));
        await new Promise(done => setTimeout(done, SETTLE_MS));
        await page.screenshot({ path: resolve(outDirectory, `chrome-${spec.name}-${suffix}.png`) });
        reference[`${spec.name}-${suffix}`] = await measure(page);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  await writeFile(resolve(outDirectory, 'reference.json'), `${JSON.stringify(reference, null, 2)}\n`);
  console.log(`Chrome reference: ${Object.keys(reference).length} pictures in ${outDirectory}`);
  return reference;
}

/**
 * The matrix of `transform` about the card's origin (the middle of its border box), for a card of the lab's size: CSS's
 * matrix for the function list is about the origin already (the engine moves the origin to zero and back), so Chrome's
 * `getComputedStyle().transform` is the matrix the library's snapshot reports.
 */
async function transitionMatrices(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: STAGE.width, height: STAGE.height });
  const matrices = {};
  try {
    for (const spec of TRANSITION_CASES) {
      await page.setContent(stageMarkup(cardMarkup({ transform: spec.from })));
      matrices[spec.name] = await page.evaluate((spec, samples, cardWidth, cardHeight) => {
        const card = document.getElementById('card');
        const animation = card.animate([{ transform: spec.from }, { transform: spec.to }], { duration: spec.durationMs, easing: 'linear', fill: 'both' });
        animation.pause();
        const out = {};
        for (const fraction of samples) {
          animation.currentTime = fraction * spec.durationMs;
          const m = new DOMMatrix(getComputedStyle(card).transform);
          // The computed matrix is about the origin; the library reports the map of the card's own frame, which is that
          // matrix conjugated by the move of the origin (the middle of the card).
          const ox = cardWidth / 2;
          const oy = cardHeight / 2;
          out[fraction] = [m.a, m.b, m.c, m.d, m.e + ox - (m.a * ox + m.c * oy), m.f + oy - (m.b * ox + m.d * oy)];
        }
        return out;
      }, spec, TRANSITION_SAMPLES, CARD.width, CARD.height);
    }
  } finally {
    await page.close();
  }
  return matrices;
}

async function golden() {
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  const rects = {};
  const sizes = {};
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: STAGE.width, height: STAGE.height });
    for (const spec of SHAPE_CASES) {
      await page.setContent(stageMarkup(cardMarkup(spec)));
      const measured = await measure(page);
      rects[spec.name] = measured.card;
      sizes[spec.name] = measured.text.length;
    }
    // The behaviour pages' rectangles the verifier compares: a bar turned 30 degrees.
    const { bar, anchor } = BEHAVIOUR;
    const box = (spec, transform) => `<div id="b" style="position:absolute;left:${spec.left}px;top:${spec.top}px;width:${spec.width}px;height:${spec.height}px;transform:${transform}"></div>`;
    await page.setContent(stageMarkup(box(bar, bar.transform)));
    const barRect = rectOf(await page.evaluate(() => document.getElementById('b').getBoundingClientRect().toJSON()));
    await page.setContent(stageMarkup(box(anchor, anchor.transform)));
    const anchorRect = rectOf(await page.evaluate(() => document.getElementById('b').getBoundingClientRect().toJSON()));
    await page.close();
    const matrices = await transitionMatrices(browser);
    const body = `// Generated by \`node --import tsx scripts/transform-reference.mjs --golden\` from headless Chrome: what the browser reports for the
// transforms lab's CSS. The native verifier holds the library to these numbers; do not edit by hand.
export interface GoldenRect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

/** \`getBoundingClientRect()\` of each shape case's card. */
export const GOLDEN_SHAPE_RECTS: Readonly<Record<string, GoldenRect>> = ${JSON.stringify(rects, null, 2)};

/** The bounding rectangles of the behaviour pages' turned elements. */
export const GOLDEN_BAR_RECT: GoldenRect = ${JSON.stringify(barRect)};
export const GOLDEN_ANCHOR_RECT: GoldenRect = ${JSON.stringify(anchorRect)};

/** The matrix (a, b, c, d, e, f) of each transition case's card, in its own frame, at each sampled fraction of the transition. */
export const GOLDEN_TRANSITION_MATRICES: Readonly<Record<string, Readonly<Record<string, readonly number[]>>>> = ${JSON.stringify(matrices, null, 2)};
`;
    await writeFile(resolve(root, 'demo/src/transform-golden.ts'), body);
    console.log(`Wrote demo/src/transform-golden.ts (${Object.keys(rects).length} rectangles, ${Object.keys(matrices).length} transitions)`);
  } finally {
    await browser.close();
  }
}

/** The page that decodes two PNGs and compares them per channel, leaving out the rectangles in `mask`. */
async function compareImages(browser, chromePath, nativePath, mask, scale) {
  const page = await browser.newPage();
  try {
    await page.setContent('<!doctype html><canvas id="c"></canvas>');
    const chrome = (await readFile(chromePath)).toString('base64');
    const native = (await readFile(nativePath)).toString('base64');
    return await page.evaluate(async (chrome, native, mask, scale, stage, visible, inkColour, fillColour) => {
      const load = source => new Promise((done, fail) => {
        const image = new Image();
        image.onload = () => done(image);
        image.onerror = () => fail(new Error('cannot decode'));
        image.src = `data:image/png;base64,${source}`;
      });
      const read = image => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      };
      const a = read(await load(chrome));
      const b = read(await load(native));
      const width = Math.round(stage.width * scale);
      const height = Math.round(stage.height * scale);
      const sizeNote = `${a.width}x${a.height} vs ${b.width}x${b.height}`;
      if (a.width !== b.width || a.height !== b.height) return { error: `different sizes: ${sizeNote}` };
      const masked = new Uint8Array(width * height);
      for (const rect of mask) {
        const x0 = Math.max(0, Math.floor(rect.x * scale)); const x1 = Math.min(width, Math.ceil((rect.x + rect.width) * scale));
        const y0 = Math.max(0, Math.floor(rect.y * scale)); const y1 = Math.min(height, Math.ceil((rect.y + rect.height) * scale));
        for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) masked[y * width + x] = 1;
      }
      const channels = ['r', 'g', 'b'];
      const worst = [0, 0, 0];
      const sum = [0, 0, 0];
      const histogram = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
      let counted = 0;
      let visibly = 0;
      const diff = new ImageData(width, height);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const pixel = [0, 0, 0].map((_, channel) => Math.abs(a.data[(y * a.width + x) * 4 + channel] - b.data[(y * b.width + x) * 4 + channel]));
          const biggest = Math.max(...pixel);
          diff.data[index] = diff.data[index + 1] = diff.data[index + 2] = Math.min(255, biggest * 4);
          diff.data[index + 3] = 255;
          if (masked[y * width + x]) { diff.data[index] = 80; diff.data[index + 1] = 0; diff.data[index + 2] = 80; continue; }
          counted += 1;
          for (let channel = 0; channel < 3; channel += 1) {
            worst[channel] = Math.max(worst[channel], pixel[channel]);
            sum[channel] += pixel[channel];
            histogram[channel][pixel[channel]] += 1;
          }
          if (biggest > visible) visibly += 1;
        }
      }
      const percentile = (channel, share) => {
        let seen = 0;
        for (let level = 0; level < 256; level += 1) {
          seen += histogram[channel][level];
          if (seen >= counted * share) return level;
        }
        return 255;
      };
      // The text: where the ink is and how much, in the rectangles that were left out of the comparison.
      const ink = image => {
        const lum = (data, i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        const fill = lum(fillColour, 0);
        const dark = lum(inkColour, 0);
        let mass = 0; let cx = 0; let cy = 0; let mid = 0; let inked = 0;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            if (!masked[y * width + x]) continue;
            const i = (y * image.width + x) * 4;
            // How much like the ink and how little like the card's fill the pixel is; the stage's pale ground counts as fill.
            const weight = Math.max(0, Math.min(1, (fill - lum(image.data, i)) / (fill - dark)));
            if (weight < 0.02) continue;
            mass += weight; cx += weight * x; cy += weight * y;
            inked += 1;
            if (weight > 0.15 && weight < 0.85) mid += 1;
          }
        }
        return { mass, x: mass > 0 ? cx / mass / scale : 0, y: mass > 0 ? cy / mass / scale : 0, midShare: inked > 0 ? mid / inked : 0 };
      };
      const canvas = document.getElementById('c');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').putImageData(diff, 0, 0);
      return {
        compared: counted, visible: visibly, visibleShare: visibly / Math.max(1, counted),
        worst: Object.fromEntries(channels.map((name, i) => [name, worst[i]])),
        typical: Object.fromEntries(channels.map((name, i) => [name, sum[i] / Math.max(1, counted)])),
        p99: Object.fromEntries(channels.map((name, i) => [name, percentile(i, 0.99)])),
        textChrome: ink(a), textNative: ink(b),
        diffPng: canvas.toDataURL('image/png').split(',')[1],
      };
    }, chrome, native, mask, scale, STAGE, VISIBLE_LEVELS,
    new Uint8ClampedArray([0x1e, 0x29, 0x3b, 255]), new Uint8ClampedArray([0xfd, 0xe6, 0x8a, 255]));
  } finally {
    await page.close();
  }
}

/** Puts the images side by side, each under its label, in one PNG. */
async function sideBySide(browser, output, entries) {
  const figures = [];
  for (const [label, path, base64] of entries) {
    const data = base64 ?? (await readFile(path)).toString('base64');
    figures.push(`<figure><img src="data:image/png;base64,${data}"><figcaption>${label}</figcaption></figure>`);
  }
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 800, height: 600 });
    await page.setContent(`<!doctype html><style>body{margin:0;background:#111;color:#ddd;font:13px system-ui;display:flex;gap:8px;padding:8px;align-items:flex-start}
      figure{margin:0}img{display:block;height:auto}figcaption{padding:4px 0}</style>${figures.join('')}`);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    const first = await page.evaluate(() => document.images[0].naturalWidth);
    await page.evaluate(width => { for (const image of document.images) image.style.width = `${width}px`; }, first);
    const size = await page.evaluate(() => ({ width: Math.ceil(document.body.scrollWidth), height: Math.ceil(document.body.scrollHeight) }));
    await page.setViewport({ width: size.width, height: size.height });
    await page.screenshot({ path: output });
  } finally {
    await page.close();
  }
}

/** Crop the stage out of a window capture so the side-by-side shows the lab and not the empty window. */
async function crop(browser, path, scale) {
  const page = await browser.newPage();
  try {
    await page.setContent('<!doctype html><canvas id="c"></canvas>');
    return await page.evaluate(async (source, stage, scale) => {
      const image = new Image();
      await new Promise((done, fail) => { image.onload = done; image.onerror = fail; image.src = `data:image/png;base64,${source}`; });
      const canvas = document.getElementById('c');
      canvas.width = Math.round(stage.width * scale);
      canvas.height = Math.round(stage.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, (await readFile(path)).toString('base64'), STAGE, scale);
  } finally {
    await page.close();
  }
}

async function diff(nativeDirectory, chromeDirectory, outDirectory) {
  await mkdir(outDirectory, { recursive: true });
  const reference = JSON.parse(await readFile(resolve(chromeDirectory, 'reference.json'), 'utf8'));
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  const report = {};
  try {
    for (const [suffix, , , scale] of WINDOWS) {
      for (const spec of SHAPE_CASES) {
        const key = `${spec.name}-${suffix}`;
        const margin = TEXT_MASK_MARGIN;
        const mask = reference[key].text.map(box => ({ x: box.x - margin, y: box.y - margin, width: box.width + 2 * margin, height: box.height + 2 * margin }));
        const chromePath = resolve(chromeDirectory, `chrome-${key}.png`);
        const nativePath = resolve(nativeDirectory, `transforms-${key}.png`);
        const result = await compareImages(browser, chromePath, nativePath, mask, scale);
        if (result.error !== undefined) throw new Error(`${key}: ${result.error}`);
        const { diffPng, ...numbers } = result;
        report[key] = numbers;
        await sideBySide(browser, resolve(outDirectory, `${key}.png`), [
          ['Chrome', undefined, await crop(browser, chromePath, scale)],
          ['library', undefined, await crop(browser, nativePath, scale)],
          ['difference x4 (text left out in purple)', undefined, diffPng],
        ]);
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(resolve(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const row = (key, entry) => `${key.padEnd(22)} worst ${['r', 'g', 'b'].map(c => String(entry.worst[c]).padStart(3)).join(' ')}  typical ${['r', 'g', 'b'].map(c => entry.typical[c].toFixed(2).padStart(5)).join(' ')}  p99 ${['r', 'g', 'b'].map(c => String(entry.p99[c]).padStart(3)).join(' ')}  >${VISIBLE_LEVELS}: ${(entry.visibleShare * 100).toFixed(3)}%  text centre ${Math.hypot(entry.textNative.x - entry.textChrome.x, entry.textNative.y - entry.textChrome.y).toFixed(2)}px ink ${(entry.textNative.mass / Math.max(1e-9, entry.textChrome.mass)).toFixed(3)}x mid ${entry.textNative.midShare.toFixed(3)}/${entry.textChrome.midShare.toFixed(3)}`;
  for (const [key, entry] of Object.entries(report)) console.log(row(key, entry));
  console.log(`Wrote ${Object.keys(report).length} comparisons to ${outDirectory}`);
}

const flags = ['render', 'golden', 'diff'].filter(name => process.argv.includes(`--${name}`));
if (flags.length !== 1) throw new Error('Choose one of --render, --golden, --diff.');
if (flags[0] === 'render') await render(resolve(argument('out') ?? resolve(root, 'artifacts/transforms-reference')));
else if (flags[0] === 'golden') await golden();
else {
  const nativeDirectory = argument('native');
  if (nativeDirectory === undefined) throw new Error('--diff needs --native=<directory of the native captures>');
  await diff(resolve(nativeDirectory), resolve(argument('chrome') ?? resolve(root, 'artifacts/transforms-reference')), resolve(argument('out') ?? resolve(root, 'artifacts/transforms-compare')));
}
