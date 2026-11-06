export const MAX_DISTURBED_RERUNS: number;
export const DISTURBANCE_RELEVANCE_MS: number;
export const KILL_GRACE_MS: number;

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
}

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
