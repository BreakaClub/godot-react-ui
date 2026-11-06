// Phase F0: run the evidence probe (demo/src/probe.ts) in real Chrome against a Web export built with
// `pnpm build:web --probe`. Serve it on a port you have checked is free and point
// GODOT_REACT_WEB_URL at it, as for the other Web verifiers.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { selectEngine } from './engine.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = selectEngine().artifactPath('fabric-probe');
const url = process.env.GODOT_REACT_WEB_URL ?? 'http://127.0.0.1:8096';
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const STARTUP_TIMEOUT_MS = 180_000;
const PROBE_TIMEOUT_MS = 900_000;
const POLL_MS = 2_000;
const VIEWPORT = { width: 1120, height: 800, deviceScaleFactor: 1 };
// Emscripten 6.0.12 warns once during engine dynamic-library startup (see verify-web.mjs).
const STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';

// The probe deliberately passes a JS array to a typed `Array<Gd<T>>` parameter and records that godot-rust
// rejects it. Those engine log lines are part of the measurement, not failures.
const TYPED_ARRAY_REJECTION = /count_handles_typed|countHandlesTyped|Array<Gd<ReactUiProbeHandle>>|Class\(ReactUiProbeHandle\)|handle_fallible_call/;
const report = { url, startedAt: new Date().toISOString(), console: [], errors: [], expectedTypedArrayRejections: [], passed: false };
await mkdir(output, { recursive: true });
let browser;
try {
  browser = await puppeteer.launch({
    executablePath, headless: true, timeout: 15_000,
    args: ['--no-first-run', '--no-default-browser-check', '--mute-audio',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  report.browserVersion = await browser.version();
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(STARTUP_TIMEOUT_MS);
  await page.setViewport(VIEWPORT);
  let startupDiagnosticSeen = false;
  page.on('console', (message) => {
    const text = message.text();
    report.console.push({ type: message.type(), text });
    if (text.startsWith('GODOT_REACT_PROBE_')) console.log(text.slice(0, 400));
    if (text === STARTUP_DIAGNOSTIC && !startupDiagnosticSeen) { startupDiagnosticSeen = true; return; }
    if (TYPED_ARRAY_REJECTION.test(text)) { report.expectedTypedArrayRejections.push(text); return; }
    if (message.type() === 'error' && !message.location().url?.endsWith('/favicon.ico')) report.errors.push(text);
    else if (/(?:^|\n)(?:ERROR:|SCRIPT ERROR:)|GODOT_REACT_PROBE_FAILED|\[panic /.test(text)) report.errors.push(text);
  });
  page.on('pageerror', (error) => report.errors.push(error.stack ?? error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.ok(await page.evaluate(() => globalThis.crossOriginIsolated === true), 'The page must be cross-origin isolated for WebAssembly threads');
  await page.waitForFunction(() => typeof globalThis.godotReactDemo?.runProbe === 'function', { timeout: STARTUP_TIMEOUT_MS });
  report.hardwareConcurrency = await page.evaluate(() => navigator.hardwareConcurrency);
  await page.evaluate(() => {
    globalThis.__godotProbe = { state: 'running' };
    globalThis.godotReactDemo.runProbe().then(
      (result) => { globalThis.__godotProbe = { state: 'done', result }; },
      (error) => { globalThis.__godotProbe = { state: 'failed', error: String(error) }; },
    );
  });
  const deadline = Date.now() + PROBE_TIMEOUT_MS;
  let outcome;
  for (;;) {
    outcome = await page.evaluate(() => globalThis.__godotProbe);
    if (outcome.state !== 'running') break;
    assert.equal(report.errors.length, 0, `Browser errors during the probe:\n${report.errors.join('\n')}`);
    assert.ok(Date.now() < deadline, `The probe did not finish within ${PROBE_TIMEOUT_MS} ms`);
    await new Promise((resolveWait) => setTimeout(resolveWait, POLL_MS));
  }
  assert.equal(outcome.state, 'done', `The probe failed: ${outcome.error}`);
  assert.equal(report.errors.length, 0, `Browser errors during the probe:\n${report.errors.join('\n')}`);
  report.result = outcome.result;
  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
  console.error('GODOT_REACT_PROBE_WEB_FAILED', report.error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => browser.process()?.kill('SIGTERM'));
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'web.json'), JSON.stringify(report, null, 2) + '\n');
}
if (report.passed && !process.exitCode) console.log('GODOT_REACT_PROBE_WEB_PASSED', resolve(output, 'web.json'));
