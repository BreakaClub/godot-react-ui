// The `paint` section of the Web interaction verifier: the paint lab's pages (demo/src/paint-lab.tsx) drawn by the library in Chrome's
// canvas, one capture a page at the viewport's device pixel ratio, for `scripts/paint-reference.mjs --compare` to hold against the same
// pages as plain HTML in Chrome. A few of the native section's reads (demo/src/verify-paint.ts) are
// repeated here, from the canvas: the ones that carry the claims (no shadow through a translucent box, a ring's width, a shadow that
// reaches in from a box wholly off the window, the corners a gradient heads for). What differs is only how pixels are read.
import { build } from 'esbuild';
import { resolve } from 'node:path';

const SETTLE_FRAMES = 4;
const SAME_LEVELS = 2;
/** Chrome's pixel 2 logical pixels in from the left edge, level with the middle of the shadow of the box wholly off the stage (scripts/paint-reference.mjs), at both ratios. */
const CHROME_CULLED_REACH = [221, 227, 235];
const CHROME_LEVELS = 3;
const NEAR_LEVELS = 6;

const SLATE_50 = [248, 250, 252];
const WHITE = [255, 255, 255];
const INDIGO_500 = [99, 102, 241];
const PINK_500 = [236, 72, 153];

/** The lab's data module, bundled by esbuild and imported (this script runs under plain node, which does not read TypeScript). */
async function loadPaintData() {
  const { outputFiles } = await build({
    entryPoints: [resolve(import.meta.dirname, '../demo/src/paint-data.ts')], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
}

export async function runPaintScenario(context) {
  const { demo, page, frames, check, find, capture, decodePng, actionTimeoutMs } = context;
  // The lab's own data, so the page list is the one the lab and the reference use.
  const { PAINT_PAGES, PAINT_STAGE } = await loadPaintData();
  const settle = async () => { for (let index = 0; index < SETTLE_FRAMES; index += 1) await frames(); };
  const cellOf = (name, index) => PAINT_PAGES.find(entry => entry.name === name).cells[index];
  const grab = async () => {
    const canvas = await page.$('canvas');
    const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: actionTimeoutMs })));
    await canvas.dispose();
    return { image };
  };
  const pixel = (shot, x, y) => {
    const px = Math.min(shot.image.width - 1, Math.max(0, Math.round(x)));
    const py = Math.min(shot.image.height - 1, Math.max(0, Math.round(y)));
    const at = (py * shot.image.width + px) * shot.image.channels;
    return [shot.image.pixels[at], shot.image.pixels[at + 1], shot.image.pixels[at + 2]];
  };
  const apart = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  const describe = colour => `rgb(${colour.join(', ')})`;
  const boxOf = (cell, ratio) => ({ x0: Math.round(cell.left * ratio), y0: Math.round(cell.top * ratio), x1: Math.round((cell.left + cell.width) * ratio), y1: Math.round((cell.top + cell.height) * ratio) });
  const colourIs = (shot, x, y, expected, tolerance, what) => {
    const got = pixel(shot, x, y);
    check(`${what}: ${describe(got)}, expected ${describe(expected)} within ${tolerance}`, apart(got, expected) <= tolerance, { at: [x, y], got, expected });
  };

  for (const entry of PAINT_PAGES) {
    await demo('showPaintPage', entry.name);
    await settle();
    const stage = await find('paint-stage');
    check(`Paint page ${entry.name} has its stage`, stage?.rect.width === PAINT_STAGE.width && stage.rect.height === PAINT_STAGE.height, stage?.rect);
    await capture(`paint-${entry.name}`, { geometry: false });
    const shot = await grab();
    const ratio = page.viewport().deviceScaleFactor;
    if (entry.name === 'shadows-translucent') {
      // The same classes but for the shadow, over the same stripes: inside the box the shadow must not show.
      const plain = boxOf(cellOf(entry.name, 0), ratio);
      const shadowed = boxOf(cellOf(entry.name, 1), ratio);
      for (const [dx, dy] of [[0.2, 0.25], [0.5, 0.5], [0.8, 0.75], [0.5, 0.15]]) {
        const a = pixel(shot, plain.x0 + (plain.x1 - plain.x0) * dx, plain.y0 + (plain.y1 - plain.y0) * dy);
        const b = pixel(shot, shadowed.x0 + (shadowed.x1 - shadowed.x0) * dx, shadowed.y0 + (shadowed.y1 - shadowed.y0) * dy);
        check(`A translucent box shows no shadow through itself (${dx}, ${dy}): ${describe(b)} with shadow-xl, ${describe(a)} without`, apart(a, b) <= 1, { a, b });
      }
      const cx = (shadowed.x0 + shadowed.x1) / 2;
      const stripe = pixel(shot, cx - 40 * ratio, shadowed.y1 + 6 * ratio);
      const shade = pixel(shot, cx, shadowed.y1 + 6 * ratio);
      check(`shadow-xl darkens the stripes below the box: ${describe(shade)} against ${describe(stripe)}`, apart(stripe, shade) >= 6, { stripe, shade });
    }
    if (entry.name === 'rings') {
      const ring = boxOf(cellOf(entry.name, 2), ratio);
      const y = (ring.y0 + ring.y1) / 2;
      colourIs(shot, ring.x0 - 1, y, INDIGO_500, SAME_LEVELS, 'ring-2 ring-indigo-500 touches the box');
      colourIs(shot, ring.x0 - 2 * ratio, y, INDIGO_500, SAME_LEVELS, 'and is 2 logical pixels wide');
      colourIs(shot, ring.x0 - 2 * ratio - 1, y, SLATE_50, SAME_LEVELS, 'and ends there');
      colourIs(shot, ring.x0 + 1, y, WHITE, SAME_LEVELS, 'and is not drawn inside the box');
    }
    if (entry.name === 'shadows-shapes') {
      const edge = cellOf(entry.name, 12);
      // shadow-2xl falls 25px: read level with the middle of the shadow.
      const y = Math.round((edge.top + edge.height / 2 + 25) * ratio);
      check('The edge box is wholly off the stage, with a gap', edge.left + edge.width < 0, { edge });
      colourIs(shot, 2 * ratio, y, CHROME_CULLED_REACH, CHROME_LEVELS, 'The shadow of a box wholly off the window still reaches in, as Chrome draws it');
    }
    if (entry.name === 'gradients') {
      const toRight = boxOf(cellOf(entry.name, 2), ratio);
      const y = (toRight.y0 + toRight.y1) / 2;
      colourIs(shot, toRight.x0 + 1, y, INDIGO_500, NEAR_LEVELS, 'bg-gradient-to-r starts on from-indigo-500');
      colourIs(shot, toRight.x1 - 2, y, PINK_500, NEAR_LEVELS, 'and ends on to-pink-500');
      const corner = boxOf(cellOf(entry.name, 3), ratio);
      const topRight = pixel(shot, corner.x1 - 2, corner.y0 + 1);
      const bottomLeft = pixel(shot, corner.x0 + 1, corner.y1 - 2);
      check(`to-br: the corners it does not head for are on the 50 % line: ${describe(topRight)}, ${describe(bottomLeft)}`, apart(topRight, bottomLeft) <= 6 + 6 * ratio, { topRight, bottomLeft });
    }
  }
  await demo('showLab', 'hud');
  await settle();
}
