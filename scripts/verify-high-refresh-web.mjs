import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decodePng } from './png.mjs';

// The `high-refresh` section of the Web interaction verifier: the demo shell's opt-in `?hz=120` mode (docs/WEB.md, "High refresh rate"),
// in a page of its own, headless Chrome. It checks what the shell does, not the frame rate a panel shows: Chrome's headless page has no
// 120 Hz display, and the mode exists for iOS Safari, which this run does not cover.
//
// - The engine draws on an OffscreenCanvas: the canvas was moved to one when the engine asked it for a WebGL context.
// - The drawing buffer follows the window: the size the engine sets on the element reaches the OffscreenCanvas, and again after a resize.
// - The clock: frames never come faster than the rate asked for, and two frames never share a slot.
// - The frames reach the screen: a row of the Scrolling lab has ink in a screenshot.
// - Input still reaches the engine through the element: the wheel scrolls a list.

const HZ = 120;
const ADDRESS = `/?lab=scroll&hz=${HZ}`;
const VIEWPORT = { width: 1120, height: 800, deviceScaleFactor: 1 };
const RESIZED = { width: 600, height: 900, deviceScaleFactor: 2 };
/** How long the clock is sampled. */
const SAMPLE_MS = 2_000;
/** A frame may come this much early or late against its slot from the timer's millisecond rounding. */
const SLOT_TOLERANCE_MS = 1;
/** A row's text is dark ink on white: this many pixels darker than half intensity show it was drawn. */
const MINIMUM_INK_PIXELS = 20;
const INK_LUMINANCE = 128;
/** A wheel notch, in CSS pixels; the list moves by a share of it. */
const WHEEL_DELTA_Y = 240;
const STARTUP_TIMEOUT_MS = 180_000;
const ACTION_TIMEOUT_MS = 15_000;
const POLL_MS = 50;
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function waitFor(name, predicate, errors) {
  const deadline = Date.now() + ACTION_TIMEOUT_MS;
  while (!(await predicate())) {
    if (errors.length > 0) throw new Error(`${name}: ${errors.join('; ')}`);
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${name}`);
    await sleep(POLL_MS);
  }
}

/** The shell's state and the sizes of the element, the OffscreenCanvas and the root. */
const sizes = (page) => page.evaluate(() => {
  const state = globalThis.godotReactHighRefresh;
  const snapshot = globalThis.godotReactDemo.snapshot();
  return {
    innerWidth: window.innerWidth, innerHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio,
    element: { width: document.querySelector('canvas').width, height: document.querySelector('canvas').height },
    offscreen: state.offscreen === null ? null : { width: state.offscreen.width, height: state.offscreen.height },
    root: { width: snapshot.width, height: snapshot.height },
  };
});

const fillsWindow = (measured, viewport) => measured.offscreen !== null
  && measured.offscreen.width === Math.round(viewport.width * viewport.deviceScaleFactor)
  && measured.offscreen.height === Math.round(viewport.height * viewport.deviceScaleFactor)
  && measured.root.width === viewport.width && measured.root.height === viewport.height;

/** The rect of a node in CSS pixels of the page. */
const pageRectOf = (page, testID) => page.evaluate((id) => {
  const demo = globalThis.godotReactDemo;
  const found = demo.find(id);
  if (found === undefined) throw new Error(`No node ${id}`);
  const snapshot = demo.snapshot();
  const canvas = document.querySelector('canvas').getBoundingClientRect();
  const scaleX = canvas.width / snapshot.width;
  const scaleY = canvas.height / snapshot.height;
  return { x: canvas.x + found.rect.x * scaleX, y: canvas.y + found.rect.y * scaleY, width: found.rect.width * scaleX, height: found.rect.height * scaleY };
}, testID);

/** The text a node and its descendants hold, from the demo's snapshot. */
const textOf = (page, testID) => page.evaluate((id) => {
  const demo = globalThis.godotReactDemo;
  const snapshot = demo.snapshot();
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const collect = (node) => node.text + node.children.map((child) => collect(byId.get(child))).join('');
  return collect(demo.find(id));
}, testID);

export async function runHighRefreshScenario({ browser, base, check, output }) {
  await mkdir(output, { recursive: true });
  const errors = [];
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes(EMSCRIPTEN_STARTUP_DIAGNOSTIC)) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  const address = new URL(ADDRESS, base).href;
  await page.goto(address, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!(await page.evaluate(() => typeof globalThis.godotReactDemo?.snapshot === 'function' && globalThis.godotReactDemo.find('scroll-list') !== undefined))) {
    if (errors.length > 0 || Date.now() > deadline) throw new Error(`${address} did not start: ${errors.join('; ') || 'timed out'}`);
    await sleep(POLL_MS);
  }

  const state = await page.evaluate(() => {
    const shell = globalThis.godotReactHighRefresh;
    return shell === undefined ? null : { hz: shell.hz, transferred: shell.offscreen instanceof OffscreenCanvas };
  });
  check(`?hz=${HZ}: the shell runs the engine at ${HZ} Hz on an OffscreenCanvas it moved the canvas to`, state !== null && state.hz === HZ && state.transferred, state);

  await waitFor('the drawing buffer to fill the window', async () => fillsWindow(await sizes(page), VIEWPORT), errors);
  check('The OffscreenCanvas is the size the engine set on the element: the window in device pixels', true, await sizes(page));

  const clock = await page.evaluate((sampleMs) => new Promise((resolvePromise) => {
    const shell = globalThis.godotReactHighRefresh;
    const times = [];
    const frames = shell.frames;
    const pageUpdates = shell.pageUpdates;
    let running = true;
    const sample = () => {
      if (!running) return;
      times.push(performance.now());
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    const started = performance.now();
    setTimeout(() => {
      running = false;
      const gaps = times.slice(1).map((time, index) => time - times[index]);
      resolvePromise({
        frames: shell.frames - frames, pageUpdates: shell.pageUpdates - pageUpdates, samples: times.length, minimumGapMs: Math.min(...gaps),
        elapsedMs: performance.now() - started,
      });
    }, sampleMs);
  }), SAMPLE_MS);
  const interval = 1000 / HZ;
  // Slots are `interval` apart, so the time sampled holds at most one more frame than whole intervals (a frame at each end).
  const mostFrames = Math.floor(clock.elapsedMs / interval) + 1;
  check(`The engine's frames come no faster than ${HZ} a second`, clock.frames > 0 && clock.frames <= mostFrames, { ...clock, mostFrames });
  check('No two frames share a slot', clock.minimumGapMs >= interval / 2 - SLOT_TOLERANCE_MS, { ...clock, intervalMs: interval });

  const row = await pageRectOf(page, 'list-row-0');
  const png = Buffer.from(await page.screenshot({ type: 'png' }));
  await writeFile(resolve(output, `scroll-lab-${VIEWPORT.width}x${VIEWPORT.height}.png`), png);
  const shot = decodePng(png);
  let ink = 0;
  for (let y = Math.ceil(row.y); y < Math.floor(row.y + row.height); y += 1) {
    for (let x = Math.ceil(row.x); x < Math.floor(row.x + row.width); x += 1) {
      const offset = (y * shot.width + x) * shot.channels;
      const luminance = (shot.pixels[offset] + shot.pixels[offset + 1] + shot.pixels[offset + 2]) / 3;
      if (luminance < INK_LUMINANCE) ink += 1;
    }
  }
  check('The engine\'s frames reach the screen: the first row of the list has its text in a screenshot', ink >= MINIMUM_INK_PIXELS, { row, ink });

  const list = await pageRectOf(page, 'scroll-list');
  const before = await textOf(page, 'list-status');
  await page.mouse.move(list.x + list.width / 2, list.y + list.height / 2);
  await page.mouse.wheel({ deltaY: WHEEL_DELTA_Y });
  await waitFor('the list to scroll on the wheel', async () => !(await textOf(page, 'list-status')).startsWith('top 0,'), errors);
  check('Input reaches the engine through the placeholder element: the wheel scrolls the list', true, { before, after: await textOf(page, 'list-status') });

  await page.setViewport(RESIZED);
  await waitFor('the drawing buffer to follow the resized window', async () => fillsWindow(await sizes(page), RESIZED), errors);
  check('After a resize the OffscreenCanvas follows the window, at the new device pixel ratio', true, await sizes(page));
  await writeFile(resolve(output, `scroll-lab-${RESIZED.width}x${RESIZED.height}.png`), await page.screenshot({ type: 'png' }));

  check('The page logged no errors', errors.length === 0, { errors });
  await page.close();
}
