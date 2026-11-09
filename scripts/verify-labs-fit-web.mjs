import { fitProblems } from './labs-fit.mjs';

// The `labs-fit` section of the Web interaction verifier (docs/tracks/lab-clarity.md): every lab of the navigator on Ben's phone, in Chrome's mobile
// emulation through the DevTools protocol (412 x 915 CSS pixels at a pixel ratio of 2.625, touch on), headless, so no OS input. A lab fits when
// nothing outside a scroll container that scrolls sideways passes the viewport and the navigator's content area has nothing to scroll sideways
// (`fitProblems` in scripts/labs-fit.mjs). A window lab is opened in its window and judged there; the scene lab is a Godot scene of its own and is
// judged by its launch card only.

/** Chrome's mobile emulation of Ben's Android phone class. */
const PHONE = { width: 412, height: 915, deviceScaleFactor: 2.625 };
const PORTRAIT = { type: 'portraitPrimary', angle: 0 };
const STARTUP_TIMEOUT_MS = 180_000;
const SETTLE_DEADLINE_MS = 5_000;
const POLL_MS = 50;
const SETTLE_FRAMES = 8;
const TAPS_FRAMES = 4;
/** The most nodes a failure names per lab: the first ones show the cause, and the numbers are in the report. */
const NODES_NAMED = 8;
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';

/**
 * Nodes a lab shows past the phone's edge on purpose, by test id, with the reason. The node and everything under it are not judged. Empty
 * unless a case demonstrates something that needs the overflow itself, and then each entry says what.
 * @type {Readonly<Record<string, string>>}
 */
export const FIT_EXCEPTIONS = {
  'glass-aurora': 'the coloured blobs behind the glass run past the window\'s edges by design, and the aurora clips them (overflow-hidden): nothing shows past the phone\'s edge',
  'glass-stack-decor-3': 'the last circle behind the stacked panels sits past a phone\'s width; the lab\'s root clips it at the window\'s edge (overflow-hidden)',
  'glass-dual-decor-3': 'the last circle behind the frosted card sits past a phone\'s width; the lab\'s root clips it at the window\'s edge (overflow-hidden)',
};

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

/** Opens the navigator on a phone in portrait with touch on, in a page of its own. A console error is collected in `errors`. */
async function openPhone(browser, address, errors) {
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: PHONE.width, height: PHONE.height, deviceScaleFactor: PHONE.deviceScaleFactor, mobile: true,
    screenWidth: PHONE.width, screenHeight: PHONE.height, screenOrientation: PORTRAIT,
  });
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
  return page;
}

const frames = (page, count) => page.evaluate((total) => new Promise((resolvePromise) => {
  let left = total;
  const next = () => (left -= 1) <= 0 ? resolvePromise() : requestAnimationFrame(next);
  requestAnimationFrame(next);
}), count);

/** Wait for the root to stop asking for frames, within a deadline: a lab that animates for ever (a loop) is judged as it is. */
async function settle(page) {
  await frames(page, SETTLE_FRAMES);
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (await page.evaluate(() => globalThis.godotReactDemo.surfaceProcessing()) && Date.now() < deadline) await sleep(POLL_MS);
  await frames(page, SETTLE_FRAMES);
}

/** The root's size and the parts of every node that `fitProblems` reads. */
const fitSnapshot = (page) => page.evaluate(() => {
  const { width, nodes } = globalThis.godotReactDemo.snapshot();
  return {
    width,
    nodes: nodes.map((node) => ({
      id: node.id, kind: node.kind, children: node.children, rect: node.rect,
      props: { testID: node.props.testID },
      scroll: node.scroll === null ? null : { scrollWidth: node.scroll.scrollWidth, clientWidth: node.scroll.clientWidth },
    })),
  };
});

/** Tap the centre of the node `testID` with a touch. */
async function tapNode(page, testID) {
  const rect = await page.evaluate((id) => globalThis.godotReactDemo.find(id)?.rect ?? null, testID);
  if (rect === null) throw new Error(`There is no ${testID} to tap`);
  await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await frames(page, TAPS_FRAMES);
}

/**
 * Shows each lab on a phone and judges whether it fits. Every lab is judged before the section reports, so a failing run names all the labs that
 * overflow and the nodes that do, not only the first. `base` is the export's address.
 */
export async function runLabsFitScenario({ browser, base, check }) {
  const errors = [];
  const page = await openPhone(browser, new URL('/?demo=navigator', base).href, errors);
  const labs = await page.evaluate(() => globalThis.godotReactDemo.labs());
  const results = [];
  for (const lab of labs) {
    await page.evaluate((id) => globalThis.godotReactDemo.showNavigator({ initialLab: id }), lab.id);
    await settle(page);
    const snapshot = await fitSnapshot(page);
    const problems = fitProblems(snapshot, FIT_EXCEPTIONS);
    if (lab.kind === 'window') {
      await tapNode(page, 'lab-launch-open');
      await settle(page);
      problems.push(...fitProblems(await fitSnapshot(page), FIT_EXCEPTIONS).map((problem) => `in its window: ${problem}`));
      await page.keyboard.press('Escape');
      await settle(page);
    }
    results.push({ lab, width: snapshot.width, problems });
  }
  for (const { lab, width, problems } of results.filter((result) => result.problems.length === 0)) {
    check(`${lab.id} fits a phone: the root is ${Math.round(width)} wide and nothing outside a sideways scroller passes it`, true);
  }
  const failing = results.filter((result) => result.problems.length > 0);
  check(
    `Every lab fits a phone (412 px); these do not: ${failing.map((result) => result.lab.id).join(', ') || 'none'}`,
    failing.length === 0,
    Object.fromEntries(failing.map((result) => [result.lab.id, { count: result.problems.length, first: result.problems.slice(0, NODES_NAMED) }])),
  );
  check('The phone page logged no console error', errors.length === 0, { errors });
  await page.close();
}
