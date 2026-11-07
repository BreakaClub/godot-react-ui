import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
import { injectBase } from './release-bundle.mjs';
import { servedAssetProblems } from './web-verify.mjs';

// Loads the site in headless Chrome (CDP only: no OS input, no focus), reports what the load cost and, unless `--timing-only`, checks that the page works
// (docs/tracks/web-load.md):
//
//   node scripts/check-site.mjs --url=https://react.breaka.club/                       one cold load (a fresh profile), then the checks
//   node scripts/check-site.mjs --url=... --profile=<dir>                              a profile kept between runs: the second run is a returning visitor
//   node scripts/check-site.mjs --url=... --throttle=<kilobits per second>:<round trip ms>   a slower line (CDP network emulation)
//   node scripts/check-site.mjs --url=... --accept-encoding=br                         what the browser says it accepts (CDP header override)
//   node scripts/check-site.mjs --url=... --files                                      also fetch every file of the release export through the site and compare bytes
//   node scripts/check-site.mjs --url=... --json=<file>                                write the measurements as JSON
//
// The page works when: the demo API appears, the lab navigator lists its labs and shows one without tripping its error boundary, Next shows another,
// the code panel opens, and the browser logs no error and fails no request.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
rejectUnknownArguments(process.argv.slice(2), { flags: ['--timing-only', '--files'], prefixes: ['--url=', '--profile=', '--throttle=', '--accept-encoding=', '--json='] });
const option = name => process.argv.find(argument => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
const url = option('url');
if (url === undefined || url === '') throw new Error('--url=<address of the page> is required');
const timingOnly = process.argv.includes('--timing-only');
const compareFiles = process.argv.includes('--files');
const profile = option('profile');
const acceptEncoding = option('accept-encoding');
const throttle = option('throttle');
const jsonFile = option('json');
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const READY_DEADLINE_MS = 240_000;
const POLL_MS = 100;
const ACTION_DEADLINE_MS = 20_000;
const VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 1 };
const BYTES_PER_KILOBIT = 125;
const BYTES_PER_MEBIBYTE = 1024 * 1024;
/** Logged by the engine's threaded startup on the main thread; every Web verifier treats it as expected. */
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous';

const browser = await puppeteer.launch({
  executablePath, headless: true, userDataDir: profile === undefined ? undefined : resolve(profile),
  args: ['--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader'],
});
const problems = [];
try {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  if (acceptEncoding !== undefined) await cdp.send('Network.setExtraHTTPHeaders', { headers: { 'Accept-Encoding': acceptEncoding } });
  if (throttle !== undefined) {
    const [kilobits, latency] = throttle.split(':').map(Number);
    if (!Number.isFinite(kilobits) || !Number.isFinite(latency)) throw new Error('--throttle= is <kilobits per second>:<round trip in ms>');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency, downloadThroughput: kilobits * BYTES_PER_KILOBIT, uploadThroughput: kilobits * BYTES_PER_KILOBIT });
  }

  const requests = new Map();
  const rows = [];
  const pathOf = address => address.replace(/^https?:\/\/[^/]+/u, '');
  cdp.on('Network.requestWillBeSent', event => {
    const previous = requests.get(event.requestId);
    if (previous !== undefined && event.redirectResponse !== undefined) {
      rows.push({ file: pathOf(previous.url), status: event.redirectResponse.status, wire: 0, encoding: '', source: event.redirectResponse.fromDiskCache ? 'cache' : 'network', seconds: event.timestamp - previous.start, start: previous.start, redirect: true });
    }
    requests.set(event.requestId, { url: event.request.url, start: previous?.start ?? event.timestamp });
  });
  cdp.on('Network.responseReceived', event => {
    const request = requests.get(event.requestId);
    if (request === undefined) return;
    // HTTP/1.1 servers capitalise header names and HTTP/2 ones do not.
    const headers = new Map(Object.entries(event.response.headers).map(([name, value]) => [name.toLowerCase(), value]));
    request.status = event.response.status;
    request.encoding = headers.get('content-encoding') ?? '';
    request.source = event.response.fromDiskCache ? 'cache' : event.response.fromServiceWorker ? 'worker' : 'network';
    request.cacheControl = headers.get('cache-control') ?? '';
  });
  cdp.on('Network.loadingFinished', event => {
    const request = requests.get(event.requestId);
    if (request === undefined) return;
    rows.push({ file: pathOf(request.url), status: request.status, wire: event.encodedDataLength, encoding: request.encoding, source: request.source ?? 'network', seconds: event.timestamp - request.start, start: request.start, cacheControl: request.cacheControl });
  });
  cdp.on('Network.loadingFailed', event => {
    const request = requests.get(event.requestId);
    if (request === undefined || event.canceled === true) return;
    problems.push(`request failed: ${pathOf(request.url)}: ${event.errorText}`);
  });
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes(EMSCRIPTEN_STARTUP_DIAGNOSTIC)) problems.push(`console error: ${message.text().slice(0, 300)}`);
  });
  page.on('pageerror', error => problems.push(`page error: ${error.message.slice(0, 300)}`));

  const started = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: READY_DEADLINE_MS });
  await page.waitForFunction(() => typeof globalThis.godotReactDemo === 'object', { timeout: READY_DEADLINE_MS, polling: POLL_MS });
  const readyMs = Date.now() - started;

  const demo = (name, ...args) => page.evaluate((method, parameters) => globalThis.godotReactDemo[method](...parameters), name, args);
  const find = testID => page.evaluate(id => globalThis.godotReactDemo.find(id), testID);
  const exists = async testID => Boolean(await find(testID).catch(() => null));
  const frames = () => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done)))));
  const waitUntil = async (what, predicate) => {
    const deadline = Date.now() + ACTION_DEADLINE_MS;
    while (!(await predicate())) {
      assert.ok(Date.now() < deadline, `timed out waiting for ${what}`);
      await new Promise(done => setTimeout(done, POLL_MS));
    }
  };
  const textOf = async testID => {
    const [data, entry] = await Promise.all([demo('snapshot'), find(testID)]);
    assert.ok(entry, `${testID} is absent`);
    const byId = new Map(data.nodes.map(node => [node.id, node]));
    const collect = node => node.text + node.children.map(id => collect(byId.get(id))).join('');
    return collect(entry);
  };
  const click = async testID => {
    const [entry, data, canvas] = await Promise.all([find(testID), demo('snapshot'), page.evaluate(() => {
      const { x, y, width, height } = document.querySelector('canvas').getBoundingClientRect();
      return { x, y, width, height };
    })]);
    assert.ok(entry && entry.rect.width > 0, `${testID} has no hit rectangle`);
    await page.mouse.move(canvas.x + (entry.rect.x + entry.rect.width / 2) * canvas.width / data.width, canvas.y + (entry.rect.y + entry.rect.height / 2) * canvas.height / data.height);
    await frames();
    await page.mouse.down();
    await frames();
    await page.mouse.up();
    await frames();
  };

  const checks = [];
  const check = (name, passed, detail) => { checks.push({ name, passed: Boolean(passed), detail }); if (!passed) problems.push(`check failed: ${name}${detail === undefined ? '' : ` ${JSON.stringify(detail)}`}`); };
  if (!timingOnly) {
    try {
      const labs = await demo('labs');
      check('the navigator lists labs', Array.isArray(labs) && labs.length > 0, { labs: labs?.length });
      await waitUntil('the navigator header', () => exists('lab-title'));
      const first = await textOf('lab-title');
      check('a lab is shown without tripping its error boundary', first !== '' && !(await exists('lab-error')), { title: first });
      await click('lab-next');
      await waitUntil('the next lab', async () => (await textOf('lab-title')) !== first);
      const second = await textOf('lab-title');
      check('Next shows another lab, also without an error', second !== first && !(await exists('lab-error')), { title: second });
      if (await exists('toggle-code')) {
        await click('toggle-code');
        await waitUntil('the code panel', () => exists('code-editor'));
        check('the code panel opens', true);
      } else {
        check('the code panel can be opened for this lab', false, { lab: second });
      }
    } catch (error) {
      problems.push(`page check: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (compareFiles) {
      const receipt = JSON.parse(readFileSync(resolve(root, 'artifacts/web-release/build-receipt.json'), 'utf8'));
      const document = await (await fetch(url)).text();
      const base = /<base href="([^"]+)">/u.exec(document)?.[1];
      check('the document names its release with a <base>', base !== undefined);
      if (base !== undefined) {
        const exported = readFileSync(resolve(root, 'artifacts/web-release/index.html'), 'utf8');
        check('the document is the export\'s page with that <base> and nothing else', document === injectBase(exported, base.split('/')[2] ?? ''));
        const files = receipt.files.filter(file => file.name !== 'index.html');
        const mismatches = await servedAssetProblems(new URL(base, url), files);
        check(`all ${files.length} other files of the release export are served byte for byte`, mismatches.length === 0, mismatches);
      }
    }
  }

  rows.sort((left, right) => left.start - right.start);
  const table = rows.map(row => ({
    file: row.file.slice(0, 52), status: row.status, source: row.source, encoding: row.encoding, wireMiB: +(row.wire / BYTES_PER_MEBIBYTE).toFixed(3), seconds: +row.seconds.toFixed(2),
  }));
  console.table(table);
  const network = rows.filter(row => row.source === 'network');
  const summary = {
    url, profile: profile === undefined ? 'fresh' : 'kept', throttle: throttle ?? 'none', acceptEncoding: acceptEncoding ?? 'browser default',
    readyMs, requests: rows.length, networkRequests: network.length, fromCache: rows.filter(row => row.source === 'cache').length,
    wireMiB: +(network.reduce((sum, row) => sum + row.wire, 0) / BYTES_PER_MEBIBYTE).toFixed(2), checks, problems,
  };
  console.log(JSON.stringify(summary));
  if (jsonFile !== undefined) {
    await mkdir(dirname(resolve(jsonFile)), { recursive: true });
    await writeFile(resolve(jsonFile), `${JSON.stringify({ ...summary, rows: table }, null, 2)}\n`);
  }
} finally {
  await browser.close();
}
if (problems.length > 0) {
  console.error(`check-site: ${problems.length} problems:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('check-site: passed');
