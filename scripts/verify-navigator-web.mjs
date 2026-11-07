import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// The `navigator` section of the Web interaction verifier: the lab navigator (demo/src/navigator.tsx) in Chrome, driven by Chrome's own
// mouse and keyboard through puppeteer (CDP, headless: no OS input). Mirrors demo/src/verify-navigator.ts for what a browser can do:
// the shell's geometry, every lab opened by a click without tripping its error boundary and with its node count and process idle
// after it, the filter, the keyboard, and a capture of each lab. A lab that throws is covered natively (a lab is a function, which cannot
// cross `page.evaluate`), and the start on a lab (`?lab=`) and the scene lab's round trip have their own pages: `runNavigatorStartScenario`.

const SIDEBAR_WIDTH_PX = 257;
const SIDEBAR_BREAKPOINT_PX = 1024;
const BASELINE_LAB = 'counter';
const GEOMETRY_TOLERANCE_PX = 2;
const SCROLL_MARGIN_PX = 40;
const IDLE_DEADLINE_MS = 4000;
/** The way back from the scene lab is a Godot button 16 px in from the bottom left corner, 132 x 36 (demo/src/scene-return.ts). */
const BACK_BUTTON = { insetLeft: 16, insetBottom: 16, width: 132, height: 36 };
const STARTUP_TIMEOUT_MS = 180_000;
const POLL_MS = 50;
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';

const near = (actual, expected) => Math.abs(actual - expected) <= GEOMETRY_TOLERANCE_PX;
const rectText = (rect) => `${rect.x},${rect.y} ${rect.width}x${rect.height}`;

export async function runNavigatorScenario(context) {
  const { demo, page, frames, snapshot, find, check, capture: capturePage, click, moveTo, text, waitUntil, nodeExists } = context;
  const capture = (name, options) => capturePage(name, options);
  const labs = await demo('labs');
  const shown = async (testID) => {
    const found = await find(testID).catch(() => undefined);
    return found !== undefined && found.rect.width > 0 && found.rect.height > 0;
  };
  const maybe = async (testID) => (await nodeExists(testID));
  const nodeCount = async () => (await snapshot()).nodes.length;
  const idle = async (what) => waitUntil(`the process to go idle after ${what}`, async () => !(await demo('surfaceProcessing')), IDLE_DEADLINE_MS);
  const park = async () => { await moveTo({ x: 1, y: 1 }); };

  const bringIntoView = async (listID, itemID) => {
    const [list, item] = await Promise.all([find(listID), find(itemID)]);
    check(`${listID} is a scroll container`, list.scroll !== null);
    if (item.rect.y >= list.rect.y && item.rect.y + item.rect.height <= list.rect.y + list.rect.height) return;
    await demo('scrollTo', listID, Math.max(0, list.scroll.scrollTop + item.rect.y - list.rect.y - SCROLL_MARGIN_PX));
    await frames();
  };
  const choose = async (lab) => {
    if (await shown('navigator-sidebar')) {
      await bringIntoView('lab-sidebar-scroll', `lab-item-${lab.id}`);
      await click(`lab-item-${lab.id}`);
    } else {
      await click('lab-menu');
      await waitUntil('the lab menu to open', () => maybe('lab-menu-list'));
      await frames();
      await bringIntoView('lab-menu-list', `lab-menu-item-${lab.id}`);
      await click(`lab-menu-item-${lab.id}`);
      await waitUntil('the lab menu to close', async () => !(await maybe('lab-menu-list')));
    }
    await park();
  };
  const assertOpen = async (lab) => {
    check(`The header names ${lab.id}`, (await text('lab-title')) === lab.title, { shown: await text('lab-title') });
    check(`${lab.id} did not trip its error boundary`, !(await maybe('lab-error')));
    if (await shown('navigator-sidebar')) {
      const item = await find(`lab-item-${lab.id}`);
      check(`${lab.id} is the selected option`, item.props.ariaSelected === true && item.props.role === 'option');
    } else {
      check(`The lab menu shows ${lab.id}`, (await text('lab-menu-value')) === lab.title);
    }
  };
  const shellGeometry = async () => {
    const data = await snapshot();
    const { width, height } = data;
    const wide = width >= SIDEBAR_BREAKPOINT_PX;
    const [header, stage] = await Promise.all([find('lab-header'), find('lab-stage')]);
    check('The content area ends at the window\'s corner', near(stage.rect.y + stage.rect.height, height) && near(stage.rect.x + stage.rect.width, width), { stage: rectText(stage.rect), width, height });
    check('The header sits on the content area', near(header.rect.y + header.rect.height, stage.rect.y) && near(header.rect.x, stage.rect.x) && near(header.rect.width, stage.rect.width));
    if (wide) {
      const sidebar = await find('navigator-sidebar');
      check('The top bar is hidden when the window is wide', !(await shown('navigator-bar')));
      check(`The sidebar is ${SIDEBAR_WIDTH_PX} wide and as tall as the window`, near(sidebar.rect.x, 0) && near(sidebar.rect.y, 0) && near(sidebar.rect.width, SIDEBAR_WIDTH_PX) && near(sidebar.rect.height, height), { sidebar: rectText(sidebar.rect) });
      check('The content area is what the sidebar leaves', near(stage.rect.x, SIDEBAR_WIDTH_PX) && near(stage.rect.width, width - SIDEBAR_WIDTH_PX), { stage: rectText(stage.rect) });
    } else {
      const bar = await find('navigator-bar');
      check('The sidebar is hidden when the window is narrow', !(await shown('navigator-sidebar')));
      check('The top bar spans the window and the header is under it', near(bar.rect.x, 0) && near(bar.rect.y, 0) && near(bar.rect.width, width) && near(header.rect.y, bar.rect.height), { bar: rectText(bar.rect) });
    }
    return wide;
  };
  const contentFit = async (lab) => {
    if (lab.kind !== 'inline' || lab.id === 'hud') return;
    const [stage, scroller] = await Promise.all([find('lab-stage'), find('lab-scroll')]);
    check(`${lab.id}: the scroll area is the content area`, near(scroller.rect.x, stage.rect.x) && near(scroller.rect.y, stage.rect.y) && near(scroller.rect.width, stage.rect.width) && near(scroller.rect.height, stage.rect.height));
    check(`${lab.id} needs no sideways scrolling`, scroller.scroll.scrollWidth <= scroller.scroll.clientWidth + GEOMETRY_TOLERANCE_PX, { scrollWidth: scroller.scroll.scrollWidth, clientWidth: scroller.scroll.clientWidth });
  };

  await demo('showNavigator');
  await waitUntil('the navigator to mount', () => maybe('navigator'));
  await frames();
  const wide = await shellGeometry();
  const baseline = labs.find((lab) => lab.id === BASELINE_LAB);
  await assertOpen(baseline);
  await idle('mounting the navigator');
  const baselineNodes = await nodeCount();
  await capture('navigator-shell');

  for (const lab of labs) {
    await choose(lab);
    await assertOpen(lab);
    check(`${lab.id}: a launch card is shown if and only if the lab is a window or scene lab`, (await maybe('lab-launch')) === (lab.kind !== 'inline'));
    await shellGeometry();
    await contentFit(lab);
    await capture(`navigator-${lab.id}`);
    if (lab.kind === 'window') {
      await click('lab-launch-open');
      await frames();
      check(`${lab.id} has the whole window`, !(await maybe('lab-list')) && !(await maybe('lab-menu')));
      check('The way back is in the overlay layer', (await find('window-bar')).layer === 1);
      await capture(`navigator-${lab.id}-window`, { geometry: false });
      await context.page.keyboard.press('Escape');
      await frames();
      check('Escape gives the window back to the navigator', (await maybe('lab-launch')) && !(await maybe('window-bar')));
    }
    if (lab.kind === 'scene') check('The scene lab offers an enabled button', (await find('lab-launch-open')).props.disabled !== true);
    await choose(baseline);
    await assertOpen(baseline);
    await idle(lab.id);
    check(`Leaving ${lab.id} puts the node count back`, (await nodeCount()) === baselineNodes, { nodes: await nodeCount(), baselineNodes });
  }

  // The filter.
  const field = wide ? 'lab-filter-input' : 'lab-menu-filter-input';
  const listed = async () => (await snapshot()).nodes
    .sort((a, b) => a.documentIndex - b.documentIndex)
    .map((entry) => entry.props.testID)
    .filter((id) => typeof id === 'string' && id.startsWith(wide ? 'lab-item-' : 'lab-menu-item-'))
    .map((id) => id.slice(wide ? 'lab-item-'.length : 'lab-menu-item-'.length));
  await click(field);
  await page.keyboard.type('glass');
  await frames();
  if (wide) {
    check('Typing "glass" leaves the one lab', JSON.stringify(await listed()) === JSON.stringify(['glass']), { listed: await listed() });
    await capture('navigator-filter');
  } else {
    await click('lab-menu');
    await waitUntil('the lab menu to open', () => maybe('lab-menu-list'));
    await frames();
    check('The menu holds the matches and the current lab', JSON.stringify(await listed()) === JSON.stringify(['counter', 'glass']), { listed: await listed() });
    await capture('navigator-filter');
    await page.keyboard.press('Escape');
    await waitUntil('the lab menu to close', async () => !(await maybe('lab-menu-list')));
    await click(field);
  }
  check('Filtering opens nothing', (await text('lab-title')) === baseline.title);
  await page.keyboard.press('Escape');
  await frames();
  check('Escape in the filter clears it', (await listed()).length === labs.length);
  await park();

  // The keyboard.
  if (wide) {
    await click('lab-filter-input');
    await page.keyboard.press('Tab');
    await frames();
    const focused = async () => {
      const data = await snapshot();
      const entry = data.nodes.find((candidate) => candidate.id === data.focused);
      return entry?.props.testID;
    };
    check('Tab goes from the filter to the list\'s tab stop, the current lab', (await focused()) === `lab-item-${baseline.id}`, { focused: await focused() });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await frames();
    check('Down twice moves focus two labs on', (await focused()) === `lab-item-${labs[2].id}`, { focused: await focused() });
    await page.keyboard.press('Enter');
    await frames();
    check('Enter opens the focused lab', (await text('lab-title')) === labs[2].title);
    await page.keyboard.down('Alt');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Alt');
    await frames();
    check('Alt+Down opens the next lab', (await text('lab-title')) === labs[3].title);
    await page.keyboard.down('Alt');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Alt');
    await frames();
    check('Alt+Up opens the previous lab', (await text('lab-title')) === labs[2].title);
    await capture('navigator-keyboard-focus');
  }
  await choose(baseline);
  await demo('showNavigator', { initialLab: 'drag' });
  await frames();
  check('The navigator opens on the lab it is given', (await text('lab-title')) === 'Drag and drop' && (await maybe('drag-lab')));
  await demo('showNavigator', { initialLab: 'no-such-lab' });
  await frames();
  check('An unknown lab id is shown as an error', (await maybe('lab-missing')) && (await text('lab-missing-message')).includes('no-such-lab') && !(await maybe('drag-lab')));
  await capture('navigator-missing');
}

/**
 * Opens `address` in a page of its own and returns it once the demo's inspection API exists. A console error fails the run, as the
 * verifier's own page's would; the engine's one startup diagnostic is not an error.
 */
async function openPage(browser, address, viewport, errors) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes(EMSCRIPTEN_STARTUP_DIAGNOSTIC)) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(address, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!(await page.evaluate(() => typeof globalThis.godotReactDemo?.snapshot === 'function'))) {
    if (errors.length > 0 || Date.now() > deadline) throw new Error(`${address} did not start: ${errors.join('; ') || 'timed out'}`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return page;
}

/**
 * The start on a lab and the scene lab's round trip, each in a page of its own because they are about what the demo does when it
 * starts. `base` is the export's address. The bare address is the playground (what the verifiers load), `?demo=navigator` the
 * navigator, `?lab=<id>` the navigator on that lab, and an unknown id an error on screen.
 */
export async function runNavigatorStartScenario({ browser, base, check, viewport, output }) {
  const errors = [];
  const text = (page, testID) => page.evaluate((id) => {
    const demo = globalThis.godotReactDemo;
    const snapshot = demo.snapshot();
    const collect = (node) => node.text + node.children.map((child) => collect(snapshot.nodes.find((candidate) => candidate.id === child))).join('');
    return collect(demo.find(id));
  }, testID);
  const exists = (page, testID) => page.evaluate((id) => globalThis.godotReactDemo.find(id) !== undefined, testID);
  const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  const open = (query) => openPage(browser, new URL(query, base).href, viewport, errors);

  let page = await open('/');
  check('The bare address opens the playground the verifiers drive', await exists(page, 'app') && !(await exists(page, 'navigator')));
  await page.close();

  page = await open('/?demo=navigator');
  await frames(page);
  check('?demo=navigator opens the navigator on its first lab', await exists(page, 'navigator') && (await text(page, 'lab-title')) === 'Counter');
  await page.close();

  page = await open('/?lab=glass');
  await frames(page);
  check('?lab=glass opens the navigator on the glass lab', (await text(page, 'lab-title')) === 'Frosted glass' && await exists(page, 'lab-launch'));
  await page.close();

  page = await open('/?lab=no-such-lab');
  await frames(page);
  check('?lab= with an unknown id is an error on screen, not a default lab',
    await exists(page, 'lab-missing') && (await text(page, 'lab-missing-message')).includes('no-such-lab') && !(await exists(page, 'counter-lab')));
  await page.close();

  // The scene lab: open the scene, then come back with the Godot button, and the navigator is on the same lab.
  page = await open('/?lab=world');
  await frames(page);
  check('?lab=world opens the scene lab\'s card', (await text(page, 'lab-title')) === 'World space' && await exists(page, 'lab-launch-open'));
  const point = await page.evaluate(() => {
    const demo = globalThis.godotReactDemo;
    const button = demo.find('lab-launch-open');
    return { x: button.rect.x + button.rect.width / 2, y: button.rect.y + button.rect.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!(await page.evaluate(() => typeof globalThis.godotReactWorld?.snapshot === 'function' && globalThis.godotReactDemo === undefined))) {
    if (errors.length > 0 || Date.now() > deadline) throw new Error(`The world scene did not open: ${errors.join('; ') || 'timed out'}`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  check('Opening the scene lab changes to the world scene', true);
  await frames(page);
  await mkdir(output, { recursive: true });
  const canvas = await page.$('canvas');
  await canvas.screenshot({ path: resolve(output, 'navigator-world-scene.png'), type: 'png' });
  await canvas.dispose();
  const size = page.viewport();
  await page.mouse.click(BACK_BUTTON.insetLeft + BACK_BUTTON.width / 2, size.height - BACK_BUTTON.insetBottom - BACK_BUTTON.height / 2);
  while (!(await page.evaluate(() => typeof globalThis.godotReactDemo?.snapshot === 'function'))) {
    if (errors.length > 0 || Date.now() > deadline) throw new Error(`The navigator did not come back: ${errors.join('; ') || 'timed out'}`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  await frames(page);
  check('The way back returns to the navigator on the scene lab', (await text(page, 'lab-title')) === 'World space' && await exists(page, 'lab-launch'));
  await page.close();
  check('No page of the start checks logged an error', errors.length === 0, { errors });
}
