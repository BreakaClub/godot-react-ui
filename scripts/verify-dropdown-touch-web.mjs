// The `dropdown-touch` section of the Web interaction verifier (docs/tracks/dropdown-touch.md), on the touch page: real touch input from
// Chrome over the DevTools Protocol (puppeteer's touchscreen: touchstart, touchmove and touchend, no OS input) on the lists of the kit's
// `Select`, `Combobox` and `Combobox` with chips (demo/src/dropdown-touch-lab.tsx). The checks are the native section's
// (demo/src/verify-dropdown-touch.ts), made with the events a browser sends: a tap opens a list, a slow pan moves the list by about the
// finger's travel and neither the page nor the selection, an option that began out of view is in view and a tap on it chooses it, a pan too
// short to move far chooses nothing, and a flick keeps the list moving after the finger lifts.

const TOUCH_SLOP_PX = 8;
const PAN_STEPS = 6;
const PAN_STEP_PX = 20;
/** The pan follows the finger from where the slop was crossed, which is the first step. */
const PAN_FOLLOWED_PX = (PAN_STEPS - 1) * PAN_STEP_PX;
const SCROLL_TOLERANCE_PX = 1.5;
const SHORT_PAN_FIRST_PX = TOUCH_SLOP_PX + 2;
const SHORT_PAN_SECOND_PX = 6;
const FLICK_STEPS = 6;
const FLICK_STEP_PX = 24;
const FLICK_MIN_COAST_PX = 30;
/** The finger rests this long before it lifts, longer than the 100 ms after which the release velocity is dropped (native/scroll.rs). */
const STILL_MS = 300;
const COAST_POLL_MS = 100;
const COAST_DEADLINE_MS = 5000;
const SCROLLED_PAGE_PX = 80;
const PAGE = 'dropdown-touch-page';

const DROPDOWNS = [
  {
    name: 'Select', opener: 'dd-select', list: 'dd-select-list', prefix: 'dd-select-item-option-',
    chosen: (readout) => readout.select, staysOpen: false,
  },
  {
    name: 'Combobox', opener: 'dd-combobox-input', list: 'dd-combobox-list', prefix: 'dd-combobox-item-option-',
    chosen: (readout) => readout.combobox, staysOpen: false,
  },
  {
    name: 'Combobox with chips', opener: 'dd-chips-input', list: 'dd-chips-list', prefix: 'dd-chips-item-option-',
    chosen: (readout) => (readout.chips.length === 0 ? null : readout.chips.join(',')), staysOpen: true,
  },
];

export async function runTouchDropdownScenario(context) {
  const { demo, page, frames, snapshot, find, check, capture, waitUntil, nodeExists, text, pagePoint } = context;
  const readout = async () => JSON.parse(await text('dd-json'));
  const scrollTop = async (testID) => (await find(testID)).scroll.scrollTop;
  const maxScrollTop = async (testID) => (await find(testID)).scroll.maxScrollTop;
  const testIDOf = (node) => (typeof node?.props?.testID === 'string' ? node.props.testID : '');
  const rest = (ms) => page.evaluate((duration) => new Promise((resolve) => setTimeout(resolve, duration)), ms);
  const within = (rect, outer) => rect.y >= outer.y && rect.y + rect.height <= outer.y + outer.height;
  const centreOf = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  /** The page pixels one logical pixel is: the canvas is not necessarily drawn at the size the root lays out in. */
  const scaleY = async () => ((await pagePoint(0, 1)).y - (await pagePoint(0, 0)).y);

  const options = async (dropdown) => {
    const found = new Map();
    for (const node of (await snapshot()).nodes) {
      const testID = testIDOf(node);
      if (testID.startsWith(dropdown.prefix)) found.set(Number(testID.slice(dropdown.prefix.length)), node.rect);
    }
    return found;
  };

  /** A finger on the screen: logical points in, touches out. */
  const finger = {
    async down(point) {
      const at = await pagePoint(point.x, point.y);
      this.handle = await page.touchscreen.touchStart(at.x, at.y);
      this.at = at;
      await frames();
    },
    async moveBy(dy) {
      this.at = { x: this.at.x, y: this.at.y + dy * (await scaleY()) };
      await this.handle.move(this.at.x, this.at.y);
      await frames();
    },
    async up() {
      await this.handle.end();
      await frames();
    },
  };
  const tap = async (point) => {
    const at = await pagePoint(point.x, point.y);
    await page.touchscreen.tap(at.x, at.y);
    await frames();
  };

  const openList = async (dropdown, pageTop) => {
    await demo('showLab', 'hud');
    await frames();
    await demo('showLab', 'dropdown-touch');
    await waitUntil('the dropdown lab mounts on touch', () => nodeExists('dropdown-touch-lab'));
    if (pageTop > 0) {
      await demo('scrollTo', PAGE, pageTop);
      await frames();
    }
    check(`${dropdown.name}: the page is at ${pageTop}`, (await scrollTop(PAGE)) === pageTop, await scrollTop(PAGE));
    await tap(centreOf((await find(dropdown.opener)).rect));
    await waitUntil(`${dropdown.name}: a tap opens the list`, () => nodeExists(dropdown.list));
    check(`${dropdown.name}: nothing is chosen yet`, dropdown.chosen(await readout()) === null, await readout());
  };

  const verifyDropdown = async (dropdown, pageTop) => {
    const where = `${dropdown.name}, page at ${pageTop}`;
    await openList(dropdown, pageTop);
    const list = (await find(dropdown.list)).rect;
    const before = await scrollTop(dropdown.list);
    const unseen = [...await options(dropdown)].filter(([, rect]) => rect.y >= list.y + list.height).map(([index]) => index);
    check(`${where}: the list has options below what it shows`, unseen.length > 0, { unseen: unseen.length });
    check(`${where}: and room to pan them into view`, (await maxScrollTop(dropdown.list)) > PAN_FOLLOWED_PX, await maxScrollTop(dropdown.list));

    // A slow pan up the screen; the finger rests before it lifts, so nothing coasts.
    await finger.down(centreOf(list));
    for (let step = 0; step < PAN_STEPS; step += 1) await finger.moveBy(-PAN_STEP_PX);
    await rest(STILL_MS);
    await finger.up();
    const moved = (await scrollTop(dropdown.list)) - before;
    check(`${where}: a pan moves the list by the finger's travel from the slop (${PAN_FOLLOWED_PX} px)`, Math.abs(moved - PAN_FOLLOWED_PX) <= SCROLL_TOLERANCE_PX, { moved });
    check(`${where}: and the page stays at ${pageTop}`, (await scrollTop(PAGE)) === pageTop, await scrollTop(PAGE));
    check(`${where}: the list is still open and nothing was chosen`, (await nodeExists(dropdown.list)) && dropdown.chosen(await readout()) === null, await readout());

    // An option that began out of view is in view now, and a tap on it chooses it.
    const nowList = (await find(dropdown.list)).rect;
    const now = await options(dropdown);
    const target = unseen.sort((left, right) => left - right).find((index) => now.has(index) && within(now.get(index), nowList));
    check(`${where}: an option that began out of view is in view after the pan`, target !== undefined, { unseen });
    await tap(centreOf(now.get(target)));
    await waitUntil(`${where}: a tap on option ${target} chooses it`, async () => dropdown.chosen(await readout()) === `option-${target}`);
    check(`${where}: and the list is ${dropdown.staysOpen ? 'still open' : 'closed'}`, (await nodeExists(dropdown.list)) === dropdown.staysOpen);
    check(`${where}: and the page is still at ${pageTop}`, (await scrollTop(PAGE)) === pageTop, await scrollTop(PAGE));
  };

  const verifyShortPan = async (dropdown) => {
    const where = `${dropdown.name}, a short pan`;
    await openList(dropdown, 0);
    const list = (await find(dropdown.list)).rect;
    const before = await scrollTop(dropdown.list);
    const visible = [...await options(dropdown)].find(([, rect]) => within(rect, list));
    check(`${where}: an option is in view`, visible !== undefined);
    await finger.down(centreOf(visible[1]));
    await finger.moveBy(-SHORT_PAN_FIRST_PX);
    await finger.moveBy(-SHORT_PAN_SECOND_PX);
    await rest(STILL_MS);
    await finger.up();
    const moved = (await scrollTop(dropdown.list)) - before;
    check(`${where}: the list moved only by the second step (${SHORT_PAN_SECOND_PX} px)`, Math.abs(moved - SHORT_PAN_SECOND_PX) <= SCROLL_TOLERANCE_PX, { moved });
    check(`${where}: nothing was chosen and the list is open`, (await nodeExists(dropdown.list)) && dropdown.chosen(await readout()) === null, await readout());
  };

  const verifyFlick = async (dropdown) => {
    const where = `${dropdown.name}, a flick`;
    await openList(dropdown, 0);
    await finger.down(centreOf((await find(dropdown.list)).rect));
    for (let step = 0; step < FLICK_STEPS; step += 1) await finger.moveBy(-FLICK_STEP_PX);
    await finger.up();
    const released = await scrollTop(dropdown.list);
    const deadline = Date.now() + COAST_DEADLINE_MS;
    let last = Number.NaN;
    while (Date.now() < deadline) {
      await rest(COAST_POLL_MS);
      const now = await scrollTop(dropdown.list);
      if (now === last) break;
      last = now;
    }
    check(`${where}: the list keeps going after the finger lifts`, last > released + FLICK_MIN_COAST_PX, { released, last });
    check(`${where}: and comes to rest on its own`, (await scrollTop(dropdown.list)) === last);
    check(`${where}: the page did not move`, (await scrollTop(PAGE)) === 0, await scrollTop(PAGE));
    check(`${where}: nothing was chosen`, (await nodeExists(dropdown.list)) && dropdown.chosen(await readout()) === null, await readout());
  };

  for (const dropdown of DROPDOWNS) {
    await verifyDropdown(dropdown, 0);
    await verifyDropdown(dropdown, SCROLLED_PAGE_PX);
    await verifyShortPan(dropdown);
    await verifyFlick(dropdown);
  }

  // A raster of a list that was panned, to look at.
  await openList(DROPDOWNS[0], SCROLLED_PAGE_PX);
  await finger.down(centreOf((await find(DROPDOWNS[0].list)).rect));
  for (let step = 0; step < PAN_STEPS; step += 1) await finger.moveBy(-PAN_STEP_PX);
  await rest(STILL_MS);
  await capture('dropdown-touch-select-panned');
  await finger.up();
  await demo('showLab', 'hud');
}
