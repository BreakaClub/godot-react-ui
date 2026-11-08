import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SIDEBAR_BREAKPOINT_PX } from './verify-navigator-web.mjs';
import { outsideTheRoot, rotationProblems, transientRootProblems } from './rotation-check.mjs';

// The `rotation` section of the Web interaction verifier (docs/tracks/rotation.md): a phone or tablet turned from portrait to landscape and
// back, with the navigator on screen. Chrome's mobile emulation drives it through the DevTools protocol (`Emulation.setDeviceMetricsOverride` with
// `mobile` and a screen orientation), headless, so no OS input and no real device; a real Android or iOS device is not covered.
//
// After each turn, once the page has settled, every layer the size passes through is compared with the device's viewport
// (`rotationProblems`): the browser's layout viewport and zoom, the document's overflow, the canvas, the root, and the navigator's nodes.

/** Chrome's mobile emulation of Ben's Android phone class: 412 x 915 CSS pixels at a device pixel ratio of 2.625 (1080 x 2400 device pixels). */
const PHONE = { name: 'phone', width: 412, height: 915, deviceScaleFactor: 2.625 };
/** A tablet: its portrait is under the navigator's sidebar breakpoint and its landscape over it, so the turn changes the navigator's layout. */
const TABLET = { name: 'tablet', width: 800, height: 1280, deviceScaleFactor: 2 };
const PORTRAIT = { type: 'portraitPrimary', angle: 0 };
const LANDSCAPE = { type: 'landscapePrimary', angle: 90 };

/**
 * The turns of each page. A page starts in portrait, so the first turn of each is portrait to landscape; the phone's chain ends with a
 * second landscape, which is also portrait to landscape after a turn back.
 */
const CASES = [
  { name: 'phone', device: PHONE, listOpen: false, turns: ['landscape', 'portrait', 'landscape'] },
  { name: 'phone-list-open', device: PHONE, listOpen: true, turns: ['landscape', 'portrait'] },
  { name: 'tablet', device: TABLET, listOpen: false, turns: ['landscape', 'portrait'] },
];

/** How long a page may take to fill the viewport again after a turn; the engine looks at the window's size every frame, so a healthy page takes a few frames. */
const SETTLE_DEADLINE_MS = 5_000;
/** How long the page must keep filling the viewport after it first does, so a size that is right for one frame and wrong again does not pass. */
const STABLE_FRAMES = 30;
const STARTUP_TIMEOUT_MS = 180_000;
const POLL_MS = 50;
const ACTION_TIMEOUT_MS = 15_000;
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

/** Turn the emulated device: its viewport, its screen and its orientation change together, as they do on a phone (`orientationchange`, then `resize`). */
async function turn(cdp, device, orientation) {
  const landscape = orientation === 'landscape';
  const [width, height] = landscape ? [device.height, device.width] : [device.width, device.height];
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: device.deviceScaleFactor, mobile: true, screenWidth: width, screenHeight: height,
    screenOrientation: landscape ? LANDSCAPE : PORTRAIT,
  });
  return { width, height, deviceScaleFactor: device.deviceScaleFactor };
}

/** The page's layers at this moment, in the shape `rotationProblems` reads (`outside` is computed from the snapshot here, in Node). */
async function observe(page) {
  const { facts, snapshot } = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    let snapshot = null;
    try {
      snapshot = globalThis.godotReactDemo.snapshot();
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('not mounted'))) throw error;
    }
    return {
      facts: {
        innerWidth: window.innerWidth, innerHeight: window.innerHeight, visualScale: window.visualViewport.scale, devicePixelRatio: window.devicePixelRatio,
        documentClientWidth: document.documentElement.clientWidth, documentClientHeight: document.documentElement.clientHeight,
        documentScrollWidth: document.documentElement.scrollWidth, documentScrollHeight: document.documentElement.scrollHeight,
        canvas: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, backingWidth: canvas.width, backingHeight: canvas.height },
      },
      snapshot,
    };
  });
  return {
    ...facts,
    root: snapshot === null ? null : { width: snapshot.width, height: snapshot.height },
    outside: snapshot === null ? [] : outsideTheRoot(snapshot),
    snapshot,
  };
}

/**
 * Wait for the page to fill `viewport`, within `SETTLE_DEADLINE_MS`, then hold it to that for `STABLE_FRAMES` more frames. Returns the last
 * observation, how long the page took, and the problems it still had (empty when it settled).
 */
async function settle(page, viewport) {
  const started = Date.now();
  let observation = await observe(page);
  let problems = rotationProblems(observation, viewport);
  while (problems.length > 0 && Date.now() - started < SETTLE_DEADLINE_MS) {
    await sleep(POLL_MS);
    observation = await observe(page);
    problems = rotationProblems(observation, viewport);
  }
  const settledAfterMs = Date.now() - started;
  if (problems.length === 0) {
    await page.evaluate((frames) => new Promise((resolvePromise) => {
      let left = frames;
      const next = () => (left -= 1) <= 0 ? resolvePromise() : requestAnimationFrame(next);
      requestAnimationFrame(next);
    }), STABLE_FRAMES);
    observation = await observe(page);
    problems = rotationProblems(observation, viewport);
  }
  return { observation, problems, settledAfterMs };
}

/** Opens the navigator in a page of its own with `device` in portrait, touch on, and returns it with its protocol session. A console error fails the run. */
async function openPhone(browser, address, device, errors) {
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await turn(cdp, device, 'portrait');
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes(EMSCRIPTEN_STARTUP_DIAGNOSTIC)) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(address, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!(await page.evaluate(() => typeof globalThis.godotReactDemo?.snapshot === 'function'))) {
    if (errors.length > 0 || Date.now() > deadline) throw new Error(`${address} did not start: ${errors.join('; ') || 'timed out'}`);
    await sleep(POLL_MS);
  }
  return { page, cdp };
}

/** Record the root's size at every frame until `stopRootSampler`, in the page, so a size that is wrong for a few frames of a turn is seen. */
function startRootSampler(page) {
  return page.evaluate(() => {
    const samples = [];
    const state = { running: true, samples };
    const sample = () => {
      if (!state.running) return;
      const rect = globalThis.godotReactDemo.rootRect();
      if (rect !== undefined) samples.push([rect.width, rect.height]);
      requestAnimationFrame(sample);
    };
    globalThis.rotationRootSampler = state;
    sample();
  });
}

/** Stop recording and return the root's size at each frame since `startRootSampler`. */
function stopRootSampler(page) {
  return page.evaluate(() => {
    const state = globalThis.rotationRootSampler;
    state.running = false;
    return state.samples;
  });
}

/** Whether the lab menu's list is on screen. */
const labListShown = (page) => page.evaluate(() => {
  const list = globalThis.godotReactDemo.find('lab-menu-list');
  return list !== undefined && list.rect.width > 0 && list.rect.height > 0;
});

/** Tap the lab menu with a touch, which opens its list, and wait for the list. The list must be closed. */
async function openLabList(page) {
  const point = await page.evaluate(() => {
    const demo = globalThis.godotReactDemo;
    const found = demo.find('lab-menu');
    const snapshot = demo.snapshot();
    const canvas = document.querySelector('canvas').getBoundingClientRect();
    return {
      x: canvas.x + (found.rect.x + found.rect.width / 2) * canvas.width / snapshot.width,
      y: canvas.y + (found.rect.y + found.rect.height / 2) * canvas.height / snapshot.height,
    };
  });
  await page.touchscreen.tap(point.x, point.y);
  const deadline = Date.now() + ACTION_TIMEOUT_MS;
  while (!(await labListShown(page))) {
    if (Date.now() > deadline) throw new Error('The lab list did not open on a touch');
    await sleep(POLL_MS);
  }
}

/**
 * Turns the device in each case and checks, after every turn, that the page fills the viewport it was turned to: the browser's layout
 * viewport, the canvas, the root and the navigator's nodes. A case with `listOpen` leaves the lab menu's list open as it turns, and opens it
 * again after a turn that closed it: the list is positioned inside the root, so it must follow the root's size. `base` is the export's address;
 * each case is a page of its own.
 */
export async function runRotationScenario({ browser, base, check, output }) {
  await mkdir(output, { recursive: true });
  const errors = [];
  const address = new URL('/?demo=navigator', base).href;
  for (const { name, device, listOpen, turns } of CASES) {
    const { page, cdp } = await openPhone(browser, address, device, errors);
    let viewport = { width: device.width, height: device.height, deviceScaleFactor: device.deviceScaleFactor };
    let shots = 0;
    const verify = async (label) => {
      const { observation, problems, settledAfterMs } = await settle(page, viewport);
      const { snapshot, ...facts } = observation;
      const wide = viewport.width >= SIDEBAR_BREAKPOINT_PX;
      const list = (await labListShown(page)) ? 'open' : 'closed';
      const found = (testID) => snapshot !== null && snapshot.nodes.some((node) => node.props.testID === testID && node.rect.width > 0 && node.rect.height > 0);
      shots += 1;
      // The page's own screenshot is of the viewport puppeteer last set, not the emulated device's: ask the protocol.
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(resolve(output, `${name}-${shots}-${viewport.width}x${viewport.height}.png`), Buffer.from(data, 'base64'));
      check(`${name}, ${label} (lab list ${list}): the root, the canvas and the browser's viewport are the device's ${viewport.width} x ${viewport.height}`, problems.length === 0, { problems, settledAfterMs, observed: facts });
      check(`${name}, ${label} (lab list ${list}): the navigator has the layout of a ${wide ? 'wide' : 'narrow'} window`, found('navigator-sidebar') === wide && found('navigator-bar') === !wide, { width: viewport.width });
    };
    await verify('at the start in portrait');
    if (listOpen) {
      await openLabList(page);
      await verify('with the lab list opened in portrait');
    }
    for (const orientation of turns) {
      await startRootSampler(page);
      viewport = await turn(cdp, device, orientation);
      await verify(`turned to ${orientation}`);
      const samples = await stopRootSampler(page);
      check(`${name}, turned to ${orientation}: the root had the size of one orientation or the other at every frame`, samples.length > 0 && transientRootProblems(samples, device).length === 0,
        { frames: samples.length, problems: transientRootProblems(samples, device) });
      if (listOpen && !(await labListShown(page))) {
        await openLabList(page);
        await verify(`with the lab list opened after turning to ${orientation}`);
      }
    }
    await page.close();
  }
  check('No page of the rotation checks logged an error', errors.length === 0, { errors });
}
