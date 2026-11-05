/**
 * Optional diagnostic timings. Every duration is CPU wall time, not GPU/display time. A `flush`
 * sample is one commit of one layer: the commit walk, the JSON encoding and the synchronous native
 * `commit` call.
 */
export interface FlushSample {
  kind: 'flush';
  startMs: number;
  /** The commit walk: finding what changed by instance identity. */
  walkMs: number;
  jsonEncodeMs: number;
  nativeCallMs: number;
  fullFlushMs: number;
  /** Instances the walk entered (not skipped whole by identity). */
  visitedNodes: number;
  /** Payload entries: created nodes, prop diffs and changed child lists. */
  commandCount: number;
  /** UTF-16 string length; this is deliberately not labelled wire bytes. */
  jsonChars: number;
}

export interface WorkSample {
  kind: 'reconcile' | 'events';
  startMs: number;
  /** Inclusive duration: nested flush/native timings must not be added again. */
  durationMs: number;
}

export type ProfileSample = FlushSample | WorkSample;
export interface RendererProfile {
  samples: ProfileSample[];
  dropped: number;
  counters: { flushes: number; batches: number; commands: number };
}

const PROFILE_SAMPLE_LIMIT = 512;

function defaultClock(): number {
  return typeof performance === 'object' ? performance.now() : Date.now();
}

/** Bounded, opt-in instrumentation; disabled roots never call the timing clock. */
export class RendererProfiler {
  private samples: ProfileSample[] = [];
  private dropped = 0;
  private counters = { flushes: 0, batches: 0, commands: 0 };

  constructor(public enabled: boolean, readonly now: () => number = defaultClock) {}

  start(): number | undefined {
    return this.enabled ? this.now() : undefined;
  }

  record(sample: ProfileSample): void {
    if (!this.enabled) return;
    if (sample.kind === 'flush') {
      this.counters.flushes += 1;
      if (sample.commandCount > 0) this.counters.batches += 1;
      this.counters.commands += sample.commandCount;
    }
    if (this.samples.length === PROFILE_SAMPLE_LIMIT) {
      this.dropped += 1;
      return;
    }
    this.samples.push(sample);
  }

  finishWork(kind: WorkSample['kind'], startMs: number | undefined): void {
    if (startMs !== undefined) this.record({kind, startMs, durationMs: this.now() - startMs});
  }

  take(): RendererProfile {
    const result = { samples: this.samples, dropped: this.dropped, counters: {...this.counters} };
    this.samples = [];
    this.dropped = 0;
    return result;
  }
}
