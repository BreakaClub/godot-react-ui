import { Engine, Time, Vector2 } from 'godot';
import type { LayoutRect, NativeSnapshot, NativeSnapshotNode } from '../../src/native';
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
