import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const output = resolve(root, 'artifacts', 'web-verification');
const STARTUP_TIMEOUT_MS = 180_000;
const ACTION_TIMEOUT_MS = 15_000;
const TOTAL_TIMEOUT_MS = 360_000;
const POLL_MS = 50;
const GEOMETRY_TOLERANCE = 2;
const MAX_TAB_PRESSES = 24;
const REMOUNT_COUNT = 3;
const FULL_INVENTORY_COUNT = 6;
const BUTTON_PADDING_INSET = 4;
const DRAG_MOVE_STEPS = 8;
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';
const viewports = [
  { name: 'landscape', width: 1120, height: 800, deviceScaleFactor: 1, counterColumns: 2, inventoryColumns: 3 },
  { name: 'portrait', width: 600, height: 900, deviceScaleFactor: 1, counterColumns: 1, inventoryColumns: 2 },
  { name: 'retina-landscape', width: 1120, height: 800, deviceScaleFactor: 2, counterColumns: 2, inventoryColumns: 3 },
  { name: 'retina-portrait', width: 600, height: 900, deviceScaleFactor: 2, counterColumns: 1, inventoryColumns: 2 },
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

async function dragPointer(from, to) {
  await page.mouse.move(from.x, from.y);
  await frames();
  await page.mouse.down();
  await frames();
  await page.mouse.move(to.x, to.y, { steps: DRAG_MOVE_STEPS });
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

async function assertColumns(testID, expected) {
  const [data, parent] = await Promise.all([snapshot(), find(testID)]);
  const children = parent.children.map((id) => data.nodes.find((node) => node.id === id));
  assert.ok(children.length >= expected && children.every(Boolean), `${testID} has insufficient children`);
  const rowY = children[0].rect.y;
  const firstRow = children.filter((child) => Math.abs(child.rect.y - rowY) <= GEOMETRY_TOLERANCE);
  check(`${testID} uses ${expected} responsive columns`, firstRow.length === expected,
    { expected, actual: firstRow.length, logicalWidth: data.width });
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
  const pixelDimensions = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('Godot canvas is absent');
    const rect = canvas.getBoundingClientRect();
    return {
      browserWidth: innerWidth, browserHeight: innerHeight, devicePixelRatio,
      cssWidth: rect.width, cssHeight: rect.height,
      physicalWidth: canvas.width, physicalHeight: canvas.height,
    };
  });
  check('Browser applies the requested device pixel ratio',
    pixelDimensions.devicePixelRatio === viewport.deviceScaleFactor, pixelDimensions);
  check('Canvas CSS dimensions match the logical viewport',
    pixelDimensions.cssWidth === viewport.width && pixelDimensions.cssHeight === viewport.height &&
    pixelDimensions.browserWidth === viewport.width && pixelDimensions.browserHeight === viewport.height,
  pixelDimensions);
  check('Canvas retains device-resolution pixels independently of logical UI dimensions',
    pixelDimensions.physicalWidth === viewport.width * viewport.deviceScaleFactor &&
    pixelDimensions.physicalHeight === viewport.height * viewport.deviceScaleFactor,
  pixelDimensions);
  await expectText('counter-value', '0', 'Initial React counter state');
  await assertColumns('counter-columns', viewport.counterColumns);
  await capture('01-counter');

  const initialReset = await find('reset');
  check('Reset is initially disabled', initialReset.style.disabled === true);
  await click('reset');
  await expectText('counter-value', '0', 'Disabled button does not activate');
  await page.mouse.move(viewport.width - 1, viewport.height - 1);
  await frames();
  const passesBeforeHover = (await snapshot()).stats.layoutPasses;
  const initialPaint = (await find('increment')).style.backgroundColor;
  await hover('increment');
  await waitUntil('hover paint changes', async () => (await find('increment')).style.backgroundColor !== initialPaint);
  check('Paint-only hover does not run native layout', (await snapshot()).stats.layoutPasses === passesBeforeHover);
  const hoverPaint = (await find('increment')).style.backgroundColor;
  await capture('02-hover');
  await page.mouse.down();
  await waitUntil('active paint changes', async () => (await find('increment')).style.backgroundColor !== hoverPaint);
  await capture('03-pressed');
  await page.mouse.up();
  await expectText('counter-value', '1', 'Real browser click updates useState');
  await expectText('counter-derived', 'Derived with useMemo: 2', 'Derived memo follows state');
  await capture('04-incremented');

  await click('step-toggle');
  await expectText('step-toggle', 'Switch to 1', 'React event closure changes step size');
  await click('increment');
  await expectText('counter-value', '6', 'New event closure uses step five');
  await click('reset');
  await expectText('counter-value', '0', 'Reset restores counter');

  const padding = await pointerPoint('increment', BUTTON_PADDING_INSET);
  const label = await pointerPoint('increment');
  await dragPointer(padding, label);
  await expectText('counter-value', '5', 'Pressing button padding and releasing over its text activates once');
  await click('reset');
  await expectText('counter-value', '0', 'Reset after padding-to-text activation');
  await dragPointer(label, padding);
  await expectText('counter-value', '5', 'Pressing button text and releasing over its padding activates once');
  await click('reset');
  await expectText('counter-value', '0', 'Reset after text-to-padding activation');
  await dragPointer(label, { x: viewport.width - BUTTON_PADDING_INSET, y: viewport.height - BUTTON_PADDING_INSET });
  await expectText('counter-value', '0', 'Pressing a button and releasing outside cancels activation');

  const incrementID = (await find('increment')).id;
  for (let attempts = 0; (await snapshot()).focused !== incrementID && attempts < MAX_TAB_PRESSES; attempts++) {
    await page.keyboard.press('Tab');
    await frames();
  }
  check('Native Tab traversal reaches increment', (await snapshot()).focused === incrementID);
  await capture('05-keyboard-focus');
  await page.keyboard.press('Enter');
  await expectText('counter-value', '5', 'Browser keyboard activates native button');
  await click('accent-toggle');
  await capture('06-context-accent');

  await click('tab-inventory');
  await waitUntil('inventory branch mounts', async () =>
    Boolean(await page.evaluate(() => globalThis.godotReactDemo.find('inventory-grid'))));
  await expectText('inventory-count', '4 of 4 items');
  await assertColumns('inventory-grid', viewport.inventoryColumns);
  await capture('07-inventory');
  await click('item-carrot');
  await expectText('item-state-carrot', 'Selected 1 time', 'Card local component state updates');
  const carrotID = (await find('item-carrot')).id;
  const originalOrder = (await find('inventory-grid')).children;
  await click('reverse-items');
  check('Keyed reverse preserves native identity', (await find('item-carrot')).id === carrotID);
  check('Keyed reverse changes native child order',
    JSON.stringify((await find('inventory-grid')).children) === JSON.stringify([...originalOrder].reverse()));
  await expectText('item-state-carrot', 'Selected 1 time', 'Keyed reverse preserves hook state');
  await capture('08-reordered');
  await click('add-item');
  await click('add-item');
  await expectText('inventory-count', '6 of 6 items', 'New keyed items mount');
  check('Full collection disables Add', (await find('add-item')).style.disabled === true);
  await capture('09-full-grid');
  await click('filter-tools');
  await expectText('inventory-count', '3 of 6 items', 'Filtering removes native branches');
  check('Filtered carrot branch is absent',
    !await page.evaluate(() => globalThis.godotReactDemo.find('item-carrot')));
  await capture('10-filtered');
  await click('filter-all');
  await expectText('inventory-count', '6 of 6 items');
  for (let index = 0; index < FULL_INVENTORY_COUNT; index++) await click('remove-item');
  await expectText('inventory-count', '0 of 0 items', 'Removing items reaches empty collection');
  check('Empty-state branch mounts', Boolean(await page.evaluate(() => globalThis.godotReactDemo.find('inventory-empty'))));
  check('Empty collection disables Remove', (await find('remove-item')).style.disabled === true);
  await capture('11-empty');
  await click('add-item');
  await expectText('inventory-count', '1 of 1 items', 'Insertion works after empty state');
  await click('tab-counter');
  await expectText('counter-value', '0', 'Tab re-entry creates fresh hook state');
  await capture('12-reentry');

  const mountedNodeCount = (await snapshot()).stats.nodeCount;
  for (let index = 0; index < REMOUNT_COUNT; index++) {
    await page.evaluate(() => globalThis.godotReactDemo.unmount());
    await frames();
    check('Unmount releases the demo owner', await page.evaluate(() => {
      try { globalThis.godotReactDemo.snapshot(); return false; }
      catch (error) { return error instanceof Error && error.message.includes('not mounted'); }
    }), { iteration: index + 1 });
    await page.evaluate(() => globalThis.godotReactDemo.mount());
    await expectText('counter-value', '0', 'Owner remount resets state');
    check('Owner remount retains no extra native nodes', (await snapshot()).stats.nodeCount === mountedNodeCount,
      { iteration: index + 1, expectedNodeCount: mountedNodeCount, actualNodeCount: (await snapshot()).stats.nodeCount });
  }
  await capture('13-remounted');
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
  await expectText('counter-value', '0', 'Touch page starts with fresh React state');
  const point = await pointerPoint('increment');
  await page.touchscreen.tap(point.x, point.y);
  await expectText('counter-value', '1', 'Real browser touch tap updates useState');
  await expectText('counter-derived', 'Derived with useMemo: 2', 'Touch activation updates derived state');
  await capture('01-touch-incremented');
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
  currentPackObserver?.failIfUnverified();
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
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(resolve(output, 'browser.log'), report.console.map((entry) => `[${entry.type}] ${entry.text}`).join('\n') + '\n');
}

if (report.passed && !process.exitCode) {
  console.log('GODOT_REACT_WEB_VERIFY_PASSED', JSON.stringify({
    assertions: report.assertions.length, captures: report.captures.length,
    report: resolve(output, 'report.json'),
  }));
}
