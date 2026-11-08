// The whole transforms lab page (demo/src/transform-lab.tsx: the stage, the results under it, the case list and the caption) as plain HTML with the CSS a browser developer
// would write, rendered by headless Chrome through Puppeteer at a phone's size and at a desktop's, to compare with what the library draws (docs/tracks/transforms-lab.md).
// Every case of the lab is here, not only the shapes `scripts/transform-reference.mjs` compares pixel by pixel.
//
//   node --import tsx scripts/transform-lab-reference.mjs --render [--out=<dir>] [--offsets=<file>]
//       Renders each case at each device to <dir>/chrome-<case>-<device>.png (the whole viewport) and writes <dir>/reference.json: the rectangle of the lab and of
//       its stage and every text, in CSS pixels. `--offsets` is the file `transform-lab-web-capture.mjs` wrote: where the lab sits in the navigator on each device,
//       so that the page has it at the same device pixels and a per channel difference is not a shift.
//   node --import tsx scripts/transform-lab-reference.mjs --compare --chrome=<dir> --web=<dir> [--native=<dir>] [--out=<dir>]
//       Puts Chrome's picture of each case, the library's on the Web (`transform-lab-web-capture.mjs`) and its native one side by side in <out>/<case>-<device>.png, and
//       writes <out>/report.json: the per channel difference over the stage, interior and edge apart, text left out.
//
// Input is Chrome's own; no real OS input is generated.
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
// tsx loads the TypeScript data module as CommonJS, whose named exports an ES module reads through the default.
import transformData from '../demo/src/transform-data.ts';

const {
  BEHAVIOUR, CARD, CHILD, HIT_RESULTS, SHAPE_CASES, STAGE, TRANSITION_CASES, caseOptions,
} = transformData;

rejectUnknownArguments(process.argv.slice(2), { flags: ['--render', '--compare'], prefixes: ['--out=', '--chrome=', '--web=', '--native=', '--offsets='] });
const root = resolve(import.meta.dirname, '..');
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);

/** The hit page right after a tap on its turned bar, which `transform-lab-web-capture.mjs` captures while the outline is up: the case the lab has no entry for. */
const TAPPED = { id: 'hit-tapped' };
/** Every case in the order the lab lists them, and the tapped hit page. */
const allOptions = () => [...caseOptions(), { ...caseOptions().find(option => option.id === 'hit'), id: TAPPED.id }];

/** Ben's Android phone as Chrome emulates it (scripts/verify-rotation-web.mjs), and the desktop window the Web verifier has. */
export const DEVICES = {
  phone: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  desktop: { width: 1120, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
const SETTLE_MS = 300;
/** The scale is rounded down to this many steps, as the lab does (`FIT_STEPS`), so a scaled stage never reaches past its box. */
const FIT_STEPS = 10_000;
/** A text rectangle is grown by this (logical pixels) before the comparison leaves it out. */
const TEXT_MASK_MARGIN = 3;
/** Levels (of 255) above which a pixel counts as visibly different. */
const VISIBLE_LEVELS = 24;

// The font the engine draws its default theme with, so a glyph differs only in how it is rasterised, not in what it is.
const fontPath = process.env.GODOT_INTER_FONT ?? resolve(homedir(), 'Development/godot/thirdparty/fonts/Inter_Regular.woff2');
const fontData = (await readFile(fontPath)).toString('base64');

// Tailwind's text sizes and the colours of the classes the lab uses; every element is a flex column with `position: relative`, as the library's View is.
const css = `
@font-face { font-family: 'Engine Inter'; src: url(data:font/woff2;base64,${fontData}) format('woff2'); }
*, ::before, ::after { box-sizing: border-box; margin: 0; }
html, body { margin: 0; background: white; }
body { font-family: 'Engine Inter', sans-serif; }
.v { display: flex; flex-direction: column; position: relative; min-width: 0; min-height: 0; }
.t { display: block; }
.text-2xl { font-size: 24px; line-height: 32px; } .text-xl { font-size: 20px; line-height: 28px; } .text-base { font-size: 16px; line-height: 24px; }
.text-sm { font-size: 14px; line-height: 20px; } .text-xs { font-size: 12px; line-height: 16px; } .text-guide { font-size: 10px; line-height: 15px; }
.scroll { scrollbar-width: none; }
`;

const px = value => `${value}px`;
const style = rules => Object.entries(rules).map(([name, value]) => `${name.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)}:${value}`).join(';');
const box = (rules, inner = '', extra = '') => `<div class="v" ${extra} style="${style(rules)}">${inner}</div>`;
const abs = (left, top, width, height, rules = {}, inner = '', extra = '') => box({ position: 'absolute', left: px(left), top: px(top), ...(width === undefined ? {} : { width: px(width) }), ...(height === undefined ? {} : { height: px(height) }), ...rules }, inner, extra);
const text = (size, colour, content, rules = {}, extra = '') => `<span class="t text-${size}" ${extra} style="${style({ color: colour, ...rules })}">${content}</span>`;

function cardMarkup(spec) {
  const origin = spec.origin === undefined ? {} : { transformOrigin: spec.origin };
  const child = spec.child === undefined ? '' : abs(CHILD.left, CHILD.top, CHILD.width, CHILD.height, {
    borderRadius: px(CHILD.radius), border: `${CHILD.border}px solid ${CHILD.borderColor}`, background: CHILD.fill, transform: spec.child.transform,
    ...(spec.child.origin === undefined ? {} : { transformOrigin: spec.child.origin }),
  }, '', 'id="child"');
  return abs(CARD.left, CARD.top, CARD.width, CARD.height, {
    borderRadius: px(spec.squareCorners === true ? 0 : CARD.radius), border: `${CARD.border}px solid ${CARD.borderColor}`, background: CARD.fill, padding: px(CARD.padding), transform: spec.transform, ...origin,
  }, `${text('xl', CARD.ink, CARD.title)}${text('sm', CARD.ink, CARD.body)}${child}`, 'id="card"');
}

/** A `Button` of the lab: a flex column with the class's padding, radius and colours, its label one `Text`. */
const labButton = (rules, label, colour = '#ffffff', extra = '') => box({ borderRadius: px(6), ...rules }, text('xs', colour, label), extra);

// The tap result chips under the hit page's stage (`HitPage`): before any tap, or just after one on the turned bar (its chip says 1 and is amber).
function hitResults(tapped) {
  const chips = HIT_RESULTS.map(({ target, label, colour }) => box({
    flexDirection: 'row', alignItems: 'center', gap: px(6), borderRadius: px(6), padding: '4px 8px',
    ...(tapped && target === 'bar' ? { border: '1px solid #fbbf24', background: '#fef3c7' } : { border: '1px solid #e2e8f0', background: '#f8fafc' }),
  }, `${box({ width: px(10), height: px(10), borderRadius: px(2), background: colour })}${text('xs', '#475569', label)}${text('xs', '#0f172a', tapped && target === 'bar' ? '1' : '0')}`)).join('');
  return box({ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: px(8), rowGap: px(4), borderBottom: '1px solid #e2e8f0', background: 'white', padding: '8px 12px' }, `${text('xs', '#64748b', 'Taps counted')}${chips}`);
}

/** The guide of the hit page: a 1 px outline where a box sits before its transform, drawn over the stage and never hit, and its label. */
const guide = (left, top, width, height) => abs(left, top, width, height, { border: '1px solid #94a3b8', pointerEvents: 'none' });
const guideLabel = (left, top, content) => abs(left, top, undefined, undefined, { pointerEvents: 'none' }, text('guide', '#64748b', content));

/**
 * The stage's contents and what sits under it, for one case: the markup of each page of the lab as a browser developer would write it. `after` is what comes
 * between the stage and the case list (the hit page's results) and `script` runs in the page afterwards (the anchor's measured guide).
 */
function caseMarkup(id) {
  if (id.startsWith('shape:')) return { stage: cardMarkup(SHAPE_CASES.find(spec => spec.name === id.slice(6))) };
  if (id.startsWith('transition:')) {
    const spec = TRANSITION_CASES.find(candidate => candidate.name === id.slice(11));
    return { stage: abs(CARD.left, CARD.top, CARD.width, CARD.height, { borderRadius: px(CARD.radius), border: `${CARD.border}px solid ${CARD.borderColor}`, background: CARD.fill, padding: px(CARD.padding), transform: spec.from }, `${text('xl', CARD.ink, CARD.title)}${text('sm', CARD.ink, CARD.body)}`, 'id="card"'), flip: true };
  }
  switch (id) {
    case 'combined': return { stage: [
      abs(60, 70, 190, 88, { opacity: 1, background: '#4f46e5', borderRadius: px(14), padding: px(12), transform: 'translate(0px, 0px) rotate(0deg) scale(1)' }, `${text('base', 'white', 'Combined')}${text('xs', '#e0e7ff', 'rest')}`),
      abs(60, 240, undefined, undefined, { background: '#0f172a', borderRadius: px(6), padding: '6px 12px' }, text('xs', 'white', 'Toggle combined transition')),
      abs(320, 236, undefined, undefined, { background: '#059669', borderRadius: px(9999), padding: '8px 16px' }, text('xs', 'white', 'Hover &amp; press me')),
    ].join('') };
    case 'loop': return { stage: [
      abs(130, 96, 140, 96, { borderRadius: px(16), padding: px(12), background: '#4f46e5', opacity: 1, transform: 'translate(0px, 0px) rotate(0deg) scale(1)' }, `${text('base', 'white', 'Looping')}${text('xs', 'white', 'step 0')}`),
      abs(60, 248, undefined, undefined, { flexDirection: 'row', alignItems: 'center', gap: px(8) }, `${labButton({ background: '#0f172a', padding: '6px 12px' }, 'Pause loop')}${labButton({ background: '#4f46e5', padding: '6px 12px' }, 'Next keyframe')}`),
    ].join('') };
    case 'starting': return { stage: [
      abs(50, 76, 200, 110, { borderRadius: px(16), padding: px(12), background: '#4f46e5' }, `${text('base', 'white', '@starting-style')}${text('xs', '#e0e7ff', 'mount 0')}`),
      abs(290, 76, 180, 110, { borderRadius: px(16), padding: px(12), background: '#059669' }, `${text('base', 'white', 'From hidden')}${text('xs', '#d1fae5', 'display: none -&gt; flex')}`),
      abs(50, 244, undefined, undefined, { flexDirection: 'row', alignItems: 'center', gap: px(8) }, `${labButton({ background: '#4f46e5', padding: '6px 12px' }, 'Remount card')}${labButton({ background: '#047857', padding: '6px 12px' }, 'Hide second card')}`),
    ].join('') };
    case 'contain': {
      const { contain } = BEHAVIOUR;
      return { stage: box({ marginLeft: px(contain.left), marginTop: px(contain.top), width: px(contain.width), height: px(contain.height), background: '#e0e7ff', transform: contain.transform },
        `${abs(contain.absolute.left, contain.absolute.top, contain.absolute.size, contain.absolute.size, { background: '#be123c' })}${box({ position: 'fixed', left: px(contain.fixed.left), top: px(contain.fixed.top), width: px(contain.fixed.size), height: px(contain.fixed.size), background: '#047857' })}`) };
    }
    case 'edge': {
      const { edge, edgeFlat, edgeRing, turnedGradient, turnedGradientRing, turnedSquare } = BEHAVIOUR;
      return { stage: [
        abs(edge.left, edge.top, edge.width, edge.height, { borderRadius: px(8), background: '#b45309', transform: edge.transform, transformOrigin: 'top' }),
        abs(edgeFlat.left, edgeFlat.top, edgeFlat.width, edgeFlat.height, { background: '#b45309', transform: edgeFlat.transform, transformOrigin: 'top' }),
        abs(edgeRing.left, edgeRing.top, edgeRing.width, edgeRing.height, { borderRadius: px(edgeRing.radius), border: `${edgeRing.border}px solid #b45309`, transform: edgeRing.transform, transformOrigin: 'top' }),
        abs(turnedGradient.left, turnedGradient.top, turnedGradient.size, turnedGradient.size, { background: 'linear-gradient(to right, #6366f1, #6366f1)', transform: turnedGradient.transform }),
        abs(turnedGradientRing.left, turnedGradientRing.top, turnedGradientRing.size, turnedGradientRing.size, { background: 'linear-gradient(to right, #6366f1, #6366f1)', border: `${turnedGradientRing.border}px solid #6366f1`, borderRadius: px(turnedGradientRing.radius), transform: turnedGradientRing.transform }),
        abs(turnedSquare.left, turnedSquare.top, turnedSquare.size, turnedSquare.size, { background: '#b45309', transform: turnedSquare.transform }),
      ].join('') };
    }
    case 'hit': case TAPPED.id: {
      const { bar, hitParent, hitChild, hitCollapsed } = BEHAVIOUR;
      const tapped = id === TAPPED.id;
      return { after: hitResults(tapped), stage: [
        // The lab's Button has `items-center justify-center`: the label is in the middle of the bar. A tap outlines it (`HIT_FLASH`): 3 px amber, 2 px outside.
        abs(bar.left, bar.top, bar.width, bar.height, {
          background: '#4f46e5', borderRadius: px(8), transform: bar.transform, alignItems: 'center', justifyContent: 'center',
          ...(tapped ? { outline: '3px solid #f59e0b', outlineOffset: px(2) } : {}),
        }, text('sm', 'white', 'Turned bar', { pointerEvents: 'none' }), 'id="bar"'),
        abs(hitParent.left, hitParent.top, hitParent.size, hitParent.size, { background: '#fde68a', transform: hitParent.transform }, abs(hitChild.left, hitChild.top, hitChild.width, hitChild.height, { background: '#be123c', transform: hitChild.transform })),
        abs(hitCollapsed.left, hitCollapsed.top, hitCollapsed.size, hitCollapsed.size, { background: '#0f172a', transform: hitCollapsed.transform }),
        guide(bar.left, bar.top, bar.width, bar.height), guideLabel(bar.left, bar.top + bar.height + 2, 'unturned box'),
        guide(hitParent.left, hitParent.top, hitParent.size, hitParent.size), guideLabel(hitParent.left, hitParent.top + hitParent.size - 14, 'unscaled box'),
        guide(hitCollapsed.left, hitCollapsed.top, hitCollapsed.size, hitCollapsed.size), guideLabel(hitCollapsed.left, hitCollapsed.top + hitCollapsed.size + 2, 'scaled to zero'),
      ].join('') };
    }
    case 'hover': {
      const { hover } = BEHAVIOUR;
      return { stage: abs(hover.left, hover.top, hover.width, hover.height, { background: '#e0e7ff', borderRadius: px(12), border: '2px solid #6366f1' }, text('sm', '#1e293b', 'Hover me')) };
    }
    case 'utilities': return { stage: abs(260, 140, 120, 60, { background: '#fecdd3', borderRadius: px(8), transform: 'translate(-50%, -25%) rotate(6deg)', transformOrigin: 'top left' }, text('sm', '#1e293b', 'Utilities')) };
    case 'input': {
      const { input } = BEHAVIOUR;
      return { stage: abs(input.left, input.top, input.width, input.height, { background: '#ecfeff', borderRadius: px(12), border: '2px solid #0891b2', padding: px(12), transform: input.transform },
        `${text('xs', '#475569', 'A field in a turned card')}<input value="Hamburgefonstiv" style="margin-top:4px;border:1px solid #cbd5e1;border-radius:6px;background:white;padding:4px 8px;font:16px/24px 'Engine Inter';color:#0f172a;caret-color:#4f46e5;outline:none">`) };
    }
    case 'selection': {
      const { selectable } = BEHAVIOUR;
      return { stage: abs(selectable.left, selectable.top, selectable.width, undefined, { background: '#f1f5f9', borderRadius: px(8), padding: px(10), transform: selectable.transform }, text('base', '#0f172a', 'Hamburgefonstiv in a turned frame', { whiteSpace: 'nowrap' })) };
    }
    case 'drag': {
      const { drag } = BEHAVIOUR;
      return { stage: [
        abs(drag.left, drag.top, drag.width, drag.height, { background: '#fde68a', borderRadius: px(10), border: '2px solid #b45309', transform: drag.transform }, text('sm', '#1e293b', 'Drag me')),
        abs(drag.targetLeft, drag.targetTop, drag.targetSize, drag.targetSize, { background: '#dcfce7', borderRadius: px(12), transform: 'rotate(-12deg)' }, text('sm', '#1e293b', 'none')),
      ].join('') };
    }
    case 'scroll': {
      const { tilted, quarter } = BEHAVIOUR;
      const rows = Array.from({ length: tilted.rows }, (_, index) => box({ height: px(tilted.rowHeight), flexShrink: 0, justifyContent: 'center', paddingLeft: px(8) }, text('sm', '#1e293b', `Row ${index}`))).join('');
      const cells = Array.from({ length: quarter.cells }, (_, index) => box({ width: px(quarter.cellWidth), height: px(quarter.height), flexShrink: 0, justifyContent: 'center', alignItems: 'center' }, text('sm', '#1e293b', String(index)))).join('');
      return { stage: [
        abs(tilted.left, tilted.top, tilted.width, tilted.height, { background: '#f1f5f9', borderRadius: px(8), transform: tilted.transform, overflowY: 'auto' }, rows).replace('class="v"', 'class="v scroll"'),
        abs(quarter.left, quarter.top, quarter.width, quarter.height, { background: '#fef3c7', borderRadius: px(8), transform: quarter.transform, overflowX: 'auto', flexDirection: 'row' }, cells).replace('class="v"', 'class="v scroll"'),
      ].join('') };
    }
    case 'anchor': {
      const { anchor } = BEHAVIOUR;
      return { stage: abs(anchor.left, anchor.top, anchor.width, anchor.height, { background: '#c7d2fe', borderRadius: px(8), transform: anchor.transform }, '', 'id="trigger"'), anchor: true };
    }
    case 'clip': {
      const { clipped } = BEHAVIOUR;
      const one = (left, transform) => abs(left, clipped.top, clipped.size, clipped.size, { background: '#e2e8f0', overflow: 'hidden', transform }, abs(60, 60, clipped.size, clipped.size, { background: '#be123c' }));
      return { stage: `${one(clipped.left, clipped.scale)}${one(clipped.left + clipped.gap, clipped.rotate)}` };
    }
    case 'sharp': return { stage: [
      abs(60, 100, undefined, undefined, { transform: 'scale(1.5)', transformOrigin: 'top left' }, text('base', '#0f172a', 'Hamburgefonstiv 0123')),
      abs(60, 200, undefined, undefined, {}, text('2xl', '#0f172a', 'Hamburgefonstiv 0123')),
    ].join('') };
    default: throw new Error(`No reference markup for the case ${id}`);
  }
}

/** The lab at `width` CSS pixels: the stage (scaled when it does not fit), what a case puts under it, the case list and the caption (`TransformControls`). */
function labMarkup(option, width) {
  const fit = Math.min(1, Math.floor(width / STAGE.width * FIT_STEPS) / FIT_STEPS);
  const { stage, after = '', flip = false } = caseMarkup(option.id);
  const stageBox = abs(0, 0, STAGE.width, STAGE.height, { position: 'relative', flexShrink: 0, background: STAGE.background, ...(fit === 1 ? {} : { transform: `scale(${fit})`, transformOrigin: 'top left' }) }, stage, 'id="stage"');
  const fitted = fit === 1 ? stageBox : box({ width: px(STAGE.width * fit), height: px(STAGE.height * fit), overflow: 'hidden' }, stageBox);
  const chevron = '<svg width="12" height="12" viewBox="0 0 12 12" style="flex:none"><path d="M2 4l4 4 4-4" fill="none" stroke="#64748b" stroke-width="1.5"/></svg>';
  const list = box({ flex: '1 1 0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #cbd5e1', borderRadius: px(8), background: 'white', padding: '6px 12px' }, `${text('sm', '#0f172a', option.label)}${chevron}`);
  const flipButton = flip ? labButton({ background: '#4f46e5', padding: '4px 10px' }, 'Flip') : '';
  const controls = `${box({ height: px(1), background: '#e2e8f0' })}${box({ gap: px(8), background: 'white', padding: '8px 12px' }, `${box({ flexDirection: 'row', alignItems: 'center', gap: px(8) }, list + flipButton)}${text('sm', '#475569', option.caption.replace(/&/gu, '&amp;'), {}, 'id="caption"')}`)}`;
  return `<div id="lab" class="v" style="width:${width}px">${fitted}${after}${controls}</div>`;
}

function pageHtml(option, device, offset) {
  const width = Math.min(device.width - offset.x, STAGE.width);
  const markup = labMarkup(option, width);
  const meta = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">';
  return `<!doctype html>${meta}<style>${css}</style><div style="position:absolute;left:${offset.x}px;top:${offset.y}px">${markup}</div>`;
}

/** The rectangles of a case in Chrome, in CSS pixels: the lab, its stage and each text (a range's client rectangles: a wrapped line is one each). */
async function measure(page) {
  return page.evaluate(() => {
    const rect = box => ({ x: box.x, y: box.y, width: box.width, height: box.height });
    const texts = [];
    for (const element of document.querySelectorAll('.t')) {
      const range = document.createRange();
      range.selectNodeContents(element);
      for (const line of range.getClientRects()) texts.push(rect(line));
    }
    const input = document.querySelector('input');
    if (input !== null) texts.push(rect(input.getBoundingClientRect()));
    return { lab: rect(document.getElementById('lab').getBoundingClientRect()), stage: rect(document.getElementById('stage').getBoundingClientRect()), texts };
  });
}

/** The anchor page's guide and marker, placed from the trigger's bounding box as the lab does with `getRect()` (`AnchorPage`): in the page, over the stage. */
async function placeAnchor(page) {
  await page.evaluate(() => {
    const box = document.getElementById('trigger').getBoundingClientRect();
    const guideBox = document.createElement('div');
    guideBox.style.cssText = `position:absolute;left:${box.left + scrollX}px;top:${box.top + scrollY}px;width:${box.width}px;height:${box.height}px;border:1px solid #a5b4fc;box-sizing:border-box`;
    const marker = document.createElement('div');
    marker.style.cssText = `position:absolute;left:${box.left + box.width + scrollX}px;top:${box.top + box.height + scrollY}px;width:8px;height:8px;background:#be123c`;
    document.body.append(guideBox, marker);
  });
}

async function readOffsets(path) {
  if (path === undefined) return {};
  return JSON.parse(await readFile(path, 'utf8'));
}

async function render(outDirectory, offsetsPath) {
  await mkdir(outDirectory, { recursive: true });
  const offsets = await readOffsets(offsetsPath);
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  const reference = {};
  try {
    for (const [name, device] of Object.entries(DEVICES)) {
      const page = await browser.newPage();
      await page.setViewport(device);
      const offset = offsets[name] ?? { x: 0, y: 0 };
      for (const option of allOptions()) {
        await page.setContent(pageHtml(option, device, offset));
        const { anchor } = caseMarkup(option.id);
        if (anchor === true) await placeAnchor(page);
        await new Promise(done => setTimeout(done, SETTLE_MS));
        await page.screenshot({ path: resolve(outDirectory, `chrome-${option.id.replace(':', '-')}-${name}.png`) });
        reference[`${option.id.replace(':', '-')}-${name}`] = await measure(page);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  await writeFile(resolve(outDirectory, 'reference.json'), `${JSON.stringify({ devices: DEVICES, offsets, reference }, null, 2)}\n`);
  console.log(`Chrome reference: ${Object.keys(reference).length} pictures in ${outDirectory}`);
}

// ---- Comparing ----------------------------------------------------------------------------------------------------------

/** The page that decodes the pictures, crops each to a rectangle in device pixels, and compares the first two per channel with `mask` (CSS rectangles) left out. */
async function compareInPage(browser, entries, mask, scale, region) {
  const page = await browser.newPage();
  try {
    await page.setContent('<!doctype html><canvas id="c"></canvas>');
    return await page.evaluate(async (entries, mask, scale, region, visible) => {
      const load = source => new Promise((done, fail) => {
        const image = new Image();
        image.onload = () => done(image);
        image.onerror = () => fail(new Error('cannot decode'));
        image.src = `data:image/png;base64,${source}`;
      });
      /** `region` of an image as ImageData, in device pixels; what lies outside the image is left transparent. */
      const crop = (image, from) => {
        const canvas = document.createElement('canvas');
        canvas.width = region.width;
        canvas.height = region.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, from.x, from.y, region.width, region.height, 0, 0, region.width, region.height);
        return context.getImageData(0, 0, region.width, region.height);
      };
      const [chrome, library] = await Promise.all([load(entries[0].data), load(entries[1].data)]);
      const a = crop(chrome, entries[0].origin);
      const b = crop(library, entries[1].origin);
      const { width, height } = region;
      const masked = new Uint8Array(width * height);
      for (const rect of mask) {
        const x0 = Math.max(0, Math.floor(rect.x * scale)); const x1 = Math.min(width, Math.ceil((rect.x + rect.width) * scale));
        const y0 = Math.max(0, Math.floor(rect.y * scale)); const y1 = Math.min(height, Math.ceil((rect.y + rect.height) * scale));
        for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) masked[y * width + x] = 1;
      }
      // Edges are where the picture changes quickly in Chrome's: a pixel that steps by more than EDGE_STEP levels from a neighbour, and the pixels round it.
      const EDGE_STEP = 8;
      const sharp = new Uint8Array(width * height);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          let biggest = 0;
          for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
            const nx = x + dx; const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            for (let channel = 0; channel < 3; channel += 1) biggest = Math.max(biggest, Math.abs(a.data[(y * width + x) * 4 + channel] - a.data[(ny * width + nx) * 4 + channel]));
          }
          sharp[y * width + x] = biggest > EDGE_STEP ? 1 : 0;
        }
      }
      const edge = new Uint8Array(width * height);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (!sharp[y * width + x]) continue;
          for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx; const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) edge[ny * width + nx] = 1;
          }
        }
      }
      const groups = { interior: { counted: 0, visible: 0, worst: [0, 0, 0], sum: [0, 0, 0] }, edge: { counted: 0, visible: 0, worst: [0, 0, 0], sum: [0, 0, 0] } };
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (masked[y * width + x]) continue;
          const group = groups[edge[y * width + x] ? 'edge' : 'interior'];
          group.counted += 1;
          let biggest = 0;
          for (let channel = 0; channel < 3; channel += 1) {
            const apart = Math.abs(a.data[(y * width + x) * 4 + channel] - b.data[(y * width + x) * 4 + channel]);
            group.worst[channel] = Math.max(group.worst[channel], apart);
            group.sum[channel] += apart;
            biggest = Math.max(biggest, apart);
          }
          if (biggest > visible) group.visible += 1;
        }
      }
      const summarise = group => ({
        compared: group.counted, visibleShare: group.visible / Math.max(1, group.counted), worst: group.worst, typical: group.sum.map(sum => sum / Math.max(1, group.counted)),
      });
      return { interior: summarise(groups.interior), edge: summarise(groups.edge) };
    }, entries, mask, scale, region, VISIBLE_LEVELS);
  } finally {
    await page.close();
  }
}

/** Labelled crops of the pictures, side by side in one PNG, each scaled to the width of the first. */
async function sideBySide(browser, output, figures) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 800, height: 600 });
    const html = figures.map(({ label, data }) => `<figure><img src="data:image/png;base64,${data}"><figcaption>${label}</figcaption></figure>`).join('');
    await page.setContent(`<!doctype html><style>body{margin:0;background:#111;color:#ddd;font:13px system-ui;display:flex;gap:8px;padding:8px;align-items:flex-start}figure{margin:0}img{display:block;height:auto}figcaption{padding:4px 0}</style>${html}`);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    const first = await page.evaluate(() => document.images[0].naturalWidth);
    await page.evaluate(width => { for (const image of document.images) image.style.width = `${width}px`; }, first);
    const size = await page.evaluate(() => ({ width: Math.ceil(document.body.scrollWidth), height: Math.ceil(document.body.scrollHeight) }));
    await page.setViewport(size);
    await page.screenshot({ path: output });
  } finally {
    await page.close();
  }
}

async function cropToBase64(browser, path, region, scale) {
  const page = await browser.newPage();
  try {
    await page.setContent('<!doctype html><canvas id="c"></canvas>');
    return await page.evaluate(async (source, region, scale) => {
      const image = new Image();
      await new Promise((done, fail) => { image.onload = done; image.onerror = fail; image.src = `data:image/png;base64,${source}`; });
      const canvas = document.getElementById('c');
      canvas.width = Math.round(region.width * scale);
      canvas.height = Math.round(region.height * scale);
      canvas.getContext('2d').drawImage(image, region.x * scale, region.y * scale, region.width * scale, region.height * scale, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png').split(',')[1];
    }, (await readFile(path)).toString('base64'), region, scale);
  } finally {
    await page.close();
  }
}

const exists = path => access(path).then(() => true, () => false);

async function compare(chromeDirectory, webDirectory, nativeDirectory, outDirectory) {
  await mkdir(outDirectory, { recursive: true });
  const { reference, offsets } = JSON.parse(await readFile(resolve(chromeDirectory, 'reference.json'), 'utf8'));
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  const report = {};
  try {
    for (const [name, device] of Object.entries(DEVICES)) {
      const scale = device.deviceScaleFactor;
      for (const option of allOptions()) {
        const slug = option.id.replace(':', '-');
        const key = `${slug}-${name}`;
        const measured = reference[key];
        const chromePath = resolve(chromeDirectory, `chrome-${key}.png`);
        const webPath = resolve(webDirectory, `web-${name}`, `${slug}.png`);
        if (!(await exists(chromePath)) || !(await exists(webPath))) continue;
        const offset = offsets?.[name] ?? { x: 0, y: 0 };
        // The lab's own rectangle in device pixels: both pictures have it at the same place (the reference was made with the library's offsets).
        const lab = { x: measured.lab.x, y: measured.lab.y, width: measured.lab.width, height: measured.lab.height };
        const stage = { x: measured.stage.x, y: measured.stage.y, width: measured.stage.width, height: measured.stage.height };
        const region = { x: Math.round(stage.x * scale), y: Math.round(stage.y * scale), width: Math.floor(stage.width * scale), height: Math.floor(stage.height * scale) };
        const mask = measured.texts
          .filter(box => box.y < stage.y + stage.height)
          .map(box => ({ x: box.x - stage.x - TEXT_MASK_MARGIN, y: box.y - stage.y - TEXT_MASK_MARGIN, width: box.width + 2 * TEXT_MASK_MARGIN, height: box.height + 2 * TEXT_MASK_MARGIN }));
        const read = async path => (await readFile(path)).toString('base64');
        report[key] = await compareInPage(browser, [{ data: await read(chromePath), origin: { x: region.x, y: region.y } }, { data: await read(webPath), origin: { x: region.x, y: region.y } }], mask, scale, region);
        const labRegion = { x: lab.x, y: lab.y, width: lab.width, height: lab.height };
        const figures = [
          { label: `Chrome (${name}, ${scale}x)`, data: await cropToBase64(browser, chromePath, labRegion, scale) },
          { label: `library, Web (Chrome ${device.isMobile ? 'mobile emulation' : 'desktop'})`, data: await cropToBase64(browser, webPath, labRegion, scale) },
        ];
        const nativePath = nativeDirectory === undefined || name !== 'phone' ? undefined : resolve(nativeDirectory, `transforms-lab-${slug}-phone.png`);
        if (nativePath !== undefined && await exists(nativePath)) figures.push({ label: 'library, native (device pixel ratio 1)', data: await cropToBase64(browser, nativePath, { ...labRegion, x: 0, y: 0 }, 1) });
        await sideBySide(browser, resolve(outDirectory, `${key}.png`), figures);
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(resolve(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const three = (values, digits) => values.map(value => value.toFixed(digits).padStart(digits === 0 ? 3 : 6)).join(' ');
  for (const [key, entry] of Object.entries(report)) {
    for (const part of ['interior', 'edge']) {
      console.log(`${key.padEnd(30)} ${part.padEnd(8)} n ${String(entry[part].compared).padStart(7)}  worst ${three(entry[part].worst, 0)}  typical ${three(entry[part].typical, 3)}  >${VISIBLE_LEVELS}: ${(entry[part].visibleShare * 100).toFixed(3)}%`);
    }
  }
  console.log(`Wrote ${Object.keys(report).length} comparisons to ${outDirectory}`);
  void readdir;
  void root;
}

const flags = ['render', 'compare'].filter(name => process.argv.includes(`--${name}`));
if (flags.length !== 1) throw new Error('Choose one of --render, --compare.');
if (flags[0] === 'render') await render(resolve(argument('out') ?? resolve(root, 'artifacts/transforms-lab-reference')), argument('offsets') === undefined ? undefined : resolve(argument('offsets')));
else {
  const webDirectory = argument('web');
  if (webDirectory === undefined) throw new Error('--compare needs --web=<directory of the Web captures>');
  await compare(
    resolve(argument('chrome') ?? resolve(root, 'artifacts/transforms-lab-reference')), resolve(webDirectory),
    argument('native') === undefined ? undefined : resolve(argument('native')), resolve(argument('out') ?? resolve(root, 'artifacts/transforms-lab-compare')),
  );
}
