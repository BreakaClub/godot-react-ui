import { Engine, Time, Vector2 } from 'godot';
import type { LayoutRect, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import type { ExtensionHost } from './live-compile-service';
import { assertionTally } from './verifier-input';
import { settleFrames } from './verify-filters';
import { click } from './verify-text-input';

/**
 * Ben's sequence (docs/tracks/live-compile-async.md): the code panel open on a lab, on to a lab that has no code (a scene), then to the
 * next lab that has some, and the page never stops. On react.breaka.club that last step froze the page for 30 s and ended in a read-only
 * panel, because the compile of the new lab waited for a service thread that the browser could not start while the page waited.
 *
 * It runs on a service whose thread needs a worker the page's pool has not got (`holdLiveCompileThreads` starts more threads than a browser's
 * pool holds, then the page's own service is started again behind them), and holds the page to this: the frame never goes more than
 * `MAX_FRAME_GAP_MS` without being served, the panel is there as soon as the button is pressed and editable, the lab then becomes live, and the
 * panel never ends read-only. Natively a thread is cheap and the sequence is the same sequence; on the Web it is the failing one.
 */
export interface SequenceInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showNavigator(options?: { initialLab?: string }): void;
  restoreDemo(): void;
  holdLiveCompileThreads(count: number): number;
  releaseLiveCompileThreads(): void;
  restartLiveCompile(): void;
  /** The labs in the navigator's order. */
  labs(): readonly { readonly id: string; readonly title: string; readonly kind: string }[];
  /** The page's service: its state tells how many service threads the process has. */
  liveCompile(): ExtensionHost;
}

/** The lab the sequence starts on, the lab after it (a scene, so no code), and the one after that. */
const FIRST_LAB = 'hud';
const SCENE_LAB = 'world';
const LAST_LAB = 'accessibility';
/** The longest the page may go without a frame: ten frames a second. */
export const MAX_FRAME_GAP_MS = 100;
/** More threads than a browser's pool (the engine's `emscriptenPoolSize`, 8) has workers for. */
export const POOL_HOGS = 12;
const FRAME_POLL_MS = 1;
const MILLISECONDS_PER_MICROSECOND = 1000;
/** The page's own work in the sequence (mounting a lab, mounting the panel) is slower on a loaded machine than the idle waits: the whole sequence is held to this. */
const SEQUENCE_GAP_BOUND_MS = 1_000;
const STEP_DEADLINE_MS = 60_000;
const PANEL_DEADLINE_MS = 2_000;
const TENTH = 10;
/** `md:` (README: Styles): from here the Code button is offered; a narrower window has no room for the page and its code together. */
const PHONE_BREAKPOINT_PX = 768;
/** Ben went through at least this many labs with the code panel open before the page hung. */
const MIN_LAB_CHANGES = 20;
const THREAD_DEADLINE_MS = 10_000;

/**
 * The number of Workers the page has made, on the Web, when the verifier that drives the page counts them (`godotReactWorkerCount`, installed
 * before the page's scripts run: there is no other way to see a Worker from inside the page). Natively, and when nobody counts: nothing.
 */
function workerCount(): number | undefined {
  const probe: unknown = Reflect.get(globalThis, 'godotReactWorkerCount');
  if (typeof probe !== 'function') return undefined;
  const count: unknown = Reflect.apply(probe, undefined, []);
  return typeof count === 'number' ? count : undefined;
}

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

function nowMs(): number {
  return Time.getTicksUsec() / MILLISECONDS_PER_MICROSECOND;
}

async function waitUntil(what: string, predicate: () => boolean, deadlineMs: number): Promise<number> {
  const started = nowMs();
  while (!predicate()) {
    assert(nowMs() - started < deadlineMs, `Timed out after ${deadlineMs} ms waiting for ${what}`);
    await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
  }
  return nowMs() - started;
}

function centerOf(rect: LayoutRect): Vector2 {
  return new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function textOf(api: SequenceInspection, testID: string): string {
  const snapshot = api.snapshot();
  const byId = new Map(snapshot.nodes.map(entry => [entry.id, entry]));
  const entry = api.find(testID);
  assert(entry, `Missing test target ${testID}`);
  const collect = (current: NativeSnapshotNode): string => (current.text !== '' ? current.text : current.children.map(id => byId.get(id)).map(child => (child === undefined ? '' : collect(child))).join(''));
  return collect(entry);
}

/** The longest gap between two turns of a 1 ms timer while `work` runs, and the frames the engine drew meanwhile. */
async function frameGaps(work: () => Promise<void>): Promise<{ readonly worstMs: number; readonly frames: number }> {
  let running = true;
  let worst = 0;
  const firstFrame = Engine.getProcessFrames();
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
  return { worstMs: worst, frames: Engine.getProcessFrames() - firstFrame };
}

function assertNoStall(wait: { readonly worstMs: number; readonly frames: number }, what: string): void {
  assert(wait.worstMs <= MAX_FRAME_GAP_MS, `The page never went ${MAX_FRAME_GAP_MS} ms without a frame ${what} (it hung for 30 s here on the Web): the longest gap was ${Math.round(wait.worstMs)} ms`);
  assert(wait.frames >= 1, `and frames kept coming ${what}`);
}

export async function verifyLiveCompileSequence(api: SequenceInspection): Promise<Record<string, unknown>> {
  if (api.snapshot().width < PHONE_BREAKPOINT_PX) return { skipped: 'the window is narrower than the Code button\'s breakpoint' };
  api.showNavigator({ initialLab: FIRST_LAB });
  await settleFrames();
  assert(textOf(api, 'lab-title') === 'HUD over the game', `The sequence starts on the HUD lab: ${textOf(api, 'lab-title')}`);
  assert((api.find('toggle-code')?.rect.width ?? 0) > 0, 'whose header has the Code button');
  // The service of the page starts again behind more threads than a browser has workers for: it needs a thread the pool cannot give at once.
  api.holdLiveCompileThreads(POOL_HOGS);
  api.restartLiveCompile();

  const facts: Record<string, number> = {};
  let liveMs = 0;
  let lastLiveMs = 0;
  // The waits for the compile are idle for the page, so every gap in them is the page waiting on the service: none may pass MAX_FRAME_GAP_MS. The page's own
  // work (mounting a lab, mounting the panel) has frames of its own that are slower than that on a loaded machine, and is bounded more loosely.
  const wholeSequence = await frameGaps(async () => {
    await click(centerOf(node(api, 'toggle-code').rect));
    facts.panelMs = await waitUntil('the code panel, editable, while the lab compiles', () => api.find('code-editor') !== undefined, PANEL_DEADLINE_MS);
    assert(api.find('code-read-only') === undefined, 'The panel is not read-only');
    const firstWait = await frameGaps(async () => {
      liveMs = await waitUntil('the lab on the HUD to be live', () => textOf(api, 'code-status-run').startsWith('Live.'), STEP_DEADLINE_MS);
    });
    assertNoStall(firstWait, `waiting for the HUD lab to be compiled (${Math.round(liveMs)} ms)`);

    await click(centerOf(node(api, 'lab-next').rect));
    await waitUntil('the scene lab', () => api.find('lab-launch') !== undefined, STEP_DEADLINE_MS);
    assert(api.find('code-editor') === undefined, `The scene lab has no code: ${textOf(api, 'lab-title')}`);

    await click(centerOf(node(api, 'lab-next').rect));
    await waitUntil('the last lab', () => api.find('code-editor') !== undefined, PANEL_DEADLINE_MS);
    assert(textOf(api, 'lab-title') === 'Accessibility', `The sequence ends on the Accessibility lab: ${textOf(api, 'lab-title')}`);
    const lastWait = await frameGaps(async () => {
      lastLiveMs = await waitUntil('the Accessibility lab to be live', () => textOf(api, 'code-status-run').startsWith('Live.') || api.find('code-read-only') !== undefined, STEP_DEADLINE_MS);
    });
    assert(api.find('code-read-only') === undefined, `The Accessibility lab's code opens and compiles, it does not end read-only: ${api.find('code-read-only') === undefined ? '' : textOf(api, 'code-read-only')}`);
    assert(textOf(api, 'code-status-run').startsWith('Live.'), `and the panel says the lab is live: ${textOf(api, 'code-status-run')}`);
    assertNoStall(lastWait, `waiting for the Accessibility lab to be compiled (${Math.round(lastLiveMs)} ms)`);
    facts.liveMs = liveMs;
    facts.lastLiveMs = lastLiveMs;
    facts.waitFrames = firstWait.frames + lastWait.frames;
    facts.waitWorstGapMs = Math.max(firstWait.worstMs, lastWait.worstMs);
  });
  assert(wholeSequence.worstMs <= SEQUENCE_GAP_BOUND_MS, `and the sequence as a whole, mounting included, never went ${SEQUENCE_GAP_BOUND_MS} ms without a frame (the lab on the Web hung for 30 s here): ${Math.round(wholeSequence.worstMs)} ms`);

  api.releaseLiveCompileThreads();
  api.restoreDemo();
  await settleFrames();
  return {
    ...facts, sequenceWorstGapMs: Math.round(wholeSequence.worstMs * TENTH) / TENTH, sequenceFrames: wholeSequence.frames, hogs: POOL_HOGS, labs: [FIRST_LAB, SCENE_LAB, LAST_LAB],
  };
}

function node(api: SequenceInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing test target ${testID}`);
  return found;
}

/**
 * Every lab with the code panel open, as Ben went through them: the panel stays open while the lab changes, each lab with code opens, compiles and goes
 * live, and the page and the service stay what they were. A lab change used to start a service thread of its own that nothing ended, and a browser has
 * eight Workers for them all, so after a dozen labs the next one hung the page for 30 s. Held to:
 *
 * - at least `MIN_LAB_CHANGES` lab changes, the code panel open throughout;
 * - every lab with code is live (compiled and run) and none ends read-only;
 * - the page has one service thread the whole way, and, on the Web, makes no Worker (the Worker count at the end is the count at the start);
 * - the page never goes `MAX_FRAME_GAP_MS` without a frame while a lab waits for its compile.
 */
export async function verifyLabWalk(api: SequenceInspection): Promise<Record<string, unknown>> {
  if (api.snapshot().width < PHONE_BREAKPOINT_PX) return { skipped: 'the window is narrower than the Code button\'s breakpoint' };
  const labs = api.labs();
  const [first] = labs;
  assert(first !== undefined && labs.length > MIN_LAB_CHANGES, `There are more than ${MIN_LAB_CHANGES} labs to walk through: ${labs.length}`);
  api.restartLiveCompile();
  api.showNavigator({ initialLab: first.id });
  await settleFrames();
  const service = (): ExtensionHost => api.liveCompile();
  await click(centerOf(node(api, 'toggle-code').rect));
  await waitUntil('the first lab\'s code panel', () => api.find('code-editor') !== undefined, PANEL_DEADLINE_MS);
  await waitUntil('the first lab to be live', () => textOf(api, 'code-status-run').startsWith('Live.'), STEP_DEADLINE_MS);
  const threadsAtStart = service().state().threadsAlive;
  const workersAtStart = workerCount();
  assert(threadsAtStart === 1, `The page has one service thread to begin with: ${threadsAtStart}`);

  let changes = 0;
  let withCode = 0;
  let worstWaitGapMs = 0;
  let waitFrames = 0;
  let mostThreads = threadsAtStart;
  const wholeWalk = await frameGaps(async () => {
    for (const lab of labs.slice(1)) {
      await click(centerOf(node(api, 'lab-next').rect));
      changes += 1;
      await waitUntil(`the title of ${lab.title}`, () => textOf(api, 'lab-title') === lab.title, STEP_DEADLINE_MS);
      if (lab.kind === 'inline') {
        await waitUntil(`the code panel of ${lab.title}`, () => api.find('code-editor') !== undefined, PANEL_DEADLINE_MS);
        const wait = await frameGaps(async () => {
          await waitUntil(`${lab.title} to be live or read-only`, () => textOf(api, 'code-status-run').startsWith('Live.') || api.find('code-read-only') !== undefined, STEP_DEADLINE_MS);
        });
        assert(api.find('code-read-only') === undefined, `The code of ${lab.title} compiles, it does not end read-only: ${api.find('code-read-only') === undefined ? '' : textOf(api, 'code-read-only')}`);
        assert(textOf(api, 'code-status-run').startsWith('Live.'), `${lab.title} is live: ${textOf(api, 'code-status-run')}`);
        assertNoStall(wait, `while ${lab.title} compiled`);
        worstWaitGapMs = Math.max(worstWaitGapMs, wait.worstMs);
        waitFrames += wait.frames;
        withCode += 1;
      } else {
        await waitUntil(`${lab.title} to have no code panel`, () => api.find('code-editor') === undefined, PANEL_DEADLINE_MS);
      }
      const threads = service().state().threadsAlive;
      mostThreads = Math.max(mostThreads, threads);
      assert(threads === threadsAtStart, `The page still has one service thread after ${changes} lab changes (${lab.title}): ${threads}`);
    }
  });
  assert(changes >= MIN_LAB_CHANGES && withCode >= MIN_LAB_CHANGES / 2, `The walk changed lab ${changes} times, ${withCode} of them to a lab with code`);
  const workersAtEnd = workerCount();
  assert(workersAtEnd === workersAtStart, `and the page made no Worker on the way: ${workersAtStart} at the start, ${workersAtEnd} at the end`);
  assert(wholeWalk.worstMs <= SEQUENCE_GAP_BOUND_MS * 2, `and the walk as a whole, mounting included, never went ${SEQUENCE_GAP_BOUND_MS * 2} ms without a frame: ${Math.round(wholeWalk.worstMs)} ms`);
  api.restoreDemo();
  await settleFrames();
  return {
    labChanges: changes, labsWithCode: withCode, threads: { atStart: threadsAtStart, most: mostThreads }, workers: { atStart: workersAtStart, atEnd: workersAtEnd },
    waitWorstGapMs: Math.round(worstWaitGapMs * TENTH) / TENTH, waitFrames, walkWorstGapMs: Math.round(wholeWalk.worstMs * TENTH) / TENTH,
  };
}

/**
 * A service that ends gives its thread back. `holdLiveCompileThreads` starts more threads than the pool holds; releasing them ends them (a stopped service
 * is not joined: its thread finishes and goes), and the threads of the process fall back to the one the page's service has. On the Web the Workers they used
 * go back to the pool, and holding as many again makes no new Worker.
 */
export async function verifyThreadsAreGivenBack(api: SequenceInspection): Promise<Record<string, unknown>> {
  const service = api.liveCompile();
  const baseline = service.state().threadsAlive;
  const round = async (): Promise<number> => {
    api.holdLiveCompileThreads(POOL_HOGS);
    await waitUntil('the held threads to run', () => service.state().threadsAlive === baseline + POOL_HOGS, THREAD_DEADLINE_MS);
    api.releaseLiveCompileThreads();
    await waitUntil('the released threads to end', () => service.state().threadsAlive === baseline, THREAD_DEADLINE_MS);
    return workerCount() ?? 0;
  };
  const workersAfterFirst = await round();
  const workersAfterSecond = await round();
  assert(workersAfterSecond === workersAfterFirst, `Threads that ended gave their Workers back: holding ${POOL_HOGS} again made ${workersAfterSecond - workersAfterFirst} new ones`);
  return { baselineThreads: baseline, held: POOL_HOGS, workersAfterFirst, workersAfterSecond };
}
