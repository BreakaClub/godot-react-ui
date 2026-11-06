// Real-Chrome verification of the event pipeline: capture and bubble, preventDefault, synchronous
// dispatch, enter/leave chains, and re-entrant handlers that remove their own target, detach the
// root and unmount it, at both device pixel ratios, landscape and portrait, plus a touch page.
// Infrastructure (page observation, pack transfer check, geometry, captures) is shared in text with
// verify-web.mjs; the scenarios mirror demo/src/verify-interaction.ts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packBuffer = await readFile(resolve(root, 'artifacts', 'web-debug', 'index.pck'));
const expectedPack = {
  bytes: packBuffer.byteLength,
  sha256: createHash('sha256').update(packBuffer).digest('hex'),
};
const url = process.env.GODOT_REACT_WEB_URL ?? 'http://127.0.0.1:8096';
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = resolve(root, 'artifacts', 'web-interaction-verification');
const STARTUP_TIMEOUT_MS = 180_000;
const ACTION_TIMEOUT_MS = 15_000;
const TOTAL_TIMEOUT_MS = 600_000;
const POLL_MS = 50;
const GEOMETRY_TOLERANCE = 2;
const DISPATCH_SAMPLES = 40;
// Hover paint of the crossing panel's parent: slate-100 at rest, slate-200 while hovered.
const CHAIN_PARENT_REST = '#f1f5f9';
const CHAIN_PARENT_HOVER = '#e2e8f0';
const CAPTURE_THEN_BUBBLE = 'outer:capture middle:capture inner:capture inner:bubble middle:bubble outer:bubble';
// Godot's Key enum (core/os/keyboard.h): letters are their ASCII codes, special keys are KEY_SPECIAL | n.
const KEY_SPECIAL = 1 << 22;
const KEY_W = 'W'.charCodeAt(0);
const KEY_TAB = KEY_SPECIAL | 0x02;
const KEY_ENTER = KEY_SPECIAL | 0x05;
// Godot's Control.CursorShape values.
const CURSOR_ARROW = 0;
const CURSOR_POINTING_HAND = 2;
const CURSOR_MOVE = 13;
const CURSOR_HELP = 16;
// What Godot's Web display server writes to the canvas style for those shapes (godot2dom_cursor). It
// writes the arrow only when the shape changes, so a canvas that never left the arrow still reads `auto`.
const CSS_CURSORS_ARROW = ['default', 'auto'];
const CSS_CURSOR_POINTER = 'pointer';
const CSS_CURSOR_HELP = 'help';
const HUD_TARGETS = ['hud-inventory', 'hud-map', 'hud-help', 'hud-lock', 'hud-panel', 'hud-wheel-consume', 'hud-wheel-pass'];
const EMPTY_POINT_SEARCH_STEP = 24;
// Where the root is moved inside the window to tell root-local from viewport coordinates.
const SURFACE_OFFSET = { x: 50, y: 30 };
const WHEEL_TICK_PIXELS = 100;
// Longer than the click-count interval (plan Appendix A, 500 ms), and farther than its slop (4 px).
const CLICK_SEQUENCE_PAUSE_MS = 650;
const CLICK_SLOP_BREAKER_PX = 10;
// How far outside the page the knob test drags.
const OUTSIDE_THE_PAGE_PX = 300;
// The pad's paint at rest: indigo-50 (`hover:` is indigo-100).
const PAD_REST_COLOR = '#eef2ff';
const FIRST_TOUCH_ID = 2;
// The native focus ring (`FOCUS_RING_COLOR` in native/lib.rs, #7da8ff), a 2 px inset stroke, so one
// logical pixel inside an element's left edge is on it. 8-bit channels, tolerance in channel steps.
const FOCUS_RING_RGB = [0x7d, 0xa8, 0xff];
const FOCUS_RING_TOLERANCE = 6;
const FOCUS_RING_PROBE_INSET = 1;
// Far more than the keyboard lab has tab stops: a loop that reaches this is a bug.
const MAX_TAB_STEPS = 40;
// The Activate button's paint while a key holds it (`active:bg-indigo-800`) and at rest.
const ACTIVATE_ACTIVE_COLOR = '#3730a3';
const ACTIVATE_REST_COLOR = '#4f46e5';
// The card's paint when its focus is a keyboard focus (`focus-visible:bg-amber-100`) and at rest.
const CARD_FOCUS_VISIBLE_COLOR = '#fef3c7';
const CARD_REST_COLOR = '#ffffff';
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';
const viewports = [
  { name: 'landscape', width: 1120, height: 800, deviceScaleFactor: 1 },
  { name: 'portrait', width: 600, height: 900, deviceScaleFactor: 1 },
  { name: 'retina-landscape', width: 1120, height: 800, deviceScaleFactor: 2 },
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
let fatalErrors = [];

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
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeout} ms`)), timeout);
      }),
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
}

async function snapshot() {
  return page.evaluate(() => globalThis.godotReactDemo.snapshot());
}

async function find(testID) {
  const found = await page.evaluate((id) => globalThis.godotReactDemo.find(id), testID);
  assert.ok(found, `Missing native test target ${testID}`);
  return found;
}

function collectText(data, entry) {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  function collect(node) {
    return node.text + node.children.map((id) => {
      const child = byId.get(id);
      assert.ok(child, `Snapshot references missing child ${id}`);
      return collect(child);
    }).join('');
  }
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

async function pointerPoint(testID, verticalInset) {
  const [entry, data, canvas] = await Promise.all([
    find(testID), snapshot(),
    page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('Godot canvas is absent');
      const rect = canvas.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  ]);
  assert.ok(entry.rect.width > 0 && entry.rect.height > 0, `${testID} has no visible hit rectangle`);
  assert.ok(data.width > 0 && data.height > 0 && canvas.width > 0 && canvas.height > 0,
    'Canvas and logical viewport must have positive dimensions');
  const point = {
    x: canvas.x + (entry.rect.x + entry.rect.width / 2) * canvas.width / data.width,
    y: canvas.y + (entry.rect.y + (verticalInset ?? entry.rect.height / 2)) * canvas.height / data.height,
  };
  const viewport = page.viewport();
  assert.ok(viewport && point.x >= 0 && point.y >= 0 && point.x < viewport.width && point.y < viewport.height,
    `${testID} hit point escapes the browser viewport: ${JSON.stringify(point)}`);
  return point;
}

async function hover(testID) {
  const point = await pointerPoint(testID);
  await page.mouse.move(point.x, point.y);
  await frames();
}

async function click(testID) {
  await hover(testID);
  await page.mouse.down();
  await frames();
  await page.mouse.up();
  await frames();
  checkBrowserErrors();
}

function assertGeometry(data) {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  let visibleCount = 0;
  for (const node of data.nodes) {
    const rect = node.rect;
    assert.ok(Object.values(rect).every(Number.isFinite), `Node ${node.id} has nonfinite geometry`);
    assert.ok(rect.width >= 0 && rect.height >= 0, `Node ${node.id} has negative dimensions`);
    if (rect.width === 0 || rect.height === 0) continue;
    visibleCount += 1;
    assert.ok(rect.x >= -GEOMETRY_TOLERANCE && rect.y >= -GEOMETRY_TOLERANCE,
      `Node ${node.id} escapes top/left: ${JSON.stringify(rect)}`);
    assert.ok(rect.x + rect.width <= data.width + GEOMETRY_TOLERANCE &&
      rect.y + rect.height <= data.height + GEOMETRY_TOLERANCE,
    `Node ${node.id} escapes viewport ${data.width}x${data.height}: ${JSON.stringify(rect)}`);
    const children = node.children.map((id) => {
      const child = byId.get(id);
      assert.ok(child, `Node ${node.id} references missing child ${id}`);
      return child;
    }).filter((child) => child.rect.width > 0 && child.rect.height > 0);
    for (let firstIndex = 0; firstIndex < children.length; firstIndex++) {
      const child = children[firstIndex];
      const a = child.rect;
      assert.ok(a.x >= rect.x - GEOMETRY_TOLERANCE && a.y >= rect.y - GEOMETRY_TOLERANCE &&
        a.x + a.width <= rect.x + rect.width + GEOMETRY_TOLERANCE &&
        a.y + a.height <= rect.y + rect.height + GEOMETRY_TOLERANCE,
      `Child ${child.id} escapes parent ${node.id}`);
      for (let secondIndex = firstIndex + 1; secondIndex < children.length; secondIndex++) {
        const sibling = children[secondIndex];
        const b = sibling.rect;
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        assert.ok(overlapX <= GEOMETRY_TOLERANCE || overlapY <= GEOMETRY_TOLERANCE,
          `Siblings ${child.id}/${sibling.id} overlap by ${overlapX}x${overlapY}`);
      }
    }
  }
  check('Visible rectangles fit their parents and viewport; siblings do not overlap', true,
    { visibleCount, nativeNodeCount: data.stats.nodeCount, width: data.width, height: data.height });
}

async function capture(name) {
  await frames();
  checkBrowserErrors();
  const data = await snapshot();
  // Persist the exact rejected layout too, so a failed geometry gate is diagnosable.
  const directory = resolve(output, activeViewport);
  await mkdir(directory, { recursive: true });
  const json = resolve(directory, `${name}.json`);
  const png = resolve(directory, `${name}.png`);
  await writeFile(json, JSON.stringify(data, null, 2) + '\n');
  const canvas = await page.$('canvas');
  assert.ok(canvas, 'Godot canvas vanished');
  await canvas.screenshot({ path: png, type: 'png', timeout: ACTION_TIMEOUT_MS });
  await canvas.dispose();
  report.captures.push({ viewport: activeViewport, name, png, json });
  console.log(`GODOT_REACT_WEB_CAPTURE ${png}`);
  assertGeometry(data);
}

let currentPackObserver = null;

async function observePage(observedPage) {
  let startupComplete = false;
  let startupDiagnosticSeen = false;
  let pendingPackAbort = null;
  const cdp = await observedPage.createCDPSession();
  await cdp.send('Network.enable');
  const networkPack = {
    requestIds: new Set(),
    requests: 0,
    status: null,
    contentLength: null,
    receivedBytes: 0,
    abortedBeforeReady: 0,
  };
  cdp.on('Network.requestWillBeSent', (event) => {
    if (event.request?.url?.endsWith('/index.pck')) {
      networkPack.requestIds.add(event.requestId);
      networkPack.requests += 1;
    }
  });
  cdp.on('Network.responseReceived', (event) => {
    if (!networkPack.requestIds.has(event.requestId)) return;
    networkPack.status = event.response?.status ?? null;
    const rawLength = event.response?.headers?.['Content-Length'] ?? event.response?.headers?.['content-length'];
    networkPack.contentLength = rawLength === undefined ? null : Number(rawLength);
  });
  cdp.on('Network.dataReceived', (event) => {
    if (networkPack.requestIds.has(event.requestId)) {
      networkPack.receivedBytes += event.dataLength ?? 0;
    }
  });
  await observedPage.evaluateOnNewDocument(() => {
    const probe = {
      fetchCount: 0,
      status: null,
      contentLength: null,
      byteLength: null,
      sha256: null,
      fetchError: null,
      digestPromise: null,
    };
    Object.defineProperty(globalThis, '__godotPackProbe', { value: probe, configurable: true });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = function (...args) {
      const requestUrl = String(args[0] ?? '');
      const promise = Reflect.apply(originalFetch, this, args);
      if (requestUrl.endsWith('index.pck')) {
        probe.fetchCount += 1;
        promise.then(
          (response) => {
            probe.status = response.status;
            const rawLength = response.headers.get('content-length');
            probe.contentLength = rawLength === null ? null : Number(rawLength);
          },
          (error) => {
            probe.fetchError = String(error);
          },
        );
      }
      return promise;
    };
    const originalArrayBuffer = Response.prototype.arrayBuffer;
    Response.prototype.arrayBuffer = function (...args) {
      const promise = Reflect.apply(originalArrayBuffer, this, args);
      if (this.url === '') {
        promise.then((buffer) => {
          probe.byteLength = buffer.byteLength;
          probe.digestPromise = crypto.subtle.digest('SHA-256', buffer).then((digest) => {
            probe.sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
            return probe.sha256;
          });
        });
      }
      return promise;
    };
  });
  observedPage.on('console', (message) => {
    const entry = { type: message.type(), text: message.text(), location: message.location(), viewport: activeViewport };
    report.console.push(entry);
    if (entry.text.includes('GODOT_REACT_DEMO_READY')) startupComplete = true;
    // Emscripten 6.0.12 libpthread.js:957 emits this warnOnce before extension
    // initialization. The recorded stack resolves to _emscripten_proxy_dlsync ->
    // emscripten_proxy_sync -> pthread_cond_wait, from libc/dynlink.c:410 during
    // engine dlopen worker synchronization. Permit exactly one per page before
    // DEMO_READY; an occurrence during interactive use remains a failure.
    if (entry.text === EMSCRIPTEN_STARTUP_DIAGNOSTIC) {
      if (!startupComplete && !startupDiagnosticSeen) {
        startupDiagnosticSeen = true;
        report.expectedDiagnostics.push({ ...entry, reason: 'Engine dynamic-library startup worker synchronization' });
      } else {
        fatalErrors.push(entry.text);
      }
      return;
    }
    // A missing optional favicon is recorded, but does not describe a renderer failure.
    if (message.type() === 'error' && !entry.location.url?.endsWith('/favicon.ico')) {
      fatalErrors.push(entry.text);
    } else if (/(?:^|\n)(?:ERROR:|SCRIPT ERROR:)|GODOT_REACT_(?:VERIFY|START)_FAILED|\[panic /.test(entry.text)) {
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
    if (failure.url.endsWith('/favicon.ico')) {
      report.failedRequests.push(failure);
      return;
    }
    // Godot's index.js wraps fetch('index.pck')'s body reader in a progress
    // ReadableStream and calls controller.close() upon reader EOF; Chromium
    // can emit Network.loadingFailed(net::ERR_ABORTED, canceled: true) during
    // stream teardown after all pack bytes have been delivered. Hold a single
    // pre-ready index.pck abort until startup completes and verify byte length,
    // SHA-256, HTTP 200 status, and single-fetch completion before accepting it.
    if (failure.url.endsWith('/index.pck') && failure.error === 'net::ERR_ABORTED' && !startupComplete && !pendingPackAbort) {
      networkPack.abortedBeforeReady += 1;
      pendingPackAbort = failure;
      return;
    }
    report.failedRequests.push(failure);
    fatalErrors.push(JSON.stringify(failure));
  });
  return {
    async verifyPackTransfer() {
      const probe = await observedPage.evaluate(async () => {
        const state = globalThis.__godotPackProbe;
        if (!state) return null;
        if (state.digestPromise) await state.digestPromise;
        return {
          fetchCount: state.fetchCount,
          status: state.status,
          contentLength: state.contentLength,
          byteLength: state.byteLength,
          sha256: state.sha256,
          fetchError: state.fetchError,
        };
      });
      const detail = {
        expectedBytes: expectedPack.bytes,
        expectedSha256: expectedPack.sha256,
        network: {
          requests: networkPack.requests,
          status: networkPack.status,
          contentLength: networkPack.contentLength,
          receivedBytes: networkPack.receivedBytes,
          abortedBeforeReady: networkPack.abortedBeforeReady,
        },
        probe,
      };
      const complete = Boolean(
        probe &&
        probe.fetchError === null &&
        probe.fetchCount === 1 &&
        probe.status === 200 &&
        probe.contentLength === expectedPack.bytes &&
        probe.byteLength === expectedPack.bytes &&
        probe.sha256 === expectedPack.sha256 &&
        networkPack.requests === 1 &&
        networkPack.status === 200 &&
        networkPack.contentLength === expectedPack.bytes &&
        networkPack.receivedBytes === expectedPack.bytes &&
        networkPack.abortedBeforeReady <= 1
      );
      const pending = pendingPackAbort;
      pendingPackAbort = null;
      if (!complete) {
        if (pending) report.failedRequests.push(pending);
        fatalErrors.push(`index.pck transfer verification failed: ${JSON.stringify({ pending, ...detail })}`);
      } else if (pending) {
        report.expectedDiagnostics.push({
          ...pending,
          reason: 'Chromium ReadableStream wrapper close after verified complete index.pck transfer',
          ...detail,
        });
      }
      check('Main pack transfer completed with matching byte length and SHA-256 without retry', complete, detail);
    },
    failIfUnverified() {
      if (pendingPackAbort) {
        report.failedRequests.push(pendingPackAbort);
        fatalErrors.push(JSON.stringify({
          ...pendingPackAbort,
          receivedBytes: networkPack.receivedBytes,
          expectedBytes: expectedPack.bytes,
        }));
        pendingPackAbort = null;
      }
    },
  };
}

async function loadPage(viewport) {
  page = await browser.newPage();
  page.setDefaultTimeout(ACTION_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(STARTUP_TIMEOUT_MS);
  await page.setViewport(viewport);
  currentPackObserver = await observePage(page);
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  check('Demo document loaded', response?.ok(), { status: response?.status() });
  check('Browser is cross-origin isolated for WebAssembly threads',
    await page.evaluate(() => globalThis.crossOriginIsolated === true));
  await waitUntil('GodotJS demo initialization', async () => page.evaluate(() =>
    typeof globalThis.godotReactDemo?.snapshot === 'function'), STARTUP_TIMEOUT_MS);
  await currentPackObserver.verifyPackTransfer();
  check('GodotJS initialized the inspection API', true);
}
report.timing = {};

async function demo(method, ...args) {
  return page.evaluate((name, parameters) => globalThis.godotReactDemo[name](...parameters), method, args);
}

async function focusedId() {
  return (await snapshot()).focused;
}

async function demoMounted() {
  return page.evaluate(() => {
    try {
      globalThis.godotReactDemo.snapshot();
      return true;
    } catch (error) {
      return !(error instanceof Error && error.message.includes('not mounted'));
    }
  });
}

async function nodeExists(testID) {
  return Boolean(await page.evaluate((id) => globalThis.godotReactDemo.find(id), testID));
}

/** Move over `testID` and press without releasing, for scenarios that observe state mid-press. */
async function pressAndHold(testID) {
  const point = await pointerPoint(testID);
  await page.mouse.move(point.x, point.y);
  await frames();
  await page.mouse.down();
  await frames();
  return point;
}

async function releaseMouse() {
  await page.mouse.up();
  await frames();
  checkBrowserErrors();
}

async function expectFocused(id, name) {
  await waitUntil(name, async () => (await focusedId()) === id);
  check(name, true, { focused: id });
}

function probeValue(label, line) {
  const match = /^(?:down|focus) frame=(\d+) focused=(\d+|none)$/.exec(line);
  check(`${label} probe text is well formed`, Boolean(match), { line });
  return { frame: Number(match[1]), focused: match[2] === 'none' ? null : Number(match[2]) };
}

function summarize(durations) {
  const sorted = [...durations].sort((a, b) => a - b);
  const at = (fraction) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
  return {
    samples: sorted.length, minMs: sorted[0], p50Ms: at(0.5), p95Ms: at(0.95),
    maxMs: sorted[sorted.length - 1], meanMs: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
  };
}

/**
 * Press `testID` DISPATCH_SAMPLES times and record how long the JS side spent in the one synchronous
 * dispatch each press causes: the first `events` sample after the press is the cancelable pointerdown
 * that native waits on.
 */
async function measureSynchronousDispatch(testID) {
  const point = await pointerPoint(testID);
  await page.mouse.move(point.x, point.y);
  await frames();
  await demo('takeProfile');
  const durations = [];
  for (let sample = 0; sample < DISPATCH_SAMPLES; sample += 1) {
    await page.mouse.down();
    await frames();
    const first = (await demo('takeProfile')).js.samples.find((entry) => entry.kind === 'events');
    assert.ok(first, `Press ${sample} on ${testID} recorded no dispatch sample`);
    durations.push(first.durationMs);
    await page.mouse.up();
    await frames();
    await demo('takeProfile');
  }
  return summarize(durations);
}

/** The page position of a logical (root-local) point. */
async function pagePoint(x, y) {
  const [data, canvas] = await Promise.all([
    snapshot(),
    page.evaluate(() => {
      const element = document.querySelector('canvas');
      if (!element) throw new Error('Godot canvas is absent');
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  ]);
  return { x: canvas.x + x * canvas.width / data.width, y: canvas.y + y * canvas.height / data.height };
}

async function moveTo(logical) {
  const point = await pagePoint(logical.x, logical.y);
  await page.mouse.move(point.x, point.y);
  await frames();
  return point;
}

async function centerOf(testID) {
  const { rect } = await find(testID);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** A logical point inside the window that none of the HUD's pointer targets covers. */
async function emptyPoint() {
  const [data, ...targets] = await Promise.all([snapshot(), ...HUD_TARGETS.map((id) => find(id))]);
  for (let y = EMPTY_POINT_SEARCH_STEP; y < data.height; y += EMPTY_POINT_SEARCH_STEP) {
    for (let x = EMPTY_POINT_SEARCH_STEP; x < data.width; x += EMPTY_POINT_SEARCH_STEP) {
      if (!targets.some(({ rect }) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height)) return { x, y };
    }
  }
  throw new Error('The HUD covers the whole window; there is no pass-through point to test');
}

async function counts() {
  return demo('passthrough');
}

async function expectCounts(name, predicate) {
  await waitUntil(name, async () => predicate(await counts()));
  check(name, true, await counts());
}

async function expectTextWhere(testID, name, predicate) {
  await waitUntil(name, async () => predicate(await text(testID)));
  check(name, true, { text: await text(testID) });
}

async function canvasCursor() {
  return page.evaluate(() => getComputedStyle(document.querySelector('canvas')).cursor);
}

async function expectCanvasCursor(expected, name) {
  const accepted = Array.isArray(expected) ? expected : [expected];
  await waitUntil(name, async () => accepted.includes(await canvasCursor()));
  check(name, true, { cursor: await canvasCursor(), accepted });
}

async function pressKey(key, modifiers = []) {
  for (const modifier of modifiers) await page.keyboard.down(modifier);
  await page.keyboard.press(key);
  for (const modifier of modifiers.reverse()) await page.keyboard.up(modifier);
  await frames();
}

async function wheelAt(logical, deltaX, deltaY) {
  await moveTo(logical);
  await page.mouse.wheel({ deltaX, deltaY });
  await frames();
}

async function focusCanvas() {
  await page.evaluate(() => document.querySelector('canvas').focus());
}

/**
 * Plan I1: the root cooperates with Godot. Empty space and `pointer-events: none` regions belong to
 * the Controls underneath; keys, Tab and wheel ticks belong to the game unless React used them.
 * Mirrors demo/src/verify-interaction.ts, with real Chrome input and the canvas's own CSS cursor.
 */
async function runCooperationScenario() {
  check('A root that has just entered the tree does not steal key focus', (await demo('bareSurfaceHasFocus')) === false);
  await demo('showLab', 'hud');
  await waitUntil('the HUD mounts', () => nodeExists('hud'));
  await demo('resetPassthrough');
  await demo('grabSurfaceFocus');
  await focusCanvas();
  await waitUntil('the owner gives the root key focus', () => demo('surfaceHasFocus'));
  await capture('09-passthrough-hud');
  const status = () => text('hud-status');
  const baseline = await status();
  const empty = await emptyPoint();

  // A press where only pointer-events none elements lie goes to the Control behind the root and on
  // to the game; React sees nothing.
  await moveTo(empty);
  await waitUntil('nothing is hovered over a pass-through region', async () => (await snapshot()).hovered === null);
  check('Nothing is hovered over a pass-through region', true);
  await page.mouse.down();
  await frames();
  await page.mouse.up();
  await frames();
  await expectCounts('The Control behind the root and the game both saw the press once',
    (seen) => seen.backdropPresses === 1 && seen.unhandledPresses === 1);
  check('No React handler ran for a pass-through press', (await status()) === baseline, { status: await status() });
  check('Over nothing the cursor is the arrow', (await demo('cursorShapeAt', empty.x, empty.y)) === CURSOR_ARROW);
  await expectCanvasCursor(CSS_CURSORS_ARROW, 'Over a pass-through region the canvas shows the default cursor');

  // The button inside the pass-through region takes pointers and keeps them from the game.
  await hover('hud-map');
  const map = await find('hud-map');
  await waitUntil('hover reaches an auto element inside a none region', async () => {
    const { hovered } = await snapshot();
    return hovered !== null && (hovered === map.id || map.children.includes(hovered));
  });
  check('Hover reaches an auto element inside a none region', true);
  await expectCanvasCursor(CSS_CURSOR_POINTER, 'Moving over a cursor-pointer button sets the canvas cursor');
  await click('hud-inventory');
  await expectTextWhere('hud-status', 'The button handled its click', (value) => value.startsWith('inventory 1,'));
  const afterButton = await counts();
  check('A button press stays in React', afterButton.backdropPresses === 1 && afterButton.unhandledPresses === 1, afterButton);

  // An element with pointer-events none inside an auto one is never the target; the auto one is.
  await click('hud-panel-label');
  await expectTextWhere('hud-status', 'The panel, not its none label, is the target', (value) => value.includes('panel 1, label 0'));
  check('A press on a non-focusable element clears element focus', (await snapshot()).focused === null);
  await waitUntil('a press that leaves no element focused releases the root key focus', async () => !(await demo('surfaceHasFocus')));
  check('A press that leaves no element focused releases the root key focus', true);

  // With no element focused and the root unfocused, every key belongs to the game.
  await focusCanvas();
  await pressKey('w');
  await pressKey('Tab');
  await expectCounts('W and Tab belong to the game while the root has no key focus',
    (seen) => seen.unhandledKeys[KEY_W] === 1 && seen.unhandledKeys[KEY_TAB] === 1);
  check('Tab moved no element focus', (await snapshot()).focused === null);

  // The owner gives the root key focus with no element focused: W still reaches the game, Tab does
  // not because it moved focus.
  await demo('grabSurfaceFocus');
  await demo('resetRootKeys');
  await pressKey('w');
  await expectCounts('W reaches the game while the root has focus and no element is focused', (seen) => seen.unhandledKeys[KEY_W] === 2);
  check('With no element focused a key goes to root listeners, as target 0', (await demo('rootKeys')).join(',') === 'w', await demo('rootKeys'));
  await pressKey('Tab');
  await expectFocused((await find('hud-inventory')).id, 'Tab focuses the first button');
  check('A Tab that moved focus is consumed', (await counts()).unhandledKeys[KEY_TAB] === 1);
  await pressKey('w');
  await expectCounts('W still reaches the game after a React button took focus', (seen) => seen.unhandledKeys[KEY_W] === 3);
  await pressKey('Tab');
  await expectFocused((await find('hud-map')).id, 'Tab moves to the next button');
  check('Tab with an element focused is consumed too', (await counts()).unhandledKeys[KEY_TAB] === 1);
  await pressKey('Enter');
  await expectTextWhere('hud-status', 'Enter activates the focused button', (value) => value.includes('map 1,'));
  check('An activating Enter is consumed', (await counts()).unhandledKeys[KEY_ENTER] === undefined);
  await pressKey('Tab', ['Shift']);
  await expectFocused((await find('hud-inventory')).id, 'Shift+Tab moves back');
  await capture('10-hud-focus');

  // Nothing tabbable: Tab changes nothing, so it goes to the game.
  await click('hud-lock');
  await expectTextWhere('hud-status', 'The lock handled its click', (value) => value.endsWith('locked true'));
  await waitUntil('disabling the focused button removes focus', async () => (await focusedId()) === null);
  check('Disabling the focused button removes focus', true);
  await demo('grabSurfaceFocus');
  await focusCanvas();
  await pressKey('Tab');
  await expectCounts('A Tab that moved nothing is not consumed', (seen) => seen.unhandledKeys[KEY_TAB] === 2);
  check('A disabled button is not tabbable', (await focusedId()) === null);
  await click('hud-lock');
  await expectTextWhere('hud-status', 'The buttons unlock', (value) => value.endsWith('locked false'));

  // Wheel: over empty space and over an element nobody handles it reaches the game; JS decides.
  const unhandledWheels = async () => (await counts()).unhandledWheels;
  const readout = () => text('hud-wheel-status');
  const readoutValues = async () => {
    const match = /^consumed ticks (\d+), passed ticks (\d+), last delta (?:none|(-?[\d.]+),(-?[\d.]+))$/.exec(await readout());
    assert.ok(match, `Malformed wheel readout: ${await readout()}`);
    return { consumed: Number(match[1]), passed: Number(match[2]), delta: match[3] === undefined ? undefined : [Number(match[3]), Number(match[4])] };
  };
  await wheelAt(empty, 0, WHEEL_TICK_PIXELS);
  await expectCounts('A wheel tick over empty space reaches the game', (seen) => seen.unhandledWheels >= 1);
  const afterEmpty = await unhandledWheels();
  const initial = await readoutValues();
  check('No React handler saw it', initial.consumed === 0 && initial.passed === 0 && initial.delta === undefined, initial);
  await wheelAt(await centerOf('hud-panel'), 0, -WHEEL_TICK_PIXELS);
  await expectCounts('A wheel tick over an element with no onWheel reaches the game', (seen) => seen.unhandledWheels > afterEmpty);
  const beforePass = await unhandledWheels();
  await wheelAt(await centerOf('hud-wheel-pass'), WHEEL_TICK_PIXELS, 0);
  // Godot's Web display server maps a DOM deltaX > 0 (scroll right) to WHEEL_LEFT, the macOS
  // convention (`DisplayServerWeb::_mouse_wheel_callback`), so the sign of a horizontal tick is the
  // engine's, not the DOM's. The tick must still arrive as a purely horizontal one.
  await waitUntil('the passing handler saw a horizontal tick', async () => {
    const { passed, delta } = await readoutValues();
    return passed >= 1 && delta !== undefined && delta[0] !== 0 && delta[1] === 0;
  });
  const horizontal = await readoutValues();
  report.horizontalWheel = { domDeltaX: WHEEL_TICK_PIXELS, deltaX: horizontal.delta?.[0] };
  check('A horizontal wheel tick arrives as deltaX only', true, { ...horizontal, ...report.horizontalWheel });
  check('A wheel tick a handler did not prevent reaches the game', (await unhandledWheels()) > beforePass, { before: beforePass, after: await unhandledWheels() });
  const beforeConsume = await unhandledWheels();
  await wheelAt(await centerOf('hud-wheel-consume'), -WHEEL_TICK_PIXELS, 0);
  await waitUntil('the consuming handler saw the opposite horizontal tick', async () => {
    const { consumed, delta } = await readoutValues();
    return consumed >= 1 && delta !== undefined && delta[0] !== 0 && Math.sign(delta[0]) === -Math.sign(horizontal.delta?.[0] ?? 0) && delta[1] === 0;
  });
  check('The opposite horizontal wheel direction reverses the sign', true, await readoutValues());
  check('A wheel tick whose handler called preventDefault is consumed', (await unhandledWheels()) === beforeConsume, { before: beforeConsume, after: await unhandledWheels() });
  await wheelAt(await centerOf('hud-wheel-consume'), 0, -WHEEL_TICK_PIXELS);
  await waitUntil('wheel up is -y', async () => {
    const { delta } = await readoutValues();
    return delta !== undefined && delta[0] === 0 && delta[1] < 0;
  });
  await wheelAt(await centerOf('hud-wheel-consume'), 0, WHEEL_TICK_PIXELS);
  await waitUntil('wheel down is +y', async () => {
    const { delta } = await readoutValues();
    return delta !== undefined && delta[0] === 0 && delta[1] > 0;
  });
  check('Wheel directions follow the DOM signs', true, await readoutValues());
  check('A prevented wheel never reaches the game', (await unhandledWheels()) === beforeConsume, { before: beforeConsume, after: await unhandledWheels() });

  // The cursor follows the element under the pointer and inherits from its parent: the canvas shows it.
  const cursorOver = async (testID) => {
    const logical = await centerOf(testID);
    return demo('cursorShapeAt', logical.x, logical.y);
  };
  check('cursor-pointer shows the pointing hand', (await cursorOver('hud-map')) === CURSOR_POINTING_HAND);
  const label = (await snapshot()).nodes.find((node) => node.id === map.children[0]);
  check("The button's label inherits the cursor",
    (await demo('cursorShapeAt', label.rect.x + label.rect.width / 2, label.rect.y + label.rect.height / 2)) === CURSOR_POINTING_HAND);
  check('cursor-help shows the help cursor', (await cursorOver('hud-help')) === CURSOR_HELP);
  check('cursor-move shows the move cursor', (await cursorOver('hud-panel')) === CURSOR_MOVE);
  check('A button with no cursor shows the arrow', (await cursorOver('hud-inventory')) === CURSOR_ARROW);
  const panelLabel = await centerOf('hud-panel-label');
  check("Over a pointer-events-none label the cursor is the panel's",
    (await demo('cursorShapeAt', panelLabel.x, panelLabel.y)) === CURSOR_MOVE);
  await hover('hud-help');
  await expectCanvasCursor(CSS_CURSOR_HELP, 'Moving to cursor-help changes the canvas cursor');
  await moveTo(empty);
  await expectCanvasCursor(CSS_CURSORS_ARROW, 'Leaving the HUD for the game restores the default cursor');

  // viewportX/viewportY are canvas coordinates; x/y stay root-local.
  await demo('offsetSurface', SURFACE_OFFSET.x, SURFACE_OFFSET.y);
  await frames();
  const panelPoint = await centerOf('hud-panel');
  const inViewport = { x: panelPoint.x + SURFACE_OFFSET.x, y: panelPoint.y + SURFACE_OFFSET.y };
  const target = await moveTo(inViewport);
  await page.mouse.down();
  await frames();
  await page.mouse.up();
  await frames();
  // Real Chrome input lands on whole device pixels, so x and y are checked to a pixel; what must hold
  // exactly is that the canvas coordinates are the root-local ones plus the root's offset.
  const pressed = async () => {
    const match = /^last panel press (-?[\d.]+),(-?[\d.]+) viewport (-?[\d.]+),(-?[\d.]+)$/.exec(await text('hud-pointer'));
    return match === null ? undefined : match.slice(1).map(Number);
  };
  await waitUntil('the panel saw the offset press', async () => (await pressed()) !== undefined);
  const [localX, localY, canvasX, canvasY] = await pressed();
  check('Pointer events carry the press position root-local', Math.abs(localX - panelPoint.x) <= 1 && Math.abs(localY - panelPoint.y) <= 1,
    { localX, localY, expected: panelPoint, target });
  check('Pointer events carry canvas coordinates: root-local plus the root offset',
    canvasX - localX === SURFACE_OFFSET.x && canvasY - localY === SURFACE_OFFSET.y, { localX, localY, canvasX, canvasY, offset: SURFACE_OFFSET });
  await demo('offsetSurface', 0, 0);
  await frames();

  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns', () => nodeExists('app'));
  await demo('grabSurfaceFocus');
}

const padLines = async () => (await text('pad-log')).split('\n').filter((line) => line !== '');
async function padTally() {
  const match = /^down mouse (\d+) touch (\d+), ids ([\d,]+|none), clicks ([\d,]+|none), dbl (\d+), aux (\d+), ctx (\d+), cancel (\d+)$/.exec(await text('pad-tally'));
  assert.ok(match, `Malformed pad tally: ${await text('pad-tally')}`);
  const list = (value) => value === 'none' ? [] : value.split(',').map(Number);
  return {
    downs: { mouse: Number(match[1]), touch: Number(match[2]) }, ids: list(match[3]), clicks: list(match[4]),
    doubleClicks: Number(match[5]), auxClicks: Number(match[6]), contextMenus: Number(match[7]), cancels: Number(match[8]),
  };
}
async function expectPadLines(name, predicate) {
  await waitUntil(name, async () => predicate(await padLines()))
    .catch(async (error) => { throw new Error(`${error.message}: the pad log reads ${JSON.stringify(await padLines())}`); });
  check(name, true, { lines: await padLines() });
}
async function expectPadTally(name, predicate) {
  await waitUntil(name, async () => predicate(await padTally()))
    .catch(async (error) => { throw new Error(`${error.message}: the pad tally reads ${await text('pad-tally')}`); });
  check(name, true, await padTally());
}

/**
 * Plan I2, mouse half: the pointer model with real Chrome input: every mouse button, click counting and a
 * knob that keeps following a captured drag outside the page. Mirrors demo/src/verify-interaction.ts.
 */
async function runPointersScenario() {
  await demo('showLab', 'hud');
  await demo('showLab', 'pointers');
  await waitUntil('the pointer lab mounts', () => nodeExists('pointer-lab'));
  const padLogical = await centerOf('pad');
  const pad = await pagePoint(padLogical.x, padLogical.y);
  await capture('11-pointers');

  // Right and middle buttons: pointerdown, then contextmenu on the right press, pointerup, auxclick; never a click.
  await page.mouse.move(pad.x, pad.y);
  await frames();
  await page.mouse.click(pad.x, pad.y, { button: 'right' });
  await expectPadLines('A right click is pointerdown, contextmenu, pointerup, auxclick',
    (all) => all.join('|') === 'pointerenter mouse#1 b-1 bs0 d0|pointerdown mouse#1 b2 bs2 d0|contextmenu mouse#1 b2 bs2 d0|pointerup mouse#1 b2 bs0 d0|auxclick mouse#1 b2 bs0 d1');
  await page.mouse.click(pad.x, pad.y, { button: 'middle' });
  await expectPadLines('A middle click is an auxclick of button 1',
    (all) => all.slice(-3).join('|') === 'pointerdown mouse#1 b1 bs4 d0|pointerup mouse#1 b1 bs0 d0|auxclick mouse#1 b1 bs0 d1');
  const afterAux = await padTally();
  check('No click and one menu follow right and middle clicks', afterAux.clicks.length === 0 && afterAux.contextMenus === 1 && afterAux.auxClicks === 2, afterAux);

  // Click counting: three quick presses count 1, 2, 3 with one dblclick, after the second.
  for (let press = 0; press < 3; press += 1) {
    await page.mouse.down();
    await page.mouse.up();
  }
  await expectPadTally('A triple click counts 1, 2, 3 with one dblclick', (seen) => seen.clicks.join(',') === '1,2,3' && seen.doubleClicks === 1);
  check('The dblclick carries detail 2', (await padLines()).filter((line) => line.startsWith('dblclick')).join('|') === 'dblclick mouse#1 b0 bs0 d2');
  await capture('12-pointer-clicks');
  await new Promise((resolve) => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
  await page.mouse.down();
  await page.mouse.up();
  await expectPadTally('A click after the interval counts 1 again', (seen) => seen.clicks.join(',') === '1,2,3,1');
  await page.mouse.move(pad.x + CLICK_SLOP_BREAKER_PX, pad.y);
  await page.mouse.down();
  await page.mouse.up();
  await expectPadTally('A click beyond the slop starts a sequence', (seen) => seen.clicks.join(',') === '1,2,3,1,1');

  // Capture: the knob follows a drag wherever it goes, outside itself, the root and the page.
  const track = await find('knob-track');
  const at = (fraction) => ({ x: track.rect.x + fraction * track.rect.width, y: track.rect.y + track.rect.height / 2 });
  const readout = () => text('knob-readout');
  const valueOf = async () => Number(/value (\d+)/.exec(await readout())?.[1]);
  const start = await pagePoint(at(0.05).x, at(0.05).y);
  await page.mouse.move(start.x, start.y);
  await frames();
  await page.mouse.down();
  await waitUntil('pressing the knob captures the pointer', async () => (await readout()).includes('captured true'));
  const captured = (await snapshot()).pointers.find((entry) => entry.id === 1);
  check('Native records the explicit capture', captured?.down === true && captured.capture?.target === track.id && captured.capture.implicit === false, captured);
  const middle = await pagePoint(at(0.5).x, at(0.5).y);
  await page.mouse.move(middle.x, middle.y);
  await waitUntil('dragging inside the track moves the knob', async () => Math.abs((await valueOf()) - 50) <= 10);
  const viewportSize = page.viewport();
  await page.mouse.move(viewportSize.width + OUTSIDE_THE_PAGE_PX, -OUTSIDE_THE_PAGE_PX);
  await waitUntil('outside the page, to the right, the knob is at its end', async () => (await valueOf()) === 100);
  await page.mouse.move(-OUTSIDE_THE_PAGE_PX, viewportSize.height + OUTSIDE_THE_PAGE_PX);
  await waitUntil('outside the page, to the left, the knob is at its start', async () => (await valueOf()) === 0);
  const back = await pagePoint(at(0.75).x, at(0.75).y);
  await page.mouse.move(back.x, back.y);
  await waitUntil('back inside, the knob follows again', async () => Math.abs((await valueOf()) - 75) <= 10);
  await capture('13-knob-captured');
  await page.mouse.move(viewportSize.width + OUTSIDE_THE_PAGE_PX, -OUTSIDE_THE_PAGE_PX);
  await frames();
  await page.mouse.up();
  await waitUntil('the knob saw the pointerup outside the page', async () => (await readout()).includes('captured false'));
  const released = (await snapshot()).pointers.find((entry) => entry.id === 1);
  check('The capture ended with the press', released?.capture === null && released.down === false, released);

  await click('capture-bad');
  await expectTextWhere('capture-status', 'Capturing a pointer that is up is an error',
    (value) => value.startsWith('setPointerCapture failed: pointer 1 is not active'));

  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns', () => nodeExists('app'));
  await demo('grabSurfaceFocus');

  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns', () => nodeExists('app'));
  await demo('grabSurfaceFocus');
}

/** Decode an 8-bit, non-interlaced RGB or RGBA PNG (what Chrome's canvas screenshots are). */
function decodePng(buffer) {
  let offset = 8;
  let header;
  const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = { width: body.readUInt32BE(0), height: body.readUInt32BE(4), depth: body[8], colorType: body[9], interlace: body[12] };
    if (type === 'IDAT') data.push(body);
    offset += 12 + length;
  }
  assert.ok(header && header.depth === 8 && header.interlace === 0 && [2, 6].includes(header.colorType), `Unsupported screenshot PNG ${JSON.stringify(header)}`);
  const channels = header.colorType === 6 ? 4 : 3;
  const stride = header.width * channels;
  const raw = inflateSync(Buffer.concat(data));
  const pixels = Buffer.alloc(stride * header.height);
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const pa = Math.abs(estimate - left); const pb = Math.abs(estimate - up); const pc = Math.abs(estimate - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      pixels[y * stride + x] = value & 0xff;
    }
  }
  return { ...header, channels, pixels };
}

/** Whether the focus ring is drawn on `testID`: a pixel of the real canvas, one logical pixel inside its left edge. */
async function ringOn(testID) {
  const [{ rect }, data] = await Promise.all([find(testID), snapshot()]);
  const canvas = await page.$('canvas');
  assert.ok(canvas, 'Godot canvas vanished');
  const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: ACTION_TIMEOUT_MS })));
  await canvas.dispose();
  const scale = image.width / data.width;
  const x = Math.floor((rect.x + FOCUS_RING_PROBE_INSET) * scale);
  const y = Math.floor((rect.y + rect.height / 2) * scale);
  const offset = (y * image.width + x) * image.channels;
  return FOCUS_RING_RGB.every((channel, index) => Math.abs(image.pixels[offset + index] - channel) <= FOCUS_RING_TOLERANCE);
}

/** Every `kb-` element in document order that Tab stops on: enabled buttons and `tabIndex={0}` elements. */
async function expectedTabOrder() {
  const data = await snapshot();
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const order = [];
  const visit = (id) => {
    const node = byId.get(id);
    assert.ok(node, `Missing native node ${id}`);
    const { testID, tabIndex, disabled } = node.props;
    const tabbable = (node.kind === 'button' && disabled !== true && tabIndex !== -1) || tabIndex === 0;
    if (typeof testID === 'string' && testID.startsWith('kb-') && tabbable) order.push(testID);
    node.children.forEach(visit);
  };
  byId.get(0).children.forEach(visit);
  return order;
}

async function testIDOf(id) {
  if (id === null) return 'none';
  const node = (await snapshot()).nodes.find((candidate) => candidate.id === id);
  return typeof node?.props.testID === 'string' ? node.props.testID : `#${id}`;
}

/**
 * Plan I3 with real Chrome keyboard input: Tab order, the focus ring and focus-visible, DOM key events
 * and repeats, keyboard activation without pointer events, a focus trap and `focus()`. Mirrors
 * demo/src/verify-interaction.ts; the ring is a pixel of the canvas screenshot.
 */
async function runKeyboardScenario() {
  await demo('showLab', 'keyboard');
  await waitUntil('the keyboard lab mounts', () => nodeExists('keyboard-lab'));
  await demo('grabSurfaceFocus');
  await focusCanvas();
  const focusedTestID = async () => testIDOf(await focusedId());
  const settleKeys = () => frames();
  const tab = async (shift = false) => {
    if (shift) await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    if (shift) await page.keyboard.up('Shift');
    await settleKeys();
  };
  const tabTo = async (testID, shift = false) => {
    for (let step = 0; step <= MAX_TAB_STEPS && (await focusedTestID()) !== testID; step += 1) await tab(shift);
    check(`Tab reaches ${testID}`, (await focusedTestID()) === testID, { focused: await focusedTestID() });
  };
  const keyLines = async () => (await text('kb-log')).split('\n').filter((line) => line !== '');
  const focusLines = async () => (await text('kb-focus-log')).split('\n').filter((line) => line !== '');
  const expectFocusedTestID = async (testID, name) => {
    await waitUntil(name, async () => (await focusedTestID()) === testID);
    check(name, true, { focused: testID });
  };

  // Tab stops on every enabled button and tabIndex 0 element, in document order, and wraps; Shift+Tab
  // walks it backwards.
  const stops = await expectedTabOrder();
  check('The lab has the tab stops the test needs', stops.length >= 6 && !stops.includes('kb-disabled') && !stops.includes('kb-skip') && stops.includes('kb-card'), stops);
  const forward = [];
  for (let step = 0; step < stops.length + 1; step += 1) {
    await tab();
    forward.push(await focusedTestID());
  }
  check('Tab visits the stops in document order and wraps', forward.join(',') === [...stops, stops[0]].join(','), { forward, stops });
  const backward = [];
  for (let step = 0; step < stops.length; step += 1) {
    await tab(true);
    backward.push(await focusedTestID());
  }
  check('Shift+Tab walks it backwards, wrapping to the last', backward.join(',') === [...stops].reverse().join(','), { backward });

  // Tab follows the document, not creation order.
  await click('kb-swap');
  const stopsAfter = await expectedTabOrder();
  check('The swap changed the document order', stopsAfter.join(',') !== stops.join(',') && stopsAfter.indexOf('kb-swap-b') < stopsAfter.indexOf('kb-swap-a'), stopsAfter);
  await demo('grabSurfaceFocus');
  await focusCanvas();
  await tabTo(stopsAfter[0]);
  const swapped = [await focusedTestID()];
  for (let step = 1; step < stopsAfter.length; step += 1) {
    await tab();
    swapped.push(await focusedTestID());
  }
  check('After a reorder Tab follows the new document order', swapped.join(',') === stopsAfter.join(','), { swapped, stopsAfter });

  // Keyboard focus shows the ring and matches focus-visible, with no `focus:` style needed.
  await tabTo('kb-plain');
  let state = await snapshot();
  check('Tab focus is a keyboard focus', state.focusVisible === true && state.modality === 'keyboard', { focusVisible: state.focusVisible, modality: state.modality });
  check('Tab onto a button with no focus rule paints the ring', await ringOn('kb-plain'));
  const order = await expectedTabOrder();
  await tab();
  check('Tab continues in document order', (await focusedTestID()) === order[order.indexOf('kb-plain') + 1]);
  await tabTo('kb-card');
  check('Keyboard focus draws the ring and matches focus-visible:', (await ringOn('kb-card')) && (await find('kb-card')).style.backgroundColor === CARD_FOCUS_VISIBLE_COLOR);
  const before = order[order.indexOf('kb-card') - 1];
  await waitUntil('focus names where it came from', async () => (await focusLines()).at(-1) === `focus related=${before} visible=true`);
  check('focus names the element focus came from and that it is a keyboard focus', true, await focusLines());
  await capture('15-keyboard-ring');

  // A press focuses without the ring and without focus-visible; `focus:` still applies.
  await click('kb-skip');
  await expectFocusedTestID('kb-skip', 'A press focuses an element with tabIndex -1');
  await waitUntil('blur names where focus went', async () => (await focusLines()).at(-1) === 'blur related=kb-skip visible=true');
  state = await snapshot();
  check('Pointer focus is not a keyboard focus', state.focusVisible === false && state.modality === 'pointer');
  check('A press paints no ring', !(await ringOn('kb-skip')));
  await click('kb-card');
  await expectFocusedTestID('kb-card', 'Pressing the card focuses it');
  check('Pressing the card paints no ring', !(await ringOn('kb-card')));
  const pressed = (await find('kb-card')).style;
  check('focus: applies to pointer focus, focus-visible: does not', pressed.backgroundColor === CARD_REST_COLOR && pressed.borderColor === '#6366f1', pressed);
  await waitUntil('a pointer focus says so', async () => (await focusLines()).at(-1) === 'focus related=kb-skip visible=false');
  check('A pointer focus says so', true, await focusLines());
  await capture('16-mouse-focus-no-ring');

  // Tab from a tabIndex -1 element continues from its place; keyboard use brings the ring back.
  await click('kb-skip');
  await tab();
  await expectFocusedTestID('kb-open', 'Tab from a skipped element continues after it in document order');
  check('and the ring is back', (await snapshot()).focusVisible === true && (await ringOn('kb-open')));

  // Key events: DOM key and code, shift, and the repeats of a held key.
  await tabTo('kb-card', true);
  await page.keyboard.press('a');
  await page.keyboard.down('Shift');
  await page.keyboard.down('A');
  await page.keyboard.down('A');
  await page.keyboard.up('A');
  await page.keyboard.up('Shift');
  // The repeat is unique to this sequence (the log still holds the Shift+Tab that brought focus here).
  await waitUntil('the card logged the held key repeating', async () => (await keyLines()).includes('keydown key=A code=KeyA repeat=true'));
  await waitUntil('the card logged the last key release', async () => (await keyLines()).at(-1) === 'keyup key=Shift code=ShiftLeft repeat=false');
  const lines = await keyLines();
  check('A shifted letter is its capital with the physical key as code', lines.includes('keydown key=A code=KeyA repeat=false'), lines);
  check('A held key repeats as keydown with repeat set', lines.includes('keydown key=A code=KeyA repeat=true'), lines);
  check('A modifier is a key of its own, with its side', lines.at(-1) === 'keyup key=Shift code=ShiftLeft repeat=false', lines);
  await page.keyboard.press('ArrowLeft');
  await waitUntil('the card logged the arrow key', async () => (await keyLines()).includes('keydown key=ArrowLeft code=ArrowLeft repeat=false'));
  check('A key that types nothing has its DOM name', true, await keyLines());

  // Enter clicks a button once and no pointer events are made up; Space holds the active style until
  // its release, and a held key's repeats do nothing more.
  await tabTo('kb-activate');
  const activate = () => text('kb-activate-status');
  check('The button starts untouched', (await activate()) === 'clicks 0, pointerdowns 0, last click none', await activate());
  await page.keyboard.press('Enter');
  await waitUntil('Enter clicks the button', async () => (await activate()) === 'clicks 1, pointerdowns 0, last click type "" id 0 d0');
  check('Enter is one keyboard click: pointer 0, no pointer type, no pointerdown', true, await activate());
  await page.keyboard.down(' ');
  await waitUntil('active: applies while Space is held', async () => (await find('kb-activate')).style.backgroundColor === ACTIVATE_ACTIVE_COLOR);
  check('Nothing clicks until the key is released', (await activate()).startsWith('clicks 1,'), await activate());
  await page.keyboard.down(' ');
  await page.keyboard.down(' ');
  await settleKeys();
  check("A held key's repeats neither click nor release", (await activate()).startsWith('clicks 1,') && (await find('kb-activate')).style.backgroundColor === ACTIVATE_ACTIVE_COLOR, await activate());
  await page.keyboard.up(' ');
  await waitUntil('releasing Space clicks once', async () => (await activate()) === 'clicks 2, pointerdowns 0, last click type "" id 0 d0');
  await waitUntil('the style returns to rest', async () => (await find('kb-activate')).style.backgroundColor === ACTIVATE_REST_COLOR);
  check('Releasing Space clicks once and the style returns to rest', true, await activate());

  // A focus trap in JS: Tab wraps inside the dialog, Escape closes it and gives focus back.
  await click('kb-open');
  await expectFocusedTestID('dlg-ok', "autoFocus focuses the dialog's first button when it mounts");
  await tab();
  await expectFocusedTestID('dlg-cancel', 'Tab moves inside the dialog');
  await tab();
  await expectFocusedTestID('dlg-more', 'to its last button');
  await tab();
  await expectFocusedTestID('dlg-ok', 'Tab at the last button wraps to the first (the trap)');
  await tab(true);
  await expectFocusedTestID('dlg-more', 'Shift+Tab at the first wraps to the last');
  await capture('17-focus-trap');
  await page.keyboard.press('Escape');
  await waitUntil('Escape closes the dialog', async () => !(await nodeExists('kb-dialog')));
  await expectFocusedTestID('kb-open', 'Escape returns focus to its opener');

  // `focus()` from JS follows the input modality (a click is pointer input) unless it says otherwise,
  // and refuses an element that cannot take focus.
  await click('kb-focus-card');
  await expectFocusedTestID('kb-card', 'focus() after a press focuses the card');
  state = await snapshot();
  check('focus() after a press is not a keyboard focus', state.focusVisible === false && !(await ringOn('kb-card')));
  await click('kb-focus-card-visible');
  await waitUntil('focus({ focusVisible: true }) shows the ring', async () => (await snapshot()).focusVisible === true);
  check('focus({ focusVisible: true }) shows the ring', await ringOn('kb-card'));
  await click('kb-focus-bad');
  await expectTextWhere('kb-focus-status', 'focus() on an element that cannot take focus throws',
    (value) => /focus failed: node \d+ cannot take focus: it is not a button and has no tabIndex/.test(value));

  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns', () => nodeExists('app'));
  await demo('grabSurfaceFocus');
}

/**
 * Plan I2, touch half, on the page with real touch support: a tap with the engine's mouse emulation
 * on (one pointer, never a mouse press, no hover left), two fingers through CDP (two ids), and a
 * cancelled touch.
 */
async function runTouchPointersScenario() {
  await demo('showLab', 'pointers');
  await waitUntil('the pointer lab mounts on touch', () => nodeExists('pointer-lab'));
  await page.mouse.move(1, 1);
  await frames();
  check('The pad is unhovered before the touch', (await find('pad')).style.backgroundColor === PAD_REST_COLOR);
  const before = await padTally();
  const touchPoint = await pagePoint((await centerOf('pad')).x, (await centerOf('pad')).y);
  await page.touchscreen.tap(touchPoint.x, touchPoint.y);
  // Godot's Web build numbers a touch by the browser's contact identifier, which keeps counting across
  // taps, so the pointer id is any id from the touch range; what must hold is that one id runs through
  // the whole tap.
  let tapId;
  await expectPadLines('A tap is enter, down, up, leave, click', (all) => {
    const id = /touch#(\d+)/.exec(all[0] ?? '')?.[1];
    if (id === undefined) return false;
    tapId = Number(id);
    return all.join('|') === `pointerenter touch#${id} b-1 bs0 d0|pointerdown touch#${id} b0 bs1 d0|pointerup touch#${id} b0 bs0 d0|pointerleave touch#${id} b-1 bs0 d0|click touch#${id} b0 bs0 d1`;
  });
  check('A touch gets a pointer id from the touch range', tapId >= FIRST_TOUCH_ID, { tapId });
  const afterTap = await padTally();
  check('A tap is exactly one touch pointerdown and no mouse press',
    afterTap.downs.touch === before.downs.touch + 1 && afterTap.downs.mouse === before.downs.mouse, afterTap);
  const padNode = await find('pad');
  const hovered = (await snapshot()).hovered;
  check('A touch never hovers', hovered !== padNode.id && !padNode.children.includes(hovered ?? -1), { hovered });
  check('No hover paint is left after a tap', padNode.style.backgroundColor === PAD_REST_COLOR, padNode.style.backgroundColor);
  check('A finished touch leaves no pointer record', (await snapshot()).pointers.every((entry) => entry.type === 'mouse'));
  await capture('14-pointer-touch-tap');

  // Two fingers through CDP: two pointer ids.
  const cdp = await page.createCDPSession();
  const track = await find('knob-track');
  const knobTouch = await pagePoint(track.rect.x + 0.1 * track.rect.width, track.rect.y + track.rect.height / 2);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: touchPoint.x, y: touchPoint.y, id: 1 }, { x: knobTouch.x, y: knobTouch.y, id: 2 }],
  });
  await waitUntil('two touches are down', async () => (await snapshot()).pointers.filter((entry) => entry.type === 'touch' && entry.down).length === 2);
  const fingers = (await snapshot()).pointers.filter((entry) => entry.type === 'touch');
  const ids = fingers.map((entry) => entry.id);
  check('Two fingers are two distinct touch pointer ids', new Set(ids).size === 2 && ids.every((id) => id >= FIRST_TOUCH_ID), { ids });
  check('Each finger is captured to where it went down', fingers.every((entry) => entry.capture !== null), fingers);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitUntil('both fingers are up', async () => (await snapshot()).pointers.every((entry) => !entry.down));

  // A cancelled touch ends with pointercancel: no pointerup and no click.
  const beforeCancel = await padTally();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchPoint.x, y: touchPoint.y, id: 1 }] });
  await waitUntil('a finger is down on the pad', async () => (await padTally()).downs.touch === beforeCancel.downs.touch + 1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expectPadTally('A cancelled touch is a pointercancel and no click',
    (seen) => seen.cancels === beforeCancel.cancels + 1 && seen.clicks.length === beforeCancel.clicks.length);
  check('Nothing but the cancel and the leave follows', !(await padLines()).slice(-4).some((line) => line.startsWith('pointerup') || line.startsWith('click')), await padLines());
  await cdp.detach();


  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns', () => nodeExists('app'));
  await demo('grabSurfaceFocus');
}

async function runWorkflow(viewport) {
  activeViewport = viewport.name;
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor });
  await waitUntil('logical viewport resize', async () => {
    const data = await snapshot();
    return data.width === viewport.width && data.height === viewport.height;
  });
  check('Godot logical viewport matches browser CSS viewport', true,
    { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor });

  await click('tab-interaction');
  await waitUntil('interaction lab mounts', () => nodeExists('interaction-lab'));
  await capture('01-interaction');

  // Capture runs from the outermost ancestor to the target, bubble back out.
  await click('event-inner');
  await expectText('event-log', CAPTURE_THEN_BUBBLE, 'Capture then bubble order');
  await capture('02-capture-bubble');

  // stopPropagation in a capture handler prevents the rest of capture and all of bubble.
  await click('event-clear');
  await click('stop-toggle');
  await expectText('stop-toggle', 'Stop in capture: on', 'Stop toggle reads on');
  await click('event-inner');
  await expectText('event-log', 'outer:capture middle:capture', 'Stopping in capture prevents bubble');
  await capture('03-stop-in-capture');
  await click('stop-toggle');
  await click('event-clear');

  // preventDefault() on pointerdown stops native's focus default action; click still fires.
  await click('focus-normal');
  const normal = (await find('focus-normal')).id;
  await expectFocused(normal, 'An unprevented press focuses its button');
  await click('focus-prevented');
  await frames();
  check('A prevented press does not take focus', (await focusedId()) === normal, { focused: await focusedId(), normal });
  await expectText('focus-status', 'Clicks: normal 1, no-focus 1', 'Click follows a prevented pointerdown');
  await capture('04-prevent-default');

  // Dispatch is synchronous: the pointerdown handler runs before native's focus change, and the
  // resulting focus event is delivered inside the same input callback (the same process frame).
  await click('sync-probe');
  const probe = (await find('sync-probe')).id;
  await waitUntil('probe focus handler ran', async () => (await text('probe-focus')).startsWith('focus '));
  const down = probeValue('pointerdown', await text('probe-down'));
  const focusEvent = probeValue('focus', await text('probe-focus'));
  check('pointerdown handler runs before the default action', down.focused === normal, { down, normal });
  check('focus handler sees the new focus', focusEvent.focused === probe, { focusEvent, probe });
  check('pointerdown and focus dispatch in one input callback', down.frame === focusEvent.frame, { down, focusEvent });
  check('The unprevented press focused the probe button', (await focusedId()) === probe);

  // Enter and leave reach only the crossed elements (DOM semantics).
  const chainBackground = async () => (await find('chain-parent')).style.backgroundColor;
  await click('chain-clear');
  check('Crossing parent starts unhovered', (await chainBackground()) === CHAIN_PARENT_REST);
  await hover('chain-a');
  await waitUntil('entering a child hovers its parent', async () => (await chainBackground()) === CHAIN_PARENT_HOVER);
  await hover('chain-b');
  check('Moving between siblings keeps the parent hovered', (await chainBackground()) === CHAIN_PARENT_HOVER);
  await capture('05-enter-leave');
  await hover('chain-clear');
  await waitUntil('leaving the group unhovers its parent', async () => (await chainBackground()) === CHAIN_PARENT_REST);
  await expectText('chain-log', 'parent:enter a:enter a:leave b:enter b:leave parent:leave', 'Enter and leave chains');

  // Rule 3: a handler removes its own target while native is inside the press.
  await click('focus-normal');
  await expectFocused(normal, 'Focus starts on the normal button');
  await pressAndHold('self-remove');
  await waitUntil('the handler removed its target', async () => !(await nodeExists('self-remove')));
  check('The default action is skipped for a removed target', (await focusedId()) === normal, { focused: await focusedId() });
  check('A removed pressed element is no longer pressed', (await snapshot()).pressed === null);
  await releaseMouse();
  await expectText('reentrancy-status', 'Button removed, clicks on it: 0', 'No click reaches a removed target');
  await capture('06-self-removed');
  await click('self-restore');
  await waitUntil('the removed button can be restored', () => nodeExists('self-remove'));

  // Rule 4: a handler takes the root out of the scene tree while native is inside the press.
  await click('focus-normal');
  await expectFocused(normal, 'Focus is on the normal button before detaching');
  await pressAndHold('danger-detach');
  await releaseMouse();
  const detached = await snapshot();
  check('No default action ran on a detached root',
    detached.focused === null && detached.pressed === null && detached.hovered === null,
    { focused: detached.focused, pressed: detached.pressed, hovered: detached.hovered });
  await demo('surfaceAttached', true);
  await frames();
  await click('focus-normal');
  await expectFocused(normal, 'The same root works after re-entering the tree');
  await capture('07-reattached');

  // Rule 4, harder: the handler unmounts the React root and frees the surface.
  await pressAndHold('danger-unmount');
  await releaseMouse();
  await waitUntil('the handler unmounted the root', async () => !(await demoMounted()));
  check('The handler unmounted the root', true);
  await demo('mount');
  await expectText('counter-value', '0', 'A fresh root mounts after the unmount');
  await click('tab-interaction');
  await waitUntil('interaction lab mounts again', () => nodeExists('interaction-lab'));
  await click('focus-normal');
  await expectFocused((await find('focus-normal')).id, 'A fresh root dispatches normally');
  await capture('08-remounted');

  // What synchronous dispatch costs: JS time inside the one dispatch a press waits for.
  await click('event-clear');
  await demo('profile', true);
  const cheap = await measureSynchronousDispatch('focus-prevented');
  const stateful = await measureSynchronousDispatch('event-inner');
  await demo('profile', false);
  report.timing[viewport.name] = { cheapHandler: cheap, stateUpdatingHandler: stateful };
  check('Dispatch timing recorded', cheap.samples === DISPATCH_SAMPLES && stateful.samples === DISPATCH_SAMPLES);
  console.log(`GODOT_REACT_WEB_DISPATCH_TIMING ${viewport.name} ${JSON.stringify(report.timing[viewport.name])}`);

  await runCooperationScenario();
  await runPointersScenario();
  await runKeyboardScenario();

  // This page keeps running across viewports (the native verifier gets a fresh process for each),
  // so leave a fresh root: the lab's log and click counters must not leak into the next viewport.
  await demo('unmount');
  await demo('mount');
  await expectText('counter-value', '0', 'A fresh root is mounted for the next viewport');
}

async function runTouchWorkflow() {
  await page.close();
  activeViewport = 'touch';
  const viewport = viewports[1];
  await loadPage({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1, hasTouch: true });
  check('Separate browser page exposes genuine touch input', await page.evaluate(() => navigator.maxTouchPoints > 0));
  await waitUntil('touch logical viewport size', async () => {
    const data = await snapshot();
    return data.width === viewport.width && data.height === viewport.height;
  });
  const tap = async (testID) => {
    const point = await pointerPoint(testID);
    await page.touchscreen.tap(point.x, point.y);
    await frames();
  };
  await tap('tab-interaction');
  await waitUntil('interaction lab mounts on touch', () => nodeExists('interaction-lab'));
  await tap('event-inner');
  await expectText('event-log', CAPTURE_THEN_BUBBLE, 'A touch tap dispatches capture then bubble');
  await tap('focus-normal');
  const normal = (await find('focus-normal')).id;
  await expectFocused(normal, 'A touch tap focuses its button');
  await tap('focus-prevented');
  await expectText('focus-status', 'Clicks: normal 1, no-focus 1', 'A touch tap on a prevented button still clicks');
  check('A prevented touch tap does not take focus', (await focusedId()) === normal);
  await capture('01-touch-interaction');
  await runTouchPointersScenario();
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
  })(), TOTAL_TIMEOUT_MS, 'Browser interaction verification');
} catch (error) {
  currentPackObserver?.failIfUnverified();
  report.error = error instanceof Error ? error.stack : String(error);
  if (page && !page.isClosed()) {
    await page.screenshot({ path: resolve(output, 'failure.png'), timeout: ACTION_TIMEOUT_MS }).catch((captureError) => {
      report.failureCaptureError = String(captureError);
    });
  }
  console.error('GODOT_REACT_WEB_INTERACTION_VERIFY_FAILED', report.error);
  process.exitCode = 1;
} finally {
  if (browser) await withDeadline(browser.close(), ACTION_TIMEOUT_MS, 'Closing verification browser').catch((error) => {
    report.browserCleanupError = String(error);
    browser.process()?.kill('SIGTERM');
    process.exitCode = 1;
  });
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(resolve(output, 'browser.log'), report.console.map((entry) => `[${entry.type}] ${entry.text}`).join('\n') + '\n');
}

if (report.passed && !process.exitCode) {
  console.log('GODOT_REACT_WEB_INTERACTION_VERIFY_PASSED', JSON.stringify({
    assertions: report.assertions.length, captures: report.captures.length, timing: report.timing,
    report: resolve(output, 'report.json'),
  }));
}
