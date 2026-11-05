// Phase F0 evidence probe, run with `--probe` (native) or `godotReactDemo.runProbe()` (Web). It needs a
// build with the `probe` cargo feature; a default build has no `ReactUiProbe` class and the probe says so.
import { Engine, OS, Performance, RefCounted, Time } from 'godot';
import { ReactUiProbe } from 'godot';

// The probe classes exist only in probe builds, so they are declared here instead of in the generated
// typings: a default `gen:types` must not describe classes a default build does not contain.
declare module 'godot' {
  class ReactUiProbeHandle extends RefCounted {}
  class ReactUiProbe extends RefCounted {
    makeHandle(tag: number): ReactUiProbeHandle;
    liveHandles(): number;
    noop(): void;
    stringLength(propsJson: string): number;
    probeParse(propsJson: string): string;
    countHandlesTyped(handles: ReactUiProbeHandle[]): number;
    countHandlesUntyped(handles: ReactUiProbeHandle[]): number;
  }
}

type ProbeHandle = ReturnType<ReactUiProbe['makeHandle']>;

/** Plan Appendix A. */
const PROBE_HANDLE_COUNT = 100_000;
const PROBE_RECLAIM_TIMEOUT_S = 30;
/** Mirrors `PROBE_PAYLOAD_BYTES` in native/probe.rs: the heap data each handle owns. */
const PROBE_PAYLOAD_BYTES = 64;
/** F0 decision gate: a 2,000-node full clone must fit one 60 Hz frame on Web. */
const MAX_HANDLE_CALL_US_NATIVE = 10;
const MAX_HANDLE_CALL_US_WEB = 30;

const RECLAIM_POLL_MS = 1000;
const CLOCK_SAMPLES = 100_000;
const CALL_SAMPLES = 20_000;
const PARSE_CALLS = 10_000;
const ARRAY_SIZES = [1, 50, 500] as const;
const ARRAY_CALLS = 2_000;
const CHURN_PEAK_SAMPLE_EVERY = 1_000;
const PRESSURE_ROUNDS = 40;
/** Supplementary steady-state pass: commits of a 2,000-node tree (the F4 scenario), one frame apart. */
const STEADY_COMMITS = 300;
const STEADY_NODES = 2_000;
const STEADY_FRAME_MS = 16;
const PRESSURE_OBJECTS = 250_000;
const NANOSECONDS_PER_MICROSECOND = 1000;
const MICROSECONDS_PER_MILLISECOND = 1000;

/**
 * A compiled style that sets every property of the longhand `StyleSpec` (38 since Phase F3 removed the
 * shorthands, `disabled` and `overflow`; it was 40 properties of the v1 spec) and a 3-key diff.
 */
const THREE_KEY_DIFF = JSON.stringify({ backgroundColor: '#d1fae5', opacity: 0.5, width: 120 });
const FORTY_PROPERTY_STYLE = JSON.stringify({
  width: 120, height: 40, minWidth: 10, minHeight: 10, maxWidth: 500, maxHeight: 400,
  display: 'flex', flexDirection: 'row', flexWrap: 'wrap', flexGrow: 1, flexShrink: 0, flexBasis: '50%',
  rowGap: 4, columnGap: 4,
  paddingTop: 1, paddingRight: 2, paddingBottom: 3, paddingLeft: 4,
  marginTop: 1, marginRight: 2, marginBottom: 3, marginLeft: 4,
  alignItems: 'center', alignSelf: 'flex-start', justifyContent: 'space-between', gridTemplateColumns: 3,
  backgroundColor: '#e0e7ff', color: '#0f172a', fontSize: 14, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1',
  opacity: 0.9, textAlign: 'left', interpolateSize: 'numeric-only', overflowX: 'hidden', overflowY: 'hidden',
  transition: { properties: ['width'], durationMs: 100 },
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function now(): number {
  return Time.getTicksUsec();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface Distribution {
  samples: number;
  minUs: number;
  medianUs: number;
  p95Us: number;
  p99Us: number;
  maxUs: number;
  meanUs: number;
}

function distribution(values: Float64Array): Distribution {
  const sorted = Float64Array.from(values).sort();
  const at = (fraction: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
  let sum = 0;
  for (const value of sorted) sum += value;
  return {
    samples: sorted.length, minUs: sorted[0] ?? 0, medianUs: at(0.5), p95Us: at(0.95), p99Us: at(0.99),
    maxUs: sorted[sorted.length - 1] ?? 0, meanUs: sum / sorted.length,
  };
}

/** Time `count` calls of `call`, once as a batch (mean per call) and once call by call (distribution). */
function timeCalls(count: number, call: (index: number) => unknown): { batchMeanUs: number; perCall: Distribution } {
  const batchStart = now();
  for (let index = 0; index < count; index++) call(index);
  const batchMeanUs = (now() - batchStart) / count;
  const samples = new Float64Array(count);
  for (let index = 0; index < count; index++) {
    const started = now();
    call(index);
    samples[index] = now() - started;
  }
  return { batchMeanUs, perCall: distribution(samples) };
}

interface ReclaimSample {
  seconds: number;
  live: number;
  objectCount: number;
  processFrame: number;
}

interface Reclaim {
  startLive: number;
  peakLive: number;
  series: ReclaimSample[];
  /** First whole second at which `liveHandles()` was back at its starting value, or null at the timeout. */
  reclaimedAtSeconds: number | null;
  /** If the timeout expired: whether allocating garbage made V8 collect, and after how many rounds. */
  underAllocationPressure: { reclaimed: boolean; rounds: number; live: number } | null;
}

function observation(probe: ReactUiProbe, seconds: number): ReclaimSample {
  return {
    seconds, live: probe.liveHandles(), objectCount: Performance.getMonitor(Performance.Monitor.ObjectCount),
    processFrame: Engine.getProcessFrames(),
  };
}

/** Allocate JS garbage until the live handle count falls to `target` or the round limit is reached. */
async function allocationPressure(probe: ReactUiProbe, target: number): Promise<{ reclaimed: boolean; rounds: number; live: number }> {
  let rounds = 0;
  let live = probe.liveHandles();
  while (rounds < PRESSURE_ROUNDS && live > target) {
    const garbage = Array.from({ length: PRESSURE_OBJECTS }, (_, index) => ({ index, label: `garbage-${index}` }));
    assert(garbage.length === PRESSURE_OBJECTS, 'allocation pressure produced garbage');
    await sleep(0);
    rounds += 1;
    live = probe.liveHandles();
  }
  return { reclaimed: live <= target, rounds, live };
}

/**
 * The caller has dropped every reference. Keep the engine rendering frames and sample the live count
 * and Godot's object count once a second until it returns to its starting value or the timeout.
 */
async function observeReclaim(probe: ReactUiProbe, startLive: number, peakLive: number): Promise<Reclaim> {
  const series: ReclaimSample[] = [];
  let reclaimedAtSeconds: number | null = null;
  for (let seconds = 0; seconds <= PROBE_RECLAIM_TIMEOUT_S; seconds++) {
    const sample = observation(probe, seconds);
    series.push(sample);
    if (sample.live <= startLive) {
      reclaimedAtSeconds = seconds;
      break;
    }
    await sleep(RECLAIM_POLL_MS);
  }
  // Supplementary evidence only: does V8 collect once the JS heap is under pressure?
  const underAllocationPressure = reclaimedAtSeconds === null ? await allocationPressure(probe, startLive) : null;
  return { startLive, peakLive, series, reclaimedAtSeconds, underAllocationPressure };
}

async function measureHandles(probe: ReactUiProbe) {
  const clockSamples = new Float64Array(CLOCK_SAMPLES);
  for (let index = 0; index < CLOCK_SAMPLES; index++) {
    const first = now();
    clockSamples[index] = now() - first;
  }
  const clock = distribution(clockSamples);

  // Earlier tests left garbage handles. Collect them first so every pass starts from a settled count:
  // V8 may otherwise free them in the middle of a pass and distort its accounting.
  const settled = await allocationPressure(probe, 0);
  assert(settled.reclaimed, `Could not settle earlier garbage: ${settled.live} handles remain live`);

  // Pass 1: create PROBE_HANDLE_COUNT handles and keep them, timing the whole loop.
  let startLive = probe.liveHandles();
  let handles: ProbeHandle[] = [];
  const batchStart = now();
  for (let index = 0; index < PROBE_HANDLE_COUNT; index++) handles.push(probe.makeHandle(index));
  const retainedBatchMeanUs = (now() - batchStart) / PROBE_HANDLE_COUNT;
  let peakLive = probe.liveHandles();
  assert(peakLive - startLive === PROBE_HANDLE_COUNT, `Handle counter saw ${peakLive - startLive} of ${PROBE_HANDLE_COUNT}`);
  handles.length = 0;
  handles = [];
  const retainedBatchReclaim = await observeReclaim(probe, startLive, peakLive);

  // Pass 2: the same, timing every call individually.
  startLive = probe.liveHandles();
  const samples = new Float64Array(PROBE_HANDLE_COUNT);
  handles = [];
  for (let index = 0; index < PROBE_HANDLE_COUNT; index++) {
    const started = now();
    const handle = probe.makeHandle(index);
    samples[index] = now() - started;
    handles.push(handle);
  }
  peakLive = probe.liveHandles();
  handles.length = 0;
  handles = [];
  const retainedTimedReclaim = await observeReclaim(probe, startLive, peakLive);
  const timed = distribution(samples);

  // Pass 3: churn. Each handle is dropped at once, like the instances of a commit React discards.
  startLive = probe.liveHandles();
  peakLive = startLive;
  const churnStart = now();
  for (let index = 0; index < PROBE_HANDLE_COUNT; index++) {
    probe.makeHandle(index);
    if (index % CHURN_PEAK_SAMPLE_EVERY === 0) peakLive = Math.max(peakLive, probe.liveHandles());
  }
  const churnMeanUs = (now() - churnStart) / PROBE_HANDLE_COUNT;
  peakLive = Math.max(peakLive, probe.liveHandles());
  const churnReclaim = await observeReclaim(probe, startLive, peakLive);

  return {
    count: PROBE_HANDLE_COUNT, payloadBytes: PROBE_PAYLOAD_BYTES,
    clockPairOverhead: clock,
    retainedBatchMeanUs, retainedTimed: timed, retainedBatchReclaim, retainedTimedReclaim,
    churnMeanUs, churnReclaim,
  };
}

interface SteadyInstance {
  tag: number;
  handle: ProbeHandle;
  props: { tag: number; style: { backgroundColor: string; opacity: number } };
  children: SteadyInstance[];
}

/**
 * Supplementary evidence, outside the F0 gate: does JS garbage collection give handles back while a
 * renderer is committing? Each commit allocates a handle plus the JS objects React would allocate for
 * every node of a 2,000-node tree, and the previous commit's tree stays reachable for one more commit,
 * as React's current and work-in-progress trees do.
 */
async function measureSteadyState(probe: ReactUiProbe) {
  const settled = await allocationPressure(probe, 0);
  assert(settled.reclaimed, `Could not settle earlier garbage: ${settled.live} handles remain live`);
  const startLive = probe.liveHandles();
  const liveAfterCommit: number[] = [];
  const commitMs: number[] = [];
  const retainedPrevious: number[] = [];
  let current: SteadyInstance[] = [];
  let previous: SteadyInstance[] = [];
  for (let commit = 0; commit < STEADY_COMMITS; commit++) {
    const started = now();
    const next: SteadyInstance[] = new Array<SteadyInstance>(STEADY_NODES);
    for (let index = 0; index < STEADY_NODES; index++) {
      next[index] = { tag: index, handle: probe.makeHandle(index), props: { tag: index, style: { backgroundColor: '#e0e7ff', opacity: 1 } }, children: [] };
    }
    previous = current;
    current = next;
    commitMs.push((now() - started) / MICROSECONDS_PER_MILLISECOND);
    liveAfterCommit.push(probe.liveHandles() - startLive);
    // Reading the previous generation each commit keeps it reachable until the next one replaces it.
    retainedPrevious.push(previous.length);
    await sleep(STEADY_FRAME_MS);
  }
  const peak = Math.max(...liveAfterCommit);
  const secondHalf = liveAfterCommit.slice(STEADY_COMMITS / 2);
  const firstDecrease = liveAfterCommit.findIndex((live, commit) => commit > 0 && live < (liveAfterCommit[commit - 1] ?? 0));
  const sampledSeries = liveAfterCommit.filter((_, commit) => commit % 10 === 0);
  const created = STEADY_COMMITS * STEADY_NODES;
  assert(current.length === STEADY_NODES && retainedPrevious.length === STEADY_COMMITS, 'the final generations were retained to the end');
  current = [];
  previous = [];
  return {
    commits: STEADY_COMMITS, nodesPerCommit: STEADY_NODES, handlesCreated: created, frameMs: STEADY_FRAME_MS,
    commitMeanMs: commitMs.reduce((sum, value) => sum + value, 0) / commitMs.length,
    peakLive: peak, liveAtEnd: liveAfterCommit[liveAfterCommit.length - 1] ?? 0,
    secondHalfMinLive: Math.min(...secondHalf), secondHalfMaxLive: Math.max(...secondHalf),
    firstDecreaseAtCommit: firstDecrease === -1 ? null : firstDecrease,
    liveEveryTenthCommit: sampledSeries,
    reclaim: await observeReclaim(probe, startLive, peak),
  };
}

function measureBoundaries(probe: ReactUiProbe) {
  assert(probe.probeParse(THREE_KEY_DIFF) === '', `3-key diff must validate: ${probe.probeParse(THREE_KEY_DIFF)}`);
  assert(probe.probeParse(FORTY_PROPERTY_STYLE) === '', `40-property style must validate: ${probe.probeParse(FORTY_PROPERTY_STYLE)}`);
  assert(Object.keys(JSON.parse(FORTY_PROPERTY_STYLE)).length === 38, 'the style sets all 38 properties');
  const props = (json: string) => ({
    bytes: json.length,
    marshalling: timeCalls(PARSE_CALLS, () => probe.stringLength(json)),
    parse: timeCalls(PARSE_CALLS, () => probe.probeParse(json)),
  });
  return {
    callFloor: timeCalls(CALL_SAMPLES, () => probe.liveHandles()),
    noop: timeCalls(CALL_SAMPLES, () => probe.noop()),
    threeKeyDiff: props(THREE_KEY_DIFF),
    fortyPropertyStyle: props(FORTY_PROPERTY_STYLE),
  };
}

function measureArrays(probe: ReactUiProbe) {
  const pool: ProbeHandle[] = [];
  for (let index = 0; index < Math.max(...ARRAY_SIZES); index++) pool.push(probe.makeHandle(index));
  const result: Record<string, unknown> = {};
  for (const size of ARRAY_SIZES) {
    const array = pool.slice(0, size);
    let expected = 0;
    for (let index = 0; index < size; index++) expected += PROBE_PAYLOAD_BYTES + index;
    for (const kind of ['typed', 'untyped'] as const) {
      const call = () => (kind === 'typed' ? probe.countHandlesTyped(array) : probe.countHandlesUntyped(array));
      let outcome: unknown;
      try {
        const sum = call();
        assert(sum === expected, `${kind} array of ${size} summed to ${sum}, expected ${expected}`);
        const timing = timeCalls(ARRAY_CALLS, call);
        outcome = {
          batchMeanUs: timing.batchMeanUs, perCall: timing.perCall,
          perElementNs: timing.batchMeanUs * NANOSECONDS_PER_MICROSECOND / size,
        };
      } catch (error) {
        outcome = { error: error instanceof Error ? error.message : String(error) };
      }
      result[`${kind}-${size}`] = outcome;
    }
  }
  return result;
}

export async function runProbe(): Promise<unknown> {
  if (typeof ReactUiProbe !== 'function') {
    throw new Error('ReactUiProbe is not in this build; build with `pnpm build:native -- --probe` or `pnpm build:web -- --probe`');
  }
  const probe = new ReactUiProbe();
  const web = OS.hasFeature('web');
  const thresholdUs = web ? MAX_HANDLE_CALL_US_WEB : MAX_HANDLE_CALL_US_NATIVE;
  console.log('GODOT_REACT_PROBE_START', JSON.stringify({ platform: web ? 'web' : 'native', thresholdUs }));
  const boundaries = measureBoundaries(probe);
  const arrays = measureArrays(probe);
  const handles = await measureHandles(probe);
  const steadyState = await measureSteadyState(probe);
  const reclaimTimes = [handles.retainedBatchReclaim, handles.retainedTimedReclaim, handles.churnReclaim]
    .map(reclaim => reclaim.reclaimedAtSeconds);
  const gate = {
    thresholdUs,
    medianCreateCallUs: handles.retainedTimed.medianUs,
    medianCreateCallNetOfClockUs: handles.retainedTimed.medianUs - handles.clockPairOverhead.medianUs,
    batchMeanUs: handles.retainedBatchMeanUs,
    createPassed: handles.retainedTimed.medianUs <= thresholdUs,
    reclaimedWithinTimeout: reclaimTimes.every(seconds => seconds !== null),
    reclaimTimeoutSeconds: PROBE_RECLAIM_TIMEOUT_S,
  };
  const result = {
    platform: web ? 'web' : 'native', os: OS.getName(), debugBuild: OS.isDebugBuild(),
    handles, steadyState, boundaries, arrays, gate,
  };
  console.log('GODOT_REACT_PROBE_RESULT', JSON.stringify(result));
  return result;
}
