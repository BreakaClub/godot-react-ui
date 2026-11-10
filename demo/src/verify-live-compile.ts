import { Color, Engine, Image, Node, Time, Vector2 } from 'godot';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import {
  BACKGROUND_COLOURS, HOOK_ORDER, INPUTS_LAB_PATH, MEMO_EDIT, MEMO_SETUP, RECOLOUR, SYNTAX_ERROR, THROW_IN_MODULE, THROW_IN_RENDER, TYPE_ERROR, anchorOffset, applyEdits,
} from '../../scripts/live-compile-edits.mjs';
import { RequestCancelled, RequestScope, type Tsc } from 'godot-tsc/host';
import { readProject } from './live-compile-open';
import { LspChecker } from './live-compile-checker';
import type { LiveSession, UpdateReport } from './live-compile-session';
import { assertionTally } from './verifier-input';
import { grab, settleFrames } from './verify-filters';
import { MAX_FRAME_GAP_MS, POOL_HOGS, verifyLabWalk, verifyLiveCompileSequence, verifyThreadsAreGivenBack, type SequenceInspection } from './verify-live-compile-sequence';
import { click } from './verify-text-input';

/**
 * The `live-compile` section of the interaction verifier: the checker, the compiler and the swap that
 * the live code editor stands on, driven from code with no editor. It compiles the real source of the Controls lab
 * (`inputs-lab.tsx`) in the running realm, mounts it in place of the bundled copy, edits the source and reads the page back:
 *
 * - the compiled page is the page the bundle has;
 * - a changed colour class and a changed text reach the pixels and the node properties, and a counter keeps its count;
 * - a changed hook order starts the state again instead of crashing;
 * - a syntax error, a module that throws and a render that throws each leave the last good page on screen, with the error reported;
 * - a type error is reported at the position `tsc` reports it at, and does not stop the new code running;
 * - how long an edit takes from the change to the pixels, how long a check takes, and what a frame costs while one runs;
 * - nothing waits for the service thread: while the service is held busy the page keeps its frames, and
 *   the edit that was waiting for it is swapped in when it is free; an edit that a newer one overtakes is taken back and never applied; a
 *   request given up while the service runs it is let finish and its answer is dropped; the page has one service thread however many labs
 *   it opens; and the reported sequence (`verify-live-compile-sequence.ts`) with the code panel open.
 *
 * It needs the godot-tsc addon (`pnpm exec godot-tsc setup --project-dir demo --force`); the driver refuses one that is not the package's before it opens a window.
 */
export interface LiveCompileInspection extends SequenceInspection {
  showLab(name: 'inputs'): void;
  openLiveSession(labId: string, exportName: string): LiveSession;
}

export type LiveCompileCapture = (name: string, overflowing?: readonly string[]) => Promise<void>;

const LAB_ID = 'inputs';
const EXPORT_NAME = 'InputsLab';
const ROOT_TEST_ID = 'inputs-lab';
const COUNTER_TEST_ID = 'inputs-next';
/** The Controls lab's slider thumb is drawn past its track by design; every capture of the page says so (`verifyInputs`). */
const OVERFLOWING = ['inputs-slider-thumb'];
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
/** How long the service thread is held to stand for a long check or compile (`Tsc.stall`). */
const SERVICE_BUSY_MS = 1_500;
/** The share of that time the edit that waits behind it must have waited, or the service was not what it waited for. */
const BUSY_WAIT_SHARE = 0.8;
/** For the stale answers: the service is held long enough for two edits to be made, one after the other, while it is busy. */
const STALE_BUSY_MS = 600;
/** Frames let go by before the state of a queue is read, so the service thread has taken the job that holds it. */
const MIDWAY_FRAMES = 3;
const SERVICE_STATE_DEADLINE_MS = 10_000;
/** Jobs in the queue after two edits of one file were made while the service was busy: the project changes (two) and the newer edit's compile and check. */
const QUEUED_AFTER_TWO_EDITS = 4;
/** How much of a failed compile's diagnostics a message shows. */
const DIAGNOSTICS_SHOWN = 600;
/**
 * The probe sits this far inside the page's top left corner, in its padding, where only its background is. Not the right: the page is taller
 * than the window with its notes, so it scrolls, and its scrollbar's thumb is drawn at the top of the right edge.
 */
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
  return levels(image.getPixel(Math.round((page.x + PROBE_INSET_PX) * ratio), Math.round((page.y + PROBE_INSET_PX) * ratio)));
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

/** `text` with the page's background class changed (the class the latency loop alternates). */
/** The lab's text with its root's background class changed to `backgroundClass`. A text without that root is an error: a stale pattern must fail, not do nothing. */
function withBackground(text: string, backgroundClass: string): string {
  const changed = text.replace(/testID="inputs-lab" className="relative w-full h-full bg-(?:slate-50|emerald-100|sky-100)"/u, `testID="inputs-lab" className="relative w-full h-full ${backgroundClass}"`);
  assert(changed !== text || text.includes(`className="relative w-full h-full ${backgroundClass}"`), `The lab's root has a background class to change to ${backgroundClass}`);
  return changed;
}

/** Waits for the service thread to have begun a request, so that what is queued behind it waits. */
async function waitForServiceBusy(service: Tsc): Promise<void> {
  const deadline = nowMs() + SERVICE_STATE_DEADLINE_MS;
  while (service.state().running === null) {
    assert(nowMs() < deadline, `The service thread did not take the request that holds it within ${SERVICE_STATE_DEADLINE_MS} ms: ${JSON.stringify(service.state())}`);
    await frames(1);
  }
}

async function waitForServiceIdle(service: Tsc, what: string): Promise<void> {
  const deadline = nowMs() + SERVICE_STATE_DEADLINE_MS;
  while (service.state().running !== null || service.state().queued > 0) {
    assert(nowMs() < deadline, `The service was not idle within ${SERVICE_STATE_DEADLINE_MS} ms ${what}: ${JSON.stringify(service.state())}`);
    await frames(1);
  }
}

/**
 * Waits for every answer the service has given to be taken by the page: an answer that lands after the service goes idle sits in its replies until
 * the page's next poll (a timer, while a request is outstanding). An answer that stays is one nobody is waiting for, which is a defect: the message
 * says how many requests the page still had outstanding.
 */
async function waitForRepliesTaken(service: Tsc, what: string): Promise<void> {
  const deadline = nowMs() + SERVICE_STATE_DEADLINE_MS;
  while (service.state().replies > 0 || service.outstandingCount > 0) {
    assert(nowMs() < deadline,
      `The page did not take every answer within ${SERVICE_STATE_DEADLINE_MS} ms ${what}: ${JSON.stringify(service.state())}, ${service.outstandingCount} requests outstanding`);
    await frames(1);
  }
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

/**
 * The time the service thread spends on every lab of the project: compiling its source files, and its first check, which parses the lab's program
 * (a later check of the same program is far cheaper). Each is from the service's own clock. A request waits for the one in front of it, so the
 * largest of these is the longest any other request of the page can be kept waiting by the work of one lab.
 */
async function measureLabs(service: Tsc): Promise<Record<string, unknown>> {
  const project = readProject();
  const perLab: { readonly id: string; readonly compileMs: number; readonly firstCheckMs: number }[] = [];
  for (const [id, lab] of Object.entries(project.labs)) {
    let compileMs = 0;
    for (const path of lab.sources) {
      const file = project.files.find(candidate => candidate.path === path);
      assert(file, `The project has the source ${path} of the lab ${id}`);
      const timed = await service.transpileTimed(path, file.text, { reactRefresh: true }, new RequestScope());
      assert(timed.result.ok, `${path} compiles: ${timed.result.ok ? '' : JSON.stringify(timed.result.diagnostics).slice(0, DIAGNOSTICS_SHOWN)}`);
      compileMs += timed.serviceMs;
    }
    // Each lab's first check, by a checker of its own: a language server session for the lab's project, as the code panel opens one.
    const checker = new LspChecker(service, { config: lab.config, libDir: project.libDir }, project.files);
    const outcome = await checker.check();
    await checker.close();
    assert(outcome.kind === 'checked', `The lab ${id} is checked: ${outcome.kind}`);
    perLab.push({ id, compileMs: round(compileMs, TENTH), firstCheckMs: round(outcome.serviceMs, TENTH) });
  }
  const checks = perLab.map(lab => lab.firstCheckMs);
  const compiles = perLab.map(lab => lab.compileMs);
  const slowest = perLab.reduce((worst, lab) => (lab.firstCheckMs > worst.firstCheckMs ? lab : worst));
  return {
    count: perLab.length,
    firstCheck: { medianMs: percentile(checks, MEDIAN), worstMs: slowest.firstCheckMs, worstLab: slowest.id },
    compile: { medianMs: percentile(compiles, MEDIAN), worstMs: Math.max(...compiles) },
    perLab,
  };
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
  await session.open();
  facts.openMs = round(nowMs() - opened, TENTH);
  await settleFrames();
  const compiled = fingerprint(api);
  assert(JSON.stringify(compiled) === JSON.stringify(bundled), `The lab compiled from its source is the lab the bundle has (${compiled.length} nodes against ${bundled.length}); first difference at ${compiled.findIndex((line, index) => line !== bundled[index])}`);
  assert(backgroundOf(api) === bundledBackground && bundledBackground === SLATE_50, `and has its background: ${backgroundOf(api)}`);
  assert(paintIs(backgroundPaint(owner, api), SLATE_50), `and its pixels: ${backgroundPaint(owner, api).join(',')}`);
  await capture('live-compile-01-compiled', OVERFLOWING);
  const original = session.sourceOf(INPUTS_LAB_PATH);
  assert(original.includes('bg-slate-50'), 'The session holds the lab\'s source');

  // ---- Type checking: clean, then the first and the later checks -----------------------------------------------------------
  const first = await checkOf(session);
  assert(diagnosticsOf(first.outcome).length === 0, `The lab type-checks clean: ${JSON.stringify(first.outcome).slice(0, 300)}`);
  assert(first.outcome.kind === 'checked', 'The first check is answered');
  facts.firstCheck = { serviceMs: round(first.outcome.serviceMs, TENTH), seenByJsMs: round(first.ms, TENTH) };
  const later: number[] = [];
  const laterService: number[] = [];
  for (let index = 0; index < LATER_CHECKS; index += 1) {
    const check = await checkOf(session);
    assert(check.outcome.kind === 'checked', 'A later check is answered');
    later.push(check.ms);
    laterService.push(check.outcome.serviceMs);
  }
  facts.laterChecks = {
    serviceMedianMs: round(percentile(laterService, MEDIAN), TENTH), serviceWorstMs: round(Math.max(...laterService), TENTH),
    seenByJsMedianMs: round(percentile(later, MEDIAN), TENTH), seenByJsWorstMs: round(Math.max(...later), TENTH),
  };

  // ---- Editor services over the same program: hover and inlay hints ---------------------------------------------------------
  const hoverAt = original.indexOf('NICKNAME_MIN_LENGTH') + 2;
  const hoverStarted = nowMs();
  const hover = await session.hover(INPUTS_LAB_PATH, hoverAt);
  facts.hoverMs = round(nowMs() - hoverStarted, TENTH);
  assert(hover !== null && hover.name === 'NICKNAME_MIN_LENGTH' && hover.type === '3' && hover.start === hoverAt - 2, `Hovering a constant gives its name and type: ${JSON.stringify(hover)}`);
  const stateHover = await session.hover(INPUTS_LAB_PATH, original.indexOf('const [state, setState]') + 'const ['.length);
  assert(stateHover !== null && stateHover.name === 'state' && stateHover.type === 'InputsState', `and a state variable its declared type: ${JSON.stringify(stateHover)}`);
  const hintsStarted = nowMs();
  const hints = await session.inlayHints(INPUTS_LAB_PATH, 0, original.length);
  facts.inlayHintsMs = round(nowMs() - hintsStarted, TENTH);
  assert(hints.some(hint => hint.kind === 'parameter' && hint.label === 'initialState:' && original.startsWith('false', hint.position)), `A literal argument gets its parameter's name: ${JSON.stringify(hints.slice(0, 3))}`);
  assert(hints.some(hint => hint.kind === 'type' && hint.label === ': readonly Choice[]' && original.slice(hint.position - 5, hint.position) === 'sizes'), 'and a variable with no annotation the type TypeScript inferred');
  assert(hints.every((hint, index) => index === 0 || (hints[index - 1]?.position ?? 0) <= hint.position), 'in the order of the text');
  facts.inlayHints = hints.length;

  // ---- An edit reaches the pixels and the properties, and the counter keeps its count --------------------------------------
  for (let presses = 0; presses < 3; presses += 1) await pressCounter(api);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 3', `The counter counts: ${textOf(api, COUNTER_TEST_ID)}`);
  const recoloured = applyEdits(original, RECOLOUR);
  const recolourStarted = nowMs();
  const recolour = await session.update(INPUTS_LAB_PATH, recoloured);
  assert(recolour.outcome === 'swapped' && recolour.evaluated.length === 1 && recolour.evaluated[0] === INPUTS_LAB_PATH, `A new colour and a new text are swapped in by evaluating the one module: ${JSON.stringify({ outcome: recolour.outcome, evaluated: recolour.evaluated, error: recolour.error })}`);
  const recolourPixelsMs = await waitForPaint(owner, api, EMERALD_100, recolourStarted);
  facts.editToPixelsMs = round(recolourPixelsMs, TENTH);
  facts.editTimings = recolour.timings;
  assert(backgroundOf(api) === EMERALD_100, `The page's background property is the new class's colour: ${backgroundOf(api)}`);
  assert(allTexts(api).includes('The input kit, live') && !allTexts(api).includes('The input kit'), `The title reads the new text: ${allTexts(api).slice(0, 3).join(' / ')}`);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 3', `and the counter kept its count through the edit: ${textOf(api, COUNTER_TEST_ID)}`);
  await capture('live-compile-02-edited', OVERFLOWING);
  assert(diagnosticsOf((await checkOf(session)).outcome).length === 0, 'The edited page type-checks clean');

  // ---- A changed hook order starts the state again, without a crash -------------------------------------------------------
  const reordered = applyEdits(recoloured, HOOK_ORDER);
  const reorder = await session.update(INPUTS_LAB_PATH, reordered);
  assert(reorder.outcome === 'swapped', `A changed hook order is swapped in: ${reorder.outcome} ${reorder.error ?? ''}`);
  await settleFrames();
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 0', `and the state starts again: ${textOf(api, COUNTER_TEST_ID)}`);
  assert(backgroundOf(api) === EMERALD_100, 'with the edited page');
  await pressCounter(api);
  await pressCounter(api);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 2', `and the reordered page works: ${textOf(api, COUNTER_TEST_ID)}`);
  // Back to the text before the reorder, for what follows: a counter at 2 that must survive each failed edit.
  const restored = await session.update(INPUTS_LAB_PATH, recoloured);
  assert(restored.outcome === 'swapped', `The hooks go back in their order: ${restored.outcome}`);
  await settleFrames();
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 0', `and the state starts again: ${textOf(api, COUNTER_TEST_ID)}`);
  await pressCounter(api);
  await pressCounter(api);
  const goodTexts = allTexts(api);
  const withoutCount = (texts: readonly string[]): string[] => texts.map(text => text.replace(/^Next \d+$/u, 'Next N'));
  const goodFingerprint = fingerprint(api);

  const unchanged = async (what: string): Promise<void> => {
    await settleFrames();
    assert(JSON.stringify(fingerprint(api)) === JSON.stringify(goodFingerprint), `${what}: the page is as it was (${allTexts(api).slice(0, 3).join(' / ')})`);
    assert(backgroundOf(api) === EMERALD_100 && paintIs(backgroundPaint(owner, api), EMERALD_100), `${what}: with its colour in the pixels`);
    assert(JSON.stringify(allTexts(api)) === JSON.stringify(goodTexts), `${what}: and its texts`);
  };

  // ---- A syntax error keeps the old page, and both tools say where it is ---------------------------------------------------
  const broken = applyEdits(recoloured, [SYNTAX_ERROR]);
  const syntax = await session.update(INPUTS_LAB_PATH, broken);
  const semicolon = anchorOffset(broken, SYNTAX_ERROR.anchor) + SYNTAX_ERROR.anchor.length - 1;
  assert(syntax.outcome === 'compile-failed', `A syntax error does not compile: ${syntax.outcome}`);
  assert(syntax.diagnostics[0]?.start === semicolon && syntax.diagnostics[0].severity === 'error', `and the compiler reports it at the semicolon (${semicolon}): ${JSON.stringify(syntax.diagnostics[0])}`);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 2', `and the counter is still at 2: ${textOf(api, COUNTER_TEST_ID)}`);
  await unchanged('A syntax error');
  const syntaxCheck = diagnosticsOf(await syntax.check);
  assert(syntaxCheck.some(diagnostic => diagnostic.pos === semicolon && diagnostic.category === 1), `and the checker reports a syntax error at the same offset: ${JSON.stringify(syntaxCheck.slice(0, 2))}`);

  // ---- A module that throws when it runs keeps the old page ----------------------------------------------------------------
  const throwsInModule = await session.update(INPUTS_LAB_PATH, applyEdits(recoloured, THROW_IN_MODULE));
  assert(throwsInModule.outcome === 'evaluation-failed' && throwsInModule.error === 'live-compile-test-module', `A module that throws is not swapped in, and says why: ${throwsInModule.outcome} ${throwsInModule.error}`);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 2', `and the counter is still at 2: ${textOf(api, COUNTER_TEST_ID)}`);
  await unchanged('A module that throws');

  // ---- A render that throws puts the last good version back ----------------------------------------------------------------
  console.log('GODOT_REACT_EXPECT_ERROR live-compile-test-render');
  const throwsInRender = await session.update(INPUTS_LAB_PATH, applyEdits(recoloured, THROW_IN_RENDER));
  assert(throwsInRender.outcome === 'render-failed' && throwsInRender.rolledBack && throwsInRender.error === 'live-compile-test-render', `A render that throws is rolled back, with its error: ${throwsInRender.outcome} ${throwsInRender.error}`);
  await settleFrames();
  assert(api.find('live-compile-error') === undefined, 'and no error page stays up');
  assert(JSON.stringify(withoutCount(allTexts(api))) === JSON.stringify(withoutCount(goodTexts)), `and the last good version is on screen (${allTexts(api).slice(0, 3).join(' / ')})`);
  assert(backgroundOf(api) === EMERALD_100 && paintIs(backgroundPaint(owner, api), EMERALD_100), 'with its colour');
  // The tree that threw was dropped, and the good one starts from its first render: the limit of React's recovery, recorded.
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 0', `(its state starts again, as React keeps nothing of a tree whose render threw: ${textOf(api, COUNTER_TEST_ID)})`);
  await pressCounter(api);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 1', `and it works: ${textOf(api, COUNTER_TEST_ID)}`);
  await capture('live-compile-03-rolled-back', OVERFLOWING);
  const afterRollback = await session.update(INPUTS_LAB_PATH, recoloured);
  assert(afterRollback.outcome === 'swapped', `and the next good edit swaps in: ${afterRollback.outcome} ${afterRollback.error ?? ''}`);
  assert(textOf(api, COUNTER_TEST_ID) === 'Next 1', `keeping its count: ${textOf(api, COUNTER_TEST_ID)}`);

  // ---- A type error does not stop the new code, and is reported where tsc reports it -------------------------------------------
  const typed = applyEdits(original, [TYPE_ERROR]);
  const typeError = await session.update(INPUTS_LAB_PATH, typed);
  assert(typeError.outcome === 'swapped', `A type error does not stop the new code running: ${typeError.outcome} ${typeError.error ?? ''}`);
  const typeAt = anchorOffset(typed, TYPE_ERROR.anchor);
  const typeDiagnostics = diagnosticsOf(await typeError.check);
  assert(typeDiagnostics.some(diagnostic => diagnostic.code === TYPE_ERROR.code && diagnostic.pos === typeAt), `and is reported as TS${TYPE_ERROR.code} at offset ${typeAt}, where tsc has it (scripts/live-compile-agreement.mjs): ${JSON.stringify(typeDiagnostics.slice(0, 3))}`);
  assert(backgroundOf(api) === SLATE_50, `and the page runs the new text, which has the original colour again: ${backgroundOf(api)}`);
  const fixed = await session.update(INPUTS_LAB_PATH, original);
  assert(fixed.outcome === 'swapped', 'The error is fixed and swapped in');
  assert(diagnosticsOf(await fixed.check).length === 0, 'and the checker has nothing to say');

  // ---- Components the parent's re-render does not reach: an element kept in useMemo, and a memo with the props it had ------------------------------------
  // React skips both when the lab renders again, so the refresh has to reach them itself, or they keep the code they were made from.
  const withMemo = applyEdits(original, MEMO_SETUP);
  const memoSetup = await session.update(INPUTS_LAB_PATH, withMemo);
  assert(memoSetup.outcome === 'swapped', `The lab with a kept element and a memo component runs: ${memoSetup.outcome} ${memoSetup.error ?? ''}`);
  await settleFrames();
  assert(textOf(api, 'kept-probe') === 'kept v1' && textOf(api, 'memo-probe') === 'memo v1 0', `Both are on the page: ${textOf(api, 'kept-probe')} / ${textOf(api, 'memo-probe')}`);
  await pressCounter(api);
  const memoRect = node(api, 'memo-probe').rect;
  for (let presses = 0; presses < 3; presses += 1) await click(new Vector2(memoRect.x + memoRect.width / 2, memoRect.y + memoRect.height / 2));
  assert(textOf(api, 'memo-probe') === 'memo v1 3' && textOf(api, 'inputs-next') === 'Next 1', `The memo component and the lab each have a count: ${textOf(api, 'memo-probe')} / ${textOf(api, 'inputs-next')}`);
  const memoEdited = await session.update(INPUTS_LAB_PATH, applyEdits(withMemo, MEMO_EDIT));
  assert(memoEdited.outcome === 'swapped', `Editing both is swapped in: ${memoEdited.outcome} ${memoEdited.error ?? ''}`);
  await settleFrames();
  assert(textOf(api, 'kept-probe') === 'kept v2', `The element the parent kept shows the edited component: ${textOf(api, 'kept-probe')}`);
  assert(textOf(api, 'memo-probe') === 'memo v2 3', `The memo component shows the edited code and kept its count: ${textOf(api, 'memo-probe')}`);
  assert(textOf(api, 'inputs-next') === 'Next 1', `and so did the lab: ${textOf(api, 'inputs-next')}`);
  assert((await session.update(INPUTS_LAB_PATH, original)).outcome === 'swapped', 'The original text swaps back in');
  await settleFrames();
  assert(!api.find('kept-probe') && !api.find('memo-probe'), 'and the two components are gone');

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
    text = withBackground(text, colour);
    const wanted = colour === 'bg-emerald-100' ? EMERALD_100 : SKY_100;
    const started = nowMs();
    report = await session.update(INPUTS_LAB_PATH, text);
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

  // ---- The service is busy: the page keeps its frames, and the edit that waits behind the service is swapped in when it is free -----------
  // The service thread is held for SERVICE_BUSY_MS, as a long check of a big lab would hold it, and an edit is made. Its compile queues behind the
  // hold. A call that waited for the thread would hold the page's frames for the same time; the page goes on drawing instead.
  const service = api.liveCompile();
  assert(service.state().threadsAlive === 1 && service.state().threadRunning, `The page has one service thread, running: ${JSON.stringify(service.state())}`);
  const busyEdit = withBackground(original, 'bg-emerald-100');
  const held = service.stall(SERVICE_BUSY_MS);
  await waitForServiceBusy(service);
  const busyFramesBefore = Engine.getProcessFrames();
  const busyStarted = nowMs();
  const busyUpdate = session.update(INPUTS_LAB_PATH, busyEdit);
  const midway: { state?: ReturnType<Tsc['state']>; report?: UpdateReport } = {};
  const busyWorstGap = await worstStall(async () => {
    await frames(MIDWAY_FRAMES);
    midway.state = service.state();
    midway.report = await busyUpdate;
  });
  const busyWaitedMs = nowMs() - busyStarted;
  const busyFrames = Engine.getProcessFrames() - busyFramesBefore;
  await held;
  assert(midway.state !== undefined && midway.state.running !== null && midway.state.queued >= 1,
    `The edit was waiting behind the service, which was busy: ${JSON.stringify(midway.state)}`);
  // The edit's check is asked for after its compile and answers after it: the update has returned, and the page takes that answer when it comes.
  await waitForRepliesTaken(service, 'after the edit made while the service was busy');
  assert(busyWaitedMs >= SERVICE_BUSY_MS * BUSY_WAIT_SHARE, `and it waited for the service (${round(busyWaitedMs, TENTH)} ms of the ${SERVICE_BUSY_MS} ms it was held)`);
  assert(busyWorstGap <= MAX_FRAME_GAP_MS, `but the page kept its frames: the longest gap was ${round(busyWorstGap, TENTH)} ms, over the ${MAX_FRAME_GAP_MS} ms allowed`);
  assert(busyFrames >= busyWaitedMs / MAX_FRAME_GAP_MS, `and drew ${busyFrames} frames meanwhile`);
  assert(midway.report?.outcome === 'swapped' && backgroundOf(api) === EMERALD_100, `The edit was swapped in when the service was free: ${midway.report?.outcome}, ${backgroundOf(api)}`);
  facts.serviceBusy = { heldMs: SERVICE_BUSY_MS, editWaitedMs: round(busyWaitedMs, TENTH), worstFrameGapMs: round(busyWorstGap, TENTH), frames: busyFrames };

  // ---- A stale answer is dropped ---------------------------------------------------------------------------------------------------------
  // Two edits of the file are made while the service is busy. The older is taken back when the newer is made: its compile, which had not
  // begun, is taken out of the service's queue and never runs, and the older `update` answers `superseded`. The page never shows its text.
  const staleHold = service.stall(STALE_BUSY_MS);
  await waitForServiceBusy(service);
  const older = session.update(INPUTS_LAB_PATH, withBackground(original, 'bg-sky-100'));
  const newer = session.update(INPUTS_LAB_PATH, withBackground(original, 'bg-emerald-100'));
  const queuedAfterTwoEdits = service.state().queued;
  let bothAnswered = false;
  void Promise.all([older, newer]).then(() => { bothAnswered = true; });
  let olderShown = false;
  while (!bothAnswered) {
    await frames(1);
    if (backgroundOf(api) === SKY_100) olderShown = true;
  }
  const [olderReport, newerReport] = await Promise.all([older, newer]);
  await staleHold;
  assert(queuedAfterTwoEdits === QUEUED_AFTER_TWO_EDITS, `The older edit's compile was taken out of the service's queue (the project changes, the newer compile and check were left): ${queuedAfterTwoEdits} jobs`);
  assert(olderReport.outcome === 'superseded', `The older edit answers superseded: ${olderReport.outcome}`);
  assert(newerReport.outcome === 'swapped', `and the newer one is swapped in: ${newerReport.outcome}`);
  assert(!olderShown && backgroundOf(api) === EMERALD_100, `The page never showed the older text, and shows the newer: ${backgroundOf(api)}`);
  await waitForServiceIdle(service, 'after the two edits');
  // The newer edit's check may answer after its compile: the page takes that answer on its next poll. Nothing else may be left.
  await waitForRepliesTaken(service, 'after the two edits');
  assert(service.state().replies === 0 && service.outstandingCount === 0, `Nothing of the older edit is left in the service: ${JSON.stringify(service.state())}`);

  // A request the service is running when it is given up is let finish, and the service drops its answer: nobody is told of it.
  const abandoned = new RequestScope();
  const abandonedStall = service.stall(STALE_BUSY_MS, abandoned);
  await waitForServiceBusy(service);
  abandoned.cancel();
  const abandonedEnd = await abandonedStall.then(() => 'answered', (error: unknown) => (error instanceof RequestCancelled ? 'cancelled' : String(error)));
  assert(abandonedEnd === 'cancelled' && service.outstandingCount === 0, `A request given up while it runs fails as cancelled: ${abandonedEnd}`);
  await waitForServiceIdle(service, 'after the request that was given up');
  await frames(MIDWAY_FRAMES);
  assert(service.state().replies === 0, `and its answer was dropped by the service, not kept: ${JSON.stringify(service.state())}`);
  assert((await session.update(INPUTS_LAB_PATH, original)).outcome === 'swapped', 'The session goes on after both');
  facts.threadsAlive = service.state().threadsAlive;

  // ---- What the service spends on each lab: whether any of them could hold the queue ------------------------------------------------------
  facts.labs = await measureLabs(service);

  session.unmount();

  // ---- A page whose workers are used up: the lab still opens, and the frames go on ---------------------------------------------------------
  // The service starts again behind more threads than a browser's pool has workers for. On the Web its thread then needs a worker that the pool
  // cannot give until the page's own thread returns to its event loop, and that is what a call that waited for the thread never let it do.
  api.holdLiveCompileThreads(POOL_HOGS);
  api.restartLiveCompile();
  const crowded = api.openLiveSession(LAB_ID, EXPORT_NAME);
  const crowdedStarted = nowMs();
  const crowdedWorstGap = await worstStall(async () => { await crowded.open(); });
  facts.crowdedOpen = { threads: api.liveCompile().state().threadsAlive, openMs: round(nowMs() - crowdedStarted, TENTH), worstFrameGapMs: round(crowdedWorstGap, TENTH) };
  assert(crowdedWorstGap <= MAX_FRAME_GAP_MS, `The lab opens with the pool used up and the page keeps its frames: the longest gap was ${round(crowdedWorstGap, TENTH)} ms`);
  assert(JSON.stringify(fingerprint(api)) === JSON.stringify(bundled), 'and it is the lab the bundle has');
  crowded.unmount();
  api.releaseLiveCompileThreads();
  facts.threadsGivenBack = await verifyThreadsAreGivenBack(api);

  // ---- The reported sequence, with the code panel open ---------------------------------------------------------------------------------------------
  facts.sequence = await verifyLiveCompileSequence(api);

  // ---- Every lab with the code panel open: the page keeps one thread, and every lab compiles ---------------------------------------------------
  facts.labWalk = await verifyLabWalk(api);

  api.restoreDemo();
  await settleFrames();
  console.log('GODOT_REACT_LIVE_COMPILE', JSON.stringify(facts));
}
