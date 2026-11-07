// Chrome's rendering of the card scenarios in scenarios.json, headless through puppeteer-core, for the transform3d experiments
// (docs/tracks/transforms-3d-feasibility.md). Run from the worktree root:
//
//   node experiments/transform3d/chrome-reference.mjs [--out=artifacts/transform3d-spike/chrome] [--args=--disable-gpu]
//
// For each device pixel ratio (1 and 2) it writes
//   flat-dpr<N>.png        the card alone, untransformed, transparent background, cropped to the card (the "source pixels"
//                          the compositor experiment samples, so the comparison isolates the transform from the text rasteriser)
//   flat-page-dpr<N>.png   the card untransformed on the page background
//   <id>-dpr<N>.png        the full 640 x 400 page with the scenario's transform
// and reference.json: the matrix, the projected polygon, Chrome's own getBoundingClientRect() and a hit-test grid.
// Input is CDP only; no real OS input.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { cardMatrix, cssTransform, projectedPolygon } from './geometry.mjs';

const root = resolve(import.meta.dirname, '../..');
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const out = resolve(root, argument('out') ?? 'artifacts/transform3d-spike/chrome');
const extraArguments = argument('args') ? argument('args').split(',') : [];
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SETTLE_MS = 300;
const HIT_GRID_STEP = 8;

const spec = JSON.parse(await readFile(resolve(import.meta.dirname, 'scenarios.json'), 'utf8'));
const { card, viewport } = spec;

export const BACKGROUND = { left: '#2f5d8a', right: '#c9a24a', stripe: '#3b8f5a' };

function html(scenario, { flatOnly }) {
  const container = scenario?.perspective
    ? `perspective:${scenario.perspective}px;perspective-origin:${(scenario.origin ?? [0.5, 0.5]).map(f => `${f * 100}%`).join(' ')};`
    : '';
  const transform = scenario ? `transform:${cssTransform(scenario.transform)};${scenario.backface ? `backface-visibility:${scenario.backface};` : ''}` : '';
  const background = flatOnly ? '' : `
    <div style="position:absolute;left:0;top:0;width:${viewport[0] / 2}px;height:${viewport[1]}px;background:${BACKGROUND.left}"></div>
    <div style="position:absolute;left:${viewport[0] / 2}px;top:0;width:${viewport[0] / 2}px;height:${viewport[1]}px;background:${BACKGROUND.right}"></div>
    <div style="position:absolute;left:0;top:190px;width:${viewport[0]}px;height:20px;background:${BACKGROUND.stripe}"></div>`;
  return `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0}body{margin:0;background:transparent;overflow:hidden}</style>
${background}
<div id="stage" style="position:absolute;left:0;top:0;width:${viewport[0]}px;height:${viewport[1]}px;${container}">
  <div id="card" style="position:absolute;left:${card.left}px;top:${card.top}px;width:${card.width}px;height:${card.height}px;border:1px solid #ffffff;border-radius:16px;background:rgba(30,60,200,0.55);padding:20px;color:#ffffff;font-family:Arial;${transform}">
    <div style="font:700 28px/32px Arial">Perspective</div>
    <div style="font:400 14px/20px Arial;margin-top:8px">A 320 by 200 card: a one pixel border, rounded corners, text and a translucent fill.</div>
    <div style="margin-top:12px;height:8px;width:120px;background:#ffd24a"></div>
  </div>
</div>`;
}

const scenes = JSON.parse(await readFile(resolve(import.meta.dirname, 'scenes.json'), 'utf8'));

// The preserve-3d scenes (spike.gd scenario=p3d_*): faces are 2 px white bordered, translucent, with a 40 px white marker
// at the top left inside the border, so a mirrored or swapped face shows.
function sceneHtml(scene, { empty }) {
  const [px, py, pw, ph] = scene.parent.box;
  const face = f => `<div style="position:absolute;left:0;top:0;width:${scene.size[0]}px;height:${scene.size[1]}px;border:2px solid #fff;background:rgba(${f.colour.join(',')},${scene.alpha});transform:${cssTransform(f.transform) || 'none'}"><div style="width:40px;height:40px;background:#fff"></div></div>`;
  const content = empty ? '' : `<div id="stage" style="position:absolute;left:0;top:0;width:${viewport[0]}px;height:${viewport[1]}px;perspective:${scene.perspective}px">
    <div style="position:absolute;left:${px}px;top:${py}px;width:${pw}px;height:${ph}px;transform-style:preserve-3d;transform:${cssTransform(scene.parent.transform)}">${scene.faces.map(face).join('')}</div></div>`;
  return `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0}body{margin:0;overflow:hidden}</style>
<div style="position:absolute;left:0;top:0;width:${viewport[0] / 2}px;height:${viewport[1]}px;background:${BACKGROUND.left}"></div>
<div style="position:absolute;left:${viewport[0] / 2}px;top:0;width:${viewport[0] / 2}px;height:${viewport[1]}px;background:${BACKGROUND.right}"></div>
<div style="position:absolute;left:0;top:190px;width:${viewport[0]}px;height:20px;background:${BACKGROUND.stripe}"></div>${content}`;
}

await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio', ...extraArguments] });
const reference = { chrome: await browser.version(), arguments: extraArguments, viewport, card, scenarios: {} };
try {
  for (const scale of [1, 2]) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport[0], height: viewport[1], deviceScaleFactor: scale });
    const settle = () => new Promise(done => setTimeout(done, SETTLE_MS));

    await page.setContent(html(null, { flatOnly: true }));
    await settle();
    await page.screenshot({ path: resolve(out, `flat-dpr${scale}.png`), omitBackground: true, clip: { x: card.left, y: card.top, width: card.width, height: card.height } });
    await page.setContent(html(null, { flatOnly: false }));
    await settle();
    await page.screenshot({ path: resolve(out, `flat-page-dpr${scale}.png`) });

    for (const scenario of spec.scenarios) {
      await page.setContent(html(scenario, { flatOnly: false }));
      await settle();
      await page.screenshot({ path: resolve(out, `${scenario.id}-dpr${scale}.png`) });
      const measured = await page.evaluate(step => {
        const rect = document.getElementById('card').getBoundingClientRect();
        const hits = [];
        for (let y = step / 2; y < innerHeight; y += step) for (let x = step / 2; x < innerWidth; x += step) {
          if (document.elementFromPoint(x, y)?.closest('#card')) hits.push([x, y]);
        }
        return { rect: [rect.left, rect.top, rect.right, rect.bottom], hits };
      }, HIT_GRID_STEP);
      const matrix = cardMatrix(scenario, card, viewport);
      const entry = reference.scenarios[scenario.id] ??= { about: scenario.about, matrix, polygon: projectedPolygon(matrix, card.width, card.height), perDpr: {} };
      entry.perDpr[scale] = measured;
    }
    await page.close();
  }
  for (const scale of [1, 2]) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport[0], height: viewport[1], deviceScaleFactor: scale });
    await page.setContent(sceneHtml(scenes.cube, { empty: true }));
    await new Promise(done => setTimeout(done, SETTLE_MS));
    await page.screenshot({ path: resolve(out, `bg-dpr${scale}.png`) });
    for (const name of ['cube', 'cards']) {
      await page.setContent(sceneHtml(scenes[name], { empty: false }));
      await new Promise(done => setTimeout(done, SETTLE_MS));
      await page.screenshot({ path: resolve(out, `scene-${name}-dpr${scale}.png`) });
    }
    // A layer inside a layer, real 3D in both (spike.gd scenario=nest_both).
    const nested = scenes.nested;
    const box = e => `position:absolute;left:${e.box[0]}px;top:${e.box[1]}px;width:${e.box[2]}px;height:${e.box[3]}px;border:2px solid #fff;background:rgba(${e.colour.join(',')},${nested.alpha});transform:${cssTransform(e.transform)}`;
    await page.setContent(sceneHtml(scenes.cube, { empty: true }) + `<div style="${box(nested.outer)}"><div style="${box(nested.inner)}"><div style="width:40px;height:40px;background:#fff"></div></div><div style="width:40px;height:40px;background:#fff"></div></div>`);
    await new Promise(done => setTimeout(done, SETTLE_MS));
    await page.screenshot({ path: resolve(out, `scene-nested-dpr${scale}.png`) });
    // A transition's midpoint against the static state at the midpoint (docs: "transitions" row): the animation is paused at 50 %.
    const sc = spec.scenarios[0];
    await page.setContent(html(sc, { flatOnly: false }).replace('transform:perspective(800px) rotateY(35deg);', ''));
    await page.evaluate(() => {
      const animation = document.getElementById('card').animate([{ transform: 'perspective(800px) rotateY(0deg)' }, { transform: 'perspective(800px) rotateY(70deg)' }], { duration: 1000, fill: 'both' });
      animation.pause();
      animation.currentTime = 500;
    });
    await new Promise(done => setTimeout(done, SETTLE_MS));
    await page.screenshot({ path: resolve(out, `anim-p35-dpr${scale}.png`) });
    await page.close();
  }
  // The flat card at other raster scales, for the raster-scale experiment (spike.gd scenario=raster).
  for (const scale of [...spec.rasters, ...scenes.rasters_extra]) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport[0], height: viewport[1], deviceScaleFactor: scale });
    await page.setContent(html(null, { flatOnly: true }));
    await new Promise(done => setTimeout(done, SETTLE_MS));
    await page.screenshot({ path: resolve(out, `flat-r${scale}.png`), omitBackground: true, clip: { x: card.left, y: card.top, width: card.width, height: card.height } });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(resolve(out, 'reference.json'), JSON.stringify(reference));
console.log(`wrote ${out}: ${Object.keys(reference.scenarios).length} scenarios, ${reference.chrome}`);
