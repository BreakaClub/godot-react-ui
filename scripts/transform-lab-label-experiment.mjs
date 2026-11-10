// The label of the hit page's turned bar: the bar's box as Chrome draws it three ways, at a phone's
// device pixel ratio, to say which of them a reported screenshot of the library is. A flex column with its label as its only child (what the lab had: the library's
// `Button` is one) puts the label in the top left corner; a browser's own `<button>` centres its content, and so does a flex column told to.
//
//   node scripts/transform-lab-label-experiment.mjs --out=<file.json>   writes { variant: base64 PNG } of the bar's corner.
import puppeteer from 'puppeteer-core';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { rejectUnknownArguments } from './arguments.mjs';

rejectUnknownArguments(process.argv.slice(2), { prefixes: ['--out='] });

const font = (await readFile(`${homedir()}/Development/godot/thirdparty/fonts/Inter_Regular.woff2`)).toString('base64');
const bar = { left: 150, top: 130, width: 220, height: 56 };
const variants = {
  uncentred_flex_column_div: `<div class="b" style="display:flex;flex-direction:column"><span class="l">Turned bar</span></div>`,
  real_button_element: `<button class="b" style="border:0;font:inherit"><span class="l">Turned bar</span></button>`,
  centred_flex_div: `<div class="b" style="display:flex;flex-direction:column;align-items:center;justify-content:center"><span class="l">Turned bar</span></div>`,
};
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const shots = {};
for (const [name, markup] of Object.entries(variants)) {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await page.setContent(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><style>
@font-face{font-family:E;src:url(data:font/woff2;base64,${font}) format('woff2')}
*{box-sizing:border-box;margin:0}body{font-family:E;background:#f8fafc}
#stage{position:absolute;left:0;top:316px;width:520px;height:320px;background:#f8fafc}
.b{position:absolute;left:${bar.left}px;top:${bar.top}px;width:${bar.width}px;height:${bar.height}px;background:#4f46e5;border-radius:8px;transform:rotate(30deg)}
.l{font-size:14px;line-height:20px;color:white}
</style><div id=stage>${markup}</div>`);
  await new Promise(r => setTimeout(r, 300));
  const buf = await page.screenshot({ clip: { x: 130, y: 316 + 60, width: 220, height: 160 } });
  shots[name] = buf.toString('base64');
  await page.close();
}
await browser.close();
const out = process.argv.find(argument => argument.startsWith('--out='))?.slice('--out='.length);
if (out === undefined) throw new Error('--out=<file.json> is needed');
await writeFile(out, JSON.stringify(shots));
