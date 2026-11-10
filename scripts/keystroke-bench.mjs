// The editor's per-keystroke data work (demo/src/editor/keystroke-bench.ts) in Node and in headless Chrome, without a window or React:
// the CodeMirror transaction, the lezer parse and the colour spans for the lines the view draws. The same
// function runs inside the Godot V8 through `godotReactKeystrokeProfile.bench`, so the three can be compared.
//
//   node scripts/keystroke-bench.mjs [--site=attribute|function] [--keystrokes=1000] [--warmup=400] [--first=84] [--last=124] [--out=<directory>]
//
// Chrome runs headless through puppeteer-core with its own CDP; the page is served with the headers that make `performance.now()` precise
// (5 microseconds instead of 100). No real input is generated.
import { build } from 'esbuild';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';

rejectUnknownArguments(process.argv.slice(2), { prefixes: ['--site=', '--keystrokes=', '--warmup=', '--first=', '--last=', '--out='] });

const root = resolve(import.meta.dirname, '..');
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function option(name, fallback) {
  const found = process.argv.find(argument => argument.startsWith(`--${name}=`));
  return found === undefined ? fallback : found.slice(name.length + 3);
}

const siteName = option('site', 'attribute');
const keystrokes = Number(option('keystrokes', 1000));
const warmup = Number(option('warmup', 400));
const firstLine = Number(option('first', 84));
const lastLine = Number(option('last', 124));
const output = resolve(root, option('out', 'artifacts/keystroke-bench'));
mkdirSync(output, { recursive: true });

const bundled = await build({
  absWorkingDir: root, entryPoints: ['scripts/keystroke-bench/entry.ts'], bundle: true, write: false, platform: 'browser', format: 'iife',
  globalName: 'KeystrokeBench', target: 'es2022', define: { 'process.env.NODE_ENV': '"production"' },
});
const code = bundled.outputFiles[0].text;
const source = readFileSync(resolve(root, 'demo/src/inputs-lab.tsx'), 'utf8');
// Node: the same bundle, evaluated here.
const nodeBench = new Function('performance', `${code}; return KeystrokeBench;`)(performance);
const site = nodeBench.TYPING_SITES.find(candidate => candidate.name === siteName);
if (site === undefined) throw new Error(`No typing site called ${siteName}`);
const options = { source, needle: site.needle, offset: site.offset, firstLine, lastLine, keystrokes, warmup };

const results = {};
results.node = { version: process.version, summary: nodeBench.bench(options) };

// Chrome.
const server = createServer((request, response) => {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><title>keystroke bench</title>');
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check', '--mute-audio'] });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.addScriptTag({ content: code });
  const isolated = await page.evaluate(() => crossOriginIsolated);
  const session = await browser.target().createCDPSession();
  const { jsVersion, product } = await session.send('Browser.getVersion');
  const version = `${product}, V8 ${jsVersion}`;
  results.chrome = { version, crossOriginIsolated: isolated, summary: await page.evaluate(chromeOptions => KeystrokeBench.bench(chromeOptions), options) };
} finally {
  await browser.close();
  server.close();
}
writeFileSync(resolve(output, `bench-${siteName}.json`), JSON.stringify({ options: { ...options, source: undefined }, results }, null, 2));
const rows = Object.keys(results.node.summary);
console.log(`| piece (ms per keystroke, median / mean) | Node ${results.node.version} | ${results.chrome.version} |`);
console.log('| --- | ---: | ---: |');
for (const name of rows) {
  const cell = environment => `${results[environment].summary[name].median.toFixed(3)} / ${results[environment].summary[name].mean.toFixed(3)}`;
  console.log(`| ${name} | ${cell('node')} | ${cell('chrome')} |`);
}
