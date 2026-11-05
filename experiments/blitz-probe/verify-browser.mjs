import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const directory = resolve(import.meta.dirname, 'artifacts');
const DEADLINE_MS = 60_000;
const html = `<!doctype html><html><head><link rel="icon" href="data:,"></head><body>
<pre id="result">Running compiled Blitz transition probe…</pre>
<script>
globalThis.probeOutput = [];
globalThis.probeErrors = [];
var Module = {
  print(message) { probeOutput.push(message); console.log(message); document.getElementById('result').textContent = probeOutput.join('\\n'); },
  printErr(message) { probeErrors.push(message); console.error(message); },
  onExit(code) { globalThis.probeExitCode = code; },
  onAbort(reason) { globalThis.probeAbort = String(reason); }
};
</script><script src="/harness.js"></script></body></html>`;
const assets = new Map([
  ['/harness.js', ['harness.js', 'text/javascript']],
  ['/harness.wasm', ['harness.wasm', 'application/wasm']],
  ['/harness.data', ['harness.data', 'application/octet-stream']],
]);
const server = createServer(async (request, response) => {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Cache-Control', 'no-store');
  if (request.url === '/') {
    response.writeHead(200, {'Content-Type':'text/html'}).end(html);
    return;
  }
  const asset = assets.get(request.url);
  if (!asset) { response.writeHead(404).end(); return; }
  try {
    response.writeHead(200, {'Content-Type':asset[1]}).end(await readFile(resolve(directory, asset[0])));
  } catch (error) {
    response.destroy(error);
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const report = { url:`http://127.0.0.1:${address.port}`, console:[], errors:[], passed:false };
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:true, timeout:DEADLINE_MS,
  });
  report.browser = await browser.version();
  const page = await browser.newPage();
  page.on('console', message => report.console.push({type:message.type(), text:message.text()}));
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.goto(report.url, {waitUntil:'domcontentloaded', timeout:DEADLINE_MS});
  await page.waitForFunction(() => globalThis.probeExitCode !== undefined || globalThis.probeAbort !== undefined,
    {timeout:DEADLINE_MS});
  const state = await page.evaluate(() => ({
    isolated:crossOriginIsolated, exitCode:globalThis.probeExitCode, abort:globalThis.probeAbort,
    output:globalThis.probeOutput, errors:globalThis.probeErrors,
  }));
  report.state = state;
  assert.equal(state.isolated, true);
  assert.equal(state.exitCode, 0);
  assert.equal(state.abort, undefined);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(state.errors, []);
  const line = state.output.find(value => value.startsWith('BLITZ_TRANSITION_PROBE '));
  assert(line, 'Compiled Rust must print its probe observations');
  report.observations = JSON.parse(line.slice('BLITZ_TRANSITION_PROBE '.length));
  assert.deepEqual(report.observations, {
    numericMidpoint:80, reverseMidpoint:60, autoAtStart:120, removedAnimationCleared:true,
  });
  report.passed = true;
  console.log('BLITZ_BROWSER_PROBE_PASSED', JSON.stringify(report.observations));
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  await writeFile(resolve(directory, 'browser-report.json'), JSON.stringify(report, null, 2));
}
