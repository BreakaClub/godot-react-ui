// Four reported pointer sequences in the code editor, driven through a headless browser's own input protocol:
// Chrome through CDP (`Input.dispatchMouseEvent`), Firefox through WebDriver BiDi (`input.performActions`), both by puppeteer-core. No OS input
// is generated. It opens a page of the lab navigator on the Counter lab, presses Code and runs the sequences one after the other in that page,
// as reported, recording after each step what the editor says and what the native scroll container says.
//
//   node scripts/repro-editor-pointer.mjs [--browser=chrome|firefox] [--url=<address of the navigator>] [--width=1400] [--height=900]
//                                         [--dpr=1] [--out=<json file>] [--expect-fixed]
//
// `--url` defaults to the deployed site; give `http://127.0.0.1:<port>/?demo=navigator` for a local export (`pnpm demo:web` serves one).
// With `--expect-fixed` the script exits 1 when a step shows one of the four defects, so it is a check; without it, it only reports.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';

rejectUnknownArguments(process.argv.slice(2), { flags: ['--expect-fixed'], prefixes: ['--browser=', '--url=', '--width=', '--height=', '--dpr=', '--out='], engine: false });
const argument = (name, fallback) => process.argv.find((candidate) => candidate.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const browserName = argument('browser', 'chrome');
const url = argument('url', 'https://react.breaka.club/?demo=navigator');
const width = Number(argument('width', '1400'));
const height = Number(argument('height', '900'));
const deviceScaleFactor = Number(argument('dpr', '1'));
const out = argument('out', undefined);
const expectFixed = process.argv.includes('--expect-fixed');

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FIREFOX = process.env.FIREFOX ?? '/Applications/Firefox.app/Contents/MacOS/firefox';
const STARTUP_TIMEOUT_MS = 120_000;
const STEP_TIMEOUT_MS = 20_000;
const POLL_MS = 100;
/** Longer than the click-count interval (500 ms): the next press begins a new sequence. */
const CLICK_SEQUENCE_PAUSE_MS = 650;
/** The wheel distance of the scroll sequence, in pixels, in notches of the size a mouse wheel gives. */
const WHEEL_NOTCH_PX = 100;
const WHEEL_NOTCHES = 4;
/** Characters a drag covers in the drag sequence. */
const DRAG_COLUMNS = 6;
/** The editor's selection colours (demo/src/editor/theme.ts): focused and not. */
const SELECTION_COLOURS = ['#2563eb77', '#47556977'];

const launch = browserName === 'firefox'
  ? { browser: 'firefox', executablePath: FIREFOX, headless: true, protocol: 'webDriverBiDi' }
  : { browser: 'chrome', executablePath: CHROME, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] };
const browser = await puppeteer.launch({ ...launch, timeout: STARTUP_TIMEOUT_MS });
const log = [];
const failures = [];
let page;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function frames() {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
}

async function waitUntil(name, predicate, timeout = STEP_TIMEOUT_MS) {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${name}`);
    await sleep(POLL_MS);
  }
}

const demo = (method, ...args) => page.evaluate((name, parameters) => globalThis.godotReactDemo[name](...parameters), method, args);
const find = (testID) => page.evaluate((id) => globalThis.godotReactDemo.find(id), testID);
const exists = async (testID) => Boolean(await find(testID));

/** The page position of a logical (root-local) point. */
async function pagePoint(x, y) {
  const [data, canvas] = await Promise.all([
    demo('snapshot'),
    page.evaluate(() => {
      const rect = document.querySelector('canvas').getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  ]);
  return { x: canvas.x + x * canvas.width / data.width, y: canvas.y + y * canvas.height / data.height };
}

/** What the editor says and what the native scroll container says, read from one snapshot. */
async function observe() {
  const [data, scroller, content, caret, position] = await Promise.all([
    demo('snapshot'), find('code-scroll'), find('code-content'), find('code-caret'), find('code-status-position'),
  ]);
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const textOf = (node) => node.text + node.children.map((id) => textOf(byId.get(id))).join('');
  const lines = new Map();
  for (const entry of data.nodes) {
    const match = /^code-line-(\d+)$/u.exec(String(entry.props?.testID ?? ''));
    if (match === null) continue;
    const selected = [];
    for (const span of entry.props.spans ?? []) {
      const colour = String(span.style?.backgroundColor ?? '').toLowerCase();
      if (span.inlay === undefined || span.inlay === null) {
        if (SELECTION_COLOURS.includes(colour)) selected.push([span.start, span.end]);
      }
    }
    lines.set(Number(match[1]), { text: textOf(entry), selected });
  }
  const lengths = Object.fromEntries([...lines].map(([number, line]) => [number, line.text.length]));
  const numbers = [...lines.keys()].sort((a, b) => a - b);
  let selectedCharacters = 0;
  let selectionStart;
  let selectionEnd;
  for (const number of numbers) {
    for (const [start, end] of lines.get(number).selected) {
      selectedCharacters += end - start;
      selectionStart ??= { line: number, column: start };
      selectionEnd = { line: number, column: end };
    }
  }
  const status = /^Ln (\d+), Col (\d+)/u.exec(collect(byId, position));
  return {
    caret: status === null ? undefined : { line: Number(status[1]), column: Number(status[2]) - 1 },
    selection: selectedCharacters === 0 ? undefined : { from: selectionStart, to: selectionEnd, characters: selectedCharacters },
    scrollTop: scroller.scroll.scrollTop,
    scrollLeft: scroller.scroll.scrollLeft,
    clientHeight: scroller.scroll.clientHeight,
    drawn: numbers.length === 0 ? undefined : [numbers[0], numbers[numbers.length - 1]],
    lengths,
    scrollerRect: scroller.rect,
    contentRect: content.rect,
    caretRect: caret?.rect,
  };
}

function collect(byId, entry) {
  return entry.text + entry.children.map((id) => collect(byId, byId.get(id))).join('');
}

/** The grid the editor draws on, measured as the verifiers do. */
async function gridOf() {
  const start = await demo('textCaret', 'editor-grid-probe', 0, 'after');
  const end = await demo('textCaret', 'editor-grid-probe', 400, 'after');
  return {
    advance: (end.x - start.x) / 400,
    lineHeight: (await find('editor-grid-probe')).rect.height,
    gutterWidth: (await find('code-gutter')).rect.width,
  };
}

/** The line and column a pointer at root-local (`x`, `y`) is over, from the content rectangle and the scroll offset native reports now. */
function pointedAt(state, grid, x, y) {
  const line = Math.max(1, Math.floor((y - state.contentRect.y) / grid.lineHeight) + 1);
  const column = Math.max(0, Math.round((x - state.contentRect.x - grid.gutterWidth) / grid.advance));
  // A press past the end of a line puts the caret at its end.
  return { line, column: Math.min(column, state.lengths[line] ?? column) };
}

async function mouseMove(logical, steps = 1) {
  const point = await pagePoint(logical.x, logical.y);
  await page.mouse.move(point.x, point.y, { steps });
  await frames();
}

async function press(logical) {
  await mouseMove(logical);
  await page.mouse.down();
  await frames();
}

async function release() {
  await page.mouse.up();
  await frames();
}

async function click(logical) {
  await press(logical);
  await release();
}

/** Scrolls by wheel notches over the code and waits until the scroll offset has been the same for several frames. */
async function wheel(notches) {
  const scroller = (await find('code-scroll')).rect;
  await mouseMove({ x: scroller.x + scroller.width / 2, y: scroller.y + scroller.height / 2 });
  for (let notch = 0; notch < Math.abs(notches); notch += 1) {
    await page.mouse.wheel({ deltaX: 0, deltaY: Math.sign(notches) * WHEEL_NOTCH_PX });
    await frames();
  }
  let last = Number.NaN;
  let still = 0;
  while (still < 5) {
    await frames();
    const now = (await find('code-scroll')).scroll.scrollTop;
    still = now === last ? still + 1 : 0;
    last = now;
  }
}

/** Records a step: what was done, where the pointer was, and the editor before and after. */
async function step(name, action, { pointer, grid, before } = {}) {
  const pre = before ?? await observe();
  await action();
  const post = await observe();
  const entry = { name, pointer, before: pre, after: post };
  if (pointer !== undefined && grid !== undefined) entry.mapped = pointedAt(pre, grid, pointer.x, pointer.y);
  log.push(entry);
  return entry;
}

function describe(entry) {
  const { before, after, mapped, pointer } = entry;
  const place = (state) => state.caret === undefined ? '-' : `${state.caret.line}:${state.caret.column}`;
  const selection = (state) => state.selection === undefined ? 'none' : `${state.selection.characters} chars (${state.selection.from.line}:${state.selection.from.column} to ${state.selection.to.line}:${state.selection.to.column})`;
  const parts = [
    entry.name.padEnd(46),
    `caret ${place(before)} -> ${place(after)}`.padEnd(30),
    `selection ${selection(after)}`.padEnd(48),
    `scrollTop ${before.scrollTop} -> ${after.scrollTop}`.padEnd(30),
    `drawn ${after.drawn?.join('-')}`,
  ];
  if (mapped !== undefined) parts.push(`pointer over ${mapped.line}:${mapped.column}`);
  if (pointer !== undefined) parts.push(`at (${pointer.x.toFixed(1)}, ${pointer.y.toFixed(1)})`);
  console.log(parts.join('  '));
}

function expect(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
  console.log(`${condition ? 'ok   ' : 'FAIL '}${name}${condition || detail === undefined ? '' : `  ${JSON.stringify(detail)}`}`);
}

try {
  page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor });
  const messages = [];
  page.on('console', (message) => {
    if (message.type() === 'error') messages.push(message.text().slice(0, 200));
    else if (message.text().startsWith('[pointer-diag]')) console.log(message.text());
  });
  page.on('pageerror', (error) => { messages.push(String(error).slice(0, 200)); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitUntil('the demo API', async () => page.evaluate(() => typeof globalThis.godotReactDemo?.snapshot === 'function'), STARTUP_TIMEOUT_MS);
  await waitUntil('the navigator', () => exists('toggle-code'), STARTUP_TIMEOUT_MS);
  const lab = await demo('snapshot');
  console.log(`${browserName} ${await browser.version()}, page ${width}x${height} at DPR ${deviceScaleFactor}, logical ${lab.width}x${lab.height}, ${url}`);

  // 0. Open Code.
  const button = (await find('toggle-code')).rect;
  await click({ x: button.x + button.width / 2, y: button.y + button.height / 2 });
  await waitUntil('the first line of code', () => exists('code-line-1'));
  await waitUntil('the caret', () => exists('code-caret'));
  await frames();
  const grid = await gridOf();
  const opened = await observe();
  console.log(`grid advance ${grid.advance.toFixed(4)}, line ${grid.lineHeight}, gutter ${grid.gutterWidth}; scroller ${JSON.stringify(opened.scrollerRect)}; client height ${opened.clientHeight}, visible lines ${(opened.clientHeight / grid.lineHeight).toFixed(2)}`);

  const lineCentre = (state, line) => state.contentRect.y + (line - 1) * grid.lineHeight + grid.lineHeight / 2;
  const columnX = (state, column) => state.contentRect.x + grid.gutterWidth + column * grid.advance;
  const at = (state, line, column, offsetX = 0) => ({ x: columnX(state, column) + offsetX, y: lineCentre(state, line) });
  /** The first line drawn in full in the viewport, and the last. */
  const fullyVisible = (state) => {
    const top = state.scrollerRect.y;
    const first = Math.ceil((state.scrollTop) / grid.lineHeight) + 1;
    const last = Math.floor((state.scrollTop + state.clientHeight) / grid.lineHeight);
    return { first, last, top };
  };

  /** The line nearest `near` among those fully in view with at least `characters` characters: a blank line cannot be dragged over. */
  const textLine = (state, near, characters) => {
    const { first, last } = fullyVisible(state);
    let best;
    for (let line = first; line <= last; line += 1) {
      if ((state.lengths[line] ?? 0) < characters) continue;
      if (best === undefined || Math.abs(line - near) < Math.abs(best - near)) best = line;
    }
    if (best === undefined) throw new Error(`No line in view has ${characters} characters`);
    return best;
  };
  const LONG_ENOUGH = 40;

  // 1. One click midway.
  let state = await observe();
  let visible = fullyVisible(state);
  const middle = textLine(state, Math.floor((visible.first + visible.last) / 2), LONG_ENOUGH);
  let pointer = at(state, middle, 12);
  let entry = await step(`1. one click midway (line ${middle}, column 12)`, () => click(pointer), { pointer, grid, before: state });
  describe(entry);
  expect('1. a click leaves a caret and no selection', entry.after.selection === undefined, entry.after.selection);
  expect('1. the caret is on the line and column under the pointer', entry.after.caret?.line === entry.mapped.line && entry.after.caret?.column === entry.mapped.column, { caret: entry.after.caret, mapped: entry.mapped });
  expect('1. the scroll offset did not change', entry.after.scrollTop === entry.before.scrollTop, [entry.before.scrollTop, entry.after.scrollTop]);

  // 2. The next click, a little way off.
  await sleep(CLICK_SEQUENCE_PAUSE_MS);
  state = await observe();
  const second = textLine(state, middle + 3, LONG_ENOUGH);
  pointer = at(state, second, 20);
  entry = await step(`2. a second click midway (line ${second}, column 20)`, () => click(pointer), { pointer, grid, before: state });
  describe(entry);
  expect('2. a click leaves a caret and no selection', entry.after.selection === undefined, entry.after.selection);
  expect('2. the caret is on the line and column under the pointer', entry.after.caret?.line === entry.mapped.line && entry.after.caret?.column === entry.mapped.column, { caret: entry.after.caret, mapped: entry.mapped });
  expect('2. the scroll offset did not change', entry.after.scrollTop === entry.before.scrollTop, [entry.before.scrollTop, entry.after.scrollTop]);

  // 3. The line second from the bottom, then the bottom-most and top-most fully visible ones.
  for (const [label, pick] of [
    ['second line from the bottom', (v) => v.last - 1],
    ['third line from the bottom', (v) => v.last - 2],
    ['bottom-most fully visible line', (v) => v.last],
    ['second line from the top', (v) => v.first + 1],
    ['top-most fully visible line', (v) => v.first],
  ]) {
    await sleep(CLICK_SEQUENCE_PAUSE_MS);
    state = await observe();
    visible = fullyVisible(state);
    const line = pick(visible);
    pointer = at(state, line, 8);
    entry = await step(`3. click the ${label} (line ${line})`, () => click(pointer), { pointer, grid, before: state });
    describe(entry);
    expect(`3. the ${label}: the caret is under the pointer`, entry.after.caret?.line === entry.mapped.line, { caret: entry.after.caret, mapped: entry.mapped });
    expect(`3. the ${label}: a fully visible line does not scroll`, entry.after.scrollTop === entry.before.scrollTop, [entry.before.scrollTop, entry.after.scrollTop]);
  }

  // 4. Scroll a distance, stop, click.
  await sleep(CLICK_SEQUENCE_PAUSE_MS);
  entry = await step(`4a. wheel ${WHEEL_NOTCHES} notches of ${WHEEL_NOTCH_PX} px and stop`, () => wheel(WHEEL_NOTCHES));
  describe(entry);
  expect('4a. the wheel scrolled the code', entry.after.scrollTop > entry.before.scrollTop, [entry.before.scrollTop, entry.after.scrollTop]);
  expect('4a. the wheel did not move the caret or select', entry.after.caret?.line === entry.before.caret?.line && entry.after.selection === undefined);
  state = await observe();
  visible = fullyVisible(state);
  const afterWheel = textLine(state, Math.floor((visible.first + visible.last) / 2), LONG_ENOUGH);
  pointer = at(state, afterWheel, 14);
  entry = await step(`4b. the first click after the wheel (line ${afterWheel}, column 14)`, () => click(pointer), { pointer, grid, before: state });
  describe(entry);
  expect('4b. the caret is on the line and column under the pointer', entry.after.caret?.line === entry.mapped.line && entry.after.caret?.column === entry.mapped.column, { caret: entry.after.caret, mapped: entry.mapped });
  expect('4b. the click does not scroll', entry.after.scrollTop === entry.before.scrollTop, [entry.before.scrollTop, entry.after.scrollTop]);
  expect('4b. a click leaves no selection', entry.after.selection === undefined, entry.after.selection);

  // 5. Click and drag over a few characters.
  await sleep(CLICK_SEQUENCE_PAUSE_MS);
  state = await observe();
  const dragLine = textLine(state, Math.floor((fullyVisible(state).first + fullyVisible(state).last) / 2) - 2, LONG_ENOUGH);
  const from = at(state, dragLine, 10, 2);
  const to = at(state, dragLine, 10 + DRAG_COLUMNS, 2);
  entry = await step(`5. drag ${DRAG_COLUMNS} columns along line ${dragLine}`, async () => {
    await press(from);
    await mouseMove(to, 6);
    await release();
  }, { pointer: from, grid, before: state });
  describe(entry);
  expect('5. the drag selects exactly the characters between press and pointer', entry.after.selection?.characters === DRAG_COLUMNS
    && entry.after.selection.from.line === dragLine && entry.after.selection.from.column === 10, entry.after.selection);
  expect('5. the drag does not scroll', entry.after.scrollTop === entry.before.scrollTop, [entry.before.scrollTop, entry.after.scrollTop]);

  // 6. Wheel again and drag a few characters right after it.
  await sleep(CLICK_SEQUENCE_PAUSE_MS);
  entry = await step(`6a. wheel back ${WHEEL_NOTCHES - 1} notches and stop`, () => wheel(-(WHEEL_NOTCHES - 1)));
  describe(entry);
  state = await observe();
  visible = fullyVisible(state);
  const lineAfter = textLine(state, Math.floor((visible.first + visible.last) / 2) + 1, LONG_ENOUGH);
  const dragFrom = at(state, lineAfter, 4, 2);
  const dragTo = at(state, lineAfter, 4 + DRAG_COLUMNS, 2);
  entry = await step(`6b. drag ${DRAG_COLUMNS} columns right after the wheel (line ${lineAfter})`, async () => {
    await press(dragFrom);
    await mouseMove(dragTo, 6);
    await release();
  }, { pointer: dragFrom, grid, before: state });
  describe(entry);
  expect('6b. the drag selects exactly the characters between press and pointer', entry.after.selection?.characters === DRAG_COLUMNS
    && entry.after.selection.from.line === lineAfter && entry.after.selection.from.column === 4, entry.after.selection);
  expect('6b. the drag does not scroll', entry.after.scrollTop === entry.before.scrollTop, [entry.before.scrollTop, entry.after.scrollTop]);

  // 7. A real mouse moves a pixel or two between the press and the release: scroll, then press, nudge and release over a mid line.
  await sleep(CLICK_SEQUENCE_PAUSE_MS);
  await step(`7a. wheel ${WHEEL_NOTCHES} notches and stop`, () => wheel(WHEEL_NOTCHES));
  state = await observe();
  visible = fullyVisible(state);
  const nudgeLine = textLine(state, Math.floor((visible.first + visible.last) / 2), LONG_ENOUGH);
  pointer = at(state, nudgeLine, 16, 1);
  entry = await step(`7b. press on line ${nudgeLine}, nudge the pointer 2 px, release`, async () => {
    await press(pointer);
    await mouseMove({ x: pointer.x + 1, y: pointer.y });
    await mouseMove({ x: pointer.x + 2, y: pointer.y });
    await release();
  }, { pointer, grid, before: state });
  describe(entry);
  expect('7b. a click that nudges one or two pixels selects at most the characters under that', (entry.after.selection?.characters ?? 0) <= 1, entry.after.selection);
  expect('7b. and does not scroll', entry.after.scrollTop === entry.before.scrollTop, [entry.before.scrollTop, entry.after.scrollTop]);

  if (messages.length > 0) console.log('browser errors:', messages);
} finally {
  await browser.close();
}

if (out !== undefined) {
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify({ browser: browserName, url, width, height, log, failures }, null, 2)}\n`);
}
console.log(failures.length === 0 ? 'no defect seen' : `${failures.length} defect(s) seen`);
if (expectFixed && failures.length > 0) process.exitCode = 1;
