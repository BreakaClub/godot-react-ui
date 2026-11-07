import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';

// Collects what the `navigator` section of the interaction verifier captured (`pnpm verify:interaction --only=navigator`) into
// `artifacts/lab-navigator/` and lays every capture out on contact sheets, with its name under it: one for the landscape window
// (1120 x 800), one for the portrait window (600 x 900) and one with both. The captures are read back from the viewport texture
// by the verifier; this script only copies them and lays them out, in headless Chrome (puppeteer-core, as the Web verifiers do).
rejectUnknownArguments(process.argv.slice(2));
const engine = selectEngine();
const WINDOWS = [
  { name: 'landscape', columns: 4, thumbnailWidth: 330 },
  { name: 'portrait', columns: 8, thumbnailWidth: 165 },
];
const CAPTURE_PREFIX = 'navigator-';
const SHEET_MARGIN = 24;
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = resolve(import.meta.dirname, '..', 'artifacts', 'lab-navigator', engine.name === 'breaka' ? '' : engine.name);
mkdirSync(output, { recursive: true });

/** The captures of one window, in the order the verifier made them. */
function capturesOf(window) {
  const directory = engine.artifactPath('native-interaction', window);
  const files = readdirSync(directory)
    .filter((name) => name.startsWith(CAPTURE_PREFIX) && name.endsWith('.png'))
    .map((name) => ({ name, path: resolve(directory, name), time: statSync(resolve(directory, name)).mtimeMs }))
    .sort((a, b) => a.time - b.time);
  if (files.length === 0) throw new Error(`${directory} has no ${CAPTURE_PREFIX}*.png: run \`pnpm verify:interaction --only=navigator\` first.`);
  return files;
}

function sectionHtml(window, files, targetDirectory) {
  mkdirSync(resolve(targetDirectory, window.name), { recursive: true });
  const cells = files.map((file) => {
    const copy = resolve(targetDirectory, window.name, file.name);
    copyFileSync(file.path, copy);
    return `<figure><img src="${pathToFileURL(copy).href}" width="${window.thumbnailWidth}"><figcaption>${file.name.slice(CAPTURE_PREFIX.length, -'.png'.length)}</figcaption></figure>`;
  });
  const width = window.columns * (window.thumbnailWidth + SHEET_MARGIN) + SHEET_MARGIN;
  return { width, html: `<section style="width:${width - 2 * SHEET_MARGIN}px"><h2>${window.name}</h2><div class="grid">${cells.join('')}</div></section>` };
}

const STYLE = `
  body { margin: 0; padding: ${SHEET_MARGIN}px; background: #f1f5f9; font: 13px system-ui, sans-serif; color: #334155; }
  h2 { margin: 0 0 12px; font-size: 18px; font-weight: 500; color: #0f172a; }
  section { margin-bottom: 32px; }
  .grid { display: flex; flex-wrap: wrap; gap: ${SHEET_MARGIN}px; }
  figure { margin: 0; }
  img { display: block; border: 1px solid #cbd5e1; background: white; }
  figcaption { margin-top: 4px; }
`;

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
try {
  const sections = WINDOWS.map((window) => ({ window, ...sectionHtml(window, capturesOf(window.name), output) }));
  const sheets = [
    ...sections.map((section) => ({ file: `contact-sheet-${section.window.name}.png`, sections: [section] })),
    { file: 'contact-sheet.png', sections },
  ];
  for (const sheet of sheets) {
    const width = Math.max(...sheet.sections.map((section) => section.width));
    const page = await browser.newPage();
    await page.setViewport({ width, height: 800 });
    const html = `<!doctype html><meta charset="utf-8"><style>${STYLE}</style>${sheet.sections.map((section) => section.html).join('')}`;
    const pagePath = resolve(output, '.contact-sheet.html');
    writeFileSync(pagePath, html);
    await page.goto(pathToFileURL(pagePath).href, { waitUntil: 'load' });
    await page.screenshot({ path: resolve(output, sheet.file), fullPage: true });
    await page.close();
    console.log(`Wrote ${resolve(output, sheet.file)}`);
  }
} finally {
  await browser.close();
}
