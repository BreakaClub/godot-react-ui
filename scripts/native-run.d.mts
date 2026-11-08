export const MAX_DISTURBED_RERUNS: number;
export const DISTURBANCE_RELEVANCE_MS: number;
export { KILL_GRACE_MS } from './supervised-process.mjs';

export interface NativeVerifierRun {
  godot: string;
  project: string;
  /** Where `run.log` (the last attempt's log) and `run-attempt-N.log` go. */
  output: string;
  name: string;
  resolution: string;
  /** Godot arguments before the `--` that separates the scripts' own (a scene path). */
  leading?: string[];
  scriptArgs: string[];
  successMarker: string;
  /** Where the verifier writes its captures; defaults to `output`. */
  artifacts?: string;
  errorPattern: RegExp;
  deadlineMs: number;
  /** Re-run a failure that a disturbance explains (default true); `false` is `--no-retry`, for negative controls. */
  retry?: boolean;
  /** Runs before every launch, a re-run included; throws to refuse it (the freshness check). */
  beforeLaunch?: (attempt: number) => void;
  /** How long a child gets to leave after SIGTERM before SIGKILL. */
  killGraceMs?: number;
  /** Default true: the window cannot take focus (scripts/quiet-window.mjs). Only a stand-in for Godot turns it off. */
  quiet?: boolean;
  /** Start every line the window prints with `[name] `: for windows that run at the same time. */
  prefixOutput?: boolean;
}

/** What differs between the windows of one workflow; the rest is {@link NativeVerifierCommon}. */
export type NativeVerifierWindow = Pick<NativeVerifierRun, 'name' | 'resolution' | 'output'> & Partial<NativeVerifierRun>;
export type NativeVerifierCommon = Omit<NativeVerifierRun, 'name' | 'resolution' | 'output'>;

export interface Disturbance {
  kind: string;
  detail?: string;
  sinceReadyMs: number;
  frame?: number;
  /** Whether it can change what the system under test sees (a mouse event, a focus loss with a press in flight). */
  reachesRoot: boolean;
  inFlight?: string[];
}

export interface RunReport {
  disturbances: Disturbance[];
  unreadable: number;
  /** The verifier's clock when the run ended; undefined if it never reported. */
  endedAtMs: number | undefined;
  /** Whether the window tracks interference at all (it has input isolation). */
  tracked: boolean;
}

export interface DisturbedFailure {
  attempt: number;
  failure: string;
  disturbances: string[];
  evidence: string;
}

export interface NativeVerifierResult {
  name: string;
  passed: true;
  attempts: number;
  /** The success marker said some checks did not run. */
  partial: boolean;
  skipped: string[];
  /** Gaps the engine cannot convey, recorded by the verifier; not failures. */
  gaps: string[];
  disturbedFailures: DisturbedFailure[];
  passedDisturbed: boolean;
  output: string;
  summary: string;
}

export function parseRunReport(log: string): RunReport;
export function relevantDisturbances(report: RunReport): Disturbance[];
export function describePass(log: string, successMarker: string): { partial: boolean; skipped: string[]; gaps: string[]; payload: unknown };
export function summarizeRun(result: Omit<NativeVerifierResult, 'summary'>): string;
export function summarizeRuns(results: NativeVerifierResult[]): string;
export function runNativeVerifier(run: NativeVerifierRun): Promise<NativeVerifierResult>;
export { lineWriter } from './supervised-process.mjs';
/**
 * Run the windows of one workflow at the same time (or one after another with `serial`), each as `runNativeVerifier` runs one. Resolves with the results in
 * order once every window has ended; if any failed, rejects with that window's error, or with one `AggregateError` listing all of them.
 */
export function runNativeVerifiers(common: NativeVerifierCommon, windows: NativeVerifierWindow[], options?: { serial?: boolean }): Promise<NativeVerifierResult[]>;

/** A verifier prints this and a text just before it makes the product report an error on purpose. */
export const EXPECT_ERROR_MARKER: string;
/** The log without the `ERROR:` lines the verifier announced, and the announced texts that never appeared. */
export function withoutExpectedErrors(log: string): { log: string; unmet: string[] };
