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
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';
import { WEB_INTERACTION_SECTIONS, describeSections, requestedSections, webInteractionDeadlineMs } from './verifier-sections.mjs';
import { isolateBrowserClipboard } from './web-clipboard.mjs';
import { startVerificationServer } from './web-verify.mjs';
import { runComboboxScenario, runTouchComboboxScenario } from './verify-combobox-web.mjs';
import { runTouchDropdownScenario } from './verify-dropdown-touch-web.mjs';
import { runTouchSelectionRetinaScenario, runTouchSelectionScenario } from './verify-touch-selection-web.mjs';
import { runFiltersScenario } from './verify-filters-web.mjs';
import { runGlassScenario } from './verify-glass-web.mjs';
import { runCodeEditorScenario, runTouchCodeEditorScenario } from './verify-code-editor-web.mjs';
import { runKeyPassthroughEditorScenario, runKeyPassthroughScenario } from './verify-key-passthrough-web.mjs';
import { runNavigatorScenario, runNavigatorStartScenario } from './verify-navigator-web.mjs';
import { runFontSlicesScenario } from './verify-font-slices-web.mjs';
import { runRotationScenario } from './verify-rotation-web.mjs';
import { runRichTextScenario } from './verify-rich-text-web.mjs';
import { runTextStylesScenario } from './verify-text-styles-web.mjs';
import { runTransformsScenario } from './verify-transforms-web.mjs';
import { runPaintScenario } from './verify-paint-web.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
rejectUnknownArguments(process.argv.slice(2), { flags: ['--release'], prefixes: ['--only='] });
const engine = selectEngine();
// Refuse an export whose side module was built from other sources than the working tree (docs/tracks/freshness.md).
engine.requireFreshWebExport();
// `--release` verifies the release export (the stock profile's only Web mode that starts: docs/tracks/stock-engine.md, S10).
const packBuffer = await readFile(engine.artifactPath(`web-${engine.webMode()}`, 'index.pck'));
const expectedPack = {
  bytes: packBuffer.byteLength,
  sha256: createHash('sha256').update(packBuffer).digest('hex'),
};
// Served by this verifier on a free port, or compared with the export first (scripts/web-verify.mjs).
const server = await startVerificationServer(engine);
const url = server.url;
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = engine.artifactPath('web-interaction-verification');
const STARTUP_TIMEOUT_MS = 180_000;
const ACTION_TIMEOUT_MS = 15_000;
const POLL_MS = 50;
// `--only=<section>[,<section>]` runs just those sections (plan 0.4.1); the names are the native verifier's, and `touch`
// is this verifier's touch page. An unknown name is an error: a typo must not skip a section.
// The names, the order and what counts as left out are scripts/verifier-sections.mjs, shared with the native verifier.
const SECTIONS = WEB_INTERACTION_SECTIONS;
const coverage = describeSections(SECTIONS, [], requestedSections(process.argv.slice(2)));
const wanted = (name) => coverage.run.includes(name);
// Four viewports of every section and the touch page, with the scroll and drag sections waiting on real time (momentum, the touch
// hold, edge auto-scroll), in one browser: a hang guard that grows with the sections run (scripts/verifier-sections.mjs has the measurements).
const TOTAL_TIMEOUT_MS = webInteractionDeadlineMs(coverage.run.length);
const GEOMETRY_TOLERANCE = 2;
const DISPATCH_SAMPLES = 40;
// Hover paint of the crossing panel's parent: slate-100 at rest, slate-200 while hovered.
const CHAIN_PARENT_REST = '#f1f5f9';
const CHAIN_PARENT_HOVER = '#e2e8f0';
const CAPTURE_THEN_BUBBLE = 'outer:capture middle:capture inner:capture inner:bubble middle:bubble outer:bubble';
// Godot's Key enum (core/os/keyboard.h): letters are their ASCII codes, special keys are KEY_SPECIAL | n.
const KEY_SPECIAL = 1 << 22;
const KEY_W = 'W'.charCodeAt(0);
const KEY_C = 'C'.charCodeAt(0);
const KEY_TAB = KEY_SPECIAL | 0x02;
const KEY_ENTER = KEY_SPECIAL | 0x05;
const KEY_HOME = KEY_SPECIAL | 0x0d;
const KEY_END = KEY_SPECIAL | 0x0e;
const KEY_PAGEDOWN = KEY_SPECIAL | 0x14;
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
/** How far inside and outside the pad label's left edge a click's press and release are. */
const CLICK_EDGE_PX = 2;
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
  assertions: [], captures: [], console: [], pageErrors: [], failedRequests: [], expectedDiagnostics: [], engineGaps: [],
  passed: false,
};
await mkdir(output, { recursive: true });
let browser;
let page;
let activeViewport = 'startup';
let fatalErrors = [];
// Console errors a scenario provokes on purpose and expects once each (a refused clipboard read); anything else is fatal.
const expectedConsoleErrors = [];

function check(name, condition, detail) {
  report.assertions.push({ viewport: activeViewport, name, passed: Boolean(condition), detail });
  assert.ok(condition, `${activeViewport}: ${name}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
}

/** How many assertions each section made, over every viewport: a section that made none verified nothing. */
const sectionChecks = {};

async function section(name, run) {
  const before = report.assertions.length;
  try {
    await run();
  } finally {
    sectionChecks[name] = (sectionChecks[name] ?? 0) + report.assertions.length - before;
  }
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

/** An out-of-flow element overlaps its siblings and leaves its parent by design, as in the native check (`demo/src/verify-interaction.ts`). */
function isOutOfFlow(node) {
  return node.style.position === 'absolute' || node.style.position === 'fixed';
}

/** Every node below a scroll container: what it holds reaches past it and the window by design. */
function scrolledContent(data) {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const content = new Set();
  const collect = (id) => {
    for (const child of byId.get(id)?.children ?? []) {
      content.add(child);
      collect(child);
    }
  };
  for (const node of data.nodes) if (node.scroll !== null) collect(node.id);
  return content;
}

function assertGeometry(data) {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const content = scrolledContent(data);
  let visibleCount = 0;
  for (const node of data.nodes) {
    const rect = node.rect;
    assert.ok(Object.values(rect).every(Number.isFinite), `Node ${node.id} has nonfinite geometry`);
    assert.ok(rect.width >= 0 && rect.height >= 0, `Node ${node.id} has negative dimensions`);
    if (rect.width === 0 || rect.height === 0 || content.has(node.id)) continue;
    visibleCount += 1;
    assert.ok(rect.x >= -GEOMETRY_TOLERANCE && rect.y >= -GEOMETRY_TOLERANCE,
      `Node ${node.id} escapes top/left: ${JSON.stringify(rect)}`);
    assert.ok(rect.x + rect.width <= data.width + GEOMETRY_TOLERANCE &&
      rect.y + rect.height <= data.height + GEOMETRY_TOLERANCE,
    `Node ${node.id} escapes viewport ${data.width}x${data.height}: ${JSON.stringify(rect)}`);
    // What a scroll container holds may reach past it; that is what scrolling is for.
    if (node.scroll !== null) continue;
    const children = node.children.map((id) => {
      const child = byId.get(id);
      assert.ok(child, `Node ${node.id} references missing child ${id}`);
      return child;
    }).filter((child) => child.rect.width > 0 && child.rect.height > 0 && !isOutOfFlow(child));
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

/** Save the canvas and the snapshot; `geometry: false` skips the gate that rejects overlapping siblings (the filters lab overlaps on purpose). */
async function capture(name, { geometry = true } = {}) {
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
  if (geometry) assertGeometry(data);
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
    const expected = expectedConsoleErrors.findIndex((pattern) => pattern.test(entry.text));
    if (expected >= 0) {
      expectedConsoleErrors.splice(expected, 1);
      report.expectedDiagnostics.push({ ...entry, reason: 'An error the scenario provoked and expected' });
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
  // The clipboard of the page is the page's own: the machine's is the person's (scripts/web-clipboard.mjs).
  await isolateBrowserClipboard(page);
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  check('Demo document loaded', response?.ok(), { status: response?.status() });
  check('Browser is cross-origin isolated for WebAssembly threads',
    await page.evaluate(() => globalThis.crossOriginIsolated === true));
  await waitUntil('GodotJS demo initialization', async () => page.evaluate(() =>
    typeof globalThis.godotReactDemo?.snapshot === 'function'), STARTUP_TIMEOUT_MS);
  await currentPackObserver.verifyPackTransfer();
  check('GodotJS initialized the inspection API', true);
  // The sections that look at hex boxes (a character no font has) and at the geometry of text with them hold the boxes still; the downloaded fonts that replace
  // them are the `font-slices` section's, which opens a page of its own for each of its groups (scripts/verify-font-slices-web.mjs).
  await page.evaluate(() => globalThis.godotReactDemo.configureFontSlices(null));
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
/** Page points just inside and just outside the left edge of the pad's label: the label, and the pad beside it. */
async function padLabelPoints() {
  const [pad, data] = await Promise.all([find('pad'), snapshot()]);
  const label = data.nodes.find((node) => node.id === pad.children[0]);
  assert.ok(label && label.rect.width > 0, 'The pad has a label of its own');
  const y = label.rect.y + label.rect.height / 2;
  return {
    inLabel: await pagePoint(label.rect.x + CLICK_EDGE_PX, y),
    besideLabel: await pagePoint(label.rect.x - CLICK_EDGE_PX, y),
  };
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

  // The click goes to the nearest common ancestor of the press and the release: a press on the pad's label that lifts on the
  // pad itself clicks the pad, and so does the reverse.
  const { inLabel, besideLabel } = await padLabelPoints();
  const clicksBeforeLabel = (await padTally()).clicks.length;
  await page.mouse.move(inLabel.x, inLabel.y);
  await page.mouse.down();
  await page.mouse.move(besideLabel.x, besideLabel.y);
  await page.mouse.up();
  await expectPadTally('A press on the pad label lifted on the pad clicks the pad', (seen) => seen.clicks.length === clicksBeforeLabel + 1);
  await page.mouse.move(besideLabel.x, besideLabel.y);
  await page.mouse.down();
  await page.mouse.move(inLabel.x, inLabel.y);
  await page.mouse.up();
  await expectPadTally('and so does a press on the pad lifted on its label', (seen) => seen.clicks.length === clicksBeforeLabel + 2);

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
    (value) => /focus failed: node \d+ cannot take focus: it is not a button or text input and has no tabIndex/.test(value));

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

  // A finger that drifts from the label onto the pad within the slop taps the pad, as the mouse does.
  const drift = await page.createCDPSession();
  const { inLabel, besideLabel } = await padLabelPoints();
  const clicksBeforeDrift = (await padTally()).clicks.length;
  await drift.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: inLabel.x, y: inLabel.y, id: 1 }] });
  await drift.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: besideLabel.x, y: besideLabel.y, id: 1 }] });
  await drift.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expectPadTally('A tap whose finger drifted from the label onto the pad clicks the pad', (seen) => seen.clicks.length === clicksBeforeDrift + 1);
  await waitUntil('the drifting finger is up', async () => (await snapshot()).pointers.every((entry) => !entry.down));
  await drift.detach();

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
  if (engine.web.reportsCancelledTouch) {
    await expectPadTally('A cancelled touch is a pointercancel and no click',
      (seen) => seen.cancels === beforeCancel.cancels + 1 && seen.clicks.length === beforeCancel.clicks.length);
    check('Nothing but the cancel and the leave follows', !(await padLines()).slice(-4).some((line) => line.startsWith('pointerup') || line.startsWith('click')), await padLines());
  } else {
    // This engine's Web input has no cancelled touch: `touchcancel` is delivered as `touchend` (scripts/engine.mjs), so the
    // page sees an ordinary release and cannot report a pointercancel. Record what it did deliver instead of asserting
    // what it cannot, and check the finger does end, so the rest of the run starts from a clean pointer state.
    await waitUntil('the cancelled finger is released', async () => (await snapshot()).pointers.every((entry) => !entry.down));
    const seen = await padTally();
    const gap = {
      id: 'touch-cancel', engine: engine.name,
      reason: 'the engine maps touchcancel to touchend, so a cancelled touch cannot be a pointercancel',
      observed: { cancels: seen.cancels - beforeCancel.cancels, clicks: seen.clicks.length - beforeCancel.clicks.length, lines: (await padLines()).slice(-4) },
    };
    report.engineGaps.push(gap);
    console.log('GODOT_REACT_WEB_GAP', JSON.stringify(gap));
  }
  await cdp.detach();


  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns', () => nodeExists('app'));
  await demo('grabSurfaceFocus');
}


/**
 * Godot's Web build turns a DOM wheel delta of `d` pixels into `0.03 * d` ticks (`DisplayServerWeb::_mouse_wheel_callback`,
 * `MOUSE_WHEEL_PIXEL_FACTOR`). A CDP wheel notch of `WHEEL_TICK_PIXELS` arrives as that many CSS pixels at device pixel ratio 1
 * and as half as many at 2 (Chrome divides the physical delta by the ratio; measured: `deltaY` 100 and 50).
 */
const WHEEL_PIXEL_FACTOR = 0.03;
const notchTicks = () => WHEEL_TICK_PIXELS / page.viewport().deviceScaleFactor * WHEEL_PIXEL_FACTOR;
/** A wheel tick scrolls a container's client size divided by this (`SCROLL_PAGE_DIVISOR`, native/scroll.rs). */
const SCROLL_PAGE_DIVISOR = 8;
/** The overlay scrollbar margin (native/scroll.rs `SCROLLBAR_MARGIN_PX`). */
const SCROLLBAR_MARGIN = 2;
const SCROLL_TOLERANCE = 0.05;
const THUMB_DRAG_PX = 30;
/** A touch swipe: the finger moves this far per step (beyond the 8 px slop at the first), once per `frames()`. */
const SWIPE_STEP_PX = 15;
const SWIPE_STEPS = 6;
const MIN_COAST_PX = 30;
const COAST_POLL_MS = 150;
const COAST_DEADLINE_MS = 6_000;
/** More Tab presses than the lab's list has rows in view, so a loop that reaches it is a bug. */
const MAX_REVEAL_TABS = 12;

async function scrollOf(testID) {
  const { scroll } = await find(testID);
  assert.ok(scroll, `${testID} is a scroll container`);
  return scroll;
}

const nearly = (actual, expected, tolerance = SCROLL_TOLERANCE) => Math.abs(actual - expected) <= tolerance;

/**
 * Plan I5, mouse half: wheel, keys, the scrollbar thumb, chaining and clicks in scrolled content in real Chrome, at both
 * device pixel ratios. Mirrors the native `scroll` section; the wheel differs because the Web build scales a notch.
 */
async function runScrollScenario() {
  await demo('showLab', 'scroll');
  await waitUntil('the scroll lab mounts', () => nodeExists('scroll-lab'));
  await page.mouse.move(1, 1);
  await frames();
  const list = await scrollOf('scroll-list');
  check('A tall list has room to scroll and starts at the top', list.maxScrollTop > 0 && list.scrollTop === 0, list);
  const tick = list.clientHeight / SCROLL_PAGE_DIVISOR;
  await capture('22-scroll-lab');

  // Wheel: a notch is three ticks here, each a page / 8; the game never sees a notch that scrolled.
  const gameBefore = (await counts()).unhandledWheels;
  await wheelAt(await centerOf('scroll-list'), 0, WHEEL_TICK_PIXELS);
  await waitUntil('one wheel notch scrolls its ticks', async () => nearly((await scrollOf('scroll-list')).scrollTop, notchTicks() * tick));
  check('A wheel notch scrolls the list by its ticks of a page / 8', true, { scrollTop: (await scrollOf('scroll-list')).scrollTop, tick, ticks: notchTicks() });
  check('A notch a list scrolled for is not the game\'s', (await counts()).unhandledWheels === gameBefore, await counts());
  await expectTextWhere('list-status', 'JS hears the scroll', (value) => value.startsWith(`top ${Math.round(notchTicks() * tick)},`));
  await wheelAt(await centerOf('scroll-title'), 0, WHEEL_TICK_PIXELS);
  await expectCounts('A notch over UI that does not scroll reaches the game', (seen) => seen.unhandledWheels > gameBefore);

  // The scrollbar thumb, dragged with the real mouse, even with the pointer off the bar.
  const before = await scrollOf('scroll-list');
  const thumb = before.thumbs?.y;
  check('The list has a vertical thumb', Boolean(thumb), before.thumbs);
  const travel = before.clientHeight - 2 * SCROLLBAR_MARGIN - thumb.height;
  // Chrome reports a mouse position in whole CSS pixels, so the press and the moves are on whole pixels here: the drag
  // then measures exactly THUMB_DRAG_PX of travel, wherever on the thumb it was pressed.
  const centre = await pagePoint(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
  const grab = { x: Math.round(centre.x), y: Math.round(centre.y) };
  const wrapBefore = await text('list-status');
  await page.mouse.move(grab.x, grab.y);
  await frames();
  await page.mouse.down();
  await frames();
  await page.mouse.move(grab.x - 100, grab.y + THUMB_DRAG_PX / 2);
  await page.mouse.move(grab.x - 100, grab.y + THUMB_DRAG_PX);
  await frames();
  const expected = Math.min(before.maxScrollTop, (before.scrollTop / before.maxScrollTop * travel + THUMB_DRAG_PX) / travel * before.maxScrollTop);
  await waitUntil('the thumb drag scrolls', async () => nearly((await scrollOf('scroll-list')).scrollTop, expected, 0.5));
  check('Dragging the thumb moves the content by the pointer\'s share of the track', true, { expected, scrollTop: (await scrollOf('scroll-list')).scrollTop });
  await page.mouse.up();
  await frames();
  check('Letting go of a thumb clicks nothing', (await text('list-status')).replace(/top \d+/, '') === wrapBefore.replace(/top \d+/, ''), await text('list-status'));
  await page.mouse.move(1, 1);
  await frames();

  // Clicks in scrolled content reach the row under the pointer.
  await click('list-top');
  await wheelAt(await centerOf('scroll-list'), 0, WHEEL_TICK_PIXELS);
  await waitUntil('the list scrolled', async () => (await scrollOf('scroll-list')).scrollTop > 0);
  await click('list-row-3');
  await expectTextWhere('list-status', 'A click at a scrolled row\'s place reaches that row', (value) => value.includes('clicked row 3'));

  // Keys: the focused button's container takes Page Down, Home and End.
  await click('list-top');
  await click('list-row-1');
  await focusCanvas();
  await pressKey('PageDown');
  await waitUntil('Page Down scrolls a page', async () => nearly((await scrollOf('scroll-list')).scrollTop, (await scrollOf('scroll-list')).clientHeight));
  await pressKey('End');
  await waitUntil('End goes to the bottom', async () => { const state = await scrollOf('scroll-list'); return nearly(state.scrollTop, state.maxScrollTop); });
  await pressKey('Home');
  await waitUntil('Home goes to the top', async () => (await scrollOf('scroll-list')).scrollTop === 0);
  const keysToGame = (await counts()).unhandledKeys;
  check('Keys that scrolled are not the game\'s', [KEY_PAGEDOWN, KEY_HOME, KEY_END].every((key) => keysToGame[key] === undefined), keysToGame);
  // Tab to a button below the fold shows it.
  for (let step = 0; step < MAX_REVEAL_TABS && (await scrollOf('scroll-list')).scrollTop === 0; step += 1) await pressKey('Tab');
  const focusedNow = await focusedId();
  const revealed = await scrollOf('scroll-list');
  check('Tabbing to a row below the fold scrolled the list', revealed.scrollTop > 0, revealed);
  const focusedRow = (await snapshot()).nodes.find((node) => node.id === focusedNow);
  const listRect = (await find('scroll-list')).rect;
  check('And the row Tab focused is in view', Boolean(focusedRow)
    && focusedRow.rect.y >= listRect.y - GEOMETRY_TOLERANCE && focusedRow.rect.y + focusedRow.rect.height <= listRect.y + listRect.height + GEOMETRY_TOLERANCE, { focusedRow: focusedRow?.rect, listRect });
  await capture('25-scroll-tab-reveals');

  // Chaining: the inner list first, then the outer one; contain keeps the rest from it and from the game.
  const inner = await scrollOf('chain-inner');
  const notches = Math.ceil(inner.maxScrollTop / (notchTicks() * inner.clientHeight / SCROLL_PAGE_DIVISOR)) + 1;
  for (let notch = 0; notch < notches; notch += 1) await wheelAt(await centerOf('chain-inner'), 0, WHEEL_TICK_PIXELS);
  await waitUntil('the inner list reaches its end and the outer one takes the rest', async () => {
    const [innerNow, outerNow] = await Promise.all([scrollOf('chain-inner'), scrollOf('chain-outer')]);
    return nearly(innerNow.scrollTop, innerNow.maxScrollTop) && outerNow.scrollTop > 0;
  });
  check('A nested list chains to its outer list', true, { inner: await scrollOf('chain-inner'), outer: await scrollOf('chain-outer') });
  const containGame = (await counts()).unhandledWheels;
  for (let notch = 0; notch < notches + 2; notch += 1) await wheelAt(await centerOf('contain-inner'), 0, WHEEL_TICK_PIXELS);
  await waitUntil('the contained inner list reaches its end', async () => { const state = await scrollOf('contain-inner'); return nearly(state.scrollTop, state.maxScrollTop); });
  check('overscroll-contain keeps the rest from the outer list', (await scrollOf('contain-outer')).scrollTop === 0, await scrollOf('contain-outer'));
  check('And from the game', (await counts()).unhandledWheels === containGame, await counts());
  await capture('26-scroll-chained');

  // Shift+wheel and horizontal wheel on the carousel.
  const carousel = await scrollOf('carousel');
  const tickX = carousel.clientWidth / SCROLL_PAGE_DIVISOR;
  await page.keyboard.down('Shift');
  await wheelAt(await centerOf('carousel'), 0, WHEEL_TICK_PIXELS);
  await page.keyboard.up('Shift');
  await waitUntil('Shift+wheel scrolls the carousel sideways', async () => nearly((await scrollOf('carousel')).scrollLeft, notchTicks() * tickX));
  check('Shift+wheel scrolls the carousel sideways', true, await scrollOf('carousel'));
  await wheelAt(await centerOf('carousel'), WHEEL_TICK_PIXELS, 0);
  await waitUntil('A horizontal wheel notch scrolls the carousel further right', async () => nearly((await scrollOf('carousel')).scrollLeft, 2 * notchTicks() * tickX));
  check('A horizontal wheel notch scrolls the carousel further right', true, await scrollOf('carousel'));
  await wheelAt(await centerOf('carousel'), -WHEEL_TICK_PIXELS, 0);
  await wheelAt(await centerOf('carousel'), -WHEEL_TICK_PIXELS, 0);
  await waitUntil('Opposite horizontal wheel notches return the carousel to the start', async () => (await scrollOf('carousel')).scrollLeft === 0);
  check('Opposite horizontal wheel notches return the carousel to the start', true, await scrollOf('carousel'));

  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns', () => nodeExists('app'));
  await demo('grabSurfaceFocus');
}

/**
 * Plan I5, touch half (the touch page): a swipe over a button scrolls the list, cancels the pointer and does not click;
 * the content coasts after the finger lifts; a swipe on a `touch-none` element is pointer events.
 */
async function runTouchScrollScenario() {
  await demo('showLab', 'scroll');
  await waitUntil('the scroll lab mounts on touch', () => nodeExists('scroll-lab'));
  await page.mouse.move(1, 1);
  await frames();
  const cdp = await page.createCDPSession();
  const touchAt = async (type, point) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: point.x, y: point.y, id: 1 }] });
    await frames();
  };
  const list = await find('touch-list');
  const start = await pagePoint(list.rect.x + list.rect.width / 2, list.rect.y + list.rect.height - 20);
  const clicksOf = async () => Number(/clicks (\d+)$/.exec(await text('touch-status'))?.[1]);

  await demo('resetPointerCancels');
  const cancelsBefore = await demo('pointerCancels');
  await touchAt('touchStart', start);
  let finger = start;
  for (let step = 1; step <= SWIPE_STEPS; step += 1) {
    finger = { x: start.x, y: start.y - step * SWIPE_STEP_PX };
    await touchAt('touchMove', finger);
  }
  // The finger lifts while it is still moving: the release velocity is sampled over the last frames, and a finger that rested
  // for over a tenth of a second flings nothing (native/scroll.rs `MOMENTUM_SAMPLE_INTERVAL_S`), so nothing is awaited before it.
  await touchAt('touchEnd', finger);
  await waitUntil('the swipe scrolls the list', async () => (await scrollOf('touch-list')).scrollTop > 0);
  check('A swipe starting on a button pans the list', (await scrollOf('touch-list')).scrollTop > 0, await scrollOf('touch-list'));
  check('The pointer was cancelled when the pan began', (await demo('pointerCancels')) === cancelsBefore + 1, await demo('pointerCancels'));
  check('No click follows a pan', (await clicksOf()) === 0, await text('touch-status'));
  // The content keeps going after the finger lifted and comes to rest on its own, further than the finger took it (the
  // first step is the slop, which is not scrolled).
  const fingerScroll = (SWIPE_STEPS - 1) * SWIPE_STEP_PX;
  const deadline = Date.now() + COAST_DEADLINE_MS;
  let last = Number.NaN;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, COAST_POLL_MS));
    const now = (await scrollOf('touch-list')).scrollTop;
    if (now === last) break;
    last = now;
  }
  const rested = (await scrollOf('touch-list')).scrollTop;
  check('The content coasts after the finger lifts and comes to rest by itself', rested > fingerScroll + MIN_COAST_PX && rested === last, { fingerScroll, rested });
  check('A pan leaves no pointer down', (await snapshot()).pointers.every((entry) => !entry.down), (await snapshot()).pointers);
  await capture('28-scroll-touch-pan');

  // A tap still clicks; touch-none keeps the finger's events.
  await click('touch-top');
  const tapPoint = await pagePoint(list.rect.x + list.rect.width / 2, list.rect.y + list.rect.height - 40);
  await page.touchscreen.tap(tapPoint.x, tapPoint.y);
  await waitUntil('a tap clicks the row under it', async () => (await clicksOf()) === 1);
  check('A tap on a button in a scroll container clicks it', true, await text('touch-status'));
  const pad = await centerOf('touch-pad');
  const padPoint = await pagePoint(pad.x, pad.y);
  const topBefore = (await scrollOf('touch-list')).scrollTop;
  await touchAt('touchStart', padPoint);
  for (let step = 1; step <= 4; step += 1) await touchAt('touchMove', { x: padPoint.x, y: padPoint.y + 4 * step });
  await touchAt('touchEnd', padPoint);
  await expectTextWhere('touch-status', 'The pad gets pointermove instead of the list panning', (value) => /moves [1-9]\d*, cancels 0/.test(value));
  check('touch-action: none keeps a touch from panning', (await scrollOf('touch-list')).scrollTop === topBefore, await scrollOf('touch-list'));
  await cdp.detach();

  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns on touch', () => nodeExists('app'));
  await demo('grabSurfaceFocus');
}

/** A mouse press becomes a drag beyond this many logical pixels (`Viewport.gui_drag_threshold`'s default, 10), and how far inside it a move stays. */
const DRAG_BEYOND_THRESHOLD_PX = 12;
const DRAG_WITHIN_THRESHOLD_PX = 5;
/** Godot's Web display server shows can-drop as the CSS cursor `grabbing` and forbidden as `no-drop` (display_server_web.cpp). */
const CSS_CURSOR_CAN_DROP = 'grabbing';
const CSS_CURSOR_FORBIDDEN = 'no-drop';
/** The palette item (amber-100) at the ghost's 60 % over the lab's page (slate-50), as a canvas pixel; its tolerance in 8-bit levels. */
const AMBER_100_RGB = [0xfe, 0xf3, 0xc7];
const PAGE_FILL_RGB = [0xf8, 0xfa, 0xfc];
const GHOST_OPACITY = 0.6;
const GHOST_PIXEL_TOLERANCE = 8;
const GHOST_PROBE_INSET = 6;
/** The pointer rests this close to the list's bottom edge, inside its edge band, while it auto-scrolls. */
const AUTOSCROLL_BAND_PX = 12;
const AUTOSCROLL_DEADLINE_MS = 12_000;
const AUTOSCROLL_SAMPLE_MS = 150;
/** How long a touch must be held still to become a drag (native/drag.rs `TOUCH_DRAG_HOLD_MS`). */
const TOUCH_HOLD_MS = 500;
const HOLD_DEADLINE_MS = 5_000;
const TOUCH_SWIPE_STEP_PX = 15;
const DRAG_LIST_ROWS = 20;

async function idOf(testID) {
  return (await find(testID)).id;
}

async function dragState() {
  return (await snapshot()).drag;
}

/** The canvas pixel (RGB) under a logical point, from a real screenshot of the canvas. */
async function canvasPixel(logical) {
  const data = await snapshot();
  const canvas = await page.$('canvas');
  assert.ok(canvas, 'Godot canvas vanished');
  const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: ACTION_TIMEOUT_MS })));
  await canvas.dispose();
  const scale = image.width / data.width;
  const offset = (Math.floor(logical.y * scale) * image.width + Math.floor(logical.x * scale)) * image.channels;
  return [image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2]];
}

const near = (pixel, expected, tolerance) => pixel.every((channel, index) => Math.abs(channel - expected[index]) <= tolerance);

/**
 * Plan I9, mouse half: drags in real Chrome at both device pixel ratios. Reordering and a cross-column move, the
 * event sequence and `pointercancel` without a `click`, effect negotiation and the CSS cursor, Escape, a release
 * beyond the page, the ghost in the canvas's pixels, edge auto-scroll with the target following the scroll under a
 * stationary pointer. Mirrors the native `drag` section.
 */
async function runDragScenario() {
  await demo('showLab', 'hud');
  await demo('showLab', 'drag');
  await waitUntil('the drag lab mounts', () => nodeExists('drag-lab'));
  await page.mouse.move(1, 1);
  await frames();
  const board = () => text('board-status');
  const log = () => text('drag-log');
  const clicks = async () => Number(/clicks (\d+)$/.exec(await text('drop-status'))?.[1]);
  const logical = async (testID) => centerOf(testID);
  const pageOf = async (point) => pagePoint(point.x, point.y);
  const press = async (from) => {
    const start = await pageOf(from);
    await page.mouse.move(start.x, start.y);
    await frames();
    await page.mouse.down();
    await frames();
  };
  const moveToLogical = async (point) => {
    const target = await pageOf(point);
    await page.mouse.move(target.x, target.y);
    await frames();
  };
  const settled = async (predicate, name) => waitUntil(name, async () => predicate(await dragState()));

  check('Nothing is dragging at first', (await dragState()).session === 0, await dragState());
  check('The board starts as designed', (await board()) === 'todo: a,b,c | doing: d,e', await board());

  // Reorder: a press inside a draggable element is pending; past the threshold it is a drag and the pointer is cancelled.
  const a = await logical('card-a');
  const c = await logical('card-c');
  await demo('resetPointerCancels');
  await press(a);
  await moveToLogical({ x: a.x, y: a.y + DRAG_WITHIN_THRESHOLD_PX });
  const pending = await dragState();
  check('Within the threshold a press is pending', pending.state === 'pending' && pending.source === await idOf('card-a') && (await demo('pointerCancels')) === 0, pending);
  await moveToLogical({ x: a.x, y: a.y + DRAG_BEYOND_THRESHOLD_PX });
  await settled((drag) => drag.state === 'dragging', 'past the threshold the press becomes a drag');
  check('Starting a drag cancels the pointer once', (await demo('pointerCancels')) === 1, await demo('pointerCancels'));
  check('The drag has a ghost', (await dragState()).ghost !== null, await dragState());
  check('A running drag listens for Escape', await demo('surfaceProcessingInput'));
  await moveToLogical(c);
  await settled((drag) => drag.target !== null && drag.allowedEffect === 'move', 'over card c, which prevents dragover, the drop is accepted');
  check('The target is card c', (await dragState()).target === await idOf('card-c'), await dragState());
  // Godot asks for the cursor before it hands over the motion, so the canvas shows it from the next motion on.
  await moveToLogical({ x: c.x + 1, y: c.y });
  await expectCanvasCursor(CSS_CURSOR_CAN_DROP, 'Over a target that accepts, the cursor is can-drop');
  await capture('30-drag-reorder');
  await page.mouse.up();
  await frames();
  await waitUntil('the drop reorders the board', async () => (await board()) === 'todo: b,a,c | doing: d,e');
  check('The event sequence is dragstart, dragenter, dragenter, drop, dragend',
    (await log()) === 'dragstart a > dragenter card-a > dragenter card-c > drop a move > dragend move', await log());
  check('No click follows a drag', (await clicks()) === 0, await text('drop-status'));
  const reordered = await dragState();
  check('The drop is reported', reordered.lastEnd?.reason === 'dropped' && reordered.lastEnd.dropEffect === 'move' && reordered.ghost === null, reordered);
  check('Nothing keeps frames or input after the drag', !(await demo('surfaceProcessing')) && !(await demo('surfaceProcessingInput')));

  // Between columns, onto the trash, and the refusals.
  const b = await logical('card-b');
  const e = await logical('card-e');
  await press(b);
  await moveToLogical({ x: b.x, y: b.y + DRAG_BEYOND_THRESHOLD_PX });
  await moveToLogical(e);
  await page.mouse.up();
  await waitUntil('a card moves to the other column', async () => (await board()) === 'todo: a,c | doing: d,b,e');
  const trash = await logical('trash');
  const cardC = await logical('card-c');
  await press(cardC);
  await moveToLogical({ x: cardC.x, y: cardC.y + DRAG_BEYOND_THRESHOLD_PX });
  await moveToLogical(trash);
  await settled((drag) => drag.allowedEffect === 'move', 'the trash accepts a move');
  await page.mouse.up();
  await waitUntil('the trash takes the card', async () => (await board()) === 'todo: a | doing: d,b,e');
  const palette = await logical('palette');
  await press(palette);
  await moveToLogical({ x: palette.x, y: palette.y + DRAG_BEYOND_THRESHOLD_PX });
  await moveToLogical(trash);
  await settled((drag) => drag.state === 'dragging' && drag.target !== null, 'the pointer is over the trash');
  check('A copy-only source is refused by the trash', (await dragState()).allowedEffect === null, await dragState());
  await moveToLogical({ x: trash.x + 1, y: trash.y });
  await expectCanvasCursor(CSS_CURSOR_FORBIDDEN, 'Where nothing accepts, the cursor is forbidden');
  await page.mouse.up();
  await frames();
  const refused = await dragState();
  check('Released over a target that refused, the drag ends with no effect', refused.lastEnd?.reason === 'released' && refused.lastEnd.dropEffect === 'none', refused);
  check('And nothing was dropped', !(await log()).slice((await log()).lastIndexOf('dragstart')).includes('drop '), await log());

  // Escape cancels and is accepted.
  const boardBefore = await board();
  const cardA = await logical('card-a');
  await press(cardA);
  await moveToLogical({ x: cardA.x, y: cardA.y + DRAG_BEYOND_THRESHOLD_PX });
  await settled((drag) => drag.state === 'dragging', 'a drag to cancel');
  await demo('resetRootKeys');
  await focusCanvas();
  await pressKey('Escape');
  await settled((drag) => drag.lastEnd?.reason === 'escape', 'Escape cancels the drag');
  const cancelled = await dragState();
  check('A cancelled drag is not a drop and not a release outside the root', cancelled.lastEnd.dropEffect === 'none' && !cancelled.lastEnd.endedOutsideRoot && cancelled.ghost === null, cancelled);
  check('Escape was accepted: JS never saw the key', !(await demo('rootKeys')).includes('Escape'), await demo('rootKeys'));
  await page.mouse.up();
  await frames();
  check('Releasing the held pointer drops nothing', (await board()) === boardBefore, await board());

  // A release beyond the page: endedOutsideRoot and the release point.
  const viewportSize = page.viewport();
  const cardAAgain = await logical('card-a');
  await press(cardAAgain);
  await moveToLogical({ x: cardAAgain.x, y: cardAAgain.y + DRAG_BEYOND_THRESHOLD_PX });
  await page.mouse.move(viewportSize.width + OUTSIDE_THE_PAGE_PX, viewportSize.height / 2);
  await settled((drag) => drag.state === 'dragging' && drag.position !== null && drag.position.x > viewportSize.width, 'the pointer leaves the page');
  await page.mouse.up();
  await frames();
  const outside = await dragState();
  check('Released beyond the page, the drag says so', outside.lastEnd?.endedOutsideRoot === true && outside.lastEnd.dropEffect === 'none', outside);
  await waitUntil('the source reports where the drag ended', async () => /outside true at \d+,\d+ viewport \d+,\d+$/.test(await text('end-status')) && Number(/at (\d+),/.exec(await text('end-status'))?.[1]) > viewportSize.width);

  // The ghost: the palette chip at 60 % over the page, following the pointer with the grab offset.
  const paletteRect = (await find('palette')).rect;
  const logRect = (await find('drag-log')).rect;
  const spot = { x: 40, y: logRect.y + logRect.height + 40 };
  const grab = { x: paletteRect.x + paletteRect.width / 4, y: paletteRect.y + paletteRect.height / 2 };
  await press(grab);
  await moveToLogical({ x: grab.x, y: grab.y + DRAG_BEYOND_THRESHOLD_PX });
  const target = { x: spot.x + (grab.x - paletteRect.x), y: spot.y + paletteRect.height / 2 };
  await moveToLogical(target);
  await settled((drag) => drag.ghost !== null && Math.abs(drag.ghost.x - spot.x) < 1 && Math.abs(drag.ghost.y - spot.y) < 1, 'the ghost follows the pointer');
  const probe = { x: spot.x + GHOST_PROBE_INSET, y: spot.y + paletteRect.height / 2 };
  const blended = AMBER_100_RGB.map((channel, index) => channel * GHOST_OPACITY + PAGE_FILL_RGB[index] * (1 - GHOST_OPACITY));
  const ghostPixel = await canvasPixel(probe);
  check('The ghost is the chip at 60 % over the page', near(ghostPixel, blended, GHOST_PIXEL_TOLERANCE), { ghostPixel, blended });
  const sourcePixel = await canvasPixel({ x: paletteRect.x + GHOST_PROBE_INSET, y: paletteRect.y + paletteRect.height / 2 });
  check('The source stays at full opacity', near(sourcePixel, AMBER_100_RGB, GHOST_PIXEL_TOLERANCE), sourcePixel);
  await capture('31-drag-ghost');
  await page.mouse.up();
  await frames();
  check('The ghost is gone with the drag', near(await canvasPixel(probe), PAGE_FILL_RGB, GHOST_PIXEL_TOLERANCE) && (await dragState()).ghost === null);

  // Edge auto-scroll, and the target following the scroll under a stationary pointer.
  const list = (await find('drag-list')).rect;
  const palette2 = await logical('palette');
  await press(palette2);
  await moveToLogical({ x: palette2.x, y: palette2.y + DRAG_BEYOND_THRESHOLD_PX });
  await moveToLogical({ x: list.x + list.width / 2, y: list.y + list.height / 2 });
  check('Away from the edge the list rests and the root asks for no frames', (await scrollOf('drag-list')).scrollTop === 0 && !(await demo('surfaceProcessing')));
  const edge = { x: list.x + list.width / 2, y: list.y + list.height - 1 - AUTOSCROLL_BAND_PX };
  await moveToLogical(edge);
  const seen = new Set();
  const deadline = Date.now() + AUTOSCROLL_DEADLINE_MS;
  let state = await scrollOf('drag-list');
  while (state.scrollTop < state.maxScrollTop - SCROLL_TOLERANCE) {
    assert.ok(Date.now() < deadline, `The list scrolled to ${state.scrollTop} of ${state.maxScrollTop} in ${AUTOSCROLL_DEADLINE_MS} ms`);
    await new Promise((resolve) => setTimeout(resolve, AUTOSCROLL_SAMPLE_MS));
    state = await scrollOf('drag-list');
    seen.add((await dragState()).target);
  }
  check('The list auto-scrolled to its end', true, state);
  check('The target was looked up again as the list scrolled under the stationary pointer', seen.size >= 3, [...seen]);
  await waitUntil('the pointer is over the last row', async () => (await dragState()).target === await idOf(`row-${DRAG_LIST_ROWS - 1}`));
  check('With the list at its end nothing asks for frames', !(await demo('surfaceProcessing')));
  await capture('32-drag-autoscroll');
  await page.mouse.up();
  await expectTextWhere('drop-status', 'The drop landed on the last row', (value) => value.includes(`list palette onto row ${DRAG_LIST_ROWS - 1}`));
  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns', () => nodeExists('app'));
  await demo('grabSurfaceFocus');
}

/**
 * Plan I9, touch half (the touch page): a touch held still on a draggable element becomes a drag, and a finger that
 * moves first pans the list instead, with no drag, no click and one pointercancel.
 */
async function runTouchDragScenario() {
  await demo('showLab', 'drag');
  await waitUntil('the drag lab mounts on touch', () => nodeExists('drag-lab'));
  await page.mouse.move(1, 1);
  await frames();
  const cdp = await page.createCDPSession();
  const touchAt = async (type, point) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: point.x, y: point.y, id: 1 }] });
    await frames();
  };
  const board = () => text('board-status');
  const clicks = async () => Number(/clicks (\d+)$/.exec(await text('drop-status'))?.[1]);
  const pageOf = async (logicalPoint) => pagePoint(logicalPoint.x, logicalPoint.y);

  // Hold, then move: a drag. Nothing starts before the hold elapses.
  const d = await pageOf(await centerOf('card-d'));
  const b = await pageOf(await centerOf('card-b'));
  await demo('resetPointerCancels');
  await touchAt('touchStart', d);
  const heldSince = Date.now();
  const pending = await dragState();
  check('A touch on a draggable element waits to see which it is', pending.state === 'pending' && pending.pointer >= FIRST_TOUCH_ID, pending);
  check('Waiting out the hold asks for frames', await demo('surfaceProcessing'));
  await waitUntil('the hold starts the drag', async () => (await dragState()).state === 'dragging', HOLD_DEADLINE_MS);
  check('It began after the hold, not before', Date.now() - heldSince >= TOUCH_HOLD_MS - 100, Date.now() - heldSince);
  check('The pointer was cancelled and a ghost shows', (await demo('pointerCancels')) === 1 && (await dragState()).ghost !== null, await dragState());
  await touchAt('touchMove', b);
  await waitUntil('the finger moves the drag', async () => (await dragState()).target === await idOf('card-b'));
  await capture('33-drag-touch-hold');
  const clicksBefore = await clicks();
  const boardBefore = await board();
  await touchAt('touchEnd', b);
  await waitUntil('lifting the finger drops', async () => (await board()) !== boardBefore);
  check('A touch drag does not click', (await clicks()) === clicksBefore && (await dragState()).lastEnd?.reason === 'dropped', await dragState());

  // A swipe on a draggable row pans the list: the drag is declined.
  const rows = (await find('drag-list')).rect;
  const sessionBefore = (await dragState()).session;
  const logBefore = await text('drag-log');
  const start = await pageOf({ x: rows.x + rows.width / 2, y: rows.y + 2 * AUTOSCROLL_BAND_PX + 10 });
  await demo('resetPointerCancels');
  await touchAt('touchStart', start);
  check('A touch on a draggable row waits too', (await dragState()).state === 'pending', await dragState());
  let finger = start;
  for (let step = 1; step <= 4; step += 1) {
    finger = { x: start.x, y: start.y - step * TOUCH_SWIPE_STEP_PX };
    await touchAt('touchMove', finger);
  }
  await waitUntil('the swipe scrolls the list', async () => (await scrollOf('drag-list')).scrollTop > 0);
  const swiped = await dragState();
  check('Moving first declines the drag', swiped.session === sessionBefore && swiped.state !== 'dragging', swiped);
  check('The pan cancelled the pointer once', (await demo('pointerCancels')) === 1, await demo('pointerCancels'));
  await touchAt('touchEnd', finger);
  await waitUntil('the list comes to rest', async () => !(await demo('surfaceProcessing')), HOLD_DEADLINE_MS);
  check('The swipe made no drag event and no click', (await text('drag-log')) === logBefore && (await clicks()) === clicksBefore, await text('drag-log'));

  // A quick tap still clicks.
  const tap = await pageOf(await centerOf('card-a'));
  await page.touchscreen.tap(tap.x, tap.y);
  await waitUntil('a tap clicks', async () => (await clicks()) === clicksBefore + 1);
  check('A tap starts no drag', (await dragState()).session === sessionBefore, await dragState());
  await cdp.detach();

  await page.mouse.move(1, 1);
  await frames();
  await demo('restoreDemo');
  await waitUntil('the demo returns on touch', () => nodeExists('app'));
  await demo('grabSurfaceFocus');
}

/** What Godot's key names (`OS.getKeycodeString`) are called by a browser keyboard (Puppeteer's key names). */
const BROWSER_KEY_NAMES = {
  Left: 'ArrowLeft', Right: 'ArrowRight', Up: 'ArrowUp', Down: 'ArrowDown', Home: 'Home', End: 'End', PageUp: 'PageUp',
  PageDown: 'PageDown', Backspace: 'Backspace', Delete: 'Delete', Enter: 'Enter', Tab: 'Tab', Space: ' ',
};

/** Press the keys the project's `InputMap` binds to `action` on this platform, with real Chrome input. */
async function pressAction(action, { shift = false, times = 1 } = {}) {
  const binding = await demo('actionKey', action);
  const key = BROWSER_KEY_NAMES[binding.key] ?? (binding.key.length === 1 ? binding.key.toLowerCase() : binding.key);
  const modifiers = [
    ...(binding.ctrl ? ['Control'] : []), ...(binding.alt ? ['Alt'] : []), ...(binding.meta ? ['Meta'] : []),
    ...(binding.shift || shift ? ['Shift'] : []),
  ];
  for (let count = 0; count < times; count += 1) await pressKey(key, [...modifiers]);
}

/** The state native holds of the text input `testID`: value, selection, composition. */
async function inputState(testID) {
  const { textInput } = await find(testID);
  assert.ok(textInput, `${testID} is not a text input`);
  return textInput;
}

async function expectInput(testID, predicate, name) {
  await waitUntil(name, async () => predicate(await inputState(testID)));
  check(name, true, await inputState(testID));
}

/** The form lab's JSON readout, parsed. */
async function formReadout() {
  return JSON.parse(await text('form-json'));
}

/**
 * Phase I7: text inputs in a real browser. Real Chrome key events type, select and move (the keys are the project's
 * own InputMap actions, as the native verifier presses them); an IME composition and its commit come through the
 * Chrome DevTools Protocol (`Input.imeSetComposition`, `Input.insertText`), which is how Godot's Web IME element hears
 * them. The platform facts are recorded: with `html/experimental_virtual_keyboard` on, desktop Chrome has no
 * `ontouchstart`, so the engine keeps the IME path (and has no virtual keyboard).
 */
async function runFormsScenario(viewport) {
  await demo('showLab', 'forms');
  await waitUntil('the forms lab mounts', () => nodeExists('forms-lab'));
  const facts = await demo('platformFacts');
  report.platformFacts = { ...(report.platformFacts ?? {}), [viewport.name]: facts };
  check('Desktop Chrome keeps the IME path and has no virtual keyboard', facts.ime === true && facts.virtualKeyboard === false, facts);

  // Typing and selecting with real keys.
  await click('form-name');
  await expectFocused((await find('form-name')).id, 'A press focuses the name field');
  await page.keyboard.type('Ada Lovelace');
  await expectInput('form-name', (state) => state.value === 'Ada Lovelace' && state.selectionStart === 12, 'Typing puts the text in the field');
  check('React followed the typing', (await formReadout()).name === 'Ada Lovelace');
  await pressAction('ui_text_caret_left', { shift: true, times: 4 });
  await expectInput('form-name', (state) => state.selectionStart === 8 && state.selectionEnd === 12, 'Shift+Left four times selects four characters');
  await pressAction('ui_text_caret_word_left');
  await expectInput('form-name', (state) => state.selectionStart === 4 && state.selectionEnd === 4, 'A word jump stands at the start of "Lovelace"');
  await pressAction('ui_text_select_all');
  await page.keyboard.type('x');
  await expectInput('form-name', (state) => state.value === 'x', 'Typing over a selection replaces it');
  await pressAction('ui_undo');
  await expectInput('form-name', (state) => state.value === 'Ada Lovelace', 'Undo puts the text back');
  await capture(`forms-01-typing-${viewport.name}`);

  // The caret is drawn in the real canvas: a pixel of its colour on the caret rectangle.
  await waitUntil('the caret blinks on', async () => (await inputState('form-name')).caretVisible);
  const caret = (await inputState('form-name')).caret;
  check('The focused field has a caret rectangle', caret !== null && caret.height > 0, caret);

  await runImeScenario(viewport);
  await runCompositionFixesScenario();
  await runPasteScenario();
  await runMultilineScenario();
}

/** A text area in real Chrome: Enter, vertical movement, scrolling to the caret, and the wheel (the text first, then the page). */
async function runMultilineScenario() {
  await demo('showLab', 'forms');
  await click('form-notes');
  await expectFocused((await find('form-notes')).id, 'A press focuses the text area');
  const lines = ['first', 'second', 'third', 'fourth', 'fifth'];
  await page.keyboard.type(lines.join('\n'));
  await expectInput('form-notes', (state) => state.value === lines.join('\n'), 'Enter makes a line break in a text area');
  const readout = await formReadout();
  check('Enter in a text area submits nothing, and React holds the line breaks', readout.submitted === 0 && readout.notes === lines.join('\n'), readout);
  const scrollOf = async (testID) => (await find(testID)).scroll;
  const typed = await scrollOf('form-notes');
  check('The text area scrolled to the caret as the lines were typed', typed.scrollHeight > typed.clientHeight && typed.scrollTop > 0, typed);
  await pressAction('ui_text_caret_up', { times: 2 });
  // The column is a pixel position, not a character count ("fifth" is narrower than "fourth"), so the third line is a range.
  const thirdStart = lines.slice(0, 2).join('\n').length + 1;
  const thirdEnd = lines.slice(0, 3).join('\n').length;
  await expectInput('form-notes', (state) => state.selectionStart >= thirdStart && state.selectionStart <= thirdEnd && state.selectionStart === state.selectionEnd,
    'Up twice stands on the third line');
  await pressAction('ui_text_caret_document_start');
  await expectInput('form-notes', (state) => state.selectionStart === 0, 'The document start is the first line');
  await waitUntil('the text scrolls back to the caret', async () => (await scrollOf('form-notes')).scrollTop === 0);

  // The wheel scrolls the text before the page, and the page after the text.
  const { rect } = await find('form-notes');
  const over = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  check('The page has not scrolled', (await scrollOf('forms-lab')).scrollTop === 0);
  await wheelAt(over, 0, WHEEL_TICK_PIXELS);
  await waitUntil('the first tick scrolls the text', async () => (await scrollOf('form-notes')).scrollTop > 0);
  check('The page stays where it was', (await scrollOf('forms-lab')).scrollTop === 0, await scrollOf('forms-lab'));
  let atEnd = false;
  for (let step = 0; step < 20 && !atEnd; step += 1) {
    await wheelAt(over, 0, WHEEL_TICK_PIXELS);
    const state = await scrollOf('form-notes');
    atEnd = state.scrollTop >= state.scrollHeight - state.clientHeight - 1;
    if (!atEnd) check('The page stays while the text can scroll', (await scrollOf('forms-lab')).scrollTop === 0, state);
  }
  check('The wheel reaches the end of the text', atEnd);
  await wheelAt(over, 0, WHEEL_TICK_PIXELS);
  await waitUntil('a tick at the end of the text scrolls the page', async () => (await scrollOf('forms-lab')).scrollTop > 0);
  await capture('forms-05-text-area');
}

/**
 * Copy, cut and paste through the browser's clipboard. The engine's `clipboard_get` cannot read it (it starts an asynchronous
 * `navigator.clipboard.readText()` and returns what the call before it read), and the shortcut never makes the browser fire
 * `paste` (the engine prevents every `keydown`), so a paste used to insert the clipboard as of one paste earlier. The root asks
 * the browser itself and pastes when it answers (`native/text_input_godot/web_clipboard.rs`). The page's own listeners record
 * the order of the keydown, the `paste` event and the read.
 */
async function runPasteScenario() {
  await demo('showLab', 'forms');
  await click('form-name');
  await page.evaluate(() => {
    if (window.__pasteLog) return;
    const log = (window.__pasteLog = []);
    const note = (kind, extra = {}) => log.push({ t: Math.round(performance.now() * 10) / 10, kind, ...extra });
    window.addEventListener('keydown', (event) => { if (event.key.toLowerCase() === 'v') note('keydown', { defaultPrevented: event.defaultPrevented }); }, false);
    window.addEventListener('paste', (event) => note('paste', { text: event.clipboardData.getData('text') }), true);
    const clipboard = navigator.clipboard;
    const read = clipboard.readText.bind(clipboard);
    clipboard.readText = () => { note('readText:call'); return read().then((text) => { note('readText:resolved', { text }); return text; }); };
    window.__readText = read;
  });
  const takeLog = () => page.evaluate(() => window.__pasteLog.splice(0));
  const setClipboard = (text) => page.evaluate((value) => navigator.clipboard.writeText(value), text);
  const valueOf = async () => (await inputState('form-name')).value;
  await pressAction('ui_text_select_all');
  await page.keyboard.type('abc');
  await expectInput('form-name', (state) => state.value === 'abc', 'Typing starts from a known text');

  // Copy and cut write the browser's clipboard (`navigator.clipboard.writeText`, from the key's own task).
  await setClipboard('before the copy');
  await pressAction('ui_text_select_all');
  await pressAction('ui_copy');
  await waitUntil('Copy reaches the browser clipboard', async () => (await browserClipboard()) === 'abc');
  await pressAction('ui_text_caret_line_end');
  await page.keyboard.type(' def');
  await pressAction('ui_text_caret_word_left', { shift: true });
  await pressAction('ui_cut');
  await waitUntil('Cut reaches the browser clipboard', async () => (await browserClipboard()) === 'def');
  await expectInput('form-name', (state) => state.value === 'abc ' && state.selectionStart === 4, 'Cut removes the selection');

  // The first paste after the clipboard changed inserts the new clipboard, and so does every one after it.
  await takeLog();
  await setClipboard('alpha');
  await pressAction('ui_paste');
  await expectInput('form-name', (state) => state.value === 'abc alpha', 'The first paste after the clipboard changed inserts the new text');
  const order = await takeLog();
  const kinds = order.map((entry) => entry.kind);
  check('No paste event reaches the page: the engine prevented the keydown', !kinds.includes('paste')
    && order.find((entry) => entry.kind === 'keydown')?.defaultPrevented === true, order);
  check('The root asked the browser for the clipboard once for one paste', kinds.filter((kind) => kind === 'readText:call').length === 1, order);
  await setClipboard('beta');
  await pressAction('ui_paste');
  await expectInput('form-name', (state) => state.value === 'abc alphabeta', 'A paste after another change inserts the changed text');
  await pressAction('ui_paste');
  await expectInput('form-name', (state) => state.value === 'abc alphabetabeta', 'A paste with the clipboard unchanged inserts it again');
  const log = await text('form-log');
  check('A paste reaches JS as an insertFromPaste input', log.includes('input:insertFromPaste'), log);
  check('React holds the pasted text', (await formReadout()).name === 'abc alphabetabeta');
  await pressAction('ui_undo');
  await expectInput('form-name', (state) => state.value === 'abc alphabeta', 'Undo takes back one paste');

  // A paste into a field that cannot take it never asks the browser; a refused read leaves the field as it is and says so.
  await click('form-readonly');
  await takeLog();
  await pressAction('ui_text_select_all');
  await pressAction('ui_paste');
  await frames();
  check('A read-only field does not read the clipboard', !(await takeLog()).some((entry) => entry.kind === 'readText:call'));
  await click('form-name');
  await page.evaluate(() => { navigator.clipboard.readText = () => Promise.reject(new DOMException('denied by the verifier', 'NotAllowedError')); });
  // Godot prints an error as two console lines: the message and where it was raised.
  expectedConsoleErrors.push(/the browser refused to read the clipboard/, /at: godot_react_ui::.*refuse_web_paste/);
  await pressAction('ui_paste');
  await waitUntil('The refusal is reported', () => expectedConsoleErrors.length === 0);
  check('A refused read pastes nothing', (await valueOf()) === 'abc alphabeta');
  await page.evaluate(() => { navigator.clipboard.readText = () => { window.__pasteLog.push({ kind: 'readText:call' }); return window.__readText(); }; });
  await setClipboard('gamma');
  await pressAction('ui_paste');
  await expectInput('form-name', (state) => state.value === 'abc alphabetagamma', 'Pasting works again once the browser allows the read');

  // A clipboard that holds an image has no text: `readText()` resolves to "". The engine reaches the browser's clipboard only
  // through `readText`, so that is all it can see of one, and the page's own clipboard (scripts/web-clipboard.mjs) holds only
  // text: "nothing but an image" is the empty text it reads. That is no paste. It must leave a selection alone, where an empty
  // insertion over it would have deleted it.
  await pressAction('ui_text_select_all');
  const beforeImage = await inputState('form-name');
  await setClipboard('');
  check('An image on the clipboard reads as empty text', (await page.evaluate(() => window.__readText())) === '');
  await takeLog();
  await pressAction('ui_paste');
  await waitUntil('the paste asks the browser', async () => (await page.evaluate(() => window.__pasteLog.some((entry) => entry.kind === 'readText:call'))));
  for (let step = 0; step < 6; step += 1) await frames();
  const afterImage = await inputState('form-name');
  check('Pasting an image over a selection changes neither the text, the selection nor the count',
    afterImage.value === beforeImage.value && afterImage.selectionStart === 0 && afterImage.selectionEnd === beforeImage.value.length
    && afterImage.eventCount === beforeImage.eventCount, { beforeImage, afterImage });
  await capture('forms-04-paste');
}

/** An IME composition: the preedit shows in the field and commits as one edit, with composition events. */
async function runImeScenario(viewport) {
  await demo('showLab', 'forms');
  await click('form-name');
  const cdp = await page.createCDPSession();
  // The engine's IME element re-takes DOM focus every 100 ms while an input is focused.
  await page.keyboard.press('Home');
  // The key must have reached the field before the composition starts: the engine's IME start drops the last raw key that is
  // still queued (`DisplayServerWeb::_ime_callback`, case 0), because on a real keyboard that key is the one that began the
  // composition. A Home that was still queued would be dropped, and the preedit would open at the end of the text.
  await expectInput('form-name', (state) => state.selectionStart === 0 && state.selectionEnd === 0, 'Home moves the caret to the start');
  await waitUntil('the IME element holds browser focus', async () => page.evaluate(() => document.activeElement?.className === 'ime'));
  await cdp.send('Input.imeSetComposition', { text: 'ñ', selectionStart: 1, selectionEnd: 1 });
  await expectInput('form-name', (state) => state.composing && state.preedit?.text === 'ñ', 'imeSetComposition shows the preedit in the field');
  const composing = await inputState('form-name');
  check('The preedit is drawn but is not the value', composing.displayText.includes('ñ') && !composing.value.includes('ñ'), composing);
  await waitUntil('the composition events reach JS', async () => (await text('form-log')).includes('compositionstart compositionupdate:ñ'));
  await capture(`forms-02-ime-preedit-${viewport.name}`);
  await cdp.send('Input.imeSetComposition', { text: 'ñe', selectionStart: 2, selectionEnd: 2 });
  await expectInput('form-name', (state) => state.preedit?.text === 'ñe', 'A second composition update changes the preedit');
  await cdp.send('Input.imeSetComposition', { text: 'ñ', selectionStart: 1, selectionEnd: 1 });
  await cdp.send('Input.insertText', { text: 'ñ' });
  await expectInput('form-name', (state) => !state.composing && state.value === 'ñAda Lovelace', 'insertText commits the composition into the value');
  const log = await text('form-log');
  check('One composition: start, updates, end, then one input for the commit', /compositionstart compositionupdate:ñ compositionupdate:ñe compositionupdate:ñ compositionend input:insertText$/.test(log), log);
  check('React holds the committed text', (await formReadout()).name.startsWith('ñ'));
  // Leaving the field turns the IME off. The engine does that by focusing the canvas, whose focus listener notifies every node
  // at once, on the game's own thread; the root must be able to take that notification in the middle of its own call. A key does
  // it with the IME element holding browser focus (a press on the canvas would have given the canvas the focus already, and the
  // engine's call would have nothing to notify).
  await waitUntil('the IME element holds browser focus again', async () => page.evaluate(() => document.activeElement?.className === 'ime'));
  await page.keyboard.press('Tab');
  await expectFocused((await find('form-password')).id, 'Tab takes focus from the name field to the next');
  await frames();
  check('Leaving a field with the IME focused raised no error', fatalErrors.length === 0, fatalErrors);
  await cdp.detach();
}

/**
 * What leaving a field, or making it read-only, does to a composition in progress, in real Chrome (the IME's own
 * commit and cancel cannot be injected natively). A composition left unfinished by leaving the field is committed as an
 * `insertText` through `beforeinput`, as a browser and `LineEdit` do, and a `beforeinput` that refuses it discards it. A
 * field that is made read-only while composing ends the composition (every keyboard command is refused while a
 * composition is on, and a read-only field would never have ended it).
 *
 * The engine's Web IME drops every raw key while a composition is under way (`DisplayServerWeb::_key_callback` returns when
 * `ime_started`), so the field is left, and made read-only, by compositions of their own (`forms-extra-lab.tsx`). And it only clears
 * `ime_started` when the IME's commit arrives while the IME is active (`_ime_callback`, case 2), which a composition ended
 * by leaving the field never does: the keys stay dropped until one more composition is committed. That is the engine's, it
 * was so before this change, and the scenario finishes with such a composition so the rest of the run has its keys.
 */
async function runCompositionFixesScenario() {
  await demo('showLab', 'forms-extra');
  await waitUntil('the extra lab mounts', () => nodeExists('forms-extra-lab'));
  const cdp = await page.createCDPSession();
  const readout = async () => JSON.parse(await text('extra-json'));
  const focus = async (testID) => {
    // Presses at one place within the click interval are one double click, which selects a word: a pause starts a new
    // sequence, so that the press only places the caret.
    await new Promise((resolve) => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
    await click(testID);
    await expectFocused((await find(testID)).id, `A press focuses ${testID}`);
    await waitUntil('the IME element holds browser focus', async () => page.evaluate(() => document.activeElement?.className === 'ime'));
  };
  const compose = async (testID, text) => {
    await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    await expectInput(testID, (state) => state.composing && state.preedit?.text === text, `imeSetComposition shows "${text}"`);
  };

  // Leaving the field mid-composition commits the preedit. The lab moves the focus (`focus()` from a composition handler) when a
  // composition ends in "!": a press would end the composition in the browser first (Chrome commits on the mouse down, and the
  // engine types the text itself), and Tab never reaches the page while one is on. The commit is the root's, a frame after the
  // blur, and it must not also be typed into the field that took the focus.
  await focus('extra-picky');
  await cdp.send('Input.imeSetComposition', { text: 'yes!', selectionStart: 4, selectionEnd: 4 });
  await waitUntil('the composition moved the focus to the resize field', async () => (await find('extra-resize')).id === (await focusedId()));
  await expectInput('extra-picky', (state) => !state.composing && state.value === 'yes!', 'Leaving the field commits the unfinished composition');
  await waitUntil('React holds the committed text', async () => (await readout()).picky === 'yes!');
  check('and it was not typed into the field that took the focus too', (await inputState('extra-resize')).value === '');

  // A beforeinput that refuses the commit discards the preedit.
  await focus('extra-picky');
  await cdp.send('Input.imeSetComposition', { text: 'no!', selectionStart: 3, selectionEnd: 3 });
  await waitUntil('beforeinput refused the commit', async () => (await readout()).refused === 1);
  await expectInput('extra-picky', (state) => !state.composing && state.value === 'yes!', 'A refused commit leaves the text as it was');
  check('and the preedit is gone for good', (await readout()).picky === 'yes!' && (await inputState('extra-resize')).value === '');

  // Making the field read-only while it composes ends the composition.
  await focus('extra-picky');
  await compose('extra-picky', 'loc');
  await cdp.send('Input.imeSetComposition', { text: 'lock', selectionStart: 4, selectionEnd: 4 });
  await waitUntil('the field made itself read-only', async () => (await readout()).locked === true);
  await expectInput('extra-picky', (state) => !state.composing && state.preedit === null && state.value === 'yes!', 'Read-only ends the composition');
  check('and the preedit is not in the value', (await readout()).picky === 'yes!');
  await capture('forms-04-read-only-ends-composition');

  // One composition committed the engine's way gives the rest of the run its keys back (see above).
  await demo('showLab', 'forms');
  await waitUntil('the forms lab mounts again', () => nodeExists('forms-lab'));
  await focus('form-name');
  await cdp.send('Input.imeSetComposition', { text: 'x', selectionStart: 1, selectionEnd: 1 });
  await cdp.send('Input.insertText', { text: 'x' });
  await waitUntil('the commit reached the field', async () => (await inputState('form-name')).value.includes('x'));
  await cdp.detach();
}

/**
 * The on-screen keyboard path on a page with genuine touch: tapping the field focuses the engine's hidden DOM input
 * (`GodotDisplayVK`), whose text the engine pushes to the focused root as `_set_text` (the whole text, caret at 0)
 * followed by one Right key per character the keyboard's caret is past. With `page.keyboard.type` driving that hidden
 * input as a soft keyboard would, the field ends up with the typed text, the caret after it, and React's value.
 */
async function runTouchFormsScenario() {
  await demo('showLab', 'forms');
  await waitUntil('the forms lab mounts on touch', () => nodeExists('forms-lab'));
  const facts = await demo('platformFacts');
  report.platformFacts = { ...(report.platformFacts ?? {}), touch: facts };
  check('A touch page has the virtual keyboard and no IME', facts.virtualKeyboard === true && facts.ime === false, facts);
  const tapField = async (testID) => {
    const point = await pointerPoint(testID);
    await page.touchscreen.tap(point.x, point.y);
    await frames();
  };
  await tapField('form-name');
  await expectFocused((await find('form-name')).id, 'A tap focuses the name field');
  // The tap brings the soft keyboard up, which moves the browser's focus from the canvas to the engine's keyboard element, and the
  // engine reports a canvas blur as the window losing focus; the finger must not be cancelled by it (native/text_input_godot/platform.rs).
  await waitUntil('a tap on a text input is a click', async () => (await formReadout()).nameClicks === 1);
  check('and the finger was not cancelled on its way', (await formReadout()).nameClicks === 1);
  await waitUntil('the engine focuses its hidden DOM input', async () => page.evaluate(() => {
    const active = document.activeElement;
    return active?.tagName === 'INPUT' && active.style.display === 'block';
  }));
  check('The hidden input is the browser\'s focused element', true);
  await page.keyboard.type('abc');
  await expectInput('form-name', (state) => state.value === 'abc' && state.selectionStart === 3 && state.selectionEnd === 3,
    'Typing into the hidden input gives the field its text with the caret after it');
  check('React holds the typed text', (await formReadout()).name === 'abc');
  await page.keyboard.press('Backspace');
  await expectInput('form-name', (state) => state.value === 'ab' && state.selectionStart === 2, 'Backspace in the hidden input deletes in the field');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('X');
  await expectInput('form-name', (state) => state.value === 'aXb' && state.selectionStart === 2, 'Typing in the middle of the text keeps the caret there');
  check('React holds the edited text', (await formReadout()).name === 'aXb');
  const log = await text('form-log');
  check('Each keyboard edit reached JS as an insertReplacementText input', /input:insertReplacementText/.test(log), log);
  await capture('forms-03-touch-keyboard');
  // Tapping another field moves the keyboard to it, with that field's text.
  await tapField('form-code');
  await expectFocused((await find('form-code')).id, 'A tap on another field focuses it');
  await page.keyboard.type('12');
  await expectInput('form-code', (state) => state.value === '12' && state.selectionStart === 2, 'The second field takes the typing');
  check('The first field kept its text', (await inputState('form-name')).value === 'aXb');
  // The element the engine types into holds the keyboard's own text. When native keeps less than it was sent (maxLength),
  // the element must be told, or the next key would send the text that was cut back.
  await page.keyboard.type('abcdefgh');
  await expectInput('form-code', (state) => state.value === '12abcd', 'The field stops at its maxLength');
  await waitUntil('the keyboard element holds the text the field kept', async () => (await keyboardElement())?.value === '12abcd');
  await page.keyboard.press('Backspace');
  await expectInput('form-code', (state) => state.value === '12abc', 'Backspace takes one character off the text the field kept, not off the text that was cut');
  // A text area asks for a multi-line keyboard: the engine's hidden element is then a textarea, which takes Enter as a line break.
  await tapField('form-notes');
  await expectFocused((await find('form-notes')).id, 'A tap focuses the text area');
  await waitUntil('the engine focuses its hidden textarea', async () => page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'));
  await page.keyboard.type('a\nb');
  await expectInput('form-notes', (state) => state.value === 'a\nb' && state.selectionStart === 3 && state.selectionEnd === 3,
    'Typing into the hidden textarea gives the text area its lines with the caret after them');
  check('React holds the lines', (await formReadout()).notes === 'a\nb');
}

/**
 * The element the engine's soft keyboard types into (`GodotDisplayVK`) while it is up: the page's focused element, with
 * the styles the engine gives it. `null` when there is none.
 */
async function keyboardElement() {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element.style.zIndex !== '-1' || element.style.display !== 'block') return null;
    return { tag: element.tagName, value: element.value, selectionStart: element.selectionStart, selectionEnd: element.selectionEnd };
  });
}

/**
 * Text that native changes under the soft keyboard: the keyboard's element holds the whole text and sends all of it with
 * every key, so what native changes must reach the element too (`native/text_input_godot/web_keyboard.rs`). A field
 * cleared by its own submit must start empty again, and a field that refuses an edit must not get the refused text back
 * with the next key.
 */
async function runTouchSoftKeyboardScenario() {
  await demo('showLab', 'forms-extra');
  await waitUntil('the extra lab mounts on touch', () => nodeExists('forms-extra-lab'));
  const tapField = async (testID) => {
    const point = await pointerPoint(testID);
    await page.touchscreen.tap(point.x, point.y);
    await frames();
  };
  const readout = async () => JSON.parse(await text('extra-json'));

  // A message box: type, Enter sends it and clears it, and the next message starts from nothing.
  await tapField('extra-chat');
  await expectFocused((await find('extra-chat')).id, 'A tap focuses the chat field');
  await waitUntil('the engine focuses its hidden DOM input', async () => (await keyboardElement())?.tag === 'INPUT');
  await page.keyboard.type('hi');
  // The engine presses Right once per character after each `_set_text`, a frame later: wait for the caret too.
  await expectInput('extra-chat', (state) => state.value === 'hi' && state.selectionStart === 2, 'The chat field takes the typing');
  await page.keyboard.press('Enter');
  await waitUntil('the submit sent the message', async () => (await readout()).sent === 1);
  await expectInput('extra-chat', (state) => state.value === '', 'and cleared the field');
  await waitUntil('the keyboard element was cleared with the field', async () => (await keyboardElement())?.value === '');
  await page.keyboard.type('x');
  await expectInput('extra-chat', (state) => state.value === 'x' && state.selectionStart === 1, 'The next message starts from nothing, not from the one that was sent');
  check('React holds the new message', (await readout()).chat === 'x');

  // A field that refuses what is not a number: the refused key does not come back with the next one.
  await tapField('extra-digits');
  await expectFocused((await find('extra-digits')).id, 'A tap focuses the digits field');
  await waitUntil('the engine focuses its hidden DOM input for it', async () => (await keyboardElement())?.tag === 'INPUT');
  await page.keyboard.type('12');
  await expectInput('extra-digits', (state) => state.value === '12' && state.selectionStart === 2, 'Digits are taken');
  await page.keyboard.type('a');
  await expectInput('extra-digits', (state) => state.value === '12' && state.selectionStart === 2, 'A letter is refused and the field is put back with its caret');
  await waitUntil('the keyboard element was put back too', async () => (await keyboardElement())?.value === '12');
  await page.keyboard.type('3');
  await expectInput('extra-digits', (state) => state.value === '123' && state.selectionStart === 3, 'The next digit is taken, after the others: the letter did not come back with it');
  check('React holds the digits', (await readout()).digits === '123');

  // A key, and a refused one after it, before the engine's Right presses for the first (they come a frame after `_set_text`)
  // have been handled: both in one task, so no frame comes between them. The refusal is restored to the selection from before
  // it, which is only the 0 that `_set_text` leaves until those presses come. The element's caret must not be put there, or the
  // next key lands at the start of the text.
  await page.evaluate(() => {
    const element = document.activeElement;
    for (const text of ['1234', '1234a']) {
      element.value = text;
      element.setSelectionRange(text.length, text.length);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await expectInput('extra-digits', (state) => state.value === '1234' && state.selectionStart === 4, 'A refusal in the frame of the key before it is put back');
  await waitUntil('the keyboard element holds the text with its caret at the end', async () => {
    const element = await keyboardElement();
    return element?.value === '1234' && element.selectionStart === 4 && element.selectionEnd === 4;
  });
  await page.keyboard.type('5');
  await expectInput('extra-digits', (state) => state.value === '12345' && state.selectionStart === 5, 'The next key lands after the text, not at its start');
  await capture('forms-06-touch-soft-keyboard');
}

async function runEventsScenario(viewport) {
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
}

// The selection lab's colours (native/render_tree.rs `DEFAULT_SELECTION_COLOR`, blue-500 at 35 %, over white) and its text (`text-slate-900`).
const DEFAULT_HIGHLIGHT_ON_WHITE = [0xbb, 0xd3, 0xfc];
const SELECTION_TEXT_RGB = [0x0f, 0x17, 0x2a];
const HIGHLIGHT_TOLERANCE_CHANNELS = 6;
const MIN_HIGHLIGHT_SHARE = 0.5;
const SELECTION_SCAN_STEP_PX = 2;
const SHORT_TEXT_PADDING_PX = 4;
const FIRST_LINE_PROBE_Y = 6;
const SELECTABLE_LAB_TEXTS = ['sel-p1', 'sel-p2', 'sel-live', 'sel-tail', 'sel-captured', 'sel-prevented', 'sel-short', 'sel-rose', 'sel-counter',
  ...Array.from({ length: 14 }, (_, index) => `sel-row-${index}`)];
// The Command key on macOS (Godot's `ui_copy` is Cmd+C there, and Ctrl+C elsewhere, including on the Web build).
const COMMAND_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';

async function selectionState() {
  return page.evaluate(() => {
    const selection = globalThis.godotReactDemo.selection();
    if (!selection) return null;
    return {
      text: selection.text, isCollapsed: selection.isCollapsed,
      anchor: { testID: selection.anchor.node.testID, offset: selection.anchor.offset },
      focus: { testID: selection.focus.node.testID, offset: selection.focus.offset },
    };
  });
}

/** The page's clipboard, read back: the in-memory `navigator.clipboard` this verifier installs (scripts/web-clipboard.mjs), which needs no permission. */
async function browserClipboard() {
  return page.evaluate(() => navigator.clipboard.readText());
}

/** A logical point on the first line of `testID`, `x` logical pixels from its left edge. */
async function firstLine(testID, x = 1) {
  const { rect } = await find(testID);
  return { x: rect.x + x, y: rect.y + FIRST_LINE_PROBE_Y };
}

/** A press, a drag through `through` and a release, with real Chrome mouse input. */
async function dragSelect(from, to, through = []) {
  await moveTo(from);
  await page.mouse.down();
  await frames();
  for (const step of [...through, to]) await moveTo(step);
  await page.mouse.up();
  await frames();
}

/** `times` quick presses at `logical`: a double or triple click, which native counts. */
async function clickAt(logical, times = 1) {
  const point = await moveTo(logical);
  for (let press = 0; press < times; press += 1) {
    await page.mouse.down();
    await page.mouse.up();
  }
  await frames();
  return point;
}

/** The share of the pixels inside `area` (logical pixels) of the real canvas that are `rgb`, and the darkest pixel's colour. */
async function scanCanvas(area, rgb) {
  const data = await snapshot();
  const canvas = await page.$('canvas');
  assert.ok(canvas, 'Godot canvas vanished');
  const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: ACTION_TIMEOUT_MS })));
  await canvas.dispose();
  const scale = image.width / data.width;
  let matching = 0;
  let total = 0;
  let darkest = [255, 255, 255];
  for (let y = Math.ceil(area.y); y < area.y + area.height; y += SELECTION_SCAN_STEP_PX) {
    for (let x = Math.ceil(area.x); x < area.x + area.width; x += SELECTION_SCAN_STEP_PX) {
      const offset = (Math.floor(y * scale) * image.width + Math.floor(x * scale)) * image.channels;
      const pixel = [image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2]];
      total += 1;
      if (pixel.every((channel, index) => Math.abs(channel - rgb[index]) <= HIGHLIGHT_TOLERANCE_CHANNELS)) matching += 1;
      if (pixel[0] + pixel[1] + pixel[2] < darkest[0] + darkest[1] + darkest[2]) darkest = pixel;
    }
  }
  return { share: total === 0 ? 0 : matching / total, darkest };
}

/**
 * Plan I6: text selection in real Chrome, at both device pixel ratios. Mirrors the native `selection` section's mouse
 * gestures; what differs is what only the browser can answer: the clipboard (`navigator.clipboard`, the in-memory one of
 * scripts/web-clipboard.mjs, so no permission is granted and the system's is never touched), real keyboard chords, and the highlight's pixels on the real canvas.
 */
async function runSelectionScenario() {
  await demo('showLab', 'selection');
  await waitUntil('the selection lab mounts', () => nodeExists('selection-lab'));
  await page.mouse.move(1, 1);
  await frames();
  await focusCanvas();
  const p1 = await text('sel-p1');
  const p2 = await text('sel-p2');
  const none = await text('sel-none');
  const p1Start = await firstLine('sel-p1');
  const intoSecond = await firstLine('sel-p2', (await find('sel-p2')).rect.width / 3);
  const nonePoint = await centerOf('sel-none');
  const plainPoint = await centerOf('sel-plain');
  const buttonPoint = await centerOf('sel-button');
  check('Nothing is selected at first', (await selectionState()) === null);

  await clickAt(p1Start);
  let state = await selectionState();
  check('A click collapses at the glyph under it', state?.isCollapsed === true && state.anchor.testID === 'sel-p1' && state.anchor.offset === 0, state);
  check('And the root holds key focus without an element', await demo('surfaceHasFocus') && (await focusedId()) === null);
  await expectText('sel-ends', 'anchor sel-p1:0, focus sel-p1:0, collapsed', 'useTextSelection follows the click');
  await new Promise((resolve) => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
  await clickAt(p1Start, 2);
  state = await selectionState();
  check('A double click selects the word', state?.text === 'The' && state.focus.offset === 3, state);
  await new Promise((resolve) => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
  await clickAt(p1Start, 3);
  state = await selectionState();
  check('A triple click selects the whole text of the node', state?.text === p1 && state.anchor.offset === 0 && state.focus.offset === p1.length, state);
  await new Promise((resolve) => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));

  await dragSelect(p1Start, intoSecond, [nonePoint]);
  state = await selectionState();
  check('A drag from the first paragraph into the second selects across, skipping the select-none sentence',
    state?.anchor.testID === 'sel-p1' && state.focus.testID === 'sel-p2' && state.focus.offset > 0 && state.text === `${p1}\n${p2.slice(0, state.focus.offset)}` && !state.text.includes(none), state);
  await capture('selection-01-across');

  // Copy: the text reaches the browser's clipboard through `DisplayServer.clipboard_set` -> `navigator.clipboard.writeText`,
  // and both Ctrl+C and Cmd+C work in the browser regardless of host OS.
  await page.evaluate(() => navigator.clipboard.writeText('before the copy'));
  const keysBefore = (await counts()).unhandledKeys[KEY_C] ?? 0;
  await pressKey('c', [COMMAND_KEY]);
  await waitUntil('Cmd/Ctrl+C reaches the browser clipboard', async () => (await browserClipboard()) === state.text);
  check('Cmd/Ctrl+C copies the selected text, the paragraphs joined by a newline', true, { clipboard: await browserClipboard() });
  const alternateModifier = COMMAND_KEY === 'Meta' ? 'Control' : 'Meta';
  await page.evaluate(() => navigator.clipboard.writeText('before the alternate copy'));
  await pressKey('c', [alternateModifier]);
  await waitUntil('Both Ctrl+C and Cmd+C reach the browser clipboard', async () => (await browserClipboard()) === state.text);
  check('Both Ctrl+C and Cmd+C copy the selected text', true, { modifier: alternateModifier, clipboard: await browserClipboard() });
  // The Command or Control key itself is a key press nothing handles; the C that copied is the key that must not reach the game.
  check('And the key that copied is consumed', ((await counts()).unhandledKeys[KEY_C] ?? 0) === keysBefore, await counts());

  await pressKey('a', [COMMAND_KEY]);
  const everything = (await Promise.all(SELECTABLE_LAB_TEXTS.map((testID) => text(testID)))).join('\n');
  state = await selectionState();
  check('Cmd/Ctrl+A selects all the selectable text in order and none of the rest', state?.text === everything, state);
  await capture('selection-02-all');

  await clickAt(buttonPoint);
  check('A press on a Button clears the selection and starts none', (await selectionState()) === null);
  await clickAt(plainPoint);
  check('Text with no select-text is not selectable', (await selectionState()) === null && !(await demo('surfaceHasFocus')));
  await new Promise((resolve) => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));

  // The highlight is on the canvas, in the right colour, with the text drawn over it.
  const short = (await find('sel-short')).rect;
  const glyphs = { x: short.x + SHORT_TEXT_PADDING_PX, y: short.y, width: short.width - 2 * SHORT_TEXT_PADDING_PX, height: short.height };
  check('Nothing is highlighted before the selection', (await scanCanvas(glyphs, DEFAULT_HIGHLIGHT_ON_WHITE)).share === 0);
  await clickAt(await centerOf('sel-short'), 3);
  check('The short text is selected', (await selectionState())?.text === 'Highlight');
  const highlighted = await scanCanvas(glyphs, DEFAULT_HIGHLIGHT_ON_WHITE);
  check('The selected text is highlighted on the canvas', highlighted.share >= MIN_HIGHLIGHT_SHARE, highlighted);
  check('And its text is drawn over the highlight, in its own colour',
    highlighted.darkest.every((channel, index) => Math.abs(channel - SELECTION_TEXT_RGB[index]) <= 0x20), highlighted);
  await capture('selection-03-highlight');
  await clickAt(plainPoint);
  check('Clearing the selection removes the highlight', (await scanCanvas(glyphs, DEFAULT_HIGHLIGHT_ON_WHITE)).share === 0);
  await demo('restoreDemo');
  await focusCanvas();
}


// ---- HiDPI (docs/tracks/hidpi.md; the measurements are those of demo/src/verify-hidpi.ts, on a real canvas screenshot) ----
const LUMA_RED = 0.2126;
const LUMA_GREEN = 0.7152;
const LUMA_BLUE = 0.0722;
const INK_LUMA = 0.5;
const PARTIAL_COVERAGE_MIN = 0.1;
const PARTIAL_COVERAGE_MAX = 0.9;
const EDGE_PROFILE_REACH_PX = 4;
// A line of 24 px stems drawn at the scale reads 0.94 in the native verifier; one drawn at one texel per logical pixel and upscaled, 0.47.
const STEMS_CRISP_MIN = 0.8;
const HIDPI_BOX_RGB = [0x4f, 0x46, 0xe5];
const HIDPI_BOX_LUMA = (LUMA_RED * HIDPI_BOX_RGB[0] + LUMA_GREEN * HIDPI_BOX_RGB[1] + LUMA_BLUE * HIDPI_BOX_RGB[2]) / 255;
// The default selection, blue-500 at 35 % over white, is (186, 212, 239): 53 more blue than red.
const SELECTION_BLUE_MIN_CHANNELS = 12;
const HIDPI_COLOR_TOLERANCE_CHANNELS = 8;
const SELECTED_STEMS = 5;
const SELECTION_FIT_PX = 6;
const CARET_EDGE_SLACK_PX = 1;
const HIDPI_FOCUS_WAIT_MS = 30_000;
// A text field's border and its `px-2` padding: where its text starts.
const HIDPI_FIELD_CONTENT_INSET_PX = 9;

const lumaOf = (pixel) => (LUMA_RED * pixel[0] + LUMA_GREEN * pixel[1] + LUMA_BLUE * pixel[2]) / 255;

/** A screenshot of the canvas in device pixels: `ratio` device pixels per logical pixel. */
async function hidpiRaster() {
  const data = await snapshot();
  const canvas = await page.$('canvas');
  assert.ok(canvas, 'Godot canvas vanished');
  const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: ACTION_TIMEOUT_MS })));
  await canvas.dispose();
  return { image, ratio: image.width / data.width, data };
}

const pixelOf = (raster, x, y) => {
  const offset = (y * raster.image.width + x) * raster.image.channels;
  return [raster.image.pixels[offset], raster.image.pixels[offset + 1], raster.image.pixels[offset + 2]];
};
const devicePixels = (rect, ratio) => ({ x: Math.floor(rect.x * ratio), y: Math.floor(rect.y * ratio), width: Math.ceil(rect.width * ratio), height: Math.ceil(rect.height * ratio) });

/** How crisply a line of vertical stems is drawn: the steepest step along the middle row of its ink, and the partly covered pixels per edge. */
function measureStems(raster, region) {
  const inkRows = [];
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      if (lumaOf(pixelOf(raster, x, y)) < INK_LUMA) { inkRows.push(y); break; }
    }
  }
  assert.ok(inkRows.length > 0, `No ink in ${JSON.stringify(region)}`);
  const middle = inkRows[Math.floor(inkRows.length / 2)];
  const profile = [];
  for (let x = region.x; x < region.x + region.width; x += 1) {
    let darkness = 0;
    for (let y = middle - 1; y <= middle + 1; y += 1) darkness += 1 - lumaOf(pixelOf(raster, x, y));
    profile.push(darkness / 3);
  }
  const top = Math.max(...profile);
  let peak = 0;
  let partial = 0;
  let edges = 0;
  for (let index = 0; index < profile.length; index += 1) {
    const coverage = profile[index] / top;
    if (coverage > PARTIAL_COVERAGE_MIN && coverage < PARTIAL_COVERAGE_MAX) partial += 1;
    if (index + 1 < profile.length) {
      peak = Math.max(peak, Math.abs(profile[index + 1] - profile[index]) / top);
      if ((coverage < 0.5) !== (profile[index + 1] / top < 0.5)) edges += 1;
    }
  }
  return { peakStep: peak, partialPerEdge: edges === 0 ? Infinity : partial / edges, edges };
}

/** The pixels of a vertical box edge that are neither outside nor inside, around device column `edge` along `row`. */
function partialAcrossEdge(raster, edge, row) {
  const coverage = [];
  for (let x = edge - EDGE_PROFILE_REACH_PX; x <= edge + EDGE_PROFILE_REACH_PX; x += 1) coverage.push((1 - lumaOf(pixelOf(raster, x, row))) / (1 - HIDPI_BOX_LUMA));
  return { coverage, partial: coverage.filter((value) => value > PARTIAL_COVERAGE_MIN && value < PARTIAL_COVERAGE_MAX).length };
}

function pixelRuns(raster, row, from, to, test) {
  const found = [];
  let start = -1;
  for (let x = from; x <= to; x += 1) {
    const hit = x < to && test(pixelOf(raster, x, row));
    if (hit && start < 0) start = x;
    if (!hit && start >= 0) { found.push({ start, end: x - 1 }); start = -1; }
  }
  return found;
}

const sameColor = (pixel, expected) => pixel.every((channel, index) => Math.abs(channel - expected[index]) <= HIDPI_COLOR_TOLERANCE_CHANNELS);

/** The stems, the rounded box and the focused text field of the HiDPI lab, read in the canvas's own pixels. */
async function measureHidpiLab(viewport, dpr) {
  const stems = await find('hidpi-stems');
  const box = await find('hidpi-box');
  const raster = await hidpiRaster();
  check(`The canvas has ${dpr} device pixels per logical pixel`, raster.ratio === dpr, { ratio: raster.ratio });
  check(`The root draws its text and edges at ${dpr}`, raster.data.oversampling === dpr, { oversampling: raster.data.oversampling });
  const stemMeasure = measureStems(raster, devicePixels(stems.rect, raster.ratio));
  check('A line of stems is drawn crisp at this scale', stemMeasure.peakStep >= STEMS_CRISP_MIN, stemMeasure);
  const row = Math.round((box.rect.y + box.rect.height / 2) * raster.ratio);
  const edge = partialAcrossEdge(raster, Math.round(box.rect.x * raster.ratio), row);
  check('A rounded box has a hard edge: at most one partly covered pixel', edge.partial <= 1, edge);
  return { stems: stemMeasure, edge };
}

/** The text input at this scale: its caret, a selection against the glyphs, and an IME preedit's underline. */
async function runHidpiFieldScenario(dpr) {
  await click('hidpi-field');
  await page.keyboard.press('End');
  await waitUntil('the caret of the field is on', async () => (await inputState('hidpi-field')).caretVisible, HIDPI_FOCUS_WAIT_MS);
  await capture(`hidpi-field-scrolled-${activeViewport}`);
  let raster = await hidpiRaster();
  let state = await inputState('hidpi-field');
  const caret = (await find('hidpi-field')).textInput.caret;
  check('The caret at the end scrolls the field', state.scrollLeft > 0, { scrollLeft: state.scrollLeft });
  const caretRow = Math.round((caret.y + caret.height / 2) * raster.ratio);
  const caretRuns = pixelRuns(raster, caretRow, Math.floor((caret.x - 3) * raster.ratio), Math.ceil((caret.x + 4) * raster.ratio), (pixel) => sameColor(pixel, HIDPI_BOX_RGB));
  check(`The caret is ${dpr} device pixels wide in one run, where native puts it`,
    caretRuns.length === 1 && caretRuns[0].end - caretRuns[0].start + 1 === dpr && Math.abs(caretRuns[0].start - caret.x * raster.ratio) <= CARET_EDGE_SLACK_PX, { caretRuns, caret });

  // Selection of the first stems.
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  for (let count = 0; count < SELECTED_STEMS; count += 1) await page.keyboard.press('ArrowRight');
  await page.keyboard.up('Shift');
  await waitUntil('five stems are selected', async () => {
    const current = await inputState('hidpi-field');
    return current.selectionEnd - current.selectionStart === SELECTED_STEMS;
  });
  await capture(`hidpi-field-selection-${activeViewport}`);
  raster = await hidpiRaster();
  const field = await find('hidpi-field');
  const inner = devicePixels({ x: field.rect.x + 4, y: field.rect.y + 3, width: field.rect.width - 8, height: field.rect.height - 6 }, raster.ratio);
  const inkRow = Math.round(inner.y + inner.height / 2);
  const stems = pixelRuns(raster, inkRow, inner.x, inner.x + inner.width, (pixel) => lumaOf(pixel) < INK_LUMA);
  // The selection is blue-dominant wherever it shows (white and black have no blue over red), including the antialiased
  // pixels beside a stem; at DPR 1 the gaps between stems are one pixel wide, so exact tint would find almost none.
  const selected = pixelRuns(raster, inkRow, inner.x, inner.x + inner.width, (pixel) => pixel[2] - pixel[0] >= SELECTION_BLUE_MIN_CHANNELS);
  const selectionCaret = field.textInput.caret;
  const span = selected.length === 0 ? null : { start: selected[0].start, end: selected.at(-1).end };
  check('The selection starts at the first selected glyph and ends with the fifth, before the sixth',
    span !== null && stems.length > SELECTED_STEMS
    && span.start <= stems[0].start && stems[0].start - span.start <= SELECTION_FIT_PX
    // Glyphs are placed on whole logical pixels at one device pixel per logical pixel, and the sixth glyph's first pixel can
    // carry the selection's edge: one logical pixel of slack. A selection that took in the sixth glyph would be a whole advance over.
    && span.end >= stems[SELECTED_STEMS - 1].start && span.end <= stems[SELECTED_STEMS].start + raster.ratio
    && span.end - stems[SELECTED_STEMS - 1].end <= SELECTION_FIT_PX, { span, stems: stems.slice(0, SELECTED_STEMS + 1) });
  check('The selection ends where native puts the caret', span !== null && selectionCaret !== null && Math.abs(span.end + 1 - selectionCaret.x * raster.ratio) <= SELECTION_FIT_PX, { span, selectionCaret });

  // An IME preedit at the start of the field: its underline is as thick as the caret and lies at the baseline.
  await page.keyboard.press('Home');
  await expectInput('hidpi-field', (current) => current.selectionStart === 0 && current.selectionEnd === 0, 'Home puts the caret at the start of the field');
  await waitUntil('the IME element holds browser focus', async () => page.evaluate(() => document.activeElement?.className === 'ime'));
  const cdp = await page.createCDPSession();
  await cdp.send('Input.imeSetComposition', { text: 'ñ', selectionStart: 1, selectionEnd: 1 });
  await expectInput('hidpi-field', (current) => current.composing && current.preedit?.text === 'ñ', 'imeSetComposition shows the preedit in the field');
  await capture(`hidpi-field-preedit-${activeViewport}`);
  raster = await hidpiRaster();
  const preeditField = await find('hidpi-field');
  // The underline is the rows in which every pixel of the first few logical pixels of the text is ink (a glyph's strokes are
  // narrower); the stems after the preedit end at the baseline, which is where the underline begins.
  const contentLeft = preeditField.rect.x + HIDPI_FIELD_CONTENT_INSET_PX;
  const underlineFrom = Math.round((contentLeft + 1) * raster.ratio);
  const underlineTo = Math.round((contentLeft + 7) * raster.ratio);
  const stemsFrom = Math.round((contentLeft + 14) * raster.ratio);
  const stemsTo = Math.round((contentLeft + 40) * raster.ratio);
  const dark = (pixel) => lumaOf(pixel) < INK_LUMA;
  const candidateRows = [];
  let stemBottom = -1;
  for (let y = Math.floor(preeditField.rect.y * raster.ratio); y < Math.ceil((preeditField.rect.y + preeditField.rect.height) * raster.ratio); y += 1) {
    if (pixelRuns(raster, y, underlineFrom, underlineTo, dark).some((run) => run.start === underlineFrom && run.end === underlineTo - 1)) candidateRows.push(y);
    if (pixelRuns(raster, y, stemsFrom, stemsTo, dark).length > 0) stemBottom = y;
  }
  // The tilde of an ñ can be ink across the whole probe too, at one device pixel per logical pixel; it is above the baseline.
  const underlineRows = candidateRows.filter((row) => row >= stemBottom);
  report.measures ??= [];
  report.measures.push({ viewport: activeViewport, name: 'preedit-underline', candidateRows, underlineRows, stemBottom, dpr });
  check(`The preedit's underline is ${dpr} device pixels thick, in one piece, and starts where the stems after it end`,
    underlineRows.length === dpr && underlineRows.at(-1) - underlineRows[0] + 1 === dpr && Math.abs(underlineRows[0] - (stemBottom + 1)) <= 1, { candidateRows, underlineRows, stemBottom });
  await cdp.send('Input.insertText', { text: 'ñ' });
  await cdp.detach();
  await expectInput('hidpi-field', (current) => !current.composing, 'The composition is committed');
  await page.mouse.move(1, 1);
  await frames();
}

/**
 * HiDPI (docs/tracks/hidpi.md): text and rounded edges drawn at the page's device pixel ratio, read from real screenshots
 * of the canvas, and the text input's caret, selection and preedit at that ratio. On the DPR 1 landscape page the ratio
 * is also changed in place, with the CSS size unchanged (the browser moved to another display, or zoomed): the root is not
 * told and must draw again at the new scale.
 */
async function runHidpiScenario(viewport) {
  await demo('showLab', 'hud');
  await demo('showLab', 'hidpi');
  await waitUntil('the HiDPI lab mounts', () => nodeExists('hidpi-page'));
  await page.mouse.move(1, 1);
  await frames();
  await capture(`hidpi-lab-${viewport.name}`);
  const dpr = viewport.deviceScaleFactor;
  // On the Web the window's viewport carries the content scale factor the owner sets from the device pixel ratio, so the
  // window's factor adds nothing to the viewport's own oversampling (the question the native rule rests on).
  const facts = await demo('scaleFacts');
  report.measures ??= [];
  report.measures.push({ viewport: activeViewport, name: 'scale-facts', ...facts });
  check('The window\'s viewport oversampling equals its content scale factor and the device pixel ratio', facts.viewportOversampling === facts.contentScaleFactor && facts.contentScaleFactor === dpr && facts.screenScale === dpr, facts);
  await measureHidpiLab(viewport, dpr);
  await runHidpiFieldScenario(dpr);
  if (dpr === 1) {
    const stale = await snapshot();
    const contentBefore = stale.stats.contentRecords;
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 2 });
    await waitUntil('the root draws at the new ratio with the logical size unchanged', async () => {
      const data = await snapshot();
      return data.oversampling === 2 && data.width === viewport.width && data.height === viewport.height;
    }, HIDPI_FOCUS_WAIT_MS);
    await frames();
    const after = await snapshot();
    check('A change of device pixel ratio with no commit draws the text again', after.stats.contentRecords > contentBefore, { before: contentBefore, after: after.stats.contentRecords });
    await capture(`hidpi-ratio-changed-in-place-${viewport.name}`);
    await measureHidpiLab(viewport, 2);
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
    await waitUntil('the root draws at the original ratio again', async () => (await snapshot()).oversampling === 1, HIDPI_FOCUS_WAIT_MS);
    await frames();
  }
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

  if (wanted('events')) await section('events', () => runEventsScenario(viewport));

  if (wanted('cooperation')) await section('cooperation', runCooperationScenario);
  if (wanted('pointers')) await section('pointers', runPointersScenario);
  if (wanted('keyboard')) await section('keyboard', runKeyboardScenario);
  if (wanted('scroll')) await section('scroll', runScrollScenario);
  if (wanted('selection')) await section('selection', runSelectionScenario);
  if (wanted('drag')) await section('drag', runDragScenario);
  if (wanted('forms')) await section('forms', () => runFormsScenario(viewport));
  if (wanted('combobox')) {
    await section('combobox', () => runComboboxScenario({
      viewport, demo, page, frames, snapshot, find, check, capture, waitUntil, moveTo, centerOf, click, wheelAt, nodeExists, text,
      expectFocused, actionTimeoutMs: ACTION_TIMEOUT_MS,
    }));
  }
  if (wanted('hidpi')) await section('hidpi', () => runHidpiScenario(viewport));
  if (wanted('filters')) {
    await section('filters', () => runFiltersScenario({ demo, page, frames, snapshot, find, check, capture, decodePng, moveTo, centerOf, waitUntil, expectedConsoleErrors, actionTimeoutMs: ACTION_TIMEOUT_MS }));
  }
  if (wanted('glass')) {
    await section('glass', () => runGlassScenario({ demo, page, frames, snapshot, find, check, capture, decodePng, moveTo, centerOf, click, pressAction, inputState, waitUntil, actionTimeoutMs: ACTION_TIMEOUT_MS }));
  }
  if (wanted('navigator')) {
    await section('navigator', () => runNavigatorScenario({ demo, page, frames, snapshot, find, check, capture, click, moveTo, text, waitUntil, nodeExists }));
  }
  if (wanted('transforms')) {
    await section('transforms', () => runTransformsScenario({ demo, page, frames, snapshot, find, check, capture, decodePng, moveTo, waitUntil, expectedConsoleErrors, actionTimeoutMs: ACTION_TIMEOUT_MS }));
  }

  if (wanted('paint')) {
    await section('paint', () => runPaintScenario({ demo, page, frames, snapshot, find, check, capture, decodePng, actionTimeoutMs: ACTION_TIMEOUT_MS }));
  }

  if (wanted('rich-text')) {
    await section('rich-text', () => runRichTextScenario({ demo, page, frames, snapshot, find, check, capture, decodePng, moveTo, actionTimeoutMs: ACTION_TIMEOUT_MS }));
  }
  if (wanted('text-styles')) {
    await section('text-styles', () => runTextStylesScenario({ demo, page, frames, find, check, capture, moveTo }));
  }

  if (wanted('code-editor')) {
    await section('code-editor', () => runCodeEditorScenario({
      demo, page, frames, snapshot, find, check, capture, click, moveTo, text, waitUntil, nodeExists, pagePoint, centerOf,
    }));
  }

  // Which keys the browser gets does not depend on the viewport: once, in the first.
  if (wanted('key-passthrough') && viewport.name === viewports[0].name) {
    const keyContext = { demo, page, frames, snapshot, find, check, click, text, waitUntil, nodeExists };
    await section('key-passthrough', async () => {
      await runKeyPassthroughScenario(keyContext);
      await runKeyPassthroughEditorScenario(keyContext);
    });
  }

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
  if (wanted('touch')) await section('touch', async () => {
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
    await runTouchScrollScenario();
    await runTouchFormsScenario();
    await runTouchSoftKeyboardScenario();
  });
  if (wanted('drag')) await section('drag', runTouchDragScenario);
  if (wanted('combobox')) {
    await section('combobox', () => runTouchComboboxScenario({
      demo, page, frames, snapshot, find, check, waitUntil, nodeExists, text, pointerPoint, pagePoint, keyboardElement,
    }));
  }
  if (wanted('dropdown-touch')) {
    await section('dropdown-touch', () => runTouchDropdownScenario({
      demo, page, frames, snapshot, find, check, capture, waitUntil, nodeExists, text, pagePoint,
    }));
  }
  if (wanted('touch-selection')) {
    const selectionContext = {
      demo, page, frames, snapshot, find, check, capture, waitUntil, nodeExists, text, pagePoint, keyboardElement,
      canvasImage: async () => {
        const canvas = await page.$('canvas');
        assert.ok(canvas, 'Godot canvas vanished');
        const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: ACTION_TIMEOUT_MS })));
        await canvas.dispose();
        return image;
      },
    };
    await section('touch-selection', () => runTouchSelectionScenario(selectionContext));
    // The same gestures at a device pixel ratio of 2, where the handles and the menu are drawn in device pixels.
    await page.close();
    activeViewport = 'touch-retina';
    await loadPage({ width: viewport.width, height: viewport.height, deviceScaleFactor: 2, hasTouch: true });
    await waitUntil('the retina touch page', async () => (await snapshot()).width === viewport.width);
    await section('touch-selection', () => runTouchSelectionRetinaScenario({ ...selectionContext, page }));
  }
  if (wanted('code-editor')) {
    // The code panel is offered from 768 logical pixels wide, which the touch page above (a phone) is not: a page of its own, a tablet's size.
    await page.close();
    activeViewport = 'touch-landscape';
    await loadPage({ width: viewports[0].width, height: viewports[0].height, deviceScaleFactor: 1, hasTouch: true });
    await waitUntil('the tablet-sized touch page', async () => (await snapshot()).width === viewports[0].width);
    await section('code-editor', () => runTouchCodeEditorScenario({
      demo, page, frames, snapshot, find, check, capture, waitUntil, nodeExists, text, pagePoint, centerOf,
    }));
  }
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
    if (wanted('navigator')) {
      // What the demo opens with is decided as it starts, so each start is a page of its own.
      activeViewport = 'navigator-start';
      await section('navigator', () => runNavigatorStartScenario({
        browser, base: url, check, viewport: { width: viewports[0].width, height: viewports[0].height, deviceScaleFactor: 1 },
        output: resolve(output, activeViewport),
      }));
    }
    if (wanted('font-slices')) {
      // Each group is a page of its own: what a page has fetched and added is state that outlives a lab.
      activeViewport = 'font-slices';
      await section('font-slices', () => runFontSlicesScenario({
        browser, base: url, check, viewport: { width: viewports[0].width, height: viewports[0].height },
        exportDirectory: engine.artifactPath(`web-${engine.webMode()}`),
      }));
    }
    if (wanted('rotation')) {
      // A device turned from portrait to landscape and back: each case is a page of its own, in Chrome's mobile emulation (docs/tracks/rotation.md).
      activeViewport = 'rotation';
      await section('rotation', () => runRotationScenario({ browser, base: url, check, output: resolve(output, activeViewport) }));
    }
    if (wanted('touch') || wanted('drag') || wanted('combobox') || wanted('dropdown-touch') || wanted('touch-selection') || wanted('code-editor')) await runTouchWorkflow();
    checkBrowserErrors();
    const empty = SECTIONS.filter((name) => wanted(name) && !(sectionChecks[name] > 0));
    assert.ok(empty.length === 0, `Section(s) ${empty.join(', ')} ran no assertion`);
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
  await server.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(resolve(output, 'browser.log'), report.console.map((entry) => `[${entry.type}] ${entry.text}`).join('\n') + '\n');
}

if (report.passed && !process.exitCode) {
  // A run that left sections out says so, here and in the summary line a person reads.
  console.log('GODOT_REACT_WEB_INTERACTION_VERIFY_PASSED', JSON.stringify({
    sections: coverage.run, partial: coverage.partial, skipped: coverage.skipped, sectionChecks,
    assertions: report.assertions.length, captures: report.captures.length, timing: report.timing, engineGaps: report.engineGaps,
    report: resolve(output, 'report.json'),
  }));
}
