// The layout utilities lab (demo/src/layout-utilities-lab.tsx) as HTML under Tailwind's own CSS, rendered by headless Chrome through
// Puppeteer: the reference the `layout-utilities` verifier section compares the library with.
//
//   node --import tsx scripts/layout-utilities-reference.mjs --tailwind=<dir> [--out=<dir>]
//       Compiles the CSS of every class the lab uses with tailwindcss 3.4.17 (<dir> holds node_modules/tailwindcss, as for
//       scripts/tailwind-coverage.mjs), renders each page at both verifier windows, reads every box's getBoundingClientRect, plays
//       each transition scenario in Chrome at a table of progress values, and writes demo/src/layout-utilities-reference.ts (the
//       numbers) and tests/fixtures/layout-utilities.css (the CSS). With --out, the screenshots are saved there as well.
//   node --import tsx scripts/layout-utilities-reference.mjs --check [--out=<dir>]
//       Renders the stored CSS again in the installed Chrome and fails if a rectangle or a transition value differs from the stored
//       reference: the reference is Chrome's, not an echo of the library.
//   node --import tsx scripts/layout-utilities-reference.mjs --compare=<out.png> <label>=<image> ...
//       Puts the images side by side, each under its label.
//
// Input is Chrome's own (CDP hover in the headless browser); no real OS input is generated.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
// tsx loads the TypeScript data modules as CommonJS, whose named exports an ES module reads through the default.
import layoutData from '../demo/src/layout-utilities-data.ts';

const {
  CAPTION_CLASS, CELL_CLASS, LAYOUT_PAGES, PAGE_CLASS, TRANSITION_SCENARIOS, TRANSITION_TABLE_STEPS, allClasses,
} = layoutData;

rejectUnknownArguments(process.argv.slice(2).filter(value => value.startsWith('-')), {
  flags: ['--check'], prefixes: ['--tailwind=', '--out=', '--compare='],
});
const root = resolve(import.meta.dirname, '..');
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const REFERENCE_PATH = resolve(root, 'demo/src/layout-utilities-reference.ts');
const CSS_PATH = resolve(root, 'tests/fixtures/layout-utilities.css');
/** The windows of the native verifier (landscape and portrait, at device pixel ratio 1): the viewport units are what differs between them. */
const VIEWPORTS = [[1120, 800], [600, 900]];
const TAILWIND_VERSION = '3.4.17';
/** A rectangle may differ from the stored one by this much (a box edge, in CSS pixels) when the same Chrome renders it again. */
const RECHECK_TOLERANCE_PX = 0.01;
const RECHECK_TOLERANCE_VALUE = 0.51;
const DECIMALS = 4;
const ROUNDING = 10 ** DECIMALS;

function round(value) {
  return Math.round(value * ROUNDING) / ROUNDING;
}

/** The CSS a browser developer gets from Tailwind for these classes, with its preflight, and nothing of ours. */
async function compileCss(tailwindDirectory) {
  const requireTailwind = createRequire(resolve(tailwindDirectory, 'package.json'));
  const version = requireTailwind('tailwindcss/package.json').version;
  if (version !== TAILWIND_VERSION) throw new Error(`tailwindcss ${version} found; the reference is for ${TAILWIND_VERSION}`);
  const postcss = requireTailwind('postcss');
  const tailwind = requireTailwind('tailwindcss');
  const result = await postcss([tailwind({ content: [{ raw: allClasses().join(' '), extension: 'html' }] })])
    .process('@tailwind base; @tailwind utilities;', { from: undefined });
  return result.css;
}

const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

function boxHtml(box) {
  const children = (box.children ?? []).map(boxHtml).join('');
  return `<div data-id="${box.id}" class="${box.className}">${children}</div>`;
}

/** Every element is a flex column, as every `View` is, and Tailwind's classes do the rest. */
function documentHtml(css, body) {
  return `<!doctype html><meta charset="utf-8"><style>${css}</style><style>div { display: flex; flex-direction: column; }</style>${body}`;
}

function pageHtml(css, page) {
  const cells = page.cases.map(entry => `<div class="${CELL_CLASS}"><div class="${CAPTION_CLASS}">${escapeHtml(entry.title)}</div>${boxHtml(entry.stage)}</div>`).join('');
  return documentHtml(css, `<div data-id="layout-page" class="${PAGE_CLASS}">${cells}</div>`);
}

function scenarioHtml(css, scenario) {
  const text = scenario.inheritedText ? '<div data-id="text">Aa</div>' : '';
  return documentHtml(css, `<div style="padding: 16px"><div data-id="element" class="${scenario.className}">${text}</div></div>`);
}

async function readRectangles(page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-id]')].map(element => {
    const rect = element.getBoundingClientRect();
    return [element.dataset.id, [rect.x, rect.y, rect.width, rect.height]];
  })));
}

/** `rgb(1, 2, 3)` and `rgba(1, 2, 3, 0.5)` as [r, g, b, a] with the channels in 0..255 and alpha in 0..1. */
function parseColor(text) {
  const match = /^rgba?\(([^)]+)\)$/.exec(text);
  if (match === null) throw new Error(`Cannot read the colour ${text}`);
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

const PROPERTY_CSS = { backgroundColor: 'background-color', color: 'color', borderColor: 'border-top-color', opacity: 'opacity', width: 'width' };

/** A scenario in Chrome: hover the element, then read each property at `delay + progress * duration` of its transition. */
async function playScenario(browser, css, scenario) {
  const page = await browser.newPage();
  await page.setViewport({ width: 600, height: 400, deviceScaleFactor: 1 });
  await page.setContent(scenarioHtml(css, scenario));
  await page.hover('[data-id="element"]');
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  const table = await page.evaluate((definition, steps, cssNames) => {
    const element = document.querySelector('[data-id="element"]');
    const text = document.querySelector('[data-id="text"]');
    const animations = document.getAnimations().filter(animation => animation instanceof CSSTransition);
    const result = { animations: animations.map(animation => animation.transitionProperty), rows: [] };
    for (let step = 0; step <= steps; step += 1) {
      const time = definition.delayMs + step / steps * definition.durationMs;
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = time;
      }
      const row = {};
      for (const property of definition.compare) {
        const value = (target) => {
          const style = getComputedStyle(target).getPropertyValue(cssNames[property]);
          return property === 'opacity' || property === 'width' ? Number.parseFloat(style) : style;
        };
        row[property] = value(element);
        if (property === 'color' && text !== null) row.textColor = value(text);
      }
      result.rows.push(row);
    }
    return result;
  }, { delayMs: scenario.delayMs, durationMs: scenario.durationMs, compare: scenario.compare }, TRANSITION_TABLE_STEPS, PROPERTY_CSS);
  await page.close();
  const properties = {};
  for (const name of Object.keys(table.rows[0])) {
    properties[name] = table.rows.map(row => (typeof row[name] === 'string' ? parseColor(row[name]).map(round) : round(row[name])));
  }
  return { animated: table.animations.sort(), properties };
}

async function render(css, outDirectory) {
  if (outDirectory !== undefined) await mkdir(outDirectory, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  try {
    const chrome = await browser.version();
    const rectangles = {};
    for (const [width, height] of VIEWPORTS) {
      const key = `${width}x${height}`;
      rectangles[key] = {};
      for (const layoutPage of LAYOUT_PAGES) {
        const page = await browser.newPage();
        await page.setViewport({ width, height, deviceScaleFactor: 1 });
        await page.setContent(pageHtml(css, layoutPage));
        const read = await readRectangles(page);
        for (const [id, rect] of Object.entries(read)) {
          if (id !== 'layout-page') rectangles[key][id] = rect.map(round);
        }
        if (outDirectory !== undefined) {
          await page.setViewport({ width, height, deviceScaleFactor: 1 });
          await page.screenshot({ path: resolve(outDirectory, `chrome-${layoutPage.name}-${key}.png`) });
        }
        await page.close();
      }
    }
    const transitions = {};
    for (const scenario of TRANSITION_SCENARIOS) transitions[scenario.id] = await playScenario(browser, css, scenario);
    if (outDirectory !== undefined) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1120, height: 800, deviceScaleFactor: 1 });
      await page.setContent(documentHtml(css, `<div class="flex-row flex-wrap content-start gap-4 p-4 bg-slate-100 w-[1120px]">${TRANSITION_SCENARIOS.map(scenario => `<div class="gap-1 shrink-0 w-[260px]"><div class="${CAPTION_CLASS}">${escapeHtml(scenario.title)}</div><div data-id="${scenario.id}" class="${scenario.className}">${scenario.inheritedText ? '<div>Aa</div>' : ''}</div></div>`).join('')}</div>`));
      await page.screenshot({ path: resolve(outDirectory, 'chrome-transitions-1120x800.png') });
      await page.close();
    }
    return { chrome, rectangles, transitions };
  } finally {
    await browser.close();
  }
}

function referenceModule({ chrome, rectangles, transitions }) {
  return `// Generated by scripts/layout-utilities-reference.mjs from demo/src/layout-utilities-data.ts and tailwindcss ${TAILWIND_VERSION}. Do not edit:
// regenerate it (the script says how) or check it against the installed Chrome (--check).
// Chrome's getBoundingClientRect for every box of the layout lab, per window size, and its transitions of the scenarios at a table of
// progress values (\`steps\` + 1 rows, progress 0 to 1, each colour as [r, g, b, a] with the channels in 0 to 255).

/** [x, y, width, height] in CSS pixels, from the page's top left corner. */
export type ReferenceRect = readonly [number, number, number, number];
export type ReferenceValue = number | readonly [number, number, number, number];

export interface TransitionReference {
  /** The CSS properties Chrome ran a transition on. */
  readonly animated: readonly string[];
  /** Per compared property (\`textColor\` is the inheriting child's colour), the value at each step of the table. */
  readonly properties: Readonly<Record<string, readonly ReferenceValue[]>>;
}

export const LAYOUT_REFERENCE_CHROME = ${JSON.stringify(chrome)};
export const TRANSITION_STEPS = ${TRANSITION_TABLE_STEPS};
export const LAYOUT_REFERENCE: Readonly<Record<string, Readonly<Record<string, ReferenceRect>>>> = ${JSON.stringify(rectangles, null, 1)};
export const TRANSITION_REFERENCE: Readonly<Record<string, TransitionReference>> = ${JSON.stringify(transitions)};
`;
}

/** The numbers of a reference module, read back as JSON (they are its object literals). */
async function readStoredReference() {
  const text = await readFile(REFERENCE_PATH, 'utf8');
  const literal = name => {
    const start = text.indexOf(`export const ${name}:`);
    const equals = text.indexOf('> = ', start) + 4;
    return JSON.parse(text.slice(equals, text.indexOf(';\n', equals)));
  };
  return { rectangles: literal('LAYOUT_REFERENCE'), transitions: literal('TRANSITION_REFERENCE') };
}

function compareReference(stored, fresh) {
  const problems = [];
  let worst = 0;
  for (const [key, rects] of Object.entries(stored.rectangles)) {
    for (const [id, rect] of Object.entries(rects)) {
      const now = fresh.rectangles[key]?.[id];
      if (now === undefined) {
        problems.push(`${key} ${id}: not rendered`);
        continue;
      }
      const difference = Math.max(...rect.map((value, index) => Math.abs(value - now[index])));
      worst = Math.max(worst, difference);
      if (difference > RECHECK_TOLERANCE_PX) problems.push(`${key} ${id}: stored [${rect}] now [${now}]`);
    }
  }
  let worstValue = 0;
  for (const [id, scenario] of Object.entries(stored.transitions)) {
    const now = fresh.transitions[id];
    for (const [name, rows] of Object.entries(scenario.properties)) {
      rows.forEach((row, index) => {
        const here = now?.properties[name]?.[index];
        const delta = here === undefined ? Number.POSITIVE_INFINITY : Math.max(...[row].flat().map((value, channel) => Math.abs(value - [here].flat()[channel])));
        worstValue = Math.max(worstValue, delta);
        if (delta > RECHECK_TOLERANCE_VALUE) problems.push(`transition ${id} ${name} step ${index}: stored ${row} now ${here}`);
      });
    }
  }
  return { problems, worst, worstValue };
}

async function compare(output, entries) {
  await mkdir(dirname(output), { recursive: true });
  const figures = [];
  for (const entry of entries) {
    const [label, path] = [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)];
    figures.push(`<figure><img src="data:image/png;base64,${(await readFile(path)).toString('base64')}"><figcaption>${label}</figcaption></figure>`);
  }
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run'] });
  try {
    const page = await browser.newPage();
    // Each picture is shown at the width of the first, so a capture at another scale lines up.
    await page.setViewport({ width: 800, height: 600 });
    await page.setContent(`<!doctype html><style>body{margin:0;background:#111;color:#ddd;font:14px system-ui;display:flex;gap:8px;padding:8px;align-items:flex-start}
      figure{margin:0}img{display:block;height:auto}figcaption{padding:4px 0}</style>${figures.join('')}`);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    const first = await page.evaluate(() => document.images[0].naturalWidth);
    await page.evaluate(width => { for (const image of document.images) image.style.width = `${width}px`; }, first);
    const size = await page.evaluate(() => ({ width: Math.ceil(document.body.scrollWidth), height: Math.ceil(document.body.scrollHeight) }));
    await page.setViewport({ width: size.width, height: size.height });
    await page.screenshot({ path: output });
  } finally {
    await browser.close();
  }
}

const compareOutput = argument('compare');
if (compareOutput !== undefined) {
  await compare(resolve(compareOutput), process.argv.filter(value => !value.startsWith('-') && value.includes('=')));
} else if (process.argv.includes('--check')) {
  const css = await readFile(CSS_PATH, 'utf8');
  const fresh = await render(css, argument('out') === undefined ? undefined : resolve(argument('out')));
  const stored = await readStoredReference();
  const { problems, worst, worstValue } = compareReference(stored, fresh);
  console.log(`layout reference check against ${fresh.chrome}: ${Object.values(stored.rectangles).reduce((sum, rects) => sum + Object.keys(rects).length, 0)} rectangles, worst edge difference ${worst} px, worst transition difference ${round(worstValue)}`);
  if (problems.length > 0) {
    console.error(problems.slice(0, 20).join('\n'));
    throw new Error(`${problems.length} values differ from the stored reference; regenerate it with --tailwind=<dir> if the Chrome changed`);
  }
} else {
  const tailwindDirectory = argument('tailwind');
  if (tailwindDirectory === undefined) throw new Error('--tailwind=<directory containing node_modules/tailwindcss 3.4.17> is required to write the reference; --check needs none');
  const css = await compileCss(resolve(tailwindDirectory));
  const result = await render(css, argument('out') === undefined ? undefined : resolve(argument('out')));
  await writeFile(CSS_PATH, css);
  await writeFile(REFERENCE_PATH, referenceModule(result));
  console.log(`wrote ${REFERENCE_PATH} and ${CSS_PATH} from ${result.chrome}`);
}
