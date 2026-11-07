// The `live-compile` section in real Chrome (docs/tracks/live-compile.md): the checker and compiler extension as a Web side module, the
// compiled lab, the swap that keeps state, and the failures that leave the last good page up, all run in the page by the same code the native
// section runs (demo/src/verify-live-compile.ts, started through `globalThis.godotReactLiveCompile`). This script serves the export, opens
// it, checks that the export carries the extension and the project, runs the section, and fails on any browser error the section does not announce.
//
//   node scripts/verify-live-compile-web.mjs [--release]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { rejectUnknownArguments } from './arguments.mjs';
import { selectEngine } from './engine.mjs';
import { INSTALL_DIRECTORY, WEB_LIBRARY_NAME } from './live-compile-build.mjs';
import { passedLine, startVerificationServer, writeEvidence } from './web-verify.mjs';

rejectUnknownArguments(process.argv.slice(2), { flags: ['--release'] });
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
engine.requireFreshWebExport();
const exportDirectory = engine.artifactPath(`web-${engine.webMode()}`);
const executablePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = engine.artifactPath('web-live-compile-verification');
const STARTUP_TIMEOUT_MS = 240_000;
const SECTION_TIMEOUT_MS = 180_000;
const POLL_MS = 100;
/** The bytes of a file that identify it in the pack: its head and its tail, as the pack stores files whole. */
const SIGNATURE_BYTES = 4096;
/** What the section announces before it makes React report an error on purpose. */
const EXPECTED_ERROR = 'live-compile-test-render';
const EMSCRIPTEN_STARTUP_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';

const report = { executablePath, startedAt: new Date().toISOString(), assertions: [], captures: [], console: [], pageErrors: [], failedRequests: [], expectedDiagnostics: [], passed: false };
const fatalErrors = [];
let expectedErrorSeen = false;

function check(name, condition, detail) {
  report.assertions.push({ name, passed: Boolean(condition), detail });
  assert.ok(condition, `${name}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
}

/** The pack must carry the extension and the project this tree built: a stale pack would judge old code. */
function checkPack() {
  const pack = readFileSync(resolve(exportDirectory, 'index.pck'));
  for (const file of [resolve(INSTALL_DIRECTORY, 'bin', WEB_LIBRARY_NAME), resolve(root, 'demo/live-compile/project.json')]) {
    const bytes = readFileSync(file);
    const head = bytes.subarray(0, SIGNATURE_BYTES);
    const tail = bytes.subarray(Math.max(0, bytes.length - SIGNATURE_BYTES));
    check(`The pack carries ${file.slice(root.length + 1)} as it is now (${bytes.length} bytes)`, pack.includes(head) && pack.includes(tail),
      'run `node scripts/build-live-compile-web.mjs` and `node scripts/build-web.mjs --export-only` after a change to the extension or the project');
  }
  return pack.length;
}

await mkdir(output, { recursive: true });
const packBytes = checkPack();
const server = await startVerificationServer(engine);
let browser;
let page;
try {
  browser = await puppeteer.launch({
    executablePath, headless: true, timeout: SECTION_TIMEOUT_MS,
    args: ['--no-first-run', '--no-default-browser-check', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  page = await browser.newPage();
  page.setDefaultTimeout(SECTION_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(STARTUP_TIMEOUT_MS);
  await page.setViewport({ width: 1120, height: 800, deviceScaleFactor: 1 });
  let ready = false;
  let startupDiagnosticSeen = false;
  page.on('console', (message) => {
    const entry = { type: message.type(), text: message.text() };
    report.console.push(entry);
    if (entry.text.includes('GODOT_REACT_DEMO_READY')) ready = true;
    if (entry.text === EMSCRIPTEN_STARTUP_DIAGNOSTIC && !ready && !startupDiagnosticSeen) {
      startupDiagnosticSeen = true;
      report.expectedDiagnostics.push(entry);
      return;
    }
    const isError = message.type() === 'error' || /(?:^|\n)(?:ERROR:|SCRIPT ERROR:)|GODOT_REACT_(?:VERIFY|START)_FAILED|\[panic /.test(entry.text);
    if (!isError || message.location().url?.endsWith('/favicon.ico')) return;
    if (entry.text.includes(EXPECTED_ERROR) && !expectedErrorSeen) {
      expectedErrorSeen = true;
      report.expectedDiagnostics.push(entry);
      return;
    }
    fatalErrors.push(entry.text);
  });
  page.on('pageerror', (error) => { report.pageErrors.push(error.stack ?? error.message); fatalErrors.push(error.stack ?? error.message); });
  page.on('requestfailed', (request) => {
    const failure = { url: request.url(), error: request.failure()?.errorText };
    report.failedRequests.push(failure);
    // Chromium aborts index.pck's progress-stream wrapper once after the bytes arrive (verify-web.mjs).
    if (failure.url.endsWith('/favicon.ico') || (failure.url.endsWith('/index.pck') && failure.error === 'net::ERR_ABORTED' && !ready)) return;
    fatalErrors.push(JSON.stringify(failure));
  });
  const response = await page.goto(new URL('/', server.url).href, { waitUntil: 'domcontentloaded' });
  check('The document loaded', response?.ok(), { status: response?.status() });
  check('The browser is cross-origin isolated for WebAssembly threads', await page.evaluate(() => globalThis.crossOriginIsolated === true));
  const started = Date.now();
  while (!(await page.evaluate(() => typeof globalThis.godotReactLiveCompile === 'function'))) {
    assert.equal(fatalErrors.length, 0, `Browser errors during startup:\n${fatalErrors.join('\n')}`);
    assert.ok(Date.now() - started < STARTUP_TIMEOUT_MS, 'The demo did not start');
    await new Promise((resolveWait) => setTimeout(resolveWait, POLL_MS));
  }
  check('The demo started with the live-compile section', true);
  const timed = Date.now();
  await page.evaluate(() => globalThis.godotReactLiveCompile());
  report.sectionMs = Date.now() - timed;
  check('The section announced its expected render error and React reported it', expectedErrorSeen);
  assert.equal(fatalErrors.length, 0, `Browser errors:\n${fatalErrors.join('\n')}`);
  const facts = report.console.map((entry) => entry.text).find((text) => text.includes('GODOT_REACT_LIVE_COMPILE '));
  check('The section reported its measurements', facts !== undefined);
  report.facts = JSON.parse(facts.slice(facts.indexOf('{')));
  report.packBytes = packBytes;
  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error);
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  console.error('GODOT_REACT_WEB_VERIFY_FAILED', report.error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => browser.process()?.kill('SIGTERM'));
  await server.close();
  await writeEvidence(output, report);
}
const passed = process.exitCode ? undefined : passedLine('GODOT_REACT_WEB_LIVE_COMPILE_VERIFY_PASSED', report, output, { facts: report.facts, sectionMs: report.sectionMs, packBytes: report.packBytes });
if (passed !== undefined) console.log(passed);
