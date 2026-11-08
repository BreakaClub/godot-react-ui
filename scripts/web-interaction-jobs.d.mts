export const JOB_ARGUMENT: string;
export const JOBS_ARGUMENT: string;
export const SERIAL_FLAG: string;

/** End this process once what it printed has been written, with the exit code that was set: Chrome's leftover helpers must not hold it. */
export function exitAfterFlush(): Promise<never>;
export function jobReportName(job: string): string;
export function jobLogName(job: string): string;
/** The job named by `--job=<name>`, or `undefined` for the run that starts the jobs. */
export function requestedJob(argv: readonly string[]): string | undefined;
/** How many jobs run at once: `--serial` is one, `--jobs=<n>` is n, by default all of them. */
export function jobConcurrency(argv: readonly string[], jobCount: number): number;
/** The arguments the jobs are given: the run's own, less what only the run that starts them reads. */
export function jobArguments(argv: readonly string[]): string[];
/** Remove the reports and logs an earlier run left in `output`. */
export function clearJobEvidence(output: string): Promise<void>;

export interface JobToRun {
  name: string;
  deadlineMs: number;
}

/** What the job process wrote and how it ended. */
export interface JobResult {
  job: string;
  startedAt: number;
  durationMs: number;
  code: number | null;
  timedOut: boolean;
  interrupted: NodeJS.Signals | undefined;
  /** The job's `report-<job>.json`. */
  report?: JobReport;
  /** Why there is none. */
  missing?: string;
}

export interface JobReport {
  passed: boolean;
  error?: string;
  url?: string;
  executablePath?: string;
  startedAt?: string;
  assertions: { viewport: string; name: string; passed: boolean; detail?: unknown }[];
  captures: unknown[];
  console: { type: string; text: string }[];
  sectionChecks?: Record<string, number>;
  sectionMs?: Record<string, number>;
  [field: string]: unknown;
}

export interface MergedReport {
  passed: boolean;
  error?: string;
  assertions: JobReport['assertions'];
  captures: unknown[];
  console: JobReport['console'];
  engineGaps: unknown[];
  timing: Record<string, unknown>;
  sectionChecks: Record<string, number>;
  jobs: Record<string, { passed: boolean; durationMs: number; assertions: number; captures: number; sectionMs?: Record<string, number> }>;
  [field: string]: unknown;
}

/** Run the jobs, at most `concurrency` at a time, each as this script with `--job=<name>`; every job runs to its end whatever the others do. */
export function runJobs(options: {
  scriptPath: string;
  args: string[];
  jobs: JobToRun[];
  output: string;
  concurrency: number;
  env?: NodeJS.ProcessEnv;
  killAfterMs?: number;
  nodePath?: string;
}): Promise<JobResult[]>;
export function jobPassed(result: JobResult): boolean;
export function jobFailure(result: JobResult): string;
export function mergeJobReports(results: JobResult[]): MergedReport;
export function emptySections(wantedSections: readonly string[], sectionChecks: Record<string, number>): string[];
export function writeMergedEvidence(output: string, merged: MergedReport, results: JobResult[]): Promise<void>;
