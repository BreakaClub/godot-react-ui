import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';
import { startVerificationServer } from './web-verify.mjs';

// Captures every lab of the navigator, whole, as a person sees it on a phone and on a desktop, in headless
// Chrome through puppeteer-core (the DevTools protocol: no OS input, no focus). Each lab is scrolled through its content area one screen at a
// time and the screens are laid together, so a lab longer than the window is one image. Window labs are shown in their window, and the scene
// lab by its launch card and then the scene.
//
//   node scripts/lab-captures.mjs capture --out=<directory> [--lab=<id>,<id>] [--factor=phone,desktop]
//       writes <directory>/<lab>-<factor>.json and the screens as <lab>-<factor>-<n>.png, at the device's own pixel ratio, from the export
//       of the engine profile (the debug export the Web verifiers use; `pnpm build:web --export-only` makes it)
//   node scripts/lab-captures.mjs sheets --out=<directory> [--lab=...] [--factor=...] [--scale=<n>] [--columns=<n>]
//       lays each lab's screens out as a sheet <directory>/sheets/<lab>-<factor>.png: one column per window height of the lab
//   node scripts/lab-captures.mjs compare --before=<directory> --after=<directory> --out=<directory> [--lab=...] [--factor=...] [--scale=<n>]
//       the same sheets of two captures side by side, the before on the left, into <out>/<lab>-<factor>.png

const COMMANDS = ['capture', 'sheets', 'compare'];
const command = COMMANDS.includes(process.argv[2]) ? process.argv[2] : undefined;
rejectUnknownArguments(process.argv.slice(command === undefined ? 2 : 3), { prefixes: ['--out=', '--lab=', '--factor=', '--scale=', '--columns=', '--before=', '--after='] });
if (command === undefined) throw new Error(`The first argument is one of ${COMMANDS.join(', ')}, not ${process.argv[2]}`);

const argumentValue = (name) => process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
const list = (name) => argumentValue(name)?.split(',').filter((entry) => entry !== '');

/** Chrome's mobile emulation of an Android phone (412 x 915 CSS pixels at a pixel ratio of 2.625), and a laptop browser window. */
const FACTORS = {
  phone: { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
};
const PORTRAIT = { type: 'portraitPrimary', angle: 0 };
const STARTUP_TIMEOUT_MS = 180_000;
const SETTLE_DEADLINE_MS = 5_000;
const POLL_MS = 50;
const SETTLE_FRAMES = 8;
const SHEET_GAP = 16;
const SHEET_BACKGROUND = '#cbd5e1';
const DEFAULT_COLUMNS = { phone: 4, desktop: 2 };
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';

const factorNames = list('factor') ?? Object.keys(FACTORS);
for (const name of factorNames) if (FACTORS[name] === undefined) throw new Error(`Unknown factor ${name}; the factors are ${Object.keys(FACTORS).join(', ')}`);
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function outputDirectory(name = 'out') {
  const value = argumentValue(name);
  if (value === undefined) throw new Error(`--${name}=<directory> is required`);
  const directory = resolve(process.cwd(), value);
  mkdirSync(directory, { recursive: true });
  return directory;
}

/** The labs in the navigator's order: asked of the demo itself, so the captures follow the registry. */
async function listLabs(page) {
  const labs = await page.evaluate(() => globalThis.godotReactDemo.labs());
  const wanted = list('lab');
  if (wanted === undefined) return labs;
  for (const id of wanted) if (!labs.some((lab) => lab.id === id)) throw new Error(`There is no lab ${id}; the labs are ${labs.map((lab) => lab.id).join(', ')}`);
  return labs.filter((lab) => wanted.includes(lab.id));
}

async function openPage(browser, address, factor, errors) {
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: factor.mobile, maxTouchPoints: factor.mobile ? 5 : 1 });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: factor.width, height: factor.height, deviceScaleFactor: factor.deviceScaleFactor, mobile: factor.mobile,
    screenWidth: factor.width, screenHeight: factor.height, screenOrientation: PORTRAIT,
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes(EMSCRIPTEN_STARTUP_DIAGNOSTIC)) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(address, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!(await page.evaluate(() => typeof globalThis.godotReactDemo?.snapshot === 'function'))) {
    if (Date.now() > deadline) throw new Error(`${address} did not start: ${errors.join('; ') || 'timed out'}`);
    await sleep(POLL_MS);
  }
  return { page, cdp };
}

const frames = (page, count = SETTLE_FRAMES) => page.evaluate((total) => new Promise((resolvePromise) => {
  let left = total;
  const next = () => (left -= 1) <= 0 ? resolvePromise() : requestAnimationFrame(next);
  requestAnimationFrame(next);
}), count);

/** Wait for the root to stop asking for frames, within a deadline: a lab that animates for ever (a loop) is captured as it is. */
async function settle(page) {
  await frames(page);
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (await page.evaluate(() => globalThis.godotReactDemo.surfaceProcessing()) && Date.now() < deadline) {
    await sleep(POLL_MS);
  }
  await frames(page);
}

const found = (page, testID) => page.evaluate((id) => {
  const node = globalThis.godotReactDemo.find(id);
  return node === undefined ? null : { rect: node.rect, scroll: node.scroll };
}, testID);

/** The viewport as the protocol sees it: the page's own screenshot is of the size puppeteer last set, not the emulated device's. */
async function screenshot(cdp, file) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(data, 'base64'));
}

async function tap(page, factor, rect) {
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  if (factor.mobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** Scroll the lab's content area through its height and save a screen at each stop: `{ stageTop, clientHeight, scrollHeight, tiles: [{ file, offset }] }`. */
async function captureScrolled(page, cdp, directory, stem) {
  const stage = await found(page, 'lab-scroll');
  if (stage === null) {
    await screenshot(cdp, resolve(directory, `${stem}-1.png`));
    return { stageTop: 0, stageHeight: 0, clientHeight: 0, scrollHeight: 0, tiles: [{ file: `${stem}-1.png`, offset: 0 }] };
  }
  const { clientHeight, scrollHeight } = stage.scroll;
  const last = Math.max(0, scrollHeight - clientHeight);
  const offsets = [];
  for (let offset = 0; offset < last; offset += clientHeight) offsets.push(offset);
  offsets.push(last);
  const tiles = [];
  for (const [index, offset] of offsets.entries()) {
    await page.evaluate((top) => globalThis.godotReactDemo.scrollTo('lab-scroll', top), offset);
    await frames(page, 4);
    const actual = (await found(page, 'lab-scroll')).scroll.scrollTop;
    const file = `${stem}-${index + 1}.png`;
    await screenshot(cdp, resolve(directory, file));
    tiles.push({ file, offset: actual });
  }
  return { stageTop: stage.rect.y, stageHeight: stage.rect.height, clientHeight, scrollHeight, tiles };
}

async function captureFactor(browser, base, factorName, labsWanted, directory, errors) {
  const factor = FACTORS[factorName];
  const address = new URL('/?demo=navigator', base).href;
  const { page, cdp } = await openPage(browser, address, factor, errors);
  const labs = labsWanted ?? await listLabs(page);
  for (const lab of labs) {
    const stem = `${lab.id}-${factorName}`;
    await page.evaluate((id) => globalThis.godotReactDemo.showNavigator({ initialLab: id }), lab.id);
    await settle(page);
    const record = { lab: lab.id, title: lab.title, kind: lab.kind, factor: factorName, viewport: factor, screens: [] };
    record.card = await captureScrolled(page, cdp, directory, stem);
    if (lab.kind === 'window') {
      // The launch card gives the lab the whole window: show the lab, then give the window back with Escape.
      const open = await found(page, 'lab-launch-open');
      await page.evaluate(() => globalThis.godotReactDemo.scrollTo('lab-scroll', 0));
      await tap(page, factor, (await found(page, 'lab-launch-open')).rect);
      await settle(page);
      await screenshot(cdp, resolve(directory, `${stem}-window.png`));
      record.window = { file: `${stem}-window.png`, openRect: open.rect };
      await page.keyboard.press('Escape');
      await settle(page);
    }
    writeFileSync(resolve(directory, `${stem}.json`), JSON.stringify(record, null, 2) + '\n');
    console.log(`${stem}: ${record.card.tiles.length} screen(s)${record.window === undefined ? '' : ' and the window'}`);
  }
  await page.close();
  if (labsWanted === undefined && labs.some((lab) => lab.kind === 'scene')) {
    for (const lab of labs.filter((candidate) => candidate.kind === 'scene')) await captureScene(browser, base, factorName, lab, directory, errors);
  }
  return labs;
}

/** A scene lab is its own Godot scene: open its card in a page of its own, press the card's button and capture the scene that replaces the navigator. */
async function captureScene(browser, base, factorName, lab, directory, errors) {
  const factor = FACTORS[factorName];
  const { page, cdp } = await openPage(browser, new URL(`/?lab=${lab.id}`, base).href, factor, errors);
  await settle(page);
  const open = await found(page, 'lab-launch-open');
  await tap(page, factor, open.rect);
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!(await page.evaluate(() => typeof globalThis.godotReactWorld?.snapshot === 'function' && globalThis.godotReactDemo === undefined))) {
    if (Date.now() > deadline) throw new Error(`The ${lab.id} scene did not open: ${errors.join('; ') || 'timed out'}`);
    await sleep(POLL_MS);
  }
  await frames(page, 30);
  const file = `${lab.id}-${factorName}-scene.png`;
  await screenshot(cdp, resolve(directory, file));
  const record = JSON.parse(readFileSync(resolve(directory, `${lab.id}-${factorName}.json`), 'utf8'));
  record.scene = { file };
  writeFileSync(resolve(directory, `${lab.id}-${factorName}.json`), JSON.stringify(record, null, 2) + '\n');
  console.log(`${lab.id}-${factorName}: the scene`);
  await page.close();
}

async function runCapture() {
  const directory = outputDirectory();
  const engine = selectEngine();
  engine.requireFreshWebExport();
  const server = await startVerificationServer(engine);
  const errors = [];
  const browser = await puppeteer.launch({
    executablePath, headless: true,
    args: ['--no-first-run', '--no-default-browser-check', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  try {
    for (const factorName of factorNames) await captureFactor(browser, server.url, factorName, undefined, directory, errors);
    if (errors.length > 0) console.warn(`The pages logged ${errors.length} console error(s): ${errors.slice(0, 5).join(' | ')}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

// ---- Sheets -------------------------------------------------------------------------------------------------------------------------------------

/**
 * The HTML of one lab's sheet: the lab's content laid out whole, then cut into columns one window high. A screen is placed by its scroll offset
 * (the lab's content area starts `stageTop` down the window), later screens over earlier ones where they overlap.
 */
function sheetHtml(directory, record, scale, columns) {
  const { viewport, card } = record;
  const wholeHeight = card.clientHeight === 0 ? viewport.height : card.stageTop + card.scrollHeight;
  const pageHeight = viewport.height;
  const pageCount = Math.max(1, Math.ceil(wholeHeight / pageHeight));
  const pages = [];
  for (let index = 0; index < pageCount; index += 1) {
    const top = index * pageHeight;
    const height = Math.min(pageHeight, wholeHeight - top);
    const pieces = [];
    if (card.clientHeight === 0) {
      pieces.push(`<img src="${pathToFileURL(resolve(directory, card.tiles[0].file)).href}" style="position:absolute;left:0;top:0;width:${viewport.width * scale}px">`);
    } else {
      const header = card.tiles[0];
      pieces.push(`<div style="position:absolute;left:0;top:0;width:${viewport.width * scale}px;height:${card.stageTop * scale}px;overflow:hidden"><img src="${pathToFileURL(resolve(directory, header.file)).href}" style="width:${viewport.width * scale}px"></div>`);
      for (const tile of card.tiles) {
        const y = (card.stageTop + tile.offset - top) * scale;
        pieces.push(`<div style="position:absolute;left:0;top:${y}px;width:${viewport.width * scale}px;height:${card.clientHeight * scale}px;overflow:hidden"><img src="${pathToFileURL(resolve(directory, tile.file)).href}" style="display:block;margin-top:${-card.stageTop * scale}px;width:${viewport.width * scale}px"></div>`);
      }
    }
    pages.push(`<div class="page" style="width:${viewport.width * scale}px;height:${height * scale}px">${pieces.join('')}</div>`);
  }
  const extras = [];
  if (record.window !== undefined) extras.push(`<div class="page" style="width:${viewport.width * scale}px;height:${viewport.height * scale}px"><img src="${pathToFileURL(resolve(directory, record.window.file)).href}" style="width:${viewport.width * scale}px"></div>`);
  if (record.scene !== undefined) extras.push(`<div class="page" style="width:${viewport.width * scale}px;height:${viewport.height * scale}px"><img src="${pathToFileURL(resolve(directory, record.scene.file)).href}" style="width:${viewport.width * scale}px"></div>`);
  const all = [...pages, ...extras];
  const width = Math.min(columns, all.length) * (viewport.width * scale + SHEET_GAP) - SHEET_GAP;
  return { width, html: `<div class="grid" style="width:${width}px">${all.join('')}</div>` };
}

const SHEET_STYLE = `
  body { margin: 0; background: ${SHEET_BACKGROUND}; font: 13px system-ui, sans-serif; color: #0f172a; }
  .wrap { display: flex; gap: 24px; align-items: flex-start; padding: ${SHEET_GAP}px; }
  .side h2 { margin: 0 0 8px; font-size: 14px; font-weight: 600; }
  .grid { display: flex; flex-wrap: wrap; gap: ${SHEET_GAP}px; align-items: flex-start; }
  .page { position: relative; overflow: hidden; background: #fff; flex: none; }
  img { display: block; }
`;

async function writeSheet(browser, file, sides) {
  const page = await browser.newPage();
  const body = sides.map((side) => `<div class="side"><h2>${side.title}</h2>${side.html}</div>`).join('');
  const width = sides.reduce((total, side) => total + side.width + 24, SHEET_GAP * 2);
  await page.setViewport({ width: Math.ceil(width), height: 400, deviceScaleFactor: 1 });
  const html = `<!doctype html><meta charset="utf-8"><style>${SHEET_STYLE}</style><div class="wrap">${body}</div>`;
  const pagePath = resolve(file, '..', '.sheet.html');
  writeFileSync(pagePath, html);
  await page.goto(pathToFileURL(pagePath).href, { waitUntil: 'load' });
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  rmSync(pagePath);
}

function recordsOf(directory) {
  const wanted = list('lab');
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json') && factorNames.some((factor) => name.endsWith(`-${factor}.json`)))
    .map((name) => JSON.parse(readFileSync(resolve(directory, name), 'utf8')))
    .filter((record) => wanted === undefined || wanted.includes(record.lab));
}

async function runSheets() {
  const directory = outputDirectory();
  const sheets = resolve(directory, 'sheets');
  mkdirSync(sheets, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  try {
    for (const record of recordsOf(directory)) {
      const scale = Number(argumentValue('scale') ?? 1);
      const columns = Number(argumentValue('columns') ?? DEFAULT_COLUMNS[record.factor]);
      const side = sheetHtml(directory, record, scale, columns);
      await writeSheet(browser, resolve(sheets, `${record.lab}-${record.factor}.png`), [{ title: `${record.lab} (${record.factor})`, ...side }]);
      console.log(`Wrote ${resolve(sheets, `${record.lab}-${record.factor}.png`)}`);
    }
  } finally {
    await browser.close();
  }
}

async function runCompare() {
  const before = outputDirectory('before');
  const after = outputDirectory('after');
  const out = outputDirectory();
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  try {
    for (const record of recordsOf(after)) {
      const beforePath = resolve(before, `${record.lab}-${record.factor}.json`);
      if (!existsSync(beforePath)) continue;
      const previous = JSON.parse(readFileSync(beforePath, 'utf8'));
      const scale = Number(argumentValue('scale') ?? 1);
      const columns = Number(argumentValue('columns') ?? (record.factor === 'phone' ? 3 : 1));
      const left = sheetHtml(before, previous, scale, columns);
      const right = sheetHtml(after, record, scale, columns);
      const file = resolve(out, `${record.lab}-${record.factor}.png`);
      await writeSheet(browser, file, [{ title: `before: ${record.lab} (${record.factor})`, ...left }, { title: `after: ${record.lab} (${record.factor})`, ...right }]);
      console.log(`Wrote ${file}`);
    }
  } finally {
    await browser.close();
  }
}

if (command === 'capture') await runCapture();
else if (command === 'sheets') await runSheets();
else await runCompare();
