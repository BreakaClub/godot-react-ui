import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { argsWithoutEngine, selectEngine } from './engine.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// `--baseline` records the pre-Fabric benchmark scenarios (Phase F0) and never touches the motion evidence.
// `--acceptance` reruns the same scenarios on the Fabric renderer and checks Phase F4's criteria
// (docs/INTERACTION_PLAN.md); it writes to its own directory so the F0 evidence stays intact.
const engine = selectEngine();
const baseline = process.argv.includes('--baseline');
const acceptance = process.argv.includes('--acceptance');
if (baseline && acceptance) throw new Error('Choose one scenario mode: --baseline or --acceptance.');
const scenarioMode = baseline || acceptance;
const output = engine.artifactPath(baseline ? 'fabric-baseline' : acceptance ? 'fabric-acceptance' : 'motion-web-verification');
const packBuffer = await readFile(engine.artifactPath('web-debug', 'index.pck'));
const expectedPack = {
  bytes: packBuffer.byteLength,
  sha256: createHash('sha256').update(packBuffer).digest('hex'),
};
const url = process.env.GODOT_REACT_WEB_URL ?? 'http://127.0.0.1:8096';
const STARTUP_MS = 180_000;
const ACTION_MS = 15_000;
const TOTAL_MS = 600_000;
const POLL_MS = 20;
const IDLE_SAMPLE_MS = 1000;
const WARMUP_UPDATES = 3;
const DETACHED_OBSERVATION_MS = 200;
const MOTION_BASE_FONT_SIZE = 14;
const MOTION_LARGE_FONT_SIZE = 18;
const PAINT_START_HEIGHT_FRACTION = 0.7;
const OPENING_CAPTURE_MIN_RATIO = 0.5;
const OPENING_CAPTURE_MAX_RATIO = 0.85;
const CLOSING_CAPTURE_MIN_RATIO = 0.35;
const CLOSING_CAPTURE_MAX_RATIO = 0.7;
const PAINT_DIMMED_OPACITY = 0.45;
const PAINT_CAPTURE_MAX_OPACITY = 0.8;
const GEOMETRY_EPSILON = 2;
const MIN_ANIMATION_SAMPLES = 3;
const VIEWPORT = { width: 1120, height: 800 };
const RESIZED_VIEWPORT = { width: 600, height: 900 };
const BENCHMARK_VIEWPORT = { width: 1120, height: 800 };
const EXPECTED_DIAGNOSTIC = 'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread';
// Baseline cell counts, one-cell colour change repetitions, sweep length and breakpoint crossings (F0 task 4).
const BASELINE_COUNTS = [50, 2000];
const BASELINE_HOVER_CELLS = 200;
const BASELINE_RESIZE_PAIRS = 10;
const BASELINE_NARROW_VIEWPORT = { width: 700, height: 800 };
const BASELINE_DRAIN_EVERY = 25;
const quick = process.argv.includes('--quick');
for (const argument of argsWithoutEngine(process.argv.slice(2))) assert.ok(['--quick', '--baseline', '--acceptance'].includes(argument), `Unknown argument ${argument}`);
const repetitions = Number(process.env.MOTION_BENCH_REPETITIONS ?? (quick ? 3 : 30));
assert.ok(Number.isSafeInteger(repetitions) && repetitions > 0, 'MOTION_BENCH_REPETITIONS must be a positive integer');
const counts = process.env.MOTION_BENCH_COUNTS
  ? process.env.MOTION_BENCH_COUNTS.split(',').map(Number)
  : scenarioMode ? BASELINE_COUNTS : quick ? [50] : [50, 500, 2000];
assert.ok(counts.every((count) => Number.isSafeInteger(count) && count > 0), 'MOTION_BENCH_COUNTS must contain positive integers');

const report = {
  url, startedAt: new Date().toISOString(), passed: false,
  configuration: { quick, baseline, acceptance, repetitions, counts, devicePixelRatios: scenarioMode ? [1] : [1, 2] },
  measurementNotes: [
    'Synthetic fixtures update every keyed cell; offscreen cells remain laid out and are not virtualized.',
    'Native draw timings measure CPU shaping and draw-command submission, not GPU execution or display scanout.',
    'Input/render-request latency ends at the RAF following an observed native draw serial change; it is not physical display latency.',
    'Semantic motion traces sample full snapshots and therefore add observer overhead. Timed benchmarks use compact activity only.',
    'Reconcile windows and native-call windows include nested stages. Their distributions must not be added together.',
    'Heap values are Chrome main-isolate observations without forced GC; a difference alone does not establish a leak.',
    'Animation start/completion uses native activity.animating (Stylo or owned intrinsic animation); transition records are diagnostic samples, not engine activity proof.',
  ],
  assertions: [], captures: [], motion: [], benchmarks: [], idle: [], console: [], expectedDiagnostics: [], errors: [],
};
let browser;
let page;
let scope = 'startup';
await mkdir(output, { recursive: true });

function check(name, condition, detail) {
  report.assertions.push({ scope, name, passed: Boolean(condition), detail });
  assert.ok(condition, `${scope}: ${name}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
}
function healthy() { assert.equal(report.errors.length, 0, report.errors.join('\n')); }
async function deadline(promise, duration, label) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded ${duration} ms`)), duration);
    })]);
  } finally { clearTimeout(timer); }
}
async function until(label, predicate, duration = ACTION_MS) {
  const end = Date.now() + duration;
  while (!(await predicate())) {
    healthy();
    assert.ok(Date.now() < end, `Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  healthy();
}
async function paintFrames() {
  await deadline(page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })), ACTION_MS, 'Browser animation frame');
}
const snapshot = () => page.evaluate(() => globalThis.godotReactDemo.snapshot());
const activity = () => page.evaluate(() => globalThis.godotReactDemo.activity());
async function find(id, required = true) {
  const value = await page.evaluate((testID) => globalThis.godotReactDemo.find(testID), id);
  if (required) assert.ok(value, `Missing test target ${id}`);
  return value;
}
async function text(id) {
  const [data, entry] = await Promise.all([snapshot(), find(id)]);
  const nodes = new Map(data.nodes.map((node) => [node.id, node]));
  function collect(node) {
    assert.ok(node, 'Missing snapshot text node');
    return node.text + node.children.map((child) => collect(nodes.get(child))).join('');
  }
  return collect(entry);
}
async function point(id) {
  const [entry, data, canvas] = await Promise.all([
    find(id), snapshot(), page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('Godot canvas is absent');
      const rect = canvas.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  ]);
  assert.ok(entry.rect.width > 0 && entry.rect.height > 0, `${id} is hidden`);
  const position = {
    x: canvas.x + (entry.rect.x + entry.rect.width / 2) * canvas.width / data.width,
    y: canvas.y + (entry.rect.y + entry.rect.height / 2) * canvas.height / data.height,
  };
  const viewport = page.viewport();
  assert.ok(viewport && position.x >= 0 && position.y >= 0 && position.x < viewport.width && position.y < viewport.height,
    `${id} lies outside the browser viewport: ${JSON.stringify(position)}`);
  return position;
}
async function click(id) {
  let position = await point(id);
  await page.mouse.move(position.x, position.y);
  await paintFrames();
  position = await point(id);
  await page.mouse.move(position.x, position.y);
  await page.mouse.down();
  await paintFrames();
  position = await point(id);
  await page.mouse.move(position.x, position.y);
  await page.mouse.up();
  await paintFrames();
  healthy();
}
async function settled() {
  await until('native transitions to settle', async () => (await activity()).animating === false);
  await paintFrames();
}
async function active() {
  await until('native transition to begin', async () => (await activity()).animating === true);
}
async function size(viewport, dpr) {
  await page.setViewport({ ...viewport, deviceScaleFactor: dpr });
  await paintFrames();
  await until('CSS-sized logical viewport', async () => {
    const [data, canvas] = await Promise.all([
      snapshot(),
      page.evaluate(() => {
        const node = document.querySelector('canvas');
        return node ? { width: node.width, height: node.height, dpr: devicePixelRatio } : null;
      }),
    ]);
    return Boolean(
      canvas &&
      canvas.dpr === dpr &&
      canvas.width === viewport.width * dpr &&
      canvas.height === viewport.height * dpr &&
      data.width === viewport.width &&
      data.height === viewport.height,
    );
  });
  const pixels = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('Godot canvas is absent');
    const rect = canvas.getBoundingClientRect();
    return { cssWidth: rect.width, cssHeight: rect.height, width: canvas.width, height: canvas.height, dpr: devicePixelRatio };
  });
  check('Logical units remain CSS pixels with full-resolution backing storage',
    pixels.cssWidth === viewport.width && pixels.cssHeight === viewport.height && pixels.dpr === dpr &&
    pixels.width === viewport.width * dpr && pixels.height === viewport.height * dpr, pixels);
}

function distribution(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return { samples: 0 };
  const quantile = (fraction) => {
    const index = (sorted.length - 1) * fraction;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };
  return { samples: sorted.length, min: sorted[0], p50: quantile(0.5), p95: quantile(0.95), p99: quantile(0.99), max: sorted.at(-1) };
}
function profileSummary(profile) {
  const result = {};
  for (const side of ['js', 'native']) {
    assert.ok(profile[side] && Array.isArray(profile[side].samples), `Missing ${side} profile samples`);
    check(`${side} profiling buffer retains every sample`, profile[side].dropped === 0, { dropped: profile[side].dropped });
    const groups = {};
    for (const sample of profile[side].samples) {
      assert.equal(typeof sample.kind, 'string', `${side} sample needs a kind`);
      for (const [field, value] of Object.entries(sample)) {
        if (typeof value !== 'number' || !/(?:Ms|Micros)$/.test(field) || /^(?:start|clock|timestamp)|^atMs$|AtMs$/.test(field)) continue;
        assert.ok(Number.isFinite(value) && value >= 0, `${side}.${sample.kind}.${field} is invalid`);
        const key = `${sample.kind}.${field}`;
        (groups[key] ??= []).push(value);
      }
    }
    result[side] = Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, distribution(values)]));
  }
  return result;
}
function traceSummary(trace) {
  return {
    observerMode: trace.semantic ? 'full snapshot semantic sampling' : 'compact activity sampling',
    frameIntervalsMs: distribution(trace.frames.map((frame) => frame.intervalMs).filter((value) => value !== null)),
    inputToObservedDrawRafMs: distribution(trace.requests.filter((request) => request.kind === 'input').map((request) => request.latencyMs)),
    renderRequestToObservedDrawRafMs: distribution(trace.requests.filter((request) => request.kind === 'render').map((request) => request.latencyMs)),
    requestsWithoutObservedDraw: trace.requests.filter((request) => request.latencyMs === null).length,
    dropped: trace.dropped,
  };
}

async function installProbe() {
  await page.evaluate(() => {
    const SAMPLE_CAP = 8192;
    let trace = null;
    let raf = null;
    const api = () => globalThis.godotReactDemo;
    function request(kind, label) {
      if (!trace) return;
      trace.requests.push({ kind, label, atMs: performance.now(), drawSerial: api().activity().drawSerial, observedAtMs: null, latencyMs: null });
    }
    function tick(now) {
      if (!trace) return;
      const current = api().activity();
      const previous = trace.frames.at(-1);
      const frame = { atMs: now, intervalMs: previous ? now - previous.atMs : null, ...current };
      if (trace.semantic) {
        const data = api().snapshot();
        frame.transitions = data.transitions;
        frame.nodes = data.nodes.filter((node) => trace.ids.includes(node.id));
      }
      if (trace.frames.length < SAMPLE_CAP) trace.frames.push(frame);
      else trace.dropped += 1;
      for (const entry of trace.requests) {
        if (entry.latencyMs !== null) continue;
        if (entry.observedAtMs !== null) entry.latencyMs = now - entry.atMs;
        else if (current.drawSerial > entry.drawSerial) entry.observedAtMs = now;
      }
      raf = requestAnimationFrame(tick);
    }
    const onPointerUp = () => request('input', 'pointerup');
    const onKeyDown = (event) => request('input', `keydown:${event.key}`);
    addEventListener('pointerup', onPointerUp, true);
    addEventListener('keydown', onKeyDown, true);
    globalThis.__godotMotionProbe = {
      start(semantic, ids) {
        if (trace) throw new Error('A motion trace is already running');
        trace = { semantic, ids, frames: [], requests: [], dropped: 0 };
        raf = requestAnimationFrame(tick);
      },
      request,
      stop() {
        if (!trace) throw new Error('No motion trace is running');
        cancelAnimationFrame(raf);
        const result = trace;
        trace = null;
        raf = null;
        return result;
      },
      dispose() {
        if (raf !== null) cancelAnimationFrame(raf);
        trace = null;
        removeEventListener('pointerup', onPointerUp, true);
        removeEventListener('keydown', onKeyDown, true);
      },
    };
  });
}

async function beginTrace(ids = [], semantic = true) {
  await page.evaluate(({ ids, semantic }) => {
    globalThis.godotReactDemo.profile(true);
    globalThis.godotReactDemo.takeProfile();
    globalThis.__godotMotionProbe.start(semantic, ids);
  }, { ids, semantic });
}
async function endTrace(name) {
  await paintFrames();
  const evidence = await page.evaluate(() => {
    const trace = globalThis.__godotMotionProbe.stop();
    const profile = globalThis.godotReactDemo.takeProfile();
    globalThis.godotReactDemo.profile(false);
    return { trace, profile };
  });
  check('Browser trace buffer retains every frame', evidence.trace.dropped === 0);
  const result = { name, ...evidence, summary: { ...traceSummary(evidence.trace), stages: profileSummary(evidence.profile) } };
  const path = resolve(output, scope, `${name}-trace.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(result, null, 2) + '\n');
  report.motion.push({ scope, name, path, summary: result.summary });
  return result;
}
async function capture(name) {
  const directory = resolve(output, scope);
  await mkdir(directory, { recursive: true });
  const before = await snapshot();
  const canvas = await page.$('canvas');
  assert.ok(canvas, 'Godot canvas vanished');
  const png = resolve(directory, `${name}.png`);
  await canvas.screenshot({ path: png, timeout: ACTION_MS });
  await canvas.dispose();
  const after = await snapshot();
  const json = resolve(directory, `${name}.json`);
  await writeFile(json, JSON.stringify({ before, after }, null, 2) + '\n');
  report.captures.push({ scope, name, png, json });
  console.log(`GODOT_REACT_MOTION_CAPTURE ${png}`);
  const app = await find('app');
  check('Motion composition fits the intended logical viewport',
    app.rect.x >= -GEOMETRY_EPSILON && app.rect.y >= -GEOMETRY_EPSILON &&
    app.rect.x + app.rect.width <= after.width + GEOMETRY_EPSILON &&
    app.rect.y + app.rect.height <= after.height + GEOMETRY_EPSILON,
  { app: app.rect, viewport: { width: after.width, height: after.height } });
}
function nodeIn(frame, id) { return frame.nodes?.find((node) => node.id === id); }
function heightTransition(frame, id) {
  return frame.transitions?.find((transition) => transition.id === id && transition.property === 'height');
}
function assertAnimatedFlow(result, panelID, siblingID, { flatBatches = true, direction } = {}) {
  const frames = result.trace.frames.filter((frame) => frame.animating === true && heightTransition(frame, panelID));
  const heights = frames.map((frame) => nodeIn(frame, panelID)?.rect.height).filter(Number.isFinite);
  check('Intrinsic height changes across multiple rendered frames', new Set(heights.map((height) => Math.round(height))).size >= MIN_ANIMATION_SAMPLES,
    { frames: frames.length, heights: distribution(heights) });
  const gaps = frames.map((frame) => {
    const panel = nodeIn(frame, panelID);
    const sibling = nodeIn(frame, siblingID);
    assert.ok(panel && sibling, 'Motion trace lost layout nodes');
    return sibling.rect.y - (panel.rect.y + panel.rect.height);
  });
  check('Following sibling tracks the current animated height',
    gaps.length > 0 && Math.max(...gaps) - Math.min(...gaps) <= GEOMETRY_EPSILON && Math.min(...gaps) >= -GEOMETRY_EPSILON,
  { gap: distribution(gaps) });
  check('Animated overflow clips intrinsic content to the current presentation rectangle', frames.every((frame) => {
    const panel = nodeIn(frame, panelID);
    const content = panel && nodeIn(frame, panel.children[0]);
    const clip = content?.clipRect;
    return panel && content && clip !== null && clip !== undefined &&
      clip.x >= panel.rect.x - GEOMETRY_EPSILON && clip.y >= panel.rect.y - GEOMETRY_EPSILON &&
      clip.x + clip.width <= panel.rect.x + panel.rect.width + GEOMETRY_EPSILON &&
      clip.y + clip.height <= panel.rect.y + panel.rect.height + GEOMETRY_EPSILON;
  }));
  check('At least one frame presents partially clipped intrinsic content', frames.some((frame) => {
    const panel = nodeIn(frame, panelID);
    const content = panel && nodeIn(frame, panel.children[0]);
    return content?.clipRect && content.clipRect.height > 0 &&
      content.clipRect.height < content.rect.height - GEOMETRY_EPSILON;
  }));
  if (direction) {
    const sign = direction === 'opening' ? 1 : -1;
    check(`Uninterrupted ${direction} is monotonic`, heights.every((height, index) =>
      index === 0 || (height - heights[index - 1]) * sign >= -GEOMETRY_EPSILON));
  }
  if (flatBatches) {
    check('Native animation frames submit no JavaScript mutation batches',
      frames.length >= MIN_ANIMATION_SAMPLES && frames.every((frame) => frame.batches === frames[0].batches),
    { frames: frames.length, batches: [...new Set(frames.map((frame) => frame.batches))] });
  }
}

async function inFlightHeight(panelID, contentID, direction = 'opening') {
  const minRatio = direction === 'closing' ? CLOSING_CAPTURE_MIN_RATIO : OPENING_CAPTURE_MIN_RATIO;
  const maxRatio = direction === 'closing' ? CLOSING_CAPTURE_MAX_RATIO : OPENING_CAPTURE_MAX_RATIO;
  await until(`${direction} visual mid-flight height`, async () => {
    const data = await snapshot();
    const panel = data.nodes.find((node) => node.id === panelID);
    const content = data.nodes.find((node) => node.id === contentID);
    return panel && content && content.rect.height > 0 &&
      panel.rect.height >= content.rect.height * minRatio &&
      panel.rect.height <= content.rect.height * maxRatio;
  });
}

async function runMotion(dpr) {
  scope = `motion-dpr${dpr}`;
  await size(VIEWPORT, dpr);
  await page.evaluate(() => globalThis.godotReactDemo.restoreDemo());
  await paintFrames();
  await click('tab-motion');
  await settled();
  const panelID = (await find('motion-clip')).id;
  const siblingID = (await find('motion-following-sibling')).id;
  const contentID = (await find('motion-content')).id;
  const ids = [panelID, siblingID, contentID];
  check('Accordion starts collapsed', Math.abs((await find('motion-clip')).rect.height) <= GEOMETRY_EPSILON);
  await capture('01-collapsed');

  await beginTrace(ids);
  await click('motion-toggle');
  await active();
  await inFlightHeight(panelID, contentID, 'opening');
  await capture('02-opening');
  await settled();
  const opened = await find('motion-clip');
  check('Expanded endpoint remains intrinsic auto height', opened.style.height === 'auto' && opened.rect.height > 0);
  assertAnimatedFlow(await endTrace('open-auto'), panelID, siblingID, { direction: 'opening' });
  await capture('03-open');
  await click('motion-inside-action');
  check('Visible clipped content receives input', await text('motion-inside-count') === 'Activated 1 time');

  const hiddenActionPoint = await point('motion-inside-action');
  await beginTrace(ids);
  await click('motion-toggle');
  await active();
  await inFlightHeight(panelID, contentID, 'closing');
  await capture('04-closing');
  await settled();
  assertAnimatedFlow(await endTrace('collapse-zero'), panelID, siblingID, { direction: 'closing' });
  check('Collapsed endpoint reaches zero', Math.abs((await find('motion-clip')).rect.height) <= GEOMETRY_EPSILON);
  await page.mouse.click(hiddenActionPoint.x, hiddenActionPoint.y);
  await paintFrames();
  check('Clipped-out content cannot activate', await text('motion-inside-count') === 'Activated 1 time');

  const unchangedCopy = await text('motion-body');
  await beginTrace(ids);
  await click('motion-toggle');
  await active();
  const baseFontTarget = (await snapshot()).transitions.find((transition) => transition.id === panelID && transition.property === 'height')?.target;
  await click('motion-font-toggle');
  await active();
  const largeFontTarget = (await snapshot()).transitions.find((transition) => transition.id === panelID && transition.property === 'height')?.target;
  check('Font-only change retains the same shaped copy', await text('motion-body') === unchangedCopy);
  check('Font-only change reaches the requested font size', (await find('motion-body')).style.fontSize === MOTION_LARGE_FONT_SIZE);
  check('Font-only change retargets an active intrinsic endpoint',
    Number.isFinite(baseFontTarget) && Number.isFinite(largeFontTarget) && largeFontTarget > baseFontTarget,
  { baseFontTarget, largeFontTarget });
  await inFlightHeight(panelID, contentID, 'opening');
  await capture('04a-font-retarget');
  await settled();
  const fontEndpoint = (await find('motion-clip')).rect.height;
  check('Font retarget completes at its newly measured endpoint', Math.abs(fontEndpoint - largeFontTarget) <= GEOMETRY_EPSILON,
    { fontEndpoint, largeFontTarget });
  assertAnimatedFlow(await endTrace('font-only-retarget'), panelID, siblingID, { flatBatches: false });
  await click('motion-toggle');
  await settled();
  await click('motion-font-toggle');
  await settled();
  check('Base font size is restored before content retarget tests', (await find('motion-body')).style.fontSize === MOTION_BASE_FONT_SIZE);

  await beginTrace(ids);
  await click('motion-toggle');
  await active();
  await inFlightHeight(panelID, contentID, 'opening');
  await page.evaluate(() => globalThis.godotReactDemo.surfaceAttached(false));
  const pausedActivity = await activity();
  const pausedPanel = await find('motion-clip');
  const pausedTarget = (await snapshot()).transitions.find((transition) => transition.id === panelID && transition.property === 'height')?.target;
  check('Same native surface retains its active transition when detached', pausedActivity.animating === true && pausedPanel.id === panelID);
  await new Promise((resolve) => setTimeout(resolve, DETACHED_OBSERVATION_MS));
  const stillPaused = await activity();
  check('Native animation clock is frozen while the surface is outside the scene tree', stillPaused.clockMs === pausedActivity.clockMs,
    { observationMs: DETACHED_OBSERVATION_MS, before: pausedActivity.clockMs, after: stillPaused.clockMs });
  check('Detached surface submits no animation frames, draws or mutation batches',
    stillPaused.animationFrames === pausedActivity.animationFrames && stillPaused.drawSerial === pausedActivity.drawSerial &&
    stillPaused.batches === pausedActivity.batches,
  { before: pausedActivity, after: stillPaused });
  check('Detached presentation remains at its paused height', (await find('motion-clip')).rect.height === pausedPanel.rect.height);
  await page.evaluate(() => globalThis.godotReactDemo.surfaceAttached(true));
  check('Reattachment preserves native identity and resumes the existing transition',
    (await find('motion-clip')).id === panelID && (await activity()).animating === true);
  await capture('04b-reattached-in-flight');
  await settled();
  check('Reattached surface reaches its intrinsic auto endpoint',
    (await find('motion-clip')).style.height === 'auto' && Number.isFinite(pausedTarget) &&
    Math.abs((await find('motion-clip')).rect.height - pausedTarget) <= GEOMETRY_EPSILON,
  { pausedTarget, resumedHeight: (await find('motion-clip')).rect.height });
  check('Reattachment advances the native clock again', (await activity()).clockMs > pausedActivity.clockMs);
  check('Detaching the native surface preserves React component state', await text('motion-inside-count') === 'Activated 1 time');
  assertAnimatedFlow(await endTrace('same-surface-detach-reattach'), panelID, siblingID, { flatBatches: false, direction: 'opening' });
  await click('motion-toggle');
  await settled();

  await beginTrace(ids);
  await click('motion-toggle');
  await active();
  const originalTarget = (await snapshot()).transitions.find((transition) => transition.id === panelID && transition.property === 'height')?.target;
  await click('motion-copy-toggle');
  await active();
  const changedTarget = (await snapshot()).transitions.find((transition) => transition.id === panelID && transition.property === 'height')?.target;
  check('Content change retargets intrinsic height during flight', Number.isFinite(originalTarget) && Number.isFinite(changedTarget) && changedTarget > originalTarget,
    { originalTarget, changedTarget });
  await click('motion-width-toggle');
  await active();
  await inFlightHeight(panelID, contentID, 'opening');
  await capture('05-content-width-retarget');
  await settled();
  assertAnimatedFlow(await endTrace('content-width-retarget'), panelID, siblingID, { flatBatches: false });
  const narrowHeight = (await find('motion-clip')).rect.height;
  check('Retargeted endpoint remains auto', (await find('motion-clip')).style.height === 'auto');

  await click('motion-toggle');
  await settled();
  await beginTrace(ids);
  await click('motion-toggle');
  await active();
  await size(RESIZED_VIEWPORT, dpr);
  await settled();
  const resizedHeight = (await find('motion-clip')).rect.height;
  check('Viewport resize remeasures intrinsic content', resizedHeight > narrowHeight,
    { narrowHeight, resizedHeight });
  assertAnimatedFlow(await endTrace('viewport-retarget'), panelID, siblingID, { flatBatches: false });
  await capture('06-resized-open');
  await click('motion-toggle');
  await settled();
  await click('motion-toggle');
  await settled();
  check('Retargeting matches a fresh auto endpoint at the same width',
    Math.abs((await find('motion-clip')).rect.height - resizedHeight) <= GEOMETRY_EPSILON);
  await size(VIEWPORT, dpr);
  await settled();

  await click('motion-toggle');
  await settled();
  await beginTrace(ids);
  await click('motion-toggle');
  await active();
  await until('opening progress before reversal', async () => (await find('motion-clip')).rect.height > 0);
  const beforeReverse = (await find('motion-clip')).rect.height;
  await click('motion-toggle');
  await active();
  await click('motion-toggle');
  await active();
  await click('motion-toggle');
  await settled();
  const reverse = await endTrace('rapid-reversal');
  check('Rapid reversals begin before the first endpoint', beforeReverse > 0 && beforeReverse < resizedHeight);
  check('Rapid reversal finishes at the latest requested zero endpoint', (await find('motion-clip')).rect.height <= GEOMETRY_EPSILON);
  assertAnimatedFlow(reverse, panelID, siblingID, { flatBatches: false });
  await capture('07-reversed-closed');

  const swatchID = (await find('motion-paint-swatch')).id;
  // Keep the intrinsic-height and independent paint owners on deliberately
  // different timelines. Completion of the height must restore Taffy's auto
  // value even though Stylo still has a live color/opacity transition elsewhere.
  await click('motion-copy-toggle');
  await click('motion-width-toggle');
  await settled();
  check('Independent completion starts with short copy, full width and the base font',
    await text('motion-copy-toggle') === 'Longer copy' &&
    await text('motion-width-toggle') === 'Narrow width' &&
    (await find('motion-body')).style.fontSize === MOTION_BASE_FONT_SIZE);
  async function observeIndependentOwners() {
    return page.evaluate(({ panelID, contentID, swatchID }) => {
      const data = globalThis.godotReactDemo.snapshot();
      return {
        panel: data.nodes.find((node) => node.id === panelID),
        content: data.nodes.find((node) => node.id === contentID),
        swatch: data.nodes.find((node) => node.id === swatchID),
        transitions: data.transitions,
        activity: globalThis.godotReactDemo.activity(),
      };
    }, { panelID, contentID, swatchID });
  }
  function paintIsIntermediate(observation) {
    const opacity = observation.swatch.presentation.opacity;
    return observation.activity.animating === true && opacity > PAINT_DIMMED_OPACITY && opacity < 1;
  }
  async function assertIndependentAuto(stage) {
    const observation = await observeIndependentOwners();
    check(`${stage}: unrelated paint is still in flight`, paintIsIntermediate(observation),
      { animating: observation.activity.animating, opacity: observation.swatch.presentation.opacity });
    check(`${stage}: completed intrinsic height remains actual auto`, observation.panel.presentation.heightIsAuto === true);
    check(`${stage}: auto immediately follows its newly measured content`,
      Math.abs(observation.panel.rect.height - observation.content.rect.height) <= GEOMETRY_EPSILON,
    { panelHeight: observation.panel.rect.height, contentHeight: observation.content.rect.height });
    check(`${stage}: no new height transition is created`,
      !observation.transitions.some((transition) => transition.id === panelID && transition.property === 'height'));
  }
  await beginTrace([...ids, swatchID]);
  await click('motion-toggle');
  await active();
  await until('height reaches the paint-overlap trigger', async () => {
    const observation = await observeIndependentOwners();
    const height = observation.transitions.find((transition) => transition.id === panelID && transition.property === 'height');
    return height && typeof height.target === 'number' && height.target > 0 &&
      observation.panel.rect.height / height.target >= PAINT_START_HEIGHT_FRACTION;
  });
  await click('motion-paint-toggle');
  await until('height restores auto while independent paint continues', async () => {
    const observation = await observeIndependentOwners();
    return observation.panel.presentation.heightIsAuto === true && paintIsIntermediate(observation);
  });
  await assertIndependentAuto('Height completion');
  await click('motion-copy-toggle');
  await assertIndependentAuto('Copy change after height completion');
  await click('motion-font-toggle');
  await assertIndependentAuto('Font change after height completion');
  await capture('07a-independent-height-completion');
  await settled();
  assertAnimatedFlow(await endTrace('independent-intrinsic-completion'), panelID, siblingID, { flatBatches: false });
  // Restore all affected controls through their real React handlers before the
  // existing isolated paint-only gate measures unchanged layout counters.
  await click('motion-toggle');
  await settled();
  await click('motion-copy-toggle');
  await click('motion-font-toggle');
  await click('motion-paint-toggle');
  await settled();
  check('Independent completion restores the original paint/copy/font baseline',
    (await find('motion-clip')).rect.height <= GEOMETRY_EPSILON &&
    await text('motion-copy-toggle') === 'Longer copy' &&
    (await find('motion-body')).style.fontSize === MOTION_BASE_FONT_SIZE &&
    (await find('motion-paint-swatch')).presentation.opacity === 1);

  const swatchRect = (await find('motion-paint-swatch')).rect;
  const beforePaint = await activity();
  await beginTrace([swatchID]);
  await click('motion-paint-toggle');
  await active();
  await until('paint visual mid-flight blend', async () => {
    const swatch = await find('motion-paint-swatch');
    return swatch.presentation.opacity > PAINT_DIMMED_OPACITY &&
      swatch.presentation.opacity <= PAINT_CAPTURE_MAX_OPACITY;
  });
  await capture('08-paint-in-flight');
  await settled();
  const painted = await endTrace('paint-only');
  const activePaintFrames = painted.trace.frames.filter((frame) => frame.animating === true);
  check('Paint transitions advance without layout', (await activity()).layoutPasses === beforePaint.layoutPasses);
  check('Paint transition preserves its layout rectangle', JSON.stringify((await find('motion-paint-swatch')).rect) === JSON.stringify(swatchRect));
  check('Paint animation submits no per-frame JS mutation batches',
    activePaintFrames.length >= MIN_ANIMATION_SAMPLES && activePaintFrames.every((frame) => frame.batches === activePaintFrames[0].batches));

  await click('motion-toggle');
  await active();
  await click('motion-mount-toggle');
  await until('animated subtree removal', async () => !await find('motion-clip', false));
  check('Unmount cancels native transitions', (await activity()).animating === false);
  await capture('09-unmounted');
  await click('motion-mount-toggle');
  await settled();
  check('Remount uses a new native owner', (await find('motion-clip')).id !== panelID);
  check('Remount resets child React state', await text('motion-inside-count') === 'Activated 0 times');
  await capture('10-remounted');
  console.log(`GODOT_REACT_MOTION_CASE_PASSED ${scope}`);
}

async function heap() {
  const metrics = await page.metrics();
  return { usedBytes: metrics.JSHeapUsedSize ?? null, totalBytes: metrics.JSHeapTotalSize ?? null };
}
async function renderBenchmark(configuration) {
  const baseline = await page.evaluate((configuration) => {
    const before = globalThis.godotReactDemo.activity().drawSerial;
    globalThis.__godotMotionProbe.request('render', 'benchmark');
    globalThis.godotReactDemo.benchmark(configuration);
    return before;
  }, configuration);
  await until('benchmark native draw submission', async () => (await activity()).drawSerial > baseline);
  await paintFrames();
}
async function runBenchmarks(dpr) {
  scope = `benchmarks-dpr${dpr}`;
  await size(BENCHMARK_VIEWPORT, dpr);
  await page.evaluate(() => globalThis.__godotMotionProbe.start(false, []));
  await new Promise((resolve) => setTimeout(resolve, IDLE_SAMPLE_MS));
  const idle = await page.evaluate(() => globalThis.__godotMotionProbe.stop());
  report.idle.push({ scope, ...traceSummary(idle) });
  for (const count of counts) {
    for (const text of [false, true]) {
      for (const mode of text ? ['paint', 'layout', 'text'] : ['paint', 'layout']) {
        const name = `${count}-${text ? 'text' : 'boxes'}-${mode}`;
        console.log(`GODOT_REACT_BENCHMARK_START ${scope}/${name}`);
        for (let phase = 0; phase < WARMUP_UPDATES; phase++) await renderBenchmark({ count, text, mode, phase });
        const beforeHeap = await heap();
        const before = await activity();
        await beginTrace([], false);
        for (let index = 0; index < repetitions; index++) {
          await renderBenchmark({ count, text, mode, phase: WARMUP_UPDATES + index });
        }
        const after = await activity();
        const afterHeap = await heap();
        const evidence = await page.evaluate(() => {
          const trace = globalThis.__godotMotionProbe.stop();
          const profile = globalThis.godotReactDemo.takeProfile();
          globalThis.godotReactDemo.profile(false);
          return { trace, profile };
        });
        const stages = profileSummary(evidence.profile);
        const flushes = evidence.profile.js.samples.filter((sample) => sample.kind === 'flush' && sample.commandCount > 0);
        check(`${name} measures every real React update`, flushes.length >= repetitions, { flushes: flushes.length, repetitions });
        check(`${name} preserves native node count`, after.nodeCount === before.nodeCount, { before: before.nodeCount, after: after.nodeCount });
        if (mode === 'paint') check(`${name} avoids layout for paint-only updates`, after.layoutPasses === before.layoutPasses);
        else check(`${name} executes native layout for content/size changes`, after.layoutPasses > before.layoutPasses);
        for (const sample of flushes) {
          for (const key of ['walkMs', 'jsonEncodeMs', 'nativeCallMs', 'fullFlushMs']) {
            assert.ok(Number.isFinite(sample[key]) && sample[key] >= 0, `Missing measured JS stage ${key}`);
          }
        }
        const data = await snapshot();
        const grid = await find('bench-grid');
        check(`${name} mounts the requested number of keyed cells`, grid.children.length === count);
        const visibleNodes = data.nodes.filter((node) => node.rect.width > 0 && node.rect.height > 0 &&
          node.rect.y < data.height && node.rect.y + node.rect.height > 0).length;
        const result = {
          name, scope, count, text, mode, repetitions, before, after, beforeHeap, afterHeap,
          visibleNodes, totalNodes: data.stats.nodeCount,
          summary: { ...traceSummary(evidence.trace), stages }, ...evidence,
        };
        const path = resolve(output, scope, `${name}.json`);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, JSON.stringify(result, null, 2) + '\n');
        report.benchmarks.push({ scope, name, count, text, mode, repetitions, path, beforeHeap, afterHeap, visibleNodes,
          totalNodes: data.stats.nodeCount, summary: result.summary });
        console.log(`GODOT_REACT_BENCHMARK_PASSED ${scope}/${name} ${JSON.stringify(result.summary.frameIntervalsMs)}`);
      }
    }
  }
  await page.evaluate(() => globalThis.godotReactDemo.restoreDemo());
  await paintFrames();
}


/** Profiles drained in slices: both ring buffers hold 512 samples, fewer than a sweep produces. */
function newProfileCollector() {
  const collected = { js: { samples: [], dropped: 0 }, native: { samples: [], dropped: 0 } };
  return {
    collected,
    async drain() {
      const profile = await page.evaluate(() => globalThis.godotReactDemo.takeProfile());
      for (const side of ['js', 'native']) {
        collected[side].samples.push(...profile[side].samples);
        collected[side].dropped += profile[side].dropped;
      }
    },
  };
}
async function baselineScenario(name, count, drive, gridChildren = count) {
  console.log(`GODOT_REACT_BASELINE_START ${scope}/${name}`);
  await page.evaluate(() => { globalThis.godotBenchmarkCounters.commits = 0; });
  const collector = newProfileCollector();
  const before = await activity();
  await beginTrace([], false);
  await drive(collector.drain);
  await paintFrames();
  await collector.drain();
  const after = await activity();
  const evidence = await page.evaluate(() => {
    const trace = globalThis.__godotMotionProbe.stop();
    globalThis.godotReactDemo.profile(false);
    return { trace, reactCommits: globalThis.godotBenchmarkCounters.commits };
  });
  const stages = profileSummary(collector.collected);
  const grid = await find('bench-grid');
  check(`${name}: the fixture still has its ${count} cells (${gridChildren} children under the grid)`, grid.children.length === gridChildren);
  const counts = {
    reactCommits: evidence.reactCommits,
    jsFlushSamples: collector.collected.js.samples.filter((sample) => sample.kind === 'flush').length,
    jsFlushSamplesWithCommands: collector.collected.js.samples.filter((sample) => sample.kind === 'flush' && sample.commandCount > 0).length,
    jsEventsSamples: collector.collected.js.samples.filter((sample) => sample.kind === 'events').length,
    jsReconcileSamples: collector.collected.js.samples.filter((sample) => sample.kind === 'reconcile').length,
    nativeBatchSamples: collector.collected.native.samples.filter((sample) => sample.kind === 'batch').length,
    nativeDrawSamples: collector.collected.native.samples.filter((sample) => sample.kind === 'draw').length,
    nativeBatches: after.batches - before.batches,
    layoutPasses: after.layoutPasses - before.layoutPasses,
    paintPasses: after.paintPasses - before.paintPasses,
    mutations: after.mutations - before.mutations,
    nodesUpdated: after.nodesUpdated - before.nodesUpdated,
    nodesRestyled: after.nodesRestyled - before.nodesRestyled,
    boxRecords: after.boxRecords - before.boxRecords,
    contentRecords: after.contentRecords - before.contentRecords,
  };
  // Per-commit figures from the raw samples. A React update is one `reconcile` window containing one
  // `flush` (the commit walk, the JSON encode and the native call); the renderer-owned JS cost of a
  // commit is the window minus the native call.
  const flushes = collector.collected.js.samples.filter((sample) => sample.kind === 'flush' && sample.commandCount > 0);
  const reconciles = collector.collected.js.samples.filter((sample) => sample.kind === 'reconcile');
  const jsCommitMs = reconciles.length === flushes.length
    ? reconciles.map((sample, index) => sample.durationMs - flushes[index].nativeCallMs) : [];
  const derived = {
    jsCommitMs: distribution(jsCommitMs),
    jsWalkMs: distribution(flushes.map((sample) => sample.walkMs)),
    nativeCommitMicros: distribution(collector.collected.native.samples.filter((sample) => sample.kind === 'batch').map((sample) => sample.totalMicros)),
    payloadChars: distribution(flushes.map((sample) => sample.jsonChars)),
    payloadEntries: distribution(flushes.map((sample) => sample.commandCount)),
    visitedNodes: distribution(flushes.map((sample) => sample.visitedNodes)),
  };
  const result = { name, scope, count, nodes: after.nodeCount, counts, derived, stages, summary: traceSummary(evidence.trace) };
  const path = resolve(output, scope, `${name}.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(result, null, 2) + '\n');
  report.benchmarks.push({ scope, name, count, path, counts, derived, stages });
  const median = (side, key) => stages[side][key]?.p50;
  console.log(`GODOT_REACT_BASELINE_PASSED ${scope}/${name} ${JSON.stringify({
    counts, reconcileP50Ms: median('js', 'reconcile.durationMs'), flushP50Ms: median('js', 'flush.fullFlushMs'),
    eventsP50Ms: median('js', 'events.durationMs'), batchP50Micros: median('native', 'batch.totalMicros'),
    drawP50Micros: median('native', 'draw.cpuMicros'),
  })}`);
  return result;
}
/** Cell centres in canvas CSS pixels, from one snapshot (cell geometry does not change during a sweep). */
async function cellPositions(count) {
  const [data, grid, canvas] = await Promise.all([
    snapshot(), find('bench-grid'),
    page.evaluate(() => {
      const rect = document.querySelector('canvas').getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  ]);
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  return grid.children.slice(0, count).map((id) => {
    const rect = byId.get(id).rect;
    return {
      x: canvas.x + (rect.x + rect.width / 2) * canvas.width / data.width,
      y: canvas.y + (rect.y + rect.height / 2) * canvas.height / data.height,
    };
  });
}
/** Appendix A: the allowed growth of a one-node change from 50 to 2,000 nodes. */
const MAX_SCALE_RATIO = 2;
/** The F0 baseline's median React reconcile time for updating every cell of the 2,000-cell fixture (docs/INTERACTION_PROGRESS.md, Phase F0). */
const F0_EVERY_CELL_2000_RECONCILE_P50_MS = 41.30;
/** The F0 baseline's median native draw CPU time for the same update; F0 drew in the frame after its reconcile window. */
const F0_EVERY_CELL_2000_DRAW_P50_MS = 15.885;
/** Cells per row of the bounded fan-out fixture. */
const ROW_SIZE = 50;
/**
 * Tags in a payload have more digits at 2,000 cells than at 50 (they count up through every node ever
 * mounted), so the payload of the same one-node change may differ by this many characters.
 */
const MAX_TAG_DIGIT_GROWTH_CHARS = 4;
const IDLE_FRAMES = 6;

async function runBaselineScenarios() {
  scope = baseline ? 'fabric-baseline-dpr1' : 'fabric-acceptance-dpr1';
  await size(BENCHMARK_VIEWPORT, 1);
  await page.evaluate(() => globalThis.__godotMotionProbe.start(false, []));
  await new Promise((resolve) => setTimeout(resolve, IDLE_SAMPLE_MS));
  report.idle.push({ scope, ...traceSummary(await page.evaluate(() => globalThis.__godotMotionProbe.stop())) });
  // Every render must change something native can see, or no draw follows and the wait times out.
  // Consecutive phases alternate the paint of a `paint` fixture; a variant fixture ignores the phase
  // and changes only when its mode does, so it is rendered once.
  let phase = 1;
  const nextPhase = () => phase++;
  const results = new Map();
  for (const count of counts) {
    // (a) one cell's colour changes; (b) every cell's colour changes (the existing scenario). The
    // acceptance run also measures (a) with memoized cells, as a real app keeps list rows.
    const colourScenarios = [[`${count}-a-one-cell-colour`, 0, false], [`${count}-b-every-cell-colour`, undefined, false]];
    if (acceptance) {
      colourScenarios.splice(1, 0, [`${count}-a-one-cell-colour-memo`, 0, true], [`${count}-a-one-cell-rows`, 0, true, ROW_SIZE]);
    }
    for (const [name, only, memoCells, rowSize] of colourScenarios) {
      for (let warmup = 0; warmup < WARMUP_UPDATES; warmup++) await renderBenchmark({ count, text: false, mode: 'paint', phase: nextPhase(), only, memoCells, rowSize });
      results.set(name, await baselineScenario(name, count, async (drain) => {
        for (let index = 0; index < repetitions; index++) {
          await renderBenchmark({ count, text: false, mode: 'paint', phase: nextPhase(), only, memoCells, rowSize });
          if ((index + 1) % BASELINE_DRAIN_EVERY === 0) await drain();
        }
      }, rowSize === undefined ? count : Math.ceil(count / rowSize)));
    }
    if (acceptance) {
      // (e) an idle frame after a commit records nothing: wait for native to go quiet, then watch it.
      await paintFrames();
      const idleBefore = await activity();
      for (let frame = 0; frame < IDLE_FRAMES; frame++) await paintFrames();
      const idleAfter = await activity();
      results.set(`${count}-e-idle-frames`, { before: idleBefore, after: idleAfter });
    }
    // (c) the mouse sweeps across up to 200 cells carrying `hover:` styles.
    await renderBenchmark({ count, text: false, mode: 'hover', phase: nextPhase() });
    const positions = await cellPositions(Math.min(count, BASELINE_HOVER_CELLS));
    await page.mouse.move(1, 1);
    await paintFrames();
    results.set(`${count}-c-hover-sweep`, await baselineScenario(`${count}-c-hover-sweep`, count, async (drain) => {
      for (const [index, position] of positions.entries()) {
        await page.mouse.move(position.x, position.y);
        await paintFrames();
        if ((index + 1) % BASELINE_DRAIN_EVERY === 0) await drain();
      }
    }));
    results.get(`${count}-c-hover-sweep`).moves = positions.length;
    // (d) the viewport crosses the `md` breakpoint (768 logical px) and back, repeatedly.
    await renderBenchmark({ count, text: false, mode: 'responsive', phase: nextPhase() });
    await page.mouse.move(1, 1);
    results.set(`${count}-d-breakpoint-resize`, await baselineScenario(`${count}-d-breakpoint-resize`, count, async (drain) => {
      for (let pair = 0; pair < BASELINE_RESIZE_PAIRS; pair++) {
        await size(BASELINE_NARROW_VIEWPORT, 1);
        await drain();
        await size(BENCHMARK_VIEWPORT, 1);
        await drain();
      }
    }));
  }
  await page.evaluate(() => globalThis.godotReactDemo.restoreDemo());
  await paintFrames();
  if (acceptance) acceptanceCriteria(results);
}

/**
 * The decision (docs/INTERACTION_PLAN.md, decision log) that explains the JS clauses of criterion 1
 * for the flat variants: every cell is a child of one parent, and React rebuilds the parent's child
 * list on every update, so JS time follows the sibling count. The rows variant bounds every parent's
 * fan-out and meets the same clauses. A failure with a decision is reported with it and does not fail
 * the run; any other failing criterion does.
 */
const FLAT_LIST_DEVIATION = 'D8';

/** Phase F4's pass criteria, evaluated on the scenario results and recorded in the report. */
function acceptanceCriteria(results) {
  const verdicts = [];
  const criterion = (name, passed, detail, deviation) => {
    verdicts.push({ name, passed: Boolean(passed), ...(deviation !== undefined && !passed ? { deviation } : {}), detail });
    report.assertions.push({ scope, name: `F4: ${name}`, passed: Boolean(passed) || deviation !== undefined, detail });
  };
  const small = counts[0];
  const large = counts.at(-1);
  // 1. One cell changes: cost at 2,000 cells against 50, for the commit and for native. The flat
  // variants put every cell under one parent; the rows variant bounds every parent's fan-out.
  for (const variant of ['a-one-cell-colour', 'a-one-cell-colour-memo', 'a-one-cell-rows']) {
    const few = results.get(`${small}-${variant}`);
    const many = results.get(`${large}-${variant}`);
    const ratio = (key, field) => many.derived[key][field] / few.derived[key][field];
    const deviation = variant === 'a-one-cell-rows' ? undefined : FLAT_LIST_DEVIATION;
    criterion(`1 (${variant}): JS commit time at ${large} cells is at most ${MAX_SCALE_RATIO}x the ${small}-cell time`,
      ratio('jsCommitMs', 'p50') <= MAX_SCALE_RATIO,
      { few: few.derived.jsCommitMs.p50, many: many.derived.jsCommitMs.p50, ratio: ratio('jsCommitMs', 'p50') }, deviation);
    criterion(`1 (${variant}): the renderer's commit walk at ${large} cells is at most ${MAX_SCALE_RATIO}x the ${small}-cell time`,
      ratio('jsWalkMs', 'p50') <= MAX_SCALE_RATIO,
      { few: few.derived.jsWalkMs.p50, many: many.derived.jsWalkMs.p50, ratio: ratio('jsWalkMs', 'p50') }, deviation);
    criterion(`1 (${variant}): native commit time at ${large} cells is at most ${MAX_SCALE_RATIO}x the ${small}-cell time`,
      ratio('nativeCommitMicros', 'p50') <= MAX_SCALE_RATIO,
      { few: few.derived.nativeCommitMicros.p50, many: many.derived.nativeCommitMicros.p50, ratio: ratio('nativeCommitMicros', 'p50') });
    const mutationsPerCommit = [few, many].map((result) => result.counts.mutations / result.counts.nativeBatches);
    criterion(`1 (${variant}): payload size and mutations per commit do not depend on the cell count`,
      few.derived.payloadEntries.p50 === many.derived.payloadEntries.p50 &&
      Math.abs(few.derived.payloadChars.p50 - many.derived.payloadChars.p50) <= MAX_TAG_DIGIT_GROWTH_CHARS &&
      mutationsPerCommit[0] === mutationsPerCommit[1],
      { payloadChars: [few.derived.payloadChars.p50, many.derived.payloadChars.p50],
        payloadEntries: [few.derived.payloadEntries.p50, many.derived.payloadEntries.p50], mutationsPerCommit });
  }
  // 2. A hover sweep causes no React commit and no commit call, and re-records only the cells whose paint changed.
  for (const count of counts) {
    const sweep = results.get(`${count}-c-hover-sweep`);
    criterion(`2 (${count} cells): the hover sweep causes zero React commits and zero native commits`,
      sweep.counts.reactCommits === 0 && sweep.counts.nativeBatches === 0,
      { reactCommits: sweep.counts.reactCommits, nativeBatches: sweep.counts.nativeBatches });
    // Each move unhovers the previous cell and hovers the next: at most two boxes per move, no text.
    criterion(`2 (${count} cells): the sweep re-records only cells whose paint changed (at most 2 boxes per move, no content)`,
      sweep.counts.boxRecords <= 2 * sweep.moves && sweep.counts.contentRecords === 0,
      { boxRecords: sweep.counts.boxRecords, contentRecords: sweep.counts.contentRecords, moves: sweep.moves });
  }
  // 3. A resize across `md` causes no React commit and restyles exactly the nodes that use `md:` classes.
  for (const count of counts) {
    const resize = results.get(`${count}-d-breakpoint-resize`);
    const crossings = 2 * BASELINE_RESIZE_PAIRS;
    criterion(`3 (${count} cells): the resize causes zero React commits`, resize.counts.reactCommits === 0,
      { reactCommits: resize.counts.reactCommits });
    criterion(`3 (${count} cells): the resize restyles exactly the ${count} nodes that use md: classes, per crossing`,
      resize.counts.nodesRestyled === count * crossings,
      { nodesRestyled: resize.counts.nodesRestyled, expected: count * crossings });
  }
  // 4. Every cell changes: total time per update lower than the F0 baseline. F0's reconcile window
  // ended before it drew (the draw ran in the next frame); the Fabric renderer paints inside the
  // commit, so its reconcile window is the whole update and F0's total is the window plus its draw.
  const every = results.get(`${large}-b-every-cell-colour`);
  const f0TotalMs = F0_EVERY_CELL_2000_RECONCILE_P50_MS + F0_EVERY_CELL_2000_DRAW_P50_MS;
  criterion(`4: updating every cell at ${large} cells takes less in total than the F0 baseline (${f0TotalMs.toFixed(2)} ms median: reconcile + draw)`,
    large === 2000 && every.stages.js['reconcile.durationMs'].p50 < f0TotalMs,
    { totalP50Ms: every.stages.js['reconcile.durationMs'].p50, baselineMs: f0TotalMs,
      baselineReconcileMs: F0_EVERY_CELL_2000_RECONCILE_P50_MS, baselineDrawMs: F0_EVERY_CELL_2000_DRAW_P50_MS,
      paintInsideWindowMs: every.stages.native['draw.cpuMicros'].p50 / 1000 });
  // 5. An idle frame after a commit records no canvas-item commands.
  for (const count of counts) {
    const idle = results.get(`${count}-e-idle-frames`);
    criterion(`5 (${count} cells): ${IDLE_FRAMES} idle frames after a commit record no box or content commands`,
      idle.after.boxRecords === idle.before.boxRecords && idle.after.contentRecords === idle.before.contentRecords &&
      idle.after.paintPasses === idle.before.paintPasses,
      { box: [idle.before.boxRecords, idle.after.boxRecords], content: [idle.before.contentRecords, idle.after.contentRecords],
        paintPasses: [idle.before.paintPasses, idle.after.paintPasses] });
  }
  report.criteria = verdicts;
  for (const verdict of verdicts) {
    console.log(`GODOT_REACT_CRITERION ${verdict.passed ? 'PASS' : verdict.deviation ? `FAIL (recorded deviation ${verdict.deviation})` : 'FAIL'} ${verdict.name} ${JSON.stringify(verdict.detail)}`);
  }
  const failed = verdicts.filter((verdict) => !verdict.passed && verdict.deviation === undefined);
  if (failed.length > 0) {
    throw new Error(`Phase F4 criteria failed:\n${failed.map((verdict) => `${verdict.name}: ${JSON.stringify(verdict.detail)}`).join('\n')}`);
  }
}

async function observe(observedPage) {
  let ready = false;
  let expectedSeen = false;
  let pendingPackAbort = null;
  const cdp = await observedPage.createCDPSession();
  await cdp.send('Network.enable');
  const networkPack = {
    requestIds: new Set(),
    requests: 0,
    status: null,
    contentLength: null,
    receivedBytes: 0,
    abortedBeforeReady: 0,
  };
  cdp.on('Network.requestWillBeSent', (event) => {
    if (event.request?.url?.endsWith('/index.pck')) {
      networkPack.requestIds.add(event.requestId);
      networkPack.requests += 1;
    }
  });
  cdp.on('Network.responseReceived', (event) => {
    if (!networkPack.requestIds.has(event.requestId)) return;
    networkPack.status = event.response?.status ?? null;
    const rawLength = event.response?.headers?.['Content-Length'] ?? event.response?.headers?.['content-length'];
    networkPack.contentLength = rawLength === undefined ? null : Number(rawLength);
  });
  cdp.on('Network.dataReceived', (event) => {
    if (networkPack.requestIds.has(event.requestId)) {
      networkPack.receivedBytes += event.dataLength ?? 0;
    }
  });
  await observedPage.evaluateOnNewDocument(() => {
    const probe = {
      fetchCount: 0,
      status: null,
      contentLength: null,
      byteLength: null,
      sha256: null,
      fetchError: null,
      digestPromise: null,
    };
    Object.defineProperty(globalThis, '__godotPackProbe', { value: probe, configurable: true });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = function (...args) {
      const requestUrl = String(args[0] ?? '');
      const promise = Reflect.apply(originalFetch, this, args);
      if (requestUrl.endsWith('index.pck')) {
        probe.fetchCount += 1;
        promise.then(
          (response) => {
            probe.status = response.status;
            const rawLength = response.headers.get('content-length');
            probe.contentLength = rawLength === null ? null : Number(rawLength);
          },
          (error) => {
            probe.fetchError = String(error);
          },
        );
      }
      return promise;
    };
    const originalArrayBuffer = Response.prototype.arrayBuffer;
    Response.prototype.arrayBuffer = function (...args) {
      const promise = Reflect.apply(originalArrayBuffer, this, args);
      if (this.url === '') {
        promise.then((buffer) => {
          probe.byteLength = buffer.byteLength;
          probe.digestPromise = crypto.subtle.digest('SHA-256', buffer).then((digest) => {
            probe.sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
            return probe.sha256;
          });
        });
      }
      return promise;
    };
  });
  observedPage.on('console', (message) => {
    const entry = { scope, type: message.type(), text: message.text(), location: message.location() };
    report.console.push(entry);
    if (entry.text.includes('GODOT_REACT_DEMO_READY')) ready = true;
    if (entry.text === EXPECTED_DIAGNOSTIC) {
      // Source-mapped Emscripten dlopen worker synchronization: permitted once
      // before readiness, never during motion or benchmark interaction.
      if (!ready && !expectedSeen) { expectedSeen = true; report.expectedDiagnostics.push(entry); }
      else report.errors.push(entry.text);
      return;
    }
    if (entry.type === 'error' && !entry.location.url?.endsWith('/favicon.ico')) report.errors.push(entry.text);
    else if (/(?:^|\n)(?:ERROR:|SCRIPT ERROR:)|GODOT_REACT_(?:VERIFY|START)_FAILED|\[panic /.test(entry.text)) report.errors.push(entry.text);
  });
  observedPage.on('pageerror', (error) => report.errors.push(error.stack ?? error.message));
  observedPage.on('requestfailed', (request) => {
    if (request.url().endsWith('/favicon.ico')) return;
    const errorText = request.failure()?.errorText;
    // Godot's index.js wraps fetch('index.pck')'s body reader in a progress
    // ReadableStream and calls controller.close() upon reader EOF; Chromium
    // can emit Network.loadingFailed(net::ERR_ABORTED, canceled: true) during
    // stream teardown after all pack bytes have been delivered. Hold a single
    // pre-ready index.pck abort until startup completes and verify byte length,
    // SHA-256, HTTP 200 status, and single-fetch completion before accepting it.
    if (request.url().endsWith('/index.pck') && errorText === 'net::ERR_ABORTED' && !ready && !pendingPackAbort) {
      networkPack.abortedBeforeReady += 1;
      pendingPackAbort = { scope, url: request.url(), errorText };
      return;
    }
    report.errors.push(`${request.url()}: ${errorText}`);
  });
  return {
    async verifyPackTransfer() {
      const probe = await observedPage.evaluate(async () => {
        const state = globalThis.__godotPackProbe;
        if (!state) return null;
        if (state.digestPromise) await state.digestPromise;
        return {
          fetchCount: state.fetchCount,
          status: state.status,
          contentLength: state.contentLength,
          byteLength: state.byteLength,
          sha256: state.sha256,
          fetchError: state.fetchError,
        };
      });
      const detail = {
        expectedBytes: expectedPack.bytes,
        expectedSha256: expectedPack.sha256,
        network: {
          requests: networkPack.requests,
          status: networkPack.status,
          contentLength: networkPack.contentLength,
          receivedBytes: networkPack.receivedBytes,
          abortedBeforeReady: networkPack.abortedBeforeReady,
        },
        probe,
      };
      const complete = Boolean(
        probe &&
        probe.fetchError === null &&
        probe.fetchCount === 1 &&
        probe.status === 200 &&
        probe.contentLength === expectedPack.bytes &&
        probe.byteLength === expectedPack.bytes &&
        probe.sha256 === expectedPack.sha256 &&
        networkPack.requests === 1 &&
        networkPack.status === 200 &&
        networkPack.contentLength === expectedPack.bytes &&
        networkPack.receivedBytes === expectedPack.bytes &&
        networkPack.abortedBeforeReady <= 1
      );
      const pending = pendingPackAbort;
      pendingPackAbort = null;
      if (!complete) {
        report.errors.push(`index.pck transfer verification failed: ${JSON.stringify({ pending, ...detail })}`);
      } else if (pending) {
        report.expectedDiagnostics.push({
          ...pending,
          reason: 'Chromium ReadableStream wrapper close after verified complete index.pck transfer',
          ...detail,
        });
      }
      check('Main pack transfer completed with matching byte length and SHA-256 without retry', complete, detail);
    },
    failIfUnverified() {
      if (pendingPackAbort) {
        report.errors.push(`${pendingPackAbort.url}: ${pendingPackAbort.errorText} (received ${networkPack.receivedBytes}/${expectedPack.bytes} bytes before failure)`);
        pendingPackAbort = null;
      }
    },
  };
}

let packObserver = null;
try {
  await deadline((async () => {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true, timeout: ACTION_MS,
      args: ['--no-first-run', '--no-default-browser-check', '--mute-audio',
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
    });
    report.browserVersion = await browser.version();
    page = await browser.newPage();
    page.setDefaultTimeout(ACTION_MS);
    page.setDefaultNavigationTimeout(STARTUP_MS);
    await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
    packObserver = await observe(page);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    check('Motion demo document loads', response?.ok());
    await until('GodotJS motion/profile API', async () => page.evaluate(() => {
      const api = globalThis.godotReactDemo;
      return api && ['snapshot', 'find', 'profile', 'takeProfile', 'activity', 'benchmark', 'restoreDemo', 'surfaceAttached'].every((key) => typeof api[key] === 'function');
    }), STARTUP_MS);
    await packObserver.verifyPackTransfer();
    check('WebAssembly page is cross-origin isolated', await page.evaluate(() => crossOriginIsolated));
    await installProbe();
    if (scenarioMode) {
      await runBaselineScenarios();
    } else {
      for (const dpr of [1, 2]) {
        await runMotion(dpr);
        await runBenchmarks(dpr);
      }
    }
    await page.evaluate(() => globalThis.__godotMotionProbe.dispose());
    healthy();
    report.passed = true;
  })(), TOTAL_MS, 'Motion and benchmark verification');
} catch (error) {
  packObserver?.failIfUnverified();
  report.error = error instanceof Error ? error.stack : String(error);
  console.error('GODOT_REACT_MOTION_VERIFY_FAILED', report.error);
  process.exitCode = 1;
  if (page && !page.isClosed()) {
    await page.screenshot({ path: resolve(output, 'failure.png'), timeout: ACTION_MS }).catch((captureError) => {
      report.failureCaptureError = String(captureError);
    });
    await snapshot().then((data) => writeFile(resolve(output, 'failure.json'), JSON.stringify(data, null, 2) + '\n')).catch((snapshotError) => {
      report.failureSnapshotError = String(snapshotError);
    });
  }
} finally {
  if (browser) await deadline(browser.close(), ACTION_MS, 'Browser cleanup').catch((error) => {
    report.cleanupError = String(error);
    browser.process()?.kill('SIGTERM');
    process.exitCode = 1;
  });
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(resolve(output, 'browser.log'), report.console.map((entry) => `[${entry.type}] ${entry.text}`).join('\n') + '\n');
}
if (report.passed && !process.exitCode) console.log(baseline ? 'GODOT_REACT_BASELINE_VERIFY_PASSED' : acceptance ? 'GODOT_REACT_ACCEPTANCE_VERIFY_PASSED' : 'GODOT_REACT_MOTION_VERIFY_PASSED', JSON.stringify({
  assertions: report.assertions.length, captures: report.captures.length, benchmarks: report.benchmarks.length,
  quick, report: resolve(output, 'report.json'),
}));
