// The glass showcase (demo/src/glass-lab.tsx) as a plain HTML page with the CSS a browser developer would write, rendered
// by headless Chrome through Puppeteer, to compare against what the library draws.
//
//   node --import tsx scripts/glass-reference.mjs [--out=<dir>]
//       Renders each state to <dir>/chrome-<state>-<viewport>.png, in the windows the verifiers use: landscape (1120 x 800) and
//       portrait (600 x 900) at device pixel ratio 1, and at ratio 2 both as the native verifier has them (retina-landscape,
//       retina-portrait: content scale two, so 560 x 400 and 300 x 450 logical pixels) and as the Web verifier has them
//       (web-retina-landscape, web-retina-portrait: the logical size kept, the pixels doubled).
//   node --import tsx scripts/glass-reference.mjs --compare=<out.png> <label>=<image> ...
//       Puts the images side by side, each under its label, in one PNG.
//
// Input is Chrome's own (CDP hover and click in the headless browser); no real OS input is generated.
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
// tsx loads the TypeScript data module as CommonJS, whose named exports an ES module reads through the default.
import glassData from '../demo/src/glass-data.ts';

const {
  BASE_COLOUR, BLOBS, CARDS, GLASS_BAR_HEIGHT, GLASS_BAR_INSET, PAGE_PADDING, ROWS, SEARCH_PLACEHOLDER, STACK_DECOR, STACK_HEIGHT, TILES, blobRect, glassLayout,
} = glassData;

// Options start with `-`; the `<label>=<image>` pairs after `--compare=` do not.
rejectUnknownArguments(process.argv.slice(2).filter(value => value.startsWith('-')), { prefixes: ['--out=', '--compare='] });
const root = resolve(import.meta.dirname, '..');
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const VIEWPORTS = [
  ['landscape', 1120, 800, 1], ['portrait', 600, 900, 1], ['retina-landscape', 560, 400, 2], ['retina-portrait', 300, 450, 2],
  // The Web verifier's retina windows keep the logical size and double the pixels.
  ['web-retina-landscape', 1120, 800, 2], ['web-retina-portrait', 600, 900, 2],
];
const SETTLE_MS = 400;

// Tailwind's defaults for the utilities the lab uses (Tailwind v3): text sizes with their line heights, radii, blur steps.
const css = `
*, ::before, ::after { box-sizing: border-box; margin: 0; }
body { margin: 0; font-family: 'Open Sans', system-ui, sans-serif; color: white; }
.glass { border: 1px solid rgba(255,255,255,.3); background: rgba(255,255,255,.2); backdrop-filter: blur(24px) saturate(1.5); }
.col { display: flex; flex-direction: column; }
.row { display: flex; flex-direction: row; }
.text-xs { font-size: 12px; line-height: 16px; } .text-sm { font-size: 14px; line-height: 20px; }
.text-base { font-size: 16px; line-height: 24px; } .text-lg { font-size: 18px; line-height: 28px; }
.text-xl { font-size: 20px; line-height: 28px; } .text-3xl { font-size: 30px; line-height: 36px; }
.w80 { color: rgba(255,255,255,.8); }
#search { width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,.3); background: rgba(0,0,0,.2); padding: 12px 16px; color: white; font: inherit; font-size: 16px; line-height: 24px; caret-color: white; outline: none; }
#search::placeholder { color: rgba(255,255,255,.8); }
#search::selection { background: rgba(59,130,246,.35); }
.pill { border-radius: 9999px; border: 1px solid rgba(255,255,255,.3); background: rgba(255,255,255,.2); padding: 8px 20px; color: white; font: inherit; cursor: pointer; }
.pill:hover { background: rgba(255,255,255,.4); }
`;

function html({ width, height }) {
  const layout = glassLayout(width);
  const blobs = BLOBS.map(blob => {
    const { left, top, size } = blobRect(blob, width, height);
    return `<div style="position:absolute;left:${left}px;top:${top}px;width:${size}px;height:${size}px;border-radius:9999px;background:${blob.colour};filter:blur(64px)"></div>`;
  }).join('');
  const tiles = TILES.map(tile => `<div data-tile class="col" style="height:112px;width:112px;justify-content:flex-end;border-radius:16px;padding:12px;background:${tile.colour}"><span class="text-sm">${tile.name}</span></div>`).join('');
  const cards = CARDS.map((card, index) => `
    <div class="glass col" style="width:${layout.cardWidth}px;gap:12px;border-radius:24px;padding:20px">
      <div style="height:40px;width:40px;border-radius:9999px;background:${card.icon}"></div>
      <span class="text-xl">${card.title}</span>
      <span class="text-sm w80">${card.body}</span>
      <button id="card-button-${index}" onclick="document.getElementById('overlay').style.display='flex'" class="pill text-sm" style="margin-top:8px;align-self:flex-start">Add to playlist</button>
    </div>`).join('');
  const decor = STACK_DECOR.map(shape => `<div style="position:absolute;left:${shape.left}px;top:${shape.top}px;width:${shape.size}px;height:${shape.size}px;border-radius:9999px;background:${shape.colour}"></div>`).join('');
  const rows = ROWS.map(row => `
    <div class="row" style="align-items:center;gap:12px">
      <div style="height:40px;width:40px;border-radius:9999px;background:${row.colour}"></div>
      <div class="col"><span class="text-base">${row.name}</span><span class="text-sm w80">${row.detail}</span></div>
    </div>`).join('');
  const nav = layout.wide ? '<div class="row" style="gap:32px"><span class="text-sm">Discover</span><span class="text-sm w80">Library</span><span class="text-sm w80">Radio</span></div>' : '';
  return `<!doctype html><meta charset="utf-8"><style>${css}</style>
<div id="root" style="position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${BASE_COLOUR}">
  <div style="position:absolute;inset:0;overflow:hidden">${blobs}</div>
  <div id="scroll" style="position:absolute;inset:0;overflow-y:auto;scrollbar-width:none">
    <div class="col" style="gap:24px;padding:80px ${PAGE_PADDING}px 40px">
      <div class="col" style="gap:4px"><span class="text-3xl">Good evening, Maya</span><span class="text-base w80">Fresh mixes tuned to your week.</span></div>
      <div class="row" style="flex-wrap:wrap;gap:12px">${tiles}</div>
      <div class="row" style="flex-wrap:wrap;gap:16px">${cards}</div>
      <div style="position:relative;height:${STACK_HEIGHT}px">
        ${decor}
        <div class="glass col" style="position:absolute;left:0;top:0;height:176px;width:75%;gap:8px;border-radius:24px;padding:20px">
          <span class="text-xl">Weekend mixes</span><span class="text-sm w80">Twelve playlists that follow your pace, from a slow start to a long evening.</span>
        </div>
        <div class="col" style="position:absolute;right:0;bottom:0;height:112px;width:66.6667%;gap:4px;border-radius:24px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.2);padding:16px;backdrop-filter:blur(40px) saturate(1.5)">
          <span class="text-sm w80">Now playing</span><span class="text-lg">Glasshouse</span>
        </div>
      </div>
      <div class="glass col" style="gap:12px;border-radius:24px;padding:20px">
        <span class="text-xl">Find a mix</span>
        <input id="search" placeholder="${SEARCH_PLACEHOLDER}">
      </div>
      <div class="col" style="gap:12px">${rows}</div>
    </div>
  </div>
  <div id="bar" class="glass row" style="position:fixed;left:${GLASS_BAR_INSET}px;right:${GLASS_BAR_INSET}px;top:${GLASS_BAR_INSET}px;z-index:20;height:${GLASS_BAR_HEIGHT}px;align-items:center;justify-content:space-between;border-radius:16px;padding:0 16px">
    <div class="row" style="align-items:center;gap:12px"><div style="height:24px;width:24px;border-radius:9999px;background:white"></div><span class="text-lg">Aurora</span></div>
    ${nav}
    <button id="signin" onclick="document.getElementById('overlay').style.display='flex'" class="pill text-sm" style="padding:8px 16px;background:rgba(255,255,255,.25)">Sign in</button>
  </div>
  <!-- The markup of the lab as written: the sheet inside the scrim. Chrome draws this one flat (see the sibling version below). -->
  <div id="overlay-nested" style="display:none;position:fixed;inset:0;z-index:50;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.3);backdrop-filter:blur(4px)">
    <div class="col" style="width:100%;max-width:448px;gap:16px;border-radius:24px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.2);padding:24px;backdrop-filter:blur(40px) saturate(1.5)">
      <span class="text-xl">Add to playlist</span>
      <span class="text-sm w80">Night drive will be saved to Weekend mixes and shared with the people you listen with.</span>
    </div>
  </div>
  <div id="overlay" style="display:none;position:fixed;inset:0;z-index:50;align-items:center;justify-content:center;padding:24px">
    <!-- The scrim and the sheet are siblings: in Chrome a backdrop-filter inside another one sees only that element's content
         (it is a backdrop root), so the sheet inside the scrim would not frost the page. The library has no such rule. -->
    <div style="position:absolute;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(4px)"></div>
    <div class="col" style="position:relative;width:100%;max-width:448px;gap:16px;border-radius:24px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.2);padding:24px;backdrop-filter:blur(40px) saturate(1.5)">
      <span class="text-xl">Add to playlist</span>
      <span class="text-sm w80">Night drive will be saved to Weekend mixes and shared with the people you listen with.</span>
      <div class="row" style="justify-content:flex-end;gap:12px">
        <button class="pill text-sm" onclick="document.getElementById('overlay').style.display='none'">Cancel</button>
        <button class="text-sm" style="border-radius:9999px;border:0;background:#6366f1;padding:8px 20px;color:white;font:inherit">Add</button>
      </div>
    </div>
  </div>
</div>`;
}

async function render(outDirectory) {
  await mkdir(outDirectory, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
  try {
    for (const [name, width, height, scale] of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: scale });
      await page.setContent(html({ width, height }));
      const shoot = async state => {
        await new Promise(done => setTimeout(done, SETTLE_MS));
        await page.screenshot({ path: resolve(outDirectory, `chrome-${state}-${name}.png`) });
      };
      await shoot('page');
      // The tile row is centred under the bar, as the native verifier does.
      await page.evaluate(() => {
        const tile = document.querySelector('[data-tile]').getBoundingClientRect();
        const bar = document.getElementById('bar').getBoundingClientRect();
        document.getElementById('scroll').scrollTop = Math.round(tile.top + tile.height / 2 - (bar.top + bar.height / 2));
      });
      await shoot('scrolled');
      await page.evaluate(() => { document.getElementById('scroll').scrollTop = 0; });
      await page.evaluate(() => document.getElementById('card-button-0').scrollIntoView({ block: 'nearest' }));
      await page.hover('#card-button-0');
      await shoot('hover');
      await page.evaluate(() => { document.getElementById('scroll').scrollTop = 0; });
      await page.mouse.move(0, 0);
      await page.click('#signin');
      await shoot('sheet');
      await page.evaluate(() => { document.getElementById('overlay').style.display = 'none'; document.getElementById('overlay-nested').style.display = 'flex'; });
      await shoot('sheet-nested');
      // The field on the glass card: its placeholder was in every shot above; now typed into, then selected.
      await page.evaluate(() => { document.getElementById('overlay-nested').style.display = 'none'; });
      await page.evaluate(() => {
        const field = document.getElementById('search').getBoundingClientRect();
        const bar = document.getElementById('bar').getBoundingClientRect();
        const scroller = document.getElementById('scroll');
        scroller.scrollTop += Math.round(field.top - (bar.bottom + 16));
      });
      await page.click('#search');
      await page.keyboard.type('Night drive');
      await shoot('input');
      // Select all by the field's own method: headless Chrome on macOS does not take Command+A from the keyboard here.
      await page.evaluate(() => document.getElementById('search').select());
      await shoot('input-selected');
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function compare(output, entries) {
  await mkdir(dirname(output), { recursive: true });
  const { readFile } = await import('node:fs/promises');
  const figures = [];
  for (const entry of entries) {
    const [label, path] = [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)];
    figures.push(`<figure><img src="data:image/png;base64,${(await readFile(path)).toString('base64')}"><figcaption>${label}</figcaption></figure>`);
  }
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run'] });
  try {
    const page = await browser.newPage();
    // Each picture is shown at the width of the first, so a 2x capture and a 1x capture line up.
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
if (compareOutput !== undefined) await compare(resolve(compareOutput), process.argv.filter(value => !value.startsWith('-') && value.includes('=')));
else await render(resolve(argument('out') ?? resolve(root, 'artifacts/glass-reference')));
