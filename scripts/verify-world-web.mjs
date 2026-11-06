// Real-Chrome verification of the world-space panel (plan I11, docs/WORLD_SPACE.md): the 3D scene, the
// SubViewport's React root and the ray-plane input routing, driven by the browser's own mouse, keyboard and
// touch input at both device pixel ratios, landscape and portrait. The scenarios mirror
// demo/src/verify-world.ts; the world scene is selected with `?scene=res://world.tscn` (demo/web-shell.html).
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { selectEngine } from './engine.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engine = selectEngine();
// Refuse an export whose side module was built from other sources than the working tree (docs/tracks/freshness.md).
engine.requireFreshWebExport();
const base = process.env.GODOT_REACT_WEB_URL ?? 'http://127.0.0.1:8096';
const url = new URL('/?scene=res://world.tscn', base).href;
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = engine.artifactPath('web-world-verification');
const STARTUP_TIMEOUT_MS = 180_000;
const ACTION_TIMEOUT_MS = 15_000;
const TOTAL_TIMEOUT_MS = 480_000;
const POLL_MS = 50;
const DRAG_MOVE_STEPS = 8;
/** A projected point may be off the exact pixel by this much in the panel (browser float rounding). */
const ROUND_TRIP_TOLERANCE_PX = 0.05;
/** A screenshot pixel may differ from the style's colour by this much per channel (8-bit rounding, compositing). */
const COLOR_TOLERANCE = 3;
/** A point in the window's corner that no part of the quad covers, in CSS pixels. */
const OFF_QUAD = { x: 8, y: 8 };
const BOX_INSET_PX = 8;
/** The panel's styles as the native snapshot reports them (indigo-600/-700/-800, slate-100). */
const PRIMARY_REST = '#4f46e5';
const PRIMARY_HOVER = '#4338ca';
const PRIMARY_ACTIVE = '#3730a3';
const SECONDARY_HOVER = '#f1f5f9';
const BACKDROP_HEX = '#cbd5e1';
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';
const viewports = [
  { name: 'landscape', width: 1120, height: 800, deviceScaleFactor: 1 },
  { name: 'retina-portrait', width: 600, height: 900, deviceScaleFactor: 2 },
];

const report = {
  url, executablePath, startedAt: new Date().toISOString(),
  assertions: [], captures: [], console: [], pageErrors: [], failedRequests: [], expectedDiagnostics: [],
  passed: false,
};
await mkdir(output, { recursive: true });
let browser;
let page;
let activeViewport = 'startup';
const fatalErrors = [];

function check(name, condition, detail) {
  report.assertions.push({ viewport: activeViewport, name, passed: Boolean(condition), detail });
  assert.ok(condition, `${activeViewport}: ${name}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
}

function checkBrowserErrors() {
  assert.equal(fatalErrors.length, 0, `Browser/runtime errors:\n${fatalErrors.join('\n')}`);
}

async function withDeadline(promise, timeout, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeout} ms`)), timeout); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function waitUntil(name, predicate, timeout = ACTION_TIMEOUT_MS) {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    checkBrowserErrors();
    assert.ok(Date.now() < deadline, `${activeViewport}: timed out waiting for ${name}`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  checkBrowserErrors();
}

async function frames() {
  await withDeadline(page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  })), ACTION_TIMEOUT_MS, 'Waiting for browser paint');
  checkBrowserErrors();
}

const world = (method, ...args) => page.evaluate((name, values) => globalThis.godotReactWorld[name](...values), method, args);
const snapshot = () => world('snapshot');
const counts = () => world('counts');

async function find(testID) {
  const found = await world('find', testID);
  assert.ok(found, `Missing native test target ${testID}`);
  return found;
}

function collectText(data, entry) {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const collect = (node) => node.text + node.children.map((id) => collect(byId.get(id))).join('');
  return collect(entry);
}

async function text(testID) {
  const [data, entry] = await Promise.all([snapshot(), find(testID)]);
  return collectText(data, entry);
}

async function expectText(testID, expected, name = `${testID} reads ${expected}`) {
  await waitUntil(name, async () => await text(testID) === expected);
  check(name, true, { testID, expected });
}

/** Whether `node` is the element `testID` or inside it: hover reports the deepest element, a button's label. */
async function isWithin(nodeId, testID) {
  if (nodeId === null) return false;
  const [data, entry] = await Promise.all([snapshot(), find(testID)]);
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  for (let current = nodeId; current !== null && current !== undefined; current = byId.get(current)?.parent) {
    if (current === entry.id) return true;
  }
  return false;
}

/** The browser's page coordinates for a point in the main viewport's logical space. */
async function pagePoint(screen) {
  const [canvas, logical] = await Promise.all([
    page.evaluate(() => {
      const rect = document.querySelector('canvas')?.getBoundingClientRect();
      if (!rect) throw new Error('Godot canvas is absent');
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
    world('viewportSize'),
  ]);
  return { x: canvas.x + screen.x * canvas.width / logical.x, y: canvas.y + screen.y * canvas.height / logical.y };
}

/** Where an element's centre (or its inset corner) is drawn, in page coordinates: the point a user would click. */
async function elementPoint(testID, inset) {
  const entry = await find(testID);
  const panel = inset ? { x: entry.rect.x + BOX_INSET_PX, y: entry.rect.y + BOX_INSET_PX }
    : { x: entry.rect.x + entry.rect.width / 2, y: entry.rect.y + entry.rect.height / 2 };
  const screen = await world('screenPointOf', panel.x, panel.y);
  const point = await pagePoint(screen);
  const viewport = page.viewport();
  assert.ok(point.x >= 0 && point.y >= 0 && point.x < viewport.width && point.y < viewport.height,
    `${testID} is drawn outside the browser viewport: ${JSON.stringify(point)}`);
  return point;
}

async function moveTo(point) {
  await page.mouse.move(point.x, point.y);
  await frames();
}

async function click(point) {
  await moveTo(point);
  await page.mouse.down();
  await frames();
  await page.mouse.up();
  await frames();
}

function parseHex(hex) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

/** The browser-composited colour at a page point, by decoding a screenshot of the canvas in the page. */
async function canvasPixel(point) {
  const canvas = await page.$('canvas');
  assert.ok(canvas, 'Godot canvas vanished');
  const png = await canvas.screenshot({ type: 'png', encoding: 'base64', timeout: ACTION_TIMEOUT_MS });
  await canvas.dispose();
  return page.evaluate(async (base64, x, y) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const surface = document.createElement('canvas');
    surface.width = image.width;
    surface.height = image.height;
    const context = surface.getContext('2d');
    context.drawImage(image, 0, 0);
    // The screenshot is in device pixels; the point is in CSS pixels of the page.
    const rect = document.querySelector('canvas').getBoundingClientRect();
    const scale = image.width / rect.width;
    return Array.from(context.getImageData(Math.round((x - rect.x) * scale), Math.round((y - rect.y) * scale), 1, 1).data.slice(0, 3));
  }, png, point.x, point.y);
}

async function expectPixel(name, point, hex) {
  const actual = await canvasPixel(point);
  const expected = parseHex(hex);
  check(name, actual.every((channel, index) => Math.abs(channel - expected[index]) <= COLOR_TOLERANCE), { actual, expected: hex });
}

async function capture(name) {
  await frames();
  const data = await snapshot();
  const directory = resolve(output, activeViewport);
  await mkdir(directory, { recursive: true });
  const png = resolve(directory, `${name}.png`);
  await writeFile(resolve(directory, `${name}.json`), JSON.stringify(data, null, 2) + '\n');
  const canvas = await page.$('canvas');
  assert.ok(canvas, 'Godot canvas vanished');
  await canvas.screenshot({ path: png, type: 'png', timeout: ACTION_TIMEOUT_MS });
  await canvas.dispose();
  report.captures.push({ viewport: activeViewport, name, png });
  console.log(`GODOT_REACT_WEB_CAPTURE ${png}`);
}

async function observePage(observedPage) {
  let startupComplete = false;
  let startupDiagnosticSeen = false;
  let packAbortSeen = false;
  observedPage.on('console', (message) => {
    const entry = { type: message.type(), text: message.text(), location: message.location(), viewport: activeViewport };
    report.console.push(entry);
    if (entry.text.includes('GODOT_REACT_WORLD_READY')) startupComplete = true;
    // Emscripten 6.0.12's one startup warning, allowed once before the scene is ready (verify-web.mjs).
    if (entry.text === EMSCRIPTEN_STARTUP_DIAGNOSTIC) {
      if (!startupComplete && !startupDiagnosticSeen) {
        startupDiagnosticSeen = true;
        report.expectedDiagnostics.push({ ...entry, reason: 'Engine dynamic-library startup worker synchronization' });
      } else {
        fatalErrors.push(entry.text);
      }
      return;
    }
    if (message.type() === 'error' && !entry.location.url?.endsWith('/favicon.ico')) {
      fatalErrors.push(entry.text);
    } else if (/(?:^|\n)(?:ERROR:|SCRIPT ERROR:)|GODOT_REACT_(?:VERIFY|START)_FAILED|\[panic |previously notified/.test(entry.text)) {
      fatalErrors.push(entry.text);
    }
  });
  observedPage.on('pageerror', (error) => {
    const detail = error.stack ?? error.message;
    report.pageErrors.push(detail);
    fatalErrors.push(detail);
  });
  observedPage.on('requestfailed', (request) => {
    const failure = { url: request.url(), error: request.failure()?.errorText, viewport: activeViewport };
    report.failedRequests.push(failure);
    if (failure.url.endsWith('/favicon.ico')) return;
    // Chromium aborts index.pck's progress-stream wrapper once after the bytes arrive (verify-web.mjs).
    if (failure.url.endsWith('/index.pck') && failure.error === 'net::ERR_ABORTED' && !startupComplete && !packAbortSeen) {
      packAbortSeen = true;
      return;
    }
    fatalErrors.push(JSON.stringify(failure));
  });
}

async function loadPage(viewport) {
  page = await browser.newPage();
  page.setDefaultTimeout(ACTION_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(STARTUP_TIMEOUT_MS);
  await page.setViewport(viewport);
  await observePage(page);
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  check('World document loaded', response?.ok(), { status: response?.status() });
  check('Browser is cross-origin isolated for WebAssembly threads', await page.evaluate(() => globalThis.crossOriginIsolated === true));
  // Only the world scene defines godotReactWorld, so this proves the exported pack ran world.tscn.
  await waitUntil('the world scene to start', async () => page.evaluate(() => typeof globalThis.godotReactWorld?.snapshot === 'function'), STARTUP_TIMEOUT_MS);
  check('The world scene started in the browser', true);
}

async function runWorkflow(viewport) {
  activeViewport = viewport.name;
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor });
  await waitUntil('logical viewport resize', async () => {
    const logical = await world('viewportSize');
    return logical.x === viewport.width && logical.y === viewport.height;
  });
  const pixelDimensions = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    return { devicePixelRatio, cssWidth: rect.width, cssHeight: rect.height, physicalWidth: canvas.width, physicalHeight: canvas.height };
  });
  check('Logical viewport, CSS size and device-pixel canvas agree', pixelDimensions.devicePixelRatio === viewport.deviceScaleFactor
    && pixelDimensions.cssWidth === viewport.width && pixelDimensions.physicalWidth === viewport.width * viewport.deviceScaleFactor, pixelDimensions);
  await expectText('world-count', '0', 'Initial React state in the world panel');
  // The orbiting node and its anchored label (plan I11) are verified by the native verifier. Here the node waits off to
  // one side of the window, so that neither it nor its label is drawn over the quad whose pixels are read below.
  await world('placeOrbiterInWorld', 6, -3, 0.5);
  await capture('01-world');

  // The ray mapping round-trips at this device pixel ratio.
  for (const target of ['world-card', 'world-increment', 'world-reset']) {
    const entry = await find(target);
    const centre = { x: entry.rect.x + entry.rect.width / 2, y: entry.rect.y + entry.rect.height / 2 };
    const screen = await world('screenPointOf', centre.x, centre.y);
    const back = await world('panelPixelAt', screen.x, screen.y);
    check(`${target} round-trips through the camera`, back?.inside === true
      && Math.abs(back.x - centre.x) <= ROUND_TRIP_TOLERANCE_PX && Math.abs(back.y - centre.y) <= ROUND_TRIP_TOLERANCE_PX, { centre, screen, back });
  }

  // Raster: the browser shows the panel's colours at the projected points, and the backdrop in the margin.
  const add = await elementPoint('world-increment');
  const marginScreen = await world('screenPointOf', 12, 12);
  const margin = await pagePoint(marginScreen);
  await expectPixel('The panel\'s transparent margin shows the backdrop', margin, BACKDROP_HEX);
  await expectPixel('The projected centre of Add is drawn in its rest colour', add, PRIMARY_REST);

  // Hover, leave, hover again.
  await moveTo(add);
  check('Moving onto the projected Add button hovers it', await isWithin((await snapshot()).hovered, 'world-increment'));
  check('Add takes its hover style', (await find('world-increment')).style.backgroundColor === PRIMARY_HOVER);
  await expectPixel('The browser shows the hover colour on the quad', add, PRIMARY_HOVER);
  await capture('02-hover');
  await moveTo(OFF_QUAD);
  check('Moving off the quad clears hover', (await snapshot()).hovered === null);
  check('Add is back to its rest style', (await find('world-increment')).style.backgroundColor === PRIMARY_REST);
  await moveTo(margin);
  check('The see-through margin hovers nothing', (await snapshot()).hovered === null);

  // Press, release.
  await world('resetCounts');
  await moveTo(add);
  await page.mouse.down();
  await frames();
  check('Pressing Add presses it', await isWithin((await snapshot()).pressed, 'world-increment'));
  check('Add takes its active style', (await find('world-increment')).style.backgroundColor === PRIMARY_ACTIVE);
  await capture('03-pressed');
  await page.mouse.up();
  await expectText('world-count', '1', 'A real browser click on the projected Add button increments the counter');
  check('A click the panel consumed never reaches the game', (await counts()).gamePresses === 0, await counts());
  await click(add);
  await click(add);
  await expectText('world-count', '3', 'Three clicks');
  await capture('04-incremented');
  const reset = await elementPoint('world-reset');
  await click(reset);
  await expectText('world-count', '0', 'Clicking the projected Reset button resets the counter');
  check('Reset shows its hover style under the pointer', (await find('world-reset')).style.backgroundColor === SECONDARY_HOVER);
  await moveTo(OFF_QUAD);

  // A click off the quad, and on its margin, belongs to the game.
  await world('resetCounts');
  await click(OFF_QUAD);
  let seen = await counts();
  check('A click off the quad reaches _unhandledInput and not the panel', seen.gamePresses === 1 && seen.panelPointerEvents === 0, seen);
  await click(margin);
  seen = await counts();
  check('A click on the quad\'s transparent margin falls through to the game', seen.gamePresses === 2 && seen.panelPointerEvents === 0, seen);
  await expectText('world-count', '0', 'Game clicks leave the counter alone');

  // A press that began on the panel is routed to the end, wherever the pointer goes.
  await world('resetCounts');
  await moveTo(add);
  await page.mouse.down();
  await frames();
  await page.mouse.move(OFF_QUAD.x, OFF_QUAD.y, { steps: DRAG_MOVE_STEPS });
  await frames();
  check('Dragging off the quad clears hover but keeps the press', (await snapshot()).hovered === null
    && await isWithin((await snapshot()).pressed, 'world-increment'));
  await page.mouse.up();
  await frames();
  check('Releasing off the quad ends the press', (await snapshot()).pressed === null);
  await expectText('world-count', '0', 'A release off the button does not click');
  check('A drag that began on the panel never reaches the game', (await counts()).gamePresses === 0, await counts());
  await click(add);
  await expectText('world-count', '1', 'The panel still works after an interrupted press');
  await moveTo(OFF_QUAD);

  // Keys follow the panel's focus.
  await world('resetCounts');
  await click(add);
  await expectText('world-count', '2');
  check('Clicking Add focuses it and gives the root key focus', await world('surfaceHasFocus') && (await snapshot()).focused === (await find('world-increment')).id);
  await page.keyboard.press('Enter');
  await frames();
  await expectText('world-count', '3', 'Enter, typed in the browser, activates the focused button inside the SubViewport');
  check('A key the panel consumed never reaches the game', (await counts()).gameKeys === 0, await counts());
  await capture('05-keyboard-focus');
  await page.keyboard.press('Tab');
  await frames();
  check('Tab moves focus to Reset', (await snapshot()).focused === (await find('world-reset')).id);
  await page.keyboard.press('Enter');
  await expectText('world-count', '0', 'Enter on Reset');
  await click(await elementPoint('world-title'));
  check('Clicking the title releases key focus', !(await world('surfaceHasFocus')) && (await snapshot()).focused === null);
  await world('resetCounts');
  await page.keyboard.press('Enter');
  await frames();
  check('Without focus the key is the game\'s, not the panel\'s', (await counts()).gameKeys === 1 && await text('world-count') === '0', await counts());
  await moveTo(OFF_QUAD);

  // Typing: a text input on the quad takes a projected press, then the keys the browser sends the main viewport.
  const nameState = async () => (await find('world-input')).textInput;
  await world('resetCounts');
  await click(await elementPoint('world-input'));
  check('A press on the projected field focuses it and gives the root key focus',
    await world('surfaceHasFocus') && (await snapshot()).focused === (await find('world-input')).id);
  await page.keyboard.type('Hi there');
  await waitUntil('the typed text reaches the field in the SubViewport', async () => (await nameState()).value === 'Hi there');
  await expectText('world-echo', 'Hello, Hi there', 'React follows the typing');
  check('A key the field consumed never reaches the game', (await counts()).gameKeys === 0, await counts());
  await capture('06-typing');
  // The page runs on across viewports, so the field is left as it was found.
  for (let count = 0; count < 'Hi there'.length; count += 1) await page.keyboard.press('Backspace');
  await waitUntil('Backspace empties the field', async () => (await nameState()).value === '');
  await click(await elementPoint('world-title'));
  check('Clicking the title releases key focus from the field', !(await world('surfaceHasFocus')));
  await moveTo(OFF_QUAD);
}

async function runTouchWorkflow() {
  await page.close();
  activeViewport = 'touch';
  const viewport = viewports[1];
  await loadPage({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1, hasTouch: true });
  check('Separate browser page exposes genuine touch input', await page.evaluate(() => navigator.maxTouchPoints > 0));
  await waitUntil('touch logical viewport size', async () => {
    const logical = await world('viewportSize');
    return logical.x === viewport.width && logical.y === viewport.height;
  });
  await expectText('world-count', '0', 'Touch page starts with fresh React state');
  await world('resetCounts');
  const add = await elementPoint('world-increment');
  await page.touchscreen.tap(add.x, add.y);
  await frames();
  await expectText('world-count', '1', 'A real browser tap on the projected Add button clicks it once');
  check('A touch never hovers', (await snapshot()).hovered === null);
  check('A finished touch leaves no pointer behind', (await snapshot()).pointers.every((pointer) => pointer.type === 'mouse'));
  check('A touch the panel consumed never reaches the game', (await counts()).gamePresses === 0, await counts());
  await page.touchscreen.tap(OFF_QUAD.x, OFF_QUAD.y);
  await frames();
  const seen = await counts();
  check('A touch off the quad is the game\'s', seen.gamePresses === 1, seen);
  await expectText('world-count', '1', 'The off-quad touch leaves the counter alone');
  await capture('01-touch');
}

try {
  await withDeadline((async () => {
    browser = await puppeteer.launch({
      executablePath, headless: true, timeout: ACTION_TIMEOUT_MS,
      args: ['--no-first-run', '--no-default-browser-check', '--mute-audio',
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
    });
    await loadPage({ width: viewports[0].width, height: viewports[0].height, deviceScaleFactor: 1 });
    for (const viewport of viewports) await runWorkflow(viewport);
    await runTouchWorkflow();
    checkBrowserErrors();
    report.passed = true;
  })(), TOTAL_TIMEOUT_MS, 'Browser workflow verification');
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
  if (page && !page.isClosed()) {
    await page.screenshot({ path: resolve(output, 'failure.png'), timeout: ACTION_TIMEOUT_MS }).catch((captureError) => {
      report.failureCaptureError = String(captureError);
    });
  }
  console.error('GODOT_REACT_WEB_VERIFY_FAILED', report.error);
  process.exitCode = 1;
} finally {
  if (browser) await withDeadline(browser.close(), ACTION_TIMEOUT_MS, 'Closing verification browser').catch((error) => {
    report.browserCleanupError = String(error);
    browser.process()?.kill('SIGTERM');
    process.exitCode = 1;
  });
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`GODOT_REACT_WEB_VERIFY_REPORT ${resolve(output, 'report.json')} passed=${report.passed} assertions=${report.assertions.length}`);
}
