// The `rich-text` section of the Web interaction verifier: the native section's comparison of the rich text lab
// with Chrome (demo/src/verify-rich-text.ts), from the real canvas in Chrome at both device pixel ratios. It holds the box of every text and
// the baseline and the two ends of every line, and the edges of every character and inlay the geometry queries report, to the numbers headless
// Chrome reports for the same tree as nested spans (scripts/rich-text-golden.json, written by `node --import tsx scripts/rich-text-reference.mjs
// --golden`), clicks and drags with Chrome's own mouse where Chrome's characters are, and captures every page for the per channel comparison
// (`node --import tsx scripts/rich-text-reference.mjs --diff --native=<capture directory>`).
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const golden = JSON.parse(await readFile(resolve(import.meta.dirname, 'rich-text-golden.json'), 'utf8'));

/** "Within a pixel", in logical pixels, for the boxes and the lines. */
const TOLERANCE_PX = 1;
/** One character's edges: both place glyphs at quarter pixels. */
const CHARACTER_TOLERANCE_PX = 0.5;
const SETTLE_FRAMES = 4;
const INSIDE_SHARE = 0.25;
const ABOVE_BASELINE_PX = 4;
const CHARACTER_STRIDE = 2;
/** A pixel of the glyph samples is ink when its green level is below this (a share of 255 of white): they are red on white. */
const INK_GREEN_BELOW = 128;
/** A glyph is searched for this far (logical px) outside its text's box. */
const GLYPH_SCAN_MARGIN_PX = 4;
/** The Web has no system fonts (`OS_Web` does not report `system_fonts`), so every character no registered font has is a hex box. */
const GLYPH_SAMPLES = ['glyph-box-plain', 'glyph-box-span', 'glyph-box-other', 'glyph-han-plain', 'glyph-han-span', 'glyph-han-tracked', 'glyph-han-box', 'glyph-thai-plain', 'glyph-thai-tracked'];

/** The pixels of `rect` (and a margin) of `image` from the top left of its ink to the bottom right of it, or `undefined`. */
function inkCrop(image, ratio, rect) {
  const from = (value) => Math.max(0, Math.floor((value - GLYPH_SCAN_MARGIN_PX) * ratio));
  const to = (value, limit) => Math.min(limit, Math.ceil((value + GLYPH_SCAN_MARGIN_PX) * ratio));
  const [x0, y0] = [from(rect.x), from(rect.y)];
  const [x1, y1] = [to(rect.x + rect.width, image.width), to(rect.y + rect.height, image.height)];
  const at = (x, y) => (y * image.width + x) * image.channels;
  let [left, top, right, bottom] = [x1, y1, x0 - 1, y0 - 1];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (image.pixels[at(x, y) + 1] >= INK_GREEN_BELOW) continue;
      [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
    }
  }
  if (right < left) return undefined;
  const levels = [];
  for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) levels.push(image.pixels[at(x, y)], image.pixels[at(x, y) + 1], image.pixels[at(x, y) + 2]);
  return { width: right - left + 1, height: bottom - top + 1, levels };
}

/** The most a level differs between two crops, or `Infinity` when they are not the same size. */
function cropDifference(a, b) {
  if (a === undefined || b === undefined || a.width !== b.width || a.height !== b.height) return Infinity;
  return a.levels.reduce((worst, level, index) => Math.max(worst, Math.abs(level - b.levels[index])), 0);
}

/**
 * The glyph page, on the Web: no font has the characters of its samples that the demo's faces lack, so a Han and a Thai character in plain, coloured
 * and letter-spaced text are each the hex box the text server draws for a character no font has, the same box in every way of drawing it, and the
 * private-use character is the same box in plain text and in a span.
 */
async function verifyGlyphs(context) {
  const { demo, page, frames, snapshot, find, check, capture, decodePng, actionTimeoutMs } = context;
  for (let index = 0; index < SETTLE_FRAMES; index += 1) await frames();
  await demo('showRichText', { page: 'glyphs' });
  for (let index = 0; index < SETTLE_FRAMES; index += 1) await frames();
  const dpr = await page.evaluate(() => globalThis.devicePixelRatio);
  await capture(`rich-text-glyphs-${dpr === 1 ? 'dpr1' : 'web-dpr2'}`);
  const canvas = await page.$('canvas');
  const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: actionTimeoutMs })));
  await canvas.dispose();
  const ratio = image.width / (await snapshot()).width;
  const crops = {};
  for (const id of GLYPH_SAMPLES) crops[id] = inkCrop(image, ratio, (await find(id)).rect);
  const size = (id) => (crops[id] === undefined ? 'no ink' : `${crops[id].width}x${crops[id].height}`);
  check(`glyphs: the same character no font has is the same hex box in plain text and in a span (ratio ${dpr})`,
    crops['glyph-box-plain'] !== undefined && cropDifference(crops['glyph-box-plain'], crops['glyph-box-span']) === 0, { plain: size('glyph-box-plain'), span: size('glyph-box-span') });
  check(`glyphs: another character is another box (ratio ${dpr})`, cropDifference(crops['glyph-box-plain'], crops['glyph-box-other']) > 0);
  for (const id of ['glyph-han-plain', 'glyph-han-span', 'glyph-han-tracked']) {
    check(`glyphs: ${id} is the hex box of the character, as the Web has no font for it (ratio ${dpr})`, crops['glyph-han-box'] !== undefined && cropDifference(crops[id], crops['glyph-han-box']) === 0, { drawn: size(id), box: size('glyph-han-box') });
  }
  check(`glyphs: a Thai character is the same box plain and letter-spaced (ratio ${dpr})`, crops['glyph-thai-plain'] !== undefined && cropDifference(crops['glyph-thai-plain'], crops['glyph-thai-tracked']) === 0, { plain: size('glyph-thai-plain'), tracked: size('glyph-thai-tracked') });
}

export async function runRichTextScenario(context) {
  const { demo, page, frames, find, check, capture, moveTo } = context;
  const settle = async () => { for (let index = 0; index < SETTLE_FRAMES; index += 1) await frames(); };
  const pages = [...new Set(Object.values(golden).map((entry) => entry.page))];
  const idsOf = (pageId) => Object.entries(golden).filter(([, entry]) => entry.page === pageId).map(([id]) => id);
  const dpr = await page.evaluate(() => globalThis.devicePixelRatio);
  const near = (found, what, a, b, tolerance) => { if (Math.abs(a - b) > tolerance) found.push(`${what}: ${a.toFixed(2)} against Chrome's ${b.toFixed(2)}`); };

  for (const pageId of pages) {
    await demo('showRichText', { page: pageId });
    await settle();
    const failures = [];
    for (const id of idsOf(pageId)) {
      const chrome = golden[id];
      const node = await find(id);
      const ours = await demo('textLines', id);
      const found = [];
      for (const key of ['x', 'y', 'width', 'height']) near(found, `box ${key}`, node.rect[key], chrome.box[key], TOLERANCE_PX);
      if (ours.lines.length !== chrome.lines.length) found.push(`line count: ${ours.lines.length} against Chrome's ${chrome.lines.length}`);
      else {
        chrome.lines.forEach((line, index) => {
          near(found, `line ${index} baseline`, ours.lines[index].baseline, line.baseline, TOLERANCE_PX);
          near(found, `line ${index} left`, ours.lines[index].x, line.x, TOLERANCE_PX);
          near(found, `line ${index} right`, ours.lines[index].x + ours.lines[index].width, line.x + line.width, TOLERANCE_PX);
        });
      }
      // Every character and every group of inlays, as the geometry queries report them.
      for (let index = 0; index < chrome.chars.length; index += 1) {
        const [start, left, right] = chrome.chars[index];
        if (right - left <= 0) continue;
        const end = chrome.chars[index + 1]?.[0] ?? start + 1;
        const rect = (await demo('richTextRanges', id, start, Math.min(end, start + 2)))?.[0];
        if (rect === undefined) { found.push(`character ${start}: no rectangle`); continue; }
        near(found, `character ${start} left`, rect.x, left, CHARACTER_TOLERANCE_PX);
      }
      const groups = [];
      for (const entry of chrome.inlays) {
        const last = groups.at(-1);
        if (last !== undefined && last.at === entry.at && last.line === entry.line) last.right = entry.right;
        else groups.push({ ...entry });
      }
      for (const group of groups) {
        const before = await demo('richTextCaret', id, group.at, 'before');
        const after = await demo('richTextCaret', id, group.at, 'after');
        near(found, `inlays at ${group.at} left`, before.x, group.left, CHARACTER_TOLERANCE_PX);
        near(found, `inlays at ${group.at} right`, after.x, group.right, CHARACTER_TOLERANCE_PX);
      }
      if (found.length > 0) failures.push(`${id}: ${found.join('; ')}`);
    }
    check(`${pageId}: every text, character and inlay is where Chrome has it (ratio ${dpr})`, failures.length === 0, failures);
    await capture(`rich-text-${pageId}-${dpr === 1 ? 'dpr1' : 'web-dpr2'}`);
  }

  // Hit tests: a click on each half of a character is the boundary before or after it, on the side an inlay leaves.
  for (const id of ['code-line', 'columns-spans', 'inlay-hint', 'inlay-group']) {
    const chrome = golden[id];
    await demo('showRichText', { page: chrome.page });
    await settle();
    const inlayAt = new Set(chrome.inlays.map((entry) => entry.at));
    const wrong = [];
    for (let index = 0; index < chrome.chars.length; index += CHARACTER_STRIDE) {
      const [start, left, right, lineIndex] = chrome.chars[index];
      const end = chrome.chars[index + 1]?.[0] ?? start + 1;
      const y = chrome.lines[lineIndex].baseline - ABOVE_BASELINE_PX;
      const expected = [
        [left + (right - left) * INSIDE_SHARE, { offset: start, side: 'after' }],
        [right - (right - left) * INSIDE_SHARE, { offset: end, side: inlayAt.has(end) ? 'before' : 'after' }],
      ];
      for (const [x, want] of expected) {
        const found = await demo('richTextOffsetAt', id, x, y);
        if (found?.offset !== want.offset || found?.side !== want.side) wrong.push(`${id} at ${x.toFixed(2)}: ${JSON.stringify(found)} not ${JSON.stringify(want)}`);
      }
    }
    check(`${id}: a click on each half of each character finds the boundary beside it (ratio ${dpr})`, wrong.length === 0, wrong);
  }

  // Selection with Chrome's own mouse: across spans, and across an inlay, which the selection and the copy leave out.
  const select = async (id, from, to) => {
    const chrome = golden[id];
    const point = (index) => {
      const [, left, right, lineIndex] = chrome.chars[index];
      return { x: left + (right - left) * INSIDE_SHARE, y: chrome.lines[lineIndex].baseline - ABOVE_BASELINE_PX };
    };
    await moveTo(point(from));
    await page.mouse.down();
    await frames();
    await moveTo(point(to));
    await page.mouse.up();
    await settle();
    return (await demo('selection'))?.text;
  };
  await demo('showRichText', { page: 'colours' });
  await settle();
  const code = 'const x = 42; // the answer';
  check('code-line: a drag across spans selects the text between', (await select('code-line', 2, 20)) === code.slice(2, 20));
  await demo('showRichText', { page: 'inlays' });
  await settle();
  const hint = 'let count = 42;';
  check('inlay-hint: a drag across the inlay selects the text without it', (await select('inlay-hint', 5, 11)) === hint.slice(5, 11), { selected: await demo('selection') });

  // A change of a span's colour is painted without shaping the paragraph again.
  await demo('showRichText', { page: 'changes', tone: 0, word: 0 });
  await settle();
  const before = await demo('activity');
  await demo('showRichText', { page: 'changes', tone: 1, word: 0 });
  await settle();
  const after = await demo('activity');
  check('a change of a span\'s colour shapes no paragraph again and repaints one', after.paragraphBuilds === before.paragraphBuilds && after.paragraphRepaints === before.paragraphRepaints + 1, { before, after });
  await verifyGlyphs(context);
  await demo('restoreDemo');
  await settle();
}
