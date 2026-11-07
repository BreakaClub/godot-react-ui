import { Color, Engine, Image, Node, Time, Vector2 } from 'godot';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import {
  BACKGROUND_COLOURS, HOOK_ORDER, INPUTS_LAB_PATH, RECOLOUR, SYNTAX_ERROR, THROW_IN_MODULE, THROW_IN_RENDER, TYPE_ERROR, anchorOffset, applyEdits,
} from '../../scripts/live-compile-edits.mjs';
import type { LiveSession, UpdateReport } from './live-compile-session';
import { assertionTally } from './verifier-input';
import { grab, settleFrames } from './verify-filters';
import { click } from './verify-text-input';

/**
 * The `live-compile` section of the interaction verifier (docs/tracks/live-compile.md): the checker, the compiler and the swap that
 * the live code editor stands on, driven from code with no editor. It compiles the real source of the Controls lab
 * (`inputs-lab.tsx`) in the running realm, mounts it in place of the bundled copy, edits the source and reads the page back:
 *
 * - the compiled page is the page the bundle has;
 * - a changed colour class and a changed text reach the pixels and the node properties, and a counter keeps its count;
 * - a changed hook order starts the state again instead of crashing;
 * - a syntax error, a module that throws and a render that throws each leave the last good page on screen, with the error reported;
 * - a type error is reported at the position `tsc` reports it at, and does not stop the new code running;
 * - how long an edit takes from the change to the pixels, how long a check takes, and what a frame costs while one runs.
 *
 * It needs the extension (`node scripts/build-live-compile.mjs`); the driver refuses a stale one before it opens a window.
 */
export interface LiveCompileInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showLab(name: 'inputs'): void;
  openLiveSession(labId: string, exportName: string): LiveSession;
  restoreDemo(): void;
}

export type LiveCompileCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

const LAB_ID = 'inputs';
const EXPORT_NAME = 'InputsLab';
const ROOT_TEST_ID = 'inputs-lab';
const COUNTER_TEST_ID = 'inputs-next';
const SLATE_50 = '#f8fafc';
const EMERALD_100 = '#d1fae5';
const SKY_100 = '#e0f2fe';
const LEVELS = 255;
/** `#` and three bytes. */
const SIX_DIGIT_COLOUR_LENGTH = 7;
/** An 8-bit level of difference a draw may have from the colour asked for. */
const COLOUR_TOLERANCE_LEVELS = 2;
const CHECK_DEADLINE_MS = 10_000;
const PIXEL_DEADLINE_MS = 2_000;
const FRAME_POLL_MS = 1;
const LATENCY_EDITS = 30;
const LATER_CHECKS = 10;
const SUPERSEDING_BURST = 20;
/** The probe sits this far inside the page's top right corner, where only its background is. */
const PROBE_INSET_PX = 6;
const MILLISECONDS_PER_MICROSECOND = 1000;
const MEDIAN = 0.5;
const PERCENTILE_95 = 0.95;
const HUNDREDTH = 100;
const TENTH = 10;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

function nowMs(): number {
  return Time.getTicksUsec() / MILLISECONDS_PER_MICROSECOND;
}

function round(value: number, scale: number): number {
  return Math.round(value * scale) / scale;
}

function percentile(values: readonly number[], share: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const at = Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1);
  const found = sorted[Math.max(0, at)];
  assert(found !== undefined, 'There are no samples');
  return found;
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function node(api: LiveCompileInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

/** The text of an element: its own, or its descendants' in order. */
function textOf(api: LiveCompileInspection, testID: string): string {
  const snapshot = api.snapshot();
  const byId = new Map(snapshot.nodes.map(entry => [entry.id, entry]));
  const collect = (entry: NativeSnapshotNode): string => (entry.text !== '' ? entry.text : entry.children.map(id => byId.get(id)).map(child => (child === undefined ? '' : collect(child))).join(''));
  return collect(node(api, testID));
}

/** Every text on the page, in document order: what a person reads. */
function allTexts(api: LiveCompileInspection): string[] {
  return api.snapshot().nodes.filter(entry => entry.text !== '').sort((a, b) => a.documentIndex - b.documentIndex).map(entry => entry.text);
}

/** The page as the tree sees it, without the ids a mount hands out: one line for each node, kind, text and rectangle. */
function fingerprint(api: LiveCompileInspection): string[] {
  return api.snapshot().nodes.sort((a, b) => a.documentIndex - b.documentIndex)
    .map(entry => `${entry.kind}|${entry.text}|${[entry.rect.x, entry.rect.y, entry.rect.width, entry.rect.height].map(value => round(value, TENTH)).join(',')}`);
}

/** The page's background as `#rrggbb`: the snapshot has it as `#rrggbbaa`. */
function backgroundOf(api: LiveCompileInspection): string {
  return node(api, ROOT_TEST_ID).presentation.backgroundColor.toLowerCase().slice(0, SIX_DIGIT_COLOUR_LENGTH);
}

function levels(color: Color): [number, number, number] {
  return [Math.round(color.r * LEVELS), Math.round(color.g * LEVELS), Math.round(color.b * LEVELS)];
}

function hexLevels(hex: string): [number, number, number] {
  return [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];
}

/** The page's own paint at a point that only its background covers, in 8-bit levels. */
function backgroundPaint(owner: Node, api: LiveCompileInspection): [number, number, number] {
  const image: Image = grab(owner);
  const page = node(api, ROOT_TEST_ID).rect;
  const ratio = image.getWidth() / api.snapshot().width;
  return levels(image.getPixel(Math.round((page.x + page.width - PROBE_INSET_PX) * ratio), Math.round((page.y + PROBE_INSET_PX) * ratio)));
}

function paintIs(painted: readonly number[], hex: string): boolean {
  const wanted = hexLevels(hex);
  return painted.every((level, index) => Math.abs(level - (wanted[index] ?? 0)) <= COLOUR_TOLERANCE_LEVELS);
}

/** Waits for the page's background to be `hex` in the pixels, and returns the milliseconds that took from `since`. */
async function waitForPaint(owner: Node, api: LiveCompileInspection, hex: string, since: number): Promise<number> {
  const deadline = since + PIXEL_DEADLINE_MS;
  for (;;) {
    await frames(1);
    if (paintIs(backgroundPaint(owner, api), hex)) return nowMs() - since;
    assert(nowMs() < deadline, `The pixels did not become ${hex} within ${PIXEL_DEADLINE_MS} ms: ${backgroundPaint(owner, api).join(',')}`);
  }
}

async function pressCounter(api: LiveCompileInspection): Promise<void> {
  const rect = node(api, COUNTER_TEST_ID).rect;
  await click(new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2));
}

async function checkOf(session: LiveSession): Promise<{ readonly outcome: Awaited<ReturnType<LiveSession['check']>>; readonly ms: number }> {
  const started = nowMs();
  const outcome = await Promise.race([
    session.check(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`A check did not answer within ${CHECK_DEADLINE_MS} ms`)), CHECK_DEADLINE_MS)),
  ]);
  return { outcome, ms: nowMs() - started };
}

function diagnosticsOf(outcome: Awaited<ReturnType<LiveSession['check']>>): readonly { readonly code: number; readonly pos: number; readonly category: number }[] {
  assert(outcome.kind === 'checked', `The check ended as ${outcome.kind}${outcome.kind === 'failed' ? `: ${outcome.message}` : ''}`);
  return outcome.report.diagnostics;
}

/** The longest gap between two turns of a 1 ms timer while `work` runs: the longest the main thread went without serving the frame. */
async function worstStall(work: () => Promise<void>): Promise<number> {
  let running = true;
  let worst = 0;
  const sampler = (async () => {
    let last = nowMs();
    while (running) {
      await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
      const now = nowMs();
      worst = Math.max(worst, now - last);
      last = now;
    }
  })();
  try {
    await work();
  } finally {
    running = false;
    await sampler;
  }
  return worst;
}

export async function verifyLiveCompile(owner: Node, api: LiveCompileInspection, capture: LiveCompileCapture): Promise<void> {
  const facts: Record<string, unknown> = {};

  // ---- The page the bundle has, and the same page compiled from its source -------------------------------------------------
  api.showLab('inputs');
  await settleFrames();
  const bundled = fingerprint(api);
  const bundledBackground = backgroundOf(api);
  assert(bundled.length > 50, `The bundled Controls lab has a page's worth of nodes: ${bundled.length}`);

  const session = api.openLiveSession(LAB_ID, EXPORT_NAME);
  const opened = nowMs();
  session.open();
  facts.openMs = round(nowMs() - opened, TENTH);
  await settleFrames();
  const compiled = fingerprint(api);
  assert(JSON.stringify(compiled) === JSON.stringify(bundled), `The lab compiled from its source is the lab the bundle has (${compiled.length} nodes against ${bundled.length}); first difference at ${compiled.findIndex((line, index) => line !== bundled[index])}`);
  assert(backgroundOf(api) === bundledBackground && bundledBackground === SLATE_50, `and has its background: ${backgroundOf(api)}`);
  assert(paintIs(backgroundPaint(owner, api), SLATE_50), `and its pixels: ${backgroundPaint(owner, api).join(',')}`);
  await capture('live-compile-01-compiled');
  const original = session.sourceOf(INPUTS_LAB_PATH);
  assert(original.includes('bg-slate-50'), 'The session holds the lab\'s source');

  // ---- Type checking: clean, then the first and the later checks -----------------------------------------------------------
  const first = await checkOf(session);
  assert(diagnosticsOf(first.outcome).length === 0, `The lab type-checks clean: ${JSON.stringify(first.outcome).slice(0, 300)}`);
  facts.firstCheckMs = round(first.ms, TENTH);
  const later: number[] = [];
  for (let index = 0; index < LATER_CHECKS; index += 1) later.push((await checkOf(session)).ms);
  facts.laterCheckMedianMs = round(percentile(later, MEDIAN), TENTH);
  facts.laterCheckWorstMs = round(Math.max(...later), TENTH);

  // ---- An edit reaches the pixels and the properties, and the counter keeps its count --------------------------------------
  for (let presses = 0; presses < 3; presses += 1) await pressCounter(api);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 3', `The counter counts: ${textOf(api, COUNTER_TEST_ID)}`);
  const recoloured = applyEdits(original, RECOLOUR);
  const recolourStarted = nowMs();
  const recolour = session.update(INPUTS_LAB_PATH, recoloured);
  assert(recolour.outcome === 'swapped' && recolour.evaluated.length === 1 && recolour.evaluated[0] === INPUTS_LAB_PATH, `A new colour and a new text are swapped in by evaluating the one module: ${JSON.stringify({ outcome: recolour.outcome, evaluated: recolour.evaluated, error: recolour.error })}`);
  const recolourPixelsMs = await waitForPaint(owner, api, EMERALD_100, recolourStarted);
  facts.editToPixelsMs = round(recolourPixelsMs, TENTH);
  facts.editTimings = recolour.timings;
  assert(backgroundOf(api) === EMERALD_100, `The page's background property is the new class's colour: ${backgroundOf(api)}`);
  assert(allTexts(api).includes('Inputs, live') && !allTexts(api).includes('Inputs'), `The title reads the new text: ${allTexts(api).slice(0, 3).join(' / ')}`);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 3', `and the counter kept its count through the edit: ${textOf(api, COUNTER_TEST_ID)}`);
  await capture('live-compile-02-edited');
  assert(diagnosticsOf((await checkOf(session)).outcome).length === 0, 'The edited page type-checks clean');

  // ---- A changed hook order starts the state again, without a crash -------------------------------------------------------
  const reordered = applyEdits(recoloured, HOOK_ORDER);
  const reorder = session.update(INPUTS_LAB_PATH, reordered);
  assert(reorder.outcome === 'swapped', `A changed hook order is swapped in: ${reorder.outcome} ${reorder.error ?? ''}`);
  await settleFrames();
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 0', `and the state starts again: ${textOf(api, COUNTER_TEST_ID)}`);
  assert(backgroundOf(api) === EMERALD_100, 'with the edited page');
  await pressCounter(api);
  await pressCounter(api);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 2', `and the reordered page works: ${textOf(api, COUNTER_TEST_ID)}`);
  // Back to the text before the reorder, for what follows: a counter at 2 that must survive each failed edit.
  const restored = session.update(INPUTS_LAB_PATH, recoloured);
  assert(restored.outcome === 'swapped', `The hooks go back in their order: ${restored.outcome}`);
  await settleFrames();
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 0', `and the state starts again: ${textOf(api, COUNTER_TEST_ID)}`);
  await pressCounter(api);
  await pressCounter(api);
  const goodTexts = allTexts(api);
  const goodFingerprint = fingerprint(api);

  const unchanged = async (what: string): Promise<void> => {
    await settleFrames();
    assert(JSON.stringify(fingerprint(api)) === JSON.stringify(goodFingerprint), `${what}: the page is as it was (${allTexts(api).slice(0, 3).join(' / ')})`);
    assert(backgroundOf(api) === EMERALD_100 && paintIs(backgroundPaint(owner, api), EMERALD_100), `${what}: with its colour in the pixels`);
    assert(JSON.stringify(allTexts(api)) === JSON.stringify(goodTexts), `${what}: and its texts`);
  };

  // ---- A syntax error keeps the old page, and both tools say where it is ---------------------------------------------------
  const broken = applyEdits(recoloured, [SYNTAX_ERROR]);
  const syntax = session.update(INPUTS_LAB_PATH, broken);
  const semicolon = anchorOffset(broken, SYNTAX_ERROR.anchor) + SYNTAX_ERROR.anchor.length - 1;
  assert(syntax.outcome === 'compile-failed', `A syntax error does not compile: ${syntax.outcome}`);
  assert(syntax.diagnostics[0]?.start === semicolon && syntax.diagnostics[0].severity === 'error', `and the compiler reports it at the semicolon (${semicolon}): ${JSON.stringify(syntax.diagnostics[0])}`);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 2', `and the counter is still at 2: ${textOf(api, COUNTER_TEST_ID)}`);
  await unchanged('A syntax error');
  const syntaxCheck = diagnosticsOf(await syntax.check);
  assert(syntaxCheck.some(diagnostic => diagnostic.pos === semicolon && diagnostic.category === 1), `and the checker reports a syntax error at the same offset: ${JSON.stringify(syntaxCheck.slice(0, 2))}`);

  // ---- A module that throws when it runs keeps the old page ----------------------------------------------------------------
  const throwsInModule = session.update(INPUTS_LAB_PATH, applyEdits(recoloured, THROW_IN_MODULE));
  assert(throwsInModule.outcome === 'evaluation-failed' && throwsInModule.error === 'live-compile-test-module', `A module that throws is not swapped in, and says why: ${throwsInModule.outcome} ${throwsInModule.error}`);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 2', `and the counter is still at 2: ${textOf(api, COUNTER_TEST_ID)}`);
  await unchanged('A module that throws');

  // ---- A render that throws puts the last good version back ----------------------------------------------------------------
  console.log('GODOT_REACT_EXPECT_ERROR live-compile-test-render');
  const throwsInRender = session.update(INPUTS_LAB_PATH, applyEdits(recoloured, THROW_IN_RENDER));
  assert(throwsInRender.outcome === 'render-failed' && throwsInRender.rolledBack && throwsInRender.error === 'live-compile-test-render', `A render that throws is rolled back, with its error: ${throwsInRender.outcome} ${throwsInRender.error}`);
  await settleFrames();
  assert(api.find('live-compile-error') === undefined, 'and no error page stays up');
  assert(JSON.stringify(allTexts(api)) === JSON.stringify(goodTexts), `and the last good version is on screen (${allTexts(api).slice(0, 3).join(' / ')})`);
  assert(backgroundOf(api) === EMERALD_100 && paintIs(backgroundPaint(owner, api), EMERALD_100), 'with its colour');
  // The tree that threw was dropped, and the good one starts from its first render: the limit of React's recovery, recorded.
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 0', `(its state starts again, as React keeps nothing of a tree whose render threw: ${textOf(api, COUNTER_TEST_ID)})`);
  await pressCounter(api);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 1', `and it works: ${textOf(api, COUNTER_TEST_ID)}`);
  await capture('live-compile-03-rolled-back');
  const afterRollback = session.update(INPUTS_LAB_PATH, recoloured);
  assert(afterRollback.outcome === 'swapped', `and the next good edit swaps in: ${afterRollback.outcome} ${afterRollback.error ?? ''}`);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 1', `keeping its count: ${textOf(api, COUNTER_TEST_ID)}`);

  // ---- A type error does not stop the new code, and is reported where tsc reports it -------------------------------------------
  const typed = applyEdits(original, [TYPE_ERROR]);
  const typeError = session.update(INPUTS_LAB_PATH, typed);
  assert(typeError.outcome === 'swapped', `A type error does not stop the new code running: ${typeError.outcome} ${typeError.error ?? ''}`);
  const typeAt = anchorOffset(typed, TYPE_ERROR.anchor);
  const typeDiagnostics = diagnosticsOf(await typeError.check);
  assert(typeDiagnostics.some(diagnostic => diagnostic.code === TYPE_ERROR.code && diagnostic.pos === typeAt), `and is reported as TS${TYPE_ERROR.code} at offset ${typeAt}, where tsc has it (scripts/live-compile-agreement.mjs): ${JSON.stringify(typeDiagnostics.slice(0, 3))}`);
  assert(backgroundOf(api) === SLATE_50, `and the page runs the new text, which has the original colour again: ${backgroundOf(api)}`);
  const fixed = session.update(INPUTS_LAB_PATH, original);
  assert(fixed.outcome === 'swapped', 'The error is fixed and swapped in');
  assert(diagnosticsOf(await fixed.check).length === 0, 'and the checker has nothing to say');

  // ---- A burst of edits: the checks that never began are superseded, the last one is answered ---------------------------------
  const burst = Array.from({ length: SUPERSEDING_BURST }, () => session.check());
  const outcomes = await Promise.all(burst);
  const checked = outcomes.filter(outcome => outcome.kind === 'checked').length;
  const superseded = outcomes.filter(outcome => outcome.kind === 'superseded').length;
  assert(outcomes.at(-1)?.kind === 'checked', `The newest of ${SUPERSEDING_BURST} checks is answered: ${outcomes.at(-1)?.kind}`);
  assert(superseded >= SUPERSEDING_BURST - 3 && checked + superseded === SUPERSEDING_BURST, `and those that had not begun were superseded: ${checked} checked, ${superseded} superseded`);
  facts.burst = { requested: SUPERSEDING_BURST, checked, superseded };

  // ---- Latency: the edit to the pixels, and a frame while a check runs --------------------------------------------------------
  const toPixels: number[] = [];
  const evaluateMs: number[] = [];
  const compileMs: number[] = [];
  let report: UpdateReport | undefined;
  let text = original;
  let last = SLATE_50;
  for (let index = 0; index < LATENCY_EDITS; index += 1) {
    const colour = BACKGROUND_COLOURS[index % BACKGROUND_COLOURS.length];
    assert(colour !== undefined, 'There are colours to alternate between');
    text = text.replace(/bg-(?:slate-50|emerald-100|sky-100) p-6 gap-3/u, `${colour} p-6 gap-3`);
    const wanted = colour === 'bg-emerald-100' ? EMERALD_100 : SKY_100;
    const started = nowMs();
    report = session.update(INPUTS_LAB_PATH, text);
    assert(report.outcome === 'swapped', `Edit ${index} is swapped in: ${report.outcome}`);
    compileMs.push(report.timings.compileMs);
    evaluateMs.push(report.timings.swapMs);
    toPixels.push(await waitForPaint(owner, api, wanted, started));
    last = wanted;
  }
  assert(last !== SLATE_50, 'The latency loop ended on a colour of its own');
  facts.keystrokeToPixels = { medianMs: round(percentile(toPixels, MEDIAN), TENTH), p95Ms: round(percentile(toPixels, PERCENTILE_95), TENTH), worstMs: round(Math.max(...toPixels), TENTH) };
  facts.compileMedianMs = round(percentile(compileMs, MEDIAN), HUNDREDTH);
  facts.evaluateAndCommitMedianMs = round(percentile(evaluateMs, MEDIAN), TENTH);
  facts.evaluateAndCommitWorstMs = round(Math.max(...evaluateMs), TENTH);

  const idleStall = await worstStall(() => frames(LATER_CHECKS * 2));
  const checkStall = await worstStall(async () => {
    for (let index = 0; index < LATER_CHECKS; index += 1) await session.check();
  });
  facts.worstFrameMs = { idle: round(idleStall, TENTH), duringChecks: round(checkStall, TENTH) };

  session.unmount();
  api.restoreDemo();
  await settleFrames();
  console.log('GODOT_REACT_LIVE_COMPILE', JSON.stringify(facts));
}
