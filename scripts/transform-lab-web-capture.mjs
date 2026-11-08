// The transforms lab as the library draws it on the Web, in the navigator, at a phone's size and a desktop's, for the comparison with Chrome's own page
// (`scripts/transform-lab-reference.mjs`, docs/tracks/transforms-lab.md). Every case is shown with the lab's own case list state (`godotReactTransformLab.setCase`),
// and the page's whole viewport is saved as Chrome paints it at that device pixel ratio: `<out>/web-<device>/<case>.png`. `<out>/offsets.json` is where the lab
// sits on each device, which the reference page is given so that the two pictures have the lab at the same device pixels.
//
//   node scripts/transform-lab-web-capture.mjs [--out=<dir>]
//
// The export is the one `pnpm build:web` made for this tree (the freshness guard refuses a stale one) and is served by this script on a free port. Chrome runs headless
// through Puppeteer, driven by the DevTools protocol (a phone is Chrome's mobile emulation with touch); no real OS input is generated.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';
import { startVerificationServer } from './web-verify.mjs';

rejectUnknownArguments(process.argv.slice(2), { prefixes: ['--out='] });
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
engine.requireFreshWebExport();
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = resolve(process.argv.find(value => value.startsWith('--out='))?.slice('--out='.length) ?? resolve(root, 'artifacts/transforms-lab-web'));

/** Ben's Android phone as Chrome emulates it (scripts/verify-rotation-web.mjs), and the desktop window the Web verifier has. */
const DEVICES = {
  phone: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  desktop: { width: 1120, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
const STARTUP_TIMEOUT_MS = 180_000;
const POLL_MS = 50;
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';
/** Frames a case is given to be drawn, and how long the cases that animate on their own are given to finish (the starting transitions run 400 ms, the loop's step 280 ms). */
const SETTLE_FRAMES = 8;
const ANIMATION_SETTLE_MS = 800;
const LOOP_STEP_SETTLE_MS = 450;
const LOOP_STEPS = 4;
/** The file of the hit page captured right after a tap on the bar, while its outline is up (`HIT_FLASH_MS` is 900). */
const TAPPED = 'hit-tapped';

const sleep = ms => new Promise(done => setTimeout(done, ms));
const slug = id => id.replace(':', '-');

const server = await startVerificationServer(engine);
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
const errors = [];
const offsets = {};
let failed = false;
try {
  for (const [name, device] of Object.entries(DEVICES)) {
    const page = await browser.newPage();
    await page.setViewport(device);
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().includes(EMSCRIPTEN_STARTUP_DIAGNOSTIC)) errors.push(`${name}: ${message.text()}`);
    });
    page.on('pageerror', error => errors.push(`${name}: ${String(error)}`));
    await page.goto(new URL('/?demo=navigator&lab=transforms', server.url).href, { waitUntil: 'domcontentloaded' });
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (!(await page.evaluate(() => typeof globalThis.godotReactTransformLab?.setCase === 'function' && typeof globalThis.godotReactDemo?.snapshot === 'function'))) {
      if (errors.length > 0 || Date.now() > deadline) throw new Error(`${name}: the lab did not start: ${errors.join('; ') || 'timed out'}`);
      await sleep(POLL_MS);
    }
    const directory = resolve(out, `web-${name}`);
    await mkdir(directory, { recursive: true });
    const cdp = await page.createCDPSession();

    const frames = count => page.evaluate(wanted => new Promise(done => {
      let left = wanted;
      const next = () => (left -= 1) <= 0 ? done() : requestAnimationFrame(next);
      requestAnimationFrame(next);
    }), count);
    const find = testID => page.evaluate(id => globalThis.godotReactDemo.find(id), testID);
    /** Where an element's middle is in the page's (CSS) pixels: its rectangle is root-local, and the root is the canvas. */
    const middleOf = async testID => page.evaluate(id => {
      const found = globalThis.godotReactDemo.find(id);
      if (found === undefined) throw new Error(`No element ${id}`);
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      const scale = canvas.width / globalThis.godotReactDemo.snapshot().width;
      return { x: canvas.x + (found.rect.x + found.rect.width / 2) * scale, y: canvas.y + (found.rect.y + found.rect.height / 2) * scale };
    }, testID);
    const tap = async testID => {
      const at = await middleOf(testID);
      if (device.hasTouch) await page.touchscreen.tap(at.x, at.y);
      else await page.mouse.click(at.x, at.y);
    };
    const save = async file => {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(resolve(directory, `${file}.png`), Buffer.from(data, 'base64'));
    };
    const labRect = async () => (await find('transform-lab')).rect;
    // The case ids are the lab's own: its list is the single source.
    const options = await page.evaluate(() => globalThis.godotReactTransformLab.cases());

    for (const id of options) {
      await page.evaluate(value => globalThis.godotReactTransformLab.setCase(value), id);
      await frames(SETTLE_FRAMES);
      if (id === 'loop') {
        // The loop runs on its own: stop it and bring it to its first step, so that the picture is a known one.
        await tap('loop-toggle');
        await frames(SETTLE_FRAMES);
        for (let step = 0; step < LOOP_STEPS && !/step 0$/u.test((await find('loop-step-label')).text); step += 1) {
          await tap('loop-step');
          await sleep(LOOP_STEP_SETTLE_MS);
        }
        await sleep(LOOP_STEP_SETTLE_MS);
      } else if (id === 'starting' || id === 'combined' || id.startsWith('transition:')) {
        await sleep(ANIMATION_SETTLE_MS);
      }
      await frames(SETTLE_FRAMES);
      const rect = await labRect();
      if (offsets[name] === undefined) offsets[name] = { x: rect.x, y: rect.y };
      else if (offsets[name].x !== rect.x || offsets[name].y !== rect.y) {
        console.error(`${name}/${id}: the lab is at ${rect.x},${rect.y}, not where the first case had it (${offsets[name].x},${offsets[name].y})`);
        failed = true;
      }
      await save(slug(id));
      if (id === 'hit') {
        // A tap on the turned bar, captured while its outline is up.
        await tap('hit-bar');
        await frames(SETTLE_FRAMES);
        await save(TAPPED);
      }
    }
    // Where the labels of the page on screen are, for the notes: Ben's screenshot is this page at this size.
    const view = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio, scrollWidth: document.documentElement.scrollWidth }));
    console.log(`${name}: ${options.length} cases captured in ${directory} (viewport ${view.width} x ${view.height} at ${view.dpr}, document ${view.scrollWidth} wide), lab at ${JSON.stringify(offsets[name])}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
await writeFile(resolve(out, 'offsets.json'), `${JSON.stringify(offsets, null, 2)}\n`);
if (errors.length > 0) {
  console.error(`The page logged ${errors.length} error(s):\n${errors.slice(0, 10).join('\n')}`);
  failed = true;
}
if (failed) process.exit(1);
