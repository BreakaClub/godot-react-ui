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
import { requireLiveCompileWebModule, webLibraryNameOf, webLibraryOf, WEB_FIX } from './live-compile-build.mjs';
import { passedLine, startVerificationServer, writeEvidence } from './web-verify.mjs';

rejectUnknownArguments(process.argv.slice(2), { flags: ['--release'] });
const root = resolve(import.meta.dirname, '..');
const engine = selectEngine();
engine.requireFreshWebExport();
const exportDirectory = engine.artifactPath(`web-${engine.webMode()}`);
// The section needs the extension, which a Web export has only when a module stamped for its profile existed when it was made (docs/tracks/stock-web.md).
const WEB_LIBRARY_NAME = webLibraryNameOf(engine);
requireLiveCompileWebModule(engine, exportDirectory, engine.webMode());
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

/**
 * The export must carry the extension and the project this tree built: a stale export would judge old code. The Web side module is served
 * beside the page, as the UI extension's is; the project is in the pack, whole, so its head and tail identify it there.
 */
function checkExport() {
  const installed = readFileSync(webLibraryOf(engine));
  const exported = readFileSync(resolve(exportDirectory, WEB_LIBRARY_NAME));
  check(`The export serves ${WEB_LIBRARY_NAME} as it is now (${installed.length} bytes)`, installed.equals(exported),
    `run \`${WEB_FIX(engine)}\` and \`node scripts/build-web.mjs --export-only --engine=${engine.name}\` after a change to the extension`);
  const pack = readFileSync(resolve(exportDirectory, 'index.pck'));
  const project = readFileSync(resolve(root, 'demo/live-compile/project.json'));
  check(`The pack carries demo/live-compile/project.json as it is now (${project.length} bytes)`,
    pack.includes(project.subarray(0, SIGNATURE_BYTES)) && pack.includes(project.subarray(project.length - SIGNATURE_BYTES)),
    'run `node scripts/live-compile-project.mjs` and `node scripts/build-web.mjs --export-only`');
  return { packBytes: pack.length, sideModuleBytes: exported.length, projectBytes: project.length };
}

await mkdir(output, { recursive: true });
const exportSizes = checkExport();
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
  // The page's realm is the one GodotJS runs the demo's scripts in on the Web (the browser's own engine): what it offers, for the notes.
  report.realm = await page.evaluate(() => ({
    webAssembly: typeof WebAssembly, worker: typeof Worker, newFunction: new Function('a', 'return a + 1')(1), indirectEval: (0, eval)('1+2'),
  }));
  check('The Web realm has WebAssembly and allows new Function and eval', report.realm.webAssembly === 'object' && report.realm.newFunction === 2 && report.realm.indirectEval === 3, report.realm);
  const timed = Date.now();
  await page.evaluate(() => globalThis.godotReactLiveCompile());
  report.sectionMs = Date.now() - timed;
  check('The section announced its expected render error and React reported it', expectedErrorSeen);
  assert.equal(fatalErrors.length, 0, `Browser errors:\n${fatalErrors.join('\n')}`);
  const facts = report.console.map((entry) => entry.text).find((text) => text.includes('GODOT_REACT_LIVE_COMPILE '));
  check('The section reported its measurements', facts !== undefined);
  report.facts = JSON.parse(facts.slice(facts.indexOf('{')));
  report.exportSizes = exportSizes;
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
const passed = process.exitCode ? undefined : passedLine('GODOT_REACT_WEB_LIVE_COMPILE_VERIFY_PASSED', report, output, { facts: report.facts, realm: report.realm, sectionMs: report.sectionMs, exportSizes: report.exportSizes });
if (passed !== undefined) console.log(passed);
