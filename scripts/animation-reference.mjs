// Chrome's own values for the keyframe animations the library runs: Tailwind's spin, ping, pulse and bounce (v4's `theme.css`) and
// animations that exercise each longhand (timing functions, steps, iterations, direction, delay, fill mode), sampled at set times by
// pausing each animation and setting its `currentTime` in headless Chrome (the Web Animations API: no clock, no frame timing).
//
//   node scripts/animation-reference.mjs
//       Writes scripts/animation-golden.json: for each case the CSS Chrome ran, the same animation in the library's wire form (what
//       `native/style_engine.rs` gives Stylo), and Chrome's computed `transform` (the six numbers), `opacity` and `background-color` at
//       each sample time. The native unit test `animations_match_chromes_values` holds the library's samples to these.
//
// No OS input is generated; Chrome runs headless.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';

rejectUnknownArguments(process.argv.slice(2), {});
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUTPUT = resolve(import.meta.dirname, 'animation-golden.json');
/** The element: its box (a percentage translate resolves against it) and its own values, which an animation's missing ends take. */
const BOX = { width: 200, height: 100 };

const frame = (offset, style, easing) => ({ offset, style, ...(easing === undefined ? {} : { easing }) });
const BOUNCE_DOWN = { cubicBezier: [0.8, 0, 1, 1] };
const BOUNCE_UP = { cubicBezier: [0, 0, 0.2, 1] };

/** Each case: the CSS (keyframes and the `animation` longhands), the library's form of the same, and the times (ms) to sample. */
const CASES = [
  {
    name: 'spin',
    keyframes: '@keyframes k { to { transform: rotate(360deg); } }',
    animation: 'k 1s linear infinite',
    native: { keyframes: { name: 'spin', frames: [frame(1, { transform: 'rotate(360deg)' })] }, durationMs: 1000, easing: 'linear', iterations: 'infinite' },
    times: [0, 125, 250, 600, 999, 1250, 2730],
  },
  {
    name: 'ping',
    keyframes: '@keyframes k { 75%, 100% { transform: scale(2); opacity: 0; } }',
    animation: 'k 1s cubic-bezier(0, 0, 0.2, 1) infinite',
    native: {
      keyframes: { name: 'ping', frames: [frame(0.75, { transform: 'scale(2)', opacity: 0 }), frame(1, { transform: 'scale(2)', opacity: 0 })] },
      durationMs: 1000, easing: { cubicBezier: [0, 0, 0.2, 1] }, iterations: 'infinite',
    },
    times: [100, 375, 600, 749, 800, 1300],
  },
  {
    name: 'pulse',
    keyframes: '@keyframes k { 50% { opacity: 0.5; } }',
    animation: 'k 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    native: { keyframes: { name: 'pulse', frames: [frame(0.5, { opacity: 0.5 })] }, durationMs: 2000, easing: { cubicBezier: [0.4, 0, 0.6, 1] }, iterations: 'infinite' },
    times: [200, 500, 1000, 1500, 1900, 2600],
  },
  {
    name: 'bounce',
    keyframes: '@keyframes k { 0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); } 50% { transform: none; animation-timing-function: cubic-bezier(0, 0, 0.2, 1); } }',
    animation: 'k 1s infinite',
    native: {
      keyframes: {
        name: 'bounce',
        frames: [frame(0, { transform: 'translateY(-25%)' }, BOUNCE_DOWN), frame(0.5, { transform: 'none' }, BOUNCE_UP), frame(1, { transform: 'translateY(-25%)' }, BOUNCE_DOWN)],
      },
      durationMs: 1000, iterations: 'infinite',
    },
    times: [0, 100, 250, 450, 500, 600, 750, 900, 1100],
  },
  {
    name: 'colour-alternate-delay-fill',
    keyframes: '@keyframes k { from { background-color: #ff0000; } to { background-color: #0000ff; } }',
    animation: 'k 1s ease-in-out 200ms 3 alternate both',
    native: {
      keyframes: { name: 'colour', frames: [frame(0, { backgroundColor: '#ff0000' }), frame(1, { backgroundColor: '#0000ff' })] },
      durationMs: 1000, delayMs: 200, easing: 'ease-in-out', iterations: 3, direction: 'alternate', fillMode: 'both',
    },
    times: [0, 100, 200, 450, 700, 1300, 2000, 2900, 3500],
  },
  {
    name: 'steps-end',
    keyframes: '@keyframes k { to { transform: rotate(360deg); } }',
    animation: 'k 1s steps(4, jump-end) infinite',
    native: { keyframes: { name: 'turn', frames: [frame(1, { transform: 'rotate(360deg)' })] }, durationMs: 1000, easing: { steps: 4, position: 'jump-end' }, iterations: 'infinite' },
    times: [100, 260, 510, 760, 990],
  },
  {
    name: 'steps-none',
    keyframes: '@keyframes k { to { opacity: 0; } }',
    animation: 'k 1s steps(5, jump-none) infinite',
    native: { keyframes: { name: 'fade', frames: [frame(1, { opacity: 0 })] }, durationMs: 1000, easing: { steps: 5, position: 'jump-none' }, iterations: 'infinite' },
    times: [100, 300, 500, 700, 950],
  },
  {
    name: 'reverse-negative-delay',
    keyframes: '@keyframes k { from { transform: translateX(0px) scale(1); } to { transform: translateX(80px) scale(0.5); } }',
    animation: 'k 1s linear -250ms 2 reverse forwards',
    native: {
      keyframes: { name: 'slide', frames: [frame(0, { transform: 'translateX(0px) scale(1)' }), frame(1, { transform: 'translateX(80px) scale(0.5)' })] },
      durationMs: 1000, delayMs: -250, easing: 'linear', iterations: 2, direction: 'reverse', fillMode: 'forwards',
    },
    times: [0, 250, 500, 1000, 1700, 2500],
  },
];

const IDENTITY = [1, 0, 0, 1, 0, 0];

/** `matrix(a, b, c, d, e, f)` or `none` as six numbers. */
function matrix(text) {
  if (text === 'none') return IDENTITY;
  const match = /^matrix\(([^)]*)\)$/.exec(text);
  if (match === null) throw new Error(`Chrome reported a transform that is not a 2D matrix: ${text}`);
  return match[1].split(',').map(Number);
}

/** `rgb(r, g, b)` or `rgba(r, g, b, a)` as four numbers from 0 to 1. */
function colour(text) {
  const match = /^rgba?\(([^)]*)\)$/.exec(text);
  if (match === null) throw new Error(`Chrome reported a colour that is not rgb(): ${text}`);
  const [r, g, b, a = 1] = match[1].split(',').map(Number);
  return [r / 255, g / 255, b / 255, a];
}

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
try {
  const page = await browser.newPage();
  const cases = [];
  for (const entry of CASES) {
    await page.setContent(`<!doctype html><style>${entry.keyframes}
      #e { width: ${BOX.width}px; height: ${BOX.height}px; background-color: #000000; opacity: 1; animation: ${entry.animation}; }</style><div id="e"></div>`);
    const samples = [];
    for (const time of entry.times) {
      const read = await page.evaluate((at) => {
        const element = document.getElementById('e');
        const [animation] = element.getAnimations();
        animation.pause();
        animation.currentTime = at;
        const style = getComputedStyle(element);
        return { transform: style.transform, opacity: style.opacity, backgroundColor: style.backgroundColor };
      }, time);
      samples.push({ timeMs: time, transform: matrix(read.transform), opacity: Number(read.opacity), backgroundColor: colour(read.backgroundColor) });
    }
    cases.push({ name: entry.name, css: { keyframes: entry.keyframes, animation: entry.animation }, native: entry.native, samples });
  }
  const version = await browser.version();
  await writeFile(OUTPUT, `${JSON.stringify({ chrome: version, box: BOX, cases }, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT} from ${version}: ${cases.length} cases`);
} finally {
  await browser.close();
}
