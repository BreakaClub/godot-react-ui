// The `font-slices` section of the Web interaction verifier (docs/tracks/font-slices.md): text with characters no registered font has, which the Web draws with a font
// the page downloads for them. Each group is a page of its own, because what a page has fetched and added is state that outlives a lab:
//
//   - a page with nothing to download fetches nothing;
//   - a line of Chinese, Japanese and Korean, plain and in a coloured span, is hex boxes until its fonts arrive and then glyphs: the ink and the laid-out width are
//     compared with Chrome's own rendering of the same text from the same font files, at both device pixel ratios, and what the page fetched is exactly the manifest,
//     the index of the language's family and the slices that hold the text, counted from the network;
//   - colour emoji (a skin tone sequence, a flag) the same;
//   - a slice that is missing, a manifest that is missing and a request that is dropped leave the text as boxes and are reported;
//   - taking the loader away (the negative control) leaves boxes and fetches nothing;
//   - frames keep their cadence while a slice loads on a slow line.
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPackEntries } from './pack-contents.mjs';
import { FONT_SLICES_DIRECTORY } from './font-slices/paths.mjs';
import { bestCorrelation, coverageOf, decodePng, deviceRect, inkBounds, inkColour, inkTotal, redInkOf } from './font-slices/ink.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STARTUP_TIMEOUT_MS = 240_000;
const POLL_MS = 50;
const ACTION_TIMEOUT_MS = 30_000;
/** Logged by the engine's threaded startup on the main thread; every Web verifier treats it as expected. */
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous';

// What the lab draws its text in: `font-sans text-2xl leading-8 text-slate-900`, a span `text-red-600`.
const FONT_PX = 24;
const LINE_PX = 32;
const INK = '#0f172a';
const RED = '#dc2626';
/** How much of the page around a text is compared, in css pixels: the ink of a glyph may reach past the line box. */
const MARGIN_PX = 4;
/** How far Chrome's rendering may sit from ours before the best match is looked for, in css pixels: the two place a baseline a pixel apart. */
const SHIFT_REACH_PX = 3;

// What "the same text" means in numbers, from the first run of this section (docs/tracks/font-slices.md): correlation of the ink of the two rasters, at the best shift.
const MINIMUM_CORRELATION = 0.95;
/**
 * Colour emoji against Chrome's: the same pictures, but Godot advances each by the font's own 1275 units of 1024 (29.9 px at 24 px) and Chrome by 28.7 px,
 * so by the fifth emoji they are 6 px apart and a best shift of three pixels cannot line them all up. Measured: 0.83 at both ratios.
 */
const MINIMUM_EMOJI_CORRELATION = 0.8;
const EMOJI_WIDTH_TOLERANCE_PX = 8;
/** Hex boxes against Chrome's glyphs: a box is not a glyph, so the correlation must be well below what a glyph gets. */
const MAXIMUM_BOX_CORRELATION = 0.6;
const INK_RATIO = { least: 0.7, most: 1.3 };
/** Our width of a line against Chrome's, in css pixels: both use the font's advances. */
const WIDTH_TOLERANCE_PX = 1.5;
const MAXIMUM_COLOUR_DISTANCE = 48;
/** A frame that takes this much longer than the page's own worst before the load is a frame the load dropped. */
const FRAME_ALLOWANCE_MS = 50;
const ADD_BUDGET_MS = 50;
const SLOW_LINE = { latency: 80, downloadThroughput: 250_000, uploadThroughput: 250_000 };

/** The build the page is served from: the manifest and each family's index, read from where `scripts/build-font-slices.mjs` wrote them. */
async function readBuild() {
  const manifest = JSON.parse(await readFile(join(FONT_SLICES_DIRECTORY, 'font-slices.json'), 'utf8'));
  const indexes = new Map();
  for (const family of manifest.families) indexes.set(family.id, JSON.parse(await readFile(join(FONT_SLICES_DIRECTORY, 'o', ...family.index.path.split('/')), 'utf8')));
  return { manifest, indexes };
}

function rangesOf(text) {
  return text.split(',').map(part => {
    const [start, end] = part.slice(2).split('-');
    return [Number.parseInt(start, 16), Number.parseInt(end ?? start, 16)];
  });
}

const inRanges = (ranges, codepoint) => ranges.some(([start, end]) => codepoint >= start && codepoint <= end);

/**
 * The slices a text needs, worked out here and not by the library, so that the check is not the library agreeing with itself: the characters that are not ASCII (no
 * registered font of the demo has one) are looked up in the families that are first for them, then in the families the language prefers, then in the rest in the manifest's order.
 */
function expectedSlices(build, text, language) {
  const subtags = language.toLowerCase().split(/[-_]/u);
  const fit = family => Math.max(0, ...family.languages.map(prefix => {
    const parts = prefix.split('-');
    return parts.length <= subtags.length && parts.every((part, index) => part === subtags[index]) ? parts.length : 0;
  }));
  const byLanguage = build.manifest.families.map((family, order) => ({ family, order, fit: fit(family) })).sort((a, b) => b.fit - a.fit || a.order - b.order).map(entry => entry.family);
  // A stage is a family and the characters it may be looked up for: the families that are first for a range take it before the rest.
  const stages = [
    ...build.manifest.families.filter(family => family.first !== '').map(family => ({ family, accepts: codepoint => inRanges(rangesOf(family.first), codepoint) })),
    ...byLanguage.map(family => ({ family, accepts: () => true })),
  ];
  const slices = new Set();
  const families = new Set();
  for (const codepoint of new Set([...text].map(character => character.codePointAt(0)).filter(code => code > 0x7f))) {
    for (const { family, accepts } of stages) {
      if (!accepts(codepoint)) continue;
      const slice = build.indexes.get(family.id).slices.find(candidate => inRanges(rangesOf(candidate.ranges), codepoint));
      if (slice === undefined) continue;
      slices.add(slice.path);
      families.add(family.id);
      break;
    }
  }
  return { slices: [...slices].sort(), families: [...families].sort() };
}

/** A page of its own, with its errors and what it fetched from the slice hosting (`/o/` and the manifest). */
async function openPage({ browser, base, viewport, errors, ignoring = [] }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const fetched = [];
  const logs = [];
  page.on('console', (message) => {
    logs.push({ type: message.type(), text: message.text() });
    if (message.type() !== 'error' || message.text().includes(EMSCRIPTEN_STARTUP_DIAGNOSTIC)) return;
    if (ignoring.some(pattern => pattern.test(message.text()))) return;
    errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith('/o/') && !url.pathname.endsWith('/font-slices.json')) return;
    fetched.push({ path: url.pathname, status: response.status(), bytes: Number(response.headers()['content-length'] ?? 0) });
  });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!(await page.evaluate(() => typeof globalThis.godotReactDemo?.fontSlices === 'function'))) {
    if (errors.length > 0 || Date.now() > deadline) throw new Error(`${base} did not start: ${errors.join('; ') || 'timed out'}`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, POLL_MS));
  }
  return { page, fetched, logs };
}

const settle = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done))))));
const demo = (page, method, ...args) => page.evaluate((name, parameters) => globalThis.godotReactDemo[name](...parameters), method, args);

async function godotRaster(page) {
  const canvas = await page.$('canvas');
  const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: ACTION_TIMEOUT_MS })));
  await canvas.dispose();
  return image;
}

/** A text of the lab: its box (css pixels) and the width of its first line. */
async function textFacts(page, testID) {
  const [node, lines] = await Promise.all([demo(page, 'find', testID), demo(page, 'textLines', testID)]);
  return { rect: node.rect, width: lines.lines[0]?.width ?? 0 };
}

let openSans;
async function openSansCss() {
  openSans ??= (await readFile(join(root, 'demo', 'fonts', 'OpenSans-Variable.ttf'))).toString('base64');
  return `@font-face{font-family:"Open Sans";font-weight:300 800;src:url(data:font/ttf;base64,${openSans}) format("truetype");}`;
}

/**
 * Chrome's own rendering of `pieces` (the lab's sample) with the same font files: Open Sans, then the slices as `@font-face` rules with their `unicode-range`, as Google Fonts
 * serves them, in a page the size of the Godot one, at the same position. Returns the raster and the width of the text.
 */
async function chromeRaster({ browser, base, viewport, rect, pieces, slices }) {
  const page = await browser.newPage();
  try {
    await page.setViewport(viewport);
    const faces = slices.map(slice => `@font-face{font-family:slices;src:url(${new URL(`/o/${slice.path}`, base).href}) format("woff2");unicode-range:${slice.ranges};}`).join('');
    const body = pieces.map(([text, tone]) => (tone === '' ? text : `<span style="color:${RED}">${text}</span>`)).join('');
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>${await openSansCss()}${faces}body{margin:0;background:#fff}#t{position:absolute;left:${rect.x}px;top:${rect.y}px;font:400 ${FONT_PX}px/${LINE_PX}px "Open Sans",slices;color:${INK};white-space:nowrap}</style><div id="t">${body}</div>`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const width = await page.evaluate(() => document.getElementById('t').getBoundingClientRect().width);
    const image = decodePng(Buffer.from(await page.screenshot({ type: 'png', timeout: ACTION_TIMEOUT_MS })));
    return { image, width };
  } finally {
    await page.close();
  }
}

/** How much a raster of a text is like Chrome's of it, by the ink in `rect` (css pixels): the correlation at the best shift, the ratio of ink, the difference of the ink's boxes. */
function compare(ours, chrome, rect, ratio, mapOf = coverageOf) {
  const region = deviceRect(rect, ratio, MARGIN_PX, ours);
  const a = mapOf(ours, region);
  const b = mapOf(chrome, region);
  const best = bestCorrelation(a, b, region.width, region.height, Math.ceil(SHIFT_REACH_PX * ratio));
  const boundsA = inkBounds(a, region.width, region.height);
  const boundsB = inkBounds(b, region.width, region.height);
  return {
    correlation: Number(best.correlation.toFixed(4)),
    shiftPx: [best.dx / ratio, best.dy / ratio],
    inkRatio: Number((inkTotal(a) / (inkTotal(b) || 1)).toFixed(3)),
    inkWidthDeltaPx: boundsA === undefined || boundsB === undefined ? null : Number((((boundsA.right - boundsA.left) - (boundsB.right - boundsB.left)) / ratio).toFixed(2)),
    ink: Number(inkTotal(a).toFixed(1)),
    region,
  };
}

const describeComparison = (value) => `correlation ${value.correlation}, ink ${value.inkRatio} of Chrome's, width ${value.inkWidthDeltaPx} px apart`;
const isGlyphs = (value, minimum = MINIMUM_CORRELATION) => value.correlation >= minimum && value.inkRatio >= INK_RATIO.least && value.inkRatio <= INK_RATIO.most;

/** The files of the slice hosting a page fetched, as the sets a check compares: the manifest, the indexes of the families, the slices. */
function fetchedSets(fetched) {
  const ok = fetched.filter(entry => entry.status === 200);
  return {
    manifest: ok.filter(entry => entry.path.endsWith('/font-slices.json')).length,
    indexes: ok.filter(entry => entry.path.endsWith('.index.json')).map(entry => entry.path.split('/').at(-1).replace('.index.json', '')).sort(),
    slices: ok.filter(entry => entry.path.endsWith('.woff2')).map(entry => entry.path.slice('/o/'.length)).sort(),
    bytes: ok.reduce((total, entry) => total + entry.bytes, 0),
    failed: fetched.filter(entry => entry.status !== 200).map(entry => `${entry.status} ${entry.path}`),
  };
}

export async function runFontSlicesScenario({ browser, base, check, viewport, exportDirectory }) {
  const build = await readBuild();
  const errors = [];
  const metrics = {};
  const sample = async (page, id) => demo(page, 'showFontSlices', { sample: id });

  // The release pack carries no font and no manifest: they are beside it, in the export, and in the bucket.
  const pack = readPackEntries(join(exportDirectory, 'index.pck'));
  check('the pack holds no font file and no slice manifest: the slices are not part of the release', !pack.some(entry => /\.woff2$|font-slices\.json$|\.index\.json$/u.test(entry.path)), { entries: pack.length });

  const SAMPLE_TEXTS = {
    simplified: { language: 'zh-CN', text: '你好，世界。今天天气很好，我们一起去公园玩吧。', pieces: [['你好，世界。', ''], ['今天天气很好', 'text-red-600'], ['，我们一起去公园玩吧。', '']] },
    traditional: { language: 'zh-TW', text: '你好，世界。今天天氣很好，我們一起去公園玩吧。', pieces: [['你好，世界。', ''], ['今天天氣很好', 'text-red-600'], ['，我們一起去公園玩吧。', '']] },
    japanese: { widthChanges: true, language: 'ja', text: 'こんにちは、世界。今日はいい天気ですね。公園へ行きましょう。', pieces: [['こんにちは、世界。', ''], ['今日はいい天気', 'text-red-600'], ['ですね。公園へ行きましょう。', '']] },
    korean: { widthChanges: true, language: 'ko', text: '안녕하세요, 세계. 오늘은 날씨가 좋네요. 공원에 갑시다.', pieces: [['안녕하세요, 세계. ', ''], ['오늘은 날씨가 좋네요', 'text-red-600'], ['. 공원에 갑시다.', '']] },
    'emoji-only': { emoji: true, language: 'en', text: '😀🌈👍🏽🚀🇦🇺', pieces: [['😀🌈', ''], ['👍🏽', 'text-red-600'], ['🚀🇦🇺', '']] },
  };

  /**
   * One language's text at one device pixel ratio, in a page of its own: boxes, then glyphs, and what it took.
   * `viewportOf(ratio)` is the viewport the page and Chrome's reference have.
   */
  async function textGroup(id, ratio) {
    const { language, text, pieces, emoji = false, widthChanges = false } = SAMPLE_TEXTS[id];
    const minimum = emoji ? MINIMUM_EMOJI_CORRELATION : MINIMUM_CORRELATION;
    const widthTolerance = emoji ? EMOJI_WIDTH_TOLERANCE_PX : WIDTH_TOLERANCE_PX;
    const label = `${id} (${language}, ratio ${ratio})`;
    const viewportOf = { ...viewport, deviceScaleFactor: ratio };
    const { page, fetched, logs } = await openPage({ browser, base, viewport: viewportOf, errors });
    try {
      await demo(page, 'configureFontSlices', { language });
      // The slices are held back until the page has been looked at with the text still in boxes; the manifest and the index are not.
      let release = () => {};
      const gate = new Promise((done) => { release = done; });
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const held = new URL(request.url()).pathname.endsWith('.woff2');
        (held ? gate : Promise.resolve()).then(() => request.continue()).catch(() => {});
      });
      await sample(page, id);
      await settle(page);
      const wanted = expectedSlices(build, text, language);
      const before = await godotRaster(page);
      const plainBefore = await textFacts(page, 'fs-plain');
      const dpr = before.width / viewportOf.width;
      const waiting = (await demo(page, 'fontSlices')).status;
      check(`${label}: the slices are on their way and the text is still boxes (${waiting.slicesLoading} loading, ${waiting.slicesLoaded.length} added)`, waiting.slicesLoading === wanted.slices.length && waiting.slicesLoaded.length === 0, waiting);
      release();
      await page.evaluate(() => globalThis.godotReactDemo.fontSlicesIdle());
      await settle(page);
      const status = await demo(page, 'fontSlices');
      const sets = fetchedSets(fetched);
      const after = await godotRaster(page);
      const plain = await textFacts(page, 'fs-plain');
      const spans = await textFacts(page, 'fs-spans');
      const chromeSlices = [...build.indexes.values()].flatMap(index => index.slices).filter(slice => wanted.slices.includes(slice.path));
      const reference = await chromeRaster({ browser, base, viewport: viewportOf, rect: plain.rect, pieces: [[text, '']], slices: chromeSlices });
      const referenceSpans = await chromeRaster({ browser, base, viewport: viewportOf, rect: spans.rect, pieces, slices: chromeSlices });

      check(`${label}: what the page fetched is the manifest, the ${wanted.families.join(', ')} index and exactly the ${wanted.slices.length} slices that hold the text`,
        sets.manifest === 1 && JSON.stringify(sets.indexes) === JSON.stringify(wanted.families) && JSON.stringify(sets.slices) === JSON.stringify(wanted.slices) && sets.failed.length === 0,
        { fetched: sets, expected: wanted });
      check(`${label}: the loader counted the bytes the network carried (${sets.bytes})`, status.status.bytesFetched === sets.bytes && status.status.slicesFailed.length === 0 && status.status.failures.length === 0, { counted: status.status.bytesFetched, network: sets.bytes });
      const plainShot = compare(after, reference.image, plain.rect, dpr);
      const spansShot = compare(after, referenceSpans.image, spans.rect, dpr);
      const boxes = compare(before, reference.image, plain.rect, dpr);
      const redShot = compare(after, referenceSpans.image, spans.rect, dpr, redInkOf);
      metrics[label] = { plain: plainShot, spans: spansShot, red: redShot, boxes, fetched: sets, widthBefore: plainBefore.width, width: plain.width, chromeWidth: reference.width, addMilliseconds: status.status.addMilliseconds };
      check(`${label}: the plain text is glyphs, as Chrome draws them from the same slices (${describeComparison(plainShot)})`, isGlyphs(plainShot, minimum), plainShot);
      check(`${label}: the coloured span is glyphs too (${describeComparison(spansShot)})`, isGlyphs(spansShot, minimum), spansShot);
      check(`${label}: the span's own colour is drawn where Chrome draws it (red ink correlation ${redShot.correlation})`, redShot.correlation >= minimum && redShot.ink > 0, redShot);
      check(`${label}: before the fonts arrived the same text was boxes, not glyphs (control: the ink check fails on it, correlation ${boxes.correlation})`, boxes.correlation <= MAXIMUM_BOX_CORRELATION && !isGlyphs(boxes), boxes);
      if (id === 'simplified') {
        // Text that names no family is drawn with the root's theme font, which the root does not touch (it is the engine's, shared with every control): it has the fonts added behind it in a variation.
        const theme = await textFacts(page, 'fs-theme');
        const referenceTheme = await chromeRaster({ browser, base, viewport: viewportOf, rect: theme.rect, pieces: [[text, '']], slices: chromeSlices });
        const themeShot = compare(after, referenceTheme.image, theme.rect, dpr);
        metrics[`${label} theme font`] = themeShot;
        check(`${label}: text with no font family, in the theme font, is glyphs too (${describeComparison(themeShot)})`, isGlyphs(themeShot, minimum), themeShot);
      }
      check(`${label}: the text is laid out to Chrome's width (${plain.width.toFixed(1)} px of glyphs, Chrome ${reference.width.toFixed(1)}, ${plainBefore.width.toFixed(1)} px of boxes)`,
        Math.abs(plain.width - reference.width) <= widthTolerance, { before: plainBefore.width, after: plain.width, chrome: reference.width });
      // A hex box of four digits is about as wide as an ideograph, so a line of Chinese does not move when its glyphs arrive; a line with kana, Hangul or emoji does.
      if (emoji || widthChanges) check(`${label}: the line was laid out again when the glyphs replaced the boxes`, Math.abs(plainBefore.width - plain.width) > 1, { before: plainBefore.width, after: plain.width });
      check(`${label}: no batch of fonts took the page's thread longer than ${ADD_BUDGET_MS} ms (${status.status.addMilliseconds.map(value => value.toFixed(1)).join(', ')})`, status.status.addMilliseconds.every(value => value <= ADD_BUDGET_MS), status.status.addMilliseconds);
      // The same text shown again fetches nothing and is not boxes again.
      const requests = fetched.length;
      await sample(page, 'latin');
      await settle(page);
      await sample(page, id);
      await settle(page);
      await page.evaluate(() => globalThis.godotReactDemo.fontSlicesIdle());
      check(`${label}: showing the text again fetches nothing more`, fetched.length === requests, { before: requests, after: fetched.length });
      check(`${label}: the page logged no Font slices error`, !logs.some(entry => entry.type === 'error' && entry.text.includes('Font slices')), logs.filter(entry => entry.text.includes('Font slices')));
    } finally {
      await page.close();
    }
  }

  // A page with nothing to download fetches nothing, and is not asked about the manifest.
  {
    const { page, fetched } = await openPage({ browser, base, viewport: { ...viewport, deviceScaleFactor: 1 }, errors });
    try {
      for (const id of ['latin']) {
        await sample(page, id);
        await settle(page);
      }
      await page.evaluate(() => globalThis.godotReactDemo.fontSlicesIdle());
      const view = await demo(page, 'fontSlices');
      const status = view.status;
      check('a page whose text every registered font has fetches nothing: no manifest, no index, no slice', view.installed === true && fetched.length === 0 && status.requests === 0 && status.manifest === 'unrequested', { fetched, view });
    } finally {
      await page.close();
    }
  }

  for (const id of ['simplified', 'traditional', 'japanese', 'korean', 'emoji-only']) await textGroup(id, 1);
  for (const id of ['simplified', 'japanese', 'emoji-only']) await textGroup(id, 2);

  // A slice that cannot be fetched, a manifest that cannot, a request that is dropped: the text stays boxes and the failure is reported, once, with what failed.
  const ratio1 = { ...viewport, deviceScaleFactor: 1 };
  {
    const { language, text } = SAMPLE_TEXTS.simplified;
    const wanted = expectedSlices(build, text, language);
    const blocked = wanted.slices[0];
    const { page, logs } = await openPage({ browser, base, viewport: ratio1, errors, ignoring: [/Failed to load resource/u, /Font slices/u] });
    try {
      await demo(page, 'configureFontSlices', { language });
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.pathname === `/o/${blocked}`) {
          request.respond({ status: 404, contentType: 'text/plain', body: 'Not found', headers: { 'Cross-Origin-Resource-Policy': 'same-origin' } });
        } else {
          request.continue().catch(() => {});
        }
      });
      await sample(page, 'simplified');
      await page.evaluate(() => globalThis.godotReactDemo.fontSlicesIdle());
      await settle(page);
      const status = (await demo(page, 'fontSlices')).status;
      const failure = status.failures.find(candidate => candidate.kind === 'slice');
      check('a slice that cannot be fetched is reported with its address and the characters it leaves as boxes', failure !== undefined && failure.url.endsWith(blocked) && failure.codepoints.length > 0 && failure.message.includes('404'), status.failures);
      check('the slices that could be fetched were added, and the missing one is the only failure', status.slicesLoaded.length === wanted.slices.length - 1 && status.slicesFailed.length === 1 && status.failures.length === 1, { loaded: status.slicesLoaded.length, failed: status.slicesFailed });
      check('the failure was written to the console as an error, once', logs.filter(entry => entry.type === 'error' && entry.text.startsWith('Font slices:')).length === 1, logs.filter(entry => entry.text.includes('Font slices')));
      const partial = await godotRaster(page);
      const plain = await textFacts(page, 'fs-plain');
      const chromeSlices = [...build.indexes.values()].flatMap(index => index.slices).filter(slice => wanted.slices.includes(slice.path));
      const reference = await chromeRaster({ browser, base, viewport: ratio1, rect: plain.rect, pieces: [[text, '']], slices: chromeSlices });
      const shot = compare(partial, reference.image, plain.rect, 1);
      check(`with one slice missing the text is neither all glyphs nor all boxes (${describeComparison(shot)}): the characters of the slice that failed are still boxes`, !isGlyphs(shot) && shot.correlation > MAXIMUM_BOX_CORRELATION, { shot, width: plain.width, chrome: reference.width });
    } finally {
      await page.close();
    }
  }
  for (const mode of ['404', 'dropped']) {
    const { language, text } = SAMPLE_TEXTS.simplified;
    const { page, fetched, logs } = await openPage({ browser, base, viewport: ratio1, errors, ignoring: [/Failed to load resource/u, /Font slices/u] });
    try {
      await demo(page, 'configureFontSlices', { language });
      await sample(page, 'latin');
      await settle(page);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.endsWith('/font-slices.json')) {
          if (mode === '404') request.respond({ status: 404, contentType: 'text/plain', body: 'Not found', headers: { 'Cross-Origin-Resource-Policy': 'same-origin' } });
          else request.abort('failed');
        } else {
          request.continue().catch(() => {});
        }
      });
      await sample(page, 'simplified');
      await page.evaluate(() => globalThis.godotReactDemo.fontSlicesIdle());
      await settle(page);
      const status = (await demo(page, 'fontSlices')).status;
      const plain = await textFacts(page, 'fs-plain');
      const raster = await godotRaster(page);
      const chromeSlices = [...build.indexes.values()].flatMap(index => index.slices).filter(slice => expectedSlices(build, text, language).slices.includes(slice.path));
      const reference = await chromeRaster({ browser, base, viewport: ratio1, rect: plain.rect, pieces: [[text, '']], slices: chromeSlices });
      const shot = compare(raster, reference.image, plain.rect, 1);
      check(`a manifest that ${mode === '404' ? 'is not there (404)' : 'cannot be fetched (the request is dropped)'} is reported as a manifest failure and nothing else is fetched`,
        status.manifest === 'failed' && status.failures.length === 1 && status.failures[0].kind === 'manifest' && status.slicesLoaded.length === 0 && fetchedSets(fetched).slices.length === 0, status);
      check(`and the text stays boxes (correlation with Chrome's glyphs ${shot.correlation})`, shot.correlation <= MAXIMUM_BOX_CORRELATION, shot);
      check(`and it is written to the console as an error`, logs.some(entry => entry.type === 'error' && /Font slices: the font slice manifest/u.test(entry.text)), logs.filter(entry => entry.text.includes('Font slices')));
    } finally {
      await page.close();
    }
  }

  // The negative control: with the loader taken away nothing is fetched and the text is boxes.
  {
    const { language, text } = SAMPLE_TEXTS.simplified;
    const { page, fetched } = await openPage({ browser, base, viewport: ratio1, errors });
    try {
      await demo(page, 'configureFontSlices', null);
      await sample(page, 'simplified');
      await settle(page);
      await page.evaluate(() => globalThis.godotReactDemo.fontSlicesIdle());
      await settle(page);
      const view = await demo(page, 'fontSlices');
      const plain = await textFacts(page, 'fs-plain');
      const raster = await godotRaster(page);
      const chromeSlices = [...build.indexes.values()].flatMap(index => index.slices).filter(slice => expectedSlices(build, text, language).slices.includes(slice.path));
      const reference = await chromeRaster({ browser, base, viewport: ratio1, rect: plain.rect, pieces: [[text, '']], slices: chromeSlices });
      const shot = compare(raster, reference.image, plain.rect, 1);
      check(`control: with no loader installed nothing is fetched and the text stays boxes (correlation ${shot.correlation})`, view.installed === false && fetched.length === 0 && shot.correlation <= MAXIMUM_BOX_CORRELATION, { view, fetched, shot });
    } finally {
      await page.close();
    }
  }

  // Frames keep their cadence while a slice loads on a slow line.
  {
    const { page, fetched } = await openPage({ browser, base, viewport: ratio1, errors });
    try {
      await demo(page, 'configureFontSlices', { language: 'ko' });
      const session = await page.createCDPSession();
      await session.send('Network.enable');
      await session.send('Network.emulateNetworkConditions', { offline: false, ...SLOW_LINE });
      await page.evaluate(() => {
        const state = { stamps: [], running: true, mark: 0 };
        globalThis.godotReactFrames = state;
        const tick = (stamp) => { state.stamps.push(stamp); if (state.running) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
      const markedAt = await page.evaluate(() => { globalThis.godotReactFrames.mark = performance.now(); return globalThis.godotReactFrames.mark; });
      const startedAt = Date.now();
      await sample(page, 'korean');
      await page.evaluate(() => globalThis.godotReactDemo.fontSlicesIdle());
      const loadMs = Date.now() - startedAt;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
      const stamps = await page.evaluate(() => { globalThis.godotReactFrames.running = false; return globalThis.godotReactFrames.stamps; });
      const intervals = (from, to) => stamps.slice(1).map((stamp, index) => ({ at: stamp, gap: stamp - (stamps[index] ?? stamp) })).filter(entry => entry.at >= from && entry.at < to).map(entry => entry.gap);
      const quiet = intervals(0, markedAt);
      const loading = intervals(markedAt, Infinity);
      const stats = (gaps) => ({ frames: gaps.length, mean: gaps.reduce((a, b) => a + b, 0) / (gaps.length || 1), max: Math.max(0, ...gaps) });
      const quietStats = stats(quiet);
      const loadStats = stats(loading);
      const status = (await demo(page, 'fontSlices')).status;
      metrics.frames = { quiet: quietStats, loading: loadStats, loadMs, addMilliseconds: status.addMilliseconds, fetched: fetchedSets(fetched).slices.length };
      check(`a slow line makes the load last (${loadMs} ms for ${fetchedSets(fetched).slices.length} slices), so the frames are measured while it runs`, loadMs >= 400 && status.slicesLoaded.length > 0, { loadMs, status });
      check(`frames kept their cadence while the fonts loaded: the longest gap was ${loadStats.max.toFixed(1)} ms over ${loadStats.frames} frames, against ${quietStats.max.toFixed(1)} ms over ${quietStats.frames} frames before (allowance ${FRAME_ALLOWANCE_MS} ms)`,
        loadStats.frames > 0 && quietStats.frames > 0 && loadStats.max <= quietStats.max + FRAME_ALLOWANCE_MS, metrics.frames);
    } finally {
      await page.close();
    }
  }

  check('no page of this section logged an error the section did not expect', errors.length === 0, errors);
  return metrics;
}
