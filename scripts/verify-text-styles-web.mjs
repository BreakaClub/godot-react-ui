// The `text-styles` section of the Web interaction verifier: the native section's comparison of the text
// styles lab with Chrome (demo/src/verify-text-styles.ts), from the real canvas in Chrome at both device pixel ratios. It holds the box
// of every text and the baseline and the two ends of every line to the numbers headless Chrome reports for the same classes
// (scripts/text-styles-golden.json, written by `node --import tsx scripts/text-styles-reference.mjs --golden`), selects with Chrome's own
// mouse where Chrome's characters are, and captures every page for the per channel comparison
// (`node --import tsx scripts/text-styles-reference.mjs --diff --native=<capture directory>`). It also reads the canvas: the right edge
// of every line's ink, and for the white space page the ink of every character, are held to Chrome's.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decodePng } from './png.mjs';
import { inkDeviations, measureTextInk } from './text-ink.mjs';

const golden = JSON.parse(await readFile(resolve(import.meta.dirname, 'text-styles-golden.json'), 'utf8'));

/** "Within a pixel", in logical pixels. */
const TOLERANCE_PX = 1;
const SETTLE_FRAMES = 4;
const INSIDE_LEFT_SHARE = 0.25;
const ABOVE_BASELINE_PX = 4;
const CHARACTER_STRIDE = 7;
/** Texts whose lines are not all compared, and why (`demo/src/verify-text-styles.ts`, `COMPARISON`). */
const COMPARISON = { truncate: 'box', ellipsis: 'box', clip: 'box', 'clamp-1': 'first', 'clamp-2': 'first', 'clamp-3': 'first', 'tracking-wrap-edge': 'box' };
/** The texts the page selects in, and those a case transform lengthens (their characters are not Chrome's). */
const LENGTHENED = ['case-upper', 'case-capitalize'];

/** The boxes and lines of `ours` further than the tolerance from Chrome's. */
export function deviations(box, ours, chrome, comparison) {
  const found = [];
  const near = (what, a, b) => { if (Math.abs(a - b) > TOLERANCE_PX) found.push({ what, ours: a, chrome: b }); };
  near('box x', box.x, chrome.box.x);
  near('box y', box.y, chrome.box.y);
  near('box width', box.width, chrome.box.width);
  near('box height', box.height, chrome.box.height);
  if (comparison === 'box') return found;
  const lines = comparison === 'first' ? chrome.lines.slice(0, ours.lines.length) : chrome.lines;
  if (ours.lines.length !== lines.length) return [...found, { what: 'line count', ours: ours.lines.length, chrome: lines.length }];
  lines.forEach((line, index) => {
    const mine = ours.lines[index];
    near(`line ${index} baseline`, mine.baseline, line.baseline);
    if (!/\s/u.test([...ours.text].slice(mine.start, mine.start + 1).join(''))) near(`line ${index} left`, mine.x, line.x);
    near(`line ${index} right`, mine.x + mine.width, line.x + line.width);
  });
  return found;
}

/** What the library draws is Chrome's too: the end of each line's ink, and the ink of each character, from a picture of the canvas. */
async function inkFailures(page, snapshot, pageId, ids, dpr) {
  const canvas = await page.$('canvas');
  const picture = decodePng(Buffer.from(await canvas.screenshot({ type: 'png' })));
  await canvas.dispose();
  // The picture is as many pixels per logical pixel as it is wider than the root.
  const scale = picture.width / (await snapshot()).width;
  const failures = [];
  const compared = { edges: 0, glyphs: 0 };
  for (const id of ids) {
    const chrome = golden[id];
    const reference = chrome.ink[String(dpr)];
    if (reference === undefined) {
      failures.push(`${id}: Chrome has no ink numbers at ratio ${dpr}`);
      continue;
    }
    const ours = measureTextInk(picture, scale, chrome);
    compared.edges += reference.edges.length;
    compared.glyphs += reference.glyphs?.length ?? 0;
    const found = inkDeviations(ours, reference, chrome.cells, [...chrome.copy]);
    if (found.length > 0) failures.push(`${id}: ${found.map((each) => `${each.what}: ${each.ours?.toFixed(2) ?? 'none'} against ${each.chrome?.toFixed(2) ?? 'none'}`).join('; ')}`);
    if (id === 'justify' && reference.glyphs !== undefined) {
      // Controls: the numbers of the justified text with a glyph not drawn, and with a line ending early, are found.
      const already = found.length;
      const undrawn = { ...ours, glyphs: ours.glyphs.map((ink, index) => (index === 0 ? 0 : ink)) };
      if (inkDeviations(undrawn, reference, chrome.cells, [...chrome.copy]).length <= already) failures.push('Control: the justified text without the ink of its first character passes');
      const short = { ...ours, edges: ours.edges.map((edge, index) => (index === 1 && edge !== null ? edge - 10 : edge)) };
      if (inkDeviations(short, reference, chrome.cells, [...chrome.copy]).length <= already) failures.push('Control: the justified text with its second line ending early passes');
    }
  }
  return { failures, compared, scale };
}

export async function runTextStylesScenario(context) {
  const { demo, page, frames, find, check, capture, moveTo, snapshot } = context;
  const settle = async () => { for (let index = 0; index < SETTLE_FRAMES; index += 1) await frames(); };
  const pages = [...new Set(Object.values(golden).map((entry) => entry.page))];
  const idsOf = (pageId) => Object.entries(golden).filter(([, entry]) => entry.page === pageId).map(([id]) => id);
  const describe = (found) => found.map((each) => `${each.what}: ${each.ours.toFixed(2)} against ${each.chrome.toFixed(2)}`).join('; ');
  const dpr = await page.evaluate(() => globalThis.devicePixelRatio);

  for (const pageId of pages) {
    await demo('showTextStyles', pageId);
    await settle();
    const failures = [];
    for (const id of idsOf(pageId)) {
      const node = await find(id);
      const ours = await demo('textLines', id);
      const found = deviations(node.rect, ours, golden[id], COMPARISON[id] ?? 'full');
      if (found.length > 0) failures.push(`${id}: ${describe(found)}`);
    }
    check(`${pageId}: every text is within ${TOLERANCE_PX} px of Chrome's (ratio ${dpr})`, failures.length === 0, failures);
    if (pageId === 'whitespace') {
      const ink = await inkFailures(page, snapshot, pageId, idsOf(pageId), dpr);
      check(`${pageId}: what is drawn ends where Chrome's ink ends, and every character has its ink (ratio ${dpr}, ${ink.compared.edges} lines, ${ink.compared.glyphs} characters)`, ink.failures.length === 0, ink.failures);
    }
    await capture(`text-styles-${pageId}-${dpr === 1 ? 'dpr1' : 'web-dpr2'}`);
  }

  // Controls: the comparison fails for the neighbouring style.
  await demo('showTextStyles', 'leading');
  await settle();
  const relaxed = await demo('textLines', 'leading-relaxed');
  check('Control: leading-relaxed is not within a pixel of the numbers for leading-loose',
    deviations((await find('leading-relaxed')).rect, relaxed, golden['leading-loose'], 'full').length > 0);

  // Selection: a drag between two of Chrome's characters selects the text between them; a triple click selects it all, and the
  // selection's text is what copying it gives in Chrome.
  const selecting = Object.entries(golden).filter(([, entry]) => entry.chars !== undefined && entry.chars.length > 0);
  for (const [id, chrome] of selecting) {
    await demo('showTextStyles', chrome.page);
    await settle();
    const shown = (await demo('textLines', id)).text;
    const point = (index) => {
      const [left, right, lineIndex] = chrome.chars[index];
      return { x: left + (right - left) * INSIDE_LEFT_SHARE, y: chrome.lines[lineIndex].baseline - ABOVE_BASELINE_PX };
    };
    if (!LENGTHENED.includes(id)) {
      const characters = [...shown];
      const wrong = [];
      for (let from = 0; from + CHARACTER_STRIDE < characters.length; from += CHARACTER_STRIDE) {
        const to = from + CHARACTER_STRIDE;
        await moveTo(point(from));
        await page.mouse.down();
        await frames();
        await moveTo(point(to));
        await page.mouse.up();
        await settle();
        const selected = (await demo('selection'))?.text;
        const expected = characters.slice(from, to).join('');
        if (selected !== expected) wrong.push(`${from}..${to}: ${JSON.stringify(selected)} not ${JSON.stringify(expected)}`);
      }
      check(`${id}: a drag between Chrome's characters selects the text between them`, wrong.length === 0, wrong);
    }
    await moveTo({ x: chrome.lines[0].x + 2, y: chrome.lines[0].baseline - ABOVE_BASELINE_PX });
    for (let press = 0; press < 3; press += 1) {
      await page.mouse.down();
      await page.mouse.up();
    }
    await settle();
    check(`${id}: a triple click selects what copying gives in Chrome`, (await demo('selection'))?.text === chrome.copy, { selected: (await demo('selection'))?.text, chrome: chrome.copy });
  }
  await demo('restoreDemo');
  await settle();
}
